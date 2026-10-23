const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const TAU = Math.PI * 2;
const lum = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

export const GRAD_FX_TYPES = [
  { value: "grain", label: "Grain" },
  { value: "halftone", label: "Halftone" },
  { value: "warp", label: "Warp" },
  { value: "dither", label: "Dither" },
  { value: "lens", label: "Lens Distortion" },
  { value: "pixelate", label: "Pixelate" },
  { value: "hatching", label: "Hatching" },
  { value: "pistons", label: "Pistons" },
  { value: "asciiwave", label: "ASCII Wave" },
  { value: "collapsinggrid", label: "Collapsing Grid" },
  { value: "patternrefraction", label: "Pattern Refraction" },
  { value: "glitch", label: "Glitch" },
  { value: "banknote", label: "Banknote Engraving" },
];

// every filter starts from the same base settings, plus its own extras if it has any
export const makeGradFx = (type, id) => ({
  id, type, visible: true, amount: 60, scale: 30, angle: 0, ...FX_DEFAULTS[type],
});

// Resamples the canvas: map(x, y, out) writes the source position for each output pixel.
function remap(ctx, w, h, map) {
  const s = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h);
  const o = out.data;
  const t = [0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      map(x, y, t);
      const sx = clamp(t[0], 0, w - 1.001), sy = clamp(t[1], 0, h - 1.001);
      const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
      const a = (y0 * w + x0) * 4, b = a + 4, c = a + w * 4, d = c + 4;
      const di = (y * w + x) * 4;
      for (let k = 0; k < 4; k++) {
        o[di + k] = (s[a + k] * (1 - fx) + s[b + k] * fx) * (1 - fy) + (s[c + k] * (1 - fx) + s[d + k] * fx) * fy;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
}

// Amount = how much of the filtered result is mixed over the original
const blended = (fn) => (ctx, w, h, p) => {
  const base = ctx.getImageData(0, 0, w, h);
  fn(ctx, w, h, p);
  if (p.a >= 1) return;
  const cur = ctx.getImageData(0, 0, w, h);
  const d = cur.data, b = base.data;
  for (let i = 0; i < d.length; i++) d[i] = b[i] + (d[i] - b[i]) * p.a;
  ctx.putImageData(cur, 0, 0);
};

// ---------- Figma ports: Halftone + Warp ----------
export const FX_DEFAULTS = {
  halftone: { halftoneType: 0, colorMode: 0, dotSize: 20, dotScale: 100, softness: 0, angle: 0, cx: 50, cy: 50 },
  warp: { warpMode: 0, amplitude: 15, warpScale: 20, cx: 50, cy: 50 },
  dither: { ditherStyle: "Bayer 16x16", pixelSize: 2, levels: 3, brightness: 100, contrast: 100, mono: false, monoHex: "FFFFFF" },
  lens: { distortion: 50, aberration: 20, lensMode: 0, lensQuality: 1, cx: 50, cy: 50 },
  pixelate: {
    pixelShape: 0, size: 10, stretch: 100, gap: 0, colorTrim: 2, averageColor: 80,
    cx: 50, cy: 50, radius: 75, angle: 90, dissolveMode: 0, dissolve: 0, falloff: 0, knockout: true,
  },
  hatching: {
    hatchMode: 1, density: 100, softness: 0, waveFreq: 28, waveAmp: 23, offsetX: 0, offsetY: 0,
    bgHex: "0A5D37", bgOpacity: 100, fgHex: "C7F8F8", fgOpacity: 100,
    cx: 50, cy: 50, lineWidth: 8, angle: 90,
  },
  // cols 10-150 | minBar = % of cell (0-50) | gap = % of cell (2-50) | highlight = tenths (25 = 2.5)
  pistons: { cols: 60, minBar: 5, gap: 18, highlight: 25 },
  // amplitude / frequency / softness = 0-100 | thickness = hundredths (9 = 0.09) | phase = 0-100 (one full wave cycle)
  asciiwave: {
    rows: 20, amplitude: 60, frequency: 20, angle: 38, thickness: 9, softness: 60, phase: 0,
    waveHex: "1166D9", waveBgHex: "060611",
  },
  // gridSize 2-40 | collapse / cornerRadius / gapSize = % (0-100 / 0-50 / 0-50)
  collapsinggrid: { gridSize: 10, collapse: 30, bgHex: "000000", bgOpacity: 100, cornerRadius: 10, gapSize: 5, varyCorners: false },
  // Scaled units: strength, softness, coverage, irregularity, scanStrength, noiseAmount, flickerStrength,
  // diagonalAmount, rollingStaticStrength, effectMix = % | burstDuration = x0.01s | bandThickness, grainSize,
  // diagonalWidth, rollingHaloExtent, rollingDisplacement, rollingColorTearing = x0.1 | rollingCoreWidth = x0.01
  glitch: {
    strength: 60, loopSeconds: 4,
    tearing: true, tearAmount: 12, bandThickness: 30, bandDensity: 14, edgeSoftness: 12,
    fragmentation: true, blockSize: 12, fragmentAmount: 8, coverage: 25,
    bursts: 3, burstDuration: 45, irregularity: 65, phase: 22, seed: 7,
    colorSplit: true, splitDistance: 3, splitAngle: 0,
    scanlines: true, scanStrength: 12, scanSpacing: 4,
    noiseEnabled: true, noiseAmount: 8, grainSize: 15,
    flicker: true, flickerStrength: 8,
    diagonalEnabled: true, diagonalAmount: 35, diagonalAngle: -28, diagonalWidth: 12,
    rollingEnabled: true, rollingPasses: 1, rollingDirection: 0, rollingCoreWidth: 65, rollingHaloExtent: 60,
    rollingDisplacement: 20, rollingColorTearing: 30, rollingStaticStrength: 14, rollingCount: 3,
    rollingSpeeds: [1, 2, 3, 2, 3, 4],
    edgeMode: 0, effectMix: 100,
  },
  // strength -100..100 | smoothness, frost 0-100 | dispersion -100..100 | cx, cy, radius = % | angle in degrees
  patternrefraction: {
    patternType: 0, strength: 50, smoothness: 0, frost: 0, dispersion: 4, wrapMode: 0,
    cx: 50, cy: 50, radius: 8, angle: 45,
  },
  // spacing = x0.1 | exposure, contrast, gamma, detail = x0.01
  banknote: {
    inkHex: "133857", inkOpacity: 100, paperHex: "F5EEDD", paperOpacity: 100,
    preserveHue: true, hue: 25, tolerance: 24, feather: 12, minSaturation: 16, accentStrength: 100, shadowProtection: 65,
    accentMode: 0, accentHex: "B34F1F", accentOpacity: 100, maskPreview: false,
    spacing: 32, lineWeight: 100, angle: -7, flow: 65, crosshatch: 65,
    guilloche: 90, placement: 1, patternExtent: 40, patternScale: 125, curvature: 100,
    exposure: 35, contrast: 108, gamma: 85, detail: 70,
    grain: 20, wear: 12, stipple: 30, keepAlpha: true, amount: 100,
  },
};
export const HALFTONE_PATTERNS = [{ value: 0, label: "Dot" }, { value: 1, label: "Blended" }];
export const HALFTONE_COLOR_MODES = [
  { value: 0, label: "CMYK" }, { value: 1, label: "RGB" }, { value: 2, label: "BW light" }, { value: 3, label: "BW dark" },
];
export const WARP_MODES = [
  { value: 0, label: "Sine wave" }, { value: 1, label: "Twist" }, { value: 2, label: "Bulge" }, { value: 3, label: "Pinch" },
  { value: 4, label: "Ripple" }, { value: 5, label: "Flag" }, { value: 6, label: "Squeeze" }, { value: 7, label: "Swirl" },
];

const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const toLin = (v) => (v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92);
const toSrgb = (v) => (v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : v * 12.92);
const LIN = Float32Array.from({ length: 256 }, (_, i) => toLin(i / 255));

// dot radius (in grid cells) that covers `l` of a cell
const dotRad = (l) => {
  if (l <= 0) return 0;
  let r = Math.sqrt(l / Math.PI);
  if (r >= 0.5) r = (1.414 - Math.pow(Math.max(0.001, 1 - l) / 1.673, 1 / 2.33)) * 0.5;
  return r;
};

// Same gaussian as the Figma shader (65 taps over +-radius), run on a downscaled copy so it stays fast.
// Returns premultiplied sRGB floats.
function blurPremul(d, w, h, radius) {
  const f = Math.max(1, Math.floor(radius / 6));
  const bw = Math.ceil(w / f), bh = Math.ceil(h / f);
  const a = new Float32Array(bw * bh * 4);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let r = 0, g = 0, b = 0, al = 0, n = 0;
      const x1 = Math.min(w, (bx + 1) * f), y1 = Math.min(h, (by + 1) * f);
      for (let y = by * f; y < y1; y++) {
        for (let x = bx * f; x < x1; x++) {
          const i = (y * w + x) * 4, A = d[i + 3] / 255;
          if (A === 1) { r += LIN[d[i]]; g += LIN[d[i + 1]]; b += LIN[d[i + 2]]; }
          else { r += toLin((d[i] / 255) * A); g += toLin((d[i + 1] / 255) * A); b += toLin((d[i + 2] / 255) * A); }
          al += A; n++;
        }
      }
      const o = (by * bw + bx) * 4;
      a[o] = r / n; a[o + 1] = g / n; a[o + 2] = b / n; a[o + 3] = al / n;
    }
  }
  const sigma = Math.max(radius / 2, 0.5);
  const stride = Math.max(1, Math.ceil((32 * f) / radius));
  const m = Math.floor(32 / stride);
  const offs = [], wts = [];
  let ws = 0;
  for (let j = -m; j <= m; j++) {
    const t = j * stride;
    offs.push((t * radius) / 32 / f);
    const wt = Math.exp(-(t * t) / (2 * sigma * sigma));
    wts.push(wt);
    ws += wt;
  }
  const pass = (src, horiz) => {
    const out = new Float32Array(src.length);
    const len = horiz ? bw : bh, lines = horiz ? bh : bw;
    for (let l = 0; l < lines; l++) {
      for (let p = 0; p < len; p++) {
        let r = 0, g = 0, b = 0, al = 0;
        for (let t = 0; t < offs.length; t++) {
          const q = p + offs[t], q0 = Math.floor(q), fr = q - q0;
          const c0 = clamp(q0, 0, len - 1), c1 = clamp(q0 + 1, 0, len - 1);
          const i0 = (horiz ? l * bw + c0 : c0 * bw + l) * 4, i1 = (horiz ? l * bw + c1 : c1 * bw + l) * 4;
          const wt = wts[t];
          r += (src[i0] * (1 - fr) + src[i1] * fr) * wt;
          g += (src[i0 + 1] * (1 - fr) + src[i1 + 1] * fr) * wt;
          b += (src[i0 + 2] * (1 - fr) + src[i1 + 2] * fr) * wt;
          al += (src[i0 + 3] * (1 - fr) + src[i1 + 3] * fr) * wt;
        }
        const o = (horiz ? l * bw + p : p * bw + l) * 4;
        out[o] = r / ws; out[o + 1] = g / ws; out[o + 2] = b / ws; out[o + 3] = al / ws;
      }
    }
    return out;
  };
  const blurred = pass(pass(a, true), false);
  for (let i = 0; i < blurred.length; i += 4) {
    blurred[i] = toSrgb(clamp(blurred[i], 0, 1));
    blurred[i + 1] = toSrgb(clamp(blurred[i + 1], 0, 1));
    blurred[i + 2] = toSrgb(clamp(blurred[i + 2], 0, 1));
  }
  return { data: blurred, bw, bh };
}

