import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import MockupScene, { paintPhoneChrome, paintTextItem, getStrapStyles } from "./MockupScene.jsx";
import ColorPicker from "./ColorPicker.jsx";
import GradientPicker from "./GradientPicker.jsx";
import CropModal from "./CropModal.jsx";
import ShortcutsModal, { ALT } from "./ShortcutsModal.jsx";
import KeyCombo from "./KeyCombo.jsx";
import Tooltip from "./Tooltip.jsx";
import OptionRow from "./OptionRow.jsx";
import ToolbarDropdown, { DROPDOWN_TRIGGER, DROPDOWN_CARET } from "./Dropdown.jsx";
import AppTour from "./AppTour.jsx";
import { OffsetField, SizeLockRow } from "./SizeFields.jsx";
import {
  SOCIAL_OPTIONS,
  platformOf,
  modeOf,
  socialDefaults,
  DEFAULT_SOCIAL,
  ICONS,
  socialOps,
} from "./lib/social.js";
import {
  makeGrainUrl,
  EFFECT_TYPE_OPTIONS,
  STROKE_POSITIONS,
  CAM_DEFAULT,
  isDefaultCamera,
  getFrameCamera,
  frameCameraCss,
  drawWarped,
  sheenCss,
  paintSheen,
  hexRgba,
  isFrameBackFacing,
  buildGradientCss,
  makeCanvasGradient,
  makeEffect,
  DEFAULT_FRAME_EFFECTS,
  DEFAULT_STROKE,
} from "./lib/frameUtils.js";
import { drawNoise, makeGrainTile } from "./lib/noise.js";
import {
  CAM_KEYS, smoothstep, VID_EASES, VID_EASE_PARAMS, VID_EASE_GROUPS, VID_EASE_PRESETS, VID_EASE_CUSTOM_DEFAULT,
  vidEaseSpec, vidEaseFn, VID_FPS, VID_PPS, VID_PPS_MIN, VID_PPS_MAX, VID_LABEL_W, VID_PAD, VID_GRAY,
  VID_H_MIN, VID_H_MAX, VID_GLIDE_MS, VID_GLIDE_EASE, VID_PROPS, vidClamp, vidSnap, fmtTC, sampleShots,
} from "./lib/videoMath.js";
import {
  DEV_ANIM_GROUPS, DEV_ANIMS, devAnimLabel, devAnimPose, shotAnimPose, shotForImgAt, sampleDeviceAnim,
} from "./lib/shotAnim.js";
import {
  BG_CUSTOM_REST, BG_ANIM_NONE, BG_ANIM_GROUPS, BG_ANIMS, BG_ANIM_BY_ID, bgProgress, bgDefaultEase,
  BG_ANIM_PARAMS, bgAnimOf, bgKey, bgFallbackSnap, bgRand, bgTmp, paintBgSnap, drawBgTransition, drawBgAnimPreview,
} from "./lib/bgAnim.js";
import {
  FRAME_DEFAULT_SIZE, makeFrame, cornersOf, backFillOf, backOpacityOf, frameAppearanceOf, frameRect, cloneFrame,
} from "./lib/frameModel.js";
import { framePoseMap, sampleShotFrames, changedCamProps, keyStateAt, vidShotAtTime } from "./lib/frameKeys.js";
import {
  chromeKey,
  sampleChromeColors,
  chromeOps,
  ChromeCanvas,
  SocialOverlay,
  paintSocial,
} from "./components/SocialOverlay.jsx";
import { SOCIAL_FULL_WIDTH, SocialField, ImageUploadField } from "./components/SocialFields.jsx";
import {
  SEG_ON, SEG_OFF, SearchField, Scrubber, ToggleRow, FinishDropdown, GradientPresetDropdown,
  ImagePresetDropdown, GradientCanvasHandles, ColorOpacityField, PopupDropdown, AppearanceHeader,
  CornerRadiusFields, FadeScroller, FadeScrollerY, SectionHeader,
} from "./components/controls.jsx";
import {
  CUSTOM_FINISH,
  WATCH_STRAPS,
  DEVICE_FINISHES,
  DEFAULT_FINISHES,
  getStrapStyleOptions,
  getFinishesForDevice,
} from "./constants/finishes.js";
import { TEMPLATE_LIBRARY, FRAME_TEMPLATE_LIBRARY, FRAME_LAYOUTS, layoutOf } from "./constants/templates.js";
import { GRADIENT_PRESETS, IMAGE_PRESETS } from "./constants/presets.js";
import { CAMERA_VIEW_PRESETS, TEMPLATE_CAMERAS, templatePreviewCam } from "./constants/camera.js";
import {
  TEMPLATE_DEVICE_SHAPE,
  CANVAS_SIZE_OPTIONS,
  EXPORT_SIZES,
  EXPORT_FORMATS,
  formatBytes,
  DEVICE_TYPE_OPTIONS,
  CATEGORY_DEVICE_OPTIONS,
} from "./constants/options.js";
import {
  LIGHTING_OPTIONS,
  THEME_OPTIONS,
  BROWSER_OPTIONS,
  SAFARI_TABS_OPTIONS,
  ENVIRONMENT_OPTIONS,
} from "./constants/uiOptions.js";
import { VIDEO_TEMPLATES, FRAME_VIDEO_TEMPLATES, vtBgSnap, vtBgCss } from "./constants/videoTemplates.js";
import { createPortal } from "react-dom";
import {
  VIDEO_FORMATS, VIDEO_RESOLUTIONS, VIDEO_SPEEDS, VIDEO_FPS_OPTIONS,
  fitVideoDims, estimateVideoBytes, encodeVideoFrames,
} from "./exportVideo.js";

import {
  UploadSimple,
  DownloadSimple,
  ArrowCounterClockwise,
  CaretDown,
  CaretUp,
  CaretRight,
  CaretLeft,
  Plus,
  Folder,
  CardsThree,
  Info,
  SidebarSimple,
  Check,
  Crop,
  Trash,
  X,
  Devices,
  Minus,
  Eye,
  EyeSlash,
  CornersOut,
  FloppyDisk,
  DotsThreeVertical,
  Compass,
  Palette,
  Image as ImageIcon,
  Keyboard,
  ArrowUUpLeft,
  ArrowUUpRight,
  AlignLeftSimple,
  AlignCenterHorizontalSimple,
  AlignRightSimple,
  AlignTopSimple,
  AlignCenterVerticalSimple,
  AlignBottomSimple,
  Rows,
  Columns,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextAlignJustify,
  TextUnderline,
  TextStrikethrough,
  TextT,
  ArrowsHorizontal,
  ArrowsVertical,
  LockSimple,
  LockSimpleOpen,
  CircleNotch,
  Diamond,
  ArrowsCounterClockwise,
  TrashSimple,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  MusicNoteSimple,
  DotsSixVertical,
  Copy,
  ArrowsOutCardinal,
  ArrowSquareOut,
  CircleHalf,
  Drop,
  Stack,
  Square,
} from "@phosphor-icons/react";

const DEVICE_CATEGORIES = [
  { key: "phone", label: "Phone", enabled: true },
  { key: "desktop", label: "Desktop", enabled: true },
  { key: "tablet", label: "Tablet", enabled: true },
  { key: "watch", label: "Watch", enabled: true },
];

// Template card thumbnail for Frame mode: draws the layout using the current frames' images.
function FrameTemplateThumb({ tpl, frames }) {
  const slots = layoutOf(tpl);
  const imgs = frames.filter((f) => f.img).map((f) => f.img.cropUrl ?? f.img.url);
  const k = 0.2; // shadow / stroke scale for the small card
  const sh = tpl.shadow;
  const st = tpl.stroke;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {slots.map((sl, i) => {
        const url = imgs.length ? imgs[i % imgs.length] : null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${50 + sl.x * 100}%`,
              top: `${50 + sl.y * 100}%`,
              height: `${sl.h * 100}%`,
              aspectRatio: sl.r,
              transform: "translate(-50%, -50%)",
              borderRadius: `${tpl.radius}%`,
              boxSizing: "border-box",
              background: url ? `center / cover url(${url})` : "linear-gradient(180deg, #FFFFFF 0%, #FF47BC 100%)",
              border: st ? `${Math.max(1, st.width * k * 2)}px solid ${hexRgba(st.hex, st.opacity)}` : undefined,
              boxShadow: sh ? `${sh.x * k}px ${sh.y * k}px ${sh.blur * k}px ${sh.spread * k}px ${hexRgba(sh.hex, sh.opacity)}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

// CSS background for a template card preview
function templateBackground(t) {
  const bg = t.bg;
  if (bg.type === "solid") return { backgroundColor: `#${bg.hex}` };
  if (bg.type === "gradient") return { background: GRADIENT_PRESETS.find((g) => g.value === bg.preset)?.swatch };
  const img = IMAGE_PRESETS.find((i) => i.value === bg.preset);
  return { backgroundImage: `url(${img?.thumb})`, backgroundSize: "cover", backgroundPosition: "center" };
}

function cropImageToDataUrl(url, rect) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // needed so toDataURL doesn't throw on cross-origin preset images
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Default scene background: matches the app's panel surface color.
const surfaceHex = (dark) => (dark ? "171717" : "FAF9FA");

// "Edited at 3:45pm" style label for project cards.
function formatEditedAt(date) {
  const time = date
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .replace(" ", "")
    .toLowerCase();
  return `Edited at ${time}`;
}

const ALIGN_ACTIONS = [
  { key: "left", label: "Align left", Icon: AlignLeftSimple, shortcut: [ALT, "A"] },
  { key: "hcenter", label: "Align horizontal centers", Icon: AlignCenterHorizontalSimple, shortcut: [ALT, "H"] },
  { key: "right", label: "Align right", Icon: AlignRightSimple, shortcut: [ALT, "D"] },
  { key: "top", label: "Align top", Icon: AlignTopSimple, shortcut: [ALT, "W"] },
  { key: "vcenter", label: "Align vertical centers", Icon: AlignCenterVerticalSimple, shortcut: [ALT, "V"] },
  { key: "bottom", label: "Align bottom", Icon: AlignBottomSimple, shortcut: [ALT, "S"] },
];

// Matched on e.code, because Option on Mac types special characters instead of letters.
const ALIGN_KEYS = { KeyA: "left", KeyD: "right", KeyW: "top", KeyS: "bottom", KeyH: "hcenter", KeyV: "vcenter" };

const RESIZE_HANDLES = [
  ["nw", 0, 0, "nwse-resize"], ["n", 50, 0, "ns-resize"], ["ne", 100, 0, "nesw-resize"], ["e", 100, 50, "ew-resize"],
  ["se", 100, 100, "nwse-resize"], ["s", 50, 100, "ns-resize"], ["sw", 0, 100, "nesw-resize"], ["w", 0, 50, "ew-resize"],
];

// Live Alt / Shift state, read from key events (capture phase) so it works on hover alone.
function useModifiers() {
  const [mods, setMods] = useState({ alt: false, shift: false });
  useEffect(() => {
    const sync = (e) =>
      setMods((p) => (p.alt === e.altKey && p.shift === e.shiftKey ? p : { alt: e.altKey, shift: e.shiftKey }));
    const clear = () => setMods({ alt: false, shift: false });
    window.addEventListener("keydown", sync, true);
    window.addEventListener("keyup", sync, true);
    window.addEventListener("pointermove", sync, true);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", sync, true);
      window.removeEventListener("keyup", sync, true);
      window.removeEventListener("pointermove", sync, true);
      window.removeEventListener("blur", clear);
    };
  }, []);
  return mods;
}

function FrameLayer({ frames, selectedIds, onSelect, onFramesChange, aspectLocked, environment, camera, cameraEase, background, textBehind, sizeRef, onPickFile, onRotate, onZoom, backVisible, chromeColors, nextFrameId, stageRef, animRef, onStageReady, groupOf, onFrameDoubleClick, videoMode, onVideoReady }) {
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

// Drag-and-drop for files. The depth counter keeps `dragOver` from flickering
// when the pointer moves across child elements.
function useFileDrop(onFile) {
  const [dragOver, setDragOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  const dropProps = {
    onDragEnter: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setDragOver(true);
    },
    onDragOver: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragOver(false);
    },
    onDrop: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragOver(false);
      onFile(Array.from(e.dataTransfer.files ?? []));
    },
  };
  return { dragOver, dropProps };
}

// Social media UI controls for the Mockup tab (same fields as the Frame tab's section).
function SocialControls({ social, setSocial }) {
  const avatarInputRef = useRef(null);
  const update = (patch) => setSocial((prev) => ({ ...prev, ...patch }));
  const platform = platformOf(social.platform);
  const mode = modeOf(social.platform, social.mode);
  const changePlatform = (p) => update({ platform: p, mode: platformOf(p).modes[0].value, ...socialDefaults(p) });
  const changeMode = (m) => update({ mode: m, ...socialDefaults(social.platform, m) });
  const onAvatar = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) update({ avatar: URL.createObjectURL(file), avatarName: file.name });
    e.target.value = "";
  };

  return (
    <div className="fx-enter flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Platform</label>
        <ToolbarDropdown value={social.platform} options={SOCIAL_OPTIONS} onChange={changePlatform} />
      </div>

      {platform.modes.length > 1 && (
        <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
          {platform.modes.map((m) => (
            <button
              key={m.value}
              onClick={() => changeMode(m.value)}
              className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
                mode.value === m.value ? SEG_ON : SEG_OFF
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {mode.themed && (
        <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
          {["light", "dark"].map((t) => (
            <button
              key={t}
              onClick={() => update({ theme: t })}
              className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 capitalize transition-colors duration-200 ${
                social.theme === t ? SEG_ON : SEG_OFF
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">
          {social.platform === "tiktok" ? "Profile picture" : "Avatar"}
        </label>
        {social.avatar ? (
          <div className="w-full h-[66px] flex items-center justify-between py-2 pl-2 pr-1 gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl">
            <div className="flex items-center gap-2 h-12 min-w-0">
              <div className="w-12 h-12 rounded-full shrink-0 bg-cover bg-center bg-[#EDEDED]" style={{ backgroundImage: `url(${social.avatar})` }} />
              <span className="text-[13px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] truncate">
                {social.avatarName}
              </span>
            </div>
            <div className="flex items-start gap-0.5 shrink-0">
              <Tooltip label="Replace avatar" placement="bottom">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                </button>
              </Tooltip>
              <Tooltip label="Remove avatar" placement="bottom">
                <button
                  type="button"
                  onClick={() => update({ avatar: null, avatarName: null })}
                  className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F04438]/10 transition-colors"
                >
                  <Trash size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
                </button>
              </Tooltip>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="w-full h-[66px] bg-white dark:bg-[#1F1F1F] border border-dashed border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-[10px] flex flex-col items-center justify-center gap-1 hover:bg-[#EAEAEA] dark:hover:bg-[#333333] transition-colors"
          >
            <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
            <span className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">Upload avatar</span>
          </button>
        )}
        <input ref={avatarInputRef} type="file" accept="image/*" onChange={onAvatar} className="hidden" />
        {social.platform === "tiktok" && mode.value === "post" && (
          <ImageUploadField
            label="Sound avatar"
            value={social.soundAvatar}
            onChange={(url) => update({ soundAvatar: url })}
            uploadLabel="Upload sound avatar"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
        {Object.entries(mode.fields).map(([key, [label]]) => (
          <SocialField
            key={key}
            label={label}
            full={SOCIAL_FULL_WIDTH.has(key)}
            value={social[key] ?? ""}
            onChange={(v) => update({ [key]: v })}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- Text popup (sample) ----------
const TEXT_FONTS = ["Inter", "Helvetica Neue", "Georgia", "Times New Roman", "Courier New"].map((v) => ({ value: v, label: v }));
const TEXT_WEIGHTS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra bold" },
];
const TEXT_CASES = [
  { value: "none", label: "As typed" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "capitalize", label: "Capitalize" },
];
const TEXT_ALIGNS = [
  { value: "left", Icon: TextAlignLeft },
  { value: "center", Icon: TextAlignCenter },
  { value: "right", Icon: TextAlignRight },
  { value: "justify", Icon: TextAlignJustify },
];
const TEXT_POSITIONS = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
const DEFAULT_TEXT = {
  name: "Your text", content: "Your text", font: "Inter", weight: "700", size: 32, lineHeight: 120, letterSpacing: 0,
  hex: "000000", opacity: 100, align: "left", textCase: "none", position: "mc", layer: "front", zIndex: 1, customFonts: [], dx: 0, dy: 0, boxW: null, boxH: null,
  fillHex: null, fillOpacity: 100, decoration: null,
  decoStyle: "solid", decoThickness: 0, decoOffset: 0, decoHex: null, decoOpacity: 100, decoSkipInk: true, // thickness / offset: 0 = auto
  decoStash: {}, // per-style color memory: { underline: { hex, opacity }, "line-through": { hex, opacity } }
  textWrap: "auto", paragraphSpacing: 0, truncate: false, truncateLines: 3,
};

const textLabel = (t) => (String(t.content ?? "").split("\n").find((l) => l.trim()) || "Text").trim();
const textName = (t) => (t.name ?? "").trim() || textLabel(t);
const readEditable = (el) => el.innerText.replace(/\n$/, "");

// Switching decoration type saves the current color under the old type and loads the new type's own
// color (null hex = "Auto"). Returns one patch for set().
function decoSwitchPatch(value, next) {
  const cur = value.decoration;
  if (!cur || cur === next) return { decoration: next };
  const stash = {
    ...(value.decoStash ?? {}),
    [cur]: { hex: value.decoHex ?? null, opacity: value.decoOpacity ?? 100 },
  };
  const loaded = stash[next] ?? { hex: null, opacity: 100 };
  return { decoration: next, decoStash: stash, decoHex: loaded.hex, decoOpacity: loaded.opacity };
}

const TEXT_DECORATIONS = [
  { value: "underline", Icon: TextUnderline },
  { value: "line-through", Icon: TextStrikethrough },
];
const TEXT_WRAPS = [
  { value: "auto", label: "Auto" },
  { value: "nowrap", label: "No wrap" },
  { value: "balance", label: "Balance" },
];

// Fill overrides Color when set. Used for the DOM text, the 3D scene and export.
const withTextFill = (item) =>
  item && item.fillHex ? { ...item, hex: item.fillHex, opacity: item.fillOpacity ?? 100 } : item;

// Cuts the content to `truncateLines` visual lines and ends the last one with an ellipsis.
// Done on the data (not CSS) so the DOM, the 3D scene and the export all see the same text.
// dims = the canvas box in on-screen px (same units as item.size and boxW).
let truncCtx;
function truncateTextItem(item, dims) {
  if (!item || !item.truncate || !dims || !item.content) return item;
  truncCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = truncCtx;
  const maxLines = Math.max(1, item.truncateLines ?? 3);
  const wrapW = item.boxW ? item.boxW * dims.w : dims.w - TEXT_PAD * 2;
  const cased = (s) => {
    if (item.textCase === "uppercase") return s.toUpperCase();
    if (item.textCase === "lowercase") return s.toLowerCase();
    if (item.textCase === "capitalize") return s.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());
    return s;
  };
  ctx.font = `${item.weight} ${item.size}px "${item.font}", sans-serif`;
  ctx.letterSpacing = `${(item.letterSpacing / 100) * item.size}px`;
  const width = (s) => ctx.measureText(cased(s)).width;
  const clip = (line) => {
    let s = line;
    while (s.length > 1 && width(`${s}…`) > wrapW) s = s.slice(0, -1).trimEnd();
    return `${s}…`;
  };

  // Visual lines: wrapped by measured width (or one per paragraph with No wrap).
  const lines = [];
  String(item.content).split("\n").forEach((para) => {
    if (item.textWrap === "nowrap") {
      lines.push(para);
      return;
    }
    let cur = "";
    para.split(/\s+/).filter(Boolean).forEach((word) => {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && width(next) > wrapW) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    });
    lines.push(cur);
  });

  // Cut at the max lines, end the last line with "…", and clip any line still wider than the box.
  const cut = lines.length > maxLines;
  const out = lines
    .slice(0, maxLines)
    .map((ln, i) => (width(ln) > wrapW || (cut && i === maxLines - 1) ? clip(ln) : ln));

  if (!cut && out.every((ln, i) => ln === lines[i])) return item; // nothing to truncate

  // Fixed lines: nowrap so the browser, 3D scene and export can't re-wrap them differently.
  return { ...item, content: out.join("\n"), textWrap: "nowrap", paragraphSpacing: 0 };
}

// What every renderer should draw: truncated, with Fill applied.
const prepText = (item, dims) => withTextFill(truncateTextItem(item, dims));

// Kerning between two letters, in px. Separate inline-blocks can't kern, so this is added back as a margin.
let kernCtx;
function kernAdjust(item, a, b) {
  if (!a || !b) return 0;
  kernCtx ??= document.createElement("canvas").getContext("2d");
  kernCtx.font = `${item.weight} ${item.size}px "${item.font}", sans-serif`;
  kernCtx.letterSpacing = "0px";
  const A = txtCase(a, item.textCase), B = txtCase(b, item.textCase);
  return kernCtx.measureText(A + B).width - kernCtx.measureText(A).width - kernCtx.measureText(B).width;
}

// anim = { spec, p } from sampleTextAnim. Without it (or with spec null) the text renders plain.
function TextLines({ item, anim }) {
  const gap = item.paragraphSpacing ?? 0;
  const plain = String(item.content ?? "")
    .split("\n")
    .map((ln, i) => (
      // fontSize: "inherit" keeps the global "12px !important" rule off these lines,
      // so they use the box's real font size, weight and letter spacing.
      <div key={i} style={{ fontSize: "inherit", marginTop: i ? gap : 0, minHeight: "1em" }}>
        {ln}
      </div>
    ));
  const spec = anim?.spec;
  if (!spec) return plain;

  const px = item.size;
  const restFill = withTextFill(item);
  const css = (u) => ({
    opacity: Math.min(1, Math.max(0, u.a)),
    transform: `translate(${(u.x / 100) * px}px, ${(u.y / 100) * px}px) rotate(${u.r}deg) scale(${u.s})`,
    filter:
      [
        u.b > 0.05 && `blur(${(u.b / 100) * px}px)`,
        u.sh > 0.5 && `drop-shadow(0 ${(u.sh / 100) * px * 0.25}px ${(u.sh / 100) * px * 0.5}px rgba(0,0,0,0.5))`,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
    color: u.c ? hexRgba(mixHex(u.c, restFill.hex, u.ce), restFill.opacity) : undefined,
    letterSpacing: u.ls ? `${((item.letterSpacing ?? 0) + u.ls) / 100}em` : undefined,
    lineHeight: u.lh ? `${item.lineHeight + u.lh}%` : undefined,
    transformOrigin: "50% 50%",
  });
  // With a mask the outer box clips the unit while the inner one moves inside it.
  const unit = (key, children, u, block, kern = 0) => {
    const box = { display: block ? "block" : "inline-block", whiteSpace: "inherit", fontSize: "inherit" };
    return (
      <span
        key={key}
        style={spec.mask ? { ...box, overflow: "hidden", verticalAlign: "top", marginLeft: kern } : { display: "contents", fontSize: "inherit" }}
      >
        <span style={{ ...css(u), ...box, marginLeft: spec.mask ? 0 : kern }}>{children}</span>
      </span>
    );
  };

  if (spec.split === "block") {
    const [u] = txtUnitStates(spec, anim.p, 1);
    return unit("blk", plain, u, true);
  }

  const tree = txtTree(item.content, spec.split);
  const st = txtUnitStates(spec, anim.p, tree.count);
  return tree.lines.map((ln, i) => (
    <div key={i} style={{ fontSize: "inherit", marginTop: i ? gap : 0, minHeight: "1em" }}>
      {spec.split === "line"
        ? unit("l", ln.text, st[ln.lineIdx], true)
        : ln.tokens.map((tk, j) => {
            if (tk.sp !== undefined) return tk.sp;
            if (tk.chars)
              return (
                <span key={j} style={{ whiteSpace: "nowrap", fontSize: "inherit" }}>
                  {tk.chars.map((c, ci) =>
                    unit(c.idx, c.ch, st[c.idx], false, ci ? kernAdjust(item, tk.chars[ci - 1].ch, c.ch) : 0)
                  )}
                </span>
              );
            if (spec.split === "word") return unit(j, tk.w, st[tk.idx], false);
            return tk.w;
          })}
    </div>
  ));
}

function TextAdvanced({ value, set, onBack, onClose, onSwatchClick, makePercentDrag, onOpenDecoration }) {
  const sectionLabel = "section-title text-[#8C8C8C] dark:text-[#9A9A9A]";
  const smallLabel = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      on ? SEG_ON : SEG_OFF
    }`;
  const headBtn = "group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors";
  const headIcon = "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors";

  return (
    <>
      <div className="flex items-center justify-between h-12 px-2 shrink-0 sticky top-0 z-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <button type="button" onClick={onBack} aria-label="Back" className={headBtn}>
          <CaretLeft size={16} weight="regular" className={headIcon} />
        </button>
        <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">Advanced Settings</span>
        <button type="button" onClick={onClose} aria-label="Close" className={headBtn}>
          <X size={16} weight="regular" className={headIcon} />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Fill */}
        <div className="flex flex-col gap-2">
          <label className={sectionLabel}>Fill</label>
          <ColorOpacityField
            hex={value.fillHex || value.hex}
            opacity={value.fillHex ? value.fillOpacity ?? 100 : value.opacity}
            labelText={value.fillHex ? undefined : "Auto"}
            onHexChange={(fillHex) => set({ fillHex: fillHex || null })}
            onOpacityChange={(o) => (value.fillHex ? set({ fillOpacity: o }) : set({ opacity: o }))}
            onSwatchClick={() => onSwatchClick("text-fill")}
            makePercentDrag={makePercentDrag}
          />
        </div>

        {/* Decoration */}
        <div className="flex flex-col gap-2">
          <ToggleRow
            heading
            muted
            label="Decoration"
            checked={!!value.decoration}
            onChange={(on) => set({ decoration: on ? value.decoration ?? "underline" : null })}
          />
          {value.decoration && (
            <div className="fx-enter flex items-center gap-2">
              <div className={`${seg} flex-1 min-w-0`}>
                {TEXT_DECORATIONS.map(({ value: v, Icon }) => (
                  <button key={v} type="button" aria-label={v} onClick={() => set(decoSwitchPatch(value, v))} className={segBtn(value.decoration === v)}>
                    <Icon size={16} weight="regular" />
                  </button>
                ))}
              </div>
              <Tooltip label="Decoration settings" placement="bottom">
                <button
                  type="button"
                  aria-label="Decoration settings"
                  onClick={onOpenDecoration}
                  className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-[10px] bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] transition-[background-color,transform] duration-150 active:scale-[0.94]"
                >
                  <CaretRight size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Transform / Wrap */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <label className={smallLabel}>Transform</label>
            <PopupDropdown value={value.textCase} options={TEXT_CASES} onChange={(textCase) => set({ textCase })} />
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <label className={smallLabel}>Wrap</label>
            <PopupDropdown value={value.textWrap ?? "auto"} options={TEXT_WRAPS} onChange={(textWrap) => set({ textWrap })} />
          </div>
        </div>

        {/* Paragraph spacing */}
        <div className="flex flex-col gap-2">
           <label className={smallLabel}>Paragraph spacing</label>
          <Scrubber compact label="" value={value.paragraphSpacing ?? 0} min={0} max={100} hardMax={400} onChange={(paragraphSpacing) => set({ paragraphSpacing })} />
        </div>

        {/* Truncate text */}
        <div className="flex flex-col gap-2">
          <ToggleRow muted label="Truncate text" checked={!!value.truncate} onChange={(truncate) => set({ truncate })} />
          {value.truncate && (
            <div className="fx-enter flex flex-col gap-2">
              <label className={smallLabel}>Max lines</label>
              <Scrubber compact label="" value={value.truncateLines ?? 3} min={1} max={20} onChange={(truncateLines) => set({ truncateLines })} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Wraps a numeric field. While Alt (Option) is held over it, the cursor becomes the horizontal
// resizer and dragging scrubs the value (Shift = 10x). Works on hover alone: the field doesn't
// need focus. Alt is read from key events (capture phase) AND from pointer events.
function ScrubWrap({ value, min, max, onChange, children }) {
  const [altHeld, setAltHeld] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const sync = (e) => setAltHeld(e.altKey);
    const clear = () => setAltHeld(false);
    window.addEventListener("keydown", sync, true);
    window.addEventListener("keyup", sync, true);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", sync, true);
      window.removeEventListener("keyup", sync, true);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const active = hovering && altHeld;

  const startDrag = (e) => {
    if (e.button !== 0 || !e.altKey) return;
    e.preventDefault(); // no focus / text selection while scrubbing
    e.stopPropagation();
    const startX = e.clientX;
    const startVal = value;
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `* { cursor: ew-resize !important; user-select: none !important; -webkit-user-select: none !important; }`;
    document.head.appendChild(styleEl);

    const onMove = (ev) => {
      const next = Math.round(startVal + (ev.clientX - startX) * (ev.shiftKey ? 10 : 1));
      onChange(Math.min(max, Math.max(min, next)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      styleEl.remove();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      onPointerEnter={(e) => {
        setHovering(true);
        setAltHeld(e.altKey);
      }}
      onPointerMove={(e) => {
        if (e.altKey !== altHeld) setAltHeld(e.altKey);
      }}
      onPointerLeave={() => setHovering(false)}
      onPointerDownCapture={startDrag}
      className={active ? "[&_*]:!cursor-ew-resize" : ""}
    >
      {children}
    </div>
  );
}

const DECO_STYLES = [
  { value: "solid", label: "Solid" },
  { value: "double", label: "Double" },
  { value: "dotted", label: "Dotted" },
  { value: "dashed", label: "Dashed" },
  { value: "wavy", label: "Wavy" },
];

function TextDecoration({ value, set, onBack, onClose, onSwatchClick, makePercentDrag }) {
  const isUnder = value.decoration !== "line-through";
  const smallLabel = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      on ? SEG_ON : SEG_OFF
    }`;
  const headBtn = "group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors";
  const headIcon = "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors";

  return (
    <>
      <div className="flex items-center justify-between h-12 px-2 shrink-0 sticky top-0 z-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <button type="button" onClick={onBack} aria-label="Back" className={headBtn}>
          <CaretLeft size={16} weight="regular" className={headIcon} />
        </button>
        <span>
          <span className="section-title text-[#8C8C8C] dark:text-[#9A9A9A]">Decoration / </span>
          <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{isUnder ? "Underline" : "Strikethrough"}</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className={headBtn}>
          <X size={16} weight="regular" className={headIcon} />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Type */}
        <div className="flex flex-col gap-2">
          <label className={smallLabel}>Type</label>
          <div className={seg}>
            {TEXT_DECORATIONS.map(({ value: v, Icon }) => (
              <button key={v} type="button" aria-label={v} onClick={() => set(decoSwitchPatch(value, v))} className={segBtn(value.decoration === v)}>
                <Icon size={16} weight="regular" />
              </button>
            ))}
          </div>
        </div>

        {/* Style (underline only) */}
        {isUnder && (
          <div className="fx-enter flex flex-col gap-2">
            <label className={smallLabel}>Style</label>
            <PopupDropdown value={value.decoStyle ?? "solid"} options={DECO_STYLES} onChange={(decoStyle) => set({ decoStyle })} />
          </div>
        )}

        {/* Color */}
        <div className="flex flex-col gap-2">
          <label className={smallLabel}>Color</label>
          <ColorOpacityField
            hex={value.decoHex || value.hex}
            opacity={value.decoHex ? value.decoOpacity ?? 100 : value.opacity}
            labelText={value.decoHex ? undefined : "Auto"}
            onHexChange={(decoHex) => set({ decoHex: decoHex || null })}
            onOpacityChange={(o) => (value.decoHex ? set({ decoOpacity: o }) : set({ opacity: o }))}
            onSwatchClick={() => onSwatchClick("text-deco")}
            makePercentDrag={makePercentDrag}
          />
        </div>

        {/* Thickness */}
        <div className="flex flex-col gap-2">
          <label className={smallLabel}>Thickness</label>
          <Scrubber compact label="" autoLabel="Auto" value={value.decoThickness ?? 0} min={0} max={20} hardMax={100} onChange={(decoThickness) => set({ decoThickness })} />
        </div>

        {/* Offset + Skip ink (underline only) */}
        {isUnder && (
          <>
            <div className="fx-enter flex flex-col gap-2">
              <label className={smallLabel}>Offset</label>
              <Scrubber compact label="" autoLabel="Auto" value={value.decoOffset ?? 0} min={0} max={40} hardMax={200} onChange={(decoOffset) => set({ decoOffset })} />
            </div>
            <div className="fx-enter">
              <ToggleRow muted label="Skip ink" checked={value.decoSkipInk !== false} onChange={(decoSkipInk) => set({ decoSkipInk })} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function TextPopup({ popupRef, anchorRef, toolbarRef, value, onChange, onClose, onSwatchClick, makePercentDrag }) {
  const [pos, setPos] = useState(null);
  const fileRef = useRef(null);
  const [advanced, setAdvanced] = useState(false);
  const [decoOpen, setDecoOpen] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });

  const [linkWH, setLinkWH] = useState(false); // lock: keep the width / height ratio

  // Measure the real text box on the canvas, in px.
  const [boxPx, setBoxPx] = useState({ w: 0, h: 0, cw: 1, ch: 1 });
  useEffect(() => {
    const el = document.querySelector(`[data-text-box="${value.id}"]`);
    const wrap = el?.parentElement;
    if (!el || !wrap) return;
    const update = () =>
      setBoxPx({ w: Math.round(el.offsetWidth), h: Math.round(el.offsetHeight), cw: wrap.clientWidth || 1, ch: wrap.clientHeight || 1 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [value.id, value.content, value.size, value.boxW, value.boxH, value.font, value.weight, value.lineHeight, value.letterSpacing]);

  const isFixed = value.boxH != null;
  const autoWidthMode = value.boxW == null;
  const autoHeightMode = value.boxW != null && value.boxH == null;
  const curW = value.boxW != null ? value.boxW * boxPx.cw : boxPx.w;

  // boxH is never touched here, so Auto width -> Auto height, and Auto height keeps its auto height.
  // Only Fixed size can use the ratio lock.
  const setW = (px) => {
    const w = Math.max(1, px);
    if (isFixed && linkWH) {
      const h = (w * boxPx.h) / Math.max(1, boxPx.w);
      set({ boxW: w / boxPx.cw, boxH: h / boxPx.ch });
    } else {
      set({ boxW: w / boxPx.cw });
    }
  };

  // Editing H only changes the height. The top edge stays where it is, because the box is
  // anchored by its position preset (middle / bottom would otherwise grow around the anchor
  // and move the text). Width stays as it was, unless the ratio lock is on.
  const setH = (px) => {
    const h = Math.max(1, px);
    const [v, hz] = value.position.split("");
    const shiftY = v === "m" ? (h - boxPx.h) / 2 : v === "b" ? h - boxPx.h : 0;
    const patch = { boxH: h / boxPx.ch, dy: (value.dy ?? 0) + shiftY / boxPx.ch };
    if (isFixed && linkWH) {
      const w = (h * boxPx.w) / Math.max(1, boxPx.h);
      const shiftX = hz === "c" ? (w - boxPx.w) / 2 : hz === "r" ? w - boxPx.w : 0;
      patch.boxW = w / boxPx.cw;
      patch.dx = (value.dx ?? 0) + shiftX / boxPx.cw; // keep the left edge fixed too
    }
    set(patch);
  };

  const [distMenu, setDistMenu] = useState(null); // { right, top }
  useEffect(() => {
    if (!distMenu) return;
    const onDown = (e) => {
      if (!e.target.closest?.("[data-text-dist-menu],[data-text-dist-trigger]")) setDistMenu(null);
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // close just the menu, not the whole Text popup
      setDistMenu(null);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [distMenu]);

  // 4px left of the toolbar, bottom edge aligned with the toolbar's bottom edge.
  useLayoutEffect(() => {
    const update = () => {
      const t = toolbarRef.current?.getBoundingClientRect();
      if (!t) return;
      setPos({
        bottom: window.innerHeight - t.bottom,
        right: window.innerWidth - t.left + 4,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [advanced]);

  useEffect(() => {
    const onDown = (e) => {
      const t = e.target;
      if (popupRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      if (t.closest?.("[data-popup-dropdown],[data-color-picker-popup],[data-color-picker-trigger],[data-text-box],[data-text-row]")) return;
      onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const onFontFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const family = file.name.replace(/\.[^.]+$/, "");
    try {
      const face = new FontFace(family, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      set({ font: family, customFonts: [...value.customFonts.filter((f) => f !== family), family] });
    } catch (err) {
      console.error("Custom font failed to load:", err);
    }
  };

  const heading = "section-title text-[13px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA]";
  const label = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const section = "flex flex-col gap-3 p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10";
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      on ? SEG_ON : SEG_OFF
    }`;
  const fonts = [...TEXT_FONTS, ...value.customFonts.map((v) => ({ value: v, label: v }))];

  // Align buttons map onto the existing 9-point position (e.g. "tl", "mc", "br").
  const ALIGN_TO_POS = {
    left: ["h", "l"], hcenter: ["h", "c"], right: ["h", "r"],
    top: ["v", "t"], vcenter: ["v", "m"], bottom: ["v", "b"],
  };
  const alignText = (key) => {
    const [axis, ch] = ALIGN_TO_POS[key];
    const [v, h] = value.position.split("");
    set(axis === "h" ? { position: v + ch, dx: 0 } : { position: ch + h, dy: 0 });
  };
   const isAligned = (key) => {
    const [axis, ch] = ALIGN_TO_POS[key];
    const offset = (axis === "h" ? value.dx : value.dy) ?? 0;
    return value.position[axis === "h" ? 1 : 0] === ch && Math.abs(offset) < 0.001;
  };

  const autoWidth = value.boxW == null;

  const shellStyle = {
    position: "fixed",
    bottom: pos?.bottom ?? 0,
    right: pos?.right ?? 0,
    visibility: pos ? "visible" : "hidden",
    maxHeight: "82vh",
  };
  const shellClass =
    "panel-enter w-[300px] flex flex-col overflow-y-auto custom-scroll bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]";

  if (advanced && decoOpen) {
    return (
      <div ref={popupRef} style={shellStyle} className={shellClass}>
        <TextDecoration
          value={value}
          set={set}
          onBack={() => setDecoOpen(false)}
          onClose={onClose}
          onSwatchClick={onSwatchClick}
          makePercentDrag={makePercentDrag}
        />
      </div>
    );
  }

  if (advanced) {
    return (
      <div ref={popupRef} style={shellStyle} className={shellClass}>
        <TextAdvanced
          value={value}
          set={set}
          onBack={() => setAdvanced(false)}
          onClose={onClose}
          onSwatchClick={onSwatchClick}
          makePercentDrag={makePercentDrag}
          onOpenDecoration={() => setDecoOpen(true)}
        />
      </div>
    );
  }

  return (
    <div ref={popupRef} style={shellStyle} className={shellClass}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 pl-4 pr-2 shrink-0 sticky top-0 z-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">Text</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>

      {/* Position */}
      <div className={section}>
        <span className={heading}>Position</span>
        <div className="flex items-center justify-between">
{ALIGN_ACTIONS.map(({ key, label: tip, Icon }, i) => {
            return (
              <React.Fragment key={key}>
                {i === 3 && <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />}
                <Tooltip label={tip} placement="bottom">
                  <button
                    type="button"
                    aria-label={tip}
                    onClick={() => alignText(key)}
                    className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                  >
                    <Icon
                      size={16}
                      weight="regular"
                      className={`transition-colors ${
                        isAligned(key)
                          ? "text-[#FF47BC]"
                          : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                      }`}
                    />
                  </button>
                </Tooltip>
              </React.Fragment>
            );
          })}
          <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
          <button
            type="button"
            data-text-dist-trigger
            aria-label="Distribute"
            aria-haspopup="menu"
            aria-expanded={!!distMenu}
            onClick={(e) => {
              if (distMenu) return setDistMenu(null);
              const r = e.currentTarget.getBoundingClientRect();
              setDistMenu({ right: window.innerWidth - r.right, top: r.bottom + 4 });
            }}
            className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-[background-color,transform] duration-150 active:scale-[0.94] ${
              distMenu ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Rows size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
        </div>
      </div>

      {/* Size */}
      <div className={`${section} !gap-2`}>
        <span className={heading}>Size</span>

        <div className="flex items-center gap-1">
          <div className="flex flex-1 min-w-0 items-center gap-2">
            <OffsetField label="W" value={boxPx.w} onChange={setW} dimmed={autoWidthMode} />
            <OffsetField label="H" value={boxPx.h} onChange={setH} dimmed={value.boxH == null} />
          </div>
          <Tooltip label={linkWH ? "Unlock aspect ratio" : "Lock aspect ratio"} placement="bottom">
            <button
              type="button"
              aria-label="Lock aspect ratio"
              aria-pressed={linkWH}
              onClick={() => setLinkWH((v) => !v)}
              className="group flex items-center justify-center w-7 h-7 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
            >
              {linkWH ? (
                <LockSimple size={16} weight="regular" className="text-[#FF47BC]" />
              ) : (
                <LockSimpleOpen size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
              )}
            </button>
          </Tooltip>
        </div>

        <div className={seg}>
          <Tooltip label="Auto width" placement="bottom" className="flex-1">
            <button
              type="button"
              aria-label="Auto width"
              onClick={() => set({ boxW: null, boxH: null })}
              className={`${segBtn(value.boxW == null && value.boxH == null)} w-full`}
            >
              <ArrowsHorizontal size={16} weight="regular" />
            </button>
          </Tooltip>
          <Tooltip label="Auto height" placement="bottom" className="flex-1">
            <button
              type="button"
              aria-label="Auto height"
         onClick={() => set({ boxW: value.boxW ?? boxPx.w / boxPx.cw, boxH: null })}
              className={`${segBtn(value.boxW != null && value.boxH == null)} w-full`}
            >
              <ArrowsVertical size={16} weight="regular" />
            </button>
          </Tooltip>
          <Tooltip label="Fixed size" placement="bottom" className="flex-1">
            <button
              type="button"
              aria-label="Fixed size"
              onClick={() => set({ boxW: value.boxW ?? boxPx.w / boxPx.cw, boxH: value.boxH ?? boxPx.h / boxPx.ch })}
              className={`${segBtn(value.boxH != null)} w-full`}
            >
              <CornersOut size={16} weight="regular" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Type */}
      <div className={section}>
        <span className={heading}>Type</span>
        <div className="flex flex-col gap-4">
          <SocialField label="Content" value={value.content} onChange={(v) => set({ content: v })} full multiline />

          <div className="flex flex-col gap-2">
            <label className={label}>Font</label>
            <div className="flex items-start gap-1">
              <div className="flex-1 min-w-0">
                <PopupDropdown value={value.font} options={fonts} onChange={(font) => set({ font })} />
              </div>
              <Tooltip label="Upload custom font" placement="bottom">
                <button
                  type="button"
                  aria-label="Upload custom font"
                  onClick={() => fileRef.current?.click()}
                  className={`${DROPDOWN_TRIGGER} w-8 shrink-0 !justify-center !px-0`}
                >
                  <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                </button>
              </Tooltip>
            </div>
            <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2" onChange={onFontFile} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 min-w-0">
              <label className={label}>Weight</label>
              <PopupDropdown value={value.weight} options={TEXT_WEIGHTS} onChange={(weight) => set({ weight })} />
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <label className={label}>Size</label>
              <ScrubWrap value={value.size} min={1} max={2000} onChange={(size) => set({ size })}>
                <OffsetField unit="px" value={value.size} min={1} max={2000} className="h-8" onChange={(size) => set({ size })} />
              </ScrubWrap>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <label className={label}>Line height</label>
              <ScrubWrap value={value.lineHeight} min={50} max={1000} onChange={(lineHeight) => set({ lineHeight })}>
                <OffsetField unit="%" value={value.lineHeight} min={50} max={1000} className="h-8" onChange={(lineHeight) => set({ lineHeight })} />
              </ScrubWrap>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <label className={label}>Letter spacing</label>
              <ScrubWrap value={value.letterSpacing} min={-20} max={100} onChange={(letterSpacing) => set({ letterSpacing })}>
                <OffsetField unit="%" value={value.letterSpacing} min={-20} max={100} className="h-8" onChange={(letterSpacing) => set({ letterSpacing })} />
              </ScrubWrap>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={label}>Color</label>
            <ColorOpacityField
              hex={value.hex}
              opacity={value.opacity}
              onHexChange={(hex) => set({ hex })}
              onOpacityChange={(opacity) => set({ opacity })}
              onSwatchClick={() => onSwatchClick("text")}
              makePercentDrag={makePercentDrag}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={label}>Alignment</label>
            <div className={seg}>
              {TEXT_ALIGNS.map(({ value: v, Icon }) => (
                <button key={v} type="button" aria-label={`Align ${v}`} onClick={() => set({ align: v })} className={segBtn(value.align === v)}>
                  <Icon size={16} weight="regular" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Z index</label>
            <Scrubber
              compact
              label=""
              value={value.zIndex ?? (value.layer === "behind" ? 0 : 1)}
              min={0}
              max={100}
              onChange={(zIndex) => set({ zIndex, layer: zIndex > 0 ? "front" : "behind" })}
            />
          </div>
        </div>
      </div>

      {/* Advanced settings */}
      <div className="p-4">
        <button type="button" onClick={() => setAdvanced(true)} className="group flex items-center gap-2 w-full select-none">
          <CaretRight size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          <span className="section-title text-[14px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA]">Advanced settings</span>
        </button>
      </div>

      {distMenu &&
        createPortal(
          <div
            data-text-dist-menu
            data-popup-dropdown
            role="menu"
            style={{ position: "fixed", right: distMenu.right, top: distMenu.top }}
            className="pop-enter w-max p-2 flex flex-col gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
          >
            {[
              { axis: "v", label: "Distribute vertical spacing", keys: [ALT, "⇧", "V"], Icon: Rows },
              { axis: "h", label: "Distribute horizontal spacing", keys: [ALT, "⇧", "H"], Icon: Columns },
            ].map(({ axis, label: tip, keys, Icon }) => (
              <button
                key={axis}
                type="button"
                disabled
                onClick={() => setDistMenu(null)}
                className="flex items-center justify-between w-full h-8 pl-2 pr-2 gap-4 rounded-lg text-[12px] font-medium tracking-[-0.005em] whitespace-nowrap text-[#3A3A3A] dark:text-[#FAF9FA] enabled:hover:bg-[#F2F2F2] dark:enabled:hover:bg-[#1F1F1F] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <Icon size={14} weight="regular" className="shrink-0" />
                  {tip}
                </span>
                <KeyCombo keys={keys} />
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

// ---------- Text on canvas: layout helpers ----------
const TEXT_PAD = 24; // must match the padding in paintTextItem (MockupScene.jsx)
const TEXT_SNAP = 6; // px

function useBoxSize(ref) {
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setSize((p) => (p && p.w === el.clientWidth && p.h === el.clientHeight ? p : { w: el.clientWidth, h: el.clientHeight }));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const textFlexAlign = (item) => {
  const [v, h] = item.position.split("");
  return {
    alignItems: { t: "flex-start", m: "center", b: "flex-end" }[v],
    justifyContent: { l: "flex-start", c: "center", r: "flex-end" }[h],
  };
};

const textBlockStyle = (item, dims, color) => ({
  fontFamily: `"${item.font}", sans-serif`,
  fontWeight: item.weight,
  fontSize: item.size,
  lineHeight: `${item.lineHeight}%`,
  letterSpacing: `${item.letterSpacing / 100}em`,
  textTransform: item.textCase,
  textAlign: item.align,
  color,
  whiteSpace: item.textWrap === "nowrap" ? "pre" : "pre-wrap",
  textWrap: item.textWrap === "balance" ? "balance" : undefined,
  textDecoration: item.decoration ?? "none",
  textDecorationStyle: item.decoration === "underline" ? item.decoStyle ?? "solid" : "solid",
  textDecorationThickness: item.decoThickness ? `${item.decoThickness}px` : "auto",
  textUnderlineOffset: item.decoration === "underline" && item.decoOffset ? `${item.decoOffset}px` : "auto",
  textDecorationSkipInk: item.decoration === "underline" && item.decoSkipInk === false ? "none" : "auto",
  // behind-layer text is drawn by the 3D scene, so the editor overlay must stay invisible
  textDecorationColor: item.decoHex && color !== "transparent" ? hexRgba(item.decoHex, item.decoOpacity ?? 100) : undefined,
  width: item.boxW ? item.boxW * dims.w : undefined,
  height: item.boxH ? item.boxH * dims.h : undefined,
  maxWidth: item.boxW ? "none" : "100%",
  flexShrink: item.boxW || item.boxH ? 0 : undefined,
  transform: `translate(${(item.dx ?? 0) * dims.w}px, ${(item.dy ?? 0) * dims.h}px)`,
});

// Closest snap of a box (start pos + size) to the canvas margins / center on one axis.
function snapAxis(pos, size, limit) {
  let best = null;
  [
    [TEXT_PAD - pos, TEXT_PAD],
    [limit / 2 - (pos + size / 2), limit / 2],
    [limit - TEXT_PAD - (pos + size), limit - TEXT_PAD],
  ].forEach(([d, line]) => {
    if (Math.abs(d) < TEXT_SNAP && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, line };
  });
  return best;
}

// Visual-only text layers (used for "behind" text in Frame mode, under the frames).
function TextOverlayOne({ item, vidAnim }) {
  const ref = useRef(null);
  const itemRef = useRef(item);
  itemRef.current = item;
  const dims = useBoxSize(ref);
  const [, setAnimTick] = useState(0);
  useEffect(() => {
    if (!vidAnim) return;
    let raf, last = null;
    const loop = () => {
      const t = vidAnim.timeRef.current;
      if (t !== last) {
        last = t;
        if (vidAnim.getTexts().some((c) => c.tid === itemRef.current.id)) setAnimTick((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [vidAnim]);
  const animState = vidAnim ? sampleTextAnim(vidAnim.getTexts(), item.id, vidAnim.timeRef.current) : undefined;
  const shown = truncateTextItem(item, dims);
  const fill = withTextFill(shown);
  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden flex p-6" style={textFlexAlign(item)}>
      {dims && animState !== null && (
        <div style={textBlockStyle(shown, dims, hexRgba(fill.hex, fill.opacity))}>
          <TextLines item={shown} anim={animState ?? undefined} />
        </div>
      )}
    </div>
  );
}

function TextOverlay({ items, layer, vidAnim }) {
  return items
    .filter((t) => t.layer === layer && t.visible !== false && t.content)
    .map((t) => <TextOverlayOne key={t.id} item={t} vidAnim={vidAnim} />);
}

// Interactive text: drag to move (with alignment lines), handles to resize.
// Draws the text itself for front text. For behind text it only draws the selection box,
// since the text is drawn under the device (3D scene in Mockup mode, TextOverlay in Frame mode).
function TextEditor({ item, selected, onSelect, onChange, onDuplicate, isOccluded, autoEdit, onEditStarted, onRemove, vidAnim }) {
  const wrapRef = useRef(null);
  const boxRef = useRef(null);
  const editRef = useRef(null);
  const editStartRef = useRef(0);
  const [editing, setEditing] = useState(false);
  const itemRef = useRef(item);
  itemRef.current = item;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDuplicateRef = useRef(onDuplicate);
  onDuplicateRef.current = onDuplicate;
  const isOccludedRef = useRef(isOccluded);
  isOccludedRef.current = isOccluded;
  const startMoveRef = useRef(null);
  const pinRef = useRef(null); // while resizing: a point on the box that must stay put
  const [guides, setGuides] = useState({ x: null, y: null });
  const dims = useBoxSize(wrapRef);

  // Video mode: re-render this layer when the playhead moves, but only if it has clips.
  const [, setAnimTick] = useState(0);
  useEffect(() => {
    if (!vidAnim) return;
    let raf, last = null;
    const loop = () => {
      const t = vidAnim.timeRef.current;
      if (t !== last) {
        last = t;
        if (vidAnim.getTexts().some((c) => c.tid === itemRef.current.id)) setAnimTick((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [vidAnim]);
  const animState = vidAnim && !editing ? sampleTextAnim(vidAnim.getTexts(), item.id, vidAnim.timeRef.current) : undefined;

  // Deselecting the layer ends inline editing.
  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

    useEffect(() => {
    if (!autoEdit) return;
    setEditing(true);
    onEditStarted?.();
  }, [autoEdit]);

  // Entering edit mode: load the raw text, focus, select all.
  useLayoutEffect(() => {
    if (!editing) return;
    const el = editRef.current;
    if (!el) return;
    el.textContent = itemRef.current.content ?? "";
    editStartRef.current = performance.now();
    const focusIt = () => {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range); // this line was missing: without it there's no caret and typing does nothing
    };
    focusIt();
    // retry once in case the Text popup mounting grabs focus
    const t = setTimeout(() => {
      if (document.activeElement !== el) focusIt();
    }, 50);
    return () => clearTimeout(t);
  }, [editing, !!dims]);

  const live = !!item && (!!item.content || editing);
  const front = live && item.layer === "front";
  // Behind text can't be hit-tested through the device, so it's only grabbable while selected.
  const interactive = live && (front || selected);

  // Resizing changes the box size, and the layout anchor (position preset) would shift it.
  // After each render, measure where the pinned point ended up and nudge the offset to correct it.
  useLayoutEffect(() => {
    const pin = pinRef.current;
    const el = boxRef.current;
    const wrap = wrapRef.current;
    if (!pin || !el || !wrap || !dims) return;
    const r = el.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    const errX = r.left - wr.left + pin.fx * r.width - pin.x;
    const errY = r.top - wr.top + pin.fy * r.height - pin.y;
    if (Math.abs(errX) < 0.5 && Math.abs(errY) < 0.5) return;
    const it = itemRef.current;
    onChangeRef.current({ dx: (it.dx ?? 0) - errX / dims.w, dy: (it.dy ?? 0) - errY / dims.h });
  });

  const startMove = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest?.("[data-text-handle]")) return; // handles have their own handler
    onSelect();
    const wr = wrapRef.current.getBoundingClientRect();
    const r = boxRef.current.getBoundingClientRect();
    const W = wr.width, H = wr.height;
    const left0 = r.left - wr.left, top0 = r.top - wr.top;
    const start = itemRef.current;
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    const dupMode = e.altKey; // Alt-drag leaves a copy behind
    let duplicated = false;

    const onMove = (ev) => {
      let dx = ev.clientX - x0;
      let dy = ev.clientY - y0;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      if (dupMode && !duplicated) {
        duplicated = true;
        onDuplicateRef.current?.(); // copy stays at the start position, this layer keeps moving
      }
      const sx = snapAxis(left0 + dx, r.width, W);
      const sy = snapAxis(top0 + dy, r.height, H);
      if (sx) dx += sx.d;
      if (sy) dy += sy.d;
      setGuides({ x: sx ? sx.line : null, y: sy ? sy.line : null });
      onChangeRef.current({ dx: (start.dx ?? 0) + dx / W, dy: (start.dy ?? 0) + dy / H });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setGuides({ x: null, y: null });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

    startMoveRef.current = startMove;

  // Behind text sits under the device, so its box ignores pointer events. This catches a click
  // that lands inside the box on an area the frame / device isn't covering, and starts the move.
  useEffect(() => {
    const onDown = (e) => {
      const it = itemRef.current;
      if (e.button !== 0 || !it || it.layer !== "behind" || !it.content) return;
      const box = boxRef.current;
      const wrap = wrapRef.current;
      if (!box || !wrap?.parentElement?.contains(e.target)) return;
      if (box.contains(e.target)) return; // selected: the box handles it itself
      if (e.target.closest?.("[data-text-box],[data-text-handle],[data-handle],[data-text-tool],button")) return;
      const r = box.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      if (isOccludedRef.current?.(e)) return;
      e.stopImmediatePropagation(); // keeps the canvas drag / marquee from also starting
      startMoveRef.current?.(e);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);

  const startResize = (key) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const wr = wrapRef.current.getBoundingClientRect();
    const r = boxRef.current.getBoundingClientRect();
    const W = wr.width;
    const L0 = r.left - wr.left, T0 = r.top - wr.top;
    const W0 = r.width, H0 = r.height;
    const R0 = L0 + W0, B0 = T0 + H0, CX = L0 + W0 / 2;
    const start = itemRef.current;

    // Scaling text: font size and box width change together so line breaks stay the same.
    const scale = (k, p) => {
      const size = Math.min(2000, Math.max(1, Math.round(start.size * Math.max(0.02, k))));
      return { patch: { size, boxW: (W0 * (size / start.size)) / W }, pin: p };
    };

    const onMove = (ev) => {
      const px = ev.clientX - wr.left;
      const py = ev.clientY - wr.top;

      // Fixed size: every handle only changes the box width / height. Font size stays the same.
      // Top / bottom handles always behave this way, even on auto height, so dragging them
      // changes the height only and never scales the text.
      if (start.boxH != null || key === "n" || key === "s") {
        const east = key.includes("e"), west = key.includes("w");
        const south = key.includes("s"), north = key.includes("n");
        const patch = {};
        if (east || west) patch.boxW = Math.max(24, east ? px - L0 : R0 - px) / W;
        if (north || south) patch.boxH = Math.max(12, south ? py - T0 : B0 - py) / wr.height;
        pinRef.current = {
          fx: east ? 0 : west ? 1 : 0.5,
          fy: south ? 0 : north ? 1 : 0.5,
          x: east ? L0 : west ? R0 : CX,
          y: south ? T0 : north ? B0 : T0 + H0 / 2,
        };
        onChangeRef.current(patch);
        return;
      }

      let out;
      if (key.length === 2) {
        // Corners scale the text; the opposite corner stays fixed (width drives, like frames).
        const east = key.includes("e"), south = key.includes("s");
        const newW = east ? px - L0 : R0 - px;
        out = scale(newW / W0, { fx: east ? 0 : 1, fy: south ? 0 : 1, x: east ? L0 : R0, y: south ? T0 : B0 });
      } else if (key === "e" || key === "w") {
        // Sides change the wrap width only.
        const newW = key === "e" ? px - L0 : R0 - px;
        out = {
          patch: { boxW: Math.max(24, newW) / W },
          pin: { fx: key === "e" ? 0 : 1, fy: 0, x: key === "e" ? L0 : R0, y: T0 },
        };
      } else {
        // Top / bottom scale the text around the horizontal center.
        const newH = key === "s" ? py - T0 : B0 - py;
        out = scale(newH / H0, { fx: 0.5, fy: key === "s" ? 0 : 1, x: CX, y: key === "s" ? T0 : B0 });
      }
      pinRef.current = out.pin;
      onChangeRef.current(out.patch);
    };
    const onUp = () => {
      pinRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const shown = editing ? item : truncateTextItem(item, dims);
  const fill = withTextFill(item);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 pointer-events-none flex p-6"
      style={{ ...textFlexAlign(item), zIndex: 10 + Math.min(9, item.zIndex ?? 1) }}
    >
      {live && dims && (
        <div
          ref={boxRef}
          data-text-box={item.id}
          onPointerDown={interactive && !editing ? startMove : undefined}
          onDoubleClick={
            interactive
              ? () => {
                  onSelect();
                  setEditing(true);
                }
              : undefined
          }
          className={`relative touch-none ${editing ? "" : "select-none"}`}
          style={{
            ...textBlockStyle(editing ? item : shown, dims, front || editing ? hexRgba(fill.hex, fill.opacity) : "transparent"),
            pointerEvents: interactive && animState !== null ? "auto" : "none",
            visibility: animState === null ? "hidden" : undefined, // outside its clip
            cursor: editing ? "text" : interactive ? "move" : undefined,
            outline: selected ? "1px solid #FF47BC" : undefined,
          }}
        >
          {editing ? (
            <div
              ref={editRef}
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              spellCheck={false}
              onInput={(e) => onChangeRef.current({ content: readEditable(e.currentTarget) })}
              onBlur={() => {
                // a blur right after editing starts is focus being stolen, not the user clicking away
                if (performance.now() - editStartRef.current < 150) {
                  setTimeout(() => editRef.current?.focus(), 0);
                  return;
                }
                setEditing(false);
                if (!String(itemRef.current.content ?? "").trim()) onRemove?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation(); // end editing without also closing the Text popup
                  e.currentTarget.blur();
                }
              }}
              style={{ fontSize: "inherit", outline: "none", minHeight: "1em", minWidth: "1ch" }}
            />
          ) : (
            <TextLines item={shown} anim={animState ?? undefined} />
          )}
          {selected && !editing &&
            RESIZE_HANDLES.map(([key, x, y, cursor]) => (
              <div
                key={key}
                data-text-handle
                onPointerDown={startResize(key)}
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-white border border-[#FF47BC]"
                style={{ left: `${x}%`, top: `${y}%`, cursor, pointerEvents: "auto" }}
              />
            ))}
        </div>
      )}

      {/* Alignment lines, shown while a drag is snapped to the canvas center or margins */}
      {guides.x !== null && (
        <div className="absolute top-0 bottom-0 w-px bg-[#FF47BC] pointer-events-none" style={{ left: guides.x }} />
      )}
      {guides.y !== null && (
        <div className="absolute left-0 right-0 h-px bg-[#FF47BC] pointer-events-none" style={{ top: guides.y }} />
      )}
    </div>
  );
}

// Ease-in-out curve with end points, drawn on Phosphor's 256 grid so it matches the other icons.
function EaseIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M40 216C136 216 120 40 216 40" />
      <circle cx="40" cy="216" r="4" fill="currentColor" />
      <circle cx="216" cy="40" r="4" fill="currentColor" />
    </svg>
  );
}

// Curve path + mappers for a given easing fn. Y range grows to include overshoot.
function easeGeom(fn, w, h, pad = 6) {
  const N = 48, ys = [];
  for (let i = 0; i <= N; i++) ys.push(fn(i / N));
  const lo = Math.min(0, ...ys), hi = Math.max(1, ...ys);
  const X = (x) => pad + x * (w - 2 * pad);
  const Y = (y) => h - pad - ((y - lo) / (hi - lo)) * (h - 2 * pad);
  const d = ys.map((y, i) => `${i ? "L" : "M"}${X(i / N).toFixed(1)} ${Y(y).toFixed(1)}`).join("");
  return { d, X, Y };
}

// Large looping preview: dot rides the curve, ball travels a track with the same easing
function EasePreview({ fn }) {
  const W = 252, H = 84;
  const geo = easeGeom(fn, W, H, 10);
  const dot = useRef(null);
  const ball = useRef(null);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const T = 1600, HOLD = 350, CYCLE = T + HOLD * 2;
    const loop = (now) => {
      const u = vidClamp((((now - t0) % CYCLE) - HOLD) / T, 0, 1);
      const y = fn(u);
      dot.current?.setAttribute("cx", geo.X(u));
      dot.current?.setAttribute("cy", geo.Y(y));
      ball.current?.setAttribute("cx", 28 + y * (W - 56));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fn]);
  return (
    <div className="rounded-[10px] bg-[#F0F0F0] dark:bg-[#1F1F1F] p-2">
      <svg viewBox={`0 0 ${W} 112`} className="w-full block overflow-visible">
        <line x1="10" x2={W - 10} y1={geo.Y(0)} y2={geo.Y(0)} stroke="#8C8C8C" strokeOpacity="0.35" strokeDasharray="3 3" />
        <line x1="10" x2={W - 10} y1={geo.Y(1)} y2={geo.Y(1)} stroke="#8C8C8C" strokeOpacity="0.35" strokeDasharray="3 3" />
        <path d={geo.d} fill="none" stroke="#FF47BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle ref={dot} r="4" cx={geo.X(0)} cy={geo.Y(0)} fill="#FAF9FA" stroke="#FF47BC" strokeWidth="2" />
        <line x1="28" x2={W - 28} y1="102" y2="102" stroke="#8C8C8C" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        <circle ref={ball} r="5" cx="28" cy="102" fill="#FF47BC" />
      </svg>
    </div>
  );
}

// Preset row: small static curve icon + name. The big preview at the top handles the animation.
function EaseRow({ spec, label, active, onClick, onEdit }) {
  const fn = vidEaseFn(spec);
  const S = 16;
  const geo = easeGeom(fn, S, S, 2.5);
  const ref = useRef(null);
  // bring the selected row into view when the list opens
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <div
      ref={ref}
      className={`group flex items-center w-full h-8 rounded-lg transition-colors duration-100 ${
        active
          ? "bg-[#FF47BC]/10 text-[#FF47BC]"
          : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
      }`}
    >
      <button type="button" onClick={onClick} className="flex items-center flex-1 min-w-0 h-full gap-2 pl-2 text-left">
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} fill="none" className="shrink-0 overflow-visible">
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="1.5 1.5" />
          <path d={geo.d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flex-1 min-w-0 truncate leading-4">{label}</span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`flex items-center justify-center h-6 px-2 mr-1 shrink-0 rounded-md leading-4 hover:bg-black/5 dark:hover:bg-white/10 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
            active ? "opacity-100" : "opacity-0"
          }`}
        >
          Edit
        </button>
      )}
    </div>
  );
}

// Draggable cubic-bezier editor + numeric fields
function EaseBezierEditor({ p, onChange }) {
  const svgRef = useRef(null);
  const VW = 252, VH = 200, X0 = 16, PW = 220, Y0 = 12, PH = 176;
  const X = (x) => X0 + x * PW;
  const Y = (y) => Y0 + PH - ((y + 0.5) / 2) * PH;
  const drag = (idx) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const move = (ev) => {
      const r = svgRef.current.getBoundingClientRect();
      const k = VW / r.width;
      const x = vidClamp(((ev.clientX - r.left) * k - X0) / PW, 0, 1);
      const y = vidClamp((2 * (Y0 + PH - (ev.clientY - r.top) * k)) / PH - 0.5, -0.5, 1.5);
      const next = [...p];
      next[idx * 2] = +x.toFixed(2);
      next[idx * 2 + 1] = +y.toFixed(2);
      onChange(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const inputCls =
    "h-8 w-full px-2 rounded-[10px] bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] border border-transparent focus:border-[#FF47BC] outline-none text-[#3A3A3A] dark:text-[#FAF9FA] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-[10px] bg-[#F0F0F0] dark:bg-[#1F1F1F] p-2">
        <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full block touch-none select-none">
          <rect x={X(0)} y={Y(1)} width={PW} height={Y(0) - Y(1)} fill="none" stroke="#8C8C8C" strokeOpacity="0.35" strokeDasharray="3 3" />
          <line x1={X(0)} y1={Y(0)} x2={X(p[0])} y2={Y(p[1])} stroke="#FF47BC" strokeOpacity="0.5" />
          <line x1={X(1)} y1={Y(1)} x2={X(p[2])} y2={Y(p[3])} stroke="#FF47BC" strokeOpacity="0.5" />
          <path
            d={`M${X(0)} ${Y(0)} C${X(p[0])} ${Y(p[1])}, ${X(p[2])} ${Y(p[3])}, ${X(1)} ${Y(1)}`}
            fill="none" stroke="#FF47BC" strokeWidth="2" strokeLinecap="round"
          />
          {[0, 1].map((i) => (
            <circle
              key={i}
              cx={X(p[i * 2])}
              cy={Y(p[i * 2 + 1])}
              r="6"
              fill="#FAF9FA"
              stroke="#FF47BC"
              strokeWidth="2"
              onPointerDown={drag(i)}
              className="cursor-grab active:cursor-grabbing"
            />
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {["x1", "y1", "x2", "y2"].map((l, i) => (
          <label key={l} className="flex flex-col gap-1 min-w-0">
            <span className="text-[#8C8C8C] dark:text-[#9A9A9A]">{l}</span>
            <input
              type="number"
              step="0.01"
              value={p[i]}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) return;
                const next = [...p];
                next[i] = i % 2 ? vidClamp(n, -0.5, 1.5) : vidClamp(n, 0, 1);
                onChange(next);
              }}
              className={inputCls}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

// Easing popover: opens to the left of the right toolbar, bottom-aligned to the clicked button
function EasePopover({ v, menu, onClose }) {
const shot = v.shots.find((x) => x.id === menu.sid);
const key = shot?.keys.find((k) => k.id === menu.kid);
const prop = menu.prop ?? null; // null = opened from the shot track
const current = prop ? key?.propEase?.[prop] ?? key?.ease : key?.ease;
const spec = vidEaseSpec(current ?? shot?.ease ?? "smooth");
  const [tab, setTab] = useState(spec.id === "custom" ? "custom" : "presets");
  const [editing, setEditing] = useState(false); // true while the edit sub-view is open
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const scrollRef = useRef(null);

  // jump back to the top whenever the sub-view opens or closes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [editing]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const t = v.toolbarRef?.current?.getBoundingClientRect();
      setPos({
        right: t ? window.innerWidth - t.left + 4 : 8,
        bottom: t ? window.innerHeight - t.bottom : 8,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [menu.bottom]);

  if (!shot || !key) return null;

  const set = (next) =>
  prop
    ? // property row: only this property's segment
      v.onKey(menu.sid, menu.kid, { propEase: { ...(key.propEase ?? {}), [prop]: next } })
    : // shot track: every property in this segment, drop per-property overrides
      v.onKey(menu.sid, menu.kid, { ease: next, propEase: undefined });
  const fn = vidEaseFn(spec);
  const base = VID_EASE_PRESETS.find((x) => x.id === spec.id);
  const params = VID_EASE_PARAMS[spec.kind] ?? [];
  const dirty =
    !!base &&
    (params.length > 0 || spec.kind === "bezier") &&
    JSON.stringify(base.p) !== JSON.stringify(spec.p);
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${on ? SEG_ON : SEG_OFF}`;
  const label = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";

  return (
<div
  ref={ref}
  data-vid-ease-menu
  style={{ position: "fixed", right: pos?.right ?? 0, bottom: pos?.bottom ?? 0, visibility: pos ? "visible" : "hidden", maxHeight: "min(82vh, 820px)" }}
  className="panel-enter w-[300px] flex flex-col overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
>
<div className={`flex items-center h-12 pr-2 shrink-0 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${editing ? "pl-2 gap-1" : "pl-4"}`}>
  {editing && (
    <button
      type="button"
      onClick={() => {
        setTab("presets");
        setEditing(false);
      }}
      aria-label="Back"
      className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      <CaretLeft size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
    </button>
  )}
  <span className="flex-1 min-w-0 truncate text-left">
    <span className="section-title text-[#8C8C8C] dark:text-[#9A9A9A]">
      {prop ? VID_PROPS.find(([k]) => k === prop)?.[1] : "Easing"} /{" "}
    </span>
    <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">
      {spec.id === "custom" ? "Custom" : base?.label}
    </span>
  </span>
  <button
    type="button"
    onClick={onClose}
    aria-label="Close"
    className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
  >
    <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
  </button>
</div>

<div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#E3E3E3_transparent] dark:[scrollbar-color:#333333_transparent]">
<div className="flex flex-col gap-3 px-4 py-4">
  <EasePreview fn={fn} />

  {editing ? (
    /* Edit sub-view: curve editor for bezier presets, sliders for overshoot presets */
    <div className="fx-enter flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={label}>{spec.kind === "bezier" ? "Curve" : "Adjust"}</span>
        {dirty && (
          <button type="button" onClick={() => set({ id: base.id, kind: base.kind, p: [...base.p] })} className="text-[#FF47BC] hover:underline">
            Reset
          </button>
        )}
      </div>
      {spec.kind === "bezier" ? (
        <EaseBezierEditor p={spec.p} onChange={(next) => set({ ...spec, p: next })} />
      ) : (
        params.map((pm, i) => (
          <Scrubber
            key={pm.label}
            compact
            label={pm.label}
            value={Math.round(spec.p[i] * pm.div)}
            min={pm.min}
            max={pm.max}
            onChange={(val) => set({ ...spec, p: spec.p.map((x, j) => (j === i ? val / pm.div : x)) })}
          />
        ))
      )}
    </div>
  ) : (
    <>
      <div className={seg}>
        <button type="button" onClick={() => setTab("presets")} className={segBtn(tab === "presets")}>Presets</button>
        <button type="button" onClick={() => setTab("custom")} className={segBtn(tab === "custom")}>Custom</button>
      </div>

      {tab === "presets" ? (
        VID_EASE_GROUPS.map((g) => (
          <div key={g} className="flex flex-col gap-1">
            <span className={label}>{g}</span>
            <div className="flex flex-col gap-0.5">
              {VID_EASE_PRESETS.filter((x) => x.group === g).map((pr) => (
                <EaseRow
                  key={pr.id}
                  spec={{ id: pr.id, kind: pr.kind, p: pr.p }}
                  label={pr.label}
                  active={spec.id === pr.id}
                  onClick={() => set({ id: pr.id, kind: pr.kind, p: [...pr.p] })}
                  onEdit={
                    g === "Basic"
                      ? undefined
                      : () => {
                          if (spec.id !== pr.id) set({ id: pr.id, kind: pr.kind, p: [...pr.p] });
                          setEditing(true);
                        }
                  }
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <EaseBezierEditor
          p={spec.kind === "bezier" ? spec.p : VID_EASE_CUSTOM_DEFAULT}
          onChange={(next) => set({ id: "custom", kind: "bezier", p: next })}
        />
      )}
    </>
  )}
</div>
      </div>
    </div>
  );
}

function BgAnimTile({ anim, active, onClick, onEdit, art, kind = "enter" }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const draw = (p) => drawBgAnimPreview(ref.current, anim.id, p, art);
    const flip = (u) => (kind === "exit" ? 1 - u : u);
    if (!hover) {
      draw(anim.pv ?? 0.85);
      return;
    }
    let raf;
    const t0 = performance.now();
    const T = 1100, CYCLE = T + 500;
    const loop = (now) => {
      draw(bgProgress(anim.id, flip(Math.min(1, ((now - t0) % CYCLE) / T))));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hover, anim.id, art, kind]);

  return (
    <div className="group relative flex flex-col min-w-0">
      <button
        type="button"
        onClick={onClick}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className="flex flex-col items-stretch gap-1.5 min-w-0"
      >
        <div
          className={`relative w-full aspect-[3/2] rounded-lg overflow-hidden border transition-colors duration-150 ${
            active ? "border-[#FF47BC]" : "border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 group-hover:border-[#3A3A3A]/20 dark:group-hover:border-white/20"
          }`}
        >
          <canvas ref={ref} width={240} height={160} className="absolute inset-0 w-full h-full" />
        </div>
        <span
          className={`truncate text-center leading-4 transition-colors ${
            active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
          }`}
        >
          {anim.label}
        </span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`absolute top-1 right-1 h-5 px-1.5 rounded-md bg-[#FAF9FA]/85 dark:bg-[#171717]/85 backdrop-blur-sm leading-4 text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#FAF9FA] dark:hover:bg-[#171717] transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
            active ? "opacity-100" : "opacity-0"
          }`}
        >
          Edit
        </button>
      )}
    </div>
  );
}

function BgAnimLive({ id, kind = "enter", opts, art }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const T = 1400, HOLD = 500, CYCLE = T + HOLD * 2;
    const loop = (now) => {
      const u = vidClamp((((now - t0) % CYCLE) - HOLD) / T, 0, 1);
      drawBgAnimPreview(ref.current, id, bgProgress(id, kind === "exit" ? 1 - u : u, opts.ease), art, opts);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, kind, opts, art]);
  return (
    <div className="rounded-[10px] overflow-hidden border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
      <canvas ref={ref} width={480} height={320} className="w-full block" />
    </div>
  );
}

// ---------- Custom animation properties (shared by text and background) ----------
// t = 0 -> a, t = 1 -> b
const mixHex = (a, b, t) => {
  const pa = parseInt(a || "000000", 16), pb = parseInt(b || "000000", 16);
  return [16, 8, 0]
    .map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
};

const BG_CUSTOM_IDLE = { id: "custom", from: {} }; // stable object for the preview before anything is added

// keys = the `from` fields a property owns. def = what gets set when it's added.
const CA_PROPS = {
  move: { label: "Move", Icon: ArrowsOutCardinal, keys: ["x", "y"], def: { x: 0, y: 60 },
    fields: [{ k: "x", label: "X offset", min: -300, max: 300 }, { k: "y", label: "Y offset", min: -300, max: 300 }] },
  scale: { label: "Scale", Icon: ArrowSquareOut, keys: ["s"], def: { s: 0.6 },
    fields: [{ k: "s", label: "Scale (%)", min: 0, max: 300, mul: 100 }] },
  rotate: { label: "Rotate", Icon: ArrowCounterClockwise, keys: ["r"], def: { r: -45 },
    fields: [{ k: "r", label: "Rotation", min: -360, max: 360 }] },
  opacity: { label: "Opacity", Icon: CircleHalf, keys: ["a"], def: { a: 0 },
    fields: [{ k: "a", label: "Opacity", min: 0, max: 100, mul: 100 }] },
  color: { label: "Color", Icon: Palette, keys: ["c"], def: { c: "FF47BC" }, color: true },
  shadow: { label: "Shadow", Icon: Stack, keys: ["sh"], def: { sh: 40 },
    fields: [{ k: "sh", label: "Shadow", min: 0, max: 100 }] },
  blur: { label: "Layer Blur", Icon: Drop, keys: ["b"], def: { b: 30 },
    fields: [{ k: "b", label: "Blur", min: 0, max: 100 }] },
  letterSpacing: { label: "Letter Spacing", Icon: ArrowsHorizontal, keys: ["ls"], def: { ls: 40 },
    fields: [{ k: "ls", label: "Letter spacing", min: -50, max: 100 }] },
  lineHeight: { label: "Line Height", Icon: ArrowsVertical, keys: ["lh"], def: { lh: 60 },
    fields: [{ k: "lh", label: "Line height", min: -50, max: 200 }] },
  resize: { label: "Resize", Icon: Square, keys: ["w"], def: { w: 50 },
    fields: [{ k: "w", label: "Start size (%)", min: 0, max: 100 }] },
  radius: { label: "Corner Radius", Icon: CornersOut, keys: ["cr"], def: { cr: 20 },
    fields: [{ k: "cr", label: "Start radius", min: 0, max: 50 }] },
};
const CA_GROUPS = {
  text: [
    ["Transform", ["move", "scale", "rotate"]],
    ["Style", ["opacity", "color", "shadow"]],
    ["Effects", ["blur"]],
    ["Text", ["letterSpacing", "lineHeight"]],
  ],
  bg: [
    ["Transform", ["move", "scale", "rotate"]],
    ["Style", ["opacity", "color"]],
    ["Effects", ["blur"]],
    ["Other", ["resize", "radius"]],
  ],
};

// Older specs have no `use` list, so work out which properties differ from rest.
const caInfer = (from, rest, target) => {
  const allowed = CA_GROUPS[target].flatMap(([, ks]) => ks);
  return Object.keys(CA_PROPS).filter((k) => allowed.includes(k) && CA_PROPS[k].keys.some((f) => from[f] !== rest[f]));
};

function CaColor({ value, onChange }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="flex items-center gap-2">
      <label
        className="relative w-8 h-8 rounded-[10px] shrink-0 overflow-hidden border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 cursor-pointer"
        style={{ backgroundColor: `#${value}` }}
      >
        <input
          type="color"
          value={`#${value}`}
          onChange={(e) => onChange(e.target.value.slice(1).toUpperCase())}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <div className="flex flex-1 min-w-0 items-center h-8 px-2.5 bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-[10px] border border-transparent focus-within:border-[#FF47BC] transition-colors">
        <input
          value={text}
          onChange={(e) => {
            const h = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
            setText(h);
            if (h.length === 6) onChange(h);
          }}
          className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none"
        />
      </div>
    </div>
  );
}

// target: "text" | "bg". spec: the current animation (or null). onChange gets the next spec.
function CustomAnimEditor({ target, spec, onChange }) {
  const rest = target === "bg" ? BG_CUSTOM_REST : TXT_REST;
  const from = { ...rest, ...(spec?.from ?? {}) };
  const active = spec?.use ?? caInfer(from, rest, target);
  const emit = (patch) => onChange({ ...(spec ?? {}), ...patch });
  const setFrom = (patch) => emit({ from: { ...from, ...patch }, use: active });
  const add = (key) => emit({ from: { ...from, ...CA_PROPS[key].def }, use: [...active, key] });
  const remove = (key) =>
    emit({
      from: { ...from, ...Object.fromEntries(CA_PROPS[key].keys.map((k) => [k, rest[k]])) },
      use: active.filter((k) => k !== key),
    });
  const sub = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const rawEase = spec?.ease ?? (target === "bg" ? "smooth" : "expo-out");
  const ease = typeof rawEase === "string" ? rawEase : rawEase.id;

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 && (
        <div className="fx-enter flex flex-col gap-3">
          {active.map((key) => {
            const p = CA_PROPS[key];
            const Icon = p.Icon;
            return (
              <div key={key} className="fx-enter flex flex-col gap-2">
                <div className="flex items-center justify-between h-6">
                  <span className="flex items-center gap-2 section-title text-[#3A3A3A] dark:text-[#FAF9FA]">
                    <Icon size={14} weight="regular" className="text-[#FF47BC]" />
                    {p.label}
                  </span>
                  <Tooltip label={`Remove ${p.label.toLowerCase()}`} placement="bottom">
                    <button
                      type="button"
                      aria-label={`Remove ${p.label}`}
                      onClick={() => remove(key)}
                      className="group flex items-center justify-center w-6 h-6 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                    >
                      <Minus size={14} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
                    </button>
                  </Tooltip>
                </div>
                {p.color ? (
                  <CaColor value={from.c || "FF47BC"} onChange={(c) => setFrom({ c })} />
                ) : (
                  p.fields.map((f) => (
                    <Scrubber
                      key={f.k}
                      compact
                      label={f.label}
                      value={Math.round(from[f.k] * (f.mul ?? 1))}
                      min={f.min}
                      max={f.max}
                      onChange={(v) => setFrom({ [f.k]: v / (f.mul ?? 1) })}
                    />
                  ))
                )}
              </div>
            );
          })}
          <div className="flex flex-col gap-2">
            <label className={sub}>Easing</label>
            <PopupDropdown value={ease} options={TXT_EASE_OPTIONS} onChange={(e) => emit({ ease: e })} />
          </div>
        </div>
      )}

      {CA_GROUPS[target].map(([title, keys]) => {
        const left = keys.filter((k) => !active.includes(k));
        if (!left.length) return null;
        return (
          <div key={title} className="flex flex-col gap-1">
            <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA] pb-1">{title}</span>
            {left.map((k) => {
              const Icon = CA_PROPS[k].Icon;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => add(k)}
                  className="flex items-center gap-3 w-full h-8 px-1 rounded-lg text-left text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-[background-color,transform] duration-100 active:scale-[0.98]"
                >
                  <Icon size={14} weight="regular" className="shrink-0 text-[#FF47BC]" />
                  {CA_PROPS[k].label}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Background animation popover: opens to the left of the right toolbar, bottom-aligned to it
function BgAnimPopover({ v, menu, onClose, onSwitch }) {
  const clip = v.bgs.find((b) => b.id === menu.bid);
  const [pos, setPos] = useState(null);
  const [editing, setEditing] = useState(false); // sub-view: adjust the current animation
  const [tab, setTab] = useState(() => (clip && bgAnimOf(clip, menu.kind ?? "enter")?.id === "custom" ? "custom" : "presets"));
  const scrollRef = useRef(null);
  useEffect(() => {
    setEditing(false);
    setTab(clip && bgAnimOf(clip, menu.kind ?? "enter")?.id === "custom" ? "custom" : "presets");
  }, [menu.kind]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [editing]);

  // Preview artwork: the previous clip's background -> this clip's background.
  const [imgTick, setImgTick] = useState(0);
  const imgCache = useRef(new Map());
  const getImg = (url) => {
    const hit = imgCache.current.get(url);
    if (hit) return hit.complete && hit.naturalWidth ? hit : null;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => setImgTick((n) => n + 1); // repaint once the image has loaded
    im.src = url;
    imgCache.current.set(url, im);
    return null;
  };
  const art = React.useMemo(() => {
    if (!clip) return null;
    const W = 240, H = 160;
    const paint = (sn) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      paintBgSnap(c.getContext("2d"), sn, W, H, getImg);
      return c;
    };
    // "from" is always the app surface colour; "to" is the selected clip's background
    const surface = {
      bgType: "solid",
      bgOpacity: 100,
      bgHex: document.documentElement.classList.contains("dark") ? "171717" : "FAF9FA",
    };
    return { from: paint(surface), to: paint(clip.snap) };
  }, [clip?.snap, menu.bid, imgTick]);

  useLayoutEffect(() => {
    const update = () => {
      const t = v.toolbarRef?.current?.getBoundingClientRect();
      setPos({
        right: t ? window.innerWidth - t.left + 4 : 8,
        bottom: t ? window.innerHeight - t.bottom : 8,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!clip) return null;
  const kind = menu.kind ?? "enter";
  const isIn = kind === "enter";
  const cur = bgAnimOf(clip, kind);
  const anim = cur ?? { id: "none", dur: 600, delay: 0 };
  const send = (next) => v.onBgAnim(menu.bid, kind, next);
  const set = (patch) => cur && send({ ...cur, ...patch });
  const pick = (id) => send(id === "none" ? null : { id, dur: anim.dur, delay: anim.delay ?? 0 }); // keeps timing, starts from the new animation's defaults
  const params = BG_ANIM_PARAMS[anim.id] ?? [];
  const defEase = bgDefaultEase(anim.id);
  const curEase = anim.ease ?? defEase;
  const dirty =
    (anim.ease !== undefined && anim.ease !== defEase) ||
    params.some((pm) => anim[pm.key] !== undefined && anim[pm.key] !== pm.def);
  const sub = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${on ? SEG_ON : SEG_OFF}`;

  return (
    <div
      data-vid-bganim-menu
      style={{ position: "fixed", right: pos?.right ?? 0, bottom: pos?.bottom ?? 0, visibility: pos ? "visible" : "hidden", maxHeight: "min(82vh, 820px)" }}
      className="panel-enter w-[300px] flex flex-col overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
    >
      <div className={`flex items-center h-12 pr-2 shrink-0 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${editing ? "pl-2 gap-1" : "pl-4"}`}>
        {editing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Back"
            className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <CaretLeft size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
        )}
        <span className="flex-1 min-w-0 truncate text-left">
          <span className="section-title text-[#8C8C8C] dark:text-[#9A9A9A]">{isIn ? "Enter" : "Exit"} / </span>
          <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{BG_ANIM_BY_ID[anim.id]?.label ?? "None"}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-4 py-3 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <div className={seg}>
          {[["enter", "Enter"], ["exit", "Exit"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => onSwitch(k)} className={segBtn(kind === k)}>{l}</button>
          ))}
        </div>
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${cur ? "" : "opacity-40 pointer-events-none"}`}>
          <Scrubber compact label="Duration (ms)" value={anim.dur} min={100} max={2000} hardMax={10000} onChange={(dur) => set({ dur })} />
          <Scrubber compact label="Delay (ms)" value={anim.delay ?? 0} min={0} max={2000} hardMax={10000} onChange={(delay) => set({ delay })} />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#E3E3E3_transparent] dark:[scrollbar-color:#333333_transparent]">
        <div className="flex flex-col gap-4 px-4 py-4">
          {editing ? (
            <div className="fx-enter flex flex-col gap-3">
              <BgAnimLive id={anim.id} kind={kind} opts={anim} art={art} />
              <div className="flex items-center justify-between">
                <span className={sub}>Adjust</span>
                {dirty && (
                  <button
                    type="button"
                    onClick={() => send({ id: anim.id, dur: anim.dur, delay: anim.delay ?? 0 })}
                    className="text-[#FF47BC] hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              {params.map((pm) => {
                const val = anim[pm.key] ?? pm.def;
                if (pm.type === "range")
                  return (
                    <Scrubber key={pm.key} compact label={pm.label} value={val} min={pm.min} max={pm.max} hardMax={pm.hardMax} onChange={(x) => set({ [pm.key]: x })} />
                  );
                if (pm.type === "toggle")
                  return <ToggleRow key={pm.key} muted label={pm.label} checked={val !== false} onChange={(x) => set({ [pm.key]: x })} />;
                return (
                  <div key={pm.key} className="flex flex-col gap-2">
                    <label className={sub}>{pm.label}</label>
                    <PopupDropdown value={val} options={pm.options} onChange={(x) => set({ [pm.key]: x })} />
                  </div>
                );
              })}
              <div className="flex flex-col gap-2">
                <label className={sub}>Easing</label>
                <PopupDropdown value={curEase} options={TXT_EASE_OPTIONS} onChange={(ease) => set({ ease })} />
              </div>
            </div>
          ) : (
            <>
              <div className={seg}>
                <button type="button" onClick={() => setTab("presets")} className={segBtn(tab === "presets")}>Presets</button>
                <button type="button" onClick={() => setTab("custom")} className={segBtn(tab === "custom")}>Custom</button>
              </div>

              {tab === "presets" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <BgAnimTile anim={BG_ANIM_NONE} art={art} kind={kind} active={anim.id === "none"} onClick={() => pick("none")} />
                  </div>

                  {BG_ANIM_GROUPS.map((g) => (
                    <div key={g} className="flex flex-col gap-2">
                      <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{g}</span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                        {BG_ANIMS.filter((x) => x.group === g).map((an) => (
                          <BgAnimTile
                            key={an.id}
                            anim={an}
                            art={art}
                            kind={kind}
                            active={anim.id === an.id}
                            onClick={() => pick(an.id)}
                            onEdit={() => {
                              if (anim.id !== an.id) pick(an.id); // select it first, then open its controls
                              setEditing(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <BgAnimLive id="custom" kind={kind} opts={cur?.id === "custom" ? cur : BG_CUSTOM_IDLE} art={art} />
                  <CustomAnimEditor
                    target="bg"
                    spec={cur?.id === "custom" ? cur : null}
                    onChange={(next) => send({ ...next, id: "custom", dur: anim.dur, delay: anim.delay ?? 0 })}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// subject:
//   { type: "image",  img }                    -> snapshot of the real device (Mockup mode)
//   { type: "frames", ratio, items: [...] }    -> the real frames (Frame mode)
//   null                                        -> old placeholder
function drawDevAnimPreview(canvas, id, kind, p, subject) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
  const sp = smoothstep(p);
  const pose = id === "none" ? null : devAnimPose(id, kind === "exit" ? 1 - sp : sp);
  const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = pose ?? {};
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = document.documentElement.classList.contains("dark") ? "#171717" : "#FAF9FA";
  ctx.fillRect(0, 0, W, H);

  // size of the thing being animated
  let bw, bh;
  if (subject) {
    const ar = subject.type === "image" ? subject.img.naturalWidth / subject.img.naturalHeight : subject.ratio;
    bh = H * 0.8;
    bw = bh * ar;
    if (bw > W * 0.9) {
      bw = W * 0.9;
      bh = bw / ar;
    }
  } else {
    bw = H * 0.34;
    bh = H * 0.7;
  }

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(W / 2 + x * (W / 2 + bw / 2), H / 2 - y * (H / 2 + bh / 2));
  ctx.scale(Math.max(0.02, Math.abs(s * Math.cos(ry))), Math.max(0.02, Math.abs(s * Math.cos(rx))));
  ctx.translate(-bw / 2, -bh / 2);

  if (subject?.type === "image") {
    ctx.beginPath();
    ctx.roundRect(0, 0, bw, bh, bh * 0.04);
    ctx.clip();
    ctx.drawImage(subject.img, 0, 0, bw, bh);
  } else if (subject?.type === "frames") {
    subject.items.forEach((it) => {
      const fx = it.l * bw, fy = it.t * bh, fw = it.w * bw, fh = it.h * bh;
      const m = Math.min(fw, fh);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(fx, fy, fw, fh, it.radii.map((r) => r * m));
      ctx.clip();
      if (it.img) {
        const sc = Math.max(fw / it.img.naturalWidth, fh / it.img.naturalHeight);
        const dw = it.img.naturalWidth * sc, dh = it.img.naturalHeight * sc;
        ctx.drawImage(it.img, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh);
      } else {
        const g = ctx.createLinearGradient(0, fy, 0, fy + fh);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(1, "#FF47BC");
        ctx.fillStyle = g;
        ctx.fillRect(fx, fy, fw, fh);
      }
      ctx.restore();
    });
  } else {
    ctx.beginPath();
    ctx.roundRect(0, 0, bw, bh, bw * 0.16);
    ctx.fillStyle = "#0E0E10";
    ctx.fill();
    const g = ctx.createLinearGradient(0, 0, 0, bh);
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(1, "#FF47BC");
    ctx.beginPath();
    ctx.roundRect(3, 3, bw - 6, bh - 6, bw * 0.13);
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

function DevAnimTile({ anim, kind, active, onClick, subject }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  const id = anim ? anim.id : "none";
  useEffect(() => {
    if (!hover) {
      drawDevAnimPreview(ref.current, id, kind, 0.55, subject);
      return;
    }
    let raf;
    const t0 = performance.now();
    const T = 1100, CYCLE = T + 500;
    const loop = (now) => {
      drawDevAnimPreview(ref.current, id, kind, Math.min(1, ((now - t0) % CYCLE) / T), subject);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hover, id, kind, subject]);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="group flex flex-col items-stretch gap-1.5 min-w-0"
    >
      <div
        className={`relative w-full aspect-[3/2] rounded-lg overflow-hidden border transition-colors duration-150 ${
          active ? "border-[#FF47BC]" : "border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 group-hover:border-[#3A3A3A]/20 dark:group-hover:border-white/20"
        }`}
      >
        <canvas ref={ref} width={240} height={160} className="absolute inset-0 w-full h-full" />
      </div>
      <span
        className={`truncate text-center leading-4 transition-colors ${
          active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
        }`}
      >
        {anim ? anim.label(kind === "enter" ? "in" : "out") : "None"}
      </span>
    </button>
  );
}

function ShotAnimPopover({ v, menu, onClose, onSwitch }) {
  const shot = v.shots.find((x) => x.id === menu.sid);
  const [pos, setPos] = useState(null);
  const [subject, setSubject] = useState(null);

  // grab the real device / frames once when the popover opens
  useEffect(() => {
    let dead = false;
    v.getAnimSubject?.().then((s) => !dead && setSubject(s));
    return () => { dead = true; };
  }, []);

  useLayoutEffect(() => {
    const update = () => {
      const t = v.toolbarRef?.current?.getBoundingClientRect();
      setPos({
        right: t ? window.innerWidth - t.left + 4 : 8,
        bottom: t ? window.innerHeight - t.bottom : 8,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!shot) return null;
  const kind = menu.kind;
  const isIn = kind === "enter";
  const cur = shot[kind] && shot[kind].id !== "none" ? shot[kind] : null;
  const set = (patch) => v.onShotAnim(shot.id, kind, { dur: 600, delay: 0, ...(cur ?? {}), ...patch });
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";

  return (
    <div
      data-vid-shotanim-menu
      style={{ position: "fixed", right: pos?.right ?? 0, bottom: pos?.bottom ?? 0, visibility: pos ? "visible" : "hidden", maxHeight: "min(82vh, 820px)" }}
      className="panel-enter w-[300px] flex flex-col overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
    >
      <div className="flex items-center h-12 pl-4 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <span className="flex-1 min-w-0 truncate text-left">
          <span className="section-title text-[#8C8C8C] dark:text-[#9A9A9A]">{isIn ? "Enter" : "Exit"} / </span>
          <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{cur ? devAnimLabel(cur.id, isIn ? "in" : "out") : "None"}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>

      {/* pinned controls */}
      <div className="flex flex-col gap-2 px-4 py-3 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <div className={seg}>
          {[["enter", "Enter"], ["exit", "Exit"]].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => onSwitch(k)}
              className={`seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
                kind === k ? SEG_ON : SEG_OFF
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${cur ? "" : "opacity-40 pointer-events-none"}`}>
          <Scrubber compact label="Duration (ms)" value={cur?.dur ?? 600} min={100} max={2000} hardMax={10000} onChange={(dur) => set({ dur })} />
          <Scrubber compact label="Delay (ms)" value={cur?.delay ?? 0} min={0} max={2000} hardMax={10000} onChange={(delay) => set({ delay })} />
          <span className="text-[#8C8C8C] dark:text-[#9A9A9A] leading-4">
            {isIn ? "The device stays hidden for the delay, then animates in." : `The animation ends this long before the ${v.frameMode ? "frame" : "shot"} does.`}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#E3E3E3_transparent] dark:[scrollbar-color:#333333_transparent]">
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <DevAnimTile anim={null} kind={kind} subject={subject} active={!cur} onClick={() => v.onShotAnim(shot.id, kind, null)} />
          </div>
          {DEV_ANIM_GROUPS.map((g) => (
            <div key={g} className="flex flex-col gap-2">
              <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{g}</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                {DEV_ANIMS.filter((x) => x.group === g).map((an) => (
                  <DevAnimTile key={an.id} anim={an} kind={kind} subject={subject} active={cur?.id === an.id} onClick={() => set({ id: an.id })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Text animations ----------
// ls / lh = letter spacing / line height delta, sh = shadow size, c = start color (null = none)
const TXT_REST = { a: 1, x: 0, y: 0, s: 1, r: 0, b: 0, ls: 0, lh: 0, sh: 0, c: null }; // a = opacity 0-1, x / y / b = % of font size, s = scale, r = deg
const txtFrom = (o = {}) => ({ ...TXT_REST, ...o });
const txtCase = (s, c) =>
  c === "uppercase" ? s.toUpperCase()
  : c === "lowercase" ? s.toLowerCase()
  : c === "capitalize" ? s.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase())
  : s;

const TXT_SPLITS = [
  { value: "block", label: "Block" },
  { value: "line", label: "Lines" },
  { value: "word", label: "Words" },
  { value: "char", label: "Chars" },
];
const TXT_ORDERS = [
  { value: "start", label: "Start to end" },
  { value: "end", label: "End to start" },
  { value: "center", label: "Center out" },
  { value: "edges", label: "Edges in" },
  { value: "random", label: "Random" },
];
const TXT_EASE_OPTIONS = VID_EASE_PRESETS.map((p) => ({ value: p.id, label: p.label }));
const TXT_CUSTOM_DEFAULT = {
  id: "custom", split: "char", order: "start", stagger: 50,
  from: txtFrom({ a: 0, y: 60 }), mask: false, ease: "expo-out",
};

const TP = (id, label, group, split, stagger, from, ease = "cubic-out", extra = {}) => ({
  id, label, group,
  spec: { split, order: "start", stagger, from: txtFrom(from), mask: false, ease, ...extra },
});
const TXT_PRESET_GROUPS = ["Fade", "Slide", "Scale", "Mask", "Blur", "Type", "Motion"];
const TXT_PRESETS = [
  TP("t-fade", "Fade", "Fade", "block", 0, { a: 0 }, "smooth"),
  TP("t-fade-lines", "Fade lines", "Fade", "line", 60, { a: 0 }),
  TP("t-fade-words", "Fade words", "Fade", "word", 60, { a: 0 }),
  TP("t-fade-chars", "Fade chars", "Fade", "char", 70, { a: 0 }),

  TP("t-slide-up", "Slide up", "Slide", "block", 0, { a: 0, y: 80 }, "expo-out"),
  TP("t-slide-down", "Slide down", "Slide", "block", 0, { a: 0, y: -80 }, "expo-out"),
  TP("t-slide-left", "Slide left", "Slide", "block", 0, { a: 0, x: -100 }, "expo-out"),
  TP("t-slide-right", "Slide right", "Slide", "block", 0, { a: 0, x: 100 }, "expo-out"),
  TP("t-slide-lines", "Slide up lines", "Slide", "line", 60, { a: 0, y: 80 }, "expo-out"),
  TP("t-slide-words", "Slide up words", "Slide", "word", 60, { a: 0, y: 80 }, "expo-out"),

  TP("t-grow", "Grow", "Scale", "block", 0, { a: 0, s: 0.6 }),
  TP("t-shrink", "Shrink", "Scale", "block", 0, { a: 0, s: 1.5 }),
  TP("t-pop-chars", "Pop chars", "Scale", "char", 70, { a: 0, s: 0 }, "back-out"),

  TP("t-mask-up", "Mask up", "Mask", "block", 0, { y: 110 }, "expo-out", { mask: true }),
  TP("t-mask-lines", "Mask lines", "Mask", "line", 50, { y: 110 }, "expo-out", { mask: true }),
  TP("t-mask-words", "Mask words", "Mask", "word", 50, { y: 110 }, "expo-out", { mask: true }),
  TP("t-mask-chars", "Mask chars", "Mask", "char", 70, { y: 110 }, "expo-out", { mask: true }),

  TP("t-blur", "Blur in", "Blur", "block", 0, { a: 0, b: 30 }),
  TP("t-blur-words", "Blur words", "Blur", "word", 60, { a: 0, b: 30 }),
  TP("t-blur-chars", "Blur chars", "Blur", "char", 70, { a: 0, b: 30, y: 20 }),

  TP("t-typewriter", "Typewriter", "Type", "char", 92, { a: 0 }, "linear"),
  TP("t-scatter", "Scatter", "Type", "char", 85, { a: 0 }, "linear", { order: "random" }),
  TP("t-center-out", "Center out", "Type", "char", 70, { a: 0, s: 0.6 }, "cubic-out", { order: "center" }),

  TP("t-spin", "Spin in", "Motion", "block", 0, { a: 0, r: -90, s: 0.6 }, "back-out"),
  TP("t-tumble", "Tumble chars", "Motion", "char", 70, { a: 0, y: 60, r: 40 }, "back-out"),
  TP("t-wave", "Wave", "Motion", "char", 80, { a: 0, y: 70 }, "elastic"),
  TP("t-drop", "Drop", "Motion", "word", 60, { a: 0, y: -100 }, "bounce"),
];
const TXT_PRESET_BY_ID = Object.fromEntries(TXT_PRESETS.map((p) => [p.id, p]));

// 0..1 rank per unit, which decides who starts first
const txtRanks = (order, n) =>
  Array.from({ length: n }, (_, i) => {
    const u = n > 1 ? i / (n - 1) : 0;
    if (order === "end") return 1 - u;
    if (order === "center") return Math.abs(u - 0.5) * 2;
    if (order === "edges") return 1 - Math.abs(u - 0.5) * 2;
    if (order === "random") return bgRand(i, 7);
    return u;
  });

// p = progress of the whole animation (0 = hidden pose, 1 = resting). One state per unit.
function txtUnitStates(spec, p, n) {
  const ease = vidEaseFn(vidEaseSpec(spec.ease ?? "smooth"));
  const stag = vidClamp((spec.stagger ?? 0) / 100, 0, 0.95);
  const ranks = txtRanks(spec.order, n);
  const f = txtFrom(spec.from);
  return ranks.map((rk) => {
    const e = ease(vidClamp((p - rk * stag) / (1 - stag), 0, 1));
    return {
      a: f.a + (1 - f.a) * e, x: f.x * (1 - e), y: f.y * (1 - e), s: f.s + (1 - f.s) * e, r: f.r * (1 - e), b: f.b * (1 - e),
      ls: f.ls * (1 - e), lh: f.lh * (1 - e), sh: f.sh * (1 - e), c: f.c, ce: e,
    };
  });
}

// undefined = this text has no clips (always visible, static)
// null      = it has clips but none is active at t (hidden)
// { spec, p } = active; spec null = resting
function sampleTextAnim(clips, tid, t) {
  let any = false, hit = null;
  clips.forEach((c) => {
    if (c.tid !== tid) return;
    any = true;
    const a = c.start, b = c.start + c.len;
    if (t >= a - 1e-6 && t <= b + 1e-6) hit = { c, a, b };
  });
  if (!any) return undefined;
  if (!hit) return null;
  const { c, a, b } = hit;
  const en = c.enter && c.enter.id !== "none" ? c.enter : null;
  const ex = c.exit && c.exit.id !== "none" ? c.exit : null;
  let out = { spec: null, p: 1 };
  if (en) {
    const e0 = a + en.delay / 1000, e1 = e0 + en.dur / 1000;
    const p = t <= e0 ? 0 : t >= e1 ? 1 : (t - e0) / Math.max(1e-6, e1 - e0);
    if (p < 1) out = { spec: en, p };
  }
  if (ex) {
    const x1 = b - ex.delay / 1000, x0 = x1 - ex.dur / 1000;
    const q = t >= x1 ? 1 : t <= x0 ? 0 : (t - x0) / Math.max(1e-6, x1 - x0);
    if (q > 0) out = { spec: ex, p: 1 - q }; // exit = the same animation played backwards
  }
  return out;
}

// Lines -> words -> chars, with a running unit index
function txtTree(content, split) {
  let n = 0;
  const lines = String(content ?? "").split("\n").map((ln) => {
    const lineIdx = split === "line" ? n++ : null;
    const tokens = ln.split(/(\s+)/).filter((t) => t !== "").map((tok) => {
      if (/^\s+$/.test(tok)) return { sp: tok };
      if (split === "word") return { w: tok, idx: n++ };
      if (split === "char") return { w: tok, chars: [...tok].map((ch) => ({ ch, idx: n++ })) };
      return { w: tok };
    });
    return { text: ln, lineIdx, tokens };
  });
  return { lines, count: Math.max(1, n) };
}

// Canvas twin of TextLines, used by the popover previews. Draws the real text (font, weight, case, color).
// dims = the real canvas box in px. The text is drawn at its real size, scaled by how far the canvas is shrunk into this preview.
function drawTextAnimPreview(canvas, spec, kind, p, item, dims) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
  const it = withTextFill(item ?? DEFAULT_TEXT);
  const n = parseInt(it.hex || "000000", 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = lum > 0.6 ? "#171717" : "#FAF9FA"; // pick a background the text color can be read on
  ctx.fillRect(0, 0, W, H);

  const lines = txtCase(String(it.content || "Your headline"), it.textCase).split("\n").filter((l) => l.trim()).slice(0, 3);
  if (!lines.length) lines.push("Your headline");
  const family = `"${it.font}", sans-serif`;
  const setFont = (sz) => (ctx.font = `${it.weight} ${sz}px ${family}`);
  let size = Math.max(H * 0.26, dims?.w ? it.size * (W / dims.w) : H * 0.3);
  setFont(size);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest > W * 0.9) size *= (W * 0.9) / widest; // only shrinks when it wouldn't fit
  if (lines.length > 1) size = Math.min(size, (H * 0.8) / (lines.length * 1.25));
  setFont(size);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const lh = size * 1.25, y0 = H / 2 - ((lines.length - 1) * lh) / 2;

  const split = spec?.split ?? "block";
  let idx = 0;
  const units = [];
  lines.forEach((ln, li) => {
    if (split === "block") units.push({ li, a: 0, b: ln.length, idx: 0 });
    else if (split === "line") units.push({ li, a: 0, b: ln.length, idx: idx++ });
    else {
      const re = split === "word" ? /\S+/g : /\S/g;
      let m;
      while ((m = re.exec(ln))) units.push({ li, a: m.index, b: m.index + m[0].length, idx: idx++ });
    }
  });
  const count = split === "block" ? 1 : Math.max(1, idx);
  const pp = kind === "exit" ? 1 - p : p;
  const states = spec ? txtUnitStates(spec, pp, count) : null;

  ctx.fillStyle = hexRgba(it.hex, it.opacity ?? 100);
  units.forEach((u) => {
    const ln = lines[u.li];
    const x0 = (W - ctx.measureText(ln).width) / 2;
    const pre = ctx.measureText(ln.slice(0, u.a)).width;
    const w = ctx.measureText(ln.slice(u.a, u.b)).width;
    const st = states ? states[u.idx] : TXT_REST;
    const cx = x0 + pre + w / 2, cy = y0 + u.li * lh;
    ctx.save();
    if (spec?.mask) {
      ctx.beginPath();
      ctx.rect(cx - w / 2 - 2, cy - lh / 2, w + 4, lh);
      ctx.clip();
    }
    ctx.globalAlpha = vidClamp(st.a, 0, 1);
    if (st.b > 0.05) ctx.filter = `blur(${(st.b / 100) * size}px)`;
    ctx.fillStyle = hexRgba(st.c ? mixHex(st.c, it.hex, st.ce) : it.hex, it.opacity ?? 100);
    if (st.sh > 0.5) {
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = (st.sh / 100) * size * 0.5;
      ctx.shadowOffsetY = (st.sh / 100) * size * 0.25;
    }
    if (st.ls) ctx.letterSpacing = `${(((it.letterSpacing ?? 0) + st.ls) / 100) * size}px`;
    ctx.translate(cx + (st.x / 100) * size, cy + (st.y / 100) * size);
    ctx.rotate((st.r * Math.PI) / 180);
    ctx.scale(st.s, st.s);
    ctx.fillText(ln.slice(u.a, u.b), -w / 2, 0);
    ctx.restore();
  });
}

function TextAnimTile({ preset, kind, active, onClick, onEdit, item, dims }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  const spec = preset ? preset.spec : null;
  useEffect(() => {
    if (!hover) {
      drawTextAnimPreview(ref.current, spec, kind, 0.6, item, dims);
      return;
    }
    let raf;
    const t0 = performance.now();
    const T = 1200, CYCLE = T + 600;
    const loop = (now) => {
      drawTextAnimPreview(ref.current, spec, kind, Math.min(1, ((now - t0) % CYCLE) / T), item, dims);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hover, spec, kind, item, dims?.w]);

  return (
    <div className="group relative flex flex-col min-w-0">
      <button type="button" onClick={onClick} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} className="flex flex-col items-stretch gap-1.5 min-w-0">
        <div
          className={`relative w-full aspect-[3/2] rounded-lg overflow-hidden border transition-colors duration-150 ${
            active ? "border-[#FF47BC]" : "border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 group-hover:border-[#3A3A3A]/20 dark:group-hover:border-white/20"
          }`}
        >
          <canvas ref={ref} width={240} height={160} className="absolute inset-0 w-full h-full" />
        </div>
        <span className={`truncate text-center leading-4 transition-colors ${active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"}`}>
          {preset ? preset.label : "None"}
        </span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`absolute top-1 right-1 h-5 px-1.5 rounded-md bg-[#FAF9FA]/85 dark:bg-[#171717]/85 backdrop-blur-sm leading-4 text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#FAF9FA] dark:hover:bg-[#171717] transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
            active ? "opacity-100" : "opacity-0"
          }`}
        >
          Edit
        </button>
      )}
    </div>
  );
}

function TextAnimLive({ spec, kind, item, dims }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const T = 1400, HOLD = 500, CYCLE = T + HOLD * 2;
    const loop = (now) => {
      const u = vidClamp((((now - t0) % CYCLE) - HOLD) / T, 0, 1);
      drawTextAnimPreview(ref.current, spec, kind, u, item, dims);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spec, kind, item, dims?.w]);
  return (
    <div className="rounded-[10px] overflow-hidden border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
      <canvas ref={ref} width={536} height={240} className="w-full block" />
    </div>
  );
}

function TextAnimPopover({ v, menu, onClose, onSwitch }) {
  const clip = v.texts.find((c) => c.id === menu.cid);
  const item = clip ? v.getText(clip.tid) : null;
  const dims = v.canvasDims;
  const [pos, setPos] = useState(null);
  const [tab, setTab] = useState(() => (clip?.[menu.kind]?.id === "custom" ? "custom" : "presets"));
  const [editing, setEditing] = useState(false); // sub-view: adjust the current preset
  const scrollRef = useRef(null);

  // jump back to the top whenever the sub-view opens or closes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [editing]);

  // switching between enter and exit leaves the sub-view
  useEffect(() => setEditing(false), [menu.kind]);

  useLayoutEffect(() => {
    const update = () => {
      const t = v.toolbarRef?.current?.getBoundingClientRect();
      setPos({ right: t ? window.innerWidth - t.left + 4 : 8, bottom: t ? window.innerHeight - t.bottom : 8 });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!clip) return null;
  const kind = menu.kind;
  const isIn = kind === "enter";
  const cur = clip[kind] && clip[kind].id !== "none" ? clip[kind] : null;
  const timing = { dur: cur?.dur ?? 600, delay: cur?.delay ?? 0 };
  const send = (anim) => v.onTextAnim(clip.id, kind, anim);
  const setTiming = (patch) => cur && send({ ...cur, ...patch });
  const pick = (pr) => send({ ...pr.spec, from: { ...pr.spec.from }, id: pr.id, ...timing });
  const base = cur ?? TXT_CUSTOM_DEFAULT;
  // inside the sub-view a preset keeps its id (so it can be reset); the Custom tab always becomes "custom"
  const edit = (patch) => send({ ...base, ...patch, id: editing && cur ? cur.id : "custom", ...timing });
  const editFrom = (patch) => edit({ from: { ...txtFrom(base.from), ...patch } });
  const from = txtFrom(base.from);

  const basePreset = cur ? TXT_PRESET_BY_ID[cur.id] : null;
  const norm = (s) => JSON.stringify({ split: s.split, order: s.order ?? "start", stagger: s.stagger ?? 0, from: txtFrom(s.from), mask: !!s.mask, ease: s.ease ?? "smooth" });
  const dirty = !!basePreset && norm(cur) !== norm(basePreset.spec);
  const label = cur ? (cur.id === "custom" ? "Custom" : basePreset?.label ?? "Custom") : "None";

  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) => `seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${on ? SEG_ON : SEG_OFF}`;
  const sub = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";

  // the same controls are used by the Custom tab and by the preset sub-view
  const controls = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className={sub}>Split by</label>
        <div className={seg}>
          {TXT_SPLITS.map((o) => (
            <button key={o.value} type="button" onClick={() => edit({ split: o.value })} className={segBtn(base.split === o.value)}>{o.label}</button>
          ))}
        </div>
      </div>

      <div className={`flex flex-col gap-2 transition-opacity duration-200 ${base.split === "block" ? "opacity-40 pointer-events-none" : ""}`}>
        <label className={sub}>Order</label>
        <PopupDropdown value={base.order ?? "start"} options={TXT_ORDERS} onChange={(order) => edit({ order })} />
        <Scrubber compact label="Stagger (%)" value={base.stagger ?? 0} min={0} max={95} onChange={(stagger) => edit({ stagger })} />
      </div>

      <label className={sub}>From</label>
      <div className="flex flex-col gap-2">
        <Scrubber compact label="Opacity" value={Math.round(from.a * 100)} min={0} max={100} onChange={(v2) => editFrom({ a: v2 / 100 })} />
        <Scrubber compact label="X offset" value={Math.round(from.x)} min={-300} max={300} onChange={(x) => editFrom({ x })} />
        <Scrubber compact label="Y offset" value={Math.round(from.y)} min={-300} max={300} onChange={(y) => editFrom({ y })} />
        <Scrubber compact label="Scale (%)" value={Math.round(from.s * 100)} min={0} max={300} onChange={(v2) => editFrom({ s: v2 / 100 })} />
        <Scrubber compact label="Rotation" value={Math.round(from.r)} min={-360} max={360} onChange={(r) => editFrom({ r })} />
        <Scrubber compact label="Blur" value={Math.round(from.b)} min={0} max={50} onChange={(b) => editFrom({ b })} />
      </div>

      <ToggleRow muted label="Mask reveal" checked={!!base.mask} onChange={(mask) => edit({ mask })} />

      <div className="flex flex-col gap-2">
        <label className={sub}>Easing</label>
        <PopupDropdown value={base.ease ?? "smooth"} options={TXT_EASE_OPTIONS} onChange={(ease) => edit({ ease })} />
      </div>
    </div>
  );

    // Custom tab: split / order / mask on top, then the property list
  const customTab = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className={sub}>Split by</label>
          <div className={seg}>
            {TXT_SPLITS.map((o) => (
              <button key={o.value} type="button" onClick={() => edit({ split: o.value })} className={segBtn(base.split === o.value)}>{o.label}</button>
            ))}
          </div>
        </div>
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${base.split === "block" ? "opacity-40 pointer-events-none" : ""}`}>
          <label className={sub}>Order</label>
          <PopupDropdown value={base.order ?? "start"} options={TXT_ORDERS} onChange={(order) => edit({ order })} />
          <Scrubber compact label="Stagger (%)" value={base.stagger ?? 0} min={0} max={95} onChange={(stagger) => edit({ stagger })} />
        </div>
        <ToggleRow muted label="Mask reveal" checked={!!base.mask} onChange={(mask) => edit({ mask })} />
      </div>
      <CustomAnimEditor
        target="text"
        spec={cur}
        onChange={(next) => send({ ...TXT_CUSTOM_DEFAULT, ...next, id: "custom", ...timing })}
      />
    </div>
  );

  return (
    <div
      data-vid-textanim-menu
      style={{ position: "fixed", right: pos?.right ?? 0, bottom: pos?.bottom ?? 0, visibility: pos ? "visible" : "hidden", maxHeight: "min(82vh, 820px)" }}
      className="panel-enter w-[300px] flex flex-col overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
    >
      <div className={`flex items-center h-12 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${editing ? "pl-2 gap-1" : "pl-4"}`}>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setTab("presets");
              setEditing(false);
            }}
            aria-label="Back"
            className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <CaretLeft size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
        )}
        <span className="flex-1 min-w-0 truncate text-left">
          <span className="section-title text-[#8C8C8C] dark:text-[#9A9A9A]">Text {isIn ? "enter" : "exit"} / </span>
          <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{label}</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-4 py-3 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <div className={seg}>
          {[["enter", "Enter"], ["exit", "Exit"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => onSwitch(k)} className={segBtn(kind === k)}>{l}</button>
          ))}
        </div>
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${cur ? "" : "opacity-40 pointer-events-none"}`}>
          <Scrubber compact label="Duration (ms)" value={timing.dur} min={100} max={2000} hardMax={10000} onChange={(dur) => setTiming({ dur })} />
          <Scrubber compact label="Delay (ms)" value={timing.delay} min={0} max={2000} hardMax={10000} onChange={(delay) => setTiming({ delay })} />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#E3E3E3_transparent] dark:[scrollbar-color:#333333_transparent]">
        <div className="flex flex-col gap-4 px-4 py-4">
          <TextAnimLive spec={cur} kind={kind} item={item} dims={dims} />

          {editing ? (
            // sub-view: adjust the controls of the selected preset
            <div className="fx-enter flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className={sub}>Adjust</span>
                {dirty && (
                  <button type="button" onClick={() => pick(basePreset)} className="text-[#FF47BC] hover:underline">
                    Reset
                  </button>
                )}
              </div>
              {controls}
            </div>
          ) : (
            <>
              <div className={seg}>
                <button type="button" onClick={() => setTab("presets")} className={segBtn(tab === "presets")}>Presets</button>
                <button type="button" onClick={() => setTab("custom")} className={segBtn(tab === "custom")}>Custom</button>
              </div>

              {tab === "presets" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <TextAnimTile preset={null} kind={kind} item={item} dims={dims} active={!cur} onClick={() => send(null)} />
                  </div>
                  {TXT_PRESET_GROUPS.map((g) => (
                    <div key={g} className="flex flex-col gap-2">
                      <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{g}</span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                        {TXT_PRESETS.filter((x) => x.group === g).map((pr) => (
                          <TextAnimTile
                            key={pr.id}
                            preset={pr}
                            kind={kind}
                            item={item}
                            dims={dims}
                            active={cur?.id === pr.id}
                            onClick={() => pick(pr)}
                            onEdit={() => {
                              if (cur?.id !== pr.id) pick(pr); // select it first, then open its controls
                              setEditing(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                customTab
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Closes a popover / menu on outside click or Escape. `selector` = elements that count as "inside".
function useDismissable(active, selector, onClose) {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!active) return;
    const down = (e) => {
      if (!e.target.closest?.(selector)) cb.current();
    };
    const key = (e) => e.key === "Escape" && cb.current();
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [active, selector]);
}

function VidBtn({ label, shortcut, tone = "default", children, ...rest }) {
  const tones = {
    default: "text-[#8C8C8C] dark:text-[#9A9A9A] enabled:hover:text-[#3A3A3A] dark:enabled:hover:text-[#FAF9FA]",
    strong: "text-[#8C8C8C] dark:text-[#9A9A9A]",
    pink: "text-[#FF47BC]",
    danger: "text-[#F04438]",
  };
  return (
    <Tooltip label={label} shortcut={shortcut} placement="vertical">
      <button
        type="button"
        aria-label={label}
        {...rest}
        className={`flex items-center justify-center w-8 h-8 shrink-0 rounded-lg enabled:hover:bg-black/5 dark:enabled:hover:bg-white/5 transition-[background-color,color,transform] duration-150 enabled:active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed ${tones[tone]}`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

const CTX_ITEM =
  "flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100";
const CTX_DANGER =
  "flex items-center justify-between w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438] transition-colors duration-100";
const CTX_DIVIDER = <div className="my-0.5 h-px w-full shrink-0 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />;

// Measures itself, then keeps its bottom edge at least 8px above the bottom of the window.
function CtxMenu({ left, top, width = 190, children, ...rest }) {
  const ref = useRef(null);
  const [y, setY] = useState(null);
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    setY(Math.max(8, Math.min(top, window.innerHeight - h - 8)));
  }, [top, left]);
  return (
    <div
      ref={ref}
      role="menu"
      {...rest}
      style={{ position: "fixed", left, top: y ?? top, width, visibility: y === null ? "hidden" : "visible" }}
      className="pop-enter p-2 gap-1 flex flex-col bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
    >
      {children}
    </div>
  );
}

const VT_N = 20; // frames rendered per card when hovered
const VT_W = 312, VT_H = 416;
const vtLoad = (src) =>
  new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });

// Card: a still of the device at rest, and on hover a loop of real renders along the template's camera path.
function VideoTemplateCard({ tpl, index, label, active, renderKey, renderStills, onApply }) {
  const canvasRef = useRef(null);
  const cache = useRef({ poster: null, imgs: [], frames: null });
  const stillsRef = useRef(renderStills);
  stillsRef.current = renderStills;
  const [hover, setHover] = useState(false);

  const camAt = (t) => {
    const c = sampleShots(tpl.shots, t);
    return { ...c, zoom: Math.max(0, c.zoom - 15) }; // same pull-back the other template thumbnails use
  };

  // Draws a render with the template's enter / exit pose at time t (cover-fit, same maths as the shot animation previews).
  const paint = (img, t) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, VT_W, VT_H);
    if (!img) return;
    const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = sampleDeviceAnim(tpl.shots, t) ?? {};
    const k = Math.max(VT_W / img.naturalWidth, VT_H / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    ctx.save();
    ctx.globalAlpha = vidClamp(a, 0, 1);
    ctx.translate(VT_W / 2 + x * VT_W, VT_H / 2 - y * VT_H);
    ctx.scale(Math.max(0.02, Math.abs(s * Math.cos(ry))), Math.max(0.02, Math.abs(s * Math.cos(rx))));
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  };

  // Poster. Re-renders when the device, body colour or screenshot changes.
  useEffect(() => {
    cache.current = { poster: null, imgs: [], frames: null };
    let dead = false, timer;
    const run = (n = 0) => {
      const urls = stillsRef.current([camAt(tpl.poster)]);
      if (!urls) {
        if (n < 24) timer = setTimeout(() => run(n + 1), 250); // model still loading
        return;
      }
      vtLoad(urls[0]).then((im) => {
        if (dead || !im) return;
        cache.current.poster = im;
        paint(im, tpl.poster);
      });
    };
    timer = setTimeout(run, 150 + index * 60);
    return () => {
      dead = true;
      clearTimeout(timer);
    };
  }, [renderKey, tpl.id]);

  useEffect(() => {
    const c = cache.current;
    if (!hover) {
      if (c.poster) paint(c.poster, tpl.poster);
      return;
    }
    let dead = false, raf, timer;
    const play = () => {
      const T = Math.min(tpl.duration, 5) * 1000, HOLD = 500, t0 = performance.now();
      const loop = (now) => {
        const p = Math.min(1, ((now - t0) % (T + HOLD)) / T);
        paint(c.frames[Math.round(p * (VT_N - 1))], p * tpl.duration);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    // Renders the frames in small batches so the UI stays responsive, and keeps them for the next hover.
    const build = async (tries = 0) => {
      if (dead) return;
      if (c.frames) return play();
      const have = c.imgs.length;
      const cams = Array.from({ length: Math.min(4, VT_N - have) }, (_, i) => camAt((tpl.duration * (have + i)) / (VT_N - 1)));
      const urls = stillsRef.current(cams);
      if (!urls) {
        if (tries < 24) timer = setTimeout(() => build(tries + 1), 250);
        return;
      }
      const ims = await Promise.all(urls.map(vtLoad));
      if (dead) return;
      c.imgs.push(...ims);
      if (c.imgs.length >= VT_N) c.frames = c.imgs.map((im) => im ?? c.poster);
      timer = setTimeout(() => build(0), 16);
    };
    build();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [hover, renderKey]);

  return (
    <button
      type="button"
      onClick={() => onApply(tpl)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{ animationDelay: `${Math.min(index, 5) * 30}ms` }}
      className={`template-enter group flex flex-col items-stretch gap-2 min-w-0 p-2 rounded-2xl transition-colors duration-200 ${
        active ? "bg-[#FF47BC]/10" : "hover:bg-black/[0.03] dark:hover:bg-white/5"
      }`}
    >
      <div
        className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-black transition-transform duration-200 group-hover:scale-[1.015]"
        style={(() => {
          if (!tpl.bgs) return undefined;
          const at = [...tpl.bgs].reverse().find((b) => b.at <= tpl.poster) ?? tpl.bgs[0];
          return templateBackground({ bg: at.bg });
        })()}
      >
        <canvas ref={canvasRef} width={VT_W} height={VT_H} className="absolute inset-0 w-full h-full" />
      </div>
      <span
        className={`truncate text-center leading-4 transition-colors ${
          active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// Frame-mode card: a still of the real frames at rest, and on hover a loop of renders along the template's path.
const FVT_N = 16;
function FrameVideoTemplateCard({ tpl, index, label, active, renderKey, renderStill, onApply }) {
  const canvasRef = useRef(null);
  const cache = useRef({ poster: null, frames: null });
  const stillRef = useRef(renderStill);
  stillRef.current = renderStill;
  const [hover, setHover] = useState(false);

  const paint = (src) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, VT_W, VT_H);
    if (!src) return;
    const k = Math.max(VT_W / src.width, VT_H / src.height);
    ctx.drawImage(src, (VT_W - src.width * k) / 2, (VT_H - src.height * k) / 2, src.width * k, src.height * k);
  };

  useEffect(() => {
    cache.current = { poster: null, frames: null };
    let dead = false;
    const timer = setTimeout(async () => {
      const c = await stillRef.current(tpl, tpl.poster, VT_W);
      if (dead || !c) return;
      cache.current.poster = c;
      paint(c);
    }, 150 + index * 80);
    return () => {
      dead = true;
      clearTimeout(timer);
    };
  }, [renderKey, tpl.id]);

  useEffect(() => {
    const c = cache.current;
    if (!hover) {
      if (c.poster) paint(c.poster);
      return;
    }
    let dead = false, raf;
    (async () => {
      if (!c.frames) {
        const out = [];
        for (let i = 0; i < FVT_N; i++) {
          const im = await stillRef.current(tpl, (tpl.duration * i) / (FVT_N - 1), VT_W);
          if (dead) return;
          out.push(im || c.poster);
        }
        c.frames = out;
      }
      const T = Math.min(tpl.duration, 5) * 1000, HOLD = 500, t0 = performance.now();
      const loop = (now) => {
        const p = Math.min(1, ((now - t0) % (T + HOLD)) / T);
        paint(c.frames[Math.round(p * (FVT_N - 1))]);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
    };
  }, [hover, renderKey]);

  return (
    <button
      type="button"
      onClick={() => onApply(tpl)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{ animationDelay: `${Math.min(index, 5) * 30}ms` }}
      className={`template-enter group flex flex-col items-stretch gap-2 min-w-0 p-2 rounded-2xl transition-colors duration-200 ${
        active ? "bg-[#FF47BC]/10" : "hover:bg-black/[0.03] dark:hover:bg-white/5"
      }`}
    >
      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-[#EDEDED] dark:bg-[#292929] transition-transform duration-200 group-hover:scale-[1.015]">
        <canvas ref={canvasRef} width={VT_W} height={VT_H} className="absolute inset-0 w-full h-full" />
      </div>
      <span
        className={`truncate text-center leading-4 transition-colors ${
          active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function AudioWave({ a }) {
  const n = a.peaks?.length;
  if (!n || !a.dur) return null;
  const i0 = Math.floor(((a.offset ?? 0) / a.dur) * n);
  const i1 = Math.min(n, Math.max(i0 + 1, Math.ceil((((a.offset ?? 0) + a.len) / a.dur) * n)));
  const slice = a.peaks.slice(i0, i1);
  const d = slice
    .map((p, i) => {
      const h = Math.max(0.04, p / 100);
      return `M${i + 0.5} ${1 - h}V${1 + h}`;
    })
    .join("");
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none text-[#FF47BC]/70" viewBox={`0 0 ${Math.max(1, slice.length)} 2`} preserveAspectRatio="none">
      <path d={d} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
    </svg>
  );
}

function VideoTimeline({ v }) {
  const { shots, duration, selShot, selKey, selIds, selProp, timeRef } = v;
  const [collapsed, setCollapsed] = useState(false);
  const [durHover, setDurHover] = useState(false); // shared by the ruler and tracks end-of-timeline handles
  const [tlH, setTlH] = useState(VID_H_MIN);
  const [keyState, setKeyState] = useState("none"); // "add" | "on" | "none"
  const [pending, setPending] = useState(null); // { sid, rel, props } = camera edited here, keyframe not added yet
  const [keyMenu, setKeyMenu] = useState(null); // { sid, kid, left, top }
  useEffect(() => {
    if (!keyMenu) return;
    const close = () => setKeyMenu(null);
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-key-menu]")) close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [keyMenu]);

  const [shotMenu, setShotMenu] = useState(null); // { sid, left, top }
  useEffect(() => {
    if (!shotMenu) return;
    const close = () => setShotMenu(null);
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-shot-menu]")) close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [shotMenu]);
  const [bgMenu, setBgMenu] = useState(null); // { sid, bid, left, top }
  useEffect(() => {
    if (!bgMenu) return;
    const close = () => setBgMenu(null);
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-bg-menu]")) close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [bgMenu]);

  const [bgAnimMenu, setBgAnimMenu] = useState(null); // { sid, bid }
useEffect(() => {
  if (!bgAnimMenu) return;
  const onDown = (e) => {
    if (!e.target.closest?.("[data-vid-bganim-menu],[data-vid-bg-menu],[data-popup-dropdown]")) setBgAnimMenu(null);
  };
  const onKey = (e) => e.key === "Escape" && setBgAnimMenu(null);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  return () => {
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("keydown", onKey);
  };
}, [bgAnimMenu]);

  const [animMenu, setAnimMenu] = useState(null); // { sid, kind: "enter" | "exit" }
  useEffect(() => {
    if (!animMenu) return;
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-shotanim-menu],[data-vid-anim-open]")) setAnimMenu(null);
    };
    const onKey = (e) => e.key === "Escape" && setAnimMenu(null);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [animMenu]);

    const [textMenu, setTextMenu] = useState(null); // { sid, cid, left, top }
  const [textAnimMenu, setTextAnimMenu] = useState(null); // { sid, cid, kind }
  useDismissable(!!textMenu, "[data-vid-text-menu]", () => setTextMenu(null));
  useDismissable(!!textAnimMenu, "[data-vid-textanim-menu],[data-vid-text-menu],[data-popup-dropdown]", () => setTextAnimMenu(null));

  const openAnim = (s, kind) => {
    v.onSelect(s.id, null);
    setAnimMenu((m) => (m && m.sid === s.id && m.kind === kind ? null : { sid: s.id, kind }));
  };

  // drag the inner edge of a ramp to change its duration
  const animDurDown = (s, kind) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const an = s[kind];
    const px0 = e.clientX, d0 = an.dur, sign = kind === "enter" ? 1 : -1;
    const maxMs = Math.max(100, Math.round(s.len * 1000) - an.delay);
    drag((ev) => {
      const ms = vidClamp(Math.round((d0 + sign * ((ev.clientX - px0) / pps) * 1000) / 10) * 10, 100, maxMs);
      v.onShotAnim(s.id, kind, { ...an, dur: ms }, false);
    });
  };

  // Ramps (set) or ghost chips (empty) at the two ends of a shot clip.
  const renderAnimRamps = (s, w, active, keysShown) =>
    ["enter", "exit"].map((kind) => {
      const isIn = kind === "enter";
      const an = s[kind];
      const label = isIn ? "Enter" : "Exit";
      if (an && an.id !== "none") {
        const gap = Math.min(an.delay / 1000, s.len) * pps;
        const dw = Math.max(8, Math.min(an.dur / 1000, s.len) * pps);
        return (
          <div
            key={kind}
            data-vid-anim-open
            title={`${label}: ${devAnimLabel(an.id, isIn ? "in" : "out")} · ${an.dur} ms${an.delay ? ` · delay ${an.delay} ms` : ""}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              openAnim(s, kind);
            }}
            className="group/ramp absolute inset-y-0 cursor-pointer"
            style={isIn ? { left: gap, width: dw } : { right: gap, width: dw }}
          >
            <i
              className={`absolute inset-0 rounded-[8px] pointer-events-none ${isIn ? "bg-gradient-to-r" : "bg-gradient-to-l"} ${
                active ? "from-white/70" : "from-[#FF47BC]/60"
              } to-transparent`}
            />
            <div
              onPointerDown={animDurDown(s, kind)}
              className={`absolute inset-y-0 w-2 flex items-center justify-center cursor-ew-resize ${isIn ? "right-0" : "left-0"}`}
            >
              <i className="w-0.5 h-3.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] opacity-0 group-hover/ramp:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      }
      // empty end: ghost chip, skipped when it would sit on top of a keyframe or the clip is tiny
      const nearKey = keysShown && s.keys.some((k) => (isIn ? k.t : s.len - k.t) * pps < 40);
      if (w < 96 || nearKey) return null;
      return (
        <button
          key={kind}
          type="button"
          data-vid-anim-open
          title={`Add ${label.toLowerCase()} animation`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            openAnim(s, kind);
          }}
          className={`absolute top-1/2 -translate-y-1/2 ${isIn ? "left-3" : "right-3"} flex items-center gap-0.5 h-4 pl-1 pr-1.5 rounded-[4px] border border-dashed opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity ${
            active ? "border-white/80 text-white" : "border-[#FF47BC] text-[#FF47BC]"
          }`}
        >
          <Plus size={8} weight="bold" />
          {isIn ? "In" : "Out"}
        </button>
      );
    });

  const openShotMenu = (e, s) => {
    e.preventDefault();
    e.stopPropagation();
    // keep a multi-selection if the shot is already part of it; otherwise select just this shot
    if (!selIds.includes(s.id) || (selIds.length === 1 && selKey != null)) v.onSelect(s.id, null);
    setShotMenu({
      sid: s.id,
      left: Math.min(e.clientX, window.innerWidth - 196),
      top: e.clientY,
    });
  };

  const [easeMenu, setEaseMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const nameCancelRef = useRef(false);
  const imgInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const imgTargetRef = useRef(null);
  const startRename = (s) => {
    setNameDraft(s.name);
    setEditingId(s.id);
  };
  const commitRename = () => {
    if (nameCancelRef.current) {
      nameCancelRef.current = false;
    } else {
      const name = nameDraft.trim();
      if (name && editingId != null) v.onShot(editingId, { name });
    }
    setEditingId(null);
  };

  const [textEditingId, setTextEditingId] = useState(null); // clip id
  const [textDraft, setTextDraft] = useState("");
  const textCancelRef = useRef(false);

  const [bgEditingId, setBgEditingId] = useState(null);
  const [bgDraft, setBgDraft] = useState("");
  const bgCancelRef = useRef(false);
  const bgLabel = (b, i) => b.name || `Background ${i + 1}`;
  const startBgRename = (b) => {
    setBgDraft(bgLabel(b, v.bgs.indexOf(b)));
    setBgEditingId(b.id);
  };
  const commitBgRename = () => {
    if (bgCancelRef.current) {
      bgCancelRef.current = false;
    } else {
      const name = bgDraft.trim();
      if (name && bgEditingId != null) v.onBgPatch(bgEditingId, { name });
    }
    setBgEditingId(null);
  };

  const startTextRename = (c) => {
    setTextDraft(v.textName(c.tid));
    setTextEditingId(c.id);
  };
  const commitTextRename = () => {
    if (textCancelRef.current) {
      textCancelRef.current = false;
    } else {
      const name = textDraft.trim();
      const c = v.texts.find((x) => x.id === textEditingId);
      if (name && c) v.onTextRename(c.tid, name);
    }
    setTextEditingId(null);
  };

  // Shift+click range select. The anchor is the last row clicked without Shift.
  const rowAnchorRef = useRef(null);
  const pickRow = (type, id, shift) => {
    const a = rowAnchorRef.current;
    if (shift && a) {
      const order = [
        ...shots.map((s) => ["shot", s.id]),
        ...v.bgs.map((b) => ["bg", b.id]),
        ...v.texts.map((c) => ["text", c.id]),
      ];
      const i = order.findIndex(([t, x]) => t === a.type && x === a.id);
      const j = order.findIndex(([t, x]) => t === type && x === id);
      if (i >= 0 && j >= 0) {
        const slice = order.slice(Math.min(i, j), Math.max(i, j) + 1);
        const pick = (t) => slice.filter(([k]) => k === t).map(([, x]) => x);
        v.onSelectRange({ shots: pick("shot"), bgs: pick("bg"), texts: pick("text") });
        return true; // handled
      }
    }
    rowAnchorRef.current = { type, id };
    return false;
  };
  const [viewW, setViewW] = useState(0);
  const scrollRef = useRef(null);
  const headRef = useRef(null);
  const tcRef = useRef(null);
  const cntRef = useRef(null);
  const dragId = useRef(null);
  // eased playhead: shown = what's drawn, from/to/t0 = the current tween, held = pointer still down
  const glideRef = useRef({ on: false, held: false, shown: 0, from: 0, to: 0, t0: 0 });
  const live = useRef(v);
  live.current = v;
   const rootRef = useRef(null);
const [pps, setPps] = useState(VID_PPS);
const ppsRef = useRef(pps);
ppsRef.current = pps;
const anchorRef = useRef(null); // keeps the time under the cursor fixed while zooming

const x0 = VID_LABEL_W + VID_PAD; // where 0s sits inside the scroll content
const axisW = duration * pps;
const innerW = Math.max(x0 + axisW + VID_GRAY, viewW);
// label every 1s when zoomed in, every 2s / 5s / 10s... when zoomed out so labels never crowd
const tickStep = [1, 2, 5, 10, 15, 30, 60].find((s) => s * pps >= 64) ?? 60;
const nTicks = Math.max(1, Math.floor((innerW - x0 - 20) / (pps * tickStep)) + 1);
  const unit = v.frameMode ? "frame" : "shot";
  const hasKeys = shots.some((s) => s.keys.length);

  const [openShots, setOpenShots] = useState({});
  const toggleOpen = (id) => setOpenShots((p) => ({ ...p, [id]: !p[id] }));
const [frameRow, setFrameRow] = useState(null); // { sid, prop } = selected frame property row
const FRAME_PROPS = [["x", "X - Position"], ["y", "Y - Position"], ["r", "Z - Rotation"], ["s", "Scale"]];
const rowsFor = (s) => {
  if (s.frameId != null) {
    const ks = s.keys.filter((k) => k.frames?.[s.frameId]);
    return FRAME_PROPS.map(([p, label]) => {
      const tol = p === "s" ? 1e-6 : p === "r" ? 0.01 : 1e-4;
      const vals = ks.map((k) => k.frames[s.frameId][p] ?? 0);
      // diamonds where this property starts, stops or changes; a flat property shows just its first key
      const own = ks.filter(
        (k, i) => i === 0 || i === ks.length - 1 || Math.abs(vals[i] - vals[i - 1]) > tol || Math.abs(vals[i] - vals[i + 1]) > tol
      );
      const flat = Math.max(...vals) - Math.min(...vals) < tol;
      return { key: `f:${p}`, label, frameProp: p, keys: flat ? ks.slice(0, 1) : own };
    });
  }
  return VID_PROPS
    .filter(([key]) => !(v.frameMode && key === "fov"))
    .map(([key, label]) => ({ key, label }));
};
const rowActive = (s, r) =>
  r.frameProp
    ? !!frameRow && frameRow.sid === s.id && frameRow.prop === r.frameProp && s.id === selShot && selProp === "frames"
    : (s.id === selShot ? selProp : null) === r.key;

// ---- Groups (shots with the same `group` id; 2+ members) ----
const groupInfo = {};
shots.forEach((s) => {
  if (!s.group) return;
  const g = (groupInfo[s.group] ??= { gid: s.group, name: s.groupName || "Group", ids: [], first: s.id, start: Infinity, end: 0 });
  g.ids.push(s.id);
  g.start = Math.min(g.start, s.start);
  g.end = Math.max(g.end, s.start + s.len);
});
Object.keys(groupInfo).forEach((k) => groupInfo[k].ids.length < 2 && delete groupInfo[k]);
const [closedGroups, setClosedGroups] = useState({}); // default = open
const groupOpen = (gid) => !closedGroups[gid];
const [groupEditId, setGroupEditId] = useState(null);
const [groupDraft, setGroupDraft] = useState("");
const groupCancelRef = useRef(false);
const commitGroupRename = () => {
  if (groupCancelRef.current) groupCancelRef.current = false;
  else {
    const name = groupDraft.trim();
    if (name && groupEditId != null) shots.filter((s) => s.group === groupEditId).forEach((s) => v.onShot(s.id, { groupName: name }));
  }
  setGroupEditId(null);
};
const groupSelected = (g) => g.ids.every((id) => selIds.includes(id));

// dragging the group bar moves every shot in it
const groupDown = (g) => (e) => {
  if (e.button !== 0) return;
  e.stopPropagation();
  if (v.playing) v.onPause();
  v.onSelectRange({ shots: g.ids, bgs: [], texts: [] });
  const px0 = e.clientX;
  const orig = shots.filter((s) => g.ids.includes(s.id)).map((s) => [s.id, s.start]);
  const dur = live.current.duration;
  drag((ev) => {
    const d = vidSnap(vidClamp((ev.clientX - px0) / pps, -g.start, dur - g.end));
    orig.forEach(([id, st]) => v.onShot(id, { start: +(st + d).toFixed(3) }));
  });
};

const groupLabel = (g) => {
  const sel = groupSelected(g);
  const open = groupOpen(g.gid);
  return (
    <div
      key={`g-${g.gid}`}
      onClick={() => {
        if (v.playing) v.onPause();
        v.onSelectRange({ shots: g.ids, bgs: [], texts: [] });
      }}
      onDoubleClick={() => {
        setGroupDraft(g.name);
        setGroupEditId(g.gid);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        v.onSelectRange({ shots: g.ids, bgs: [], texts: [] });
        setShotMenu({ sid: g.first, left: Math.min(e.clientX, window.innerWidth - 196), top: e.clientY });
      }}
      className={`flex items-center h-[30px] gap-1 pl-4 pr-2 cursor-pointer transition-colors duration-100 ${
        sel ? "bg-[#FF47BC]/10 text-[#FF47BC]" : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-black/[0.03] dark:hover:bg-white/5"
      }`}
    >
      <span className="w-4 shrink-0" />
      <button
        type="button"
        aria-label={open ? "Collapse group" : "Expand group"}
        onClick={(e) => {
          e.stopPropagation();
          setClosedGroups((p) => ({ ...p, [g.gid]: open }));
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center w-4 h-4 shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/10"
      >
        <CaretRight size={12} weight="bold" className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      <Stack size={14} weight="regular" className="shrink-0" />
      {groupEditId === g.gid ? (
        <input
          autoFocus
          value={groupDraft}
          onChange={(e) => setGroupDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onBlur={commitGroupRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              groupCancelRef.current = true;
              e.currentTarget.blur();
            }
          }}
          className="flex-1 min-w-0 h-5 px-1 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none leading-4 text-[#3A3A3A] dark:text-[#FAF9FA]"
        />
      ) : (
        <span className="flex-1 min-w-0 truncate leading-4 ml-1">{g.name}</span>
      )}
    </div>
  );
};

const groupTrack = (g) => {
  const sel = groupSelected(g);
  return (
    <div key={`gt-${g.gid}`} className={`relative h-[30px] ${sel ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F]"}`}>
      <div
        onPointerDown={groupDown(g)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          v.onSelectRange({ shots: g.ids, bgs: [], texts: [] });
          setShotMenu({ sid: g.first, left: Math.min(e.clientX, window.innerWidth - 196), top: e.clientY });
        }}
        className={`absolute top-0 h-[30px] rounded-[8px] border-2 border-dashed cursor-grab active:cursor-grabbing ${
          sel ? "border-[#FF47BC] bg-[#FF47BC]/20" : "border-[#8C8C8C]/40 bg-[#E3E3E3]/60 dark:bg-[#333333]/60"
        }`}
        style={{ left: VID_PAD + g.start * pps, width: (g.end - g.start) * pps }}
      >
        <span className={`absolute inset-y-0 left-3 right-3 flex items-center truncate leading-4 pointer-events-none ${sel ? "text-[#FF47BC]" : "text-[#8C8C8C]"}`}>
          {g.name}
        </span>
      </div>
    </div>
  );
};
  // Clicking a shot while playing: pause and jump to the start of that shot. Returns true if it did.
  // (name kept so the existing call sites don't change)
  const pauseToEnd = (s) => {
    if (!v.playing) return false;
    v.onPause();
    v.onSeek(s.start);
    return true;
  };

  // after a zoom, restore scroll so the same moment stays under the cursor
useLayoutEffect(() => {
  const a = anchorRef.current;
  const el = scrollRef.current;
  if (!a || !el) return;
  el.scrollLeft = x0 + a.t * pps - a.offset;
  anchorRef.current = null;
}, [pps]);

// Ctrl/Cmd + scroll (or trackpad pinch) zooms the timeline
useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const cur = ppsRef.current;
    const next = vidClamp(cur * Math.exp(-vidClamp(e.deltaY, -50, 50) * 0.01), VID_PPS_MIN, VID_PPS_MAX);
    if (next === cur) return;
    const offset = e.clientX - el.getBoundingClientRect().left;
    anchorRef.current = { t: (el.scrollLeft + offset - x0) / cur, offset };
    setPps(next);
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => el.removeEventListener("wheel", onWheel);
}, [collapsed]);

// typing a duration zooms the timeline so the whole duration fits the view
const fitToDuration = (d) => {
  const w = scrollRef.current?.clientWidth || viewW;
  if (!w) return;
  const minEnd = Math.max(1, ...live.current.shots.map((s) => s.start + s.len));
  const real = Math.min(600, Math.max(minEnd, d));
  anchorRef.current = { t: 0, offset: x0 };
  setPps(vidClamp((w - x0 - VID_GRAY) / real, VID_PPS_MIN, VID_PPS_MAX));
};

// on first open, fit the whole duration to the view
const fittedRef = useRef(false);
useLayoutEffect(() => {
  if (fittedRef.current || !viewW) return;
  fittedRef.current = true;
  setPps(vidClamp((viewW - x0 - VID_GRAY) / Math.max(1, live.current.duration), VID_PPS_MIN, VID_PPS_MAX));
}, [viewW]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, [collapsed]);

  // Playhead, timecode and counter are written straight to the DOM so playback never re-renders App.
  useEffect(() => {
    let raf;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const t = timeRef.current;
      const { shots: ss, selShot: sel, duration: d } = live.current;
      const ks = keyStateAt(ss, sel, t, live.current.selProp, live.current.playing ? null : live.current.cam);
      setKeyState((p) => (p === ks ? p : ks));

      // Camera edited at this time with no keyframe covering it: "about to be added".
      let pend = null;
      if (ks === "add" && !live.current.playing && !live.current.exporting) {
        const ps = vidShotAtTime(ss, sel, t);
        const sp = live.current.selProp;
        const rowProp = sp && sp !== "bg" ? sp : null;
        const changed = changedCamProps(ss, t, live.current.cam);
        const props = rowProp ? changed.filter((p) => p === rowProp) : changed;
        if (ps && props.length) pend = { sid: ps.id, rel: +(t - ps.start).toFixed(3), props };
      }
      const pk = (p) => (p ? `${p.sid}|${p.rel}|${p.props.join(",")}` : "");
      setPending((p) => (pk(p) === pk(pend) ? p : pend));
      // Eased playhead, only while a shot edge is being dragged. Playback and scrubbing stay 1:1.
      const g = glideRef.current;
      let shown = t;
      if (g.on && !reduce && !live.current.playing) {
        const now = performance.now();
        if (Math.abs(t - g.to) > 1e-6) {
          g.from = g.shown; // new target: restart the tween from where the playhead is drawn right now
          g.to = t;
          g.t0 = now;
        }
        g.shown = g.from + (g.to - g.from) * VID_GLIDE_EASE(Math.min(1, (now - g.t0) / VID_GLIDE_MS));
        shown = g.shown;
        if (!g.held && now - g.t0 >= VID_GLIDE_MS) g.on = false; // released and settled
      } else {
        g.on = false;
        g.shown = t;
      }
      if (headRef.current) headRef.current.style.transform = `translateX(${VID_LABEL_W + VID_PAD + shown * ppsRef.current}px)`;
      if (tcRef.current) tcRef.current.textContent = fmtTC(shown);
      if (cntRef.current) {
        const s = ss.find((x) => x.id === sel);
        const rel = s ? vidClamp(t - s.start, 0, s.len) : t;
        cntRef.current.textContent = `${rel.toFixed(1)} s  /  ${(s ? s.len : d).toFixed(1)} s`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [timeRef, collapsed]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey) return;
      const t = e.target;
      const inField = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      // Sliders and numeric scrubber boxes (the camera panel) let K, S and ⇧L through. Every other field still blocks them.
      const fromScrubber = t instanceof HTMLInputElement && (t.type === "range" || t.inputMode === "numeric");
      if (inField && !(fromScrubber && /^Key[KSL]$/.test(e.code))) return;
      const l = live.current;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === "KeyD") {
        const bgIds = l.selBg?.ids ?? [];
        const textIds = l.selText?.ids ?? [];
        if (l.selIds.length || bgIds.length || textIds.length) {
          e.preventDefault(); // also stops the browser's bookmark shortcut
          if (l.selIds.length) l.onDuplicate();
          bgIds.forEach((id) => l.onBgDuplicate(id));
          textIds.forEach((id) => l.onTextDuplicate(id));
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.code === "KeyG") {
        e.preventDefault(); // also stops the browser's find-next
        if (e.shiftKey) l.onUngroup();
        else if (l.selIds.length >= 2) l.onGroup();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;

      // Shift + arrows: move the selected keyframe 10 frames (playhead follows), or the playhead if no keyframe is selected
      if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const shot = l.shots.find((s) => s.id === l.selShot);
        const key = shot?.keys.find((k) => k.id === l.selKey);
        if (shot && key) {
          l.onKeyMove(shot.id, key.id, vidSnap(vidClamp(key.t + (dir * 10) / VID_FPS, 0, shot.len)));
        } else {
          l.onStep(dir * 10);
        }
        return;
      }

      if (e.code === "KeyK" && !e.repeat) {
        e.preventDefault();
        if (l.exporting) return;
        const state = keyStateAt(l.shots, l.selShot, l.timeRef.current, l.selProp, l.playing ? null : l.cam);
        // K adds (only if there's no keyframe here), Shift+K removes (only if there is one)
        if (e.shiftKey ? state === "on" : state === "add") l.onAddKey();
        return;
      }
      if (e.code === "KeyL" && e.shiftKey && !e.repeat) { e.preventDefault(); l.onLoop(); return; }
      if (e.code === "KeyS" && !e.shiftKey && !e.repeat) { e.preventDefault(); if (!l.exporting) l.onAddShot(); return; }

      if (e.code === "Space" && !t.closest?.("button")) { e.preventDefault(); l.onTogglePlay(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); l.onStep(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); l.onStep(1); }
      else if ((e.key === "Delete" || e.key === "Backspace") && (l.selIds.length || l.selBg || l.selText || l.selAudio)) { e.preventDefault(); l.onDelete(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!easeMenu) return;
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-ease-menu],[data-vid-ease-btn]")) setEaseMenu(null);
    };
    const onKey = (e) => e.key === "Escape" && setEaseMenu(null);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [easeMenu]);

const timeAt = (e) => {
  const el = scrollRef.current;
  const r = el.getBoundingClientRect();
  return vidClamp((e.clientX - r.left + el.scrollLeft - x0) / ppsRef.current, 0, live.current.duration);
};
  const drag = (fn) => {
    const up = () => {
      window.removeEventListener("pointermove", fn);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", fn);
    window.addEventListener("pointerup", up);
  };
  const scrub = (e) => {
    if (e.button !== 0) return;
    glideRef.current.on = false; // dragging the playhead itself should never lag
    v.onSeek(timeAt(e));
    drag((ev) => v.onSeek(timeAt(ev)));
  };

  // ---- Multi-selection drag: every selected shot / background / text moves or resizes together ----
  const multiPicked = () => {
    const L = live.current;
    return [
      ...L.shots.filter((s) => L.selIds.includes(s.id)).map((s) => ({ type: "shot", id: s.id, start: s.start, len: s.len, keys: s.keys })),
      ...L.bgs.filter((b) => L.selBg?.ids?.includes(b.id)).map((b) => ({ type: "bg", id: b.id, start: b.start, len: b.len })),
      ...L.texts.filter((c) => L.selText?.ids?.includes(c.id)).map((c) => ({ type: "text", id: c.id, start: c.start, len: c.len })),
    ];
  };
  const isInMulti = (type, id) => {
    const p = multiPicked();
    return p.length > 1 && p.some((x) => x.type === type && x.id === id);
  };
  const startMulti = (e, type, id, mode) => {
    const items = multiPicked();
    const anchor = items.find((x) => x.type === type && x.id === id);
    if (items.length < 2 || !anchor) return false;
    const g = glideRef.current;
    g.on = true;
    g.held = true;
    g.shown = timeRef.current;
    g.from = g.shown;
    g.to = g.shown;
    g.t0 = performance.now();
    const px0 = e.clientX;
    const dur = live.current.duration;
    const patch = (it, p) =>
      it.type === "shot" ? v.onShot(it.id, p) : it.type === "bg" ? v.onBgPatch(it.id, p) : v.onTextPatch(it.id, p);
    drag((ev) => {
      let d = (ev.clientX - px0) / pps;
      if (mode === "move") d = vidClamp(d, -Math.min(...items.map((i) => i.start)), dur - Math.max(...items.map((i) => i.start + i.len)));
      else if (mode === "r") d = vidClamp(d, Math.max(...items.map((i) => 0.2 - i.len)), Math.min(...items.map((i) => dur - i.start - i.len)));
      else d = vidClamp(d, -Math.min(...items.map((i) => i.start)), Math.min(...items.map((i) => i.len - 0.2)));
      d = vidSnap(d);
      items.forEach((it) => {
        if (mode === "move") patch(it, { start: Math.max(0, +(it.start + d).toFixed(3)) });
        else if (mode === "r") patch(it, { len: +(it.len + d).toFixed(3) });
        else {
          const start = Math.max(0, +(it.start + d).toFixed(3));
          const len = +(it.len - d).toFixed(3);
          patch(it, it.type === "shot"
            ? { start, len, keys: it.keys.map((k) => ({ ...k, t: vidClamp(k.t - d, 0, len) })) }
            : { start, len });
        }
      });
      v.onPlayhead(mode === "r" ? anchor.start + anchor.len + d : anchor.start + d); // playhead rides the dragged edge
    });
    const done = () => {
      window.removeEventListener("pointerup", done);
      glideRef.current.held = false;
      v.onSeek(timeRef.current);
    };
    window.addEventListener("pointerup", done);
    return true;
  };

  // mode: "move" | "l" | "r"
const clipDown = (s, mode) => (e) => {
  e.stopPropagation();
  const inMulti = !e.shiftKey && isInMulti("shot", s.id); // grabbing a selected clip keeps the whole selection
  if (!inMulti && !pickRow("shot", s.id, e.shiftKey)) v.onSelect(s.id, null, e.shiftKey);
  pauseToEnd(s);
  if (e.shiftKey) return; // shift+click only toggles selection, no drag
  if (inMulti && startMulti(e, "shot", s.id, mode)) return;
  const g = glideRef.current;
  g.on = true;
  g.held = true;
  g.shown = timeRef.current;
  g.from = g.shown;
  g.to = g.shown;
  g.t0 = performance.now();
  const px0 = e.clientX, st0 = s.start, len0 = s.len, keys0 = s.keys;
  drag((ev) => {
    const d = (ev.clientX - px0) / pps;
    const dur = live.current.duration;
    if (mode === "move") {
      const start = vidSnap(vidClamp(st0 + d, 0, dur - len0));
      v.onShot(s.id, { start });
      v.onPlayhead(start); // playhead rides the shot's start
    } else if (mode === "r") {
      const len = vidSnap(vidClamp(len0 + d, 0.2, dur - st0));
      v.onShot(s.id, { len });
      v.onPlayhead(st0 + len); // playhead rides the end edge
    } else {
      const start = vidSnap(vidClamp(st0 + d, 0, st0 + len0 - 0.2));
      const len = st0 + len0 - start;
v.onShot(s.id, {
  start,
  len,
  keys: keys0.map((k) => ({ ...k, t: vidClamp(k.t - (start - st0), 0, len) })),
});
      v.onPlayhead(start); // playhead rides the start edge
    }
  });
  // on release, sync the camera to where the playhead ended up. The glide finishes on its own.
  const done = () => {
    window.removeEventListener("pointerup", done);
    glideRef.current.held = false;
    v.onSeek(timeRef.current);
  };
  window.addEventListener("pointerup", done);
};
const keyDown = (s, k, prop = null) => (e) => {
  if (e.button !== 0) {
    e.stopPropagation();
    return;
  }
  e.stopPropagation();
  if (v.playing) v.onPause();
  v.onSelect(s.id, k.id, false, prop);
  v.onSeek(s.start + k.t);
  const px0 = e.clientX, t0 = k.t;
  const shared = !!prop && (!k.props || k.props.length > 1); // drives other properties too
  let kid = k.id, split = false;
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `* { cursor: grabbing !important; }`;
  document.head.appendChild(styleEl);
  const stop = () => {
    styleEl.remove();
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointerup", stop);
  drag((ev) => {
    const dx = ev.clientX - px0;
    if (shared && !split) {
      if (Math.abs(dx) < 3) return; // a click isn't a drag
      split = true;
      kid = v.onKeySplit(s.id, k.id, prop) ?? k.id;
      v.onSelect(s.id, kid, false, prop);
    }
    v.onKeyMove(s.id, kid, vidSnap(vidClamp(t0 + dx / pps, 0, s.len)));
  });
};
const durDown = (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const px0 = e.clientX, d0 = live.current.duration;
  drag((ev) => v.onDuration(d0 + (ev.clientX - px0) / pps));
};
// mode: "move" | "l" | "r". c.start / c.len are absolute seconds.
const clipRowDown = (c, mode, select, patchFn, type) => (e) => {
  e.stopPropagation();
  if (e.button !== 0) return;
  if (v.playing) v.onPause();
  const inMulti = !e.shiftKey && isInMulti(type, c.id);
  if (!inMulti) select(e.shiftKey);
  if (e.shiftKey) return; // shift+click only toggles selection, no drag
  if (inMulti && startMulti(e, type, c.id, mode)) return;
  const g = glideRef.current;
  g.on = true;
  g.held = true;
  g.shown = timeRef.current;
  g.from = g.shown;
  g.to = g.shown;
  g.t0 = performance.now();
  const px0 = e.clientX, s0 = c.start, len0 = c.len;
  drag((ev) => {
    const d = (ev.clientX - px0) / pps;
    const dur = live.current.duration;
    if (mode === "move") {
      const start = vidSnap(vidClamp(s0 + d, 0, Math.max(0, dur - len0)));
      patchFn({ start });
      v.onPlayhead(start); // playhead rides the clip's start
    } else if (mode === "r") {
      const len = vidSnap(vidClamp(len0 + d, 0.2, Math.max(0.2, dur - s0)));
      patchFn({ len });
      v.onPlayhead(s0 + len); // playhead rides the end edge
    } else {
      const start = vidSnap(vidClamp(s0 + d, 0, s0 + len0 - 0.2));
      patchFn({ start, len: +(s0 + len0 - start).toFixed(3) });
      v.onPlayhead(start); // playhead rides the start edge
    }
  });
  // on release, sync the scene to where the playhead ended up. The glide finishes on its own.
  const done = () => {
    window.removeEventListener("pointerup", done);
    glideRef.current.held = false;
    v.onSeek(timeRef.current);
  };
  window.addEventListener("pointerup", done);
};
const bgDown = (b, mode) =>
  clipRowDown(b, mode, (add) => { if (!pickRow("bg", b.id, add)) v.onBgSelect(b.id, add); }, (p) => v.onBgPatch(b.id, p), "bg");
const textDown = (c, mode) =>
  clipRowDown(c, mode, (add) => { if (!pickRow("text", c.id, add)) v.onTextSelect(c.id, add); }, (p) => v.onTextPatch(c.id, p), "text");
const audioDown = (c, mode) =>
  clipRowDown(c, mode, () => v.onAudioSelect(c.id), (p) => v.onAudioPatch(c.id, p), "audio");

const rowLabel = (key, text, selected, onClick, onContext, Icon, rename, hide) => (
  <div
    key={key}
    onClick={onClick}
    onDoubleClick={rename?.start}
    onContextMenu={onContext}
    className={`group fx-enter flex items-center h-[30px] gap-1 pl-4 pr-2 cursor-pointer transition-colors duration-100 ${
      selected
        ? "bg-[#FF47BC]/10 text-[#FF47BC]"
        : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#FF47BC]/5"
    }`}
  >
    <DotsSixVertical
      size={16}
      weight="regular"
      className={`shrink-0 cursor-grab ${selected ? "text-[#FF47BC]" : "text-[#949494]"}`}
    />
    <span className="flex items-center justify-center w-4 h-4 shrink-0">
      <Icon size={14} weight="regular" />
    </span>
    {rename?.editing ? (
      <input
        autoFocus
        value={rename.draft}
        onChange={(e) => rename.setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onBlur={rename.commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            rename.cancel();
            e.currentTarget.blur();
          }
        }}
        className="flex-1 min-w-0 h-5 px-1 -mx-1 ml-0 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none leading-4 text-[#3A3A3A] dark:text-[#FAF9FA]"
      />
    ) : (
      <span className={`flex-1 min-w-0 truncate leading-4 ml-1 ${hide?.hidden ? "opacity-50" : ""}`}>{text}</span>
    )}
    {hide && (
      <Tooltip label={hide.hidden ? "Show" : "Hide"} placement="bottom" className="shrink-0 ml-auto">
        <button
          type="button"
          aria-label={hide.hidden ? "Show" : "Hide"}
          onClick={(e) => {
            e.stopPropagation();
            hide.toggle();
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94]"
        >
          {hide.hidden ? (
            <EyeSlash size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
          ) : (
            <Eye size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
          )}
        </button>
      </Tooltip>
    )}
  </div>
);

// Enter / exit ramp for a text clip (same look as the shot ramps)
const textRamp = (c, kind) => {
  const an = c[kind];
  if (!an || an.id === "none") return null;
  const isIn = kind === "enter";
  const gap = Math.min(an.delay / 1000, c.len) * pps;
  const dw = Math.max(8, Math.min(an.dur / 1000, c.len) * pps);
  const maxMs = Math.max(100, Math.round(c.len * 1000) - an.delay);
  const durDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const px0 = e.clientX, d0 = an.dur, sign = isIn ? 1 : -1;
    drag((ev) => {
      const ms = vidClamp(Math.round((d0 + sign * ((ev.clientX - px0) / pps) * 1000) / 10) * 10, 100, maxMs);
      v.onTextPatch(c.id, { [kind]: { ...an, dur: ms } });
    });
  };
  return (
    <div
      key={kind}
      title={`${isIn ? "Enter" : "Exit"} · ${an.dur} ms${an.delay ? ` · delay ${an.delay} ms` : ""}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        setTextAnimMenu({ cid: c.id, kind });
      }}
      className="group/ramp absolute inset-y-0 cursor-pointer"
      style={isIn ? { left: gap, width: dw } : { right: gap, width: dw }}
    >
      <i className={`absolute inset-0 rounded-[8px] pointer-events-none ${isIn ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-[#FF47BC]/60 to-transparent`} />
      <div onPointerDown={durDown} className={`absolute inset-y-0 w-2 flex items-center justify-center cursor-ew-resize ${isIn ? "right-0" : "left-0"}`}>
        <i className="w-0.5 h-3.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] opacity-0 group-hover/ramp:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

const renderTextClip = (c) => {
  const selected = !!v.selText?.ids?.includes(c.id);
  const hidden = v.textHidden(c.tid);
  return (
    <div
      onPointerDown={textDown(c, "move")}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setTextAnimMenu({ cid: c.id, kind: "enter" });
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        v.onTextSelect(c.id);
        setTextMenu({
          cid: c.id,
          left: Math.min(e.clientX, window.innerWidth - 196),
          top: e.clientY,
        });
      }}
className={`group absolute top-0 h-[30px] rounded-[8px] overflow-hidden cursor-grab active:cursor-grabbing bg-[#FF47BC]/20 hover:bg-[#FF47BC]/25 ${hidden ? "opacity-40" : ""}`}
      style={{ left: VID_PAD + c.start * pps, width: c.len * pps }}
    >
      {textRamp(c, "enter")}
      {textRamp(c, "exit")}
<span className="absolute inset-y-0 left-3 right-3 flex items-center truncate leading-4 pointer-events-none text-[#FF47BC]">
        {v.textLabel(c.tid)}
      </span>
      {[["l", "left-0"], ["r", "right-0"]].map(([m, side]) => (
        <div key={m} onPointerDown={textDown(c, m)} className={`group/h absolute ${side} inset-y-0 w-2.5 flex items-center justify-center cursor-ew-resize`}>
          <i className={`w-0.5 h-4 rounded-full bg-[#FF47BC] transition-opacity ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`} />
        </div>
      ))}
    </div>
  );
};

  const resizeDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const y0 = e.clientY, h0 = tlH;
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `* { cursor: ns-resize !important; }`;
    document.head.appendChild(styleEl);
    const stop = () => {
      styleEl.remove();
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointerup", stop);
    drag((ev) => setTlH(vidClamp(h0 + (y0 - ev.clientY), VID_H_MIN, Math.min(VID_H_MAX, window.innerHeight * 0.6))));
  };

const openEase = (e, sid, kid, prop = null) => {
  e.stopPropagation();
  if (easeMenu && easeMenu.sid === sid && easeMenu.kid === kid && (easeMenu.prop ?? null) === prop)
    return setEaseMenu(null);
  const r = e.currentTarget.getBoundingClientRect();
  setEaseMenu({ sid, kid, prop, bottom: r.bottom });
};

  return (
    <div ref={rootRef} data-tour="timeline" className="order-last mt-2 shrink-0 rounded-3xl bg-[#FAF9FA] dark:bg-[#171717] flex flex-col overflow-hidden select-none">
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && f.type.startsWith("image/") && imgTargetRef.current != null) v.onShotImg(imgTargetRef.current, f);
          e.target.value = "";
        }}
      />
{!collapsed && (
  <div onPointerDown={resizeDown} className="group/rs h-2 shrink-0 flex items-center justify-center cursor-ns-resize">
    <i className="w-10 h-1 rounded-full bg-[#D0D0D0] dark:bg-[#45454C] group-hover/rs:bg-[#FF47BC] transition-colors" />
  </div>
)}
{/* Toolbar */}
<div className="flex items-center px-4 py-3 gap-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#222222]/10 dark:border-[#FAF9FA]/10">
  <div data-tour="timeline-actions" className="flex flex-1 items-center gap-1 min-w-0">
    <VidBtn label={`Add ${unit}`} shortcut={["S"]} onClick={v.onAddShot} disabled={v.exporting}><Plus size={16} weight="bold" /></VidBtn>
    <VidBtn
      label={keyState === "on" ? "Remove keyframe" : "Add keyframe"}
      shortcut={keyState === "on" ? ["⇧", "K"] : ["K"]}
      tone={keyState === "add" ? "pink" : "default"}
      onClick={v.onAddKey}
      disabled={v.exporting || keyState === "none" || keyState === "idle"}
    >
      <Diamond size={16} weight={keyState === "add" ? "fill" : "bold"} className={pending ? "key-pending" : ""} />
    </VidBtn>
<VidBtn label="Add background" onClick={v.onAddBg} disabled={v.exporting}>
      <Palette size={16} weight="bold" />
    </VidBtn>
    <VidBtn label="Loop" shortcut={["⇧", "L"]} tone={v.loop ? "pink" : "default"} onClick={v.onLoop}><ArrowsCounterClockwise size={16} weight="bold" /></VidBtn>
    {(selIds.length > 0 || v.selBg || v.selText || v.selAudio) && (
      <VidBtn label="Delete" tone="danger" shortcut={["⌫"]} onClick={v.onDelete} disabled={v.exporting}>
        <TrashSimple size={16} weight="bold" />
      </VidBtn>
    )}
  </div>

  <div data-tour="timeline-playback" className="flex items-center gap-2 shrink-0">
    <VidBtn label="Previous marker" tone="strong" onClick={() => v.onSkip(-1)}><SkipBack size={16} weight="bold" /></VidBtn>
    <VidBtn label={v.playing ? "Pause" : "Play"} tone="pink" shortcut={["Space"]} onClick={v.onTogglePlay} disabled={!hasKeys || v.exporting}>
      {v.playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
    </VidBtn>
    <VidBtn label="Next marker" tone="strong" onClick={() => v.onSkip(1)}><SkipForward size={16} weight="bold" /></VidBtn>
  </div>

  <div data-tour="timeline-duration" className="flex flex-1 items-center justify-end gap-4 min-w-0">
    <div className="flex items-center gap-2">
      <span ref={cntRef} className="tabular-nums whitespace-pre text-[#8C8C8C] dark:text-[#9A9A9A]" />
      <div className="w-[72px]">
        <OffsetField unit="s" value={Math.round(duration * 10) / 10} min={1} max={600} className="h-8" onChange={(d) => { v.onDuration(d); fitToDuration(d); }} />
      </div>
    </div>
    <div className="flex items-center gap-1">
      <VidBtn label="Add audio" onClick={() => audioInputRef.current?.click()} disabled={v.exporting}>
        <MusicNoteSimple size={16} weight="bold" />
      </VidBtn>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) v.onAudioAdd(f);
          e.target.value = "";
        }}
      />
      <VidBtn label={collapsed ? "Expand timeline" : "Collapse timeline"} onClick={() => setCollapsed((c) => !c)}>
        <CaretDown size={16} weight="bold" style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }} className="transition-transform duration-200" />
      </VidBtn>
    </div>
  </div>
</div>

{!collapsed && (
  <div className="relative">
    {/* Full-height divider between the names column and the tracks */}
    <div
      aria-hidden
      className="absolute top-0 bottom-0 z-[25] w-px pointer-events-none bg-[#222222]/10 dark:bg-[#FAF9FA]/10"
      style={{ left: VID_LABEL_W - 1 }}
    />
    <div ref={scrollRef} style={{ height: tlH }} className="relative overflow-auto custom-scroll">
      <div className="relative" style={{ width: innerW, minHeight: "100%" }}>

    {/* Ruler */}
    <div
      data-tour="timeline-ruler"
      onPointerDown={scrub}
      className="sticky top-0 z-10 h-[29px] shrink-0 cursor-pointer bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#222222]/10 dark:border-[#FAF9FA]/10"
    >
        {/* gray past the end of the duration, behind the labels and dots */}
<div
  className="absolute top-0 bottom-0 right-0 pointer-events-none bg-[#F0F0F0] dark:bg-[#1F1F1F]"
  style={{ left: x0 + axisW }}
/>
{/* drag the end of the timeline from the time row too */}
<div
  onPointerDown={durDown}
  onPointerEnter={() => setDurHover(true)}
  onPointerLeave={() => setDurHover(false)}
  className="absolute top-0 bottom-0 w-2 z-[12] flex justify-center cursor-ew-resize"
  style={{ left: x0 + axisW - 4 }}
>
  <i className={`w-px h-full transition-colors ${durHover ? "bg-[#FF47BC]" : "bg-transparent"}`} />
</div>
<div
  className="sticky left-0 z-10 h-full bg-[#FAF9FA] dark:bg-[#171717]"
  style={{ width: VID_LABEL_W }}
/>
{Array.from({ length: nTicks }, (_, i) => {
  const s = i * tickStep;
  return (
    <React.Fragment key={i}>
      <span
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 leading-3 tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]"
        style={{ left: x0 + s * pps }}
      >
        {s}s
      </span>
      {/* 3 dots = quarter steps (.25, .5, .75). The 4th quarter is the next label. */}
      {[1, 2, 3].map((j) => {
        const left = x0 + (s + (j / 4) * tickStep) * pps - 1;
        return left < innerW ? (
          <i key={j} className="absolute top-1/2 -mt-px w-0.5 h-0.5 bg-[#B9B9B9] dark:bg-[#555]" style={{ left }} />
        ) : null;
      })}
    </React.Fragment>
  );
})}
      </div>

      <div className="flex">
        {/* Shot names */}
<div
  data-tour="timeline-names"
  className="sticky left-0 z-20 shrink-0 flex flex-col gap-1 pt-2 pb-4 bg-[#FAF9FA] dark:bg-[#171717]"
  style={{ width: VID_LABEL_W }}
>
          {shots.map((s) => {
            const gi = groupInfo[s.group];
            const header = gi && gi.first === s.id ? groupLabel(gi) : null;
            if (gi && !groupOpen(gi.gid)) return header ? <React.Fragment key={s.id}>{header}</React.Fragment> : null;
            const sel = selIds.includes(s.id);
            const isOpen = !!openShots[s.id];
            const activeProp = s.id === selShot ? selProp : null;
            const parentActive = sel && !activeProp;
            return (
              <React.Fragment key={s.id}>
              {header}
              <div className="flex flex-col gap-1">
                <div
                  draggable={editingId !== s.id}
                  onDoubleClick={() => startRename(s)}
                  onContextMenu={(e) => openShotMenu(e, s)}
                  onDragStart={(e) => {
                    dragId.current = s.id;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(s.id));
                  }}
                  onDragEnter={() => dragId.current != null && dragId.current !== s.id && v.onReorder(dragId.current, s.id)}
                  onDragOver={(e) => dragId.current != null && e.preventDefault()}
                  onDragEnd={() => (dragId.current = null)}
                  onClick={(e) => {
                    if (pickRow("shot", s.id, e.shiftKey)) return;
                    v.onSelect(s.id, null, e.shiftKey);
                    pauseToEnd(s);
                  }}
                  className={`group flex items-center h-[30px] gap-1 ${gi ? "pl-8" : "pl-4"} pr-2 cursor-pointer transition-colors duration-100 ${
                    parentActive
                      ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                      : sel
                      ? "bg-[#FF47BC]/5 text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#FF47BC]/10"
                      : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-black/[0.03] dark:hover:bg-white/5"
                  }`}
                >
                  <DotsSixVertical
                    size={16}
                    weight="regular"
                    className={`shrink-0 cursor-grab ${parentActive ? "text-[#FF47BC]" : "text-[#949494]"}`}
                  />
                  <button
                    type="button"
                    aria-label={isOpen ? `Collapse ${unit}` : `Expand ${unit}`}
                    aria-expanded={isOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOpen(s.id);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-4 h-4 shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <CaretRight size={12} weight="bold" className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {editingId === s.id ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                          nameCancelRef.current = true;
                          e.currentTarget.blur();
                        }
                      }}
                      className="flex-1 min-w-0 h-5 px-1 -mx-1 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none leading-4 text-[#3A3A3A] dark:text-[#FAF9FA]"
                    />
                  ) : (
                    <>
                      {(() => {
                        const fr = s.frameId != null ? v.frames?.find((f) => f.id === s.frameId) : null;
                        const thumb = s.img?.thumb ?? fr?.thumb;
                        return thumb ? (
                          <span
                            title={s.img?.label ?? fr?.label}
                            className="w-4 h-4 shrink-0 rounded-[4px] bg-cover bg-center border border-[#3A3A3A]/10"
                            style={{ backgroundImage: `url(${thumb})` }}
                          />
                        ) : null;
                      })()}
                      <span className={`flex-1 min-w-0 truncate leading-4 ${s.hidden ? "opacity-50" : ""}`}>{s.name}</span>
                    </>
                  )}
<Tooltip label={s.hidden ? `Show ${unit}` : `Hide ${unit}`} placement="bottom" className="shrink-0 ml-auto">
  <button
    type="button"
    aria-label={s.hidden ? `Show ${unit}` : `Hide ${unit}`}
    onClick={(e) => {
      e.stopPropagation();
      v.onShot(s.id, { hidden: !s.hidden });
    }}
    onDoubleClick={(e) => e.stopPropagation()}
    className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94]"
  >
    {s.hidden ? (
      <EyeSlash size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
    ) : (
      <Eye size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
    )}
  </button>
</Tooltip>
                </div>

                {isOpen &&
                  rowsFor(s).map((r) => (
                    <div
                      key={r.key}
                      onClick={(e) => {
                        setFrameRow(r.frameProp ? { sid: s.id, prop: r.frameProp } : null);
                        v.onSelect(s.id, null, e.shiftKey, r.frameProp ? "frames" : r.key);
                        pauseToEnd(s);
                      }}
                      style={{ paddingLeft: gi ? 64 : 48 }}
                      className={`fx-enter flex items-center h-[30px] gap-2 pr-2 cursor-pointer transition-colors duration-100 ${
                        rowActive(s, r)
                          ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                          : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-[#FF47BC]/5"
                      }`}
                    >
                      <span className="truncate leading-4">{r.label}</span>
                    </div>
                  ))}
              </div>
              </React.Fragment>
            );
          })}
          {v.bgs.map((b, i) =>
  rowLabel(
    `bg-${b.id}`,
    bgLabel(b, i),
    !!v.selBg?.ids?.includes(b.id),
    (e) => {
      if (v.playing) v.onPause();
      if (!pickRow("bg", b.id, e.shiftKey)) v.onBgSelect(b.id, e.shiftKey);
    },
    (e) => {
      e.preventDefault();
      if (!v.selBg?.ids?.includes(b.id)) v.onBgSelect(b.id);
      setBgMenu({ bid: b.id, left: Math.min(e.clientX, window.innerWidth - 226), top: Math.min(e.clientY, window.innerHeight - 124) });
    },
    Palette,
    {
      editing: bgEditingId === b.id,
      draft: bgDraft,
      setDraft: setBgDraft,
      commit: commitBgRename,
      cancel: () => { bgCancelRef.current = true; },
      start: () => startBgRename(b),
    },
    { hidden: !!b.hidden, toggle: () => v.onBgToggleHidden(b.id) }
  )
)}
{v.texts.map((c) =>
  rowLabel(
    `tx-${c.id}`,
    v.textName(c.tid),
    !!v.selText?.ids?.includes(c.id),
    (e) => {
      if (v.playing) v.onPause();
      if (!pickRow("text", c.id, e.shiftKey)) v.onTextSelect(c.id, e.shiftKey);
    },
    (e) => {
      e.preventDefault();
      if (!v.selText?.ids?.includes(c.id)) v.onTextSelect(c.id);
      setTextMenu({ cid: c.id, left: Math.min(e.clientX, window.innerWidth - 196), top: e.clientY, });
    },
    TextT,
    {
      editing: textEditingId === c.id,
      draft: textDraft,
      setDraft: setTextDraft,
      commit: commitTextRename,
      cancel: () => { textCancelRef.current = true; },
      start: () => startTextRename(c),
    },
    { hidden: v.textHidden(c.tid), toggle: () => v.onTextToggleHidden(c.tid) }
  )
)}
{v.audios.map((a) =>
  rowLabel(
    `au-${a.id}`,
    a.name,
    v.selAudio?.aid === a.id,
    () => {
      if (v.playing) v.onPause();
      v.onAudioSelect(a.id);
    },
    undefined,
    MusicNoteSimple,
    undefined,
    { hidden: !!a.muted, toggle: () => v.onAudioPatch(a.id, { muted: !a.muted }) } // eye = mute
  )
)}
        </div>

        {/* Tracks */}
        <div data-tour="timeline-tracks" onPointerDown={scrub} className="relative flex-1 flex flex-col gap-1 pt-2 pb-4 cursor-pointer">
          {shots.map((s) => {
            const gi = groupInfo[s.group];
            const header = gi && gi.first === s.id ? groupTrack(gi) : null;
            if (gi && !groupOpen(gi.gid)) return header ? <React.Fragment key={s.id}>{header}</React.Fragment> : null;
            const sel = selIds.includes(s.id);
            const w = s.len * pps;
            const isOpen = !!openShots[s.id];
            const activeProp = s.id === selShot ? selProp : null;
            const parentActive = sel && !activeProp;
            return (
              <React.Fragment key={s.id}>
              {header}
              <div className="flex flex-col gap-1">
                <div
                  className={`relative h-[30px] ${parentActive ? "bg-[#FF47BC]/10" : sel ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F]"}`}
                  onPointerDown={(e) => {
                    if (!pickRow("shot", s.id, e.shiftKey)) v.onSelect(s.id, null, e.shiftKey);
                    pauseToEnd(s);
                    e.stopPropagation(); // keep the scrub from overriding the jump to the shot's initial state
                  }}
                  onContextMenu={(e) => openShotMenu(e, s)}
                >
                  <div
                    onPointerDown={clipDown(s, "move")}
                    className={`group absolute top-0 h-[30px] rounded-[8px] cursor-grab active:cursor-grabbing ${s.hidden ? "opacity-40" : ""} ${
                      parentActive
                        ? "bg-[#FF47BC] border border-[#FF47BC]"
                        : sel
                        ? "bg-[#FF47BC]/20"
                        : "bg-[#E3E3E3] dark:bg-[#333333]"
                    }`}
                    style={{ left: VID_PAD + s.start * pps, width: w }}
                  >
                    {renderAnimRamps(s, w, parentActive, sel && !isOpen)}
                    {[["l", "left-0"], ["r", "right-0"]].map(([m, side]) => (
                      <div
                        key={m}
                        onPointerDown={clipDown(s, m)}
                        className={`group/h absolute ${side} inset-y-0 w-2.5 flex items-center justify-center cursor-ew-resize`}
                      >
<i
  className={`w-0.5 h-4 rounded-full transition-[opacity,background-color] ${
    parentActive
      ? "bg-white opacity-100"
      : `${sel || isOpen ? "bg-[#FF47BC]" : "bg-[#8C8C8C] dark:bg-[#9A9A9A]"} opacity-0 group-hover:opacity-100 group-active/h:bg-[#FF47BC]`
  }`}
/>
                      </div>
                    ))}
{sel && !isOpen && (() => {
  const kx = (k) => vidClamp(k.t * pps, 15, Math.max(15, w - 15));
  return (
    <>
      {/* lines + easing button between consecutive keyframes (all properties) */}
      {s.keys.slice(0, -1).map((k, i) => {
        const x1 = kx(k), x2 = kx(s.keys[i + 1]);
        return (
          <React.Fragment key={`seg-${k.id}`}>
            <i
              className="absolute top-1/2 h-px bg-[#FAF9FA]/70 pointer-events-none"
              style={{ left: x1 + 9, width: Math.max(0, x2 - x1 - 18) }}
            />
            {x2 - x1 >= 44 && (
              <button
                type="button"
                data-vid-ease-btn
                aria-label="Easing"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => openEase(e, s.id, k.id, null)}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md border border-[#FF47BC] bg-[#FAF9FA] text-[#FF47BC] hover:!bg-[#FAD8EF] transition-[opacity,background-color] focus-visible:opacity-100 ${
                  easeMenu && easeMenu.sid === s.id && easeMenu.kid === k.id && !easeMenu.prop
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                style={{ left: (x1 + x2) / 2 }}
              >
                <EaseIcon size={12} />
              </button>
            )}
          </React.Fragment>
        );
      })}

      {/* keyframes */}
      {s.keys.map((k) => (
        <div
          key={k.id}
          onPointerDown={keyDown(s, k)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            v.onSelect(s.id, k.id);
            setKeyMenu({
              sid: s.id,
              kid: k.id,
              left: Math.min(e.clientX, window.innerWidth - 196),
              top: e.clientY,
            });
          }}
          className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ left: kx(k) }}
          title={fmtTC(s.start + k.t)}
        >
          <Diamond size={14} weight={k.id === selKey || keyMenu?.kid === k.id ? "fill" : "bold"} className={`text-[#FAF9FA] transition-transform ${k.id === selKey ? "scale-125" : ""}`} />
        </div>
      ))}
    </>
  );
})()}
                    {pending?.sid === s.id && (
                      <i
                        aria-hidden
                        className="key-pending absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-[#FF47BC] bg-[#FAF9FA] pointer-events-none"
                        style={{ left: vidClamp(pending.rel * pps, 15, Math.max(15, w - 15)) }}
                      />
                    )}
                  </div>
                </div>

                {isOpen &&
                  rowsFor(s).map((r) => (
<div
  key={r.key}
  className={`group/track fx-enter relative h-[30px] transition-colors duration-100 ${
    rowActive(s, r) ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F] hover:bg-[#FF47BC]/5"
  }`}
  onPointerDown={(e) => {
    setFrameRow(r.frameProp ? { sid: s.id, prop: r.frameProp } : null);
    v.onSelect(s.id, null, e.shiftKey, e.shiftKey ? null : r.frameProp ? "frames" : r.key);
    if (pauseToEnd(s)) e.stopPropagation();
  }}
>
  <div
    className={`absolute top-0 h-[30px] rounded-[8px] transition-colors duration-100 ${
      rowActive(s, r) ? "bg-[#FF47BC]/20" : "bg-[#E3E3E3]/60 dark:bg-[#333333]/60"
    }`}
    style={{ left: VID_PAD + s.start * pps, width: w }}
  >
  {(() => {
    const kx = (k) => vidClamp(k.t * pps, 15, Math.max(15, w - 15));
    const pk = r.frameProp ? r.keys : s.keys.filter((k) => !k.props || k.props.includes(r.key));
    return (
      <>
        {/* lines + easing button between consecutive keyframes */}
        {pk.slice(0, -1).map((k, i) => {
          const x1 = kx(k), x2 = kx(pk[i + 1]);
          return (
            <React.Fragment key={`seg-${k.id}`}>
              <i
                className="absolute top-1/2 h-px bg-[#FF47BC] pointer-events-none"
                style={{ left: x1 + 8, width: Math.max(0, x2 - x1 - 16) }}
              />
              {x2 - x1 >= 44 && !r.frameProp && (
                <button
                  type="button"
                  data-vid-ease-btn
                  aria-label="Easing"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => openEase(e, s.id, k.id, r.key)}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md border border-[#FF47BC] bg-[#FAF9FA] text-[#FF47BC] hover:!bg-[#FAD8EF] transition-[opacity,background-color] focus-visible:opacity-100 ${
                    easeMenu && easeMenu.sid === s.id && easeMenu.kid === k.id && easeMenu.prop === r.key
                      ? "opacity-100"
                      : "opacity-0 group-hover/track:opacity-100"
                  }`}
                  style={{ left: (x1 + x2) / 2 }}
                >
                  <EaseIcon size={12} />
                </button>
              )}
            </React.Fragment>
          );
        })}

        {/* keyframes */}
        {pk.map((k) => (
          (() => {
            const isFr = !!r.frameProp;
            const on = k.id === selKey && (isFr ? frameRow?.sid === s.id && frameRow.prop === r.frameProp : activeProp === r.key);
            return (
              <div
                key={k.id}
                onPointerDown={(e) => {
                  if (isFr) setFrameRow({ sid: s.id, prop: r.frameProp });
                  keyDown(s, k, isFr ? "frames" : r.key)(e);
                }}
                className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing"
                style={{ left: kx(k) }}
                title={
                  isFr
                    ? `${r.label}: ${(+(k.frames[s.frameId][r.frameProp] ?? 0)).toFixed(r.frameProp === "s" ? 5 : 2)}`
                    : `${r.label}: ${Math.round(k[r.key])}`
                }
              >
                <Diamond
                  size={12}
                  weight={on ? "fill" : "bold"}
                  className={`text-[#FF47BC] transition-transform ${on ? "scale-125" : ""}`}
                />
              </div>
            );
          })()
        ))}

        {pending?.sid === s.id && pending.props.includes(r.frameProp ? "frames" : r.key) && (
          <i
            aria-hidden
            className="key-pending absolute top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-[#FF47BC] bg-[#FAF9FA] pointer-events-none"
            style={{ left: kx({ t: pending.rel }) }}
          />
        )}
      </>
    );
  })()}
                      </div>
                    </div>
                  ))}
              </div>
              </React.Fragment>
            );
          })}
          {v.bgs.map((b) => {
  const selected = !!v.selBg?.ids?.includes(b.id);
  return (
    <div key={b.id} className={`fx-enter relative h-[30px] ${selected ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F]"}`}>
      <div
        onPointerDown={bgDown(b, "move")}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          v.onBgSelect(b.id);
          setBgMenu({
            bid: b.id,
            left: Math.min(e.clientX, window.innerWidth - 226),
            top: e.clientY,
          });
        }}
        className={`group absolute top-0 h-[30px] rounded-[8px] overflow-hidden border cursor-grab active:cursor-grabbing ${
          selected ? "border-[#FF47BC] border-2" : "border-[#3A3A3A]/15"
        } ${b.hidden ? "opacity-40" : ""}`}
        style={{ left: VID_PAD + b.start * pps, width: b.len * pps, background: b.css }}
      >
        {["enter", "exit"].map((kind) => {
          const an = bgAnimOf(b, kind);
          if (!an) return null;
          const isIn = kind === "enter";
          const gap = Math.min(an.delay / 1000, b.len) * pps;
          const dw = Math.max(8, Math.min(an.dur / 1000, b.len) * pps);
          return (
            <i
              key={kind}
              className={`absolute inset-y-0 pointer-events-none ${isIn ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-white/60 to-transparent`}
              style={isIn ? { left: gap, width: dw } : { right: gap, width: dw }}
            />
          );
        })}
        {[["l", "left-0"], ["r", "right-0"]].map(([m, side]) => (
          <div key={m} onPointerDown={bgDown(b, m)} className={`group/h absolute ${side} inset-y-0 w-2.5 flex items-center justify-center cursor-ew-resize`}>
            <i className={`w-0.5 h-4 rounded-full bg-white group-active/h:bg-[#FF47BC] transition-[opacity,background-color] ${
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`} />
          </div>
        ))}
      </div>
    </div>
  );
})}
{v.texts.map((c) => (
  <div
    key={c.id}
    className={`fx-enter relative h-[30px] transition-colors duration-100 ${
      v.selText?.ids?.includes(c.id)
        ? "bg-[#FF47BC]/5"
        : "bg-[#F0F0F0] dark:bg-[#1F1F1F] hover:bg-[#FF47BC]/5"
    }`}
  >
    {renderTextClip(c)}
  </div>
))}
{v.audios.map((a) => {
  const sel = v.selAudio?.aid === a.id;
  return (
    <div key={a.id} className={`fx-enter relative h-[30px] ${sel ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F]"}`}>
      <div
        onPointerDown={audioDown(a, "move")}
        className={`group absolute top-0 h-[30px] rounded-[8px] overflow-hidden cursor-grab active:cursor-grabbing bg-[#FF47BC]/20 hover:bg-[#FF47BC]/25 border-2 ${
          sel ? "border-[#FF47BC]" : "border-transparent"
        } ${a.muted ? "opacity-40" : ""}`}
        style={{ left: VID_PAD + a.start * pps, width: a.len * pps }}
      >
        <AudioWave a={a} />
        <span className="absolute inset-y-0 left-3 right-3 flex items-center truncate leading-4 pointer-events-none text-[#FF47BC]">
          {a.name}
        </span>
        {[["l", "left-0"], ["r", "right-0"]].map(([m, side]) => (
          <div key={m} onPointerDown={audioDown(a, m)} className={`group/h absolute ${side} inset-y-0 w-2.5 flex items-center justify-center cursor-ew-resize`}>
            <i className={`w-0.5 h-4 rounded-full bg-[#FF47BC] transition-opacity ${sel ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
          </div>
        ))}
      </div>
    </div>
  );
})}
        </div>
      </div>

      {/* End zone: drag its edge to change the timeline length */}
<div
  className="absolute top-[29px] bottom-0 right-0 z-[11] pointer-events-none bg-[#F0F0F0] dark:bg-[#1F1F1F]"
  style={{ left: x0 + axisW }}
>
        <div
          onPointerDown={durDown}
          onPointerEnter={() => setDurHover(true)}
          onPointerLeave={() => setDurHover(false)}
          className="absolute top-0 bottom-0 -left-1 w-2 flex justify-center cursor-ew-resize pointer-events-auto"
        >
          <i className={`w-px h-full transition-colors ${durHover ? "bg-[#FF47BC]" : "bg-transparent"}`} />
        </div>
      </div>

      {/* Playhead */}
      <div
        ref={headRef}
        className="absolute top-0 bottom-0 left-0 z-[15] pointer-events-none"
        style={{ transform: `translateX(${x0 + timeRef.current * pps}px)` }}
      >
        <div
  onPointerDown={scrub}
  className="absolute left-0 top-0 -translate-x-1/2 px-[7px] py-0.5 rounded-[4px] bg-[#FF47BC] flex items-center pointer-events-auto cursor-grab active:cursor-grabbing"
>
          <span ref={tcRef} className="tabular-nums leading-[18px] text-[#FCFCFC]">00:00:00</span>
          <i className="absolute left-1/2 -bottom-[3px] -ml-1 w-2 h-2 rotate-45 rounded-[1px] bg-[#FF47BC]" />
        </div>
        <div className="absolute left-0 top-[22px] bottom-0 w-px bg-[#FF47BC]" />
      </div>
    </div>
    </div>
  </div>
)}

      {keyMenu &&
        createPortal(
          <div
            data-vid-key-menu
            role="menu"
            style={{ position: "fixed", left: keyMenu.left, top: keyMenu.top }}
            className="pop-enter w-[190px] p-2 gap-1 flex flex-col bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
          >
            <button
              type="button"
              onClick={() => {
                v.onKeyUpdate(keyMenu.sid, keyMenu.kid);
                setKeyMenu(null);
              }}
              className="flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
            >
              Update keyframe
            </button>
            <button
              type="button"
              onClick={() => {
                v.onKeyDelete(keyMenu.sid, keyMenu.kid);
                setKeyMenu(null);
              }}
              className="flex items-center justify-between w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438] transition-colors duration-100"
            >
              Delete keyframe
              <KeyCombo keys={["⌫"]} />
            </button>
          </div>,
          document.body
        )}

{shotMenu &&
  createPortal(
    <CtxMenu data-vid-shot-menu left={shotMenu.left} top={shotMenu.top} width={190}>
      {[["enter", "Enter animation"], ["exit", "Exit animation"]].map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          onClick={() => {
            setShotMenu(null);
            setAnimMenu({ sid: shotMenu.sid, kind });
          }}
          className={CTX_ITEM}
        >
          {label}
        </button>
      ))}
      {!v.frameMode && (
        <>
          {CTX_DIVIDER}
          <button
            type="button"
            onClick={() => {
              imgTargetRef.current = shotMenu.sid;
              setShotMenu(null);
              imgInputRef.current?.click();
            }}
            className={CTX_ITEM}
          >
            {shots.find((x) => x.id === shotMenu.sid)?.img ? "Replace image" : "Set image"}
          </button>
          {shots.find((x) => x.id === shotMenu.sid)?.img && (
            <button
              type="button"
              onClick={() => {
                v.onShotImg(shotMenu.sid, null);
                setShotMenu(null);
              }}
              className={CTX_ITEM}
            >
              Remove image
            </button>
          )}
        </>
      )}
      <button
        type="button"
        onClick={() => {
          const s = shots.find((x) => x.id === shotMenu.sid);
          setShotMenu(null);
          if (s) startRename(s);
        }}
        className={CTX_ITEM}
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => {
          setShotMenu(null);
          v.onDuplicate();
        }}
        className={`${CTX_ITEM} justify-between`}
      >
        Duplicate
        <KeyCombo keys={["mod", "D"]} />
      </button>
      {selIds.length >= 2 && selIds.includes(shotMenu.sid) && (
        <button
          type="button"
          onClick={() => {
            setShotMenu(null);
            v.onGroup();
          }}
          className={`${CTX_ITEM} justify-between`}
        >
          Group
          <KeyCombo keys={["mod", "G"]} />
        </button>
      )}
      {(shots.find((x) => x.id === shotMenu.sid)?.group || shots.some((x) => selIds.includes(x.id) && x.group)) && (
        <button
          type="button"
          onClick={() => {
            setShotMenu(null);
            v.onUngroup();
          }}
          className={`${CTX_ITEM} justify-between`}
        >
          Ungroup
          <KeyCombo keys={["mod", "⇧", "G"]} />
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setShotMenu(null);
          v.onDelete();
        }}
        className={CTX_DANGER}
      >
        Delete
        <KeyCombo keys={["⌫"]} />
      </button>
    </CtxMenu>,
    document.body
  )}

{bgMenu &&
  createPortal(
    <CtxMenu data-vid-bg-menu left={bgMenu.left} top={bgMenu.top} width={210}>
      {[["enter", "Enter animation"], ["exit", "Exit animation"]].map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          onClick={() => {
            setBgAnimMenu({ bid: bgMenu.bid, kind });
            setBgMenu(null);
          }}
          className={CTX_ITEM}
        >
          {label}
        </button>
      ))}
      {CTX_DIVIDER}
      <button
        type="button"
        onClick={() => {
          const b = v.bgs.find((x) => x.id === bgMenu.bid);
          setBgMenu(null);
          if (b) startBgRename(b);
        }}
        className={CTX_ITEM}
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => {
          v.onBgDuplicate(bgMenu.bid);
          setBgMenu(null);
        }}
        className={`${CTX_ITEM} justify-between`}
      >
        Duplicate
        <KeyCombo keys={["mod", "D"]} />
      </button>
      <button
        type="button"
        onClick={() => {
          v.onBgUpdate(bgMenu.bid);
          setBgMenu(null);
        }}
        className={CTX_ITEM}
      >
        Update to current background
      </button>
      <button
        type="button"
        onClick={() => {
          v.onBgDelete(bgMenu.bid);
          setBgMenu(null);
        }}
        className={CTX_DANGER}
      >
        Delete background
        <KeyCombo keys={["⌫"]} />
      </button>
    </CtxMenu>,
    document.body
  )}

{easeMenu &&
  createPortal(
    <EasePopover v={v} menu={easeMenu} onClose={() => setEaseMenu(null)} />,
    document.body
  )}

{bgAnimMenu &&
  createPortal(
    <BgAnimPopover
      v={v}
      menu={bgAnimMenu}
      onClose={() => setBgAnimMenu(null)}
      onSwitch={(kind) => setBgAnimMenu((m) => (m ? { ...m, kind } : m))}
    />,
    document.body
  )}

{animMenu &&
  createPortal(
    <ShotAnimPopover
      v={v}
      menu={animMenu}
      onClose={() => setAnimMenu(null)}
      onSwitch={(kind) => setAnimMenu((m) => (m ? { ...m, kind } : m))}
    />,
    document.body
  )}

{textMenu &&
  createPortal(
    <CtxMenu data-vid-text-menu left={textMenu.left} top={textMenu.top} width={190}>
      {[["enter", "Enter animation"], ["exit", "Exit animation"]].map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          onClick={() => {
            setTextAnimMenu({ cid: textMenu.cid, kind });
            setTextMenu(null);
          }}
          className={CTX_ITEM}
        >
          {label}
        </button>
      ))}
      {CTX_DIVIDER}
      <button
        type="button"
        onClick={() => {
          const c = v.texts.find((x) => x.id === textMenu.cid);
          setTextMenu(null);
          if (c) startTextRename(c);
        }}
        className={CTX_ITEM}
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => {
          v.onTextDuplicate(textMenu.cid);
          setTextMenu(null);
        }}
        className={`${CTX_ITEM} justify-between`}
      >
        Duplicate
        <KeyCombo keys={["mod", "D"]} />
      </button>
      <button
        type="button"
        onClick={() => {
          v.onTextDelete(textMenu.cid);
          setTextMenu(null);
        }}
        className={CTX_DANGER}
      >
        Delete text
        <KeyCombo keys={["⌫"]} />
      </button>
    </CtxMenu>,
    document.body
  )}

{textAnimMenu &&
  createPortal(
    <TextAnimPopover
      v={v}
      menu={textAnimMenu}
      onClose={() => setTextAnimMenu(null)}
      onSwitch={(kind) => setTextAnimMenu((m) => (m ? { ...m, kind } : m))}
    />,
    document.body
  )}
    </div>
  );
}

// Seeks a video to t (looping by its duration) and resolves once the frame is ready.
function seekVideo(el, t) {
  const d = el.duration;
  const want = d && isFinite(d) ? t % d : 0;
  if (Math.abs(el.currentTime - want) < 1 / 120) return Promise.resolve();
  return new Promise((res) => {
    const done = () => {
      el.removeEventListener("seeked", done);
      res();
    };
    el.addEventListener("seeked", done);
    el.currentTime = want;
  });
}

// Loads a video file and grabs its first frame as a poster image.
function loadVideoMeta(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = "auto";
    el.onloadeddata = () => {
      const c = document.createElement("canvas");
      c.width = el.videoWidth;
      c.height = el.videoHeight;
      c.getContext("2d").drawImage(el, 0, 0);
      c.toBlob((blob) => {
        if (!blob) return resolve(null);
        resolve({
          el, url, duration: el.duration, w: el.videoWidth, h: el.videoHeight,
          poster: new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }),
        });
      }, "image/jpeg", 0.92);
    };
    el.onerror = () => resolve(null);
    el.src = url;
  });
}

export default function App() {
 const sceneRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadedFileRef = useRef(null);
  const [uploadedMediaLabel, setUploadedMediaLabel] = useState(null);
  const [mockupVideo, setMockupVideo] = useState(null); // { el, url, duration }
  const mockupVideoRef = useRef(null);
  mockupVideoRef.current = mockupVideo;
  const [uploadedMediaThumb, setUploadedMediaThumb] = useState(null);
  const [uploadedImageDims, setUploadedImageDims] = useState(null);
  const [uploadedCrop, setUploadedCrop] = useState(null); // { x, y, width, height } or null
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const opacityInputRef = useRef(null);
  const bodyOpacityInputRef = useRef(null);
  const colorPickerRef = useRef(null);
  const toolbarRef = useRef(null);
  // "system" follows the OS; "light" / "dark" are explicit overrides.
  const [themePref, setThemePref] = useState("light");
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const darkMode = themePref === "dark" || (themePref === "system" && systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Help popup
  const [helpOpen, setHelpOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourKind, setTourKind] = useState("app"); // "app" | "video"
  const startTour = () => {
    setExportOpen(false);
    setCanvasSizeOpen(false);
    setTourKind("app");
    if (sidebarOpen) setTourOpen(true);
    else {
      setSidebarOpen(true);
      setTimeout(() => setTourOpen(true), 380);
    }
  };
  const startVideoTour = () => {
    setExportOpen(false);
    setCanvasSizeOpen(false);
    setTourKind("video");
    setTourOpen(true);
  };
    useEffect(() => {
    try {
      if (!localStorage.getItem("bezel:tour-seen")) startTour();
    } catch {}
  }, []);

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [helpAnchor, setHelpAnchor] = useState(null);
  const helpButtonRef = useRef(null);
  const helpPopupRef = useRef(null);
  const closeHelp = () => {
    setHelpOpen(false);
    setThemeMenuOpen(false);
  };

  useLayoutEffect(() => {
    if (!helpOpen) return;
    const update = () => {
      const r = helpButtonRef.current?.getBoundingClientRect();
      if (r) setHelpAnchor({ left: r.right + 4, bottom: window.innerHeight - r.bottom });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [helpOpen]);

  useEffect(() => {
    if (!helpOpen) return;
    const onDown = (e) => {
      if (helpPopupRef.current?.contains(e.target) || helpButtonRef.current?.contains(e.target)) return;
      setHelpOpen(false);
      setThemeMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setHelpOpen(false);
        setThemeMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [helpOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Duplicate badge: a "+" that follows the pointer while Alt is held over a frame or text layer.
  // Drawn by us (not the system cursor), so it appears the instant Alt goes down and can't get stuck.
  useEffect(() => {
    const badge = document.createElement("div");
    badge.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"><path d="M5 1.5v7M1.5 5h7"/></svg>';
    Object.assign(badge.style, {
      position: "fixed", left: "0", top: "0", width: "16px", height: "16px", borderRadius: "999px",
      background: "#FF47BC", border: "1px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      display: "none", alignItems: "center", justifyContent: "center",
      pointerEvents: "none", zIndex: "2147483647", transition: "none",
    });
    document.body.appendChild(badge);

    const pos = { x: -1, y: -1 };
    const state = { alt: false, shift: false };

    const refresh = () => {
      let show = false;
      if (state.alt && pos.x >= 0) {
        const el = document.elementFromPoint(pos.x, pos.y);
        if (el && !el.closest?.("[contenteditable]")) {
          const text = el.closest?.("[data-text-box]");
          const frame = el.closest?.("[data-frame-id]");
          show = !!text || (!!frame && !state.shift);
        }
      }
      badge.style.display = show ? "flex" : "none";
      if (show) badge.style.transform = `translate(${pos.x + 12}px, ${pos.y + 12}px)`;
    };

    const onEvent = (e) => {
      if (typeof e.clientX === "number" && e.type.startsWith("pointer")) {
        pos.x = e.clientX;
        pos.y = e.clientY;
      }
      // Every event carries the real modifier state, so a missed keyup is corrected by the next event.
      if (typeof e.altKey === "boolean") {
        state.alt = e.altKey;
        state.shift = e.shiftKey;
      }
      refresh();
    };
    const reset = () => {
      state.alt = false;
      state.shift = false;
      refresh();
    };

    const types = ["keydown", "keyup", "pointermove", "pointerdown", "pointerup", "pointerover"];
    types.forEach((t) => window.addEventListener(t, onEvent, true));
    window.addEventListener("blur", reset);
    window.addEventListener("focus", reset);
    document.addEventListener("visibilitychange", reset);
    window.addEventListener("contextmenu", reset);
    return () => {
      types.forEach((t) => window.removeEventListener(t, onEvent, true));
      window.removeEventListener("blur", reset);
      window.removeEventListener("focus", reset);
      document.removeEventListener("visibilitychange", reset);
      window.removeEventListener("contextmenu", reset);
      badge.remove();
    };
  }, []);

  // Every text-like field selects its value on focus, ready for editing.
  useEffect(() => {
    const TYPES = new Set(["", "text", "number", "search", "url", "email", "tel", "password"]);
    const isField = (el) =>
      el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && TYPES.has(el.type));
    const onFocusIn = (e) => {
      const el = e.target;
      if (!isField(el) || el.readOnly || el.disabled) return;
      el.select();
      // The mouseup that ends the click would collapse the selection, so swallow it once.
      const keep = (ev) => ev.preventDefault();
      el.addEventListener("mouseup", keep, { once: true });
      setTimeout(() => el.removeEventListener("mouseup", keep), 300); // focus came from the keyboard: don't leave it armed
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

    const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    Promise.all([400, 500, 600, 700].map((wt) => document.fonts.load(`${wt} 16px "TikTok Sans"`)))
      .then(() => setFontTick((n) => n + 1))
      .catch(() => {});
  }, []);

  // Any font finishing a load re-runs text truncation, which measures with real glyph widths.
  useEffect(() => {
    const bump = () => setFontTick((n) => n + 1);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);

  // Scene's solid background default follows the app theme — white in
  // light mode, black in dark mode.
  useEffect(() => {
    setBgHex(surfaceHex(darkMode));
  }, [darkMode]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toolbarMode, setToolbarMode] = useState("mockup"); // "mockup" | "frame"
  const [frameCropUrl, setFrameCropUrl] = useState(null); // cropped copy of the upload, for Frame mode
    // Frame appearance
  const [frames, setFrames] = useState(() => [makeFrame(1)]);
  const [selectedIds, setSelectedIds] = useState([1]);
  const nextFrameIdRef = useRef(2);
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const primaryFrame = frames.find((f) => f.id === selectedIds[0]) ?? frames[0];
  const frameWidth = primaryFrame.w; // the Size inputs show the primary selected frame
  const frameHeight = primaryFrame.h;
  const selectedFrames = frames.filter((f) => selectedIds.includes(f.id));
  const frameWMixed = selectedFrames.length > 1 && !selectedFrames.every((f) => f.w === selectedFrames[0].w);
  const frameHMixed = selectedFrames.length > 1 && !selectedFrames.every((f) => f.h === selectedFrames[0].h);
  useEffect(() => {
    frameLockRatioRef.current = primaryFrame.w / primaryFrame.h; // lock follows whichever frame is selected
  }, [primaryFrame.id]);
    const framesLatestRef = useRef(frames);
  framesLatestRef.current = frames;

  const [chromeColors, setChromeColors] = useState({});
useEffect(() => {
  frames.forEach((f) => {
    if (!(f.statusBar || f.homeIndicator)) return;
    const key = chromeKey(f);
    if (!key || chromeColors[key]) return;
    const img = new Image();
    img.onload = () => setChromeColors((p) => ({ ...p, [key]: sampleChromeColors(img, f.w, f.h) }));
    img.src = f.img.cropUrl ?? f.img.url;
  });
}, [frames, chromeColors]);

  // Appearance lives on each frame. These keep the old names: they read the primary selected frame
  // and write to every selected frame, so the rest of the panel code doesn't change.
  const editIdsRef = useRef([]);
  editIdsRef.current = selectedIds.length ? selectedIds : [frames[0].id];
  const makeFrameSetter = (key) => (v) => {
    const ids = editIdsRef.current;
    setFrames((prev) =>
      prev.map((f) => (ids.includes(f.id) ? { ...f, [key]: typeof v === "function" ? v(f[key]) : v } : f))
    );
  };
  const frameRotation = primaryFrame.r ?? 0;
  const setFrameRotation = makeFrameSetter("r");

  // Multi-selection rotates as a group. The scrubber shows the angle applied since the selection was made.
  const [groupRot, setGroupRot] = useState(0);
  useEffect(() => setGroupRot(0), [selectedIds.join(",")]);

  const rotateSelection = (target) => {
    const ids = editIdsRef.current;
    const box = frameSizeRef.current;
    if (ids.length <= 1 || !box) {
      setFrameRotation(target);
      return;
    }
    const short = Math.min(box.w, box.h);
    const delta = target - groupRot;
    setGroupRot(target);
    const sel = framesLatestRef.current.filter((f) => ids.includes(f.id));
    const rects = new Map(sel.map((f) => [f.id, frameRect(f, box)]));
    const list = [...rects.values()];
    const gcx = (Math.min(...list.map((r) => r.left)) + Math.max(...list.map((r) => r.left + r.width))) / 2;
    const gcy = (Math.min(...list.map((r) => r.top)) + Math.max(...list.map((r) => r.top + r.height))) / 2;
    const rad = (delta * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    setFrames((prev) =>
      prev.map((f) => {
        const r = rects.get(f.id);
        if (!r) return f;
        const dx = r.left + r.width / 2 - gcx;
        const dy = r.top + r.height / 2 - gcy;
        return {
          ...f,
          x: f.x + (dx * cos - dy * sin - dx) / short,
          y: f.y + (dx * sin + dy * cos - dy) / short,
          r: (f.r ?? 0) + delta,
        };
      })
    );
  };
  // moves every selected frame by the same amount, so a multi-selection keeps its spacing
  const moveSelectedFrames = (key, target) => {
    const ids = editIdsRef.current;
    const d = target - primaryFrame[key];
    setFrames((prev) => prev.map((f) => (ids.includes(f.id) ? { ...f, [key]: f[key] + d } : f)));
  };
  const frameRadius = primaryFrame.radius;
  const setFrameRadius = makeFrameSetter("radius");
  const frameCorners = primaryFrame.corners;
  const setFrameCorners = makeFrameSetter("corners");
  const frameStroke = primaryFrame.stroke;
  const setFrameStroke = makeFrameSetter("stroke");
  const frameEffects = primaryFrame.effects;
  const setFrameEffects = makeFrameSetter("effects");
  const frameBackType = primaryFrame.backType;
  const setFrameBackType = makeFrameSetter("backType");
  const frameBackHex = primaryFrame.backHex;
  const setFrameBackHex = makeFrameSetter("backHex");
  const frameBackOpacity = primaryFrame.backOpacity;
  const setFrameBackOpacity = makeFrameSetter("backOpacity");
  const backGradientType = primaryFrame.backGradientType;
  const setBackGradientType = makeFrameSetter("backGradientType");
  const backGradientAngle = primaryFrame.backGradientAngle;
  const setBackGradientAngle = makeFrameSetter("backGradientAngle");
  const backGradientOpacity = primaryFrame.backGradientOpacity;
  const setBackGradientOpacity = makeFrameSetter("backGradientOpacity");
  const backStops = primaryFrame.backStops;
  const setBackStops = makeFrameSetter("backStops");
  const frameSocial = primaryFrame.social;
  const setFrameSocial = makeFrameSetter("social");
  const updateSocial = (patch) => setFrameSocial((prev) => ({ ...prev, ...patch }));
    const frameStatusBar = primaryFrame.statusBar;
  const setFrameStatusBar = makeFrameSetter("statusBar");
  const frameHomeIndicator = primaryFrame.homeIndicator;
  const setFrameHomeIndicator = makeFrameSetter("homeIndicator");
    // Social on = phone-screen frame. Off = back to the image's own size. On-screen height is preserved.
  const toggleSocialOn = (on) => {
    const ids = editIdsRef.current;
    const box = frameSizeRef.current;
    setFrames((prev) =>
      prev.map((f) => {
        if (!ids.includes(f.id) || f.social.on === on) return f;
        const short = box ? Math.min(box.w, box.h) : 1;
        const s = f.s ?? (box ? frameRect(f, box).width / (f.w * short) : null);
        const back = f.img ? (f.img.crop ?? { width: f.img.nw, height: f.img.nh }) : FRAME_DEFAULT_SIZE;
        const nw = on ? FRAME_DEFAULT_SIZE.w : back.width ?? back.w;
        const nh = on ? FRAME_DEFAULT_SIZE.h : back.height ?? back.h;
        return { ...f, w: nw, h: nh, s: s ? (f.h * s) / nh : null, social: { ...f.social, on } };
      })
    );
  };
  const avatarInputRef = useRef(null);
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) updateSocial({ avatar: URL.createObjectURL(file), avatarName: file.name });
    e.target.value = "";
  };
const changeSocialPlatform = (platform) =>
  updateSocial({ platform, mode: platformOf(platform).modes[0].value, ...socialDefaults(platform) });
const changeSocialMode = (mode) => updateSocial({ mode, ...socialDefaults(frameSocial.platform, mode) });
const activeSocialPlatform = platformOf(frameSocial.platform);
const activeSocialMode = modeOf(frameSocial.platform, frameSocial.mode);
  const [frameAspectLocked, setFrameAspectLocked] = useState(false); // unlocked by default
  const frameLockRatioRef = useRef(FRAME_DEFAULT_SIZE.w / FRAME_DEFAULT_SIZE.h);
  const clampDim = (n) => Math.min(20000, Math.max(1, Math.round(n)));
  const toggleFrameAspectLock = () => {
    if (!frameAspectLocked) frameLockRatioRef.current = frameWidth / Math.max(1, frameHeight); // lock whatever it is right now
    setFrameAspectLocked((v) => !v);
  };
  const handleFrameWidthChange = (w) =>
    resizeSelectedFrames("w", w);
  const handleFrameHeightChange = (h) =>
    resizeSelectedFrames("h", h);
  // Sets both sides at once and re-bases the lock ratio, so a locked frame never snaps back to a stale ratio.
  // Upload / crop / clear: sets the selected frame's size and re-fits it to the canvas.
  const applyFrameSize = useCallback((w, h) => {
    const cw = Math.min(20000, Math.max(1, Math.round(w)));
    const ch = Math.min(20000, Math.max(1, Math.round(h)));
    setFrames((prev) => {
      const id = prev.some((f) => f.id === selectedIdsRef.current[0]) ? selectedIdsRef.current[0] : prev[0].id;
      return prev.map((f) => (f.id === id ? { ...f, w: cw, h: ch, s: null } : f));
    });
    frameLockRatioRef.current = cw / ch;
  }, []);
  const [cameraEase, setCameraEase] = useState(false);
  const cameraEaseTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(cameraEaseTimerRef.current), []);
  const nextEffectIdRef = useRef(2);
  const frameSizeRef = useRef(null); // measured size of the canvas, used by Frame export
    const videoPoolRef = useRef(new Map()); // blob url -> offscreen <video>, used only for export
  const videoFrameAt = async (url, t) => {
    let el = videoPoolRef.current.get(url);
    if (!el) {
      el = document.createElement("video");
      el.muted = true;
      el.playsInline = true;
      el.preload = "auto";
      el.src = url;
      await new Promise((res, rej) => {
        el.onloadeddata = res;
        el.onerror = rej;
      });
      videoPoolRef.current.set(url, el);
    }
    await seekVideo(el, t);
    return el;
  };
    // Size inputs: keep the on-canvas scale, so typing a bigger W makes the frame bigger.
  // Size inputs: apply to every selected frame, keeping each one's on-canvas scale.
  const resizeSelectedFrames = (dim, val) => {
    const ids = selectedIds.length ? selectedIds : [primaryFrame.id];
    const box = frameSizeRef.current;
    setFrames((prev) =>
      prev.map((f) => {
        if (!ids.includes(f.id)) return f;
        const s = f.s ?? (box ? frameRect(f, box).width / (f.w * Math.min(box.w, box.h)) : null);
        let w = f.w, h = f.h;
        if (dim === "w") {
          w = val;
          if (frameAspectLocked) h = clampDim((val * f.h) / f.w); // each frame keeps its own ratio
        } else {
          h = val;
          if (frameAspectLocked) w = clampDim((val * f.w) / f.h);
        }
        return { ...f, w, h, s };
      })
    );
  };
  // Scale: 100% = the frame's fit-to-canvas size. Applies to every selected frame, around its center.
const frameFitS = (f, box) => Math.min((0.8 * box.w) / f.w, (0.8 * box.h) / f.h) / Math.min(box.w, box.h);
const frameScalePct = (() => {
  const box = frameSizeRef.current;
  if (!box) return 100;
  const fit = frameFitS(primaryFrame, box);
  return Math.round(((primaryFrame.s ?? fit) / fit) * 100);
})();
const handleFrameScale = (pct) => {
  const box = frameSizeRef.current;
  if (!box) return;
  const ids = selectedIds.length ? selectedIds : [primaryFrame.id];
  setFrames((prev) => prev.map((f) => (ids.includes(f.id) ? { ...f, s: (frameFitS(f, box) * pct) / 100 } : f)));
};

const toolbarModeRef = useRef(toolbarMode);
toolbarModeRef.current = toolbarMode;
const vidUploadRef = useRef(null); // set later: uploads a file to the selected / current shot
  const pickTargetRef = useRef(null); // frame id whose image the file picker should replace, or null = add
  const frameUploadRef = useRef(null);
  const [frameCropId, setFrameCropId] = useState(null);
  const frameCropTarget = frames.find((f) => f.id === frameCropId) ?? null;

const pickFrameFile = (ids = null) => {
  pickTargetRef.current = ids;
  fileInputRef.current?.click();
};

// With target ids: every one of those frames gets this image. Without: fills the empty
// placeholder frame if there is one, else adds a new frame.
const addFrameImage = (file, targetIds = null) => {
  const ids = targetIds == null ? [] : Array.isArray(targetIds) ? targetIds : [targetIds];
  const place = (url, nw, nh, video = null) => {
    const img = { url, label: file.name, nw, nh, crop: null, cropUrl: null, ...(video ? { video } : {}) };
    const box = frameSizeRef.current;
    const prev = framesLatestRef.current;
    const short = box ? Math.min(box.w, box.h) : 1;

    const scaleOf = (f) => f.s ?? (box ? frameRect(f, box).width / (f.w * short) : null);
    const hasTargets = prev.some((f) => ids.includes(f.id));
    const placeholder = hasTargets ? null : prev.find((f) => !f.img);

    const ref = prev.find((f) => f.img && !ids.includes(f.id) && f.id !== placeholder?.id);
    const fitS = box ? Math.min((0.8 * box.w) / nw, (0.8 * box.h) / nh) / short : null;
    const defaultS = (ref && scaleOf(ref)) ?? fitS;

    let next, selIds;
    if (hasTargets) {
      selIds = prev.filter((f) => ids.includes(f.id)).map((f) => f.id);
      next = prev.map((f) => {
        if (!ids.includes(f.id)) return f;
        // Frames that already have an image (or a social UI) keep their size and position.
        // An empty frame takes the image's size, like a first upload.
        const keep = !!f.img || f.social?.on;
        return {
          ...f,
          img: { ...img },
          ...(keep ? {} : { w: nw, h: nh }), // x / y stay where the frame was
          s: keep ? scaleOf(f) : defaultS,
        };
      });
    } else if (placeholder) {
      selIds = [placeholder.id];
      next = prev.map((f) =>
        f.id === placeholder.id
          ? { ...f, img, ...(f.social?.on ? {} : { w: nw, h: nh }), s: f.social?.on ? scaleOf(f) : defaultS, x: 0, y: 0 }
          : f
      );
    } else {
      const id = nextFrameIdRef.current++;
      selIds = [id];
      next = [...prev, makeFrame(id, { img, w: nw, h: nh, s: defaultS, x: 0, y: 0 })];
    }
    framesLatestRef.current = next;
    setFrames(next);
    setSelectedIds(selIds);

    // frames that took the image's size: refresh the pose in their row's only keyframe
    const resized = new Set(
      next.filter((f) => { const o = prev.find((p) => p.id === f.id); return o && (o.w !== f.w || o.h !== f.h); }).map((f) => f.id)
    );
    if (resized.size && box) {
      const poses = framePoseMap(next, box);
      const apply = (shots) =>
        shots.map((s) =>
          resized.has(s.frameId) && s.keys.length === 1
            ? { ...s, keys: s.keys.map((k) => ({ ...k, frames: { [s.frameId]: poses[s.frameId] } })) }
            : s
        );
      vidLive.current.shots = apply(vidLive.current.shots);
      setVidShots(apply);
    }
  };

  if (file.type.startsWith("video/")) {
    loadVideoMeta(file).then(
      (m) => m && place(URL.createObjectURL(m.poster), m.w, m.h, { url: m.url, duration: m.duration })
    );
    return;
  }
  const url = URL.createObjectURL(file);
  const probe = new Image();
  probe.onload = () => place(url, probe.naturalWidth, probe.naturalHeight);
  probe.src = url;
};
frameUploadRef.current = addFrameImage;

  const applyFrameCrop = async (rect) => {
    const f = frameCropTarget;
    setFrameCropId(null);
    if (!f?.img) return;
    try {
      const cropUrl = await cropImageToDataUrl(f.img.url, rect);
      const box = frameSizeRef.current;
      setFrames((prev) =>
        prev.map((fr) => {
          if (fr.id !== f.id) return fr;
          const short = box ? Math.min(box.w, box.h) : 1;
          const s = fr.s == null || !box ? null : frameRect(fr, box).width / (rect.width * short); // keep on-screen width
          const crop = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          return { ...fr, img: { ...fr.img, crop, cropUrl }, ...(fr.social?.on ? {} : { w: rect.width, h: rect.height, s }) };
        })
      );
    } catch (err) {
      console.error("Failed to crop frame image:", err);
    }
  };

  const deleteFrames = (ids) => {
    if (!ids.length) return;
    const remaining = frames.filter((f) => !ids.includes(f.id));
    if (!remaining.length) {
      // Deleting the last frame resets it to the empty placeholder, keeping its appearance.
      const blank = { ...frames[0], img: null, w: FRAME_DEFAULT_SIZE.w, h: FRAME_DEFAULT_SIZE.h, s: null, x: 0, y: 0 };
      setFrames([blank]);
      setSelectedIds([blank.id]);
      return;
    }
    setFrames(remaining);
    setSelectedIds((cur) => {
      const keep = cur.filter((i) => !ids.includes(i));
      return keep.length ? keep : [remaining[remaining.length - 1].id];
    });
  };
  const deleteSelected = () => deleteFrames(selectedIds);

    // Duplicate: copies each selected image frame, nudged down-right, on top of the stack.
  const duplicateSelected = () => {
    const sel = frames.filter((f) => selectedIds.includes(f.id) && f.img);
    if (!sel.length) return;
    const copies = sel.map((f) => ({
      ...f,
      id: nextFrameIdRef.current++,
      x: f.x + 0.03,
      y: f.y + 0.03,
      img: { ...f.img },
      corners: f.corners ? [...f.corners] : null,
      stroke: { ...f.stroke },
      social: { ...f.social },
      effects: f.effects.map((e) => ({ ...e })),
      backStops: f.backStops.map((s) => ({ ...s })),
    }));
    const next = [...frames, ...copies];
    framesLatestRef.current = next;
    setFrames(next);
    setSelectedIds(copies.map((c) => c.id));
  };

  // Adds an empty frame next to the selected one, with the same look. Its timeline row is created by the effect.
  const addBlankFrame = () => {
    const prev = framesLatestRef.current;
    const base = prev.find((f) => selectedIdsRef.current.includes(f.id)) ?? prev[prev.length - 1];
    const id = nextFrameIdRef.current++;
    // fresh frame at the canvas center (the base's current pose can be an off-screen animation pose)
    const blank = { ...cloneFrame(base, id), img: null, x: 0, y: 0, w: FRAME_DEFAULT_SIZE.w, h: FRAME_DEFAULT_SIZE.h, s: null, r: 0 };
    const next = [...prev, blank];
    framesLatestRef.current = next;
    setFrames(next);
    setSelectedIds([id]);
  };

    // Z-order: frames render in array order, so later = on top. Dragging a thumbnail in the strip moves it in that array.
  const dragIdRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const reorderFrame = (fromId, toId) =>
    setFrames((prev) => {
      const from = prev.findIndex((f) => f.id === fromId);
      const to = prev.findIndex((f) => f.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  // One frame aligns to the canvas; two or more align to the selection's bounds (like Figma).
  const alignSelected = (kind) => {
    const box = frameSizeRef.current;
    const sel = frames.filter((f) => selectedIds.includes(f.id));
    if (!box || !sel.length) return;
    const short = Math.min(box.w, box.h);
    const rects = new Map(sel.map((f) => [f.id, frameRect(f, box)]));
    const list = [...rects.values()];
    const ref =
      sel.length > 1
        ? {
            l: Math.min(...list.map((r) => r.left)),
            r: Math.max(...list.map((r) => r.left + r.width)),
            t: Math.min(...list.map((r) => r.top)),
            b: Math.max(...list.map((r) => r.top + r.height)),
          }
        : { l: 0, r: box.w, t: 0, b: box.h };
    setFrames((prev) =>
      prev.map((f) => {
        const r = rects.get(f.id);
        if (!r) return f;
        let dx = 0, dy = 0;
        switch (kind) {
          case "left": dx = ref.l - r.left; break;
          case "right": dx = ref.r - (r.left + r.width); break;
          case "hcenter": dx = (ref.l + ref.r) / 2 - (r.left + r.width / 2); break;
          case "top": dy = ref.t - r.top; break;
          case "bottom": dy = ref.b - (r.top + r.height); break;
          case "vcenter": dy = (ref.t + ref.b) / 2 - (r.top + r.height / 2); break;
        }
        return { ...f, x: f.x + dx / short, y: f.y + dy / short };
      })
    );
  };

    // True when every selected frame currently sits on that alignment line
  // (the canvas for one frame, the selection's bounds for several).
  const isFrameAligned = (kind) => {
    const box = frameSizeRef.current;
    const sel = frames.filter((f) => selectedIds.includes(f.id));
    if (!box || !sel.length) return false;
    const rects = sel.map((f) => frameRect(f, box));
    const ref =
      sel.length > 1
        ? {
            l: Math.min(...rects.map((r) => r.left)),
            r: Math.max(...rects.map((r) => r.left + r.width)),
            t: Math.min(...rects.map((r) => r.top)),
            b: Math.max(...rects.map((r) => r.top + r.height)),
          }
        : { l: 0, r: box.w, t: 0, b: box.h };
    const EPS = 0.5;
    return rects.every((r) => {
      switch (kind) {
        case "left": return Math.abs(r.left - ref.l) < EPS;
        case "right": return Math.abs(r.left + r.width - ref.r) < EPS;
        case "hcenter": return Math.abs(r.left + r.width / 2 - (ref.l + ref.r) / 2) < EPS;
        case "top": return Math.abs(r.top - ref.t) < EPS;
        case "bottom": return Math.abs(r.top + r.height - ref.b) < EPS;
        case "vcenter": return Math.abs(r.top + r.height / 2 - (ref.t + ref.b) / 2) < EPS;
        default: return false;
      }
    });
  };

  // Needs 3+ frames: the outer two stay put and the gaps between all of them become equal.
  const distributeSelected = (axis) => {
    const box = frameSizeRef.current;
    const sel = frames.filter((f) => selectedIds.includes(f.id));
    if (!box || sel.length < 3) return;
    const short = Math.min(box.w, box.h);
    const horiz = axis === "h";
    const size = (r) => (horiz ? r.width : r.height);
    const start = (r) => (horiz ? r.left : r.top);
    const items = sel
      .map((f) => ({ f, r: frameRect(f, box) }))
      .sort((a, b) => start(a.r) - start(b.r));
    const first = start(items[0].r);
    const lastItem = items[items.length - 1].r;
    const gap = (start(lastItem) + size(lastItem) - first - items.reduce((sum, i) => sum + size(i.r), 0)) / (items.length - 1);
    let cursor = first;
    const shifts = new Map();
    items.forEach(({ f, r }) => {
      shifts.set(f.id, (cursor - start(r)) / short);
      cursor += size(r) + gap;
    });
    const key = horiz ? "x" : "y";
    setFrames((prev) => prev.map((f) => (shifts.has(f.id) ? { ...f, [key]: f[key] + shifts.get(f.id) } : f)));
  };

  const [distMenu, setDistMenu] = useState(null); // { right, top }
  useEffect(() => {
    if (!distMenu) return;
    const onDown = (e) => {
      if (!e.target.closest?.("[data-dist-menu],[data-dist-trigger]")) setDistMenu(null);
    };
    const onKey = (e) => e.key === "Escape" && setDistMenu(null);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [distMenu]);
  // Effect settings side popup
const [openEffectId, setOpenEffectId] = useState(null);
const [effectPopupPos, setEffectPopupPos] = useState(null); // { top, right }
const effectPopupRef = useRef(null);
const effectRowRefs = useRef({});
const openEffect = frameEffects.find((e) => e.id === openEffectId) ?? null;

const closeEffectPopup = () => {
  setOpenEffectId(null);
  setEffectPopupPos(null);
  setColorPickerOpen(false);
};
const toggleEffectPopup = (id) => {
  if (openEffectId === id) closeEffectPopup();
  else {
    setEffectPopupPos(null);
    setOpenEffectId(id);
  }
};

// Position: 4px left of the toolbar, top aligned to the row, clamped to the viewport.
useLayoutEffect(() => {
  if (openEffectId === null) return;
  const update = () => {
    const row = effectRowRefs.current[openEffectId];
    const tb = toolbarRef.current;
    if (!row || !tb) return;
    const r = row.getBoundingClientRect();
    const t = tb.getBoundingClientRect();
    const h = effectPopupRef.current?.offsetHeight ?? 0;
    setEffectPopupPos({
      top: Math.max(8, Math.min(r.top, window.innerHeight - h - 8)),
      right: window.innerWidth - t.left + 4,
    });
  };
  update();
  window.addEventListener("scroll", update, true);
  window.addEventListener("resize", update);
  return () => {
    window.removeEventListener("scroll", update, true);
    window.removeEventListener("resize", update);
  };
}, [openEffectId, openEffect?.type, effectPopupPos === null]);

useEffect(() => {
  if (openEffectId === null) return;
  const onDown = (e) => {
    const t = e.target;
    if (effectPopupRef.current?.contains(t)) return;
    if (
      t.closest?.("[data-popup-dropdown]") ||
      t.closest?.("[data-effect-trigger]") ||
      t.closest?.("[data-color-picker-popup]") ||
      t.closest?.("[data-color-picker-trigger]")
    )
      return;
    closeEffectPopup();
  };
  const onKey = (e) => e.key === "Escape" && closeEffectPopup();
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  return () => {
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("keydown", onKey);
  };
}, [openEffectId]);

useEffect(() => {
  if (toolbarMode !== "frame") closeEffectPopup();
}, [toolbarMode]);
useEffect(() => {
  closeEffectPopup();
}, [primaryFrame.id]);
  const [sidebarPanel, setSidebarPanel] = useState("create"); // "create" | "templates" | "projects"
  const devicesDisabled = toolbarMode === "frame";

// Devices panel isn't available in Frame mode, so move off it.
useEffect(() => {
  if (devicesDisabled && sidebarPanel === "create") setSidebarPanel("projects");
}, [devicesDisabled, sidebarPanel]);
const [savedProjects, setSavedProjects] = useState([]);
const [selectedProjectId, setSelectedProjectId] = useState(null);
const [projectMenu, setProjectMenu] = useState(null); // { id, left, top?, bottom? }
const projectMenuRef = useRef(null);
const [renamingProjectId, setRenamingProjectId] = useState(null);
const [renameDraft, setRenameDraft] = useState("");
const renameCancelRef = useRef(false);
const [saveMenuOpen, setSaveMenuOpen] = useState(false);
useDismissable(saveMenuOpen, "[data-save-menu]", () => setSaveMenuOpen(false));
const [openTick, setOpenTick] = useState(0);
const pendingOpenRef = useRef(null); // saved project waiting for the mode switch to settle

useEffect(() => {
  if (!projectMenu) return;
  const close = () => setProjectMenu(null);
  const onDown = (e) => {
    if (projectMenuRef.current?.contains(e.target) || e.target.closest?.("[data-project-menu-trigger]")) return;
    close();
  };
  const onKey = (e) => e.key === "Escape" && close();
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  window.addEventListener("scroll", close, true);
  window.addEventListener("resize", close);
  return () => {
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("scroll", close, true);
    window.removeEventListener("resize", close);
  };
}, [projectMenu]);

const toggleProjectMenu = (e, id) => {
  e.stopPropagation();
  if (projectMenu?.id === id) {
    setProjectMenu(null);
    return;
  }
  const r = e.currentTarget.getBoundingClientRect();
  const opensUp = window.innerHeight - r.bottom < 220;
  setProjectMenu({
    id,
    left: r.left,
    ...(opensUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
  });
};

const projectLink = (id) => `${window.location.origin}${window.location.pathname}#project-${id}`;
const handleOpenProjectInNewTab = (p) => window.open(projectLink(p.id), "_blank", "noopener");
const handleCopyProjectLink = async (p) => {
  try {
    await navigator.clipboard.writeText(projectLink(p.id));
  } catch (err) {
    console.error("Copy link failed:", err);
  }
};
const handleDuplicateProject = (p) =>
  setSavedProjects((prev) => {
    const i = prev.findIndex((x) => x.id === p.id);
    const copy = { ...p, id: `${Date.now()}`, title: `${p.title} copy`, editedAt: new Date() };
    const next = [...prev];
    next.splice(i + 1, 0, copy);
    return next;
  });
const startRenameProject = (p) => {
  setRenameDraft(p.title);
  setRenamingProjectId(p.id);
};
const commitRenameProject = () => {
  if (renameCancelRef.current) {
    renameCancelRef.current = false;
    setRenamingProjectId(null);
    return;
  }
  const title = renameDraft.trim();
  setSavedProjects((prev) =>
    prev.map((x) => (x.id === renamingProjectId ? { ...x, title, editedAt: new Date() } : x))
  );
  setRenamingProjectId(null);
};
const handleDeleteProject = (id) => {
  setSavedProjects((prev) => prev.filter((x) => x.id !== id));
  setSelectedProjectId((cur) => (cur === id ? null : cur));
};
  const [projectTitle, setProjectTitle] = useState("Untitled project");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const projectTitleInputRef = useRef(null);
  const [deviceCategory, setDeviceCategory] = useState("phone");
  const [categoryDrillDown, setCategoryDrillDown] = useState(null);
  const [brightness, setBrightness] = useState(30);
const [reflectionMode, setReflectionMode] = useState("shiny");
const [reflectionShiny, setReflectionShiny] = useState(45);
const [reflectionMatte, setReflectionMatte] = useState(20);
  const [cameraTab, setCameraTab] = useState("manual");
  const [activeCameraView, setActiveCameraView] = useState(null);
  const [rotationX, setRotationX] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [imageOrVideo, setImageOrVideo] = useState("image");
  const imageOrVideoRef = useRef(imageOrVideo);
  imageOrVideoRef.current = imageOrVideo;

  // First time the user switches to Video: wait for the timeline to mount, then run its tour
  useEffect(() => {
    if (imageOrVideo !== "video") return;
    try {
      if (localStorage.getItem("bezel:video-tour-seen") || !localStorage.getItem("bezel:tour-seen")) return;
    } catch { return; }
    const t = setTimeout(() => {
      if (!tourOpen) startVideoTour();
    }, 450);
    return () => clearTimeout(t);
  }, [imageOrVideo]);
  const [exportWidth, setExportWidth] = useState(1920);
  const [exportFormat, setExportFormat] = useState("png");
  const [videoFormat, setVideoFormat] = useState("mp4");
  const [videoRes, setVideoRes] = useState(1920); // long side in px
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [videoFps, setVideoFps] = useState(24);
  const [exportProgress, setExportProgress] = useState(null); // 0-1 while a video export runs
  const [exportTransparent, setExportTransparent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportToast, setExportToast] = useState(null);
  const exportRef = useRef(null);
  const [finish, setFinish] = useState("Desert titanium");
  const [bodyHex, setBodyHex] = useState("2C1D1D");
  const [bodyOpacity, setBodyOpacity] = useState(100);
  const [deviceType, setDeviceType] = useState("iPhone 16 Pro Max");
  const [strap, setStrap] = useState("original");
  const [strapStyle, setStrapStyle] = useState("sport");

// back to the authored strap when switching watch models
   useEffect(() => {
     setStrap("original");
     setStrapStyle("sport");
   }, [deviceType]);

      useEffect(() => {
     sceneRef.current?.setStrapStyle(strapStyle);
   }, [strapStyle, deviceType]);

useEffect(() => {
  const entry = WATCH_STRAPS.find((s) => s.value === strap);
  sceneRef.current?.setStrap(entry?.pattern ? entry : null);
}, [strap, deviceType]);
  const [canvasSize, setCanvasSize] = useState("Fill");
  const [canvasSizeOpen, setCanvasSizeOpen] = useState(false);
  const [zoomMode, setZoomMode] = useState("Fill");
  const canvasSizeRef = useRef(null);
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1440);
    const [customLocked, setCustomLocked] = useState(false);
  const customRatioRef = useRef(1080 / 1440);
  const toNum = (v) => Number(v && v.target ? v.target.value : v);
  const clampCustom = (n) => Math.min(20000, Math.max(1, Math.round(n) || 1));
  const handleCustomWidth = (v) => {
    const w = clampCustom(toNum(v));
    setCanvasSize("Custom");
    setCustomWidth(w);
    if (customLocked) setCustomHeight(clampCustom(w / customRatioRef.current));
  };
  const handleCustomHeight = (v) => {
    const h = clampCustom(toNum(v));
    setCanvasSize("Custom");
    setCustomHeight(h);
    if (customLocked) setCustomWidth(clampCustom(h * customRatioRef.current));
  };
  const toggleCustomLock = () => {
    if (!customLocked) customRatioRef.current = customWidth / Math.max(1, customHeight);
    setCustomLocked((v) => !v);
  };
    // Canvas size is remembered per tab, so changing it in Frame doesn't change Mockup (and vice versa).
  const canvasByModeRef = useRef({});
  const prevModeRef = useRef(toolbarMode);
  useEffect(() => {
    const prev = prevModeRef.current;
    if (prev === toolbarMode) return;
    canvasByModeRef.current[prev] = { canvasSize, customWidth, customHeight };
    const saved = canvasByModeRef.current[toolbarMode] ?? { canvasSize: "Fill", customWidth: 1080, customHeight: 1440 };
    setCanvasSize(saved.canvasSize);
    setCustomWidth(saved.customWidth);
    setCustomHeight(saved.customHeight);
    prevModeRef.current = toolbarMode;
  }, [toolbarMode]);
  const [customSectionOpen, setCustomSectionOpen] = useState(false);
  const [rotationY, setRotationY] = useState(0);
  const [rotationZ, setRotationZ] = useState(0);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [zoom, setZoom] = useState(70);
  const [fov, setFov] = useState(27);
  const [bgType, setBgType] = useState("solid");
  const [bgHex, setBgHex] = useState(surfaceHex(false));
  const [bgOpacity, setBgOpacity] = useState(100);
  const [gradientOpacity, setGradientOpacity] = useState(100);
  const gradientOpacityInputRef = useRef(null);
  const [gradientType, setGradientType] = useState("Linear");
  const [gradientAngle, setGradientAngle] = useState(90);
  const [gradientPreset, setGradientPreset] = useState("none");
  const [grainAmount, setGrainAmount] = useState(0);
  const [environment, setEnvironment] = useState("none");
  const [lightingIntensity, setLightingIntensity] = useState(60);
  const [customImagePreset, setCustomImagePreset] = useState("none");
  const [customBgImageUrl, setCustomBgImageUrl] = useState(null);
  const [customImageLabel, setCustomImageLabel] = useState(null);
  const [customImageThumb, setCustomImageThumb] = useState(null);
  const [customImageDims, setCustomImageDims] = useState(null);
  const [customCropModalOpen, setCustomCropModalOpen] = useState(false);
  const customImageInputRef = useRef(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [savedColors, setSavedColors] = useState(["FFFFFF", "0A0A0A", "FF47BC"]);
  const [lighting, setLighting] = useState("none");
  // Off by default so screenshots that already include a status bar / home indicator don't get a second one.
  const [showStatusBar, setShowStatusBar] = useState(false);
  const [showHomeIndicator, setShowHomeIndicator] = useState(false);
  const [showMenuBar, setShowMenuBar] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserType, setBrowserType] = useState("safari");
  const [browserTheme, setBrowserTheme] = useState("light");
  const [safariTabs, setSafariTabs] = useState("top");
  const [browserUrl, setBrowserUrl] = useState("bezel.app");

  // Social media UI on the mockup's screen
  const [mockupSocial, setMockupSocial] = useState(DEFAULT_SOCIAL);
  const socialImgCache = useRef(new Map());
  const [socialImgTick, setSocialImgTick] = useState(0);

  // Preload the avatar / emoji / badge images the chosen UI needs, then repaint the screen.
  useEffect(() => {
    if (!mockupSocial.on) return;
    const srcs = new Set(
      [440, 1200]
        .flatMap((pw) => socialOps({ ...mockupSocial, media: null }, pw, pw === 440 ? 956 : 800))
        .filter((o) => o.t === "image" && o.src)
        .map((o) => o.src)
    );
    srcs.forEach((src) => {
      if (socialImgCache.current.has(src)) return;
      const im = new Image();
      im.onload = () => {
        socialImgCache.current.set(src, im);
        setSocialImgTick((n) => n + 1);
      };
      im.src = src;
    });
  }, [mockupSocial]);

  // Called by MockupScene while it paints the screen texture (w x h = the display area).
  const paintMockupSocial = (social, ctx, w, h, media) => {
    const imgs = new Map(socialImgCache.current);
    let mediaSrc = null;
    if (media?.img) {
      let src = media.img;
      const r = media.cropRect;
      if (r && r.width > 0 && r.height > 0) {
        const c = document.createElement("canvas");
        c.width = r.width;
        c.height = r.height;
        c.getContext("2d").drawImage(media.img, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
        c.naturalWidth = r.width; // paintSocial reads natural sizes
        c.naturalHeight = r.height;
        src = c;
      }
      mediaSrc = "mockup-media";
      imgs.set(mediaSrc, src);
    }
    paintSocial(ctx, socialOps({ ...social, media: mediaSrc }, w, h), 0, 0, imgs);
  };
  const [deviceOrientation, setDeviceOrientation] = useState("portrait");
  const [lightDir, setLightDir] = useState({ x: 126, y: 126 });
  const [isDraggingLight, setIsDraggingLight] = useState(false);
const [openSections, setOpenSections] = useState({
  device: true,
  screenInterface: false,
  position: true,
  appearance: true,
  social: false,
  camera: true,
  scene: true,
  text: false,
});

  const [gradientStops, setGradientStops] = useState([
    { id: 1, hex: "FFFFFF", position: 0, opacity: 100 },
    { id: 2, hex: "000000", position: 100, opacity: 100 },
  ]);
  const [backSelectedStopId, setBackSelectedStopId] = useState("back-1");
  const nextBackStopIdRef = useRef(3);
  const [backPickerOpen, setBackPickerOpen] = useState(false);
  const backTriggerRef = useRef(null);
  const backPopupRef = useRef(null);
  const backOpacityInputRef = useRef(null);
  const [selectedStopId, setSelectedStopId] = useState(1);
  const nextStopIdRef = useRef(3);
  const isApplyingPresetRef = useRef(false);
  const hasSeededGradientRef = useRef(false);

  const darkenHex = (hex, amount = 0.55) => {
    const n = parseInt(hex || "000000", 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return [r, g, b]
      .map((v) => Math.round(v * (1 - amount)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };

  const hexToRgba = (hex, opacityPct) => {
    const num = parseInt(hex || "000000", 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacityPct / 100})`;
  };

  const sortedStopList = [...gradientStops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${hexToRgba(s.hex, s.opacity)} ${s.position}%`);
  // CSS needs two stops minimum, so a lone stop is doubled into a solid fill.
  const sortedStopsCss = (sortedStopList.length === 1 ? [sortedStopList[0], sortedStopList[0]] : sortedStopList).join(", ");

  const gradientCss = (() => {
    switch (gradientType) {
      case "Radial":
        return `radial-gradient(circle, ${sortedStopsCss})`;
      case "Angular":
        return `conic-gradient(from ${gradientAngle}deg, ${sortedStopsCss})`;
      case "Diamond":
        return `conic-gradient(from ${(gradientAngle + 45) % 360}deg, ${sortedStopsCss})`;
      case "Linear":
      default:
        return `linear-gradient(${gradientAngle}deg, ${sortedStopsCss})`;
    }
  })();

  const finishOptions = React.useMemo(() => getFinishesForDevice(deviceType), [deviceType]);
  const grainTileUrl = React.useMemo(() => {
    if (bgType !== "gradient" || grainAmount <= 0) return null;
    return makeGrainTile(512, grainAmount).toDataURL("image/png");
  }, [bgType, grainAmount]);
  const isTablet = CATEGORY_DEVICE_OPTIONS.tablet.some((o) => o.value === deviceType);
  const isPhone = DEVICE_TYPE_OPTIONS.some((o) => o.value === deviceType);
  const isWatch = CATEGORY_DEVICE_OPTIONS.watch.some((o) => o.value === deviceType);
  const showSocial = mockupSocial.on;
  const browserOptions = isTablet
    ? BROWSER_OPTIONS.filter((o) => o.value === "safari" || o.value === "chrome")
    : BROWSER_OPTIONS;

  // Arc and Edge have no tablet layout, so fall back to Safari if one was selected
  useEffect(() => {
    if (isTablet && browserType !== "safari" && browserType !== "chrome") setBrowserType("safari");
  }, [isTablet, browserType]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const videoTplMode = imageOrVideo === "video";
  const filteredTemplates = React.useMemo(
    () =>
      (videoTplMode
        ? toolbarMode === "frame" ? FRAME_VIDEO_TEMPLATES : VIDEO_TEMPLATES
        : toolbarMode === "frame" ? FRAME_TEMPLATE_LIBRARY : TEMPLATE_LIBRARY
      ).filter((t) =>
        `${t.label} ${t.tags}`.toLowerCase().includes(templateSearch.toLowerCase())
      ),
    [templateSearch, toolbarMode, videoTplMode]
  );

  // Silhouette for the card previews: follows the selected device family (and tablet orientation)
  const tplShape = (() => {
    const s = TEMPLATE_DEVICE_SHAPE[deviceCategory] ?? TEMPLATE_DEVICE_SHAPE.phone;
    return isTablet && deviceOrientation === "landscape" ? { ...s, w: s.h, h: s.w } : s;
  })();

    // Real-model thumbnails for the Templates panel, rendered in small batches so the UI stays responsive.
  const [tplPreviews, setTplPreviews] = useState({});
  useEffect(() => {
    if (sidebarPanel !== "templates" || !sidebarOpen || toolbarMode !== "mockup" || videoTplMode) return;
    let cancelled = false;
    let timer;
    const run = (attempt = 0) => {
      const scene = sceneRef.current;
      if (!scene?.isReady?.(deviceType)) {
        if (attempt < 20) timer = setTimeout(() => run(attempt + 1), 250); // model still loading
        return;
      }
      const BATCH = 4;
      let i = 0;
      const step = () => {
        if (cancelled) return;
        const slice = TEMPLATE_LIBRARY.slice(i, i + BATCH);
        if (!slice.length) return;
        const urls = scene.renderPreviews(slice.map(templatePreviewCam));
        if (urls) {
          setTplPreviews((p) => {
            const next = { ...p };
            slice.forEach((t, k) => { next[t.id] = urls[k]; });
            return next;
          });
        }
        i += BATCH;
        timer = setTimeout(step, 30);
      };
      step();
    };
    timer = setTimeout(run, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sidebarPanel, sidebarOpen, toolbarMode, videoTplMode, deviceType, finish, bodyHex, bodyOpacity, deviceOrientation, uploadedMediaThumb]);

const handleFinishChange = useCallback((value) => {
  setFinish(value);
}, []);

// ADD: reset finish to a valid option whenever the device changes
useEffect(() => {
  const options = getFinishesForDevice(deviceType);
  const stillValid = options.some((f) => f.value === finish);
  if (!stillValid) {
    setFinish(options[0].value);
  }
}, [deviceType]);

// ADD: reset deviceType to a valid option whenever the category changes
useEffect(() => {
  const options = CATEGORY_DEVICE_OPTIONS[deviceCategory] || [];
  const stillValid = options.some((d) => d.value === deviceType);
  if (!stillValid && options.length > 0) {
    setDeviceType(options[0].value);
  }
}, [deviceCategory]);

// Phones always start in light mode when you switch to them
useEffect(() => {
  if (deviceCategory === "phone") setBrowserTheme("light");
}, [deviceCategory]);

  useEffect(() => {
    if (isApplyingPresetRef.current) {
      isApplyingPresetRef.current = false;
      return;
    }
    if (gradientPreset !== "none") {
      setGradientPreset("none");
    }
  }, [gradientType, gradientAngle, gradientStops]);

  const handleStopPositionChange = (id, position) => {
    setGradientStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, position: Math.min(100, Math.max(0, position)) } : s))
    );
  };

  const handleStopHexChange = (id, hex) => {
    setGradientStops((prev) => prev.map((s) => (s.id === id ? { ...s, hex } : s)));
  };

  const handleStopOpacityChange = (id, opacity) => {
    setGradientStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, opacity: Math.min(100, Math.max(0, opacity)) } : s))
    );
  };

  const interpolateGradientColor = (position, stops) => {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    if (position <= sorted[0].position) return { hex: sorted[0].hex, opacity: sorted[0].opacity };
    const last = sorted[sorted.length - 1];
    if (position >= last.position) return { hex: last.hex, opacity: last.opacity };

    let left = sorted[0];
    let right = last;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (position >= sorted[i].position && position <= sorted[i + 1].position) {
        left = sorted[i];
        right = sorted[i + 1];
        break;
      }
    }

    const span = right.position - left.position;
    const t = span === 0 ? 0 : (position - left.position) / span;

    const hexToRgb = (hex) => {
      const n = parseInt(hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const rgbToHex = (r, g, b) =>
      [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

    const [r1, g1, b1] = hexToRgb(left.hex);
    const [r2, g2, b2] = hexToRgb(right.hex);
    const hex = rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
    const opacity = Math.round(left.opacity + (right.opacity - left.opacity) * t);

    return { hex, opacity };
  };

  const handleAddStop = (position = 50, color) => {
    const id = nextStopIdRef.current++;
    const clamped = Math.min(100, Math.max(0, position));
    const { hex, opacity } = color ?? interpolateGradientColor(clamped, gradientStops);
    setGradientStops((prev) =>
      [...prev, { id, hex, position: clamped, opacity }].sort((a, b) => a.position - b.position)
    );
    setSelectedStopId(id);
  };

  const handleRemoveStop = (id) => {
    setGradientStops((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
    if (selectedStopId === id) {
      setSelectedStopId(gradientStops.find((s) => s.id !== id)?.id ?? null);
    }
  };

  const handleFlipGradient = () => {
    setGradientStops((prev) => prev.map((s) => ({ ...s, position: 100 - s.position })));
  };

  const handleRotateGradient = () => {
    setGradientAngle((prev) => (prev + 45) % 360);
  };

    const handleBackStopPosition = (id, position) =>
    setBackStops((prev) => prev.map((s) => (s.id === id ? { ...s, position: Math.min(100, Math.max(0, position)) } : s)));
  const handleBackStopHex = (id, hex) =>
    setBackStops((prev) => prev.map((s) => (s.id === id ? { ...s, hex } : s)));
  const handleBackStopOpacity = (id, opacity) =>
    setBackStops((prev) => prev.map((s) => (s.id === id ? { ...s, opacity: Math.min(100, Math.max(0, opacity)) } : s)));
  const handleBackAddStop = (position = 50, color) => {
    const id = `back-${nextBackStopIdRef.current++}`;
    const clamped = Math.min(100, Math.max(0, position));
    const { hex, opacity } = color ?? interpolateGradientColor(clamped, backStops);
    setBackStops((prev) => [...prev, { id, hex, position: clamped, opacity }].sort((a, b) => a.position - b.position));
    setBackSelectedStopId(id);
  };
  const handleBackRemoveStop = (id) => {
    setBackStops((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
    if (backSelectedStopId === id) setBackSelectedStopId(backStops.find((s) => s.id !== id)?.id ?? null);
  };
  const handleBackFlip = () => setBackStops((prev) => prev.map((s) => ({ ...s, position: 100 - s.position })));
  const handleBackRotate = () => setBackGradientAngle((prev) => (prev + 45) % 360);

  const handleGradientPresetChange = useCallback((presetValue) => {
    const preset = GRADIENT_PRESETS.find((p) => p.value === presetValue);
    if (!preset) return;
    isApplyingPresetRef.current = true;
    setGradientPreset(presetValue);
    if (preset.value === "none" || !preset.stops) {
      isApplyingPresetRef.current = false;
      return;
    }
    setGradientType(preset.type);
    setGradientAngle(preset.angle);
    setGradientStops(preset.stops.map((s) => ({ ...s })));
    setSelectedStopId(preset.stops[0]?.id ?? null);
  }, []);

  const handleCustomImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomImagePreset("none");
    setCustomBgImageUrl(url);
    setCustomImageLabel(file.name);
    setCustomImageThumb(url);
    setCustomImageDims(null);
  }, []);

  const handleImagePresetChange = useCallback((presetValue) => {
    const preset = IMAGE_PRESETS.find((p) => p.value === presetValue);
    if (!preset) return;
    setCustomImagePreset(presetValue);
    setCustomBgImageUrl(preset.url ?? null);
    setCustomImageLabel(preset.value === "none" ? null : preset.label);
    setCustomImageThumb(preset.thumb ?? null);
    setCustomImageDims(null);
  }, []);

  const handleClearCustomImage = useCallback(() => {
    setCustomImagePreset("none");
    setCustomBgImageUrl(null);
    setCustomImageLabel(null);
    setCustomImageThumb(null);
    setCustomImageDims(null);
  }, []);

  // Same "resolve dimensions before opening" pattern as handleOpenCropModal,
  // so this button never sits stuck disabled or races the modal open.
  const handleOpenCustomCropModal = useCallback(() => {
    if (!customBgImageUrl) return;
    if (customImageDims) {
      setCustomCropModalOpen(true);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setCustomImageDims({ width: img.naturalWidth, height: img.naturalHeight });
      setCustomCropModalOpen(true);
    };
    img.src = customBgImageUrl;
  }, [customBgImageUrl, customImageDims]);

  const makePercentDrag = (value, onChange, targetInputRef) => (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = value;
    let dragged = false;
    const container = e.currentTarget;

    if (e.pointerId !== undefined && container.setPointerCapture) {
      try {
        container.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    const styleEl = document.createElement("style");
    styleEl.innerHTML = `* { cursor: ew-resize !important; user-select: none !important; -webkit-user-select: none !important; }`;
    document.head.appendChild(styleEl);

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 2) dragged = true;
      const next = Math.min(100, Math.max(0, Math.round(startVal + dx * 0.5)));
      onChange(next);
    };

    const onUp = (ev) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);

      if (ev.pointerId !== undefined && container.releasePointerCapture) {
        try {
          container.releasePointerCapture(ev.pointerId);
        } catch (_) {}
      }

      styleEl.remove();

      if (!dragged) {
        if (targetInputRef?.current) {
          targetInputRef.current.focus();
        } else {
          container.querySelector("input")?.focus();
        }
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const [textItems, setTextItems] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const selectedTextIdRef = useRef(null);
  selectedTextIdRef.current = selectedTextId;
  const nextTextIdRef = useRef(1);
    // Drag-to-reorder for the text layer rows
  const textDragRef = useRef(null);
  const [draggingTextId, setDraggingTextId] = useState(null);
  const [textDrop, setTextDrop] = useState(null); // { id, pos: "before" | "after" }
  const endTextDrag = () => {
    textDragRef.current = null;
    setDraggingTextId(null);
    setTextDrop(null);
  };
  const moveTextLayer = (fromId, toId, pos) =>
    setTextItems((prev) => {
      const from = prev.findIndex((t) => t.id === fromId);
      if (from < 0 || fromId === toId) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      const to = next.findIndex((t) => t.id === toId);
      if (to < 0) return prev;
      next.splice(pos === "before" ? to : to + 1, 0, moved);
      return next.every((t, i) => t === prev[i]) ? prev : next;
    });
  const [textPopupOpen, setTextPopupOpen] = useState(false);

  // textItem / setTextItem = the selected layer, so the popup and color picker code is unchanged.
  const textItem = textItems.find((t) => t.id === selectedTextId) ?? null;
  const setTextItem = (v) => {
    const id = selectedTextIdRef.current;
    setTextItems((prev) =>
      prev.map((t) => (t.id === id ? (typeof v === "function" ? v(t) : { ...v, id }) : t))
    );
  };
  const updateTextById = (id, patch) =>
    setTextItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  // Canvas box size: truncation needs it for the 3D scene.
  const canvasBoxRef = useRef(null);
  const [canvasDims, setCanvasDims] = useState(null);
  useLayoutEffect(() => {
    const el = canvasBoxRef.current;
    if (!el) return;
    const update = () =>
      setCanvasDims((p) => (p && p.w === el.clientWidth && p.h === el.clientHeight ? p : { w: el.clientWidth, h: el.clientHeight }));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectText = (id) => {
    if (id === selectedTextId && textPopupOpen) return;
    closeEffectPopup();
    setSelectedTextId(id);
    setTextPopupOpen(true);
  };
  const toggleTextRow = (id) => {
    if (id === selectedTextId && textPopupOpen) {
      setTextPopupOpen(false);
      setColorPickerOpen(false);
      setSelectedTextId(null);
    } else selectText(id);
  };
  const addTextLayer = () => {
    const id = nextTextIdRef.current++;
    closeEffectPopup();
    setTextItems((prev) => [
      ...prev,
      { ...DEFAULT_TEXT, id, visible: true, mode: toolbarMode, hex: darkMode ? "FFFFFF" : "000000", dy: prev.length ? 0.06 * (prev.length % 6) : 0 },
    ]);
    setSelectedTextId(id);
    setTextPopupOpen(true);
    if (videoOn) vidAddTextClip(id); // Video mode: the text gets a clip in the current shot
  };

  const [textTool, setTextTool] = useState(false);
  const [pendingEditId, setPendingEditId] = useState(null);

  // Click with the text tool: drop an empty text block with its top-left corner at the click point, and start typing.
  const createTextAt = (x, y, w, h) => {
    const id = nextTextIdRef.current++;
    closeEffectPopup();
    setTextItems((prev) => [
      ...prev,
      {
        ...DEFAULT_TEXT,
        id,
        name: "Text",
        content: "",
        size: 32,
        visible: true,
        mode: toolbarMode,
        position: "tl",
        dx: (x - 24) / w, // 24 = the text padding (TEXT_PAD)
        dy: (y - 24) / h,
        hex: darkMode ? "FFFFFF" : "000000",
      },
    ]);
    setSelectedTextId(id);
    setTextPopupOpen(true);
    setPendingEditId(id);
    setTextTool(false);
    if (videoOn) vidAddTextClip(id);
  };

  // opts.inPlace: copy lands exactly on the source (used by Alt-drag). opts.keepSelection: don't select the copy.
  const duplicateTextLayer = (id = selectedTextIdRef.current, opts = {}) => {
    if (id == null) return;
    const nid = nextTextIdRef.current++;
    const off = opts.inPlace ? 0 : 0.03;
    setTextItems((prev) => {
      const i = prev.findIndex((t) => t.id === id);
      if (i < 0) return prev;
      const src = prev[i];
      const copy = {
        ...src,
        id: nid,
        dx: (src.dx ?? 0) + off,
        dy: (src.dy ?? 0) + off,
        customFonts: [...src.customFonts],
        decoStash: { ...(src.decoStash ?? {}) },
      };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
    if (!opts.keepSelection) setSelectedTextId(nid);
  };
  const deleteTextLayer = (id = selectedTextIdRef.current) => {
    if (id == null) return;
    setTextItems((prev) => prev.filter((t) => t.id !== id));
setVidTexts((prev) => (prev.some((c) => c.tid === id) ? prev.filter((c) => c.tid !== id) : prev));
    if (id === selectedTextIdRef.current) {
      setSelectedTextId(null);
      setTextPopupOpen(false);
      setColorPickerOpen(false);
    }
  };
  const frameSelect = (ids) => {
    setSelectedIds(ids);
    setSelectedTextId(null); // selecting a frame leaves the text layer
  };

  // After undo/redo, drop a selection that no longer exists.
  useEffect(() => {
    if (selectedTextId !== null && !textItems.some((t) => t.id === selectedTextId)) {
      setSelectedTextId(null);
      setTextPopupOpen(false);
      setColorPickerOpen(false);
    }
  }, [textItems, selectedTextId]);

    useEffect(() => {
    setSelectedTextId(null);
    setTextPopupOpen(false);
    setColorPickerOpen(false);
  }, [toolbarMode]);

  useEffect(() => {
    if (!textTool) return;
    const onKey = (e) => e.key === "Escape" && setTextTool(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [textTool]);

  useEffect(() => {
    setTextTool(false);
  }, [toolbarMode]);

  const textPopupRef = useRef(null);
  const addTextBtnRef = useRef(null);
  const [colorPickerTarget, setColorPickerTarget] = useState("background");
  const [gradientPickerOpen, setGradientPickerOpen] = useState(false);
  const gradientTriggerRef = useRef(null);
  const gradientPopupRef = useRef(null);

  const handleSwatchClick = (target) => {
    if (colorPickerOpen && colorPickerTarget === target) {
      setColorPickerOpen(false);
    } else {
      setColorPickerTarget(target);
      setColorPickerOpen(true);
    }
  };

  const activeGradientStop =
    typeof colorPickerTarget === "number" ? gradientStops.find((s) => s.id === colorPickerTarget) : null;
  const activeBackStop =
    typeof colorPickerTarget === "string" && colorPickerTarget.startsWith("back-")
      ? backStops.find((s) => s.id === colorPickerTarget)
      : null;
  const activeEffect =
    typeof colorPickerTarget === "string" && colorPickerTarget.startsWith("fx-")
      ? frameEffects.find((e) => `fx-${e.id}` === colorPickerTarget)
      : null;
  const colorPickerAnchorRef = activeGradientStop
    ? gradientPopupRef
    : activeBackStop
    ? backPopupRef
    : activeEffect
    ? effectPopupRef
    : colorPickerTarget === "text" || colorPickerTarget === "text-fill" || colorPickerTarget === "text-deco"
    ? textPopupRef
    : toolbarRef;
  const isStrokeTarget = colorPickerTarget === "stroke";
  const isFrameBackTarget = colorPickerTarget === "frame-back";

  const pickerHex = activeGradientStop
    ? activeGradientStop.hex
    : activeBackStop
    ? activeBackStop.hex
    : activeEffect
    ? activeEffect.hex
    : isStrokeTarget
    ? frameStroke.hex
    : colorPickerTarget === "text-deco"
    ? textItem?.decoHex || textItem?.hex || "FFFFFF"
    : colorPickerTarget === "text-fill"
    ? textItem?.fillHex || textItem?.hex || "FFFFFF"
    : colorPickerTarget === "text"
    ? textItem?.hex ?? "FFFFFF"
    : isFrameBackTarget
    ? frameBackHex
    : colorPickerTarget === "body"
    ? bodyHex
    : bgHex;
  const pickerOpacity = activeGradientStop
    ? activeGradientStop.opacity
    : activeBackStop
    ? activeBackStop.opacity
    : activeEffect
    ? activeEffect.opacity
    : isStrokeTarget
    ? frameStroke.opacity
    : colorPickerTarget === "text-deco"
    ? (textItem?.decoHex ? textItem?.decoOpacity ?? 100 : textItem?.opacity ?? 100)
    : colorPickerTarget === "text-fill"
    ? (textItem?.fillHex ? textItem?.fillOpacity ?? 100 : textItem?.opacity ?? 100)
    : colorPickerTarget === "text"
    ? textItem?.opacity ?? 100
    : isFrameBackTarget
    ? frameBackOpacity
    : colorPickerTarget === "body"
    ? bodyOpacity
    : bgOpacity;

  const updateStroke = (patch) => setFrameStroke((prev) => ({ ...prev, ...patch }));
  const updateEffect = (id, patch) =>
    setFrameEffects((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEffect = (id) => {
  setFrameEffects((prev) => prev.filter((e) => e.id !== id));
  if (openEffectId === id) closeEffectPopup();
};
  const addEffect = () => {
    const id = nextEffectIdRef.current++;
    setFrameEffects((prev) => {
      const used = new Set(prev.map((e) => e.type));
      const type = EFFECT_TYPE_OPTIONS.find((o) => !used.has(o.value))?.value ?? "dropShadow";
      return [...prev, makeEffect(type, id)];
    });
  };
  const changeEffectType = (id, type) =>
    setFrameEffects((prev) => prev.map((e) => (e.id === id ? { ...makeEffect(type, id), visible: e.visible } : e)));

  const handlePickerColorChange = (nextHex, nextOpacity) => {
    if (activeGradientStop) {
      handleStopHexChange(activeGradientStop.id, nextHex);
      handleStopOpacityChange(activeGradientStop.id, nextOpacity);
    } else if (activeBackStop) {
      handleBackStopHex(activeBackStop.id, nextHex);
      handleBackStopOpacity(activeBackStop.id, nextOpacity);
    } else if (activeEffect) {
      updateEffect(activeEffect.id, { hex: nextHex, opacity: nextOpacity });
    } else if (isStrokeTarget) {
      updateStroke({ hex: nextHex, opacity: nextOpacity });
    } else if (colorPickerTarget === "text-deco") {
      setTextItem((t) => (t ? { ...t, decoHex: nextHex, decoOpacity: nextOpacity } : t));
    } else if (colorPickerTarget === "text-fill") {
      setTextItem((t) => (t ? { ...t, fillHex: nextHex, fillOpacity: nextOpacity } : t));
    } else if (colorPickerTarget === "text") {
      setTextItem((t) => (t ? { ...t, hex: nextHex, opacity: nextOpacity } : t));
    } else if (isFrameBackTarget) {
      setFrameBackHex(nextHex);
      setFrameBackOpacity(nextOpacity);
    } else if (colorPickerTarget === "body") {
      setBodyHex(nextHex);
      setBodyOpacity(nextOpacity);
    } else {
      setBgHex(nextHex);
      setBgOpacity(nextOpacity);
    }
  };

  const toggleSection = useCallback((key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    if (bgAnimOnRef.current) return; // a background animation is painting the scene
    if (bgType === "solid") {
      sceneRef.current?.setBackground(bgHex, bgOpacity);
    } else if (bgType === "gradient") {
      sceneRef.current?.setBackgroundGradient?.(gradientType, gradientStops, gradientOpacity, gradientAngle, grainAmount);
    } else if (bgType === "custom") {
      sceneRef.current?.setBackgroundImage?.(customBgImageUrl);
    }
  }, [bgType, bgHex, bgOpacity, gradientType, gradientStops, gradientOpacity, gradientAngle, grainAmount, customBgImageUrl]);

useEffect(() => {
  if (finish === "Custom") {
    sceneRef.current?.setBodyColor(bodyHex, bodyOpacity);
  } else {
    const entry = finishOptions.find((f) => f.value === finish);
    if (entry?.hex) {
      sceneRef.current?.setBodyColor(entry.hex, 100, entry.roughness, entry.metalness, entry.value);
    }
  }
}, [finish, bodyHex, bodyOpacity, finishOptions]);

  useEffect(() => {
    const intensity = reflectionMode === "shiny" ? reflectionShiny : reflectionMatte;
    sceneRef.current?.setScreenReflection(reflectionMode, intensity);
  }, [reflectionMode, reflectionShiny, reflectionMatte]);

  useEffect(() => {
    const t = setTimeout(() => {
      sceneRef.current?.setScreenOverlays({
        statusBar: showStatusBar && !isWatch,
        homeIndicator: showHomeIndicator && !isWatch,
        menuBar: showMenuBar,
        browser: showBrowser && !showSocial && !isWatch ? browserType : "none",
        socialPaint: showSocial && !isWatch ? (ctx, w, h, media) => paintMockupSocial(mockupSocial, ctx, w, h, media) : null,
        browserTheme,
        browserUrl,
        browserTabs: safariTabs,
        orientation: deviceOrientation,
      });
    }, 120);
    return () => clearTimeout(t);
  }, [showStatusBar, showHomeIndicator, showMenuBar, showBrowser, browserType, browserTheme, browserUrl, safariTabs, deviceOrientation, showSocial, mockupSocial, socialImgTick, fontTick, isWatch]);

  useEffect(() => {
    if (isEditingTitle && projectTitleInputRef.current) {
      projectTitleInputRef.current.focus();
      projectTitleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!canvasSizeOpen) return;
    const onDown = (e) => {
      if (!canvasSizeRef.current?.contains(e.target)) setCanvasSizeOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [canvasSizeOpen]);

    useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => {
      if (e.target.closest?.("[data-popup-dropdown]")) return;
      if (!exportRef.current?.contains(e.target)) setExportOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && !exporting && setExportOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [exportOpen, exporting]);

  useEffect(() => {
    if (!colorPickerOpen) return;
    const onDown = (e) => {
      const insideTrigger = e.target.closest?.("[data-color-picker-trigger]");
      const insidePopup = e.target.closest?.("[data-color-picker-popup]");
      if (!insideTrigger && !insidePopup) {
        setColorPickerOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [colorPickerOpen]);

  useEffect(() => {
    if (!gradientPickerOpen) return;
    const onDown = (e) => {
      const insideTrigger = e.target.closest?.("[data-gradient-picker-trigger]");
      const insidePopup = e.target.closest?.("[data-gradient-picker-popup]");
      const insideColorPopup = e.target.closest?.("[data-color-picker-popup]");
      if (!insideTrigger && !insidePopup && !insideColorPopup) {
        setGradientPickerOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [gradientPickerOpen]);

  useEffect(() => {
  sceneRef.current?.setEnvironment(environment);
}, [environment]);

  useEffect(() => {
    sceneRef.current?.setDeviceType(deviceType);
  }, [deviceType]);

  useEffect(() => {
    sceneRef.current?.setFrameMode(toolbarMode === "frame");
  }, [toolbarMode]);

    useEffect(() => {
    if (!backPickerOpen) return;
    const onDown = (e) => {
      const t = e.target;
      if (
        t.closest?.("[data-back-picker-trigger]") ||
        backPopupRef.current?.contains(t) ||
        t.closest?.("[data-color-picker-popup]")
      )
        return;
      setBackPickerOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [backPickerOpen]);

  useEffect(() => {
    if (toolbarMode !== "frame") setBackPickerOpen(false);
  }, [toolbarMode]);

  const handleBrightnessChange = useCallback((value) => {
    setBrightness(value);
    sceneRef.current?.setBrightness(value);
  }, []);

    const handleReflectionModeChange = useCallback((mode) => {
    setReflectionMode(mode);
  }, []);

  const handleReflectionIntensityChange = useCallback((value) => {
    if (reflectionMode === "shiny") setReflectionShiny(value);
    else setReflectionMatte(value);
  }, [reflectionMode]);

  const handleLightingChange = useCallback((key) => {
    setLighting(key);
    sceneRef.current?.setLightingPreset(key);
  }, []);

    const handleLightingIntensityChange = useCallback((value) => {
    setLightingIntensity(value);
    sceneRef.current?.setLightingIntensity(value);
  }, []);

  const handleRotationChange = useCallback((value) => {
    setRotationX(value);
    setActiveCameraView(null);
    sceneRef.current?.setManualRotation(value);
  }, []);

  const handleRotationYChange = useCallback((value) => {
    setRotationY(value);
    setActiveCameraView(null);
    sceneRef.current?.setManualRotationY(value);
  }, []);

  const handleRotationZChange = useCallback((value) => {
    setRotationZ(value);
    setActiveCameraView(null);
    sceneRef.current?.setManualRotationZ(value);
  }, []);

  const handlePositionXChange = useCallback((value) => {
    setPositionX(value);
    setActiveCameraView(null);
    sceneRef.current?.setPositionX(value);
  }, []);

  const handlePositionYChange = useCallback((value) => {
    setPositionY(value);
    setActiveCameraView(null);
    sceneRef.current?.setPositionY(value);
  }, []);

  const handleZoomChange = useCallback((value) => {
    setZoom(value);
    setActiveCameraView(null);
    sceneRef.current?.setZoom(value);
  }, []);

  const handleFovChange = useCallback((value) => {
    setFov(value);
    setActiveCameraView(null);
    sceneRef.current?.setFov(value);
  }, []);

  const handleCameraViewPreset = useCallback((p) => {
    setCameraEase(true);
    clearTimeout(cameraEaseTimerRef.current);
    cameraEaseTimerRef.current = setTimeout(() => setCameraEase(false), 360);
    handleRotationChange(p.rotationX);
    handleRotationYChange(p.rotationY);
    handleRotationZChange(p.rotationZ);
    handlePositionXChange(p.positionX);
    handlePositionYChange(p.positionY);
    handleZoomChange(p.zoom);
    handleFovChange(p.fov);
    setActiveCameraView(p.key);
  }, [handleRotationChange, handleRotationYChange, handleRotationZChange, handlePositionXChange, handlePositionYChange, handleZoomChange, handleFovChange]);

  // Frame mode: only resets what Frame uses (Z rotation, position, zoom)
  const resetFrameCamera = () => {
    const ids = selectedIdsRef.current;
    setFrames((prev) => prev.map((f) => (ids.includes(f.id) ? { ...f, r: 0, s: null } : f)));
    setGroupRot(0);
    setCameraEase(true);
    clearTimeout(cameraEaseTimerRef.current);
    cameraEaseTimerRef.current = setTimeout(() => setCameraEase(false), 360);
handleRotationChange(0);
handleRotationYChange(0);
handleRotationZChange(0);
handlePositionXChange(0);
    handlePositionYChange(0);
    handleZoomChange(70);
  };

  const handleApplyTemplate = useCallback((tpl) => {
    // camera
    const preset = TEMPLATE_CAMERAS.find((p) => p.key === tpl.cameraKey);
    if (preset) handleCameraViewPreset(preset);

    // background
    const bg = tpl.bg;
    if (bg.type === "solid") {
      setBgHex(bg.hex);
      setBgOpacity(100);
      setBgType("solid");
    } else if (bg.type === "gradient") {
      handleGradientPresetChange(bg.preset);
      setGradientOpacity(100);
      setGrainAmount(tpl.grain ?? 0);
      setBgType("gradient");
    } else {
      handleImagePresetChange(bg.preset);
      setBgType("custom");
    }
    if (bg.type !== "gradient") setGrainAmount(0);

    // environment + lighting
    setEnvironment(tpl.environment);
    handleLightingChange(tpl.lighting);
    handleLightingIntensityChange(tpl.lightingIntensity);

    setSidebarOpen(true);
  }, [handleCameraViewPreset, handleGradientPresetChange, handleImagePresetChange, handleLightingChange, handleLightingIntensityChange]);

  // Frame templates: scene look + a multi-frame layout. Existing frames (and their images) are reused in order;
  // extra slots get copies of your images (cycled), and leftover frames are dropped.
  const handleApplyFrameTemplate = (tpl) => {
    const bg = tpl.bg;
    if (bg.type === "solid") {
      setBgHex(bg.hex);
      setBgOpacity(100);
      setBgType("solid");
    } else if (bg.type === "gradient") {
      handleGradientPresetChange(bg.preset);
      setGradientOpacity(100);
      setGrainAmount(tpl.grain ?? 0);
      setBgType("gradient");
    } else {
      handleImagePresetChange(bg.preset);
      setBgType("custom");
    }
    if (bg.type !== "gradient") setGrainAmount(0);
    setEnvironment(tpl.environment);
    setSidebarOpen(true);

    const box = frameSizeRef.current;
    if (!box) return;
    const short = Math.min(box.w, box.h);
    const prev = framesLatestRef.current;
    const base = prev.find((f) => selectedIds.includes(f.id)) ?? prev[0];
    const pool = prev.filter((f) => f.img).map((f) => f.img);
    const NOMINAL_H = 1000;

    const next = layoutOf(tpl).map((sl, i) => {
      const existing = prev[i];
      const src = existing ?? cloneFrame(base, nextFrameIdRef.current++);
      const img = src.img ?? (pool.length ? { ...pool[i % pool.length] } : null);
      return {
        ...src,
        img,
        w: Math.round(NOMINAL_H * sl.r),
        h: NOMINAL_H,
        s: (sl.h * box.h) / short / NOMINAL_H,
        x: (sl.x * box.w) / short,
        y: (sl.y * box.h) / short,
        radius: tpl.radius,
        corners: null,
        stroke: tpl.stroke ? { ...DEFAULT_STROKE, on: true, ...tpl.stroke } : DEFAULT_STROKE,
        effects: tpl.shadow ? [{ ...makeEffect("dropShadow", nextEffectIdRef.current++), ...tpl.shadow }] : [],
      };
    });

    framesLatestRef.current = next;
    setFrames(next);
    setSelectedIds([next[0].id]);
  };

  const handleLightDirChange = useCallback((point) => {
    setLightDir(point);
    sceneRef.current?.setLightDirection((point.x / 252) * 100, (point.y / 252) * 100);
  }, []);

 const handleUpload = useCallback(async (e) => {
 if (toolbarModeRef.current === "frame") {
  const files = Array.from(e.target.files ?? []).filter(
    (f) => f.type.startsWith("image/") || (imageOrVideoRef.current === "video" && f.type.startsWith("video/"))
  );
  const isPicker = "value" in e.target; // file input = click, otherwise it's a drop
  const raw = isPicker ? pickTargetRef.current : null;
  const targets = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
  pickTargetRef.current = null;
  if (isPicker) e.target.value = ""; // so the same file can be picked again
  if (isPicker && targets.length) {
    if (files[0]) frameUploadRef.current(files[0], targets);
  } else {
    files.forEach((file) => frameUploadRef.current(file, null)); // drops always add new frames
  }
  return;
 }
  const picked = e.target.files?.[0];
  if (!picked) return;
  let file = picked;
  let video = null;
  if (picked.type.startsWith("video/")) {
    if (imageOrVideoRef.current !== "video") return;
    const m = await loadVideoMeta(picked);
    if (!m) return;
    file = m.poster; // the scene gets the first frame as its still image
    video = { el: m.el, url: m.url, duration: m.duration };
    if ("value" in e.target) e.target.value = "";
  } else if (imageOrVideoRef.current === "video" && vidUploadRef.current?.(picked)) {
    if ("value" in e.target) e.target.value = "";
    return; // Video mode: the image belongs to the shot, not the global upload
  }
  uploadedFileRef.current = file;
  setFrameCropUrl(null);
  setUploadedCrop(null);
  sceneRef.current?.uploadFile(file);
  setMockupVideo(video);
  const url = URL.createObjectURL(file);
  setUploadedMediaLabel(picked.name);
  setUploadedMediaThumb(url);
  setUploadedImageDims(null); // stale dims from a previous image, if any
  // Frame mode's W/H follow the uploaded image's real size, same as the crop modal shows.
  const probe = new Image();
  probe.onload = () => {
    if (uploadedFileRef.current !== file) return; // a newer upload or a clear replaced this one
    setUploadedImageDims({ width: probe.naturalWidth, height: probe.naturalHeight });
  };
  probe.src = url;
}, []);

  // Computes natural dimensions on demand (rather than racing it against
  // handleUpload) and only then opens the modal, so the crop button never
  // gets stuck disabled waiting on state that hasn't settled yet.
  const handleOpenCropModal = useCallback(() => {
    if (!uploadedMediaThumb) return;
    if (uploadedImageDims) {
      setCropModalOpen(true);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setUploadedImageDims({ width: img.naturalWidth, height: img.naturalHeight });
      setCropModalOpen(true);
    };
    img.src = uploadedMediaThumb;
  }, [uploadedMediaThumb, uploadedImageDims]);

  const handleClearUpload = useCallback(() => {
    sceneRef.current?.clearScreenshot();
    setMockupVideo(null);
    uploadedFileRef.current = null;
    setFrameCropUrl(null);
    setUploadedCrop(null);
    setUploadedImageDims(null);
    setUploadedMediaLabel(null);
    setUploadedMediaThumb(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

    useEffect(() => {
    const el = mockupVideo?.el;
    const on = !!el && imageOrVideo === "video" && toolbarMode === "mockup";
    sceneRef.current?.setScreenVideo?.(on ? el : null);
    if (!el) return;
    const repaint = () => sceneRef.current?.refreshScreen?.();
    el.addEventListener("seeked", repaint);
    return () => {
      el.removeEventListener("seeked", repaint);
      el.pause();
    };
  }, [mockupVideo, imageOrVideo, toolbarMode]);

  const handleFileDrop = (files) => {
    const images = files.filter(
      (f) => f.type.startsWith("image/") || (imageOrVideo === "video" && f.type.startsWith("video/"))
    );
    if (!images.length) return;
    handleUpload({ target: { files: images } });
  };
  const uploadDrop = useFileDrop(handleFileDrop);
  const canvasDrop = useFileDrop(handleFileDrop);

  // A file dropped outside a drop zone would make the browser navigate to it
  // and lose the project, so swallow those drops.
  useEffect(() => {
    const isFileDrag = (e) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const guard = (e) => {
      if (!isFileDrag(e) || e.defaultPrevented) return;
      e.preventDefault();
      if (e.type === "dragover") e.dataTransfer.dropEffect = "none";
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);

  // ov (video export only): { cam, pose, texts, bg } for the frame being rendered
  const renderFrameCanvas = async (width, transparent = false, height = null, ov = null) => {
    const size = frameSizeRef.current;
    if (!size) return null;
    const outW = width;
    const outH = height ?? Math.round(width * (size.h / size.w));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");

    const loadImg = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    const drawCover = (img, x, y, w, h, target = ctx) => {
      const iw = img.naturalWidth || img.videoWidth, ih = img.naturalHeight || img.videoHeight;
      const s = Math.max(w / iw, h / ih);
      const dw = iw * s;
      const dh = ih * s;
      target.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    };

    try {
      await Promise.all([400, 500, 600, 700].map((wt) => document.fonts.load(`${wt} 16px "TikTok Sans"`)));
      // Background. A video export passes the clip that is playing at this frame
      const liveBg = { bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientStops, gradientOpacity, grainAmount, customBgImageUrl };
      {
      const { bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientStops, gradientOpacity, grainAmount, customBgImageUrl } = ov?.bg?.snap ?? liveBg;
      const cx = outW / 2;
      const cy = outH / 2;
      if (transparent) {
        // leave the canvas clear
      } else if (ov?.bg?.canvas) {
        ctx.drawImage(ov.bg.canvas, 0, 0, outW, outH);
      } else if (bgType === "solid") {
        ctx.fillStyle = hexToRgba(bgHex, bgOpacity);
        ctx.fillRect(0, 0, outW, outH);
      } else if (bgType === "gradient") {
        let g;
        if (gradientType === "Radial") {
          g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(outW, outH) / 2);
        } else if (gradientType === "Angular" || gradientType === "Diamond") {
          const from = (gradientType === "Diamond" ? gradientAngle + 45 : gradientAngle) - 90;
          g = ctx.createConicGradient((from * Math.PI) / 180, cx, cy);
        } else {
          const rad = (gradientAngle * Math.PI) / 180;
          const dx = Math.sin(rad);
          const dy = -Math.cos(rad);
          const len = Math.abs(outW * dx) + Math.abs(outH * dy);
          g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
        }
        [...gradientStops]
          .sort((a, b) => a.position - b.position)
          .forEach((s) => g.addColorStop(Math.min(1, Math.max(0, s.position / 100)), hexToRgba(s.hex, s.opacity)));
        ctx.globalAlpha = gradientOpacity / 100;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, outW, outH);
        ctx.globalAlpha = 1;
        if (grainAmount > 0) {
          const gk = outW / size.w; // scale the tile so grain matches the on-screen size
          ctx.save();
          ctx.scale(gk, gk);
          ctx.globalCompositeOperation = "overlay";
          ctx.fillStyle = ctx.createPattern(makeGrainTile(512, grainAmount), "repeat");
          ctx.fillRect(0, 0, size.w, size.h);
          ctx.restore();
        }
      } else if (bgType === "custom" && customBgImageUrl) {
        const bgImg = await loadImg(customBgImageUrl).catch(() => null);
        if (bgImg) drawCover(bgImg, 0, 0, outW, outH);
        else {
          ctx.fillStyle = "#808080"; // image failed to load: still draw the frames
          ctx.fillRect(0, 0, outW, outH);
        }
      }
      }

      const cam = ov?.cam ?? frameCam;
      const backFacing = isFrameBackFacing(cam);
      const k = outW / size.w;
      const FAR = outW * 3;

      // video export passes texts that already have their animation applied
      const textLayers = ov?.texts ?? textItems.filter((t) => t.mode === "frame" && t.visible !== false && t.content);
      const prep = (t) => (ov?.texts ? t : prepText(t, size));
      textLayers.filter((t) => t.layer === "behind").forEach((t) => paintTextItem(ctx, prep(t), outW, outH, k));

      // Each frame is drawn on `layer` (so its stroke/clip stay clean), then composited onto `comp`
      // with its shadows and blur. `comp` is one plane, so the camera warps all frames together.
      const frameList = ov?.frames ?? frames;

      // With a camera applied, the flat comp is warped afterwards, so it must cover everything that
      // can come into view (frames bleeding off the edges, shadows, blur), not just the canvas rect.
      let padL = 0, padT = 0, padR = 0, padB = 0;
      if (!isDefaultCamera(cam)) {
        let minX = 0, minY = 0, maxX = outW, maxY = outH;
        frameList.forEach((fr) => {
          const r = frameRect(fr, { w: outW, h: outH });
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const half = fr.r ? Math.hypot(r.width, r.height) / 2 : null; // rotated: use the circumscribed circle
          const hw = half ?? r.width / 2, hh = half ?? r.height / 2;
          const fx = Math.max(0, ...fr.effects.filter((e) => e.visible && e.type === "dropShadow").map((e) => (Math.abs(e.x) + e.blur * 2 + Math.abs(e.spread)) * k));
          const fy = Math.max(0, ...fr.effects.filter((e) => e.visible && e.type === "dropShadow").map((e) => (Math.abs(e.y) + e.blur * 2 + Math.abs(e.spread)) * k));
          const fb = fr.effects.filter((e) => e.visible && e.type === "layerBlur").reduce((s, e) => s + e.blur, 0) * k * 3;
          minX = Math.min(minX, cx - hw - fx - fb);
          maxX = Math.max(maxX, cx + hw + fx + fb);
          minY = Math.min(minY, cy - hh - fy - fb);
          maxY = Math.max(maxY, cy + hh + fy + fb);
        });
        padL = Math.ceil(-minX); padT = Math.ceil(-minY);
        padR = Math.ceil(maxX - outW); padB = Math.ceil(maxY - outH);
        // keep memory sane on very large exports
        const MAX_PX = 120e6;
        const area = (outW + padL + padR) * (outH + padT + padB);
        if (area > MAX_PX) {
          const s = Math.sqrt(MAX_PX / area);
          padL = Math.floor(padL * s); padT = Math.floor(padT * s);
          padR = Math.floor(padR * s); padB = Math.floor(padB * s);
        }
      }
      const compW = outW + padL + padR, compH = outH + padT + padB;

      const layer = document.createElement("canvas");
      layer.width = compW;
      layer.height = compH;
      const lctx = layer.getContext("2d");
      lctx.translate(padL, padT);
      const comp = document.createElement("canvas");
      comp.width = compW;
      comp.height = compH;
      const cctx = comp.getContext("2d");
      cctx.translate(padL, padT);

      for (const fr of frameList) {
        const fp = ov?.framePoses?.[fr.id];
        if (fp === "hidden") continue; // outside its row
        const { left: sx, top: sy, width: sw, height: sh } = frameRect(fr, { w: outW, h: outH });
        const rs = cornersOf(fr).map((p) => (Math.min(sw, sh) * p) / 100); // [tl, tr, br, bl]
        const srcUrl = fr.img ? (fr.img.cropUrl ?? fr.img.url) : null;
        const srcImg =
          backFacing || !srcUrl
            ? null
            : fr.img?.video && videoOn
            ? await videoFrameAt(fr.img.video.url, ov?.t ?? vidTimeRef.current)
            : await loadImg(srcUrl);
        const blurTotal = fr.effects
          .filter((e) => e.visible && e.type === "layerBlur")
          .reduce((sum, e) => sum + e.blur, 0) * k;

        lctx.clearRect(-padL, -padT, compW, compH);
        lctx.save();
        lctx.beginPath();
        lctx.roundRect(sx, sy, sw, sh, rs);
        lctx.clip();
        if (backFacing) {
          lctx.save();
          lctx.translate(2 * sx + sw, 0);
          lctx.scale(-1, 1); // mirrored here, mirrored again by the warp, so it reads as authored
          if (fr.backType === "solid") {
            lctx.fillStyle = hexToRgba(fr.backHex, fr.backOpacity);
          } else {
            lctx.globalAlpha = fr.backGradientOpacity / 100;
            lctx.fillStyle = makeCanvasGradient(lctx, fr.backGradientType, fr.backGradientAngle, fr.backStops, sx, sy, sw, sh);
          }
          lctx.fillRect(sx, sy, sw, sh);
          lctx.restore();
        } else if (fr.social?.on) {
          lctx.fillStyle = "#000";
          lctx.fillRect(sx, sy, sw, sh);
        } else if (srcImg) {
          lctx.fillStyle = "#000";
          lctx.fillRect(sx, sy, sw, sh);
          drawCover(srcImg, sx, sy, sw, sh, lctx);
        } else {
          const g = lctx.createLinearGradient(0, sy, 0, sy + sh);
          g.addColorStop(0, "#FFFFFF");
          g.addColorStop(1, "#FF47BC");
          lctx.fillStyle = g;
          lctx.fillRect(sx, sy, sw, sh);
          const fs = Math.max(11 * k, sw * 0.05);
          lctx.fillStyle = "#FAF9FA";
          lctx.font = `600 ${fs}px Inter, sans-serif`;
          lctx.textAlign = "center";
          lctx.textBaseline = "middle";
          lctx.fillText("Drop your", sx + sw / 2, sy + sh / 2 - fs * 0.65);
          lctx.fillText("image here", sx + sw / 2, sy + sh / 2 + fs * 0.65);
        }
        if (fr.social?.on && !backFacing) {
          const sops = socialOps({ ...fr.social, media: srcUrl }, sw, sh);
          const imgs = new Map();
          for (const src of new Set(sops.filter((o) => (o.t === "image" || o.t === "media") && o.src).map((o) => o.src))) {
            const im = await loadImg(src).catch(() => null);
            if (im) imgs.set(src, im);
          }
          paintSocial(lctx, sops, sx, sy, imgs);
        }
if (!backFacing && (fr.statusBar || fr.homeIndicator)) {
  const auto = srcImg ? sampleChromeColors(srcImg, fr.w, fr.h) : null;
  const cop = chromeOps(fr, sw, sh, auto)[0];
  lctx.save();
  lctx.translate(sx, sy);
  paintPhoneChrome(lctx, sw, sh, cop);
  lctx.restore();
}
        fr.effects
          .filter((e) => e.visible && e.type === "noise")
          .forEach((e) => drawNoise(lctx, sx, sy, sw, sh, e.amount, Math.max(1, e.size * 0.5 * k)));
        paintSheen(lctx, sx, sy, sw, sh, environment, cam.rotationX, cam.rotationY);
        lctx.restore();

        // Stroke: inside / center / outside are the same path offset by half the weight.
        const st = fr.stroke;
        if (st.on && st.width > 0) {
          const w = st.width * k;
          const off = st.position === "inside" ? -w / 2 : st.position === "outside" ? w / 2 : 0;
          lctx.beginPath();
          lctx.roundRect(sx - off, sy - off, sw + off * 2, sh + off * 2, rs.map((v) => Math.max(0, v + off)));
          lctx.lineWidth = w;
          lctx.strokeStyle = hexToRgba(st.hex, st.opacity);
          lctx.stroke();
        }

        const rot = ((fr.r ?? 0) * Math.PI) / 180;
        const rcos = Math.cos(rot), rsin = Math.sin(rot);
        const rcx = sx + sw / 2, rcy = sy + sh / 2;
        cctx.save();
        if (blurTotal > 0) cctx.filter = `blur(${blurTotal}px)`;
        if (fp) {
          // this frame's own enter / exit pose
          const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = fp;
          cctx.globalAlpha = vidClamp(a, 0, 1);
          cctx.translate(x * outW, -y * outH);
          cctx.translate(rcx, rcy);
          cctx.scale(Math.max(0.001, Math.abs(s * Math.cos(ry))), Math.max(0.001, Math.abs(s * Math.cos(rx))));
          cctx.translate(-rcx, -rcy);
        }
        fr.effects
          .filter((e) => e.visible && e.type === "dropShadow")
          .forEach((e) => {
            const sp = e.spread * k;
            cctx.save();
            cctx.shadowColor = hexToRgba(e.hex, e.opacity);
            cctx.shadowBlur = e.blur * k;
            // shadow offset rotates with the frame, like CSS box-shadow
            cctx.shadowOffsetX = (e.x * rcos - e.y * rsin) * k + FAR;
            cctx.shadowOffsetY = (e.x * rsin + e.y * rcos) * k;
            cctx.translate(rcx - FAR, rcy);
            cctx.rotate(rot);
            cctx.translate(-(rcx - FAR), -rcy);
            cctx.fillStyle = "#000";
            cctx.beginPath();
            cctx.roundRect(sx - FAR - sp, sy - sp, Math.max(0, sw + sp * 2), Math.max(0, sh + sp * 2), rs.map((v) => Math.max(0, v + sp)));
            cctx.fill();
            cctx.restore();
          });
        cctx.translate(rcx, rcy);
        cctx.rotate(rot);
        cctx.translate(-rcx, -rcy);
        cctx.drawImage(layer, -padL, -padT);
        cctx.restore();
      }

      let deviceLayer = comp;
      if (!isDefaultCamera(cam)) {
        deviceLayer = document.createElement("canvas");
        deviceLayer.width = outW;
        deviceLayer.height = outH;
        drawWarped(
          deviceLayer.getContext("2d"), comp, getFrameCamera(cam, outH), outW, outH, 24,
          { x: -padL, y: -padT, w: compW, h: compH }
        );
      }
      ctx.save();
      if (ov?.pose) {
        const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = ov.pose;
        ctx.globalAlpha = vidClamp(a, 0, 1);
        ctx.translate(outW / 2 + x * outW, outH / 2 - y * outH);
        ctx.scale(Math.max(0.02, Math.abs(s * Math.cos(ry))), Math.max(0.02, Math.abs(s * Math.cos(rx))));
        ctx.translate(-outW / 2, -outH / 2);
      }
      ctx.drawImage(deviceLayer, 0, 0);
      ctx.restore();

      textLayers.filter((t) => t.layer === "front").forEach((t) => paintTextItem(ctx, prep(t), outW, outH, k));

      return canvas;
    } catch (err) {
      console.error("Frame render failed:", err);
      return null;
    }
  };

  const exportFrame = async (width, fmt, height) => {
    let canvas = await renderFrameCanvas(width, exportTransparent && fmt.mime !== "image/jpeg", height);
    if (!canvas) return;
    if (fmt.mime === "image/jpeg") {
      // JPG has no alpha, so flatten onto white instead of letting transparency go black
      const flat = document.createElement("canvas");
      flat.width = canvas.width;
      flat.height = canvas.height;
      const fctx = flat.getContext("2d");
      fctx.fillStyle = "#FFFFFF";
      fctx.fillRect(0, 0, flat.width, flat.height);
      fctx.drawImage(canvas, 0, 0);
      canvas = flat;
    }
    await new Promise((resolve) =>
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${projectTitle || "frame"}.${fmt.ext}`;
          a.click();
          URL.revokeObjectURL(url);
        }
        resolve();
      }, fmt.mime, 0.92)
    );
  };

  const handleExport = async () => {
    if (exporting) return;
    if (videoOn) {
      setExporting(true);
      setExportProgress(0);
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      try {
        await exportVideo();
        setExportToast(`Exporting ${VIDEO_FORMATS.find((f) => f.value === videoFormat).label} · download started`);
        setTimeout(() => setExportToast(null), 2400);
      } catch (err) {
        console.error("Video export failed:", err);
        setExportToast(err?.message || "Video export failed");
        setTimeout(() => setExportToast(null), 4000);
      } finally {
        setExporting(false);
        setExportProgress(null);
        setExportOpen(false);
      }
      return;
    }
    const fmt = EXPORT_FORMATS.find((f) => f.value === exportFormat);
    setExporting(true);
    // let the spinner paint before the heavy synchronous render starts
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    try {
      const d = exportDims(exportWidth) ?? { w: exportWidth, h: undefined };
      const transparent = exportTransparent && fmt.mime !== "image/jpeg"; // JPG has no alpha
      if (toolbarMode === "frame") await exportFrame(d.w, fmt, d.h);
      else sceneRef.current?.exportAt(d.w, fmt.mime, fmt.ext, d.h, transparent);
      setExportToast(`Exporting ${fmt.label} · download started`);
      setTimeout(() => setExportToast(null), 2400);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  // Real output size: width is fixed, height follows the live canvas ratio
  const exportDims = (width) => {
    const scale = width / 1920; // 2K = 1x, 4K = 2x, 8K = 4x
    const opt = CANVAS_SIZE_OPTIONS.find((o) => o.value === canvasSize);
    const base = canvasSize === "Custom" ? { w: customWidth, h: customHeight } : opt?.w ? opt : null;
    if (base) return { w: Math.round(base.w * scale), h: Math.round(base.h * scale) };
    return canvasDims ? { w: width, h: Math.round((width * canvasDims.h) / canvasDims.w) } : null; // Fill
  };

  // Video output size: the chosen long side, at the canvas's aspect ratio (capped by what the format allows)
  const videoOutDims = () => {
    const spec = VIDEO_FORMATS.find((f) => f.value === videoFormat);
    const base = exportDims(1920);
    return fitVideoDims(base ? base.w / base.h : 16 / 9, Math.min(videoRes, spec.maxLong));
  };

  // Everything needed to reopen the project exactly as it is now.
  const captureProjectData = () => ({
    snap: snapshotKeyRef.current,
    toolbarMode,
    imageOrVideo,
    mockupSocial,
    strap,
    strapStyle,
    canvasByMode: { ...canvasByModeRef.current, [toolbarMode]: { canvasSize, customWidth, customHeight } },
    vidByMode: {
      ...vidByModeRef.current,
      [toolbarMode]: { shots: vidShots, bgs: vidBgs, texts: vidTexts, duration: vidDuration, no: vidNo.current, time: vidTimeRef.current },
    },
  });

  // asCopy = true always creates a new project. Otherwise the open project is updated, or a new one is made if none is open.
  const handleSaveProject = async (asCopy = false) => {
    asCopy = asCopy === true;
    const kind = toolbarMode === "frame" ? "frame" : "mockup";
    const data = captureProjectData();
    const existing = !asCopy && selectedProjectId ? savedProjects.find((p) => p.id === selectedProjectId) : null;
    let thumb = null;
    if (kind === "frame") {
      const canvas = await renderFrameCanvas(384);
      try {
        thumb = canvas ? canvas.toDataURL("image/png") : null;
      } catch (err) {
        console.error("Frame thumbnail failed:", err);
      }
    } else {
      thumb = sceneRef.current?.captureThumbnail?.(384) ?? null;
    }
    const now = new Date();
    if (existing) {
      setSavedProjects((prev) =>
        prev.map((p) => (p.id === existing.id ? { ...p, title: projectTitle, thumb, kind, editedAt: now, data } : p))
      );
    } else {
      const id = `${Date.now()}`;
      const title = asCopy && selectedProjectId ? `${projectTitle} copy` : projectTitle;
      if (title !== projectTitle) setProjectTitle(title);
      setSavedProjects((prev) => [{ id, title, thumb, kind, editedAt: now, data }, ...prev]);
      setSelectedProjectId(id);
    }
    setSidebarPanel("projects");
    setExportToast(existing ? "Project saved" : asCopy ? "Saved as copy" : "Project saved");
    setTimeout(() => setExportToast(null), 2000);
  };

  const handleNewProject = useCallback(() => {
    // Uploaded media / custom background image
    handleClearUpload();
    handleClearCustomImage();

    // Identity + navigation
    setProjectTitle("Untitled project");
    setSelectedProjectId(null);
    setActiveTemplateId(null);
    setIsEditingTitle(false);
    setSidebarPanel("create");
    setSidebarOpen(true);

    // Device
    setDeviceCategory("phone");
    setCategoryDrillDown(null);
    setDeviceType("iPhone 16 Pro Max");
    setFinish("Desert titanium");
    setBodyHex("2C1D1D");
    setBodyOpacity(100);
    setDeviceOrientation("portrait");

    // Device panel: reflection / brightness / lighting / overlays
    setBrightness(30);
    setReflectionMode("shiny");
    setReflectionShiny(45);
    setReflectionMatte(20);
    setLighting("none");
    setLightingIntensity(60);
    setShowStatusBar(false);
    setShowHomeIndicator(false);
    setShowMenuBar(false);
    setShowBrowser(false);
    setBrowserType("safari");
    setMockupSocial(DEFAULT_SOCIAL);
    setSafariTabs("top");
    setBrowserTheme("light");
    setBrowserUrl("bezel.app");

    // Camera
    setCameraTab("manual");
    setActiveCameraView(null);
    sceneRef.current?.resetView(0);

    // Canvas
    canvasByModeRef.current = {};
    setCanvasSize("Fill");
    setCustomWidth(1080);
    setCustomHeight(1440);
    setCustomSectionOpen(false);

    // Scene background
    setBgType("solid");
    setBgHex(surfaceHex(darkMode));
    setBgOpacity(100);
    setGradientType("Linear");
    setGradientAngle(90);
    setGradientPreset("none");
    setGradientOpacity(100);
    setGradientStops([
      { id: 1, hex: "FFFFFF", position: 0, opacity: 100 },
      { id: 2, hex: "000000", position: 100, opacity: 100 },
    ]);
    setSelectedStopId(1);
    setGrainAmount(0);
    setEnvironment("none");
    hasSeededGradientRef.current = false;

    // Panel open/closed state
    setOpenSections({ device: true, screenInterface: false, position: true, appearance: true, social: false, camera: true, scene: true, text: false });
    setFrameRadius(0);
    setFrames([makeFrame(1)]);
    setSelectedIds([1]);
    nextFrameIdRef.current = 2;
    setFrameCorners(null);
    setFrameStroke(DEFAULT_STROKE);
    setFrameAspectLocked(false);
    setFrameEffects(DEFAULT_FRAME_EFFECTS());
    nextEffectIdRef.current = 2;

        setFrameBackType("solid");
    setFrameBackHex("FFFFFF");
    setFrameBackOpacity(100);
    setBackGradientType("Linear");
    setBackGradientAngle(90);
    setBackGradientOpacity(100);
    setBackStops([
      { id: "back-1", hex: "FFFFFF", position: 0, opacity: 100 },
      { id: "back-2", hex: "000000", position: 100, opacity: 100 },
    ]);

vidByModeRef.current = {};
vidFrameSeenRef.current = new Set();
setVidShots([]);
setVidBgs([]);
setVidTexts([]);
setVidAudios([]);
setSelAudio(null);
setSelBg(null);
setSelText(null);
    vidNo.current = 2;
    setVidSel({ shot: null, key: null, ids: [] });
    setVidDuration(10);
    setVidPlaying(false);
    vidTimeRef.current = 0;

    setBackSelectedStopId("back-1");
    nextBackStopIdRef.current = 3;
    setBackPickerOpen(false);

        setTextItems([]);
    setSelectedTextId(null);
    setTextPopupOpen(false);
  }, [darkMode, handleClearUpload, handleClearCustomImage]);

  const handleViewChange = useCallback((view) => {
    if (view.rotationX !== undefined) setRotationX(view.rotationX);
    if (view.rotationY !== undefined) setRotationY(view.rotationY);
    if (view.rotationZ !== undefined) setRotationZ(view.rotationZ);
    if (view.positionX !== undefined) setPositionX(view.positionX);
    if (view.positionY !== undefined) setPositionY(view.positionY);
    if (view.zoom !== undefined) setZoom(view.zoom);
    if (view.fov !== undefined) setFov(view.fov);
    setActiveCameraView(null);
  }, []);

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
  const prevVidModeRef = useRef(toolbarMode);
  const [vidSwapTick, setVidSwapTick] = useState(0);
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
    const r = {};
    CAM_KEYS.forEach((k) => (r[k] = Math.round(c[k])));
    handleViewChange(r);
  };

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
    const n = { x: p.x, y: p.y, w: Math.round(p.w), h: Math.round(p.h), s: p.s, r: p.r ?? 0 };
    if (f.x === n.x && f.y === n.y && f.w === n.w && f.h === n.h && f.s === n.s && (f.r ?? 0) === n.r) return f;
    diff = true;
    return { ...f, ...n };
  });
  if (!diff) return;
  framesLatestRef.current = next;
  restoreUntilRef.current = Date.now() + 400; // keeps playback from filling the undo history
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

  // Switching Mockup <-> Frame also swaps the scene look, camera and template highlights.
  // Each mode remembers what it was left with; a mode that was never visited starts from defaults.
  // (Defined before the timeline swap effect below, so the timeline's background / camera wins in Video mode.)
  const sceneByModeRef = useRef({});
  const sceneModeRef = useRef(toolbarMode);
  useEffect(() => {
    const prev = sceneModeRef.current;
    if (prev === toolbarMode) return;
    sceneModeRef.current = toolbarMode;

    // these values are still the previous mode's, because only toolbarMode changed in this render
    sceneByModeRef.current[prev] = {
      bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientOpacity,
      gradientStops, selectedStopId, gradientPreset, grainAmount,
      customImagePreset, customBgImageUrl, customImageLabel, customImageThumb, customImageDims,
      environment,
      rotationX, rotationY, rotationZ, positionX, positionY, zoom, fov, activeCameraView,
      activeTemplateId, vidTplId,
    };

    const d = {
      bgType: "solid", bgHex: surfaceHex(darkMode), bgOpacity: 100,
      gradientType: "Linear", gradientAngle: 90, gradientOpacity: 100,
      gradientStops: [
        { id: 1, hex: "FFFFFF", position: 0, opacity: 100 },
        { id: 2, hex: "000000", position: 100, opacity: 100 },
      ],
      selectedStopId: 1, gradientPreset: "none", grainAmount: 0,
      customImagePreset: "none", customBgImageUrl: null, customImageLabel: null, customImageThumb: null, customImageDims: null,
      environment: "none",
      rotationX: 0, rotationY: 0, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27, activeCameraView: null,
      activeTemplateId: null, vidTplId: null,
    };
    const s = sceneByModeRef.current[toolbarMode] ?? d;

    // background
    setBgType(s.bgType);
    setBgHex(s.bgHex);
    setBgOpacity(s.bgOpacity);
    setGradientType(s.gradientType);
    setGradientAngle(s.gradientAngle);
    setGradientOpacity(s.gradientOpacity);
    setGradientStops(s.gradientStops.map((st) => ({ ...st })));
    setSelectedStopId(s.selectedStopId);
    setGrainAmount(s.grainAmount);
    setCustomImagePreset(s.customImagePreset);
    setCustomBgImageUrl(s.customBgImageUrl);
    setCustomImageLabel(s.customImageLabel);
    setCustomImageThumb(s.customImageThumb);
    setCustomImageDims(s.customImageDims);
    // the gradient-edit effect resets the preset to "none", so put the saved preset back after it has run
    setTimeout(() => setGradientPreset(s.gradientPreset), 60);
    bgAppliedKeyRef.current = bgKey({
      bgType: s.bgType, bgHex: s.bgHex, bgOpacity: s.bgOpacity, gradientType: s.gradientType,
      gradientAngle: s.gradientAngle, gradientOpacity: s.gradientOpacity, gradientStops: s.gradientStops,
      grainAmount: s.grainAmount, customBgImageUrl: s.customBgImageUrl,
    });

    // environment
    setEnvironment(s.environment);

    // camera (these also push the values into the 3D scene)
    handleRotationChange(s.rotationX);
    handleRotationYChange(s.rotationY);
    handleRotationZChange(s.rotationZ);
    handlePositionXChange(s.positionX);
    handlePositionYChange(s.positionY);
    handleZoomChange(s.zoom);
    handleFovChange(s.fov);
    setActiveCameraView(s.activeCameraView);

    // which template card is highlighted
    setActiveTemplateId(s.activeTemplateId);
    setVidTplId(s.vidTplId);

    // open pickers belong to the mode being left
    setGradientPickerOpen(false);
    setColorPickerOpen(false);
  }, [toolbarMode]);

  // Switching Mockup <-> Frame swaps the whole timeline
  useEffect(() => {
    const prev = prevVidModeRef.current;
    if (prev === toolbarMode) return;
    prevVidModeRef.current = toolbarMode;
    const l = vidLive.current;
    vidByModeRef.current[prev] = {
      shots: l.shots, bgs: l.bgs, texts: l.texts, duration: l.duration, no: vidNo.current, time: vidTimeRef.current,
    };
    const next = vidByModeRef.current[toolbarMode] ?? { shots: [], bgs: [], texts: [], duration: 10, no: 2, time: 0 };
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
  }, [toolbarMode]);

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

  // Selecting / deselecting a frame changes whether an off-row frame can be clicked
  useEffect(() => {
    if (videoOn && toolbarMode === "frame") applyFrameRowStatesAt(vidTimeRef.current);
  }, [selectedIds, videoOn, toolbarMode]);

  const vidShotAt = (t) => {
    const { shots, sel } = vidLive.current;
    const inside = (s) => t >= s.start - 1e-6 && t <= s.start + s.len + 1e-6;
    const cur = shots.find((s) => s.id === sel.shot);
    return cur && inside(cur) ? cur : [...shots].reverse().find(inside) ?? null;
  };

const vidAddShot = () => {
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
    .filter((t) => (t.mode ?? "mockup") === toolbarMode && !seen.has(t.id))
    .forEach((t) => {
      seen.add(t.id);
      if (!vidLive.current.texts.some((c) => c.tid === t.id)) vidAddTextClip(t.id, true);
    });
}, [videoOn, textItems, toolbarMode]);

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
  vidBgActive.current = primary;
  applyBgSnap(clip.snap);
  setSelBg({ bid: primary, ids });
};

  // While a clip is selected, Scene panel edits are written back into it.
useEffect(() => {
  if (!selBg) return;
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
    setVidDuration(Math.min(600, Math.max(minEnd, Math.round(d * 10) / 10)));
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
  const buildStaggerKeys = (s, cur, rest) => {
    const st = s.stagger, n = cur.length, L = s.len;
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
  const layoutFramesFor = (layoutKey, alloc) => {
    const box = frameSizeRef.current;
    const cur = framesLatestRef.current;
    const slots = FRAME_LAYOUTS[layoutKey];
    if (!box || !slots) return cur;
    const short = Math.min(box.w, box.h);
    const base = cur.find((f) => selectedIdsRef.current.includes(f.id)) ?? cur[0];
    const pool = cur.filter((f) => f.img).map((f) => f.img);
    const NOMINAL_H = 1000;
    return slots.map((sl, i) => {
      const src = cur[i] ?? cloneFrame({ ...base, img: null }, alloc());
      const img = src.img ?? (pool.length ? { ...pool[i % pool.length] } : null);
      return {
        ...src, img,
        w: Math.round(NOMINAL_H * sl.r), h: NOMINAL_H,
        s: (sl.h * box.h) / short / NOMINAL_H,
        x: (sl.x * box.w) / short, y: (sl.y * box.h) / short,
      };
    });
  };

  // framesOverride = frames to resolve against (the template's layout), instead of the live ones
  const resolveFrameTplShots = (tpl, framesOverride = null) => {
    const cur = framesOverride ?? framesLatestRef.current;
    const base = framePoseMap(cur, frameSizeRef.current);
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
    const laid = tpl.layout ? layoutFramesFor(tpl.layout, () => tmp--) : null;
    const gids = {}; // template group key -> real group id
    const shots = resolveFrameTplShots(tpl, laid);
    const c = sampleShots(shots, t); // null for frame-only templates
    const poses = sampleShotFrames(shots, t);
    const fr = (laid ?? framesLatestRef.current).map((f) => {
      const p = poses?.[f.id];
      return p ? { ...f, x: p.x, y: p.y, w: Math.round(p.w), h: Math.round(p.h), s: p.s, r: p.r ?? 0 } : f;
    });
    // use the template's own background at time t, so the card matches what gets applied
    const bgClip = tpl.bgs ? [...tpl.bgs].sort((a, b) => a.at - b.at).reverse().find((b) => b.at <= t) ?? tpl.bgs[0] : null;
    return renderFrameCanvas(w, false, null, {
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
      Math.max(tpl.duration, ...[...(tpl.bgs ? [] : live.bgs), ...live.texts].filter((c) => !whole(c)).map((c) => c.start + c.len))
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
    const texts = stretch(live.texts);
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

  const vidApi = {
    shots: vidShots,
    duration: vidDuration,
    selShot: vidSel.shot,
    selKey: vidSel.key,
    selIds: vidSel.ids,
    selProp: vidSel.prop ?? null,
    cam: vidLive.current.cam,
    timeRef: vidTimeRef,
    toolbarRef,
    playing: vidPlaying,
    loop: vidLoop,
    exporting: vidExporting,
    onPause: () => setVidPlaying(false),
bgs: vidBgs,
texts: vidTexts,
selBg,
audios: vidAudios,
selAudio,
onAudioAdd: vidAddAudio,
onAudioSelect: vidSelectAudio,
onAudioPatch: vidPatchAudio,
onBgSelect: vidSelectBg,
onAddBg: vidAddBg,
onBgPatch: vidPatchBg,
onBgAnim: vidSetBgAnim,
onShotAnim: vidSetShotAnim,
onShotImg: vidSetShotImg,
selText,
onSelectRange: ({ shots, bgs, texts }) => {
  setSelAudio(null);
  const next = { shot: shots[shots.length - 1] ?? null, key: null, ids: shots, prop: null };
  vidLive.current.sel = next;
  setVidSel(next);
  setSelText(texts.length ? { cid: texts[texts.length - 1], ids: texts } : null);
  if (bgs.length) {
    const primary = bgs[bgs.length - 1];
    const clip = vidLive.current.bgs.find((b) => b.id === primary);
    if (clip) {
      vidBgActive.current = primary;
      applyBgSnap(clip.snap); // keeps the Scene panel edit-sync pointed at the right clip
    }
    setSelBg({ bid: primary, ids: bgs });
  } else setSelBg(null);
},
onTextSelect: (cid, additive = false) => {
  if (!additive) {
    clearShotSel();
    setSelBg(null);
  }
  setSelText((p) => {
    const cur = p?.ids ?? [];
    const ids = additive ? (cur.includes(cid) ? cur.filter((i) => i !== cid) : [...cur, cid]) : [cid];
    if (!ids.length) return null;
    return { cid: ids.includes(cid) ? cid : ids[ids.length - 1], ids };
  });
},
onTextPatch: vidPatchText,
onTextAnim: vidSetTextAnim,
onTextDelete: vidDeleteText,
onTextDuplicate: vidDuplicateText,
    getText: (tid) => textItems.find((t) => t.id === tid) ?? null,
    canvasDims,
    textLabel: (tid) => {
      const it = textItems.find((t) => t.id === tid);
      return it ? textLabel(it) : "Deleted text";
    },
    textName: (tid) => {
      const it = textItems.find((t) => t.id === tid);
      return it ? textName(it) : "Deleted text";
    },
    textHidden: (tid) => textItems.find((t) => t.id === tid)?.visible === false,
    onTextToggleHidden: (tid) => {
      const it = textItems.find((t) => t.id === tid);
      if (it) updateTextById(tid, { visible: it.visible === false });
    },
    onBgToggleHidden: vidToggleBgHidden,
    onTextRename: (tid, name) => updateTextById(tid, { name }),
    getAnimSubject,
    frameMode: toolbarMode === "frame",
    frames: frames.map((f, i) => ({
      id: f.id,
      label: `Frame ${i + 1}`,
      thumb: f.img ? (f.img.cropUrl ?? f.img.url) : null,
    })),
onBgUpdate: vidUpdateBg,
onBgDuplicate: vidDuplicateBg,
onBgDelete: vidDeleteBg,
    onSeek: vidSeek,
    onPlayhead: (t) => { vidTimeRef.current = t; },
    onKeySplit: vidSplitKey,
    onStep: (d) => vidSeek(vidTimeRef.current + d / VID_FPS),
    onSkip: vidSkip,
    onTogglePlay: vidToggle,
    onLoop: () => setVidLoop((l) => !l),
    onAddShot: vidAddShot,
    onAddKey: vidToggleKey,
    onDelete: () => {
  if (selBg) {
    const ids = selBg.ids ?? [selBg.bid];
    setVidBgs((prev) => prev.filter((b) => !ids.includes(b.id)));
    setSelBg(null);
  }
  if (selAudio) vidDeleteAudio(selAudio.aid);
  if (selText) (selText.ids ?? [selText.cid]).forEach(vidDeleteText);
  if (vidLive.current.sel.ids.length) vidDelete();
},
    onDuplicate: vidDuplicate,
    onGroup: vidGroup,
    onUngroup: vidUngroup,
    onKeyMove: vidMoveKey,
    onKeyUpdate: vidUpdateKey,
    onKeyDelete: vidDeleteKey,
 onSelect: (shot, key, additive = false, prop = null) => {
  if (!additive || shot == null) {
    setSelBg(null);
    setSelText(null);
    setSelAudio(null);
  }
  const cur = vidLive.current.sel;
  let ids;
  if (shot == null) ids = [];
  else if (additive) ids = cur.ids.includes(shot) ? cur.ids.filter((i) => i !== shot) : [...cur.ids, shot];
  else ids = [shot];
  const primary = shot == null ? null : ids.includes(shot) ? shot : ids[ids.length - 1] ?? null;
  const next = { shot: primary, key: additive ? null : key, ids, prop: additive ? null : prop };
  vidLive.current.sel = next; // sync, so a scrub in the same click uses the new range
  setVidSel(next);
  if (ids.length) {
    const frameMode = toolbarModeRef.current === "frame";
    // Frame rows span the timeline, so selecting one must not yank the playhead back to its start.
    // Mockup shots still jump to their initial state.
    const target = !additive && !prop && !frameMode ? vidLive.current.shots.find((x) => x.id === primary) : null;
    vidSeek(target ? target.start : vidTimeRef.current);
    // clicking a frame track also selects those frames on the canvas
    if (frameMode && !additive && !prop && key == null) {
      const fids = vidLive.current.shots.filter((x) => ids.includes(x.id) && x.frameId != null).map((x) => x.frameId);
      if (fids.length) {
        // a single row selects only that frame, so the canvas-to-timeline sync doesn't expand it to the group
        if (fids.length === 1) soloFrameRef.current = fids[0];
        setSelectedIds(fids);
      }
    }
  }
},
    onShot: vidPatchShot,
    onKey: vidPatchKey,
    onDuration: vidSetDuration,
    onReorder: vidReorder,
    onEase: (ease) => vidLive.current.sel.ids.forEach((id) => vidPatchShot(id, { ease })),
  };

  // Steps the timeline one output frame at a time, renders each at the export size, and encodes it.
  const exportVideo = async () => {
    const scene = sceneRef.current;
    const frameExport = toolbarModeRef.current === "frame";
    if (!vidLive.current.shots.some((s) => s.keys.length)) return;
    if (!frameExport && !scene?.beginCapture) return;

    const spec = VIDEO_FORMATS.find((f) => f.value === videoFormat);
    const { w, h } = videoOutDims();
    const fps = Math.min(videoFps, spec.maxFps);
    const duration = vidLive.current.duration;
    const count = Math.max(1, Math.round((duration / videoSpeed) * fps)); // 2x speed = half as many output frames
    const transparent = exportTransparent && spec.alpha;
    const t0 = vidTimeRef.current;

    setVidExporting(true);
    setVidPlaying(false);
    vidEndRef.current = () => {}; // makes vidRange() return the whole timeline, not the selected shot
    vidBgActive.current = null;
    if (!frameExport) scene.beginCapture(w, h);
    try {
      await encodeVideoFrames({
        format: videoFormat,
        width: w,
        height: h,
        fps,
        count,
        transparent,
        name: projectTitle || "mockup",
        onProgress: setExportProgress,
        audio: { clips: vidLive.current.audios, speed: videoSpeed },
        renderFrame: async (i) => {
          const t = Math.min(duration, (i / fps) * videoSpeed);
          vidTimeRef.current = t;
          const cam = sampleShots(vidLive.current.shots, t);
          applyCam(cam);
          applyBgAt(t);
          applyAnimAt(t);
          // let React flush the background / text state this frame depends on
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
          if (!frameExport) {
            const mv = mockupVideoRef.current?.el;
            if (mv) {
              await seekVideo(mv, t);
              scene.refreshScreen?.();
            }
            return scene.captureFrame(transparent);
          }
          return renderFrameCanvas(w, transparent, h, {
            t,
            frames: framesLatestRef.current, // already holds this frame's keyframed placement (set by applyAnimAt above)
            cam: cam ? { ...CAM_DEFAULT, rotationX: cam.rotationX, rotationY: cam.rotationY, rotationZ: cam.rotationZ, positionX: cam.positionX, positionY: cam.positionY, zoom: cam.zoom } : undefined,
            pose: sampleDeviceAnim(vidLive.current.shots.filter((s) => s.frameId == null), t),
            framePoses: frameRowStates(vidLive.current.shots, framesLatestRef.current.map((f) => f.id), t),
            texts: textsAt(t, "frame"),
            bg: bgAnimOnRef.current
              ? { canvas: bgAnimCanvasRef.current }
              : { snap: vidLive.current.bgs.find((b) => b.id === vidBgActive.current)?.snap },
          });
        },
      });
    } finally {
      if (!frameExport) scene.endCapture();
      vidEndRef.current = null;
      setVidExporting(false);
      vidSeek(t0);
    }
  };

    // Screenshot registry: snapshots hold a short id, the registry holds the File and derived data.
  const shotStoreRef = useRef(new Map());
  const [shotId, setShotId] = useState("none");
  const shotIdRef = useRef(shotId);
  shotIdRef.current = shotId;

  useEffect(() => {
    if (!uploadedMediaThumb) {
      setShotId("none");
      return;
    }
    const store = shotStoreRef.current;
    for (const [id, s] of store) {
      if (s.thumb === uploadedMediaThumb && s.crop === uploadedCrop && s.frameCropUrl === frameCropUrl) {
        setShotId(id);
        return;
      }
    }
    const id = `shot-${store.size + 1}`;
    store.set(id, {
      file: uploadedFileRef.current,
      thumb: uploadedMediaThumb,
      label: uploadedMediaLabel,
      crop: uploadedCrop,
      frameCropUrl,
      video: mockupVideoRef.current,
    });
    setShotId(id);
  }, [uploadedMediaThumb, uploadedCrop, frameCropUrl]);

    // Long strings (cropped-image data URLs) are swapped for short ids so the snapshot stays cheap to stringify.
  const assetStoreRef = useRef({ byValue: new Map(), byId: new Map() });
  const assetId = (v) => {
    if (v == null) return null;
    if (v.length < 300) return v; // blob: and preset URLs are short, keep them inline
    const { byValue, byId } = assetStoreRef.current;
    let id = byValue.get(v);
    if (!id) {
      id = `asset-${byId.size + 1}`;
      byValue.set(v, id);
      byId.set(id, v);
    }
    return id;
  };
  const assetValue = (id) =>
    (typeof id === "string" && id.startsWith("asset-") ? assetStoreRef.current.byId.get(id) : id) ?? null;

    // Background clips can hold long data URLs (cropped images), so they go through the asset store like the other snapshot fields.
const packBgs = (bgs) =>
  bgs.map((b) => ({ ...b, css: assetId(b.css), snap: { ...b.snap, customBgImageUrl: assetId(b.snap.customBgImageUrl) } }));
const unpackBgs = (bgs) =>
  bgs.map((b) => ({ ...b, css: assetValue(b.css), snap: { ...b.snap, customBgImageUrl: assetValue(b.snap.customBgImageUrl) } }));

    // ---------- Undo / redo ----------
  const snapshot = {
    deviceCategory, deviceType, finish, bodyHex, bodyOpacity, deviceOrientation,
    brightness, reflectionMode, reflectionShiny, reflectionMatte,
    lighting, lightingIntensity,
    showStatusBar, showHomeIndicator, showMenuBar, showBrowser, browserType, browserTheme, browserUrl, safariTabs,
    // In Video mode the camera comes from the timeline, so it stays out of the history
    ...(videoOn ? {} : { rotationX, rotationY, rotationZ, positionX, positionY, zoom, fov }),
    canvasSize, customWidth, customHeight,
    // same for the background, which follows the background clips
    ...(videoOn
      ? {}
      : { bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientOpacity, gradientStops, grainAmount }),
    environment,
    customImagePreset, customBgImageUrl: assetId(customBgImageUrl), customImageLabel, customImageThumb: assetId(customImageThumb),
    frames: frames.map((f) => (f.img?.cropUrl ? { ...f, img: { ...f.img, cropUrl: assetId(f.img.cropUrl) } } : f)),
    shotId,
    textItems,
    selectedTextId,
vidShots,
vidBgs: packBgs(vidBgs),
vidTexts,
vidAudios,
vidDuration,
    vidHead,
  };
  const snapshotKey = JSON.stringify(snapshot);
  const snapshotKeyRef = useRef(snapshotKey);
  snapshotKeyRef.current = snapshotKey;

  const historyRef = useRef({ past: [], future: [], committed: null });
  const restoreUntilRef = useRef(Date.now() + 500); // startup effects settle without creating history
  const [, setHistoryTick] = useState(0);

    // toggling Video mode (or switching mode) changes which fields the snapshot has, so it isn't an undoable step
  useEffect(() => {
    restoreUntilRef.current = Date.now() + 300;
  }, [videoOn, toolbarMode]);

  useEffect(() => {
    const h = historyRef.current;
    if (h.committed === null) {
      h.committed = snapshotKey;
      return;
    }
    // Right after a restore, cascading effects may nudge state. Absorb that instead of recording it.
    if (Date.now() < restoreUntilRef.current) {
      h.committed = snapshotKey;
      return;
    }
    if (snapshotKey === h.committed) return;
    const t = setTimeout(() => {
      h.past.push(h.committed);
      if (h.past.length > 100) h.past.shift();
      h.future = [];
      h.committed = snapshotKey;
      setHistoryTick((n) => n + 1);
    }, 400);
    return () => clearTimeout(t);
  }, [snapshotKey]);

  const applySnapshot = (s) => {
    restoreUntilRef.current = Date.now() + 300;
    setDeviceCategory(s.deviceCategory);
    setDeviceType(s.deviceType);
    setFinish(s.finish);
    setBodyHex(s.bodyHex);
    setBodyOpacity(s.bodyOpacity);
    setDeviceOrientation(s.deviceOrientation);
    setReflectionMode(s.reflectionMode);
    setReflectionShiny(s.reflectionShiny);
    setReflectionMatte(s.reflectionMatte);
    setShowStatusBar(s.showStatusBar);
    setShowHomeIndicator(s.showHomeIndicator);
    setShowMenuBar(s.showMenuBar);
    setShowBrowser(s.showBrowser);
    setBrowserType(s.browserType);
    setSafariTabs(s.safariTabs ?? "top");
    setBrowserTheme(s.browserTheme);
    setBrowserUrl(s.browserUrl);
    setCanvasSize(s.canvasSize);
    setCustomWidth(s.customWidth);
    setCustomHeight(s.customHeight);
    if (s.bgType !== undefined) {
      setBgType(s.bgType);
      setBgHex(s.bgHex);
      setBgOpacity(s.bgOpacity);
      setGradientType(s.gradientType);
      setGradientAngle(s.gradientAngle);
      setGradientOpacity(s.gradientOpacity);
      setGradientStops(s.gradientStops);
      setGrainAmount(s.grainAmount);
    }
    setEnvironment(s.environment);
    setCustomImagePreset(s.customImagePreset);
    setCustomBgImageUrl(assetValue(s.customBgImageUrl));
    setCustomImageLabel(s.customImageLabel);
    setCustomImageThumb(assetValue(s.customImageThumb));
    const restored = s.frames.map((f) =>
      f.img?.cropUrl ? { ...f, img: { ...f.img, cropUrl: assetValue(f.img.cropUrl) } } : f
    );
    framesLatestRef.current = restored;
    setFrames(restored);
    setTextItems(s.textItems ?? []);
    setSelectedTextId(s.selectedTextId ?? null);
    setSelectedIds((ids) => {
      const keep = ids.filter((i) => restored.some((f) => f.id === i));
      return keep.length ? keep : [restored[0].id];
    });

      // Screenshot: only touch the scene when it actually differs from what's showing.
    if (s.shotId !== shotIdRef.current) {
      const shot = s.shotId === "none" ? null : shotStoreRef.current.get(s.shotId);
      setUploadedImageDims(null);
      if (shot?.file) {
        uploadedFileRef.current = shot.file;
        sceneRef.current?.uploadFile(shot.file, shot.crop ?? undefined);
        setMockupVideo(shot.video ?? null);
        setUploadedMediaThumb(shot.thumb);
        setUploadedMediaLabel(shot.label);
        setUploadedCrop(shot.crop);
        setFrameCropUrl(shot.frameCropUrl);
      } else {
        uploadedFileRef.current = null;
        sceneRef.current?.clearScreenshot();
        setUploadedMediaThumb(null);
        setUploadedMediaLabel(null);
        setUploadedCrop(null);
        setFrameCropUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
    // These also push values into the 3D scene, so go through the handlers.

    // These also push values into the 3D scene, so go through the handlers.
    handleBrightnessChange(s.brightness);
    handleLightingChange(s.lighting);
    handleLightingIntensityChange(s.lightingIntensity);
    if (s.rotationX !== undefined) {
      handleRotationChange(s.rotationX);
      handleRotationYChange(s.rotationY);
      handleRotationZChange(s.rotationZ);
      handlePositionXChange(s.positionX);
      handlePositionYChange(s.positionY);
      handleZoomChange(s.zoom);
      handleFovChange(s.fov);
    }

    // Timeline
if (s.vidShots) {
  const restored = s.vidShots;
  const restoredBgs = unpackBgs(s.vidBgs ?? []);
  const restoredTexts = s.vidTexts ?? [];
  vidLive.current.shots = restored;
  vidLive.current.bgs = restoredBgs;
  vidLive.current.texts = restoredTexts;
  setVidPlaying(false);
  setVidShots(restored);
  setVidBgs(restoredBgs);
  setVidTexts(restoredTexts);
  setSelText(null);
  const restoredAudios = s.vidAudios ?? [];
  vidLive.current.audios = restoredAudios;
  setVidAudios(restoredAudios);
  setSelAudio(null);
      setVidDuration(s.vidDuration);
      setSelBg(null);
      vidBgActive.current = null; // forces the background clip to be re-applied
      setVidSel((p) => {
        const ids = p.ids.filter((id) => restored.some((x) => x.id === id));
        const shot = restored.find((x) => x.id === p.shot) ? p.shot : ids[ids.length - 1] ?? null;
        const key = restored.find((x) => x.id === shot)?.keys.some((k) => k.id === p.key) ? p.key : null;
        return { shot, key, ids, prop: p.prop ?? null };
      });
      const t = Math.min(s.vidHead ?? vidTimeRef.current, s.vidDuration);
      vidTimeRef.current = t;
      setVidHead(t);
      if (videoOn) {
        const c = sampleShots(restored, t);
        applyCam(c);
        commitCam(c);
        applyBgAt(t);
        applyAnimAt(t);
      }
    }
  };

  const flushPendingHistory = () => {
    const h = historyRef.current;
    if (h.committed !== null && snapshotKeyRef.current !== h.committed) {
      h.past.push(h.committed);
      h.future = [];
      h.committed = snapshotKeyRef.current;
    }
    return h;
  };

  const undo = () => {
    const h = flushPendingHistory();
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(h.committed);
    h.committed = prev;
    applySnapshot(JSON.parse(prev));
    setHistoryTick((n) => n + 1);
  };

  const redo = () => {
    const h = flushPendingHistory();
    const next = h.future.pop();
    if (!next) return;
    h.past.push(h.committed);
    h.committed = next;
    applySnapshot(JSON.parse(next));
    setHistoryTick((n) => n + 1);
  };

  const historyPending =
    historyRef.current.committed !== null && snapshotKey !== historyRef.current.committed;
  const canUndo = historyRef.current.past.length > 0 || historyPending;
  const canRedo = historyRef.current.future.length > 0 && !historyPending;

  // Opening a saved project: switch mode first, then restore everything once the mode-swap effects have run.
  const openProject = (p) => {
    if (p.id === selectedProjectId) return; // already open
    setSelectedProjectId(p.id);
    setProjectTitle(p.title);
    if (!p.data) return;
    pendingOpenRef.current = p;
    setImageOrVideo(p.data.imageOrVideo);
    setToolbarMode(p.data.toolbarMode);
    setOpenTick((n) => n + 1);
  };

  useEffect(() => {
    const p = pendingOpenRef.current;
    if (!p || toolbarMode !== p.data.toolbarMode || imageOrVideo !== p.data.imageOrVideo) return;
    pendingOpenRef.current = null;
    const d = p.data;
    const s = JSON.parse(d.snap);
    const clone = (v) => JSON.parse(JSON.stringify(v));

    applySnapshot(s);
    setMockupSocial(d.mockupSocial);
    setTimeout(() => {
      setStrap(d.strap); // the device-change effect resets these, so set them after it
      setStrapStyle(d.strapStyle);
    }, 80);
    canvasByModeRef.current = clone(d.canvasByMode);
    vidByModeRef.current = clone(d.vidByMode);
    vidNo.current = d.vidByMode[d.toolbarMode]?.no ?? 2;
    vidFrameSeenRef.current = new Set((d.vidByMode.frame?.shots ?? []).map((x) => x.frameId).filter((x) => x != null));
    vidBgActive.current = null;
    vidBgExitKeyRef.current = null;

    // id counters can be lower than the ids inside the opened project (New project resets some of them)
    const frameIds = s.frames.map((f) => f.id);
    nextFrameIdRef.current = Math.max(nextFrameIdRef.current, 1 + Math.max(0, ...frameIds));
    nextTextIdRef.current = Math.max(nextTextIdRef.current, 1 + Math.max(0, ...(s.textItems ?? []).map((t) => t.id)));
    nextEffectIdRef.current = Math.max(
      nextEffectIdRef.current,
      1 + Math.max(0, ...s.frames.flatMap((f) => f.effects.map((e) => e.id)))
    );
    const vids = Object.values(d.vidByMode).flatMap((m) => [
      ...m.shots.flatMap((x) => [x.id, ...x.keys.map((k) => k.id)]),
      ...m.bgs.map((x) => x.id),
      ...m.texts.map((x) => x.id),
    ]);
    vidId.current = Math.max(vidId.current, 1 + Math.max(0, ...vids, ...(s.vidAudios ?? []).map((x) => x.id)));

    setTextPopupOpen(false);
    setColorPickerOpen(false);
    closeEffectPopup();
    historyRef.current = { past: [], future: [], committed: null }; // undo starts fresh for the opened project
    restoreUntilRef.current = Date.now() + 600;
    setHistoryTick((n) => n + 1);
  }, [openTick, toolbarMode, imageOrVideo]);

    // Always-current handlers, so the single window listener below never goes stale.
  const shortcutRef = useRef({});
  useEffect(() => {
    shortcutRef.current = {
      save: () => handleSaveProject(false),
      saveCopy: () => handleSaveProject(true),
      toggleExport: () => setExportOpen((v) => !v),
      toggleSidebar: () => setSidebarOpen((v) => !v),
      setMode: setToolbarMode,
      setMedia: setImageOrVideo,
      toggleTextTool: () => setTextTool((v) => !v),
      cycleTheme: () =>
        setThemePref((p) => {
          const i = THEME_OPTIONS.findIndex((o) => o.value === p);
          return THEME_OPTIONS[(i + 1) % THEME_OPTIONS.length].value;
        }),
      resetCamera: () => (toolbarMode === "frame" ? resetFrameCamera() : sceneRef.current?.resetView()),
      vidSelected: videoOn && (vidSel.ids.length > 0 || !!selBg || !!selText),
      preset: (i) => CAMERA_VIEW_PRESETS[i] && handleCameraViewPreset(CAMERA_VIEW_PRESETS[i]),
      toggleShortcuts: () => setShortcutsOpen((v) => !v),
      newProject: handleNewProject,
      undo,
      redo,
      setPanel: (p) => {
        setSidebarPanel(p);
        setSidebarOpen(true);
      },
      devicesDisabled,
      shortcutsOpen,
      tourOpen,
      cropOpen: cropModalOpen || customCropModalOpen || frameCropId !== null || shotCrop !== null,
      frameMode: toolbarMode === "frame",
      mockupMode: toolbarMode === "mockup",
      deleteFrames: deleteSelected,
      duplicate: duplicateSelected,
      textSelected: selectedTextId !== null,
      duplicateText: () => duplicateTextLayer(),
      deleteText: () => deleteTextLayer(),
      distribute: distributeSelected,
      align: alignSelected,
      selectAllFrames: () => setSelectedIds(frames.map((f) => f.id)),
    };
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.isComposing) return;
      const h = shortcutRef.current;
      const t = e.target;
      const typing =
        t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      const key = e.key;

      // "?" opens and closes the modal (Esc is handled inside the modal itself).
      if (key === "?" && !typing && !h.cropOpen && !h.tourOpen) {
        e.preventDefault();
        h.toggleShortcuts();
        return;
      }
      if (h.shortcutsOpen || h.cropOpen || h.tourOpen) return;

      // A selected text layer takes priority over frames for duplicate / delete.
      if (!typing && h.textSelected) {
        const cmd = e.metaKey || e.ctrlKey;
        if (cmd && !e.altKey && !e.shiftKey && e.code === "KeyD") {
          e.preventDefault(); // also stops the browser's bookmark shortcut
          h.duplicateText();
          return;
        }
        if (!cmd && (key === "Delete" || key === "Backspace")) {
          e.preventDefault();
          h.deleteText();
          return;
        }
      }
      
      if (h.frameMode && !typing) {
        const cmd = e.metaKey || e.ctrlKey;
        if (cmd && !e.altKey && !e.shiftKey && e.code === "KeyA") {
          e.preventDefault();
          h.selectAllFrames();
          return;
        }
        if (cmd && !e.altKey && !e.shiftKey && e.code === "KeyD" && !h.vidSelected) {
          e.preventDefault(); // also stops the browser's bookmark shortcut
          h.duplicate();
          return;
        }
        if (!cmd && (key === "Delete" || key === "Backspace") && !h.vidSelected) {
          e.preventDefault();
          h.deleteFrames();
          return;
        }
        if (e.altKey && !cmd) {
          if (e.shiftKey && (e.code === "KeyV" || e.code === "KeyH")) {
            e.preventDefault();
            h.distribute(e.code === "KeyV" ? "v" : "h");
            return;
          }
          const action = !e.shiftKey && ALIGN_KEYS[e.code];
          if (action) {
            e.preventDefault();
            h.align(action);
            return;
          }
        }
      }

      const mod = e.metaKey || e.ctrlKey;
      // Skipped while typing so the browser's native text undo still works in inputs.
      if (mod && !e.altKey && !typing) {
        const zk = key.toLowerCase();
        if (zk === "z") { e.preventDefault(); if (e.shiftKey) h.redo(); else h.undo(); return; }
        if (zk === "y" && !e.shiftKey) { e.preventDefault(); h.redo(); return; }
      }
      if (mod && e.shiftKey && !e.altKey && key.toLowerCase() === "s") {
        e.preventDefault();
        h.saveCopy();
        return;
      }
      if (mod && !e.shiftKey && !e.altKey) {
        const k = key.toLowerCase();
        if (k === "s") { e.preventDefault(); h.save(); }
        else if (k === "e") { e.preventDefault(); h.toggleExport(); }
        else if (key === "\\") { e.preventDefault(); h.toggleSidebar(); }
        return;
      }

      if (mod || e.altKey || e.shiftKey || typing) return;
      switch (key.toLowerCase()) {
        case "m": h.setMode("mockup"); break;
        case "f": h.setMode("frame"); break;
        case "i": h.setMedia("image"); break;
        case "v": h.setMedia("video"); break;
        case "t": h.toggleTextTool(); break;
        case "c": h.cycleTheme(); break;
        case "r": h.resetCamera(); break;
        case "d": if (!h.devicesDisabled) h.setPanel("create"); break;
        case "p": h.setPanel("projects"); break;
        case "l": h.setPanel("templates"); break;
        case "n": h.newProject(); break;
        case "1": case "2": case "3": case "4": if (h.mockupMode) h.preset(Number(key) - 1); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

// WITH THIS — a single object, no JS branching on darkMode at all.
// CSS handles light/dark entirely via the `dark:` variant now.
const vidTargetShot = videoMock
  ? vidShots.find((s) => s.id === vidSel.shot) ?? shotForImgAt(vidShots, vidHead)
  : null;
// a shot without its own image shows the Image-mode upload (that's what is on the device)
const mediaThumb = videoMock ? vidTargetShot?.img?.thumb ?? uploadedMediaThumb : uploadedMediaThumb;
const mediaLabel = videoMock ? vidTargetShot?.img?.label ?? uploadedMediaLabel : uploadedMediaLabel;
const mediaIsVideo = !!mockupVideo && !(videoMock && vidTargetShot?.img);
const clearMedia = videoMock && vidTargetShot?.img
  ? () => vidSetShotImg(vidTargetShot.id, null)
  : handleClearUpload;

// Crop: the shot's own image if it has one, otherwise the Image-mode upload
const [shotCrop, setShotCrop] = useState(null); // { id, url, width, height }
const handleCropClick = () => {
  const img = videoMock ? vidTargetShot?.img : null;
  if (!img) return handleOpenCropModal();
  const probe = new Image();
  probe.onload = () =>
    setShotCrop({ id: vidTargetShot.id, url: img.thumb, width: probe.naturalWidth, height: probe.naturalHeight });
  probe.src = img.thumb;
};
const modeTexts = textItems.filter((t) => (t.mode ?? "mockup") === toolbarMode);
const frameRatio = Math.max(1, frameWidth) / Math.max(1, frameHeight);
const cornerPcts = frameCorners ?? [frameRadius, frameRadius, frameRadius, frameRadius];
// Frame mode only uses Z rotation, X/Y position and zoom. X/Y rotation and FoV stay flat.
const frameCam = { rotationX, rotationY, rotationZ, positionX, positionY, zoom, fov: CAM_DEFAULT.fov };

const backGradientCss = buildGradientCss(backGradientType, backGradientAngle, backStops);
const frameBackFill = frameBackType === "solid" ? hexToRgba(frameBackHex, frameBackOpacity) : backGradientCss;
const frameBackOpacityCss = frameBackType === "solid" ? 1 : backGradientOpacity / 100;

const frameAppearance = (() => {
  const s = frameStroke;
  const strokeOn = s.on && s.width > 0;
  const strokeCss = hexToRgba(s.hex, s.opacity);
  const outer = [];
  if (strokeOn && s.position === "outside") outer.push(`0 0 0 ${s.width}px ${strokeCss}`);
  if (strokeOn && s.position === "center") outer.push(`0 0 0 ${s.width / 2}px ${strokeCss}`);
  frameEffects
    .filter((e) => e.visible && e.type === "dropShadow")
    .forEach((e) => outer.push(`${e.x}px ${e.y}px ${e.blur}px ${e.spread}px ${hexToRgba(e.hex, e.opacity)}`));
  const blur = frameEffects
    .filter((e) => e.visible && e.type === "layerBlur")
    .reduce((sum, e) => sum + e.blur, 0);
  return {
    radiiFrac: cornerPcts.map((p) => p / 100),
    sheen: sheenCss(environment, rotationX, rotationY),
    sheenKey: environment,
    boxShadow: outer.length ? outer.join(", ") : "none",
    filter: blur > 0 ? `blur(${blur}px)` : "none",
    insetStroke:
      strokeOn && s.position !== "outside"
        ? `inset 0 0 0 ${s.position === "center" ? s.width / 2 : s.width}px ${strokeCss}`
        : null,
    noise: frameEffects
      .filter((e) => e.visible && e.type === "noise")
      .map((e) => ({ id: e.id, opacity: (e.amount / 100) * 0.6, url: makeGrainUrl(e.size) })),
  };
})();

const frameBackground = (
  <>
    {bgType === "solid" && (
      <div className="absolute inset-0" style={{ background: hexToRgba(bgHex, bgOpacity) }} />
    )}
    {bgType === "gradient" && (
      <>
        <div className="absolute inset-0" style={{ background: gradientCss, opacity: gradientOpacity / 100 }} />
        {grainTileUrl && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: `url(${grainTileUrl})`, backgroundSize: "512px 512px", mixBlendMode: "overlay" }}
          />
        )}
      </>
    )}
    {bgType === "custom" && customBgImageUrl && (
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${customBgImageUrl})` }} />
    )}
    <canvas ref={frameBgCanvasRef} className="absolute inset-0 w-full h-full" style={{ display: "none" }} />
  </>
);

const chrome = {
  appBg: "bg-[#EFEFF0] dark:bg-[#0D0B0C]",
  panelBg: "bg-[#FAF9FA] dark:bg-[#171717]",
  border: "border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10",
  text: "text-[#8C8C8C] dark:text-[#9A9A9A]",
  subtext: "text-[#8C8C8C] dark:text-[#9A9A9A]",
  inputBg: "bg-[#f3f3f4] dark:bg-[#292929]",
  hover: "hover:bg-[#eaeaec] dark:hover:bg-[#333333]",
};

  return (
    <div className={`h-screen w-full flex flex-col ${chrome.appBg} ${chrome.text}`}>
      {/* Overrides the browser's default (black/dark) focus-visible outline
          app-wide so every focusable control — buttons, dropdown triggers,
          etc. — matches the app's accent color instead. */}
      <style>{`

         html, body, button, input, textarea, select {
         font-family: "Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
         font-feature-settings: "cv11", "ss01";
     }

     /* Segmented tabs: 13px / 450 */
body .seg-tab.seg-tab.seg-tab {
  font-size: 13px !important;
  font-weight: 450 !important;
  letter-spacing: normal !important;
}

/* Section headers: 13px / 450 / 0.005em (extra specificity so it wins over the rule above) */
body .section-title.section-title.section-title {
  font-size: 13px !important;
  font-weight: 450 !important;
  letter-spacing: 0.003em !important;
}

/* Anything nested inside a section title inherits its size, weight and spacing */
body .section-title.section-title.section-title * {
  font-size: inherit !important;
  font-weight: inherit !important;
  letter-spacing: inherit !important;
}
  /* Everything: 12px / 450 / -0.003em, except social UI, .keep-size, and anything with its own inline font-size */
body *:where(:not(.social-ui, .social-ui *, .keep-size, .keep-size *, [style*="font-size"])) {
  font-size: 12px !important;
  font-weight: 450 !important;
  letter-spacing: -0.003em !important;
}
  /* Devices panel category titles: 10px / 600 / 0.02em */
body .device-title.device-title.device-title {
  font-size: 10px !important;
  font-weight: 600 !important;
  letter-spacing: 0.02em !important;
}

/* Shortcut modal key caps: weight 500 */
body .shortcut-keys.shortcut-keys.shortcut-keys,
body .shortcut-keys.shortcut-keys.shortcut-keys * {
  font-weight: 500 !important;
}

/* Custom scrollbar: #E3E3E3 in light mode, #333333 in dark mode */
.custom-scroll {
  scrollbar-color: #E3E3E3 transparent;
}
.dark .custom-scroll {
  scrollbar-color: #333333 transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: #E3E3E3 !important;
}
.dark .custom-scroll::-webkit-scrollbar-thumb {
  background-color: #333333 !important;
}

        :where(*:focus-visible) { outline-color: #FF47BC; }

        /* One-time entrance for the empty Projects state. No loop — there's
           no status/progress to communicate, just first-paint life. */
        @keyframes folder-enter {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .folder-enter {
          animation: folder-enter 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .folder-enter { animation: none; }
        }

        /* Small stagger for the Templates grid — transform + opacity only,
           same easing as the rest of the app, capped so it never feels slow. */
        @keyframes template-enter {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .template-enter {
          animation: template-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .template-enter { animation: none; }
        }
        /* Popup entrance — opacity + 4px translate, same easing as the rest
           of the app. Drop-down menus rise from above, drop-up from below. */
        @keyframes pop-enter {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop-enter-up {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pop-enter { animation: pop-enter 140ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .pop-enter-up { animation: pop-enter-up 140ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* One reduced-motion fallback for every animation and transition. */
        /* Sidebar drawer: slower, softer curve than the rest of the UI so the
           canvas expansion reads as one continuous movement. Its own class
           (higher specificity than the global * rule) so it can keep this
           curve. */
        .sidebar-shell {
          transition: width 360ms cubic-bezier(0.32, 0.72, 0, 1) !important;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .sidebar-shell { transition-duration: 0.01ms !important; }
        }
                /* One easing curve everywhere. Tailwind's default transition classes
           use their own curve; this makes them all match. */
        *, *::before, *::after {
          transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
        }

        @keyframes sidebar-enter {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .sidebar-enter { animation: sidebar-enter 200ms cubic-bezier(0.22, 1, 0.36, 1) both; }

                /* Appearance rows (stroke / effects) — opacity + 4px translate, same easing as the rest. */
        @keyframes fx-enter {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fx-enter { animation: fx-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* Plus <-> minus swap on the Stroke header */
@keyframes icon-swap {
  from { opacity: 0; transform: scale(0.6) rotate(-45deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}
.icon-swap { animation: icon-swap 140ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        @keyframes fade-enter { from { opacity: 0; } to { opacity: 1; } }
        .fade-enter { animation: fade-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both; }

                @keyframes key-pending {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        .key-pending { animation: key-pending 900ms ease-in-out infinite; }

        /* Picker popups sit left of the toolbar, so they slide in from the right. */
        @keyframes panel-enter {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .panel-enter { animation: panel-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* Side popups (Help menu + Theme submenu) open to the right of their trigger. */
        @keyframes side-enter {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .side-enter { animation: side-enter 160ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* Crop modal */
        @keyframes modal-enter {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .backdrop-enter { animation: fade-enter 160ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .modal-enter { animation: modal-enter 200ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        .tooltip-enter { animation: fade-enter 140ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* New gradient stop handle pops in from its base. */
        @keyframes stop-enter {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        .stop-enter { animation: stop-enter 140ms cubic-bezier(0.22, 1, 0.36, 1) both; transform-origin: 50% 100%; }
      `}</style>
      {/* Top bar */}
      <div className={`flex items-center justify-between p-4 gap-3 h-16 bg-[#FAF9FA] dark:bg-[#171717] rounded-b-2xl shrink-0 mx-2`}>
        <div className="flex items-center gap-2 flex-1 h-8">
          <img
            src={`${import.meta.env.BASE_URL}logo-light.svg`}
            alt="Bezel"
            draggable={true}
            className="h-8 w-auto select-none dark:hidden"
          />
          <img
            src={`${import.meta.env.BASE_URL}logo-dark.svg`}
            alt="Bezel"
            draggable={true}
            className="hidden h-8 w-auto select-none dark:block"
          />
        </div>

        {isEditingTitle ? (
          <input
            ref={projectTitleInputRef}
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            onBlur={() => setIsEditingTitle(false)}
            className="w-[118px] h-8 pl-4 pr-3 py-2 rounded-lg text-[14px] leading-5 font-medium text-[#3A3A3A] dark:text-[#FAF9FA] bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none shrink-0"
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="flex items-center justify-center gap-2 w-fit min-w-[64px] h-8 pl-4 pr-3 py-2 rounded-lg text-[14px] leading-5 font-medium whitespace-nowrap text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F1F1F1] dark:hover:bg-white/5 transition-colors shrink-0"
          >
            {projectTitle}
          </button>
        )}

        <div className="flex items-center justify-end gap-3 flex-1 h-8">
<div className="flex items-center p-0.5 w-fit h-8 shrink-0 bg-[#F0F0F0] dark:bg-black rounded-2xl">
 <Tooltip label="Image" shortcut={["I"]} placement="bottom">
  <button
    className={`flex items-center justify-center gap-2 h-7 px-[10px] py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      imageOrVideo === "image" ? SEG_ON : SEG_OFF
    }`}
    onClick={() => setImageOrVideo("image")}
  >
    Image
  </button>
</Tooltip>
<Tooltip label="Video" shortcut={["V"]} placement="bottom">
  <button
    className={`flex items-center justify-center gap-2 h-7 px-[10px] py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      imageOrVideo === "video" ? SEG_ON : SEG_OFF
    }`}
    onClick={() => setImageOrVideo("video")}
  >
    Video
  </button>
</Tooltip>
</div>

<Tooltip label="Create a new project" shortcut={["N"]} placement="bottom">
  <button
    onClick={handleNewProject}
    className="flex items-center justify-center gap-2 h-8 pl-2 pr-2.5 shrink-0 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]"
  >
    <Plus size={14} weight="regular" className="shrink-0" /> New project
  </button>
</Tooltip>
<div className="relative" data-tour="export" ref={exportRef}>
<div className="flex items-center">
<Tooltip label={exportOpen ? "" : videoOn ? "Export video" : "Export image"} shortcut={exportOpen ? undefined : ["mod", "E"]} placement="bottom">
  <button
    onClick={() => setExportOpen((v) => !v)}
    aria-haspopup="menu"
    aria-expanded={exportOpen}
    disabled={exporting}
      className="flex items-center justify-center gap-2 w-fit h-8 pl-2.5 pr-2.5 py-1.5 rounded-l-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] enabled:hover:bg-[#F230AE] transition-[background-color,transform] duration-150 enabled:active:scale-[0.97] disabled:opacity-70 disabled:cursor-wait"
      style={{ boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" }}
    >
      {videoOn ? "Export video" : "Export image"}
    </button>
  </Tooltip>
  <Tooltip label={exportOpen ? "" : "Export options"} shortcut={["mod", "E"]} placement="bottom">
    <button
      type="button"
      aria-label="Export options"
      aria-haspopup="menu"
      aria-expanded={exportOpen}
      onClick={() => setExportOpen((v) => !v)}
      className="flex items-center justify-center w-7 h-8 -ml-px shrink-0 rounded-r-2xl border border-[#FCFCFC]/20 border-l-[#FCFCFC]/40 bg-[#FF47BC] hover:bg-[#F230AE] transition-[background-color,transform] duration-150 active:scale-[0.97]"
      style={{ boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" }}
    >
      <CaretDown
        size={14}
        weight="regular"
        style={{ transform: exportOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        className="text-[#FCFCFC] transition-transform duration-200"
      />
    </button>
  </Tooltip>
</div>
{exportOpen && (() => {
  const labelCls = "text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const segWrap = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on, off = false) =>
    `seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      on ? SEG_ON : SEG_OFF
    } ${off ? "opacity-40 cursor-not-allowed" : ""}`;

  const imgFmt = EXPORT_FORMATS.find((f) => f.value === exportFormat);
  const vidFmt = VIDEO_FORMATS.find((f) => f.value === videoFormat);
  const alphaOk = videoOn ? vidFmt.alpha : exportFormat !== "jpg";

  let dims, estimate;
  if (videoOn) {
    dims = videoOutDims();
    const fps = Math.min(videoFps, vidFmt.maxFps);
    const frames = Math.max(1, Math.round((vidDuration / videoSpeed) * fps));
    estimate = formatBytes(estimateVideoBytes(videoFormat, dims.w, dims.h, fps, frames));
  } else {
    dims = exportDims(exportWidth);
    estimate = dims ? formatBytes(dims.w * dims.h * imgFmt.bpp) : null;
  }
  const size = !videoOn ? EXPORT_SIZES.find((s) => s.width === exportWidth) : null;

  const changeVideoFormat = (v) => {
    const f = VIDEO_FORMATS.find((x) => x.value === v);
    setVideoFormat(v);
    setVideoRes((r) => Math.min(r, f.maxLong));
    setVideoFps((p) => Math.min(p, f.maxFps));
  };

  return (
    <div className="pop-enter absolute right-0 mt-1 w-[340px] p-4 flex flex-col gap-4 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 bg-[#FAF9FA] dark:bg-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)] z-10">
      <div className="flex flex-col gap-2">
        <label className={labelCls}>File type</label>
        {videoOn ? (
          <ToolbarDropdown value={videoFormat} options={VIDEO_FORMATS} onChange={changeVideoFormat} />
        ) : (
          <ToolbarDropdown value={exportFormat} options={EXPORT_FORMATS} onChange={setExportFormat} />
        )}
      </div>

      <ToggleRow
        muted
        label="Transparent background"
        checked={exportTransparent && alphaOk}
        disabled={!alphaOk || exporting}
        onChange={setExportTransparent}
      />

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Size</label>
        <ToolbarDropdown value={canvasSize} options={CANVAS_SIZE_OPTIONS} onChange={setCanvasSize} />
      </div>

      {videoOn ? (
        <>
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Resolution</label>
            <ToolbarDropdown
              value={videoRes}
              options={VIDEO_RESOLUTIONS.filter((r) => r.value <= vidFmt.maxLong)}
              onChange={setVideoRes}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Speed</label>
            <div className={segWrap}>
              {VIDEO_SPEEDS.map((sp) => (
                <button key={sp} type="button" disabled={exporting} onClick={() => setVideoSpeed(sp)} className={segBtn(videoSpeed === sp)}>
                  {sp}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Frame rate (FPS)</label>
            <div className={segWrap}>
              {VIDEO_FPS_OPTIONS.map((f) => {
                const off = f > vidFmt.maxFps;
                return (
                  <button
                    key={f}
                    type="button"
                    disabled={exporting || off}
                    onClick={() => setVideoFps(f)}
                    className={segBtn(videoFps === f, off)}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-0.5 text-[12px] font-medium text-[#8C8C8C] dark:text-[#9A9A9A]">
              <span className="tabular-nums">{dims.w} × {dims.h} px · ~{estimate}</span>
              {videoFormat === "lottie" && <span>Lottie is exported as an image sequence, so files get large.</span>}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Resolution</label>
          <div className={segWrap}>
            {EXPORT_SIZES.map((opt) => (
              <button key={opt.width} type="button" disabled={exporting} onClick={() => setExportWidth(opt.width)} className={segBtn(exportWidth === opt.width)}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-0.5 text-[12px] font-medium text-[#8C8C8C] dark:text-[#9A9A9A]">
            <span className="tabular-nums">
              {dims ? `${dims.w} × ${dims.h} px` : "—"}{estimate ? ` · ~${estimate}` : ""}
            </span>
            {size?.warn && <span>Large export. It can take a few seconds and the page may pause.</span>}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="w-full h-8 flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] enabled:hover:bg-[#F230AE] transition-[background-color,transform] duration-150 enabled:active:scale-[0.97] disabled:opacity-70 disabled:cursor-wait"
        style={{ boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" }}
      >
        {exporting ? (
          <>
            <CircleNotch size={14} weight="regular" className="animate-spin" />
            {exportProgress != null ? `Exporting ${Math.round(exportProgress * 100)}%` : "Exporting…"}
          </>
        ) : (
          <><UploadSimple size={14} weight="regular" /> {videoOn ? "Export video" : "Export image"}</>
        )}
      </button>
    </div>
  );
})()}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-[8px] overflow-hidden">
        {/* Left sidebar */}
       <div data-tour="left-toolbar" className={`flex items-start gap-2 sidebar-shell ${sidebarOpen ? "w-[300px]" : "w-[44px]"} ml-[8px] mt-[8px] mb-[8px] shrink-0 overflow-hidden`}>
          <div className="flex flex-col justify-between items-start h-full w-11 shrink-0">
                        <div className="flex flex-col items-start gap-1">
<Tooltip label={devicesDisabled ? "Not available in Frame mode" : "Devices"} shortcut={devicesDisabled ? undefined : ["D"]}>
  <button
    aria-disabled={devicesDisabled}
    onClick={() => {
      if (devicesDisabled) return;
      setSidebarPanel("create");
      setSidebarOpen(true);
    }}
    className={`group flex items-center justify-center w-11 h-11 rounded-[10px] border transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
      devicesDisabled
        ? "opacity-40 cursor-not-allowed bg-transparent border-transparent"
        : `active:scale-[0.94] ${
            sidebarPanel === "create" && sidebarOpen
              ? "bg-[#FAF9FA] dark:bg-[#171717] border-transparent"
              : "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5"
          }`
    }`}
  >
    <Devices
      size={20}
      weight={sidebarPanel === "create" && sidebarOpen && !devicesDisabled ? "fill" : "regular"}
      className={`transition-colors duration-200 ${
        devicesDisabled
          ? "text-[#8C8C8C] dark:text-[#9A9A9A]"
          : sidebarPanel === "create" && sidebarOpen
          ? "text-[#FF47BC]"
          : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
      }`}
    />
  </button>
</Tooltip>
              <Tooltip label="Projects" shortcut={["P"]}>
                <button
                  onClick={() => {
                    setSidebarPanel("projects");
                    setSidebarOpen(true);
                  }}
                  className={`group flex items-center justify-center w-11 h-11 rounded-[10px] border transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.94] ${
                    sidebarPanel === "projects" && sidebarOpen
                      ? "bg-[#FAF9FA] dark:bg-[#171717] border-transparent"
                      : "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <Folder
                    size={20}
                    weight={sidebarPanel === "projects" && sidebarOpen ? "fill" : "regular"}
                    className={`transition-colors duration-200 ${
                      sidebarPanel === "projects" && sidebarOpen
                        ? "text-[#FF47BC]"
                        : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                    }`}
                  />
                </button>
              </Tooltip>
            <Tooltip label="Templates" shortcut={["L"]}>
              <button
                onClick={() => {
                  setSidebarPanel("templates");
                  setSidebarOpen(true);
                }}
                className={`group flex items-center justify-center w-11 h-11 rounded-[10px] border transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.94] ${
                  sidebarPanel === "templates" && sidebarOpen
                    ? "bg-[#FAF9FA] dark:bg-[#171717] border-transparent"
                    : "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <CardsThree
                  size={20}
                  weight={sidebarPanel === "templates" && sidebarOpen ? "fill" : "regular"}
                  className={`transition-colors duration-200 ${
                    sidebarPanel === "templates" && sidebarOpen
                      ? "text-[#FF47BC]"
                      : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                  }`}
                />
              </button>
            </Tooltip>
            </div>
            <>
              <Tooltip label={helpOpen ? "" : "Help"}>
                <button
                  ref={helpButtonRef}
                  onClick={() => {
                    setHelpOpen((v) => !v);
                    setThemeMenuOpen(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={helpOpen}
                  className={`group flex items-center justify-center w-11 h-11 rounded-[10px] border transition-[background-color,border-color,transform] duration-200 active:scale-[0.94] ${
                    helpOpen
                      ? "bg-[#FAF9FA] dark:bg-[#171717] border-transparent"
                      : "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <Info
                    size={20}
                    weight="regular"
                    className={`transition-colors duration-200 ${
                      helpOpen
                        ? "text-[#FF47BC]"
                        : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                    }`}
                  />
                </button>
              </Tooltip>

              {helpOpen && helpAnchor && (
                <div
                  ref={helpPopupRef}
                  role="menu"
                  style={{ position: "fixed", left: helpAnchor.left, bottom: helpAnchor.bottom }}
                  className="side-enter w-[220px] p-2 flex flex-col items-start bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
                >
                  <div className="flex flex-col items-start gap-1 w-full">
                    <button
                      type="button"
                                            onClick={() => {
                        closeHelp();
                        startTour();
                      }}
                      onMouseEnter={() => setThemeMenuOpen(false)}
                    className="flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
                    >
                      <span className="flex items-center gap-2">
                        <Compass size={16} weight="regular" className="shrink-0" />
                        App tour
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        closeHelp();
                        if (imageOrVideo !== "video") {
                          setImageOrVideo("video");
                          setTimeout(startVideoTour, 450); // let the timeline mount
                        } else startVideoTour();
                      }}
                      onMouseEnter={() => setThemeMenuOpen(false)}
                      className="flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
                    >
                      <span className="flex items-center gap-2">
                        <Play size={16} weight="regular" className="shrink-0" />
                        Video timeline tour
                      </span>
                    </button>

                    <div className="w-full" onMouseEnter={() => setThemeMenuOpen(true)}>
                      <button
                        type="button"
                        onClick={() => setThemeMenuOpen((v) => !v)}
                       className={`flex items-center justify-between w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] transition-colors duration-100 ${
  themeMenuOpen
    ? "bg-[#EDEDED] dark:bg-white/10"
    : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
}`}
                      >
                        <span className="flex items-center gap-2">
                          <Palette size={16} weight="regular" className="shrink-0" />
                          Theme
                        </span>
<span className="flex items-center gap-1">
  <KeyCombo keys={["C"]} />
  <CaretRight size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
</span>
                      </button>

                      {themeMenuOpen && (
                        <div className="side-enter absolute left-[calc(100%+5px)] bottom-[-1px] w-[200px] p-2 gap-1 flex flex-col items-start bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                          <span className="block px-2 pt-1 pb-1 text-[11px] font-semibold tracking-[0.02em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                            Theme
                          </span>
                          {THEME_OPTIONS.map((opt) => {
                            const isSelected = themePref === opt.value;
                            const Icon = opt.Icon;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setThemePref(opt.value)}
                                className={`group flex items-center justify-between w-full h-[30px] pl-2 pr-2 rounded-lg transition-colors duration-100 ${
                                  isSelected
                                    ? "bg-[#EDEDED] dark:bg-white/10"
                                    : "hover:bg-[#F1F1F1] dark:hover:bg-white/5"
                                }`}
                              >
                                <span className="flex items-center gap-2 text-[#8C8C8C] dark:text-[#9A9A9A]">
                                  <Icon size={16} weight="regular" />
                                  <span className="text-[13px] font-medium tracking-[-0.005em]">
                                    {opt.label}
                                  </span>
                                </span>
                                {isSelected && (
                                  <Check size={14} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeHelp();
                        setShortcutsOpen(true);
                      }}
                      onMouseEnter={() => setThemeMenuOpen(false)}
                      className="flex items-center justify-between w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
                    >
                      <span className="flex items-center gap-2">
                        <Keyboard size={14} weight="regular" className="shrink-0" />
                        Keyboard shortcuts
                      </span>
                      <KeyCombo keys={["?"]} />
                    </button>
                  </div>

                  <a
                  
                    href="https://dee-space03.framer.website/"
                    target="_blank"
                    rel="noreferrer"
                    onMouseEnter={() => setThemeMenuOpen(false)}
                                          onClick={() => {
                        closeHelp();
                        startTour();
                      }}
                    className="mt-1 w-full h-8 flex items-center p-2 border-t border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 text-[12px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] transition-colors duration-100"
                  >
                    <span className="truncate underline underline-offset-2">Built by dee-space03.framer.website/</span>
                  </a>
                </div>
              )}
            </>
          </div>

          <div className="relative h-full w-[248px] shrink-0">
          <div
            aria-hidden={!sidebarOpen}
            className={`absolute inset-0 flex flex-col items-start w-[248px] h-full bg-[#FAF9FA] dark:bg-[#171717] rounded-2xl overflow-hidden transition-[opacity,transform,visibility] duration-300 ${
              sidebarOpen ? "visible opacity-100 translate-x-0" : "invisible opacity-0 -translate-x-3 pointer-events-none"
            }`}
          >
            <div className="flex flex-row items-center justify-between w-full h-11 py-2 pr-2 pl-4 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
              <span className="relative flex items-center h-7 text-[14px] font-medium tracking-[-0.005em] leading-[17px] text-[#3A3A3A] dark:text-[#FAF9FA]">
                {{ create: "Devices", templates: "Templates", projects: "Projects" }[sidebarPanel]}
              </span>
              <Tooltip label="Close sidebar" shortcut={["mod", "\\"]} placement="bottom">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="group flex flex-row items-center justify-center w-7 h-7 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <SidebarSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
</button>
              </Tooltip>
            </div>

            <div className="relative w-full flex-1 min-h-0 overflow-hidden">
<div
  className={`sidebar-panel absolute inset-0 flex flex-col items-start gap-6 py-4 pl-4 pr-0 w-full h-full overflow-y-auto custom-scroll transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    sidebarPanel === "create" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
  }`}
>
<div className="flex flex-col items-start gap-3 w-full flex-1 min-h-0">
  <div className="w-full pr-4">
    <SearchField placeholder="Search devices" />
  </div>

  <FadeScrollerY wrapClassName="w-full flex-1 min-h-[236px]">
    <div className="flex flex-col items-start w-full gap-4 pr-2">
    {DEVICE_CATEGORIES.filter((cat) => (CATEGORY_DEVICE_OPTIONS[cat.key] || []).length > 0).map((cat) => (
      <div key={cat.key} className="flex flex-col items-start w-full gap-1">
<span className="device-title block px-2 pt-1 pb-1 uppercase text-[#8C8C8C] dark:text-[#9A9A9A]">
  {cat.label}
</span>
        {CATEGORY_DEVICE_OPTIONS[cat.key].map((opt) => {
          const isSelected = deviceType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                setDeviceCategory(cat.key);
                setDeviceType(opt.value);
              }}
              className={`w-full shrink-0 flex items-center justify-between px-2 py-2 rounded-lg text-[12px] font-medium tracking-[-0.005em] transition-colors duration-100 ease-in-out ${
                isSelected
                  ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                  : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {isSelected && <Check size={16} weight="regular" className="shrink-0" />}
            </button>
          );
        })}
      </div>
    ))}
  </div>
                </FadeScrollerY>
</div>
            </div>

            {/* Templates panel */}
<div
  className={`sidebar-panel absolute inset-0 flex flex-col items-start gap-3 p-4 w-full h-full transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    sidebarPanel === "templates" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
  }`}
>
              <SearchField
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates"
              />
              <span className="w-full -mt-1 truncate text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                {videoTplMode ? "Replaces the shots on your timeline" : toolbarMode === "frame" ? "Applies to selected frames" : `Applies to ${deviceType}`}
              </span>

              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 w-full flex-1 py-8">
                  <CardsThree size={40} weight="fill" className="folder-enter text-[#D9D9D9] dark:text-[#3A3A40]" />
                  <span className="text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] text-center px-4 leading-4">
                    No templates match your search
                  </span>
                </div>
              ) : videoTplMode && toolbarMode === "frame" ? (
                <FadeScrollerY wrapClassName="w-full flex-1" className="grid grid-cols-1 gap-1 w-full">
                  {filteredTemplates.map((tpl, i) => (
                    <FrameVideoTemplateCard
                      key={tpl.id}
                      tpl={tpl}
                      index={i}
                      label={tpl.label}
                      active={vidTplId === tpl.id}
                      renderKey={`${frames.map((f) => `${f.id}:${f.img?.cropUrl ?? f.img?.url ?? ""}`).join("|")}|${canvasSize}|${customWidth}x${customHeight}`}
                      renderStill={renderFrameVideoStill}
                      onApply={handleApplyVideoTemplate}
                    />
                  ))}
                </FadeScrollerY>
              ) : videoTplMode ? (
                <FadeScrollerY wrapClassName="w-full flex-1" className="grid grid-cols-1 gap-1 w-full">
                  {filteredTemplates.map((tpl, i) => (
                    <VideoTemplateCard
                      key={tpl.id}
                      tpl={tpl}
                      index={i}
                      label={tpl.label}
                      active={vidTplId === tpl.id}
                      renderKey={`${deviceType}|${finish}|${bodyHex}|${bodyOpacity}|${deviceOrientation}|${uploadedMediaThumb}`}
                      renderStills={renderVideoStills}
                      onApply={handleApplyVideoTemplate}
                    />
                  ))}
                </FadeScrollerY>
              ) : (
                <FadeScrollerY wrapClassName="w-full flex-1" className="flex flex-col items-start w-full gap-1">
                  {filteredTemplates.map((tpl, i) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        if (toolbarMode === "frame") handleApplyFrameTemplate(tpl);
                        else handleApplyTemplate(tpl);
                        setActiveTemplateId(tpl.id);
                      }}
                      style={{ animationDelay: `${Math.min(i, 5) * 30}ms` }}
                      className={`template-enter group flex flex-col items-start gap-2 w-full p-2 rounded-2xl transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        activeTemplateId === tpl.id ? "bg-[#FF47BC]/10" : "hover:bg-black/[0.03] dark:hover:bg-white/5"
                      }`}
                    >
                      {(() => {
                        const cam = TEMPLATE_CAMERAS.find((p) => p.key === tpl.cameraKey);
                        return (
                          <>
                            <div
                              className="relative w-full h-[117px] rounded-lg bg-[#EDEDED] dark:bg-[#292929] shrink-0 overflow-hidden flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.015]"
                              style={templateBackground(tpl)}
                            >
                              {toolbarMode === "frame" ? (
                                <FrameTemplateThumb tpl={tpl} frames={frames} />
                              ) : tplPreviews[tpl.id] ? (
                                <img
                                  src={tplPreviews[tpl.id]}
                                  alt=""
                                  draggable={false}
                                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none fade-enter"
                                />
                              ) : (
                                <div
                                  style={{
                                    width: tplShape.w,
                                    height: tplShape.h,
                                    borderRadius: tplShape.r,
                                    background: "linear-gradient(135deg, #3A3A3E 0%, #0E0E10 100%)",
                                    boxShadow: "0 8px 16px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.12)",
                                    transform: cam
                                      ? `perspective(260px) rotateX(${-cam.rotationX * 0.7}deg) rotateY(${cam.rotationY * 0.7}deg)`
                                      : undefined,
                                  }}
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-1 w-full">
                              <span
                                className={`flex-1 min-w-0 text-left text-[12px] font-medium leading-4 tracking-[-0.005em] truncate ${
                                  activeTemplateId === tpl.id ? "text-[#FF47BC]" : "text-[#3A3A3A] dark:text-[#FAF9FA]"
                                }`}
                              >
                                {tpl.label}
                              </span>
                              <span
                                className={`shrink-0 text-[12px] font-medium leading-4 tracking-[-0.005em] ${
                                  activeTemplateId === tpl.id ? "text-[#FF47BC]/80" : "text-[#8C8C8C] dark:text-[#9A9A9A]"
                                }`}
                              >
                                {toolbarMode === "frame" ? tpl.note : cam?.label}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </button>
                  ))}
                </FadeScrollerY>
              )}
            </div>

            {/* Projects panel */}
<div
  className={`sidebar-panel absolute inset-0 flex flex-col items-start gap-3 p-4 w-full h-full transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    sidebarPanel === "projects" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
  }`}
>
              <SearchField placeholder="Search projects" />

              {savedProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 w-full flex-1 py-8">
                  <Folder size={40} weight="fill" className="folder-enter text-[#D9D9D9] dark:text-[#3A3A40]" />
                  <span className="text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] text-center px-4 leading-4">
                    No projects yet — save one to see it here
                  </span>
                </div>
              ) : (
                <FadeScrollerY wrapClassName="w-full flex-1" className="flex flex-col items-start w-full gap-1">
{savedProjects.map((p) => (
  <div
    key={p.id}
    role="button"
    tabIndex={0}
    onClick={() => {
      if (renamingProjectId === p.id) return;
      openProject(p);
    }}
    onKeyDown={(e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProject(p);
      }
    }}
    className={`group relative flex flex-col items-start gap-2 w-full p-2 rounded-2xl transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer text-left ${
      selectedProjectId === p.id
        ? "bg-[#FF47BC]/10"
        : "hover:bg-black/[0.03] dark:hover:bg-white/5"
    }`}
  >
    <div
      className="w-full h-[117px] rounded-lg bg-[#EDEDED] dark:bg-[#292929] bg-cover bg-center shrink-0 overflow-hidden transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.015]"
      style={p.thumb ? { backgroundImage: `url(${p.thumb})` } : undefined}
    />
    <div className="flex flex-col items-start gap-1 w-full pr-8">
      {renamingProjectId === p.id ? (
        <input
          autoFocus
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onClick={(e) => e.stopPropagation()}
          onBlur={commitRenameProject}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              renameCancelRef.current = true;
              e.currentTarget.blur();
            }
          }}
          className="w-full h-5 -my-0.5 px-1 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]"
        />
      ) : (
        <span
          className={`w-full min-h-[16px] text-left text-[12px] font-medium leading-4 tracking-[-0.005em] truncate ${
            selectedProjectId === p.id ? "text-[#FF47BC]" : "text-[#3A3A3A] dark:text-[#FAF9FA]"
          }`}
        >
          {p.title}
        </span>
      )}
      <span
        className={`w-full text-left text-[12px] font-medium leading-4 tracking-[-0.005em] ${
          selectedProjectId === p.id ? "text-[#FF47BC]/80" : "text-[#8C8C8C] dark:text-[#9A9A9A]"
        }`}
      >
        {formatEditedAt(p.editedAt)}{p.kind === "frame" ? " · Frame" : ""}
      </span>
    </div>
    <button
      type="button"
      data-project-menu-trigger
      aria-label="Project options"
      aria-haspopup="menu"
      aria-expanded={projectMenu?.id === p.id}
      onClick={(e) => toggleProjectMenu(e, p.id)}
      className={`group/dots absolute right-2 bottom-3 flex items-center justify-center w-7 h-7 rounded-lg transition-[background-color,transform] duration-150 active:scale-[0.94] ${
        projectMenu?.id === p.id ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      <DotsThreeVertical
        size={16}
        weight="regular"
        className={`transition-colors ${
          selectedProjectId === p.id
            ? "text-[#FF47BC]/80 group-hover/dots:text-[#FF47BC]"
            : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover/dots:text-[#3A3A3A] dark:group-hover/dots:text-[#FAF9FA]"
        }`}
      />
    </button>
  </div>
))}
                </FadeScrollerY>
              )}

<Tooltip label="Create a new project" shortcut={["N"]} placement="vertical" className="w-full shrink-0">
  <button
    onClick={handleNewProject}
    className="w-full h-8 shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] hover:bg-[#F230AE] transition-[background-color,transform] duration-150 active:scale-[0.97]"
    style={{ boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" }}
  >
    <Plus size={14} weight="regular" className="shrink-0" /> New project
  </button>
</Tooltip>
            </div>
          </div>
          </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col my-[8px] overflow-hidden">
          {videoOn && <VideoTimeline v={vidApi} />}

          {/* Canvas surface — relative wrapper is NOT overflow-hidden so the
              size-control popup (opened upward, since the trigger now sits
              at the canvas's bottom edge) isn't clipped by it. */}
          <div className="relative flex-1 min-h-0" data-tour="canvas">
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              {(() => {
                const selectedRatio =
                  canvasSize === "Custom"
                    ? customWidth > 0 && customHeight > 0
                      ? customWidth / customHeight
                      : null
                    : CANVAS_SIZE_OPTIONS.find((o) => o.value === canvasSize)?.ratio;

                const boxStyle = selectedRatio
                  ? { aspectRatio: selectedRatio, maxWidth: "100%", maxHeight: "100%", width: "auto", height: "100%" }
                  : { width: "100%", height: "100%" };

                return (
                  <div
                    ref={canvasBoxRef}
                    className={`relative rounded-[16px] overflow-hidden ${chrome.panelBg}`}
                    style={boxStyle}
                    onPointerDown={(e) => {
                      if (!videoOn) return;
                      // Frame mode: grabbing, moving or resizing a frame is an edit, so it keeps the shot selected
                      if (toolbarMode === "frame" && e.target.closest?.("[data-frame-id],[data-handle]")) return;
                      if (!e.target.closest?.("canvas") && !(toolbarMode === "frame" && !e.target.closest?.("[data-text-box],[data-text-handle]"))) {
                        vidApi.onSelect(null, null);
                        return;
                      }
                      // 3D scene: a drag adjusts the camera and keeps the selection, a plain click deselects
                      const x0 = e.clientX, y0 = e.clientY;
                      const done = (ev) => {
                        window.removeEventListener("pointerup", done);
                        window.removeEventListener("pointercancel", done);
                        if (ev.type === "pointerup" && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) vidApi.onSelect(null, null);
                      };
                      window.addEventListener("pointerup", done);
                      window.addEventListener("pointercancel", done);
                    }}
                    {...canvasDrop.dropProps}
                  >
                    <div
                      aria-hidden
                      className={`absolute inset-0 z-20 pointer-events-none flex items-center justify-center rounded-[16px] border-2 border-dashed border-[#FF47BC] bg-[#FF47BC]/10 transition-opacity duration-150 ${
                        canvasDrop.dragOver ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <span className="flex items-center gap-2 h-8 px-3 rounded-2xl bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                        <UploadSimple size={14} weight="regular" /> Drop image to upload
                      </span>
                    </div>
                    <MockupScene ref={sceneRef} onViewChange={handleViewChange} deviceType={deviceType} />
                    {toolbarMode === "frame" && (
                      <FrameLayer
                        frames={frames}
                        selectedIds={selectedIds}
                        onSelect={frameSelect}
                        onFramesChange={setFrames}
                        aspectLocked={frameAspectLocked}
                        environment={environment}
                        camera={frameCam}
                        cameraEase={cameraEase}
                        background={frameBackground}
                        textBehind={<TextOverlay items={modeTexts} layer="behind" vidAnim={textAnimCtl} />}
                        chromeColors={chromeColors}
                        stageRef={frameStageRef}
                        animRef={frameAnimRef}
                        onStageReady={() => {
                          if (videoOn) applyAnimAt(vidTimeRef.current);
                        }}
                        groupOf={Object.fromEntries(vidShots.filter((s) => s.frameId != null && s.group).map((s) => [s.frameId, s.group]))}
                        onFrameDoubleClick={(id) => {
                          soloFrameRef.current = id;
                          setSelectedIds([id]); // new array, so the timeline-sync effect re-runs
                        }}
                        sizeRef={frameSizeRef}
                        onPickFile={pickFrameFile}
                        onRotate={(x, y) => {
                          handleRotationChange(x);
                          handleRotationYChange(y);
                        }}
                        onZoom={undefined}
                        nextFrameId={() => nextFrameIdRef.current++}
                        backVisible={isFrameBackFacing(frameCam)}
                        videoMode={videoOn}
                        onVideoReady={() => syncVideos(vidTimeRef.current, vidLive.current.playing)}
                      />
                    )}
                    {modeTexts
                      .filter((t) => t.visible !== false)
                      .map((t) => (
                        <TextEditor
                          key={t.id}
                          item={t}
                          selected={textPopupOpen && selectedTextId === t.id}
                          onSelect={() => selectText(t.id)}
                          onChange={(patch) => updateTextById(t.id, patch)}
                          onDuplicate={() => duplicateTextLayer(t.id, { inPlace: true, keepSelection: true })}
                          vidAnim={textAnimCtl}
                          autoEdit={pendingEditId === t.id}
                          onEditStarted={() => setPendingEditId(null)}
                          onRemove={() => deleteTextLayer(t.id)}
                          isOccluded={(e) =>
                            toolbarMode === "frame"
                              ? !!e.target.closest?.("[data-frame-id]")
                              : !!sceneRef.current?.hitTest?.(e.clientX, e.clientY)
                          }
                        />
                      ))}

                    {textTool && (
                      <div
                        data-text-tool
                        className="absolute inset-0 z-30"
                        style={{ cursor: "text" }}
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          createTextAt(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
                        }}
                      />
                    )}

                    {bgType === "gradient" && gradientPickerOpen && (
                      <GradientCanvasHandles
                        gradientType={gradientType}
                        gradientAngle={gradientAngle}
                        gradientStops={gradientStops}
                        selectedStopId={selectedStopId}
                        onSelectStop={setSelectedStopId}
                        onStopPositionChange={handleStopPositionChange}
                      />
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Save project — top-left overlay */}
<div data-save-menu className="absolute top-4 left-4 z-10">
  <div className="flex items-center">
<Tooltip label={saveMenuOpen ? "" : selectedProjectId ? "Save changes" : "Save project"} shortcut={saveMenuOpen ? undefined : ["mod", "S"]} placement="bottom">
  <button
    onClick={() => setSaveMenuOpen((v) => !v)}
    aria-haspopup="menu"
    aria-expanded={saveMenuOpen}
        className="flex items-center justify-center gap-2 h-8 pl-2 pr-2.5 shrink-0 rounded-l-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]"
      >
        <FloppyDisk size={16} weight="regular" className="shrink-0" /> Save project
      </button>
    </Tooltip>
    <Tooltip label={saveMenuOpen ? "" : "Save options"} placement="bottom">
      <button
        type="button"
        aria-label="Save options"
        aria-haspopup="menu"
        aria-expanded={saveMenuOpen}
        onClick={() => setSaveMenuOpen((v) => !v)}
        className="group flex items-center justify-center w-7 h-8 -ml-px shrink-0 rounded-r-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] transition-[background-color,transform] duration-150 active:scale-[0.97]"
      >
        <CaretDown
          size={14}
          weight="regular"
          style={{ transform: saveMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-[transform,color] duration-200"
        />
      </button>
    </Tooltip>
  </div>

  {saveMenuOpen && (
    <div
      role="menu"
      className="pop-enter absolute left-0 top-full mt-1 w-[220px] p-2 gap-1 flex flex-col bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-20"
    >
      <button
        type="button"
        onClick={() => {
          setSaveMenuOpen(false);
          handleSaveProject(false);
        }}
        className={`${CTX_ITEM} justify-between`}
      >
        {selectedProjectId ? "Save" : "Save new"}
        <KeyCombo keys={["mod", "S"]} />
      </button>
      <button
        type="button"
        onClick={() => {
          setSaveMenuOpen(false);
          handleSaveProject(true);
        }}
        className={`${CTX_ITEM} justify-between`}
      >
        Save as copy
        <KeyCombo keys={["mod", "⇧", "S"]} />
      </button>
    </div>
  )}
</div>

{/* Undo / redo — top-right overlay */}
<div className="absolute top-4 right-4 z-10 flex items-center gap-1">
  <Tooltip label="Undo" shortcut={["mod", "Z"]} placement="bottom">
    <button
      type="button"
      aria-label="Undo"
      onClick={undo}
      disabled={!canUndo}
      className="group flex items-center justify-center w-8 h-8 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] enabled:hover:bg-[#F5F5F5] dark:enabled:hover:bg-[#333333] transition-[background-color,transform,opacity] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <ArrowUUpLeft size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
    </button>
  </Tooltip>
  <Tooltip label="Redo" shortcut={["mod", "⇧", "Z"]} placement="bottom">
    <button
      type="button"
      aria-label="Redo"
      onClick={redo}
      disabled={!canRedo}
      className="group flex items-center justify-center w-8 h-8 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] enabled:hover:bg-[#F5F5F5] dark:enabled:hover:bg-[#333333] transition-[background-color,transform,opacity] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <ArrowUUpRight size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
    </button>
  </Tooltip>
</div>

{/* Canvas size dropdown — bottom-right overlay */}
            <div className="absolute bottom-4 right-4 flex items-start gap-1 z-10" ref={canvasSizeRef} data-tour="canvas-size">
<Tooltip label={canvasSizeOpen ? "" : "Canvas size"} placement="vertical">
  <button type="button" onClick={() => setCanvasSizeOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} min-w-[88px]`}>
    <span className="whitespace-nowrap text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">{canvasSize}</span>
    <CaretDown size={16} weight="regular" style={{ transform: canvasSizeOpen ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
  </button>
</Tooltip>
              {canvasSizeOpen && (
<div className="pop-enter-up absolute right-0 bottom-full mb-1 w-56 p-2 gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] flex flex-col z-10">
                  <div className="flex flex-col items-start gap-1 w-full">
  {CANVAS_SIZE_OPTIONS.map((opt) => (
    <OptionRow
      key={opt.value}
      label={opt.label}
      sublabel={opt.sublabel}
      selected={canvasSize === opt.value}
      onClick={() => {
        setCanvasSize(opt.value);
        setCanvasSizeOpen(false);
      }}
    />
  ))}
</div>

                  <div className="flex flex-col items-start gap-2 w-full pt-1 border-t border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={customSectionOpen}
                      onClick={() => setCustomSectionOpen((v) => !v)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setCustomSectionOpen((v) => !v);
                        }
                      }}
                      className="group/hdr flex items-center justify-between w-full h-[26px] pl-2 cursor-pointer select-none"
                    >
                      <span className="text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">Custom</span>
                      <span
                        aria-hidden
                        className="flex items-center justify-center w-[22px] h-[22px] rounded-lg text-[#8C8C8C] dark:text-[#9A9A9A] transition-[background-color,color,transform] duration-150 group-hover/hdr:bg-black/5 dark:group-hover/hdr:bg-white/5 group-hover/hdr:text-[#3A3A3A] dark:group-hover/hdr:text-white group-active/hdr:scale-[0.94]"
                      >
                        {customSectionOpen ? <CaretUp size={16} weight="regular" /> : <CaretDown size={16} weight="regular" />}
                      </span>
                    </div>

{customSectionOpen && (
  <div className="w-full">
    <SizeLockRow
      width={customWidth}
      height={customHeight}
      onWidthChange={handleCustomWidth}
      onHeightChange={handleCustomHeight}
      locked={customLocked}
      onToggleLock={toggleCustomLock}
    />
  </div>
)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right toolbar */}
        <div ref={toolbarRef} data-tour="right-toolbar" className={`w-[300px] mr-[8px] my-[8px] bg-[#FAF9FA] dark:bg-[#171717] rounded-2xl flex flex-col overflow-hidden shrink-0`}>
          <div
            role="tablist" data-tour="mode-tabs"
            className="flex items-center h-11 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shrink-0"
          >
            {[
              { key: "mockup", label: "Mockup" },
              { key: "frame", label: "Frame" },
            ].map((t) => {
              const active = toolbarMode === t.key;
              return (
                <Tooltip key={t.key} label={t.label} shortcut={[t.key === "mockup" ? "M" : "F"]} placement="bottom">
                <button
                  role="tab"
                  aria-selected={active}
                  onClick={() => setToolbarMode(t.key)}
                  className={`seg-tab flex items-center justify-center h-[43px] px-4 leading-[17px] border-b transition-colors duration-150 ${
                    active
                      ? "border-[#FF47BC] text-[#3A3A3A] dark:text-[#FAF9FA]"
                      : "border-transparent text-[#8C8C8C] dark:text-[#9A9A9A] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
                  }`}
                >
                  {t.label}
                </button>
                </Tooltip>
              );
            })}
          </div>

                    <FadeScrollerY wrapClassName="flex-1" className="flex flex-col">

          {/* Upload Media */}
          <div className="flex flex-col gap-2 p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
<span className="section-title text-[14px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA]">
  Upload Media{videoOn && vidTargetShot ? ` · ${vidTargetShot.name}` : ""}
</span>

<div className={toolbarMode === "frame" ? "hidden" : "contents"}>
{mediaThumb ? (
              <Tooltip label="Replace image" className="w-full">
              <div
                onClick={() => fileInputRef.current?.click()}
                {...uploadDrop.dropProps}
                className={`w-full h-[66px] flex items-center justify-between py-2 pl-2 pr-1 gap-2 bg-[#FAF9FA] dark:bg-[#171717] border rounded-2xl cursor-pointer transition-colors ${
                  uploadDrop.dragOver ? "border-[#FF47BC]" : "border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10"
                }`}
              >
                <div className="flex items-center gap-2 h-12 min-w-0">
                  <div
                    className="w-12 h-12 rounded-lg shrink-0 bg-cover bg-center bg-[#EDEDED]"
style={{ backgroundImage: `url(${mediaThumb})` }}
/>
<span className="text-[13px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] truncate">
  {mediaLabel}
</span>
                </div>
                                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip label="Crop image" placement="bottom">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCropClick();
                      }}
                      disabled={!mediaThumb || mediaIsVideo}
                      className="group flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                     <Crop size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
</button>
                  </Tooltip>
                  <Tooltip label="Remove image" placement="bottom">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearMedia();
                      }}
                      className="group flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-colors"
                    >
                      <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
                    </button>
                  </Tooltip>
                </div>
              </div>
              </Tooltip>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                {...uploadDrop.dropProps}
                className={`w-full h-[66px] border border-dashed rounded-[10px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  uploadDrop.dragOver
                    ? "border-[#FF47BC] bg-[#FF47BC]/5"
                    : "bg-white dark:bg-[#1F1F1F] border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 hover:bg-[#EAEAEA] dark:hover:bg-[#333333]"
                }`}
              >
                <UploadSimple
                  size={16}
                  weight="regular"
                  className={uploadDrop.dragOver ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"}
                />
                <span
                  className={`text-[13px] font-medium tracking-[-0.005em] ${
                    uploadDrop.dragOver ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"
                  }`}
                >
                  {uploadDrop.dragOver ? "Drop to upload" : "Click or drag & drop to upload"}
                </span>
              </button>
            )}
            </div>

            {/* Frame mode: dropzone + one thumbnail per frame image */}
            <div className={toolbarMode === "frame" ? "flex flex-col gap-2" : "hidden"}>
              <button
                type="button"
                onClick={() => {
  const ids = selectedIds.filter((id) => frames.some((f) => f.id === id));
  pickFrameFile(ids.length ? ids : null);
}}
                {...uploadDrop.dropProps}
                className={`w-full h-[66px] border border-dashed rounded-[10px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  uploadDrop.dragOver
                    ? "border-[#FF47BC] bg-[#FF47BC]/5"
                    : "bg-white dark:bg-[#1F1F1F] border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 hover:bg-[#EAEAEA] dark:hover:bg-[#333333]"
                }`}
              >
                <UploadSimple size={16} weight="regular" className={uploadDrop.dragOver ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
                <span className={`text-[13px] font-medium tracking-[-0.005em] ${uploadDrop.dragOver ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"}`}>
                  {uploadDrop.dragOver ? "Drop to upload" : "Click or drag & drop to upload"}
                </span>
              </button>

              {frames.some((f) => f.img) && (
                <FadeScroller className="flex flex-row gap-2 overflow-x-auto custom-scroll py-0.5">
                  {[...frames]
                    .reverse()
                    .filter((f) => f.img)
                    .map((f) => {
                      const selected = selectedIds.includes(f.id);
                      const dragging = draggingId === f.id;
                      const select = (shift) => {
                        setSelectedTextId(null);
                        setSelectedIds((ids) => (shift ? (ids.includes(f.id) ? ids.filter((i) => i !== f.id) : [...ids, f.id]) : [f.id]));
                      };
                      return (
                        <div
                          key={f.id}
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={(e) => {
                            dragIdRef.current = f.id;
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", String(f.id));
                            setTimeout(() => setDraggingId(f.id), 0); // deferred so the drag ghost stays opaque
                          }}
                          onDragEnter={() => {
                            if (dragIdRef.current != null && dragIdRef.current !== f.id) reorderFrame(dragIdRef.current, f.id);
                          }}
                          onDragOver={(e) => {
                            if (dragIdRef.current == null) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => e.preventDefault()}
                          onDragEnd={() => {
                            dragIdRef.current = null;
                            setDraggingId(null);
                          }}
                          onClick={(e) => select(e.shiftKey)}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select(e.shiftKey)}
                          className={`group relative w-[72px] h-[72px] shrink-0 rounded-lg overflow-hidden bg-white dark:bg-[#292929] bg-cover bg-center border cursor-grab active:cursor-grabbing transition-[border-color,opacity] ${
                            selected ? "border-[#FF47BC]" : "border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10"
                          } ${dragging ? "opacity-40" : ""} ${draggingId !== null ? "[&>*]:pointer-events-none" : ""}`}
                          style={{ backgroundImage: `url(${f.img.cropUrl ?? f.img.url})` }}
                        >
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" />
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-0.5 rounded-[8px] bg-[#FAF9FA]/60 dark:bg-[#171717]/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              type="button"
                              aria-label="Crop image"
                              disabled={!!f.img.video}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFrameCropId(f.id);
                              }}
                              className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-[background-color,transform] duration-150 active:scale-[0.9] disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Crop size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete image"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFrames([f.id]);
                              }}
                              className="group/del flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F04438]/15 transition-[background-color,transform] duration-150 active:scale-[0.9]"
                            >
                              <X size={16} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA] group-hover/del:text-[#F04438] transition-colors" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </FadeScroller>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept={imageOrVideo === "video" ? "image/*,video/*" : "image/*"} onChange={handleUpload} className="hidden" />
          </div>

{/* Position (Frame mode only) */}
<div className={`flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${toolbarMode === "frame" ? "" : "hidden"}`}>
  <div className="flex items-center justify-between">
                    {ALIGN_ACTIONS.map(({ key, label, Icon, shortcut }, i) => (
                      <React.Fragment key={key}>
                        {i === 3 && <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />}
                        <Tooltip label={label} shortcut={shortcut} placement="bottom">
                          <button
                            type="button"
                            aria-label={label}
                            disabled={selectedIds.length === 0}
                            onClick={() => alignSelected(key)}
                            className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <Icon
  size={16}
  weight="regular"
  className={`transition-colors ${
    isFrameAligned(key)
      ? "text-[#FF47BC]"
      : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
  }`}
/>
                          </button>
                        </Tooltip>
                      </React.Fragment>
                    ))}
                    <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
                    <button
                      type="button"
                      data-dist-trigger
                      aria-label="Distribute"
                      aria-haspopup="menu"
                      aria-expanded={!!distMenu}
                      onClick={(e) => {
                        if (distMenu) return setDistMenu(null);
                        const r = e.currentTarget.getBoundingClientRect();
                        setDistMenu({ right: window.innerWidth - r.right, top: r.bottom + 4 });
                      }}
                      className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-[background-color,transform] duration-150 active:scale-[0.94] ${
                        distMenu ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <Rows size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                    </button>
                  </div>
                </div>

          {/* Appearance (Frame mode only) */}
          <div className={`flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${toolbarMode === "frame" ? "" : "hidden"}`}>
<SectionHeader label="Appearance" open={openSections.appearance} onToggle={() => toggleSection("appearance")} />

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.appearance ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-4">
                  {/* Size */}
<div className="flex flex-col gap-2">
  <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Size</label>
  <SizeLockRow
    width={frameWidth}
    height={frameHeight}
    onWidthChange={handleFrameWidthChange}
    onHeightChange={handleFrameHeightChange}
    wMixed={frameWMixed}
    hMixed={frameHMixed}
    locked={frameAspectLocked}
    onToggleLock={toggleFrameAspectLock}
  />
</div>
                  {/* Radius */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Radius</label>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
<Scrubber
  label="Corner radius"
  mixed={frameCorners !== null && !frameCorners.every((c) => c === frameCorners[0])}
  value={frameCorners ? Math.round(frameCorners.reduce((a, b) => a + b, 0) / 4) : Math.round(frameRadius)}
  min={0}
  max={50}
  hardMax={Infinity}
                          onChange={(v) => {
                            setFrameRadius(v);
                            if (frameCorners) setFrameCorners([v, v, v, v]); // master control when corners are split
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="Individual corners"
                        aria-pressed={frameCorners !== null}
                        onClick={() => {
                          if (frameCorners) {
                            setFrameRadius(Math.round(frameCorners.reduce((a, b) => a + b, 0) / 4));
                            setFrameCorners(null);
                          } else {
                            setFrameCorners([frameRadius, frameRadius, frameRadius, frameRadius]);
                          }
                        }}
                        className="group flex items-center justify-center w-9 h-9 shrink-0 rounded-[10px] transition-[background-color,transform] duration-150 active:scale-[0.94] hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <CornersOut
                          size={16}
                          weight="regular"
                          className={`transition-colors ${
                            frameCorners
                              ? "text-[#FF47BC]"
                              : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                          }`}
                        />
                      </button>
                    </div>
                    {frameCorners && (
                      <CornerRadiusFields
                        values={frameCorners}
                        onChange={(i, v) => setFrameCorners((prev) => prev && prev.map((c, idx) => (idx === i ? v : c)))}
                      />
                    )}
                  </div>

                  {/* Stroke */}
<div className="flex flex-col gap-2">
  <AppearanceHeader label="Stroke" onClick={() => updateStroke({ on: !frameStroke.on })}>
    <span key={frameStroke.on ? "on" : "off"} className="icon-swap flex">
      {frameStroke.on ? <Minus size={16} weight="regular" /> : <Plus size={16} weight="regular" />}
    </span>
  </AppearanceHeader>

  {frameStroke.on && (
    <div className="fx-enter flex flex-col gap-2">
      <ColorOpacityField
        hex={frameStroke.hex}
        opacity={frameStroke.opacity}
        onHexChange={(hex) => updateStroke({ hex })}
        onOpacityChange={(opacity) => updateStroke({ opacity })}
        onSwatchClick={() => handleSwatchClick("stroke")}
        makePercentDrag={makePercentDrag}
      />
      <Scrubber
        label="Weight"
        value={frameStroke.width}
        min={0}
        max={50}
        onChange={(width) => updateStroke({ width })}
      />
      <PopupDropdown
        value={frameStroke.position}
        options={STROKE_POSITIONS}
        onChange={(position) => updateStroke({ position })}
      />
    </div>
  )}
</div>

{/* Effects */}
<div className="flex flex-col gap-2">
<AppearanceHeader label="Effects" onClick={addEffect}>
  <Plus size={16} weight="regular" />
</AppearanceHeader>

  {frameEffects.map((fx) => (
    <div
      key={fx.id}
      ref={(el) => { effectRowRefs.current[fx.id] = el; }}
      className="fx-enter flex items-center gap-1"
    >
      <button
        type="button"
        data-effect-trigger
        onClick={() => toggleEffectPopup(fx.id)}
        className="group flex-1 min-w-0 flex items-center gap-1"
      >
        <span className="flex-1 min-w-0 h-9 flex items-center px-2.5 bg-[#EDEDED] dark:bg-[#292929] group-hover:bg-[#E3E3E3] dark:group-hover:bg-[#333333] rounded-[10px] text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] text-left transition-colors duration-200">
          {EFFECT_TYPE_OPTIONS.find((o) => o.value === fx.type)?.label}
        </span>
      </button>
      <button
        type="button"
        onClick={() => updateEffect(fx.id, { visible: !fx.visible })}
        className="group flex items-center justify-center w-9 h-9 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
      >
        {fx.visible ? (
          <Eye size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        ) : (
          <EyeSlash size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        )}
      </button>
      <button
        type="button"
        onClick={() => removeEffect(fx.id)}
        className="group flex items-center justify-center w-9 h-9 shrink-0 rounded-lg hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
      >
        <Minus size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
      </button>
    </div>
  ))}
</div>
                </div>
              </div>
            </div>
          </div>

                    {/* Social media (Frame mode only) */}
          <div className={`order-4 flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${toolbarMode === "frame" ? "" : "hidden"}`}>
            <SectionHeader label="Screen Interface" open={openSections.social} onToggle={() => toggleSection("social")} />

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.social ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-2">
                  <ToggleRow label="Status bar" checked={!!frameStatusBar} onChange={setFrameStatusBar} />
                  <ToggleRow label="Home indicator" checked={!!frameHomeIndicator} onChange={setFrameHomeIndicator} />
                  <ToggleRow label="Social media UI" checked={frameSocial.on} onChange={toggleSocialOn} />

{frameSocial.on && (
  <div className="fx-enter flex flex-col gap-2">
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Platform</label>
      <ToolbarDropdown value={frameSocial.platform} options={SOCIAL_OPTIONS} onChange={changeSocialPlatform} />
    </div>

    {activeSocialPlatform.modes.length > 1 && (
      <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
        {activeSocialPlatform.modes.map((m) => (
          <button
            key={m.value}
            onClick={() => changeSocialMode(m.value)}
            className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
              activeSocialMode.value === m.value ? SEG_ON : SEG_OFF
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    )}

    {activeSocialMode.themed && (
      <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
        {["light", "dark"].map((t) => (
          <button
            key={t}
            onClick={() => updateSocial({ theme: t })}
            className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 capitalize transition-colors duration-200 ${
              frameSocial.theme === t ? SEG_ON : SEG_OFF
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    )}

{["instagram", "whatsapp", "tiktok", "linkedin", "facebook"].includes(frameSocial.platform) && (
  <div className="flex flex-col gap-2">
    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">{frameSocial.platform === "tiktok" ? "Profile picture" : "Avatar"}</label>
    {frameSocial.avatar ? (
      <div className="w-full h-[66px] flex items-center justify-between py-2 pl-2 pr-1 gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl">
        <div className="flex items-center gap-2 h-12 min-w-0">
          <div
            className="w-12 h-12 rounded-full shrink-0 bg-cover bg-center bg-[#EDEDED]"
            style={{ backgroundImage: `url(${frameSocial.avatar})` }}
          />
          <span className="text-[13px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] truncate">
            {frameSocial.avatarName}
          </span>
        </div>
        <div className="flex items-start gap-0.5 shrink-0">
          <Tooltip label="Replace avatar" placement="bottom">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
            </button>
          </Tooltip>
          <Tooltip label="Remove avatar" placement="bottom">
            <button
              type="button"
              onClick={() => updateSocial({ avatar: null, avatarName: null })}
              className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F04438]/10 transition-colors"
            >
              <Trash size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
            </button>
          </Tooltip>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => avatarInputRef.current?.click()}
        className="w-full h-[66px] bg-white dark:bg-[#1F1F1F] border border-dashed border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-[10px] flex flex-col items-center justify-center gap-1 hover:bg-[#EAEAEA] dark:hover:bg-[#333333] transition-colors"
      >
        <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
        <span className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">Upload avatar</span>
      </button>
    )}
    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
    {frameSocial.platform === "tiktok" && activeSocialMode.value === "post" && (
  <ImageUploadField
    label="Sound avatar"
    value={frameSocial.soundAvatar}
    onChange={(url) => updateSocial({ soundAvatar: url })}
    uploadLabel="Upload sound avatar"
  />
)}
  </div>
)}

<div className="grid grid-cols-2 gap-x-2 gap-y-3">
  {Object.entries(activeSocialMode.fields).map(([key, [label]]) => (
    <SocialField
      key={key}
      label={label}
      full={SOCIAL_FULL_WIDTH.has(key)}
      value={frameSocial[key] ?? ""}
      onChange={(v) => updateSocial({ [key]: v })}
    />
  ))}
</div>
  </div>
)}
                </div>
              </div>
            </div>
          </div>

          {/* Device */}
          <div className={`order-1 flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${toolbarMode === "mockup" ? "" : "hidden"}`}>
<SectionHeader label="Device" open={openSections.device} onToggle={() => toggleSection("device")} />

                        <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.device ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Type</label>
                    <ToolbarDropdown
                      value={deviceType}
                      options={CATEGORY_DEVICE_OPTIONS[deviceCategory] || DEVICE_TYPE_OPTIONS}
                      onChange={setDeviceType}
                    />
                  </div>
                  {isTablet && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Orientation</label>
                      <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
                        {["portrait", "landscape"].map((o) => (
                          <button
                            key={o}
                            onClick={() => setDeviceOrientation(o)}
                            className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 capitalize transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              deviceOrientation === o ? SEG_ON : SEG_OFF
                            }`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Body</label>
                   <FinishDropdown value={finish} options={finishOptions} onChange={handleFinishChange} />
                  </div>

{finish === "Custom" && (
  <div className="flex flex-col gap-2">
    <label className="text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Custom</label>
    <ColorOpacityField
      hex={bodyHex}
      opacity={bodyOpacity}
      onHexChange={setBodyHex}
      onOpacityChange={setBodyOpacity}
      onSwatchClick={() => handleSwatchClick("body")}
      makePercentDrag={makePercentDrag}
    />
  </div>
)}
   {isWatch && (
     <div className="fx-enter flex flex-col gap-2">
       <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Strap style</label>
       <ToolbarDropdown value={strapStyle} options={getStrapStyleOptions(deviceType)} onChange={setStrapStyle} />
       <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Strap finish</label>
       <FinishDropdown value={strap} options={WATCH_STRAPS} onChange={setStrap} />
     </div>
   )}

                  <div className="flex flex-col gap-2">
  <div className="flex flex-col gap-2">
    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Screen reflection</label>
    <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
      <button
        onClick={() => handleReflectionModeChange("shiny")}
        className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          reflectionMode === "shiny" ? SEG_ON : SEG_OFF
        }`}
      >
        Shiny
      </button>
      <button
        onClick={() => handleReflectionModeChange("matte")}
        className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          reflectionMode === "matte" ? SEG_ON : SEG_OFF
        }`}
      >
        Matte
      </button>
    </div>
    <Scrubber
      label="Intensity"
      value={reflectionMode === "shiny" ? reflectionShiny : reflectionMatte}
      onChange={handleReflectionIntensityChange}
    />
  </div>
  <Scrubber label="Screen brightness" value={brightness} onChange={handleBrightnessChange} />
</div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Lighting</label>
                    <ToolbarDropdown value={lighting} options={LIGHTING_OPTIONS} onChange={handleLightingChange} />
                  </div>

                  <Scrubber label="Lighting intensity" value={lightingIntensity} onChange={handleLightingIntensityChange} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Screen Interface */}
          <div className={`order-4 flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${toolbarMode === "mockup" && !isWatch ? "" : "hidden"}`}>
            <SectionHeader label="Screen Interface" open={openSections.screenInterface} onToggle={() => toggleSection("screenInterface")} />

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.screenInterface ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-2">
                  {(DEVICE_TYPE_OPTIONS.some((o) => o.value === deviceType) || isTablet) && (
                    <>
<ToggleRow label="Status bar" checked={showStatusBar} onChange={setShowStatusBar} />
<ToggleRow label="Home indicator" checked={showHomeIndicator} onChange={setShowHomeIndicator} />
                    </>
                  )}

                  {(DEVICE_TYPE_OPTIONS.some((o) => o.value === deviceType) ||
                    isTablet ||
                    CATEGORY_DEVICE_OPTIONS.desktop.some((o) => o.value === deviceType)) && (
                    <>
                      {CATEGORY_DEVICE_OPTIONS.desktop.some((o) => o.value === deviceType) && (
                        <ToggleRow label="Menu bar" checked={showMenuBar} onChange={setShowMenuBar} muted />
                      )}
                      <ToggleRow label="Browser" checked={showBrowser} onChange={setShowBrowser} disabled={showSocial} />
                      {showBrowser && (
                        <>
                          <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
                            {["light", "dark"].map((t) => (
                              <button
                                key={t}
                                onClick={() => setBrowserTheme(t)}
                                className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 capitalize transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                  browserTheme === t ? SEG_ON : SEG_OFF
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Browser</label>
                            <ToolbarDropdown value={browserType} options={browserOptions} onChange={setBrowserType} />
                          </div>
                          {browserType === "safari" && (
                            <div className="flex flex-col gap-2">
                              <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Tabs</label>
                              <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
                                {SAFARI_TABS_OPTIONS.map((o) => (
                                  <button
                                    key={o.value}
                                    onClick={() => setSafariTabs(o.value)}
                                    className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                      safariTabs === o.value ? SEG_ON : SEG_OFF
                                    }`}
                                  >
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {showBrowser && (
                        <div className="flex flex-col gap-2">
                          <label className="text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Address</label>
                          <div className="flex items-center px-2 py-2 bg-[#EDEDED] hover:bg-[#E3E3E3] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-[10px] border border-transparent focus-within:border-[#FF47BC] transition-colors">
                            <input
                              value={browserUrl}
                              onChange={(e) => setBrowserUrl(e.target.value)}
                              placeholder="bezel.app"
                              className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] placeholder:text-[#8C8C8C] dark:text-[#FAF9FA] outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <ToggleRow
                    label="Social media UI"
                    checked={mockupSocial.on}
                    onChange={(on) => setMockupSocial((p) => ({ ...p, on }))}
                    disabled={showBrowser}
                  />
                  {mockupSocial.on && <SocialControls social={mockupSocial} setSocial={setMockupSocial} />}
                </div>
              </div>
            </div>
          </div>

          {/* Camera */}
          <div className="order-3 flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
            <SectionHeader label="Camera" open={openSections.camera} onToggle={() => toggleSection("camera")} />

                        <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.camera ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-2">
                  <div className={`flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl ${toolbarMode === "frame" ? "hidden" : ""}`}>
                    <button
                      onClick={() => setCameraTab("manual")}
                      className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        cameraTab === "manual" ? SEG_ON : SEG_OFF
                      }`}
                    >
                      Manual
                    </button>
                    <button
                      onClick={() => setCameraTab("presets")}
                      className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        cameraTab === "presets" ? SEG_ON : SEG_OFF
                      }`}
                    >
                      Presets
                    </button>
                  </div>

                  {cameraTab === "manual" || toolbarMode === "frame" ? (
                    <div className="flex flex-col gap-2">
<Scrubber label="X - Rotation" value={rotationX} min={-360} max={360} onChange={handleRotationChange} />
<Scrubber label="Y - Rotation" value={rotationY} min={-360} max={360} onChange={handleRotationYChange} />
<Scrubber
  label="Z - Rotation"
  value={
    toolbarMode === "frame"
      ? selectedFrames.length > 1 ? groupRot : Math.round(frameRotation)
      : rotationZ
  }
  min={-360}
  max={360}
  onChange={toolbarMode === "frame" ? rotateSelection : handleRotationZChange}
/>
                      <Scrubber
                        label="X - Position"
                        value={toolbarMode === "frame" ? Math.round(primaryFrame.x * 100) : positionX}
                        min={-100}
                        max={100}
                        hardMax={300}
                        onChange={toolbarMode === "frame" ? (v) => moveSelectedFrames("x", v / 100) : handlePositionXChange}
                      />
                      <Scrubber
                        label="Y - Position"
                        value={toolbarMode === "frame" ? Math.round(primaryFrame.y * 100) : positionY}
                        min={-100}
                        max={100}
                        hardMax={300}
                        onChange={toolbarMode === "frame" ? (v) => moveSelectedFrames("y", v / 100) : handlePositionYChange}
                      />
{toolbarMode === "mockup" && (
  <Scrubber label="Zoom" value={zoom} min={0} max={100} onChange={handleZoomChange} />
)}
{toolbarMode === "frame" && (
  <Scrubber label="Scale" value={frameScalePct} min={1} max={300} hardMax={1000} onChange={handleFrameScale} />
)}
{toolbarMode === "mockup" && (
  <Scrubber label="FoV" value={fov} min={0} max={120} onChange={handleFovChange} />
)}

                      <Tooltip label="Reset camera" shortcut={["R"]} className="w-full">
                      <button
                        onClick={() => (toolbarMode === "frame" ? resetFrameCamera() : sceneRef.current?.resetView())}
                        disabled={
toolbarMode === "frame"
  ? rotationX === 0 && rotationY === 0 && rotationZ === 0 && positionX === 0 && positionY === 0 && zoom === 70 && selectedFrames.every((f) => !f.r && f.s == null)
                            : rotationX === 0 && rotationY === 0 && fov === 27 && rotationZ === 0 && positionX === 0 && positionY === 0 && zoom === 70
                        }
                        className="w-full h-8 flex items-center justify-center gap-2 pl-2 pr-2.5 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] enabled:hover:bg-[#F5F5F5] dark:enabled:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                      >
                        <ArrowCounterClockwise size={14} weight="regular" /> Reset camera
                      </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {CAMERA_VIEW_PRESETS.slice(0, 2).map((p, i) => (
                          <Tooltip key={p.key} label={p.label} shortcut={[String(i + 1)]} className="flex-1">
                          <button
                            onClick={() => handleCameraViewPreset(p)}
                            className={`flex-1 flex items-center justify-between px-2.5 py-2 rounded-[10px] text-[13px] leading-4 font-medium tracking-[-0.005em] transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] ${
                              activeCameraView === p.key
                                ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                                : "bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#EAEAEA] dark:hover:bg-[#333333] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] text-[#8C8C8C] dark:text-[#9A9A9A]"
                            }`}
                          >
                            {p.label}
                          </button>
                          </Tooltip>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {CAMERA_VIEW_PRESETS.slice(2, 4).map((p, i) => (
                          <Tooltip key={p.key} label={p.label} shortcut={[String(i + 3)]} className="flex-1">
                          <button
                            onClick={() => handleCameraViewPreset(p)}
                            className={`flex-1 flex items-center justify-between px-2.5 py-2 rounded-[10px] text-[13px] leading-4 font-medium tracking-[-0.005em] transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] ${
                              activeCameraView === p.key
                                ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                                : "bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#EAEAEA] dark:hover:bg-[#333333] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] text-[#8C8C8C] dark:text-[#9A9A9A]"
                            }`}
                          >
                            {p.label}
                          </button>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scene */}
          <div className="order-2 flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
<SectionHeader label="Scene" open={openSections.scene} onToggle={() => toggleSection("scene")} />

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.scene ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Background</label>
                    <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
                      {["solid", "gradient", "custom"].map((t) => (
                        <button
                          key={t}
                          onClick={() => {
  if (t === "gradient" && bgType !== "gradient" && !hasSeededGradientRef.current) {
    hasSeededGradientRef.current = true;
    setGradientStops((prev) => {
      const sorted = [...prev].sort((a, b) => a.position - b.position);
      const firstId = sorted[0]?.id;
      const lastId = sorted[sorted.length - 1]?.id;
      // Untouched default background → use the standard light-mode gradient in both themes.
      const startHex = bgHex === surfaceHex(darkMode) ? "FFFFFF" : bgHex;
      return prev.map((s) => {
        if (s.id === firstId) return { ...s, hex: startHex, opacity: bgOpacity };
        if (s.id === lastId) return { ...s, hex: darkenHex(startHex), opacity: bgOpacity };
        return s;
      });
    });
  }
  if (t === "custom" && !customBgImageUrl) {
    handleImagePresetChange(IMAGE_PRESETS[0].value);
  }
  setBgType(t);
}}
                          className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 capitalize transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            bgType === t ? SEG_ON : SEG_OFF
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

{bgType === "solid" && (
  <div ref={colorPickerRef} className="relative">
    <ColorOpacityField
      hex={bgHex}
      opacity={bgOpacity}
      onHexChange={setBgHex}
      onOpacityChange={setBgOpacity}
      onSwatchClick={() => handleSwatchClick("background")}
      makePercentDrag={makePercentDrag}
    />
  </div>
)}

                    {bgType === "custom" && (
                      <div className="flex flex-col gap-3 w-full">

                                                {customBgImageUrl ? (
                          <Tooltip label="Replace image" className="w-full">
                          <div
                            onClick={() => customImageInputRef.current?.click()}
className="w-full h-[66px] flex items-center justify-between py-2 pl-2 pr-1 gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl cursor-pointer"
                          >
                            <div className="flex items-center gap-2 h-12 min-w-0">
                              <div
                                className="w-12 h-12 rounded-lg shrink-0 bg-cover bg-center bg-[#EDEDED]"
                                style={customImageThumb ? { backgroundImage: `url(${customImageThumb})` } : undefined}
                              />
<span className="text-[13px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] truncate">
                                {customImageLabel}
                              </span>
                            </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                              <Tooltip label="Crop image" placement="bottom">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCustomCropModal();
                                  }}
                                  className="group flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                  <Crop size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                                </button>
                              </Tooltip>
                              <Tooltip label="Remove image" placement="bottom">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearCustomImage();
                                  }}
                                  className="group flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-colors"
                                >
                                  <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                          </Tooltip>
                        ) : (
                          <button
                            onClick={() => customImageInputRef.current?.click()}
className="w-full h-[66px] bg-white dark:bg-[#1F1F1F] border border-dashed border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-[10px] flex flex-col items-center justify-center gap-1 hover:bg-[#EAEAEA] dark:hover:bg-[#333333] transition-colors"
                          >
                            <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                            <span className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">Click or drag & drop to upload</span>
                          </button>
                        )}
                        <input
                          ref={customImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCustomImageUpload}
                          className="hidden"
                        />

                        <div className="flex flex-col gap-2 w-full">
                          <label className="text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Presets</label>
                          <ImagePresetDropdown
  value={customImagePreset}
  options={IMAGE_PRESETS}
  onChange={handleImagePresetChange}
  dropUp
/>
                        </div>
                      </div>
                    )}

{bgType === "gradient" && (
  <div ref={gradientTriggerRef} data-gradient-picker-trigger className="w-full">
    <ColorOpacityField
      hex=""
      opacity={gradientOpacity}
      labelText="Gradient"
      swatchFill={gradientCss}
      active={gradientPickerOpen}
      onHexChange={() => {}}
      onOpacityChange={setGradientOpacity}
      onSwatchClick={() => setGradientPickerOpen((v) => !v)}
      makePercentDrag={makePercentDrag}
    />
  </div>
)}

                    {gradientPickerOpen && (
                      <GradientPicker
                        anchorRef={gradientTriggerRef}
                        toolbarRef={toolbarRef}
                        containerRef={gradientPopupRef}
                        gradientCss={gradientCss}
                        gradientType={gradientType}
                        onGradientTypeChange={setGradientType}
                        gradientStops={gradientStops}
                        selectedStopId={selectedStopId}
                        onSelectStop={setSelectedStopId}
                        onStopPositionChange={handleStopPositionChange}
                        onStopHexChange={handleStopHexChange}
                        onStopOpacityChange={handleStopOpacityChange}
                        onSwatchClick={handleSwatchClick}
                        onAddStop={handleAddStop}
                        onRemoveStop={handleRemoveStop}
                        onFlip={handleFlipGradient}
                        onReset={handleRotateGradient}
                        makePercentDrag={makePercentDrag}
                        onClose={() => setGradientPickerOpen(false)}
                      />
                    )}

                    {colorPickerOpen && (
                      <ColorPicker
                        anchorRef={colorPickerAnchorRef}
                        toolbarRef={colorPickerAnchorRef}
                        hex={pickerHex}
                        opacity={pickerOpacity}
                        onChange={handlePickerColorChange}
                        savedColors={savedColors}
                        onSaveColor={(c) => setSavedColors((prev) => (prev.includes(c) ? prev : [...prev, c]))}
                        onClose={() => setColorPickerOpen(false)}
                      />
                    )}
                  </div>

                        {bgType === "gradient" && (
                    <div className="flex flex-col gap-2 w-full">
                      <label className="text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Presets</label>
                      <GradientPresetDropdown
  value={gradientPreset}
  options={GRADIENT_PRESETS}
  onChange={handleGradientPresetChange}
  dropUp
/>
                    </div>
                  )}

                  {bgType === "gradient" && (
                    <Scrubber label="Grain" value={grainAmount} onChange={setGrainAmount} />
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Environment</label>
                    <ToolbarDropdown value={environment} options={ENVIRONMENT_OPTIONS} onChange={setEnvironment} dropUp />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="order-5 flex flex-col p-4">
<SectionHeader label="Text" open={openSections.text} onToggle={() => toggleSection("text")} />

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.text ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-1">
                  {modeTexts.map((t) => {
                    const active = t.id === selectedTextId || modeTexts.length === 1;
                    const hidden = t.visible === false;
                    return (
                      <div
                        key={t.id}
                        data-text-row
                        draggable
                        onDragStart={(e) => {
                          textDragRef.current = t.id;
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(t.id));
                          setTimeout(() => setDraggingTextId(t.id), 0); // deferred so the drag ghost stays opaque
                        }}
                        onDragOver={(e) => {
                          if (textDragRef.current == null) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (textDragRef.current === t.id) return setTextDrop(null);
                          const r = e.currentTarget.getBoundingClientRect();
                          const pos = e.clientY < r.top + r.height / 2 ? "before" : "after";
                          setTextDrop((p) => (p && p.id === t.id && p.pos === pos ? p : { id: t.id, pos }));
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (textDragRef.current != null && textDrop) moveTextLayer(textDragRef.current, textDrop.id, textDrop.pos);
                          endTextDrag();
                        }}
                        onDragEnd={endTextDrag}
                        className={`group fx-enter relative flex items-center h-8 pl-2 pr-1 gap-1 rounded-lg transition-[background-color,opacity] duration-100 ease-in-out ${
                          draggingTextId === t.id ? "opacity-40" : ""
                        } ${
                          active
                            ? "bg-[#EDEDED] dark:bg-[#242424]"
                            : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                        }`}
                      >
                        {textDrop?.id === t.id && (
                          <div
                            aria-hidden
                            className={`absolute left-0 right-0 h-0.5 bg-[#FF47BC] pointer-events-none z-10 ${
                              textDrop.pos === "before" ? "-top-[3px]" : "-bottom-[3px]"
                            }`}
                          >
                            <span className="absolute -left-0.5 -top-[3px] w-2 h-2 rounded-full bg-[#FAF9FA] dark:bg-[#171717] border-2 border-[#FF47BC]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleTextRow(t.id)}
                          className={`flex-1 min-w-0 h-full text-left truncate text-[12px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
                            active
                              ? "text-[#3A3A3A] dark:text-[#FAF9FA]"
                              : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                          } ${hidden ? "opacity-50" : ""}`}
                        >
                          {textLabel(t)}
                        </button>
                        <Tooltip label={hidden ? "Show text" : "Hide text"} placement="bottom" className="shrink-0">
                          <button
                            type="button"
                            aria-label={hidden ? "Show text" : "Hide text"}
                            onClick={() => updateTextById(t.id, { visible: hidden })}
                            className={`flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
                              active ? "opacity-100" : "opacity-0"
                            }`}
                          >
                            {hidden ? (
                              <EyeSlash size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                            ) : (
                              <Eye size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                            )}
                          </button>
                        </Tooltip>
                        <Tooltip label="Delete text" placement="bottom" className="shrink-0 ml-1">
                          <button
                            type="button"
                            aria-label="Delete text"
                            onClick={() => deleteTextLayer(t.id)}
                            className={`group/x flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
                              active ? "opacity-100" : "opacity-0"
                            }`}
                          >
                            <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover/x:text-[#F04438] transition-colors" />
                          </button>
                        </Tooltip>
                      </div>
                    );
                  })}
<button
  ref={addTextBtnRef}
  onClick={addTextLayer}
  className="w-full h-8 flex items-center justify-center gap-2 pl-2 pr-2.5 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]"
>
  <Plus size={14} weight="regular" className="shrink-0" /> Add text
</button>
                </div>
              </div>
            </div>
          </div>
          </FadeScrollerY>
        </div>
      </div>

            {distMenu && (
        <div
          data-dist-menu
          role="menu"
          style={{ position: "fixed", right: distMenu.right, top: distMenu.top }}
          className="pop-enter w-max p-2 flex flex-col gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
        >
          {[
            { axis: "v", label: "Distribute vertical spacing", keys: [ALT, "⇧", "V"], Icon: Rows },
            { axis: "h", label: "Distribute horizontal spacing", keys: [ALT, "⇧", "H"], Icon: Columns },
          ].map(({ axis, label, keys, Icon }) => (
            <button
              key={axis}
              type="button"
              disabled={selectedIds.length < 3}
              onClick={() => {
                distributeSelected(axis);
                setDistMenu(null);
              }}
              className="flex items-center justify-between w-full h-8 pl-2 pr-2 gap-4 rounded-lg text-[12px] font-medium tracking-[-0.005em] whitespace-nowrap text-[#3A3A3A] dark:text-[#FAF9FA] enabled:hover:bg-[#F2F2F2] dark:enabled:hover:bg-[#1F1F1F] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <Icon size={14} weight="regular" className="shrink-0" />
                {label}
              </span>
              <KeyCombo keys={keys} />
            </button>
          ))}
        </div>
      )}

      {projectMenu && (() => {
        const p = savedProjects.find((x) => x.id === projectMenu.id);
        if (!p) return null;
        const itemClass =
          "flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100";
        const run = (fn) => () => {
          setProjectMenu(null);
          fn();
        };
        return (
          <div
            ref={projectMenuRef}
            role="menu"
            style={{ position: "fixed", left: projectMenu.left, top: projectMenu.top, bottom: projectMenu.bottom }}
            className={`${projectMenu.bottom !== undefined ? "pop-enter-up" : "pop-enter"} w-[180px] p-2 flex flex-col items-start bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]`}
          >
            <div className="flex flex-col gap-1 w-full">
              <button type="button" className={itemClass} onClick={run(() => handleOpenProjectInNewTab(p))}>Open in new tab</button>
              <button type="button" className={itemClass} onClick={run(() => handleCopyProjectLink(p))}>Copy link</button>
            </div>
            <div className="my-1 h-px w-full bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />
            <div className="flex flex-col gap-1 w-full">
              <button type="button" className={itemClass} onClick={run(() => handleDuplicateProject(p))}>Duplicate</button>
              <button type="button" className={itemClass} onClick={run(() => startRenameProject(p))}>Rename</button>
            </div>
            <div className="my-1 h-px w-full bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />
            <div className="flex flex-col gap-1 w-full">
              <button
                type="button"
                onClick={run(() => handleDeleteProject(p.id))}
                                className="flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438] transition-colors duration-100"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })()}

            {textPopupOpen && textItem && (
        <TextPopup
          key={textItem.id}
          popupRef={textPopupRef}
          anchorRef={addTextBtnRef}
          toolbarRef={toolbarRef}
          value={textItem}
          onChange={setTextItem}
          onClose={() => {
            setTextPopupOpen(false);
            setColorPickerOpen(false);
            setSelectedTextId(null);
          }}
          onSwatchClick={handleSwatchClick}
          makePercentDrag={makePercentDrag}
        />
      )}

      {openEffect && effectPopupPos && (
  <div
    ref={effectPopupRef}
    style={{ position: "fixed", top: effectPopupPos.top, right: effectPopupPos.right }}
    className="panel-enter w-[240px] px-3 pb-3 flex flex-col gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
  >
    <div className="-mx-3 mb-1 flex items-center justify-between h-11 pl-4 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
      <span className="text-[14px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">Effect</span>
      <button
        type="button"
        onClick={closeEffectPopup}
        aria-label="Close"
        className="group flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
      </button>
    </div>
    <PopupDropdown
      value={openEffect.type}
      options={EFFECT_TYPE_OPTIONS}
      onChange={(t) => changeEffectType(openEffect.id, t)}
    />
    <div className={`flex flex-col gap-2 transition-opacity duration-200 ${openEffect.visible ? "opacity-100" : "opacity-40"}`}>
      {openEffect.type === "dropShadow" && (
        <>
          <Scrubber label="X" value={openEffect.x} min={-100} max={100} onChange={(x) => updateEffect(openEffect.id, { x })} />
          <Scrubber label="Y" value={openEffect.y} min={-100} max={100} onChange={(y) => updateEffect(openEffect.id, { y })} />
          <Scrubber label="Blur" value={openEffect.blur} min={0} max={200} onChange={(blur) => updateEffect(openEffect.id, { blur })} />
          <Scrubber label="Spread" value={openEffect.spread} min={-50} max={50} onChange={(spread) => updateEffect(openEffect.id, { spread })} />
          <ColorOpacityField
            hex={openEffect.hex}
            opacity={openEffect.opacity}
            onHexChange={(hex) => updateEffect(openEffect.id, { hex })}
            onOpacityChange={(opacity) => updateEffect(openEffect.id, { opacity })}
            onSwatchClick={() => handleSwatchClick(`fx-${openEffect.id}`)}
            makePercentDrag={makePercentDrag}
          />
        </>
      )}
      {openEffect.type === "layerBlur" && (
        <Scrubber label="Blur" value={openEffect.blur} min={0} max={100} onChange={(blur) => updateEffect(openEffect.id, { blur })} />
      )}
      {openEffect.type === "noise" && (
        <>
          <Scrubber label="Amount" value={openEffect.amount} min={0} max={100} onChange={(amount) => updateEffect(openEffect.id, { amount })} />
          <Scrubber label="Size" value={openEffect.size} min={1} max={20} onChange={(size) => updateEffect(openEffect.id, { size })} />
        </>
      )}
    </div>
  </div>
)}

      {cropModalOpen && uploadedMediaThumb && uploadedImageDims && (
        <CropModal
          imageUrl={uploadedMediaThumb}
          imageWidth={uploadedImageDims.width}
          imageHeight={uploadedImageDims.height}
          onClose={() => setCropModalOpen(false)}
          onApply={(rect) => {
            const crop = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            if (uploadedFileRef.current) {
              sceneRef.current?.uploadFile(uploadedFileRef.current, crop);
            }
            cropImageToDataUrl(uploadedMediaThumb, rect)
              .then((url) => {
                setUploadedCrop(crop);
                setFrameCropUrl(url);
              })
              .catch((err) => console.error("Failed to crop frame image:", err));
            setCropModalOpen(false);
          }}
        />
      )}

            {shotCrop && (
        <CropModal
          imageUrl={shotCrop.url}
          imageWidth={shotCrop.width}
          imageHeight={shotCrop.height}
          onClose={() => setShotCrop(null)}
          onApply={(rect) => {
            vidCropShotImg(shotCrop.id, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
            setShotCrop(null);
          }}
        />
      )}

      {frameCropTarget?.img && (
        <CropModal
          imageUrl={frameCropTarget.img.url}
          imageWidth={frameCropTarget.img.nw}
          imageHeight={frameCropTarget.img.nh}
          onClose={() => setFrameCropId(null)}
          onApply={applyFrameCrop}
        />
      )}

      {customCropModalOpen && customBgImageUrl && customImageDims && (
        <CropModal
          imageUrl={customBgImageUrl}
          imageWidth={customImageDims.width}
          imageHeight={customImageDims.height}
          onClose={() => setCustomCropModalOpen(false)}
          onApply={async (rect) => {
            try {
              const croppedUrl = await cropImageToDataUrl(customBgImageUrl, rect);
              setCustomImagePreset("none"); // it's now a custom crop, no longer "the" preset image
              setCustomBgImageUrl(croppedUrl);
              setCustomImageThumb(croppedUrl);
              setCustomImageDims({ width: rect.width, height: rect.height });
            } catch (err) {
              console.error("Failed to crop background image:", err);
            }
            setCustomCropModalOpen(false);
          }}
        />
      )}
            {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
                    {backPickerOpen && (
        <GradientPicker
          anchorRef={backTriggerRef}
          toolbarRef={toolbarRef}
          containerRef={backPopupRef}
          gradientCss={backGradientCss}
          gradientType={backGradientType}
          onGradientTypeChange={setBackGradientType}
          gradientStops={backStops}
          selectedStopId={backSelectedStopId}
          onSelectStop={setBackSelectedStopId}
          onStopPositionChange={handleBackStopPosition}
          onStopHexChange={handleBackStopHex}
          onStopOpacityChange={handleBackStopOpacity}
          onSwatchClick={handleSwatchClick}
          onAddStop={handleBackAddStop}
          onRemoveStop={handleBackRemoveStop}
          onFlip={handleBackFlip}
          onReset={handleBackRotate}
          makePercentDrag={makePercentDrag}
          onClose={() => setBackPickerOpen(false)}
        />
      )}

      {tourOpen && (
        <AppTour
          kind={tourKind}
          onClose={() => {
            setTourOpen(false);
            try {
              localStorage.setItem(tourKind === "video" ? "bezel:video-tour-seen" : "bezel:tour-seen", "1");
            } catch {}
          }}
        />
      )}

      {exportToast && (
        <div className="pop-enter-up fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 h-8 px-3 rounded-2xl bg-[#3A3A3A] dark:bg-[#FAF9FA] text-[13px] font-medium text-[#FAF9FA] dark:text-[#171717] shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
          <Check size={14} weight="regular" /> {exportToast}
        </div>
      )}
    </div>
  );
}