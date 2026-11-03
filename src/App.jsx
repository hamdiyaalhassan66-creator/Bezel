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
import { framePoseMap, sampleShotFrames, changedCamProps, clipOf, CLIP_KEYS, isClipped, featherOf } from "./lib/frameKeys.js";
import { frameDim } from "./lib/frameFade.js";
import { planeBackFacing, sortByDepth, projectPlane, drawPlane3D, planeGrid } from "./lib/plane3d.js";
import { mixHex, txtRanks, txtUnitStates, sampleTextAnim } from "./lib/textAnim.js";
import { DEFAULT_TEXT, textLabel, textName, prepText, textPad } from "./lib/textUtils.js";
import { loadFont } from "./lib/fontCatalog.js";
import {
  DEVICE_CATEGORIES, cropImageToDataUrl, surfaceHex, formatEditedAt, useFileDrop, seekVideo, loadVideoMeta,
} from "./lib/appUtils.js";
import { packProject, hydrateProject } from "./lib/projectStore.js";
import { useProjects } from "./hooks/useProjects.js";
import { Toaster } from "./components/Toaster.jsx";
import { toast } from "./lib/toast.js";
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
import { MoveModal } from "./components/MoveModal.jsx";
import { RenameModal } from "./components/RenameModal.jsx";
import { useDismissable, CTX_ITEM } from "./components/timelineParts.jsx";
import { FrameTemplateThumb, templateBackground, VideoTemplateCard, FrameVideoTemplateCard } from "./components/TemplateCards.jsx";
import { SocialControls } from "./components/SocialControls.jsx";
import { FrameLayer } from "./components/FrameLayer.jsx";
import { VideoTimeline } from "./components/VideoTimeline.jsx";
import { AppStyles } from "./components/AppStyles.jsx";
import { GradientFxPopup } from "./components/GradientFxPopup.jsx";
import { ExportMenu } from "./components/ExportMenu.jsx";
import { ProjectMenu } from "./components/ProjectMenu.jsx";
import { EffectPopup, AnimEffectPopup } from "./components/EffectPopups.jsx";
import { FxAddMenu } from "./components/FxAddMenu.jsx";
import { FrameContextMenu } from "./components/FrameContextMenu.jsx";
import { FrameAssetList } from "./components/FrameAssetList.jsx";
import { AnimAssetList } from "./components/AnimAssetList.jsx";
import { useFrameOps } from "./hooks/useFrameOps.js";
import { renderFrameCanvas as renderFrameCanvasLib } from "./lib/renderFrameCanvas.js";
import { useVideoTimeline } from "./hooks/useVideoTimeline.js";
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
import { defaultAnimImage } from "./constants/defaultImages.js";
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
import { useEditorHistory } from "./hooks/useEditorHistory.js";
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
} from "@phosphor-icons/react";

import {
  FRAME_FX, FRAME_FX_OPTIONS, MOCKUP_FX, MOCKUP_FX_OPTIONS,
  GRAD_FX_ICON, GRAD_FX_LIST, GRAD_FX_OPTIONS, GFX_COLOR,
  nativeSizeOf, FRAME_BROWSER_DEFAULT, NAV, BASE, GUIDE, yieldNow,
  depthTintOf,
} from "./lib/appConstants.js";

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
      if ((sceneOk && fontsOk && performance.now() - started > 1000) || performance.now() - started > 10000) setAppReady(true);
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
  const frameBrowser = { ...FRAME_BROWSER_DEFAULT, ...primaryFrame.browser };
  const setFrameBrowser = makeFrameSetter("browser");
  const updateBrowser = (patch) => setFrameBrowser((prev) => ({ ...FRAME_BROWSER_DEFAULT, ...prev, ...patch }));
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
  const pct = Math.round(((primaryFrame.s ?? fit) / fit) * 100);
  return Number.isFinite(pct) ? pct : 100;
})();
const handleFrameScale = (pct) => {
  const box = frameSizeRef.current;
  if (!box) return;
  const ids = selectedIds.length ? selectedIds : [primaryFrame.id];
  setFrames((prev) => prev.map((f) => (ids.includes(f.id) ? { ...f, s: (frameFitS(f, box) * pct) / 100 } : f)));
};

const toolbarModeRef = useRef(toolbarMode);
toolbarModeRef.current = toolbarMode;
const tabKeyRef = useRef(tabKey);
tabKeyRef.current = tabKey;
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
    const ref = prev.find((f) => !ids.includes(f.id)); // any existing frame, empty or not
    const fitS = box ? Math.min((0.8 * box.w) / nw, (0.8 * box.h) / nh) / short : null;
    const refS = ref ? scaleOf(ref) : null;
    // share the existing frame's scale so different sizes look different, but never overflow the canvas
    const defaultS = refS != null && fitS != null ? Math.min(refS, fitS) : refS ?? fitS;

    let next, selIds;
    if (hasTargets) {
      selIds = prev.filter((f) => ids.includes(f.id)).map((f) => f.id);
      next = prev.map((f) => {
        if (!ids.includes(f.id)) return f;
        // The image adapts to the frame: size, scale and position all stay as they are.
        return { ...f, img: { ...img }, s: scaleOf(f) };
      });
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

  const done = () => setMediaLoading((n) => Math.max(0, n - 1));
  if (file.type.startsWith("video/")) {
    setMediaLoading((n) => n + 1); // only videos need a loading state, they take time to read
    loadVideoMeta(file)
      .then((m) => m && place(URL.createObjectURL(m.poster), m.w, m.h, { url: m.url, duration: m.duration }))
      .catch((err) => console.error("Video load failed:", err))
      .finally(done);
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
    toast(ids.length > 1 ? `${ids.length} frames deleted` : "Frame deleted");
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
  // one asset per distinct image slot: templates like Ring 04 reuse the same assets on every ring
  const animAssetCount = (list) => list.reduce((m, f, i) => Math.max(m, (f.asset ?? i) + 1), 0);
  const animPool = () =>
    Array.from({ length: Math.max(animAssetCount(framesLatestRef.current), assetPoolRef.current.length) }, (_, i) => assetPoolRef.current[i] ?? null);
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
      const disp = [...prev];
      const from = disp.findIndex((f) => f.id === fromId);
      if (from < 0 || fromId === toId) return prev;
      const [m] = disp.splice(from, 1);
      const to = disp.findIndex((f) => f.id === toId);
      if (to < 0) return prev;
      disp.splice(pos === "before" ? to : to + 1, 0, m);
      return disp;
    });
  const endFrameDrag = () => {
    dragIdRef.current = null;
    setDraggingId(null);
    setFrameDrop(null);
  };
  const clearAnimAssets = () => {
    assetPoolRef.current = [];
    const next = framesLatestRef.current.map((f) => ({ ...f, img: null }));
    framesLatestRef.current = next;
    setFrames(next);
    setTimeout(() => reapplyAnimRef.current?.(), 0);
  };

  const {
    frameClipRef,
    duplicateSelected, addBlankFrame, copyFrames, pasteFrames, reorderSelected,
    toggleHideSelected, toggleLockSelected, flipSelected,
    alignSelected, isFrameAligned, distributeSelected,
  } = useFrameOps({
    frames, setFrames, selectedIds, setSelectedIds,
    framesLatestRef, selectedIdsRef, frameSizeRef, nextFrameIdRef,
    markFrameEdit: () => markFrameEdit(),
  });

    // ---- Frame right-click menu, clipboard and per-frame actions ----
  const [frameMenu, setFrameMenu] = useState(null); // { left, top?, bottom?, point }
  useDismissable(!!frameMenu, "[data-frame-menu]", () => setFrameMenu(null));

  const openFrameMenu = ({ x, y, fromPanel = false }) => {
    const r = canvasBoxRef.current?.getBoundingClientRect();
    setFrameMenu({
      left: Math.max(8, Math.min(x, window.innerWidth - 248)),
      top: y,
      point: !fromPanel && r ? { x: x - r.left, y: y - r.top } : null, // where "Paste here" lands
    });
  };

  // Asks the timeline to open something that lives in it (enter / exit popover, rename)
  const [tlRequest, setTlRequest] = useState(null);
  const askTimeline = (req) => setTlRequest({ ...req, n: Date.now() });

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

