import React from "react";
import { ArrowCounterClockwise, X, ArrowSquareOut, LinkSimple, PushPin, Copy, PencilSimple, FolderOpen, TrashSimple } from "@phosphor-icons/react";

export function ProjectMenu({
  p, projectMenu, projectMenuRef, setProjectMenu, handleRestoreProject, handlePurgeProject,
  handleOpenProjectInNewTab, handleCopyProjectLink, handleTogglePin, handleDuplicateProject,
  startRenameProject, setMoveTarget, handleDeleteProject,
}) {
        const itemClass =
          "flex items-center gap-2 w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100";
        const run = (fn) => () => {
          setProjectMenu(null);
          fn();
        };
        return (
          <div
            ref={projectMenuRef}
            role="menu"
            style={{ position: "fixed", left: projectMenu.left, top: projectMenu.top, bottom: projectMenu.bottom }}
            className={`${projectMenu.bottom !== undefined ? "pop-enter-up" : "pop-enter"} w-[180px] p-2 flex flex-col items-start bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]`}
          >
            {p.deletedAt ? (
              <div className="flex flex-col gap-1 w-full">
                <button type="button" className={itemClass} onClick={run(() => handleRestoreProject(p.id))}>
                  <ArrowCounterClockwise size={16} weight="regular" className="shrink-0" /> Restore
                </button>
                <button
                  type="button"
                  onClick={run(() => handlePurgeProject(p.id))}
                  className={`${itemClass} hover:!bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438]`}
                >
                  <X size={16} weight="regular" className="shrink-0" /> Delete permanently
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1 w-full">
                  <button type="button" className={itemClass} onClick={run(() => handleOpenProjectInNewTab(p))}>
                    <ArrowSquareOut size={16} weight="regular" className="shrink-0" /> Open in new tab
                  </button>
                  <button type="button" className={itemClass} onClick={run(() => handleCopyProjectLink(p))}>
                    <LinkSimple size={16} weight="regular" className="shrink-0" /> Copy link
                  </button>
                  <button type="button" className={itemClass} onClick={run(() => handleTogglePin(p.id))}>
                    <PushPin size={16} weight={p.pinned ? "fill" : "regular"} className="shrink-0" /> {p.pinned ? "Unpin" : "Pin"}
                  </button>
                </div>
                <div className="my-1 h-px w-full bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />
                <div className="flex flex-col gap-1 w-full">
                  <button type="button" className={itemClass} onClick={run(() => handleDuplicateProject(p))}>
                    <Copy size={16} weight="regular" className="shrink-0" /> Duplicate
                  </button>
                  <button type="button" className={itemClass} onClick={run(() => startRenameProject(p))}>
                    <PencilSimple size={16} weight="regular" className="shrink-0" /> Rename
                  </button>
                  <button type="button" className={itemClass} onClick={run(() => setMoveTarget({ list: [p] }))}>
                    <FolderOpen size={16} weight="regular" className="shrink-0" /> Move
                  </button>
                </div>
                <div className="my-1 h-px w-full bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />
                <div className="flex flex-col gap-1 w-full">
                  <button
                    type="button"
                    onClick={run(() => handleDeleteProject(p.id))}
                    className={`${itemClass} hover:!bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438]`}
                  >
                    <TrashSimple size={16} weight="regular" className="shrink-0" /> Move to Trash
                  </button>
                </div>
              </>
            )}
          </div>
        );
}