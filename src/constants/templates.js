// Device-agnostic looks. Applied to whichever device is currently selected.
// bg.preset values refer to GRADIENT_PRESETS / IMAGE_PRESETS; lighting / environment
// values refer to PRESETS (MockupScene) and ENVIRONMENT_OPTIONS.
export const TEMPLATE_LIBRARY = [
  { id: "t-corner-bleed", label: "Corner Bleed", tags: "close up bleed crop tilt light soft screen", cameraKey: "corner-bleed",
    bg: { type: "solid", hex: "F1F2F4" }, environment: "studio", lighting: "softbox", lightingIntensity: 55 },
  { id: "t-bottom-edge", label: "Bottom Edge", tags: "close up bottom port crop tilt light grey", cameraKey: "bottom-edge",
    bg: { type: "solid", hex: "DCDEE2" }, environment: "studio", lighting: "softbox", lightingIntensity: 55 },
  { id: "t-handheld", label: "Handheld", tags: "three quarter side angle natural light grey", cameraKey: "handheld",
    bg: { type: "solid", hex: "DADBDD" }, environment: "studio", lighting: "overcast", lightingIntensity: 55 },
  { id: "t-corner-mirror", label: "Corner Mirror", tags: "close up bleed crop tilt blue", cameraKey: "corner-mirror",
    bg: { type: "gradient", preset: "ocean-blue" }, environment: "clouds", lighting: "studio", lightingIntensity: 60 },
  { id: "t-top-edge", label: "Top Edge", tags: "close up top island headline crop dark", cameraKey: "top-edge",
    bg: { type: "solid", hex: "0C0D10" }, environment: "studio", lighting: "studio", lightingIntensity: 70 },
  { id: "t-half-screen", label: "Half Screen", tags: "crop half side bleed close warm", cameraKey: "half-screen",
    bg: { type: "gradient", preset: "amber-sky" }, environment: "studio", lighting: "softbox", lightingIntensity: 55 },
  { id: "t-float-tilt", label: "Float Tilt", tags: "float tilt roll orange warm grain", cameraKey: "float-tilt",
    bg: { type: "gradient", preset: "sunset-orange" }, grain: 12, environment: "city", lighting: "golden-hour", lightingIntensity: 70 },
  { id: "t-slant", label: "Slant", tags: "long lens slant compressed perspective blue bold", cameraKey: "slant",
    bg: { type: "gradient", preset: "cobalt-flare" }, environment: "city", lighting: "neon", lightingIntensity: 70 },
  { id: "t-look-down", label: "Look Down", tags: "high angle looking down dusk warm grain", cameraKey: "look-down",
    bg: { type: "gradient", preset: "amber-dusk" }, grain: 12, environment: "city", lighting: "golden-hour", lightingIntensity: 75 },
  { id: "t-macro-top", label: "Macro Top", tags: "macro close up headline detail dark", cameraKey: "macro-top",
    bg: { type: "gradient", preset: "violet-noir" }, grain: 8, environment: "studio", lighting: "studio", lightingIntensity: 70 },
  { id: "t-macro-bottom", label: "Macro Bottom", tags: "macro close up photo detail teal", cameraKey: "macro-bottom",
    bg: { type: "gradient", preset: "deep-teal" }, grain: 6, environment: "studio", lighting: "studio", lightingIntensity: 65 },
  { id: "t-fisheye-lean", label: "Fisheye Lean", tags: "fisheye wide glow distortion", cameraKey: "fisheye-lean",
    bg: { type: "custom", preset: "abstract-glowing-object" }, environment: "city", lighting: "neon", lightingIntensity: 70 },
  { id: "t-fisheye-close", label: "Fisheye Close", tags: "fisheye close bent fluid wide", cameraKey: "fisheye-close",
    bg: { type: "custom", preset: "abstract-fluid-forms" }, environment: "studio", lighting: "studio", lightingIntensity: 60 },
  { id: "t-low-tele", label: "Low Tele", tags: "low angle looking up sky clouds", cameraKey: "low-tele",
    bg: { type: "custom", preset: "blue-sky-scene" }, environment: "clouds", lighting: "studio", lightingIntensity: 60 },
  { id: "t-far-float", label: "Far Float", tags: "far small minimal dusk floating", cameraKey: "far-float",
    bg: { type: "gradient", preset: "dusk-horizon" }, grain: 10, environment: "clouds", lighting: "golden-hour", lightingIntensity: 55 },
  { id: "t-persp-push", label: "Perspective Push", tags: "steep side perspective metallic bold", cameraKey: "persp-push",
    bg: { type: "custom", preset: "iridescent-metallic-art" }, environment: "city", lighting: "studio", lightingIntensity: 60 },
];

