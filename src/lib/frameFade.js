import { frameRect } from "./frameModel.js";

// 0-100 fade: only the frame sitting in the center stays undimmed. Returns a black overlay alpha (0 = untouched).
// Distance is measured along the fade axis in units of the frame's own size.
const MAX_DIM = 0.75; // how dark a fully faded frame gets

export function frameDim(f, box) {
  if (!f.fade || !box) return 0;
  const r = frameRect(f, box);
  const horiz = f.fadeAxis !== "y";
  const d = Math.abs(horiz ? r.left + r.width / 2 - box.w / 2 : r.top + r.height / 2 - box.h / 2);
  const size = Math.max(1, horiz ? r.width : r.height);
  const t = Math.min(1, Math.max(0, (d / size - 0.1) / 0.6));
  const k = t * t * (3 - 2 * t); // smoothstep
  return (f.fade / 100) * k * MAX_DIM;
}

export const frameFade = () => 1; // kept so old imports don't break; fade no longer touches opacity
export const DIM_TRANSITION = "opacity 180ms cubic-bezier(0.23, 1, 0.32, 1)";