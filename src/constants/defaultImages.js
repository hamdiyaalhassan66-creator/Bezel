// Images shown in empty Animation slots. Put the files in public/anim-defaults/.
// 3:4 portrait fits best, since planes default to a 0.75 ratio.
const BASE = import.meta.env.BASE_URL;
const LIST = Array.from({ length: 24 }, (_, i) => ({
  file: `${String(i + 1).padStart(2, "0")}.png`,
  nw: 1200,
  nh: 1600,
}));

// slot i gets image i, wrapping around when there are more slots than images
export const defaultAnimImage = (i) => {
  const d = LIST[i % LIST.length];
  return { url: `${BASE}anim-defaults/${d.file}`, label: `Default ${(i % LIST.length) + 1}`, nw: d.nw, nh: d.nh, crop: null, cropUrl: null };
};