import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import KeyCombo from "../KeyCombo.jsx";
import Tooltip from "../Tooltip.jsx";
import { OffsetField } from "../SizeFields.jsx";
import {
  VID_FPS, VID_PPS, VID_PPS_MIN, VID_PPS_MAX, VID_LABEL_W, VID_PAD, VID_GRAY,
  VID_H_MIN, VID_H_MAX, VID_GLIDE_MS, VID_GLIDE_EASE, VID_PROPS, vidClamp, vidSnap, fmtTC,
} from "../lib/videoMath.js";
import { devAnimLabel } from "../lib/shotAnim.js";
import { bgAnimOf } from "../lib/bgAnim.js";
import { changedCamProps, keyStateAt, vidShotAtTime } from "../lib/frameKeys.js";
import { useDismissable, VidBtn, CTX_ITEM, CTX_DANGER, CTX_DIVIDER, CtxMenu, AudioWave } from "./timelineParts.jsx";
import { EaseIcon, EasePopover } from "./EasePopover.jsx";
import { BgAnimPopover } from "./BgAnimPopover.jsx";
import { ShotAnimPopover } from "./ShotAnimPopover.jsx";
import { TextAnimPopover } from "./TextAnimPopover.jsx";
import {
  Plus,
  CaretDown,
  CaretRight,
  Palette,
  Eye,
  EyeSlash,
  Diamond,
  TrashSimple,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  MusicNoteSimple,
  DotsSixVertical,
  Stack,
  TextT,
  ArrowsCounterClockwise,
} from "@phosphor-icons/react";

export function VideoTimeline({ v }) {
  const { shots, duration, selShot, selKey, selIds, selProp, timeRef } = v;
  const [collapsed, setCollapsed] = useState(false);
  const [durHover, setDurHover] = useState(false); // shared by the ruler and tracks end-of-timeline handles
  const [tlH, setTlH] = useState(VID_H_MIN);
  const [keyState, setKeyState] = useState("none"); // "add" | "on" | "none"
  const [pending, setPending] = useState(null); // { sid, rel, props } = camera edited here, keyframe not added yet
  const [keyMenu, setKeyMenu] = useState(null); // { sid, kid, left, top }
  useEffect(() => {
    if (!keyMenu) return;
    const close = () => setKeyMenu(null);
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-key-menu]")) close();
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
  }, [keyMenu]);

  const [shotMenu, setShotMenu] = useState(null); // { sid, left, top }
  useEffect(() => {
    if (!shotMenu) return;
    const close = () => setShotMenu(null);
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-shot-menu]")) close();
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
  }, [shotMenu]);
  const [bgMenu, setBgMenu] = useState(null); // { sid, bid, left, top }
  useEffect(() => {
    if (!bgMenu) return;
    const close = () => setBgMenu(null);
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-bg-menu]")) close();
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
  }, [bgMenu]);

  const [bgAnimMenu, setBgAnimMenu] = useState(null); // { sid, bid }
