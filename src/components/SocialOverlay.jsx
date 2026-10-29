import React, { useRef, useLayoutEffect } from "react";
import { paintPhoneChrome } from "../MockupScene.jsx";
import { modeOf, DEFAULT_SOCIAL, ICONS, socialOps } from "../lib/social.js";

const chromeKey = (f) => (f.img ? `${f.img.cropUrl ?? f.img.url}|${(f.w / f.h).toFixed(2)}` : null);

// Draws the image as object-cover at the frame's aspect, then averages the pixels behind
// the status bar and home indicator (same 440 x 956 layout paintPhoneChrome uses).
function sampleChromeColors(img, fw, fh) {
  try {
    const W = 120, H = Math.max(1, Math.round((W * fh) / fw));
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const iw = img.naturalWidth || img.videoWidth, ih = img.naturalHeight || img.videoHeight;
    const sc = Math.max(W / iw, H / ih);
    const dw = iw * sc, dh = ih * sc;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const k = Math.min(W / 440, H / 956);
    const ox = (W - 440 * k) / 2;
    const luma = (x, y, w, h) => {
      const px = Math.min(W - 1, Math.max(0, Math.round(ox + x * k)));
      const py = Math.min(H - 1, Math.max(0, Math.round(y * k)));
      const pw = Math.max(1, Math.min(W - px, Math.round(w * k)));
      const ph = Math.max(1, Math.min(H - py, Math.round(h * k)));
      const d = ctx.getImageData(px, py, pw, ph).data;
      let sum = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        n++;
      }
      return n ? sum / n / 255 : 0;
    };
    const status = (luma(58, 26, 44, 18) + luma(322, 26, 76, 18)) / 2;
    const home = luma(153, 925, 134, 24);
    return { status: status > 0.6 ? "#000000" : "#FFFFFF", home: home > 0.6 ? "#000000" : "#FFFFFF" };
  } catch {
    return null;
  }
}

// Phone chrome is drawn by the mockup's own canvas code (paintPhoneChrome), via a single "chrome" op.
function chromeOps(f, w, h, auto) {
  const s = f.social ?? DEFAULT_SOCIAL;
  const m = s.on ? modeOf(s.platform, s.mode) : null;
  const darkText = !!m && m.themed && s.theme !== "dark";
  // With a social UI on, its theme decides. Otherwise the image decides.
  const socialColor = s.on ? (darkText ? "#000000" : "#FFFFFF") : null;
  const b = f.browser?.on ? f.browser : null;
  const barColor = socialColor ?? (b ? (b.theme === "dark" ? "#FFFFFF" : "#000000") : null);
  return [{
    t: "chrome", w, h,
    statusBar: !!f.statusBar,
    homeIndicator: !!f.homeIndicator,
    color: barColor ?? "#FFFFFF",
    statusColor: barColor ?? auto?.status ?? "#FFFFFF",
    homeColor: barColor ?? auto?.home ?? "#FFFFFF",
    browser: b ? b.type : "none",
    browserTheme: b?.theme ?? "light",
    browserTabs: b?.tabs ?? "top",
    browserUrl: b?.url ?? "",
  }];
}

function ChromeCanvas({ o }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(o.w * dpr);
    c.height = Math.round(o.h * dpr);
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    paintPhoneChrome(ctx, o.w, o.h, o);
    }, [o.w, o.h, o.statusBar, o.homeIndicator, o.color, o.statusColor, o.homeColor, o.browser, o.browserTheme, o.browserTabs, o.browserUrl]);
  return <canvas ref={ref} className="absolute inset-0" style={{ width: o.w, height: o.h }} />;
}

