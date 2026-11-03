import React, { useRef, useState, useEffect } from "react";
import { CAM_DEFAULT, frameCameraCss, getFrameCamera } from "../lib/frameUtils.js";
import { CAM_KEYS, vidEaseSpec, vidEaseFn, VID_FPS, vidClamp, sampleShots } from "../lib/videoMath.js";
import { shotAnimPose, shotForImgAt, sampleDeviceAnim } from "../lib/shotAnim.js";
import { bgProgress, bgAnimOf, bgKey, bgFallbackSnap, bgTmp, paintBgSnap, drawBgTransition } from "../lib/bgAnim.js";
import { cornersOf, frameRect, cloneFrame } from "../lib/frameModel.js";
import { framePoseMap, sampleShotFrames, changedCamProps, clipOf, CLIP_KEYS } from "../lib/frameKeys.js";
import { mixHex, txtRanks, txtUnitStates, sampleTextAnim } from "../lib/textAnim.js";
import { textName, prepText } from "../lib/textUtils.js";
import { surfaceHex } from "../lib/appUtils.js";
import { FRAME_LAYOUTS } from "../constants/templates.js";
import { templatePreviewCam } from "../constants/camera.js";
import { vtBgSnap, vtBgCss } from "../constants/videoTemplates.js";
import { PARAM_ALL, instantiateParam, defaultParams } from "../constants/paramTemplates.js";
import { defaultAnimImage } from "../constants/defaultImages.js";

export function useVideoTimeline({
  imageOrVideo, toolbarMode, animTab, tabKey, toolbarModeRef, tabKeyRef,
  sceneRef, frames, setFrames, framesLatestRef, selectedIds, setSelectedIds, selectedIdsRef,
  frameSizeRef, nextFrameIdRef, assetPoolRef,
  rotationX, rotationY, rotationZ, positionX, positionY, zoom, fov, handleViewChange,
  uploadedFileRef, uploadedCrop, mockupVideoRef,
  canvasDims, canvasBoxRef,
  bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientOpacity, gradientStops,
  grainAmount, customBgImageUrl, gradientCss, darkMode, hexToRgba,
  setBgType, setBgHex, setBgOpacity, setGradientType, setGradientAngle, setGradientOpacity,
  setGradientStops, setGrainAmount, setCustomBgImageUrl,
  textItems, setTextItems, nextTextIdRef, deleteTextLayer, fontTick,
  deviceType, addBlankFrame, deleteFrames, renderFrameCanvas,
  setCanvasSize, setCustomWidth, setCustomHeight, setSidebarOpen,
  restoreUntilRef, vidUploadRef, swapScene,
}) {
  // ---------- Video timeline logic ----------
  const videoOn = imageOrVideo === "video"; // the timeline works in Mockup and Frame mode
  const videoMock = videoOn && toolbarMode === "mockup";
  const [vidShots, setVidShots] = useState([]); // [{ id, name, start, len, ease, keys }]
const [vidBgs, setVidBgs] = useState([]);     // [{ id, start, len, snap, css, anim }]   (start = absolute seconds)
const [vidAudios, setVidAudios] = useState([]); // [{ id, name, src, start, len, offset, dur, peaks, volume, muted }]
const [selAudio, setSelAudio] = useState(null); // { aid }
const audioElsRef = useRef(new Map()); // clip id -> HTMLAudioElement
  const [vidSel, setVidSel] = useState({ shot: null, key: null, ids: [] });
  const [vidTexts, setVidTexts] = useState([]); // [{ id, tid, start, len, enter, exit }]
  const [vidDuration, setVidDuration] = useState(10);
  const [vidPlaying, setVidPlaying] = useState(false);
  const [vidLoop, setVidLoop] = useState(true);
  const [vidExporting, setVidExporting] = useState(false);
  const vidTimeRef = useRef(0);
  const [vidHead, setVidHead] = useState(0); // playhead as undoable state (not updated during playback)
  const vidEndRef = useRef(null); // resolver while exporting
  const vidId = useRef(1);
  const vidNo = useRef(2);
  const vidByModeRef = useRef({}); // each mode (mockup / frame) keeps its own timeline
  const prevVidModeRef = useRef(tabKey);
  const [vidSwapTick, setVidSwapTick] = useState(0);
  const autoKeyMuteRef = useRef(0); // while now < this, camera changes are programmatic and must not touch keyframes
  const vidLive = useRef({});
vidLive.current = {
  playing: vidPlaying,
  shots: vidShots,
  bgs: vidBgs,
  texts: vidTexts,
  audios: vidAudios,
  sel: vidSel,
  loop: vidLoop,
  duration: vidDuration,
  cam: {
    rotationX, rotationY, rotationZ, positionX, positionY, zoom, fov,
    ...(toolbarMode === "frame" ? { frames: framePoseMap(frames, frameSizeRef.current) } : {}),
  },
};

  const applyCam = (c) => {
    const s = sceneRef.current;
    if (!s || !c) return;
    s.setManualRotation(c.rotationX);
    s.setManualRotationY(c.rotationY);
    s.setManualRotationZ(c.rotationZ);
    s.setPositionX(c.positionX);
    s.setPositionY(c.positionY);
    s.setZoom(c.zoom);
    s.setFov(c.fov);
    applyFrameCam(c);
  };

  // Frame mode: the timeline writes straight to the DOM, so playback never re-renders the app
  const applyFrameCam = (c) => {
    const el = frameStageRef.current;
    const box = frameSizeRef.current;
    if (!el || !box || !c) return;
    el.style.transition = "none";
    el.style.transform = frameCameraCss(
      getFrameCamera({ ...CAM_DEFAULT, rotationX: c.rotationX, rotationY: c.rotationY, rotationZ: c.rotationZ, positionX: c.positionX, positionY: c.positionY, zoom: c.zoom }, box.h)
    );
  };
  const applyFrameAnim = (p) => {
    const el = frameAnimRef.current;
    const box = frameSizeRef.current;
    if (!el || !box) return;
    el.style.opacity = p ? String(vidClamp(p.a ?? 1, 0, 1)) : "";
    el.style.transform = p
      ? `translate(${(p.x ?? 0) * box.w}px, ${-(p.y ?? 0) * box.h}px) scale(${Math.max(0.001, p.s ?? 1)}) perspective(1400px) rotateX(${p.rx ?? 0}rad) rotateY(${p.ry ?? 0}rad)`
      : "";
  };

  // Frame mode: each frame follows its own row. Outside its row (or with the row hidden) the frame is hidden,
  // and the row's enter / exit animation moves only that frame.
  // Result per frame id: "hidden" | pose | {} (resting). Frames without a row aren't listed (always shown).
  const frameRowStates = (shots, frameIds, t) => {
    const out = {};
    frameIds.forEach((id) => {
      const rows = shots.filter((s) => s.frameId === id);
      if (!rows.length) return;
      const row = [...rows].reverse().find((s) => !s.hidden && t >= s.start - 1e-6 && t <= s.start + s.len + 1e-6);
      out[id] = row ? shotAnimPose(row, t) ?? {} : "hidden";
    });
    return out;
  };
  // t = null clears everything (used when leaving Video mode)
  const applyFrameRowStatesAt = (t) => {
    const stage = frameStageRef.current;
    const box = frameSizeRef.current;
    if (!stage || !box) return;
    const st = t == null ? {} : frameRowStates(vidLive.current.shots, framesLatestRef.current.map((f) => f.id), t);
    stage.querySelectorAll("[data-frame-id]").forEach((el) => {
      const p = st[el.dataset.frameId];
      if (p === "hidden") {
        el.style.opacity = "0";
        el.style.translate = "";
        el.style.scale = "";
      } else if (p) {
        const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = p;
        el.style.opacity = String(vidClamp(a, 0, 1));
        el.style.translate = `${x * box.w}px ${-y * box.h}px`;
        el.style.scale = `${Math.max(0.001, Math.abs(s * Math.cos(ry)))} ${Math.max(0.001, Math.abs(s * Math.cos(rx)))}`;
      } else {
        el.style.opacity = "";
        el.style.translate = "";
        el.style.scale = "";
      }
      // off its row and not selected: clicks pass through to whatever is underneath
      el.style.pointerEvents =
        p === "hidden" && !selectedIdsRef.current.includes(Number(el.dataset.frameId)) ? "none" : "";
    });
  };
  const showFrameBgCanvas = (src) => {
    const c = frameBgCanvasRef.current;
    if (!c) return;
    if (c.width !== src.width || c.height !== src.height) {
      c.width = src.width;
      c.height = src.height;
    }
    c.getContext("2d").drawImage(src, 0, 0);
    c.style.display = "block";
  };
  const hideFrameBgCanvas = () => {
    if (frameBgCanvasRef.current) frameBgCanvasRef.current.style.display = "none";
  };
  // Pushes the sampled camera into React state too, so the sliders match after a seek / pause.
  const commitCam = (c) => {
    if (!c) return;
    autoKeyMuteRef.current = performance.now() + 300; // sampled values pushed into the sliders are not user edits
    const r = {};
    CAM_KEYS.forEach((k) => (r[k] = Math.round(c[k])));
    handleViewChange(r);
  };

  // Mockup video: a camera edit made with the playhead on a property's first keyframe updates that keyframe,
  // so the starting camera can be changed without adding keys by hand.
  const prevCamRef = useRef(null);
  useEffect(() => {
    const cam = { rotationX, rotationY, rotationZ, positionX, positionY, zoom, fov };
    const prev = prevCamRef.current;
    prevCamRef.current = cam;
    if (!prev || !videoOn || toolbarMode !== "mockup" || vidPlaying || vidExporting) return;
    if (performance.now() < autoKeyMuteRef.current) return;
    const edited = CAM_KEYS.filter((p) => cam[p] !== prev[p]);
    if (!edited.length) return;
    const t = vidTimeRef.current;
    const s = vidShotAt(t);
    if (!s) return;
    const rel = t - s.start;
    const patches = new Map(); // key id -> { prop: value }
    edited.forEach((p) => {
      const key = s.keys.find((k) => !k.props || k.props.includes(p)); // the first keyframe driving this property
      if (key && Math.abs(key.t - rel) < 1 / 60) patches.set(key.id, { ...(patches.get(key.id) ?? {}), [p]: cam[p] });
    });
    if (!patches.size) return;
    const apply = (shots) =>
      shots.map((x) =>
        x.id !== s.id ? x : { ...x, keys: x.keys.map((k) => (patches.has(k.id) ? { ...k, ...patches.get(k.id) } : k)) }
      );
    vidLive.current.shots = apply(vidLive.current.shots);
    setVidShots(apply);
  }, [rotationX, rotationY, rotationZ, positionX, positionY, zoom, fov]);

  // Applies the background clip under time t (later shots / clips win). Only touches state when the active clip changes.
  const vidBgActive = useRef(null);
  const bgAppliedKeyRef = useRef(null); // key of the last background pushed in from a clip, so only user edits create rows
  const vidImgFiles = useRef(new Map()); // shot image id -> File
  const vidImgShown = useRef(null); // id of the shot image on the device, null = the Image-mode upload
  const uploadedCropRef = useRef(null);
  uploadedCropRef.current = uploadedCrop;
  const vidBgExitKeyRef = useRef(null); // background as it was when Video mode was last left
  const vidTextSeenRef = useRef(new Set()); // text ids that already had their chance to get a timeline clip
  const [selBg, setSelBg] = useState(null); // { sid, bid } of the clip being edited
  const [selText, setSelText] = useState(null); // { sid, cid } of the text clip being edited
  const selBgRef = useRef(null);
  selBgRef.current = selBg;
  // ---- Background animations ----
  const bgAnimCanvasRef = useRef(null); // the canvas handed to the scene as its background
  const frameBgCanvasRef = useRef(null); // Frame mode: same idea, a DOM canvas under the frames
  const frameStageRef = useRef(null); // Frame mode: the camera plane
  const frameAnimRef = useRef(null); // Frame mode: enter / exit pose wrapper
  const bgAnimOnRef = useRef(null); // clip whose animation is currently painting the scene
  const bgAnimCacheRef = useRef({}); // painted from / to canvases, reused between frames
  const bgImgCacheRef = useRef(new Map());
  const canvasDimsRef = useRef(null);
  canvasDimsRef.current = canvasDims;

  // Puts a stored background snapshot straight into the scene (used when an animation ends).
  const pushBgSnap = (sn) => {
    const sc = sceneRef.current;
    if (!sc || !sn) return;
    if (toolbarModeRef.current === "frame") {
      applyBgSnap(sn); // Frame mode reads the background from React state
      return;
    }
    if (sn.bgType === "solid") sc.setBackground(sn.bgHex, sn.bgOpacity);
    else if (sn.bgType === "gradient") sc.setBackgroundGradient?.(sn.gradientType, sn.gradientStops, sn.gradientOpacity, sn.gradientAngle, sn.grainAmount);
    else if (sn.bgType === "custom") sc.setBackgroundImage?.(sn.customBgImageUrl);
  };

  // Returns the loaded image, or null (and starts loading it, then repaints the current frame).
  const bgImage = (url) => {
    const cache = bgImgCacheRef.current;
    const hit = cache.get(url);
    if (hit) return hit.complete && hit.naturalWidth ? hit : null;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      bgAnimCacheRef.current = {};
      applyBgAt(vidTimeRef.current);
    };
    im.src = url;
    cache.set(url, im);
    return null;
  };

  // The clip whose background is showing right before this one starts.
