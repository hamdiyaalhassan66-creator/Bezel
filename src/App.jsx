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
import { SizeLockRow } from "./SizeFields.jsx";
import { PbHandles } from "./components/PbHandles.jsx";
import { pbPts, pbAngle, pbRotate } from "./lib/progressiveBlur.js";
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
import { GRAD_FX_TYPES, makeGradFx, applyGradientFx, HALFTONE_PATTERNS, HALFTONE_COLOR_MODES, WARP_MODES, DITHER_STYLES, LENS_MODES, LENS_QUALITY, PIXEL_SHAPES, DISSOLVE_MODES, HATCH_PATTERNS, FX_DEFAULTS, ROLL_DIRECTIONS, EDGE_MODES, REFRACT_PATTERNS, WRAP_MODES, BANKNOTE_PLACEMENTS, BANKNOTE_ACCENT_MODES, GRAIN_TYPES, GRAIN_BLENDS, paintGrainTexture } from "./lib/gradientFilters.js";
import { applyProgressiveBlur } from "./lib/progressiveBlur.js";
import { paintChromatic } from "./lib/chromatic.js";
import { applyFishEye, paintGlassBands, paintVignette } from "./lib/canvasFx.js";
import { SHARED_FX, ALL_EFFECT_OPTIONS, makeFx, isShadowFx } from "./lib/sharedEffects.js";
import { EffectControls } from "./components/EffectControls.jsx";
import {
  CAM_KEYS,
  vidEaseSpec, vidEaseFn, VID_FPS, vidClamp, sampleShots,
} from "./lib/videoMath.js";
import {
  shotAnimPose, shotForImgAt, sampleDeviceAnim,
} from "./lib/shotAnim.js";
import {
  bgProgress,
  bgAnimOf, bgKey, bgFallbackSnap, bgTmp, paintBgSnap, drawBgTransition,
} from "./lib/bgAnim.js";
import {
  FRAME_DEFAULT_SIZE, makeFrame, cornersOf, frameRect, cloneFrame,
} from "./lib/frameModel.js";
import { framePoseMap, sampleShotFrames, changedCamProps } from "./lib/frameKeys.js";
import { frameDim } from "./lib/frameFade.js";
import { planeBackFacing, sortByDepth, projectPlane, drawPlane3D, planeGrid } from "./lib/plane3d.js";
import { mixHex, txtRanks, txtUnitStates, sampleTextAnim } from "./lib/textAnim.js";
import { DEFAULT_TEXT, textLabel, textName, prepText } from "./lib/textUtils.js";
import {
  DEVICE_CATEGORIES, cropImageToDataUrl, surfaceHex, formatEditedAt, useFileDrop, seekVideo, loadVideoMeta,
} from "./lib/appUtils.js";
import { loadProjects, syncProjects, packProject, hydrateProject } from "./lib/projectStore.js";
import {
  chromeKey,
  sampleChromeColors,
  chromeOps,
  paintSocial,
} from "./components/SocialOverlay.jsx";
import { SOCIAL_FULL_WIDTH, SocialField, ImageUploadField } from "./components/SocialFields.jsx";
import {
  SEG_ON, SEG_OFF, SearchField, Scrubber, ToggleRow, FinishDropdown, GradientPresetDropdown,
  ImagePresetDropdown, GradientCanvasHandles, ColorOpacityField, PopupDropdown, AppearanceHeader,
  CornerRadiusFields, FadeScroller, FadeScrollerY, SectionHeader, Skeleton,
} from "./components/controls.jsx";
import { TextOverlay, TextEditor } from "./components/TextOverlay.jsx";
import { TextPopup } from "./components/TextPopup.jsx";
import { ProjectsPage } from "./components/ProjectsPage.jsx";
import { ProjectCard } from "./components/ProjectCard.jsx";
import { useDismissable, CTX_ITEM } from "./components/timelineParts.jsx";
import { FrameTemplateThumb, templateBackground, VideoTemplateCard, FrameVideoTemplateCard } from "./components/TemplateCards.jsx";
import { SocialControls } from "./components/SocialControls.jsx";
import { FrameLayer } from "./components/FrameLayer.jsx";
import { VideoTimeline } from "./components/VideoTimeline.jsx";
import { AppStyles } from "./components/AppStyles.jsx";
import {
  CUSTOM_FINISH,
  WATCH_STRAPS,
  DEVICE_FINISHES,
  DEFAULT_FINISHES,
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
  THEME_OPTIONS,
  BROWSER_OPTIONS,
  SAFARI_TABS_OPTIONS,
  ENVIRONMENT_OPTIONS,
} from "./constants/uiOptions.js";
import { VIDEO_TEMPLATES, FRAME_VIDEO_TEMPLATES, vtBgSnap, vtBgCss } from "./constants/videoTemplates.js";
import { PARAM_ALL, PARAM_CATEGORIES, instantiateParam, defaultParams } from "./constants/paramTemplates.js";
import { FX_ICON } from "./constants/effectIcons.js";
import { TemplateParams } from "./components/TemplateParams.jsx";
import { AnimCategoryList } from "./components/AnimCategoryList.jsx";
import { ALIGN_ACTIONS, ALIGN_KEYS, } from "./constants/canvasControls.js";
import { useAltDuplicateBadge } from "./hooks/useAltDuplicateBadge.js";
import { useSelectOnFocus } from "./hooks/useSelectOnFocus.js";
import { useBlockStrayFileDrops } from "./hooks/useBlockStrayFileDrops.js";
import { FrameAppearance } from "./panels/FrameAppearance.jsx";
import { FrameScreenInterface } from "./panels/FrameScreenInterface.jsx";
import { DevicePanel } from "./panels/DevicePanel.jsx";
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
  FolderOpen,
  CardsThree,
  Info,
  SidebarSimple,
  Check,
  Crop,
  TrashSimple,
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
  Rows,
  Columns,
  CircleNotch,
  Play,
  Copy,
  CircleHalf,
  Drop,
  Sparkle, Grains, DotsNine, Waves, Checkerboard, Aperture, GridFour, LineSegments, ChartBar, Asterisk, SquaresFour, Diamond, Lightning, Money,
  ArrowSquareOut,
  LinkSimple,
  PushPin,
  PencilSimple,
} from "@phosphor-icons/react";

// Frame-tab effects: labels come from EFFECT_TYPE_OPTIONS, so they always match the type dropdown
const FRAME_FX = ALL_EFFECT_OPTIONS.map((o) => ({ type: o.value, label: o.label, Icon: FX_ICON[o.value] ?? Drop }));
const FRAME_FX_OPTIONS = FRAME_FX.map((x) => ({ value: x.type, label: x.label, Icon: x.Icon }));
// Mockup tab: only the shared effects (shadow, blur and noise are frame-only)
const MOCKUP_FX = FRAME_FX.filter((x) => SHARED_FX[x.type] || x.type === "layerBlur");
const MOCKUP_FX_OPTIONS = MOCKUP_FX.map((x) => ({ value: x.type, label: x.label, Icon: x.Icon }));
// Gradient background filters
const GRAD_FX_ICON = {
  grain: Grains, halftone: DotsNine, warp: Waves, dither: Checkerboard, lens: Aperture,
  pixelate: GridFour, hatching: LineSegments, pistons: ChartBar, asciiwave: Asterisk, collapsinggrid: SquaresFour, patternrefraction: Diamond, glitch: Lightning, banknote: Money,
};
const GRAD_FX_LIST = GRAD_FX_TYPES.map((o) => ({ type: o.value, label: o.label, Icon: GRAD_FX_ICON[o.value] ?? Drop }));
const GRAD_FX_OPTIONS = GRAD_FX_LIST.map((x) => ({ value: x.type, label: x.label, Icon: x.Icon }));
// color-picker targets for gradient filter colors: [hex key, opacity key]
const GFX_COLOR = {
  "gfx-mono": ["monoHex"], "gfx-bg": ["bgHex", "bgOpacity"], "gfx-fg": ["fgHex", "fgOpacity"],
  "gfx-wave": ["waveHex"], "gfx-wavebg": ["waveBgHex"],
  "gfx-ink": ["inkHex", "inkOpacity"], "gfx-paper": ["paperHex", "paperOpacity"], "gfx-accent": ["accentHex", "accentOpacity"],
};

const NAV = (() => {
  try { return JSON.parse(localStorage.getItem("bezel:nav")) ?? {}; } catch { return {}; }
})();

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PROJECTS_PATH = `${BASE}/projects`;
const isProjectsPath = () => window.location.pathname.replace(/\/+$/, "") === PROJECTS_PATH;

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
  // Splash: stays up until fonts and the 3D model are ready (10s safety timeout)
  const [appReady, setAppReady] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  useEffect(() => {
    let dead = false, fontsOk = false, timer;
    const started = performance.now();
    document.fonts.ready.then(() => { fontsOk = true; });
    const check = () => {
      if (dead) return;
      const sceneOk = !!sceneRef.current?.isReady?.(deviceType);
      if ((sceneOk && fontsOk) || performance.now() - started > 10000) setAppReady(true);
      else timer = setTimeout(check, 100);
    };
    check();
    return () => { dead = true; clearTimeout(timer); };
  }, []);
  useEffect(() => {
    if (!appReady) return;
    const t = setTimeout(() => setSplashGone(true), 350); // after the fade-out
    return () => clearTimeout(t);
  }, [appReady]);

  useEffect(() => {
    if (!appReady) return; // the tour starts once the splash is gone
    try {
      if (!localStorage.getItem("bezel:tour-seen")) startTour();
    } catch {}
  }, [appReady]);

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

  useAltDuplicateBadge();

  useSelectOnFocus();

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
  const [sidebarOpen, setSidebarOpen] = useState(NAV.sidebarOpen ?? true);
  const [toolbarMode, setToolbarMode] = useState(NAV.toolbarMode ?? "mockup"); // "mockup" | "frame"
  const [animTab, setAnimTab] = useState(!!NAV.animTab);
  const tabKey = animTab ? "animation" : toolbarMode;
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
    markFrameEdit();
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
    markFrameEdit();
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
    markFrameEdit();
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
  const assetPoolRef = useRef([]); // every uploaded image, in order, so Count can grow back without losing any
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
    if (animTab) {
      const pool = animPool();
      const slot = animSlotRef.current;
      animSlotRef.current = null;
      const at = slot != null && slot < pool.length ? slot : pool.findIndex((a) => !a); // clicked row, else first empty one
      if (at < 0) return;
      pool[at] = img;
      assetPoolRef.current = pool;
      setAnimSel(at);
      setTimeout(() => reapplyAnimRef.current?.(), 0);
      return;
    }
    const box = frameSizeRef.current;
    const prev = framesLatestRef.current;
    const short = box ? Math.min(box.w, box.h) : 1;

    const scaleOf = (f) => f.s ?? (box ? frameRect(f, box).width / (f.w * short) : null);
    const hasTargets = prev.some((f) => ids.includes(f.id));
    if (hasTargets) {
      const gone = prev.filter((f) => ids.includes(f.id)).map((f) => f.img?.url); // replaced images leave the pool
      assetPoolRef.current = assetPoolRef.current.filter((a) => !gone.includes(a.url));
    }
    assetPoolRef.current = [...assetPoolRef.current, img];
    if (animTab) setTimeout(() => reapplyAnimRef.current?.(), 0); // new image: rebuild the planes
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

  setMediaLoading((n) => n + 1);
  const done = () => setMediaLoading((n) => Math.max(0, n - 1));
  if (file.type.startsWith("video/")) {
    loadVideoMeta(file)
      .then((m) => m && place(URL.createObjectURL(m.poster), m.w, m.h, { url: m.url, duration: m.duration }))
      .catch((err) => console.error("Video load failed:", err))
      .finally(done);
    return;
  }
  const url = URL.createObjectURL(file);
  const probe = new Image();
  probe.onload = () => {
    place(url, probe.naturalWidth, probe.naturalHeight);
    done();
  };
  probe.onerror = done;
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
      const crop = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      if (animTab) {
        const idx = framesLatestRef.current.findIndex((x) => x.id === f.id);
        assetPoolRef.current = animPool().map((a, i) => (i === idx && a ? { ...a, crop, cropUrl } : a));
      }
      setFrames((prev) =>
        prev.map((fr) => {
          if (fr.id !== f.id) return fr;
          const short = box ? Math.min(box.w, box.h) : 1;
          const s = fr.s == null || !box ? null : frameRect(fr, box).width / (rect.width * short); // keep on-screen width
          return { ...fr, img: { ...fr.img, crop, cropUrl }, ...(fr.social?.on ? {} : { w: rect.width, h: rect.height, s }) };
        })
      );
      if (animTab) setTimeout(() => reapplyAnimRef.current?.(), 0);
    } catch (err) {
      console.error("Failed to crop frame image:", err);
    }
  };

  const deleteFrames = (ids) => {
    if (!ids.length) return;
    const goneUrls = frames.filter((f) => ids.includes(f.id)).map((f) => f.img?.url).filter(Boolean);
    if (goneUrls.length) assetPoolRef.current = assetPoolRef.current.filter((a) => !goneUrls.includes(a.url));
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

  // Animation tab: assets live in the pool, planes just cycle through them
  // pool[i] = the image in slot i (or null), one slot per plane
  const animPool = () =>
    Array.from({ length: Math.max(framesLatestRef.current.length, assetPoolRef.current.length) }, (_, i) => assetPoolRef.current[i] ?? null);
  const removeAnimAsset = (i) => {
    assetPoolRef.current = animPool().map((a, j) => (j === i ? null : a));
    const id = framesLatestRef.current[i]?.id;
    const next = framesLatestRef.current.map((f) => (f.id === id ? { ...f, img: null } : f));
    framesLatestRef.current = next;
    setFrames(next);
    setTimeout(() => reapplyAnimRef.current?.(), 0);
  };
  const moveAnimAsset = (from, to, pos) => {
    const pool = animPool();
    const [m] = pool.splice(from, 1);
    const at = (to > from ? to - 1 : to) + (pos === "after" ? 1 : 0);
    pool.splice(at, 0, m);
    assetPoolRef.current = pool;
    setAnimSel(at);
    setTimeout(() => reapplyAnimRef.current?.(), 0);
  };
  const endAnimDrag = () => {
    animDragRef.current = null;
    setAnimDragFrom(null);
    setAnimDrop(null);
  };
    // Frame mode: rows are shown front-to-back, so the top row is the frame on top
  const moveFrameRow = (fromId, toId, pos) =>
    setFrames((prev) => {
      const disp = [...prev].reverse();
      const from = disp.findIndex((f) => f.id === fromId);
      if (from < 0 || fromId === toId) return prev;
      const [m] = disp.splice(from, 1);
      const to = disp.findIndex((f) => f.id === toId);
      if (to < 0) return prev;
      disp.splice(pos === "before" ? to : to + 1, 0, m);
      return disp.reverse();
    });
  const endFrameDrag = () => {
    dragIdRef.current = null;
    setDraggingId(null);
    setFrameDrop(null);
  };
  const renderFrameAssets = () => {
    const rows = [...frames].reverse();
    const n = frames.length;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between h-8">
          <span className="text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
            {n} {n === 1 ? "Asset" : "Assets"}
          </span>
          <button
            type="button"
            disabled={!frames.some((f) => f.img) && n <= 1}
            onClick={() => deleteFrames(frames.map((f) => f.id))}
            className="h-6 px-1.5 rounded-md text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-[#F04438]/10 hover:text-[#F04438] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#8C8C8C]"
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-col">
          {rows.map((f, i) => {
            const selected = selectedIds.includes(f.id);
            const thumb = f.img ? (f.img.cropUrl ?? f.img.url) : null;
            const select = (shift) => {
              setSelectedTextId(null);
              setSelectedIds((ids) => (shift ? (ids.includes(f.id) ? ids.filter((x) => x !== f.id) : [...ids, f.id]) : [f.id]));
            };
            return (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                draggable
                data-asset-row={`framerow-${f.id}`}
                onDragStart={(e) => {
                  dragIdRef.current = f.id;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(f.id));
                  setTimeout(() => setDraggingId(f.id), 0); // deferred so the drag ghost stays opaque
                }}
                onDragOver={(e) => {
                  if (dragIdRef.current == null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragIdRef.current === f.id) return setFrameDrop(null);
                  const r = e.currentTarget.getBoundingClientRect();
                  const pos = e.clientY < r.top + r.height / 2 ? "before" : "after";
                  setFrameDrop((p) => (p && p.id === f.id && p.pos === pos ? p : { id: f.id, pos }));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdRef.current != null && frameDrop) moveFrameRow(dragIdRef.current, frameDrop.id, frameDrop.pos);
                  endFrameDrag();
                }}
                onDragEnd={endFrameDrag}
                onClick={(e) => select(e.shiftKey)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select(e.shiftKey)}
                className={`group relative flex items-center h-11 pl-1 pr-1 gap-2 rounded-lg cursor-grab active:cursor-grabbing transition-[background-color,opacity] duration-100 ${
                  selected ? "bg-[#FF47BC]/10" : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                } ${draggingId === f.id ? "opacity-40" : ""} ${draggingId !== null ? "[&>*]:pointer-events-none" : ""}`}
              >
                {frameDrop?.id === f.id && (
                  <div
                    aria-hidden
                    className={`absolute left-0 right-0 h-0.5 bg-[#FF47BC] pointer-events-none z-10 ${
                      frameDrop.pos === "before" ? "-top-px" : "-bottom-px"
                    }`}
                  >
                    <span className="absolute -left-0.5 -top-[3px] w-2 h-2 rounded-full bg-[#FAF9FA] dark:bg-[#171717] border-2 border-[#FF47BC]" />
                  </div>
                )}
                <span className="w-4 shrink-0 text-center text-[12px] font-medium tabular-nums text-[#8C8C8C] dark:text-[#9A9A9A]">{i + 1}</span>
                <div
                  aria-label={f.img ? "Replace image" : "Add image"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIds([f.id]);
                    pickFrameFile([f.id]); // adds into an empty frame, or replaces this frame's image
                  }}
                  className="w-8 h-8 rounded-md shrink-0 bg-cover bg-center bg-[#EDEDED] dark:bg-[#292929] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 cursor-pointer"
                  style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                />
                <span
                  className={`flex-1 min-w-0 truncate text-[13px] font-medium tracking-[-0.005em] transition-colors ${
                    selected ? "text-[#3A3A3A] dark:text-[#FAF9FA]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                  }`}
                >
                  {f.img?.label ?? "Empty frame"}
                </span>
                <Tooltip label="Crop" placement="bottom" className="shrink-0">
                  <button
                    type="button"
                    aria-label="Crop"
                    disabled={!f.img || !!f.img.video}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFrameCropId(f.id);
                    }}
                    className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Crop size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                  </button>
                </Tooltip>
                <Tooltip label="Delete frame" placement="bottom" className="shrink-0">
                  <button
                    type="button"
                    aria-label="Delete frame"
                    disabled={n === 1 && !f.img}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFrames([f.id]);
                    }}
                    className="group/x flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover/x:text-[#F04438] transition-colors" />
                  </button>
                </Tooltip>
              </div>
            );
          })}
          {mediaLoading > 0 && (
            <div className="flex items-center h-11 pl-1 pr-1 gap-2">
              <Skeleton className="w-4 h-3 rounded" />
              <Skeleton className="w-8 h-8 rounded-md shrink-0" />
              <Skeleton className="flex-1 h-3 rounded" />
            </div>
          )}
        </div>
      </div>
    );
  };
  const renderAnimAssets = () => {
    const n = frames.length;
    const pool = animPool().slice(0, n);
    const filled = pool.some(Boolean);
    const pickSlot = (i) => {
      setAnimSel(i);
      animSlotRef.current = i;
      pickFrameFile(null);
    };
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between h-8">
          <span className="text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
            {n} {n === 1 ? "Asset" : "Assets"}
          </span>
          <button
            type="button"
            disabled={!filled}
            onClick={clearAnimAssets}
            className="h-6 px-1.5 rounded-md text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-[#F04438]/10 hover:text-[#F04438] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#8C8C8C]"
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-col">
          {pool.map((img, i) => {
            const fr = frames[i];
            const selected = animSel === i;
            const hidden = !!fr?.hidden;
            const thumb = img ? (img.cropUrl ?? img.url) : null;
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                draggable
                data-asset-row={`animrow-${i}`}
                onDragStart={(e) => {
                  animDragRef.current = i;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                  setTimeout(() => setAnimDragFrom(i), 0); // deferred so the drag ghost stays opaque
                }}
                onDragOver={(e) => {
                  if (animDragRef.current == null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (animDragRef.current === i) return setAnimDrop(null);
                  const r = e.currentTarget.getBoundingClientRect();
                  const pos = e.clientY < r.top + r.height / 2 ? "before" : "after";
                  setAnimDrop((p) => (p && p.idx === i && p.pos === pos ? p : { idx: i, pos }));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (animDragRef.current != null && animDrop) moveAnimAsset(animDragRef.current, animDrop.idx, animDrop.pos);
                  endAnimDrag();
                }}
                onDragEnd={endAnimDrag}
                onClick={() => setAnimSel(i)}
                onPointerEnter={() => setAnimHover(i)}
                onPointerLeave={() => setAnimHover(null)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAnimSel(i)}
                className={`group relative flex items-center h-11 pl-1 pr-1 gap-2 rounded-lg cursor-grab active:cursor-grabbing transition-[background-color,opacity] duration-100 ${
                  selected
                    ? "bg-[#FF47BC]/10"
                    : animHover === i
                    ? "bg-[#F2F2F2] dark:bg-[#1F1F1F]"
                    : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                } ${animDragFrom === i ? "opacity-40" : ""} ${animDragFrom !== null ? "[&>*]:pointer-events-none" : ""}`}
              >
                {animDrop?.idx === i && (
                  <div
                    aria-hidden
                    className={`absolute left-0 right-0 h-0.5 bg-[#FF47BC] pointer-events-none z-10 ${
                      animDrop.pos === "before" ? "-top-px" : "-bottom-px"
                    }`}
                  >
                    <span className="absolute -left-0.5 -top-[3px] w-2 h-2 rounded-full bg-[#FAF9FA] dark:bg-[#171717] border-2 border-[#FF47BC]" />
                  </div>
                )}
                <span className="w-4 shrink-0 text-center text-[12px] font-medium tabular-nums text-[#8C8C8C] dark:text-[#9A9A9A]">{i + 1}</span>
                <div
                  aria-label={img ? "Replace image" : "Add image"}
                  onClick={(e) => {
                    e.stopPropagation();
                    pickSlot(i); // fills an empty slot, or replaces this slot's image
                  }}
                  className={`w-8 h-8 rounded-md shrink-0 bg-cover bg-center bg-[#EDEDED] dark:bg-[#292929] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 cursor-pointer ${hidden ? "opacity-40" : ""}`}
                  style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                />
                <span
                  className={`flex-1 min-w-0 truncate text-[13px] font-medium tracking-[-0.005em] transition-colors ${
                    selected || animHover === i ? "text-[#3A3A3A] dark:text-[#FAF9FA]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                  } ${hidden ? "opacity-50" : ""}`}
                >
                  {img?.label ?? "Empty slot"}
                </span>
                <Tooltip label="Crop" placement="bottom" className="shrink-0">
                  <button
                    type="button"
                    aria-label="Crop"
                    disabled={!img || !!img.video || !fr}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFrameCropId(fr.id);
                    }}
                    className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Crop size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                  </button>
                </Tooltip>
                <Tooltip label={hidden ? "Show" : "Hide"} placement="bottom" className="shrink-0">
                  <button
                    type="button"
                    aria-label={hidden ? "Show" : "Hide"}
                    disabled={!img || !fr}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFrames((prev) => prev.map((x) => (x.id === fr.id ? { ...x, hidden: !x.hidden } : x)));
                    }}
                    className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {hidden ? (
                      <EyeSlash size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                    ) : (
                      <Eye size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                    )}
                  </button>
                </Tooltip>
                <Tooltip label="Remove" placement="bottom" className="shrink-0">
                  <button
                    type="button"
                    aria-label="Remove"
                    disabled={!img}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAnimAsset(i);
                    }}
                    className="group/x flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover/x:text-[#F04438] transition-colors" />
                  </button>
                </Tooltip>
              </div>
            );
          })}
          {mediaLoading > 0 && (
            <div className="flex items-center h-11 pl-1 pr-1 gap-2">
              <Skeleton className="w-4 h-3 rounded" />
              <Skeleton className="w-8 h-8 rounded-md shrink-0" />
              <Skeleton className="flex-1 h-3 rounded" />
            </div>
          )}
        </div>
      </div>
    );
  };
  const clearAnimAssets = () => {
    assetPoolRef.current = [];
    const next = framesLatestRef.current.map((f) => ({ ...f, img: null }));
    framesLatestRef.current = next;
    setFrames(next);
    setTimeout(() => reapplyAnimRef.current?.(), 0);
  };

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
  const [showSlots, setShowSlots] = useState(true); // list empty frames as "Empty slot" rows
  const [animSel, setAnimSel] = useState(null); // selected row in the Animation asset list
  const [animHover, setAnimHover] = useState(null); // hovered asset index (canvas or panel)
  const [animDragFrom, setAnimDragFrom] = useState(null);
  const [frameDrop, setFrameDrop] = useState(null); // Frame list drag line: { id, pos: "before" | "after" }
  const [animDrop, setAnimDrop] = useState(null); // { idx, pos: "before" | "after" }
  const animDragRef = useRef(null);
  const animSlotRef = useRef(null); // the row whose image block was clicked
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
    markFrameEdit();
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
    markFrameEdit();
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
const [mockupEffects, setMockupEffects] = useState([]);
// the popup, color picker and add/remove helpers work on whichever tab owns the effects
const fxList = toolbarMode === "mockup" ? mockupEffects : frameEffects;
const setFxList = toolbarMode === "mockup" ? setMockupEffects : setFrameEffects;
const openEffect = fxList.find((e) => e.id === openEffectId) ?? null;

