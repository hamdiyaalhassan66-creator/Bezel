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
// Direction options follow the Stack axis. optionsBy tells the param panel which key drives the options.
const DIR_BY_STACK = { Horizontal: ["Left", "Right"], Vertical: ["Up", "Down"] };
const dirParam = (d, fallback = { Horizontal: "Left", Vertical: "Up" }) => {
  const st = d.stack ?? "Horizontal";
  return {
    key: "direction", label: "Direction", type: "segmented",
    options: DIR_BY_STACK[st], optionsBy: { key: "stack", map: DIR_BY_STACK },
    default: d.direction ?? fallback[st],
  };
};
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
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: 0, group: "Frame" },
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
  dirParam(d),
  { key: "stack", label: "Stack", type: "segmented", options: ["Horizontal", "Vertical"], default: d.stack ?? "Horizontal" },
  ...(d.surface ? [{ key: "surface", label: "Surface", type: "segmented", options: ["Flat", "Curved"], default: d.surface }] : []),
  { key: "count", label: "Count", type: "slider", min: 3, max: 40, default: d.count, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 90, default: d.size, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: -50, max: 100, default: d.gap, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: 0, group: "Frame" },
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
  const sgn = direction === "Right" || direction === "Up" || direction === "Forward" ? 1 : -1; // Right / Up = the old "Right"; "Forward" = projects saved before the rename

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
  dirParam(d),
  { key: "stack", label: "Stack", type: "segmented", options: ["Horizontal", "Vertical"], default: d.stack ?? "Horizontal" },
  { key: "count", label: "Count", type: "slider", min: 3, max: 40, default: d.count, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 90, default: d.size, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: 0, group: "Frame" },
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
  const sgn = direction === "Right" || direction === "Up" ? 1 : -1;
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

// ---------- Wheel arc: planes spread over Cycle Deg of a wheel and shift along it (loops) ----------
const wheelRingParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Forward", "Reverse"], default: d.direction ?? "Forward" },
  { key: "spinThumbs", label: "Spin Thumbs", type: "segmented", options: ["Off", "On"], default: d.spinThumbs ?? "On" },
  ...(d.bg !== undefined
    ? [
        { key: "bg", label: "Background Image", type: "segmented", options: ["Off", "On"], default: d.bg },
        { key: "bgScale", label: "Scale", type: "slider", min: 100, max: 200, default: d.bgScale ?? 115 },
        { key: "bgSettle", label: "Settle", type: "slider", min: 0, max: 10, default: d.bgSettle ?? 7 }, // tenths of a step spent settling
        { key: "bgDim", label: "Dim", type: "slider", min: 0, max: 100, default: d.bgDim ?? 10 },
      ]
    : []),
  { key: "repeat", label: "Repeat Images", type: "segmented", options: ["Off", "On"], default: d.repeat ?? "On" },
  { key: "count", label: "Count", type: "slider", min: 3, max: 40, default: d.count ?? 10, group: "Frame" },
  { key: "radius", label: "Ring Radius", type: "slider", min: 20, max: 300, default: d.radius ?? 70, group: "Frame" },
  { key: "size", label: "Thumb Size", type: "slider", min: 5, max: 60, default: d.size ?? 20, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "offsetX", label: "Offset X", type: "slider", min: -100, max: 100, default: d.offsetX ?? 0, group: "Frame" },
  { key: "offsetY", label: "Offset Y", type: "slider", min: -100, max: 100, default: d.offsetY ?? -30, group: "Frame" },
  { key: "cycleDeg", label: "Cycle Deg", type: "slider", min: 30, max: 360, default: d.cycleDeg ?? 180, group: "Frame" },
  { ...FX_PARAM, default: d.fxList ?? [] },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: d.cycles ?? 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 20, hardMax: 600, default: d.duration ?? 13.3, group: "Timing" },
  { key: "delay", label: "Delay (s)", type: "slider", min: 0, max: 10, default: d.delay ?? 0, group: "Timing" },
  easeParam(d.ease ?? "linear"),
];

const wheelRingBuild = ({ direction, spinThumbs, bg, bgScale = 115, bgSettle = 7, bgDim = 10, repeat, count, size, corner, radius, offsetX, offsetY, cycleDeg, fxList, cycles, duration, delay, ease }, ctx) => {
  const { kx, ky } = axes(ctx.aspect ?? 1);
  const { fade, blurs, fx } = fxLayout(fxList);
  const h = size / 100;
  const R = (radius / 100) * ky; // ring radius, same basis as the other wheel
  const sgn = direction === "Reverse" ? -1 : 1;
  // Count planes are spread over Cycle Deg, and the same spacing continues around the whole wheel,
  // so a plane leaving the arc keeps travelling instead of vanishing
  const n = Math.max(count, Math.round((360 * count) / cycleDeg));
  const step = 360 / n;
  const mid = bg === "On" ? Math.floor((n - 1) / 2) : (n - 1) / 2; // Background Image: one plane rests exactly at the top
  const half = 180; // the seam is at the bottom of the wheel, off canvas
  const steps = Math.max(1, Math.round(cycleDeg / step)) * cycles; // each step turns the wheel by one plane, like Wheel 01
  const total = sgn * steps * step; // whole plane steps, so the loop is seamless
  const u0 = clamp(delay / duration, 0, 0.9); // Delay: rest first
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("linear"));
  const spin = (u) => {
    const s = clamp((u - u0) / (1 - u0), 0, 1) * steps;
    const j = Math.min(steps - 1, Math.floor(s + 1e-9));
    return sgn * (j + easeFn(clamp(s - j, 0, 1))) * step; // every step eases on its own
  };
  const K = clamp(Math.floor(480 / steps), 4, 16); // samples per step: the easing is baked in
  const N = steps * K;

  const pose = (u, a) => {
    const th = (a * Math.PI) / 180;
    return {
      u,
      dx: R * Math.sin(th) + (offsetX / 100) * kx,
      dy: R * (1 - Math.cos(th)) + (offsetY / 100) * ky, // y grows downward: the sides drop away from the top
      ...(spinThumbs === "On" ? { dr: a } : {}),
    };
  };

  const track = (i) => {
    const a0 = (i - mid) * step; // centered on the top of the wheel
    const end = a0 + total;
    const lo = Math.min(a0, end), hi = Math.max(a0, end);
    // times where the plane crosses the seam at +-Cycle Deg / 2: it wraps to the other end (hard cut)
    const cuts = [];
    for (let m = Math.ceil((lo - half) / 360); ; m++) {
      const T = half + m * 360;
      if (T >= hi - 1e-9) break;
      if (T <= lo + 1e-9) continue;
      let a = 0, b = 1;
      for (let it = 0; it < 40; it++) {
        const mid = (a + b) / 2;
        if ((a0 + spin(mid) < T) === (end > a0)) a = mid;
        else b = mid;
      }
      cuts.push((a + b) / 2);
    }
    const pts = [];
    cuts.forEach((u) => {
      pts.push({ ...pose(u, sgn * half), order: 0 }); // last position before the wrap
      pts.push({ ...pose(u, -sgn * half), order: 1 }); // first position after it
    });
    for (let q = 0; q <= N; q++) {
      const u = q / N;
      if (cuts.some((c) => Math.abs(c - u) < 1e-6)) continue;
      pts.push({ ...pose(u, wrap(a0 + spin(u), 360)), order: 0 });
    }
    return pts.sort((p, r) => p.u - r.u || p.order - r.order).map(({ order, ...k }) => k);
  };

  const A = repeat === "On" ? Math.max(1, Math.ceil(count / 2)) : count; // distinct images. Repeat Images: they go around twice
  const assetOf = (i) => i % A;

  // Background Image: the big image behind the thumbs is the one sitting at the top of the wheel
  const bgOn = bg === "On";
  const tS = (s) => u0 + (s * (1 - u0)) / steps; // start of step s on the timeline (same mapping as spin)
  const focusAsset = (k) => {
    // image of the plane nearest the top after k steps
    let best = 0, bs = Infinity;
    for (let i = 0; i < n; i++) {
      const ang = wrap((i - mid) * step + sgn * k * step, 360);
      const sc = Math.abs(ang) + (ang * sgn > 0 ? 1e-6 : 0); // a tie goes to the plane still arriving
      if (sc < bs - 1e-9) { bs = sc; best = i; }
    }
    return assetOf(best);
  };
  const bgTrack = (b) => {
    const kBig = Math.max(1, bgScale / 100);
    const sh = (bgDim / 100) * 0.7;
    const vis = (u, k) => ({ u, dx: 0, dy: 0, dz: 0, k, sh, cl: 0, cr: 0, ct: 0, cb: 0 });
    const hid = (u) => ({ u, dx: 0, dy: 0, dz: 0, k: 1, cl: 1, cr: 0, ct: 0, cb: 0 }); // clipped to nothing
    const segs = []; // [from u, to u, starts big]
    if (u0 > 0 && focusAsset(0) === b) segs.push([0, u0, false]); // Delay: rest on the first image
    for (let s = 0; s < steps; s++) if (focusAsset(s + 1) === b) segs.push([tS(s), tS(s + 1), true]); // switches as the step starts
    if (!segs.length) return [hid(0), hid(1)];
    const out = [];
    const Q = 12;
    let end = -1;
    segs.forEach(([a, z, big]) => {
      if (a > end + 1e-9) { // gap: hidden until here
        if (end >= 0) out.push(hid(end));
        else if (a > 1e-9) out.push(hid(0));
        out.push(hid(a));
      }
      out.push(vis(a, big ? kBig : 1)); // same u as the key before = hard cut
      const settle = big ? clamp(bgSettle / 10, 0, 1) * (z - a) : 0;
      if (settle > 0) {
        for (let q = 1; q <= Q; q++) out.push(vis(a + (settle * q) / Q, lerp(kBig, 1, 1 - Math.pow(1 - q / Q, 3)))); // ease-out settle
      }
      out.push(vis(z, 1));
      end = z;
    });
    if (end < 1 - 1e-9) out.push(hid(end), hid(1));
    return out;
  };

  const rig = { tx: 0, ty: 0, tz: 0, persp: 50, hide: false, curve: null }; // flat rig: only here so the thumbs sort above the background
  const thumbs = Array.from({ length: n }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade, fadeAxis: "x", blurs, fx,
    asset: assetOf(i),
    ...(bgOn ? { rig } : {}),
  }));
  const bgPlanes = bgOn
    ? Array.from({ length: A }, (_, b) => ({ x: 0, y: 0, r: ctx.aspect ?? 1, h: 1, radius: 0, fade: 0, fadeAxis: "x", blurs: [], fx: [], rig, noHit: true, asset: b }))
    : [];
  return {
    duration,
    poster: +(duration * 0.1).toFixed(2),
    layout: [...thumbs, ...bgPlanes],
    shots: [{
      name: "Wheel", start: 0, len: duration, keys: [],
      stagger: { track: bgOn ? (i) => (i < n ? track(i).map((k) => ({ ...k, dz: 0.01 })) : bgTrack(i - n)) : track },
    }],
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
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
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
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "tiltX", label: "X - Rotation", type: "slider", min: -80, max: 80, default: d.tiltX ?? 0, group: "Frame" },
  ...(d.tilt !== undefined ? [{ key: "tilt", label: "Tilt", type: "slider", min: -90, max: 90, default: d.tilt, group: "Frame" }] : []),
  { key: "perspective", label: "Perspective", type: "slider", min: 0, max: 100, default: d.perspective ?? 0, group: "Camera" },
  ...(d.drift !== undefined
    ? [
        { key: "drift", label: "Drift (rows)", type: "slider", min: 0, max: 12, default: d.drift, section: "motion" },
        { key: "skip", label: "Rows skipped", type: "slider", min: 0, max: 6, default: d.skip ?? 0, section: "motion" },
        { key: "driftDir", label: "Drift Direction", type: "segmented", options: ["Up", "Down"], default: d.driftDir ?? "Down", section: "motion" },
      ]
    : []),
  { ...FX_PARAM, default: d.fxList ?? [] },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 1, max: 20, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease),
];

