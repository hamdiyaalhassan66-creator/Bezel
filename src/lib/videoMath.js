// ---------- Video timeline ----------
export const CAM_KEYS = ["rotationX", "rotationY", "rotationZ", "positionX", "positionY", "zoom", "fov"];
export const smoothstep = (x) => x * x * (3 - 2 * x);
export const VID_EASES = {
  smooth: smoothstep,
  linear: (x) => x,
  in: (x) => x * x,
  out: (x) => 1 - (1 - x) * (1 - x),
  hold: (x) => (x >= 1 ? 1 : 0),
};

// Cubic-bezier solver (same maths as CSS cubic-bezier)
const vidBezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t;
  const Y = (t) => ((ay * t + by) * t + cy) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x;
      if (Math.abs(e) < 1e-6) return Y(t);
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const e = X(t) - x;
      if (Math.abs(e) < 1e-6) break;
      if (e > 0) hi = t; else lo = t;
      t = (lo + hi) / 2;
    }
    return Y(t);
  };
};

// Mirrors an "out" curve into its "in" and "in-out" versions.
const vidMirrorIn = (f) => (x) => 1 - f(1 - x);
const vidMirrorInOut = (f) => (x) => (x < 0.5 ? (1 - f(1 - 2 * x)) / 2 : (1 + f(2 * x - 1)) / 2);

// kind -> builder. p = the adjustable numbers for that kind.
const VID_EASE_BUILD = {
  fn: (_p, id) => VID_EASES[id],
  bezier: (p) => vidBezier(p[0], p[1], p[2], p[3]),
  backIn: ([s]) => (x) => (s + 1) * x * x * x - s * x * x,
  backOut: ([s]) => (x) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  backInOut: ([s]) => {
    const c = s * 1.525;
    return (x) =>
      x < 0.5
        ? ((2 * x) ** 2 * ((c + 1) * 2 * x - c)) / 2
        : ((2 * x - 2) ** 2 * ((c + 1) * (2 * x - 2) + c) + 2) / 2;
  },
  elastic: ([period]) => {
    const c = (2 * Math.PI) / (period * 10);
    return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * c) + 1);
  },
  elasticIn: (p) => vidMirrorIn(VID_EASE_BUILD.elastic(p)),
  elasticInOut: (p) => vidMirrorInOut(VID_EASE_BUILD.elastic(p)),
  bounce: ([e]) => {
    const N = 4;
    let total = 1;
    for (let i = 1; i <= N; i++) total += 2 * e ** i;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x * total;
      if (t <= 1) return t * t;
      t -= 1;
      for (let i = 1; i <= N; i++) {
        const d = 2 * e ** i;
        if (t <= d) {
          const tau = t - e ** i;
          return 1 - (e ** (2 * i) - tau * tau);
        }
        t -= d;
      }
      return 1;
    };
  },
  bounceIn: (p) => vidMirrorIn(VID_EASE_BUILD.bounce(p)),
  bounceInOut: (p) => vidMirrorInOut(VID_EASE_BUILD.bounce(p)),
  spring: ([z, w]) => {
    const zeta = Math.min(0.99, z);
    const wd = w * Math.sqrt(1 - zeta * zeta);
    const raw = (x) => 1 - Math.exp(-zeta * w * x) * (Math.cos(wd * x) + ((zeta * w) / wd) * Math.sin(wd * x));
    const end = raw(1);
    return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : raw(x) + (1 - end) * x * x); // nudged so it lands exactly on 1
  },
};

// Adjustable params per kind. Stored value = shown value / div.
const VID_OVERSHOOT = [{ label: "Overshoot", min: 0, max: 400, div: 100 }];
const VID_PERIOD = [{ label: "Period", min: 10, max: 100, div: 100 }];
const VID_BOUNCINESS = [{ label: "Bounciness", min: 10, max: 90, div: 100 }];

export const VID_EASE_PARAMS = {
  backIn: VID_OVERSHOOT,
  backOut: VID_OVERSHOOT,
  backInOut: VID_OVERSHOOT,
  elastic: VID_PERIOD,
  elasticIn: VID_PERIOD,
  elasticInOut: VID_PERIOD,
  bounce: VID_BOUNCINESS,
  bounceIn: VID_BOUNCINESS,
  bounceInOut: VID_BOUNCINESS,
  spring: [
    { label: "Damping", min: 5, max: 99, div: 100 },
    { label: "Speed", min: 4, max: 40, div: 1 },
  ],
};

