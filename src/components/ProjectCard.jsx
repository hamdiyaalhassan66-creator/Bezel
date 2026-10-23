import React from "react";
import { DotsThreeVertical, Devices, CornersOut, FilmStrip, Folder, PushPin, Check } from "@phosphor-icons/react";
import { formatEditedAt } from "../lib/appUtils.js";

export function ProjectCard({
  p, selected, onOpen, onMenu, menuOpen,
  renaming, renameDraft, onRenameDraft, onRenameCommit, onRenameCancel,
  thumbClass = "h-[117px]", layout = "card", showKind = false,
  draggable = false, dragging = false, onDragStart, onDragEnd, index, metaText,
  checked = false, onCheck, onPin,
}) {
  const KindIcon = p.kind === "folder" ? Folder : p.kind === "animation" ? FilmStrip : p.kind === "frame" ? CornersOut : Devices;

  const title = renaming ? (
    <input
      autoFocus
      value={renameDraft}
      onChange={(e) => onRenameDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.stopPropagation()}
      onBlur={onRenameCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          onRenameCancel();
          e.currentTarget.blur();
        }
      }}
      className="w-full h-5 -my-0.5 px-1 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]"
    />
  ) : (
    <span
      className={`w-full min-h-[16px] text-left text-[12px] font-medium leading-4 tracking-[-0.005em] truncate ${
        selected ? "text-[#FF47BC]" : "text-[#3A3A3A] dark:text-[#FAF9FA]"
      }`}
    >
      {p.title}
    </span>
  );

  const meta = (
    <span
      className={`w-full text-left text-[12px] font-medium leading-4 tracking-[-0.005em] ${
        selected ? "text-[#FF47BC]/80" : "text-[#8C8C8C] dark:text-[#9A9A9A]"
      }`}
    >
      {metaText ?? <>{formatEditedAt(p.editedAt)}{{ mockup: " · Mockup", frame: " · Frame", animation: " · Animation" }[p.kind] ?? ""}</>}
    </span>
  );

  const menu = (
    <button
      type="button"
      data-project-menu-trigger
      aria-label="Project options"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      onClick={(e) => onMenu(e, p.id)}
      className={`group/dots absolute right-2 ${layout === "row" ? "top-1/2 -translate-y-1/2" : "bottom-3"} flex items-center justify-center w-7 h-7 rounded-lg transition-[background-color,transform] duration-150 active:scale-[0.94] ${
        menuOpen ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      <DotsThreeVertical
        size={16}
        weight="regular"
        className={`transition-colors ${
          selected
            ? "text-[#FF47BC]/80 group-hover/dots:text-[#FF47BC]"
            : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover/dots:text-[#3A3A3A] dark:group-hover/dots:text-[#FAF9FA]"
        }`}
      />
    </button>
  );

  const badge = showKind && (
    <div
      className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
        selected ? "bg-[#FF47BC]/10 text-[#FF47BC]" : "bg-[#EDEDED] dark:bg-[#292929] text-[#8C8C8C] dark:text-[#9A9A9A]"
      }`}
    >
      <KindIcon size={16} weight="regular" />
    </div>
  );

  const text = <div className="flex flex-col items-start gap-1 min-w-0 flex-1 pr-8">{title}{meta}</div>;

  const shared = {
    role: "button",
    tabIndex: 0,
    draggable,
    onDragStart,
    onDragEnd,
    onClick: () => !renaming && onOpen(p),
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(p);
      }
    },
    style: index != null ? { animationDelay: `${Math.min(index, 8) * 30}ms` } : undefined,
  };
  const base = `group relative w-full rounded-2xl cursor-pointer text-left transition-[background-color,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    index != null ? "template-enter" : ""
  } ${dragging ? "opacity-40" : ""} ${selected ? "bg-[#FF47BC]/10" : "hover:bg-black/[0.03] dark:hover:bg-white/5"}`;

  const thumb = (cls) => (
    <div className={`relative ${cls} shrink-0`}>
      <div
        className={`absolute inset-0 rounded-lg ${
          p.kind === "folder" ? "bg-black/[0.04] dark:bg-white/10" : "bg-[#EDEDED] dark:bg-[#292929]"
        } bg-cover bg-center overflow-hidden transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.015]`}
        style={p.thumb ? { backgroundImage: `url(${p.thumb})` } : undefined}
      />
      {onCheck && (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={checked ? "Deselect" : "Select"}
          onClick={(e) => {
            e.stopPropagation();
            onCheck();
          }}
          className={`absolute top-2 left-2 z-10 flex items-center justify-center w-5 h-5 rounded-md border transition-[opacity,background-color,border-color,transform] duration-150 active:scale-[0.92] focus-visible:opacity-100 group-hover:opacity-100 ${
            checked
              ? "opacity-100 bg-[#FF47BC] border-[#FF47BC] text-white"
              : "opacity-0 bg-white/80 dark:bg-[#292929]/80 border-[#3A3A3A]/20 dark:border-[#FAF9FA]/20 hover:bg-white dark:hover:bg-[#292929]"
          }`}
        >
          {checked && <Check size={12} weight="bold" />}
        </button>
      )}
      {onPin && (
        <button
          type="button"
          aria-label={p.pinned ? "Unpin" : "Pin"}
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className={`absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/55 transition-[opacity,background-color,transform] duration-150 active:scale-[0.92] focus-visible:opacity-100 group-hover:opacity-100 ${
            p.pinned ? "opacity-100" : "opacity-0"
          }`}
        >
          <PushPin size={14} weight={p.pinned ? "fill" : "regular"} />
        </button>
      )}
    </div>
  );

  if (layout === "row") {
    return (
      <div {...shared} className={`${base} flex items-center gap-3 p-2 pr-11`}>
        {thumb("w-24 h-14")}
        {badge}
        {text}
        {menu}
      </div>
    );
  }

  return (
    <div {...shared} className={`${base} flex flex-col items-start gap-2 p-2`}>
      {thumb(`w-full ${thumbClass}`)}
      <div className="flex items-center gap-2 w-full">
        {badge}
        {text}
      </div>
      {menu}
    </div>
  );
}