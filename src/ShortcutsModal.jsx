import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, MagnifyingGlass } from "@phosphor-icons/react";
import Tooltip from "./Tooltip.jsx";
import { IS_MAC, KeyCap } from "./KeyCap.jsx";

export { IS_MAC, KeyCap };
export const ALT = IS_MAC ? "⌥" : "Alt";

// Single source of truth: the modal renders this, and the key handler in App.jsx acts on the same ids.
export const SHORTCUT_GROUPS = [
  {
    title: "Project",
    items: [
      { id: "new", label: "New project", keys: ["N"] },
      { id: "save", label: "Save project", keys: ["mod", "S"] },
      { id: "saveCopy", label: "Save as copy", keys: ["mod", "⇧", "S"] },
      { id: "export", label: "Export", keys: ["mod", "E"] },
      { id: "undo", label: "Undo", keys: ["mod", "Z"] },
      { id: "redo", label: "Redo", keys: ["mod", "⇧", "Z"] },
      { id: "redoAlt", label: "Redo (alternate)", keys: ["mod", "Y"] },
    ],
  },
  {
    title: "View",
    items: [
      { id: "sidebar", label: "Toggle sidebar", keys: ["mod", "\\"] },
      { id: "devices", label: "Devices panel", keys: ["D"] },
      { id: "projects", label: "Projects panel", keys: ["P"] },
      { id: "templates", label: "Templates panel", keys: ["L"] },
      { id: "mockup", label: "Mockup mode", keys: ["M"] },
      { id: "frame", label: "Frame mode", keys: ["F"] },
      { id: "image", label: "Image mode", keys: ["I"] },
      { id: "video", label: "Video mode", keys: ["V"] },
      { id: "textTool", label: "Text tool (click canvas to place)", keys: ["T"] },
      { id: "cancelTextTool", label: "Cancel text tool", keys: ["Esc"] },
      { id: "theme", label: "Cycle theme", keys: ["C"] },
    ],
  },
  {
    title: "Camera",
    items: [
      { id: "resetCamera", label: "Reset camera", keys: ["R"] },
      { id: "preset1", label: "Hero view", keys: ["1"] },
      { id: "preset2", label: "Right-angled view", keys: ["2"] },
      { id: "preset3", label: "Front view", keys: ["3"] },
      { id: "preset4", label: "Bottom view", keys: ["4"] },
    ],
  },
    {
    title: "Frames",
    items: [
      { id: "alignLeft", label: "Align left", keys: [ALT, "A"] },
      { id: "alignHCenter", label: "Align horizontal centers", keys: [ALT, "H"] },
      { id: "alignRight", label: "Align right", keys: [ALT, "D"] },
      { id: "alignTop", label: "Align top", keys: [ALT, "W"] },
      { id: "alignVCenter", label: "Align vertical centers", keys: [ALT, "V"] },
      { id: "alignBottom", label: "Align bottom", keys: [ALT, "S"] },
      { id: "distH", label: "Distribute horizontal spacing", keys: [ALT, "⇧", "H"] },
      { id: "distV", label: "Distribute vertical spacing", keys: [ALT, "⇧", "V"] },
      { id: "selectAll", label: "Select all frames", keys: ["mod", "A"] },
      { id: "duplicate", label: "Duplicate selected frames", keys: ["mod", "D"] },
      { id: "deleteFrame", label: "Delete selected frames", keys: ["Delete"] },
      { id: "duplicateDrag", label: "Duplicate frame while dragging", keys: [ALT, "Drag"] },
      { id: "soloFrame", label: "Select one frame from a group", keys: ["Double-click"] },
    ],
  },
  {
    title: "Text",
    items: [
      { id: "editText", label: "Edit text on canvas", keys: ["Double-click"] },
      { id: "duplicateText", label: "Duplicate selected text", keys: ["mod", "D"] },
      { id: "duplicateTextDrag", label: "Duplicate text while dragging", keys: [ALT, "Drag"] },
      { id: "deleteText", label: "Delete selected text", keys: ["Delete"] },
      { id: "endEdit", label: "Finish editing text", keys: ["Esc"] },
    ],
  },
  {
    title: "Video timeline",
    items: [
      { id: "vidPlay", label: "Play / pause", keys: ["Space"] },
      { id: "vidAddShot", label: "Add shot", keys: ["S"] },
      { id: "vidAddKey", label: "Add keyframe at playhead", keys: ["K"] },
      { id: "vidRemoveKey", label: "Remove keyframe at playhead", keys: ["⇧", "K"] },
      { id: "vidLoop", label: "Toggle loop", keys: ["⇧", "L"] },
      { id: "vidPrev", label: "Previous frame", keys: ["←"] },
      { id: "vidNext", label: "Next frame", keys: ["→"] },
      { id: "vidMoveKey", label: "Move selected keyframe (or playhead) 10 frames back", keys: ["⇧", "←"] },
      { id: "vidMoveKeyFwd", label: "Move selected keyframe (or playhead) 10 frames forward", keys: ["⇧", "→"] },
      { id: "vidDuplicate", label: "Duplicate selected rows", keys: ["mod", "D"] },
      { id: "vidGroup", label: "Group selected shots", keys: ["mod", "G"] },
      { id: "vidUngroup", label: "Ungroup", keys: ["mod", "⇧", "G"] },
      { id: "vidRename", label: "Rename row", keys: ["Double-click"] },
      { id: "vidDelete", label: "Delete selected rows or keyframe", keys: ["Delete"] },
      { id: "vidZoom", label: "Zoom timeline", keys: ["mod", "Scroll"] },
      { id: "vidSelectMulti", label: "Select multiple shots", keys: ["⇧", "Click"] },
    ],
  },
{
  title: "Canvas",
  items: [
    { id: "zoomScroll", label: "Zoom (Frame mode)", keys: ["Scroll"] },
    { id: "multiSelect", label: "Add or remove frame from selection", keys: ["⇧", "Click"] },
    { id: "marquee", label: "Select frames by dragging", keys: ["Drag"] },
    { id: "resizeRatio", label: "Resize keeping aspect ratio", keys: ["⇧", "Drag"] },
  ],
},
{
  title: "Number fields",
  items: [
    { id: "scrub", label: "Scrub value", keys: [ALT, "Drag"] },
    { id: "scrubFast", label: "Scrub or step 10× faster", keys: ["⇧"] },
    { id: "step", label: "Step value", keys: ["↑", "↓"] },
  ],
},
  {
    title: "Help",
    items: [
      { id: "shortcuts", label: "Keyboard shortcuts", keys: ["?"] },
      { id: "close", label: "Close dialog", keys: ["Esc"] },
    ],
  },
];

