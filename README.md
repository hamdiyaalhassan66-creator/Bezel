# Mockup Scene

A starter app for building an Ultramock-style device mockup tool: React + Vite + Three.js.

## Setup

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## What's here

- `src/MockupScene.jsx` — the 3D scene: a device (rounded box frame + textured screen plane),
  OrbitControls for drag/zoom, three lighting presets, screenshot upload, and PNG export.
- `src/App.jsx` — just mounts the scene in a centered layout.
- Tailwind is wired up for the UI chrome (`tailwind.config.js`, `postcss.config.js`, `src/index.css`).

## Where to go next

Roughly in order of impact:

1. **Real device model** — swap the box-frame device for a GLTF model (phone/laptop) loaded via
   `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`. Align the screen plane's UVs to
   the model's actual screen bounds.
2. **Environment reflections** — add `RGBELoader` + `scene.environment` with an HDRI so the frame
   picks up realistic reflections instead of relying only on the two directional lights.
3. **Background variety** — swap the flat color background for gradients, blurred photo
   backdrops, or environment-mapped scenes.
4. **Multiple devices** — support more than one device in the scene at once (e.g. phone + laptop
   side by side) for "responsive design" style shots.
5. **Video export** — animate camera/light params over time and capture frames via
   `MediaRecorder` on the canvas stream, or render frame-by-frame for higher quality.

## Notes

- Rotation/zoom use three.js's real `OrbitControls`, not a hand-rolled version — this only works
  because you now have a proper npm install of `three`, unlike the sandboxed artifact preview.
- `RoundedBoxGeometry` comes from `three/examples/jsm`, also only available with a real install.
