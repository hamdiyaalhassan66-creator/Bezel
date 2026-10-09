export function makeScrubDrag({ value, onChange, min = 1, max = 20000, inputRef, speed = 1 }) {
  return (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    const startX = e.clientX;
    const startVal = value;
    let dragged = false;

    try { el.setPointerCapture?.(e.pointerId); } catch {}

    const styleEl = document.createElement("style");
    styleEl.innerHTML = `* { cursor: ew-resize !important; user-select: none !important; -webkit-user-select: none !important; }`;
    document.head.appendChild(styleEl);

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 2) dragged = true;
      if (!dragged) return;
            const perPx = Math.max(speed, startVal / 500); // bigger values move faster
      const next = Math.round(startVal + dx * perPx * (ev.shiftKey ? 10 : 1));
      onChange(Math.min(max, Math.max(min, next)));
    };

    const onUp = (ev) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try { el.releasePointerCapture?.(ev.pointerId); } catch {}
      styleEl.remove();
      if (!dragged) {
        inputRef?.current?.focus();
        inputRef?.current?.select();
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };
}