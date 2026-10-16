import { useState, useEffect } from "react";
import {
  ArrowsOutCardinal, ArrowSquareOut, ArrowCounterClockwise, CircleHalf, Palette, Stack, Drop,
  ArrowsHorizontal, ArrowsVertical, Square, CornersOut, Minus,
} from "@phosphor-icons/react";
import Tooltip from "../Tooltip.jsx";
import { BG_CUSTOM_REST } from "../lib/bgAnim.js";
import { TXT_REST, TXT_EASE_OPTIONS } from "../lib/textAnim.js";
import { Scrubber, PopupDropdown } from "./controls.jsx";

export const BG_CUSTOM_IDLE = { id: "custom", from: {} }; // stable object for the preview before anything is added

// keys = the `from` fields a property owns. def = what gets set when it's added.
const CA_PROPS = {
  move: { label: "Move", Icon: ArrowsOutCardinal, keys: ["x", "y"], def: { x: 0, y: 60 },
    fields: [{ k: "x", label: "X offset", min: -300, max: 300 }, { k: "y", label: "Y offset", min: -300, max: 300 }] },
  scale: { label: "Scale", Icon: ArrowSquareOut, keys: ["s"], def: { s: 0.6 },
    fields: [{ k: "s", label: "Scale (%)", min: 0, max: 300, mul: 100 }] },
  rotate: { label: "Rotate", Icon: ArrowCounterClockwise, keys: ["r"], def: { r: -45 },
    fields: [{ k: "r", label: "Rotation", min: -360, max: 360 }] },
  opacity: { label: "Opacity", Icon: CircleHalf, keys: ["a"], def: { a: 0 },
    fields: [{ k: "a", label: "Opacity", min: 0, max: 100, mul: 100 }] },
  color: { label: "Color", Icon: Palette, keys: ["c"], def: { c: "FF47BC" }, color: true },
  shadow: { label: "Shadow", Icon: Stack, keys: ["sh"], def: { sh: 40 },
    fields: [{ k: "sh", label: "Shadow", min: 0, max: 100 }] },
  blur: { label: "Layer Blur", Icon: Drop, keys: ["b"], def: { b: 30 },
    fields: [{ k: "b", label: "Blur", min: 0, max: 100 }] },
  letterSpacing: { label: "Letter Spacing", Icon: ArrowsHorizontal, keys: ["ls"], def: { ls: 40 },
    fields: [{ k: "ls", label: "Letter spacing", min: -50, max: 100 }] },
  lineHeight: { label: "Line Height", Icon: ArrowsVertical, keys: ["lh"], def: { lh: 60 },
    fields: [{ k: "lh", label: "Line height", min: -50, max: 200 }] },
  resize: { label: "Resize", Icon: Square, keys: ["w"], def: { w: 50 },
    fields: [{ k: "w", label: "Start size (%)", min: 0, max: 100 }] },
  radius: { label: "Corner Radius", Icon: CornersOut, keys: ["cr"], def: { cr: 20 },
    fields: [{ k: "cr", label: "Start radius", min: 0, max: 50 }] },
};
const CA_GROUPS = {
  text: [
    ["Transform", ["move", "scale", "rotate"]],
    ["Style", ["opacity", "color", "shadow"]],
    ["Effects", ["blur"]],
    ["Text", ["letterSpacing", "lineHeight"]],
  ],
  bg: [
    ["Transform", ["move", "scale", "rotate"]],
    ["Style", ["opacity", "color"]],
    ["Effects", ["blur"]],
    ["Other", ["resize", "radius"]],
  ],
};

// Older specs have no `use` list, so work out which properties differ from rest.
const caInfer = (from, rest, target) => {
  const allowed = CA_GROUPS[target].flatMap(([, ks]) => ks);
  return Object.keys(CA_PROPS).filter((k) => allowed.includes(k) && CA_PROPS[k].keys.some((f) => from[f] !== rest[f]));
};

