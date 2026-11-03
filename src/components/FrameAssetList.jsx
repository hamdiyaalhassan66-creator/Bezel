import React from "react";
import { Crop, Eye, EyeSlash, X } from "@phosphor-icons/react";
import Tooltip from "../Tooltip.jsx";
import { Skeleton } from "./controls.jsx";

export function FrameAssetList({
  frames, selectedIds, setSelectedIds, setSelectedTextId, setFrames,
  dragIdRef, draggingId, setDraggingId, frameDrop, setFrameDrop,
  moveFrameRow, endFrameDrag, openFrameMenu, pickFrameFile, setFrameCropId,
  deleteFrames, mediaLoading,
}) {
    const rows = [...frames];
    const n = frames.length;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between h-8">
          <span className="text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">
            {n} {n === 1 ? "Asset" : "Assets"}
          </span>
          <button
            type="button"
            disabled={!frames.some((f) => f.img) && n <= 1}
            onClick={() => deleteFrames(frames.map((f) => f.id))}
            className="h-6 px-1.5 rounded-md text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB] hover:bg-[#F04438]/10 hover:text-[#F04438] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#737373]"
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-col">
          {rows.map((f, i) => {
            const selected = selectedIds.includes(f.id);
            const thumb = f.img ? (f.img.cropUrl ?? f.img.url) : `${import.meta.env.BASE_URL}mockup-defaults/frame.png`;
            const select = (shift) => {
              setSelectedTextId(null);
              setSelectedIds((ids) => (shift ? (ids.includes(f.id) ? ids.filter((x) => x !== f.id) : [...ids, f.id]) : [f.id]));
            };
            return (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                draggable
                data-asset-row={`framerow-${f.id}`}
                onDragStart={(e) => {
                  dragIdRef.current = f.id;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(f.id));
                  setTimeout(() => setDraggingId(f.id), 0); // deferred so the drag ghost stays opaque
                }}
                onDragOver={(e) => {
                  if (dragIdRef.current == null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragIdRef.current === f.id) return setFrameDrop(null);
                  const r = e.currentTarget.getBoundingClientRect();
                  const pos = e.clientY < r.top + r.height / 2 ? "before" : "after";
                  setFrameDrop((p) => (p && p.id === f.id && p.pos === pos ? p : { id: f.id, pos }));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdRef.current != null && frameDrop) moveFrameRow(dragIdRef.current, frameDrop.id, frameDrop.pos);
                  endFrameDrag();
                }}
                onDragEnd={endFrameDrag}
                onClick={(e) => select(e.shiftKey)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!selected) {
                    setSelectedTextId(null);
                    setSelectedIds([f.id]);
                  }
                  openFrameMenu({ x: e.clientX, y: e.clientY, fromPanel: true });
                }}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select(e.shiftKey)}
                className={`group relative flex items-center h-11 pl-1 pr-1 gap-2 rounded-lg cursor-grab active:cursor-grabbing transition-[background-color,opacity] duration-100 ${
                  selected ? "bg-[#FF47BC]/10" : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                } ${draggingId === f.id ? "opacity-40" : ""} ${draggingId !== null ? "[&>*]:pointer-events-none" : ""}`}
              >
                {frameDrop?.id === f.id && (
                  <div
                    aria-hidden
                    className={`absolute left-0 right-0 h-0.5 bg-[#FF47BC] pointer-events-none z-10 ${
                      frameDrop.pos === "before" ? "-top-px" : "-bottom-px"
                    }`}
                  >
                    <span className="absolute -left-0.5 -top-[3px] w-2 h-2 rounded-full bg-[#FAF9FA] dark:bg-[#171717] border-2 border-[#FF47BC]" />
                  </div>
                )}
                <span className="w-4 shrink-0 text-center text-[12px] font-medium tabular-nums text-[#737373] dark:text-[#ABABAB]">{i + 1}</span>
                <div
                  aria-label={f.img ? "Replace image" : "Add image"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIds([f.id]);
                    pickFrameFile([f.id]); // empty frames get an image, filled ones get it replaced
                  }}
                  className={`w-8 h-8 rounded-md shrink-0 bg-cover bg-center bg-[#EDEDED] dark:bg-[#292929] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 cursor-pointer ${f.hidden ? "opacity-40" : ""}`}
                  style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                />
                <span
                  className={`flex-1 min-w-0 truncate text-[13px] font-medium tracking-[-0.005em] transition-colors ${
                    selected ? "text-[#3A3A3A] dark:text-[#FAF9FA]" : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                  } ${f.hidden ? "opacity-50" : ""}`}
                >
                  {f.img?.label ?? `Default ${i + 1}`}{f.locked ? " (locked)" : ""}
                </span>
                <Tooltip label="Crop" placement="bottom" className="shrink-0">
                  <button
                    type="button"
                    aria-label="Crop"
                    disabled={!f.img || !!f.img.video}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFrameCropId(f.id);
                    }}
                    className="group flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Crop size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
                  </button>
                </Tooltip>
                <Tooltip label={f.hidden ? "Show" : "Hide"} placement="bottom" className="shrink-0 -ml-1">
                  <button
                    type="button"
                    aria-label={f.hidden ? "Show" : "Hide"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFrames((prev) => prev.map((x) => (x.id === f.id ? { ...x, hidden: !x.hidden } : x)));
                    }}
                    className="group flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
                  >
                    {f.hidden ? (
                      <EyeSlash size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                    ) : (
                      <Eye size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                    )}
                  </button>
                </Tooltip>
                <Tooltip label="Delete frame" placement="bottom" className="shrink-0 -ml-1">
                  <button
                    type="button"
                    aria-label="Delete frame"
                    disabled={n === 1 && !f.img}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFrames([f.id]);
                    }}
                    className="group/x flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover/x:text-[#F04438] transition-colors" />
                  </button>
                </Tooltip>
              </div>
            );
          })}
          {mediaLoading > 0 && (
            <div className="flex items-center h-11 pl-1 pr-1 gap-2">
              <Skeleton className="w-4 h-3 rounded" />
              <Skeleton className="w-8 h-8 rounded-md shrink-0" />
              <Skeleton className="flex-1 h-3 rounded" />
            </div>
          )}
        </div>
      </div>
    );
}