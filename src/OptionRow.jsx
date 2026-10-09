import React from "react";
import { Check } from "@phosphor-icons/react";

// One row for every dropdown: label (plus optional leading/trailing bits) on the left, check on the right.
export default function OptionRow({ label, sublabel, selected, onClick, leading, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center justify-between w-full h-[30px] px-2 gap-2 rounded-lg transition-colors duration-100 ease-in-out ${
        selected ? "bg-[#FF47BC]/10" : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
      }`}
    >
      <span className="flex items-center gap-2 min-w-0">
        {leading}
        <span
          className={`truncate text-[12px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
            selected
              ? "text-[#FF47BC]"
              : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
          }`}
        >
          {label}
        </span>
        {sublabel && (
          <>
            <span
              aria-hidden
              className={`shrink-0 ${selected ? "text-[#FF47BC]/80" : "text-[#8C8C8C] dark:text-[#9A9A9A]"}`}
              style={{ fontSize: 10, fontWeight: 500 }}
            >
              -
            </span>
            <span
              className={`shrink-0 tabular-nums ${selected ? "text-[#FF47BC]/80" : "text-[#8C8C8C] dark:text-[#9A9A9A]"}`}
              style={{ fontSize: 10, fontWeight: 500 }}
            >
              {sublabel}
            </span>
          </>
        )}
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {trailing}
        <Check
          size={14}
          weight="regular"
          className={`text-[#FF47BC] transition-opacity duration-150 ${
            selected ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
    </button>
  );
}