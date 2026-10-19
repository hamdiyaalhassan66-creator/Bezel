import { useRef, useState, useEffect } from "react";
import { hexRgba } from "../lib/frameUtils.js";
import { sampleShots, vidClamp } from "../lib/videoMath.js";
import { sampleDeviceAnim, shotAnimPose } from "../lib/shotAnim.js";
import { sampleShotFrames } from "../lib/frameKeys.js";
import { frameRect, cornersOf } from "../lib/frameModel.js";
import { frameFade } from "../lib/frameFade.js";
import { layoutOf } from "../constants/templates.js";
import { GRADIENT_PRESETS, IMAGE_PRESETS } from "../constants/presets.js";

// Template card thumbnail for Frame mode: draws the layout using the current frames' images.
export function FrameTemplateThumb({ tpl, frames }) {
  const slots = layoutOf(tpl);
  const imgs = frames.filter((f) => f.img).map((f) => f.img.cropUrl ?? f.img.url);
  const k = 0.2; // shadow / stroke scale for the small card
  const sh = tpl.shadow;
  const st = tpl.stroke;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {slots.map((sl, i) => {
        const url = imgs.length ? imgs[i % imgs.length] : null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${50 + sl.x * 100}%`,
              top: `${50 + sl.y * 100}%`,
              height: `${sl.h * 100}%`,
              aspectRatio: sl.r,
              transform: "translate(-50%, -50%)",
              borderRadius: `${tpl.radius}%`,
              boxSizing: "border-box",
              background: url ? `center / cover url(${url})` : "linear-gradient(180deg, #FFFFFF 0%, #FF47BC 100%)",
              border: st ? `${Math.max(1, st.width * k * 2)}px solid ${hexRgba(st.hex, st.opacity)}` : undefined,
              boxShadow: sh ? `${sh.x * k}px ${sh.y * k}px ${sh.blur * k}px ${sh.spread * k}px ${hexRgba(sh.hex, sh.opacity)}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

// CSS background for a template card preview
export function templateBackground(t) {
  const bg = t.bg;
  if (bg.type === "solid") return { backgroundColor: `#${bg.hex}` };
  if (bg.type === "gradient") return { background: GRADIENT_PRESETS.find((g) => g.value === bg.preset)?.swatch };
  const img = IMAGE_PRESETS.find((i) => i.value === bg.preset);
  return { backgroundImage: `url(${img?.thumb})`, backgroundSize: "cover", backgroundPosition: "center" };
}

// ~18 stills per second of preview, so neighbouring frames are nearly identical and the blend reads as motion
const vtCount = (tpl) => Math.min(90, Math.max(30, Math.round(Math.min(tpl.duration, 5) * 18)));
const VT_W = 312, VT_H = 416;
const HOLD_FADE = 200; // ms the end of the loop eases back into the start
const reduceMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// p (0-1) -> [index of the frame, blend toward the next one]
const framePos = (p, n) => {
  const x = p * (n - 1);
  const i = Math.min(n - 2, Math.floor(x));
  return [i, x - i];
};
const vtLoad = (src) =>
  new Promise((res) => {
    const im = new Image();
    im.onload = () => (im.decode ? im.decode().catch(() => {}).then(() => res(im)) : res(im));
    im.onerror = () => res(null);
    im.src = src;
  });

// Card: a still of the device at rest, and on hover a loop of real renders along the template's camera path.
export function VideoTemplateCard({ tpl, index, label, active, renderKey, renderStills, onApply }) {
  const canvasRef = useRef(null);
  const cache = useRef({ poster: null, imgs: [], frames: null });
  const stillsRef = useRef(renderStills);
  stillsRef.current = renderStills;
  const [hover, setHover] = useState(false);

  const camAt = (t) => {
    const c = sampleShots(tpl.shots, t);
    return { ...c, zoom: Math.max(0, c.zoom - 15) }; // same pull-back the other template thumbnails use
  };

  // Draws a render with the template's enter / exit pose at time t (cover-fit, same maths as the shot animation previews).
  const drawOne = (ctx, img, t, alpha) => {
    if (!img) return;
    const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = sampleDeviceAnim(tpl.shots, t) ?? {};
    const k = Math.max(VT_W / img.naturalWidth, VT_H / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    ctx.save();
    ctx.globalAlpha = vidClamp(a, 0, 1) * alpha;
    ctx.translate(VT_W / 2 + x * VT_W, VT_H / 2 - y * VT_H);
    ctx.scale(Math.max(0.02, Math.abs(s * Math.cos(ry))), Math.max(0.02, Math.abs(s * Math.cos(rx))));
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  };
  // img2 fades in over img at amount f, so the stills blend instead of jumping
  const paint = (img, t, img2 = null, t2 = t, f = 0) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, VT_W, VT_H);
    drawOne(ctx, img, t, 1);
    if (img2 && f > 0) drawOne(ctx, img2, t2, f);
  };

  // Poster. Re-renders when the device, body colour or screenshot changes.
  useEffect(() => {
    cache.current = { poster: null, imgs: [], frames: null };
    let dead = false, timer;
    const run = (n = 0) => {
      const urls = stillsRef.current([camAt(tpl.poster)]);
      if (!urls) {
        if (n < 24) timer = setTimeout(() => run(n + 1), 250); // model still loading
        return;
      }
      vtLoad(urls[0]).then((im) => {
        if (dead || !im) return;
        cache.current.poster = im;
        paint(im, tpl.poster);
      });
    };
    timer = setTimeout(run, 150 + index * 60);
    return () => {
      dead = true;
      clearTimeout(timer);
    };
  }, [renderKey, tpl.id]);

  useEffect(() => {
    const c = cache.current;
    if (!hover || reduceMotion()) {
      if (c.poster) paint(c.poster, tpl.poster);
      return;
    }
    let dead = false, raf, timer;
    const play = () => {
      const T = Math.min(tpl.duration, 5) * 1000, HOLD = 500, t0 = performance.now();
      const loop = (now) => {
        const fr = c.frames;
        const cyc = Math.max(0, (now - t0) % (T + HOLD));
        if (cyc < T) {
          const p = cyc / T;
          const [i, f] = framePos(p, fr.length);
          paint(fr[i], p * tpl.duration, fr[i + 1], p * tpl.duration, f);
        } else {
          // hold on the last frame, then ease into the first so the loop doesn't cut
          const f = vidClamp((cyc - T - (HOLD - HOLD_FADE)) / HOLD_FADE, 0, 1);
          paint(fr[fr.length - 1], tpl.duration, fr[0], 0, f);
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    // Renders the frames in small batches so the UI stays responsive, and keeps them for the next hover.
    const N = vtCount(tpl);
    const build = async (tries = 0) => {
      if (dead) return;
      if (c.frames) return play();
      const have = c.imgs.length;
      const cams = Array.from({ length: Math.min(4, N - have) }, (_, i) => camAt((tpl.duration * (have + i)) / (N - 1)));
      const urls = stillsRef.current(cams);
      if (!urls) {
        if (tries < 24) timer = setTimeout(() => build(tries + 1), 250);
        return;
      }
      const ims = await Promise.all(urls.map(vtLoad));
      if (dead) return;
      c.imgs.push(...ims);
      if (c.imgs.length >= N) c.frames = c.imgs.map((im) => im ?? c.poster);
      timer = setTimeout(() => build(0), 16);
    };
    build();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [hover, renderKey]);

  return (
    <button
      type="button"
      onClick={() => onApply(tpl)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{ animationDelay: `${Math.min(index, 5) * 30}ms` }}
      className={`template-enter group flex flex-col items-stretch gap-2 min-w-0 p-2 rounded-2xl transition-colors duration-200 ${
        active ? "bg-[#FF47BC]/10" : "hover:bg-black/[0.03] dark:hover:bg-white/5"
      }`}
    >
      <div
        className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-black transition-transform duration-200 group-hover:scale-[1.015]"
        style={(() => {
          if (!tpl.bgs) return undefined;
          const at = [...tpl.bgs].reverse().find((b) => b.at <= tpl.poster) ?? tpl.bgs[0];
          return templateBackground({ bg: at.bg });
        })()}
      >
        <canvas ref={canvasRef} width={VT_W} height={VT_H} className="absolute inset-0 w-full h-full" />
      </div>
      <span
        className={`tpl-title truncate text-left leading-4 transition-colors ${
          active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// Frame-mode card: a still of the real frames at rest, and on hover a loop of renders along the template's path.
// Draws the real frames at time t straight onto the card canvas (cover-fit, same maths as renderFrameCanvas).
// Not drawn live: drop shadows, blur, noise, status bar and social UI.
function drawLiveScene(ctx, live, t) {
  const { box, frames, shots, bg, imgs } = live;
  ctx.clearRect(0, 0, VT_W, VT_H);
  const k = Math.max(VT_W / box.w, VT_H / box.h);
  ctx.save();
  ctx.translate((VT_W - box.w * k) / 2, (VT_H - box.h * k) / 2);
  ctx.scale(k, k);
  if (bg) ctx.drawImage(bg, 0, 0, box.w, box.h);
  const poses = sampleShotFrames(shots, t) ?? {};
  frames.forEach((f) => {
    if (f.hidden) return;
    const p = poses[f.id];
    const fr = p ? { ...f, x: p.x, y: p.y, w: Math.round(p.w), h: Math.round(p.h), s: p.s, r: p.r ?? 0 } : f;
    // a frame with its own row is hidden outside that row and animates with it
    let a = 1, ax = 0, ay = 0, sc = 1, rx = 0, ry = 0;
    const rows = shots.filter((s) => s.frameId === f.id);
    if (rows.length) {
      const row = [...rows].reverse().find((s) => !s.hidden && t >= s.start - 1e-6 && t <= s.start + s.len + 1e-6);
      if (!row) return;
      const q = shotAnimPose(row, t) ?? {};
      a = q.a ?? 1; ax = q.x ?? 0; ay = q.y ?? 0; sc = q.s ?? 1; rx = q.rx ?? 0; ry = q.ry ?? 0;
    }
    const r = frameRect(fr, box);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const radii = cornersOf(fr).map((c) => (Math.min(r.width, r.height) * c) / 100);
    ctx.save();
    ctx.globalAlpha = vidClamp(a, 0, 1) * frameFade(fr, box);
    ctx.translate(ax * box.w, -ay * box.h);
    ctx.translate(cx, cy);
    ctx.scale(Math.max(0.001, Math.abs(sc * Math.cos(ry))), Math.max(0.001, Math.abs(sc * Math.cos(rx))));
    ctx.rotate(((fr.r ?? 0) * Math.PI) / 180);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    ctx.roundRect(r.left, r.top, r.width, r.height, radii);
    ctx.clip();
    const im = imgs.get(f.id);
    if (im) {
      const s = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight);
      const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      ctx.drawImage(im, r.left + (r.width - dw) / 2, r.top + (r.height - dh) / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, r.top, 0, r.top + r.height);
      g.addColorStop(0, "#FFFFFF");
      g.addColorStop(1, "#FF47BC");
      ctx.fillStyle = g;
      ctx.fillRect(r.left, r.top, r.width, r.height);
    }
    const st = fr.stroke;
    if (st?.on && st.width > 0) {
      ctx.lineWidth = st.width * 2; // half is clipped away, so this reads as an inside stroke of st.width
      ctx.strokeStyle = hexRgba(st.hex, st.opacity);
      ctx.stroke();
    }
    ctx.restore();
  });
  ctx.restore();
}
export function FrameVideoTemplateCard({ tpl, index, label, active, renderKey, renderStill, prepareLive, onApply }) {
  const canvasRef = useRef(null);
  const cache = useRef({ poster: null, live: null });
  const stillRef = useRef(renderStill);
  stillRef.current = renderStill;
  const prepareRef = useRef(prepareLive);
  prepareRef.current = prepareLive;
  const [hover, setHover] = useState(false);

  const paint = (src, src2 = null, f = 0) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, VT_W, VT_H);
    const draw = (s) => {
      const k = Math.max(VT_W / s.width, VT_H / s.height);
      ctx.drawImage(s, (VT_W - s.width * k) / 2, (VT_H - s.height * k) / 2, s.width * k, s.height * k);
    };
    if (src) draw(src);
    if (src2 && f > 0) {
      ctx.globalAlpha = f;
      draw(src2);
      ctx.globalAlpha = 1;
    }
  };

  useEffect(() => {
    cache.current = { poster: null, live: null };
    let dead = false;
    const timer = setTimeout(async () => {
      const c = await stillRef.current(tpl, tpl.poster, VT_W);
      if (dead || !c) return;
      cache.current.poster = c;
      paint(c);
    }, 150 + index * 80);
    return () => {
      dead = true;
      clearTimeout(timer);
    };
  }, [renderKey, tpl.id]);

  useEffect(() => {
    const c = cache.current;
    if (!hover || reduceMotion()) {
      if (c.poster) paint(c.poster);
      return;
    }
    let dead = false, raf;
    (async () => {
      let live = c.live;
      if (!live) {
        live = await prepareRef.current?.(tpl, VT_W);
        if (dead || !live) return;
        const imgs = new Map();
        await Promise.all(
          live.frames.map(async (f) => {
            const u = f.img ? (f.img.cropUrl ?? f.img.url) : null;
            const im = u ? await vtLoad(u) : null;
            if (im) imgs.set(f.id, im);
          })
        );
        if (dead) return;
        live.imgs = imgs;
        c.live = live;
      }
      const T = Math.min(live.duration, 5) * 1000, HOLD = 500, t0 = performance.now();
      const buf = document.createElement("canvas"); // second layer, only used to ease the loop end into its start
      buf.width = VT_W;
      buf.height = VT_H;
      const loop = (now) => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext("2d");
        const cyc = Math.max(0, (now - t0) % (T + HOLD));
        if (cyc < T) {
          drawLiveScene(ctx, live, (cyc / T) * live.duration);
        } else {
          drawLiveScene(ctx, live, live.duration);
          const f = vidClamp((cyc - T - (HOLD - HOLD_FADE)) / HOLD_FADE, 0, 1);
          if (f > 0) {
            drawLiveScene(buf.getContext("2d"), live, 0);
            ctx.globalAlpha = f;
            ctx.drawImage(buf, 0, 0);
            ctx.globalAlpha = 1;
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
    };
  }, [hover, renderKey]);

  return (
    <button
      type="button"
      onClick={() => onApply(tpl)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{ animationDelay: `${Math.min(index, 5) * 30}ms` }}
      className={`template-enter group flex flex-col items-stretch gap-2 min-w-0 p-2 rounded-2xl transition-colors duration-200 ${
        active ? "bg-[#FF47BC]/10" : "hover:bg-black/[0.03] dark:hover:bg-white/5"
      }`}
    >
      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-[#EDEDED] dark:bg-[#292929] transition-transform duration-200 group-hover:scale-[1.015]">
        <canvas ref={canvasRef} width={VT_W} height={VT_H} className="absolute inset-0 w-full h-full" />
      </div>
      <span
        className={`tpl-title truncate text-left leading-4 transition-colors ${
          active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}