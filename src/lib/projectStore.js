const DB = "bezel", STORE = "projects";

const openDb = () =>
  new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

const tx = async (mode, fn) => {
  const db = await openDb();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(out?.result); };
    t.onerror = t.onabort = () => { db.close(); rej(t.error); };
  });
};

const persisted = new Map(); // id -> the project object last written, so only changed ones are re-saved

export async function loadProjects() {
  const list = (await tx("readonly", (s) => s.getAll())) ?? [];
  list.forEach((p) => persisted.set(p.id, p));
  return list.sort((a, b) => b.editedAt - a.editedAt);
}

export async function syncProjects(list) {
  const ids = new Set(list.map((p) => p.id));
  const puts = list.filter((p) => persisted.get(p.id) !== p);
  const dels = [...persisted.keys()].filter((id) => !ids.has(id));
  if (!puts.length && !dels.length) return;
  puts.forEach((p) => persisted.set(p.id, p));
  dels.forEach((id) => persisted.delete(id));
  await tx("readwrite", (s) => {
    puts.forEach((p) => s.put(p));
    dels.forEach((id) => s.delete(id));
  });
}

// Turns project data into { json, blobs }. Blob URLs are fetched into real Blobs, and
// "asset-N" placeholders are swapped back for their full data URLs.
export async function packProject(data, assetsById) {
  let json = JSON.stringify(data);
  json = json.replace(/asset-\d+/g, (id) => assetsById?.get(id) ?? id);
  const urls = [...new Set(json.match(/blob:[^"\\\s)]+/g) ?? [])];
  const blobs = {};
  await Promise.all(
    urls.map(async (u) => {
      try { blobs[u] = await (await fetch(u)).blob(); } catch {}
    })
  );
  return { json, blobs };
}

// Recreates object URLs and gives shot / video-image ids a fresh prefix so they can't clash with this session's.
export function hydrateProject({ json, blobs }) {
  const made = new Map();
  let out = json;
  for (const [old, blob] of Object.entries(blobs)) {
    const url = URL.createObjectURL(blob);
    out = out.split(old).join(url);
    made.set(url, blob);
  }
  const uid = Date.now().toString(36);
  out = out.replace(/(shot-|simg-)(\d+)/g, `$1${uid}-$2`);
  return { data: JSON.parse(out), blobOf: (url) => made.get(url) };
}