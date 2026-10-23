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
  { key: "corner-bleed", label: "Corner bleed", rotationX: 12, rotationY: -24, rotationZ: 12, positionX: -8, positionY: -18, zoom: 76, fov: 24 },
  { key: "bottom-edge", label: "Bottom edge", rotationX: 10, rotationY: 24, rotationZ: -6, positionX: 0, positionY: -22, zoom: 74, fov: 22 },
  { key: "handheld", label: "Handheld", rotationX: -10, rotationY: 28, rotationZ: -10, positionX: 0, positionY: 0, zoom: 64, fov: 30 },
  { key: "corner-mirror", label: "Corner mirror", rotationX: 12, rotationY: 24, rotationZ: -12, positionX: 8, positionY: -18, zoom: 76, fov: 24 },
  { key: "top-edge", label: "Top edge", rotationX: -14, rotationY: -24, rotationZ: 6, positionX: 0, positionY: 22, zoom: 74, fov: 22 },
  { key: "half-screen", label: "Half screen", rotationX: -6, rotationY: 14, rotationZ: -4, positionX: -22, positionY: 0, zoom: 76, fov: 22 },
  { key: "float-tilt", label: "Float tilt", rotationX: -18, rotationY: 28, rotationZ: -14, positionX: 0, positionY: 0, zoom: 46, fov: 26 },
  { key: "slant", label: "Slant", rotationX: -6, rotationY: -38, rotationZ: 0, positionX: 0, positionY: 0, zoom: 66, fov: 18 },
  { key: "look-down", label: "Look down", rotationX: -30, rotationY: 8, rotationZ: 0, positionX: 0, positionY: 6, zoom: 68, fov: 26 },
  { key: "macro-top", label: "Macro top", rotationX: -6, rotationY: 16, rotationZ: 0, positionX: 4, positionY: 26, zoom: 84, fov: 16 },
  { key: "macro-bottom", label: "Macro bottom", rotationX: 4, rotationY: -16, rotationZ: 0, positionX: -4, positionY: -24, zoom: 84, fov: 16 },
  { key: "fisheye-lean", label: "Fisheye lean", rotationX: -10, rotationY: 30, rotationZ: 8, positionX: 0, positionY: 0, zoom: 56, fov: 90 },
  { key: "fisheye-close", label: "Fisheye close", rotationX: -4, rotationY: 14, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 85 },
  { key: "low-tele", label: "Low tele", rotationX: 18, rotationY: -18, rotationZ: 0, positionX: 0, positionY: -8, zoom: 68, fov: 20 },
  { key: "far-float", label: "Far float", rotationX: -10, rotationY: 20, rotationZ: 0, positionX: 0, positionY: 0, zoom: 25, fov: 24 },
  { key: "persp-push", label: "Perspective push", rotationX: -4, rotationY: 38, rotationZ: 0, positionX: 0, positionY: 0, zoom: 70, fov: 50 },
];
export const TEMPLATE_CAMERAS = [...CAMERA_VIEW_PRESETS, ...EXTRA_CAMERA_VIEWS];

// Thumbnails pull the camera back a little so tilted / rotated devices don't clip the card.
export const templatePreviewCam = (t) => {
  const cam = TEMPLATE_CAMERAS.find((p) => p.key === t.cameraKey) ?? CAMERA_VIEW_PRESETS[0];
  return { ...cam, zoom: Math.max(0, cam.zoom - 25) };
};