// kind: "prem" = premultiplied linear, "str" = straight linear, "luma" = [linear luma, 0, 0, alpha]
function derive(B, kind) {
  const s = B.data, o = new Float32Array(s.length);
  for (let i = 0; i < s.length; i += 4) {
    const al = s[i + 3];
    if (kind === "prem") {
      o[i] = toLin(s[i]); o[i + 1] = toLin(s[i + 1]); o[i + 2] = toLin(s[i + 2]);
    } else {
      const inv = al > 1e-4 ? 1 / al : 0;
      const r = clamp(s[i] * inv, 0, 1), g = clamp(s[i + 1] * inv, 0, 1), b = clamp(s[i + 2] * inv, 0, 1);
      if (kind === "str") { o[i] = toLin(r); o[i + 1] = toLin(g); o[i + 2] = toLin(b); }
      else o[i] = toLin(0.299 * r + 0.587 * g + 0.114 * b);
    }
    o[i + 3] = al;
  }
  return { data: o, bw: B.bw, bh: B.bh };
}

function sampleBuf(S, u, v, o) {
  const { data, bw, bh } = S;
  const x = clamp(u * bw - 0.5, 0, bw - 1), y = clamp(v * bh - 0.5, 0, bh - 1);
  const x0 = x | 0, y0 = y | 0, x1 = Math.min(x0 + 1, bw - 1), y1 = Math.min(y0 + 1, bh - 1);
  const fx = x - x0, fy = y - y0;
  const a = (y0 * bw + x0) * 4, b = (y0 * bw + x1) * 4, c = (y1 * bw + x0) * 4, e = (y1 * bw + x1) * 4;
  for (let k = 0; k < 4; k++) {
    o[k] = (data[a + k] * (1 - fx) + data[b + k] * fx) * (1 - fy) + (data[c + k] * (1 - fx) + data[e + k] * fx) * fy;
  }
}

function rgbToCmyk(r, g, b, o) {
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) { o[0] = o[1] = o[2] = 0; o[3] = 1; return; }
  const inv = 1 / (1 - k);
  o[0] = (1 - r - k) * inv; o[1] = (1 - g - k) * inv; o[2] = (1 - b - k) * inv; o[3] = k;
}

// One screen of dots (one ink / channel). radiusOf(px, py) = dot radius for the cell centred at that pixel.
function dotLayer(w, h, theta, cx, cy, ds, soft, radiusOf) {
  const c = Math.cos(theta), s = Math.sin(theta);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => {
    const gx = (c * (x - cx) + s * (y - cy)) / ds, gy = (-s * (x - cx) + c * (y - cy)) / ds;
    minX = Math.min(minX, gx); maxX = Math.max(maxX, gx); minY = Math.min(minY, gy); maxY = Math.max(maxY, gy);
  });
  const i0 = Math.floor(minX + 0.5) - 1, i1 = Math.floor(maxX + 0.5) + 1;
  const j0 = Math.floor(minY + 0.5) - 1, j1 = Math.floor(maxY + 0.5) + 1;
  const nx = i1 - i0 + 1, ny = j1 - j0 + 1;
  const R = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const gx = (i + i0) * ds, gy = (j + j0) * ds;
      R[j * nx + i] = radiusOf(c * gx - s * gy + cx, s * gx + c * gy + cy);
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5, py = y + 0.5;
      const gx = (c * (px - cx) + s * (py - cy)) / ds, gy = (-s * (px - cx) + c * (py - cy)) / ds;
      const ci = Math.floor(gx + 0.5), cj = Math.floor(gy + 0.5);
      let cov = 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const r = R[(cj + dj - j0) * nx + (ci + di - i0)];
          if (r <= 0) continue;
          const dx = gx - (ci + di), dy = gy - (cj + dj);
          const dist = Math.sqrt(dx * dx + dy * dy), hi = r * (1 + soft);
          if (dist >= hi) continue;
          cov += smooth(hi, r * (1 - soft) - 0.001, dist);
        }
      }
      out[y * w + x] = cov > 1 ? 1 : cov;
    }
  }
  return out;
}

const HT_ANGLES = [[15, 75, 0, 45], [15, 75, 0], [45], [45]]; // screen angles per color mode: CMYK, RGB, BW light, BW dark

function gradientHalftone(ctx, w, h, fx, k) {
  const P = { ...FX_DEFAULTS.halftone, ...fx };
  const ds = Math.max(2, P.dotSize * k);
  const scale = P.dotScale / 100, soft = P.softness / 100, rot = (P.angle * Math.PI) / 180;
  const cx = (P.cx / 100) * w, cy = (P.cy / 100) * h;
  const mode = P.colorMode, euclid = P.halftoneType === 1;
  const d = ctx.getImageData(0, 0, w, h).data;
  const B = blurPremul(d, w, h, ds);
  const S = derive(B, mode === 0 ? "str" : mode === 1 ? "prem" : "luma");
  const angs = HT_ANGLES[mode].map((a) => rot + (a * Math.PI) / 180);
  const t = [0, 0, 0, 0], cm = [0, 0, 0, 0];
  const layers = [];

  if (!euclid) {
    angs.forEach((th, ch) => {
      layers.push(
        dotLayer(w, h, th, cx, cy, ds, soft, (px, py) => {
          sampleBuf(S, px / w, py / h, t);
          let v;
          if (mode === 0) { rgbToCmyk(t[0], t[1], t[2], cm); v = cm[ch] * t[3]; }
          else if (mode === 1) v = t[ch];
          else v = (mode === 2 ? 1 - t[0] : t[0]) * t[3];
          return dotRad(v) * scale;
        })
      );
    });
  }

  const out = ctx.createImageData(w, h), o = out.data;
  const cs = angs.map((a) => [Math.cos(a), Math.sin(a)]);
  const cov = [0, 0, 0, 0], val = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (euclid) {
        const px = x + 0.5, py = y + 0.5, al = d[p * 4 + 3] / 255;
        sampleBuf(S, px / w, py / h, t);
        if (mode === 0) {
          rgbToCmyk(1 + (t[0] - 1) * al, 1 + (t[1] - 1) * al, 1 + (t[2] - 1) * al, cm);
          for (let l = 0; l < 4; l++) val[l] = cm[l] * scale;
        } else if (mode === 1) {
          for (let l = 0; l < 3; l++) val[l] = t[l] * al * scale;
        } else {
          const luma = clamp(t[0] * al * scale, 0, 1);
          val[0] = mode === 2 ? 1 - luma : luma;
        }
        for (let l = 0; l < cs.length; l++) {
          const gx = (cs[l][0] * (px - cx) + cs[l][1] * (py - cy)) / ds, gy = (-cs[l][1] * (px - cx) + cs[l][0] * (py - cy)) / ds;
          const g = 0.5 - 0.25 * (Math.cos(gx * TAU) + Math.cos(gy * TAU));
          cov[l] = smooth(val[l] * (1 + soft), val[l] * (1 - soft) - 0.001, g);
        }
      } else {
        for (let l = 0; l < layers.length; l++) cov[l] = layers[l][p];
      }
      let r, g, b;
      if (mode === 0) { r = (1 - cov[0]) * (1 - cov[3]); g = (1 - cov[1]) * (1 - cov[3]); b = (1 - cov[2]) * (1 - cov[3]); }
      else if (mode === 1) { r = cov[0]; g = cov[1]; b = cov[2]; }
      else if (mode === 2) r = g = b = 1 - cov[0];
      else r = g = b = cov[0];
      const i = p * 4;
      o[i] = r * 255; o[i + 1] = g * 255; o[i + 2] = b * 255; o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

function gradientWarp(ctx, w, h, fx) {
  const P = { ...FX_DEFAULTS.warp, ...fx };
  // sliders are 0-100: amplitude = Figma's 0-20 x5, scale = Figma's 0-5 x20
  const sa = P.amplitude, amp = P.amplitude / 5, sf = P.warpScale / 10, ws = P.warpScale / 20;
  const mode = P.warpMode, cU = P.cx / 100, cV = P.cy / 100, COVER = 0.72;
  const maskAt = (u, v) => {
    if (mode === 0 || mode === 4 || mode === 5 || mode === 6) return 1;
    const dist = Math.hypot(u - cU, v - cV);
    if (mode === 1 || mode === 7) return clamp(1 - dist / COVER, 0, 1);
    return clamp(1 - (dist * 2) / Math.max(sf * 2, 0.0001), 0, 1);
  };
  const warped = (u, v, o) => {
    const rx = u - cU, ry = v - cV, dist = Math.hypot(rx, ry);
    if (mode === 0) {
      o[0] = u + (amp / 20) * Math.sin(TAU * ws * ry); o[1] = v + (amp / 20) * Math.sin(TAU * ws * rx);
    } else if (mode === 1 || mode === 7) {
      const f = clamp(1 - dist / COVER, 0, 1);
      const ang = (sa / 100) * TAU * sf * (mode === 1 ? f : f * f);
      const c = Math.cos(ang), s = Math.sin(ang);
      o[0] = cU + rx * c - ry * s; o[1] = cV + rx * s + ry * c;
    } else if (mode === 2 || mode === 3) {
      const f = clamp(1 - (dist * 2) / Math.max(sf * 2, 0.0001), 0, 1);
      const m = (sa / 100) * f * (mode === 2 ? -1 : 1);
      o[0] = u + rx * m; o[1] = v + ry * m;
    } else if (mode === 4) {
      const mag = (sa / 100) * Math.sin(TAU * sf * dist);
      o[0] = dist < 0.0001 ? u : u + (rx / dist) * mag; o[1] = dist < 0.0001 ? v : v + (ry / dist) * mag;
    } else if (mode === 5) {
      o[0] = u + (sa / 100) * Math.sin(TAU * sf * (ry + rx * 0.3)); o[1] = v;
    } else {
      o[0] = u; o[1] = v - (sa / 100) * ry * Math.sin(TAU * sf * u);
    }
  };
  const src = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h), o = out.data;
  const a = [0, 0], b = [0, 0], c = [0, 0], q = [0, 0], acc = [0, 0, 0, 0];
  const tap = (u, v, wt) => {
    const x = clamp(u * w - 0.5, 0, w - 1.001), y = clamp(v * h - 0.5, 0, h - 1.001);
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
    const i = (y0 * w + x0) * 4, j = i + 4, m = i + w * 4, n = m + 4;
    for (let k = 0; k < 4; k++) {
      acc[k] += ((src[i + k] * (1 - fx) + src[j + k] * fx) * (1 - fy) + (src[m + k] * (1 - fx) + src[n + k] * fx) * fy) * wt;
    }
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w, v = (y + 0.5) / h, i = (y * w + x) * 4;
      const mask = maskAt(u, v);
      if (mask === 0) { for (let k = 0; k < 4; k++) o[i + k] = src[i + k]; continue; }
      // how much source this pixel covers decides how many sub-samples to average (capped at 3x3 to stay fast)
      warped(u, v, a); warped(u + 1 / w, v, b); warped(u, v + 1 / h, c);
      const fp = Math.max(Math.hypot((b[0] - a[0]) * w, (b[1] - a[1]) * h), Math.hypot((c[0] - a[0]) * w, (c[1] - a[1]) * h));
      const N = clamp(Math.ceil(fp), 1, 3);
      acc[0] = acc[1] = acc[2] = acc[3] = 0;
      let wsum = 0;
      for (let j = 0; j < N; j++) {
        for (let n = 0; n < N; n++) {
          const su = u + ((n + 0.5) / N - 0.5) / w, sv = v + ((j + 0.5) / N - 0.5) / h;
          const sm = maskAt(su, sv);
          if (sm === 0) continue;
          warped(su, sv, q);
          tap(q[0], q[1], sm);
          wsum += sm;
        }
      }
      if (wsum < 0.0001) { for (let k = 0; k < 4; k++) o[i + k] = src[i + k]; continue; }
      for (let k = 0; k < 4; k++) {
        const avg = acc[k] / wsum;
        o[i + k] = mask === 1 ? avg : src[i + k] + (avg - src[i + k]) * mask;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
}

// ---------- Figma ports: Dither + Lens distortion ----------
export const DITHER_STYLES = [
  { value: "Bayer 2x2", label: "Bayer 2x2" }, { value: "Bayer 4x4", label: "Bayer 4x4" },
  { value: "Bayer 8x8", label: "Bayer 8x8" }, { value: "Bayer 16x16", label: "Bayer 16x16" },
  { value: "Blue Noise", label: "Blue noise" }, { value: "Threshold", label: "Threshold" },
];
export const LENS_MODES = [{ value: 0, label: "Lateral" }, { value: 1, label: "Longitudinal" }, { value: 2, label: "Anamorphic" }];
export const LENS_QUALITY = [{ value: 2, label: "Low" }, { value: 1, label: "Medium" }, { value: 0, label: "High" }];

const bayerMatrix = (N) => {
  if (N === 1) return [[0]];
  const small = bayerMatrix(N / 2), m = N / 2, out = [];
  for (let y = 0; y < N; y++) {
    out[y] = [];
    for (let x = 0; x < N; x++) {
      const qx = Math.floor(x / m), qy = Math.floor(y / m);
      const off = qy === 0 && qx === 0 ? 0 : qy === 0 && qx === 1 ? 2 : qy === 1 && qx === 0 ? 3 : 1;
      out[y][x] = small[y % m][x % m] * 4 + off;
    }
  }
  return out;
};
const rankTile = (buf, N) => {
  const idx = [...buf.keys()].sort((a, b) => buf[a] - buf[b]);
  const out = new Float32Array(buf.length);
  idx.forEach((i, r) => (out[i] = (r + 0.5) / buf.length));
  return { data: out, size: N };
};
const blueNoiseTile = (N) => {
  let a = 0x9e3779b9 >>> 0;
  const rnd = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const buf = new Float32Array(N * N).map(rnd), tmp = new Float32Array(buf.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) s += buf[((y + dy + N) % N) * N + ((x + dx + N) % N)];
      tmp[y * N + x] = s / 25;
    }
    for (let j = 0; j < buf.length; j++) buf[j] -= 0.5 * tmp[j];
  }
  return rankTile(buf, N);
};
const tileCache = {};
const ditherTile = (name) => {
  if (tileCache[name]) return tileCache[name];
  const bayer = (N) => {
    const m = bayerMatrix(N), data = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) data[y * N + x] = (m[y][x] + 0.5) / (N * N);
    return { data, size: N };
  };
  const t = name === "Bayer 2x2" ? bayer(2) : name === "Bayer 4x4" ? bayer(4) : name === "Bayer 8x8" ? bayer(8)
    : name === "Blue Noise" ? blueNoiseTile(64) : name === "Threshold" ? { data: new Float32Array([0.5]), size: 1 } : bayer(16);
  return (tileCache[name] = t);
};

