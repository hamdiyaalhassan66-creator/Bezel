import React, { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";

const BTN =
  "h-8 flex items-center justify-center gap-2 px-3 shrink-0 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]";
const PINK =
  "h-8 flex items-center justify-center gap-2 px-3 shrink-0 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] enabled:hover:bg-[#F230AE] transition-[background-color,transform] duration-150 enabled:active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed";
const PINK_SHADOW = { boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" };

// name: current title. onSave(newName) gets a trimmed, non-empty name.
export function RenameModal({ name, onSave, onClose }) {
  const [draft, setDraft] = useState(name);
  const next = draft.trim();
  const save = () => {
    if (!next) return;
    if (next === name) onClose();
    else onSave(next);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // the editor and Projects page also react to Esc
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div
      className="fade-enter fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 dark:bg-black/85"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rename project"
        className="pop-enter w-[360px] max-w-full flex flex-col bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="flex items-center justify-between h-11 pl-4 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
          <span className="text-[14px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">Rename project</span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="group flex items-center justify-center w-7 h-7 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center px-2 h-[33px] bg-[#EDEDED] dark:bg-[#292929] rounded-[10px] border border-transparent focus-within:border-[#FF47BC] transition-colors">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Project name"
              className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] placeholder:text-[#737373] dark:text-[#FAF9FA] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 pt-0">
          <button type="button" onClick={onClose} className={BTN}>
            Cancel
          </button>
          <button type="button" disabled={!next} onClick={save} className={PINK} style={PINK_SHADOW}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}