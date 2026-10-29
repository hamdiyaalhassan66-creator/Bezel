// Parametric templates: a param schema + build(params, ctx).
// build returns the same shape as an entry in VIDEO_TEMPLATES / FRAME_VIDEO_TEMPLATES
// ({ duration, poster, shots, layout? }). ctx.aspect = canvas width / height (1 until it's measured).

import { vidEaseFn, vidEaseSpec, VID_FPS } from "../lib/videoMath.js";
import { SHARED_FX } from "../lib/sharedEffects.js";
import { rotX as RX, rotY as RY, rotZ as RZ, mulMat } from "../lib/plane3d.js";

const CAM0 = { rotationX: 0, rotationY: 0, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 };
const cam = (o) => ({ ...CAM0, ...o });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let RATIO = 0.75; // plane width / height. instantiateParam sets it from the plane W / H while a template builds
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
const easeParam = (def = "linear") => ({ key: "ease", label: "Easing", type: "ease", default: vidEaseSpec(def), section: "motion" });
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
// Eases time inside each cycle, so a looping template still ends exactly where it started
const cycleEase = (easeFn, cycles) => (u) => {
  const s = u * cycles;
  const n = Math.min(cycles - 1, Math.floor(s + 1e-9));
  return (n + easeFn(clamp(s - n, 0, 1))) / cycles;
};
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
// Plane box shared by every Animation template: W / H set the plane's shape and size, Scale multiplies it.
// 750 x 1000 is the shape the templates were authored with, so the defaults change nothing.
const PLANE_BASE = { w: 750, h: 1000 };
const PLANE_KEYS = ["size", "height"]; // each template's own plane-size param
const PLANE_PARAMS = [
  { key: "planeW", type: "flag", default: PLANE_BASE.w, section: "plane" },
  { key: "planeH", type: "flag", default: PLANE_BASE.h, section: "plane" },
  { key: "planeLock", type: "flag", default: true, section: "plane" },
  { key: "planeScale", type: "flag", default: 100, section: "plane" },
];
// Aspect the templates were authored for. Narrower canvases shrink the planes so they keep the same share of the canvas width.
const REF_ASPECT = 16 / 9;
const aspectFit = (t, aspect) => (t.noAspectFit || !aspect ? 1 : Math.min(1, aspect / REF_ASPECT));

// Folds W / H / Scale into the template's size param and the plane ratio, for this build only
const planeParams = (t, p, aspect) => {
  if (!t.planeKey) return { params: p, ratio: RATIO };
  const w = Math.max(1, p.planeW ?? PLANE_BASE.w), h = Math.max(1, p.planeH ?? PLANE_BASE.h);
  const k = (h / PLANE_BASE.h) * ((p.planeScale ?? 100) / 100) * aspectFit(t, aspect);
  return { params: { ...p, [t.planeKey]: p[t.planeKey] * k }, ratio: w / h };
};
export const instantiateParam = (t, p = defaultParams(t.params), ctx = {}) => {
  const q = planeParams(t, p, ctx.aspect);
  const prev = RATIO;
  RATIO = q.ratio;
  try {
    return { ...t, ...t.build(q.params, ctx) };
  } finally {
    RATIO = prev;
  }
};
const make = (def) => {
  const planeKey = PLANE_KEYS.find((k) => def.params.some((p) => p.key === k));
  const planeDefs = def.plane
    ? PLANE_PARAMS.map((p) => (p.key === "planeW" ? { ...p, default: def.plane.w } : p.key === "planeH" ? { ...p, default: def.plane.h } : p))
    : PLANE_PARAMS;
  return instantiateParam(planeKey ? { ...def, planeKey, params: [...def.params, ...planeDefs] } : def);
};

// ---------- 3D ring: shared by 3D 01 / 03 / 05 (they only differ in defaults) ----------
const ring3dParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Left", "Right"], default: d.direction ?? "Right" },
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
  { key: "tiltX", label: "X - Rotation", type: "slider", min: -180, max: 180, default: d.tiltX ?? 0, group: "Rotation" },
  { key: "tiltY", label: "Y - Rotation", type: "slider", min: -180, max: 180, default: 0, group: "Rotation" },
  { key: "tiltZ", label: "Z - Rotation", type: "slider", min: -180, max: 180, default: 0, group: "Rotation" },
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
  const sgn = (direction === "Left" || direction === "Reverse" ? -1 : 1) * (inside ? -1 : 1); // seen from inside, the same spin runs the other way on screen
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

// ---------- Carousel: a strip of planes that travels from one end of the canvas to the other (loops) ----------
const carouselParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Left", "Right"], default: d.direction ?? "Left" },
  { key: "stack", label: "Stack", type: "segmented", options: ["Horizontal", "Vertical"], default: d.stack ?? "Horizontal" },
  ...(d.surface ? [{ key: "surface", label: "Surface", type: "segmented", options: ["Flat", "Curved"], default: d.surface }] : []),
  { key: "count", label: "Count", type: "slider", min: 3, max: 40, default: d.count, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 90, default: d.size, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: -50, max: 100, default: d.gap, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: 6, group: "Frame" },
  { key: "curve", label: "Curve", type: "slider", min: 0, max: 80, default: d.curve, group: "Frame" },
  ...(d.solo ? [{ key: "solo", label: "Solo", type: "segmented", options: ["Off", "On"], default: d.solo, group: "Frame" }] : []),
  { key: "perspective", label: "Perspective", type: "slider", min: -1200, max: 1200, default: d.perspective, group: "Camera" },
  ...(d.scaleCenter
    ? [
        { key: "scaleCenter", label: "Scale Center", type: "segmented", options: ["Off", "On"], default: d.scaleCenter },
        { key: "scaleFocus", label: "Scale Focus", type: "segmented", options: ["Start", "Center", "End"], default: d.scaleFocus ?? "Center" },
        { key: "scaleAmount", label: "Scale Amount", type: "slider", min: 0, max: 100, default: d.scaleAmount ?? 10 },
      ]
    : []),
  ...(d.angle !== undefined
    ? [
        { key: "angle", label: "Angle", type: "slider", min: -90, max: 90, default: d.angle, group: "Path" },
        { key: "tilt", label: "Tilt", type: "slider", min: -45, max: 45, default: d.tilt ?? 0, group: "Path" },
        { key: "rotZ", label: "Z - Rotation", type: "slider", min: -90, max: 90, default: d.rotZ ?? 0, group: "Path" },
        { key: "rotY", label: "Y - Rotation", type: "slider", min: -90, max: 90, default: d.rotY ?? 0, group: "Path" },
      ]
    : []),
  { ...FX_PARAM, default: d.fxList ?? [] },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 20, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease),
];

