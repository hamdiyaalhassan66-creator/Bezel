import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X, Check, CaretDown, CaretRight, Play, Pause, SkipBack, SkipForward, Plus, Devices, FolderOpen, CardsThree, UploadSimple, CircleNotch, Palette, TextT, Diamond, DotsSixVertical, Eye, EyeSlash, ArrowsCounterClockwise, MusicNoteSimple } from "@phosphor-icons/react";
import { SEG_ON, SEG_OFF, Scrubber, SectionHeader } from "./components/controls.jsx";
import { VidBtn } from "./components/timelineParts.jsx";
import { OffsetField } from "./SizeFields.jsx";
import { fmtTC } from "./lib/videoMath.js";
import { DROPDOWN_TRIGGER, DROPDOWN_CARET } from "./Dropdown.jsx";
import KeyCombo from "./KeyCombo.jsx";
import { KeyCap } from "./ShortcutsModal.jsx";

const PAD = 4; // breathing room around the highlighted element
const GAP = 12; // space between spotlight and card
const MARGIN = 12; // min distance from the viewport edge
const CARD_W = 320;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const TOUR_CSS = `
@keyframes tour-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes tour-card-in { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: none } }
@keyframes tour-step-in { from { opacity: 0; transform: translateX(calc(var(--tour-dx, 1) * 10px)) } to { opacity: 1; transform: none } }
@keyframes tour-rise { from { opacity: 0; transform: translateY(8px) scale(0.97) } to { opacity: 1; transform: none } }
@keyframes tour-pop { from { opacity: 0; transform: scale(0.8) } to { opacity: 1; transform: none } }
@keyframes tour-fill { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes tour-turn { from { transform: rotateY(18deg) } to { transform: rotateY(-20deg) } }
@keyframes tour-cursor { from { opacity: 0; transform: translate3d(-22px, 6px, 0) } 15% { opacity: 1 } to { opacity: 1; transform: translate3d(22px, 0, 0) } }
@keyframes tour-scrub { from { transform: translate3d(0, 0, 0) } to { transform: translate3d(var(--w, 150px), 0, 0) } }
@keyframes tour-travel { from { transform: translate3d(0, 0, 0) } to { transform: translate3d(var(--w, 200px), 0, 0) } }
@keyframes tour-drag { from { transform: translate3d(0, 0, 0) } to { transform: translate3d(40px, 0, 0) } }
@keyframes tour-grab { from { opacity: 0; transform: translate3d(0, 4px, 0) } 15% { opacity: 1 } to { opacity: 1; transform: translate3d(40px, 0, 0) } }
.tour-scrub { animation: tour-scrub 900ms ${EASE} 200ms both; }
.tour-drag { animation: tour-drag 700ms ${EASE} 200ms both; }
.tour-grab { animation: tour-grab 700ms ${EASE} 200ms both; }
.tour-card { animation: tour-card-in 220ms ${EASE} both; }
.tour-step { animation: tour-step-in 220ms ${EASE} both; }
.tour-rise { animation: tour-rise 260ms ${EASE} both; animation-delay: var(--d, 0ms); }
.tour-pop { animation: tour-pop 240ms ${EASE} both; animation-delay: var(--d, 0ms); }
.tour-fill { transform-origin: left; animation: tour-fill 700ms ${EASE} both; animation-delay: var(--d, 0ms); }
.tour-turn { animation: tour-turn 800ms ${EASE} 150ms both; }
.tour-cursor { animation: tour-cursor 800ms ${EASE} 150ms both; }
@media (prefers-reduced-motion: reduce) {
  .tour-root, .tour-root * { animation-duration: 1ms !important; animation-delay: 0ms !important; transition-duration: 1ms !important; }
}
`;

/* ---------- Shared tokens, copied from the app ---------- */
const PANEL = "bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10";
const MUTED = "text-[#737373] dark:text-[#ABABAB]";
const STRONG = "text-[#3A3A3A] dark:text-[#FAF9FA]";
const SKEL = "bg-[#EDEDED] dark:bg-[#292929]";
const LINE = "border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10";
const SHOT = "bg-[#FF47BC]/15 border border-[#FF47BC]/40";
const OTHER = `${SKEL} border ${LINE}`;
const PINK_SHADOW = "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)";
const GHOST =
  "flex items-center justify-center gap-1.5 h-7 px-2 rounded-xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[12px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]";
const ICON_BTN =
  "flex items-center justify-center w-7 h-7 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]";
const stop = (e) => e.stopPropagation(); // interactive art shouldn't trigger the click-to-replay

const MiniPhone = ({ className = "", pad = "p-1.5" }) => (
  <div className={`rounded-[14px] bg-[#1A1A1A] border-2 border-[#3A3A3A] ${pad} ${className}`}>
    <div className="w-full h-full rounded-lg bg-gradient-to-b from-white to-[#FF47BC]" />
  </div>
);

const Cursor = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 2l9 4.2-3.8 1.4L6.6 11.6 3 2z" fill="#fff" stroke="#1A1A1A" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

const Dia = ({ c = "#FF47BC" }) => <span className="block w-2 h-2 rotate-45 rounded-[1px]" style={{ background: c }} />;

// Timeline panel: bleeds off the bottom of the illustration like the real timeline
const TlPanel = ({ children }) => (
  <div className="h-full px-3 pt-3">
    <div className={`h-full rounded-t-2xl ${PANEL} border-b-0 overflow-hidden`}>{children}</div>
  </div>
);

/* ---------- App tour ---------- */
function ArtWelcome() {
  const rail = [Devices, FolderOpen, CardsThree];
  const d = (n) => ({ "--d": `${n}ms` });
  return (
    <div className="h-full flex gap-1.5 p-2">
      <div className="flex flex-col gap-0.5">
        {rail.map((Icon, i) => (
          <span
            key={i}
            className={`tour-rise flex items-center justify-center w-7 h-7 rounded-lg ${i === 0 ? "bg-[#FAF9FA] dark:bg-[#171717]" : ""}`}
            style={d(i * 40)}
          >
            <Icon size={14} weight={i === 0 ? "fill" : "regular"} className={i === 0 ? "text-[#FF47BC]" : MUTED} />
          </span>
        ))}
      </div>
      <div className={`tour-rise w-[68px] rounded-xl ${PANEL} p-1.5 flex flex-col gap-1`} style={d(60)}>
        <span className={`h-2 w-8 rounded-full ${SKEL}`} />
        <span className="h-4 rounded-md bg-[#FF47BC]/10" />
        <span className={`h-4 rounded-md ${SKEL}`} />
        <span className={`h-4 rounded-md ${SKEL}`} />
      </div>
      <div className={`tour-rise flex-1 rounded-xl ${PANEL} flex items-center justify-center`} style={d(120)}>
        <MiniPhone pad="p-1" className="w-[34px] h-[62px]" />
      </div>
      <div className={`tour-rise w-[72px] rounded-xl ${PANEL} p-1.5 flex flex-col gap-2`} style={d(180)}>
        <span className="flex p-px rounded-lg bg-[#F0F0F0] dark:bg-black">
          <span className="flex-1 h-3 rounded-md bg-white dark:bg-[#292929]" />
          <span className="flex-1" />
        </span>
        {[60, 35, 80].map((w) => (
          <span key={w} className={`h-1 rounded-full overflow-hidden ${SKEL}`}>
            <span className="block h-full rounded-full bg-[#FF47BC]" style={{ width: `${w}%` }} />
          </span>
        ))}
      </div>
    </div>
  );
}