function CaColor({ value, onChange }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="flex items-center gap-2">
      <label
        className="relative w-8 h-8 rounded-[10px] shrink-0 overflow-hidden border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 cursor-pointer"
        style={{ backgroundColor: `#${value}` }}
      >
        <input
          type="color"
          value={`#${value}`}
          onChange={(e) => onChange(e.target.value.slice(1).toUpperCase())}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <div className="flex flex-1 min-w-0 items-center h-8 px-2.5 bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] focus-within:bg-[#E3E3E3] dark:focus-within:bg-[#333333] rounded-[10px] border border-transparent focus-within:border-[#FF47BC] transition-colors">
        <input
          value={text}
          onChange={(e) => {
            const h = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
            setText(h);
            if (h.length === 6) onChange(h);
          }}
          className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] outline-none"
        />
      </div>
    </div>
  );
}

// target: "text" | "bg". spec: the current animation (or null). onChange gets the next spec.
export function CustomAnimEditor({ target, spec, onChange }) {
  const rest = target === "bg" ? BG_CUSTOM_REST : TXT_REST;
  const from = { ...rest, ...(spec?.from ?? {}) };
  const active = spec?.use ?? caInfer(from, rest, target);
  const emit = (patch) => onChange({ ...(spec ?? {}), ...patch });
  const setFrom = (patch) => emit({ from: { ...from, ...patch }, use: active });
  const add = (key) => emit({ from: { ...from, ...CA_PROPS[key].def }, use: [...active, key] });
  const remove = (key) =>
    emit({
      from: { ...from, ...Object.fromEntries(CA_PROPS[key].keys.map((k) => [k, rest[k]])) },
      use: active.filter((k) => k !== key),
    });
  const sub = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";
  const rawEase = spec?.ease ?? (target === "bg" ? "smooth" : "expo-out");
  const ease = typeof rawEase === "string" ? rawEase : rawEase.id;

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 && (
        <div className="fx-enter flex flex-col gap-3">
          {active.map((key) => {
            const p = CA_PROPS[key];
            const Icon = p.Icon;
            return (
              <div key={key} className="fx-enter flex flex-col gap-2">
                <div className="flex items-center justify-between h-6">
                  <span className="flex items-center gap-2 section-title text-[#3A3A3A] dark:text-[#FAF9FA]">
                    <Icon size={14} weight="regular" className="text-[#FF47BC]" />
                    {p.label}
                  </span>
                  <Tooltip label={`Remove ${p.label.toLowerCase()}`} placement="bottom">
                    <button
                      type="button"
                      aria-label={`Remove ${p.label}`}
                      onClick={() => remove(key)}
                      className="group flex items-center justify-center w-6 h-6 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                    >
                      <Minus size={14} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
                    </button>
                  </Tooltip>
                </div>
                {p.color ? (
                  <CaColor value={from.c || "FF47BC"} onChange={(c) => setFrom({ c })} />
                ) : (
                  p.fields.map((f) => (
                    <Scrubber
                      key={f.k}
                      compact
                      label={f.label}
                      value={Math.round(from[f.k] * (f.mul ?? 1))}
                      min={f.min}
                      max={f.max}
                      onChange={(v) => setFrom({ [f.k]: v / (f.mul ?? 1) })}
                    />
                  ))
                )}
              </div>
            );
          })}
          <div className="flex flex-col gap-2">
            <label className={sub}>Easing</label>
            <PopupDropdown value={ease} options={TXT_EASE_OPTIONS} onChange={(e) => emit({ ease: e })} />
          </div>
        </div>
      )}

      {CA_GROUPS[target].map(([title, keys]) => {
        const left = keys.filter((k) => !active.includes(k));
        if (!left.length) return null;
        return (
          <div key={title} className="flex flex-col gap-1">
            <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA] pb-1">{title}</span>
            {left.map((k) => {
              const Icon = CA_PROPS[k].Icon;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => add(k)}
                  className="flex items-center gap-3 w-full h-8 px-1 rounded-lg text-left text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-[background-color,transform] duration-100 active:scale-[0.98]"
                >
                  <Icon size={14} weight="regular" className="shrink-0 text-[#FF47BC]" />
                  {CA_PROPS[k].label}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}