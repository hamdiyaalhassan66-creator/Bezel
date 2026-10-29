import { useState, useLayoutEffect } from "react";
import { TextAlignLeft, TextAlignCenter, TextAlignRight, TextAlignJustify, TextUnderline, TextStrikethrough } from "@phosphor-icons/react";
import { hexRgba } from "./frameUtils.js";
import { txtCase } from "./textAnim.js";

// ---------- Text popup (sample) ----------
export const TEXT_FONTS = ["Inter", "Helvetica Neue", "Georgia", "Times New Roman", "Courier New"].map((v) => ({ value: v, label: v }));
export const TEXT_WEIGHTS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra bold" },
];
export const TEXT_CASES = [
  { value: "none", label: "As typed" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "capitalize", label: "Capitalize" },
];
export const TEXT_ALIGNS = [
  { value: "left", Icon: TextAlignLeft },
  { value: "center", Icon: TextAlignCenter },
  { value: "right", Icon: TextAlignRight },
  { value: "justify", Icon: TextAlignJustify },
];
export const DEFAULT_TEXT = {
  name: "Your text", content: "Your text", font: "Inter", fontMeta: null, weight: "700", size: 32, lineHeight: 120, letterSpacing: 0,
  hex: "000000", opacity: 100, align: "left", textCase: "none", position: "mc", layer: "front", zIndex: 1, customFonts: [], dx: 0, dy: 0, boxW: null, boxH: null,
  fillHex: null, fillOpacity: 100, decoration: null,
  decoStyle: "solid", decoThickness: 0, decoOffset: 0, decoHex: null, decoOpacity: 100, decoSkipInk: true, // thickness / offset: 0 = auto
  decoStash: {}, // per-style color memory: { underline: { hex, opacity }, "line-through": { hex, opacity } }
  textWrap: "auto", paragraphSpacing: 0, truncate: false, truncateLines: 3,
};

export const textLabel = (t) => (String(t.content ?? "").split("\n").find((l) => l.trim()) || "Text").trim();
export const textName = (t) => (t.name ?? "").trim() || textLabel(t);
export const readEditable = (el) => el.innerText.replace(/\n$/, "");

// Switching decoration type saves the current color under the old type and loads the new type's own
// color (null hex = "Auto"). Returns one patch for set().
export function decoSwitchPatch(value, next) {
  const cur = value.decoration;
  if (!cur || cur === next) return { decoration: next };
  const stash = {
    ...(value.decoStash ?? {}),
    [cur]: { hex: value.decoHex ?? null, opacity: value.decoOpacity ?? 100 },
  };
  const loaded = stash[next] ?? { hex: null, opacity: 100 };
  return { decoration: next, decoStash: stash, decoHex: loaded.hex, decoOpacity: loaded.opacity };
}

export const TEXT_DECORATIONS = [
  { value: "underline", Icon: TextUnderline },
  { value: "line-through", Icon: TextStrikethrough },
];
export const TEXT_WRAPS = [
  { value: "auto", label: "Auto" },
  { value: "nowrap", label: "No wrap" },
  { value: "balance", label: "Balance" },
];

// Fill overrides Color when set. Used for the DOM text, the 3D scene and export.
export const withTextFill = (item) =>
  item && item.fillHex ? { ...item, hex: item.fillHex, opacity: item.fillOpacity ?? 100 } : item;

// Cuts the content to `truncateLines` visual lines and ends the last one with an ellipsis.
// Done on the data (not CSS) so the DOM, the 3D scene and the export all see the same text.
// dims = the canvas box in on-screen px (same units as item.size and boxW).
let truncCtx;
export function truncateTextItem(item, dims) {
  if (!item || !item.truncate || !dims || !item.content) return item;
  truncCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = truncCtx;
  const maxLines = Math.max(1, item.truncateLines ?? 3);
  const wrapW = item.boxW ? item.boxW * dims.w : dims.w - (item.pad ?? TEXT_PAD) * 2;
  const cased = (s) => {
    if (item.textCase === "uppercase") return s.toUpperCase();
    if (item.textCase === "lowercase") return s.toLowerCase();
    if (item.textCase === "capitalize") return s.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());
    return s;
  };
  ctx.font = `${item.weight} ${item.size}px "${item.font}", sans-serif`;
  ctx.letterSpacing = `${(item.letterSpacing / 100) * item.size}px`;
  const width = (s) => ctx.measureText(cased(s)).width;
  const clip = (line) => {
    let s = line;
    while (s.length > 1 && width(`${s}…`) > wrapW) s = s.slice(0, -1).trimEnd();
    return `${s}…`;
  };

  // Visual lines: wrapped by measured width (or one per paragraph with No wrap).
  const lines = [];
  String(item.content).split("\n").forEach((para) => {
    if (item.textWrap === "nowrap") {
      lines.push(para);
      return;
    }
    let cur = "";
    para.split(/\s+/).filter(Boolean).forEach((word) => {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && width(next) > wrapW) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    });
    lines.push(cur);
  });

  // Cut at the max lines, end the last line with "…", and clip any line still wider than the box.
  const cut = lines.length > maxLines;
  const out = lines
    .slice(0, maxLines)
    .map((ln, i) => (width(ln) > wrapW || (cut && i === maxLines - 1) ? clip(ln) : ln));

  if (!cut && out.every((ln, i) => ln === lines[i])) return item; // nothing to truncate

  // Fixed lines: nowrap so the browser, 3D scene and export can't re-wrap them differently.
  return { ...item, content: out.join("\n"), textWrap: "nowrap", paragraphSpacing: 0 };
}

