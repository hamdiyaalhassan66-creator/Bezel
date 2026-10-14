import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import MockupScene, { PRESETS, paintPhoneChrome, paintTextItem, getStrapStyles } from "./MockupScene.jsx";
import ColorPicker from "./ColorPicker.jsx";
import GradientPicker from "./GradientPicker.jsx";
import CropModal from "./CropModal.jsx";
import ShortcutsModal, { KeyCap, ALT } from "./ShortcutsModal.jsx";
import Tooltip from "./Tooltip.jsx";
import OptionRow from "./OptionRow.jsx";
import ToolbarDropdown, { DROPDOWN_TRIGGER, DROPDOWN_CARET } from "./Dropdown.jsx";
import DimensionInput from "./DimensionInput.jsx";
import AppTour from "./AppTour.jsx";
import { OffsetField, SizeLockRow } from "./SizeFields.jsx";
import { createPortal } from "react-dom";
import {
  VIDEO_FORMATS, VIDEO_RESOLUTIONS, VIDEO_SPEEDS, VIDEO_FPS_OPTIONS,
  fitVideoDims, estimateVideoBytes, encodeVideoFrames,
} from "./exportVideo.js";

import {
  UploadSimple,
  DownloadSimple,
  ArrowCounterClockwise,
  Moon,
  Sun,
  CaretDown,
  CaretUp,
  MagnifyingGlass,
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
  Desktop,
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
// zoom 70 / fov 27 match the camera's starting framing (fov slider 27 = 32°).
// Tune zoom per preset if one should sit closer or farther.
const CAMERA_VIEW_PRESETS = [
  { key: "hero", label: "Hero", rotationX: -15, rotationY: 25, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 },
  { key: "right-angled", label: "Right-angled", rotationX: -10, rotationY: 45, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 },
  { key: "front", label: "Front", rotationX: 0, rotationY: 0, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 },
  { key: "bottom", label: "Bottom", rotationX: 45, rotationY: 0, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 },
];

// Extra angles used only by templates. Key must match a template's cameraKey.
const EXTRA_CAMERA_VIEWS = [
  { key: "isometric", label: "Isometric", rotationX: -35, rotationY: 45, rotationZ: 0, positionX: 0, positionY: 0, zoom: 68, fov: 27 },
  { key: "dutch", label: "Dutch tilt", rotationX: -12, rotationY: 28, rotationZ: -16, positionX: 0, positionY: 0, zoom: 70, fov: 27 },
  { key: "overhead", label: "Overhead", rotationX: -75, rotationY: 25, rotationZ: 0, positionX: 0, positionY: 0, zoom: 66, fov: 27 },
  { key: "low-angle", label: "Low angle", rotationX: 28, rotationY: -28, rotationZ: 0, positionX: 0, positionY: 0, zoom: 78, fov: 40 },
  { key: "macro", label: "Macro", rotationX: -22, rotationY: 38, rotationZ: 0, positionX: 18, positionY: -42, zoom: 100, fov: 22 },
  { key: "wide", label: "Fisheye", rotationX: -18, rotationY: 52, rotationZ: 0, positionX: 0, positionY: 0, zoom: 88, fov: 105 },
  { key: "profile", label: "Profile", rotationX: -6, rotationY: 78, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 },
  { key: "back", label: "Back", rotationX: -12, rotationY: 150, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 },
  { key: "sideways", label: "Sideways", rotationX: -10, rotationY: 22, rotationZ: 90, positionX: 0, positionY: 0, zoom: 62, fov: 27 },
  { key: "far", label: "Far", rotationX: -15, rotationY: -30, rotationZ: 0, positionX: 0, positionY: 0, zoom: 28, fov: 20 },
  { key: "tumble", label: "Tumble", rotationX: -30, rotationY: -60, rotationZ: 25, positionX: 0, positionY: 0, zoom: 64, fov: 27 },
];
const TEMPLATE_CAMERAS = [...CAMERA_VIEW_PRESETS, ...EXTRA_CAMERA_VIEWS];

// Thumbnails pull the camera back a little so tilted / rotated devices don't clip the card.
const templatePreviewCam = (t) => {
  const cam = TEMPLATE_CAMERAS.find((p) => p.key === t.cameraKey) ?? CAMERA_VIEW_PRESETS[0];
  return { ...cam, zoom: Math.max(0, cam.zoom - 15) };
};

// Device-agnostic looks. Applied to whichever device is currently selected.
// bg.preset values refer to GRADIENT_PRESETS / IMAGE_PRESETS; lighting / environment
// values refer to PRESETS (MockupScene) and ENVIRONMENT_OPTIONS.
const TEMPLATE_LIBRARY = [
  { id: "clean-studio", label: "Clean Studio", tags: "light minimal soft", cameraKey: "front",
    bg: { type: "solid", hex: "EDEBE7" }, environment: "studio", lighting: "softbox", lightingIntensity: 55 },
  { id: "ocean-hero", label: "Ocean Hero", tags: "blue clean product", cameraKey: "hero",
    bg: { type: "gradient", preset: "ocean-blue" }, environment: "clouds", lighting: "studio", lightingIntensity: 60 },
  { id: "golden-hour", label: "Golden Hour", tags: "warm orange sunset", cameraKey: "right-angled",
    bg: { type: "gradient", preset: "sunset-orange" }, grain: 12, environment: "city", lighting: "golden-hour", lightingIntensity: 70 },
  { id: "neon-night", label: "Neon Night", tags: "dark purple cyberpunk", cameraKey: "hero",
    bg: { type: "gradient", preset: "violet-noir" }, grain: 8, environment: "city", lighting: "neon", lightingIntensity: 75 },
  { id: "moody-noir", label: "Moody Noir", tags: "dark dramatic", cameraKey: "right-angled",
    bg: { type: "solid", hex: "0C0D10" }, environment: "studio", lighting: "moody", lightingIntensity: 65 },
  { id: "forest-mist", label: "Forest Mist", tags: "green natural", cameraKey: "hero",
    bg: { type: "gradient", preset: "forest-green" }, environment: "forest", lighting: "overcast", lightingIntensity: 55 },
  { id: "warm-editorial", label: "Warm Editorial", tags: "photo warm soft", cameraKey: "front",
    bg: { type: "custom", preset: "warm-gradient" }, environment: "studio", lighting: "softbox", lightingIntensity: 50 },
  { id: "iridescent", label: "Iridescent", tags: "photo metallic bold", cameraKey: "bottom",
    bg: { type: "custom", preset: "iridescent-metallic-art" }, environment: "city", lighting: "studio", lightingIntensity: 60 },
    { id: "isometric-pop", label: "Isometric Pop", tags: "isometric warm orange angle", cameraKey: "isometric",
    bg: { type: "gradient", preset: "amber-sky" }, environment: "studio", lighting: "softbox", lightingIntensity: 55 },
  { id: "dutch-tilt", label: "Dutch Tilt", tags: "tilted dramatic blue bold", cameraKey: "dutch",
    bg: { type: "gradient", preset: "cobalt-flare" }, environment: "city", lighting: "neon", lightingIntensity: 70 },
  { id: "overhead-flatlay", label: "Overhead", tags: "top down flat lay light", cameraKey: "overhead",
    bg: { type: "solid", hex: "F4EFE6" }, environment: "studio", lighting: "softbox", lightingIntensity: 50 },
  { id: "sky-low", label: "Sky Low", tags: "low angle sky clouds photo", cameraKey: "low-angle",
    bg: { type: "custom", preset: "blue-sky-scene" }, environment: "clouds", lighting: "studio", lightingIntensity: 60 },
  { id: "macro-edge", label: "Macro Edge", tags: "close up detail dark", cameraKey: "macro",
    bg: { type: "solid", hex: "0A0A0C" }, environment: "studio", lighting: "moody", lightingIntensity: 70 },
  { id: "fisheye-glow", label: "Fisheye Glow", tags: "wide lens glow distortion photo", cameraKey: "wide",
    bg: { type: "custom", preset: "abstract-glowing-object" }, environment: "city", lighting: "neon", lightingIntensity: 75 },
  { id: "razor-profile", label: "Razor Profile", tags: "side thin edge steel", cameraKey: "profile",
    bg: { type: "gradient", preset: "steel-blue" }, environment: "studio", lighting: "overcast", lightingIntensity: 55 },
  { id: "back-glass", label: "Back Glass", tags: "back camera ethereal soft photo", cameraKey: "back",
    bg: { type: "custom", preset: "ethereal-gradient-abstraction" }, environment: "clouds", lighting: "softbox", lightingIntensity: 55 },
  { id: "sideways-bars", label: "Sideways Bars", tags: "rotated landscape graphic photo", cameraKey: "sideways",
    bg: { type: "custom", preset: "gradient-bars" }, environment: "studio", lighting: "studio", lightingIntensity: 60 },
  { id: "distant-float", label: "Distant Float", tags: "far small minimal dusk", cameraKey: "far",
    bg: { type: "gradient", preset: "dusk-horizon" }, grain: 10, environment: "clouds", lighting: "golden-hour", lightingIntensity: 55 },
  { id: "red-tumble", label: "Red Tumble", tags: "tumble spin red texture photo bold", cameraKey: "tumble",
    bg: { type: "custom", preset: "textured-red-surface" }, environment: "city", lighting: "studio", lightingIntensity: 65 },
  { id: "submerged", label: "Submerged", tags: "surreal low moody photo", cameraKey: "low-angle",
    bg: { type: "custom", preset: "submerged-surreal-form" }, environment: "clouds", lighting: "moody", lightingIntensity: 55 },
  { id: "golden-dome", label: "Golden Dome", tags: "yellow overhead warm photo", cameraKey: "overhead",
    bg: { type: "custom", preset: "textured-yellow-dome" }, environment: "studio", lighting: "softbox", lightingIntensity: 55 },
  { id: "amber-dusk-low", label: "Amber Dusk", tags: "dusk warm low grain", cameraKey: "low-angle",
    bg: { type: "gradient", preset: "amber-dusk" }, grain: 12, environment: "city", lighting: "golden-hour", lightingIntensity: 75 },
  { id: "teal-macro", label: "Teal Macro", tags: "teal green close up", cameraKey: "macro",
    bg: { type: "gradient", preset: "deep-teal" }, grain: 6, environment: "studio", lighting: "moody", lightingIntensity: 65 },
  { id: "magenta-tumble", label: "Magenta Tumble", tags: "pink neon spin dark", cameraKey: "tumble",
    bg: { type: "gradient", preset: "midnight-magenta" }, grain: 8, environment: "city", lighting: "neon", lightingIntensity: 75 },
  { id: "fluid-fisheye", label: "Fluid Fisheye", tags: "abstract fluid wide photo", cameraKey: "wide",
    bg: { type: "custom", preset: "abstract-fluid-forms" }, environment: "studio", lighting: "studio", lightingIntensity: 60 },
  { id: "meadow-iso", label: "Meadow Iso", tags: "green spring isometric natural", cameraKey: "isometric",
    bg: { type: "gradient", preset: "spring-meadow" }, environment: "forest", lighting: "overcast", lightingIntensity: 55 },
];

// Frame-mode looks. Applied to the selected frames: background, sheen, radius, stroke, shadow.
const FRAME_TEMPLATE_LIBRARY = [
  { id: "f-clean-studio", label: "Clean Studio", tags: "light minimal soft", note: "Soft shadow",
    bg: { type: "solid", hex: "EDEBE7" }, environment: "studio", radius: 8,
    shadow: { x: 0, y: 40, blur: 80, spread: 0, hex: "000000", opacity: 22 } },
  { id: "f-ocean", label: "Ocean", tags: "blue clean product", note: "Rounded",
    bg: { type: "gradient", preset: "ocean-blue" }, environment: "clouds", radius: 12,
    shadow: { x: 0, y: 50, blur: 90, spread: -10, hex: "02304F", opacity: 35 } },
  { id: "f-golden", label: "Golden Hour", tags: "warm orange sunset", note: "Warm glow", grain: 12,
    bg: { type: "gradient", preset: "sunset-orange" }, environment: "city", radius: 10,
    shadow: { x: 0, y: 40, blur: 100, spread: 0, hex: "5A1E00", opacity: 40 } },
  { id: "f-neon", label: "Neon Night", tags: "dark purple cyberpunk", note: "Outline", grain: 8,
    bg: { type: "gradient", preset: "violet-noir" }, environment: "city", radius: 10,
    stroke: { hex: "3DD1FF", opacity: 80, width: 2, position: "outside" },
    shadow: { x: 0, y: 0, blur: 80, spread: 0, hex: "6A2EE8", opacity: 55 } },
  { id: "f-noir", label: "Moody Noir", tags: "dark dramatic", note: "Hairline",
    bg: { type: "solid", hex: "0C0D10" }, environment: "studio", radius: 6,
    stroke: { hex: "FFFFFF", opacity: 18, width: 1, position: "inside" },
    shadow: { x: 0, y: 30, blur: 70, spread: 0, hex: "000000", opacity: 70 } },
  { id: "f-forest", label: "Forest Mist", tags: "green natural", note: "Soft",
    bg: { type: "gradient", preset: "forest-green" }, environment: "forest", radius: 14,
    shadow: { x: 0, y: 40, blur: 80, spread: 0, hex: "0B2A0E", opacity: 40 } },
  { id: "f-editorial", label: "Warm Editorial", tags: "photo warm soft", note: "Photo bg",
    bg: { type: "custom", preset: "warm-gradient" }, environment: "studio", radius: 4,
    shadow: { x: 0, y: 30, blur: 60, spread: 0, hex: "000000", opacity: 25 } },
  { id: "f-iridescent", label: "Iridescent", tags: "photo metallic bold", note: "Photo bg",
    bg: { type: "custom", preset: "iridescent-metallic-art" }, environment: "city", radius: 12,
    stroke: { hex: "FFFFFF", opacity: 60, width: 2, position: "inside" },
    shadow: { x: 0, y: 40, blur: 90, spread: 0, hex: "000000", opacity: 35 } },
  { id: "f-flat", label: "Flat Paper", tags: "flat light minimal print", note: "No shadow",
    bg: { type: "solid", hex: "F4EFE6" }, environment: "none", radius: 2,
    stroke: { hex: "000000", opacity: 12, width: 1, position: "inside" } },
  { id: "f-sky", label: "Sky", tags: "sky clouds photo", note: "Photo bg",
    bg: { type: "custom", preset: "blue-sky-scene" }, environment: "clouds", radius: 16,
    shadow: { x: 0, y: 50, blur: 100, spread: -10, hex: "0A2A5A", opacity: 35 } },
  { id: "f-dusk", label: "Amber Dusk", tags: "dusk warm grain", note: "Grain", grain: 12,
    bg: { type: "gradient", preset: "amber-dusk" }, environment: "city", radius: 10,
    shadow: { x: 0, y: 40, blur: 90, spread: 0, hex: "000000", opacity: 50 } },
  { id: "f-teal", label: "Deep Teal", tags: "teal green dark", note: "Sharp", grain: 6,
    bg: { type: "gradient", preset: "deep-teal" }, environment: "studio", radius: 3,
    shadow: { x: 0, y: 30, blur: 70, spread: 0, hex: "000000", opacity: 55 } },
  { id: "f-magenta", label: "Magenta", tags: "pink neon dark", note: "Glow", grain: 8,
    bg: { type: "gradient", preset: "midnight-magenta" }, environment: "city", radius: 12,
    shadow: { x: 0, y: 0, blur: 90, spread: 0, hex: "FF6FB5", opacity: 45 } },
  { id: "f-meadow", label: "Spring Meadow", tags: "green spring natural", note: "Rounded",
    bg: { type: "gradient", preset: "spring-meadow" }, environment: "forest", radius: 18,
    shadow: { x: 0, y: 40, blur: 80, spread: 0, hex: "1F3A1F", opacity: 30 } },
];

// Template card thumbnail for Frame mode: draws the selected frame itself (its image, or the placeholder).
// Frame-mode layouts. x / y = frame center as a fraction of canvas width / height (0 = middle, ±0.5 = edge).
// h = height as a fraction of canvas height, r = width / height. Later entries draw on top.
const FL = (x, y, h, r) => ({ x, y, h, r });
const FRAME_LAYOUTS = {
  single: [FL(0, 0, 0.8, 0.46)],
  // three phones side by side
  triple: [FL(-0.28, 0, 0.78, 0.46), FL(0, 0, 0.78, 0.46), FL(0.28, 0, 0.78, 0.46)],
  // two cards, third one half cut off by the right edge
  bleed: [FL(-0.24, 0, 0.8, 0.62), FL(0.14, 0, 0.8, 0.62), FL(0.52, 0, 0.8, 0.62)],
  // four overlapping, staggered cards
  overlap: [FL(-0.27, -0.06, 0.62, 0.78), FL(-0.09, 0.08, 0.62, 0.78), FL(0.09, -0.08, 0.62, 0.78), FL(0.27, 0.06, 0.62, 0.78)],
  // big frame + narrow frame, wide panel underneath
  hero: [FL(-0.155, -0.12, 0.62, 0.95), FL(0.195, -0.12, 0.62, 0.75), FL(0.02, 0.34, 0.3, 3.5)],
  // two tall cards, stepped vertically
  duo: [FL(-0.17, -0.1, 0.7, 0.58), FL(0.17, 0.1, 0.7, 0.58)],
  // three small stepped cards
  trio: [FL(-0.24, 0.05, 0.6, 0.58), FL(0, -0.05, 0.6, 0.58), FL(0.24, 0.05, 0.6, 0.58)],
  // 2 x 2 grid
  grid: [FL(-0.1, -0.22, 0.4, 0.7), FL(0.1, -0.22, 0.4, 0.7), FL(-0.1, 0.22, 0.4, 0.7), FL(0.1, 0.22, 0.4, 0.7)],
  // single frame rising from the bottom edge (about half visible)
  peek: [FL(0, 0.5, 1.1, 0.5)],
  // single frame, half cut off by the right / left edge
  sideHalf: [FL(0.5, 0, 0.9, 0.5)],
  sideHalfL: [FL(-0.5, 0, 0.9, 0.5)],
  // four cards in a row (carousel)
  strip: [FL(-0.33, 0, 0.7, 0.46), FL(-0.11, 0, 0.7, 0.46), FL(0.11, 0, 0.7, 0.46), FL(0.33, 0, 0.7, 0.46)],
};

// template id -> layout key. Anything not listed uses "single".
const FRAME_TEMPLATE_LAYOUT = {
  "f-ocean": "triple",
  "f-golden": "peek",
  "f-neon": "overlap",
  "f-noir": "bleed",
  "f-forest": "trio",
  "f-editorial": "hero",
  "f-iridescent": "duo",
  "f-flat": "grid",
  "f-sky": "sideHalf",
  "f-dusk": "peek",
  "f-magenta": "sideHalfL",
  "f-meadow": "bleed",
};
const layoutOf = (tpl) => FRAME_LAYOUTS[FRAME_TEMPLATE_LAYOUT[tpl.id]] ?? FRAME_LAYOUTS.single;

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

// Silhouette size (px) inside the 117px-high card preview, per device family
const TEMPLATE_DEVICE_SHAPE = {
  phone: { w: 30, h: 62, r: 7 },
  tablet: { w: 46, h: 62, r: 6 },
  desktop: { w: 78, h: 50, r: 4 },
  watch: { w: 34, h: 40, r: 10 },
};

const CANVAS_SIZE_OPTIONS = [
  { value: "Fill", label: "Fill", ratio: null },
  { value: "3:4", label: "3:4", sublabel: "1080×1440", ratio: 3 / 4, w: 1080, h: 1440 },
  { value: "3:2", label: "3:2", sublabel: "1620×1080", ratio: 3 / 2, w: 1620, h: 1080 },
  { value: "9:16", label: "9:16", sublabel: "1080×1920", ratio: 9 / 16, w: 1080, h: 1920 },
  { value: "1:1", label: "1:1", sublabel: "1080×1080", ratio: 1, w: 1080, h: 1080 },
  { value: "4:3", label: "4:3", sublabel: "1440×1080", ratio: 4 / 3, w: 1440, h: 1080 },
  { value: "2:3", label: "2:3", sublabel: "1080×1620", ratio: 2 / 3, w: 1080, h: 1620 },
  { value: "16:9", label: "16:9", sublabel: "1920×1080", ratio: 16 / 9, w: 1920, h: 1080 },
];

const EXPORT_SIZES = [
  { label: "2K", width: 1920 },
  { label: "4K", width: 3840 },
  { label: "8K", width: 7680, warn: true },
];

// bpp = rough bytes per pixel, only used for the size estimate
const EXPORT_FORMATS = [
  { value: "png", label: "PNG", mime: "image/png", ext: "png", bpp: 1.5 },
  { value: "jpg", label: "JPG", mime: "image/jpeg", ext: "jpg", bpp: 0.25 },
  { value: "webp", label: "WebP", mime: "image/webp", ext: "webp", bpp: 0.15 },
];

const formatBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(n / 1e6))} MB`);

const DEVICE_TYPE_OPTIONS = [
  { value: "iPhone 17 Pro Max", label: "iPhone 17 Pro Max" },
  { value: "iPhone 17 Pro", label: "iPhone 17 Pro" },
  { value: "iPhone 17", label: "iPhone 17" },
  { value: "iPhone Air", label: "iPhone Air" },
  { value: "iPhone 16 Pro Max", label: "iPhone 16 Pro Max" },
  { value: "iPhone 16 Pro", label: "iPhone 16 Pro" },
  { value: "iPhone 15 Pro Max", label: "iPhone 15 Pro Max" },
  { value: "iPhone 15 Pro", label: "iPhone 15 Pro" },
  { value: "iPhone 14 Pro Max", label: "iPhone 14 Pro Max" },
  { value: "iPhone 14 Pro", label: "iPhone 14 Pro" },
  { value: "iPhone 14 Plus", label: "iPhone 14 Plus" },
  { value: "iPhone 14", label: "iPhone 14" },
];

const CATEGORY_DEVICE_OPTIONS = {
  phone: DEVICE_TYPE_OPTIONS,
  tablet: [
    { value: "iPad Air", label: "iPad Air" },
    { value: "iPad mini", label: "iPad mini" },
    { value: "iPad Pro 11-inch", label: "iPad Pro 11\"" },
    { value: "iPad Pro 12.9-inch", label: "iPad Pro 12.9\"" },
  ],
  desktop: [
    { value: 'MacBook Pro 14"', label: 'MacBook Pro 14"' },
    { value: "MacBook Air", label: "MacBook Air" },
    { value: 'MacBook Pro 16"', label: 'MacBook Pro 16"' },
    { value: "Pro Display XDR", label: "Pro Display XDR" },
  ],
  watch: [
    { value: "Apple Watch Ultra", label: "Apple Watch Ultra" },
    { value: "Apple Watch Series 9", label: "Apple Watch Series 9" },
    { value: "Apple Watch Series 7", label: "Apple Watch Series 7" },
  ],
};

const CUSTOM_FINISH = { value: "Custom", label: "Custom", hex: null };

const TITANIUM_FINISHES = [
  { value: "Desert titanium", label: "Desert titanium", hex: "BFA18A", roughness: 0.12, metalness: 1 },
  { value: "Natural titanium", label: "Natural titanium", hex: "B8B0A3", roughness: 0.1, metalness: 1 },
  { value: "White titanium", label: "White titanium", hex: "E4E2DD", roughness: 0.35, metalness: 0.7 },
  { value: "Black titanium", label: "Black titanium", hex: "454545", roughness: 0.45, metalness: 0.6 },
];

// iPhone 15 Pro / 15 Pro Max's real launch palette — hexes from research
// (Natural/Blue/White/Black Titanium). Brushed-titanium frame: moderate
// roughness so it doesn't read as polished chrome like the generic set above.
const IPHONE_15_PRO_FINISHES = [
  { value: "Natural titanium", label: "Natural titanium", hex: "B8B0A3", roughness: 0.3, metalness: 0.9 },
  { value: "Blue titanium", label: "Blue titanium", hex: "5D6B7D", roughness: 0.3, metalness: 0.9 },
  { value: "White titanium", label: "White titanium", hex: "E3E2DE", roughness: 0.32, metalness: 0.75 },
  { value: "Black titanium", label: "Black titanium", hex: "454545", roughness: 0.32, metalness: 0.85 },
];
const ALUMINUM_FINISHES_17 = [
  { value: "Black", label: "Black", hex: "252525", roughness: 0.1, metalness: 0.9 },
  { value: "White", label: "White", hex: "F2F1ED", roughness: 0.1, metalness: 0.9 },
  { value: "Sage", label: "Sage", hex: "B5C5A8", roughness: 0.1, metalness: 0.9 },
  { value: "Lavender", label: "Lavender", hex: "D5C8E9", roughness: 0.1, metalness: 0.9 },
  { value: "Mist blue", label: "Mist blue", hex: "B9D6E8", roughness: 0.1, metalness: 0.9 },
];

// Back-glass (frosted matte) hexes from research; frame/plateau/ring colors live in
// DEVICE_FINISH_PART_COLORS in MockupScene.jsx, keyed by these same value strings.
const IPHONE_16_PLUS_FINISHES = [
  { value: "Ultramarine", label: "Ultramarine", hex: "5265C8", roughness: 0.42, metalness: 0.9 },
  { value: "Teal", label: "Teal", hex: "A3C9BE", roughness: 0.42, metalness: 0.9 },
  { value: "Pink", label: "Pink", hex: "E98DAF", roughness: 0.42, metalness: 0.9 },
  { value: "Black", label: "Black", hex: "222222", roughness: 0.42, metalness: 0.9 },
  { value: "White", label: "White", hex: "F2F0EB", roughness: 0.42, metalness: 0.9 },
];

const IPHONE_AIR_FINISHES = [
  { value: "Space black", label: "Space black", hex: "343434", roughness: 0.1, metalness: 0.9 },
  { value: "Cloud white", label: "Cloud white", hex: "EAE9E5", roughness: 0.1, metalness: 0.9 },
  { value: "Light gold", label: "Light gold", hex: "E4D5B9", roughness: 0.1, metalness: 0.9 },
  { value: "Sky blue", label: "Sky blue", hex: "C4D8E8", roughness: 0.1, metalness: 0.9 },
];

// Kept as-is — this set is actually shared with the iPhone 14 series
// (DEVICE_FINISHES below), whose swatches weren't part of this research pass.
const ALUMINUM_FINISHES_13 = [
  { value: "Midnight", label: "Midnight", hex: "242424", roughness: 0.1, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "F1EFE8", roughness: 0.1, metalness: 0.9 },
  { value: "Blue", label: "Blue", hex: "A9C5E4", roughness: 0.1, metalness: 0.9 },
  { value: "Purple", label: "Purple", hex: "C9B8E7", roughness: 0.1, metalness: 0.9 },
  { value: "Yellow", label: "Yellow", hex: "F3E5A7", roughness: 0.1, metalness: 0.9 },
  { value: "Product Red", label: "(PRODUCT)RED", hex: "A91E32", roughness: 0.1, metalness: 0.9 },
];

// Hexes from research: Space Black is a deep matte charcoal with anti-fingerprint
// anodization, Silver is classic metallic aluminum. Both are satin anodized,
// so roughness sits well above the glossy phone-frame values.
const MACBOOK_PRO_FINISHES = [
  { value: "Space black", label: "Space black", hex: "2E3033", roughness: 0.45, metalness: 0.9 },
  { value: "Silver", label: "Silver", hex: "E3E4E5", roughness: 0.45, metalness: 0.9 },
];

const MACBOOK_AIR_FINISHES = [
  { value: "Midnight", label: "Midnight", hex: "2C343E", roughness: 0.45, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "E6DFD5", roughness: 0.45, metalness: 0.9 },
  { value: "Space gray", label: "Space gray", hex: "7D7E80", roughness: 0.45, metalness: 0.9 },
  { value: "Silver", label: "Silver", hex: "E3E4E5", roughness: 0.45, metalness: 0.9 },
];

const IPAD_AIR_FINISHES = [
  { value: "Space Gray", label: "Space Gray", hex: "68696E", roughness: 0.45, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "E6DFD5", roughness: 0.45, metalness: 0.9 },
  { value: "Purple", label: "Purple", hex: "D1CCE0", roughness: 0.45, metalness: 0.9 },
  { value: "Blue", label: "Blue", hex: "C2D0D6", roughness: 0.45, metalness: 0.9 },
];

// iPad mini 6 launch palette. Hexes are approximations; tune by eye.
const IPAD_MINI_FINISHES = [
  { value: "Space Gray", label: "Space Gray", hex: "68696E", roughness: 0.45, metalness: 0.9 },
  { value: "Pink", label: "Pink", hex: "EBCDCB", roughness: 0.45, metalness: 0.9 },
  { value: "Purple", label: "Purple", hex: "C3BCD8", roughness: 0.45, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "E6DFD5", roughness: 0.45, metalness: 0.9 },
];

// iPad Pro only ships in two finishes — no glass back, bare anodized aluminum unibody.
const IPAD_PRO_FINISHES = [
  { value: "Space Gray", label: "Space Gray", hex: "68696E", roughness: 0.45, metalness: 0.9 },
  { value: "Silver", label: "Silver", hex: "E3E4E5", roughness: 0.45, metalness: 0.9 },
];

const IPHONE_17_PRO_FINISHES = [
  { value: "Silver", label: "Silver", hex: "D9D9D6", roughness: 0.35, metalness: 0.8 },
  { value: "Cosmic Orange", label: "Cosmic Orange", hex: "D98245", roughness: 0.35, metalness: 0.78 },
  { value: "Deep Blue", label: "Deep Blue", hex: "344B70", roughness: 0.35, metalness: 0.78 },
];

// Extracted so "Pro" and "Pro Max" of the same generation can share a finish set
const IPHONE_14_PRO_FINISHES = [
  { value: "Space Black", label: "Space Black", hex: "3A3A3C", roughness: 0.15, metalness: 1 },
  { value: "Silver", label: "Silver", hex: "E3E3E1", roughness: 0.15, metalness: 1 },
  { value: "Gold", label: "Gold", hex: "E3D3B8", roughness: 0.15, metalness: 1 },
  { value: "Deep Purple", label: "Deep Purple", hex: "51415E", roughness: 0.15, metalness: 1 },
];

const getStrapStyleOptions = (device) => Object.entries(getStrapStyles(device)).map(([value, { label }]) => ({ value, label }));

const STRAP_ORIGINAL = { value: "original", label: "Original", hex: null };

const WATCH_STRAPS = [
  STRAP_ORIGINAL,
  { value: "sport-black", label: "Sport band · Black", pattern: "solid", hex: "1C1C1E", roughness: 0.4, metalness: 0 },
  { value: "sport-blue", label: "Sport band · Blue", pattern: "solid", hex: "2F5D8C", roughness: 0.4, metalness: 0 },
  { value: "sport-pink", label: "Sport band · Pink", pattern: "solid", hex: "E8B7B8", roughness: 0.4, metalness: 0 },
  { value: "sport-red", label: "Sport band · Red", pattern: "solid", hex: "C8102E", roughness: 0.4, metalness: 0 },
  { value: "ocean-orange", label: "Ocean band · Orange", pattern: "rib", hex: "F26B1D", roughness: 0.35, metalness: 0 },
  { value: "ocean-navy", label: "Ocean band · Navy", pattern: "rib", hex: "1F2A44", roughness: 0.35, metalness: 0 },
  { value: "vent-black", label: "Vented sport · Black", pattern: "dots", hex: "202022", roughness: 0.45, metalness: 0 },
  { value: "nylon-gray", label: "Nylon weave · Gray", pattern: "weave", hex: "8A8D91", roughness: 0.85, metalness: 0 },
  { value: "nylon-green", label: "Nylon weave · Green", pattern: "weave", hex: "465A4F", roughness: 0.85, metalness: 0 },
  { value: "canvas-tan", label: "Canvas · Tan", pattern: "canvas", hex: "B08A55", roughness: 0.9, metalness: 0 },
  { value: "canvas-olive", label: "Canvas · Olive", pattern: "canvas", hex: "5B6446", roughness: 0.9, metalness: 0 },
  { value: "perlon-black", label: "Perlon · Black", pattern: "braid", hex: "202022", roughness: 0.8, metalness: 0 },
  { value: "perlon-gray", label: "Perlon · Gray", pattern: "braid", hex: "8A8D91", roughness: 0.8, metalness: 0 },
  { value: "stripe-blue", label: "Nylon stripe · Blue/White", pattern: "stripes", hex: "2F5D8C", hex2: "F2F2F2", roughness: 0.85, metalness: 0 },
  { value: "stripe-red", label: "Nylon stripe · Red/Cream", pattern: "stripes", hex: "C8102E", hex2: "F3E9D2", roughness: 0.85, metalness: 0 },
  { value: "leather-brown", label: "Leather · Saddle brown", pattern: "leather", hex: "7A4A2B", hex2: "E9D7B5", roughness: 0.6, metalness: 0 },
  { value: "leather-black", label: "Leather · Black", pattern: "leather", hex: "1A1A1A", hex2: "8C8C8C", roughness: 0.55, metalness: 0 },
  { value: "milanese-silver", label: "Milanese · Silver", pattern: "mesh", hex: "C8C8C8", roughness: 0.3, metalness: 1, metal: true },
  { value: "milanese-graphite", label: "Milanese · Graphite", pattern: "mesh", hex: "4A4A4D", roughness: 0.3, metalness: 1, metal: true },
  { value: "milanese-gold", label: "Milanese · Gold", pattern: "mesh", hex: "D4AF6A", roughness: 0.3, metalness: 1, metal: true },
];

const APPLE_WATCH_ULTRA_FINISHES = [
  { value: "Natural titanium", label: "Natural titanium", hex: "A6A6A1", roughness: 0.42, metalness: 1 },
  { value: "Black titanium", label: "Black titanium", hex: "252525", roughness: 0.42, metalness: 1 },
];

const APPLE_WATCH_SERIES_9_FINISHES = [
  { value: "Pink", label: "Pink", hex: "E8B7B8", roughness: 0.4, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "D8D3C8", roughness: 0.4, metalness: 0.9 },
  { value: "Midnight", label: "Midnight", hex: "202124", roughness: 0.4, metalness: 0.9 },
  { value: "Silver", label: "Silver", hex: "D9D9D9", roughness: 0.4, metalness: 0.9 },
  { value: "Product Red", label: "(PRODUCT)RED", hex: "C8102E", roughness: 0.4, metalness: 0.9 },
  { value: "Silver SS", label: "Silver stainless steel", hex: "C7C7C7", roughness: 0.18, metalness: 1 },
  { value: "Graphite SS", label: "Graphite stainless steel", hex: "454545", roughness: 0.18, metalness: 1 },
  { value: "Gold SS", label: "Gold stainless steel", hex: "D4AF6A", roughness: 0.18, metalness: 1 },
];

const APPLE_WATCH_SERIES_7_FINISHES = [
  { value: "Midnight", label: "Midnight", hex: "1D1D1F", roughness: 0.4, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "D6D1C4", roughness: 0.4, metalness: 0.9 },
  { value: "Green", label: "Green", hex: "465A4F", roughness: 0.4, metalness: 0.9 },
  { value: "Blue", label: "Blue", hex: "3D5C78", roughness: 0.4, metalness: 0.9 },
  { value: "Product Red", label: "(PRODUCT)RED", hex: "C8102E", roughness: 0.4, metalness: 0.9 },
  { value: "Silver SS", label: "Silver stainless steel", hex: "C8C8C8", roughness: 0.18, metalness: 1 },
  { value: "Graphite SS", label: "Graphite stainless steel", hex: "414141", roughness: 0.18, metalness: 1 },
  { value: "Gold SS", label: "Gold stainless steel", hex: "D4AF6A", roughness: 0.18, metalness: 1 },
];

const DEVICE_FINISHES = {
  "Apple Watch Ultra": [...APPLE_WATCH_ULTRA_FINISHES, CUSTOM_FINISH],
  "Apple Watch Series 9": [...APPLE_WATCH_SERIES_9_FINISHES, CUSTOM_FINISH],
  "Apple Watch Series 7": [...APPLE_WATCH_SERIES_7_FINISHES, CUSTOM_FINISH],
  "iPhone 17 Pro Max": [...IPHONE_17_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 17 Pro": [...IPHONE_17_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 17": [...ALUMINUM_FINISHES_17, CUSTOM_FINISH],
  "iPhone Air": [...IPHONE_AIR_FINISHES, CUSTOM_FINISH],
  "iPhone 16 Pro Max": [...TITANIUM_FINISHES, CUSTOM_FINISH],
  "iPhone 16 Pro": [...TITANIUM_FINISHES, CUSTOM_FINISH],
  "iPhone 15 Pro Max": [...IPHONE_15_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 15 Pro": [...IPHONE_15_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 14 Pro Max": [...IPHONE_14_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 14 Pro": [...IPHONE_14_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 14 Plus": [...ALUMINUM_FINISHES_13, CUSTOM_FINISH],
  "iPhone 14": [...ALUMINUM_FINISHES_13, CUSTOM_FINISH],
  'MacBook Pro 16"': [...MACBOOK_PRO_FINISHES, CUSTOM_FINISH],
  'MacBook Pro 14"': [...MACBOOK_PRO_FINISHES, CUSTOM_FINISH],
  "MacBook Air": [...MACBOOK_AIR_FINISHES, CUSTOM_FINISH],
  "Pro Display XDR": [{ value: "Silver", label: "Silver", hex: "E3E4E5", roughness: 0.45, metalness: 0.9 }, CUSTOM_FINISH],
  "iPad Air": [...IPAD_AIR_FINISHES, CUSTOM_FINISH],
  "iPad mini": [...IPAD_MINI_FINISHES, CUSTOM_FINISH],
  "iPad Pro 11-inch": [...IPAD_PRO_FINISHES, CUSTOM_FINISH],
  "iPad Pro 12.9-inch": [...IPAD_PRO_FINISHES, CUSTOM_FINISH],
};

const DEFAULT_FINISHES = [...TITANIUM_FINISHES, CUSTOM_FINISH];

function getFinishesForDevice(deviceType) {
  return DEVICE_FINISHES[deviceType] || DEFAULT_FINISHES;
}

const LIGHTING_OPTIONS = Object.keys(PRESETS).map((key) => ({ value: key, label: PRESETS[key].label }));

const THEME_OPTIONS = [
  { value: "system", label: "System", Icon: Desktop },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const BROWSER_OPTIONS = [
  { value: "safari", label: "Safari" },
  { value: "chrome", label: "Google Chrome" },
  { value: "arc", label: "Arc" },
  { value: "edge", label: "Microsoft Edge" },
];

const SAFARI_TABS_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "studio", label: "Studio" },
  { value: "city", label: "City" },
  { value: "forest", label: "Forest" },
  { value: "clouds", label: "Clouds" },
];

const GRADIENT_PRESETS = [
  {
    value: "none",
    label: "None",
    swatch: null,
    type: null,
    angle: null,
    stops: null,
  },
  {
    value: "forest-green",
    label: "Forest Green",
    swatch: "linear-gradient(180deg, #59D261 0%, #52BB59 25%, #3B8E41 50%, #317B36 74.52%, #28692C 100%)",
    type: "Linear",
    angle: 180,
    stops: [
      { id: 1, hex: "59D261", position: 0, opacity: 100 },
      { id: 2, hex: "52BB59", position: 25, opacity: 100 },
      { id: 3, hex: "3B8E41", position: 50, opacity: 100 },
      { id: 4, hex: "317B36", position: 74.52, opacity: 100 },
      { id: 5, hex: "28692C", position: 100, opacity: 100 },
    ],
  },
  {
    value: "sunset-orange",
    label: "Sunset Orange",
    swatch: "linear-gradient(180deg, #FFB56B 0%, #FF8A4C 50%, #E85D3D 100%)",
    type: "Linear",
    angle: 180,
    stops: [
      { id: 1, hex: "FFB56B", position: 0, opacity: 100 },
      { id: 2, hex: "FF8A4C", position: 50, opacity: 100 },
      { id: 3, hex: "E85D3D", position: 100, opacity: 100 },
    ],
  },
  {
    value: "ocean-blue",
    label: "Ocean Blue",
    swatch: "linear-gradient(180deg, #7DD3FC 0%, #38BDF8 50%, #0284C7 100%)",
    type: "Linear",
    angle: 180,
    stops: [
      { id: 1, hex: "7DD3FC", position: 0, opacity: 100 },
      { id: 2, hex: "38BDF8", position: 50, opacity: 100 },
      { id: 3, hex: "0284C7", position: 100, opacity: 100 },
    ],
  },
  {
    value: "midnight-magenta",
    label: "Midnight Magenta",
    swatch: "linear-gradient(180deg, #FF6FB5 0%, #E23D8A 30%, #6B1F4A 65%, #1A0E14 100%)",
    type: "Linear",
    angle: 180,
    stops: [
      { id: 1, hex: "FF6FB5", position: 0, opacity: 100 },
      { id: 2, hex: "E23D8A", position: 30, opacity: 100 },
      { id: 3, hex: "6B1F4A", position: 65, opacity: 100 },
      { id: 4, hex: "1A0E14", position: 100, opacity: 100 },
    ],
  },
  {
    value: "amber-dusk",
    label: "Amber Dusk",
    swatch: "linear-gradient(180deg, #FFD08A 0%, #FF9A4C 25%, #8A3B2E 60%, #14100E 100%)",
    type: "Linear",
    angle: 180,
    stops: [
      { id: 1, hex: "FFD08A", position: 0, opacity: 100 },
      { id: 2, hex: "FF9A4C", position: 25, opacity: 100 },
      { id: 3, hex: "8A3B2E", position: 60, opacity: 100 },
      { id: 4, hex: "14100E", position: 100, opacity: 100 },
    ],
  },
  {
    value: "deep-teal",
    label: "Deep Teal",
    swatch: "linear-gradient(180deg, #7FE8D4 0%, #2FA98F 30%, #14524A 65%, #0A1414 100%)",
    type: "Linear",
    angle: 180,
    stops: [
      { id: 1, hex: "7FE8D4", position: 0, opacity: 100 },
      { id: 2, hex: "2FA98F", position: 30, opacity: 100 },
      { id: 3, hex: "14524A", position: 65, opacity: 100 },
      { id: 4, hex: "0A1414", position: 100, opacity: 100 },
    ],
  },
  {
    value: "amber-sky",
    label: "Amber Sky",
    swatch: "linear-gradient(135deg, #E8531F 0%, #FFC96B 45%, #FFE8B8 70%, #A9CBD4 100%)",
    type: "Linear",
    angle: 135,
    stops: [
      { id: 1, hex: "E8531F", position: 0, opacity: 100 },
      { id: 2, hex: "FFC96B", position: 45, opacity: 100 },
      { id: 3, hex: "FFE8B8", position: 70, opacity: 100 },
      { id: 4, hex: "A9CBD4", position: 100, opacity: 100 },
    ],
  },
  {
    value: "steel-blue",
    label: "Steel Blue",
    swatch: "linear-gradient(180deg, #1F3C6E 0%, #4A7FB5 45%, #B9D3E0 75%, #E6EEF0 100%)",
    type: "Linear",
    angle: 180,
    stops: [
      { id: 1, hex: "1F3C6E", position: 0, opacity: 100 },
      { id: 2, hex: "4A7FB5", position: 45, opacity: 100 },
      { id: 3, hex: "B9D3E0", position: 75, opacity: 100 },
      { id: 4, hex: "E6EEF0", position: 100, opacity: 100 },
    ],
  },
  {
    value: "cobalt-flare",
    label: "Cobalt Flare",
    swatch: "radial-gradient(circle at 30% 70%, #E8EEF7 0%, #1B2E8C 40%, #050810 80%)",
    type: "Radial",
    angle: 0,
    stops: [
      { id: 1, hex: "E8EEF7", position: 0, opacity: 100 },
      { id: 2, hex: "1B2E8C", position: 40, opacity: 100 },
      { id: 3, hex: "050810", position: 80, opacity: 100 },
    ],
  },
  {
    value: "violet-noir",
    label: "Violet Noir",
    swatch: "radial-gradient(circle at 15% 30%, #3DD1FF 0%, #6A2EE8 35%, #0A0612 75%)",
    type: "Radial",
    angle: 0,
    stops: [
      { id: 1, hex: "3DD1FF", position: 0, opacity: 100 },
      { id: 2, hex: "6A2EE8", position: 35, opacity: 100 },
      { id: 3, hex: "0A0612", position: 75, opacity: 100 },
    ],
  },
  {
    value: "burnt-clay",
    label: "Burnt Clay",
    swatch: "linear-gradient(160deg, #C9C4A8 0%, #B57A3C 55%, #4A2E1A 80%, #1A0F08 100%)",
    type: "Linear",
    angle: 160,
    stops: [
      { id: 1, hex: "C9C4A8", position: 0, opacity: 100 },
      { id: 2, hex: "B57A3C", position: 55, opacity: 100 },
      { id: 3, hex: "4A2E1A", position: 80, opacity: 100 },
      { id: 4, hex: "1A0F08", position: 100, opacity: 100 },
    ],
  },
  {
    value: "spring-meadow",
    label: "Spring Meadow",
    swatch: "linear-gradient(160deg, #EAF2E0 0%, #C9DB8F 40%, #7FA5C9 70%, #3E6B3E 100%)",
    type: "Linear",
    angle: 160,
    stops: [
      { id: 1, hex: "EAF2E0", position: 0, opacity: 100 },
      { id: 2, hex: "C9DB8F", position: 40, opacity: 100 },
      { id: 3, hex: "7FA5C9", position: 70, opacity: 100 },
      { id: 4, hex: "3E6B3E", position: 100, opacity: 100 },
    ],
  },
  {
    value: "dusk-horizon",
    label: "Dusk Horizon",
    swatch: "linear-gradient(180deg, #0E1E3D 0%, #4A7FB0 40%, #E8E4D8 55%, #A8C0D4 100%)",
    type: "Linear",
    angle: 180,
    stops: [
      { id: 1, hex: "0E1E3D", position: 0, opacity: 100 },
      { id: 2, hex: "4A7FB0", position: 40, opacity: 100 },
      { id: 3, hex: "E8E4D8", position: 55, opacity: 100 },
      { id: 4, hex: "A8C0D4", position: 100, opacity: 100 },
    ],
  },
];

// Preset background images live in /public/presets (full size) and
// /public/presets/thumbs (128px previews). BASE_URL keeps paths working
// if the app is ever deployed under a subpath.
const PRESET_BASE = `${import.meta.env.BASE_URL}presets/`;
const PRESET_EXT = "png"; // change if your files are png / webp
const presetImage = (value, label) => ({
  value,
  label,
  thumb: `${PRESET_BASE}thumbs/${value}.${PRESET_EXT}`,
  url: `${PRESET_BASE}${value}.${PRESET_EXT}`,
});

const IMAGE_PRESETS = [
  presetImage("abstract-fluid-forms", "Fluid Forms"),
  presetImage("abstract-glowing-object", "Glowing Object"),
  presetImage("abstract-green-gradient", "Green Gradient"),
  presetImage("abstract-motion-portrait", "Motion Portrait"),
  presetImage("abstract-red-flower-petal", "Red Flower Petal"),
  presetImage("blue-sky-scene", "Blue Sky"),
  presetImage("blurred-silhouette-art", "Blurred Silhouette"),
  presetImage("butterflies-in-flight", "Butterflies"),
  presetImage("ethereal-gradient-abstraction", "Ethereal Gradient"),
  presetImage("gradient-bars", "Gradient Bars"),
  presetImage("ice-cream-delight", "Ice Cream Delight"),
  presetImage("iridescent-metallic-art", "Iridescent Metallic"),
  presetImage("radiant-smiling", "Radiant Smiling"),
  presetImage("serene-green-landscape", "Green Landscape"),
  presetImage("serene-landscape-view", "Landscape View"),
  presetImage("serene-rolling-hills", "Rolling Hills"),
  presetImage("submerged-surreal-form", "Submerged Form"),
  presetImage("textured-red-surface", "Red Surface"),
  presetImage("textured-yellow-dome", "Yellow Dome"),
  presetImage("warm-gradient", "Warm Gradient"),
];

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

const SEG_ON = "bg-white dark:bg-[#1F1F1F] shadow-[0_4px_2px_rgba(0,0,0,0.03)] text-[#FF47BC]";
const SEG_OFF = "text-[#8C8C8C] dark:text-[#9A9A9A]";

function SearchField({ value, onChange, placeholder }) {
  return (
    <label className="flex items-center gap-2 w-full h-[33px] p-2 box-border shrink-0 cursor-text bg-white dark:bg-[#292929] border border-[#3A3A3A]/5 dark:border-[#FAF9FA]/5 focus-within:border-[#FF47BC] dark:focus-within:border-[#FF47BC] rounded-[10px] transition-colors duration-150">
      <MagnifyingGlass size={14} weight="regular" className="shrink-0 text-[#8C8C8C] dark:text-[#707070]" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent outline-none text-[12px] leading-[15px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] placeholder:text-[#8C8C8C] dark:placeholder:text-[#707070]"
      />
    </label>
  );
}

function Scrubber({ label, value, onChange, min = 0, max = 100, hardMax, mixed = false, compact = false, autoLabel }) {
  const cap = hardMax ?? max; // typed / wheel / arrow values clamp to this; the slider still uses max
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const [focused, setFocused] = useState(false);
  const display = mixed ? "-" : autoLabel && value === 0 ? autoLabel : String(value);
  const [inputText, setInputText] = useState(display);
  const numberInputRef = useRef(null);

  useEffect(() => {
    if (focused) return;
    setInputText(display);
  }, [value, mixed, focused, autoLabel]);

  useEffect(() => {
    const el = numberInputRef.current;
    if (!el) return;
    const onWheelNative = (e) => {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const delta = e.deltaY < 0 ? step : -step;
      const current = Number.isNaN(Number(el.value)) ? value : Number(el.value);
      const next = Math.min(cap, Math.max(min, current + delta));
      setInputText(String(next));
      onChange(next);
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [value, min, cap, onChange]);

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-") {
      setInputText(raw);
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    setInputText(raw);
    onChange(Math.min(cap, Math.max(min, num)));
  };

  const handleInputFocus = () => {
    setFocused(true);
    if (mixed || (autoLabel && value === 0)) setInputText("");
  };

  const handleInputBlur = () => {
    setFocused(false);
    if (mixed && (inputText === "" || inputText === "-")) {
      setInputText("-");
      return;
    }
    if (inputText === "" || inputText === "-" || Number.isNaN(Number(inputText))) {
      setInputText(String(Math.min(max, Math.max(min, 0))));
      onChange(Math.min(max, Math.max(min, 0)));
    } else {
      setInputText(String(value));
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      return;
    }
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const delta = e.key === "ArrowUp" ? step : -step;
    const current = Number.isNaN(Number(inputText)) ? value : Number(inputText);
    const next = Math.min(cap, Math.max(min, current + delta));
    setInputText(String(next));
    onChange(next);
  };

  return (
    <div className="group flex items-center gap-1">
      <div className={`relative flex-1 ${compact ? "h-8" : "h-9"} rounded-[10px] bg-[#EDEDED] dark:bg-[#292929] border border-transparent transition-colors overflow-hidden`}>
        <div
          className="absolute inset-y-0 left-0 bg-[#E3E3E3] dark:bg-[#333333] group-hover:bg-[#D9D9D9] dark:group-hover:bg-[#3D3D3D] rounded-[10px] transition-colors"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-black/20 dark:bg-white/25 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${pct}% - 9px)` }}
        />
        <span className="absolute inset-0 flex items-center px-2.5 text-[13px] leading-4 font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] pointer-events-none">
          {label}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <input
        ref={numberInputRef}
        type="text"
        inputMode="numeric"
        value={inputText}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        className={`w-11 ${compact ? "h-8" : "h-9"} bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus:bg-[#E3E3E3] dark:focus:bg-[#333333] rounded-[10px] shrink-0 text-center text-[13px] leading-4 font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] focus:text-[#3A3A3A] dark:focus:text-white outline-none border border-transparent focus:border-[#FF47BC] transition-colors`}
      />
    </div>
  );
}

function ToggleRow({ label, checked, onChange, muted = false, disabled = false, heading = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`group w-full h-9 flex items-center justify-between rounded-[10px] transition-[colors,opacity] duration-200 ease-in-out ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      }`}
    >
      <span
        className={`${heading ? "section-title " : ""}text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]`}
      >
        {label}
      </span>
      <span
        className={`relative w-8 h-5 rounded-full shrink-0 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          checked
            ? "bg-[#FF47BC]"
            : `bg-[#D0D0D0] dark:bg-[#45454C] ${disabled ? "" : "group-hover:bg-[#C4C4C4] dark:group-hover:bg-[#50505A]"}`
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            checked ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function FinishDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [popupRect, setPopupRect] = useState(null);
  const ref = useRef(null);
  const popupRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  // Fixed-position popup measured from the trigger, flips up if there isn't room below.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const listH = Math.min(popupRef.current?.offsetHeight ?? 288, 288);
      const spaceBelow = window.innerHeight - r.bottom;
      const up = spaceBelow < listH + 12 && r.top > spaceBelow;
      setPopupRect({ left: r.left, width: r.width, top: r.bottom + 4, bottom: window.innerHeight - r.top + 4, up });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const darkenSwatchHex = (hex, amount = 0.18) => {
    const n = parseInt(hex || "000000", 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return [r, g, b]
      .map((v) => Math.round(v * (1 - amount)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };

  const renderSwatch = (opt, size = "w-3.5 h-3.5") =>
    opt?.hex ? (
      <div
        className={`${size} rounded-full shrink-0 border border-[#3A3A3A]/10`}
        style={{
          backgroundImage: [
            `radial-gradient(circle at 32% 28%, rgba(255,255,255,${(0.95 - (opt.roughness ?? 0.1) * 0.6).toFixed(2)}) 0%, rgba(255,255,255,0) ${18 + (opt.roughness ?? 0.1) * 45}%)`,
            `radial-gradient(circle at 68% 78%, rgba(0,0,0,${(0.4 + (1 - (opt.metalness ?? 0.9)) * 0.15).toFixed(2)}) 0%, rgba(0,0,0,0) 55%)`,
            `radial-gradient(circle at 50% 50%, #${opt.hex} 40%, #${darkenSwatchHex(opt.hex)} 100%)`,
          ].join(", "),
        }}
      />
    ) : (
      <div
        className={`${size} rounded-full shrink-0 border border-[#3A3A3A]/10`}
        style={{
          backgroundImage:
            "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
          backgroundSize: "5px 5px",
          backgroundPosition: "0 0, 0 2.5px, 2.5px -2.5px, -2.5px 0px",
        }}
      />
    );

  const renderOption = (opt) => (
    <OptionRow
      key={opt.value}
      label={opt.label}
      leading={renderSwatch(opt)}
      selected={value === opt.value}
      onClick={() => {
        onChange(opt.value);
        setOpen(false);
      }}
    />
  );

  return (
    <div className="relative w-full" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} w-full`}>
        <span className="flex items-center gap-2 min-w-0">
          {renderSwatch(selected, "w-4 h-4")}
          <span className="truncate text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">{selected?.label ?? value}</span>
        </span>
        <CaretDown size={16} weight="regular" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
      </button>

      {open && popupRect && createPortal(
        <div
          ref={popupRef}
          data-popup-dropdown
          className={`${popupRect.up ? "pop-enter-up" : "pop-enter"} fixed p-2 gap-1 [&>*]:shrink-0 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] rounded-2xl flex flex-col items-start z-[9999] max-h-72 overflow-y-auto custom-scroll`}
          style={{
            left: popupRect.left,
            width: popupRect.width,
            ...(popupRect.up ? { bottom: popupRect.bottom } : { top: popupRect.top }),
          }}
        >
          {options.map(renderOption)}
        </div>,
        document.body
      )}
    </div>
  );
}

function GradientPresetDropdown({ value, options, onChange, dropUp = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

    const [popupRect, setPopupRect] = useState(null);

useLayoutEffect(() => {
  if (!open) return;
  const update = () => ref.current && setPopupRect(ref.current.getBoundingClientRect());
  update();
  window.addEventListener("scroll", update, true); // capture:true catches scroll on the toolbar's overflow-y-auto ancestor
  window.addEventListener("resize", update);
  return () => {
    window.removeEventListener("scroll", update, true);
    window.removeEventListener("resize", update);
  };
}, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const renderOption = (opt) => {
    const isSelected = value === opt.value;
    return (
      <button
        key={opt.value}
        type="button"
        onClick={() => {
          onChange(opt.value);
          setOpen(false);
        }}
        className={`group flex items-center justify-between w-full h-[30px] py-2 ${
          isSelected ? "pl-1.5" : "pl-1"
        } pr-2 gap-2 rounded-lg transition-colors duration-100 ease-in-out ${
          isSelected ? "bg-[#FF47BC]/10 hover:bg-[#FF47BC]/10" : "hover:bg-[#F1F1F1] dark:hover:bg-white/5"
        }`}
      >
        <div className="flex items-center gap-2">
          <Check
            size={16}
            weight="regular"
            className={`transition-colors duration-100 ${
              isSelected ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] opacity-0"
            }`}
          />
          <span
            className={`text-[12px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
              isSelected
                ? "text-[#FF47BC]"
                : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
            }`}
          >
            {opt.label}
          </span>
        </div>
        {opt.swatch && (
          <div className="w-3.5 h-3.5 rounded shrink-0" style={{ background: opt.swatch }} />
        )}
      </button>
    );
  };

  return (
<div className="relative w-full" ref={ref}>
  <button type="button" onClick={() => setOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} w-full`}>
    <span className="truncate text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
      {selected?.label ?? value}
    </span>
    <CaretDown size={16} weight="regular" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
  </button>
            {open && popupRect && (
        <div
          className={`${dropUp ? "pop-enter-up" : "pop-enter"} fixed p-2 gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shadow-[0_4px_8px_rgba(0,0,0,0.05)] rounded-2xl flex flex-col items-start z-[9999] max-h-72 overflow-y-auto custom-scroll`}
          style={{
            left: popupRect.left,
            width: popupRect.width,
            ...(dropUp
              ? { bottom: window.innerHeight - popupRect.top + 4 }
              : { top: popupRect.bottom + 4 }),
          }}
        >
          {options.map(renderOption)}
        </div>
      )}
    </div>
  );
}

function ImagePresetDropdown({ value, options, onChange, dropUp = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  // Same fixed-position technique as ToolbarDropdown/GradientPresetDropdown
  // — escapes the toolbar's overflow-y-auto and the collapsible section's
  // overflow-hidden instead of being clipped when opening upward.
  const [popupRect, setPopupRect] = useState(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => ref.current && setPopupRect(ref.current.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
<div className="relative w-full" ref={ref}>
  <button type="button" onClick={() => setOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} w-full`}>
    <span className="truncate text-[12px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
      {selected?.label ?? "Select preset"}
    </span>
    <span className="flex items-center gap-2 shrink-0">
      {selected?.thumb && (
        <span className="w-4 h-4 rounded shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${selected.thumb})` }} />
      )}
      <CaretDown size={16} weight="regular" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
    </span>
  </button>
      {open && popupRect && (
        <div
  className={`${dropUp ? "pop-enter-up" : "pop-enter"} fixed p-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] z-[9999] max-h-72 overflow-y-auto custom-scroll`}
          style={{
            left: popupRect.left,
            width: popupRect.width,
            ...(dropUp
              ? { bottom: window.innerHeight - popupRect.top + 4 }
              : { top: popupRect.bottom + 4 }),
          }}
        >
          <div className="grid grid-cols-4 gap-2">
            {options.map((opt) => {
  const isSelected = value === opt.value;
  return (
    <Tooltip key={opt.value} label={opt.label}>
      <button
        type="button"
        onClick={() => {
          onChange(opt.value);
          setOpen(false);
        }}
        className={`relative aspect-square rounded-lg overflow-hidden border transition-colors duration-100 ease-in-out w-full ${
          isSelected ? "border-[#FF47BC]" : "border-transparent hover:border-[#3A3A3A]/10 dark:hover:border-white/15"
        }`}
      >
        {opt.thumb ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${opt.thumb})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#EDEDED] dark:bg-white/5 flex items-center justify-center">
            <span className="text-[10px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
              None
            </span>
          </div>
        )}
        {isSelected && (
          <div className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[#FF47BC]">
            <Check size={10} weight="regular" className="text-[#FAF9FA]" />
          </div>
        )}
      </button>
    </Tooltip>
  );
})}
          </div>
        </div>
      )}
    </div>
  );
}

function GradientCanvasHandles({ gradientType, gradientAngle, gradientStops, selectedStopId, onSelectStop, onStopPositionChange }) {
  const wrapRef = useRef(null);
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    const update = () => wrapRef.current && setRect(wrapRef.current.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const getAxis = (r) => {
    const cx = r.width / 2, cy = r.height / 2;
    const rad = ((gradientAngle - 90) * Math.PI) / 180;
    const len = Math.min(r.width, r.height) * 0.4;
    return { cx, cy, dx: Math.cos(rad), dy: Math.sin(rad), len };
  };

  const getHandlePos = (r, stop) => {
    const cx = r.width / 2, cy = r.height / 2;
    if (gradientType === "Radial") {
      const radius = (stop.position / 100) * Math.min(r.width, r.height) * 0.4;
      return { x: cx + radius, y: cy };
    }
    if (gradientType === "Angular" || gradientType === "Diamond") {
      const offset = gradientType === "Diamond" ? 45 : 0;
      const deg = gradientAngle + offset + (stop.position / 100) * 360;
      const rad = (deg * Math.PI) / 180;
      const radius = Math.min(r.width, r.height) * 0.35;
      return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius };
    }
    const { dx, dy, len } = getAxis(r);
    const t = (stop.position / 100) * 2 - 1;
    return { x: cx + dx * t * len, y: cy + dy * t * len };
  };

  const handlePointerDown = (stop) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectStop(stop.id);
    const r = wrapRef.current.getBoundingClientRect();

    const updateFromEvent = (ev) => {
      const px = ev.clientX - r.left, py = ev.clientY - r.top;
      let position;
      if (gradientType === "Radial") {
        const cx = r.width / 2, cy = r.height / 2;
        const dist = Math.hypot(px - cx, py - cy);
        position = Math.round((dist / (Math.min(r.width, r.height) * 0.4)) * 100);
      } else if (gradientType === "Angular" || gradientType === "Diamond") {
        const cx = r.width / 2, cy = r.height / 2;
        const offset = gradientType === "Diamond" ? 45 : 0;
        let deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI - gradientAngle - offset;
        deg = ((deg % 360) + 360) % 360;
        position = Math.round((deg / 360) * 100);
      } else {
        const { cx, cy, dx, dy, len } = getAxis(r);
        const t = ((px - cx) * dx + (py - cy) * dy) / len;
        position = Math.round(((t + 1) / 2) * 100);
      }
      onStopPositionChange(stop.id, Math.min(100, Math.max(0, position)));
    };

    updateFromEvent(e);
    const onMove = (ev) => updateFromEvent(ev);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-none">
      {rect &&
        gradientStops.map((stop) => {
          const { x, y } = getHandlePos(rect, stop);
          const isSelected = selectedStopId === stop.id;
          return (
            <button
              key={stop.id}
              onPointerDown={handlePointerDown(stop)}
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 pointer-events-auto cursor-pointer shadow"
              style={{
                left: x,
                top: y,
                backgroundColor: `#${stop.hex}`,
                borderColor: isSelected ? "#FF47BC" : "#FFFFFF",
              }}
            />
          );
        })}
    </div>
  );
}

const GRAIN_BG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

// Noise effect: larger "size" = lower turbulence frequency = bigger grains.
const makeGrainUrl = (size) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${(1.4 / (1 + size * 0.5)).toFixed(3)}' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

const EFFECT_TYPE_OPTIONS = [
  { value: "dropShadow", label: "Drop shadow" },
  { value: "layerBlur", label: "Layer blur" },
  { value: "noise", label: "Grain" },
];

const STROKE_POSITIONS = [
  { value: "inside", label: "Inside" },
  { value: "center", label: "Center" },
  { value: "outside", label: "Outside" },
];

// ---------- Frame-mode camera (mirrors MockupScene's zoom / fov / rotation mapping) ----------
const CAM_DIST = (zoom) => 22 - (zoom / 100) * 17;
const CAM_FOV_DEG = (fov) => 15 + (fov / 120) * 75;
const CAM_DEFAULT = { rotationX: 0, rotationY: 0, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 27 };
const isDefaultCamera = (c) => Object.keys(CAM_DEFAULT).every((k) => c[k] === CAM_DEFAULT[k]);

function getFrameCamera(cam, H) {
  const dRef = CAM_DIST(CAM_DEFAULT.zoom);
  const tRef = Math.tan((CAM_FOV_DEG(CAM_DEFAULT.fov) * Math.PI) / 360);
  const d = CAM_DIST(cam.zoom);
  const t = Math.tan((CAM_FOV_DEG(cam.fov) * Math.PI) / 360);
  const k = H / (2 * dRef * tRef); // px per world unit, so the default view is 1:1
  return {
    p: d * k,
    s: (dRef * tRef) / (d * t),
    tx: (cam.positionX / 25) * k,
    ty: (-cam.positionY / 25) * k,
    a: -cam.rotationX, // three.js and CSS disagree on X/Z direction
    b: cam.rotationY,
    c: -cam.rotationZ,
  };
}

const frameCameraCss = (g) =>
  `scale(${g.s}) perspective(${g.p}px) translate3d(${g.tx}px, ${g.ty}px, 0) rotateX(${g.a}deg) rotateY(${g.b}deg) rotateZ(${g.c}deg)`;

// Same transform as the CSS above, for export.
function projectFramePoint(g, W, H, x, y) {
  const r = Math.PI / 180;
  let X = x - W / 2, Y = y - H / 2, Z = 0;
  const cz = Math.cos(g.c * r), sz = Math.sin(g.c * r);
  [X, Y] = [X * cz - Y * sz, X * sz + Y * cz];
  const cy = Math.cos(g.b * r), sy = Math.sin(g.b * r);
  [X, Z] = [X * cy + Z * sy, -X * sy + Z * cy];
  const cx = Math.cos(g.a * r), sx = Math.sin(g.a * r);
  [Y, Z] = [Y * cx - Z * sx, Y * sx + Z * cx];
  X += g.tx;
  Y += g.ty;
  const f = g.p / Math.max(1, g.p - Z);
  return [W / 2 + X * f * g.s, H / 2 + Y * f * g.s];
}

// Canvas 2D has no perspective, so the layer is drawn as a grid of affine triangles.
function drawWarped(ctx, src, g, W, H, n = 16) {
  const tri = (s0, s1, s2, d0, d1, d2) => {
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    const grow = (pt) => {
      const vx = pt[0] - cx, vy = pt[1] - cy, len = Math.hypot(vx, vy) || 1;
      return [pt[0] + (vx / len) * 0.6, pt[1] + (vy / len) * 0.6]; // hides hairline seams
    };
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
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  };
  const S = (i, j) => [(i / n) * W, (j / n) * H];
  const D = (i, j) => projectFramePoint(g, W, H, (i / n) * W, (j / n) * H);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      tri(S(i, j), S(i + 1, j), S(i, j + 1), D(i, j), D(i + 1, j), D(i, j + 1));
      tri(S(i + 1, j), S(i + 1, j + 1), S(i, j + 1), D(i + 1, j), D(i + 1, j + 1), D(i, j + 1));
    }
  }
}

// ---------- Frame-mode environment: a 2D glare that shifts with the camera ----------
const FRAME_ENV_SHEEN = {
  none: null,
  studio: { angle: 120, stops: [[0, "rgba(255,255,255,0.28)"], [0.35, "rgba(255,255,255,0.06)"], [0.6, "rgba(255,255,255,0)"], [1, "rgba(255,255,255,0.10)"]] },
  city: { angle: 150, stops: [[0, "rgba(120,170,255,0.26)"], [0.5, "rgba(255,255,255,0)"], [1, "rgba(255,150,90,0.22)"]] },
  forest: { angle: 160, stops: [[0, "rgba(190,255,190,0.22)"], [0.5, "rgba(255,255,255,0)"], [1, "rgba(30,90,40,0.28)"]] },
  clouds: { angle: 135, stops: [[0, "rgba(255,255,255,0.34)"], [0.5, "rgba(220,235,255,0.10)"], [1, "rgba(255,255,255,0.20)"]] },
};
const sheenAngle = (env, rx, ry) => (FRAME_ENV_SHEEN[env]?.angle ?? 0) + ry * 0.4 - rx * 0.4;
const sheenCss = (env, rx, ry) => {
  const s = FRAME_ENV_SHEEN[env];
  if (!s) return null;
  return `linear-gradient(${sheenAngle(env, rx, ry)}deg, ${s.stops.map(([p, c]) => `${c} ${p * 100}%`).join(", ")})`;
};
function paintSheen(ctx, x, y, w, h, env, rx, ry) {
  const s = FRAME_ENV_SHEEN[env];
  if (!s) return;
  const rad = (sheenAngle(env, rx, ry) * Math.PI) / 180;
  const dx = Math.sin(rad), dy = -Math.cos(rad);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = x + w / 2, cy = y + h / 2;
  const g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
  s.stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

// ---------- Frame back ----------
const hexRgba = (hex, pct) => {
  const n = parseInt(hex || "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${pct / 100})`;
};

// True when the frame's normal points away from the camera (same rotation order as frameCameraCss).
const isFrameBackFacing = (c) =>
  Math.cos((c.rotationX * Math.PI) / 180) * Math.cos((c.rotationY * Math.PI) / 180) < -1e-6;

function buildGradientCss(type, angle, stops) {
  const items = [...stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${hexRgba(s.hex, s.opacity)} ${s.position}%`);
  const list = (items.length === 1 ? [items[0], items[0]] : items).join(", ");
  switch (type) {
    case "Radial":
      return `radial-gradient(circle, ${list})`;
    case "Angular":
      return `conic-gradient(from ${angle}deg, ${list})`;
    case "Diamond":
      return `conic-gradient(from ${(angle + 45) % 360}deg, ${list})`;
    default:
      return `linear-gradient(${angle}deg, ${list})`;
  }
}

// Canvas twin of buildGradientCss, for export.
function makeCanvasGradient(ctx, type, angle, stops, x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2;
  let g;
  if (type === "Radial") {
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) / 2);
  } else if (type === "Angular" || type === "Diamond") {
    const from = (type === "Diamond" ? angle + 45 : angle) - 90;
    g = ctx.createConicGradient((from * Math.PI) / 180, cx, cy);
  } else {
    const rad = (angle * Math.PI) / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const len = Math.abs(w * dx) + Math.abs(h * dy);
    g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
  }
  [...stops]
    .sort((a, b) => a.position - b.position)
    .forEach((s) => g.addColorStop(Math.min(1, Math.max(0, s.position / 100)), hexRgba(s.hex, s.opacity)));
  return g;
}

function makeEffect(type, id) {
  switch (type) {
    case "layerBlur":
      return { id, type, visible: true, blur: 8 };
    case "noise":
      return { id, type, visible: true, amount: 20, size: 2 };
    default:
      return { id, type: "dropShadow", visible: true, x: 0, y: 24, blur: 60, spread: 0, hex: "000000", opacity: 25 };
  }
}

// Same shadow the frame used to have hardcoded, now editable.
const DEFAULT_FRAME_EFFECTS = () => [];
const DEFAULT_STROKE = { on: false, hex: "FFFFFF", opacity: 100, width: 2, position: "inside" };

// Same hex + opacity field the Body / Background rows use, made reusable.
function ColorOpacityField({ hex, opacity, onHexChange, onOpacityChange, onSwatchClick, makePercentDrag, swatchFill, labelText, active = false }) {
  const opacityRef = useRef(null);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSwatchClick}
        data-color-picker-trigger
        aria-label="Open color picker"
        className="w-8 h-8 rounded-[10px] shrink-0 relative overflow-hidden border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
            backgroundSize: "8px 8px",
            backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
          }}
        />
        <div
          className="absolute inset-0"
          style={swatchFill ? { background: swatchFill } : { backgroundColor: `#${hex || "000000"}`, opacity: opacity / 100 }}
        />
      </button>

      <div
        className={`flex flex-1 min-w-0 items-center h-8 px-2.5 gap-2 hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-[10px] border focus-within:border-[#FF47BC] transition-colors ${
          active ? "bg-[#E3E3E3] dark:bg-[#333333] border-[#FF47BC]" : "bg-[#EDEDED] dark:bg-[#292929] border-transparent"
        }`}
      >
        {labelText ? (
          <button
            type="button"
            onClick={onSwatchClick}
            className="flex-1 min-w-0 text-left text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]"
          >
            {labelText}
          </button>
        ) : (
          <input
            value={hex}
            onChange={(e) => onHexChange(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase())}
            className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none"
          />
        )}
        <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
        <div className="flex items-center gap-1 shrink-0 select-none">
          <input
            ref={opacityRef}
            type="number"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => {
              const num = Math.min(100, Math.max(0, Number(e.target.value)));
              if (!Number.isNaN(num)) onOpacityChange(num);
            }}
            className="w-6 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none text-right cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span
            className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] cursor-ew-resize"
            onPointerDown={makePercentDrag(opacity, onOpacityChange, opacityRef)}
          >
            %
          </span>
        </div>
      </div>
    </div>
  );
}

// Export-time noise: random gray cells blended with "overlay". cell = grain size in output px.
function drawNoise(ctx, x, y, w, h, amount, cell) {
  const c = Math.max(1, cell);
  const cols = Math.max(1, Math.ceil(w / c));
  const rows = Math.max(1, Math.ceil(h / c));
  const n = document.createElement("canvas");
  n.width = cols;
  n.height = rows;
  const nctx = n.getContext("2d");
  const img = nctx.createImageData(cols, rows);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = (amount / 100) * 0.6;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(n, 0, 0, cols, rows, x, y, cols * c, rows * c);
  ctx.restore();
}

// Same per-pixel noise as MockupScene's applyGrain (amount = intensity * 0.9),
// baked onto mid-gray so it can be laid over the gradient with "overlay" —
// CSS/canvas can't add noise per-pixel to a gradient directly.
function makeGrainTile(size, intensity) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const amp = intensity * 0.9 * 2; // ×2: overlay only carries ~half the delta on average
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * amp; // Uint8ClampedArray clamps for us
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function PopupDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [popupRect, setPopupRect] = useState(null);
  const ref = useRef(null);
  const popupRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  // Measure the trigger, then the popup, and only flip up if it doesn't fit below.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const listH = popupRef.current?.offsetHeight ?? options.length * 34 + 12;
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      const up = spaceBelow < listH + 12 && spaceAbove > spaceBelow;
      setPopupRect({ left: r.left, width: r.width, top: r.bottom + 4, bottom: window.innerHeight - r.top + 4, up });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="relative w-full" ref={ref}>
<button type="button" onClick={() => setOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} w-full`}>
  <span className="truncate text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">{selected?.label ?? value}</span>
  <CaretDown size={16} weight="regular" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
</button>
      {open && popupRect && createPortal(
        <div
          ref={popupRef}
          data-popup-dropdown
          className={`${popupRect.up ? "pop-enter-up" : "pop-enter"} fixed p-2 gap-1 [&>*]:shrink-0 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] flex flex-col z-[9999] max-h-72 overflow-y-auto custom-scroll`}
          style={{
            left: popupRect.left,
            width: popupRect.width,
            ...(popupRect.up ? { bottom: popupRect.bottom } : { top: popupRect.top }),
          }}
        >
          {options.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// Whole row is the click target; the plus/minus chip shows hover/active for any hover on the row.
function AppearanceHeader({ label, onClick, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group/hdr flex items-center justify-between h-8 -my-1 cursor-pointer select-none"
    >
      <span className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">{label}</span>
      <span
        aria-hidden
        className="flex items-center justify-center w-6 h-6 rounded-lg text-[#8C8C8C] dark:text-[#9A9A9A] transition-[background-color,color,transform] duration-150 group-hover/hdr:bg-black/5 dark:group-hover/hdr:bg-white/5 group-hover/hdr:text-[#3A3A3A] dark:group-hover/hdr:text-white group-active/hdr:scale-[0.94]"
      >
        {children}
      </span>
    </div>
  );
}

// Corner order in state is [tl, tr, br, bl]; the grid displays TL TR / BL BR.
const CORNER_FIELDS = [["TL", 0], ["TR", 1], ["BL", 3], ["BR", 2]];
function CornerRadiusFields({ values, onChange }) {
  return (
    <div className="fx-enter grid grid-cols-2 gap-2">
      {CORNER_FIELDS.map(([label, i]) => (
        <DimensionInput
          key={label}
          label={label}
          value={values[i]}
          min={0}
          max={Infinity}
          onChange={(v) => onChange(i, v)}
        />
      ))}
    </div>
  );
}

// ---------- Social media overlay (Frame mode) ----------
// fields: [label shown in the panel, default text]. `extra` is likes / status / reply placeholder depending on platform.
// Each platform has one or more modes. `themed` = mode supports light/dark chrome (stories are always dark chrome over the image).
const SOCIAL_PLATFORMS = [
  {
    value: "instagram", label: "Instagram",
    modes: [
      { value: "post", label: "Post", themed: true, fields: {
        name: ["Username", "yourname"], artist: ["Artist", "yourname"], song: ["Song title", "Original audio"], caption: ["Caption", "Golden hour in the city"],
        extra: ["Likes", "621K"], comments: ["Comments", "4,388"], reposts: ["Reposts", "207"], shares: ["Shares", "5,884"],
        likedBy: ["Liked by", "alex"], likedOthers: ["Liked by (others)", "others"], time: ["Posted", "2 days ago"],
      } },
      { value: "reels", label: "Reels", themed: false, fields: {
        name: ["Username", "yourname"], artist: ["Artist", "yourname"], song: ["Song title", "Original audio"], caption: ["Caption", "Comment “Portfolio” and I’ll send the link"],
        extra: ["Likes", "7,194"], comments: ["Comments", "4,388"], reposts: ["Reposts", "207"], shares: ["Shares", "5,884"], saves: ["Saves", "8,886"],
        likedBy: ["Liked by", "alex"], likedOthers: ["Liked by (others)", "7,193 others"],
      } },
      { value: "story", label: "Stories", themed: false, fields: { name: ["Username", "yourname"], extra: ["Time", "21h"] } },
    ],
  },
  {
    value: "whatsapp", label: "WhatsApp",
    modes: [
      { value: "status", label: "Status", themed: false, fields: { name: ["Contact name", "Alex"], caption: ["Status text", "Sunday reset 🌿"], extra: ["Time", "5:43 AM"] } },
    ],
  },
  {
    value: "tiktok", label: "TikTok",
    modes: [
      { value: "post", label: "Post", themed: false, fields: {
  name: ["Username", "yourname"], caption: ["Caption", "Wait for it... #fyp"], sound: ["Sound", "Original sound - yourname"],
  extra: ["Likes", "269.8K"], comments: ["Comments", "4,108"], saves: ["Saves", "10.8K"], shares: ["Shares", "25.9K"],
  friendsBadge: ["Friends badge", "7"], inboxBadge: ["Inbox badge", "1"],
} },
      { value: "story", label: "Stories", themed: false, fields: { name: ["Username", "yourname"], extra: ["Time", "13h ago"] } },
    ],
  },
  {
    value: "linkedin", label: "LinkedIn",
    modes: [
      { value: "post", label: "Post", themed: true, fields: {
        name: ["Name", "Your Name"], headline: ["Headline", "Product Designer | Founder"],
        caption: ["Post text", "I have been working on this for months, and I am finally ready to share it. It started as a small experiment and turned into something I'm really proud of. A huge thank you to everyone who gave feedback along the way. Here is what I learned, what I would do differently, and what comes next for the project."],
        time: ["Posted", "2d"], extra: ["Reactions", "700"], comments: ["Comments", "32 comments"], reposts: ["Reposts", "9 reposts"],
        badge: ["Notifications badge", "20+"],
      } },
    ],
  },
  {
    value: "facebook", label: "Facebook",
    modes: [
      { value: "post", label: "Post", themed: true, fields: {
        name: ["Name", "Your Name"], time: ["Posted", "4d"],
        caption: ["Post text", "Weekend well spent. Grateful for everyone who made it happen, and for a little time away to reset."],
        extra: ["Reactions", "11.3K"], comments: ["Comments", "1.6K comments"], shares: ["Shares", "230 shares"],
        reelsBadge: ["Reels badge", "1"], notifBadge: ["Notifications badge", "1"],
      } },
      { value: "reels", label: "Reels", themed: false, fields: {
        name: ["Name", "Your Name"], sound: ["Audio", "Original audio"], caption: ["Caption", "Behind the scenes from this week"],
        extra: ["Likes", "33.6K"], comments: ["Comments", "752"], shares: ["Shares", "221"], saves: ["Saves", "216"],
      } },
            { value: "story", label: "Stories", themed: false, fields: {
        name: ["Name", "Your Name"], extra: ["Time", "23h"], artist: ["Artist", "Kendrick Lamar"], song: ["Song", "HUMBLE."],
      } },
    ],
  },
];
const SOCIAL_OPTIONS = SOCIAL_PLATFORMS.map(({ value, label }) => ({ value, label }));
const platformOf = (p) => SOCIAL_PLATFORMS.find((x) => x.value === p) ?? SOCIAL_PLATFORMS[0];
const modeOf = (platform, mode) => {
  const pl = platformOf(platform);
  return pl.modes.find((m) => m.value === mode) ?? pl.modes[0];
};
const socialDefaults = (platform, mode) => {
  const f = modeOf(platform, mode).fields;
  return Object.fromEntries(Object.entries(f).map(([key, [, def]]) => [key, def]));
};
const DEFAULT_SOCIAL = { on: false, platform: "instagram", mode: "post", theme: "light", avatar: null, avatarName: null, soundAvatar: null, ...socialDefaults("instagram", "post") };

// 24x24 icon paths. Stroked by default, filled when `fill: true`. Shared by the DOM overlay and the canvas export.
const ICONS = {
  heart: { fill: true, rule: "evenodd", d: ["M11.9513 21.0026C11.6913 21.0026 11.4313 20.9426 11.2113 20.7726C8.55131 18.8326 5.78131 16.6926 3.73131 13.7526C3.01131 12.7126 2.04131 11.1026 2.00131 9.06261C1.95131 6.61261 3.34131 4.36261 5.46131 3.44261C7.59131 2.52261 10.1213 3.06261 11.9113 4.82261L11.9913 4.90261C12.0713 4.82261 12.1513 4.74261 12.2313 4.67261C14.2313 2.85261 17.0213 2.49261 19.1513 3.77261C21.3613 5.10261 22.4413 7.84261 21.8013 10.4526C21.2313 12.7426 19.8313 14.4826 18.5313 15.8926C16.7513 17.8126 14.6713 19.4126 12.8713 20.7226C12.6513 20.8826 12.3013 21.0126 11.9413 21.0126L11.9513 21.0026ZM7.62131 5.00261C7.15131 5.00261 6.69131 5.09261 6.26131 5.28261C4.88131 5.88261 3.97131 7.38261 4.00131 9.02261C4.02131 10.1726 4.45131 11.2826 5.37131 12.6126C7.14131 15.1626 9.60131 17.1126 12.0013 18.8826C13.7213 17.6226 15.5113 16.2226 17.0713 14.5326C18.2513 13.2526 19.4113 11.8126 19.8713 9.97261C20.3113 8.21261 19.5913 6.37261 18.1313 5.49261C16.7413 4.65261 14.9513 4.91261 13.5813 6.16261C13.3913 6.33261 13.2113 6.53261 13.0413 6.72261L12.0513 7.76261L10.5113 6.26261C9.68131 5.45261 8.63131 5.01261 7.61131 5.01261L7.62131 5.00261Z"] },
  comment: { fill: true, rule: "evenodd", d: ["M12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19C13.3137 19 14.54 18.6391 15.5886 18.0116C15.8209 17.8726 16.0995 17.8337 16.361 17.9037L18.4741 18.4699L17.9074 16.3548C17.8374 16.0937 17.8762 15.8153 18.0148 15.5833C18.6403 14.5358 19 13.3114 19 12C19 8.13401 15.866 5 12 5ZM3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 13.528 20.6184 14.9694 19.9449 16.2316L20.8543 19.6253C20.9468 19.9704 20.8481 20.3386 20.5955 20.5913C20.3428 20.8439 19.9746 20.9426 19.6295 20.8501L16.2382 19.9414C14.9745 20.6171 13.5307 21 12 21C7.02944 21 3 16.9706 3 12Z"] },
  bookmark: { fill: true, rule: "evenodd", d: ["M12 15.1111L19.271 21.1702C19.5605 21.4115 20 21.2056 20 20.8288V2.22217H4V20.8288C4 21.2056 4.43949 21.4115 4.72897 21.1702L12 15.1111ZM6 17.5076L10.7196 13.5746C11.4613 12.9565 12.5387 12.9565 13.2804 13.5746L18 17.5076V4.22217H6V17.5076Z"] },
  home: { fill: true, rule: "evenodd", d: ["M12.6901 2.27629C12.3038 1.9079 11.6962 1.9079 11.3099 2.27629L2.30989 10.8585C2.11199 11.0472 2 11.3087 2 11.5822V21C2 21.5523 2.44772 22 3 22H9V17C9 15.8954 9.5 14 12 14C14.5 14 15 15.8954 15 17V22H21C21.5523 22 22 21.5523 22 21V11.5822C22 11.3087 21.888 11.0472 21.6901 10.8585L12.6901 2.27629Z"] },
  reels: { fill: true, rule: "evenodd", d: [
    "M14.8 14.1322C15.0667 14.2957 15.0667 14.7043 14.8 14.8678L10.6 17.4425C10.3333 17.6059 10 17.4016 10 17.0747L10 11.9253C10 11.5984 10.3333 11.3941 10.6 11.5575L14.8 14.1322Z",
    "M8 2C4.68629 2 2 4.68629 2 8V16C2 19.3137 4.68629 22 8 22H16C19.3137 22 22 19.3137 22 16V8C22 4.68629 19.3137 2 16 2H8ZM16 4H14.7663L16.5663 7H19.874C19.4299 5.27477 17.8638 4 16 4ZM20 9H4V16C4 18.2091 5.79086 20 8 20H16C18.2091 20 20 18.2091 20 16V9ZM4.12602 7H8.23381L6.58769 4.25647C5.3805 4.71213 4.45161 5.73497 4.12602 7ZM10.5662 7H14.2339L12.4339 4H8.76619L10.5662 7Z",
  ] },
  search: { fill: true, rule: "evenodd", d: ["M15.7618 17.176C14.3145 18.3183 12.4869 19 10.5 19C5.80558 19 2 15.1944 2 10.5C2 5.80558 5.80558 2 10.5 2C15.1944 2 19 5.80558 19 10.5C19 12.4869 18.3183 14.3145 17.176 15.7618L21.6569 20.2426C22.0474 20.6332 22.0474 21.2663 21.6569 21.6569C21.2663 22.0474 20.6332 22.0474 20.2426 21.6569L15.7618 17.176ZM17 10.5C17 14.0899 14.0899 17 10.5 17C6.91015 17 4 14.0899 4 10.5C4 6.91015 6.91015 4 10.5 4C14.0899 4 17 6.91015 17 10.5Z"] },
  dots: { fill: true, rule: "evenodd", d: [
    "M7 13.5C7.82843 13.5 8.5 12.8284 8.5 12C8.5 11.1716 7.82843 10.5 7 10.5C6.17157 10.5 5.5 11.1716 5.5 12C5.5 12.8284 6.17157 13.5 7 13.5Z",
    "M13.5 12C13.5 12.8284 12.8284 13.5 12 13.5C11.1716 13.5 10.5 12.8284 10.5 12C10.5 11.1716 11.1716 10.5 12 10.5C12.8284 10.5 13.5 11.1716 13.5 12Z",
    "M18.5 12C18.5 12.8284 17.8284 13.5 17 13.5C16.1716 13.5 15.5 12.8284 15.5 12C15.5 11.1716 16.1716 10.5 17 10.5C17.8284 10.5 18.5 11.1716 18.5 12Z",
  ] },
  close: { fill: true, rule: "evenodd", d: ["M3.31828 19.2676C2.92776 19.6581 2.92776 20.2913 3.31828 20.6818C3.70881 21.0723 4.34197 21.0723 4.7325 20.6818L12.0001 13.4142L19.2677 20.6818C19.6583 21.0723 20.2914 21.0723 20.682 20.6818C21.0725 20.2913 21.0725 19.6581 20.682 19.2676L13.4143 12L20.6819 4.73238C21.0724 4.34185 21.0724 3.70869 20.6819 3.31816C20.2914 2.92764 19.6582 2.92764 19.2677 3.31816L12.0001 10.5857L4.73255 3.31816C4.34202 2.92764 3.70886 2.92764 3.31833 3.31816C2.92781 3.70869 2.92781 4.34185 3.31833 4.73238L10.5859 12L3.31828 19.2676Z"] },
  back: { fill: true, rule: "evenodd", d: ["M6.29289 11.312C5.90237 11.7025 5.90237 12.3356 6.29289 12.7262C6.32736 12.7606 6.36373 12.7921 6.40165 12.8205C6.42838 12.8554 6.45774 12.889 6.48971 12.921L13.2928 19.726C13.6833 20.1166 14.3164 20.1167 14.707 19.7263C15.0976 19.3358 15.0977 18.7026 14.7072 18.312L8.41512 12.0181L14.9762 5.45711C15.3667 5.06658 15.3667 4.43342 14.9762 4.04289C14.5856 3.65237 13.9525 3.65237 13.562 4.04289L6.29289 11.312Z"] },

  moreCircle: { fill: true, rule: "evenodd", d: [
    "M12 2a10 10 0 1 1 0 20a10 10 0 1 1 0-20ZM12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17Z",
    "M6.3 10.6a1.4 1.4 0 1 1 0 2.8a1.4 1.4 0 1 1 0-2.8Z",
    "M12 10.6a1.4 1.4 0 1 1 0 2.8a1.4 1.4 0 1 1 0-2.8Z",
    "M17.7 10.6a1.4 1.4 0 1 1 0 2.8a1.4 1.4 0 1 1 0-2.8Z",
  ] },

  music: { fill: true, d: ["M18 4.5L8.25 6V14.5026C7.90903 14.3406 7.5276 14.25 7.125 14.25C5.67525 14.25 4.5 15.4253 4.5 16.875C4.5 18.3247 5.67525 19.5 7.125 19.5C8.57475 19.5 9.75 18.3247 9.75 16.875V10.2692L16.5 9.23077V13.0026C16.159 12.8406 15.7776 12.75 15.375 12.75C13.9253 12.75 12.75 13.9253 12.75 15.375C12.75 16.8247 13.9253 18 15.375 18C16.8247 18 18 16.8247 18 15.375V4.5Z"] },

  send: { fill: true, rule: "evenodd", d: ["M2.32435 5.09454C1.64037 4.33808 2.10065 3 3.2445 3L21 3C21.3548 3 21.6831 3.18803 21.8626 3.49409C22.0421 3.80016 22.0459 4.17843 21.8728 4.48811L12.9951 20.3621C12.4461 21.3437 11.0257 21.1444 10.7185 20.1049L8.20479 11.5981L2.32435 5.09454ZM10.2783 11.5575L12.1276 17.8158L18.304 6.77187L10.2783 11.5575ZM17.3704 5L4.93521 5L9.29121 9.81757L17.3704 5Z"] },
  sliders: { fill: true, d: ["M21 16.0001H18.862C18.6445 15.1418 18.147 14.3806 17.4482 13.8369C16.7495 13.2931 15.8894 12.9979 15.004 12.9979C14.1186 12.9979 13.2585 13.2931 12.5598 13.8369C11.861 14.3806 11.3635 15.1418 11.146 16.0001H3C2.73478 16.0001 2.48043 16.1054 2.29289 16.2929C2.10536 16.4805 2 16.7348 2 17.0001C2 17.2653 2.10536 17.5196 2.29289 17.7072C2.48043 17.8947 2.73478 18.0001 3 18.0001H11.146C11.3635 18.8583 11.861 19.6195 12.5598 20.1632C13.2585 20.707 14.1186 21.0022 15.004 21.0022C15.8894 21.0022 16.7495 20.707 17.4482 20.1632C18.147 19.6195 18.6445 18.8583 18.862 18.0001H21C21.2652 18.0001 21.5196 17.8947 21.7071 17.7072C21.8946 17.5196 22 17.2653 22 17.0001C22 16.7348 21.8946 16.4805 21.7071 16.2929C21.5196 16.1054 21.2652 16.0001 21 16.0001ZM15.004 19.0011C14.6084 19.0011 14.2218 18.8838 13.8929 18.664C13.564 18.4442 13.3076 18.1319 13.1562 17.7664C13.0049 17.401 12.9653 16.9988 13.0424 16.6109C13.1196 16.2229 13.3101 15.8665 13.5898 15.5868C13.8695 15.3071 14.2259 15.1167 14.6138 15.0395C15.0018 14.9623 15.4039 15.0019 15.7694 15.1533C16.1348 15.3047 16.4472 15.561 16.6669 15.8899C16.8867 16.2188 17.004 16.6055 17.004 17.0011C17.0032 17.5312 16.7922 18.0395 16.4173 18.4144C16.0424 18.7893 15.5342 19.0003 15.004 19.0011ZM3 8.00005H5.139C5.35653 8.85829 5.85403 9.61949 6.55278 10.1632C7.25152 10.707 8.11162 11.0022 8.997 11.0022C9.88238 11.0022 10.7425 10.707 11.4412 10.1632C12.14 9.61949 12.6375 8.85829 12.855 8.00005H21C21.2652 8.00005 21.5196 7.89469 21.7071 7.70716C21.8946 7.51962 22 7.26527 22 7.00005C22 6.73483 21.8946 6.48048 21.7071 6.29294C21.5196 6.10541 21.2652 6.00005 21 6.00005H12.855C12.6375 5.14181 12.14 4.38061 11.4412 3.83688C10.7425 3.29315 9.88238 2.99792 8.997 2.99792C8.11162 2.99792 7.25152 3.29315 6.55278 3.83688C5.85403 4.38061 5.35653 5.14181 5.139 6.00005H3C2.73478 6.00005 2.48043 6.10541 2.29289 6.29294C2.10536 6.48048 2 6.73483 2 7.00005C2 7.26527 2.10536 7.51962 2.29289 7.70716C2.48043 7.89469 2.73478 8.00005 3 8.00005ZM8.997 5.00105C9.39256 5.00105 9.77924 5.11835 10.1081 5.33811C10.437 5.55788 10.6934 5.87023 10.8448 6.23568C10.9961 6.60114 11.0357 7.00327 10.9586 7.39123C10.8814 7.77919 10.6909 8.13556 10.4112 8.41527C10.1315 8.69497 9.77514 8.88545 9.38718 8.96262C8.99922 9.03979 8.59709 9.00019 8.23163 8.84881C7.86618 8.69743 7.55382 8.44109 7.33406 8.11219C7.1143 7.78329 6.997 7.39661 6.997 7.00105C6.99779 6.47086 7.20876 5.96262 7.58366 5.58771C7.95856 5.21281 8.46681 5.00184 8.997 5.00105Z"] },

  menu: { fill: true, rule: "evenodd", d: [
    "M7 13.5C7.82843 13.5 8.5 12.8284 8.5 12C8.5 11.1716 7.82843 10.5 7 10.5C6.17157 10.5 5.5 11.1716 5.5 12C5.5 12.8284 6.17157 13.5 7 13.5Z",
    "M13.5 12C13.5 12.8284 12.8284 13.5 12 13.5C11.1716 13.5 10.5 12.8284 10.5 12C10.5 11.1716 11.1716 10.5 12 10.5C12.8284 10.5 13.5 11.1716 13.5 12Z",
    "M18.5 12C18.5 12.8284 17.8284 13.5 17 13.5C16.1716 13.5 15.5 12.8284 15.5 12C15.5 11.1716 16.1716 10.5 17 10.5C17.8284 10.5 18.5 11.1716 18.5 12Z",
  ] },

  repost: { d: ["M12.5 2L16.8527 5.125L12.5 8.24999", "M3 14V9C3 6.79086 4.79086 5 7 5H16", "M11.3527 22.1079L6.99999 18.9829L11.3527 15.8579", "M21 11L21 15C21 17.2091 19.2091 19 17 19L8 19"] },

  tkHome: { fill: true, rule: "evenodd", vb: [20, 20], d: ["M10.8737 0.931953C10.5595 0.674373 10.1071 0.674373 9.793 0.931964L0.645447 8.43179C0.367004 8.66008 0.262069 9.03876 0.383294 9.37779C0.504513 9.71681 0.825727 9.94312 1.18579 9.94312H2.51054L3.18786 17.3451C3.25473 18.0764 3.86801 18.6361 4.60237 18.6361H8.91319C9.22699 18.6361 9.48136 18.3817 9.48136 18.0679V12.5654C9.48136 12.2516 9.73573 11.9972 10.0495 11.9972H10.6177C10.9315 11.9972 11.1859 12.2516 11.1859 12.5654V18.0679C11.1859 18.3817 11.4402 18.6361 11.754 18.6361H16.065C16.7993 18.6361 17.4126 18.0764 17.4795 17.3451L18.1568 9.94312H19.4812C19.8413 9.94312 20.1625 9.71681 20.2837 9.37779C20.4049 9.0387 20.3 8.66008 20.0215 8.43179L10.8737 0.931953Z"] },
  tkFriends: { fill: true, rule: "evenodd", vb: [20, 20], d: [
    "M6.34979 3.93512C4.99591 3.93512 3.8698 5.05955 3.8698 6.48219C3.8698 7.90482 4.99591 9.02925 6.34979 9.02925C7.70368 9.02925 8.82979 7.90482 8.82979 6.48219C8.82979 5.05955 7.70368 3.93512 6.34979 3.93512ZM2.18467 6.48219C2.18467 4.16076 4.03365 2.25 6.34979 2.25C8.66594 2.25 10.5149 4.16076 10.5149 6.48219C10.5149 8.80361 8.66594 10.7144 6.34979 10.7144C4.03365 10.7144 2.18467 8.80361 2.18467 6.48219ZM6.34979 13.6972C4.14795 13.6972 2.27196 15.2039 1.68592 17.2854C1.60185 17.584 1.31595 17.7929 1.00985 17.7425L0.455581 17.6514C0.149472 17.601 -0.0602074 17.3111 0.0155557 17.0103C0.736828 14.1463 3.28899 12.0121 6.34979 12.0121C9.41054 12.0121 11.9628 14.1463 12.684 17.0103C12.7598 17.3111 12.5501 17.601 12.244 17.6514L11.6897 17.7425C11.3836 17.7929 11.0977 17.584 11.0137 17.2854C10.4276 15.2039 8.55163 13.6972 6.34979 13.6972Z",
    "M14.7754 14.628C14.351 14.628 13.9439 14.7015 13.5647 14.8371C13.2726 14.9414 12.9323 14.8455 12.7841 14.573L12.5156 14.0796C12.3673 13.8071 12.4671 13.463 12.7537 13.3442C13.3784 13.0855 14.0612 12.9429 14.7754 12.9429C17.278 12.9429 19.3586 14.6803 19.9827 17.0119C20.063 17.3116 19.8524 17.6015 19.5462 17.6514L18.9918 17.7417C18.6856 17.7916 18.401 17.5817 18.3082 17.2857C17.8208 15.7306 16.4099 14.628 14.7754 14.628Z",
    "M14.7751 7.30524C13.9995 7.30524 13.3708 7.93396 13.3708 8.70951C13.3708 9.48506 13.9995 10.1138 14.7751 10.1138C15.5506 10.1138 16.1793 9.48506 16.1793 8.70951C16.1793 7.93396 15.5506 7.30524 14.7751 7.30524ZM11.6857 8.70951C11.6857 7.00327 13.0688 5.62012 14.7751 5.62012C16.4813 5.62012 17.8645 7.00327 17.8645 8.70951C17.8645 10.4158 16.4813 11.7989 14.7751 11.7989C13.0688 11.7989 11.6857 10.4158 11.6857 8.70951Z",
  ] },
  tkInbox: { fill: true, rule: "evenodd", vb: [20, 20], d: ["M16.6393 13.983H11.9723L9.83345 16.5972L7.69447 13.983H3.02767L3.05739 2.69344H16.6094L16.6393 13.983ZM16.9223 15.6764H12.7748L10.9257 17.9366C10.3611 18.6266 9.30595 18.6266 8.74127 17.9366L6.89195 15.6764H2.74469C1.96386 15.6764 1.33144 15.0424 1.3335 14.2616L1.36471 2.40748C1.36675 1.62955 1.99796 1 2.7759 1H16.8909C17.6688 1 18.3 1.62954 18.3021 2.40745L18.3335 14.2615C18.3356 15.0423 17.7032 15.6764 16.9223 15.6764ZM7.01083 7.77375C6.69907 7.77375 6.44633 8.02649 6.44633 8.33825V8.90268C6.44633 9.21444 6.69907 9.46718 7.01083 9.46718H12.6556C12.9673 9.46718 13.2201 9.21444 13.2201 8.90268V8.33825C13.2201 8.02649 12.9673 7.77375 12.6556 7.77375H7.01083Z"] },
  tkProfile: { fill: true, rule: "evenodd", vb: [20, 20], d: ["M10.1666 3.63647C8.50965 3.63647 7.16643 4.97968 7.16643 6.63666C7.16643 8.29364 8.50965 9.63686 10.1666 9.63686C11.8236 9.63686 13.1668 8.29364 13.1668 6.63666C13.1668 4.97968 11.8236 3.63647 10.1666 3.63647ZM5.52996 6.63666C5.52996 4.07592 7.60588 2 10.1666 2C12.7274 2 14.8033 4.07592 14.8033 6.63666C14.8033 9.19741 12.7274 11.2733 10.1666 11.2733C7.60588 11.2733 5.52996 9.19741 5.52996 6.63666ZM10.1666 14.0008C7.51865 14.0008 5.28913 15.7984 4.6341 18.2399C4.55604 18.5308 4.27735 18.7324 3.98023 18.6826L3.44226 18.5923C3.14514 18.5425 2.9427 18.2602 3.01454 17.9677C3.80409 14.7507 6.70593 12.3643 10.1666 12.3643C13.6273 12.3643 16.5292 14.7507 17.3187 17.9677C17.3905 18.2602 17.1881 18.5425 16.891 18.5923L16.353 18.6826C16.0559 18.7324 15.7772 18.5308 15.6991 18.2399C15.0441 15.7984 12.8146 14.0008 10.1666 14.0008Z"] },
  tkSearch: { fill: true, rule: "evenodd", vb: [21, 21], d: ["M8.85093 2C5.08433 2 2 5.11467 2 8.99533C2 12.876 5.08433 15.9907 8.85093 15.9907C10.667 15.9907 12.3188 15.2703 13.5481 14.0876C14.8731 12.8127 15.7018 11.0053 15.7018 8.99533C15.7018 5.11467 12.6175 2 8.85093 2ZM0 8.99533C0 4.0446 3.9456 0 8.85093 0C13.7563 0 17.7018 4.0446 17.7018 8.99533C17.7018 11.1995 16.9207 13.2219 15.6228 14.7878L19.9131 19.157C20.1711 19.4197 20.1672 19.8418 19.9045 20.0998L19.4288 20.5669C19.1661 20.8249 18.744 20.821 18.4861 20.5583L14.1828 16.1759C12.7015 17.3134 10.8543 17.9907 8.85093 17.9907C3.9456 17.9907 0 13.9461 0 8.99533Z"] },
  tkLive: { fill: true, rule: "evenodd", vb: [23, 24], d: ["M8.20711 0.292893C7.81658 -0.0976311 7.18342 -0.0976311 6.79289 0.292893C6.40237 0.683417 6.40237 1.31658 6.79289 1.70711L9.08579 4H3.5C1.567 4 0 5.567 0 7.5C0 8.05228 0.447715 8.5 1 8.5C1.55228 8.5 2 8.05228 2 7.5C2 6.67157 2.67157 6 3.5 6H11.5H19.5C20.3284 6 21 6.67157 21 7.5C21 8.05228 21.4477 8.5 22 8.5C22.5523 8.5 23 8.05228 23 7.5C23 5.567 21.433 4 19.5 4H13.9142L16.2071 1.70711C16.5976 1.31658 16.5976 0.683417 16.2071 0.292893C15.8166 -0.0976311 15.1834 -0.0976311 14.7929 0.292893L11.5 3.58579L8.20711 0.292893ZM2 20C2 19.4477 1.55228 19 1 19C0.447715 19 0 19.4477 0 20C0 22.2091 1.79086 24 4 24H19C21.2091 24 23 22.2091 23 20C23 19.4477 22.5523 19 22 19C21.4477 19 21 19.4477 21 20C21 21.1046 20.1046 22 19 22H4C2.89543 22 2 21.1046 2 20ZM11.4231 10.6154C11.2107 10.1056 10.6252 9.8645 10.1154 10.0769C9.60558 10.2893 9.36451 10.8748 9.57692 11.3846L12.0769 17.3846C12.2322 17.7573 12.5963 18 13 18C13.4037 18 13.7678 17.7573 13.9231 17.3846L16.4231 11.3846C16.6355 10.8748 16.3944 10.2893 15.8846 10.0769C15.3748 9.8645 14.7893 10.1056 14.5769 10.6154L13 14.4L11.4231 10.6154ZM2 11C2 10.4477 1.55228 10 1 10C0.447715 10 0 10.4477 0 11V17C0 17.5523 0.447715 18 1 18H4C4.55228 18 5 17.5523 5 17C5 16.4477 4.55228 16 4 16H2V11ZM8 11C8 10.4477 7.55228 10 7 10C6.44772 10 6 10.4477 6 11V17C6 17.5523 6.44772 18 7 18C7.55228 18 8 17.5523 8 17V11ZM19 10C18.4477 10 18 10.4477 18 11V14V17C18 17.5523 18.4477 18 19 18H22C22.5523 18 23 17.5523 23 17C23 16.4477 22.5523 16 22 16H20V15H22C22.5523 15 23 14.5523 23 14C23 13.4477 22.5523 13 22 13H20V12H22C22.5523 12 23 11.5523 23 11C23 10.4477 22.5523 10 22 10H19Z"] },
  tkPlus: { fill: true, rule: "evenodd", vb: [22, 22], d: ["M12 7C12 6.44772 11.5523 6 11 6C10.4477 6 10 6.44772 10 7V10H7C6.44772 10 6 10.4477 6 11C6 11.5523 6.44772 12 7 12H10V15C10 15.5523 10.4477 16 11 16C11.5523 16 12 15.5523 12 15V12H15C15.5523 12 16 11.5523 16 11C16 10.4477 15.5523 10 15 10H12V7Z"] },
  tkHeart: { fill: true, rule: "evenodd", vb: [34, 34], d: ["M10.625 3.1875C14.875 3.1875 17 6.02083 17 6.02083C17 6.02083 19.125 3.1875 23.375 3.1875C28.3333 3.1875 31.875 7.08333 31.875 12.0417C31.875 17.7083 27.2425 22.7588 23.0208 26.5625C20.4142 28.9071 18.4167 30.4583 17 30.4583C15.5833 30.4583 13.5292 28.9 10.9792 26.5625C6.82833 22.7588 2.125 17.7083 2.125 12.0417C2.125 7.08333 5.66667 3.1875 10.625 3.1875Z"] },
  tkComment: { fill: true, rule: "evenodd", vb: [34, 34], d: ["M27.2709 25.0113C30.175 22.1 31.875 19.0613 31.875 15.5338C31.875 8.35838 25.3088 2.55005 17.2125 2.55005C9.1163 2.55005 2.55005 8.35838 2.55005 15.5338C2.55005 22.7021 9.3288 27.625 17.425 27.625V30.005C17.425 30.7559 18.2042 31.2375 18.87 30.8834C20.9384 29.7571 24.7705 27.5117 27.2638 25.0113H27.2709ZM10.0796 13.7842C10.6326 13.7823 11.1638 13.9997 11.5568 14.3887C11.9498 14.7777 12.1726 15.3067 12.1763 15.8596C12.1754 16.134 12.1204 16.4056 12.0145 16.6587C11.9087 16.9119 11.754 17.1417 11.5593 17.3351C11.3646 17.5285 11.1337 17.6816 10.8798 17.7858C10.6259 17.8899 10.354 17.9431 10.0796 17.9421C9.52666 17.9421 8.99624 17.723 8.60457 17.3326C8.2129 16.9423 7.99192 16.4126 7.99005 15.8596C7.99379 15.3079 8.21559 14.78 8.60706 14.3912C8.99853 14.0024 9.52789 13.7842 10.0796 13.7842ZM19.3021 15.8596C19.2984 15.3067 19.0756 14.7777 18.6826 14.3887C18.2896 13.9997 17.7584 13.7823 17.2055 13.7842C16.6525 13.7823 16.1213 13.9997 15.7283 14.3887C15.3353 14.7777 15.1125 15.3067 15.1088 15.8596C15.1097 16.134 15.1647 16.4056 15.2706 16.6587C15.3764 16.9119 15.5311 17.1417 15.7258 17.3351C15.9205 17.5285 16.1514 17.6816 16.4053 17.7858C16.6592 17.8899 16.9311 17.9431 17.2055 17.9421C17.4799 17.9431 17.7518 17.8899 18.0057 17.7858C18.2595 17.6816 18.4904 17.5285 18.6851 17.3351C18.8798 17.1417 19.0345 16.9119 19.1404 16.6587C19.2462 16.4056 19.3012 16.134 19.3021 15.8596ZM24.3313 13.7842C24.883 13.7842 25.4124 14.0024 25.8039 14.3912C26.1953 14.78 26.4171 15.3079 26.4209 15.8596C26.42 16.134 26.365 16.4056 26.2591 16.6587C26.1532 16.9119 25.9985 17.1417 25.8039 17.3351C25.6092 17.5285 25.3783 17.6816 25.1244 17.7858C24.8705 17.8899 24.5986 17.9431 24.3242 17.9421C23.7712 17.9421 23.2408 17.723 22.8492 17.3326C22.4575 16.9423 22.2365 16.4126 22.2346 15.8596C22.2384 15.3079 22.4602 14.78 22.8516 14.3912C23.2431 14.0024 23.7725 13.7842 24.3242 13.7842H24.3313Z"] },
  tkBookmark: { fill: true, vb: [34, 34], d: ["M9.5 3.75415C7.84315 3.75415 6.5 5.0973 6.5 6.75415V27.9488C6.5 28.8055 7.19448 29.4999 8.05117 29.4999C8.34438 29.4999 8.63158 29.4168 8.87948 29.2603L18 23.4999L27.1205 29.2603C27.3684 29.4168 27.6556 29.4999 27.9488 29.4999C28.8055 29.4999 29.5 28.8055 29.5 27.9488V6.75415C29.5 5.0973 28.1569 3.75415 26.5 3.75415H9.5Z"] },
  tkShare: { fill: true, rule: "evenodd", vb: [34, 34], d: ["M18.105 2.88296C17.9086 2.68901 17.6593 2.55733 17.3884 2.50441C17.1175 2.45149 16.837 2.47969 16.5821 2.58546C16.329 2.68925 16.1125 2.86582 15.9599 3.09281C15.8073 3.31979 15.7256 3.58696 15.725 3.86046V9.76796C11.9 10.0159 8.61333 11.3263 6.21208 13.7913C3.52042 16.5396 2.125 20.563 2.125 25.6346C2.125 26.1942 2.465 26.6971 2.98917 26.9096C3.50625 27.1221 4.10833 27.0017 4.505 26.6121C6.87083 24.2675 9.92375 23.3821 12.4738 23.1059C13.7487 22.9642 14.8608 22.9784 15.6613 23.035H15.725V29.4313C15.725 29.9838 16.0508 30.4796 16.5608 30.6992C17.0708 30.9117 17.6658 30.8125 18.0696 30.4371L31.4358 18.0484C31.5714 17.922 31.68 17.7696 31.7551 17.6002C31.8302 17.4308 31.8703 17.248 31.8729 17.0628C31.8756 16.8775 31.8407 16.6936 31.7705 16.5221C31.7002 16.3507 31.596 16.1952 31.4642 16.065L18.105 2.88296Z"] },
  tkMusic: { fill: true, rule: "evenodd", vb: [20, 22], d: ["M17.7191 2.90724C17.7191 2.53422 17.3794 2.2578 17.0228 2.3405L7.91095 4.45353C7.65152 4.51368 7.46739 4.74895 7.46739 5.02026V18.7383H7.46682C7.48192 19.9979 6.20805 21.3082 4.38992 21.805C2.36043 22.3596 0.421329 21.6907 0.058803 20.3108C-0.303729 18.931 1.04759 17.363 3.07706 16.8084C3.81659 16.6063 4.54414 16.5667 5.18774 16.6647V5.02026C5.18774 3.66361 6.10826 2.48743 7.40549 2.1866L16.5173 0.0735664C18.3005 -0.339971 19.9987 1.04225 19.9987 2.90724V15.9032C20.0465 17.177 18.7637 18.5138 16.923 19.0168C14.8934 19.5714 12.9544 18.9024 12.5919 17.5226C12.2293 16.1428 13.5807 14.5747 15.6101 14.0201C16.349 13.8183 17.0759 13.7785 17.7191 13.8762V2.90724Z"] },
  tkClose: { fill: true, rule: "evenodd", vb: [20, 20], d: ["M16.061 2.97194C15.9754 2.88642 15.8595 2.83838 15.7385 2.83838C15.6176 2.83838 15.5016 2.88642 15.4161 2.97194L10 8.38802L4.58393 2.97194C4.49841 2.88642 4.38243 2.83838 4.26149 2.83838C4.14055 2.83838 4.02457 2.88642 3.93905 2.97194L2.97175 3.93925C2.88623 4.02476 2.83819 4.14074 2.83819 4.26168C2.83819 4.38262 2.88623 4.4986 2.97175 4.58412L8.38783 10.0002L2.97175 15.4163C2.88623 15.5018 2.83819 15.6178 2.83819 15.7387C2.83819 15.8597 2.88623 15.9756 2.97175 16.0612L3.93905 17.0285C4.02457 17.114 4.14055 17.162 4.26149 17.162C4.38243 17.162 4.49841 17.114 4.58393 17.0285L10 11.6124L15.4161 17.0285C15.5016 17.114 15.6176 17.162 15.7385 17.162C15.8595 17.162 15.9754 17.114 16.061 17.0285L17.0283 16.0612C17.1138 15.9756 17.1618 15.8597 17.1618 15.7387C17.1618 15.6178 17.1138 15.5018 17.0283 15.4163L11.6122 10.0002L17.0283 4.58412C17.1138 4.4986 17.1618 4.38262 17.1618 4.26168C17.1618 4.14074 17.1138 4.02476 17.0283 3.93925L16.061 2.97194Z"] },

  menuV: { fill: true, rule: "evenodd", d: [
    "M13.5 7C13.5 7.82843 12.8284 8.5 12 8.5C11.1716 8.5 10.5 7.82843 10.5 7C10.5 6.17157 11.1716 5.5 12 5.5C12.8284 5.5 13.5 6.17157 13.5 7Z",
    "M12 13.5C12.8284 13.5 13.5 12.8284 13.5 12C13.5 11.1716 12.8284 10.5 12 10.5C11.1716 10.5 10.5 11.1716 10.5 12C10.5 12.8284 11.1716 13.5 12 13.5Z",
    "M12 18.5C12.8284 18.5 13.5 17.8284 13.5 17C13.5 16.1716 12.8284 15.5 12 15.5C11.1716 15.5 10.5 16.1716 10.5 17C10.5 17.8284 11.1716 18.5 12 18.5Z",
  ] },

    stClose: { fill: true, rule: "evenodd", vb: [20, 20], d: ["M16.061 2.97194C15.9754 2.88642 15.8595 2.83838 15.7385 2.83838C15.6176 2.83838 15.5016 2.88642 15.4161 2.97194L10 8.38802L4.58393 2.97194C4.49841 2.88642 4.38243 2.83838 4.26149 2.83838C4.14055 2.83838 4.02457 2.88642 3.93905 2.97194L2.97175 3.93925C2.88623 4.02476 2.83819 4.14074 2.83819 4.26168C2.83819 4.38262 2.88623 4.4986 2.97175 4.58412L8.38783 10.0002L2.97175 15.4163C2.88623 15.5018 2.83819 15.6178 2.83819 15.7387C2.83819 15.8597 2.88623 15.9756 2.97175 16.0612L3.93905 17.0285C4.02457 17.114 4.14055 17.162 4.26149 17.162C4.38243 17.162 4.49841 17.114 4.58393 17.0285L10 11.6124L15.4161 17.0285C15.5016 17.114 15.6176 17.162 15.7385 17.162C15.8595 17.162 15.9754 17.114 16.061 17.0285L17.0283 16.0612C17.1138 15.9756 17.1618 15.8597 17.1618 15.7387C17.1618 15.6178 17.1138 15.5018 17.0283 15.4163L11.6122 10.0002L17.0283 4.58412C17.1138 4.4986 17.1618 4.38262 17.1618 4.26168C17.1618 4.14074 17.1138 4.02476 17.0283 3.93925L16.061 2.97194Z"] },
  stHeart: { sw: 2, vb: [30, 30], d: ["M19.0557 2.83984C20.5112 2.37267 22.0728 2.38737 23.5195 2.88281C24.9665 3.37842 26.2273 4.33084 27.1221 5.60645C28.017 6.88223 28.5 8.4166 28.5 9.99219C28.4999 14.0493 26.4702 17.6812 23.9248 20.6357C21.383 23.5859 18.3697 25.8105 16.5039 27.043C15.5798 27.6533 14.4207 27.6524 13.4971 27.041C11.6314 25.8061 8.61831 23.5773 6.07617 20.626C3.53017 17.6701 1.50012 14.0403 1.5 9.99219C1.5 8.4166 1.98304 6.88223 2.87793 5.60645C3.77271 4.33084 5.03348 3.37842 6.48047 2.88281C7.92719 2.38737 9.48884 2.37267 10.9443 2.83984C12.3998 3.30709 13.6777 4.23372 14.5957 5.49121L15 6.04492L15.4043 5.49121C16.3223 4.23372 17.6002 3.30709 19.0557 2.83984Z"] },
  stShare: { sw: 2, vb: [30, 30], d: ["M14.9127 3.00201C14.9127 2.11111 15.9897 1.66502 16.6197 2.29498L27.4976 13.1739C28.2787 13.9549 28.2787 15.221 27.4976 16.002L16.6197 26.8809C15.9898 27.5108 14.9129 27.0646 14.9127 26.1739V20.2452C8.25093 20.2452 5.21339 22.0849 3.56991 23.6807C2.91941 24.3124 1.93557 23.9599 2.0035 23.0557C2.82764 12.0868 9.09623 9.49344 14.9127 8.58795V3.00201Z"] },
    chevDown: { sw: 2.5, d: ["M6 9l6 6 6-6"] },
  speakerOff: { fill: true, rule: "evenodd", d: [
    "M4 9v6h4l5 4V5L8 9H4z",
    "M16 9.4L17.4 8l2.1 2.1L21.6 8L23 9.4l-2.1 2.1L23 13.6l-1.4 1.4-2.1-2.1L17.4 15 16 13.6l2.1-2.1z",
  ] },

  liLike: { fill: true, rule: "evenodd", d: ["M19.4604 11L15.5504 7.09002C14.7818 6.32038 14.2032 5.38224 13.8604 4.35002L13.3704 2.88002C13.1864 2.33317 12.8357 1.85772 12.3676 1.5205C11.8994 1.18329 11.3373 1.00126 10.7604 1.00002C10.3992 0.998703 10.0414 1.06853 9.70724 1.20552C9.37309 1.3425 9.06919 1.54397 8.8129 1.7984C8.55661 2.05283 8.35294 2.35525 8.21353 2.6884C8.07412 3.02154 8.00169 3.37888 8.00038 3.74002V4.86002C8.00261 5.82832 8.15786 6.79018 8.46038 7.71002L8.89038 9.00002H4.12038C3.55812 9.00002 3.01889 9.22337 2.62131 9.62095C2.22373 10.0185 2.00038 10.5578 2.00038 11.12C2.00176 11.4656 2.08603 11.8058 2.24611 12.112C2.4062 12.4183 2.63743 12.6816 2.92038 12.88C2.63717 13.0734 2.40537 13.333 2.24506 13.6362C2.08476 13.9394 2.00077 14.2771 2.00038 14.62C1.99243 15.0425 2.10975 15.4579 2.33754 15.8138C2.56533 16.1698 2.8934 16.4503 3.28038 16.62C3.10063 16.9229 3.00404 17.2678 3.00038 17.62C2.99951 18.1621 3.20632 18.6839 3.5783 19.0782C3.95028 19.4725 4.45917 19.7093 5.00038 19.74V19.88C5.00038 20.4423 5.22374 20.9815 5.62131 21.3791C6.01889 21.7767 6.55812 22 7.12038 22H14.6104C15.8524 21.9989 17.0775 21.7115 18.1904 21.16L18.5004 21H21.0004V11H19.4604ZM19.0004 19H18.0004L17.2704 19.37C16.4332 19.7816 15.5133 19.9971 14.5804 20H7.72038C7.49723 20.0089 7.27754 19.9428 7.0963 19.8123C6.91507 19.6819 6.78273 19.4945 6.72038 19.28L6.47038 18.41L5.62038 18C5.4246 17.9203 5.25914 17.7805 5.14774 17.6009C5.03635 17.4212 4.98476 17.2108 5.00038 17L5.17038 16L4.41038 15.26C4.24503 15.0985 4.14072 14.8848 4.1152 14.655C4.08967 14.4253 4.14451 14.1939 4.27038 14L4.93038 12.91L4.20038 11.81C4.15861 11.7593 4.12748 11.7006 4.10885 11.6376C4.09022 11.5745 4.08447 11.5084 4.09193 11.4431C4.0994 11.3777 4.11993 11.3146 4.1523 11.2574C4.18468 11.2002 4.22823 11.15 4.28038 11.11C4.37533 11.031 4.49711 10.9916 4.62038 11H11.6704L10.3604 7.08002C10.1215 6.36426 9.99994 5.61458 10.0004 4.86002V3.75002C10.0054 3.5527 10.0861 3.36486 10.2257 3.22529C10.3652 3.08572 10.5531 3.00508 10.7504 3.00002C10.9072 3.00014 11.06 3.0494 11.1874 3.14088C11.3147 3.23236 11.4102 3.36146 11.4604 3.51002L12.0004 5.00002C12.4318 6.31493 13.1607 7.51263 14.1304 8.50002L18.6304 13H19.0004V19Z"] },
  liSearch: { fill: true, rule: "evenodd", d: ["M21.41 18.59L16.14 13.31C16.7027 12.2975 16.9987 11.1584 17 10C17 8.61553 16.5895 7.26216 15.8203 6.11101C15.0511 4.95987 13.9579 4.06266 12.6788 3.53285C11.3997 3.00303 9.99224 2.86441 8.63437 3.13451C7.2765 3.4046 6.02922 4.07129 5.05026 5.05026C4.07129 6.02922 3.4046 7.2765 3.13451 8.63437C2.86441 9.99224 3.00303 11.3997 3.53285 12.6788C4.06266 13.9579 4.95987 15.0511 6.11101 15.8203C7.26216 16.5895 8.61553 17 10 17C11.1584 16.9987 12.2975 16.7027 13.31 16.14L18.59 21.41C18.9726 21.7377 19.4648 21.9089 19.9681 21.8894C20.4715 21.87 20.9489 21.6613 21.3051 21.3051C21.6613 20.9489 21.87 20.4715 21.8894 19.9681C21.9089 19.4648 21.7377 18.9726 21.41 18.59ZM5 10C5 9.0111 5.29325 8.0444 5.84265 7.22215C6.39206 6.39991 7.17296 5.75904 8.08659 5.38061C9.00022 5.00217 10.0055 4.90315 10.9755 5.09608C11.9454 5.289 12.8363 5.76521 13.5355 6.46447C14.2348 7.16373 14.711 8.05465 14.9039 9.02455C15.0969 9.99446 14.9978 10.9998 14.6194 11.9134C14.241 12.8271 13.6001 13.6079 12.7779 14.1574C11.9556 14.7068 10.9889 15 10 15C8.67392 15 7.40215 14.4732 6.46447 13.5355C5.52679 12.5979 5 11.3261 5 10Z"]},
  liComment: { fill: true, rule: "evenodd", d: ["M7 9H17V10H7V9ZM7 13H14V12H7V13ZM23 11C23.0148 12.0949 22.7643 13.1772 22.2697 14.1541C21.7751 15.1311 21.0512 15.9738 20.16 16.61L12 22V18H8C6.14348 18 4.36301 17.2625 3.05025 15.9497C1.7375 14.637 1 12.8565 1 11C1 9.14348 1.7375 7.36301 3.05025 6.05025C4.36301 4.7375 6.14348 4 8 4H16C17.8565 4 19.637 4.7375 20.9497 6.05025C22.2625 7.36301 23 9.14348 23 11ZM21 11C21 9.67392 20.4732 8.40215 19.5355 7.46447C18.5979 6.52678 17.3261 6 16 6H8C6.67392 6 5.40215 6.52678 4.46447 7.46447C3.52678 8.40215 3 9.67392 3 11C3 12.3261 3.52678 13.5979 4.46447 14.5355C5.40215 15.4732 6.67392 16 8 16H14V18.28L19 15C19.6336 14.5463 20.1469 13.9448 20.4955 13.2477C20.844 12.5507 21.0172 11.7791 21 11Z"]},
  liHome: { fill: true, d: ["M23 9V11H21V18C21 18.7956 20.6839 19.5587 20.1213 20.1213C19.5587 20.6839 18.7956 21 18 21H14V15H10V21H6C5.20435 21 4.44129 20.6839 3.87868 20.1213C3.31607 19.5587 3 18.7956 3 18V11H1V9L12 2L17 5.18V2H20V7.09L23 9Z"]},
  liRepost: { fill: true, rule: "evenodd", d: ["M13.96 5H6C5.45 5 5 5.45 5 6V16H3V6C3 4.34 4.34 3 6 3H13.96L12 0H14.37L17 4L14.37 8H12L13.96 5ZM19.5 8H19V18C19 18.55 18.55 19 18 19H10.04L12 16H9.63L7 20L9.63 24H12L10.04 21H18C19.66 21 21 19.66 21 18V8H19.5Z"]},
  liSend: { fill: true, d: ["M21 3L0 10L7.66 14.26L16 8L9.74 16.34L14 24L21 3Z"]},
  liLove: { fill: true, rule: "evenodd", d: [""]},
  liGlobe: { fill: true, vb: [16, 16], d: ["M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM3 8C3 6.91815 3.35089 5.86548 4 5L4.55 5.55C4.69233 5.68951 4.80544 5.85599 4.8827 6.03971C4.95996 6.22342 4.99984 6.4207 5 6.62V7.69C5.00018 7.88885 5.07931 8.07948 5.22 8.22L5.78 8.78C5.92052 8.92069 6.11116 8.99983 6.31 9H7V9.69C7.00018 9.88884 7.07931 10.0795 7.22 10.22L7.78 10.78C7.9207 10.9205 7.99983 11.1112 8 11.31V13C6.67392 13 5.40215 12.4732 4.46447 11.5355C3.52679 10.5979 3 9.32608 3 8ZM9.24 12.83L11.24 10.37C11.3295 10.259 11.3855 10.1248 11.4014 9.9831C11.4174 9.84141 11.3926 9.69811 11.33 9.57L10.75 8.41C10.6805 8.27433 10.5719 8.16269 10.4381 8.08957C10.3044 8.01646 10.1517 7.98525 10 8H7V7.81C7.00096 7.71654 7.02758 7.62513 7.07696 7.54577C7.12634 7.46641 7.19658 7.40215 7.28 7.36L7.66 7.17C7.76509 7.11564 7.88169 7.08727 8 7.08727C8.11832 7.08727 8.23491 7.11564 8.34 7.17L9 7.5L9.38 6.8C9.45958 6.65258 9.50084 6.48753 9.5 6.32V5.47C9.50062 5.27316 9.57564 5.08384 9.71 4.94L10.78 3.85C11.5827 4.38684 12.2127 5.14463 12.594 6.03181C12.9753 6.91899 13.0916 7.8976 12.9287 8.84942C12.7658 9.80124 12.3308 10.6855 11.6762 11.3955C11.0217 12.1054 10.1755 12.6106 9.24 12.85V12.83Z"] },
  liPlus: { fill: true, vb: [16, 16], d: ["M14 9H9V14H7V9H2V7H7V2H9V7H14V9Z"] },
  liMsg: { fill: true, d: ["M16 4H8C6.14348 4 4.36301 4.7375 3.05025 6.05025C1.7375 7.36301 1 9.14348 1 11C1 12.8565 1.7375 14.637 3.05025 15.9497C4.36301 17.2625 6.14348 18 8 18H12V22L20.16 16.61C21.0512 15.9738 21.7751 15.1311 22.2697 14.1541C22.7643 13.1772 23.0148 12.0949 23 11C23 9.14348 22.2625 7.36301 20.9497 6.05025C19.637 4.7375 17.8565 4 16 4ZM8 12.25C7.75277 12.25 7.5111 12.1767 7.30554 12.0393C7.09998 11.902 6.93976 11.7068 6.84515 11.4784C6.75054 11.2499 6.72579 10.9986 6.77402 10.7561C6.82225 10.5137 6.9413 10.2909 7.11612 10.1161C7.29093 9.9413 7.51366 9.82225 7.75614 9.77402C7.99861 9.72579 8.24995 9.75054 8.47835 9.84515C8.70676 9.93976 8.90199 10.1 9.03934 10.3055C9.17669 10.5111 9.25 10.7528 9.25 11C9.25 11.3315 9.1183 11.6495 8.88388 11.8839C8.64946 12.1183 8.33152 12.25 8 12.25ZM12 12.25C11.7528 12.25 11.5111 12.1767 11.3055 12.0393C11.1 11.902 10.9398 11.7068 10.8452 11.4784C10.7505 11.2499 10.7258 10.9986 10.774 10.7561C10.8222 10.5137 10.9413 10.2909 11.1161 10.1161C11.2909 9.9413 11.5137 9.82225 11.7561 9.77402C11.9986 9.72579 12.2499 9.75054 12.4784 9.84515C12.7068 9.93976 12.902 10.1 13.0393 10.3055C13.1767 10.5111 13.25 10.7528 13.25 11C13.25 11.3315 13.1183 11.6495 12.8839 11.8839C12.6495 12.1183 12.3315 12.25 12 12.25ZM16 12.25C15.7528 12.25 15.5111 12.1767 15.3055 12.0393C15.1 11.902 14.9398 11.7068 14.8452 11.4784C14.7505 11.2499 14.7258 10.9986 14.774 10.7561C14.8222 10.5137 14.9413 10.2909 15.1161 10.1161C15.2909 9.9413 15.5137 9.82225 15.7561 9.77402C15.9986 9.72579 16.2499 9.75054 16.4784 9.84515C16.7068 9.93976 16.902 10.1 17.0393 10.3055C17.1767 10.5111 17.25 10.7528 17.25 11C17.25 11.3315 17.1183 11.6495 16.8839 11.8839C16.6495 12.1183 16.3315 12.25 16 12.25Z"] },
  liNetwork: { fill: true, d: ["M12 16V22H3V16C3 15.2044 3.31607 14.4413 3.87868 13.8787C4.44129 13.3161 5.20435 13 6 13H9C9.79565 13 10.5587 13.3161 11.1213 13.8787C11.6839 14.4413 12 15.2044 12 16ZM17.5 13C18.1922 13 18.8689 12.7947 19.4445 12.4102C20.0201 12.0256 20.4687 11.4789 20.7336 10.8394C20.9985 10.1999 21.0678 9.49613 20.9328 8.81719C20.7977 8.13826 20.4644 7.51462 19.9749 7.02514C19.4854 6.53565 18.8618 6.20231 18.1828 6.06726C17.5039 5.93221 16.8002 6.00153 16.1606 6.26643C15.5211 6.53134 14.9744 6.97994 14.5899 7.55552C14.2053 8.13109 14 8.80778 14 9.50001C14 10.4283 14.3688 11.3185 15.0251 11.9749C15.6815 12.6313 16.5717 13 17.5 13ZM18.5 15H16.5C15.837 15 15.2011 15.2634 14.7322 15.7322C14.2634 16.2011 14 16.837 14 17.5V22H21V17.5C21 16.837 20.7366 16.2011 20.2678 15.7322C19.7989 15.2634 19.163 15 18.5 15ZM7.5 2.00001C6.60999 2.00001 5.73996 2.26393 4.99994 2.7584C4.25991 3.25286 3.68314 3.95567 3.34254 4.77794C3.00195 5.6002 2.91283 6.505 3.08647 7.37792C3.2601 8.25083 3.68868 9.05265 4.31802 9.68199C4.94736 10.3113 5.74918 10.7399 6.6221 10.9135C7.49501 11.0872 8.39981 10.9981 9.22208 10.6575C10.0443 10.3169 10.7471 9.7401 11.2416 9.00008C11.7361 8.26006 12 7.39003 12 6.50001C12.0013 5.90869 11.8858 5.32294 11.6601 4.77638C11.4345 4.22982 11.103 3.73322 10.6849 3.31509C10.2668 2.89696 9.7702 2.56555 9.22364 2.33987C8.67708 2.11419 8.09132 1.99869 7.5 2.00001Z"] },
  liPost: { fill: true, d: ["M18 3H6C5.20435 3 4.44129 3.31607 3.87868 3.87868C3.31607 4.44129 3 5.20435 3 6V18C3 18.7956 3.31607 19.5587 3.87868 20.1213C4.44129 20.6839 5.20435 21 6 21H18C18.7956 21 19.5587 20.6839 20.1213 20.1213C20.6839 19.5587 21 18.7956 21 18V6C21 5.20435 20.6839 4.44129 20.1213 3.87868C19.5587 3.31607 18.7956 3 18 3ZM13 11H17V13H13V17H11V13H7V11H11V7H13V11Z"] },
  liBell: { fill: true, d: ["M22 19H13.72C13.9002 19.3037 13.9968 19.6496 13.9999 20.0027C14.0031 20.3558 13.9127 20.7034 13.738 21.0102C13.5633 21.3171 13.3104 21.5722 13.0052 21.7496C12.6999 21.9271 12.3531 22.0206 12 22.0206C11.6469 22.0206 11.3001 21.9271 10.9948 21.7496C10.6896 21.5722 10.4367 21.3171 10.262 21.0102C10.0873 20.7034 9.99692 20.3558 10.0001 20.0027C10.0032 19.6496 10.0998 19.3037 10.28 19H2V18C2.04883 16.9493 2.46259 15.9485 3.17 15.17L4.17 14H19.87L20.87 15.17C21.5702 15.9496 21.9707 16.9525 22 18V19ZM18.21 7.44C18.009 5.93505 17.2688 4.55416 16.1267 3.5537C14.9846 2.55323 13.5183 2.00117 12 2C10.4817 2.00117 9.01538 2.55323 7.87331 3.5537C6.73124 4.55416 5.99099 5.93505 5.79 7.44L5 13H19L18.21 7.44Z"] },
  liJobs: { fill: true, d: ["M17 6V5C17 4.20435 16.6839 3.44129 16.1213 2.87868C15.5587 2.31607 14.7956 2 14 2H10C9.20435 2 8.44129 2.31607 7.87868 2.87868C7.31607 3.44129 7 4.20435 7 5V6H2V10C2 10.7956 2.31607 11.5587 2.87868 12.1213C3.44129 12.6839 4.20435 13 5 13H19C19.7956 13 20.5587 12.6839 21.1213 12.1213C21.6839 11.5587 22 10.7956 22 10V6H17ZM9 5C9 4.73478 9.10536 4.48043 9.29289 4.29289C9.48043 4.10536 9.73478 4 10 4H14C14.2652 4 14.5196 4.10536 14.7071 4.29289C14.8946 4.48043 15 4.73478 15 5V6H9V5ZM19 14C19.5695 13.9968 20.1317 13.872 20.6491 13.634C21.1664 13.396 21.627 13.0503 22 12.62V17C22 17.7956 21.6839 18.5587 21.1213 19.1213C20.5587 19.6839 19.7956 20 19 20H5C4.20435 20 3.44129 19.6839 2.87868 19.1213C2.31607 18.5587 2 17.7956 2 17V12.62C2.373 13.0503 2.83358 13.396 3.35095 13.634C3.86831 13.872 4.43053 13.9968 5 14H19Z"] },

  fbHome: { fill: true, rule: "evenodd", d: ["M10.6 3.3a2.2 2.2 0 0 1 2.8 0l6.6 5.4c.6.5.9 1.2.9 2V18a3 3 0 0 1-3 3H6.1a3 3 0 0 1-3-3v-7.3c0-.8.3-1.5.9-2l6.6-5.4Z M10.6 13.5h2.8a.6.6 0 0 1 .6.6v3.8a.6.6 0 0 1-.6.6h-2.8a.6.6 0 0 1-.6-.6v-3.8a.6.6 0 0 1 .6-.6Z"] },
  fbReels: { sw: 1.8, d: ["M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z", "M3 8.5h18", "M8.5 3l2.7 5.5", "M13.5 3l2.7 5.5", "M10.5 12.3l4.2 2.5-4.2 2.5Z"] },
  fbFriends: { sw: 1.8, d: ["M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7Z", "M2.8 20c.5-3.2 3-5.2 6.2-5.2s5.7 2 6.2 5.2", "M16.5 11.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5Z", "M17 14.4c2 .3 3.6 1.8 4.1 3.8"] },
  fbMarket: { sw: 1.8, d: ["M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", "M3 9.5l1.8-4.9a1.5 1.5 0 0 1 1.4-1h11.6a1.5 1.5 0 0 1 1.4 1L21 9.5c0 1.4-1.1 2.5-2.5 2.5S16 10.9 16 9.5c0 1.4-1.1 2.5-2.5 2.5h-3C9.1 12 8 10.9 8 9.5 8 10.9 6.900 12 5.500 12S3 10.900 3 9.500Z", "M9.5 21v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4"] },
  fbBell: { sw: 1.8, d: ["M12 3a6 6 0 0 0-6 6v4.5L4.300 17h15.400L18 13.500V9a6 6 0 0 0-6-6Z", "M9.800 20a2.400 2.400 0 0 0 4.400 0"] },

    thumbsUp: { d: ["M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"] },
  globe: { d: ["M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"] },
};

// Instagram type scale, in iOS points on a 390pt-wide screen. Tune sizes here and all three pages follow.
const IG_FONT = 'Inter, -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif';
const IG_T = {
  title: [16, 700], // Reels / Friends tabs
  name: [14, 600],  // usernames, story caption
  body: [13, 400],  // captions, liked by, placeholders
  bodyB: [13, 600], // Follow buttons
  count: [13, 500], // like / comment / share counts
  rail: [13, 600],  // Reels side-rail counts
  meta: [12, 400],  // subtitles, timestamps
  song: [11, 400],  // Post audio line
};

const IG_AVATAR = 32; // avatar diameter in pt, used by Post, Reels and Stories
 const IG_POST_STATUS_H = 12; // space above the Post header for the status bar, in u (1u = 1% of screen width)
const IG_REELS_TOP_Y = 20; // Reels top nav center, in u. Sits below the dynamic island / notch on every device.

// Default "Liked by" photo. Swap for a file path if you'd rather use a real image.
const IG_LIKER_DEFAULT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#E4C9D6"/><circle cx="32" cy="25" r="11" fill="#FFFFFF" fill-opacity="0.9"/><path d="M10 64c0-14 10-23 22-23s22 9 22 23z" fill="#FFFFFF" fill-opacity="0.9"/></svg>`
  );

let igMeasureCtx;
const igTextW = (str, size, weight, font = IG_FONT) => {
  igMeasureCtx ??= document.createElement("canvas").getContext("2d");
  igMeasureCtx.font = `${weight} ${size}px ${font}`;
  return igMeasureCtx.measureText(str ?? "").width;
};

// Instagram overlay (Post / Reels / Stories). Coordinates come from 390pt-wide iPhone screenshots, so 100u = screen width.
function instagramOps(s, w, h) {
  s = { ...socialDefaults("instagram", s.mode), ...s };
  const u = Math.min(w, h * 0.5625) / 100;
  const pt = (n) => (n * u * 100) / 390; // iOS points -> frame px
  const M = pt(12); // side margin
  const mode = modeOf("instagram", s.mode).value;
  const dark = mode !== "post" || s.theme === "dark";
  const bg = dark ? "#0B0F14" : "#FFFFFF";
  const fg = dark ? "#F5F5F5" : "#262626";
  const sub = dark ? "#A8A8A8" : "#737373";
  const white = "#FFFFFF";
  const hair = Math.max(1, 0.15 * u);
  const initial = ((s.name ?? "").replace(/^@/, "").trim()[0] || "?").toUpperCase();
  const ops = [];

  const type = (k) => (typeof k === "string" ? { size: pt(IG_T[k][0]), weight: IG_T[k][1] } : k);
  const tw = (str, k, weight) => {
    const f = type(k);
    return igTextW(str, f.size, weight ?? f.weight);
  };

  const rect = (x, y, rw, rh, fill, r = 0, stroke, sw) => ops.push({ t: "rect", x, y, w: rw, h: rh, fill, r, stroke, sw });
  const grad = (x, y, gw, gh, from, to) => ops.push({ t: "vgrad", x, y, w: gw, h: gh, from, to });
  const dot = (cx, cy, r, fill) => ops.push({ t: "circle", cx, cy, r, fill });
  const dotG = (cx, cy, r, colors) => ops.push({ t: "circle", cx, cy, r, grad: colors });
  const icon = (name, cx, cy, size, color) => ops.push({ t: "icon", name, cx, cy, size, color });
  const text = (str, x, y, k, color, o = {}) => {
    const f = type(k);
    ops.push({ t: "text", text: str ?? "", x, y, s: f.size, color, weight: o.weight ?? f.weight, align: o.align ?? "left", maxW: o.maxW, font: IG_FONT });
  };
  const rich = (runs, x, y, k, color, maxW) =>
    ops.push({ t: "text", runs, text: "", x, y, s: type(k).size, color, weight: 400, align: "left", maxW, font: IG_FONT });
  const AV_R = pt(IG_AVATAR) / 2;
  const avatar = (cx, cy) => {
    if (s.avatar) {
      ops.push({ t: "image", src: s.avatar, cx, cy, r: AV_R });
      return;
    }
    dot(cx, cy, AV_R, "#B8B8BE");
    text(initial, cx, cy, { size: AV_R * 0.9, weight: 700 }, "#3A3A3C", { align: "center" });
  };
  const liker = (cx, cy, r) => ops.push({ t: "image", src: IG_LIKER_DEFAULT, cx, cy, r });
  if (mode === "story") {
    rect(0, 0, w, 14 * u, "#0B0F14");
    rect(0, h - 25.6 * u, w, 25.6 * u, "#0B0F14");
    grad(0, 14 * u, w, 18 * u, "rgba(0,0,0,0.35)", "rgba(0,0,0,0)");
    const segs = 4, gap = 0.4 * u, by = 16 * u, bh = Math.max(1, 0.35 * u);
    const sw = (w - 3.8 * u - gap * (segs - 1)) / segs;
    for (let i = 0; i < segs; i++) {
      const x = 1.9 * u + i * (sw + gap);
      rect(x, by, sw, bh, "rgba(255,255,255,0.35)", bh / 2);
      if (i === 0) rect(x, by, sw * 0.4, bh, white, bh / 2);
    }
    const hy = 21.8 * u, ax = M + AV_R, nx = ax + AV_R + pt(10);
    avatar(ax, hy);
    text(s.name, nx, hy, "name", white, { maxW: 35 * u });
    text(s.extra, nx + Math.min(tw(s.name, "name"), 35 * u) + pt(8), hy, "meta", "rgba(255,255,255,0.75)", { maxW: 14 * u });
    icon("dots", w - 13.7 * u, hy, 5.5 * u, white);
    icon("close", w - 4.6 * u, hy, 5.6 * u, white);
    const ry = h - 14.7 * u;
    rect(3.6 * u, ry - 4.85 * u, w - 26.4 * u, 9.7 * u, null, 4.85 * u, "rgba(255,255,255,0.6)", hair);
    text("Send message...", 8.4 * u, ry, "body", "rgba(255,255,255,0.9)");
    icon("heart", w - 16 * u, ry, 6.2 * u, white); // anchored to the right edge
    icon("send", w - 6.4 * u, ry, 6.2 * u, white);
    return ops;
  }

  if (mode === "reels") {
    grad(0, 0, w, (IG_REELS_TOP_Y + 13) * u, "rgba(0,0,0,0.4)", "rgba(0,0,0,0)");
    grad(0, h - 64 * u, w, 45 * u, "rgba(0,0,0,0)", "rgba(0,0,0,0.55)");
    const topY = IG_REELS_TOP_Y * u;
    icon("back", 8.4 * u, topY, 6 * u, white);
    const wR = tw("Reels", "title"), wF = tw("Friends", "title"), tabGap = pt(20);
    const x0 = w / 2 - (wR + tabGap + wF) / 2; // tabs centered on the frame
    text("Reels", x0, topY, "title", white);
    text("Friends", x0 + wR + tabGap, topY, "title", "rgba(255,255,255,0.65)");
    icon("sliders", w - 19.3 * u, topY, 6 * u, white); // anchored to the right edge
    icon("search", w - 7.5 * u, topY, 6 * u, white);

    const rx = w - 7 * u;
    [["heart", s.extra, 105.4, 98.8], ["comment", s.comments, 89.9, 83.5], ["repost", s.reposts, 74.1, 66.9], ["send", s.shares, 57.8, 51.5], ["bookmark", s.saves, 41.8, 35.8]].forEach(
      ([ic, n, iy, ny]) => {
        icon(ic, rx, h - iy * u, 6.3 * u, white);
        text(n, rx, h - ny * u, "rail", white, { align: "center" });
      }
    );
    icon("menuV", rx, h - 26.8 * u, 5.5 * u, white);

    const ay = h - 41.7 * u, tx = M + AV_R * 2 + pt(10);
    avatar(M + AV_R, ay);
    text(s.name, tx, h - 44.05 * u, "name", white, { maxW: 28 * u });
    const reelAudio = [s.artist, s.song].filter(Boolean).join(" · ");
    if (reelAudio) {
      icon("music", tx + pt(5), h - 39.65 * u, pt(14), "rgba(255,255,255,0.8)");
      text(reelAudio, tx + pt(12), h - 39.65 * u, "meta", "rgba(255,255,255,0.8)", { maxW: w - tx - 18 * u - pt(12) });
    }
    text(s.caption, 3.7 * u, h - 32.5 * u, "body", white, { maxW: w - 18 * u });
    liker(5.6 * u, h - 25.4 * u, 2 * u);
    rich([["Liked by ", 400], [s.likedBy, 600], [" and ", 400], [s.likedOthers, 600]], 9.1 * u, h - 25.4 * u, "body", white, w - 30 * u);

    rect(0, h - 19.2 * u, w, hair * 2.4, "rgba(255,255,255,0.3)");
    rect(0, h - 19.2 * u, w * 0.84, hair * 2.4, white);
    rect(0, h - 18.9 * u, w, 18.9 * u, "#0B0F14");
    rect(3.6 * u, h - 11.7 * u - 5.25 * u, w - 6.8 * u, 10.5 * u, "#1B2026", 5.25 * u);
    text("Add comment...", 8.3 * u, h - 11.7 * u, "body", "rgba(255,255,255,0.9)");
    return ops;
  }

  // ----- Post -----
  const SB = IG_POST_STATUS_H * u; // status bar area, header hangs below it
  rect(0, 0, w, SB + 12 * u, bg);
  avatar(M + AV_R, SB + 6 * u);
  const hx = M + AV_R * 2 + pt(10);
  const headMax = w - 10.1 * u - hx - pt(8); // room up to the menu icon
  text(s.name, hx, SB + 3.9 * u, "name", fg, { maxW: headMax });
  const audio = [s.artist, s.song].filter(Boolean).join(" · ");
  if (audio) {
    icon("music", hx + pt(5), SB + 8.3 * u, pt(16), sub);
    text(audio, hx + pt(12), SB + 8.3 * u, "song", sub, { maxW: headMax - pt(12) });
  }
  icon("menu", w - 5 * u, SB + 6 * u, 5.5 * u, fg);

  rect(0, h - 50 * u, w, 50 * u, bg);
  [0, 1, 2].forEach((i) => dot(w / 2 + (i - 1) * 2.3 * u, h - 47 * u, 0.6 * u, i === 0 ? "#5B6BFF" : dark ? "#4A4D52" : "#C7C7CC"));

  // Action row: spacing comes from measured text width, not a per-character guess.
  const cy = h - 41 * u, ICO = 6.2 * u;
  const halfW = (ic) => (ICONS[ic].vb ? ICONS[ic].vb[0] / 2 : 10) * (ICO / 24);
  let x = M;
  [["heart", s.extra], ["comment", s.comments], ["repost", s.reposts], ["send", s.shares]].forEach(([ic, n]) => {
    const hx = halfW(ic);
    icon(ic, x + hx, cy, ICO, fg);
    x += hx * 2 + pt(6); // icon -> count
    text(n, x, cy, "count", fg);
    x += tw(n, "count") + pt(16); // count -> next icon
  });
  icon("bookmark", w - M - ICO * (8 / 24), cy, ICO, fg);

  const lr = pt(9);
  liker(M + lr, h - 33.4 * u, lr);
  rich([["Liked by ", 400], [s.likedBy, 600], [" and ", 400], [s.likedOthers, 600]], M + lr * 2 + pt(6), h - 33.4 * u, "body", fg, w - 12 * u);
  const cap = s.caption ?? "";
  const long = cap.length > 34;
  rich(
    [[s.name ?? "", 600], [" " + (long ? cap.slice(0, 34) + "…" : cap), 400], ...(long ? [[" more", 400, sub]] : [])],
    M, h - 28.6 * u, "body", fg, w - 6 * u
  );
  text(s.time, M, h - 24.3 * u, "meta", sub);

  // floating nav pill: fixed 100u-wide layout, centered on the frame
  const navX = (w - 100 * u) / 2;
  rect(navX + 5.2 * u, h - 18.2 * u, 89.6 * u, 12.6 * u, dark ? "#171B20" : "#FFFFFF", 6.3 * u, dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)", hair);
  rect(navX + 6.3 * u, h - 17.2 * u, 19 * u, 10.6 * u, dark ? "#3B3F45" : "#EDEDED", 5.3 * u);
  const ny = h - 11.9 * u;
  icon("home", navX + 15.9 * u, ny, 6 * u, fg);
  icon("reels", navX + 32.9 * u, ny, 6 * u, fg);
  icon("send", navX + 50 * u, ny, 6 * u, fg);
  icon("search", navX + 67.1 * u, ny, 6 * u, fg);
  if (s.avatar) {
    ops.push({ t: "image", src: s.avatar, cx: navX + 84.1 * u, cy: ny, r: 3.3 * u });
  } else {
    dot(navX + 84.1 * u, ny, 3.3 * u, "#B8B8BE");
    text(initial, navX + 84.1 * u, ny, { size: 3 * u, weight: 700 }, "#3A3A3C", { align: "center" });
  }
  dot(navX + 52.7 * u, ny + 1.7 * u, 0.65 * u, "#FF3040");
  dot(navX + 86.6 * u, ny + 1.9 * u, 0.65 * u, "#FF3040");
  return ops;
}

// WhatsApp Status type scale, in iOS points on a 390pt-wide screen.
const WA_T = {
  name: [13, 600],
  time: [12, 400],
  caption: [17, 400],
  reply: [15, 400],
};

// Asks the device for its system font (SF Pro on Apple devices), then falls back to Inter.
const WA_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, "Helvetica Neue", Arial, sans-serif';

const WA_EMOJI = ["1f60d", "1f602", "1f62e"].map((c) => `${import.meta.env.BASE_URL}emoji/${c}.png`);

// Splits text into lines that fit maxW, measured the same way as the Instagram overlay.
function igWrap(str, size, weight, maxW, font) {
  const lines = [];
  let line = "";
  (str ?? "").split(/\s+/).filter(Boolean).forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && igTextW(next, size, weight, font) > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

function whatsappOps(s, w, h) {
  s = { ...socialDefaults("whatsapp", s.mode), ...s };
  const u = Math.min(w, h * 0.5625) / 100;
  const pt = (n) => (n * u * 100) / 390;
  const white = "#FFFFFF";
  const glass = "rgba(255,255,255,0.2)";
  const initial = ((s.name ?? "").trim()[0] || "?").toUpperCase();
  const ops = [];

  const rect = (x, y, rw, rh, fill, r = 0) => ops.push({ t: "rect", x, y, w: rw, h: rh, fill, r });
  const grad = (x, y, gw, gh, from, to) => ops.push({ t: "vgrad", x, y, w: gw, h: gh, from, to });
  const dot = (cx, cy, r, fill) => ops.push({ t: "circle", cx, cy, r, fill });
  const icon = (name, cx, cy, size, color) => ops.push({ t: "icon", name, cx, cy, size, color });
  const text = (str, x, y, k, color, o = {}) => {
    const [size, weight] = typeof k === "string" ? [pt(WA_T[k][0]), WA_T[k][1]] : [k.size, k.weight];
    ops.push({ t: "text", text: str ?? "", x, y, s: size, color, weight, align: o.align ?? "left", maxW: o.maxW, font: WA_FONT });
  };

  // fades behind the header and the caption / reply area
  grad(0, 0, w, 34 * u, "rgba(0,0,0,0.5)", "rgba(0,0,0,0)");
  grad(0, h - 50 * u, w, 50 * u, "rgba(0,0,0,0)", "rgba(0,0,0,0.6)");

  // progress bar (one status, about 60% played)
  const pbH = Math.max(1, 0.85 * u), pbY = 16.3 * u - pbH / 2, pbX = 1.85 * u, pbW = w - 3.7 * u;
  rect(pbX, pbY, pbW, pbH, "rgba(255,255,255,0.4)", pbH / 2);
  rect(pbX, pbY, pbW * 0.6, pbH, white, pbH / 2);

  // header
  const hy = 23.2 * u, ax = 12.7 * u, ar = pt(16), nx = 19.6 * u;
  icon("back", 4.2 * u, hy, 6.3 * u, white);
  if (s.avatar) {
    ops.push({ t: "image", src: s.avatar, cx: ax, cy: hy, r: ar });
  } else {
    dot(ax, hy, ar, "#B8B8BE");
    text(initial, ax, hy, { size: ar * 0.9, weight: 700 }, "#3A3A3C", { align: "center" });
  }
  text(s.name, nx, 21.4 * u, "name", white, { maxW: 68 * u });
  text(s.extra, nx, 25.2 * u, "time", "rgba(255,255,255,0.9)", { maxW: 68 * u });
  icon("moreCircle", w - 4.7 * u, hy, 5.8 * u, white);

  // caption, bottom-anchored so a second line grows upward
  const capSize = pt(WA_T.caption[0]);
  const lines = igWrap(s.caption, capSize, WA_T.caption[1], w - 7.4 * u, WA_FONT).slice(0, 4);
  lines.forEach((ln, i) =>
    text(ln, w / 2, h - 29 * u - (lines.length - 1 - i) * capSize * 1.25, "caption", white, { align: "center" })
  );

  // divider + reply row
  rect(1.85 * u, h - 23.1 * u, w - 3.7 * u, Math.max(1, 0.25 * u), "rgba(255,255,255,0.45)");
  const cy = h - 15 * u;
  rect(3.6 * u, cy - 4.45 * u, 82.7 * u, 8.9 * u, glass, 4.45 * u);
  text("Reply", 6.7 * u, cy, "reply", "rgba(255,255,255,0.8)");
  WA_EMOJI.forEach((src, i) => ops.push({ t: "image", src, cx: (66.1 + i * 7.7) * u, cy, r: pt(10), sq: true }));
  dot(w - 7.3 * u, cy, 4.5 * u, glass);
  icon("heart", w - 7.3 * u, cy, 5.5 * u, white);

  return ops;
}

const TT_FONT = '"TikTok Sans", -apple-system, "SF Pro Text", Inter, "Helvetica Neue", sans-serif';
// Type scale in iOS points on a 390pt-wide screen.
const TT_T = {
  tab: [15, 500],
  tabOn: [15, 700],
  name: [15, 700],
  body: [14, 400],
  sound: [14, 500],
};
const TT_RED = "#FE2C55";
const TT_DESIGN_W = 414; // the Figma frame the rail / nav CSS was exported from
const TT_RAIL = { right: 9, bottom: 100 };

// Default sound cover, used when neither a sound avatar nor a profile picture is uploaded.
const TT_SOUND_DEFAULT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="98" height="98" viewBox="0 0 98 98"><rect width="98" height="98" fill="#2B2B2E"/><circle cx="49" cy="49" r="28" fill="#3A3A3E"/><circle cx="49" cy="49" r="6" fill="#151515"/></svg>`
  );

function tiktokOps(s, w, h) {
  s = { ...socialDefaults("tiktok", s.mode), ...s };
  const u = Math.min(w, h * 0.5625) / 100;
  const pt = (n) => (n * u * 100) / 390;         // screenshot measurements
  const d = (n) => (n * u * 100) / TT_DESIGN_W;  // Figma CSS measurements
  const white = "#FFFFFF";
  const white90 = "rgba(255,255,255,0.9)";
  const dim = "rgba(255,255,255,0.6)";
  const initial = ((s.name ?? "").replace(/^@/, "").trim()[0] || "?").toUpperCase();
  const ops = [];

  const type = (k) => (typeof k === "string" ? { size: pt(TT_T[k][0]), weight: TT_T[k][1] } : k);
  const tw = (str, k) => {
    const f = type(k);
    return igTextW(str, f.size, f.weight, TT_FONT);
  };
  const rect = (x, y, rw, rh, fill, r = 0) => ops.push({ t: "rect", x, y, w: rw, h: rh, fill, r });
  const grad = (x, y, gw, gh, from, to) => ops.push({ t: "vgrad", x, y, w: gw, h: gh, from, to });
  const dot = (cx, cy, r, fill) => ops.push({ t: "circle", cx, cy, r, fill });
  // Icons render at their exported size: 1 viewBox unit = 1 design pt.
  const ic = (name, cx, cy, color, scale = 1) => ops.push({ t: "icon", name, cx, cy, size: d(24 * scale), color });
  const text = (str, x, y, k, color, o = {}) => {
    const f = type(k);
    ops.push({ t: "text", text: str ?? "", x, y, s: f.size, color, weight: o.weight ?? f.weight, align: o.align ?? "left", maxW: o.maxW, font: TT_FONT });
  };

  // ----- layout anchors -----
  const navH = d(87);
  const navTop = h - navH;
  const colCx = (i) => (w * (2 * i + 1)) / 10; // 5 equal columns across the full width

  // fades behind the top tabs and the caption / nav
  grad(0, 0, w, pt(130), "rgba(0,0,0,0.3)", "rgba(0,0,0,0)");
  grad(0, navTop - pt(164), w, pt(164), "rgba(0,0,0,0)", "rgba(0,0,0,0.35)");

  // ----- top tabs: measured widths + fixed gap, group centered on the screen -----
  const ty = pt(74);
  ic("tkLive", pt(26), ty, white, 0.9);
  ic("tkSearch", w - pt(26), ty, white, 0.9);
  const tabs = [["STEM", "tab"], ["Community", "tab"], ["Following", "tab"], ["For You", "tabOn"]];
  const widths = tabs.map(([l, k]) => tw(l, k));
  const gap = pt(18);
  let tx = w / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (tabs.length - 1)) / 2;
  tabs.forEach(([l, k], i) => {
    text(l, tx, ty, k, k === "tabOn" ? white : dim);
    if (k === "tabOn") rect(tx + widths[i] / 2 - pt(10), ty + pt(15), pt(20), pt(2), white, pt(1));
    tx += widths[i] + gap;
  });

  // ----- right rail: 49 x 403 column, right 9 / bottom 100 -----
  const railL = w - d(TT_RAIL.right + 49);
  const railT = h - d(TT_RAIL.bottom + 403);
  const colX = railL + d(24.5);

  // profile picture: 47 x 47 at (0, 0) of the rail, 1.2pt white border drawn inside
  const PFP = 47, PFP_BORDER = 1.2;
  const avCx = railL + d(PFP / 2), avCy = railT + d(PFP / 2);
  dot(avCx, avCy, d(PFP / 2), white);
  if (s.avatar) {
    ops.push({ t: "image", src: s.avatar, cx: avCx, cy: avCy, r: d(PFP / 2 - PFP_BORDER) });
  } else {
    dot(avCx, avCy, d(PFP / 2 - PFP_BORDER), "#B8B8BE");
    text(initial, avCx, avCy, { size: d(PFP / 2 - PFP_BORDER) * 0.9, weight: 700 }, "#3A3A3C", { align: "center" });
  }
  const fbX = railL + d(24), fbY = railT + d(49);
  dot(fbX, fbY, d(11), TT_RED);
  ic("tkPlus", fbX, fbY, white);

  // 49pt items (34 icon + 15 label), 20pt gap, first one 78pt below the top
  [["tkHeart", s.extra], ["tkComment", s.comments], ["tkBookmark", s.saves], ["tkShare", s.shares]].forEach(([name, n], i) => {
    const top = railT + d(78 + i * 69);
    ic(name, colX, top + d(17), white90);
    text(n, colX, top + d(41.5), { size: d(13), weight: 500 }, white, { align: "center" });
  });

  // music disc: 49pt, 29pt cover
  // sound avatar: 49 x 49 image, no vinyl ring. Falls back to the profile picture, then a default cover.
  const dcY = railT + d(354 + 24.5);
  ops.push({ t: "image", src: s.soundAvatar || s.avatar || TT_SOUND_DEFAULT, cx: colX, cy: dcY, r: d(24.5) });

  // ----- bottom info: rows 21-22pt apart, sound row clears the progress bar -----
  const lx = pt(10.5);
  const infoMax = railL - lx - pt(10);
  text(s.name, lx, navTop - pt(60), "name", white, { maxW: infoMax });
  text(s.caption, lx, navTop - pt(39), "body", white, { maxW: infoMax });
  ic("tkMusic", pt(16), navTop - pt(17), white90, 0.55);
  text(s.sound, pt(27), navTop - pt(17), "sound", white, { maxW: Math.min(pt(178), infoMax - pt(16)) });

  // progress bar: thin line 3pt above the nav
  const py = navTop - pt(3), trackW = w - pt(21), played = trackW * 0.05;
  rect(lx, py - pt(0.75), trackW, pt(1.5), "rgba(255,255,255,0.35)", pt(0.75));
  rect(lx, py - pt(0.75), played, pt(1.5), white, pt(0.75));
  dot(lx + played, py, pt(2.6), white);

  // ----- navigation bar: 87pt tall, black, 0.5pt #333 top border -----
  rect(0, navTop, w, navH, "#000000");
  rect(0, navTop, w, Math.max(1, d(0.5)), "#333333");

  // icon box 25pt (exports are 20pt, so 1.25x); label 10pt/500, 13pt line
  [["tkHome", "Home", 0, white], ["tkFriends", "Friends", 1, dim], ["tkInbox", "Inbox", 3, dim], ["tkProfile", "Profile", 4, dim]].forEach(
    ([name, label, col, color]) => {
      ic(name, colCx(col), navTop + d(20.5), color, 1.25);
      text(label, colCx(col), navTop + d(40.5), { size: d(10), weight: 500 }, color, { align: "center" });
    }
  );

  // badges: 17pt pill, radius 9, 14pt/500 text with 4pt side padding
  const badge = (str, cx, cy) => {
    if (!str) return;
    const f = { size: d(14), weight: 500 };
    const bw = Math.max(d(17), igTextW(str, f.size, f.weight, TT_FONT) + d(8));
    rect(cx - bw / 2, cy - d(8.5), bw, d(17), TT_RED, d(9));
    text(str, cx, cy, f, white, { align: "center" });
  };
  badge(s.friendsBadge, colCx(1) + d(14.1), navTop + d(12));
  badge(s.inboxBadge, colCx(3) + d(14.1), navTop + d(12));

  // create button: 46.25 x 31.25, from the CSS insets
  const ox = colCx(2) + d(0.12) - d(23.125), oy = navTop + d(23.62) - d(15.625);
  const cb = (x, y, rw, rh, fill, r) => rect(ox + d(x), oy + d(y), d(rw), d(rh), fill, d(r));
  cb(8.066, 0.5375, 38.184, 30.175, "#FA2D6C", 13.9);
  cb(0, 0.5375, 38.184, 30.175, "#20D5EC", 13.9);
  cb(3.765, 0.5375, 38.72, 30.175, white, 8.6);
  cb(15.86, 14.545, 13.99, 2.69, "#161823", 0.7); // plus, horizontal bar
  cb(21.515, 8.89, 2.69, 13.99, "#161823", 0.7);  // plus, vertical bar

  return ops;
}

// TikTok Stories type scale, in iOS points on a 390pt-wide screen.
const TTS_T = { name: [15, 600], meta: [15, 400], reply: [16, 400] };
const TTS_H = 847;   // screen height in pt (390 x 847)
const TTS_TOP = 55;  // black cover over the status bar, in pt. Set to 0 if your screenshots keep theirs.

function tiktokStoryOps(s, w, h) {
  s = { ...socialDefaults("tiktok", "story"), ...s };
  const u = Math.min(w, h * 0.5625) / 100;
  const pt = (n) => (n * u * 100) / 390;
  const by = (y) => h - pt(TTS_H - y); // y from the top of the 390x847 screen, anchored to the bottom
  const white = "#FFFFFF";
  const initial = ((s.name ?? "").replace(/^@/, "").trim()[0] || "?").toUpperCase();
  const ops = [];

  const type = (k) => (typeof k === "string" ? { size: pt(TTS_T[k][0]), weight: TTS_T[k][1] } : k);
  const tw = (str, k) => {
    const f = type(k);
    return igTextW(str, f.size, f.weight, TT_FONT);
  };
  const rect = (x, y, rw, rh, fill, r = 0) => ops.push({ t: "rect", x, y, w: rw, h: rh, fill, r });
  const grad = (x, y, gw, gh, from, to) => ops.push({ t: "vgrad", x, y, w: gw, h: gh, from, to });
  const dot = (cx, cy, r, fill) => ops.push({ t: "circle", cx, cy, r, fill });
  // `box` = the icon's on-screen width in pt, whatever its viewBox is.
  const icon = (name, cx, cy, box, color) =>
    ops.push({ t: "icon", name, cx, cy, size: (pt(box) * 24) / (ICONS[name].vb?.[0] ?? 24), color });
  const text = (str, x, y, k, color, o = {}) => {
    const f = type(k);
    ops.push({ t: "text", text: str ?? "", x, y, s: f.size, color, weight: o.weight ?? f.weight, align: o.align ?? "left", maxW: o.maxW, font: TT_FONT });
  };

  const M = pt(10.5); // side margin

  // black bars: over the status bar, and behind the reply row (with a hairline divider)
  if (TTS_TOP > 0) rect(0, 0, w, pt(TTS_TOP), "#000000");
  rect(0, by(760), w, pt(87), "#000000");
  rect(0, by(760), w, Math.max(1, pt(0.5)), "#262626");
  grad(0, pt(TTS_TOP), w, pt(60), "rgba(0,0,0,0.35)", "rgba(0,0,0,0)");

  // progress bar: one story, about 11% played
  const pbH = pt(3), pbY = pt(61.8) - pbH / 2, pbW = w - M * 2;
  rect(M, pbY, pbW, pbH, "rgba(255,255,255,0.4)", pbH / 2);
  rect(M, pbY, pbW * 0.11, pbH, white, pbH / 2);

  // header: 29pt avatar, name + "· time", close icon
  const hy = pt(88.8), AV = pt(29), ar = AV / 2, nx = M + AV + pt(7);
  if (s.avatar) {
    ops.push({ t: "image", src: s.avatar, cx: M + ar, cy: hy, r: ar });
  } else {
    dot(M + ar, hy, ar, "#B8B8BE");
    text(initial, M + ar, hy, { size: ar * 0.9, weight: 700 }, "#3A3A3C", { align: "center" });
  }
  const nameW = Math.min(tw(s.name, "name"), pt(175));
  text(s.name, nx, hy, "name", white, { maxW: nameW });
  if (s.extra) text(`· ${s.extra}`, nx + nameW + pt(6), hy, "meta", "rgba(255,255,255,0.6)", { maxW: w - (nx + nameW + pt(6)) - pt(46) });
  icon("stClose", w - pt(25), hy, 18, white);

  // reply row: 42pt pill, two emoji, like + share
  const ry = by(793.8);
  const pillW = w - M - pt(96); // fills the space left of the heart and share icons
  const pillR = M + pillW;      // right end of the pill
  rect(M, ry - pt(21), pillW, pt(42), "#333333", pt(21));
  text("Message...", pt(29.6), ry, "reply", "rgba(255,255,255,0.55)");
  ops.push({ t: "image", src: WA_EMOJI[0], cx: pillR - pt(57.3), cy: ry, r: pt(11), sq: true }); // pinned to the pill's right end
  ops.push({ t: "image", src: WA_EMOJI[1], cx: pillR - pt(20.1), cy: ry, r: pt(11), sq: true });
  icon("stHeart", w - pt(65.4), by(793.2), 24, white);  // anchored to the right edge
  icon("stShare", w - pt(27), by(793.2), 24, white);

  return ops;
}

const LI_FONT = WA_FONT;
// Type scale in iOS points, measured from a 440pt-wide screenshot (iPhone 16 Pro Max). [size, weight]
const LI_T = {
  tab: [15, 600], name: [15, 600], degree: [11, 400], headline: [11.25, 400], time: [11, 400],
  follow: [12.5, 600], body: [13.25, 400], count: [13.25, 400], search: [13.25, 400],
  action: [12.25, 600], nav: [12.5, 400], navOn: [12.5, 500], next: [13.5, 600], badge: [13, 600],
};
// Nominal icon box sizes in pt. Retune these once the real SVGs are in.
const LI_ICON = { search: 18, msg: 26, plus: 20, globe: 17, action: 19, nav: 24, react: 8 };
const LI_DARK = {
  bar: "#1D2226", bg: "#1C1E23", text: "rgba(255,255,255,0.9)", sub: "rgba(255,255,255,0.6)", sub2: "rgba(255,255,255,0.65)",
  icon: "rgba(255,255,255,0.75)", link: "#70B7FA", hair: "#77787B", div: "#383A3E", border: "#777A7D",
  badge: "#FC94A3", badgeText: "#1D2226", active: "rgba(255,255,255,0.9)",
};
const LI_LIGHT = {
  bar: "#FFFFFF", bg: "#FFFFFF", text: "rgba(0,0,0,0.9)", sub: "rgba(0,0,0,0.6)", sub2: "rgba(0,0,0,0.6)",
  icon: "rgba(0,0,0,0.6)", link: "#0A66C2", hair: "rgba(0,0,0,0.15)", div: "rgba(0,0,0,0.08)", border: "rgba(0,0,0,0.6)",
  badge: "#CC1016", badgeText: "#FFFFFF", active: "rgba(0,0,0,0.9)",
};
const LI_LOVE_BADGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15Z" fill="#DF704D"/><path fill-rule="evenodd" clip-rule="evenodd" d="M7.70902 4.99954C7.20511 4.54226 6.54408 4.29721 5.86386 4.31553C5.18364 4.33385 4.53676 4.61411 4.05818 5.09785C3.5796 5.58159 3.30629 6.23143 3.29527 6.91181C3.28425 7.5922 3.53637 8.25055 3.99902 8.74954L7.99902 12.7495L11.999 8.74954C12.2466 8.5041 12.4432 8.21203 12.5773 7.89021C12.7115 7.5684 12.7805 7.22319 12.7805 6.87454C12.7805 6.52588 12.7115 6.18068 12.5773 5.85886C12.4432 5.53704 12.2466 5.24498 11.999 4.99954C11.7566 4.75565 11.4683 4.56207 11.1509 4.42992C10.8334 4.29778 10.4929 4.22968 10.149 4.22954C9.80481 4.22745 9.46368 4.29453 9.14589 4.42681C8.82809 4.55908 8.54011 4.75384 8.29903 4.99954L7.99902 5.29954L7.70902 4.99954Z" fill="#FFF3F0" stroke="#77280C"/><path d="M7.71064 4.99973C7.46863 4.75331 7.17995 4.55757 6.86145 4.42396C6.54296 4.29035 6.20103 4.22153 5.85564 4.22153C5.51026 4.22153 5.16833 4.29035 4.84983 4.42396C4.53134 4.55757 4.24266 4.75331 4.00064 4.99973C3.52043 5.49585 3.25195 6.15926 3.25195 6.84973C3.25195 7.54019 3.52043 8.2036 4.00064 8.69973L8.00064 12.6997L12.0006 8.69973C12.4809 8.2036 12.7493 7.54019 12.7493 6.84973C12.7493 6.15926 12.4809 5.49585 12.0006 4.99973C11.7601 4.75268 11.4724 4.55636 11.1546 4.42239C10.8369 4.28842 10.4955 4.21951 10.1506 4.21973C9.8058 4.21951 9.46441 4.28842 9.14666 4.42239C8.82891 4.55636 8.54123 4.75268 8.30064 4.99973L8.00064 5.24973L7.71064 4.99973Z" stroke="#77280C" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  );

  const liBadge = (svg) => "data:image/svg+xml;utf8," + encodeURIComponent(svg);

const LI_LIKE_BADGE = liBadge(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15Z" fill="#378FE9"/><path fill-rule="evenodd" clip-rule="evenodd" d="M11.93 7.25012H11.38C11.33 7.25012 11.23 7.06012 10.98 6.79012C10.61 6.39012 10.2 5.88012 9.91002 5.60012C9.18946 4.97656 8.6012 4.21489 8.18002 3.36012C7.94002 2.85012 7.92002 2.62012 7.43002 2.62012C7.23747 2.64731 7.06202 2.74546 6.93807 2.8953C6.81413 3.04514 6.75063 3.23588 6.76002 3.43012C6.76002 3.57012 6.83002 4.06012 6.86002 4.23012C7.0729 5.01245 7.41057 5.75532 7.86002 6.43012H4.12002C3.99819 6.42925 3.87752 6.45369 3.76563 6.50189C3.65374 6.55009 3.55308 6.621 3.47002 6.71012C3.38655 6.79717 3.3228 6.90117 3.28311 7.01506C3.24343 7.12895 3.22873 7.25004 3.24002 7.37012C3.25543 7.60441 3.36081 7.82368 3.53413 7.98209C3.70744 8.1405 3.93528 8.22578 4.17002 8.22012H4.33002C4.12294 8.22775 3.92644 8.3135 3.78002 8.46012C3.64238 8.60591 3.56704 8.79964 3.57002 9.00012C3.57175 9.20162 3.64853 9.39524 3.78537 9.54317C3.9222 9.6911 4.10926 9.78271 4.31002 9.80012C4.18782 9.89361 4.09517 10.0204 4.04318 10.1652C3.99118 10.31 3.98206 10.4667 4.01688 10.6166C4.05171 10.7665 4.12902 10.9031 4.23954 11.0101C4.35006 11.1172 4.48911 11.1901 4.64002 11.2201C4.54145 11.3854 4.50929 11.582 4.55002 11.7701C4.60275 11.954 4.71459 12.1153 4.86824 12.2292C5.02189 12.3431 5.20879 12.4031 5.40002 12.4001H7.69002C7.98999 12.3987 8.28873 12.3618 8.58002 12.2901L10 11.8901H11.9C12.92 11.8501 13.19 7.25012 11.93 7.25012Z" fill="#D0E8FF"/><path d="M7.43088 6.43004H4.11088C3.98449 6.42886 3.85933 6.45492 3.74391 6.50645C3.62849 6.55797 3.52553 6.63376 3.44203 6.72865C3.35853 6.82354 3.29645 6.9353 3.26001 7.05633C3.22358 7.17736 3.21364 7.30482 3.23088 7.43004C3.25107 7.66165 3.35821 7.87704 3.53074 8.03287C3.70328 8.18871 3.92841 8.27345 4.16088 8.27004H4.32088C4.11381 8.27767 3.91731 8.36342 3.77088 8.51004C3.7003 8.58466 3.64535 8.67264 3.60929 8.76882C3.57322 8.86499 3.55677 8.96741 3.56088 9.07004C3.56456 9.27197 3.64174 9.46563 3.77797 9.61474C3.91419 9.76385 4.1001 9.85817 4.30088 9.88004C4.20525 9.95506 4.12773 10.0506 4.07407 10.1597C4.02041 10.2688 3.99198 10.3885 3.99088 10.51C3.9895 10.6981 4.05361 10.8808 4.17221 11.0268C4.29081 11.1727 4.45651 11.2729 4.64088 11.31C4.54167 11.4788 4.50955 11.6787 4.55088 11.87C4.60394 12.0529 4.71619 12.213 4.87001 12.3252C5.02384 12.4374 5.21056 12.4954 5.40088 12.49H7.69088C7.99085 12.4886 8.2896 12.4517 8.58088 12.38L10.0009 11.91H11.9009C12.9009 11.91 13.1709 7.27004 11.9009 7.27004C11.7177 7.28013 11.5341 7.28013 11.3509 7.27004C11.3509 7.27004 11.2009 7.08004 10.9509 6.81004C10.5809 6.41004 10.1709 5.90004 9.88088 5.62004C9.16907 4.99162 8.59094 4.22645 8.18088 3.37004C8.09962 3.1823 7.99185 3.00719 7.86088 2.85004C7.69433 2.70998 7.47944 2.64093 7.26247 2.65776C7.04551 2.6746 6.84384 2.77596 6.70088 2.94004C6.59725 3.05212 6.51278 3.1805 6.45088 3.32004C6.41177 3.41708 6.38164 3.5175 6.36088 3.62004C6.33405 3.90197 6.35776 4.18643 6.43088 4.46004C6.49055 4.7489 6.58107 5.03051 6.70088 5.30004C6.89034 5.65255 7.11124 5.98725 7.36088 6.30004C7.39174 6.31905 7.41613 6.34693 7.43088 6.38004" stroke="#004182" stroke-linecap="round" stroke-linejoin="round"/></svg>`
);

const LI_CELEBRATE_BADGE = liBadge(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1C9.85652 1 11.637 1.7375 12.9497 3.05025C14.2625 4.36301 15 6.14348 15 8C15 9.85652 14.2625 11.637 12.9497 12.9497C11.637 14.2625 9.85652 15 8 15C6.14348 15 4.36301 14.2625 3.05025 12.9497C1.7375 11.637 1 9.85652 1 8C1 6.14348 1.7375 4.36301 3.05025 3.05025C4.36301 1.7375 6.14348 1 8 1Z" fill="#D8D8D8"/><path fill-rule="evenodd" clip-rule="evenodd" d="M8 1C9.85652 1 11.637 1.7375 12.9497 3.05025C14.2625 4.36301 15 6.14348 15 8C15 9.85652 14.2625 11.637 12.9497 12.9497C11.637 14.2625 9.85652 15 8 15C6.14348 15 4.36301 14.2625 3.05025 12.9497C1.7375 11.637 1 9.85652 1 8C1 6.14348 1.7375 4.36301 3.05025 3.05025C4.36301 1.7375 6.14348 1 8 1Z" fill="white"/><path d="M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15Z" fill="#6DAE4F"/><path d="M7.99958 1C9.38405 1 10.7374 1.41055 11.8886 2.17972C13.0397 2.94888 13.9369 4.04214 14.4667 5.32122C14.9966 6.6003 15.1352 8.00777 14.8651 9.36563C14.595 10.7235 13.9283 11.9708 12.9493 12.9497C11.9704 13.9287 10.7231 14.5954 9.36521 14.8655C8.00735 15.1356 6.59988 14.997 5.3208 14.4672C4.04171 13.9373 2.94846 13.0401 2.17929 11.889C1.41012 10.7379 0.999581 9.38447 0.999581 8C0.999581 6.14349 1.73708 4.36301 3.04983 3.05025C4.36259 1.7375 6.14307 1 7.99958 1ZM7.99958 2.47359e-06C6.14882 0.00145782 4.35581 0.644568 2.92604 1.81976C1.49627 2.99496 0.518198 4.62953 0.158455 6.445C-0.201289 8.26046 0.0795573 10.1445 0.953143 11.7761C1.82673 13.4077 3.23901 14.686 4.94937 15.3931C6.65972 16.1002 8.56234 16.1924 10.3331 15.654C12.1038 15.1156 13.6331 13.98 14.6604 12.4405C15.6876 10.901 16.1494 9.05295 15.9669 7.21121C15.7844 5.36946 14.969 3.64796 13.6596 2.34C12.9161 1.59733 12.0335 1.00842 11.0624 0.606911C10.0912 0.205406 9.05047 -0.000823887 7.99958 2.47359e-06Z" fill="white"/><path d="M12.1289 9.21995C12.1086 8.4344 11.9876 7.65471 11.7689 6.89995C11.1595 6.40073 10.6994 5.74338 10.4389 4.99995C10.2789 4.46995 10.1689 4.27995 9.6989 4.26995C9.5078 4.2926 9.33305 4.38881 9.2117 4.53816C9.09035 4.68751 9.03196 4.87826 9.0489 5.06995C9.0489 5.30995 9.0489 5.55995 9.1089 5.78995C9.24594 6.44562 9.44001 7.08806 9.6889 7.70995L5.1889 4.32995C5.11383 4.25683 5.02428 4.20025 4.92602 4.16386C4.82775 4.12747 4.72295 4.11208 4.61837 4.11867C4.51378 4.12527 4.41175 4.15371 4.31883 4.20215C4.22591 4.2506 4.14418 4.31798 4.0789 4.39995C4.03064 4.48325 3.99934 4.57528 3.9868 4.67074C3.97426 4.76619 3.98072 4.86318 4.00581 4.95613C4.03091 5.04907 4.07414 5.13614 4.13302 5.21231C4.1919 5.28848 4.26527 5.35225 4.3489 5.39995L6.5989 7.09995L7.1889 7.65995L3.6189 4.99995C3.52232 4.90427 3.40031 4.83834 3.26736 4.80998C3.13441 4.78162 2.99611 4.79202 2.8689 4.83995C2.74066 4.88501 2.6286 4.96695 2.54676 5.07547C2.46493 5.18399 2.41697 5.31427 2.4089 5.44995C2.39918 5.58427 2.42787 5.71858 2.49161 5.83722C2.55536 5.95585 2.65152 6.05391 2.7689 6.11995L4.9989 7.76995L6.3489 8.76995L3.4489 6.57995C3.37244 6.50906 3.28272 6.45401 3.18489 6.41797C3.08706 6.38193 2.98306 6.36561 2.8789 6.36995C2.66905 6.38854 2.47501 6.48915 2.3389 6.64995C2.0289 7.04995 2.2789 7.45995 2.5989 7.70995L4.8489 9.39995L5.9989 10.2499L3.7289 8.54995C3.65958 8.47448 3.57535 8.41423 3.48153 8.37302C3.38772 8.3318 3.28636 8.31052 3.1839 8.31052C3.08143 8.31052 2.98007 8.3318 2.88626 8.37302C2.79244 8.41423 2.70821 8.47448 2.6389 8.54995C2.57903 8.63599 2.53761 8.73349 2.51724 8.83631C2.49687 8.93913 2.49799 9.04506 2.52053 9.14743C2.54307 9.2498 2.58654 9.3464 2.64821 9.43116C2.70989 9.51592 2.78843 9.587 2.8789 9.63995L6.9789 12.6399C7.5789 13.0899 9.0489 13.4799 9.6989 12.9099" stroke="#165209" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.61 9.89959L12.19 9.52959C12.1393 8.793 11.967 8.0699 11.68 7.38959C11.0935 6.69972 10.6789 5.88068 10.47 4.99959C10.31 4.46959 10.2 4.27959 9.73002 4.26959C9.53893 4.29225 9.36418 4.38846 9.24283 4.53781C9.12148 4.68716 9.06308 4.87791 9.08003 5.06959C9.08003 5.30959 9.08003 5.55959 9.14003 5.78959C9.2563 6.42101 9.44071 7.03795 9.69002 7.62959L9.50003 7.52959L5.19003 4.21959C5.11496 4.14648 5.02541 4.0899 4.92714 4.05351C4.82888 4.01712 4.72408 4.00173 4.61949 4.00832C4.51491 4.01492 4.41288 4.04336 4.31996 4.0918C4.22704 4.14025 4.14531 4.20763 4.08003 4.28959C4.02262 4.37529 3.98403 4.47218 3.96679 4.57388C3.94955 4.67557 3.95407 4.77977 3.98003 4.87959C4.00379 4.98014 4.04921 5.07428 4.11311 5.15546C4.17702 5.23664 4.25787 5.30289 4.35003 5.34959L6.55003 6.99959L7.19003 7.50959L3.62003 4.83959C3.54528 4.76625 3.45583 4.70961 3.35757 4.67341C3.25931 4.63721 3.15448 4.62228 3.05003 4.62959C2.94647 4.6359 2.84525 4.66307 2.75246 4.70946C2.65966 4.75586 2.5772 4.82053 2.51003 4.89959C2.45483 4.98629 2.41754 5.08315 2.40037 5.18448C2.38319 5.28581 2.38648 5.38955 2.41003 5.48959C2.42925 5.5957 2.47143 5.69632 2.53361 5.78441C2.5958 5.87251 2.67649 5.94595 2.77003 5.99959L5.00003 7.65959L6.35003 8.65959L3.45003 6.47959C3.37578 6.40498 3.28665 6.34682 3.18844 6.30892C3.09024 6.27102 2.98515 6.25421 2.88003 6.25959C2.77559 6.26656 2.67371 6.29503 2.58079 6.34321C2.48787 6.3914 2.4059 6.45825 2.34003 6.53959C2.28148 6.62447 2.24158 6.7208 2.22295 6.82221C2.20432 6.92363 2.20739 7.02784 2.23195 7.12799C2.25652 7.22814 2.30202 7.32194 2.36546 7.40323C2.4289 7.48451 2.50885 7.55144 2.60003 7.59959L4.85003 9.28959L6.00003 10.1396L3.73003 8.44959C3.66262 8.37234 3.5797 8.31015 3.48666 8.26707C3.39361 8.224 3.29254 8.20101 3.19003 8.19959C3.08623 8.20203 2.984 8.22544 2.88948 8.2684C2.79496 8.31136 2.71011 8.373 2.64003 8.44959C2.57881 8.53432 2.53624 8.63105 2.51512 8.73341C2.49399 8.83578 2.4948 8.94146 2.51747 9.0435C2.54014 9.14553 2.58418 9.2416 2.64667 9.32539C2.70916 9.40917 2.78869 9.47877 2.88003 9.52959L7.00003 12.6396C7.29304 12.863 7.62898 13.0236 7.98687 13.1114C8.34475 13.1991 8.71689 13.2121 9.08003 13.1496C9.28171 13.3061 9.52974 13.391 9.78503 13.391C10.0403 13.391 10.2883 13.3061 10.49 13.1496C11.09 12.6896 10.9 12.6396 11.34 12.0196C11.8422 11.3633 12.2683 10.652 12.61 9.89959Z" fill="#DCF0CB"/><path d="M12.1289 9.21995C12.1086 8.4344 11.9876 7.65471 11.7689 6.89995C11.1595 6.40073 10.6994 5.74338 10.4389 4.99995C10.2789 4.46995 10.1689 4.27995 9.6989 4.26995C9.5078 4.2926 9.33305 4.38881 9.2117 4.53816C9.09035 4.68751 9.03196 4.87826 9.0489 5.06995C9.0489 5.30995 9.0489 5.55995 9.1089 5.78995C9.24594 6.44562 9.44001 7.08806 9.6889 7.70995L5.1889 4.32995C5.11383 4.25683 5.02428 4.20025 4.92602 4.16386C4.82775 4.12747 4.72295 4.11208 4.61837 4.11867C4.51378 4.12527 4.41175 4.15371 4.31883 4.20215C4.22591 4.2506 4.14418 4.31798 4.0789 4.39995C4.03064 4.48325 3.99934 4.57528 3.9868 4.67074C3.97426 4.76619 3.98072 4.86318 4.00581 4.95613C4.03091 5.04907 4.07414 5.13614 4.13302 5.21231C4.1919 5.28848 4.26527 5.35225 4.3489 5.39995L6.5989 7.09995L7.1889 7.65995L3.6189 4.99995C3.52232 4.90427 3.40031 4.83834 3.26736 4.80998C3.13441 4.78162 2.99611 4.79202 2.8689 4.83995C2.74066 4.88501 2.6286 4.96695 2.54676 5.07547C2.46493 5.18399 2.41697 5.31427 2.4089 5.44995C2.39918 5.58427 2.42787 5.71858 2.49161 5.83722C2.55536 5.95585 2.65152 6.05391 2.7689 6.11995L4.9989 7.76995L6.3489 8.76995L3.4489 6.57995C3.37244 6.50906 3.28272 6.45401 3.18489 6.41797C3.08706 6.38193 2.98306 6.36561 2.8789 6.36995C2.66905 6.38854 2.47501 6.48915 2.3389 6.64995C2.0289 7.04995 2.2789 7.45995 2.5989 7.70995L4.8489 9.39995L5.9989 10.2499L3.7289 8.54995C3.65958 8.47448 3.57535 8.41423 3.48153 8.37302C3.38772 8.3318 3.28636 8.31052 3.1839 8.31052C3.08143 8.31052 2.98007 8.3318 2.88626 8.37302C2.79244 8.41423 2.70821 8.47448 2.6389 8.54995C2.57903 8.63599 2.53761 8.73349 2.51724 8.83631C2.49687 8.93913 2.49799 9.04506 2.52053 9.14743C2.54307 9.2498 2.58654 9.3464 2.64821 9.43116C2.70989 9.51592 2.78843 9.587 2.8789 9.63995L6.9789 12.6399C7.79647 13.1308 8.74935 13.348 9.6989 13.2599" stroke="#165209" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.7686 11.3899C14.567 11.173 14.4106 10.918 14.3086 10.6399C14.2949 10.4207 14.2614 10.2031 14.2086 9.98992C14.1773 9.60618 14.0538 9.23567 13.8486 8.90992C13.2672 8.22046 12.8531 7.40592 12.6386 6.52992C12.4786 5.99992 12.3686 5.80992 11.8986 5.79992C11.7042 5.81725 11.5245 5.9107 11.3986 6.05992C11.3393 6.13561 11.2955 6.22228 11.2697 6.31495C11.244 6.40762 11.2368 6.50447 11.2486 6.59992C11.2487 6.84117 11.2688 7.08199 11.3086 7.31992C11.4886 8.23992 11.6786 8.99992 11.6986 9.04992L7.40861 5.83992C7.33399 5.76581 7.2448 5.70799 7.14669 5.67012C7.04857 5.63225 6.94367 5.61516 6.83861 5.61992C6.7328 5.62555 6.62955 5.65446 6.5362 5.70459C6.44286 5.75472 6.36173 5.82483 6.29861 5.90992C6.24994 5.99263 6.21805 6.08413 6.20478 6.17917C6.1915 6.27422 6.1971 6.37095 6.22125 6.46383C6.2454 6.55671 6.28763 6.64392 6.34551 6.72047C6.4034 6.79701 6.47581 6.86139 6.55861 6.90992L8.80861 8.60992L9.48861 9.16992L5.88861 6.45992C5.81399 6.38581 5.7248 6.32799 5.62669 6.29012C5.52857 6.25225 5.42367 6.23516 5.31861 6.23992C5.16025 6.24156 5.00698 6.29609 4.88318 6.39485C4.75938 6.49361 4.67215 6.63093 4.63536 6.78497C4.59858 6.939 4.61435 7.10092 4.68017 7.24496C4.74599 7.389 4.85807 7.50691 4.99861 7.57992L7.24861 9.27992L8.59861 10.2799L5.70861 8.08992C5.63453 8.0161 5.54546 7.95905 5.44741 7.92265C5.34937 7.88624 5.24466 7.87133 5.14035 7.87891C5.03604 7.8865 4.93459 7.91641 4.84285 7.96662C4.7511 8.01682 4.67122 8.08616 4.60861 8.16992C4.29861 8.56992 4.53861 8.97992 4.86861 9.22992L7.11861 10.9099L8.23861 11.7599L5.99861 10.0599C5.86439 9.93039 5.68514 9.85799 5.49861 9.85799C5.31207 9.85799 5.13282 9.93039 4.99861 10.0599C4.93398 10.1403 4.88792 10.234 4.86372 10.3343C4.83951 10.4345 4.83777 10.5389 4.85861 10.6399C4.87818 10.7407 4.91852 10.8363 4.97706 10.9207C5.03559 11.005 5.11104 11.0763 5.19861 11.1299L9.19861 14.1299C9.53229 14.3805 9.91878 14.5515 10.3286 14.6299L10.9086 14.7199C11.2141 14.7617 11.5092 14.86 11.7786 15.0099C11.9716 15.0847 12.1856 15.0847 12.3786 15.0099C13.0805 14.7593 13.6951 14.3114 14.1486 13.7199C14.5669 13.1331 14.8096 12.4395 14.8486 11.7199C14.8783 11.5815 14.8783 11.4383 14.8486 11.2999L14.7686 11.3899Z" stroke="#165209" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path fill-rule="evenodd" clip-rule="evenodd" d="M14.8098 11.3399L14.3598 10.9999C14.3113 10.263 14.1388 9.53951 13.8498 8.85991C13.2684 8.17045 12.8543 7.3559 12.6398 6.47991C12.4798 5.94991 12.3698 5.75991 11.8998 5.74991C11.7053 5.76723 11.5256 5.86068 11.3998 6.00991C11.3404 6.0856 11.2966 6.17227 11.2709 6.26494C11.2452 6.35761 11.238 6.45445 11.2498 6.54991C11.2499 6.79115 11.2699 7.03197 11.3098 7.26991C11.4898 8.19991 11.6798 8.95991 11.6998 8.99991L7.40978 5.78991C7.33472 5.71679 7.24517 5.66021 7.1469 5.62382C7.04863 5.58743 6.94383 5.57204 6.83925 5.57864C6.73467 5.58523 6.63263 5.61367 6.53971 5.66211C6.4468 5.71056 6.36506 5.77794 6.29978 5.85991C5.98978 6.26991 6.23978 6.66991 6.55978 6.91991L8.80978 8.60991L9.48978 9.16991L5.88978 6.40991C5.81472 6.33679 5.72517 6.28021 5.6269 6.24382C5.52863 6.20743 5.42383 6.19204 5.31925 6.19864C5.21467 6.20523 5.11263 6.23367 5.01971 6.28211C4.9268 6.33056 4.84506 6.39794 4.77978 6.47991C4.46978 6.87991 4.71978 7.28991 5.03978 7.53991L7.28978 9.22991L8.63978 10.2299L5.70978 7.99991C5.63581 7.92548 5.54647 7.86813 5.44801 7.83185C5.34955 7.79558 5.24435 7.78126 5.13978 7.78991C5.03622 7.79442 4.93495 7.82188 4.84329 7.87031C4.75164 7.91873 4.67188 7.9869 4.60978 8.06991C4.54838 8.15376 4.50586 8.24992 4.48515 8.35176C4.46443 8.45361 4.46601 8.55873 4.48978 8.65991C4.51648 8.76058 4.56413 8.85448 4.62961 8.93547C4.69509 9.01646 4.77693 9.08272 4.86978 9.12991L7.11978 10.8199L8.23978 11.6699L5.99978 9.99991C5.9346 9.93339 5.85681 9.88054 5.77096 9.84446C5.6851 9.80839 5.59291 9.7898 5.49978 9.7898C5.40665 9.7898 5.31446 9.80839 5.22861 9.84446C5.14275 9.88054 5.06496 9.93339 4.99978 9.99991C4.9294 10.0813 4.87843 10.1775 4.85071 10.2815C4.82299 10.3854 4.81925 10.4943 4.83978 10.5999C4.85767 10.7065 4.89931 10.8077 4.96163 10.896C5.02395 10.9842 5.10535 11.0574 5.19978 11.1099L9.19978 14.1099C9.80677 14.4704 10.4943 14.6732 11.1998 14.6999C11.4569 14.8544 11.7242 14.9914 11.9998 15.1099C12.8017 14.9577 13.5163 14.5075 13.9998 13.8499C14.5209 13.0904 14.8188 12.2001 14.8598 11.2799L14.8098 11.3399Z" fill="#DDF6D1"/><path d="M14.7686 11.3899C14.567 11.173 14.4106 10.918 14.3086 10.6399C14.2949 10.4207 14.2614 10.2031 14.2086 9.98992C14.1773 9.60618 14.0538 9.23567 13.8486 8.90992C13.2672 8.22046 12.8531 7.40592 12.6386 6.52992C12.4786 5.99992 12.3686 5.80992 11.8986 5.79992C11.7042 5.81725 11.5245 5.9107 11.3986 6.05992C11.3393 6.13561 11.2955 6.22228 11.2697 6.31495C11.244 6.40762 11.2368 6.50447 11.2486 6.59992C11.2487 6.84117 11.2688 7.08199 11.3086 7.31992C11.4886 8.23992 11.6786 8.99992 11.6986 9.04992L7.40861 5.83992C7.33399 5.76581 7.2448 5.70799 7.14669 5.67012C7.04857 5.63225 6.94367 5.61516 6.83861 5.61992C6.7328 5.62555 6.62955 5.65446 6.5362 5.70459C6.44286 5.75472 6.36173 5.82483 6.29861 5.90992C6.24994 5.99263 6.21805 6.08413 6.20478 6.17917C6.1915 6.27422 6.1971 6.37095 6.22125 6.46383C6.2454 6.55671 6.28763 6.64392 6.34551 6.72047C6.4034 6.79701 6.47581 6.86139 6.55861 6.90992L8.80861 8.60992L9.48861 9.16992L5.88861 6.45992C5.81399 6.38581 5.7248 6.32799 5.62669 6.29012C5.52857 6.25225 5.42367 6.23516 5.31861 6.23992C5.16025 6.24156 5.00698 6.29609 4.88318 6.39485C4.75938 6.49361 4.67215 6.63093 4.63536 6.78497C4.59858 6.939 4.61435 7.10092 4.68017 7.24496C4.74599 7.389 4.85807 7.50691 4.99861 7.57992L7.24861 9.27992L8.59861 10.2799L5.70861 8.08992C5.63453 8.0161 5.54546 7.95905 5.44741 7.92265C5.34937 7.88624 5.24466 7.87133 5.14035 7.87891C5.03604 7.8865 4.93459 7.91641 4.84285 7.96662C4.7511 8.01682 4.67122 8.08616 4.60861 8.16992C4.29861 8.56992 4.53861 8.97992 4.86861 9.22992L7.11861 10.9099L8.23861 11.7599L5.99861 10.0599C5.86439 9.93039 5.68514 9.85799 5.49861 9.85799C5.31207 9.85799 5.13282 9.93039 4.99861 10.0599C4.93398 10.1403 4.88792 10.234 4.86372 10.3343C4.83951 10.4345 4.83777 10.5389 4.85861 10.6399C4.87818 10.7407 4.91852 10.8363 4.97706 10.9207C5.03559 11.005 5.11104 11.0763 5.19861 11.1299L9.19861 14.1299C9.53229 14.3805 9.91878 14.5515 10.3286 14.6299L10.9086 14.7199C11.2141 14.7617 11.5092 14.86 11.7786 15.0099C11.9716 15.0847 12.1856 15.0847 12.3786 15.0099C13.0805 14.7593 13.6951 14.3114 14.1486 13.7199C14.5669 13.1331 14.8096 12.4395 14.8486 11.7199C14.8783 11.5815 14.8783 11.4383 14.8486 11.2999L14.7686 11.3899Z" stroke="#165209" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.82961 2.82031L8.09961 3.74031" stroke="#165209" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.49023 1.62012L5.56023 2.82012" stroke="#165209" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.53867 1.62988L6.88867 3.18988" stroke="#165209" stroke-linecap="round" stroke-linejoin="round"/></svg>`
);

// Entries are [color, x, icon]. An icon that starts with "data:" is a full-color badge drawn as-is.
const LI_REACT = [["#6DAE4F", 44, LI_CELEBRATE_BADGE], ["#DF704D", 32, LI_LOVE_BADGE], ["#378FE9", 20, LI_LIKE_BADGE]]; // back to front
const LI_NEXT = {
  name: "Jordan Ellis", degree: "3rd+",
  headline: "Brand strategist helping teams tell clearer stories and ship sharper products",
  text: "Love this direction. Curious how you approached the brand system from the start, and what changed along the way?",
};

function linkedinOps(s, w, h) {
  s = { ...socialDefaults("linkedin", s.mode), ...s };
  const k = Math.min(w / 440, h / 956);                 // fit the 440 x 956 screen inside the frame
  const ox = (w - 440 * k) / 2;                         // center it horizontally
  const pt = (n) => n * k;                              // design pt -> frame px
  const Y = (n) => (n < 500 ? pt(n) : h - pt(956 - n)); // top chrome hangs from the top, footer from the bottom
  const c = s.theme === "dark" ? LI_DARK : LI_LIGHT;
  const initial = ((s.name ?? "").trim()[0] || "?").toUpperCase();
  const ops = [];

  const type = (k) => ({ size: pt(LI_T[k][0]), weight: LI_T[k][1] });
  const tw = (str, k) => { const f = type(k); return igTextW(str, f.size, f.weight, LI_FONT) / pt(1); }; // width in design pt
  const rect = (x, y, rw, rh, fill, r = 0, stroke, sw) =>
    ops.push({ t: "rect", x: pt(x), y: Y(y), w: pt(rw), h: pt(rh), fill, r: pt(r), stroke, sw: sw && Math.max(1, pt(sw)) });
  const dot = (cx, cy, r, fill) => ops.push({ t: "circle", cx: pt(cx), cy: Y(cy), r: pt(r), fill });
  const icon = (name, cx, cy, size, color) => ops.push({ t: "icon", name, cx: pt(cx), cy: Y(cy), size: pt(size), color });
  // y is the text BASELINE in design pt; the renderer centers on the cap height, so shift by 0.352em.
  const T = (str, x, base, k, color, o = {}) => {
    const f = type(k);
    ops.push({ t: "text", text: str ?? "", x: pt(x), y: Y(base) - f.size * 0.352, s: f.size, color, weight: f.weight, align: o.align ?? "left", maxW: o.maxW && pt(o.maxW), font: LI_FONT });
  };
  const avatar = (cx, cy, r) => {
    if (s.avatar) return ops.push({ t: "image", src: s.avatar, cx: pt(cx), cy: Y(cy), r: pt(r) });
    dot(cx, cy, r, "#B8B8BE");
    ops.push({ t: "text", text: initial, x: pt(cx), y: Y(cy), s: pt(r * 0.9), color: "#3A3A3C", weight: 700, align: "center", font: LI_FONT });
  };

  // ----- caption (measured first, because it decides where the image starts) -----
  const capSize = pt(LI_T.body[0]);
  const capMaxW = pt(416);
  let lines = igWrap(s.caption, capSize, LI_T.body[1], capMaxW, LI_FONT);
  const clipped = lines.length > 3;
  lines = lines.slice(0, 3);
  if (clipped) {
    let last = lines[2];
    while (last.length > 1 && igTextW(`${last}…more`, capSize, 400, LI_FONT) > capMaxW) last = last.slice(0, -1).trimEnd();
    lines[2] = last;
  }
  const topEnd = lines.length ? 238.7 + (lines.length - 1) * 15.5 + 11 : 230; // where the post image begins

  // ----- top bar -----
  rect(0, 0, 440, 106, c.bar);
  rect(0, 106, 440, topEnd - 106, c.bg);
  ops.push({ t: "rect", x: 0, y: pt(106), w, h: Math.max(1, pt(0.34)), fill: c.hair, r: 0 });
  avatar(44, 84, 16);
  rect(68, 68, 292, 32, null, 16, c.border, 1);
  icon("liSearch", 85, 84, LI_ICON.search, c.icon);
  T("Search", 102.7, 88.7, "search", c.sub);
  icon("liMsg", 390, 85, LI_ICON.msg, c.icon);

  // ----- tabs -----
  T("For you", 110, 135.3, "tab", c.text, { align: "center" });
  T("Network", 330, 135.3, "tab", c.sub, { align: "center" });
  rect(0, 152, 220, 2, c.active);
  rect(12, 160.7, 416, 1, c.div);

  // ----- post header -----
  avatar(36, 193.7, 24);
  T(s.name, 68, 184.3, "name", c.text, { maxW: 200 });
  const bx = 68 + Math.min(tw(s.name, "name"), 200) + 5.3;
  dot(bx + 1.15, 181.2, 1.15, c.sub);
  T("You", bx + 7.6, 184.3, "degree", c.sub, { maxW: 40 });
  T(s.headline, 68, 199.3, "headline", c.sub2, { maxW: 292 });
  T(s.time, 68, 215.3, "time", c.sub, { maxW: 40 });
  const tx = 68 + Math.min(tw(s.time, "time"), 40);
  dot(tx + 6.75, 212.2, 1.15, c.sub);
  icon("liGlobe", tx + 20.6, 211.3, LI_ICON.globe, c.icon);
  const fw = tw("Follow", "follow");
  T("Follow", 428, 190.3, "follow", c.link, { align: "right" });
  icon("liPlus", 428 - fw - 13, 185.7, LI_ICON.plus, c.link);

  // ----- caption -----
  lines.forEach((ln, i) => {
    const base = 238.7 + i * 15.5;
    if (clipped && i === 2) {
      ops.push({ t: "text", runs: [[`${ln}…`, 400], ["more", 400, c.sub]], text: "", x: pt(12), y: Y(base) - capSize * 0.352, s: capSize, color: c.text, weight: 400, align: "left", maxW: capMaxW, font: LI_FONT });
    } else T(ln, 12, base, "body", c.text);
  });

  // ----- footer: reactions, actions, next post -----
  rect(0, 720.7, 440, 156.3, c.bg);
  LI_REACT.forEach(([col, cx, ic]) => {
    dot(cx, 737, 8.2, c.bg); // cut-out ring so the circles overlap cleanly
    if (ic.startsWith("data:")) {
      ops.push({ t: "image", src: ic, cx: pt(cx), cy: Y(737), r: pt(8), sq: true }); // 16pt badge, circle is r 7 inside it
      return;
    }
    dot(cx, 737, 7, col);
    icon(ic, cx, 737, LI_ICON.react, "#FFFFFF");
  });
  T(s.extra, 56.3, 742, "count", c.sub);
  const repW = tw(s.reposts, "count");
  T(s.reposts, 428, 742, "count", c.sub, { align: "right" });
  const dcx = 428 - repW - 8.65;
  dot(dcx, 738.3, 1.35, c.sub);
  T(s.comments, dcx - 7.7, 742, "count", c.sub, { align: "right" });
  rect(12, 752.7, 416, 1, c.div);
  [["liLike", "Like"], ["liComment", "Comment"], ["liRepost", "Repost"], ["liSend", "Send"]].forEach(([ic, label], i) => {
    const cx = 55 + i * 110;
    icon(ic, cx, 768.5, LI_ICON.action, c.icon);
    T(label, cx, 791.7, "action", c.icon, { align: "center" });
  });

  // next post sliver, cut off by the nav bar
  ops.push({ t: "image", src: IG_LIKER_DEFAULT, cx: pt(28), cy: Y(826), r: pt(16) });
  T(LI_NEXT.name, 52, 823.3, "next", c.text, { maxW: 160 });
  const nn = 52 + Math.min(tw(LI_NEXT.name, "next"), 160) + 5.3;
  dot(nn + 1.15, 819.6, 1.15, c.sub);
  T(LI_NEXT.degree, nn + 7.6, 823.3, "degree", c.sub);
  T(LI_NEXT.headline, 52, 839.7, "headline", c.sub2, { maxW: 376 });
  igWrap(LI_NEXT.text, capSize, 400, pt(376), LI_FONT).slice(0, 2).forEach((ln, i) => T(ln, 52, 862.7 + i * 15.5, "body", c.text, { maxW: 376 }));

  // ----- bottom nav -----
  rect(0, 877, 440, 79, c.bar);
  rect(2, 877, 84, 2, c.active, 1);
  [["liHome", "Home", 44, true], ["liNetwork", "My Network", 132], ["liPost", "Post", 220], ["liBell", "Notifications", 308], ["liJobs", "Jobs", 396]].forEach(
    ([ic, label, cx, on]) => {
      const col = on ? c.active : c.sub;
      icon(ic, cx, 892.4, LI_ICON.nav, col);
      T(label, cx, 918.3, on ? "navOn" : "nav", col, { align: "center" });
    }
  );
  if (s.badge) {
    const bw = Math.max(18, tw(s.badge, "badge") + 10);
    rect(314.7, 880, bw, 18, c.badge, 9);
    T(s.badge, 314.7 + bw / 2, 893.6, "badge", c.badgeText, { align: "center" });
  }

  // center the screen, then lay full-frame backgrounds and the media image underneath everything
  ops.forEach((o) => {
    if ("x" in o) o.x += ox;
    if ("cx" in o) o.cx += ox;
  });
  const mediaTop = Y(topEnd), mediaBottom = Y(720.7);
  ops.unshift(
    { t: "rect", x: 0, y: 0, w, h, fill: c.bg, r: 0 },
    { t: "rect", x: 0, y: 0, w, h: Y(106), fill: c.bar, r: 0 },
    { t: "rect", x: 0, y: Y(877), w, h: h - Y(877), fill: c.bar, r: 0 },
    { t: "media", src: s.media ?? null, x: ox, y: mediaTop, w: pt(440), h: mediaBottom - mediaTop }
  );
  return ops;
}

// ---------- Facebook ----------
const FB_FONT = WA_FONT;
// Design pt on a 440 x 956 screen, measured from a screenshot. [size, weight]
const FB_T = {
  name: [15, 600], follow: [15, 600], time: [13, 400], body: [15, 400],
  count: [13, 400], action: [14, 600], badge: [11, 600],
  rTitle: [26, 600], rName: [15, 600], rSub: [14, 500], rBody: [15, 400], rCount: [13, 500], // Reels
  sName: [15, 600], sTime: [14, 400], sSongB: [14, 600], sSong: [14, 400], sReply: [15, 400], // Stories
};
const FB_TRACK = { 11: 0.06, 12: 0, 13: -0.08, 14: -0.15, 15: -0.23, 16: -0.31 };
const fbTrack = (size) => FB_TRACK[size] ?? 0;
const FB_LIGHT = { bg: "#FFFFFF", text: "#050505", sub: "#65676B", link: "#0866FF", band: "#D0D2D6", hair: "#CED0D4", navBg: "#FFFFFF", navLine: "rgba(0,0,0,0.08)", pill: "#E7F0FF" };
const FB_DARK = { bg: "#242526", text: "#E4E6EB", sub: "#B0B3B8", link: "#4599FF", band: "#18191A", hair: "#3E4042", navBg: "#242526", navLine: "rgba(255,255,255,0.1)", pill: "#263951" };

const FB_LIKE_BADGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M59.9999 0C26.8499 0 0 26.85 0 59.9999C0 93.1498 26.8499 120 59.9999 120C93.1498 120 120 93.1498 120 59.9999C120 26.85 93.1498 0 59.9999 0Z" fill="url(#fbLike)"/><path d="M90.2999 55.05C94.3499 57.9 93.5999 63.9 89.2499 66.15C91.4999 69.8999 88.6499 74.8499 84.7499 75.8999C85.3499 76.9499 85.6499 77.8499 85.4999 78.8999C84.8999 83.2499 80.0999 83.9999 76.4999 83.9999H56.8499C49.05 83.9999 45.15 79.6499 45.15 76.0499V57.6C45.15 47.85 56.0999 39.6 56.0999 32.7L55.1999 24.3C55.1999 23.85 55.1999 22.5 55.6499 22.2C56.2499 21.6 58.0499 20.55 60.5999 20.55C62.2499 20.55 63.4499 20.8501 64.7999 21.6001C69.2999 23.85 69.8999 29.4 69.8999 33.9C69.8999 36 67.1999 42.45 66.8999 44.7C70.3499 43.5 78.4499 42.15 84.7499 43.05C92.0999 44.1 94.1999 49.05 90.2999 55.05ZM28.65 48H34.95C36.15 48 37.35 48.45 38.25 49.35C39.15 50.25 39.6 51.45 39.6 52.65V82.7999C39.6 83.9999 39.15 85.1999 38.25 86.0999C37.35 86.9999 36.15 87.4499 34.95 87.4499H28.65C27.45 87.4499 26.25 86.9999 25.35 86.0999C24.45 85.1999 24 83.9999 24 82.7999V52.65C24 51.45 24.45 50.25 25.35 49.35C26.25 48.45 27.45 48 28.65 48Z" fill="white"/><defs><radialGradient id="fbLike" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(41.8938 37.318) rotate(77.6772) scale(84.6968 84.6968)"><stop stop-color="#18AFFF"/><stop offset="1" stop-color="#0062DF"/></radialGradient></defs></svg>`
  );

  // Strips nothing, just escapes parentheses so the data URI survives CSS url(...) in the DOM overlay.
const fbBadge = (svg) => ("data:image/svg+xml;utf8," + encodeURIComponent(svg)).replace(/\(/g, "%28").replace(/\)/g, "%29");

const FB_LOVE_BADGE = fbBadge(
  `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M59.9999 0C26.8499 0 0 26.85 0 59.9999C0 93.1498 26.8499 120 59.9999 120C93.1498 120 120 93.1498 120 59.9999C120 26.85 93.1498 0 59.9999 0Z" fill="url(#fbLoveG)"/><path d="M78.6009 30C62.1009 30 60.0009 43.65 60.0009 43.65C60.0009 43.65 57.9009 30 41.401 30C25.501 30 20.851 46.65 22.801 55.6499C27.901 79.1999 59.8509 95.6999 59.8509 95.6999C59.8509 95.6999 91.8009 79.1999 96.9009 55.6499C99.0009 46.65 94.3508 30 78.6009 30Z" fill="white"/><defs><radialGradient id="fbLoveG" cx="0" cy="0" r="1" gradientTransform="matrix(16.2437 63.5304 -63.5294 16.2438 53.436 53.3625)" gradientUnits="userSpaceOnUse"><stop stop-color="#FF8297"/><stop offset="0.1592" stop-color="#FD7A90"/><stop offset="0.4121" stop-color="#F8637B"/><stop offset="0.7251" stop-color="#EF3D5B"/><stop offset="1" stop-color="#E61739"/></radialGradient></defs></svg>`
);

const FB_HAHA_BADGE = fbBadge(
  `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M119.999 59.9999C119.999 93.1657 93.2656 120 60.2242 120C27.1827 120 0.449219 93.1657 0.449219 59.9999C0.449219 26.8341 27.1827 0 60.2242 0C93.1154 0 119.999 26.8341 119.999 59.9999Z" fill="url(#fbHahaA)"/><path d="M119.55 59.9999C119.55 93.1657 92.8164 120 59.775 120C26.7335 120 0 93.1657 0 59.9999C0 26.8341 26.7335 0 59.775 0C92.6662 0 119.55 26.8341 119.55 59.9999Z" fill="url(#fbHahaB)"/><path d="M95.9649 71.1555C96.4155 68.5927 95.3641 66.0299 92.9611 65.1254C87.5544 62.8641 76.5906 59.9998 59.6194 59.9998C42.7983 59.9998 31.8345 62.8641 26.2775 65.1254C23.8745 66.0299 22.8232 68.5927 23.2738 71.1555C26.2775 86.5324 35.8896 105.226 59.6194 105.226C83.3491 105.075 92.9611 86.3816 95.9649 71.1555Z" fill="url(#fbHahaC)"/><path d="M83.8003 95.7286C79.2947 91.5075 71.7852 88.1909 59.7702 88.1909C47.6049 88.1909 40.0955 91.5075 35.5898 95.7286C41.297 101.306 49.1068 105.075 59.62 105.075C70.2833 105.075 78.0931 101.306 83.8003 95.7286Z" fill="url(#fbHahaD)"/><path d="M28.6853 50.3518C26.7328 50.3518 25.2309 48.8442 24.9306 46.8844C24.1796 38.7437 30.1872 31.5076 38.4475 30.7538C46.5577 30 53.7667 36.0302 54.5177 44.3216C54.6679 46.4322 53.166 48.2412 51.2135 48.392C49.1109 48.5427 47.3086 47.0352 47.1584 45.0754C46.858 41.005 43.2535 37.99 39.1985 38.2915C35.1434 38.593 32.1396 42.2111 32.44 46.2814C32.5902 48.392 31.0883 50.201 29.1358 50.3518C28.8354 50.3518 28.6853 50.3518 28.6853 50.3518Z" fill="url(#fbHahaE)"/><path d="M90.7126 50.3519C90.5624 50.3519 90.5624 50.3519 90.4122 50.3519C88.3096 50.2011 86.8078 48.3921 87.1082 46.2815C87.4085 42.2112 84.4048 38.5931 80.3497 38.2916C76.2946 37.9901 72.6901 40.8544 72.3897 45.0755C72.2395 47.186 70.4372 48.6936 68.3346 48.3921C66.2319 48.2413 64.7301 46.4323 65.0305 44.3217C65.7814 36.0303 72.9905 30.1509 81.1006 30.7539C89.2108 31.5077 95.2183 38.7438 94.6176 46.8845C94.167 48.8443 92.5149 50.3519 90.7126 50.3519Z" fill="url(#fbHahaF)"/><defs><radialGradient id="fbHahaA" cx="0" cy="0" r="1" gradientTransform="matrix(-0.141675 81.2323 -83.6337 -0.146963 59.229 49.6661)" gradientUnits="userSpaceOnUse"><stop stop-color="#FFED85"/><stop offset="0.1898" stop-color="#FFE180"/><stop offset="0.5295" stop-color="#FFC273"/><stop offset="0.9773" stop-color="#FF915E"/><stop offset="1" stop-color="#FF8E5D"/></radialGradient><radialGradient id="fbHahaB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32.3913 29.692) scale(99.6575 100.032)"><stop stop-color="#FFEA84" stop-opacity="0"/><stop offset="1" stop-color="#F08423" stop-opacity="0.34"/></radialGradient><linearGradient id="fbHahaC" x1="59.6193" y1="61.8679" x2="59.6193" y2="114.428" gradientUnits="userSpaceOnUse"><stop stop-color="#3F1D04"/><stop offset="1" stop-color="#7E2307"/></linearGradient><linearGradient id="fbHahaD" x1="59.6951" y1="86.3056" x2="59.6951" y2="104.754" gradientUnits="userSpaceOnUse"><stop stop-color="#FC607C"/><stop offset="1" stop-color="#D91F3A"/></linearGradient><radialGradient id="fbHahaE" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(39.6977 40.4935) scale(12.5283 12.5754)"><stop stop-color="#2C445F"/><stop offset="0.9792" stop-color="#191A33"/></radialGradient><radialGradient id="fbHahaF" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(79.6228 40.4933) scale(12.5424 12.5896)"><stop stop-color="#2C445F"/><stop offset="0.9792" stop-color="#191A33"/></radialGradient></defs></svg>`
);

// Shared helpers: everything is authored in design pt, centered on the frame, with top chrome hanging
// from the top and the footer from the bottom (same approach as LinkedIn).
function fbKit(s, w, h) {
  const k = Math.min(w / 440, h / 956);
  const ox = (w - 440 * k) / 2;
  const pt = (n) => n * k;
  const Y = (n) => (n < 500 ? pt(n) : h - pt(956 - n));
  const initial = ((s.name ?? "").trim()[0] || "?").toUpperCase();
  const ops = [];
  const font = (key) => ({ size: pt(FB_T[key][0]), weight: FB_T[key][1] });
  const tw = (str, key) =>
    (igTextW(str, font(key).size, font(key).weight, FB_FONT) + (str ?? "").length * pt(fbTrack(FB_T[key][0]))) / k;
  const rect = (x, y, rw, rh, fill, r = 0, stroke, sw, shadow) =>
    ops.push({
      t: "rect", x: pt(x), y: Y(y), w: pt(rw), h: pt(rh), fill, r: pt(r), stroke, sw: sw && Math.max(1, pt(sw)),
      shadow: shadow && { x: pt(shadow.x), y: pt(shadow.y), blur: pt(shadow.blur), color: shadow.color },
    });
  const grad = (x, y, gw, gh, from, to) => ops.push({ t: "vgrad", x: pt(x), y: Y(y), w: pt(gw), h: pt(gh), from, to });
  const dot = (cx, cy, r, fill) => ops.push({ t: "circle", cx: pt(cx), cy: Y(cy), r: pt(r), fill });
  // `box` = the icon's on-screen width in pt, whatever its viewBox is.
  const icon = (name, cx, cy, box, color) =>
    ops.push({ t: "icon", name, cx: pt(cx), cy: Y(cy), size: (pt(box) * 24) / (ICONS[name].vb?.[0] ?? 24), color });
  const T = (str, x, cy, key, color, o = {}) => {
    const f = font(key);
    ops.push({ t: "text", text: str ?? "", x: pt(x), y: Y(cy), s: f.size, color, weight: f.weight, align: o.align ?? "left", maxW: o.maxW && pt(o.maxW), font: FB_FONT, ls: pt(fbTrack(FB_T[key][0])) });
  };
  const avatar = (cx, cy, r) => {
    if (s.avatar) return ops.push({ t: "image", src: s.avatar, cx: pt(cx), cy: Y(cy), r: pt(r) });
    dot(cx, cy, r, "#B8B8BE");
    ops.push({ t: "text", text: initial, x: pt(cx), y: Y(cy), s: pt(r * 0.9), color: "#3A3A3C", weight: 700, align: "center", font: FB_FONT });
  };
  // Centers the screen, then puts full-frame backgrounds and the media slot underneath everything.
  const finish = (mediaY, mediaH, under) => {
    ops.forEach((o) => {
      if ("x" in o) o.x += ox;
      if ("cx" in o) o.cx += ox;
    });
    ops.unshift(...under, { t: "media", src: s.media ?? null, x: ox, y: mediaY, w: pt(440), h: mediaH });
    return ops;
  };
  return { pt, Y, ops, tw, rect, grad, dot, icon, T, avatar, finish };
}

const FB_POST_SHIFT = 40; // how far the Post header block moves up, in design pt

function facebookOps(s, w, h) {
  s = { ...socialDefaults("facebook", s.mode), ...s };
    const fbMode = modeOf("facebook", s.mode).value;
  if (fbMode === "reels") return facebookReelsOps(s, w, h);
  if (fbMode === "story") return facebookStoryOps(s, w, h);
  const { pt, Y, ops, tw, rect, dot, icon, T, avatar, finish } = fbKit(s, w, h);
  const c = s.theme === "dark" ? FB_DARK : FB_LIGHT;

  const up = (n) => n - FB_POST_SHIFT;

  // ----- header -----
  avatar(31.9, up(149.1), 16.3);
  // story ring + online dot, drawn around the avatar
  ops.unshift({ t: "circle", cx: pt(31.9), cy: Y(up(149.1)), r: pt(20), fill: c.link }, { t: "circle", cx: pt(31.9), cy: Y(up(149.1)), r: pt(18.3), fill: c.bg });
  dot(46, up(164.4), 6.3, c.bg);
  dot(46, up(164.4), 4.8, "#31A24C");

  T(s.name, 60.5, up(141.5), "name", c.text, { maxW: 290 });

  T(s.time, 60.5, up(159.5), "time", c.sub, { maxW: 60 });
  const timeW = Math.min(tw(s.time, "time"), 60);
  dot(60.5 + timeW + 6.5, up(159.5), 1.1, c.sub);
  icon("globe", 60.5 + timeW + 17, up(159.5), 13, c.sub);

  icon("menu", 374, up(140.6), 26, c.sub);
  icon("stClose", 418, up(141), 20, c.sub);

  // ----- caption (max 2 lines, then "See more") -----
  const CAP_LINE = 20; // 15pt text on a 20pt line
  const capSize = pt(FB_T.body[0]), capMaxW = pt(415.6);
  let lines = igWrap(s.caption, capSize, 400, capMaxW, FB_FONT);
  const clipped = lines.length > 2;
  lines = lines.slice(0, 2);
  if (clipped) {
    let last = lines[1];
    while (last.length > 1 && igTextW(`${last}… See more`, capSize, 600, FB_FONT) > capMaxW) last = last.slice(0, -1).trimEnd();
    lines[1] = last;
  }
  lines.forEach((ln, i) => {
    const cy = up(191) + i * CAP_LINE;
    if (clipped && i === 1) {
      ops.push({ t: "text", runs: [[`${ln}… `, 400], ["See more", 600, c.sub]], text: "", x: pt(12.2), y: Y(cy), s: capSize, color: c.text, weight: 400, align: "left", maxW: capMaxW, font: FB_FONT, ls: pt(fbTrack(15)) });
    } else T(ln, 12.2, cy, "body", c.text);
  });
  const mediaTop = lines.length ? up(191) + (lines.length - 1) * CAP_LINE + 18 : up(178);
  const mediaBottom = 798.4; // one post fills the screen, so the media slot runs down to the reactions row

  // ----- reactions row -----
  const ry = 817.2;
  ops.push({ t: "image", src: FB_LIKE_BADGE.replace(/\(/g, "%28").replace(/\)/g, "%29"), cx: pt(19.7), cy: Y(ry), r: pt(8.5), sq: true });
  T(s.extra, 32.6, ry, "count", c.sub, { maxW: 90 });
  T(s.shares, 427.8, ry, "count", c.sub, { align: "right" });
  T(s.comments, 427.8 - tw(s.shares, "count") - 9.6, ry, "count", c.sub, { align: "right" });

  // ----- action row: three equal columns, each group centered in its column -----
    const ay = 840.6, GLYPH = 20, GAP = 6;
  [["thumbsUp", "Like", 23], ["comment", "Comment", 26], ["stShare", "Share", 23]].forEach(([ic, label, box], i) => {
    const cx = (440 / 3) * (i + 0.5);
    const total = GLYPH + GAP + tw(label, "action");
    const x0 = cx - total / 2;
    icon(ic, x0 + GLYPH / 2, ay, box, c.sub);
    T(label, x0 + GLYPH + GAP, ay, "action", c.sub);
  });

  // ----- floating nav pill (y 884-935 on the 956 screen, leaving the home-indicator area clear) -----
  const NAV_Y = 909;
  const navShadow = { x: 0, y: 4, blur: 16, color: s.theme === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.14)" };
  rect(12, 883.5, 415.5, 51, c.navBg, 25.5, undefined, undefined, navShadow);
  rect(17.8, 889.5, 61, 39, c.pill, 19.5); // active tab highlight
  [["fbHome", 48.2], ["fbReels", 116.9], ["fbFriends", 185.5], ["fbMarket", 254.1], ["fbBell", 322.8]].forEach(([ic, cx], i) =>
    icon(ic, cx, NAV_Y, 24, i === 0 ? c.link : c.text)
  );
  dot(391.4, NAV_Y, 13.2, c.text); // profile ring
  dot(391.4, NAV_Y, 11.7, c.navBg);
  avatar(391.4, NAV_Y, 10.7);

  const badge = (str, cx, cy) => {
    if (!str) return;
    const bw = Math.max(16.4, tw(str, "badge") + 9);
    rect(cx - bw / 2 - 1.4, cy - 9.6, bw + 2.8, 19.2, c.navBg, 9.6); // ring that cuts out the icon
    rect(cx - bw / 2, cy - 8.2, bw, 16.4, "#E41E3F", 8.2);
    T(str, cx, cy, "badge", "#FFFFFF", { align: "center" });
  };
  badge(s.reelsBadge, 126.9, 898.8);
  badge(s.notifBadge, 332.8, 897.7);

  // ----- full-width chrome behind everything: page and the two separator bands -----
  const band = Math.max(1, pt(3.7));
  const under = [
    { t: "rect", x: 0, y: 0, w, h, fill: c.bg, r: 0 },
        { t: "rect", x: 0, y: Y(115 - FB_POST_SHIFT), w, h: band, fill: c.band, r: 0 },
    { t: "rect", x: 0, y: Y(868), w, h: band, fill: c.band, r: 0 },
  ];
  return finish(Y(mediaTop), Y(mediaBottom) - Y(mediaTop), under);
}

// Facebook Reels. Measured from a 1186 x 2576 screenshot (1px = 0.371pt). Video ends at y 877, black nav area below.
function facebookReelsOps(s, w, h) {
  const { Y, ops, tw, rect, grad, dot, icon, T, avatar, finish } = fbKit(s, w, h);
  const white = "#FFFFFF";

  // fades behind the header and the caption / rail
  grad(0, 0, 440, 130, "rgba(0,0,0,0.35)", "rgba(0,0,0,0)");
  grad(0, 700, 440, 177, "rgba(0,0,0,0)", "rgba(0,0,0,0.5)");

  // header: hamburger (three lines, swap for a real icon later), title, search, more
  [79.8, 88.3, 96.8].forEach((y) => rect(12, y - 0.8, 21, 1.6, white, 0.8));
  T("Reels", 44.5, 88, "rTitle", white);
  icon("search", 366, 88, 28, white);
  icon("moreCircle", 410, 88, 28, white);

  // right rail: icon center y, count center y, icon box (pt)
  const RX = 412;
  [
    ["thumbsUp", s.extra, 563, 589, 33],
    ["comment", s.comments, 634, 661, 36],
    ["stShare", s.shares, 705, 732, 30],
    ["bookmark", s.saves, 777, 804, 32],
  ].forEach(([ic, n, iy, ny, box]) => {
    icon(ic, RX, iy, box, white);
    T(n, RX, ny, "rCount", white, { align: "center" });
  });
  icon("menu", RX, 844, 40, white);

  // bottom info: 40pt avatar with story ring, name + globe, audio row, caption
  const AY = 817;
  dot(32, AY, 20, "#1877F2");
  dot(32, AY, 18.2, "#000000");
  avatar(32, AY, 16.6);
  T(s.name, 60.5, 810, "rName", white, { maxW: 230 });
  const nameW = Math.min(tw(s.name, "rName"), 230);
  icon("globe", 60.5 + nameW + 13, 810, 15, white);
  icon("music", 66, 831, 19, white);
  T(s.sound, 76.5, 831, "rSub", white, { maxW: 270 });
  T(s.caption, 12, 858, "rBody", white, { maxW: 416 });

  // nav: same pill geometry as the Post UI, dark, with the Reels tab active (no badges)
  rect(0, 877, 440, 79, "#000000");
  rect(12, 883.5, 415.5, 51, "#0D0D0D", 25.5, "rgba(255,255,255,0.16)", 1);
  rect(86.4, 889.5, 61, 39, "#2E2E2E", 19.5);
  [["fbHome", 48.2], ["fbReels", 116.9], ["fbFriends", 185.5], ["fbMarket", 254.1], ["fbBell", 322.8]].forEach(([ic, cx]) =>
    icon(ic, cx, 909, 24, white)
  );
  avatar(391.4, 909, 13.7);

  return finish(0, Y(877), [{ t: "rect", x: 0, y: 0, w, h, fill: "#000000", r: 0 }]);
}

// Facebook Stories. Measured from a 1186 x 2576 screenshot (1px = 0.371pt on a 440 x 956 screen).
// Media runs y 62 -> 844.5, black above and below. Reply row is bottom-anchored.
function facebookStoryOps(s, w, h) {
  const { pt, Y, ops, tw, rect, grad, dot, icon, T, avatar, finish } = fbKit(s, w, h);
  const white = "#FFFFFF";
  const soft = "rgba(255,255,255,0.75)";
  const MEDIA_TOP = 62, MEDIA_BOTTOM = 844.5;

  // fades behind the header and above the reply row
  grad(0, MEDIA_TOP, 440, 90, "rgba(0,0,0,0.45)", "rgba(0,0,0,0)");
  grad(0, MEDIA_BOTTOM - 24.5, 440, 24.5, "rgba(0,0,0,0)", "rgba(0,0,0,0.3)");

  // progress bar: 8 segments, 2pt tall, 2.6pt gap, 12pt side margin, first ~20% played
  const segs = 8, gap = 2.6, m = 11.9, segW = (440 - 2 * m - gap * (segs - 1)) / segs;
  for (let i = 0; i < segs; i++) {
    const x = m + i * (segW + gap);
    rect(x, 69.5, segW, 2, "rgba(255,255,255,0.35)", 1);
    if (i === 0) rect(x, 69.5, segW * 0.2, 2, white, 1);
  }

  // header: 40pt avatar, name + time on the first line, audio row on the second
  avatar(31.9, 102.8, 20);
  T(s.name, 60.5, 93.9, "sName", white, { maxW: 180 });
  const nameW = Math.min(tw(s.name, "sName"), 180);
  T(s.extra, 60.5 + nameW + 5.6, 93.9, "sTime", soft, { maxW: 50 });

  // audio row: 3 signal bars, "Artist" semibold + " · Song" regular, chevron
  [4.5, 6.5, 8.5].forEach((bh, i) => rect(60.5 + i * 4, 115.8 - bh, 2.6, bh, white, 1.3));
  const song = ` · ${s.song ?? ""}`;
  ops.push({
    t: "text", runs: [[s.artist ?? "", 600], [song, 400, soft]], text: "", x: pt(76), y: Y(111.7),
    s: pt(14), color: white, weight: 400, align: "left", maxW: pt(170), font: FB_FONT, ls: pt(fbTrack(14)),
  });
  const audioW = Math.min(tw(s.artist, "sSongB") + tw(song, "sSong"), 170);
  icon("chevDown", 76 + audioW + 10, 111.7, 16, soft);

  // top-right controls
  icon("chevDown", 328, 102.8, 26, white);
  icon("dots", 372, 102.8, 37, white);
  icon("stClose", 416, 102.8, 23, white);

  // mute button: 32pt, translucent with a hairline white ring
  rect(11.8, 141, 32, 32, "rgba(0,0,0,0.4)", 16, "rgba(255,255,255,0.85)", 0.8);
  icon("speakerOff", 27.8, 157, 20, white);

  // reply row: 40pt circles, 40pt pill, centers 48pt apart
  const RY = 885.7, BTN = "#404142";
  dot(24.9, RY, 20, BTN);
  icon("repost", 24.9, RY, 23, white);
  rect(53, RY - 20, 262.7, 40, BTN, 20);
  T("Send message...", 69.4, RY, "sReply", "rgba(255,255,255,0.9)");

  // reactions: 40pt badges, centers 48pt apart. The last one is cut off by the screen edge, like the screenshot.
  [[FB_LOVE_BADGE, 344], [FB_LIKE_BADGE.replace(/\(/g, "%28").replace(/\)/g, "%29"), 391.8], [FB_HAHA_BADGE, 439.7]].forEach(([src, cx]) =>
    ops.push({ t: "image", src, cx: pt(cx), cy: Y(RY), r: pt(20), sq: true })
  );

  return finish(Y(MEDIA_TOP), Y(MEDIA_BOTTOM) - Y(MEDIA_TOP), [{ t: "rect", x: 0, y: 0, w, h, fill: "#000000", r: 0 }]);
}

// Builds the overlay as plain shapes in frame-local px, so the DOM and the canvas export draw the same thing.
// The media slot for each platform/mode, in frame px. Chrome bars are drawn over everything outside it.
function socialMediaRect(s, w, h) {
  const u = Math.min(w, h * 0.5625) / 100;
  const mode = modeOf(s.platform, s.mode).value;
  const band = (top, bottom) => ({ x: 0, y: top, w, h: bottom - top });
  switch (s.platform) {
    case "instagram":
      if (mode === "story") return band(14 * u, h - 25.6 * u);
      if (mode === "reels") return band(0, h - 18.9 * u);
            return band((IG_POST_STATUS_H + 12) * u, h - 50 * u);
    case "tiktok": {
      if (mode === "story") {
        const pt = (n) => (n * u * 100) / 390;
        return band(pt(TTS_TOP), h - pt(TTS_H - 760));
      }
      return band(0, h - (87 * u * 100) / 414);
    }
    case "facebook":
      return mode === "story" ? band(0, h) : band(13 * u, h - 32 * u);
    default:
      return band(0, h); // whatsapp status
  }
}

// Phone layouts are authored for a ~9:16 screen. On anything wider (tablets, desktop, landscape frames)
// they render as a centered column, and the sides are filled with the app's own background.
const SOCIAL_COLUMN_RATIO = 0.5625;

function socialSideColor(s) {
  const themed = modeOf(s.platform, s.mode).themed;
  const dark = s.theme === "dark";
  switch (s.platform) {
    case "linkedin": return dark ? "#1C1E23" : "#FFFFFF";
    case "facebook": return !themed ? "#000000" : dark ? "#242526" : "#FFFFFF";
    case "instagram": return !themed || dark ? "#0B0F14" : "#FFFFFF";
    default: return "#000000"; // TikTok, WhatsApp status
  }
}

// ---------- Wide layouts: tablets in landscape and desktop ----------
const WIDE_RATIO = 1.1; // w / h at or above this uses the web / tablet layouts
const WIDE_H = 820; // layouts are authored at this height; width follows the screen

function wideKit(s, w, h, font) {
  const k = h / WIDE_H;
  const W = w / k;
  const P = (n) => n * k;
  const ops = [];
  const initial = ((s.name ?? "").replace(/^@/, "").trim()[0] || "?").toUpperCase();
  const rect = (x, y, rw, rh, fill, r = 0, stroke, sw = 1) =>
    ops.push({ t: "rect", x: P(x), y: P(y), w: P(rw), h: P(rh), fill, r: P(r), stroke, sw: stroke ? Math.max(1, P(sw)) : undefined });
  const grad = (x, y, gw, gh, from, to) => ops.push({ t: "vgrad", x: P(x), y: P(y), w: P(gw), h: P(gh), from, to });
  const dot = (cx, cy, r, fill) => ops.push({ t: "circle", cx: P(cx), cy: P(cy), r: P(r), fill });
  const ring = (cx, cy, r, colors) => ops.push({ t: "circle", cx: P(cx), cy: P(cy), r: P(r), grad: colors });
  const icon = (name, cx, cy, box, color) =>
    ops.push({ t: "icon", name, cx: P(cx), cy: P(cy), size: (P(box) * 24) / (ICONS[name].vb?.[0] ?? 24), color });
  const T = (str, x, cy, size, weight, color, o = {}) =>
    ops.push({ t: "text", text: str ?? "", x: P(x), y: P(cy), s: P(size), color, weight, align: o.align ?? "left", maxW: o.maxW && P(o.maxW), font });
  const runs = (list, x, cy, size, color, maxW) =>
    ops.push({ t: "text", runs: list, text: "", x: P(x), y: P(cy), s: P(size), color, weight: 400, align: "left", maxW: maxW && P(maxW), font });
  const tw = (str, size, weight) => igTextW(str, P(size), weight, font) / k;
  const wrap = (str, size, weight, maxW) => igWrap(str, P(size), weight, P(maxW), font);
  const img = (src, cx, cy, r, sq) => ops.push({ t: "image", src, cx: P(cx), cy: P(cy), r: P(r), sq });
  const avatar = (cx, cy, r) => {
    if (s.avatar) return img(s.avatar, cx, cy, r);
    dot(cx, cy, r, "#B8B8BE");
    ops.push({ t: "text", text: initial, x: P(cx), y: P(cy), s: P(r * 0.9), color: "#3A3A3C", weight: 700, align: "center", font });
  };
  const media = (x, y, mw, mh) => ops.push({ t: "media", src: s.media ?? null, x: P(x), y: P(y), w: P(mw), h: P(mh) });
  const bg = (fill) => ops.push({ t: "rect", x: 0, y: 0, w, h, fill, r: 0 });
  const pill = (str, cx, cy, fill, color = "#FFFFFF", size = 11) => {
    if (!str) return;
    const bw = Math.max(16, tw(str, size, 600) + 8);
    rect(cx - bw / 2, cy - 8, bw, 16, fill, 8);
    T(str, cx, cy, size, 600, color, { align: "center" });
  };

  // Centered 9:16 story / status card with progress bar, header and reply row.
  const storyCard = ({ x, y = 30, cw = 428, ch = 760, name, time, stacked = false, caption, reply = "Send message...", trail = ["heart", "send"], badges, segs = 4 }) => {
    media(x, y, cw, ch);
    grad(x, y, cw, 130, "rgba(0,0,0,0.5)", "rgba(0,0,0,0)");
    grad(x, y + ch - 150, cw, 150, "rgba(0,0,0,0)", "rgba(0,0,0,0.55)");
    const gap = 3, sw = (cw - 24 - gap * (segs - 1)) / segs;
    for (let i = 0; i < segs; i++) {
      rect(x + 12 + i * (sw + gap), y + 12, sw, 2.5, "rgba(255,255,255,0.35)", 1.2);
      if (i === 0) rect(x + 12, y + 12, sw * 0.4, 2.5, "#FFFFFF", 1.2);
    }
    const hy = y + 46;
    avatar(x + 30, hy, 16);
    if (stacked) {
      T(name, x + 56, hy - 8, 14, 600, "#FFFFFF", { maxW: 190 });
      T(time, x + 56, hy + 9, 12, 400, "rgba(255,255,255,0.8)", { maxW: 190 });
    } else {
      T(name, x + 56, hy, 14, 600, "#FFFFFF", { maxW: 190 });
      T(time, x + 56 + Math.min(tw(name, 14, 600), 190) + 8, hy, 13, 400, "rgba(255,255,255,0.75)", { maxW: 80 });
    }
    icon("dots", x + cw - 56, hy, 24, "#FFFFFF");
    icon("stClose", x + cw - 24, hy, 16, "#FFFFFF");
    const ry = y + ch - 40;
    if (caption) {
      const lines = wrap(caption, 17, 400, cw - 56).slice(0, 3);
      lines.forEach((ln, i) => T(ln, x + cw / 2, ry - 62 - (lines.length - 1 - i) * 22, 17, 400, "#FFFFFF", { align: "center" }));
    }
    rect(x + 14, ry - 22, cw - (badges ? 150 : 108), 44, caption ? "rgba(255,255,255,0.2)" : null, 22, caption ? undefined : "rgba(255,255,255,0.65)", 1.2);
    T(reply, x + 34, ry, 15, 400, "rgba(255,255,255,0.9)");
    if (badges) badges.forEach((src, i) => img(src, x + cw - 100 + i * 38, ry, 15, true));
    else trail.forEach((ic, i) => icon(ic, x + cw - 66 + i * 38, ry, 24, "#FFFFFF"));
  };

  return { W, ops, rect, grad, dot, ring, icon, T, runs, tw, wrap, img, avatar, media, bg, pill, storyCard };
}

// ----- Instagram -----
function instagramWideOps(s, w, h) {
  const mode = modeOf("instagram", s.mode).value;
  const dark = mode !== "post" || s.theme === "dark";
  const c = dark
    ? { bg: "#000000", fg: "#F5F5F5", sub: "#A8A8A8", line: "#262626" }
    : { bg: "#FFFFFF", fg: "#262626", sub: "#737373", line: "#DBDBDB" };
  const K = wideKit(s, w, h, IG_FONT);
  const { W, ops, rect, grad, dot, ring, icon, T, runs, tw, img, avatar, media, bg, storyCard } = K;
  const white = "#FFFFFF";

  if (mode === "story") {
    bg("#1A1A1A");
    T("Instagram", 28, 40, 22, 700, white);
    icon("close", W - 36, 40, 24, white);
    storyCard({ x: (W - 428) / 2, name: s.name, time: s.extra });
    return ops;
  }

  bg(c.bg);
  const rail = W < 1000;
  const SB = rail ? 72 : 244;
  rect(SB - 1, 0, 1, WIDE_H, c.line);
  if (rail) {
    rect(25, 26, 22, 22, null, 6, c.fg, 1.8);
    rect(32, 33, 8, 8, null, 4, c.fg, 1.8);
  } else T("Instagram", 24, 40, 22, 700, c.fg);
  const active = mode === "reels" ? 2 : 0;
  const items = [["home", "Home"], ["search", "Search"], ["reels", "Reels"], ["send", "Messages"], ["heart", "Notifications"], ["liPlus", "Create"]];
  items.forEach(([ic, label], i) => {
    const y = 108 + i * 52;
    icon(ic, 36, y, 24, c.fg);
    if (!rail) T(label, 64, y, 16, i === active ? 700 : 400, c.fg);
  });
  const py = 108 + items.length * 52;
  avatar(36, py, 12);
  if (!rail) T("Profile", 64, py, 16, 400, c.fg);
  icon("menu", 36, 780, 24, c.fg);
  if (!rail) T("More", 64, 780, 16, 400, c.fg);

  if (mode === "reels") {
    const VW = 428, VH = 760, vy = 30;
    const gx = SB + (W - SB - VW - 90) / 2;
    media(gx, vy, VW, VH);
    grad(gx, vy + VH - 260, VW, 260, "rgba(0,0,0,0)", "rgba(0,0,0,0.6)");
    const lx = gx + 16, ay = vy + VH - 134;
    avatar(lx + 16, ay, 16);
    T(s.name, lx + 42, ay, 14, 600, white, { maxW: 170 });
    const fx = lx + 42 + Math.min(tw(s.name, 14, 600), 170) + 12;
    rect(fx, ay - 14, 64, 28, null, 8, white, 1);
    T("Follow", fx + 32, ay, 13, 600, white, { align: "center" });
    T(s.caption, lx, vy + VH - 92, 14, 400, white, { maxW: VW - 32 });
    const audio = [s.artist, s.song].filter(Boolean).join(" · ");
    if (audio) {
      icon("music", lx + 8, vy + VH - 60, 14, "rgba(255,255,255,0.85)");
      T(audio, lx + 22, vy + VH - 60, 13, 400, "rgba(255,255,255,0.85)", { maxW: VW - 60 });
    }
    const rx = gx + VW + 44;
    [["heart", s.extra], ["comment", s.comments], ["repost", s.reposts], ["send", s.shares], ["bookmark", s.saves]].forEach(([ic, n], i) => {
      const y = 480 + i * 60;
      icon(ic, rx, y, 26, c.fg);
      T(n, rx, y + 24, 12, 600, c.fg, { align: "center" });
    });
    icon("menuV", rx, 778, 24, c.fg);
    return ops;
  }

  // ----- Post -----
  const FEED = 470, showRight = W - SB > 900;
  const group = FEED + (showRight ? 64 + 320 : 0);
  const gx = SB + (W - SB - group) / 2;
  ["alex", "mia", "jonah", "sara", "leo", "nina"].forEach((n, i) => {
    const cx = gx + 36 + i * 74;
    ring(cx, 56, 32, ["#F9CE34", "#EE2A7B", "#6228D7"]);
    dot(cx, 56, 30, c.bg);
    img(IG_LIKER_DEFAULT, cx, 56, 28);
    T(n, cx, 102, 12, 400, c.sub, { align: "center", maxW: 68 });
  });
  avatar(gx + 16, 150, 16);
  T(s.name, gx + 42, 150, 14, 600, c.fg, { maxW: 200 });
  T(`• ${s.time ?? ""}`, gx + 42 + Math.min(tw(s.name, 14, 600), 200) + 8, 150, 14, 400, c.sub);
  icon("menu", gx + FEED - 10, 150, 24, c.fg);
  media(gx, 180, FEED, 480);

  const ay = 688;
  let x = gx;
  [["heart", s.extra], ["comment", s.comments], ["repost", s.reposts], ["send", s.shares]].forEach(([ic, n]) => {
    icon(ic, x + 12, ay, 24, c.fg);
    T(n, x + 30, ay, 13, 600, c.fg);
    x += 30 + tw(n, 13, 600) + 18;
  });
  icon("bookmark", gx + FEED - 10, ay, 24, c.fg);
  runs([["Liked by ", 400], [s.likedBy, 600], [" and ", 400], [s.likedOthers, 600]], gx, 722, 14, c.fg, FEED);
  const cap = s.caption ?? "", long = cap.length > 56;
  runs([[s.name ?? "", 600], [" " + (long ? cap.slice(0, 56) + "…" : cap), 400], ...(long ? [[" more", 400, c.sub]] : [])], gx, 746, 14, c.fg, FEED);
  T(`View all ${s.comments} comments`, gx, 770, 14, 400, c.sub, { maxW: FEED });

  if (showRight) {
    const rx = gx + FEED + 64;
    avatar(rx + 22, 56, 22);
    T(s.name, rx + 56, 48, 14, 600, c.fg, { maxW: 200 });
    T("Your profile", rx + 56, 66, 14, 400, c.sub);
    T("Switch", rx + 320, 56, 12, 600, "#0095F6", { align: "right" });
    T("Suggested for you", rx, 116, 14, 600, c.sub);
    T("See all", rx + 320, 116, 12, 600, c.fg, { align: "right" });
    ["alex.rivera", "mia.chen", "jonah_k", "sara.lopez", "leo.park"].forEach((n, i) => {
      const y = 160 + i * 56;
      img(IG_LIKER_DEFAULT, rx + 22, y, 22);
      T(n, rx + 56, y - 8, 14, 600, c.fg, { maxW: 180 });
      T("Suggested for you", rx + 56, y + 10, 12, 400, c.sub);
      T("Follow", rx + 320, y, 12, 600, "#0095F6", { align: "right" });
    });
    T("About · Help · Press · API · Jobs · Privacy · Terms", rx, 470, 11, 400, c.sub, { maxW: 320 });
  }
  return ops;
}

// ----- TikTok -----
function tiktokWideOps(s, w, h) {
  const mode = modeOf("tiktok", s.mode).value;
  const K = wideKit(s, w, h, TT_FONT);
  const { W, ops, rect, grad, dot, icon, T, img, avatar, media, bg, pill, storyCard } = K;
  const white = "#FFFFFF", sub = "rgba(255,255,255,0.6)", line = "rgba(255,255,255,0.12)";
  bg("#121212");
  const rail = W < 1000;
  const SB = rail ? 72 : 240;

  icon("tkMusic", 36, 40, 22, white);
  if (!rail) T("TikTok", 56, 40, 24, 700, white);
  if (rail) icon("tkSearch", 36, 92, 20, white);
  else {
    rect(16, 72, SB - 32, 40, "#2A2A2A", 20);
    icon("tkSearch", 38, 92, 16, sub);
    T("Search", 56, 92, 14, 400, sub);
  }
  [["tkHome", "For You"], ["tkFriends", "Friends"], ["tkLive", "LIVE"], ["tkPlus", "Upload"], ["tkInbox", "Inbox"], ["tkProfile", "Profile"]].forEach(([ic, label], i) => {
    const y = 160 + i * 52, on = i === 0, col = on ? TT_RED : white;
    icon(ic, 36, y, 24, col);
    if (!rail) T(label, 66, y, 17, on ? 700 : 600, col);
    if (i === 1) pill(s.friendsBadge, 50, y - 12, TT_RED);
    if (i === 4) pill(s.inboxBadge, 50, y - 12, TT_RED);
  });
  rect(SB - 1, 0, 1, WIDE_H, line);

  const VW = 428, VH = 760, vy = 30;
  if (mode === "story") {
    icon("tkClose", W - 36, 40, 20, white);
    storyCard({ x: SB + (W - SB - VW) / 2, name: s.name, time: s.extra, reply: "Send a message..." });
    return ops;
  }
  const gx = SB + (W - SB - VW - 100) / 2;
  media(gx, vy, VW, VH);
  grad(gx, vy + VH - 240, VW, 240, "rgba(0,0,0,0)", "rgba(0,0,0,0.55)");
  T(s.name, gx + 16, vy + VH - 100, 17, 700, white, { maxW: VW - 32 });
  T(s.caption, gx + 16, vy + VH - 70, 15, 400, white, { maxW: VW - 32 });
  icon("tkMusic", gx + 24, vy + VH - 40, 14, white);
  T(s.sound, gx + 40, vy + VH - 40, 14, 500, white, { maxW: VW - 70 });

  const rx = gx + VW + 48;
  dot(rx, 372, 24, "#FFFFFF");
  if (s.avatar) img(s.avatar, rx, 372, 22);
  else avatar(rx, 372, 22);
  dot(rx, 396, 10, TT_RED);
  icon("tkPlus", rx, 396, 22, white);
  [["tkHeart", s.extra], ["tkComment", s.comments], ["tkBookmark", s.saves], ["tkShare", s.shares]].forEach(([ic, n], i) => {
    const y = 456 + i * 78;
    dot(rx, y, 22, "rgba(255,255,255,0.12)");
    icon(ic, rx, y, 24, white);
    T(n, rx, y + 36, 13, 600, white, { align: "center" });
  });
  img(s.soundAvatar || s.avatar || TT_SOUND_DEFAULT, rx, 770, 20);
  return ops;
}

// ----- WhatsApp (status) -----
function whatsappWideOps(s, w, h) {
  const K = wideKit(s, w, h, WA_FONT);
  const { W, ops, rect, dot, icon, T, img, avatar, bg, storyCard } = K;
  const panel = "#111B21", viewer = "#0B141A", line = "#222D34", text = "#E9EDEF", sub = "#8696A0", green = "#00A884";
  bg(viewer);
  const LW = W < 900 ? 0 : 400;
  if (LW) {
    rect(0, 0, LW, WIDE_H, panel);
    rect(LW - 1, 0, 1, WIDE_H, line);
    T("Status", 24, 40, 22, 700, text);
    icon("liPlus", LW - 74, 40, 18, sub);
    icon("menuV", LW - 30, 40, 24, sub);
    dot(44, 112, 24, "#2A3942");
    icon("liPlus", 44, 112, 18, text);
    T("My status", 84, 104, 16, 500, text);
    T("Click to add status update", 84, 124, 13, 400, sub);
    T("RECENT", 24, 178, 13, 500, green);
    [[s.name, s.extra, true], ["Maya", "Today, 4:12 AM"], ["Chris", "Today, 2:30 AM"], ["Priya", "Yesterday, 11:08 PM"]].forEach(([n, t, on], i) => {
      const y = 236 + i * 76;
      if (on) rect(0, y - 38, LW - 1, 76, "#2A3942");
      dot(44, y, 27, green);
      dot(44, y, 25, on ? "#2A3942" : panel);
      if (on) avatar(44, y, 23);
      else img(IG_LIKER_DEFAULT, 44, y, 23);
      T(n, 86, y - 10, 16, 500, text, { maxW: LW - 110 });
      T(t, 86, y + 12, 13, 400, sub, { maxW: LW - 110 });
    });
  }
  icon("stClose", W - 36, 40, 20, text);
  storyCard({ x: LW + (W - LW - 428) / 2, y: 40, ch: 740, name: s.name, time: s.extra, stacked: true, caption: s.caption, reply: "Reply", trail: ["heart"], segs: 1 });
  return ops;
}

// ----- LinkedIn -----
function linkedinWideOps(s, w, h) {
  const dark = s.theme === "dark";
  const c = dark ? LI_DARK : LI_LIGHT;
  const K = wideKit(s, w, h, LI_FONT);
  const { W, ops, rect, dot, icon, T, runs, tw, wrap, img, avatar, media, bg, pill } = K;
  bg(dark ? "#000000" : "#F4F2EE");

  const CW = Math.min(W - 48, 1128), X0 = (W - CW) / 2;
  rect(0, 0, W, 56, c.bar);
  rect(0, 56, W, 1, c.div);
  rect(X0, 11, 34, 34, "#0A66C2", 6);
  T("in", X0 + 17, 29, 22, 700, "#FFFFFF", { align: "center" });
  rect(X0 + 46, 10, 280, 36, dark ? "#38434F" : "#EDF3F8", 6);
  icon("liSearch", X0 + 68, 28, 16, c.sub);
  T("Search", X0 + 86, 28, 14, 400, c.sub);
  const NW = 84, nx0 = X0 + CW - NW * 6;
  [["liHome", "Home"], ["liNetwork", "My Network"], ["liJobs", "Jobs"], ["liMsg", "Messaging"], ["liBell", "Notifications"]].forEach(([ic, label], i) => {
    const cx = nx0 + i * NW + NW / 2, on = i === 0, col = on ? c.active : c.sub;
    icon(ic, cx, 20, 22, col);
    T(label, cx, 44, 12, on ? 500 : 400, col, { align: "center" });
    if (on) rect(nx0 + i * NW, 54, NW, 2, c.active);
  });
  pill(s.badge, nx0 + 4 * NW + NW / 2 + 12, 12, c.badge, c.badgeText);
  const meX = nx0 + 5 * NW + NW / 2;
  avatar(meX, 20, 12);
  T("Me", meX, 44, 12, 400, c.sub, { align: "center" });

  const leftOn = CW >= 780, rightOn = CW >= 1050, LW = 225, RW = 300, GAP = 24;
  const center = Math.min(600, CW - (leftOn ? LW + GAP : 0) - (rightOn ? RW + GAP : 0));
  const total = (leftOn ? LW + GAP : 0) + center + (rightOn ? GAP + RW : 0);
  const gx = (W - total) / 2;
  const lx = gx, px = gx + (leftOn ? LW + GAP : 0), rx = px + center + GAP;

  if (leftOn) {
    rect(lx, 72, LW, 222, c.bg, 8, c.div, 1);
    const cover = dark ? "#3E4A5A" : "#A0B4B7";
    rect(lx, 72, LW, 54, cover, 8);
    rect(lx, 100, LW, 26, cover);
    dot(lx + 112, 126, 38, c.bg);
    avatar(lx + 112, 126, 36);
    T(s.name, lx + 112, 178, 16, 600, c.text, { align: "center", maxW: 200 });
    T(s.headline, lx + 112, 198, 12, 400, c.sub, { align: "center", maxW: 200 });
    rect(lx, 226, LW, 1, c.div);
    T("Profile viewers", lx + 16, 248, 12, 600, c.sub);
    T("41", lx + LW - 16, 248, 12, 600, c.link, { align: "right" });
    T("View all analytics", lx + 16, 272, 12, 600, c.text);
  }

  rect(px, 72, center, 64, c.bg, 8, c.div, 1);
  avatar(px + 36, 104, 22);
  rect(px + 72, 86, center - 88, 36, null, 18, c.border, 1);
  T("Start a post", px + 92, 104, 14, 600, c.sub);

  let lines = wrap(s.caption, 14, 400, center - 32);
  const clipped = lines.length > 3;
  lines = lines.slice(0, 3);
  if (clipped) {
    let last = lines[2];
    while (last.length > 1 && tw(`${last}…more`, 14, 400) > center - 32) last = last.slice(0, -1).trimEnd();
    lines[2] = last;
  }
  const capY = 248, mediaY = capY + lines.length * 20 + 6, mediaH = 300;
  const ry = mediaY + mediaH + 22, bottom = ry + 74;
  rect(px, 148, center, bottom - 148, c.bg, 8, c.div, 1);
  avatar(px + 36, 190, 24);
  T(s.name, px + 70, 180, 15, 600, c.text, { maxW: center - 220 });
  T(s.headline, px + 70, 198, 12, 400, c.sub2, { maxW: center - 220 });
  T(s.time, px + 70, 214, 12, 400, c.sub);
  icon("liGlobe", px + 70 + tw(s.time, 12, 400) + 16, 214, 12, c.icon);
  icon("liPlus", px + center - 72, 188, 16, c.link);
  T("Follow", px + center - 16, 188, 15, 600, c.link, { align: "right" });
  lines.forEach((ln, i) => {
    if (clipped && i === 2) runs([[`${ln}…`, 400], ["more", 400, c.sub]], px + 16, capY + i * 20, 14, c.text, center - 32);
    else T(ln, px + 16, capY + i * 20, 14, 400, c.text);
  });
  media(px, mediaY, center, mediaH);
  [[LI_CELEBRATE_BADGE, 40], [LI_LOVE_BADGE, 28], [LI_LIKE_BADGE, 16]].forEach(([src, dx]) => {
    dot(px + dx + 8, ry, 9.5, c.bg);
    img(src, px + dx + 8, ry, 8, true);
  });
  T(s.extra, px + 70, ry, 12, 400, c.sub);
  const repW = tw(s.reposts, 12, 400);
  T(s.reposts, px + center - 16, ry, 12, 400, c.sub, { align: "right" });
  dot(px + center - 16 - repW - 8, ry, 1.3, c.sub);
  T(s.comments, px + center - 16 - repW - 16, ry, 12, 400, c.sub, { align: "right" });
  rect(px + 12, ry + 16, center - 24, 1, c.div);
  [["liLike", "Like"], ["liComment", "Comment"], ["liRepost", "Repost"], ["liSend", "Send"]].forEach(([ic, label], i) => {
    const cx = px + (center * (i + 0.5)) / 4, tot = 20 + 8 + tw(label, 14, 600), x0 = cx - tot / 2;
    icon(ic, x0 + 10, ry + 44, 20, c.icon);
    T(label, x0 + 28, ry + 44, 14, 600, c.icon);
  });

  if (rightOn) {
    rect(rx, 72, RW, 330, c.bg, 8, c.div, 1);
    T("LinkedIn News", rx + 16, 98, 16, 600, c.text);
    ["Hiring rebounds across tech", "Design roles lead new openings", "Remote work: what comes next", "Startups raise record rounds", "AI tools reshape workflows"].forEach((n, i) => {
      const y = 134 + i * 52;
      dot(rx + 20, y - 6, 2.5, c.text);
      T(n, rx + 32, y - 6, 13, 600, c.text, { maxW: RW - 48 });
      T("Top news · 3,412 readers", rx + 32, y + 12, 12, 400, c.sub, { maxW: RW - 48 });
    });
  }
  return ops;
}

// ----- Facebook -----
function facebookWideOps(s, w, h) {
  const mode = modeOf("facebook", s.mode).value;
  const dark = mode !== "post" || s.theme === "dark";
  const c = dark ? FB_DARK : FB_LIGHT;
  const K = wideKit(s, w, h, FB_FONT);
  const { W, ops, rect, grad, dot, icon, T, runs, tw, wrap, img, avatar, media, bg, pill, storyCard } = K;
  const white = "#FFFFFF";
  const chipBg = dark ? "#3A3B3C" : "#F0F2F5";
  const likeBadge = FB_LIKE_BADGE.replace(/\(/g, "%28").replace(/\)/g, "%29");

  if (mode === "story") {
    bg("#000000");
    dot(36, 36, 20, "#1877F2");
    T("f", 36, 39, 28, 700, white, { align: "center" });
    icon("stClose", W - 36, 36, 20, white);
    storyCard({ x: (W - 428) / 2, name: s.name, time: s.extra, badges: [FB_LOVE_BADGE, likeBadge, FB_HAHA_BADGE] });
    return ops;
  }

  bg(mode === "post" ? (dark ? "#18191A" : "#F0F2F5") : "#000000");
  rect(0, 0, W, 56, c.bg);
  rect(0, 56, W, 1, c.hair);
  dot(36, 28, 20, "#1877F2");
  T("f", 36, 31, 28, 700, white, { align: "center" });
  if (W >= 900) {
    rect(66, 8, 250, 40, chipBg, 20);
    icon("search", 90, 28, 16, c.sub);
    T("Search Facebook", 108, 28, 15, 400, c.sub);
  } else {
    dot(86, 28, 20, chipBg);
    icon("search", 86, 28, 16, c.sub);
  }
  const activeNav = mode === "reels" ? 1 : 0;
  [["fbHome", 0], ["fbReels", 1], ["fbMarket", 2], ["fbFriends", 3]].forEach(([ic, i]) => {
    const cx = W / 2 + (i - 1.5) * 100, on = i === activeNav;
    icon(ic, cx, 28, 26, on ? c.link : c.sub);
    if (on) rect(cx - 40, 53, 80, 3, c.link, 1.5);
  });
  pill(s.reelsBadge, W / 2 - 50 + 14, 14, "#E41E3F");
  [["menu", W - 174], ["comment", W - 126], ["fbBell", W - 78]].forEach(([ic, cx]) => {
    dot(cx, 28, 20, chipBg);
    icon(ic, cx, 28, 22, c.text);
  });
  pill(s.notifBadge, W - 78 + 14, 12, "#E41E3F");
  avatar(W - 30, 28, 20);

  if (mode === "reels") {
    const VH = 730, VW = 411, vy = 70, gx = (W - VW) / 2;
    media(gx, vy, VW, VH);
    grad(gx, vy + VH - 240, VW, 240, "rgba(0,0,0,0)", "rgba(0,0,0,0.55)");
    avatar(gx + 34, vy + VH - 112, 18);
    T(s.name, gx + 62, vy + VH - 112, 15, 600, white, { maxW: 200 });
    T("Follow", gx + VW - 20, vy + VH - 112, 14, 600, white, { align: "right" });
    icon("music", gx + 24, vy + VH - 76, 14, white);
    T(s.sound, gx + 40, vy + VH - 76, 14, 500, white, { maxW: VW - 70 });
    T(s.caption, gx + 16, vy + VH - 44, 15, 400, white, { maxW: VW - 32 });
    const rx = gx + VW + 44;
    [["thumbsUp", s.extra], ["comment", s.comments], ["stShare", s.shares], ["bookmark", s.saves]].forEach(([ic, n], i) => {
      const y = 460 + i * 80;
      dot(rx, y, 24, "rgba(255,255,255,0.12)");
      icon(ic, rx, y, 24, white);
      T(n, rx, y + 38, 13, 500, white, { align: "center" });
    });
    return ops;
  }

  const leftOn = W >= 1000, rightOn = W >= 1250, LW = 280, RW = 300;
  const space0 = leftOn ? LW : 0, space1 = W - (rightOn ? RW : 0);
  const FW = Math.min(680, space1 - space0 - 48);
  const fx = space0 + (space1 - space0 - FW) / 2;

  if (leftOn) {
    avatar(40, 92, 18);
    T(s.name, 70, 92, 16, 600, c.text, { maxW: 190 });
    [["fbFriends", "Friends"], ["fbReels", "Reels"], ["fbMarket", "Marketplace"], ["bookmark", "Saved"]].forEach(([ic, label], i) => {
      const y = 144 + i * 52;
      icon(ic, 40, y, 26, c.link);
      T(label, 70, y, 16, 500, c.text);
    });
  }

  const lines0 = wrap(s.caption, 15, 400, FW - 32);
  const clipped = lines0.length > 2;
  const lines = lines0.slice(0, 2);
  if (clipped) {
    let last = lines[1];
    while (last.length > 1 && tw(`${last}… See more`, 15, 600) > FW - 32) last = last.slice(0, -1).trimEnd();
    lines[1] = last;
  }
  const mediaY = 156 + lines.length * 20 + 10, mediaH = 460;
  const ry = mediaY + mediaH + 22, bottom = ry + 68;
  rect(fx, 72, FW, bottom - 72, c.bg, 8, c.hair, 1);
  avatar(fx + 36, 112, 20);
  T(s.name, fx + 68, 104, 15, 600, c.text, { maxW: FW - 200 });
  T(s.time, fx + 68, 122, 13, 400, c.sub);
  icon("globe", fx + 68 + tw(s.time, 13, 400) + 16, 122, 13, c.sub);
  icon("menu", fx + FW - 62, 112, 24, c.sub);
  icon("stClose", fx + FW - 26, 112, 18, c.sub);
  lines.forEach((ln, i) => {
    if (clipped && i === 1) runs([[`${ln}… `, 400], ["See more", 600, c.sub]], fx + 16, 156 + i * 20, 15, c.text, FW - 32);
    else T(ln, fx + 16, 156 + i * 20, 15, 400, c.text);
  });
  media(fx, mediaY, FW, mediaH);
  img(likeBadge, fx + 26, ry, 9, true);
  T(s.extra, fx + 42, ry, 13, 400, c.sub);
  T(s.shares, fx + FW - 16, ry, 13, 400, c.sub, { align: "right" });
  T(s.comments, fx + FW - 16 - tw(s.shares, 13, 400) - 12, ry, 13, 400, c.sub, { align: "right" });
  rect(fx + 12, ry + 16, FW - 24, 1, c.hair);
  [["thumbsUp", "Like"], ["comment", "Comment"], ["stShare", "Share"]].forEach(([ic, label], i) => {
    const cx = fx + (FW * (i + 0.5)) / 3, tot = 20 + 6 + tw(label, 14, 600), x0 = cx - tot / 2;
    icon(ic, x0 + 10, ry + 40, 22, c.sub);
    T(label, x0 + 26, ry + 40, 14, 600, c.sub);
  });

  if (rightOn) {
    const rx = W - RW + 16;
    T("Contacts", rx, 92, 16, 600, c.sub);
    ["Alex Morgan", "Maya Chen", "Chris Ortiz", "Priya Nair", "Jordan Lee", "Sam Rivera"].forEach((n, i) => {
      const y = 134 + i * 48;
      img(IG_LIKER_DEFAULT, rx + 18, y, 18);
      dot(rx + 30, y + 12, 6, c.navBg);
      dot(rx + 30, y + 12, 4.5, "#31A24C");
      T(n, rx + 48, y, 15, 500, c.text, { maxW: RW - 80 });
    });
  }
  return ops;
}

function wideSocialOps(s, w, h) {
  s = { ...socialDefaults(s.platform, s.mode), ...s };
  switch (s.platform) {
    case "instagram": return instagramWideOps(s, w, h);
    case "tiktok": return tiktokWideOps(s, w, h);
    case "whatsapp": return whatsappWideOps(s, w, h);
    case "linkedin": return linkedinWideOps(s, w, h);
    default: return facebookWideOps(s, w, h);
  }
}

function socialOps(s, w, h) {
  if (w / h >= WIDE_RATIO) return wideSocialOps(s, w, h);
  // taller than wide (phones, portrait tablets): phone layout as a centered column
  const cw = Math.min(w, h * SOCIAL_COLUMN_RATIO);
  const ox = (w - cw) / 2;
  const ops = buildSocialOps(s, cw, h);
  if (!ops.some((o) => o.t === "media")) {
    ops.unshift({ t: "media", src: s.media ?? null, ...socialMediaRect(s, cw, h) });
  }
  if (ox < 0.5) return ops;
  ops.forEach((o) => {
    if ("x" in o) o.x += ox;
    if ("cx" in o) o.cx += ox;
  });
  ops.unshift({ t: "rect", x: 0, y: 0, w, h, fill: socialSideColor(s), r: 0 });
  return ops;
}

function buildSocialOps(s, w, h) {
  if (s.platform === "facebook") return facebookOps(s, w, h);
  if (s.platform === "instagram") return instagramOps(s, w, h);
  if (s.platform === "whatsapp") return whatsappOps(s, w, h);
  if (s.platform === "tiktok") return modeOf("tiktok", s.mode).value === "story" ? tiktokStoryOps(s, w, h) : tiktokOps(s, w, h);
  if (s.platform === "linkedin") return linkedinOps(s, w, h);
  const u = Math.min(w, h * 0.5625) / 100;
  const dark = s.theme === "dark";
  const ops = [];
  const rect = (x, y, rw, rh, fill, r = 0) => ops.push({ t: "rect", x, y, w: rw, h: rh, fill, r });
  const grad = (x, y, gw, gh, from, to) => ops.push({ t: "vgrad", x, y, w: gw, h: gh, from, to });
  const dot = (cx, cy, r, fill) => ops.push({ t: "circle", cx, cy, r, fill });
  const text = (str, x, y, size, color, o = {}) =>
    ops.push({ t: "text", text: str ?? "", x, y, s: size, color, weight: o.weight ?? 500, align: o.align ?? "left", maxW: o.maxW });
  const handle = (s.name ?? "").replace(/^@/, "");
  const initial = (handle.trim()[0] || "?").toUpperCase();
  const mode = modeOf(s.platform, s.mode).value;

  // ----- shared story chrome -----
  const progress = (segs = 3) => {
    const gap = u, y = 3.5 * u, bh = Math.max(1, 0.7 * u);
    const sw = (w - 6 * u - gap * (segs - 1)) / segs;
    for (let i = 0; i < segs; i++) {
      const x = 3 * u + i * (sw + gap);
      rect(x, y, sw, bh, "rgba(255,255,255,0.35)", bh / 2);
      if (i === 0) rect(x, y, sw * 0.6, bh, "#FFFFFF", bh / 2);
    }
  };
  const storyTop = ({ label = handle, ring, segs = 3, stacked = false }) => {
    grad(0, 0, w, 24 * u, "rgba(0,0,0,0.5)", "rgba(0,0,0,0)");
    progress(segs);
    const cy = 11 * u, r = 3.6 * u, ax = 7.5 * u, nx = 14 * u;
    if (ring) {
      dot(ax, cy, r + 0.9 * u, ring);
      dot(ax, cy, r + 0.35 * u, "#000000");
    }
    dot(ax, cy, r, "#C7C7CC");
    text(initial, ax, cy, 3.2 * u, "#3A3A3C", { align: "center", weight: 700 });
    if (stacked) {
      text(label, nx, cy - 2 * u, 3.3 * u, "#FFFFFF", { weight: 600, maxW: w * 0.5 });
      text(s.extra, nx, cy + 2.4 * u, 2.6 * u, "rgba(255,255,255,0.75)", { weight: 400, maxW: w * 0.5 });
    } else {
      text(label, nx, cy, 3.3 * u, "#FFFFFF", { weight: 600, maxW: w * 0.4 });
      const nameW = Math.min(w * 0.4, (label ?? "").length * 1.9 * u);
      text(s.extra, nx + nameW + 2 * u, cy, 3 * u, "rgba(255,255,255,0.7)", { weight: 400, maxW: w * 0.2 });
    }
    text("•••", w - 11 * u, cy, 3 * u, "#FFFFFF", { align: "center" });
    text("✕", w - 4.5 * u, cy, 3.4 * u, "#FFFFFF", { align: "center" });
  };
  const storyText = () => {
    if (!s.caption) return;
    const bw = Math.min(w - 16 * u, s.caption.length * 2.1 * u + 8 * u);
    rect((w - bw) / 2, h * 0.5 - 4.5 * u, bw, 9 * u, "rgba(0,0,0,0.55)", 2.5 * u);
    text(s.caption, w / 2, h * 0.5, 3.6 * u, "#FFFFFF", { align: "center", weight: 600, maxW: bw - 6 * u });
  };
  const storyReply = (placeholder, icons) => {
    grad(0, h - 24 * u, w, 24 * u, "rgba(0,0,0,0)", "rgba(0,0,0,0.5)");
    const rw = w - 6 * u - icons.length * 8 * u;
    rect(3 * u, h - 13 * u, rw, 8.5 * u, "rgba(255,255,255,0.18)", 4.25 * u);
    text(placeholder, 7 * u, h - 8.75 * u, 3.3 * u, "rgba(255,255,255,0.9)", { weight: 400, maxW: rw - 8 * u });
    icons.forEach((ic, i) => text(ic, 3 * u + rw + 5 * u + i * 8 * u, h - 8.75 * u, 4.6 * u, "#FFFFFF", { align: "center" }));
  };

  switch (s.platform) {
    case "tiktok": {
      storyTop({ ring: "#FE2C55" });
      storyText();
      storyReply("Send a message...", ["♡", "➤"]);
      break;
    }
    case "facebook": {
      if (mode === "story") {
        storyTop({ label: s.name, ring: "#1877F2" });
        storyText();
        storyReply("Send message...", ["👍", "❤️"]);
        break;
      }
      const bg = dark ? "#242526" : "#FFFFFF";
      const fg = dark ? "#E4E6EB" : "#050505";
      const sub = dark ? "#B0B3B8" : "#65676B";
      const line = dark ? "#3E4042" : "#CED0D4";
      rect(0, 0, w, 13 * u, bg);
      dot(7 * u, 6.5 * u, 3.8 * u, "#1877F2");
      text(initial, 7 * u, 6.5 * u, 3.8 * u, "#FFFFFF", { align: "center", weight: 700 });
      text(s.name, 13 * u, 5 * u, 3.6 * u, fg, { weight: 600, maxW: w - 34 * u });
      text("Just now · 🌐", 13 * u, 9.2 * u, 2.7 * u, sub, { weight: 400 });
      text("•••", w - 11 * u, 6.5 * u, 3.2 * u, sub, { align: "center" });
      text("✕", w - 4.5 * u, 6.5 * u, 3.4 * u, sub, { align: "center" });
      rect(0, h - 32 * u, w, 32 * u, bg);
      text(s.caption, 4 * u, h - 27 * u, 3.4 * u, fg, { weight: 400, maxW: w - 8 * u });
      dot(6 * u, h - 19.5 * u, 2 * u, "#1877F2");
      text("👍", 6 * u, h - 19.5 * u, 2.2 * u, "#FFFFFF", { align: "center" });
      text(s.extra, 9.5 * u, h - 19.5 * u, 2.9 * u, sub, { weight: 400 });
      text("12 comments", w - 4 * u, h - 19.5 * u, 2.9 * u, sub, { align: "right", weight: 400 });
      rect(4 * u, h - 14.5 * u, w - 8 * u, Math.max(1, 0.25 * u), line);
      ["👍 Like", "💬 Comment", "↗ Share"].forEach((l, i) =>
        text(l, (w * (1 + 2 * i)) / 6, h - 7.5 * u, 3 * u, sub, { align: "center", weight: 600 })
      );
      break;
    }
    default: {
      // instagram
      if (mode === "story") {
        storyTop({ ring: "#E1306C" });
        storyText();
        storyReply("Send message", ["♡", "➤"]);
        break;
      }
      const bg = dark ? "#000000" : "#FFFFFF";
      const fg = dark ? "#FFFFFF" : "#262626";
      rect(0, 0, w, 12 * u, bg);
      dot(6.5 * u, 6 * u, 3.6 * u, "#E1306C");
      dot(6.5 * u, 6 * u, 3.1 * u, bg);
      dot(6.5 * u, 6 * u, 2.6 * u, "#C7C7CC");
      text(s.name, 12 * u, 6 * u, 3.6 * u, fg, { weight: 600, maxW: w - 24 * u });
      text("•••", w - 4 * u, 6 * u, 3.2 * u, fg, { align: "right" });
      rect(0, h - 26 * u, w, 26 * u, bg);
      text("♡", 4 * u, h - 20.5 * u, 6 * u, fg);
      dot(15 * u, h - 20.5 * u, 2.6 * u, fg);
      dot(15 * u, h - 20.5 * u, 2.2 * u, bg);
      text("➤", 22 * u, h - 20.5 * u, 5 * u, fg);
      rect(w - 7.5 * u, h - 23 * u, 3.6 * u, 5 * u, fg, 0.5 * u);
      rect(w - 7.1 * u, h - 22.6 * u, 2.8 * u, 4.2 * u, bg, 0.3 * u);
      text(`${s.extra} likes`, 4 * u, h - 13 * u, 3.3 * u, fg, { weight: 600 });
      text(`${s.name} ${s.caption}`, 4 * u, h - 7.5 * u, 3.2 * u, fg, { weight: 400, maxW: w - 8 * u });
      text("2 hours ago", 4 * u, h - 3 * u, 2.4 * u, dark ? "#A8A8A8" : "#8E8E8E", { weight: 400 });
    }
  }
  return ops;
}

const chromeKey = (f) => (f.img ? `${f.img.cropUrl ?? f.img.url}|${(f.w / f.h).toFixed(2)}` : null);

// Draws the image as object-cover at the frame's aspect, then averages the pixels behind
// the status bar and home indicator (same 440 x 956 layout paintPhoneChrome uses).
function sampleChromeColors(img, fw, fh) {
  try {
    const W = 120, H = Math.max(1, Math.round((W * fh) / fw));
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const k = Math.min(W / 440, H / 956);
    const ox = (W - 440 * k) / 2;
    const luma = (x, y, w, h) => {
      const px = Math.min(W - 1, Math.max(0, Math.round(ox + x * k)));
      const py = Math.min(H - 1, Math.max(0, Math.round(y * k)));
      const pw = Math.max(1, Math.min(W - px, Math.round(w * k)));
      const ph = Math.max(1, Math.min(H - py, Math.round(h * k)));
      const d = ctx.getImageData(px, py, pw, ph).data;
      let sum = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        n++;
      }
      return n ? sum / n / 255 : 0;
    };
    const status = (luma(58, 26, 44, 18) + luma(322, 26, 76, 18)) / 2;
    const home = luma(153, 925, 134, 24);
    return { status: status > 0.6 ? "#000000" : "#FFFFFF", home: home > 0.6 ? "#000000" : "#FFFFFF" };
  } catch {
    return null;
  }
}

// Phone chrome is drawn by the mockup's own canvas code (paintPhoneChrome), via a single "chrome" op.
function chromeOps(f, w, h, auto) {
  const s = f.social ?? DEFAULT_SOCIAL;
  const m = s.on ? modeOf(s.platform, s.mode) : null;
  const darkText = !!m && m.themed && s.theme !== "dark";
  // With a social UI on, its theme decides. Otherwise the image decides.
  const socialColor = s.on ? (darkText ? "#000000" : "#FFFFFF") : null;
  return [{
    t: "chrome", w, h,
    statusBar: !!f.statusBar,
    homeIndicator: !!f.homeIndicator,
    color: socialColor ?? "#FFFFFF",
    statusColor: socialColor ?? auto?.status ?? "#FFFFFF",
    homeColor: socialColor ?? auto?.home ?? "#FFFFFF",
  }];
}

function ChromeCanvas({ o }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(o.w * dpr);
    c.height = Math.round(o.h * dpr);
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    paintPhoneChrome(ctx, o.w, o.h, o);
    }, [o.w, o.h, o.statusBar, o.homeIndicator, o.color, o.statusColor, o.homeColor]);
  return <canvas ref={ref} className="absolute inset-0" style={{ width: o.w, height: o.h }} />;
}

function SocialOverlay({ social, width, height }) {
  const ops = socialOps(social, width, height);
  return (
    <div className="social-ui absolute inset-0 pointer-events-none overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
      {ops.map((o, i) => {
        if (o.t === "rect" || o.t === "vgrad") {
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: o.x, top: o.y, width: o.w, height: o.h, borderRadius: o.r || 0,
                background: o.t === "vgrad" ? `linear-gradient(to bottom, ${o.from}, ${o.to})` : o.fill || "transparent",
                boxShadow: [o.shadow && `${o.shadow.x}px ${o.shadow.y}px ${o.shadow.blur}px ${o.shadow.color}`, o.stroke && `inset 0 0 0 ${o.sw}px ${o.stroke}`].filter(Boolean).join(", ") || undefined,
              }}
            />
          );
        }
        if (o.t === "circle") {
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: o.cx - o.r, top: o.cy - o.r, width: o.r * 2, height: o.r * 2,
                background: o.grad ? `linear-gradient(45deg, ${o.grad.join(", ")})` : o.fill,
              }}
            />
          );
        }

                if (o.t === "chrome") return <ChromeCanvas key={i} o={o} />;

        if (o.t === "media") {
          return o.src ? (
            <div
              key={i}
              className="absolute bg-cover bg-center"
              style={{ left: o.x, top: o.y, width: o.w, height: o.h, backgroundImage: `url(${o.src})` }}
            />
          ) : (
            <div
              key={i}
              className="keep-size absolute flex items-center justify-center text-center font-semibold select-none"
              style={{
                left: o.x, top: o.y, width: o.w, height: o.h,
                background: "linear-gradient(180deg, #FFFFFF 0%, #FF47BC 100%)",
                color: "#FAF9FA", fontSize: Math.max(11, o.w * 0.05), lineHeight: 1.3,
              }}
            >
              <span style={{ maxWidth: "45%" }}>Drop your image here</span>
            </div>
          );
        }
        if (o.t === "image") {
          return (
            <div
              key={i}
              className={`absolute bg-center ${o.sq ? "bg-contain bg-no-repeat" : "rounded-full bg-cover"}`}
              style={{ left: o.cx - o.r, top: o.cy - o.r, width: o.r * 2, height: o.r * 2, backgroundImage: `url(${o.src})` }}
            />
          );
        }
        if (o.t === "icon") {
          const ic = ICONS[o.name];
          if (!ic) return null;
          const [vw, vh] = ic.vb || [24, 24];
          const k = o.size / 24;
          return (
            <svg
              key={i}
              viewBox={`0 0 ${vw} ${vh}`}
              fill={ic.fill ? o.color : "none"}
              fillRule={ic.rule || "nonzero"}
              stroke={ic.fill ? "none" : o.color}
              strokeWidth={ic.sw ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute"
              style={{ left: o.cx - (vw * k) / 2, top: o.cy - (vh * k) / 2, width: vw * k, height: vh * k, overflow: "visible" }}
            >
              {ic.d.map((d, j) => <path key={j} d={d} />)}
            </svg>
          );
        }
        const tx = o.align === "center" ? "-50%" : o.align === "right" ? "-100%" : "0";
        return (
          <span
            key={i}
            className="absolute block whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{ left: o.x, top: o.y, fontFamily: o.font, fontSize: o.s, fontWeight: o.weight, color: o.color, lineHeight: 1.25, letterSpacing: o.ls, maxWidth: o.maxW, transform: `translate(${tx}, -50%)` }}
          >
            {o.runs
              ? o.runs.map(([str, wt, col], k) => <span key={k} style={{ fontWeight: wt, color: col || o.color }}>{str}</span>)
              : o.text}
          </span>
        );
      })}
    </div>
  );
}

function paintSocial(ctx, ops, ox, oy, imgs) {
  ops.forEach((o) => {
    if (o.t === "rect" || o.t === "vgrad") {
      let fill = o.fill;
      if (o.t === "vgrad") {
        const g = ctx.createLinearGradient(0, oy + o.y, 0, oy + o.y + o.h);
        g.addColorStop(0, o.from);
        g.addColorStop(1, o.to);
        fill = g;
      }
      if (fill) {
        ctx.save();
        if (o.shadow) {
          ctx.shadowColor = o.shadow.color;
          ctx.shadowBlur = o.shadow.blur;
          ctx.shadowOffsetX = o.shadow.x;
          ctx.shadowOffsetY = o.shadow.y;
        }
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(ox + o.x, oy + o.y, o.w, o.h, o.r || 0);
        ctx.fill();
        ctx.restore();
      }
      if (o.stroke) {
        ctx.beginPath();
        ctx.roundRect(ox + o.x + o.sw / 2, oy + o.y + o.sw / 2, o.w - o.sw, o.h - o.sw, Math.max(0, (o.r || 0) - o.sw / 2));
        ctx.lineWidth = o.sw;
        ctx.strokeStyle = o.stroke;
        ctx.stroke();
      }
    } else if (o.t === "circle") {
      let fill = o.fill;
      if (o.grad) {
        const g = ctx.createLinearGradient(ox + o.cx - o.r, oy + o.cy + o.r, ox + o.cx + o.r, oy + o.cy - o.r);
        o.grad.forEach((c, i) => g.addColorStop(i / (o.grad.length - 1), c));
        fill = g;
      }
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(ox + o.cx, oy + o.cy, o.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.t === "icon") {
      const ic = ICONS[o.name];
      if (!ic) return;
      const [vw, vh] = ic.vb || [24, 24];
      const k = o.size / 24;
      ctx.save();
      ctx.translate(ox + o.cx - (vw * k) / 2, oy + o.cy - (vh * k) / 2);
      ctx.scale(k, k);
      ctx.lineWidth = ic.sw ?? 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = o.color;
      ctx.strokeStyle = o.color;
      ic.d.forEach((d) => {
        const p = new Path2D(d);
        if (ic.fill) ctx.fill(p, ic.rule || "nonzero");
        else ctx.stroke(p);
      });
      ctx.restore();

      } else if (o.t === "chrome") {
      ctx.save();
      ctx.translate(ox, oy);
      paintPhoneChrome(ctx, o.w, o.h, o);
      ctx.restore();
    } else if (o.t === "media") {
      const img = imgs?.get(o.src);
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox + o.x, oy + o.y, o.w, o.h);
      ctx.clip();
      if (img) {
        const sc = Math.max(o.w / img.naturalWidth, o.h / img.naturalHeight);
        const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
        ctx.drawImage(img, ox + o.x + (o.w - dw) / 2, oy + o.y + (o.h - dh) / 2, dw, dh);
      } else {
        const g = ctx.createLinearGradient(0, oy + o.y, 0, oy + o.y + o.h);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(1, "#FF47BC");
        ctx.fillStyle = g;
        ctx.fillRect(ox + o.x, oy + o.y, o.w, o.h);
        const fs = Math.max(11, o.w * 0.05), mx = ox + o.x + o.w / 2, my = oy + o.y + o.h / 2;
        ctx.fillStyle = "#FAF9FA";
        ctx.font = `600 ${fs}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Drop your", mx, my - fs * 0.65);
        ctx.fillText("image here", mx, my + fs * 0.65);
      }
      ctx.restore();
    } else if (o.t === "image") {
      const img = imgs?.get(o.src);
      if (img && o.sq) {
        ctx.drawImage(img, ox + o.cx - o.r, oy + o.cy - o.r, o.r * 2, o.r * 2);
      } else if (img) {
        const sc = Math.max((o.r * 2) / img.naturalWidth, (o.r * 2) / img.naturalHeight);
        const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ox + o.cx, oy + o.cy, o.r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, ox + o.cx - dw / 2, oy + o.cy - dh / 2, dw, dh);
        ctx.restore();
      }
    } else {
      ctx.textBaseline = "middle";
      ctx.letterSpacing = `${o.ls ?? 0}px`;
      if (o.runs) {
        ctx.textAlign = "left";
        let x = ox + o.x;
        o.runs.forEach(([str, wt, col]) => {
          ctx.font = `${wt} ${o.s}px ${o.font || "Inter, sans-serif"}`;
          ctx.fillStyle = col || o.color;
          ctx.fillText(str, x, oy + o.y);
          x += ctx.measureText(str).width;
        });
        ctx.letterSpacing = "0px";
        return;
      }
      ctx.font = `${o.weight} ${o.s}px ${o.font || "Inter, sans-serif"}`;
      ctx.textAlign = o.align;
      ctx.fillStyle = o.color;
      let str = o.text;
      if (o.maxW && ctx.measureText(str).width > o.maxW) {
        while (str.length > 1 && ctx.measureText(`${str}…`).width > o.maxW) str = str.slice(0, -1);
        str = `${str}…`;
      }
      ctx.fillText(str, ox + o.x, oy + o.y);
      ctx.letterSpacing = "0px";
    }
  });
}

// Labelled text input, same look as the browser Address field.
// Long-text fields span both columns; everything else pairs up.
const SOCIAL_FULL_WIDTH = new Set(["name", "sub", "caption", "sound", "headline"]);

function SocialField({ label, value, onChange, full = false, multiline = false }) {
  const fieldClass =
    "flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none";
  return (
    <div className={`flex flex-col gap-2 min-w-0 ${full ? "col-span-2" : ""}`}>
      <label className="text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A] truncate">{label}</label>
      <div className={`flex ${multiline ? "items-start" : "items-center"} px-2 py-2 bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-[10px] border border-transparent focus-within:border-[#FF47BC] transition-colors`}>
        {multiline ? (
          // Enter inserts a new line. The textarea scrolls once it passes ~5 lines.
          <textarea
            value={value}
            rows={3}
            onChange={(e) => onChange(e.target.value)}
            className={`${fieldClass} resize-none max-h-[110px] overflow-y-auto custom-scroll`}
          />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
        )}
      </div>
    </div>
  );
}

// Round-thumbnail image upload, same look as the Avatar row.
function ImageUploadField({ label, value, onChange, uploadLabel = "Upload image" }) {
  const inputRef = useRef(null);
  const [name, setName] = useState(null);
  const pick = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onChange(URL.createObjectURL(file));
      setName(file.name);
    }
    e.target.value = "";
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">{label}</label>
      {value ? (
        <div className="w-full h-[66px] flex items-center justify-between py-2 pl-2 pr-1 gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl">
          <div className="flex items-center gap-2 h-12 min-w-0">
            <div className="w-12 h-12 rounded-full shrink-0 bg-cover bg-center bg-[#EDEDED]" style={{ backgroundImage: `url(${value})` }} />
            <span className="text-[13px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] truncate">{name}</span>
          </div>
          <div className="flex items-start gap-0.5 shrink-0">
            <Tooltip label="Replace image" placement="bottom">
              <button type="button" onClick={() => inputRef.current?.click()} className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
              </button>
            </Tooltip>
            <Tooltip label="Remove image" placement="bottom">
              <button type="button" onClick={() => onChange(null)} className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F04438]/10 transition-colors">
                <Trash size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
              </button>
            </Tooltip>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-[66px] bg-white dark:bg-[#1F1F1F] border border-dashed border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-[10px] flex flex-col items-center justify-center gap-1 hover:bg-[#EAEAEA] dark:hover:bg-[#333333] transition-colors"
        >
          <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
          <span className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">{uploadLabel}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
}

// Default frame size (same shape as the old iPhone 16 Pro Max default).
const FRAME_DEFAULT_SIZE = { w: 1320, h: 2868 };

// x / y are the frame's center offset from the canvas center, and s is on-screen px per nominal px.
// Both are in units of the canvas box's short side, so layouts survive canvas resizes.
// s = null means "auto-fit to 80% of the canvas" (what a fresh upload/crop uses).
const makeFrame = (id, patch = {}) => ({
  id, x: 0, y: 0, w: FRAME_DEFAULT_SIZE.w, h: FRAME_DEFAULT_SIZE.h, s: null,
  r: 0, // Z rotation in degrees
  img: null, // { url, label, nw, nh, crop, cropUrl }
  radius: 0,
  corners: null, // null = uniform, else [tl, tr, br, bl] in %
  stroke: DEFAULT_STROKE,
  effects: [],
  social: DEFAULT_SOCIAL,
    statusBar: false, homeIndicator: false,
  backType: "solid", backHex: "FFFFFF", backOpacity: 100,
  backGradientType: "Linear", backGradientAngle: 90, backGradientOpacity: 100,
  backStops: [
    { id: "back-1", hex: "FFFFFF", position: 0, opacity: 100 },
    { id: "back-2", hex: "000000", position: 100, opacity: 100 },
  ],
  ...patch,
});

const cornersOf = (f) => f.corners ?? [f.radius, f.radius, f.radius, f.radius];
const backFillOf = (f) =>
  f.backType === "solid" ? hexRgba(f.backHex, f.backOpacity) : buildGradientCss(f.backGradientType, f.backGradientAngle, f.backStops);
const backOpacityOf = (f) => (f.backType === "solid" ? 1 : f.backGradientOpacity / 100);

// Per-frame version of the old App-level `frameAppearance`.
function frameAppearanceOf(f, env, rx, ry) {
  const s = f.stroke;
  const strokeOn = s.on && s.width > 0;
  const strokeCss = hexRgba(s.hex, s.opacity);
  const outer = [];
  if (strokeOn && s.position === "outside") outer.push(`0 0 0 ${s.width}px ${strokeCss}`);
  if (strokeOn && s.position === "center") outer.push(`0 0 0 ${s.width / 2}px ${strokeCss}`);
  f.effects
    .filter((e) => e.visible && e.type === "dropShadow")
    .forEach((e) => outer.push(`${e.x}px ${e.y}px ${e.blur}px ${e.spread}px ${hexRgba(e.hex, e.opacity)}`));
  const blur = f.effects.filter((e) => e.visible && e.type === "layerBlur").reduce((sum, e) => sum + e.blur, 0);
  return {
    radiiFrac: cornersOf(f).map((p) => p / 100),
    sheen: sheenCss(env, rx, ry),
    sheenKey: env,
    boxShadow: outer.length ? outer.join(", ") : "none",
    filter: blur > 0 ? `blur(${blur}px)` : "none",
    insetStroke:
      strokeOn && s.position !== "outside"
        ? `inset 0 0 0 ${s.position === "center" ? s.width / 2 : s.width}px ${strokeCss}`
        : null,
    noise: f.effects
      .filter((e) => e.visible && e.type === "noise")
      .map((e) => ({ id: e.id, opacity: (e.amount / 100) * 0.6, url: makeGrainUrl(e.size) })),
  };
}

function frameRect(f, box) {
  const short = Math.min(box.w, box.h);
  const ratio = f.w / f.h;
  const width = f.s == null ? Math.min(box.w * 0.8, box.h * 0.8 * ratio) : f.w * f.s * short;
  const height = f.s == null ? width / ratio : f.h * f.s * short;
  return { left: box.w / 2 + f.x * short - width / 2, top: box.h / 2 + f.y * short - height / 2, width, height };
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

// Deep copy of a frame (same fields duplicateSelected copies), under a new id.
const cloneFrame = (f, id) => ({
  ...f,
  id,
  img: f.img ? { ...f.img } : null,
  corners: f.corners ? [...f.corners] : null,
  stroke: { ...f.stroke },
  social: { ...f.social },
  effects: f.effects.map((e) => ({ ...e })),
  backStops: f.backStops.map((s) => ({ ...s })),
});

function FrameLayer({ frames, selectedIds, onSelect, onFramesChange, aspectLocked, environment, camera, cameraEase, background, textBehind, sizeRef, onPickFile, onRotate, onZoom, backVisible, chromeColors, nextFrameId, stageRef, animRef, onStageReady, groupOf, onFrameDoubleClick }) {
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
                  <img src={imgUrl} alt="" draggable={false} className="w-full h-full object-cover select-none pointer-events-none" />
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

// Horizontal scroller that fades whichever edge has more content past it.
function FadeScroller({ children, className = "", fade = 24 }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdge((p) => (p.left === left && p.right === right ? p : { left, right }));
  }, []);

  // Runs every render so adding / removing thumbnails re-checks; setEdge bails out when nothing changed.
  useLayoutEffect(measure);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const mask = `linear-gradient(to right, ${edge.left ? "transparent" : "#000"} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${edge.right ? "transparent" : "#000"} 100%)`;

  return (
    <div ref={ref} className={className} style={{ maskImage: mask, WebkitMaskImage: mask }}>
      {children}
    </div>
  );
}

// Vertical scroller that fades whichever edge has more content past it.
// Uses gradient overlays (not a mask) so fixed popups inside it aren't clipped.
function FadeScrollerY({ children, className = "", wrapClassName = "", fade = 24 }) {
  const ref = useRef(null);
  const innerRef = useRef(null);
  const [edge, setEdge] = useState({ top: false, bottom: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdge((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
  }, []);

  useLayoutEffect(measure);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (innerRef.current) ro.observe(innerRef.current); // catches sections collapsing / lists growing
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const overlay =
    "pointer-events-none absolute inset-x-0 z-10 from-[#FAF9FA] dark:from-[#171717] to-transparent transition-opacity duration-200";

  return (
    <div className={`relative min-h-0 ${wrapClassName}`}>
      <div ref={ref} className="absolute inset-0 overflow-y-auto custom-scroll">
        <div ref={innerRef} className={className}>
          {children}
        </div>
      </div>
      <div
        className={`${overlay} top-0 bg-gradient-to-b ${edge.top ? "opacity-100" : "opacity-0"}`}
        style={{ height: fade }}
      />
      <div
        className={`${overlay} bottom-0 bg-gradient-to-t ${edge.bottom ? "opacity-100" : "opacity-0"}`}
        style={{ height: fade }}
      />
    </div>
  );
}

// Section header: whole row is the click target, and the caret sits in the same hover chip as AppearanceHeader.
function SectionHeader({ label, open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="group flex items-center gap-2 w-full select-none"
    >
      <CaretRight
        size={16}
        weight="regular"
        className={`shrink-0 text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-[color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-90" : "rotate-0"}`}
      />
      <span className="section-title text-[14px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA]">{label}</span>
    </button>
  );
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
                <span className="flex items-center gap-1 shrink-0">
                  {keys.map((k) => (
                    <KeyCap key={k}>{k}</KeyCap>
                  ))}
                </span>
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

// ---------- Video timeline ----------
const CAM_KEYS = ["rotationX", "rotationY", "rotationZ", "positionX", "positionY", "zoom", "fov"];
const smoothstep = (x) => x * x * (3 - 2 * x);
const VID_EASES = {
  smooth: smoothstep,
  linear: (x) => x,
  in: (x) => x * x,
  out: (x) => 1 - (1 - x) * (1 - x),
  hold: (x) => (x >= 1 ? 1 : 0),
};

// Cubic-bezier solver (same maths as CSS cubic-bezier)
const vidBezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t;
  const Y = (t) => ((ay * t + by) * t + cy) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x;
      if (Math.abs(e) < 1e-6) return Y(t);
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const e = X(t) - x;
      if (Math.abs(e) < 1e-6) break;
      if (e > 0) hi = t; else lo = t;
      t = (lo + hi) / 2;
    }
    return Y(t);
  };
};

// Mirrors an "out" curve into its "in" and "in-out" versions.
const vidMirrorIn = (f) => (x) => 1 - f(1 - x);
const vidMirrorInOut = (f) => (x) => (x < 0.5 ? (1 - f(1 - 2 * x)) / 2 : (1 + f(2 * x - 1)) / 2);

// kind -> builder. p = the adjustable numbers for that kind.
const VID_EASE_BUILD = {
  fn: (_p, id) => VID_EASES[id],
  bezier: (p) => vidBezier(p[0], p[1], p[2], p[3]),
  backIn: ([s]) => (x) => (s + 1) * x * x * x - s * x * x,
  backOut: ([s]) => (x) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  backInOut: ([s]) => {
    const c = s * 1.525;
    return (x) =>
      x < 0.5
        ? ((2 * x) ** 2 * ((c + 1) * 2 * x - c)) / 2
        : ((2 * x - 2) ** 2 * ((c + 1) * (2 * x - 2) + c) + 2) / 2;
  },
  elastic: ([period]) => {
    const c = (2 * Math.PI) / (period * 10);
    return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * c) + 1);
  },
  elasticIn: (p) => vidMirrorIn(VID_EASE_BUILD.elastic(p)),
  elasticInOut: (p) => vidMirrorInOut(VID_EASE_BUILD.elastic(p)),
  bounce: ([e]) => {
    const N = 4;
    let total = 1;
    for (let i = 1; i <= N; i++) total += 2 * e ** i;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x * total;
      if (t <= 1) return t * t;
      t -= 1;
      for (let i = 1; i <= N; i++) {
        const d = 2 * e ** i;
        if (t <= d) {
          const tau = t - e ** i;
          return 1 - (e ** (2 * i) - tau * tau);
        }
        t -= d;
      }
      return 1;
    };
  },
  bounceIn: (p) => vidMirrorIn(VID_EASE_BUILD.bounce(p)),
  bounceInOut: (p) => vidMirrorInOut(VID_EASE_BUILD.bounce(p)),
  spring: ([z, w]) => {
    const zeta = Math.min(0.99, z);
    const wd = w * Math.sqrt(1 - zeta * zeta);
    const raw = (x) => 1 - Math.exp(-zeta * w * x) * (Math.cos(wd * x) + ((zeta * w) / wd) * Math.sin(wd * x));
    const end = raw(1);
    return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : raw(x) + (1 - end) * x * x); // nudged so it lands exactly on 1
  },
};

// Adjustable params per kind. Stored value = shown value / div.
const VID_OVERSHOOT = [{ label: "Overshoot", min: 0, max: 400, div: 100 }];
const VID_PERIOD = [{ label: "Period", min: 10, max: 100, div: 100 }];
const VID_BOUNCINESS = [{ label: "Bounciness", min: 10, max: 90, div: 100 }];

const VID_EASE_PARAMS = {
  backIn: VID_OVERSHOOT,
  backOut: VID_OVERSHOOT,
  backInOut: VID_OVERSHOOT,
  elastic: VID_PERIOD,
  elasticIn: VID_PERIOD,
  elasticInOut: VID_PERIOD,
  bounce: VID_BOUNCINESS,
  bounceIn: VID_BOUNCINESS,
  bounceInOut: VID_BOUNCINESS,
  spring: [
    { label: "Damping", min: 5, max: 99, div: 100 },
    { label: "Speed", min: 4, max: 40, div: 1 },
  ],
};

const VID_EASE_GROUPS = ["Basic", "Ease", "Overshoot"];
const VID_EASE_PRESETS = [
  // Basic
  { id: "hold", label: "Hold", group: "Basic", kind: "fn", p: [] },
  { id: "smooth", label: "Smooth", group: "Basic", kind: "fn", p: [] },
  { id: "linear", label: "Linear", group: "Basic", kind: "fn", p: [] },
  { id: "css-ease", label: "CSS ease", group: "Basic", kind: "bezier", p: [0.25, 0.1, 0.25, 1] },

  // Ease: Sine
  { id: "sine-in", label: "Sine in", group: "Ease", kind: "bezier", p: [0.47, 0, 0.745, 0.715] },
  { id: "sine-out", label: "Sine out", group: "Ease", kind: "bezier", p: [0.39, 0.575, 0.565, 1] },
  { id: "sine-in-out", label: "Sine in-out", group: "Ease", kind: "bezier", p: [0.445, 0.05, 0.55, 0.95] },
  // Ease: Quad (existing ids)
  { id: "in", label: "Ease in", group: "Ease", kind: "bezier", p: [0.11, 0, 0.5, 0] },
  { id: "out", label: "Ease out", group: "Ease", kind: "bezier", p: [0.5, 1, 0.89, 1] },
  { id: "in-out", label: "In-out", group: "Ease", kind: "bezier", p: [0.45, 0, 0.55, 1] },
  // Ease: Cubic
  { id: "cubic-in", label: "Cubic in", group: "Ease", kind: "bezier", p: [0.55, 0.055, 0.675, 0.19] },
  { id: "cubic-out", label: "Cubic out", group: "Ease", kind: "bezier", p: [0.215, 0.61, 0.355, 1] },
  { id: "cubic-in-out", label: "Cubic in-out", group: "Ease", kind: "bezier", p: [0.65, 0, 0.35, 1] },
  // Ease: Quart
  { id: "quart-in", label: "Quart in", group: "Ease", kind: "bezier", p: [0.895, 0.03, 0.685, 0.22] },
  { id: "quart-out", label: "Quart out", group: "Ease", kind: "bezier", p: [0.165, 0.84, 0.44, 1] },
  { id: "quart-in-out", label: "Quart in-out", group: "Ease", kind: "bezier", p: [0.77, 0, 0.175, 1] },
  // Ease: Quint
  { id: "quint-in", label: "Quint in", group: "Ease", kind: "bezier", p: [0.755, 0.05, 0.855, 0.06] },
  { id: "quint-out", label: "Quint out", group: "Ease", kind: "bezier", p: [0.23, 1, 0.32, 1] },
  { id: "quint-in-out", label: "Quint in-out", group: "Ease", kind: "bezier", p: [0.86, 0, 0.07, 1] },
  // Ease: Expo
  { id: "expo-in", label: "Expo in", group: "Ease", kind: "bezier", p: [0.95, 0.05, 0.795, 0.035] },
  { id: "expo-out", label: "Expo out", group: "Ease", kind: "bezier", p: [0.16, 1, 0.3, 1] },
  { id: "expo-in-out", label: "Expo in-out", group: "Ease", kind: "bezier", p: [0.87, 0, 0.13, 1] },
  // Ease: Circ
  { id: "circ-in", label: "Circ in", group: "Ease", kind: "bezier", p: [0.6, 0.04, 0.98, 0.335] },
  { id: "circ-out", label: "Circ out", group: "Ease", kind: "bezier", p: [0.075, 0.82, 0.165, 1] },
  { id: "circ-in-out", label: "Circ in-out", group: "Ease", kind: "bezier", p: [0.785, 0.135, 0.15, 0.86] },

  // Overshoot
  { id: "back-in", label: "Back in", group: "Overshoot", kind: "backIn", p: [1.7] },
  { id: "back-out", label: "Back out", group: "Overshoot", kind: "backOut", p: [1.7] },
  { id: "back-in-out", label: "Back in-out", group: "Overshoot", kind: "backInOut", p: [1.7] },
  { id: "elastic-in", label: "Elastic in", group: "Overshoot", kind: "elasticIn", p: [0.3] },
  { id: "elastic", label: "Elastic out", group: "Overshoot", kind: "elastic", p: [0.3] },
  { id: "elastic-in-out", label: "Elastic in-out", group: "Overshoot", kind: "elasticInOut", p: [0.3] },
  { id: "bounce-in", label: "Bounce in", group: "Overshoot", kind: "bounceIn", p: [0.5] },
  { id: "bounce", label: "Bounce out", group: "Overshoot", kind: "bounce", p: [0.5] },
  { id: "bounce-in-out", label: "Bounce in-out", group: "Overshoot", kind: "bounceInOut", p: [0.5] },
  { id: "spring", label: "Spring", group: "Overshoot", kind: "spring", p: [0.35, 14] },
];
const VID_EASE_CUSTOM_DEFAULT = [0.5, 0, 0.5, 1];

// Legacy string ("smooth", "in"...) or spec object -> spec object
const vidEaseSpec = (e) => {
  if (e && typeof e === "object") return e;
  const pr = VID_EASE_PRESETS.find((x) => x.id === (e ?? "smooth")) ?? VID_EASE_PRESETS[0];
  return { id: pr.id, kind: pr.kind, p: [...pr.p] };
};

// Spec (or legacy string) -> easing function, cached so playback doesn't rebuild it every frame
const vidEaseCache = new Map();
const vidEaseFn = (e, fallback = smoothstep) => {
  if (!e) return fallback;
  if (typeof e === "string") return VID_EASES[e] ?? fallback;
  const k = `${e.kind}|${e.id}|${e.p.join(",")}`;
  let f = vidEaseCache.get(k);
  if (!f) {
    f = VID_EASE_BUILD[e.kind]?.(e.p, e.id) ?? fallback;
    if (vidEaseCache.size > 200) vidEaseCache.clear();
    vidEaseCache.set(k, f);
  }
  return f;
};
const VID_FPS = 30;
const VID_PPS = 80; // default px per second
const VID_PPS_MIN = 12;
const VID_PPS_MAX = 400;
const VID_LABEL_W = 220; // shot names column
const VID_PAD = 16; // gap between the names column and 0s
const VID_GRAY = 40; // end zone width
const VID_H_MIN = 120; // timeline height limits (px)
const VID_H_MAX = 480;
const VID_GLIDE_MS = 180; // playhead glide while dragging a shot edge (inside the 140-220ms range used elsewhere)
const VID_GLIDE_EASE = vidBezier(0.22, 1, 0.36, 1); // same curve as every other transition in the app
const VID_PROPS = [
  ["rotationX", "X - Rotation"],
  ["rotationY", "Y - Rotation"],
  ["rotationZ", "Z - Rotation"],
  ["positionX", "X - Position"],
  ["positionY", "Y - Position"],
  ["zoom", "Zoom"],
  ["fov", "FoV"],
];
const vidClamp = (n, a, b) => Math.min(b, Math.max(a, n));
const vidSnap = (t) => Math.round(t * VID_FPS) / VID_FPS;
// 00:05:20 = minutes : seconds : frames (30 fps)
const fmtTC = (t) => {
  const f = Math.round(Math.max(0, t) * VID_FPS);
  return [Math.floor(f / (VID_FPS * 60)), Math.floor(f / VID_FPS) % 60, f % VID_FPS].map((n) => String(n).padStart(2, "0")).join(":");
};

// keys sorted by t. t is relative to the shot.
function sampleCamera(keys, t, ease = smoothstep) {
  if (!keys.length) return null;
  const out = {};
  CAM_KEYS.forEach((p) => {
    // a key without `props` drives every property
    const ks = keys.filter((k) => !k.props || k.props.includes(p));
    if (!ks.length) {
      out[p] = keys[0][p];
      return;
    }
    if (t <= ks[0].t) {
      out[p] = ks[0][p];
      return;
    }
    const last = ks[ks.length - 1];
    if (t >= last.t) {
      out[p] = last[p];
      return;
    }
for (let i = 0; i < ks.length - 1; i++) {
  const a = ks[i], b = ks[i + 1];
  if (t >= a.t && t <= b.t) {
    // property override wins, then the key's general easing, then the shot's
    const es = a.propEase?.[p] ?? a.ease;
    const segEase = es ? vidEaseFn(es, ease) : ease;
    const u = segEase((t - a.t) / Math.max(1e-6, b.t - a.t));
    out[p] = a[p] + (b[p] - a[p]) * u;
    return;
  }
}
    out[p] = last[p];
  });
  return out;
}

// Later shots win on overlap. Outside every shot, hold the nearest earlier pose (or the first shot's first pose).
function sampleShots(shots, t) {
  // frame-only shots (keys that only drive `frames`) must not drive the camera
  const withKeys = shots.filter(
    (s) => s.keys.length && !s.hidden && s.keys.some((k) => !k.props || k.props.some((p) => CAM_KEYS.includes(p)))
  );
  for (let i = withKeys.length - 1; i >= 0; i--) {
    const s = withKeys[i];
    if (t >= s.start && t <= s.start + s.len) return sampleCamera(s.keys, t - s.start, VID_EASES[s.ease] ?? smoothstep);
  }
  let best = null;
  withKeys.forEach((s) => {
    if (s.start + s.len < t && (!best || s.start + s.len > best.start + best.len)) best = s;
  });
  if (best) return sampleCamera(best.keys, best.len, VID_EASES[best.ease] ?? smoothstep);
  const first = [...withKeys].sort((a, b) => a.start - b.start)[0];
  return first ? sampleCamera(first.keys, 0, VID_EASES[first.ease] ?? smoothstep) : null;
}

// "none" = playhead isn't inside any shot, "on" = it sits on a keyframe, "add" = inside a shot with no keyframe here.
// Uses the same shot pick and 1/60 tolerance as vidAddKey.
// Properties whose current camera value differs from what the timeline plays at time t.
// cam is rounded to whole numbers, so differences up to 0.5 are just rounding.
// ---- Frame-mode keyframes: each frame's placement is stored on the key as key.frames[frameId] = { x, y, w, h, s } ----
function framePoseMap(frames, box) {
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
function sampleShotFrames(shots, t) {
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

function changedCamProps(shots, t, cam) {
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

function keyStateAt(shots, selShot, t, prop = null, cam = null) {
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
function vidShotAtTime(shots, selShot, t) {
  const inside = (s) => t >= s.start - 1e-6 && t <= s.start + s.len + 1e-6;
  const cur = shots.find((s) => s.id === selShot);
  return cur && inside(cur) ? cur : [...shots].reverse().find(inside) ?? null;
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

// Resting value of every background property. x / y = % of the canvas, w = size %, cr = radius % of the short side.
const BG_CUSTOM_REST = { a: 1, x: 0, y: 0, s: 1, r: 0, b: 0, w: 100, cr: 0, c: null };
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

// ---------- Background animations ----------
const BG_ANIM_NONE = { id: "none", label: "None", group: "" };
const BG_ANIM_GROUPS = ["Fade", "Scale", "Mask", "Blur", "Effects"];
// pv = progress shown in the preview tile. linear = skip the smooth easing (stepped effects).
const BG_ANIMS = [
  { id: "fade", label: "Fade", group: "Fade" },
  { id: "slide", label: "Slide", group: "Fade" },
  { id: "grow", label: "Grow", group: "Scale" },
  { id: "shrink", label: "Shrink", group: "Scale" },
  { id: "spin", label: "Spin", group: "Scale" },
  { id: "twist", label: "Twist", group: "Scale" },
  { id: "move-scale", label: "Move & Scale", group: "Scale" },
  { id: "mask-reveal", label: "Mask Reveal", group: "Mask" },
  { id: "mask-center", label: "Mask Center", group: "Mask" },
  { id: "mask-resize", label: "Mask Resize", group: "Mask" },
  { id: "mask-slide", label: "Mask & Slide", group: "Mask" },
  { id: "mask-expand", label: "Mask Expand", group: "Mask" },
  { id: "blur", label: "Blur", group: "Blur" },
  { id: "blur-slide", label: "Blur & Slide", group: "Blur" },
  { id: "blur-scale", label: "Blur & Scale", group: "Blur" },
  { id: "dissolve", label: "Dissolve", group: "Effects" },
  { id: "wipe", label: "Wipe", group: "Effects" },
  { id: "pixel", label: "Pixel", group: "Effects" },
  { id: "pixel-wipe", label: "Pixel Wipe", group: "Effects" },
  { id: "luma", label: "Luma Reveal", group: "Effects" },
  { id: "blink", label: "Blink", group: "Effects", pv: 0.3, linear: true },
  { id: "glitch", label: "Glitch", group: "Effects", pv: 0.9, linear: true },
  { id: "barrel", label: "Barrel", group: "Effects", pv: 0.95 },
  { id: "film-roll", label: "Film Roll", group: "Effects" },
];
const BG_ANIM_BY_ID = Object.fromEntries([BG_ANIM_NONE, { id: "custom", label: "Custom", group: "" }, ...BG_ANIMS].map((a) => [a.id, a]));
const bgProgress = (id, u, ease) => {
  if (ease) return vidClamp(vidEaseFn(vidEaseSpec(ease))(u), 0, 1);
  return BG_ANIM_BY_ID[id]?.linear ? u : smoothstep(u);
};
const bgDefaultEase = (id) => (BG_ANIM_BY_ID[id]?.linear ? "linear" : "smooth");
const BG_DIRS = [
  { value: "left", label: "From left" },
  { value: "right", label: "From right" },
  { value: "top", label: "From top" },
  { value: "bottom", label: "From bottom" },
];
const BG_SPIN = [
  { value: "cw", label: "Clockwise" },
  { value: "ccw", label: "Counter-clockwise" },
];
const BG_FILM = [
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
];
const bgSel = (key, label, options, def) => ({ key, label, type: "select", options, def });
const bgRng = (key, label, min, max, def, hardMax) => ({ key, label, type: "range", min, max, def, hardMax });
const bgTog = (key, label, def = true) => ({ key, label, type: "toggle", def });
const BG_FADE = bgTog("fade", "Fade");

// Adjustable values per animation. `def` is what the animation used before it was adjustable.
const BG_ANIM_PARAMS = {
  slide: [bgSel("dir", "Direction", BG_DIRS, "right"), bgRng("distance", "Distance (%)", 0, 100, 12, 300), BG_FADE],
  grow: [bgRng("scale", "Start scale (%)", 0, 100, 50), BG_FADE],
  shrink: [bgRng("scale", "Start scale (%)", 100, 300, 160, 1000), BG_FADE],
  spin: [bgSel("dir", "Direction", BG_SPIN, "cw"), bgRng("angle", "Angle (°)", 0, 360, 30, 3600), bgRng("scale", "Start scale (%)", 50, 300, 150, 1000), BG_FADE],
  twist: [bgSel("dir", "Direction", BG_SPIN, "ccw"), bgRng("angle", "Angle (°)", 0, 720, 60, 3600), bgRng("scale", "Start scale (%)", 50, 400, 190, 1000), BG_FADE],
  "move-scale": [bgSel("dir", "Direction", BG_DIRS, "left"), bgRng("distance", "Distance (%)", 0, 100, 35, 300), bgRng("scale", "Start scale (%)", 0, 100, 60), BG_FADE],
  "mask-reveal": [bgSel("dir", "Direction", BG_DIRS, "left")],
  "mask-center": [bgSel("axis", "Axis", [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }], "vertical")],
  "mask-resize": [bgRng("zoom", "Inner zoom (%)", 0, 100, 30, 300)],
  "mask-slide": [bgSel("dir", "Direction", BG_DIRS, "bottom"), bgRng("distance", "Distance (%)", 0, 100, 35, 300)],
  "mask-expand": [bgRng("x", "Origin X (%)", 0, 100, 50), bgRng("y", "Origin Y (%)", 0, 100, 50)],
  blur: [bgRng("blur", "Blur", 0, 100, 40, 300), BG_FADE],
  "blur-slide": [bgRng("blur", "Blur", 0, 100, 40, 300), bgSel("dir", "Direction", BG_DIRS, "right"), bgRng("distance", "Distance (%)", 0, 100, 12, 300), BG_FADE],
  "blur-scale": [bgRng("blur", "Blur", 0, 100, 40, 300), bgRng("scale", "Start scale (%)", 100, 300, 135, 1000), BG_FADE],
  dissolve: [bgRng("cells", "Detail", 16, 240, 96)],
  pixel: [bgRng("cells", "Pixel count", 4, 80, 14)],
  "pixel-wipe": [bgSel("dir", "Direction", BG_DIRS, "left"), bgRng("cells", "Pixel count", 4, 80, 26)],
  wipe: [bgSel("dir", "Direction", BG_DIRS, "left"), bgRng("softness", "Softness (%)", 0, 100, 3)],
  luma: [bgSel("order", "Reveal first", [{ value: "dark", label: "Dark areas" }, { value: "light", label: "Light areas" }], "light")],
  blink: [bgRng("count", "Blinks", 1, 8, 2)],
  glitch: [bgRng("slices", "Slices", 4, 40, 14), bgRng("shift", "Shift (%)", 0, 100, 40, 200)],
  barrel: [bgRng("strength", "Strength (%)", 0, 100, 70, 200)],
  "film-roll": [bgSel("dir", "Direction", BG_FILM, "up"), bgRng("rolls", "Rolls", 1, 6, 2)],
};
const bgParamDef = (id, key) => BG_ANIM_PARAMS[id]?.find((p) => p.key === key)?.def;

// kind = "enter" | "exit". Clips saved with the old single `anim` count as their enter animation.
const bgAnimOf = (b, kind) => {
  const a = kind === "enter" && b.enter === undefined ? b.anim : b[kind];
  return a && a.id !== "none" ? { delay: 0, ...a } : null;
};

// Order-independent identity of a background, so a state change can be told apart from a snapshot being applied.
const bgKey = (sn) =>
  JSON.stringify([sn.bgType, sn.bgHex, sn.bgOpacity, sn.gradientType, sn.gradientAngle, sn.gradientOpacity, sn.gradientStops, sn.grainAmount, sn.customBgImageUrl]);

const bgFallbackSnap = () => ({
  bgType: "solid",
  bgOpacity: 100,
  bgHex: document.documentElement.classList.contains("dark") ? "171717" : "FAF9FA",
});

// Seeded random, so a given frame looks the same every time it's drawn.
const bgRand = (i, seed = 0) => {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const bgScratch = {};
const bgTmp = (key, w, h) => {
  const c = (bgScratch[key] ??= document.createElement("canvas"));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
};

// Draws src centered, with optional alpha / offset / scale / rotation (deg) / blur (px).
function bgLayer(ctx, src, W, H, o = {}) {
  const { a = 1, tx = 0, ty = 0, s = 1, r = 0, blur = 0 } = o;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  if (blur > 0.1) ctx.filter = `blur(${blur}px)`;
  ctx.translate(W / 2 + tx, H / 2 + ty);
  ctx.rotate((r * Math.PI) / 180);
  ctx.scale(s, s);
  ctx.drawImage(src, -W / 2, -H / 2, W, H);
  ctx.restore();
}

// Draws src through an alpha mask painted by paint(maskCtx).
function bgMasked(ctx, src, W, H, paint, o, key) {
  const t = bgTmp(key, W, H);
  const tc = t.getContext("2d");
  tc.imageSmoothingEnabled = true;
  tc.globalCompositeOperation = "source-over";
  tc.clearRect(0, 0, W, H);
  bgLayer(tc, src, W, H, o);
  tc.globalCompositeOperation = "destination-in";
  paint(tc);
  tc.globalCompositeOperation = "source-over";
  ctx.drawImage(t, 0, 0);
}

// Smooth value noise (used by Dissolve for organic blobs)
function bgValueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const sm = (t) => t * t * (3 - 2 * t);
  const r = (a, b) => bgRand(a * 73 + b * 179, seed);
  const top = r(xi, yi) + (r(xi + 1, yi) - r(xi, yi)) * sm(xf);
  const bot = r(xi, yi + 1) + (r(xi + 1, yi + 1) - r(xi, yi + 1)) * sm(xf);
  return top + (bot - top) * sm(yf);
}

// Draws src through a warped grid. map(u, v) takes 0..1 source coords and returns the destination [x, y] in px.
function bgMesh(ctx, src, map, nx = 8, ny = 8) {
  const sw = src.width ?? src.naturalWidth, sh = src.height ?? src.naturalHeight;
  const tri = (s0, s1, s2, d0, d1, d2) => {
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    const grow = (pt) => {
      const vx = pt[0] - cx, vy = pt[1] - cy, len = Math.hypot(vx, vy) || 1;
      return [pt[0] + (vx / len) * 0.6, pt[1] + (vy / len) * 0.6]; // hides hairline seams
    };
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
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  };
  const S = (i, j) => [(i / nx) * sw, (j / ny) * sh];
  const D = (i, j) => map(i / nx, j / ny);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      tri(S(i, j), S(i + 1, j), S(i, j + 1), D(i, j), D(i + 1, j), D(i, j + 1));
      tri(S(i + 1, j), S(i + 1, j + 1), S(i, j + 1), D(i + 1, j), D(i + 1, j + 1), D(i, j + 1));
    }
  }
}

const bgGrainCache = new Map();

// Paints one background snapshot (solid / gradient / image) full-frame. Returns false while an image is still loading.
function paintBgSnap(ctx, sn, W, H, getImg) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  let ready = true;
  if (sn.bgType === "solid") {
    ctx.fillStyle = hexRgba(sn.bgHex, sn.bgOpacity);
    ctx.fillRect(0, 0, W, H);
  } else if (sn.bgType === "gradient") {
    ctx.globalAlpha = sn.gradientOpacity / 100;
    ctx.fillStyle = makeCanvasGradient(ctx, sn.gradientType, sn.gradientAngle, sn.gradientStops, 0, 0, W, H);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    if (sn.grainAmount > 0) {
      let tile = bgGrainCache.get(sn.grainAmount);
      if (!tile) bgGrainCache.set(sn.grainAmount, (tile = makeGrainTile(512, sn.grainAmount)));
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = ctx.createPattern(tile, "repeat");
      ctx.fillRect(0, 0, W, H);
    }
  } else if (sn.customBgImageUrl) {
    const img = getImg(sn.customBgImageUrl);
    if (img) {
      const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, W, H);
      ready = false;
    }
  }
  ctx.restore();
  return ready;
}

// Draws the transition from -> to at progress p (0..1) onto ctx. ns keeps scratch canvases separate between callers.
function drawBgTransition(ctx, id, from, to, p, W, H, ns = "bg", opts = {}) {
  const i = 1 - p;
  const P = (key) => opts[key] ?? bgParamDef(id, key);
  const dirXY = (d) => ({ left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] })[d] ?? [0, 0];
  const fade = opts.fade !== false;
  const k = W / 1280; // blur radius scales with the output size
  const a = fade ? Math.min(1, p * 2.5) : 1; // quick fade-in used by the scale / blur presets
  // rect that grows from the chosen edge
  const edge = (dx, dy) => [dx > 0 ? W * i : 0, dy > 0 ? H * i : 0, dx ? W * p : W, dy ? H * p : H];
  const layer = (src, o) => bgLayer(ctx, src, W, H, o);
  const clipped = (path, o) => {
    ctx.save();
    ctx.beginPath();
    path();
    ctx.clip();
    layer(to, o);
    ctx.restore();
  };
  const masked = (paint, o) => bgMasked(ctx, to, W, H, paint, o, `${ns}-m`);
  // Reveals `to` cell by cell: a cell shows once p passes its value (0..1). soft = edge softness.
  const revealCells = (cols, valueAt, smooth, soft) => {
    const rows = Math.max(1, Math.round((cols * H) / W));
    const mc = bgTmp(`${ns}-cells`, cols, rows);
    const mx = mc.getContext("2d");
    const img = mx.createImageData(cols, rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = valueAt(x, y, cols);
        img.data[(y * cols + x) * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (p * (1 + soft) - v) / soft)));
      }
    }
    mx.putImageData(img, 0, 0);
    masked((m) => {
      m.imageSmoothingEnabled = smooth;
      m.drawImage(mc, 0, 0, W, H);
    });
  };

  ctx.clearRect(0, 0, W, H);
  if (id === "none") {
    ctx.drawImage(to, 0, 0, W, H);
    return;
  }
  ctx.drawImage(from, 0, 0, W, H);

  switch (id) {
    // Fade
    case "fade": layer(to, { a: p }); break;
    case "slide": {
      const [dx, dy] = dirXY(P("dir")), d = P("distance") / 100;
      layer(to, { a: fade ? p : 1, tx: W * dx * d * i, ty: H * dy * d * i });
      break;
    }
    // Scale
    case "grow": {
      const st = P("scale") / 100;
      layer(to, { a, s: Math.max(0.02, st + (1 - st) * p) });
      break;
    }
    case "shrink": layer(to, { a, s: 1 + (P("scale") / 100 - 1) * i }); break;
    case "spin":
    case "twist": {
      const sign = P("dir") === "ccw" ? 1 : -1;
      const ang = P("angle") * i;
      const rad = (ang * Math.PI) / 180;
      // minimum scale at which a rotated W x H rectangle still covers the frame
      const cover = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)) * Math.max(W / H, H / W);
      layer(to, { a, r: sign * ang, s: Math.max(cover, 0.02, 1 + (P("scale") / 100 - 1) * i) });
      break;
    }
    case "move-scale": {
      const [dx, dy] = dirXY(P("dir")), d = P("distance") / 100, st = P("scale") / 100;
      layer(to, { a, tx: W * dx * d * i, ty: H * dy * d * i, s: Math.max(0.02, st + (1 - st) * p) });
      break;
    }
    // Mask
    case "mask-reveal": {
      const [dx, dy] = dirXY(P("dir"));
      clipped(() => ctx.rect(...edge(dx, dy)));
      break;
    }
    case "mask-center":
      clipped(() => (P("axis") === "horizontal" ? ctx.rect((W * i) / 2, 0, W * p, H) : ctx.rect(0, (H * i) / 2, W, H * p)));
      break;
    case "mask-resize": clipped(() => ctx.rect((W * i) / 2, (H * i) / 2, W * p, H * p), { s: 1 + (P("zoom") / 100) * i }); break;
    case "mask-slide": {
      const [dx, dy] = dirXY(P("dir")), d = P("distance") / 100;
      clipped(() => ctx.rect(...edge(dx, dy)), { tx: W * dx * d * i, ty: H * dy * d * i });
      break;
    }
    case "mask-expand": {
      const ox = (P("x") / 100) * W, oy = (P("y") / 100) * H;
      const far = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));
      clipped(() => ctx.arc(ox, oy, p * far, 0, Math.PI * 2));
      break;
    }
    // Blur
    case "blur": layer(to, { a, blur: P("blur") * k * i }); break;
    case "blur-slide": {
      const [dx, dy] = dirXY(P("dir")), d = P("distance") / 100;
      layer(to, { a, blur: P("blur") * k * i, tx: W * dx * d * i, ty: H * dy * d * i });
      break;
    }
    case "blur-scale": layer(to, { a, blur: P("blur") * k * i, s: 1 + (P("scale") / 100 - 1) * i }); break;
    // Effects
    case "dissolve":
      revealCells(Math.round(P("cells")), (x, y, c) => {
        const n = bgValueNoise((x / c) * 5, (y / c) * 5, 1) * 0.65 + bgValueNoise((x / c) * 11, (y / c) * 11, 2) * 0.35;
        return Math.min(1, Math.max(0, (n - 0.2) / 0.6));
      }, true, 0.04);
      break;
    case "pixel": revealCells(Math.round(P("cells")), (x, y, c) => bgRand(y * c + x, 2), false, 0.001); break;
    case "pixel-wipe": {
      const [dx, dy] = dirXY(P("dir"));
      revealCells(Math.round(P("cells")), (x, y, c) => {
        const rows = Math.max(1, Math.round((c * H) / W));
        const u = dx ? (dx < 0 ? x / c : 1 - x / c) : dy < 0 ? y / rows : 1 - y / rows;
        return u * 0.75 + bgRand(y * c + x, 3) * 0.25;
      }, false, 0.001);
      break;
    }
    case "wipe": {
      const [dx, dy] = dirXY(P("dir"));
      const f = P("softness") / 100, e = p * (1 + f);
      masked((m) => {
        const g = dx
          ? m.createLinearGradient(dx < 0 ? 0 : W, 0, dx < 0 ? W : 0, 0)
          : m.createLinearGradient(0, dy < 0 ? 0 : H, 0, dy < 0 ? H : 0);
        g.addColorStop(Math.min(1, Math.max(0, e - f)), "#000");
        g.addColorStop(Math.min(1, Math.max(0, e)), "rgba(0,0,0,0)");
        m.fillStyle = g;
        m.fillRect(0, 0, W, H);
      });
      break;
    }
    case "luma": {
      // dark areas of the incoming background appear first
      const sw = 48, sh = Math.max(1, Math.round((sw * H) / W));
      const sc = bgTmp(`${ns}-luma`, sw, sh);
      const sx = sc.getContext("2d", { willReadFrequently: true });
      sx.drawImage(to, 0, 0, sw, sh);
      const d = sx.getImageData(0, 0, sw, sh).data;
      revealCells(sw, (x, y, c) => {
        const j = (y * c + x) * 4;
        const lum = (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) / 255;
        return (P("order") === "light" ? 1 - lum : lum) * 0.85 + bgRand(y * c + x, 4) * 0.15;
      }, true, 0.12);
      break;
    }
    case "blink": {
      const steps = 2 * Math.max(1, Math.round(P("count"))) + 1;
      const idx = Math.min(steps - 1, Math.floor(p * steps));
      layer(to, { a: idx === steps - 1 ? 1 : idx % 2 });
      break;
    }
    case "glitch": {
      const n = Math.max(2, Math.round(P("slices"))), step = Math.floor(p * 18);
      const grow = 0.15 + 0.85 * p;
      const w = W * Math.min(1, grow * (1 + 0.9 * i)), h = H * grow; // starts wider than tall
      const x0 = (W - w) / 2, y0 = (H - h) / 2;
      const fr = W * 0.02 * i; // red / cyan fringe, fades out
      const sH = to.height / n;
      for (let b = 0; b < n; b++) {
        const live = p < 0.99 && bgRand(b, step) < 0.55 * i + 0.05;
        if (live && bgRand(b, step + 120) < 0.18) continue; // dropped slice leaves a gap
        const dx = live ? (bgRand(b, step + 50) - 0.5) * (P("shift") / 100) * w * i * 1.2 : 0;
        const dy = y0 + (h * b) / n, dh = h / n + 1;
        if (fr > 0.5) {
          ctx.fillStyle = "#ff2d2d";
          ctx.fillRect(x0 + dx + fr, dy, w, dh);
          ctx.fillStyle = "#19e0ff";
          ctx.fillRect(x0 + dx - fr, dy, w, dh);
        }
        ctx.drawImage(to, 0, sH * b, to.width, sH * (dh / (h / n)), x0 + dx, dy, w, dh);
      }
      break;
    }
    case "barrel": {
      const s = 0.12 + 0.88 * p; // grows from small to full size
      const k = (P("strength") / 100) * i; // warp relaxes to flat
      bgMesh(ctx, to, (u, v) => {
        const x = (u - 0.5) * 2, y = (v - 0.5) * 2;
        const f = Math.max(0.05, 1 - k * 0.5 * (x * x + y * y)); // corners pulled in more, so the edges bow out
        return [W / 2 + (x * f * s * W) / 2, H / 2 + (y * f * s * H) / 2];
      }, 12, 12);
      break;
    }
    case "film-roll": {
      const rolls = Math.max(1, Math.round(P("rolls")));
      const Pd = H * 1.18; // one reel unit: the image plus its black gap
      const split = 0.3; // first 30%: the reel rises from the bottom, then it rolls and settles
      ctx.save();
      if (P("dir") === "down") {
        ctx.translate(0, H);
        ctx.scale(1, -1);
      }
      const settle = p <= split ? 0 : 1 - Math.pow(1 - (p - split) / (1 - split), 3);
      const a = p >= split ? 1 : smoothstep(p / split);
      const bow = H * 0.12 * (1 - settle);
      const o = rolls * Pd * (1 - settle);
      const arch = (u) => bow * (1 - (2 * u - 1) ** 2);
      ctx.fillStyle = "#000";
      if (a < 1) {
        const top = H - a * Pd;
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, top);
        ctx.quadraticCurveTo(W / 2, top - 2 * bow, W, top);
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, W, H);
      }
      const k0 = a < 1 ? rolls : -1, k1 = a < 1 ? rolls : rolls + 1;
      for (let k = k0; k <= k1; k++) {
        const y = o - k * Pd;
        const top = H - a * (H - y) - bow, bottom = H - a * (H - (y + H));
        if (bottom < -2 || top > H + 2) continue;
        bgMesh(ctx, to, (u, v) => [u * W, H - a * (H - (y + v * H)) - arch(u)], 10, 8);
      }
      ctx.restore();
      break;
    }
    case "custom": {
      const f = { ...BG_CUSTOM_REST, ...(opts.from ?? {}) };
      const size = f.w / 100 + (1 - f.w / 100) * p;
      const radius = (f.cr / 100) * Math.min(W, H) * i;
      ctx.save();
      if (f.w < 100 || f.cr > 0) {
        ctx.beginPath();
        ctx.roundRect((W * (1 - size)) / 2, (H * (1 - size)) / 2, W * size, H * size, radius);
        ctx.clip();
      }
      layer(to, {
        a: f.a + (1 - f.a) * p,
        tx: (f.x / 100) * W * i,
        ty: (f.y / 100) * H * i,
        s: Math.max(0.02, f.s + (1 - f.s) * p),
        r: f.r * i,
        blur: f.b * k * i,
      });
      if (f.c) {
        ctx.globalAlpha = i; // color wash that fades out
        ctx.fillStyle = `#${f.c}`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      break;
    }
    default: layer(to, {});
  }
}

// Preview tiles: demo artwork, so every effect is visible whatever the real backgrounds are.
let bgDemoCache = null;
function bgDemo(W, H) {
  if (bgDemoCache?.W === W) return bgDemoCache;
  const mk = (draw) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    draw(c.getContext("2d"));
    return c;
  };
  const from = mk((x) => {
    x.fillStyle = "#2A2A30";
    x.fillRect(0, 0, W, H);
  });
  const to = mk((x) => {
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#FF47BC");
    g.addColorStop(1, "#6A2EE8");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(255,255,255,0.9)";
    x.beginPath();
    x.arc(W * 0.3, H * 0.4, H * 0.22, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "rgba(255,255,255,0.35)";
    x.fillRect(W * 0.55, H * 0.25, W * 0.3, H * 0.5);
  });
  return (bgDemoCache = { W, from, to });
}
function drawBgAnimPreview(canvas, id, p, art, opts) {
  if (!canvas) return;
  const { from, to } = art ?? bgDemo(canvas.width, canvas.height);
  drawBgTransition(canvas.getContext("2d"), id, from, to, p, canvas.width, canvas.height, "thumb", opts);
}

// ---------- Shot enter / exit animations ----------
const DEV_ANIM_GROUPS = ["Fade & Scale", "Flip", "Slide"];
const DEV_ANIMS = [
  { id: "fade", group: "Fade & Scale", label: (k) => `Fade ${k}` },
  { id: "scale", group: "Fade & Scale", label: (k) => `Scale ${k}` },
  { id: "scale-bottom", group: "Fade & Scale", label: (k) => `Scale ${k} bottom` },
  { id: "flip-h", group: "Flip", label: () => "Flip horizontal" },
  { id: "flip-v", group: "Flip", label: () => "Flip vertical" },
  { id: "slide-top", group: "Slide", label: (k) => `Slide ${k} top` },
  { id: "slide-left", group: "Slide", label: (k) => `Slide ${k} left` },
  { id: "slide-right", group: "Slide", label: (k) => `Slide ${k} right` },
  { id: "slide-bottom", group: "Slide", label: (k) => `Slide ${k} bottom` },
];
const DEV_ANIM_BY_ID = Object.fromEntries(DEV_ANIMS.map((a) => [a.id, a]));
const devAnimLabel = (id, k) => DEV_ANIM_BY_ID[id]?.label(k) ?? "None";

// Device pose at progress p (0 = hidden / off-screen, 1 = resting). x / y are in screens (±1 = just off the edge).
// Exit plays the same pose backwards.
function devAnimPose(id, p) {
  const i = 1 - p, a = Math.min(1, p * 2);
  switch (id) {
    case "fade": return { a: p };
    case "scale": return { a: p, s: 0.6 + 0.4 * p };
    case "scale-bottom": return { a: p, s: 0.6 + 0.4 * p, y: -0.5 * i };
    case "flip-h": return { a, ry: (Math.PI / 2) * i };
    case "flip-v": return { a, rx: (Math.PI / 2) * i };
    case "slide-top": return { y: i };
    case "slide-left": return { x: -i };
    case "slide-right": return { x: i };
    case "slide-bottom": return { y: -i };
    default: return null;
  }
}

function shotAnimPose(s, t) {
  const L = s.len, u = vidClamp(t - s.start, 0, L);
  const en = s.enter && s.enter.id !== "none" ? s.enter : null;
  const ex = s.exit && s.exit.id !== "none" ? s.exit : null;
  let pose = null;
  if (en) {
    const e0 = Math.min(L, en.delay / 1000), e1 = Math.min(L, e0 + en.dur / 1000);
    const p = u <= e0 ? 0 : u >= e1 ? 1 : (u - e0) / Math.max(1e-6, e1 - e0);
    pose = devAnimPose(en.id, smoothstep(p));
  }
  if (ex) {
    const x1 = Math.max(0, L - ex.delay / 1000), x0 = Math.max(0, x1 - ex.dur / 1000);
    const q = u >= x1 ? 1 : u <= x0 ? 0 : (u - x0) / Math.max(1e-6, x1 - x0);
    if (q > 0) pose = devAnimPose(ex.id, 1 - smoothstep(q));
  }
  return pose;
}

// Later shots win on overlap. Between shots the nearest earlier shot's end state holds
// (or the next shot's start state, before the first shot).
// Same pick as the camera: later shots win on overlap, gaps hold the nearest earlier shot.
function shotForImgAt(shots, t) {
  const list = shots.filter((s) => !s.hidden);
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (t >= s.start && t <= s.start + s.len) return s;
  }
  let prev = null;
  list.forEach((s) => {
    if (s.start + s.len < t && (!prev || s.start + s.len > prev.start + prev.len)) prev = s;
  });
  return prev ?? [...list].sort((a, b) => a.start - b.start)[0] ?? null;
}

function sampleDeviceAnim(shots, t) {
  const list = shots.filter((s) => !s.hidden);
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (t >= s.start && t <= s.start + s.len) return shotAnimPose(s, t);
  }
  let prev = null, next = null;
  list.forEach((s) => {
    if (s.start + s.len < t && (!prev || s.start + s.len > prev.start + prev.len)) prev = s;
    if (s.start > t && (!next || s.start < next.start)) next = s;
  });
  if (prev) return shotAnimPose(prev, prev.start + prev.len);
  if (next) return shotAnimPose(next, next.start);
  return null;
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

// ---------- Video templates ----------
// VK = camera keyframe (t is relative to the shot). VSHOT = a shot. poster = time (s) shown on the card at rest.
const VK = (t, o = {}, ease) => ({ t, ...CAM_DEFAULT, ...o, ...(ease ? { ease: vidEaseSpec(ease) } : {}) });
const VSHOT = (name, start, len, keys, extra = {}) => ({ name, start, len, keys, ...extra });

// Background clip for a template. `at` = start time (s). The clip runs until the next one starts, or to the end of the timeline.
// bg uses the same shape as TEMPLATE_LIBRARY (solid / gradient / custom). extra: { grain, enter }.
const VBG = (at, bg, extra = {}) => ({ at, bg, ...extra });

const vtBgSnap = (bg, grain = 0) => {
  const base = {
    bgType: "solid", bgHex: "FFFFFF", bgOpacity: 100,
    gradientType: "Linear", gradientAngle: 90, gradientOpacity: 100,
    gradientStops: [
      { id: 1, hex: "FFFFFF", position: 0, opacity: 100 },
      { id: 2, hex: "000000", position: 100, opacity: 100 },
    ],
    grainAmount: 0, customBgImageUrl: null,
  };
  if (bg.type === "solid") return { ...base, bgType: "solid", bgHex: bg.hex };
  if (bg.type === "gradient") {
    const p = GRADIENT_PRESETS.find((g) => g.value === bg.preset);
    if (!p?.stops) return base;
    return { ...base, bgType: "gradient", gradientType: p.type, gradientAngle: p.angle, gradientStops: p.stops.map((s) => ({ ...s })), grainAmount: grain };
  }
  const img = IMAGE_PRESETS.find((i) => i.value === bg.preset);
  return { ...base, bgType: "custom", customBgImageUrl: img?.url ?? null };
};

const vtBgCss = (sn) =>
  sn.bgType === "solid"
    ? hexRgba(sn.bgHex, sn.bgOpacity)
    : sn.bgType === "gradient"
    ? buildGradientCss(sn.gradientType, sn.gradientAngle, sn.gradientStops)
    : sn.customBgImageUrl
    ? `center / cover url(${sn.customBgImageUrl})`
    : "transparent";

const VT_RAW = [
  // Spins a full turn from a wide-angle, far-away start, then lands on a calm close angle
  { id: "vt-whiplash", label: "Whiplash", tags: "spin 360 fast fov zoom crazy wide", poster: 1.6,
    bgs: [VBG(0, { type: "gradient", preset: "cobalt-flare" }, { grain: 6 })],
    shots: [VSHOT("Whiplash", 0, 5, [
      VK(0, { rotationX: -25, rotationY: -180, rotationZ: -20, zoom: 15, fov: 105 }, "expo-out"),
      VK(1.6, { rotationX: -10, rotationY: 25, rotationZ: 4, zoom: 78, fov: 30 }, "sine-in-out"),
      VK(3.2, { rotationX: -6, rotationY: -18, rotationZ: -6, zoom: 88, fov: 24 }, "expo-in-out"),
      VK(5, { rotationX: -8, rotationY: 360, rotationZ: 0, zoom: 70, fov: 27 }),
    ], { enter: { id: "flip-h", dur: 900, delay: 0 } })] },

  // Dolly zoom: camera flies in while the lens goes from telephoto to ultra-wide
  { id: "vt-vertigo", label: "Vertigo", tags: "dolly zoom hitchcock fov warp distortion", poster: 3,
    bgs: [VBG(0, { type: "gradient", preset: "midnight-magenta" }, { grain: 8 })],
    shots: [VSHOT("Vertigo", 0, 6, [
      VK(0, { rotationX: -8, rotationY: 20, zoom: 5, fov: 0 }, "cubic-in-out"),
      VK(3.5, { rotationX: -14, rotationY: -12, rotationZ: 6, zoom: 100, fov: 120 }, "expo-out"),
      VK(6, { rotationX: -10, rotationY: 8, rotationZ: 0, zoom: 55, fov: 60 }),
    ])] },

  // Full roll around the screen axis while swinging sideways and breathing zoom / fov
  { id: "vt-roll", label: "Barrel Roll", tags: "roll rotate z 360 spin tilt", poster: 2.5,
    bgs: [VBG(0, { type: "custom", preset: "iridescent-metallic-art" })],
    shots: [VSHOT("Barrel roll", 0, 5, [
      VK(0, { rotationX: -10, rotationY: 35, rotationZ: 0, zoom: 60, fov: 27 }, "cubic-in-out"),
      VK(2.5, { rotationX: -22, rotationY: -35, rotationZ: 180, zoom: 90, fov: 70 }, "cubic-in-out"),
      VK(5, { rotationX: -10, rotationY: 35, rotationZ: 360, zoom: 60, fov: 27 }),
    ])] },

  // Starts jammed in one corner at extreme zoom, sweeps across to the opposite corner, then pulls out to hero
  { id: "vt-corner", label: "Corner Sweep", tags: "macro corner pan close up slide edge detail", poster: 2,
    bgs: [
      VBG(0, { type: "solid", hex: "0A0A0C" }),
      VBG(3.5, { type: "gradient", preset: "amber-dusk" }, { grain: 12, enter: { id: "wipe", dur: 700, delay: 0 } }),
    ],
    shots: [
      VSHOT("Corner sweep", 0, 3.5, [
        VK(0, { rotationX: -28, rotationY: 50, rotationZ: -8, positionX: 45, positionY: -50, zoom: 100, fov: 18 }, "cubic-in-out"),
        VK(3.5, { rotationX: 18, rotationY: -48, rotationZ: 8, positionX: -45, positionY: 50, zoom: 100, fov: 18 }),
      ]),
      VSHOT("Pull out", 3.5, 3, [
        VK(0, { rotationX: 18, rotationY: -48, rotationZ: 8, positionX: -45, positionY: 50, zoom: 100, fov: 18 }, "expo-out"),
        VK(3, { rotationX: -15, rotationY: 25, rotationZ: 0, positionX: 0, positionY: 0, zoom: 62, fov: 27 }),
      ]),
    ] },

  // Slams in with a heavy fisheye, then snaps flat with a spring
  { id: "vt-crash", label: "Fisheye Crash", tags: "fisheye wide fov crash impact spring snap", poster: 0.4,
    bgs: [VBG(0, { type: "gradient", preset: "sunset-orange" }, { grain: 10, enter: { id: "barrel", dur: 900, delay: 0 } })],
    shots: [VSHOT("Fisheye crash", 0, 5, [
      VK(0, { rotationX: -45, rotationY: 70, rotationZ: -35, zoom: 100, fov: 120 }, "spring"),
      VK(2.4, { rotationX: -10, rotationY: 18, rotationZ: 0, zoom: 70, fov: 27 }, "sine-in-out"),
      VK(5, { rotationX: -6, rotationY: 8, rotationZ: 2, zoom: 76, fov: 24 }),
    ], { enter: { id: "scale", dur: 700, delay: 0 } })] },

  // One flip around Y, then one flip around X, each with an overshoot
  { id: "vt-flips", label: "Double Flip", tags: "flip turn rotate 360 x y back overshoot", poster: 1.8,
    bgs: [
      VBG(0, { type: "gradient", preset: "deep-teal" }, { grain: 6 }),
      VBG(3, { type: "gradient", preset: "violet-noir" }, { grain: 8, enter: { id: "mask-expand", dur: 800, delay: 0 } }),
    ],
    shots: [
      VSHOT("Flip Y", 0, 3, [
        VK(0, { rotationX: -8, rotationY: 0, zoom: 62 }, "back-in-out"),
        VK(3, { rotationX: -8, rotationY: 360, zoom: 62 }),
      ]),
      VSHOT("Flip X", 3, 3, [
        VK(0, { rotationX: -8, rotationY: 360, zoom: 62 }, "back-in-out"),
        VK(3, { rotationX: -368, rotationY: 360, zoom: 62 }),
      ]),
    ] },

  // Starts straight above the device, spirals down while winding the roll, ends head-on
  { id: "vt-spiral", label: "Spiral Down", tags: "overhead top down spiral rotate dive descend", poster: 3,
    bgs: [VBG(0, { type: "gradient", preset: "dusk-horizon" })],
    shots: [VSHOT("Spiral down", 0, 6, [
      VK(0, { rotationX: -88, rotationY: 0, rotationZ: 180, zoom: 20, fov: 75 }, "cubic-in-out"),
      VK(3, { rotationX: -55, rotationY: 30, rotationZ: -90, zoom: 60, fov: 45 }, "expo-out"),
      VK(6, { rotationX: -4, rotationY: 0, rotationZ: 0, zoom: 76, fov: 27 }),
    ])] },

  // Hard cuts between wildly different angles (no easing between poses), then settles
  { id: "vt-strobe", label: "Strobe Cut", tags: "cut hard angles fast glitch beat jump", poster: 1.2,
    bgs: [
      VBG(0, { type: "gradient", preset: "violet-noir" }, { grain: 8 }),
      VBG(1.5, { type: "gradient", preset: "midnight-magenta" }, { grain: 8, enter: { id: "glitch", dur: 600, delay: 0 } }),
      VBG(3, { type: "custom", preset: "abstract-glowing-object" }, { enter: { id: "pixel", dur: 600, delay: 0 } }),
    ],
    shots: [VSHOT("Strobe cut", 0, 4.5, [
      VK(0, { rotationX: -15, rotationY: 25, zoom: 70 }, "hold"),
      VK(0.5, { rotationX: -12, rotationY: 28, rotationZ: -16, zoom: 70 }, "hold"),
      VK(1, { rotationX: -22, rotationY: 38, positionX: 18, positionY: -42, zoom: 100, fov: 22 }, "hold"),
      VK(1.5, { rotationX: -18, rotationY: 52, zoom: 88, fov: 105 }, "hold"),
      VK(2, { rotationX: -88, rotationY: 0, zoom: 55 }, "hold"),
      VK(2.5, { rotationX: -12, rotationY: 150, zoom: 70 }, "hold"),
      VK(3, { rotationX: -30, rotationY: -60, rotationZ: 25, zoom: 64 }, "expo-out"),
      VK(4.5, { rotationX: -8, rotationY: 10, rotationZ: 0, zoom: 74 }),
    ])] },

  // Big swings left and right that lose energy each time, with the camera pumping in and out
  { id: "vt-pendulum", label: "Pendulum", tags: "swing sway rock left right pendulum zoom pump", poster: 2,
    bgs: [VBG(0, { type: "gradient", preset: "burnt-clay" }, { grain: 8 })],
    shots: [VSHOT("Pendulum", 0, 7, [
      VK(0, { rotationX: -8, rotationY: -75, rotationZ: 14, zoom: 45, fov: 40 }, "sine-in-out"),
      VK(1.75, { rotationX: -8, rotationY: 75, rotationZ: -14, zoom: 95, fov: 20 }, "sine-in-out"),
      VK(3.5, { rotationX: -8, rotationY: -45, rotationZ: 9, zoom: 55, fov: 35 }, "sine-in-out"),
      VK(5.25, { rotationX: -8, rotationY: 28, rotationZ: -5, zoom: 80, fov: 25 }, "sine-in-out"),
      VK(7, { rotationX: -6, rotationY: 0, rotationZ: 0, zoom: 70, fov: 27 }),
    ])] },

  { id: "vt-reveal", label: "Reveal", tags: "macro close pull back two shots", poster: 5,
    bgs: [
      VBG(0, { type: "solid", hex: "0C0D10" }),
      VBG(3, { type: "gradient", preset: "sunset-orange" }, { enter: { id: "mask-expand", dur: 900, delay: 0 } }),
    ],
    shots: [
      VSHOT("Close-up", 0, 3, [VK(0, { rotationX: -22, rotationY: 38, zoom: 100, fov: 22 }, "sine-in-out"), VK(3, { rotationX: -20, rotationY: 34, zoom: 100, fov: 22 })]),
      VSHOT("Pull back", 3, 3, [VK(0, { rotationX: -20, rotationY: 34, zoom: 100, fov: 22 }, "expo-out"), VK(3, { rotationX: -15, rotationY: 25, zoom: 62 })]),
    ] },
  { id: "vt-tumble", label: "Tumble", tags: "tumble spin exit dramatic", poster: 1,
    bgs: [
      VBG(0, { type: "gradient", preset: "steel-blue" }),
      VBG(3, { type: "gradient", preset: "midnight-magenta" }, { grain: 8, enter: { id: "blur", dur: 800, delay: 0 } }),
    ],
    shots: [
      VSHOT("Settle", 0, 3, [VK(0, { rotationX: -15, rotationY: 25 }, "sine-in-out"), VK(3, { rotationX: -12, rotationY: 18 })]),
      VSHOT("Tumble", 3, 3, [VK(0, { rotationX: -12, rotationY: 18 }, "cubic-in-out"), VK(3, { rotationX: -30, rotationY: -60, rotationZ: 25, zoom: 64 })],
        { exit: { id: "scale", dur: 800, delay: 0 } }),
    ] },
];
const VIDEO_TEMPLATES = VT_RAW.map((t, i) => ({
  ...t,
  no: String(i + 1).padStart(2, "0"),
  duration: Math.max(...t.shots.map((s) => s.start + s.len)),
}));

// Frame-mode video templates. A key can carry `fo(i, n, f)`: the offset of frame i (of n) from its resting placement.
// Returns { dx, dy, k }: dx / dy in canvas-short-side units, k = scale multiplier. f = { x, y } of the resting frame.
const FK = (t, o = {}, ease, fo) => ({ ...VK(t, o, ease), ...(fo ? { fo } : {}) });
// Stagger shots: `stagger` is expanded per frame in resolveFrameTplShots (see buildStaggerKeys).
//   from / out : (i, n, f) => ({ dx, dy, k })  offset of frame i from its resting spot (k = scale multiplier)
//   step       : seconds between frames      dur : seconds each frame takes
//   order      : "start" | "end" | "center" | "random"
//   cam0/cam1  : optional camera drift across the shot
const STG = (o) => ({ step: 0.25, dur: 1.1, ease: "expo-out", order: "start", ...o });
const FVT_RAW = [
  { id: "fvt-cascade", label: "Cascade Rise", tags: "stagger cascade rise enter frames", poster: 4, layout: "triple",
    bgs: [VBG(0, { type: "gradient", preset: "ocean-blue" })],
    shots: [VSHOT("Cascade", 0, 5, [], { stagger: STG({ from: () => ({ dy: 1.6 }), step: 0.3, cam0: { zoom: 62 }, cam1: { zoom: 72 } }) })] },

  { id: "fvt-sides", label: "Alternate Sides", tags: "stagger slide left right alternate enter grid", poster: 4, layout: "grid",
    bgs: [VBG(0, { type: "gradient", preset: "violet-noir" }, { grain: 8 })],
    shots: [VSHOT("Sides", 0, 5, [], { stagger: STG({ from: (i) => ({ dx: (i % 2 ? 1 : -1) * 1.8 }), step: 0.3, ease: "cubic-out" }) })] },

  { id: "fvt-pop", label: "Pop Stagger", tags: "stagger pop scale bounce enter overlap", poster: 4, layout: "overlap",
    bgs: [VBG(0, { type: "gradient", preset: "amber-sky" })],
    shots: [VSHOT("Pop", 0, 5, [], { stagger: STG({ from: () => ({ k: 0.1 }), step: 0.2, dur: 0.9, ease: "back-out" }) })] },

  { id: "fvt-bounce", label: "Drop & Bounce", tags: "stagger drop bounce top enter", poster: 4.5, layout: "trio",
    bgs: [VBG(0, { type: "gradient", preset: "steel-blue" })],
    shots: [VSHOT("Drop", 0, 5.5, [], { stagger: STG({ from: () => ({ dy: -1.6 }), step: 0.25, dur: 1.4, ease: "bounce" }) })] },

  { id: "fvt-fan", label: "Fan Out", tags: "stagger fan spread center stack reveal", poster: 4, layout: "overlap",
    bgs: [VBG(0, { type: "gradient", preset: "midnight-magenta" }, { grain: 8 })],
    shots: [VSHOT("Fan out", 0, 5, [], { stagger: STG({ from: (i, n, f) => ({ dx: -f.x, dy: -f.y, k: 0.9 }), step: 0.15, dur: 1.2, ease: "cubic-out", order: "center", cam0: { zoom: 58 }, cam1: { zoom: 70 } }) })] },

  { id: "fvt-reverse", label: "Reverse Rise", tags: "stagger reverse last first rise", poster: 4, layout: "bleed",
    bgs: [VBG(0, { type: "gradient", preset: "burnt-clay" })],
    shots: [VSHOT("Reverse rise", 0, 5, [], { stagger: STG({ from: () => ({ dy: 1.6 }), order: "end", step: 0.3 }) })] },

  { id: "fvt-converge", label: "Converge", tags: "stagger converge spread together slide", poster: 4, layout: "triple",
    bgs: [VBG(0, { type: "gradient", preset: "cobalt-flare" })],
    shots: [VSHOT("Converge", 0, 5, [], { stagger: STG({ from: (i, n) => ({ dx: (i - (n - 1) / 2) * 1.2 }), step: 0.12, dur: 1.4, order: "center" }) })] },

  { id: "fvt-inout", label: "Rise & Exit", tags: "stagger enter exit rise up out loop grid", poster: 2.5, layout: "grid",
    bgs: [VBG(0, { type: "gradient", preset: "deep-teal" }, { grain: 6 })],
    shots: [VSHOT("Rise & exit", 0, 6, [], { stagger: STG({ from: () => ({ dy: 1.6 }), out: () => ({ dy: -1.6 }), step: 0.2, dur: 1 }) })] },

  // all four cards travel as one strip: same direction, tiny stagger, slight camera drift
  { id: "fvt-carousel", label: "Carousel", tags: "carousel strip row slide in out together", poster: 3, layout: "strip",
    bgs: [VBG(0, { type: "custom", preset: "blue-sky-scene" })],
    shots: [VSHOT("Carousel", 0, 6, [], { stagger: STG({ from: () => ({ dx: 1.8 }), out: () => ({ dx: -1.8 }), step: 0.1, dur: 1.4, ease: "cubic-out", outEase: "cubic-in", cam0: { positionX: 8 }, cam1: { positionX: -8 } }) })] },

  { id: "fvt-push", label: "Push In", tags: "zoom push close hero", poster: 4, layout: "single",
    bgs: [VBG(0, { type: "gradient", preset: "sunset-orange" })],
    shots: [VSHOT("Push in", 0, 5, [], { stagger: STG({ from: () => ({ k: 0.6 }), step: 0, dur: 5, ease: "expo-out" }) })] },

  // panning across frames that bleed off the edges
  { id: "fvt-pan", label: "Pan", tags: "pan sweep slide horizontal bleed", poster: 2.5, layout: "bleed",
    bgs: [VBG(0, { type: "custom", preset: "ethereal-gradient-abstraction" })],
    shots: [VSHOT("Pan", 0, 5, [], { stagger: STG({ from: () => ({ dx: 0.35 }), step: 0, dur: 5, ease: "cubic-in-out" }) })] },

  { id: "fvt-drop", label: "Drop In", tags: "enter exit slide top tilt duo", poster: 2.5, layout: "duo",
    bgs: [
      VBG(0, { type: "solid", hex: "0C0D10" }),
      VBG(2, { type: "gradient", preset: "forest-green" }, { enter: { id: "mask-expand", dur: 900, delay: 0 } }),
    ],
    shots: [VSHOT("Drop in", 0, 4, [],
      { stagger: STG({ from: () => ({ dr: -4 }), step: 0, dur: 4, ease: "back-out" }),
        enter: { id: "slide-top", dur: 900, delay: 0 }, exit: { id: "slide-bottom", dur: 700, delay: 0 } })] },
];
const FRAME_VIDEO_TEMPLATES = FVT_RAW.map((t, i) => ({
  ...t,
  no: String(i + 1).padStart(2, "0"),
  duration: Math.max(...t.shots.map((s) => s.start + s.len)),
}));

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
    .filter(([key]) => !(v.frameMode && ["rotationX", "rotationY", "fov"].includes(key)))
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
    <div ref={rootRef} className="order-last mt-2 shrink-0 rounded-3xl bg-[#FAF9FA] dark:bg-[#171717] flex flex-col overflow-hidden select-none">
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
  <div className="flex flex-1 items-center gap-1 min-w-0">
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

  <div className="flex items-center gap-2 shrink-0">
    <VidBtn label="Previous marker" tone="strong" onClick={() => v.onSkip(-1)}><SkipBack size={16} weight="bold" /></VidBtn>
    <VidBtn label={v.playing ? "Pause" : "Play"} tone="pink" shortcut={["Space"]} onClick={v.onTogglePlay} disabled={!hasKeys || v.exporting}>
      {v.playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
    </VidBtn>
    <VidBtn label="Next marker" tone="strong" onClick={() => v.onSkip(1)}><SkipForward size={16} weight="bold" /></VidBtn>
  </div>

  <div className="flex flex-1 items-center justify-end gap-4 min-w-0">
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
        <div onPointerDown={scrub} className="relative flex-1 flex flex-col gap-1 pt-2 pb-4 cursor-pointer">
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
              <KeyCap>⌫</KeyCap>
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
        <span className="flex items-center gap-1"><KeyCap>mod</KeyCap><KeyCap>D</KeyCap></span>
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
          <span className="flex items-center gap-1"><KeyCap>mod</KeyCap><KeyCap>G</KeyCap></span>
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
          <span className="flex items-center gap-1"><KeyCap>mod</KeyCap><KeyCap>⇧</KeyCap><KeyCap>G</KeyCap></span>
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
        <KeyCap>⌫</KeyCap>
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
        <span className="flex items-center gap-1"><KeyCap>mod</KeyCap><KeyCap>D</KeyCap></span>
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
        <KeyCap>⌫</KeyCap>
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
        <span className="flex items-center gap-1"><KeyCap>mod</KeyCap><KeyCap>D</KeyCap></span>
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
        <KeyCap>⌫</KeyCap>
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

export default function App() {
 const sceneRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadedFileRef = useRef(null);
  const [uploadedMediaLabel, setUploadedMediaLabel] = useState(null);
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
  const startTour = () => {
    setExportOpen(false);
    setCanvasSizeOpen(false);
    if (sidebarOpen) setTourOpen(true);
    else {
      setSidebarOpen(true);
      setTimeout(() => setTourOpen(true), 380);
    }
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
  const url = URL.createObjectURL(file);
  const probe = new Image();
  probe.onload = () => {
    const nw = probe.naturalWidth, nh = probe.naturalHeight;
    const img = { url, label: file.name, nw, nh, crop: null, cropUrl: null };
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
  const [exportWidth, setExportWidth] = useState(1920);
  const [exportFormat, setExportFormat] = useState("png");
  const [videoFormat, setVideoFormat] = useState("mp4");
  const [videoRes, setVideoRes] = useState(1920); // long side in px
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [videoFps, setVideoFps] = useState(24);
  const [exportProgress, setExportProgress] = useState(null); // 0-1 while a video export runs
  const [exportTransparent, setExportTransparent] = useState(true);
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
    screenInterface: true,
    position: true,
    appearance: true,
    social: true,
    camera: true,
    scene: true,
    text: true,
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
    setCameraEase(true);
    clearTimeout(cameraEaseTimerRef.current);
    cameraEaseTimerRef.current = setTimeout(() => setCameraEase(false), 360);
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

 const handleUpload = useCallback((e) => {
 if (toolbarModeRef.current === "frame") {
  const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
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
  const file = e.target.files?.[0];
  if (!file) return;
  if (imageOrVideoRef.current === "video" && vidUploadRef.current?.(file)) {
    if ("value" in e.target) e.target.value = "";
    return; // Video mode: the image belongs to the shot, not the global upload
  }
  uploadedFileRef.current = file;
  setFrameCropUrl(null);
  setUploadedCrop(null);
  sceneRef.current?.uploadFile(file);
  const url = URL.createObjectURL(file);
  setUploadedMediaLabel(file.name);
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
    uploadedFileRef.current = null;
    setFrameCropUrl(null);
    setUploadedCrop(null);
    setUploadedImageDims(null);
    setUploadedMediaLabel(null);
    setUploadedMediaThumb(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileDrop = (files) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
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
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
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
      const layer = document.createElement("canvas");
      layer.width = outW;
      layer.height = outH;
      const lctx = layer.getContext("2d");
      const comp = document.createElement("canvas");
      comp.width = outW;
      comp.height = outH;
      const cctx = comp.getContext("2d");

      for (const fr of ov?.frames ?? frames) {
        const fp = ov?.framePoses?.[fr.id];
        if (fp === "hidden") continue; // outside its row
        const { left: sx, top: sy, width: sw, height: sh } = frameRect(fr, { w: outW, h: outH });
        const rs = cornersOf(fr).map((p) => (Math.min(sw, sh) * p) / 100); // [tl, tr, br, bl]
        const srcUrl = fr.img ? (fr.img.cropUrl ?? fr.img.url) : null;
        const srcImg = !backFacing && srcUrl ? await loadImg(srcUrl) : null;
        const blurTotal = fr.effects
          .filter((e) => e.visible && e.type === "layerBlur")
          .reduce((sum, e) => sum + e.blur, 0) * k;

        lctx.clearRect(0, 0, outW, outH);
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
        cctx.drawImage(layer, 0, 0);
        cctx.restore();
      }

      let deviceLayer = comp;
      if (!isDefaultCamera(cam)) {
        deviceLayer = document.createElement("canvas");
        deviceLayer.width = outW;
        deviceLayer.height = outH;
        drawWarped(deviceLayer.getContext("2d"), comp, getFrameCamera(cam, outH), outW, outH);
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
    setOpenSections({ device: true, screenInterface: true, position: true, appearance: true, social: true, camera: true, scene: true, text: true });
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
      getFrameCamera({ ...CAM_DEFAULT, rotationZ: c.rotationZ, positionX: c.positionX, positionY: c.positionY, zoom: c.zoom }, box.h)
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
  raf = requestAnimationFrame(step);
};
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      commitCam(sampleShots(vidLive.current.shots, vidTimeRef.current));
      syncAudio(0, false);
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
      cam: c ? { ...CAM_DEFAULT, rotationZ: c.rotationZ, positionX: c.positionX, positionY: c.positionY, zoom: c.zoom } : CAM_DEFAULT,
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
          if (!frameExport) return scene.captureFrame(transparent);
          return renderFrameCanvas(w, transparent, h, {
            frames: framesLatestRef.current, // already holds this frame's keyframed placement (set by applyAnimAt above)
            cam: cam ? { ...CAM_DEFAULT, rotationZ: cam.rotationZ, positionX: cam.positionX, positionY: cam.positionY, zoom: cam.zoom } : undefined,
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
const frameCam = { rotationX: 0, rotationY: 0, rotationZ, positionX, positionY, zoom, fov: CAM_DEFAULT.fov };

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
          <div
            className="flex items-center justify-center gap-2 w-[35px] h-8 pl-2.5 pr-2 py-1 rounded-lg bg-[#FF47BC] border border-[#3A3A3A]/10"
            style={{ boxShadow: "inset 0 4px 4px rgba(255,240,255,0.5), inset 0 -2px 4px rgba(255,71,188,0.25)" }}
          >
            <span className="keep-size font-semibold text-[20px] leading-[26px] tracking-[-0.03em] text-[#FAF9FA]">b.</span>
          </div>
          <span className="keep-size font-semibold text-[20px] leading-[26px] tracking-[-0.03em] text-[#3A3A3A] dark:text-[#FAF9FA]">
            Bezel
          </span>
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
  <Tooltip label={videoOn ? "Export video" : "Export image"} placement="bottom">
    <button
      onClick={handleExport}
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
    <div className="pop-enter absolute right-0 mt-1 w-[280px] p-4 flex flex-col gap-4 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 bg-[#FAF9FA] dark:bg-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)] z-10">
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
                          <KeyCap>C</KeyCap>
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
                      <KeyCap>?</KeyCap>
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
    <Tooltip label={selectedProjectId ? "Save changes" : "Save project"} shortcut={["mod", "S"]} placement="bottom">
      <button
        onClick={() => {
          setSaveMenuOpen(false);
          handleSaveProject(false);
        }}
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
        <span className="flex items-center gap-1"><KeyCap>mod</KeyCap><KeyCap>S</KeyCap></span>
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
        <span className="flex items-center gap-1"><KeyCap>mod</KeyCap><KeyCap>⇧</KeyCap><KeyCap>S</KeyCap></span>
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
                      disabled={!mediaThumb}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setFrameCropId(f.id);
                              }}
                              className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-[background-color,transform] duration-150 active:scale-[0.9]"
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
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </div>

                    {/* Position (Frame mode only) */}
          <div className={`flex flex-col p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${toolbarMode === "frame" ? "" : "hidden"}`}>
            <SectionHeader label="Position" open={openSections.position} onToggle={() => toggleSection("position")} />

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.position ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-2">
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
              </div>
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
                      {toolbarMode === "mockup" && (
                        <Scrubber label="X - Rotation" value={rotationX} min={-360} max={360} onChange={handleRotationChange} />
                      )}
                      {toolbarMode === "mockup" && (
                        <Scrubber label="Y - Rotation" value={rotationY} min={-360} max={360} onChange={handleRotationYChange} />
                      )}
                      <Scrubber
                        label="Z - Rotation"
                        value={toolbarMode === "frame" ? Math.round(frameRotation) : rotationZ}
                        min={-360}
                        max={360}
                        onChange={toolbarMode === "frame" ? setFrameRotation : handleRotationZChange}
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
                            ? selectedFrames.every((f) => !f.r && f.s == null)
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
              <span className="flex items-center gap-1 shrink-0">
                {keys.map((k) => (
                  <KeyCap key={k}>{k}</KeyCap>
                ))}
              </span>
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
          onClose={() => {
            setTourOpen(false);
            try { localStorage.setItem("bezel:tour-seen", "1"); } catch {}
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