import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, CaretDown, CaretRight, Clock, CornersOut, Devices, FilmStrip, Folder,
  ListBullets, Plus, SquaresFour, TrashSimple, FolderOpen, FolderPlus, PencilSimple, PushPin,
  FunnelSimple, SlidersHorizontal, Check, Stack, MagnifyingGlass, X, Info, Compass, Keyboard, Palette, Play,
  DotsThree, Minus,
} from "@phosphor-icons/react";
import { SearchField, Skeleton } from "./controls.jsx";
import { ProjectCard } from "./ProjectCard.jsx";
import { useDismissable, CTX_ITEM } from "./timelineParts.jsx";
import Tooltip from "../Tooltip.jsx";
import KeyCombo from "../KeyCombo.jsx";
import { THEME_OPTIONS } from "../constants/uiOptions.js";

const FILTER_OPTIONS = [
  { value: "all", label: "All types", Icon: Stack },
  { value: "mockup", label: "Mockup", Icon: Devices },
  { value: "frame", label: "Frame", Icon: CornersOut },
  { value: "animation", label: "Animation", Icon: FilmStrip },
];
const SORT_OPTIONS = [
  { value: "edited", label: "Last edited" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name" },
];
const KIND_ICON = { mockup: Devices, frame: CornersOut, animation: FilmStrip };
const NAV = [
  { key: "recent", label: "Recent", Icon: Clock },
  { key: "folders", label: "Folders", Icon: FolderOpen },
  { key: "trash", label: "Trash", Icon: TrashSimple },
];

const BTN =
  "h-8 flex items-center justify-center gap-2 pl-2 pr-2.5 shrink-0 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]";
const PINK =
  "h-8 flex items-center justify-center gap-2 pl-2 pr-2.5 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] hover:bg-[#F230AE] transition-[background-color,transform] duration-150 active:scale-[0.97]";
const PINK_SHADOW = { boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" };
const MENU =
  "pop-enter flex flex-col gap-1 p-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)]";
const BAR_BTN =
  "flex items-center gap-2 h-8 px-3 rounded-full text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent";
const DANGER =
  "flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438] transition-colors duration-100";
const COLS =
  "grid grid-cols-[20px_88px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_64px] items-center gap-4 px-4";
const OWNER = "You";
const ago = (d) => {
  const t = new Date(d).getTime();
  if (!d || !isFinite(t)) return "earlier";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const timeAgo = (d) => {
  if (!d) return "Added earlier";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "Added just now";
  if (m < 60) return `Added ${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Added ${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.floor(h / 24);
  return `Added ${days} day${days === 1 ? "" : "s"} ago`;
};

export function ProjectsPage({
  projects, selectedId, folders, setFolders,
  onClose, onOpen, onNewProject, onMenu, menuId,
  renamingId, renameDraft, onRenameDraft, onRenameCommit, onRenameCancel,
  onMoveProject, onDeleteFolder, onDeleteProject, onPurgeProject, onTogglePin,
  onTour, onVideoTour, onShortcuts, themePref, onThemeChange,
  loading = false,
}) {
  const [section, setSection] = useState("recent"); // "recent" | "folders" | "trash"
  const [openFolderId, setOpenFolderId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("edited");
  const [view, setView] = useState("grid");
  const [viewLoading, setViewLoading] = useState(true); // grid skeleton when the page opens
  const seenViews = useRef(new Set()); // views that already showed their skeleton
  useEffect(() => {
    if (seenViews.current.has(view)) return;
    setViewLoading(true);
    const t = setTimeout(() => {
      seenViews.current.add(view);
      setViewLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [view]);
  const showSkeleton = loading || viewLoading;
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [folderDraft, setFolderDraft] = useState("");
  const folderCancelRef = useRef(false);
  const [folderMenu, setFolderMenu] = useState(null); // { id, left, top?, bottom? }
  const [addMenu, setAddMenu] = useState(false);
  const [helpMenu, setHelpMenu] = useState(null); // { left, bottom }
  const [themeOpen, setThemeOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState([]);
  const toggleCheck = (id) =>
    setCheckedIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const [menu, setMenu] = useState(null); // "filter" | "sort"
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const live = useMemo(() => projects.filter((p) => !p.deletedAt), [projects]);
  const trashed = useMemo(() => projects.filter((p) => p.deletedAt), [projects]);
  const openFolder = folders.find((f) => f.id === openFolderId) ?? null;
  const searching = search.trim() !== "";
  const mode = searching ? "search" : openFolder ? "folder" : section;
  const inTrash = mode === "trash";

  useDismissable(!!folderMenu, "[data-folder-menu],[data-project-menu-trigger]", () => setFolderMenu(null));
  useDismissable(addMenu, "[data-add-menu]", () => setAddMenu(false));
  useDismissable(!!helpMenu, "[data-help-menu],[data-help-trigger]", () => setHelpMenu(null));
  useEffect(() => setCheckedIds([]), [section, openFolderId, searching]);
  useDismissable(!!menu, "[data-pop-menu]", () => setMenu(null));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = (s) => {
    setSection(s);
    setOpenFolderId(null);
    setSearch("");
  };

  const byEdited = (a, b) => new Date(b.editedAt) - new Date(a.editedAt);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = section === "trash" && !openFolder ? trashed : live;
    const base = q
      ? pool.filter((p) => p.title.toLowerCase().includes(q))
      : openFolder
      ? live.filter((p) => p.folderId === openFolder.id)
      : pool;
    const t = (p) => new Date(p.editedAt).getTime();
    return base
      .filter((p) => filter === "all" || p.kind === filter)
      .sort((a, b) => (sort === "name" ? a.title.localeCompare(b.title) : sort === "oldest" ? t(a) - t(b) : byEdited(a, b)));
  }, [live, trashed, section, openFolder, search, filter, sort]);

  const sortedFolders = useMemo(
    () =>
      folders.filter((f) => !f.parentId).sort((a, b) =>
        sort === "name" ? a.name.localeCompare(b.name) : sort === "oldest" ? (a.createdAt ?? 0) - (b.createdAt ?? 0) : (b.createdAt ?? 0) - (a.createdAt ?? 0)
      ),
    [folders, sort]
  );
  const subFolders = useMemo(
    () =>
      openFolder
        ? folders.filter((f) => f.parentId === openFolder.id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        : [],
    [folders, openFolder]
  );
  // root-to-current chain of folders
  const folderPath = useMemo(() => {
    const path = [];
    const seen = new Set();
    let cur = openFolder;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      path.unshift(cur);
      const parent = cur.parentId;
      cur = folders.find((f) => f.id === parent);
    }
    return path;
  }, [folders, openFolder]);
  // more than 4 items: keep the first two and the last two, hide the middle behind "…"
  const crumbs = useMemo(() => {
    const all = [{ id: null, name: "Folder" }, ...folderPath];
    if (all.length <= 4) return all;
    return [all[0], all[1], { gap: true, hidden: all.slice(2, -2) }, ...all.slice(-2)];
  }, [folderPath]);
  const pinnedFolders = folders.filter((f) => f.pinned);
  const pinnedProjects = live.filter((p) => p.pinned).sort(byEdited);

  // drop targets: a folder id, or null for "back to no folder"
  const dropProps = (target) => {
    const key = target ?? "root";
    return {
      onDragOver: (e) => {
        if (dragId == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverId(key);
      },
      onDragLeave: () => setOverId((c) => (c === key ? null : c)),
      onDrop: (e) => {
        e.preventDefault();
        if (dragId != null) onMoveProject(dragId, target);
        setDragId(null);
        setOverId(null);
      },
    };
  };

  const addFolder = (parentId = null) => {
    const id = `folder-${Date.now()}`;
    setFolders((prev) => [...prev, { id, name: "Untitled folder", createdAt: Date.now(), parentId }]);
    if (parentId == null) go("folders");
    setFolderDraft("Untitled folder");
    setRenamingFolder(id);
  };
  const commitFolder = () => {
    if (folderCancelRef.current) {
      folderCancelRef.current = false;
      setRenamingFolder(null);
      return;
    }
    const id = renamingFolder;
    const name = folderDraft.trim() || "Untitled folder";
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    setRenamingFolder(null);
  };
  const toggleFolderMenu = (e, id) => {
    e.stopPropagation();
    if (folderMenu?.id === id) return setFolderMenu(null);
    const r = e.currentTarget.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 200;
    setFolderMenu({
      id,
      left: Math.min(r.left, window.innerWidth - 190),
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
  };

  const card = (p, i) => (
    <ProjectCard
      key={p.id}
      p={p}
      index={i}
      showKind
      layout={view === "list" ? "row" : "card"}
      thumbClass="aspect-[3/2]"
      selected={!inTrash && selectedId === p.id}
      checked={checkedIds.includes(p.id)}
      onCheck={() => toggleCheck(p.id)}
      onPin={inTrash ? undefined : () => onTogglePin(p.id)}
      onOpen={inTrash ? () => {} : onOpen}
      onMenu={onMenu}
      menuOpen={menuId === p.id}
      renaming={renamingId === p.id}
      renameDraft={renameDraft}
      onRenameDraft={onRenameDraft}
      onRenameCommit={onRenameCommit}
      onRenameCancel={onRenameCancel}
      draggable={!inTrash}
      dragging={dragId === p.id}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(p.id));
        setTimeout(() => setDragId(p.id), 0); // deferred so the drag ghost stays opaque
      }}
      onDragEnd={() => {
        setDragId(null);
        setOverId(null);
      }}
    />
  );

  const folderCard = (f, i) => {
    const first = live.filter((p) => p.folderId === f.id).sort(byEdited)[0];
    const fp = { id: f.id, title: f.name, thumb: first?.thumb ?? null, kind: "folder", editedAt: f.createdAt, pinned: f.pinned };
    return (
      <div
        key={f.id}
        {...dropProps(f.id)}
        className={`rounded-2xl transition-shadow duration-150 ${overId === f.id ? "ring-2 ring-[#FF47BC]" : ""}`}
      >
        <ProjectCard
          p={fp}
          index={i}
          showKind
          layout={view === "list" ? "row" : "card"}
          thumbClass="aspect-[3/2]"
          metaText={timeAgo(f.createdAt)}
          checked={checkedIds.includes(f.id)}
          onCheck={() => toggleCheck(f.id)}
          onPin={() => setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, pinned: !x.pinned } : x)))}
          onOpen={() => setOpenFolderId(f.id)}
          onMenu={toggleFolderMenu}
          menuOpen={folderMenu?.id === f.id}
          renaming={renamingFolder === f.id}
          renameDraft={folderDraft}
          onRenameDraft={setFolderDraft}
          onRenameCommit={commitFolder}
          onRenameCancel={() => { folderCancelRef.current = true; }}
        />
      </div>
    );
  };

  const row = ({ key, Icon, label, active, onClick, trailing, drop }) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      {...(drop ?? {})}
      className={`group flex items-center gap-2 w-full h-8 pl-2 pr-2 rounded-lg text-[13px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
        active
          ? "bg-[#FF47BC]/10 text-[#FF47BC]"
          : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
      }`}
    >
      <Icon size={16} weight="regular" className="shrink-0" />
      <span className="flex-1 min-w-0 truncate text-left">{label}</span>
      {trailing}
    </button>
  );

      const iconMenu = (key, label, Icon, options, value, onChange, active) => (
    <div data-pop-menu className="relative">
      <Tooltip label={menu === key ? "" : label} placement="bottom">
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={menu === key}
          onClick={() => setMenu((m) => (m === key ? null : key))}
          className={`flex items-center justify-center w-8 h-8 shrink-0 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] transition-[background-color,transform] duration-150 active:scale-[0.94] ${
            active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
          }`}
        >
          <Icon size={16} weight="regular" />
        </button>
      </Tooltip>
      {menu === key && (
        <div role="menu" className={`${MENU} absolute right-0 top-full mt-1 w-[180px] z-20`}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`${CTX_ITEM} justify-between ${value === o.value ? "!bg-[#FF47BC]/10 !text-[#FF47BC]" : ""}`}
              onClick={() => {
                onChange(o.value);
                setMenu(null);
              }}
            >
              <span className="flex items-center gap-2 min-w-0">
                {o.Icon && <o.Icon size={16} weight="regular" className="shrink-0" />}
                <span className="truncate">{o.label}</span>
              </span>
              {value === o.value && <Check size={14} weight="regular" className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );

    const selProjects = projects.filter((p) => checkedIds.includes(p.id) && !!p.deletedAt === inTrash);
  const selFolders = inTrash ? [] : folders.filter((f) => checkedIds.includes(f.id));
  const selCount = selProjects.length + selFolders.length;
  const allPinned = selCount > 0 && [...selProjects, ...selFolders].every((x) => x.pinned);

  const bulkPin = () => {
    const target = !allPinned;
    selProjects.filter((p) => !!p.pinned !== target).forEach((p) => onTogglePin(p.id));
    if (selFolders.length) {
      setFolders((prev) => prev.map((f) => (checkedIds.includes(f.id) ? { ...f, pinned: target } : f)));
    }
  };
  const bulkMove = (folderId) => {
    selProjects.forEach((p) => onMoveProject(p.id, folderId));
    setCheckedIds([]);
    setMenu(null);
  };
  const bulkDelete = () => {
    if (inTrash) selProjects.forEach((p) => onPurgeProject(p.id));
    else {
      selProjects.forEach((p) => onDeleteProject(p.id));
      selFolders.forEach((f) => onDeleteFolder(f.id));
    }
    setCheckedIds([]);
  };

    const entries =
    mode === "folders"
      ? sortedFolders.map((f) => ({ kind: "folder", f }))
      : mode === "folder"
      ? [...subFolders.map((f) => ({ kind: "folder", f })), ...visible.map((p) => ({ kind: "project", p }))]
      : visible.map((p) => ({ kind: "project", p }));
  const entryId = (e) => (e.kind === "folder" ? e.f.id : e.p.id);
  const checkedCount = entries.filter((e) => checkedIds.includes(entryId(e))).length;
  const allState = checkedCount === 0 ? "none" : checkedCount === entries.length ? "all" : "some";
  const toggleAll = () => setCheckedIds(allState === "all" ? [] : entries.map(entryId));

  const box = (state, onClick, label) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "some" ? "mixed" : state === "all"}
      aria-label={label}
      onClick={(ev) => {
        ev.stopPropagation();
        onClick();
      }}
      className={`flex items-center justify-center w-5 h-5 rounded-md border transition-[background-color,border-color,transform] duration-150 active:scale-[0.92] ${
        state !== "none"
          ? "bg-[#FF47BC] border-[#FF47BC] text-white"
          : "bg-white dark:bg-[#292929] border-[#3A3A3A]/20 dark:border-[#FAF9FA]/20 hover:border-[#FF47BC]"
      }`}
    >
      {state === "all" && <Check size={12} weight="bold" />}
      {state === "some" && <Minus size={12} weight="bold" />}
    </button>
  );

  const listRow = (e) => {
    const isF = e.kind === "folder";
    const id = entryId(e);
    const name = isF ? e.f.name : e.p.title;
    const checked = checkedIds.includes(id);
    const pinned = !!(isF ? e.f.pinned : e.p.pinned);
    const thumb = isF ? live.filter((p) => p.folderId === id).sort(byEdited)[0]?.thumb : e.p.thumb;
    const created = isF ? e.f.createdAt : Number(e.p.id);
    const parent = folders.find((f) => f.id === (isF ? e.f.parentId : e.p.folderId));
    const renaming = isF ? renamingFolder === id : renamingId === id;
    const draft = isF ? folderDraft : renameDraft;
    const setDraft = isF ? setFolderDraft : onRenameDraft;
    const commit = isF ? commitFolder : onRenameCommit;
    const cancel = isF ? () => { folderCancelRef.current = true; } : onRenameCancel;
    const menuOpen = isF ? folderMenu?.id === id : menuId === id;
    const cell = "text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] truncate";
    return (
      <div
        key={id}
        role="button"
        tabIndex={0}
        {...(isF ? dropProps(id) : {})}
        draggable={!isF && !inTrash}
        onDragStart={
          isF || inTrash
            ? undefined
            : (ev) => {
                ev.dataTransfer.effectAllowed = "move";
                ev.dataTransfer.setData("text/plain", String(id));
                setTimeout(() => setDragId(id), 0);
              }
        }
        onDragEnd={() => {
          setDragId(null);
          setOverId(null);
        }}
        onClick={() => !renaming && (isF ? setOpenFolderId(id) : !inTrash && onOpen(e.p))}
        onKeyDown={(ev) => {
          if (ev.target !== ev.currentTarget) return;
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            isF ? setOpenFolderId(id) : !inTrash && onOpen(e.p);
          }
        }}
        className={`group ${COLS} py-2 rounded-xl cursor-pointer transition-[background-color,opacity] duration-150 ${
          dragId === id ? "opacity-40" : ""
        } ${overId === id ? "ring-2 ring-[#FF47BC]" : ""} ${
          checked ? "bg-[#FF47BC]/10" : "hover:bg-black/[0.03] dark:hover:bg-white/5"
        }`}
      >
        {box(checked ? "all" : "none", () => toggleCheck(id), checked ? "Deselect" : "Select")}

        <div
          className="w-[88px] h-[52px] rounded-lg bg-black/[0.04] dark:bg-white/10 bg-cover bg-center border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10"
          style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
        />

        <div className="flex flex-col gap-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              onFocus={(ev) => ev.target.select()}
              onClick={(ev) => ev.stopPropagation()}
              onBlur={commit}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") ev.currentTarget.blur();
                if (ev.key === "Escape") {
                  cancel();
                  ev.currentTarget.blur();
                }
              }}
              className="w-full h-5 px-1 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]"
            />
          ) : (
            <span className="truncate text-[13px] font-semibold leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
              {name}
            </span>
          )}
          <span className="truncate text-[12px] font-medium leading-4 tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
            {isF ? "Folder" : `Edited ${ago(e.p.editedAt)}`}
          </span>
        </div>

        <span className={cell}>{ago(created)}</span>

        <span className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 bg-[#EDEDED] dark:bg-[#292929] text-[11px] font-semibold text-[#3A3A3A] dark:text-[#FAF9FA]">
            {OWNER[0]}
          </span>
          <span className={cell}>{OWNER}</span>
        </span>

        <span className={cell}>{parent?.name ?? ""}</span>

        <div className="flex items-center justify-end gap-1">
          {!inTrash && (
            <button
              type="button"
              aria-label={pinned ? "Unpin" : "Pin"}
              onClick={(ev) => {
                ev.stopPropagation();
                isF
                  ? setFolders((prev) => prev.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)))
                  : onTogglePin(id);
              }}
              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:opacity-100 group-hover:opacity-100 ${
                pinned ? "opacity-100 text-[#FF47BC]" : "opacity-0 text-[#8C8C8C] dark:text-[#9A9A9A]"
              }`}
            >
              <PushPin size={16} weight={pinned ? "fill" : "regular"} />
            </button>
          )}
          <button
            type="button"
            data-project-menu-trigger
            aria-label="Options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(ev) => (isF ? toggleFolderMenu(ev, id) : onMenu(ev, id))}
            className={`flex items-center justify-center w-7 h-7 rounded-lg text-[#8C8C8C] dark:text-[#9A9A9A] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] transition-[background-color,transform] duration-150 active:scale-[0.94] ${
              menuOpen ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <DotsThree size={20} weight="bold" />
          </button>
        </div>
      </div>
    );
  };

  const listTable = (
    <div className="flex flex-col">
      <div
        className={`${COLS} h-10 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]`}
      >
        {box(allState, toggleAll, "Select all")}
        <span />
        <span>Name</span>
        <span>Created at</span>
        <span>Owner</span>
        <span>Folder</span>
        <span />
      </div>
      <div className="flex flex-col gap-1 pt-2">{entries.map(listRow)}</div>
    </div>
  );

  const items = mode === "folders" ? sortedFolders : mode === "folder" ? [...subFolders, ...visible] : visible;
  const content =
    mode === "folders"
      ? items.map(folderCard)
      : mode === "folder"
      ? [...subFolders.map(folderCard), ...visible.map(card)]
      : items.map(card);
  const gridCls = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2";

  const gridSkeleton = (
    <div className={gridCls}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col items-start gap-2 p-2 rounded-2xl bg-[#FAF9FA] dark:bg-[#171717]">
          <Skeleton className="w-full aspect-[3/2] rounded-lg" />
          <div className="flex items-center gap-2 w-full">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex flex-col gap-1 flex-1">
              <Skeleton className="h-3 w-2/3 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const listSkeleton = (
    <div className="flex flex-col">
      <div className={`${COLS} h-10 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10`}>
        <Skeleton className="w-5 h-5 rounded-md" />
        <span />
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-3 w-12 rounded" />
        <span />
      </div>
      <div className="flex flex-col gap-1 pt-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`${COLS} py-2 rounded-xl bg-[#FAF9FA] dark:bg-[#171717]`}>
            <Skeleton className="w-5 h-5 rounded-md" />
            <Skeleton className="w-[88px] h-[52px] rounded-lg" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-2/3 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
            <Skeleton className="h-3 w-16 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <Skeleton className="h-3 w-10 rounded" />
            </div>
            <Skeleton className="h-3 w-14 rounded" />
            <span />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fade-enter fixed inset-0 z-[45] flex flex-col overflow-hidden bg-[#EFEFF0] dark:bg-[#0D0B0C] text-[#8C8C8C] dark:text-[#9A9A9A]">
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between h-16 p-4 mx-2 rounded-b-2xl shrink-0 bg-[#FAF9FA] dark:bg-[#171717]">
        <img src={`${import.meta.env.BASE_URL}logo-light.svg`} alt="Bezel" draggable={false} className="h-8 w-auto select-none dark:hidden" />
        <img src={`${import.meta.env.BASE_URL}logo-dark.svg`} alt="Bezel" draggable={false} className="hidden h-8 w-auto select-none dark:block" />
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => addFolder()} className={BTN}>
            <Plus size={14} weight="regular" className="shrink-0" /> Create folder
          </button>
          <button type="button" onClick={onNewProject} className={PINK} style={PINK_SHADOW}>
            <Plus size={14} weight="regular" className="shrink-0" /> New project
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-2 p-2 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[248px] shrink-0 min-h-0 flex flex-col rounded-2xl bg-[#FAF9FA] dark:bg-[#171717] overflow-hidden">
          <div className="flex items-center h-11 shrink-0 px-2 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
            <Tooltip label="Back to editor" shortcut={["Esc"]} placement="bottom">
              <button
                type="button"
                onClick={onClose}
                className="group flex items-center gap-2 h-7 pl-2 pr-3 rounded-lg text-[14px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] transition-colors"
              >
                <ArrowLeft size={16} weight="regular" /> Editor
              </button>
            </Tooltip>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-4">
            <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects" />

            <div className="flex flex-col gap-1">
              {NAV.map(({ key, label, Icon }) =>
                row({
                  key, Icon, label,
                  active: !searching && !openFolder && section === key,
                  onClick: () => go(key),
                  drop: key === "folders" ? dropProps(null) : undefined,
                })
              )}
            </div>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setPinnedOpen((v) => !v)}
                className="flex items-center gap-2 h-7 px-2 rounded-lg text-[12px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] transition-colors"
              >
                {pinnedOpen ? <CaretDown size={14} weight="regular" /> : <CaretRight size={14} weight="regular" />}
                Pinned
              </button>
              {pinnedOpen && (
                <>
                  {pinnedFolders.map((f) =>
                    row({
                      key: f.id, Icon: FolderOpen, label: f.name,
                      active: openFolder?.id === f.id,
                      onClick: () => { setSearch(""); setOpenFolderId(f.id); },
                      trailing: <CaretRight size={14} weight="regular" className="shrink-0" />,
                      drop: dropProps(f.id),
                    })
                  )}
                  {pinnedProjects.map((p) =>
                    row({
                      key: p.id, Icon: KIND_ICON[p.kind] ?? Devices, label: p.title,
                      active: false,
                      onClick: () => onOpen(p),
                    })
                  )}
                  {loading && (
                    <>
                      <Skeleton className="h-8 rounded-lg shrink-0" />
                      <Skeleton className="h-8 rounded-lg shrink-0" />
                    </>
                  )}
                  {!loading && !pinnedFolders.length && !pinnedProjects.length && (
                    <span className="px-2 py-1 text-[12px] font-medium leading-4 tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                      Pin a project or folder from its menu
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="shrink-0 p-2">
            <button
              type="button"
              data-help-trigger
              aria-haspopup="menu"
              aria-expanded={!!helpMenu}
              onClick={(e) => {
                setThemeOpen(false);
                if (helpMenu) return setHelpMenu(null);
                const r = e.currentTarget.getBoundingClientRect();
                setHelpMenu({ left: r.right + 4, bottom: window.innerHeight - r.bottom });
              }}
              className={`flex items-center gap-2 w-full h-8 pl-2 pr-2 rounded-lg text-[13px] font-medium tracking-[-0.005em] transition-colors duration-100 ${
                helpMenu
                  ? "bg-[#EDEDED] dark:bg-white/10 text-[#3A3A3A] dark:text-[#FAF9FA]"
                  : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
              }`}
            >
              <Info size={16} weight="regular" className="shrink-0" /> Help
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto flex flex-col gap-4 px-4 pt-3 pb-8">
          <div className="flex items-center justify-between gap-4 min-h-8">
            <h1 className="flex items-center gap-3 min-w-0 text-[14px] leading-5 font-medium tracking-[-0.005em]">
              {mode === "folder" ? (
                <>
                  {crumbs.map((c, i) => {
                    const last = i === crumbs.length - 1;
                    return (
                      <React.Fragment key={c.gap ? "gap" : c.id ?? "root"}>
                        {i > 0 && <CaretRight size={14} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] shrink-0" />}
                        {c.gap ? (
                          <div data-pop-menu className="relative">
                            <button
                              type="button"
                              aria-label="Show hidden folders"
                              aria-haspopup="menu"
                              aria-expanded={menu === "crumb"}
                              onClick={() => setMenu((m) => (m === "crumb" ? null : "crumb"))}
                              className="rounded-lg px-1 -mx-1 text-[#8C8C8C] dark:text-[#9A9A9A] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] transition-colors"
                            >
                              …
                            </button>
                            {menu === "crumb" && (
                              <div role="menu" className={`${MENU} absolute left-0 top-full mt-1 w-[180px] z-20`}>
                                {c.hidden.map((h) => (
                                  <button
                                    key={h.id}
                                    type="button"
                                    className={`${CTX_ITEM} gap-2`}
                                    onClick={() => {
                                      setMenu(null);
                                      setOpenFolderId(h.id);
                                    }}
                                  >
                                    <FolderOpen size={16} weight="regular" className="shrink-0" />
                                    <span className="truncate">{h.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : last ? (
                          <span className="min-w-0 max-w-[220px] truncate text-[#3A3A3A] dark:text-[#FAF9FA]">{c.name}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => (c.id == null ? go("folders") : setOpenFolderId(c.id))}
                            {...dropProps(c.id)}
                            className={`min-w-0 max-w-[160px] truncate rounded-lg px-1 -mx-1 transition-colors ${
                              overId === (c.id ?? "root")
                                ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                                : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
                            }`}
                          >
                            {c.name}
                          </button>
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              ) : (
                <span className="text-[#3A3A3A] dark:text-[#FAF9FA]">
                  {mode === "search" ? "Results" : NAV.find((n) => n.key === mode).label}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {mode === "trash" && trashed.length > 0 && (
                <button type="button" onClick={() => trashed.forEach((p) => onPurgeProject(p.id))} className={BTN}>
                  Empty trash
                </button>
              )}
              {iconMenu("filter", "Filter", FunnelSimple, FILTER_OPTIONS, filter, setFilter, filter !== "all")}
              {iconMenu("sort", "Sort", SlidersHorizontal, SORT_OPTIONS, sort, setSort, sort !== "edited")}
              <div className="flex items-center p-0.5 h-8 bg-black/[0.04] dark:bg-white/10 rounded-2xl">
                {[["grid", SquaresFour, "Grid"], ["list", ListBullets, "List"]].map(([v, Icon, label]) => (
                  <Tooltip key={v} label={label} placement="bottom">
                    <button
                      type="button"
                      aria-label={label}
                      onClick={() => setView(v)}
                      className={`flex items-center justify-center w-8 h-7 rounded-[14px] transition-colors duration-200 ${
                        view === v ? "bg-white dark:bg-[#292929] text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA]"
                      }`}
                    >
                      <Icon size={16} weight="regular" />
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>

          {showSkeleton ? (
            view === "list" ? listSkeleton : gridSkeleton
          ) : items.length === 0 && mode === "folder" && filter === "all" ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <FolderOpen size={40} weight="regular" className="folder-enter text-[#8C8C8C] dark:text-[#9A9A9A]" />
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-[14px] font-medium leading-5 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
                  Nothing in here yet
                </span>
                <span className="max-w-[340px] text-[13px] font-medium leading-5 tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                  Add a project you've already saved, or make a new folder to keep things tidy.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addFolder(openFolder.id)}
                  className="flex items-center gap-2 h-8 px-2 rounded-2xl text-[13px] font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.97]"
                >
                  <FolderPlus size={16} weight="regular" className="shrink-0" /> Create folder
                </button>
                <div data-add-menu className="relative">
                  <button
                    type="button"
                    onClick={() => setAddMenu((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={addMenu}
                    className={BTN}
                  >
                    <Plus size={14} weight="regular" className="shrink-0" /> Add existing project
                  </button>
                  {addMenu && (
                    <div
                      role="menu"
                      className={`${MENU} absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[220px] max-h-[240px] overflow-y-auto custom-scroll z-20`}
                    >
                      {live.filter((p) => p.folderId !== openFolder.id).length === 0 ? (
                        <span className="px-2 py-1 text-[12px] font-medium leading-4 tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                          No other projects to add
                        </span>
                      ) : (
                        live
                          .filter((p) => p.folderId !== openFolder.id)
                          .sort(byEdited)
                          .map((p) => {
                            const Icon = KIND_ICON[p.kind] ?? Devices;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                className={`${CTX_ITEM} gap-2`}
                                onClick={() => {
                                  onMoveProject(p.id, openFolder.id);
                                  setAddMenu(false);
                                }}
                              >
                                <Icon size={16} weight="regular" className="shrink-0" />
                                <span className="truncate">{p.title}</span>
                              </button>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : items.length === 0 ? (() => {
            const noMatch = mode === "search" || filter !== "all";
            const E = noMatch
              ? {
                  Icon: MagnifyingGlass,
                  title: "Nothing found",
                  text: "Try a different name, or clear the filter to see everything.",
                }
              : mode === "trash"
              ? {
                  Icon: TrashSimple,
                  title: "Trash is empty",
                  text: "Projects you delete will wait here until you remove them for good.",
                }
              : mode === "folders"
              ? {
                  Icon: FolderOpen,
                  title: "No folders yet",
                  text: "Make a folder to group related projects and find them faster.",
                }
              : {
                  Icon: Devices,
                  title: "No projects yet",
                  text: "Save a project from the editor and it'll show up right here.",
                };
            return (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <E.Icon size={40} weight="regular" className="folder-enter text-[#8C8C8C] dark:text-[#9A9A9A]" />
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="text-[14px] font-medium leading-5 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
                    {E.title}
                  </span>
                  <span className="max-w-[340px] text-[13px] font-medium leading-5 tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                    {E.text}
                  </span>
                </div>
                {noMatch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                    className={BTN}
                  >
                    Clear search and filter
                  </button>
                ) : mode === "folders" ? (
                  <button type="button" onClick={() => addFolder()} className={BTN}>
                    <FolderPlus size={16} weight="regular" className="shrink-0" /> Create folder
                  </button>
                ) : mode === "recent" ? (
                  <button type="button" onClick={onNewProject} className={PINK} style={PINK_SHADOW}>
                    <Plus size={14} weight="regular" className="shrink-0" /> New project
                  </button>
                ) : null}
              </div>
            );
          })() : view === "list" ? (
            listTable
          ) : (
            <div className={gridCls}>{content}</div>
          )}
        </div>
      </div>

      {selCount > 0 && (
        <div
          role="toolbar"
          aria-label="Selection actions"
          className="pop-enter-up fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 h-12 pl-4 pr-2 rounded-full bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <span className="pr-3 text-[13px] font-medium tracking-[-0.005em] whitespace-nowrap">
            <span className="text-[#3A3A3A] dark:text-[#FAF9FA]">{selCount}</span> selected
          </span>
          <div className="w-px h-5 mr-1 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />

          {!inTrash && (
            <div data-pop-menu className="relative">
              <button
                type="button"
                disabled={selFolders.length > 0}
                title={selFolders.length > 0 ? "Folders can't be moved yet" : undefined}
                aria-haspopup="menu"
                aria-expanded={menu === "move"}
                onClick={() => setMenu((m) => (m === "move" ? null : "move"))}
                className={BAR_BTN}
              >
                <FolderOpen size={16} weight="regular" className="shrink-0" /> Move
              </button>
              {menu === "move" && (
                <div role="menu" className={`${MENU} absolute left-0 bottom-full mb-2 w-[200px] max-h-[240px] overflow-y-auto custom-scroll`}>
                  <button type="button" className={`${CTX_ITEM} gap-2`} onClick={() => bulkMove(null)}>
                    <Stack size={16} weight="regular" className="shrink-0" /> No folder
                  </button>
                  {folders.map((f) => (
                    <button key={f.id} type="button" className={`${CTX_ITEM} gap-2`} onClick={() => bulkMove(f.id)}>
                      <FolderOpen size={16} weight="regular" className="shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!inTrash && (
            <button type="button" onClick={bulkPin} className={BAR_BTN}>
              <PushPin size={16} weight="regular" className="shrink-0" /> {allPinned ? "Unpin" : "Pin"}
            </button>
          )}

          <button
            type="button"
            onClick={bulkDelete}
            className={`${BAR_BTN} !text-[#F04438] hover:!bg-[#F04438]/10`}
          >
            <TrashSimple size={16} weight="regular" className="shrink-0" /> Delete
          </button>

          <div className="w-px h-5 mx-1 bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />
          <Tooltip label="Clear selection" placement="top">
            <button
              type="button"
              aria-label="Clear selection"
              onClick={() => setCheckedIds([])}
              className="flex items-center justify-center w-8 h-8 rounded-full text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#3A3A3A] dark:hover:text-[#FAF9FA] transition-colors"
            >
              <X size={16} weight="regular" />
            </button>
          </Tooltip>
        </div>
      )}

      {helpMenu && (
        <div
          data-help-menu
          role="menu"
          style={{ position: "fixed", left: helpMenu.left, bottom: helpMenu.bottom }}
          className="side-enter w-[220px] p-2 flex flex-col items-start bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
        >
          <div className="flex flex-col items-start gap-1 w-full">
            <button
              type="button"
              onMouseEnter={() => setThemeOpen(false)}
              onClick={() => { setHelpMenu(null); onTour(); }}
              className="flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
            >
              <span className="flex items-center gap-2">
                <Compass size={16} weight="regular" className="shrink-0" />
                App tour
              </span>
            </button>

            <button
              type="button"
              onMouseEnter={() => setThemeOpen(false)}
              onClick={() => { setHelpMenu(null); onVideoTour(); }}
              className="flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
            >
              <span className="flex items-center gap-2">
                <Play size={16} weight="regular" className="shrink-0" />
                Video timeline tour
              </span>
            </button>

            <div className="w-full" onMouseEnter={() => setThemeOpen(true)}>
              <button
                type="button"
                onClick={() => setThemeOpen((v) => !v)}
                className={`flex items-center justify-between w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] transition-colors duration-100 ${
                  themeOpen ? "bg-[#EDEDED] dark:bg-white/10" : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Palette size={16} weight="regular" className="shrink-0" />
                  Theme
                </span>
                <span className="flex items-center gap-1">
                  <KeyCombo keys={["C"]} />
                  <CaretRight size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
                </span>
              </button>

              {themeOpen && (
                <div className="side-enter absolute left-[calc(100%+5px)] bottom-[-1px] w-[200px] p-2 gap-1 flex flex-col items-start bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                  <span className="block px-2 pt-1 pb-1 text-[11px] font-semibold tracking-[0.02em] text-[#8C8C8C] dark:text-[#9A9A9A]">
                    Theme
                  </span>
                  {THEME_OPTIONS.map((opt) => {
                    const on = themePref === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onThemeChange(opt.value)}
                        className={`group flex items-center justify-between w-full h-[30px] pl-2 pr-2 rounded-lg transition-colors duration-100 ${
                          on
                            ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                            : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F1F1F1] dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <opt.Icon size={16} weight="regular" />
                          <span className="text-[13px] font-medium tracking-[-0.005em]">{opt.label}</span>
                        </span>
                        {on && <Check size={14} weight="regular" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onMouseEnter={() => setThemeOpen(false)}
              onClick={() => { setHelpMenu(null); onShortcuts(); }}
              className="flex items-center justify-between w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
            >
              <span className="flex items-center gap-2">
                <Keyboard size={14} weight="regular" className="shrink-0" />
                Keyboard shortcuts
              </span>
              <KeyCombo keys={["?"]} />
            </button>
          </div>

          <a
            href="https://dee-space03.framer.website/"
            target="_blank"
            rel="noreferrer"
            onMouseEnter={() => setThemeOpen(false)}
            onClick={() => setHelpMenu(null)}
            className="mt-1 w-full h-8 flex items-center p-2 border-t border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 text-[12px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] transition-colors duration-100"
          >
            <span className="truncate underline underline-offset-2">Built by dee-space03.framer.website/</span>
          </a>
        </div>
      )}

      {folderMenu && (() => {
        const f = folders.find((x) => x.id === folderMenu.id);
        if (!f) return null;
        const run = (fn) => () => { setFolderMenu(null); fn(); };
        return (
          <div
            data-folder-menu
            role="menu"
            style={{ position: "fixed", left: folderMenu.left, top: folderMenu.top, bottom: folderMenu.bottom }}
            className={`${MENU} w-[180px] z-[9999]`}
          >
            <button type="button" className={`${CTX_ITEM} gap-2`} onClick={run(() => { setSearch(""); setOpenFolderId(f.id); })}>
              <FolderOpen size={16} weight="regular" className="shrink-0" /> Open
            </button>
            <button type="button" className={`${CTX_ITEM} gap-2`} onClick={run(() => { setFolderDraft(f.name); setRenamingFolder(f.id); })}>
              <PencilSimple size={16} weight="regular" className="shrink-0" /> Rename
            </button>
            <button type="button" className={`${CTX_ITEM} gap-2`} onClick={run(() => setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, pinned: !x.pinned } : x))))}>
              <PushPin size={16} weight={f.pinned ? "fill" : "regular"} className="shrink-0" /> {f.pinned ? "Unpin" : "Pin"}
            </button>
            <div className="my-1 h-px w-full bg-[#3A3A3A]/10 dark:bg-[#FAF9FA]/10" />
            <button type="button" className={`${DANGER} gap-2`} onClick={run(() => onDeleteFolder(f.id))}>
              <TrashSimple size={16} weight="regular" className="shrink-0" /> Delete
            </button>
          </div>
        );
      })()}
    </div>
  );
}