// What every renderer should draw: truncated, with Fill applied.
export const prepText = (item, dims) => withTextFill(truncateTextItem(scaleTextItem(item, dims), dims));

// Kerning between two letters, in px. Separate inline-blocks can't kern, so this is added back as a margin.
let kernCtx;
export function kernAdjust(item, a, b) {
  if (!a || !b) return 0;
  kernCtx ??= document.createElement("canvas").getContext("2d");
  kernCtx.font = `${item.weight} ${item.size}px "${item.font}", sans-serif`;
  kernCtx.letterSpacing = "0px";
  const A = txtCase(a, item.textCase), B = txtCase(b, item.textCase);
  return kernCtx.measureText(A + B).width - kernCtx.measureText(A).width - kernCtx.measureText(B).width;
}

// ---------- Text on canvas: layout helpers ----------
export const TEXT_PAD = 24; // padding at the reference size. Scaled by textUnit() everywhere it's used
export const TEXT_REF = 720; // stored sizes mean "px when the canvas's short side is this many px"
const TEXT_SNAP = 6; // px

// Same unit frames use: the canvas's short side.
export const textUnit = (dims) => (dims && dims.w > 0 && dims.h > 0 ? Math.min(dims.w, dims.h) / TEXT_REF : 1);
export const textPad = (dims) => TEXT_PAD * textUnit(dims);

// Stored values -> on-screen px for this canvas. Every renderer draws the result.
export function scaleTextItem(item, dims) {
  if (!item || !dims) return item;
  const k = textUnit(dims);
  return {
    ...item,
    size: item.size * k,
    paragraphSpacing: (item.paragraphSpacing ?? 0) * k,
    decoThickness: (item.decoThickness ?? 0) * k, // 0 = auto stays 0
    decoOffset: (item.decoOffset ?? 0) * k,
    pad: TEXT_PAD * k, // consumed by truncateTextItem, the DOM wrapper and paintTextItem
  };
}

export function useBoxSize(ref) {
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setSize((p) => (p && p.w === el.clientWidth && p.h === el.clientHeight ? p : { w: el.clientWidth, h: el.clientHeight }));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export const textFlexAlign = (item) => {
  const [v, h] = item.position.split("");
  return {
    alignItems: { t: "flex-start", m: "center", b: "flex-end" }[v],
    justifyContent: { l: "flex-start", c: "center", r: "flex-end" }[h],
  };
};

export const textBlockStyle = (item, dims, color) => ({
  fontFamily: `"${item.font}", sans-serif`,
  fontWeight: item.weight,
  fontSize: item.size,
  lineHeight: `${item.lineHeight}%`,
  letterSpacing: `${item.letterSpacing / 100}em`,
  textTransform: item.textCase,
  textAlign: item.align,
  color,
  whiteSpace: item.textWrap === "nowrap" ? "pre" : "pre-wrap",
  textWrap: item.textWrap === "balance" ? "balance" : undefined,
  textDecoration: item.decoration ?? "none",
  textDecorationStyle: item.decoration === "underline" ? item.decoStyle ?? "solid" : "solid",
  textDecorationThickness: item.decoThickness ? `${item.decoThickness}px` : "auto",
  textUnderlineOffset: item.decoration === "underline" && item.decoOffset ? `${item.decoOffset}px` : "auto",
  textDecorationSkipInk: item.decoration === "underline" && item.decoSkipInk === false ? "none" : "auto",
  // behind-layer text is drawn by the 3D scene, so the editor overlay must stay invisible
  textDecorationColor: item.decoHex && color !== "transparent" ? hexRgba(item.decoHex, item.decoOpacity ?? 100) : undefined,
  width: item.boxW ? item.boxW * dims.w : undefined,
  height: item.boxH ? item.boxH * dims.h : undefined,
  maxWidth: item.boxW ? "none" : "100%",
  flexShrink: item.boxW || item.boxH ? 0 : undefined,
  transform: `translate(${(item.dx ?? 0) * dims.w}px, ${(item.dy ?? 0) * dims.h}px)`,
});

// Closest snap of a box (start pos + size) to the canvas margins / center on one axis.
export function snapAxis(pos, size, limit, pad = TEXT_PAD) {
  let best = null;
  [
    [pad - pos, pad],
    [limit / 2 - (pos + size / 2), limit / 2],
    [limit - pad - (pos + size), limit - pad],
  ].forEach(([d, line]) => {
    if (Math.abs(d) < TEXT_SNAP && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, line };
  });
  return best;
}