export const VID_EASE_GROUPS = ["Basic", "Ease", "Overshoot"];
export const VID_EASE_PRESETS = [
  // Basic
  { id: "hold", label: "Hold", group: "Basic", kind: "fn", p: [] },
  { id: "smooth", label: "Smooth", group: "Basic", kind: "fn", p: [] },
  { id: "linear", label: "Linear", group: "Basic", kind: "fn", p: [] },
  { id: "css-ease", label: "CSS ease", group: "Basic", kind: "bezier", p: [0.25, 0.1, 0.25, 1] },

  // Ease: Sine
  { id: "sine-in", label: "Sine in", group: "Ease", kind: "bezier", p: [0.47, 0, 0.745, 0.715] },
  { id: "sine-out", label: "Sine out", group: "Ease", kind: "bezier", p: [0.39, 0.575, 0.565, 1] },
  { id: "sine-in-out", label: "Sine in-out", group: "Ease", kind: "bezier", p: [0.445, 0.05, 0.55, 0.95] },
  // Ease: Quad (existing ids)
  { id: "in", label: "Ease in", group: "Ease", kind: "bezier", p: [0.11, 0, 0.5, 0] },
  { id: "out", label: "Ease out", group: "Ease", kind: "bezier", p: [0.5, 1, 0.89, 1] },
  { id: "in-out", label: "In-out", group: "Ease", kind: "bezier", p: [0.45, 0, 0.55, 1] },
  // Ease: Cubic
  { id: "cubic-in", label: "Cubic in", group: "Ease", kind: "bezier", p: [0.55, 0.055, 0.675, 0.19] },
  { id: "cubic-out", label: "Cubic out", group: "Ease", kind: "bezier", p: [0.215, 0.61, 0.355, 1] },
  { id: "cubic-in-out", label: "Cubic in-out", group: "Ease", kind: "bezier", p: [0.65, 0, 0.35, 1] },
  // Ease: Quart
  { id: "quart-in", label: "Quart in", group: "Ease", kind: "bezier", p: [0.895, 0.03, 0.685, 0.22] },
  { id: "quart-out", label: "Quart out", group: "Ease", kind: "bezier", p: [0.165, 0.84, 0.44, 1] },
  { id: "quart-in-out", label: "Quart in-out", group: "Ease", kind: "bezier", p: [0.77, 0, 0.175, 1] },
  // Ease: Quint
  { id: "quint-in", label: "Quint in", group: "Ease", kind: "bezier", p: [0.755, 0.05, 0.855, 0.06] },
  { id: "quint-out", label: "Quint out", group: "Ease", kind: "bezier", p: [0.23, 1, 0.32, 1] },
  { id: "quint-in-out", label: "Quint in-out", group: "Ease", kind: "bezier", p: [0.86, 0, 0.07, 1] },
  // Ease: Expo
  { id: "expo-in", label: "Expo in", group: "Ease", kind: "bezier", p: [0.95, 0.05, 0.795, 0.035] },
  { id: "expo-out", label: "Expo out", group: "Ease", kind: "bezier", p: [0.16, 1, 0.3, 1] },
  { id: "expo-in-out", label: "Expo in-out", group: "Ease", kind: "bezier", p: [0.87, 0, 0.13, 1] },
  // Ease: Circ
  { id: "circ-in", label: "Circ in", group: "Ease", kind: "bezier", p: [0.6, 0.04, 0.98, 0.335] },
  { id: "circ-out", label: "Circ out", group: "Ease", kind: "bezier", p: [0.075, 0.82, 0.165, 1] },
  { id: "circ-in-out", label: "Circ in-out", group: "Ease", kind: "bezier", p: [0.785, 0.135, 0.15, 0.86] },

  // Overshoot
  { id: "back-in", label: "Back in", group: "Overshoot", kind: "backIn", p: [1.7] },
  { id: "back-out", label: "Back out", group: "Overshoot", kind: "backOut", p: [1.7] },
  { id: "back-in-out", label: "Back in-out", group: "Overshoot", kind: "backInOut", p: [1.7] },
  { id: "elastic-in", label: "Elastic in", group: "Overshoot", kind: "elasticIn", p: [0.3] },
  { id: "elastic", label: "Elastic out", group: "Overshoot", kind: "elastic", p: [0.3] },
  { id: "elastic-in-out", label: "Elastic in-out", group: "Overshoot", kind: "elasticInOut", p: [0.3] },
  { id: "bounce-in", label: "Bounce in", group: "Overshoot", kind: "bounceIn", p: [0.5] },
  { id: "bounce", label: "Bounce out", group: "Overshoot", kind: "bounce", p: [0.5] },
  { id: "bounce-in-out", label: "Bounce in-out", group: "Overshoot", kind: "bounceInOut", p: [0.5] },
  { id: "spring", label: "Spring", group: "Overshoot", kind: "spring", p: [0.35, 14] },
];
export const VID_EASE_CUSTOM_DEFAULT = [0.5, 0, 0.5, 1];