// Adding, opening or deleting an effect must not move the sidebar: hold its scroll position while the row animates.
const keepSidebarScroll = () => {
  const el = toolbarRef.current?.querySelector(".custom-scroll");
  if (!el) return;
  const top = el.scrollTop;
  const until = performance.now() + 400;
  let raf;
  const stop = () => {
    cancelAnimationFrame(raf);
    el.removeEventListener("wheel", stop);
    el.removeEventListener("touchstart", stop);
  };
  const tick = () => {
    if (Math.abs(el.scrollTop - top) > 0.5) el.scrollTop = top;
    if (performance.now() < until) raf = requestAnimationFrame(tick);
    else stop();
  };
  el.addEventListener("wheel", stop, { passive: true }); // the user scrolling wins
  el.addEventListener("touchstart", stop, { passive: true });
  tick();
};

const closeEffectPopup = () => {
  setOpenEffectId(null);
  setEffectPopupPos(null);
  setColorPickerOpen(false);
};
const toggleEffectPopup = (id) => {
  keepSidebarScroll();
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
}, [openEffectId, openEffect?.type, openEffect?.mode, effectPopupPos === null]);

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
  closeEffectPopup();
}, [toolbarMode]);
useEffect(() => {
  closeEffectPopup();
}, [primaryFrame.id]);
  const [sidebarPanel, setSidebarPanel] = useState(NAV.sidebarPanel ?? "create"); // "create" | "templates" | "projects"
  const devicesDisabled = toolbarMode === "frame";

  // Animation tab = the Frame workspace driven by templates
  const [animCategory, setAnimCategory] = useState(null); // null = show the category list
  const wsStoreRef = useRef({}); // frames, assets and id counters, kept separately for Frame and Animation
  const selectTab = (key) => {
    clearTimeout(tplParamTimerRef.current); // a pending slider apply must not land on the other tab
    autoKeyMuteRef.current = performance.now() + 600; // the camera swap that follows is not a user edit
    clearTimeout(tplSmoothTimerRef.current);
    if (tabKey !== key) {
      flushPendingHistory(); // an edit still inside its 400ms window lands in the tab it was made in
      historiesRef.current[tabKey] = historyRef.current;
      historyRef.current = historiesRef.current[key] ?? { past: [], future: [], committed: null };
      historyRef.current.committed = historyKeyRef.current; // re-synced by the commit effect once the tab has swapped
    }
    const isFr = (k) => k === "frame" || k === "animation";
    if (tabKey !== key && isFr(tabKey)) {
      wsStoreRef.current[tabKey] = {
        frames: framesLatestRef.current,
        selectedIds: selectedIdsRef.current,
        pool: assetPoolRef.current,
        nextId: nextFrameIdRef.current,
        seen: vidFrameSeenRef.current,
      };
    }
    if (tabKey !== key && isFr(key)) {
      const w = wsStoreRef.current[key] ?? { frames: [makeFrame(1)], selectedIds: [1], pool: [], nextId: 2, seen: new Set() };
      framesLatestRef.current = w.frames;
      selectedIdsRef.current = w.selectedIds;
      assetPoolRef.current = w.pool;
      nextFrameIdRef.current = w.nextId;
      vidFrameSeenRef.current = w.seen;
      setFrames(w.frames);
      setSelectedIds(w.selectedIds);
    }
    if (key === "animation") {
      setAnimTab(true);
      setToolbarMode("frame");
      setImageOrVideo("video"); // animation needs the timeline
      setAnimCategory(null);
      setSidebarPanel("templates");
      setSidebarOpen(true);
    } else {
      setAnimTab(false);
      setToolbarMode(key);
    }
  };

// Devices panel isn't available in Frame mode, so move off it.
useEffect(() => {
  if (devicesDisabled && sidebarPanel === "create") setSidebarPanel("projects");
}, [devicesDisabled, sidebarPanel]);
const [savedProjects, setSavedProjects] = useState([]);
const liveProjects = savedProjects.filter((p) => !p.deletedAt); // trashed ones only show on the Projects page
const [projectsPageOpen, setProjectsPageOpen] = useState(isProjectsPath);
// the URL follows the page, and back / forward buttons move the page
useEffect(() => {
  const onPop = () => setProjectsPageOpen(isProjectsPath());
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}, []);
useEffect(() => {
  if (isProjectsPath() === projectsPageOpen) return;
  window.history.pushState(null, "", projectsPageOpen ? PROJECTS_PATH : `${BASE}/`);
}, [projectsPageOpen]);
const [folders, setFolders] = useState(() => {
  try { return JSON.parse(localStorage.getItem("bezel:folders")) ?? []; } catch { return []; }
}); // [{ id, name }]
useEffect(() => {
  try { localStorage.setItem("bezel:folders", JSON.stringify(folders)); } catch {}
}, [folders]);

const [projectsLoaded, setProjectsLoaded] = useState(false);
useEffect(() => {
  let dead = false;
  loadProjects()
    .then((list) => {
      if (dead) return;
      setSavedProjects((prev) => [...prev, ...list.filter((p) => !prev.some((x) => x.id === p.id))]);
      const open = NAV.projectId && list.find((x) => x.id === NAV.projectId);
      if (open) {
        openProject(open); // restores the project's own mode, camera, timeline, etc.
        if (isProjectsPath()) setProjectsPageOpen(true); // openProject closes it, so put it back
      }
    })
    .catch((err) => console.error("Loading projects failed:", err))
    .finally(() => !dead && setProjectsLoaded(true));
  return () => { dead = true; };
}, []);
// every save / rename / move / duplicate / delete goes through savedProjects, so one effect covers them all
useEffect(() => {
  if (projectsLoaded) syncProjects(savedProjects).catch((err) => console.error("Saving projects failed:", err));
}, [savedProjects, projectsLoaded]);
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
    left: Math.max(8, Math.min(r.left, window.innerWidth - 188)),
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
  setSavedProjects((prev) => prev.map((x) => (x.id === id ? { ...x, deletedAt: new Date(), pinned: false } : x)));
  setSelectedProjectId((cur) => (cur === id ? null : cur));
};
const handleRestoreProject = (id) =>
  setSavedProjects((prev) => prev.map((x) => (x.id === id ? { ...x, deletedAt: null } : x)));
const handlePurgeProject = (id) => setSavedProjects((prev) => prev.filter((x) => x.id !== id));
const handleTogglePin = (id) =>
  setSavedProjects((prev) => prev.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)));
const handleMoveProject = (id, folderId) =>
  setSavedProjects((prev) => prev.map((x) => (x.id === id ? { ...x, folderId: folderId ?? null } : x)));
