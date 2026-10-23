import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { CaretLeft, X } from "@phosphor-icons/react";
import { vidClamp } from "../lib/videoMath.js";
import {
  BG_ANIM_NONE, BG_ANIM_GROUPS, BG_ANIMS, BG_ANIM_BY_ID, BG_ANIM_PARAMS,
  bgProgress, bgDefaultEase, bgAnimOf, paintBgSnap, drawBgAnimPreview,
} from "../lib/bgAnim.js";
import { TXT_EASE_OPTIONS } from "../lib/textAnim.js";
import { Scrubber, ToggleRow, PopupDropdown, SEG_ON, SEG_OFF } from "./controls.jsx";
import { BG_CUSTOM_IDLE, CustomAnimEditor } from "./CustomAnimEditor.jsx";

function BgAnimTile({ anim, active, onClick, onEdit, art, kind = "enter" }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const draw = (p) => drawBgAnimPreview(ref.current, anim.id, p, art);
    const flip = (u) => (kind === "exit" ? 1 - u : u);
    if (!hover) {
      draw(anim.pv ?? 0.85);
      return;
    }
    let raf;
    const t0 = performance.now();
    const T = 1100, CYCLE = T + 500;
    const loop = (now) => {
      draw(bgProgress(anim.id, flip(Math.min(1, ((now - t0) % CYCLE) / T))));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hover, anim.id, art, kind]);

  return (
    <div className="group relative flex flex-col min-w-0">
      <button
        type="button"
        onClick={onClick}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className="flex flex-col items-stretch gap-1.5 min-w-0"
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
            active ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
          }`}
        >
          {anim.label}
        </span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`absolute top-1 right-1 h-5 px-1.5 rounded-md bg-[#FAF9FA]/85 dark:bg-[#171717]/85 backdrop-blur-sm leading-4 text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#FAF9FA] dark:hover:bg-[#171717] transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
            active ? "opacity-100" : "opacity-0"
          }`}
        >
          Edit
        </button>
      )}
    </div>
  );
}

function BgAnimLive({ id, kind = "enter", opts, art }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const T = 1400, HOLD = 500, CYCLE = T + HOLD * 2;
    const loop = (now) => {
      const u = vidClamp((((now - t0) % CYCLE) - HOLD) / T, 0, 1);
      drawBgAnimPreview(ref.current, id, bgProgress(id, kind === "exit" ? 1 - u : u, opts.ease), art, opts);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, kind, opts, art]);
  return (
    <div className="rounded-[10px] overflow-hidden border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
      <canvas ref={ref} width={480} height={320} className="w-full block" />
    </div>
  );
}

// Background animation popover: opens to the left of the right toolbar, bottom-aligned to it
export function BgAnimPopover({ v, menu, onClose, onSwitch }) {
  const clip = v.bgs.find((b) => b.id === menu.bid);
  const [pos, setPos] = useState(null);
  const [editing, setEditing] = useState(false); // sub-view: adjust the current animation
  const [tab, setTab] = useState(() => (clip && bgAnimOf(clip, menu.kind ?? "enter")?.id === "custom" ? "custom" : "presets"));
  const scrollRef = useRef(null);
  useEffect(() => {
    setEditing(false);
    setTab(clip && bgAnimOf(clip, menu.kind ?? "enter")?.id === "custom" ? "custom" : "presets");
  }, [menu.kind]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [editing]);

  // Preview artwork: the previous clip's background -> this clip's background.
  const [imgTick, setImgTick] = useState(0);
  const imgCache = useRef(new Map());
  const getImg = (url) => {
    const hit = imgCache.current.get(url);
    if (hit) return hit.complete && hit.naturalWidth ? hit : null;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => setImgTick((n) => n + 1); // repaint once the image has loaded
    im.src = url;
    imgCache.current.set(url, im);
    return null;
  };
  const art = React.useMemo(() => {
    if (!clip) return null;
    const W = 240, H = 160;
    const paint = (sn) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      paintBgSnap(c.getContext("2d"), sn, W, H, getImg);
      return c;
    };
    // "from" is always the app surface colour; "to" is the selected clip's background
    const surface = {
      bgType: "solid",
      bgOpacity: 100,
      bgHex: document.documentElement.classList.contains("dark") ? "171717" : "FAF9FA",
    };
    return { from: paint(surface), to: paint(clip.snap) };
  }, [clip?.snap, menu.bid, imgTick]);

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

  if (!clip) return null;
  const kind = menu.kind ?? "enter";
  const isIn = kind === "enter";
  const cur = bgAnimOf(clip, kind);
  const anim = cur ?? { id: "none", dur: 600, delay: 0 };
  const send = (next) => v.onBgAnim(menu.bid, kind, next);
  const set = (patch) => cur && send({ ...cur, ...patch });
  const pick = (id) => send(id === "none" ? null : { id, dur: anim.dur, delay: anim.delay ?? 0 }); // keeps timing, starts from the new animation's defaults
  const params = BG_ANIM_PARAMS[anim.id] ?? [];
  const defEase = bgDefaultEase(anim.id);
  const curEase = anim.ease ?? defEase;
  const dirty =
    (anim.ease !== undefined && anim.ease !== defEase) ||
    params.some((pm) => anim[pm.key] !== undefined && anim[pm.key] !== pm.def);
  const sub = "text-[12px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]";
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${on ? SEG_ON : SEG_OFF}`;

  return (
    <div
      data-vid-bganim-menu
      style={{ position: "fixed", right: pos?.right ?? 0, bottom: pos?.bottom ?? 0, visibility: pos ? "visible" : "hidden", maxHeight: "min(82vh, 820px)" }}
      className="panel-enter w-[300px] flex flex-col overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
    >
      <div className={`flex items-center h-12 pr-2 shrink-0 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${editing ? "pl-2 gap-1" : "pl-4"}`}>
        {editing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Back"
            className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <CaretLeft size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
        )}
        <span className="flex-1 min-w-0 truncate text-left">
          <span className="section-title text-[#737373] dark:text-[#ABABAB]">{isIn ? "Enter" : "Exit"} / </span>
          <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{BG_ANIM_BY_ID[anim.id]?.label ?? "None"}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-4 py-3 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <div className={seg}>
          {[["enter", "Enter"], ["exit", "Exit"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => onSwitch(k)} className={segBtn(kind === k)}>{l}</button>
          ))}
        </div>
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${cur ? "" : "opacity-40 pointer-events-none"}`}>
          <Scrubber compact label="Duration (ms)" value={anim.dur} min={100} max={2000} hardMax={10000} onChange={(dur) => set({ dur })} />
          <Scrubber compact label="Delay (ms)" value={anim.delay ?? 0} min={0} max={2000} hardMax={10000} onChange={(delay) => set({ delay })} />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#E3E3E3_transparent] dark:[scrollbar-color:#333333_transparent]">
        <div className="flex flex-col gap-4 px-4 py-4">
          {editing ? (
            <div className="fx-enter flex flex-col gap-3">
              <BgAnimLive id={anim.id} kind={kind} opts={anim} art={art} />
              <div className="flex items-center justify-between">
                <span className={sub}>Adjust</span>
                {dirty && (
                  <button
                    type="button"
                    onClick={() => send({ id: anim.id, dur: anim.dur, delay: anim.delay ?? 0 })}
                    className="text-[#FF47BC] hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              {params.map((pm) => {
                const val = anim[pm.key] ?? pm.def;
                if (pm.type === "range")
                  return (
                    <Scrubber key={pm.key} compact label={pm.label} value={val} min={pm.min} max={pm.max} hardMax={pm.hardMax} onChange={(x) => set({ [pm.key]: x })} />
                  );
                if (pm.type === "toggle")
                  return <ToggleRow key={pm.key} muted label={pm.label} checked={val !== false} onChange={(x) => set({ [pm.key]: x })} />;
                return (
                  <div key={pm.key} className="flex flex-col gap-2">
                    <label className={sub}>{pm.label}</label>
                    <PopupDropdown value={val} options={pm.options} onChange={(x) => set({ [pm.key]: x })} />
                  </div>
                );
              })}
              <div className="flex flex-col gap-2">
                <label className={sub}>Easing</label>
                <PopupDropdown value={curEase} options={TXT_EASE_OPTIONS} onChange={(ease) => set({ ease })} />
              </div>
            </div>
          ) : (
            <>
              <div className={seg}>
                <button type="button" onClick={() => setTab("presets")} className={segBtn(tab === "presets")}>Presets</button>
                <button type="button" onClick={() => setTab("custom")} className={segBtn(tab === "custom")}>Custom</button>
              </div>

              {tab === "presets" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <BgAnimTile anim={BG_ANIM_NONE} art={art} kind={kind} active={anim.id === "none"} onClick={() => pick("none")} />
                  </div>

                  {BG_ANIM_GROUPS.map((g) => (
                    <div key={g} className="flex flex-col gap-2">
                      <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{g}</span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                        {BG_ANIMS.filter((x) => x.group === g).map((an) => (
                          <BgAnimTile
                            key={an.id}
                            anim={an}
                            art={art}
                            kind={kind}
                            active={anim.id === an.id}
                            onClick={() => pick(an.id)}
                            onEdit={() => {
                              if (anim.id !== an.id) pick(an.id); // select it first, then open its controls
                              setEditing(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <BgAnimLive id="custom" kind={kind} opts={cur?.id === "custom" ? cur : BG_CUSTOM_IDLE} art={art} />
                  <CustomAnimEditor
                    target="bg"
                    spec={cur?.id === "custom" ? cur : null}
                    onChange={(next) => send({ ...next, id: "custom", dur: anim.dur, delay: anim.delay ?? 0 })}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}