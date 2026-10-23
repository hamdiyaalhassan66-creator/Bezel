import React, { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import Tooltip from "./Tooltip.jsx";
import ToolbarDropdown from "./Dropdown.jsx";
import { SizeLockRow } from "./SizeFields.jsx";

const CROP_PRESET_OPTIONS = [
  { value: "Original", label: "Original" },
  { value: "Freeform", label: "Freeform" },
  { value: "3:4", label: "3:4" },
  { value: "3:2", label: "3:2" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "2:3", label: "2:3" },
  { value: "16:9", label: "16:9" },
];

const MODAL_MAX_HEIGHT = 800;
const MODAL_CHROME_HEIGHT = 176;
const MODAL_CHROME_WIDTH = 32;
const MIN_IMAGE_WIDTH = 340;
const MAX_IMAGE_WIDTH = 900;

// Smallest a crop box can shrink to, in the image's own natural pixels.
const MIN_CROP_SIZE = 20;

// "Original" locks to the image's own aspect ratio; "Freeform" has no lock.
function getPresetRatio(preset, imageWidth, imageHeight) {
  if (preset === "Freeform") return null;
  if (preset === "Original") return imageWidth / imageHeight;
  const [a, b] = preset.split(":").map(Number);
  return a / b;
}

// Largest rect at the given ratio that fits inside the image, centered —
// used whenever a locked preset is (re)selected.
function fitCenteredRect(ratio, imageWidth, imageHeight) {
  let w, h;
  if (imageWidth / imageHeight > ratio) {
    h = imageHeight;
    w = h * ratio;
  } else {
    w = imageWidth;
    h = w / ratio;
  }
  return { x: (imageWidth - w) / 2, y: (imageHeight - h) / 2, w, h };
}

function clampRect(rect, imageWidth, imageHeight) {
  let { x, y, w, h } = rect;
  w = Math.min(w, imageWidth);
  h = Math.min(h, imageHeight);
  x = Math.min(Math.max(x, 0), imageWidth - w);
  y = Math.min(Math.max(y, 0), imageHeight - h);
  return { x, y, w, h };
}

export default function CropModal({ imageUrl, imageWidth, imageHeight, onClose, onApply }) {
  const [preset, setPreset] = useState("Original");
  const [customRatio, setCustomRatio] = useState(null); // set when re-locking from Freeform

  // Crop selection, always tracked in the image's own natural pixel space —
  // never in on-screen/display pixels — so it's resolution-independent.
  const [cropRect, setCropRect] = useState(() => ({ x: 0, y: 0, w: imageWidth, h: imageHeight }));

  // New image loaded — reset to an uncropped, unlocked selection.
  useEffect(() => {
    setPreset("Original");
    setCustomRatio(null);
    setCropRect({ x: 0, y: 0, w: imageWidth, h: imageHeight });
  }, [imageWidth, imageHeight]);

  const aspect = imageWidth && imageHeight ? imageWidth / imageHeight : 1;
  const idealImageHeight = MODAL_MAX_HEIGHT - MODAL_CHROME_HEIGHT;

  let imageAreaWidth = idealImageHeight * aspect;
  let imageAreaHeight = idealImageHeight;
  if (imageAreaWidth < MIN_IMAGE_WIDTH) {
    imageAreaWidth = MIN_IMAGE_WIDTH;
    imageAreaHeight = imageAreaWidth / aspect;
  } else if (imageAreaWidth > MAX_IMAGE_WIDTH) {
    imageAreaWidth = MAX_IMAGE_WIDTH;
    imageAreaHeight = imageAreaWidth / aspect;
  }
  const modalWidth = imageAreaWidth + MODAL_CHROME_WIDTH;

  // Natural-image-px -> on-screen-px. The image area's aspect always matches
  // the image's own aspect, so this one factor scales both axes.
  const scale = imageAreaWidth / imageWidth;

  // null = Freeform, no constraint. Otherwise the numeric ratio every
  // resize/move below must preserve.
  const lockedRatio =
    preset === "Freeform"
      ? null
      : preset === "Custom"
      ? customRatio
      : getPresetRatio(preset, imageWidth, imageHeight);

  // True only in the pristine, just-opened state: preset still "Original"
  // and the crop rect still covers the entire image. Any preset change or
  // any drag/resize/typed edit moves cropRect and/or preset away from this.
  const isUnchanged =
    preset === "Original" &&
    cropRect.x === 0 &&
    cropRect.y === 0 &&
    cropRect.w === imageWidth &&
    cropRect.h === imageHeight;

  const handlePresetChange = (value) => {
    setPreset(value);
    if (value === "Freeform") return; // keep current rect, just unlock it
    const ratio = getPresetRatio(value, imageWidth, imageHeight);
    setCropRect(clampRect(fitCenteredRect(ratio, imageWidth, imageHeight), imageWidth, imageHeight));
  };

  const handleToggleLock = () => {
    if (lockedRatio) {
      setPreset("Freeform"); // unlock, keep the current box
      return;
    }
    setCustomRatio(cropRect.w / cropRect.h); // lock at whatever the box is now
    setPreset("Custom");
  };

  // Drag the whole box to reposition the crop (size unchanged).
  const handleBoxPointerDown = (e) => {
    e.preventDefault();
    const startPointer = { x: e.clientX, y: e.clientY };
    const startRect = { ...cropRect };
    const onMove = (ev) => {
      const dx = (ev.clientX - startPointer.x) / scale;
      const dy = (ev.clientY - startPointer.y) / scale;
      const nx = Math.min(Math.max(startRect.x + dx, 0), imageWidth - startRect.w);
      const ny = Math.min(Math.max(startRect.y + dy, 0), imageHeight - startRect.h);
      setCropRect({ ...startRect, x: nx, y: ny });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Corner handles: always shown. Opposite corner is the fixed anchor.
  // When a ratio is locked, width drives height (falling back to height-
  // driven if that would overshoot the image bounds).
  const makeCornerDrag = (corner) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startPointer = { x: e.clientX, y: e.clientY };
    const startRect = { ...cropRect };
    const isEast = corner.includes("e");
    const isSouth = corner.includes("s");
    const anchorX = isEast ? startRect.x : startRect.x + startRect.w;
    const anchorY = isSouth ? startRect.y : startRect.y + startRect.h;

    const onMove = (ev) => {
      const dx = (ev.clientX - startPointer.x) / scale;
      const dy = (ev.clientY - startPointer.y) / scale;
      const movingX = (isEast ? startRect.x + startRect.w : startRect.x) + dx;
      const movingY = (isSouth ? startRect.y + startRect.h : startRect.y) + dy;

      const maxW = isEast ? imageWidth - anchorX : anchorX;
      const maxH = isSouth ? imageHeight - anchorY : anchorY;

      let newW = Math.min(Math.max(Math.abs(movingX - anchorX), MIN_CROP_SIZE), maxW);
      let newH = Math.min(Math.max(Math.abs(movingY - anchorY), MIN_CROP_SIZE), maxH);

      if (lockedRatio) {
        newH = newW / lockedRatio;
        if (newH > maxH) {
          newH = maxH;
          newW = newH * lockedRatio;
        }
        if (newW > maxW) {
          newW = maxW;
          newH = newW / lockedRatio;
        }
      }

      setCropRect({
        x: isEast ? anchorX : anchorX - newW,
        y: isSouth ? anchorY : anchorY - newH,
        w: newW,
        h: newH,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Edge handles: only rendered/usable in Freeform — a locked ratio makes a
  // single-edge drag ambiguous, so corners are the only resize affordance then.
  const makeEdgeDrag = (edge) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startPointer = { x: e.clientX, y: e.clientY };
    const startRect = { ...cropRect };

    const onMove = (ev) => {
      const dx = (ev.clientX - startPointer.x) / scale;
      const dy = (ev.clientY - startPointer.y) / scale;
      let { x, y, w, h } = startRect;
      if (edge === "e") {
        w = Math.min(Math.max(startRect.w + dx, MIN_CROP_SIZE), imageWidth - startRect.x);
      } else if (edge === "w") {
        const nx = Math.min(Math.max(startRect.x + dx, 0), startRect.x + startRect.w - MIN_CROP_SIZE);
        w = startRect.x + startRect.w - nx;
        x = nx;
      } else if (edge === "s") {
        h = Math.min(Math.max(startRect.h + dy, MIN_CROP_SIZE), imageHeight - startRect.y);
      } else if (edge === "n") {
        const ny = Math.min(Math.max(startRect.y + dy, 0), startRect.y + startRect.h - MIN_CROP_SIZE);
        h = startRect.y + startRect.h - ny;
        y = ny;
      }
      setCropRect({ x, y, w, h });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleWidthChange = (val) => {
    let w = Math.min(Math.max(val, MIN_CROP_SIZE), imageWidth - cropRect.x);
    let h = cropRect.h;
    if (lockedRatio) {
      h = w / lockedRatio;
      if (h > imageHeight - cropRect.y) {
        h = imageHeight - cropRect.y;
        w = h * lockedRatio;
      }
    }
    setCropRect({ ...cropRect, w, h });
  };

  const handleHeightChange = (val) => {
    let h = Math.min(Math.max(val, MIN_CROP_SIZE), imageHeight - cropRect.y);
    let w = cropRect.w;
    if (lockedRatio) {
      w = h * lockedRatio;
      if (w > imageWidth - cropRect.x) {
        w = imageWidth - cropRect.x;
        h = w / lockedRatio;
      }
    }
    setCropRect({ ...cropRect, w, h });
  };

  return (
    <div
      className="backdrop-enter fixed inset-0 z-[10000] flex items-center justify-center bg-black/40"
      onMouseDown={onClose}
    >
      <div className="modal-enter flex flex-col" style={{ width: modalWidth }} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between h-12 pl-4 pr-2 py-2 bg-white dark:bg-[#1A1A1D] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-t-2xl shrink-0">
          <span className="text-[14px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA]">
            Crop image
          </span>
                    <Tooltip label="Close">
            <button
              type="button"
              onClick={onClose}
              className="group flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94] shrink-0"
            >
              <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
            </button>
          </Tooltip>
        </div>

        {/* Body */}
        <div className="flex flex-col p-4 gap-4 bg-white dark:bg-[#1A1A1D] border-x border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-b-3xl">
          {/* Preset dropdown */}
          <div className="max-w-[301px] w-full shrink-0">
            <ToolbarDropdown value={preset} options={CROP_PRESET_OPTIONS} onChange={handlePresetChange} />
          </div>

          {/* Image + crop overlay — the full image always stays visible;
              the area outside the crop box is dimmed via a giant box-shadow
              on the crop box itself, clipped by this container's overflow. */}
          <div
            className="relative rounded-xl overflow-hidden shrink-0"
            style={{ width: imageAreaWidth, height: imageAreaHeight }}
          >
            <img
              src={imageUrl}
              draggable={false}
              className="absolute inset-0 w-full h-full select-none pointer-events-none"
              style={{ objectFit: "fill" }} // area's aspect always matches the image's own, so no distortion
              alt=""
            />

            <div
              onPointerDown={handleBoxPointerDown}
              className="absolute border border-dashed border-[#FF47BC] cursor-move"
              style={{
                left: cropRect.x * scale,
                top: cropRect.y * scale,
                width: cropRect.w * scale,
                height: cropRect.h * scale,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              }}
            >
              {/* Rule-of-thirds guide lines */}
              <div className="absolute inset-0 grid grid-cols-3 pointer-events-none">
                <div className="border-r border-[#FF47BC]/40" />
                <div className="border-r border-[#FF47BC]/40" />
                <div />
              </div>
              <div className="absolute inset-0 grid grid-rows-3 pointer-events-none">
                <div className="border-b border-[#FF47BC]/40" />
                <div className="border-b border-[#FF47BC]/40" />
                <div />
              </div>

              {/* Corner handles — always active, drive locked-ratio resizing */}
              <div
                onPointerDown={makeCornerDrag("nw")}
                className="absolute -top-2 -left-2 w-4 h-4 bg-[#FF47BC] rounded-[2px] cursor-nwse-resize"
              />
              <div
                onPointerDown={makeCornerDrag("ne")}
                className="absolute -top-2 -right-2 w-4 h-4 bg-[#FF47BC] rounded-[2px] cursor-nesw-resize"
              />
              <div
                onPointerDown={makeCornerDrag("sw")}
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#FF47BC] rounded-[2px] cursor-nesw-resize"
              />
              <div
                onPointerDown={makeCornerDrag("se")}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#FF47BC] rounded-[2px] cursor-nwse-resize"
              />

              {/* Edge handles — only usable in Freeform */}
              {!lockedRatio && (
                <>
                  <div
                    onPointerDown={makeEdgeDrag("n")}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-[#FF47BC] rounded-[2px] cursor-ns-resize"
                  />
                  <div
                    onPointerDown={makeEdgeDrag("s")}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-[#FF47BC] rounded-[2px] cursor-ns-resize"
                  />
                  <div
                    onPointerDown={makeEdgeDrag("w")}
                    className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-[#FF47BC] rounded-[2px] cursor-ew-resize"
                  />
                  <div
                    onPointerDown={makeEdgeDrag("e")}
                    className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-[#FF47BC] rounded-[2px] cursor-ew-resize"
                  />
                </>
              )}

              {/* Live size readout */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 rounded-md bg-[#FF47BC] text-[#FAF9FA] text-[11px] font-medium whitespace-nowrap pointer-events-none">
                {Math.round(cropRect.w)} × {Math.round(cropRect.h)}
              </div>
            </div>
          </div>

          {/* Width/height + apply */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center flex-1 min-w-0">
              <div className="w-[236px] max-w-full">
                <SizeLockRow
                  width={Math.round(cropRect.w)}
                  height={Math.round(cropRect.h)}
                  onWidthChange={handleWidthChange}
                  onHeightChange={handleHeightChange}
                  locked={!!lockedRatio}
                  onToggleLock={handleToggleLock}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={isUnchanged}
              onClick={() =>
                onApply?.({
                  x: Math.round(cropRect.x),
                  y: Math.round(cropRect.y),
                  width: Math.round(cropRect.w),
                  height: Math.round(cropRect.h),
                  preset,
                })
              }
              className="h-8 shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] enabled:hover:bg-[#F230AE] transition-[background-color,transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
              style={{ boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" }}
            >
              Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}