const bgClipBefore = (clip) => {
  let best = null, bestStart = -Infinity;
  vidLive.current.bgs.forEach((b) => {
    if (!b.hidden && b.id !== clip.id && b.start < clip.start - 1e-6 && b.start > bestStart) {
      best = b;
      bestStart = b.start;
    }
  });
  return best;
};

// The clip that starts next, so an exit has something to animate towards.
const bgClipAfter = (clip) => {
  let best = null, bestStart = Infinity;
  vidLive.current.bgs.forEach((b) => {
    if (!b.hidden && b.id !== clip.id && b.start > clip.start + 1e-6 && b.start < bestStart) {
      best = b;
      bestStart = b.start;
    }
  });
  return best;
};

const renderBgAnim = (clip, kind, anim, u) => {
    const scene = sceneRef.current;
    const d = canvasDimsRef.current;
    if (!scene?.setBackgroundCanvas || !d) return false;
    const W = 1280, H = Math.max(2, Math.round((W * d.h) / d.w));
    const out = (bgAnimCanvasRef.current ??= document.createElement("canvas"));
    if (out.width !== W || out.height !== H) {
      out.width = W;
      out.height = H;
      bgAnimCacheRef.current = {};
    }
    const other = kind === "exit" ? bgClipAfter(clip) : bgClipBefore(clip); // what the background comes from / goes to
    const fromKey = other?.snap ?? null;
    const fallback = bgFallbackSnap();
    const cache = bgAnimCacheRef.current;
    const fc = bgTmp("live-from", W, H);
    const tc = bgTmp("live-to", W, H);
    if (cache.to !== clip.snap || cache.from !== fromKey) {
      const okFrom = paintBgSnap(fc.getContext("2d"), fromKey ?? fallback, W, H, bgImage);
      const okTo = paintBgSnap(tc.getContext("2d"), clip.snap, W, H, bgImage);
      if (okFrom && okTo) {
        cache.to = clip.snap;
        cache.from = fromKey;
      }
    }
    const p = bgProgress(anim.id, vidClamp(u, 0, 1), anim.ease);
    drawBgTransition(out.getContext("2d"), anim.id, fc, tc, p, W, H, "live", anim);
    if (toolbarModeRef.current === "frame") showFrameBgCanvas(out);
    else scene.setBackgroundCanvas(out);
    return true;
  };
const applyBgAt = (t) => {
  let hit = null;
  vidLive.current.bgs.forEach((b) => {
    if (!b.hidden && t >= b.start && t <= b.start + b.len) hit = b;
  });
  // Paused: a selected row wins any overlap, so selecting a lower row doesn't get overridden by the one above it.
  if (selBgRef.current && !vidLive.current.playing && !vidEndRef.current) {
    const picked = vidLive.current.bgs.find(
      (b) => b.id === selBgRef.current.bid && !b.hidden && t >= b.start && t <= b.start + b.len
    );
    if (picked) hit = picked;
  }

    if (hit && hit.id !== vidBgActive.current) {
      vidBgActive.current = hit.id;
      if (selBgRef.current && selBgRef.current.bid !== hit.id) setSelBg(null);
      applyBgSnap(hit.snap);
    }

  if (hit) {
    const en = bgAnimOf(hit, "enter"), ex = bgAnimOf(hit, "exit");
    // exit wins when the two overlap, same as text
    if (ex) {
      const x1 = hit.start + hit.len - ex.delay / 1000;
      const x0 = x1 - ex.dur / 1000;
      if (t > x0) {
        const q = vidClamp((t - x0) / Math.max(1e-6, x1 - x0), 0, 1);
        if (renderBgAnim(hit, "exit", ex, 1 - q)) {
          bgAnimOnRef.current = hit;
          return;
        }
      }
    }
    if (en) {
      const e0 = hit.start + en.delay / 1000;
      const u = (t - e0) / Math.max(0.05, Math.min(en.dur / 1000, hit.len));
      if (u < 1 && renderBgAnim(hit, "enter", en, Math.max(0, u))) {
        bgAnimOnRef.current = hit;
        return;
      }
    }
  }

    // animation just ended (or was left): hand the scene back to the normal background
    if (bgAnimOnRef.current) {
      const done = bgAnimOnRef.current;
      bgAnimOnRef.current = null;
      sceneRef.current?.setBackgroundCanvas?.(null);
      hideFrameBgCanvas();
      // an exit that ran out into a gap leaves the scene on what it animated to
      const exited = !hit && bgAnimOf(done, "exit");
      pushBgSnap(exited ? (bgClipAfter(done)?.snap ?? bgFallbackSnap()) : (hit ?? done).snap);
    }
  };

  const applyBgSnap = (sn) => {
    bgAppliedKeyRef.current = bgKey(sn);
    setBgType(sn.bgType);
    setBgHex(sn.bgHex);
    setBgOpacity(sn.bgOpacity);
    setGradientType(sn.gradientType);
    setGradientAngle(sn.gradientAngle);
    setGradientOpacity(sn.gradientOpacity);
    setGradientStops(sn.gradientStops.map((s) => ({ ...s })));
    setGrainAmount(sn.grainAmount);
    setCustomBgImageUrl(sn.customBgImageUrl);
  };

  // Enter / exit pose of the device at time t.
const applyShotImgAt = (t) => {
  const sc = sceneRef.current;
  if (!sc) return;
  // the selected shot wins when shots overlap, so its own image (or no image) is what shows
  const { shots, sel } = vidLive.current;
  const picked = shots.find((x) => x.id === sel.shot && !x.hidden && t >= x.start - 1e-6 && t <= x.start + x.len + 1e-6);
  const s = picked ?? shotForImgAt(shots, t);
  const id = s?.img?.id ?? null;
  if (id === vidImgShown.current) return; // already showing
  vidImgShown.current = id;
  if (id) {
    const f = vidImgFiles.current.get(id);
    if (f) sc.uploadFile(f, s.img.crop ?? undefined);
  } else if (uploadedFileRef.current) {
    sc.uploadFile(uploadedFileRef.current, uploadedCropRef.current ?? undefined);
  } else {
    sc.clearScreenshot();
  }
};

// Frame mode: writes the keyframed placement of each frame into state (also used by playback and export)
const applyFramePosesAt = (t) => {
  if (toolbarModeRef.current !== "frame") return;
  const poses = sampleShotFrames(vidLive.current.shots, t);
  if (!poses || !Object.keys(poses).length) return;
  let diff = false;
  const next = framesLatestRef.current.map((f) => {
    const p = poses[f.id];
    if (!p) return f;
    const n = { x: p.x, y: p.y, w: Math.round(p.w), h: Math.round(p.h), s: p.s, r: p.r ?? 0, rx: p.rx ?? 0, ry: p.ry ?? 0, z: p.z ?? 0, sh: p.sh ?? 0, ...clipOf(p) };
    if (
      f.x === n.x && f.y === n.y && f.w === n.w && f.h === n.h && f.s === n.s && (f.r ?? 0) === n.r &&
      (f.rx ?? 0) === n.rx && (f.ry ?? 0) === n.ry && (f.z ?? 0) === n.z && (f.sh ?? 0) === n.sh &&
      CLIP_KEYS.every((k) => (f[k] ?? 0) === n[k])
    ) return f;
    diff = true;
    return { ...f, ...n };
  });
  if (!diff) return;
  framesLatestRef.current = next;
  if (tabKeyRef.current !== "animation") restoreUntilRef.current = Date.now() + 400; // keeps playback from filling the undo history (Animation's frames aren't in its history)
  setFrames(next);
};

const applyAnimAt = (t) => {
  const shots = vidLive.current.shots;
  const pose = shots.length ? sampleDeviceAnim(shots, t) : null;
  if (toolbarModeRef.current === "frame") {
    applyFramePosesAt(t);
    // whole-canvas animation only for rows that aren't tied to a frame; frame rows animate their own frame
    applyFrameAnim(shots.length ? sampleDeviceAnim(shots.filter((s) => s.frameId == null), t) : null);
    applyFrameRowStatesAt(t);
    return;
  }
  applyShotImgAt(t);
  sceneRef.current?.setDeviceAnim?.(pose);
  if (vidLive.current.texts.length) pushSceneTexts(t);
};

  // Text for the 3D scene / export. The scene only gets block-level motion (opacity, offset, scale).
  // Per-letter motion is drawn by the DOM overlay (TextEditor).
  const textLive = useRef({});
  textLive.current = { textItems, canvasDims };
const textsAt = (t, mode) => {
  const { textItems: items, canvasDims: dims } = textLive.current;
  const clips = vidLive.current.texts;
  return items
    .filter((it) => (it.mode ?? "mockup") === mode && it.visible !== false && it.content)
    .map((it) => {
      const base = prepText(it, dims);
      const st = t == null ? undefined : sampleTextAnim(clips, it.id, t);
      if (st === undefined || (st && !st.spec)) return base;
      if (st === null) return null; // outside its clip
      const u = txtUnitStates(st.spec, st.p, 1)[0];
      return {
        ...base,
        hex: u.c ? mixHex(u.c, base.hex, u.ce) : base.hex,
        letterSpacing: (base.letterSpacing ?? 0) + u.ls,
        lineHeight: base.lineHeight + u.lh,
        opacity: base.opacity * vidClamp(u.a, 0, 1),
        size: Math.max(1, base.size * u.s),
        dx: (base.dx ?? 0) + ((u.x / 100) * base.size) / (dims?.w || 1),
        dy: (base.dy ?? 0) + ((u.y / 100) * base.size) / (dims?.h || 1),
      };
    })
    .filter(Boolean);
};
const pushSceneTexts = (t) => {
  const scene = sceneRef.current;
  if (!scene) return;
  const list = textsAt(t, "mockup");
  if (scene.setTexts) scene.setTexts(list); // multi-layer, once MockupScene supports it
  else scene.setText(list.length ? list[list.length - 1] : null); // single-layer fallback
};
  useEffect(() => {
    pushSceneTexts(videoOn ? vidTimeRef.current : null);
  }, [textItems, canvasDims, fontTick, videoOn, vidTexts]);

  // Playback range: the selected shot's span, or the whole timeline when nothing is selected.
