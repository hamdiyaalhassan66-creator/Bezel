import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { CaretDown, Plus, Eyedropper, X, Check } from "@phosphor-icons/react";
import Tooltip from "./Tooltip.jsx";
import OptionRow from "./OptionRow.jsx";

function hexToRgb(hex) {
  let h = (hex || "000000").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h || "000000", 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

function hsvToRgb(h, s, v) {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function hsvToHsl(h, s, v) {
  s /= 100;
  v /= 100;
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s: sl * 100, l: l * 100 };
}

function hslToHsv(h, s, l) {
  s /= 100;
  l /= 100;
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return { h, s: sv * 100, v: v * 100 };
}

function ChannelField({ value, onCommit, max = 255 }) {
  const [text, setText] = useState(String(Math.round(value)));
  const inputRef = useRef(null);
  const caretRef = useRef(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(String(Math.round(value)));
    }
  }, [value]);

  useEffect(() => {
    if (caretRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  }, [text]);

  const commit = (raw) => {
    const num = Math.min(max, Math.max(0, Number(raw)));
    if (!Number.isNaN(num)) onCommit(num);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        caretRef.current = e.target.selectionStart;
        setText(raw);
        if (raw !== "") commit(raw);
      }}
      onBlur={() => {
        focusedRef.current = false;
        setText(String(Math.round(value)));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="flex-1 min-w-0 bg-transparent text-xs leading-[14px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

const POPUP_WIDTH = 252;
const POPUP_GAP = 4;

export default function ColorPicker({ anchorRef, toolbarRef, hex, opacity, onChange, savedColors, onSaveColor, onClose }) {
  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsv(r, g, b);
  });

  const [hsl, setHsl] = useState(() => hsvToHsl(hsv.h, hsv.s, hsv.v));
  const [hexInput, setHexInput] = useState(hex);
  const [pos, setPos] = useState(null);
  const [colorFormat, setColorFormat] = useState("HEX");
    const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [dropdownOpensUp, setDropdownOpensUp] = useState(false);

  const svRef = useRef(null);
  const hueRef = useRef(null);
  const alphaRef = useRef(null);
  const formatDropdownRef = useRef(null);

  const internalHueRef = useRef(hsv.h);
  const internalHslSRef = useRef(hsl.s);
  const lastEmittedHexRef = useRef(hex);

  useEffect(() => {
    if (!formatDropdownOpen) return;
    const onDown = (e) => {
      if (!formatDropdownRef.current?.contains(e.target)) setFormatDropdownOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [formatDropdownOpen]);

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

  useEffect(() => {
    setHexInput(hex);
    if (hex === lastEmittedHexRef.current) return;

    const { r, g, b } = hexToRgb(hex);
    const newHsv = rgbToHsv(r, g, b);

    if (newHsv.s > 0 && newHsv.v > 0) {
      internalHueRef.current = newHsv.h;
    }

    const h = internalHueRef.current;
    const alignedHsv = { ...newHsv, h };
    setHsv(alignedHsv);

    const newHsl = hsvToHsl(h, alignedHsv.s, alignedHsv.v);
    if (newHsl.l > 0 && newHsl.l < 100) {
      internalHslSRef.current = newHsl.s;
    }
    setHsl({ ...newHsl, h, s: internalHslSRef.current });
  }, [hex]);

  const emitColorChange = (newHsv, newHsl = null) => {
    const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);

    setHsv(newHsv);

    const computedHsl = newHsl || hsvToHsl(newHsv.h, newHsv.s, newHsv.v);
    setHsl(computedHsl);

    lastEmittedHexRef.current = newHex;
    setHexInput(newHex);
    onChange(newHex, opacity);
  };

  const dragOn = (ref, onMove) => (e) => {
    onMove(e);
    const move = (ev) => onMove(ev);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Handles 2D Drag dynamically depending on current format mode (HSL vs HSB/HEX/RGB)
  const handleCanvasDrag = dragOn(svRef, (e) => {
    const rect = svRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);

    if (colorFormat === "HSL") {
      const s = (x / rect.width) * 100;
      const l = 100 - (y / rect.height) * 100;
      internalHslSRef.current = s;

      const nextHsl = { h: internalHueRef.current, s, l };
      const nextHsv = hslToHsv(nextHsl.h, nextHsl.s, nextHsl.l);
      emitColorChange(nextHsv, nextHsl);
    } else {
      const s = (x / rect.width) * 100;
      const v = 100 - (y / rect.height) * 100;

      const nextHsv = { h: internalHueRef.current, s, v };
      emitColorChange(nextHsv);
    }
  });

  const handleHueDrag = dragOn(hueRef, (e) => {
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const h = (x / rect.width) * 360;

    internalHueRef.current = h;
    const nextHsv = { ...hsv, h };
    const nextHsl = { ...hsl, h };

    emitColorChange(nextHsv, nextHsl);
  });

  const handleAlphaDrag = dragOn(alphaRef, (e) => {
    const rect = alphaRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    onChange(hex, Math.round((x / rect.width) * 100));
  });

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);

  const updateFromRgb = (nextRgb) => {
    const nextHsv = rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b);
    if (nextHsv.s > 0 && nextHsv.v > 0) {
      internalHueRef.current = nextHsv.h;
    } else {
      nextHsv.h = internalHueRef.current;
    }
    emitColorChange(nextHsv);
  };

  const updateFromHsl = (nextHsl) => {
    internalHueRef.current = nextHsl.h;
    internalHslSRef.current = nextHsl.s;

    const computedHsv = hslToHsv(nextHsl.h, nextHsl.s, nextHsl.l);
    emitColorChange(computedHsv, nextHsl);
  };

  const updateFromHsb = (nextHsv) => {
    internalHueRef.current = nextHsv.h;
    emitColorChange(nextHsv);
  };

  const pureHueHex = rgbToHex(
    ...Object.values(hsvToRgb(internalHueRef.current, 100, 100))
  );

  // Dynamic canvas styling based on color space mode
  // Exact HSL CSS Gradient representation