const carouselBuild = ({ direction, stack: axis, surface = "Curved", count, size, gap, corner, curve, perspective, scaleCenter, scaleFocus, scaleAmount = 10, angle = 0, tilt = 0, rotZ = 0, rotY = 0, solo, fxList, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade: fadeAmt, blurs, fx } = fxLayout(fxList);
  const horiz = axis === "Horizontal";
  const h = size / 100;
  const Hs = h * ky, Ws = RATIO * Hs; // plane size in short-side units
  const L = horiz ? Ws : Hs; // plane length along the travel
  // Path direction: the stack axis turned clockwise by Angle (0 = along the axis, 90 = across it)
  const ang = (angle * Math.PI) / 180;
  const [bx, by] = horiz ? [1, 0] : [0, -1];
  const ux = bx * Math.cos(ang) - by * Math.sin(ang);
  const uy = bx * Math.sin(ang) + by * Math.cos(ang);
  const half = Math.min(kx / 2 / Math.max(Math.abs(ux), 1e-6), ky / 2 / Math.max(Math.abs(uy), 1e-6)); // half the canvas along the path
  const sgn = direction === "Right" || direction === "Forward" ? 1 : -1; // "Forward" = projects saved before the rename

  // Virtual cylinder: Curve = the angle where a plane's center reaches the canvas edge
  const cap = (Math.max(curve, 0.01) * Math.PI) / 180; // curve 0 = straight strip; the clamp keeps R finite
  const inward = perspective < 0; // negative perspective: the strip bows toward the camera
  const inv = inward ? -1 : 1;
  const pa = Math.abs(perspective);
  const m = pa <= 100 ? lerp(12, 3, pa / 100) : lerp(3, 1.6, (pa - 100) / 1100); // camera distance in cylinder radii: 0-100 as before, then it keeps moving in
  const sc = (th) => 1 / (1 + (inv * (1 - Math.cos(th))) / m); // perspective scale at angle th (it doesn't depend on R)
  const R = half / (Math.sin(cap) * sc(cap)); // radius chosen so the canvas edge lands at the Curve angle once perspective is applied
  const P = R * m;
  const soloPitch = 2 * half + L + 0.02; // a neighbour half a step away is fully off the canvas, so one plane shows at a time
  const pitch = Math.max(0.01, solo === "On" ? soloPitch : L * (1 + gap / 100)); // arc length between neighbours
  const loop = count * pitch; // arc length of one lap
  const mid = (count - 1) / 2;
  const steps = cycles * count; // each step moves the strip by one plane, whole laps so the loop is seamless
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("linear"));
  const K = clamp(Math.floor(480 / steps), 4, 16); // samples per step: planes move on a curve, so keys must be dense
  const spin = (u) => {
    const sN = u * steps;
    const n = Math.min(steps - 1, Math.floor(sN + 1e-9));
    return sgn * (n + easeFn(clamp(sN - n, 0, 1))) * pitch; // every step eases on its own
  };
  // the point in a step where the easing is halfway: that is when a plane crosses the wrap point
  let tHalf = 0.5;
  for (let lo = 0, hi = 1, it = 0; it < 30; it++) {
    tHalf = (lo + hi) / 2;
    if (easeFn(tHalf) < 0.5) lo = tHalf;
    else hi = tHalf;
  }

  // Scale Center: planes grow toward the focus point and ease back to 1 over half a canvas
  const focusPos = scaleFocus === "Center" ? 0 : (scaleFocus === "Start" ? -1 : 1) * half * (horiz ? 1 : -1); // Start = left / top, End = right / bottom
  const focusW = (pos) => {
    if (scaleCenter !== "On") return 0;
    const f = clamp(1 - Math.abs(pos - focusPos) / half, 0, 1);
    return f * f * (3 - 2 * f); // smoothstep, so there's no kink at the edges
  };
  const scaleAt = (pos) => 1 + (scaleAmount / 100) * focusW(pos);
  const liftAt = (pos) => focusW(pos) * L * 0.1; // the closer to the focus, the closer to the camera, so it stacks on top

  // Tilt: 0 at the center, full strength by the canvas edge (smoothstep), so the centered plane stays upright
  const tiltW = (pos) => {
    const f = clamp(Math.abs(pos) / half, 0, 1);
    return f * f * (3 - 2 * f);
  };

  // Side weight: negative left of the focus, positive right, 0 at the center (judged on screen, so it holds at any Angle)
  const sideAt = (pos) => tiltW(pos) * Math.sign(pos * (Math.abs(ux) > 1e-3 ? ux : uy));

  const track = (i) => {
    const s0 = (i - mid) * pitch;
    const key = (u, a, order) => {
      const th = a / R; // arc -> angle
      const deg = (th * 180) / Math.PI;
      const pos = R * Math.sin(th);
      return {
        u, order,
        dx: pos * ux,
        dy: pos * uy,
        ...(horiz ? { ry: inv * deg + rotY * sideAt(pos) } : { rx: inv * deg, ry: rotY * sideAt(pos) }),
        ...(tilt || rotZ ? { dr: tilt * tiltW(pos) + rotZ * sideAt(pos) } : {}),
        dz: inv * R * (Math.cos(th) - 1) + liftAt(pos),
        k: Math.abs(th) > 1.45 ? 0.001 : scaleAt(pos), // past edge-on: keep it tiny so it can't reappear
      };
    };
    const wraps = [];
    for (let n = 0; n < steps; n++) {
      const r = (s0 + sgn * (n + 0.5) * pitch - loop / 2) / loop; // a step's midpoint sits on the wrap point
      if (Math.abs(r - Math.round(r)) < 1e-6) wraps.push((n + tHalf) / steps);
    }
    const pts = [];
    wraps.forEach((u) => {
      pts.push(key(u, (sgn * loop) / 2, 0)); // last position before the wrap
      pts.push(key(u, (-sgn * loop) / 2, 1)); // first position after it (hard cut, off-canvas)
    });
    const N = steps * K;
    for (let j = 0; j <= N; j++) {
      const u = j / N;
      if (wraps.some((w) => Math.abs(w - u) < 1e-6)) continue;
      pts.push(key(u, wrap(s0 + spin(u), loop), 0));
    }
    return pts.sort((p, r) => p.u - r.u || p.order - r.order).map(({ order, ...k }) => k);
  };

  const curveRig = surface === "Curved" ? { axis: horiz ? "y" : "x", radius: R, inward } : null;
  const rig = { tx: 0, ty: 0, tz: 0, persp: P, hide: false, curve: curveRig };
  const layout = Array.from({ length: count }, () => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade: fadeAmt, fadeAxis: "x", blurs, fx, rig,
  }));
  return {
    duration,
    poster: +(duration * 0.1).toFixed(2),
    layout,
    shots: [{ name: "Carousel", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Wheel: planes fanned along the top arc of a big vertical wheel (loops) ----------
const wheelParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Left", "Right"], default: d.direction ?? "Left" },
  { key: "stack", label: "Stack", type: "segmented", options: ["Horizontal", "Vertical"], default: d.stack ?? "Horizontal" },
  { key: "count", label: "Count", type: "slider", min: 3, max: 40, default: d.count, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 90, default: d.size, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: 6, group: "Frame" },
  { key: "radius", label: "Wheel Radius", type: "slider", min: 20, max: 300, default: d.radius, group: "Frame" },
  { key: "scrub", label: "Z - Rotation", type: "slider", min: -180, max: 180, default: d.scrub ?? 0, group: "Rotation" },
  { ...FX_PARAM, default: d.fxList ?? [] },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 20, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease),
];

const wheelBuild = ({ direction, stack, count, size, corner, radius, scrub, fxList, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { ky } = axes(aspect);
  const { fade: fadeAmt, blurs, fx } = fxLayout(fxList);
  const h = size / 100;
  const R = (radius / 100) * ky; // wheel radius, same basis as the ring's
  const sgn = direction === "Right" ? 1 : -1;
  const vert = stack === "Vertical";
  const step = 360 / count; // planes sit evenly around the whole wheel
  const steps = cycles * count; // each step turns the wheel by one plane, whole laps = seamless loop
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("linear"));
  const K = clamp(Math.floor(480 / steps), 4, 16); // planes move on a circle, so keys must be dense
  const spin = (u) => {
    const s = u * steps;
    const n = Math.min(steps - 1, Math.floor(s + 1e-9));
    return sgn * (n + easeFn(clamp(s - n, 0, 1))) * step; // every step eases on its own
  };
  const track = (i) => {
    const a0 = scrub + wrap(i * step, 360); // plane 0 starts at the top of the wheel, the rest fan out both sides
    const N = steps * K;
    return Array.from({ length: N + 1 }, (_, j) => {
      const u = j / N;
      const a = a0 + spin(u); // wheel angle in degrees, keeps growing so rotation never wraps
      const th = (a * Math.PI) / 180;
      return {
        u,
        ...(vert
          ? { dx: -R * (1 - Math.cos(th)), dy: -R * Math.sin(th), dr: -a } // wheel on its side: the active plane sits on the right edge of the wheel
          : { dx: R * Math.sin(th), dy: R * (1 - Math.cos(th)), dr: a }), // y grows downward: the sides drop away from the top of the wheel
      };
    });
  };
  const layout = Array.from({ length: count }, () => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade: fadeAmt, fadeAxis: "x", blurs, fx,
  }));
  return {
    duration,
    poster: +(duration * 0.1).toFixed(2),
    layout,
    shots: [{ name: "Wheel", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Grid tour: a grid of big planes, the camera visits pins one at a time (loops) ----------
const GRID_U = 1130; // Gap unit: 80 matches the reference video (gap ~0.07 of canvas height)
const GRID_COLS = 7, GRID_ROWS = 7;
// Pin i = plane i. { c, r } is its cell (0-indexed col/row); t = seconds the camera takes to arrive (blank = even share).
// The camera visits the pins in order and loops back to pin 1.
export const GRID_PINS = [
  { c: 1, r: 2 }, { c: 2, r: 2 }, { c: 3, r: 2 }, { c: 4, r: 2 }, { c: 5, r: 2 },
  { c: 5, r: 3 }, { c: 4, r: 3 }, { c: 3, r: 3 }, { c: 2, r: 3 }, { c: 1, r: 3 },
];
// Exactly `count` pins on distinct cells: keeps the valid ones in order, fills the rest with free cells nearest the center
export const gridFillPins = (pins, count, cols = GRID_COLS, rows = GRID_ROWS) => {
  const used = new Set();
  const out = [];
  (pins ?? []).forEach((p) => {
    const k = `${p.c},${p.r}`;
    if (out.length < count && p.c >= 0 && p.c < cols && p.r >= 0 && p.r < rows && !used.has(k)) { used.add(k); out.push(p); }
  });
  const free = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) free.push({ c, r });
  const d = (p) => Math.hypot(p.c - (cols - 1) / 2, p.r - (rows - 1) / 2);
  free.sort((a, b) => d(a) - d(b) || a.r - b.r || a.c - b.c);
  for (const p of free) {
    if (out.length >= count) break;
    if (!used.has(`${p.c},${p.r}`)) { used.add(`${p.c},${p.r}`); out.push({ ...p }); }
  }
  return out;
};

const gridTourParams = (d) => [
  { key: "zoom", label: "Zoom", type: "segmented", options: ["Off", "On"], default: d.zoom ?? "Off" },
  { key: "count", label: "Count", type: "slider", min: 2, max: GRID_COLS * GRID_ROWS, default: d.count, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 90, default: d.size, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: 0, max: 300, default: d.gap, group: "Frame" },
  { key: "pins", label: "Camera path", type: "campath", cols: GRID_COLS, rows: GRID_ROWS, default: d.pins ?? GRID_PINS },
  FX_PARAM,
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 60, hardMax: 600, default: d.duration, group: "Timing" },
  { key: "delay", label: "Delay (s)", type: "slider", min: 0, max: 10, default: d.delay ?? 0, group: "Timing" },
  easeParam(d.ease ?? "smooth"),
];

const gridTourBuild = ({ zoom, count = 10, size, corner, gap, pins, fxList, cycles, duration, delay, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade: fadeAmt, blurs, fx } = fxLayout(fxList);
  const h = size / 100; // same scale as Carousel and 3D: fraction of canvas height
  const Hs = h * ky, Ws = RATIO * Hs; // plane size in short-side units
  const px = Ws + gap / GRID_U, py = Hs + gap / GRID_U; // cell pitch
  const list = gridFillPins(pins, count);
  const n = list.length;
  // plane i sits on pin i's cell, and that is also where the camera stops for it
  const pts = list.map((p) => [(p.c - (GRID_COLS - 1) / 2) * px, (p.r - (GRID_ROWS - 1) / 2) * py]);
  const [cx0, cy0] = pts[0]; // the camera starts on pin 1, so the layout is centered on it

  // moves: pin j -> pin j+1, then the last pin back to pin 1 (loop). A move's weight is the time given to the pin it arrives at.
  const moves = n < 2
    ? [{ a: pts[0], b: pts[0], w: 1 }]
    : list.map((_, j) => ({ a: pts[j], b: pts[(j + 1) % n], w: Math.max(0.05, list[(j + 1) % n].t ?? 1) }));
  const total = moves.reduce((s, m) => s + m.w, 0);
  const holdU = clamp(delay / duration, 0, 0.9); // Delay: sit on pin 1 first
  const lapU = (1 - holdU) / cycles; // Cycles: the whole tour repeats inside Duration
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("smooth"));
  const K = clamp(Math.floor(240 / (moves.length * cycles)), 4, 14); // samples per move: easing is baked in

  const poses = [{ u: 0, cx: cx0, cy: cy0, z: 1 }];
  if (holdU > 0) poses.push({ u: holdU, cx: cx0, cy: cy0, z: 1 });
  for (let lap = 0; lap < cycles; lap++) {
    let cum = 0;
    moves.forEach((m) => {
      for (let j = 1; j <= K; j++) {
        const t = j / K, e = easeFn(t);
        const ph = (cum + m.w * t) / total; // 0-1 through this lap
        const z = zoom === "On" ? 1 - 0.25 * Math.sin(Math.PI * t) : 1; // Zoom: pull back mid-move, settle on the pin
        poses.push({ u: holdU + lapU * (lap + ph), cx: lerp(m.a[0], m.b[0], e), cy: lerp(m.a[1], m.b[1], e), z });
      }
      cum += m.w;
    });
  }

  // camera model: screen = z * (plane - camera). Offsets are relative to the rest layout, which is centered on pin 1.
  const track = (i) => {
    const [X, Y] = pts[i];
    return poses.map((f) => ({
      u: Math.min(1, f.u),
      dx: f.z * (X - f.cx) - (X - cx0),
      dy: f.z * (Y - f.cy) - (Y - cy0),
      k: f.z,
    }));
  };
  const layout = pts.map(([X, Y]) => ({
    x: (X - cx0) / kx, y: (Y - cy0) / ky, r: RATIO, h, radius: corner, fade: fadeAmt, fadeAxis: "x", blurs, fx,
  }));
  return {
    duration,
    poster: +(duration * 0.1).toFixed(2),
    layout,
    shots: [{ name: "Grid Tour", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Grid columns: columns of planes that loop vertically. Alternating flips every other column ----------
const gridColsParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Up", "Down"], default: d.direction ?? "Up" },
  { key: "alternate", label: "Alternating", type: "segmented", options: ["Off", "On"], default: d.alternate ?? "Off" },
  { key: "columns", label: "Columns", type: "slider", min: 1, max: 6, default: d.columns, group: "Frame" },
  { key: "count", label: "Count", type: "slider", min: 3, max: 60, default: d.count, group: "Frame" }, // total planes, shared across the columns
  { key: "size", label: "Plane Size", type: "slider", min: 10, max: 90, default: d.size, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: 0, max: 100, default: d.gap, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 6, group: "Frame" },
  ...(d.tilt !== undefined ? [{ key: "tilt", label: "Tilt", type: "slider", min: -90, max: 90, default: d.tilt, group: "Frame" }] : []),
  ...(d.zoom ? [{ key: "zoom", label: "Zoom", type: "segmented", options: ["Off", "On"], default: d.zoom, group: "Camera" }] : []),
  { ...FX_PARAM, default: d.fxList ?? [] },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 20, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease),
];

const gridColsBuild = ({ direction, alternate, columns, count, size, gap, corner, tilt = 0, zoom, fxList, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade: fadeAmt, blurs, fx } = fxLayout(fxList);
  let h = size / 100; // same scale as Carousel and 3D: fraction of canvas height
  let Hs = h * ky, Ws = RATIO * Hs; // plane size in short-side units. May grow below to fill the canvas
  const ZOOM_AMT = 0.3; // spacing allowance only, the pitch maths below still uses it
  const CAM_ZOOM = 1; // the camera pushes in by this much on the picked plane (1 = 2x)
  const sn = Math.sin((tilt * Math.PI) / 180), cs = Math.cos((tilt * Math.PI) / 180);
  const half = (Math.abs(kx * sn) + Math.abs(ky * cs)) / 2; // canvas extent along the (tilted) column direction
  // Fill: grow the planes until the columns cover the canvas width (measured across the tilted columns)
  {
    const g = 1 + gap / 100;
    const cross = Math.abs(kx * cs) + Math.abs(ky * sn); // canvas extent across the columns
    const grown = Math.min(cross / (RATIO * g * columns), ky); // capped at the canvas height
    if (grown > Hs) { Hs = grown; Ws = RATIO * Hs; h = Hs / ky; }
  }
  const planeExt = (Math.abs(Ws * sn) + Math.abs(Hs * cs)) * (zoom === "On" ? 1 + ZOOM_AMT : 1); // plane extent along it, with room for a zoomed plane
  // planes per column: Count split across the columns, but never fewer than it takes to cover the canvas without gaps
  const rows = Math.max(1, Math.ceil(count / columns), Math.ceil((2 * half + planeExt + 0.02) / (Hs * (1 + gap / 100))));
  // spacing in a column. It opens up on its own when there are too few planes, so a plane always wraps while fully off canvas
  const pitch = Math.max(0.01, Hs * (1 + gap / 100), (2 * half + planeExt + 0.02) / rows);
  const pitchX = Ws * (1 + gap / 100); // distance between columns
  const loop = rows * pitch; // length of one lap
  const mid = (rows - 1) / 2;
  const base = direction === "Down" ? -1 : 1; // Up = the column travels up
  const steps = cycles * rows; // one plane advance per step, whole laps = seamless loop
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("linear"));
  const K = clamp(Math.floor(480 / steps), 4, 16); // samples per step: easing is baked in
  const spin = (u, sg) => {
    const s = u * steps;
    const n = Math.min(steps - 1, Math.floor(s + 1e-9));
    return sg * (n + easeFn(clamp(s - n, 0, 1))) * pitch; // every step eases on its own
  };
  // the point in a step where the easing is halfway: that is when a plane crosses the wrap point
  let tHalf = 0.5;
  for (let lo = 0, hi = 1, it = 0; it < 30; it++) {
    tHalf = (lo + hi) / 2;
    if (easeFn(tHalf) < 0.5) lo = tHalf;
    else hi = tHalf;
  }

  // Zoom: the camera pushes in on one plane at a time (seeded random order), centers it, holds, then pulls back
  const rows_ = rows;
  const info = (i) => {
    const c = i % columns, j = Math.floor(i / columns);
    const sg = alternate === "On" && c % 2 ? -base : base;
    return { c, sg, s0: (j - (rows_ - 1) / 2) * pitch, X: (c - (columns - 1) / 2) * pitchX };
  };
  const posAt = (i, u) => {
    const { s0, sg } = info(i);
    return wrap(s0 + spin(u, sg), loop);
  };
  const slotCount = zoom === "On" ? cycles * columns * rows : 0;
  const picks = [];
  {
    let seed = 20240607;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const all = Array.from({ length: columns * rows }, (_, i) => i);
    for (let s = 0; s < slotCount; s++) {
      const um = (s + 0.5) / slotCount;
      // only planes near the middle, so centering them never exposes a plane wrapping on screen
      const seen = all.filter((i) => i !== picks[s - 1] && Math.abs(posAt(i, um)) < half * 0.5);
      const pool = seen.length ? seen : all;
      picks.push(pool[Math.floor(rnd() * pool.length)]);
    }
  }
  const sm = (x) => { const f = clamp(x, 0, 1); return f * f * (3 - 2 * f); };
  // camera at time u: zoom z, blend w (0 = rest, 1 = picked plane centered), and the picked plane's screen position
  const camAt = (u) => {
    if (!slotCount) return { z: 1, w: 0, px: 0, py: 0 };
    const s = Math.min(slotCount - 1, Math.floor(u * slotCount));
    const t = u * slotCount - s;
    const w = Math.min(sm(t / 0.3), sm((1 - t) / 0.3)); // ease in, hold, ease out
    const p = info(picks[s]);
    const a = posAt(picks[s], u);
    return { z: 1 + CAM_ZOOM * w, w, px: p.X * cs + a * sn, py: p.X * sn - a * cs };
  };

  const track = (i) => {
    const { sg, s0, X } = info(i);
    const key = (u, a, order) => {
      const { z, w, px, py } = camAt(u);
      const rx = X * cs, ry = X * sn; // the column's rest position
      return {
        u, order,
        dx: z * (rx + a * sn - w * px) - rx, // screen = z * (plane - camera), camera glides onto the picked plane
        dy: z * (ry - a * cs - w * py) - ry,
        ...(tilt ? { dr: tilt } : {}),
        ...(z !== 1 ? { k: z } : {}),
      };
    };
    const wraps = [];
    for (let n = 0; n < steps; n++) {
      const r = (s0 + sg * (n + 0.5) * pitch - loop / 2) / loop; // a step's midpoint sits on the wrap point
      if (Math.abs(r - Math.round(r)) < 1e-6) wraps.push((n + tHalf) / steps);
    }
    const onWrap = (u) => wraps.some((w) => Math.abs(w - u) < 1e-6);
    const pts = [];
    wraps.forEach((u) => {
      pts.push(key(u, (sg * loop) / 2, 0)); // last position before the wrap
      pts.push(key(u, (-sg * loop) / 2, 1)); // first position after it (hard cut, off canvas)
    });
    const N = steps * K;
    for (let q = 0; q <= N; q++) {
      const u = q / N;
      if (onWrap(u)) continue;
      pts.push(key(u, wrap(s0 + spin(u, sg), loop), 0));
    }
    // every plane moves with the camera, so every plane gets dense keys across each zoom slot
    for (let s = 0; s < slotCount; s++) {
      for (let q = 0; q <= 12; q++) {
        const u = (s + q / 12) / slotCount;
        if (onWrap(u)) continue;
        pts.push(key(u, wrap(s0 + spin(u, sg), loop), 0));
      }
    }
    return pts.sort((p, r) => p.u - r.u || p.order - r.order).map(({ order, ...k }) => k);
  };

  const layout = Array.from({ length: columns * rows }, (_, i) => ({
    x: ((((i % columns) - (columns - 1) / 2) * pitchX) * cs) / kx,
    y: ((((i % columns) - (columns - 1) / 2) * pitchX) * sn) / ky,
    r: RATIO, h, radius: corner, fade: fadeAmt, fadeAxis: "y", blurs, fx,
  }));
  return {
    duration,
    poster: +(duration * 0.1).toFixed(2),
    layout,
    shots: [{ name: "Grid Columns", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Grid rows: rows of planes that loop horizontally, with X rotation and perspective ----------
const gridRowsParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Left", "Right"], default: d.direction ?? "Left" },
  { key: "alternate", label: "Alternating", type: "segmented", options: ["Off", "On"], default: d.alternate ?? "Off" },
  { key: "rows", label: "Rows", type: "slider", min: 1, max: 6, default: d.rows, group: "Frame" },
  { key: "count", label: "Count", type: "slider", min: 3, max: 60, default: d.count, group: "Frame" }, // total planes, shared across the rows
  { key: "size", label: "Plane Size", type: "slider", min: 10, max: 90, default: d.size, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: 0, max: 100, default: d.gap, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 6, group: "Frame" },
  { key: "tiltX", label: "X - Rotation", type: "slider", min: -80, max: 80, default: d.tiltX ?? 0, group: "Frame" },
  { key: "perspective", label: "Perspective", type: "slider", min: 0, max: 100, default: d.perspective ?? 0, group: "Camera" },
  { ...FX_PARAM, default: d.fxList ?? [] },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 20, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease),
];

const gridRowsBuild = ({ direction, alternate, rows, count, size, gap, corner, tiltX = 0, perspective = 0, fxList, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade: fadeAmt, blurs, fx } = fxLayout(fxList);
  const g = 1 + gap / 100;
  const rad = (tiltX * Math.PI) / 180;
  let h = size / 100;
  let Hs = h * ky, Ws = RATIO * Hs; // plane size in short-side units
  // Fill: grow the planes until the rows cover the canvas height (tilt squashes the rows, so it needs a bit more)
  {
    const colsN = Math.max(1, Math.ceil(count / rows));
    const byHeight = ky / Math.max(0.35, Math.cos(rad)) / (g * rows);
    const byWidth = (kx + 0.02) / (RATIO * (g * colsN - 1)); // so a row of this many planes spans the canvas
    const grown = Math.min(Math.max(byHeight, byWidth), ky);
    if (grown > Hs) { Hs = grown; Ws = RATIO * Hs; h = Hs / ky; }
  }
  const Rt = RX(tiltX);
  const P = lerp(40, 1.4, perspective / 100); // camera distance: 0 = nearly flat, 100 = close
  const rowsExtent = (rows * Hs * g) / 2 + Hs; // how far the rows reach from the center, vertically
  const minScale = P / (P + rowsExtent * Math.abs(Math.sin(rad))); // the far rows shrink toward the center by this much
  const half = kx / 2;
  const pitchX = Ws * g; // distance between neighbours in a row
  const pitchY = Hs * g; // distance between rows
  // planes per row: Count split across the rows, never fewer than it takes to wrap while fully off canvas
  const cols = Math.max(1, Math.ceil(count / rows)); // Count is the exact total
  const loop = cols * pitchX; // length of one lap
  const base = direction === "Right" ? 1 : -1;
  const steps = cycles * cols; // one plane advance per step, whole laps = seamless loop
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("linear"));
  const K = clamp(Math.floor(480 / steps), 4, 16);
  const spin = (u, sg) => {
    const s = u * steps;
    const n = Math.min(steps - 1, Math.floor(s + 1e-9));
    return sg * (n + easeFn(clamp(s - n, 0, 1))) * pitchX; // every step eases on its own
  };
  // the point in a step where the easing is halfway: that is when a plane crosses the wrap point
  let tHalf = 0.5;
  for (let lo = 0, hi = 1, it = 0; it < 30; it++) {
    tHalf = (lo + hi) / 2;
    if (easeFn(tHalf) < 0.5) lo = tHalf;
    else hi = tHalf;
  }
  const info = (i) => {
    const r = i % rows, j = Math.floor(i / rows);
    const sg = alternate === "On" && r % 2 ? -base : base;
    return { sg, s0: (j - (cols - 1) / 2) * pitchX, Y: (r - (rows - 1) / 2) * pitchY };
  };

  const track = (i) => {
    const { sg, s0, Y } = info(i);
    const key = (u, a, order) => {
      // positions are absolute and rotated here, like the 3D ring (the layout rests at the center)
      const local = [a, Y, 0];
      const pt = [0, 1, 2].map((r) => Rt[r][0] * local[0] + Rt[r][1] * local[1] + Rt[r][2] * local[2]);
      const behind = pt[2] > 0.9 * P; // at or past the camera: hide
      return { u, order, dx: pt[0], dy: pt[1], dz: pt[2], ...(behind ? { k: 0.001 } : {}) };
    };
    const wraps = [];
    for (let n = 0; n < steps; n++) {
      const r = (s0 + sg * (n + 0.5) * pitchX - loop / 2) / loop; // a step's midpoint sits on the wrap point
      if (Math.abs(r - Math.round(r)) < 1e-6) wraps.push((n + tHalf) / steps);
    }
    const pts = [];
    wraps.forEach((u) => {
      pts.push(key(u, (sg * loop) / 2, 0)); // last position before the wrap
      pts.push(key(u, (-sg * loop) / 2, 1)); // first position after it (hard cut, off canvas)
    });
    const N = steps * K;
    for (let q = 0; q <= N; q++) {
      const u = q / N;
      if (wraps.some((w) => Math.abs(w - u) < 1e-6)) continue;
      pts.push(key(u, wrap(s0 + spin(u, sg), loop), 0));
    }
    return pts.sort((p, r) => p.u - r.u || p.order - r.order).map(({ order, ...k }) => k);
  };

  const rig = { tx: tiltX, ty: 0, tz: 0, persp: P, hide: false, curve: null };
  const layout = Array.from({ length: rows * cols }, () => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade: fadeAmt, fadeAxis: "x", blurs, fx, rig,
  }));
  return {
    duration,
    poster: +(duration * 0.1).toFixed(2),
    layout,
    shots: [{ name: "Grid Rows", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Grid zoom: a grid that fits the canvas, the camera zooms into one plane at a time until it fills the canvas ----------
const gridZoomParams = (d) => [
  { key: "columns", label: "Columns", type: "slider", min: 1, max: 6, default: d.columns, group: "Frame" },
  { key: "rows", label: "Rows", type: "slider", min: 1, max: 6, default: d.rows, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: 0, max: 30, default: d.gap ?? 4, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 6, group: "Frame" },
  { key: "padding", label: "Padding", type: "slider", min: 0, max: 40, default: d.padding ?? 12, group: "Frame" },
  { key: "order", label: "Order", type: "segmented", options: ["Random", "Sequential"], default: d.order ?? "Random", group: "Camera" },
  { key: "fill", label: "Zoom Fill", type: "slider", min: 50, max: 100, default: d.fill ?? 100, group: "Camera" },
  { key: "hold", label: "Hold (%)", type: "slider", min: 0, max: 70, default: d.hold ?? 35, group: "Camera" },
  FX_PARAM,
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 60, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease ?? "smooth"),
];

const gridZoomBuild = ({ columns, rows, gap, corner, padding, order, fill, hold, fxList, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade: fadeAmt, blurs, fx } = fxLayout(fxList);
  // everything is in short-side units (the canvas's shorter side = 1), so padding and gap look the same at any canvas size
  const pad = padding / 100, gapU = gap / 100;
  const cellW = (kx - 2 * pad - (columns - 1) * gapU) / columns;
  const cellH = (ky - 2 * pad - (rows - 1) * gapU) / rows;
  const n = columns * rows;
  const pts = Array.from({ length: n }, (_, i) => [
    ((i % columns) - (columns - 1) / 2) * (cellW + gapU),
    (Math.floor(i / columns) - (rows - 1) / 2) * (cellH + gapU),
  ]);
  const fullW = (fill / 100) * (kx - 2 * pad), fullH = (fill / 100) * (ky - 2 * pad); // the picked plane ends up this size: the canvas minus the padding

  // visiting order: one slot per plane per cycle, never the same plane twice in a row
  const slots = cycles * n;
  const picks = [];
  {
    let seed = 20240611;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let c = 0; c < cycles; c++) {
      const lap = Array.from({ length: n }, (_, i) => i);
      if (order === "Random") {
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lap[i], lap[j]] = [lap[j], lap[i]]; }
        if (n > 1 && lap[0] === picks[picks.length - 1]) [lap[0], lap[1]] = [lap[1], lap[0]];
      }
      picks.push(...lap);
    }
  }

  // inside one slot: rest on the full grid, zoom in, hold on the plane, zoom out, rest
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("smooth"));
  const holdF = (clamp(hold, 0, 70)) / 100;
  const REST = 0.15; // share of a slot spent on the full grid, split between its start and end
  const a = REST / 2, m = (1 - REST - holdF) / 2;
  const ampAt = (t) => {
    if (t < a) return 0;
    if (t < a + m) return easeFn((t - a) / m);
    if (t < a + m + holdF) return 1;
    if (t < a + 2 * m + holdF) return 1 - easeFn((t - a - m - holdF) / m);
    return 0;
  };
  const camAt = (u) => {
    const s = Math.min(slots - 1, Math.floor(u * slots));
    const e = ampAt(u * slots - s); // 0 = at rest in the grid, 1 = centered and filling the canvas
    return { pick: picks[s], e, kw: lerp(1, fullW / cellW, e), kh: lerp(1, fullH / cellH, e) };
  };

  // only the picked plane moves: from its cell to the canvas center, growing to fill. Every other plane stays put
  const Q = 28; // keys per slot: easing is baked in
  const track = (i) => {
    const [X, Y] = pts[i];
    const out = [];
    for (let s = 0; s < slots; s++) {
      for (let q = s === 0 ? 0 : 1; q <= Q; q++) {
        const u = Math.min(1, (s + q / Q) / slots);
        const { pick, e, kw, kh } = camAt(u === 1 ? 1 - 1e-9 : u);
        out.push(pick === i ? { u, dx: -X * e, dy: -Y * e, dz: 0.05 * e, kw, kh } : { u, dx: 0, dy: 0, dz: 0 });
      }
    }
    return out;
  };
  const layout = pts.map(([X, Y]) => ({
    x: X / kx, y: Y / ky, r: cellW / cellH, h: cellH / ky, radius: corner, fade: fadeAmt, fadeAxis: "x", blurs, fx,
    rig: { tx: 0, ty: 0, tz: 0, persp: 50, hide: false, curve: null }, // flat rig: only here so the picked plane sorts above the others
  }));
  return {
    duration,
    poster: 0,
    layout,
    shots: [{ name: "Grid Zoom", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Grid pulse: the Grid Reveal layout, each frame keeps shrinking and growing back in turn (loops) ----------
const gridPulseParams = (d) => [
  { key: "cols", label: "Columns", type: "slider", min: 1, max: 6, default: d.cols, group: "Frame" },
  { key: "rows", label: "Rows", type: "slider", min: 1, max: 6, default: d.rows, group: "Frame" },
  { key: "size", label: "Size", type: "slider", min: 30, max: 95, default: d.size ?? 80, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: 0, max: 30, default: d.gap ?? 6, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 6, group: "Frame" },
  { key: "order", label: "Order", type: "segmented", options: ["Diagonal", "Row", "Column", "Random"], default: d.order ?? "Random" },
  { key: "shrink", label: "Shrink", type: "slider", min: 0, max: 100, default: d.shrink ?? 95 },
  { key: "grow", label: "Grow", type: "slider", min: 0, max: 60, default: d.grow ?? 20 },
  { key: "pulse", label: "Pulse length", type: "slider", min: 20, max: 100, default: d.pulse ?? 50 },
  FX_PARAM,
  { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: d.stagger ?? 100, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 6, default: d.cycles ?? 2, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 30, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease ?? "smooth"),
];

const gridPulseBuild = ({ cols, rows, size, gap, corner, order, shrink, grow, pulse, fxList, stagger, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
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
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("smooth"));
  const kMin = clamp(1 - shrink / 100, 0.02, 1); // the smallest a frame gets
  const kMax = 1 + grow / 100; // how far past its cell it grows before settling
  const span = clamp(pulse / 100, 0.2, 1); // share of a cycle one frame spends pulsing
  const rankOf = (i) => {
    const r = Math.floor(i / cols), c = i % cols;
    if (order === "Row") return n > 1 ? i / (n - 1) : 0;
    if (order === "Column") return n > 1 ? (c * rows + r) / (n - 1) : 0;
    if (order === "Random") { const v = Math.sin((i + 1) * 12.9898) * 43758.5453; return v - Math.floor(v); }
    return rows + cols > 2 ? (r + c) / (rows + cols - 2) : 0; // Diagonal
  };
  // one pulse, p = 0-1: shrink away, grow past the cell, settle. It starts and ends at rest, so the loop is seamless
  const pulseK = (p) => {
    if (p < 0.35) return lerp(1, kMin, easeFn(p / 0.35));
    if (p < 0.75) return lerp(kMin, kMax, easeFn((p - 0.35) / 0.4));
    return lerp(kMax, 1, easeFn((p - 0.75) / 0.25));
  };
  const N = cycles * 60; // samples: the easing is baked in
  const track = (i) => {
    const off = rankOf(i) * (stagger / 100) * ((n - 1) / n); // where in the cycle this frame starts
    return Array.from({ length: N + 1 }, (_, j) => {
      const u = j / N;
      const c = (u * cycles) % 1 || (j === N ? 1 : 0);
      const ph = (((c - off) % 1) + 1) % 1; // time since this frame's pulse started, wrapping
      return { u, k: ph < span ? pulseK(ph / span) : 1 };
    });
  };
  return {
    duration,
    poster: +(duration * 0.15).toFixed(2),
    layout,
    shots: [{ name: "Grid Pulse", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Ring: frames orbit a circle and always face the camera. Rotation tilts the orbit in 3D ----------
const ringParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Left", "Right"], default: d.direction ?? "Left" },
  ...(d.rings ? [{ key: "alternate", label: "Alternating", type: "segmented", options: ["Off", "On"], default: d.alternate ?? "Off" }] : []),
  ...(d.rings || d.facing ? [{ key: "facing", label: "Facing", type: "segmented", options: ["Camera", "Center"], default: d.facing ?? "Camera" }] : []),
  { key: "count", label: "Count", type: "slider", min: 3, max: 24, default: d.count, group: "Frame" },
  ...(d.rings ? [{ key: "rings", label: "Rings", type: "slider", min: 1, max: 6, default: d.rings, group: "Frame" }] : []),
  { key: "size", label: "Plane Size", type: "slider", min: 5, max: 80, default: d.size, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "radius", label: d.radiusLabel ?? (d.rings ? "Ring Size" : "Circumference"), type: "slider", min: d.radiusMin ?? 5, max: d.radiusMax ?? 100, default: d.radius, group: "Frame" },
  ...(d.rings ? [{ key: "depth", label: "Depth", type: "slider", min: 0, max: 100, default: d.depth ?? 45, group: "Frame" }] : []),
  { key: "tiltX", label: "X - Rotation", type: "slider", min: -180, max: 180, default: d.tiltX ?? 0, group: "Rotation" },
  { key: "tiltY", label: "Y - Rotation", type: "slider", min: -180, max: 180, default: d.tiltY ?? 0, group: "Rotation" },
  { key: "tiltZ", label: "Z - Rotation", type: "slider", min: -180, max: 180, default: d.tiltZ ?? 0, group: "Rotation" },
  { key: "perspective", label: "Perspective", type: "slider", min: 0, max: 100, default: d.perspective ?? 60, group: "Camera" },
  { key: "offsetX", label: "Offset X", type: "slider", min: -50, max: 50, default: d.offsetX ?? 0, group: "Camera" },
  { key: "offsetY", label: "Offset Y", type: "slider", min: -50, max: 50, default: d.offsetY ?? 0, group: "Camera" },
  { key: "dim", label: "Dim", type: "slider", min: 0, max: 100, default: d.dim ?? 0, group: "Frame" },
  { ...FX_PARAM, default: d.fxList ?? [{ id: 1, type: "fade", on: true, fade: 40 }] },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: d.cycles ?? 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 30, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease),
];

const ringBuild = ({ direction, alternate, facing, count, rings = 1, depth = 0, size, corner, radius, tiltX, tiltY, tiltZ, perspective, offsetX, offsetY, dim = 0, fxList, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade, blurs, fx } = fxLayout(fxList);
  // Plane Size and Orbit Radius are in 1/1000 of the canvas's short side, so they mean the same on any canvas
  const Hs = size / 100;
  const h = Hs / ky;
  const R = radius / 100;
  const P = R * lerp(12, 2.2, perspective / 100); // camera distance: 0 = nearly flat, 100 = strong depth
  const Rt = mulMat(mulMat(RX(tiltX), RY(tiltY)), RZ(tiltZ));
  // the orbit lies in the local x/y plane: whichever screen axis it spreads over more is the one to fade along
  const spreadX = Math.hypot(Rt[0][0], Rt[0][1]);
  const spreadY = Math.hypot(Rt[1][0], Rt[1][1]);
  const fadeAxis = spreadY > spreadX + 1e-6 ? "y" : "x";
  const sgn = direction === "Right" ? -1 : 1;
  const eu = cycleEase(vidEaseFn(ease ?? vidEaseSpec("linear")), cycles * count); // one ease per plane step
  const N = cycles * count * 12; // whole revolutions, with enough samples inside each step

  const D = depth / 100; // distance between rings, same units as the other sizes
  // single flat wheel facing the center: the frame nearest the top of the screen sits in front of its neighbours
  const topLift = rings === 1 && facing === "Center" ? 0.05 * R : 0;
  const track = (i) => {
    const ring = Math.floor(i / count), slot = i % count;
    const shade = rings > 1 ? 0.6 * (ring / (rings - 1)) : 0; // rings further back blend further into the background
    const spinDir = alternate === "On" && ring % 2 ? -sgn : sgn; // Alternating: every other ring turns the other way
    return Array.from({ length: N + 1 }, (_, j) => {
      const u = j / N;
      // plane 0 starts at the front when the orbit is tipped 90 degrees. Odd rings sit half a step off, so frames don't line up behind each other
      const th = Math.PI / 2 + (2 * Math.PI * (slot + (ring % 2) * 0.5)) / count + spinDir * 2 * Math.PI * cycles * eu(u);
      const local = [R * Math.cos(th), R * Math.sin(th), -ring * D]; // each ring sits further down the axis
      const pt = [0, 1, 2].map((r) => Rt[r][0] * local[0] + Rt[r][1] * local[1] + Rt[r][2] * local[2]);
      const behind = pt[2] > 0.9 * P; // at or past the camera
      // Dim: the further a frame sits from the screen center, the darker it gets (smoothstep, max 70%)
      const dt = clamp(Math.hypot(pt[0], pt[1]) / R, 0, 1);
      const dimmed = 0.7 * (dim / 100) * dt * dt * (3 - 2 * dt);
      const sh = Math.min(0.9, shade + dimmed);
      return {
        u,
        dx: pt[0] + (offsetX / 100) * kx,
        dy: pt[1] + (offsetY / 100) * ky,
        dz: pt[2] + topLift * (-pt[1] / R),
        // Center: the frame's bottom edge points at the middle of its ring, so it rolls round with the orbit
        ...(facing === "Center" ? { dr: (th * 180) / Math.PI + 90 + tiltZ } : {}),
        ...(sh ? { sh } : {}),
        ...(behind ? { k: 0.001 } : {}),
      };
    });
  };

  // a flat rig: it only supplies the camera distance, so the frames get depth and sort front to back, but never tilt
  const rig = { tx: 0, ty: 0, tz: 0, persp: P, hide: false, curve: null };
  const layout = Array.from({ length: count * rings }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade, fadeAxis, blurs, fx, rig,
    asset: i % count, // every ring reuses the same Count assets
    tint: "bg", // depth shade blends toward the background color instead of black
  }));
  return {
    duration,
    poster: +(duration * 0.15).toFixed(2),
    layout,
    shots: [{ name: "Ring", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Animation tab (planes on the Frame canvas) ----------
export const PARAM_FRAME_TEMPLATES = [
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
      { key: "ease", label: "Easing", type: "ease", default: vidEaseSpec("expo-out"), section: "motion" },
    ],
    build: ({ count, height, gap, from, spin, fxList, stagger, duration, ease }, ctx) => {
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
          stagger: { dur: 1, step: (stagger / 100) * 0.6, ease, from: () => ({ dx: side * kx, dr: side * spin }) },
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
      { key: "ease", label: "Easing", type: "ease", default: vidEaseSpec("expo-out"), section: "motion" },
    ],
    build: ({ count, height, gap, spread, exit, fxList, stagger, duration, ease }, ctx) => {
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
            dur: Math.min(1, duration / 4), step: (stagger / 100) * 0.6, ease, outEase: vidEaseSpec("cubic-in"),
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
      { key: "ease", label: "Easing", type: "ease", default: vidEaseSpec("expo-out"), section: "motion" },
    ],
    build: ({ count, height, gap, direction, distance, exit, fxList, stagger, duration, ease }, ctx) => {
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
            dur: Math.min(1, duration / 4), step: (stagger / 100) * 0.6, ease, outEase: vidEaseSpec("cubic-in"),
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
    noAspectFit: true,
    label: "01",
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
      { key: "ease", label: "Easing", type: "ease", default: vidEaseSpec("linear"), section: "motion" },
    ],
    build: ({ count, size, gap, amplitude, phase, tilt, fxList, cycles, duration, ease }, ctx) => {
      const aspect = ctx.aspect ?? 1;
      const { ky } = axes(aspect);
      const { fade, blurs, fx } = fxLayout(fxList);
      const layout = rowLayout(count, size / 100, gap, aspect, { fade, fadeAxis: "x", blurs, fx });
      const step = (phase / 100) * (Math.PI / 2); // phase lag between neighbours
      const N = cycles * 24; // whole cycles, so the last key matches the first and the loop is seamless
      const eu = cycleEase(vidEaseFn(ease ?? vidEaseSpec("linear")), cycles);
      const track = (i) => {
        const s0 = Math.sin(-i * step), c0 = Math.cos(-i * step);
        return Array.from({ length: N + 1 }, (_, j) => {
          const u = j / N;
          const a = 2 * Math.PI * cycles * eu(u) - i * step;
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

  // ---- Ring 01: frames orbit a circle, always facing the camera ----
  make({
    id: "p-ring",
    label: "01",
    category: "Ring",
    noAspectFit: true,
    tags: "ring circle orbit carousel revolve loop depth perspective",
    params: ringParams({ count: 7, size: 23, radius: 35, tiltX: 0, tiltY: 0, tiltZ: 0, perspective: 100, duration: 8 }),
    build: ringBuild,
  }),
  make({
    id: "p-ring-02",
    label: "02",
    category: "Ring",
    noAspectFit: true,
    tags: "ring circle orbit carousel tilted diagonal loop depth perspective",
    params: ringParams({ count: 7, size: 23, radius: 40, tiltX: 45, tiltY: -45, tiltZ: 0, perspective: 100, duration: 8 }),
    build: ringBuild,
  }),
  make({
    id: "p-ring-03",
    label: "03",
    category: "Ring",
    noAspectFit: true,
    tags: "ring circle orbit carousel edge on tilted loop depth perspective",
    params: ringParams({ count: 7, size: 23, radius: 40, tiltX: 90, tiltY: -45, tiltZ: 0, perspective: 100, duration: 8 }),
    build: ringBuild,
  }),
    make({
    id: "p-ring-04",
    label: "04",
    category: "Ring",
    noAspectFit: true,
    tags: "ring tunnel rings depth concentric orbit carousel loop perspective",
    params: ringParams({ rings: 3, count: 12, size: 14, radius: 43, depth: 45, tiltX: 0, tiltY: 0, tiltZ: 0, perspective: 100, duration: 12 }),
    build: ringBuild,
  }),
    make({
    id: "p-ring-05",
    label: "05",
    category: "Ring",
    noAspectFit: true,
    tags: "ring tunnel rings depth concentric orbit facing center radial roll loop perspective",
    params: ringParams({ rings: 3, count: 12, size: 14, radius: 43, depth: 45, facing: "Center", tiltX: 0, tiltY: 0, tiltZ: 0, perspective: 100, duration: 12 }),
    build: ringBuild,
  }),
    make({
    id: "p-ring-06",
    label: "06",
    category: "Ring",
    noAspectFit: true,
    tags: "ring circle orbit carousel edge on loop depth perspective",
    params: ringParams({ count: 12, size: 29, radius: 30, tiltX: 90, tiltY: 0, tiltZ: 0, perspective: 100, duration: 8 }),
    build: ringBuild,
  }),
  make({
    id: "p-ring-07",
    label: "07",
    category: "Ring",
    noAspectFit: true,
    tags: "ring circle orbit carousel edge on glide loop depth perspective",
    params: ringParams({ count: 12, size: 29, radius: 30, tiltX: 90, tiltY: 90, tiltZ: 0, perspective: 100, duration: 12, ease: "glide" }),
    build: ringBuild,
  }),
  make({
    id: "p-ring-08",
    label: "08",
    category: "Ring",
    noAspectFit: true,
    tags: "ring circle orbit carousel edge on rotated fade glide loop depth perspective",
    params: ringParams({
      count: 12, size: 30, radius: 30, tiltX: 90, tiltY: 0, tiltZ: 0, perspective: 100, duration: 8, ease: "glide",
    }),
    build: ringBuild,
  }),
    make({
    id: "p-ring-09",
    label: "09",
    category: "Ring",
    noAspectFit: true,
    tags: "ring circle orbit carousel edge on rotated fade glide wide loop depth perspective",
    params: ringParams({
      count: 12, size: 30, radius: 50, tiltX: 90, tiltY: 0, tiltZ: 0, perspective: 100, duration: 8, ease: "glide",
    }),
    build: ringBuild,
  }),
  make({
    id: "p-ring-10",
    label: "10",
    category: "Ring",
    noAspectFit: true,
    tags: "ring wheel circle orbit flat facing center rotate roll loop",
    params: ringParams({
      count: 8, size: 30, corner: 4, radius: 35, radiusLabel: "Wheel Radius", radiusMin: 20, radiusMax: 300,
      facing: "Center", tiltX: 0, tiltY: 0, tiltZ: 0, perspective: 0, duration: 10, ease: "linear",
      fxList: [],
    }),
    build: ringBuild,
  }),
    make({
    id: "p-ring-11",
    label: "11",
    category: "Ring",
    noAspectFit: true,
    tags: "ring wheel circle orbit flat facing center rotate roll loop",
    params: ringParams({
      count: 8, size: 30, corner: 4, radius: 25, radiusLabel: "Wheel Radius", radiusMin: 20, radiusMax: 300,
      facing: "Center", tiltX: 0, tiltY: 0, tiltZ: 0, perspective: 0, duration: 13, ease: "linear",
      fxList: [],
    }),
    build: ringBuild,
  }),
    make({
    id: "p-ring-12",
    label: "12",
    category: "Ring",
    noAspectFit: true,
    tags: "ring circle orbit carousel tilted loop depth perspective",
    params: ringParams({ count: 7, size: 23, radius: 40, tiltX: 70, tiltY: 0, tiltZ: 0, perspective: 100, duration: 8 }),
    build: ringBuild,
  }),

  make({
    id: "p-3d-01",
    label: "01",
    category: "3D",
    tags: "3d ring carousel orbit rolodex small planes",
    params: ring3dParams({ backface: "Show", count: 8, size: 26, radius: 0, perspective: 60, duration: 8, ease: "linear", hold: 0 }),
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
  make({
    id: "p-carousel-01",
    label: "01",
    category: "Carousel",
    tags: "carousel curved strip marquee glass loop slide",
    params: carouselParams({
      count: 7,
      size: 48, gap: 8, curve: 45, perspective: 100, duration: 12, ease: "linear",
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-02",
    label: "02",
    category: "Carousel",
    tags: "carousel wheel fan arc ferris rotate loop",
    params: wheelParams({ count: 12, size: 60, radius: 100, duration: 12, ease: "linear" }),
    build: wheelBuild,
  }),
  make({
    id: "p-carousel-03",
    label: "03",
    category: "Carousel",
    tags: "carousel flat straight vertical glide strip loop slide",
    params: carouselParams({
      direction: "Right", stack: "Vertical", surface: "Flat", count: 9,
      size: 44, gap: 8, curve: 0, perspective: 0, duration: 10, ease: "glide",
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-04",
    label: "04",
    category: "Carousel",
    tags: "carousel inward concave bowed strip glass loop slide",
    params: carouselParams({
      count: 9,
      size: 48, gap: 8, curve: 100, perspective: -100, duration: 12, ease: "linear",
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-05",
    label: "05",
    category: "Carousel",
    tags: "carousel large planes step slide expo glass loop",
    params: carouselParams({
      count: 9,
      size: 70, gap: 3, curve: 60, perspective: 140, duration: 16, ease: "expo-out",
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-06",
    label: "06",
    category: "Carousel",
    tags: "carousel flat straight vertical glide scale center focus loop slide",
    params: carouselParams({
      direction: "Right", stack: "Vertical", surface: "Flat", count: 5,
      size: 44, gap: 16, curve: 0, perspective: 0, duration: 12, ease: "glide",
      scaleCenter: "On", scaleFocus: "Center", scaleAmount: 10,
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-07",
    label: "07",
    category: "Carousel",
    tags: "carousel flat straight horizontal linear marquee loop slide",
    params: carouselParams({
      direction: "Left", stack: "Horizontal", surface: "Flat", count: 9,
      size: 44, gap: 8, curve: 0, perspective: 0, duration: 12, ease: "linear",
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-08",
    label: "08",
    category: "Carousel",
    tags: "carousel large planes straight flat step slide expo loop",
    params: carouselParams({
      count: 9,
      size: 70, gap: 3, curve: 0, perspective: 0, duration: 16, ease: "expo-out",
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-09",
    label: "09",
    category: "Carousel",
    tags: "carousel large planes diagonal angle tilt flat step slide expo loop",
    params: carouselParams({
      count: 9,
      size: 50, gap: 3, curve: 0, perspective: 0, duration: 16, ease: "expo-out",
      angle: 30, tilt: 10, rotZ: 8, rotY: 0,
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-10",
    label: "10",
    category: "Carousel",
    tags: "carousel large planes straight flat solo one at a time step slide expo loop",
    params: carouselParams({
      count: 9, solo: "On",
      size: 70, gap: 3, curve: 0, perspective: 0, duration: 16, ease: "expo-out",
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-11",
    label: "11",
    category: "Carousel",
    tags: "carousel large planes straight flat solo one at a time scale center focus step slide expo loop",
    params: carouselParams({
      count: 9, solo: "On",
      size: 70, gap: 3, curve: 0, perspective: 0, duration: 16, ease: "expo-out",
      scaleCenter: "On", scaleFocus: "Center", scaleAmount: 10,
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-12",
    label: "12",
    category: "Carousel",
    tags: "carousel large planes diagonal angle flipped flat step slide expo loop",
    params: carouselParams({
      count: 9,
      size: 50, gap: 3, curve: 0, perspective: 0, duration: 16, ease: "expo-out",
      angle: -30, tilt: 0, rotZ: 0, rotY: 0,
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-13",
    label: "13",
    category: "Carousel",
    tags: "carousel large planes angle tilt rotation flat level step slide expo loop",
    params: carouselParams({
      count: 9,
      size: 70, gap: 3, curve: 0, perspective: 0, duration: 16, ease: "expo-out",
      angle: 0, tilt: 10, rotZ: 8, rotY: 0,
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-14",
    label: "14",
    category: "Carousel",
    tags: "carousel flat straight horizontal glide scale end focus loop slide",
    params: carouselParams({
      direction: "Right", stack: "Vertical", surface: "Flat", count: 9,
      size: 44, gap: 25, curve: 0, perspective: 0, duration: 12, ease: "glide",
      scaleCenter: "On", scaleFocus: "End", scaleAmount: 20,
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-grid-tour-01",
    label: "02",
    category: "Grid",
    tags: "grid tour camera pins path one at a time pan focus loop",
    params: gridTourParams({ count: 10, size: 83, gap: 80, duration: 17.6, ease: "smooth" }),
    build: gridTourBuild,
  }),
  make({
    id: "p-grid-tour-03",
    label: "03",
    category: "Grid",
    tags: "grid tour camera pins path one at a time pan focus loop zoom ring",
    params: gridTourParams({
      count: 9, size: 83, gap: 80, duration: 17.6, ease: "smooth", zoom: "On",
      pins: [
        { c: 3, r: 3 }, { c: 0, r: 3 }, { c: 0, r: 0 }, { c: 3, r: 0 }, { c: 6, r: 0 },
        { c: 6, r: 3 }, { c: 6, r: 6 }, { c: 3, r: 6 }, { c: 0, r: 6 },
      ],
    }),
    build: gridTourBuild,
  }),
  make({
    id: "p-grid-columns-04",
    label: "04",
    category: "Grid",
    tags: "grid columns vertical marquee alternating loop scroll",
    params: gridColsParams({ direction: "Up", alternate: "On", columns: 3, count: 12, size: 20, gap: 10, duration: 12, ease: "linear" }),
    build: gridColsBuild,
  }),
    make({
    id: "p-grid-columns-05",
    label: "05",
    category: "Grid",
    tags: "grid columns vertical tilt rotated zoom alternating loop scroll",
    params: gridColsParams({ direction: "Up", alternate: "On", columns: 3, count: 12, size: 36, gap: 10, tilt: -15, zoom: "On", duration: 20, ease: "linear" }),
    build: gridColsBuild,
  }),
    make({
    id: "p-grid-columns-06",
    label: "06",
    category: "Grid",
    tags: "grid columns vertical tilt rotated alternating loop scroll",
    params: gridColsParams({ direction: "Up", alternate: "On", columns: 3, count: 12, size: 20, gap: 10, tilt: -15, duration: 12, ease: "linear" }),
    build: gridColsBuild,
  }),
  make({
    id: "p-grid-rows-07",
    label: "07",
    category: "Grid",
    tags: "grid rows horizontal marquee alternating tilt perspective 3d loop scroll",
    params: gridRowsParams({ direction: "Left", alternate: "On", rows: 3, count: 12, size: 20, gap: 10, tiltX: 30, perspective: 60, duration: 12, ease: "linear" }),
    build: gridRowsBuild,
  }),
  make({
    id: "p-grid-zoom-08",
    label: "08",
    category: "Grid",
    tags: "grid zoom focus fill canvas one at a time camera reveal loop",
    params: gridZoomParams({ columns: 3, rows: 2, gap: 4, padding: 12, duration: 12, ease: "smooth" }),
    build: gridZoomBuild,
  }),
  make({
    id: "p-grid-pulse-09",
    label: "09",
    category: "Grid",
    noAspectFit: true,
    tags: "grid pulse zoom in out shrink grow breathe stagger loop",
    params: gridPulseParams({ cols: 3, rows: 2, size: 80, gap: 6, order: "Random", duration: 6, ease: "smooth" }),
    build: gridPulseBuild,
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

export const PARAM_ALL = [...PARAM_FRAME_TEMPLATES]; // what the Animation tab lists
export const PARAM_CATEGORIES = ["All", ...new Set(PARAM_ALL.map((t) => t.category))];