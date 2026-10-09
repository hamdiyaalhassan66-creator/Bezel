import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

export const PRESETS = {
  none: {
    label: "None",
    bg: "#1a1a1a",
    ambient: { color: "#ffffff", intensity: 0 },
    key: { color: "#ffffff", intensity: 0, pos: [3, 4, 5] },
    fill: { color: "#ffffff", intensity: 0, pos: [-4, 1, 2] },
  },
  studio: {
    label: "Studio",
    bg: "#e8e6e1",
    ambient: { color: "#ffffff", intensity: 0.6 },
    key: { color: "#ffffff", intensity: 1.0, pos: [3, 4, 5] },
    fill: { color: "#c9d6ff", intensity: 0.35, pos: [-4, 1, 2] },
  },
  softbox: {
    label: "Softbox",
    bg: "#f2f1ee",
    ambient: { color: "#ffffff", intensity: 0.8 },
    key: { color: "#ffffff", intensity: 0.8, pos: [2, 2.5, 6] },
    fill: { color: "#ffffff", intensity: 0.6, pos: [-2, 1.5, 5] },
  },
  "golden-hour": {
    label: "Golden Hour",
    bg: "#3a2a22",
    ambient: { color: "#4a3527", intensity: 0.3 },
    key: { color: "#ffb166", intensity: 1.3, pos: [5, 1.5, 3] },
    fill: { color: "#5f7fd6", intensity: 0.4, pos: [-4, 1, -2] },
  },
  neon: {
    label: "Neon",
    bg: "#120a1c",
    ambient: { color: "#2a1030", intensity: 0.25 },
    key: { color: "#ff3ec8", intensity: 1.3, pos: [4, 1, 3] },
    fill: { color: "#3ef0ff", intensity: 0.9, pos: [-4, 0.5, -2] },
  },
  moody: {
    label: "Moody",
    bg: "#0c0d10",
    ambient: { color: "#14161c", intensity: 0.18 },
    key: { color: "#7dd3fc", intensity: 0.9, pos: [2, 3, 4] },
    fill: { color: "#a78bfa", intensity: 0.35, pos: [-4, -1, 2] },
  },
  overcast: {
    label: "Overcast",
    bg: "#c9cdd1",
    ambient: { color: "#dfe3e6", intensity: 0.9 },
    key: { color: "#eef1f4", intensity: 0.55, pos: [2, 3, 4] },
    fill: { color: "#eef1f4", intensity: 0.55, pos: [-2, 3, 4] },
  },
};

// both the placeholder texture and the uploaded-screenshot crop, so they
// always match the actual device's aspect ratio.
const SCREEN_TEXTURE_W = 440;
const SCREEN_TEXTURE_H = 956;

// Per-device screen resolution in logical points. Falls back to the 16 Pro Max size.
const SCREEN_TEXTURE_SIZE = {
  default: { w: SCREEN_TEXTURE_W, h: SCREEN_TEXTURE_H },
  'MacBook Pro 14"': { w: 1008, h: 655 },
  'MacBook Pro 16"': { w: 1152, h: 745 },
  'MacBook Air': { w: 1140, h: 736 }, // 15" Air (1710x1107 logical) scaled 2/3, matched to the mesh's 1.549 aspect
  "Pro Display XDR": { w: 1360, h: 775 }, // matches the mesh's 1.754 aspect (bezel included)
  "iPhone Air": { w: 420, h: 912 },
  "iPhone 16 Pro": { w: 402, h: 874 },
  "iPhone 15 Pro Max": { w: 430, h: 932 },
  "iPhone 14 Pro Max": { w: 430, h: 932 },
  "iPhone 14 Pro": { w: 393, h: 852 },
  "iPhone 14 Plus": { w: 428, h: 926 }, // 6.7" model, same logical res as 13 Pro Max
  "iPhone 14": { w: 390, h: 844 }, 
  // 11" iPad Air, portrait: 820x1180pt display + a 46pt bezel painted on each side,
  // so the texture matches the front glass's own aspect (bezel included).
  "iPad Air": { w: 912, h: 1272 },
  // iPad mini 6 is 744x1133pt. Height is 1124 so the texture matches the screen mesh's own
  // aspect (0.6618) instead of stretching.
  "iPad mini": { w: 744, h: 1124 },
  // Screen mesh (bare display rect, bezel is its own separate mesh) measures
  // 55.22 x 73.03 model units — width set to 903 so the texture matches that
  // mesh's own aspect (0.756) instead of stretching.
  "iPad Pro 12.9-inch": { w: 903, h: 1194 },
  // Screen mesh (bare display rect, separate bezel mesh) measures 196.79 x
  // 265.49 model units — width set to 897 so the texture matches that
  // mesh's own aspect (0.741) instead of stretching.
  "iPad Pro 11-inch": { w: 897, h: 1210 },
  // Screen mesh measures 32.7 x 39.9 mm (aspect 0.82)
  "Apple Watch Ultra": { w: 410, h: 500 },
    // 45mm Series 9. Aspect matches the screen mesh (0.835), not the 198x242pt display,
  // so the image isn't stretched.
  "Apple Watch Series 9": { w: 396, h: 474 },
    // Screen mesh is 32.8 x 38.7mm (aspect 0.849)
  "Apple Watch Series 7": { w: 396, h: 466 },
};

// --- Tablet orientation + chrome ---------------------------------------------
const TABLET_DEVICES = { "iPad Air": true, "iPad mini": true, "iPad Pro 12.9-inch": true, "iPad Pro 11-inch": true };
const WATCH_DEVICES = { "Apple Watch Ultra": true, "Apple Watch Series 9": true, "Apple Watch Series 7": true };
// Portrait uses MODEL_ROTATION_OFFSET_DEG; landscape = same model turned a quarter (top edge → left).
// iPad Pro's portrait rotation is [0,0,0] (no Y-flip like the other two), so its
// landscape quarter-turn is a plain Z rotation with no Y component.
const LANDSCAPE_ROTATION_DEG = {
  "iPad Air": [0, 180, -90],
  "iPad mini": [0, 180, -90],
  "iPad Pro 12.9-inch": [0, 0, -90],
  // Same portrait convention as Air/mini (Y-flipped, [0,180,0]), so the
  // landscape quarter-turn matches theirs too, not the 12.9-inch's.
  "iPad Pro 11-inch": [0, 180, -90],
};
const LANDSCAPE_FIT_WIDTH = { "iPad Air": 6, "iPad mini": 6, "iPad Pro 12.9-inch": 7, "iPad Pro 11-inch": 6 };
const DEVICE_FIT_HEIGHT = 5;
const TABLET_STATUS_H = 24;
const TABLET_BROWSER_H = { safari: 52, chrome: 84, arc: 46, edge: 82 }; // below the status bar

const isLandscape = (deviceLabel, overlays) =>
  !!TABLET_DEVICES[deviceLabel] && overlays?.orientation === "landscape";

function getLogicalPt(deviceLabel, overlays) {
  const base = SCREEN_LOGICAL_PT[deviceLabel] ?? SCREEN_LOGICAL_PT.default;
  return isLandscape(deviceLabel, overlays) ? { w: base.h, h: base.w } : base;
}

// Used by Frame mode in App.jsx: the display's real aspect ratio (orientation-aware)
// and which family it belongs to, so the standalone screen matches the mockup exactly.
export function getFrameScreenSpec(deviceLabel, orientation = "portrait") {
  const { w, h } = getLogicalPt(deviceLabel, { orientation });
  const kind = TABLET_DEVICES[deviceLabel] ? "tablet" : NO_SCREEN_CHROME[deviceLabel] ? "desktop" : "phone";
  return { ratio: w / h, kind };
}

// Chrome is painted upright in the orientation the person sees; the mesh's UVs are always
// portrait, so a landscape canvas is turned 90° clockwise before the per-device flips.
// Devices whose landscape canvas needs to rotate the OPPOSITE direction
// (90° CCW instead of CW). iPad Air/mini's portrait model rotation is
// [0, 180, 0] (Y-flipped), but iPad Pro 12.9's is [0, 0, 0] — no Y-flip —
// so its screen mesh faces the opposite local direction. Rotating the
// canvas the same way as Air/mini therefore lands it 180° off (90° CW vs
// 90° CCW differ by exactly 180°), which is the upside-down landscape bug.
const CANVAS_LANDSCAPE_ROTATE_CCW = {
  "iPad Pro 12.9-inch": true,
};

function orientCanvasForMesh(canvas, deviceLabel, overlays) {
  if (!isLandscape(deviceLabel, overlays)) return canvas;
  const out = document.createElement("canvas");
  out.width = canvas.height;
  out.height = canvas.width;
  const ctx = out.getContext("2d");
  if (CANVAS_LANDSCAPE_ROTATE_CCW[deviceLabel]) {
    ctx.translate(0, out.height);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.translate(out.width, 0);
    ctx.rotate(Math.PI / 2);
  }
  ctx.drawImage(canvas, 0, 0);
  return out;
}

// Rotate / scale / center the model for the current orientation. Measured with the parent
// group's own transform neutralised, so it's safe to re-run on a live model.
function fitModel(model, deviceLabel, overlays) {
  const landscape = isLandscape(deviceLabel, overlays);
  const rotDeg = landscape
    ? LANDSCAPE_ROTATION_DEG[deviceLabel]
    : MODEL_ROTATION_OFFSET_DEG[deviceLabel] ?? MODEL_ROTATION_OFFSET_DEG.default;
  const [rx, ry, rz] = rotDeg.map(THREE.MathUtils.degToRad);

  const parent = model.parent;
  const saved = parent && { p: parent.position.clone(), r: parent.rotation.clone() };
  if (parent) {
    parent.position.set(0, 0, 0);
    parent.rotation.set(0, 0, 0);
  }

  model.position.set(0, 0, 0);
  model.scale.setScalar(1);
  model.rotation.set(rx, ry, rz);

  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const fitWidth = landscape ? LANDSCAPE_FIT_WIDTH[deviceLabel] : MODEL_FIT_WIDTH[deviceLabel];
  model.scale.setScalar(fitWidth ? fitWidth / size.x : DEVICE_FIT_HEIGHT / size.y);

  model.updateMatrixWorld(true);
  const pivotName = MODEL_PIVOT_NODE[deviceLabel];
  const pivot = pivotName && model.getObjectByName(pivotName);
  const center = new THREE.Box3().setFromObject(pivot || model).getCenter(new THREE.Vector3());
  model.position.sub(center);

  if (parent) {
    parent.position.copy(saved.p);
    parent.rotation.copy(saved.r);
  }
}

function getScreenTextureSize(deviceLabel, overlays) {
  const base = SCREEN_TEXTURE_SIZE[deviceLabel] ?? SCREEN_TEXTURE_SIZE.default;
  return isLandscape(deviceLabel, overlays) ? { w: base.h, h: base.w } : base;
}

const SCREEN_UV_OFFSET_X = -0.012;
const SCREEN_UV_OFFSET_Y = -0.0013;

// Per-device screen bezel-mask (BM) geometry — margin/radius/corner-adjust,
// all in px at SCREEN_TEXTURE_W/H resolution. Bezel thickness and corner
// rounding differ per model, so this is keyed by device label.
const SCREEN_BM_CONFIG = {
  default: { marginX: 12, marginY: 7, radius: 55, cornerAdjust: -28 },
  "iPhone 17 Pro Max": { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0, sourceAspect: 440 / 956 },
  "iPhone 17": { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
  "iPhone 17 Pro": { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
  "iPhone Air": { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0, sourceAspect: 420 / 912 },
  // Real screen mesh here IS just the display rect (no bezel baked in) —
  // no margin needed; radius paints the rounded-corner look the mesh
  // itself doesn't have.
  "iPhone 16 Pro": { marginX: 0, marginY: 0, radius: 55, cornerAdjust: 0 },
  // These two are node-bucketed, screen-mesh-is-just-the-display-rect
  // exports (same situation as 16 Pro/16) — no margin needed; radius
  // paints the rounded-corner look the mesh itself doesn't have.
  // Unverified against a render — adjust radius/cornerAdjust once seen.
  "iPhone 15 Pro Max": { marginX: 0, marginY: 0, radius: 55, cornerAdjust: 0 },
  "iPhone 15 Pro": { marginX: 0, marginY: 0, radius: 55, cornerAdjust: 0 },
  // Same situation as 15 Pro Max/15 Pro/16 Pro — the screen mesh (Object_13,
  // identified via its emissive:[1,1,1] material) is just the bare display
  // rect, smaller than the full body, with no baked-in rounded bezel.
  "iPhone 14 Pro Max": { marginX: 0, marginY: 0, radius: 55, cornerAdjust: 0 },
  // Same node-bucketed situation as 14 Pro Max — bare display rect, no
  // baked rounded bezel — radius paints the corner rounding.
  "iPhone 14 Pro": { marginX: 0, marginY: 0, radius: 55, cornerAdjust: 0 },
  // Same node-bucketed, bare-display-rect situation. Notch device, so no
  // island cutout to worry about — just paints the rounded corners.
  "iPhone 14 Plus": { marginX: 0, marginY: 0, radius: 55, cornerAdjust: 0 },
  "iPhone 14": { marginX: 0, marginY: 0, radius: 55, cornerAdjust: 0 },
  'MacBook Pro 14"': { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
  'MacBook Pro 16"': { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
  'MacBook Air': { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
  // Screen mesh is the full front glass incl. bezel, so the ~0.95 x 0.8 cm bezel is painted as margin.
  // Active area works out to 1324x745 = 16:9 (6016x3384 panel).
  "Pro Display XDR": { marginX: 18, marginY: 15, radius: 0, cornerAdjust: 0 },
  // Screen mesh is the full front glass incl. bezel (measured ~46pt each side).
  // Outer radius ~29pt, inner display radius ~21pt (29 - 46 + 38).
  "iPad Air": { marginX: 46, marginY: 46, radius: 29, cornerAdjust: -38 },
  // Screen mesh is just the display rect (bezel is its own mesh) and its outline already
  // has the rounded corners, so nothing to paint.
  "iPad mini": { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
  // Same situation as iPad mini: bare display-rect mesh, separate bezel mesh
  // handles the rounded framing, so nothing to paint here.
  "iPad Pro 12.9-inch": { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
  // Same situation again: screen ("screen") is a bare display rect, and a
  // separate "screen_ftame" bezel mesh sits in front handling the rounded
  // corner framing — unverified against a render; if square corners peek
  // out, give this a radius instead.
  "iPad Pro 11-inch": { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
  // Screen mesh is the display rect and already has the rounded outline
  "Apple Watch Ultra": { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
    // Screen mesh is the display rect with its own rounded outline.
  // Texture is 396x474 over a ~34.6 x 41.5mm screen mesh, so ~11.4px per mm.
  // margin 16px ≈ 1.4mm black border; inner corner radius = radius - margin - cornerAdjust ≈ 74px ≈ 6.5mm.
  "Apple Watch Series 9": { marginX: 16, marginY: 16, radius: 90, cornerAdjust: -16 },
    // Screen mesh is the bare display rect with its own rounded outline; the bezel is separate geometry.
  "Apple Watch Series 7": { marginX: 0, marginY: 0, radius: 0, cornerAdjust: 0 },
};
function getScreenBMConfig(deviceLabel) {
  return SCREEN_BM_CONFIG[deviceLabel] ?? SCREEN_BM_CONFIG.default;
}

// Dynamic Island as a real mesh. x/y/w/h are DERIVED from the screen
// mesh's own bounding box plus the real Apple spec (DYNAMIC_ISLAND_SPEC)
// and the device's real logical point resolution — see
// computeIslandLayout() below — instead of hand-typed meters. That keeps
// the pill perfectly centered on the actual screen and at the correct
// 11pt gap regardless of that screen's physical size, which is what was
// wrong with the Air's old hardcoded y (guessed too close to the top).
// Only the bits that genuinely can't be derived from the screen bounds
// stay per-device: the camera hole's position along the pill, as a 0-1
// fraction of pill width (the real notch camera sits right-of-center,
// not centered), and a small z nudge whose sign depends on which way
// that mesh's screen normal faces.
// Dynamic Island as a real mesh, in model space (meters). Used when the screen
// mesh ships a pill hole + a separate camera hole instead of one island.
// x/y = bottom-left of the capsule, camX = camera center on the x axis, z = just above the display plane.
// Which devices need a real 3D island mesh at all — every other device
// bakes the pill directly into its own .glb, so adding a mesh there would
// double it up.
const NEEDS_ISLAND_MESH = {
  "iPhone 17 Pro Max": true,
  "iPhone 17 Pro": true,
  "iPhone Air": true,
  "iPhone 14 Pro Max": true,
  "iPhone 14 Pro": true,
  "iPhone 16 Pro": true,
};

// Per-device fine nudge added to the screen mesh's own measured surface
// (box.max.z) — keeps the pill mesh just off the display plane so it
// doesn't z-fight with the screen texture underneath. Sign/magnitude
// depends on which way that mesh's own normal/z axis faces — this is the
// one thing genuinely specific to how each export was authored, so it
// can't be derived from geometry the way position/size now are.
const ISLAND_MESH_Z_OVERRIDE = {
  // Bumped up from 0.0005 — that wasn't clearing whatever nearby geometry
  // (likely the hidden Object_53 "dark glass over the display", or one of
  // the Camera_filter/Frame trim nodes near the notch) was z-fighting with
  // the island mesh's top edge. If this still shows a seam, try 0.002-0.003.
  "iPhone 17 Pro": 0.0015,
  "iPhone Air": -0.0005,
};

// Camera dot's center, as a 0-1 fraction of the pill's own width. The real
// notch camera sits right-of-center, not centered — also not derivable
// from screen geometry, so it stays a tuned constant.
const ISLAND_CAMERA_X_FRACTION = {
  // Now actually wired up (see makeIslandMesh) — previous values here had
  // zero visual effect due to the cx bug. Starting guess; this is the one
  // to nudge left/right while comparing against a reference photo.
  "iPhone 17 Pro": 0.87,
  "iPhone Air": 0.854,
};

// Extra pt added on top of DYNAMIC_ISLAND_SPEC.topGap when deriving the
// ISLAND_MESH's position for a given device. The base 14pt is Apple's real
// spec, but a given screen mesh's own measured bounding box doesn't always
// correspond 1:1 to the device's usable point height (e.g. if the export
// includes a sliver of curved edge past the flat display), which shifts the
// derived pill up or down from where it should sit. Tune by eye.
const ISLAND_TOP_GAP_OVERRIDE_PT = {
  "iPhone 17 Pro": 0,
  // Nudges the derived island down a bit — the Apple-spec 14pt topGap,
  // measured against this export's actual screen bounds, sits slightly
  // higher than where the pill should read on the Air.
  "iPhone Air": 5,
};

// Derives the Dynamic Island's mesh geometry directly from the screen
// mesh's own measured bounding box (in the same model space its geometry
// already lives in) plus the real Apple spec, instead of another round of
// hand-typed model-space numbers. This is what actually fixes the
// persistent mis-centering on iPhone 17 Pro / iPhone Air: neither ships
// the island as part of its baked mesh, so previous passes were guessing
// its position by eye against a screenshot. Deriving it from the real
// measured screen bounds means it's always centered on THIS mesh's own
// geometry — no more guessing, no more manual re-tuning per export.
function deriveIslandLayout(screenMesh, deviceLabel) {
  if (!screenMesh.geometry.boundingBox) screenMesh.geometry.computeBoundingBox();
  const box = screenMesh.geometry.boundingBox;
  if (!box) return null;

  const sizeY = box.max.y - box.min.y;
  const { h: lh } = SCREEN_LOGICAL_PT[deviceLabel] ?? SCREEN_LOGICAL_PT.default;

  // model-space units per logical point, from the mesh's own measured
  // height against that device's real point resolution
  const scale = sizeY / lh;

  const w = DYNAMIC_ISLAND_SPEC.width * scale;
  const h = DYNAMIC_ISLAND_SPEC.height * scale;
  const topGap = (DYNAMIC_ISLAND_SPEC.topGap + (ISLAND_TOP_GAP_OVERRIDE_PT[deviceLabel] ?? 0)) * scale;

  const centerX = (box.min.x + box.max.x) / 2;
  const x = centerX - w / 2;
  const y = box.max.y - topGap - h; // screen's top edge, minus the gap, minus the pill's own height

  const zOverride = ISLAND_MESH_Z_OVERRIDE[deviceLabel] ?? 0;
  const camFraction = ISLAND_CAMERA_X_FRACTION[deviceLabel] ?? 0.854;

  return { x, y, w, h, z: box.max.z + zOverride, camX: x + w * camFraction };
}

// 17 Pro: attach the island to the screen mesh itself (so it shares the mesh's
// local transform) and derive its axes from the flat face, instead of assuming
// z = normal / y = up in the parent's space.
const ISLAND_ATTACH_TO_SCREEN = {
  "iPhone 17 Pro Max": true,
  "iPhone 17 Pro": true,
};
// How far the pill sits above the glass, as a fraction of the screen's long side.
// 0.002 is about 0.3mm. Raise (up to ~0.008) if the bezel hides it,
// lower toward 0.0005 if it looks like it hovers.
const ISLAND_SURFACE_LIFT = 0.0005;

// When the pill is sized to the screen mesh's own cutout, grow it slightly so its
// edge overlaps the hole's rim instead of leaving a hairline gap.
const ISLAND_HOLE_OVERSCAN = 1.02;

// Bounding box from only the vertices the (already filtered) index actually uses.
// geometry.boundingBox is stale after remapScreenUVsPlanar strips the side walls.
function measureFlatFace(mesh) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const used = new Set();
  if (geo.index) {
    for (let i = 0; i < geo.index.count; i++) used.add(geo.index.getX(i));
  } else {
    for (let i = 0; i < pos.count; i++) used.add(i);
  }
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  used.forEach((i) => box.expandByPoint(v.fromBufferAttribute(pos, i)));
  return box;
}

// Real capsule geometry (true semicircular ends) plus a two-disc camera, built in
// POINT units centered on its own origin. Scaled into model units by the caller.
// Avoids texture alpha entirely, so there can't be a rectangular backing plane.
function makeSolidIsland(w, h, camFraction) {
  const r = h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  shape.closePath();

  // roughness / envMapIntensity get synced from the screen in applyScreenReflection()
  const mat = new THREE.MeshStandardMaterial({
    color: "#000000",
    roughness: 0.1,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 0,
    polygonOffsetUnits: -8,
  });
  // ExtrudeGeometry extrudes the shape from local z=0 to z=+depth by default.
  // Left alone, that pushes the pill OUTWARD along N (away from the screen,
  // toward the camera) — which is what caused it to visibly protrude/bulge
  // above the glass. Translating by -plugDepth shifts the whole geometry so
  // its range becomes [-plugDepth, 0]: the front cap (what you actually see)
  // stays at local z=0 — exactly where the old flat plane sat — while the
  // extrusion now runs into -N, i.e. down into the real cutout/cavity,
  // instead of bulging up out of it.
  const plugDepth = h * 0.6;
  const extrudeSettings = { depth: plugDepth, bevelEnabled: false, curveSegments: 48 };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.translate(0, 0, -plugDepth);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "DynamicIsland";
  mesh.renderOrder = 2;

  const cx = -w / 2 + w * camFraction;
  const addDisc = (radius, color, roughness, offset, order) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.1,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 0,
      polygonOffsetUnits: offset,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), m);
    disc.position.set(cx, 0, 0);
    disc.renderOrder = order;
    mesh.add(disc);
  };
  addDisc(r * 0.34, "#141418", 0.4, -10, 3); // housing ring
  addDisc(r * 0.19, "#05060c", 0.05, -12, 4); // lens
  return mesh;
}

// Finds the holes in the screen mesh's flat face (the real Dynamic Island cutouts):
// boundary edges (used by exactly one triangle) grouped into loops. The biggest loop
// is the outer screen outline; every other loop is a hole. Returns their bounding
// boxes in the mesh's local space.
function findScreenHoles(mesh) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const idx = geo.index
    ? Array.from(geo.index.array)
    : Array.from({ length: pos.count }, (_, i) => i);

  // Weld vertices that share a position; exports often split them for UVs/normals.
  const diag = measureFlatFace(mesh).getSize(new THREE.Vector3()).length();
  const quant = diag * 1e-5;
  const keyOf = (i) =>
    `${Math.round(pos.getX(i) / quant)},${Math.round(pos.getY(i) / quant)},${Math.round(pos.getZ(i) / quant)}`;
  const weldIds = new Map();
  const rep = []; // welded id -> a source vertex index
  const idOf = (i) => {
    const k = keyOf(i);
    let id = weldIds.get(k);
    if (id === undefined) {
      id = rep.length;
      weldIds.set(k, id);
      rep.push(i);
    }
    return id;
  };

  const edgeCount = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const a = idOf(idx[t]), b = idOf(idx[t + 1]), c = idOf(idx[t + 2]);
    [[a, b], [b, c], [c, a]].forEach(([u, v]) => {
      const k = u < v ? `${u}_${v}` : `${v}_${u}`;
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
    });
  }

  // Union-find over boundary edges = one component per loop.
  const parent = rep.map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const boundary = new Set();
  edgeCount.forEach((n, k) => {
    if (n !== 1) return;
    const [u, v] = k.split("_").map(Number);
    boundary.add(u);
    boundary.add(v);
    parent[find(u)] = find(v);
  });

  const loops = new Map();
  const tmp = new THREE.Vector3();
  boundary.forEach((id) => {
    const root = find(id);
    if (!loops.has(root)) loops.set(root, new THREE.Box3());
    loops.get(root).expandByPoint(tmp.fromBufferAttribute(pos, rep[id]));
  });

  const area = (b) => {
    const s = b.getSize(new THREE.Vector3());
    const d = [s.x, s.y, s.z].sort((p, q) => p - q);
    return d[1] * d[2];
  };
  const boxes = [...loops.values()].sort((a, b) => area(b) - area(a));
  return boxes.slice(1); // drop the outer outline
}

function attachIslandToScreen(screenMesh, deviceLabel) {
  const box = measureFlatFace(screenMesh);
  if (box.isEmpty()) return null;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const dims = [size.x, size.y, size.z];
  const bmin = box.min.toArray();
  const bmax = box.max.toArray();
  const c = center.toArray();

  // thinnest axis = screen normal, middle = width, longest = height
  const [nIdx, wIdx, lIdx] = [0, 1, 2].sort((a, b) => dims[a] - dims[b]);

  // Pick axis signs using the model's world orientation at load time
  // (every device is oriented to face +Z with +Y up at zero rotation).
  screenMesh.updateWorldMatrix(true, false);
  const axisWorld = (idx) => {
    const a = new THREE.Vector3();
    a.setComponent(idx, 1);
    return a.transformDirection(screenMesh.matrixWorld);
  };
  const sl = axisWorld(lIdx).y >= 0 ? 1 : -1; // local long axis -> world up
  const sn = axisWorld(nIdx).z >= 0 ? 1 : -1; // local normal -> toward camera
  const sw = axisWorld(wIdx).x >= 0 ? 1 : -1; // local width axis -> world right

  const unit = (idx, s) => {
    const v = new THREE.Vector3();
    v.setComponent(idx, s);
    return v;
  };
  const U = unit(wIdx, sw);
  const V = unit(lIdx, sl);
  const N = unit(nIdx, sn);

  // local units per logical point, from the flat face's own height
  const lenL = dims[lIdx];
  const { h: lh } = SCREEN_LOGICAL_PT[deviceLabel] ?? SCREEN_LOGICAL_PT.default;
  const perPt = lenL / lh;
  const pillH = DYNAMIC_ISLAND_SPEC.height * perPt;
  const gap =
    (DYNAMIC_ISLAND_SPEC.topGap + (ISLAND_TOP_GAP_OVERRIDE_PT[deviceLabel] ?? 0)) * perPt;

  const topL = sl > 0 ? bmax[lIdx] : bmin[lIdx];
  const surfN = sn > 0 ? bmax[nIdx] : bmin[nIdx];

  const p = [0, 0, 0];
  p[wIdx] = c[wIdx]; // centered across the width
  p[lIdx] = topL - sl * (gap + pillH / 2); // down from the top edge
  // Sits just above the glass (so its front cap is flush/slightly proud of
  // the surface, matching the real device) then extrudes DOWN into the
  // cavity along -N by plugDepth (set where the mesh geometry is built),
  // so it fills the hole's depth instead of just capping it from above.
  p[nIdx] = surfN + sn * lenL * ISLAND_SURFACE_LIFT;

  let pillWpt = DYNAMIC_ISLAND_SPEC.width;
  let pillHpt = DYNAMIC_ISLAND_SPEC.height;
  let camFraction = ISLAND_CAMERA_X_FRACTION[deviceLabel] ?? 0.854;

  // Cutouts near the top of the screen mesh, as boxes in the mesh's local space.
  const nearTop = findScreenHoles(screenMesh).filter((b) => {
    const s = b.getSize(new THREE.Vector3());
    const hc = b.getCenter(new THREE.Vector3());
    return (
      s.getComponent(lIdx) < lenL * 0.08 &&
      Math.abs(topL - hc.getComponent(lIdx)) < lenL * 0.12
    );
  });

  // Drop any loop that sits entirely inside another one (inner rim edges, not cutouts).
  const eps = lenL * 1e-4;
  const contains = (outer, inner) =>
    inner !== outer &&
    inner.min.getComponent(wIdx) >= outer.min.getComponent(wIdx) - eps &&
    inner.max.getComponent(wIdx) <= outer.max.getComponent(wIdx) + eps &&
    inner.min.getComponent(lIdx) >= outer.min.getComponent(lIdx) - eps &&
    inner.max.getComponent(lIdx) <= outer.max.getComponent(lIdx) + eps;
  const holes = nearTop.filter((b) => !nearTop.some((o) => contains(o, b)));

  if (holes.length) {
    // The island is the union of the remaining cutouts (pill + camera disc).
    const wMin = Math.min(...holes.map((b) => b.min.getComponent(wIdx)));
    const wMax = Math.max(...holes.map((b) => b.max.getComponent(wIdx)));
    const lMin = Math.min(...holes.map((b) => b.min.getComponent(lIdx)));
    const lMax = Math.max(...holes.map((b) => b.max.getComponent(lIdx)));
    const midW = (wMin + wMax) / 2;

    p[wIdx] = midW;
    p[lIdx] = (lMin + lMax) / 2;
    pillWpt = ((wMax - wMin) / perPt) * ISLAND_HOLE_OVERSCAN;
    pillHpt = ((lMax - lMin) / perPt) * ISLAND_HOLE_OVERSCAN;

    // Camera = the narrowest cutout, when there's more than one.
    if (holes.length > 1) {
      const widthOf = (b) => b.max.getComponent(wIdx) - b.min.getComponent(wIdx);
      const cam = [...holes].sort((a, b) => widthOf(a) - widthOf(b))[0];
      const camC = (cam.min.getComponent(wIdx) + cam.max.getComponent(wIdx)) / 2;
      const offsetPt = ((camC - midW) * sw) / perPt;
      camFraction = 0.5 + offsetPt / pillWpt;
    }
  }
  console.log(
    `[${deviceLabel}] island pill (pt): ${pillWpt.toFixed(1)} x ${pillHpt.toFixed(1)}, camFraction ${camFraction.toFixed(3)}, holes used: ${holes.length}`
  );

  // Pill is built in points; perPt scales it into this mesh's local units.
  const mesh = makeSolidIsland(pillWpt, pillHpt, camFraction);

  mesh.matrixAutoUpdate = false;
  mesh.matrix.makeBasis(
    U.multiplyScalar(perPt),
    V.multiplyScalar(perPt),
    N.multiplyScalar(perPt)
  );
  mesh.matrix.setPosition(p[0], p[1], p[2]);
  mesh.matrixWorldNeedsUpdate = true;
  return mesh;
}

function makeIslandMesh(cfg) {
  const PX = 20000; // canvas px per model meter
  const cw = Math.round(cfg.w * PX);
  const ch = Math.round(cfg.h * PX);
  const c = document.createElement("canvas");
  c.width = cw * 2; // 2x for sharp edges
  c.height = ch * 2;
  const ctx = c.getContext("2d");
  ctx.scale(2, 2);

  // True capsule
  const r = ch / 2;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(cw - r, 0);
  ctx.arc(cw - r, r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(r, ch);
  ctx.arc(r, r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();

  // Camera: dark housing ring + glossy-looking lens.
  // Radii are scaled relative to the pill's own height (ch) instead of
  // fixed absolute canvas px, using 124 (= 0.0062m * PX at the original
  // tuned h) as the reference the 34/17/10/5/1 constants were tuned
  // against. Without this, a pill sized to a different h/w (e.g. the
  // 120x36pt spec vs. the old 126x37.33pt numbers) keeps the same
  // absolute-size camera dot, which then reads too large/crowded for
  // the smaller capsule — exactly the "clipped against the cap" look
  // this was fixed to avoid.
  // Camera housing position: driven by cfg.camX (set from
  // ISLAND_CAMERA_X_FRACTION via deriveIslandLayout), NOT the cap's own
  // center — previously this was hardcoded to cw - r, which silently
  // ignored camX entirely and made the per-device fraction constant a
  // no-op. camX is in the same model-space units as cfg.x/cfg.w, so it's
  // converted to this canvas's local px space the same way w/h are.
  const camFraction = (cfg.camX - cfg.x) / cfg.w;
  const cx = camFraction * cw;
  const cy = r;
  // Smaller fractions than the previous pass (0.62/0.34) — those still left
  // the housing nearly touching the pill's rounded top/bottom edges. Real
  // Dynamic Island camera art sits with clear margin on every side of its cap.
  // Shrunk from 0.48/0.26 — those were tuned against the old cap-centered
  // cx, which no longer applies now that cx tracks camFraction. Starting
  // guess for the smaller, off-cap-center position; re-tune against a
  // reference photo.
  const outerR = r * 0.34;
  const innerR = r * 0.19;

  let g = ctx.createRadialGradient(cx, cy, innerR * 0.5, cx, cy, outerR);
  g.addColorStop(0, "#0d0d10");
  g.addColorStop(0.75, "#121216");
  g.addColorStop(1, "#1e1e24");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fill();

  g = ctx.createRadialGradient(cx - innerR * 0.3, cy - innerR * 0.3, innerR * 0.06, cx, cy, innerR);
  g.addColorStop(0, "#2b3458");
  g.addColorStop(0.5, "#0b0d18");
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Standard (not Basic) so it picks up the environment reflection like the screen does.
  // roughness / envMapIntensity are synced from the screen material in applyScreenReflection().
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: true,
    // The Air's front faces -z, so the plane is seen from behind. Render both faces.
    side: THREE.DoubleSide,
    roughness: 0.1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cfg.w, cfg.h), mat);
  mesh.position.set(cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, cfg.z);
  mesh.renderOrder = 2;
  mesh.name = "DynamicIsland";
  return mesh;
}

// Dynamic Island painted into the screen texture, for models whose mesh only ships
// a thin pill outline plus a detached camera dot. Canvas px at 440x956, in
// image-upright space (drawn before the per-device flip, so it flips with the image).
const SCREEN_ISLAND = {
  // painted island replaced by ISLAND_MESH (real geometry) below
};

function drawScreenIsland(ctx, deviceLabel) {
  const isl = SCREEN_ISLAND[deviceLabel];
  if (!isl) return;
  // True capsule: semicircular caps via arc(), not roundedRectPath's quadratic corners.
  const r = isl.h / 2;
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(isl.x + r, isl.y);
  ctx.lineTo(isl.x + isl.w - r, isl.y);
  ctx.arc(isl.x + isl.w - r, isl.y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(isl.x + r, isl.y + isl.h);
  ctx.arc(isl.x + r, isl.y + r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- Material / lighting constants — single source of truth ---------------
// Any code that used to hardcode envMapIntensity / sculpt-light numbers now
// reads from here instead, so there's one place to tune each value and no
// risk of one call site drifting out of sync with the others.
const IPHONE_16_FRAME_ENV_INTENSITY = 0.5;

const FRAME_ENV_MAP_INTENSITY = {
  "Apple Watch Ultra": 1.1, // titanium reads on its reflections, a touch above the matte aluminum devices
  default: 1.0,
  "iPhone 17 Pro Max": 2,
  "iPhone 17 Pro": 2,
  "iPhone 17": 0.8,
  "iPhone Air": 1.1,
  "iPhone 16 Pro Max": 1.6,
  // Matched to 16 Pro Max, per request.
  "iPhone 16 Pro": 1.6,
  "iPhone 15 Pro Max": IPHONE_16_FRAME_ENV_INTENSITY,
  "iPhone 15 Pro": 0.8,
  // High-shine polished stainless steel — more reflective than the satin
  // titanium generations.
  "iPhone 14 Pro Max": 1.4,
  "iPhone 14 Pro": 1.4, // same polished stainless steel as 14 Pro Max
  // Anodized aluminum, not steel/titanium — glossier than the satin
  "iPhone 14 Plus": 1.3,
    // Polished stainless steel, same family as 14 Pro Max.
  "iPhone 14": 1.3,
  'MacBook Pro 14"': 0.5,
  'MacBook Pro 16"': 0.5,
  'MacBook Air': 0.5,
  "Pro Display XDR": 0.5,
  "iPad Air": 0.5, // matte-anodized aluminum, same treatment as the MacBook family
  "iPad mini": 0.5, // matte-anodized aluminum, same treatment as the iPad Air
  "iPad Pro 12.9-inch": 0.5, // matte-anodized aluminum unibody, same treatment as the other iPads
  "iPad Pro 11-inch": 0.5, // matte-anodized aluminum unibody, same treatment as the other iPads
};
// Aluminum on the 17 is satin/brushed, not polished — ALUMINUM_FINISHES_17's
// roughness/metalness are shared with other aluminum devices, so override
// them here specifically for the frame material.
// device below is meant to read as literally the same finish, so they all
// derive from this one constant instead of four copies that can drift.
const IPHONE_16_FRAME_FINISH = { roughness: 0.55, metalness: 0.9 };

const FRAME_FINISH_OVERRIDE = {
  // Grade 5 titanium, bead-blasted: fully metallic, satin rather than polished.
  "Apple Watch Ultra": { roughness: 0.42, metalness: 1.0 },
  "iPhone 17": { roughness: 0.4, metalness: 0.92 },
  "iPhone Air": { roughness: 0.22, metalness: 1.0 },
  // Matched to 16 Pro Max, per request — this export's frame was reading
  "iPhone 16 Pro": { roughness: 0.14, metalness: 1.0 },
  "iPhone 16 Pro Max": { roughness: 0.14, metalness: 1.0 },
  "iPhone 15 Pro Max": IPHONE_16_FRAME_FINISH,
  // Slightly glossier than the base 16/15 Pro Max satin finish, per request.
  "iPhone 15 Pro": { roughness: 0.35, metalness: 0.92 },
  // Surgical-grade stainless steel, high-shine/polished (not satin like the
  // titanium generations). Slightly softer than a pure mirror (roughness
  // 0.28 instead of 0.15) so non-highlight faces don't crush fully to black
  // under directional-only lighting — still noticeably shinier than the
  // titanium generations' 0.35-0.55.
  "iPhone 14 Pro Max": { roughness: 0.28, metalness: 0.95 },
  "iPhone 14 Pro": { roughness: 0.28, metalness: 0.95 },
  "iPhone 14 Plus": { roughness: 0.2, metalness: 0.95 }, // anodized aluminum, glossier than the Pro's steel
  "iPhone 14": { roughness: 0.2, metalness: 0.95 },
  // Bead-blasted anodized aluminum, so matte rather than the finish swatch's 0.1.
  'MacBook Pro 14"': { roughness: 0.45, metalness: 0.9 },
  'MacBook Pro 16"': { roughness: 0.45, metalness: 0.9 },
  'MacBook Air': { roughness: 0.45, metalness: 0.9 },
  "Pro Display XDR": { roughness: 0.45, metalness: 0.9 }, // anodized aluminum
  // Baked roughness/metalness map is kept (back panel ≈ 0.4 / 1.0), so these are
  // 1 = "use the map as authored" rather than a flat value.
  "iPad Air": { roughness: 1, metalness: 1 },
  // No baked maps on this export, so flat values control the look (unlike the Air's 1/1).
  "iPad mini": { roughness: 0.45, metalness: 0.9 },
  // Confirmed via the file: "Body" material has no roughness/metalness map,
  // just flat factors — same no-baked-map situation as iPad mini.
  "iPad Pro 12.9-inch": { roughness: 0.45, metalness: 0.9 },
  // This export's "case" material DOES bake a metallicRoughness map (see
  // SURFACE_MAP_OVERRIDE below, which drops it) — these flat values are
  // what actually control the look once that map is cleared.
  "iPad Pro 11-inch": { roughness: 0.45, metalness: 0.9 },
};
// The logo sits flush with the glass but reads as a subtle polished
// accent in real life — a touch more roughness than raw metal, but
// noticeably glossier than the surface around it.
const LOGO_ROUGHNESS = 0.2;
const LOGO_ENV_MAP_INTENSITY = 0.9;
// Matching the body tint exactly made the logo nearly disappear on
// lighter finishes — it only read via the gloss highlight. Darkening it
// slightly off the tint gives it a visible silhouette at any angle.
const LOGO_DARKEN = 0.14;
const LOGO_DARKEN_OVERRIDE = {};
const deriveLogoColor = (c, deviceLabel) => {
  const darken = LOGO_DARKEN_OVERRIDE[deviceLabel] ?? LOGO_DARKEN;
  return c.clone().lerp(new THREE.Color("#000000"), darken);
};

const BODY_GLASS_FINISH = {
  default: { roughness: 0.55, metalness: 0.05, envMapIntensity: 0.25 },
  "iPhone 17 Pro Max": { roughness: 0.22, metalness: 0.05, envMapIntensity: 0.85 },
  "iPhone 17 Pro": { roughness: 0.22, metalness: 0.05, envMapIntensity: 0.85 },
  "iPhone 17": { roughness: 0.3, metalness: 0.05, envMapIntensity: 0.4 },
  "iPhone Air": { roughness: 0.68, metalness: 0.04, envMapIntensity: 0.3 },
  "iPhone 15 Pro Max": { roughness: 0.78, metalness: 0, envMapIntensity: 0.15 },
  // Even at envMapIntensity 0.08/0.02 this still showed a soft Fresnel
  // sheen along the curved edge — the scene always has SOME environment
  // map assigned (the mount always loads a "reference" HDRI, and the
  // Environment dropdown's "None" option maps to a neutral HDRI, not
  // null), so only 0 fully removes the env-reflection contribution.
  // Roughness/metalness alone still let direct lighting shade it normally.
  "iPhone 15 Pro": { roughness: 0.85, metalness: 0, envMapIntensity: 0 },
  // Textured matte back glass, per research — same frosted-not-glossy
  // family as 15 Pro/15 Pro Max, no metallic sheen.
  "iPhone 14 Pro Max": { roughness: 0.75, metalness: 0, envMapIntensity: 0.12 },
  // Confirmed against this export: the back-glass node (bDCfnnHJzPeOYWv_0)
  // has metalness 0.25 with no roughness override (glTF default = fully
  // rough), matching the same textured-matte family as 14 Pro Max.
  "iPhone 14 Pro": { roughness: 0.75, metalness: 0, envMapIntensity: 0.12 },
  "iPhone 14 Plus": { roughness: 0.08, metalness: 0.1, envMapIntensity: 1.0 },
    // Textured matte back glass.
  "iPhone 14": { roughness: 0.08, metalness: 0.1, envMapIntensity: 1.0 },
  // Body bucket is empty on the MacBooks, so this only drives the logo's metalness.
  'MacBook Pro 16"': { roughness: 0.55, metalness: 0.9, envMapIntensity: 0.9 },
  "MacBook Air": { roughness: 0.55, metalness: 0.9, envMapIntensity: 0.9 },
  "iPad mini": { roughness: 0.55, metalness: 0.9, envMapIntensity: 0.9 },
};
// Real back glass reads lighter/less saturated than the anodized frame —
// this is how far each device's body color gets lerped toward white,
// relative to the frame which always stays at full baseTintedColor.
const BODY_COLOR_LIGHTEN = {
  "iPhone 17": 0.22,
};

// Fixed back-glass color per device, ignores the selected finish.
// Fixed back-glass color per device + finish name. Finishes not listed here
// (and the Custom finish) fall back to the normal tinted body color.
const TITANIUM_BACK_GLASS = {
  "Desert titanium": "CFBAAD",
  "Natural titanium": "C0BCB5",
  "White titanium": "E9E9E9",
  "Black titanium": "353638",
};
const BODY_COLOR_OVERRIDE = {
  "iPhone 16 Pro Max": TITANIUM_BACK_GLASS,
  "iPhone 16 Pro": TITANIUM_BACK_GLASS,
  "iPhone 15 Pro Max": TITANIUM_BACK_GLASS,
  "iPhone 15 Pro": TITANIUM_BACK_GLASS,
};
// Some devices give frame/antenna/camera-ring their own distinct color
// per finish rather than deriving everything from the back-glass tint
// (e.g. iPhone Air: "Sky Blue" glass, slate-blue frame, sky-blue ring,
// pale-blue antenna are four different shades, not one tint lightened/
// darkened). When an entry exists here for the current device + finish
// name, applyBodyFinish()/applyLightingTint() use these hexes directly
// instead of deriving from the body tint.
const DEVICE_FINISH_PART_COLORS = {
  "iPhone Air": {
    "Sky Blue": { frame: "AEC4D9", antenna: "C7D3DC", ring: "8FC3E8" },
    "Light Gold": { frame: "E8CE9A", antenna: "F2ECDD", ring: "D9B978" },
    "Cloud White": { frame: "E9E9E7", antenna: "F2F2EF", ring: "D8D8D6" },
    "Space Black": { frame: "1C1C1E", antenna: "0A0A0A", ring: "2B2B2D" },
  },
  // Research values for the 16 / 16 Plus. Back glass hex comes from the finish
  // swatch in App.jsx; these are the parts that differ from it. Antenna and
  // lens rings are color-matched to the frame.
  "iPhone 16 Plus": {
    "Ultramarine": { plateau: "324FC8", frame: "6A80E6", antenna: "6A80E6", ring: "6A80E6" },
    "Teal":        { plateau: "1B8181", frame: "4B9B97", antenna: "4B9B97", ring: "4B9B97" },
    "Pink":        { plateau: "E332A0", frame: "E06EB8", antenna: "E06EB8", ring: "E06EB8" },
    "Black":       { plateau: "1A1B1D", frame: "2B2D31", antenna: "2B2D31", ring: "2B2D31" },
    "White":       { plateau: "FFFFFF", frame: "E2E3E5", antenna: "E2E3E5", ring: "E2E3E5" },
  },
  // Same finish set/colors as 16 Plus per request — mirrored directly so
  // the newly-wired frame/antenna/cameraRing buckets pick up the same
  // per-part hexes instead of falling back to a generic tint lerp.
  "iPhone 16": {
    "Ultramarine": { plateau: "324FC8", frame: "6A80E6", antenna: "6A80E6", ring: "6A80E6" },
    "Teal":        { plateau: "1B8181", frame: "4B9B97", antenna: "4B9B97", ring: "4B9B97" },
    "Pink":        { plateau: "E332A0", frame: "E06EB8", antenna: "E06EB8", ring: "E06EB8" },
    "Black":       { plateau: "1A1B1D", frame: "2B2D31", antenna: "2B2D31", ring: "2B2D31" },
    "White":       { plateau: "FFFFFF", frame: "E2E3E5", antenna: "E2E3E5", ring: "E2E3E5" },
  },
  // Titanium antenna inserts read a shade lighter/warmer than the frame on
  // the real device, especially visible against the darker finishes.
  "iPhone 16 Pro": {
    "Desert titanium": { antenna: "C9BBA5" },
    "Natural titanium": { antenna: "C7C4BC" },
    "White titanium": { antenna: "FBFAF6" },
    "Black titanium": { antenna: "5B5957" },
  },
  // Antenna-line seam is a muted, deliberately-darker accent per finish —
  // not a straight tint of the body — so it stays legible as a separate
  // material rather than blending flat into the back panel.
  // plateau: on the latest (M4-style) design the camera plateau is machined
  // from the same solid aluminum piece as the back chassis, so it's an exact
  // match to the body finish rather than a derived/darkened tint.
  "iPad Pro 12.9-inch": {
    "Space Gray": { antenna: "3A3D40", plateau: "68696E" }, // matches body exactly
    "Silver": { antenna: "D8D8D6", plateau: "E3E4E5" },     // matches body exactly
  },
};

// TEMP DEBUG — every mesh node gets its own distinct color (hashed from its
// node name) instead of one color per bucket, so nodes that were lumped
// into the same bucket (e.g. three different "frame" nodes) still show up
// as different colors. Remove this device from the list (and eventually
// the whole block + its two call sites in applyLightingTint) once bucketing
// is confirmed correct.
const DEBUG_PER_NODE_DEVICES = {
  // Bucketing looks right — debug coloring off.
};

// Deterministic 0-1 hue from a string, so the same node always gets the
// same color across reloads (easier to cross-reference against the console table).
function hashHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (hash % 360) / 360;
}

function getFinishPartColors(deviceLabel, finishName) {
  return DEVICE_FINISH_PART_COLORS[deviceLabel]?.[finishName] ?? null;
}
// Antenna-line inserts are color-matched painted plastic, not bare metal
// — a satin finish, no metalness, distinct from the aluminum frame they
// sit flush with.
const ANTENNA_FINISH = { roughness: 0.4, metalness: 0.0, envMapIntensity: 0.35 };
const TRIM_FINISH = { color: "#0a0a0a", roughness: 0.6, metalness: 0.0, envMapIntensity: 0.15 };
// The Air's bezel and lens rings are black glass, not matte plastic. These values
// roughly match the screen at its default Shiny setting so the two read as one surface.
const TRIM_FINISH_OVERRIDE = {
  "iPhone Air": { roughness: 0.1, metalness: 0.0, envMapIntensity: 1.2 },
  // This export's screen bezel, rear-lens border, and Dynamic Island are all
  // baked as a near-mirror glossy black (met ~0.2-0.28, rough ~0.01). The
  // generic TRIM_FINISH (rough 0.6, matte) was reading as flat gray under
  // studio lighting instead of a deep glossy black — this is the "gray pill".
  "iPhone 16 Pro": { roughness: 0.05, metalness: 0.25, envMapIntensity: 1.1 },
  "iPad mini": { roughness: 0.05, metalness: 0.25, envMapIntensity: 1.1 },
  "Apple Watch Series 7": { roughness: 0.05, metalness: 0.25, envMapIntensity: 1.1 },
};
// Camera plateau — on the real device this reads as a slightly darker,
// more matte version of the body color, not a flat fixed color, so it's
// derived from baseTintedColor in applyBodyFinish() rather than fixed here.
const CAMERA_PLATEAU_DARKEN = 0.15; // how much darker than the body color, default
// Per Apple's own material spec: the camera island on the base 17 is
// sculpted from the SAME piece of color-infused back glass as the rest
// of the panel — it isn't a separate, darker-tinted material. So no
// color shift here; the visual distinction (see CAMERA_PLATEAU_FINISH
// below) comes entirely from the plateau's high-gloss polish vs. the
// matte etched finish of the surrounding back panel.
const CAMERA_PLATEAU_DARKEN_OVERRIDE = {
  "iPhone 17": 0.18, // raise for darker, lower toward 0 for lighter
  "iPhone 14 Pro Max": 0.22, // extra separation from the logo, which shares a similar base darken amount
  "iPhone 14 Pro": 0.22,
  "iPhone 14 Plus": 0.05, 
  "iPhone 14": 0.05,
};
// Camera plateau should read as a matte, slightly-darker version of the
// body color — it should never inherit the frame's metalness/env
// reflection intensity. That inheritance was the cause of the apparent
// color-shift on rotation: a near-mirror surface reflects different
// parts of the environment map from different angles, which reads as
// the color changing even though the base color never did.
const CAMERA_PLATEAU_FINISH = { roughness: 0.12, metalness: 0.85, envMapIntensity: 1.2 };
const CAMERA_PLATEAU_FINISH_OVERRIDE = {
  "iPhone Air": { roughness: 0.06, metalness: 0.6, envMapIntensity: 1.6 },
  // Matte-anodized aluminum plateau, machined from the same piece as the
  // back chassis on the latest design — same finish values as
  // FRAME_FINISH_OVERRIDE/FRAME_ENV_MAP_INTENSITY for this device, not the
  // glossy near-mirror default (which masks color under reflections
  // regardless of the selected finish).
  "iPad Pro 12.9-inch": { roughness: 0.45, metalness: 0.9, envMapIntensity: 0.5 },
  "iPhone 16 Pro": { roughness: 0.03, metalness: 0.15, envMapIntensity: 1.8 },
  "iPhone 15 Pro Max": { roughness: 0.04, metalness: 0.1, envMapIntensity: 1.7 },
  // Glass cover over the plateau, same treatment as 16 Pro/16 Plus, per
  // the reported material name (lIkeUCuAgtmXqMm.002).
  "iPhone 15 Pro": { roughness: 0.03, metalness: 0.15, envMapIntensity: 1.8 },
  // Glossy glass cover over the plateau, per request — same treatment as
  // 16 Pro/16 Plus/15 Pro (material bmOZLlCkCKhIIVe).
  "iPhone 14 Pro Max": { roughness: 0.03, metalness: 0.15, envMapIntensity: 1.8 },
  "iPhone 14 Pro": { roughness: 0.03, metalness: 0.15, envMapIntensity: 1.8 },
  "iPhone 14 Plus": { roughness: 0.03, metalness: 0.15, envMapIntensity: 1.8 },
  "iPhone 14": { roughness: 0.03, metalness: 0.15, envMapIntensity: 1.8 },
  // This export's camera-cluster cover ("glass") is authored fully glossy
  // (metalness 1 / roughness 0) — treated like the other glossy plateau-
  // glass devices rather than the matte-aluminum 12.9-inch. Unverified
  // against a render.
  "iPad Pro 11-inch": { roughness: 0.08, metalness: 0.15, envMapIntensity: 1.6 },
};
const derivePlateauColor = (c, deviceLabel) => {
  const darken = CAMERA_PLATEAU_DARKEN_OVERRIDE[deviceLabel] ?? CAMERA_PLATEAU_DARKEN;
  return c.clone().lerp(new THREE.Color("#000000"), darken);
};
// Reference photos of the real base iPhone 17 (not Pro Max) show the
// ring around each lens as the same matte, color-matched aluminum as
// the plateau shell — no bright/chrome highlight. What reads as a
// "ring" there is just soft ambient-occlusion shading from the
// recessed shape, not a distinct material. So this uses the same
// finish as the plateau, just very slightly darker to read as a
// subtle recess rather than a flat, identical surface.
const CAMERA_RING_FINISH = { roughness: 0.3, metalness: 0.85, envMapIntensity: 1.0 };

// ---------- Watch straps ----------
// Strap patterns are painted at load as a color map + bump map. `rep` is how many times the
// tile repeats across the strap's UVs, so raise it for a finer pattern and lower it for a bigger one.
const STRAP_REPEAT = { default: 6 };
const STRAP_NODE_BUMP = 1.2;

function makeStrapTextures(pattern, hex, hex2) {
  const S = 256;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    return c;
  };
  const colC = mk(), bmpC = mk();
  const cx = colC.getContext("2d"), bx = bmpC.getContext("2d");
  cx.fillStyle = `#${hex}`;
  cx.fillRect(0, 0, S, S);
  bx.fillStyle = "#808080";
  bx.fillRect(0, 0, S, S);

  const stroke = (ctx, x1, y1, x2, y2, color, w) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  const noise = (ctx, amt) => {
    const d = ctx.getImageData(0, 0, S, S);
    for (let i = 0; i < d.data.length; i += 4) {
      const n = (Math.random() - 0.5) * amt;
      d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
    }
    ctx.putImageData(d, 0, 0);
  };

  switch (pattern) {
    case "weave": // nylon twill: diagonal threads
      for (let i = -S; i < S * 2; i += 8) {
        stroke(bx, i, 0, i + S, S, "#d0d0d0", 4);
        stroke(cx, i, 0, i + S, S, "rgba(255,255,255,0.10)", 3);
        stroke(cx, i + 4, 0, i + 4 + S, S, "rgba(0,0,0,0.12)", 2);
      }
      noise(cx, 14);
      break;
    case "rib": // ocean band ridges
      for (let y = 0; y < S; y += 16) {
        const g = bx.createLinearGradient(0, y, 0, y + 16);
        g.addColorStop(0, "#303030");
        g.addColorStop(0.5, "#f0f0f0");
        g.addColorStop(1, "#303030");
        bx.fillStyle = g;
        bx.fillRect(0, y, S, 16);
      }
      break;
    case "mesh": // milanese loop: fine cross-hatch
      for (let i = -S; i < S * 2; i += 6) {
        stroke(bx, i, 0, i + S, S, "#e0e0e0", 2);
        stroke(bx, i, S, i + S, 0, "#e0e0e0", 2);
        stroke(cx, i, 0, i + S, S, "rgba(255,255,255,0.18)", 1);
        stroke(cx, i, S, i + S, 0, "rgba(0,0,0,0.18)", 1);
      }
      break;
    case "leather": // grain + stitch lines
      noise(cx, 22);
      noise(bx, 40);
      [14, S - 14].forEach((x) => {
        cx.setLineDash([10, 7]);
        stroke(cx, x, 0, x, S, `#${hex2 || "F2E6CF"}`, 2.5);
        cx.setLineDash([]);
        bx.setLineDash([10, 7]);
        stroke(bx, x, 0, x, S, "#202020", 3);
        bx.setLineDash([]);
      });
      break;
    case "stripes": // two-color vertical bands
      for (let x = 0; x < S; x += 64) {
        cx.fillStyle = `#${hex2 || "FFFFFF"}`;
        cx.fillRect(x + 32, 0, 32, S);
      }
      for (let i = -S; i < S * 2; i += 8) stroke(bx, i, 0, i + S, S, "#c8c8c8", 3);
      break;
    case "dots": // sport band perforations
      for (let y = 16; y < S; y += 32) {
        for (let x = 16; x < S; x += 32) {
          cx.fillStyle = "rgba(0,0,0,0.55)";
          cx.beginPath(); cx.arc(x, y, 5, 0, Math.PI * 2); cx.fill();
          bx.fillStyle = "#000";
          bx.beginPath(); bx.arc(x, y, 6, 0, Math.PI * 2); bx.fill();
        }
      }
      break;
        case "canvas": // plain-weave grid
      for (let i = 0; i < S; i += 4) {
        stroke(bx, i, 0, i, S, "#b0b0b0", 2);
        stroke(bx, 0, i, S, i, "#b0b0b0", 2);
        stroke(cx, i, 0, i, S, "rgba(0,0,0,0.08)", 1);
        stroke(cx, 0, i, S, i, "rgba(255,255,255,0.06)", 1);
      }
      noise(cx, 18);
      break;
    case "braid": // perlon: interlocked V braid
      for (let y = -16; y < S + 16; y += 16) {
        for (let x = 0; x < S; x += 32) {
          stroke(bx, x, y, x + 16, y + 16, "#e0e0e0", 5);
          stroke(bx, x + 32, y, x + 16, y + 16, "#e0e0e0", 5);
          stroke(cx, x, y, x + 16, y + 16, "rgba(255,255,255,0.14)", 4);
          stroke(cx, x + 32, y, x + 16, y + 16, "rgba(0,0,0,0.18)", 3);
        }
      }
      noise(cx, 10);
      break;
    default: // "solid" / sport: smooth, with a barely-there grain
      noise(cx, 4);
  }

  const wrap = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = MAX_ANISOTROPY;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: wrap(colC, true), bump: pattern === "solid" ? null : wrap(bmpC, false) };
}

// Series 9 gets its own loop styles: no buckle or keepers, just a ribbon that slides into the slot.
// t is a fraction of the 24.2 mm ribbon width, so 0.14 is about 3.4 mm, which fits the slot (the original is 3.7 mm).
const STRAP_STYLES_BY_DEVICE = {
  "Apple Watch Series 9": {
    sport:     { label: "Sport Band", original: true },
    solo:      { label: "Solo Loop", w: 1.0, t: 0.14, round: 0.4, rep: 4,
                 defaultFinish: { pattern: "solid", hex: "1F2A44", roughness: 0.4, metalness: 0 } },
    sportLoop: { label: "Sport Loop", w: 1.0, t: 0.15, round: 0.25, rep: 10,
                 defaultFinish: { pattern: "weave", hex: "465A4F", roughness: 0.85, metalness: 0 } },
    braided:   { label: "Braided Solo Loop", w: 1.0, t: 0.15, round: 0.3, rep: 8,
                 defaultFinish: { pattern: "braid", hex: "202022", roughness: 0.8, metalness: 0 } },
    canvas:    { label: "Canvas Loop", w: 1.0, t: 0.15, round: 0.2, rep: 10,
                 defaultFinish: { pattern: "canvas", hex: "B08A55", roughness: 0.9, metalness: 0 } },
    leather:   { label: "Leather Loop", w: 1.0, t: 0.13, round: 0.2, rep: 3,
                 defaultFinish: { pattern: "leather", hex: "auto", hex2: "E9D7B5", roughness: 0.6, metalness: 0 } },
    milanese:  { label: "Milanese Loop", w: 1.0, t: 0.1, round: 0.2, rep: 8,
                 defaultFinish: { pattern: "mesh", hex: "C8C8C8", roughness: 0.3, metalness: 1, metal: true } },
  },
};
export const getStrapStyles = (deviceLabel) => STRAP_STYLES_BY_DEVICE[deviceLabel] ?? STRAP_STYLES;

// ---------- Watch strap styles ----------
// w / t are multiples of the original strap's measured width. buckle / clasp = position along the strap (0-1).
export const STRAP_STYLES = {
  sport:     { label: "Sport Band", original: true },
  silicone:  { label: "Silicone", w: 1.0, t: 0.2, buckle: 0.1, keepers: [0.17, 0.22], round: 0.4, rep: 4,
               defaultFinish: { pattern: "solid", hex: "1F2A44", roughness: 0.4, metalness: 0 } },
  nylon:     { label: "NATO Nylon", w: 1.0, t: 0.1, buckle: 0.1, keepers: [0.2, 0.27], round: 0.2, rep: 6,
               defaultFinish: { pattern: "weave", hex: "465A4F", roughness: 0.85, metalness: 0 } },
  canvas:    { label: "Canvas", w: 1.0, t: 0.14, buckle: 0.1, keepers: [0.18], round: 0.2, rep: 10,
               defaultFinish: { pattern: "canvas", hex: "B08A55", roughness: 0.9, metalness: 0 } },
  perlon:    { label: "Perlon", w: 0.95, t: 0.13, buckle: 0.1, keepers: [0.18], round: 0.3, rep: 8,
               defaultFinish: { pattern: "braid", hex: "202022", roughness: 0.8, metalness: 0 } },
  leather:   { label: "Leather Buckle", w: 0.95, t: 0.11, buckle: 0.1, rep: 3,
               defaultFinish: { pattern: "leather", hex: "auto", hex2: "E9D7B5", roughness: 0.6, metalness: 0 } },
  milanese:  { label: "Milanese Mesh", w: 1.0, t: 0.06, clasp: 0.5, rep: 8,
               defaultFinish: { pattern: "mesh", hex: "C8C8C8", roughness: 0.3, metalness: 1, metal: true } },
  link:      { label: "Link Bracelet", w: 1.0, t: 0.16, links: 22, clasp: 0.5, round: 0.3, rep: 1,
               defaultFinish: { pattern: "solid", hex: "C4C5C8", roughness: 0.22, metalness: 1, metal: true } },
};
// gap = how far (radians) the loop is opened at the case. n = squareness (2 = ellipse, higher = boxier).
const STRAP_PATH = {
  default: { gap: 0.42, n: 2.3 },
  // lug centres in levelled model units (m). The loop's ends land exactly here.
  "Apple Watch Ultra": { fromMesh: true, extend: 0.002 }, // follow the original strap's real route
  // cutZ drops the original's curled end (inside the slot). The path then ends at the slot mouth along the
  // band's own angle, runs `extend` into the slot, and the band flares to endW over `len`.
  "Apple Watch Series 9": {
  fromMesh: true, extend: 0, cutZ: 0.0185,
  // original strap's centre-line into the slot (y, z in metres), curve -> tip. Bottom end is mirrored about mirrorY.
  tail: {
    mirrorY: -0.00105,
    top: [[0.0221, 0.0203], [0.0204, 0.0218], [0.0192, 0.0226], [0.0180, 0.0229], [0.0169, 0.0242]],
  },
  flare: { endW: 0.034, len: 0.009 },
},
  // Series 7: measured from the GLB. Slot tip at y≈22.4mm, z≈25.5mm; case centre y≈5.35mm; ribbon 20.6mm wide, flaring to 35mm in the slot.
  "Apple Watch Series 7": {
    fromMesh: true, extend: 0, cutZ: 0.018, xOffset: 0.00115,
    tail: {
      mirrorY: 0.00535,
      top: [[0.0330, 0.0188], [0.0312, 0.0201], [0.0295, 0.0224], [0.0278, 0.0238], [0.0262, 0.0247], [0.0250, 0.0254], [0.0236, 0.0255], [0.0224, 0.0255]],
    },
    flare: { endW: 0.035, len: 0.011, endT: 0.0044 },
  },
};
// multiplier on style thickness, per device (1 = as defined in STRAP_STYLES)
const STRAP_T_SCALE = { "Apple Watch Ultra": 0.55, "Apple Watch Series 7": 0.6 };
// Width the "1.0 x width" styles are measured against, when the strap's bounding box is wider than its ribbon
const STRAP_RIBBON_W = { "Apple Watch Series 9": 0.0242, "Apple Watch Series 7": 0.0206 };
// original-strap hardware to hide when a custom style is active
const STRAP_HIDE_NODES = {
  "Apple Watch Ultra": ["Object_93", "Object_95", "Object_104", "Object_106"], // G-hook + pins
  "Apple Watch Series 9": ["rayYRUdqBJxpBCY"], // lug pin/stem bar
  "Apple Watch Series 7": ["Object_16"], // rivet at the back of the loop
};

function strapProfile(w, t, rc, seg = 3) {
  const hw = w / 2, ht = t / 2, r = Math.max(0.0001, Math.min(rc, ht, hw)), pts = [];
  [[hw - r, ht - r, 0], [-hw + r, ht - r, Math.PI / 2], [-hw + r, -ht + r, Math.PI], [hw - r, -ht + r, 1.5 * Math.PI]].forEach(([cx, cy, a0]) => {
    for (let k = 0; k <= seg; k++) {
      const a = a0 + (k / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  });
  return pts;
}

// Open loop in the Y-Z plane (face = +Z, 12 o'clock = +Y), sized from the original strap's bounds.
function buildStrapPath(box, cfg) {
  const { n } = cfg;
  const e = 2 / n;
  let cy = (box.min.y + box.max.y) / 2, cz = (box.min.z + box.max.z) / 2;
  const ry = (box.max.y - box.min.y) / 2;
  let rz = (box.max.z - box.min.z) / 2, gap = cfg.gap;
  if (cfg.lugZ != null) {
    // solve the opening angle and back/front radii so both ends sit on the lugs
    const half = (cfg.lugTopY - cfg.lugBottomY) / 2;
    cy = (cfg.lugTopY + cfg.lugBottomY) / 2;
    gap = Math.asin(Math.pow(Math.min(0.99, half / ry), 1 / e));
    const c0 = Math.pow(Math.cos(gap), e);
    rz = (cfg.lugZ - box.min.z) / (1 + c0);
    cz = box.min.z + rz;
  }
  const N = 400, a0 = gap, a1 = Math.PI * 2 - gap, pts = [];
  let len = 0;
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N, sa = Math.sin(a), ca = Math.cos(a);
    const y = cy + ry * Math.sign(sa) * Math.pow(Math.abs(sa), e);
    const z = cz + rz * Math.sign(ca) * Math.pow(Math.abs(ca), e);
    if (i) len += Math.hypot(y - pts[i - 1].y, z - pts[i - 1].z);
    pts.push({ y, z, s: len });
  }
  const at = (s) => {
    s = Math.min(len, Math.max(0, s));
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= s) lo = m; else hi = m; }
    const p = pts[lo], q = pts[hi], f = (s - p.s) / Math.max(1e-9, q.s - p.s);
    const dy = q.y - p.y, dz = q.z - p.z, d = Math.hypot(dy, dz) || 1;
    return { y: p.y + dy * f, z: p.z + dz * f, ty: dy / d, tz: dz / d };
  };
  return { at, len };
}

// Builds the strap path from the ORIGINAL strap's outer contour (so it follows the real route
// into the lug slot). pts = original strap vertices in levelled model units.
function buildStrapPathFromPoints(pts, cy, cz, extend = 0, cutZ = null, tail = null) {
  if (cutZ != null) pts = pts.filter((p) => p.z <= cutZ); // drop the curled end inside the slot
  const B = 180, TWO = Math.PI * 2;
  const rMax = new Array(B).fill(0), rMin = new Array(B).fill(Infinity);
  pts.forEach((p) => {
    let a = Math.atan2(p.y - cy, p.z - cz);
    if (a < 0) a += TWO;
    const i = Math.min(B - 1, Math.floor((a / TWO) * B));
    const r = Math.hypot(p.y - cy, p.z - cz);
    rMax[i] = Math.max(rMax[i], r);
    rMin[i] = Math.min(rMin[i], r);
  });
  const rOut = rMax.map((mx, i) => (mx > 0 ? (mx + rMin[i]) / 2 : 0)); // mid-line of the original strap
  const first = rOut.findIndex((r) => r > 0);
  let last = B - 1;
  while (last > 0 && rOut[last] === 0) last--;

  const W = 3, poly = [];
  for (let i = first; i <= last; i++) {
    let sum = 0, n = 0;
    for (let k = -W; k <= W; k++) {
      const j = Math.min(last, Math.max(first, i + k));
      if (rOut[j] > 0) { sum += rOut[j]; n++; }
    }
    const a = ((i + 0.5) / B) * TWO, r = sum / n;
    poly.push({ y: cy + r * Math.sin(a), z: cz + r * Math.cos(a) });
  }
  const ext = (p, q) => {
    const dy = p.y - q.y, dz = p.z - q.z, d = Math.hypot(dy, dz) || 1;
    return { y: p.y + (dy / d) * extend, z: p.z + (dz / d) * extend };
  };
  if (extend) {
    poly.unshift(ext(poly[0], poly[1]));
    poly.push(ext(poly[poly.length - 1], poly[poly.length - 2]));
  }
  if (tail) {
    poly.unshift(...[...tail.top].reverse().map(([y, z]) => ({ y, z })));
    poly.push(...tail.top.map(([y, z]) => ({ y: 2 * tail.mirrorY - y, z })));
  }

  const pts2 = [];
  let len = 0;
  poly.forEach((p, i) => {
    if (i) len += Math.hypot(p.y - poly[i - 1].y, p.z - poly[i - 1].z);
    pts2.push({ ...p, s: len });
  });
  const N = pts2.length - 1;
  const at = (s) => {
    s = Math.min(len, Math.max(0, s));
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts2[m].s <= s) lo = m; else hi = m; }
    const p = pts2[lo], q = pts2[hi], f = (s - p.s) / Math.max(1e-9, q.s - p.s);
    const dy = q.y - p.y, dz = q.z - p.z, d = Math.hypot(dy, dz) || 1;
    return { y: p.y + dy * f, z: p.z + dz * f, ty: dy / d, tz: dz / d };
  };
  return { at, len };
}

// Sweeps the profile along the path for each [s0, s1] range. Each range gets its own end caps (links, flap).
function buildStrapGeometry(path, w, t, rc, ranges, flare) {
  const prof = strapProfile(w, t, rc), P = prof.length;
  const pos = [], uv = [], idx = [];
  ranges.forEach(({ s0, s1, off = 0 }) => {
    const steps = Math.max(2, Math.ceil(((s1 - s0) / path.len) * 140));
    const base = pos.length / 3;
    for (let i = 0; i <= steps; i++) {
      const s = s0 + ((s1 - s0) * i) / steps, c = path.at(s), ny = -c.tz, nz = c.ty;
      let k = 1, kt = 1; // widen (and thicken) toward both ends so the band fills the slot like the original's flared end
      if (flare && (flare.endW > w || flare.endT > t)) {
        const u = Math.min(1, Math.max(0, 1 - Math.min(s, path.len - s) / flare.len));
        const e = u * u * (3 - 2 * u);
        if (flare.endW > w) k = 1 + (flare.endW / w - 1) * e;
        if (flare.endT > t) kt = 1 + (flare.endT / t - 1) * e;
      }
      prof.forEach(([x, h]) => {
        const o = h * kt - t / 2 + off; // path = outer surface, so the ribbon sits just inside it
        pos.push(x * k, c.y + ny * o, c.z + nz * o);
        uv.push(x / w + 0.5, s / w);
      });
    }
    for (let i = 0; i < steps; i++)
      for (let j = 0; j < P; j++) {
        const a = base + i * P + j, b = base + i * P + ((j + 1) % P), c2 = a + P, d = b + P;
        idx.push(a, c2, b, b, c2, d);
      }
    [[0, false], [steps, true]].forEach(([ring, flip]) => {
      const r0 = base + ring * P, cb = pos.length / 3;
      let mx = 0, my = 0, mz = 0;
      for (let j = 0; j < P; j++) {
        const x = pos[(r0 + j) * 3], y = pos[(r0 + j) * 3 + 1], z = pos[(r0 + j) * 3 + 2];
        pos.push(x, y, z); uv.push(0.5, 0.5);
        mx += x; my += y; mz += z;
      }
      pos.push(mx / P, my / P, mz / P); uv.push(0.5, 0.5);
      for (let j = 0; j < P; j++) {
        const a = cb + j, b = cb + ((j + 1) % P);
        flip ? idx.push(cb + P, b, a) : idx.push(cb + P, a, b);
      }
    });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Buckle frame / clasp block, fixed polished metal (never takes the strap color).
function makeStrapHardware(path, spec, w, t, inset = t / 2) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: "#C9CACD", metalness: 1, roughness: 0.28 });
  const place = (frac, build) => {
    const c = path.at(path.len * frac);
    const X = new THREE.Vector3(1, 0, 0), N = new THREE.Vector3(0, -c.tz, c.ty), T = new THREE.Vector3(0, c.ty, c.tz).negate();
    const h = new THREE.Group();
    h.position.set(0, c.y - N.y * inset, c.z - N.z * inset);
    h.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, N, T));
    build(h);
    g.add(h);
  };
  const box = (h, sx, sy, sz, x, z, y = 0) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(sx, sy, sz) * 0.35), mat);
    m.position.set(x, y, z);
    h.add(m);
  };
  if (spec.buckle != null)
    place(spec.buckle, (h) => {
      const Wb = w * 1.14, Lb = w * 0.55, b = w * 0.09, H = t * 1.5 + w * 0.04;
      box(h, b, H, Lb, Wb / 2 - b / 2, 0);
      box(h, b, H, Lb, -Wb / 2 + b / 2, 0);
      box(h, Wb, H, b, 0, Lb / 2 - b / 2);
      box(h, Wb, H, b, 0, -Lb / 2 + b / 2);
    });
  if (spec.clasp != null) place(spec.clasp, (h) => box(h, w * 1.04, t * 1.8 + w * 0.05, w * 0.6, 0, 0));
  // keeper loops: thin metal rings hugging the strap
  (spec.keepers ?? []).forEach((f) =>
    place(f, (h) => {
      const b = w * 0.05, Lk = w * 0.14;
      box(h, b, t + b * 2, Lk, w / 2 + b / 2, 0);
      box(h, b, t + b * 2, Lk, -w / 2 - b / 2, 0);
      box(h, w + b * 2, b, Lk, 0, 0, t / 2 + b / 2);
      box(h, w + b * 2, b, Lk, 0, 0, -t / 2 - b / 2);
    })
  );
  return g;
}

const deriveRingColor = (c) => c.clone(); // color-matched — no tint shift, just a metal finish

// Some exports ship baked normal / metal-rough maps that read as a heavy orange-peel
// bump instead of the real finish. Per device + bucket: shrink or drop the normal map,
// and drop the roughness/metalness maps so the finish constants fully control the look.
const SURFACE_MAP_OVERRIDE = {
  "iPhone 14 Plus": {
    cameraPlateau: { normalScale: 0, dropRoughnessMap: true },
  },
  "iPhone 14": {
    cameraPlateau: { normalScale: 0, dropRoughnessMap: true },
  },
  "iPhone 16 Pro Max": {
    frame: { normalScale: 0.05, dropRoughnessMap: true },
  },
  // Full-replacement export: frame (faiFLnJYwWafgXE bakes roughness+normal,
  // wsKclmoFwVMALwN bakes roughness only), buttons (mKMxrBEjAuubnwO,
  // mAxYYrPOMVuYZuQ bake roughness+normal), back glass and the camera
  // plateau/antenna strips share the same textured materials as the
  // buttons/shell — dropping all of them so FRAME_FINISH_OVERRIDE's flat
  // satin factors fully control the look instead of the baked maps
  // showing through as a patchier/different texture on part of the frame.
  "iPhone 16 Pro": {
    frame: { normalScale: 0, dropRoughnessMap: true },
    body: { normalScale: 0, dropRoughnessMap: true },
    antenna: { normalScale: 0, dropRoughnessMap: true },
    cameraPlateau: { normalScale: 0, dropRoughnessMap: true },
    lens: { normalScale: 0, dropRoughnessMap: true },
  },
  // body (bJOIXYmaJBYmLic.002) bakes a normal map with no roughness map —
  // the bump detail alone was scattering enough light to read as glossy
  // sparkle even with roughness turned up. frame (bPkZQEigsToYyEb.002)
  // bakes BOTH a metallic-roughness map and a normal map — dropping the
  // roughness map lets FRAME_FINISH_OVERRIDE's factor fully control the
  // look instead of being multiplied against baked-in shiny spots.
  "iPhone 15 Pro": {
    body: { normalScale: 0.12, dropRoughnessMap: true },
    frame: { normalScale: 0.15, dropRoughnessMap: true },
  },
  // lens (pBMikDFQfUOsKkr) bakes its own roughness/metalness/normal map —
  // the override correctly buckets it as "lens" (confirmed in console),
  // but LENS_FINISH's flat roughness/metalness/color were being multiplied
  // against that baked texture and washed back out, which is why the
  // material looked unchanged despite bucketing being correct.
  "iPhone 14 Pro Max": {
    lens: { normalScale: 0, dropRoughnessMap: true },
    // KxzouvBYEgdZhMo bakes an extreme roughness map (source roughness
    // 0.001, near-mirror) — without dropping it, LOGO_ROUGHNESS gets
    // multiplied against that baked map instead of replacing it, which
    // reads as a near-mirror logo from some angles (dark, matching
    // whatever's reflected — here the plateau) and normal from others.
    logo: { normalScale: 0, dropRoughnessMap: true },
  },
  // The screen split out of the atlas mesh still carries the atlas's roughness/
  // metalness/AO/normal maps; those would sample with the remapped UVs and garble it.
  "iPad Air": {
    screen: { normalScale: 0, dropRoughnessMap: true },
  },
  // "case" (frame) bakes its own metallicRoughness map — dropped so the
  // selected finish's flat roughness/metalness fully controls the look
  // instead of being multiplied against whatever local variation is baked in.
  "iPad Pro 11-inch": {
    frame: { normalScale: 0, dropRoughnessMap: true },
  },
  "Apple Watch Ultra": {
    frame: { normalScale: 0.3, dropRoughnessMap: true }, // fine bead-blast grain instead of a heavy orange-peel bump
  },
};
function applySurfaceMaps(mat, deviceLabel, bucket) {
  const o = SURFACE_MAP_OVERRIDE[deviceLabel]?.[bucket];
  if (!o) return;
  if (o.normalScale === 0) {
    mat.normalMap = null;
  } else if (o.normalScale !== undefined && mat.normalMap) {
    mat.normalScale.set(o.normalScale, o.normalScale);
  }
  if (o.dropRoughnessMap) {
    mat.roughnessMap = null;
    mat.metalnessMap = null;
    mat.aoMap = null;
  }
}

// Real lens rings on the 16 Plus are polished, color-matched aluminum.
const CAMERA_RING_FINISH_OVERRIDE = {
  // "camera_rings" is authored fully glossy (metalness 1 / roughness 0) —
  // a near-mirror dark ring rather than the default's satin finish.
  "iPad Pro 11-inch": { roughness: 0.05, metalness: 0.9, envMapIntensity: 1.6 },
};

const CAMERA_RING_MATERIAL_OVERRIDE = {
  // separate cameraRing material at all (see MATERIAL_NAME_MAP), so it's
  // gone. Add future devices here only if the same node-name-ambiguity
  // problem shows up on a bucketBy:"node" export.
};

// Same node-name-ambiguity problem as CAMERA_RING_MATERIAL_OVERRIDE above —
// this export's frame material (confirmed via GLB viewer) is bPkZQEigsToYyEb.002.
// Matching on the material name directly, instead of retyping its hashed node
// name, is what actually gets this bucketed as "frame" so it picks up
// FRAME_FINISH_OVERRIDE/FRAME_ENV_MAP_INTENSITY — both of which already mirror
// fixed the finish matches automatically.
const FRAME_MATERIAL_OVERRIDE = {
  "iPhone 15 Pro": ["bPkZQEigsToYyEb.002"],
};

// Single source of truth for "this confirmed material name belongs to
// bucket X", checked BEFORE the ordinary node-name chain (see the
// traversal below) so a node whose hashed name happens to coincidentally
// match an earlier bucket's node-name list can't shadow it. Previous pass
// split these across four separate maps checked only at each bucket's own
// spot in the if/else chain — if any node here got caught by an earlier
// check (frame/body/trim) first, the later override never ran. Checking
// this map first for every node-bucketed device removes that ordering
// hazard entirely.
// Same idea as PRESERVE_NATIVE_BUCKETS, but for individual nodes rather than
// a whole bucket — for parts like LiDAR that sit inside a bucket (trim, lens)
// that otherwise still needs the normal clone/tint/opacity-fix pipeline.
// Preserved nodes that must draw AFTER a translucent overlay (e.g. the Series 9's
// 80% black back-crystal glass, which would otherwise dim them to ~20%).
// renderOrder: higher draws later. brighten: multiplier on the authored color.
const PRESERVE_DRAW_ABOVE = {
  "Apple Watch Ultra": {
    Object_74: { renderOrder: 6, brighten: 1 },          // 4 LED lenses
    Object_86_islands: { renderOrder: 6, brighten: 1 },  // 4 photodiode discs
  },
  "Apple Watch Series 9": {
    OQKiwXMswFHOiIm_islands: { renderOrder: 6, brighten: 1 },  // 4 photodiode discs (split out below)
    sFekevMTPLKPGwf: { renderOrder: 6, brighten: 1 },          // 4 LED lenses
  },
};

// Pulls the small disc islands out of a preserved mesh so only they draw above the glass.
// Threshold is relative to the mesh's own size, so it doesn't depend on export units.
const SENSOR_ISLAND_SPLIT = {
  "Apple Watch Ultra": { node: "Object_86", maxFractionOfWhole: 0.4 },
  "Apple Watch Series 9": { node: "OQKiwXMswFHOiIm", maxFractionOfWhole: 0.4 },
};
const PRESERVE_NATIVE_NODES = {
  "iPhone 17 Pro Max": ["LIDAR"],
  "iPad Pro 12.9-inch": ["LiDar_LiDar_0"],
  "iPad Pro 11-inch": ["LiDAR"],
  "iPhone 14 Pro Max": ["JyAbjubWrOdfygC_0", "nxFoHsySvfcSLvp"],
  "iPhone 15 Pro Max": ["ZQfGMLaFcpPaLMU"],
  "Apple Watch Series 9": [
    "sFekevMTPLKPGwf", "OQKiwXMswFHOiIm", "OQKiwXMswFHOiIm_islands", // sensor lens array + glow disc + split-off photodiode discs
    "rhNJnuHdLYrQzgA",                      // back crystal, 80% black glass overlay (keeps its alpha)
    "ODfBWgnKaGvPXPT",                      // back crystal, gray ceramic base under the glass
    "iSeYrRMXDgmhKtN",   // sensor surround rings (authored dark gray / black)
    "ciIcclAGsqZRJwp",                      // back plate ring (authored charcoal)
  ],
  "Apple Watch Series 7": ["Object_13"],
  "Apple Watch Ultra": [
    "Object_76",           // 80% black back-crystal glass (keeps its alpha)
    "Object_82",           // gray ceramic ring under the glass
    "Object_74",           // 4 LED lenses (emissive honeycomb)
    "Object_86",           // big glow rings (emissive)
    "Object_86_islands",   // 4 photodiode discs, split out by Edit 3
  ],
};
// iPhone 15 Pro: Object_139 (material tsbwpbLZoQgeTat.002) is a real LiDAR
// window mesh and is correctly bucketed as "lens", but it sits inside the
// depth range of Object_129 (a large near-full-back-panel "trim" mesh) and
// keeps losing that z-fight no matter how it's offset. Rather than keep
// tuning polygon offsets, this draws a fresh disc with depth testing off,
// so it always shows on top regardless of what else occupies that spot.
// Center/radius are Object_139's own measured local vertex bounds — not
// eyeballed.
const LIDAR_OVERLAY = {
  "iPhone 15 Pro": {
    anchorNode: "Object_139",
    center: [-0.3146, 0.5062, -3.5858],
    radius: 0.325,
  },
  // Corrected: JyAbjubWrOdfygC_0/nxFoHsySvfcSLvp (the original anchor) is
  // actually the rear mic — its x-center (-0.088) sits isolated at the
  // cluster's edge with a tiny ~0.11-unit footprint. The real LiDAR window
  // is vauUojKrKkLLDtY: same x-column as the confirmed flash
  // (RGbIswEcCTzqNsn_0, x=-0.665 both), sitting below it — matching the
  // flash/LiDAR vertical pairing on the real device — with a ~0.62-unit
  // diameter (radius ~0.31, consistent with the 15 Pro's own 0.325).
  // center.z is still the cover glass's own measured outer face
  // (YnrVhXEUDbStWCs, flat at Z=0.8110), pushed further along +Z to clear it.
"iPhone 14 Pro Max": {
  anchorNode: "vauUojKrKkLLDtY",
  center: [-0.6652, 12.3947, 0.5779], // rJeCWUNsVVXXAbI, the plateau's own glass cover — the real occluder directly above the window, confirmed flat across its whole footprint
  radius: 0.309,
  normalAxis: "z",
  offset: 0.017, // small clearance past that glass cover
},
  // Same LiDAR module/layout as the 14 Pro Max, confirmed the same way:
  // HoxbTqqoWNtdbGr's x-center matches the confirmed flash's (RflwlrcvHLpkpdo_0)
  // almost exactly, and its ~0.62-unit diameter matches the Pro Max's window
  // almost exactly too. zdOkUYGKWOPWnuR (the plateau's raised housing wall)
  // sits directly over it at Z=0.5761 — confirmed via triangle test across
  // the whole window footprint, not just its center — so that's the real
  // surface to clear, not the window's own native depth (0.4901).
  "iPhone 14 Pro": {
    anchorNode: "HoxbTqqoWNtdbGr",
    center: [-0.3614, 11.0459, 0.5761],
    radius: 0.309,
    normalAxis: "z",
    offset: 0.02,
  },
"iPhone 15 Pro Max": {
  // Object_118 is the real LiDAR window — a thin unfilled ring at z=0.327,
  // sitting in the x=-0.621 column between the flash (Object_202, y=6.957)
  // and the telephoto lens (Object_186 cluster, y=5.603) — confirmed via
  // Apple's reporting that the periscope/telephoto lens sits BETWEEN the
  // flash and LiDAR scanner on this device.
  // Object_114 — the shared translucent glass cover over the whole plateau
  // (KEEP_TRANSPARENT_NODES, alpha 0.6) — sits at z=0.4133 right above the
  // window, occluding anything placed at the window's own recessed depth.
  // Same fix as 14 Pro Max/14 Pro/15 Pro: anchor to the real occluder's
  // surface z, not the window's own z.
  anchorNode: "Object_118",
  center: [-0.621, 4.247, 0.4133],
  radius: 0.325,
  normalAxis: "z",
  offset: 0.02,
},
};

function makeLidarOverlayDisc(radius, normalAxis = "y", offset = 0.13) {
  const geo = new THREE.CircleGeometry(radius, 32);
  // CircleGeometry is authored flat in local X-Y with its normal along +Z.
  // Rotate it to match whichever axis THIS export's anchor mesh actually
  // uses as its own flat-face normal (measured per device, not guessed —
  // see LIDAR_OVERLAY below), then push it that same small amount further
  // along that axis so it clears the real geometry instead of z-fighting.
  if (normalAxis === "z") {
    // already the CircleGeometry's native normal — no rotation needed
    geo.translate(0, 0, offset);
  } else {
    geo.rotateX(Math.PI / 2); // normal -> Y (default, matches 15 Pro)
    geo.translate(0, offset, 0);
  }
  const mat = new THREE.MeshStandardMaterial({
    color: "#000000",
    roughness: 0.15,
    metalness: 0.1,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 0, // constant-only, avoids the grazing-angle flip
    polygonOffsetUnits: -16,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "LiDAR_overlay";
  mesh.renderOrder = 999;
  return mesh;
}
// Nodes whose source material is a genuine translucent overlay (real
// alpha < 1 in the glTF) sitting directly in front of geometry whose own
// baked texture needs to show through it. Forcing full opacity — what
// every other node-bucketed material gets — turns it into a solid sheet
// that hides whatever's behind. These keep their authored transparency/
// opacity/depthWrite instead of being flattened to opaque.
const KEEP_TRANSPARENT_NODES = {
  // Object_114 (baseColorFactor alpha 0.6) sits right above Object_116,
  // whose own texture bakes the LiDAR window in as darker shading — see
  // the cameraPlateau branch below and applyBodyFinish's
  // preserveBakedShading check.
  "iPhone 15 Pro Max": ["Object_114"],
};
// Clones a "preserved" material, touching only what's actually broken:
// - KHR_materials_unlit exports become MeshBasicMaterial, which ignores all
//   scene lighting/environment — upgraded to MeshStandardMaterial so it
//   actually renders.
// - Real glTF transmission (KHR_materials_transmission) needs a
//   transmission-aware render pass this scene doesn't set up, so it's zeroed.
// Deliberately does NOT force opacity/transparent/depthWrite — some exports'
// lens assemblies are genuinely layered (a barrel mesh plus a thin, partially
// transparent glass film on top for the highlight), and forcing that film
// opaque hides the detail underneath it instead of preserving the authored look.
function sanitizePreservedMaterial(mat, deviceLabel, nodeName) {
  console.log(
    `[preserve debug BEFORE] ${deviceLabel} node=${nodeName} name=${mat.name} type=${mat.type} ` +
    `isStandard=${mat.isMeshStandardMaterial} isPhysical=${mat.isMeshPhysicalMaterial} ` +
    `color=#${mat.color ? mat.color.getHexString() : "n/a"} map=${!!mat.map} ` +
    `roughness=${mat.roughness} metalness=${mat.metalness} ` +
    `transmission=${"transmission" in mat ? mat.transmission : "n/a"} ` +
    `opacity=${mat.opacity} transparent=${mat.transparent} depthWrite=${mat.depthWrite} ` +
    // new:
    `emissive=#${mat.emissive ? mat.emissive.getHexString() : "n/a"} ` +
    `emissiveIntensity=${mat.emissiveIntensity} emissiveMap=${!!mat.emissiveMap} ` +
    `envMapIntensity=${mat.envMapIntensity} clearcoat=${"clearcoat" in mat ? mat.clearcoat : "n/a"}`
  );

  let clone = mat.clone();


  if (!clone.isMeshStandardMaterial && !clone.isMeshPhysicalMaterial) {
    clone = new THREE.MeshStandardMaterial({
      name: clone.name,
      map: clone.map ?? null,
      color: clone.color ? clone.color.clone() : undefined,
      side: clone.side,
      transparent: clone.transparent,
      opacity: clone.opacity,
      depthWrite: clone.depthWrite,
    });
  }

  // Only real transmission gets zeroed — normal alpha blending (opacity +
  // transparent) is left exactly as authored.
  if ("transmission" in clone) {
    clone.transmission = 0;
    clone.thickness = 0;
  }
  if (deviceLabel === "Apple Watch Series 9" && nodeName === "rhNJnuHdLYrQzgA") {
    clone.opacity = 0.8; // authored value. Lower = sensors more visible, higher = darker crystal
  }
  clone.needsUpdate = true;

  console.log(
    `[preserve debug AFTER] ${deviceLabel} node=${nodeName} name=${clone.name} type=${clone.type} ` +
    `color=#${clone.color ? clone.color.getHexString() : "n/a"} opacity=${clone.opacity} transparent=${clone.transparent}`
  );

  return clone;
}
// Buckets whose native material (clearcoat/emissive/etc. as authored) should
// be left completely untouched for this device — no clone, no reset, no
// forced LENS_FINISH/FLASH_FINISH color. Checked in BOTH traversal paths:
// bucketByNode devices (see the early-return check in the node-bucketed
// branch) and plain material-name-bucketed devices (see the guard inside
// the mats.forEach loop below). Add a device here with any of
// "lens" / "flash" / "flashBorder" to stop this pipeline from touching
// that material at all.
const PRESERVE_NATIVE_BUCKETS = {
  "iPhone 17 Pro Max": ["lens", "flash", "flashBorder"],
  "iPhone 17 Pro": ["lens", "flash", "flashBorder"],
  "iPhone 17": ["lens", "flash", "flashBorder"],
  "iPhone 16 Pro": ["lens", "flash", "flashBorder"],
  "iPhone 15 Pro Max": ["lens", "flash", "flashBorder"],
  "iPhone 15 Pro": ["lens", "flash"],
};
const MATERIAL_NAME_OVERRIDE = {
  "Pro Display XDR": {
    frame: ["nssRtVtXVzpjuEl", "WMVfKEaOnnOqrKt"],
  },
  // Confirmed via Babylon.js inspector against the real .glb: this
  // device's hashed node names don't reliably map to the right part
  // (some nodes guessed for "lens" actually carry the plain "Glass"
  // overlay material, not "Glass Lens"). Matching by these real,
  // human-readable material names wins over any node-name guess above,
  // regardless of which node(s) happen to carry them.
"iPhone 17 Pro Max": {
  lens: ["Glass Lens"],
  flash: ["LED", "Plastic Flash"],
  flashBorder: ["Plastic Flash Tint"],
},
};

// Materials whose holes are cut by the base-color texture's alpha. Node-bucketing forces every
// material opaque, so these get a hard alpha cutoff (and keep their texture) instead of blending.
const ALPHA_CUTOUT_MATERIALS = ["WMVfKEaOnnOqrKt"];

function getMaterialOverrideBucket(deviceLabel, matNames) {
  const overrides = MATERIAL_NAME_OVERRIDE[deviceLabel];
  if (!overrides) return null;
  for (const [bucket, names] of Object.entries(overrides)) {
    if (matNames.some((n) => matchesAnyLoosely(names, n))) return bucket;
  }
  return null;
}

// Same fix, same reason, for the back glass — confirmed material name is
// bJOIXYmaJBYmLic.002. BODY_GLASS_FINISH["iPhone 15 Pro"] is already set to a
// fully matte finish (roughness 0.85, envMapIntensity 0); it just wasn't
// reaching this material because "Object_137" wasn't actually matching it.
const BODY_MATERIAL_OVERRIDE = {
  "iPhone 15 Pro": ["bJOIXYmaJBYmLic.002"],
};

// TEMP DEBUG — bright magenta so it's unmistakable which mesh this
// bucket actually controls. Revert to the real finish once confirmed.
const LENS_FINISH = { color: "#050507", roughness: 0.04, metalness: 0.15, envMapIntensity: 1.6 };
// True-tone LED flash: warm off-white, satin — and its thin surrounding
// ring, closer to gunmetal than pure black.
const FLASH_FINISH = { color: "#F8F1DE", roughness: 0.35, metalness: 0.0, envMapIntensity: 0.4 };
// Thin metallic bezel ring around the flash — brushed silver, not black,
// matching the real device's flash housing.
const FLASH_BORDER_FINISH = { color: "#EDEDEB", roughness: 0.22, metalness: 0.65, envMapIntensity: 1.3 };

const SCREEN_REFLECTION_SHINY = {
  roughnessRange: [0.25, 0.02],
  envMapIntensity: 1.4, // fixed — slider only controls blur/sharpness now
};
const SCREEN_REFLECTION_MATTE = {
  roughnessRange: [0.6, 0.25],
  envMapIntensity: 0.6, // fixed — slider only controls blur/sharpness now
};

const SCULPT_LIGHT_MAX_INTENSITY = 4; // intensity at lightingIntensityPct = 100
const SCULPT_LIGHT_RADIUS = 5; // world units the light swings across on each axis
const SCULPT_LIGHT_Z = 3;

// distance <-> zoom (0-100) mapping, shared by wheel + slider so they agree
const ZOOM_MIN_DIST = 5;
const ZOOM_MAX_DIST = 22;
const distFromZoom = (zoomVal) => ZOOM_MAX_DIST - (zoomVal / 100) * (ZOOM_MAX_DIST - ZOOM_MIN_DIST);
const zoomFromDist = (dist) =>
  Math.round(((ZOOM_MAX_DIST - dist) / (ZOOM_MAX_DIST - ZOOM_MIN_DIST)) * 100);

// Numeric cubic-bezier easing, equivalent to CSS's cubic-bezier(x1, y1, x2, y2).
function makeCubicBezierEasing(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  const solveT = (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) return t;
      const d = sampleDerivX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    return t;
  };
  return (t) => sampleY(solveT(t));
}

const easeInOutSoft = makeCubicBezierEasing(0.65, 0, 0.35, 1);

// iPhone Air: the export bakes a flat island pill into the 17Air_Black mesh, ~11pt lower
// than the real device. Its triangles are deleted at load so ISLAND_MESH can draw the
// island at the correct position instead. Box is in the mesh's own model space (meters).
const ISLAND_STRIP = {
  "iPhone Air": {
    material: "17Air_Black",
    box: { x0: -0.011, x1: 0.0102, y0: 0.1428, y1: 0.1496, z1: -0.0027 },
  },
};

// iPhone Air: the camera plateau's top face + ramps live in the same mesh as the back
// glass (17Air_color1), so they inherit its etched matte finish. Triangles above zMin
// (meters) are split into their own mesh and bucketed as cameraPlateau.
const PLATEAU_SPLIT = {
  "iPhone Air": { material: "17Air_color1", zMin: 0.00282 },
};

// Nodes that need to be pulled out into their own material clone by NODE
// NAME alone, for devices using the generic/default (non-node-bucketed)
// MATERIAL_NAME_MAP — e.g. this device's charging-port interior
// (Object_80), which otherwise shares "black.002" with unrelated trim.
const PORT_NODE_OVERRIDE = {
  "iPhone 16 Pro Max": ["Object_80"],
  "iPhone 17 Pro Max": ["USB_C_port"],
};

// Real USB-C port cavity: dark gunmetal, faintly metallic, not flat matte
// black like the surrounding trim.
const PORT_FINISH = { color: "#1C1C1E", roughness: 0.5, metalness: 0.4, envMapIntensity: 0.3 };

// floating island of geometry inside 16_Body_4_black — not welded to the
// surrounding frame mesh, so it has no material of its own and just
// inherits the frame's tint. Split it out so it can get its own fixed,
// body-color-independent finish. Box is in the mesh's own model space
// (meters), with a little padding around the measured island; if the
// console log below shows 0 triangles extracted, or it grabs neighboring
// frame geometry, widen/narrow these bounds.
const CAMERA_CONTROL_BUTTON_SPLIT = {
};

// Corner "antenna line" tabs — the small plastic/color-break tabs where the
// metal frame is interrupted — also live in 16_Body_4_black, as four small
// symmetric islands near the left/right edges, close to the top and bottom
// corners. Identified by shape/position (thin, near an edge, near a corner)
// rather than four hand-typed boxes, since splitMeshByBox already showed how
// easy it is to mistype one and silently miss geometry.
const ANTENNA_ISLAND_SPLIT = {
};

// The slope-scaled part of polygonOffset blows up at grazing angles, which pulls the
// edge-on screen face in front of the frame's side wall. 0 = constant offset only.
const SCREEN_POLYGON_OFFSET_FACTOR = {
  "iPhone 17 Pro Max": 0,
  "iPhone 17 Pro": 0,
  "iPhone Air": 0,
  // Applied proactively — if this screen has a real pill+camera cutout (see
  // NEEDS_ISLAND_MESH note above), it likely has the same septum-between-
  // holes geometry that caused the divided-at-an-angle bug on the other
  // two devices, so this heads it off before it's ever seen.
  "iPhone 16 Pro": 0,
  // Applied proactively — this export's front-glass mesh (Object_15) sits
  // exactly coplanar with the screen mesh (same z as the screen at rest),
  // which is the same grazing-angle z-fight risk that needed factor:0 on
  // 16 Pro/16 Plus above.
  "iPhone 14 Pro Max": 0,
  // Applied proactively, same reasoning as 14 Pro Max — this export's
  // front glass node (KPBCMtdjeQNpxSd) sits nearly coplanar with the
  // screen mesh, same grazing-angle z-fight risk.
  "iPhone 14 Pro": 0,
  // Applied proactively — front glass node (GYdgFDAJCdUNqoz) sits nearly
  // coplanar with the screen mesh, same family as 14 Pro/14 Pro Max.
  "iPhone 14 Plus": 0,
  // Same family — front glass sits nearly coplanar with the screen mesh.
  "iPhone 14": 0,
  'MacBook Pro 14"': 0,
  'MacBook Pro 16"': 0,
  'MacBook Air': 0,
  "Pro Display XDR": 0,
  "iPad Air": 0,
  "iPad mini": 0,
  // Screen and bezel meshes are exactly coplanar in this export (both at
  // model-space z≈0.042) — same grazing-angle z-fight risk as the other
  // coplanar-screen devices above.
  "iPad Pro 12.9-inch": 0,
  // Screen ("screen") sits only ~0.02 model units from the bezel's
  // ("screen_ftame") nearest edge — same grazing-angle z-fight risk as
  // every other tablet above.
  "iPad Pro 11-inch": 0,
  // Screen sits coplanar with the sapphire glass slab (Object_61)
  "Apple Watch Ultra": 0,
    // Black backing/bezel meshes sit just under the display.
  "Apple Watch Series 9": 0,
    "Apple Watch Series 7": 0,
};
// The Air's screen mesh sits BEHIND its stepped black bezel (it's oversized on purpose
// so the bezel frames it), so it must not get a depth bias that pulls it in front.
const SCREEN_POLYGON_OFFSET_UNITS = {
  "iPhone Air": 0,
  "iPad Air": 0,
  "Apple Watch Series 9": -8,
  "Apple Watch Series 7": -8,
};

// Deletes triangles inside a cylinder (world space) around `axis` through `center`, but only
// on the back side (depth along axis < maxH). Used to open a hole in an occluding black cap.
const BACK_CAP_STRIP = {
  "Apple Watch Ultra": {
    node: "Object_11",                  // black cap; also holds the engraved lettering, which sits outside the radius and is untouched
    refNode: "Object_74",               // LED lens set, centered on the cluster
    axis: [0, 0.5732, 0.8194],          // face normal as authored (tilted back 34.97 deg)
    radius: 18.8e-3,                    // just past the 12.6 mm vertex ring, so the cut follows a mesh edge instead of slicing slivers
    maxH: 1.6e-3,                       // the dome rises to about 1.3 mm at the edge; the inner black backing at 2.0 mm+ is left alone
  },
  "Apple Watch Series 9": {
    node: "hUTWIfJTbVAiNOd",          // black sheet covering the sensor cluster
    refNode: "ODfBWgnKaGvPXPT",        // back crystal, used to find the cluster center
    axis: [0, 0.5744, 0.8186],         // face normal of the export as authored (tilted back 35.06 deg)
    radius: 9.0e-3,                    // meters. Raise to open more, lower to keep more of the cap
    maxH: -1.0e-3,                     // meters behind the crystal center plane
  },
};

function stripMeshCylinder(mesh, center, axis, radius, maxH) {
  const geo = mesh.geometry.clone(); // don't mutate geometry another mesh might share
  const pos = geo.attributes.position;
  const idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  mesh.updateWorldMatrix(true, false);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const rel = new THREE.Vector3(), radial = new THREE.Vector3();
  const kept = [];
  for (let i = 0; i < idx.length; i += 3) {
    a.fromBufferAttribute(pos, idx[i]).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(pos, idx[i + 1]).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(pos, idx[i + 2]).applyMatrix4(mesh.matrixWorld);
    let inside = true;
    for (const p of [a, b, c]) {
      rel.copy(p).sub(center);
      const h = rel.dot(axis);
      radial.copy(rel).addScaledVector(axis, -h);
      if (!(radial.length() < radius && h < maxH)) { inside = false; break; }
    }
    if (inside) continue;
    kept.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  console.log(`[cap strip] ${mesh.name}: removed ${(idx.length - kept.length) / 3} of ${idx.length / 3} triangles`);
  geo.setIndex(kept);
  mesh.geometry = geo;
}

function stripBakedIsland(mesh, { x0, x1, y0, y1, z1 }) {
  const geo = mesh.geometry.clone(); // don't mutate geometry another mesh might share
  const pos = geo.attributes.position;
  const idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const inBox = (i) => {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1 && z <= z1;
  };
  const kept = [];
  for (let i = 0; i < idx.length; i += 3) {
    if (inBox(idx[i]) && inBox(idx[i + 1]) && inBox(idx[i + 2])) continue;
    kept.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  console.log(`[island strip] removed ${(idx.length - kept.length) / 3} of ${idx.length / 3} triangles`);
  geo.setIndex(kept);
  mesh.geometry = geo;
}

// Splits triangles whose centroid is at or above zMin into a sibling mesh with its own
// cloned material, so it can be finished independently. Returns the new mesh (or null).
function splitMeshByZ(mesh, zMin) {
  const src = mesh.geometry;
  const pos = src.attributes.position;
  const idx = src.index ? Array.from(src.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const lower = [];
  const upper = [];
  for (let i = 0; i < idx.length; i += 3) {
    const cz = (pos.getZ(idx[i]) + pos.getZ(idx[i + 1]) + pos.getZ(idx[i + 2])) / 3;
    (cz >= zMin ? upper : lower).push(idx[i], idx[i + 1], idx[i + 2]);
  }
  if (!upper.length) return null;
  console.log(`[plateau split] ${upper.length / 3} plateau triangles, ${lower.length / 3} left on back glass`);

  const lowerGeo = src.clone();
  lowerGeo.setIndex(lower);
  mesh.geometry = lowerGeo;

  const upperGeo = src.clone();
  upperGeo.setIndex(upper);
  const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const part = new THREE.Mesh(upperGeo, srcMat.clone());
  part.name = `${mesh.name}_plateau`;
  part.layers.mask = mesh.layers.mask;
  mesh.parent.add(part);
  return part;
}

// Same idea as splitMeshByZ (pull matching triangles into a new sibling
// mesh with its own cloned material) but testing a full 3D box instead of
// a single z threshold — for geometry that isn't cleanly separable along
// one axis, like a floating button island.
function splitMeshByBox(mesh, box) {
  const src = mesh.geometry;
  const pos = src.attributes.position;
  const idx = src.index ? Array.from(src.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const inBox = (i) => {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    return x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1 && z >= box.z0 && z <= box.z1;
  };
  const kept = [];
  const extracted = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (inBox(a) && inBox(b) && inBox(c)) extracted.push(a, b, c);
    else kept.push(a, b, c);
  }
  if (!extracted.length) return null;
  console.log(`[box split] ${extracted.length / 3} triangles extracted, ${kept.length / 3} left on source mesh`);

  const keptGeo = src.clone();
  keptGeo.setIndex(kept);
  mesh.geometry = keptGeo;

  const partGeo = src.clone();
  partGeo.setIndex(extracted);
  const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const part = new THREE.Mesh(partGeo, srcMat.clone());
  part.name = `${mesh.name}_split`;
  part.layers.mask = mesh.layers.mask;
  mesh.parent.add(part);
  return part;
}

// Like splitMeshByBox, but instead of one hand-typed region, computes the
// mesh's actual connected components (by shared vertex index) and extracts
// every component whose bounding box passes matchFn — all merged into one
// sibling mesh. More robust than a typed box for parts made of several
// small, same-shaped islands (e.g. four symmetric antenna tabs): it can't
// clip one short since it follows the model's own real geometry, not typed
// coordinates.
function splitMeshByIslands(mesh, matchFn) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);

  const parent = new Int32Array(pos.count);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (x, y) => {
    const rx = find(x), ry = find(y);
    if (rx !== ry) parent[rx] = ry;
  };
  for (let t = 0; t < idx.length; t += 3) {
    union(idx[t], idx[t + 1]);
    union(idx[t + 1], idx[t + 2]);
  }

  const compBox = new Map();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const root = find(i);
    if (!compBox.has(root)) compBox.set(root, new THREE.Box3());
    compBox.get(root).expandByPoint(v.fromBufferAttribute(pos, i));
  }

  const matchRoots = new Set();
  compBox.forEach((box, root) => {
    if (matchFn(box)) matchRoots.add(root);
  });

  const kept = [];
  const extracted = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (matchRoots.has(find(a))) extracted.push(a, b, c);
    else kept.push(a, b, c);
  }
  if (!extracted.length) return null;
  console.log(`[island split] matched ${matchRoots.size} component(s), ${extracted.length / 3} of ${idx.length / 3} triangles`);

  const keptGeo = geo.clone();
  keptGeo.setIndex(kept);
  mesh.geometry = keptGeo;

  const partGeo = geo.clone();
  partGeo.setIndex(extracted);
  const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const part = new THREE.Mesh(partGeo, srcMat.clone());
  part.name = `${mesh.name}_islands`;
  part.layers.mask = mesh.layers.mask;
  mesh.parent.add(part);
  return part;
}

// Baked single-atlas exports: the whole device is one textured mesh. The front glass
// (display + bezel) is a flat, disconnected island — peeled out at load so it can carry
// the screen texture. New mesh is named "<node>_islands".
const SCREEN_FACE_SPLIT = {
  "iPad Air": {
    node: "Cube_1",
    matchFn: (box) => {
      const s = box.getSize(new THREE.Vector3());
      return s.x > 0.15 && s.z > 0.2 && s.y < 1e-4; // ~0.177 x 0.246 m, ~0 thick
    },
  },
};

// Devices whose atlas texture is KEPT (logo, lens, bezel, buttons all baked in). Value is the
// atlas's own body color; mat.color is divided by it so the picked finish lands as-picked.
const BAKED_BODY_COLOR = {
  "iPad Air": "DAD7F5", // sampled from the back panel of the purple atlas
};
const bakedTint = (c, deviceLabel) => {
  const base = BAKED_BODY_COLOR[deviceLabel];
  if (!base) return c;
  const b = new THREE.Color(`#${base}`);
  return new THREE.Color(c.r / b.r, c.g / b.g, c.b / b.b);
};

// Node-bucketed exports where one mesh bundles the frame AND the back glass.
// Triangles whose centroid is below zMax (model space, before scaling) are
// peeled into their own mesh and bucketed as body.
const BACK_GLASS_SPLIT = {
};

function splitMeshBelowZ(mesh, zMax) {
  const src = mesh.geometry;
  const pos = src.attributes.position;
  const idx = src.index ? Array.from(src.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const kept = [];
  const extracted = [];
  for (let i = 0; i < idx.length; i += 3) {
    const cz = (pos.getZ(idx[i]) + pos.getZ(idx[i + 1]) + pos.getZ(idx[i + 2])) / 3;
    (cz < zMax ? extracted : kept).push(idx[i], idx[i + 1], idx[i + 2]);
  }
  if (!extracted.length) return null;
  console.log(`[back glass split] ${extracted.length / 3} back-glass triangles, ${kept.length / 3} left on frame`);

  const keptGeo = src.clone();
  keptGeo.setIndex(kept);
  mesh.geometry = keptGeo;

  const partGeo = src.clone();
  partGeo.setIndex(extracted);
  const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const part = new THREE.Mesh(partGeo, srcMat.clone());
  part.name = `${mesh.name}_backglass`;
  part.layers.mask = mesh.layers.mask;
  mesh.parent.add(part);
  return part;
}

// "MacBook Pro" wordmark removal. The lettering is cut into the bottom plate as holes and
// filled by separate meshes, so hiding those meshes alone leaves see-through letter shapes.
// They're hidden via `hide` in MATERIAL_NAME_MAP; this covers the footprint with a flat patch
// that shares the plate's own material (so it tints/finishes exactly like the plate).
const WORDMARK_PATCH = {
  'MacBook Pro 14"': { plate: "Object_59", text: ["Object_55", "Object_57"] },
  'MacBook Pro 16"': { plate: "Object_42", text: ["Object_54", "Object_82"] },
};
// World units the patch sits behind the plate's outer face. Small enough to hide the 16" plate's
// thin engraved walls, big enough to beat depth-buffer precision. Lower it if you still see a faint
// letter outline at grazing angles; raise it (up to ~0.001) if the patch shimmers.
const WORDMARK_PATCH_INSET = 0.0004;

// Slides the screen + its bezel toward the front of the device (world units,
// 5 = full phone height). Positive = up/out, negative = sink deeper.
const SCREEN_RAISE = {
  "iPhone 17 Pro Max": { nodes: ["Cube006", "Cube006_1"], amount: 0.0285 },
};

function raiseScreenAssembly(model, deviceLabel) {
  const cfg = SCREEN_RAISE[deviceLabel];
  if (!cfg) return;
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!o.isMesh || !cfg.nodes.includes(o.name)) return;
    // front of every device is +Z in the group's space at load time
    const p0 = o.parent.worldToLocal(new THREE.Vector3(0, 0, 0));
    const p1 = o.parent.worldToLocal(new THREE.Vector3(0, 0, cfg.amount));
    o.position.add(p1.sub(p0));
  });
}

// Assumes the model root has uniform scale and no rotation (true for both MacBook Pros).
function patchWordmark(model, deviceLabel) {
  const cfg = WORDMARK_PATCH[deviceLabel];
  if (!cfg) return;
  model.updateMatrixWorld(true);

  const plate = model.getObjectByName(cfg.plate);
  if (!plate?.isMesh) {
    console.warn(`[${deviceLabel}] wordmark patch: plate node "${cfg.plate}" not found`);
    return;
  }

  // Footprint of the (hidden) lettering meshes. Box3 ignores .visible, so hidden nodes still count.
  const box = new THREE.Box3();
  cfg.text.forEach((n) => {
    const o = model.getObjectByName(n);
    if (o) box.expandByObject(o);
  });
  if (box.isEmpty()) return;

  // Outer (lowest-y) face of the plate under that footprint is the surface the patch must match.
  const pos = plate.geometry.attributes.position;
  const v = new THREE.Vector3();
  let surfaceY = Infinity;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(plate.matrixWorld);
    if (v.x >= box.min.x && v.x <= box.max.x && v.z >= box.min.z && v.z <= box.max.z) {
      if (v.y < surfaceY) surfaceY = v.y;
    }
  }
  if (!Number.isFinite(surfaceY)) {
    console.warn(`[${deviceLabel}] wordmark patch: no plate vertices under the lettering`);
    return;
  }

  const size = box.getSize(new THREE.Vector3());
  const s = model.scale.x;
  const geo = new THREE.PlaneGeometry((size.x * 1.05) / s, (size.z * 1.05) / s);
  geo.rotateX(Math.PI / 2); // face -Y (the underside)

  const patch = new THREE.Mesh(geo, plate.material); // shared material: tint/finish stay in sync
  patch.name = "WordmarkPatch";
  patch.position.copy(
    model.worldToLocal(
      new THREE.Vector3((box.min.x + box.max.x) / 2, surfaceY + WORDMARK_PATCH_INSET, (box.min.z + box.max.z) / 2)
    )
  );
  patch.layers.enable(1);
  model.add(patch);
}

function roundedRectPath(ctx, x, y, w, h, rx, ry = rx) {
  ctx.beginPath();
  ctx.moveTo(x + rx, y);
  ctx.lineTo(x + w - rx, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + ry);
  ctx.lineTo(x + w, y + h - ry);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
  ctx.lineTo(x + rx, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - ry);
  ctx.lineTo(x, y + ry);
  ctx.quadraticCurveTo(x, y, x + rx, y);
  ctx.closePath();
}

// Maps each environment option to its HDRI file. Add more .hdr files here
// as you source them (e.g. from polyhaven.com — 1k/2k res is plenty since
// these are only used for reflections, never shown directly).
const ENVIRONMENT_HDRI_PATHS = {
  none: "/hdri/neutral.exr",
  studio: "/hdri/studio.exr",
  city: "/hdri/city.exr",
  forest: "/hdri/forest.exr",
  clouds: "/hdri/clouds.exr",
};

// Exports whose GLTF_SceneRootNode legitimately has many children (not stray duplicates).
const KEEP_ALL_ROOT_CHILDREN = { "Apple Watch Series 7": true };

// Devices scaled to a target width (world units) instead of the phone-style height of 5.
const MODEL_FIT_WIDTH = {
  'MacBook Pro 14"': 6,
  'MacBook Pro 16"': 6,
  'MacBook Air': 6,
  "Pro Display XDR": 6,
  // Fit by case width (44mm), since the strap makes the full height ~76mm
  "Apple Watch Ultra": 3.2,
    // Whole model incl. crown is 39.8mm wide; the strap makes it ~71mm tall,
  // so 2.9 keeps the strap inside the default framing. Tune to taste.
  "Apple Watch Series 9": 2.9,
  // Case + crown is 39.2mm wide; strap makes it ~70mm tall.
  "Apple Watch Series 7": 2.9,
};

// Rotate/orbit around this node instead of the whole-model bounds
// (the strap loops behind the case and would pull the pivot backwards).
const MODEL_PIVOT_NODE = {
  "Apple Watch Ultra": "Object_25",
  "Apple Watch Series 9": "dLXgKtwhhIArttB",
  "Apple Watch Series 7": "Object_7",
};

const MODEL_PATHS = {
  "iPhone 17 Pro Max": "/models/iphone_17_pro_max.glb",
  "iPhone 17": "/models/iphone_17.glb",
  "iPhone 17 Pro": "/models/iphone_17_pro.glb",
  "iPhone Air": "/models/iphone_air.glb",
  "iPhone 16 Pro": "/models/iphone_16_pro.glb",
  "iPhone 15 Pro Max": "/models/iphone_15_pro_max.glb",
  "iPhone 15 Pro": "/models/iphone_15_pro.glb",
  "iPhone 14 Pro Max": "/models/iphone_14_pro_max.glb",
  "iPhone 14 Pro": "/models/iphone_14_pro.glb",
  "iPhone 14 Plus": "/models/iphone_14_plus.glb",
  "iPhone 14": "/models/iphone_14.glb",
  'MacBook Pro 14"': "/models/macbook_pro_14-inch.glb",
  'MacBook Pro 16"': "/models/macbook_pro_16-inch.glb",
  "MacBook Air": "/models/macbook_air.glb",
  "Pro Display XDR": "/models/pro_display_xdr.glb",
  "iPad Air": "/models/ipad_air.glb",
  "iPad mini": "/models/ipad_mini.glb",
  "iPad Pro 12.9-inch": "/models/ipad_pro_12.9-inch.glb",
  "iPad Pro 11-inch": "/models/ipad_pro_11-inch.glb",
  "Apple Watch Ultra": "/models/iwatch_ultra.glb",
  "Apple Watch Series 9": "/models/iwatch_series_9.glb",
  "Apple Watch Series 7": "/models/iwatch_series_7.glb",
  default: "/models/iphone_16_pro_max.glb",
};
// Some source .glb files ship with duplicate/leftover geometry baked into
// the scene graph (e.g. a mirrored copy left over from a Blender export
// step). Keyed by device label; each entry is a list of root node names
// (as authored in the glTF) to strip out entirely before the model is
// used, so they never get measured for bounding-box scale/centering or
// bucketed into materials.
const DUPLICATE_NODE_NAMES = {
  "iPhone 17": ['Apple iPhone 17 6.3".001_37'],
};

// Corrects for .glb files exported with a different native orientation, so every
// model faces the same way at the same camera/rotation values. Degrees [x, y, z].
const MODEL_ROTATION_OFFSET_DEG = {
  default: [0, 90, 0], // 16 Pro Max model (and every device that falls back to it)
  "iPhone 17 Pro Max": [0, 0, 0],
  "iPhone 17": [0, 0, 0],
  "iPhone 17 Pro": [0, 0, 0],
  "iPhone Air": [0, 180, 0],
  // Verified from the file: screen mesh (Object_61) sits at z≈+0.0041,
  // matching the front-facing +Z / +Y-up convention used by 16/16 Plus.
  "iPhone 16 Pro": [0, 0, 0],
  "iPhone 15 Pro Max": [0, 180, 0],
  // Was [0, 180, 0] — that showed the phone edge-on (screen as a thin
  // side strip, buttons reading as "floating" off the side profile).
  // Rotated 90° from 15 Pro Max's correct value. Try 90 first; if it's
  // now facing the wrong direction (backwards) or still edge-on, step
  // through -90 or 270 next.
  "iPhone 15 Pro": [0, 180, 0],
  // Sketchfab-style hashed export ("Sketchfab_model" root, hashed material
  // names) — same starting guess as 16 Pro/16/15 Pro Max/15 Pro. Unverified
  // against a render; adjust by 90/180 steps if the device faces the wrong
  // way once loaded.
  "iPhone 14 Pro Max": [0, 180, 0],
  // Same hashed/node-bucketed export family as 14 Pro Max (identical
  // naming convention, near-identical node layout) — starting from the
  // same guess. Unverified against a render; step by 90/180 if it loads
  // facing the wrong way.
  "iPhone 14 Pro": [0, 180, 0],
  // Same hashed export family, same measured orientation (screen at
  // negative Z, +Y up) as 14 Pro — starting from the same guess.
  // Unverified against a render.
  "iPhone 14 Plus": [0, 180, 0],
  "iPhone 14": [0, 180, 0],
  'MacBook Pro 14"': [0, 0, 0],
  'MacBook Pro 16"': [0, 0, 0],
  "MacBook Air": [0, 0, 0],
  "Pro Display XDR": [0, 0, 0],
  // Model is natively portrait, front faces -Z, +Y up → just turn it around.
  "iPad Air": [0, 180, 0],
  // Same native orientation as the iPad Air: portrait, front faces -Z, +Y up.
  "iPad mini": [0, 180, 0],
  // Verified from the file: screen mesh (z≈0.04) sits in front of the body
  // (z≈-0.8) and the camera bump sticks out further back (z≈-2) — front
  // already faces +Z, +Y already up. No rotation needed.
  "iPad Pro 12.9-inch": [0, 0, 0],
  // Verified from the file: screen ("screen", z≈-2.89) sits at the very
  // front, while the camera cluster sticks out to z≈+4.9 on the back —
  // same native orientation as the iPad Air/mini (front faces -Z, +Y up),
  // not the 12.9-inch's.
  "iPad Pro 11-inch": [0, 180, 0],
  // Export is posed with the face tilted back 34.97° about X. This levels it so the face points +Z, +Y up.
  "Apple Watch Ultra": [35, 0, 0],
    // Export is tilted back 35.06° about X, same as the Ultra.
  "Apple Watch Series 9": [35, 0, 0],
  // Export is tilted back 29.76° about X. This levels it so the face points +Z, +Y up.
  "Apple Watch Series 7": [29.76, 0, 0],
};
const normalizeMatName = (name) => (name || "").trim().toLowerCase();
const matchesAny = (list, name) => {
  const n = normalizeMatName(name);
  return list.some((entry) => normalizeMatName(entry) === n);
};
// Blender-style duplicate suffixes (".001", ".002", ...) can differ between
// export passes of "the same" material. Used only for the hand-identified
// FRAME_MATERIAL_OVERRIDE / BODY_MATERIAL_OVERRIDE lists, where the base
// hashed name is what was actually confirmed in a GLB viewer — a suffix
// drift shouldn't make that confirmed match silently fail.
const stripDupeSuffix = (name) => normalizeMatName(name).replace(/\.\d+$/, "");
const matchesAnyLoosely = (list, name) => {
  const n = stripDupeSuffix(name);
  return list.some((entry) => stripDupeSuffix(entry) === n);
};

// This export gives every mesh-bearing node a non-mesh wrapper with the
// identical name directly above it (an artifact of the USD->glTF export).
// three.js's GLTFLoader keeps object names unique, so it appends "_1" to
// every one of these leaf mesh nodes — MATERIAL_NAME_MAP is written against
// the file's real names, so that suffix has to come off before matching.
const NODE_NAME_DEDUP_SUFFIX = {
  // 2026) with a plain-named file (Object_4/Object_6/Object_7) that doesn't
  // have this quirk, so its entry was removed. Add new entries here only if
  // a future export shows the same wrapper-parent-shares-child-name pattern.
};

function normalizeNodeName(rawName, deviceLabel) {
  if (!NODE_NAME_DEDUP_SUFFIX[deviceLabel]) return rawName;
  return rawName.replace(/_1$/, "");
}

const MATERIAL_NAME_MAP = {
default: {
    frame: ["metalframe.002", "metaL.001"],
    body: ["basecolor.001"],
    logo: ["apple_logo.001"],
    antenna: [],
    trim: ["black.002"],
    lens: [],
    flash: [],
    flashBorder: [],
    cameraPlateau: [],
    screen: "screen.001",
    skip: [],
  },
"iPhone 17 Pro Max": {
  bucketBy: "node",
  frame: [
    "Cube001",
    "Button_Action", "Button_Power_OnOff", "Button_Volume_Down", "Button_Volume_Up",
    "Cube008", "Cube008_1",
  ],
  port: ["Cube001_2"],
  body: ["Cube010"],
  logo: ["Cube010_1"],
  antenna: ["Cube001_1", "Screw"],
  trim: [
    "Cylinder004_1", "Cylinder004_2", "Cylinder004_4",
    "Cylinder022_1", "Cylinder022_2", "Cylinder022_4",
    "Cylinder026_1", "Cylinder026_2", "Cylinder026_4",
    "Cylinder025_1",
    "LIDAR", "USB_C_port", "Back_Mic_mesh", "Speaker_mesh",
    "Esfera",
    "Cube006", // reverted — hiding this exposed geometry it was meant to occlude; leave in trim as before
  ],
  flash: [],
  flashBorder: [],
  lens: [
    "Lens001", "Cylinder004_3",
    "Lens002", "Cylinder022_3",
    "Lens003", "Cylinder026_3",
    "Cylinder025",
  ],
  cameraPlateau: [],
  cameraRing: ["Cylinder004", "Cylinder022", "Cylinder026"],
  screen: "Cube006_1",
  hide: ["Cube006_2", "Cylinder025", "Cylinder025_1"], // Cube006 removed from hide
  skip: [],
},
  // Best-guess bucketing from material names/usage — Frame_Green* is the
  // colorable aluminum (frame rails, buttons, camera plateau), Glass_back
  // is the tintable rear glass. Dark/Camera_frame/USB*/Setka read as
  // fixed black trim (port, speaker grille, camera ring) rather than
  // anything that should pick up the selected body color. "material" is
  // an unhelpfully generic Blender default name we couldn't identify from
  // the mesh list alone — bucketed to trim as a safe guess. Verify both
  // against the live render and reassign if they look wrong (see debug
  // logging note below).
// This export only has 5 generic materials (Edge, Glass, Glass-Back,
  // Glass-Rough, Glass-Screen) shared across ~36 differently-named nodes,
  // so material name can't distinguish "frame" from "logo" from "button".
  // bucketBy: "node" tells the traversal below to clone each mesh's
  // material and bucket by the mesh/node's own name instead.
    "iPhone 17": {
    bucketBy: "node",
    frame: ["17-Body", "17-CameraButton", "17-Control", "17-power", "17-VolumeUp", "17-VolumeDown"],
    // Mesh014/Mesh014_1 are this export's (generically-named) rear glass
    // panel pieces — same role as "17-GlassClear"/"17-GlassRough" in other
    // exports, just without the "17-" prefix, so they were previously
    // falling through unmatched.
    body: ["17-Back", "Mesh014"],
    logo: ["17-Logo"],
    antenna: ["17-NetTop"],
     trim: [
      "17-Screen", "17-ScreenEdge", "17-Mic", "17-Screw1", "17-Screw2", "17-USB", "17-Matte",
      // Only the actual lens bezel rings are true flat black — the
      // Edge/Gray/Plastic housing around them is real-life
      // color-matched aluminum (see cameraPlateau below), confirmed
      // against reference photos of the physical device.
      "17-BackCamera1Black",
      "17-BackCamera2Black", "17-Back",
      "17-FrontCamgray",
      // "17-Island" is the front Dynamic Island cutout, not a rear
      // plateau — the rear camera bump is already fully covered by the
      // 17-BackCamera1*/17-BackCamera2* nodes above. It was previously
      // bucketed to cameraPlateau, which derives its color from the
      // selected body tint — that's why it visually matched the frame.
      // Dynamic Island should always be flat matte black like the rest
      // of the screen bezel/trim.
      "17-Island",
      "Mesh014_1",
    ],
    lens: [
      "17-BackCamera1lens", "17-BackCamera2Lens", "17-frontCamLens",
      "17-BackCamera1Glass", "17-BackCamera2Glass", "17-FrontCamGlass",
      // inner disc inside the black bezel ring, previously tinted to the body color
      "17-BackCamera1Gray", "17-BackCamera2Gray",
    ],
    flash: ["17-Flash"],
    flashBorder: [],
    // The plateau housing around each lens (edge ring + surrounding
    // shell) — reference photos of the real iPhone 17 show this as the
    // same color-matched aluminum as the back, just very slightly
    // darker/more matte, not a separate black block.
    cameraPlateau: [
      "17-GlassClear",
      "17-BackCamera1Plastic",
      "17-BackCamera2Plastic",
    ],
    // The thin ring directly around each lens is a distinct, brighter/
    // glossier highlight on the real device — not the same flat tone
    // as the plateau shell around it, so it gets its own bucket/finish.
    cameraRing: ["17-BackCamera1Edge", "17-BackCamera2Edge"],
    // The actually-emissive screen mesh is oddly named "ScreenEdge.001" in
    // this export — "17-Screen" is just the bezel around it (bucketed to
    // trim above).
     screen: "17-ScreenEdge001",
    skip: [],
  },
  "iPhone 17 Pro": {
    bucketBy: "node",
    // Object_4 = aluminum unibody (frame + camera plateau). 9/10 = camera control
    // button, 57 = bottom screws, 59 = speaker grille (color-matched on the real phone).
    frame: ["Object_4", "Object_9", "Object_10", "Object_57", "Object_59"],
    // Frosted back glass panel + its tint overlay
    body: ["Object_12", "Object_13"],
    logo: ["Object_14"],
    antenna: ["Object_5"],
    // Black bits: USB port, camera filter block, lens bezels (Frame/Camera_filter),
    // mirror filters, front cam filter, LIDAR, mic, screen bezel. Flash +
    // its dome (Object_8/47) also live here now — matches the 16 Pro Max,
    // which has no distinct flash finish and just renders it as flat
    // trim black.
    trim: [
      "Object_6", "Object_7",
      "Object_17", "Object_18", "Object_24",
      "Object_27", "Object_28", "Object_33",
      "Object_36", "Object_37", "Object_42",
      "Object_45", "Object_49", "Object_51", "Object_54",
    ],
    lens: [
      "Object_20", "Object_21", "Object_23",
      "Object_30", "Object_32",
      "Object_39", "Object_41",
      "Object_44",
    ],
    // Object_8 = flash, Object_47 = its translucent dome — shares
    // FLASH_FINISH with the Pro Max, since that constant isn't
    // device-specific.
    flash: ["Object_8", "Object_47"],
    flashBorder: [],
    cameraPlateau: [], // the plateau is part of the aluminum unibody (Object_4)
    cameraRing: ["Object_16", "Object_26", "Object_35"], // aluminum ring around each lens
    screen: "Object_55",
    hide: ["Object_53", "Object_44", "Object_45"], // Object_53 = dark glass over the display; 44/45 = front camera (replaced by ISLAND_MESH)
    skip: [],
  },
    // Sketchfab-style export: every node and material has a random hash
  // name, zero semantic labels. Buckets below are inferred from each
  // mesh's bounding box (position/size) and base material (glossy vs
  // flat black, colored vs neutral, emissive for the screen) — NOT
  // confirmed against a render. The loader logs
  // "[iPhone Air] node <name>: [...] -> <bucket>" for every mesh on
  // load; open the console, compare against reference photos, and
  // move entries between buckets below as needed.
    // Cleaner export than the previous iPhone Air model — materials map
  // 1:1 to meshes with real (if generic) names, so this uses standard
  // material-name bucketing, not bucketBy: "node". Roles below are
  // inferred from each mesh's bounding box (position/size/thickness),
  // not confirmed against a render — check the console's per-mesh
  // bucket log once loaded and reassign anything that looks wrong.
  "iPhone Air": {
    // color2 spans the device's full thickness edge-to-edge — reads as
    // the titanium frame/chassis rather than an inset back panel.
    frame: ["17Air_color2"],
    // color1 + color3 are inset, back-panel-shaped layers; Glass is a
    // semi-transparent clearcoat sitting over them (the "ceramic layer
    // coating" on the etched matte glass).
    body: ["17Air_color1", "17Air_color3"],
    logo: ["17Air_logo"],
    // Thin, colorless sliver at the bottom edge.
    antenna: ["17Air_11"],
    // Full-footprint flat-black base layer, plus one small unidentified
    // dot near the bottom edge (uncertain — verify against render).
    trim: ["17Air_Black", "17Air_12"],
    // Lone dark glossy element on one side of the top cluster — the
    // actual camera lens.
    lens: ["17Air_Lens"],
    // Tiny paired dot beside the lens cluster — flash LED + glint.
    flash: ["17Air_14"],
    // Slightly larger ring around that same cluster — flash housing.
    flashBorder: ["17Air_13"],
    // No distinct plateau/ring mesh in this export — the camera bump
    // may just be part of the frame/body surfaces above.
    cameraPlateau: [],
    cameraRing: [],
    screen: "17Air_Screen",
    // 17Air_Glass is a 30%-alpha black sheet over the whole front. Bucketed as body it
    // took the body color and tinted the screen behind it, so drop it entirely.
    skip: ["17Air_Glass", "17Air_Lens1"],
  },
    // Sketchfab-style export: every node and material has a random hash
  // name (same situation as the iPhone Air's original entry above), so
  // bucketBy: "node" is used and roles below are inferred purely from
  // each mesh's world-space bounding box (size/position) computed
  // offline — NOT confirmed against a render. Reload with this mapping,
  // compare the result to reference photos, and move entries between
  // buckets as needed; the per-node console log (already built into the
  // node-bucketed traversal) will show exactly what got bucketed where.
  // Full replacement export (confirmed Sept 2026): plain "Object_N" node
  // names, not hashed — 99 meshes / 32 materials, real-world scale in
  // meters. Screen (Object_61) confirmed via emissive:[1,1,1]. Everything
  // else below is bucketed from parsing the .glb directly — each node's
  // real measured world-space bounding box (position/size/depth) plus its
  // material's baseColor/metalness/roughness/alpha — NOT confirmed against
  // a render yet. Check the per-node console log against a rendered view
  // and reassign anything that looks wrong.
  "iPhone 16 Pro": {
    bucketBy: "node",
    // Object_127/133 = the outer unibody shell (full device footprint and
    // thickness, two overlapping material layers). Object_73 = a separate
    // rail-like piece with its own material. Object_85/98/124 = the side
    // buttons (mute/volume/power), which read as satin metal like the frame.
    // Confirmed via the per-node debug color legend against a render:
    // Object_88/90/93/96 are the volume-up, volume-down, silence/action,
    // and power buttons; Object_122 is a 5th side control; Object_131 is
    // the buttons' own chamfered edge/bevel detail. All physical buttons +
    // their bevel get the same satin-metal frame finish as the rail/shell.
    // Object_127 shares the exact same bounding box as Object_133 (the
    // real main shell) — that's the thin antenna-line trace running the
    // full perimeter, not a second copy of the shell, so it moved to
    // antenna instead.
    frame: [
      "Object_73", "Object_85", "Object_98", "Object_124", "Object_133",
      "Object_88", "Object_90", "Object_93", "Object_96", "Object_122", "Object_131",
    ],
    // Object_13/63 = the back glass panel (textured, inset within the frame).
    body: ["Object_13", "Object_63"],
    // Object_67 = the logo cutout (translucent, center-back). Object_222 =
    // a clear-coat overlay sitting directly on top of it at the same spot.
    logo: ["Object_67", "Object_222"],
    // Confirmed via the per-node debug color legend: the antenna-line
    // trace around the full perimeter.
    antenna: ["Object_127"],
    // USB-C port cluster, bottom edge center.
    port: ["Object_25", "Object_33"],
    // Screen bezel ring, internal light-blocking backing layers, small
    // screws/mic holes, bottom-edge grille details, and the MagSafe ring
    // overlay (Object_118) — all flat black or fixed-tone trim.
    trim: [
      "Object_8", "Object_11", "Object_15", "Object_17", "Object_22",
      "Object_27", "Object_29", "Object_31", "Object_35", "Object_37",
      "Object_65", "Object_69", "Object_71", "Object_75", "Object_77",
      "Object_81", "Object_101", "Object_103", "Object_105", "Object_107",
      "Object_110", "Object_112", "Object_114", "Object_118", "Object_129",
      "Object_149", "Object_159", "Object_178", "Object_188", "Object_204",
      "Object_216", "Object_225",
    ],
    // Glass/mirror-finish elements across all three rear lenses (glossy,
    // translucent or near-mirror materials).
    lens: [
      "Object_137", "Object_151", "Object_153", "Object_157",
      "Object_166", "Object_172", "Object_180", "Object_182", "Object_186",
      "Object_198", "Object_208", "Object_210", "Object_214",
    ],
    // Metal rings around each of the three rear lenses, plus the small
    // top cluster's ring (Object_116).
    cameraRing: [
      "Object_116", "Object_139", "Object_143", "Object_155", "Object_168",
      "Object_170", "Object_174", "Object_184", "Object_200", "Object_212",
      "Object_218",
    ],
    // Object_19 = the shared base plate under all three rear lenses.
    // The rest are each lens's own raised housing wall.
    cameraPlateau: [
      "Object_19", "Object_141", "Object_145", "Object_147", "Object_162",
      "Object_164", "Object_176", "Object_196", "Object_202", "Object_206",
    ],
    // Small top cluster (separate from the 3 main lenses) — True Tone
    // flash + its translucent cover.
    flash: ["Object_191", "Object_193"],
    flashBorder: ["Object_220"],
    screen: "Object_61",
    // Front-camera/sensor cluster near the top of the screen is far
    // smaller than the real Dynamic Island (~4mm vs. the real 6mm pill) —
    // same "too small to be the real pill" situation as 14 Pro/14 Pro Max,
    // replaced by the synthetic Dynamic Island mesh (see NEEDS_ISLAND_MESH).
    hide: [
      "Object_40", "Object_42", "Object_44", "Object_46", "Object_48",
      "Object_50", "Object_52", "Object_54", "Object_56", "Object_58",
      "Object_79",
    ],
    skip: [],
  },

  "iPhone 15 Pro Max": {
    bucketBy: "node",
    // Unibody chassis + back metal plate + edge rail segments (the rail
    // is broken into several pieces by the antenna-line cuts).
    frame: [
      "Object_73", "Object_112",
      "Object_20", "Object_22",
      "Object_71", "Object_47", "Object_53", "Object_51", "Object_62",
    ],
    // Back glass base + two thin glass overlay layers. Object_110 moved in
    // from frame — confirmed via GLB viewer as material oZRkkORNzkufnGD,
    // the actual back-glass panel, not part of the metal unibody.
    body: ["Object_11", "Object_83", "Object_120", "Object_49", "Object_110"],
    // Object_107 — confirmed via GLB viewer as material dwrMminMXjXXeek.
    logo: ["Object_107"],
    // Thin painted inserts at the antenna-line breaks in the frame rail.
    antenna: [
      "Object_18", "Object_67", "Object_69",
      "Object_55", "Object_57", "Object_59", "Object_64", "Object_37",
    ],
    // Flat black/neutral trim: screen bezel ring, top mic/sensor grille,
    // bottom port/speaker cluster, Dynamic Island pill + its housing bits.
    trim: [
      "Object_87",
      "Object_44", "Object_14", "Object_16", "Object_24",
      "Object_35", "Object_31", "Object_41", "Object_27", "Object_29",
      "Object_39", "Object_33",
      "Object_90", "Object_101", "Object_199",
      "Object_85", "Object_76",
    ],
    // Every lens/glass element across the rear triple-camera cluster,
    // the front Dynamic Island camera, and the LiDAR window.
    lens: [
      "Object_163", "Object_184", "Object_136",
      "Object_186", "Object_138", "Object_165",
      "Object_147", "Object_178", "Object_126",
      "Object_153", "Object_159", "Object_182",
      "Object_118", "Object_180", "Object_188", "Object_157",
      "Object_92", "Object_134", "Object_132", "Object_140",
        "Object_78", "Object_155", "Object_195",
      "Object_98", "Object_94", "Object_96", "Object_161", "Object_167",
      "Object_197",
    ],
    flash: ["Object_202"], // only mesh with a real emissive-white material besides the screen
    flashBorder: ["Object_204", "Object_206"],
    // Shared base plate under all three rear lenses, plus each lens's own
    // raised mount wall. Object_105/114 moved in from lens — confirmed via
    // GLB viewer as material ZQfGMLaFcpPaLMU, the actual glass plateau
    // cover, not a lens element. This is what lets the plateau pick up
    // CAMERA_PLATEAU_FINISH_OVERRIDE's glossy finish and the body-color
    // tint (via derivePlateauColor) instead of the flat lens finish.
    cameraPlateau: [
      "Object_105", "Object_114",
      "Object_116",
      "Object_144", "Object_171", "Object_192",
      "Object_190", "Object_169", "Object_142",
      "Object_122",
    ],
    cameraRing: ["Object_151", "Object_174", "Object_130", "Object_176", "Object_149", "Object_128"],
    // Only material in the file with emissive:[1,1,1] besides the flash —
    // same detection signature used for 16/16 Pro's screens.
    screen: "Object_81",
    skip: [],
  },
  // Hashed Sketchfab-style export — same node-naming situation as 16 Pro/
  // 16/Air, so bucketBy: "node" is used. Unlike those, these buckets come
  // from actually parsing the .glb (each node's real measured bounding
  // box + its material's PBR properties: color, metalness, roughness,
  // emissive), not eyeballed — but still NOT confirmed against a render.
  // Screen (43) and flash (110) are confirmed via emissive:[1,1,1], the
  // only two materials with it. Check the per-node console log against a
  // reference photo and re-bucket anything that looks wrong.
    // Fresh hashed Sketchfab-style export (different node IDs than the old
  // 15 Pro file). Buckets below come from parsing the .glb directly —
  // each node's real measured world-space bounding box (position/size)
  // plus its material's baseColor/metalness/roughness/emissive — not
  // eyeballed, but still NOT confirmed against a render. Screen (Object_227)
  // and flash (Object_81) are confirmed via emissive:[1,1,1]; every other
  // bucket is a position/size heuristic (three camera clusters near the
  // top, by lens/ring/plateau size tiers; frame = full-thickness metal
  // shell; body = full-face mesh nearest the back; antenna = thin strips
  // near the left/right edges; everything else defaults to trim). No
  // distinct Apple-logo mesh was found in this export, so logo is empty.
  // Check the per-node console log against a reference photo and
  // re-bucket anything that looks wrong.
    "iPhone 15 Pro": {
    bucketBy: "node",
    frame: [
      "Object_8", "Object_127", "Object_129", "Object_192", "Object_196", "Object_198",
    ],
    body: [
      "Object_137",
    ],
    logo: [
      "Object_124",
    ],
    antenna: [
      "Object_161", "Object_169", "Object_178", "Object_180", "Object_189",
    ],
    trim: [
      "Object_131", "Object_142", "Object_144", "Object_147", "Object_149", "Object_151", "Object_153",
      "Object_155", "Object_157", "Object_159", "Object_163", "Object_165", "Object_167", "Object_171", "Object_173",
      "Object_176", "Object_182", "Object_185", "Object_194", "Object_200", "Object_217", "Object_219", "Object_221",
      "Object_223", "Object_225", "Object_229", "Object_231", "Object_233", "Object_235",
    ],
    lens: [
      "Object_13", "Object_15", "Object_17", "Object_31", "Object_33", "Object_35", "Object_43", "Object_50",
      "Object_54", "Object_64", "Object_76", "Object_78", "Object_97", "Object_99", "Object_109", "Object_117",
      "Object_203", "Object_206", "Object_208", "Object_210", "Object_212", "Object_214", "Object_237", "Object_139",
    ],
    flash: [
      "Object_81",
    ],
    flashBorder: [],
    // Outer ring (lxyVilivCNAAGIX.002) + inner ring (XXuRSphlgMABayB.002)
    // around each of the three rear lenses. Object_133 (material
    // WwsbjWsUTqkHjyi.002) moved in from trim — it's the plateau's shared
    // base plate, and its texture bakes all three lens-hole shadows AND
    // the LiDAR window as a small darker dot (confirmed by extracting and
    // viewing the texture directly). Leaving it in trim forced it flat
    // matte black with the map nulled, which erased the LiDAR dot along
    // with all the baked shading — same root cause as the 15 Pro Max's
    // Object_116.
    cameraPlateau: [
      "Object_20", "Object_24", "Object_26", "Object_28", "Object_39", "Object_48", "Object_52", "Object_56",
      "Object_58", "Object_60", "Object_62", "Object_68", "Object_94", "Object_101", "Object_105", "Object_113",
      "Object_119", "Object_122", "Object_133", "Object_135",
    ],
    cameraRing: [
      "Object_22", "Object_37", "Object_41", "Object_45", "Object_66", "Object_70", "Object_72", "Object_74",
      "Object_83", "Object_85", "Object_87", "Object_89", "Object_91", "Object_103", "Object_107", "Object_111",
      "Object_115", "Object_187",
    ],
    screen: "Object_227",
    skip: [],
  },

  "iPhone 14 Pro Max": {
    bucketBy: "node",
    // Main outer unibody, full-body glossy metal, plus the three right-edge
    // button caps (glossy, color-matched — not flat black).
    frame: ["lgnGJJmNebyRbHq_0", "MoTJNOoMxqdxNvQ", "tQCDizUpBYNcvFA", "qsTxqfACkdoWeLQ"],
    // UCttAeyROPsgmix/rqSonbcVVSPWFfa_0 = full-body envelope (base + overlay).
    // YPGjoywokSeoQFr/aYjPeBrpBRopJbp = lower back-panel (base + glossy overlay),
    // coincident bounding boxes — check for z-fighting once rendered.
    // RUMRNTkptJGDMpy is coincident with the frame's own full-body box; bucketed
    // here (not frame) so an occluded/internal duplicate layer still tints
    // sensibly rather than sitting at a flat default color.
    body: ["UCttAeyROPsgmix", "RUMRNTkptJGDMpy", "rqSonbcVVSPWFfa_0", "aYjPeBrpBRopJbp", "YPGjoywokSeoQFr"],
    // Centered on the back panel (x≈0, y≈mid-height) — the Apple logo.
    logo: ["wjSYkRykuFHJNPw"],
    // Full-width antenna line band, a right-edge segment, and the bottom-edge
    // antenna break (shares its material with RUMRNTkptJGDMpy above).
    antenna: ["mZxrNiCtMrMjOMv", "aVmapfDgqkPkjUf", "JUTNJcWwqyxbGDZ_0"],
// NEW — knexoFNknstHgiO / FaUtifOQSMTXiZM moved out of trim, into cameraPlateau
// (confirmed: bmOZLlCkCKhIIVe = yqmgDmvGsmuPwXx_0, the plateau's base plate —
// but the visible bump *surface* is these two housing-shell nodes sitting on
// top of it. Leaving them in trim is what pinned the plateau to flat black
// regardless of body color, since trim is hardcoded and excluded from tinting.)
    trim: [
      "XbtrdVaOWYmkEiU",   // top-edge mic/sensor hole
      "rrqFqyfckTuyRuI",   // front bezel / screen border
      "vauUojKrKkLLDtY",   // small hole near the camera cluster
      "DLfIUIalXuQjJsL",   // flat black backing behind the rear lenses
      "JyAbjubWrOdfygC_0", "nxFoHsySvfcSLvp", // LiDAR window cluster
      "QaGkMzxNzKPcqRy", "KUDomTaVduCyevu",   // top-edge grille slit + backing
      "QOfJIBEXOvXfSUh", "BeQtuLXtpSTrzAH",   // bottom-edge micro detail + seam
      "tWBbDznHihIxXam", "PLFTnNQeqVAxicS", "GWEiavWnRxbogtw_0", "RFqaqXLpuCDBIGV_0", "BDLCJBydsNjizog_0", // USB-C port cluster
      "zPPSOvNamLQVyvv",   // bottom speaker grille dot-pattern
      "CAQeTxdpUcbxQyT",   // right-edge button seam/dot, flat black
    ],
    // Semi-transparent lens glass covers on the rear cluster.
    lens: ["KABLQLZRuEbcLWk", "YnrVhXEUDbStWCs"],
    // RGbIswEcCTzqNsn_0/dNDonqESZOxUcei_0 = flash body + lens cover.
    // IuMgFUHIyRWENxG_0 = confirmed via emissive:[1,1,1], the actual LED.
    flash: ["RGbIswEcCTzqNsn_0", "IuMgFUHIyRWENxG_0", "dNDonqESZOxUcei_0"],
    flashBorder: ["XeFHhVBtRZWPGxR", "nJYGEbPQybRBbiN"],
    // Base plate (yqmgDmvGsmuPwXx_0, confirmed material bmOZLlCkCKhIIVe) plus
    // the raised housing shell actually visible around the three lenses
    // (knexoFNknstHgiO/FaUtifOQSMTXiZM, moved out of trim) and the glossy
    // outer glass cap (ePYqawqlCJbCsNi).
    // rJeCWUNsVVXXAbI moved in from trim — confirmed via per-node debug
    // render as the glass covering both the plateau and the logo area,
    // not flat trim black. Picks up CAMERA_PLATEAU_FINISH_OVERRIDE's
    // glossy glass treatment automatically.
    cameraPlateau: ["yqmgDmvGsmuPwXx_0", "knexoFNknstHgiO", "FaUtifOQSMTXiZM", "OMkeKbwVHRBkBwM", "ePYqawqlCJbCsNi", "rJeCWUNsVVXXAbI"],
    // Metallic rings around each rear lens, plus the LiDAR ring (shares the
    // same color-matched ring material).
    cameraRing: ["qjXEDwnnBYwWcJn", "FGDSbHbILfUmiaH", "jQXfQpudiYObSGp", "BhvzCWikxrVeDTV", "MMkajxMNWrwGQfi", "oCklTGvTZoDWJrC_0"],
    screen: "YbXWdqEcjbfTKuN_0", // confirmed via emissive:[1,1,1]
    // Tiny front-camera lens cluster — too small to be the real Dynamic Island
    // pill (see NEEDS_ISLAND_MESH below), so it's hidden and replaced by the
    // synthetic mesh instead of doubling up with it.
    hide: ["lxsKwuOPNvmzBKg_0", "alSOKOYgFKIcUtR", "FjhETOCBEeiBmch", "AbxQOpRbGREHXRG", "tWfjYtMZCfucxRt"],
    skip: [],
  },
    // Hashed Sketchfab-style export, same node-naming convention as 14 Pro
  // Max (this looks like the same asset-pack generator, just the 6.1"
  // body). Buckets below come from parsing the .glb directly — each
  // node's real measured world-space bounding box plus its material's
  // baseColor/metalness/roughness/emissive — NOT confirmed against a
  // render. Screen (ktFtMyWriJerRNf_0) and flash (RflwlrcvHLpkpdo_0) are
  // confirmed via emissive:[1,1,1]; everything else is a position/size
  // heuristic. Check the per-node console log against a reference photo
  // and re-bucket anything that looks wrong.
  "iPhone 14 Pro": {
    bucketBy: "node",
    // Main unibody shell (full-footprint, full-metal, shiny — stainless
    // steel) plus the lower rail and right-edge button caps.
    frame: [
      "BTIgVGTKJCdxwpM", "UduDhNncVKgobDu",
      "ZWCCYhVFucUcAph", "OOLzPasWWXaJLuN", "ywvyMyEJiJvLcht", "MVSauxVCYupchRS",
    ],
    // Full-footprint back glass panels (matte, low metalness).
    body: ["bDCfnnHJzPeOYWv_0", "bhrNgPsROzXMzeh"],
    // Centered mid-back mark, plausible logo size/position.
    logo: ["xFqOOhzCWDoeEIz"],
    // Near-full-width horizontal band partway up the back — antenna-line break.
    antenna: ["PbPdQbEBMslCSyi"],
    // Rear lens glass covers + the LiDAR window (HoxbTqqoWNtdbGr, confirmed
    // against a render — was wrongly bucketed as trim).
    lens: ["STeCSrdmGBCHHlU", "glMhdDsxivkmeGv", "XUJGuAhSXHxRrJy_0", "HoxbTqqoWNtdbGr"],
    flash: ["voysUUAKTGyJjrg_0", "LEVrWTsHyDGAZCX", "pjtSlZKuZICHmjh_0", "RflwlrcvHLpkpdo_0"], // last one confirmed via emissive:[1,1,1]
    flashBorder: ["WHxFtHtlZoprgzy_0", "SjevDDgdFCqaWhb", "ypkTOpyRcWjkMpB"],
    // Front bezel/cover glass, top/bottom edge grilles and port cluster,
    // plus the flat black inner border around each rear lens
    // (qXfYHlZCsZLsBhO — stays fixed black regardless of finish, unlike
    // cameraRing which tints to the body color).
    trim: [
      "PdnHoNeelHmKFrp", "KPBCMtdjeQNpxSd", "EOxMHSLwUbsMwTp", "qXfYHlZCsZLsBhO",
      "ktkHYoTyzBFLevn",
      "VpFFwkgAamvrXcd", "scLggrKTasOYYiQ", "rlYTtVEWtMehXkw",
      "ZxUBJVuxXSARbIv", "LwAUWbwcMBlVMpk", "PsmZlOlaSmRNhFN", "YEfEuswGVpzYNXN_0",
      "NdscOpDYlZmZbiY_0", "FABEuGHWPvfuISK_0", "KMSjbFkJCptgZpU_0", "WzgSEFBAKdPkNlr",
      "ghDvSyDnHpbgFjz",
    ],
    // Base plate + raised housing wall + outer glass cap of the camera bump.
    // (ktkHYoTyzBFLevn moved out — confirmed via per-node debug render as
    // the red ring around the lens cluster, not part of the plateau.)
    cameraPlateau: [
      "jcwGIHCcSTOliNX_0", "zdOkUYGKWOPWnuR", "btjJfhAzasgLHzP",
      "NLDwuRPftzaiQmC",
      "CkkNZYRjLJBQRVI", "UyvynprEXPxHRNf",
    ],
    // Shiny metal ring around each rear lens — color-matched to the body finish.
    cameraRing: ["tTxsqgtnYLdAdRT", "gMCUrLrLjEUTLdk", "nRIRmAjvgiNjViG", "MMHGcFzDWvAjtuD"],
    screen: "ktFtMyWriJerRNf_0", // confirmed via emissive:[1,1,1]
    // Tiny front-camera/sensor cluster near the top of the screen — same
    // "too small to be the real pill" situation as 14 Pro Max, replaced
    // by the synthetic Dynamic Island mesh (see NEEDS_ISLAND_MESH).
    hide: [
      "LBLFqpHSUUnEKmB_0", "CWSpiSDGznxGaau", "vfHoCDrXeMaNDLQ",
      "RTlyCqoPUDyRxgq", "EOxMHSLwUbsMwTp", "peXOeeUZalklCgI",
    ],
    skip: [],
  },
    "iPhone 14 Plus": {
    bucketBy: "node",
    // Aluminum unibody + a second full-footprint metal layer, plus the
    // side buttons.
    frame: [
      "HMXSQBetWjAqPqm", "cFNIiIWKNLmeQJj",
      "hTPXNGnOWUswmQW", "CuvOInPeNXlHXtu", "VEfLFBTtxcEUNeH", "qfUmjWBWhzNLAiT",
      "FAHEhmoSbBCaXuT_0", "AeTqeHKyzsdgBQJ",
    ],
    // Back glass panel(s).
    body: ["BMYQfgDMlvOXrSV", "IjfOsKbYAdnpjJS"],
    // No distinct Apple-logo mesh found in this export — likely baked
    // into the back-glass texture instead.
    logo: [],
    // Near-full-width horizontal bands — antenna-line breaks.
    antenna: ["sqzZSepFnQkIYLj", "VTxnjHuJesOalMU"],
    // Front bezel/cover glass, notch bar + its inner black ring, top/
    // bottom edge grilles, and the port cluster.
    trim: [
      "CAwCIwetzmBRYFP", "xnccIhoKkUvAkWt", "iqBvkUMTbxgtvbp", "qDqjAkyFzZeFURE",
      "GYdgFDAJCdUNqoz", "JMlkNmgnlZhdnUU", "uzHLNMkCfBGdApY",
      "HQbwBLmIyPePYGd", "jsEkCSKcJEeGgUK", "SrnIxyjbFVFvGWT", "uIybdGwyKnvWaJB",
      "ClDcFlfukkYNLkp", "jiXiSgywjSzgBMC", "GDpzKgELpyBouYR", "gogEzgFDMeavzUr",
      "GlMnjOvxnIxTsjN", "wLBxsFLqXkyxMac",
    ],
    // Front-camera glass (inside the notch) + rear lens glass/highlights
    // across both cameras.
    lens: [
      "juzeDGASUDDpQjZ", "RhUJOuljVgQhAKB", "ISWNDmKhqwTRUYD", "WNrmCcWeTYgvQYD",
      "gqPhEoGSIdOwYmL", "flwhbKFrmReYgEA", "RJFclkuZaZTmkOg", "LypbQhmFfqvUwkN",
      "bQgtHhtUhVskukN", "encGHTiWvalaCyv", "ZHhVtzktLqmcCyJ", "wZEGknZXnEGxAJU",
      "fHZGlQjcxcdGLik",
    ],
    flash: ["Tverwmbjhawizpl"], // confirmed via emissive:[1,1,1]
    flashBorder: ["IDxZAizlBbIOtuK", "zwmtpvwlRwLagSl", "FAOuerpBLnDGKKZ"],
    // Matte black backing plates behind each lens + the shared base plate
    // and glossy glass cap over the whole cluster.
    cameraPlateau: [
      "KNsFdOjakXNYMQI", "ezYGUopTQFxewsq", "JvuTcMwNMazsZdO", "VZQFfbgOJpaTntN",
      "abeYEYenFVTXrjx", "jhvBHpWisgOjBij",
    ],
    // Shiny, color-matched ring around each of the two rear lenses.
    cameraRing: ["mdBcpOQkLveCilE", "lzFarWGtycsoPqA"],
    screen: "fLjzECeZdsLmPsn", // confirmed via emissive:[1,1,1]
    // Full-body transparent overlay (BLEND, no baseColor) — same "dims
    // everything under it" risk as other devices' full-coverage glass
    // overlays, dropped entirely.
    skip: ["zYSRTCusqEkyrbW"],
  },
   "iPhone 14": {
    bucketBy: "node",
    // Aluminum unibody + a second full-footprint metal layer, plus the
    // side buttons.
    frame: [
      "RiYHmRrorweUKJo", "XAlfihRtaWaVFTv",
      "xsydoSxyLgPdxeN", "rOgHtEgjFsBXPcA", "RXMdwVflBktYZeO",
      "aesWyYiNVDDGDrp", "NXEHjhsUYwNEdLL",
    ],
    body: ["DaVdbaiJmIsNrJi", "SiCGikWYsRjKVWh"],
    // Small, separately-glossy centered back mesh — plausible logo, but
    // 14 Plus's equivalent export had none, so treat as unconfirmed.
    logo: ["JjGSFkdXFkTWwoY"],
    antenna: ["lCZSiGqmeVPSOsC"],
    trim: [
      "JaNvwGBQQhJPlKt", "ynkJuqVzaDucCYQ", "WuwrGyVAOLmEKkk", "swsJktJOgzlnNCS",
      "FSVDxQkLGpgzQDb", "DVqREQiwHZJXxBO", "RihpOttlsbQjDeJ", "jBiNdoBYeHnLabX",
      "pfujKqDgPvMBMsK", "tNubBaGiwhKnwyN", "vZGiLYMUsmhUNeO", "kJKTvUPNpWYCrdD",
      "nvdAHwShohDJyID", "DBfRaRXTskTcXIn", "pdlodpBswLajRHO", "dsFzEMZrrFYfTxq",
      "kuUEfLhONyGySzR", "dCHRduwEWzVJtQb", "eIAJpviSTvkwlxq", "GoSXyBLUioAhRBB",
      "LPwBsAZLGgxBYWm", "JkxyootTParGWta", "iyCeKkGLpXOwAIr", "VVAbtzAkJIFmxKL",
    ],
    lens: [
      "dAqDQdsZagBRlPl", "sLypgaHtdCmRfKg", "hKNxNJckJfPWzXq", "CZYtyTIYZAKFWlM",
      "VMSPxdUSwKrViaM", "rvqNJYTSeiBbfMd", "tZGIpcONiFOwIQI", "vqSTnVxPTFrvbDY",
      "YLuremvrOSYXnQl", "KLKJqjdGsBZNZZU", "NdUvwYXVRcblzTa", "PLkcjZJiINUhAnE",
      "qOpQSMfHvbaFueI",
    ],
    flash: ["YsTtJlyEVGgkVSW"], // confirmed via emissive:[1,1,1]
    flashBorder: ["qzQSTtpPLhkbLSf", "YYUkBzUybonjmLl", "ptivWYbQErSgHQQ"],
    cameraPlateau: [
      "izEyaQjYKkhAOuB", "qUcJYJWQCuLFyww", "bPYCDnowaQLGEpc",
      "XEZHqHzpjAiSEVi", "kMDIaSqQInuAHlI", "YkpqXXETiSErqyq",
    ],
    cameraRing: ["GamWyzJBhUvajAZ", "YivkmgODVLqdFNm"],
    screen: "GftvmgwiMVhaVVY", // confirmed via emissive:[1,1,1]
    skip: ["wcTyhSlpfIblRSv_0"], // full-coverage transparent overlay, same as 14 Plus
  },
  // Sketchfab-style export, bucketed from bounding boxes + material properties.
  // Frame roles (shell, lid, trackpad) are solid; the small trim pieces
  // (grilles, hinge, keys) are best guesses. Check the per-node console log.
  'MacBook Pro 14"': {
    bucketBy: "node",
    // 12/14/16/64 = base shell, 57/59 = bottom case, 77 = trackpad, 96 = lid shell
    frame: ["Object_12", "Object_14", "Object_16", "Object_64", "Object_57", "Object_59", "Object_77", "Object_96"],
    body: [],
    logo: ["Object_100"],
    antenna: [],
    trim: [
      "Object_20", "Object_22", "Object_24", "Object_26", "Object_28", "Object_30", "Object_32", // speaker grilles
      "Object_35", "Object_37", "Object_42", "Object_44",                                       // rear vents
      "Object_40", "Object_79",                                                                 // black gaskets
      "Object_48", "Object_50", "Object_53", "Object_55",                                       // bottom feet / label
      "Object_67", "Object_69", "Object_73",                                                    // Touch ID ring + keycaps
      "Object_98", "Object_109",                                                                // hinge
      "Object_94", "Object_103", "Object_111",                                                  // lid inner black
      "Object_85", "Object_89",                                                                 // webcam housing
    ],
    lens: ["Object_105", "Object_71", "Object_87", "Object_91"], // bezel glass, Touch ID, webcam lens
    flash: ["Object_75"], // key legends (warm off-white satin)
    flashBorder: [],
    cameraPlateau: [],
    cameraRing: [],
    screen: "Object_107",
    hide: ["Object_55", "Object_57"], // "MacBook Pro" wordmark fill + backing quad on the underside
    // Keyboard glass overlay and webcam cover are BLEND materials, which would
    // turn into opaque sheets once node-bucketed.
    skip: ["YMmdfGRsPviDXYd", "KtCwfhzYtafEPLg"],
  },
  // Sketchfab export, 61 meshes, node-bucketed. Every mesh below is accounted
  // for exactly once (bucketed or skipped). Lid is tilted ~20deg back; screen
  // (Object_123) is the only emissive mesh and is coplanar with the bezel glass.
  'MacBook Pro 16"': {
    bucketBy: "node",
    // 22/68 = outer top-case shells, 74 = inner deck, 42/70 = bottom case,
    // 88 = hinge seam line, 99 = hinge barrel, 103 = lid shell,
    // 32/38/48 = trackpad glass / edge / well, 86/121 = hinge bevel rings
    frame: [
      "Object_22", "Object_68", "Object_74", "Object_42", "Object_70",
      "Object_88", "Object_99", "Object_103",
      "Object_32", "Object_38", "Object_48",
      "Object_86", "Object_121",
    ],
    body: [],
    logo: ["Object_125"], // Apple logo on the lid's outer face
    antenna: [],
    trim: [
      "Object_10", "Object_90", "Object_92", "Object_101", "Object_111",  // hinge/rear vents + gap
      "Object_44", "Object_64", "Object_94", "Object_96",                 // speaker grilles / inner deck
      "Object_12", "Object_14", "Object_18", "Object_56", "Object_62",    // side ports
      "Object_34", "Object_84", "Object_58",                              // keyboard well, keycaps, Touch ID key
      "Object_16", "Object_28", "Object_78", "Object_26",                 // case seam gaskets, bottom pad
      "Object_30", "Object_40",// bottom regulatory text / wordmark
      "Object_131", "Object_115",                                         // lid inner black, webcam housing
    ],
    // 129 = glossy black bezel glass, 72 = Touch ID cap, 107/109/113 = webcam lens parts
    lens: ["Object_129", "Object_72", "Object_107", "Object_109", "Object_113"],
    flash: ["Object_76"], // white key legends (same treatment as the 14")
    flashBorder: [],
    cameraPlateau: [],
    cameraRing: [],
    screen: "Object_123",
    hide: ["Object_54", "Object_82"], 
    // Matched by MATERIAL name. jwuTsnFxKtBUxpK = alpha-0 BLEND glass shared by 11 meshes;
    // fNHiBfcxHUJCahl = keyboard decal sheet; ZCDwChwkbBfITSW = hinge decal.
    // Node-bucketed clones are forced opaque, so these would become solid sheets.
    skip: ["jwuTsnFxKtBUxpK", "fNHiBfcxHUJCahl", "ZCDwChwkbBfITSW"],
  },
  // Hashed Sketchfab export, 49 meshes, node-bucketed, in meters (34.1cm wide = the 15" Air).
  // Lid tilts ~20deg back. Screen (SadnAkehSlxIwKv) is a single quad, coplanar with the
  // bezel glass (biHEvGDNnTqamRb). Every mesh is bucketed or skipped exactly once.
  "MacBook Air": {
    bucketBy: "node",
    // zWq = base shell, hczG = lid shell, CTBER = hinge barrel, KgPD = aluminum key-well plate,
    // eeWS = bottom case, CkZg/oiLb = trackpad glass + edge
    frame: [
      "zWqVyCKpTAuZNiu_0", "hczGzWOWpedUDYd_0", "CTBERffHyoCSDBm_0",
      "KgPDMIRPrxAynTV", "eeWSraIVipLsSmX_0",
      "CkZgGMshUOhytMM", "oiLbjgjnUUhPosp",
    ],
    body: [],
    logo: ["OrhpMXCxeprcNok"], // Apple logo, glossy black, on the lid's outer face
    antenna: [],
    trim: [
      "vrIckaCELZpnnNK", "aLWGnOLpsFWVSfy",                    // lid inner black layers
      "TyOrApjEOLhYCaF", "lvlCIzdfTmsrnsM",                    // hinge cover strip + hinge black
      "aIqeGXayDxWnOWQ",                                       // webcam housing
      "PgbYkhvRdcmMeGL", "XwGJfoaIrduFPcU", "nDWhlgWONddUcnN", // keyboard well / trackpad underlay
      "HHcJitDCPTdgnFk", "DRGkWmkJlgmNDJU", "KMwpdMtieDqmHVU", // keycaps
      "ACMWKGtOCqXifQY", "bkcxDtALZjuqGGQ",                    // Touch ID key + ring
      "VAcTKRVsYcEMWxB", "qEJjkxdFZFWJWzR_0",                  // base seam gasket, bottom recess
      "MYVKQTLmUkzzlBj_0", "HrtjMXqDCcINmDE_0",                // bottom pad + regulatory decal
      "ebZHPVwKTmqvgbU", "uSnVzUkbvcGaVtm",                    // MagSafe port
      "tIZmzvOOHrlOFci", "UmfOhraHkqkMHJr",                    // USB-C #1
      "roXkINNmErodbSy", "wWWhLQmmNVhThGV",                    // USB-C #2
      "thJvyyEdPZIkQGr", "juMIjHdkYweLlGP", "zNYAavJLMZZchIX", // headphone jack
      "bzbXKgxvWZbXAqu", "guzkNjLPdYYIFbm",
    ],
    // biHEv = glossy black bezel glass, BkHyo = Touch ID cap, WDUVU/NqUin = webcam lens parts
    lens: ["biHEvGDNnTqamRb", "BkHyotPbPWzwAAj", "WDUVUVPpNjdIPkb", "NqUinIWcwSlXpvt"],
    flash: ["rktWdhtZkCSmqne", "hztTkkTJBJTZDmk", "bHBjPHbrqJmhyoR"], // white key legends
    flashBorder: [],
    cameraPlateau: [],
    cameraRing: [],
    screen: "SadnAkehSlxIwKv",
    // By MATERIAL name: dKLyhhkbEyMrqky = hinge/port decal sheets, mEMAJQfiigHeUXV = headphone-jack
    // decals, SsSIPrCyVNTOxvd = webcam cover. All alpha-BLEND, so node-bucketing would make them opaque.
    skip: ["dKLyhhkbEyMrqky", "mEMAJQfiigHeUXV", "SsSIPrCyVNTOxvd"],
  },
  // USD -> Sketchfab export, 16 meshes, node-bucketed. Faces +Z, +Y up, no rotation needed.
  // Buckets come from parsing the .glb (bounds, normals, material props), NOT confirmed against a render.
  // Check the per-node console log and re-bucket anything that looks off.
  "Pro Display XDR": {
    bucketBy: "node",
    // Housing / arm / base shell, back mount ring, hinge bits. The two hex-lattice rim meshes
    // (shared node name) are caught by MATERIAL_NAME_OVERRIDE above.
    frame: ["HJxexdgaCCQkOSU", "FRHIeNGciselOUD", "evPqzCNQtlXjCVN", "tOuBUEkZhOblDvy", "vfkGgIpuayFHHsr"],
    body: [],
    logo: [],
    antenna: [],
    // Hex-hole interiors, front glass edge band, inner shell, hinge bolts, rubber feet.
    trim: ["RLqNWQTvdxhYzwN", "yfhGvqUwPtBoviH", "hGwEfDVTEHoAURp", "nUppYpnAsUEoqrW", "RVNPTVBkPRthSTH"],
    lens: [],
    flash: [],
    flashBorder: [],
    cameraPlateau: [],
    cameraRing: [],
    screen: "IyklIWCEUuwKzOr",
    // All three are BLEND materials that would turn into opaque sheets once node-bucketed:
    // PCHVW... = duplicate arm shell (AO), WMVfK... = hex-perforation sheet, XeZeL... = 3%-alpha glass film.
    // WMVfK... (the perforated back sheet) is bucketed as frame via MATERIAL_NAME_OVERRIDE, not skipped.
    skip: ["PCHVWnITFZwJroA", "XeZeLWSRqDmtPEC"],
  },
  // Full replacement export, 33 meshes / 22 materials — parsed directly
  // from the .glb (node/material dump + world-space bounding boxes), not
  // eyeballed from a render. Screen (duUosXawNfgWFdH, material
  // XwfwbdGKvdbgmjC) is CONFIRMED via emissive:[1,1,1], same signature
  // used elsewhere in this file. Everything else is inferred from mesh
  // size/position clusters and material PBR values (metal vs. plastic,
  // color) — unverified against a render. Debug coloring is on for this
  // device (see DEBUG_PER_NODE_DEVICES below); check the per-node console
  // log and a render, then reassign anything that looks wrong.
  // Baked single-atlas export: 2 meshes, 2 materials.
  // Cube_1 = the entire iPad (frame, back, logo, buttons, camera bump, bezel lip) on one
  // textured material — kept as-is and tinted (see BAKED_BODY_COLOR) rather than flattened.
  // Cube_1_islands = the front glass, split off at load (see SCREEN_FACE_SPLIT).
  // Cube001_1 = ~11%-alpha camera cover ("glass"), skipped like other overlay glass.
  "iPad Air": {
    bucketBy: "node",
    frame: ["Cube_1"],
    body: [],
    logo: [],
    antenna: [],
    trim: [],
    lens: [],
    flash: [],
    flashBorder: [],
    cameraPlateau: [],
    cameraRing: [],
    screen: "Cube_1_islands",
    skip: ["glass"],
  },
  // Clean per-part export ("iPad Mini 6 2021" by DatSketch): 13 meshes, one material each,
  // real names, no atlas — so material-name bucketing, not bucketBy:"node".
  // Parsed from the .glb (bounds + material props); NOT confirmed against a render.
  "iPad mini": {
    // BaseColor = unibody (rails, back, camera bump wall); BaseColorMatte = side/top buttons.
    frame: ["BaseColor", "BaseColorMatte"],
    body: [], // all-aluminum back, no glass panel
    logo: ["BaseColorLogo"], // logo + back lettering
    antenna: [],
    // Bezel = glossy black front glass frame (hole matches the screen outline exactly),
    // CamGray/CamBlack = black camera internals, SpeakerMic = grille interior (texture dropped), Port = USB-C.
    trim: ["Bezel", "CamGray", "CamBlack", "SpeakerMic", "Port"],
    // Lens + CamGlass (alpha-blended, kept transparent) cover the rear AND front cameras.
    lens: ["Lens", "CamGlass"],
    flash: ["Flash"],
    flashBorder: [],
    // Cam1 = ring around the rear lens. The material-name path doesn't read cameraRing,
    // so it goes in cameraPlateau (slightly darker polished body color).
    cameraPlateau: ["Cam1"],
    cameraRing: [],
    screen: "Screen",
    skip: [],
  },
  // Clean, real-named Sketchfab export ("iPad Pro 2020" model). Parsed directly
  // from the .glb (node/material dump + world-space bounding boxes). Two
  // things forced bucketBy: "node" here instead of plain material-name
  // bucketing: the "Body" material is shared by the unibody AND the camera-
  // bump housing AND the speaker grille AND both buttons, and
  // "cameraframe_and_logo" is shared by the actual camera plateau AND the
  // Apple logo — two visually distinct parts that need different tints.
  // No baked roughness/metalness/normal maps on any material (confirmed via
  // the file), so no SURFACE_MAP_OVERRIDE entries are needed.
  "iPad Pro 12.9-inch": {
    bucketBy: "node",
    // Names below are the RUNTIME (post-load) node names, not the raw glTF
    // names — GLTFLoader sanitizes them on import (spaces → underscores,
    // dots stripped), confirmed from the per-node console dump.
    frame: [
      "iPad_Pro_2020_Body_0",     // main unibody
      "Speakers_Body_0",           // speaker housing, shares the Body material
      "power_button_Body_0",
      "Volume_button_Body_0",
    ],
    body: [], // all-aluminum back, no glass panel
    logo: ["Apple_logo_cameraframe_and_logo_0"],
    trim: [
      "iPad_Pro_2020_bezel_0",              // black front-glass bezel frame
      "camera_module2001_Mic_0",            // mic hole in the camera cluster
      "Speakers_Mic_0",                     // speaker grille interior
    ],
    lens: [
      "camera_glass_0", "camera1_camera1_0", "camera1_camera1(2)_0",
      "LiDar_LiDar_0",
      "camera1001_camera1_0", "camera1001_camera1(2)_0",
      "camera_module2001_camera2001_0",
      "Front_camera_front_camera_0", "Front_camera_camera1(2)_0", "Front_camera_glass_0",
    ],
    // Smart Connector pins — gold-plated contacts set inside stainless-steel
    // rings, per research. Fixed satin-metal finish (FLASH_BORDER_FINISH),
    // same as every other device's flashBorder bucket — never tracks the
    // selected body tint.
    flash: ["camera_module2001_Camera_Flash_0"],
    flashBorder: ["Connector__0"],
    // Confirmed: the actual plateau surface is material "camera2"
    // (camera_module2_camera2_0 / camera2_camera2_0), not
    // cameraframe_and_logo — that material was wrongly landing these in
    // "lens" (LENS_FINISH's flat, fixed color) instead of tracking the
    // selected finish.
    // Confirmed via per-node debug coloring: camera_module_glass_0 is the
    // actual visible plateau top surface (named "glass" in the source file,
    // but functionally the plateau cover, not a lens element) — it was
    // stuck in "lens" (LENS_FINISH's fixed color), which is why the
    // plateau never visibly changed despite the material/color pipeline
    // itself working correctly.
    cameraPlateau: [
      "camera_module_Body_0", "camera_cameraframe_and_logo_0",
      "camera_module2_camera2_0", "camera2_camera2_0",
      "camera_module_glass_0",
    ],
    // Thin painted seam line across the top of the back glass — same role
    // as the color-matched antenna-line accents on other devices, so it
    // tracks body tint at a satin, non-metallic finish instead of sitting
    // fixed black like trim.
    antenna: ["Line_Line_0"],
    cameraRing: [],
    screen: "iPad_Pro_2020_screen_0",
    // Apple Pencil (magnetically attached alongside the iPad in this export),
    // plus its logo/text decals — dropped so only the iPad itself renders.
    hide: [
      "Apple_Pencil_apple_pencil_0",
      "Apple_logo001_apple_pencil001_0",
      "Text_apple_pencil001_0",
    ],
    skip: [],
  },
  // Clean, real-named Sketchfab export. Materials map cleanly to parts (not
  // node-bucketed). The Apple Pencil ("Apple Pencil_1") and a stray empty
  // ("Empty.003_10") are siblings under this file's own "GLTF_SceneRootNode"
  // wrapper, so the existing generic duplicate-root-child stripping in
  // loadModel already removes them — no explicit skip/hide needed for the
  // Pencil. Parsed directly from the .glb (material dump + bounding boxes);
  // NOT confirmed against a render.
  "iPad Pro 11-inch": {
    // "case" covers five overlapping shell pieces (main unibody + button
    // caps etc.) that should all read as one tinted aluminum body.
    // "material_18" spans the full height on one side — likely a side rail
    // or button strip — bucketed here as the safest guess.
    frame: ["case", "material_18"],
    body: [], // all-aluminum back, no glass panel
    logo: ["Apple_logo"],
    // Thin overlay tracing the device's full outer silhouette — antenna line.
    // LTE1 traces the device's full outer silhouette; Apple_Pencil_connector
    // is the magnetic Pencil charging pad on the side edge — both are
    // color-matched, satin (non-metallic) accents on the real device, not
    // flat black, so both now track the selected body finish instead of
    // being hardcoded.
    antenna: ["LTE1", "Apple_Pencil_connector"],
    trim: [
      "screen_ftame",           // front bezel
      "speaker",                // quad-speaker grille holes
      "connector", "connector2", "contacts", // USB-C port surround + contacts
      "sensors", "material",    // small sensor patches beside the front camera
      "part_of_frontal_camera", // front camera housing ring
      "mic.001",
    ],
    lens: ["camera_glass", "camera_lens", "LiDAR", "frontal_camera_lens"],
    flash: ["light"],
    // "doc_station" is the Smart Connector's gold-plated pogo pins (confirmed
    // by its warm cream baseColor) — same fixed satin-metal treatment as the
    // 12.9-inch's Smart Connector, not tinted with the body finish.
    flashBorder: ["light_glass", "doc_station"],
    // Shared plateau cover glass ("glass") + its backing plate ("background")
    // occupy nearly the same footprint as the whole camera cluster, plus the
    // molded housing walls around each lens ("part_of_camera"/"part_of_camera2").
    cameraPlateau: ["part_of_camera", "part_of_camera2", "glass", "background"],
    cameraRing: ["camera_rings"],
    screen: "screen",
    // Full front-glass sheet spanning screen + bezel — same "dims everything
    // under it" risk as other devices' full-coverage overlay glass.
    skip: ["screen_glass"],
  },
  // Hashed Sketchfab export. Bucketed from world-space bounds + material props, NOT confirmed against a render.
  // Left unbucketed on purpose so they keep their authored look: Object_40 (orange Action button),
  // Object_50 (orange crown ring), Object_71 (side grille texture), Object_74 (back crystal),
  // Object_104/106 (strap pins), Object_109/112 (orange loop strap).
  "Apple Watch Ultra": {
    bucketBy: "node",
    frame: [
      "Object_25", "Object_29", "Object_23", "Object_14", "Object_7", "Object_27",
      "Object_33", "Object_35", "Object_66", "Object_68",
      "Object_45", "Object_54", "Object_56", "Object_58", // side button + crown
      "Object_93", "Object_95", "Object_98", "Object_101", // titanium strap lugs / G-hook
    ],
    body: [],
    logo: [],
    antenna: [],
    trim: [
      "Object_9", "Object_11", "Object_17", "Object_37", "Object_64",
      "Object_42", "Object_47", "Object_52",
      "Object_78", "Object_80", "Object_82", "Object_84", "Object_86", // rear sensor array
    ],
    lens: ["Object_61", "Object_76"], // front sapphire slab, rear sensor glass
    flash: [],
    flashBorder: [],
    cameraPlateau: [],
    cameraRing: [],
    strap: ["Object_109", "Object_112"],
    screen: "Object_89",
    hide: ["Object_78", "Object_80"], // 4 large window rims + the black tubes behind them
    // Object_21 is a BLEND shell with a cutout alpha texture; opaque it would become a solid sheet.
    skip: ["lokMFBOdPtkNVUL"],
  },
    // Sketchfab/USD export, 28 meshes, hashed names, node-bucketed. Parsed from the .glb
  // (leveled by 35.06° about X, then +Z = front). NOT confirmed against a render.
  "Apple Watch Series 9": {
    bucketBy: "node",
    frame: [
      "dLXgKtwhhIArttB",                 // aluminium case
      "xivofHKQauRplVO", "ckQfwDOLSRaCLjx", // crown body
      "JzsrAJxsijYDaXm", "qrToCpviaPKtGaD", // crown end faces
      "PkVcKQHDchfVCgI", "frNgKMljJerLRQH", "gqZlMdTcufuGZar", // side button + its stem
    ],
    body: [],
    logo: [],
    antenna: [],
    trim: [
      "uBMkHzJfTETpPSo", "hUTWIfJTbVAiNOd", "NWgsCGmxHpfkOSI", // front black bezel / backing
      "UuRngnswAedzZJk", "WbEyRJomLwSgEnM", "anNixJGwdyRDkGR", // inner glossy black
      "ciIcclAGsqZRJwp",                                        // back plate ring
      "iSeYrRMXDgmhKtN", "ZhsgsRxtLehbiWK",                     // sensor surround
      "DuAsDEEhwSsSeOz",                                        // side mic hole
    ],
    lens: ["rhNJnuHdLYrQzgA", "ODfBWgnKaGvPXPT"], // back crystal
    flash: [],
    flashBorder: [],
    cameraPlateau: [],
    cameraRing: [],
    strap: ["JaaULoZCcyvEIJV"],
    screen: "rpqLEPlKpASApqb",
        hide: ["ZhsgsRxtLehbiWK", "iSeYrRMXDgmhKtN"], // the 4 large window rims around the corner detectors
    // By MATERIAL name: both are alpha-BLEND decal sheets that would turn into opaque sheets
    // once node-bucketed (ZpNw... = full-case overlay + crown decal, WpuU... = crown grip decal).
    // If the crown looks too smooth, drop WpuUQTxUieHPyih and add its node (jyrZueUADaKElsi)
    // to KEEP_TRANSPARENT_NODES instead.
    skip: ["ZpNwagDIVArRcoO", "WpuUQTxUieHPyih"],
  },
    // Sketchfab export, 15 meshes, node-bucketed. Leveled by 29.76° about X (+Z = front).
  // Parsed from the .glb, NOT confirmed against a render.
  "Apple Watch Series 7": {
    bucketBy: "node",
    frame: ["Object_7", "Object_4", "Object_5"], // aluminium case, crown body
    body: [],
    logo: [],
    antenna: [],
    trim: [
      "Object_18", "Object_19", "Object_23", // front black bezel, bezel text layer, inner black plate
      "Object_12", "Object_21",              // rear black housing + sensor internals
    ],
    lens: ["Object_14"], // rear sensor glass
    flash: [],
    flashBorder: [],
    cameraPlateau: [],
    cameraRing: [],
    strap: ["Object_9", "Object_10"],
    screen: "Object_27",
    // By MATERIAL name: Material.004 is a 27%-alpha BLEND glass sheet over the display
    skip: ["Material.004"],
  },
};

const SCREEN_TEXTURE_CONFIG = {
  default: { wrap: THREE.RepeatWrapping, offsetX: SCREEN_UV_OFFSET_X, offsetY: SCREEN_UV_OFFSET_Y, flipVertical: false, flipHorizontal: false },
  "iPhone 17 Pro Max": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  "iPhone 17": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  "iPhone 17 Pro": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  "iPhone Air": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: true, flipHorizontal: false },
  // remapScreenUVsPlanar rebuilds clean 0-1 UVs from this mesh's own
  // bounding box, so clamp + zero offset is right. If the uploaded image
  // comes out mirrored or upside down, flip the relevant flag here.
  "iPhone 16 Pro": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: true, flipHorizontal: false },
  "iPhone 15 Pro Max": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: true },
  // remapScreenUVsPlanar rebuilds clean 0-1 UVs, so clamp + zero offset is
  // the right starting point. If the uploaded image renders mirrored or
  // upside down, flip the relevant flag here.
  "iPhone 15 Pro": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: true, flipHorizontal: true },
  // remapScreenUVsPlanar rebuilds clean 0-1 UVs, so clamp + zero offset is
  // the right starting point. Unverified against a render — if the uploaded
  // image comes out mirrored or upside down, flip the relevant flag here.
  "iPhone 14 Pro Max": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: true },
  // remapScreenUVsPlanar rebuilds clean 0-1 UVs (node-bucketed, same as
  // 14 Pro Max), so clamp + zero offset is the right starting point.
  // Unverified — if the uploaded image renders mirrored/upside down,
  // flip the relevant flag here.
  "iPhone 14 Pro": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: true },
  "iPhone 14 Plus": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: true },
  // remapScreenUVsPlanar rebuilds clean 0-1 UVs, so clamp + zero offset is
  // the right starting point. Unverified against a render — if the
  // uploaded image comes out mirrored or upside down, flip here.
  "iPhone 14": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: true },
  'MacBook Pro 14"': { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  'MacBook Pro 16"': { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  "MacBook Air": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  "Pro Display XDR": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  // Derived from the mesh axes (planar UVs run right→left / top→bottom after the 180° turn).
  // If it still renders mirrored or upside down, flip here.
  "iPad Air": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: true, flipHorizontal: true },
  // Native UVs are already planar (u=+X, v=+Y); after the 180° Y turn that needs a horizontal flip only.
  "iPad mini": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: true },
  // remapScreenUVsPlanar rebuilds UVs as u=+X, v=+Y for a mesh facing +Z —
  // exactly this model's native orientation (no rotation applied), so no flips.
  "iPad Pro 12.9-inch": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  // Native (unremapped) UVs used as-is, same as iPad mini/12.9-inch. Starting
  // guess — unverified against a render; if the uploaded image renders
  // mirrored or upside down, flip the relevant flag here.
  "iPad Pro 11-inch": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  // World-planar UVs (u = +X, v = +Y) on a face that's level after the rotation offset, so no flips. Unverified against a render.
  "Apple Watch Ultra": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  "Apple Watch Series 9": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
  "Apple Watch Series 7": { wrap: THREE.ClampToEdgeWrapping, offsetX: 0, offsetY: 0, flipVertical: false, flipHorizontal: false },
};

function getScreenTextureConfig(deviceLabel) {
  return SCREEN_TEXTURE_CONFIG[deviceLabel] ?? SCREEN_TEXTURE_CONFIG.default;
}

// Set once the renderer exists; the GPU's maximum anisotropic filtering level.
let MAX_ANISOTROPY = 1;

function applyScreenTextureConfig(tex, deviceLabel) {
  const cfg = getScreenTextureConfig(deviceLabel);
  tex.anisotropy = MAX_ANISOTROPY;
  tex.wrapS = cfg.wrap;
  tex.wrapT = cfg.wrap;
  tex.center.set(0, 0);
  tex.rotation = 0;
  tex.repeat.set(1, 1);
  tex.offset.set(cfg.offsetX, cfg.offsetY);
}

// Flips a finished canvas vertically by redrawing it onto a fresh canvas —
// done at the pixel level, not via the texture's UV matrix, so the result
// is guaranteed regardless of how this mesh's UVs are laid out.
function flipScreenCanvas(sourceCanvas, { flipVertical, flipHorizontal }) {
  if (!flipVertical && !flipHorizontal) return sourceCanvas;
  const out = document.createElement("canvas");
  out.width = sourceCanvas.width;
  out.height = sourceCanvas.height;
  const ctx = out.getContext("2d");
  ctx.translate(flipHorizontal ? out.width : 0, flipVertical ? out.height : 0);
  ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
  ctx.drawImage(sourceCanvas, 0, 0);
  return out;
}
// Some baked AO/shadow textures render their darkest details (like a small
// sensor window) as a soft mid-gray shadow rather than true black, which
// reads as barely-there once multiplied against a lighter finish tint.
// This rebuilds the texture with a levels adjustment: pixels already below
// `threshold` luminance get pushed toward pure black with a power curve;
// anything brighter is left untouched. Returns a new CanvasTexture — the
// source texture is never mutated.
function crushShadowsToBlack(sourceTexture, threshold = 0.35, power = 2.5) {
  const img = sourceTexture.image;
  if (!img || !img.width) return sourceTexture; // not decoded yet — bail safely
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma >= threshold || luma === 0) continue;
    const t = luma / threshold; // 0-1 within the shadow range
    const scale = Math.pow(t, power); // crushes low values toward 0 faster than linear
    data[i] *= scale;
    data[i + 1] *= scale;
    data[i + 2] *= scale;
  }
  ctx.putImageData(imageData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = sourceTexture.colorSpace;
  tex.wrapS = sourceTexture.wrapS;
  tex.wrapT = sourceTexture.wrapT;
  tex.flipY = sourceTexture.flipY;
  tex.needsUpdate = true;
  return tex;
}

// Per-device: how far (mm) to slide the screen mesh back along its own front normal.
// Used when the display mesh sits proud of the case/bezel in the export.
const SCREEN_PUSH_BACK_MM = {
  "Apple Watch Series 9": 0, // raise to sink it further, lower if it starts hiding behind the bezel
};

// Devices whose screen mesh is a curved glass skin: keep the wrap-around edge triangles
// instead of filtering to the flat face (the filter would shrink the display).
const SCREEN_KEEP_ALL_TRIS = {
  "Apple Watch Series 9": true,
};

// Moves the (already cloned) screen geometry along -normal. Normal is the area-weighted
// average of the triangle windings, which point out of the front face on these exports.
function pushScreenBack(mesh, mm) {
  if (!mm) return;
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const n = new THREE.Vector3(), tri = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    a.fromBufferAttribute(pos, idx[i]);
    b.fromBufferAttribute(pos, idx[i + 1]);
    c.fromBufferAttribute(pos, idx[i + 2]);
    tri.subVectors(b, a).cross(c.sub(a));
    n.add(tri);
  }
  if (n.lengthSq() === 0) return;
  n.normalize().multiplyScalar(-mm * 0.1); // this export's local units are cm (USDRoot scale 0.01)
  geo.translate(n.x, n.y, n.z);
  console.log(`[screen push back] ${mm}mm`);
}

// Some exports ship screen UVs that only cover a sub-rectangle of 0-1 (or
// spill outside it), which stretches/smears the texture under clamp
// wrapping. This rebuilds them as a planar projection over the mesh's own
// bounding box: thinnest axis = screen normal, longest axis = height.
function remapScreenUVsPlanar(mesh, keepAll = false) {
  const geo = mesh.geometry.clone(); // don't mutate geometry another mesh might share
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);
  const dims = [size.x, size.y, size.z];
  const mins = [box.min.x, box.min.y, box.min.z];
  const order = [0, 1, 2].sort((a, b) => dims[a] - dims[b]);
  const nAxis = order[0]; // screen normal
  const uAxis = order[1]; // width
  const vAxis = order[2]; // height
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getComponent(i, uAxis) - mins[uAxis]) / dims[uAxis];
    uv[i * 2 + 1] = (pos.getComponent(i, vAxis) - mins[vAxis]) / dims[vAxis];
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

  // Side walls / inner steps get smeared by a planar projection (that's the
  // streaks) — keep only triangles whose normal points along the screen axis.
  const idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const kept = [];
  for (let i = 0; i < idx.length; i += 3) {
    a.fromBufferAttribute(pos, idx[i]);
    b.fromBufferAttribute(pos, idx[i + 1]);
    c.fromBufferAttribute(pos, idx[i + 2]);
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    const n = e1.cross(e2).normalize();
    if (Math.abs(n.getComponent(nAxis)) > 0.85) kept.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  console.log(`[screen UV] kept ${kept.length / 3} of ${idx.length / 3} triangles`);
  if (kept.length && !keepAll) geo.setIndex(kept);
  mesh.geometry = geo;
}

// Devices whose screen plane is tilted, so remapScreenUVsPlanar (bbox-axis based) can't be used.
const SCREEN_UV_WORLD_PLANAR = {
  'MacBook Pro 14"': true,
  'MacBook Pro 16"': true,
  "MacBook Air": true,
  // The bbox-axis version would rotate the UVs 90° here (thinnest axis = z, then y as "width").
  "Pro Display XDR": true,
  // The bbox-axis version can't handle a plane that was authored tilted
  "Apple Watch Ultra": true,
  "Apple Watch Series 9": true,
  "Apple Watch Series 7": true,
};

// Planar UVs projected in world space: u along world X (right), v up the plane's own slope.
// Falls back on nothing: it fits the plane from the mesh's own triangles.
function remapScreenUVsWorldPlanar(mesh, keepAll = false) {
  mesh.updateWorldMatrix(true, false);
  const geo = mesh.geometry.clone();
  const pos = geo.attributes.position;
  const idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const wp = [];
  for (let i = 0; i < pos.count; i++) {
    wp.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
  }

  const N = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), tn = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    e1.subVectors(wp[idx[i + 1]], wp[idx[i]]);
    e2.subVectors(wp[idx[i + 2]], wp[idx[i]]);
    tn.crossVectors(e1, e2);
    if (tn.z < 0) tn.negate(); // face the camera (+Z)
    N.add(tn);
  }
  N.normalize();
  const U = new THREE.Vector3(1, 0, 0).addScaledVector(N, -N.x).normalize();
  const V = new THREE.Vector3().crossVectors(N, U);

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  const us = new Float32Array(pos.count), vs = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    us[i] = wp[i].dot(U);
    vs[i] = wp[i].dot(V);
    minU = Math.min(minU, us[i]); maxU = Math.max(maxU, us[i]);
    minV = Math.min(minV, vs[i]); maxV = Math.max(maxV, vs[i]);
  }
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (us[i] - minU) / (maxU - minU);
    uv[i * 2 + 1] = (vs[i] - minV) / (maxV - minV);
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

  const kept = [];
  for (let i = 0; i < idx.length; i += 3) {
    e1.subVectors(wp[idx[i + 1]], wp[idx[i]]);
    e2.subVectors(wp[idx[i + 2]], wp[idx[i]]);
    if (Math.abs(e1.cross(e2).normalize().dot(N)) > 0.85) kept.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  console.log(`[screen UV world] kept ${kept.length / 3} of ${idx.length / 3} triangles, aspect ${((maxU - minU) / (maxV - minV)).toFixed(3)}`);
  if (kept.length && !keepAll) geo.setIndex(kept);
  mesh.geometry = geo;
}

const DEVICE_DEFAULT_FINISH = {
  "Apple Watch Ultra": { hex: "A6A6A1", opacityPct: 100, roughness: 0.42, metalness: 1, name: "Natural titanium" },
  "Apple Watch Series 7": { hex: "D6D1C4", opacityPct: 100, roughness: 0.4, metalness: 0.9, name: "Starlight" },
  "Apple Watch Series 9": { hex: "D8D3C8", opacityPct: 100, roughness: 0.4, metalness: 0.9, name: "Starlight" },
  default: { hex: "8F8172", opacityPct: 100, roughness: 0.12, metalness: 1 }, // Desert titanium
  "iPhone 17 Pro Max": { hex: "E4E4E2", opacityPct: 100, roughness: 0.5, metalness: 0.7 }, // Silver, satin anodized aluminum
"iPhone 17": { hex: "353839", opacityPct: 100, roughness: 0.1, metalness: 0.9 }, // Black — matches Apple's official hex
  "iPhone Air": { hex: "FCFCFC", opacityPct: 100, roughness: 0.55, metalness: 0.85, name: "Cloud White" },
  "iPhone 14 Pro Max": { hex: "4B4845", opacityPct: 100, roughness: 0.15, metalness: 1, name: "Space Black" }, // was falling back to Desert Titanium
  "iPhone 14 Pro": { hex: "4B4845", opacityPct: 100, roughness: 0.15, metalness: 1, name: "Space Black" },
  "iPhone 14 Plus": { hex: "2C2E36", opacityPct: 100, roughness: 0.1, metalness: 0.9, name: "Midnight" },
  "iPhone 14": { hex: "2C2E36", opacityPct: 100, roughness: 0.1, metalness: 0.9, name: "Midnight" },
  // Space Gray, matte-anodized recycled aluminum unibody — see research.
  "iPad Air": { hex: "68696E", opacityPct: 100, roughness: 0.45, metalness: 0.9, name: "Space Gray" },
  "iPad mini": { hex: "68696E", opacityPct: 100, roughness: 0.45, metalness: 0.9, name: "Space Gray" },
  "iPad Pro 12.9-inch": { hex: "68696E", opacityPct: 100, roughness: 0.45, metalness: 0.9, name: "Space Gray" },
  "iPad Pro 11-inch": { hex: "68696E", opacityPct: 100, roughness: 0.45, metalness: 0.9, name: "Space Gray" },
};

const REFERENCE_HDRI_PATH = "/hdri/neutral.exr";

const exrLoader = new EXRLoader();

// Loads and converts a real HDRI into a PMREM environment texture.
// Returns a promise resolving to { texture, renderTarget } so the caller
// can dispose the render target later, or null for "none".
function loadEnvironmentTexture(renderer, key) {
  const path = key === "reference" ? REFERENCE_HDRI_PATH : ENVIRONMENT_HDRI_PATHS[key];
  if (!path) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    exrLoader.load(
      path,
      (exrTexture) => {
        exrTexture.mapping = THREE.EquirectangularReflectionMapping;
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const renderTarget = pmremGenerator.fromEquirectangular(exrTexture);
        pmremGenerator.dispose();
        exrTexture.dispose();
        resolve({ texture: renderTarget.texture, renderTarget });
      },
      undefined,
      (err) => reject(err)
    );
  });
}

// Used by Frame mode in App.jsx: paints the same status bar / home indicator the mockup uses,
// on a 440 x 956 pt screen fitted to the frame (centered horizontally, status bar hangs from
// the top, home indicator from the bottom). `color` is passed in because Frame has no pixels
// to sample, it picks black/white from the social UI's theme.
export function paintPhoneChrome(ctx, w, h, { statusBar, homeIndicator, color = "#FFFFFF", statusColor, homeColor, deviceLabel = "iPhone 16 Pro Max" }) {
  const { w: lw, h: baseH } = SCREEN_LOGICAL_PT[deviceLabel] ?? SCREEN_LOGICAL_PT.default;
  const k = Math.min(w / lw, h / baseH);
  ctx.save();
  ctx.translate((w - lw * k) / 2, 0);
  ctx.scale(k, k);
  if (statusBar) {
    drawStatusBar(
      ctx, lw, statusColor ?? color,
      getStatusBarScale(deviceLabel),
      getStatusBarCenterXOffset(deviceLabel),
      getStatusBarCenterY(deviceLabel)
    );
  }
  if (homeIndicator) drawHomeIndicator(ctx, lw, h / k, homeColor ?? color, getHomeIndicatorBottomGap(deviceLabel));
  ctx.restore();
}

// Paints an already-loaded image into a device-specific screen texture
// (bezel mask + flip config for THIS device), so it can be rebuilt on model switch.
// --- Status bar + home indicator -------------------------------------------
// Real iOS chrome, painted into the screen texture in the same upright canvas space as the
// image (so it flips with it). Layout is in logical points and mapped onto the display area,
// so it's correct on every model's texture size.
const SCREEN_TEXTURE_SCALE = 3; // canvas supersampling, keeps the chrome and screenshot crisp

const SCREEN_LOGICAL_PT = {
  default: { w: 440, h: 956 }, // 16 Pro Max fallback
  'MacBook Pro 14"': { w: 1512, h: 982 },
  'MacBook Pro 16"': { w: 1728, h: 1117 },
  "MacBook Air": { w: 1710, h: 1107 }, // 15" Air
  "Pro Display XDR": { w: 3008, h: 1692 }, // 6K at the default scaled resolution
  "iPad Air": { w: 820, h: 1180 },
  "iPad mini": { w: 744, h: 1133 },
  "iPad Pro 12.9-inch": { w: 1024, h: 1366 },
  "iPad Pro 11-inch": { w: 834, h: 1210 },
  "iPhone 17 Pro Max": { w: 440, h: 956 },
  "iPhone 17 Pro": { w: 402, h: 874 },
  "iPhone 17": { w: 402, h: 874 },
  "iPhone Air": { w: 420, h: 912 },
  "iPhone 16 Pro": { w: 402, h: 874 },
  "iPhone 15 Pro Max": { w: 430, h: 932 },
  "iPhone 15 Pro": { w: 393, h: 852 },
  "iPhone 14 Pro Max": { w: 430, h: 932 },
  "iPhone 14 Pro": { w: 393, h: 852 },
  "iPhone 14 Plus": { w: 428, h: 926 },
  "iPhone 14": { w: 390, h: 844 },
  "Apple Watch Ultra": { w: 205, h: 250 },
  "Apple Watch Series 9": { w: 198, h: 242 }, // 45mm
  "Apple Watch Series 7": { w: 198, h: 242 }, // 45mm
};

// Real Apple Dynamic Island geometry, in points. Apple lays this out in
// points (not pixels, not a fraction of screen width), so these numbers
// are the same on every Dynamic-Island iPhone regardless of physical
// screen size — the 6.1" and 6.7" phones share identical island metrics.
// Real Apple Dynamic Island geometry, in points. Confirmed against current
// device specs: 120×36pt, 18pt corner radius (= height/2, so the existing
// capsule-drawing code needs no separate radius handling), with the pill
// itself identical across every DI-capable model. topGap varies by bezel
// generation, not by pt-size — non-Pro 16/16 Plus use 11pt; every device
// this app currently models (16 Pro/Pro Max, 17 base/Pro/Pro Max, Air) uses
// 14pt, so a single value covers all of them.
const DYNAMIC_ISLAND_SPEC = {
  width: 120,
  height: 36,
  topGap: 14, // distance from the screen's top edge to the island's top edge
};

// Real Apple Home Indicator geometry, in points — also a fixed size
// across devices, not a fraction of screen width.
const HOME_INDICATOR_SPEC = {
  width: 134,
  height: 5,
  bottomGap: 8,
};
// Extra pt added on top of the base bottomGap, per device — some exports'
// bottom bezel/crop doesn't match the real device's physical inset 1:1,
// so the indicator can sit closer to the visible edge than the 8pt spec
// implies. Increase to push it further up, away from the edge.
const HOME_INDICATOR_GAP_OVERRIDE_PT = {
  "iPhone Air": 10,
};
function getHomeIndicatorBottomGap(deviceLabel) {
  return HOME_INDICATOR_SPEC.bottomGap + (HOME_INDICATOR_GAP_OVERRIDE_PT[deviceLabel] ?? 0);
}

const STATUS_BAR = {
  islandW: DYNAMIC_ISLAND_SPEC.width, // sets the width of the "ears" the clock and icons are centred in
  timeFont: '600 17px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif',
};
// Extra pt added on top of DYNAMIC_ISLAND_SPEC.topGap when positioning the
// PAINTED status bar text/icons — separate from the real Dynamic Island
// mesh, which is derived straight from screen geometry. This exists because
// a screenshot's own baked-in status bar sits wherever the real device puts
// it, but our painted one is placed from pt-space math that assumes the
// crop lines up exactly — for the Air it doesn't quite, so the painted bar
// renders too close to the top edge. Increase to push it down, decrease to
// pull it up. Tune by comparing against an uploaded screenshot with its own
// status bar visible.
// Was Air-only. Every other device (16 Pro Max, 17 Pro Max, 17 Pro) was
// still using the raw Apple-spec topGap with no correction, which is why
// only the Air's painted status bar lined up with its actual island/notch
// — same underlying mismatch, just previously only fixed in one place.
// "default" now carries the Air's working value; add a device-specific
// entry here only if a particular model still looks off after this.
const STATUS_BAR_TOP_GAP_OVERRIDE_PT = {
  default: 3,
  "iPhone 17 Pro Max": -1,
  "iPhone 15 Pro Max": -2,
  "iPhone 15 Pro": -2,
  "iPhone 14 Pro Max": -2,
  "iPhone 14 Pro": -2,
  "iPhone 14 Plus": -6, // notch, not Dynamic Island — same treatment as the 13 family
  "iPhone 14": -6,
};
function getStatusBarCenterY(deviceLabel) {
  const gap = STATUS_BAR_TOP_GAP_OVERRIDE_PT[deviceLabel] ?? STATUS_BAR_TOP_GAP_OVERRIDE_PT.default;
  return DYNAMIC_ISLAND_SPEC.topGap + gap + DYNAMIC_ISLAND_SPEC.height / 2;
}
// Per-device multiplier on status-bar icon/text size, on top of the normal
// pt->canvas mapping. 1 = no change. Bump up for devices whose chrome
// reads smaller than real iOS once mapped onto their screen texture.
// Same reasoning as STATUS_BAR_TOP_GAP_OVERRIDE_PT above — the Air's 1.15
// scale read correctly against its screen, so it becomes the shared
// default rather than a one-off. Override a specific device here if its
// chrome still reads too small/large once this lands.
const STATUS_BAR_SCALE_OVERRIDE = {
  default: 1.15,
  "iPhone 17": 1.05,
  "iPhone Air": 1.05,
  "iPhone 16 Pro": 1.05,
  "iPhone 15 Pro": 1,
 "iPhone 14 Pro": 1,
  "iPhone 14 Plus": 1.1,
  "iPhone 14": 1,
};
function getStatusBarScale(deviceLabel) {
  return STATUS_BAR_SCALE_OVERRIDE[deviceLabel] ?? STATUS_BAR_SCALE_OVERRIDE.default;
}
// Per-device multiplier on top of the normal brightness-slider -> emissiveIntensity
// mapping. 1 = no change. Some device exports' screen material bakes in a
// different base emissive response, so the same slider value can render
// visibly dimmer/brighter than on other models — use this to compensate.
const SCREEN_EMISSIVE_SCALE = {
  "iPhone 17 Pro Max": 1.0,
  "iPhone 17 Pro": 1.0,
  "iPhone 15 Pro Max": 1.9,
};
function getScreenEmissiveScale(deviceLabel) {
  return SCREEN_EMISSIVE_SCALE[deviceLabel] ?? 1;
}

// Horizontal correction (in pt), applied to BOTH ear clusters equally, to
// compensate for exports whose baked-in Dynamic Island geometry isn't
// perfectly centered on the screen mesh's own UV bounds. Our own status-bar
// math assumes a perfectly centered island (per Apple's real spec — the DI
// is always centered on-screen) — this only exists to correct for drift in
// THIS particular model export. Positive = shift the clock/cellular cluster
// right, negative = left. Tune by comparing the rendered status bar against
// the visible pill in the viewport, then adjust in small increments (~1-2pt).
const STATUS_BAR_CENTER_X_OFFSET_PT = {
  "iPhone 17": 0,
  // Nudge in pt if the painted status bar still doesn't sit centered on the
  // ISLAND_MESH pill above once rendered — should be close to 0 now that the
  // mesh itself is centered, but the screen texture's own crop/UV mapping
  // can still introduce a small residual shift worth compensating for here.
  "iPhone Air": 0,
};
function getStatusBarCenterXOffset(deviceLabel) {
  return STATUS_BAR_CENTER_X_OFFSET_PT[deviceLabel] ?? 0;
}

// Mean luminance (0-1) of a device-pixel rect. Used to pick black vs white chrome.
function averageLuminance(ctx, x, y, w, h) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const px = Math.min(cw - 1, Math.max(0, Math.round(x)));
  const py = Math.min(ch - 1, Math.max(0, Math.round(y)));
  const pw = Math.max(1, Math.min(cw - px, Math.round(w)));
  const ph = Math.max(1, Math.min(ch - py, Math.round(h)));
  try {
    const d = ctx.getImageData(px, py, pw, ph).data;
    let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { // every 4th pixel is plenty
      sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      n++;
    }
    return n ? sum / n / 255 : 1;
  } catch {
    return 1; // tainted canvas: fall back to dark chrome
  }
}

function drawWifiGlyph(ctx, x, cy) {
  const cx = x + 8.5;
  const by = cy + 6; // fan apex sits at the bottom of the 12pt-tall glyph
  const a0 = (-3 * Math.PI) / 4, a1 = -Math.PI / 4;
  [[12, 9.4], [7.9, 5.3]].forEach(([rOut, rIn]) => {
    ctx.beginPath();
    ctx.arc(cx, by, rOut, a0, a1);
    ctx.arc(cx, by, rIn, a1, a0, true);
    ctx.closePath();
    ctx.fill();
  });
  ctx.beginPath();
  ctx.moveTo(cx, by);
  ctx.arc(cx, by, 3.6, a0, a1);
  ctx.closePath();
  ctx.fill();
}

function drawBatteryGlyph(ctx, x, cy) {
  const y = cy - 6;
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  roundedRectPath(ctx, x + 0.5, y + 0.5, 24, 11, 3.6);
  ctx.stroke();
  roundedRectPath(ctx, x + 26, cy - 2.1, 1.5, 4.2, 0.75); // terminal nub
  ctx.fill();
  ctx.restore();
  roundedRectPath(ctx, x + 2, y + 2, 21, 8, 2.2); // charge level (full)
  ctx.fill();
}

function drawStatusBar(ctx, W, color, scale = 1, offsetPt = 0, centerY = DYNAMIC_ISLAND_SPEC.topGap + DYNAMIC_ISLAND_SPEC.height / 2) {
  const cy = centerY;
  const shift = offsetPt / 2; // see STATUS_BAR_CENTER_X_OFFSET_PT comment — each ear only moves half as far as the island itself
  const earBase = (W - STATUS_BAR.islandW) / 4; // centre of each ear, measured from its own screen edge
  const earC = earBase + shift;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  // Clock, centred in the left ear. Scaled around its OWN anchor
  // (earC, cy) rather than the canvas origin — scaling from x=0 would
  // multiply its x position too and drag it sideways.
  ctx.save();
  ctx.translate(earC, cy);
  ctx.scale(scale, scale);
  ctx.translate(-earC, -cy);
  ctx.font = STATUS_BAR.timeFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("9:41", earC, cy + 6);
  ctx.restore();

  // Cellular + Wi-Fi + battery, centred in the right ear
  const SIG_W = 18, WIFI_W = 17, BATT_W = 27.5, GAP = 6;
  const clusterW = SIG_W + WIFI_W + BATT_W + GAP * 2;
  const clusterCenterX = (W - earBase) + shift;

  // Same fix here: scale around the cluster's own center point, not the
  // canvas origin. This cluster sits near x≈W, so scaling from x=0 (the
  // previous bug) pushed it — and the battery glyph specifically — past
  // the right edge of the canvas, which is why it disappeared.
  ctx.save();
  ctx.translate(clusterCenterX, cy);
  ctx.scale(scale, scale);
  ctx.translate(-clusterCenterX, -cy);

  let x = clusterCenterX - clusterW / 2;

  [4, 6.5, 9, 11.5].forEach((h, i) => {
    roundedRectPath(ctx, x + i * 4.9, cy + 5.75 - h, 3, h, 1);
    ctx.fill();
  });
  x += SIG_W + GAP;

  drawWifiGlyph(ctx, x, cy);
  x += WIFI_W + GAP;

  drawBatteryGlyph(ctx, x, cy);
  ctx.restore();

  ctx.restore();
}

function drawHomeIndicator(ctx, W, H, color, bottomGap) {
  const { width: w, height: h } = HOME_INDICATOR_SPEC;
  ctx.save();
  ctx.fillStyle = color;
  roundedRectPath(ctx, (W - w) / 2, H - bottomGap - h, w, h, h / 2);
  ctx.fill();
  ctx.restore();
}

// W/H are the texture's base units (before SCREEN_TEXTURE_SCALE). Call after the screenshot is painted.
const NO_SCREEN_CHROME = { 'MacBook Pro 14"': true, 'MacBook Pro 16"': true, "MacBook Air": true, "Pro Display XDR": true };

// --- Desktop chrome: macOS menu bar + browser header ------------------------
// Painted into the screen texture like the phone status bar, in logical points.
const MENU_BAR_H = 37; // notched-MacBook menu bar height; also the strip the physical notch sits in
const BROWSER_HEADER_H = { safari: 52, chrome: 82, arc: 46, edge: 82 };
const DEFAULT_BROWSER_URL = "bezel.app";
const DESKTOP_UI_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif';
const MENU_BAR_MENUS = {
  none: { app: "Finder", items: ["File", "Edit", "View", "Go", "Window", "Help"] },
  safari: { app: "Safari", items: ["File", "Edit", "View", "History", "Bookmarks", "Window", "Help"] },
  chrome: { app: "Chrome", items: ["File", "Edit", "View", "History", "Bookmarks", "Profiles", "Tab", "Window", "Help"] },
  arc: { app: "Arc", items: ["File", "Edit", "View", "Spaces", "Tabs", "Archive", "Window", "Help"] },
  edge: { app: "Microsoft Edge", items: ["File", "Edit", "View", "Favorites", "History", "Profiles", "Tab", "Window", "Help"] },
};
// Apple logo as a 24x24 path (a font glyph would only render on Apple platforms).
const APPLE_LOGO_SVG =
  "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701";

// Notched MacBooks: the social UI always starts below the menu bar strip (the notch's safe area).
const NOTCHED_MACS = { 'MacBook Pro 14"': true, 'MacBook Pro 16"': true, "MacBook Air": true };
const getSocialTopInsetPt = (deviceLabel, overlays) =>
  NOTCHED_MACS[deviceLabel] || (NO_SCREEN_CHROME[deviceLabel] && overlays?.menuBar) ? MENU_BAR_H : 0;

// Screenshot top offset (pt). With a browser header the screenshot becomes the page viewport
// below it; the strip above the header is the notch safe area (black, or the menu bar).
function getDesktopContentTopPt(deviceLabel, overlays) {
  if (!NO_SCREEN_CHROME[deviceLabel]) return 0;
  const browser = overlays?.browser ?? "none";
  const barH = overlays?.menuBar ? MENU_BAR_H : 0;
  return browser === "none" ? barH : barH + BROWSER_HEADER_H[browser];
}

// --- Mobile browser chrome (Safari / Chrome on iPhone) ----------------------
// Approximate portrait safe-area insets in points. The screenshot sits between them and the bars.
const PHONE_SAFE_AREA = {
  default: { top: 59, bottom: 34 }, // 16 Plus, 16, 15 Pro Max, 15 Pro, 14 Pro Max, 14 Pro
  "iPhone 17 Pro Max": { top: 62, bottom: 34 },
  "iPhone 17 Pro": { top: 62, bottom: 34 },
  "iPhone 17": { top: 62, bottom: 34 },
  "iPhone Air": { top: 68, bottom: 34 },
  "iPhone 16 Pro Max": { top: 62, bottom: 34 },
  "iPhone 16 Pro": { top: 62, bottom: 34 },
  "iPhone 14 Plus": { top: 47, bottom: 34 },
  "iPhone 14": { top: 47, bottom: 34 },
};
// Bar heights in pt, on top of the safe-area insets above.
const PHONE_BROWSER_LAYOUT = {
  safari: { top: 0, bottom: 92 }, // bottom = 48 address row + 44 toolbar row
  safariTop: { top: 52, bottom: 44 }, // Safari with the address field at the top
  chrome: { top: 52, bottom: 44 },
  arc: { top: 0, bottom: 50 }, // Arc Search: slim toolbar, no address bar
  edge: { top: 0, bottom: 92 }, // Edge iOS: bottom address bar + toolbar row
};

function getPhoneBrowserMetrics(deviceLabel, overlays) {
  const browser = overlays?.browser ?? "none";
  const key = browser === "safari" && overlays?.browserTabs === "top" ? "safariTop" : browser;
  if (WATCH_DEVICES[deviceLabel] || NO_SCREEN_CHROME[deviceLabel] || !PHONE_BROWSER_LAYOUT[key]) return null;
  const sa = PHONE_SAFE_AREA[deviceLabel] ?? PHONE_SAFE_AREA.default;
  const bar = PHONE_BROWSER_LAYOUT[key];
  return { safeTop: sa.top, safeBottom: sa.bottom, topBar: bar.top, bottomBar: bar.bottom };
}

// How far (pt) the screenshot is inset from the top / bottom of the display.
function getContentInsetsPt(deviceLabel, overlays) {
  if (TABLET_DEVICES[deviceLabel]) {
    const b = overlays?.browser ?? "none";
    return b === "none" ? { top: 0, bottom: 0 } : { top: TABLET_STATUS_H + TABLET_BROWSER_H[b], bottom: 0 };
  }
  if (NO_SCREEN_CHROME[deviceLabel]) {
    return { top: getDesktopContentTopPt(deviceLabel, overlays), bottom: 0 };
  }
  const m = getPhoneBrowserMetrics(deviceLabel, overlays);
  return m
    ? { top: m.safeTop + m.topBar, bottom: m.bottomBar + m.safeBottom }
    : { top: 0, bottom: 0 };
}

function scaledGlyph(ctx, cx, cy, s, draw) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  draw(0, 0);
  ctx.restore();
}

function drawBookGlyph(ctx, cx, cy, color) {
  ctx.save();
  setIconStyle(ctx, color, 1.4);
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 6);
  ctx.moveTo(cx, cy - 5);
  ctx.quadraticCurveTo(cx - 3, cy - 7, cx - 8, cy - 5.5);
  ctx.lineTo(cx - 8, cy + 5.5);
  ctx.quadraticCurveTo(cx - 3, cy + 4, cx, cy + 6);
  ctx.quadraticCurveTo(cx + 3, cy + 4, cx + 8, cy + 5.5);
  ctx.lineTo(cx + 8, cy - 5.5);
  ctx.quadraticCurveTo(cx + 3, cy - 7, cx, cy - 5);
  ctx.stroke();
  ctx.restore();
}

// Paints the bars in pt space (ctx already translated/scaled to the display, lw x lh pt).
function drawPhoneBrowser(ctx, lw, lh, m, browser, dark, url) {
  if (browser === "arc") return drawPhoneArc(ctx, lw, lh, m, dark, url);
  if (browser === "edge") return drawPhoneEdge(ctx, lw, lh, m, dark, url);
  const isSafari = browser === "safari";
  const c = isSafari
    ? dark
      ? { bg: "#1C1C1E", field: "rgba(255,255,255,0.14)", icon: "#0A84FF", text: "#FFFFFF", line: "rgba(255,255,255,0.12)" }
      : { bg: "#F2F2F2", field: "rgba(0,0,0,0.07)", icon: "#007AFF", text: "#000000", line: "rgba(0,0,0,0.15)" }
    : browser === "edge"
      ? dark
        ? { bg: "#1F1F1F", field: "#333333", icon: "#9FB3C8", text: "#F0F0F0", line: "rgba(255,255,255,0.12)" }
        : { bg: "#F5F8FC", field: "#E6ECF5", icon: "#4B5B6E", text: "#1B2430", line: "rgba(0,0,0,0.12)" }
      : dark
        ? { bg: "#202124", field: "#3C4043", icon: "#9AA0A6", text: "#E8EAED", line: "rgba(255,255,255,0.12)" }
        : { bg: "#FFFFFF", field: "#F1F3F4", icon: "#5F6368", text: "#202124", line: "rgba(0,0,0,0.12)" };

  const topH = m.safeTop + m.topBar;
  const botY = lh - m.safeBottom - m.bottomBar;
  const slot = (i) => (lw * (i + 0.5)) / 5; // five evenly spaced toolbar buttons

  ctx.save();
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, lw, topH);
  ctx.fillRect(0, botY, lw, lh - botY + 1);
  ctx.fillStyle = c.line;
  ctx.fillRect(0, botY, lw, 0.5);
  if (m.topBar > 0) ctx.fillRect(0, topH - 0.5, lw, 0.5);

  ctx.textBaseline = "middle";

  // Centered lock + host inside a field
  const drawFieldText = (fx, fw, cy, maxW) => {
    ctx.font = `400 16px ${DESKTOP_UI_FONT}`;
    ctx.textAlign = "left";
    const shown = fitText(ctx, url, maxW);
    const tw = ctx.measureText(shown).width;
    const startX = fx + fw / 2 - (16 + tw) / 2;
    scaledGlyph(ctx, startX + 5, cy + 0.5, 1.2, (x, y) => drawLockGlyph(ctx, x, y, c.text));
    ctx.fillStyle = c.text;
    ctx.fillText(shown, startX + 16, cy);
  };

  if (isSafari) {
    const tabsTop = m.topBar > 0;
    const fx = 16, fw = lw - 32, fh = 40, fy = tabsTop ? m.safeTop + 6 : botY + 5, cy = fy + fh / 2;
    roundedRectPath(ctx, fx, fy, fw, fh, 12);
    ctx.fillStyle = c.field;
    ctx.fill();

    ctx.fillStyle = c.text;
    ctx.textAlign = "left";
    ctx.font = `400 12px ${DESKTOP_UI_FONT}`;
    ctx.fillText("A", fx + 14, cy);
    ctx.font = `400 18px ${DESKTOP_UI_FONT}`;
    ctx.fillText("A", fx + 22, cy);
    drawFieldText(fx, fw, cy, fw - 110);
    drawReloadGlyph(ctx, fx + fw - 22, cy, c.text, 7);

    const ty = tabsTop ? botY + 22 : botY + 48 + 22; // toolbar row
    scaledGlyph(ctx, slot(0), ty, 1.3, (x, y) => drawChevron(ctx, x, y, -1, c.icon));
    scaledGlyph(ctx, slot(1), ty, 1.3, (x, y) => drawChevron(ctx, x, y, 1, c.icon, 0.35));
    scaledGlyph(ctx, slot(2), ty, 1.25, (x, y) => drawShareGlyph(ctx, x, y, c.icon));
    scaledGlyph(ctx, slot(3), ty, 1.25, (x, y) => drawBookGlyph(ctx, x, y, c.icon));
    scaledGlyph(ctx, slot(4), ty, 1.25, (x, y) => drawTabsGlyph(ctx, x, y, c.icon));
  } else {
    // Chrome: omnibox under the status bar
    const fx = 12, fw = lw - 24, fh = 40, fy = m.safeTop + 6, cy = fy + fh / 2;
    roundedRectPath(ctx, fx, fy, fw, fh, browser === "edge" ? 12 : 20);
    ctx.fillStyle = c.field;
    ctx.fill();
    drawFieldText(fx, fw, cy, fw - 100);
    if (browser === "edge") drawEdgeLogo(ctx, fx + 22, cy, 8);
    scaledGlyph(ctx, fx + fw - 24, cy, 1.1, (x, y) => drawShareGlyph(ctx, x, y, c.icon));

    // Bottom toolbar
    const ty = botY + 22;
    scaledGlyph(ctx, slot(0), ty, 1.3, (x, y) => drawChevron(ctx, x, y, -1, c.icon));
    scaledGlyph(ctx, slot(1), ty, 1.3, (x, y) => drawChevron(ctx, x, y, 1, c.icon, 0.35));
    drawPlusGlyph(ctx, slot(2), ty, c.icon, 8);
    scaledGlyph(ctx, slot(3), ty, 1, (x, y) => {
      setIconStyle(ctx, c.icon, 1.6);
      roundedRectPath(ctx, x - 8, y - 8, 16, 16, 4);
      ctx.stroke();
      ctx.font = `600 10px ${DESKTOP_UI_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = c.icon;
      ctx.fillText("1", x, y + 0.5);
    });
    ctx.fillStyle = c.icon;
    [-6, 0, 6].forEach((dx) => {
      ctx.beginPath();
      ctx.arc(slot(4) + dx, ty, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

function setIconStyle(ctx, color, width = 1.6) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function drawTrafficLights(ctx, x, cy) {
  ["#FF5F57", "#FEBC2E", "#28C840"].forEach((col, i) => {
    ctx.beginPath();
    ctx.arc(x + i * 20, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });
}

function drawLockGlyph(ctx, cx, cy, color) {
  ctx.save();
  setIconStyle(ctx, color, 1.3);
  roundedRectPath(ctx, cx - 4, cy - 0.5, 8, 6.5, 1.6);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 2.6, cy - 0.5);
  ctx.lineTo(cx - 2.6, cy - 2.2);
  ctx.arc(cx, cy - 2.2, 2.6, Math.PI, 0);
  ctx.lineTo(cx + 2.6, cy - 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawChevron(ctx, cx, cy, dir, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  setIconStyle(ctx, color, 2);
  ctx.beginPath();
  ctx.moveTo(cx - dir * 2.5, cy - 6.5);
  ctx.lineTo(cx + dir * 2.5, cy);
  ctx.lineTo(cx - dir * 2.5, cy + 6.5);
  ctx.stroke();
  ctx.restore();
}

function drawArrow(ctx, cx, cy, dir, color) {
  ctx.save();
  setIconStyle(ctx, color, 1.6);
  ctx.beginPath();
  ctx.moveTo(cx - dir * 6.5, cy);
  ctx.lineTo(cx + dir * 6.5, cy);
  ctx.moveTo(cx + dir * 1.5, cy - 5);
  ctx.lineTo(cx + dir * 6.5, cy);
  ctx.lineTo(cx + dir * 1.5, cy + 5);
  ctx.stroke();
  ctx.restore();
}

function drawReloadGlyph(ctx, cx, cy, color, r = 5.5) {
  ctx.save();
  setIconStyle(ctx, color, 1.5);
  // ~290deg arc drawn clockwise, gap at the upper right, arrow head on the end pointing into the gap
  const a0 = -Math.PI / 3;
  const a1 = a0 + (Math.PI * 290) / 180;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
  const ex = cx + Math.cos(a1) * r, ey = cy + Math.sin(a1) * r;
  const tx = -Math.sin(a1), ty = Math.cos(a1); // clockwise tangent
  const nx = Math.cos(a1), ny = Math.sin(a1);  // outward normal
  ctx.beginPath();
  ctx.moveTo(ex + tx * 3.6, ey + ty * 3.6);
  ctx.lineTo(ex + nx * 2.8, ey + ny * 2.8);
  ctx.lineTo(ex - nx * 2.8, ey - ny * 2.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawShareGlyph(ctx, cx, cy, color) {
  ctx.save();
  setIconStyle(ctx, color, 1.5);
  ctx.beginPath();
  ctx.moveTo(cx - 3.2, cy - 1.6); ctx.lineTo(cx - 6, cy - 1.6); ctx.lineTo(cx - 6, cy + 7); ctx.lineTo(cx + 6, cy + 7); ctx.lineTo(cx + 6, cy - 1.6); ctx.lineTo(cx + 3.2, cy - 1.6);
  ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy - 8);
  ctx.moveTo(cx - 3.4, cy - 4.6); ctx.lineTo(cx, cy - 8.2); ctx.lineTo(cx + 3.4, cy - 4.6);
  ctx.stroke();
  ctx.restore();
}

function drawPlusGlyph(ctx, cx, cy, color, r = 6) {
  ctx.save();
  setIconStyle(ctx, color, 1.6);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
  ctx.stroke();
  ctx.restore();
}

function drawTabsGlyph(ctx, cx, cy, color) {
  ctx.save();
  setIconStyle(ctx, color, 1.4);
  roundedRectPath(ctx, cx - 7, cy - 3, 10.5, 10.5, 2.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 3.2, cy - 5.4); ctx.lineTo(cx - 3.2, cy - 7 + 1.4);
  ctx.quadraticCurveTo(cx - 3.2, cy - 7.2, cx - 1.6, cy - 7.2);
  ctx.lineTo(cx + 5.2, cy - 7.2);
  ctx.quadraticCurveTo(cx + 7, cy - 7.2, cx + 7, cy - 5.4);
  ctx.lineTo(cx + 7, cy + 2.4);
  ctx.quadraticCurveTo(cx + 7, cy + 4.2, cx + 5.2, cy + 4.2);
  ctx.lineTo(cx + 3.6, cy + 4.2);
  ctx.stroke();
  ctx.restore();
}

function drawSidebarGlyph(ctx, cx, cy, color) {
  ctx.save();
  setIconStyle(ctx, color, 1.4);
  roundedRectPath(ctx, cx - 9.5, cy - 7.5, 19, 15, 3.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 7.5); ctx.lineTo(cx - 3, cy + 7.5);
  ctx.moveTo(cx - 7, cy - 3); ctx.lineTo(cx - 5.2, cy - 3);
  ctx.moveTo(cx - 7, cy); ctx.lineTo(cx - 5.2, cy);
  ctx.stroke();
  ctx.restore();
}

function drawStarGlyph(ctx, cx, cy, color, r = 7) {
  ctx.save();
  setIconStyle(ctx, color, 1.4);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad + 0.5;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawKebabGlyph(ctx, cx, cy, color) {
  ctx.save();
  ctx.fillStyle = color;
  [-5.5, 0, 5.5].forEach((dy) => { ctx.beginPath(); ctx.arc(cx, cy + dy, 1.6, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}

function drawGlobeGlyph(ctx, cx, cy, color, r = 7) {
  ctx.save();
  setIconStyle(ctx, color, 1.2);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.42, r, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
  ctx.restore();
}

function drawCloseGlyph(ctx, cx, cy, color, r = 3.6) {
  ctx.save();
  setIconStyle(ctx, color, 1.4);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
  ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
  ctx.stroke();
  ctx.restore();
}

function drawSearchGlyph(ctx, x, cy) {
  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(x + 5.6, cy - 1, 4.6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 9, cy + 2.4); ctx.lineTo(x + 13, cy + 6.4); ctx.stroke();
  ctx.restore();
}

function drawControlCenterGlyph(ctx, x, cy) {
  ctx.save();
  ctx.lineWidth = 1.2;
  [0, 1].forEach((i) => {
    const y = cy - 6.6 + i * 7.4;
    roundedRectPath(ctx, x, y, 16, 5.8, 2.9);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(i === 0 ? x + 3.9 : x + 12.1, y + 2.9, 1.7, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

function drawMenuBar(ctx, W, color, browser) {
  const menu = MENU_BAR_MENUS[browser] ?? MENU_BAR_MENUS.none;
  const cy = MENU_BAR_H / 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  ctx.save();
  ctx.translate(17, cy - 7.6);
  ctx.scale(0.62, 0.62);
  ctx.fill(new Path2D(APPLE_LOGO_SVG));
  ctx.restore();

  // Left cluster: app name (bold) + its menus. Nothing is drawn under the notch.
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let x = 44;
  ctx.font = `700 13px ${DESKTOP_UI_FONT}`;
  ctx.fillText(menu.app, x, cy + 0.5);
  x += ctx.measureText(menu.app).width + 20;
  ctx.font = `400 13px ${DESKTOP_UI_FONT}`;
  menu.items.forEach((label) => {
    ctx.fillText(label, x, cy + 0.5);
    x += ctx.measureText(label).width + 20;
  });

  // Right cluster (right -> left): clock, control center, spotlight, wi-fi, battery
  const clock = "Mon Jun 9  9:41 AM";
  ctx.textAlign = "right";
  ctx.fillText(clock, W - 16, cy + 0.5);
  let rx = W - 16 - ctx.measureText(clock).width - 16;
  rx -= 16; drawControlCenterGlyph(ctx, rx, cy); rx -= 16;
  rx -= 14; drawSearchGlyph(ctx, rx, cy); rx -= 16;
  rx -= 17; drawWifiGlyph(ctx, rx, cy); rx -= 16;
  rx -= 27.5; drawBatteryGlyph(ctx, rx, cy);
  ctx.restore();
}

function drawSafariHeader(ctx, W, y0, dark, url) {
  const H = BROWSER_HEADER_H.safari;
  const c = dark
    ? { bg: "#2B2B2D", line: "rgba(0,0,0,0.55)", icon: "#B8B8BC", text: "#F2F2F7", field: "rgba(255,255,255,0.10)" }
    : { bg: "#F4F4F4", line: "rgba(0,0,0,0.13)", icon: "#5C5C60", text: "#1D1D1F", field: "rgba(0,0,0,0.06)" };
  const cy = y0 + H / 2;

  ctx.save();
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, y0, W, H);
  ctx.fillStyle = c.line;
  ctx.fillRect(0, y0 + H - 1, W, 1);

  drawTrafficLights(ctx, 20, cy);
  drawSidebarGlyph(ctx, 104, cy, c.icon);
  drawChevron(ctx, 152, cy, -1, c.icon);
  drawChevron(ctx, 186, cy, 1, c.icon, 0.4);

  // Centered address field
  const fw = Math.min(640, Math.max(360, W * 0.4));
  const fx = (W - fw) / 2, fh = 30, fy = cy - fh / 2;
  roundedRectPath(ctx, fx, fy, fw, fh, 8);
  ctx.fillStyle = c.field;
  ctx.fill();
  ctx.font = `400 13px ${DESKTOP_UI_FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const shown = fitText(ctx, url, fw - 90);
  const tw = ctx.measureText(shown).width;
  const startX = fx + fw / 2 - (12 + tw) / 2;
  drawLockGlyph(ctx, startX + 4, cy + 0.5, c.icon);
  ctx.fillStyle = c.text;
  ctx.fillText(shown, startX + 12, cy + 0.5);
  drawReloadGlyph(ctx, fx + fw - 18, cy, c.icon, 5);

  // Right cluster
  drawShareGlyph(ctx, W - 140, cy, c.icon);
  drawPlusGlyph(ctx, W - 98, cy, c.icon);
  drawTabsGlyph(ctx, W - 56, cy, c.icon);
  ctx.restore();
}

function drawChromeHeader(ctx, W, y0, dark, url) {
  const STRIP = 41;
  const H = BROWSER_HEADER_H.chrome;
  const c = dark
    ? { strip: "#202124", active: "#35363A", omni: "#202124", icon: "#9AA0A6", text: "#E8EAED", line: "rgba(0,0,0,0.5)" }
    : { strip: "#DEE1E6", active: "#FFFFFF", omni: "#F1F3F4", icon: "#5F6368", text: "#202124", line: "rgba(0,0,0,0.14)" };

  ctx.save();
  ctx.fillStyle = c.strip;
  ctx.fillRect(0, y0, W, STRIP);
  ctx.fillStyle = c.active;
  ctx.fillRect(0, y0 + STRIP, W, H - STRIP);
  ctx.fillStyle = c.line;
  ctx.fillRect(0, y0 + H - 1, W, 1);

  // Tab strip
  const sy = y0 + STRIP / 2;
  drawTrafficLights(ctx, 20, sy);
  const tx = 86, ty = y0 + 8, tw = 240, th = STRIP - 8, r = 9;
  ctx.fillStyle = c.active;
  ctx.beginPath();
  ctx.moveTo(tx - 8, ty + th); ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - 8);      // left foot
  ctx.lineTo(tx, ty + r); ctx.quadraticCurveTo(tx, ty, tx + r, ty);
  ctx.lineTo(tx + tw - r, ty); ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + r);
  ctx.lineTo(tx + tw, ty + th - 8); ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw + 8, ty + th); // right foot
  ctx.closePath();
  ctx.fill();
  drawGlobeGlyph(ctx, tx + 20, ty + th / 2 - 0.5, c.icon, 6.5);
  ctx.font = `400 12px ${DESKTOP_UI_FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = c.text;
  ctx.fillText(fitText(ctx, url, tw - 76), tx + 36, ty + th / 2);
  drawCloseGlyph(ctx, tx + tw - 18, ty + th / 2, c.icon);
  drawPlusGlyph(ctx, tx + tw + 26, ty + th / 2, c.icon, 5.5);

  // Toolbar
  const cy = y0 + STRIP + (H - STRIP) / 2;
  drawArrow(ctx, 30, cy, -1, c.icon);
  drawArrow(ctx, 66, cy, 1, c.icon);
  drawReloadGlyph(ctx, 102, cy, c.icon, 6);

  const ox = 128, oh = 32, oy = cy - oh / 2, ow = W - ox - 128;
  roundedRectPath(ctx, ox, oy, ow, oh, 16);
  ctx.fillStyle = c.omni;
  ctx.fill();
  drawLockGlyph(ctx, ox + 20, cy + 0.5, c.icon);
  ctx.font = `400 14px ${DESKTOP_UI_FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = c.text;
  ctx.fillText(fitText(ctx, url, ow - 80), ox + 40, cy + 0.5);
  drawStarGlyph(ctx, ox + ow - 22, cy, c.icon, 7);

  // Profile + menu
  ctx.beginPath();
  ctx.arc(W - 74, cy, 11, 0, Math.PI * 2);
  ctx.fillStyle = dark ? "#8AB4F8" : "#1A73E8";
  ctx.fill();
  ctx.fillStyle = dark ? "#202124" : "#FFFFFF";
  ctx.beginPath(); ctx.arc(W - 74, cy - 2.6, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W - 74, cy + 7.4, 5.6, Math.PI * 1.15, Math.PI * 1.85); ctx.fill();
  drawKebabGlyph(ctx, W - 36, cy, c.icon);
  ctx.restore();
}

const ARC_COLORS = (dark) =>
  dark
    ? { from: "#2B2644", to: "#3A2740", pill: "rgba(255,255,255,0.12)", icon: "#C9C4DE", text: "#F2F0FA", line: "rgba(0,0,0,0.45)" }
    : { from: "#E6E0F5", to: "#F3DFEA", pill: "rgba(255,255,255,0.65)", icon: "#4A4560", text: "#1F1B2E", line: "rgba(0,0,0,0.10)" };

const EDGE_COLORS = (dark) =>
  dark
    ? { strip: "#1B1B1B", active: "#2B2B2B", omni: "#1F1F1F", icon: "#9FB3C8", text: "#F0F0F0", line: "rgba(0,0,0,0.5)" }
    : { strip: "#DDE5F0", active: "#FFFFFF", omni: "#EEF2F8", icon: "#4B5B6E", text: "#1B2430", line: "rgba(0,0,0,0.14)" };

function drawEdgeLogo(ctx, cx, cy, r) {
  ctx.save();
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, "#1B9DE2");
  g.addColorStop(1, "#35D6A4");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${r * 1.5}px ${DESKTOP_UI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("e", cx, cy + r * 0.08);
  ctx.restore();
}

// Arc: colorful gradient bar with a floating, rounded URL pill. `tablet` skips the traffic lights.
function drawArcHeader(ctx, W, y0, dark, url, tablet = false) {
  const H = BROWSER_HEADER_H.arc;
  const c = ARC_COLORS(dark);
  const cy = y0 + H / 2;

  ctx.save();
  const g = ctx.createLinearGradient(0, y0, W, y0);
  g.addColorStop(0, c.from);
  g.addColorStop(1, c.to);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, H);
  ctx.fillStyle = c.line;
  ctx.fillRect(0, y0 + H - 1, W, 1);

  const left = tablet ? 20 : 104;
  if (!tablet) drawTrafficLights(ctx, 20, cy);
  drawSidebarGlyph(ctx, left + (tablet ? 10 : 0), cy, c.icon);
  drawChevron(ctx, left + 48, cy, -1, c.icon);
  drawChevron(ctx, left + 82, cy, 1, c.icon, 0.4);
  drawReloadGlyph(ctx, left + 116, cy, c.icon, 5.5);

  const fw = Math.min(520, Math.max(280, W * 0.34));
  const fx = (W - fw) / 2, fh = 30, fy = cy - fh / 2;
  roundedRectPath(ctx, fx, fy, fw, fh, 10);
  ctx.fillStyle = c.pill;
  ctx.fill();
  ctx.font = `500 13px ${DESKTOP_UI_FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const shown = fitText(ctx, url, fw - 70);
  const tw = ctx.measureText(shown).width;
  const startX = fx + fw / 2 - (12 + tw) / 2;
  drawLockGlyph(ctx, startX + 4, cy + 0.5, c.icon);
  ctx.fillStyle = c.text;
  ctx.fillText(shown, startX + 12, cy + 0.5);

  drawPlusGlyph(ctx, W - 98, cy, c.icon);
  drawTabsGlyph(ctx, W - 56, cy, c.icon);
  ctx.restore();
}

// Arc Search (iPhone): slim bottom toolbar with tabs (left), search (center), and a chevron-up menu (right).
function drawPhoneArc(ctx, lw, lh, m, dark, url) {
  const c = dark
    ? { bg: "#1C1C1E", icon: "#FFFFFF", line: "rgba(255,255,255,0.12)" }
    : { bg: "#F7F7F9", icon: "#1C1C1E", line: "rgba(0,0,0,0.12)" };
  const botY = lh - m.safeBottom - m.bottomBar;
  const cy = botY + m.bottomBar / 2;

  ctx.save();
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, lw, m.safeTop); // area behind the status bar
  ctx.fillRect(0, botY, lw, lh - botY + 1);
  ctx.fillStyle = c.line;
  ctx.fillRect(0, botY, lw, 0.5);

  scaledGlyph(ctx, 44, cy, 1.25, (x, y) => drawTabsGlyph(ctx, x, y, c.icon));
  scaledGlyph(ctx, lw / 2, cy, 1.3, (x, y) => {
    ctx.strokeStyle = c.icon;
    drawSearchGlyph(ctx, x - 6.5, y);
  });
  scaledGlyph(ctx, lw - 44, cy, 1.25, (x, y) => {
    setIconStyle(ctx, c.icon, 2);
    ctx.beginPath();
    ctx.moveTo(x - 6.5, y + 3);
    ctx.lineTo(x, y - 3);
    ctx.lineTo(x + 6.5, y + 3);
    ctx.stroke();
  });
  ctx.restore();
}

// Microsoft Edge (iPhone): bottom address bar, then a toolbar row with a center menu button.
function drawPhoneEdge(ctx, lw, lh, m, dark, url) {
  const c = dark
    ? { bg: "#1F1F1F", field: "#333333", icon: "#9FB3C8", text: "#F0F0F0", line: "rgba(255,255,255,0.12)" }
    : { bg: "#F5F8FC", field: "#E6ECF5", icon: "#4B5B6E", text: "#1B2430", line: "rgba(0,0,0,0.12)" };
  const botY = lh - m.safeBottom - m.bottomBar;
  const slot = (i) => (lw * (i + 0.5)) / 5;

  ctx.save();
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, lw, m.safeTop); // area behind the status bar
  ctx.fillRect(0, botY, lw, lh - botY + 1);
  ctx.fillStyle = c.line;
  ctx.fillRect(0, botY, lw, 0.5);

  // Address row
  const fx = 12, fw = lw - 24, fh = 40, fy = botY + 6, cy = fy + fh / 2;
  roundedRectPath(ctx, fx, fy, fw, fh, 20);
  ctx.fillStyle = c.field;
  ctx.fill();
  drawEdgeLogo(ctx, fx + 22, cy, 8);
  ctx.font = `400 16px ${DESKTOP_UI_FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = c.text;
  ctx.fillText(fitText(ctx, url, fw - 100), fx + 42, cy);
  drawReloadGlyph(ctx, fx + fw - 24, cy, c.icon, 6);

  // Toolbar row: back, forward, center menu, share, tabs
  const ty = botY + 48 + 22;
  scaledGlyph(ctx, slot(0), ty, 1.3, (x, y) => drawChevron(ctx, x, y, -1, c.icon));
  scaledGlyph(ctx, slot(1), ty, 1.3, (x, y) => drawChevron(ctx, x, y, 1, c.icon, 0.35));

  ctx.beginPath();
  ctx.arc(slot(2), ty, 15, 0, Math.PI * 2);
  ctx.fillStyle = c.field;
  ctx.fill();
  ctx.fillStyle = c.icon;
  [-5.5, 0, 5.5].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(slot(2) + dx, ty, 1.7, 0, Math.PI * 2);
    ctx.fill();
  });

  scaledGlyph(ctx, slot(3), ty, 1.15, (x, y) => drawShareGlyph(ctx, x, y, c.icon));
  scaledGlyph(ctx, slot(4), ty, 1, (x, y) => {
    setIconStyle(ctx, c.icon, 1.6);
    roundedRectPath(ctx, x - 8, y - 8, 16, 16, 4);
    ctx.stroke();
    ctx.font = `600 10px ${DESKTOP_UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillStyle = c.icon;
    ctx.fillText("1", x, y + 0.5);
  });
  ctx.restore();
}

// Microsoft Edge: tab strip + toolbar, Edge logo in the tab, copilot button and horizontal "..." menu.
function drawEdgeHeader(ctx, W, y0, dark, url, tablet = false) {
  const STRIP = 41;
  const H = BROWSER_HEADER_H.edge;
  const c = EDGE_COLORS(dark);

  ctx.save();
  ctx.fillStyle = c.strip;
  ctx.fillRect(0, y0, W, STRIP);
  ctx.fillStyle = c.active;
  ctx.fillRect(0, y0 + STRIP, W, H - STRIP);
  ctx.fillStyle = c.line;
  ctx.fillRect(0, y0 + H - 1, W, 1);

  const sy = y0 + STRIP / 2;
  if (!tablet) drawTrafficLights(ctx, 20, sy);
  const tx = tablet ? 16 : 86, ty = y0 + 8, tw = 240, th = STRIP - 8, r = 9;
  ctx.fillStyle = c.active;
  ctx.beginPath();
  ctx.moveTo(tx - 8, ty + th); ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - 8);
  ctx.lineTo(tx, ty + r); ctx.quadraticCurveTo(tx, ty, tx + r, ty);
  ctx.lineTo(tx + tw - r, ty); ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + r);
  ctx.lineTo(tx + tw, ty + th - 8); ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw + 8, ty + th);
  ctx.closePath();
  ctx.fill();
  drawEdgeLogo(ctx, tx + 20, ty + th / 2, 7);
  ctx.font = `400 12px ${DESKTOP_UI_FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = c.text;
  ctx.fillText(fitText(ctx, url, tw - 76), tx + 36, ty + th / 2);
  drawCloseGlyph(ctx, tx + tw - 18, ty + th / 2, c.icon);
  drawPlusGlyph(ctx, tx + tw + 26, ty + th / 2, c.icon, 5.5);

  const cy = y0 + STRIP + (H - STRIP) / 2;
  drawArrow(ctx, 30, cy, -1, c.icon);
  drawArrow(ctx, 66, cy, 1, c.icon);
  drawReloadGlyph(ctx, 102, cy, c.icon, 6);

  const ox = 128, oh = 32, oy = cy - oh / 2, ow = W - ox - 150;
  roundedRectPath(ctx, ox, oy, ow, oh, 16);
  ctx.fillStyle = c.omni;
  ctx.fill();
  drawLockGlyph(ctx, ox + 20, cy + 0.5, c.icon);
  ctx.font = `400 14px ${DESKTOP_UI_FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = c.text;
  ctx.fillText(fitText(ctx, url, ow - 80), ox + 40, cy + 0.5);
  drawStarGlyph(ctx, ox + ow - 22, cy, c.icon, 7);

  // Copilot button (gradient disc) + horizontal menu dots
  const cg = ctx.createLinearGradient(W - 100, cy - 10, W - 80, cy + 10);
  cg.addColorStop(0, "#7B61FF");
  cg.addColorStop(1, "#29C7E6");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(W - 90, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.icon;
  [-5.5, 0, 5.5].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(W - 40 + dx, cy, 1.7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawTabletEdge(ctx, lw, dark, url) {
  ctx.save();
  ctx.fillStyle = EDGE_COLORS(dark).strip;
  ctx.fillRect(0, 0, lw, TABLET_STATUS_H); // strip colour continues behind the status bar
  ctx.restore();
  drawEdgeHeader(ctx, lw, TABLET_STATUS_H, dark, url, true);
}

function drawDesktopChrome(ctx, W, H, deviceLabel, overlays) {
  const browser = overlays?.browser ?? "none";
  const menuBar = !!overlays?.menuBar;
  if (!menuBar && browser === "none") return;

  const bm = getScreenBMConfig(deviceLabel);
  const { w: lw, h: lh } = SCREEN_LOGICAL_PT[deviceLabel] ?? SCREEN_LOGICAL_PT.default;
  const kx = (W - bm.marginX * 2) / lw;
  const ky = (H - bm.marginY * 2) / lh;
  const S = SCREEN_TEXTURE_SCALE;
  const lumaAt = (x, y, w, h) =>
    averageLuminance(ctx, (bm.marginX + x * kx) * S, (bm.marginY + y * ky) * S, w * kx * S, h * ky * S);

  // Read the pixels for theme decisions BEFORE any chrome is painted over them.
  const url = (overlays?.browserUrl || DEFAULT_BROWSER_URL).trim();
  // Browser header starts below the menu bar strip only when the menu bar is on.
  const headerY = menuBar ? MENU_BAR_H : 0;
  const pageDark = browser !== "none" && overlays?.browserTheme === "dark";

  ctx.save();
  ctx.translate(bm.marginX, bm.marginY);
  ctx.scale(kx, ky);

  if (menuBar) {
    ctx.fillStyle = "#000000"; // notch safe area above the window
    ctx.fillRect(0, 0, lw, MENU_BAR_H);
  }
  if (browser !== "none") {
    const drawHeader = { safari: drawSafariHeader, chrome: drawChromeHeader, arc: drawArcHeader, edge: drawEdgeHeader }[browser];
    drawHeader(ctx, lw, headerY, pageDark, url);
  }
  if (menuBar) {
    drawMenuBar(ctx, lw, "#FFFFFF", browser); // always sits on the black notch strip
  }
  ctx.restore();
}

// iPadOS status bar: time + date left, wifi / battery % / battery right.
function drawTabletStatusBar(ctx, lw, color) {
  const cy = TABLET_STATUS_H / 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.textBaseline = "middle";

  ctx.textAlign = "left";
  ctx.font = `600 13px ${DESKTOP_UI_FONT}`;
  ctx.fillText("9:41 AM", 26, cy + 0.5);
  const tw = ctx.measureText("9:41 AM").width;
  ctx.font = `500 13px ${DESKTOP_UI_FONT}`;
  ctx.fillText("Mon Jun 9", 26 + tw + 10, cy + 0.5);

  ctx.textAlign = "right";
  ctx.font = `600 13px ${DESKTOP_UI_FONT}`;
  let rx = lw - 26;
  drawBatteryGlyph(ctx, rx - 27.5, cy);
  rx -= 27.5 + 8;
  ctx.fillText("100%", rx, cy + 0.5);
  rx -= ctx.measureText("100%").width + 8;
  drawWifiGlyph(ctx, rx - 17, cy);
  ctx.restore();
}

// Safari / Chrome header for tablets. Covers the status bar strip too, so the header colour
// runs to the top edge like the real thing.
function drawTabletBrowser(ctx, lw, browser, dark, url) {
  const top = TABLET_STATUS_H;
  const H = TABLET_BROWSER_H[browser];
  ctx.save();

  if (browser === "safari") {
    const c = dark
      ? { bg: "#2B2B2D", line: "rgba(0,0,0,0.55)", icon: "#B8B8BC", text: "#F2F2F7", field: "rgba(255,255,255,0.10)" }
      : { bg: "#F4F4F4", line: "rgba(0,0,0,0.13)", icon: "#5C5C60", text: "#1D1D1F", field: "rgba(0,0,0,0.06)" };
    const cy = top + H / 2;
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, lw, top + H);
    ctx.fillStyle = c.line;
    ctx.fillRect(0, top + H - 1, lw, 1);

    drawSidebarGlyph(ctx, 34, cy, c.icon);
    drawChevron(ctx, 78, cy, -1, c.icon);
    drawChevron(ctx, 112, cy, 1, c.icon, 0.4);

    const fw = Math.min(560, lw * 0.5), fh = 34, fx = (lw - fw) / 2, fy = cy - fh / 2;
    roundedRectPath(ctx, fx, fy, fw, fh, 10);
    ctx.fillStyle = c.field;
    ctx.fill();
    ctx.font = `400 14px ${DESKTOP_UI_FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const shown = fitText(ctx, url, fw - 90);
    const tw = ctx.measureText(shown).width;
    const startX = fx + fw / 2 - (12 + tw) / 2;
    drawLockGlyph(ctx, startX + 4, cy + 0.5, c.icon);
    ctx.fillStyle = c.text;
    ctx.fillText(shown, startX + 12, cy + 0.5);
    drawReloadGlyph(ctx, fx + fw - 20, cy, c.icon, 5.5);

    drawShareGlyph(ctx, lw - 132, cy, c.icon);
    drawPlusGlyph(ctx, lw - 90, cy, c.icon);
    drawTabsGlyph(ctx, lw - 48, cy, c.icon);
  } else {
    const c = dark
      ? { strip: "#202124", active: "#35363A", omni: "#202124", icon: "#9AA0A6", text: "#E8EAED", line: "rgba(0,0,0,0.5)" }
      : { strip: "#DEE1E6", active: "#FFFFFF", omni: "#F1F3F4", icon: "#5F6368", text: "#202124", line: "rgba(0,0,0,0.14)" };
    const STRIP = 40;
    ctx.fillStyle = c.strip;
    ctx.fillRect(0, 0, lw, top + STRIP);
    ctx.fillStyle = c.active;
    ctx.fillRect(0, top + STRIP, lw, H - STRIP);
    ctx.fillStyle = c.line;
    ctx.fillRect(0, top + H - 1, lw, 1);

    // Active tab
    const tx = 16, ty = top + 8, tw = 240, th = STRIP - 8, r = 9;
    ctx.fillStyle = c.active;
    ctx.beginPath();
    ctx.moveTo(tx - 8, ty + th); ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - 8);
    ctx.lineTo(tx, ty + r); ctx.quadraticCurveTo(tx, ty, tx + r, ty);
    ctx.lineTo(tx + tw - r, ty); ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + r);
    ctx.lineTo(tx + tw, ty + th - 8); ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw + 8, ty + th);
    ctx.closePath();
    ctx.fill();
    drawGlobeGlyph(ctx, tx + 20, ty + th / 2 - 0.5, c.icon, 6.5);
    ctx.font = `400 12px ${DESKTOP_UI_FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = c.text;
    ctx.fillText(fitText(ctx, url, tw - 76), tx + 36, ty + th / 2);
    drawCloseGlyph(ctx, tx + tw - 18, ty + th / 2, c.icon);
    drawPlusGlyph(ctx, tx + tw + 26, ty + th / 2, c.icon, 5.5);

    // Toolbar
    const cy = top + STRIP + (H - STRIP) / 2;
    drawArrow(ctx, 30, cy, -1, c.icon);
    drawArrow(ctx, 66, cy, 1, c.icon);
    drawReloadGlyph(ctx, 102, cy, c.icon, 6);

    const ox = 128, oh = 32, oy = cy - oh / 2, ow = lw - ox - 140;
    roundedRectPath(ctx, ox, oy, ow, oh, 16);
    ctx.fillStyle = c.omni;
    ctx.fill();
    drawLockGlyph(ctx, ox + 20, cy + 0.5, c.icon);
    ctx.font = `400 14px ${DESKTOP_UI_FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = c.text;
    ctx.fillText(fitText(ctx, url, ow - 80), ox + 40, cy + 0.5);
    drawStarGlyph(ctx, ox + ow - 22, cy, c.icon, 7);

    drawShareGlyph(ctx, lw - 114, cy, c.icon);
    setIconStyle(ctx, c.icon, 1.6);
    roundedRectPath(ctx, lw - 82, cy - 8, 16, 16, 4);
    ctx.stroke();
    ctx.font = `600 10px ${DESKTOP_UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillStyle = c.icon;
    ctx.fillText("1", lw - 74, cy + 0.5);
    drawKebabGlyph(ctx, lw - 34, cy, c.icon);
  }
  ctx.restore();
}

// iPadOS home indicator: wider than the iPhone's pill (width is an estimate — tune by eye).
const TABLET_HOME_INDICATOR = { width: 300, height: 5, bottomGap: 8 };

function drawTabletHomeIndicator(ctx, W, H, color) {
  const { width: w, height: h, bottomGap } = TABLET_HOME_INDICATOR;
  ctx.save();
  ctx.fillStyle = color;
  roundedRectPath(ctx, (W - w) / 2, H - bottomGap - h, w, h, h / 2);
  ctx.fill();
  ctx.restore();
}

function drawTabletChrome(ctx, W, H, deviceLabel, overlays) {
  const browser = overlays?.browser ?? "none";
  if (!overlays?.statusBar && !overlays?.homeIndicator && browser === "none") return;

  const bm = getScreenBMConfig(deviceLabel);
  const { w: lw, h: lh } = getLogicalPt(deviceLabel, overlays);
  const kx = (W - bm.marginX * 2) / lw;
  const ky = (H - bm.marginY * 2) / lh;
  const S = SCREEN_TEXTURE_SCALE;
  const lumaAt = (x, y, w, h) =>
    averageLuminance(ctx, (bm.marginX + x * kx) * S, (bm.marginY + y * ky) * S, w * kx * S, h * ky * S);

  // Read the pixels for the theme decision BEFORE any chrome is painted over them.
  const dark = overlays?.browserTheme === "dark";
  const statusColor =
    browser !== "none"
      ? dark ? "#FFFFFF" : "#000000"
      : (lumaAt(20, 0, 160, TABLET_STATUS_H) + lumaAt(lw - 180, 0, 160, TABLET_STATUS_H)) / 2 > 0.6
        ? "#000000"
        : "#FFFFFF";
  const url = (overlays?.browserUrl || DEFAULT_BROWSER_URL).trim();
  const homeColor = lumaAt(lw * 0.35, lh - 18, lw * 0.3, 14) > 0.6 ? "#000000" : "#FFFFFF";

  ctx.save();
  // Clip to the display's rounded corners so the header doesn't paint over the black corner fill.
  const rx = Math.max(0, bm.radius - bm.marginX - bm.cornerAdjust);
  const ry = Math.max(0, bm.radius - bm.marginY - bm.cornerAdjust);
  roundedRectPath(ctx, bm.marginX, bm.marginY, W - bm.marginX * 2, H - bm.marginY * 2, rx, ry);
  ctx.clip();
  ctx.translate(bm.marginX, bm.marginY);
  ctx.scale(kx, ky);
  if (browser === "arc") drawTabletArc(ctx, lw, dark, url);
  else if (browser === "edge") drawTabletEdge(ctx, lw, dark, url);
  else if (browser !== "none") drawTabletBrowser(ctx, lw, browser, dark, url);
  if (overlays.statusBar) drawTabletStatusBar(ctx, lw, statusColor);
  if (overlays.homeIndicator) drawTabletHomeIndicator(ctx, lw, lh, homeColor);
  ctx.restore();
}

function drawScreenChrome(ctx, W, H, deviceLabel, overlays) {
  if (WATCH_DEVICES[deviceLabel]) return;
  if (TABLET_DEVICES[deviceLabel]) {
    drawTabletChrome(ctx, W, H, deviceLabel, overlays);
    return;
  }
  // NO_SCREEN_CHROME means "no phone chrome" — desktops get the menu bar / browser header instead.
  if (NO_SCREEN_CHROME[deviceLabel]) {
    drawDesktopChrome(ctx, W, H, deviceLabel, overlays);
    return;
  }
  const phoneBrowser = getPhoneBrowserMetrics(deviceLabel, overlays);
  if (!overlays?.statusBar && !overlays?.homeIndicator && !phoneBrowser) return;

  const bm = getScreenBMConfig(deviceLabel);
  const { w: lw, h: lh } = SCREEN_LOGICAL_PT[deviceLabel] ?? SCREEN_LOGICAL_PT.default;
  const innerX = bm.marginX, innerY = bm.marginY;
  const kx = (W - bm.marginX * 2) / lw; // pt -> canvas units, same mapping the screenshot gets
  const ky = (H - bm.marginY * 2) / lh;
  const S = SCREEN_TEXTURE_SCALE;

  // Luminance behind a pt-space rect (getImageData works in device px, hence the * S)
  const lumaAt = (x, y, w, h) =>
    averageLuminance(ctx, (innerX + x * kx) * S, (innerY + y * ky) * S, w * kx * S, h * ky * S);

  ctx.save();
  if (phoneBrowser) {
    // Clip to the display's rounded corners so the bars don't paint over the black corner fill.
    const rx = Math.max(0, bm.radius - bm.marginX - bm.cornerAdjust);
    const ry = Math.max(0, bm.radius - bm.marginY - bm.cornerAdjust);
    roundedRectPath(ctx, innerX, innerY, W - bm.marginX * 2, H - bm.marginY * 2, rx, ry);
    ctx.clip();
  }
  ctx.translate(innerX, innerY);
  ctx.scale(kx, ky);

  if (phoneBrowser) {
    drawPhoneBrowser(
      ctx, lw, lh, phoneBrowser, overlays.browser, overlays.browserTheme === "dark",
      (overlays.browserUrl || DEFAULT_BROWSER_URL).trim()
    );
  }
  if (overlays.statusBar) {
    const offsetPt = getStatusBarCenterXOffset(deviceLabel);
    const cy = getStatusBarCenterY(deviceLabel);
    const earC = (lw - STATUS_BAR.islandW) / 4 + offsetPt / 2;
    const y0 = cy - 9;
    const luma = (lumaAt(earC - 22, y0, 44, 18) + lumaAt(lw - earC - 38, y0, 76, 18)) / 2;
    drawStatusBar(ctx, lw, luma > 0.6 ? "#000000" : "#FFFFFF", getStatusBarScale(deviceLabel), offsetPt, cy);
  }
  if (overlays.homeIndicator) {
    const luma = lumaAt(lw * 0.3, lh - 18, lw * 0.4, 14);
    drawHomeIndicator(ctx, lw, lh, luma > 0.6 ? "#000000" : "#FFFFFF", getHomeIndicatorBottomGap(deviceLabel));
  }

  ctx.restore();
}

// Paints an already-loaded image into a device-specific screen texture
// (bezel mask + flip config for THIS device), so it can be rebuilt on model switch.
function paintScreenTexture(img, cropRect, deviceLabel, overlays) {
  const { w: targetW, h: targetH } = getScreenTextureSize(deviceLabel, overlays);
  const S = SCREEN_TEXTURE_SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = targetW * S;
  canvas.height = targetH * S;
  const ctx = canvas.getContext("2d");
  ctx.scale(S, S); // everything below still draws in base (targetW x targetH) units
  ctx.imageSmoothingQuality = "high";

  const bm = getScreenBMConfig(deviceLabel);
  const innerRadiusX = Math.max(0, bm.radius - bm.marginX - bm.cornerAdjust);
  const innerRadiusY = Math.max(0, bm.radius - bm.marginY - bm.cornerAdjust);

  ctx.fillStyle = "#000000";
  roundedRectPath(ctx, 0, 0, targetW, targetH, bm.radius, bm.radius);
  ctx.fill();

  const innerX = bm.marginX;
  const innerY = bm.marginY;
  const innerW = targetW - bm.marginX * 2;
  const innerH = targetH - bm.marginY * 2;
  // Desktops with a browser header: the screenshot becomes the page viewport below it.
  const { top: topPt, bottom: bottomPt } = getContentInsetsPt(deviceLabel, overlays);
  const lhPt = getLogicalPt(deviceLabel, overlays).h;
  const contentTop = (topPt / lhPt) * innerH;
  const contentH = innerH - contentTop - (bottomPt / lhPt) * innerH;

  let sx, sy, sw, sh;
  if (cropRect && cropRect.width > 0 && cropRect.height > 0) {
    sx = cropRect.x;
    sy = cropRect.y;
    sw = cropRect.width;
    sh = cropRect.height;
  } else {
    // sourceAspect describes the full display; rescale it when bars shrink the viewport.
    const targetAspect = (bm.sourceAspect ?? innerW / innerH) * (innerH / contentH);
    const imgAspect = img.width / img.height;
    if (imgAspect > targetAspect) {
      sh = img.height;
      sw = sh * targetAspect;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / targetAspect;
      sx = 0;
      // With a menu bar / browser header on, anchor to the top so the
      // page's top edge is never cut; any trimming happens at the bottom.
      // Desktops (and anything with chrome on) anchor to the top so the page's top edge is never cut.
      sy = topPt > 0 || NO_SCREEN_CHROME[deviceLabel] ? 0 : (img.height - sh) / 2;
    }
  }

  ctx.save();
  roundedRectPath(ctx, innerX, innerY, innerW, innerH, innerRadiusX, innerRadiusY);
  ctx.clip();
  if (overlays?.socialPaint) {
    // the social UI draws the screenshot itself, inside its media area
    const inset = (getSocialTopInsetPt(deviceLabel, overlays) / lhPt) * innerH;
    if (inset > 0) {
      ctx.fillStyle = "#000000"; // notch safe area; the menu bar, if on, is painted over this
      ctx.fillRect(innerX, innerY, innerW, inset);
    }
    ctx.translate(innerX, innerY + inset);
    overlays.socialPaint(ctx, innerW, innerH - inset, { img, cropRect });
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, innerX, innerY + contentTop, innerW, contentH);
  }
  ctx.restore();
  drawScreenIsland(ctx, deviceLabel);
  drawScreenChrome(ctx, targetW, targetH, deviceLabel, overlays);

  const cfg = getScreenTextureConfig(deviceLabel);
  const finalCanvas = flipScreenCanvas(orientCanvasForMesh(canvas, deviceLabel, overlays), cfg);
  const tex = new THREE.CanvasTexture(finalCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  applyScreenTextureConfig(tex, deviceLabel);
  tex.needsUpdate = true;
  return tex;
}

// Placeholder if nothing's uploaded, otherwise repaint the uploaded image for this device.
function resolveScreenTexture(s, deviceLabel) {
  const overlays = s.screenOverlays;
  if (s.screenSource) {
    s.screenTexture?.dispose();
    s.screenTexture = paintScreenTexture(s.screenSource.img, s.screenSource.cropRect, deviceLabel, overlays);
    return s.screenTexture;
  }
  return makePlaceholderTexture(deviceLabel, overlays);
}

function makePlaceholderTexture(deviceLabel, overlays) {
  const { w: W, h: H } = getScreenTextureSize(deviceLabel, overlays);
  const S = SCREEN_TEXTURE_SCALE;
  const c = document.createElement("canvas");
  c.width = W * S;
  c.height = H * S;
  const ctx = c.getContext("2d");
  ctx.scale(S, S);

  const bm = getScreenBMConfig(deviceLabel);
  const innerRadiusX = Math.max(0, bm.radius - bm.marginX - bm.cornerAdjust);
  const innerRadiusY = Math.max(0, bm.radius - bm.marginY - bm.cornerAdjust);

  ctx.fillStyle = "#000000";
  roundedRectPath(ctx, 0, 0, W, H, bm.radius, bm.radius);
  ctx.fill();

  const innerX = bm.marginX;
  const innerY = bm.marginY;
  const innerW = W - bm.marginX * 2;
  const innerH = H - bm.marginY * 2;

  ctx.save();
  roundedRectPath(ctx, innerX, innerY, innerW, innerH, innerRadiusX, innerRadiusY);
  ctx.clip();

  if (overlays?.socialPaint) {
    const lhPt = getLogicalPt(deviceLabel, overlays).h;
    const inset = (getSocialTopInsetPt(deviceLabel, overlays) / lhPt) * innerH;
    if (inset > 0) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(innerX, innerY, innerW, inset);
    }
    ctx.translate(innerX, innerY + inset);
    overlays.socialPaint(ctx, innerW, innerH - inset, null);
  } else {
    const g = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(1, "#FF47BC");
    ctx.fillStyle = g;
    ctx.fillRect(innerX, innerY, innerW, innerH);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "500 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Drop your", W / 2, H / 2 - 12);
    ctx.fillText("image here", W / 2, H / 2 + 12);
  }
  ctx.restore();
  drawScreenIsland(ctx, deviceLabel);
  drawScreenChrome(ctx, W, H, deviceLabel, overlays);

  const cfg = getScreenTextureConfig(deviceLabel);
  const finalCanvas = flipScreenCanvas(orientCanvasForMesh(c, deviceLabel, overlays), cfg);
  const tex = new THREE.CanvasTexture(finalCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  applyScreenTextureConfig(tex, deviceLabel);
  return tex;
}

function applyGrain(ctx, width, height, intensity) {
  if (!intensity) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const amount = intensity * 0.9;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Pure 3D canvas. Owns no chrome/UI — App.jsx renders the surrounding
 * panels and drives this component via the exposed ref API:
 *   uploadFile(file, cropRect?), setPreset(name), setBrightness(0-100),
 *   setManualRotation(xDeg), setManualRotationY(yDeg), setManualRotationZ(zDeg),
 *   setPositionX/Y(value), setZoom(0-100), setFov(0-120),
 *   setBackground(hex, opacityPct), setBackgroundImage(url), setLightDirection(xPct, yPct),
 *   exportAt(widthPx), resetView()
 *
 * Material / lighting model:
 *   - `key` / `fill` DirectionalLights + `ambient` drive the Lighting preset
 *     dropdown and the Device brightness slider. Their color/intensity/
 *     position come straight from PRESETS[key].
 *   - `sculptLight` is a separate DirectionalLight dedicated to the Light
 *     direction pad. Its position encodes direction (driven by
 *     setLightDirection), its intensity encodes the Lighting intensity
 *     slider (driven by applySculptLightIntensity, the only function that
 *     touches sculptLight.intensity). It never touches material color or
 *     emissive — it's a real light like any other.
 *   - frame/body material tinting (setBodyColor) and envMapIntensity are
 *     applied by the single applyBodyFinish() function, called from the
 *     model-load callback and from setBodyColor — so there's one place
 *     that decides what "the current finish" looks like, not three.
 *   - screen material reflection is applied by the single
 *     applyScreenReflection() function, called from the model-load
 *     callback and from setScreenReflection.
 *
 * The camera is fixed; dragging in the canvas rotates the device group
 * directly (same rotation state the Camera panel's X/Y sliders drive),
 * and scrolling adjusts zoom (same state the Zoom slider drives). This
 * keeps canvas interaction and the toolbar sliders as one source of truth.
 * onViewChange(partialState) fires whenever a drag/scroll changes that
 * state, so the parent can mirror it into the slider UI.
 */
// Paints a Text popup item onto a canvas. `scale` = output px per on-screen px, so the live view,
// Mockup export and Frame export all match. Mirrors TextOverlay's layout (24px padding, pre-wrap).
export function paintTextItem(ctx, item, w, h, scale = 1) {
  if (!item || !item.content) return;
  const size = item.size * scale;
  const pad = 24 * scale;
  const n = parseInt(item.hex || "000000", 16);
  const color = `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${item.opacity / 100})`;
  let text = item.content;
  if (item.textCase === "uppercase") text = text.toUpperCase();
  else if (item.textCase === "lowercase") text = text.toLowerCase();
  else if (item.textCase === "capitalize") text = text.replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());

  ctx.save();
  ctx.font = `${item.weight} ${size}px "${item.font}", sans-serif`;
  ctx.letterSpacing = `${(item.letterSpacing / 100) * size}px`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;

  const maxW = item.boxW ? item.boxW * w : w - pad * 2;
  const lines = [];
  text.split("\n").forEach((para) => {
    let line = "";
    para.split(" ").forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxW) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    lines.push(line);
  });

  const lh = size * (item.lineHeight / 100);
  const blockW = item.boxW ? maxW : Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)));
  // A set boxH makes the box taller (or shorter) than the text. The box is what gets anchored,
  // and the text starts at its top edge, same as the DOM version.
  const blockH = item.boxH ? item.boxH * h : lines.length * lh;
  const [v, hz] = item.position.split("");
  const bx = (hz === "l" ? pad : hz === "r" ? w - pad - blockW : (w - blockW) / 2) + (item.dx ?? 0) * w;
  const by = (v === "t" ? pad : v === "b" ? h - pad - blockH : (h - blockH) / 2) + (item.dy ?? 0) * h;
  ctx.textAlign = item.align;
  const ax = item.align === "left" ? bx : item.align === "right" ? bx + blockW : bx + blockW / 2;
  lines.forEach((l, i) => ctx.fillText(l, ax, by + (i + 0.5) * lh));
  ctx.restore();
}

const MockupScene = forwardRef(function MockupScene({ onViewChange, deviceType }, ref) {
  const mountRef = useRef(null);
  const stateRef = useRef({});

  // --- Shared appliers -------------------------------------------------
  // These read the relevant slice of stateRef.current and push it onto
  // the actual three.js objects. Every call site (model load, toolbar
  // handlers) goes through these instead of writing to materials/lights
  // directly, so there's exactly one definition of "what does the current
  // state look like rendered."

   function applyBodyFinish() {
    const s = stateRef.current;
    const finish = s.bodyFinish;
    if (!finish) return;
    if (!s.materials?.frame?.length && !s.materials?.body?.length) return;

    const color = new THREE.Color(`#${finish.hex}`);
    const alpha = finish.opacityPct / 100;
    const tinted = color.clone().lerp(new THREE.Color("#ffffff"), 1 - alpha);
    // Stored so applyLightingTint() always blends the Lighting preset
    // color on top of THIS base, rather than compounding onto whatever
    // color a previous preset/intensity left behind. Devices with
    // per-part overrides (DEVICE_FINISH_PART_COLORS) get their own
    // bases too, so lighting changes blend from the override instead of
    // snapping back to the body tint.
    s.baseTintedColor = tinted.clone();
    const partColors = getFinishPartColors(s.currentDeviceLabel, finish.name);
    s.baseFrameColor = bakedTint(
      partColors?.frame ? new THREE.Color(`#${partColors.frame}`) : tinted.clone(),
      s.currentDeviceLabel
    );
    s.baseAntennaColor = partColors?.antenna ? new THREE.Color(`#${partColors.antenna}`) : tinted.clone();
    s.baseRingColor = partColors?.ring ? new THREE.Color(`#${partColors.ring}`) : tinted.clone();
    s.basePlateauOverride = partColors?.plateau ? new THREE.Color(`#${partColors.plateau}`) : null;

const frameEnvIntensity = FRAME_ENV_MAP_INTENSITY[s.currentDeviceLabel] ?? FRAME_ENV_MAP_INTENSITY.default;
   const frameOverride = FRAME_FINISH_OVERRIDE[s.currentDeviceLabel];
   s.materials.frame.forEach((mat) => {
      // Some exports (e.g. the 17's shared "Edge" material) bake a fixed
      // color into a baseColorTexture — three.js multiplies mat.color
      // against that texture at render time, so any tint we set gets
      // muddied by whatever color was baked in. Clear it so mat.color
      // fully controls the look, same fix used for flashBorder below.
      if (!mat.alphaTest && !BAKED_BODY_COLOR[s.currentDeviceLabel]) mat.map = null; // cutout + baked-atlas devices keep their texture
      mat.color.copy(s.baseFrameColor);
      applySurfaceMaps(mat, s.currentDeviceLabel, "frame");
      // Device-specific override wins over the selected finish swatch,
      // e.g. satin aluminum shouldn't inherit a glossy roughness/metalness.
      mat.roughness = frameOverride?.roughness ?? finish.roughness ?? mat.roughness;
      mat.metalness = frameOverride?.metalness ?? finish.metalness ?? mat.metalness;
      // envMap/envMapIntensity are left alone here — they stay pointed at
      // the real environment, which is what actually reads as
      // "metallic/glass". Lighting presets never touch this.
      mat.envMapIntensity = frameEnvIntensity;
      mat.needsUpdate = true;
    });

    // Body glass finish depends on the device generation — see
    // BODY_GLASS_FINISH. Only its color comes from the selected finish.
    const glassFinish = BODY_GLASS_FINISH[s.currentDeviceLabel] ?? BODY_GLASS_FINISH.default;
    const bodyLighten = BODY_COLOR_LIGHTEN[s.currentDeviceLabel] ?? 0;
    const bodyOverrideHex = BODY_COLOR_OVERRIDE[s.currentDeviceLabel]?.[finish.name];
    s.baseBodyOverride = bodyOverrideHex ? new THREE.Color(`#${bodyOverrideHex}`) : null;
    const bodyColor = s.baseBodyOverride
      ? s.baseBodyOverride.clone()
      : bodyLighten
      ? tinted.clone().lerp(new THREE.Color("#ffffff"), bodyLighten)
      : tinted;
        s.materials.body?.forEach((mat) => {
      mat.map = null;
      mat.color.copy(bodyColor);
      applySurfaceMaps(mat, s.currentDeviceLabel, "body");
      mat.roughness = glassFinish.roughness;
      mat.metalness = glassFinish.metalness;
      mat.envMapIntensity = glassFinish.envMapIntensity;
      // Some exports author "glass" materials with KHR_materials_clearcoat
      // (loaded onto MeshPhysicalMaterial as a separate specular layer,
      // independent of roughness/metalness/envMapIntensity) or a sheen
      // layer — either would keep painting a mirror-like highlight on top
      // of an otherwise fully matte surface, which is exactly what a flat
      // roughness/envMapIntensity change alone can't remove. Zero them out
      // whenever they're present on this material type.
      if ("clearcoat" in mat) {
        mat.clearcoat = 0;
        mat.clearcoatRoughness = 0;
        mat.clearcoatMap = null;
        mat.clearcoatRoughnessMap = null;
        mat.clearcoatNormalMap = null;
      }
      if ("sheen" in mat) {
        mat.sheen = 0;
      }
      if ("transmission" in mat) {
        mat.transmission = 0;
        mat.thickness = 0;
      }
      if ("specularIntensity" in mat) {
        mat.specularIntensity = glassFinish.metalness > 0 ? mat.specularIntensity : 0.1;
      }
      mat.needsUpdate = true;
    });

    // Logo is a shade darker than the body (see deriveLogoColor), not an
    // exact match — a flat tint match blended into the back panel.
       s.materials.logo?.forEach((mat) => {
      mat.map = null;
      applySurfaceMaps(mat, s.currentDeviceLabel, "logo");
      mat.color.copy(deriveLogoColor(tinted, s.currentDeviceLabel));
      mat.roughness = LOGO_ROUGHNESS;
      mat.metalness = glassFinish.metalness;
      mat.envMapIntensity = LOGO_ENV_MAP_INTENSITY;
      mat.needsUpdate = true;
    });

    // Antenna-line inserts are painted plastic, color-matched to the
    // finish but with their own satin, non-metallic look — never the
    // frame's metal roughness/metalness.
    s.materials.antenna?.forEach((mat) => {
      mat.map = null;
      mat.color.copy(s.baseAntennaColor);
      mat.roughness = ANTENNA_FINISH.roughness;
      mat.metalness = ANTENNA_FINISH.metalness;
      mat.envMapIntensity = ANTENNA_FINISH.envMapIntensity;
      mat.needsUpdate = true;
    });

    // Trim (Dynamic Island / front-camera bezel ring) is always flat
    // matte black — it never takes the finish's color and is
    // deliberately left out of applyLightingTint() so lighting presets
    // don't wash it out either.
    s.materials.cameraPlateau?.forEach((mat) => {
      mat.map = null;
      mat.color.copy(s.basePlateauOverride ?? derivePlateauColor(tinted, s.currentDeviceLabel));
      applySurfaceMaps(mat, s.currentDeviceLabel, "cameraPlateau");
      const plateauFinish = CAMERA_PLATEAU_FINISH_OVERRIDE[s.currentDeviceLabel] ?? CAMERA_PLATEAU_FINISH;
      mat.roughness = plateauFinish.roughness;
      mat.metalness = plateauFinish.metalness;
      mat.envMapIntensity = plateauFinish.envMapIntensity;
      mat.needsUpdate = true;
      // TEMP DEBUG
      console.log(
        `[plateau debug] device=${s.currentDeviceLabel} finish=${finish.name} matName=${mat.name} ` +
        `color=#${mat.color.getHexString()} rough=${mat.roughness} metal=${mat.metalness} ` +
        `override=${JSON.stringify(CAMERA_PLATEAU_FINISH_OVERRIDE[s.currentDeviceLabel])}`
      );
    });

    // Polished ring around each lens — brighter/glossier than the
    // plateau shell, matching the real device's chrome-like highlight.
    s.materials.cameraRing?.forEach((mat) => {
      mat.map = null;
      mat.color.copy(deriveRingColor(s.baseRingColor));
      applySurfaceMaps(mat, s.currentDeviceLabel, "cameraRing");
      const ringFinish = CAMERA_RING_FINISH_OVERRIDE[s.currentDeviceLabel] ?? CAMERA_RING_FINISH;
      mat.roughness = ringFinish.roughness;
      mat.metalness = ringFinish.metalness;
      mat.envMapIntensity = ringFinish.envMapIntensity;
      mat.needsUpdate = true;
    });

    // Trim (Dynamic Island / front-camera bezel ring) is always flat
    // matte black — it never takes the finish's color and is
    // deliberately left out of applyLightingTint() so lighting presets
    // don't wash it out either.
      s.materials.trim?.forEach((mat) => {
      // Some exports (e.g. iPhone Air's hidden internal panels) bake a
      // baseColorTexture into this bucket's source material — three.js
      // multiplies mat.color against that texture, so a flat color
      // assignment alone still shows the baked pattern through. Clear
      // it, same fix already applied to frame/body/logo/antenna/
      // flashBorder above.
      mat.map = null;
      mat.color.set(TRIM_FINISH.color);
      const trimFinish = TRIM_FINISH_OVERRIDE[s.currentDeviceLabel] ?? TRIM_FINISH;
      mat.roughness = trimFinish.roughness;
      mat.metalness = trimFinish.metalness;
      mat.envMapIntensity = trimFinish.envMapIntensity;
      mat.needsUpdate = true;
    });

    // Rear lens glass and the flash + its ring are fixed, realistic
    // finishes independent of the selected body color — same reasoning
    // as trim above, and likewise excluded from applyLightingTint().
    s.materials.lens?.forEach((mat) => {
      // TEMP DEBUG
      console.log(
        `[lens debug BEFORE] device=${s.currentDeviceLabel} name=${mat.name} type=${mat.type} ` +
        `clearcoat=${"clearcoat" in mat ? mat.clearcoat : "n/a"} sheen=${"sheen" in mat ? mat.sheen : "n/a"} ` +
        `iridescence=${"iridescence" in mat ? mat.iridescence : "n/a"} ` +
        `specularIntensity=${"specularIntensity" in mat ? mat.specularIntensity : "n/a"}`
      );
      // Missing before — every other bucket clears its baked map before
      // setting a flat color, but this one didn't, so any tint/finish
      // change here was silently overridden by whatever texture the
      // source mesh baked in. This is why lens changes weren't visible.
      mat.map = null;
      // Also missing: unlike frame/body/cameraPlateau/cameraRing, this
      // bucket never dropped baked roughness/metalness/normal maps —
      // those multiply on top of the flat values below and can fully
      // mask a color/finish change even once mat.map is cleared.
      applySurfaceMaps(mat, s.currentDeviceLabel, "lens");
      mat.color.set(LENS_FINISH.color);
      mat.roughness = LENS_FINISH.roughness;
      mat.metalness = LENS_FINISH.metalness;
      mat.envMapIntensity = LENS_FINISH.envMapIntensity;
      // Some exports (e.g. iPhone 17 Pro Max) bake a clearcoat/sheen/
      // iridescence layer onto their "Glass"/"Lens" materials via
      // MeshPhysicalMaterial. That layer sits independently on top of
      // roughness/metalness and isn't touched by the lines above, which
      // is why LENS_FINISH's near-black glossy look was washing out into
      // a flat, dull solid color on those exports. Same reset already
      // applied to the body bucket in this function.
      if ("clearcoat" in mat) {
        mat.clearcoat = 0;
        mat.clearcoatRoughness = 0;
        mat.clearcoatMap = null;
        mat.clearcoatRoughnessMap = null;
        mat.clearcoatNormalMap = null;
      }
      if ("sheen" in mat) {
        mat.sheen = 0;
      }
      if ("iridescence" in mat) {
        mat.iridescence = 0;
      }
      if ("transmission" in mat) {
        mat.transmission = 0;
        mat.thickness = 0;
      }
      mat.needsUpdate = true;
      // TEMP DEBUG
      console.log(
        `[lens debug AFTER] device=${s.currentDeviceLabel} name=${mat.name} ` +
        `color=#${mat.color.getHexString()} roughness=${mat.roughness} metalness=${mat.metalness} ` +
        `envMapIntensity=${mat.envMapIntensity} clearcoat=${mat.clearcoat} sheen=${mat.sheen}`
      );
    });
    // flash has the same latent bug (no map clear) — fixed proactively
    // since it's the same root cause and would bite the next device.
s.materials.flash?.forEach((mat) => {
  mat.map = null;
  mat.color.set(FLASH_FINISH.color);
  mat.roughness = FLASH_FINISH.roughness;
  mat.metalness = FLASH_FINISH.metalness;
  mat.envMapIntensity = FLASH_FINISH.envMapIntensity;
  if ("clearcoat" in mat) {
    mat.clearcoat = 0;
    mat.clearcoatRoughness = 0;
    mat.clearcoatMap = null;
    mat.clearcoatRoughnessMap = null;
    mat.clearcoatNormalMap = null;
  }
  if ("sheen" in mat) mat.sheen = 0;
  if ("iridescence" in mat) mat.iridescence = 0;
  if ("transmission" in mat) {
    mat.transmission = 0;
    mat.thickness = 0;
  }
  // was: mat.emissive = new THREE.Color(0x000000); mat.emissiveIntensity = 1;
  mat.emissive = new THREE.Color(FLASH_FINISH.color);
  mat.emissiveMap = null;
  mat.emissiveIntensity = 0.5; // tune to taste
  mat.needsUpdate = true;
});
        s.materials.flashBorder?.forEach((mat) => {
      mat.map = null;
      mat.color.set(FLASH_BORDER_FINISH.color);
      mat.roughness = FLASH_BORDER_FINISH.roughness;
      mat.metalness = FLASH_BORDER_FINISH.metalness;
      mat.envMapIntensity = FLASH_BORDER_FINISH.envMapIntensity;
      mat.needsUpdate = true;
    });

    // Charging port interior — fixed dark gunmetal, never tracks the
    // selected body finish.
    s.materials.port?.forEach((mat) => {
      mat.map = null;
      mat.color.set(PORT_FINISH.color);
      mat.roughness = PORT_FINISH.roughness;
      mat.metalness = PORT_FINISH.metalness;
      mat.envMapIntensity = PORT_FINISH.envMapIntensity;
      mat.needsUpdate = true;
    });

    applyLightingTint();
  }

  function applyScreenReflection() {
    const s = stateRef.current;
    const mat = s.materials?.screen;
    if (!mat) return;

    // Some exports (17 Pro Max, 17 Pro — both node/material-bucketed
    // rather than authored with a real "screen" material) bake their own
    // base color/metalness into the screen material's source data. Since
    // the screen is meant to be read purely from its emissive map, not lit
    // like a physical surface, an unexpectedly dark or metallic base color
    // there makes the whole screen read darker under scene lighting even
    // though its emissiveIntensity is identical to every other device.
    // Force a neutral, non-metal base here so the emissive map is the only
    // thing that determines how the screen looks, consistently across
    // every device.
    mat.color.set("#ffffff");
    mat.metalness = 0;
    applySurfaceMaps(mat, s.currentDeviceLabel, "screen");

    // node-bucketed devices (e.g. 17 Pro) already get this normalization
    // for free because loadModel clones + resets every material on that
    // path. material-NAME-bucketed devices (e.g. 17 Pro Max) use their
    // screen material straight from the glTF with none of that applied —
    // if that export's screen material has baked-in transmission (glass),
    // vertex colors, or transparency, it reads visibly darker than a
    // node-bucketed device even with identical color/metalness/emissive
    // above. Apply the same reset here so it's consistent regardless of
    // which bucketing path a given device took.
    mat.vertexColors = false;
    mat.transparent = false;
    mat.opacity = 1;
    mat.depthWrite = true;
    if ("transmission" in mat) {
      mat.transmission = 0;
      mat.thickness = 0;
    }

    // Depth bias for the screen, applied here so it always wins over whatever the
    // loader branches set. Logged once per device to show what they had set.
    if (s.offsetLoggedFor !== s.currentDeviceLabel) {
      console.log(
        `[screen offset] ${s.currentDeviceLabel} before:`,
        mat.polygonOffset, mat.polygonOffsetFactor, mat.polygonOffsetUnits
      );
      s.offsetLoggedFor = s.currentDeviceLabel;
    }
    const offFactor = SCREEN_POLYGON_OFFSET_FACTOR[s.currentDeviceLabel];
    const offUnits = SCREEN_POLYGON_OFFSET_UNITS[s.currentDeviceLabel];
    if (offFactor !== undefined) mat.polygonOffsetFactor = offFactor;
    if (offUnits !== undefined) mat.polygonOffsetUnits = offUnits;
    if (mat.polygonOffsetFactor === 0 && mat.polygonOffsetUnits === 0) mat.polygonOffset = false;

    const mode = s.reflectionMode;
    const intensity = mode === "shiny" ? s.reflectionIntensityShiny : s.reflectionIntensityMatte;
    const t = THREE.MathUtils.clamp(intensity ?? 0, 0, 100) / 100;

        if (mode === "shiny") {
      const [rMax, rMin] = SCREEN_REFLECTION_SHINY.roughnessRange;
      mat.roughness = THREE.MathUtils.lerp(rMax, rMin, t);
      mat.envMapIntensity = SCREEN_REFLECTION_SHINY.envMapIntensity;
    } else {
      const [rMax, rMin] = SCREEN_REFLECTION_MATTE.roughnessRange;
      mat.roughness = THREE.MathUtils.lerp(rMax, rMin, t);
      mat.envMapIntensity = SCREEN_REFLECTION_MATTE.envMapIntensity;
    }
    mat.needsUpdate = true;

    // Keep the Dynamic Island mesh (if this model has one) reflecting exactly like the screen.
    const island = s.currentModel?.getObjectByName("DynamicIsland");
    if (island) {
      island.material.roughness = mat.roughness;
      island.material.envMapIntensity = mat.envMapIntensity;
      island.material.needsUpdate = true;
    }
  }

    function applySculptLightIntensity() {
    const s = stateRef.current;
    if (!s.sculptLight) return;
    s.sculptLight.intensity = ((s.lightingIntensityPct ?? 60) / 100) * SCULPT_LIGHT_MAX_INTENSITY;
  }

function applyScreenBrightness() {
  const s = stateRef.current;
  const mat = s.materials?.screen;
  if (!mat) return;
  const pct = s.screenBrightnessPct ?? 30;
  const scale = getScreenEmissiveScale(s.currentDeviceLabel);
  mat.emissiveIntensity = (pct / 100) * 1.4 * scale;
  mat.needsUpdate = true;
}

function applyStrap() {
  console.log("[strap]", stateRef.current.currentDeviceLabel, "mats:", stateRef.current.materials?.strap?.length, "finish:", stateRef.current.strapFinish);
  const s = stateRef.current;
  const style = getStrapStyles(s.currentDeviceLabel)[s.strapStyle ?? "sport"];
  const mats = [...(s.materials?.strap ?? []), ...(s.styleStrapMats ?? [])];
  if (!mats.length) return;
  const st = s.strapFinish ?? style?.defaultFinish ?? null;

  s.strapTextures?.forEach((t) => t?.dispose());
  s.strapTextures = null;

  mats.forEach((mat) => {
    // remember the authored look the first time, so "Original" can restore it
    mat.userData.orig ??= {
      map: mat.map, color: mat.color.clone(), roughness: mat.roughness, metalness: mat.metalness,
      roughnessMap: mat.roughnessMap, metalnessMap: mat.metalnessMap, normalMap: mat.normalMap,
      envMapIntensity: mat.envMapIntensity,
    };
    if (!st) {
      const o = mat.userData.orig;
      Object.assign(mat, {
        map: o.map, roughness: o.roughness, metalness: o.metalness,
        roughnessMap: o.roughnessMap, metalnessMap: o.metalnessMap, normalMap: o.normalMap,
        envMapIntensity: o.envMapIntensity, bumpMap: null,
      });
      mat.color.copy(o.color);
      mat.needsUpdate = true;
      return;
    }
    const hex = st.hex === "auto" ? mat.userData.orig.color.getHexString().toUpperCase() : st.hex;
    const tex = makeStrapTextures(st.pattern, hex, st.hex2);
    (s.strapTextures ??= []).push(tex.map, tex.bump);
    const rep = style && !style.original ? style.rep ?? 4 : STRAP_REPEAT[s.currentDeviceLabel] ?? STRAP_REPEAT.default;
    [tex.map, tex.bump].forEach((t) => t?.repeat.set(rep, rep));
    mat.map = tex.map;
    mat.color.set("#ffffff"); // the texture carries the color
    mat.bumpMap = tex.bump;
    mat.bumpScale = STRAP_NODE_BUMP;
    mat.normalMap = null;
    mat.roughnessMap = null;
    mat.metalnessMap = null;
    mat.roughness = st.roughness;
    mat.metalness = st.metalness;
    mat.envMapIntensity = st.metal ? 1.2 : 0.5;
    mat.needsUpdate = true;
  });
}

function applyStrapStyle() {
  const s = stateRef.current;
  if (s.strapRoot) {
    s.group.remove(s.strapRoot);
    s.strapRoot.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    s.strapRoot = null;
  }
  s.styleStrapMats = [];
  const meshes = s.strapMeshes ?? [];
  const style = getStrapStyles(s.currentDeviceLabel)[s.strapStyle ?? "sport"];
  meshes.forEach((m) => (m.visible = !style || !!style.original));
  const customStyle = !!style && !style.original;
  (STRAP_HIDE_NODES[s.currentDeviceLabel] ?? []).forEach((n) => {
    const o = s.currentModel?.getObjectByName(n);
    if (o) o.visible = !customStyle; // hook comes back when you pick "Sport Band" again
  });
  if (!style || style.original || !meshes.length || !s.currentModel) { applyStrap(); return; }

  const model = s.currentModel, group = s.group;
  group.updateMatrixWorld(true);
  const toGroup = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const box = new THREE.Box3(), v = new THREE.Vector3();
  const gpts = [];
  meshes.forEach((m) => {
    const m4 = new THREE.Matrix4().multiplyMatrices(toGroup, m.matrixWorld);
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m4);
      box.expandByPoint(v);
      gpts.push(v.clone());
    }
  });
  // group space -> "leveled" model units (model rotation undone by construction, so face = +Z, up = +Y)
  const sc = model.scale.x;
  const rb = new THREE.Box3(box.min.clone().sub(model.position).divideScalar(sc), box.max.clone().sub(model.position).divideScalar(sc));
  const W0 = STRAP_RIBBON_W[s.currentDeviceLabel] ?? (rb.max.x - rb.min.x);
  console.log(`[${s.currentDeviceLabel}] strap bounds`, rb.min.toArray().map((n) => +n.toFixed(3)), rb.max.toArray().map((n) => +n.toFixed(3)), "W0", +W0.toFixed(3));

  const spec = style;
  const w = spec.w * W0, t = spec.t * W0 * (STRAP_T_SCALE[s.currentDeviceLabel] ?? 1);
  const pcfg = STRAP_PATH[s.currentDeviceLabel] ?? STRAP_PATH.default;
  const path = pcfg.fromMesh
    ? buildStrapPathFromPoints(
        gpts.map((p) => p.sub(model.position).divideScalar(sc)),
        (rb.min.y + rb.max.y) / 2,
        (rb.min.z + rb.max.z) / 2,
        pcfg.extend,
        pcfg.cutZ,
        pcfg.tail
      )
    : buildStrapPath(rb, pcfg);
  const L = path.len;
  const off0 = pcfg.fromMesh ? t / 2 : 0; // path is the strap's centre-line, not its outer face
  let ranges;
  if (spec.links) {
    const seg = L / spec.links, gap = seg * 0.06;
    ranges = Array.from({ length: spec.links }, (_, i) => ({ s0: i * seg + gap / 2, s1: (i + 1) * seg - gap / 2, off: off0 }));
  } else {
    ranges = [{ s0: 0, s1: L, off: off0 }];
    if (spec.flap) ranges.push({ s0: L * 0.62, s1: L * 0.95, off: off0 + t * 0.9 });
  }

  const src = s.materials.strap[0];
  const o = src?.userData.orig;
  const mat = new THREE.MeshStandardMaterial({
    color: (o?.color ?? src?.color ?? new THREE.Color("#222")).clone(),
    roughness: o?.roughness ?? 0.5,
    metalness: o?.metalness ?? 0,
    envMapIntensity: o?.envMapIntensity ?? 1,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(buildStrapGeometry(path, w, t, (spec.round ?? 0.35) * t, ranges, pcfg.flare), mat);

  const root = new THREE.Group();
  root.position.copy(model.position);
  root.position.x += (pcfg.xOffset ?? 0) * model.scale.x; // strap mesh is centred ~1.15mm off x=0 on the Series 7
  root.scale.copy(model.scale);
  root.add(mesh);
  if (spec.buckle != null || spec.clasp != null) root.add(makeStrapHardware(path, spec, w, t, pcfg.fromMesh ? 0 : t / 2));
  root.traverse((m) => m.isMesh && m.layers.enable(1));
  group.add(root);
  s.strapRoot = root;
  s.styleStrapMats = [mat];
 applyStrap();
}

// Rebuilds the "behind" text texture at an explicit pixel size. scale = px per on-screen px.
function rebuildBackText(pxW, pxH, scale) {
  const s = stateRef.current;
  const mesh = s.backTextMesh;
  if (!mesh) return;
  const item = s.textItem;
  if (!item?.content || item.layer !== "behind") {
    mesh.visible = false;
    return;
  }
  const c = document.createElement("canvas");
  c.width = Math.max(1, pxW);
  c.height = Math.max(1, pxH);
  paintTextItem(c.getContext("2d"), item, c.width, c.height, scale);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  mesh.material.map?.dispose();
  mesh.material.map = tex;
  mesh.material.needsUpdate = true;
  mesh.visible = true;
}

// Same, at the live canvas size.
function refreshBackText() {
  const s = stateRef.current;
  const mount = mountRef.current;
  if (!mount) return;
  const dpr = s.renderer ? s.renderer.getPixelRatio() : 1;
  rebuildBackText(Math.round(mount.clientWidth * dpr), Math.round(mount.clientHeight * dpr), dpr);
}

// Data URL of the current render, with "front" text painted on top.
function snapshotWithText(scale, mime = "image/png") {
  const s = stateRef.current;
  const src = s.renderer.domElement;
  const item = s.textItem;
  if (!item?.content || item.layer !== "front") return src.toDataURL(mime, 0.92);
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d");
  ctx.drawImage(src, 0, 0);
  paintTextItem(ctx, item, out.width, out.height, scale);
  return out.toDataURL(mime, 0.92);
}

function applyBackgroundImageCover(tex, imageAspect) {
  const mount = mountRef.current;
  if (!mount || !imageAspect) return;
  const canvasAspect = mount.clientWidth / mount.clientHeight;
  if (imageAspect > canvasAspect) {
    // image is wider than the canvas — crop its left/right edges
    const scale = canvasAspect / imageAspect;
    tex.repeat.set(scale, 1);
    tex.offset.set((1 - scale) / 2, 0);
  } else {
    // image is taller than the canvas — crop its top/bottom edges
    const scale = imageAspect / canvasAspect;
    tex.repeat.set(1, scale);
    tex.offset.set(0, (1 - scale) / 2);
  }
  tex.needsUpdate = true;
}

// Repaints the current screen texture (screenshot or placeholder) with the current overlay flags.
function refreshScreenTexture() {
  const s = stateRef.current;
  const mat = s.materials?.screen;
  if (!mat) return; // model still loading. loadModel reads s.screenOverlays itself
  const prev = mat.map;
  const tex = resolveScreenTexture(s, s.currentDeviceLabel);
  mat.map = tex;
  mat.emissiveMap = tex;
  mat.needsUpdate = true;
  if (prev && prev !== tex) prev.dispose();
}

function applyDebugPerNodeColors() {
  const s = stateRef.current;
  if (!DEBUG_PER_NODE_DEVICES[s.currentDeviceLabel] || !s.currentModel) return;
  const legend = [];
  let i = 0;
  const GOLDEN_ANGLE = 0.6180339887; // maximizes hue separation between consecutive nodes
  s.currentModel.traverse((obj) => {
    if (!obj.isMesh || !obj.visible) return;
    const hue = (i * GOLDEN_ANGLE) % 1;
    i++;
    const color = new THREE.Color().setHSL(hue, 0.9, 0.5);
    // Unlit MeshBasicMaterial — ignores all scene lighting, so every node
    // shows its EXACT assigned color regardless of face angle. This is
    // what actually distinguishes "same material, different shading" from
    // "genuinely different material" — the previous lit debug material
    // couldn't tell those apart (a bright face and a grazing-angle face of
    // the SAME hue can look like two different colors under lighting).
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    obj.material = Array.isArray(obj.material) ? obj.material.map(() => mat) : mat;
    legend.push({ node: obj.name, hex: `#${color.getHexString()}` });
  });
  console.log(`[${s.currentDeviceLabel}] per-node debug color legend (unlit):`);
  console.table(legend);
}

function applyLightingTint() {
    const s = stateRef.current;
    if (!s.baseTintedColor) return;
    if (!s.materials?.frame?.length && !s.materials?.body?.length) return;

    const presetKey = s.lightingPresetKey ?? "none";
    const preset = PRESETS[presetKey] ?? PRESETS.none;
    const t = THREE.MathUtils.clamp((s.lightingIntensityPct ?? 0) / 100, 0, 1);

const bodyLighten = BODY_COLOR_LIGHTEN[s.currentDeviceLabel] ?? 0;
    const lightenColor = (c) =>
      s.baseBodyOverride
        ? s.baseBodyOverride.clone()
        : bodyLighten
        ? c.clone().lerp(new THREE.Color("#ffffff"), bodyLighten)
        : c;

    const frameBase = s.baseFrameColor ?? s.baseTintedColor;
    const antennaBase = s.baseAntennaColor ?? s.baseTintedColor;
    const ringBase = s.baseRingColor ?? s.baseTintedColor;

if (presetKey === "none" || t <= 0) {
      s.materials.frame.forEach((m) => { m.color.copy(frameBase); m.needsUpdate = true; });
      s.materials.body.forEach((m) => { m.color.copy(lightenColor(s.baseTintedColor)); m.needsUpdate = true; });
      s.materials.logo?.forEach((m) => { m.color.copy(deriveLogoColor(s.baseTintedColor, s.currentDeviceLabel)); m.needsUpdate = true; });
      s.materials.antenna?.forEach((m) => { m.color.copy(antennaBase); m.needsUpdate = true; });
      s.materials.cameraPlateau?.forEach((m) => { m.color.copy(s.basePlateauOverride ?? derivePlateauColor(s.baseTintedColor, s.currentDeviceLabel)); m.needsUpdate = true; });
      s.materials.cameraRing?.forEach((m) => { m.color.copy(deriveRingColor(ringBase)); m.needsUpdate = true; });
      applyDebugPerNodeColors();
      return;
    }

    // A blend of the preset's key + fill colors stands in for "what color
    // light is washing over this surface". maxBlend caps how far even
    // intensity = 100 can push the tint, so the finish's own color always
    // still reads through.
    const presetColor = new THREE.Color(preset.key.color).lerp(new THREE.Color(preset.fill.color), 0.35);
    const maxBlend = 0.35;
    const blend = (base) => base.clone().lerp(presetColor, t * maxBlend);
    const blended = blend(s.baseTintedColor);

s.materials.frame.forEach((m) => { m.color.copy(blend(frameBase)); m.needsUpdate = true; });
    s.materials.body.forEach((m) => { m.color.copy(lightenColor(blended)); m.needsUpdate = true; });
    s.materials.logo?.forEach((m) => { m.color.copy(deriveLogoColor(blended, s.currentDeviceLabel)); m.needsUpdate = true; });
    s.materials.antenna?.forEach((m) => { m.color.copy(blend(antennaBase)); m.needsUpdate = true; });
    s.materials.cameraPlateau.forEach((m) => { m.color.copy(s.basePlateauOverride ? blend(s.basePlateauOverride) : derivePlateauColor(blended, s.currentDeviceLabel)); m.needsUpdate = true; });
    s.materials.cameraRing?.forEach((m) => { m.color.copy(deriveRingColor(blend(ringBase))); m.needsUpdate = true; });
    applyDebugPerNodeColors();
  }

  useEffect(() => {
    const mount = mountRef.current;
    let cancelled = false;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PRESETS.studio.bg);

    const camera = new THREE.PerspectiveCamera(32, width / height, 1, 100);
    camera.position.set(0, 0, distFromZoom(70));
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    MAX_ANISOTROPY = renderer.capabilities.getMaxAnisotropy();
    // Matches the Babylon reference render, which has Tone Mapping off —
    // ACES was compressing highlights/shifting contrast relative to that
    // reference. toneMappingExposure has no effect under NoToneMapping,
    // so it's dropped rather than left as dead config.
    renderer.toneMapping = THREE.NoToneMapping;
    mount.appendChild(renderer.domElement);

    // Load the reference HDRI directly rather than one of the Environment
    // dropdown presets — this is the baseline the device model's finishes
    // were actually tuned against, independent of whatever the person has
    // selected in the Environment dropdown (see setEnvironment below,
    // which can still override scene.environment afterward).
    loadEnvironmentTexture(renderer, "reference")
      .then((result) => {
        if (cancelled || !result) return;
        scene.environment = result.texture;
        stateRef.current.envRenderTarget = result.renderTarget;
      })
      .catch((err) => console.error("Failed to load reference HDRI:", err));

    const initialPreset = PRESETS.none;
    const ambient = new THREE.AmbientLight(initialPreset.ambient.color, initialPreset.ambient.intensity);
    const key = new THREE.DirectionalLight(initialPreset.key.color, initialPreset.key.intensity);
    key.position.set(...initialPreset.key.pos);
    const fill = new THREE.DirectionalLight(initialPreset.fill.color, initialPreset.fill.intensity);
    fill.position.set(...initialPreset.fill.pos);
    scene.add(ambient, key, fill);
    key.layers.set(1);
    fill.layers.set(1);

    // Dedicated light for the Light-direction pad. Real DirectionalLight,
    // layer 1 so it only hits frame/body meshes (screen opts out below) —
    // moving it is the only thing that changes appearance; it never writes
    // to material color/emissive.
    const sculptLight = new THREE.DirectionalLight(0xffffff, 0);
    sculptLight.position.set(0, 0, SCULPT_LIGHT_Z);
    sculptLight.layers.set(1);
    scene.add(sculptLight);

    // "Behind" text: a quad parented to the camera, resized in onBeforeRender to exactly fill the view.
    // It draws first among opaque objects with depth off, so it lands on top of scene.background but
    // under the device. transparent:false keeps it in the opaque pass; CustomBlending still alpha-blends.
    const BACK_TEXT_DIST = 50;
    scene.add(camera);
    const backTextMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        transparent: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      })
    );
    backTextMesh.visible = false;
    backTextMesh.frustumCulled = false;
    backTextMesh.renderOrder = -1000;
    backTextMesh.position.set(0, 0, -BACK_TEXT_DIST);
    backTextMesh.onBeforeRender = (_r, _s, cam) => {
      const hh = 2 * BACK_TEXT_DIST * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      backTextMesh.scale.set(hh * cam.aspect, hh, 1);
      backTextMesh.updateWorldMatrix(true, false);
    };
    camera.add(backTextMesh);
    stateRef.current.backTextMesh = backTextMesh;

    const group = new THREE.Group();
    const deviceH = 5;

    const gltfLoader = new GLTFLoader();

    // Loads (or reloads) the device model at `path`, tearing down whatever
    // model is currently in `group` first. Both the initial mount load and
    // setDeviceType (below) funnel through here, so there's one definition
    // of "what loading a model means."
    function loadModel(path, deviceLabel) {
      gltfLoader.load(
        path,
        (gltf) => {
          if (cancelled) return; // this effect run was already torn down — ignore its stale load

          if (stateRef.current.currentModel) {
            group.remove(stateRef.current.currentModel);
          }

          const model = gltf.scene;

          // Debug: log the model's top-level hierarchy so we can confirm
          // exactly what node names/structure this export actually has.
          // Remove this console.log once the duplicate-strip below is
          // confirmed working.
          console.log(
            `[${deviceLabel}] top-level nodes:`,
            model.children.map((c) => `${c.name} (${c.children.length} children)`)
          );

          // Remove any known duplicate/leftover geometry for this device
          // before it factors into bounding-box scale/centering or gets
          // traversed for material bucketing below. Two strategies:
          // 1) exact name match, when we know precisely what to strip.
          (DUPLICATE_NODE_NAMES[deviceLabel] ?? []).forEach((nodeName) => {
            const dupe = model.getObjectByName(nodeName);
            if (dupe) {
              console.log(`[${deviceLabel}] removing duplicate node by name:`, nodeName);
              dupe.parent?.remove(dupe);
            } else {
              // Log every actual top-level child name when the hardcoded
              // lookup misses, so a stale/mistyped DUPLICATE_NODE_NAMES
              // entry (e.g. from a re-export with slightly different
              // naming) is visible immediately instead of silently leaving
              // duplicate geometry in the scene.
              console.warn(
                `[${deviceLabel}] duplicate node NOT FOUND by name:`, nodeName,
                "— actual top-level nodes:", model.children.map((c) => c.name)
              );
            }
          });

          // 2) generic fallback for Sketchfab-style exports: everything
          // hangs off a wrapper node literally named "GLTF_SceneRootNode".
          // If that wrapper has more than one child, only the first is
          // the real model — any siblings are stray/duplicate geometry
          // left over from the export, so drop them regardless of what
          // they're named.
          const rootWrapper = model.getObjectByName("GLTF_SceneRootNode");
          if (rootWrapper && rootWrapper.children.length > 1 && !KEEP_ALL_ROOT_CHILDREN[deviceLabel]) {
            const extras = rootWrapper.children.slice(1);
            extras.forEach((extra) => {
              console.log(`[${deviceLabel}] stripping extra root-level node:`, extra.name);
              rootWrapper.remove(extra);
            });
          }

          // Drop skip meshes (e.g. skyBox) before measuring; hidden meshes still
          // count toward Box3 and would skew this model's scale and center.
          const names = MATERIAL_NAME_MAP[deviceLabel] ?? MATERIAL_NAME_MAP.default;

          const skipList = names.skip ?? [];
          const toRemove = [];
          model.traverse((obj) => {
            if (!obj.isMesh) return;
            const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
            if (ms.some((m) => matchesAny(skipList, m?.name))) toRemove.push(obj);
          });
          toRemove.forEach((o) => o.parent?.remove(o));

          // Detach `hide`-listed nodes (e.g. the iPad Pro 12.9's bundled Apple
          // Pencil + its logo/text decals) BEFORE fitModel measures the model.
          // Previously these were only marked invisible during the later
          // material-bucketing pass — well after fitModel already ran — so
          // Box3().setFromObject(model) (which ignores visibility anyway)
          // still counted their geometry. That skewed the computed size/center,
          // and by a different amount in portrait vs. landscape once the whole
          // assembly gets rotated 90° for landscape — which is what caused the
          // model to jump off-pivot on orientation switch (and then visibly
          // orbit while dragging, since drags rotate around that bad pivot).
          // Detaching them here — same node-matching logic used later — means
          // the standard Box3 measurement just never sees them, with no change
          // to the measurement method itself, so no other device is affected.
          if (names.hide) {
            const toHide = [];
            model.traverse((obj) => {
              if (obj.isMesh && matchesAny(names.hide, normalizeNodeName(obj.name, deviceLabel))) {
                toHide.push(obj);
              }
            });
            toHide.forEach((o) => o.parent?.remove(o));
          }

          // Peel the front glass out of the baked body mesh so it can be the screen.
          const faceSplit = SCREEN_FACE_SPLIT[deviceLabel];
          if (faceSplit) {
            const src = model.getObjectByName(faceSplit.node);
            if (src?.isMesh) splitMeshByIslands(src, faceSplit.matchFn);
            else console.warn(`[${deviceLabel}] face split: node "${faceSplit.node}" not found`);
          }

          const sensorSplit = SENSOR_ISLAND_SPLIT[deviceLabel];
          if (sensorSplit) {
            const src = model.getObjectByName(sensorSplit.node);
            if (src?.isMesh) {
              src.geometry.computeBoundingBox();
              const whole = src.geometry.boundingBox.getSize(new THREE.Vector3());
              const wholeMax = Math.max(whole.x, whole.y, whole.z);
              splitMeshByIslands(src, (box) => {
                const s = box.getSize(new THREE.Vector3());
                return Math.max(s.x, s.y, s.z) < wholeMax * sensorSplit.maxFractionOfWhole;
              });
            } else {
              console.warn(`[${deviceLabel}] sensor split: node "${sensorSplit.node}" not found`);
            }
          }

          const capStrip = BACK_CAP_STRIP[deviceLabel];
          if (capStrip) {
            model.updateMatrixWorld(true);
            const refNode = model.getObjectByName(capStrip.refNode);
            const capNode = model.getObjectByName(capStrip.node);
            if (refNode && capNode?.isMesh) {
              stripMeshCylinder(
                capNode,
                new THREE.Box3().setFromObject(refNode).getCenter(new THREE.Vector3()),
                new THREE.Vector3(...capStrip.axis).normalize(),
                capStrip.radius,
                capStrip.maxH
              );
            } else {
              console.warn(`[${deviceLabel}] cap strip: node not found`);
            }
          }

          fitModel(model, deviceLabel, stateRef.current.screenOverlays);

          // One-time dump of every material name actually present on this
          // export, so a hand-typed override string (FRAME_MATERIAL_OVERRIDE /
          // BODY_MATERIAL_OVERRIDE) can be checked against the real thing
          // instead of trusted by eye — catches capitalization, stray
          // characters, or a different numeric suffix than assumed.
          {
            const seen = new Set();
            model.traverse((o) => {
              if (!o.isMesh) return;
              (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
                if (m?.name) seen.add(m.name);
              });
            });
            console.log(`[${deviceLabel}] all material names:`, [...seen]);
          }

          // TEMP DEBUG
          {
            const box = new THREE.Box3();
            const center = new THREE.Vector3();
            const rows = [];
            model.traverse((o) => {
              if (!o.isMesh) return;
              box.setFromObject(o);
              box.getCenter(center);
              const mats = Array.isArray(o.material) ? o.material : [o.material];
              rows.push(
                `${o.name} | mat: ${mats.map((m) => m?.name).join(",")} | center: (${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`
              );
            });
            console.log(`[${deviceLabel}] node dump:\n` + rows.join("\n"));
          }

const frameMats = [];
          const bodyMats = [];
          const logoMats = [];
          const antennaMats = [];
          const trimMats = [];
          const lensMats = [];
          const flashMats = [];
          const flashBorderMats = [];
          const cameraPlateauMats = [];
          const cameraRingMats = [];
          const portMats = [];
          const strapMats = [];
          const strapMeshes = [];
          let screenMat = null;

          const bucketByNode = names.bucketBy === "node";

          model.traverse((obj) => {
            if (!obj.isMesh) return;

            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            const matNames = mats.map((m) => m?.name ?? "(none)");

            if (mats.some((m) => matchesAny(names.skip, m?.name))) {
              obj.visible = false;
              return;
            }

            // Node-level hide list (for meshes that share a material with parts we keep).
            if (names.hide && matchesAny(names.hide, normalizeNodeName(obj.name, deviceLabel))) {
              obj.visible = false;
              return;
            }

            obj.layers.enable(1);

            // Node-bucketed devices (e.g. iPhone 17) share a handful of
            // generic materials ("Edge", "Glass", ...) across dozens of
            // unrelated parts, so material name can't tell buckets apart.
            // Clone this mesh's material(s) first so tinting one bucket
            // (say, the frame) never bleeds into another mesh that just
            // happens to share the same material (say, the logo or a
            // button), then bucket by this mesh's own node name instead.
            if (bucketByNode) {
              const nodeName = normalizeNodeName(obj.name, deviceLabel);
              const preserveNodes = PRESERVE_NATIVE_NODES[deviceLabel];
              if (preserveNodes && matchesAny(preserveNodes, nodeName)) {
                obj.layers.enable(1);
                const sanitized = mats.map((m) => sanitizePreservedMaterial(m, deviceLabel, nodeName));
                obj.material = Array.isArray(obj.material) ? sanitized : sanitized[0];
                console.log(`[${deviceLabel}] node ${nodeName}: (native node, transmission/opacity sanitized)`);
                return;
              }

              const preserveList = PRESERVE_NATIVE_BUCKETS[deviceLabel];
              if (preserveList) {
                const overrideBucketPeek = getMaterialOverrideBucket(deviceLabel, matNames);
                const peekBucket =
                  overrideBucketPeek ||
                  (matchesAny(names.lens, nodeName) ? "lens" : null) ||
                  (matchesAny(names.flash, nodeName) ? "flash" : null) ||
                  (matchesAny(names.flashBorder, nodeName) ? "flashBorder" : null);
                if (peekBucket && preserveList.includes(peekBucket)) {
                  obj.layers.enable(1);
                  const sanitized = mats.map((m) => sanitizePreservedMaterial(m, deviceLabel, nodeName));
                  obj.material = Array.isArray(obj.material) ? sanitized : sanitized[0];
                  console.log(`[${deviceLabel}] node ${nodeName}:`, matNames, `-> ${peekBucket} (native, transmission/opacity sanitized)`);
                  return; // keep authored color/roughness/clearcoat — just stop it rendering as a black hole
                }
              }

              const clonedMats = mats.map((m) => {
  if (!m) return m;
  let clone = m.clone();
  // Some exports (Sketchfab/hashed style) author materials with the glTF
  // KHR_materials_unlit extension, which GLTFLoader turns into a
  // MeshBasicMaterial — no roughness/metalness/envMapIntensity/emissive
  // at all. Every finish this pipeline applies later (LENS_FINISH,
  // FLASH_FINISH, applyBodyFinish, etc.) silently no-ops on that
  // material type, and since the baked map gets cleared a few lines
  // down, the result is a flat, unlit solid color with zero lighting or
  // environment reflection. Upgrade to a real PBR material here so every
  // downstream finish has something to actually act on.
  if (!clone.isMeshStandardMaterial && !clone.isMeshPhysicalMaterial) {
    clone = new THREE.MeshStandardMaterial({
      name: clone.name,
      map: clone.map ?? null,
      color: clone.color ? clone.color.clone() : undefined,
      side: clone.side,
    });
  }
  // Some exports bake per-vertex colors that multiply against
  // material.color regardless of what we set — if that baked data is
  // black, the surface stays black no matter what color we assign.
  // Also render both faces in case this mesh has inverted/flipped
  // normals (common in mirrored/duplicated export geometry), which
  // would otherwise make it render near-black under front-lit shading.
  clone.vertexColors = false;
  clone.side = THREE.DoubleSide;
  // Some exports bake a fake highlight/glow as an emissive color+map on
  // otherwise-plain metal materials (e.g. this device's rear-lens ring
  // material, which kept rendering a hardcoded teal no matter what
  // mat.color/map were set to). Every non-screen bucket is meant to be a
  // real lit surface, not something glowing on its own, so kill emissive
  // here for every clone. The screen branch sets its own emissive/
  // emissiveMap explicitly right after this, so it's unaffected.
  clone.emissive = new THREE.Color(0x000000);
  clone.emissiveMap = null;
  clone.emissiveIntensity = 1;
  // This export's glass materials ("Glass-Back", "Glass-Rough", etc.)
  // are authored with transparent:true / opacity<1 baked into the
  // source file. That carries over on clone even though every one of
  // our buckets (body, frame, logo, trim, lens...) is meant to render
  // as a solid opaque surface — force it back to opaque here, once,
  // for every node-bucketed material.
  // iPhone 15 Pro Max: Object_114 is a genuine translucent black glass
  // overlay sitting directly above Object_116, the base plate whose own
  // texture bakes the LiDAR window in as darker shading. Forcing it fully
  // opaque like every other node-bucketed material turns it into a solid
  // sheet that hides that baked detail entirely — keep its authored
  // blending here instead, so Object_116 shows through it like real
  // glass would.
  const keepTransparent = (KEEP_TRANSPARENT_NODES[deviceLabel] ?? []).includes(nodeName);
  if (!keepTransparent) {
    clone.transparent = false;
    clone.opacity = 1;
    // glTF BLEND materials load with depthWrite=false; now that this is opaque,
    // it has to write depth or coplanar surfaces can paint over it.
    clone.depthWrite = true;
  }
  if (ALPHA_CUTOUT_MATERIALS.includes(m.name)) clone.alphaTest = 0.5;
  // The see-through look wasn't actually alpha blending — Blender's
  // glass shader exports via KHR_materials_transmission, which three.js
  // loads onto MeshPhysicalMaterial as `transmission` (physically-based
  // "see through the surface", independent of transparent/opacity).
  // Zeroing transparent/opacity alone does nothing to it. Every one of
  // our buckets should read as a solid physical surface, so kill
  // transmission (and its supporting props) on every cloned material.
  if ("transmission" in clone) {
    clone.transmission = 0;
    clone.thickness = 0;
  }
  clone.needsUpdate = true;
  return clone;
});
              obj.material = Array.isArray(obj.material) ? clonedMats : clonedMats[0];

              const addTo = (list) =>
                clonedMats.forEach((m) => {
                  if (m && !list.includes(m)) list.push(m);
                });
              let bucket = "(unmatched, no bucket)";

              const backSplit = BACK_GLASS_SPLIT[deviceLabel];
              if (backSplit && nodeName === backSplit.node) {
                const glassPart = splitMeshBelowZ(obj, backSplit.zMax);
                if (glassPart) bodyMats.push(glassPart.material);
              }

              // Confirmed-by-material-name overrides win outright, before
              // any node-name-based check runs — see MATERIAL_NAME_OVERRIDE.
              const overrideBucket = getMaterialOverrideBucket(deviceLabel, matNames);

              if (overrideBucket === "frame") {
                addTo(frameMats);
                bucket = "frame (material override)";
              } else if (overrideBucket === "body") {
                addTo(bodyMats);
                bucket = "body (material override)";
              } else if (overrideBucket === "logo") {
                addTo(logoMats);
                clonedMats.forEach((m) => {
                  if (!m) return;
                  m.polygonOffset = true;
                  m.polygonOffsetFactor = -2;
                  m.polygonOffsetUnits = -2;
                });
                bucket = "logo (material override)";
              } else if (overrideBucket === "antenna") {
                addTo(antennaMats);
                bucket = "antenna (material override)";
              } else if (overrideBucket === "trim") {
                addTo(trimMats);
                bucket = "trim (material override)";
              } else if (overrideBucket === "lens") {
                addTo(lensMats);
                bucket = "lens (material override)";
} else if (overrideBucket === "cameraPlateau") {
  addTo(cameraPlateauMats);
  bucket = "cameraPlateau (material override)";
} else if (overrideBucket === "flash") {
  addTo(flashMats);
  bucket = "flash (material override)";
} else if (overrideBucket === "flashBorder") {
  addTo(flashBorderMats);
  bucket = "flashBorder (material override)";
} else if (matchesAny(names.frame, nodeName)) {
                addTo(frameMats);
                bucket = "frame";
              } else if (matchesAny(names.body, nodeName)) {
                addTo(bodyMats);
                bucket = "body";
              } else if (matchesAny(names.logo, nodeName)) {
                addTo(logoMats);
                // Logo is coplanar with the back glass's outer face; bias its depth.
                clonedMats.forEach((m) => {
                  if (!m) return;
                  m.polygonOffset = true;
                  m.polygonOffsetFactor = -2;
                  m.polygonOffsetUnits = -2;
                });
                bucket = "logo";
              } else if (matchesAny(names.antenna, nodeName)) {
                addTo(antennaMats);
                bucket = "antenna";
              } else if (matchesAny(names.trim, nodeName)) {
                addTo(trimMats);
                bucket = "trim";
              } else if (matchesAny(names.lens, nodeName)) {
                addTo(lensMats);
                bucket = "lens";
              } else if (matchesAny(names.flash, nodeName)) {
                addTo(flashMats);
                bucket = "flash";
              } else if (matchesAny(names.flashBorder, nodeName)) {
                addTo(flashBorderMats);
                bucket = "flashBorder";
              } else if (matchesAny(names.cameraPlateau, nodeName)) {
                addTo(cameraPlateauMats);
                // This mesh is a glass dome that envelops the whole camera
                // cluster's footprint, sitting almost exactly coplanar with
                // the much smaller LiDar_LiDar_0 window beneath it (~0.02mm
                // apart in the source model). That was invisible while both
                // were near-black (LENS_FINISH), but now that this reads as
                // the actual finish color it wins the z-fight and paints
                // over the LiDAR window. Push it back slightly so LiDAR
                // always renders on top.
                if (nodeName === "camera_module_glass_0") {
                  clonedMats.forEach((m) => {
                    if (!m) return;
                    m.polygonOffset = true;
                    m.polygonOffsetFactor = 1;
                    m.polygonOffsetUnits = 4;
                  });
                }
                // iPhone 15 Pro: Object_133 (material WwsbjWsUTqkHjyi.002,
                // baseColorFactor authored white so the selected finish
                // tints it) is the plateau's shared base plate — same
                // situation as the 15 Pro Max's Object_116 above. Confirmed
                // by extracting and viewing the texture: three large dark
                // circles for the lens holes plus one small dot (LiDAR)
                // baked in as shading.
                if (deviceLabel === "iPhone 15 Pro" && nodeName === "Object_133") {
                  clonedMats.forEach((m) => {
                    if (!m) return;
                    m.userData.preserveBakedShading = true;
                    if (m.map) m.map = crushShadowsToBlack(m.map);
                  });
                }
                bucket = "cameraPlateau";
              } else if (
                matchesAny(names.cameraRing, nodeName) ||
                matchesAny(CAMERA_RING_MATERIAL_OVERRIDE[deviceLabel] ?? [], matNames[0])
              ) {
                addTo(cameraRingMats);
                bucket = "cameraRing";
  } else if (matchesAny(names.strap ?? [], nodeName)) {
    addTo(strapMats);
    strapMeshes.push(obj);
    bucket = "strap";
} else if (matchesAny(names.port ?? [], nodeName)) {
  addTo(portMats);
  bucket = "port";
} else if (normalizeMatName(nodeName) === normalizeMatName(names.screen)) {
                if (SCREEN_UV_WORLD_PLANAR[deviceLabel]) remapScreenUVsWorldPlanar(obj, SCREEN_KEEP_ALL_TRIS[deviceLabel]);
                else remapScreenUVsPlanar(obj);
                pushScreenBack(obj, SCREEN_PUSH_BACK_MM[deviceLabel]); // <-- add this line
                screenMat = clonedMats[0];
                // Screen is coplanar with the black bezel meshes (17-Screen / 17-ScreenEdge);
                // bias its depth so it wins instead of z-fighting with them.
                screenMat.polygonOffset = true;
screenMat.polygonOffsetFactor = SCREEN_POLYGON_OFFSET_FACTOR[deviceLabel] ?? -4;
                screenMat.polygonOffsetUnits = SCREEN_POLYGON_OFFSET_UNITS[deviceLabel] ?? -4;
                obj.renderOrder = 1;
const tex = resolveScreenTexture(stateRef.current, deviceLabel);
                screenMat.map = tex;
                screenMat.emissive = new THREE.Color(0xffffff);
                screenMat.emissiveMap = tex;
                screenMat.needsUpdate = true;
                obj.layers.disable(1);
                if (NEEDS_ISLAND_MESH[deviceLabel]) {
                  if (ISLAND_ATTACH_TO_SCREEN[deviceLabel]) {
                    const island = attachIslandToScreen(obj, deviceLabel);
                    if (island) obj.add(island);
                  } else {
                    const islandCfg = deriveIslandLayout(obj, deviceLabel);
                    if (islandCfg) obj.parent.add(makeIslandMesh(islandCfg));
                  }
                }
                bucket = "screen";
              }

              console.log(`[${deviceLabel}] node ${nodeName}:`, matNames, "->", bucket);
              return;
            }

            const buckets = [];

            // Node-name-only override (default/non-node-bucketed devices):
            // clone this mesh's material independently so it can get a
            // fixed finish regardless of what generic material it shares.
            if ((PORT_NODE_OVERRIDE[deviceLabel] ?? []).includes(obj.name)) {
              const srcMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
              const portMat = srcMat.clone();
              portMat.map = null;
              obj.material = Array.isArray(obj.material) ? [portMat] : portMat;
              portMats.push(portMat);
              console.log(`[${deviceLabel}] ${obj.name}: split into dedicated port material`);
              return;
            }

            // iPhone Air: delete the baked island pill, and split the camera plateau
            // out of the back-glass mesh so it can be finished as polished glass.
            const strip = ISLAND_STRIP[deviceLabel];
            if (strip && mats.some((m) => matchesAny([strip.material], m?.name))) {
              stripBakedIsland(obj, strip.box);
            }
            const split = PLATEAU_SPLIT[deviceLabel];
            if (split && mats.some((m) => matchesAny([split.material], m?.name))) {
              const plateauPart = splitMeshByZ(obj, split.zMin);
              if (plateauPart) cameraPlateauMats.push(plateauPart.material);
            }
            const btnSplit = CAMERA_CONTROL_BUTTON_SPLIT[deviceLabel];
            if (btnSplit && mats.some((m) => matchesAny([btnSplit.material], m?.name))) {
              const btnPart = splitMeshByBox(obj, btnSplit.box);
              if (btnPart) cameraRingMats.push(btnPart.material);
            }
                        const antennaSplit = ANTENNA_ISLAND_SPLIT[deviceLabel];
            if (antennaSplit && mats.some((m) => matchesAny([antennaSplit.material], m?.name))) {
              const antennaPart = splitMeshByIslands(obj, antennaSplit.matchFn);
              if (antennaPart) antennaMats.push(antennaPart.material);
            }
            mats.forEach((mat) => {
              if (!mat) return;
              let matched = false;
              if (matchesAny(names.frame, mat.name)) {
                if (!frameMats.includes(mat)) frameMats.push(mat);
                buckets.push(`${mat.name} -> frame`);
                matched = true;
              }
              if (matchesAny(names.body, mat.name)) {
                if (!bodyMats.includes(mat)) bodyMats.push(mat);
                buckets.push(`${mat.name} -> body`);
                matched = true;
              }
              if (matchesAny(names.logo, mat.name)) {
                if (!logoMats.includes(mat)) logoMats.push(mat);
                buckets.push(`${mat.name} -> logo`);
                matched = true;
              }
              if (matchesAny(names.antenna, mat.name)) {
                if (!antennaMats.includes(mat)) antennaMats.push(mat);
                buckets.push(`${mat.name} -> antenna`);
                matched = true;
              }
              if (matchesAny(names.trim, mat.name)) {
                if (!trimMats.includes(mat)) trimMats.push(mat);
                buckets.push(`${mat.name} -> trim`);
                matched = true;
              }
              const preserveListForMat = PRESERVE_NATIVE_BUCKETS[deviceLabel];
              if (matchesAny(names.lens, mat.name)) {
                if (preserveListForMat?.includes("lens")) {
                  // Left completely untouched: no push to lensMats, so
                  // applyBodyFinish/LENS_FINISH never sees this material.
                  buckets.push(`${mat.name} -> lens (native, untouched)`);
                } else {
                  if (!lensMats.includes(mat)) lensMats.push(mat);
                  // iPad Pro 11-inch: LiDAR sits exactly coplanar with the
                  // camera plateau's backing plate ("background", both at
                  // z≈4.5938) — nudge it forward so it always wins the
                  // z-fight instead of disappearing behind the flat backing.
                  if (deviceLabel === "iPad Pro 11-inch" && mat.name === "LiDAR") {
                    mat.polygonOffset = true;
                    mat.polygonOffsetFactor = -2;
                    mat.polygonOffsetUnits = -4;
                  }
                  buckets.push(`${mat.name} -> lens`);
                }
                matched = true;
              }
              if (matchesAny(names.flash, mat.name)) {
                if (preserveListForMat?.includes("flash")) {
                  buckets.push(`${mat.name} -> flash (native, untouched)`);
                } else {
                  if (!flashMats.includes(mat)) flashMats.push(mat);
                  buckets.push(`${mat.name} -> flash`);
                }
                matched = true;
              }
              if (matchesAny(names.flashBorder, mat.name)) {
                if (preserveListForMat?.includes("flashBorder")) {
                  buckets.push(`${mat.name} -> flashBorder (native, untouched)`);
                } else {
                  if (!flashBorderMats.includes(mat)) flashBorderMats.push(mat);
                  buckets.push(`${mat.name} -> flashBorder`);
                }
                matched = true;
              }
              if (matchesAny(names.cameraPlateau, mat.name)) {
                if (!cameraPlateauMats.includes(mat)) cameraPlateauMats.push(mat);
                buckets.push(`${mat.name} -> cameraPlateau`);
                matched = true;
              }
              if (normalizeMatName(mat.name) === normalizeMatName(names.screen)) {
                // Reverted: remapScreenUVsPlanar rebuilds UVs right-side-up by
                // construction, which then gets double-flipped by
                // SCREEN_TEXTURE_CONFIG["iPhone Air"]'s flipVertical:true (needed
                // for this export's native, naturally-upside-down UVs) — that
                // combination is what produced the fully inverted render. The
                // Air's status-bar centering should instead rely on the
                // DYNAMIC_ISLAND_SPEC/deriveIslandLayout fixes already in place,
                // plus STATUS_BAR_CENTER_X_OFFSET_PT["iPhone Air"] if any residual
                // horizontal drift remains once re-tested.

                // Some exports (e.g. 17 Pro Max) author the screen material
                // with the glTF KHR_materials_unlit extension, which
                // GLTFLoader turns into a MeshBasicMaterial rather than
                // MeshStandardMaterial. MeshBasicMaterial has no emissive/
                // emissiveMap/emissiveIntensity/roughness/metalness/
                // envMapIntensity properties at all — every line below and
                // in applyScreenReflection/applyScreenBrightness that sets
                // those is a silent no-op on that material type, which is
                // why this screen reads flat/dark regardless of any
                // brightness or reflection tuning. Detect that and swap in
                // a real MeshStandardMaterial, carrying over the map/name/
                // side so the rest of the pipeline (which assumes a
                // PBR-capable material) actually has an effect.
                if (!mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) {
                  const upgraded = new THREE.MeshStandardMaterial({
                    name: mat.name,
                    map: mat.map ?? null,
                    side: mat.side,
                  });
                  if (Array.isArray(obj.material)) {
                    const idx = obj.material.indexOf(mat);
                    if (idx !== -1) obj.material[idx] = upgraded;
                  } else {
                    obj.material = upgraded;
                  }
                  mat = upgraded;
                  console.log(`[${deviceLabel}] upgraded non-PBR screen material (${mat.name}) to MeshStandardMaterial`);
  }

  screenMat = mat;
   const tex = resolveScreenTexture(stateRef.current, deviceLabel);
                screenMat.map = tex;
                screenMat.emissive = new THREE.Color(0xffffff);
                screenMat.emissiveMap = tex;
                // This depth bias already existed for node-bucketed devices
                // (17/17 Pro) to stop the screen z-fighting with coplanar
                // bezel/trim geometry, but was missing here on the
                // material-name-bucketed path (17 Pro Max, default/16 Pro
                // Max). If this export's screen sits flush with a trim
                // mesh, z-fighting fragments of that dark trim bleeding
                // across the screen would read as an overall duller/darker
                // screen rather than an obvious visual glitch.
                screenMat.polygonOffset = true;
                screenMat.polygonOffsetFactor = -4;
               screenMat.polygonOffsetUnits = SCREEN_POLYGON_OFFSET_UNITS[deviceLabel] ?? -4;
                obj.renderOrder = 1;
                screenMat.needsUpdate = true;
                obj.layers.disable(1);
                if (NEEDS_ISLAND_MESH[deviceLabel]) {
                  const islandCfg = deriveIslandLayout(obj, deviceLabel);
                  if (islandCfg) obj.parent.add(makeIslandMesh(islandCfg));
                }
                buckets.push(`${mat.name} -> screen`);
                matched = true;
              }
              if (!matched) buckets.push(`${mat.name} -> (unmatched, no bucket)`);
            });

            console.log(`[${deviceLabel}] ${obj.name}:`, matNames, "->", buckets.join(", "));
          });
const lidarOverlay = LIDAR_OVERLAY[deviceLabel];
if (lidarOverlay) {
  const anchor = model.getObjectByName(lidarOverlay.anchorNode);
  if (anchor) {
    const disc = makeLidarOverlayDisc(lidarOverlay.radius, lidarOverlay.normalAxis, lidarOverlay.offset);
    disc.position.set(...lidarOverlay.center);
    anchor.parent.add(disc);
  } else {
    console.warn(`[${deviceLabel}] LiDAR overlay: anchor node "${lidarOverlay.anchorNode}" not found`);
  }
}

          patchWordmark(model, deviceLabel);
          raiseScreenAssembly(model, deviceLabel);
            if (stateRef.current.strapRoot) {
    group.remove(stateRef.current.strapRoot);
    stateRef.current.strapRoot = null;
  }
  stateRef.current.styleStrapMats = [];
  stateRef.current.strapMeshes = strapMeshes;
          group.add(model);

          stateRef.current.currentModel = model;
          stateRef.current.currentDeviceLabel = deviceLabel;
          stateRef.current.materials = { frame: frameMats, body: bodyMats, logo: logoMats, antenna: antennaMats, trim: trimMats, lens: lensMats, flash: flashMats, flashBorder: flashBorderMats, cameraPlateau: cameraPlateauMats, cameraRing: cameraRingMats, port: portMats, strap: strapMats, screen: screenMat };

          if (!stateRef.current.bodyFinish) {
            stateRef.current.bodyFinish =
              DEVICE_DEFAULT_FINISH[deviceLabel] ?? DEVICE_DEFAULT_FINISH.default;
          }
          applyBodyFinish();
          applyScreenReflection();
          applySculptLightIntensity();
          applyScreenBrightness();
          applyStrapStyle(); 
        },
        undefined,
        (err) => console.error("Failed to load device model:", err)
      );
    }

    stateRef.current.loadModel = loadModel;
    loadModel(MODEL_PATHS[deviceType] ?? MODEL_PATHS.default, deviceType);

    // Radians, not degrees: 0 = model faces the camera. (This was 90 rad, about 117°.)
    const baseRotation = { x: 0, y: 0 };
    group.rotation.x = baseRotation.x;
    group.rotation.y = baseRotation.y;
    // Wrapper for enter / exit animations. It sits above the camera-driven group, so the two never fight.
    const animGroup = new THREE.Group();
    animGroup.add(group);
    scene.add(animGroup);
    stateRef.current.animGroup = animGroup;

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (stateRef.current.frameMode) return; // Frame mode: the 2D layer covers the scene
      renderer.render(scene, camera);
    };
    animate();

    // Observe the mount itself, not the window: the container also resizes when the left
    // sidebar collapses or the canvas-size aspect changes, and neither fires a window resize.
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      if (stateRef.current.frameMode) return; // re-synced when Frame mode turns off
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (stateRef.current.bgImageTex) {
        applyBackgroundImageCover(stateRef.current.bgImageTex, stateRef.current.bgImageAspect);
      }
      refreshBackText();
      // setSize clears the canvas, and ResizeObserver fires after the animation-frame render,
      // so redraw now or the canvas flashes blank while the sidebar animates.
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    stateRef.current = {
      ...stateRef.current,
      scene,
      camera,
      renderer,
      sculptLight,
      materials: stateRef.current.materials ?? { frame: [], body: [], screen: null },
      bodyFinish: stateRef.current.bodyFinish ?? null,
      ambient,
      key,
      fill,
      group,
      baseRotation,
      manualXOffset: 0,
      manualYOffset: 0,
      manualZOffset: 0,
      reflectionMode: "shiny",
      reflectionIntensityShiny: 0,
      reflectionIntensityMatte: 0,
      zoomValue: zoomFromDist(camera.position.length()),
      currentEnvKey: "none",
      envRenderTarget: null,
      baseKeyIntensity: PRESETS.none.key.intensity,
      lightingIntensityPct: 60,
      lightingPresetKey: "none",
      lightDirXPct: 50,
      lightDirYPct: 50,
      screenBrightnessPct: stateRef.current.screenBrightnessPct ?? 30,
    };

    applySculptLightIntensity();

    // --- Drag-to-rotate: pointer drag on the canvas rotates the group
    // directly, updating the same offsets the X/Y-Rotation sliders use.
    const DEG_PER_PX = 0.3;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const applyRotation = () => {
      const s = stateRef.current;
      s.group.rotation.x = s.baseRotation.x + s.manualXOffset;
      s.group.rotation.y = s.baseRotation.y + s.manualYOffset;
      s.group.rotation.z = s.manualZOffset;
    };

    const onPointerDown = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const s = stateRef.current;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const dxDeg = dx * DEG_PER_PX;
      const dyDeg = dy * DEG_PER_PX;

      const clampDeg = (rad) =>
        THREE.MathUtils.clamp(rad, THREE.MathUtils.degToRad(-360), THREE.MathUtils.degToRad(360));

      s.manualYOffset = clampDeg(s.manualYOffset + THREE.MathUtils.degToRad(dxDeg));
      s.manualXOffset = clampDeg(s.manualXOffset + THREE.MathUtils.degToRad(dyDeg));
      applyRotation();

      onViewChange?.({
        rotationX: Math.round(THREE.MathUtils.radToDeg(s.manualXOffset)),
        rotationY: Math.round(THREE.MathUtils.radToDeg(s.manualYOffset)),
      });
    };

    const onPointerUp = (e) => {
      dragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    };

    // --- Scroll-to-zoom: wheel adjusts the same zoom value the Zoom slider uses.
    const onWheel = (e) => {
      e.preventDefault();
      const s = stateRef.current;
      const next = THREE.MathUtils.clamp(s.zoomValue - e.deltaY * 0.08, 0, 100);
      s.zoomValue = next;
      const dist = distFromZoom(next);
      s.camera.position.setLength(dist);
      onViewChange?.({ zoom: Math.round(next) });
    };

    const el = renderer.domElement;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointerleave", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onPointerUp);
      el.removeEventListener("wheel", onWheel);
      stateRef.current.envRenderTarget?.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [onViewChange]);

  useImperativeHandle(ref, () => ({
        // cropRect, when provided, is {x, y, width, height} in the source
    // image's own natural pixel space (exactly what CropModal's onApply
    // reports). It's used verbatim as the drawImage source rect — since
    // drawImage always scales src->dst, a Freeform rect that doesn't match
    // the screen's aspect just stretches to fill, same as any other crop.
    // With no cropRect (plain upload, no crop applied yet), falls back to
    // the previous behavior: auto-centered crop matching the screen's own aspect.
    uploadFile(file, cropRect) {
      const s = stateRef.current;
      if (!file || !s.materials?.screen) return;
      // Undo/redo can fire uploads and clears back to back; only the latest call may paint.
      const token = (s.uploadToken = (s.uploadToken ?? 0) + 1);
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => URL.revokeObjectURL(objectUrl);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl); // already decoded, so repaints from `img` still work
        if (s.uploadToken !== token) return;
        // Keep the source so the texture can be repainted when the device model changes.
        s.screenSource = { img, cropRect };
        s.screenTexture?.dispose();
        const tex = paintScreenTexture(img, cropRect, s.currentDeviceLabel, s.screenOverlays);
        s.materials.screen.map = tex;
        s.materials.screen.emissiveMap = tex;
        s.materials.screen.needsUpdate = true;
        s.screenTexture = tex;
      };
      img.src = objectUrl;
    },

    clearScreenshot() {
      const s = stateRef.current;
      s.uploadToken = (s.uploadToken ?? 0) + 1; // cancels any upload still loading
      if (!s.materials?.screen) return;
      const tex = makePlaceholderTexture(s.currentDeviceLabel, s.screenOverlays);
      s.materials.screen.map = tex;
      s.materials.screen.emissiveMap = tex;
      s.materials.screen.needsUpdate = true;
      s.screenTexture?.dispose();
      s.screenTexture = null;
      s.screenSource = null;
    },

    // Frame mode pauses rendering (the 2D layer covers the scene). On the way out, the
    // renderer is re-synced to the canvas, since resizes were skipped while paused.
    setFrameMode(on) {
      const s = stateRef.current;
      const mount = mountRef.current;
      s.frameMode = !!on;
      if (!on && s.renderer && s.camera && mount) {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (w && h) {
          s.camera.aspect = w / h;
          s.camera.updateProjectionMatrix();
          s.renderer.setSize(w, h);
          if (s.bgImageTex) applyBackgroundImageCover(s.bgImageTex, s.bgImageAspect);
          refreshBackText();
        }
      }
    },

    // Text popup item (or null). Behind text is drawn in the scene; front text is composited on export.
    setText(item) {
      stateRef.current.textItem = item;
      refreshBackText();
    },

    setDeviceType(deviceLabel) {
      const s = stateRef.current;
      const path = MODEL_PATHS[deviceLabel] ?? MODEL_PATHS.default;
      s.loadModel?.(path, deviceLabel);
    },

    // Lighting-only preset apply — does NOT touch scene.background.
    setLightingPreset(presetKey) {
      const s = stateRef.current;
      if (!s.ambient || !s.key || !s.fill) return;
      const p = PRESETS[presetKey];
      if (!p) return;
      s.lightingPresetKey = presetKey;
      s.baseKeyIntensity = p.key.intensity;
      s.ambient.color.set(p.ambient.color);
      s.ambient.intensity = p.ambient.intensity;
      s.key.color.set(p.key.color);
      s.key.intensity = p.key.intensity;
      s.key.position.set(...p.key.pos);
      s.fill.color.set(p.fill.color);
      s.fill.intensity = p.fill.intensity;
      s.fill.position.set(...p.fill.pos);
      // The specular highlight on metal/glass now carries the preset's
      // color (positioned by the direction pad, sized by the intensity
      // slider) instead of a flat white highlight.
      if (s.sculptLight) s.sculptLight.color.set(p.key.color);
      applyLightingTint();
    },

    // key: "none" | "studio" | "city" | "sunset" | "clouds"
    setEnvironment(key) {
      const s = stateRef.current;
      if (!s.renderer || !s.scene) return;
      s.currentEnvKey = key;
      const requestedKey = key;
      loadEnvironmentTexture(s.renderer, key)
        .then((result) => {
          // Bail if the user switched environments again before this one finished loading
          if (stateRef.current.currentEnvKey !== requestedKey) return;
          stateRef.current.envRenderTarget?.dispose();
          if (result) {
            stateRef.current.scene.environment = result.texture;
            stateRef.current.envRenderTarget = result.renderTarget;
          } else {
            stateRef.current.scene.environment = null;
            stateRef.current.envRenderTarget = null;
          }
        })
        .catch((err) => console.error("Failed to load environment HDRI:", err));
    },

    // { statusBar?: boolean, homeIndicator?: boolean }. Stored so device switches keep it.
    setScreenOverlays(overlays) {
      const s = stateRef.current;
      const prevOrientation = s.screenOverlays?.orientation;
      s.screenOverlays = { ...(s.screenOverlays ?? {}), ...overlays };
      if (s.screenOverlays.orientation !== prevOrientation) {
        // A crop made for the old aspect would stretch, so drop it (auto-crop takes over).
        if (s.screenSource?.cropRect) s.screenSource = { ...s.screenSource, cropRect: undefined };
        if (TABLET_DEVICES[s.currentDeviceLabel] && s.currentModel) {
          fitModel(s.currentModel, s.currentDeviceLabel, s.screenOverlays);
        }
      }
      refreshScreenTexture();
    },

    setBrightness(value) {
      const s = stateRef.current;
      s.screenBrightnessPct = value;
      applyScreenBrightness();
    },

    // Drives the sculpt light's intensity only — see applySculptLightIntensity.
    setLightingIntensity(value) {
      const s = stateRef.current;
      s.lightingIntensityPct = value;
      applySculptLightIntensity();
      applyLightingTint();
    },

    setScreenReflection(mode, intensity) {
      const s = stateRef.current;
      s.reflectionMode = mode;
      if (mode === "shiny") s.reflectionIntensityShiny = intensity;
      else s.reflectionIntensityMatte = intensity;
      applyScreenReflection();
    },

    // opacity blends toward white as a stand-in for transparency, same
    // convention as setBackground. Stores the finish so it can be
    // (re-)applied whenever materials become available (model load may
    // still be in flight when this is first called).
    // `name` is the finish's own dropdown label (e.g. "Sky Blue") —
    // passed through so applyBodyFinish() can look up per-part color
    // overrides for devices where frame/antenna/ring aren't just a
    // tint of the body color.
    setBodyColor(hex, opacityPct, roughness, metalness, name) {
      const s = stateRef.current;
      s.bodyFinish = { hex, opacityPct, roughness, metalness, name };
      applyBodyFinish();
    },

    // finish = { pattern, hex, hex2, roughness, metalness } or null for the authored strap
setStrap(finish) {
  stateRef.current.strapFinish = finish;
    applyStrap();
},

setStrapStyle(key) {
  stateRef.current.strapStyle = key;
  applyStrapStyle();
},

    // manual rotation in degrees — same state canvas-drag writes to
    setManualRotation(xDeg) {
      const s = stateRef.current;
      if (!s.group) return;
      s.manualXOffset = THREE.MathUtils.degToRad(xDeg);
      s.group.rotation.x = s.baseRotation.x + s.manualXOffset;
    },

    setManualRotationY(yDeg) {
      const s = stateRef.current;
      if (!s.group) return;
      s.manualYOffset = THREE.MathUtils.degToRad(yDeg);
      s.group.rotation.y = s.baseRotation.y + s.manualYOffset;
    },

    setManualRotationZ(zDeg) {
      const s = stateRef.current;
      if (!s.group) return;
      s.manualZOffset = THREE.MathUtils.degToRad(zDeg);
      s.group.rotation.z = s.manualZOffset;
    },

    // -100..100 maps to -4..4 world units
    setPositionX(value) {
      const s = stateRef.current;
      if (!s.group) return;
      s.group.position.x = value / 25;
    },

    setPositionY(value) {
      const s = stateRef.current;
      if (!s.group) return;
      s.group.position.y = value / 25;
    },

    // 0-100, same mapping the wheel handler uses — kept in sync via zoomFromDist/distFromZoom
    setZoom(value) {
      const s = stateRef.current;
      if (!s.camera) return;
      s.zoomValue = value;
      s.camera.position.setLength(distFromZoom(value));
    },

    // 0-120 slider maps to a usable 15°-90° field of view
    setFov(value) {
      const s = stateRef.current;
      if (!s.camera) return;
      s.camera.fov = 15 + (value / 120) * 75;
      s.camera.updateProjectionMatrix();
    },

    // opacity blends the color toward white as a stand-in for transparency
    setBackground(hex, opacityPct) {
      const s = stateRef.current;
      if (!s.scene) return;
      s.bgImageTex = null;
      s.bgImageAspect = null;
      const color = new THREE.Color(`#${hex}`);
      const alpha = opacityPct / 100;
      s.scene.background = color.clone().lerp(new THREE.Color("#ffffff"), 1 - alpha);
    },

    setBackgroundGradient(type, stops, opacityPct, angleDeg = 90, grainAmount = 0) {
      const s = stateRef.current;
      if (!s.scene || !stops?.length) return;
      s.bgImageTex = null;
      s.bgImageAspect = null;
      const size = 512;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      const alpha = opacityPct / 100;

      const toRgba = (hex, stopOpacity) => {
        const n = parseInt(hex, 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return `rgba(${r}, ${g}, ${b}, ${(stopOpacity / 100) * alpha})`;
      };

      const sorted = [...stops].sort((a, b) => a.position - b.position);
      let grad;

      if (type === "Radial") {
        grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      } else if ((type === "Angular" || type === "Diamond") && ctx.createConicGradient) {
        const startAngle = ((type === "Diamond" ? angleDeg + 45 : angleDeg) * Math.PI) / 180;
        grad = ctx.createConicGradient(startAngle, size / 2, size / 2);
      } else {
        // Linear — rotate the gradient axis to match CSS's angle convention
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        const cx = size / 2, cy = size / 2, half = size / 2;
        const dx = Math.cos(rad) * half, dy = Math.sin(rad) * half;
        grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      }

      sorted.forEach((stop) => grad.addColorStop(stop.position / 100, toRgba(stop.hex, stop.opacity)));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      applyGrain(ctx, size, size, grainAmount);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      s.scene.background = tex;
    },

    setBackgroundImage(url) {
      const s = stateRef.current;
      if (!s.scene) return;

      // No image picked/uploaded yet — fall back to the neutral "None"
      // preset background instead of leaving the scene with no background
      // at all (and clear any in-flight load so it doesn't overwrite this).
      if (!url) {
        s.scene.background = new THREE.Color(PRESETS.none.bg);
        s.currentBgImageUrl = null;
        s.bgImageTex = null;
        s.bgImageAspect = null;
        return;
      }

      const requestedUrl = url;
      const loader = new THREE.TextureLoader();
      loader.load(requestedUrl, (tex) => {
        if (stateRef.current.currentBgImageUrl !== requestedUrl) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        const img = tex.image;
        stateRef.current.bgImageTex = tex;
        stateRef.current.bgImageAspect = img.width / img.height;
        applyBackgroundImageCover(tex, stateRef.current.bgImageAspect);
        s.scene.background = tex;
      });
      stateRef.current.currentBgImageUrl = requestedUrl;
    },

    // Live background from a 2D canvas, used by the timeline's background animations.
    // App.jsx redraws the same canvas every frame and calls this again; passing null
    // releases it (the caller then sets the normal background right after).
    setBackgroundCanvas(canvas) {
      const s = stateRef.current;
      if (!s.scene) return;

      if (!canvas) {
        s.bgCanvasTex?.dispose();
        s.bgCanvasTex = null;
        s.bgCanvasSource = null;
        return;
      }

      // The animation owns the background now: stop any in-flight image load
      // from overwriting it, and drop the cover-fit state of a previous image.
      s.currentBgImageUrl = null;
      s.bgImageTex = null;
      s.bgImageAspect = null;

      // Texture storage can't be resized, so rebuild it if the canvas changed or was resized.
      if (
        !s.bgCanvasTex ||
        s.bgCanvasSource !== canvas ||
        s.bgCanvasW !== canvas.width ||
        s.bgCanvasH !== canvas.height
      ) {
        s.bgCanvasTex?.dispose();
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        s.bgCanvasTex = tex;
        s.bgCanvasSource = canvas;
        s.bgCanvasW = canvas.width;
        s.bgCanvasH = canvas.height;
      }

      s.bgCanvasTex.needsUpdate = true; // re-upload this frame's pixels
      s.scene.background = s.bgCanvasTex;
    },

  setLightDirection(xPct, yPct) {
      const s = stateRef.current;
      if (!s.sculptLight) return;
      const nx = (xPct - 50) / 50;
      const ny = (yPct - 50) / 50;
      s.sculptLight.position.set(nx * SCULPT_LIGHT_RADIUS, -ny * SCULPT_LIGHT_RADIUS, SCULPT_LIGHT_Z);
      s.lightDirXPct = xPct;
      s.lightDirYPct = yPct;
    },

    resetView(duration = 500) {
      const s = stateRef.current;
      if (!s.group || !s.camera) return;

      const startXOffset = s.manualXOffset;
      const startYOffset = s.manualYOffset;
      const startZOffset = s.manualZOffset;
      const startPos = s.group.position.clone();
      const startCamPos = s.camera.position.clone();
      const startFov = s.camera.fov;
      const targetCamPos = new THREE.Vector3(0, 0, distFromZoom(70));
      const targetFov = 32;
      const startTime = performance.now();

      const step = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = easeInOutSoft(t);

        s.manualXOffset = startXOffset * (1 - eased);
        s.manualYOffset = startYOffset * (1 - eased);
        s.manualZOffset = startZOffset * (1 - eased);
        s.group.rotation.x = s.baseRotation.x + s.manualXOffset;
        s.group.rotation.y = s.baseRotation.y + s.manualYOffset;
        s.group.rotation.z = s.manualZOffset;
        s.group.position.lerpVectors(startPos, new THREE.Vector3(0, 0, 0), eased);

        s.camera.position.lerpVectors(startCamPos, targetCamPos, eased);
        s.camera.fov = startFov + (targetFov - startFov) * eased;
        s.camera.updateProjectionMatrix();
        s.zoomValue = zoomFromDist(s.camera.position.length());

        onViewChange?.({
          rotationX: Math.round(THREE.MathUtils.radToDeg(s.manualXOffset)),
          rotationY: Math.round(THREE.MathUtils.radToDeg(s.manualYOffset)),
          rotationZ: Math.round(THREE.MathUtils.radToDeg(s.manualZOffset)),
          positionX: Math.round(s.group.position.x * 25),
          positionY: Math.round(s.group.position.y * 25),
          zoom: Math.round(s.zoomValue),
          fov: Math.round(((s.camera.fov - 15) / 75) * 120),
        });

        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },

    // Enter / exit pose for the whole device (null = resting).
    // pose: { a: opacity 0-1, x, y: offset in screens (±1 = just off the edge), s: scale, rx, ry: radians }
    setDeviceAnim(pose) {
      const s = stateRef.current;
      if (!s.animGroup || !s.camera || !s.group) return;
      const p = pose ?? {};
      const a = p.a ?? 1;
      const hh = s.camera.position.length() * Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2));
      const hw = hh * s.camera.aspect;
      s.animGroup.position.set((p.x ?? 0) * (hw + 3.5), (p.y ?? 0) * (hh + 3.5), 0);
      s.animGroup.scale.setScalar(Math.max(0.001, p.s ?? 1));
      s.animGroup.rotation.set(p.rx ?? 0, p.ry ?? 0, 0);

      const fading = a < 0.999;
      if (!fading && !s.animFaded) return; // nothing to fade or restore
      s.group.traverse((o) => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (!m) return;
          m.userData.animOrig ??= { opacity: m.opacity, transparent: m.transparent };
          const orig = m.userData.animOrig;
          m.opacity = orig.opacity * (fading ? a : 1);
          m.transparent = fading || orig.transparent;
        });
      });
      s.animFaded = fading;
    },

        // True if the point (screen coords) is over a visible part of the device.
    hitTest(clientX, clientY) {
      const s = stateRef.current;
      if (!s.renderer || !s.camera || !s.group) return false;
      const r = s.renderer.domElement.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const ndc = new THREE.Vector2(
        ((clientX - r.left) / r.width) * 2 - 1,
        -((clientY - r.top) / r.height) * 2 + 1
      );
      const rc = new THREE.Raycaster();
      rc.layers.enableAll();
      rc.setFromCamera(ndc, s.camera);
      s.group.updateMatrixWorld(true);
      return rc.intersectObject(s.group, true).some((hit) => {
        for (let o = hit.object; o; o = o.parent) if (!o.visible) return false;
        return true;
      });
    },

    exportAt(targetWidth, mime = "image/png", ext = "png", targetHeight, transparent = false) {
      const s = stateRef.current;
      const mount = mountRef.current;
      if (!s.renderer || !mount) return;

      const liveAspect = mount.clientWidth / mount.clientHeight;
      const exportWidth = targetWidth;
      const exportHeight = targetHeight ?? Math.round(targetWidth / liveAspect);

      const prevPixelRatio = s.renderer.getPixelRatio();
      const prevSize = new THREE.Vector2();
      s.renderer.getSize(prevSize);
      const prevAspect = s.camera.aspect;
      const prevBg = s.scene.background;

      // JPG has no alpha, so never go transparent for it
      const clear = transparent && mime !== "image/jpeg";
      if (clear) s.scene.background = null; // canvas now clears to alpha 0

      const exportScale = exportWidth / mount.clientWidth;
      s.renderer.setPixelRatio(1);
      s.renderer.setSize(exportWidth, exportHeight, false);
      s.camera.aspect = exportWidth / exportHeight;
      s.camera.updateProjectionMatrix();
      rebuildBackText(exportWidth, exportHeight, exportScale); // behind text, crisp at export size
      s.renderer.render(s.scene, s.camera);
      const url = snapshotWithText(exportScale, mime); // front text composited on top

      if (clear) s.scene.background = prevBg; // restore the live background
      s.renderer.setPixelRatio(prevPixelRatio);
      s.renderer.setSize(prevSize.x, prevSize.y, false);
      s.camera.aspect = prevAspect;
      s.camera.updateProjectionMatrix();
      refreshBackText();
      s.renderer.render(s.scene, s.camera);

      const a = document.createElement("a");
      a.href = url;
      a.download = `mockup-${exportWidth}x${exportHeight}.${ext}`;
      a.click();
    },
    // Video export: resize the renderer once, grab frames, then restore.
    beginCapture(w, h) {
      const s = stateRef.current;
      const mount = mountRef.current;
      if (!s.renderer || !mount) return;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      s.capture = {
        w,
        h,
        canvas,
        scale: w / mount.clientWidth,
        ratio: s.renderer.getPixelRatio(),
        size: s.renderer.getSize(new THREE.Vector2()),
        aspect: s.camera.aspect,
      };
      s.renderer.setPixelRatio(1);
      s.renderer.setSize(w, h, false);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      rebuildBackText(w, h, s.capture.scale);
    },

    // Renders the current state and returns a persistent w x h 2D canvas (front text composited on top).
    captureFrame(transparent = false) {
      const s = stateRef.current;
      const c = s.capture;
      if (!c) return null;
      const bg = s.scene.background;
      if (transparent) s.scene.background = null; // restored right after the render, so animated backgrounds still work
      s.renderer.render(s.scene, s.camera);
      s.scene.background = bg;
      const ctx = c.canvas.getContext("2d");
      ctx.clearRect(0, 0, c.w, c.h);
      ctx.drawImage(s.renderer.domElement, 0, 0, c.w, c.h);
      const item = s.textItem;
      if (item?.content && item.layer === "front") paintTextItem(ctx, item, c.w, c.h, c.scale);
      return c.canvas;
    },

    endCapture() {
      const s = stateRef.current;
      const c = s.capture;
      if (!c) return;
      s.renderer.setPixelRatio(c.ratio);
      s.renderer.setSize(c.size.x, c.size.y, false);
      s.camera.aspect = c.aspect;
      s.camera.updateProjectionMatrix();
      s.capture = null;
      refreshBackText();
      s.renderer.render(s.scene, s.camera);
    },

    // Raw WebGL canvas
    getCanvas() {
      return stateRef.current.renderer?.domElement ?? null;
    },

        // True once the model for this device is loaded and previews can be rendered.
    isReady(deviceLabel) {
      const s = stateRef.current;
      return !!(s.group && s.renderer && s.materials?.screen && s.currentDeviceLabel === deviceLabel);
    },

    // Renders the current model at each camera, with a transparent background.
    // cams: [{ rotationX, rotationY, rotationZ, positionX, positionY, zoom, fov }]. Returns data URLs.
    // Each shot is rendered on black and on white; alpha is recovered from the difference.
    // Everything is restored before returning, so the live view never shows it.
    renderPreviews(cams, w = 400, h = 234) {
      const s = stateRef.current;
      if (!s.renderer || !s.scene || !s.camera || !s.group || !s.materials?.screen) return null;
      const { renderer, scene, camera, group } = s;
      const rad = THREE.MathUtils.degToRad;

      const prev = {
        bg: scene.background,
        ratio: renderer.getPixelRatio(),
        size: renderer.getSize(new THREE.Vector2()),
        aspect: camera.aspect,
        fov: camera.fov,
        camPos: camera.position.clone(),
        rot: group.rotation.clone(),
        pos: group.position.clone(),
        backVisible: s.backTextMesh?.visible,
      };
      if (s.backTextMesh) s.backTextMesh.visible = false;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;

      const grab = (color) => {
        scene.background = new THREE.Color(color);
        renderer.render(scene, camera);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(renderer.domElement, 0, 0, w, h);
        return ctx.getImageData(0, 0, w, h).data;
      };

      const urls = cams.map((cam) => {
        group.rotation.set(
          s.baseRotation.x + rad(cam.rotationX),
          s.baseRotation.y + rad(cam.rotationY),
          rad(cam.rotationZ)
        );
        group.position.set(cam.positionX / 25, cam.positionY / 25, 0);
        camera.position.setLength(distFromZoom(cam.zoom));
        camera.fov = 15 + (cam.fov / 120) * 75;
        camera.updateProjectionMatrix();

        const dark = grab("#000000");
        const light = grab("#ffffff");
        const out = new ImageData(w, h);
        for (let i = 0; i < out.data.length; i += 4) {
          const diff = (light[i] - dark[i] + light[i + 1] - dark[i + 1] + light[i + 2] - dark[i + 2]) / (3 * 255);
          const a = Math.min(1, Math.max(0, 1 - diff));
          if (a < 0.004) continue; // fully transparent
          out.data[i] = Math.min(255, dark[i] / a);
          out.data[i + 1] = Math.min(255, dark[i + 1] / a);
          out.data[i + 2] = Math.min(255, dark[i + 2] / a);
          out.data[i + 3] = Math.round(a * 255);
        }
        const oc = document.createElement("canvas");
        oc.width = w;
        oc.height = h;
        oc.getContext("2d").putImageData(out, 0, 0);
        return oc.toDataURL("image/png");
      });

      scene.background = prev.bg;
      if (s.backTextMesh) s.backTextMesh.visible = prev.backVisible;
      renderer.setPixelRatio(prev.ratio);
      renderer.setSize(prev.size.x, prev.size.y, false);
      camera.aspect = prev.aspect;
      camera.fov = prev.fov;
      camera.position.copy(prev.camPos);
      camera.updateProjectionMatrix();
      group.rotation.copy(prev.rot);
      group.position.copy(prev.pos);
      if (!s.frameMode) renderer.render(scene, camera);
      return urls;
    },

    // Renders a small, non-downloading snapshot of the current view — used
    // for project-card thumbnails. Same render/restore dance as exportAt,
    // just returns a data URL instead of triggering a download.
    captureThumbnail(targetWidth = 384) {
      const s = stateRef.current;
      const mount = mountRef.current;
      if (!s.renderer || !mount) return null;

      const liveAspect = mount.clientWidth / mount.clientHeight;
      const w = targetWidth;
      const h = Math.round(targetWidth / liveAspect);

      const prevPixelRatio = s.renderer.getPixelRatio();
      const prevSize = new THREE.Vector2();
      s.renderer.getSize(prevSize);
      const prevAspect = s.camera.aspect;

      const thumbScale = w / mount.clientWidth;
      s.renderer.setPixelRatio(1);
      s.renderer.setSize(w, h, false);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      rebuildBackText(w, h, thumbScale);
      s.renderer.render(s.scene, s.camera);
      const url = snapshotWithText(thumbScale);

      s.renderer.setPixelRatio(prevPixelRatio);
      s.renderer.setSize(prevSize.x, prevSize.y, false);
      s.camera.aspect = prevAspect;
      s.camera.updateProjectionMatrix();
      refreshBackText();
      s.renderer.render(s.scene, s.camera);

      return url;
    },
  }));

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
});

export default MockupScene;