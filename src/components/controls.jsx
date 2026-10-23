import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MagnifyingGlass, CaretDown, CaretRight, Check } from "@phosphor-icons/react";
import Tooltip from "../Tooltip.jsx";
import OptionRow from "../OptionRow.jsx";
import DimensionInput from "../DimensionInput.jsx";
import { DROPDOWN_TRIGGER, DROPDOWN_CARET } from "../Dropdown.jsx";

export const SEG_ON = "bg-white dark:bg-[#1F1F1F] shadow-[0_4px_2px_rgba(0,0,0,0.03)] text-[#FF47BC]";
export const SEG_OFF = "text-[#8C8C8C] dark:text-[#9A9A9A]";

export function SearchField({ value, onChange, placeholder }) {
  return (
    <label className="flex items-center gap-2 w-full h-[33px] p-2 box-border shrink-0 cursor-text bg-white dark:bg-[#292929] border border-[#3A3A3A]/5 dark:border-[#FAF9FA]/5 focus-within:border-[#FF47BC] dark:focus-within:border-[#FF47BC] rounded-[10px] transition-colors duration-150">
      <MagnifyingGlass size={14} weight="regular" className="shrink-0 text-[#8C8C8C] dark:text-[#707070]" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent outline-none text-[12px] leading-[15px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] placeholder:text-[#8C8C8C] dark:placeholder:text-[#707070]"
      />
    </label>
  );
}

export function Scrubber({ label, value, onChange, min = 0, max = 100, hardMax, mixed = false, compact = false, autoLabel }) {
  const cap = hardMax ?? max; // typed / wheel / arrow values clamp to this; the slider still uses max
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const [focused, setFocused] = useState(false);
  const display = mixed ? "-" : autoLabel && value === 0 ? autoLabel : String(value);
  const [inputText, setInputText] = useState(display);
  const numberInputRef = useRef(null);

  useEffect(() => {
    if (focused) return;
    setInputText(display);
  }, [value, mixed, focused, autoLabel]);

  useEffect(() => {
    const el = numberInputRef.current;
    if (!el) return;
    const onWheelNative = (e) => {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const delta = e.deltaY < 0 ? step : -step;
      const current = Number.isNaN(Number(el.value)) ? value : Number(el.value);
      const next = Math.min(cap, Math.max(min, current + delta));
      setInputText(String(next));
      onChange(next);
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [value, min, cap, onChange]);

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-") {
      setInputText(raw);
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    setInputText(raw);
    onChange(Math.min(cap, Math.max(min, num)));
  };

  const handleInputFocus = () => {
    setFocused(true);
    if (mixed || (autoLabel && value === 0)) setInputText("");
  };

  const handleInputBlur = () => {
    setFocused(false);
    if (mixed && (inputText === "" || inputText === "-")) {
      setInputText("-");
      return;
    }
    if (inputText === "" || inputText === "-" || Number.isNaN(Number(inputText))) {
      setInputText(String(Math.min(max, Math.max(min, 0))));
      onChange(Math.min(max, Math.max(min, 0)));
    } else {
      setInputText(String(value));
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      return;
    }
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const delta = e.key === "ArrowUp" ? step : -step;
    const current = Number.isNaN(Number(inputText)) ? value : Number(inputText);
    const next = Math.min(cap, Math.max(min, current + delta));
    setInputText(String(next));
    onChange(next);
  };

  return (
    <div className="group flex items-center gap-1">
      <div className={`relative flex-1 ${compact ? "h-8" : "h-9"} rounded-[10px] bg-[#EDEDED] dark:bg-[#292929] border border-transparent transition-colors overflow-hidden`}>
        <div
          className="absolute inset-y-0 left-0 bg-[#E3E3E3] dark:bg-[#333333] group-hover:bg-[#D9D9D9] dark:group-hover:bg-[#3D3D3D] rounded-[10px] transition-colors"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-black/20 dark:bg-white/25 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${pct}% - 9px)` }}
        />
        <span className="absolute inset-0 flex items-center px-2.5 text-[13px] leading-4 font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] pointer-events-none">
          {label}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <input
        ref={numberInputRef}
        type="text"
        inputMode="numeric"
        value={inputText}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        className={`w-11 ${compact ? "h-8" : "h-9"} bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus:bg-[#E3E3E3] dark:focus:bg-[#333333] rounded-[10px] shrink-0 text-center text-[13px] leading-4 font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] focus:text-[#3A3A3A] dark:focus:text-white outline-none border border-transparent focus:border-[#FF47BC] transition-colors`}
      />
    </div>
  );
}

export function ToggleRow({ label, checked, onChange, muted = false, disabled = false, heading = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`group w-full h-9 flex items-center justify-between rounded-[10px] transition-[colors,opacity] duration-200 ease-in-out ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      }`}
    >
      <span
        className={`${heading ? "section-title " : ""}text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]`}
      >
        {label}
      </span>
      <span
        className={`relative w-8 h-5 rounded-full shrink-0 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          checked
            ? "bg-[#FF47BC]"
            : `bg-[#D0D0D0] dark:bg-[#45454C] ${disabled ? "" : "group-hover:bg-[#C4C4C4] dark:group-hover:bg-[#50505A]"}`
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            checked ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export function FinishDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [popupRect, setPopupRect] = useState(null);
  const ref = useRef(null);
  const popupRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  // Fixed-position popup measured from the trigger, flips up if there isn't room below.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const listH = Math.min(popupRef.current?.offsetHeight ?? 288, 288);
      const spaceBelow = window.innerHeight - r.bottom;
      const up = spaceBelow < listH + 12 && r.top > spaceBelow;
      setPopupRect({ left: r.left, width: r.width, top: r.bottom + 4, bottom: window.innerHeight - r.top + 4, up });
    };
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

  const darkenSwatchHex = (hex, amount = 0.18) => {
    const n = parseInt(hex || "000000", 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return [r, g, b]
      .map((v) => Math.round(v * (1 - amount)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };

  const renderSwatch = (opt, size = "w-3.5 h-3.5") =>
    opt?.hex ? (
      <div
        className={`${size} rounded-full shrink-0 border border-[#3A3A3A]/10`}
        style={{
          backgroundImage: [
            `radial-gradient(circle at 32% 28%, rgba(255,255,255,${(0.95 - (opt.roughness ?? 0.1) * 0.6).toFixed(2)}) 0%, rgba(255,255,255,0) ${18 + (opt.roughness ?? 0.1) * 45}%)`,
            `radial-gradient(circle at 68% 78%, rgba(0,0,0,${(0.4 + (1 - (opt.metalness ?? 0.9)) * 0.15).toFixed(2)}) 0%, rgba(0,0,0,0) 55%)`,
            `radial-gradient(circle at 50% 50%, #${opt.hex} 40%, #${darkenSwatchHex(opt.hex)} 100%)`,
          ].join(", "),
        }}
      />
    ) : (
      <div
        className={`${size} rounded-full shrink-0 border border-[#3A3A3A]/10`}
        style={{
          backgroundImage:
            "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
          backgroundSize: "5px 5px",
          backgroundPosition: "0 0, 0 2.5px, 2.5px -2.5px, -2.5px 0px",
        }}
      />
    );

  const renderOption = (opt) => (
    <OptionRow
      key={opt.value}
      label={opt.label}
      leading={renderSwatch(opt)}
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
          {renderSwatch(selected, "w-4 h-4")}
          <span className="truncate text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">{selected?.label ?? value}</span>
        </span>
        <CaretDown size={16} weight="regular" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
      </button>

      {open && popupRect && createPortal(
        <div
          ref={popupRef}
          data-popup-dropdown
          className={`${popupRect.up ? "pop-enter-up" : "pop-enter"} fixed p-2 gap-1 [&>*]:shrink-0 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] rounded-2xl flex flex-col items-start z-[9999] max-h-72 overflow-y-auto custom-scroll`}
          style={{
            left: popupRect.left,
            width: popupRect.width,
            ...(popupRect.up ? { bottom: popupRect.bottom } : { top: popupRect.top }),
          }}
        >
          {options.map(renderOption)}
        </div>,
        document.body
      )}
    </div>
  );
}

export function GradientPresetDropdown({ value, options, onChange, dropUp = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

    const [popupRect, setPopupRect] = useState(null);

useLayoutEffect(() => {
  if (!open) return;
  const update = () => ref.current && setPopupRect(ref.current.getBoundingClientRect());
  update();
  window.addEventListener("scroll", update, true); // capture:true catches scroll on the toolbar's overflow-y-auto ancestor
  window.addEventListener("resize", update);
  return () => {
    window.removeEventListener("scroll", update, true);
    window.removeEventListener("resize", update);
  };
}, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const renderOption = (opt) => {
    const isSelected = value === opt.value;
    return (
      <button
        key={opt.value}
        type="button"
        onClick={() => {
          onChange(opt.value);
          setOpen(false);
        }}
        className={`group flex items-center justify-between w-full h-[30px] py-2 ${
          isSelected ? "pl-1.5" : "pl-1"
        } pr-2 gap-2 rounded-lg transition-colors duration-100 ease-in-out ${
          isSelected ? "bg-[#FF47BC]/10 hover:bg-[#FF47BC]/10" : "hover:bg-[#F1F1F1] dark:hover:bg-white/5"
        }`}
      >
        <div className="flex items-center gap-2">
          <Check
            size={16}
            weight="regular"
            className={`transition-colors duration-100 ${
              isSelected ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] opacity-0"
            }`}
          />
          <span
            className={`text-[12px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
              isSelected
                ? "text-[#FF47BC]"
                : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
            }`}
          >
            {opt.label}
          </span>
        </div>
        {opt.swatch && (
          <div className="w-3.5 h-3.5 rounded shrink-0" style={{ background: opt.swatch }} />
        )}
      </button>
    );
  };

  return (
<div className="relative w-full" ref={ref}>
  <button type="button" onClick={() => setOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} w-full`}>
    <span className="truncate text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
      {selected?.label ?? value}
    </span>
    <CaretDown size={16} weight="regular" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
  </button>
            {open && popupRect && (
        <div
          className={`${dropUp ? "pop-enter-up" : "pop-enter"} fixed p-2 gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shadow-[0_4px_8px_rgba(0,0,0,0.05)] rounded-2xl flex flex-col items-start z-[9999] max-h-72 overflow-y-auto custom-scroll`}
          style={{
            left: popupRect.left,
            width: popupRect.width,
            ...(dropUp
              ? { bottom: window.innerHeight - popupRect.top + 4 }
              : { top: popupRect.bottom + 4 }),
          }}
        >
          {options.map(renderOption)}
        </div>
      )}
    </div>
  );
}

export function ImagePresetDropdown({ value, options, onChange, dropUp = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  // Same fixed-position technique as ToolbarDropdown/GradientPresetDropdown
  // — escapes the toolbar's overflow-y-auto and the collapsible section's
  // overflow-hidden instead of being clipped when opening upward.
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
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
<div className="relative w-full" ref={ref}>
  <button type="button" onClick={() => setOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} w-full`}>
    <span className="truncate text-[12px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
      {selected?.label ?? "Select preset"}
    </span>
    <span className="flex items-center gap-2 shrink-0">
      {selected?.thumb && (
        <span className="w-4 h-4 rounded shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${selected.thumb})` }} />
      )}
      <CaretDown size={16} weight="regular" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
    </span>
  </button>
      {open && popupRect && (
        <div
  className={`${dropUp ? "pop-enter-up" : "pop-enter"} fixed p-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] z-[9999] max-h-72 overflow-y-auto custom-scroll`}
          style={{
            left: popupRect.left,
            width: popupRect.width,
            ...(dropUp
              ? { bottom: window.innerHeight - popupRect.top + 4 }
              : { top: popupRect.bottom + 4 }),
          }}
        >
          <div className="grid grid-cols-4 gap-2">
            {options.map((opt) => {
  const isSelected = value === opt.value;
  return (
    <Tooltip key={opt.value} label={opt.label}>
      <button
        type="button"
        onClick={() => {
          onChange(opt.value);
          setOpen(false);
        }}
        className={`relative aspect-square rounded-lg overflow-hidden border transition-colors duration-100 ease-in-out w-full ${
          isSelected ? "border-[#FF47BC]" : "border-transparent hover:border-[#3A3A3A]/10 dark:hover:border-white/15"
        }`}
      >
        {opt.thumb ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${opt.thumb})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#EDEDED] dark:bg-white/5 flex items-center justify-center">
            <span className="text-[10px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
              None
            </span>
          </div>
        )}
        {isSelected && (
          <div className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[#FF47BC]">
            <Check size={10} weight="regular" className="text-[#FAF9FA]" />
          </div>
        )}
      </button>
    </Tooltip>
  );
})}
          </div>
        </div>
      )}
    </div>
  );
}

export function GradientCanvasHandles({ gradientType, gradientAngle, gradientStops, selectedStopId, onSelectStop, onStopPositionChange }) {
  const wrapRef = useRef(null);
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    const update = () => wrapRef.current && setRect(wrapRef.current.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const getAxis = (r) => {
    const cx = r.width / 2, cy = r.height / 2;
    const rad = ((gradientAngle - 90) * Math.PI) / 180;
    const len = Math.min(r.width, r.height) * 0.4;
    return { cx, cy, dx: Math.cos(rad), dy: Math.sin(rad), len };
  };

  const getHandlePos = (r, stop) => {
    const cx = r.width / 2, cy = r.height / 2;
    if (gradientType === "Radial") {
      const radius = (stop.position / 100) * Math.min(r.width, r.height) * 0.4;
      return { x: cx + radius, y: cy };
    }
    if (gradientType === "Angular" || gradientType === "Diamond") {
      const offset = gradientType === "Diamond" ? 45 : 0;
      const deg = gradientAngle + offset + (stop.position / 100) * 360;
      const rad = (deg * Math.PI) / 180;
      const radius = Math.min(r.width, r.height) * 0.35;
      return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius };
    }
    const { dx, dy, len } = getAxis(r);
    const t = (stop.position / 100) * 2 - 1;
    return { x: cx + dx * t * len, y: cy + dy * t * len };
  };

  const handlePointerDown = (stop) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectStop(stop.id);
    const r = wrapRef.current.getBoundingClientRect();

    const updateFromEvent = (ev) => {
      const px = ev.clientX - r.left, py = ev.clientY - r.top;
      let position;
      if (gradientType === "Radial") {
        const cx = r.width / 2, cy = r.height / 2;
        const dist = Math.hypot(px - cx, py - cy);
        position = Math.round((dist / (Math.min(r.width, r.height) * 0.4)) * 100);
      } else if (gradientType === "Angular" || gradientType === "Diamond") {
        const cx = r.width / 2, cy = r.height / 2;
        const offset = gradientType === "Diamond" ? 45 : 0;
        let deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI - gradientAngle - offset;
        deg = ((deg % 360) + 360) % 360;
        position = Math.round((deg / 360) * 100);
      } else {
        const { cx, cy, dx, dy, len } = getAxis(r);
        const t = ((px - cx) * dx + (py - cy) * dy) / len;
        position = Math.round(((t + 1) / 2) * 100);
      }
      onStopPositionChange(stop.id, Math.min(100, Math.max(0, position)));
    };

    updateFromEvent(e);
    const onMove = (ev) => updateFromEvent(ev);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-none">
      {rect &&
        gradientStops.map((stop) => {
          const { x, y } = getHandlePos(rect, stop);
          const isSelected = selectedStopId === stop.id;
          return (
            <button
              key={stop.id}
              onPointerDown={handlePointerDown(stop)}
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 pointer-events-auto cursor-pointer shadow"
              style={{
                left: x,
                top: y,
                backgroundColor: `#${stop.hex}`,
                borderColor: isSelected ? "#FF47BC" : "#FFFFFF",
              }}
            />
          );
        })}
    </div>
  );
}

// Same hex + opacity field the Body / Background rows use, made reusable.
export function ColorOpacityField({ hex, opacity, onHexChange, onOpacityChange, onSwatchClick, makePercentDrag, swatchFill, labelText, active = false }) {
  const opacityRef = useRef(null);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSwatchClick}
        data-color-picker-trigger
        aria-label="Open color picker"
        className="w-8 h-8 rounded-[10px] shrink-0 relative overflow-hidden border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
            backgroundSize: "8px 8px",
            backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
          }}
        />
        <div
          className="absolute inset-0"
          style={swatchFill ? { background: swatchFill } : { backgroundColor: `#${hex || "000000"}`, opacity: opacity / 100 }}
        />
      </button>

      <div
        className={`flex flex-1 min-w-0 items-center h-8 px-2.5 gap-2 hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-[10px] border focus-within:border-[#FF47BC] transition-colors ${
          active ? "bg-[#E3E3E3] dark:bg-[#333333] border-[#FF47BC]" : "bg-[#EDEDED] dark:bg-[#292929] border-transparent"
        }`}
      >
        {labelText ? (
          <button
            type="button"
            onClick={onSwatchClick}
            className="flex-1 min-w-0 text-left text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]"
          >
            {labelText}
          </button>
        ) : (
          <input
            value={hex}
            onChange={(e) => onHexChange(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase())}
            className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none"
          />
        )}
        <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
        <div className="flex items-center gap-1 shrink-0 select-none">
          <input
            ref={opacityRef}
            type="number"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => {
              const num = Math.min(100, Math.max(0, Number(e.target.value)));
              if (!Number.isNaN(num)) onOpacityChange(num);
            }}
            className="w-6 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none text-right cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span
            className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] cursor-ew-resize"
            onPointerDown={makePercentDrag(opacity, onOpacityChange, opacityRef)}
          >
            %
          </span>
        </div>
      </div>
    </div>
  );
}

