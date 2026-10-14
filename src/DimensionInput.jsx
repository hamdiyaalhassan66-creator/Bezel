import React, { useEffect, useRef, useState } from "react";
import { makeScrubDrag } from "./scrub.js";
import { useAltScrub } from "./SizeFields.jsx";

export default function DimensionInput({ label, value, onChange, className = "w-full", min = 1, max = 99999, mixed = false, live = false }) {
  const [text, setText] = useState(String(Math.round(value)));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const maxDigits = Number.isFinite(max) ? String(max).length : null; // null = no digit cap
  const showMixed = mixed && !focused;
  const altScrub = useAltScrub({ value: Math.round(value), min, max, onChange });

  useEffect(() => {
    if (!focused) setText(String(Math.round(value)));
  }, [value, focused]);

  return (
    <div {...altScrub.props} className={`flex items-center gap-2 px-2 py-1.5 bg-[#EDEDED] dark:bg-[#292929] rounded-lg ${className} ${altScrub.cursorClass}`}>
      <span
        onPointerDown={(e) => {
          inputRef.current?.blur(); // so the field re-syncs to the scrubbed value
          makeScrubDrag({ value: Math.round(value), onChange, min, max, inputRef })(e);
        }}
        style={{ cursor: "ew-resize" }}
        className="self-stretch flex items-center -ml-2 -my-1.5 pl-2 pr-1 py-1.5 text-[13px] font-medium text-[#8C8C8C] dark:text-[#9A9A9A] shrink-0 select-none touch-none"
      >
        {label}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={showMixed ? "Mixed" : text}
        onFocus={() => {
          setFocused(true);
          if (mixed) setText("");
        }}
        onBlur={() => {
          setFocused(false);
          const n = Number(text);
          if (text !== "" && n >= min && (mixed || n !== Math.round(value))) onChange(Math.min(max, n));
          // an empty or out-of-range entry falls through, and the effect above restores the current value
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, "");
          const next = maxDigits ? digits.slice(0, maxDigits) : digits;
          setText(next);
          if (live && next !== "" && Number(next) >= min) onChange(Math.min(max, Number(next)));
        }}
        className={`w-0 flex-1 min-w-0 bg-transparent text-[13px] font-medium outline-none ${
          showMixed ? "text-[#8C8C8C] dark:text-[#9A9A9A]" : "text-[#3A3A3A] dark:text-[#FAF9FA]"
        }`}
      />
    </div>
  );
}