// bilinear sample of the canvas at pixel position (x, y), premultiplied 0-1 into o
function samplePremul(d, w, h, x, y, o) {
  const fx0 = clamp(x - 0.5, 0, w - 1.001), fy0 = clamp(y - 0.5, 0, h - 1.001);
  const x0 = fx0 | 0, y0 = fy0 | 0, fx = fx0 - x0, fy = fy0 - y0;
  o[0] = o[1] = o[2] = o[3] = 0;
  for (let n = 0; n < 4; n++) {
    const i = ((y0 + (n >> 1)) * w + x0 + (n & 1)) * 4;
    const wt = ((n & 1) ? fx : 1 - fx) * ((n >> 1) ? fy : 1 - fy), a = d[i + 3] / 255;
    o[0] += (d[i] / 255) * a * wt; o[1] += (d[i + 1] / 255) * a * wt; o[2] += (d[i + 2] / 255) * a * wt; o[3] += a * wt;
  }
}

function gradientDither(ctx, w, h, fx, k) {
  const P = { ...FX_DEFAULTS.dither, ...fx };
  const ps = Math.max(1, Math.round(P.pixelSize * k));
  const L = P.levels - 1, bright = (P.brightness - 100) / 200, contrast = P.contrast / 100;
  const tile = ditherTile(P.ditherStyle);
  const mc = [0, 8, 16].map((s) => (((parseInt(P.monoHex || "FFFFFF", 16) >> (16 - s)) & 255) / 255));
  const d = ctx.getImageData(0, 0, w, h).data;
  const W = Math.ceil(w / ps), H = Math.ceil(h / ps);
  const cells = new Float32Array(W * H * 4), t = [0, 0, 0, 0];
  const quant = (c, th) => clamp(Math.round((c + (th - 0.5) / L) * L) / L, 0, 1);
  for (let by = 0; by < H; by++) {
    for (let bx = 0; bx < W; bx++) {
      samplePremul(d, w, h, (bx + 0.5) * ps, (by + 0.5) * ps, t);
      const a = t[3], inv = a > 0 ? 1 / a : 0;
      const c = [0, 1, 2].map((n) => clamp((t[n] * inv - 0.5) * contrast + 0.5 + bright, 0, 1));
      const th = tile.data[(by % tile.size) * tile.size + (bx % tile.size)];
      const i = (by * W + bx) * 4;
      if (P.mono) {
        const q = quant(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], th);
        cells[i] = mc[0] * q; cells[i + 1] = mc[1] * q; cells[i + 2] = mc[2] * q;
      } else {
        cells[i] = quant(c[0], th); cells[i + 1] = quant(c[1], th); cells[i + 2] = quant(c[2], th);
      }
      cells[i + 3] = a;
    }
  }
  const out = ctx.createImageData(w, h), o = out.data;
  for (let y = 0; y < h; y++) {
    const by = Math.min(H - 1, Math.floor((y + 0.5) / ps));
    for (let x = 0; x < w; x++) {
      const bx = Math.min(W - 1, Math.floor((x + 0.5) / ps)), c = (by * W + bx) * 4, i = (y * w + x) * 4;
      o[i] = cells[c] * 255; o[i + 1] = cells[c + 1] * 255; o[i + 2] = cells[c + 2] * 255; o[i + 3] = cells[c + 3] * 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

const LENS_JITTER = [[0, 0], [0.5, -0.333333], [-0.25, 0.333333], [0.25, -0.111111]];

function gradientLens(ctx, w, h, fx) {
  const P = { ...FX_DEFAULTS.lens, ...fx };
  const amount = P.distortion / 100, ab = P.aberration / 100, mode = P.lensMode;
  const cx = (P.cx / 100) * w, cy = (P.cy / 100) * h, R = Math.hypot(w, h) * 0.5, spread = 1.4;
  const chroma = (1 + Math.abs(amount)) * ab;
  const bucket = ab <= 0.001 ? 0 : ab < 0.08 ? 1 : ab < 0.18 ? 2 : ab < 0.35 ? 3 : 4;
  // same kernel size as the Figma shader (64 / (quality + 1), scaled by aberration bucket)
  const cap = Math.max(3, Math.ceil((64 / ((P.lensQuality ?? 1) + 1)) * [0, 0.25, 0.5, 0.75, 1][bucket]));
  const STEP_PX = 0.5; // max distance between neighbouring taps; smaller = smoother but slower
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h), o = out.data;
  const s = [0, 0, 0, 0];
  // distorted lookup; outside the canvas = transparent, like the Figma shader
  const look = (px, py, am) => {
    const dx = px - cx, dy = py - cy, nx = dx / R, ny = dy / R, d2 = nx * nx + ny * ny, f = 1 + am * (d2 + d2 * d2);
    const sx = dx * f + cx, sy = dy * f + cy;
    if (sx < 0 || sx > w || sy < 0 || sy > h) { s[0] = s[1] = s[2] = s[3] = 0; return; }
    samplePremul(d, w, h, sx, sy, s);
  };
  const ch = (v, a) => (a > 0.01 ? v / Math.max(0.001, a) : 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5, py = y + 0.5;
      let R_ = 0, G_ = 0, B_ = 0, A_ = 0, jn = 4, taps = 1;
      if (bucket > 0) {
        // how far (in px) one channel's sample moves across the whole kernel at this pixel
        const dx = px - cx, dy = py - cy, d2 = (dx * dx + dy * dy) / (R * R);
        const span = mode === 0 ? chroma * Math.hypot(dx, dy) * (d2 + d2 * d2) : mode === 1 ? chroma * R * 0.15 : chroma * w * 0.15;
        taps = Math.min(cap, Math.max(3, Math.ceil(span / STEP_PX) + 1));
        // jitter only where the image edge is close, so the outline is anti-aliased
        const f0 = 1 + amount * (d2 + d2 * d2);
        const sx = dx * f0 + cx, sy = dy * f0 + cy, m = 3 + span * 2;
        jn = sx < m || sx > w - m || sy < m || sy > h - m ? 4 : 1;
      }
      const invK = 1 / Math.max(taps - 1, 1);
      for (let j = 0; j < jn; j++) {
        const tx = px + (jn === 4 ? LENS_JITTER[j][0] * spread : 0);
        const ty = py + (jn === 4 ? LENS_JITTER[j][1] * spread : 0);
        if (bucket === 0) {
          look(tx, ty, amount);
          const a = s[3], f = a > 0.01;
          R_ += f ? s[0] : a; G_ += f ? s[1] : a; B_ += f ? s[2] : a; A_ += a;
          continue;
        }
        let dirx = 1, diry = 0;
        if (mode === 1) {
          const vx = tx - cx, vy = ty - cy, len = Math.hypot(vx, vy);
          if (len >= 0.001) { dirx = vx / len; diry = vy / len; }
        }
        let tr = 0, tg = 0, tb = 0, ta = 0, ws = 0;
        for (let i = 0; i < taps; i++) {
          const fi = i * invK - 0.5, win = 1 - Math.abs(fi * 2);
          let ra, ga, ba, rr, gg, bb;
          if (mode === 0) {
            look(tx, ty, amount + (fi + 0.5) * chroma); rr = s[0]; ra = s[3];
            look(tx, ty, amount + fi * chroma); gg = s[1]; ga = s[3];
            look(tx, ty, amount + (fi - 0.5) * chroma); bb = s[2]; ba = s[3];
          } else {
            const m = mode === 1 ? chroma * R * 0.15 : chroma * w * 0.15;
            const ox = mode === 1 ? dirx * m : m, oy = mode === 1 ? diry * m : 0;
            look(tx + ox * (fi + 0.5), ty + oy * (fi + 0.5), amount); rr = s[0]; ra = s[3];
            look(tx + ox * fi, ty + oy * fi, amount); gg = s[1]; ga = s[3];
            look(tx + ox * (fi - 0.5), ty + oy * (fi - 0.5), amount); bb = s[2]; ba = s[3];
          }
          const al = Math.max(ra, ga, ba);
          tr += ch(rr, ra) * al * win; tg += ch(gg, ga) * al * win; tb += ch(bb, ba) * al * win; ta += al * win;
          ws += win;
        }
        const iw = 1 / Math.max(ws, 0.0001);
        R_ += tr * iw; G_ += tg * iw; B_ += tb * iw; A_ += ta * iw;
      }
      const i = (y * w + x) * 4, a = A_ / jn;
      // premultiplied -> straight for the canvas
      if (a > 0.0001) { o[i] = (R_ / jn / a) * 255; o[i + 1] = (G_ / jn / a) * 255; o[i + 2] = (B_ / jn / a) * 255; }
      o[i + 3] = a * 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

// ---------- Figma ports: Pixelate + Hatching ----------
export const PIXEL_SHAPES = [
  { value: 0, label: "Rectangle" }, { value: 1, label: "Ellipse" }, { value: 2, label: "Hexagon" }, { value: 3, label: "Triangle" },
];
export const DISSOLVE_MODES = [{ value: 0, label: "Dropout" }, { value: 1, label: "Scale" }];
export const HATCH_PATTERNS = [{ value: 0, label: "Circles" }, { value: 1, label: "Waves" }, { value: 2, label: "Zigzag" }];

const fract = (x) => x - Math.floor(x);
const hash21 = (x, y) => {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = a;
  const dd = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += dd; b += dd; c += dd;
  return fract((a + b) * c);
};
// random 0-1 from the integer cell key, so dropout doesn't depend on pixel positions or size
const hashKey = (key) => {
  const a = (key % 4294967296) | 0, b = Math.floor(key / 4294967296) | 0;
  let x = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x27d4eb2f, 0xc2b2ae35);
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12; x = Math.imul(x, 0x297a2d39);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
};
const pixelShapeDist = (px, py, shape) => {
  const qx = Math.abs(px), qy = Math.abs(py);
  if (shape < 0.5) return Math.max(qx, qy) - 1;
  if (shape < 1.5) return Math.hypot(px, py) - 1;
  if (shape < 2.5) return Math.max(qy, qx + qy * 0.5) - 1;
  return Math.max(Math.max(-1 - py, py - 0.5), qx - (py + 1) * 0.5773503);
};
const hexRgb01 = (hx) => {
  const n = parseInt(hx || "000000", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};

function gradientPixelate(ctx, w, h, fx, k) {
  const P = { ...FX_DEFAULTS.pixelate, ...fx };
  const size = Math.max(P.size * k, 2);
  const bsx = Math.max(size, 1), bsy = Math.max(size * (P.stretch / 100), 1);
  const gap = Math.max(P.gap * k, 0), gbx = bsx + gap, gby = bsy + gap;
  const shape = P.pixelShape, isHex = shape === 2, isTri = shape === 3;
  const canTile = shape === 0 || isHex || isTri;
  const dissolve = P.dissolve / 100, scaleMode = P.dissolveMode >= 0.5;
  const avg = P.averageColor / 100, falloff = P.falloff / 100;
  const steps = Math.max(Math.round(18 - P.colorTrim), 2) - 1;
  const cx = (P.cx / 100) * w, cy = (P.cy / 100) * h, radius = P.radius * 0.01 * Math.max(w, h);
  const ang = P.angle * 0.01745329, cosA = Math.cos(ang), sinA = Math.sin(ang);
  const d = ctx.getImageData(0, 0, w, h).data;

  // nearest sample, premultiplied 0-1
  const read = (u, v, o) => {
    const x = Math.min(w - 1, Math.floor(clamp(u, 0, 1) * w)), y = Math.min(h - 1, Math.floor(clamp(v, 0, 1) * h));
    const i = (y * w + x) * 4, a = d[i + 3] / 255;
    o[0] = (d[i] / 255) * a; o[1] = (d[i + 1] / 255) * a; o[2] = (d[i + 2] / 255) * a; o[3] = a;
  };

  // everything that depends only on the cell (color, dissolve, region) is computed once per cell
  const cache = new Map(), t = [0, 0, 0, 0], acc = [0, 0, 0, 0];
  const getCell = (key, lx, ly) => {
    let c = cache.get(key);
    if (c) return c;
    const u = (cx + lx * cosA - ly * sinA) / w, v = (cy + lx * sinA + ly * cosA) / h;
    const len = Math.hypot(lx, ly);
    const mask = len <= radius + Math.hypot(bsx, bsy) * 0.5;
    const hash = hashKey(key);
    const frac = clamp(len / Math.max(radius, 0.001), 0, 1);
    const eff = dissolve + (1 - dissolve) * (falloff > 0 ? smooth(1 - falloff, 1, frac) : 0);
    let scale = 1, dissolved = false;
    if (scaleMode) { scale = clamp(1 - eff / Math.max(hash, 0.001), 0, 1); dissolved = scale <= 0; }
    else dissolved = hash < eff;
    read(u, v, t);
    if (avg > 0) {
      acc[0] = t[0]; acc[1] = t[1]; acc[2] = t[2]; acc[3] = t[3];
      const su = (bsx * avg * 0.5) / w, sv = (bsy * avg * 0.5) / h, n = [0, 0, 0, 0];
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        read(u + di * su, v + dj * sv, n);
        acc[0] += n[0]; acc[1] += n[1]; acc[2] += n[2]; acc[3] += n[3];
      }
      for (let q = 0; q < 4; q++) t[q] = t[q] + (acc[q] / 9 - t[q]) * avg;
    }
    const a = Math.max(t[3], 0.0001);
    const qz = (x) => (Math.floor(clamp(x / a, 0, 1) * steps + 0.5) / steps) * a;
    c = { r: qz(t[0]), g: qz(t[1]), b: qz(t[2]), al: t[3], scale, dissolved, mask };
    cache.set(key, c);
    return c;
  };

  const OFF = 100000, M = 200003, ko = [0, 0, 0, 0];
  const tap = (ppx, ppy, o) => {
    const rx = ppx - cx, ry = ppy - cy;
    const lx = rx * cosA + ry * sinA, ly = -rx * sinA + ry * cosA;
    let cell, scx, scy;
    if (isHex) {
      const R = gbx * 0.5, ys = gby / gbx, ny = ly / ys;
      const fq = (lx * 0.6666667) / R, fr = (-lx * 0.3333333 + ny * 0.5773503) / R, fs = -fq - fr;
      let rq = Math.floor(fq + 0.5), rr = Math.floor(fr + 0.5);
      const rs = Math.floor(fs + 0.5);
      const dq = Math.abs(rq - fq), dr = Math.abs(rr - fr), ds = Math.abs(rs - fs);
      if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
      const hx = 1.5 * R * rq, hy = 1.7320508 * R * (rr + rq * 0.5) * ys;
      cell = getCell((rq + OFF) * M + rr + OFF, hx, hy);
      scx = (lx - hx) / Math.max(R, 0.5); scy = (ly - hy) / Math.max(0.8660254 * R * ys, 0.5);
    } else if (isTri) {
      const col = Math.floor(lx / gbx), row = Math.floor(ly / gby);
      const fx2 = (lx - col * gbx) / gbx, fy2 = (ly - row * gby) / gby;
      const par = col + row - Math.floor((col + row) * 0.5) * 2;
      const low = par < 0.5 ? fx2 + fy2 < 1 : fy2 < fx2;
      let ccx, ccy;
      if (par < 0.5) ccx = ccy = low ? 1 / 3 : 2 / 3;
      else { ccx = low ? 2 / 3 : 1 / 3; ccy = low ? 1 / 3 : 2 / 3; }
      cell = getCell(((col + OFF) * M + row + OFF) * 2 + (low ? 1 : 0), col * gbx + ccx * gbx, row * gby + ccy * gby);
      let ox = (fx2 - ccx) * gbx, oy = (fy2 - ccy) * gby;
      if (!low) { ox = -ox; oy = -oy; }
      if (par >= 0.5) { const s2 = ox; ox = oy; oy = s2; }
      const he = Math.max(Math.min(bsx, bsy) * 0.333, 0.5);
      scx = ox / he; scy = oy / he;
    } else {
      const ci = Math.floor(lx / gbx), cj = Math.floor(ly / gby);
      const mx = (ci + 0.5) * gbx, my = (cj + 0.5) * gby;
      cell = getCell((ci + OFF) * M + cj + OFF, mx, my);
      scx = (lx - mx) / Math.max(bsx * 0.5, 0.5); scy = (ly - my) / Math.max(bsy * 0.5, 0.5);
    }
    const sc = cell.scale;
    const noGapFill = gap <= 0 && canTile && sc >= 1;
    const edge = noGapFill ? 1 : pixelShapeDist(scx / Math.max(sc, 0.001), scy / Math.max(sc, 0.001), shape) <= 0 ? 1 : 0;
    const fa = cell.mask && !cell.dissolved ? edge : 0;
    if (P.knockout) ko[0] = ko[1] = ko[2] = ko[3] = 0;
    else read(ppx / w, ppy / h, ko);
    o[0] += ko[0] + (cell.r - ko[0]) * fa; o[1] += ko[1] + (cell.g - ko[1]) * fa;
    o[2] += ko[2] + (cell.b - ko[2]) * fa; o[3] += ko[3] + (cell.al - ko[3]) * fa;
  };

  const out = ctx.createImageData(w, h), o = out.data, s = [0, 0, 0, 0], e = 0.25;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      s[0] = s[1] = s[2] = s[3] = 0;
      const px = x + 0.5, py = y + 0.5;
      tap(px - e, py - e, s); tap(px + e, py - e, s); tap(px - e, py + e, s); tap(px + e, py + e, s);
      const a = s[3] * 0.25, i = (y * w + x) * 4;
      if (a > 0.0001) { o[i] = (s[0] * 0.25 / a) * 255; o[i + 1] = (s[1] * 0.25 / a) * 255; o[i + 2] = (s[2] * 0.25 / a) * 255; }
      o[i + 3] = a * 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

function gradientHatching(ctx, w, h, fx) {
  const P = { ...FX_DEFAULTS.hatching, ...fx };
  const mode = P.hatchMode, isZig = mode === 2;
  const lineW = Math.max((w * P.lineWidth) / 100, 1);
  const rot = (P.angle * Math.PI) / 180, cr = Math.cos(rot), sr = Math.sin(rot);
  const cx = (P.cx / 100) * w, cy = (P.cy / 100) * h, maxDim = Math.max(w, h, 1);
  const freq = P.waveFreq / 10, amp = (P.waveAmp / 10 / 100) * maxDim;
  const stripe = (P.offsetX / 100) * lineW, phase = P.offsetY / 100;
  const density = P.density / 100, soft = P.softness / 100;
  const cA = hexRgb01(P.bgHex), cB = hexRgb01(P.fgHex), aA = P.bgOpacity / 100, aB = P.fgOpacity / 100;

  const seamless = (tt) => {
    const whole = Math.floor(freq), fp = fract(freq);
    if (fp < 0.0001) return tt * whole;
    const cut = whole / freq;
    return tt < cut ? tt * freq : whole + (tt - cut) / Math.max(1 - cut, 0.0001);
  };
  const height = (px, py) => {
    const rx = px - cx, ry = py - cy;
    const x = cr * rx + sr * ry, y = -sr * rx + cr * ry;
    const cyc = (mode === 0 ? seamless(fract(Math.atan2(y, x) / TAU + 1)) : (y / maxDim) * freq) + phase;
    const off = isZig ? (Math.abs(fract(cyc - 0.25) * 2 - 1) - 0.5) * 2 * amp : Math.sin(cyc * TAU) * amp;
    return Math.abs(fract(((mode === 0 ? Math.hypot(x, y) : x) + off + stripe) / lineW) - 0.5) * 2;
  };

  const n = w * h > 1.5e6 ? 2 : 3, inv = 1 / n, eps = 0.001;
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h), o = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, al = d[i + 3] / 255;
      if (al <= 0) continue;
      const l = clamp(0.2126 * (d[i] / 255) + 0.7152 * (d[i + 1] / 255) + 0.0722 * (d[i + 2] / 255), 0, 1);
      const th = l * density, e1 = th - soft - eps;
      let cov = 0;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        cov += smooth(th, e1, height(x + 0.5 + (a + 0.5) * inv - 0.5, y + 0.5 + (b + 0.5) * inv - 0.5));
      }
      cov /= n * n;
      const pa = aA + (aB - aA) * cov;
      if (pa > 0.0001) {
        for (let c = 0; c < 3; c++) o[i + c] = ((cA[c] * aA + (cB[c] * aB - cA[c] * aA) * cov) / pa) * 255;
      }
      o[i + 3] = pa * al * 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

// ---------- Figma ports: Pistons + ASCII wave ----------
function gradientPistons(ctx, w, h, fx) {
  const P = { ...FX_DEFAULTS.pistons, ...fx };
  const cols = Math.max(P.cols, 1);
  const minHalf = clamp(P.minBar / 100, 0, 0.9) * 0.5;
  const maxHalf = (1 - clamp(P.gap / 100, 0.02, 0.5)) * 0.5;
  const hi = Math.max(P.highlight / 10, 0), aa = 0.015;
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h), o = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, al = d[i + 3] / 255;
      const r = (d[i] / 255) * al, g = (d[i + 1] / 255) * al, b = (d[i + 2] / 255) * al;
      const lm = 0.299 * r + 0.587 * g + 0.114 * b;
      const local = fract(((x + 0.5) / w) * cols);
      const barHalf = minHalf + (maxHalf - minHalf) * lm;
      const edge = barHalf - Math.abs(local - 0.5);
      const barA = smooth(-aa, aa, edge);
      const n = smooth(Math.max(barHalf * 0.18, 1e-6), 0, edge) * barA * hi;
      const br = Math.min(r + 0.75 * n, 2), bg = Math.min(g + n, 2), bb = Math.min(b + 0.35 * n, 2);
      o[i] = (r * 0.06 + (br - r * 0.06) * barA) * 255;
      o[i + 1] = (g * 0.06 + (bg - g * 0.06) * barA) * 255;
      o[i + 2] = (b * 0.06 + (bb - b * 0.06) * barA) * 255;
      o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

function gradientAsciiWave(ctx, w, h, fx) {
  const P = { ...FX_DEFAULTS.asciiwave, ...fx };
  const rows = Math.max(P.rows, 1), amp = clamp(P.amplitude / 100, 0, 1), freq = clamp(P.frequency / 100, 0, 1);
  const thick = clamp(P.thickness / 100, 0.001, 0.49), soft = clamp(P.softness / 100, 0, 1);
  const phase = (P.phase / 100) * TAU;
  const ar = (P.angle * Math.PI) / 180, cosA = Math.cos(ar), sinA = Math.sin(ar);
  const wc = hexRgb01(P.waveHex), bc = hexRgb01(P.waveBgHex);
  const t = thick * 0.5, sf = soft * t * 0.9 + 0.004;
  const st = thick * 0.38, ssf = soft * st * 0.9 + 0.003, sq2 = 0.70711, circR = 0.38;
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h), o = out.data;
  for (let y = 0; y < h; y++) {
    const vy = (y + 0.5) / h - 0.5;
    for (let x = 0; x < w; x++) {
      const vx = (x + 0.5) / w - 0.5;
      const rx = vx * cosA - vy * sinA, ry = vx * sinA + vy * cosA;
      const lx = fract(rx * rows + 0.5) - 0.5, ly = fract(ry * rows + 0.5) - 0.5;
      const i = (y * w + x) * 4, al = d[i + 3] / 255;
      const lm = ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255) * al;
      const waveY = amp * 0.44 * Math.sin(rx * freq * TAU * 52 + phase) * lm;
      const waveA = 1 - smooth(t - sf, t + sf, Math.abs(ly - waveY));
      const dStar = Math.min(Math.abs(ly), Math.abs(lx), Math.abs(lx * sq2 - ly * sq2), Math.abs(lx * sq2 + ly * sq2));
      const circM = 1 - smooth(circR - 0.06, circR, Math.hypot(lx, ly));
      const starA = (1 - smooth(st - ssf, st + ssf, dStar)) * circM;
      const mt = smooth(0.22, 0.52, lm);
      const pat = clamp(starA + (waveA - starA) * mt, 0, 1);
      o[i] = (bc[0] + (wc[0] - bc[0]) * pat) * 255;
      o[i + 1] = (bc[1] + (wc[1] - bc[1]) * pat) * 255;
      o[i + 2] = (bc[2] + (wc[2] - bc[2]) * pat) * 255;
      o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

// ---------- Figma ports: Collapsing grid + TV signal glitch ----------
export const ROLL_DIRECTIONS = [{ value: 0, label: "Top to bottom" }, { value: 1, label: "Bottom to top" }];
export const EDGE_MODES = [{ value: 0, label: "Clamp" }, { value: 1, label: "Wrap" }, { value: 2, label: "Mirror" }];

function gradientCollapsingGrid(ctx, w, h, fx) {
  const P = { ...FX_DEFAULTS.collapsinggrid, ...fx };
  const n = Math.max(P.gridSize, 1);
  const scale = Math.max(0, 1 - clamp(P.collapse / 100, 0, 1) - clamp(P.gapSize / 100, 0, 0.5) * 2);
  const halfTile = scale * 0.5, cornerR = P.cornerRadius / 100;
  const gc = hexRgb01(P.bgHex), ga = P.bgOpacity / 100;
  const aa = 1 / (n * Math.min(w, h));
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h), o = out.data, s = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) {
    const cvy = ((y + 0.5) / h) * n, ciy = Math.floor(cvy), ly = cvy - ciy;
    const sly = (ly - 0.5) * scale + 0.5;
    for (let x = 0; x < w; x++) {
      const cvx = ((x + 0.5) / w) * n, cix = Math.floor(cvx), lx = cvx - cix;
      const slx = (lx - 0.5) * scale + 0.5;
      const inTile = slx >= 0 && slx <= 1 && sly >= 0 && sly <= 1;
      let alpha = 0;
      if (inTile) {
        const t = P.varyCorners ? cix / Math.max(n - 1, 1) : 0;
        const r = clamp(cornerR * (1 - t), 0, halfTile);
        const qx = Math.abs(lx - 0.5) - (halfTile - r), qy = Math.abs(ly - 0.5) - (halfTile - r);
        const sdf = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
        alpha = 1 - smooth(-aa, aa, sdf);
        samplePremul(d, w, h, ((cix + clamp(slx, 0, 1)) / n) * w, ((ciy + clamp(sly, 0, 1)) / n) * h, s);
      }
      const i = (y * w + x) * 4;
      const pr = ga * gc[0] + ((inTile ? s[0] : 0) - ga * gc[0]) * alpha;
      const pg = ga * gc[1] + ((inTile ? s[1] : 0) - ga * gc[1]) * alpha;
      const pb = ga * gc[2] + ((inTile ? s[2] : 0) - ga * gc[2]) * alpha;
      const pa = ga + ((inTile ? s[3] : 0) - ga) * alpha;
      if (pa > 0.0001) { o[i] = (pr / pa) * 255; o[i + 1] = (pg / pa) * 255; o[i + 2] = (pb / pa) * 255; }
      o[i + 3] = pa * 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

const hashG = (x, y, z) => {
  const qx = fract(Math.fround(x * 0.1031)), qy = fract(Math.fround(y * 0.11369)), qz = fract(Math.fround(z * 0.13787));
  const dd = Math.fround(qx * (qy + 19.19) + qy * (qz + 19.19) + qz * (qx + 19.19));
  return fract(Math.fround((qx + dd + qy + dd) * (qz + dd)));
};

function gradientGlitch(ctx, w, h, fx, k) {
  const P = { ...FX_DEFAULTS.glitch, ...fx };
  const strength = P.strength / 100, effMix = P.effectMix / 100;
  if (strength <= 0 || effMix <= 0) return;
  const K = k, shortSide = Math.min(w, h);
  const loopLen = Math.max(P.loopSeconds, 0.5);
  const cycle = fract(P.phase / 100), theta = cycle * TAU, seed = Math.floor(P.seed + 0.5);
  const tick = cycle * 32, tIdx = Math.floor(tick), tNext = (tIdx + 1) % 32, tBlend = smooth(0, 1, tick - tIdx);
  const cNoise = (cx, cy, salt) => {
    const a = hashG(cx + salt, cy + salt, tIdx), b = hashG(cx + salt, cy + salt, tNext);
    return a + (b - a) * tBlend;
  };

  // burst envelope (constant for the whole image)
  const bursts = clamp(Math.floor(P.bursts + 0.5), 1, 12), irr = P.irregularity / 100;
  const halfDur = clamp(P.burstDuration / 100 / loopLen * 0.5, 0.001, 0.49);
  let env = 0;
  for (let i = 0; i < bursts; i++) {
    const jitter = (hashG(i, seed, 11) - 0.5) * 0.8 * irr;
    const center = fract((i + 0.22 + jitter) / bursts);
    const dist = Math.abs(fract(cycle - center + 0.5) - 0.5);
    const pulse = 1 - smooth(halfDur * 0.15, halfDur, dist);
    const level = 1 + (0.6 + 0.4 * hashG(i, seed, 19) - 1) * irr;
    env = Math.max(env, pulse * level);
  }
  const activity = 0.12 + 0.88 * env;

  // tearing bands
  const tear = [];
  const tearAmount = P.tearAmount;
  if (P.tearing && tearAmount > 0) {
    const count = clamp(Math.floor(P.bandDensity + 0.5), 1, 48);
    const halfWidth = (0.2 + 7 * (1 - Math.exp(-Math.max(P.bandThickness / 10, 0) / 7))) * 0.005;
    const feather = Math.max(halfWidth * (P.edgeSoftness / 100), 0.25 / h);
    const nb = Math.ceil(w / (19 * K)) + 2;
    for (let i = 0; i < count; i++) {
      const hh = hashG(i, seed, 31), pos = hashG(i, seed, 37), wd = halfWidth * (0.65 + 0.7 * hh);
      const osc = Math.sin(theta * (1 + Math.floor(hh * 3)) + hh * TAU);
      const rip = new Float32Array(nb);
      for (let b = 0; b < nb; b++) rip[b] = ((hashG(b, i, seed + 39) - 0.5) * 1.5 * K) / h;
      tear.push({ pos, e0: Math.max(0, wd - feather), e1: wd + feather, dir: (hh * 2 - 1) * 0.7 + osc * 0.3, rip, thr: wd + feather + (0.75 * K) / h + 1e-4 });
    }
  }

  // fragments (uneven horizontal strips)
  const frag = [];
  if (P.fragmentation && P.fragmentAmount > 0) {
    const extent = 1 - Math.exp(-Math.max(P.blockSize, 0) / 20), prob = clamp(P.coverage / 100, 0, 1) * 0.7;
    const nb = Math.ceil(w / (23 * K)) + 2;
    for (let i = 0; i < 28; i++) {
      const h1 = hashG(i, seed, 53), h2 = hashG(i, seed, 59), h3 = hashG(i, seed, 61);
      if (!(hashG(i, seed, 67) < prob)) continue;
      const hgt = 0.7 * K + (extent * (1 + h3 * 4.5) * shortSide) / 640;
      const motion = 0.65 + 0.35 * Math.sin(theta * (1 + Math.floor(h1 * 3)) + h2 * TAU);
      const wob = new Float32Array(nb);
      for (let b = 0; b < nb; b++) wob[b] = (hashG(b, i, seed + 63) - 0.5) * hgt * 0.6;
      frag.push({
        cx: h1 * w, cy: h2 * h, reach: w * (0.07 + extent * (0.12 + 0.32 * h3)), hgt, slope: (h3 - 0.5) * 0.007, wob,
        dir: h3 > 0.5 ? 1 : -1,
        amount: shortSide * 0.14 * (1 - Math.exp(-Math.max(P.fragmentAmount, 0) / 14)) * (0.35 + 0.65 * h1) * motion,
      });
    }
  }

  // diagonal buzz
  const dAmt = clamp(P.diagonalAmount / 100, 0, 1), buzzAct = env * env;
  const diagOn = P.diagonalEnabled && dAmt > 0 && buzzAct > 0;
  const dAng = P.diagonalAngle * 0.01745329252, tx = Math.cos(dAng), ty = Math.sin(dAng), nx = -ty, ny = tx;
  const dSpan = Math.abs(nx) * w + Math.abs(ny) * h;
  const dWidth = Math.max(1, shortSide * 0.01 * clamp(P.diagonalWidth / 10, 0.1, 5));
  const dCenters = [0, 1, 2].map((i) => {
    const hh = hashG(i, seed, 89);
    return (hh - 0.5) * dSpan * 0.85 + Math.sin(theta + hh * TAU) * dSpan * 0.09;
  });

  // rolling tracking bands
  const roll = [];
  if (P.rollingEnabled) {
    const passes = clamp(Math.floor(P.rollingPasses + 0.5), 1, 8), sign = P.rollingDirection >= 0.5 ? -1 : 1;
    const count = clamp(Math.floor(P.rollingCount + 0.5), 3, 6), rot = hashG(seed, 0, 157);
    const speeds = P.rollingSpeeds ?? [1, 2, 3, 2, 3, 4];
    const core = clamp(P.rollingCoreWidth / 100, 0.1, 4), haloExt = clamp(P.rollingHaloExtent / 10, 0.5, 20);
    const nbe = Math.ceil(w / (24 * K)) + 2;
    for (let i = 0; i < count; i++) {
      const jitter = (hashG(i, seed, 163) - 0.5) * 0.4, offset = rot + (i + jitter) / count;
      const lp = clamp(Math.floor((speeds[i] ?? 1) + 0.5), 1, 8);
      const ws = (1 + 0.25 * hashG(i, seed, 167)) / Math.sqrt(1.25);
      const halfCore = core * 0.005 * ws, halo = halfCore + haloExt * 0.01 * ws;
      const feather = Math.max((0.65 * ws) / h, halfCore * 0.15);
      const edge = new Float32Array(nbe);
      for (let b = 0; b < nbe; b++) edge[b] = cNoise(b, i + 5, seed + 137) * 2 - 1;
      roll.push({
        key: i, center: fract(cycle * passes * lp * sign + offset), halfCore, halo, feather, edge,
        edgeAmp: Math.min(halfCore * 0.18, ws / h), pol: hashG(seed, i, 149) >= 0.5 ? 1 : -1,
        pulse: 0.85 + 0.15 * Math.sin(theta * 2 + seed + i), thr: Math.max(halo, halfCore + feather + 0.002), rn: 0,
      });
    }
  }
  const rollDisp = clamp(P.rollingDisplacement / 10, 0, 12) * 0.01;
  const rollChromaAmt = clamp(P.rollingColorTearing / 10, 0, 24) * K;
  const rollStaticAmt = clamp(P.rollingStaticStrength / 100, 0, 0.5);

  const EM = Math.round(P.edgeMode);
  const edgeUv = (p) => (EM === 1 ? fract(p) : EM === 2 ? 1 - Math.abs(fract(p * 0.5) * 2 - 1) : clamp(p, 0, 1));
  const sd = P.splitDistance, sAng = P.splitAngle * 0.01745329252, sCos = Math.cos(sAng), sSin = Math.sin(sAng);
  const scanSp = Math.max(2, P.scanSpacing) * K, grain = Math.max(1, P.grainSize / 10) * K;
  const flash = Math.sin(theta * 7 + seed) * 0.55 + Math.sin(theta * 13 + seed * 0.73) * 0.45;
  const flickMul = 1 + flash * (P.flickerStrength / 100) * strength * activity;
  const noiseAmt = P.noiseAmount / 100, scanStr = P.scanStrength / 100;

  const d = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h), o = out.data;
  const base = [0, 0, 0, 0], rc = [0, 0, 0, 0], bc = [0, 0, 0, 0];
  const samp = (u, v, t) => samplePremul(d, w, h, edgeUv(u) * w, edgeUv(v) * h, t);

  for (let y = 0; y < h; y++) {
    const py = y + 0.5, uvy = py / h;
    for (const L of roll) L.rn = cNoise(Math.floor(py / (1.5 * K)), L.key + 3, seed + 131) * 2 - 1;
    for (let x = 0; x < w; x++) {
      const px = x + 0.5, uvx = px / w;
      let dx = 0, dy = 0, crx = 0, cry = 0, ripMask = 0, buzzMask = 0, buzzStatic = 0;

      if (tear.length) {
        const bx = Math.floor(px / (19 * K));
        let sum = 0, tot = 0;
        for (const b of tear) {
          const dd = uvy - b.pos;
          if (Math.abs(dd) > b.thr) continue;
          const m = 1 - smooth(b.e0, b.e1, Math.abs(dd - b.rip[bx]));
          sum += m * b.dir; tot += m;
        }
        dx = (sum / Math.max(1, tot)) * tearAmount * 0.01 * activity;
        ripMask = Math.min(1, tot);
        crx += (sum >= 0 ? 1 : -1) * ripMask * activity * (2.5 * K + Math.min(Math.abs(dx * w) * 0.16, 9 * K));
      }

      if (frag.length) {
        const bx = Math.floor(px / (23 * K));
        let shift = 0, col = 0, fm = 0;
        for (const f of frag) {
          const ddx = px - f.cx, adx = Math.abs(ddx);
          if (adx >= f.reach) continue;
          const rd = Math.abs(py - f.cy - ddx * f.slope - f.wob[bx]);
          if (rd >= f.hgt + 0.65) continue;
          const m = (1 - smooth(f.reach * 0.75, f.reach, adx)) * (1 - smooth(f.hgt, f.hgt + 0.65, rd));
          shift += m * f.dir * f.amount;
          col += m * f.dir * (2.5 * K + Math.min(f.amount * 0.16, 9 * K));
          fm += m;
        }
        dx += ((shift / Math.max(1, fm)) * activity) / w;
        crx += (col / Math.max(1, fm)) * activity;
        ripMask = Math.max(ripMask, Math.min(1, fm));
      }

      if (diagOn) {
        const cxp = px - w * 0.5, cyp = py - h * 0.5;
        const across = cxp * nx + cyp * ny, along = cxp * tx + cyp * ty;
        for (let i = 0; i < 3; i++) {
          const dd = across - dCenters[i];
          if (Math.abs(dd) > dWidth + 1.5 * K) continue;
          const row = cNoise(Math.floor(py / (2 * K)), i, seed + 97) * 2 - 1;
          const broken = smooth(0.25, 0.65, cNoise(Math.floor(along / (29 * K)), i, seed + 101));
          const m = (1 - smooth(dWidth * 0.25, dWidth, Math.abs(dd - row * 1.5 * K))) * broken * buzzAct * dAmt;
          if (m <= 0) continue;
          const shift = row * (2 * K + dAmt * 6 * K);
          dx += (tx * shift * m) / w; dy += (ty * shift * m) / h;
          const cr = (row >= 0 ? 1 : -1) * (2.5 * K + Math.abs(shift) * 0.2) * m;
          crx += tx * cr; cry += ty * cr;
          buzzMask = Math.max(buzzMask, m);
          const fine = cNoise(Math.floor(px / K), Math.floor(py / K), seed + 109) * 2 - 1;
          buzzStatic += m * (fine * 0.65 + Math.pow(Math.max(0, row), 5) * broken * 0.28);
        }
        ripMask = Math.max(ripMask, buzzMask);
      }

      let rChroma = 0, rStatic = 0;
      if (roll.length) {
        const bxe = Math.floor(px / (24 * K));
        let shapeSum = 0, chromaSum = 0, staticSum = 0, support = 0;
        for (const L of roll) {
          const sdist = fract(uvy - L.center + 0.5) - 0.5;
          if (Math.abs(sdist) >= L.thr) continue;
          const cd = Math.abs(sdist - L.edge[bxe] * L.edgeAmp);
          const core = 1 - smooth(Math.max(0, L.halfCore - L.feather), L.halfCore + L.feather, cd);
          const halo = 1 - smooth(L.halfCore, L.halo, Math.abs(sdist));
          const bend = Math.sin((sdist / L.halo) * Math.PI) * halo;
          shapeSum += L.pol * L.pulse * (bend * 0.65 + halo * 0.12 + core * (0.65 + L.rn * 0.3));
          chromaSum += L.pol * (core * (0.8 + L.rn * 0.35) + bend * 0.22);
          const fine = cNoise(Math.floor(px / K), Math.floor(py / K), seed + 151 + L.key * 7) * 2 - 1;
          staticSum += core * (fine * 0.8 + L.rn * 0.2) + halo * fine * 0.08;
          support += Math.max(core, halo);
        }
        const ob = Math.max(0, 1 - Math.abs(support - 1) / 0.1);
        const norm = Math.max(1, support) + ob * ob * 0.025;
        dx += rollDisp * clamp(shapeSum / norm, -1.72, 1.72);
        rChroma = rollChromaAmt * clamp(chromaSum / norm, -1.37, 1.37);
        rStatic = rollStaticAmt * clamp(staticSum / norm, -1.08, 1.08);
      }

      const i = (y * w + x) * 4;
      const ia = d[i + 3] / 255, ir = (d[i] / 255) * ia, ig = (d[i + 1] / 255) * ia, ib = (d[i + 2] / 255) * ia;
      const sx = uvx + dx * strength, sy = uvy + dy * strength;
      samp(sx, sy, base);
      const inv = 1 / Math.max(base[3], 0.00001);
      let r = base[0] * inv, g = base[1] * inv, b = base[2] * inv;
      if (P.colorSplit && (sd > 0 || Math.abs(rChroma) > 0)) {
        const sec = sd * K * activity * (0.12 + 0.15 * ripMask);
        const ox = ((crx * (sd / 3) + sCos * sec + rChroma) / w) * strength;
        const oy = ((cry * (sd / 3) + sSin * sec) / h) * strength;
        samp(sx + ox, sy + oy, rc);
        samp(sx - ox, sy - oy, bc);
        r = rc[0] / Math.max(rc[3], 0.00001);
        b = bc[2] / Math.max(bc[3], 0.00001);
      }
      if (P.scanlines) {
        const m = 1 - scanStr * strength * (0.5 + 0.5 * Math.cos(((uvy * h) / scanSp) * TAU));
        r *= m; g *= m; b *= m;
      }
      if (P.noiseEnabled) {
        const gr = cNoise(Math.floor(px / grain), Math.floor(py / grain), seed + 71) * 2 - 1;
        const n = gr * noiseAmt * strength * (0.25 + 0.75 * env);
        r += n; g += n; b += n;
      }
      const st = (buzzStatic + rStatic) * strength;
      r += st; g += st; b += st;
      if (P.flicker) { r *= flickMul; g *= flickMul; b *= flickMul; }
      const ba = base[3];
      const pr = clamp(r, 0, 1) * ba, pg = clamp(g, 0, 1) * ba, pb = clamp(b, 0, 1) * ba;
      const fr = ir + (pr - ir) * effMix, fg = ig + (pg - ig) * effMix, fb = ib + (pb - ib) * effMix, fa = ia + (ba - ia) * effMix;
      if (fa > 0.0001) { o[i] = (fr / fa) * 255; o[i + 1] = (fg / fa) * 255; o[i + 2] = (fb / fa) * 255; }
      o[i + 3] = fa * 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

// ---------- Figma port: Pattern refraction ----------
export const REFRACT_PATTERNS = [
  { value: 0, label: "Lenticular" }, { value: 1, label: "Zigzag" }, { value: 2, label: "Waves" },
  { value: 3, label: "Circular" }, { value: 4, label: "Curved square" }, { value: 5, label: "Flat square" },
];
export const WRAP_MODES = [{ value: 0, label: "Zero" }, { value: 1, label: "Clamp" }, { value: 2, label: "Repeat" }, { value: 3, label: "Mirror" }];

const hash3 = (x, y, z) => {
  let a = fract(x * 0.3183099 + 0.1) * 17, b = fract(y * 0.3183099 + 0.1) * 17, c = fract(z * 0.3183099 + 0.1) * 17;
  return fract(a * b * c * (a + b + c));
};
// the shader calls vnoise with z = 1, so the z blend is always 0 and a 2D blend is exact
const vnoise2 = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash3(ix, iy, 1), b = hash3(ix + 1, iy, 1), c = hash3(ix, iy + 1, 1), d = hash3(ix + 1, iy + 1, 1);
  const top = a + (b - a) * ux;
  return top + (c + (d - c) * ux - top) * uy;
};

function gradientPatternRefraction(ctx, w, h, fx, k) {
  const P = { ...FX_DEFAULTS.patternrefraction, ...fx };
  const type = P.patternType, seam = Math.max(P.smoothness / 100, 0.001), frost = (P.frost / 100) * 0.1;
  const invSize = 1 / (20 + (P.radius / 100) * 980);
  const ang = (-P.angle * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  // pattern math runs in "logical" px (canvas px / k) so size, strength and frost match at any export size
  const cx = ((P.cx / 100) * w) / k, cy = ((P.cy / 100) * h) / k;
  const amount = P.strength * 10, disp = (P.dispersion / 100) * 0.25, wrap = P.wrapMode;
  const iors = disp === 0 ? [1.333] : [1.333 + disp, 1.333, 1.333 - disp];

  const height = (px, py) => {
    const x = px - cx, y = py - cy;
    const rx = (ca * x - sa * y) * invSize, ry = (sa * x + ca * y) * invSize;
    let gx = rx;
    if (type === 2) gx += Math.sin(ry * 0.15 * TAU) * 0.6;
    else if (type === 1) gx += (Math.abs(fract(ry * 0.15) * 2 - 1) * 2 - 1) * 0.6;
    const u = fract(gx) * 2 - 1, v = fract(ry) * 2 - 1;
    let hg;
    if (type <= 2) hg = Math.pow(Math.max(0, Math.sin((u * 0.5 + 0.5) * Math.PI)), 0.7);
    else if (type === 3) hg = 1 - (u * u + v * v);
    else if (type === 4) hg = 1 - Math.max(Math.abs(u), Math.abs(v)) * (u * u + v * v) * 0.8;
    else {
      const dx = Math.abs(u * 1.125) - 0.5, dy = Math.abs(v * 1.125) - 0.5;
      hg = 1 - clamp(Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.max(dx, dy), 0, 1);
    }
    hg = clamp(hg, 0, 1);
    hg *= Math.pow(hg, seam);
    if (frost > 0.0001) hg += (vnoise2(px * 0.5, py * 0.5) - 0.5) * frost;
    return hg;
  };

  const d = ctx.getImageData(0, 0, w, h).data;
  const sampleWrap = (u, v, o) => {
    if (wrap === 0) {
      if (u < 0 || u > 1 || v < 0 || v > 1) { o[0] = o[1] = o[2] = o[3] = 0; return; }
    } else if (wrap === 2) { u = fract(u); v = fract(v); }
    else if (wrap === 3) {
      const mu = fract(u * 0.5) * 2, mv = fract(v * 0.5) * 2;
      u = mu > 1 ? 2 - mu : mu; v = mv > 1 ? 2 - mv : mv;
    }
    samplePremul(d, w, h, u * w, v * h, o);
  };

  const n = w * h > 2.5e6 ? 1 : 2, total = n * n, s = [0, 0, 0, 0];
  const out = ctx.createImageData(w, h), o = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const lx = x + 0.5, ly = y + 0.5;
      let R = 0, G = 0, B = 0, A = 0;
      for (let i = 0; i < n; i++) {
        const ox = i / n - ((n - 1) / n) * 0.5;
        for (let j = 0; j < n; j++) {
          const oy = j / n - ((n - 1) / n) * 0.5;
          const qx = (lx + ox) / k, qy = (ly + oy) / k;
          const h0 = height(qx, qy), h1 = height(qx + 0.125, qy), v1 = height(qx, qy + 0.125);
          let nx = h0 - h1, ny = h0 - v1, nz = 0.0125;
          const len = Math.hypot(nx, ny, nz);
          nx /= len; ny /= len; nz /= len;
          for (let c = 0; c < iors.length; c++) {
            const eta = iors[c], kk = 1 - eta * eta * (1 - nz * nz);
            const f = kk < 0 ? 0 : (eta * nz - Math.sqrt(kk)) * amount * k;
            sampleWrap((lx + nx * f) / w, (ly + ny * f) / h, s);
            if (iors.length === 1) { R += s[0]; G += s[1]; B += s[2]; A += s[3]; }
            else if (c === 0) R += s[0];
            else if (c === 1) { G += s[1]; A += s[3]; }
            else B += s[2];
          }
        }
      }
      const a = A / total, i4 = (y * w + x) * 4;
      if (a > 0.0001) { o[i4] = (R / total / a) * 255; o[i4 + 1] = (G / total / a) * 255; o[i4 + 2] = (B / total / a) * 255; }
      o[i4 + 3] = a * 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

// ---------- Figma port: Banknote engraving ----------
export const BANKNOTE_PLACEMENTS = [
  { value: 0, label: "All smooth regions" }, { value: 1, label: "Upper smooth regions" }, { value: 2, label: "Whole image" },
];
export const BANKNOTE_ACCENT_MODES = [{ value: 0, label: "Original hue" }, { value: 1, label: "Custom accent ink" }];

const bnHash = (px, py) => {
  let q0 = fract(px * 0.1031), q1 = fract(py * 0.103), q2 = fract(px * 0.0973);
  const dd = q0 * (q1 + 33.33) + q1 * (q2 + 33.33) + q2 * (q0 + 33.33);
  q0 += dd; q1 += dd; q2 += dd;
  return fract((q0 + q1) * q2);
};
// one set of engraved lines; fw = how many line periods one pixel covers (fades to flat tone when lines get finer than pixels)
const bnLine = (phase, amount, fw) => {
  const cov = clamp(amount, 0, 1);
  const aa = Math.max(fw * 0.65, 0.0001);
  const dd = Math.abs(fract(phase + 0.5) - 0.5);
  const resolved = 1 - smooth(cov * 0.5 - aa, cov * 0.5 + aa, dd);
  return resolved + (cov - resolved) * smooth(0.45, 1.25, fw);
};
const bnMix = (a, b, t) => a + (b - a) * t;

function gradientBanknote(ctx, w, h, fx) {
  const P = { ...FX_DEFAULTS.banknote, ...fx };
  const short = Math.min(w, h), U = 1000 / short; // sizes are in "1000 units across the short side", so the look is the same at any export size
  const spacing = Math.max(0.8, P.spacing / 10), lineW = P.lineWeight / 100, ang = (P.angle * Math.PI) / 180, flow = P.flow / 100;
  const exposure = P.exposure / 100, contrast = P.contrast / 100, gamma = P.gamma / 100, detail = P.detail / 100;
  const guil = P.guilloche / 100, period = Math.max(30, P.patternScale), curv = P.curvature / 100, cross = P.crosshatch / 100;
  const grainA = P.grain / 100, wear = P.wear / 100, stip = P.stipple / 100, place = P.placement;
  const preserve = P.preserveHue ? 1 : 0, selHue = P.hue / 360, tol = P.tolerance / 360, feather = P.feather / 360;
  const minSat = P.minSaturation / 100, accStr = P.accentStrength / 100, custom = P.accentMode > 0.5, maskOnly = !!P.maskPreview;
  const mixAmt = P.amount / 100, extent = P.patternExtent / 100, shadowProt = P.shadowProtection / 100, keepAlpha = P.keepAlpha ? 1 : 0;
  const ink = [...hexRgb01(P.inkHex), P.inkOpacity / 100];
  const paper = [...hexRgb01(P.paperHex), P.paperOpacity / 100];
  const accent = [...hexRgb01(P.accentHex), P.accentOpacity / 100];
  const gv = 1 - smooth(1, 3, Math.hypot(U, U)); // grain fades out when a pixel is bigger than a grain

  const d = ctx.getImageData(0, 0, w, h).data;

  // ---- local brightness moments (mean + variance), blurred on a smaller grid ----
  const sigma = 6 / U;
  const f = Math.max(1, Math.floor(sigma / 2));
  const bw = Math.ceil(w / f), bh = Math.ceil(h / f);
  const F0 = new Float32Array(bw * bh), F1 = new Float32Array(bw * bh), F2 = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let s0 = 0, s1 = 0, s2 = 0, n = 0;
      const x1 = Math.min(w, (bx + 1) * f), y1 = Math.min(h, (by + 1) * f);
      for (let y = by * f; y < y1; y++) {
        for (let x = bx * f; x < x1; x++) {
          const i = (y * w + x) * 4, a = d[i + 3] / 255, l = lum(d, i);
          s0 += l * a; s1 += l * l * a; s2 += a; n++;
        }
      }
      const o = by * bw + bx;
      F0[o] = s0 / n; F1[o] = s1 / n; F2[o] = s2 / n;
    }
  }
  // same 17-tap gaussian as the original (offsets of sigma/4, up to 2 sigma), folded into one integer kernel
  const rf = sigma / f, KR = Math.ceil(2 * rf) + 1, kern = new Float32Array(KR * 2 + 1);
  let kw = 0;
  for (let k = -8; k <= 8; k++) {
    const o = (rf * k) / 4, io = Math.floor(o), fr = o - io, wt = Math.exp(-0.5 * (k / 4) * (k / 4));
    kern[io + KR] += wt * (1 - fr);
    kern[io + 1 + KR] += wt * fr;
    kw += wt;
  }
  for (let i = 0; i < kern.length; i++) kern[i] /= kw;
  const tmp = new Float32Array(bw * bh);
  const blur = (arr) => {
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        let s = 0;
        for (let t = -KR; t <= KR; t++) s += arr[y * bw + clamp(x + t, 0, bw - 1)] * kern[t + KR];
        tmp[y * bw + x] = s;
      }
    }
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        let s = 0;
        for (let t = -KR; t <= KR; t++) s += tmp[clamp(y + t, 0, bh - 1) * bw + x] * kern[t + KR];
        arr[y * bw + x] = s;
      }
    }
  };
  blur(F0); blur(F1); blur(F2);
  const samp = (arr, x, y) => {
    const fx = clamp(x / f - 0.5, 0, bw - 1.0001), fy = clamp(y / f - 0.5, 0, bh - 1.0001);
    const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, a = y0 * bw + x0;
    return (arr[a] * (1 - tx) + arr[a + 1] * tx) * (1 - ty) + (arr[a + bw] * (1 - tx) + arr[a + bw + 1] * tx) * ty;
  };
  const meanA = new Float32Array(w * h), varA = new Float32Array(w * h), gradX = new Float32Array(w * h);
  const off = 2 / U;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5, py = y + 0.5, i = y * w + x;
      const w2 = Math.max(samp(F2, px, py), 0.00001), m = samp(F0, px, py) / w2;
      meanA[i] = m;
      varA[i] = Math.sqrt(Math.max(samp(F1, px, py) / w2 - m * m, 0));
      gradX[i] = samp(F0, px + off, py) - samp(F0, px - off, py);
    }
  }

  // ---- engraving line phases (also used to measure how fast each line pattern changes per pixel) ----
  const c = Math.cos(ang), sn = Math.sin(ang);
  const phases = (ix, iy, buf, o) => {
    const i = Math.min(h - 1, iy) * w + Math.min(w - 1, ix);
    const px = (ix + 0.5) * U, py = (iy + 0.5) * U;
    const rx = px * c - py * sn, ry = px * sn + py * c;
    const flowing = flow * (26 * meanA[i] + 4 * Math.sin(rx * 0.022) + 1.8 * Math.sin(rx * 0.054 + ry * 0.017));
    buf[o] = (ry + flowing + flow * gradX[i] * 22) / spacing;
    buf[o + 1] = (rx * 0.88 + ry * 0.47 - flowing * 0.4) / spacing;
    const qx = rx / period, qy = ry / period, drift = 0.35 * Math.sin(qx * 2.2);
    const wa = curv * period * 0.24 * Math.sin(qy * TAU + drift);
    const wb = curv * period * 0.24 * Math.sin(qy * TAU - drift + 1.6);
    buf[o + 2] = (rx * 0.82 + ry * 0.55 + wa) / (spacing * 1.65);
    buf[o + 3] = (rx * 0.82 - ry * 0.55 - wb) / (spacing * 1.65);
  };
  let rowA = new Float32Array((w + 1) * 4), rowB = new Float32Array((w + 1) * 4);
  const fillRow = (iy, buf) => { for (let x = 0; x <= w; x++) phases(x, iy, buf, x * 4); };
  fillRow(0, rowA);

  const out = ctx.createImageData(w, h), o = out.data;
  const hs = [0, 0];
  const O = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) {
    fillRow(y + 1, rowB);
    const uvy = (y + 0.5) / h, py = (y + 0.5) * U;
    for (let x = 0; x < w; x++) {
      const i4 = (y * w + x) * 4, idx = y * w + x, a = d[i4 + 3] / 255;
      const r = a > 0 ? d[i4] / 255 : 0, g = a > 0 ? d[i4 + 1] / 255 : 0, b = a > 0 ? d[i4 + 2] / 255 : 0;
      const px = (x + 0.5) * U;
      const origLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // hue selection
      const hi = Math.max(r, g, b), lo = Math.min(r, g, b), dl = hi - lo;
      let hh = 0;
      if (dl > 0.00001) hh = hi === r ? (g - b) / dl : hi === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
      hs[0] = fract(hh / 6 + 1); hs[1] = dl / Math.max(hi, 0.00001);
      const dh = Math.abs(hs[0] - selHue), hueDist = Math.min(dh, 1 - dh);
      const hueMask = 1 - smooth(tol, tol + Math.max(feather, 0.0028), hueDist);
      const satMask = smooth(minSat, minSat + 0.08, hs[1]);
      const shadows = bnMix(1, smooth(0.06, 0.42, origLum), shadowProt);
      const accentMask = hueMask * satMask * preserve * accStr * shadows;

      // tone
      const mean = meanA[idx], variance = varA[idx];
      const detailed = clamp(origLum + (origLum - mean) * detail, 0, 1);
      let l = Math.pow(clamp(detailed * Math.pow(2, exposure), 0, 1), gamma);
      l = clamp((l - 0.5) * contrast + 0.5, 0, 1);
      const darkness = clamp(1 - l, 0, 1);

      // line widths from how fast each pattern changes per pixel
      const p0 = x * 4, q0 = (x + 1) * 4;
      const fw0 = Math.abs(rowA[q0] - rowA[p0]) + Math.abs(rowB[p0] - rowA[p0]);
      const fw1 = Math.abs(rowA[q0 + 1] - rowA[p0 + 1]) + Math.abs(rowB[p0 + 1] - rowA[p0 + 1]);
      const fw2 = Math.abs(rowA[q0 + 2] - rowA[p0 + 2]) + Math.abs(rowB[p0 + 2] - rowA[p0 + 2]);
      const fw3 = Math.abs(rowA[q0 + 3] - rowA[p0 + 3]) + Math.abs(rowB[p0 + 3] - rowA[p0 + 3]);

      const crossAmount = cross * smooth(0.12, 0.8, darkness);
      const primary = 1 - Math.pow(Math.max(0.00001, 1 - darkness), 1 - crossAmount * 0.55);
      const secondary = 1 - Math.pow(Math.max(0.00001, 1 - darkness), crossAmount * 0.55);
      const la = bnLine(rowA[p0], primary * lineW, fw0), lb = bnLine(rowA[p0 + 1], secondary * lineW, fw1);
      let engraving = 1 - (1 - la) * (1 - lb);

      // guilloche
      const ga = bnLine(rowA[p0 + 2], 0.1 * lineW, fw2), gb = bnLine(rowA[p0 + 3], 0.1 * lineW, fw3);
      const guilloche = 1 - (1 - ga) * (1 - gb);
      const smoothArea = (1 - smooth(0.008, 0.065, variance)) * smooth(0.12, 0.5, mean);
      const upper = 1 - smooth(extent, Math.min(1.01, extent + 0.12), uvy);
      let placement = smoothArea;
      if (place > 0.5) placement *= upper;
      if (place > 1.5) placement = 1;
      placement *= 1 - accentMask;
      const ornamental = clamp(guilloche * 0.7 + darkness * 0.15, 0, 1);
      engraving = bnMix(engraving, ornamental, placement * guil);

      // paper grain, stippling, ink wear
      const noise = bnHash(Math.floor(px * 1.7), Math.floor(py * 1.7));
      const fineNoise = bnHash(Math.floor(px * 3.9) + 17, Math.floor(py * 3.9) + 17);
      const stipple = smooth(0.84, 1, fineNoise) * darkness * (1 - engraving) * stip * gv;
      engraving = clamp(engraving + stipple, 0, 1);
      engraving *= 1 - wear * smooth(0.82, 1, noise) * 0.42 * gv;

      // colours
      const sv = clamp(hs[1] * 0.8 + 0.06, 0.2, 0.78);
      let ir, ig, ib;
      if (custom) { ir = accent[0]; ig = accent[1]; ib = accent[2]; }
      else {
        const hp = (n) => clamp(Math.abs(fract(hs[0] + n) * 6 - 3) - 1, 0, 1);
        ir = 0.6 * (1 + (hp(0) - 1) * sv); ig = 0.6 * (1 + (hp(2 / 3) - 1) * sv); ib = 0.6 * (1 + (hp(1 / 3) - 1) * sv);
      }
      const cr = bnMix(ink[0], ir, accentMask), cg = bnMix(ink[1], ig, accentMask), cb = bnMix(ink[2], ib, accentMask);
      const pg = 1 - grainA * (noise - 0.3) * 0.075 * gv;
      const pr = clamp(paper[0] * pg, 0, 1), pgc = clamp(paper[1] * pg, 0, 1), pb = clamp(paper[2] * pg, 0, 1);
      const inkA = bnMix(ink[3], custom ? accent[3] : 1, accentMask);
      O[0] = bnMix(pr * paper[3], cr * inkA, engraving);
      O[1] = bnMix(pgc * paper[3], cg * inkA, engraving);
      O[2] = bnMix(pb * paper[3], cb * inkA, engraving);
      O[3] = bnMix(paper[3], inkA, engraving);
      for (let k = 0; k < 3; k++) O[k] = bnMix(O[k], O[k] * a, keepAlpha);
      O[3] = bnMix(O[3], O[3] * a, keepAlpha);
      // blend with the original (premultiplied)
      for (let k = 0; k < 3; k++) O[k] = bnMix([r, g, b][k] * a, O[k], mixAmt);
      O[3] = bnMix(a, O[3], mixAmt);
      if (maskOnly) { O[0] = O[1] = O[2] = accentMask * a; O[3] = a; }
      const oa = O[3];
      if (oa > 0.0001) { o[i4] = (O[0] / oa) * 255; o[i4 + 1] = (O[1] / oa) * 255; o[i4 + 2] = (O[2] / oa) * 255; }
      o[i4 + 3] = oa * 255;
    }
    const t = rowA; rowA = rowB; rowB = t;
  }
  ctx.putImageData(out, 0, 0);
}

