import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import { isDefaultCamera, getFrameCamera, frameCameraCss, hexRgba } from "../lib/frameUtils.js";
import { fishEyeMap, vignetteStops, glassProfile, glassVec, frostLayers } from "../lib/canvasFx.js";
import { backFillOf, backOpacityOf, frameAppearanceOf, frameRect, cloneFrame } from "../lib/frameModel.js";
import { frameDim, DIM_TRANSITION } from "../lib/frameFade.js";
import { chromeKey, chromeOps, ChromeCanvas, SocialOverlay } from "./SocialOverlay.jsx";
import { RESIZE_HANDLES } from "../constants/canvasControls.js";
import { PB_BANDS, pbBandBlur, pbMask, pbParams, pbPts } from "../lib/progressiveBlur.js";
import { PbHandles } from "./PbHandles.jsx";
import { planeCss, planePoly, rigPerspective } from "../lib/plane3d.js";
import { CurvedPlane } from "./CurvedPlane.jsx";

// Chromium only: SVG url() filters inside backdrop-filter (refraction + dispersion).
const URL_BACKDROP =
  typeof CSS !== "undefined" && !!CSS.supports &&
  (CSS.supports("backdrop-filter", "url(#a)") || CSS.supports("-webkit-backdrop-filter", "url(#a)"));

// Live chromatic aberration: three copies of the image, each filtered down to one channel,
// shifted apart and screen-blended back together on black.
const CA_CHANNELS = [["r", -1], ["g", 0], ["b", 1]];
function ChromaticImage({ url, amount, angle }) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * amount;
  const dy = Math.sin(rad) * amount;
  return (
    <div className="relative w-full h-full bg-black" style={{ isolation: "isolate" }}>
      {CA_CHANNELS.map(([ch, s]) => (
        <img
          key={ch}
          src={url}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          style={{ filter: `url(#bezel-ca-${ch})`, mixBlendMode: "screen", transform: `translate(${dx * s}px, ${dy * s}px)` }}
        />
      ))}
    </div>
  );
}
// glow = a zero-offset shadow, added to whatever shadow the frame already has
const withGlow = (f, base) => {
  const glows = (f.effects ?? [])
    .filter((e) => e.visible && e.type === "glow")
    .map((e) => `0 0 ${e.blur}px ${e.spread}px ${hexRgba(e.hex, e.opacity)}`);
  return glows.length ? [base && base !== "none" ? base : null, ...glows].filter(Boolean).join(", ") : base;
};

// Per-side maps for the liquid glass edge bands, built once per setting change.
//  map = displacement (R = x, G = y), hi = rim light, scale = feDisplacementMap scale
function glassMaps(canvasW, canvasH, g, side, ext = 0) {
  const p = glassProfile(g, canvasH);
  const th = p.bandH + ext; // band plus the extra rows the bend reads from
  const dir = side === "top" ? 1 : -1;
  const facing = (side === "top" ? -1 : 1) * p.ly;
  const lightK = Math.max(facing, 0) + Math.max(-facing, 0) * 0.35;
  const rimW = Math.max(2, p.baseDepth * 0.25);
  const S = Math.max(p.shift * 2, canvasW * p.flare, 0.001);
  const mw = 256, mh = Math.max(2, Math.min(256, th));
  const mapImg = new ImageData(mw, mh), hiImg = new ImageData(mw, mh);
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  for (let j = 0; j < mh; j++) {
    const y = ((j + 0.5) / mh) * th;
    const d = side === "top" ? y : th - y; // distance from the canvas edge; > bandH in the extension
    const a = Math.min(1, lightK * (1 - smooth(0, rimW, d)) * p.light * 0.9) * 255;
    for (let i = 0; i < mw; i++) {
      const [ox, oy] = glassVec(p, ((i + 0.5) / mw) * canvasW, d, canvasW); // 0 beyond the band
      const o = (j * mw + i) * 4;
      mapImg.data[o] = Math.round(255 * (0.5 + ox / S));
      mapImg.data[o + 1] = Math.round(255 * (0.5 + (dir * oy) / S));
      mapImg.data[o + 2] = 128; mapImg.data[o + 3] = 255;
      hiImg.data[o] = hiImg.data[o + 1] = hiImg.data[o + 2] = 255; hiImg.data[o + 3] = a;
    }
  }
  const url = (img) => {
    const c = document.createElement("canvas");
    c.width = mw; c.height = mh;
    c.getContext("2d").putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  };
  return { map: url(mapImg), hi: url(hiImg), scale: S };
}

