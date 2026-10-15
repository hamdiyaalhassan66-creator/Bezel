// Device-agnostic looks. Applied to whichever device is currently selected.
// bg.preset values refer to GRADIENT_PRESETS / IMAGE_PRESETS; lighting / environment
// values refer to PRESETS (MockupScene) and ENVIRONMENT_OPTIONS.
export const TEMPLATE_LIBRARY = [
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
export const FRAME_TEMPLATE_LIBRARY = [
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

// Frame-mode layouts. x / y = frame center as a fraction of canvas width / height (0 = middle, ±0.5 = edge).
// h = height as a fraction of canvas height, r = width / height. Later entries draw on top.
const FL = (x, y, h, r) => ({ x, y, h, r });
export const FRAME_LAYOUTS = {
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
export const layoutOf = (tpl) => FRAME_LAYOUTS[FRAME_TEMPLATE_LAYOUT[tpl.id]] ?? FRAME_LAYOUTS.single;