// Frame-mode looks. Applied to the selected frames: background, sheen, radius, stroke, shadow.
// Optional `cam` tilts the whole canvas. Optional `canvas: { w, h }` switches the canvas to that size.
export const FRAME_TEMPLATE_LIBRARY = [
  // ---- from the references ----
  { id: "f-brief-stack", label: "Brief Stack", tags: "editorial slides stacked wide taupe flat presentation", note: "3:4",
    bg: { type: "solid", hex: "9A9392" }, environment: "none", radius: 0,
    canvas: { w: 1080, h: 1440 } },
  { id: "f-orb-row", label: "Soft Row", tags: "three phones row light grey clean app screens", note: "4:5",
    bg: { type: "solid", hex: "E4E4E5" }, environment: "studio", radius: 7,
    canvas: { w: 1080, h: 1350 },
    shadow: { x: 0, y: 20, blur: 50, spread: 0, hex: "000000", opacity: 8 } },
  { id: "f-ode-pair", label: "Pair Bleed", tags: "two phones one cropped right edge taupe dark editorial", note: "4:5",
    bg: { type: "solid", hex: "625A59" }, environment: "none", radius: 7,
    canvas: { w: 1080, h: 1350 },
    shadow: { x: 0, y: 24, blur: 60, spread: 0, hex: "000000", opacity: 18 } },
  { id: "f-notes-glass", label: "Glass Panel", tags: "big panel bleed bottom right pastel sky gradient desktop app", note: "1:1",
    bg: { type: "custom", preset: "ethereal-gradient-abstraction" }, environment: "clouds", radius: 5,
    canvas: { w: 1080, h: 1080 },
    stroke: { hex: "FFFFFF", opacity: 45, width: 2, position: "inside" },
    shadow: { x: 0, y: 30, blur: 80, spread: -10, hex: "1A3A6A", opacity: 25 } },
  { id: "f-chat-sky", label: "Chat Peek", tags: "app panel beside cropped second panel landscape photo mountain", note: "7:8",
    bg: { type: "custom", preset: "blue-sky-scene" }, environment: "clouds", radius: 5,
    canvas: { w: 1050, h: 1200 },
    shadow: { x: 0, y: 30, blur: 80, spread: -8, hex: "0A2A5A", opacity: 30 } },
  { id: "f-arc-crop", label: "Tilted Crop", tags: "close up crop panel rotated white clean browser ui", note: "1:1",
    bg: { type: "solid", hex: "FFFFFF" }, environment: "studio", radius: 6,
    canvas: { w: 1080, h: 1080 },
    cam: { rotationX: -12, rotationY: 8, rotationZ: -8, zoom: 80 },
    shadow: { x: 0, y: 30, blur: 70, spread: 0, hex: "000000", opacity: 16 } },
  { id: "f-ship-inset", label: "Pixel Inset", tags: "website wide panel inset margin green pixel grain landscape", note: "Landscape", grain: 14,
    bg: { type: "gradient", preset: "amber-sky" }, environment: "studio", radius: 1,
    canvas: { w: 1470, h: 1030 },
    shadow: { x: 0, y: 24, blur: 60, spread: 0, hex: "2A3A00", opacity: 20 } },

  // ---- extras in the same style ----
  { id: "f-brief-red", label: "Brief Red", tags: "two wide slides stacked red editorial bold flat", note: "4:5",
    bg: { type: "solid", hex: "C93A1B" }, environment: "none", radius: 0,
    canvas: { w: 1080, h: 1350 },
    shadow: { x: 0, y: 24, blur: 50, spread: 0, hex: "3A0A00", opacity: 25 } },
  { id: "f-orb-tilt", label: "Soft Tilt", tags: "three phones row perspective receding light grey", note: "Perspective",
    bg: { type: "solid", hex: "F4F4F5" }, environment: "studio", radius: 7,
    canvas: { w: 1080, h: 1350 },
    cam: { rotationX: -10, rotationY: 26, rotationZ: -3, zoom: 74 },
    shadow: { x: 0, y: 30, blur: 70, spread: 0, hex: "000000", opacity: 16 } },
  { id: "f-ode-bleed3", label: "Trio Bleed", tags: "three phones last cropped dark charcoal row", note: "4:5",
    bg: { type: "solid", hex: "2A2527" }, environment: "studio", radius: 7,
    canvas: { w: 1080, h: 1350 },
    stroke: { hex: "FFFFFF", opacity: 14, width: 1, position: "inside" },
    shadow: { x: 0, y: 30, blur: 70, spread: 0, hex: "000000", opacity: 55 } },
  { id: "f-notes-corner", label: "Corner Panel", tags: "panel top left bleed blue sky tilt desktop", note: "Corner bleed",
    bg: { type: "gradient", preset: "ocean-blue" }, environment: "clouds", radius: 5,
    canvas: { w: 1080, h: 1080 },
    cam: { rotationX: 6, rotationY: -14, rotationZ: -3, zoom: 74 },
    stroke: { hex: "FFFFFF", opacity: 45, width: 2, position: "inside" },
    shadow: { x: 0, y: 40, blur: 90, spread: -10, hex: "02304F", opacity: 30 } },
  { id: "f-chat-dusk", label: "Chat Dusk", tags: "app panel beside cropped panel dusk warm grain tilt", note: "Tilted", grain: 10,
    bg: { type: "gradient", preset: "dusk-horizon" }, environment: "clouds", radius: 5,
    canvas: { w: 1050, h: 1200 },
    cam: { rotationX: -6, rotationY: -14, rotationZ: 0, zoom: 74 },
    shadow: { x: 0, y: 40, blur: 90, spread: 0, hex: "000000", opacity: 40 } },
  { id: "f-arc-dark", label: "Dark Crop", tags: "close up crop panel rotated dark hairline", note: "1:1",
    bg: { type: "solid", hex: "0C0D10" }, environment: "studio", radius: 6,
    canvas: { w: 1080, h: 1080 },
    cam: { rotationX: -12, rotationY: 8, rotationZ: -8, zoom: 80 },
    stroke: { hex: "FFFFFF", opacity: 16, width: 1, position: "inside" },
    shadow: { x: 0, y: 30, blur: 70, spread: 0, hex: "000000", opacity: 70 } },
  { id: "f-ship-tilt", label: "Pixel Tilt", tags: "website wide panel perspective teal grain landscape", note: "Perspective", grain: 12,
    bg: { type: "gradient", preset: "deep-teal" }, environment: "studio", radius: 2,
    canvas: { w: 1470, h: 1030 },
    cam: { rotationX: -14, rotationY: 18, rotationZ: -3, zoom: 76 },
    shadow: { x: 0, y: 40, blur: 90, spread: 0, hex: "000000", opacity: 45 } },
];

