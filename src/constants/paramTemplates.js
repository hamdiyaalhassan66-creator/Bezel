// Parametric templates: a param schema + build(params, ctx).
// build returns the same shape as an entry in VIDEO_TEMPLATES / FRAME_VIDEO_TEMPLATES
// ({ duration, poster, shots, layout? }). ctx.aspect = canvas width / height (1 until it's measured).

import { vidEaseFn, vidEaseSpec, VID_FPS } from "../lib/videoMath.js";
import { SHARED_FX } from "../lib/sharedEffects.js";
import { rotX as RX, rotY as RY, rotZ as RZ, mulMat } from "../lib/plane3d.js";

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

// Shared by every Animation template: the effects param, and the layout fields derived from it.
// [{ id, type: "fade" | "blur" | <SHARED_FX type>, on, ...settings }]
const FX_PARAM = { key: "fxList", type: "flag", default: [], section: "effects" };
const fxLayout = (fxList = []) => {
  const fade = Math.max(0, ...fxList.filter((x) => x.type === "fade" && x.on).map((x) => x.fade));
  const blurs = fxList
    .filter((x) => x.type === "blur" && x.on && (x.blur > 0 || (x.startBlur ?? 0) > 0))
    .map((x) => ({
      blur: x.blur, mode: x.mode === "Progressive" ? "progressive" : "uniform",
      startBlur: x.startBlur ?? 0, x0: x.x0, y0: x.y0, x1: x.x1, y1: x.y1,
    }));
  // shared effects (glow, chromatic, fish eye, vignette, liquid glass) go to the frames as they are
  const fx = fxList.filter((x) => x.on && SHARED_FX[x.type]).map(({ id, on, ...rest }) => rest);
  return { fade, blurs, fx };
};

// ---- Motion helpers for per-frame tracks ({ u: 0-1, dx, dy, k, dr } keys) ----
const lerp = (a, b, t) => a + (b - a) * t;
const OFF0 = { dx: 0, dy: 0, k: 1, dr: 0 }; // offsets that mean "at rest"
// canvas fraction -> "short side" units (what frame x / y use)
const axes = (aspect) => ({ kx: aspect >= 1 ? aspect : 1, ky: aspect >= 1 ? 1 : 1 / aspect });
// Eased move from pose a to pose b between u0 and u1. Easing is baked in because track segments are linear.
const tween = (u0, u1, a, b, fn, N = 8) =>
  Array.from({ length: N + 1 }, (_, j) => {
    const t = fn(j / N);
    return {
      u: u0 + ((u1 - u0) * j) / N,
      dx: lerp(a.dx, b.dx, t), dy: lerp(a.dy, b.dy, t), k: lerp(a.k, b.k, t), dr: lerp(a.dr, b.dr, t),
    };
  });
// drops keys that repeat the previous one
const tidy = (keys) =>
  keys.filter((k, j) => {
    const p = keys[j - 1];
    return !p || Math.abs(k.u - p.u) > 1e-6 || k.dx !== p.dx || k.dy !== p.dy || k.k !== p.k || k.dr !== p.dr;
  });
// a row of frames centered on the canvas
const rowLayout = (count, h, gap, aspect, extra) => {
  const w = (RATIO * h) / aspect;
  const pitch = w * (1 + gap / 100);
  return Array.from({ length: count }, (_, i) => ({ x: (i - (count - 1) / 2) * pitch, y: 0, r: RATIO, h, ...extra }));
};
export const instantiateParam = (t, p = defaultParams(t.params), ctx = {}) => ({ ...t, ...t.build(p, ctx) });
const make = (def) => instantiateParam(def);

