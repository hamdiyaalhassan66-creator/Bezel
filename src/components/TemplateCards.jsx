import { useRef, useState, useEffect } from "react";
import { hexRgba } from "../lib/frameUtils.js";
import { sampleShots, vidClamp } from "../lib/videoMath.js";
import { sampleDeviceAnim } from "../lib/shotAnim.js";
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

const VT_N = 20; // frames rendered per card when hovered
const VT_W = 312, VT_H = 416;
const vtLoad = (src) =>
  new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
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
  const paint = (img, t) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, VT_W, VT_H);
    if (!img) return;
    const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = sampleDeviceAnim(tpl.shots, t) ?? {};
    const k = Math.max(VT_W / img.naturalWidth, VT_H / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    ctx.save();
    ctx.globalAlpha = vidClamp(a, 0, 1);
    ctx.translate(VT_W / 2 + x * VT_W, VT_H / 2 - y * VT_H);
    ctx.scale(Math.max(0.02, Math.abs(s * Math.cos(ry))), Math.max(0.02, Math.abs(s * Math.cos(rx))));
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
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
    if (!hover) {
      if (c.poster) paint(c.poster, tpl.poster);
      return;
    }
    let dead = false, raf, timer;
    const play = () => {
      const T = Math.min(tpl.duration, 5) * 1000, HOLD = 500, t0 = performance.now();
      const loop = (now) => {
        const p = Math.min(1, ((now - t0) % (T + HOLD)) / T);
        paint(c.frames[Math.round(p * (VT_N - 1))], p * tpl.duration);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    // Renders the frames in small batches so the UI stays responsive, and keeps them for the next hover.
    const build = async (tries = 0) => {
      if (dead) return;
      if (c.frames) return play();
      const have = c.imgs.length;
      const cams = Array.from({ length: Math.min(4, VT_N - have) }, (_, i) => camAt((tpl.duration * (have + i)) / (VT_N - 1)));
      const urls = stillsRef.current(cams);
      if (!urls) {
        if (tries < 24) timer = setTimeout(() => build(tries + 1), 250);
        return;
      }
      const ims = await Promise.all(urls.map(vtLoad));
      if (dead) return;
      c.imgs.push(...ims);
      if (c.imgs.length >= VT_N) c.frames = c.imgs.map((im) => im ?? c.poster);
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
        className={`truncate text-center leading-4 transition-colors ${
          active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// Frame-mode card: a still of the real frames at rest, and on hover a loop of renders along the template's path.
const FVT_N = 16;
export function FrameVideoTemplateCard({ tpl, index, label, active, renderKey, renderStill, onApply }) {
  const canvasRef = useRef(null);
  const cache = useRef({ poster: null, frames: null });
  const stillRef = useRef(renderStill);
  stillRef.current = renderStill;
  const [hover, setHover] = useState(false);

  const paint = (src) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, VT_W, VT_H);
    if (!src) return;
    const k = Math.max(VT_W / src.width, VT_H / src.height);
    ctx.drawImage(src, (VT_W - src.width * k) / 2, (VT_H - src.height * k) / 2, src.width * k, src.height * k);
  };

  useEffect(() => {
    cache.current = { poster: null, frames: null };
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
    if (!hover) {
      if (c.poster) paint(c.poster);
      return;
    }
    let dead = false, raf;
    (async () => {
      if (!c.frames) {
        const out = [];
        for (let i = 0; i < FVT_N; i++) {
          const im = await stillRef.current(tpl, (tpl.duration * i) / (FVT_N - 1), VT_W);
          if (dead) return;
          out.push(im || c.poster);
        }
        c.frames = out;
      }
      const T = Math.min(tpl.duration, 5) * 1000, HOLD = 500, t0 = performance.now();
      const loop = (now) => {
        const p = Math.min(1, ((now - t0) % (T + HOLD)) / T);
        paint(c.frames[Math.round(p * (FVT_N - 1))]);
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
        className={`truncate text-center leading-4 transition-colors ${
          active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}