const handleDeleteFolder = (id) => {
  setFolders((prev) => {
    const gone = prev.find((f) => f.id === id);
    return prev
      .filter((f) => f.id !== id)
      .map((f) => (f.parentId === id ? { ...f, parentId: gone?.parentId ?? null } : f));
  });
  setSavedProjects((prev) => prev.map((x) => (x.folderId === id ? { ...x, folderId: null } : x)));
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
  const [imageOrVideo, setImageOrVideo] = useState(NAV.imageOrVideo ?? "image");
  const imageOrVideoRef = useRef(imageOrVideo);
  imageOrVideoRef.current = imageOrVideo;

  useEffect(() => {
    try {
      localStorage.setItem(
        "bezel:nav",
        JSON.stringify({ toolbarMode, animTab, imageOrVideo, sidebarPanel, sidebarOpen, projectsPageOpen, projectId: selectedProjectId })
      );
    } catch {}
  }, [toolbarMode, animTab, imageOrVideo, sidebarPanel, sidebarOpen, projectsPageOpen, selectedProjectId]);

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
  const prevModeRef = useRef(tabKey);
  useEffect(() => {
    const prev = prevModeRef.current;
    if (prev === tabKey) return;
    canvasByModeRef.current[prev] = { canvasSize, customWidth, customHeight };
    const saved = canvasByModeRef.current[tabKey] ?? { canvasSize: "Fill", customWidth: 1080, customHeight: 1440 };
    setCanvasSize(saved.canvasSize);
    setCustomWidth(saved.customWidth);
    setCustomHeight(saved.customHeight);
    prevModeRef.current = tabKey;
  }, [tabKey]);
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
  const [gradientFx, setGradientFx] = useState([]); // stacked filters on the gradient background
  const nextGradFxIdRef = useRef(1);
  const [grainAmount, setGrainAmount] = useState(0);
  const [grainType, setGrainType] = useState("noise");
  const [grainScale, setGrainScale] = useState(100);
  const [grainBlend, setGrainBlend] = useState("screen");
  const [fxBusy, setFxBusy] = useState(false); // heavy filter render in progress
  const [mediaLoading, setMediaLoading] = useState(0); // number of uploads still decoding
  const [saving, setSaving] = useState(false);
  const [environment, setEnvironment] = useState("none");
  const [lightingIntensity, setLightingIntensity] = useState(60);
  const [customImagePreset, setCustomImagePreset] = useState("none");
  const [customBgImageUrl, setCustomBgImageUrl] = useState(null);
  const [customImageLabel, setCustomImageLabel] = useState(null);
  const [customImageThumb, setCustomImageThumb] = useState(null);
  const [customImageDims, setCustomImageDims] = useState(null);
  const [customCropModalOpen, setCustomCropModalOpen] = useState(false);
  const customImageInputRef = useRef(null);
    // Gradient: visible filters. Custom image: visible filters or grain. Both paint through the filter canvas.
  // texture grain (and any grain on a custom image) paints through the filter canvas, because the 3D scene only knows noise grain
  const texGrain = grainAmount > 0 && grainType !== "noise";
  const gradFxOn =
    (bgType === "gradient" && (gradientFx.some((f) => f.visible) || texGrain)) ||
    (bgType === "custom" && !!customBgImageUrl && (gradientFx.some((f) => f.visible) || grainAmount > 0));

  const grainImgsRef = useRef({});
  const [grainImgTick, setGrainImgTick] = useState(0);
  useEffect(() => {
    const g = GRAIN_TYPES.find((t) => t.value === grainType);
    if (!g?.file || grainImgsRef.current[g.value]) return;
    const im = new Image();
    im.onload = () => {
      grainImgsRef.current[g.value] = im;
      setGrainImgTick((n) => n + 1);
    };
    im.src = `${import.meta.env.BASE_URL}textures/${g.file}`;
  }, [grainType]);

  // the filters need the decoded image, so it's loaded here and the background repaints once it's ready
  const customImgRef = useRef(null);
  const [customImgTick, setCustomImgTick] = useState(0);
  useEffect(() => {
    customImgRef.current = null;
    if (!customBgImageUrl) {
      setCustomImgTick((n) => n + 1);
      return;
    }
    let dead = false;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      if (dead) return;
      customImgRef.current = im;
      setCustomImgTick((n) => n + 1);
    };
    im.src = customBgImageUrl;
    return () => {
      dead = true;
    };
  }, [customBgImageUrl]);
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
  controls: true,
  motion: true,
  effects: true,
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
      (animTab
        ? PARAM_ALL.filter((t) => templateSearch || !animCategory || animCategory === "All" || t.category === animCategory)
        : videoTplMode
        ? toolbarMode === "frame" ? FRAME_VIDEO_TEMPLATES : VIDEO_TEMPLATES
        : toolbarMode === "frame" ? FRAME_TEMPLATE_LIBRARY : TEMPLATE_LIBRARY
      ).filter((t) =>
        `${t.label} ${t.tags}`.toLowerCase().includes(templateSearch.toLowerCase())
      ),
    [templateSearch, toolbarMode, videoTplMode, animTab, animCategory]
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
    setTplPreviews({});
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
      ? fxList.find((e) => `fx-${e.id}` === colorPickerTarget)
      : null;
  const colorPickerAnchorRef = activeGradientStop
    ? gradientPopupRef
    : activeBackStop
    ? backPopupRef
    : activeEffect || GFX_COLOR[colorPickerTarget] || (typeof colorPickerTarget === "string" && colorPickerTarget.startsWith("afx-"))
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
    : GFX_COLOR[colorPickerTarget]
    ? gradientFx.find((f) => `gfx:${f.id}` === openEffectId)?.[GFX_COLOR[colorPickerTarget][0]] ?? "FFFFFF"
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
    : GFX_COLOR[colorPickerTarget]
    ? (GFX_COLOR[colorPickerTarget][1]
        ? gradientFx.find((f) => `gfx:${f.id}` === openEffectId)?.[GFX_COLOR[colorPickerTarget][1]] ?? 100
        : 100)
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
  const updateEffect = (id, patch) => {
    const target = fxList.find((e) => e.id === id);
    if (toolbarMode === "frame" && target?.type === "layerBlur") {
      // canvas-wide: patch the same kind of blur on every frame, and give it to any frame that lacks one
      const kind = target.mode ?? "uniform";
      const same = (e) => e.type === "layerBlur" && (e.mode ?? "uniform") === kind;
      setFrames((prev) =>
        prev.map((f) => ({
          ...f,
          effects: f.effects.some(same)
            ? f.effects.map((e) => (same(e) ? { ...e, ...patch } : e))
            : [...f.effects, { ...target, ...patch }],
        }))
      );
      return;
    }
    setFxList((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };
  const removeEffect = (id) => {
  keepSidebarScroll();
  const gone = fxList.find((e) => e.id === id);
  if (toolbarMode === "frame" && gone?.type === "layerBlur") {
    // canvas-wide: remove this kind of blur from every frame, not just the selected ones
    const sameKind = (e) => e.type === "layerBlur" && (e.mode ?? "uniform") === (gone.mode ?? "uniform");
    setFrames((prev) => prev.map((f) => ({ ...f, effects: f.effects.filter((e) => !sameKind(e)) })));
    if (openEffectId === id) closeEffectPopup();
    return;
  }
  setFxList((prev) => prev.filter((e) => e.id !== id));
  if (openEffectId === id) closeEffectPopup();
};
  const addEffect = (picked) => {
    keepSidebarScroll();
    const id = nextEffectIdRef.current++;
    if (toolbarMode === "frame" && picked === "layerBlur") {
      setFrames((prev) => prev.map((f) => ({ ...f, effects: [...f.effects, makeFx("layerBlur", id)] })));
      return;
    }
    setFxList((prev) => {
      const used = new Set(prev.map((e) => e.type));
      const type = typeof picked === "string" ? picked : ALL_EFFECT_OPTIONS.find((o) => !used.has(o.value))?.value ?? "dropShadow";
      return [...prev, makeFx(type, id)];
    });
  };
  const changeEffectType = (id, type) => {
    const old = fxList.find((e) => e.id === id);
    if (toolbarMode === "frame" && old && (type === "layerBlur" || old.type === "layerBlur")) {
      const fresh = { ...makeFx(type, id), visible: old.visible };
      if (type === "layerBlur") {
        // becomes canvas-wide: replace it on the selected frames, add it everywhere else
        setFrames((prev) =>
          prev.map((f) => ({
            ...f,
            effects: f.effects.some((e) => e.id === id)
              ? f.effects.map((e) => (e.id === id ? fresh : e))
              : [...f.effects, { ...fresh }],
          }))
        );
      } else {
        // was canvas-wide: remove that blur everywhere, the new type goes on the selected frames only
        const kind = old.mode ?? "uniform";
        const same = (e) => e.type === "layerBlur" && (e.mode ?? "uniform") === kind;
        const ids = editIdsRef.current;
        setFrames((prev) =>
          prev.map((f) => {
            const rest = f.effects.filter((e) => !same(e));
            return { ...f, effects: ids.includes(f.id) ? [...rest, fresh] : rest };
          })
        );
      }
      return;
    }
    setFxList((prev) => prev.map((e) => (e.id === id ? { ...makeFx(type, id), visible: e.visible } : e)));
  };

  const handlePickerColorChange = (nextHex, nextOpacity) => {
    if (GFX_COLOR[colorPickerTarget]) {
      const [hk, ok] = GFX_COLOR[colorPickerTarget];
      setGradientFx((prev) =>
        prev.map((f) => (`gfx:${f.id}` === openEffectId ? { ...f, [hk]: nextHex, ...(ok ? { [ok]: nextOpacity } : {}) } : f))
      );
    } else if (typeof colorPickerTarget === "string" && colorPickerTarget.startsWith("afx-")) {
      if (activeAnimFx) patchAnimFx(animTplRef.current, activeAnimFx.id, { hex: nextHex, opacity: nextOpacity });
    } else if (activeGradientStop) {
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

  // Gradient painted through the filter stack (plus grain) on a fresh canvas.
  // The scene, the Frame preview and the Frame export all use it, so they match.
  const renderGradientFxCanvas = (W, H, k) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (bgType === "custom") {
      const im = customImgRef.current;
      if (im) {
        const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
        const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
        x.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
    } else {
      x.globalAlpha = gradientOpacity / 100;
      x.fillStyle = makeCanvasGradient(x, gradientType, gradientAngle, gradientStops, 0, 0, W, H);
      x.fillRect(0, 0, W, H);
      x.globalAlpha = 1;
    }
    applyGradientFx(c, gradientFx, k);
    if (grainAmount > 0 && grainType !== "noise") {
      const gi = grainImgsRef.current[grainType];
      if (gi) paintGrainTexture(x, W, H, gi, grainAmount, grainScale, grainBlend);
    } else if (grainAmount > 0) {
      x.save();
      x.scale(k, k);
      x.globalCompositeOperation = "overlay";
      x.fillStyle = x.createPattern(makeGrainTile(512, grainAmount), "repeat");
      x.fillRect(0, 0, W / k, H / k);
      x.restore();
    }
    return c;
  };

  useEffect(() => {
    if (bgAnimOnRef.current) return; // a background animation is painting the scene
    if (gradFxOn) {
      const d = canvasDims;
      if (!d) return;
      if (bgType === "custom" && !customImgRef.current) return; // image still decoding
      setFxBusy(true);
      const t = setTimeout(() => {
        try {
          const W = 1280, H = Math.max(2, Math.round((W * d.h) / d.w));
          const c = renderGradientFxCanvas(W, H, W / d.w);
          if (toolbarMode === "frame") showFrameBgCanvas(c);
          else {
            hideFrameBgCanvas();
            sceneRef.current?.setBackgroundCanvas?.(c);
          }
        } finally {
          setFxBusy(false);
        }
      }, 50);
      return () => clearTimeout(t);
    }
    setFxBusy(false);
    hideFrameBgCanvas();
    sceneRef.current?.setBackgroundCanvas?.(null);
    if (bgType === "solid") {
      sceneRef.current?.setBackground(bgHex, bgOpacity);
    } else if (bgType === "gradient") {
      sceneRef.current?.setBackgroundGradient?.(gradientType, gradientStops, gradientOpacity, gradientAngle, grainAmount);
    } else if (bgType === "custom") {
      sceneRef.current?.setBackgroundImage?.(customBgImageUrl);
    }
  }, [bgType, bgHex, bgOpacity, gradientType, gradientStops, gradientOpacity, gradientAngle, grainAmount, customBgImageUrl, gradientFx, canvasDims, toolbarMode, customImgTick, grainType, grainScale, grainBlend, grainImgTick]);

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
  sceneRef.current?.setEffects(mockupEffects);
}, [mockupEffects]);

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

    // camera tilt: templates without `cam` go back to flat
    const cam = tpl.cam ?? {};
    setCameraEase(true);
    clearTimeout(cameraEaseTimerRef.current);
    cameraEaseTimerRef.current = setTimeout(() => setCameraEase(false), 360);
    handleRotationChange(cam.rotationX ?? 0);
    handleRotationYChange(cam.rotationY ?? 0);
    handleRotationZChange(cam.rotationZ ?? 0);
    handlePositionXChange(cam.positionX ?? 0);
    handlePositionYChange(cam.positionY ?? 0);
    handleZoomChange(cam.zoom ?? 70);

    // canvas size: templates without `canvas` keep the current one
    const c = tpl.canvas;
    if (c) {
      setCanvasSize("Custom");
      setCustomWidth(c.w);
      setCustomHeight(c.h);
    }

    // Layout math is in short-side units, so only the aspect ratio matters.
    // Use the template's own ratio instead of waiting for the canvas to re-measure.
    const box = c
      ? c.w >= c.h ? { w: c.w / c.h, h: 1 } : { w: 1, h: c.h / c.w }
      : frameSizeRef.current;
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
        fade: 0,
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
    setMediaLoading((n) => n + 1);
    let m;
    try {
      m = await loadVideoMeta(picked);
    } finally {
      setMediaLoading((n) => Math.max(0, n - 1));
    }
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

  useBlockStrayFileDrops();

  const exportImgCacheRef = useRef(new Map()); // src -> Promise<Image>, reused between exported frames
  // ov (video export only): { cam, pose, texts, bg } for the frame being rendered
  const renderFrameCanvas = async (width, transparent = false, height = null, ov = null) => {
    const size = ov?.size ?? frameSizeRef.current;
    if (!size) return null;
    const outW = width;
    const outH = height ?? Math.round(width * (size.h / size.w));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";

    const loadImg = (src) => {
      const hit = exportImgCacheRef.current.get(src);
      if (hit) return hit;
      const p = new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => (img.decode ? img.decode().catch(() => {}).then(() => resolve(img)) : resolve(img));
        img.onerror = reject;
        img.src = src;
      });
      p.catch(() => exportImgCacheRef.current.delete(src));
      exportImgCacheRef.current.set(src, p);
      return p;
    };
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
      } else if ((bgType === "gradient" || bgType === "custom") && gradFxOn && (!ov?.bg?.snap || bgKey(ov.bg.snap) === bgKey(liveBg))) {
        // filters run at up to 2560px wide, then scale to the export size
        const FW = Math.min(outW, 2560), FH = Math.max(2, Math.round((FW * outH) / outW));
        // video export: render the filters once and reuse them for every frame
        let fxc = ov?.fxCache?.canvas;
        if (!fxc || fxc.width !== FW || fxc.height !== FH) {
          fxc = renderGradientFxCanvas(FW, FH, FW / size.w);
          if (ov?.fxCache) ov.fxCache.canvas = fxc;
        }
        ctx.drawImage(fxc, 0, 0, outW, outH);
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
          const fx = Math.max(0, ...fr.effects.filter((e) => e.visible && isShadowFx(e)).map((e) => (Math.abs(e.x) + e.blur * 2 + Math.abs(e.spread)) * k));
          const fy = Math.max(0, ...fr.effects.filter((e) => e.visible && isShadowFx(e)).map((e) => (Math.abs(e.y) + e.blur * 2 + Math.abs(e.spread)) * k));
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
      lctx.imageSmoothingQuality = "high";
      lctx.translate(padL, padT);
      const comp = document.createElement("canvas");
      comp.width = compW;
      comp.height = compH;
      const cctx = comp.getContext("2d");
      cctx.imageSmoothingQuality = "high";
      cctx.translate(padL, padT);

      for (const fr of sortByDepth(frameList)) {
        const fp = ov?.framePoses?.[fr.id];
        if (fp === "hidden" || fr.hidden) continue; // outside its row, or switched off with the eye
        if (fr.rig?.hide && planeBackFacing(fr, { w: outW, h: outH })) continue;
        const { left: sx, top: sy, width: sw, height: sh } = frameRect(fr, { w: outW, h: outH });
        const rs = cornersOf(fr).map((p) => (Math.min(sw, sh) * p) / 100); // [tl, tr, br, bl]
        const srcUrl = fr.img ? (fr.img.cropUrl ?? fr.img.url) : null;
        const srcImg =
          backFacing || !srcUrl
            ? null
            : fr.img?.video && videoOn
            ? await videoFrameAt(fr.img.video.url, ov?.t ?? vidTimeRef.current)
            : await loadImg(srcUrl);

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
          drawCover(srcImg, sx, sy, sw, sh, lctx);
          const ca = fr.effects.find((e) => e.visible && e.type === "chromatic" && e.amount > 0);
          if (ca && !fr.img?.video) {
            const rad = ((ca.angle ?? 0) * Math.PI) / 180;
            paintChromatic(lctx, padL, padT, sx, sy, sw, sh, Math.cos(rad) * ca.amount * k, Math.sin(rad) * ca.amount * k);
          }
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
          .forEach((e) => drawNoise(lctx, sx, sy, sw, sh, e.amount, Math.max(1, ((1 + e.size * 0.5) / 1.4) * k)));
        paintSheen(lctx, sx, sy, sw, sh, environment, cam.rotationX, cam.rotationY);
        const dim = frameDim(fr, { w: outW, h: outH });
        const shade = 1 - (1 - (fr.sh || 0)) * (1 - dim); // combine with the existing 3D shade
        if (shade > 0) {
          lctx.fillStyle = `rgba(0,0,0,${shade})`;
          lctx.fillRect(sx, sy, sw, sh);
        }
        lctx.restore();

        // Stroke: inside / center / outside are the same path offset by half the weight.
        const st = fr.stroke;
        if (st.on && st.width > 0) {
          const w = st.width * k;
          // inside / outside strokes share their edge with the image, so widen them by ~1px to cover its antialiased fringe
          const bleed = st.position !== "center" && st.opacity >= 100 ? Math.min(1, w) : 0;
          const sign = st.position === "inside" ? -1 : st.position === "outside" ? 1 : 0;
          const off = (sign * (w - bleed)) / 2;
          lctx.beginPath();
          lctx.roundRect(sx - off, sy - off, sw + off * 2, sh + off * 2, rs.map((v) => Math.max(0, v + off)));
          lctx.lineWidth = w + bleed;
          lctx.strokeStyle = hexToRgba(st.hex, st.opacity);
          lctx.stroke();
        }

        const rot = ((fr.r ?? 0) * Math.PI) / 180;
        const rcos = Math.cos(rot), rsin = Math.sin(rot);
        const rcx = sx + sw / 2, rcy = sy + sh / 2;
        cctx.save();
        cctx.globalAlpha = 1;
        if (fp) {
          // this frame's own enter / exit pose
          const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = fp;
          cctx.globalAlpha = vidClamp(a, 0, 1);
          cctx.translate(x * outW, -y * outH);
          cctx.translate(rcx, rcy);
          cctx.scale(Math.max(0.001, Math.abs(s * Math.cos(ry))), Math.max(0.001, Math.abs(s * Math.cos(rx))));
          cctx.translate(-rcx, -rcy);
        }
        if (fr.rig) {
          const rr = { left: sx, top: sy, width: sw, height: sh };
          const bx = { w: outW, h: outH };
          const proj = (u, v) => projectPlane(fr, rr, bx, u, v);
          const poly = [proj(0, 0), proj(1, 0), proj(1, 1), proj(0, 1)];
          fr.effects
            .filter((e) => e.visible && isShadowFx(e))
            .forEach((e) => {
              cctx.save();
              cctx.shadowColor = hexToRgba(e.hex, e.opacity);
              cctx.shadowBlur = e.blur * k;
              cctx.shadowOffsetX = e.x * k + FAR;
              cctx.shadowOffsetY = e.y * k;
              cctx.fillStyle = "#000";
              cctx.beginPath();
              poly.forEach(([px, py], n) => (n ? cctx.lineTo(px - FAR, py) : cctx.moveTo(px - FAR, py)));
              cctx.closePath();
              cctx.fill();
              cctx.restore();
            });
          drawPlane3D(cctx, layer, { x: sx + padL, y: sy + padT, w: sw, h: sh }, proj, ...planeGrid(fr));
          cctx.restore();
          continue;
        }
        fr.effects
          .filter((e) => e.visible && isShadowFx(e))
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

      // progressive blur covers the whole canvas and is applied once to all frames together
      const isPb = (e) => e.visible && e.type === "layerBlur" && e.mode === "progressive" && (e.blur > 0 || (e.startBlur ?? 0) > 0);
      const pbFrame = frameList.find((fr) => !fr.hidden && fr.effects.some(isPb));
      (pbFrame?.effects ?? []).filter(isPb).forEach((fx) =>
        applyProgressiveBlur(comp, fx, k, { left: padL, top: padT, width: outW, height: outH })
      );

      // uniform layer blur: one blur over all frames together
      const isUb = (e) => e.visible && e.type === "layerBlur" && e.mode !== "progressive" && e.blur > 0;
      const ubFrame = frameList.find((fr) => !fr.hidden && fr.effects.some(isUb));
      const ubBlur = ubFrame ? ubFrame.effects.filter(isUb).reduce((s, e) => s + e.blur, 0) * k : 0;
      if (ubBlur > 0) {
        const tmp = document.createElement("canvas");
        tmp.width = comp.width;
        tmp.height = comp.height;
        const t = tmp.getContext("2d");
        t.filter = `blur(${ubBlur}px)`;
        t.drawImage(comp, 0, 0);
        const c2 = comp.getContext("2d");
        c2.save();
        c2.setTransform(1, 0, 0, 1, 0, 0);
        c2.clearRect(0, 0, comp.width, comp.height);
        c2.drawImage(tmp, 0, 0);
        c2.restore();
      }

      // canvas-wide effects come from the first visible frame that has them (like progressive blur above)
      const canvasFx = (type) => {
        for (const fr of frameList) {
          if (fr.hidden) continue;
          const e = fr.effects.find((x) => x.visible && x.type === type);
          if (e) return e;
        }
        return null;
      };
      const canvasRect = { left: padL, top: padT, width: outW, height: outH };
      const fish = canvasFx("fishEye");
      if (fish && fish.amount > 0) applyFishEye(comp, fish.amount, canvasRect);

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

      const glass = canvasFx("liquidGlass");
      if (glass && !ov?.framesOnly) paintGlassBands(ctx, outW, outH, glass, k);

      const vig = canvasFx("vignette");
      if (vig && vig.amount > 0 && !ov?.framesOnly) paintVignette(ctx, outW, outH, vig);

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
      else {
        const hiRes = gradFxOn && !transparent && canvasDims;
        if (hiRes) {
          const FW = Math.min(d.w, 2560), FH = Math.max(2, Math.round((FW * d.h) / d.w));
          sceneRef.current?.setBackgroundCanvas?.(renderGradientFxCanvas(FW, FH, FW / canvasDims.w));
        }
        sceneRef.current?.exportAt(d.w, fmt.mime, fmt.ext, d.h, transparent);
        if (hiRes) {
          const LW = 1280, LH = Math.max(2, Math.round((LW * canvasDims.h) / canvasDims.w));
          sceneRef.current?.setBackgroundCanvas?.(renderGradientFxCanvas(LW, LH, LW / canvasDims.w));
        }
      }
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
    shot: (() => {
      const s = shotStoreRef.current.get(shotIdRef.current);
      return s ? { id: shotIdRef.current, thumb: s.thumb, label: s.label, crop: s.crop, frameCropUrl: s.frameCropUrl } : null;
    })(),
    toolbarMode,
    animTab,
    imageOrVideo,
    mockupSocial,
    strap,
    strapStyle,
    canvasByMode: { ...canvasByModeRef.current, [tabKey]: { canvasSize, customWidth, customHeight } },
    vidByMode: {
      ...vidByModeRef.current,
      [tabKey]: { shots: vidShots, bgs: vidBgs, texts: vidTexts, duration: vidDuration, no: vidNo.current, time: vidTimeRef.current },
    },
  });

  // asCopy = true always creates a new project. Otherwise the open project is updated, or a new one is made if none is open.
  const handleSaveProject = async (asCopy = false, silent = false) => {
    asCopy = asCopy === true;
    if (savingRef.current) return;
    savingRef.current = true;
    if (!silent) setSaving(true);
    try {
    const kind = animTab ? "animation" : toolbarMode === "frame" ? "frame" : "mockup";
    const packed = await packProject(captureProjectData(), assetStoreRef.current.byId);
    const existing = !asCopy && selectedProjectId ? savedProjects.find((p) => p.id === selectedProjectId) : null;
    if (silent && !existing) return; // autosave only updates an open, already-saved project
    let thumb = null;
    if (kind !== "mockup") {
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
        prev.map((p) => (p.id === existing.id ? { ...p, title: silent ? p.title : projectTitle, thumb, kind, editedAt: now, packed } : p))
      );
    } else {
      const id = `${Date.now()}`;
      const title = asCopy && selectedProjectId ? `${projectTitle} copy` : projectTitle;
      if (title !== projectTitle) setProjectTitle(title);
      setSavedProjects((prev) => [{ id, title, thumb, kind, editedAt: now, packed }, ...prev]);
      // Only keep editing a project that was already open. A fresh save stays unselected,
      // so the next save adds a new project instead of replacing this one.
      if (asCopy && selectedProjectId) setSelectedProjectId(id);
    }
    if (!silent) {
      setSidebarPanel("projects");
      setExportToast(existing ? "Project saved" : asCopy ? "Saved as copy" : "Project saved");
      setTimeout(() => setExportToast(null), 2000);
    }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleNewProject = useCallback(() => {
    autoKeyMuteRef.current = performance.now() + 600;
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
    setGrainType("noise");
    setGrainScale(100);
    setGrainBlend("screen");
    setEnvironment("none");
    hasSeededGradientRef.current = false;
    setGradientFx([]);

    // Panel open/closed state
    setOpenSections({ device: true, screenInterface: false, position: true, appearance: true, social: false, camera: true, scene: true, text: false, controls: true, motion: true, effects: true });
    setFrameRadius(0);
    setFrames([makeFrame(1)]);
    assetPoolRef.current = [];
    setSelectedIds([1]);
    nextFrameIdRef.current = 2;
    setFrameCorners(null);
    setFrameStroke(DEFAULT_STROKE);
    setFrameAspectLocked(false);
    setFrameEffects(DEFAULT_FRAME_EFFECTS());
    setMockupEffects([]);
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
    const n = { x: p.x, y: p.y, w: Math.round(p.w), h: Math.round(p.h), s: p.s, r: p.r ?? 0, rx: p.rx ?? 0, ry: p.ry ?? 0, z: p.z ?? 0, sh: p.sh ?? 0 };
    if (
      f.x === n.x && f.y === n.y && f.w === n.w && f.h === n.h && f.s === n.s && (f.r ?? 0) === n.r &&
      (f.rx ?? 0) === n.rx && (f.ry ?? 0) === n.ry && (f.z ?? 0) === n.z && (f.sh ?? 0) === n.sh
    ) return f;
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
  const sceneModeRef = useRef(tabKey);
  useEffect(() => {
    const prev = sceneModeRef.current;
    if (prev === tabKey) return;
    sceneModeRef.current = tabKey;

    // these values are still the previous mode's, because only toolbarMode changed in this render
    sceneByModeRef.current[prev] = {
      bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientOpacity,
      gradientStops, selectedStopId, gradientPreset, grainAmount, gradientFx,
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
      selectedStopId: 1, gradientPreset: "none", grainAmount: 0, gradientFx: [],
      customImagePreset: "none", customBgImageUrl: null, customImageLabel: null, customImageThumb: null, customImageDims: null,
      environment: "none",
      rotationX: 0, rotationY: 0, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27, activeCameraView: null,
      activeTemplateId: null, vidTplId: null,
    };
    const s = sceneByModeRef.current[tabKey] ?? d;

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
    setGradientFx((s.gradientFx ?? []).map((f) => ({ ...f })));
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
  // Animation tab: no background rows to manage, so the edit changes the default row that spans the whole timeline
  if (animTab && vidLive.current.bgs.length) {
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
            x: r.x + (o.dx ?? 0), y: r.y + (o.dy ?? 0), w: r.w, h: r.h, s: r.s * (o.k ?? 1), r: (r.r ?? 0) + (o.dr ?? 0),
            rx: o.rx ?? 0, ry: o.ry ?? 0, z: o.dz ?? 0, sh: o.sh ?? 0, // 3D fields are absolute, not offsets
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
      const src = cur[i] ?? cloneFrame({ ...base, img: null }, alloc());
      // Animation: planes always cycle through the assets. Other tabs keep each frame's own image.
      const slotImg = animTab ? assetPoolRef.current[i] : null;
      const img = animTab ? (slotImg ? { ...slotImg } : null) : src.img ?? (pool.length ? { ...pool[i % pool.length] } : null);
      return {
        ...src, img,
        r: 0, // a layout starts unrotated, even if the frame was left mid-animation
        rx: 0, ry: 0, z: 0, sh: 0,
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
      return p ? { ...f, x: p.x, y: p.y, w: Math.round(p.w), h: Math.round(p.h), s: p.s, r: p.r ?? 0, rx: p.rx ?? 0, ry: p.ry ?? 0, z: p.z ?? 0, sh: p.sh ?? 0 } : f;
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
    if (!tpl.build) return handleApplyVideoTemplate(tpl);
    const p = params ?? { ...defaultParams(tpl.params), ...tplParams[tpl.id] };
    const box = frameSizeRef.current;
    const t0 = vidTimeRef.current, wasPlaying = vidLive.current.playing;
    handleApplyVideoTemplate(instantiateParam(tpl, p, { aspect: box ? box.w / box.h : 1 }));
    if (keepTime) {
      vidSeek(Math.min(t0, vidLive.current.duration));
      if (wasPlaying) setVidPlaying(true);
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
      const smooth = !!box && !reduce && !vidLive.current.playing && Object.keys(patch).some((k) => ["offsetX", "offsetY", "size", "height", "stagger", "fxList"].includes(k));
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
      if (!frameSizeRef.current && tries++ < 10) {
        timer = setTimeout(run, 100); // canvas not measured yet
        return;
      }
      setAnimCategory(first.category);
      restoreUntilRef.current = Date.now() + 500; // the initial template isn't an undoable step
      applyVideoTemplate(first);
    };
    timer = setTimeout(run, 150);
    return () => clearTimeout(timer);
  }, [animTab]);

    useEffect(() => {
    const key = animTab ? `animrow-${animSel}` : `framerow-${selectedIds[0]}`;
    document.querySelector(`[data-asset-row="${key}"]`)?.scrollIntoView({ block: "nearest" });
  }, [animSel, selectedIds.join(","), animTab]);

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
    animMode: animTab,
    animName: animTab ? PARAM_ALL.find((t) => t.id === vidTplId)?.label ?? null : null,
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
    const fxCache = {};

    setVidExporting(true);
    setVidPlaying(false);
    vidEndRef.current = () => {}; // makes vidRange() return the whole timeline, not the selected shot
    vidBgActive.current = null;
    await Promise.all([400, 500, 600, 700].map((wt) => document.fonts.load(`${wt} 16px "TikTok Sans"`)));
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
            fxCache,
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
      : { bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientOpacity, gradientStops, grainAmount, gradientFx }),
    environment,
    customImagePreset, customBgImageUrl: assetId(customBgImageUrl), customImageLabel, customImageThumb: assetId(customImageThumb),
    frames: frames.map((f) => (f.img?.cropUrl ? { ...f, img: { ...f.img, cropUrl: assetId(f.img.cropUrl) } } : f)),
    shotId,
    textItems,
    mockupEffects,
    selectedTextId,
vidShots,
vidBgs: packBgs(vidBgs),
vidTexts,
vidAudios,
vidDuration,
    vidHead,
  };
  const keyCacheRef = useRef({}); // while exporting, the history keys aren't needed, so skip the big JSON.stringify
  const snapshotKey = vidExporting && keyCacheRef.current.snap ? keyCacheRef.current.snap : JSON.stringify(snapshot);
  keyCacheRef.current.snap = snapshotKey;
  const snapshotKeyRef = useRef(snapshotKey);
  snapshotKeyRef.current = snapshotKey;

  // History only sees what belongs to the active tab, so undo in one tab never touches another tab's state.
  const HISTORY_DEVICE_KEYS = [
    "deviceCategory", "deviceType", "finish", "bodyHex", "bodyOpacity", "deviceOrientation",
    "brightness", "reflectionMode", "reflectionShiny", "reflectionMatte", "lighting", "lightingIntensity",
    "showStatusBar", "showHomeIndicator", "showMenuBar", "showBrowser", "browserType", "browserTheme",
    "browserUrl", "safariTabs", "shotId", "mockupEffects",
  ];
  const historyKey = vidExporting && keyCacheRef.current.hist ? keyCacheRef.current.hist : (() => {
    const s = { ...snapshot };
    if (tabKey === "mockup") delete s.frames; // Mockup doesn't own frames
    else HISTORY_DEVICE_KEYS.forEach((k) => delete s[k]); // Frame / Animation don't own the device
    s.textItems = textItems.filter((t) => (t.mode ?? "mockup") === toolbarMode);
    if (tabKey === "animation") {
      // Animation keeps its assets in a ref and its controls in tplParams, so they have to be part of the history too
      s.animPool = animPool().map((a) => (a && a.cropUrl ? { ...a, cropUrl: assetId(a.cropUrl) } : a));
      s.tplParams = tplParams;
      s.vidTplId = vidTplId;
    }
    return JSON.stringify(s);
  })();
  keyCacheRef.current.hist = historyKey;
  const historyKeyRef = useRef(historyKey);
  historyKeyRef.current = historyKey;

  const historiesRef = useRef({}); // tab -> its own { past, future, committed }
  const historyRef = useRef({ past: [], future: [], committed: null }); // the active tab's stack
  const restoreUntilRef = useRef(Date.now() + 500); // startup effects settle without creating history
  const [, setHistoryTick] = useState(0);

    // toggling Video mode (or switching mode) changes which fields the snapshot has, so it isn't an undoable step
  useEffect(() => {
    restoreUntilRef.current = Date.now() + 300;
  }, [videoOn, toolbarMode, tabKey]);

  useEffect(() => {
    const h = historyRef.current;
    if (h.committed === null) {
      h.committed = historyKey;
      return;
    }
    if (Date.now() < restoreUntilRef.current) {
      h.committed = historyKey;
      return;
    }
    if (historyKey === h.committed) return;
    const t = setTimeout(() => {
      h.past.push(h.committed);
      if (h.past.length > 100) h.past.shift();
      h.future = [];
      h.committed = historyKey;
      setHistoryTick((n) => n + 1);
    }, 400);
    return () => clearTimeout(t);
  }, [historyKey]);

  const applySnapshot = (s, { scoped = false } = {}) => {
    restoreUntilRef.current = Date.now() + 300;
    if (s.deviceType !== undefined) {
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
    }
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
      setGradientFx(s.gradientFx ?? []);
    }
    setEnvironment(s.environment);
    setCustomImagePreset(s.customImagePreset);
    setCustomBgImageUrl(assetValue(s.customBgImageUrl));
    setCustomImageLabel(s.customImageLabel);
    setCustomImageThumb(assetValue(s.customImageThumb));
    if (s.frames) {
      const restored = s.frames.map((f) =>
        f.img?.cropUrl ? { ...f, img: { ...f.img, cropUrl: assetValue(f.img.cropUrl) } } : f
      );
      framesLatestRef.current = restored;
      setFrames(restored);
      setSelectedIds((ids) => {
        const keep = ids.filter((i) => restored.some((f) => f.id === i));
        return keep.length ? keep : [restored[0].id];
      });
    }
    // undo / redo only restores this tab's texts; opening a project replaces all of them
    setTextItems(
      scoped
        ? (prev) => [...prev.filter((t) => (t.mode ?? "mockup") !== toolbarModeRef.current), ...(s.textItems ?? [])]
        : s.textItems ?? []
    );
    setSelectedTextId(s.selectedTextId ?? null);
    if (s.mockupEffects !== undefined || !scoped) setMockupEffects(s.mockupEffects ?? []);
    if (scoped && s.animPool !== undefined) {
      assetPoolRef.current = s.animPool.map((a) => (a && a.cropUrl ? { ...a, cropUrl: assetValue(a.cropUrl) } : a));
      setTplParams(s.tplParams ?? {});
      setVidTplId(s.vidTplId ?? null);
    }

      // Screenshot: only touch the scene when it actually differs from what's showing.
    if (s.shotId !== undefined && s.shotId !== shotIdRef.current) {
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
    if (s.deviceType !== undefined) {
      handleBrightnessChange(s.brightness);
      handleLightingChange(s.lighting);
      handleLightingIntensityChange(s.lightingIntensity);
    }
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
    if (h.committed !== null && historyKeyRef.current !== h.committed) {
      h.past.push(h.committed);
      h.future = [];
      h.committed = historyKeyRef.current;
    }
    return h;
  };

  const undo = () => {
    const h = flushPendingHistory();
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(h.committed);
    h.committed = prev;
    applySnapshot(JSON.parse(prev), { scoped: true });
    setHistoryTick((n) => n + 1);
  };

  const redo = () => {
    const h = flushPendingHistory();
    const next = h.future.pop();
    if (!next) return;
    h.past.push(h.committed);
    h.committed = next;
    applySnapshot(JSON.parse(next), { scoped: true });
    setHistoryTick((n) => n + 1);
  };

  const historyPending =
    historyRef.current.committed !== null && historyKey !== historyRef.current.committed;
  const canUndo = historyRef.current.past.length > 0 || historyPending;
  const canRedo = historyRef.current.future.length > 0 && !historyPending;

  // Autosave: writes the open project 2s after the last change.
  const savingRef = useRef(false);
  const autosaveRef = useRef(null);
  autosaveRef.current = () => handleSaveProject(false, true);
  useEffect(() => {
    if (!selectedProjectId || !projectsLoaded) return;
    if (Date.now() < restoreUntilRef.current) return; // opening a project / switching tabs isn't an edit
    if (pendingOpenRef.current || vidPlaying || vidExporting) return;
    const t = setTimeout(() => autosaveRef.current?.(), 2000);
    return () => clearTimeout(t);
  }, [historyKey]);

  // Renaming in the top bar updates the saved project's title too
  useEffect(() => {
    if (!selectedProjectId) return;
    setSavedProjects((prev) =>
      prev.map((p) => (p.id === selectedProjectId && p.title !== projectTitle ? { ...p, title: projectTitle, editedAt: new Date() } : p))
    );
  }, [projectTitle]);

  // Opening a saved project: switch mode first, then restore everything once the mode-swap effects have run.
  const openProject = (p) => {
    setProjectsPageOpen(false);
    try {
      let d = p.data;
      if (p.packed) {
        const h = hydrateProject(p.packed);
        d = h.data;
        const fileOf = (url, name) => {
          const b = h.blobOf(url);
          return b ? new File([b], name || "image", { type: b.type }) : null;
        };
        if (d.shot) {
          const file = fileOf(d.shot.thumb, d.shot.label);
          if (file) shotStoreRef.current.set(d.shot.id, { ...d.shot, file, video: null });
        }
        Object.values(d.vidByMode ?? {}).forEach((m) =>
          m.shots.forEach((s) => {
            const f = s.img && fileOf(s.img.thumb, s.img.label);
            if (f) vidImgFiles.current.set(s.img.id, f);
          })
        );
      }
      if (!d) throw new Error("Project has no saved data");
      setSelectedProjectId(p.id);
      setProjectTitle(p.title);
      pendingOpenRef.current = { ...p, data: d };
      setImageOrVideo(d.imageOrVideo);
      setToolbarMode(d.toolbarMode);
      setAnimTab(!!d.animTab);
      setOpenTick((n) => n + 1);
    } catch (err) {
      console.error("Opening project failed:", err);
      setExportToast("Couldn't open this project");
      setTimeout(() => setExportToast(null), 3000);
    }
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
    vidNo.current = d.vidByMode[d.animTab ? "animation" : d.toolbarMode]?.no ?? 2;
    vidFrameSeenRef.current = new Set((d.vidByMode.frame?.shots ?? []).map((x) => x.frameId).filter((x) => x != null));
    vidBgActive.current = null;
    vidBgExitKeyRef.current = null;

    // id counters can be lower than the ids inside the opened project (New project resets some of them)
    const frameIds = s.frames.map((f) => f.id);
    nextFrameIdRef.current = Math.max(nextFrameIdRef.current, 1 + Math.max(0, ...frameIds));
    nextTextIdRef.current = Math.max(nextTextIdRef.current, 1 + Math.max(0, ...(s.textItems ?? []).map((t) => t.id)));
    nextEffectIdRef.current = Math.max(
      nextEffectIdRef.current,
      1 + Math.max(0, ...s.frames.flatMap((f) => f.effects.map((e) => e.id)), ...(s.mockupEffects ?? []).map((e) => e.id))
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
    autoKeyMuteRef.current = performance.now() + 600;
    historiesRef.current = {}; // every tab starts fresh for the opened project
    historyRef.current = { past: [], future: [], committed: null };
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
      setMode: selectTab,
      setMedia: (m) => !(animTab && m === "image") && setImageOrVideo(m),
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
      projectsPage: projectsPageOpen,
      cropOpen: cropModalOpen || customCropModalOpen || frameCropId !== null || shotCrop !== null,
      frameMode: toolbarMode === "frame" && !animTab,
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
      if (h.shortcutsOpen || h.cropOpen || h.tourOpen || h.projectsPage) return;

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
        case "a": h.setMode("animation"); break;
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
const activeParamTpl = animTab ? PARAM_ALL.find((t) => t.id === vidTplId) ?? null : null;
animTplRef.current = activeParamTpl;
const animFxId = typeof openEffectId === "string" && openEffectId.startsWith("anim:") ? Number(openEffectId.slice(5)) : null;
const FX_TYPES = [
  { type: "fade", label: "Fade", Icon: CircleHalf },
  { type: "blur", label: "Layer blur", Icon: Drop },
  ...Object.entries(SHARED_FX).map(([type, d]) => ({ type, label: d.label, Icon: FX_ICON[type] ?? Drop })),
];
const fxMeta = (type) => FX_TYPES.find((x) => x.type === type) ?? FX_TYPES[0];
const animFxList = (tpl) => ({ ...defaultParams(tpl.params), ...tplParams[tpl.id] }).fxList ?? [];
const addAnimFx = (tpl, type) => {
  keepSidebarScroll();
  const list = animFxList(tpl);
  const id = Math.max(0, ...list.map((x) => x.id)) + 1;
  const base =
    SHARED_FX[type] ? { ...SHARED_FX[type].defaults }
    : type === "fade" ? { fade: 40 }
    : { blur: 20, mode: "Uniform", start: 0, end: 100 };
  patchTplParams(tpl, { fxList: [...list, { id, type, on: true, ...base }] });
};
const patchAnimFx = (tpl, id, patch) =>
  patchTplParams(tpl, { fxList: animFxList(tpl).map((x) => (x.id === id ? { ...x, ...patch } : x)) });
const removeAnimFx = (tpl, id) => {
  keepSidebarScroll();
  patchTplParams(tpl, { fxList: animFxList(tpl).filter((x) => x.id !== id) });
};
const activeAnimFx =
  typeof colorPickerTarget === "string" && colorPickerTarget.startsWith("afx-") && activeParamTpl
    ? animFxList(activeParamTpl).find((x) => `afx-${x.id}` === colorPickerTarget) ?? null
    : null;
const [fxMenu, setFxMenu] = useState(null); // { kind: "anim" | "frame", right, top, bottom, up }
const fxMenuRef = useRef(null);
const fxMenuAnchorRef = useRef(null); // the + button the menu hangs from
const placeFxMenu = (kind) => {
  const el = fxMenuAnchorRef.current;
  if (!el?.isConnected) return null;
  const r = el.getBoundingClientRect();
  const h = fxMenuRef.current?.offsetHeight ?? 270;
  const below = window.innerHeight - r.bottom;
  const up = below < h + 12 && r.top > below; // same flip rule as the other dropdowns
  return { kind, right: window.innerWidth - r.right, top: r.bottom + 4, bottom: window.innerHeight - r.top + 4, up };
};
const openFrameFxMenu = (e) => {
  if (fxMenu) return setFxMenu(null);
  fxMenuAnchorRef.current = e.currentTarget;
  setFxMenu(placeFxMenu("frame"));
};

// Gradient filters. Grain is the existing grainAmount, shown as a "grain" row while it's above 0.
const openGradFxMenu = (e) => {
  if (fxMenu) return setFxMenu(null);
  fxMenuAnchorRef.current = e.currentTarget;
  setFxMenu(placeFxMenu("gradient"));
};
const gradRows = [...(grainAmount > 0 ? [{ id: "grain", type: "grain", visible: true }] : []), ...gradientFx];
const activeGradFx =
  typeof openEffectId === "string" && openEffectId.startsWith("gfx:")
    ? gradRows.find((r) => `gfx:${r.id}` === openEffectId) ?? null
    : null;
useLayoutEffect(() => {
  if (!activeGradFx) return;
  const row = effectRowRefs.current[openEffectId];
  const h = effectPopupRef.current?.offsetHeight ?? 0;
  if (!row || !h) return;
  const top = Math.max(8, Math.min(row.getBoundingClientRect().top, window.innerHeight - h - 8));
  setEffectPopupPos((p) => (p && p.top !== top ? { ...p, top } : p));
}, [activeGradFx?.type]);
const addGradFx = (type) => {
  keepSidebarScroll();
  if (type === "grain") {
    if (grainAmount === 0) setGrainAmount(30);
    return;
  }
  setGradientFx((prev) => [...prev, makeGradFx(type, nextGradFxIdRef.current++)]);
};
const updateGradFx = (id, patch) => setGradientFx((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
const removeGradFx = (id) => {
  keepSidebarScroll();
  if (id === "grain") setGrainAmount(0);
  else setGradientFx((prev) => prev.filter((f) => f.id !== id));
  if (openEffectId === `gfx:${id}`) closeEffectPopup();
};
const changeGradFxType = (id, type) => {
  if (id === "grain") {
    if (type === "grain") return;
    const nid = nextGradFxIdRef.current++;
    setGrainAmount(0);
    setGradientFx((prev) => [...prev, makeGradFx(type, nid)]);
    setOpenEffectId(`gfx:${nid}`);
  } else if (type === "grain") {
    setGradientFx((prev) => prev.filter((f) => f.id !== id));
    if (grainAmount === 0) setGrainAmount(30);
    setOpenEffectId("gfx:grain");
  } else {
    setGradientFx((prev) => prev.map((f) => (f.id === id ? { ...makeGradFx(type, id), visible: f.visible } : f)));
  }
};
useDismissable(!!fxMenu, "[data-fx-menu],[data-fx-add]", () => setFxMenu(null));
useLayoutEffect(() => {
  if (!fxMenu) return;
  const update = () => {
    const next = placeFxMenu(fxMenu.kind);
    if (!next) return;
    setFxMenu((m) =>
      m && m.top === next.top && m.right === next.right && m.bottom === next.bottom && m.up === next.up ? m : { ...m, ...next }
    );
  };
  update(); // re-measures once the menu has mounted and its real height is known
  window.addEventListener("scroll", update, true);
  window.addEventListener("resize", update);
  return () => {
    window.removeEventListener("scroll", update, true);
    window.removeEventListener("resize", update);
  };
}, [!!fxMenu]);
useEffect(() => {
  if (!animTab) closeEffectPopup(); // leaving Animation closes its effect popup
}, [animTab]);
const modeTexts = textItems.filter((t) => (t.mode ?? "mockup") === toolbarMode);
const frameRatio = Math.max(1, frameWidth) / Math.max(1, frameHeight);
const cornerPcts = frameCorners ?? [frameRadius, frameRadius, frameRadius, frameRadius];
// Frame mode only uses Z rotation, X/Y position and zoom. X/Y rotation and FoV stay flat.
const frameCam = { rotationX, rotationY, rotationZ, positionX, positionY, zoom, fov: CAM_DEFAULT.fov };

// Fish eye, live: draw the same bilinear result the export uses onto an overlay canvas.
const fishCanvasRef = useRef(null);
const fishJobRef = useRef(0);
const useFishCanvas = !vidPlaying && !vidExporting; // FrameLayer falls back to the SVG filter during playback
useEffect(() => {
  const el = fishCanvasRef.current;
  const size = frameSizeRef.current;
  if (!el || !size || toolbarMode !== "frame") return;
  let fish = null;
  for (const f of frames) {
    if (f.hidden) continue;
    const e = (f.effects ?? []).find((x) => x.visible && x.type === "fishEye");
    if (e) { fish = e; break; }
  }
  const on = !!fish && fish.amount > 0 && useFishCanvas;
  el.style.display = on ? "block" : "none";
  if (!on) return;
  const job = ++fishJobRef.current;
  const raf = requestAnimationFrame(async () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ov = { framesOnly: true, texts: [] };
    if (videoOn) {
      const t = vidTimeRef.current;
      const shots = vidLive.current.shots;
      ov.t = t;
      ov.pose = sampleDeviceAnim(shots.filter((s) => s.frameId == null), t);
      ov.framePoses = frameRowStates(shots, framesLatestRef.current.map((f) => f.id), t);
    }
    const c = await renderFrameCanvas(Math.round(size.w * dpr), true, Math.round(size.h * dpr), ov);
    if (job !== fishJobRef.current || !c || !fishCanvasRef.current) return;
    const out = fishCanvasRef.current;
    if (out.width !== c.width || out.height !== c.height) { out.width = c.width; out.height = c.height; }
    const ctx = out.getContext("2d");
    ctx.clearRect(0, 0, out.width, out.height);
    ctx.drawImage(c, 0, 0);
  });
  return () => cancelAnimationFrame(raf);
}, [frames, environment, canvasDims, toolbarMode, videoOn, vidHead, vidShots, vidPlaying, vidExporting,
    rotationX, rotationY, rotationZ, positionX, positionY, zoom]);

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
    {bgType === "gradient" && !gradFxOn && (
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
    {bgType === "custom" && customBgImageUrl && !gradFxOn && (
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

            <AppStyles />
      <style>{`
        [data-frame-smooth] [data-frame-id] {
          transition:
            left 120ms cubic-bezier(0.23, 1, 0.32, 1),
            top 120ms cubic-bezier(0.23, 1, 0.32, 1),
            width 120ms cubic-bezier(0.23, 1, 0.32, 1),
            height 120ms cubic-bezier(0.23, 1, 0.32, 1),
            border-radius 120ms cubic-bezier(0.23, 1, 0.32, 1),
            filter 120ms cubic-bezier(0.23, 1, 0.32, 1),
            translate 120ms cubic-bezier(0.23, 1, 0.32, 1),
            transform 120ms cubic-bezier(0.23, 1, 0.32, 1),
            scale 120ms cubic-bezier(0.23, 1, 0.32, 1),
            rotate 120ms cubic-bezier(0.23, 1, 0.32, 1) !important;
        }
      `}</style>

      {/* Top bar */}
      <div className={`relative z-40 flex items-center justify-between p-4 gap-3 h-16 bg-[#FAF9FA] dark:bg-[#171717] rounded-b-2xl shrink-0 mx-2`}>
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
 <Tooltip label={animTab ? "Not available in Animation" : "Image"} shortcut={animTab ? undefined : ["I"]} placement="bottom" className={animTab ? "cursor-not-allowed" : ""}>
  <button
    disabled={animTab}
    aria-disabled={animTab}
    className={`flex items-center justify-center gap-2 h-7 px-[10px] py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      imageOrVideo === "image" && !animTab ? SEG_ON : SEG_OFF
    } ${animTab ? "opacity-40" : ""}`}
    onClick={() => !animTab && setImageOrVideo("image")}
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
<div className="relative z-50" data-tour="export" ref={exportRef}>
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
      className="flex items-center justify-center w-[30px] pr-[2px] h-8 -ml-px shrink-0 rounded-r-2xl border border-[#FCFCFC]/20 border-l-[#FCFCFC]/40 bg-[#FF47BC] hover:bg-[#F230AE] transition-[background-color,transform] duration-150 active:scale-[0.97]"
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
                  <FolderOpen
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
                                    ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                                    : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F1F1F1] dark:hover:bg-white/5"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Icon size={16} weight="regular" />
                                  <span className="text-[13px] font-medium tracking-[-0.005em]">
                                    {opt.label}
                                  </span>
                                </span>
                                {isSelected && <Check size={14} weight="regular" />}
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
  className={`sidebar-panel absolute inset-0 flex flex-col items-start gap-3 py-4 pl-4 pr-0 w-full h-full transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    sidebarPanel === "templates" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
  }`}
>
              <div className="w-full pr-4">
                <SearchField
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Search templates"
                />
              </div>

              {animTab && animCategory && !templateSearch && (
                <button
                  type="button"
                  onClick={() => setAnimCategory(null)}
                  className="flex items-center gap-1 -mt-1 h-7 px-1 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <CaretLeft size={14} weight="regular" /> {animCategory}
                </button>
              )}

              {animTab && !animCategory && !templateSearch ? (
                <div className="w-full pr-4">
                  <AnimCategoryList categories={PARAM_CATEGORIES} templates={PARAM_ALL} onPick={setAnimCategory} />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 w-full flex-1 py-8">
                  <CardsThree size={40} weight="fill" className="folder-enter text-[#D9D9D9] dark:text-[#3A3A40]" />
                  <span className="text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] text-center px-4 leading-4">
                    No templates match your search
                  </span>
                </div>
              ) : videoTplMode && toolbarMode === "frame" ? (
                <FadeScrollerY wrapClassName="w-full flex-1" className="grid grid-cols-2 gap-1 w-full content-start pr-2">
                  {filteredTemplates.map((tpl, i) => (
                    <FrameVideoTemplateCard
                      key={tpl.id}
                      tpl={tpl}
                      index={i}
                      label={tpl.label}
                      active={vidTplId === tpl.id}
                      renderKey={`${animTab ? assetPoolRef.current.map((a) => a?.url ?? "").join("|") : frames.map((f) => `${f.id}:${f.img?.cropUrl ?? f.img?.url ?? ""}`).join("|")}|${canvasSize}|${customWidth}x${customHeight}`}
                      renderStill={renderParamStill}
                      prepareLive={prepareFrameLive}
                      onApply={applyVideoTemplate}
                    />
                  ))}
                </FadeScrollerY>
              ) : videoTplMode ? (
                <FadeScrollerY wrapClassName="w-full flex-1" className="grid grid-cols-2 gap-1 w-full content-start pr-2">
                  {filteredTemplates.map((tpl, i) => (
                    <VideoTemplateCard
                      key={tpl.id}
                      tpl={tpl}
                      index={i}
                      label={tpl.label}
                      active={vidTplId === tpl.id}
                      renderKey={`${deviceType}|${finish}|${bodyHex}|${bodyOpacity}|${deviceOrientation}|${uploadedMediaThumb}`}
                      renderStills={renderVideoStills}
                      onApply={applyVideoTemplate}
                    />
                  ))}
                </FadeScrollerY>
              ) : (
                <FadeScrollerY wrapClassName="w-full flex-1" className="grid grid-cols-2 gap-1 w-full content-start items-start pr-2">
                  {filteredTemplates.map((tpl, i) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        if (toolbarMode === "frame") handleApplyFrameTemplate(tpl);
                        else handleApplyTemplate(tpl);
                        setActiveTemplateId(tpl.id);
                      }}
                      style={{ animationDelay: `${Math.min(i, 5) * 30}ms` }}
                      className={`template-enter group flex flex-col items-start gap-2 w-full min-w-0 p-2 rounded-2xl transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
                                <Skeleton className="absolute inset-0" />
                              )}
                            </div>
                            <div className="flex items-center w-full">
                              <span
                                className={`tpl-title flex-1 min-w-0 text-left leading-4 truncate transition-colors duration-150 ${
                                  activeTemplateId === tpl.id
                                    ? "text-[#FF47BC]"
                                    : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                                }`}
                              >
                                {tpl.label}
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
  className={`sidebar-panel absolute inset-0 flex flex-col items-start gap-3 py-4 pl-4 pr-0 w-full h-full transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    sidebarPanel === "projects" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
  }`}
>
              <div className="w-full pr-4">
                <SearchField placeholder="Search projects" />
              </div>

              {liveProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 w-full flex-1 py-8">
                  <Folder size={40} weight="fill" className="folder-enter text-[#D9D9D9] dark:text-[#3A3A40]" />
                  <span className="text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] text-center px-4 leading-4">
                    No projects yet — save one to see it here
                  </span>
                </div>
              ) : (
                <FadeScrollerY wrapClassName="w-full flex-1" className="flex flex-col items-start w-full gap-1 pr-2">
{liveProjects.slice(0, 10).map((p) => (
  <ProjectCard
    key={p.id}
    p={p}
    selected={selectedProjectId === p.id}
    onOpen={openProject}
    onMenu={toggleProjectMenu}
    menuOpen={projectMenu?.id === p.id}
    renaming={renamingProjectId === p.id}
    renameDraft={renameDraft}
    onRenameDraft={setRenameDraft}
    onRenameCommit={commitRenameProject}
    onRenameCancel={() => { renameCancelRef.current = true; }}
  />
))}
                </FadeScrollerY>
              )}

<Tooltip label="View all projects" placement="vertical" className="w-[calc(100%-1rem)] shrink-0">
  <button
    onClick={() => {
      setProjectMenu(null);
      setProjectsPageOpen(true);
    }}
    className="w-full h-8 shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] hover:bg-[#F230AE] transition-[background-color,transform] duration-150 active:scale-[0.97]"
    style={{ boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" }}
  >
    All projects
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
                    {...(animTab ? {} : canvasDrop.dropProps)}
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
                        onFramesChange={(u) => { markFrameEdit(); setFrames(u); }}
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
                        fishCanvasRef={fishCanvasRef}
                        useFishCanvas={useFishCanvas}
                        playing={vidPlaying || vidExporting}
                        locked={animTab}
                        markIds={[animSel, animHover].filter((i) => i != null && frames[i]).map((i) => frames[i].id)}
                        onFrameHover={(id) => setAnimHover(id == null ? null : frames.findIndex((f) => f.id === id))}
                        onFrameClick={(id) => setAnimSel(id == null ? null : frames.findIndex((f) => f.id === id))}
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

                    {(() => {
                      let pb = null, onChange = null;
                      if (toolbarMode === "mockup") {
                        pb = mockupEffects.find((x) => x.id === openEffectId && x.visible && x.type === "layerBlur" && x.mode === "progressive");
                        if (pb) onChange = (patch) => updateEffect(pb.id, patch);
                      } else if (animTab && activeParamTpl && animFxId != null) {
                        const fx = animFxList(activeParamTpl).find((x) => x.id === animFxId);
                        if (fx && fx.on && fx.type === "blur" && fx.mode === "Progressive") {
                          pb = fx;
                          onChange = (patch) => patchAnimFx(activeParamTpl, fx.id, patch);
                        }
                      }
                      if (!pb || !canvasDims) return null;
                      return (
                        <PbHandles
                          width={canvasDims.w} height={canvasDims.h}
                          {...pbPts(pb)}
                          onChange={onChange}
                        />
                      );
                    })()}

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
        {saving ? (
          <CircleNotch size={16} weight="regular" className="shrink-0 animate-spin text-[#FF47BC]" />
        ) : (
          <FloppyDisk size={16} weight="regular" className="shrink-0" />
        )}
        {saving ? "Saving…" : "Save project"}
      </button>
    </Tooltip>
    <Tooltip label={saveMenuOpen ? "" : "Save options"} placement="bottom">
      <button
        type="button"
        aria-label="Save options"
        aria-haspopup="menu"
        aria-expanded={saveMenuOpen}
        onClick={() => setSaveMenuOpen((v) => !v)}
        className="group flex items-center justify-center w-[30px] pr-[2px] h-8 -ml-px shrink-0 rounded-r-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] transition-[background-color,transform] duration-150 active:scale-[0.97]"
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

{(fxBusy || mediaLoading > 0 || saving) && (
  <div
    role="status"
    aria-live="polite"
    className="pop-enter pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 h-8 px-3 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]"
  >
    <CircleNotch size={14} weight="regular" className="animate-spin text-[#FF47BC]" />
    {saving ? "Saving project…" : mediaLoading > 0 ? "Loading media…" : "Rendering filters…"}
  </div>
)}

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
              { key: "mockup", label: "Mockup", k: "M" },
              { key: "frame", label: "Frame", k: "F" },
              { key: "animation", label: "Animation", k: "A" },
            ].map((t) => {
              const active = tabKey === t.key;
              return (
                <Tooltip key={t.key} label={t.label} shortcut={[t.k]} placement="bottom">
                <button
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectTab(t.key)}
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
  Media{videoOn && vidTargetShot ? ` · ${vidTargetShot.name}` : ""}
</span>

<div className={toolbarMode === "frame" ? "hidden" : "contents"}>
{mediaLoading > 0 && !mediaThumb ? (
  <Skeleton className="w-full h-[66px] rounded-[10px]" />
) : mediaThumb ? (
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
                    className="relative w-12 h-12 rounded-lg shrink-0 bg-cover bg-center bg-[#EDEDED] overflow-hidden"
                    style={{ backgroundImage: `url(${mediaThumb})` }}
                  >
                    {mediaLoading > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <CircleNotch size={16} weight="regular" className="animate-spin text-white" />
                      </div>
                    )}
                  </div>
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
                className={`${animTab ? "hidden " : ""}w-full h-[66px] border border-dashed rounded-[10px] flex flex-col items-center justify-center gap-1 transition-colors ${
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
              {!animTab && (
                <button
                  type="button"
                  onClick={addBlankFrame}
                  className="w-full h-8 flex items-center justify-center gap-2 pl-2 pr-2.5 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]"
                >
                  <Plus size={14} weight="regular" className="shrink-0" /> Add frame
                </button>
              )}
              {animTab ? renderAnimAssets() : renderFrameAssets()}
            </div>
            <input ref={fileInputRef} type="file" accept={imageOrVideo === "video" ? "image/*,video/*" : "image/*"} onChange={handleUpload} className="hidden" />
          </div>

{animTab && (
  <div className="flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
    <SectionHeader label="Controls" open={openSections.controls} onToggle={() => toggleSection("controls")} />
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        openSections.controls ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <div className="pt-4 flex flex-col gap-2">
          {activeParamTpl ? (
            <TemplateParams
              params={activeParamTpl.params.filter((p) => p.section == null)}
              values={{ ...defaultParams(activeParamTpl.params), ...tplParams[activeParamTpl.id] }}
              onChange={(k, v) => changeTplParam(activeParamTpl, k, v)}
            />
          ) : (
            <span className="text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
              Pick a template on the left to see its controls
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
)}

{/* Motion (Animation tab only) */}
{animTab && activeParamTpl && activeParamTpl.params.some((p) => p.section === "motion") && (
  <div className="order-1 flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
    <SectionHeader label="Motion" open={openSections.motion} onToggle={() => toggleSection("motion")} />
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        openSections.motion ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <div className="pt-4 flex flex-col gap-2">
          <TemplateParams
            params={activeParamTpl.params.filter((p) => p.section === "motion")}
            values={{ ...defaultParams(activeParamTpl.params), ...tplParams[activeParamTpl.id] }}
            onChange={(k, v) => changeTplParam(activeParamTpl, k, v)}
          />
        </div>
      </div>
    </div>
  </div>
)}

{/* Effects (Animation tab only) */}
{animTab && activeParamTpl && (() => {
  const tpl = activeParamTpl;
  const list = animFxList(tpl);
  return (
    <div className="order-6 flex flex-col p-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <SectionHeader label="Effects" open={openSections.effects} onToggle={() => toggleSection("effects")} />
        </div>
        <Tooltip label="Add effect" placement="bottom" className="shrink-0">
          <button
            type="button"
            data-fx-add
            aria-label="Add effect"
            aria-haspopup="menu"
            aria-expanded={!!fxMenu}
            onClick={(e) => {
              if (fxMenu) return setFxMenu(null);
              fxMenuAnchorRef.current = e.currentTarget;
              setFxMenu(placeFxMenu("anim"));
            }}
            className={`flex items-center justify-center w-6 h-6 rounded-md transition-[background-color,transform] duration-150 active:scale-[0.94] ${
              fxMenu ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Plus size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
          </button>
        </Tooltip>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          openSections.effects ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className={`${list.length ? "pt-4" : ""} flex flex-col gap-1`}>
            {list.map((x) => {
              const key = `anim:${x.id}`;
              const { Icon, label } = fxMeta(x.type);
              const active = openEffectId === key || list.length === 1;
              return (
                <div
                  key={x.id}
                  ref={(el) => { effectRowRefs.current[key] = el; }}
                  data-effect-trigger
                  className={`group fx-enter flex items-center h-8 pl-2 pr-1 gap-1 rounded-lg transition-[background-color,opacity] duration-100 ease-in-out ${
                    active ? "bg-[#FF47BC]/10" : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleEffectPopup(key)}
                    className={`flex-1 min-w-0 h-full flex items-center gap-2 text-left text-[12px] font-medium tracking-[-0.005em] ${
                      active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                    } ${x.on ? "" : "opacity-50"}`}
                  >
                    <Icon size={16} weight="regular" className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                  <Tooltip label={x.on ? "Hide" : "Show"} placement="bottom" className="shrink-0">
                    <button
                      type="button"
                      aria-label={x.on ? "Hide" : "Show"}
                      onClick={() => patchAnimFx(tpl, x.id, { on: !x.on })}
                      className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                    >
                      {x.on ? (
                        <Eye size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
                      ) : (
                        <EyeSlash size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
                      )}
                    </button>
                  </Tooltip>
                  <Tooltip label="Remove" placement="bottom" className="shrink-0">
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => {
                        if (active) closeEffectPopup();
                        removeAnimFx(tpl, x.id);
                      }}
                      className="group/x flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                    >
                      <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover/x:text-[#F04438] transition-colors" />
                    </button>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
})()}

{/* Position (Frame mode only) */}
<div className={`flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${toolbarMode === "frame" && !animTab ? "" : "hidden"}`}>
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

<FrameAppearance
  toolbarMode={animTab ? "animation" : toolbarMode}
  openSections={openSections}
  toggleSection={toggleSection}
  frameWidth={frameWidth}
  frameHeight={frameHeight}
  frameWMixed={frameWMixed}
  frameHMixed={frameHMixed}
  frameAspectLocked={frameAspectLocked}
  handleFrameWidthChange={handleFrameWidthChange}
  handleFrameHeightChange={handleFrameHeightChange}
  toggleFrameAspectLock={toggleFrameAspectLock}
  frameCorners={frameCorners}
  frameRadius={frameRadius}
  setFrameCorners={setFrameCorners}
  setFrameRadius={setFrameRadius}
  frameStroke={frameStroke}
  updateStroke={updateStroke}
  frameEffects={frameEffects}
  effectRowRefs={effectRowRefs}
  openEffectId={openEffectId}
  toggleEffectPopup={toggleEffectPopup}
  updateEffect={updateEffect}
  removeEffect={removeEffect}
  openFrameFxMenu={openFrameFxMenu}
  handleSwatchClick={handleSwatchClick}
  makePercentDrag={makePercentDrag}
/>

{!animTab && <FrameScreenInterface
  toolbarMode={toolbarMode}
  openSections={openSections}
  toggleSection={toggleSection}
  frameStatusBar={frameStatusBar}
  setFrameStatusBar={setFrameStatusBar}
  frameHomeIndicator={frameHomeIndicator}
  setFrameHomeIndicator={setFrameHomeIndicator}
  frameSocial={frameSocial}
  toggleSocialOn={toggleSocialOn}
  changeSocialPlatform={changeSocialPlatform}
  changeSocialMode={changeSocialMode}
  activeSocialPlatform={activeSocialPlatform}
  activeSocialMode={activeSocialMode}
  updateSocial={updateSocial}
  avatarInputRef={avatarInputRef}
  handleAvatarUpload={handleAvatarUpload}
/>}

<DevicePanel
  toolbarMode={toolbarMode}
  openSections={openSections}
  toggleSection={toggleSection}
  deviceType={deviceType}
  deviceCategory={deviceCategory}
  setDeviceType={setDeviceType}
  isTablet={isTablet}
  isWatch={isWatch}
  deviceOrientation={deviceOrientation}
  setDeviceOrientation={setDeviceOrientation}
  finish={finish}
  finishOptions={finishOptions}
  handleFinishChange={handleFinishChange}
  bodyHex={bodyHex}
  bodyOpacity={bodyOpacity}
  setBodyHex={setBodyHex}
  setBodyOpacity={setBodyOpacity}
  strap={strap}
  setStrap={setStrap}
  strapStyle={strapStyle}
  setStrapStyle={setStrapStyle}
  reflectionMode={reflectionMode}
  handleReflectionModeChange={handleReflectionModeChange}
  reflectionShiny={reflectionShiny}
  reflectionMatte={reflectionMatte}
  handleReflectionIntensityChange={handleReflectionIntensityChange}
  brightness={brightness}
  handleBrightnessChange={handleBrightnessChange}
  lighting={lighting}
  handleLightingChange={handleLightingChange}
  lightingIntensity={lightingIntensity}
  handleLightingIntensityChange={handleLightingIntensityChange}
  handleSwatchClick={handleSwatchClick}
  makePercentDrag={makePercentDrag}
/>

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
          <div className={`order-3 flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${animTab ? "hidden" : ""}`}>
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
          <div className={`order-2 flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${toolbarMode === "mockup" ? "border-t" : ""}`}>
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
                        hex={activeAnimFx ? activeAnimFx.hex : pickerHex}
                        opacity={activeAnimFx ? activeAnimFx.opacity : pickerOpacity}
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

                  {(bgType === "gradient" || bgType === "custom") && (
                    <div className="flex flex-col gap-2">
                      <div data-fx-add>
                        <AppearanceHeader label="Filters" onClick={openGradFxMenu}>
                          <Plus size={16} weight="regular" />
                        </AppearanceHeader>
                      </div>
                      <div className={gradRows.length ? "flex flex-col gap-1" : "hidden"}>
                        {gradRows.map((fx) => {
                          const key = `gfx:${fx.id}`;
                          const Icon = GRAD_FX_ICON[fx.type] ?? Drop;
                          const label = GRAD_FX_TYPES.find((o) => o.value === fx.type)?.label;
                          const active = openEffectId === key || gradRows.length === 1;
                          const isGrain = fx.id === "grain";
                          return (
                            <div
                              key={fx.id}
                              ref={(el) => { effectRowRefs.current[key] = el; }}
                              data-effect-trigger
                              className={`group fx-enter flex items-center h-8 pl-2 pr-1 gap-1 rounded-lg transition-[background-color,opacity] duration-100 ease-in-out ${
                                active ? "bg-[#FF47BC]/10" : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleEffectPopup(key)}
                                className={`flex-1 min-w-0 h-full flex items-center gap-2 text-left text-[12px] font-medium tracking-[-0.005em] ${
                                  active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                                } ${fx.visible ? "" : "opacity-50"}`}
                              >
                                <Icon size={16} weight="regular" className="shrink-0" />
                                <span className="truncate">{label}</span>
                              </button>
                              {!isGrain && (
                                <Tooltip label={fx.visible ? "Hide" : "Show"} placement="bottom" className="shrink-0">
                                  <button
                                    type="button"
                                    aria-label={fx.visible ? "Hide" : "Show"}
                                    onClick={() => updateGradFx(fx.id, { visible: !fx.visible })}
                                    className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                                  >
                                    {fx.visible ? (
                                      <Eye size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
                                    ) : (
                                      <EyeSlash size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
                                    )}
                                  </button>
                                </Tooltip>
                              )}
                              <Tooltip label="Remove" placement="bottom" className="shrink-0">
                                <button
                                  type="button"
                                  aria-label="Remove"
                                  onClick={() => removeGradFx(fx.id)}
                                  className="group/x flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                                >
                                  <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover/x:text-[#F04438] transition-colors" />
                                </button>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
          <div className={`order-5 flex flex-col p-4 ${toolbarMode === "mockup" || (animTab && activeParamTpl) ? "border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10" : ""}`}>
<SectionHeader label="Text" open={openSections.text} onToggle={() => toggleSection("text")} />

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.text ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-1">
                  {modeTexts.map((t) => {
                    const active = t.id === selectedTextId && textPopupOpen;
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
                            ? "bg-[#FF47BC]/10"
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
                              ? "text-[#FF47BC]"
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
                              <EyeSlash size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
                            ) : (
                              <Eye size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
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

          {/* Effects (Mockup tab only) */}
          <div className={`order-6 flex flex-col p-4 ${toolbarMode === "mockup" ? "" : "hidden"}`}>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <SectionHeader label="Effects" open={openSections.effects} onToggle={() => toggleSection("effects")} />
              </div>
              <Tooltip label="Add effect" placement="bottom" className="shrink-0">
                <button
                  type="button"
                  data-fx-add
                  aria-label="Add effect"
                  aria-haspopup="menu"
                  aria-expanded={!!fxMenu}
                  onClick={(e) => {
                    if (fxMenu) return setFxMenu(null);
                    fxMenuAnchorRef.current = e.currentTarget;
                    setFxMenu(placeFxMenu("mockup"));
                  }}
                  className={`flex items-center justify-center w-6 h-6 rounded-md transition-[background-color,transform] duration-150 active:scale-[0.94] ${
                    fxMenu ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <Plus size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                </button>
              </Tooltip>
            </div>
            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.effects ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className={`${mockupEffects.length ? "pt-4" : ""} flex flex-col gap-1`}>
                  {mockupEffects.map((fx) => {
                    const Icon = FX_ICON[fx.type] ?? Drop;
                    const label = ALL_EFFECT_OPTIONS.find((o) => o.value === fx.type)?.label;
                    const active = openEffectId === fx.id || mockupEffects.length === 1;
                    return (
                      <div
                        key={fx.id}
                        ref={(el) => { effectRowRefs.current[fx.id] = el; }}
                        data-effect-trigger
                        className={`group fx-enter flex items-center h-8 pl-2 pr-1 gap-1 rounded-lg transition-[background-color,opacity] duration-100 ease-in-out ${
                          active ? "bg-[#FF47BC]/10" : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleEffectPopup(fx.id)}
                          className={`flex-1 min-w-0 h-full flex items-center gap-2 text-left text-[12px] font-medium tracking-[-0.005em] ${
                            active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                          } ${fx.visible ? "" : "opacity-50"}`}
                        >
                          <Icon size={16} weight="regular" className="shrink-0" />
                          <span className="truncate">{label}</span>
                        </button>
                        <Tooltip label={fx.visible ? "Hide" : "Show"} placement="bottom" className="shrink-0">
                          <button
                            type="button"
                            aria-label={fx.visible ? "Hide" : "Show"}
                            onClick={() => updateEffect(fx.id, { visible: !fx.visible })}
                            className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                          >
                            {fx.visible ? (
                              <Eye size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
                            ) : (
                              <EyeSlash size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
                            )}
                          </button>
                        </Tooltip>
                        <Tooltip label="Remove" placement="bottom" className="shrink-0">
                          <button
                            type="button"
                            aria-label="Remove"
                            onClick={() => removeEffect(fx.id)}
                            className="group/x flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                          >
                            <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover/x:text-[#F04438] transition-colors" />
                          </button>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          </FadeScrollerY>
        </div>
      </div>

      {fxMenu && (
        <div
          ref={fxMenuRef}
          data-fx-menu
          role="menu"
          style={{ position: "fixed", right: fxMenu.right, ...(fxMenu.up ? { bottom: fxMenu.bottom } : { top: fxMenu.top }) }}
          className="pop-enter w-[180px] p-2 flex flex-col gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
        >
          {(fxMenu.kind === "gradient" ? GRAD_FX_LIST : fxMenu.kind === "frame" ? FRAME_FX : fxMenu.kind === "mockup" ? MOCKUP_FX : FX_TYPES).map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                if (fxMenu.kind === "gradient") addGradFx(type);
                else if (fxMenu.kind === "frame" || fxMenu.kind === "mockup") addEffect(type);
                else if (animTplRef.current) addAnimFx(animTplRef.current, type);
                setFxMenu(null);
              }}
              className="group flex items-center w-full h-8 pl-2 pr-2 gap-2 rounded-lg text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
            >
              <Icon size={16} weight="regular" className="shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}

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
              className="flex items-center justify-between w-full h-8 pl-2 pr-2 gap-4 rounded-lg text-[12px] font-medium tracking-[-0.005em] whitespace-nowrap text-[#8C8C8C] dark:text-[#9A9A9A] enabled:hover:text-[#3A3A3A] dark:enabled:hover:text-[#FAF9FA] enabled:hover:bg-[#F2F2F2] dark:enabled:hover:bg-[#1F1F1F] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
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
          "flex items-center gap-2 w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100";
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
            {p.deletedAt ? (
              <div className="flex flex-col gap-1 w-full">
                <button type="button" className={itemClass} onClick={run(() => handleRestoreProject(p.id))}>
                  <ArrowCounterClockwise size={16} weight="regular" className="shrink-0" /> Restore
                </button>
                <button
                  type="button"
                  onClick={run(() => handlePurgeProject(p.id))}
                  className={`${itemClass} hover:!bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438]`}
                >
                  <X size={16} weight="regular" className="shrink-0" /> Delete permanently
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1 w-full">
                  <button type="button" className={itemClass} onClick={run(() => handleOpenProjectInNewTab(p))}>
                    <ArrowSquareOut size={16} weight="regular" className="shrink-0" /> Open in new tab
                  </button>
                  <button type="button" className={itemClass} onClick={run(() => handleCopyProjectLink(p))}>
                    <LinkSimple size={16} weight="regular" className="shrink-0" /> Copy link
                  </button>
                  <button type="button" className={itemClass} onClick={run(() => handleTogglePin(p.id))}>
                    <PushPin size={16} weight={p.pinned ? "fill" : "regular"} className="shrink-0" /> {p.pinned ? "Unpin" : "Pin"}
                  </button>
                </div>
                <div className="my-1 h-px w-full bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />
                <div className="flex flex-col gap-1 w-full">
                  <button type="button" className={itemClass} onClick={run(() => handleDuplicateProject(p))}>
                    <Copy size={16} weight="regular" className="shrink-0" /> Duplicate
                  </button>
                  <button type="button" className={itemClass} onClick={run(() => startRenameProject(p))}>
                    <PencilSimple size={16} weight="regular" className="shrink-0" /> Rename
                  </button>
                </div>
                <div className="my-1 h-px w-full bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />
                <div className="flex flex-col gap-1 w-full">
                  <button
                    type="button"
                    onClick={run(() => handleDeleteProject(p.id))}
                    className={`${itemClass} hover:!bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438]`}
                  >
                    <TrashSimple size={16} weight="regular" className="shrink-0" /> Move to Trash
                  </button>
                </div>
              </>
            )}
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
      options={toolbarMode === "mockup" ? MOCKUP_FX_OPTIONS : FRAME_FX_OPTIONS}
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
        <>
          <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
            {[["uniform", "Uniform"], ["progressive", "Progressive"]].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => updateEffect(openEffect.id, { mode: v })}
                className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  (openEffect.mode ?? "uniform") === v ? SEG_ON : SEG_OFF
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {openEffect.mode === "progressive" ? (
            <>
              <Scrubber label="Start blur" value={openEffect.startBlur ?? 0} min={0} max={100} onChange={(startBlur) => updateEffect(openEffect.id, { startBlur })} />
              <Scrubber label="End blur" value={openEffect.blur} min={0} max={100} onChange={(blur) => updateEffect(openEffect.id, { blur })} />
              <Scrubber
                label="Angle"
                value={pbAngle(openEffect, canvasDims?.w || 1, canvasDims?.h || 1)}
                min={-180} max={180}
                onChange={(a) => updateEffect(openEffect.id, pbRotate(openEffect, canvasDims?.w || 1, canvasDims?.h || 1, a))}
              />
            </>
          ) : (
            <Scrubber label="Blur" value={openEffect.blur} min={0} max={100} onChange={(blur) => updateEffect(openEffect.id, { blur })} />
          )}
        </>
      )}
      {openEffect.type === "noise" && (
        <>
          <Scrubber label="Amount" value={openEffect.amount} min={0} max={100} onChange={(amount) => updateEffect(openEffect.id, { amount })} />
          <Scrubber label="Size" value={openEffect.size} min={1} max={20} onChange={(size) => updateEffect(openEffect.id, { size })} />
        </>
      )}
      <EffectControls
        type={openEffect.type}
        value={openEffect}
        onChange={(patch) => updateEffect(openEffect.id, patch)}
        onSwatch={handleSwatchClick}
        colorTarget={`fx-${openEffect.id}`}
        makePercentDrag={makePercentDrag}
      />
    </div>
  </div>
)}

      {animFxId != null && effectPopupPos && activeParamTpl && (() => {
        const tpl = activeParamTpl;
        const fx = animFxList(tpl).find((x) => x.id === animFxId);
        if (!fx) return null;
        const { Icon, label } = fxMeta(fx.type);
        const set = (patch) => patchAnimFx(tpl, fx.id, patch);
        return (
          <div
            ref={effectPopupRef}
            style={{ position: "fixed", top: effectPopupPos.top, right: effectPopupPos.right }}
            className="panel-enter w-[240px] px-3 pb-3 flex flex-col gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
          >
            <div className="-mx-3 mb-1 flex items-center justify-between h-11 pl-4 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
              <span className="flex items-center gap-2 text-[14px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                <Icon size={16} weight="regular" className="shrink-0" />
                {label}
              </span>
              <button
                type="button"
                onClick={closeEffectPopup}
                aria-label="Close"
                className="group flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
              </button>
            </div>
            {fx.type === "fade" && <Scrubber label="Fade" value={fx.fade} min={0} max={100} onChange={(fade) => set({ fade })} />}
            {fx.type === "blur" && (
              <>
                <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
                  {["Uniform", "Progressive"].map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => set({ mode: o })}
                      className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        fx.mode === o ? SEG_ON : SEG_OFF
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                {fx.mode === "Progressive" ? (
                  <>
                    <Scrubber label="Start blur" value={fx.startBlur ?? 0} min={0} max={100} onChange={(startBlur) => set({ startBlur })} />
                    <Scrubber label="End blur" value={fx.blur} min={0} max={100} onChange={(blur) => set({ blur })} />
                    <Scrubber
                      label="Angle"
                      value={pbAngle(fx, canvasDims?.w || 1, canvasDims?.h || 1)}
                      min={-180} max={180}
                      onChange={(a) => set(pbRotate(fx, canvasDims?.w || 1, canvasDims?.h || 1, a))}
                    />
                  </>
                ) : (
                  <Scrubber label="Blur" value={fx.blur} min={0} max={100} onChange={(blur) => set({ blur })} />
                )}
              </>
            )}
            <EffectControls
              type={fx.type}
              value={fx}
              onChange={set}
              onSwatch={handleSwatchClick}
              colorTarget={`afx-${fx.id}`}
              makePercentDrag={makePercentDrag}
            />
          </div>
        );
      })()}

            {activeGradFx && effectPopupPos && (() => {
        const fx = activeGradFx;
        const Icon = GRAD_FX_ICON[fx.type] ?? Drop;
        const set = (patch) => updateGradFx(fx.id, patch);
        return (
          <div
            ref={effectPopupRef}
            style={{ position: "fixed", top: effectPopupPos.top, right: effectPopupPos.right, maxHeight: "82vh" }}
            className="panel-enter w-[240px] px-3 pb-3 flex flex-col gap-2 overflow-y-auto custom-scroll bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
          >
            <div className="-mx-3 mb-1 flex items-center justify-between h-11 pl-4 pr-2 shrink-0 sticky top-0 z-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
              <span className="flex items-center gap-2 text-[14px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                <Icon size={16} weight="regular" className="shrink-0" />
                Filter
              </span>
              <button
                type="button"
                onClick={closeEffectPopup}
                aria-label="Close"
                className="group flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
              </button>
            </div>
            <PopupDropdown value={fx.type} options={GRAD_FX_OPTIONS} onChange={(t) => changeGradFxType(fx.id, t)} />
            <div className={`flex flex-col gap-2 transition-opacity duration-200 ${fx.visible ? "opacity-100" : "opacity-40"}`}>
              {fx.type === "grain" ? (
                <>
                  <PopupDropdown value={grainType} options={GRAIN_TYPES} onChange={setGrainType} />
                  <Scrubber label="Amount" value={grainAmount} min={1} max={100} onChange={setGrainAmount} />
                  {grainType !== "noise" && (
                    <>
                      <Scrubber label="Scale" value={grainScale} min={20} max={300} onChange={setGrainScale} />
                      <PopupDropdown value={grainBlend} options={GRAIN_BLENDS} onChange={setGrainBlend} />
                    </>
                  )}
                </>
              ) : fx.type === "halftone" ? (
                <>
                  <PopupDropdown value={fx.halftoneType ?? 0} options={HALFTONE_PATTERNS} onChange={(halftoneType) => set({ halftoneType })} />
                  <PopupDropdown value={fx.colorMode ?? 0} options={HALFTONE_COLOR_MODES} onChange={(colorMode) => set({ colorMode })} />
                  <Scrubber label="Dot size" value={fx.dotSize ?? 20} min={4} max={120} onChange={(dotSize) => set({ dotSize })} />
                  <Scrubber label="Dot scale" value={fx.dotScale ?? 100} min={0} max={200} onChange={(dotScale) => set({ dotScale })} />
                  <Scrubber label="Softness" value={fx.softness ?? 0} min={0} max={100} onChange={(softness) => set({ softness })} />
                  <Scrubber label="Rotation" value={fx.angle} min={-180} max={180} onChange={(angle) => set({ angle })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                </>
              ) : fx.type === "dither" ? (
                <>
                  <PopupDropdown value={fx.ditherStyle ?? "Bayer 16x16"} options={DITHER_STYLES} onChange={(ditherStyle) => set({ ditherStyle })} />
                  <Scrubber label="Size" value={fx.pixelSize ?? 2} min={1} max={8} onChange={(pixelSize) => set({ pixelSize })} />
                  <Scrubber label="Levels" value={fx.levels ?? 3} min={2} max={8} onChange={(levels) => set({ levels })} />
                  <Scrubber label="Brightness" value={fx.brightness ?? 100} min={0} max={200} onChange={(brightness) => set({ brightness })} />
                  <Scrubber label="Contrast" value={fx.contrast ?? 100} min={50} max={200} onChange={(contrast) => set({ contrast })} />
                  <ToggleRow label="Mono" checked={!!fx.mono} onChange={(mono) => set({ mono })} />
                  {fx.mono && (
                    <ColorOpacityField
                      hex={fx.monoHex ?? "FFFFFF"}
                      opacity={100}
                      onHexChange={(monoHex) => set({ monoHex })}
                      onOpacityChange={() => {}}
                      onSwatchClick={() => handleSwatchClick("gfx-mono")}
                      makePercentDrag={makePercentDrag}
                    />
                  )}
                </>
              ) : fx.type === "lens" ? (
                <>
                  <PopupDropdown value={fx.lensMode ?? 0} options={LENS_MODES} onChange={(lensMode) => set({ lensMode })} />
                  <PopupDropdown value={fx.lensQuality ?? 1} options={LENS_QUALITY} onChange={(lensQuality) => set({ lensQuality })} />
                  <Scrubber label="Distortion" value={fx.distortion ?? 50} min={0} max={100} onChange={(distortion) => set({ distortion })} />
                  <Scrubber label="Aberration" value={fx.aberration ?? 20} min={0} max={100} onChange={(aberration) => set({ aberration })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                </>
              ) : fx.type === "warp" ? (
                <>
                  <PopupDropdown value={fx.warpMode ?? 0} options={WARP_MODES} onChange={(warpMode) => set({ warpMode })} />
                  <Scrubber label="Amplitude" value={fx.amplitude ?? 15} min={0} max={100} onChange={(amplitude) => set({ amplitude })} />
                  <Scrubber label="Scale" value={fx.warpScale ?? 20} min={0} max={100} onChange={(warpScale) => set({ warpScale })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                </>
              ) : fx.type === "pixelate" ? (
                <>
                  <PopupDropdown value={fx.pixelShape ?? 0} options={PIXEL_SHAPES} onChange={(pixelShape) => set({ pixelShape })} />
                  <Scrubber label="Size" value={fx.size ?? 10} min={2} max={100} onChange={(size) => set({ size })} />
                  <Scrubber label="Stretch" value={fx.stretch ?? 100} min={0} max={2000} onChange={(stretch) => set({ stretch })} />
                  <Scrubber label="Gap" value={fx.gap ?? 0} min={0} max={50} onChange={(gap) => set({ gap })} />
                  <Scrubber label="Color trim" value={fx.colorTrim ?? 2} min={2} max={16} onChange={(colorTrim) => set({ colorTrim })} />
                  <Scrubber label="Average color" value={fx.averageColor ?? 80} min={0} max={100} onChange={(averageColor) => set({ averageColor })} />
                  <PopupDropdown value={fx.dissolveMode ?? 0} options={DISSOLVE_MODES} onChange={(dissolveMode) => set({ dissolveMode })} />
                  <Scrubber label="Dissolve" value={fx.dissolve ?? 0} min={0} max={100} onChange={(dissolve) => set({ dissolve })} />
                  <Scrubber label="Falloff" value={fx.falloff ?? 0} min={0} max={100} onChange={(falloff) => set({ falloff })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                  <Scrubber label="Radius" value={fx.radius ?? 75} min={0} max={200} onChange={(radius) => set({ radius })} />
                  <Scrubber label="Angle" value={fx.angle ?? 90} min={-180} max={180} onChange={(angle) => set({ angle })} />
                  <ToggleRow label="Knockout" checked={fx.knockout ?? true} onChange={(knockout) => set({ knockout })} />
                </>
              ) : fx.type === "hatching" ? (
                <>
                  <PopupDropdown value={fx.hatchMode ?? 1} options={HATCH_PATTERNS} onChange={(hatchMode) => set({ hatchMode })} />
                  <Scrubber label="Density" value={fx.density ?? 100} min={0} max={200} onChange={(density) => set({ density })} />
                  <Scrubber label="Softness" value={fx.softness ?? 0} min={0} max={100} onChange={(softness) => set({ softness })} />
                  <Scrubber label="Frequency" value={fx.waveFreq ?? 28} min={0} max={200} onChange={(waveFreq) => set({ waveFreq })} />
                  <Scrubber label="Amplitude" value={fx.waveAmp ?? 23} min={0} max={1000} onChange={(waveAmp) => set({ waveAmp })} />
                  <Scrubber label="Offset X" value={fx.offsetX ?? 0} min={0} max={100} onChange={(offsetX) => set({ offsetX })} />
                  <Scrubber label="Offset Y" value={fx.offsetY ?? 0} min={0} max={100} onChange={(offsetY) => set({ offsetY })} />
                  <ColorOpacityField
                    hex={fx.bgHex ?? "0A5D37"}
                    opacity={fx.bgOpacity ?? 100}
                    labelText="Background"
                    onHexChange={(bgHex) => set({ bgHex })}
                    onOpacityChange={(bgOpacity) => set({ bgOpacity })}
                    onSwatchClick={() => handleSwatchClick("gfx-bg")}
                    makePercentDrag={makePercentDrag}
                  />
                  <ColorOpacityField
                    hex={fx.fgHex ?? "C7F8F8"}
                    opacity={fx.fgOpacity ?? 100}
                    labelText="Foreground"
                    onHexChange={(fgHex) => set({ fgHex })}
                    onOpacityChange={(fgOpacity) => set({ fgOpacity })}
                    onSwatchClick={() => handleSwatchClick("gfx-fg")}
                    makePercentDrag={makePercentDrag}
                  />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                  <Scrubber label="Line width" value={fx.lineWidth ?? 8} min={1} max={100} onChange={(lineWidth) => set({ lineWidth })} />
                  <Scrubber label="Angle" value={fx.angle ?? 90} min={-180} max={180} onChange={(angle) => set({ angle })} />
                </>
              ) : fx.type === "pistons" ? (
                <>
                  <Scrubber label="Columns" value={fx.cols ?? 60} min={10} max={150} onChange={(cols) => set({ cols })} />
                  <Scrubber label="Gap" value={fx.gap ?? 18} min={2} max={50} onChange={(gap) => set({ gap })} />
                  <Scrubber label="Min bar width" value={fx.minBar ?? 5} min={0} max={50} onChange={(minBar) => set({ minBar })} />
                  <Scrubber label="Highlight" value={fx.highlight ?? 25} min={0} max={60} onChange={(highlight) => set({ highlight })} />
                </>
              ) : fx.type === "asciiwave" ? (
                <>
                  <Scrubber label="Rows" value={fx.rows ?? 20} min={5} max={60} onChange={(rows) => set({ rows })} />
                  <Scrubber label="Amplitude" value={fx.amplitude ?? 60} min={0} max={100} onChange={(amplitude) => set({ amplitude })} />
                  <Scrubber label="Frequency" value={fx.frequency ?? 20} min={0} max={100} onChange={(frequency) => set({ frequency })} />
                  <Scrubber label="Angle" value={fx.angle ?? 38} min={-90} max={90} onChange={(angle) => set({ angle })} />
                  <Scrubber label="Thickness" value={fx.thickness ?? 9} min={1} max={50} onChange={(thickness) => set({ thickness })} />
                  <Scrubber label="Softness" value={fx.softness ?? 60} min={0} max={100} onChange={(softness) => set({ softness })} />
                  <Scrubber label="Phase" value={fx.phase ?? 0} min={0} max={100} onChange={(phase) => set({ phase })} />
                  <ColorOpacityField
                    hex={fx.waveHex ?? "1166D9"}
                    opacity={100}
                    labelText="Wave color"
                    onHexChange={(waveHex) => set({ waveHex })}
                    onOpacityChange={() => {}}
                    onSwatchClick={() => handleSwatchClick("gfx-wave")}
                    makePercentDrag={makePercentDrag}
                  />
                  <ColorOpacityField
                    hex={fx.waveBgHex ?? "060611"}
                    opacity={100}
                    labelText="Background"
                    onHexChange={(waveBgHex) => set({ waveBgHex })}
                    onOpacityChange={() => {}}
                    onSwatchClick={() => handleSwatchClick("gfx-wavebg")}
                    makePercentDrag={makePercentDrag}
                  />
                </>
              ) : fx.type === "collapsinggrid" ? (
                <>
                  <Scrubber label="Grid size" value={fx.gridSize ?? 10} min={2} max={40} onChange={(gridSize) => set({ gridSize })} />
                  <Scrubber label="Collapse" value={fx.collapse ?? 30} min={0} max={100} onChange={(collapse) => set({ collapse })} />
                  <Scrubber label="Gap size" value={fx.gapSize ?? 5} min={0} max={50} onChange={(gapSize) => set({ gapSize })} />
                  <Scrubber label="Corner radius" value={fx.cornerRadius ?? 10} min={0} max={50} onChange={(cornerRadius) => set({ cornerRadius })} />
                  <ToggleRow label="Varying corners" checked={!!fx.varyCorners} onChange={(varyCorners) => set({ varyCorners })} />
                  <ColorOpacityField
                    hex={fx.bgHex ?? "000000"}
                    opacity={fx.bgOpacity ?? 100}
                    labelText="Gap color"
                    onHexChange={(bgHex) => set({ bgHex })}
                    onOpacityChange={(bgOpacity) => set({ bgOpacity })}
                    onSwatchClick={() => handleSwatchClick("gfx-bg")}
                    makePercentDrag={makePercentDrag}
                  />
                </>
              ) : fx.type === "patternrefraction" ? (
                <>
                  <PopupDropdown value={fx.patternType ?? 0} options={REFRACT_PATTERNS} onChange={(patternType) => set({ patternType })} />
                  <Scrubber label="Strength" value={fx.strength ?? 50} min={-100} max={100} onChange={(strength) => set({ strength })} />
                  <Scrubber label="Smoothness" value={fx.smoothness ?? 0} min={0} max={100} onChange={(smoothness) => set({ smoothness })} />
                  <Scrubber label="Frost" value={fx.frost ?? 0} min={0} max={100} onChange={(frost) => set({ frost })} />
                  <Scrubber label="Dispersion" value={fx.dispersion ?? 4} min={-100} max={100} onChange={(dispersion) => set({ dispersion })} />
                  <PopupDropdown value={fx.wrapMode ?? 0} options={WRAP_MODES} onChange={(wrapMode) => set({ wrapMode })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                  <Scrubber label="Size" value={fx.radius ?? 8} min={0} max={100} onChange={(radius) => set({ radius })} />
                  <Scrubber label="Angle" value={fx.angle ?? 45} min={-180} max={180} onChange={(angle) => set({ angle })} />
                </>
              ) : fx.type === "banknote" ? (() => {
                const D = FX_DEFAULTS.banknote;
                const on = (k) => fx[k] ?? D[k];
                const S = (label, k, min, max) => (
                  <Scrubber key={k} label={label} value={on(k)} min={min} max={max} onChange={(v) => set({ [k]: v })} />
                );
                const H = (t) => (
                  <span className="pt-2 text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">{t}</span>
                );
                return (
                  <>
                    {H("Ink & paper")}
                    <ColorOpacityField
                      hex={on("inkHex")} opacity={on("inkOpacity")} labelText="Main ink"
                      onHexChange={(inkHex) => set({ inkHex })} onOpacityChange={(inkOpacity) => set({ inkOpacity })}
                      onSwatchClick={() => handleSwatchClick("gfx-ink")} makePercentDrag={makePercentDrag}
                    />
                    <ColorOpacityField
                      hex={on("paperHex")} opacity={on("paperOpacity")} labelText="Paper"
                      onHexChange={(paperHex) => set({ paperHex })} onOpacityChange={(paperOpacity) => set({ paperOpacity })}
                      onSwatchClick={() => handleSwatchClick("gfx-paper")} makePercentDrag={makePercentDrag}
                    />

                    {H("Lines")}
                    {S("Spacing", "spacing", 8, 120)}
                    {S("Line weight", "lineWeight", 40, 160)}
                    {S("Angle", "angle", -90, 90)}
                    {S("Contour flow", "flow", 0, 160)}
                    {S("Crosshatching", "crosshatch", 0, 100)}

                    {H("Guilloche")}
                    {S("Strength", "guilloche", 0, 100)}
                    <PopupDropdown value={on("placement")} options={BANKNOTE_PLACEMENTS} onChange={(placement) => set({ placement })} />
                    {on("placement") === 1 && S("Upper region reach", "patternExtent", 0, 100)}
                    {S("Scale", "patternScale", 40, 300)}
                    {S("Curvature", "curvature", 0, 160)}

                    {H("Tone")}
                    {S("Exposure", "exposure", -200, 200)}
                    {S("Contrast", "contrast", 50, 200)}
                    {S("Tone curve", "gamma", 40, 200)}
                    {S("Detail", "detail", 0, 200)}

                    {H("Print")}
                    {S("Paper grain", "grain", 0, 100)}
                    {S("Ink wear", "wear", 0, 100)}
                    {S("Fine stippling", "stipple", 0, 100)}

                    {H("Color accent")}
                    <ToggleRow label="Preserve selected hue" checked={!!on("preserveHue")} onChange={(preserveHue) => set({ preserveHue })} />
                    {on("preserveHue") && (
                      <>
                        {S("Hue", "hue", 0, 360)}
                        {S("Tolerance", "tolerance", 1, 180)}
                        {S("Feather", "feather", 1, 60)}
                        {S("Min saturation", "minSaturation", 0, 90)}
                        {S("Accent strength", "accentStrength", 0, 100)}
                        {S("Keep shadows in ink", "shadowProtection", 0, 100)}
                        <PopupDropdown value={on("accentMode")} options={BANKNOTE_ACCENT_MODES} onChange={(accentMode) => set({ accentMode })} />
                        {on("accentMode") === 1 && (
                          <ColorOpacityField
                            hex={on("accentHex")} opacity={on("accentOpacity")} labelText="Accent ink"
                            onHexChange={(accentHex) => set({ accentHex })} onOpacityChange={(accentOpacity) => set({ accentOpacity })}
                            onSwatchClick={() => handleSwatchClick("gfx-accent")} makePercentDrag={makePercentDrag}
                          />
                        )}
                        <ToggleRow label="Preview hue mask" checked={!!on("maskPreview")} onChange={(maskPreview) => set({ maskPreview })} />
                      </>
                    )}

                    {H("Finish")}
                    <ToggleRow label="Keep transparency" checked={!!on("keepAlpha")} onChange={(keepAlpha) => set({ keepAlpha })} />
                    {S("Effect amount", "amount", 0, 100)}
                  </>
                );
              })() : fx.type === "glitch" ? (() => {
                const D = FX_DEFAULTS.glitch;
                const on = (k) => fx[k] ?? D[k];
                const S = (label, k, min, max) => (
                  <Scrubber key={k} label={label} value={on(k)} min={min} max={max} onChange={(v) => set({ [k]: v })} />
                );
                const T = (label, k) => <ToggleRow key={k} label={label} checked={!!on(k)} onChange={(v) => set({ [k]: v })} />;
                const H = (t) => (
                  <span className="pt-2 text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">{t}</span>
                );
                const speeds = fx.rollingSpeeds ?? D.rollingSpeeds;
                return (
                  <>
                    {H("Master")}
                    {S("Strength", "strength", 0, 100)}
                    {S("Loop (s)", "loopSeconds", 1, 20)}
                    {S("Effect mix", "effectMix", 0, 100)}
                    <PopupDropdown value={on("edgeMode")} options={EDGE_MODES} onChange={(edgeMode) => set({ edgeMode })} />

                    {H("Timing")}
                    {S("Phase", "phase", 0, 100)}
                    {S("Bursts per loop", "bursts", 1, 12)}
                    {S("Burst duration", "burstDuration", 5, 400)}
                    {S("Irregularity", "irregularity", 0, 100)}
                    {S("Seed", "seed", 0, 9999)}

                    {T("Tearing", "tearing")}
                    {on("tearing") && (
                      <>
                        {S("Displacement", "tearAmount", 0, 40)}
                        {S("Band thickness", "bandThickness", 2, 200)}
                        {S("Band density", "bandDensity", 1, 48)}
                        {S("Edge softness", "edgeSoftness", 0, 100)}
                      </>
                    )}

                    {T("Fragments", "fragmentation")}
                    {on("fragmentation") && (
                      <>
                        {S("Band extent", "blockSize", 2, 50)}
                        {S("Displacement", "fragmentAmount", 0, 40)}
                        {S("Coverage", "coverage", 0, 100)}
                      </>
                    )}

                    {T("Color separation", "colorSplit")}
                    {on("colorSplit") && (
                      <>
                        {S("Split distance", "splitDistance", 0, 30)}
                        {S("Split angle", "splitAngle", -180, 180)}
                      </>
                    )}

                    {T("Scanlines", "scanlines")}
                    {on("scanlines") && (
                      <>
                        {S("Strength", "scanStrength", 0, 100)}
                        {S("Spacing", "scanSpacing", 2, 24)}
                      </>
                    )}

                    {T("Noise", "noiseEnabled")}
                    {on("noiseEnabled") && (
                      <>
                        {S("Amount", "noiseAmount", 0, 50)}
                        {S("Grain size", "grainSize", 10, 160)}
                      </>
                    )}

                    {T("Flicker", "flicker")}
                    {on("flicker") && S("Strength", "flickerStrength", 0, 50)}

                    {T("Diagonal buzz", "diagonalEnabled")}
                    {on("diagonalEnabled") && (
                      <>
                        {S("Amount", "diagonalAmount", 0, 100)}
                        {S("Angle", "diagonalAngle", -180, 180)}
                        {S("Width", "diagonalWidth", 1, 50)}
                      </>
                    )}

                    {T("Rolling bands", "rollingEnabled")}
                    {on("rollingEnabled") && (
                      <>
                        <PopupDropdown value={on("rollingDirection")} options={ROLL_DIRECTIONS} onChange={(rollingDirection) => set({ rollingDirection })} />
                        {S("Master speed", "rollingPasses", 1, 8)}
                        {S("Concurrent bands", "rollingCount", 3, 6)}
                        {S("Core width", "rollingCoreWidth", 10, 400)}
                        {S("Falloff", "rollingHaloExtent", 5, 200)}
                        {S("Displacement", "rollingDisplacement", 0, 120)}
                        {S("Color tearing", "rollingColorTearing", 0, 240)}
                        {S("Static strength", "rollingStaticStrength", 0, 50)}
                        {Array.from({ length: on("rollingCount") }, (_, i) => (
                          <Scrubber
                            key={`rs${i}`}
                            label={`Line ${i + 1} speed`}
                            value={speeds[i] ?? 1}
                            min={1}
                            max={8}
                            onChange={(v) => set({ rollingSpeeds: Array.from({ length: 6 }, (_, j) => (j === i ? v : speeds[j] ?? 1)) })}
                          />
                        ))}
                      </>
                    )}
                  </>
                );
              })() : (
                <>
                  <Scrubber label="Amount" value={fx.amount} min={0} max={100} onChange={(amount) => set({ amount })} />
                  <Scrubber label="Scale" value={fx.scale} min={1} max={100} onChange={(scale) => set({ scale })} />
                  <Scrubber label="Angle" value={fx.angle} min={-180} max={180} onChange={(angle) => set({ angle })} />
                </>
              )}
            </div>
          </div>
        );
      })()}

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

            {projectsPageOpen && (
        <ProjectsPage
          loading={!projectsLoaded}
          projects={savedProjects}
          selectedId={selectedProjectId}
          folders={folders}
          setFolders={setFolders}
          onClose={() => setProjectsPageOpen(false)}
          onOpen={openProject}
          onNewProject={() => {
            handleNewProject();
            setProjectsPageOpen(false);
          }}
          onMenu={toggleProjectMenu}
          menuId={projectMenu?.id ?? null}
          renamingId={renamingProjectId}
          renameDraft={renameDraft}
          onRenameDraft={setRenameDraft}
          onRenameCommit={commitRenameProject}
          onRenameCancel={() => { renameCancelRef.current = true; }}
          onMoveProject={handleMoveProject}
          onTogglePin={handleTogglePin}
          onTour={() => {
            setProjectsPageOpen(false);
            startTour();
          }}
          onVideoTour={() => {
            setProjectsPageOpen(false);
            if (imageOrVideo !== "video") {
              setImageOrVideo("video");
              setTimeout(startVideoTour, 450); // let the timeline mount
            } else startVideoTour();
          }}
          onShortcuts={() => setShortcutsOpen(true)}
          themePref={themePref}
          onThemeChange={setThemePref}
          onDeleteProject={handleDeleteProject}
          onDeleteFolder={handleDeleteFolder}
          onPurgeProject={handlePurgeProject}
        />
      )}

      {!splashGone && !projectsPageOpen && (
        <div
          aria-hidden
          className={`fixed inset-0 z-[10000] flex flex-col ${chrome.appBg} transition-opacity duration-300 ${
            appReady ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between h-16 p-4 mx-2 rounded-b-2xl shrink-0 bg-[#FAF9FA] dark:bg-[#171717]">
            <img src={`${import.meta.env.BASE_URL}logo-light.svg`} alt="" draggable={false} className="h-8 w-auto select-none dark:hidden" />
            <img src={`${import.meta.env.BASE_URL}logo-dark.svg`} alt="" draggable={false} className="hidden h-8 w-auto select-none dark:block" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-28 rounded-2xl" />
              <Skeleton className="h-8 w-28 rounded-2xl" />
              <Skeleton className="h-8 w-32 rounded-2xl" />
            </div>
          </div>

          <div className="flex-1 flex gap-2 p-2 overflow-hidden">
            {/* Left rail + panel */}
            <div className="flex gap-2 shrink-0">
              <div className="flex flex-col gap-1 w-11">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="w-11 h-11 rounded-[10px]" />)}
              </div>
              <div className="w-[248px] p-4 flex flex-col gap-3 rounded-2xl overflow-hidden bg-[#FAF9FA] dark:bg-[#171717]">
                <Skeleton className="h-[33px] rounded-[10px] shrink-0" />
                {Array.from({ length: 20 }, (_, i) => <Skeleton key={i} className="h-8 rounded-lg shrink-0" />)}
              </div>
            </div>

            {/* Canvas */}
            <Skeleton className="flex-1 rounded-[16px]" />

            {/* Right toolbar */}
            <div className="w-[300px] shrink-0 flex flex-col rounded-2xl bg-[#FAF9FA] dark:bg-[#171717] overflow-hidden">
              <div className="flex items-center gap-4 h-11 px-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-3 w-12 rounded" />)}
              </div>
              <div className="p-4 flex flex-col gap-3 shrink-0">
                <Skeleton className="h-3 w-16 rounded shrink-0" />
                <Skeleton className="h-[66px] rounded-[10px] shrink-0" />
                {[0, 1, 2].map((s) => (
                  <React.Fragment key={s}>
                    <Skeleton className="h-3 w-20 rounded mt-3 shrink-0" />
                    {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 rounded-[10px] shrink-0" />)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {exportToast && (
        <div className="pop-enter-up fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 h-8 px-3 rounded-2xl bg-[#3A3A3A] dark:bg-[#FAF9FA] text-[13px] font-medium text-[#FAF9FA] dark:text-[#171717] shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
          <Check size={14} weight="regular" /> {exportToast}
        </div>
      )}
    </div>
  );
}