// ---------- 3D ring: shared by 3D 01 / 03 / 05 (they only differ in defaults) ----------
const ring3dParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Forward", "Reverse"], default: d.direction ?? "Forward" },
  { key: "axis", label: "Axis", type: "segmented", options: ["Horizontal", "Vertical"], default: d.axis ?? "Horizontal" },
  { key: "view", label: "View", type: "segmented", options: ["Outside", "Inside"], default: d.view ?? "Outside" },
  { key: "backface", label: "Backface", type: "segmented", options: ["Show", "Hide"], default: d.backface },
  { key: "surface", label: "Surface", type: "segmented", options: ["Flat", "Curved"], default: d.surface ?? "Flat" },
  { key: "solo", label: "Solo", type: "segmented", options: ["Off", "On"], default: d.solo ?? "Off" },
  { key: "count", label: "Count", type: "slider", min: 3, max: 16, default: d.count, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 90, default: d.size, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: -100, max: 100, default: d.gap ?? 0, group: "Frame" },
  ...(d.distance === false ? [] : [{ key: "distance", label: "Distance", type: "slider", min: -100, max: 100, default: d.distance ?? 0, group: "Frame" }]),
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: 6, group: "Frame" },
  { key: "radius", label: "Circumference", type: "slider", min: 0, max: 1000, default: d.radius, group: "Frame" },
  { key: "tiltX", label: "Rotation X", type: "slider", min: -180, max: 180, default: d.tiltX ?? 0, group: "Rotation" },
  { key: "tiltY", label: "Rotation Y", type: "slider", min: -180, max: 180, default: 0, group: "Rotation" },
  { key: "tiltZ", label: "Rotation Z", type: "slider", min: -180, max: 180, default: 0, group: "Rotation" },
  { key: "perspective", label: "Perspective", type: "slider", min: 0, max: 1200, default: d.perspective, group: "Camera" },
  { key: "offsetX", label: "Offset X", type: "slider", min: -50, max: 50, default: 0, group: "Camera" },
  { key: "offsetY", label: "Offset Y", type: "slider", min: -50, max: 50, default: 0, group: "Camera" },
  FX_PARAM,
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 20, hardMax: 600, default: d.duration, group: "Timing" },
  { key: "ease", label: "Easing", type: "ease", default: vidEaseSpec(d.ease), section: "motion" },
  { key: "delay", label: "Hold (f)", type: "slider", min: 0, max: 60, default: d.hold, section: "motion" },
];