// Export always uses the full timeline.
const vidRange = () => {
  const { shots, sel, duration } = vidLive.current;
  const chosen = vidEndRef.current ? [] : shots.filter((x) => sel.ids.includes(x.id));
  if (!chosen.length) return { a: 0, b: duration };
  return { a: Math.min(...chosen.map((s) => s.start)), b: Math.max(...chosen.map((s) => s.start + s.len)) };
};

  const vidSeek = (t) => {
    // Scrubbing is free across the whole timeline. Only playback is limited to the selected shot's range.
    const tt = vidClamp(t, 0, vidLive.current.duration);
    vidTimeRef.current = tt;
    setVidHead(tt);
    const c = sampleShots(vidLive.current.shots, tt);
    applyCam(c);
    applyBgAt(tt);
    applyAnimAt(tt);
    syncVideos(tt, false);
    commitCam(c);
  };

  useEffect(() => {
    if (!vidPlaying) return;
    let raf, prev = performance.now();
const step = (now) => {
  const { shots, loop } = vidLive.current;
  const { a, b } = vidRange();
  let t = vidTimeRef.current + (now - prev) / 1000;
  prev = now;
  const exporting = !!vidEndRef.current;
  if (t >= b) {
    if (loop && !exporting) t = a; // loop the selected shot, or the whole timeline
    else {
      vidTimeRef.current = b;
      applyCam(sampleShots(shots, b));
      applyAnimAt(b);
      setVidPlaying(false);
      vidEndRef.current?.();
      vidEndRef.current = null;
      return;
    }
  }
  vidTimeRef.current = t;
  applyCam(sampleShots(shots, t));
  applyBgAt(t);
  applyAnimAt(t);
  syncAudio(t, !exporting);
  syncVideos(t, !exporting);
  raf = requestAnimationFrame(step);
};
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      commitCam(sampleShots(vidLive.current.shots, vidTimeRef.current));
      syncAudio(0, false);
      syncVideos(vidTimeRef.current, false);
    };
  }, [vidPlaying]);

  // leaving Video mode stops playback and hands the background back to the Scene panel
  useEffect(() => {
    if (videoOn) {
      applyAnimAt(vidTimeRef.current);
      return;
    }
    setVidPlaying(false);
    if (vidImgShown.current !== null) {
      vidImgShown.current = null; // Image mode shows the Image-mode upload again
      if (uploadedFileRef.current) sceneRef.current?.uploadFile(uploadedFileRef.current, uploadedCrop ?? undefined);
      else sceneRef.current?.clearScreenshot();
    }
    vidBgExitKeyRef.current = JSON.stringify(bgSnapshot());
    sceneRef.current?.setDeviceAnim?.(null); // Image mode always shows the device at rest
    applyFrameAnim(null);
    applyFrameRowStatesAt(null);
    if (bgAnimOnRef.current) {
      bgAnimOnRef.current = null;
      sceneRef.current?.setBackgroundCanvas?.(null);
      hideFrameBgCanvas();
      pushBgSnap(bgSnapshot());
    }
  }, [videoOn]);

  // first time Video opens: start with "Shot 1" holding the current camera, and a background clip holding the current background
  useEffect(() => {
    if (!videoOn) return;
    // the canvas always has a background, so it gets its own clip across the whole timeline
    if (!vidLive.current.bgs.length) {
      const bid = vidId.current++;
      const clip = { id: bid, start: 0, len: vidLive.current.duration, snap: bgSnapshot(), css: bgPreviewCss() };
      vidLive.current.bgs = [clip]; // sync, so the playhead sampling sees it right away
      vidBgActive.current = bid; // already showing, no need to re-apply it
      setVidBgs([clip]);
    } else if (vidBgExitKeyRef.current !== null && JSON.stringify(bgSnapshot()) !== vidBgExitKeyRef.current) {
      // background was changed in Image mode since the last visit: it becomes the default (first) row
      vidPatchBg(vidLive.current.bgs[0].id, { snap: bgSnapshot(), css: bgPreviewCss() });
      vidBgActive.current = null;
      applyBgAt(vidTimeRef.current);
    }
    if (vidLive.current.shots.length || toolbarMode === "frame") return; // Frame mode: each frame gets its own row
    const sid = vidId.current++, kid = vidId.current++;
    vidNo.current = 2; // "Shot 1" is taken, next one is "Shot 2"
    setVidShots([{ id: sid, name: "Shot 1", start: 0, len: 5, ease: "smooth", keys: [{ id: kid, t: 0, ...vidLive.current.cam }] }]);
    setVidSel({ shot: sid, key: null, ids: [sid] });
  }, [videoOn, vidSwapTick]);

  // Scene look swaps first, then the timeline swaps (order matters: the timeline's background / camera wins in Video mode)
  useEffect(() => {
    swapScene();
  }, [tabKey]);

  // Switching Mockup <-> Frame swaps the whole timeline
  useEffect(() => {
    const prev = prevVidModeRef.current;
    if (prev === tabKey) return;
    prevVidModeRef.current = tabKey;
    const l = vidLive.current;
    vidByModeRef.current[prev] = {
      shots: l.shots, bgs: l.bgs, texts: l.texts, duration: l.duration, no: vidNo.current, time: vidTimeRef.current,
    };
    const next = vidByModeRef.current[tabKey] ?? { shots: [], bgs: [], texts: [], duration: 10, no: 2, time: 0 };
    const sel = { shot: null, key: null, ids: [], prop: null };
    l.shots = next.shots; // sync, so the seek below samples the new timeline
    l.bgs = next.bgs;
    l.texts = next.texts;
    l.duration = next.duration;
    l.sel = sel;
    setVidPlaying(false);
    setVidShots(next.shots);
    setVidBgs(next.bgs);
    setVidTexts(next.texts);
    setVidDuration(next.duration);
    setVidSel(sel);
    setSelBg(null);
    setSelText(null);
    vidNo.current = next.no;
    vidBgActive.current = null;
    vidBgExitKeyRef.current = null;
    setVidSwapTick((n) => n + 1); // lets the init effect create Shot 1 / a background clip if this mode is new
    if (videoOn) vidSeek(next.time);
    else {
      vidTimeRef.current = next.time;
      setVidHead(next.time);
    }
  }, [tabKey]);

  // Frame mode: every frame on the canvas gets its own timeline row.
  // Frames that already had their chance (seen) aren't re-added, so a row you delete stays deleted.
  const vidFrameSeenRef = useRef(new Set());
  useEffect(() => {
    if (!videoOn || toolbarMode !== "frame") return;
    const poses = framePoseMap(frames, frameSizeRef.current);
    if (!poses) return;
    const cur = vidLive.current.shots;
    const ids = new Set(frames.map((f) => f.id));
    const seen = vidFrameSeenRef.current;
    const kept = cur.filter((s) => s.frameId == null || ids.has(s.frameId)); // deleted frame -> its row goes too
    const added = [];
    frames.forEach((f, i) => {
      if (seen.has(f.id)) return;
      seen.add(f.id);
      if (kept.some((s) => s.frameId === f.id)) return; // a template already made its row
      added.push({
        id: vidId.current++,
        name: `Frame ${i + 1}`,
        start: 0,
        len: vidLive.current.duration,
        ease: "smooth",
        frameId: f.id,
        keys: [{ id: vidId.current++, t: 0, props: ["frames"], frames: { [f.id]: poses[f.id] } }],
      });
    });
    if (!added.length && kept.length === cur.length) return;
    const next = [...kept, ...added];
    vidLive.current.shots = next;
    setVidShots(next);
  }, [videoOn, toolbarMode, frames, vidSwapTick]);

  // Frame video: a frame you move, resize or rotate keeps its row's only keyframe in step, so scrubbing or playing
  // never snaps it back. With several keyframes, only the one under the playhead follows.
  // Only runs right after a user edit (markFrameEdit), never for changes the timeline itself makes.
  const frameEditRef = useRef(0);
  const markFrameEdit = () => {
    frameEditRef.current = performance.now() + 250;
  };
  useEffect(() => {
    if (performance.now() > frameEditRef.current) return;
    if (!videoOn || toolbarMode !== "frame" || animTab || vidPlaying || vidExporting) return;
    const box = frameSizeRef.current;
    const poses = box ? framePoseMap(frames, box) : null;
    if (!poses) return;
    const t = vidTimeRef.current;
    const POSE = ["x", "y", "w", "h", "s", "r"];
    let touched = false;
    const next = vidLive.current.shots.map((s) => {
      const pose = s.frameId != null ? poses[s.frameId] : null;
      if (!pose || !s.keys.length) return s;
      const key = s.keys.find((k) => Math.abs(s.start + k.t - t) < 1 / 60 && k.frames?.[s.frameId]);
      const cur = key?.frames?.[s.frameId];
      if (!cur) return s;
      if (POSE.every((p) => Math.abs((cur[p] ?? 0) - (pose[p] ?? 0)) < 1e-4)) return s;
      touched = true;
      return {
        ...s,
        keys: s.keys.map((k) => (k === key ? { ...k, frames: { ...k.frames, [s.frameId]: { ...pose } } } : k)),
      };
    });
    if (!touched) return;
    vidLive.current.shots = next;
    setVidShots(next);
  }, [frames]);

  // Frame mode: selecting frames (canvas or Upload Media thumbnails) selects their timeline rows.
  // No seek here, so grabbing a frame never snaps it back to a keyed pose.
  const soloFrameRef = useRef(null); // frame that was double-clicked: select only its row, not its group
  useEffect(() => {
    if (!videoOn || toolbarMode !== "frame") return;
    const isSolo = selectedIds.length === 1 && soloFrameRef.current === selectedIds[0];
    if (!isSolo) soloFrameRef.current = null;
    const all = vidLive.current.shots;
    const picked = all.filter((s) => s.frameId != null && selectedIds.includes(s.frameId));
    // single click: the whole group's rows. Double click: only that frame's row.
    const gids = new Set(isSolo ? [] : picked.filter((s) => s.group).map((s) => s.group));
    const rows = all.filter((s) => picked.includes(s) || (s.frameId != null && s.group && gids.has(s.group)));
    if (!rows.length) return;
    const ids = rows.map((s) => s.id);
    const cur = vidLive.current.sel;
    if (cur.ids.length === ids.length && ids.every((i) => cur.ids.includes(i))) return;
    const next = { shot: ids[ids.length - 1], key: null, ids, prop: null };
    vidLive.current.sel = next;
    setVidSel(next);
    setSelBg(null);
    setSelText(null);
  }, [selectedIds, videoOn, toolbarMode]);

  // Row visibility must follow selection, new/changed rows and frame changes
  useEffect(() => {
    if (videoOn && toolbarMode === "frame") applyFrameRowStatesAt(vidTimeRef.current);
  }, [selectedIds, videoOn, toolbarMode, vidShots, frames]);

  const vidShotAt = (t) => {
    const { shots, sel } = vidLive.current;
    const inside = (s) => t >= s.start - 1e-6 && t <= s.start + s.len + 1e-6;
    const cur = shots.find((s) => s.id === sel.shot);
    return cur && inside(cur) ? cur : [...shots].reverse().find(inside) ?? null;
  };

const vidAddShot = () => {
  if (animTab) return; // Animation: planes come from the template
  if (toolbarModeRef.current === "frame") return addBlankFrame();
  const { shots, duration, cam } = vidLive.current;
  const end = shots.reduce((m, s) => Math.max(m, s.start + s.len), 0);
  const len = 3;
  if (end + len > duration) setVidDuration(Math.ceil(end + len));
  const sid = vidId.current++, kid = vidId.current++;
  if (!shots.length) vidNo.current = 1; // timeline was emptied: restart numbering
  const name = `Shot ${vidNo.current++}`; // computed once, outside the updater
  setVidShots((prev) => [...prev, { id: sid, name, start: end, len, ease: "smooth", keys: [{ id: kid, t: 0, ...cam }] }]);
  setVidSel({ shot: sid, key: kid, ids: [sid] });
  vidTimeRef.current = end;
  setVidHead(end);
};

  // Properties whose current value differs from what the timeline plays at time t.
  // Returns null when nothing changed, or when everything changed (= key every property).
  const vidChangedProps = (t) => {
    const changed = changedCamProps(vidLive.current.shots, t, vidLive.current.cam);
    return changed.length && changed.length < CAM_KEYS.length ? changed : null;
  };

  // Adds a keyframe at the playhead for the properties that changed (or all of them if none did).
const vidAddKey = () => {
  const t = vidTimeRef.current;
  const s = vidShotAt(t);
  if (!s) return;
  const rel = +(t - s.start).toFixed(3);
  const { frames: allFrames, ...camOnly } = vidLive.current.cam;
  // frame shot: only its own frame. Group's camera shot: no frames. Anything else: unchanged.
  const cam =
    s.frameId != null ? { ...camOnly, frames: { [s.frameId]: allFrames?.[s.frameId] } }
    : s.group ? camOnly
    : vidLive.current.cam;

// A selected property row keys only that property.
// From the shot track, key only the properties you changed (null = every property, when nothing or everything changed).
const selProp = vidLive.current.sel.prop;
const rowProp = selProp && selProp !== "bg" ? selProp : null;
  let props = s.frameId != null ? ["frames"] : rowProp ? [rowProp] : vidChangedProps(t);
  if (s.group && s.frameId == null && props) props = props.filter((p) => p !== "frames");
  if (props && !props.length) return;

  const hit = s.keys.find((k) => Math.abs(k.t - rel) < 1 / 60);
  const kid = hit ? hit.id : vidId.current++;
  setVidShots((prev) =>
    prev.map((x) => {
      if (x.id !== s.id) return x;
      if (hit) {
        return {
          ...x,
          keys: x.keys.map((k) => {
            if (k.id !== hit.id) return k;
            const merged = { ...k };
            (props ?? CAM_KEYS).forEach((p) => (merged[p] = cam[p])); // "frames" in props copies the frame placement too
            if (!props && cam.frames) merged.frames = cam.frames;
            merged.props = !k.props || !props ? undefined : [...new Set([...k.props, ...props])];
            return merged;
          }),
        };
      }
      const newKey = { id: kid, t: rel, ...cam, ...(props ? { props } : {}) };
      // a camera-only key (e.g. a single property row) must not pin the frames
      if (newKey.frames && props && !props.includes("frames")) delete newKey.frames;
      return {
        ...x,
        keys: [...x.keys, newKey].sort((a, b) => a.t - b.t),
      };
    })
  );
  setVidSel({ shot: s.id, key: kid, ids: [s.id], prop: rowProp });
};

