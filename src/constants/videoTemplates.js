import { CAM_DEFAULT, hexRgba, buildGradientCss } from "../lib/frameUtils.js";
import { vidEaseSpec } from "../lib/videoMath.js";
import { GRADIENT_PRESETS, IMAGE_PRESETS } from "./presets.js";
import { FRAME_LAYOUTS } from "./templates.js";

// ---------- Video templates ----------
// VK = camera keyframe (t is relative to the shot). VSHOT = a shot. poster = time (s) shown on the card at rest.
const VK = (t, o = {}, ease) => ({ t, ...CAM_DEFAULT, ...o, ...(ease ? { ease: vidEaseSpec(ease) } : {}) });
const VSHOT = (name, start, len, keys, extra = {}) => ({ name, start, len, keys, ...extra });

// Background clip for a template. `at` = start time (s). The clip runs until the next one starts, or to the end of the timeline.
// bg uses the same shape as TEMPLATE_LIBRARY (solid / gradient / custom). extra: { grain, enter }.
const VBG = (at, bg, extra = {}) => ({ at, bg, ...extra });

export const vtBgSnap = (bg, grain = 0) => {
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

export const vtBgCss = (sn) =>
  sn.bgType === "solid"
    ? hexRgba(sn.bgHex, sn.bgOpacity)
    : sn.bgType === "gradient"
    ? buildGradientCss(sn.gradientType, sn.gradientAngle, sn.gradientStops)
    : sn.customBgImageUrl
    ? `center / cover url(${sn.customBgImageUrl})`
    : "transparent";

const VT_RAW = [
  // Hard-cut closeups on the headline, the photo and the nav pill, then pulls back to the full screen
  { id: "vt-macro", label: "Macro Cuts", tags: "macro closeup close up detail cuts screen headline pull back montage", poster: 7,
    bgs: [VBG(0, { type: "gradient", preset: "violet-noir" }, { grain: 8 })],
    shots: [
      VSHOT("Headline", 0, 1.8, [
        VK(0, { rotationX: -6, rotationY: 14, positionX: 6, positionY: 42, zoom: 100, fov: 12 }, "sine-in-out"),
        VK(1.8, { rotationX: -5, rotationY: 10, positionX: 2, positionY: 38, zoom: 100, fov: 12 }),
      ]),
      VSHOT("Photo", 1.8, 1.8, [
        VK(0, { rotationX: 4, rotationY: -16, positionX: -4, positionY: -34, zoom: 100, fov: 12 }, "sine-in-out"),
        VK(1.8, { rotationX: 3, rotationY: -12, positionX: 0, positionY: -38, zoom: 100, fov: 12 }),
      ]),
      VSHOT("Nav pill", 3.6, 1.8, [
        VK(0, { rotationX: 0, rotationY: 8, positionX: 0, positionY: -58, zoom: 100, fov: 9 }, "sine-in-out"),
        VK(1.8, { rotationX: 0, rotationY: 4, positionX: 0, positionY: -56, zoom: 100, fov: 9 }),
      ]),
      VSHOT("Pull back", 5.4, 3.6, [
        VK(0, { rotationX: 0, rotationY: 4, positionY: -56, zoom: 100, fov: 9 }, "expo-out"),
        VK(3.6, { rotationX: -6, rotationY: 12, positionY: 0, zoom: 62, fov: 27 }),
      ]),
    ] },

  // One fast Y turn that lands on the screen, then pushes into a tight telephoto closeup
  { id: "vt-gyro", label: "Gyro Flip", tags: "flip turn spin rotate y overshoot back gyro zoom push", poster: 5,
    bgs: [VBG(0, { type: "gradient", preset: "deep-teal" }, { grain: 8 })],
    shots: [VSHOT("Gyro flip", 0, 6, [
      VK(0, { rotationX: -8, rotationY: 0, zoom: 45, fov: 27 }, "back-in-out"),
      VK(2.4, { rotationX: -8, rotationY: 360, zoom: 85, fov: 40 }, "expo-out"),
      VK(6, { rotationX: -4, rotationY: 360, zoom: 100, fov: 14 }),
    ])] },

  // Starts tilted back with the screen in steep perspective, snaps level, then pushes in
  { id: "vt-topdown", label: "Top-Down Slam", tags: "tilt perspective top down drop slam level hero push", poster: 1.2,
    bgs: [VBG(0, { type: "gradient", preset: "steel-blue" }, { grain: 6 })],
    shots: [VSHOT("Top-down slam", 0, 5, [
      VK(0, { rotationX: -58, rotationY: 0, rotationZ: 0, zoom: 55, fov: 45 }, "expo-in-out"),
      VK(1.8, { rotationX: -4, rotationY: 0, rotationZ: 0, zoom: 62, fov: 27 }, "expo-out"),
      VK(3.4, { rotationX: -8, rotationY: 14, rotationZ: 3, zoom: 85, fov: 22 }, "cubic-in-out"),
      VK(5, { rotationX: -4, rotationY: -8, rotationZ: 0, zoom: 100, fov: 14 }),
    ])] },

  // Zoom pumps between a tiny device and a screen-filling closeup, twice
  { id: "vt-pulse", label: "Dolly Pulse", tags: "dolly zoom pulse push pull breathe repeat in out screen fill", poster: 2.4,
    bgs: [VBG(0, { type: "gradient", preset: "ocean-blue" }, { grain: 8 })],
    shots: [VSHOT("Dolly pulse", 0, 8, [
      VK(0, { rotationX: -6, rotationY: 12, zoom: 20, fov: 24 }, "expo-in-out"),
      VK(2, { rotationX: -2, rotationY: -6, zoom: 100, fov: 36 }, "expo-in-out"),
      VK(4, { rotationX: -8, rotationY: 14, zoom: 25, fov: 24 }, "expo-in-out"),
      VK(6, { rotationX: -2, rotationY: -4, zoom: 100, fov: 36 }, "expo-in-out"),
      VK(8, { rotationX: -6, rotationY: 8, zoom: 68, fov: 27 }),
    ])] },

  // Opens on the back for a moment, whips round to the screen, then pushes in
  { id: "vt-backflip", label: "Back Reveal", tags: "back rear flip reveal turn around spin 180 screen", poster: 2.6,
    bgs: [VBG(0, { type: "gradient", preset: "dusk-horizon" }, { grain: 10 })],
    shots: [VSHOT("Back reveal", 0, 6, [
      VK(0, { rotationX: -10, rotationY: 180, rotationZ: -12, zoom: 70, fov: 24 }, "expo-out"),
      VK(1.4, { rotationX: -6, rotationY: 0, rotationZ: 0, zoom: 65, fov: 30 }, "cubic-in-out"),
      VK(6, { rotationX: -3, rotationY: -6, zoom: 100, fov: 12 }),
    ])] },

  // Rolls a full turn on Z while rushing in from far away, lands on the screen
  { id: "vt-corkscrew", label: "Corkscrew Push", tags: "roll z spin corkscrew push in zoom rush twist entrance", poster: 2.2,
    bgs: [VBG(0, { type: "gradient", preset: "amber-sky" }, { grain: 8 })],
    shots: [VSHOT("Corkscrew push", 0, 6, [
      VK(0, { rotationX: -14, rotationY: 20, rotationZ: -360, zoom: 8, fov: 60 }, "expo-out"),
      VK(3, { rotationX: -8, rotationY: -12, rotationZ: 0, zoom: 75, fov: 30 }, "cubic-in-out"),
      VK(6, { rotationX: -4, rotationY: 6, rotationZ: 0, zoom: 100, fov: 12 }),
    ])] },

  // Whips in from the left, locks onto the screen, holds a beat, then whips out to the right
  { id: "vt-flyby", label: "Fly-By", tags: "fly by pass whip rotate in out sweep side exit", poster: 3,
    bgs: [VBG(0, { type: "gradient", preset: "forest-green" }, { grain: 6 })],
    shots: [VSHOT("Fly-by", 0, 6, [
      VK(0, { rotationX: -10, rotationY: -70, rotationZ: -10, positionX: -90, zoom: 40, fov: 50 }, "expo-out"),
      VK(2.5, { rotationX: -6, rotationY: 8, rotationZ: 0, positionX: 0, zoom: 85, fov: 24 }, "sine-in-out"),
      VK(3.5, { rotationX: -6, rotationY: 12, rotationZ: 0, positionX: 0, zoom: 92, fov: 22 }, "cubic-in"),
      VK(6, { rotationX: -10, rotationY: 70, rotationZ: 10, positionX: 90, zoom: 40, fov: 50 }),
    ], { exit: { id: "scale", dur: 700, delay: 0 } })] },

  // Tilted dutch angle on a tight shot of the screen that levels out as the camera pulls away
  { id: "vt-dutch", label: "Dutch Reveal", tags: "dutch angle tilt roll closeup level reveal tension cinematic", poster: 0.3,
    bgs: [VBG(0, { type: "gradient", preset: "cobalt-flare" }, { grain: 10 })],
    shots: [VSHOT("Dutch reveal", 0, 6, [
      VK(0, { rotationX: -10, rotationY: 24, rotationZ: -22, positionX: 8, positionY: -20, zoom: 100, fov: 12 }, "sine-in-out"),
      VK(2.5, { rotationX: -8, rotationY: 20, rotationZ: -14, positionX: 4, positionY: -12, zoom: 100, fov: 12 }, "expo-in-out"),
      VK(6, { rotationX: -6, rotationY: 8, rotationZ: 0, positionX: 0, positionY: 0, zoom: 68, fov: 26 }),
    ])] },

  // Reference 2: small device, slow push until the screen fills the frame, hold, then pull back out
  { id: "vt-screenpush", label: "Screen Push", tags: "push in zoom fill screen hold pull out scale reveal hero", poster: 4.2,
    bgs: [VBG(0, { type: "gradient", preset: "sunset-orange" }, { grain: 8 })],
    shots: [VSHOT("Screen push", 0, 9, [
      VK(0, { rotationX: 0, rotationY: 0, zoom: 35, fov: 24 }, "expo-in-out"),
      VK(3.6, { rotationX: 0, rotationY: 0, zoom: 100, fov: 20 }, "sine-in-out"),
      VK(5.4, { rotationX: -2, rotationY: 3, zoom: 100, fov: 20 }, "expo-in-out"),
      VK(9, { rotationX: 0, rotationY: 0, zoom: 35, fov: 24 }),
    ])] },

  // Reference 1: steep tilted perspective straightens, then leans left and right with a roll, then settles
  { id: "vt-herotilt", label: "Hero Tilt", tags: "tilt lean sway perspective roll left right hero straighten", poster: 4,
    bgs: [VBG(0, { type: "gradient", preset: "burnt-clay" }, { grain: 10 })],
    shots: [VSHOT("Hero tilt", 0, 9, [
      VK(0, { rotationX: -30, rotationY: 0, rotationZ: 0, zoom: 50, fov: 36 }, "expo-out"),
      VK(1.8, { rotationX: 0, rotationY: 0, rotationZ: 0, zoom: 60, fov: 27 }, "sine-in-out"),
      VK(3.6, { rotationX: -8, rotationY: -22, rotationZ: 8, zoom: 85, fov: 24 }, "sine-in-out"),
      VK(5.8, { rotationX: -8, rotationY: 22, rotationZ: -8, zoom: 85, fov: 24 }, "sine-in-out"),
      VK(9, { rotationX: 0, rotationY: 0, rotationZ: 0, zoom: 62, fov: 27 }),
    ])] },

  // Swings left and right while the zoom pumps from wide to tight on every swing
  { id: "vt-swing", label: "Swing Zoom", tags: "swing sway left right zoom pump alternate energy tilt", poster: 2.5,
    bgs: [VBG(0, { type: "gradient", preset: "midnight-magenta" }, { grain: 8 })],
    shots: [VSHOT("Swing zoom", 0, 8, [
      VK(0, { rotationX: -6, rotationY: -28, rotationZ: 6, zoom: 35, fov: 30 }, "sine-in-out"),
      VK(2, { rotationX: -6, rotationY: 28, rotationZ: -6, zoom: 100, fov: 20 }, "sine-in-out"),
      VK(4, { rotationX: -6, rotationY: -22, rotationZ: 5, zoom: 40, fov: 30 }, "sine-in-out"),
      VK(6, { rotationX: -4, rotationY: 16, rotationZ: -4, zoom: 100, fov: 18 }, "sine-in-out"),
      VK(8, { rotationX: -4, rotationY: 0, rotationZ: 0, zoom: 70, fov: 27 }),
    ])] },

  // Dolly zoom on the screen: the device stays the same size while the perspective stretches around it
  { id: "vt-dollyzoom", label: "Dolly Zoom", tags: "dolly zoom vertigo fov stretch perspective warp screen", poster: 3.2,
    bgs: [VBG(0, { type: "gradient", preset: "violet-noir" }, { grain: 8 })],
    shots: [VSHOT("Dolly zoom", 0, 6, [
      VK(0, { rotationX: -4, rotationY: 8, zoom: 95, fov: 10 }, "cubic-in-out"),
      VK(3.6, { rotationX: -6, rotationY: -6, zoom: 38, fov: 62 }, "expo-out"),
      VK(6, { rotationX: -4, rotationY: 4, zoom: 70, fov: 27 }),
    ])] },

  // Macro lens glides down the screen from the headline to the photo to the nav pill, then pulls out
  { id: "vt-scan", label: "Screen Scan", tags: "scan scroll glide pan down screen macro closeup detail pull out", poster: 3,
    bgs: [VBG(0, { type: "gradient", preset: "dusk-horizon" }, { grain: 8 })],
    shots: [VSHOT("Screen scan", 0, 8, [
      VK(0, { rotationX: -4, rotationY: 14, positionY: 55, zoom: 100, fov: 12 }, "sine-in-out"),
      VK(5, { rotationX: -4, rotationY: -10, positionY: -55, zoom: 100, fov: 12 }, "expo-out"),
      VK(8, { rotationX: -6, rotationY: 6, positionY: 0, zoom: 66, fov: 27 }),
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

  // Slow lean-and-sway arc with the zoom breathing between mid and tight, screen always in view
  { id: "vt-arc", label: "Arc Sway", tags: "arc sway orbit light slow lean breathe zoom smooth cinematic", poster: 4.5,
    bgs: [VBG(0, { type: "custom", preset: "iridescent-metallic-art" })],
    shots: [VSHOT("Arc sway", 0, 9, [
      VK(0, { rotationX: -10, rotationY: -35, rotationZ: 3, zoom: 55, fov: 24 }, "sine-in-out"),
      VK(3, { rotationX: -4, rotationY: 0, rotationZ: 0, zoom: 95, fov: 18 }, "sine-in-out"),
      VK(6, { rotationX: -10, rotationY: 35, rotationZ: -3, zoom: 60, fov: 24 }, "sine-in-out"),
      VK(9, { rotationX: -6, rotationY: 8, rotationZ: 0, zoom: 75, fov: 24 }),
    ])] },

  // Starts filling the frame with a rolled screen, spirals out to a small tilted device, then settles
  { id: "vt-spiralout", label: "Spiral Out", tags: "spiral pull away roll zoom out shrink float tilt reveal", poster: 0.4,
    bgs: [VBG(0, { type: "gradient", preset: "amber-dusk" }, { grain: 10 })],
    shots: [VSHOT("Spiral out", 0, 7, [
      VK(0, { rotationX: -4, rotationY: 8, rotationZ: 14, zoom: 100, fov: 12 }, "expo-out"),
      VK(3, { rotationX: -14, rotationY: 30, rotationZ: -10, zoom: 25, fov: 40 }, "cubic-in-out"),
      VK(7, { rotationX: -6, rotationY: 8, rotationZ: 0, zoom: 70, fov: 27 }),
    ])] },
];
export const VIDEO_TEMPLATES = VT_RAW.map((t, i) => ({
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
// Layout from FRAME_LAYOUTS with a corner radius and no effects, so no drop shadows come along.
const FL_ = (key, radius = 5) => FRAME_LAYOUTS[key].map((s) => ({ ...s, radius, fx: [], blurs: [] }));
// Slow camera move across the whole template (tilt / perspective drift).
const CAMSHOT = (len, a, b) => VSHOT("Camera", 0, len, [VK(0, a, "sine-in-out"), VK(len, b)]);

const FVT_RAW = [
  // ---- from the references ----
  { id: "fvt-brief-stack", label: "Brief Stack", tags: "editorial slides stacked alternate slide taupe flat presentation", poster: 3.5,
    layout: FL_("stack3", 0), canvas: { w: 1080, h: 1440 },
    bgs: [VBG(0, { type: "solid", hex: "9A9392" })],
    shots: [VSHOT("Slides", 0, 5, [], { stagger: STG({ from: (i) => ({ dx: (i % 2 ? 1 : -1) * 1.6 }), step: 0.3, dur: 1.2 }) })] },

  { id: "fvt-soft-row", label: "Soft Row", tags: "three phones row rise light grey clean app screens", poster: 4,
    layout: FL_("lightRow", 7), canvas: { w: 1080, h: 1350 },
    bgs: [VBG(0, { type: "solid", hex: "E4E4E5" })],
    shots: [VSHOT("Rise", 0, 5, [], { stagger: STG({ from: () => ({ dy: 1.6 }), step: 0.3, dur: 1.2 }) })] },

  { id: "fvt-pair-bleed", label: "Pair Bleed", tags: "two phones one cropped right edge taupe dark editorial", poster: 4,
    layout: FL_("phonePair", 7), canvas: { w: 1080, h: 1350 },
    bgs: [VBG(0, { type: "solid", hex: "625A59" })],
    shots: [VSHOT("Pair", 0, 5, [], { stagger: STG({ from: (i) => (i ? { dx: 1.4 } : { dy: 1.6 }), step: 0.35, dur: 1.3 }) })] },

  { id: "fvt-glass-panel", label: "Glass Panel", tags: "big panel bleed bottom right pastel sky gradient desktop app glide", poster: 3,
    layout: FL_("notesPanel", 5), canvas: { w: 1080, h: 1080 },
    bgs: [VBG(0, { type: "custom", preset: "ethereal-gradient-abstraction" })],
    shots: [
      VSHOT("Panel", 0, 5, [], { stagger: STG({ from: () => ({ dx: 0.7, dy: 0.7, k: 0.9 }), step: 0, dur: 2, ease: "expo-out" }) }),
      CAMSHOT(5, { zoom: 70 }, { zoom: 76, positionX: -3 }),
    ] },

  { id: "fvt-chat-peek", label: "Chat Peek", tags: "app panel beside cropped second panel photo mountain slide", poster: 4,
    layout: FL_("chatPair", 5), canvas: { w: 1050, h: 1200 },
    bgs: [VBG(0, { type: "custom", preset: "blue-sky-scene" })],
    shots: [VSHOT("Peek", 0, 5, [], { stagger: STG({ from: (i) => (i === 0 ? { dx: -1 } : { dy: 1.3 }), step: 0.4, dur: 1.4 }) })] },

  { id: "fvt-tilted-crop", label: "Tilted Crop", tags: "close up crop panel rotated white clean browser ui rise tilt", poster: 3.5,
    layout: FL_("cropTilt", 6), canvas: { w: 1080, h: 1080 },
    bgs: [VBG(0, { type: "solid", hex: "FFFFFF" })],
    shots: [
      VSHOT("Rise", 0, 5, [], { stagger: STG({ from: () => ({ dy: 1.4 }), step: 0, dur: 2.2 }) }),
      CAMSHOT(5, { rotationX: -12, rotationY: 8, rotationZ: -8, zoom: 80 }, { rotationX: -8, rotationY: 4, rotationZ: -4, zoom: 84 }),
    ] },

  { id: "fvt-pixel-inset", label: "Pixel Inset", tags: "website wide panel inset margin green pixel grain landscape push", poster: 4,
    layout: FL_("siteInset", 1), canvas: { w: 1470, h: 1030 },
    bgs: [VBG(0, { type: "gradient", preset: "amber-sky" }, { grain: 14 })],
    shots: [VSHOT("Push", 0, 5, [], { stagger: STG({ from: () => ({ k: 0.8, dy: 0.25 }), step: 0, dur: 2.4 }) })] },

  // ---- extras in the same style ----
  { id: "fvt-brief-red", label: "Brief Red", tags: "two wide slides stacked red editorial bold flat top bottom", poster: 3.5,
    layout: FL_("stack2", 0), canvas: { w: 1080, h: 1350 },
    bgs: [VBG(0, { type: "solid", hex: "C93A1B" })],
    shots: [VSHOT("Slides", 0, 5, [], { stagger: STG({ from: (i) => ({ dy: i ? 1.6 : -1.6 }), step: 0.2, dur: 1.2 }) })] },

  { id: "fvt-soft-tilt", label: "Soft Tilt", tags: "three phones row perspective receding converge light grey", poster: 4,
    layout: FL_("lightRow", 7), canvas: { w: 1080, h: 1350 },
    bgs: [VBG(0, { type: "solid", hex: "F4F4F5" })],
    shots: [
      VSHOT("Converge", 0, 5, [], { stagger: STG({ from: (i, n) => ({ dx: (i - (n - 1) / 2) * 1.4 }), step: 0.12, dur: 1.4, order: "center" }) }),
      CAMSHOT(5, { rotationX: -10, rotationY: 20, rotationZ: -3, zoom: 74 }, { rotationX: -8, rotationY: 30, rotationZ: -3, zoom: 76 }),
    ] },

  { id: "fvt-trio-bleed", label: "Trio Bleed", tags: "three phones last cropped dark charcoal row pan glide", poster: 3,
    layout: FL_("phoneBleed3", 7), canvas: { w: 1080, h: 1350 },
    bgs: [VBG(0, { type: "solid", hex: "2A2527" })],
    shots: [VSHOT("Pan", 0, 5, [], { stagger: STG({ from: () => ({ dx: 0.45 }), step: 0, dur: 5, ease: "cubic-in-out" }) })] },

  { id: "fvt-corner-panel", label: "Corner Panel", tags: "panel top left bleed blue sky tilt desktop slide", poster: 4,
    layout: FL_("panelTL", 5), canvas: { w: 1080, h: 1080 },
    bgs: [VBG(0, { type: "gradient", preset: "ocean-blue" })],
    shots: [
      VSHOT("Panel", 0, 5, [], { stagger: STG({ from: () => ({ dx: -0.7, dy: -0.7 }), step: 0, dur: 2 }) }),
      CAMSHOT(5, { rotationX: 6, rotationY: -14, rotationZ: -3, zoom: 74 }, { rotationX: 4, rotationY: -8, rotationZ: -2, zoom: 78 }),
    ] },

  { id: "fvt-chat-dusk", label: "Chat Dusk", tags: "app panel beside cropped panel dusk warm grain sway exit", poster: 3,
    layout: FL_("chatPair", 5), canvas: { w: 1050, h: 1200 },
    bgs: [VBG(0, { type: "gradient", preset: "dusk-horizon" }, { grain: 10 })],
    shots: [
      VSHOT("Peek & exit", 0, 6, [], { stagger: STG({
        from: (i) => (i === 0 ? { dx: -1 } : { dy: 1.3 }),
        out: (i) => (i === 0 ? { dx: -1 } : { dy: 1.3 }),
        step: 0.3, dur: 1.2, outEase: "cubic-in",
      }) }),
      CAMSHOT(6, { rotationX: -6, rotationY: -14, zoom: 74 }, { rotationX: -6, rotationY: -4, zoom: 74 }),
    ] },

  { id: "fvt-dark-crop", label: "Dark Crop", tags: "close up crop panel rotated dark dutch roll", poster: 3.5,
    layout: FL_("cropTilt", 6), canvas: { w: 1080, h: 1080 },
    bgs: [VBG(0, { type: "solid", hex: "0C0D10" })],
    shots: [
      VSHOT("Rise", 0, 5, [], { stagger: STG({ from: () => ({ dy: 1.4 }), step: 0, dur: 2.2 }) }),
      CAMSHOT(5, { rotationX: -12, rotationY: 8, rotationZ: -8, zoom: 80 }, { rotationX: -10, rotationY: 6, rotationZ: -2, zoom: 84 }),
    ] },

  { id: "fvt-pixel-tilt", label: "Pixel Tilt", tags: "website wide panel perspective teal grain landscape swing", poster: 4,
    layout: FL_("siteInset", 2), canvas: { w: 1470, h: 1030 },
    bgs: [VBG(0, { type: "gradient", preset: "deep-teal" }, { grain: 12 })],
    shots: [
      VSHOT("Slide", 0, 5, [], { stagger: STG({ from: () => ({ dx: 1.8 }), step: 0, dur: 2.4 }) }),
      CAMSHOT(5, { rotationX: -14, rotationY: 18, rotationZ: -3, zoom: 76 }, { rotationX: -8, rotationY: 10, rotationZ: -1, zoom: 78 }),
    ] },
];
export const FRAME_VIDEO_TEMPLATES = FVT_RAW.map((t, i) => ({
  ...t,
  no: String(i + 1).padStart(2, "0"),
  duration: Math.max(...t.shots.map((s) => s.start + s.len)),
}));