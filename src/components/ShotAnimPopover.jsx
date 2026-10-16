import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { X } from "@phosphor-icons/react";
import { smoothstep } from "../lib/videoMath.js";
import { DEV_ANIM_GROUPS, DEV_ANIMS, devAnimLabel, devAnimPose } from "../lib/shotAnim.js";
import { Scrubber, SEG_ON, SEG_OFF } from "./controls.jsx";

// subject:
//   { type: "image",  img }                    -> snapshot of the real device (Mockup mode)
//   { type: "frames", ratio, items: [...] }    -> the real frames (Frame mode)
//   null                                        -> old placeholder
function drawDevAnimPreview(canvas, id, kind, p, subject) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
  const sp = smoothstep(p);
  const pose = id === "none" ? null : devAnimPose(id, kind === "exit" ? 1 - sp : sp);
  const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = pose ?? {};
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = document.documentElement.classList.contains("dark") ? "#171717" : "#FAF9FA";
  ctx.fillRect(0, 0, W, H);

  // size of the thing being animated
  let bw, bh;
  if (subject) {
    const ar = subject.type === "image" ? subject.img.naturalWidth / subject.img.naturalHeight : subject.ratio;
    bh = H * 0.8;
    bw = bh * ar;
    if (bw > W * 0.9) {
      bw = W * 0.9;
      bh = bw / ar;
    }
  } else {
    bw = H * 0.34;
    bh = H * 0.7;
  }

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(W / 2 + x * (W / 2 + bw / 2), H / 2 - y * (H / 2 + bh / 2));
  ctx.scale(Math.max(0.02, Math.abs(s * Math.cos(ry))), Math.max(0.02, Math.abs(s * Math.cos(rx))));
  ctx.translate(-bw / 2, -bh / 2);

  if (subject?.type === "image") {
    ctx.beginPath();
    ctx.roundRect(0, 0, bw, bh, bh * 0.04);
    ctx.clip();
    ctx.drawImage(subject.img, 0, 0, bw, bh);
  } else if (subject?.type === "frames") {
    subject.items.forEach((it) => {
      const fx = it.l * bw, fy = it.t * bh, fw = it.w * bw, fh = it.h * bh;
      const m = Math.min(fw, fh);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(fx, fy, fw, fh, it.radii.map((r) => r * m));
      ctx.clip();
      if (it.img) {
        const sc = Math.max(fw / it.img.naturalWidth, fh / it.img.naturalHeight);
        const dw = it.img.naturalWidth * sc, dh = it.img.naturalHeight * sc;
        ctx.drawImage(it.img, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh);
      } else {
        const g = ctx.createLinearGradient(0, fy, 0, fy + fh);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(1, "#FF47BC");
        ctx.fillStyle = g;
        ctx.fillRect(fx, fy, fw, fh);
      }
      ctx.restore();
    });
  } else {
    ctx.beginPath();
    ctx.roundRect(0, 0, bw, bh, bw * 0.16);
    ctx.fillStyle = "#0E0E10";
    ctx.fill();
    const g = ctx.createLinearGradient(0, 0, 0, bh);
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(1, "#FF47BC");
    ctx.beginPath();
    ctx.roundRect(3, 3, bw - 6, bh - 6, bw * 0.13);
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

function DevAnimTile({ anim, kind, active, onClick, subject }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  const id = anim ? anim.id : "none";
  useEffect(() => {
    if (!hover) {
      drawDevAnimPreview(ref.current, id, kind, 0.55, subject);
      return;
    }
    let raf;
    const t0 = performance.now();
    const T = 1100, CYCLE = T + 500;
    const loop = (now) => {
      drawDevAnimPreview(ref.current, id, kind, Math.min(1, ((now - t0) % CYCLE) / T), subject);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hover, id, kind, subject]);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="group flex flex-col items-stretch gap-1.5 min-w-0"
    >
      <div
        className={`relative w-full aspect-[3/2] rounded-lg overflow-hidden border transition-colors duration-150 ${
          active ? "border-[#FF47BC]" : "border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 group-hover:border-[#3A3A3A]/20 dark:group-hover:border-white/20"
        }`}
      >
        <canvas ref={ref} width={240} height={160} className="absolute inset-0 w-full h-full" />
      </div>
      <span
        className={`truncate text-center leading-4 transition-colors ${
          active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
        }`}
      >
        {anim ? anim.label(kind === "enter" ? "in" : "out") : "None"}
      </span>
    </button>
  );
}

export function ShotAnimPopover({ v, menu, onClose, onSwitch }) {
  const shot = v.shots.find((x) => x.id === menu.sid);
  const [pos, setPos] = useState(null);
  const [subject, setSubject] = useState(null);

  // grab the real device / frames once when the popover opens
  useEffect(() => {
    let dead = false;
    v.getAnimSubject?.().then((s) => !dead && setSubject(s));
    return () => { dead = true; };
  }, []);

  useLayoutEffect(() => {
    const update = () => {
      const t = v.toolbarRef?.current?.getBoundingClientRect();
      setPos({
        right: t ? window.innerWidth - t.left + 4 : 8,
        bottom: t ? window.innerHeight - t.bottom : 8,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!shot) return null;
  const kind = menu.kind;
  const isIn = kind === "enter";
  const cur = shot[kind] && shot[kind].id !== "none" ? shot[kind] : null;
  const set = (patch) => v.onShotAnim(shot.id, kind, { dur: 600, delay: 0, ...(cur ?? {}), ...patch });
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";

  return (
    <div
      data-vid-shotanim-menu
      style={{ position: "fixed", right: pos?.right ?? 0, bottom: pos?.bottom ?? 0, visibility: pos ? "visible" : "hidden", maxHeight: "min(82vh, 820px)" }}
      className="panel-enter w-[300px] flex flex-col overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
    >
      <div className="flex items-center h-12 pl-4 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <span className="flex-1 min-w-0 truncate text-left">
          <span className="section-title text-[#8C8C8C] dark:text-[#9A9A9A]">{isIn ? "Enter" : "Exit"} / </span>
          <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{cur ? devAnimLabel(cur.id, isIn ? "in" : "out") : "None"}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>

      {/* pinned controls */}
      <div className="flex flex-col gap-2 px-4 py-3 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <div className={seg}>
          {[["enter", "Enter"], ["exit", "Exit"]].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => onSwitch(k)}
              className={`seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
                kind === k ? SEG_ON : SEG_OFF
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${cur ? "" : "opacity-40 pointer-events-none"}`}>
          <Scrubber compact label="Duration (ms)" value={cur?.dur ?? 600} min={100} max={2000} hardMax={10000} onChange={(dur) => set({ dur })} />
          <Scrubber compact label="Delay (ms)" value={cur?.delay ?? 0} min={0} max={2000} hardMax={10000} onChange={(delay) => set({ delay })} />
          <span className="text-[#8C8C8C] dark:text-[#9A9A9A] leading-4">
            {isIn ? "The device stays hidden for the delay, then animates in." : `The animation ends this long before the ${v.frameMode ? "frame" : "shot"} does.`}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#E3E3E3_transparent] dark:[scrollbar-color:#333333_transparent]">
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <DevAnimTile anim={null} kind={kind} subject={subject} active={!cur} onClick={() => v.onShotAnim(shot.id, kind, null)} />
          </div>
          {DEV_ANIM_GROUPS.map((g) => (
            <div key={g} className="flex flex-col gap-2">
              <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{g}</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                {DEV_ANIMS.filter((x) => x.group === g).map((an) => (
                  <DevAnimTile key={an.id} anim={an} kind={kind} subject={subject} active={cur?.id === an.id} onClick={() => set({ id: an.id })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}