const gridRowsBuild = ({ direction, alternate, rows, count, size, gap, corner, tiltX = 0, tilt = 0, perspective = 0, drift = 0, skip = 0, driftDir = "Down", fxList, cycles, duration, ease }, ctx) => {
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
    if (grown > Hs && !drift) { Hs = grown; Ws = RATIO * Hs; h = Hs / ky; }
  }
  const Rt = tilt ? mulMat(RX(tiltX), RZ(tilt)) : RX(tiltX); // tilt turns the grid in the canvas plane first, then X rotation tips it
  const P = lerp(40, 1.4, perspective / 100); // camera distance: 0 = nearly flat, 100 = close
  const rowsExtent = (rows * Hs * g) / 2 + Hs; // how far the rows reach from the center, vertically
  const minScale = P / (P + rowsExtent * Math.abs(Math.sin(rad))); // the far rows shrink toward the center by this much
  const half = kx / 2;
  const pitchX = Ws * g; // distance between neighbours in a row
  const pitchY = Hs * g; // distance between rows
  // planes per row: Count split across the rows, never fewer than it takes to wrap while fully off canvas
  const tsn = Math.sin((tilt * Math.PI) / 180), tcs = Math.cos((tilt * Math.PI) / 180);
  const ex = Math.abs(kx * tcs) + Math.abs(ky * tsn), ey = Math.abs(kx * tsn) + Math.abs(ky * tcs); // canvas extent along the tilted grid's own axes
  const cols = Math.max(1, Math.ceil(count / rows), drift ? Math.ceil((ex + Ws + 0.02) / pitchX) : 0); // Count is the exact total. Drifting also needs enough columns to wrap off canvas
  // drifting: enough rows to wrap off canvas, rounded up to a multiple of Drift so every plane lands on a cell with the image it started on (seamless loop). Alternating also needs an even count
  const skipN = drift ? Math.round(skip) : 0; // rows per jump, 0 = continuous drift
  const vSteps = skipN ? Math.max(1, Math.round(drift / skipN)) : 0; // jumps per cycle
  const rowsPerCycle = skipN ? vSteps * skipN : drift; // whole rows per cycle, so the loop stays seamless
  const rowStep = drift ? (alternate === "On" && rowsPerCycle % 2 ? rowsPerCycle * 2 : rowsPerCycle) : 1;
  const rowsN = drift ? Math.ceil(Math.max(rows, Math.ceil((ey + Hs + 0.02) / pitchY)) / rowStep) * rowStep : rows;
  const loop = cols * pitchX; // length of one lap
  const loopY = rowsN * pitchY; // length of one vertical lap
  const driftTravel = (driftDir === "Up" ? -1 : 1) * rowsPerCycle * cycles * pitchY; // whole rows, so the loop is seamless
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
    const r = i % rowsN, j = Math.floor(i / rowsN);
    const sg = alternate === "On" && r % 2 ? -base : base;
    return { sg, s0: (j - (cols - 1) / 2) * pitchX, Y: (r - (rowsN - 1) / 2) * pitchY };
  };
  const ev = cycleEase(easeFn, cycles);
  const vTotal = vSteps * cycles; // jumps over the whole timeline
  const vAt = (u) => {
    if (!skipN) return driftTravel * ev(u); // continuous drift
    const s = u * steps; // same step grid as the horizontal spin, so both move together
    const j = Math.min(steps - 1, Math.floor(s + 1e-9));
    const done = Math.floor((j * vTotal) / steps + 1e-9); // jumps finished before this step
    const next = Math.floor(((j + 1) * vTotal) / steps + 1e-9); // jumps finished after it
    return (driftTravel / vTotal) * (done + (next - done) * easeFn(clamp(s - j, 0, 1))); // the jump eases with the step
  };

  const track = (i) => {
    const { sg, s0, Y } = info(i);
    const yw = (u) => (drift ? wrap(Y + vAt(u), loopY) : Y); // wrapped vertical position
    const key = (u, a, order, y) => {
      // positions are absolute and rotated here, like the 3D ring (the layout rests at the center)
      const local = [a, y, 0];
      const pt = [0, 1, 2].map((r) => Rt[r][0] * local[0] + Rt[r][1] * local[1] + Rt[r][2] * local[2]);
      const behind = pt[2] > 0.9 * P; // at or past the camera: hide
      return { u, order, dx: pt[0], dy: pt[1], dz: pt[2], ...(behind ? { k: 0.001 } : {}) };
    };
    const wraps = [];
    for (let n = 0; n < steps; n++) {
      const r = (s0 + sg * (n + 0.5) * pitchX - loop / 2) / loop; // a step's midpoint sits on the wrap point
      if (Math.abs(r - Math.round(r)) < 1e-6) wraps.push((n + tHalf) / steps);
    }
    // vertical wraps: the times where Y + travel crosses the seam. Found by bisection, since the easing can be anything
    const vwraps = [];
    if (drift) {
      const y1 = Y + driftTravel;
      const lo = Math.min(Y, y1), hi = Math.max(Y, y1);
      for (let m = Math.ceil((lo - loopY / 2) / loopY); ; m++) {
        const T = loopY / 2 + m * loopY;
        if (T >= hi - 1e-9) break;
        if (T <= lo + 1e-9) continue;
        let a0 = 0, b0 = 1;
        for (let it = 0; it < 40; it++) {
          const mid = (a0 + b0) / 2;
          if ((Y + vAt(mid) < T) === (y1 > Y)) a0 = mid;
          else b0 = mid;
        }
        vwraps.push((a0 + b0) / 2);
      }
    }
    const cuts = [...wraps, ...vwraps];
    const pts = [];
    wraps.forEach((u) => {
      pts.push(key(u, (sg * loop) / 2, 0, yw(u))); // last position before the wrap
      pts.push(key(u, (-sg * loop) / 2, 1, yw(u))); // first position after it (hard cut, off canvas)
    });
    vwraps.forEach((u) => {
      const a = wrap(s0 + spin(u, sg), loop);
      const e = (driftTravel > 0 ? 1 : -1) * (loopY / 2);
      pts.push(key(u, a, 0, e)); // last position before the vertical wrap
      pts.push(key(u, a, 1, -e)); // first position after it (hard cut, off canvas)
    });
    const N = steps * K;
    for (let q = 0; q <= N; q++) {
      const u = q / N;
      if (cuts.some((w) => Math.abs(w - u) < 1e-6)) continue;
      pts.push(key(u, wrap(s0 + spin(u, sg), loop), 0, yw(u)));
    }
    return pts.sort((p, r) => p.u - r.u || p.order - r.order).map(({ order, ...k }) => k);
  };

  const rig = { tx: tiltX, ty: 0, tz: tilt, persp: P, hide: false, curve: null };
  const layout = Array.from({ length: rowsN * cols }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade: fadeAmt, fadeAxis: "x", blurs, fx, rig,
    ...(drift ? { asset: (((i % rowsN) % rowsPerCycle) + rowsPerCycle * Math.floor(i / rowsN)) % count } : {}), // images repeat every rowsPerCycle rows, so the loop closes on the same picture Count, so they reuse the Count assets
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
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
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
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
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

// ---------- Flip: cards turn over to show the next asset on their back (loops) ----------
const flipParams = (d) => [
  { key: "axis", label: "Axis", type: "segmented", options: ["Horizontal", "Vertical"], default: d.axis ?? "Horizontal" },
  { key: "direction", label: "Direction", type: "segmented", options: ["Forward", "Reverse"], default: d.direction ?? "Forward" },
  { key: "cols", label: "Columns", type: "slider", min: 1, max: 6, default: d.cols ?? 1, group: "Frame" },
  { key: "rows", label: "Rows", type: "slider", min: 1, max: 6, default: d.rows ?? 1, group: "Frame" },
  { key: "size", label: "Size", type: "slider", min: 20, max: 95, default: d.size ?? 70, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: 0, max: 40, default: d.gap ?? 8, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "order", label: "Order", type: "segmented", options: ["Diagonal", "Row", "Column", "Random"], default: d.order ?? "Diagonal" },
  { key: "perspective", label: "Perspective", type: "slider", min: 0, max: 100, default: d.perspective ?? 60, group: "Camera" },
  { key: "shade", label: "Shade", type: "slider", min: 0, max: 100, default: d.shade ?? 30, group: "Camera" },
  FX_PARAM,
  { key: "flipLen", label: "Flip length (%)", type: "slider", min: 5, max: 45, default: d.flipLen ?? 25, section: "motion" },
  { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: d.stagger ?? 80, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 30, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease ?? "expo-out"),
];

const flipBuild = ({ axis, direction, cols, rows, size, gap, corner, order, perspective, shade, fxList, flipLen, stagger, cycles, duration, ease }, ctx) => {
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
  const A = Math.max(2, n); // assets in use: card c shows asset c on its front and c + 1 on its back
  const horiz = axis === "Horizontal";
  const sgn = direction === "Reverse" ? -1 : 1;
  const P = lerp(10, 1.4, perspective / 100); // camera distance: 0 = nearly flat, 100 = strong depth
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("expo-out"));
  const f = clamp(flipLen / 100, 0.05, 0.45); // share of a cycle one flip takes
  const rankOf = (i) => {
    const r = Math.floor(i / cols), c = i % cols;
    if (order === "Row") return n > 1 ? i / (n - 1) : 0;
    if (order === "Column") return n > 1 ? (c * rows + r) / (n - 1) : 0;
    if (order === "Random") { const v = Math.sin((i + 1) * 12.9898) * 43758.5453; return v - Math.floor(v); }
    return rows + cols > 2 ? (r + c) / (rows + cols - 2) : 0; // Diagonal
  };
  // one cycle = flip to the back, rest, flip to the front, rest. 0 -> 360 degrees
  const phaseAngle = (ph) =>
    ph < f ? 180 * easeFn(ph / f)
    : ph < 0.5 ? 180
    : ph < 0.5 + f ? 180 + 180 * easeFn((ph - 0.5) / f)
    : 360;
  const N = cycles * 96; // samples: the easing is baked in

  const track = (i) => {
    const c = i % n, back = i >= n;
    const off = rankOf(c) * (stagger / 100) * (0.5 - f); // keeps every card at rest at u = 0 and u = 1
    return Array.from({ length: N + 1 }, (_, j) => {
      const u = j / N;
      const s = u * cycles - off;
      const m = Math.floor(s + 1e-9);
      const a = 360 * m + phaseAngle(Math.max(0, s - m)); // cumulative, so the angle never wraps back
      const key = { u, [horiz ? "ry" : "rx"]: sgn * (back ? a + 180 : a) };
      const sh = (shade / 100) * Math.abs(Math.sin((a * Math.PI) / 180));
      if (sh > 0.001) key.sh = sh;
      return key;
    });
  };

  const rig = { tx: 0, ty: 0, tz: 0, persp: P, hide: true, curve: null }; // hide = the side facing away disappears
  const layout = Array.from({ length: n * 2 }, (_, i) => {
    const c = i % n;
    return {
      x: ((c % cols) - (cols - 1) / 2) * px,
      y: (Math.floor(c / cols) - (rows - 1) / 2) * py,
      r: RATIO, h, radius: corner, fade, fadeAxis: "x", blurs, fx, rig,
      asset: i < n ? c : (c + 1) % A,
      tint: "bg",
    };
  });
  return {
    duration,
    poster: +(duration * 0.12).toFixed(2),
    layout,
    shots: [{ name: "Flip", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Flip strip: a strip of planes steps along a direction. The plane leaving folds away on its far edge, the next one unfolds in from the other end (loops) ----------
const flipStripParams = (d) => [
  { key: "stack", label: "Stack", type: "segmented", options: ["Horizontal", "Vertical"], default: d.stack ?? "Vertical" },
  dirParam({ ...d, stack: d.stack ?? "Vertical" }),
  { key: "visible", label: "Visible", type: "slider", min: 1, max: 6, default: d.visible ?? 3, group: "Frame" },
  { key: "count", label: "Count", type: "slider", min: 4, max: 12, default: d.count ?? 6, group: "Frame" },
  { key: "size", label: "Size", type: "slider", min: 20, max: 100, default: d.size ?? 100, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: 0, max: 30, default: d.gap ?? 0, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "perspective", label: "Perspective", type: "slider", min: 0, max: 100, default: d.perspective ?? 100, group: "Camera" },
  FX_PARAM,
  { key: "speed", label: "Speed (%)", type: "slider", min: 25, max: 400, default: d.speed ?? 100, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 60, hardMax: 600, default: d.duration ?? 12, group: "Timing" },
];

const flipStripBuild = ({ stack = "Vertical", direction, visible, count, size, gap, corner, perspective, fxList, speed, cycles, duration }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade, blurs, fx } = fxLayout(fxList);
  const DIR = { Up: [0, -1], Down: [0, 1], Left: [-1, 0], Right: [1, 0] }; // the way the strip travels (screen x right, y down)
  const horiz = stack === "Horizontal";
  // Stack decides the axis. A direction from the other axis falls back to its default (Left / Up)
  const d = DIR[horiz ? (direction === "Right" ? "Right" : "Left") : (direction === "Down" ? "Down" : "Up")];
  const sg = horiz ? d[0] : -d[1]; // fold direction: the leading edge goes away from the camera
  const V = Math.max(1, Math.round(visible)); // planes on screen at rest
  const n = Math.max(V + 1, count); // planes in the loop (one is always waiting to come in)
  const g = gap / 100;
  // L = plane length along the travel. The V visible planes fill `size` % of the canvas along it
  let L = ((size / 100) * (horiz ? kx : ky)) / (V + (V - 1) * g);
  const crossExt = horiz ? ky : kx;
  const cross = horiz ? L / RATIO : L * RATIO;
  if (cross > crossExt * 0.98) L *= (crossExt * 0.98) / cross; // never wider than the canvas
  const Hs = horiz ? L / RATIO : L; // plane height
  const pitch = L * (1 + g);
  const P = L * lerp(6, 1.8, perspective / 100); // camera distance, relative to the plane so it looks the same at any size

  const steps = cycles * n; // one plane per step, whole laps = seamless loop
  const T = duration / steps; // seconds per step
  const f = clamp((0.5 * (100 / speed)) / T, 0.02, 1); // share of a step spent flipping: 0.5s at 100% speed, in seconds so Duration doesn't change it
  const hd = 1 - f; // the rest is the hold
  // CSS "ease": cubic-bezier(0.25, 0.1, 0.25, 1)
  const easeFn = (x) => {
    const bez = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
    let lo = 0, hi = 1;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      if (bez(mid, 0.25, 0.25) < x) lo = mid;
      else hi = mid;
    }
    return bez((lo + hi) / 2, 0.1, 1);
  };
  const K = clamp(Math.floor(480 / steps), 8, 24); // samples per flip: the fold is a curve, so keys must be dense
  const smoothstep = (x) => {
    const t = clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Plane in slot m at belt progress s (0-1). Slot 0 = the plane leaving, V = the plane about to enter
  const poseAt = (m, s) => {
    const along = ((V - 1) / 2 - m + s) * pitch; // flat center along the travel
    let a = along, z = 0, rot = 0, hide = false;
    if (m === 0) {
      // hinged on its trailing edge: folds first half, leading edge swings away
      const th = 90 * smoothstep(s / 0.5);
      const r = (th * Math.PI) / 180;
      a = along - L / 2 + (L / 2) * Math.cos(r);
      z = -(L / 2) * Math.sin(r);
      rot = sg * th;
      hide = th > 89.9;
    } else if (m === V) {
      // hinged on its leading edge: unfolds second half, trailing edge swings in
      const th = 90 * (1 - smoothstep((s - 0.5) / 0.5));
      const r = (th * Math.PI) / 180;
      a = along + L / 2 - (L / 2) * Math.cos(r);
      z = -(L / 2) * Math.sin(r);
      rot = -sg * th;
      hide = th > 89.9;
    }
    return { dx: d[0] * a, dy: d[1] * a, dz: z, [horiz ? "ry" : "rx"]: rot, ...(hide ? { k: 0.001 } : {}) }; // edge-on = hidden
  };

  const xs = [0];
  if (hd > 0) xs.push(hd);
  for (let q = 1; q <= K; q++) xs.push(hd + (f * q) / K);

  const track = (i) => {
    const out = [];
    for (let j = 0; j < steps; j++) {
      const m = (((i - j) % n) + n) % n;
      xs.forEach((x) => {
        const s = x <= hd ? 0 : easeFn(clamp((x - hd) / f, 0, 1));
        out.push({ u: Math.min(1, (j + x) / steps), ...poseAt(m, s) });
      });
    }
    return out; // the plane that just left jumps to the back of the strip while edge-on (same u twice = hard cut)
  };

  const rig = { tx: 0, ty: 0, tz: 0, persp: P, hide: false, curve: null };
  const layout = Array.from({ length: n }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h: Hs / ky, radius: corner, fade, fadeAxis: horiz ? "x" : "y", blurs, fx, rig, tint: "bg", asset: i,
  }));
  return {
    duration,
    poster: +(T * (hd + f * 0.5)).toFixed(2),
    layout,
    shots: [{ name: "Flip", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Wipe: the next plane covers (or opens over) the current one, one after another (loops) ----------
const wipeParams = (d) => [
  { key: "style", label: "Style", type: "segmented", options: ["Cover", "Open"], default: d.style ?? "Cover" },
  { key: "direction", label: "Direction", type: "segmented", options: ["Left", "Right", "Up", "Down"], default: d.direction ?? "Left" },
  { key: "count", label: "Count", type: "slider", min: 2, max: 12, default: d.count ?? 5, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 100, default: d.size ?? 70, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "dim", label: "Dim", type: "slider", min: 0, max: 100, default: d.dim ?? 40, group: "Frame" },
  ...(d.zoom !== undefined ? [{ key: "zoom", label: "Zoom", type: "slider", min: 0, max: 50, default: d.zoom, group: "Frame" }] : []),
  ...(d.feather !== undefined ? [{ key: "feather", label: "Feather", type: "slider", min: 0, max: 100, default: d.feather, group: "Frame" }] : []),
  FX_PARAM,
  { key: "hold", label: "Hold (%)", type: "slider", min: 0, max: 80, default: d.hold ?? 35, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 40, hardMax: 600, default: d.duration, group: "Timing" },
  easeParam(d.ease ?? "expo-out"),
];

const wipeBuild = ({ style, direction, count, size, corner, dim, zoom = 0, feather = 0, fxList, hold, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade, blurs, fx } = fxLayout(fxList);
  const h = size / 100;
  const Hs = h * ky, Ws = RATIO * Hs; // plane size in short-side units
  const horiz = direction === "Left" || direction === "Right";
  const sd = direction === "Left" || direction === "Up" ? 1 : -1; // Left = the next plane arrives from the right
  const Z = zoom / 100;
  const kz = (t) => 1 + Z * t; // t = 1: fully zoomed, t = 0: original
  const away = ((horiz ? kx / 2 + Ws / 2 : ky / 2 + Hs / 2) + 0.02) * (1 + Z); // zoomed planes are bigger, so they wait further out
  const Dx = horiz ? sd * away : 0, Dy = horiz ? 0 : sd * away;
  const open = style === "Open";
  const soft = open && feather > 0; // feathered Open reveals with a mask instead of scaling
  const steps = cycles * count; // one plane change per step, whole laps = seamless loop
  const hd = clamp(hold / 100, 0, 0.8);
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("expo-out"));
  const K = clamp(Math.floor(480 / steps), 6, 24); // samples per move: the easing is baked in
  const TINY = 0.001;

  // [position inside a step, pre]. pre = the key just before the move starts, so the move begins with a hard cut
  const xs = [];
  if (hd > 0) xs.push([0, false], [hd, true]);
  xs.push([hd, false]);
  for (let q = 1; q <= K; q++) xs.push([hd + ((1 - hd) * q) / K, false]);

  const state = (i, j, x, pre) => {
    const cur = j % count, nxt = (j + 1) % count;
    const p = pre ? 0 : easeFn(clamp((x - hd) / (1 - hd), 0, 1));
    if (i === cur) return { dx: 0, dy: 0, dz: 0.01, sh: (dim / 100) * 0.7 * p, k: kz(1 - p) }; // darkens and zooms back to 1 as it gets covered
    if (i === nxt) {
      if (open) {
        if (soft) return { dx: 0, dy: 0, dz: 0.02, k: kz(1), cq: 1 - p }; // soft reveal: the mask sweeps, the plane stays full size
        if (pre || x < hd) return { dx: 0, dy: 0, dz: 0.02, kw: TINY, kh: TINY, k: kz(1) };
        return horiz
          ? { dx: 0, dy: 0, dz: 0.02, kw: Math.max(TINY, p), kh: 1, k: kz(1) }
          : { dx: 0, dy: 0, dz: 0.02, kw: 1, kh: Math.max(TINY, p), k: kz(1) };
      }
      return { dx: Dx * (1 - p), dy: Dy * (1 - p), dz: 0.02, k: kz(1) }; // arrives already zoomed
    }
    if (open && soft) return { dx: 0, dy: 0, dz: 0, k: kz(1), cq: 1 }; // waiting: fully masked out
    return open ? { dx: 0, dy: 0, dz: 0, kw: TINY, kh: TINY, k: kz(1) } : { dx: Dx, dy: Dy, dz: 0, k: kz(1) }; // waiting
  };

  const track = (i) => {
    const out = [];
    for (let j = 0; j < steps; j++) {
      xs.forEach(([x, pre]) => {
        const s = state(i, j, x, pre);
        const kc = s.k ?? 1;
        const cc = kc > 1 ? (1 - 1 / kc) / 2 : 0; // crop that brings the zoomed plane back to the original window
        out.push({
          u: Math.min(1, (j + x) / steps),
          dx: s.dx, dy: s.dy, dz: s.dz,
          ...(s.kw !== undefined ? { kw: s.kw, kh: s.kh } : {}),
          ...(s.sh ? { sh: s.sh } : {}),
          ...(s.cq !== undefined ? (horiz ? { cl: s.cq, cr: s.cq } : { ct: s.cq, cb: s.cq }) : {}),
          ...(Z > 0 ? { k: kc, cl: cc, ct: cc, cr: cc, cb: cc } : {}),
        });
      });
    }
    return out; // same u twice = a hard cut, which only ever happens while the plane is covered
  };

  const rig = { tx: 0, ty: 0, tz: 0, persp: 50, hide: false, curve: null }; // flat rig: only here so the incoming plane sorts above
  const layout = Array.from({ length: count }, () => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, feather: feather / 100, featherSym: soft ? (horiz ? "x" : "y") : undefined, fade, fadeAxis: "x", blurs, fx, rig, tint: "bg",
  }));
  return {
    duration,
    poster: +((duration / steps) * (hd + (1 - hd) * 0.5)).toFixed(2),
    layout,
    shots: [{ name: "Wipe", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Wipe slide: each plane is a window. The next image slides in from one side, clipped to the plane, over the one showing (loops) ----------
const wipeSlideParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Left", "Right", "Up", "Down"], default: d.direction ?? "Right" },
  { key: "alternate", label: "Alternating", type: "segmented", options: ["Off", "On"], default: d.alternate ?? "On" },
  { key: "planes", label: "Planes", type: "slider", min: 1, max: 4, default: d.planes ?? 2, group: "Frame" },
  { key: "count", label: "Count", type: "slider", min: 4, max: 12, default: d.count ?? 4, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 100, default: d.size ?? 90, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: 0, max: 30, default: d.gap ?? 4, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "feather", label: "Feather", type: "slider", min: 0, max: 100, default: d.feather ?? 0, group: "Frame" },
  { key: "split", label: "Split", type: "slider", min: 10, max: 90, default: d.split ?? 45, group: "Frame" },
  { key: "dim", label: "Dim", type: "slider", min: 0, max: 100, default: d.dim ?? 0, group: "Frame" },
  FX_PARAM,
  { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: d.stagger ?? 20, section: "motion" },
  { key: "hold", label: "Hold (%)", type: "slider", min: 0, max: 80, default: d.hold ?? 55, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 40, hardMax: 600, default: d.duration ?? 8, group: "Timing" },
  easeParam(d.ease ?? "smooth"),
];

const wipeSlideBuild = ({ direction, alternate, planes, count, size, gap, corner, feather, split, dim, fxList, stagger, hold, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { ky } = axes(aspect);
  const { fade, blurs, fx } = fxLayout(fxList);
  const g = gap / 100;
  // the row has to fit the canvas both ways: by height, and by width
  const h = Math.min(size / 100, (0.94 * aspect) / (RATIO * (planes + (planes - 1) * g)));
  const wAvg = (RATIO * h) / aspect; // average plane width, canvas fraction
  const Hs = h * ky; // plane height in short-side units
  // Split: even planes take split%, odd planes the rest. 50 = every plane the same width
  const weight = (c) => (c % 2 ? 100 - split : split);
  const wsum = Array.from({ length: planes }, (_, c) => weight(c)).reduce((a, b) => a + b, 0);
  const wc = Array.from({ length: planes }, (_, c) => (planes * wAvg * weight(c)) / wsum); // each plane's width, canvas fraction
  const rc = wc.map((v) => (v * aspect) / h); // and its w / h
  let at = -(wc.reduce((a, b) => a + b, 0) + (planes - 1) * g * wAvg) / 2;
  const cx = wc.map((v) => {
    const x = at + v / 2;
    at += v + g * wAvg;
    return x;
  });
  const n = Math.max(2, Math.ceil(count / planes)); // images each plane cycles through
  const horiz = direction === "Left" || direction === "Right";
  const sd = direction === "Left" || direction === "Up" ? 1 : -1; // Left = the next image arrives from the right
  const steps = cycles * n; // one image change per step, whole laps = seamless loop
  const hd = clamp(hold / 100, 0, 0.8);
  const s = stagger / 100; // each plane starts this share of a move after the one before it
  const ml = (1 - hd) / (1 + (planes - 1) * s); // length of one plane's move, share of a step
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("smooth"));
  const K = clamp(Math.floor(480 / steps), 6, 24);

  // q = how far the incoming image still has to travel (1 = fully outside, 0 = in place).
  // The plane is shifted by q of its size, and the same share is cut off its own box, so only the part inside the window shows.
  const soft = feather > 0; // feathered wipes reveal in place instead of sliding
  const slide = (sdc, q, Wc) => ({
    dx: horiz && !soft ? sdc * Wc * q : 0,
    dy: horiz || soft ? 0 : sdc * Hs * q,
    ...(horiz ? (sdc > 0 ? { cr: q } : { cl: q }) : sdc > 0 ? { cb: q } : { ct: q }),
  });

  const track = (i) => {
    const c = i % planes, img = Math.floor(i / planes);
    const Wc = rc[c] * Hs;
    const sdc = alternate === "On" && c % 2 ? -sd : sd;
    const m0 = hd + c * s * ml;
    const xs = [...new Set([0, m0, ...Array.from({ length: K }, (_, q) => m0 + (ml * (q + 1)) / K), 1].map((v) => +v.toFixed(6)))];
    const out = [];
    for (let j = 0; j < steps; j++) {
      const cur = j % n, nxt = (j + 1) % n;
      xs.forEach((x) => {
        const p = easeFn(clamp((x - m0) / ml, 0, 1));
        const o =
          img === cur ? { dx: 0, dy: 0, dz: 0.01, ...(dim ? { sh: (dim / 100) * 0.7 * p } : {}) }
          : img === nxt ? { ...slide(sdc, 1 - p, Wc), dz: 0.02 }
          : { ...slide(sdc, 1, Wc), dz: 0 }; // waiting: fully outside the window
        out.push({ u: Math.min(1, (j + x) / steps), ...o });
      });
    }
    return out; // same u twice = a hard cut, which only happens while the plane is covered or hidden
  };

  const rig = { tx: 0, ty: 0, tz: 0, persp: 50, hide: false, curve: null }; // flat rig: only here so the incoming plane sorts above
  const layout = Array.from({ length: planes * n }, (_, i) => ({
    x: cx[i % planes], y: 0,
    r: rc[i % planes], h, radius: corner, feather: feather / 100, fade, fadeAxis: "x", blurs, fx, rig, tint: "bg",
    asset: i % count, // spare slots reuse images from the start
  }));
  return {
    duration,
    poster: +((duration / steps) * (hd + ml * 0.6)).toFixed(2),
    layout,
    shots: [{ name: "Wipe", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

const hash01 = (i, s) => {
  const v = Math.sin((i + 1) * 12.9898 + s * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// ---------- Wipe stripes: the next image slides into its column, strip by strip (loops) ----------
const wipeStripesParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Up", "Down"], default: d.direction ?? "Up" },
  { key: "alternate", label: "Alternating", type: "segmented", options: ["Off", "On"], default: d.alternate ?? "On" },
  { key: "order", label: "Order", type: "segmented", options: ["Sequential", "Random"], default: d.order ?? "Random" },
  { key: "strips", label: "Strips", type: "slider", min: 2, max: 24, default: d.strips ?? 8, group: "Frame" },
  { key: "count", label: "Count", type: "slider", min: 2, max: 12, default: d.count ?? 4, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 100, default: d.size ?? 80, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  FX_PARAM,
  { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: d.stagger ?? 60, section: "motion" },
  { key: "hold", label: "Hold (%)", type: "slider", min: 0, max: 80, default: d.hold ?? 35, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 40, hardMax: 600, default: d.duration ?? 8, group: "Timing" },
  easeParam(d.ease ?? "smooth"),
];

const wipeStripesBuild = ({ direction, alternate, order, strips: S, count, size, corner, fxList, stagger, hold, cycles, duration, ease }, ctx) => {
  const { ky } = axes(ctx.aspect ?? 1);
  const { fade, blurs, fx } = fxLayout(fxList);
  const h = size / 100;
  const Hs = h * ky; // plane height in short-side units
  const n = Math.max(2, count); // images
  const sd = direction === "Up" ? 1 : -1;
  const steps = cycles * n; // one image change per step, whole laps = seamless loop
  const hd = clamp(hold / 100, 0, 0.8);
  const sg = stagger / 100;
  const ml = (1 - hd) / (1 + sg); // length of one strip's move, share of a step
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("smooth"));
  const K = clamp(Math.floor(480 / steps), 6, 20);
  const E = 0.0012; // strips overlap by this much, so no hairline shows between them
  const rankOf = (s) => (order === "Random" ? hash01(s, 3) : S > 1 ? s / (S - 1) : 0);
  const colClip = (s) => ({ cl: Math.max(0, s / S - E), cr: Math.max(0, 1 - (s + 1) / S - E) });

  const track = (i) => {
    const s = i % S, img = Math.floor(i / S);
    const sdc = alternate === "On" && s % 2 ? -sd : sd;
    const m0 = hd + rankOf(s) * sg * ml; // when this strip starts moving
    const cc = colClip(s);
    // q = how far the strip still has to travel (1 = hidden, 0 = in place). Same idea as Wipe 01.
    const slide = (q) => ({ dy: sdc * Hs * q, ...cc, ...(sdc > 0 ? { cb: q } : { ct: q }) });
    const dense = [...new Set([0, m0, ...Array.from({ length: K }, (_, q) => m0 + (ml * (q + 1)) / K), 1].map((v) => +v.toFixed(6)))];
    const out = [];
    for (let j = 0; j < steps; j++) {
      const cur = j % n, nxt = (j + 1) % n;
      const xs = img === nxt ? dense : [0, 1]; // only the arriving strip needs dense keys
      xs.forEach((x) => {
        const o =
          img === cur ? { dy: 0, dz: 0.01, ...cc }
          : img === nxt ? { ...slide(1 - easeFn(clamp((x - m0) / ml, 0, 1))), dz: 0.02 }
          : { ...slide(1), dz: 0 }; // waiting: fully clipped away
        out.push({ u: Math.min(1, (j + x) / steps), ...o });
      });
    }
    return out; // same u twice = a hard cut, which only happens while the strip is covered or hidden
  };

  const rig = { tx: 0, ty: 0, tz: 0, persp: 50, hide: false, curve: null }; // flat rig: only here so the incoming strips sort above
  const layout = Array.from({ length: n * S }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade, fadeAxis: "x", blurs, fx, rig, tint: "bg", asset: Math.floor(i / S),
  }));
  return {
    duration,
    poster: +((duration / steps) * (hd + ml * 0.6)).toFixed(2),
    layout,
    shots: [{ name: "Stripes", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Wipe mosaic: the current image breaks into tiles that shrink away and reveal the next one (loops) ----------
const wipeMosaicParams = (d) => [
  { key: "stagger", label: "Stagger", type: "segmented", options: ["Diagonal", "Row", "Column", "Random"], default: d.stagger ?? "Diagonal" },
  { key: "columns", label: "Columns", type: "slider", min: 1, max: 12, default: d.columns ?? 6, group: "Frame" },
  { key: "rows", label: "Rows", type: "slider", min: 1, max: 12, default: d.rows ?? 4, group: "Frame" },
  { key: "count", label: "Count", type: "slider", min: 2, max: 12, default: d.count ?? 4, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 100, default: d.size ?? 80, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  FX_PARAM,
  { key: "spread", label: "Spread", type: "slider", min: 0, max: 100, default: d.spread ?? 70, section: "motion" },
  { key: "hold", label: "Hold (%)", type: "slider", min: 0, max: 80, default: d.hold ?? 30, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 40, hardMax: 600, default: d.duration ?? 10, group: "Timing" },
  easeParam(d.ease ?? "smooth"),
];

const wipeMosaicBuild = ({ stagger: order, columns: C, rows: R, count, size, corner, fxList, spread, hold, cycles, duration, ease }, ctx) => {
  const { ky } = axes(ctx.aspect ?? 1);
  const { fade, blurs, fx } = fxLayout(fxList);
  const h = size / 100;
  const Hs = h * ky, Ws = RATIO * Hs; // plane size in short-side units
  const n = Math.max(2, count); // images
  const cells = C * R;
  const steps = cycles * n;
  const hd = clamp(hold / 100, 0, 0.8);
  const sg = spread / 100;
  const ml = (1 - hd) / (1 + sg);
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("smooth"));
  const K = clamp(Math.floor(480 / steps), 4, 12);
  const E = 0.0012; // tiles overlap by this much, so no hairline shows between them
  const TINY = 0.001;
  const HID = { cl: 1, cr: 0, ct: 0, cb: 0 }; // clipped down to nothing
  const rankOf = (c) => {
    const r = Math.floor(c / C), col = c % C;
    if (order === "Row") return cells > 1 ? c / (cells - 1) : 0;
    if (order === "Column") return cells > 1 ? (col * R + r) / (cells - 1) : 0;
    if (order === "Random") return hash01(c, 5);
    return R + C > 2 ? (r + col) / (R + C - 2) : 0; // Diagonal
  };
  const win = (c) => {
    const r = Math.floor(c / C), col = c % C;
    return {
      cl: Math.max(0, col / C - E), cr: Math.max(0, 1 - (col + 1) / C - E),
      ct: Math.max(0, r / R - E), cb: Math.max(0, 1 - (r + 1) / R - E),
    };
  };

  const track = (i) => {
    const c = i % cells, img = Math.floor(i / cells);
    const r = Math.floor(c / C), col = c % C;
    const ox = ((col + 0.5) / C - 0.5) * Ws, oy = ((r + 0.5) / R - 0.5) * Hs; // tile center, relative to the plane center
    const m0 = hd + rankOf(c) * sg * ml;
    const dense = [...new Set([0, m0, ...Array.from({ length: K }, (_, q) => m0 + (ml * (q + 1)) / K), 1].map((v) => +v.toFixed(6)))];
    const out = [];
    for (let j = 0; j < steps; j++) {
      const cur = j % n, nxt = (j + 1) % n;
      const xs = img === cur ? dense : [0, 1];
      xs.forEach((x) => {
        let o;
        if (img === cur) {
          const p = easeFn(clamp((x - m0) / ml, 0, 1));
          const k = lerp(1, TINY, p); // the tile shrinks around its own center: scale the plane, then move it back
          o = { dx: (1 - k) * ox, dy: (1 - k) * oy, dz: 0.01, k, ...win(c) };
        } else if (img === nxt && c === 0) {
          o = { dx: 0, dy: 0, dz: 0.005, k: 1 }; // one unclipped plane sits underneath, so there are no seams behind the tiles
        } else {
          o = { dx: 0, dy: 0, dz: 0, k: 1, ...HID };
        }
        out.push({ u: Math.min(1, (j + x) / steps), ...o });
      });
    }
    return out;
  };

  const rig = { tx: 0, ty: 0, tz: 0, persp: 50, hide: false, curve: null };
  const layout = Array.from({ length: n * cells }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade, fadeAxis: "x", blurs, fx, rig, tint: "bg", asset: Math.floor(i / cells),
  }));
  return {
    duration,
    poster: +((duration / steps) * (hd + ml * 0.5)).toFixed(2),
    layout,
    shots: [{ name: "Mosaic", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Stack: a deck of planes. The top one is thrown off, goes to the back, the deck moves up (loops) ----------
const stackParams = (d) => [
  { key: "toss", label: "Toss", type: "segmented", options: ["Left", "Right", "Up", "Down"], default: d.toss ?? "Right" },
  { key: "spread", label: "Spread", type: "segmented", options: ["Left", "Right", "Up", "Down"], default: d.spread ?? "Up" },
  { key: "count", label: "Count", type: "slider", min: 3, max: 10, default: d.count ?? 5, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 90, default: d.size ?? 60, group: "Frame" },
  { key: "step", label: "Offset (%)", type: "slider", min: 0, max: 40, default: d.step ?? 8, group: "Frame" },
  { key: "shrink", label: "Shrink (%)", type: "slider", min: 0, max: 20, default: d.shrink ?? 5, group: "Frame" },
  { key: "tilt", label: "Tilt", type: "slider", min: -20, max: 20, default: d.tilt ?? 0, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "dim", label: "Dim", type: "slider", min: 0, max: 100, default: d.dim ?? 30, group: "Frame" },
  FX_PARAM,
  { key: "spin", label: "Toss spin", type: "slider", min: 0, max: 45, default: d.spin ?? 10, section: "motion" },
  { key: "hold", label: "Hold (%)", type: "slider", min: 0, max: 80, default: d.hold ?? 30, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 60, hardMax: 600, default: d.duration ?? 10, group: "Timing" },
  easeParam(d.ease ?? "expo-out"),
];

const stackBuild = ({ toss, spread, count: n, size, step, shrink, tilt, corner, dim, fxList, spin, hold, cycles, duration, ease }, ctx) => {
  const { ky } = axes(ctx.aspect ?? 1);
  const { fade, blurs, fx } = fxLayout(fxList);
  const h = size / 100;
  const Hs = h * ky, Ws = RATIO * Hs; // plane size in short-side units
  const DIR = { Left: [-1, 0], Right: [1, 0], Up: [0, -1], Down: [0, 1] }; // frame y grows downward
  const sv = DIR[spread], tv = DIR[toss];
  const ext = (v) => (v[0] ? Ws : Hs);
  const stepLen = (step / 100) * ext(sv);
  const sameWay = sv[0] === tv[0] && sv[1] === tv[1];
  const clear = ext(tv) * 1.08 + (sameWay ? (n - 1) * stepLen : 0); // the thrown plane has to leave the whole deck behind
  const steps = cycles * n; // one plane thrown per step, whole laps = seamless loop
  const hd = clamp(hold / 100, 0, 0.8);
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("expo-out"));
  const K = clamp(2 * Math.floor(240 / steps), 8, 24); // even, so the halfway point is a sample
  const spinSign = tv[0] + tv[1] > 0 ? 1 : -1;
  const rest = (r) => ({
    x: sv[0] * stepLen * r, y: sv[1] * stepLen * r,
    k: Math.max(0.3, 1 - (shrink / 100) * r), dr: tilt * r, z: -0.01 * r,
    sh: n > 1 ? (dim / 100) * 0.8 * (r / (n - 1)) : 0,
  });
  const mix = (a, b, t) => ({
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), k: lerp(a.k, b.k, t),
    dr: lerp(a.dr, b.dr, t), z: lerp(a.z, b.z, t), sh: lerp(a.sh, b.sh, t),
  });
  // plane i in step j at t (0-1): the top plane is thrown out, then goes to the back. The others move up once it is clear
  const pose = (i, j, t, second) => {
    const r0 = (((i - j) % n) + n) % n;
    if (r0 === 0) {
      const top = rest(0), back = rest(n - 1);
      const away = { ...top, x: top.x + tv[0] * clear, y: top.y + tv[1] * clear, dr: top.dr + spinSign * spin };
      return second
        ? mix({ ...away, z: back.z }, back, easeFn(clamp((t - 0.5) / 0.5, 0, 1))) // depth switches while it is clear of the deck
        : mix(top, away, easeFn(clamp(t / 0.5, 0, 1)));
    }
    return mix(rest(r0), rest(r0 - 1), easeFn(clamp((t - 0.3) / 0.7, 0, 1)));
  };

  const track = (i) => {
    const out = [];
    for (let j = 0; j < steps; j++) {
      const put = (x, p) => out.push({ u: Math.min(1, (j + x) / steps), dx: p.x, dy: p.y, dz: p.z, k: p.k, dr: p.dr, sh: p.sh });
      const isTop = (((i - j) % n) + n) % n === 0;
      if (j === 0) put(0, pose(i, j, 0, false));
      if (hd > 0) put(hd, pose(i, j, 0, false));
      for (let q = 1; q <= K; q++) {
        const t = q / K, x = hd + (1 - hd) * t;
        put(x, pose(i, j, t, t > 0.5));
        if (isTop && q === K / 2) put(x, pose(i, j, t, true)); // same u twice = the depth switch
      }
    }
    return out;
  };

  const rig = { tx: 0, ty: 0, tz: 0, persp: 50, hide: false, curve: null }; // flat rig: only here so the planes sort by depth
  const layout = Array.from({ length: n }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade, fadeAxis: "x", blurs, fx, rig, tint: "bg", asset: i,
  }));
  return {
    duration,
    poster: +((duration / steps) * (hd + (1 - hd) * 0.25)).toFixed(2),
    layout,
    shots: [{ name: "Stack", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Float: planes scattered at different depths, each drifting on its own closed loop (parallax) ----------
const floatParams = (d) => [
  { key: "count", label: "Count", type: "slider", min: 3, max: 20, default: d.count ?? 8, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 8, max: 70, default: d.size ?? 30, group: "Frame" },
  { key: "spread", label: "Spread (%)", type: "slider", min: 20, max: 100, default: d.spread ?? 80, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "dim", label: "Dim", type: "slider", min: 0, max: 100, default: d.dim ?? 20, group: "Frame" },
  { key: "depth", label: "Depth", type: "slider", min: 0, max: 100, default: d.depth ?? 60, group: "Camera" },
  { key: "perspective", label: "Perspective", type: "slider", min: 0, max: 100, default: d.perspective ?? 50, group: "Camera" },
  FX_PARAM,
  { key: "drift", label: "Drift", type: "slider", min: 0, max: 100, default: d.drift ?? 40, section: "motion" },
  { key: "tilt", label: "Tilt", type: "slider", min: 0, max: 30, default: d.tilt ?? 4, section: "motion" },
  { key: "speed", label: "Speed", type: "slider", min: 1, max: 4, default: d.speed ?? 1, section: "motion" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 60, hardMax: 600, default: d.duration ?? 12, group: "Timing" },
];

const floatBuild = ({ count: n, size, spread, corner, dim, depth, perspective, fxList, drift, tilt, speed, duration }, ctx) => {
  const { fade, blurs, fx } = fxLayout(fxList);
  const P = lerp(8, 2.5, perspective / 100); // camera distance
  const zr = (depth / 100) * Math.min(1.2, P * 0.4);
  const N = Math.min(240, 48 * speed); // samples. Whole oscillations per loop, so it repeats exactly
  const items = Array.from({ length: n }, (_, i) => {
    const z = -zr + 1.6 * zr * hash01(i, 4);
    return {
      x: (hash01(i, 1) - 0.5) * (spread / 100),
      y: (hash01(i, 2) - 0.5) * (spread / 100),
      h: (size / 100) * (0.7 + 0.6 * hash01(i, 3)),
      z,
      near: zr > 0 ? (z + zr) / (1.6 * zr) : 1, // 0 = far, 1 = near
      ax: (drift / 100) * 0.15 * (0.6 + 0.8 * hash01(i, 5)),
      ay: (drift / 100) * 0.15 * (0.6 + 0.8 * hash01(i, 6)),
      cx: speed * (1 + Math.floor(hash01(i, 7) * 2)),
      cy: speed * (1 + Math.floor(hash01(i, 8) * 2)),
      p1: hash01(i, 9), p2: hash01(i, 10), p3: hash01(i, 11),
    };
  });
  const track = (i) => {
    const it = items[i];
    const sh = (dim / 100) * 0.6 * (1 - it.near);
    return Array.from({ length: N + 1 }, (_, j) => {
      const u = j / N;
      return {
        u,
        dx: it.ax * Math.sin(2 * Math.PI * (it.cx * u + it.p1)),
        dy: it.ay * Math.sin(2 * Math.PI * (it.cy * u + it.p2)),
        dz: it.z,
        dr: tilt * Math.sin(2 * Math.PI * (it.cx * u + it.p3)),
        ...(sh ? { sh } : {}),
      };
    });
  };
  const rig = { tx: 0, ty: 0, tz: 0, persp: P, hide: false, curve: null };
  const layout = items.map((it, i) => ({
    x: it.x, y: it.y, r: RATIO, h: it.h, radius: corner, fade, fadeAxis: "x", blurs, fx, rig, tint: "bg", asset: i,
  }));
  return {
    duration,
    poster: +(duration * 0.1).toFixed(2),
    layout,
    shots: [{ name: "Float", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Helix: planes on a spiral, the whole helix spins (loops) ----------
const helixParams = (d) => [
  { key: "axis", label: "Axis", type: "segmented", options: ["Vertical", "Horizontal"], default: d.axis ?? "Vertical" },
  { key: "direction", label: "Direction", type: "segmented", options: ["Left", "Right"], default: d.direction ?? "Right" },
  { key: "facing", label: "Facing", type: "segmented", options: ["Outward", "Camera"], default: d.facing ?? "Outward" },
  { key: "backface", label: "Backface", type: "segmented", options: ["Show", "Hide"], default: d.backface ?? "Hide" },
  { key: "count", label: "Count", type: "slider", min: 4, max: 40, default: d.count ?? 14, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 5, max: 60, default: d.size ?? 16, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "radius", label: "Radius", type: "slider", min: 5, max: 100, default: d.radius ?? 30, group: "Frame" },
  { key: "pitch", label: "Pitch", type: "slider", min: 0, max: 60, default: d.pitch ?? 8, group: "Frame" },
  { key: "stepAngle", label: "Step angle", type: "slider", min: 5, max: 180, default: d.stepAngle ?? 50, group: "Frame" },
  { key: "dim", label: "Dim", type: "slider", min: 0, max: 100, default: d.dim ?? 30, group: "Frame" },
  { key: "tiltX", label: "X - Rotation", type: "slider", min: -180, max: 180, default: d.tiltX ?? 0, group: "Rotation" },
  { key: "tiltY", label: "Y - Rotation", type: "slider", min: -180, max: 180, default: d.tiltY ?? 0, group: "Rotation" },
  { key: "tiltZ", label: "Z - Rotation", type: "slider", min: -180, max: 180, default: d.tiltZ ?? 0, group: "Rotation" },
  { key: "perspective", label: "Perspective", type: "slider", min: 0, max: 100, default: d.perspective ?? 60, group: "Camera" },
  { key: "offsetX", label: "Offset X", type: "slider", min: -50, max: 50, default: 0, group: "Camera" },
  { key: "offsetY", label: "Offset Y", type: "slider", min: -50, max: 50, default: 0, group: "Camera" },
  FX_PARAM,
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 60, hardMax: 600, default: d.duration ?? 10, group: "Timing" },
  easeParam(d.ease ?? "linear"),
];

const helixBuild = ({ axis, direction, facing, backface, count: n, size, corner, radius, pitch, stepAngle, dim, tiltX, tiltY, tiltZ, perspective, offsetX, offsetY, fxList, cycles, duration, ease }, ctx) => {
  const { kx, ky } = axes(ctx.aspect ?? 1);
  const { fade, blurs, fx } = fxLayout(fxList);
  const vert = axis === "Vertical";
  const out = facing === "Outward";
  const h = size / 100;
  const R = radius / 100, pp = pitch / 100;
  const P = R * lerp(12, 2.2, perspective / 100);
  const Rt = mulMat(mulMat(RX(tiltX), RY(tiltY)), RZ(tiltZ));
  const sgn = direction === "Left" ? -1 : 1;
  const eu = cycleEase(vidEaseFn(ease ?? vidEaseSpec("linear")), cycles);
  const N = cycles * 72;

  const track = (i) => {
    const a = (i - (n - 1) / 2) * pp; // position along the axis
    return Array.from({ length: N + 1 }, (_, j) => {
      const u = j / N;
      const th = i * stepAngle + sgn * 360 * cycles * eu(u); // degrees, keeps growing so it never wraps
      const t = (th * Math.PI) / 180, sn = Math.sin(t), cs = Math.cos(t);
      const local = vert ? [R * sn, a, R * cs] : [a, -R * sn, R * cs];
      const pt = [0, 1, 2].map((r) => Rt[r][0] * local[0] + Rt[r][1] * local[1] + Rt[r][2] * local[2]);
      const back = clamp(0.5 - pt[2] / (2 * R), 0, 1); // 0 = front of the helix, 1 = back
      const sh = 0.7 * (dim / 100) * back;
      return {
        u,
        dx: pt[0] + (offsetX / 100) * kx,
        dy: pt[1] + (offsetY / 100) * ky,
        dz: pt[2],
        ...(out ? (vert ? { ry: th } : { rx: th }) : {}),
        ...(sh ? { sh } : {}),
        ...(pt[2] > 0.9 * P ? { k: 0.001 } : {}), // at or past the camera
      };
    });
  };

  const rig = { tx: out ? tiltX : 0, ty: out ? tiltY : 0, tz: out ? tiltZ : 0, persp: P, hide: out && backface === "Hide", curve: null };
  const layout = Array.from({ length: n }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade, fadeAxis: vert ? "y" : "x", blurs, fx, rig, tint: "bg", asset: i,
  }));
  return {
    duration,
    poster: +(duration * 0.1).toFixed(2),
    layout,
    shots: [{ name: "Helix", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Fan: planes fanned from a pivot, like a hand of cards. Opens and closes, or sweeps (loops) ----------
const fanParams = (d) => [
  { key: "motion", label: "Motion", type: "segmented", options: ["Open", "Sweep"], default: d.motion ?? "Open" },
  { key: "pivot", label: "Pivot", type: "segmented", options: ["Bottom", "Top"], default: d.pivot ?? "Bottom" },
  { key: "count", label: "Count", type: "slider", min: 3, max: 16, default: d.count ?? 7, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 80, default: d.size ?? 45, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 0, group: "Frame" },
  { key: "angle", label: "Fan angle", type: "slider", min: 10, max: 360, default: d.angle ?? 70, group: "Frame" },
  { key: "reach", label: "Pivot distance", type: "slider", min: 20, max: 300, default: d.reach ?? 110, group: "Frame" },
  { key: "dim", label: "Dim", type: "slider", min: 0, max: 100, default: d.dim ?? 0, group: "Frame" },
  { key: "offsetY", label: "Offset Y", type: "slider", min: -50, max: 50, default: d.offsetY ?? 0, group: "Camera" },
  FX_PARAM,
  { key: "sweep", label: "Sweep angle", type: "slider", min: 0, max: 90, default: d.sweep ?? 20, section: "motion" },
  { key: "stagger", label: "Stagger", type: "slider", min: 0, max: 100, default: d.stagger ?? 40, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 6, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 60, hardMax: 600, default: d.duration ?? 8, group: "Timing" },
  easeParam(d.ease ?? "expo-out"),
];

const fanBuild = ({ motion, pivot, count: n, size, corner, angle, reach, dim, offsetY, fxList, sweep, stagger, cycles, duration, ease }, ctx) => {
  const { ky } = axes(ctx.aspect ?? 1);
  const { fade, blurs, fx } = fxLayout(fxList);
  const h = size / 100;
  const L = (reach / 100) * h * ky; // distance from a plane's center to the pivot
  const d = pivot === "Top" ? -1 : 1; // Bottom = the pivot is below the planes, they fan upward
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("expo-out"));
  const base = (i) => (n > 1 ? (i / (n - 1) - 0.5) * angle : 0); // each plane's angle when fully open
  // open amount at cycle time t: open, hold, close, rest. o delays the planes one after another
  const open = (t, o) =>
    t < o ? 0 : t < o + 0.3 ? easeFn((t - o) / 0.3) : t < 0.55 + o ? 1 : t < 0.85 + o ? 1 - easeFn((t - 0.55 - o) / 0.3) : 0;
  const N = cycles * 96;

  const track = (i) => {
    const o = n > 1 ? (i / (n - 1)) * (stagger / 100) * 0.15 : 0;
    const sh = n > 1 ? (dim / 100) * 0.6 * (1 - i / (n - 1)) : 0;
    return Array.from({ length: N + 1 }, (_, j) => {
      const u = j / N;
      const a = motion === "Sweep" ? base(i) + sweep * Math.sin(2 * Math.PI * cycles * u) : base(i) * open((u * cycles) % 1, o);
      const r = (a * Math.PI) / 180;
      // rotating about the pivot: the plane's center swings on a circle of radius L
      return {
        u,
        dx: d * L * Math.sin(r),
        dy: d * L * (1 - Math.cos(r)) + (offsetY / 100) * ky,
        dr: a,
        dz: i * 0.01, // later planes sit on top
        ...(sh ? { sh } : {}),
      };
    });
  };

  const rig = { tx: 0, ty: 0, tz: 0, persp: 50, hide: false, curve: null };
  const layout = Array.from({ length: n }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade, fadeAxis: "x", blurs, fx, rig, tint: "bg", asset: i,
  }));
  return {
    duration,
    poster: motion === "Sweep" ? 0 : +((duration / cycles) * 0.2).toFixed(2),
    layout,
    shots: [{ name: "Fan", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Selector: a fixed strip of thumbs. An outline hops from thumb to thumb and the big image behind follows (loops) ----------
// Sizes are px on an 800px canvas, so a value looks the same at any canvas size.
const SEL_GAP = 0.11; // space between thumbs, share of the thumb's long side
const SEL_PAD = 0.07; // padding inside the container, same unit
const selectorParams = (d) => [
  { key: "stack", label: "Stack", type: "segmented", options: ["Horizontal", "Vertical"], default: d.stack ?? "Horizontal" },
  { key: "direction", label: "Direction", type: "segmented", options: ["Forward", "Reverse"], default: d.direction ?? "Forward" },
  { key: "aspect", label: "Thumb Aspect", type: "segmented", options: ["1:1", "3:4", "4:3"], default: d.aspect ?? "4:3" },
  { key: "count", label: "Count", type: "slider", min: 2, max: 16, default: d.count ?? 8, group: "Frame" },
  { key: "bgScale", label: "Scale", type: "slider", min: 100, max: 200, default: d.bgScale ?? 115, group: "Frame" },
  { key: "bgDrift", label: "Drift", type: "slider", min: 0, max: 100, default: d.bgDrift ?? 40, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 30, default: d.corner ?? 6, group: "Frame" },
  { key: "thumb", label: "Thumb Size", type: "slider", min: 20, max: 300, default: d.thumb ?? 85, group: "Frame" },
  { key: "boxOpacity", label: "Container Opacity", type: "slider", min: 0, max: 100, default: d.boxOpacity ?? 40, group: "Frame" },
  { key: "boxBlur", label: "Container Blur", type: "slider", min: 0, max: 100, default: d.boxBlur ?? 60, group: "Frame" },
  { key: "pad", label: "Selector Pad", type: "slider", min: 0, max: 20, default: d.pad ?? 5, group: "Frame" },
  { key: "stroke", label: "Selector Stroke", type: "slider", min: 0, max: 10, default: d.stroke ?? 2, group: "Frame" },
  { key: "dim", label: "Dim", type: "slider", min: 0, max: 100, default: d.dim ?? 20, group: "Frame" },
  { key: "offsetX", label: "Offset X", type: "slider", min: -400, max: 400, default: d.offsetX ?? 0, group: "Frame" },
  { key: "offsetY", label: "Offset Y", type: "slider", min: -400, max: 400, default: d.offsetY ?? 0, group: "Frame" },
  { ...FX_PARAM, default: d.fxList ?? [] },
  { key: "hold", label: "Hold (%)", type: "slider", min: 0, max: 90, default: d.hold ?? 70, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 60, hardMax: 600, default: d.duration ?? 10, group: "Timing" },
  easeParam(d.ease ?? "smooth"),
];

const selectorBuild = ({ stack, direction, aspect: ar, count: n, bgScale, bgDrift, corner, thumb, boxOpacity, boxBlur, pad, stroke, dim, offsetX, offsetY, fxList, hold, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade, blurs, fx } = fxLayout(fxList);
  const U = 1 / 800; // one px on an 800px canvas, in short-side units
  const horiz = stack !== "Vertical";
  const sgn = direction === "Reverse" || direction === "Left" || direction === "Up" ? -1 : 1; // Forward = right / down. Left / Up = projects saved before the rename
  const ratio = ar === "1:1" ? 1 : ar === "3:4" ? 0.75 : 4 / 3; // thumb w / h
  const Ls = thumb * U; // thumb long side
  const tw = ratio >= 1 ? Ls : Ls * ratio, th = ratio >= 1 ? Ls / ratio : Ls;
  const along = horiz ? tw : th, across = horiz ? th : tw;
  const gapU = SEL_GAP * Ls, padC = SEL_PAD * Ls;
  const pitch = along + gapU;
  const boxLen = n * pitch - gapU + 2 * padC; // container length along the strip
  const boxAcross = across + 2 * padC;
  const pu = pad * U;
  const E = along + 2 * pu; // outline length along the strip
  const ox = offsetX * U, oy = offsetY * U;
  const rad = (px) => px / 8; // px on an 800px canvas -> % of the short side
  const place = (cx, cy, w, h) => ({ x: (cx + ox) / kx, y: (cy + oy) / ky, r: w / h, h: h / ky });
  const slotPos = (q) => (q - (n - 1) / 2) * pitch; // slot q along the strip. -1 and n sit just off either end
  const qEnd = sgn > 0 ? n : -1, qIn = sgn > 0 ? -1 : n; // where the outline leaves, and where the next one comes in
  const qOf = (t) => (t >= n ? qEnd : sgn > 0 ? t : n - 1 - t);

  const steps = cycles * n; // one hop per step, whole laps = seamless loop
  const hd = clamp(hold / 100, 0, 0.9);
  const mv = 1 - hd; // share of a step spent moving. The move comes first, then the hold
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("smooth"));
  const K = clamp(Math.floor(480 / steps), 6, 16);
  const HID = { cl: 1, cr: 0, ct: 0, cb: 0 }; // clipped down to nothing

  // Outline: clipped to the container, so it slides out of one end while the next slides in from the other
  const half = boxLen / 2;
  const offEnd = half + E / 2 + U; // centre of an outline just past either end: fully clipped away
  const cAt = (t) => (t >= n ? sgn * offEnd : slotPos(sgn > 0 ? t : n - 1 - t)); // centre for step t. t = n is off the far end
  const cIn = -sgn * offEnd; // waiting off the near end
  // The clip comes from the centre alone, so a sliding outline is clipped on the same side the whole way.
  // A separate "hidden" clip made the keys blend into each other and flashed a cut-off outline.
  const selKey = (u, c) => {
    const lo = clamp((-half - (c - E / 2)) / E, 0, 1); // share hanging off the start
    const hi = clamp((c + E / 2 - half) / E, 0, 1); // share hanging off the end
    return { u, dx: horiz ? c : 0, dy: horiz ? 0 : c, ...(horiz ? { cl: lo, cr: hi, ct: 0, cb: 0 } : { cl: 0, cr: 0, ct: lo, cb: hi }) };
  };
  const hop = (out, u0, u1, a, b) => {
    out.push(selKey(u0, a));
    for (let m = 1; m <= K; m++) out.push(selKey(u0 + ((u1 - u0) * m) / K, lerp(a, b, easeFn(m / K))));
  };
  // Two identical outlines take turns: one per lap leaves, the other enters on the lap's last hop
  const selTrack = (k) => {
    const out = [];
    for (let j = 0; j < steps; j++) {
      const lap = Math.floor(j / n), t = j % n;
      const u0 = j / steps, u1 = (j + mv) / steps, u2 = (j + 1) / steps;
      if (lap % 2 === k) {
        hop(out, u0, u1, cAt(t), cAt(t + 1));
        if (u2 - u1 > 1e-9) out.push(selKey(u2, cAt(t + 1)));
      } else if (t === n - 1) {
        hop(out, u0, u1, cIn, cAt(0));
        if (u2 - u1 > 1e-9) out.push(selKey(u2, cAt(0)));
      } else {
        out.push(selKey(u0, cIn), selKey(u2, cIn)); // waiting off the near end, clipped away
      }
    }
    return out;
  };

  // Background: one full-canvas plane per image. The new one cuts in as the outline starts to move,
  // starts at Scale and shifted against the travel direction, then settles
  const bgTrack = (b) => {
    const kBig = Math.max(1, bgScale / 100);
    const sh = (dim / 100) * 0.7;
    const dr = (bgDrift / 1000) * (horiz ? kx : ky);
    const pose = (u, e) => {
      const off = -sgn * dr * (1 - e);
      return { u, dx: horiz ? off : 0, dy: horiz ? 0 : off, k: lerp(kBig, 1, e), sh, cl: 0, cr: 0, ct: 0, cb: 0 };
    };
    const hid = (u) => ({ u, dx: 0, dy: 0, k: 1, sh: 0, ...HID });
    const segs = [];
    for (let j = 0; j < steps; j++) if (qOf(((j % n) + 1) % n) === b) segs.push([j / steps, (j + 1) / steps]);
    if (!segs.length) return [hid(0), hid(1)];
    const out = [];
    const Q = 12;
    let end = -1;
    segs.forEach(([a, z]) => {
      if (a > end + 1e-9) { // gap: hidden until here
        if (end >= 0) out.push(hid(end));
        else if (a > 1e-9) out.push(hid(0));
        out.push(hid(a));
      }
      for (let q = 0; q <= Q; q++) out.push(pose(a + ((z - a) * q) / Q, 1 - Math.pow(1 - q / Q, 3))); // ease-out settle, same u as the key before = hard cut
      end = z;
    });
    if (end < 1 - 1e-9) out.push(hid(end), hid(1));
    return out;
  };

  // Paint order = layout order: backgrounds, container, thumbs, outlines
  const still = [{ u: 0, dx: 0, dy: 0 }, { u: 1, dx: 0, dy: 0 }];
  const bgPlanes = Array.from({ length: n }, (_, b) => ({
    x: 0, y: 0, r: aspect, h: 1, radius: 0, fade: 0, fadeAxis: "x", blurs: [], fx: [], asset: b, noHit: true,
  }));
  const container = {
    ...place(0, 0, horiz ? boxLen : boxAcross, horiz ? boxAcross : boxLen),
    radius: rad(corner + SEL_PAD * thumb), fade: 0, fadeAxis: "x", blurs: [], fx: [], asset: 0,
    fill: `rgba(32,32,32,${(boxOpacity / 100).toFixed(3)})`, backdrop: boxBlur, noHit: true,
  };
  const thumbs = Array.from({ length: n }, (_, k) => ({
    ...place(horiz ? slotPos(k) : 0, horiz ? 0 : slotPos(k), tw, th),
    radius: rad(corner), fade, fadeAxis: horiz ? "x" : "y", blurs, fx, asset: k,
  }));
  const outlines = [0, 1].map(() => ({
    ...place(0, 0, tw + 2 * pu, th + 2 * pu),
    radius: rad(corner + pad), fade: 0, fadeAxis: "x", blurs: [], fx: [], asset: 0,
    fill: "rgba(0,0,0,0)", ring: { width: stroke, hex: "FFFFFF", opacity: 100 }, noHit: true,
  }));
  const track = (i) => (i < n ? bgTrack(i) : i <= 2 * n ? still : selTrack(i - (2 * n + 1)));
  return {
    duration,
    poster: +((duration / steps) * (mv + hd * 0.5)).toFixed(2),
    layout: [...bgPlanes, container, ...thumbs, ...outlines],
    shots: [{ name: "Selector", start: 0, len: duration, keys: [], stagger: { track } }],
  };
};

// ---------- Deck: a stream of two-sided cards. Each card flips over as it travels through the center slot (loops) ----------
const deckParams = (d) => [
  { key: "direction", label: "Direction", type: "segmented", options: ["Up", "Down", "Left", "Right"], default: d.direction ?? "Up" },
  { key: "flip", label: "Flip Axis", type: "segmented", options: ["Vertical", "Horizontal"], default: d.flip ?? "Vertical" },
  { key: "twoSided", label: "Two Sided", type: "segmented", options: ["Off", "On"], default: d.twoSided ?? "On" },
  { key: "solo", label: "Solo", type: "segmented", options: ["Off", "On"], default: d.solo ?? "Off" },
  { key: "count", label: "Count", type: "slider", min: 3, max: 16, default: d.count ?? 6, group: "Frame" },
  { key: "size", label: "Plane Size", type: "slider", min: 15, max: 90, default: d.size ?? 38, group: "Frame" },
  { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: d.corner ?? 2, group: "Frame" },
  { key: "gap", label: "Gap", type: "slider", min: 0, max: 100, default: d.gap ?? 29, group: "Frame" },
  { key: "maxScale", label: "Max Scale", type: "slider", min: 100, max: 200, default: d.maxScale ?? 115, group: "Frame" },
  { key: "tilt", label: "Tilt", type: "slider", min: -45, max: 45, default: d.tilt ?? 5, group: "Frame" },
  { key: "distance", label: "Distance", type: "slider", min: 0, max: 100, default: d.distance ?? 25, group: "Camera" },
  { key: "perspective", label: "Perspective", type: "slider", min: 0, max: 100, default: d.perspective ?? 100, group: "Camera" },
  { ...FX_PARAM, default: d.fxList ?? [] },
  { key: "hold", label: "Hold (%)", type: "slider", min: 0, max: 80, default: d.hold ?? 20, section: "motion" },
  { key: "cycles", label: "Cycles", type: "slider", min: 1, max: 4, default: 1, group: "Timing" },
  { key: "duration", label: "Duration (s)", type: "slider", min: 2, max: 60, hardMax: 600, default: d.duration ?? 12, group: "Timing" },
  easeParam(d.ease ?? "smooth"),
];

const deckBuild = ({ direction, flip, twoSided, solo, count, size, corner, gap, maxScale, tilt, distance, perspective, fxList, hold, cycles, duration, ease }, ctx) => {
  const aspect = ctx.aspect ?? 1;
  const { kx, ky } = axes(aspect);
  const { fade: fadeAmt, blurs, fx } = fxLayout(fxList);
  const horiz = direction === "Left" || direction === "Right";
  const flipX = flip === "Vertical"; // Vertical flip turns around the horizontal axis (rx)
  const tv = direction === "Down" || direction === "Right" ? 1 : -1; // screen direction of travel (y grows downward)
  const h = size / 100;
  const Hs = h * ky, Ws = RATIO * Hs;
  const L = horiz ? Ws : Hs; // plane length along the travel
  const half = (horiz ? kx : ky) / 2;
  const pitch = Math.max(0.01, solo === "On" ? 2 * half + L + 0.02 : L * (1 + gap / 100)); // Solo: a neighbour is fully off canvas
  let n = Math.max(count, Math.ceil((2 * half + 1.6 * L + 0.02) / pitch) + 1); // enough cards that the wrap happens off canvas
  if (n % 2 === 0) n += 1; // odd, so one card rests in the center and none sits on the wrap seam
  const loop = n * pitch;
  const steps = cycles * n; // one card advance per step, whole laps = seamless loop
  const hd = clamp(hold / 100, 0, 0.8);
  const easeFn = vidEaseFn(ease ?? vidEaseSpec("smooth"));
  const K = clamp(Math.floor(480 / steps), 4, 16);
  const P = L * lerp(8, 2.2, perspective / 100); // camera distance, relative to the plane
  const sm = (x) => x * x * (3 - 2 * x);
  const spin = (u) => {
    const s = u * steps;
    const j = Math.min(steps - 1, Math.floor(s + 1e-9));
    return tv * (j + easeFn(clamp((s - j - hd) / (1 - hd), 0, 1))) * pitch; // hold first, then the move
  };

  const us = new Map();
  const add = (u) => us.set(Math.round(u * 1e9), clamp(u, 0, 1));
  for (let j = 0; j < steps; j++) {
    add(j / steps);
    if (hd > 0) add((j + hd) / steps);
    for (let q = 1; q <= K; q++) add((j + hd + ((1 - hd) * q) / K) / steps);
  }
  add(1);
  const list = [...us.values()].sort((a, b) => a - b);

  const track = (i) => {
    const s0 = (i - (n - 1) / 2) * pitch; // one card rests in the center slot
    const key = (u, a, order) => {
      const s = clamp(a / pitch, -1, 1); // slot offset from the center, clamped to one slot either side
      const t = Math.abs(s);
      return {
        u, order,
        dx: horiz ? a : 0,
        dy: horiz ? 0 : a,
        [flipX ? "rx" : "ry"]: (flipX ? -180 : 180) * s, // upright in the center, face down one slot away
        dz: -(distance / 100) * 0.5 * L * sm(t), // neighbours sit behind the center card
        k: 1 + (maxScale / 100 - 1) * sm(1 - t),
        ...(tilt ? { dr: tilt } : {}),
      };
    };
    // times where the card crosses the seam at +-loop / 2 and wraps to the other end (hard cut, off canvas)
    const y0 = s0, y1 = s0 + spin(1);
    const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
    const cuts = [];
    for (let m = Math.ceil((lo - loop / 2) / loop); ; m++) {
      const T = loop / 2 + m * loop;
      if (T >= hi - 1e-9) break;
      if (T <= lo + 1e-9) continue;
      let a = 0, b = 1;
      for (let it = 0; it < 40; it++) {
        const mid = (a + b) / 2;
        if ((y0 + spin(mid) < T) === (y1 > y0)) a = mid;
        else b = mid;
      }
      cuts.push((a + b) / 2);
    }
    const pts = [];
    cuts.forEach((u) => {
      pts.push(key(u, (tv * loop) / 2, 0)); // last position before the wrap
      pts.push(key(u, (-tv * loop) / 2, 1)); // first position after it
    });
    list.forEach((u) => {
      if (cuts.some((c) => Math.abs(c - u) < 1e-6)) return;
      pts.push(key(u, wrap(s0 + spin(u), loop), 0));
    });
    return pts.sort((p, r) => p.u - r.u || p.order - r.order).map(({ order, ...k }) => k);
  };

  // hide = the side facing away disappears, so Two Sided Off shows only the card that is facing you
  const rig = { tx: 0, ty: 0, tz: 0, persp: P, hide: twoSided !== "On", curve: null };
  const layout = Array.from({ length: n }, (_, i) => ({
    x: 0, y: 0, r: RATIO, h, radius: corner, fade: fadeAmt, fadeAxis: horiz ? "x" : "y", blurs, fx, rig, asset: i % count,
  }));
  return {
    duration,
    poster: +((duration / steps) * hd * 0.5).toFixed(2),
    layout,
    shots: [{ name: "Deck", start: 0, len: duration, keys: [], stagger: { track } }],
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
      { key: "corner", label: "Corner Radius", type: "slider", min: 0, max: 50, default: 0 },
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
    params: ringParams({ rings: 3, count: 12, size: 14, radius: 43, depth: 45, tiltX: 0, tiltY: 0, tiltZ: 0, perspective: 100, duration: 12, fxList: [] }),
    build: ringBuild,
  }),
    make({
    id: "p-ring-05",
    label: "05",
    category: "Ring",
    noAspectFit: true,
    tags: "ring tunnel rings depth concentric orbit facing center radial roll loop perspective",
    params: ringParams({ rings: 3, count: 12, size: 14, radius: 43, depth: 45, facing: "Center", tiltX: 0, tiltY: 0, tiltZ: 0, perspective: 100, duration: 12, fxList: [] }),
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
      count: 8, size: 30, corner: 0, radius: 35, radiusLabel: "Wheel Radius", radiusMin: 20, radiusMax: 300,
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
      count: 8, size: 30, corner: 0, radius: 25, radiusLabel: "Wheel Radius", radiusMin: 20, radiusMax: 300,
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
    id: "p-carousel-03",
    label: "02",
    category: "Carousel",
    tags: "carousel flat straight vertical glide strip loop slide",
    params: carouselParams({
      direction: "Up", stack: "Vertical", surface: "Flat", count: 9,
      size: 44, gap: 8, curve: 0, perspective: 0, duration: 10, ease: "glide",
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-04",
    label: "03",
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
    label: "04",
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
    label: "05",
    category: "Carousel",
    tags: "carousel flat straight vertical glide scale center focus loop slide",
    params: carouselParams({
      direction: "Up", stack: "Vertical", surface: "Flat", count: 5,
      size: 44, gap: 16, curve: 0, perspective: 0, duration: 12, ease: "glide",
      scaleCenter: "On", scaleFocus: "Center", scaleAmount: 10,
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-carousel-07",
    label: "06",
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
    label: "07",
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
    label: "08",
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
    label: "09",
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
    label: "10",
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
    label: "11",
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
    label: "12",
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
    label: "13",
    category: "Carousel",
    tags: "carousel flat straight horizontal glide scale end focus loop slide",
    params: carouselParams({
      direction: "Up", stack: "Vertical", surface: "Flat", count: 9,
      size: 44, gap: 25, curve: 0, perspective: 0, duration: 12, ease: "glide",
      scaleCenter: "On", scaleFocus: "End", scaleAmount: 20,
    }),
    build: carouselBuild,
  }),
  make({
    id: "p-wheel-01",
    label: "01",
    category: "Wheel",
    tags: "wheel carousel fan arc ferris rotate loop",
    params: wheelParams({ count: 12, size: 60, radius: 100, duration: 12, ease: "linear" }),
    build: wheelBuild,
  }),
  make({
    id: "p-wheel-02",
    label: "02",
    category: "Wheel",
    tags: "wheel arc ring thumbs rotate spin loop",
    params: wheelRingParams({}),
    build: wheelRingBuild,
  }),
  make({
    id: "p-wheel-03",
    label: "03",
    category: "Wheel",
    tags: "wheel arc ring thumbs upright reverse loop",
    params: wheelRingParams({ direction: "Reverse", spinThumbs: "Off", count: 8, size: 24, radius: 80, duration: 12 }),
    build: wheelRingBuild,
  }),
  make({
    id: "p-wheel-04",
    label: "04",
    category: "Wheel",
    tags: "wheel full circle ring thumbs rotate spin loop",
    params: wheelRingParams({ spinThumbs: "Off", count: 12, size: 16, radius: 45, offsetY: -45, cycleDeg: 360, duration: 16 }),
    build: wheelRingBuild,
  }),
  make({
    id: "p-wheel-05",
    label: "05",
    category: "Wheel",
    tags: "wheel full circle ring thumbs repeat rotate spin loop",
    params: wheelRingParams({ count: 22, size: 10, radius: 41, offsetY: -41, cycleDeg: 360, duration: 16 }),
    build: wheelRingBuild,
  }),
  make({
    id: "p-wheel-06",
    label: "06",
    category: "Wheel",
    tags: "wheel arc dense small thumbs linear loop",
    params: wheelRingParams({ count: 16, size: 14, radius: 75, cycleDeg: 200, duration: 14, ease: "linear" }),
    build: wheelRingBuild,
  }),
  make({
    id: "p-wheel-07",
    label: "07",
    category: "Wheel",
    tags: "wheel arc wide shallow flat thumbs glide loop",
    params: wheelRingParams({ count: 7, size: 24, radius: 150, offsetY: -20, cycleDeg: 100, duration: 12, ease: "glide" }),
    build: wheelRingBuild,
  }),
  make({
    id: "p-wheel-08",
    label: "08",
    category: "Wheel",
    noAspectFit: true,
    tags: "wheel full circle ring large thumbs spin rotate loop",
    params: wheelRingParams({ count: 8, size: 40, radius: 40, offsetY: -40, cycleDeg: 360, duration: 16 }),
    build: wheelRingBuild,
  }),
  make({
    id: "p-wheel-09",
    label: "09",
    category: "Wheel",
    noAspectFit: true,
    tags: "wheel arc ring thumbs background image big settle dim spin loop",
    params: wheelRingParams({ bg: "On", count: 10, size: 23, radius: 65, offsetY: -22, cycleDeg: 180, duration: 15, ease: "smooth" }),
    build: wheelRingBuild,
  }),
  make({
    id: "p-wheel-10",
    label: "10",
    category: "Wheel",
    noAspectFit: true,
    tags: "wheel arc ring thumbs upright background image scale settle dim wide linear loop",
    params: wheelRingParams({ bg: "On", bgScale: 160, spinThumbs: "Off", count: 10, size: 15, radius: 65, offsetY: -22, cycleDeg: 290, duration: 15, ease: "linear" }),
    build: wheelRingBuild,
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

  make({
    id: "p-grid-rows-10",
    label: "10",
    category: "Grid",
    noAspectFit: true,
    tags: "grid rows horizontal marquee alternating drift diagonal vertical scroll loop",
    params: gridRowsParams({ direction: "Left", alternate: "On", rows: 4, count: 10, size: 50, gap: 20, drift: 4, driftDir: "Down", duration: 12, ease: "linear" }),
    build: gridRowsBuild,
  }),

  make({
    id: "p-grid-rows-11",
    label: "11",
    category: "Grid",
    noAspectFit: true,
    tags: "grid rows horizontal marquee alternating drift diagonal vertical tilt rotated scroll loop",
    params: gridRowsParams({ direction: "Left", alternate: "On", rows: 4, count: 10, size: 50, gap: 5, tilt: -15, drift: 3, driftDir: "Down", duration: 12, ease: "linear" }),
    build: gridRowsBuild,
  }),

  make({
    id: "p-grid-rows-12",
    label: "12",
    category: "Grid",
    noAspectFit: true,
    tags: "grid rows horizontal marquee alternating drift skip jump step vertical scroll loop",
    params: gridRowsParams({ direction: "Left", alternate: "On", rows: 4, count: 10, size: 50, gap: 0, drift: 8, skip: 2, driftDir: "Down", duration: 20, ease: "steep" }),
    build: gridRowsBuild,
  }),

  // ---- Flip ----
  make({
    id: "p-flip-01", label: "01", category: "Flip", noAspectFit: true,
    tags: "flip card turn single rotate reveal back loop",
    params: flipParams({ cols: 1, rows: 1, size: 60, duration: 6 }),
    build: flipBuild,
  }),
  make({
    id: "p-flip-02", label: "02", category: "Flip", noAspectFit: true,
    tags: "flip row cards turn stagger loop",
    params: flipParams({ cols: 4, rows: 1, size: 45, gap: 10, order: "Row", stagger: 100, duration: 8 }),
    build: flipBuild,
  }),
  make({
    id: "p-flip-03", label: "03", category: "Flip", noAspectFit: true,
    tags: "flip grid cards diagonal turn stagger loop",
    params: flipParams({ cols: 3, rows: 2, size: 80, gap: 6, order: "Diagonal", duration: 8 }),
    build: flipBuild,
  }),
  make({
    id: "p-flip-04", label: "04", category: "Flip", noAspectFit: true,
    tags: "flip vertical grid cards turn stagger loop",
    params: flipParams({ axis: "Vertical", cols: 3, rows: 2, size: 80, gap: 6, order: "Row", duration: 8 }),
    build: flipBuild,
  }),
  make({
    id: "p-flip-05", label: "05", category: "Flip", noAspectFit: true,
    tags: "flip grid random cards quick turn loop",
    params: flipParams({ cols: 4, rows: 3, size: 85, gap: 5, order: "Random", flipLen: 15, ease: "smooth", duration: 10 }),
    build: flipBuild,
  }),
  make({
    id: "p-flip-06", label: "06", category: "Flip", noAspectFit: true,
    tags: "flip single card vertical deep perspective shade loop",
    params: flipParams({ axis: "Vertical", direction: "Reverse", cols: 1, rows: 1, size: 65, perspective: 90, shade: 50, flipLen: 30, duration: 7 }),
    build: flipBuild,
  }),
  make({
    id: "p-flip-07", label: "07", category: "Flip", noAspectFit: true,
    tags: "flip strip fold hinge step stack belt vertical horizontal loop",
    params: flipStripParams({ stack: "Vertical", direction: "Up", visible: 3, count: 6, size: 100, duration: 12 }),
    build: flipStripBuild,
  }),
    make({
    id: "p-flip-08", label: "08", category: "Flip", noAspectFit: true,
    tags: "flip strip fold hinge step stack belt horizontal left loop",
    params: flipStripParams({ stack: "Horizontal", direction: "Left", visible: 4, count: 6, size: 100, duration: 12 }),
    build: flipStripBuild,
  }),

  // ---- Wipe ----
  make({
    id: "p-wipe-01", label: "01", category: "Wipe", noAspectFit: true,
    tags: "wipe window slide cover clip panels mirrored stagger transition loop",
    params: wipeSlideParams({ duration: 8 }),
    build: wipeSlideBuild,
  }),
  make({
    id: "p-wipe-02", label: "02", category: "Wipe", noAspectFit: true,
    tags: "wipe window slide clip single plane stagger transition loop",
    params: wipeSlideParams({ direction: "Up", count: 5, size: 70, duration: 6, ease: "linear" }).filter((p) => p.key !== "planes"),
    build: (p, ctx) => wipeSlideBuild({ ...p, planes: 1 }, ctx),
  }),
  make({
    id: "p-wipe-03", label: "03", category: "Wipe", noAspectFit: true,
    tags: "wipe cover slide over down dim depth zoom transition loop",
    params: wipeParams({ style: "Cover", direction: "Down", count: 6, size: 75, dim: 70, zoom: 10, duration: 10 }),
    build: wipeBuild,
  }),
  make({
    id: "p-wipe-04", label: "04", category: "Wipe", noAspectFit: true,
    tags: "wipe window slide clip panels feather three planes stagger transition loop",
    params: wipeSlideParams({ planes: 3, count: 9, feather: 10, duration: 8 }),
    build: wipeSlideBuild,
  }),
  make({
    id: "p-wipe-05", label: "05", category: "Wipe", noAspectFit: true,
    tags: "wipe open horizontal grow center barn door reveal transition loop",
    params: wipeParams({ style: "Open", direction: "Left", count: 5, size: 75, feather: 20, duration: 14 }),
    build: wipeBuild,
  }),
  make({
    id: "p-wipe-06", label: "06", category: "Wipe", noAspectFit: true,
    tags: "wipe open vertical grow center shutter reveal transition loop",
    params: wipeParams({ style: "Open", direction: "Up", count: 5, size: 75, duration: 14 }),
    build: wipeBuild,
  }),

  make({
    id: "p-wipe-07", label: "07", category: "Wipe", noAspectFit: true,
    tags: "wipe stripes strips slats blinds vertical slide stagger transition loop",
    params: wipeStripesParams({ strips: 8, count: 4, size: 80, duration: 8 }),
    build: wipeStripesBuild,
  }),
  make({
    id: "p-wipe-08", label: "08", category: "Wipe", noAspectFit: true,
    tags: "wipe mosaic tiles grid squares shrink stagger transition loop",
    params: wipeMosaicParams({ columns: 6, rows: 4, count: 4, size: 80, duration: 10 }),
    build: wipeMosaicBuild,
  }),

  // ---- Stack ----
  make({
    id: "p-stack-01", label: "01", category: "Stack", noAspectFit: true,
    tags: "stack deck cards throw toss shuffle loop",
    params: stackParams({ toss: "Right", spread: "Up", count: 5, size: 60, step: 8, shrink: 5, duration: 10 }),
    build: stackBuild,
  }),
  make({
    id: "p-stack-02", label: "02", category: "Stack", noAspectFit: true,
    tags: "stack deck cards throw up peek dim loop",
    params: stackParams({ toss: "Up", spread: "Down", count: 6, size: 55, step: 10, shrink: 6, dim: 40, duration: 12 }),
    build: stackBuild,
  }),
  make({
    id: "p-stack-03", label: "03", category: "Stack", noAspectFit: true,
    tags: "stack deck cards fanned tilt throw left loop",
    params: stackParams({ toss: "Left", spread: "Right", count: 5, size: 55, step: 12, shrink: 0, tilt: 4, spin: 14, duration: 10 }),
    build: stackBuild,
  }),
  make({
    id: "p-stack-04", label: "04", category: "Stack", noAspectFit: true,
    tags: "stack deck large cards slow throw smooth loop",
    params: stackParams({ toss: "Right", spread: "Left", count: 4, size: 78, step: 6, shrink: 4, hold: 40, duration: 10, ease: "smooth" }),
    build: stackBuild,
  }),

  // ---- Float ----
  make({
    id: "p-float-01", label: "01", category: "Float", noAspectFit: true,
    tags: "float drift scatter parallax depth bob loop",
    params: floatParams({ count: 8, size: 30, duration: 12 }),
    build: floatBuild,
  }),
  make({
    id: "p-float-02", label: "02", category: "Float", noAspectFit: true,
    tags: "float drift dense small planes parallax loop",
    params: floatParams({ count: 14, size: 20, spread: 90, depth: 80, drift: 60, tilt: 8, speed: 2, duration: 12 }),
    build: floatBuild,
  }),
  make({
    id: "p-float-03", label: "03", category: "Float", noAspectFit: true,
    tags: "float drift few large planes calm loop",
    params: floatParams({ count: 5, size: 50, spread: 60, depth: 40, drift: 30, tilt: 3, duration: 14 }),
    build: floatBuild,
  }),
  make({
    id: "p-float-04", label: "04", category: "Float", noAspectFit: true,
    tags: "float drift deep perspective dim parallax loop",
    params: floatParams({ count: 10, size: 26, depth: 100, perspective: 80, drift: 50, dim: 40, duration: 16 }),
    build: floatBuild,
  }),

  // ---- Helix ----
  make({
    id: "p-helix-01", label: "01", category: "Helix", noAspectFit: true,
    tags: "helix spiral vertical spin staircase loop",
    params: helixParams({ count: 14, size: 16, radius: 30, pitch: 8, stepAngle: 50, duration: 10 }),
    build: helixBuild,
  }),
  make({
    id: "p-helix-02", label: "02", category: "Helix", noAspectFit: true,
    tags: "helix spiral horizontal spin loop",
    params: helixParams({ axis: "Horizontal", count: 14, size: 18, radius: 28, pitch: 9, stepAngle: 50, duration: 10 }),
    build: helixBuild,
  }),
  make({
    id: "p-helix-03", label: "03", category: "Helix", noAspectFit: true,
    tags: "helix spiral tilted diagonal spin loop",
    params: helixParams({ count: 18, size: 12, radius: 26, pitch: 6, stepAngle: 40, tiltZ: 20, duration: 12 }),
    build: helixBuild,
  }),
  make({
    id: "p-helix-04", label: "04", category: "Helix", noAspectFit: true,
    tags: "helix spiral tight tall camera facing loop",
    params: helixParams({ facing: "Camera", count: 20, size: 11, radius: 22, pitch: 5, stepAngle: 36, duration: 12 }),
    build: helixBuild,
  }),

  // ---- Fan ----
  make({
    id: "p-fan-01", label: "01", category: "Fan", noAspectFit: true,
    tags: "fan hand cards open close pivot loop",
    params: fanParams({ motion: "Open", count: 7, size: 45, angle: 70, reach: 110, duration: 8 }),
    build: fanBuild,
  }),
  make({
    id: "p-fan-02", label: "02", category: "Fan", noAspectFit: true,
    tags: "fan hand cards sweep swing pivot loop",
    params: fanParams({ motion: "Sweep", count: 7, size: 45, angle: 50, reach: 110, sweep: 20, duration: 8 }),
    build: fanBuild,
  }),
  make({
    id: "p-fan-03", label: "03", category: "Fan", noAspectFit: true,
    tags: "fan hang down top pivot open close loop",
    params: fanParams({ pivot: "Top", count: 9, size: 38, angle: 100, reach: 150, duration: 9 }),
    build: fanBuild,
  }),
  make({
    id: "p-fan-04", label: "04", category: "Fan", noAspectFit: true,
    tags: "fan rosette circle burst open close loop",
    params: fanParams({ count: 12, size: 30, angle: 330, reach: 90, duration: 10 }),
    build: fanBuild,
  }),

  // ---- Selector ----
  make({
    id: "p-selector-01", label: "01", category: "Selector",
    tags: "selector strip thumbnails outline background image scale drift blur bar vertical loop",
    params: selectorParams({ stack: "Vertical", direction: "Forward" }),
    build: selectorBuild,
  }),
  make({
    id: "p-selector-02", label: "02", category: "Selector",
    tags: "selector strip thumbnails outline background image scale drift blur bar horizontal loop",
    params: selectorParams({ stack: "Horizontal", direction: "Forward" }),
    build: selectorBuild,
  }),

  // ---- Deck ----
  make({
    id: "p-deck-01", label: "01", category: "Deck",
    tags: "deck cards flip vertical roll stream scroll two sided loop",
    params: deckParams({}),
    build: deckBuild,
  }),
  make({
    id: "p-deck-02", label: "02", category: "Deck",
    tags: "deck cards flip horizontal sideways roll stream two sided loop",
    params: deckParams({
      direction: "Left", flip: "Horizontal", count: 6, size: 39, corner: 2, gap: 40,
      maxScale: 121, tilt: -8, distance: 36, perspective: 100,
      fxList: [{ id: 1, type: "fade", on: true, fade: 30 }],
    }),
    build: deckBuild,
  }),
  make({
    id: "p-deck-03", label: "03", category: "Deck",
    tags: "deck cards flip solo one at a time single side loop",
    params: deckParams({ solo: "On", twoSided: "Off", size: 60, gap: 0, hold: 30, duration: 14, ease: "expo-out" }),
    build: deckBuild,
  }),
  make({
    id: "p-deck-04", label: "04", category: "Deck",
    tags: "deck cards flip horizontal solo one at a time single side revolving loop",
    params: deckParams({
      direction: "Up", flip: "Horizontal", twoSided: "Off", solo: "On", count: 6, size: 59, corner: 2,
      gap: 50, maxScale: 115, tilt: 0, distance: 27, perspective: 100, fxList: [],
    }),
    build: deckBuild,
  }),
  make({
    id: "p-deck-05", label: "05", category: "Deck",
    tags: "deck cards flip vertical sideways left stream two sided loop",
    params: deckParams({
      direction: "Left", flip: "Vertical", twoSided: "On", solo: "Off", count: 6, size: 38, corner: 2,
      gap: 43, maxScale: 115, tilt: 0, distance: 22, perspective: 100, fxList: [],
    }),
    build: deckBuild,
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
export const PARAM_CATEGORIES = [
  "All",
  ...[...new Set(PARAM_ALL.map((t) => t.category))].sort((a, b) => a.localeCompare(b)),
];