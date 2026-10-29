import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CaretDown, Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import { PopupDropdown } from "./controls.jsx";
import { FONT_CATEGORIES, useFontCatalog, filterFonts, loadFont, loadPreview } from "../lib/fontCatalog.js";

const ROW = 32;
const VIEW = 264;

// value = family name. onChange(family, meta) gets the font's metadata so the caller can store it.
export function FontPicker({ value, onChange, customFonts = [] }) {
  const { fonts, loading, requestLocal, canQueryLocal, localLoaded } = useFontCatalog();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [top, setTop] = useState(0);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ left: r.left, top: Math.min(r.bottom + 4, window.innerHeight - 400), width: r.width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      if (e.target.closest?.("[data-popup-dropdown]")) return; // the category dropdown's own menu
      setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && (e.stopPropagation(), setOpen(false));
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const list = filterFonts(fonts, cat, q, customFonts);
  const start = Math.max(0, Math.floor(top / ROW) - 4);
  const end = Math.min(list.length, start + Math.ceil(VIEW / ROW) + 8);

  useEffect(() => {
    if (!open) return;
    list.slice(start, end).forEach(loadPreview);
  }, [open, start, end, cat, q, fonts.length]);

  const pick = async (f) => {
    await loadFont(f);
    onChange(f.family, f);
    setOpen(false);
  };

  return (
    <div data-popup-dropdown>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-8 flex items-center justify-between pl-3 pr-2 rounded-[10px] bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] transition-colors"
      >
        <span className="truncate" style={{ fontFamily: `"${value}", sans-serif` }}>{value}</span>
        <CaretDown size={16} weight="regular" className="shrink-0 text-[#737373] dark:text-[#ABABAB]" />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          data-popup-dropdown
          style={{ position: "fixed", left: pos.left, top: pos.top, width: Math.max(pos.width, 240) }}
          className="pop-enter p-2 flex flex-col gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
        >
          <div className="flex items-center gap-2 h-8 pl-2 pr-1 rounded-[10px] bg-[#EDEDED] dark:bg-[#292929] border border-transparent focus-within:border-[#FF47BC]">
            <MagnifyingGlass size={14} className="shrink-0 text-[#737373] dark:text-[#ABABAB]" />
            <input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setTop(0); }}
              placeholder="Search fonts"
              className="flex-1 min-w-0 bg-transparent text-[13px] font-medium text-[#3A3A3A] dark:text-[#FAF9FA] placeholder:text-[#737373] outline-none"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5">
                <X size={12} className="text-[#737373] dark:text-[#ABABAB]" />
              </button>
            )}
          </div>

          <PopupDropdown value={cat} options={FONT_CATEGORIES} onChange={(v) => { setCat(v); setTop(0); }} />

          {cat === "installed" && canQueryLocal && !localLoaded && (
            <button
              type="button"
              onClick={requestLocal}
              className="h-8 rounded-lg text-[12px] font-medium text-[#FF47BC] bg-[#FF47BC]/10 hover:bg-[#FF47BC]/15 transition-colors"
            >
              Allow access to your installed fonts
            </button>
          )}

          <div style={{ height: VIEW }} className="overflow-y-auto custom-scroll" onScroll={(e) => setTop(e.currentTarget.scrollTop)}>
            <div style={{ height: list.length * ROW, position: "relative" }}>
              {list.slice(start, end).map((f, i) => {
                const selected = f.family === value;
                return (
                  <button
                    key={`${f.src}:${f.family}`}
                    type="button"
                    onClick={() => pick(f)}
                    style={{ position: "absolute", top: (start + i) * ROW, height: ROW, left: 0, right: 0 }}
                    className={`flex items-center justify-between pl-2 pr-2 rounded-lg text-[13px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
                      selected
                        ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                        : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                    }`}
                  >
                    <span className="truncate" style={{ fontFamily: `"${f.family}", sans-serif` }}>{f.family}</span>
                    {selected && <Check size={14} weight="regular" className="shrink-0" />}
                  </button>
                );
              })}
            </div>
            {!list.length && (
              <div className="py-8 text-center text-[12px] font-medium text-[#737373] dark:text-[#ABABAB]">
                {loading ? "Loading fonts…" : cat === "installed" && !canQueryLocal ? "Your browser can't list installed fonts" : "No fonts found"}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}