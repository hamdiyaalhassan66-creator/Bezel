import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { hexRgba } from "../lib/frameUtils.js";
import { mixHex, txtUnitStates, txtTree, sampleTextAnim } from "../lib/textAnim.js";
import {
  withTextFill, truncateTextItem, kernAdjust, readEditable, useBoxSize,
  textFlexAlign, textBlockStyle, snapAxis,
} from "../lib/textUtils.js";
import { RESIZE_HANDLES } from "../constants/canvasControls.js";

// anim = { spec, p } from sampleTextAnim. Without it (or with spec null) the text renders plain.
function TextLines({ item, anim }) {
  const gap = item.paragraphSpacing ?? 0;
  const plain = String(item.content ?? "")
    .split("\n")
    .map((ln, i) => (
      // fontSize: "inherit" keeps the global "12px !important" rule off these lines,
      // so they use the box's real font size, weight and letter spacing.
      <div key={i} style={{ fontSize: "inherit", marginTop: i ? gap : 0, minHeight: "1em" }}>
        {ln}
      </div>
    ));
  const spec = anim?.spec;
  if (!spec) return plain;

  const px = item.size;
  const restFill = withTextFill(item);
  const css = (u) => ({
    opacity: Math.min(1, Math.max(0, u.a)),
    transform: `translate(${(u.x / 100) * px}px, ${(u.y / 100) * px}px) rotate(${u.r}deg) scale(${u.s})`,
    filter:
      [
        u.b > 0.05 && `blur(${(u.b / 100) * px}px)`,
        u.sh > 0.5 && `drop-shadow(0 ${(u.sh / 100) * px * 0.25}px ${(u.sh / 100) * px * 0.5}px rgba(0,0,0,0.5))`,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
    color: u.c ? hexRgba(mixHex(u.c, restFill.hex, u.ce), restFill.opacity) : undefined,
    letterSpacing: u.ls ? `${((item.letterSpacing ?? 0) + u.ls) / 100}em` : undefined,
    lineHeight: u.lh ? `${item.lineHeight + u.lh}%` : undefined,
    transformOrigin: "50% 50%",
  });
  // With a mask the outer box clips the unit while the inner one moves inside it.
  const unit = (key, children, u, block, kern = 0) => {
    const box = { display: block ? "block" : "inline-block", whiteSpace: "inherit", fontSize: "inherit" };
    return (
      <span
        key={key}
        style={spec.mask ? { ...box, overflow: "hidden", verticalAlign: "top", marginLeft: kern } : { display: "contents", fontSize: "inherit" }}
      >
        <span style={{ ...css(u), ...box, marginLeft: spec.mask ? 0 : kern }}>{children}</span>
      </span>
    );
  };

  if (spec.split === "block") {
    const [u] = txtUnitStates(spec, anim.p, 1);
    return unit("blk", plain, u, true);
  }

  const tree = txtTree(item.content, spec.split);
  const st = txtUnitStates(spec, anim.p, tree.count);
  return tree.lines.map((ln, i) => (
    <div key={i} style={{ fontSize: "inherit", marginTop: i ? gap : 0, minHeight: "1em" }}>
      {spec.split === "line"
        ? unit("l", ln.text, st[ln.lineIdx], true)
        : ln.tokens.map((tk, j) => {
            if (tk.sp !== undefined) return tk.sp;
            if (tk.chars)
              return (
                <span key={j} style={{ whiteSpace: "nowrap", fontSize: "inherit" }}>
                  {tk.chars.map((c, ci) =>
                    unit(c.idx, c.ch, st[c.idx], false, ci ? kernAdjust(item, tk.chars[ci - 1].ch, c.ch) : 0)
                  )}
                </span>
              );
            if (spec.split === "word") return unit(j, tk.w, st[tk.idx], false);
            return tk.w;
          })}
    </div>
  ));
}

// Visual-only text layers (used for "behind" text in Frame mode, under the frames).
function TextOverlayOne({ item, vidAnim }) {
  const ref = useRef(null);
  const itemRef = useRef(item);
  itemRef.current = item;
  const dims = useBoxSize(ref);
  const [, setAnimTick] = useState(0);
  useEffect(() => {
    if (!vidAnim) return;
    let raf, last = null;
    const loop = () => {
      const t = vidAnim.timeRef.current;
      if (t !== last) {
        last = t;
        if (vidAnim.getTexts().some((c) => c.tid === itemRef.current.id)) setAnimTick((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [vidAnim]);
  const animState = vidAnim ? sampleTextAnim(vidAnim.getTexts(), item.id, vidAnim.timeRef.current) : undefined;
  const shown = truncateTextItem(item, dims);
  const fill = withTextFill(shown);
  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden flex p-6" style={textFlexAlign(item)}>
      {dims && animState !== null && (
        <div style={textBlockStyle(shown, dims, hexRgba(fill.hex, fill.opacity))}>
          <TextLines item={shown} anim={animState ?? undefined} />
        </div>
      )}
    </div>
  );
}

export function TextOverlay({ items, layer, vidAnim }) {
  return items
    .filter((t) => t.layer === layer && t.visible !== false && t.content)
    .map((t) => <TextOverlayOne key={t.id} item={t} vidAnim={vidAnim} />);
}

// Interactive text: drag to move (with alignment lines), handles to resize.
// Draws the text itself for front text. For behind text it only draws the selection box,
// since the text is drawn under the device (3D scene in Mockup mode, TextOverlay in Frame mode).
export function TextEditor({ item, selected, onSelect, onChange, onDuplicate, isOccluded, autoEdit, onEditStarted, onRemove, vidAnim }) {
  const wrapRef = useRef(null);
  const boxRef = useRef(null);
  const editRef = useRef(null);
  const editStartRef = useRef(0);
  const [editing, setEditing] = useState(false);
  const itemRef = useRef(item);
  itemRef.current = item;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDuplicateRef = useRef(onDuplicate);
  onDuplicateRef.current = onDuplicate;
  const isOccludedRef = useRef(isOccluded);
  isOccludedRef.current = isOccluded;
  const startMoveRef = useRef(null);
  const pinRef = useRef(null); // while resizing: a point on the box that must stay put
  const [guides, setGuides] = useState({ x: null, y: null });
  const dims = useBoxSize(wrapRef);

  // Video mode: re-render this layer when the playhead moves, but only if it has clips.
  const [, setAnimTick] = useState(0);
  useEffect(() => {
    if (!vidAnim) return;
    let raf, last = null;
    const loop = () => {
      const t = vidAnim.timeRef.current;
      if (t !== last) {
        last = t;
        if (vidAnim.getTexts().some((c) => c.tid === itemRef.current.id)) setAnimTick((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [vidAnim]);
  const animState = vidAnim && !editing ? sampleTextAnim(vidAnim.getTexts(), item.id, vidAnim.timeRef.current) : undefined;

  // Deselecting the layer ends inline editing.
  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

    useEffect(() => {
    if (!autoEdit) return;
    setEditing(true);
    onEditStarted?.();
  }, [autoEdit]);

  // Entering edit mode: load the raw text, focus, select all.
  useLayoutEffect(() => {
    if (!editing) return;
    const el = editRef.current;
    if (!el) return;
    el.textContent = itemRef.current.content ?? "";
    editStartRef.current = performance.now();
    const focusIt = () => {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range); // this line was missing: without it there's no caret and typing does nothing
    };
    focusIt();
    // retry once in case the Text popup mounting grabs focus
    const t = setTimeout(() => {
      if (document.activeElement !== el) focusIt();
    }, 50);
    return () => clearTimeout(t);
  }, [editing, !!dims]);

  const live = !!item && (!!item.content || editing);
  const front = live && item.layer === "front";
  // Behind text can't be hit-tested through the device, so it's only grabbable while selected.
  const interactive = live && (front || selected);

  // Resizing changes the box size, and the layout anchor (position preset) would shift it.
  // After each render, measure where the pinned point ended up and nudge the offset to correct it.
  useLayoutEffect(() => {
    const pin = pinRef.current;
    const el = boxRef.current;
    const wrap = wrapRef.current;
    if (!pin || !el || !wrap || !dims) return;
    const r = el.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    const errX = r.left - wr.left + pin.fx * r.width - pin.x;
    const errY = r.top - wr.top + pin.fy * r.height - pin.y;
    if (Math.abs(errX) < 0.5 && Math.abs(errY) < 0.5) return;
    const it = itemRef.current;
    onChangeRef.current({ dx: (it.dx ?? 0) - errX / dims.w, dy: (it.dy ?? 0) - errY / dims.h });
  });

  const startMove = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest?.("[data-text-handle]")) return; // handles have their own handler
    onSelect();
    const wr = wrapRef.current.getBoundingClientRect();
    const r = boxRef.current.getBoundingClientRect();
    const W = wr.width, H = wr.height;
    const left0 = r.left - wr.left, top0 = r.top - wr.top;
    const start = itemRef.current;
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    const dupMode = e.altKey; // Alt-drag leaves a copy behind
    let duplicated = false;

    const onMove = (ev) => {
      let dx = ev.clientX - x0;
      let dy = ev.clientY - y0;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      if (dupMode && !duplicated) {
        duplicated = true;
        onDuplicateRef.current?.(); // copy stays at the start position, this layer keeps moving
      }
      const sx = snapAxis(left0 + dx, r.width, W);
      const sy = snapAxis(top0 + dy, r.height, H);
      if (sx) dx += sx.d;
      if (sy) dy += sy.d;
      setGuides({ x: sx ? sx.line : null, y: sy ? sy.line : null });
      onChangeRef.current({ dx: (start.dx ?? 0) + dx / W, dy: (start.dy ?? 0) + dy / H });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setGuides({ x: null, y: null });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

    startMoveRef.current = startMove;

  // Behind text sits under the device, so its box ignores pointer events. This catches a click
  // that lands inside the box on an area the frame / device isn't covering, and starts the move.
  useEffect(() => {
    const onDown = (e) => {
      const it = itemRef.current;
      if (e.button !== 0 || !it || it.layer !== "behind" || !it.content) return;
      const box = boxRef.current;
      const wrap = wrapRef.current;
      if (!box || !wrap?.parentElement?.contains(e.target)) return;
      if (box.contains(e.target)) return; // selected: the box handles it itself
      if (e.target.closest?.("[data-text-box],[data-text-handle],[data-handle],[data-text-tool],button")) return;
      const r = box.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      if (isOccludedRef.current?.(e)) return;
      e.stopImmediatePropagation(); // keeps the canvas drag / marquee from also starting
      startMoveRef.current?.(e);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);

  const startResize = (key) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const wr = wrapRef.current.getBoundingClientRect();
    const r = boxRef.current.getBoundingClientRect();
    const W = wr.width;
    const L0 = r.left - wr.left, T0 = r.top - wr.top;
    const W0 = r.width, H0 = r.height;
    const R0 = L0 + W0, B0 = T0 + H0, CX = L0 + W0 / 2;
    const start = itemRef.current;

    // Scaling text: font size and box width change together so line breaks stay the same.
    const scale = (k, p) => {
      const size = Math.min(2000, Math.max(1, Math.round(start.size * Math.max(0.02, k))));
      return { patch: { size, boxW: (W0 * (size / start.size)) / W }, pin: p };
    };

    const onMove = (ev) => {
      const px = ev.clientX - wr.left;
      const py = ev.clientY - wr.top;

      // Fixed size: every handle only changes the box width / height. Font size stays the same.
      // Top / bottom handles always behave this way, even on auto height, so dragging them
      // changes the height only and never scales the text.
      if (start.boxH != null || key === "n" || key === "s") {
        const east = key.includes("e"), west = key.includes("w");
        const south = key.includes("s"), north = key.includes("n");
        const patch = {};
        if (east || west) patch.boxW = Math.max(24, east ? px - L0 : R0 - px) / W;
        if (north || south) patch.boxH = Math.max(12, south ? py - T0 : B0 - py) / wr.height;
        pinRef.current = {
          fx: east ? 0 : west ? 1 : 0.5,
          fy: south ? 0 : north ? 1 : 0.5,
          x: east ? L0 : west ? R0 : CX,
          y: south ? T0 : north ? B0 : T0 + H0 / 2,
        };
        onChangeRef.current(patch);
        return;
      }

      let out;
      if (key.length === 2) {
        // Corners scale the text; the opposite corner stays fixed (width drives, like frames).
        const east = key.includes("e"), south = key.includes("s");
        const newW = east ? px - L0 : R0 - px;
        out = scale(newW / W0, { fx: east ? 0 : 1, fy: south ? 0 : 1, x: east ? L0 : R0, y: south ? T0 : B0 });
      } else if (key === "e" || key === "w") {
        // Sides change the wrap width only.
        const newW = key === "e" ? px - L0 : R0 - px;
        out = {
          patch: { boxW: Math.max(24, newW) / W },
          pin: { fx: key === "e" ? 0 : 1, fy: 0, x: key === "e" ? L0 : R0, y: T0 },
        };
      } else {
        // Top / bottom scale the text around the horizontal center.
        const newH = key === "s" ? py - T0 : B0 - py;
        out = scale(newH / H0, { fx: 0.5, fy: key === "s" ? 0 : 1, x: CX, y: key === "s" ? T0 : B0 });
      }
      pinRef.current = out.pin;
      onChangeRef.current(out.patch);
    };
    const onUp = () => {
      pinRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const shown = editing ? item : truncateTextItem(item, dims);
  const fill = withTextFill(item);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 pointer-events-none flex p-6"
      style={{ ...textFlexAlign(item), zIndex: 10 + Math.min(9, item.zIndex ?? 1) }}
    >
      {live && dims && (
        <div
          ref={boxRef}
          data-text-box={item.id}
          onPointerDown={interactive && !editing ? startMove : undefined}
          onDoubleClick={
            interactive
              ? () => {
                  onSelect();
                  setEditing(true);
                }
              : undefined
          }
          className={`relative touch-none ${editing ? "" : "select-none"}`}
          style={{
            ...textBlockStyle(editing ? item : shown, dims, front || editing ? hexRgba(fill.hex, fill.opacity) : "transparent"),
            pointerEvents: interactive && animState !== null ? "auto" : "none",
            visibility: animState === null ? "hidden" : undefined, // outside its clip
            cursor: editing ? "text" : interactive ? "move" : undefined,
            outline: selected ? "1px solid #FF47BC" : undefined,
          }}
        >
          {editing ? (
            <div
              ref={editRef}
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              spellCheck={false}
              onInput={(e) => onChangeRef.current({ content: readEditable(e.currentTarget) })}
              onBlur={() => {
                // a blur right after editing starts is focus being stolen, not the user clicking away
                if (performance.now() - editStartRef.current < 150) {
                  setTimeout(() => editRef.current?.focus(), 0);
                  return;
                }
                setEditing(false);
                if (!String(itemRef.current.content ?? "").trim()) onRemove?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation(); // end editing without also closing the Text popup
                  e.currentTarget.blur();
                }
              }}
              style={{ fontSize: "inherit", outline: "none", minHeight: "1em", minWidth: "1ch" }}
            />
          ) : (
            <TextLines item={shown} anim={animState ?? undefined} />
          )}
          {selected && !editing &&
            RESIZE_HANDLES.map(([key, x, y, cursor]) => (
              <div
                key={key}
                data-text-handle
                onPointerDown={startResize(key)}
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-white border border-[#FF47BC]"
                style={{ left: `${x}%`, top: `${y}%`, cursor, pointerEvents: "auto" }}
              />
            ))}
        </div>
      )}

      {/* Alignment lines, shown while a drag is snapped to the canvas center or margins */}
      {guides.x !== null && (
        <div className="absolute top-0 bottom-0 w-px bg-[#FF47BC] pointer-events-none" style={{ left: guides.x }} />
      )}
      {guides.y !== null && (
        <div className="absolute left-0 right-0 h-px bg-[#FF47BC] pointer-events-none" style={{ top: guides.y }} />
      )}
    </div>
  );
}