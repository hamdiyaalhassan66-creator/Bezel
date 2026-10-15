import { smoothstep, vidClamp, vidEaseFn, vidEaseSpec } from "./videoMath.js";
import { hexRgba, makeCanvasGradient } from "./frameUtils.js";
import { makeGrainTile } from "./noise.js";

// Resting value of every background property. x / y = % of the canvas, w = size %, cr = radius % of the short side.
export const BG_CUSTOM_REST = { a: 1, x: 0, y: 0, s: 1, r: 0, b: 0, w: 100, cr: 0, c: null };

// ---------- Background animations ----------
export const BG_ANIM_NONE = { id: "none", label: "None", group: "" };
export const BG_ANIM_GROUPS = ["Fade", "Scale", "Mask", "Blur", "Effects"];
// pv = progress shown in the preview tile. linear = skip the smooth easing (stepped effects).
export const BG_ANIMS = [
  { id: "fade", label: "Fade", group: "Fade" },
  { id: "slide", label: "Slide", group: "Fade" },
  { id: "grow", label: "Grow", group: "Scale" },
  { id: "shrink", label: "Shrink", group: "Scale" },
  { id: "spin", label: "Spin", group: "Scale" },
  { id: "twist", label: "Twist", group: "Scale" },
  { id: "move-scale", label: "Move & Scale", group: "Scale" },
  { id: "mask-reveal", label: "Mask Reveal", group: "Mask" },
  { id: "mask-center", label: "Mask Center", group: "Mask" },
  { id: "mask-resize", label: "Mask Resize", group: "Mask" },
  { id: "mask-slide", label: "Mask & Slide", group: "Mask" },
  { id: "mask-expand", label: "Mask Expand", group: "Mask" },
  { id: "blur", label: "Blur", group: "Blur" },
  { id: "blur-slide", label: "Blur & Slide", group: "Blur" },
  { id: "blur-scale", label: "Blur & Scale", group: "Blur" },
  { id: "dissolve", label: "Dissolve", group: "Effects" },
  { id: "wipe", label: "Wipe", group: "Effects" },
  { id: "pixel", label: "Pixel", group: "Effects" },
  { id: "pixel-wipe", label: "Pixel Wipe", group: "Effects" },
  { id: "luma", label: "Luma Reveal", group: "Effects" },
  { id: "blink", label: "Blink", group: "Effects", pv: 0.3, linear: true },
  { id: "glitch", label: "Glitch", group: "Effects", pv: 0.9, linear: true },
  { id: "barrel", label: "Barrel", group: "Effects", pv: 0.95 },
  { id: "film-roll", label: "Film Roll", group: "Effects" },
];
export const BG_ANIM_BY_ID = Object.fromEntries([BG_ANIM_NONE, { id: "custom", label: "Custom", group: "" }, ...BG_ANIMS].map((a) => [a.id, a]));
export const bgProgress = (id, u, ease) => {
  if (ease) return vidClamp(vidEaseFn(vidEaseSpec(ease))(u), 0, 1);
  return BG_ANIM_BY_ID[id]?.linear ? u : smoothstep(u);
};
export const bgDefaultEase = (id) => (BG_ANIM_BY_ID[id]?.linear ? "linear" : "smooth");
const BG_DIRS = [
  { value: "left", label: "From left" },
  { value: "right", label: "From right" },
  { value: "top", label: "From top" },
  { value: "bottom", label: "From bottom" },
];
const BG_SPIN = [
  { value: "cw", label: "Clockwise" },
  { value: "ccw", label: "Counter-clockwise" },
];
const BG_FILM = [
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
];
const bgSel = (key, label, options, def) => ({ key, label, type: "select", options, def });
const bgRng = (key, label, min, max, def, hardMax) => ({ key, label, type: "range", min, max, def, hardMax });
const bgTog = (key, label, def = true) => ({ key, label, type: "toggle", def });
const BG_FADE = bgTog("fade", "Fade");