const [distMenu, setDistMenu] = useState(null); // { right, top }

// Holding Alt measures the selected frame(s) against the frame under the cursor
const [altDown, setAltDown] = useState(false);
const [altPoint, setAltPoint] = useState(null); // cursor in canvas px
const altDownRef = useRef(false);
const lastPtrRef = useRef(null);
useEffect(() => {
  const local = (c) => {
    const r = canvasBoxRef.current?.getBoundingClientRect();
    return r && c ? { x: c.x - r.left, y: c.y - r.top } : null;
  };
  const move = (e) => {
    lastPtrRef.current = { x: e.clientX, y: e.clientY };
    if (altDownRef.current) setAltPoint(local(lastPtrRef.current)); // state only changes while Alt is down
  };
  const down = (e) => {
    if (e.key !== "Alt") return;
    altDownRef.current = true;
    setAltDown(true);
    setAltPoint(local(lastPtrRef.current));
  };
  const reset = () => {
    altDownRef.current = false;
    setAltDown(false);
    setAltPoint(null);
  };
  const up = (e) => {
    if (e.key !== "Alt") return;
    reset();
    e.preventDefault(); // stops Windows / Linux from focusing the browser menu bar on release
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", reset);
  return () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", reset);
  };
}, []);
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
  const preAnimMediaRef = useRef(null); // image / video mode the user was in before entering Animation
  const selectTab = (key) => {
    if (key === "animation" && tabKey !== "animation") preAnimMediaRef.current = imageOrVideoRef.current;
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
      setAnimCategory("All");
      setSidebarPanel("templates");
      setSidebarOpen(true);
    } else {
      if (tabKey === "animation" && preAnimMediaRef.current) {
        setImageOrVideo(preAnimMediaRef.current); // back to what it was before Animation (image or video)
        preAnimMediaRef.current = null;
      }
      setAnimTab(false);
      setToolbarMode(key);
    }
  };

