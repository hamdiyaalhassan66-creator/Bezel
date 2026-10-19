// Canvas-wide effects, shared by the live canvas (FrameLayer) and the export (App.renderFrameCanvas).

const cache = new Map();
const remember = (key, make) => {
  if (cache.has(key)) return cache.get(key);
  const v = make();
  cache.set(key, v);
  if (cache.size > 12) cache.delete(cache.keys().next().value);
  return v;
};

// Bilinear sample that weights colors by alpha, so transparent edges don't turn dark.
function sampleInto(src, W, H, sx, sy, out, oi) {
  const x0 = Math.floor(sx), y0 = Math.floor(sy);
  const fx = sx - x0, fy = sy - y0;
  let r = 0, g = 0, b = 0, a = 0;
  for (let j = 0; j < 2; j++) {
    const yy = Math.min(H - 1, Math.max(0, y0 + j));
    const wy = j ? fy : 1 - fy;
    for (let i = 0; i < 2; i++) {
      const xx = Math.min(W - 1, Math.max(0, x0 + i));
      const wa = (i ? fx : 1 - fx) * wy * src[(yy * W + xx) * 4 + 3];
      const p = (yy * W + xx) * 4;
      r += src[p] * wa; g += src[p + 1] * wa; b += src[p + 2] * wa; a += wa;
    }
  }
  if (a > 0) {
    out[oi] = r / a; out[oi + 1] = g / a; out[oi + 2] = b / a; out[oi + 3] = a;
  } else {
    out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0;
  }
}

// ---------------- Fish eye ----------------
// Output point (u, v) in [-1, 1] samples the source at (u, v) * f, with f = (1 + k s) / (1 + k) and s = (u² + v²) / 2.
// The centre is magnified, the corners stay put, and nothing samples outside the canvas.
const fishK = (amount) => (amount / 100) * 2;
const fishF = (u, v, k) => (1 + (k * (u * u + v * v)) / 2) / (1 + k);

// Live: a displacement map for feDisplacementMap. Red = x offset, green = y offset, 0.5 = no shift.
export function fishEyeMap(w, h, amount) {
  return remember(`fish:${Math.round(w)}x${Math.round(h)}:${amount}`, () => {
    const k = fishK(amount);
    // pass 1 scale: offsets are (channel - 0.5) * S. The largest real offset is ~0.272 * size * k / (1 + k).
    const S = Math.max(1, (0.56 * Math.max(w, h) * k) / (1 + k));
    const S2 = S / 255; // pass 2 scale: covers exactly one step of pass 1, so its own steps are ~255x finer
    const sc = Math.min(1, 2000 / Math.max(w, h)); // full resolution, so the filter doesn't interpolate and re-round the map
    const mw = Math.max(2, Math.round(w * sc)), mh = Math.max(2, Math.round(h * sc));
    const mk = () => {
      const c = document.createElement("canvas");
      c.width = mw; c.height = mh;
      const ctx = c.getContext("2d");
      return { c, ctx, img: ctx.createImageData(mw, mh) };
    };
    const A = mk(), B = mk();
    const fill = (d, i, rx, ry, b) => {
      d[i] = rx; d[i + 1] = ry; d[i + 2] = 128; d[i + 3] = 255;
    };
    for (let y = 0; y < mh; y++) {
      const v = ((y + 0.5) / mh) * 2 - 1;
      for (let x = 0; x < mw; x++) {
        const u = ((x + 0.5) / mw) * 2 - 1;
        const f1 = fishF(u, v, k) - 1;
        const ox = u * f1 * (w / 2), oy = v * f1 * (h / 2); // the exact offset in px
        const qx = Math.round(255 * (0.5 + ox / S)), qy = Math.round(255 * (0.5 + oy / S));
        const rx = ox - (qx / 255 - 0.5) * S, ry = oy - (qy / 255 - 0.5) * S; // what pass 1 couldn't represent
        const i = (y * mw + x) * 4;
        fill(A.img.data, i, qx, qy);
        fill(B.img.data, i, Math.round(255 * (0.5 + rx / S2)), Math.round(255 * (0.5 + ry / S2)));
      }
    }
    A.ctx.putImageData(A.img, 0, 0);
    B.ctx.putImageData(B.img, 0, 0);
    return {
      url: A.c.toDataURL("image/png"), scale: S,
      url2: B.c.toDataURL("image/png"), scale2: S2,
    };
  });
}

