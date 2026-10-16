import { useRef, useState, useEffect, useLayoutEffect } from "react";
import Tooltip from "../Tooltip.jsx";

// Closes a popover / menu on outside click or Escape. `selector` = elements that count as "inside".
export function useDismissable(active, selector, onClose) {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!active) return;
    const down = (e) => {
      if (!e.target.closest?.(selector)) cb.current();
    };
    const key = (e) => e.key === "Escape" && cb.current();
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [active, selector]);
}

export function VidBtn({ label, shortcut, tone = "default", children, ...rest }) {
  const tones = {
    default: "text-[#8C8C8C] dark:text-[#9A9A9A] enabled:hover:text-[#3A3A3A] dark:enabled:hover:text-[#FAF9FA]",
    strong: "text-[#8C8C8C] dark:text-[#9A9A9A]",
    pink: "text-[#FF47BC]",
    danger: "text-[#F04438]",
  };
  return (
    <Tooltip label={label} shortcut={shortcut} placement="vertical">
      <button
        type="button"
        aria-label={label}
        {...rest}
        className={`flex items-center justify-center w-8 h-8 shrink-0 rounded-lg enabled:hover:bg-black/5 dark:enabled:hover:bg-white/5 transition-[background-color,color,transform] duration-150 enabled:active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed ${tones[tone]}`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export const CTX_ITEM =
  "flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100";
export const CTX_DANGER =
  "flex items-center justify-between w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438] transition-colors duration-100";
export const CTX_DIVIDER = <div className="my-0.5 h-px w-full shrink-0 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />;

// Measures itself, then keeps its bottom edge at least 8px above the bottom of the window.
export function CtxMenu({ left, top, width = 190, children, ...rest }) {
  const ref = useRef(null);
  const [y, setY] = useState(null);
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    setY(Math.max(8, Math.min(top, window.innerHeight - h - 8)));
  }, [top, left]);
  return (
    <div
      ref={ref}
      role="menu"
      {...rest}
      style={{ position: "fixed", left, top: y ?? top, width, visibility: y === null ? "hidden" : "visible" }}
      className="pop-enter p-2 gap-1 flex flex-col bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
    >
      {children}
    </div>
  );
}

export function AudioWave({ a }) {
  const n = a.peaks?.length;
  if (!n || !a.dur) return null;
  const i0 = Math.floor(((a.offset ?? 0) / a.dur) * n);
  const i1 = Math.min(n, Math.max(i0 + 1, Math.ceil((((a.offset ?? 0) + a.len) / a.dur) * n)));
  const slice = a.peaks.slice(i0, i1);
  const d = slice
    .map((p, i) => {
      const h = Math.max(0.04, p / 100);
      return `M${i + 0.5} ${1 - h}V${1 + h}`;
    })
    .join("");
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none text-[#FF47BC]/70" viewBox={`0 0 ${Math.max(1, slice.length)} 2`} preserveAspectRatio="none">
      <path d={d} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
    </svg>
  );
}