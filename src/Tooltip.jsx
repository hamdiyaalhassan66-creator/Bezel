import React, { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { KeyCap } from "./KeyCap.jsx";

const GAP = 8; // space between trigger and tooltip
const VIEWPORT_MARGIN = 8; // never sit closer than this to a viewport edge

const TooltipAncestorContext = createContext(null);

export default function Tooltip({ label, shortcut, children, className = "", placement = "horizontal" }) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef(null);
  const bubbleRef = useRef(null);
  const [pos, setPos] = useState(null);
  const ancestor = useContext(TooltipAncestorContext);

  useLayoutEffect(() => {
    if (!show) {
      setPos(null);
      return;
    }

    const update = () => {
      const trigger = triggerRef.current;
      const bubble = bubbleRef.current;
      if (!trigger || !bubble) return;
      const rect = trigger.getBoundingClientRect();
      const bubbleWidth = bubble.offsetWidth;
      const bubbleHeight = bubble.offsetHeight;

      if (placement === "vertical") {
        const side = rect.top - bubbleHeight - GAP < VIEWPORT_MARGIN ? "bottom" : "top";
        const top = side === "top" ? rect.top - bubbleHeight - GAP : rect.bottom + GAP;
        let left = rect.left + rect.width / 2 - bubbleWidth / 2;
        left = Math.min(
          Math.max(left, VIEWPORT_MARGIN),
          window.innerWidth - bubbleWidth - VIEWPORT_MARGIN
        );
        setPos({ left, top });
        return;
      }

      if (placement === "bottom") {
        const side =
          rect.bottom + GAP + bubbleHeight > window.innerHeight - VIEWPORT_MARGIN ? "top" : "bottom";
        const top = side === "bottom" ? rect.bottom + GAP : rect.top - bubbleHeight - GAP;
        let left = rect.left + rect.width / 2 - bubbleWidth / 2;
        left = Math.min(
          Math.max(left, VIEWPORT_MARGIN),
          window.innerWidth - bubbleWidth - VIEWPORT_MARGIN
        );
        setPos({ left, top });
        return;
      }

      // Horizontal: prefer right of the trigger, flip to left if it would overflow.
      const side = rect.right + GAP + bubbleWidth > window.innerWidth - VIEWPORT_MARGIN ? "left" : "right";
      const left = side === "right" ? rect.right + GAP : rect.left - GAP - bubbleWidth;
      let top = rect.top + rect.height / 2 - bubbleHeight / 2;
      top = Math.min(
        Math.max(top, VIEWPORT_MARGIN),
        window.innerHeight - bubbleHeight - VIEWPORT_MARGIN
      );

      setPos({ left, top });
    };

    // First pass: bubble is rendered (off-screen, invisible) so offsetWidth/
    // offsetHeight are measurable; this runs update() once more with the
    // real size now known.
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [show, placement]);

  const handleEnter = (e) => {
    e.stopPropagation();
    ancestor?.hide(); // a nested trigger just took over — hide whatever ancestor tooltip was showing
    setShow(true);
  };

  const handleLeave = (e) => {
    e.stopPropagation();
    setShow(false);
    // Moving back onto the ancestor's own trigger area doesn't fire the
    // ancestor's mouseenter — its box never stopped containing the
    // pointer — so it never re-shows on its own. Restore it explicitly
    // when that's where the pointer is actually headed.
    const related = e.relatedTarget;
    if (ancestor?.triggerRef.current && related && ancestor.triggerRef.current.contains(related)) {
      ancestor.show();
    }
  };

  return (
    <TooltipAncestorContext.Provider value={{ hide: () => setShow(false), show: () => setShow(true), triggerRef }}>
      <span
        ref={triggerRef}
        className={`relative inline-flex ${className}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
      >
        {children}
        {show && label && createPortal(
          <span
            ref={bubbleRef}
            className={`pointer-events-none fixed z-[10000] flex items-center gap-2 w-fit py-1 ${shortcut ? "pl-2 pr-1" : "px-2"} bg-white dark:bg-[#1F1F1F] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shadow-[0px_3px_13.4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)] rounded-lg ${pos ? "tooltip-enter" : ""}`}
            style={pos ? { left: pos.left, top: pos.top, visibility: "visible" } : { left: -9999, top: -9999, visibility: "hidden" }}
          >
            <span className="font-[Inter,'Helvetica_Neue',Arial,sans-serif] font-semibold text-[12px] leading-[18px] text-center text-[#3A3A3A] dark:text-[#FAF9FA] whitespace-nowrap">
              {label}
            </span>
            {shortcut && (
              <span className="flex items-center gap-1 shrink-0">
                {shortcut.map((k) => (
                  <KeyCap key={k}>{k}</KeyCap>
                ))}
              </span>
            )}
          </span>,
          document.body
        )}
      </span>
    </TooltipAncestorContext.Provider>
  );
}