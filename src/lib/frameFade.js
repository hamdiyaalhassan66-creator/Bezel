import { frameRect } from "./frameModel.js";

// 0-100 fade: a plane dims as its center travels from 45% of the way to the canvas edge, down to (1 - fade%) at the edge.
export function frameFade(f, box) {
  if (!f.fade || !box) return 1;
  const r = frameRect(f, box);
  const x = Math.abs(r.left + r.width / 2 - box.w / 2) / (box.w / 2);
  const y = Math.abs(r.top + r.height / 2 - box.h / 2) / (box.h / 2);
  const t = f.fadeAxis === "y" ? y : x;
  const k = Math.min(1, Math.max(0, (t - 0.45) / 0.55));
  return 1 - (f.fade / 100) * k;
}