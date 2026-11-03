import { useState, useRef, useEffect } from "react";
import { toast } from "../lib/toast.js";
import { loadProjects, syncProjects } from "../lib/projectStore.js";
import { NAV, BASE, PROJECTS_PATH, isProjectsPath } from "../lib/appConstants.js";

export function useProjects({ setProjectTitle, openProject }) {
  const [savedProjects, setSavedProjects] = useState([]);
  const liveProjects = savedProjects.filter((p) => !p.deletedAt); // trashed ones only show on the Projects page
  const [projectsPageOpen, setProjectsPageOpen] = useState(isProjectsPath);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // the URL follows the page, and back / forward buttons move the page
  useEffect(() => {
    const onPop = () => setProjectsPageOpen(isProjectsPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (isProjectsPath() === projectsPageOpen) return;
    window.history.pushState(null, "", projectsPageOpen ? `${PROJECTS_PATH}/recent` : `${BASE}/`);
  }, [projectsPageOpen]);

  const [folders, setFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bezel:folders")) ?? []; } catch { return []; }
  }); // [{ id, name }]
  useEffect(() => {
    try { localStorage.setItem("bezel:folders", JSON.stringify(folders)); } catch {}
  }, [folders]);

  // ---- Projects undo / redo (separate from the editor history; saves and autosaves are never recorded) ----
  const projHistRef = useRef({ past: [], future: [] });
  const projLastRecordRef = useRef(0);
  const projCtxRef = useRef(false); // true while the last undoable action was a project / folder action (not an editor edit)
  const projTrackedIdsRef = useRef(new Set()); // ids that undo / redo may add or remove (duplicates, purged projects)
  const [, setProjHistTick] = useState(0);
  const savedProjectsRef = useRef(savedProjects);
  savedProjectsRef.current = savedProjects;
  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  // call right before a project / folder change. Calls within 80ms merge, so bulk actions are one undo step.
  const recordProjects = () => {
    projCtxRef.current = true;
    const now = performance.now();
    const merge = now - projLastRecordRef.current < 80;
    projLastRecordRef.current = now;
    if (merge) return;
    const h = projHistRef.current;
    h.past.push({ projects: savedProjectsRef.current, folders: foldersRef.current });
    if (h.past.length > 50) h.past.shift();
    h.future = [];
    setProjHistTick((n) => n + 1);
  };
  // folder changes made inside the Projects page go through this
  const setFoldersTracked = (u) => {
    recordProjects();
    setFolders(u);
  };
  const applyProjectsSnapshot = (snap) => {
    const cur = savedProjectsRef.current;
    const curById = new Map(cur.map((p) => [p.id, p]));
    const snapIds = new Set(snap.projects.map((p) => p.id));
    // projects that exist now keep their latest saved content and only take the managed fields back
    const restored = snap.projects.map((p) => {
      const c = curById.get(p.id);
      return c ? { ...c, title: p.title, pinned: p.pinned, folderId: p.folderId, deletedAt: p.deletedAt } : p;
    });
    // projects saved after the snapshot stay, unless undo / redo itself created or removed them
    const kept = cur.filter((p) => !snapIds.has(p.id) && !projTrackedIdsRef.current.has(p.id));
    const next = [...kept, ...restored];
    setSavedProjects(next);
    setFolders(snap.folders);
    const open = next.find((p) => p.id === selectedProjectId);
    if (!open || open.deletedAt) setSelectedProjectId(null);
    else setProjectTitle(open.title);
  };
  const undoProjects = () => {
    const h = projHistRef.current;
    const prev = h.past.pop();
    if (!prev) return;
    projCtxRef.current = true;
    h.future.push({ projects: savedProjectsRef.current, folders: foldersRef.current });
    applyProjectsSnapshot(prev);
    setProjHistTick((n) => n + 1);
    toast("Undone");
  };
  const redoProjects = () => {
    const h = projHistRef.current;
    const next = h.future.pop();
    if (!next) return;
    projCtxRef.current = true;
    h.past.push({ projects: savedProjectsRef.current, folders: foldersRef.current });
    applyProjectsSnapshot(next);
    setProjHistTick((n) => n + 1);
    toast("Redone");
  };
  const canUndoProjects = projHistRef.current.past.length > 0;
  const canRedoProjects = projHistRef.current.future.length > 0;

  const [projectsLoaded, setProjectsLoaded] = useState(false);
  useEffect(() => {
    let dead = false;
    loadProjects()
      .then((list) => {
        if (dead) return;
        setSavedProjects((prev) => [...prev, ...list.filter((p) => !prev.some((x) => x.id === p.id))]);
        const open = NAV.projectId && list.find((x) => x.id === NAV.projectId);
        if (open) {
          openProject(open); // restores the project's own mode, camera, timeline, etc.
          if (isProjectsPath()) setProjectsPageOpen(true); // openProject closes it, so put it back
        }
      })
      .catch((err) => console.error("Loading projects failed:", err))
      .finally(() => !dead && setProjectsLoaded(true));
    return () => { dead = true; };
  }, []);
  // every save / rename / move / duplicate / delete goes through savedProjects, so one effect covers them all
  useEffect(() => {
    if (projectsLoaded) syncProjects(savedProjects).catch((err) => console.error("Saving projects failed:", err));
  }, [savedProjects, projectsLoaded]);

  const [projectMenu, setProjectMenu] = useState(null); // { id, left, top?, bottom? }
  const projectMenuRef = useRef(null);
  const [moveTarget, setMoveTarget] = useState(null); // { list, done } waiting in the Move modal
  const [renamingProjectId, setRenamingProjectId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameCancelRef = useRef(false);

  useEffect(() => {
    if (!projectMenu) return;
    const close = () => setProjectMenu(null);
    const onDown = (e) => {
      if (projectMenuRef.current?.contains(e.target) || e.target.closest?.("[data-project-menu-trigger]")) return;
      close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [projectMenu]);

  const toggleProjectMenu = (e, id) => {
    e.stopPropagation();
    if (projectMenu?.id === id) {
      setProjectMenu(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const opensUp = below < 290 && r.top > below; // the menu is ~280px tall; flip up only if there's more room above
    setProjectMenu({
      id,
      left: Math.max(8, Math.min(r.left, window.innerWidth - 188)),
      ...(opensUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
  };

  const projectLink = (id) => `${window.location.origin}${window.location.pathname}#project-${id}`;
  const handleOpenProjectInNewTab = (p) => window.open(projectLink(p.id), "_blank", "noopener");
  const handleCopyProjectLink = async (p) => {
    try {
      await navigator.clipboard.writeText(projectLink(p.id));
      toast("Link copied");
    } catch (err) {
      console.error("Copy link failed:", err);
      toast("Couldn't copy the link", { type: "error" });
    }
  };
  const handleDuplicateProject = (p) => {
    recordProjects();
    const id = `${Date.now()}`;
    projTrackedIdsRef.current.add(id);
    setSavedProjects((prev) => {
      const i = prev.findIndex((x) => x.id === p.id);
      const copy = { ...p, id, title: `${p.title} copy`, editedAt: new Date() };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
    toast("Project duplicated");
  };
  const startRenameProject = (p) => setRenamingProjectId(p.id);
  const commitRenameProject = (name) => {
    const title = name.trim();
    const id = renamingProjectId;
    if (title) {
      recordProjects();
      setSavedProjects((prev) => prev.map((x) => (x.id === id ? { ...x, title, editedAt: new Date() } : x)));
      if (id === selectedProjectId) setProjectTitle(title); // so the next manual save doesn't restore the old name
      toast("Project renamed");
    }
    setRenamingProjectId(null);
  };
  const handleDeleteProject = (id) => {
    recordProjects();
    const name = savedProjects.find((x) => x.id === id)?.title ?? "Project";
    setSavedProjects((prev) => prev.map((x) => (x.id === id ? { ...x, deletedAt: new Date(), pinned: false } : x)));
    setSelectedProjectId((cur) => (cur === id ? null : cur));
    toast(`“${name}” moved to Trash`, { action: { label: "Undo", onClick: () => undoProjects() } });
  };
  const handleRestoreProject = (id) => {
    recordProjects();
    setSavedProjects((prev) => prev.map((x) => (x.id === id ? { ...x, deletedAt: null } : x)));
    toast("Project restored");
  };
  const handlePurgeProject = (id) => {
    recordProjects();
    projTrackedIdsRef.current.add(id);
    setSavedProjects((prev) => prev.filter((x) => x.id !== id));
    toast("Project deleted permanently");
  };
  const handleTogglePin = (id) => {
    recordProjects();
    const wasPinned = savedProjects.find((x) => x.id === id)?.pinned;
    setSavedProjects((prev) => prev.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)));
    toast(wasPinned ? "Project unpinned" : "Project pinned");
  };
  const handleMoveProject = (id, folderId) => {
    recordProjects();
    setSavedProjects((prev) => prev.map((x) => (x.id === id ? { ...x, folderId: folderId ?? null } : x)));
    const folderName = folders.find((f) => f.id === folderId)?.name;
    toast(folderName ? `Moved to “${folderName}”` : "Removed from folder");
  };
  const handleCreateFolder = (name) => {
    recordProjects();
    const id = `folder-${Date.now()}`;
    setFolders((prev) => [...prev, { id, name, createdAt: Date.now(), parentId: null }]);
    toast(`Folder “${name}” created`);
    return id;
  };
  const handleDeleteFolder = (id) => {
    recordProjects();
    toast("Folder deleted");
    setFolders((prev) => {
      const gone = prev.find((f) => f.id === id);
      return prev
        .filter((f) => f.id !== id)
        .map((f) => (f.parentId === id ? { ...f, parentId: gone?.parentId ?? null } : f));
    });
    setSavedProjects((prev) => prev.map((x) => (x.folderId === id ? { ...x, folderId: null } : x)));
  };

  return {
    savedProjects, setSavedProjects, liveProjects,
    projectsPageOpen, setProjectsPageOpen, projectsLoaded,
    selectedProjectId, setSelectedProjectId,
    folders, setFoldersTracked,
    projHistRef, projCtxRef, undoProjects, redoProjects, canUndoProjects, canRedoProjects,
    projectMenu, setProjectMenu, projectMenuRef, toggleProjectMenu,
    moveTarget, setMoveTarget,
    renamingProjectId, setRenamingProjectId, renameDraft, setRenameDraft, renameCancelRef,
    handleOpenProjectInNewTab, handleCopyProjectLink, handleDuplicateProject,
    startRenameProject, commitRenameProject, handleDeleteProject, handleRestoreProject,
    handlePurgeProject, handleTogglePin, handleMoveProject, handleCreateFolder, handleDeleteFolder,
  };
}