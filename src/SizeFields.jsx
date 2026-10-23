import React, { useEffect, useState } from "react";
import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import Tooltip from "./Tooltip.jsx";

// Hover a field and hold Alt: the cursor becomes the horizontal resizer, and dragging scrubs the value (Shift = 10x).
// Spread `props` on the field's outer element and add `cursorClass` to its className.
export function useAltScrub({ value, min = -Infinity, max = Infinity, onChange }) {
  const [altHeld, setAltHeld] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const sync = (e) => setAltHeld(e.altKey);
    const clear = () => setAltHeld(false);
    window.addEventListener("keydown", sync, true);
    window.addEventListener("keyup", sync, true);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", sync, true);
      window.removeEventListener("keyup", sync, true);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const startDrag = (e) => {
    if (e.button !== 0 || !e.altKey) return;
    e.preventDefault(); // no focus / text selection while scrubbing
    e.stopPropagation();
    const startX = e.clientX;
    const startVal = Number.isFinite(Number(value)) ? Number(value) : 0;
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `* { cursor: ew-resize !important; user-select: none !important; -webkit-user-select: none !important; }`;
    document.head.appendChild(styleEl);

    const onMove = (ev) => {
      const next = Math.round(startVal + (ev.clientX - startX) * (ev.shiftKey ? 10 : 1));
      onChange(Math.min(max, Math.max(min, next)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      styleEl.remove();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return {
    cursorClass: hovering && altHeld ? "!cursor-ew-resize [&_*]:!cursor-ew-resize" : "",
    props: {
      onPointerEnter: (e) => {
        setHovering(true);
        setAltHeld(e.altKey);
      },
      onPointerMove: (e) => {
        if (e.altKey !== altHeld) setAltHeld(e.altKey);
      },
      onPointerLeave: () => setHovering(false),
      onPointerDownCapture: startDrag,
    },
  };
}

export function OffsetField({ label, value, onChange, dimmed = false, min = -Infinity, max = Infinity, className = "h-7", unit = null, mixed = false }) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(mixed ? "-" : String(value));
  const altScrub = useAltScrub({ value, min, max, onChange });

  useEffect(() => {
    if (!focused) setText(mixed ? "-" : String(value));
  }, [value, mixed, focused]);

  const commit = () => {
    const num = Number(text);
    if (text.trim() !== "" && !Number.isNaN(num)) onChange(Math.min(max, Math.max(min, num)));
    setFocused(false);
  };

  return (
    <label {...altScrub.props} className={`flex flex-1 min-w-0 ${className} items-center gap-2 p-2 box-border cursor-text bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-lg border border-transparent focus-within:border-[#FF47BC] transition-[colors,opacity] ${dimmed ? "opacity-50 focus-within:opacity-100" : ""} ${altScrub.cursorClass}`}>
      {!unit && (
        <span className="shrink-0 text-[12px] leading-[14px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">{label}</span>
      )}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setText(mixed ? "-" : String(value));
            e.currentTarget.blur();
          }
        }}
        className="flex-1 min-w-0 bg-transparent outline-none text-[12px] leading-[14px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]"
      />
      {unit && (
        <span className="shrink-0 text-[12px] leading-[14px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB] select-none">{unit}</span>
      )}
    </label>
  );
}

export function SizeLockRow({ width, height, onWidthChange, onHeightChange, locked, onToggleLock, wMixed = false, hMixed = false, min = 1, max = 20000 }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-1 min-w-0 items-center gap-2">
        <OffsetField label="W" value={width} min={min} max={max} mixed={wMixed} onChange={onWidthChange} />
        <OffsetField label="H" value={height} min={min} max={max} mixed={hMixed} onChange={onHeightChange} />
      </div>
      <Tooltip label={locked ? "Unlock ratio" : "Lock ratio"} placement="bottom">
        <button
          type="button"
          aria-label="Lock ratio"
          aria-pressed={locked}
          onClick={onToggleLock}
          className="group flex items-center justify-center w-7 h-7 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
        >
          {locked ? (
            <LockSimple size={16} weight="regular" className="text-[#FF47BC]" />
          ) : (
            <LockSimpleOpen size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          )}
        </button>
      </Tooltip>
    </div>
  );
}