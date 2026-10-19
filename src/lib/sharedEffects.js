import { EFFECT_TYPE_OPTIONS, makeEffect } from "./frameUtils.js";

const slider = (key, label, min, max) => ({ key, label, min, max });

// One entry per effect that exists in both the Frame and Animation tabs.
// defaults = the effect's fields (Animation items add id + on, Frame effects add id + visible).
// fields   = what the popup shows. { color: true } renders the hex / opacity field.
export const SHARED_FX = {
  glow: {
    label: "Glow",
    defaults: { x: 0, y: 0, blur: 40, spread: 0, hex: "FF47BC", opacity: 60 },
    fields: [slider("blur", "Blur", 0, 200), slider("spread", "Spread", -50, 50), { color: true }],
  },
  chromatic: {
    label: "Chromatic aberration",
    defaults: { amount: 6, angle: 0 },
    fields: [slider("amount", "Amount", 0, 50), slider("angle", "Angle", -180, 180)],
  },
  fishEye: {
    label: "Fish eye",
    defaults: { amount: 40 },
    fields: [slider("amount", "Amount", 0, 100)],
  },
  vignette: {
    label: "Vignette",
    defaults: { amount: 50, size: 40, feather: 60 },
    fields: [slider("amount", "Amount", 0, 100), slider("size", "Size", 0, 100), slider("feather", "Feather", 0, 100)],
  },
liquidGlass: {
  label: "Liquid glass",
  defaults: {
    height: 12,
    lightAngle: -102, lightIntensity: 80,
    refraction: 80, depth: 73, dispersion: 50, frost: 4, splay: 0,
    splayCurve: 100, bendLimit: 90,
  },
  fields: [
    slider("height", "Height", 2, 50),
    slider("lightAngle", "Light angle", -180, 180),
    slider("lightIntensity", "Light intensity", 0, 100),
    slider("refraction", "Refraction", 0, 100),
    slider("depth", "Depth", 0, 100),
    slider("dispersion", "Dispersion", 0, 100),
    slider("frost", "Frost", 0, 100),
    slider("splay", "Splay", 0, 100),
  ],
},
};

export const SHARED_FX_OPTIONS = Object.entries(SHARED_FX).map(([value, d]) => ({ value, label: d.label }));
export const ALL_EFFECT_OPTIONS = [...EFFECT_TYPE_OPTIONS, ...SHARED_FX_OPTIONS];

// like makeEffect, but also knows the shared types
export const makeFx = (type, id) =>
  SHARED_FX[type] ? { id, type, visible: true, ...SHARED_FX[type].defaults } : makeEffect(type, id);

// effects drawn as a shadow behind the frame
export const isShadowFx = (e) => e.type === "dropShadow" || e.type === "glow";