import React from "react";
import { CaretRight } from "@phosphor-icons/react";

export function AnimCategoryList({ categories, templates, onPick, selected }) {
  const count = (name) => (name === "All" ? templates.length : templates.filter((t) => t.category === name).length);
  return (
    <div className="flex flex-col items-start w-full gap-1">
      {categories.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onPick(name)}
          className={`w-full h-9 flex items-center justify-between px-2 rounded-lg text-[13px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
            selected === name
              ? "bg-[#FF47BC]/10 text-[#FF47BC]"
              : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
          }`}
        >
          <span>{name}</span>
          <span className={`flex items-center gap-1 ${selected === name ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"}`}>
            <span className="text-[12px]">{count(name)}</span>
            <CaretRight size={14} weight="regular" />
          </span>
        </button>
      ))}
    </div>
  );
}