import React, { useEffect, useMemo, useState } from "react";
import { CaretDown, CaretRight, Check, Folder, FolderOpen, MagnifyingGlass, Plus, Stack, X } from "@phosphor-icons/react";

const BTN =
  "h-8 flex items-center justify-center gap-2 px-3 shrink-0 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]";
const PINK =
  "h-8 flex items-center justify-center gap-2 px-3 shrink-0 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] enabled:hover:bg-[#F230AE] transition-[background-color,transform] duration-150 enabled:active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed";
const PINK_SHADOW = { boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" };

// projects: the project(s) being moved. onMove(folderId | null). onCreateFolder(name) returns the new folder's id.
export function MoveModal({ projects = [], folder = null, folders, onMove, onCreateFolder, onClose }) {
  // the folder every selected project is in right now (undefined when they're mixed)
  const currentId = useMemo(() => {
    if (folder) return folder.parentId ?? null; // moving a folder: its current parent
    const s = new Set(projects.map((p) => p.folderId ?? null));
    return s.size === 1 ? [...s][0] : undefined;
  }, [projects, folder]);

  const [sel, setSel] = useState(folder ? undefined : currentId); // undefined = nothing picked, null = top level / "No folder"
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const canMove = sel !== undefined && sel !== currentId;
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggleOpen = (id) =>
    setCollapsed((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // kids: parent id -> children (orphans count as top level). blocked: the moving folder + all its descendants.
  const { kids, blocked } = useMemo(() => {
    const ids = new Set(folders.map((f) => f.id));
    const kids = new Map();
    folders.forEach((f) => {
      const k = f.parentId && ids.has(f.parentId) ? f.parentId : null;
      kids.set(k, [...(kids.get(k) ?? []), f]);
    });
    kids.forEach((l) => l.sort((a, b) => a.name.localeCompare(b.name)));
    const blocked = new Set();
    if (folder) {
      const walk = (id) => {
        if (blocked.has(id)) return;
        blocked.add(id);
        (kids.get(id) ?? []).forEach((c) => walk(c.id));
      };
      walk(folder.id);
    }
    return { kids, blocked };
  }, [folders, folder]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation(); // the Projects page also closes on Esc
        creating ? setCreating(false) : onClose();
      } else if (e.key === "Enter" && !creating && canMove) {
        e.stopPropagation();
        onMove(sel);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [creating, canMove, sel, onClose, onMove]);

  const pathOf = (f) => {
    const names = [];
    const seen = new Set();
    let cur = folders.find((x) => x.id === f.parentId);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      names.unshift(cur.name);
      const parent = cur.parentId;
      cur = folders.find((x) => x.id === parent);
    }
    return names.join(" / ");
  };

  const query = q.trim().toLowerCase();
  const shown = folders.filter((f) => !query || f.name.toLowerCase().includes(query));
  const showNone = !query || (folder ? "top level" : "no folder").includes(query);

  const commitCreate = () => {
    const name = draft.trim() || "Untitled folder";
    setSel(onCreateFolder(name));
    setCreating(false);
    setDraft("");
  };

  const option = (id, Icon, label, sub, x = {}) => {
    const { hasKids = false, open = true } = x;
    const disabled = x.disabled || (!!folder && id === currentId); // moving a folder: its current parent is greyed out
    const on = sel === id;
    return (
      <div key={id ?? "none"} className="flex items-center gap-1">
        {hasKids ? (
          <button
            type="button"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => toggleOpen(id)}
            className="flex items-center justify-center w-5 h-8 shrink-0 rounded-md text-[#737373] dark:text-[#ABABAB] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] transition-colors"
          >
            {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          type="button"
          role="radio"
          aria-checked={on}
          disabled={disabled}
          onClick={() => setSel(id)}
          onDoubleClick={() => id !== currentId && onMove(id)}
          className={`flex items-center gap-3 flex-1 min-w-0 min-h-11 px-2 py-1.5 rounded-lg text-left transition-colors duration-100 ${
            disabled ? "opacity-40 cursor-not-allowed" : on ? "bg-[#FF47BC]/10" : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
          }`}
        >
          <Icon size={16} weight="regular" className={`shrink-0 ${on ? "text-[#FF47BC]" : "text-[#737373] dark:text-[#ABABAB]"}`} />
          <span className="flex flex-col min-w-0 flex-1">
            <span className={`truncate text-[13px] font-medium leading-4 tracking-[-0.005em] ${on ? "text-[#FF47BC]" : "text-[#3A3A3A] dark:text-[#FAF9FA]"}`}>
              {label}
            </span>
            {sub && <span className="truncate text-[12px] font-medium leading-4 tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">{sub}</span>}
          </span>
          {folder && id === folder.id && (
            <span className="shrink-0 h-5 px-1.5 flex items-center rounded-md bg-[#EDEDED] dark:bg-[#292929] text-[11px] font-medium text-[#737373] dark:text-[#ABABAB]">
              This folder
            </span>
          )}
          {!folder && id === currentId && (
            <span className="shrink-0 h-5 px-1.5 flex items-center rounded-md bg-[#EDEDED] dark:bg-[#292929] text-[11px] font-medium text-[#737373] dark:text-[#ABABAB]">
              Current
            </span>
          )}
          {on && (folder || id !== currentId) && <Check size={14} weight="regular" className="shrink-0 text-[#FF47BC]" />}
        </button>
      </div>
    );
  };

  // subfolders hang off their mother folder as collapsible branches
  const node = (f) => {
    const list = kids.get(f.id) ?? [];
    const open = !collapsed.has(f.id);
    return (
      <div key={f.id}>
        {option(f.id, list.length && open ? FolderOpen : Folder, f.name, null, {
          hasKids: list.length > 0,
          open,
          disabled: blocked.has(f.id),
        })}
        {list.length > 0 && open && (
          <div className="relative ml-[10px] pl-[20px]">
            {/* vertical trunk from under the parent's chevron */}
            <span aria-hidden className="absolute left-0 top-0 bottom-[22px] w-px bg-[#3A3A3A]/15 dark:bg-[#FAF9FA]/15" />
            {list.map((c) => (
              <div key={c.id} className="relative">
                {/* horizontal branch into each child row */}
                <span aria-hidden className="absolute -left-[20px] top-[22px] w-[14px] h-px bg-[#3A3A3A]/15 dark:bg-[#FAF9FA]/15" />
                {node(c)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const tree = (parent) => (kids.get(parent) ?? []).map(node);

  return (
    <div
      className="fade-enter fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 dark:bg-black/85"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Move to folder"
        className="pop-enter w-[420px] max-w-full max-h-full flex flex-col bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="flex items-center justify-between h-11 pl-4 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
          <span className="truncate text-[14px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
            Move {folder ? `“${folder.name}”` : projects.length === 1 ? `“${projects[0].title}”` : `${projects.length} projects`}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="group flex items-center justify-center w-7 h-7 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
        </div>

        <div className="flex flex-col gap-2 p-4 pb-2">
          <div className="flex items-center gap-2 px-2 h-[33px] bg-[#EDEDED] dark:bg-[#292929] rounded-[10px] border border-transparent focus-within:border-[#FF47BC] transition-colors">
            <MagnifyingGlass size={16} weight="regular" className="shrink-0 text-[#737373] dark:text-[#ABABAB]" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search folders"
              className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] placeholder:text-[#737373] dark:text-[#FAF9FA] outline-none"
            />
          </div>

          {creating ? (
            <div className="flex items-center gap-3 h-11 px-2 rounded-lg border border-[#FF47BC] bg-white dark:bg-[#292929]">
              <Folder size={16} weight="regular" className="shrink-0 text-[#FF47BC]" />
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitCreate()}
                placeholder="Folder name"
                className="flex-1 min-w-0 bg-transparent text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] placeholder:text-[#737373] dark:text-[#FAF9FA] outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setDraft("");
                }}
                className="shrink-0 h-6 px-1.5 rounded-md text-[12px] font-medium text-[#737373] dark:text-[#ABABAB] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitCreate}
                className="shrink-0 h-6 px-1.5 rounded-md text-[12px] font-medium text-[#FF47BC] hover:bg-[#FF47BC]/10 transition-colors"
              >
                Create
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-3 h-11 px-2 rounded-lg border border-dashed border-[#3A3A3A]/15 dark:border-[#FAF9FA]/15 text-[13px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] transition-colors"
            >
              <Plus size={16} weight="regular" className="shrink-0" /> Create new folder
            </button>
          )}
        </div>

        <div role="radiogroup" className="flex flex-col gap-1 px-4 pb-2 max-h-[280px] min-h-[120px] flex-1 overflow-y-auto custom-scroll">
          {showNone && option(null, Stack, folder ? "Top level" : "No folder")}
          {query
            ? shown.map((f) => option(f.id, Folder, f.name, pathOf(f), { disabled: blocked.has(f.id) }))
            : tree(null)}
          {!showNone && shown.length === 0 && (
            <span className="px-2 py-6 text-center text-[12px] font-medium text-[#737373] dark:text-[#ABABAB]">No folders match</span>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 pt-2 border-t border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
          <button type="button" onClick={onClose} className={BTN}>
            Cancel
          </button>
          <button type="button" disabled={!canMove} onClick={() => onMove(sel)} className={PINK} style={PINK_SHADOW}>
            Move
          </button>
        </div>
      </div>
    </div>
  );
}