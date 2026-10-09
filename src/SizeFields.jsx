import React, { useEffect, useState } from "react";
import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import Tooltip from "./Tooltip.jsx";

export function OffsetField({ label, value, onChange, dimmed = false, min = -Infinity, max = Infinity, className = "h-7", unit = null, mixed = false }) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(mixed ? "-" : String(value));

  useEffect(() => {
    if (!focused) setText(mixed ? "-" : String(value));
  }, [value, mixed, focused]);

  const commit = () => {
    const num = Number(text);
    if (text.trim() !== "" && !Number.isNaN(num)) onChange(Math.min(max, Math.max(min, num)));
    setFocused(false);
  };

  return (
    <label className={`flex flex-1 min-w-0 ${className} items-center gap-2 p-2 box-border cursor-text bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-lg border border-transparent focus-within:border-[#FF47BC] transition-[colors,opacity] ${dimmed ? "opacity-50 focus-within:opacity-100" : ""}`}>
      {!unit && (
        <span className="shrink-0 text-[12px] leading-[14px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">{label}</span>
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
        <span className="shrink-0 text-[12px] leading-[14px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] select-none">{unit}</span>
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
            <LockSimpleOpen size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          )}
        </button>
      </Tooltip>
    </div>
  );
}