// Adjustable values per animation. `def` is what the animation used before it was adjustable.
export const BG_ANIM_PARAMS = {
  slide: [bgSel("dir", "Direction", BG_DIRS, "right"), bgRng("distance", "Distance (%)", 0, 100, 12, 300), BG_FADE],
  grow: [bgRng("scale", "Start scale (%)", 0, 100, 50), BG_FADE],
  shrink: [bgRng("scale", "Start scale (%)", 100, 300, 160, 1000), BG_FADE],
  spin: [bgSel("dir", "Direction", BG_SPIN, "cw"), bgRng("angle", "Angle (°)", 0, 360, 30, 3600), bgRng("scale", "Start scale (%)", 50, 300, 150, 1000), BG_FADE],
  twist: [bgSel("dir", "Direction", BG_SPIN, "ccw"), bgRng("angle", "Angle (°)", 0, 720, 60, 3600), bgRng("scale", "Start scale (%)", 50, 400, 190, 1000), BG_FADE],
  "move-scale": [bgSel("dir", "Direction", BG_DIRS, "left"), bgRng("distance", "Distance (%)", 0, 100, 35, 300), bgRng("scale", "Start scale (%)", 0, 100, 60), BG_FADE],
  "mask-reveal": [bgSel("dir", "Direction", BG_DIRS, "left")],
  "mask-center": [bgSel("axis", "Axis", [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }], "vertical")],
  "mask-resize": [bgRng("zoom", "Inner zoom (%)", 0, 100, 30, 300)],
  "mask-slide": [bgSel("dir", "Direction", BG_DIRS, "bottom"), bgRng("distance", "Distance (%)", 0, 100, 35, 300)],
  "mask-expand": [bgRng("x", "Origin X (%)", 0, 100, 50), bgRng("y", "Origin Y (%)", 0, 100, 50)],
  blur: [bgRng("blur", "Blur", 0, 100, 40, 300), BG_FADE],
  "blur-slide": [bgRng("blur", "Blur", 0, 100, 40, 300), bgSel("dir", "Direction", BG_DIRS, "right"), bgRng("distance", "Distance (%)", 0, 100, 12, 300), BG_FADE],
  "blur-scale": [bgRng("blur", "Blur", 0, 100, 40, 300), bgRng("scale", "Start scale (%)", 100, 300, 135, 1000), BG_FADE],
  dissolve: [bgRng("cells", "Detail", 16, 240, 96)],
  pixel: [bgRng("cells", "Pixel count", 4, 80, 14)],
  "pixel-wipe": [bgSel("dir", "Direction", BG_DIRS, "left"), bgRng("cells", "Pixel count", 4, 80, 26)],
  wipe: [bgSel("dir", "Direction", BG_DIRS, "left"), bgRng("softness", "Softness (%)", 0, 100, 3)],
  luma: [bgSel("order", "Reveal first", [{ value: "dark", label: "Dark areas" }, { value: "light", label: "Light areas" }], "light")],
  blink: [bgRng("count", "Blinks", 1, 8, 2)],
  glitch: [bgRng("slices", "Slices", 4, 40, 14), bgRng("shift", "Shift (%)", 0, 100, 40, 200)],
  barrel: [bgRng("strength", "Strength (%)", 0, 100, 70, 200)],
  "film-roll": [bgSel("dir", "Direction", BG_FILM, "up"), bgRng("rolls", "Rolls", 1, 6, 2)],
};
const bgParamDef = (id, key) => BG_ANIM_PARAMS[id]?.find((p) => p.key === key)?.def;

// kind = "enter" | "exit". Clips saved with the old single `anim` count as their enter animation.
export const bgAnimOf = (b, kind) => {
  const a = kind === "enter" && b.enter === undefined ? b.anim : b[kind];
  return a && a.id !== "none" ? { delay: 0, ...a } : null;
};

// Order-independent identity of a background, so a state change can be told apart from a snapshot being applied.
export const bgKey = (sn) =>
  JSON.stringify([sn.bgType, sn.bgHex, sn.bgOpacity, sn.gradientType, sn.gradientAngle, sn.gradientOpacity, sn.gradientStops, sn.grainAmount, sn.customBgImageUrl]);

export const bgFallbackSnap = () => ({
  bgType: "solid",
  bgOpacity: 100,
  bgHex: document.documentElement.classList.contains("dark") ? "171717" : "FAF9FA",
});