export default function ShortcutsModal({ onClose }) {
  const dialogRef = useRef(null);
  const searchRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [query, setQuery] = useState("");
  const queryRef = useRef(query);
  queryRef.current = query;

  const q = query.trim().toLowerCase();
  const visibleGroups = SHORTCUT_GROUPS.map((group) => ({
    ...group,
    items: q
      ? group.items.filter(
          (item) =>
            group.title.toLowerCase().includes(q) ||
            item.label.toLowerCase().includes(q) ||
            item.keys.some((k) => String(k).toLowerCase().includes(q))
        )
      : group.items,
  })).filter((group) => group.items.length > 0);

  // Edge fades: show a gradient on whichever side has more content past it.
  const scrollRef = useRef(null);
  const [edge, setEdge] = useState({ top: false, bottom: false });
  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdge((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
  }, []);
  useLayoutEffect(measure); // every render, so searching (which changes the list height) re-checks
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  // Focus the search on open, Esc clears the search then closes, and hand focus back to whatever had it before.
  useEffect(() => {
    const previous = document.activeElement;
    (searchRef.current ?? dialogRef.current)?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (queryRef.current) {
          setQuery("");
          return;
        }
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  return (
    <div
      className="backdrop-enter fixed inset-0 z-[10000] flex items-center justify-center bg-black/20"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        className="modal-enter flex flex-col w-[400px] max-w-[calc(100vw-32px)] max-h-[min(650px,calc(100vh-32px))] outline-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between h-12 pl-4 pr-2 py-2 bg-white dark:bg-[#1A1A1D] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-t-2xl shrink-0">
          <span className="section-title text-[14px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA]">
            Keyboard shortcuts
          </span>
          <Tooltip label="Close">
            <button
              type="button"
              onClick={onClose}
              className="group flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94] shrink-0"
            >
              <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
            </button>
          </Tooltip>
        </div>

        <div className="px-4 pt-4 shrink-0 bg-white dark:bg-[#1A1A1D] border-x border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
          <label className="flex items-center gap-2 w-full h-[33px] p-2 box-border cursor-text bg-[#F5F5F5] dark:bg-[#292929] border border-[#3A3A3A]/5 dark:border-[#FAF9FA]/5 focus-within:border-[#FF47BC] dark:focus-within:border-[#FF47BC] rounded-[10px] transition-colors duration-150">
            <MagnifyingGlass size={14} weight="regular" className="shrink-0 text-[#8C8C8C] dark:text-[#707070]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shortcuts"
              spellCheck={false}
              className="w-full min-w-0 bg-transparent outline-none text-[12px] leading-[15px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] placeholder:text-[#8C8C8C] dark:placeholder:text-[#707070]"
            />
          </label>
        </div>

        <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden bg-white dark:bg-[#1A1A1D] border-x border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-b-3xl">
          <div ref={scrollRef} className="flex flex-col gap-6 p-4 flex-1 min-h-0 overflow-y-auto custom-scroll">
          {visibleGroups.length === 0 && (
            <span className="py-6 text-center text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
              No shortcuts match your search
            </span>
          )}
          {visibleGroups.map((group) => (
            <section key={group.title} className="flex flex-col gap-1">
              <h3 className="device-title mb-1 uppercase text-[#8C8C8C] dark:text-[#9A9A9A]">
                {group.title}
              </h3>
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 h-8">
                  <span className="text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
                    {item.label}
                  </span>
                  <span className="shortcut-keys flex items-center gap-1 shrink-0">
                    {item.keys.map((k) => (
                      <KeyCap key={k}>{k}</KeyCap>
                    ))}
                  </span>
                </div>
              ))}
            </section>
          ))}
          </div>
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white dark:from-[#1A1A1D] to-transparent transition-opacity duration-200 ${edge.top ? "opacity-100" : "opacity-0"}`}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white dark:from-[#1A1A1D] to-transparent transition-opacity duration-200 ${edge.bottom ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      </div>
    </div>
  );
}