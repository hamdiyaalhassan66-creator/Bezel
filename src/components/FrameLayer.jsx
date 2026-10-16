import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { isDefaultCamera, getFrameCamera, frameCameraCss } from "../lib/frameUtils.js";
import { backFillOf, backOpacityOf, frameAppearanceOf, frameRect, cloneFrame } from "../lib/frameModel.js";
import { chromeKey, chromeOps, ChromeCanvas, SocialOverlay } from "./SocialOverlay.jsx";
import { RESIZE_HANDLES } from "../constants/canvasControls.js";

export function FrameLayer({ frames, selectedIds, onSelect, onFramesChange, aspectLocked, environment, camera, cameraEase, background, textBehind, sizeRef, onPickFile, onRotate, onZoom, backVisible, chromeColors, nextFrameId, stageRef, animRef, onStageReady, groupOf, onFrameDoubleClick, videoMode, onVideoReady }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState(null);
  const [guides, setGuides] = useState({ v: false, h: false }); // v = vertical line (centered in X), h = horizontal line (centered in Y)
  const [marquee, setMarquee] = useState(null); // { left, top, width, height } while Shift-dragging
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
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setGuides({ v: false, h: false });
      if (!moved && !e.shiftKey && ids.length > grp.length) onSelect(grp); // click without dragging = pick just this one (and its group)
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
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
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
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
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setMarquee(null);
      if (!moved && !additive) onSelect([]); // a plain click on empty canvas deselects
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    const hit = e.target.closest?.("[data-frame-id]");
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

  const cameraCss = box ? frameCameraCss(getFrameCamera(camera, box.h)) : undefined;

  return (
    <div
      ref={wrapRef}
      onPointerDown={handlePointerDown}
      className="fade-enter absolute inset-0 overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] cursor-grab active:cursor-grabbing touch-none"
    >
      {background}
      {textBehind}
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
          {frames.map((f) => {
            const r = frameRect(f, box);
            const ap = frameAppearanceOf(f, environment, camera.rotationX, camera.rotationY);
            const imgUrl = f.img ? (f.img.cropUrl ?? f.img.url) : null;
            const fShort = Math.min(r.width, r.height);
            const borderRadius = ap.radiiFrac.map((p) => `${fShort * p}px`).join(" ");
            return (
              <div
                key={f.id}
                data-frame-id={f.id}
                onDoubleClick={() => onFrameDoubleClick?.(f.id)}
                className="absolute overflow-hidden"
                style={{
                  left: r.left,
                  top: r.top,
                  width: r.width,
                  height: r.height,
                  borderRadius,
                  boxShadow: ap.boxShadow,
                  filter: ap.filter,
                  transform: f.r ? `rotate(${f.r}deg)` : undefined,
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

                {ap.insetStroke && (
                  <div className="absolute inset-0 pointer-events-none" style={{ borderRadius, boxShadow: ap.insetStroke }} />
                )}
              </div>
            );
          })}

          {/* Selection outlines, one per selected frame */}
          {selectedIds.map((id) => {
            const f = frames.find((x) => x.id === id);
            if (!f) return null;
            const r = frameRect(f, box);
            return (
              <div
                key={`sel-${id}`}
                className="absolute pointer-events-none"
                style={{ left: r.left, top: r.top, width: r.width, height: r.height, outline: "1px solid #FF47BC", transform: f.r ? `rotate(${f.r}deg)` : undefined }}
              />
            );
          })}

          {/* Resize box: the frame itself for one selection, the group bounds for several */}
          {group && editable && (
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

      {/* Center guides, shown while a drag has the selection centered on the canvas */}
            {marquee && (
        <div
          className="absolute pointer-events-none border border-[#FF47BC] bg-[#FF47BC]/10"
          style={{ left: marquee.left, top: marquee.top, width: marquee.width, height: marquee.height }}
        />
      )}
      {guides.v && <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#FF47BC] pointer-events-none" />}
      {guides.h && <div className="absolute left-0 right-0 top-1/2 h-px bg-[#FF47BC] pointer-events-none" />}
    </div>
  );
}