// Seeded random, so a given frame looks the same every time it's drawn.
export const bgRand = (i, seed = 0) => {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const bgScratch = {};
export const bgTmp = (key, w, h) => {
  const c = (bgScratch[key] ??= document.createElement("canvas"));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
};

// Draws src centered, with optional alpha / offset / scale / rotation (deg) / blur (px).
function bgLayer(ctx, src, W, H, o = {}) {
  const { a = 1, tx = 0, ty = 0, s = 1, r = 0, blur = 0 } = o;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  if (blur > 0.1) ctx.filter = `blur(${blur}px)`;
  ctx.translate(W / 2 + tx, H / 2 + ty);
  ctx.rotate((r * Math.PI) / 180);
  ctx.scale(s, s);
  ctx.drawImage(src, -W / 2, -H / 2, W, H);
  ctx.restore();
}

// Draws src through an alpha mask painted by paint(maskCtx).
function bgMasked(ctx, src, W, H, paint, o, key) {
  const t = bgTmp(key, W, H);
  const tc = t.getContext("2d");
  tc.imageSmoothingEnabled = true;
  tc.globalCompositeOperation = "source-over";
  tc.clearRect(0, 0, W, H);
  bgLayer(tc, src, W, H, o);
  tc.globalCompositeOperation = "destination-in";
  paint(tc);
  tc.globalCompositeOperation = "source-over";
  ctx.drawImage(t, 0, 0);
}

// Smooth value noise (used by Dissolve for organic blobs)
function bgValueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const sm = (t) => t * t * (3 - 2 * t);
  const r = (a, b) => bgRand(a * 73 + b * 179, seed);
  const top = r(xi, yi) + (r(xi + 1, yi) - r(xi, yi)) * sm(xf);
  const bot = r(xi, yi + 1) + (r(xi + 1, yi + 1) - r(xi, yi + 1)) * sm(xf);
  return top + (bot - top) * sm(yf);
}

// Draws src through a warped grid. map(u, v) takes 0..1 source coords and returns the destination [x, y] in px.
function bgMesh(ctx, src, map, nx = 8, ny = 8) {
  const sw = src.width ?? src.naturalWidth, sh = src.height ?? src.naturalHeight;
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
  const S = (i, j) => [(i / nx) * sw, (j / ny) * sh];
  const D = (i, j) => map(i / nx, j / ny);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      tri(S(i, j), S(i + 1, j), S(i, j + 1), D(i, j), D(i + 1, j), D(i, j + 1));
      tri(S(i + 1, j), S(i + 1, j + 1), S(i, j + 1), D(i + 1, j), D(i + 1, j + 1), D(i, j + 1));
    }
  }
}

const bgGrainCache = new Map();

// Paints one background snapshot (solid / gradient / image) full-frame. Returns false while an image is still loading.
export function paintBgSnap(ctx, sn, W, H, getImg) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  let ready = true;
  if (sn.bgType === "solid") {
    ctx.fillStyle = hexRgba(sn.bgHex, sn.bgOpacity);
    ctx.fillRect(0, 0, W, H);
  } else if (sn.bgType === "gradient") {
    ctx.globalAlpha = sn.gradientOpacity / 100;
    ctx.fillStyle = makeCanvasGradient(ctx, sn.gradientType, sn.gradientAngle, sn.gradientStops, 0, 0, W, H);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    if (sn.grainAmount > 0) {
      let tile = bgGrainCache.get(sn.grainAmount);
      if (!tile) bgGrainCache.set(sn.grainAmount, (tile = makeGrainTile(512, sn.grainAmount)));
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = ctx.createPattern(tile, "repeat");
      ctx.fillRect(0, 0, W, H);
    }
  } else if (sn.customBgImageUrl) {
    const img = getImg(sn.customBgImageUrl);
    if (img) {
      const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, W, H);
      ready = false;
    }
  }
  ctx.restore();
  return ready;
}

