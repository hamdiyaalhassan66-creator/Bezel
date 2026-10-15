import { CAM_KEYS, VID_EASES, smoothstep, vidEaseFn, sampleShots } from "./videoMath.js";
import { frameRect } from "./frameModel.js";

// "none" = playhead isn't inside any shot, "on" = it sits on a keyframe, "add" = inside a shot with no keyframe here.
// Uses the same shot pick and 1/60 tolerance as vidAddKey.
// Properties whose current camera value differs from what the timeline plays at time t.
// cam is rounded to whole numbers, so differences up to 0.5 are just rounding.
// ---- Frame-mode keyframes: each frame's placement is stored on the key as key.frames[frameId] = { x, y, w, h, s } ----
export function framePoseMap(frames, box) {
  if (!box) return undefined;
  const short = Math.min(box.w, box.h);
  const out = {};
  frames.forEach((f) => {
    out[f.id] = { x: f.x, y: f.y, w: f.w, h: f.h, s: f.s ?? frameRect(f, box).width / (f.w * short), r: f.r ?? 0 };
  });
  return out;
}

function framePoseChanged(a, b) {
  return (
    Math.abs(a.x - b.x) > 0.002 ||
    Math.abs(a.y - b.y) > 0.002 ||
    Math.abs(a.w * a.s - b.w * b.s) > 0.002 ||
    Math.abs(a.h * a.s - b.h * b.s) > 0.002 ||
    Math.abs((a.r ?? 0) - (b.r ?? 0)) > 0.05
  );
}

function sampleFrameKeys(keys, t, ease = smoothstep) {
  const out = {};
  const ids = new Set();
  keys.forEach((k) => k.frames && Object.keys(k.frames).forEach((id) => ids.add(id)));
  ids.forEach((id) => {
    const ks = keys.filter((k) => k.frames?.[id]);
    const last = ks[ks.length - 1];
    if (t <= ks[0].t) return void (out[id] = ks[0].frames[id]);
    if (t >= last.t) return void (out[id] = last.frames[id]);
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (t >= a.t && t <= b.t) {
        const f = a.ease ? vidEaseFn(a.ease, ease) : ease;
        const u = f((t - a.t) / Math.max(1e-6, b.t - a.t));
        const o = {};
        ["x", "y", "w", "h", "s", "r"].forEach((p) => {
          const va = a.frames[id][p] ?? 0, vb = b.frames[id][p] ?? 0;
          o[p] = va + (vb - va) * u;
        });
        return void (out[id] = o);
      }
    }
    out[id] = last.frames[id];
  });
  return out;
}

// Each frame follows its own shot(s): the latest active one wins, otherwise it holds its last pose.
export function sampleShotFrames(shots, t) {
  const list = shots.filter((s) => s.keys.some((k) => k.frames) && !s.hidden);
  if (!list.length) return null;
  const ease = (s) => VID_EASES[s.ease] ?? smoothstep;
  const ids = new Set();
  list.forEach((s) => s.keys.forEach((k) => k.frames && Object.keys(k.frames).forEach((id) => ids.add(id))));
  const out = {};
  ids.forEach((id) => {
    const own = list.filter((s) => s.keys.some((k) => k.frames?.[id]));
    let pick = null;
    for (let i = own.length - 1; i >= 0; i--) {
      const s = own[i];
      if (t >= s.start && t <= s.start + s.len) { pick = { s, u: t - s.start }; break; }
    }
    if (!pick) {
      let best = null;
      own.forEach((s) => { if (s.start + s.len < t && (!best || s.start + s.len > best.start + best.len)) best = s; });
      if (best) pick = { s: best, u: best.len };
    }
    if (!pick) pick = { s: [...own].sort((a, b) => a.start - b.start)[0], u: 0 };
    const r = sampleFrameKeys(pick.s.keys, pick.u, ease(pick.s))[id];
    if (r) out[id] = r;
  });
  return out;
}

export function changedCamProps(shots, t, cam) {
  if (!cam) return [];
  const base = sampleShots(shots, t); // null in Frame mode: its shots only key "frames"
  const out = base ? CAM_KEYS.filter((p) => Math.abs(base[p] - cam[p]) > 0.5) : [];
  // Frame mode: moving / resizing a frame counts as an edit ("frames")
  if (cam.frames) {
    const fb = sampleShotFrames(shots, t);
    if (fb && Object.keys(fb).length && Object.keys(cam.frames).some((id) => !fb[id] || framePoseChanged(cam.frames[id], fb[id])))
      out.push("frames");
  }
  return out;
}

export function keyStateAt(shots, selShot, t, prop = null, cam = null) {
  const inside = (s) => t >= s.start - 1e-6 && t <= s.start + s.len + 1e-6;
  const cur = shots.find((s) => s.id === selShot);
  const s = cur && inside(cur) ? cur : [...shots].reverse().find(inside);
  if (!s) return "none";
  const hit = s.keys.find((k) => Math.abs(s.start + k.t - t) < 1 / 60);
  if (!hit) {
    // adding needs an actual camera edit. Without one there's nothing to key (and during playback cam is null)
    const p0 = prop && prop !== "bg" ? prop : null;
    const changed = changedCamProps(shots, t, cam);
    return (p0 ? changed.includes(p0) : changed.length > 0) ? "add" : "idle";
  }
  // a keyframe here that doesn't cover the selected property doesn't count
  const p = prop && prop !== "bg" ? prop : null;
  if (p && hit.props && !hit.props.includes(p)) return "add";
  // shot row + a partial keyframe: properties changed since then aren't part of it yet
  if (!p && hit.props && changedCamProps(shots, t, cam).some((c) => !hit.props.includes(c))) return "add";
  return "on";
}

// The shot a keyframe would be added to at time t (same pick as keyStateAt / vidShotAt).
export function vidShotAtTime(shots, selShot, t) {
  const inside = (s) => t >= s.start - 1e-6 && t <= s.start + s.len + 1e-6;
  const cur = shots.find((s) => s.id === selShot);
  return cur && inside(cur) ? cur : [...shots].reverse().find(inside) ?? null;
}