const vidDelete = () => {
  const { shot, key, ids } = vidLive.current.sel;
  if (!ids.length) return;
  if (animTab && !(ids.length === 1 && key != null)) return; // Animation: rows belong to the template, only keyframes can go
  if (ids.length === 1 && key != null) {
    // one shot with a keyframe selected: delete just the keyframe
    setVidShots((prev) => prev.map((s) => (s.id === shot ? { ...s, keys: s.keys.filter((k) => k.id !== key) } : s)));
    setVidSel({ shot, key: null, ids });
  } else {
    // frame rows take their frame with them
    const goneFrames =
      toolbarModeRef.current === "frame"
        ? vidLive.current.shots.filter((s) => ids.includes(s.id) && s.frameId != null).map((s) => s.frameId)
        : [];
    setVidShots((prev) => prev.filter((s) => !ids.includes(s.id)));
    setVidSel({ shot: null, key: null, ids: [] });
    if (goneFrames.length) {
      goneFrames.forEach((id) => vidFrameSeenRef.current.delete(id)); // if it was the last frame, its blank placeholder gets a fresh row
      deleteFrames(goneFrames);
    }
  }
};

  const vidPatchShot = (id, patch) => setVidShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const vidSetShotImg = (sid, file) => {
    let img = null;
    if (file) {
      const id = `simg-${vidId.current++}`;
      vidImgFiles.current.set(id, file);
      img = { id, thumb: URL.createObjectURL(file), label: file.name };
    }
    vidLive.current.shots = vidLive.current.shots.map((s) => (s.id === sid ? { ...s, img } : s)); // sync, so the apply below sees it
    vidPatchShot(sid, { img });
    vidImgShown.current = undefined; // forces a reload even if the id matches
    applyShotImgAt(vidTimeRef.current);
  };
  // Crops the shot's own image and reloads it on the device
  const vidCropShotImg = (sid, crop) => {
    const apply = (shots) => shots.map((s) => (s.id === sid && s.img ? { ...s, img: { ...s.img, crop } } : s));
    vidLive.current.shots = apply(vidLive.current.shots); // sync, so the apply below sees it
    setVidShots(apply);
    vidImgShown.current = undefined; // forces a reload even if the id matches
    applyShotImgAt(vidTimeRef.current);
  };
  // Selected shot, else the shot under the playhead
  vidUploadRef.current = (file) => {
    const { shots, sel } = vidLive.current;
    const target = shots.find((s) => s.id === sel.shot) ?? shotForImgAt(shots, vidTimeRef.current);
    if (!target) return false;
    vidSetShotImg(target.id, file);
    return true;
  };
  const vidPatchKey = (sid, kid, patch) =>
    setVidShots((prev) =>
      prev.map((s) => (s.id === sid ? { ...s, keys: s.keys.map((k) => (k.id === kid ? { ...k, ...patch } : k)).sort((a, b) => a.t - b.t) } : s))
    );
  const vidReorder = (fromId, toId) =>
    setVidShots((prev) => {
      const from = prev.findIndex((s) => s.id === fromId), to = prev.findIndex((s) => s.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  // Diamond button: removes the keyframe under the playhead, or adds one if there isn't any.
const vidToggleKey = () => {
  const t = vidTimeRef.current;
  const s = vidShotAt(t);
  if (!s) return;
  const hit = s.keys.find((k) => Math.abs(s.start + k.t - t) < 1 / 60);
  const selProp = vidLive.current.sel.prop;
  const rowProp = selProp && selProp !== "bg" ? selProp : null;

  // no keyframe here, or one that doesn't cover the selected property -> add it, but only if the camera was edited
  const covers = hit && (!rowProp || !hit.props || hit.props.includes(rowProp));
  if (!covers) {
    const changed = changedCamProps(vidLive.current.shots, t, vidLive.current.cam);
    if (rowProp ? !changed.includes(rowProp) : !changed.length) return;
    return vidAddKey();
  }

  // shot row + partial keyframe + newly changed properties -> merge them into the keyframe
  if (!rowProp && hit.props && changedCamProps(vidLive.current.shots, t, vidLive.current.cam).some((c) => !hit.props.includes(c)))
    return vidAddKey();

  // a property row is selected and the keyframe drives other properties too -> remove just that property
  const current = hit.props ?? CAM_KEYS;
  if (rowProp && current.length > 1) {
    const remaining = current.filter((p) => p !== rowProp);
    setVidShots((prev) =>
      prev.map((x) =>
        x.id === s.id ? { ...x, keys: x.keys.map((k) => (k.id === hit.id ? { ...k, props: remaining } : k)) } : x
      )
    );
    return;
  }

  // otherwise remove the whole keyframe
  setVidShots((prev) => prev.map((x) => (x.id === s.id ? { ...x, keys: x.keys.filter((k) => k.id !== hit.id) } : x)));
  setVidSel((p) => ({ ...p, key: p.key === hit.id ? null : p.key }));
};

  // Right-click menu: re-save a keyframe with the camera as it is right now.
  const vidUpdateKey = (sid, kid) => vidPatchKey(sid, kid, { ...vidLive.current.cam });

  // Right-click menu: remove one specific keyframe, whichever shot or selection is active.
  const vidDeleteKey = (sid, kid) => {
    setVidShots((prev) => prev.map((s) => (s.id === sid ? { ...s, keys: s.keys.filter((k) => k.id !== kid) } : s)));
    setVidSel((p) => ({ ...p, key: p.key === kid ? null : p.key }));
  };

  // Copies the selected shots. Camera shots go after the last shot. Frame rows get a real copy of their
  // frame (new id, nudged down-right), stay at the same time, and copies of a group form a new group.
  const vidDuplicate = () => {
    if (animTab) return;
    const { shots, sel, duration } = vidLive.current;
    const src = shots.filter((s) => sel.ids.includes(s.id));
    if (!src.length) return;
    const hasFrameRows = toolbarModeRef.current === "frame" && src.some((s) => s.frameId != null);
    const end = shots.reduce((m, s) => Math.max(m, s.start + s.len), 0);
    const delta = hasFrameRows ? 0 : end - Math.min(...src.map((s) => s.start));
    const OFF = 0.03;

    // frame rows: clone each frame once, remember old id -> new id
    const newFrameIds = {};
    if (hasFrameRows) {
      const cur = framesLatestRef.current;
      const clones = [];
      src.forEach((s) => {
        if (s.frameId == null || newFrameIds[s.frameId] != null) return;
        const f = cur.find((x) => x.id === s.frameId);
        if (!f) return;
        const nid = nextFrameIdRef.current++;
        newFrameIds[s.frameId] = nid;
        vidFrameSeenRef.current.add(nid); // this row is created below, so the frame-row effect must skip it
        clones.push({ ...cloneFrame(f, nid), x: f.x + OFF, y: f.y + OFF });
      });
      if (clones.length) {
        const next = [...cur, ...clones];
        framesLatestRef.current = next;
        setFrames(next);
        setSelectedIds(clones.map((c) => c.id));
      }
    }

    const gmap = {}; // old group id -> new group id
    const copies = src.flatMap((s) => {
      const nf = s.frameId != null ? newFrameIds[s.frameId] : undefined;
      if (s.frameId != null && nf == null) return []; // its frame no longer exists
      const g = s.group ? (gmap[s.group] ??= vidId.current++) : undefined;
      return [{
        ...s,
        id: vidId.current++,
        name: `${s.name} copy`,
        start: s.start + delta,
        group: g,
        groupName: s.group ? `${s.groupName || "Group"} copy` : undefined,
        ...(nf != null ? { frameId: nf } : {}),
        keys: s.keys.map((k) => {
          const p = nf != null && k.frames ? k.frames[s.frameId] : null;
          return {
            ...k,
            id: vidId.current++,
            ...(nf != null && k.frames ? { frames: p ? { [nf]: { ...p, x: p.x + OFF, y: p.y + OFF } } : undefined } : {}),
          };
        }),
      }];
    });
    if (!copies.length) return;
    const newEnd = Math.max(...copies.map((c) => c.start + c.len));
    if (newEnd > duration) setVidDuration(Math.ceil(newEnd));
    setVidShots((prev) => [...prev, ...copies]);
    setVidSel({ shot: copies[copies.length - 1].id, key: null, ids: copies.map((c) => c.id) });
    vidTimeRef.current = copies[0].start;
    setVidHead(copies[0].start);
    const c = sampleShots(copies, copies[0].start);
    applyCam(c);
    commitCam(c);
  };

  // ---- Background clips (per shot) ----
  const bgSnapshot = () => ({
    bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientOpacity,
    gradientStops: gradientStops.map((s) => ({ ...s })), grainAmount, customBgImageUrl,
  });
  const bgPreviewCss = () =>
    bgType === "solid"
      ? hexToRgba(bgHex, bgOpacity)
      : bgType === "gradient"
      ? gradientCss
      : customBgImageUrl
      ? `center / cover url(${customBgImageUrl})`
      : "transparent";

// Adds a clip on the shot under the playhead (or the selected shot).
// If the shot already has backgrounds, the new one starts where the last one ends.
// If there's no room left, the shot is extended to fit it. Returns that shot's id.
// deselect shots, so playback range goes back to the whole timeline
const clearShotSel = () => {
  setSelAudio(null);
  const next = { shot: null, key: null, ids: [], prop: null };
  vidLive.current.sel = next;
  setVidSel(next);
};

// New clip starts at the playhead, or after the last clip if the playhead is already on one.
const vidAddBg = () => {
  const { bgs, duration } = vidLive.current;
  const t = vidTimeRef.current;
  const covered = bgs.some((b) => t >= b.start - 1e-6 && t < b.start + b.len - 1e-6);
  const start = covered ? +Math.max(...bgs.map((b) => b.start + b.len)).toFixed(3) : +t.toFixed(3);
  const len = 2;
  if (start + len > duration) setVidDuration(Math.ceil(start + len));
  const bid = vidId.current++;
  setVidBgs((prev) => [...prev, { id: bid, start, len, snap: bgSnapshot(), css: bgPreviewCss() }]);
};
// A background edit with no background row selected: add a new row at the playhead and select it.
const vidAddBgFromEdit = () => {
  // One background row (or the Animation tab, which has no rows to manage): the edit changes that row instead of adding a new one
  if (vidLive.current.bgs.length === 1 || (animTab && vidLive.current.bgs.length)) {
    const first = vidLive.current.bgs[0];
    const snap = bgSnapshot();
    vidPatchBg(first.id, { snap, css: bgPreviewCss() });
    vidBgActive.current = first.id;
    bgAppliedKeyRef.current = bgKey(snap);
    return;
  }
  const { duration } = vidLive.current;
  const start = +vidTimeRef.current.toFixed(3);
  const len = 2;
  if (start + len > duration) setVidDuration(Math.ceil(start + len));
  const bid = vidId.current++;
  const snap = bgSnapshot();
  const clip = { id: bid, start, len, snap, css: bgPreviewCss() };
  vidLive.current.bgs = [...vidLive.current.bgs, clip]; // sync, so the playhead sampling sees it
  setVidBgs((prev) => [...prev, clip]);
  vidBgActive.current = bid;
  bgAppliedKeyRef.current = bgKey(snap);
  clearShotSel();
  setSelText(null);
  setSelBg({ bid, ids: [bid] });
};

const vidPatchBg = (bid, patch) => {
  const apply = (list) => list.map((b) => (b.id === bid ? { ...b, ...patch } : b));
  vidLive.current.bgs = apply(vidLive.current.bgs); // sync, so a seek right after sees it
  setVidBgs(apply);
};
const vidSetBgAnim = (bid, kind, anim) => {
  vidPatchBg(bid, { [kind]: anim, ...(kind === "enter" ? { anim: undefined } : {}) }); // drops the old single-animation field
  const b = vidLive.current.bgs.find((x) => x.id === bid);
  if (!b) return;
  setVidPlaying(false);
  const a = b.start, e = a + b.len;
  let t = vidTimeRef.current;
  if (anim) {
    const d = anim.dur / 1000, dl = (anim.delay ?? 0) / 1000;
    t = kind === "enter" ? a + dl + d / 2 : e - dl - d / 2; // park the playhead mid-animation
  }
  vidSeek(vidClamp(t, a, e));
};
  // kind: "enter" | "exit". anim: { id, dur, delay } or null to remove.
  // seek = true parks the playhead mid-animation so the canvas shows the effect.
  const vidSetShotAnim = (sid, kind, anim, seek = true) => {
    // any shot / frame row that belongs to a group pulls the whole group in
    const all = vidLive.current.shots;
    const selIds = vidLive.current.sel.ids;
    const base = selIds.includes(sid) ? selIds : [sid];
    const gids = new Set(all.filter((x) => base.includes(x.id) && x.group).map((x) => x.group));
    const ids = all.filter((x) => base.includes(x.id) || (x.group && gids.has(x.group))).map((x) => x.id);
    const apply = (shots) => shots.map((s) => (ids.includes(s.id) ? { ...s, [kind]: anim } : s));
    vidLive.current.shots = apply(vidLive.current.shots); // sync, so the seek below sees it
    setVidShots(apply);
    const s = vidLive.current.shots.find((x) => x.id === sid);
    if (!s) return;
    setVidPlaying(false);
    if (!seek) {
      applyAnimAt(vidTimeRef.current);
      return;
    }
    let t = vidTimeRef.current;
    if (anim) {
      const d = anim.dur / 1000, dl = anim.delay / 1000;
      t = kind === "enter" ? s.start + dl + d / 2 : s.start + s.len - dl - d / 2;
    }
    vidSeek(vidClamp(t, s.start, s.start + s.len));
  };
const vidUpdateBg = (bid) => vidPatchBg(bid, { snap: bgSnapshot(), css: bgPreviewCss() });

// Copy lands after the last background clip (a copy on top of the original would just hide it).
const vidDuplicateBg = (bid) => {
  const { bgs, duration } = vidLive.current;
  const src = bgs.find((b) => b.id === bid);
  if (!src) return;
  const start = +Math.max(...bgs.map((b) => b.start + b.len)).toFixed(3);
  if (start + src.len > duration) setVidDuration(Math.ceil(start + src.len));
  const nid = vidId.current++;
  const copy = {
    ...src,
    id: nid,
    name: `${src.name || `Background ${bgs.indexOf(src) + 1}`} copy`,
    start,
    snap: { ...src.snap, gradientStops: src.snap.gradientStops.map((s) => ({ ...s })) },
  };
  vidLive.current.bgs = [...bgs, copy]; // sync, so the select below sees it
  setVidBgs((prev) => [...prev, copy]);
  vidSelectBg(nid);
};
const vidDeleteBg = (bid) => {
  setVidBgs((prev) => prev.filter((b) => b.id !== bid));
  if (selBgRef.current?.bid === bid) setSelBg(null);
};
const vidToggleBgHidden = (bid) => {
  const b = vidLive.current.bgs.find((x) => x.id === bid);
  if (!b) return;
  vidPatchBg(bid, { hidden: !b.hidden });
  if (selBgRef.current?.ids?.includes(bid)) setSelBg(null); // otherwise the panel edit-sync would overwrite this clip
  if (bgAnimOnRef.current) {
    bgAnimOnRef.current = null;
    sceneRef.current?.setBackgroundCanvas?.(null);
  }
  vidBgActive.current = null;
  const t = vidTimeRef.current;
  const vis = vidLive.current.bgs.filter((x) => !x.hidden);
  const target =
    vis.find((x) => t >= x.start && t <= x.start + x.len) ??
    [...vis].filter((x) => x.start <= t).sort((a, c) => c.start - a.start)[0];
  if (target) {
    vidBgActive.current = target.id;
    applyBgSnap(target.snap);
  } else {
    applyBgSnap({
      bgType: "solid", bgHex: surfaceHex(darkMode), bgOpacity: 100,
      gradientType, gradientAngle, gradientOpacity, gradientStops, grainAmount, customBgImageUrl,
    });
  }
};

    // ---- Text clips (per shot) ----
// whole = text that existed before Video mode: clip spans the whole timeline
const vidAddTextClip = (tid, whole = false) => {
  if (animTab) whole = true; // Animation has no text rows to trim, so the text lives for the whole loop
  vidTextSeenRef.current.add(tid);
  const { duration } = vidLive.current;
  const start = whole ? 0 : +vidTimeRef.current.toFixed(3);
  const len = whole ? duration : +Math.max(0.2, Math.min(3, duration - start)).toFixed(3);
  const cid = vidId.current++;
  setVidTexts((prev) => [...prev, { id: cid, tid, start, len }]);
  if (!whole) {
    clearShotSel();
    setSelBg(null);
    setSelText({ cid, ids: [cid] });
  }
};
useEffect(() => {
  if (!videoOn) return;
  const seen = vidTextSeenRef.current;
  textItems
    .filter((t) => (t.mode ?? "mockup") === tabKey && !seen.has(t.id))
    .forEach((t) => {
      seen.add(t.id);
      if (!vidLive.current.texts.some((c) => c.tid === t.id)) vidAddTextClip(t.id, true);
    });
}, [videoOn, textItems, tabKey]);

const vidPatchText = (cid, patch) => {
  const apply = (list) => list.map((c) => (c.id === cid ? { ...c, ...patch } : c));
  vidLive.current.texts = apply(vidLive.current.texts);
  setVidTexts(apply);
};
const vidSetTextAnim = (cid, kind, anim) => {
  vidPatchText(cid, { [kind]: anim });
  const c = vidLive.current.texts.find((x) => x.id === cid);
  if (!c) return;
  setVidPlaying(false);
  const a = c.start, b = a + c.len;
  let t = vidTimeRef.current;
  if (anim) {
    const d = anim.dur / 1000, dl = anim.delay / 1000;
    t = kind === "enter" ? a + dl + d / 2 : b - dl - d / 2;
  }
  vidSeek(vidClamp(t, a, b));
};

// Duplicates the text layer and gives the copy its own clip with the same timing and animations.
const vidDuplicateText = (cid) => {
  const clip = vidLive.current.texts.find((c) => c.id === cid);
  if (!clip) return;
  const tid = nextTextIdRef.current++;
  const nid = vidId.current++;
  vidTextSeenRef.current.add(tid); // so the "whole timeline" auto-clip effect skips it
  setTextItems((prev) => {
    const i = prev.findIndex((t) => t.id === clip.tid);
    if (i < 0) return prev;
    const src = prev[i];
    const copy = {
      ...src,
      id: tid,
      name: `${textName(src)} copy`,
      dx: (src.dx ?? 0) + 0.03,
      dy: (src.dy ?? 0) + 0.03,
      customFonts: [...src.customFonts],
      decoStash: { ...(src.decoStash ?? {}) },
    };
    const next = [...prev];
    next.splice(i + 1, 0, copy);
    return next;
  });
  const copy = { ...clip, id: nid, tid };
  vidLive.current.texts = [...vidLive.current.texts, copy];
  setVidTexts((prev) => [...prev, copy]);
  clearShotSel();
  setSelBg(null);
  setSelText({ cid: nid, ids: [nid] });
};

const vidDeleteText = (cid) => {
  const clip = vidLive.current.texts.find((c) => c.id === cid);
  setSelText((p) => (p?.cid === cid ? null : p));
  if (clip) deleteTextLayer(clip.tid); // removes the text layer and every clip that points to it
  else setVidTexts((prev) => prev.filter((c) => c.id !== cid));
};

  // Click a clip: load its background into the Scene panel and keep it in sync with further edits.
const vidSelectBg = (bid, additive = false) => {
  const cur = additive ? selBgRef.current?.ids ?? [] : [];
  const ids = additive ? (cur.includes(bid) ? cur.filter((i) => i !== bid) : [...cur, bid]) : [bid];
  if (!additive) {
    clearShotSel();
    setSelText(null);
  }
  if (!ids.length) return setSelBg(null);
  const primary = ids.includes(bid) ? bid : ids[ids.length - 1];
  const clip = vidLive.current.bgs.find((b) => b.id === primary);
  if (!clip) return;
  selBgRef.current = { bid: primary, ids }; // sync, so a seek in this same click already sees the selection
  vidBgActive.current = primary;
  applyBgSnap(clip.snap);
  setSelBg({ bid: primary, ids });
  // the playhead sits in another row: move it into this one, otherwise the next seek or tick snaps back to that row
  const t = vidTimeRef.current;
  if (t < clip.start - 1e-6 || t > clip.start + clip.len + 1e-6) vidSeek(clip.start);
};

  // While a clip is selected, Scene panel edits are written back into it.
useEffect(() => {
  if (!selBg || vidEndRef.current) return;
  const clip = vidLive.current.bgs.find((b) => b.id === selBg.bid);
  if (!clip) return;
  const snap = bgSnapshot();
  if (JSON.stringify(clip.snap) === JSON.stringify(snap)) return;
  vidPatchBg(selBg.bid, { snap, css: bgPreviewCss() });
}, [bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientOpacity, gradientStops, grainAmount, customBgImageUrl]);

// No background row selected + the user changes the background -> new row instead of losing the change.
useEffect(() => {
  if (!videoOn || selBg || vidPlaying || vidExporting) return;
  if (bgKey(bgSnapshot()) === bgAppliedKeyRef.current) return; // came from a clip, not from the user
  vidAddBgFromEdit();
}, [bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientOpacity, gradientStops, grainAmount, customBgImageUrl]);

  // Moves a keyframe and puts the playhead exactly on it.
  const vidMoveKey = (sid, kid, t) => {
    // update the live ref first so the seek samples the moved key, not its old position
    vidLive.current.shots = vidLive.current.shots.map((s) =>
      s.id === sid ? { ...s, keys: s.keys.map((k) => (k.id === kid ? { ...k, t } : k)).sort((a, b) => a.t - b.t) } : s
    );
    vidPatchKey(sid, kid, { t });
    const shot = vidLive.current.shots.find((s) => s.id === sid);
    if (shot) vidSeek(shot.start + t);
  };

    // Splits one property off a shared keyframe into its own keyframe (same time and value). Returns the new key's id.
  const vidSplitKey = (sid, kid, prop) => {
    const shot = vidLive.current.shots.find((x) => x.id === sid);
    const key = shot?.keys.find((k) => k.id === kid);
    if (!key) return null;
    const nid = vidId.current++;
    const rest = (key.props ?? CAM_KEYS).filter((p) => p !== prop);
    const { [prop]: _own, ...restEase } = key.propEase ?? {};
    const own = {
      ...key,
      id: nid,
      props: [prop],
      frames: undefined, // the frame placement stays on the original key
      propEase: key.propEase?.[prop] ? { [prop]: key.propEase[prop] } : undefined,
    };
    const left = { ...key, props: rest, propEase: Object.keys(restEase).length ? restEase : undefined };
    const apply = (shots) =>
      shots.map((x) =>
        x.id === sid
          ? { ...x, keys: x.keys.map((k) => (k.id === kid ? left : k)).concat(own).sort((a, b) => a.t - b.t) }
          : x
      );
    vidLive.current.shots = apply(vidLive.current.shots); // sync, so the move below sees it
    setVidShots(apply);
    return nid;
  };

  // can't shrink past the end of the last shot
  const vidSetDuration = (d) => {
    const { shots, bgs, texts, audios } = vidLive.current;
const minEnd = Math.max(1, ...shots.map((s) => s.start + s.len), ...bgs.map((b) => b.start + b.len), ...texts.map((c) => c.start + c.len), ...audios.map((a) => a.start + a.len));
    const tpl = animTplRef.current;
    const tplDriven = animTab && tpl && defaultParams(tpl.params).duration !== undefined;
    // Animation: the template rebuilds the shots, so shrinking must not be blocked by the current shot lengths
    const nd = Math.min(200, Math.max(tplDriven ? 1 : minEnd, Math.round(d * 10) / 10));
    setVidDuration(nd);
    if (tplDriven) changeTplParam(tpl, "duration", nd);
  };
  // ---- Audio clips (independent of shots / frames) ----
  const audioEl = (a) => {
    const m = audioElsRef.current;
    let el = m.get(a.id);
    if (!el) {
      el = new Audio(a.src);
      el.preload = "auto";
      m.set(a.id, el);
    }
    return el;
  };
  // play = true: audio inside its clip plays in sync with t. false: everything pauses.
  const syncAudio = (t, play) => {
    const list = vidLive.current.audios ?? [];
    audioElsRef.current.forEach((el, id) => {
      if (!list.some((a) => a.id === id) && !el.paused) el.pause(); // clip was deleted / undone
    });
    list.forEach((a) => {
      const el = audioEl(a);
      const inside = play && !a.muted && t >= a.start && t < a.start + a.len;
      if (!inside) {
        if (!el.paused) el.pause();
        return;
      }
      const want = (a.offset ?? 0) + (t - a.start);
      el.volume = vidClamp(a.volume ?? 1, 0, 1);
      if (el.paused) {
        el.currentTime = want;
        el.play().catch(() => {});
      } else if (Math.abs(el.currentTime - want) > 0.3) {
        el.currentTime = want; // playhead jumped (seek / loop)
      }
    });
  };
    // Keeps every uploaded video (frame <video>s and the mockup video) on the timeline's clock, looping by its own length.
  const syncVideos = (t, play) => {
    const els = [...document.querySelectorAll("video[data-frame-video]")];
    const mv = mockupVideoRef.current?.el;
    if (mv && toolbarModeRef.current === "mockup") els.push(mv);
    els.forEach((el) => {
      const d = el.duration;
      if (!d || !isFinite(d)) return;
      const want = t % d;
      const diff = Math.abs(el.currentTime - want);
      if (play) {
        if (el.paused) {
          el.currentTime = want;
          el.play().catch(() => {});
        } else if (diff > 0.3 && diff < d - 0.3) el.currentTime = want; // jumped (seek / loop); near-wrap is normal looping
      } else {
        if (!el.paused) el.pause();
        if (diff > 1 / 60) el.currentTime = want;
      }
    });
    if (mv) sceneRef.current?.refreshScreen?.();
  };
  const vidPatchAudio = (id, patch) => {
    const apply = (list) =>
      list.map((a) => {
        if (a.id !== id) return a;
        const n = { ...a, ...patch };
        // trimming the left edge moves the start point inside the source file
        if (patch.start !== undefined && patch.len !== undefined) n.offset = Math.max(0, (a.offset ?? 0) + (patch.start - a.start));
        return n;
      });
    vidLive.current.audios = apply(vidLive.current.audios);
    setVidAudios(apply);
  };
  const vidSelectAudio = (id) => {
    clearShotSel();
    setSelBg(null);
    setSelText(null);
    setSelAudio({ aid: id });
  };
  const vidDeleteAudio = (id) => {
    const el = audioElsRef.current.get(id);
    if (el) {
      el.pause();
      audioElsRef.current.delete(id);
    }
    setVidAudios((prev) => prev.filter((a) => a.id !== id));
    setSelAudio((p) => (p?.aid === id ? null : p));
  };
  const vidAddAudio = async (file) => {
    const src = URL.createObjectURL(file);
    let dur = 5, peaks = null;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const buf = await ctx.decodeAudioData(await file.arrayBuffer());
      ctx.close();
      dur = buf.duration;
      const N = 400, ch = buf.getChannelData(0), step = Math.max(1, Math.floor(ch.length / N));
      const raw = Array.from({ length: N }, (_, i) => {
        let m = 0;
        const end = Math.min(ch.length, (i + 1) * step);
        for (let j = i * step; j < end; j += Math.max(1, step >> 5)) m = Math.max(m, Math.abs(ch[j]));
        return m;
      });
      const top = Math.max(...raw, 1e-6);
      peaks = raw.map((p) => Math.round((p / top) * 100));
    } catch {
      dur = await new Promise((res) => {
        const a = new Audio(src);
        a.onloadedmetadata = () => res(a.duration || 5);
        a.onerror = () => res(5);
      });
    }
    const total = vidLive.current.duration;
    const start = +Math.min(vidTimeRef.current, Math.max(0, total - 0.2)).toFixed(3);
    const len = +Math.max(0.2, Math.min(dur, total - start)).toFixed(3);
    const id = vidId.current++;
    const clip = { id, name: file.name.replace(/\.[^.]+$/, ""), src, start, len, offset: 0, dur, peaks, volume: 1, muted: false };
    vidLive.current.audios = [...vidLive.current.audios, clip];
    setVidAudios((prev) => [...prev, clip]);
    vidSelectAudio(id);
  };

  const vidSkip = (dir) => {
    const { shots, duration } = vidLive.current;
    const t = vidTimeRef.current, eps = 1 / 60;
    const pts = new Set([0, duration]);
    shots.forEach((s) => {
      pts.add(s.start);
      pts.add(s.start + s.len);
      s.keys.forEach((k) => pts.add(s.start + k.t));
    });
    const list = [...pts].sort((a, b) => a - b);
    const next = dir > 0 ? list.find((p) => p > t + eps) : [...list].reverse().find((p) => p < t - eps);
    vidSeek(next ?? (dir > 0 ? duration : 0));
  };
const vidToggle = () => {
  if (!vidPlaying) {
    const { a, b } = vidRange();
    const t = vidTimeRef.current;
    if (t >= b - 1e-6 || t < a) vidTimeRef.current = a;
  }
  setVidPlaying((p) => !p);
};

  // What the enter / exit previews animate: the real device (Mockup) or the real frames (Frame).
  const getAnimSubject = async () => {
    const loadImg = (src) =>
      new Promise((res) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = src;
      });

    if (toolbarModeRef.current === "frame") {
      const box = frameSizeRef.current;
      if (!box) return null;
      const items = await Promise.all(
        framesLatestRef.current.map(async (f) => {
          const r = frameRect(f, box);
          const url = f.img ? (f.img.cropUrl ?? f.img.url) : null;
          return {
            l: r.left / box.w,
            t: r.top / box.h,
            w: r.width / box.w,
            h: r.height / box.h,
            radii: cornersOf(f).map((p) => p / 100),
            img: url ? await loadImg(url) : null,
          };
        })
      );
      return { type: "frames", ratio: box.w / box.h, items };
    }

    const scene = sceneRef.current;
    if (!scene?.isReady?.(deviceType)) return null;
    const url = scene.renderPreviews?.([templatePreviewCam({ cameraKey: "front" })])?.[0];
    const img = url ? await loadImg(url) : null;
    return img ? { type: "image", img } : null;
  };

  // handed to each TextEditor so it can animate itself during playback
  const textAnimCtl = React.useMemo(
    () => (videoOn ? { timeRef: vidTimeRef, getTexts: () => vidLive.current.texts } : null),
    [videoOn]
  );

    const [vidTplId, setVidTplId] = useState(null);

  // Renders the device at rest (whatever the playhead's enter / exit pose is), then puts the pose back.
  const renderVideoStills = (cams) => {
    const sc = sceneRef.current;
    if (!sc?.isReady?.(deviceType)) return null;
    sc.setDeviceAnim?.(null);
    try {
      return sc.renderPreviews(cams);
    } finally {
      const s = vidLive.current.shots;
      sc.setDeviceAnim?.(s.length ? sampleDeviceAnim(s, vidTimeRef.current) : null);
    }
  };

  // Frame templates: turns each key's `fo` offsets into real per-frame placements (key.frames).
  // "Rest" layout = the last keyframed pose already on the timeline, else where the frames sit now.
  // Expands a `stagger` spec into keyframes: each frame gets its own start time, so frames
  // animate one after another. Segments are linear, and the easing is baked in by sampling
  // 5 points per frame per phase. rest = null when the canvas isn't measured yet (camera only).
  // Per-frame tracks: the template returns every keyframe for each frame ({ u: 0-1, dx, dy, k, dr }),
  // so any motion works, including loops. Two keys with the same u make a hard cut.
  const buildTrackKeys = (s, cur, rest) => {
    if (!rest) return [];
    const L = s.len;
    const lin = vidEaseSpec("linear");
    return cur.map((f, i) => {
      const r = rest[f.id];
      const keys = s.stagger.track(i, cur.length).map((o) => ({
        t: +(vidClamp(o.u, 0, 1) * L).toFixed(3),
        props: ["frames"],
        ease: lin,
        frames: {
          [f.id]: {
            x: r.x + (o.dx ?? 0), y: r.y + (o.dy ?? 0), w: r.w * (o.kw ?? 1), h: r.h * (o.kh ?? 1), s: r.s * (o.k ?? 1), r: (r.r ?? 0) + (o.dr ?? 0),
            rx: o.rx ?? 0, ry: o.ry ?? 0, z: o.dz ?? 0, sh: o.sh ?? 0, ...clipOf(o), // 3D fields and window clip are absolute, not offsets
          },
        },
      }));
      return {
        name: `Frame ${i + 1}`, start: s.start, len: L, ease: "smooth", frameId: f.id,
        ...(s.enter ? { enter: { ...s.enter } } : {}),
        ...(s.exit ? { exit: { ...s.exit } } : {}),
        keys, groupKey: s.name, groupName: s.name,
      };
    });
  };

  const buildStaggerKeys = (s, cur, rest) => {
    const st = s.stagger, n = cur.length, L = s.len;
    if (st.track) return buildTrackKeys(s, cur, rest);
    const lerp = (a, b, u) => a + (b - a) * u;
    const easeIn = vidEaseFn(vidEaseSpec(st.ease ?? "expo-out"));
    const easeOut = vidEaseFn(vidEaseSpec(st.outEase ?? "cubic-in"));
    const dur = Math.min(st.dur ?? 1, L);
    const hasOut = !!st.out;
    const avail = L - dur - (hasOut ? dur + (st.hold ?? 0.5) : 0);
    const step = n > 1 ? Math.max(0, Math.min(st.step ?? 0.2, avail / (n - 1))) : 0;
    const span = (n - 1) * step;
    const ranks = txtRanks(st.order ?? "start", n);
    const poseAt = (f, i, t) => {
      const r = rest[f.id];
      const off = (fn) => {
        const o = fn(i, n, { x: r.x, y: r.y }) ?? {};
        // dx / dy = position offset, k = scale multiplier, dr = rotation offset in degrees
        return { x: r.x + (o.dx ?? 0), y: r.y + (o.dy ?? 0), w: r.w, h: r.h, s: r.s * (o.k ?? 1), r: (r.r ?? 0) + (o.dr ?? 0) };
      };
      const mix = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), w: r.w, h: r.h, s: lerp(a.s, b.s, u), r: lerp(a.r ?? 0, b.r ?? 0, u) });
      const a0 = ranks[i] * span, a1 = a0 + dur;
      if (t <= a0) return off(st.from);
      if (t < a1) return mix(off(st.from), r, easeIn((t - a0) / dur));
      if (hasOut) {
        const o0 = L - dur - span + ranks[i] * span, o1 = o0 + dur;
        if (t >= o1) return off(st.out);
        if (t > o0) return mix(r, off(st.out), easeOut((t - o0) / dur));
      }
      return r;
    };

    const lin = vidEaseSpec("linear");
    const out = [];

    // One shot per frame, each owning only that frame's pose (no camera shot)
    if (rest) {
      cur.forEach((f, i) => {
        const ts = new Set([0, L]);
        const phases = [ranks[i] * span];
        if (hasOut) phases.push(L - dur - span + ranks[i] * span);
        phases.forEach((p) =>
          [0, 0.25, 0.5, 0.75, 1].forEach((u) => ts.add(vidClamp(+(Math.round((p + u * dur) * VID_FPS) / VID_FPS).toFixed(3), 0, L)))
        );
        out.push({
          name: `Frame ${i + 1}`, start: s.start, len: L, ease: "smooth", frameId: f.id,
          ...(s.enter ? { enter: { ...s.enter } } : {}),
          ...(s.exit ? { exit: { ...s.exit } } : {}),
          keys: [...ts].sort((a, b) => a - b).map((t) => ({ t, props: ["frames"], frames: { [f.id]: poseAt(f, i, t) }, ease: lin })),
        });
      });
    }
    return out.map((o) => ({ ...o, groupKey: s.name, groupName: s.name }));
  };

  // Frames arranged as one of the FRAME_LAYOUTS. Pure: sets no state. Extra slots get copies of
  // your images (cycled); alloc() hands out ids for the new frames.
  const layoutFramesFor = (layoutKey, alloc, boxOverride = null) => {
    const box = boxOverride ?? frameSizeRef.current;
    const cur = framesLatestRef.current;
    const slots = Array.isArray(layoutKey) ? layoutKey : FRAME_LAYOUTS[layoutKey];
    if (!box || !slots) return cur;
    const short = Math.min(box.w, box.h);
    const base = cur.find((f) => selectedIdsRef.current.includes(f.id)) ?? cur[0];
    // every image uploaded so far (upload order), plus anything already on the canvas, e.g. from an opened project
    const own = cur.filter((f) => f.img).map((f) => f.img);
    const pool = [...assetPoolRef.current, ...own.filter((im) => !assetPoolRef.current.some((a) => a?.url === im.url))];
    const NOMINAL_H = 1000;
    return slots.map((sl, i) => {
      const existing = cur[i];
      const src = existing ?? cloneFrame({ ...base, hidden: false, locked: false }, nextFrameIdRef.current++);
      // Animation: planes always cycle through the assets. Other tabs keep each frame's own image.
      const slotImg = animTab ? assetPoolRef.current[sl.asset ?? i] ?? defaultAnimImage(sl.asset ?? i) : null;
      const img = animTab ? (slotImg ? { ...slotImg } : null) : src.img ?? (pool.length ? { ...pool[i % pool.length] } : null);
      return {
        ...src, img,
        r: 0, // a layout starts unrotated, even if the frame was left mid-animation
        rx: 0, ry: 0, z: 0, sh: 0, cl: 0, ct: 0, cr: 0, cb: 0,
        asset: sl.asset, // set by templates that reuse assets across planes, undefined otherwise
        tint: sl.tint, // "bg" = the depth shade blends toward the background
        feather: sl.feather ?? 0, // soft leading edge for sliding planes
        featherSym: sl.featherSym, // "x" / "y": soft edges open from the center
        fill: sl.fill ?? null, // a solid css color instead of an image (Selector container + outline)
        backdrop: sl.backdrop ?? 0, // blur behind the frame, px on an 800px canvas
        ring: sl.ring ?? null, // { width, hex, opacity }: outline inside the frame, px on an 800px canvas
        noHit: sl.noHit ?? false, // true = clicks pass through (full-canvas backgrounds, the container, the outline)
        rig: sl.rig ?? null, // 3D templates set this, every other layout clears it
        fade: sl.fade ?? 0,
        fadeAxis: sl.fadeAxis ?? "x",
        ...(sl.radius != null ? { radius: sl.radius, corners: null } : {}),
        ...(sl.blurs !== undefined || sl.fx !== undefined
          ? {
              effects: [
                ...(sl.blurs ?? []).map((b, n) => ({ id: 9000 + n, type: "layerBlur", visible: true, ...b })),
                ...(sl.fx ?? []).map((x, n) => ({ id: 9500 + n, visible: true, ...x })),
              ],
            }
          : {}),
        w: Math.round(NOMINAL_H * sl.r), h: NOMINAL_H,
        s: (sl.h * box.h) / short / NOMINAL_H,
        x: (sl.x * box.w) / short, y: (sl.y * box.h) / short,
      };
    });
  };

  // framesOverride = frames to resolve against (the template's layout), instead of the live ones
  const resolveFrameTplShots = (tpl, framesOverride = null, boxOverride = null) => {
    const cur = framesOverride ?? framesLatestRef.current;
    const base = framePoseMap(cur, boxOverride ?? frameSizeRef.current);
    if (!base)
      return tpl.shots.flatMap(({ stagger, ...s }) =>
        stagger ? buildStaggerKeys({ ...s, stagger }, [], null) : [{ ...s, keys: s.keys.map(({ fo, ...k }) => k) }]
      );
    const rest = { ...base };
    if (!tpl.layout) {
      // no layout: rest = the last keyframed pose already on the timeline
      const at = {};
      vidLive.current.shots.forEach((s) =>
        s.keys.forEach((k) => {
          if (!k.frames) return;
          Object.keys(k.frames).forEach((id) => {
            if (s.start + k.t >= (at[id] ?? -1)) {
              at[id] = s.start + k.t;
              rest[id] = k.frames[id];
            }
          });
        })
      );
    }
    const n = cur.length;
    return tpl.shots.flatMap(({ stagger, ...s }) =>
      stagger
        ? buildStaggerKeys({ ...s, stagger }, cur, rest)
        : [{
            ...s,
            keys: s.keys.map(({ fo, ...k }) =>
              !fo
                ? k // camera-only key
                : {
                    ...k,
                    frames: Object.fromEntries(
                      cur.map((f, i) => {
                        const r = rest[f.id] ?? base[f.id];
                        const o = fo(i, n, { x: r.x, y: r.y });
                        return [f.id, { x: r.x + (o.dx ?? 0), y: r.y + (o.dy ?? 0), w: r.w, h: r.h, s: r.s * (o.k ?? 1), r: (r.r ?? 0) + (o.dr ?? 0) }];
                      })
                    ),
                  }
            ),
          }]
    );
  };

  // Renders the real frames at time t of a template (used by the template cards).
  const renderFrameVideoStill = async (tpl, t, w) => {
    // temporary negative ids, so previews never use up real frame ids
    let tmp = -1;
    const tbox = tpl.canvas ? { w: tpl.canvas.w, h: tpl.canvas.h } : frameSizeRef.current;
    const laid = tpl.layout ? layoutFramesFor(tpl.layout, () => tmp--, tbox) : null;
    const shots = resolveFrameTplShots(tpl, laid, tbox);
    const c = sampleShots(shots, t); // null for frame-only templates
    const poses = sampleShotFrames(shots, t);
    const fr = (laid ?? framesLatestRef.current).map((f) => {
      const p = poses?.[f.id];
      return p ? { ...f, x: p.x, y: p.y, w: Math.round(p.w), h: Math.round(p.h), s: p.s, r: p.r ?? 0, rx: p.rx ?? 0, ry: p.ry ?? 0, z: p.z ?? 0, sh: p.sh ?? 0, ...clipOf(p) } : f;
    });
    // use the template's own background at time t, so the card matches what gets applied
    const bgClip = tpl.bgs ? [...tpl.bgs].sort((a, b) => a.at - b.at).reverse().find((b) => b.at <= t) ?? tpl.bgs[0] : null;
    return renderFrameCanvas(w, false, null, {
      size: tbox,
      frames: fr,
      cam: c ? { ...CAM_DEFAULT, rotationX: c.rotationX, rotationY: c.rotationY, rotationZ: c.rotationZ, positionX: c.positionX, positionY: c.positionY, zoom: c.zoom } : CAM_DEFAULT,
      pose: sampleDeviceAnim(shots.filter((s) => s.frameId == null), t),
      framePoses: frameRowStates(shots, fr.map((f) => f.id), t),
      ...(bgClip ? { bg: { snap: vtBgSnap(bgClip.bg, bgClip.grain) } } : {}),
    });
  };

  // Template keys drive every property. Split them into per-property keys (like manual keyframes),
  // keeping a key only where that property starts, ends or changes.
  const splitKeysPerProp = (keys) => {
    if (!keys.length || keys.some((k) => k.frames || k.props)) return keys; // frame / already per-property keys stay as they are
    const sorted = [...keys].sort((a, b) => a.t - b.t);
    const out = [];
    CAM_KEYS.forEach((p) => {
      const vals = sorted.map((k) => k[p]);
      const keep = sorted.filter(
        (k, i) => i === 0 || i === sorted.length - 1 || Math.abs(vals[i] - vals[i - 1]) > 1e-6 || Math.abs(vals[i] - vals[i + 1]) > 1e-6
      );
      const flat = Math.max(...vals) - Math.min(...vals) < 1e-6;
      (flat ? keep.slice(0, 1) : keep).forEach((k) => out.push({ ...k, props: [p] }));
    });
    return out.sort((a, b) => a.t - b.t);
  };

  // Replaces the camera shots. If a shot row is selected (Mockup mode), only that shot is replaced.
  // Otherwise the whole timeline is replaced. Backgrounds and text stay; clips that spanned the whole timeline stretch to the new length.
  const handleApplyVideoTemplate = (tpl) => {
    const live = vidLive.current;

    // ---- A shot is selected: swap only that shot for the template's camera move (and background, if it has one) ----
    const picked = toolbarModeRef.current === "frame" ? [] : live.shots.filter((s) => live.sel.ids.includes(s.id));
    if (picked.length) {
      const anchor = Math.min(...picked.map((s) => s.start));
      const span = Math.max(...picked.map((s) => s.start + s.len)) - anchor;
      const end = anchor + span;
      const f = span / tpl.duration; // template is squeezed / stretched to fit the selected shot
      const firstPicked = picked[0];

      const fresh = tpl.shots.map((s) => ({
        id: vidId.current++,
        name: s.name,
        start: +(anchor + s.start * f).toFixed(3),
        len: +(s.len * f).toFixed(3),
        ease: "smooth",
        ...(firstPicked.img ? { img: firstPicked.img } : {}),
        ...(s.enter ? { enter: { ...s.enter } } : {}),
        ...(s.exit ? { exit: { ...s.exit } } : {}),
        keys: splitKeysPerProp(s.keys).map((k) => ({ ...k, id: vidId.current++, t: +(k.t * f).toFixed(3) })),
      }));

      // new shots take the place of the selected ones, every other shot stays untouched
      const firstIdx = live.shots.findIndex((s) => live.sel.ids.includes(s.id));
      const rest = live.shots.filter((s) => !live.sel.ids.includes(s.id));
      const before = live.shots.slice(0, firstIdx).filter((s) => !live.sel.ids.includes(s.id)).length;
      const shots = [...rest.slice(0, before), ...fresh, ...rest.slice(before)];
      const sel = { shot: fresh[fresh.length - 1].id, key: null, ids: fresh.map((s) => s.id), prop: null };

      // Template background: only covers the selected shot's time range.
      // Existing background clips are cut around that range, everything outside it stays as it was.
      let bgs = live.bgs;
      if (tpl.bgs) {
        const kept = [];
        live.bgs.forEach((c) => {
          const cs = c.start, ce = c.start + c.len;
          if (ce <= anchor + 1e-6 || cs >= end - 1e-6) {
            kept.push(c); // completely outside the range
            return;
          }
          if (cs < anchor - 1e-6) {
            // part before the range keeps its place (its exit animation would now end mid-clip, so drop it)
            kept.push({ ...c, len: +(anchor - cs).toFixed(3), exit: undefined });
          }
          if (ce > end + 1e-6) {
            // part after the range becomes its own clip (no enter animation, it isn't starting fresh)
            kept.push({ ...c, id: vidId.current++, start: +end.toFixed(3), len: +(ce - end).toFixed(3), enter: undefined, anim: undefined });
          }
        });

        const sortedBgs = [...tpl.bgs].sort((a, b) => a.at - b.at);
        const inserted = sortedBgs.map((b, i) => {
          const snap = vtBgSnap(b.bg, b.grain);
          const s0 = anchor + b.at * f;
          const s1 = i < sortedBgs.length - 1 ? anchor + sortedBgs[i + 1].at * f : end;
          return {
            id: vidId.current++,
            start: +s0.toFixed(3),
            len: +(s1 - s0).toFixed(3),
            snap,
            css: vtBgCss(snap),
            ...(b.enter ? { enter: { ...b.enter } } : {}),
          };
        });
        bgs = [...kept, ...inserted];
      }

      // sync first, so the seek below samples the new shots and backgrounds
      vidLive.current.shots = shots;
      vidLive.current.bgs = bgs;
      vidLive.current.sel = sel;
      vidBgActive.current = null; // forces the background to be re-applied at the playhead
      setVidPlaying(false);
      setVidShots(shots);
      setVidBgs(bgs);
      setSelBg(null);
      setVidSel(sel);
      setVidTplId(tpl.id);
      setSidebarOpen(true);
      vidSeek(anchor);
      return;
    }

    // ---- Nothing selected (or Frame mode): replace the whole timeline ----
    const gids = {}; // template group key -> real group id
    const oldD = live.duration;
    const whole = (c) => c.start + c.len >= oldD - 1e-3;
    const d = Math.min(
      600,
      Math.max(tpl.duration, ...[...(tpl.bgs ? [] : live.bgs), ...(animTab ? [] : live.texts)].filter((c) => !whole(c)).map((c) => c.start + c.len))
    );
    const stretch = (list) => list.map((c) => (whole(c) ? { ...c, len: +(d - c.start).toFixed(3) } : c));

    // Frame mode + layout: arrange the frames first, then build the animation from that arrangement
    if (toolbarModeRef.current === "frame" && tpl.layout) {
      const laid = layoutFramesFor(tpl.layout, () => nextFrameIdRef.current++);
      framesLatestRef.current = laid;
      setFrames(laid);
      setSelectedIds([laid[0].id]);
    }
    const shots = (toolbarModeRef.current === "frame" ? resolveFrameTplShots(tpl) : tpl.shots).map((s) => ({
      id: vidId.current++,
      name: s.name,
      start: s.start,
      len: s.len,
      ease: "smooth",
      ...(s.frameId != null ? { frameId: s.frameId } : {}),
      ...(s.groupKey ? { group: (gids[s.groupKey] ??= vidId.current++), groupName: s.groupName } : {}),
      ...(s.enter ? { enter: { ...s.enter } } : {}),
      ...(s.exit ? { exit: { ...s.exit } } : {}),
      keys: splitKeysPerProp(s.keys).map((k) => ({ ...k, id: vidId.current++ })),
    }));
    // templates with `bgs` replace the background rows, the rest keep the user's own
    const sortedBgs = tpl.bgs ? [...tpl.bgs].sort((a, b) => a.at - b.at) : null;
    const bgs = sortedBgs
      ? sortedBgs.map((b, i) => {
          const snap = vtBgSnap(b.bg, b.grain);
          const end = i < sortedBgs.length - 1 ? sortedBgs[i + 1].at : d;
          return {
            id: vidId.current++,
            start: b.at,
            len: +(end - b.at).toFixed(3),
            snap,
            css: vtBgCss(snap),
            ...(b.enter ? { enter: { ...b.enter } } : {}),
          };
        })
      : stretch(live.bgs);
    const texts = animTab ? live.texts.map((c) => ({ ...c, start: 0, len: d })) : stretch(live.texts);
    const sel = { shot: null, key: null, ids: [], prop: null }; // nothing selected, so playback covers the whole timeline

    // sync first, so the seek below samples the new shots
    vidLive.current.shots = shots;
    vidLive.current.bgs = bgs;
    vidBgActive.current = null; // forces applyBgAt below to load the new first clip
    vidLive.current.texts = texts;
    vidLive.current.duration = d;
    vidLive.current.sel = sel;

    setVidPlaying(false);
    setVidShots(shots);
    setVidBgs(bgs);
    setVidTexts(texts);
    setVidDuration(d);
    setVidSel(sel);
    setSelBg(null);
    setSelText(null);
    vidNo.current = shots.length + 1;
    vidTimeRef.current = 0;
    setVidHead(0);

    const c = sampleShots(shots, 0);
    applyCam(c);
    commitCam(c);
    applyBgAt(0);
    applyAnimAt(0);
    setVidTplId(tpl.id);
    setSidebarOpen(true);
  };

    // Parametric templates: re-run build() with the current params and re-apply
  const [tplParams, setTplParams] = useState({}); // template id -> param values
  const tplParamTimerRef = useRef(null);
  // keepTime: tweaking a control keeps the playhead and playback where they were. Picking a card starts at 0.
  const applyVideoTemplate = (tpl, params, keepTime = false, settled = false) => {
    // templates with their own canvas size: resize first, then apply once the canvas has re-measured
    if (tpl.canvas && !settled && toolbarModeRef.current === "frame") {
      setCanvasSize("Custom");
      setCustomWidth(tpl.canvas.w);
      setCustomHeight(tpl.canvas.h);
      setTimeout(() => applyVideoTemplate(tpl, params, keepTime, true), 150);
      return;
    }
    if (!tpl.build) {
      handleApplyVideoTemplate(tpl);
      if (!keepTime) setVidPlaying(true); // picking a card starts playback from 0
      return;
    }
    const p = params ?? { ...defaultParams(tpl.params), ...tplParams[tpl.id] };
    const box = frameSizeRef.current;
    const t0 = vidTimeRef.current, wasPlaying = vidLive.current.playing;
    // Animation: a control tweak must keep the background as it is on screen, so refresh the default clip first
    if (animTab && keepTime && !tpl.bgs && vidLive.current.bgs[0]) {
      vidPatchBg(vidLive.current.bgs[0].id, { snap: bgSnapshot(), css: bgPreviewCss() });
    }
    handleApplyVideoTemplate(instantiateParam(tpl, p, { aspect: box ? box.w / box.h : 1 }));
    if (keepTime) {
      vidSeek(Math.min(t0, vidLive.current.duration));
      if (wasPlaying) setVidPlaying(true);
    } else {
      setVidPlaying(true); // picking a card starts playback from 0
    }
  };
  const tplSmoothTimerRef = useRef(null);
  const tplLastApplyRef = useRef(0);
  useEffect(() => () => {
    clearTimeout(tplParamTimerRef.current);
    clearTimeout(tplSmoothTimerRef.current);
  }, []);
  const changeTplParam = (tpl, key, value) => patchTplParams(tpl, { [key]: value });
  const patchTplParams = (tpl, patch) => {
    const next = { ...defaultParams(tpl.params), ...tplParams[tpl.id], ...patch };
    setTplParams((p) => ({ ...p, [tpl.id]: next }));
    const run = () => {
      tplLastApplyRef.current = performance.now();
      const box = canvasBoxRef.current;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      // smooth only offset drags while paused; playback writes frame styles every tick and must not lag
      const smooth = !!box && !reduce && !vidLive.current.playing && Object.keys(patch).some((k) => ["offsetX", "offsetY", "size", "height", "stagger", "fxList", "gap", "planeW", "planeH", "planeScale"].includes(k));
      if (smooth) box.dataset.frameSmooth = "";
      applyVideoTemplate(tpl, next, true);
      clearTimeout(tplSmoothTimerRef.current);
      tplSmoothTimerRef.current = setTimeout(() => box && delete box.dataset.frameSmooth, 300);
    };
    clearTimeout(tplParamTimerRef.current);
    const wait = Math.max(0, 40 - (performance.now() - tplLastApplyRef.current)); // steady ~40ms updates instead of waiting for a pause
    tplParamTimerRef.current = setTimeout(run, wait);
  };

  // Card previews: default params, but the real canvas aspect
  const renderParamStill = (tpl, t, w) => {
    const box = frameSizeRef.current;
    const full = tpl.build ? instantiateParam(tpl, defaultParams(tpl.params), { aspect: box ? box.w / box.h : 1 }) : tpl;
    return renderFrameVideoStill(full, t, w);
  };

  // Live card preview: the laid-out frames, resolved shots and a background-only render.
  // The card draws the planes itself every frame, so nothing is pre-rendered per time step.
  const prepareFrameLive = async (tpl, w) => {
    const box = tpl.canvas ? { w: tpl.canvas.w, h: tpl.canvas.h } : frameSizeRef.current;
    if (!box) return null;
    const full = tpl.build ? instantiateParam(tpl, defaultParams(tpl.params), { aspect: box.w / box.h }) : tpl;
    let tmp = -1; // temporary negative ids, so previews never use up real frame ids
    const laid = full.layout ? layoutFramesFor(full.layout, () => tmp--, box) : framesLatestRef.current;
    const shots = resolveFrameTplShots(full, laid, box);
    const clip = full.bgs ? [...full.bgs].sort((a, b) => a.at - b.at)[0] : null;
    const bg = await renderFrameCanvas(w, false, null, {
      size: box,
      frames: [],
      texts: [],
      cam: CAM_DEFAULT,
      ...(clip ? { bg: { snap: vtBgSnap(clip.bg, clip.grain) } } : {}),
    });
    return { box: { w: box.w, h: box.h }, frames: laid, shots, duration: full.duration, bg };
  };

  // Re-applies the open Animation template (after an upload / delete changes the images)
  const animTplRef = useRef(null);
  const reapplyAnimRef = useRef(null);
  reapplyAnimRef.current = () => animTplRef.current && applyVideoTemplate(animTplRef.current, undefined, true);

  // Animation tab opens with the first template already applied
  useEffect(() => {
    if (!animTab) return;
    const first = PARAM_ALL[0];
    if (!first) return;
    let tries = 0, timer;
    const run = () => {
      if (animTplRef.current) return; // a template is already active
      if (!frameSizeRef.current && tries++ < 30) {
        timer = setTimeout(run, 100); // canvas not measured yet, keep waiting (up to ~3s)
        return;
      }
      restoreUntilRef.current = Date.now() + 500; // the initial template isn't an undoable step
      applyVideoTemplate(first);
      timer = setTimeout(() => setVidPlaying(true), 60); // start after the apply has settled
    };
    timer = setTimeout(run, 150);
    return () => clearTimeout(timer);
  }, [animTab]);

    // Canvas ratio changed: rebuild the open Animation template so its planes re-fit
  const animAspect = canvasDims ? Math.round((canvasDims.w / canvasDims.h) * 1000) / 1000 : null;
  useEffect(() => {
    if (!animTab || !animAspect) return;
    const t = setTimeout(() => {
      if (!animTplRef.current) return;
      restoreUntilRef.current = Date.now() + 500; // not an undoable step
      reapplyAnimRef.current?.();
    }, 120); // after FrameLayer has re-measured the box
    return () => clearTimeout(t);
  }, [animAspect, animTab]);

  // Group: selected shots become one group, moved next to each other (at the first one's position)
  const vidGroup = () => {
    const { shots, sel } = vidLive.current;
    const ids = sel.ids;
    if (ids.length < 2) return;
    const gid = vidId.current++;
    const name = `Group ${new Set(shots.map((s) => s.group).filter(Boolean)).size + 1}`;
    const first = shots.findIndex((s) => ids.includes(s.id));
    const before = shots.slice(0, first).filter((s) => !ids.includes(s.id)).length;
    const rest = shots.filter((s) => !ids.includes(s.id));
    const members = shots.filter((s) => ids.includes(s.id)).map((s) => ({ ...s, group: gid, groupName: name }));
    const next = [...rest.slice(0, before), ...members, ...rest.slice(before)];
    vidLive.current.shots = next;
    setVidShots(next);
  };

  // Ungroup: every group that has a selected shot is dissolved
  const vidUngroup = () => {
    const { shots, sel } = vidLive.current;
    const gids = new Set(shots.filter((s) => sel.ids.includes(s.id) && s.group).map((s) => s.group));
    if (!gids.size) return;
    const next = shots.map((s) => (gids.has(s.group) ? { ...s, group: undefined, groupName: undefined } : s));
    vidLive.current.shots = next;
    setVidShots(next);
  };

  return {
    videoOn, videoMock,
    vidShots, setVidShots, vidBgs, setVidBgs, vidAudios, setVidAudios, selAudio, setSelAudio,
    vidSel, setVidSel, vidTexts, setVidTexts, vidDuration, setVidDuration,
    vidPlaying, setVidPlaying, vidLoop, setVidLoop, vidExporting, setVidExporting,
    vidHead, setVidHead, vidSwapTick, setVidSwapTick,
    selBg, setSelBg, selText, setSelText,
    vidTplId, setVidTplId, tplParams, setTplParams,
    vidTimeRef, vidEndRef, vidId, vidNo, vidByModeRef, vidLive, autoKeyMuteRef,
    vidBgActive, bgAppliedKeyRef, vidBgExitKeyRef, vidImgFiles, vidFrameSeenRef, soloFrameRef,
    bgAnimCanvasRef, bgAnimOnRef, frameBgCanvasRef, frameStageRef, frameAnimRef,
    animTplRef, reapplyAnimRef, tplParamTimerRef, tplSmoothTimerRef,
    markFrameEdit, applyCam, applyFrameAnim, frameRowStates, applyFrameRowStatesAt, commitCam,
    showFrameBgCanvas, hideFrameBgCanvas, bgImage, applyBgAt, applyBgSnap, applyAnimAt, textsAt,
    vidSeek, vidAddShot, vidDelete, vidPatchShot, vidSetShotImg, vidCropShotImg,
    vidPatchKey, vidReorder, vidToggleKey, vidUpdateKey, vidDeleteKey,
    vidDuplicate, vidGroup, vidUngroup,
    bgSnapshot, bgPreviewCss, clearShotSel,
    vidAddBg, vidPatchBg, vidSetBgAnim, vidSetShotAnim, vidUpdateBg, vidDuplicateBg, vidDeleteBg, vidToggleBgHidden,
    vidAddTextClip, vidPatchText, vidSetTextAnim, vidDuplicateText, vidDeleteText,
    vidSelectBg, vidMoveKey, vidSplitKey, vidSetDuration,
    vidPatchAudio, vidSelectAudio, vidDeleteAudio, vidAddAudio,
    vidSkip, vidToggle, syncVideos,
    getAnimSubject, textAnimCtl, renderVideoStills, renderParamStill, prepareFrameLive,
    applyVideoTemplate, changeTplParam, patchTplParams,
  };
}