// Draws the transition from -> to at progress p (0..1) onto ctx. ns keeps scratch canvases separate between callers.
export function drawBgTransition(ctx, id, from, to, p, W, H, ns = "bg", opts = {}) {
  const i = 1 - p;
  const P = (key) => opts[key] ?? bgParamDef(id, key);
  const dirXY = (d) => ({ left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] })[d] ?? [0, 0];
  const fade = opts.fade !== false;
  const k = W / 1280; // blur radius scales with the output size
  const a = fade ? Math.min(1, p * 2.5) : 1; // quick fade-in used by the scale / blur presets
  // rect that grows from the chosen edge
  const edge = (dx, dy) => [dx > 0 ? W * i : 0, dy > 0 ? H * i : 0, dx ? W * p : W, dy ? H * p : H];
  const layer = (src, o) => bgLayer(ctx, src, W, H, o);
  const clipped = (path, o) => {
    ctx.save();
    ctx.beginPath();
    path();
    ctx.clip();
    layer(to, o);
    ctx.restore();
  };
  const masked = (paint, o) => bgMasked(ctx, to, W, H, paint, o, `${ns}-m`);
  // Reveals `to` cell by cell: a cell shows once p passes its value (0..1). soft = edge softness.
  const revealCells = (cols, valueAt, smooth, soft) => {
    const rows = Math.max(1, Math.round((cols * H) / W));
    const mc = bgTmp(`${ns}-cells`, cols, rows);
    const mx = mc.getContext("2d");
    const img = mx.createImageData(cols, rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = valueAt(x, y, cols);
        img.data[(y * cols + x) * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (p * (1 + soft) - v) / soft)));
      }
    }
    mx.putImageData(img, 0, 0);
    masked((m) => {
      m.imageSmoothingEnabled = smooth;
      m.drawImage(mc, 0, 0, W, H);
    });
  };

  ctx.clearRect(0, 0, W, H);
  if (id === "none") {
    ctx.drawImage(to, 0, 0, W, H);
    return;
  }
  ctx.drawImage(from, 0, 0, W, H);

  switch (id) {
    // Fade
    case "fade": layer(to, { a: p }); break;
    case "slide": {
      const [dx, dy] = dirXY(P("dir")), d = P("distance") / 100;
      layer(to, { a: fade ? p : 1, tx: W * dx * d * i, ty: H * dy * d * i });
      break;
    }
    // Scale
    case "grow": {
      const st = P("scale") / 100;
      layer(to, { a, s: Math.max(0.02, st + (1 - st) * p) });
      break;
    }
    case "shrink": layer(to, { a, s: 1 + (P("scale") / 100 - 1) * i }); break;
    case "spin":
    case "twist": {
      const sign = P("dir") === "ccw" ? 1 : -1;
      const ang = P("angle") * i;
      const rad = (ang * Math.PI) / 180;
      // minimum scale at which a rotated W x H rectangle still covers the frame
      const cover = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)) * Math.max(W / H, H / W);
      layer(to, { a, r: sign * ang, s: Math.max(cover, 0.02, 1 + (P("scale") / 100 - 1) * i) });
      break;
    }
    case "move-scale": {
      const [dx, dy] = dirXY(P("dir")), d = P("distance") / 100, st = P("scale") / 100;
      layer(to, { a, tx: W * dx * d * i, ty: H * dy * d * i, s: Math.max(0.02, st + (1 - st) * p) });
      break;
    }
    // Mask
    case "mask-reveal": {
      const [dx, dy] = dirXY(P("dir"));
      clipped(() => ctx.rect(...edge(dx, dy)));
      break;
    }
    case "mask-center":
      clipped(() => (P("axis") === "horizontal" ? ctx.rect((W * i) / 2, 0, W * p, H) : ctx.rect(0, (H * i) / 2, W, H * p)));
      break;
    case "mask-resize": clipped(() => ctx.rect((W * i) / 2, (H * i) / 2, W * p, H * p), { s: 1 + (P("zoom") / 100) * i }); break;
    case "mask-slide": {
      const [dx, dy] = dirXY(P("dir")), d = P("distance") / 100;
      clipped(() => ctx.rect(...edge(dx, dy)), { tx: W * dx * d * i, ty: H * dy * d * i });
      break;
    }
    case "mask-expand": {
      const ox = (P("x") / 100) * W, oy = (P("y") / 100) * H;
      const far = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));
      clipped(() => ctx.arc(ox, oy, p * far, 0, Math.PI * 2));
      break;
    }
    // Blur
    case "blur": layer(to, { a, blur: P("blur") * k * i }); break;
    case "blur-slide": {
      const [dx, dy] = dirXY(P("dir")), d = P("distance") / 100;
      layer(to, { a, blur: P("blur") * k * i, tx: W * dx * d * i, ty: H * dy * d * i });
      break;
    }
    case "blur-scale": layer(to, { a, blur: P("blur") * k * i, s: 1 + (P("scale") / 100 - 1) * i }); break;
    // Effects
    case "dissolve":
      revealCells(Math.round(P("cells")), (x, y, c) => {
        const n = bgValueNoise((x / c) * 5, (y / c) * 5, 1) * 0.65 + bgValueNoise((x / c) * 11, (y / c) * 11, 2) * 0.35;
        return Math.min(1, Math.max(0, (n - 0.2) / 0.6));
      }, true, 0.04);
      break;
    case "pixel": revealCells(Math.round(P("cells")), (x, y, c) => bgRand(y * c + x, 2), false, 0.001); break;
    case "pixel-wipe": {
      const [dx, dy] = dirXY(P("dir"));
      revealCells(Math.round(P("cells")), (x, y, c) => {
        const rows = Math.max(1, Math.round((c * H) / W));
        const u = dx ? (dx < 0 ? x / c : 1 - x / c) : dy < 0 ? y / rows : 1 - y / rows;
        return u * 0.75 + bgRand(y * c + x, 3) * 0.25;
      }, false, 0.001);
      break;
    }
    case "wipe": {
      const [dx, dy] = dirXY(P("dir"));
      const f = P("softness") / 100, e = p * (1 + f);
      masked((m) => {
        const g = dx
          ? m.createLinearGradient(dx < 0 ? 0 : W, 0, dx < 0 ? W : 0, 0)
          : m.createLinearGradient(0, dy < 0 ? 0 : H, 0, dy < 0 ? H : 0);
        g.addColorStop(Math.min(1, Math.max(0, e - f)), "#000");
        g.addColorStop(Math.min(1, Math.max(0, e)), "rgba(0,0,0,0)");
        m.fillStyle = g;
        m.fillRect(0, 0, W, H);
      });
      break;
    }
    case "luma": {
      // dark areas of the incoming background appear first
      const sw = 48, sh = Math.max(1, Math.round((sw * H) / W));
      const sc = bgTmp(`${ns}-luma`, sw, sh);
      const sx = sc.getContext("2d", { willReadFrequently: true });
      sx.drawImage(to, 0, 0, sw, sh);
      const d = sx.getImageData(0, 0, sw, sh).data;
      revealCells(sw, (x, y, c) => {
        const j = (y * c + x) * 4;
        const lum = (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) / 255;
        return (P("order") === "light" ? 1 - lum : lum) * 0.85 + bgRand(y * c + x, 4) * 0.15;
      }, true, 0.12);
      break;
    }
    case "blink": {
      const steps = 2 * Math.max(1, Math.round(P("count"))) + 1;
      const idx = Math.min(steps - 1, Math.floor(p * steps));
      layer(to, { a: idx === steps - 1 ? 1 : idx % 2 });
      break;
    }
    case "glitch": {
      const n = Math.max(2, Math.round(P("slices"))), step = Math.floor(p * 18);
      const grow = 0.15 + 0.85 * p;
      const w = W * Math.min(1, grow * (1 + 0.9 * i)), h = H * grow; // starts wider than tall
      const x0 = (W - w) / 2, y0 = (H - h) / 2;
      const fr = W * 0.02 * i; // red / cyan fringe, fades out
      const sH = to.height / n;
      for (let b = 0; b < n; b++) {
        const live = p < 0.99 && bgRand(b, step) < 0.55 * i + 0.05;
        if (live && bgRand(b, step + 120) < 0.18) continue; // dropped slice leaves a gap
        const dx = live ? (bgRand(b, step + 50) - 0.5) * (P("shift") / 100) * w * i * 1.2 : 0;
        const dy = y0 + (h * b) / n, dh = h / n + 1;
        if (fr > 0.5) {
          ctx.fillStyle = "#ff2d2d";
          ctx.fillRect(x0 + dx + fr, dy, w, dh);
          ctx.fillStyle = "#19e0ff";
          ctx.fillRect(x0 + dx - fr, dy, w, dh);
        }
        ctx.drawImage(to, 0, sH * b, to.width, sH * (dh / (h / n)), x0 + dx, dy, w, dh);
      }
      break;
    }
    case "barrel": {
      const s = 0.12 + 0.88 * p; // grows from small to full size
      const k = (P("strength") / 100) * i; // warp relaxes to flat
      bgMesh(ctx, to, (u, v) => {
        const x = (u - 0.5) * 2, y = (v - 0.5) * 2;
        const f = Math.max(0.05, 1 - k * 0.5 * (x * x + y * y)); // corners pulled in more, so the edges bow out
        return [W / 2 + (x * f * s * W) / 2, H / 2 + (y * f * s * H) / 2];
      }, 12, 12);
      break;
    }
    case "film-roll": {
      const rolls = Math.max(1, Math.round(P("rolls")));
      const Pd = H * 1.18; // one reel unit: the image plus its black gap
      const split = 0.3; // first 30%: the reel rises from the bottom, then it rolls and settles
      ctx.save();
      if (P("dir") === "down") {
        ctx.translate(0, H);
        ctx.scale(1, -1);
      }
      const settle = p <= split ? 0 : 1 - Math.pow(1 - (p - split) / (1 - split), 3);
      const a = p >= split ? 1 : smoothstep(p / split);
      const bow = H * 0.12 * (1 - settle);
      const o = rolls * Pd * (1 - settle);
      const arch = (u) => bow * (1 - (2 * u - 1) ** 2);
      ctx.fillStyle = "#000";
      if (a < 1) {
        const top = H - a * Pd;
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, top);
        ctx.quadraticCurveTo(W / 2, top - 2 * bow, W, top);
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, W, H);
      }
      const k0 = a < 1 ? rolls : -1, k1 = a < 1 ? rolls : rolls + 1;
      for (let k = k0; k <= k1; k++) {
        const y = o - k * Pd;
        const top = H - a * (H - y) - bow, bottom = H - a * (H - (y + H));
        if (bottom < -2 || top > H + 2) continue;
        bgMesh(ctx, to, (u, v) => [u * W, H - a * (H - (y + v * H)) - arch(u)], 10, 8);
      }
      ctx.restore();
      break;
    }
    case "custom": {
      const f = { ...BG_CUSTOM_REST, ...(opts.from ?? {}) };
      const size = f.w / 100 + (1 - f.w / 100) * p;
      const radius = (f.cr / 100) * Math.min(W, H) * i;
      ctx.save();
      if (f.w < 100 || f.cr > 0) {
        ctx.beginPath();
        ctx.roundRect((W * (1 - size)) / 2, (H * (1 - size)) / 2, W * size, H * size, radius);
        ctx.clip();
      }
      layer(to, {
        a: f.a + (1 - f.a) * p,
        tx: (f.x / 100) * W * i,
        ty: (f.y / 100) * H * i,
        s: Math.max(0.02, f.s + (1 - f.s) * p),
        r: f.r * i,
        blur: f.b * k * i,
      });
      if (f.c) {
        ctx.globalAlpha = i; // color wash that fades out
        ctx.fillStyle = `#${f.c}`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      break;
    }
    default: layer(to, {});
  }
}

// Preview tiles: demo artwork, so every effect is visible whatever the real backgrounds are.
let bgDemoCache = null;
function bgDemo(W, H) {
  if (bgDemoCache?.W === W) return bgDemoCache;
  const mk = (draw) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    draw(c.getContext("2d"));
    return c;
  };
  const from = mk((x) => {
    x.fillStyle = "#2A2A30";
    x.fillRect(0, 0, W, H);
  });
  const to = mk((x) => {
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#FF47BC");
    g.addColorStop(1, "#6A2EE8");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(255,255,255,0.9)";
    x.beginPath();
    x.arc(W * 0.3, H * 0.4, H * 0.22, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "rgba(255,255,255,0.35)";
    x.fillRect(W * 0.55, H * 0.25, W * 0.3, H * 0.5);
  });
  return (bgDemoCache = { W, from, to });
}
export function drawBgAnimPreview(canvas, id, p, art, opts) {
  if (!canvas) return;
  const { from, to } = art ?? bgDemo(canvas.width, canvas.height);
  drawBgTransition(canvas.getContext("2d"), id, from, to, p, canvas.width, canvas.height, "thumb", opts);
}