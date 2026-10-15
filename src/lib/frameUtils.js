const GRAIN_BG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

// Noise effect: larger "size" = lower turbulence frequency = bigger grains.
export const makeGrainUrl = (size) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${(1.4 / (1 + size * 0.5)).toFixed(3)}' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export const EFFECT_TYPE_OPTIONS = [
  { value: "dropShadow", label: "Drop shadow" },
  { value: "layerBlur", label: "Layer blur" },
  { value: "noise", label: "Grain" },
];

export const STROKE_POSITIONS = [
  { value: "inside", label: "Inside" },
  { value: "center", label: "Center" },
  { value: "outside", label: "Outside" },
];

// ---------- Frame-mode camera (mirrors MockupScene's zoom / fov / rotation mapping) ----------
const CAM_DIST = (zoom) => 22 - (zoom / 100) * 17;
const CAM_FOV_DEG = (fov) => 15 + (fov / 120) * 75;
export const CAM_DEFAULT = { rotationX: 0, rotationY: 0, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 };
export const isDefaultCamera = (c) => Object.keys(CAM_DEFAULT).every((k) => c[k] === CAM_DEFAULT[k]);

export function getFrameCamera(cam, H) {
  const dRef = CAM_DIST(CAM_DEFAULT.zoom);
  const tRef = Math.tan((CAM_FOV_DEG(CAM_DEFAULT.fov) * Math.PI) / 360);
  const d = CAM_DIST(cam.zoom);
  const t = Math.tan((CAM_FOV_DEG(cam.fov) * Math.PI) / 360);
  const k = H / (2 * dRef * tRef); // px per world unit, so the default view is 1:1
  return {
    p: d * k,
    s: (dRef * tRef) / (d * t),
    tx: (cam.positionX / 25) * k,
    ty: (-cam.positionY / 25) * k,
    a: -cam.rotationX, // three.js and CSS disagree on X/Z direction
    b: cam.rotationY,
    c: -cam.rotationZ,
  };
}

export const frameCameraCss = (g) =>
  `scale(${g.s}) perspective(${g.p}px) translate3d(${g.tx}px, ${g.ty}px, 0) rotateX(${g.a}deg) rotateY(${g.b}deg) rotateZ(${g.c}deg)`;

// Same transform as the CSS above, for export.
function projectFramePoint(g, W, H, x, y) {
  const r = Math.PI / 180;
  let X = x - W / 2, Y = y - H / 2, Z = 0;
  const cz = Math.cos(g.c * r), sz = Math.sin(g.c * r);
  [X, Y] = [X * cz - Y * sz, X * sz + Y * cz];
  const cy = Math.cos(g.b * r), sy = Math.sin(g.b * r);
  [X, Z] = [X * cy + Z * sy, -X * sy + Z * cy];
  const cx = Math.cos(g.a * r), sx = Math.sin(g.a * r);
  [Y, Z] = [Y * cx - Z * sx, Y * sx + Z * cx];
  X += g.tx;
  Y += g.ty;
  const f = g.p / Math.max(1, g.p - Z);
  return [W / 2 + X * f * g.s, H / 2 + Y * f * g.s];
}

// Canvas 2D has no perspective, so the layer is drawn as a grid of affine triangles.
export function drawWarped(ctx, src, g, W, H, n = 16, region = { x: 0, y: 0, w: W, h: H }) {
  const tri = (s0, s1, s2, d0, d1, d2) => {
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    const grow = (pt) => {
      const vx = pt[0] - cx, vy = pt[1] - cy, len = Math.hypot(vx, vy) || 1;
      return [pt[0] + (vx / len) * 0.6, pt[1] + (vy / len) * 0.6]; // hides hairline seams
    };
    const [e0, e1, e2] = [grow(d0), grow(d1), grow(d2)];
    const u1x = s1[0] - s0[0], u1y = s1[1] - s0[1], u2x = s2[0] - s0[0], u2y = s2[1] - s0[1];
    const v1x = d1[0] - d0[0], v1y = d1[1] - d0[1], v2x = d2[0] - d0[0], v2y = d2[1] - d0[1];
    const det = u1x * u2y - u2x * u1y;
    if (!det) return;
    const a = (v1x * u2y - v2x * u1y) / det;
    const c = (v2x * u1x - v1x * u2x) / det;
    const b = (v1y * u2y - v2y * u1y) / det;
    const d = (v2y * u1x - v1y * u2x) / det;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(e0[0], e0[1]);
    ctx.lineTo(e1[0], e1[1]);
    ctx.lineTo(e2[0], e2[1]);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]);
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  };
  const S = (i, j) => [(i / n) * src.width, (j / n) * src.height];
  const D = (i, j) => projectFramePoint(g, W, H, region.x + (i / n) * region.w, region.y + (j / n) * region.h);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      tri(S(i, j), S(i + 1, j), S(i, j + 1), D(i, j), D(i + 1, j), D(i, j + 1));
      tri(S(i + 1, j), S(i + 1, j + 1), S(i, j + 1), D(i + 1, j), D(i + 1, j + 1), D(i, j + 1));
    }
  }
}