useEffect(() => {
  if (!bgAnimMenu) return;
  const onDown = (e) => {
    if (!e.target.closest?.("[data-vid-bganim-menu],[data-vid-bg-menu],[data-popup-dropdown]")) setBgAnimMenu(null);
  };
  const onKey = (e) => e.key === "Escape" && setBgAnimMenu(null);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  return () => {
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("keydown", onKey);
  };
}, [bgAnimMenu]);

  const [animMenu, setAnimMenu] = useState(null); // { sid, kind: "enter" | "exit" }
  useEffect(() => {
    if (!animMenu) return;
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-shotanim-menu],[data-vid-anim-open]")) setAnimMenu(null);
    };
    const onKey = (e) => e.key === "Escape" && setAnimMenu(null);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [animMenu]);

    const [textMenu, setTextMenu] = useState(null); // { sid, cid, left, top }
  const [textAnimMenu, setTextAnimMenu] = useState(null); // { sid, cid, kind }
  useDismissable(!!textMenu, "[data-vid-text-menu]", () => setTextMenu(null));
  useDismissable(!!textAnimMenu, "[data-vid-textanim-menu],[data-vid-text-menu],[data-popup-dropdown]", () => setTextAnimMenu(null));

  const openAnim = (s, kind) => {
    v.onSelect(s.id, null);
    setAnimMenu((m) => (m && m.sid === s.id && m.kind === kind ? null : { sid: s.id, kind }));
  };

  // drag the inner edge of a ramp to change its duration
  const animDurDown = (s, kind) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const an = s[kind];
    const px0 = e.clientX, d0 = an.dur, sign = kind === "enter" ? 1 : -1;
    const maxMs = Math.max(100, Math.round(s.len * 1000) - an.delay);
    drag((ev) => {
      const ms = vidClamp(Math.round((d0 + sign * ((ev.clientX - px0) / pps) * 1000) / 10) * 10, 100, maxMs);
      v.onShotAnim(s.id, kind, { ...an, dur: ms }, false);
    });
  };

  // Ramps (set) or ghost chips (empty) at the two ends of a shot clip.
  const renderAnimRamps = (s, w, active, keysShown) =>
    ["enter", "exit"].map((kind) => {
      const isIn = kind === "enter";
      const an = s[kind];
      const label = isIn ? "Enter" : "Exit";
      if (an && an.id !== "none") {
        const gap = Math.min(an.delay / 1000, s.len) * pps;
        const dw = Math.max(8, Math.min(an.dur / 1000, s.len) * pps);
        return (
          <div
            key={kind}
            data-vid-anim-open
            title={`${label}: ${devAnimLabel(an.id, isIn ? "in" : "out")} · ${an.dur} ms${an.delay ? ` · delay ${an.delay} ms` : ""}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              openAnim(s, kind);
            }}
            className="group/ramp absolute inset-y-0 cursor-pointer"
            style={isIn ? { left: gap, width: dw } : { right: gap, width: dw }}
          >
            <i
              className={`absolute inset-0 rounded-[8px] pointer-events-none ${isIn ? "bg-gradient-to-r" : "bg-gradient-to-l"} ${
                active ? "from-white/70" : "from-[#FF47BC]/60"
              } to-transparent`}
            />
            <div
              onPointerDown={animDurDown(s, kind)}
              className={`absolute inset-y-0 w-2 flex items-center justify-center cursor-ew-resize ${isIn ? "right-0" : "left-0"}`}
            >
              <i className="w-0.5 h-3.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] opacity-0 group-hover/ramp:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      }
      // empty end: ghost chip, skipped when it would sit on top of a keyframe or the clip is tiny
      const nearKey = keysShown && s.keys.some((k) => (isIn ? k.t : s.len - k.t) * pps < 40);
      if (w < 96 || nearKey) return null;
      return (
        <button
          key={kind}
          type="button"
          data-vid-anim-open
          title={`Add ${label.toLowerCase()} animation`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            openAnim(s, kind);
          }}
          className={`absolute top-1/2 -translate-y-1/2 ${isIn ? "left-3" : "right-3"} flex items-center gap-0.5 h-4 pl-1 pr-1.5 rounded-[4px] border border-dashed opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity ${
            active ? "border-white/80 text-white" : "border-[#FF47BC] text-[#FF47BC]"
          }`}
        >
          <Plus size={8} weight="bold" />
          {isIn ? "In" : "Out"}
        </button>
      );
    });

  const openShotMenu = (e, s) => {
    e.preventDefault();
    e.stopPropagation();
    // keep a multi-selection if the shot is already part of it; otherwise select just this shot
    if (!selIds.includes(s.id) || (selIds.length === 1 && selKey != null)) v.onSelect(s.id, null);
    setShotMenu({
      sid: s.id,
      left: Math.min(e.clientX, window.innerWidth - 196),
      top: e.clientY,
    });
  };

  const [easeMenu, setEaseMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const nameCancelRef = useRef(false);
  const imgInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const imgTargetRef = useRef(null);
  const startRename = (s) => {
    setNameDraft(s.name);
    setEditingId(s.id);
  };
  const commitRename = () => {
    if (nameCancelRef.current) {
      nameCancelRef.current = false;
    } else {
      const name = nameDraft.trim();
      if (name && editingId != null) v.onShot(editingId, { name });
    }
    setEditingId(null);
  };

  const [textEditingId, setTextEditingId] = useState(null); // clip id
  const [textDraft, setTextDraft] = useState("");
  const textCancelRef = useRef(false);

  const [bgEditingId, setBgEditingId] = useState(null);
  const [bgDraft, setBgDraft] = useState("");
  const bgCancelRef = useRef(false);
  const bgLabel = (b, i) => b.name || `Background ${i + 1}`;
  const startBgRename = (b) => {
    setBgDraft(bgLabel(b, v.bgs.indexOf(b)));
    setBgEditingId(b.id);
  };
  const commitBgRename = () => {
    if (bgCancelRef.current) {
      bgCancelRef.current = false;
    } else {
      const name = bgDraft.trim();
      if (name && bgEditingId != null) v.onBgPatch(bgEditingId, { name });
    }
    setBgEditingId(null);
  };

  const startTextRename = (c) => {
    setTextDraft(v.textName(c.tid));
    setTextEditingId(c.id);
  };
  const commitTextRename = () => {
    if (textCancelRef.current) {
      textCancelRef.current = false;
    } else {
      const name = textDraft.trim();
      const c = v.texts.find((x) => x.id === textEditingId);
      if (name && c) v.onTextRename(c.tid, name);
    }
    setTextEditingId(null);
  };

  // Shift+click range select. The anchor is the last row clicked without Shift.
  const rowAnchorRef = useRef(null);
  const pickRow = (type, id, shift) => {
    const a = rowAnchorRef.current;
    if (shift && a) {
      const order = [
        ...shots.map((s) => ["shot", s.id]),
        ...v.bgs.map((b) => ["bg", b.id]),
        ...v.texts.map((c) => ["text", c.id]),
      ];
      const i = order.findIndex(([t, x]) => t === a.type && x === a.id);
      const j = order.findIndex(([t, x]) => t === type && x === id);
      if (i >= 0 && j >= 0) {
        const slice = order.slice(Math.min(i, j), Math.max(i, j) + 1);
        const pick = (t) => slice.filter(([k]) => k === t).map(([, x]) => x);
        v.onSelectRange({ shots: pick("shot"), bgs: pick("bg"), texts: pick("text") });
        return true; // handled
      }
    }
    rowAnchorRef.current = { type, id };
    return false;
  };
  const [viewW, setViewW] = useState(0);
  const scrollRef = useRef(null);
  const headRef = useRef(null);
  const tcRef = useRef(null);
  const cntRef = useRef(null);
  const dragId = useRef(null);
  // eased playhead: shown = what's drawn, from/to/t0 = the current tween, held = pointer still down
  const glideRef = useRef({ on: false, held: false, shown: 0, from: 0, to: 0, t0: 0 });
  const live = useRef(v);
  live.current = v;
   const rootRef = useRef(null);
const [pps, setPps] = useState(VID_PPS);
const ppsRef = useRef(pps);
ppsRef.current = pps;
const anchorRef = useRef(null); // keeps the time under the cursor fixed while zooming

const x0 = VID_LABEL_W + VID_PAD; // where 0s sits inside the scroll content
const axisW = duration * pps;
const innerW = Math.max(x0 + axisW + VID_GRAY, viewW);
// label every 1s when zoomed in, every 2s / 5s / 10s... when zoomed out so labels never crowd
const tickStep = [1, 2, 5, 10, 15, 30, 60].find((s) => s * pps >= 64) ?? 60;
const nTicks = Math.max(1, Math.floor((innerW - x0 - 20) / (pps * tickStep)) + 1);
  const unit = v.frameMode ? "frame" : "shot";
  const hasKeys = shots.some((s) => s.keys.length);

  const [openShots, setOpenShots] = useState({});
  const toggleOpen = (id) => setOpenShots((p) => ({ ...p, [id]: !p[id] }));
const [frameRow, setFrameRow] = useState(null); // { sid, prop } = selected frame property row
const FRAME_PROPS = [["x", "X - Position"], ["y", "Y - Position"], ["r", "Z - Rotation"], ["s", "Scale"]];
const rowsFor = (s) => {
  if (s.frameId != null) {
    const ks = s.keys.filter((k) => k.frames?.[s.frameId]);
    return FRAME_PROPS.map(([p, label]) => {
      const tol = p === "s" ? 1e-6 : p === "r" ? 0.01 : 1e-4;
      const vals = ks.map((k) => k.frames[s.frameId][p] ?? 0);
      // diamonds where this property starts, stops or changes; a flat property shows just its first key
      const own = ks.filter(
        (k, i) => i === 0 || i === ks.length - 1 || Math.abs(vals[i] - vals[i - 1]) > tol || Math.abs(vals[i] - vals[i + 1]) > tol
      );
      const flat = Math.max(...vals) - Math.min(...vals) < tol;
      return { key: `f:${p}`, label, frameProp: p, keys: flat ? ks.slice(0, 1) : own };
    });
  }
  return VID_PROPS
    .filter(([key]) => !(v.frameMode && key === "fov"))
    .map(([key, label]) => ({ key, label }));
};
const rowActive = (s, r) =>
  r.frameProp
    ? !!frameRow && frameRow.sid === s.id && frameRow.prop === r.frameProp && s.id === selShot && selProp === "frames"
    : (s.id === selShot ? selProp : null) === r.key;

// ---- Groups (shots with the same `group` id; 2+ members) ----
const groupInfo = {};
shots.forEach((s) => {
  if (!s.group) return;
  const g = (groupInfo[s.group] ??= { gid: s.group, name: s.groupName || "Group", ids: [], first: s.id, start: Infinity, end: 0 });
  g.ids.push(s.id);
  g.start = Math.min(g.start, s.start);
  g.end = Math.max(g.end, s.start + s.len);
});
Object.keys(groupInfo).forEach((k) => groupInfo[k].ids.length < 2 && delete groupInfo[k]);
const [closedGroups, setClosedGroups] = useState({}); // default = open
const groupOpen = (gid) => !closedGroups[gid];
const [groupEditId, setGroupEditId] = useState(null);
const [groupDraft, setGroupDraft] = useState("");
const groupCancelRef = useRef(false);
const commitGroupRename = () => {
  if (groupCancelRef.current) groupCancelRef.current = false;
  else {
    const name = groupDraft.trim();
    if (name && groupEditId != null) shots.filter((s) => s.group === groupEditId).forEach((s) => v.onShot(s.id, { groupName: name }));
  }
  setGroupEditId(null);
};
const groupSelected = (g) => g.ids.every((id) => selIds.includes(id));

// dragging the group bar moves every shot in it
const groupDown = (g) => (e) => {
  if (e.button !== 0) return;
  e.stopPropagation();
  if (v.playing) v.onPause();
  v.onSelectRange({ shots: g.ids, bgs: [], texts: [] });
  const px0 = e.clientX;
  const orig = shots.filter((s) => g.ids.includes(s.id)).map((s) => [s.id, s.start]);
  const dur = live.current.duration;
  drag((ev) => {
    const d = vidSnap(vidClamp((ev.clientX - px0) / pps, -g.start, dur - g.end));
    orig.forEach(([id, st]) => v.onShot(id, { start: +(st + d).toFixed(3) }));
  });
};

const groupLabel = (g) => {
  const sel = groupSelected(g);
  const open = groupOpen(g.gid);
  return (
    <div
      key={`g-${g.gid}`}
      onClick={() => {
        if (v.playing) v.onPause();
        v.onSelectRange({ shots: g.ids, bgs: [], texts: [] });
      }}
      onDoubleClick={() => {
        setGroupDraft(g.name);
        setGroupEditId(g.gid);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        v.onSelectRange({ shots: g.ids, bgs: [], texts: [] });
        setShotMenu({ sid: g.first, left: Math.min(e.clientX, window.innerWidth - 196), top: e.clientY });
      }}
      className={`flex items-center h-[30px] gap-1 pl-4 pr-2 cursor-pointer transition-colors duration-100 ${
        sel ? "bg-[#FF47BC]/10 text-[#FF47BC]" : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-black/[0.03] dark:hover:bg-white/5"
      }`}
    >
      <span className="w-4 shrink-0" />
      <button
        type="button"
        aria-label={open ? "Collapse group" : "Expand group"}
        onClick={(e) => {
          e.stopPropagation();
          setClosedGroups((p) => ({ ...p, [g.gid]: open }));
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center w-4 h-4 shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/10"
      >
        <CaretRight size={12} weight="bold" className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      <Stack size={14} weight="regular" className="shrink-0" />
      {groupEditId === g.gid ? (
        <input
          autoFocus
          value={groupDraft}
          onChange={(e) => setGroupDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onBlur={commitGroupRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              groupCancelRef.current = true;
              e.currentTarget.blur();
            }
          }}
          className="flex-1 min-w-0 h-5 px-1 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none leading-4 text-[#3A3A3A] dark:text-[#FAF9FA]"
        />
      ) : (
        <span className="flex-1 min-w-0 truncate leading-4 ml-1">{g.name}</span>
      )}
    </div>
  );
};

const groupTrack = (g) => {
  const sel = groupSelected(g);
  return (
    <div key={`gt-${g.gid}`} className={`relative h-[30px] ${sel ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F]"}`}>
      <div
        onPointerDown={groupDown(g)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          v.onSelectRange({ shots: g.ids, bgs: [], texts: [] });
          setShotMenu({ sid: g.first, left: Math.min(e.clientX, window.innerWidth - 196), top: e.clientY });
        }}
        className={`absolute top-0 h-[30px] rounded-[8px] border-2 border-dashed cursor-grab active:cursor-grabbing ${
          sel ? "border-[#FF47BC] bg-[#FF47BC]/20" : "border-[#8C8C8C]/40 bg-[#E3E3E3]/60 dark:bg-[#333333]/60"
        }`}
        style={{ left: VID_PAD + g.start * pps, width: (g.end - g.start) * pps }}
      >
        <span className={`absolute inset-y-0 left-3 right-3 flex items-center truncate leading-4 pointer-events-none ${sel ? "text-[#FF47BC]" : "text-[#8C8C8C]"}`}>
          {g.name}
        </span>
      </div>
    </div>
  );
};
  // Clicking a shot while playing: pause and jump to the start of that shot. Returns true if it did.
  // (name kept so the existing call sites don't change)
  const pauseToEnd = (s) => {
    if (!v.playing) return false;
    v.onPause();
    v.onSeek(s.start);
    return true;
  };

  // after a zoom, restore scroll so the same moment stays under the cursor
useLayoutEffect(() => {
  const a = anchorRef.current;
  const el = scrollRef.current;
  if (!a || !el) return;
  el.scrollLeft = x0 + a.t * pps - a.offset;
  anchorRef.current = null;
}, [pps]);

// Ctrl/Cmd + scroll (or trackpad pinch) zooms the timeline
useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const cur = ppsRef.current;
    const next = vidClamp(cur * Math.exp(-vidClamp(e.deltaY, -50, 50) * 0.01), VID_PPS_MIN, VID_PPS_MAX);
    if (next === cur) return;
    const offset = e.clientX - el.getBoundingClientRect().left;
    anchorRef.current = { t: (el.scrollLeft + offset - x0) / cur, offset };
    setPps(next);
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => el.removeEventListener("wheel", onWheel);
}, [collapsed]);