export function PopupDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [popupRect, setPopupRect] = useState(null);
  const ref = useRef(null);
  const popupRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  // Measure the trigger, then the popup, and only flip up if it doesn't fit below.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const listH = popupRef.current?.offsetHeight ?? options.length * 34 + 12;
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      const up = spaceBelow < listH + 12 && spaceAbove > spaceBelow;
      setPopupRect({ left: r.left, width: r.width, top: r.bottom + 4, bottom: window.innerHeight - r.top + 4, up });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="relative w-full" ref={ref}>
<button type="button" onClick={() => setOpen((v) => !v)} className={`${DROPDOWN_TRIGGER} w-full`}>
  <span className="flex items-center gap-2 min-w-0">
    {selected?.Icon && <selected.Icon size={16} weight="regular" className="shrink-0 text-[#8C8C8C] dark:text-[#9A9A9A]" />}
    <span className="truncate text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">{selected?.label ?? value}</span>
  </span>
  <CaretDown size={16} weight="regular" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} className={DROPDOWN_CARET} />
</button>
      {open && popupRect && createPortal(
        <div
          ref={popupRef}
          data-popup-dropdown
          className={`${popupRect.up ? "pop-enter-up" : "pop-enter"} fixed p-2 gap-1 [&>*]:shrink-0 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] flex flex-col z-[9999] max-h-72 overflow-y-auto custom-scroll`}
          style={{
            left: popupRect.left,
            width: popupRect.width,
            ...(popupRect.up ? { bottom: popupRect.bottom } : { top: popupRect.top }),
          }}
        >
          {options.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              leading={opt.Icon ? <opt.Icon size={16} weight="regular" className="shrink-0" /> : undefined}
              selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// Whole row is the click target; the plus/minus chip shows hover/active for any hover on the row.
export function AppearanceHeader({ label, onClick, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group/hdr flex items-center justify-between h-8 -my-1 cursor-pointer select-none"
    >
      <span className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">{label}</span>
      <span
        aria-hidden
        className="flex items-center justify-center w-6 h-6 rounded-lg text-[#8C8C8C] dark:text-[#9A9A9A] transition-[background-color,color,transform] duration-150 group-hover/hdr:bg-black/5 dark:group-hover/hdr:bg-white/5 group-hover/hdr:text-[#3A3A3A] dark:group-hover/hdr:text-white group-active/hdr:scale-[0.94]"
      >
        {children}
      </span>
    </div>
  );
}

// Corner order in state is [tl, tr, br, bl]; the grid displays TL TR / BL BR.
const CORNER_FIELDS = [["TL", 0], ["TR", 1], ["BL", 3], ["BR", 2]];
export function CornerRadiusFields({ values, onChange }) {
  return (
    <div className="fx-enter grid grid-cols-2 gap-2">
      {CORNER_FIELDS.map(([label, i]) => (
        <DimensionInput
          key={label}
          label={label}
          value={values[i]}
          min={0}
          max={Infinity}
          onChange={(v) => onChange(i, v)}
        />
      ))}
    </div>
  );
}

// Horizontal scroller that fades whichever edge has more content past it.
export function FadeScroller({ children, className = "", fade = 24 }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdge((p) => (p.left === left && p.right === right ? p : { left, right }));
  }, []);

  // Runs every render so adding / removing thumbnails re-checks; setEdge bails out when nothing changed.
  useLayoutEffect(measure);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const mask = `linear-gradient(to right, ${edge.left ? "transparent" : "#000"} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${edge.right ? "transparent" : "#000"} 100%)`;

  return (
    <div ref={ref} className={className} style={{ maskImage: mask, WebkitMaskImage: mask }}>
      {children}
    </div>
  );
}

// Vertical scroller that fades whichever edge has more content past it.
// Uses gradient overlays (not a mask) so fixed popups inside it aren't clipped.
export function FadeScrollerY({ children, className = "", wrapClassName = "", fade = 24 }) {
  const ref = useRef(null);
  const innerRef = useRef(null);
  const [edge, setEdge] = useState({ top: false, bottom: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdge((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
  }, []);

  useLayoutEffect(measure);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (innerRef.current) ro.observe(innerRef.current); // catches sections collapsing / lists growing
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const overlay =
    "pointer-events-none absolute inset-x-0 z-10 from-[#FAF9FA] dark:from-[#171717] to-transparent transition-opacity duration-200";

  return (
    <div className={`relative min-h-0 ${wrapClassName}`}>
      <div ref={ref} className="absolute inset-0 overflow-y-auto custom-scroll [overflow-anchor:none]">
        <div ref={innerRef} className={className}>
          {children}
        </div>
      </div>
      <div
        className={`${overlay} top-0 bg-gradient-to-b ${edge.top ? "opacity-100" : "opacity-0"}`}
        style={{ height: fade }}
      />
      <div
        className={`${overlay} bottom-0 bg-gradient-to-t ${edge.bottom ? "opacity-100" : "opacity-0"}`}
        style={{ height: fade }}
      />
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

// Section header: whole row is the click target, and the caret sits in the same hover chip as AppearanceHeader.
export function SectionHeader({ label, open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="group flex items-center gap-2 w-full select-none"
    >
      <CaretRight
        size={16}
        weight="regular"
        className={`shrink-0 text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-[color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-90" : "rotate-0"}`}
      />
      <span className="section-title text-[14px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA]">{label}</span>
    </button>
  );
}