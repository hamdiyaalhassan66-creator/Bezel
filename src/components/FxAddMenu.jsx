import React from "react";

export function FxAddMenu({ menuRef, menu, items, onPick }) {
  return (
    <div
      ref={menuRef}
      data-fx-menu
      role="menu"
      style={{ position: "fixed", right: menu.right, ...(menu.up ? { bottom: menu.bottom } : { top: menu.top }) }}
      className="pop-enter w-[180px] p-2 flex flex-col gap-1 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
    >
      {items.map(({ type, label, Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onPick(type)}
          className="group flex items-center w-full h-8 pl-2 pr-2 gap-2 rounded-lg text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
        >
          <Icon size={16} weight="regular" className="shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}