// ---------- Frame-mode environment: a 2D glare that shifts with the camera ----------
const FRAME_ENV_SHEEN = {
  none: null,
  studio: { angle: 120, stops: [[0, "rgba(255,255,255,0.28)"], [0.35, "rgba(255,255,255,0.06)"], [0.6, "rgba(255,255,255,0)"], [1, "rgba(255,255,255,0.10)"]] },
  city: { angle: 150, stops: [[0, "rgba(120,170,255,0.26)"], [0.5, "rgba(255,255,255,0)"], [1, "rgba(255,150,90,0.22)"]] },
  forest: { angle: 160, stops: [[0, "rgba(190,255,190,0.22)"], [0.5, "rgba(255,255,255,0)"], [1, "rgba(30,90,40,0.28)"]] },
  clouds: { angle: 135, stops: [[0, "rgba(255,255,255,0.34)"], [0.5, "rgba(220,235,255,0.10)"], [1, "rgba(255,255,255,0.20)"]] },
};
const sheenAngle = (env, rx, ry) => (FRAME_ENV_SHEEN[env]?.angle ?? 0) + ry * 0.4 - rx * 0.4;
export const sheenCss = (env, rx, ry) => {
  const s = FRAME_ENV_SHEEN[env];
  if (!s) return null;
  return `linear-gradient(${sheenAngle(env, rx, ry)}deg, ${s.stops.map(([p, c]) => `${c} ${p * 100}%`).join(", ")})`;
};
export function paintSheen(ctx, x, y, w, h, env, rx, ry) {
  const s = FRAME_ENV_SHEEN[env];
  if (!s) return;
  const rad = (sheenAngle(env, rx, ry) * Math.PI) / 180;
  const dx = Math.sin(rad), dy = -Math.cos(rad);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = x + w / 2, cy = y + h / 2;
  const g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
  s.stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

// ---------- Frame back ----------
export const hexRgba = (hex, pct) => {
  const n = parseInt(hex || "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${pct / 100})`;
};

// True when the frame's normal points away from the camera (same rotation order as frameCameraCss).
export const isFrameBackFacing = (c) =>
  Math.cos((c.rotationX * Math.PI) / 180) * Math.cos((c.rotationY * Math.PI) / 180) < -1e-6;

export function buildGradientCss(type, angle, stops) {
  const items = [...stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${hexRgba(s.hex, s.opacity)} ${s.position}%`);
  const list = (items.length === 1 ? [items[0], items[0]] : items).join(", ");
  switch (type) {
    case "Radial":
      return `radial-gradient(circle, ${list})`;
    case "Angular":
      return `conic-gradient(from ${angle}deg, ${list})`;
    case "Diamond":
      return `conic-gradient(from ${(angle + 45) % 360}deg, ${list})`;
    default:
      return `linear-gradient(${angle}deg, ${list})`;
  }
}

// Canvas twin of buildGradientCss, for export.
export function makeCanvasGradient(ctx, type, angle, stops, x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2;
  let g;
  if (type === "Radial") {
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) / 2);
  } else if (type === "Angular" || type === "Diamond") {
    const from = (type === "Diamond" ? angle + 45 : angle) - 90;
    g = ctx.createConicGradient((from * Math.PI) / 180, cx, cy);
  } else {
    const rad = (angle * Math.PI) / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const len = Math.abs(w * dx) + Math.abs(h * dy);
    g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
  }
  [...stops]
    .sort((a, b) => a.position - b.position)
    .forEach((s) => g.addColorStop(Math.min(1, Math.max(0, s.position / 100)), hexRgba(s.hex, s.opacity)));
  return g;
}

export function makeEffect(type, id) {
  switch (type) {
    case "layerBlur":
      return { id, type, visible: true, blur: 8 };
    case "noise":
      return { id, type, visible: true, amount: 20, size: 2 };
    default:
      return { id, type: "dropShadow", visible: true, x: 0, y: 24, blur: 60, spread: 0, hex: "000000", opacity: 25 };
  }
}

// Same shadow the frame used to have hardcoded, now editable.
export const DEFAULT_FRAME_EFFECTS = () => [];
export const DEFAULT_STROKE = { on: false, hex: "FFFFFF", opacity: 100, width: 2, position: "inside" };