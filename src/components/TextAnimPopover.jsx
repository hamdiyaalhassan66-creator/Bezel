import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { CaretLeft, X } from "@phosphor-icons/react";
import { hexRgba } from "../lib/frameUtils.js";
import { vidClamp } from "../lib/videoMath.js";
import {
  mixHex, TXT_REST, txtFrom, txtCase, TXT_SPLITS, TXT_ORDERS, TXT_EASE_OPTIONS, TXT_CUSTOM_DEFAULT,
  TXT_PRESET_GROUPS, TXT_PRESETS, TXT_PRESET_BY_ID, txtUnitStates,
} from "../lib/textAnim.js";
import { DEFAULT_TEXT, withTextFill } from "../lib/textUtils.js";
import { Scrubber, ToggleRow, PopupDropdown, SEG_ON, SEG_OFF } from "./controls.jsx";
import { CustomAnimEditor } from "./CustomAnimEditor.jsx";

// Canvas twin of TextLines, used by the popover previews. Draws the real text (font, weight, case, color).
// dims = the real canvas box in px. The text is drawn at its real size, scaled by how far the canvas is shrunk into this preview.
function drawTextAnimPreview(canvas, spec, kind, p, item, dims) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
  const it = withTextFill(item ?? DEFAULT_TEXT);
  const n = parseInt(it.hex || "000000", 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = lum > 0.6 ? "#171717" : "#FAF9FA"; // pick a background the text color can be read on
  ctx.fillRect(0, 0, W, H);

  const lines = txtCase(String(it.content || "Your headline"), it.textCase).split("\n").filter((l) => l.trim()).slice(0, 3);
  if (!lines.length) lines.push("Your headline");
  const family = `"${it.font}", sans-serif`;
  const setFont = (sz) => (ctx.font = `${it.weight} ${sz}px ${family}`);
  let size = Math.max(H * 0.26, dims?.w ? it.size * (W / dims.w) : H * 0.3);
  setFont(size);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest > W * 0.9) size *= (W * 0.9) / widest; // only shrinks when it wouldn't fit
  if (lines.length > 1) size = Math.min(size, (H * 0.8) / (lines.length * 1.25));
  setFont(size);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const lh = size * 1.25, y0 = H / 2 - ((lines.length - 1) * lh) / 2;

  const split = spec?.split ?? "block";
  let idx = 0;
  const units = [];
  lines.forEach((ln, li) => {
    if (split === "block") units.push({ li, a: 0, b: ln.length, idx: 0 });
    else if (split === "line") units.push({ li, a: 0, b: ln.length, idx: idx++ });
    else {
      const re = split === "word" ? /\S+/g : /\S/g;
      let m;
      while ((m = re.exec(ln))) units.push({ li, a: m.index, b: m.index + m[0].length, idx: idx++ });
    }
  });
  const count = split === "block" ? 1 : Math.max(1, idx);
  const pp = kind === "exit" ? 1 - p : p;
  const states = spec ? txtUnitStates(spec, pp, count) : null;

  ctx.fillStyle = hexRgba(it.hex, it.opacity ?? 100);
  units.forEach((u) => {
    const ln = lines[u.li];
    const x0 = (W - ctx.measureText(ln).width) / 2;
    const pre = ctx.measureText(ln.slice(0, u.a)).width;
    const w = ctx.measureText(ln.slice(u.a, u.b)).width;
    const st = states ? states[u.idx] : TXT_REST;
    const cx = x0 + pre + w / 2, cy = y0 + u.li * lh;
    ctx.save();
    if (spec?.mask) {
      ctx.beginPath();
      ctx.rect(cx - w / 2 - 2, cy - lh / 2, w + 4, lh);
      ctx.clip();
    }
    ctx.globalAlpha = vidClamp(st.a, 0, 1);
    if (st.b > 0.05) ctx.filter = `blur(${(st.b / 100) * size}px)`;
    ctx.fillStyle = hexRgba(st.c ? mixHex(st.c, it.hex, st.ce) : it.hex, it.opacity ?? 100);
    if (st.sh > 0.5) {
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = (st.sh / 100) * size * 0.5;
      ctx.shadowOffsetY = (st.sh / 100) * size * 0.25;
    }
    if (st.ls) ctx.letterSpacing = `${(((it.letterSpacing ?? 0) + st.ls) / 100) * size}px`;
    ctx.translate(cx + (st.x / 100) * size, cy + (st.y / 100) * size);
    ctx.rotate((st.r * Math.PI) / 180);
    ctx.scale(st.s, st.s);
    ctx.fillText(ln.slice(u.a, u.b), -w / 2, 0);
    ctx.restore();
  });
}

