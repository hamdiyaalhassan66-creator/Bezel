import { VID_EASE_PRESETS, vidEaseFn, vidEaseSpec, vidClamp } from "./videoMath.js";
import { bgRand } from "./bgAnim.js";

// t = 0 -> a, t = 1 -> b
export const mixHex = (a, b, t) => {
  const pa = parseInt(a || "000000", 16), pb = parseInt(b || "000000", 16);
  return [16, 8, 0]
    .map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
};

// ---------- Text animations ----------
// ls / lh = letter spacing / line height delta, sh = shadow size, c = start color (null = none)
export const TXT_REST = { a: 1, x: 0, y: 0, s: 1, r: 0, b: 0, ls: 0, lh: 0, sh: 0, c: null }; // a = opacity 0-1, x / y / b = % of font size, s = scale, r = deg
export const txtFrom = (o = {}) => ({ ...TXT_REST, ...o });
export const txtCase = (s, c) =>
  c === "uppercase" ? s.toUpperCase()
  : c === "lowercase" ? s.toLowerCase()
  : c === "capitalize" ? s.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase())
  : s;

export const TXT_SPLITS = [
  { value: "block", label: "Block" },
  { value: "line", label: "Lines" },
  { value: "word", label: "Words" },
  { value: "char", label: "Chars" },
];
export const TXT_ORDERS = [
  { value: "start", label: "Start to end" },
  { value: "end", label: "End to start" },
  { value: "center", label: "Center out" },
  { value: "edges", label: "Edges in" },
  { value: "random", label: "Random" },
];
export const TXT_EASE_OPTIONS = VID_EASE_PRESETS.map((p) => ({ value: p.id, label: p.label }));
export const TXT_CUSTOM_DEFAULT = {
  id: "custom", split: "char", order: "start", stagger: 50,
  from: txtFrom({ a: 0, y: 60 }), mask: false, ease: "expo-out",
};

const TP = (id, label, group, split, stagger, from, ease = "cubic-out", extra = {}) => ({
  id, label, group,
  spec: { split, order: "start", stagger, from: txtFrom(from), mask: false, ease, ...extra },
});
export const TXT_PRESET_GROUPS = ["Fade", "Slide", "Scale", "Mask", "Blur", "Type", "Motion"];
export const TXT_PRESETS = [
  TP("t-fade", "Fade", "Fade", "block", 0, { a: 0 }, "smooth"),
  TP("t-fade-lines", "Fade lines", "Fade", "line", 60, { a: 0 }),
  TP("t-fade-words", "Fade words", "Fade", "word", 60, { a: 0 }),
  TP("t-fade-chars", "Fade chars", "Fade", "char", 70, { a: 0 }),

  TP("t-slide-up", "Slide up", "Slide", "block", 0, { a: 0, y: 80 }, "expo-out"),
  TP("t-slide-down", "Slide down", "Slide", "block", 0, { a: 0, y: -80 }, "expo-out"),
  TP("t-slide-left", "Slide left", "Slide", "block", 0, { a: 0, x: -100 }, "expo-out"),
  TP("t-slide-right", "Slide right", "Slide", "block", 0, { a: 0, x: 100 }, "expo-out"),
  TP("t-slide-lines", "Slide up lines", "Slide", "line", 60, { a: 0, y: 80 }, "expo-out"),
  TP("t-slide-words", "Slide up words", "Slide", "word", 60, { a: 0, y: 80 }, "expo-out"),

  TP("t-grow", "Grow", "Scale", "block", 0, { a: 0, s: 0.6 }),
  TP("t-shrink", "Shrink", "Scale", "block", 0, { a: 0, s: 1.5 }),
  TP("t-pop-chars", "Pop chars", "Scale", "char", 70, { a: 0, s: 0 }, "back-out"),

  TP("t-mask-up", "Mask up", "Mask", "block", 0, { y: 110 }, "expo-out", { mask: true }),
  TP("t-mask-lines", "Mask lines", "Mask", "line", 50, { y: 110 }, "expo-out", { mask: true }),
  TP("t-mask-words", "Mask words", "Mask", "word", 50, { y: 110 }, "expo-out", { mask: true }),
  TP("t-mask-chars", "Mask chars", "Mask", "char", 70, { y: 110 }, "expo-out", { mask: true }),

  TP("t-blur", "Blur in", "Blur", "block", 0, { a: 0, b: 30 }),
  TP("t-blur-words", "Blur words", "Blur", "word", 60, { a: 0, b: 30 }),
  TP("t-blur-chars", "Blur chars", "Blur", "char", 70, { a: 0, b: 30, y: 20 }),

  TP("t-typewriter", "Typewriter", "Type", "char", 92, { a: 0 }, "linear"),
  TP("t-scatter", "Scatter", "Type", "char", 85, { a: 0 }, "linear", { order: "random" }),
  TP("t-center-out", "Center out", "Type", "char", 70, { a: 0, s: 0.6 }, "cubic-out", { order: "center" }),

  TP("t-spin", "Spin in", "Motion", "block", 0, { a: 0, r: -90, s: 0.6 }, "back-out"),
  TP("t-tumble", "Tumble chars", "Motion", "char", 70, { a: 0, y: 60, r: 40 }, "back-out"),
  TP("t-wave", "Wave", "Motion", "char", 80, { a: 0, y: 70 }, "elastic"),
  TP("t-drop", "Drop", "Motion", "word", 60, { a: 0, y: -100 }, "bounce"),
];
export const TXT_PRESET_BY_ID = Object.fromEntries(TXT_PRESETS.map((p) => [p.id, p]));

