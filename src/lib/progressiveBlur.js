export const PB_BANDS = 4;
export const pbBandBlur = (blur) => blur / Math.sqrt(PB_BANDS); // bands compound, so each takes a share

// two handle points, % of canvas
export const pbPts = (fx) => ({ x0: fx.x0 ?? 50, y0: fx.y0 ?? 0, x1: fx.x1 ?? 50, y1: fx.y1 ?? 100 });

// Angle of the line (0 = start above end, positive = turns clockwise), in the canvas's real pixel shape
export function pbAngle(fx, W, H) {
  const p = pbPts(fx);
  const vx = ((p.x1 - p.x0) / 100) * W, vy = ((p.y1 - p.y0) / 100) * H;
  return Math.round((Math.atan2(-vx, vy) * 180) / Math.PI);
}

// Rotates the line around its midpoint, keeping its length. Returns the new points.
export function pbRotate(fx, W, H, deg) {
  const p = pbPts(fx);
  const cx = (((p.x0 + p.x1) / 2) / 100) * W, cy = (((p.y0 + p.y1) / 2) / 100) * H;
  const len = Math.hypot(((p.x1 - p.x0) / 100) * W, ((p.y1 - p.y0) / 100) * H) || H;
  const r = (deg * Math.PI) / 180, dx = -Math.sin(r), dy = Math.cos(r), h = len / 2;
  const f = (v) => Math.round(v * 10) / 10;
  return {
    x0: f(((cx - dx * h) / W) * 100), y0: f(((cy - dy * h) / H) * 100),
    x1: f(((cx + dx * h) / W) * 100), y1: f(((cy + dy * h) / H) * 100),
  };
}

// Geometry for a W x H area. base = uniform blur everywhere, extra = what the ramp adds on top
// (blurs compound as sqrt of sum of squares, so base + ramp ends at exactly the End blur).
export function pbParams(fx, W, H) {
  let s = fx.startBlur ?? 0, e = fx.blur ?? 0;
  const p = pbPts(fx);
  let p0 = [(p.x0 / 100) * W, (p.y0 / 100) * H], p1 = [(p.x1 / 100) * W, (p.y1 / 100) * H];
  if (s > e) { [s, e] = [e, s]; [p0, p1] = [p1, p0]; } // blurrier at the first point: flip so the ramp always goes low -> high
  const vx = p1[0] - p0[0], vy = p1[1] - p0[1];
  let len = Math.hypot(vx, vy), d = [vx / len, vy / len];
  if (len < 1) { len = 1; d = [0, 1]; } // both points equal: a hard edge
  return { base: s, extra: Math.sqrt(Math.max(0, e * e - s * s)), p0, d, len };
}

// CSS mask for band i: the ramp sits between the two points, whatever the angle
export function pbMask(g, i, W, H) {
  const th = Math.atan2(g.d[0], -g.d[1]); // CSS angle of the direction
  const Lc = Math.abs(W * Math.sin(th)) + Math.abs(H * Math.cos(th)); // CSS gradient line length
  const along = (g.p0[0] - W / 2) * g.d[0] + (g.p0[1] - H / 2) * g.d[1] + Lc / 2;
  const a = along + (g.len * i) / PB_BANDS, b = along + (g.len * (i + 1)) / PB_BANDS;
  return `linear-gradient(${(th * 180) / Math.PI}deg, transparent ${a}px, #000 ${b}px)`;
}

// Export path. rect = the canvas area in output pixels, k = output px per on-screen px.
export function applyProgressiveBlur(canvas, fx, k, rect) {
  const g = pbParams(fx, rect.width, rect.height);
  const base = g.base * k, extra = g.extra * k;
  if (base <= 0 && extra <= 0) return;
  const ctx = canvas.getContext("2d");
  const band = document.createElement("canvas");
  band.width = canvas.width;
  band.height = canvas.height;
  const b = band.getContext("2d");
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (base > 0) {
    b.filter = `blur(${base}px)`;
    b.drawImage(canvas, 0, 0);
    b.filter = "none";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(band, 0, 0);
  }
  const at = (t) => [rect.left + g.p0[0] + g.d[0] * g.len * t, rect.top + g.p0[1] + g.d[1] * g.len * t];
  if (extra > 0) {
    for (let i = 0; i < PB_BANDS; i++) {
      b.globalCompositeOperation = "source-over";
      b.clearRect(0, 0, band.width, band.height);
      b.filter = `blur(${pbBandBlur(extra)}px)`;
      b.drawImage(canvas, 0, 0);
      b.filter = "none";
      const [x0, y0] = at(i / PB_BANDS), [x1, y1] = at((i + 1) / PB_BANDS);
      const gr = b.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(1, "#000");
      b.globalCompositeOperation = "destination-in";
      b.fillStyle = gr;
      b.fillRect(0, 0, band.width, band.height);
      ctx.drawImage(band, 0, 0);
    }
  }
  ctx.restore();
}