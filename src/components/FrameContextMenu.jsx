import React from "react";
import KeyCombo from "../KeyCombo.jsx";
import { CTX_ITEM, CTX_DANGER, CTX_DIVIDER, CtxMenu } from "./timelineParts.jsx";

export function FrameContextMenu({
  frameMenu, setFrameMenu, frames, selectedIds, videoOn, animTab, vidShots, vidLive,
  frameClipRef, askTimeline, vidDuplicate, duplicateSelected, vidGroup, vidUngroup,
  copyFrames, pasteFrames, reorderSelected, toggleHideSelected, toggleLockSelected,
  flipSelected, vidDelete, deleteSelected,
}) {
        const sel = frames.filter((f) => selectedIds.includes(f.id));
        if (!sel.length) return null;
        const allHidden = sel.every((f) => f.hidden);
        const allLocked = sel.every((f) => f.locked);
        const canPaste = !!frameClipRef.current?.length;
        // Timeline-only actions (enter / exit animation, rename, group, ungroup) need Video mode.
        // The Animation tab is excluded too, because its rows come from the template.
        const inTimeline = videoOn && !animTab;
        const row = inTimeline ? vidShots.find((s) => s.frameId != null && selectedIds.includes(s.frameId)) : null;
        const anyGrouped = inTimeline && vidShots.some((s) => s.group && selectedIds.includes(s.frameId));
        const rowsSelected = videoOn && vidLive.current.sel.ids.length > 0;
        const run = (fn) => () => {
          setFrameMenu(null);
          fn();
        };
        const item = (label, keys, fn, { disabled = false } = {}) => (
          <button
            key={label}
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={run(fn)}
            className={`${CTX_ITEM} justify-between disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
          >
            {label}
            {keys && <KeyCombo keys={keys} />}
          </button>
        );
        return (
          <CtxMenu data-frame-menu left={frameMenu.left} top={frameMenu.top} width={240}>
            {row && item("Enter animation", null, () => askTimeline({ type: "anim", kind: "enter", sid: row.id }))}
            {row && item("Exit animation", null, () => askTimeline({ type: "anim", kind: "exit", sid: row.id }))}
            {row && item("Rename", null, () => askTimeline({ type: "rename", sid: row.id }))}
            {item("Duplicate", ["mod", "D"], () => (rowsSelected ? vidDuplicate() : duplicateSelected()))}
            {inTimeline && sel.length >= 2 && item("Group", ["mod", "G"], vidGroup)}
            {anyGrouped && item("Ungroup", ["mod", "⇧", "G"], vidUngroup)}
            {CTX_DIVIDER}
            {item("Copy", ["mod", "C"], copyFrames)}
            {item("Paste here", ["mod", "V"], () => pasteFrames(frameMenu.point), { disabled: !canPaste })}
            {CTX_DIVIDER}
            {item("Bring to front", ["]"], () => reorderSelected(true))}
            {item("Send to back", ["["], () => reorderSelected(false))}
            {CTX_DIVIDER}
            {item(allHidden ? "Show" : "Hide", ["mod", "⇧", "H"], toggleHideSelected)}
            {item(allLocked ? "Unlock" : "Lock", ["mod", "⇧", "L"], toggleLockSelected)}
            {CTX_DIVIDER}
            {item("Flip horizontal", ["⇧", "H"], () => flipSelected("h"))}
            {item("Flip vertical", ["⇧", "V"], () => flipSelected("v"))}
            {CTX_DIVIDER}
            <button
              type="button"
              role="menuitem"
              onClick={run(() => (rowsSelected ? vidDelete() : deleteSelected()))}
              className={CTX_DANGER}
            >
              Delete
              <KeyCombo keys={["⌫"]} />
            </button>
          </CtxMenu>
        );
}