// typing a duration zooms the timeline so the whole duration fits the view
const fitToDuration = (d) => {
  const w = scrollRef.current?.clientWidth || viewW;
  if (!w) return;
  const minEnd = Math.max(1, ...live.current.shots.map((s) => s.start + s.len));
  const real = Math.min(600, Math.max(minEnd, d));
  anchorRef.current = { t: 0, offset: x0 };
  setPps(vidClamp((w - x0 - VID_GRAY) / real, VID_PPS_MIN, VID_PPS_MAX));
};

// on first open, fit the whole duration to the view
const fittedRef = useRef(false);
useLayoutEffect(() => {
  if (fittedRef.current || !viewW) return;
  fittedRef.current = true;
  setPps(vidClamp((viewW - x0 - VID_GRAY) / Math.max(1, live.current.duration), VID_PPS_MIN, VID_PPS_MAX));
}, [viewW]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, [collapsed]);

  // Playhead, timecode and counter are written straight to the DOM so playback never re-renders App.
  useEffect(() => {
    let raf;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const t = timeRef.current;
      const { shots: ss, selShot: sel, duration: d } = live.current;
      const ks = keyStateAt(ss, sel, t, live.current.selProp, live.current.playing ? null : live.current.cam);
      setKeyState((p) => (p === ks ? p : ks));

      // Camera edited at this time with no keyframe covering it: "about to be added".
      let pend = null;
      if (ks === "add" && !live.current.playing && !live.current.exporting) {
        const ps = vidShotAtTime(ss, sel, t);
        const sp = live.current.selProp;
        const rowProp = sp && sp !== "bg" ? sp : null;
        const changed = changedCamProps(ss, t, live.current.cam);
        const props = rowProp ? changed.filter((p) => p === rowProp) : changed;
        if (ps && props.length) pend = { sid: ps.id, rel: +(t - ps.start).toFixed(3), props };
      }
      const pk = (p) => (p ? `${p.sid}|${p.rel}|${p.props.join(",")}` : "");
      setPending((p) => (pk(p) === pk(pend) ? p : pend));
      // Eased playhead, only while a shot edge is being dragged. Playback and scrubbing stay 1:1.
      const g = glideRef.current;
      let shown = t;
      if (g.on && !reduce && !live.current.playing) {
        const now = performance.now();
        if (Math.abs(t - g.to) > 1e-6) {
          g.from = g.shown; // new target: restart the tween from where the playhead is drawn right now
          g.to = t;
          g.t0 = now;
        }
        g.shown = g.from + (g.to - g.from) * VID_GLIDE_EASE(Math.min(1, (now - g.t0) / VID_GLIDE_MS));
        shown = g.shown;
        if (!g.held && now - g.t0 >= VID_GLIDE_MS) g.on = false; // released and settled
      } else {
        g.on = false;
        g.shown = t;
      }
      if (headRef.current) headRef.current.style.transform = `translateX(${VID_LABEL_W + VID_PAD + shown * ppsRef.current}px)`;
      if (tcRef.current) tcRef.current.textContent = fmtTC(shown);
      if (cntRef.current) {
        const s = ss.find((x) => x.id === sel);
        const rel = s ? vidClamp(t - s.start, 0, s.len) : t;
        cntRef.current.textContent = `${rel.toFixed(1)} s  /  ${(s ? s.len : d).toFixed(1)} s`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [timeRef, collapsed]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey) return;
      const t = e.target;
      const inField = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      // Sliders and numeric scrubber boxes (the camera panel) let K, S and ⇧L through. Every other field still blocks them.
      const fromScrubber = t instanceof HTMLInputElement && (t.type === "range" || t.inputMode === "numeric");
      if (inField && !(fromScrubber && /^Key[KSL]$/.test(e.code))) return;
      const l = live.current;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === "KeyD") {
        const bgIds = l.selBg?.ids ?? [];
        const textIds = l.selText?.ids ?? [];
        if (l.selIds.length || bgIds.length || textIds.length) {
          e.preventDefault(); // also stops the browser's bookmark shortcut
          if (l.selIds.length) l.onDuplicate();
          bgIds.forEach((id) => l.onBgDuplicate(id));
          textIds.forEach((id) => l.onTextDuplicate(id));
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.code === "KeyG") {
        e.preventDefault(); // also stops the browser's find-next
        if (e.shiftKey) l.onUngroup();
        else if (l.selIds.length >= 2) l.onGroup();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;

      // Shift + arrows: move the selected keyframe 10 frames (playhead follows), or the playhead if no keyframe is selected
      if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const shot = l.shots.find((s) => s.id === l.selShot);
        const key = shot?.keys.find((k) => k.id === l.selKey);
        if (shot && key) {
          l.onKeyMove(shot.id, key.id, vidSnap(vidClamp(key.t + (dir * 10) / VID_FPS, 0, shot.len)));
        } else {
          l.onStep(dir * 10);
        }
        return;
      }

      if (e.code === "KeyK" && !e.repeat) {
        e.preventDefault();
        if (l.exporting) return;
        const state = keyStateAt(l.shots, l.selShot, l.timeRef.current, l.selProp, l.playing ? null : l.cam);
        // K adds (only if there's no keyframe here), Shift+K removes (only if there is one)
        if (e.shiftKey ? state === "on" : state === "add") l.onAddKey();
        return;
      }
      if (e.code === "KeyL" && e.shiftKey && !e.repeat) { e.preventDefault(); l.onLoop(); return; }
      if (e.code === "KeyS" && !e.shiftKey && !e.repeat) { e.preventDefault(); if (!l.exporting) l.onAddShot(); return; }

      if (e.code === "Space" && !t.closest?.("button")) { e.preventDefault(); l.onTogglePlay(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); l.onStep(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); l.onStep(1); }
      else if ((e.key === "Delete" || e.key === "Backspace") && (l.selIds.length || l.selBg || l.selText || l.selAudio)) { e.preventDefault(); l.onDelete(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!easeMenu) return;
    const onDown = (e) => {
      if (!e.target.closest?.("[data-vid-ease-menu],[data-vid-ease-btn]")) setEaseMenu(null);
    };
    const onKey = (e) => e.key === "Escape" && setEaseMenu(null);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [easeMenu]);

const timeAt = (e) => {
  const el = scrollRef.current;
  const r = el.getBoundingClientRect();
  return vidClamp((e.clientX - r.left + el.scrollLeft - x0) / ppsRef.current, 0, live.current.duration);
};
  const drag = (fn) => {
    const up = () => {
      window.removeEventListener("pointermove", fn);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", fn);
    window.addEventListener("pointerup", up);
  };
  const scrub = (e) => {
    if (e.button !== 0) return;
    glideRef.current.on = false; // dragging the playhead itself should never lag
    v.onSeek(timeAt(e));
    drag((ev) => v.onSeek(timeAt(ev)));
  };

  // ---- Multi-selection drag: every selected shot / background / text moves or resizes together ----
  const multiPicked = () => {
    const L = live.current;
    return [
      ...L.shots.filter((s) => L.selIds.includes(s.id)).map((s) => ({ type: "shot", id: s.id, start: s.start, len: s.len, keys: s.keys })),
      ...L.bgs.filter((b) => L.selBg?.ids?.includes(b.id)).map((b) => ({ type: "bg", id: b.id, start: b.start, len: b.len })),
      ...L.texts.filter((c) => L.selText?.ids?.includes(c.id)).map((c) => ({ type: "text", id: c.id, start: c.start, len: c.len })),
    ];
  };
  const isInMulti = (type, id) => {
    const p = multiPicked();
    return p.length > 1 && p.some((x) => x.type === type && x.id === id);
  };
  const startMulti = (e, type, id, mode) => {
    const items = multiPicked();
    const anchor = items.find((x) => x.type === type && x.id === id);
    if (items.length < 2 || !anchor) return false;
    const g = glideRef.current;
    g.on = true;
    g.held = true;
    g.shown = timeRef.current;
    g.from = g.shown;
    g.to = g.shown;
    g.t0 = performance.now();
    const px0 = e.clientX;
    const dur = live.current.duration;
    const patch = (it, p) =>
      it.type === "shot" ? v.onShot(it.id, p) : it.type === "bg" ? v.onBgPatch(it.id, p) : v.onTextPatch(it.id, p);
    drag((ev) => {
      let d = (ev.clientX - px0) / pps;
      if (mode === "move") d = vidClamp(d, -Math.min(...items.map((i) => i.start)), dur - Math.max(...items.map((i) => i.start + i.len)));
      else if (mode === "r") d = vidClamp(d, Math.max(...items.map((i) => 0.2 - i.len)), Math.min(...items.map((i) => dur - i.start - i.len)));
      else d = vidClamp(d, -Math.min(...items.map((i) => i.start)), Math.min(...items.map((i) => i.len - 0.2)));
      d = vidSnap(d);
      items.forEach((it) => {
        if (mode === "move") patch(it, { start: Math.max(0, +(it.start + d).toFixed(3)) });
        else if (mode === "r") patch(it, { len: +(it.len + d).toFixed(3) });
        else {
          const start = Math.max(0, +(it.start + d).toFixed(3));
          const len = +(it.len - d).toFixed(3);
          patch(it, it.type === "shot"
            ? { start, len, keys: it.keys.map((k) => ({ ...k, t: vidClamp(k.t - d, 0, len) })) }
            : { start, len });
        }
      });
      v.onPlayhead(mode === "r" ? anchor.start + anchor.len + d : anchor.start + d); // playhead rides the dragged edge
    });
    const done = () => {
      window.removeEventListener("pointerup", done);
      glideRef.current.held = false;
      v.onSeek(timeRef.current);
    };
    window.addEventListener("pointerup", done);
    return true;
  };

  // mode: "move" | "l" | "r"
const clipDown = (s, mode) => (e) => {
  e.stopPropagation();
  const inMulti = !e.shiftKey && isInMulti("shot", s.id); // grabbing a selected clip keeps the whole selection
  if (!inMulti && !pickRow("shot", s.id, e.shiftKey)) v.onSelect(s.id, null, e.shiftKey);
  pauseToEnd(s);
  if (e.shiftKey) return; // shift+click only toggles selection, no drag
  if (inMulti && startMulti(e, "shot", s.id, mode)) return;
  const g = glideRef.current;
  g.on = true;
  g.held = true;
  g.shown = timeRef.current;
  g.from = g.shown;
  g.to = g.shown;
  g.t0 = performance.now();
  const px0 = e.clientX, st0 = s.start, len0 = s.len, keys0 = s.keys;
  drag((ev) => {
    const d = (ev.clientX - px0) / pps;
    const dur = live.current.duration;
    if (mode === "move") {
      const start = vidSnap(vidClamp(st0 + d, 0, dur - len0));
      v.onShot(s.id, { start });
      v.onPlayhead(start); // playhead rides the shot's start
    } else if (mode === "r") {
      const len = vidSnap(vidClamp(len0 + d, 0.2, dur - st0));
      v.onShot(s.id, { len });
      v.onPlayhead(st0 + len); // playhead rides the end edge
    } else {
      const start = vidSnap(vidClamp(st0 + d, 0, st0 + len0 - 0.2));
      const len = st0 + len0 - start;
v.onShot(s.id, {
  start,
  len,
  keys: keys0.map((k) => ({ ...k, t: vidClamp(k.t - (start - st0), 0, len) })),
});
      v.onPlayhead(start); // playhead rides the start edge
    }
  });
  // on release, sync the camera to where the playhead ended up. The glide finishes on its own.
  const done = () => {
    window.removeEventListener("pointerup", done);
    glideRef.current.held = false;
    v.onSeek(timeRef.current);
  };
  window.addEventListener("pointerup", done);
};
const keyDown = (s, k, prop = null) => (e) => {
  if (e.button !== 0) {
    e.stopPropagation();
    return;
  }
  e.stopPropagation();
  if (v.playing) v.onPause();
  v.onSelect(s.id, k.id, false, prop);
  v.onSeek(s.start + k.t);
  const px0 = e.clientX, t0 = k.t;
  const shared = !!prop && (!k.props || k.props.length > 1); // drives other properties too
  let kid = k.id, split = false;
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `* { cursor: grabbing !important; }`;
  document.head.appendChild(styleEl);
  const stop = () => {
    styleEl.remove();
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointerup", stop);
  drag((ev) => {
    const dx = ev.clientX - px0;
    if (shared && !split) {
      if (Math.abs(dx) < 3) return; // a click isn't a drag
      split = true;
      kid = v.onKeySplit(s.id, k.id, prop) ?? k.id;
      v.onSelect(s.id, kid, false, prop);
    }
    v.onKeyMove(s.id, kid, vidSnap(vidClamp(t0 + dx / pps, 0, s.len)));
  });
};
const durDown = (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const px0 = e.clientX, d0 = live.current.duration;
  drag((ev) => v.onDuration(d0 + (ev.clientX - px0) / pps));
};
// mode: "move" | "l" | "r". c.start / c.len are absolute seconds.
const clipRowDown = (c, mode, select, patchFn, type) => (e) => {
  e.stopPropagation();
  if (e.button !== 0) return;
  if (v.playing) v.onPause();
  const inMulti = !e.shiftKey && isInMulti(type, c.id);
  if (!inMulti) select(e.shiftKey);
  if (e.shiftKey) return; // shift+click only toggles selection, no drag
  if (inMulti && startMulti(e, type, c.id, mode)) return;
  const g = glideRef.current;
  g.on = true;
  g.held = true;
  g.shown = timeRef.current;
  g.from = g.shown;
  g.to = g.shown;
  g.t0 = performance.now();
  const px0 = e.clientX, s0 = c.start, len0 = c.len;
  drag((ev) => {
    const d = (ev.clientX - px0) / pps;
    const dur = live.current.duration;
    if (mode === "move") {
      const start = vidSnap(vidClamp(s0 + d, 0, Math.max(0, dur - len0)));
      patchFn({ start });
      v.onPlayhead(start); // playhead rides the clip's start
    } else if (mode === "r") {
      const len = vidSnap(vidClamp(len0 + d, 0.2, Math.max(0.2, dur - s0)));
      patchFn({ len });
      v.onPlayhead(s0 + len); // playhead rides the end edge
    } else {
      const start = vidSnap(vidClamp(s0 + d, 0, s0 + len0 - 0.2));
      patchFn({ start, len: +(s0 + len0 - start).toFixed(3) });
      v.onPlayhead(start); // playhead rides the start edge
    }
  });
  // on release, sync the scene to where the playhead ended up. The glide finishes on its own.
  const done = () => {
    window.removeEventListener("pointerup", done);
    glideRef.current.held = false;
    v.onSeek(timeRef.current);
  };
  window.addEventListener("pointerup", done);
};
const bgDown = (b, mode) =>
  clipRowDown(b, mode, (add) => { if (!pickRow("bg", b.id, add)) v.onBgSelect(b.id, add); }, (p) => v.onBgPatch(b.id, p), "bg");
const textDown = (c, mode) =>
  clipRowDown(c, mode, (add) => { if (!pickRow("text", c.id, add)) v.onTextSelect(c.id, add); }, (p) => v.onTextPatch(c.id, p), "text");
const audioDown = (c, mode) =>
  clipRowDown(c, mode, () => v.onAudioSelect(c.id), (p) => v.onAudioPatch(c.id, p), "audio");

const rowLabel = (key, text, selected, onClick, onContext, Icon, rename, hide) => (
  <div
    key={key}
    onClick={onClick}
    onDoubleClick={rename?.start}
    onContextMenu={onContext}
    className={`group fx-enter flex items-center h-[30px] gap-1 pl-4 pr-2 cursor-pointer transition-colors duration-100 ${
      selected
        ? "bg-[#FF47BC]/10 text-[#FF47BC]"
        : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#FF47BC]/5"
    }`}
  >
    <DotsSixVertical
      size={16}
      weight="regular"
      className={`shrink-0 cursor-grab ${selected ? "text-[#FF47BC]" : "text-[#949494]"}`}
    />
    <span className="flex items-center justify-center w-4 h-4 shrink-0">
      <Icon size={14} weight="regular" />
    </span>
    {rename?.editing ? (
      <input
        autoFocus
        value={rename.draft}
        onChange={(e) => rename.setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onBlur={rename.commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            rename.cancel();
            e.currentTarget.blur();
          }
        }}
        className="flex-1 min-w-0 h-5 px-1 -mx-1 ml-0 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none leading-4 text-[#3A3A3A] dark:text-[#FAF9FA]"
      />
    ) : (
      <span className={`flex-1 min-w-0 truncate leading-4 ml-1 ${hide?.hidden ? "opacity-50" : ""}`}>{text}</span>
    )}
    {hide && (
      <Tooltip label={hide.hidden ? "Show" : "Hide"} placement="bottom" className="shrink-0 ml-auto">
        <button
          type="button"
          aria-label={hide.hidden ? "Show" : "Hide"}
          onClick={(e) => {
            e.stopPropagation();
            hide.toggle();
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94]"
        >
          {hide.hidden ? (
            <EyeSlash size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
          ) : (
            <Eye size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
          )}
        </button>
      </Tooltip>
    )}
  </div>
);

// Enter / exit ramp for a text clip (same look as the shot ramps)
const textRamp = (c, kind) => {
  const an = c[kind];
  if (!an || an.id === "none") return null;
  const isIn = kind === "enter";
  const gap = Math.min(an.delay / 1000, c.len) * pps;
  const dw = Math.max(8, Math.min(an.dur / 1000, c.len) * pps);
  const maxMs = Math.max(100, Math.round(c.len * 1000) - an.delay);
  const durDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const px0 = e.clientX, d0 = an.dur, sign = isIn ? 1 : -1;
    drag((ev) => {
      const ms = vidClamp(Math.round((d0 + sign * ((ev.clientX - px0) / pps) * 1000) / 10) * 10, 100, maxMs);
      v.onTextPatch(c.id, { [kind]: { ...an, dur: ms } });
    });
  };
  return (
    <div
      key={kind}
      title={`${isIn ? "Enter" : "Exit"} · ${an.dur} ms${an.delay ? ` · delay ${an.delay} ms` : ""}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        setTextAnimMenu({ cid: c.id, kind });
      }}
      className="group/ramp absolute inset-y-0 cursor-pointer"
      style={isIn ? { left: gap, width: dw } : { right: gap, width: dw }}
    >
      <i className={`absolute inset-0 rounded-[8px] pointer-events-none ${isIn ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-[#FF47BC]/60 to-transparent`} />
      <div onPointerDown={durDown} className={`absolute inset-y-0 w-2 flex items-center justify-center cursor-ew-resize ${isIn ? "right-0" : "left-0"}`}>
        <i className="w-0.5 h-3.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] opacity-0 group-hover/ramp:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

const renderTextClip = (c) => {
  const selected = !!v.selText?.ids?.includes(c.id);
  const hidden = v.textHidden(c.tid);
  return (
    <div
      onPointerDown={textDown(c, "move")}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setTextAnimMenu({ cid: c.id, kind: "enter" });
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        v.onTextSelect(c.id);
        setTextMenu({
          cid: c.id,
          left: Math.min(e.clientX, window.innerWidth - 196),
          top: e.clientY,
        });
      }}
className={`group absolute top-0 h-[30px] rounded-[8px] overflow-hidden cursor-grab active:cursor-grabbing bg-[#FF47BC]/20 hover:bg-[#FF47BC]/25 ${hidden ? "opacity-40" : ""}`}
      style={{ left: VID_PAD + c.start * pps, width: c.len * pps }}
    >
      {textRamp(c, "enter")}
      {textRamp(c, "exit")}
<span className="absolute inset-y-0 left-3 right-3 flex items-center truncate leading-4 pointer-events-none text-[#FF47BC]">
        {v.textLabel(c.tid)}
      </span>
      {[["l", "left-0"], ["r", "right-0"]].map(([m, side]) => (
        <div key={m} onPointerDown={textDown(c, m)} className={`group/h absolute ${side} inset-y-0 w-2.5 flex items-center justify-center cursor-ew-resize`}>
          <i className={`w-0.5 h-4 rounded-full bg-[#FF47BC] transition-opacity ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`} />
        </div>
      ))}
    </div>
  );
};

  const resizeDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const y0 = e.clientY, h0 = tlH;
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `* { cursor: ns-resize !important; }`;
    document.head.appendChild(styleEl);
    const stop = () => {
      styleEl.remove();
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointerup", stop);
    drag((ev) => setTlH(vidClamp(h0 + (y0 - ev.clientY), VID_H_MIN, Math.min(VID_H_MAX, window.innerHeight * 0.6))));
  };

const openEase = (e, sid, kid, prop = null) => {
  e.stopPropagation();
  if (easeMenu && easeMenu.sid === sid && easeMenu.kid === kid && (easeMenu.prop ?? null) === prop)
    return setEaseMenu(null);
  const r = e.currentTarget.getBoundingClientRect();
  setEaseMenu({ sid, kid, prop, bottom: r.bottom });
};

  return (
    <div ref={rootRef} data-tour="timeline" className="order-last mt-2 shrink-0 rounded-3xl bg-[#FAF9FA] dark:bg-[#171717] flex flex-col overflow-hidden select-none">
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && f.type.startsWith("image/") && imgTargetRef.current != null) v.onShotImg(imgTargetRef.current, f);
          e.target.value = "";
        }}
      />
{!collapsed && (
  <div onPointerDown={resizeDown} className="group/rs h-2 shrink-0 flex items-center justify-center cursor-ns-resize">
    <i className="w-10 h-1 rounded-full bg-[#D0D0D0] dark:bg-[#45454C] group-hover/rs:bg-[#FF47BC] transition-colors" />
  </div>
)}
{/* Toolbar */}
<div className="flex items-center px-4 py-3 gap-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#222222]/10 dark:border-[#FAF9FA]/10">
  <div data-tour="timeline-actions" className="flex flex-1 items-center gap-1 min-w-0">
    <VidBtn label={`Add ${unit}`} shortcut={["S"]} onClick={v.onAddShot} disabled={v.exporting}><Plus size={16} weight="bold" /></VidBtn>
    <VidBtn
      label={keyState === "on" ? "Remove keyframe" : "Add keyframe"}
      shortcut={keyState === "on" ? ["⇧", "K"] : ["K"]}
      tone={keyState === "add" ? "pink" : "default"}
      onClick={v.onAddKey}
      disabled={v.exporting || keyState === "none" || keyState === "idle"}
    >
      <Diamond size={16} weight={keyState === "add" ? "fill" : "bold"} className={pending ? "key-pending" : ""} />
    </VidBtn>
<VidBtn label="Add background" onClick={v.onAddBg} disabled={v.exporting}>
      <Palette size={16} weight="bold" />
    </VidBtn>
    <VidBtn label="Loop" shortcut={["⇧", "L"]} tone={v.loop ? "pink" : "default"} onClick={v.onLoop}><ArrowsCounterClockwise size={16} weight="bold" /></VidBtn>
    {(selIds.length > 0 || v.selBg || v.selText || v.selAudio) && (
      <VidBtn label="Delete" tone="danger" shortcut={["⌫"]} onClick={v.onDelete} disabled={v.exporting}>
        <TrashSimple size={16} weight="bold" />
      </VidBtn>
    )}
  </div>

  <div data-tour="timeline-playback" className="flex items-center gap-2 shrink-0">
    <VidBtn label="Previous marker" tone="strong" onClick={() => v.onSkip(-1)}><SkipBack size={16} weight="bold" /></VidBtn>
    <VidBtn label={v.playing ? "Pause" : "Play"} tone="pink" shortcut={["Space"]} onClick={v.onTogglePlay} disabled={!hasKeys || v.exporting}>
      {v.playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
    </VidBtn>
    <VidBtn label="Next marker" tone="strong" onClick={() => v.onSkip(1)}><SkipForward size={16} weight="bold" /></VidBtn>
  </div>

  <div data-tour="timeline-duration" className="flex flex-1 items-center justify-end gap-4 min-w-0">
    <div className="flex items-center gap-2">
      <span ref={cntRef} className="tabular-nums whitespace-pre text-[#8C8C8C] dark:text-[#9A9A9A]" />
      <div className="w-[72px]">
        <OffsetField unit="s" value={Math.round(duration * 10) / 10} min={1} max={600} className="h-8" onChange={(d) => { v.onDuration(d); fitToDuration(d); }} />
      </div>
    </div>
    <div className="flex items-center gap-1">
      <VidBtn label="Add audio" onClick={() => audioInputRef.current?.click()} disabled={v.exporting}>
        <MusicNoteSimple size={16} weight="bold" />
      </VidBtn>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) v.onAudioAdd(f);
          e.target.value = "";
        }}
      />
      <VidBtn label={collapsed ? "Expand timeline" : "Collapse timeline"} onClick={() => setCollapsed((c) => !c)}>
        <CaretDown size={16} weight="bold" style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }} className="transition-transform duration-200" />
      </VidBtn>
    </div>
  </div>
