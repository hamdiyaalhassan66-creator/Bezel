// Parametric templates: a param schema + build(params, ctx).
// build returns the same shape as an entry in VIDEO_TEMPLATES / FRAME_VIDEO_TEMPLATES
// ({ duration, poster, shots, layout? }). ctx.aspect = canvas width / height (1 until it's measured).

import { vidEaseFn, vidEaseSpec, VID_FPS } from "../lib/videoMath.js";
import { SHARED_FX } from "../lib/sharedEffects.js";

const CAM0 = { rotationX: 0, rotationY: 0, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 };
const cam = (o) => ({ ...CAM0, ...o });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const RATIO = 0.75; // plane width / height
// Keeps x inside one loop length L: [-L/2, L/2) normally, (-L/2, L/2] when right = true.
// The closed side decides which end a plane sitting exactly on the seam is placed at.
const wrap = (x, L, right = false) => {
  const v = Math.round(x * 1e9) / 1e9; // float noise must not flip which side of the seam a plane is on
  return v - L * (right ? Math.ceil((v - L / 2) / L) : Math.floor((v + L / 2) / L));
};

export const defaultParams = (params) => Object.fromEntries(params.map((p) => [p.key, p.default]));
export const instantiateParam = (t, p = defaultParams(t.params), ctx = {}) => ({ ...t, ...t.build(p, ctx) });
const make = (def) => instantiateParam(def);

