import React from "react";

// Figma-style gradient line with two free handles. x0/y0/x1/y1 are % of the canvas.
export function PbHandles({ width, height, x0, y0, x1, y1, onChange, z = "z-30" }) {
  const a = { x: (x0 / 100) * width, y: (y0 / 100) * height };
  const b = { x: (x1 / 100) * width, y: (y1 / 100) * height };

  const drag = (which) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const r = e.currentTarget.parentElement.getBoundingClientRect();
    const move = (ev) => {
      const px = Math.min(100, Math.max(0, Math.round(((ev.clientX - r.left) / r.width) * 1000) / 10));
      const py = Math.min(100, Math.max(0, Math.round(((ev.clientY - r.top) / r.height) * 1000) / 10));
      onChange(which === "start" ? { x0: px, y0: py } : { x1: px, y1: py });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const dot = "absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border border-[#8C8C8C] pointer-events-auto cursor-move shadow-[0_1px_3px_rgba(0,0,0,0.25)]";
  return (
    <div aria-hidden className={`absolute inset-0 ${z} pointer-events-none`}>
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#8C8C8C" strokeWidth="1" />
      </svg>
      <div data-handle className={dot} style={{ left: a.x, top: a.y }} onPointerDown={drag("start")} />
      <div data-handle className={dot} style={{ left: b.x, top: b.y }} onPointerDown={drag("end")} />
    </div>
  );
}