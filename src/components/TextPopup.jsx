import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  CaretLeft, CaretRight, X, UploadSimple, Rows, Columns, LockSimple, LockSimpleOpen,
  ArrowsHorizontal, ArrowsVertical, CornersOut,
} from "@phosphor-icons/react";
import Tooltip from "../Tooltip.jsx";
import KeyCombo from "../KeyCombo.jsx";
import { ALT } from "../ShortcutsModal.jsx";
import { OffsetField } from "../SizeFields.jsx";
import { DROPDOWN_TRIGGER } from "../Dropdown.jsx";
import { SocialField } from "./SocialFields.jsx";
import { ColorOpacityField, ToggleRow, PopupDropdown, Scrubber, SEG_ON, SEG_OFF } from "./controls.jsx";
import { ALIGN_ACTIONS } from "../constants/canvasControls.js";
import {
  TEXT_FONTS, TEXT_WEIGHTS, TEXT_CASES, TEXT_ALIGNS, TEXT_DECORATIONS, TEXT_WRAPS, decoSwitchPatch,
} from "../lib/textUtils.js";

function TextAdvanced({ value, set, onBack, onClose, onSwatchClick, makePercentDrag, onOpenDecoration }) {
  const sectionLabel = "section-title text-[#8C8C8C] dark:text-[#9A9A9A]";
  const smallLabel = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      on ? SEG_ON : SEG_OFF
    }`;
  const headBtn = "group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors";
  const headIcon = "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors";

  return (
    <>
      <div className="flex items-center justify-between h-12 px-2 shrink-0 sticky top-0 z-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <button type="button" onClick={onBack} aria-label="Back" className={headBtn}>
          <CaretLeft size={16} weight="regular" className={headIcon} />
        </button>
        <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">Advanced Settings</span>
        <button type="button" onClick={onClose} aria-label="Close" className={headBtn}>
          <X size={16} weight="regular" className={headIcon} />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Fill */}
        <div className="flex flex-col gap-2">
          <label className={sectionLabel}>Fill</label>
          <ColorOpacityField
            hex={value.fillHex || value.hex}
            opacity={value.fillHex ? value.fillOpacity ?? 100 : value.opacity}
            labelText={value.fillHex ? undefined : "Auto"}
            onHexChange={(fillHex) => set({ fillHex: fillHex || null })}
            onOpacityChange={(o) => (value.fillHex ? set({ fillOpacity: o }) : set({ opacity: o }))}
            onSwatchClick={() => onSwatchClick("text-fill")}
            makePercentDrag={makePercentDrag}
          />
        </div>

        {/* Decoration */}
        <div className="flex flex-col gap-2">
          <ToggleRow
            heading
            muted
            label="Decoration"
            checked={!!value.decoration}
            onChange={(on) => set({ decoration: on ? value.decoration ?? "underline" : null })}
          />
          {value.decoration && (
            <div className="fx-enter flex items-center gap-2">
              <div className={`${seg} flex-1 min-w-0`}>
                {TEXT_DECORATIONS.map(({ value: v, Icon }) => (
                  <button key={v} type="button" aria-label={v} onClick={() => set(decoSwitchPatch(value, v))} className={segBtn(value.decoration === v)}>
                    <Icon size={16} weight="regular" />
                  </button>
                ))}
              </div>
              <Tooltip label="Decoration settings" placement="bottom">
                <button
                  type="button"
                  aria-label="Decoration settings"
                  onClick={onOpenDecoration}
                  className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-[10px] bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] transition-[background-color,transform] duration-150 active:scale-[0.94]"
                >
                  <CaretRight size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Transform / Wrap */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <label className={smallLabel}>Transform</label>
            <PopupDropdown value={value.textCase} options={TEXT_CASES} onChange={(textCase) => set({ textCase })} />
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <label className={smallLabel}>Wrap</label>
            <PopupDropdown value={value.textWrap ?? "auto"} options={TEXT_WRAPS} onChange={(textWrap) => set({ textWrap })} />
          </div>
        </div>

        {/* Paragraph spacing */}
        <div className="flex flex-col gap-2">
           <label className={smallLabel}>Paragraph spacing</label>
          <Scrubber compact label="" value={value.paragraphSpacing ?? 0} min={0} max={100} hardMax={400} onChange={(paragraphSpacing) => set({ paragraphSpacing })} />
        </div>

        {/* Truncate text */}
        <div className="flex flex-col gap-2">
          <ToggleRow muted label="Truncate text" checked={!!value.truncate} onChange={(truncate) => set({ truncate })} />
          {value.truncate && (
            <div className="fx-enter flex flex-col gap-2">
              <label className={smallLabel}>Max lines</label>
              <Scrubber compact label="" value={value.truncateLines ?? 3} min={1} max={20} onChange={(truncateLines) => set({ truncateLines })} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Wraps a numeric field. While Alt (Option) is held over it, the cursor becomes the horizontal
// resizer and dragging scrubs the value (Shift = 10x). Works on hover alone: the field doesn't
// need focus. Alt is read from key events (capture phase) AND from pointer events.
function ScrubWrap({ value, min, max, onChange, children }) {
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

  const active = hovering && altHeld;

  const startDrag = (e) => {
    if (e.button !== 0 || !e.altKey) return;
    e.preventDefault(); // no focus / text selection while scrubbing
    e.stopPropagation();
    const startX = e.clientX;
    const startVal = value;
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

  return (
    <div
      onPointerEnter={(e) => {
        setHovering(true);
        setAltHeld(e.altKey);
      }}
      onPointerMove={(e) => {
        if (e.altKey !== altHeld) setAltHeld(e.altKey);
      }}
      onPointerLeave={() => setHovering(false)}
      onPointerDownCapture={startDrag}
      className={active ? "[&_*]:!cursor-ew-resize" : ""}
    >
      {children}
    </div>
  );
}

const DECO_STYLES = [
  { value: "solid", label: "Solid" },
  { value: "double", label: "Double" },
  { value: "dotted", label: "Dotted" },
  { value: "dashed", label: "Dashed" },
  { value: "wavy", label: "Wavy" },
];

function TextDecoration({ value, set, onBack, onClose, onSwatchClick, makePercentDrag }) {
  const isUnder = value.decoration !== "line-through";
  const smallLabel = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      on ? SEG_ON : SEG_OFF
    }`;
  const headBtn = "group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors";
  const headIcon = "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors";

  return (
    <>
      <div className="flex items-center justify-between h-12 px-2 shrink-0 sticky top-0 z-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <button type="button" onClick={onBack} aria-label="Back" className={headBtn}>
          <CaretLeft size={16} weight="regular" className={headIcon} />
        </button>
        <span>
          <span className="section-title text-[#8C8C8C] dark:text-[#9A9A9A]">Decoration / </span>
          <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{isUnder ? "Underline" : "Strikethrough"}</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className={headBtn}>
          <X size={16} weight="regular" className={headIcon} />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Type */}
        <div className="flex flex-col gap-2">
          <label className={smallLabel}>Type</label>
          <div className={seg}>
            {TEXT_DECORATIONS.map(({ value: v, Icon }) => (
              <button key={v} type="button" aria-label={v} onClick={() => set(decoSwitchPatch(value, v))} className={segBtn(value.decoration === v)}>
                <Icon size={16} weight="regular" />
              </button>
            ))}
          </div>
        </div>

        {/* Style (underline only) */}
        {isUnder && (
          <div className="fx-enter flex flex-col gap-2">
            <label className={smallLabel}>Style</label>
            <PopupDropdown value={value.decoStyle ?? "solid"} options={DECO_STYLES} onChange={(decoStyle) => set({ decoStyle })} />
          </div>
        )}

        {/* Color */}
        <div className="flex flex-col gap-2">
          <label className={smallLabel}>Color</label>
          <ColorOpacityField
            hex={value.decoHex || value.hex}
            opacity={value.decoHex ? value.decoOpacity ?? 100 : value.opacity}
            labelText={value.decoHex ? undefined : "Auto"}
            onHexChange={(decoHex) => set({ decoHex: decoHex || null })}
            onOpacityChange={(o) => (value.decoHex ? set({ decoOpacity: o }) : set({ opacity: o }))}
            onSwatchClick={() => onSwatchClick("text-deco")}
            makePercentDrag={makePercentDrag}
          />
        </div>

        {/* Thickness */}
        <div className="flex flex-col gap-2">
          <label className={smallLabel}>Thickness</label>
          <Scrubber compact label="" autoLabel="Auto" value={value.decoThickness ?? 0} min={0} max={20} hardMax={100} onChange={(decoThickness) => set({ decoThickness })} />
        </div>

        {/* Offset + Skip ink (underline only) */}
        {isUnder && (
          <>
            <div className="fx-enter flex flex-col gap-2">
              <label className={smallLabel}>Offset</label>
              <Scrubber compact label="" autoLabel="Auto" value={value.decoOffset ?? 0} min={0} max={40} hardMax={200} onChange={(decoOffset) => set({ decoOffset })} />
            </div>
            <div className="fx-enter">
              <ToggleRow muted label="Skip ink" checked={value.decoSkipInk !== false} onChange={(decoSkipInk) => set({ decoSkipInk })} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function TextPopup({ popupRef, anchorRef, toolbarRef, value, onChange, onClose, onSwatchClick, makePercentDrag }) {
  const [pos, setPos] = useState(null);
  const fileRef = useRef(null);
  const [advanced, setAdvanced] = useState(false);
  const [decoOpen, setDecoOpen] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });

  const [linkWH, setLinkWH] = useState(false); // lock: keep the width / height ratio

  // Measure the real text box on the canvas, in px.
  const [boxPx, setBoxPx] = useState({ w: 0, h: 0, cw: 1, ch: 1 });
  useEffect(() => {
    const el = document.querySelector(`[data-text-box="${value.id}"]`);
    const wrap = el?.parentElement;
    if (!el || !wrap) return;
    const update = () =>
      setBoxPx({ w: Math.round(el.offsetWidth), h: Math.round(el.offsetHeight), cw: wrap.clientWidth || 1, ch: wrap.clientHeight || 1 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [value.id, value.content, value.size, value.boxW, value.boxH, value.font, value.weight, value.lineHeight, value.letterSpacing]);

  const isFixed = value.boxH != null;
  const autoWidthMode = value.boxW == null;
  const autoHeightMode = value.boxW != null && value.boxH == null;
  const curW = value.boxW != null ? value.boxW * boxPx.cw : boxPx.w;

  // boxH is never touched here, so Auto width -> Auto height, and Auto height keeps its auto height.
  // Only Fixed size can use the ratio lock.
  const setW = (px) => {
    const w = Math.max(1, px);
    if (isFixed && linkWH) {
      const h = (w * boxPx.h) / Math.max(1, boxPx.w);
      set({ boxW: w / boxPx.cw, boxH: h / boxPx.ch });
    } else {
      set({ boxW: w / boxPx.cw });
    }
  };

  // Editing H only changes the height. The top edge stays where it is, because the box is
  // anchored by its position preset (middle / bottom would otherwise grow around the anchor
  // and move the text). Width stays as it was, unless the ratio lock is on.
  const setH = (px) => {
    const h = Math.max(1, px);
    const [v, hz] = value.position.split("");
    const shiftY = v === "m" ? (h - boxPx.h) / 2 : v === "b" ? h - boxPx.h : 0;
    const patch = { boxH: h / boxPx.ch, dy: (value.dy ?? 0) + shiftY / boxPx.ch };
    if (isFixed && linkWH) {
      const w = (h * boxPx.w) / Math.max(1, boxPx.h);
      const shiftX = hz === "c" ? (w - boxPx.w) / 2 : hz === "r" ? w - boxPx.w : 0;
      patch.boxW = w / boxPx.cw;
      patch.dx = (value.dx ?? 0) + shiftX / boxPx.cw; // keep the left edge fixed too
    }
    set(patch);
  };

  const [distMenu, setDistMenu] = useState(null); // { right, top }
  useEffect(() => {
    if (!distMenu) return;
    const onDown = (e) => {
      if (!e.target.closest?.("[data-text-dist-menu],[data-text-dist-trigger]")) setDistMenu(null);
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // close just the menu, not the whole Text popup
      setDistMenu(null);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [distMenu]);

  // 4px left of the toolbar, bottom edge aligned with the toolbar's bottom edge.
  useLayoutEffect(() => {
    const update = () => {
      const t = toolbarRef.current?.getBoundingClientRect();
      if (!t) return;
      setPos({
        bottom: window.innerHeight - t.bottom,
        right: window.innerWidth - t.left + 4,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [advanced]);

  useEffect(() => {
    const onDown = (e) => {
      const t = e.target;
      if (popupRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      if (t.closest?.("[data-popup-dropdown],[data-color-picker-popup],[data-color-picker-trigger],[data-text-box],[data-text-row]")) return;
      onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const onFontFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const family = file.name.replace(/\.[^.]+$/, "");
    try {
      const face = new FontFace(family, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      set({ font: family, customFonts: [...value.customFonts.filter((f) => f !== family), family] });
    } catch (err) {
      console.error("Custom font failed to load:", err);
    }
  };

  const heading = "section-title text-[13px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA]";
  const label = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const section = "flex flex-col gap-3 p-4 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10";
  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) =>
    `seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      on ? SEG_ON : SEG_OFF
    }`;
  const fonts = [...TEXT_FONTS, ...value.customFonts.map((v) => ({ value: v, label: v }))];

  // Align buttons map onto the existing 9-point position (e.g. "tl", "mc", "br").
  const ALIGN_TO_POS = {
    left: ["h", "l"], hcenter: ["h", "c"], right: ["h", "r"],
    top: ["v", "t"], vcenter: ["v", "m"], bottom: ["v", "b"],
  };
  const alignText = (key) => {
    const [axis, ch] = ALIGN_TO_POS[key];
    const [v, h] = value.position.split("");
    set(axis === "h" ? { position: v + ch, dx: 0 } : { position: ch + h, dy: 0 });
  };
   const isAligned = (key) => {
    const [axis, ch] = ALIGN_TO_POS[key];
    const offset = (axis === "h" ? value.dx : value.dy) ?? 0;
    return value.position[axis === "h" ? 1 : 0] === ch && Math.abs(offset) < 0.001;
  };

  const autoWidth = value.boxW == null;

  const shellStyle = {
    position: "fixed",
    bottom: pos?.bottom ?? 0,
    right: pos?.right ?? 0,
    visibility: pos ? "visible" : "hidden",
    maxHeight: "82vh",
  };
  const shellClass =
    "panel-enter w-[300px] flex flex-col overflow-y-auto custom-scroll bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]";

  if (advanced && decoOpen) {
    return (
      <div ref={popupRef} style={shellStyle} className={shellClass}>
        <TextDecoration
          value={value}
          set={set}
          onBack={() => setDecoOpen(false)}
          onClose={onClose}
          onSwatchClick={onSwatchClick}
          makePercentDrag={makePercentDrag}
        />
      </div>
    );
  }

  if (advanced) {
    return (
      <div ref={popupRef} style={shellStyle} className={shellClass}>
        <TextAdvanced
          value={value}
          set={set}
          onBack={() => setAdvanced(false)}
          onClose={onClose}
          onSwatchClick={onSwatchClick}
          makePercentDrag={makePercentDrag}
          onOpenDecoration={() => setDecoOpen(true)}
        />
      </div>
    );
  }

  return (
    <div ref={popupRef} style={shellStyle} className={shellClass}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 pl-4 pr-2 shrink-0 sticky top-0 z-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">Text</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>

      {/* Position */}
      <div className={section}>
        <span className={heading}>Position</span>
        <div className="flex items-center justify-between">
{ALIGN_ACTIONS.map(({ key, label: tip, Icon }, i) => {
            return (
              <React.Fragment key={key}>
                {i === 3 && <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />}
                <Tooltip label={tip} placement="bottom">
                  <button
                    type="button"
                    aria-label={tip}
                    onClick={() => alignText(key)}
                    className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                  >
                    <Icon
                      size={16}
                      weight="regular"
                      className={`transition-colors ${
                        isAligned(key)
                          ? "text-[#FF47BC]"
                          : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                      }`}
                    />
                  </button>
                </Tooltip>
              </React.Fragment>
            );
          })}
          <div className="w-px h-4 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10 shrink-0" />
          <button
            type="button"
            data-text-dist-trigger
            aria-label="Distribute"
            aria-haspopup="menu"
            aria-expanded={!!distMenu}
            onClick={(e) => {
              if (distMenu) return setDistMenu(null);
              const r = e.currentTarget.getBoundingClientRect();
              setDistMenu({ right: window.innerWidth - r.right, top: r.bottom + 4 });
            }}
            className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-[background-color,transform] duration-150 active:scale-[0.94] ${
              distMenu ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Rows size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
        </div>
      </div>

      {/* Size */}
      <div className={`${section} !gap-2`}>
        <span className={heading}>Size</span>

        <div className="flex items-center gap-1">
          <div className="flex flex-1 min-w-0 items-center gap-2">
            <OffsetField label="W" value={boxPx.w} onChange={setW} dimmed={autoWidthMode} />
            <OffsetField label="H" value={boxPx.h} onChange={setH} dimmed={value.boxH == null} />
          </div>
          <Tooltip label={linkWH ? "Unlock aspect ratio" : "Lock aspect ratio"} placement="bottom">
            <button
              type="button"
              aria-label="Lock aspect ratio"
              aria-pressed={linkWH}
              onClick={() => setLinkWH((v) => !v)}
              className="group flex items-center justify-center w-7 h-7 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
            >
              {linkWH ? (
                <LockSimple size={16} weight="regular" className="text-[#FF47BC]" />
              ) : (
                <LockSimpleOpen size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
              )}
            </button>
          </Tooltip>
        </div>

        <div className={seg}>
          <Tooltip label="Auto width" placement="bottom" className="flex-1">
            <button
              type="button"
              aria-label="Auto width"
              onClick={() => set({ boxW: null, boxH: null })}
              className={`${segBtn(value.boxW == null && value.boxH == null)} w-full`}
            >
              <ArrowsHorizontal size={16} weight="regular" />
            </button>
          </Tooltip>
          <Tooltip label="Auto height" placement="bottom" className="flex-1">
            <button
              type="button"
              aria-label="Auto height"
         onClick={() => set({ boxW: value.boxW ?? boxPx.w / boxPx.cw, boxH: null })}
              className={`${segBtn(value.boxW != null && value.boxH == null)} w-full`}
            >
              <ArrowsVertical size={16} weight="regular" />
            </button>
          </Tooltip>
          <Tooltip label="Fixed size" placement="bottom" className="flex-1">
            <button
              type="button"
              aria-label="Fixed size"
              onClick={() => set({ boxW: value.boxW ?? boxPx.w / boxPx.cw, boxH: value.boxH ?? boxPx.h / boxPx.ch })}
              className={`${segBtn(value.boxH != null)} w-full`}
            >
              <CornersOut size={16} weight="regular" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Type */}
      <div className={section}>
        <span className={heading}>Type</span>
        <div className="flex flex-col gap-4">
          <SocialField label="Content" value={value.content} onChange={(v) => set({ content: v })} full multiline />

          <div className="flex flex-col gap-2">
            <label className={label}>Font</label>
            <div className="flex items-start gap-1">
              <div className="flex-1 min-w-0">
                <PopupDropdown value={value.font} options={fonts} onChange={(font) => set({ font })} />
              </div>
              <Tooltip label="Upload custom font" placement="bottom">
                <button
                  type="button"
                  aria-label="Upload custom font"
                  onClick={() => fileRef.current?.click()}
                  className={`${DROPDOWN_TRIGGER} w-8 shrink-0 !justify-center !px-0`}
                >
                  <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                </button>
              </Tooltip>
            </div>
            <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2" onChange={onFontFile} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 min-w-0">
              <label className={label}>Weight</label>
              <PopupDropdown value={value.weight} options={TEXT_WEIGHTS} onChange={(weight) => set({ weight })} />
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <label className={label}>Size</label>
              <ScrubWrap value={value.size} min={1} max={2000} onChange={(size) => set({ size })}>
                <OffsetField unit="px" value={value.size} min={1} max={2000} className="h-8" onChange={(size) => set({ size })} />
              </ScrubWrap>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <label className={label}>Line height</label>
              <ScrubWrap value={value.lineHeight} min={50} max={1000} onChange={(lineHeight) => set({ lineHeight })}>
                <OffsetField unit="%" value={value.lineHeight} min={50} max={1000} className="h-8" onChange={(lineHeight) => set({ lineHeight })} />
              </ScrubWrap>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <label className={label}>Letter spacing</label>
              <ScrubWrap value={value.letterSpacing} min={-20} max={100} onChange={(letterSpacing) => set({ letterSpacing })}>
                <OffsetField unit="%" value={value.letterSpacing} min={-20} max={100} className="h-8" onChange={(letterSpacing) => set({ letterSpacing })} />
              </ScrubWrap>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={label}>Color</label>
            <ColorOpacityField
              hex={value.hex}
              opacity={value.opacity}
              onHexChange={(hex) => set({ hex })}
              onOpacityChange={(opacity) => set({ opacity })}
              onSwatchClick={() => onSwatchClick("text")}
              makePercentDrag={makePercentDrag}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={label}>Alignment</label>
            <div className={seg}>
              {TEXT_ALIGNS.map(({ value: v, Icon }) => (
                <button key={v} type="button" aria-label={`Align ${v}`} onClick={() => set({ align: v })} className={segBtn(value.align === v)}>
                  <Icon size={16} weight="regular" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Z index</label>
            <Scrubber
              compact
              label=""
              value={value.zIndex ?? (value.layer === "behind" ? 0 : 1)}
              min={0}
              max={100}
              onChange={(zIndex) => set({ zIndex, layer: zIndex > 0 ? "front" : "behind" })}
            />
          </div>
        </div>
      </div>

      {/* Advanced settings */}
      <div className="p-4">
        <button type="button" onClick={() => setAdvanced(true)} className="group flex items-center gap-2 w-full select-none">
          <CaretRight size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          <span className="section-title text-[14px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA]">Advanced settings</span>
        </button>
      </div>

      {distMenu &&
        createPortal(
          <div
            data-text-dist-menu
            data-popup-dropdown
            role="menu"
            style={{ position: "fixed", right: distMenu.right, top: distMenu.top }}
            className="pop-enter w-max p-2 flex flex-col gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
          >
            {[
              { axis: "v", label: "Distribute vertical spacing", keys: [ALT, "⇧", "V"], Icon: Rows },
              { axis: "h", label: "Distribute horizontal spacing", keys: [ALT, "⇧", "H"], Icon: Columns },
            ].map(({ axis, label: tip, keys, Icon }) => (
              <button
                key={axis}
                type="button"
                disabled
                onClick={() => setDistMenu(null)}
                className="flex items-center justify-between w-full h-8 pl-2 pr-2 gap-4 rounded-lg text-[12px] font-medium tracking-[-0.005em] whitespace-nowrap text-[#3A3A3A] dark:text-[#FAF9FA] enabled:hover:bg-[#F2F2F2] dark:enabled:hover:bg-[#1F1F1F] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <Icon size={14} weight="regular" className="shrink-0" />
                  {tip}
                </span>
                <KeyCombo keys={keys} />
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}