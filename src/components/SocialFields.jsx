import React, { useRef, useState } from "react";
import { UploadSimple, Trash } from "@phosphor-icons/react";
import Tooltip from "../Tooltip.jsx";

// Labelled text input, same look as the browser Address field.
// Long-text fields span both columns; everything else pairs up.
const SOCIAL_FULL_WIDTH = new Set(["name", "sub", "caption", "sound", "headline"]);

function SocialField({ label, value, onChange, full = false, multiline = false }) {
  const fieldClass =
    "flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none";
  return (
    <div className={`flex flex-col gap-2 min-w-0 ${full ? "col-span-2" : ""}`}>
      <label className="text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A] truncate">{label}</label>
      <div className={`flex ${multiline ? "items-start" : "items-center"} px-2 py-2 bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-[10px] border border-transparent focus-within:border-[#FF47BC] transition-colors`}>
        {multiline ? (
          // Enter inserts a new line. The textarea scrolls once it passes ~5 lines.
          <textarea
            value={value}
            rows={3}
            onChange={(e) => onChange(e.target.value)}
            className={`${fieldClass} resize-none max-h-[110px] overflow-y-auto custom-scroll`}
          />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
        )}
      </div>
    </div>
  );
}

// Round-thumbnail image upload, same look as the Avatar row.
function ImageUploadField({ label, value, onChange, uploadLabel = "Upload image" }) {
  const inputRef = useRef(null);
  const [name, setName] = useState(null);
  const pick = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onChange(URL.createObjectURL(file));
      setName(file.name);
    }
    e.target.value = "";
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">{label}</label>
      {value ? (
        <div className="w-full h-[66px] flex items-center justify-between py-2 pl-2 pr-1 gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl">
          <div className="flex items-center gap-2 h-12 min-w-0">
            <div className="w-12 h-12 rounded-full shrink-0 bg-cover bg-center bg-[#EDEDED]" style={{ backgroundImage: `url(${value})` }} />
            <span className="text-[13px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] truncate">{name}</span>
          </div>
          <div className="flex items-start gap-0.5 shrink-0">
            <Tooltip label="Replace image" placement="bottom">
              <button type="button" onClick={() => inputRef.current?.click()} className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
              </button>
            </Tooltip>
            <Tooltip label="Remove image" placement="bottom">
              <button type="button" onClick={() => onChange(null)} className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F04438]/10 transition-colors">
                <Trash size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
              </button>
            </Tooltip>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-[66px] bg-white dark:bg-[#1F1F1F] border border-dashed border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-[10px] flex flex-col items-center justify-center gap-1 hover:bg-[#EAEAEA] dark:hover:bg-[#333333] transition-colors"
        >
          <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
          <span className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">{uploadLabel}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
}

export { SOCIAL_FULL_WIDTH, SocialField, ImageUploadField };