// Export-time noise: random gray cells blended with "overlay". cell = grain size in output px.
export function drawNoise(ctx, x, y, w, h, amount, cell) {
  const c = Math.max(1, cell);
  const cols = Math.max(1, Math.ceil(w / c));
  const rows = Math.max(1, Math.ceil(h / c));
  const n = document.createElement("canvas");
  n.width = cols;
  n.height = rows;
  const nctx = n.getContext("2d");
  const img = nctx.createImageData(cols, rows);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = (amount / 100) * 0.6;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(n, 0, 0, cols, rows, x, y, cols * c, rows * c);
  ctx.restore();
}

// Same per-pixel noise as MockupScene's applyGrain (amount = intensity * 0.9),
// baked onto mid-gray so it can be laid over the gradient with "overlay" —
// CSS/canvas can't add noise per-pixel to a gradient directly.
export function makeGrainTile(size, intensity) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const amp = intensity * 0.9 * 2; // ×2: overlay only carries ~half the delta on average
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * amp; // Uint8ClampedArray clamps for us
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}