function SocialOverlay({ social, width, height }) {
  const ops = socialOps(social, width, height);
  return (
    <div className="social-ui absolute inset-0 pointer-events-none overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
      {ops.map((o, i) => {
        if (o.t === "rect" || o.t === "vgrad") {
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: o.x, top: o.y, width: o.w, height: o.h, borderRadius: o.r || 0,
                background: o.t === "vgrad" ? `linear-gradient(to bottom, ${o.from}, ${o.to})` : o.fill || "transparent",
                boxShadow: [o.shadow && `${o.shadow.x}px ${o.shadow.y}px ${o.shadow.blur}px ${o.shadow.color}`, o.stroke && `inset 0 0 0 ${o.sw}px ${o.stroke}`].filter(Boolean).join(", ") || undefined,
              }}
            />
          );
        }
        if (o.t === "circle") {
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: o.cx - o.r, top: o.cy - o.r, width: o.r * 2, height: o.r * 2,
                background: o.grad ? `linear-gradient(45deg, ${o.grad.join(", ")})` : o.fill,
              }}
            />
          );
        }

                if (o.t === "chrome") return <ChromeCanvas key={i} o={o} />;

        if (o.t === "media") {
          return o.src ? (
            <div
              key={i}
              className="absolute bg-cover bg-center"
              style={{ left: o.x, top: o.y, width: o.w, height: o.h, backgroundImage: `url(${o.src})` }}
            />
          ) : (
            <div
              key={i}
              className="keep-size absolute flex items-center justify-center text-center font-semibold select-none"
              style={{
                left: o.x, top: o.y, width: o.w, height: o.h,
                background: "linear-gradient(180deg, #FFFFFF 0%, #FF47BC 100%)",
                color: "#FAF9FA", fontSize: Math.max(11, o.w * 0.05), lineHeight: 1.3,
              }}
            >
              <span style={{ maxWidth: "45%" }}>Drop your image here</span>
            </div>
          );
        }
        if (o.t === "image") {
          return (
            <div
              key={i}
              className={`absolute bg-center ${o.sq ? "bg-contain bg-no-repeat" : "rounded-full bg-cover"}`}
              style={{ left: o.cx - o.r, top: o.cy - o.r, width: o.r * 2, height: o.r * 2, backgroundImage: `url(${o.src})` }}
            />
          );
        }
        if (o.t === "icon") {
          const ic = ICONS[o.name];
          if (!ic) return null;
          const [vw, vh] = ic.vb || [24, 24];
          const k = o.size / 24;
          return (
            <svg
              key={i}
              viewBox={`0 0 ${vw} ${vh}`}
              fill={ic.fill ? o.color : "none"}
              fillRule={ic.rule || "nonzero"}
              stroke={ic.fill ? "none" : o.color}
              strokeWidth={ic.sw ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute"
              style={{ left: o.cx - (vw * k) / 2, top: o.cy - (vh * k) / 2, width: vw * k, height: vh * k, overflow: "visible" }}
            >
              {ic.d.map((d, j) => <path key={j} d={d} />)}
            </svg>
          );
        }
        const tx = o.align === "center" ? "-50%" : o.align === "right" ? "-100%" : "0";
        return (
          <span
            key={i}
            className="absolute block whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{ left: o.x, top: o.y, fontFamily: o.font, fontSize: o.s, fontWeight: o.weight, color: o.color, lineHeight: 1.25, letterSpacing: o.ls, maxWidth: o.maxW, transform: `translate(${tx}, -50%)` }}
          >
            {o.runs
              ? o.runs.map(([str, wt, col], k) => <span key={k} style={{ fontWeight: wt, color: col || o.color }}>{str}</span>)
              : o.text}
          </span>
        );
      })}
    </div>
  );
}

