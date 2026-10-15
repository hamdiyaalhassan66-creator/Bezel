// zoom 70 / fov 27 match the camera's starting framing (fov slider 27 = 32°).
// Tune zoom per preset if one should sit closer or farther.
export const CAMERA_VIEW_PRESETS = [
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
export const TEMPLATE_CAMERAS = [...CAMERA_VIEW_PRESETS, ...EXTRA_CAMERA_VIEWS];

// Thumbnails pull the camera back a little so tilted / rotated devices don't clip the card.
export const templatePreviewCam = (t) => {
  const cam = TEMPLATE_CAMERAS.find((p) => p.key === t.cameraKey) ?? CAMERA_VIEW_PRESETS[0];
  return { ...cam, zoom: Math.max(0, cam.zoom - 15) };
};