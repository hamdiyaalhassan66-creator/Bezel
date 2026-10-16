import { useEffect } from "react";

export function useSelectOnFocus() {
  useEffect(() => {
    const TYPES = new Set(["", "text", "number", "search", "url", "email", "tel", "password"]);
    const isField = (el) =>
      el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && TYPES.has(el.type));
    const onFocusIn = (e) => {
      const el = e.target;
      if (!isField(el) || el.readOnly || el.disabled) return;
      el.select();
      // The mouseup that ends the click would collapse the selection, so swallow it once.
      const keep = (ev) => ev.preventDefault();
      el.addEventListener("mouseup", keep, { once: true });
      setTimeout(() => el.removeEventListener("mouseup", keep), 300); // focus came from the keyboard: don't leave it armed
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);
}