// Frame-mode layouts. x / y = frame center as a fraction of canvas width / height (0 = middle, ±0.5 = edge).
// h = height as a fraction of canvas height, r = width / height. Later entries draw on top.
const FL = (x, y, h, r) => ({ x, y, h, r });
export const FRAME_LAYOUTS = {
  single: [FL(0, 0, 0.8, 0.46)],
  triple: [FL(-0.28, 0, 0.78, 0.46), FL(0, 0, 0.78, 0.46), FL(0.28, 0, 0.78, 0.46)],
  bleed: [FL(-0.24, 0, 0.8, 0.62), FL(0.14, 0, 0.8, 0.62), FL(0.52, 0, 0.8, 0.62)],
  overlap: [FL(-0.27, -0.06, 0.62, 0.78), FL(-0.09, 0.08, 0.62, 0.78), FL(0.09, -0.08, 0.62, 0.78), FL(0.27, 0.06, 0.62, 0.78)],
  hero: [FL(-0.155, -0.12, 0.62, 0.95), FL(0.195, -0.12, 0.62, 0.75), FL(0.02, 0.34, 0.3, 3.5)],
  duo: [FL(-0.17, -0.1, 0.7, 0.58), FL(0.17, 0.1, 0.7, 0.58)],
  trio: [FL(-0.24, 0.05, 0.6, 0.58), FL(0, -0.05, 0.6, 0.58), FL(0.24, 0.05, 0.6, 0.58)],
  grid: [FL(-0.1, -0.22, 0.4, 0.7), FL(0.1, -0.22, 0.4, 0.7), FL(-0.1, 0.22, 0.4, 0.7), FL(0.1, 0.22, 0.4, 0.7)],
  peek: [FL(0, 0.5, 1.1, 0.5)],
  sideHalf: [FL(0.5, 0, 0.9, 0.5)],
  sideHalfL: [FL(-0.5, 0, 0.9, 0.5)],
  strip: [FL(-0.33, 0, 0.7, 0.46), FL(-0.11, 0, 0.7, 0.46), FL(0.11, 0, 0.7, 0.46), FL(0.33, 0, 0.7, 0.46)],
  row: [FL(-0.29, 0, 0.7, 0.46), FL(0, 0, 0.7, 0.46), FL(0.29, 0, 0.7, 0.46)],
  panelBR: [FL(0.1, 0.22, 1, 1.25)],
  panelTL: [FL(-0.2, -0.2, 1.05, 1.25)],
  wide: [FL(0, 0.02, 0.6, 1.7)],
  stagger3: [FL(-0.28, 0.08, 0.7, 0.5), FL(0, -0.04, 0.8, 0.5), FL(0.28, 0.1, 0.7, 0.5)],
  duoBleed: [FL(-0.14, -0.04, 0.74, 0.46), FL(0.22, 0.16, 1, 0.46)],
  triptych: [FL(-0.37, 0, 0.92, 0.62), FL(0, 0, 0.92, 0.62), FL(0.37, 0, 0.92, 0.62)],
  // three cards stepping down diagonally
  cascade: [FL(-0.24, -0.12, 0.66, 0.46), FL(0, 0, 0.66, 0.46), FL(0.24, 0.12, 0.66, 0.46)],
  // three wide slides stacked with a thin gap (3:4 canvas)
  stack3: [FL(0, -0.32, 0.3, 1.8), FL(0, 0, 0.3, 1.8), FL(0, 0.32, 0.3, 1.8)],
  // two wide slides stacked (4:5 canvas)
  stack2: [FL(0, -0.2, 0.34, 1.8), FL(0, 0.2, 0.34, 1.8)],
  // three phones, even row, generous margins (4:5 canvas)
  lightRow: [FL(-0.319, 0, 0.51, 0.46), FL(0, 0, 0.51, 0.46), FL(0.319, 0, 0.51, 0.46)],
  // one full phone + one bleeding off the right edge (4:5 canvas)
  phonePair: [FL(-0.136, 0, 0.83, 0.48), FL(0.41, 0, 0.83, 0.48)],
  // three phones, the last cropped by the right edge (4:5 canvas)
  phoneBleed3: [FL(-0.27, 0, 0.7, 0.46), FL(0.17, 0, 0.7, 0.46), FL(0.61, 0, 0.7, 0.46)],
  // big panel bleeding off the bottom-right (1:1 canvas)
  notesPanel: [FL(0.183, 0.177, 0.734, 1.41)],
  // cropped side panel on the left + main panel on top (7:8 canvas)
  chatPair: [FL(-0.53, 0, 1.0, 0.39), FL(0, 0.046, 0.873, 0.61)],
  // oversized wide panel, top edge visible, bleeding off bottom (1:1 canvas)
  cropTilt: [FL(0.1, 0.37, 1.2, 1.7)],
  // wide panel inset with a margin (landscape canvas)
  siteInset: [FL(0, 0, 0.79, 1.52)],
};

// template id -> layout key. Anything not listed uses "single".
const FRAME_TEMPLATE_LAYOUT = {
  "f-brief-stack": "stack3",
  "f-brief-red": "stack2",
  "f-orb-row": "lightRow",
  "f-orb-tilt": "lightRow",
  "f-ode-pair": "phonePair",
  "f-ode-bleed3": "phoneBleed3",
  "f-notes-glass": "notesPanel",
  "f-notes-corner": "panelTL",
  "f-chat-sky": "chatPair",
  "f-chat-dusk": "chatPair",
  "f-arc-crop": "cropTilt",
  "f-arc-dark": "cropTilt",
  "f-ship-inset": "siteInset",
  "f-ship-tilt": "siteInset",
};
export const layoutOf = (tpl) => FRAME_LAYOUTS[FRAME_TEMPLATE_LAYOUT[tpl.id]] ?? FRAME_LAYOUTS.single;