// Export: remaps the pixels inside rect.
export function applyFishEye(canvas, amount, rect) {
  const ctx = canvas.getContext("2d");
  const L = Math.round(rect.left), T = Math.round(rect.top);
  const W = Math.round(rect.width), H = Math.round(rect.height);
  const src = ctx.getImageData(L, T, W, H).data;
  const out = ctx.createImageData(W, H);
  const k = fishK(amount);
  for (let y = 0; y < H; y++) {
    const v = ((y + 0.5) / H) * 2 - 1;
    for (let x = 0; x < W; x++) {
      const u = ((x + 0.5) / W) * 2 - 1;
      const f = fishF(u, v, k);
      sampleInto(src, W, H, ((u * f + 1) / 2) * W - 0.5, ((v * f + 1) / 2) * H - 0.5, out.data, (y * W + x) * 4);
    }
  }
  ctx.putImageData(out, L, T);
}

// ---------------- Vignette ----------------
export function vignetteStops(v) {
  const inner = v.size / 100;
  return { inner, outer: Math.min(1, inner + Math.max(0.01, v.feather / 100)), alpha: v.amount / 100 };
}

export function paintVignette(ctx, w, h, v) {
  const { inner, outer, alpha } = vignetteStops(v);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2); // circle, farthest corner (same as the CSS)
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(inner, "rgba(0,0,0,0)");
  g.addColorStop(outer, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// ---------------- Liquid glass ----------------
// W, H = the canvas rect the lens is placed in. Everything derives from fractions of the lens size,
// so the live preview and any export size look the same.
export function lensGeometry(W, H, g) {
  const lw = (g.width / 100) * W, lh = (g.height / 100) * H;
  const m = Math.min(lw, lh);
  return {
    lw, lh,
    cx: W / 2 + (g.x / 100) * W,
    cy: H / 2 + (g.y / 100) * H,
    radius: (g.radius / 100) * (m / 2),
    bw: m * 0.3, // width of the refracting rim
    maxShift: (g.refraction / 100) * m * 0.18,
  };
}

// signed distance to a rounded box (negative inside) and its outward normal; px, py relative to the centre
function roundedBox(px, py, hx, hy, r) {
  const qx = Math.abs(px) - (hx - r), qy = Math.abs(py) - (hy - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  const len = Math.hypot(ox, oy);
  const sdf = len + Math.min(Math.max(qx, qy), 0) - r;
  let nx, ny;
  if (qx > 0 && qy > 0) { nx = ox / len; ny = oy / len; }
  else if (qx > qy) { nx = 1; ny = 0; }
  else { nx = 0; ny = 1; }
  return { sdf, nx: px < 0 ? -nx : nx, ny: py < 0 ? -ny : ny };
}

// Where a lens pixel looks: near the rim it samples from further inside (the rim magnifies), never outside the lens.
function lensShift(px, py, lens) {
  const { sdf, nx, ny } = roundedBox(px, py, lens.lw / 2, lens.lh / 2, lens.radius);
  if (sdf >= 0 || lens.maxShift <= 0) return [0, 0];
  const t = 1 - Math.min(1, -sdf / lens.bw);
  const m = lens.maxShift * t * t;
  return [-nx * m, -ny * m];
}

// Live: displacement map for the backdrop filter
export function lensMap(lens) {
  const key = [lens.lw, lens.lh, lens.radius, lens.bw, lens.maxShift].map((n) => n.toFixed(1)).join(":");
  return remember(`lens:${key}`, () => {
    const S = Math.max(1, lens.maxShift * 2);
    const sc = Math.min(1, 256 / Math.max(lens.lw, lens.lh));
    const mw = Math.max(2, Math.ceil(lens.lw * sc)), mh = Math.max(2, Math.ceil(lens.lh * sc));
    const c = document.createElement("canvas");
    c.width = mw; c.height = mh;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(mw, mh);
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        const [dx, dy] = lensShift(((x + 0.5) / mw) * lens.lw - lens.lw / 2, ((y + 0.5) / mh) * lens.lh - lens.lh / 2, lens);
        const i = (y * mw + x) * 4;
        img.data[i] = Math.round(255 * (0.5 + dx / S));
        img.data[i + 1] = Math.round(255 * (0.5 + dy / S));
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return { url: c.toDataURL("image/png"), scale: S };
  });
}

// Export: refract, blur, clip to the rounded box, tint, rim light.
export function applyLiquidGlass(canvas, g, rect, k) {
  const g0 = lensGeometry(rect.width, rect.height, g);
  const L = Math.round(rect.left + g0.cx - g0.lw / 2);
  const T = Math.round(rect.top + g0.cy - g0.lh / 2);
  const W = Math.max(1, Math.round(g0.lw)), H = Math.max(1, Math.round(g0.lh));
  const lens = { ...g0, lw: W, lh: H };
  const blur = g.blur * k;
  const m = Math.ceil(blur * 2) + 2; // margin of real content, so the blur doesn't fade at the lens edge
  const PW = W + 2 * m, PH = H + 2 * m;

  const pad = document.createElement("canvas");
  pad.width = PW; pad.height = PH;
  const pctx = pad.getContext("2d");
  pctx.drawImage(canvas, m - L, m - T);
  const src = pctx.getImageData(0, 0, PW, PH);
  const out = pctx.createImageData(PW, PH);
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const oi = (y * PW + x) * 4;
      const [dx, dy] = lensShift(x + 0.5 - m - W / 2, y + 0.5 - m - H / 2, lens);
      if (dx === 0 && dy === 0) {
        out.data[oi] = src.data[oi]; out.data[oi + 1] = src.data[oi + 1];
        out.data[oi + 2] = src.data[oi + 2]; out.data[oi + 3] = src.data[oi + 3];
      } else sampleInto(src.data, PW, PH, x + dx, y + dy, out.data, oi);
    }
  }
  pctx.putImageData(out, 0, 0);

  const soft = document.createElement("canvas");
  soft.width = PW; soft.height = PH;
  const sctx = soft.getContext("2d");
  if (blur > 0) sctx.filter = `blur(${blur}px)`;
  sctx.drawImage(pad, 0, 0);

  const ctx = canvas.getContext("2d");
  const r = Math.min(lens.radius, W / 2, H / 2);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(L, T, W, H, r);
  ctx.clip();
  ctx.clearRect(L, T, W, H);
  ctx.drawImage(soft, m, m, W, H, L, T, W, H);
  if (g.tint > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(g.tint / 100) * 0.35})`;
    ctx.fillRect(L, T, W, H);
  }
  const rim = ctx.createLinearGradient(0, T, 0, T + H);
  rim.addColorStop(0, "rgba(255,255,255,0.6)");
  rim.addColorStop(0.5, "rgba(255,255,255,0.18)");
  rim.addColorStop(1, "rgba(255,255,255,0.3)");
  ctx.strokeStyle = rim;
  ctx.lineWidth = 3 * k; // only the inner half shows inside the clip
  ctx.beginPath();
  ctx.roundRect(L, T, W, H, r);
  ctx.stroke();
  ctx.restore();
}

// Shared glass maths for the live overlay, the export and (mirrored in GLSL) the Mockup shader.
// canvasH is the canvas height in the same px as `k` scales to.
export const FROST_POW = 1.6; // how fast the blur eases out toward the inner edge of the band

// peak slope of the bend at splay 0 -> 100. Above 1 the very edge folds over (the Figma look).
export const GLASS_SLOPE = [0.9, 1.6];

const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// Offset in px for a point in a band: [x, y-toward-inside]. d = distance from the band's canvas edge, x = position across the width.
// The horizontal part uses the same profile measured from the nearest side edge, and fades out going inward.
export function glassVec(p, x, d, W) {
  const oy = glassOffset(p, d);
  // sample toward the centre, more at the edge: content is scaled outward and the sides flare
  const k = p.flare * Math.pow(1 - Math.min(1, d / p.depth), p.curve);
  const ox = (W / 2 - x) * k;
  return [ox, oy];
}

export function glassProfile(g, canvasH, k = 1) {
  const bandH = Math.max(1, Math.round(Math.min(0.5, (g.height ?? 12) / 100) * canvasH));
  const refr = (g.refraction ?? 80) / 100;
  const splay = (g.splay ?? 0) / 100;
const baseDepth = Math.min(bandH, Math.max(1, bandH * ((g.depth ?? 73) / 100)));
const depth = baseDepth + (bandH - baseDepth) * splay;
const curve = 3 - splay;
const dspAmt = ((g.dispersion ?? 50) / 100) * 0.25;
// fringe width in px, fixed by the splay-0 bend so splay can't widen the colour ring
const dspPx = dspAmt * ((refr * GLASS_SLOPE[0] * baseDepth) / (3 * (1 + dspAmt)));
const slope = GLASS_SLOPE[0] + (GLASS_SLOPE[1] - GLASS_SLOPE[0]) * splay;
// the most displaced channel (green shift + fringe) hits exactly `slope`
const shift = Math.max(0.001, (refr * slope * depth) / curve - dspPx);
const dsp = dspPx / shift;
  // outward flare: how much the content is scaled sideways at the very edge (0.2-0.45), never reaches 1 so it can't fold
  const flare = refr * (0.2 + 0.25 * splay);
  return {
    bandH, depth, baseDepth, curve, shift, dsp, flare,
    light: (g.lightIntensity ?? 80) / 100,
    ly: Math.sin(((g.lightAngle ?? -102) * Math.PI) / 180),
    frost: (g.frost ?? 4) * 0.5 * k,
  };
}
export const glassOffset = (p, d) => Math.pow(1 - Math.min(1, d / p.depth), p.curve) * p.shift;
// blur radius at distance d from the canvas edge: full at the edge, easing to 0 at the band end
export const glassFrost = (p, d) => p.frost * Math.pow(Math.max(0, 1 - d / p.bandH), FROST_POW);

// Live overlay: stack of backdrop-blur layers, radii halve each step (same trick as progressive blur).
// t0 = layer is fully on until here, t1 = fully gone by here (both 0-1 across the band, edge -> inside).
export function frostLayers(frost) {
  const out = [];
  const norm = 0.866; // all layers are on at the edge and compound as sqrt(sum of squares) ~ 1.155x
  for (let j = 0; j < 8; j++) {
    const blur = (frost * norm) / Math.pow(2, j);
    if (blur < 0.35) break;
    out.push({
      blur,
      t0: j === 0 ? 0 : 1 - Math.pow(2, -j / FROST_POW),
      t1: 1 - Math.pow(2, -(j + 1) / FROST_POW),
    });
  }
  return out;
}

function blurred(src, w, h, px) {
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const c = out.getContext("2d", { willReadFrequently: true });
  if (px < 0.5) { c.drawImage(src, 0, 0); return out; }
  if ("filter" in c) { c.filter = `blur(${px}px)`; c.drawImage(src, 0, 0); return out; }
  // no ctx.filter (Safari): approximate with a down / up scale
  const s = Math.max(1, Math.round(px / 2));
  const t = document.createElement("canvas");
  t.width = Math.max(1, Math.ceil(w / s)); t.height = Math.max(1, Math.ceil(h / s));
  const tc = t.getContext("2d");
  tc.imageSmoothingQuality = "high";
  tc.drawImage(src, 0, 0, t.width, t.height);
  c.imageSmoothingQuality = "high";
  c.drawImage(t, 0, 0, w, h);
  return out;
}

// Liquid glass bands on the top and bottom canvas edges, drawn over a finished canvas.
const GLASS_LEVELS = 8; // radii: 0, f/64, f/32, ... f/2, f

export function paintGlassBands(ctx, W, H, g, k = 1) {
  const p = glassProfile(g, H, k);
  const { bandH } = p;
  const ext = Math.ceil(p.shift * (1 + p.dsp)) + 2;
  const rh = Math.min(H, bandH + ext);
  const rimW = Math.max(2 * k, p.baseDepth * 0.25);
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  const frosted = p.frost > 0.1;
  const radii = Array.from({ length: GLASS_LEVELS }, (_, i) => (i === 0 || !frosted ? 0 : p.frost / Math.pow(2, GLASS_LEVELS - 1 - i)));
  const levelPos = (b) =>
    !frosted ? 0 : b <= radii[1] ? b / radii[1] : Math.min(GLASS_LEVELS - 1, 1 + Math.log2(b / radii[1]));

  const snap = document.createElement("canvas");
  snap.width = W; snap.height = H;
  snap.getContext("2d").drawImage(ctx.canvas, 0, 0);

  ["top", "bottom"].forEach((side) => {
    const top = side === "top";
    const strip = document.createElement("canvas");
    strip.width = W; strip.height = rh;
    strip.getContext("2d").drawImage(snap, 0, top ? 0 : H - rh, W, rh, 0, 0, W, rh);
    const levels = (frosted ? radii : [0]).map((r) => blurred(strip, W, rh, r).getContext("2d").getImageData(0, 0, W, rh).data);

    const out = new ImageData(W, bandH);
    const od = out.data;
    const rowOff = top ? 0 : rh - bandH;
    const dir = top ? 1 : -1;
    const facing = (top ? -1 : 1) * p.ly;
    const lightK = Math.max(facing, 0) + Math.max(-facing, 0) * 0.35;

const sample = (sx, sy, c, lo, up, lf) => {
  const xx = Math.min(W - 1, Math.max(0, sx));
  const x1 = Math.floor(xx), x2 = Math.min(W - 1, x1 + 1), fx = xx - x1;
  const yy = Math.min(rh - 1, Math.max(0, sy));
  const y1 = Math.floor(yy), y2 = Math.min(rh - 1, y1 + 1), f = yy - y1;
  const at = (dd) => {
    const a = dd[(y1 * W + x1) * 4 + c] * (1 - fx) + dd[(y1 * W + x2) * 4 + c] * fx;
    const b = dd[(y2 * W + x1) * 4 + c] * (1 - fx) + dd[(y2 * W + x2) * 4 + c] * fx;
    return a * (1 - f) + b * f;
  };
  return lf > 0 ? at(levels[lo]) * (1 - lf) + at(levels[up]) * lf : at(levels[lo]);
};

for (let j = 0; j < bandH; j++) {
  const d = top ? j + 0.5 : bandH - j - 0.5;
  const row = j + rowOff;
  const hi = Math.min(1, lightK * (1 - smooth(0, rimW, d)) * p.light * 0.9) * 255;
  const pos = levelPos(glassFrost(p, d));
  const lo = Math.floor(pos), up = Math.min(levels.length - 1, lo + 1), lf = up === lo ? 0 : pos - lo;
  for (let x = 0; x < W; x++) {
    const [ox, oy] = glassVec(p, x + 0.5, d, W);
    const i = (j * W + x) * 4;
    od[i]     = Math.min(255, sample(x + ox * (1 + p.dsp), row + dir * oy * (1 + p.dsp), 0, lo, up, lf) + hi);
    od[i + 1] = Math.min(255, sample(x + ox,               row + dir * oy,               1, lo, up, lf) + hi);
    od[i + 2] = Math.min(255, sample(x + ox * (1 - p.dsp), row + dir * oy * (1 - p.dsp), 2, lo, up, lf) + hi);
    od[i + 3] = 255;
  }
}

    for (let j = 0; j < bandH; j++) {
      const d = top ? j + 0.5 : bandH - j - 0.5;
      const o = glassOffset(p, d);
      const row = j + rowOff;
      const hi = Math.min(1, lightK * (1 - smooth(0, rimW, d)) * p.light * 0.9) * 255;
      const pos = levelPos(glassFrost(p, d));
      const lo = Math.floor(pos), up = Math.min(levels.length - 1, lo + 1), lf = up === lo ? 0 : pos - lo;
      for (let x = 0; x < W; x++) {
        const i = (j * W + x) * 4;
        od[i]     = Math.min(255, sample(x, row + dir * o * (1 + p.dsp), 0, lo, up, lf) + hi);
        od[i + 1] = Math.min(255, sample(x, row + dir * o, 1, lo, up, lf) + hi);
        od[i + 2] = Math.min(255, sample(x, row + dir * o * (1 - p.dsp), 2, lo, up, lf) + hi);
        od[i + 3] = 255;
      }
    }
    const oc = document.createElement("canvas");
    oc.width = W; oc.height = bandH;
    oc.getContext("2d").putImageData(out, 0, 0);
    ctx.drawImage(oc, 0, top ? 0 : H - bandH);
  });
}