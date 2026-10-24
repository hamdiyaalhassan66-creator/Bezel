import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Check, WarningCircle, TrashSimple, ArrowCounterClockwise, ArrowClockwise, Copy, LinkSimple,
  PushPin, PencilSimple, FolderOpen, DownloadSimple, FloppyDisk, Plus, CircleNotch,
} from "@phosphor-icons/react";

const MAX = 3; // oldest toast is dropped when a 4th arrives
const EXIT_MS = 160; // keep in sync with bezel-toast-out below
// Enter drops in from above, exit lifts back up. Same easing as the rest of the app's popups.
const TOAST_CSS = `
@keyframes bezel-toast-in {
  from { opacity: 0; transform: translateY(-10px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}
@keyframes bezel-toast-out {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: translateY(-6px) scale(0.98); }
}
.bezel-toast-in  { animation: bezel-toast-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.bezel-toast-out { animation: bezel-toast-out ${EXIT_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  @keyframes bezel-toast-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes bezel-toast-out { from { opacity: 1; } to { opacity: 0; } }
}
`;

// message -> icon. First match wins. Pass `icon` (a Phosphor component) in toast() opts to override.
const RULES = [
  [/undone/i, ArrowCounterClockwise],
  [/redone/i, ArrowClockwise],
  [/restored/i, ArrowCounterClockwise],
  [/…$|\.\.\.$/, CircleNotch, true], // in progress: spinner
  [/export/i, DownloadSimple],
  [/trash|delet/i, TrashSimple],
  [/link copied/i, LinkSimple],
  [/duplicat/i, Copy],
  [/pinned/i, PushPin],
  [/renamed/i, PencilSimple],
  [/folder|moved/i, FolderOpen],
  [/saved|save/i, FloppyDisk],
  [/new project/i, Plus],
];
const iconFor = (t) => {
  if (t.type === "error") return { Icon: WarningCircle, cls: "text-[#F04438]" };
  if (t.icon) return { Icon: t.icon, cls: "" };
  const hit = RULES.find(([re]) => re.test(t.message));
  return hit ? { Icon: hit[1], cls: hit[2] ? "animate-spin" : "" } : { Icon: Check, cls: "" };
};

export function Toaster() {
  const [items, setItems] = useState([]); // { id, message, type, action, icon, ms, leaving }
  const [anchor, setAnchor] = useState(null); // { left, top } of the canvas's top center
  const timers = useRef(new Map());
  const nextId = useRef(1);
  const els = useRef(new Map()); // id -> card element
  const tops = useRef(new Map()); // id -> last layout position

  // When a toast is added or removed, the others move. Start each one at its old position and ease it to the new one.
  // Uses the `translate` property so it doesn't fight the enter / exit animation, which uses `transform`.
  useLayoutEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    els.current.forEach((el, id) => {
      const top = el.offsetTop; // layout position, unaffected by transforms
      const prev = tops.current.get(id);
      tops.current.set(id, top);
      if (prev == null || prev === top || reduce) return;
      el.style.transition = "none";
      el.style.translate = `0 ${prev - top}px`;
      void el.offsetHeight; // commit the starting position before animating
      el.style.transition = "translate 200ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.translate = "0 0";
    });
    tops.current.forEach((_, id) => !els.current.has(id) && tops.current.delete(id));
  }, [items]);

  // sits at the top center of the canvas, not the window, so it follows the sidebars opening and closing
  const measure = () => {
    const el = document.querySelector('[data-tour="canvas"]');
    if (!el) return setAnchor(null);
    const r = el.getBoundingClientRect();
    setAnchor({ left: r.left + r.width / 2, top: r.top + 16 });
  };

  const dismiss = (id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((p) => p.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), EXIT_MS);
  };
  const arm = (id, ms) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => dismiss(id), ms));
  };

  useEffect(() => {
    const onToast = (e) => {
      const { message, type = "success", action = null, duration, icon = null } = e.detail ?? {};
      if (!message) return;
      measure();
      const id = nextId.current++;
      const ms = duration ?? (action ? 5000 : 2400); // toasts with an action stay long enough to use it
      // the same message replaces its older copy, so bulk actions don't stack identical toasts
      setItems((p) => [...p.filter((t) => t.message !== message).slice(-(MAX - 1)), { id, message, type, action, icon, ms }]);
      arm(id, ms);
    };
    window.addEventListener("bezel:toast", onToast);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("bezel:toast", onToast);
      window.removeEventListener("resize", measure);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ left: anchor?.left ?? "50%", top: anchor?.top ?? 24 }}
      className="fixed -translate-x-1/2 z-[9999] flex flex-col-reverse items-center gap-2 pointer-events-none"
    >
      <style>{TOAST_CSS}</style>
      {items.map((t) => {
        const { Icon, cls } = iconFor(t);
        return (
          <div
            key={t.id}
            ref={(el) => (el ? els.current.set(t.id, el) : els.current.delete(t.id))}
            onMouseEnter={() => clearTimeout(timers.current.get(t.id))} // hovering holds the toast
            onMouseLeave={() => !t.leaving && arm(t.id, 1200)}
            className={`${t.leaving ? "bezel-toast-out" : "bezel-toast-in"} pointer-events-auto flex items-center gap-2 h-9 pl-3 ${
              t.action ? "pr-1.5" : "pr-3.5"
            } rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 bg-[#FFFFFF] dark:bg-[#171717] text-[13px] font-medium text-[#3A3A3A] dark:text-[#FAF9FA] shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)]`}
          >
            <Icon size={16} weight="regular" className={`shrink-0 ${cls}`} />
            <span className="whitespace-nowrap">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
                className="h-6 px-2.5 ml-1 rounded-lg font-semibold text-[#3A3A3A] dark:text-[#FAF9FA] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-[background-color,transform] duration-150 active:scale-[0.96]"
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}