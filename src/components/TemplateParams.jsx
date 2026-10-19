import React from "react";
import { Scrubber, PopupDropdown, SEG_ON, SEG_OFF } from "./controls.jsx";
import { EaseBezierEditor } from "./EasePopover.jsx";
import { VID_EASE_PRESETS, VID_EASE_CUSTOM_DEFAULT } from "../lib/videoMath.js";

const LABEL = "text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";

const EASE_OPTIONS = [
  ...VID_EASE_PRESETS.map((x) => ({ value: x.id, label: x.label })),
  { value: "custom", label: "Custom" },
];

function EaseControl({ value, onChange }) {
  const change = (id) => {
    if (id === "custom") return onChange({ id: "custom", kind: "bezier", p: [...VID_EASE_CUSTOM_DEFAULT] });
    const pr = VID_EASE_PRESETS.find((x) => x.id === id);
    if (pr) onChange({ id: pr.id, kind: pr.kind, p: [...pr.p] });
  };
  return (
    <div className="flex flex-col gap-2">
      <PopupDropdown value={value.id} options={EASE_OPTIONS} onChange={change} />
      {value.kind === "bezier" && <EaseBezierEditor p={value.p} onChange={(p) => onChange({ ...value, p })} />}
    </div>
  );
}

export function TemplateParams({ params, values, onChange }) {
  const groups = [];
  params.forEach((p) => {
    const name = p.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(p);
    else groups.push({ name, items: [p] });
  });

  const render = (p) =>
    p.type === "ease" ? (
      <EaseControl key={p.key} value={values[p.key]} onChange={(v) => onChange(p.key, v)} />
    ) : p.type === "segmented" ? (
      <div key={p.key} className="flex flex-col gap-2">
        <label className={LABEL}>{p.label}</label>
        <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
          {p.options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(p.key, o)}
              className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                values[p.key] === o ? SEG_ON : SEG_OFF
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    ) : (
      <Scrubber key={p.key} label={p.label} value={values[p.key]} min={p.min} max={p.max} hardMax={p.hardMax} onChange={(v) => onChange(p.key, v)} />
    );

  return (
    <div className="flex flex-col gap-4 w-full">
      {groups.map((g, i) => (
        <div key={i} className="flex flex-col gap-2">
          {g.name && <label className={LABEL}>{g.name}</label>}
          {g.items.map((p, j) => {
            const prev = g.items[j - 1];
            const apart = j > 0 && !p.attach && (p.type !== "slider" || prev.type !== "slider"); // 8px gap + 8px margin = 16px
            return (
              <div key={p.key} className={apart ? "mt-2" : ""}>
                {render(p)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}