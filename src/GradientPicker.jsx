import React, { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown, ArrowsLeftRight, ArrowArcRight, Plus, Minus, X } from "@phosphor-icons/react";
import OptionRow from "./OptionRow.jsx";
import Tooltip from "./Tooltip.jsx";

const POPUP_WIDTH = 280;
const POPUP_GAP = 8;

export default function GradientPicker({
  anchorRef,
  toolbarRef,
  containerRef,
  gradientCss,
  gradientType,
  onGradientTypeChange,
  gradientStops,
  selectedStopId,
  onSelectStop,
  onStopPositionChange,
  onStopHexChange,
  onStopOpacityChange,
  onSwatchClick,
  onAddStop,
  onRemoveStop,
  onFlip,
  onReset,
  makePercentDrag,
  onClose,
}) {
  const [pos, setPos] = useState(null);
  const trackRef = useRef(null);
  const selectedStopIdRef = useRef(selectedStopId);

const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
const typeDropdownRef = useRef(null);

useEffect(() => {
  if (!typeDropdownOpen) return;
  const onDown = (e) => {
    if (!typeDropdownRef.current?.contains(e.target)) setTypeDropdownOpen(false);
  };
  window.addEventListener("pointerdown", onDown);
  return () => window.removeEventListener("pointerdown", onDown);
}, [typeDropdownOpen]);

  useLayoutEffect(() => {
    selectedStopIdRef.current = selectedStopId;
  }, [selectedStopId]);

  const getInsertPosition = () => {
    if (!gradientStops || gradientStops.length === 0) return 50;

    const sorted = [...gradientStops].sort((a, b) => a.position - b.position);
    const selected = gradientStops.find((s) => s.id === selectedStopIdRef.current);

    if (!selected) {
      console.warn("[GradientPicker] selectedStopId not found:", selectedStopIdRef.current, gradientStops.map((s) => s.id));
      return 50;
    }

    if (selected.position < 100) {
      // Selected stop position < 100%: Insert AFTER (midpoint to the next stop or 100%)
      const nextStops = sorted.filter((s) => s.position > selected.position);
      const nextPos = nextStops.length > 0 ? nextStops[0].position : 100;
      return Math.round((selected.position + nextPos) / 2);
    } else {
      // Selected stop position is 100%: Insert BEFORE (midpoint to previous stop or 0%)
      const prevStops = sorted.filter((s) => s.position < selected.position);
      const prevPos = prevStops.length > 0 ? prevStops[prevStops.length - 1].position : 0;
      return Math.round((prevPos + selected.position) / 2);
    }
  };

  const hexToRgb = (hex) => {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r, g, b) =>
  [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

const getInterpolatedColor = (position) => {
  const sorted = [...gradientStops].sort((a, b) => a.position - b.position);
  if (position <= sorted[0].position) return { hex: sorted[0].hex, opacity: sorted[0].opacity };
  const last = sorted[sorted.length - 1];
  if (position >= last.position) return { hex: last.hex, opacity: last.opacity };

  let left = sorted[0];
  let right = last;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (position >= sorted[i].position && position <= sorted[i + 1].position) {
      left = sorted[i];
      right = sorted[i + 1];
      break;
    }
  }

  const span = right.position - left.position;
  const t = span === 0 ? 0 : (position - left.position) / span;

  const [r1, g1, b1] = hexToRgb(left.hex);
  const [r2, g2, b2] = hexToRgb(right.hex);
  const hex = rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  const opacity = Math.round(left.opacity + (right.opacity - left.opacity) * t);

  return { hex, opacity };
};

  const sortedStopsForList = [...gradientStops].sort((a, b) => a.position - b.position);

const handleTrackPointerDown = (e) => {
  if (e.target.closest("[data-stop-handle]")) return;
  const rect = trackRef.current.getBoundingClientRect();
  const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
  const position = Math.round((x / rect.width) * 100);
  onAddStop(position, getInterpolatedColor(position));
};

  const handleStopDrag = (stopId) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectStop(stopId);
    const rect = trackRef.current.getBoundingClientRect();
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "pointer";
    document.body.style.userSelect = "none";

    const updateFromEvent = (ev) => {
      const x = Math.min(Math.max(ev.clientX - rect.left, 0), rect.width);
      const position = Math.round((x / rect.width) * 100);
      onStopPositionChange(stopId, position);
    };

    updateFromEvent(e);

    const onMove = (ev) => updateFromEvent(ev);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  useLayoutEffect(() => {
    const updatePos = () => {
      const toolbarRect = toolbarRef?.current?.getBoundingClientRect();
      const fallbackRect = anchorRef?.current?.getBoundingClientRect();
      const leftEdge = toolbarRect?.left ?? fallbackRect?.left;
      if (leftEdge === undefined) return;
      setPos({
        bottom: 8,
        left: Math.max(8, leftEdge - POPUP_WIDTH - POPUP_GAP),
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [anchorRef, toolbarRef]);

  if (!pos) return null;

  return createPortal(
   <div
  ref={containerRef}
  data-gradient-picker-popup
  style={{ position: "fixed", bottom: pos.bottom, left: pos.left, width: POPUP_WIDTH }}
  className="panel-enter bg-[#FCFCFC] dark:bg-[#1A1A1D] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex flex-col z-[998] overflow-hidden"
>
  <div className="flex items-center justify-between pl-4 pr-2 py-2 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shrink-0">
    <span className="text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">Gradient</span>
    <button
      type="button"
      onClick={onClose}
      className="group flex items-center justify-center w-8 h-8 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
    </button>
  </div>

  <div className="pt-4 pb-4 pl-4 pr-2 flex flex-col gap-4 max-h-[360px] overflow-y-auto custom-scroll">
        {/* Type dropdown + flip/reset */}
        <div className="flex items-center gap-2">
  <div className="relative flex-1 min-w-0" ref={typeDropdownRef}>
    <button
  type="button"
  onClick={() => setTypeDropdownOpen((v) => !v)}
  className="flex items-center justify-between w-full h-8 px-2.5 bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] rounded-[10px] text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] transition-colors"
>
  {gradientType}
  <CaretDown
    size={14}
    weight="regular"
    style={{ transform: typeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
    className="text-[#8C8C8C] dark:text-[#9A9A9A] transition-transform duration-200"
  />
</button>
    {typeDropdownOpen && (
      <div className="pop-enter absolute left-0 top-full mt-1 w-full p-2 gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] flex flex-col z-10">
        {["Linear", "Radial", "Angular", "Diamond"].map((type) => (
          <OptionRow
            key={type}
            label={type}
            selected={gradientType === type}
            onClick={() => {
              onGradientTypeChange(type);
              setTypeDropdownOpen(false);
            }}
          />
        ))}
      </div>
    )}
  </div>
  <div className="flex items-center gap-0.5 shrink-0">
    <Tooltip label="Flip gradient" placement="bottom">
      <button
        type="button"
        aria-label="Flip gradient"
        onClick={onFlip}
        className="group flex items-center justify-center w-8 h-8 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <ArrowsLeftRight size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
      </button>
    </Tooltip>
    <Tooltip label="Rotate gradient" placement="bottom">
      <button
        type="button"
        aria-label="Rotate gradient"
        onClick={onReset}
        className="group flex items-center justify-center w-8 h-8 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <ArrowArcRight size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
      </button>
    </Tooltip>
  </div>
</div>

        {/* Gradient track with stop handles */}
   <div className="pt-4 pb-1 mr-2">
  <div className="relative overflow-visible">
    <div
      ref={trackRef}
      onPointerDown={handleTrackPointerDown}
      className="w-full h-8 rounded-[10px] cursor-pointer"
      style={{ background: gradientCss }}
    />
    {gradientStops.map((stop) => {
            const isSelected = selectedStopId === stop.id;
            return (
              <button
  key={stop.id}
  data-stop-handle
  onPointerDown={handleStopDrag(stop.id)}
  className="stop-enter absolute"
  style={{
    left: `calc(${stop.position}% - 13px)`,
    top: -16,
    width: 26,
    height: 32,
    zIndex: isSelected ? 2 : 1,
  }}
>
  {/* Diamond tip wrapper — 16x6, centered under the 26px box, sits BEHIND content */}
  <div
    className="absolute"
    style={{ top: 26, left: 5, width: 16, height: 6, zIndex: 0 }}
  >
    <div
      className="absolute w-3 h-3 rounded-[1px] rotate-45"
      style={{
        left: "calc(50% - 4px - 2.5px)",
        bottom: 5,
        backgroundColor: isSelected ? "#FF47BC" : "#EDEDED",
      }}
    />
  </div>

  {/* Content box — swatch, sits IN FRONT of the diamond */}
  <div
    className="absolute flex items-center justify-center w-[26px] h-[26px] p-1 rounded-lg"
    style={{ top: 0, left: 0, backgroundColor: isSelected ? "#FF47BC" : "#EDEDED", zIndex: 1 }}
  >
    <div
      className="w-[18px] h-[18px] rounded relative overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
        backgroundSize: "6px 6px",
        backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `#${stop.hex}`, opacity: stop.opacity / 100 }}
      />
    </div>
  </div>
</button>
            );
          })}
        </div>
        </div>

        {/* Stops list */}
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA]">Stops</span>
            <Tooltip label="Add stop" placement="bottom">
              <button
                type="button"
                aria-label="Add stop"
                onClick={() => {
                  const position = getInsertPosition();
                  onAddStop(position, getInterpolatedColor(position));
                }}
                className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Plus size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
              </button>
            </Tooltip>
          </div>

        <div className="flex flex-col gap-2 w-full">
  {sortedStopsForList.map((stop) => (
    <div key={stop.id} className="flex items-center gap-1 w-full">
                {/* Position input wrapper */}
                <div className="flex items-center gap-0.5 px-2 h-8 w-[50px] bg-[#EDEDED] dark:bg-[#292929] rounded-[10px] shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(stop.position)}
                    onFocus={() => onSelectStop(stop.id)}
                    onChange={(e) => onStopPositionChange(stop.id, Number(e.target.value))}
                    className="w-[22px] bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span
                    className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] cursor-ew-resize select-none"
                    onPointerDown={makePercentDrag(stop.position, (v) => onStopPositionChange(stop.id, v))}
                  >
                    %
                  </span>
                </div>

                <div className="flex items-center gap-2 px-2 h-8 flex-1 min-w-0 bg-[#EDEDED] dark:bg-[#292929] rounded-[10px]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectStop(stop.id);
                        onSwatchClick(stop.id);
                      }}
                      data-color-picker-trigger
                      className="w-4 h-4 rounded shrink-0 relative overflow-hidden"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                        backgroundSize: "6px 6px",
                        backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                      }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: `#${stop.hex}`, opacity: stop.opacity / 100 }}
                      />
                    </button>
                    <input
                      value={stop.hex}
                      onFocus={() => onSelectStop(stop.id)}
                      onChange={(e) =>
                        onStopHexChange(stop.id, e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase())
                      }
                      className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none cursor-text"
                    />
                  </div>
                  <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={stop.opacity}
                      onFocus={() => onSelectStop(stop.id)}
                      onChange={(e) => onStopOpacityChange(stop.id, Number(e.target.value))}
                      className="w-6 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none text-right cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span
                      className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] cursor-ew-resize select-none"
                      onPointerDown={makePercentDrag(stop.opacity, (v) => onStopOpacityChange(stop.id, v))}
                    >
                      %
                    </span>
                  </div>
                </div>

                <Tooltip label="Remove stop" placement="bottom" className="shrink-0">
                  <button
                    type="button"
                    aria-label="Remove stop"
                    onClick={() => onRemoveStop(stop.id)}
                    disabled={gradientStops.length <= 1}
                    className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}