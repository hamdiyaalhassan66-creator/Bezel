import { useEffect, useState, useCallback } from "react";

export const FONT_CATEGORIES = [
  { value: "all", label: "All fonts" },
  { value: "popular", label: "Popular fonts" },
  { value: "google", label: "Google fonts" },
  { value: "fontshare", label: "Fontshare" },
  { value: "opensource", label: "Open source" }, // every Google font is OFL / Apache
  { value: "variable", label: "Variable fonts" },
  { value: "installed", label: "Installed by you" },
];

const SYSTEM = ["Inter", "Helvetica Neue", "Georgia", "Times New Roman", "Courier New"].map((family) => ({
  family, src: "system", pop: 0, wghts: [300, 400, 500, 600, 700, 800],
}));

// Used until (or if) the Google list fails to load. Only fonts that have both 400 and 700.
const GOOGLE_FALLBACK = [
  ["Roboto", 1], ["Open Sans", 2, 1], ["Lato", 3], ["Montserrat", 4, 1], ["Poppins", 5], ["Inter", 6, 1],
  ["Playfair Display", 7, 1], ["Merriweather", 8], ["Raleway", 9, 1], ["Nunito", 10, 1], ["DM Sans", 11, 1],
  ["Manrope", 12, 1], ["Work Sans", 13, 1], ["Rubik", 14, 1], ["Lora", 15, 1], ["Fira Sans", 16],
].map(([family, pop, v]) => ({
  family, src: "google", pop, variable: !!v, wRange: v ? [300, 800] : null, wghts: [400, 700],
}));

const cache = { google: null, fontshare: null, local: null };
const listeners = new Set();
const notify = () => listeners.forEach((f) => f());

async function fetchGoogle() {
  // Unofficial metadata endpoint, no API key. If it is blocked, the fallback list stays.
  const res = await fetch("https://fonts.google.com/metadata/fonts");
  const text = (await res.text()).replace(/^\)\]\}'/, "");
  const list = JSON.parse(text).familyMetadataList ?? [];
  return list.map((m) => {
    const wght = (m.axes ?? []).find((a) => a.tag === "wght");
    const wdth = (m.axes ?? []).find((a) => a.tag === "wdth");
    return {
      family: m.family,
      src: "google",
      cat: String(m.category ?? "").toLowerCase(),
      pop: m.popularity ?? 9999,
      variable: !!wght,
      wRange: wght ? [wght.min, wght.max] : null,
      wdRange: wdth ? [wdth.min, wdth.max] : null,
      wghts: Object.keys(m.fonts ?? {}).filter((k) => !k.endsWith("i")).map(Number).sort((a, b) => a - b),
    };
  });
}

async function fetchFontshare() {
  // Paginated public API. Shape is from memory, so everything is read defensively.
  const out = [];
  for (let offset = 0; offset < 600; offset += 100) {
    const res = await fetch(`https://api.fontshare.com/v2/fonts?offset=${offset}&limit=100`);
    const data = await res.json();
    (data.fonts ?? []).forEach((f) => {
      const styles = (f.styles ?? []).filter((s) => !s.is_italic);
      const ws = [...new Set(styles.map((s) => Number(s.weight?.number ?? s.weight)).filter(Boolean))].sort((a, b) => a - b);
      out.push({
        family: f.name, src: "fontshare", slug: f.slug, pop: 9999,
        variable: styles.some((s) => s.is_variable),
        wRange: ws.length ? [ws[0], ws[ws.length - 1]] : null,
        wghts: ws.length ? ws : [400, 700],
      });
    });
    if (!data.has_more) break;
  }
  return out;
}

// Chromium only, needs a click and a permission prompt.
async function fetchLocal() {
  const all = await window.queryLocalFonts();
  const seen = new Map();
  all.forEach((f) => {
    if (!seen.has(f.family)) seen.set(f.family, { family: f.family, src: "local", pop: 9999, wghts: [400, 700] });
  });
  return [...seen.values()].sort((a, b) => a.family.localeCompare(b.family));
}