function ArtLeft() {
  const [on, setOn] = useState(0);
  const tabs = [
    { Icon: Devices, title: "Devices" },
    { Icon: FolderOpen, title: "Projects" },
    { Icon: CardsThree, title: "Templates" },
  ];
  const row = (label, sel, i) => (
    <div
      key={label}
      className={`tour-rise flex items-center justify-between h-6 px-2 rounded-md text-[11px] font-medium tracking-[-0.005em] ${sel ? "bg-[#FF47BC]/10 text-[#FF47BC]" : MUTED}`}
      style={{ "--d": `${i * 40}ms` }}
    >
      <span className="truncate">{label}</span>
      {sel && <Check size={12} />}
    </div>
  );
  const projectRow = (label, sel, i) => (
    <div
      key={label}
      className={`tour-rise flex items-center gap-2 h-7 px-1.5 rounded-md text-[11px] font-medium tracking-[-0.005em] ${sel ? "bg-[#FF47BC]/10 text-[#FF47BC]" : MUTED}`}
      style={{ "--d": `${i * 40}ms` }}
    >
      <span className={`w-5 h-5 rounded shrink-0 ${SKEL}`} />
      <span className="truncate">{label}</span>
    </div>
  );
  return (
    <div onClick={stop} className="h-full flex items-start gap-2 p-3">
      <div className="flex flex-col gap-1">
        {tabs.map(({ Icon }, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOn(i)}
            className={`tour-rise flex items-center justify-center w-9 h-9 rounded-[10px] transition-[background-color,transform] duration-150 active:scale-[0.94] ${
              on === i ? "bg-[#FAF9FA] dark:bg-[#171717]" : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            style={{ "--d": `${i * 40}ms` }}
          >
            <Icon size={18} weight={on === i ? "fill" : "regular"} className={on === i ? "text-[#FF47BC]" : MUTED} />
          </button>
        ))}
      </div>
      <div className={`flex-1 h-full rounded-xl ${PANEL} overflow-hidden`}>
        <div className={`flex items-center h-8 px-3 border-b ${LINE} text-[12px] font-medium tracking-[-0.005em] ${STRONG}`}>
          {tabs[on].title}
        </div>
        <div key={on} className="p-1.5 flex flex-col gap-0.5">
          {on === 0 && ["iPhone 16 Pro Max", "iPhone 16", "Pixel 9"].map((l, i) => row(l, i === 0, i))}
          {on === 1 && ["Landing page", "App Store shots", "Promo reel"].map((l, i) => projectRow(l, i === 0, i))}
          {on === 2 && (
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`tour-rise h-9 rounded-md ${i === 0 ? "bg-[#FF47BC]/10" : SKEL}`} style={{ "--d": `${i * 40}ms` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtCanvas() {
  return (
    <div className="h-full p-2">
      <div className={`relative h-full rounded-xl ${PANEL} flex items-center justify-center overflow-hidden`} style={{ perspective: 400 }}>
        <MiniPhone className="tour-turn w-[52px] h-[94px]" />
        <div className="tour-cursor absolute left-[50%] top-[58%]">
          <Cursor />
        </div>
        <div className="absolute bottom-2 right-2 flex items-start pointer-events-none">
          <span className={`${DROPDOWN_TRIGGER} min-w-[72px]`}>
            <span className={`whitespace-nowrap text-[13px] font-medium tracking-[-0.005em] ${MUTED}`}>Fill</span>
            <CaretDown size={16} weight="regular" className={DROPDOWN_CARET} />
          </span>
        </div>
      </div>
    </div>
  );
}

function ArtRight() {
  const [v, setV] = useState({ rot: 24, zoom: 70, fov: 27 });
  const set = (k) => (n) => setV((p) => ({ ...p, [k]: n }));
  return (
    <div onClick={stop} className="h-full px-3 pt-3">
      <div className={`h-full rounded-t-2xl ${PANEL} border-b-0 p-3 flex flex-col gap-2`}>
        <SectionHeader label="Camera" open onToggle={() => {}} />
        <div className="tour-rise flex flex-col gap-2 pt-2" style={{ "--d": "80ms" }}>
          <Scrubber label="Z - Rotation" value={v.rot} min={-360} max={360} onChange={set("rot")} />
          <Scrubber label="Zoom" value={v.zoom} min={0} max={100} onChange={set("zoom")} />
          <Scrubber label="FoV" value={v.fov} min={0} max={120} onChange={set("fov")} />
        </div>
      </div>
    </div>
  );
}

function ArtModes() {
  const tabs = ["Mockup", "Frame", "Animation"];
  const [on, setOn] = useState(0);
  const fade = (i) => ({
    opacity: on === i ? 1 : 0,
    transform: on === i ? "scale(1)" : "scale(0.92)",
    transition: `opacity 180ms ease-out, transform 220ms ${EASE}`,
  });
  const plane = `absolute w-[40px] h-[50px] rounded-lg bg-gradient-to-b from-white to-[#FF47BC] border ${LINE} shadow-md`;
  return (
    <div onClick={stop} className="h-full p-2">
      <div className={`h-full rounded-xl ${PANEL} flex flex-col overflow-hidden`}>
        <div className={`flex items-center gap-1 h-9 px-2 shrink-0 border-b ${LINE}`}>
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setOn(i)}
              className={`h-6 px-2.5 rounded-lg text-[12px] leading-4 font-medium tracking-[-0.005em] transition-colors duration-150 ${
                on === i ? `bg-[#EDEDED] dark:bg-[#292929] ${STRONG}` : `${MUTED} hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]`
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0 flex items-center justify-center" style={fade(0)}>
            <MiniPhone pad="p-1" className="w-[38px] h-[68px]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center" style={fade(1)}>
            <div className={`w-[64px] h-[60px] rounded-lg bg-gradient-to-b from-white to-[#FF47BC] border ${LINE} shadow-md`} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center" style={fade(2)}>
            <div className="relative w-[76px] h-[60px]">
              <div className={`${plane} left-0 top-2`} />
              <div className={`${plane} right-0 top-0`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtSize() {
  const opts = [["9:16", 44, 78], ["1:1", 62, 62], ["16:9", 88, 50]];
  const [on, setOn] = useState(0);
  const [open, setOpen] = useState(false);
  return (
    <div onClick={stop} className="h-full p-2">
      <div className={`relative h-full rounded-xl ${PANEL} flex items-center justify-center overflow-hidden`}>
        <div className="relative w-[90px] h-[80px]">
          {opts.map(([l, w, h], i) => (
            <div
              key={l}
              className={`absolute inset-0 m-auto rounded-md bg-gradient-to-b from-white to-[#FF47BC] border ${LINE} shadow-md`}
              style={{
                width: w,
                height: h,
                opacity: on === i ? 1 : 0,
                transform: on === i ? "scale(1)" : "scale(0.92)",
                transition: `opacity 180ms ease-out, transform 220ms ${EASE}`,
              }}
            />
          ))}
        </div>

        {open && (
          <div
            className={`tour-pop absolute right-2 bottom-11 w-[110px] p-1 flex flex-col gap-0.5 rounded-xl ${PANEL} shadow-[0_4px_8px_rgba(0,0,0,0.05)] z-10`}
            style={{ transformOrigin: "bottom right" }}
          >
            {opts.map(([l], i) => (
              <button
                key={l}
                type="button"
                onClick={() => { setOn(i); setOpen(false); }}
                className={`flex items-center justify-between h-6 px-2 rounded-md text-[11px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
                  on === i ? "bg-[#FF47BC]/10 text-[#FF47BC]" : `${MUTED} hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]`
                }`}
              >
                {l}
                {on === i && <Check size={12} />}
              </button>
            ))}
          </div>
        )}

        <div className="absolute bottom-2 right-2 flex items-start">
          <button type="button" onClick={() => setOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} min-w-[72px]`}>
            <span className={`whitespace-nowrap text-[13px] font-medium tracking-[-0.005em] ${MUTED}`}>{opts[on][0]}</span>
            <CaretDown
              size={16}
              weight="regular"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
              className={DROPDOWN_CARET}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function ArtExport({ video = false }) {
  const opts = video ? ["MP4", "WebM", "Lottie"] : ["2K", "4K", "8K"];
  const [on, setOn] = useState(1);
  const [stage, setStage] = useState("idle"); // idle | run | done
  const timers = useRef([]);
  const run = () => {
    timers.current.forEach(clearTimeout);
    setStage("run");
    timers.current = [setTimeout(() => setStage("done"), 1200)];
  };
  useEffect(() => {
    timers.current = [setTimeout(run, 450)];
    return () => timers.current.forEach(clearTimeout);
  }, []);
  return (
    <div onClick={stop} className="h-full flex items-center justify-center">
      <div className={`w-[236px] p-3 flex flex-col gap-2 rounded-2xl ${PANEL}`}>
        <label className={`text-[12px] font-medium tracking-[0.01em] ${MUTED}`}>{video ? "File type" : "Resolution"}</label>
        <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
          {opts.map((o, i) => (
            <button
              key={o}
              type="button"
              onClick={() => setOn(i)}
              className={`seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${on === i ? SEG_ON : SEG_OFF}`}
            >
              {o}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={run}
          className="w-full h-8 flex items-center justify-center px-3 py-1.5 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] hover:bg-[#F230AE] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]"
          style={{ boxShadow: PINK_SHADOW }}
        >
          <span key={stage} className="tour-pop flex items-center gap-2">
            {stage === "run" ? (
              <><CircleNotch size={14} weight="regular" className="animate-spin" /> Exporting…</>
            ) : stage === "done" ? (
              <><Check size={14} weight="bold" /> Exported</>
            ) : (
              <><UploadSimple size={14} weight="regular" /> {video ? "Export video" : "Export image"}</>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

function ArtDone() {
  return (
    <div className="h-full flex items-center justify-center">
      <div
        className="tour-pop w-14 h-14 rounded-full border border-[#FCFCFC]/20 bg-[#FF47BC] flex items-center justify-center"
        style={{ boxShadow: PINK_SHADOW }}
      >
        <Check size={26} weight="bold" className="text-[#FCFCFC]" />
      </div>
    </div>
  );
}

/* ---------- Video tour: a miniature of the real timeline ---------- */
const TL_LABEL_W = 116;
const TL_PPS = 24;
const TL_PAD = 10;
const TL_AXIS = 6; // seconds drawn on the ruler
const TL_HEAD_MAX = 4.4;
const TRACK = "bg-[#F0F0F0] dark:bg-[#1F1F1F]";
const CLIP = "bg-[#E3E3E3] dark:bg-[#333333]";
const TL_DIV = "border-[#222222]/10 dark:border-[#FAF9FA]/10";
const BG_CSS = "linear-gradient(90deg, #FFFFFF, #FF47BC)";
const clampN = (n, a, b) => Math.min(Math.max(n, a), b);
const snap1 = (n) => Math.round(n * 10) / 10;
const reduceMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function dragWin(fn) {
  const up = () => {
    window.removeEventListener("pointermove", fn);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", fn);
  window.addEventListener("pointerup", up);
}

// Playhead written straight to the DOM, like the real timeline
function usePlayhead(initial = 0, max = TL_HEAD_MAX) {
  const headRef = useRef(null);
  const tcRef = useRef(null);
  const tRef = useRef(initial);
  const paint = useCallback(() => {
    if (headRef.current) headRef.current.style.transform = `translateX(${TL_LABEL_W + TL_PAD + tRef.current * TL_PPS}px)`;
    if (tcRef.current) tcRef.current.textContent = fmtTC(tRef.current);
  }, []);
  useLayoutEffect(paint, [paint]);
  const set = useCallback((t) => {
    tRef.current = clampN(t, 0, max);
    paint();
  }, [max, paint]);
  const el = (
    <div ref={headRef} className="absolute top-0 bottom-0 left-0 z-[15] pointer-events-none">
      <div className="absolute left-0 top-0 -translate-x-1/2 px-[7px] py-0.5 rounded-[4px] bg-[#FF47BC] flex items-center">
        <span ref={tcRef} className="tabular-nums leading-[18px] text-[11px] text-[#FCFCFC]">00:00:00</span>
        <i className="absolute left-1/2 -bottom-[3px] -ml-1 w-2 h-2 rotate-45 rounded-[1px] bg-[#FF47BC]" />
      </div>
      <div className="absolute left-0 top-[22px] bottom-0 w-px bg-[#FF47BC]" />
    </div>
  );
  return { el, set, tRef };
}

function MiniRuler({ dur, onPointerDown }) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={`relative h-[29px] overflow-hidden border-b ${TL_DIV} bg-[#FAF9FA] dark:bg-[#171717] ${onPointerDown ? "cursor-pointer" : ""}`}
    >
      {dur != null && (
        <div
          className="absolute inset-y-0 right-0 pointer-events-none bg-[#F0F0F0] dark:bg-[#1F1F1F]"
          style={{ left: TL_LABEL_W + TL_PAD + dur * TL_PPS }}
        />
      )}
      {Array.from({ length: TL_AXIS }, (_, s) => (
        <React.Fragment key={s}>
          <span
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[12px] leading-3 tracking-[-0.005em] ${MUTED}`}
            style={{ left: TL_LABEL_W + TL_PAD + s * TL_PPS }}
          >
            {s}s
          </span>
          {[1, 2, 3].map((j) => (
            <i
              key={j}
              className="absolute top-1/2 -mt-px w-0.5 h-0.5 bg-[#B9B9B9] dark:bg-[#555]"
              style={{ left: TL_LABEL_W + TL_PAD + (s + j / 4) * TL_PPS - 1 }}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function MiniTimeline({ toolbar, toolbarClass = "", names, tracks, dur, noRuler, collapsed, onRulerDown, footer, children }) {
  return (
    <div className="h-full px-2 pt-2">
      <div className={`h-full rounded-t-2xl bg-[#FAF9FA] dark:bg-[#171717] border border-b-0 ${LINE} overflow-hidden flex flex-col`}>
        {toolbar && (
          <div className={`flex items-center px-3 py-2 gap-1 shrink-0 border-b ${TL_DIV} ${toolbarClass}`}>{toolbar}</div>
        )}
        <div
          className="relative flex-1 min-h-0"
          style={{
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? "translateY(6px)" : "none",
            transition: `opacity 180ms ease-out, transform 220ms ${EASE}`,
          }}
        >
          <div aria-hidden className={`absolute top-0 bottom-0 z-[25] w-px pointer-events-none bg-[#222222]/10 dark:bg-[#FAF9FA]/10`} style={{ left: TL_LABEL_W - 1 }} />
          {!noRuler && <MiniRuler dur={dur} onPointerDown={onRulerDown} />}
          <div className="flex">
            <div className="shrink-0 flex flex-col gap-1 pt-2" style={{ width: TL_LABEL_W }}>{names}</div>
            <div className="relative flex-1 flex flex-col gap-1 pt-2">{tracks}</div>
          </div>
          {dur != null && (
            <div
              aria-hidden
              className={`absolute bottom-0 right-0 pointer-events-none bg-[#F0F0F0] dark:bg-[#1F1F1F] ${noRuler ? "top-0" : "top-[29px]"}`}
              style={{ left: TL_LABEL_W + TL_PAD + dur * TL_PPS }}
            />
          )}
          {footer}
          {children}
        </div>
      </div>
    </div>
  );
}

const Grip = ({ on }) => (
  <DotsSixVertical size={16} weight="regular" className={`shrink-0 ${on ? "text-[#FF47BC]" : "text-[#949494]"}`} />
);

function NameRow({ selected, onClick, onDoubleClick, className = "", children }) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`group flex items-center h-[30px] gap-1 pl-2 pr-1 text-[12px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
        onClick ? "cursor-pointer" : ""
      } ${
        selected
          ? "bg-[#FF47BC]/10 text-[#FF47BC]"
          : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-black/[0.03] dark:hover:bg-white/5"
      } ${className}`}
    >
      {children}
    </div>
  );
}

const EyeBtn = ({ hidden, onClick }) => (
  <button
    type="button"
    aria-label={hidden ? "Show" : "Hide"}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    onDoubleClick={(e) => e.stopPropagation()}
    className="ml-auto flex items-center justify-center w-6 h-6 shrink-0 rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94]"
  >
    {hidden ? (
      <EyeSlash size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
    ) : (
      <Eye size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
    )}
  </button>
);

const TrackRow = ({ selected, onClick, className = "", children }) => (
  <div onClick={onClick} className={`relative h-[30px] ${selected ? "bg-[#FF47BC]/10" : TRACK} ${className}`}>
    {children}
  </div>
);

function ShotClip({ start, len, active, keys = [], hidden, onBodyDown, onEdgeDown, onKeyDown }) {
  const w = len * TL_PPS;
  const kx = (t) => clampN(t * TL_PPS, 15, Math.max(15, w - 15));
  return (
    <div
      onPointerDown={onBodyDown}
      className={`absolute top-0 h-[30px] rounded-[8px] ${active ? "bg-[#FF47BC] border border-[#FF47BC]" : CLIP} ${hidden ? "opacity-40" : ""} ${
        onBodyDown ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      style={{ left: TL_PAD + start * TL_PPS, width: w }}
    >
      {active &&
        ["l", "r"].map((m) => (
          <div
            key={m}
            onPointerDown={onEdgeDown?.(m)}
            className={`absolute ${m === "l" ? "left-0" : "right-0"} inset-y-0 w-2.5 flex items-center justify-center ${onEdgeDown ? "cursor-ew-resize" : ""}`}
          >
            <i className="w-0.5 h-4 rounded-full bg-white" />
          </div>
        ))}
      {active &&
        keys.slice(0, -1).map((k, i) => (
          <i
            key={`l${i}`}
            className="absolute top-1/2 h-px bg-[#FAF9FA]/70 pointer-events-none"
            style={{ left: kx(k) + 9, width: Math.max(0, kx(keys[i + 1]) - kx(k) - 18) }}
          />
        ))}
      {active &&
        keys.map((k, i) => (
          <div
            key={i}
            onPointerDown={onKeyDown?.(i)}
            className={`absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
              onKeyDown ? "cursor-grab active:cursor-grabbing" : ""
            }`}
            style={{ left: kx(k) }}
          >
            <span className="tour-pop flex">
              <Diamond size={14} weight="bold" className="text-[#FAF9FA]" />
            </span>
          </div>
        ))}
    </div>
  );
}

// Per-property track inside an expanded shot
function PropClip({ start, len, keys }) {
  const w = len * TL_PPS;
  const kx = (t) => clampN(t * TL_PPS, 15, Math.max(15, w - 15));
  return (
    <div className="absolute top-0 h-[30px] rounded-[8px] bg-[#E3E3E3]/60 dark:bg-[#333333]/60" style={{ left: TL_PAD + start * TL_PPS, width: w }}>
      {keys.slice(0, -1).map((k, i) => (
        <i key={i} className="absolute top-1/2 h-px bg-[#FF47BC] pointer-events-none" style={{ left: kx(k) + 8, width: Math.max(0, kx(keys[i + 1]) - kx(k) - 16) }} />
      ))}
      {keys.map((k, i) => (
        <span key={i} className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center" style={{ left: kx(k) }}>
          <Diamond size={12} weight="bold" className="text-[#FF47BC]" />
        </span>
      ))}
    </div>
  );
}

const BgClip = ({ start, len, hidden }) => (
  <div
    className={`absolute top-0 h-[30px] rounded-[8px] overflow-hidden border border-[#3A3A3A]/15 ${hidden ? "opacity-40" : ""}`}
    style={{ left: TL_PAD + start * TL_PPS, width: len * TL_PPS, background: BG_CSS }}
  />
);

const TextClip = ({ start, len, label, hidden }) => (
  <div
    className={`absolute top-0 h-[30px] rounded-[8px] overflow-hidden bg-[#FF47BC]/20 ${hidden ? "opacity-40" : ""}`}
    style={{ left: TL_PAD + start * TL_PPS, width: len * TL_PPS }}
  >
    <span className="absolute inset-y-0 left-3 right-3 flex items-center truncate leading-4 text-[12px] pointer-events-none text-[#FF47BC]">{label}</span>
  </div>
);

/* --- 1. Build your shots --- */
function ArtVidActions() {
  const [shots, setShots] = useState([{ id: 1, keys: [0] }]);
  const [sel, setSel] = useState(1);
  const [bg, setBg] = useState(false);
  const [loop, setLoop] = useState(false);
  const nextId = useRef(2);
  const cur = shots.find((s) => s.id === sel);
  const canKey = !!cur && cur.keys.length < 3;
  const addShot = () => {
    if (shots.length >= 3) return;
    const id = nextId.current++;
    setShots((s) => [...s, { id, keys: [0] }]);
    setSel(id);
  };
  const addKey = () => {
    if (!canKey) return;
    setShots((s) => s.map((x) => (x.id === sel ? { ...x, keys: [...x.keys, +(x.keys[x.keys.length - 1] + 1.2).toFixed(1)] } : x)));
  };
  return (
    <div onClick={stop} className="h-full">
      <MiniTimeline
        noRuler
        toolbar={
          <>
            <VidBtn label="Add shot" shortcut={["S"]} onClick={addShot} disabled={shots.length >= 3}>
              <Plus size={16} weight="bold" />
            </VidBtn>
            <VidBtn label="Add keyframe" shortcut={["K"]} tone={canKey ? "pink" : "default"} onClick={addKey} disabled={!canKey}>
              <Diamond size={16} weight={canKey ? "fill" : "bold"} />
            </VidBtn>
            <VidBtn label="Add background" onClick={() => setBg(true)} disabled={bg}>
              <Palette size={16} weight="bold" />
            </VidBtn>
            <VidBtn label="Loop" shortcut={["⇧", "L"]} tone={loop ? "pink" : "default"} onClick={() => setLoop((v) => !v)}>
              <ArrowsCounterClockwise size={16} weight="bold" />
            </VidBtn>
          </>
        }
        names={
          <>
            {shots.map((s, i) => (
              <NameRow key={s.id} className="tour-rise" selected={sel === s.id} onClick={() => setSel(s.id)}>
                <Grip on={sel === s.id} />
                <span className="flex items-center justify-center w-4 h-4 shrink-0"><CaretRight size={12} weight="bold" /></span>
                <span className="flex-1 min-w-0 truncate leading-4 ml-1">Shot {i + 1}</span>
              </NameRow>
            ))}
            {bg && (
              <NameRow className="tour-rise">
                <Grip />
                <span className="flex items-center justify-center w-4 h-4 shrink-0"><Palette size={14} weight="regular" /></span>
                <span className="flex-1 min-w-0 truncate leading-4 ml-1">Background 1</span>
              </NameRow>
            )}
          </>
        }
        tracks={
          <>
            {shots.map((s, i) => (
              <TrackRow key={s.id} className="tour-rise" selected={sel === s.id} onClick={() => setSel(s.id)}>
                <ShotClip start={i * 1.2} len={2.5} active={sel === s.id} keys={s.keys} />
              </TrackRow>
            ))}
            {bg && (
              <TrackRow className="tour-rise">
                <BgClip start={0} len={5} />
              </TrackRow>
            )}
          </>
        }
      />
    </div>
  );
}

/* --- 2. Play it back --- */
function ArtVidPlay() {
  const ph = usePlayhead(1.2);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (reduceMotion()) return;
    const t = setTimeout(() => setPlaying(true), 500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let raf, prev = performance.now();
    const step = (now) => {
      const t = ph.tRef.current + (now - prev) / 1000;
      prev = now;
      if (t >= TL_HEAD_MAX) {
        ph.set(TL_HEAD_MAX);
        setPlaying(false);
        return;
      }
      ph.set(t);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  const toggle = () => {
    if (!playing && ph.tRef.current >= TL_HEAD_MAX) ph.set(0);
    setPlaying((p) => !p);
  };
  return (
    <div onClick={stop} className="h-full">
      <MiniTimeline
        toolbarClass="justify-center gap-2"
        toolbar={
          <>
            <VidBtn label="Previous marker" tone="strong" onClick={() => ph.set(0)}>
              <SkipBack size={16} weight="bold" />
            </VidBtn>
            <VidBtn label={playing ? "Pause" : "Play"} tone="pink" shortcut={["Space"]} onClick={toggle}>
              {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
            </VidBtn>
            <VidBtn label="Next marker" tone="strong" onClick={() => ph.set(TL_HEAD_MAX)}>
              <SkipForward size={16} weight="bold" />
            </VidBtn>
          </>
        }
        names={
          <NameRow selected>
            <Grip on />
            <span className="flex items-center justify-center w-4 h-4 shrink-0"><CaretRight size={12} weight="bold" /></span>
            <span className="flex-1 min-w-0 truncate leading-4 ml-1">Shot 1</span>
          </NameRow>
        }
        tracks={
          <TrackRow selected>
            <ShotClip start={0} len={4} active keys={[0, 2.4]} />
          </TrackRow>
        }
      >
        {ph.el}
      </MiniTimeline>
    </div>
  );
}

/* --- 3. Shots, backgrounds and text --- */
function ArtVidNames() {
  const [rows, setRows] = useState([
    { id: "shot", type: "shot", name: "Shot 1" },
    { id: "bg", type: "bg", name: "Background 1" },
    { id: "text", type: "text", name: "Text" },
  ]);
  const [sel, setSel] = useState("shot");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [hidden, setHidden] = useState({});
  const cancel = useRef(false);
  const commit = (id, val) => {
    if (cancel.current) cancel.current = false;
    else {
      const n = val.trim();
      if (n) setRows((r) => r.map((x) => (x.id === id ? { ...x, name: n } : x)));
    }
    setEdit(null);
  };
  const ICON = { bg: Palette, text: TextT };
  const PROPS = ["Z - Rotation", "Zoom"];
  return (
    <div onClick={stop} className="h-full">
      <MiniTimeline
        names={rows.map((r) => {
          const Icon = ICON[r.type];
          return (
            <React.Fragment key={r.id}>
              <NameRow selected={sel === r.id} onClick={() => setSel(r.id)} onDoubleClick={() => setEdit(r.id)} className="tour-rise">
                <Grip on={sel === r.id} />
                {r.type === "shot" ? (
                  <button
                    type="button"
                    aria-label={open ? "Collapse shot" : "Expand shot"}
                    onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-4 h-4 shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <CaretRight size={12} weight="bold" className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
                  </button>
                ) : (
                  <span className="flex items-center justify-center w-4 h-4 shrink-0"><Icon size={14} weight="regular" /></span>
                )}
                {edit === r.id ? (
                  <input
                    autoFocus
                    defaultValue={r.name}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onBlur={(e) => commit(r.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") { cancel.current = true; e.currentTarget.blur(); }
                    }}
                    className="flex-1 min-w-0 h-5 px-1 -mx-1 ml-0 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none leading-4 text-[#3A3A3A] dark:text-[#FAF9FA]"
                  />
                ) : (
                  <span className={`flex-1 min-w-0 truncate leading-4 ml-1 ${hidden[r.id] ? "opacity-50" : ""}`}>{r.name}</span>
                )}
                <EyeBtn hidden={!!hidden[r.id]} onClick={() => setHidden((h) => ({ ...h, [r.id]: !h[r.id] }))} />
              </NameRow>
              {r.type === "shot" &&
                open &&
                PROPS.map((p) => (
                  <div key={p} className={`tour-rise flex items-center h-[30px] pl-10 pr-2 text-[12px] font-medium tracking-[-0.005em] ${MUTED}`}>
                    <span className="truncate leading-4">{p}</span>
                  </div>
                ))}
            </React.Fragment>
          );
        })}
        tracks={rows.map((r) => (
          <React.Fragment key={r.id}>
            <TrackRow selected={sel === r.id} onClick={() => setSel(r.id)}>
              {r.type === "shot" && <ShotClip start={0.2} len={3.4} active={sel === r.id} keys={[0, 1.8]} hidden={hidden[r.id]} />}
              {r.type === "bg" && <BgClip start={0} len={4.4} hidden={hidden[r.id]} />}
              {r.type === "text" && <TextClip start={0.8} len={2.8} label={r.name} hidden={hidden[r.id]} />}
            </TrackRow>
            {r.type === "shot" &&
              open &&
              PROPS.map((p) => (
                <TrackRow key={p} className="tour-rise">
                  <PropClip start={0.2} len={3.4} keys={[0, 1.8]} />
                </TrackRow>
              ))}
          </React.Fragment>
        ))}
      />
    </div>
  );
}

/* --- 4. Drag clips and keyframes --- */
function ArtVidTracks() {
  const [clip, setClip] = useState({ start: 0.6, len: 2.6 });
  const [keys, setKeys] = useState([0, 1.6]);
  const [touched, setTouched] = useState(false);
  const clipRef = useRef(clip);
  clipRef.current = clip;
  const LIMIT = TL_AXIS - 0.4;
  const down = (mode) => (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setTouched(true);
    const px0 = e.clientX;
    const { start: s0, len: l0 } = clipRef.current;
    dragWin((ev) => {
      const d = (ev.clientX - px0) / TL_PPS;
      if (mode === "move") setClip({ start: snap1(clampN(s0 + d, 0, LIMIT - l0)), len: l0 });
      else if (mode === "r") setClip({ start: s0, len: snap1(clampN(l0 + d, 0.6, LIMIT - s0)) });
      else {
        const start = snap1(clampN(s0 + d, 0, s0 + l0 - 0.6));
        setClip({ start, len: snap1(s0 + l0 - start) });
      }
    });
  };
  const keyDown = (i) => (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setTouched(true);
    const px0 = e.clientX;
    const t0 = keys[i];
    dragWin((ev) =>
      setKeys((ks) => ks.map((k, j) => (j === i ? snap1(clampN(t0 + (ev.clientX - px0) / TL_PPS, 0, clipRef.current.len)) : k)))
    );
  };
  return (
    <div className="h-full">
      <MiniTimeline
        names={
          <>
            <NameRow selected>
              <Grip on />
              <span className="flex items-center justify-center w-4 h-4 shrink-0"><CaretRight size={12} weight="bold" /></span>
              <span className="flex-1 min-w-0 truncate leading-4 ml-1">Shot 1</span>
            </NameRow>
            <NameRow>
              <Grip />
              <span className="flex items-center justify-center w-4 h-4 shrink-0"><Palette size={14} weight="regular" /></span>
              <span className="flex-1 min-w-0 truncate leading-4 ml-1">Background 1</span>
            </NameRow>
            <NameRow>
              <Grip />
              <span className="flex items-center justify-center w-4 h-4 shrink-0"><TextT size={14} weight="regular" /></span>
              <span className="flex-1 min-w-0 truncate leading-4 ml-1">Text</span>
            </NameRow>
          </>
        }
        tracks={
          <>
            <TrackRow selected>
              <ShotClip start={clip.start} len={clip.len} active keys={keys} onBodyDown={down("move")} onEdgeDown={(m) => down(m)} onKeyDown={keyDown} />
              {!touched && (
                <div
                  className="tour-pop absolute pointer-events-none"
                  style={{ left: TL_PAD + (clip.start + clip.len / 2) * TL_PPS + 6, top: 16, "--d": "400ms" }}
                >
                  <Cursor />
                </div>
              )}
            </TrackRow>
            <TrackRow><BgClip start={0.4} len={4.2} /></TrackRow>
            <TrackRow><TextClip start={1.2} len={2.4} label="Headline" /></TrackRow>
          </>
        }
      />
    </div>
  );
}

/* --- 5. Scrub the playhead --- */
function ArtVidRuler() {
  const ph = usePlayhead(0);
  const raf = useRef(0);
  useEffect(() => {
    const TO = 3.2;
    if (reduceMotion()) {
      ph.set(TO);
      return;
    }
    let timer;
    const t0 = performance.now() + 250;
    const step = (now) => {
      const u = clampN((now - t0) / 1000, 0, 1);
      ph.set(TO * (1 - Math.pow(1 - u, 3)));
      if (u < 1) raf.current = requestAnimationFrame(step);
    };
    timer = setTimeout(() => { raf.current = requestAnimationFrame(step); }, 250);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf.current);
    };
  }, []);
  const scrub = (e) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(raf.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const at = (x) => (x - rect.left - TL_LABEL_W - TL_PAD) / TL_PPS;
    ph.set(at(e.clientX));
    dragWin((ev) => ph.set(at(ev.clientX)));
  };
  return (
    <div className="h-full">
      <MiniTimeline
        onRulerDown={scrub}
        names={
          <>
            <NameRow selected>
              <Grip on />
              <span className="flex items-center justify-center w-4 h-4 shrink-0"><CaretRight size={12} weight="bold" /></span>
              <span className="flex-1 min-w-0 truncate leading-4 ml-1">Shot 1</span>
            </NameRow>
            <NameRow>
              <Grip />
              <span className="flex items-center justify-center w-4 h-4 shrink-0"><Palette size={14} weight="regular" /></span>
              <span className="flex-1 min-w-0 truncate leading-4 ml-1">Background 1</span>
            </NameRow>
          </>
        }
        tracks={
          <>
            <TrackRow selected><ShotClip start={0.2} len={3.4} active keys={[0, 2]} /></TrackRow>
            <TrackRow><BgClip start={0} len={4.8} /></TrackRow>
          </>
        }
        footer={
          <div className={`relative flex items-center gap-1 px-3 pt-2 text-[11px] font-medium ${MUTED}`}>
            <KeyCombo keys={["mod"]} /> + scroll to zoom
          </div>
        }
      >
        {ph.el}
      </MiniTimeline>
    </div>
  );
}

/* --- 6. Length, audio and collapse --- */
function ArtVidDuration() {
  const [dur, setDur] = useState(4);
  const [open, setOpen] = useState(true);
  const [audio, setAudio] = useState(false);
  const bars = Math.floor((Math.min(3, dur) * TL_PPS) / 3);
  return (
    <div onClick={stop} className="h-full">
      <MiniTimeline
        dur={dur}
        collapsed={!open}
        toolbarClass="justify-end"
        toolbar={
          <>
            <span className={`tabular-nums whitespace-pre text-[11px] ${MUTED}`}>{`0.0 s  /  ${dur.toFixed(1)} s`}</span>
            <div className="w-[72px] ml-1">
              <OffsetField unit="s" value={Math.round(dur * 10) / 10} min={1} max={TL_AXIS} className="h-8" onChange={(d) => setDur(clampN(d, 1, TL_AXIS))} />
            </div>
            <VidBtn label="Add audio" onClick={() => setAudio(true)} disabled={audio}>
              <MusicNoteSimple size={16} weight="bold" />
            </VidBtn>
            <VidBtn label={open ? "Collapse timeline" : "Expand timeline"} onClick={() => setOpen((v) => !v)}>
              <CaretDown
                size={16}
                weight="bold"
                style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)" }}
                className="transition-transform duration-200"
              />
            </VidBtn>
          </>
        }
        names={
          <>
            <NameRow selected>
              <Grip on />
              <span className="flex items-center justify-center w-4 h-4 shrink-0"><CaretRight size={12} weight="bold" /></span>
              <span className="flex-1 min-w-0 truncate leading-4 ml-1">Shot 1</span>
            </NameRow>
            {audio && (
              <NameRow className="tour-rise">
                <Grip />
                <span className="flex items-center justify-center w-4 h-4 shrink-0"><MusicNoteSimple size={14} weight="regular" /></span>
                <span className="flex-1 min-w-0 truncate leading-4 ml-1">Audio</span>
              </NameRow>
            )}
          </>
        }
        tracks={
          <>
            <TrackRow selected>
              <ShotClip start={0} len={Math.min(3, dur)} active keys={[0]} />
            </TrackRow>
            {audio && (
              <TrackRow className="tour-rise">
                <div
                  className="absolute top-0 h-[30px] rounded-[8px] overflow-hidden bg-[#FF47BC]/20 flex items-center gap-px px-1"
                  style={{ left: TL_PAD, width: Math.min(3, dur) * TL_PPS }}
                >
                  {Array.from({ length: bars }, (_, i) => (
                    <i key={i} className="w-0.5 shrink-0 rounded-full bg-[#FF47BC]/60" style={{ height: 4 + ((i * 7) % 5) * 4 }} />
                  ))}
                </div>
              </TrackRow>
            )}
          </>
        }
      />
    </div>
  );
}

const ART = {
  welcome: ArtWelcome, left: ArtLeft, canvas: ArtCanvas, right: ArtRight, modes: ArtModes, size: ArtSize, export: ArtExport, done: ArtDone,
  vidActions: ArtVidActions, vidPlay: ArtVidPlay, vidNames: ArtVidNames, vidTracks: ArtVidTracks,
  vidRuler: ArtVidRuler, vidDuration: ArtVidDuration,
  vidExport: () => <ArtExport video />,
};

const VIDEO_STEPS = [
  {
    target: "timeline-actions",
    placement: "top",
    art: "vidActions",
    accent: "#C4B5FD",
    label: "Build shots",
    title: "Build your shots",
    body: "Add a shot, drop keyframes on the camera moves you make, add backgrounds, and loop playback.",
    keys: [["S"], ["K"], ["⇧", "L"]],
  },
  {
    target: "timeline-playback",
    placement: "top",
    art: "vidPlay",
    accent: "#86D68C",
    label: "Playback",
    title: "Play it back",
    body: "Play, pause, or jump between shots and keyframes. Select a shot to loop just that part.",
    keys: [["Space"]],
  },
  {
    target: "timeline-names",
    placement: "top",
    art: "vidNames",
    accent: "#8EC5F5",
    label: "Rows",
    title: "Shots, backgrounds and text",
    body: "Each shot, background and text layer gets its own row. Double-click to rename, drag to reorder, expand a shot for per-property tracks.",
  },
  {
    target: "timeline-tracks",
    placement: "top-center",
    art: "vidTracks",
    accent: "#FFB3E0",
    label: "Clips and keyframes",
    title: "Drag clips and keyframes",
    body: "Drag a clip to move it, pull its edges to trim, and drag diamonds to retime. Right-click for enter / exit animations and easing.",
  },
  {
    target: "timeline-ruler",
    placement: "top-center",
    art: "vidRuler",
    accent: "#C4B5FD",
    label: "Playhead",
    title: "Scrub the playhead",
    body: "Click or drag the ruler to scrub. Hold Ctrl / Cmd and scroll to zoom the timeline.",
  },
  {
    target: "timeline-duration",
    placement: "top",
    art: "vidDuration",
    accent: "#86D68C",
    label: "Duration",
    title: "Length, audio and collapse",
    body: "Set the total duration, add an audio track, or collapse the timeline to get more canvas.",
  },
  {
    target: "export",
    placement: "bottom",
    art: "vidExport",
    accent: "#8EC5F5",
    label: "Export",
    title: "Export your video",
    body: "Pick MP4, WebM or another format, then choose resolution, speed and frame rate.",
    keys: [["mod", "E"]],
  },
];

const APP_STEPS = [
  {
    target: null,
    placement: "center",
    art: "welcome",
    accent: "#C4B5FD",
    label: "Welcome",
    title: "Welcome to Bezel",
    body: "Turn any screenshot into a polished mockup. This quick tour covers the essentials in about a minute.",
  },
  {
    target: "left-toolbar",
    placement: "right",
    art: "left",
    accent: "#86D68C",
    label: "Sidebar",
    title: "Devices, projects and templates",
    body: "Pick a device, reopen saved projects, or start from a ready-made template. Try the icons below.",
    keys: [["D"], ["P"], ["L"]],
  },
  {
    target: "canvas",
    placement: "center",
    art: "canvas",
    accent: "#8EC5F5",
    label: "Canvas",
    title: "Your canvas",
    body: "Drag to rotate, scroll to zoom, or drop an image anywhere to upload it.",
  },
  {
    target: "right-toolbar",
    placement: "left",
    art: "right",
    accent: "#FFB3E0",
    label: "Properties",
    title: "Fine-tune everything",
    body: "Upload your screenshot, then adjust the device finish, camera, scene, text and effects from here.",
  },
  {
    target: "mode-tabs",
    placement: "left",
    art: "modes",
    accent: "#C4B5FD",
    label: "Modes",
    title: "Mockup, Frame or Animation",
    body: "Mockup is a 3D device. Frame is a flat screenshot with radius, stroke and effects. Animation applies ready-made motion.",
    keys: [["M"], ["F"], ["A"]],
  },
  {
    target: "canvas-size",
    placement: "top",
    art: "size",
    accent: "#86D68C",
    label: "Canvas size",
    title: "Set the canvas size",
    body: "Choose Fill or a ratio like 9:16 or 1:1 to match where the image will be used.",
  },
  {
    target: "export",
    placement: "bottom",
    art: "export",
    accent: "#8EC5F5",
    label: "Export",
    title: "Export when you're done",
    body: "Download at Standard, 4K or 8K, as an image or a video.",
    keys: [["mod", "E"]],
  },
  {
    target: null,
    placement: "center",
    art: "done",
    accent: "#FFB3E0",
    label: "Finish",
    title: "You're all set",
    body: "Press ? any time for keyboard shortcuts. Want to animate your mockup too?",
    cta: "video",
  },
];

const clamp = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max));

function place(r, placement, cw, ch) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = r.left + r.width;
  const bottom = r.top + r.height;
  let x, y;
  switch (placement) {
    case "right":
      x = right + GAP;
      y = r.top + (r.height - ch) / 2;
      break;
    case "left":
      x = r.left - cw - GAP;
      y = r.top + (r.height - ch) / 2;
      break;
    case "top": // aligned to the target's right edge, sits above it
      x = right - cw;
      y = r.top - ch - GAP;
      break;
    case "bottom":
      x = right - cw;
      y = bottom + GAP;
      break;
    case "top-center":
      x = r.left + (r.width - cw) / 2;
      y = r.top - ch - GAP;
      break;
    default: // center
      x = r.left + (r.width - cw) / 2;
      y = r.top + (r.height - ch) / 2;
  }
  return { x: clamp(x, MARGIN, vw - cw - MARGIN), y: clamp(y, MARGIN, vh - ch - MARGIN) };
}

export default function AppTour({ onClose, kind = "app", onSwitchTour }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [size, setSize] = useState({ w: CARD_W, h: 360 });
  const [seen, setSeen] = useState(() => new Set([0]));
  const [listOpen, setListOpen] = useState(false);
  const [replay, setReplay] = useState(0);
  const dirRef = useRef(1);
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  // Keep steps with no target, plus steps whose target is actually on screen
  const steps = useMemo(
    () =>
      (kind === "video" ? VIDEO_STEPS : APP_STEPS).filter(
        (s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`)
      ),
    [kind]
  );
  const step = steps[index];
  const last = index === steps.length - 1;
  const Art = step?.art ? ART[step.art] : null;

  const go = (i) => {
    const n = Math.min(Math.max(0, i), steps.length - 1);
    dirRef.current = n >= index ? 1 : -1;
    setIndex(n);
    setReplay(0);
    setSeen((s) => new Set(s).add(n));
  };

  useEffect(() => {
    if (!steps.length) onClose();
  }, []);

  const measure = useCallback(() => {
    if (!step) return;
    if (!step.target) {
      setRect({ left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0, ring: false });
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2, ring: true });
  }, [step?.target]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Measure the card before paint so it never flashes in the wrong spot.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
  }, [index, rect, listOpen]);

  // Focus "Next" so Enter/Space advance, and hand focus back on exit.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index, rect !== null]);

  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (last) onClose();
        else go(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, last, onClose, steps.length]);

  if (!rect || !step) return null;
  const pos = place(rect, step.placement, size.w, size.h);
  const ghostBtn =
    "h-8 px-3 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]";

  return (
    <div className="tour-root fixed inset-0 z-[10001]" role="dialog" aria-modal="true" aria-label="App tour">
      <style>{TOUR_CSS}</style>

      {/* Spotlight: slides and resizes between steps. The giant shadow dims everything else and the root swallows clicks. */}
      <div
        className="absolute left-0 top-0 rounded-xl pointer-events-none"
        style={{
          width: rect.width,
          height: rect.height,
          transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
          boxShadow: rect.ring ? "0 0 0 2px #FF47BC, 0 0 0 9999px rgba(0,0,0,0.5)" : "0 0 0 9999px rgba(0,0,0,0.5)",
          transition: `transform 320ms ${EASE}, width 320ms ${EASE}, height 320ms ${EASE}`,
          animation: "tour-fade 200ms ease-out both",
        }}
      />

      {/* Card: one element that glides between targets, only its content re-animates */}
      <div
        ref={cardRef}
        className="absolute left-0 top-0"
        style={{
          width: CARD_W,
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          transition: `transform 320ms ${EASE}`,
        }}
      >
        <div className="tour-card flex flex-col overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <div key={index} className="tour-step flex flex-col gap-3 p-4 pb-3" style={{ "--tour-dx": dirRef.current }}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-[14px] leading-5 font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
                {step.title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Skip tour"
                className="group -mt-1 -mr-1 flex items-center justify-center w-7 h-7 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
              >
                <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
              </button>
            </div>

            <p className="text-[13px] leading-[18px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">
              {step.body}
            </p>

            {Art && (
              <div
                title="Click to replay"
                onClick={() => setReplay((n) => n + 1)}
                className="relative h-[144px] rounded-xl overflow-hidden bg-[#EFEFF0] dark:bg-[#0D0B0C] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10"
              >
                <div key={replay} className="absolute inset-0">
                  <Art />
                </div>
              </div>
            )}

            {step.keys && (
              <div className="flex items-center gap-2">
                {step.keys.map((combo, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {combo.map((k) => (
                      <KeyCap key={k}>{k}</KeyCap>
                    ))}
                  </span>
                ))}
              </div>
            )}

            {step.cta === "video" && onSwitchTour && (
              <button
                type="button"
                onClick={onSwitchTour}
                className="h-8 flex items-center justify-center gap-2 rounded-2xl bg-[#1A1A1A] dark:bg-[#292929] hover:bg-[#2A2A2A] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-white transition-[background-color,transform] duration-150 active:scale-[0.97]"
              >
                <Play size={14} weight="fill" /> Take the video tour
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="h-1 rounded-full overflow-hidden bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10">
              <div
                className="h-full w-full origin-left rounded-full bg-[#FF47BC]"
                style={{ transform: `scaleX(${(index + 1) / steps.length})`, transition: `transform 300ms ${EASE}` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setListOpen((v) => !v)}
                aria-expanded={listOpen}
                aria-label="Show all steps"
                className="flex items-center gap-1 h-8 -ml-2 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] tabular-nums text-[#737373] dark:text-[#ABABAB] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {index + 1} of {steps.length}
                <CaretDown
                  size={14}
                  weight="regular"
                  style={{ transform: listOpen ? "rotate(180deg)" : "none", transition: `transform 200ms ${EASE}` }}
                />
              </button>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => (index === 0 ? onClose() : go(index - 1))} className={ghostBtn}>
                  {index === 0 ? "Skip" : "Back"}
                </button>
                <button
                  ref={nextRef}
                  type="button"
                  onClick={() => (last ? onClose() : go(index + 1))}
                  className="h-8 px-3 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] hover:bg-[#F230AE] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]"
                  style={{ boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" }}
                >
                  {last ? "Start creating" : "Continue"}
                </button>
              </div>
            </div>

            {/* Checklist: jump to any step */}
            <div
              aria-hidden={!listOpen}
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                listOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-0.5 pt-1 border-t border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
                  {steps.map((s, i) => {
                    const current = i === index;
                    const done = seen.has(i) && !current;
                    return (
                      <button
                        key={i}
                        type="button"
                        tabIndex={listOpen ? 0 : -1}
                        onClick={() => go(i)}
                        className={`flex items-center gap-2 h-8 pl-2 pr-2 rounded-lg text-left text-[13px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
                          current
                            ? "bg-[#FF47BC]/10 text-[#3A3A3A] dark:text-[#FAF9FA]"
                            : "text-[#737373] dark:text-[#ABABAB] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
                        }`}
                      >
                        <span
                          className={`flex items-center justify-center w-4 h-4 shrink-0 rounded-full transition-[background-color,border-color] duration-200 ${
                            done
                              ? "bg-[#FF47BC]"
                              : current
                              ? "border-2 border-[#FF47BC]"
                              : "border border-dashed border-[#737373]/60 dark:border-[#ABABAB]/60"
                          }`}
                        >
                          {done && <Check size={10} weight="bold" className="tour-pop text-white" />}
                        </span>
                        <span className={`truncate ${done ? "line-through opacity-60" : ""}`}>{s.label ?? s.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}