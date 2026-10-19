import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { CaretLeft, X } from "@phosphor-icons/react";
import {
  vidClamp, vidEaseFn, vidEaseSpec, VID_EASE_PRESETS, VID_EASE_GROUPS, VID_EASE_PARAMS,
  VID_EASE_CUSTOM_DEFAULT, VID_PROPS,
} from "../lib/videoMath.js";
import { Scrubber, SEG_ON, SEG_OFF } from "./controls.jsx";

// Ease-in-out curve with end points, drawn on Phosphor's 256 grid so it matches the other icons.
export function EaseIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M40 216C136 216 120 40 216 40" />
      <circle cx="40" cy="216" r="4" fill="currentColor" />
      <circle cx="216" cy="40" r="4" fill="currentColor" />
    </svg>
  );
}

// Curve path + mappers for a given easing fn. Y range grows to include overshoot.
function easeGeom(fn, w, h, pad = 6) {
  const N = 48, ys = [];
  for (let i = 0; i <= N; i++) ys.push(fn(i / N));
  const lo = Math.min(0, ...ys), hi = Math.max(1, ...ys);
  const X = (x) => pad + x * (w - 2 * pad);
  const Y = (y) => h - pad - ((y - lo) / (hi - lo)) * (h - 2 * pad);
  const d = ys.map((y, i) => `${i ? "L" : "M"}${X(i / N).toFixed(1)} ${Y(y).toFixed(1)}`).join("");
  return { d, X, Y };
}

// Large looping preview: dot rides the curve, ball travels a track with the same easing
function EasePreview({ fn }) {
  const W = 252, H = 84;
  const geo = easeGeom(fn, W, H, 10);
  const dot = useRef(null);
  const ball = useRef(null);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const T = 1600, HOLD = 350, CYCLE = T + HOLD * 2;
    const loop = (now) => {
      const u = vidClamp((((now - t0) % CYCLE) - HOLD) / T, 0, 1);
      const y = fn(u);
      dot.current?.setAttribute("cx", geo.X(u));
      dot.current?.setAttribute("cy", geo.Y(y));
      ball.current?.setAttribute("cx", 28 + y * (W - 56));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fn]);
  return (
    <div className="rounded-[10px] bg-[#F0F0F0] dark:bg-[#1F1F1F] p-2">
      <svg viewBox={`0 0 ${W} 112`} className="w-full block overflow-visible">
        <line x1="10" x2={W - 10} y1={geo.Y(0)} y2={geo.Y(0)} stroke="#8C8C8C" strokeOpacity="0.35" strokeDasharray="3 3" />
        <line x1="10" x2={W - 10} y1={geo.Y(1)} y2={geo.Y(1)} stroke="#8C8C8C" strokeOpacity="0.35" strokeDasharray="3 3" />
        <path d={geo.d} fill="none" stroke="#FF47BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle ref={dot} r="4" cx={geo.X(0)} cy={geo.Y(0)} fill="#FAF9FA" stroke="#FF47BC" strokeWidth="2" />
        <line x1="28" x2={W - 28} y1="102" y2="102" stroke="#8C8C8C" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        <circle ref={ball} r="5" cx="28" cy="102" fill="#FF47BC" />
      </svg>
    </div>
  );
}