function paintSocial(ctx, ops, ox, oy, imgs) {
  ops.forEach((o) => {
    if (o.t === "rect" || o.t === "vgrad") {
      let fill = o.fill;
      if (o.t === "vgrad") {
        const g = ctx.createLinearGradient(0, oy + o.y, 0, oy + o.y + o.h);
        g.addColorStop(0, o.from);
        g.addColorStop(1, o.to);
        fill = g;
      }
      if (fill) {
        ctx.save();
        if (o.shadow) {
          ctx.shadowColor = o.shadow.color;
          ctx.shadowBlur = o.shadow.blur;
          ctx.shadowOffsetX = o.shadow.x;
          ctx.shadowOffsetY = o.shadow.y;
        }
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(ox + o.x, oy + o.y, o.w, o.h, o.r || 0);
        ctx.fill();
        ctx.restore();
      }
      if (o.stroke) {
        ctx.beginPath();
        ctx.roundRect(ox + o.x + o.sw / 2, oy + o.y + o.sw / 2, o.w - o.sw, o.h - o.sw, Math.max(0, (o.r || 0) - o.sw / 2));
        ctx.lineWidth = o.sw;
        ctx.strokeStyle = o.stroke;
        ctx.stroke();
      }
    } else if (o.t === "circle") {
      let fill = o.fill;
      if (o.grad) {
        const g = ctx.createLinearGradient(ox + o.cx - o.r, oy + o.cy + o.r, ox + o.cx + o.r, oy + o.cy - o.r);
        o.grad.forEach((c, i) => g.addColorStop(i / (o.grad.length - 1), c));
        fill = g;
      }
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(ox + o.cx, oy + o.cy, o.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.t === "icon") {
      const ic = ICONS[o.name];
      if (!ic) return;
      const [vw, vh] = ic.vb || [24, 24];
      const k = o.size / 24;
      ctx.save();
      ctx.translate(ox + o.cx - (vw * k) / 2, oy + o.cy - (vh * k) / 2);
      ctx.scale(k, k);
      ctx.lineWidth = ic.sw ?? 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = o.color;
      ctx.strokeStyle = o.color;
      ic.d.forEach((d) => {
        const p = new Path2D(d);
        if (ic.fill) ctx.fill(p, ic.rule || "nonzero");
        else ctx.stroke(p);
      });
      ctx.restore();

      } else if (o.t === "chrome") {
      ctx.save();
      ctx.translate(ox, oy);
      paintPhoneChrome(ctx, o.w, o.h, o);
      ctx.restore();
    } else if (o.t === "media") {
      const img = imgs?.get(o.src);
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox + o.x, oy + o.y, o.w, o.h);
      ctx.clip();
      if (img) {
        const sc = Math.max(o.w / img.naturalWidth, o.h / img.naturalHeight);
        const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
        ctx.drawImage(img, ox + o.x + (o.w - dw) / 2, oy + o.y + (o.h - dh) / 2, dw, dh);
      } else {
        const g = ctx.createLinearGradient(0, oy + o.y, 0, oy + o.y + o.h);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(1, "#FF47BC");
        ctx.fillStyle = g;
        ctx.fillRect(ox + o.x, oy + o.y, o.w, o.h);
        const fs = Math.max(11, o.w * 0.05), mx = ox + o.x + o.w / 2, my = oy + o.y + o.h / 2;
        ctx.fillStyle = "#FAF9FA";
        ctx.font = `600 ${fs}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Drop your", mx, my - fs * 0.65);
        ctx.fillText("image here", mx, my + fs * 0.65);
      }
      ctx.restore();
    } else if (o.t === "image") {
      const img = imgs?.get(o.src);
      if (img && o.sq) {
        ctx.drawImage(img, ox + o.cx - o.r, oy + o.cy - o.r, o.r * 2, o.r * 2);
      } else if (img) {
        const sc = Math.max((o.r * 2) / img.naturalWidth, (o.r * 2) / img.naturalHeight);
        const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ox + o.cx, oy + o.cy, o.r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, ox + o.cx - dw / 2, oy + o.cy - dh / 2, dw, dh);
        ctx.restore();
      }
    } else {
      ctx.textBaseline = "middle";
      ctx.letterSpacing = `${o.ls ?? 0}px`;
      if (o.runs) {
        ctx.textAlign = "left";
        let x = ox + o.x;
        o.runs.forEach(([str, wt, col]) => {
          ctx.font = `${wt} ${o.s}px ${o.font || "Inter, sans-serif"}`;
          ctx.fillStyle = col || o.color;
          ctx.fillText(str, x, oy + o.y);
          x += ctx.measureText(str).width;
        });
        ctx.letterSpacing = "0px";
        return;
      }
      ctx.font = `${o.weight} ${o.s}px ${o.font || "Inter, sans-serif"}`;
      ctx.textAlign = o.align;
      ctx.fillStyle = o.color;
      let str = o.text;
      if (o.maxW && ctx.measureText(str).width > o.maxW) {
        while (str.length > 1 && ctx.measureText(`${str}…`).width > o.maxW) str = str.slice(0, -1);
        str = `${str}…`;
      }
      ctx.fillText(str, ox + o.x, oy + o.y);
      ctx.letterSpacing = "0px";
    }
  });
}

export { chromeKey, sampleChromeColors, chromeOps, ChromeCanvas, SocialOverlay, paintSocial };