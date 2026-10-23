import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { KeyCap } from "./ShortcutsModal.jsx";

const PAD = 4; // breathing room around the highlighted element
const GAP = 12; // space between spotlight and card
const MARGIN = 12; // min distance from the viewport edge
const CARD_W = 280;

const VIDEO_STEPS = [
  {
    target: "timeline-actions",
    placement: "top",
    title: "Build your shots",
    body: "Add a shot, drop keyframes on the camera moves you make, add backgrounds, and loop playback.",
    keys: [["S"], ["K"], ["⇧", "L"]],
  },
  {
    target: "timeline-playback",
    placement: "top",
    title: "Play it back",
    body: "Play, pause, or jump between shots and keyframes. Select a shot to loop just that part.",
    keys: [["Space"]],
  },
  {
    target: "timeline-names",
    placement: "top",
    title: "Shots, backgrounds and text",
    body: "Each shot, background and text layer gets its own row. Double-click to rename, drag to reorder, expand a shot for per-property tracks.",
  },
  {
    target: "timeline-tracks",
    placement: "top-center",
    title: "Drag clips and keyframes",
    body: "Drag a clip to move it, pull its edges to trim, and drag diamonds to retime. Right-click for enter / exit animations and easing.",
  },
  {
    target: "timeline-ruler",
    placement: "top-center",
    title: "Scrub the playhead",
    body: "Click or drag the ruler to scrub. Hold Ctrl / Cmd and scroll to zoom the timeline.",
  },
  {
    target: "timeline-duration",
    placement: "top",
    title: "Length, audio and collapse",
    body: "Set the total duration, add an audio track, or collapse the timeline to get more canvas.",
  },
  {
    target: "export",
    placement: "bottom",
    title: "Export your video",
    body: "Pick MP4, WebM or another format, then choose resolution, speed and frame rate.",
    keys: [["mod", "E"]],
  },
];

const APP_STEPS = [
  {
    target: "left-toolbar",
    placement: "right",
    title: "Devices, projects and templates",
    body: "Pick a device, reopen saved projects, or start from a ready-made template.",
  },
  {
    target: "right-toolbar",
    placement: "left",
    title: "Fine-tune everything",
    body: "Upload your screenshot, then adjust the device finish, camera and scene from here.",
  },
  {
    target: "canvas",
    placement: "center",
    title: "Your canvas",
    body: "Drag to rotate, scroll to zoom, or drop an image anywhere to upload it.",
  },
  {
    target: "mode-tabs",
    placement: "left",
    title: "Mockup or Frame",
    body: "Mockup is a 3D device. Frame is a flat screenshot with corner radius, stroke and effects.",
    keys: [["M"], ["F"]],
  },
  {
    target: "canvas-size",
    placement: "top",
    title: "Set the canvas size",
    body: "Choose Fill or a ratio like 9:16 or 1:1 to match where the image will be used.",
  },
  {
    target: "export",
    placement: "bottom",
    title: "Export when you're done",
    body: "Download at Standard, 4K or 8K.",
    keys: [["mod", "E"]],
  },
];

const clamp = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max));

function place(r, placement, cw, ch) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = r.left + r.width;
  const bottom = r.top + r.height;
  let x, y;
  switch (placement) {
    case "right":
      x = right + GAP;
      y = r.top + (r.height - ch) / 2;
      break;
    case "left":
      x = r.left - cw - GAP;
      y = r.top + (r.height - ch) / 2;
      break;
    case "top": // aligned to the target's right edge, sits above it
      x = right - cw;
      y = r.top - ch - GAP;
      break;
    case "bottom":
      x = right - cw;
      y = bottom + GAP;
      break;
    case "top-center":
      x = r.left + (r.width - cw) / 2;
      y = r.top - ch - GAP;
      break;
    default: // center
      x = r.left + (r.width - cw) / 2;
      y = r.top + (r.height - ch) / 2;
  }
  return { x: clamp(x, MARGIN, vw - cw - MARGIN), y: clamp(y, MARGIN, vh - ch - MARGIN) };
}

export default function AppTour({ onClose, kind = "app" }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [size, setSize] = useState({ w: CARD_W, h: 180 });
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  // Only keep steps whose target is actually on screen (e.g. timeline collapsed / hidden)
  const steps = useMemo(
    () => (kind === "video" ? VIDEO_STEPS : APP_STEPS).filter((s) => document.querySelector(`[data-tour="${s.target}"]`)),
    [kind]
  );
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    if (!steps.length) onClose();
  }, []);

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step?.target]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Measure the card before paint so it never flashes in the wrong spot.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
  }, [index, rect]);

  // Focus "Next" so Enter/Space advance, and hand focus back on exit.
  useEffect(() => {
    nextRef.current?.focus();
  }, [index, rect !== null]);

  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (last) onClose();
        else setIndex((i) => i + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  if (!rect || !step) return null;
  const pos = place(rect, step.placement, size.w, size.h);

  return (
    <div className="fixed inset-0 z-[10001]" role="dialog" aria-modal="true" aria-label="App tour">
      {/* Cutout: the giant shadow dims everything except the target. The root layer also swallows clicks. */}
      <div
        key={`spot-${index}`}
        className="fade-enter absolute rounded-xl pointer-events-none"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          boxShadow: "0 0 0 2px #FF47BC, 0 0 0 9999px rgba(0,0,0,0.5)",
        }}
      />

      <div
        key={`card-${index}`}
        ref={cardRef}
        className="pop-enter absolute flex flex-col gap-3 p-4 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
        style={{ left: pos.x, top: pos.y, width: CARD_W }}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[14px] leading-5 font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
            {step.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Skip tour"
            className="group -mt-1 -mr-1 flex items-center justify-center w-7 h-7 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
          >
            <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
          </button>
        </div>

        <p className="text-[13px] leading-[18px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">
          {step.body}
        </p>

        {step.keys && (
          <div className="flex items-center gap-2">
            {step.keys.map((combo, i) => (
              <span key={i} className="flex items-center gap-1">
                {combo.map((k) => (
                  <KeyCap key={k}>{k}</KeyCap>
                ))}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5" aria-label={`Step ${index + 1} of ${steps.length}`}>
            {steps.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-150 ${
                  i === index ? "bg-[#FF47BC]" : "bg-[#3A3A3A]/15 dark:bg-[#FAF9FA]/15"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="h-8 px-3 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FCFCFC]/10 bg-white dark:bg-[#292929] shadow-[0px_4px_4px_rgba(0,0,0,0.02)] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#3A3A3A] dark:text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]"
              >
                Back
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
              className="h-8 px-3 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] hover:bg-[#F230AE] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] transition-[background-color,transform] duration-150 active:scale-[0.97]"
              style={{ boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" }}
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}