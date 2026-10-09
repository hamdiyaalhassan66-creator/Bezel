import React from "react";
import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import Tooltip from "./Tooltip.jsx";

export default function AspectLockButton({ locked, onToggle }) {
  const Icon = locked ? LockSimple : LockSimpleOpen;
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      <Tooltip label={locked ? "Unlock aspect ratio" : "Lock aspect ratio"} placement="bottom">
        <button
          type="button"
          aria-label={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          aria-pressed={locked}
          onClick={onToggle}
          className={`flex items-center justify-center w-6 h-6 rounded-md transition-[color,transform] duration-150 active:scale-[0.9] ${
            locked
              ? "text-[#FF47BC]"
              : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
          }`}
        >
          <Icon size={16} weight="regular" />
        </button>
      </Tooltip>
    </div>
  );
}