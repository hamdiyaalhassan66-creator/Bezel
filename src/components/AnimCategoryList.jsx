import React from "react";
import { CaretRight } from "@phosphor-icons/react";

export function AnimCategoryList({ categories, templates, onPick }) {
  const count = (name) => (name === "All" ? templates.length : templates.filter((t) => t.category === name).length);
  return (
    <div className="flex flex-col items-start w-full gap-1">
      {categories.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onPick(name)}
          className="w-full h-9 flex items-center justify-between px-2 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
        >
          <span>{name}</span>
          <span className="flex items-center gap-1 text-[#8C8C8C] dark:text-[#9A9A9A]">
            <span className="text-[12px]">{count(name)}</span>
            <CaretRight size={14} weight="regular" />
          </span>
        </button>
      ))}
    </div>
  );
}