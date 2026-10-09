import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from "mp4-muxer";
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from "webm-muxer";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

// alpha = can hold a transparent background. maxFps / maxLong cap what the format can sensibly do.
export const VIDEO_FORMATS = [
  { value: "mp4", label: "MP4", ext: "mp4", alpha: false, maxFps: 120, maxLong: 3840 },
  { value: "webm", label: "WebM", ext: "webm", alpha: true, maxFps: 120, maxLong: 3840 },
  { value: "gif", label: "GIF", ext: "gif", alpha: true, maxFps: 50, maxLong: 1280 },
  { value: "lottie", label: "Lottie", ext: "json", alpha: true, maxFps: 30, maxLong: 1280 },
];
// value = length of the long side in px (1080P = 1920 x 1080, or 1080 x 1920 in portrait)
export const VIDEO_RESOLUTIONS = [
  { value: 1280, label: "720P" },
  { value: 1920, label: "1080P" },
  { value: 2560, label: "2K" },
  { value: 3840, label: "4K" },
];
export const VIDEO_SPEEDS = [0.5, 1, 2, 3];
export const VIDEO_FPS_OPTIONS = [24, 30, 60, 120];

const even = (n) => Math.max(2, Math.round(n / 2) * 2);
export function fitVideoDims(ratio, long) {
  return ratio >= 1 ? { w: even(long), h: even(long / ratio) } : { w: even(long * ratio), h: even(long) };
}

const bitrateFor = (w, h, fps) => Math.round(Math.min(60e6, Math.max(1e6, w * h * fps * 0.12)));

export function estimateVideoBytes(format, w, h, fps, frames) {
  if (format === "gif") return w * h * frames * 0.15;
  if (format === "lottie") return w * h * frames * 0.05;
  return (bitrateFor(w, h, fps) / 8) * (frames / fps);
}

// MP4 (H.264) and WebM (VP9, optional alpha) through WebCodecs
async function encodeWebCodecs(kind, { width, height, fps, count, transparent, renderFrame, onProgress }) {
  if (typeof VideoEncoder === "undefined") {
    throw new Error("This browser has no WebCodecs support. Use a recent Chrome, Edge or Safari.");
  }
  const isMp4 = kind === "mp4";
  let useAlpha = !isMp4 && transparent;
  const config = {
    codec: isMp4 ? "avc1.640034" : "vp09.00.10.08",
    width,
    height,
    framerate: fps,
    bitrate: bitrateFor(width, height, fps),
    ...(useAlpha ? { alpha: "keep" } : {}),
  };
  if (useAlpha && !(await VideoEncoder.isConfigSupported(config)).supported) {
    delete config.alpha; // this browser can't encode alpha, fall back to opaque
    useAlpha = false;
  }
  if (!(await VideoEncoder.isConfigSupported(config)).supported) {
    throw new Error(`${isMp4 ? "H.264" : "VP9"} at ${width}x${height} isn't supported here. Try a lower resolution.`);
  }

  const target = isMp4 ? new Mp4Target() : new WebmTarget();
  const muxer = isMp4
    ? new Mp4Muxer({ target, video: { codec: "avc", width, height }, fastStart: "in-memory" })
    : new WebmMuxer({ target, video: { codec: "V_VP9", width, height, frameRate: fps, alpha: useAlpha } });

  let failure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => (failure = e),
  });
  encoder.configure(config);

  for (let i = 0; i < count; i++) {
    const canvas = await renderFrame(i);
    const frame = new VideoFrame(canvas, {
      timestamp: Math.round((i * 1e6) / fps),
      duration: Math.round(1e6 / fps),
    });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    while (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 4));
    if (failure) throw failure;
    onProgress?.((i + 1) / count);
  }
  await encoder.flush();
  muxer.finalize();
  return new Blob([target.buffer], { type: isMp4 ? "video/mp4" : "video/webm" });
}

async function encodeGif({ width, height, fps, count, transparent, renderFrame, onProgress }) {
  const gif = GIFEncoder();
  const delay = Math.max(20, Math.round(1000 / fps)); // browsers clamp GIF delays below 20ms
  const fmt = transparent ? "rgba4444" : "rgb565";
  for (let i = 0; i < count; i++) {
    const canvas = await renderFrame(i);
    const { data } = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, width, height);
    const palette = quantize(data, 256, { format: fmt, oneBitAlpha: transparent });
    const index = applyPalette(data, palette, fmt);
    const transparentIndex = transparent ? Math.max(0, palette.findIndex((p) => p.length > 3 && p[3] === 0)) : 0;
    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: 0,
      transparent,
      transparentIndex,
      dispose: transparent ? 2 : -1, // clear between frames so transparent areas don't smear
    });
    onProgress?.((i + 1) / count);
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

// A 3D scene can't become vector shapes, so each frame is an embedded image shown for exactly one frame.
async function encodeLottie({ width, height, fps, count, name, renderFrame, onProgress }) {
  const assets = [];
  const layers = [];
  const still = { a: 0, k: 0 };
  for (let i = 0; i < count; i++) {
    const canvas = await renderFrame(i);
    assets.push({ id: `f${i}`, w: width, h: height, u: "", p: canvas.toDataURL("image/webp", 0.85), e: 1 });
    layers.push({
      ddd: 0, ind: i + 1, ty: 2, nm: `frame ${i + 1}`, refId: `f${i}`, sr: 1,
      ks: {
        o: { a: 0, k: 100 }, r: still,
        p: { a: 0, k: [width / 2, height / 2, 0] },
        a: { a: 0, k: [width / 2, height / 2, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0, ip: i, op: i + 1, st: 0, bm: 0,
    });
    onProgress?.((i + 1) / count);
  }
  const json = { v: "5.7.4", fr: fps, ip: 0, op: count, w: width, h: height, nm: name, ddd: 0, assets, layers, markers: [] };
  return new Blob([JSON.stringify(json)], { type: "application/json" });
}

// renderFrame(i) must return a width x height canvas holding frame i.
export async function encodeVideoFrames(opts) {
  const spec = VIDEO_FORMATS.find((f) => f.value === opts.format);
  const blob =
    opts.format === "gif" ? await encodeGif(opts)
    : opts.format === "lottie" ? await encodeLottie(opts)
    : await encodeWebCodecs(opts.format, opts);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${opts.name}.${spec.ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}