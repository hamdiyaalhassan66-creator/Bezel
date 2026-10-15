import { smoothstep, vidClamp } from "./videoMath.js";

// ---------- Shot enter / exit animations ----------
export const DEV_ANIM_GROUPS = ["Fade & Scale", "Flip", "Slide"];
export const DEV_ANIMS = [
  { id: "fade", group: "Fade & Scale", label: (k) => `Fade ${k}` },
  { id: "scale", group: "Fade & Scale", label: (k) => `Scale ${k}` },
  { id: "scale-bottom", group: "Fade & Scale", label: (k) => `Scale ${k} bottom` },
  { id: "flip-h", group: "Flip", label: () => "Flip horizontal" },
  { id: "flip-v", group: "Flip", label: () => "Flip vertical" },
  { id: "slide-top", group: "Slide", label: (k) => `Slide ${k} top` },
  { id: "slide-left", group: "Slide", label: (k) => `Slide ${k} left` },
  { id: "slide-right", group: "Slide", label: (k) => `Slide ${k} right` },
  { id: "slide-bottom", group: "Slide", label: (k) => `Slide ${k} bottom` },
];
const DEV_ANIM_BY_ID = Object.fromEntries(DEV_ANIMS.map((a) => [a.id, a]));
export const devAnimLabel = (id, k) => DEV_ANIM_BY_ID[id]?.label(k) ?? "None";

// Device pose at progress p (0 = hidden / off-screen, 1 = resting). x / y are in screens (±1 = just off the edge).
// Exit plays the same pose backwards.
export function devAnimPose(id, p) {
  const i = 1 - p, a = Math.min(1, p * 2);
  switch (id) {
    case "fade": return { a: p };
    case "scale": return { a: p, s: 0.6 + 0.4 * p };
    case "scale-bottom": return { a: p, s: 0.6 + 0.4 * p, y: -0.5 * i };
    case "flip-h": return { a, ry: (Math.PI / 2) * i };
    case "flip-v": return { a, rx: (Math.PI / 2) * i };
    case "slide-top": return { y: i };
    case "slide-left": return { x: -i };
    case "slide-right": return { x: i };
    case "slide-bottom": return { y: -i };
    default: return null;
  }
}

export function shotAnimPose(s, t) {
  const L = s.len, u = vidClamp(t - s.start, 0, L);
  const en = s.enter && s.enter.id !== "none" ? s.enter : null;
  const ex = s.exit && s.exit.id !== "none" ? s.exit : null;
  let pose = null;
  if (en) {
    const e0 = Math.min(L, en.delay / 1000), e1 = Math.min(L, e0 + en.dur / 1000);
    const p = u <= e0 ? 0 : u >= e1 ? 1 : (u - e0) / Math.max(1e-6, e1 - e0);
    pose = devAnimPose(en.id, smoothstep(p));
  }
  if (ex) {
    const x1 = Math.max(0, L - ex.delay / 1000), x0 = Math.max(0, x1 - ex.dur / 1000);
    const q = u >= x1 ? 1 : u <= x0 ? 0 : (u - x0) / Math.max(1e-6, x1 - x0);
    if (q > 0) pose = devAnimPose(ex.id, 1 - smoothstep(q));
  }
  return pose;
}

// Later shots win on overlap. Between shots the nearest earlier shot's end state holds
// (or the next shot's start state, before the first shot).
// Same pick as the camera: later shots win on overlap, gaps hold the nearest earlier shot.
export function shotForImgAt(shots, t) {
  const list = shots.filter((s) => !s.hidden);
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (t >= s.start && t <= s.start + s.len) return s;
  }
  let prev = null;
  list.forEach((s) => {
    if (s.start + s.len < t && (!prev || s.start + s.len > prev.start + prev.len)) prev = s;
  });
  return prev ?? [...list].sort((a, b) => a.start - b.start)[0] ?? null;
}

export function sampleDeviceAnim(shots, t) {
  const list = shots.filter((s) => !s.hidden);
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (t >= s.start && t <= s.start + s.len) return shotAnimPose(s, t);
  }
  let prev = null, next = null;
  list.forEach((s) => {
    if (s.start + s.len < t && (!prev || s.start + s.len > prev.start + prev.len)) prev = s;
    if (s.start > t && (!next || s.start < next.start)) next = s;
  });
  if (prev) return shotAnimPose(prev, prev.start + prev.len);
  if (next) return shotAnimPose(next, next.start);
  return null;
}