// 0..1 rank per unit, which decides who starts first
export const txtRanks = (order, n) =>
  Array.from({ length: n }, (_, i) => {
    const u = n > 1 ? i / (n - 1) : 0;
    if (order === "end") return 1 - u;
    if (order === "center") return Math.abs(u - 0.5) * 2;
    if (order === "edges") return 1 - Math.abs(u - 0.5) * 2;
    if (order === "random") return bgRand(i, 7);
    return u;
  });

// p = progress of the whole animation (0 = hidden pose, 1 = resting). One state per unit.
export function txtUnitStates(spec, p, n) {
  const ease = vidEaseFn(vidEaseSpec(spec.ease ?? "smooth"));
  const stag = vidClamp((spec.stagger ?? 0) / 100, 0, 0.95);
  const ranks = txtRanks(spec.order, n);
  const f = txtFrom(spec.from);
  return ranks.map((rk) => {
    const e = ease(vidClamp((p - rk * stag) / (1 - stag), 0, 1));
    return {
      a: f.a + (1 - f.a) * e, x: f.x * (1 - e), y: f.y * (1 - e), s: f.s + (1 - f.s) * e, r: f.r * (1 - e), b: f.b * (1 - e),
      ls: f.ls * (1 - e), lh: f.lh * (1 - e), sh: f.sh * (1 - e), c: f.c, ce: e,
    };
  });
}

// undefined = this text has no clips (always visible, static)
// null      = it has clips but none is active at t (hidden)
// { spec, p } = active; spec null = resting
export function sampleTextAnim(clips, tid, t) {
  let any = false, hit = null;
  clips.forEach((c) => {
    if (c.tid !== tid) return;
    any = true;
    const a = c.start, b = c.start + c.len;
    if (t >= a - 1e-6 && t <= b + 1e-6) hit = { c, a, b };
  });
  if (!any) return undefined;
  if (!hit) return null;
  const { c, a, b } = hit;
  const en = c.enter && c.enter.id !== "none" ? c.enter : null;
  const ex = c.exit && c.exit.id !== "none" ? c.exit : null;
  let out = { spec: null, p: 1 };
  if (en) {
    const e0 = a + en.delay / 1000, e1 = e0 + en.dur / 1000;
    const p = t <= e0 ? 0 : t >= e1 ? 1 : (t - e0) / Math.max(1e-6, e1 - e0);
    if (p < 1) out = { spec: en, p };
  }
  if (ex) {
    const x1 = b - ex.delay / 1000, x0 = x1 - ex.dur / 1000;
    const q = t >= x1 ? 1 : t <= x0 ? 0 : (t - x0) / Math.max(1e-6, x1 - x0);
    if (q > 0) out = { spec: ex, p: 1 - q }; // exit = the same animation played backwards
  }
  return out;
}

// Lines -> words -> chars, with a running unit index
export function txtTree(content, split) {
  let n = 0;
  const lines = String(content ?? "").split("\n").map((ln) => {
    const lineIdx = split === "line" ? n++ : null;
    const tokens = ln.split(/(\s+)/).filter((t) => t !== "").map((tok) => {
      if (/^\s+$/.test(tok)) return { sp: tok };
      if (split === "word") return { w: tok, idx: n++ };
      if (split === "char") return { w: tok, chars: [...tok].map((ch) => ({ ch, idx: n++ })) };
      return { w: tok };
    });
    return { text: ln, lineIdx, tokens };
  });
  return { lines, count: Math.max(1, n) };
}