// Legacy string ("smooth", "in"...) or spec object -> spec object
export const vidEaseSpec = (e) => {
  if (e && typeof e === "object") return e;
  const pr = VID_EASE_PRESETS.find((x) => x.id === (e ?? "smooth")) ?? VID_EASE_PRESETS[0];
  return { id: pr.id, kind: pr.kind, p: [...pr.p] };
};

// Spec (or legacy string) -> easing function, cached so playback doesn't rebuild it every frame
const vidEaseCache = new Map();
export const vidEaseFn = (e, fallback = smoothstep) => {
  if (!e) return fallback;
  if (typeof e === "string") return VID_EASES[e] ?? fallback;
  const k = `${e.kind}|${e.id}|${e.p.join(",")}`;
  let f = vidEaseCache.get(k);
  if (!f) {
    f = VID_EASE_BUILD[e.kind]?.(e.p, e.id) ?? fallback;
    if (vidEaseCache.size > 200) vidEaseCache.clear();
    vidEaseCache.set(k, f);
  }
  return f;
};
export const VID_FPS = 30;
export const VID_PPS = 80; // default px per second
export const VID_PPS_MIN = 12;
export const VID_PPS_MAX = 400;
export const VID_LABEL_W = 220; // shot names column
export const VID_PAD = 16; // gap between the names column and 0s
export const VID_GRAY = 40; // end zone width
export const VID_H_MIN = 120; // timeline height limits (px)
export const VID_H_MAX = 480;
export const VID_GLIDE_MS = 180; // playhead glide while dragging a shot edge (inside the 140-220ms range used elsewhere)
export const VID_GLIDE_EASE = vidBezier(0.22, 1, 0.36, 1); // same curve as every other transition in the app
export const VID_PROPS = [
  ["rotationX", "X - Rotation"],
  ["rotationY", "Y - Rotation"],
  ["rotationZ", "Z - Rotation"],
  ["positionX", "X - Position"],
  ["positionY", "Y - Position"],
  ["zoom", "Zoom"],
  ["fov", "FoV"],
];
export const vidClamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const vidSnap = (t) => Math.round(t * VID_FPS) / VID_FPS;
// 00:05:20 = minutes : seconds : frames (30 fps)
export const fmtTC = (t) => {
  const f = Math.round(Math.max(0, t) * VID_FPS);
  return [Math.floor(f / (VID_FPS * 60)), Math.floor(f / VID_FPS) % 60, f % VID_FPS].map((n) => String(n).padStart(2, "0")).join(":");
};

// keys sorted by t. t is relative to the shot.
function sampleCamera(keys, t, ease = smoothstep) {
  if (!keys.length) return null;
  const out = {};
  CAM_KEYS.forEach((p) => {
    // a key without `props` drives every property
    const ks = keys.filter((k) => !k.props || k.props.includes(p));
    if (!ks.length) {
      out[p] = keys[0][p];
      return;
    }
    if (t <= ks[0].t) {
      out[p] = ks[0][p];
      return;
    }
    const last = ks[ks.length - 1];
    if (t >= last.t) {
      out[p] = last[p];
      return;
    }
for (let i = 0; i < ks.length - 1; i++) {
  const a = ks[i], b = ks[i + 1];
  if (t >= a.t && t <= b.t) {
    // property override wins, then the key's general easing, then the shot's
    const es = a.propEase?.[p] ?? a.ease;
    const segEase = es ? vidEaseFn(es, ease) : ease;
    const u = segEase((t - a.t) / Math.max(1e-6, b.t - a.t));
    out[p] = a[p] + (b[p] - a[p]) * u;
    return;
  }
}
    out[p] = last[p];
  });
  return out;
}

// Later shots win on overlap. Outside every shot, hold the nearest earlier pose (or the first shot's first pose).
export function sampleShots(shots, t) {
  // frame-only shots (keys that only drive `frames`) must not drive the camera
  const withKeys = shots.filter(
    (s) => s.keys.length && !s.hidden && s.keys.some((k) => !k.props || k.props.some((p) => CAM_KEYS.includes(p)))
  );
  for (let i = withKeys.length - 1; i >= 0; i--) {
    const s = withKeys[i];
    if (t >= s.start && t <= s.start + s.len) return sampleCamera(s.keys, t - s.start, VID_EASES[s.ease] ?? smoothstep);
  }
  let best = null;
  withKeys.forEach((s) => {
    if (s.start + s.len < t && (!best || s.start + s.len > best.start + best.len)) best = s;
  });
  if (best) return sampleCamera(best.keys, best.len, VID_EASES[best.ease] ?? smoothstep);
  const first = [...withKeys].sort((a, b) => a.start - b.start)[0];
  return first ? sampleCamera(first.keys, 0, VID_EASES[first.ease] ?? smoothstep) : null;
}