// Preset row: small static curve icon + name. The big preview at the top handles the animation.
function EaseRow({ spec, label, active, onClick, onEdit }) {
  const fn = vidEaseFn(spec);
  const S = 16;
  const geo = easeGeom(fn, S, S, 2.5);
  const ref = useRef(null);
  // bring the selected row into view when the list opens
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <div
      ref={ref}
      className={`group flex items-center w-full h-8 rounded-lg transition-colors duration-100 ${
        active
          ? "bg-[#FF47BC]/10 text-[#FF47BC]"
          : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
      }`}
    >
      <button type="button" onClick={onClick} className="flex items-center flex-1 min-w-0 h-full gap-2 pl-2 text-left">
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} fill="none" className="shrink-0 overflow-visible">
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="1.5 1.5" />
          <path d={geo.d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flex-1 min-w-0 truncate leading-4">{label}</span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`flex items-center justify-center h-6 px-2 mr-1 shrink-0 rounded-md leading-4 hover:bg-black/5 dark:hover:bg-white/10 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
            active ? "opacity-100" : "opacity-0"
          }`}
        >
          Edit
        </button>
      )}
    </div>
  );
}

// Draggable cubic-bezier editor + numeric fields
export function EaseBezierEditor({ p, onChange }) {
  const svgRef = useRef(null);
  const VW = 252, VH = 200, X0 = 16, PW = 220, Y0 = 12, PH = 176;
  const X = (x) => X0 + x * PW;
  const Y = (y) => Y0 + PH - ((y + 0.5) / 2) * PH;
  const drag = (idx) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const move = (ev) => {
      const r = svgRef.current.getBoundingClientRect();
      const k = VW / r.width;
      const x = vidClamp(((ev.clientX - r.left) * k - X0) / PW, 0, 1);
      const y = vidClamp((2 * (Y0 + PH - (ev.clientY - r.top) * k)) / PH - 0.5, -0.5, 1.5);
      const next = [...p];
      next[idx * 2] = +x.toFixed(2);
      next[idx * 2 + 1] = +y.toFixed(2);
      onChange(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const inputCls =
    "h-8 w-full px-2 rounded-[10px] bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] border border-transparent focus:border-[#FF47BC] outline-none text-[#3A3A3A] dark:text-[#FAF9FA] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-[10px] bg-[#F0F0F0] dark:bg-[#1F1F1F] p-2">
        <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full block touch-none select-none">
          <rect x={X(0)} y={Y(1)} width={PW} height={Y(0) - Y(1)} fill="none" stroke="#8C8C8C" strokeOpacity="0.35" strokeDasharray="3 3" />
          <line x1={X(0)} y1={Y(0)} x2={X(p[0])} y2={Y(p[1])} stroke="#FF47BC" strokeOpacity="0.5" />
          <line x1={X(1)} y1={Y(1)} x2={X(p[2])} y2={Y(p[3])} stroke="#FF47BC" strokeOpacity="0.5" />
          <path
            d={`M${X(0)} ${Y(0)} C${X(p[0])} ${Y(p[1])}, ${X(p[2])} ${Y(p[3])}, ${X(1)} ${Y(1)}`}
            fill="none" stroke="#FF47BC" strokeWidth="2" strokeLinecap="round"
          />
          {[0, 1].map((i) => (
            <circle
              key={i}
              cx={X(p[i * 2])}
              cy={Y(p[i * 2 + 1])}
              r="6"
              fill="#FAF9FA"
              stroke="#FF47BC"
              strokeWidth="2"
              onPointerDown={drag(i)}
              className="cursor-grab active:cursor-grabbing"
            />
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {["x1", "y1", "x2", "y2"].map((l, i) => (
          <label key={l} className="flex flex-col gap-1 min-w-0">
            <span className="text-[#8C8C8C] dark:text-[#9A9A9A]">{l}</span>
            <input
              type="number"
              step="0.01"
              value={p[i]}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) return;
                const next = [...p];
                next[i] = i % 2 ? vidClamp(n, -0.5, 1.5) : vidClamp(n, 0, 1);
                onChange(next);
              }}
              className={inputCls}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

// Easing popover: opens to the left of the right toolbar, bottom-aligned to the clicked button
export function EasePopover({ v, menu, onClose }) {
const shot = v.shots.find((x) => x.id === menu.sid);
const key = shot?.keys.find((k) => k.id === menu.kid);
const prop = menu.prop ?? null; // null = opened from the shot track
const current = prop ? key?.propEase?.[prop] ?? key?.ease : key?.ease;
const spec = vidEaseSpec(current ?? shot?.ease ?? "smooth");
  const [tab, setTab] = useState(spec.id === "custom" ? "custom" : "presets");
  const [editing, setEditing] = useState(false); // true while the edit sub-view is open
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const scrollRef = useRef(null);

  // jump back to the top whenever the sub-view opens or closes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [editing]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const t = v.toolbarRef?.current?.getBoundingClientRect();
      setPos({
        right: t ? window.innerWidth - t.left + 4 : 8,
        bottom: t ? window.innerHeight - t.bottom : 8,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [menu.bottom]);

  if (!shot || !key) return null;

  const set = (next) =>
  prop
    ? // property row: only this property's segment
      v.onKey(menu.sid, menu.kid, { propEase: { ...(key.propEase ?? {}), [prop]: next } })
    : // shot track: every property in this segment, drop per-property overrides
      v.onKey(menu.sid, menu.kid, { ease: next, propEase: undefined });
  const fn = vidEaseFn(spec);
  const base = VID_EASE_PRESETS.find((x) => x.id === spec.id);
  const params = VID_EASE_PARAMS[spec.kind] ?? [];
  const dirty =
    !!base &&
    (params.length > 0 || spec.kind === "bezier") &&
    JSON.stringify(base.p) !== JSON.stringify(spec.p);
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${on ? SEG_ON : SEG_OFF}`;
  const label = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";

  return (
<div
  ref={ref}
  data-vid-ease-menu
  style={{ position: "fixed", right: pos?.right ?? 0, bottom: pos?.bottom ?? 0, visibility: pos ? "visible" : "hidden", maxHeight: "min(82vh, 820px)" }}
  className="panel-enter w-[300px] flex flex-col overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
>
<div className={`flex items-center h-12 pr-2 shrink-0 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${editing ? "pl-2 gap-1" : "pl-4"}`}>
  {editing && (
    <button
      type="button"
      onClick={() => {
        setTab("presets");
        setEditing(false);
      }}
      aria-label="Back"
      className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      <CaretLeft size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
    </button>
  )}
  <span className="flex-1 min-w-0 truncate text-left">
    <span className="section-title text-[#8C8C8C] dark:text-[#9A9A9A]">
      {prop ? VID_PROPS.find(([k]) => k === prop)?.[1] : "Easing"} /{" "}
    </span>
    <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">
      {spec.id === "custom" ? "Custom" : base?.label}
    </span>
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

<div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#E3E3E3_transparent] dark:[scrollbar-color:#333333_transparent]">
<div className="flex flex-col gap-3 px-4 py-4">
  <EasePreview fn={fn} />

  {editing ? (
    /* Edit sub-view: curve editor for bezier presets, sliders for overshoot presets */
    <div className="fx-enter flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={label}>{spec.kind === "bezier" ? "Curve" : "Adjust"}</span>
        {dirty && (
          <button type="button" onClick={() => set({ id: base.id, kind: base.kind, p: [...base.p] })} className="text-[#FF47BC] hover:underline">
            Reset
          </button>
        )}
      </div>
      {spec.kind === "bezier" ? (
        <EaseBezierEditor p={spec.p} onChange={(next) => set({ ...spec, p: next })} />
      ) : (
        params.map((pm, i) => (
          <Scrubber
            key={pm.label}
            compact
            label={pm.label}
            value={Math.round(spec.p[i] * pm.div)}
            min={pm.min}
            max={pm.max}
            onChange={(val) => set({ ...spec, p: spec.p.map((x, j) => (j === i ? val / pm.div : x)) })}
          />
        ))
      )}
    </div>
  ) : (
    <>
      <div className={seg}>
        <button type="button" onClick={() => setTab("presets")} className={segBtn(tab === "presets")}>Presets</button>
        <button type="button" onClick={() => setTab("custom")} className={segBtn(tab === "custom")}>Custom</button>
      </div>

      {tab === "presets" ? (
        VID_EASE_GROUPS.map((g) => (
          <div key={g} className="flex flex-col gap-1">
            <span className={label}>{g}</span>
            <div className="flex flex-col gap-0.5">
              {VID_EASE_PRESETS.filter((x) => x.group === g).map((pr) => (
                <EaseRow
                  key={pr.id}
                  spec={{ id: pr.id, kind: pr.kind, p: pr.p }}
                  label={pr.label}
                  active={spec.id === pr.id}
                  onClick={() => set({ id: pr.id, kind: pr.kind, p: [...pr.p] })}
                  onEdit={
                    g === "Basic"
                      ? undefined
                      : () => {
                          if (spec.id !== pr.id) set({ id: pr.id, kind: pr.kind, p: [...pr.p] });
                          setEditing(true);
                        }
                  }
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <EaseBezierEditor
          p={spec.kind === "bezier" ? spec.p : VID_EASE_CUSTOM_DEFAULT}
          onChange={(next) => set({ id: "custom", kind: "bezier", p: next })}
        />
      )}
    </>
  )}
</div>
      </div>
    </div>
  );
}