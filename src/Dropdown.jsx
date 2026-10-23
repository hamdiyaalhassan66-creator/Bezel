import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { CaretDown } from "@phosphor-icons/react";
import OptionRow from "./OptionRow.jsx";

export const DROPDOWN_TRIGGER =
  "h-8 flex flex-row items-center justify-between gap-2.5 px-2.5 py-2 box-border bg-white dark:bg-[#292929] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] border border-[#222222]/[0.06] dark:border-[#FAF9FA]/[0.06] rounded-[10px] text-left transition-colors duration-200";
export const DROPDOWN_CARET = "shrink-0 text-[#737373] transition-transform duration-200";

export default function ToolbarDropdown({ value, options, onChange, dropUp = false, merged = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const popupRef = useRef(null);
  const isGrouped = options.length > 0 && "category" in options[0];
  const flatOptions = isGrouped ? options.flatMap((g) => g.options) : options;
  const selected = flatOptions.find((o) => o.value === value);

  const [popupRect, setPopupRect] = useState(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => ref.current && setPopupRect(ref.current.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const renderOption = (opt) => (
    <OptionRow
      key={opt.value}
      label={opt.label}
      sublabel={opt.sublabel}
      selected={value === opt.value}
      onClick={() => {
        onChange(opt.value);
        setOpen(false);
      }}
    />
  );

  return (
    <div className="relative w-full" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} w-full`}>
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
            {selected?.label ?? value}
          </span>
          {selected?.sublabel && (
            <>
              <span
                aria-hidden
                className="shrink-0 text-[#737373] dark:text-[#ABABAB]"
                style={{ fontSize: 10, fontWeight: 500 }}
              >
                -
              </span>
              <span
                className="shrink-0 tabular-nums text-[#737373] dark:text-[#ABABAB]"
                style={{ fontSize: 10, fontWeight: 500 }}
              >
                {selected.sublabel}
              </span>
            </>
          )}
        </span>
        <CaretDown size={16} weight="regular" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
      </button>

      {open && popupRect && createPortal(
        <div
          ref={popupRef}
          data-popup-dropdown
          className={`${dropUp ? "pop-enter-up" : "pop-enter"} fixed p-2 gap-1 [&>*]:shrink-0 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] rounded-2xl flex flex-col items-start z-[10001] max-h-72 overflow-y-auto custom-scroll`}
          style={{
            left: popupRect.left,
            width: popupRect.width,
            ...(dropUp
              ? { bottom: window.innerHeight - popupRect.top + 4 }
              : { top: popupRect.bottom + 4 }),
          }}
        >
          {isGrouped
            ? options.map((group, i) => (
                <div key={group.category} className={`flex flex-col gap-1 w-full ${i > 0 ? "mt-1 pt-1 border-t border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10" : ""}`}>
                  <span className="block px-1 pt-1 pb-1 text-[11px] font-semibold tracking-[0.02em] uppercase text-[#737373] dark:text-[#ABABAB]">
                    {group.category}
                  </span>
                  {group.options.map(renderOption)}
                </div>
              ))
            : options.map(renderOption)}
        </div>,
        document.body
      )}
    </div>
  );
}