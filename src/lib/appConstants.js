import { Drop, Grains, DotsNine, Waves, Checkerboard, Aperture, GridFour, LineSegments, ChartBar, Asterisk, SquaresFour, Diamond, Lightning, Money } from "@phosphor-icons/react";
import { GRAD_FX_TYPES } from "./gradientFilters.js";
import { SHARED_FX, ALL_EFFECT_OPTIONS } from "./sharedEffects.js";
import { FX_ICON } from "../constants/effectIcons.js";

// Frame-tab effects: labels come from EFFECT_TYPE_OPTIONS, so they always match the type dropdown
export const FRAME_FX = ALL_EFFECT_OPTIONS.map((o) => ({ type: o.value, label: o.label, Icon: FX_ICON[o.value] ?? Drop }));
export const FRAME_FX_OPTIONS = FRAME_FX.map((x) => ({ value: x.type, label: x.label, Icon: x.Icon }));
// Mockup tab: only the shared effects (shadow, blur and noise are frame-only)
export const MOCKUP_FX = FRAME_FX.filter((x) => SHARED_FX[x.type] || x.type === "layerBlur");
export const MOCKUP_FX_OPTIONS = MOCKUP_FX.map((x) => ({ value: x.type, label: x.label, Icon: x.Icon }));
// Gradient background filters
export const GRAD_FX_ICON = {
  grain: Grains, halftone: DotsNine, warp: Waves, dither: Checkerboard, lens: Aperture,
  pixelate: GridFour, hatching: LineSegments, pistons: ChartBar, asciiwave: Asterisk, collapsinggrid: SquaresFour, patternrefraction: Diamond, glitch: Lightning, banknote: Money,
};
export const GRAD_FX_LIST = GRAD_FX_TYPES.map((o) => ({ type: o.value, label: o.label, Icon: GRAD_FX_ICON[o.value] ?? Drop }));
export const GRAD_FX_OPTIONS = GRAD_FX_LIST.map((x) => ({ value: x.type, label: x.label, Icon: x.Icon }));
// color-picker targets for gradient filter colors: [hex key, opacity key]
export const GFX_COLOR = {
  "gfx-mono": ["monoHex"], "gfx-bg": ["bgHex", "bgOpacity"], "gfx-fg": ["fgHex", "fgOpacity"],
  "gfx-wave": ["waveHex"], "gfx-wavebg": ["waveBgHex"],
  "gfx-ink": ["inkHex", "inkOpacity"], "gfx-paper": ["paperHex", "paperOpacity"], "gfx-accent": ["accentHex", "accentOpacity"],
};

// Original pixel size of a frame's image (the crop if it has one), or null for empty frames
export const nativeSizeOf = (f) =>
  f?.img ? (f.img.crop ? { w: f.img.crop.width, h: f.img.crop.height } : { w: f.img.nw, h: f.img.nh }) : null;

export const FRAME_BROWSER_DEFAULT = { on: false, type: "safari", theme: "light", tabs: "top", url: "bezel.app" };

export const NAV = (() => {
  try { return JSON.parse(localStorage.getItem("bezel:nav")) ?? {}; } catch { return {}; }
})();

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const GUIDE = "#E0149F"; // same guide color as FrameLayer

// Lets pending React updates run. Unlike requestAnimationFrame, it still fires while the tab is hidden.
export const yieldNow = () =>
  new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => {
      ch.port1.close();
      resolve();
    };
    ch.port2.postMessage(0);
  });
export const PROJECTS_PATH = `${BASE}/projects`;
export const isProjectsPath = () => {
  const p = window.location.pathname.replace(/\/+$/, "");
  return p === PROJECTS_PATH || p.startsWith(`${PROJECTS_PATH}/`);
};

// Color the depth shade blends toward: a solid background exactly, otherwise white on light backgrounds and black on dark ones
export const depthTintOf = (s) => {
  const lum = (hex) => {
    const n = parseInt(hex || "000000", 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };
  if (s.bgType === "solid") return `#${s.bgHex}`;
  if (s.bgType === "gradient" && s.gradientStops?.length)
    return s.gradientStops.reduce((a, x) => a + lum(x.hex), 0) / s.gradientStops.length > 0.5 ? "#FFFFFF" : "#000000";
  return "#000000";
};