const ring3dBuild = (
  { direction, axis, view, backface, surface, solo, count, size, gap, distance = 0, corner, radius, tiltX, tiltY, tiltZ, perspective, offsetX, offsetY, fxList, cycles, duration, ease, delay },
  ctx
) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade: fadeAmt, blurs, fx } = fxLayout(fxList);
  const horiz = axis === "Horizontal";
  const h = size / 100;
  const Hs = h * ky, Ws = RATIO * Hs; // plane size in short-side units
  const L = horiz ? Ws : Hs; // plane length along the ring
  const baseR = ((L * (1 + gap / 100)) / 2 / Math.tan(Math.PI / count)) * (1 + radius / 100); // gap 0 + radius 0 = planes touch (a prism)
  const inside = view === "Inside" || radius > 300; // camera at the center of the ring
  const faceIn = view === "Inside"; // planes face the camera. Radius > 300 on its own keeps the old look from behind
  const half = (horiz ? kx : ky) / 2; // half the canvas along the ring's direction
    // Camera distance for a ring of radius Rc. 0-200 is unchanged. From 200 to 1200 the camera keeps moving in, almost to the front plane
  const camDist = (Rc) =>
    perspective <= 100
      ? Rc + Ws + lerp(8, 1.2, perspective / 100)
      : perspective <= 200
        ? lerp(Rc + Ws + 1.2, 0.5 * Rc + 0.1, (perspective - 100) / 100)
        : lerp(0.5 * Rc + 0.1, 0.05 * Rc + 0.02, Math.min(1, (perspective - 200) / 1000));
  // Solo: the smallest ring where a plane half a step away is fully off the canvas, so one plane is on screen at a time
  const soloOk = (Rc) => {
    const ph = Math.PI / count, s = Math.sin(ph), c = Math.cos(ph);
    const X = Rc * s - (L / 2) * c; // the near edge of that plane
    if (inside) {
      const d = Rc * c + (L / 2) * s; // depth from the camera at the center
      return d < 0.05 * Rc || (X * Rc) / d >= half + 0.02;
    }
    const Pc = camDist(Rc);
    const Z = Rc * (c - 1) + (L / 2) * s;
    return (X * Pc) / Math.max(1e-3, Pc - Z) >= half + 0.02;
  };
  let R = baseR;
  if (solo === "On") for (let n = 0; n < 400 && R < 1e4 && !soloOk(R); n++) R *= 1.03;
  const P = inside ? R : camDist(R); // inside: camera at the center, the plane ahead keeps its nominal size
  // Decreasing Distance moves the ring toward the camera. At -100 the camera sits at the ring's center
  const zShift = -(distance / 100) * (inside ? 0.5 * R : P + R);
  const sgn = (direction === "Reverse" ? -1 : 1) * (inside ? -1 : 1); // seen from inside, the same spin runs the other way on screen
  const step = 360 / count;
  const steps = cycles * count; // each step turns the ring by one plane
  const Rt = mulMat(mulMat(RX(tiltX), RY(tiltY)), RZ(tiltZ));
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("linear"));
  const stepFrames = (duration * VID_FPS) / steps;
  const hold = clamp(delay / stepFrames, 0, 0.85); // wait at the start of each step
  const N = clamp(Math.floor(480 / steps), 4, 16); // samples per step: planes move on a circle, so keys must be dense

  const spinAt = (u) => {
    const s = u * steps;
    const n = Math.min(steps - 1, Math.floor(s + 1e-9));
    const e = easeFn(clamp((s - n - hold) / (1 - hold), 0, 1));
    return sgn * (n + e) * step;
  };
  const us = new Map();
  const add = (u) => us.set(Math.round(u * 1e9), clamp(u, 0, 1));
  for (let n = 0; n < steps; n++) {
    add(n / steps);
    if (hold > 0) add((n + hold) / steps);
    for (let k = 1; k <= N; k++) add((n + hold + ((1 - hold) * k) / N) / steps);
  }
  add(1);
  const list = [...us.values()].sort((a, b) => a - b);

  const track = (i) =>
    list.map((u) => {
      const sp = spinAt(u) + i * step; // spin angle in degrees, keeps growing so the interpolation never wraps
      const sa = sp + (inside ? 180 : 0); // inside: plane 0 starts on the far side, in front of the camera
      const th = (sa * Math.PI) / 180, sn = Math.sin(th), cs = Math.cos(th);
      const local = horiz ? [R * sn, 0, R * cs] : [0, -R * sn, R * cs];
      const pt = [0, 1, 2].map((r) => Rt[r][0] * local[0] + Rt[r][1] * local[1] + Rt[r][2] * local[2]);
      const dz = pt[2] - (inside ? -R : R) + zShift; // outside: the front plane sits at z = 0. inside: the far plane does
      const behind = dz > 0.9 * P; // at or past the camera: hide, so the front planes pass through the screen and reveal the ones behind
      return {
        u,
        dx: pt[0] + (offsetX / 100) * kx,
        dy: pt[1] + (offsetY / 100) * ky,
        dz,
        ...(horiz ? { ry: faceIn ? sp : sa } : { rx: faceIn ? sp : sa }), // facing in: the plane on the far side points back at the camera
        k: behind ? 0.001 : 1,
      };
    });

  // Curved: each plane bends around the same axis the ring turns on, with the ring's own radius, so the planes hug the orbit
  const curve = surface === "Curved" ? { axis: horiz ? "y" : "x", radius: R, inward: faceIn } : null;
  const rig = { tx: tiltX, ty: tiltY, tz: tiltZ, persp: P, hide: backface === "Hide" && !(inside && !faceIn), curve }; // inside, every visible plane shows its back
  const layout = Array.from({ length: count }, () => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade: fadeAmt, fadeAxis: "x", blurs, fx, rig,
  }));
  return {
    duration,
    poster: +(duration * 0.12).toFixed(2),
    layout,
    shots: [{ name: "3D", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

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
      FX_PARAM,
      { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
      { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 20, hardMax: 600, default: 8, group: "Timing" },
      { key: "ease", label: "Easing", type: "ease", default: vidEaseSpec("linear"), section: "motion" },
      { key: "stagger", label: "Stagger (f)", type: "slider", min: 0, max: 20, default: 0, section: "motion", attach: true },
      { key: "delay", label: "Delay (f)", type: "slider", min: 0, max: 60, default: 0, section: "motion" },
    ],
    build: ({ direction, start, scaleCenter, tilt, tiltAmount, solo, count, size, corner, gap, offsetX, offsetY, fxList, duration, cycles, stagger, delay, ease }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const kx = aspect >= 1 ? aspect : 1; // canvas fraction -> "short side" units, which frame x / y use
      const { fade: fadeAmt, blurs, fx } = fxLayout(fxList);
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
      FX_PARAM,
      { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: 35, section: "motion" },
      { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 12, default: 5, group: "Timing" },
    ],
    build: ({ count, height, gap, from, spin, fxList, stagger, duration }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const kx = aspect >= 1 ? aspect : 1;
      const h = height / 100;
      const w = (RATIO * h) / aspect;
      const pitch = w * (1 + gap / 100);
      const { fade, blurs, fx } = fxLayout(fxList);
      const layout = Array.from({ length: count }, (_, i) => ({
        x: (i - (count - 1) / 2) * pitch, y: 0, r: RATIO, h, fade, fadeAxis: "x", blurs, fx,
      }));
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

  // ---- Fan Out: frames start stacked at the center and spread into a row ----
  make({
    id: "p-fan-out",
    label: "Fan Out",
    category: "Stagger",
    tags: "fan out spread stack center enter exit",
    params: [
      { key: "count", label: "Count", type: "slider", min: 2, max: 9, default: 5 },
      { key: "height", label: "Size", type: "slider", min: 30, max: 90, default: 60 },
      { key: "gap", label: "Gap", type: "slider", min: 0, max: 50, default: 8 },
      { key: "spread", label: "Fan Angle", type: "slider", min: 0, max: 40, default: 14 },
      { key: "exit", label: "Exit", type: "segmented", options: ["Off", "On"], default: "Off" },
      FX_PARAM,
      { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: 30, section: "motion" },
      { key: "duration", label: "Duration (s)", type: "slider", min: 3, max: 12, default: 6, group: "Timing" },
    ],
    build: ({ count, height, gap, spread, exit, fxList, stagger, duration }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const { fade, blurs, fx } = fxLayout(fxList);
      const layout = rowLayout(count, height / 100, gap, aspect, { fade, fadeAxis: "x", blurs, fx });
      // rest x is in short-side units, so -x collapses a frame onto the canvas center
      const from = (i, n, r) => ({ dx: -r.x, k: 0.7, dr: (i - (n - 1) / 2) * spread });
      return {
        duration,
        poster: +(duration * 0.45).toFixed(2),
        layout,
        shots: [{
          name: "Fan Out", start: 0, len: duration, keys: [],
          stagger: {
            dur: Math.min(1, duration / 4), step: (stagger / 100) * 0.6, ease: "expo-out", outEase: "cubic-in",
            from, ...(exit === "On" ? { out: from } : {}),
          },
        }],
      };
    },
  }),

  // ---- Rise: frames travel in from below / above, one after another ----
  make({
    id: "p-rise",
    label: "Rise",
    category: "Stagger",
    tags: "rise drop slide up down stagger enter exit",
    params: [
      { key: "count", label: "Count", type: "slider", min: 2, max: 9, default: 4 },
      { key: "height", label: "Size", type: "slider", min: 30, max: 90, default: 60 },
      { key: "gap", label: "Gap", type: "slider", min: 0, max: 50, default: 10 },
      { key: "direction", label: "Direction", type: "segmented", options: ["Up", "Down"], default: "Up" },
      { key: "distance", label: "Distance", type: "slider", min: 10, max: 100, default: 60 },
      { key: "exit", label: "Exit", type: "segmented", options: ["Off", "On"], default: "Off" },
      FX_PARAM,
      { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: 40, section: "motion" },
      { key: "duration", label: "Duration (s)", type: "slider", min: 3, max: 12, default: 6, group: "Timing" },
    ],
    build: ({ count, height, gap, direction, distance, exit, fxList, stagger, duration }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const { ky } = axes(aspect);
      const { fade, blurs, fx } = fxLayout(fxList);
      const layout = rowLayout(count, height / 100, gap, aspect, { fade, fadeAxis: "y", blurs, fx });
      const sgn = direction === "Up" ? 1 : -1; // frame y grows downward, so "Up" starts below
      const d = (distance / 100) * ky;
      return {
        duration,
        poster: +(duration * 0.5).toFixed(2),
        layout,
        shots: [{
          name: "Rise", start: 0, len: duration, keys: [],
          stagger: {
            dur: Math.min(1, duration / 4), step: (stagger / 100) * 0.6, ease: "expo-out", outEase: "cubic-in",
            from: () => ({ dy: sgn * d, k: 0.92 }),
            // the exit keeps going in the travel direction
            ...(exit === "On" ? { out: () => ({ dy: -sgn * d, k: 0.92 }) } : {}),
          },
        }],
      };
    },
  }),

  // ---- Grid Reveal: a rows x cols grid pops in ----
  make({
    id: "p-grid-reveal",
    label: "Grid Reveal",
    category: "Grid",
    tags: "grid reveal pop tiles diagonal enter",
    params: [
      { key: "cols", label: "Columns", type: "slider", min: 1, max: 6, default: 3 },
      { key: "rows", label: "Rows", type: "slider", min: 1, max: 6, default: 2 },
      { key: "size", label: "Size", type: "slider", min: 30, max: 95, default: 80 },
      { key: "gap", label: "Gap", type: "slider", min: 0, max: 30, default: 6 },
      { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: 6 },
      { key: "style", label: "Style", type: "segmented", options: ["Pop", "Rise", "Slide"], default: "Pop" },
      { key: "order", label: "Order", type: "segmented", options: ["Diagonal", "Row", "Column", "Random"], default: "Diagonal" },
      FX_PARAM,
      { key: "ease", label: "Easing", type: "ease", default: vidEaseSpec("expo-out"), section: "motion" },
      { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: 60, section: "motion" },
      { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 12, default: 5, group: "Timing" },
    ],
    build: ({ cols, rows, size, gap, corner, style, order, fxList, ease, stagger, duration }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const { kx, ky } = axes(aspect);
      const { fade, blurs, fx } = fxLayout(fxList);
      const g = gap / 100;
      // the grid has to fit both ways: by height, and by width
      const hH = size / 100 / (rows + (rows - 1) * g);
      const hW = ((size / 100) * aspect) / (RATIO * (cols + (cols - 1) * g));
      const h = Math.min(hH, hW);
      const w = (RATIO * h) / aspect;
      const px = w * (1 + g), py = h * (1 + g);
      const n = cols * rows;
      const layout = Array.from({ length: n }, (_, i) => ({
        x: ((i % cols) - (cols - 1) / 2) * px,
        y: (Math.floor(i / cols) - (rows - 1) / 2) * py,
        r: RATIO, h, radius: corner, fade, fadeAxis: "x", blurs, fx,
      }));
      const easeFn = vidEaseFn(ease ?? vidEaseSpec("expo-out"));
      const from = { ...OFF0, ...(style === "Pop" ? { k: 0.05 } : style === "Rise" ? { dy: 0.25 * ky, k: 0.9 } : { dx: -0.25 * kx, k: 0.9 }) };
      const rankOf = (i) => {
        const r = Math.floor(i / cols), c = i % cols;
        if (order === "Row") return n > 1 ? i / (n - 1) : 0;
        if (order === "Column") return n > 1 ? (c * rows + r) / (n - 1) : 0;
        if (order === "Random") { const v = Math.sin((i + 1) * 12.9898) * 43758.5453; return v - Math.floor(v); }
        return rows + cols > 2 ? (r + c) / (rows + cols - 2) : 0; // Diagonal
      };
      const track = (i) => {
        const dur = 0.35; // share of the timeline each tile takes to arrive
        const u0 = rankOf(i) * (1 - dur) * (stagger / 100);
        return tidy([
          { u: 0, ...from },
          { u: u0, ...from },
          ...tween(u0, u0 + dur, from, OFF0, easeFn),
          { u: 1, ...OFF0 },
        ]);
      };
      return {
        duration,
        poster: +(duration * 0.7).toFixed(2),
        layout,
        shots: [{ name: "Grid Reveal", start: 0, len: duration, keys: [], stagger: { track } }],
      };
    },
  }),

  // ---- Wave: a row of frames bobs in a traveling sine wave (loops) ----
  make({
    id: "p-wave",
    label: "Wave",
    category: "Loop",
    tags: "wave bob float loop sine row",
    params: [
      { key: "count", label: "Count", type: "slider", min: 2, max: 9, default: 6 },
      { key: "size", label: "Size", type: "slider", min: 20, max: 90, default: 45 },
      { key: "gap", label: "Gap", type: "slider", min: 0, max: 50, default: 8 },
      { key: "amplitude", label: "Amplitude", type: "slider", min: 0, max: 40, default: 12 },
      { key: "phase", label: "Phase", type: "slider", min: 0, max: 100, default: 40 },
      { key: "tilt", label: "Tilt", type: "slider", min: 0, max: 30, default: 0 },
      FX_PARAM,
      { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 6, default: 2, group: "Timing" },
      { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 20, hardMax: 600, default: 6, group: "Timing" },
    ],
    build: ({ count, size, gap, amplitude, phase, tilt, fxList, cycles, duration }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const { ky } = axes(aspect);
      const { fade, blurs, fx } = fxLayout(fxList);
      const layout = rowLayout(count, size / 100, gap, aspect, { fade, fadeAxis: "x", blurs, fx });
      const step = (phase / 100) * (Math.PI / 2); // phase lag between neighbours
      const N = cycles * 24; // whole cycles, so the last key matches the first and the loop is seamless
      const track = (i) => {
        const s0 = Math.sin(-i * step), c0 = Math.cos(-i * step);
        return Array.from({ length: N + 1 }, (_, j) => {
          const u = j / N;
          const a = 2 * Math.PI * cycles * u - i * step;
          return {
            u,
            dy: -(amplitude / 100) * ky * (Math.sin(a) - s0), // starts exactly at rest
            dr: tilt * (Math.cos(a) - c0),
          };
        });
      };
      return {
        duration,
        poster: +(duration * 0.35).toFixed(2),
        layout,
        shots: [{ name: "Wave", start: 0, len: duration, keys: [], stagger: { track } }],
      };
    },
  }),

  // ---- Ring: frames on a circle that revolves ----
  make({
    id: "p-ring",
    label: "Ring",
    category: "Ring",
    tags: "ring circle orbit revolve carousel loop",
    params: [
      { key: "count", label: "Count", type: "slider", min: 3, max: 12, default: 6 },
      { key: "size", label: "Size", type: "slider", min: 10, max: 60, default: 28 },
      { key: "radius", label: "Radius", type: "slider", min: 10, max: 60, default: 30 },
      { key: "direction", label: "Direction", type: "segmented", options: ["Clockwise", "Counter"], default: "Clockwise" },
      { key: "rotate", label: "Rotate", type: "segmented", options: ["Off", "Follow"], default: "Off" },
      { key: "depth", label: "Depth", type: "slider", min: 0, max: 50, default: 0 },
      FX_PARAM,
      { key: "revs", label: "Revolutions", type: "slider", min: 1, max: 3, default: 1, group: "Timing" },
      { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 20, hardMax: 600, default: 8, group: "Timing" },
    ],
    build: ({ count, size, radius, direction, rotate, depth, fxList, revs, duration }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const { kx, ky } = axes(aspect);
      const { fade, blurs, fx } = fxLayout(fxList);
      const Rs = (radius / 100) * ky; // radius in short-side units
      const dir = direction === "Clockwise" ? 1 : -1; // y grows downward, so +angle runs clockwise on screen
      const ang = (i) => (2 * Math.PI * i) / count - Math.PI / 2; // frame 0 starts at the top
      const layout = Array.from({ length: count }, (_, i) => ({
        x: (Rs * Math.cos(ang(i))) / kx, y: (Rs * Math.sin(ang(i))) / ky,
        r: RATIO, h: size / 100, fade, fadeAxis: "x", blurs, fx,
      }));
      const N = revs * 36; // whole revolutions, so the loop is seamless
      const scaleAt = (a) => 1 + (depth / 100) * Math.sin(a); // bigger toward the bottom of the ring
      const track = (i) => {
        const a0 = ang(i);
        return Array.from({ length: N + 1 }, (_, j) => {
          const u = j / N;
          const th = dir * 2 * Math.PI * revs * u;
          return {
            u,
            dx: Rs * (Math.cos(a0 + th) - Math.cos(a0)),
            dy: Rs * (Math.sin(a0 + th) - Math.sin(a0)),
            k: scaleAt(a0 + th) / scaleAt(a0),
            dr: rotate === "Follow" ? (th * 180) / Math.PI : 0,
          };
        });
      };
      return {
        duration,
        poster: +(duration * 0.15).toFixed(2),
        layout,
        shots: [{ name: "Ring", start: 0, len: duration, keys: [], stagger: { track } }],
      };
    },
  }),

  make({
    id: "p-3d-01",
    label: "01",
    category: "3D",
    tags: "3d ring carousel orbit rolodex small planes",
    params: ring3dParams({ backface: "Show", count: 8, size: 26, radius: 90, perspective: 60, duration: 8, ease: "linear", hold: 0 }),
    build: ring3dBuild,
  }),
  make({
    id: "p-3d-03",
    label: "02",
    category: "3D",
    tags: "3d ring carousel orbit large planes",
    params: ring3dParams({ backface: "Show", solo: "On", count: 8, size: 55, radius: 0, perspective: 65, duration: 10, ease: "expo-out", hold: 0 }),
    build: ring3dBuild,
  }),
  make({
    id: "p-3d-05",
    label: "03",
    category: "3D",
    tags: "3d prism cube faces step rotate",
    params: ring3dParams({ backface: "Hide", count: 6, size: 60, radius: 0, perspective: 70, duration: 9, ease: "expo-out", hold: 0 }),
    build: ring3dBuild,
  }),
    make({
    id: "p-3d-10",
    label: "04",
    category: "3D",
    tags: "3d inside ring curved cylinder wrap continuous",
    params: ring3dParams({ distance: false, view: "Inside", surface: "Curved", backface: "Show", count: 12, size: 38, gap: 20, radius: 0, perspective: 60, duration: 10, ease: "linear", hold: 0 }),
    build: ring3dBuild,
  }),
  make({
    id: "p-3d-12",
    label: "05",
    category: "3D",
    tags: "3d inside one at a time step slide",
    params: ring3dParams({ view: "Inside", backface: "Show", count: 6, size: 60, gap: 100, radius: 0, perspective: 60, duration: 12, ease: "expo-out", hold: 20 }),
    build: ring3dBuild,
  }),
  make({
    id: "p-3d-14",
    label: "06",
    category: "3D",
    tags: "3d inside large planes edge to edge step prism",
    params: ring3dParams({ view: "Inside", backface: "Show", count: 8, size: 85, gap: 0, radius: 0, perspective: 60, duration: 12, ease: "expo-out", hold: 20 }),
    build: ring3dBuild,
  }),
    make({
    id: "p-3d-19",
    label: "07",
    category: "3D",
    tags: "3d ring tilt band carousel many planes",
    params: ring3dParams({ tiltX: 40, backface: "Show", count: 14, size: 30, gap: 5, radius: 0, perspective: 80, duration: 10, ease: "linear", hold: 0 }),
    build: ring3dBuild,
  }),
  make({
    id: "p-3d-21",
    label: "08",
    category: "3D",
    tags: "3d drum vertical stacked curved barrel",
    params: ring3dParams({ axis: "Vertical", surface: "Curved", backface: "Show", count: 10, size: 42, gap: 0, radius: 0, perspective: 100, duration: 10, ease: "linear", hold: 0 }),
    build: ring3dBuild,
  }),
    make({
    id: "p-3d-17",
    label: "09",
    category: "3D",
    tags: "3d ring outside gap band carousel",
    params: ring3dParams({ backface: "Show", count: 12, size: 36, gap: 25, radius: 0, perspective: 80, duration: 10, ease: "linear", hold: 0 }),
    build: ring3dBuild,
  }),
  make({
    id: "p-3d-18",
    label: "10",
    category: "3D",
    tags: "3d drum vertical prism tall flat",
    params: ring3dParams({ axis: "Vertical", backface: "Show", count: 8, size: 62, gap: 0, radius: 0, perspective: 70, duration: 10, ease: "linear", hold: 0 }),
    build: ring3dBuild,
  }),
    make({
    id: "p-3d-20",
    label: "11",
    category: "3D",
    tags: "3d ring band outside flat many planes",
    params: ring3dParams({ tiltX: 0, surface: "Curved", backface: "Show", count: 14, size: 25, gap: 5, radius: 0, perspective: 160, distance: -40, duration: 10, ease: "linear", hold: 0 }),
    build: ring3dBuild,
  }),
  make({
    id: "p-3d-22",
    label: "12",
    category: "3D",
    tags: "3d drum vertical inside hourglass curved",
    params: ring3dParams({ axis: "Vertical", view: "Inside", surface: "Curved", backface: "Show", count: 10, size: 42, gap: 0, radius: 0, perspective: 60, duration: 10, ease: "linear", hold: 0 }),
    build: ring3dBuild,
  }),
  make({
    id: "p-3d-23",
    label: "13",
    category: "3D",
    tags: "3d inside ring curved band wrap",
    params: ring3dParams({ view: "Inside", surface: "Curved", backface: "Show", count: 16, size: 25, gap: 7, radius: 0, perspective: 60, duration: 10, ease: "linear", hold: 0 }),
    build: ring3dBuild,
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