</div>

{!collapsed && (
  <div className="relative">
    {/* Full-height divider between the names column and the tracks */}
    <div
      aria-hidden
      className="absolute top-0 bottom-0 z-[25] w-px pointer-events-none bg-[#222222]/10 dark:bg-[#FAF9FA]/10"
      style={{ left: VID_LABEL_W - 1 }}
    />
    <div ref={scrollRef} style={{ height: tlH }} className="relative overflow-auto custom-scroll">
      <div className="relative" style={{ width: innerW, minHeight: "100%" }}>

    {/* Ruler */}
    <div
      data-tour="timeline-ruler"
      onPointerDown={scrub}
      className="sticky top-0 z-10 h-[29px] shrink-0 cursor-pointer bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#222222]/10 dark:border-[#FAF9FA]/10"
    >
        {/* gray past the end of the duration, behind the labels and dots */}
<div
  className="absolute top-0 bottom-0 right-0 pointer-events-none bg-[#F0F0F0] dark:bg-[#1F1F1F]"
  style={{ left: x0 + axisW }}
/>
{/* drag the end of the timeline from the time row too */}
<div
  onPointerDown={durDown}
  onPointerEnter={() => setDurHover(true)}
  onPointerLeave={() => setDurHover(false)}
  className="absolute top-0 bottom-0 w-2 z-[12] flex justify-center cursor-ew-resize"
  style={{ left: x0 + axisW - 4 }}
>
  <i className={`w-px h-full transition-colors ${durHover ? "bg-[#FF47BC]" : "bg-transparent"}`} />
</div>
<div
  className="sticky left-0 z-10 h-full bg-[#FAF9FA] dark:bg-[#171717]"
  style={{ width: VID_LABEL_W }}
/>
{Array.from({ length: nTicks }, (_, i) => {
  const s = i * tickStep;
  return (
    <React.Fragment key={i}>
      <span
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 leading-3 tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]"
        style={{ left: x0 + s * pps }}
      >
        {s}s
      </span>
      {/* 3 dots = quarter steps (.25, .5, .75). The 4th quarter is the next label. */}
      {[1, 2, 3].map((j) => {
        const left = x0 + (s + (j / 4) * tickStep) * pps - 1;
        return left < innerW ? (
          <i key={j} className="absolute top-1/2 -mt-px w-0.5 h-0.5 bg-[#B9B9B9] dark:bg-[#555]" style={{ left }} />
        ) : null;
      })}
    </React.Fragment>
  );
})}
      </div>

      <div className="flex">
        {/* Shot names */}
<div
  data-tour="timeline-names"
  className="sticky left-0 z-20 shrink-0 flex flex-col gap-1 pt-2 pb-4 bg-[#FAF9FA] dark:bg-[#171717]"
  style={{ width: VID_LABEL_W }}
>
          {shots.map((s) => {
            const gi = groupInfo[s.group];
            const header = gi && gi.first === s.id ? groupLabel(gi) : null;
            if (gi && !groupOpen(gi.gid)) return header ? <React.Fragment key={s.id}>{header}</React.Fragment> : null;
            const sel = selIds.includes(s.id);
            const isOpen = !!openShots[s.id];
            const activeProp = s.id === selShot ? selProp : null;
            const parentActive = sel && !activeProp;
            return (
              <React.Fragment key={s.id}>
              {header}
              <div className="flex flex-col gap-1">
                <div
                  draggable={editingId !== s.id}
                  onDoubleClick={() => startRename(s)}
                  onContextMenu={(e) => openShotMenu(e, s)}
                  onDragStart={(e) => {
                    dragId.current = s.id;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(s.id));
                  }}
                  onDragEnter={() => dragId.current != null && dragId.current !== s.id && v.onReorder(dragId.current, s.id)}
                  onDragOver={(e) => dragId.current != null && e.preventDefault()}
                  onDragEnd={() => (dragId.current = null)}
                  onClick={(e) => {
                    if (pickRow("shot", s.id, e.shiftKey)) return;
                    v.onSelect(s.id, null, e.shiftKey);
                    pauseToEnd(s);
                  }}
                  className={`group flex items-center h-[30px] gap-1 ${gi ? "pl-8" : "pl-4"} pr-2 cursor-pointer transition-colors duration-100 ${
                    parentActive
                      ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                      : sel
                      ? "bg-[#FF47BC]/5 text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#FF47BC]/10"
                      : "text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-black/[0.03] dark:hover:bg-white/5"
                  }`}
                >
                  <DotsSixVertical
                    size={16}
                    weight="regular"
                    className={`shrink-0 cursor-grab ${parentActive ? "text-[#FF47BC]" : "text-[#949494]"}`}
                  />
                  <button
                    type="button"
                    aria-label={isOpen ? `Collapse ${unit}` : `Expand ${unit}`}
                    aria-expanded={isOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOpen(s.id);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-4 h-4 shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <CaretRight size={12} weight="bold" className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {editingId === s.id ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                          nameCancelRef.current = true;
                          e.currentTarget.blur();
                        }
                      }}
                      className="flex-1 min-w-0 h-5 px-1 -mx-1 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#FF47BC] outline-none leading-4 text-[#3A3A3A] dark:text-[#FAF9FA]"
                    />
                  ) : (
                    <>
                      {(() => {
                        const fr = s.frameId != null ? v.frames?.find((f) => f.id === s.frameId) : null;
                        const thumb = s.img?.thumb ?? fr?.thumb;
                        return thumb ? (
                          <span
                            title={s.img?.label ?? fr?.label}
                            className="w-4 h-4 shrink-0 rounded-[4px] bg-cover bg-center border border-[#3A3A3A]/10"
                            style={{ backgroundImage: `url(${thumb})` }}
                          />
                        ) : null;
                      })()}
                      <span className={`flex-1 min-w-0 truncate leading-4 ${s.hidden ? "opacity-50" : ""}`}>{s.name}</span>
                    </>
                  )}
<Tooltip label={s.hidden ? `Show ${unit}` : `Hide ${unit}`} placement="bottom" className="shrink-0 ml-auto">
  <button
    type="button"
    aria-label={s.hidden ? `Show ${unit}` : `Hide ${unit}`}
    onClick={(e) => {
      e.stopPropagation();
      v.onShot(s.id, { hidden: !s.hidden });
    }}
    onDoubleClick={(e) => e.stopPropagation()}
    className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-[opacity,background-color,transform] duration-150 active:scale-[0.94]"
  >
    {s.hidden ? (
      <EyeSlash size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
    ) : (
      <Eye size={14} weight="regular" className="text-[#3A3A3A] dark:text-[#FAF9FA]" />
    )}
  </button>
</Tooltip>
                </div>

                {isOpen &&
                  rowsFor(s).map((r) => (
                    <div
                      key={r.key}
                      onClick={(e) => {
                        setFrameRow(r.frameProp ? { sid: s.id, prop: r.frameProp } : null);
                        v.onSelect(s.id, null, e.shiftKey, r.frameProp ? "frames" : r.key);
                        pauseToEnd(s);
                      }}
                      style={{ paddingLeft: gi ? 64 : 48 }}
                      className={`fx-enter flex items-center h-[30px] gap-2 pr-2 cursor-pointer transition-colors duration-100 ${
                        rowActive(s, r)
                          ? "bg-[#FF47BC]/10 text-[#FF47BC]"
                          : "text-[#8C8C8C] dark:text-[#9A9A9A] hover:bg-[#FF47BC]/5"
                      }`}
                    >
                      <span className="truncate leading-4">{r.label}</span>
                    </div>
                  ))}
              </div>
              </React.Fragment>
            );
          })}
          {v.bgs.map((b, i) =>
  rowLabel(
    `bg-${b.id}`,
    bgLabel(b, i),
    !!v.selBg?.ids?.includes(b.id),
    (e) => {
      if (v.playing) v.onPause();
      if (!pickRow("bg", b.id, e.shiftKey)) v.onBgSelect(b.id, e.shiftKey);
    },
    (e) => {
      e.preventDefault();
      if (!v.selBg?.ids?.includes(b.id)) v.onBgSelect(b.id);
      setBgMenu({ bid: b.id, left: Math.min(e.clientX, window.innerWidth - 226), top: Math.min(e.clientY, window.innerHeight - 124) });
    },
    Palette,
    {
      editing: bgEditingId === b.id,
      draft: bgDraft,
      setDraft: setBgDraft,
      commit: commitBgRename,
      cancel: () => { bgCancelRef.current = true; },
      start: () => startBgRename(b),
    },
    { hidden: !!b.hidden, toggle: () => v.onBgToggleHidden(b.id) }
  )
)}
{v.texts.map((c) =>
  rowLabel(
    `tx-${c.id}`,
    v.textName(c.tid),
    !!v.selText?.ids?.includes(c.id),
    (e) => {
      if (v.playing) v.onPause();
      if (!pickRow("text", c.id, e.shiftKey)) v.onTextSelect(c.id, e.shiftKey);
    },
    (e) => {
      e.preventDefault();
      if (!v.selText?.ids?.includes(c.id)) v.onTextSelect(c.id);
      setTextMenu({ cid: c.id, left: Math.min(e.clientX, window.innerWidth - 196), top: e.clientY, });
    },
    TextT,
    {
      editing: textEditingId === c.id,
      draft: textDraft,
      setDraft: setTextDraft,
      commit: commitTextRename,
      cancel: () => { textCancelRef.current = true; },
      start: () => startTextRename(c),
    },
    { hidden: v.textHidden(c.tid), toggle: () => v.onTextToggleHidden(c.tid) }
  )
)}
{v.audios.map((a) =>
  rowLabel(
    `au-${a.id}`,
    a.name,
    v.selAudio?.aid === a.id,
    () => {
      if (v.playing) v.onPause();
      v.onAudioSelect(a.id);
    },
    undefined,
    MusicNoteSimple,
    undefined,
    { hidden: !!a.muted, toggle: () => v.onAudioPatch(a.id, { muted: !a.muted }) } // eye = mute
  )
)}
        </div>

        {/* Tracks */}
        <div data-tour="timeline-tracks" onPointerDown={scrub} className="relative flex-1 flex flex-col gap-1 pt-2 pb-4 cursor-pointer">
          {shots.map((s) => {
            const gi = groupInfo[s.group];
            const header = gi && gi.first === s.id ? groupTrack(gi) : null;
            if (gi && !groupOpen(gi.gid)) return header ? <React.Fragment key={s.id}>{header}</React.Fragment> : null;
            const sel = selIds.includes(s.id);
            const w = s.len * pps;
            const isOpen = !!openShots[s.id];
            const activeProp = s.id === selShot ? selProp : null;
            const parentActive = sel && !activeProp;
            return (
              <React.Fragment key={s.id}>
              {header}
              <div className="flex flex-col gap-1">
                <div
                  className={`relative h-[30px] ${parentActive ? "bg-[#FF47BC]/10" : sel ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F]"}`}
                  onPointerDown={(e) => {
                    if (!pickRow("shot", s.id, e.shiftKey)) v.onSelect(s.id, null, e.shiftKey);
                    pauseToEnd(s);
                    e.stopPropagation(); // keep the scrub from overriding the jump to the shot's initial state
                  }}
                  onContextMenu={(e) => openShotMenu(e, s)}
                >
                  <div
                    onPointerDown={clipDown(s, "move")}
                    className={`group absolute top-0 h-[30px] rounded-[8px] cursor-grab active:cursor-grabbing ${s.hidden ? "opacity-40" : ""} ${
                      parentActive
                        ? "bg-[#FF47BC] border border-[#FF47BC]"
                        : sel
                        ? "bg-[#FF47BC]/20"
                        : "bg-[#E3E3E3] dark:bg-[#333333]"
                    }`}
                    style={{ left: VID_PAD + s.start * pps, width: w }}
                  >
                    {renderAnimRamps(s, w, parentActive, sel && !isOpen)}
                    {[["l", "left-0"], ["r", "right-0"]].map(([m, side]) => (
                      <div
                        key={m}
                        onPointerDown={clipDown(s, m)}
                        className={`group/h absolute ${side} inset-y-0 w-2.5 flex items-center justify-center cursor-ew-resize`}
                      >
<i
  className={`w-0.5 h-4 rounded-full transition-[opacity,background-color] ${
    parentActive
      ? "bg-white opacity-100"
      : `${sel || isOpen ? "bg-[#FF47BC]" : "bg-[#8C8C8C] dark:bg-[#9A9A9A]"} opacity-0 group-hover:opacity-100 group-active/h:bg-[#FF47BC]`
  }`}
/>
                      </div>
                    ))}
{sel && !isOpen && (() => {
  const kx = (k) => vidClamp(k.t * pps, 15, Math.max(15, w - 15));
  return (
    <>
      {/* lines + easing button between consecutive keyframes (all properties) */}
      {s.keys.slice(0, -1).map((k, i) => {
        const x1 = kx(k), x2 = kx(s.keys[i + 1]);
        return (
          <React.Fragment key={`seg-${k.id}`}>
            <i
              className="absolute top-1/2 h-px bg-[#FAF9FA]/70 pointer-events-none"
              style={{ left: x1 + 9, width: Math.max(0, x2 - x1 - 18) }}
            />
            {x2 - x1 >= 44 && (
              <button
                type="button"
                data-vid-ease-btn
                aria-label="Easing"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => openEase(e, s.id, k.id, null)}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md border border-[#FF47BC] bg-[#FAF9FA] text-[#FF47BC] hover:!bg-[#FAD8EF] transition-[opacity,background-color] focus-visible:opacity-100 ${
                  easeMenu && easeMenu.sid === s.id && easeMenu.kid === k.id && !easeMenu.prop
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                style={{ left: (x1 + x2) / 2 }}
              >
                <EaseIcon size={12} />
              </button>
            )}
          </React.Fragment>
        );
      })}

      {/* keyframes */}
      {s.keys.map((k) => (
        <div
          key={k.id}
          onPointerDown={keyDown(s, k)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            v.onSelect(s.id, k.id);
            setKeyMenu({
              sid: s.id,
              kid: k.id,
              left: Math.min(e.clientX, window.innerWidth - 196),
              top: e.clientY,
            });
          }}
          className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ left: kx(k) }}
          title={fmtTC(s.start + k.t)}
        >
          <Diamond size={14} weight={k.id === selKey || keyMenu?.kid === k.id ? "fill" : "bold"} className={`text-[#FAF9FA] transition-transform ${k.id === selKey ? "scale-125" : ""}`} />
        </div>
      ))}
    </>
  );
})()}
                    {pending?.sid === s.id && (
                      <i
                        aria-hidden
                        className="key-pending absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-[#FF47BC] bg-[#FAF9FA] pointer-events-none"
                        style={{ left: vidClamp(pending.rel * pps, 15, Math.max(15, w - 15)) }}
                      />
                    )}
                  </div>
                </div>

                {isOpen &&
                  rowsFor(s).map((r) => (
<div
  key={r.key}
  className={`group/track fx-enter relative h-[30px] transition-colors duration-100 ${
    rowActive(s, r) ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F] hover:bg-[#FF47BC]/5"
  }`}
  onPointerDown={(e) => {
    setFrameRow(r.frameProp ? { sid: s.id, prop: r.frameProp } : null);
    v.onSelect(s.id, null, e.shiftKey, e.shiftKey ? null : r.frameProp ? "frames" : r.key);
    if (pauseToEnd(s)) e.stopPropagation();
  }}
>
  <div
    className={`absolute top-0 h-[30px] rounded-[8px] transition-colors duration-100 ${
      rowActive(s, r) ? "bg-[#FF47BC]/20" : "bg-[#E3E3E3]/60 dark:bg-[#333333]/60"
    }`}
    style={{ left: VID_PAD + s.start * pps, width: w }}
  >
  {(() => {
    const kx = (k) => vidClamp(k.t * pps, 15, Math.max(15, w - 15));
    const pk = r.frameProp ? r.keys : s.keys.filter((k) => !k.props || k.props.includes(r.key));
    return (
      <>
        {/* lines + easing button between consecutive keyframes */}
        {pk.slice(0, -1).map((k, i) => {
          const x1 = kx(k), x2 = kx(pk[i + 1]);
          return (
            <React.Fragment key={`seg-${k.id}`}>
              <i
                className="absolute top-1/2 h-px bg-[#FF47BC] pointer-events-none"
                style={{ left: x1 + 8, width: Math.max(0, x2 - x1 - 16) }}
              />
              {x2 - x1 >= 44 && !r.frameProp && (
                <button
                  type="button"
                  data-vid-ease-btn
                  aria-label="Easing"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => openEase(e, s.id, k.id, r.key)}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md border border-[#FF47BC] bg-[#FAF9FA] text-[#FF47BC] hover:!bg-[#FAD8EF] transition-[opacity,background-color] focus-visible:opacity-100 ${
                    easeMenu && easeMenu.sid === s.id && easeMenu.kid === k.id && easeMenu.prop === r.key
                      ? "opacity-100"
                      : "opacity-0 group-hover/track:opacity-100"
                  }`}
                  style={{ left: (x1 + x2) / 2 }}
                >
                  <EaseIcon size={12} />
                </button>
              )}
            </React.Fragment>
          );
        })}

        {/* keyframes */}
        {pk.map((k) => (
          (() => {
            const isFr = !!r.frameProp;
            const on = k.id === selKey && (isFr ? frameRow?.sid === s.id && frameRow.prop === r.frameProp : activeProp === r.key);
            return (
              <div
                key={k.id}
                onPointerDown={(e) => {
                  if (isFr) setFrameRow({ sid: s.id, prop: r.frameProp });
                  keyDown(s, k, isFr ? "frames" : r.key)(e);
                }}
                className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing"
                style={{ left: kx(k) }}
                title={
                  isFr
                    ? `${r.label}: ${(+(k.frames[s.frameId][r.frameProp] ?? 0)).toFixed(r.frameProp === "s" ? 5 : 2)}`
                    : `${r.label}: ${Math.round(k[r.key])}`
                }
              >
                <Diamond
                  size={12}
                  weight={on ? "fill" : "bold"}
                  className={`text-[#FF47BC] transition-transform ${on ? "scale-125" : ""}`}
                />
              </div>
            );
          })()
        ))}

        {pending?.sid === s.id && pending.props.includes(r.frameProp ? "frames" : r.key) && (
          <i
            aria-hidden
            className="key-pending absolute top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-[#FF47BC] bg-[#FAF9FA] pointer-events-none"
            style={{ left: kx({ t: pending.rel }) }}
          />
        )}
      </>
    );
  })()}
                      </div>
                    </div>
                  ))}
              </div>
              </React.Fragment>
            );
          })}
          {v.bgs.map((b) => {
  const selected = !!v.selBg?.ids?.includes(b.id);
  return (
    <div key={b.id} className={`fx-enter relative h-[30px] ${selected ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F]"}`}>
      <div
        onPointerDown={bgDown(b, "move")}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          v.onBgSelect(b.id);
          setBgMenu({
            bid: b.id,
            left: Math.min(e.clientX, window.innerWidth - 226),
            top: e.clientY,
          });
        }}
        className={`group absolute top-0 h-[30px] rounded-[8px] overflow-hidden border cursor-grab active:cursor-grabbing ${
          selected ? "border-[#FF47BC] border-2" : "border-[#3A3A3A]/15"
        } ${b.hidden ? "opacity-40" : ""}`}
        style={{ left: VID_PAD + b.start * pps, width: b.len * pps, background: b.css }}
      >
        {["enter", "exit"].map((kind) => {
          const an = bgAnimOf(b, kind);
          if (!an) return null;
          const isIn = kind === "enter";
          const gap = Math.min(an.delay / 1000, b.len) * pps;
          const dw = Math.max(8, Math.min(an.dur / 1000, b.len) * pps);
          return (
            <i
              key={kind}
              className={`absolute inset-y-0 pointer-events-none ${isIn ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-white/60 to-transparent`}
              style={isIn ? { left: gap, width: dw } : { right: gap, width: dw }}
            />
          );
        })}
        {[["l", "left-0"], ["r", "right-0"]].map(([m, side]) => (
          <div key={m} onPointerDown={bgDown(b, m)} className={`group/h absolute ${side} inset-y-0 w-2.5 flex items-center justify-center cursor-ew-resize`}>
            <i className={`w-0.5 h-4 rounded-full bg-white group-active/h:bg-[#FF47BC] transition-[opacity,background-color] ${
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`} />
          </div>
        ))}
      </div>
    </div>
  );
})}
{v.texts.map((c) => (
  <div
    key={c.id}
    className={`fx-enter relative h-[30px] transition-colors duration-100 ${
      v.selText?.ids?.includes(c.id)
        ? "bg-[#FF47BC]/5"
        : "bg-[#F0F0F0] dark:bg-[#1F1F1F] hover:bg-[#FF47BC]/5"
    }`}
  >
    {renderTextClip(c)}
  </div>
))}
{v.audios.map((a) => {
  const sel = v.selAudio?.aid === a.id;
  return (
    <div key={a.id} className={`fx-enter relative h-[30px] ${sel ? "bg-[#FF47BC]/5" : "bg-[#F0F0F0] dark:bg-[#1F1F1F]"}`}>
      <div
        onPointerDown={audioDown(a, "move")}
        className={`group absolute top-0 h-[30px] rounded-[8px] overflow-hidden cursor-grab active:cursor-grabbing bg-[#FF47BC]/20 hover:bg-[#FF47BC]/25 border-2 ${
          sel ? "border-[#FF47BC]" : "border-transparent"
        } ${a.muted ? "opacity-40" : ""}`}
        style={{ left: VID_PAD + a.start * pps, width: a.len * pps }}
      >
        <AudioWave a={a} />
        <span className="absolute inset-y-0 left-3 right-3 flex items-center truncate leading-4 pointer-events-none text-[#FF47BC]">
          {a.name}
        </span>
        {[["l", "left-0"], ["r", "right-0"]].map(([m, side]) => (
          <div key={m} onPointerDown={audioDown(a, m)} className={`group/h absolute ${side} inset-y-0 w-2.5 flex items-center justify-center cursor-ew-resize`}>
            <i className={`w-0.5 h-4 rounded-full bg-[#FF47BC] transition-opacity ${sel ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
          </div>
        ))}
      </div>
    </div>
  );
})}
        </div>
      </div>

      {/* End zone: drag its edge to change the timeline length */}
<div
  className="absolute top-[29px] bottom-0 right-0 z-[11] pointer-events-none bg-[#F0F0F0] dark:bg-[#1F1F1F]"
  style={{ left: x0 + axisW }}
>
        <div
          onPointerDown={durDown}
          onPointerEnter={() => setDurHover(true)}
          onPointerLeave={() => setDurHover(false)}
          className="absolute top-0 bottom-0 -left-1 w-2 flex justify-center cursor-ew-resize pointer-events-auto"
        >
          <i className={`w-px h-full transition-colors ${durHover ? "bg-[#FF47BC]" : "bg-transparent"}`} />
        </div>
      </div>

      {/* Playhead */}
      <div
        ref={headRef}
        className="absolute top-0 bottom-0 left-0 z-[15] pointer-events-none"
        style={{ transform: `translateX(${x0 + timeRef.current * pps}px)` }}
      >
        <div
  onPointerDown={scrub}
  className="absolute left-0 top-0 -translate-x-1/2 px-[7px] py-0.5 rounded-[4px] bg-[#FF47BC] flex items-center pointer-events-auto cursor-grab active:cursor-grabbing"
>
          <span ref={tcRef} className="tabular-nums leading-[18px] text-[#FCFCFC]">00:00:00</span>
          <i className="absolute left-1/2 -bottom-[3px] -ml-1 w-2 h-2 rotate-45 rounded-[1px] bg-[#FF47BC]" />
        </div>
        <div className="absolute left-0 top-[22px] bottom-0 w-px bg-[#FF47BC]" />
      </div>
    </div>
    </div>
  </div>
)}

      {keyMenu &&
        createPortal(
          <div
            data-vid-key-menu
            role="menu"
            style={{ position: "fixed", left: keyMenu.left, top: keyMenu.top }}
            className="pop-enter w-[190px] p-2 gap-1 flex flex-col bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9999]"
          >
            <button
              type="button"
              onClick={() => {
                v.onKeyUpdate(keyMenu.sid, keyMenu.kid);
                setKeyMenu(null);
              }}
              className="flex items-center w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F] transition-colors duration-100"
            >
              Update keyframe
            </button>
            <button
              type="button"
              onClick={() => {
                v.onKeyDelete(keyMenu.sid, keyMenu.kid);
                setKeyMenu(null);
              }}
              className="flex items-center justify-between w-full h-8 pl-2 pr-1.5 rounded-lg text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#F04438]/10 hover:text-[#F04438] dark:hover:text-[#F04438] transition-colors duration-100"
            >
              Delete keyframe
              <KeyCombo keys={["⌫"]} />
            </button>
          </div>,
          document.body
        )}

{shotMenu &&
  createPortal(
    <CtxMenu data-vid-shot-menu left={shotMenu.left} top={shotMenu.top} width={190}>
      {[["enter", "Enter animation"], ["exit", "Exit animation"]].map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          onClick={() => {
            setShotMenu(null);
            setAnimMenu({ sid: shotMenu.sid, kind });
          }}
          className={CTX_ITEM}
        >
          {label}
        </button>
      ))}
      {!v.frameMode && (
        <>
          {CTX_DIVIDER}
          <button
            type="button"
            onClick={() => {
              imgTargetRef.current = shotMenu.sid;
              setShotMenu(null);
              imgInputRef.current?.click();
            }}
            className={CTX_ITEM}
          >
            {shots.find((x) => x.id === shotMenu.sid)?.img ? "Replace image" : "Set image"}
          </button>
          {shots.find((x) => x.id === shotMenu.sid)?.img && (
            <button
              type="button"
              onClick={() => {
                v.onShotImg(shotMenu.sid, null);
                setShotMenu(null);
              }}
              className={CTX_ITEM}
            >
              Remove image
            </button>
          )}
        </>
      )}
      <button
        type="button"
        onClick={() => {
          const s = shots.find((x) => x.id === shotMenu.sid);
          setShotMenu(null);
          if (s) startRename(s);
        }}
        className={CTX_ITEM}
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => {
          setShotMenu(null);
          v.onDuplicate();
        }}
        className={`${CTX_ITEM} justify-between`}
      >
        Duplicate
        <KeyCombo keys={["mod", "D"]} />
      </button>
      {selIds.length >= 2 && selIds.includes(shotMenu.sid) && (
        <button
          type="button"
          onClick={() => {
            setShotMenu(null);
            v.onGroup();
          }}
          className={`${CTX_ITEM} justify-between`}
        >
          Group
          <KeyCombo keys={["mod", "G"]} />
        </button>
      )}
      {(shots.find((x) => x.id === shotMenu.sid)?.group || shots.some((x) => selIds.includes(x.id) && x.group)) && (
        <button
          type="button"
          onClick={() => {
            setShotMenu(null);
            v.onUngroup();
          }}
          className={`${CTX_ITEM} justify-between`}
        >
          Ungroup
          <KeyCombo keys={["mod", "⇧", "G"]} />
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setShotMenu(null);
          v.onDelete();
        }}
        className={CTX_DANGER}
      >
        Delete
        <KeyCombo keys={["⌫"]} />
      </button>
    </CtxMenu>,
    document.body
  )}

{bgMenu &&
  createPortal(
    <CtxMenu data-vid-bg-menu left={bgMenu.left} top={bgMenu.top} width={210}>
      {[["enter", "Enter animation"], ["exit", "Exit animation"]].map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          onClick={() => {
            setBgAnimMenu({ bid: bgMenu.bid, kind });
            setBgMenu(null);
          }}
          className={CTX_ITEM}
        >
          {label}
        </button>
      ))}
      {CTX_DIVIDER}
      <button
        type="button"
        onClick={() => {
          const b = v.bgs.find((x) => x.id === bgMenu.bid);
          setBgMenu(null);
          if (b) startBgRename(b);
        }}
        className={CTX_ITEM}
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => {
          v.onBgDuplicate(bgMenu.bid);
          setBgMenu(null);
        }}
        className={`${CTX_ITEM} justify-between`}
      >
        Duplicate
        <KeyCombo keys={["mod", "D"]} />
      </button>
      <button
        type="button"
        onClick={() => {
          v.onBgUpdate(bgMenu.bid);
          setBgMenu(null);
        }}
        className={CTX_ITEM}
      >
        Update to current background
      </button>
      <button
        type="button"
        onClick={() => {
          v.onBgDelete(bgMenu.bid);
          setBgMenu(null);
        }}
        className={CTX_DANGER}
      >
        Delete background
        <KeyCombo keys={["⌫"]} />
      </button>
    </CtxMenu>,
    document.body
  )}

{easeMenu &&
  createPortal(
    <EasePopover v={v} menu={easeMenu} onClose={() => setEaseMenu(null)} />,
    document.body
  )}

{bgAnimMenu &&
  createPortal(
    <BgAnimPopover
      v={v}
      menu={bgAnimMenu}
      onClose={() => setBgAnimMenu(null)}
      onSwitch={(kind) => setBgAnimMenu((m) => (m ? { ...m, kind } : m))}
    />,
    document.body
  )}

{animMenu &&
  createPortal(
    <ShotAnimPopover
      v={v}
      menu={animMenu}
      onClose={() => setAnimMenu(null)}
      onSwitch={(kind) => setAnimMenu((m) => (m ? { ...m, kind } : m))}
    />,
    document.body
  )}

{textMenu &&
  createPortal(
    <CtxMenu data-vid-text-menu left={textMenu.left} top={textMenu.top} width={190}>
      {[["enter", "Enter animation"], ["exit", "Exit animation"]].map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          onClick={() => {
            setTextAnimMenu({ cid: textMenu.cid, kind });
            setTextMenu(null);
          }}
          className={CTX_ITEM}
        >
          {label}
        </button>
      ))}
      {CTX_DIVIDER}
      <button
        type="button"
        onClick={() => {
          const c = v.texts.find((x) => x.id === textMenu.cid);
          setTextMenu(null);
          if (c) startTextRename(c);
        }}
        className={CTX_ITEM}
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => {
          v.onTextDuplicate(textMenu.cid);
          setTextMenu(null);
        }}
        className={`${CTX_ITEM} justify-between`}
      >
        Duplicate
        <KeyCombo keys={["mod", "D"]} />
      </button>
      <button
        type="button"
        onClick={() => {
          v.onTextDelete(textMenu.cid);
          setTextMenu(null);
        }}
        className={CTX_DANGER}
      >
        Delete text
        <KeyCombo keys={["⌫"]} />
      </button>
    </CtxMenu>,
    document.body
  )}

{textAnimMenu &&
  createPortal(
    <TextAnimPopover
      v={v}
      menu={textAnimMenu}
      onClose={() => setTextAnimMenu(null)}
      onSwitch={(kind) => setTextAnimMenu((m) => (m ? { ...m, kind } : m))}
    />,
    document.body
  )}
    </div>
  );
}