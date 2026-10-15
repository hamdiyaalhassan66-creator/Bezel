import { CAM_DEFAULT, hexRgba, buildGradientCss } from "../lib/frameUtils.js";
import { vidEaseSpec } from "../lib/videoMath.js";
import { GRADIENT_PRESETS, IMAGE_PRESETS } from "./presets.js";

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
export const FRAME_VIDEO_TEMPLATES = FVT_RAW.map((t, i) => ({
  ...t,
  no: String(i + 1).padStart(2, "0"),
  duration: Math.max(...t.shots.map((s) => s.start + s.len)),
}));