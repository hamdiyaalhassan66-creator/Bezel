import React from "react";
import { Crop, Eye, EyeSlash, X } from "@phosphor-icons/react";
import Tooltip from "../Tooltip.jsx";
import { Skeleton } from "./controls.jsx";
import { defaultAnimImage } from "../constants/defaultImages.js";

export function AnimAssetList({
  frames, animAssetCount, animPool, animSel, setAnimSel, animHover, setAnimHover,
  animSlotRef, pickFrameFile, animDragRef, animDragFrom, setAnimDragFrom,
  animDrop, setAnimDrop, moveAnimAsset, endAnimDrag, setFrameCropId, setFrames,
  removeAnimAsset, clearAnimAssets, mediaLoading,
}) {
    const n = animAssetCount(frames);
    const pool = animPool().slice(0, n);
    const filled = pool.some(Boolean);
    const pickSlot = (i) => {
      setAnimSel(i);
      animSlotRef.current = i;
      pickFrameFile(null);
    };
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between h-8">
          <span className="text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">
            {n} {n === 1 ? "Asset" : "Assets"}
          </span>
          <button
            type="button"
            disabled={!filled}
            onClick={clearAnimAssets}
            className="h-6 px-1.5 rounded-md text-[12px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB] hover:bg-[#F04438]/10 hover:text-[#F04438] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#737373]"
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-col">
          {pool.map((img, i) => {
            const fr = frames[i];
            const selected = animSel === i;
            const hidden = !!fr?.hidden;
            const thumb = img ? (img.cropUrl ?? img.url) : defaultAnimImage(i).url;
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                draggable
                data-asset-row={`animrow-${i}`}
                onDragStart={(e) => {
                  animDragRef.current = i;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                  setTimeout(() => setAnimDragFrom(i), 0); // deferred so the drag ghost stays opaque
                }}
                onDragOver={(e) => {
                  if (animDragRef.current == null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (animDragRef.current === i) return setAnimDrop(null);
                  const r = e.currentTarget.getBoundingClientRect();
                  const pos = e.clientY < r.top + r.height / 2 ? "before" : "after";
                  setAnimDrop((p) => (p && p.idx === i && p.pos === pos ? p : { idx: i, pos }));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (animDragRef.current != null && animDrop) moveAnimAsset(animDragRef.current, animDrop.idx, animDrop.pos);
                  endAnimDrag();
                }}
                onDragEnd={endAnimDrag}
                onClick={() => setAnimSel(i)}
                onPointerEnter={() => setAnimHover(i)}
                onPointerLeave={() => setAnimHover(null)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAnimSel(i)}
                className={`group relative flex items-center h-11 pl-1 pr-1 gap-2 rounded-lg cursor-grab active:cursor-grabbing transition-[background-color,opacity] duration-100 ${
                  selected
                    ? "bg-[#FF47BC]/10"
                    : animHover === i
                    ? "bg-[#F2F2F2] dark:bg-[#1F1F1F]"
                    : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                } ${animDragFrom === i ? "opacity-40" : ""} ${animDragFrom !== null ? "[&>*]:pointer-events-none" : ""}`}
              >
                {animDrop?.idx === i && (
                  <div
                    aria-hidden
                    className={`absolute left-0 right-0 h-0.5 bg-[#FF47BC] pointer-events-none z-10 ${
                      animDrop.pos === "before" ? "-top-px" : "-bottom-px"
                    }`}
                  >
                    <span className="absolute -left-0.5 -top-[3px] w-2 h-2 rounded-full bg-[#FAF9FA] dark:bg-[#171717] border-2 border-[#FF47BC]" />
                  </div>
                )}
                <span className="w-4 shrink-0 text-center text-[12px] font-medium tabular-nums text-[#737373] dark:text-[#ABABAB]">{i + 1}</span>
                <div
                  aria-label={img ? "Replace image" : "Add image"}
                  onClick={(e) => {
                    e.stopPropagation();
                    pickSlot(i); // fills an empty slot, or replaces this slot's image
                  }}
                  className={`w-8 h-8 rounded-md shrink-0 bg-cover bg-center bg-[#EDEDED] dark:bg-[#292929] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 cursor-pointer ${hidden ? "opacity-40" : ""}`}
                  style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                />
                <span
                  className={`flex-1 min-w-0 truncate text-[13px] font-medium tracking-[-0.005em] transition-colors ${
                    selected || animHover === i ? "text-[#3A3A3A] dark:text-[#FAF9FA]" : "text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                  } ${hidden ? "opacity-50" : ""}`}
                >
                  {img?.label ?? defaultAnimImage(i).label}
                </span>
                <Tooltip label="Crop" placement="bottom" className="shrink-0">
                  <button
                    type="button"
                    aria-label="Crop"
                    disabled={!img || !!img.video || !fr}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFrameCropId(fr.id);
                    }}
                    className="group flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Crop size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
                  </button>
                </Tooltip>
                <Tooltip label={hidden ? "Show" : "Hide"} placement="bottom" className="shrink-0 -ml-1">
                  <button
                    type="button"
                    aria-label={hidden ? "Show" : "Hide"}
                    disabled={!img || !fr}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFrames((prev) => prev.map((x, k) => ((x.asset ?? k) === i ? { ...x, hidden: !x.hidden } : x)));
                    }}
                    className="group flex items-center justify-center w-5 h-5 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {hidden ? (
                      <EyeSlash size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
                    ) : (
                      <Eye size={14} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-enabled:group-hover:text-[#3A3A3A] dark:group-enabled:group-hover:text-[#FAF9FA] transition-colors" />
                    )}
                  </button>
                </Tooltip>
                <Tooltip label="Remove" placement="bottom" className="shrink-0 -ml-1">
                  <button
                    type="button"
                    aria-label="Remove"
                    disabled={!img}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAnimAsset(i);
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