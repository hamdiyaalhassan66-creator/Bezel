// Chromatic aberration for the canvas export: splits the frame's pixels into R, G and B,
// shifts red and blue in opposite directions, and adds them back together.
// ctx is the frame layer's context, already clipped to the frame and translated by (ox, oy).
let copy, scratch;

export function paintChromatic(ctx, ox, oy, x, y, w, h, dx, dy) {
  const W = Math.max(1, Math.ceil(w));
  const H = Math.max(1, Math.ceil(h));
  copy ??= document.createElement("canvas");
  scratch ??= document.createElement("canvas");
  copy.width = scratch.width = W; // also clears them
  copy.height = scratch.height = H;
  copy.getContext("2d").drawImage(ctx.canvas, x + ox, y + oy, W, H, 0, 0, W, H);

  const sc = scratch.getContext("2d");
  ctx.save();
  ctx.clearRect(x, y, w, h);
  ctx.globalCompositeOperation = "lighter";
  [["#ff0000", -1], ["#00ff00", 0], ["#0000ff", 1]].forEach(([color, s]) => {
    sc.globalCompositeOperation = "source-over";
    sc.clearRect(0, 0, W, H);
    sc.drawImage(copy, 0, 0);
    sc.globalCompositeOperation = "multiply"; // keeps only this channel
    sc.fillStyle = color;
    sc.fillRect(0, 0, W, H);
    ctx.drawImage(scratch, x + dx * s, y + dy * s, W, H);
  });
  ctx.restore();
}