// ---------- Animation tab (planes on the Frame canvas) ----------
export const PARAM_FRAME_TEMPLATES = [
  make({
    id: "p-carousel",
    label: "Carousel",
    category: "Carousel",
    tags: "carousel strip loop scroll planes",
    params: [
      { key: "direction", label: "Direction", type: "segmented", options: ["Up", "Down", "Left", "Right"], default: "Up" },
      { key: "start", label: "Start", type: "segmented", options: ["Auto", "Center", "End"], default: "Auto" },
      { key: "scaleCenter", label: "Scale Center", type: "segmented", options: ["Off", "On"], default: "Off" },
      { key: "tilt", label: "Tilt", type: "segmented", options: ["Off", "Fan", "Uniform", "Alternate"], default: "Off" },
      { key: "tiltAmount", label: "Tilt Angle", type: "slider", min: 0, max: 30, default: 12, attach: true },
      { key: "solo", label: "Solo", type: "segmented", options: ["Off", "On"], default: "Off" },
      { key: "count", label: "Count", type: "slider", min: 2, max: 12, default: 7, group: "Frame" },
      { key: "size", label: "Size", type: "slider", min: 20, max: 90, default: 50, group: "Frame" },
      { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: 6, group: "Frame" },
      { key: "gap", label: "Gap", type: "slider", min: 0, max: 100, default: 10, group: "Frame" },
      { key: "offsetX", label: "Offset X", type: "slider", min: -50, max: 50, default: 0, group: "Frame" },
      { key: "offsetY", label: "Offset Y", type: "slider", min: -50, max: 50, default: 0, group: "Frame" },
      { key: "fxList", type: "flag", default: [], section: "effects" }, // [{ id, type: "fade" | "blur", on, ...settings }]
      { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
      { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 20, hardMax: 600, default: 8, group: "Timing" },
      { key: "ease", label: "Easing", type: "ease", default: vidEaseSpec("linear"), section: "motion" },
      { key: "stagger", label: "Stagger (f)", type: "slider", min: 0, max: 20, default: 0, section: "motion", attach: true },
      { key: "delay", label: "Delay (f)", type: "slider", min: 0, max: 60, default: 0, section: "motion" },
    ],
    build: ({ direction, start, scaleCenter, tilt, tiltAmount, solo, count, size, corner, gap, offsetX, offsetY, fxList, duration, cycles, stagger, delay, ease }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const kx = aspect >= 1 ? aspect : 1; // canvas fraction -> "short side" units, which frame x / y use
      const fadeAmt = Math.max(0, ...fxList.filter((x) => x.type === "fade" && x.on).map((x) => x.fade));
      const blurs = fxList
        .filter((x) => x.type === "blur" && x.on && (x.blur > 0 || (x.startBlur ?? 0) > 0))
        .map((x) => ({
          blur: x.blur, mode: x.mode === "Progressive" ? "progressive" : "uniform",
          startBlur: x.startBlur ?? 0, x0: x.x0, y0: x.y0, x1: x.x1, y1: x.y1,
        }));
      // shared effects (glow, chromatic, fish eye, vignette, liquid glass) go to the frames as they are
      const fx = fxList.filter((x) => x.on && SHARED_FX[x.type]).map(({ id, on, ...rest }) => rest);
      const ky = aspect >= 1 ? 1 : 1 / aspect;
      const horiz = direction === "Left" || direction === "Right";
      const sgn = direction === "Right" || direction === "Down" ? 1 : -1; // frame y grows downward
      const h = size / 100; // plane height, fraction of canvas height
      const Lp = horiz ? (RATIO * h) / aspect : h; // plane length along the travel axis
      const pitch = solo === "On" ? Math.max(Lp * (1 + gap / 100), 1 + Lp) : Lp * (1 + gap / 100);
      const shift = (horiz ? offsetX : offsetY) / 100; // along the travel axis
      const cross = (horiz ? offsetY : offsetX) / 100; // across it
      const M = Math.max(count, Math.ceil((1 + Lp + 2 * Math.abs(shift) + 0.02) / pitch - 1e-9)); // slots in the loop
      const Lw = M * pitch; // loop length, wraps happen off-screen
      const travel = cycles * Lw; // whole loops, so the end matches the start
      const base = (i) =>
        start === "Center" ? i * pitch : start === "End" ? (i - (count - 1)) * pitch : (i - (count - 1) / 2) * pitch;

      const pose = (i, p, p0) => {
        const c = p + shift; // canvas position along the axis
        const k = scaleCenter === "On" ? 0.72 + 0.43 * Math.max(0, 1 - Math.abs(c) / Math.max(pitch, 0.3)) : 1;
        const dr =
          tilt === "Fan" ? clamp(c / (0.5 + Lp / 2), -1, 1) * tiltAmount
          : tilt === "Uniform" ? tiltAmount
          : tilt === "Alternate" ? (i % 2 ? 1 : -1) * tiltAmount
          : 0;
        return horiz ? { dx: (p - p0) * kx, k, dr } : { dy: (p - p0) * ky, k, dr };
      };

      const easeFn = vidEaseFn(ease ?? vidEaseSpec("linear"));
      const isLinear = !ease || ease.id === "linear";
      const steps = cycles * M; // each step moves every plane one slot
      const stepLen = pitch; // exactly one gap, so spacing never changes
      const lastRank = M - 1;
      const stepFrames = (duration * VID_FPS) / steps;
      const rawOff = (r) => (delay + r * stagger) / stepFrames; // wait inside a step, as a fraction of it
      const offScale = rawOff(lastRank) > 0.85 ? 0.85 / rawOff(lastRank) : 1;
      const offOf = (r) => rawOff(r) * offScale;
      const moveFrac = 1 - offOf(lastRank); // every plane finishes inside its step
      const staged = offOf(lastRank) > 0;
      const nonlinear = scaleCenter === "On" || tilt === "Fan" || !isLinear;
      const K = nonlinear ? clamp(Math.floor(400 / steps) - 2, 1, 8) : 1; // samples per move

      const startAt = (b) => wrap(b, Lw, sgn < 0);
      const track = (i) => {
        const b = base(i);
        // Place in the line at the start of each step (0 = front). Recomputed every step,
        // so a plane that wrapped to the back waits for the planes ahead of it.
        const rankAt = (n) => {
          const wv = wrap(b + sgn * stepLen * n, Lw, sgn > 0);
          const v = (wv + Lw / 2) / pitch;
          const k = clamp(sgn < 0 ? Math.floor(v + 1e-6) : Math.ceil(v - 1e-6) - 1, 0, M - 1);
          return sgn < 0 ? k : M - 1 - k;
        };
        const wOf = Array.from({ length: steps }, (_, n) => offOf(rankAt(n)));
        const P = (u) => {
          const s = u * steps;
          const n = Math.min(steps - 1, Math.floor(s + 1e-9));
          const e = clamp(easeFn(clamp((s - n - wOf[n]) / moveFrac, 0, 1)), 0, 1);
          return b + sgn * stepLen * (n + e); // unwrapped position
        };
        const us = new Map();
        const add = (u) => us.set(Math.round(u * 1e9), clamp(u, 0, 1));
        if (!nonlinear && !staged) { add(0); add(1); }
        else {
          for (let n = 0; n < steps; n++) {
            add(n / steps);
            if (wOf[n] > 0) add((n + wOf[n]) / steps);
            for (let k = 1; k <= K; k++) add((n + wOf[n] + (moveFrac * k) / K) / steps);
          }
          add(1);
        }
        const list = [...us.values()].sort((x, y) => x - y);
        const ps = list.map(P);
        const ws = ps.map((p, j) => (j === 0 ? startAt(b) : wrap(p, Lw, sgn > 0)));
        const ks = ps.map((p, j) => Math.round((p - ws[j]) / Lw)); // which loop copy each sample is in
        const p0 = ws[0];
        const ev = [];
        list.forEach((u, j) => {
          ev.push({ u, p: ws[j], o: 0.5 });
          if (j === 0 || ks[j] === ks[j - 1]) return;
          const dir = ks[j] > ks[j - 1] ? 1 : -1;
          for (let k = ks[j - 1]; k !== ks[j]; k += dir) {
            const edge = (dir > 0 ? k + 0.5 : k - 0.5) * Lw;
            const uu = list[j - 1] + ((edge - ps[j - 1]) / (ps[j] - ps[j - 1])) * (u - list[j - 1]);
            ev.push({ u: uu, p: dir * (Lw / 2), o: 0 }, { u: uu, p: -dir * (Lw / 2), o: 1 }); // off-screen hard cut
          }
        });
        return ev.sort((x, y) => x.u - y.u || x.o - y.o).map(({ u, p }) => ({ u, ...pose(i, p, p0) }));
      };

      const layout = Array.from({ length: count }, (_, i) => {
        const p0 = startAt(base(i)) + shift;
        return { x: horiz ? p0 : cross, y: horiz ? cross : p0, r: RATIO, h, radius: corner, fade: fadeAmt, fadeAxis: horiz ? "x" : "y", blurs, fx };
      });

      return {
        duration,
        poster: +(duration * 0.35).toFixed(2),
        layout,
        shots: [{ name: "Carousel", start: 0, len: duration, keys: [], stagger: { track } }],
      };
    },
  }),

  make({
    id: "p-cascade",
    label: "Cascade",
    category: "Stagger",
    tags: "frames stagger cascade row enter",
    params: [
      { key: "count", label: "Count", type: "slider", min: 2, max: 9, default: 5 },
      { key: "height", label: "Size", type: "slider", min: 30, max: 90, default: 60 },
      { key: "gap", label: "Gap", type: "slider", min: 0, max: 50, default: 8 },
      { key: "from", label: "Direction", type: "segmented", options: ["Left", "Right"], default: "Right" },
      { key: "spin", label: "Spin", type: "slider", min: 0, max: 45, default: 0 },
      { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: 35, section: "motion" },
      { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 12, default: 5, group: "Timing" },
    ],
    build: ({ count, height, gap, from, spin, stagger, duration }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const kx = aspect >= 1 ? aspect : 1;
      const h = height / 100;
      const w = (RATIO * h) / aspect;
      const pitch = w * (1 + gap / 100);
      const layout = Array.from({ length: count }, (_, i) => ({ x: (i - (count - 1) / 2) * pitch, y: 0, r: RATIO, h }));
      const side = from === "Left" ? -1 : 1;
      return {
        duration,
        poster: +(duration * 0.8).toFixed(2),
        layout,
        shots: [{
          name: "Cascade", start: 0, len: duration, keys: [],
          stagger: { dur: 1, step: (stagger / 100) * 0.6, ease: "expo-out", from: () => ({ dx: side * kx, dr: side * spin }) },
        }],
      };
    },
  }),
];

// ---------- Camera-only (parked: not in the Animation list) ----------
export const PARAM_CAMERA_TEMPLATES = [
  make({
    id: "p-orbit",
    label: "Hero Orbit",
    category: "Orbit",
    tags: "orbit rotate camera turn",
    params: [
      { key: "direction", label: "Direction", type: "segmented", options: ["Left", "Right"], default: "Right" },
      { key: "sweep", label: "Sweep", type: "slider", min: 10, max: 120, default: 40 },
      { key: "tilt", label: "Tilt", type: "slider", min: 0, max: 40, default: 12 },
      { key: "push", label: "Push", type: "slider", min: 0, max: 30, default: 10 },
      { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 12, default: 6, group: "Timing" },
    ],
    build: ({ direction, sweep, tilt, push, duration }) => {
      const s = direction === "Left" ? -1 : 1;
      return {
        duration,
        poster: +(duration * 0.4).toFixed(2),
        shots: [{
          name: "Orbit", start: 0, len: duration,
          keys: [
            { t: 0, ...cam({ rotationY: (-s * sweep) / 2, rotationX: tilt }) },
            { t: duration, ...cam({ rotationY: (s * sweep) / 2, rotationX: tilt * 0.4, zoom: clamp(70 + push, 0, 100) }) },
          ],
        }],
      };
    },
  }),

  make({
    id: "p-push-in",
    label: "Push In",
    category: "Camera",
    tags: "zoom push camera drift",
    params: [
      { key: "amount", label: "Amount", type: "slider", min: 5, max: 40, default: 25 },
      { key: "drift", label: "Drift X", type: "slider", min: -30, max: 30, default: 0 },
      { key: "roll", label: "Roll", type: "slider", min: 0, max: 20, default: 0 },
      { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 12, default: 5, group: "Timing" },
    ],
    build: ({ amount, drift, roll, duration }) => ({
      duration,
      poster: +(duration * 0.5).toFixed(2),
      shots: [{
        name: "Push In", start: 0, len: duration,
        keys: [
          { t: 0, ...cam({ zoom: 55, positionX: -drift / 2, rotationZ: -roll / 2 }) },
          { t: duration, ...cam({ zoom: clamp(55 + amount, 0, 100), positionX: drift / 2, rotationZ: roll / 2 }) },
        ],
      }],
    }),
  }),
];

export const PARAM_ALL = PARAM_FRAME_TEMPLATES; // what the Animation tab lists
export const PARAM_CATEGORIES = ["All", ...new Set(PARAM_ALL.map((t) => t.category))];