// Devices panel isn't available in Frame mode, so move off it.
useEffect(() => {
  if (devicesDisabled && sidebarPanel === "create") setSidebarPanel("projects");
}, [devicesDisabled, sidebarPanel]);
const {
  savedProjects, setSavedProjects, liveProjects,
  projectsPageOpen, setProjectsPageOpen, projectsLoaded,
  selectedProjectId, setSelectedProjectId,
  folders, setFoldersTracked,
  projHistRef, projCtxRef, undoProjects, redoProjects, canUndoProjects, canRedoProjects,
  projectMenu, setProjectMenu, projectMenuRef, toggleProjectMenu,
  moveTarget, setMoveTarget,
  renamingProjectId, setRenamingProjectId, renameDraft, setRenameDraft, renameCancelRef,
  handleOpenProjectInNewTab, handleCopyProjectLink, handleDuplicateProject,
  startRenameProject, commitRenameProject, handleDeleteProject, handleRestoreProject,
  handlePurgeProject, handleTogglePin, handleMoveProject, handleCreateFolder, handleDeleteFolder,
} = useProjects({
  setProjectTitle: (t) => setProjectTitle(t),
  openProject: (p) => openProject(p),
});
const [saveMenuOpen, setSaveMenuOpen] = useState(false);
useDismissable(saveMenuOpen, "[data-save-menu]", () => setSaveMenuOpen(false));
const [openTick, setOpenTick] = useState(0);
const pendingOpenRef = useRef(null); // saved project waiting for the mode switch to settle
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
  // measured bytes-per-pixel per image format, learned from real exports
  const [measuredBpp, setMeasuredBpp] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bezel:bpp")) ?? {}; } catch { return {}; }
  });
  const recordExportSize = (r) => {
    if (!r?.px || !r?.bytes) return;
    setMeasuredBpp((p) => {
      const n = { ...p, [exportFormat]: r.bytes / r.px };
      try { localStorage.setItem("bezel:bpp", JSON.stringify(n)); } catch {}
      return n;
    });
  };
  const [exporting, setExporting] = useState(false);
  const setExportToast = (m) => m && toast(m); // old calls keep working, the null "clear" calls are ignored
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
  const fxPendingRef = useRef(false); // a filtered background is still rendering
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
  // fonts picked from the catalog are loaded on demand, including after opening a saved project
  useEffect(() => {
    textItems.forEach((t) => loadFont(t.fontMeta));
  }, [textItems.map((t) => t.fontMeta?.family ?? "").join("|")]);
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

    // Size of the area the canvas box lives in, so the box can be sized to an exact ratio.
  const canvasAreaRef = useRef(null);
  const [areaDims, setAreaDims] = useState(null);
  useLayoutEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const update = () =>
      setAreaDims((p) => (p && p.w === el.clientWidth && p.h === el.clientHeight ? p : { w: el.clientWidth, h: el.clientHeight }));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
    // Canvas size changes ease the box to its new ratio. Window resizes stay instant.
  const CANVAS_EASE_MS = 160;
  const canvasKey = `${canvasSize}|${customWidth}|${customHeight}`;
  const prevCanvasKeyRef = useRef(canvasKey);
  const canvasEaseUntilRef = useRef(0);
  if (prevCanvasKeyRef.current !== canvasKey) {
    prevCanvasKeyRef.current = canvasKey;
    canvasEaseUntilRef.current = performance.now() + CANVAS_EASE_MS + 60;
  }

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
      { ...DEFAULT_TEXT, id, visible: true, mode: tabKey, hex: darkMode ? "FFFFFF" : "000000", dy: prev.length ? 0.06 * (prev.length % 6) : 0 },
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
        mode: tabKey,
        position: "tl",
        dx: (x - textPad({ w, h })) / w, // padding scales with the canvas
        dy: (y - textPad({ w, h })) / h,
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
  }, [tabKey]);

  useEffect(() => {
    if (!textTool) return;
    const onKey = (e) => e.key === "Escape" && setTextTool(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [textTool]);

  useEffect(() => {
    setTextTool(false);
  }, [tabKey]);

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
  const renderGradientFxCanvas = (W, H, k, snap = null) => {
    // snap = a background clip's settings (video export); without it, the live panel values are used
    const s = snap ?? { bgType, gradientOpacity, gradientType, gradientAngle, gradientStops, grainAmount };
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (s.bgType === "custom") {
      const im = snap ? bgImage(snap.customBgImageUrl) : customImgRef.current;
      if (im) {
        const sc = Math.max(W / im.naturalWidth, H / im.naturalHeight);
        const dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
        x.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
    } else {
      x.globalAlpha = s.gradientOpacity / 100;
      x.fillStyle = makeCanvasGradient(x, s.gradientType, s.gradientAngle, s.gradientStops, 0, 0, W, H);
      x.fillRect(0, 0, W, H);
      x.globalAlpha = 1;
    }
    applyGradientFx(c, gradientFx, k);
    if (s.grainAmount > 0 && grainType !== "noise") {
      const gi = grainImgsRef.current[grainType];
      if (gi) paintGrainTexture(x, W, H, gi, s.grainAmount, grainScale, grainBlend);
    } else if (s.grainAmount > 0) {
      x.save();
      x.scale(k, k);
      x.globalCompositeOperation = "overlay";
      x.fillStyle = x.createPattern(makeGrainTile(512, s.grainAmount), "repeat");
      x.fillRect(0, 0, W / k, H / k);
      x.restore();
    }
    return c;
  };

  useEffect(() => {
    fxPendingRef.current = false;
    if (bgAnimOnRef.current) return; // a background animation is painting the scene
    if (gradFxOn) {
      const d = canvasDims;
      if (!d) return;
      if (bgType === "custom" && !customImgRef.current) return; // image still decoding
      setFxBusy(true);
      fxPendingRef.current = true;
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
          fxPendingRef.current = false;
        }
      }, vidEndRef.current ? 0 : 50); // no debounce while exporting
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
        radius: 0,
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
    // Drops always land as new frames at the image's original size. Only the asset panel fills the default frame.
    files.forEach((file) => frameUploadRef.current(file, null));
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
  const getFrameRenderCtx = () => ({
    frameSizeRef, exportImgCacheRef, frames, textItems, tabKey, environment, frameCam,
    videoOn, videoFrameAt, vidTimeRef,
    bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientStops, gradientOpacity,
    grainAmount, grainType, customBgImageUrl, gradFxOn, gradientFx,
    renderGradientFxCanvas, hexToRgba,
  });
  const renderFrameCanvas = (width, transparent = false, height = null, ov = null) =>
    renderFrameCanvasLib(getFrameRenderCtx(), width, transparent, height, ov);

  const exportFrame = async (width, fmt, height, dryRun = false) => {
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
    const px = canvas.width * canvas.height;
    return await new Promise((resolve) =>
      canvas.toBlob((blob) => {
        if (blob) {
          if (!dryRun) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${projectTitle || "frame"}.${fmt.ext}`;
            a.click();
            URL.revokeObjectURL(url);
          }
          resolve({ bytes: blob.size, px });
        } else resolve(null);
      }, fmt.mime, 0.92)
    );
  };

  const handleExport = async () => {
    if (exporting) return;
    if (videoOn) {
      const vLabel = VIDEO_FORMATS.find((f) => f.value === videoFormat).label;
      setExporting(true);
      setExportProgress(0);
      toast(`Exporting ${vLabel}…`, { duration: 3000 });
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      try {
        const bytes = await exportVideo();
        if (bytes) {
          const vf = VIDEO_FORMATS.find((f) => f.value === videoFormat);
          const vd = videoOutDims();
          const vfps = Math.min(videoFps, vf.maxFps);
          const vframes = Math.max(1, Math.round((vidDuration / videoSpeed) * vfps));
          const raw = estimateVideoBytes(videoFormat, vd.w, vd.h, vfps, vframes);
          setMeasuredBpp((p) => {
            const n = { ...p, [`v:${videoFormat}`]: bytes / raw };
            try { localStorage.setItem("bezel:bpp", JSON.stringify(n)); } catch {}
            return n;
          });
        }
        toast(`${vLabel} exported`);
      } catch (err) {
        console.error("Video export failed:", err);
        toast(err?.message || "Video export failed", { type: "error", duration: 4000 });
      } finally {
        setExporting(false);
        setExportProgress(null);
        setExportOpen(false);
      }
      return;
    }
    const fmt = EXPORT_FORMATS.find((f) => f.value === exportFormat);
    setExporting(true);
    toast(`Exporting ${fmt.label}…`, { duration: 3000 });
    // let the spinner paint before the heavy synchronous render starts
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    try {
      const d = exportDims(exportWidth) ?? { w: exportWidth, h: undefined };
      const transparent = exportTransparent && fmt.mime !== "image/jpeg"; // JPG has no alpha
      if (toolbarMode === "frame") recordExportSize(await exportFrame(d.w, fmt, d.h));
      else {
        const hiRes = gradFxOn && !transparent && canvasDims;
        if (hiRes) {
          const FW = Math.min(d.w, 2560), FH = Math.max(2, Math.round((FW * d.h) / d.w));
          sceneRef.current?.setBackgroundCanvas?.(renderGradientFxCanvas(FW, FH, FW / canvasDims.w));
        }
        recordExportSize(sceneRef.current?.exportAt(d.w, fmt.mime, fmt.ext, d.h, transparent));
        if (hiRes) {
          const LW = 1280, LH = Math.max(2, Math.round((LW * canvasDims.h) / canvasDims.w));
          sceneRef.current?.setBackgroundCanvas?.(renderGradientFxCanvas(LW, LH, LW / canvasDims.w));
        }
      }
      toast(`${fmt.label} exported`);
    } catch (err) {
      console.error("Export failed:", err);
      toast(err?.message || "Export failed", { type: "error", duration: 4000 });
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
      if (!silent) toast("Couldn't save the project", { type: "error", duration: 3000 });
    } finally {
      savingRef.current = false;
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
    vidBgActive.current = null;
    vidBgExitKeyRef.current = null;
    // the reset background is the new default, so the "background edited with no row selected" effect must not add a row for it
    bgAppliedKeyRef.current = bgKey({
      bgType: "solid", bgHex: surfaceHex(darkMode), bgOpacity: 100,
      gradientType: "Linear", gradientAngle: 90, gradientOpacity: 100,
      gradientStops: [
        { id: 1, hex: "FFFFFF", position: 0, opacity: 100 },
        { id: 2, hex: "000000", position: 100, opacity: 100 },
      ],
      grainAmount: 0, customBgImageUrl: null,
    });
    // in Video mode, rebuild the starting rows (Shot 1 / one row per frame, plus the background row) once the reset has applied
    setTimeout(() => setVidSwapTick((n) => n + 1), 60);

    setBackSelectedStopId("back-1");
    nextBackStopIdRef.current = 3;
    setBackPickerOpen(false);

        setTextItems([]);
    setSelectedTextId(null);
    setTextPopupOpen(false);
    toast("New project started");
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

    const restoreUntilRef = useRef(Date.now() + 500); // startup effects settle without creating history
  const {
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
  } = useVideoTimeline({
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
    restoreUntilRef, vidUploadRef,
    swapScene: () => swapSceneForTab(),
  });

  // Switching Mockup <-> Frame also swaps the scene look, camera and template highlights.
  // Each mode remembers what it was left with; a mode that was never visited starts from defaults.
  // (Defined before the timeline swap effect below, so the timeline's background / camera wins in Video mode.)
  const sceneByModeRef = useRef({});
  const sceneModeRef = useRef(tabKey);
  const swapSceneForTab = () => {
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
  };

    useEffect(() => {
    const key = animTab ? `animrow-${animSel}` : `framerow-${selectedIds[0]}`;
    document.querySelector(`[data-asset-row="${key}"]`)?.scrollIntoView({ block: "nearest" });
  }, [animSel, selectedIds.join(","), animTab]);

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
    request: tlRequest,
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
      return await encodeVideoFrames({
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
          // let React flush the background / text state this frame depends on (twice: state update, then the effects it triggers)
          await yieldNow();
          await yieldNow();
          for (let n = 0; fxPendingRef.current && n < 400; n++) await new Promise((r) => setTimeout(r, 5)); // wait for this frame's filtered background
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
            texts: textsAt(t, tabKey),
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
    ...(animTab
      ? {
          animPool: animPool().map((a) => (a && a.cropUrl ? { ...a, cropUrl: assetId(a.cropUrl) } : a)),
          tplParams,
          vidTplId,
        }
      : {}),
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

  const {
    historyKey, historyKeyRef, historiesRef, historyRef, setHistoryTick,
    flushPendingHistory, undo, redo, canUndo, canRedo,
  } = useEditorHistory({
    snapshot, keyCacheRef, assetId, animPool,
    tabKey, videoOn, toolbarMode, vidExporting,
    textItems, tplParams, vidTplId,
    projCtxRef, restoreUntilRef,
    applySnapshot: (s, o) => applySnapshot(s, o),
  });

  // Runs the real export (no download) to get the exact file size for the dropdown
  const [exactSize, setExactSize] = useState(null); // { key, bytes }
  const sampleKey = `${exportFormat}|${exportWidth}|${canvasSize}|${customWidth}x${customHeight}|${exportTransparent}|${toolbarMode}`;
  useEffect(() => {
    if (!exportOpen || videoOn || exporting) return;
    let dead = false;
    const t = setTimeout(async () => {
      try {
        const fmt = EXPORT_FORMATS.find((f) => f.value === exportFormat);
        const d = exportDims(exportWidth);
        if (!fmt || !d) return;
        const transparent = exportTransparent && fmt.mime !== "image/jpeg";
        let r;
        if (toolbarMode === "frame") {
          r = await exportFrame(d.w, fmt, d.h, true);
        } else {
          const hiRes = gradFxOn && !transparent && canvasDims;
          if (hiRes) {
            const FW = Math.min(d.w, 2560), FH = Math.max(2, Math.round((FW * d.h) / d.w));
            sceneRef.current?.setBackgroundCanvas?.(renderGradientFxCanvas(FW, FH, FW / canvasDims.w));
          }
          r = sceneRef.current?.exportAt(d.w, fmt.mime, fmt.ext, d.h, transparent, true);
          if (hiRes) {
            const LW = 1280, LH = Math.max(2, Math.round((LW * canvasDims.h) / canvasDims.w));
            sceneRef.current?.setBackgroundCanvas?.(renderGradientFxCanvas(LW, LH, LW / canvasDims.w));
          }
        }
        if (r?.bytes && !dead) setExactSize({ key: sampleKey, bytes: r.bytes });
      } catch (err) {
        console.error("Size measure failed:", err);
      }
    }, 500);
    return () => { dead = true; clearTimeout(t); };
  }, [exportOpen, sampleKey, historyKey]);

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
        ? (prev) => [...prev.filter((t) => (t.mode ?? "mockup") !== tabKeyRef.current), ...(s.textItems ?? [])]
        : s.textItems ?? []
    );
    setSelectedTextId(s.selectedTextId ?? null);
    if (s.mockupEffects !== undefined || !scoped) setMockupEffects(s.mockupEffects ?? []);
    if (s.animPool !== undefined) {
      assetPoolRef.current = s.animPool.map((a) => (a && a.cropUrl ? { ...a, cropUrl: assetValue(a.cropUrl) } : a));
      setTplParams(s.tplParams ?? {});
      setVidTplId(s.vidTplId ?? null);

      // undo / redo (not opening a project): put back backgrounds, texts and length, then rebuild from the template
      if (scoped) {
        clearTimeout(tplParamTimerRef.current); // a pending slider apply must not land after the undo
        const bgs = unpackBgs(s.vidBgs ?? []);
        const texts = s.vidTexts ?? [];
        vidLive.current.bgs = bgs;
        vidLive.current.texts = texts;
        if (s.vidDuration != null) vidLive.current.duration = s.vidDuration;
        setVidBgs(bgs);
        setVidTexts(texts);
        if (s.vidDuration != null) setVidDuration(s.vidDuration);
        setSelBg(null);
        setSelText(null);
        vidBgActive.current = null;
        const tpl = PARAM_ALL.find((t) => t.id === s.vidTplId);
        if (tpl) {
          setTimeout(() => {
            restoreUntilRef.current = Date.now() + 600; // the rebuild isn't an undoable step
            applyVideoTemplate(tpl, { ...defaultParams(tpl.params), ...(s.tplParams?.[tpl.id] ?? {}) }, true);
          }, 0);
        }
      }
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

  // Autosave: writes the open project 2s after the last change.
  const savingRef = useRef(false);
  const autosaveRef = useRef(null);
  autosaveRef.current = () => handleSaveProject(false, true);
  useEffect(() => {
    if (!selectedProjectId || !projectsLoaded) return;
    if (Date.now() < restoreUntilRef.current) return; // opening a project / switching tabs isn't an edit
    if (pendingOpenRef.current || vidPlaying || vidExporting) return;
    const t = setTimeout(() => !vidEndRef.current && autosaveRef.current?.(), 2000);
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
      toast("Couldn't open this project", { type: "error", duration: 3000 });
    }
  };

  // tab / media mode the user was on before the reload, re-applied after the saved project restores
const reloadTabRef = useRef(
  NAV.projectId
    ? { tab: NAV.animTab ? "animation" : NAV.toolbarMode ?? "mockup", media: NAV.imageOrVideo ?? "image" }
    : null
);

  useEffect(() => {
    const p = pendingOpenRef.current;
    if (!p || toolbarMode !== p.data.toolbarMode || imageOrVideo !== p.data.imageOrVideo || !!animTab !== !!p.data.animTab) return;
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

    // after a reload: go back to the tab / mode the user was on, not the one the project was saved in
    const want = reloadTabRef.current;
    if (want) {
      reloadTabRef.current = null;
      const savedTab = d.animTab ? "animation" : d.toolbarMode;
      setTimeout(() => {
        if (want.tab !== savedTab) selectTab(want.tab);
        if (want.tab !== "animation") setImageOrVideo(want.media);
      }, 700); // after the restore window above has settled
    }
  }, [openTick, toolbarMode, imageOrVideo, animTab]);

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
      undoProjects,
      redoProjects,
      projectsPanel: sidebarOpen && projCtxRef.current, // any sidebar panel (Devices, Templates, Projects)
      projUndoable: projHistRef.current.past.length > 0,
      projRedoable: projHistRef.current.future.length > 0,
      setPanel: (p) => {
        setSidebarPanel(p);
        setSidebarOpen(true);
      },
      devicesDisabled,
      shortcutsOpen,
      tourOpen,
      projectsPage: projectsPageOpen,
      cropOpen: cropModalOpen || customCropModalOpen || frameCropId !== null || shotCrop !== null || moveTarget !== null || renamingProjectId !== null,
      frameMode: toolbarMode === "frame" && !animTab,
      mockupMode: toolbarMode === "mockup",
      deleteFrames: deleteSelected,
      duplicate: duplicateSelected,
      framesSelected: selectedIds.length > 0,
      copyFrames,
      pasteFrames: () => pasteFrames(),
      reorderSelected,
      toggleHide: toggleHideSelected,
      toggleLock: toggleLockSelected,
      flipSelected,
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
      // only real text entry should keep the browser's own undo; sliders, checkboxes and buttons shouldn't block ours
      const editingText =
        t instanceof HTMLElement &&
        (t.isContentEditable ||
          t.tagName === "TEXTAREA" ||
          (t.tagName === "INPUT" && !/^(range|checkbox|radio|button|submit|reset|color|file)$/.test(t.type)));
      const key = e.key;

      // "?" opens and closes the modal (Esc is handled inside the modal itself).
      if (key === "?" && !typing && !h.cropOpen && !h.tourOpen) {
        e.preventDefault();
        h.toggleShortcuts();
        return;
      }
      // the Projects page blocks editor shortcuts, except theme cycling
      if (h.projectsPage && !typing && !h.shortcutsOpen && !h.tourOpen && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && key.toLowerCase() === "c") {
        e.preventDefault();
        h.cycleTheme();
        return;
      }
      // Projects undo / redo: always on the Projects page. In the editor, only while the Projects panel is open
      // and the last undoable action was a project one, so editor undo is never hijacked.
      if ((h.projectsPage || h.projectsPanel) && !typing && !h.shortcutsOpen && !h.tourOpen && !h.cropOpen && (e.metaKey || e.ctrlKey) && !e.altKey) {
        const zk = key.toLowerCase();
        const page = h.projectsPage;
        const wantsRedo = (zk === "z" && e.shiftKey) || (zk === "y" && !e.shiftKey);
        const wantsUndo = zk === "z" && !e.shiftKey;
        if (wantsRedo && (page || h.projRedoable)) { e.preventDefault(); h.redoProjects(); return; }
        if (wantsUndo && (page || h.projUndoable)) { e.preventDefault(); h.undoProjects(); return; }
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
        if (cmd && !e.altKey && !e.shiftKey && e.code === "KeyC" && h.framesSelected) {
          e.preventDefault();
          h.copyFrames();
          return;
        }
        if (cmd && !e.altKey && !e.shiftKey && e.code === "KeyV") {
          if (h.pasteFrames()) e.preventDefault();
          return;
        }
        if (cmd && e.shiftKey && !e.altKey && h.framesSelected && (e.code === "KeyH" || e.code === "KeyL")) {
          e.preventDefault();
          if (e.code === "KeyH") h.toggleHide();
          else h.toggleLock();
          return;
        }
        if (!cmd && !e.altKey && !e.shiftKey && h.framesSelected && (key === "]" || key === "[")) {
          e.preventDefault();
          h.reorderSelected(key === "]");
          return;
        }
        if (!cmd && !e.altKey && e.shiftKey && h.framesSelected && (e.code === "KeyH" || e.code === "KeyV")) {
          e.preventDefault();
          h.flipSelected(e.code === "KeyH" ? "h" : "v");
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
      if (mod && !e.altKey && !editingText) {
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
// Animation: plane W / H / lock / scale belong to the template, so every plane changes together
const planeVals = activeParamTpl ? { ...defaultParams(activeParamTpl.params), ...tplParams[activeParamTpl.id] } : null;
// Animation: Reset controls puts every control in the Controls section (size and scale included) back to the template's defaults
const ctrlParams = activeParamTpl ? activeParamTpl.params.filter((p) => p.section == null || p.section === "plane") : [];
const ctrlDefaults = Object.fromEntries(ctrlParams.map((p) => [p.key, p.default]));
const ctrlAtDefault = !!planeVals && ctrlParams.every((p) => JSON.stringify(planeVals[p.key]) === JSON.stringify(p.default));
const planeNum = (v) => Math.min(20000, Math.max(1, Math.round(Number(v && v.target ? v.target.value : v) || 1)));
const setPlaneSize = (axis, v) => {
  const tpl = animTplRef.current;
  if (!tpl) return;
  const cur = { ...defaultParams(tpl.params), ...tplParams[tpl.id] };
  const n = planeNum(v);
  if (axis === "w") patchTplParams(tpl, cur.planeLock ? { planeW: n, planeH: planeNum((n * cur.planeH) / cur.planeW) } : { planeW: n });
  else patchTplParams(tpl, cur.planeLock ? { planeH: n, planeW: planeNum((n * cur.planeW) / cur.planeH) } : { planeH: n });
};
const animFxId = typeof openEffectId === "string" && openEffectId.startsWith("anim:") ? Number(openEffectId.slice(5)) : null;
const FX_TYPES = [
  { type: "fade", label: "Fade", Icon: CircleHalf },
  { type: "blur", label: "Layer blur", Icon: Drop },
  { type: "dropShadow", label: "Drop shadow", Icon: FX_ICON.dropShadow ?? Drop },
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
    : type === "dropShadow" ? { x: 0, y: 24, blur: 60, spread: 0, hex: "000000", opacity: 25 }
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
const modeTexts = textItems.filter((t) => (t.mode ?? "mockup") === tabKey);
// asset row a canvas frame belongs to (the frame's own index unless the template shares assets)
const animAssetOf = (id) => {
  const k = frames.findIndex((f) => f.id === id);
  return k < 0 ? null : frames[k].asset ?? k;
};
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

// Alt-measure: nearest neighbour (or canvas edge) on each side of the selection, in canvas px
const altMeasures = (() => {
  const box = frameSizeRef.current;
  if (!altDown || !box || toolbarMode !== "frame" || animTab || !isDefaultCamera(frameCam)) return [];
  const toBox = (f) => {
    const r = frameRect(f, box);
    return { l: r.left, r: r.left + r.width, t: r.top, b: r.top + r.height };
  };
  const sel = frames.filter((f) => selectedIds.includes(f.id) && !f.hidden).map(toBox);
  if (!sel.length) return [];
  const S = {
    l: Math.min(...sel.map((r) => r.l)),
    r: Math.max(...sel.map((r) => r.r)),
    t: Math.min(...sel.map((r) => r.t)),
    b: Math.max(...sel.map((r) => r.b)),
  };
  if (!altPoint) return [];
  // topmost unselected frame under the cursor (later in the array = on top)
  const hovered = [...frames].reverse().find((f) => {
    if (selectedIds.includes(f.id) || f.hidden) return false;
    const o = toBox(f);
    return altPoint.x >= o.l && altPoint.x <= o.r && altPoint.y >= o.t && altPoint.y <= o.b;
  });
  if (!hovered) return [];
  const T = toBox(hovered);

  const k = (exportDims(1920)?.w ?? box.w) / box.w; // show values in the canvas's export size, not screen px
  const out = [];
  const add = (axis, x1, y1, x2, y2) => {
    const len = axis === "h" ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
    if (len < 0.5) return;
    out.push({ axis, x1, y1, x2, y2, target: T, value: Math.round(len * k) });
  };

  // where the two boxes overlap on each axis, lines are drawn through the middle of that overlap
  const yo0 = Math.max(S.t, T.t), yo1 = Math.min(S.b, T.b);
  const xo0 = Math.max(S.l, T.l), xo1 = Math.min(S.r, T.r);
  const yMid = yo0 < yo1 ? (yo0 + yo1) / 2 : (S.t + S.b) / 2;
  const xMid = xo0 < xo1 ? (xo0 + xo1) / 2 : (S.l + S.r) / 2;

  // horizontal: a gap if they're side by side, otherwise the left and right edge offsets
  if (S.r <= T.l) add("h", S.r, yMid, T.l, yMid);
  else if (T.r <= S.l) add("h", T.r, yMid, S.l, yMid);
  else {
    add("h", Math.min(S.l, T.l), yMid, Math.max(S.l, T.l), yMid);
    add("h", Math.min(S.r, T.r), yMid, Math.max(S.r, T.r), yMid);
  }

  // vertical: same idea
  if (S.b <= T.t) add("v", xMid, S.b, xMid, T.t);
  else if (T.b <= S.t) add("v", xMid, T.b, xMid, S.t);
  else {
    add("v", xMid, Math.min(S.t, T.t), xMid, Math.max(S.t, T.t));
    add("v", xMid, Math.min(S.b, T.b), xMid, Math.max(S.b, T.b));
  }

  return out;
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
  text: "text-[#737373] dark:text-[#ABABAB]",
  subtext: "text-[#737373] dark:text-[#ABABAB]",
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
            className="h-6 w-auto select-none dark:hidden"
          />
          <img
            src={`${import.meta.env.BASE_URL}logo-dark.svg`}
            alt="Bezel"
            draggable={true}
            className="hidden h-6 w-auto select-none dark:block"
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
{exportOpen && (
  <ExportMenu
    videoOn={videoOn} exporting={exporting} exportProgress={exportProgress}
    exportFormat={exportFormat} setExportFormat={setExportFormat}
    videoFormat={videoFormat} setVideoFormat={setVideoFormat}
    videoRes={videoRes} setVideoRes={setVideoRes}
    videoSpeed={videoSpeed} setVideoSpeed={setVideoSpeed}
    videoFps={videoFps} setVideoFps={setVideoFps}
    exportTransparent={exportTransparent} setExportTransparent={setExportTransparent}
    canvasSize={canvasSize} setCanvasSize={setCanvasSize}
    exportWidth={exportWidth} setExportWidth={setExportWidth}
    vidDuration={vidDuration} measuredBpp={measuredBpp} exactSize={exactSize} sampleKey={sampleKey}
    videoOutDims={videoOutDims} exportDims={exportDims} handleExport={handleExport}
  />
)}
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
      className={`rail-icon rail-devices ${
        devicesDisabled
          ? "text-[#737373] dark:text-[#ABABAB]"
          : sidebarPanel === "create" && sidebarOpen
          ? "text-[#FF47BC]"
          : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
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
                    className={`rail-icon rail-projects ${
                      sidebarPanel === "projects" && sidebarOpen
                        ? "text-[#FF47BC]"
                        : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
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
                  className={`rail-icon rail-templates ${
                    sidebarPanel === "templates" && sidebarOpen
                      ? "text-[#FF47BC]"
                      : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
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
                    className={`rail-icon rail-help ${
                      helpOpen
                        ? "text-[#FF47BC]"
                        : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
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
  <CaretRight size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB]" />
</span>
                      </button>

                      {themeMenuOpen && (
                        <div className="side-enter absolute left-[calc(100%+5px)] bottom-[-1px] w-[200px] p-2 gap-1 flex flex-col items-start bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                          <span className="block px-2 pt-1 pb-1 text-[11px] font-semibold tracking-[0.02em] text-[#737373] dark:text-[#ABABAB]">
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
              <div className="flex items-center gap-1">
                {sidebarPanel === "projects" && (
                  <>
                    <Tooltip label="Undo" placement="bottom">
                      <button
                        type="button"
                        aria-label="Undo project change"
                        onClick={undoProjects}
                        disabled={!canUndoProjects}
                        className="group flex items-center justify-center w-7 h-7 rounded-lg enabled:hover:bg-black/5 dark:enabled:hover:bg-white/5 transition-[background-color,transform,opacity] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                      >
                        <ArrowUUpLeft size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Redo" placement="bottom">
                      <button
                        type="button"
                        aria-label="Redo project change"
                        onClick={redoProjects}
                        disabled={!canRedoProjects}
                        className="group flex items-center justify-center w-7 h-7 rounded-lg enabled:hover:bg-black/5 dark:enabled:hover:bg-white/5 transition-[background-color,transform,opacity] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                      >
                        <ArrowUUpRight size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
                      </button>
                    </Tooltip>
                  </>
                )}
                <Tooltip label="Close sidebar" shortcut={["mod", "\\"]} placement="bottom">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="group flex flex-row items-center justify-center w-7 h-7 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <SidebarSimple size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                  </button>
                </Tooltip>
              </div>
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
<span className="device-title block px-2 pt-1 pb-1 uppercase text-[#737373] dark:text-[#ABABAB]">
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
                  : "text-[#737373] dark:text-[#ABABAB] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
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
                  <AnimCategoryList categories={PARAM_CATEGORIES} templates={PARAM_ALL} onPick={setAnimCategory} selected={animCategory && animCategory !== "All" ? animCategory : activeParamTpl?.category ?? "All"} />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 w-full flex-1 py-8">
                  <CardsThree size={40} weight="fill" className="folder-enter text-[#D9D9D9] dark:text-[#3A3A40]" />
                  <span className="text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB] text-center px-4 leading-4">
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
                      label={animTab && (animCategory === "All" || templateSearch) ? `${tpl.category} ${tpl.label}` : tpl.label}
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
                                className={`flex-1 min-w-0 text-left text-[12px] font-medium leading-4 tracking-[-0.005em] truncate transition-colors duration-150 ${
                                  activeTemplateId === tpl.id
                                    ? "text-[#FF47BC]"
                                    : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
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
                  <span className="text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB] text-center px-4 leading-4">
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
            <div ref={canvasAreaRef} className="absolute inset-0 flex items-center justify-center overflow-hidden">
              {(() => {
                const selectedRatio =
                  canvasSize === "Custom"
                    ? customWidth > 0 && customHeight > 0
                      ? customWidth / customHeight
                      : null
                    : CANVAS_SIZE_OPTIONS.find((o) => o.value === canvasSize)?.ratio;

                const fitted = !areaDims
                  ? null
                  : selectedRatio
                  ? (() => {
                      const w = Math.min(areaDims.w, areaDims.h * selectedRatio);
                      return { width: w, height: w / selectedRatio };
                    })()
                  : { width: areaDims.w, height: areaDims.h };
                const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
                const eased = !reduced && performance.now() < canvasEaseUntilRef.current;
                const boxStyle = {
                  ...(fitted ?? { width: "100%", height: "100%" }),
                  flexShrink: 0,
                  transition: eased
                    ? `width ${CANVAS_EASE_MS}ms cubic-bezier(0.22, 1, 0.36, 1), height ${CANVAS_EASE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                    : "none",
                };

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
                      <span className="flex items-center gap-2 h-8 px-3 rounded-2xl bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">
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
                        onContextMenu={openFrameMenu}
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
                        markIds={frames.filter((f, k) => { const a = f.asset ?? k; return a === animSel || a === animHover; }).map((f) => f.id)}
                        onFrameHover={(id) => setAnimHover(id == null ? null : animAssetOf(id))}
                        onFrameClick={(id) => setAnimSel(id == null ? null : animAssetOf(id))}
                        onVideoReady={() => syncVideos(vidTimeRef.current, vidLive.current.playing)}
                        nativeSizeOf={nativeSizeOf}
                        depthTint={depthTintOf({ bgType, bgHex, gradientStops })}
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

{altMeasures.length > 0 && (
  <div aria-hidden className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
    {[...new Set(altMeasures.map((m) => m.target).filter(Boolean))].map((o, i) => (
      <div
        key={`cmp-${i}`}
        className="absolute rounded-[2px]"
        style={{ left: o.l, top: o.t, width: o.r - o.l, height: o.b - o.t, outline: `2px solid ${GUIDE}` }}
      />
    ))}
    {altMeasures.map((m, i) => {
      const horiz = m.axis === "h";
      const len = horiz ? Math.abs(m.x2 - m.x1) : Math.abs(m.y2 - m.y1);
      return (
        <div
          key={i}
          className="absolute"
          style={{
            left: Math.min(m.x1, m.x2),
            top: Math.min(m.y1, m.y2),
            width: horiz ? len : 1,
            height: horiz ? 1 : len,
          }}
        >
          <div className="absolute inset-0" style={{ background: GUIDE }} />
          {/* end caps */}
          <div
            className="absolute"
            style={{ background: GUIDE, ...(horiz ? { left: 0, top: -3, width: 1, height: 7 } : { top: 0, left: -3, height: 1, width: 7 }) }}
          />
          <div
            className="absolute"
            style={{ background: GUIDE, ...(horiz ? { right: 0, top: -3, width: 1, height: 7 } : { bottom: 0, left: -3, height: 1, width: 7 }) }}
          />
          {/* value */}
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center h-4 px-1 rounded-[4px] text-[10px] leading-4 font-medium tabular-nums text-[#FAF9FA] whitespace-nowrap"
            style={{ background: GUIDE }}
          >
            {m.value}
          </span>
        </div>
      );
    })}
  </div>
)}

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
          className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-[transform,color] duration-200"
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
      <ArrowUUpLeft size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
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
      <ArrowUUpRight size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
    </button>
  </Tooltip>
</div>

{(fxBusy || mediaLoading > 0 || saving) && (
  <div
    role="status"
    aria-live="polite"
    className="pop-enter pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 h-8 px-3 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]"
  >
    <CircleNotch size={14} weight="regular" className="animate-spin text-[#FF47BC]" />
    {saving ? "Saving project…" : mediaLoading > 0 ? "Loading media…" : "Rendering filters…"}
  </div>
)}

{/* Canvas size dropdown — bottom-right overlay */}
            <div className="absolute bottom-4 right-4 flex items-start gap-1 z-10" ref={canvasSizeRef} data-tour="canvas-size">
<Tooltip label={canvasSizeOpen ? "" : "Canvas size"} placement="vertical">
  <button type="button" onClick={() => setCanvasSizeOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} min-w-[88px]`}>
    <span className="whitespace-nowrap text-[13px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">{canvasSize}</span>
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
                      <span className="text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">Custom</span>
                      <span
                        aria-hidden
                        className="flex items-center justify-center w-[22px] h-[22px] rounded-lg text-[#737373] dark:text-[#ABABAB] transition-[background-color,color,transform] duration-150 group-hover/hdr:bg-black/5 dark:group-hover/hdr:bg-white/5 group-hover/hdr:text-[#3A3A3A] dark:group-hover/hdr:text-white group-active/hdr:scale-[0.94]"
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
            className="flex items-center gap-1 h-11 px-2 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shrink-0"
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
                  className={`flex items-center justify-center h-7 px-3 rounded-lg text-[12px] leading-4 font-medium tracking-[-0.005em] transition-colors duration-150 ${
                    active
                      ? "bg-[#EDEDED] dark:bg-[#292929] text-[#3A3A3A] dark:text-[#FAF9FA]"
                      : "text-[#737373] dark:text-[#ABABAB] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
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
                     <Crop size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
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
                      <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#F04438] transition-colors" />
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
                  className={uploadDrop.dragOver ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"}
                />
                <span
                  className={`text-[13px] font-medium tracking-[-0.005em] ${
                    uploadDrop.dragOver ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"
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
              {animTab ? (
                <AnimAssetList
                  frames={frames}
                  animAssetCount={animAssetCount}
                  animPool={animPool}
                  animSel={animSel}
                  setAnimSel={setAnimSel}
                  animHover={animHover}
                  setAnimHover={setAnimHover}
                  animSlotRef={animSlotRef}
                  pickFrameFile={pickFrameFile}
                  animDragRef={animDragRef}
                  animDragFrom={animDragFrom}
                  setAnimDragFrom={setAnimDragFrom}
                  animDrop={animDrop}
                  setAnimDrop={setAnimDrop}
                  moveAnimAsset={moveAnimAsset}
                  endAnimDrag={endAnimDrag}
                  setFrameCropId={setFrameCropId}
                  setFrames={setFrames}
                  removeAnimAsset={removeAnimAsset}
                  clearAnimAssets={clearAnimAssets}
                  mediaLoading={mediaLoading}
                />
              ) : (
                <FrameAssetList
                  frames={frames}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  setSelectedTextId={setSelectedTextId}
                  setFrames={setFrames}
                  dragIdRef={dragIdRef}
                  draggingId={draggingId}
                  setDraggingId={setDraggingId}
                  frameDrop={frameDrop}
                  setFrameDrop={setFrameDrop}
                  moveFrameRow={moveFrameRow}
                  endFrameDrag={endFrameDrag}
                  openFrameMenu={openFrameMenu}
                  pickFrameFile={pickFrameFile}
                  setFrameCropId={setFrameCropId}
                  deleteFrames={deleteFrames}
                  mediaLoading={mediaLoading}
                />
              )}
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
            <>
              {activeParamTpl.planeKey && (
                <div className="flex flex-col gap-2 mb-1">
                  <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Ratio</label>
                  <SizeLockRow
                    width={planeVals.planeW}
                    height={planeVals.planeH}
                    onWidthChange={(v) => setPlaneSize("w", v)}
                    onHeightChange={(v) => setPlaneSize("h", v)}
                    locked={planeVals.planeLock}
                    onToggleLock={() => changeTplParam(activeParamTpl, "planeLock", !planeVals.planeLock)}
                  />
                  <Scrubber
                    label="Scale"
                    value={planeVals.planeScale}
                    min={10}
                    max={300}
                    hardMax={1000}
                    onChange={(v) => changeTplParam(activeParamTpl, "planeScale", v)}
                  />
                </div>
              )}
              <TemplateParams
                params={activeParamTpl.params.filter((p) => p.section == null && p.key !== activeParamTpl.planeKey)}
                values={{ ...defaultParams(activeParamTpl.params), ...tplParams[activeParamTpl.id] }}
                onChange={(k, v) => changeTplParam(activeParamTpl, k, v)}
              />
              <button
                onClick={() => patchTplParams(activeParamTpl, ctrlDefaults)}
                disabled={ctrlAtDefault}
                className="w-full h-8 flex items-center justify-center gap-2 pl-2 pr-2.5 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] enabled:hover:bg-[#F5F5F5] dark:enabled:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <ArrowCounterClockwise size={14} weight="regular" /> Reset controls
              </button>
            </>
          ) : (
            <span className="text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">
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
            <Plus size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB]" />
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
                      active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
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
    className="flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
  >
    {x.on ? (
      <Eye size={14} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"} />
    ) : (
      <EyeSlash size={14} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"} />
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
    className="group/x flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
  >
    <X size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover/x:text-[#F04438] transition-colors" />
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
      : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
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
                      <Rows size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
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
  frameBrowser={frameBrowser}
  updateBrowser={updateBrowser}
  browserOptions={BROWSER_OPTIONS}
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
                            <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Browser</label>
                            <ToolbarDropdown value={browserType} options={browserOptions} onChange={setBrowserType} />
                          </div>
                          {browserType === "safari" && (
                            <div className="flex flex-col gap-2">
                              <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Tabs</label>
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
                          <label className="text-[12px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Address</label>
                          <div className="flex items-center px-2 py-2 bg-[#EDEDED] hover:bg-[#E3E3E3] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-[10px] border border-transparent focus-within:border-[#FF47BC] transition-colors">
                            <input
                              value={browserUrl}
                              onChange={(e) => setBrowserUrl(e.target.value)}
                              placeholder="bezel.app"
                              className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] placeholder:text-[#737373] dark:text-[#FAF9FA] outline-none"
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
                                : "bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#EAEAEA] dark:hover:bg-[#333333] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] text-[#737373] dark:text-[#ABABAB]"
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
                                : "bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#EAEAEA] dark:hover:bg-[#333333] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] text-[#737373] dark:text-[#ABABAB]"
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
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Background</label>
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
<div className="flex items-center gap-1 shrink-0">
  <Tooltip label="Crop image" placement="bottom">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleOpenCustomCropModal();
      }}
      className="group flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
    >
      <Crop size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
    </button>
  </Tooltip>
  <Tooltip label="Remove image" placement="bottom">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleClearCustomImage();
      }}
      className="group flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
    >
      <X size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#F04438] transition-colors" />
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
                            <UploadSimple size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB]" />
                            <span className="text-[13px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">Click or drag & drop to upload</span>
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
                          <label className="text-[12px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Presets</label>
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
                      <label className="text-[12px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Presets</label>
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
                                  active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
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
      className="flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
    >
      {fx.visible ? (
        <Eye size={14} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"} />
      ) : (
        <EyeSlash size={14} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"} />
      )}
    </button>
  </Tooltip>
)}
<Tooltip label="Remove" placement="bottom" className="shrink-0">
  <button
    type="button"
    aria-label="Remove"
    onClick={() => removeGradFx(fx.id)}
    className="group/x flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
  >
    <X size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover/x:text-[#F04438] transition-colors" />
  </button>
</Tooltip>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Environment</label>
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
                              : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                          } ${hidden ? "opacity-50" : ""}`}
                        >
                          {textLabel(t)}
                        </button>
                        <Tooltip label={hidden ? "Show text" : "Hide text"} placement="bottom" className="shrink-0">
                          <button
                            type="button"
                            aria-label={hidden ? "Show text" : "Hide text"}
                            onClick={() => updateTextById(t.id, { visible: hidden })}
                            className={`flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
                              active ? "opacity-100" : "opacity-0"
                            }`}
                          >
                            {hidden ? (
                              <EyeSlash size={14} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"} />
                            ) : (
                              <Eye size={14} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"} />
                            )}
                          </button>
                        </Tooltip>
                        <Tooltip label="Delete text" placement="bottom" className="shrink-0">
                          <button
                            type="button"
                            aria-label="Delete text"
                            onClick={() => deleteTextLayer(t.id)}
                            className={`group/x flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
                              active ? "opacity-100" : "opacity-0"
                            }`}
                          >
                            <X size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover/x:text-[#F04438] transition-colors" />
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
                  <Plus size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB]" />
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
                            active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
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
                              <Eye size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"} />
                            ) : (
                              <EyeSlash size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"} />
                            )}
                          </button>
                        </Tooltip>
                        <Tooltip label="Remove" placement="bottom" className="shrink-0 -ml-1">
                          <button
                            type="button"
                            aria-label="Remove"
                            onClick={() => removeEffect(fx.id)}
                            className="group/x flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                          >
                            <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover/x:text-[#F04438] transition-colors" />
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
        <FxAddMenu
          menuRef={fxMenuRef}
          menu={fxMenu}
          items={fxMenu.kind === "gradient" ? GRAD_FX_LIST : fxMenu.kind === "frame" ? FRAME_FX : fxMenu.kind === "mockup" ? MOCKUP_FX : FX_TYPES}
          onPick={(type) => {
            if (fxMenu.kind === "gradient") addGradFx(type);
            else if (fxMenu.kind === "frame" || fxMenu.kind === "mockup") addEffect(type);
            else if (animTplRef.current) addAnimFx(animTplRef.current, type);
            setFxMenu(null);
          }}
        />
      )}

      {frameMenu && (
        <FrameContextMenu
          frameMenu={frameMenu}
          setFrameMenu={setFrameMenu}
          frames={frames}
          selectedIds={selectedIds}
          videoOn={videoOn}
          animTab={animTab}
          vidShots={vidShots}
          vidLive={vidLive}
          frameClipRef={frameClipRef}
          askTimeline={askTimeline}
          vidDuplicate={vidDuplicate}
          duplicateSelected={duplicateSelected}
          vidGroup={vidGroup}
          vidUngroup={vidUngroup}
          copyFrames={copyFrames}
          pasteFrames={pasteFrames}
          reorderSelected={reorderSelected}
          toggleHideSelected={toggleHideSelected}
          toggleLockSelected={toggleLockSelected}
          flipSelected={flipSelected}
          vidDelete={vidDelete}
          deleteSelected={deleteSelected}
        />
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
              className="flex items-center justify-between w-full h-8 pl-2 pr-2 gap-4 rounded-lg text-[12px] font-medium tracking-[-0.005em] whitespace-nowrap text-[#737373] dark:text-[#ABABAB] enabled:hover:text-[#3A3A3A] dark:enabled:hover:text-[#FAF9FA] enabled:hover:bg-[#F2F2F2] dark:enabled:hover:bg-[#1F1F1F] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
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
        return (
          <ProjectMenu
            p={p}
            projectMenu={projectMenu}
            projectMenuRef={projectMenuRef}
            setProjectMenu={setProjectMenu}
            handleRestoreProject={handleRestoreProject}
            handlePurgeProject={handlePurgeProject}
            handleOpenProjectInNewTab={handleOpenProjectInNewTab}
            handleCopyProjectLink={handleCopyProjectLink}
            handleTogglePin={handleTogglePin}
            handleDuplicateProject={handleDuplicateProject}
            startRenameProject={startRenameProject}
            setMoveTarget={setMoveTarget}
            handleDeleteProject={handleDeleteProject}
          />
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
        <EffectPopup
          openEffect={openEffect}
          effectPopupPos={effectPopupPos}
          effectPopupRef={effectPopupRef}
          closeEffectPopup={closeEffectPopup}
          toolbarMode={toolbarMode}
          changeEffectType={changeEffectType}
          updateEffect={updateEffect}
          canvasDims={canvasDims}
          handleSwatchClick={handleSwatchClick}
          makePercentDrag={makePercentDrag}
        />
      )}

      {animFxId != null && effectPopupPos && activeParamTpl && (
        <AnimEffectPopup
          animFxId={animFxId}
          effectPopupPos={effectPopupPos}
          effectPopupRef={effectPopupRef}
          activeParamTpl={activeParamTpl}
          animFxList={animFxList}
          fxMeta={fxMeta}
          patchAnimFx={patchAnimFx}
          closeEffectPopup={closeEffectPopup}
          canvasDims={canvasDims}
          handleSwatchClick={handleSwatchClick}
          makePercentDrag={makePercentDrag}
        />
      )}

{activeGradFx && effectPopupPos && (
  <GradientFxPopup
    fx={activeGradFx}
    pos={effectPopupPos}
    popupRef={effectPopupRef}
    onClose={closeEffectPopup}
    set={(patch) => updateGradFx(activeGradFx.id, patch)}
    onTypeChange={(t) => changeGradFxType(activeGradFx.id, t)}
    grain={{ grainType, setGrainType, grainAmount, setGrainAmount, grainScale, setGrainScale, grainBlend, setGrainBlend }}
    handleSwatchClick={handleSwatchClick}
    makePercentDrag={makePercentDrag}
  />
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
          key={tourKind}
          kind={tourKind}
          onSwitchTour={() => {
            try { localStorage.setItem("bezel:tour-seen", "1"); } catch {}
            setTourOpen(false);
            if (imageOrVideo !== "video") {
              setImageOrVideo("video");
              setTimeout(startVideoTour, 450); // let the timeline mount
            } else startVideoTour();
          }}
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
          onMoveProjects={(list, done) => setMoveTarget({ list, done })}
          projects={savedProjects}
          selectedId={selectedProjectId}
          folders={folders}
          setFolders={setFoldersTracked}
          onClose={() => setProjectsPageOpen(false)}
          onOpen={openProject}
          onNewProject={() => {
            handleNewProject();
            setProjectsPageOpen(false);
          }}
          onMenu={toggleProjectMenu}
          menuId={projectMenu?.id ?? null}
          renamingId={null}
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

      {renamingProjectId && (() => {
        const rp = savedProjects.find((x) => x.id === renamingProjectId);
        if (!rp) return null;
        return <RenameModal name={rp.title} onSave={commitRenameProject} onClose={() => setRenamingProjectId(null)} />;
      })()}

      {moveTarget && (
        <MoveModal
          projects={moveTarget.list}
          folders={folders}
          onClose={() => setMoveTarget(null)}
          onCreateFolder={handleCreateFolder}
          onMove={(folderId) => {
            moveTarget.list.forEach((p) => handleMoveProject(p.id, folderId));
            moveTarget.done?.();
            setMoveTarget(null);
          }}
        />
      )}

      {!splashGone && !projectsPageOpen && (
        <div
          aria-hidden
          className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-6 ${chrome.appBg} transition-opacity duration-300 ${
            appReady ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div
            className={`relative h-10 aspect-[79/15] transition-transform duration-300 ${
              appReady ? "scale-[1.04]" : "scale-100"
            }`}
          >
            {/* icon sits in the first 14 of the logo's 79 units */}
            <img
              src={`${import.meta.env.BASE_URL}logo-icon.png`}
              alt=""
              draggable={false}
              className="splash-icon absolute left-0 top-0 h-[93.33%] w-auto select-none"
            />
            <img
              src={`${import.meta.env.BASE_URL}logo-wordmark-light.svg`}
              alt=""
              draggable={false}
              className="splash-word absolute inset-0 w-full h-full select-none dark:hidden"
            />
            <img
              src={`${import.meta.env.BASE_URL}logo-wordmark-dark.svg`}
              alt=""
              draggable={false}
              className="splash-word absolute inset-0 w-full h-full select-none hidden dark:block"
            />
          </div>
          <div className="splash-track relative w-12 h-[3px] rounded-full overflow-hidden bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10">
            <div className="splash-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-[#FF47BC]" />
          </div>
        </div>
      )}
      <Toaster />
    </div>
  );
}