export function FrameLayer({ onFrameClick, markIds = [], onFrameHover, frames, selectedIds, onSelect, onFramesChange, aspectLocked, environment, camera, cameraEase, background, textBehind, sizeRef, onPickFile, onRotate, onZoom, backVisible, chromeColors, nextFrameId, stageRef, animRef, onStageReady, groupOf, onFrameDoubleClick, videoMode, onVideoReady, locked, fishCanvasRef, useFishCanvas, playing }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState(null);
  const [guides, setGuides] = useState({ v: false, h: false }); // v = vertical line (centered in X), h = horizontal line (centered in Y)
  const [marquee, setMarquee] = useState(null); // { left, top, width, height } while Shift-dragging
  const [altHeld, setAltHeld] = useState(false); // Alt / Option held: show distances to the canvas edges
  useEffect(() => {
    const sync = (e) => {
      if (e.key === "Alt") e.preventDefault(); // stops a lone Alt press from focusing the browser menu, which swallows later key events
      setAltHeld(e.altKey);
    };
    const syncPointer = (e) => setAltHeld(e.altKey); // pointer events always carry the real modifier state
    const off = () => setAltHeld(false); // window lost focus while Alt was down
    window.addEventListener("keydown", sync, true);
    window.addEventListener("keyup", sync, true);
    window.addEventListener("pointermove", syncPointer, true);
    window.addEventListener("pointerdown", syncPointer, true);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("keydown", sync, true);
      window.removeEventListener("keyup", sync, true);
      window.removeEventListener("pointermove", syncPointer, true);
      window.removeEventListener("pointerdown", syncPointer, true);
      window.removeEventListener("blur", off);
    };
  }, []);
  const editable = isDefaultCamera(camera);

  // Latest props for native listeners / long-lived drag handlers.
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  const boxRef = useRef(box);
  boxRef.current = box;
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const selectedRef = useRef(selectedIds);
  selectedRef.current = selectedIds;
  const aspectRef = useRef(aspectLocked);
  aspectRef.current = aspectLocked;
  const zoomAccRef = useRef(camera.zoom);
  const didDragRef = useRef(false);
  const groupOfRef = useRef(groupOf);
  groupOfRef.current = groupOf;
  // Frames in the same timeline group are selected and moved together.
  // Double-click a frame (solo) to work on just that one.
  const groupMembers = (id) => {
    const map = groupOfRef.current ?? {};
    const g = map[id];
    if (g == null) return [id];
    return Object.keys(map).filter((k) => map[k] === g).map(Number);
  };

  const DEG_PER_PX = 0.3; // same as MockupScene
  const SNAP = 6; // px
  const clampDeg = (v) => Math.min(360, Math.max(-360, Math.round(v)));

  // One drag at a time. If a pointerup never arrives (button released outside the window, focus stolen),
  // the old drag must not stay alive and fight the next one over the same frames.
  const dragEndRef = useRef(null);
  useEffect(() => () => dragEndRef.current?.(null, true), []);
  const trackDrag = (onMove, onUp) => {
    if (dragEndRef.current) {
      dragEndRef.current(null, true); // silent: cancels the stale drag without running its click / selection logic
      setGuides({ v: false, h: false });
      setMarquee(null);
    }
    let live = true;
    const end = (ev, silent) => {
      if (!live) return;
      live = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("blur", end);
      if (dragEndRef.current === end) dragEndRef.current = null;
      if (!silent) onUp(ev);
    };
    const move = (ev) => {
      if (ev.buttons === 0) return end(ev); // the pointerup was lost: finish instead of dragging on
      onMove(ev);
    };
    dragEndRef.current = end;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("blur", end);
  };

  const startMove = (e, hitId) => {
    const b = boxRef.current;
    if (!b) return;
    const grp = groupMembers(hitId);
    let ids = selectedRef.current;
    if (e.shiftKey) {
      ids = ids.includes(hitId) ? ids.filter((i) => !grp.includes(i)) : [...new Set([...ids, ...grp])];
      onSelect(ids);
      if (!ids.includes(hitId)) return;
    } else {
      if (!ids.includes(hitId)) ids = grp;
      onSelect(ids);
    }
    const short = Math.min(b.w, b.h);
    const start = framesRef.current.filter((f) => ids.includes(f.id));
    const rects = start.map((f) => frameRect(f, b));
    const gcx = (Math.min(...rects.map((r) => r.left)) + Math.max(...rects.map((r) => r.left + r.width))) / 2 - b.w / 2;
    const gcy = (Math.min(...rects.map((r) => r.top)) + Math.max(...rects.map((r) => r.top + r.height))) / 2 - b.h / 2;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    const dupMode = e.altKey && !e.shiftKey; // Alt-drag = drag a copy
    let copied = false;
    let targets = new Map(start.map((f) => [f.id, f])); // id being moved -> its starting position

    const onMove = (ev) => {
      let dx = ev.clientX - startX;
      let dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      if (dupMode && !copied) {
        copied = true;
        const copies = start.map((f) => cloneFrame(f, nextFrameId()));
        targets = new Map(copies.map((c, i) => [c.id, start[i]])); // move the copies, originals stay
        onFramesChange((prev) => [...prev, ...copies]);
        onSelect(copies.map((c) => c.id));
      }
      // Snap the selection's center to the canvas center and show the guide lines.
      const v = Math.abs(gcx + dx) < SNAP;
      const h = Math.abs(gcy + dy) < SNAP;
      if (v) dx = -gcx;
      if (h) dy = -gcy;
      setGuides({ v, h });
      onFramesChange((prev) =>
        prev.map((f) => {
          const s0 = targets.get(f.id);
          return s0 ? { ...f, x: s0.x + dx / short, y: s0.y + dy / short } : f;
        })
      );
    };
    const onUp = () => {
      setGuides({ v: false, h: false });
      if (!moved && !e.shiftKey && ids.length > grp.length) onSelect(grp); // click without dragging = pick just this one (and its group)
    };
    trackDrag(onMove, onUp);
  };

  const startResize = (key) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const b = boxRef.current;
    if (!b) return;
    const short = Math.min(b.w, b.h);
    const sel = framesRef.current.filter((f) => selectedRef.current.includes(f.id));
    if (!sel.length) return;
    const items = sel.map((f) => {
      const r = frameRect(f, b);
      return { id: f.id, r, s0: f.s ?? r.width / (f.w * short) }; // materialize the auto-fit scale
    });
    const gL = Math.min(...items.map((i) => i.r.left));
    const gT = Math.min(...items.map((i) => i.r.top));
    const gR = Math.max(...items.map((i) => i.r.left + i.r.width));
    const gB = Math.max(...items.map((i) => i.r.top + i.r.height));
    const gw = gR - gL, gh = gB - gT;
    const ratio = gw / gh;
    const startX = e.clientX;
    const startY = e.clientY;
    const MIN = 12;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let L = gL, T = gT, R = gR, B = gB;
      if (key.includes("w")) L = Math.min(L + dx, R - MIN);
      if (key.includes("e")) R = Math.max(R + dx, L + MIN);
      if (key.includes("n")) T = Math.min(T + dy, B - MIN);
      if (key.includes("s")) B = Math.max(B + dy, T + MIN);
      if (aspectRef.current || ev.shiftKey) {
        const w = R - L, h = B - T;
        if (key.length === 2) {
          const nh = w / ratio; // corners: width drives, the opposite corner stays put
          if (key.includes("n")) T = B - nh; else B = T + nh;
        } else if (key === "e" || key === "w") {
          const nh = w / ratio, cy = (T + B) / 2;
          T = cy - nh / 2; B = cy + nh / 2;
        } else {
          const nw = h * ratio, cx = (L + R) / 2;
          L = cx - nw / 2; R = cx + nw / 2;
        }
      }
      const kx = (R - L) / gw;
      const ky = (B - T) / gh;
      onFramesChange((prev) =>
        prev.map((f) => {
          const it = items.find((i) => i.id === f.id);
          if (!it) return f;
          const nl = L + (it.r.left - gL) * kx;
          const nt = T + (it.r.top - gT) * ky;
          const nw = it.r.width * kx;
          const nh = it.r.height * ky;
          return {
            ...f,
            s: it.s0,
            w: Math.max(1, Math.round(nw / (it.s0 * short))),
            h: Math.max(1, Math.round(nh / (it.s0 * short))),
            x: (nl + nw / 2 - b.w / 2) / short,
            y: (nt + nh / 2 - b.h / 2) / short,
          };
        })
      );
    };
    trackDrag(onMove, () => {});
  };

  const startMarquee = (e) => {
    const b = boxRef.current;
    const wr = wrapRef.current?.getBoundingClientRect();
    if (!b || !wr) return;
    const additive = e.shiftKey; // Shift adds to the current selection, otherwise it replaces it
    const base = additive ? selectedRef.current : [];
    const x0 = e.clientX - wr.left;
    const y0 = e.clientY - wr.top;
    let moved = false;
    const onMove = (ev) => {
      const x1 = ev.clientX - wr.left;
      const y1 = ev.clientY - wr.top;
      if (!moved && Math.hypot(x1 - x0, y1 - y0) < 3) return;
      moved = true;
      const L = Math.min(x0, x1), R = Math.max(x0, x1), T = Math.min(y0, y1), B = Math.max(y0, y1);
      setMarquee({ left: L, top: T, width: R - L, height: B - T });
      const hits = framesRef.current
        .filter((f) => {
          const r = frameRect(f, b);
          return r.left < R && r.left + r.width > L && r.top < B && r.top + r.height > T;
        })
        .map((f) => f.id);
      onSelect([...new Set([...base, ...hits].flatMap((id) => groupMembers(id)))]);
    };
    const onUp = () => {
      setMarquee(null);
      if (!moved && !additive) onSelect([]); // a plain click on empty canvas deselects
    };
    trackDrag(onMove, onUp);
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    const hit = e.target.closest?.("[data-frame-id]");
    if (locked) {
      onFrameClick?.(hit ? Number(hit.dataset.frameId) : null); // locked canvas: select only, no moving
      return;
    }
    if (hit) startMove(e, Number(hit.dataset.frameId));
    else startMarquee(e);
  };

  // Scroll to zoom (native listener: React's onWheel is passive and can't preventDefault).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const current = cameraRef.current.zoom;
      const base = Math.round(zoomAccRef.current) === current ? zoomAccRef.current : current;
      const next = Math.min(100, Math.max(0, base - e.deltaY * 0.08));
      zoomAccRef.current = next;
      onZoomRef.current?.(Math.round(next));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const next = { w: r.width, h: r.height };
      if (sizeRef) sizeRef.current = next;
      setBox(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sizeRef]);

  // lets App re-apply the timeline pose once the stage exists (mode switch / first mount)
  const readyRef = useRef(onStageReady);
  readyRef.current = onStageReady;
  useLayoutEffect(() => {
    if (box) readyRef.current?.();
  }, [!!box]);

  const selRects = box ? frames.filter((f) => selectedIds.includes(f.id)).map((f) => frameRect(f, box)) : [];
  const group = selRects.length
    ? (() => {
        const left = Math.min(...selRects.map((r) => r.left));
        const top = Math.min(...selRects.map((r) => r.top));
        return {
          left,
          top,
          width: Math.max(...selRects.map((r) => r.left + r.width)) - left,
          height: Math.max(...selRects.map((r) => r.top + r.height)) - top,
        };
      })()
    : null;

  // Alt held: distance from the selection's bounds to each canvas edge (canvas px, like the Size fields)
  const measureSegs = (() => {
    if (!altHeld || !box || locked || !selectedIds.length) return [];
    const bounds = frames
      .filter((f) => selectedIds.includes(f.id) && !f.hidden)
      .map((f) => {
        const r = frameRect(f, box);
        if (!f.r) return { l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height };
        const rad = (f.r * Math.PI) / 180;
        const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
        const hw = (r.width * c + r.height * s) / 2;
        const hh = (r.width * s + r.height * c) / 2;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        return { l: cx - hw, t: cy - hh, r: cx + hw, b: cy + hh };
      });
    if (!bounds.length) return [];
    const l = Math.min(...bounds.map((b) => b.l));
    const t = Math.min(...bounds.map((b) => b.t));
    const r = Math.max(...bounds.map((b) => b.r));
    const b = Math.max(...bounds.map((b) => b.b));
    const cx = (l + r) / 2, cy = (t + b) / 2;
    // always all four edges; a frame touching or past an edge reads 0 or a negative number
    return [
      { key: "left", x: Math.min(0, l), y: cy, w: Math.abs(l), h: 0, v: l },
      { key: "right", x: Math.min(r, box.w), y: cy, w: Math.abs(box.w - r), h: 0, v: box.w - r },
      { key: "top", x: cx, y: Math.min(0, t), w: 0, h: Math.abs(t), v: t },
      { key: "bottom", x: cx, y: Math.min(b, box.h), w: 0, h: Math.abs(box.h - b), v: box.h - b },
    ];
  })();

  const cameraCss = box ? frameCameraCss(getFrameCamera(camera, box.h)) : undefined;
  const rigP = box ? rigPerspective(frames, box) : undefined;
  // far planes first: z-index follows depth, so the DOM order (and any playing videos) never changes
  const depthRank = frames.some((f) => f.rig)
    ? new Map([...frames].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map((f, n) => [f.id, n + 1]))
    : null;
  // the first visible frame that has progressive blurs sets them for the whole canvas (all of its progressive effects apply)
  const isPb = (e) => e.visible && e.type === "layerBlur" && e.mode === "progressive" && (e.blur > 0 || (e.startBlur ?? 0) > 0);
  const pbOwner = frames.find((f) => !f.hidden && (f.effects ?? []).some(isPb));
  const pbs = (pbOwner?.effects ?? []).filter(isPb);
  const pbMain = pbs[0]; // the first progressive blur gets the on-canvas handles

  // uniform layer blur is canvas-wide: the first visible frame that has one sets it for all frames together
  const isUb = (e) => e.visible && e.type === "layerBlur" && e.mode !== "progressive" && e.blur > 0;
  const ubOwner = frames.find((f) => !f.hidden && (f.effects ?? []).some(isUb));
  const ubBlur = ubOwner ? ubOwner.effects.filter(isUb).reduce((sum, e) => sum + e.blur, 0) : 0;

  // canvas-wide effects: the first visible frame that has one sets it for the whole canvas
  const canvasFx = (type) => {
    for (const f of frames) {
      if (f.hidden) continue;
      const e = (f.effects ?? []).find((x) => x.visible && x.type === type);
      if (e) return e;
    }
    return null;
  };
  const fish = canvasFx("fishEye");
  const glass = canvasFx("liquidGlass");
  const vig = canvasFx("vignette");
  const fishOn = !!box && !!fish && fish.amount > 0;
  const canvasFish = fishOn && useFishCanvas;
  const fishMap = useMemo(() => (fishOn ? fishEyeMap(box.w, box.h, fish.amount) : null), [fishOn, box?.w, box?.h, fish?.amount]);

  // Liquid glass: two edge bands (top + bottom), sizes and maths come from glassProfile()
