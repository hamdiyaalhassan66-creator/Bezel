import { frameRect } from "./frameModel.js";

// 3D planes for the Animation tab. A frame with f.rig is a plane in 3D:
//   f.rig = { tx, ty, tz, persp, hide }  rig tilt (deg), perspective distance (short-side units), hide backface
//   f.rx, f.ry, f.r  own rotation (deg)   f.z  depth (short-side units)   f.sh  shade 0-1
// Everything is in CSS axes (y down, z toward the viewer), so the DOM and the canvas agree.
const D2R = Math.PI / 180;
export const rotX = (a) => { const c = Math.cos(a * D2R), s = Math.sin(a * D2R); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
export const rotY = (a) => { const c = Math.cos(a * D2R), s = Math.sin(a * D2R); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
export const rotZ = (a) => { const c = Math.cos(a * D2R), s = Math.sin(a * D2R); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
export const mulMat = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));

// same order as planeCss: rig tilt first, then the plane's own rotation
export function planeRot(f) {
  const g = f.rig;
  const tilt = mulMat(mulMat(rotX(g.tx), rotY(g.ty)), rotZ(g.tz));
  const own = mulMat(mulMat(rotX(f.rx ?? 0), rotY(f.ry ?? 0)), rotZ(f.r ?? 0));
  return mulMat(tilt, own);
}

// DOM transform. Frames without a rig keep the old 2D rotate.
export function planeCss(f, short) {
  const g = f.rig;
  if (!g) return f.r ? `rotate(${f.r}deg)` : undefined;
  return `translateZ(${(f.z ?? 0) * short}px) rotateX(${g.tx}deg) rotateY(${g.ty}deg) rotateZ(${g.tz}deg) rotateX(${f.rx ?? 0}deg) rotateY(${f.ry ?? 0}deg) rotateZ(${f.r ?? 0}deg)`;
}

// CSS perspective for the frame container (first visible rig sets it, like the canvas-wide effects)
export const rigPerspective = (frames, box) => {
  const f = frames.find((x) => !x.hidden && x.rig);
  return f ? `${f.rig.persp * Math.min(box.w, box.h)}px` : undefined;
};

// Curved surface: bends the plane around rig.curve.axis. lx / ly are plane-local px from the center.
// Returns the bent point [x, y, z] in plane-local space, bulging toward +z (the viewer when the plane faces out).
export function bendPoint(f, lx, ly, short) {
  const c = f.rig.curve;
  if (!c) return [lx, ly, 0];
  const Rc = Math.max(1, c.radius * short);
  const cl = (v) => Math.max(-Math.PI, Math.min(Math.PI, v));
  const sg = c.inward ? -1 : 1; // inward: the edges come toward the viewer, so the plane wraps around the camera
  if (c.axis === "y") {
    const th = cl(lx / Rc);
    return [Rc * Math.sin(th), ly, sg * Rc * (Math.cos(th) - 1)];
  }
  const th = cl(ly / Rc);
  return [lx, Rc * Math.sin(th), sg * Rc * (Math.cos(th) - 1)];
}

// mesh density for drawPlane3D: [columns, rows]. Curved planes need more cuts along the bend.
export const planeGrid = (f) => (f.rig?.curve ? (f.rig.curve.axis === "y" ? [24, 4] : [4, 24]) : [8, 8]);

// Screen position of a point on the plane. u, v in 0-1 across the plane. The vanishing point is the canvas center.
export function projectPlane(f, r, box, u, v) {
  const short = Math.min(box.w, box.h);
  const R = planeRot(f);
  const lx = (u - 0.5) * r.width, ly = (v - 0.5) * r.height;
  const [bx, by, bz] = bendPoint(f, lx, ly, short);
  const X = R[0][0] * bx + R[0][1] * by + R[0][2] * bz;
  const Y = R[1][0] * bx + R[1][1] * by + R[1][2] * bz;
  const Z = R[2][0] * bx + R[2][1] * by + R[2][2] * bz + (f.z ?? 0) * short;
  const P = f.rig.persp * short;
  const k = P / Math.max(1, P - Z);
  const ox = box.w / 2, oy = box.h / 2;
  return [ox + (r.left + r.width / 2 + X - ox) * k, oy + (r.top + r.height / 2 + Y - oy) * k];
}

export function planePoly(f, box) {
  const r = frameRect(f, box);
  return [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => projectPlane(f, r, box, u, v));
}

// True when the plane's back faces the viewer (same test the browser uses for backface-visibility)
export function planeBackFacing(f, box) {
  const short = Math.min(box.w, box.h);
  const R = planeRot(f);
  const r = frameRect(f, box);
  const vx = box.w / 2 - (r.left + r.width / 2);
  const vy = box.h / 2 - (r.top + r.height / 2);
  const vz = (f.rig.persp - (f.z ?? 0)) * short;
  return R[0][2] * vx + R[1][2] * vy + R[2][2] * vz < 0;
}

// Paint order: far planes first
export const sortByDepth = (list) => (list.some((f) => f.rig) ? [...list].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)) : list);

// Canvas 2D has no perspective, so the plane is drawn as a grid of affine triangles.
// s = the part of `src` to draw ({ x, y, w, h } in src pixels), project(u, v) = where that point lands.
export function drawPlane3D(ctx, src, s, project, n = 8, m = n) {
  const tri = (s0, s1, s2, d0, d1, d2) => {
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    // push every edge out ~1.25px: a pixel inside two triangles is fully covered, so no seam shows the background
    const edgeDist = (p, q) => Math.abs((q[0] - p[0]) * (cy - p[1]) - (q[1] - p[1]) * (cx - p[0])) / (Math.hypot(q[0] - p[0], q[1] - p[1]) || 1);
    const minD = Math.max(0.5, Math.min(edgeDist(d0, d1), edgeDist(d1, d2), edgeDist(d2, d0)));
    const sc = Math.min(2, 1 + 1.25 / minD);
    const grow = (pt) => [cx + (pt[0] - cx) * sc, cy + (pt[1] - cy) * sc];
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
    // draw only this triangle's bounding box (in source px), not the whole source
    const bx = Math.max(s.x, Math.min(s0[0], s1[0], s2[0]) - 2);
    const by = Math.max(s.y, Math.min(s0[1], s1[1], s2[1]) - 2);
    const bw = Math.min(s.x + s.w, Math.max(s0[0], s1[0], s2[0]) + 2) - bx;
    const bh = Math.min(s.y + s.h, Math.max(s0[1], s1[1], s2[1]) + 2) - by;
    if (bw > 0 && bh > 0) ctx.drawImage(src, bx, by, bw, bh, bx, by, bw, bh);
    ctx.restore();
  };
  const S = (i, j) => [s.x + (i / n) * s.w, s.y + (j / m) * s.h];
  const D = (i, j) => project(i / n, j / m);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      tri(S(i, j), S(i + 1, j), S(i, j + 1), D(i, j), D(i + 1, j), D(i, j + 1));
      tri(S(i + 1, j), S(i + 1, j + 1), S(i, j + 1), D(i + 1, j), D(i + 1, j + 1), D(i, j + 1));
    }
  }
}

// Empty-slot look for the card previews
let ph = null;
export function placeholderPlane() {
  if (!ph) {
    ph = document.createElement("canvas");
    ph.width = 64;
    ph.height = 86;
    const c = ph.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, 86);
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(1, "#FF47BC");
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 86);
  }
  return ph;
}