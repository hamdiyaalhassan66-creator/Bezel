import { useRef } from "react";
import { toast } from "../lib/toast.js";
import { FRAME_DEFAULT_SIZE, cloneFrame, frameRect } from "../lib/frameModel.js";

export function useFrameOps({
  frames, setFrames, selectedIds, setSelectedIds,
  framesLatestRef, selectedIdsRef, frameSizeRef, nextFrameIdRef, markFrameEdit,
}) {
  const frameClipRef = useRef(null);
  const pasteNudgeRef = useRef(0);

  // Duplicate: copies each selected image frame, nudged down-right, on top of the stack.
  const duplicateSelected = () => {
    const sel = frames.filter((f) => selectedIds.includes(f.id) && f.img);
    if (!sel.length) return;
    const copies = sel.map((f) => ({
      ...f,
      id: nextFrameIdRef.current++,
      x: f.x + 0.03,
      y: f.y + 0.03,
      img: { ...f.img },
      corners: f.corners ? [...f.corners] : null,
      stroke: { ...f.stroke },
      social: { ...f.social },
      browser: f.browser ? { ...f.browser } : undefined,
      effects: f.effects.map((e) => ({ ...e })),
      backStops: f.backStops.map((s) => ({ ...s })),
    }));
    const next = [...frames, ...copies];
    framesLatestRef.current = next;
    setFrames(next);
    setSelectedIds(copies.map((c) => c.id));
    toast(copies.length > 1 ? `${copies.length} frames duplicated` : "Frame duplicated");
  };

  // Adds an empty frame next to the selected one, with the same look.
  const addBlankFrame = () => {
    const prev = framesLatestRef.current;
    const base = prev.find((f) => selectedIdsRef.current.includes(f.id)) ?? prev[prev.length - 1];
    const id = nextFrameIdRef.current++;
    const blank = { ...cloneFrame(base, id), img: null, x: 0, y: 0, w: FRAME_DEFAULT_SIZE.w, h: FRAME_DEFAULT_SIZE.h, s: null, r: 0, hidden: false, locked: false, flipX: false, flipY: false };
    const next = [...prev, blank];
    framesLatestRef.current = next;
    setFrames(next);
    setSelectedIds([id]);
  };

  const copyFrames = () => {
    const sel = framesLatestRef.current.filter((f) => selectedIdsRef.current.includes(f.id));
    if (!sel.length) return;
    frameClipRef.current = sel.map((f) => cloneFrame(f, f.id));
    pasteNudgeRef.current = 0;
    toast(sel.length > 1 ? `${sel.length} frames copied` : "Frame copied");
  };

  // point = canvas px (from the menu): the pasted group is centered there. No point: nudged down-right.
  const pasteFrames = (point = null) => {
    const clip = frameClipRef.current;
    const box = frameSizeRef.current;
    if (!clip?.length || !box) return false;
    const short = Math.min(box.w, box.h);
    let dx = 0, dy = 0;
    if (point) {
      const rects = clip.map((f) => frameRect(f, box));
      const gcx = (Math.min(...rects.map((r) => r.left)) + Math.max(...rects.map((r) => r.left + r.width))) / 2;
      const gcy = (Math.min(...rects.map((r) => r.top)) + Math.max(...rects.map((r) => r.top + r.height))) / 2;
      dx = (point.x - gcx) / short;
      dy = (point.y - gcy) / short;
    } else {
      pasteNudgeRef.current += 1;
      dx = dy = 0.03 * pasteNudgeRef.current;
    }
    const copies = clip.map((f) => ({
      ...cloneFrame(f, nextFrameIdRef.current++),
      x: f.x + dx, y: f.y + dy, hidden: false, locked: false,
    }));
    const next = [...framesLatestRef.current, ...copies];
    framesLatestRef.current = next;
    setFrames(next);
    setSelectedIds(copies.map((c) => c.id));
    toast(copies.length > 1 ? `${copies.length} frames pasted` : "Frame pasted");
    return true;
  };

  // Frames render in array order, so the end of the array is the front
  const reorderSelected = (toFront) => {
    const ids = selectedIdsRef.current;
    const cur = framesLatestRef.current;
    const picked = cur.filter((f) => ids.includes(f.id));
    if (!picked.length) return;
    const rest = cur.filter((f) => !ids.includes(f.id));
    const next = toFront ? [...rest, ...picked] : [...picked, ...rest];
    if (next.every((f, i) => f === cur[i])) return;
    framesLatestRef.current = next;
    setFrames(next);
  };

  const toggleFrameFlag = (key) => {
    const ids = selectedIdsRef.current;
    const sel = framesLatestRef.current.filter((f) => ids.includes(f.id));
    if (!sel.length) return;
    const on = !sel.every((f) => f[key]);
    setFrames((prev) => prev.map((f) => (ids.includes(f.id) ? { ...f, [key]: on } : f)));
  };
  const toggleHideSelected = () => toggleFrameFlag("hidden");
  const toggleLockSelected = () => toggleFrameFlag("locked");

  // One frame flips in place. A multi-selection also mirrors its positions around the group's center.
  const flipSelected = (axis) => {
    markFrameEdit();
    const ids = selectedIdsRef.current;
    const box = frameSizeRef.current;
    const sel = framesLatestRef.current.filter((f) => ids.includes(f.id));
    if (!sel.length || !box) return;
    const short = Math.min(box.w, box.h);
    const key = axis === "h" ? "flipX" : "flipY";
    const pos = axis === "h" ? "x" : "y";
    let mirror = null;
    if (sel.length > 1) {
      const rects = sel.map((f) => frameRect(f, box));
      mirror = axis === "h"
        ? (Math.min(...rects.map((r) => r.left)) + Math.max(...rects.map((r) => r.left + r.width))) / 2
        : (Math.min(...rects.map((r) => r.top)) + Math.max(...rects.map((r) => r.top + r.height))) / 2;
    }
    setFrames((prev) =>
      prev.map((f) => {
        if (!ids.includes(f.id)) return f;
        const n = { ...f, [key]: !f[key], r: f.r ? -f.r : f.r };
        if (mirror != null) {
          const r = frameRect(f, box);
          const c = axis === "h" ? r.left + r.width / 2 : r.top + r.height / 2;
          n[pos] = f[pos] + (2 * (mirror - c)) / short;
        }
        return n;
      })
    );
  };

  // One frame aligns to the canvas; two or more align to the selection's bounds (like Figma).
  const alignSelected = (kind) => {
    markFrameEdit();
    const box = frameSizeRef.current;
    const sel = frames.filter((f) => selectedIds.includes(f.id));
    if (!box || !sel.length) return;
    const short = Math.min(box.w, box.h);
    const rects = new Map(sel.map((f) => [f.id, frameRect(f, box)]));
    const list = [...rects.values()];
    const ref =
      sel.length > 1
        ? {
            l: Math.min(...list.map((r) => r.left)),
            r: Math.max(...list.map((r) => r.left + r.width)),
            t: Math.min(...list.map((r) => r.top)),
            b: Math.max(...list.map((r) => r.top + r.height)),
          }
        : { l: 0, r: box.w, t: 0, b: box.h };
    setFrames((prev) =>
      prev.map((f) => {
        const r = rects.get(f.id);
        if (!r) return f;
        let dx = 0, dy = 0;
        switch (kind) {
          case "left": dx = ref.l - r.left; break;
          case "right": dx = ref.r - (r.left + r.width); break;
          case "hcenter": dx = (ref.l + ref.r) / 2 - (r.left + r.width / 2); break;
          case "top": dy = ref.t - r.top; break;
          case "bottom": dy = ref.b - (r.top + r.height); break;
          case "vcenter": dy = (ref.t + ref.b) / 2 - (r.top + r.height / 2); break;
        }
        return { ...f, x: f.x + dx / short, y: f.y + dy / short };
      })
    );
  };

  // True when every selected frame currently sits on that alignment line
  const isFrameAligned = (kind) => {
    const box = frameSizeRef.current;
    const sel = frames.filter((f) => selectedIds.includes(f.id));
    if (!box || !sel.length) return false;
    const rects = sel.map((f) => frameRect(f, box));
    const ref =
      sel.length > 1
        ? {
            l: Math.min(...rects.map((r) => r.left)),
            r: Math.max(...rects.map((r) => r.left + r.width)),
            t: Math.min(...rects.map((r) => r.top)),
            b: Math.max(...rects.map((r) => r.top + r.height)),
          }
        : { l: 0, r: box.w, t: 0, b: box.h };
    const EPS = 0.5;
    return rects.every((r) => {
      switch (kind) {
        case "left": return Math.abs(r.left - ref.l) < EPS;
        case "right": return Math.abs(r.left + r.width - ref.r) < EPS;
        case "hcenter": return Math.abs(r.left + r.width / 2 - (ref.l + ref.r) / 2) < EPS;
        case "top": return Math.abs(r.top - ref.t) < EPS;
        case "bottom": return Math.abs(r.top + r.height - ref.b) < EPS;
        case "vcenter": return Math.abs(r.top + r.height / 2 - (ref.t + ref.b) / 2) < EPS;
        default: return false;
      }
    });
  };

  // Needs 3+ frames: the outer two stay put and the gaps between all of them become equal.
  const distributeSelected = (axis) => {
    markFrameEdit();
    const box = frameSizeRef.current;
    const sel = frames.filter((f) => selectedIds.includes(f.id));
    if (!box || sel.length < 3) return;
    const short = Math.min(box.w, box.h);
    const horiz = axis === "h";
    const size = (r) => (horiz ? r.width : r.height);
    const start = (r) => (horiz ? r.left : r.top);
    const items = sel
      .map((f) => ({ f, r: frameRect(f, box) }))
      .sort((a, b) => start(a.r) - start(b.r));
    const first = start(items[0].r);
    const lastItem = items[items.length - 1].r;
    const gap = (start(lastItem) + size(lastItem) - first - items.reduce((sum, i) => sum + size(i.r), 0)) / (items.length - 1);
    let cursor = first;
    const shifts = new Map();
    items.forEach(({ f, r }) => {
      shifts.set(f.id, (cursor - start(r)) / short);
      cursor += size(r) + gap;
    });
    const key = horiz ? "x" : "y";
    setFrames((prev) => prev.map((f) => (shifts.has(f.id) ? { ...f, [key]: f[key] + shifts.get(f.id) } : f)));
  };

  return {
    frameClipRef,
    duplicateSelected, addBlankFrame, copyFrames, pasteFrames, reorderSelected,
    toggleHideSelected, toggleLockSelected, flipSelected,
    alignSelected, isFrameAligned, distributeSelected,
  };
}