// ---------- Grain textures ----------
export const GRAIN_TYPES = [
  { value: "noise", label: "Noise" },
  { value: "filmdust", label: "Film dust", file: "film-dust.jpg" },
  { value: "scratches", label: "Scratches", file: "scratches.jpg" },
  { value: "halftone", label: "Halftone dots", file: "halftone.jpg" },
  { value: "leather", label: "Leather", file: "leather.jpg" },
];
export const GRAIN_BLENDS = [{ value: "screen", label: "Light specks" }, { value: "multiply", label: "Dark specks" }];

const grainInvCache = new WeakMap();
// Tiles the texture over the canvas. "screen" adds the bright specks; "multiply" uses an inverted copy so dust shows dark on light backgrounds.
export function paintGrainTexture(ctx, W, H, img, amount, scale, blend) {
  let src = img;
  if (blend === "multiply") {
    src = grainInvCache.get(img);
    if (!src) {
      src = document.createElement("canvas");
      src.width = img.naturalWidth;
      src.height = img.naturalHeight;
      const g = src.getContext("2d");
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = "difference";
      g.fillStyle = "#fff";
      g.fillRect(0, 0, src.width, src.height);
      grainInvCache.set(img, src);
    }
  }
  const pat = ctx.createPattern(src, "repeat");
  pat.setTransform(new DOMMatrix().scale((Math.max(W, H) * scale) / 100 / img.naturalWidth));
  ctx.save();
  ctx.globalAlpha = clamp(amount / 100, 0, 1);
  ctx.globalCompositeOperation = blend === "multiply" ? "multiply" : "screen";
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

const FILTERS = {
  halftone: (ctx, w, h, { fx, k }) => gradientHalftone(ctx, w, h, fx, k),
  warp: (ctx, w, h, { fx }) => gradientWarp(ctx, w, h, fx),
  collapsinggrid: (ctx, w, h, { fx }) => gradientCollapsingGrid(ctx, w, h, fx),
  patternrefraction: (ctx, w, h, { fx, k }) => gradientPatternRefraction(ctx, w, h, fx, k),
  lens: (ctx, w, h, { fx }) => gradientLens(ctx, w, h, fx),
  pixelate: (ctx, w, h, { fx, k }) => gradientPixelate(ctx, w, h, fx, k),
  dither: (ctx, w, h, { fx, k }) => gradientDither(ctx, w, h, fx, k),
  hatching: (ctx, w, h, { fx }) => gradientHatching(ctx, w, h, fx),
  pistons: (ctx, w, h, { fx }) => gradientPistons(ctx, w, h, fx),
  asciiwave: (ctx, w, h, { fx }) => gradientAsciiWave(ctx, w, h, fx),
  glitch: (ctx, w, h, { fx, k }) => gradientGlitch(ctx, w, h, fx, k),
  banknote: (ctx, w, h, { fx }) => gradientBanknote(ctx, w, h, fx),
};

// Runs the stack in order. k = canvas px per on-screen px, so sizes match at any export size.
export function applyGradientFx(canvas, list, k = 1) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = canvas.width, h = canvas.height;
  list.forEach((fx) => {
    const run = FILTERS[fx.type];
    if (!fx.visible || !run) return;
    run(ctx, w, h, { a: fx.amount / 100, s: fx.scale, ang: (fx.angle * Math.PI) / 180, k, fx });
  });
}