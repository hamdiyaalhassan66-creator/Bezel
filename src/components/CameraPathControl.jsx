import { useRef, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import Tooltip from "../Tooltip.jsx";
import { gridFillPins } from "../constants/paramTemplates.js";

const key = (c, r) => `${c},${r}`;

export default function CameraPathControl({ param, value, onChange, count }) {
  const cols = param.cols ?? 7, rows = param.rows ?? 7;
  const pins = gridFillPins(value ?? param.default, count ?? value?.length ?? param.default.length, cols, rows);
  const [sel, setSel] = useState(0);
  const gridRef = useRef(null);
  const drag = useRef(null);
  const at = new Map(pins.map((p, i) => [key(p.c, p.r), i]));
  const cur = Math.min(sel, pins.length - 1);
  const me = pins[cur];

  const moveTo = (i, c, r) => {
    const j = at.get(key(c, r));
    if (j === i) return;
    const next = pins.map((p) => ({ ...p }));
    if (j !== undefined) { next[j].c = next[i].c; next[j].r = next[i].r; } // dropped on another pin: swap places
    next[i].c = c; next[i].r = r;
    onChange(next);
  };
  const cellAt = (e) => {
    const b = gridRef.current.getBoundingClientRect();
    const c = Math.floor(((e.clientX - b.left) / b.width) * cols);
    const r = Math.floor(((e.clientY - b.top) / b.height) * rows);
    return c >= 0 && c < cols && r >= 0 && r < rows ? [c, r] : null;
  };
  const down = (e) => {
    const cell = cellAt(e);
    if (!cell) return;
    const i = at.get(key(...cell));
    if (i === undefined) return moveTo(cur, ...cell); // empty cell: move the selected pin there
    setSel(i);
    drag.current = i;
    gridRef.current.setPointerCapture(e.pointerId);
  };
  const up = (e) => {
    const i = drag.current;
    drag.current = null;
    const cell = i != null && cellAt(e);
    if (cell) moveTo(i, ...cell);
  };
  const setT = (v) => {
    const t = parseFloat(v);
    const next = pins.map((p) => ({ ...p }));
    if (Number.isFinite(t) && t > 0) next[cur].t = t; else delete next[cur].t;
    onChange(next);
  };
  const pt = (p) => `${((p.c + 0.5) / cols) * 100},${((p.r + 0.5) / rows) * 100}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between h-6">
        <span className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">{param.label}</span>
        <Tooltip label="Reset path" placement="bottom" className="shrink-0">
          <button
            type="button"
            aria-label="Reset path"
            onClick={() => onChange(param.default)}
            className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
          >
            <ArrowCounterClockwise size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB]" />
          </button>
        </Tooltip>
      </div>

      <div className="p-1 rounded-[10px] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <div
          ref={gridRef}
          onPointerDown={down}
          onPointerUp={up}
          className="relative grid gap-1 touch-none select-none"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols * rows }, (_, k) => {
            const c = k % cols, r = Math.floor(k / cols);
            const i = at.get(key(c, r));
            const on = i === cur;
            return (
              <div
                key={k}
                className={`aspect-[3/2] rounded-md flex items-center justify-center transition-colors duration-100 ${
                  on ? "bg-[#FF47BC]/10" : "bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333]"
                }`}
              >
                {i !== undefined && (
                  <div
                    className={`relative z-[1] w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums cursor-grab active:cursor-grabbing transition-colors duration-100 ${
                      on
                        ? "bg-[#FF47BC] text-[#FAF9FA]"
                        : "bg-[#FAF9FA] dark:bg-[#171717] text-[#737373] dark:text-[#ABABAB] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10"
                    }`}
                  >
                    {i + 1}
                    {i === 0 && (
                      <span className="absolute -top-1.5 -right-2 text-[9px] leading-none text-[#FF47BC]" title="The path loops back here">↻</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
            <polyline
              points={[...pins, pins[0]].map(pt).join(" ")}
              fill="none" stroke="#FF47BC" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">
          Pin {cur + 1} · ({me.c}, {me.r})
        </span>
        <label
          className="flex items-center gap-1.5 h-8 px-2 rounded-[10px] bg-[#EDEDED] dark:bg-[#292929] hover:bg-[#E3E3E3] dark:hover:bg-[#333333] border border-transparent focus-within:border-[#FF47BC] transition-colors"
          title={cur === 0 ? "Time to loop back to pin 1" : "Time to arrive at this pin"}
        >
          <span className="text-[12px] font-medium text-[#737373] dark:text-[#ABABAB]">→</span>
          <input
            key={cur}
            defaultValue={me.t ?? ""}
            placeholder="auto"
            onBlur={(e) => setT(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-10 bg-transparent text-right text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] placeholder:text-[#737373] outline-none"
          />
          <span className="text-[12px] font-medium text-[#737373] dark:text-[#ABABAB]">s</span>
        </label>
      </div>
    </div>
  );
}