const gp = box && glass ? glassProfile(glass, box.h) : null;
// farthest any channel reads past the band: green shift + fringe (shift * (1 + dsp)), plus a margin
const glassExt = gp ? Math.min(Math.ceil(gp.shift * (1 + gp.dsp)) + 2, Math.max(0, box.h - gp.bandH)) : 0;
const bandKey = gp ? `${box.w}|${box.h}|${JSON.stringify(glass)}` : "";
const bandMaps = useMemo(
  () => (gp ? {
    top: glassMaps(box.w, box.h, glass, "top", glassExt),
    bottom: glassMaps(box.w, box.h, glass, "bottom", glassExt),
  } : null),
  [bandKey]
);

  return (
    <div
      ref={wrapRef}
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => {
        if (!locked) return;
        const hit = e.target.closest?.("[data-frame-id]");
        onFrameHover?.(hit ? Number(hit.dataset.frameId) : null);
      }}
      onPointerLeave={() => locked && onFrameHover?.(null)}
      className={`fade-enter absolute inset-0 overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] touch-none ${locked ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      {background}
      <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
        <defs>
          {[["r", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"], ["g", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"], ["b", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"]].map(([ch, m]) => (
            <filter key={ch} id={`bezel-ca-${ch}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={m} />
            </filter>
          ))}
{fishMap && (
  <filter id="bezel-fisheye" filterUnits="userSpaceOnUse" x="0" y="0" width={box.w} height={box.h} colorInterpolationFilters="sRGB">
    <feImage href={fishMap.url} x="0" y="0" width={box.w} height={box.h} preserveAspectRatio="none" result="map" />
    <feDisplacementMap in="SourceGraphic" in2="map" scale={fishMap.scale} xChannelSelector="R" yChannelSelector="G" result="coarse" />
    <feImage href={fishMap.url2} x="0" y="0" width={box.w} height={box.h} preserveAspectRatio="none" result="map2" />
    <feDisplacementMap in="coarse" in2="map2" scale={fishMap.scale2} xChannelSelector="R" yChannelSelector="G" result="disp" />
    {/* displacement is nearest-neighbour, so soften the stair-stepping; stronger fish eye = more magnification = more blur */}
    <feGaussianBlur in="disp" stdDeviation={Math.min(1, 0.35 + (fish.amount / 100) * 0.3)} />
  </filter>
)}
{gp && bandMaps && URL_BACKDROP && ["top", "bottom"].map((side) => (
  <filter key={side} id={`bezel-glass-${side}`} filterUnits="userSpaceOnUse" x="0" y="0" width={box.w} height={gp.bandH + glassExt} colorInterpolationFilters="sRGB">
    <feImage href={bandMaps[side].map} x="0" y="0" width={box.w} height={gp.bandH + glassExt} preserveAspectRatio="none" result="map" />
    {[
      ["r", 1 + gp.dsp, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"],
      ["g", 1, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"],
      ["b", 1 - gp.dsp, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"],
    ].flatMap(([ch, k, m]) => [
      <feDisplacementMap key={`d${ch}`} in="SourceGraphic" in2="map" scale={bandMaps[side].scale * k} xChannelSelector="R" yChannelSelector="G" result={`d${ch}`} />,
      <feColorMatrix key={`m${ch}`} in={`d${ch}`} type="matrix" values={m} result={`c${ch}`} />,
    ])}
    <feBlend in="cr" in2="cg" mode="screen" result="rg" />
    <feBlend in="rg" in2="cb" mode="screen" />
  </filter>
))}
        </defs>
      </svg>
      {textBehind}
      <canvas
        ref={fishCanvasRef}
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ display: "none" }}
      />
      {box && (
        <div ref={animRef} className="absolute inset-0">
        <div
          ref={stageRef}
          className="absolute inset-0"
          style={{
            transform: cameraCss,
            willChange: "transform",
            // Only eases on preset clicks. Slider drags stay 1:1 with the pointer.
            transition: cameraEase ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              isolation: "isolate",
              perspective: rigP,
              willChange: "filter",
              opacity: canvasFish ? 0 : undefined, // still hit-testable, the canvas shows instead
              filter: [ubBlur > 0 ? `blur(${ubBlur}px)` : "", fishMap && !canvasFish ? "url(#bezel-fisheye)" : ""].filter(Boolean).join(" ") || undefined,
            }}
          >
          {frames.map((f) => {
            const r = frameRect(f, box);
            const ap = frameAppearanceOf(f, environment, camera.rotationX, camera.rotationY);
            const imgUrl = f.img ? (f.img.cropUrl ?? f.img.url) : null;
            const fShort = Math.min(r.width, r.height);
            const borderRadius = ap.radiiFrac.map((p) => `${fShort * p}px`).join(" ");
            if (f.rig?.curve) {
              return (
                <div key={f.id} onDoubleClick={() => onFrameDoubleClick?.(f.id)} style={{ display: "contents" }}>
                  <CurvedPlane
                    f={f} r={r} short={Math.min(box.w, box.h)} radiiFrac={ap.radiiFrac} imgUrl={imgUrl}
                    backVisible={backVisible} zIndex={depthRank?.get(f.id)} transform={planeCss(f, Math.min(box.w, box.h))} ap={ap}
                    dim={frameDim(f, box)} playing={playing}
                  />
                </div>
              );
            }
            return (
              <div
                key={f.id}
                data-frame-id={f.id}
                onDoubleClick={() => onFrameDoubleClick?.(f.id)}
                className="absolute overflow-hidden"
                style={{
                  display: f.hidden ? "none" : undefined,
                  left: r.left,
                  top: r.top,
                  width: r.width,
                  height: r.height,
                  borderRadius,
                  boxShadow: withGlow(f, ap.boxShadow),
                  transform: planeCss(f, Math.min(box.w, box.h)),
                  zIndex: depthRank?.get(f.id),
                  backfaceVisibility: f.rig?.hide ? "hidden" : undefined,
                  cursor: editable ? "default" : undefined,
                }}
              >
                {backVisible ? (
                  // scaleX(-1) undoes the mirroring you get from behind, so a gradient reads as authored
                  <div className="w-full h-full" style={{ background: backFillOf(f), opacity: backOpacityOf(f), transform: "scaleX(-1)" }} />
                ) : f.social?.on ? (
                  <div className="w-full h-full bg-black" />
                ) : imgUrl ? (
                  videoMode && f.img.video ? (
                    <video
                      data-frame-video
                      src={f.img.video.url}
                      poster={imgUrl}
                      muted
                      loop
                      playsInline
                      preload="auto"
                      draggable={false}
                      onLoadedMetadata={onVideoReady}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  ) : (f.effects ?? []).find((e) => e.visible && e.type === "chromatic" && e.amount > 0) ? (
                    (() => {
                      const ca = f.effects.find((e) => e.visible && e.type === "chromatic" && e.amount > 0);
                      return <ChromaticImage url={imgUrl} amount={ca.amount} angle={ca.angle ?? 0} />;
                    })()
                  ) : (
                    <img src={imgUrl} alt="" draggable={false} className="w-full h-full object-cover select-none pointer-events-none" />
                  )
                ) : (
                  <div
                    className="keep-size w-full h-full flex items-center justify-center text-center text-[#FAF9FA] font-semibold select-none"
                    style={{
                      background: "linear-gradient(180deg, #FFFFFF 0%, #FF47BC 100%)",
                      fontSize: Math.max(11, r.width * 0.05),
                      lineHeight: 1.3,
                    }}
                  >
                    <span style={{ maxWidth: "45%" }}>Drop your image here</span>
                  </div>
                )}

                {f.social?.on && !backVisible && (
                  <SocialOverlay social={{ ...f.social, media: imgUrl }} width={r.width} height={r.height} />
                )}

                {!backVisible && (f.statusBar || f.homeIndicator) && (
                  <ChromeCanvas o={chromeOps(f, r.width, r.height, chromeColors?.[chromeKey(f)])[0]} />
                )}

                {ap.noise.map((n) => (
                  <div
                    key={n.id}
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: n.url, opacity: n.opacity, mixBlendMode: "overlay" }}
                  />
                ))}

                {ap.sheen && (
                  <div key={ap.sheenKey} className="fade-enter absolute inset-0 pointer-events-none" style={{ backgroundImage: ap.sheen }} />
                )}

                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none bg-black"
                  style={{
                    opacity: 1 - (1 - (f.sh || 0)) * (1 - frameDim(f, box)),
                    transition: playing ? "none" : DIM_TRANSITION,
                  }}
                />

                {ap.insetStroke && (
                  <div className="absolute inset-0 pointer-events-none" style={{ borderRadius, boxShadow: ap.insetStroke }} />
                )}
              </div>
            );
          })}

          {pbs.map((pb, n) => {
            const g = pbParams(pb, box.w, box.h);
            return (
              <React.Fragment key={`pb-${n}`}>
                {g.base > 0 && (
                  <div aria-hidden className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 1000, backdropFilter: `blur(${g.base}px)`, WebkitBackdropFilter: `blur(${g.base}px)` }} />
                )}
                {g.extra > 0 && Array.from({ length: PB_BANDS }, (_, i) => {
                  const m = pbMask(g, i, box.w, box.h), f = `blur(${pbBandBlur(g.extra)}px)`;
                  return (
                    <div key={i} aria-hidden className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 1000, backdropFilter: f, WebkitBackdropFilter: f, maskImage: m, WebkitMaskImage: m }} />
                  );
                })}
              </React.Fragment>
            );
          })}
          </div>

          {/* Selection outlines (locked canvas: selected + hovered assets, 2px) */}
          {(locked ? markIds : selectedIds).map((id) => {
            const f = frames.find((x) => x.id === id);
            if (!f || f.hidden) return null;
            if (f.rig) {
              const pts = planePoly(f, box).map((p) => p.join(",")).join(" ");
              return (
                <svg key={`sel-${id}`} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  <polygon points={pts} fill="none" stroke="#FF47BC" strokeWidth={locked ? 2 : 1} />
                </svg>
              );
            }
            const r = frameRect(f, box);
            const radii = frameAppearanceOf(f, environment, camera.rotationX, camera.rotationY).radiiFrac;
            const fs = Math.min(r.width, r.height);
            return (
              <div
                key={`sel-${id}`}
                className="absolute pointer-events-none"
                style={{
                  left: r.left, top: r.top, width: r.width, height: r.height,
                  outline: locked ? "2px solid #FF47BC" : "1px solid #FF47BC",
                  borderRadius: radii.map((p) => `${fs * p}px`).join(" "),
                  transform: f.r ? `rotate(${f.r}deg)` : undefined,
                }}
              />
            );
          })}

          {/* Resize box: the frame itself for one selection, the group bounds for several */}
          {group && editable && !locked && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: group.left,
                top: group.top,
                width: group.width,
                height: group.height,
                outline: selectedIds.length > 1 ? "1px dashed #FF47BC" : undefined,
                transform: selectedIds.length === 1 ? `rotate(${frames.find((x) => x.id === selectedIds[0])?.r ?? 0}deg)` : undefined,
              }}
            >
              {RESIZE_HANDLES.map(([key, x, y, cursor]) => (
                <div
                  key={key}
                  data-handle
                  onPointerDown={startResize(key)}
                  className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-white border border-[#FF47BC] pointer-events-auto"
                  style={{ left: `${x}%`, top: `${y}%`, cursor }}
                />
              ))}
            </div>
          )}
        </div>
        </div>
      )}

      {/* Liquid glass: top + bottom edge bands over the whole canvas (background + frames), not inside the camera stage.
          Refraction + dispersion need url() in backdrop-filter (Chromium). Frost + rim light work everywhere. */}
{gp && bandMaps && ["top", "bottom"].map((side) => {
  const toward = side === "top" ? "bottom" : "top";
  const base = { [side]: 0, height: gp.bandH, zIndex: 20 };
  const tall = { ...base, height: gp.bandH + glassExt };
  const refract = URL_BACKDROP && (glass.refraction ?? 80) > 0;
  const ref = `url(#bezel-glass-${side})`;

  // smoothstep fade from t0 to t1, written as gradient stops so there's no visible linear kink
  const maskFor = ({ t0, t1 }) => {
    const stops = [`rgba(0,0,0,1) ${t0 * 100}%`];
    for (let s = 1; s <= 5; s++) {
      const u = s / 6, a = 1 - u * u * (3 - 2 * u);
      stops.push(`rgba(0,0,0,${a.toFixed(3)}) ${(t0 + (t1 - t0) * u) * 100}%`);
    }
    stops.push(`rgba(0,0,0,0) ${t1 * 100}%`);
    return `linear-gradient(to ${toward}, ${stops.join(", ")})`;
  };

  return (
    <React.Fragment key={side}>
      {refract && (
        <div aria-hidden className="absolute left-0 right-0 pointer-events-none"
          style={{ ...tall, backdropFilter: ref, WebkitBackdropFilter: ref }} />
      )}
      {gp.frost > 0.3 && frostLayers(gp.frost).map((l, i) => {
        const m = maskFor(l), f = `blur(${l.blur}px)`;
        return (
          <div key={i} aria-hidden className="absolute left-0 right-0 pointer-events-none"
            style={{ ...base, backdropFilter: f, WebkitBackdropFilter: f, maskImage: m, WebkitMaskImage: m }} />
        );
      })}
      <div aria-hidden className="absolute left-0 right-0 pointer-events-none"
        style={{ ...tall, backgroundImage: `url(${bandMaps[side].hi})`, backgroundSize: "100% 100%" }} />
    </React.Fragment>
  );
})}

      {box && vig && vig.amount > 0 && (() => {
        const v = vignetteStops(vig);
        return (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 21, background: `radial-gradient(circle farthest-corner at 50% 50%, rgba(0,0,0,0) ${v.inner * 100}%, rgba(0,0,0,${v.alpha}) ${v.outer * 100}%)` }}
          />
        );
      })()}

      {box && pbMain && pbOwner && !locked && (
        <PbHandles
          width={box.w} height={box.h}
          {...pbPts(pbMain)}
          onChange={(patch) =>
            onFramesChange((prev) =>
              prev.map((f) => ({
                ...f,
                effects: f.effects.map((x) => (x.type === "layerBlur" && x.mode === "progressive" ? { ...x, ...patch } : x)),
              }))
            )
          }
        />
      )}

      {/* Center guides, shown while a drag has the selection centered on the canvas */}
      {marquee && (
        <div
          className="absolute z-30 pointer-events-none border border-[#FF47BC] bg-[#FF47BC]/10"
          style={{ left: marquee.left, top: marquee.top, width: marquee.width, height: marquee.height }}
        />
      )}
      {guides.v && <div className="absolute z-30 top-0 bottom-0 left-1/2 w-px bg-[#FF47BC] pointer-events-none" />}
      {guides.h && <div className="absolute z-30 left-0 right-0 top-1/2 h-px bg-[#FF47BC] pointer-events-none" />}

      {/* Alt held: distance from the selection to each canvas edge */}
      {measureSegs.map((s) => {
        const horizontal = s.h === 0;
        return (
          <div key={`measure-${s.key}`} aria-hidden className="absolute pointer-events-none z-30">
            <div
              className="absolute bg-[#FF47BC]"
              style={{
                left: s.x,
                top: s.y,
                width: horizontal ? s.w : 1,
                height: horizontal ? 1 : s.h,
              }}
            />
            <span
              className="absolute px-1 h-4 rounded-[4px] bg-[#FF47BC] text-[10px] leading-4 font-medium tabular-nums text-[#FAF9FA]"
              style={{
                left: horizontal ? Math.min(box.w - 14, Math.max(14, s.x + s.w / 2)) : Math.min(box.w - 14, Math.max(14, s.x)),
                top: horizontal ? Math.min(box.h - 10, Math.max(10, s.y)) : Math.min(box.h - 10, Math.max(10, s.y + s.h / 2)),
                transform: "translate(-50%, -50%)",
              }}
            >
              {Math.round(s.v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}