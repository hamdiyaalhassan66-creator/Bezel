import { useEffect } from "react";

export function useAltDuplicateBadge() {
  useEffect(() => {
    const badge = document.createElement("div");
    badge.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"><path d="M5 1.5v7M1.5 5h7"/></svg>';
    Object.assign(badge.style, {
      position: "fixed", left: "0", top: "0", width: "16px", height: "16px", borderRadius: "999px",
      background: "#FF47BC", border: "1px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      display: "none", alignItems: "center", justifyContent: "center",
      pointerEvents: "none", zIndex: "2147483647", transition: "none",
    });
    document.body.appendChild(badge);

    const pos = { x: -1, y: -1 };
    const state = { alt: false, shift: false };

    const refresh = () => {
      let show = false;
      if (state.alt && pos.x >= 0) {
        const el = document.elementFromPoint(pos.x, pos.y);
        if (el && !el.closest?.("[contenteditable]")) {
          const text = el.closest?.("[data-text-box]");
          const frame = el.closest?.("[data-frame-id]");
          show = !!text || (!!frame && !state.shift);
        }
      }
      badge.style.display = show ? "flex" : "none";
      if (show) badge.style.transform = `translate(${pos.x + 12}px, ${pos.y + 12}px)`;
    };

    const onEvent = (e) => {
      if (typeof e.clientX === "number" && e.type.startsWith("pointer")) {
        pos.x = e.clientX;
        pos.y = e.clientY;
      }
      // Every event carries the real modifier state, so a missed keyup is corrected by the next event.
      if (typeof e.altKey === "boolean") {
        state.alt = e.altKey;
        state.shift = e.shiftKey;
      }
      refresh();
    };
    const reset = () => {
      state.alt = false;
      state.shift = false;
      refresh();
    };

    const types = ["keydown", "keyup", "pointermove", "pointerdown", "pointerup", "pointerover"];
    types.forEach((t) => window.addEventListener(t, onEvent, true));
    window.addEventListener("blur", reset);
    window.addEventListener("focus", reset);
    document.addEventListener("visibilitychange", reset);
    window.addEventListener("contextmenu", reset);
    return () => {
      types.forEach((t) => window.removeEventListener(t, onEvent, true));
      window.removeEventListener("blur", reset);
      window.removeEventListener("focus", reset);
      document.removeEventListener("visibilitychange", reset);
      window.removeEventListener("contextmenu", reset);
      badge.remove();
    };
  }, []);
}