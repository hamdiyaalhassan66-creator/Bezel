// Rects are { l, r, t, b } in canvas px.
const EPS = 0.5;
const overlap = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
const keys = (axis) =>
  axis === "h" ? { s: "l", e: "r", ps: "t", pe: "b" } : { s: "t", e: "b", ps: "l", pe: "r" };

// How far to nudge `m` along `axis` so its gaps match the gaps between the other frames.
// Returns a delta in px, or null when nothing is within the threshold.
export function equalSpacingSnap(m, others, threshold, axis) {
  const K = keys(axis);
  const size = m[K.e] - m[K.s];
  const list = others
    .filter((o) => overlap(m[K.ps], m[K.pe], o[K.ps], o[K.pe]) > 0)
    .sort((a, b) => a[K.s] - b[K.s]);
  let best = null;
  const tryDelta = (d) => {
    if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d;
  };
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1];
    const g = b[K.s] - a[K.e];
    if (g < 0) continue;
    if (g >= size) tryDelta((a[K.e] + b[K.s] - size) / 2 - m[K.s]); // centered between a and b
    tryDelta(b[K.e] + g - m[K.s]); // after b, same gap as a-b
    tryDelta(a[K.s] - g - size - m[K.s]); // before a, same gap as a-b
  }
  return best;
}

// Segments for every run of 2+ equal gaps. Pass `focus` (a rect from `rects`) to keep only the runs touching it.
export function equalGaps(rects, axis, focus = null) {
  const K = keys(axis);
  const list = [...rects].sort((a, b) => a[K.s] - b[K.s]);
  const pairs = [];
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1];
    const gap = b[K.s] - a[K.e];
    const po = overlap(a[K.ps], a[K.pe], b[K.ps], b[K.pe]);
    pairs.push(gap > EPS && po > 0 ? { a, b, gap, mid: (Math.max(a[K.ps], b[K.ps]) + Math.min(a[K.pe], b[K.pe])) / 2 } : null);
  }
  const runs = [];
  let run = [];
  const flush = () => { if (run.length >= 2) runs.push(run); run = []; };
  pairs.forEach((p) => {
    if (!p) return flush();
    if (run.length && Math.abs(run[0].gap - p.gap) > EPS) flush();
    run.push(p);
  });
  flush();
  return runs
    .filter((r) => !focus || r.some((p) => p.a === focus || p.b === focus))
    .flat()
    .map((p) =>
      axis === "h"
        ? { axis, x1: p.a.r, y1: p.mid, x2: p.b.l, y2: p.mid, value: p.gap }
        : { axis, x1: p.mid, y1: p.a.b, x2: p.mid, y2: p.b.t, value: p.gap }
    );
}