function TextAnimTile({ preset, kind, active, onClick, onEdit, item, dims }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  const spec = preset ? preset.spec : null;
  useEffect(() => {
    if (!hover) {
      drawTextAnimPreview(ref.current, spec, kind, 0.6, item, dims);
      return;
    }
    let raf;
    const t0 = performance.now();
    const T = 1200, CYCLE = T + 600;
    const loop = (now) => {
      drawTextAnimPreview(ref.current, spec, kind, Math.min(1, ((now - t0) % CYCLE) / T), item, dims);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hover, spec, kind, item, dims?.w]);

  return (
    <div className="group relative flex flex-col min-w-0">
      <button type="button" onClick={onClick} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} className="flex flex-col items-stretch gap-1.5 min-w-0">
        <div
          className={`relative w-full aspect-[3/2] rounded-lg overflow-hidden border transition-colors duration-150 ${
            active ? "border-[#FF47BC]" : "border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 group-hover:border-[#3A3A3A]/20 dark:group-hover:border-white/20"
          }`}
        >
          <canvas ref={ref} width={240} height={160} className="absolute inset-0 w-full h-full" />
        </div>
        <span className={`truncate text-center leading-4 transition-colors ${active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"}`}>
          {preset ? preset.label : "None"}
        </span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`absolute top-1 right-1 h-5 px-1.5 rounded-md bg-[#FAF9FA]/85 dark:bg-[#171717]/85 backdrop-blur-sm leading-4 text-[#3A3A3A] dark:text-[#FAF9FA] hover:bg-[#FAF9FA] dark:hover:bg-[#171717] transition-[opacity,background-color,transform] duration-150 active:scale-[0.94] focus-visible:opacity-100 group-hover:opacity-100 ${
            active ? "opacity-100" : "opacity-0"
          }`}
        >
          Edit
        </button>
      )}
    </div>
  );
}

function TextAnimLive({ spec, kind, item, dims }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const T = 1400, HOLD = 500, CYCLE = T + HOLD * 2;
    const loop = (now) => {
      const u = vidClamp((((now - t0) % CYCLE) - HOLD) / T, 0, 1);
      drawTextAnimPreview(ref.current, spec, kind, u, item, dims);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spec, kind, item, dims?.w]);
  return (
    <div className="rounded-[10px] overflow-hidden border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
      <canvas ref={ref} width={536} height={240} className="w-full block" />
    </div>
  );
}

