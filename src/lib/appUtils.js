import { useRef, useState } from "react";

export const DEVICE_CATEGORIES = [
  { key: "phone", label: "Phone", enabled: true },
  { key: "desktop", label: "Desktop", enabled: true },
  { key: "tablet", label: "Tablet", enabled: true },
  { key: "watch", label: "Watch", enabled: true },
];

export function cropImageToDataUrl(url, rect) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // needed so toDataURL doesn't throw on cross-origin preset images
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Default scene background: matches the app's panel surface color.
export const surfaceHex = (dark) => (dark ? "171717" : "FAF9FA");

// "Edited at 3:45pm" style label for project cards.
export function formatEditedAt(date) {
  const time = date
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .replace(" ", "")
    .toLowerCase();
  return `Edited at ${time}`;
}

// Drag-and-drop for files. The depth counter keeps `dragOver` from flickering
// when the pointer moves across child elements.
export function useFileDrop(onFile) {
  const [dragOver, setDragOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  const dropProps = {
    onDragEnter: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setDragOver(true);
    },
    onDragOver: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragOver(false);
    },
    onDrop: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragOver(false);
      onFile(Array.from(e.dataTransfer.files ?? []));
    },
  };
  return { dragOver, dropProps };
}

// Seeks a video to t (looping by its duration) and resolves once the frame is ready.
export function seekVideo(el, t) {
  const d = el.duration;
  const want = d && isFinite(d) ? t % d : 0;
  if (Math.abs(el.currentTime - want) < 1 / 120) return Promise.resolve();
  return new Promise((res) => {
    const done = () => {
      el.removeEventListener("seeked", done);
      res();
    };
    el.addEventListener("seeked", done);
    el.currentTime = want;
  });
}

// Loads a video file and grabs its first frame as a poster image.
export function loadVideoMeta(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = "auto";
    el.onloadeddata = () => {
      const c = document.createElement("canvas");
      c.width = el.videoWidth;
      c.height = el.videoHeight;
      c.getContext("2d").drawImage(el, 0, 0);
      c.toBlob((blob) => {
        if (!blob) return resolve(null);
        resolve({
          el, url, duration: el.duration, w: el.videoWidth, h: el.videoHeight,
          poster: new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }),
        });
      }, "image/jpeg", 0.92);
    };
    el.onerror = () => resolve(null);
    el.src = url;
  });
}