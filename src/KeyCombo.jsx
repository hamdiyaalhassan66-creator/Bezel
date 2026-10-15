import React, { Fragment } from "react";
import { KEY_LABELS } from "./KeyCap.jsx";

const label = (k) => KEY_LABELS[k] ?? k;

export default function KeyCombo({ keys, className = "" }) {
  return (
    <span className={`flex items-center gap-1 shrink-0 text-[12px] leading-[18px] font-medium text-[#8C8C8C] dark:text-[#9A9A9A] ${className}`}>
      {keys.map((k, i) => (
        <Fragment key={`${k}-${i}`}>
          {i > 0 && <span className="opacity-60">+</span>}
          <span>{label(k)}</span>
        </Fragment>
      ))}
    </span>
  );
}