export function TextAnimPopover({ v, menu, onClose, onSwitch }) {
  const clip = v.texts.find((c) => c.id === menu.cid);
  const item = clip ? v.getText(clip.tid) : null;
  const dims = v.canvasDims;
  const [pos, setPos] = useState(null);
  const [tab, setTab] = useState(() => (clip?.[menu.kind]?.id === "custom" ? "custom" : "presets"));
  const [editing, setEditing] = useState(false); // sub-view: adjust the current preset
  const scrollRef = useRef(null);

  // jump back to the top whenever the sub-view opens or closes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [editing]);

  // switching between enter and exit leaves the sub-view
  useEffect(() => setEditing(false), [menu.kind]);

  useLayoutEffect(() => {
    const update = () => {
      const t = v.toolbarRef?.current?.getBoundingClientRect();
      setPos({ right: t ? window.innerWidth - t.left + 4 : 8, bottom: t ? window.innerHeight - t.bottom : 8 });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!clip) return null;
  const kind = menu.kind;
  const isIn = kind === "enter";
  const cur = clip[kind] && clip[kind].id !== "none" ? clip[kind] : null;
  const timing = { dur: cur?.dur ?? 600, delay: cur?.delay ?? 0 };
  const send = (anim) => v.onTextAnim(clip.id, kind, anim);
  const setTiming = (patch) => cur && send({ ...cur, ...patch });
  const pick = (pr) => send({ ...pr.spec, from: { ...pr.spec.from }, id: pr.id, ...timing });
  const base = cur ?? TXT_CUSTOM_DEFAULT;
  // inside the sub-view a preset keeps its id (so it can be reset); the Custom tab always becomes "custom"
  const edit = (patch) => send({ ...base, ...patch, id: editing && cur ? cur.id : "custom", ...timing });
  const editFrom = (patch) => edit({ from: { ...txtFrom(base.from), ...patch } });
  const from = txtFrom(base.from);

  const basePreset = cur ? TXT_PRESET_BY_ID[cur.id] : null;
  const norm = (s) => JSON.stringify({ split: s.split, order: s.order ?? "start", stagger: s.stagger ?? 0, from: txtFrom(s.from), mask: !!s.mask, ease: s.ease ?? "smooth" });
  const dirty = !!basePreset && norm(cur) !== norm(basePreset.spec);
  const label = cur ? (cur.id === "custom" ? "Custom" : basePreset?.label ?? "Custom") : "None";

  const seg = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on) => `seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${on ? SEG_ON : SEG_OFF}`;
  const sub = "text-[12px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]";

  // the same controls are used by the Custom tab and by the preset sub-view
  const controls = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className={sub}>Split by</label>
        <div className={seg}>
          {TXT_SPLITS.map((o) => (
            <button key={o.value} type="button" onClick={() => edit({ split: o.value })} className={segBtn(base.split === o.value)}>{o.label}</button>
          ))}
        </div>
      </div>

      <div className={`flex flex-col gap-2 transition-opacity duration-200 ${base.split === "block" ? "opacity-40 pointer-events-none" : ""}`}>
        <label className={sub}>Order</label>
        <PopupDropdown value={base.order ?? "start"} options={TXT_ORDERS} onChange={(order) => edit({ order })} />
        <Scrubber compact label="Stagger (%)" value={base.stagger ?? 0} min={0} max={95} onChange={(stagger) => edit({ stagger })} />
      </div>

      <label className={sub}>From</label>
      <div className="flex flex-col gap-2">
        <Scrubber compact label="Opacity" value={Math.round(from.a * 100)} min={0} max={100} onChange={(v2) => editFrom({ a: v2 / 100 })} />
        <Scrubber compact label="X offset" value={Math.round(from.x)} min={-300} max={300} onChange={(x) => editFrom({ x })} />
        <Scrubber compact label="Y offset" value={Math.round(from.y)} min={-300} max={300} onChange={(y) => editFrom({ y })} />
        <Scrubber compact label="Scale (%)" value={Math.round(from.s * 100)} min={0} max={300} onChange={(v2) => editFrom({ s: v2 / 100 })} />
        <Scrubber compact label="Rotation" value={Math.round(from.r)} min={-360} max={360} onChange={(r) => editFrom({ r })} />
        <Scrubber compact label="Blur" value={Math.round(from.b)} min={0} max={50} onChange={(b) => editFrom({ b })} />
      </div>

      <ToggleRow muted label="Mask reveal" checked={!!base.mask} onChange={(mask) => edit({ mask })} />

      <div className="flex flex-col gap-2">
        <label className={sub}>Easing</label>
        <PopupDropdown value={base.ease ?? "smooth"} options={TXT_EASE_OPTIONS} onChange={(ease) => edit({ ease })} />
      </div>
    </div>
  );

    // Custom tab: split / order / mask on top, then the property list
  const customTab = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className={sub}>Split by</label>
          <div className={seg}>
            {TXT_SPLITS.map((o) => (
              <button key={o.value} type="button" onClick={() => edit({ split: o.value })} className={segBtn(base.split === o.value)}>{o.label}</button>
            ))}
          </div>
        </div>
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${base.split === "block" ? "opacity-40 pointer-events-none" : ""}`}>
          <label className={sub}>Order</label>
          <PopupDropdown value={base.order ?? "start"} options={TXT_ORDERS} onChange={(order) => edit({ order })} />
          <Scrubber compact label="Stagger (%)" value={base.stagger ?? 0} min={0} max={95} onChange={(stagger) => edit({ stagger })} />
        </div>
        <ToggleRow muted label="Mask reveal" checked={!!base.mask} onChange={(mask) => edit({ mask })} />
      </div>
      <CustomAnimEditor
        target="text"
        spec={cur}
        onChange={(next) => send({ ...TXT_CUSTOM_DEFAULT, ...next, id: "custom", ...timing })}
      />
    </div>
  );

  return (
    <div
      data-vid-textanim-menu
      style={{ position: "fixed", right: pos?.right ?? 0, bottom: pos?.bottom ?? 0, visibility: pos ? "visible" : "hidden", maxHeight: "min(82vh, 820px)" }}
      className="panel-enter w-[300px] flex flex-col overflow-hidden bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
    >
      <div className={`flex items-center h-12 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 ${editing ? "pl-2 gap-1" : "pl-4"}`}>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setTab("presets");
              setEditing(false);
            }}
            aria-label="Back"
            className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <CaretLeft size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
        )}
        <span className="flex-1 min-w-0 truncate text-left">
          <span className="section-title text-[#8C8C8C] dark:text-[#9A9A9A]">Text {isIn ? "enter" : "exit"} / </span>
          <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{label}</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="group flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-4 py-3 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <div className={seg}>
          {[["enter", "Enter"], ["exit", "Exit"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => onSwitch(k)} className={segBtn(kind === k)}>{l}</button>
          ))}
        </div>
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${cur ? "" : "opacity-40 pointer-events-none"}`}>
          <Scrubber compact label="Duration (ms)" value={timing.dur} min={100} max={2000} hardMax={10000} onChange={(dur) => setTiming({ dur })} />
          <Scrubber compact label="Delay (ms)" value={timing.delay} min={0} max={2000} hardMax={10000} onChange={(delay) => setTiming({ delay })} />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#E3E3E3_transparent] dark:[scrollbar-color:#333333_transparent]">
        <div className="flex flex-col gap-4 px-4 py-4">
          <TextAnimLive spec={cur} kind={kind} item={item} dims={dims} />

          {editing ? (
            // sub-view: adjust the controls of the selected preset
            <div className="fx-enter flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className={sub}>Adjust</span>
                {dirty && (
                  <button type="button" onClick={() => pick(basePreset)} className="text-[#FF47BC] hover:underline">
                    Reset
                  </button>
                )}
              </div>
              {controls}
            </div>
          ) : (
            <>
              <div className={seg}>
                <button type="button" onClick={() => setTab("presets")} className={segBtn(tab === "presets")}>Presets</button>
                <button type="button" onClick={() => setTab("custom")} className={segBtn(tab === "custom")}>Custom</button>
              </div>

              {tab === "presets" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <TextAnimTile preset={null} kind={kind} item={item} dims={dims} active={!cur} onClick={() => send(null)} />
                  </div>
                  {TXT_PRESET_GROUPS.map((g) => (
                    <div key={g} className="flex flex-col gap-2">
                      <span className="section-title text-[#3A3A3A] dark:text-[#FAF9FA]">{g}</span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                        {TXT_PRESETS.filter((x) => x.group === g).map((pr) => (
                          <TextAnimTile
                            key={pr.id}
                            preset={pr}
                            kind={kind}
                            item={item}
                            dims={dims}
                            active={cur?.id === pr.id}
                            onClick={() => pick(pr)}
                            onEdit={() => {
                              if (cur?.id !== pr.id) pick(pr); // select it first, then open its controls
                              setEditing(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                customTab
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}