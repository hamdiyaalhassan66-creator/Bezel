import { DEFAULT_STROKE, hexRgba, buildGradientCss, sheenCss, makeGrainUrl } from "./frameUtils.js";
import { DEFAULT_SOCIAL } from "./social.js";

// Default frame size (same shape as the old iPhone 16 Pro Max default).
export const FRAME_DEFAULT_SIZE = { w: 1320, h: 2868 };

// x / y are the frame's center offset from the canvas center, and s is on-screen px per nominal px.
// Both are in units of the canvas box's short side, so layouts survive canvas resizes.
// s = null means "auto-fit to 80% of the canvas" (what a fresh upload/crop uses).
export const makeFrame = (id, patch = {}) => ({
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

export const cornersOf = (f) => f.corners ?? [f.radius, f.radius, f.radius, f.radius];
export const backFillOf = (f) =>
  f.backType === "solid" ? hexRgba(f.backHex, f.backOpacity) : buildGradientCss(f.backGradientType, f.backGradientAngle, f.backStops);
export const backOpacityOf = (f) => (f.backType === "solid" ? 1 : f.backGradientOpacity / 100);

// Per-frame version of the old App-level `frameAppearance`.
export function frameAppearanceOf(f, env, rx, ry) {
  const s = f.stroke;
  const strokeOn = s.on && s.width > 0;
  const strokeCss = hexRgba(s.hex, s.opacity);
  const outer = [];
  if (strokeOn && s.position === "outside") outer.push(`0 0 0 ${s.width}px ${strokeCss}`);
  if (strokeOn && s.position === "center") outer.push(`0 0 0 ${s.width / 2}px ${strokeCss}`);
  f.effects
    .filter((e) => e.visible && e.type === "dropShadow")
    .forEach((e) => outer.push(`${e.x}px ${e.y}px ${e.blur}px ${e.spread}px ${hexRgba(e.hex, e.opacity)}`));
  const blur = f.effects.filter((e) => e.visible && e.type === "layerBlur" && e.mode !== "progressive").reduce((sum, e) => sum + e.blur, 0);
  const progressive = f.effects.filter((e) => e.visible && e.type === "layerBlur" && e.mode === "progressive" && e.blur > 0).map((e) => e.blur);
  return {
    radiiFrac: cornersOf(f).map((p) => p / 100),
    sheen: sheenCss(env, rx, ry),
    sheenKey: env,
    boxShadow: outer.length ? outer.join(", ") : "none",
    filter: blur > 0 ? `blur(${blur}px)` : "none",
    progressive,
    insetStroke:
      strokeOn && s.position !== "outside"
        ? `inset 0 0 0 ${s.position === "center" ? s.width / 2 : s.width}px ${strokeCss}`
        : null,
    noise: f.effects
      .filter((e) => e.visible && e.type === "noise")
      .map((e) => ({ id: e.id, opacity: (e.amount / 100) * 0.6, url: makeGrainUrl(e.size) })),
  };
}

export function frameRect(f, box) {
  const short = Math.min(box.w, box.h);
  const ratio = f.w / f.h;
  const width = f.s == null ? Math.min(box.w * 0.8, box.h * 0.8 * ratio) : f.w * f.s * short;
  const height = f.s == null ? width / ratio : f.h * f.s * short;
  return { left: box.w / 2 + f.x * short - width / 2, top: box.h / 2 + f.y * short - height / 2, width, height };
}

// Deep copy of a frame (same fields duplicateSelected copies), under a new id.
export const cloneFrame = (f, id) => ({
  ...f,
  id,
  img: f.img ? { ...f.img } : null,
  corners: f.corners ? [...f.corners] : null,
  stroke: { ...f.stroke },
  social: { ...f.social },
  effects: f.effects.map((e) => ({ ...e })),
  backStops: f.backStops.map((s) => ({ ...s })),
});