export function useFontCatalog() {
  const [, tick] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    listeners.add(f);
    if (!cache.google || !cache.fontshare) {
      setLoading(true);
      Promise.all([
        cache.google ?? fetchGoogle().then((l) => (cache.google = l)).catch(() => (cache.google = GOOGLE_FALLBACK)),
        cache.fontshare ?? fetchFontshare().then((l) => (cache.fontshare = l)).catch(() => (cache.fontshare = [])),
      ]).finally(() => { setLoading(false); notify(); });
    }
    return () => listeners.delete(f);
  }, []);

  const requestLocal = useCallback(async () => {
    if (!window.queryLocalFonts) return false;
    try {
      cache.local = await fetchLocal();
      notify();
      return true;
    } catch {
      return false; // permission denied
    }
  }, []);

  const fonts = [...SYSTEM, ...(cache.google ?? GOOGLE_FALLBACK), ...(cache.fontshare ?? []), ...(cache.local ?? [])];
  return { fonts, loading, requestLocal, canQueryLocal: typeof window !== "undefined" && !!window.queryLocalFonts, localLoaded: !!cache.local };
}

export function filterFonts(fonts, category, q, customFonts = []) {
  const s = q.trim().toLowerCase();
  let list = fonts;
  if (category === "popular") list = fonts.filter((f) => f.src === "google" && f.pop <= 60);
  else if (category === "google" || category === "opensource") list = fonts.filter((f) => f.src === "google");
  else if (category === "fontshare") list = fonts.filter((f) => f.src === "fontshare");
  else if (category === "variable") list = fonts.filter((f) => f.variable);
  else if (category === "installed")
    list = [...customFonts.map((c) => ({ family: c, src: "local" })), ...fonts.filter((f) => f.src === "local" && !customFonts.includes(f.family))];
  if (s) list = list.filter((f) => f.family.toLowerCase().includes(s));
  return category === "popular" ? [...list].sort((a, b) => a.pop - b.pop) : list;
}

// ---------- loading a font so DOM text AND canvas export can use it ----------
const loaded = new Map();

export function fontWeights(meta) {
  if (!meta || meta.src === "local") return [300, 400, 500, 600, 700, 800]; // installed/uploaded: weights unknown, let the browser match
  if (meta.variable && meta.wRange) return [300, 400, 500, 600, 700, 800].filter((w) => w >= meta.wRange[0] && w <= meta.wRange[1]);
  return (meta.wghts?.length ? meta.wghts : [400]).filter((w) => w >= 100);
}

// nearest weight the font really has, so a Bold text doesn't land on a 400-only font
export const nearestWeight = (meta, w) =>
  fontWeights(meta).reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), fontWeights(meta)[0] ?? 400);

export function loadFont(meta) {
  if (!meta || meta.src === "system" || meta.src === "local") return Promise.resolve();
  const key = `${meta.src}:${meta.family}`;
  if (loaded.has(key)) return loaded.get(key);
  const ws = fontWeights(meta);
  let href;
  if (meta.src === "google") {
    const fam = encodeURIComponent(meta.family).replace(/%20/g, "+");
    const axis = meta.variable && meta.wRange ? `${meta.wRange[0]}..${meta.wRange[1]}` : ws.join(";");
    const wd = meta.wdRange ? `wdth,wght@${meta.wdRange[0]}..${meta.wdRange[1]},${axis}` : `wght@${axis}`;
    href = `https://fonts.googleapis.com/css2?family=${fam}:${wd}&display=swap`;
  } else {
    href = `https://api.fontshare.com/v2/css?f[]=${meta.slug}@${ws.join(",")}&display=swap`;
  }
  const p = new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () =>
      Promise.all(ws.map((w) => document.fonts.load(`${w} 16px "${meta.family}"`))).then(resolve, resolve);
    link.onerror = () => { loaded.delete(key); resolve(); };
    document.head.appendChild(link);
  });
  loaded.set(key, p);
  return p;
}

// Lightweight preview for the picker list: loads only the glyphs of the font's own name (Google),
// or just the 400-ish weight (Fontshare). Skipped if the full font is already loaded, so it can
// never override it. System / installed fonts already render by name.
const previewed = new Set();
export function loadPreview(meta) {
  if (!meta || meta.src === "system" || meta.src === "local") return;
  const key = `${meta.src}:${meta.family}`;
  if (previewed.has(key) || loaded.has(key)) return;
  previewed.add(key);
  let href;
  if (meta.src === "google") {
    const fam = encodeURIComponent(meta.family).replace(/%20/g, "+");
    href = `https://fonts.googleapis.com/css2?family=${fam}&text=${encodeURIComponent(meta.family)}&display=swap`;
  } else {
    href = `https://api.fontshare.com/v2/css?f[]=${meta.slug}@${nearestWeight(meta, 400)}&display=swap`;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.onerror = () => previewed.delete(key);
  document.head.appendChild(link);
}