const canvasStyle = colorFormat === "HSL"
  ? {
      background: `
        linear-gradient(to top, #000 0%, transparent 50%, #fff 100%),
        linear-gradient(to right, #808080 0%, #${pureHueHex} 100%)
      `,
    }
  : {
      background: `
        linear-gradient(0deg, #000 0%, rgba(0,0,0,0) 100%),
        linear-gradient(90deg, #fff 0%, rgba(255,255,255,0) 100%),
        #${pureHueHex}
      `,
    };

  // Dynamic thumb positioning
  const handleX = colorFormat === "HSL" ? hsl.s : hsv.s;
  const handleY = colorFormat === "HSL" ? 100 - hsl.l : 100 - hsv.v;

  if (!pos) return null;

  return createPortal(
      <div
  data-color-picker-popup
  style={{ position: "fixed", bottom: pos.bottom, left: pos.left, width: POPUP_WIDTH }}
  className="panel-enter bg-[#FCFCFC] dark:bg-[#1A1A1D] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex flex-col z-[999]"
>
      <div className="flex items-center justify-between pl-4 pr-2 py-2 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <span className="text-sm font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">Color picker</span>
        <button
          type="button"
          onClick={onClose}
          className="group flex items-center justify-center w-7 h-7 p-1 rounded-[8px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X size={20} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Dynamic 2D Color Space Area */}
        <div
          ref={svRef}
          onPointerDown={handleCanvasDrag}
          className="relative w-[220px] h-[160px] rounded-lg cursor-crosshair overflow-hidden"
          style={canvasStyle}
        >
          <div
            className="absolute w-3.5 h-3.5 rounded-full border-[4px] border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${handleX}%`,
              top: `${handleY}%`,
              backgroundColor: `#${hex}`,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
            }}
          />
        </div>

        {/* Sliders */}
        <div className="w-full flex flex-col gap-4">
          <div
            ref={hueRef}
            onPointerDown={handleHueDrag}
            className="relative w-full h-4 rounded cursor-pointer"
            style={{
              background:
                "linear-gradient(90deg, #F00 0%, #FF0 17%, #0F0 33%, #0FF 50%, #00F 67%, #F0F 83%, #F00 100%)",
            }}
          >
            <div
              className="absolute w-1 h-6 rounded bg-[#3A3A3A] dark:bg-[#FAF9FA] -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${(internalHueRef.current / 360) * 100}%` }}
            />
          </div>

          <div
            ref={alphaRef}
            onPointerDown={handleAlphaDrag}
            className="relative w-full h-4 rounded cursor-pointer"
            style={{
              backgroundImage: `linear-gradient(90deg, transparent 0%, #${hex} 100%), linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
              backgroundSize: "100% 100%, 6px 6px, 6px 6px, 6px 6px, 6px 6px",
              backgroundPosition: "0 0, 0 0, 0 3px, 3px -3px, -3px 0px",
            }}
          >
            <div
              className="absolute w-1 h-6 rounded bg-[#3A3A3A] dark:bg-[#FAF9FA] -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${opacity}%` }}
            />
          </div>
        </div>
      </div>

      {/* Control Bar & Channels */}
      <div className="pl-4 pr-2 py-4 flex flex-col gap-2 border-t border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <div className="flex items-center gap-2 w-full">
                    <div className="relative flex-1 min-w-0" ref={formatDropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (!formatDropdownOpen && formatDropdownRef.current) {
                  const rect = formatDropdownRef.current.getBoundingClientRect();
                  const dropdownHeight = 148 + 4; // popup height + 4px gap
                  const spaceBelow = window.innerHeight - rect.bottom;
                  setDropdownOpensUp(spaceBelow < dropdownHeight);
                }
                setFormatDropdownOpen((v) => !v);
              }}
              className="flex items-center justify-between gap-2 px-2 py-2 bg-[#F1F1F1] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] rounded-[10px] w-full h-8 transition-colors duration-150"
            >
              <span className="text-xs font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">{colorFormat}</span>
              <CaretDown
                size={14}
                weight="regular"
                style={{ transform: formatDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-[transform,color] duration-200"
              />
            </button>
            {formatDropdownOpen && (
              <div
                className={`${dropdownOpensUp ? "pop-enter-up" : "pop-enter"} absolute left-0 w-[120px] p-2 gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] flex flex-col z-10 ${
  dropdownOpensUp ? "bottom-full mb-1" : "top-full mt-1"
}`}
              >
                {["HEX", "RGB", "HSL", "HSB"].map((fmt) => (
                  <OptionRow
                    key={fmt}
                    label={fmt}
                    selected={colorFormat === fmt}
                    onClick={() => {
                      setColorFormat(fmt);
                      setFormatDropdownOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <Tooltip label="Pick color from screen" placement="bottom" className="shrink-0">
          <button
            type="button"
            aria-label="Pick color from screen"
            onClick={async () => {
              if (!window.EyeDropper) {
                alert("Eyedropper isn't supported in this browser (Chrome/Edge only).");
                return;
              }
              try {
                const result = await new window.EyeDropper().open();
                const sampledHex = result.sRGBHex.replace("#", "").toUpperCase();
                onChange(sampledHex, opacity);
              } catch {
                // user cancelled
              }
            }}
            className="group flex items-center justify-center w-7 h-7 p-1 rounded-[8px] shrink-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Eyedropper size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
          </Tooltip>
        </div>

                <div className="flex items-center gap-2 px-2 py-2 h-8 bg-[#EDEDED] dark:bg-[#292929] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-[10px] w-[220px] border border-transparent focus-within:border-[#FF47BC] transition-colors">
          {colorFormat === "HEX" && (
                       <input
              value={hexInput}
              onChange={(e) => {
                const filtered = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
                setHexInput(filtered);
                if (filtered.length === 6) onChange(filtered, opacity);
              }}
              onBlur={() => {
                if (hexInput.length !== 6) setHexInput(hex);
              }}
              className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none"
            />
          )}

          {colorFormat === "RGB" && (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <ChannelField value={rgb.r} max={255} onCommit={(r) => updateFromRgb({ ...rgb, r })} />
              <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
              <ChannelField value={rgb.g} max={255} onCommit={(g) => updateFromRgb({ ...rgb, g })} />
              <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
              <ChannelField value={rgb.b} max={255} onCommit={(b) => updateFromRgb({ ...rgb, b })} />
            </div>
          )}

          {colorFormat === "HSL" && (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <ChannelField value={hsl.h} max={360} onCommit={(h) => updateFromHsl({ ...hsl, h })} />
              <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
              <ChannelField value={hsl.s} max={100} onCommit={(s) => updateFromHsl({ ...hsl, s })} />
              <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
              <ChannelField value={hsl.l} max={100} onCommit={(l) => updateFromHsl({ ...hsl, l })} />
            </div>
          )}

          {colorFormat === "HSB" && (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <ChannelField value={hsv.h} max={360} onCommit={(h) => updateFromHsb({ ...hsv, h })} />
              <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
              <ChannelField value={hsv.s} max={100} onCommit={(s) => updateFromHsb({ ...hsv, s })} />
              <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
              <ChannelField value={hsv.v} max={100} onCommit={(v) => updateFromHsb({ ...hsv, v })} />
            </div>
          )}

          <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
                    <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => {
                const num = Math.min(100, Math.max(0, Number(e.target.value)));
                if (!Number.isNaN(num)) onChange(hex, num);
              }}
              className="w-6 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] cursor-ew-resize">%</span>
          </div>
        </div>
      </div>

      <div className="pt-2 pb-4 flex flex-col gap-3 border-t border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <div className="flex items-center justify-between pl-4 pr-2 opacity-80">
          <span className="text-sm font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">Saved colors:</span>
          <Tooltip label="Save color" placement="bottom">
            <button
              type="button"
              aria-label="Save color"
              onClick={() => onSaveColor(hex)}
              className="group flex items-center justify-center w-7 h-7 p-1 rounded-[8px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Plus size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
            </button>
          </Tooltip>
        </div>
        <div className="grid grid-cols-7 justify-items-center gap-x-2 gap-y-2 px-4">
          {savedColors.map((c, i) => (
            <button
              key={`${c}-${i}`}
              onClick={() => onChange(c, opacity)}
              className="w-6 h-6 rounded-[8px] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95"
              style={{ backgroundColor: `#${c}` }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}