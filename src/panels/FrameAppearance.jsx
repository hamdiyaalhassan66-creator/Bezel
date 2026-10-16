import { CornersOut, Eye, EyeSlash, Minus, Plus } from "@phosphor-icons/react";
import { SizeLockRow } from "../SizeFields.jsx";
import { EFFECT_TYPE_OPTIONS, STROKE_POSITIONS } from "../lib/frameUtils.js";
import {
  SectionHeader, Scrubber, AppearanceHeader, ColorOpacityField, PopupDropdown, CornerRadiusFields,
} from "../components/controls.jsx";

export function FrameAppearance({
  toolbarMode, openSections, toggleSection,
  frameWidth, frameHeight, frameWMixed, frameHMixed, frameAspectLocked,
  handleFrameWidthChange, handleFrameHeightChange, toggleFrameAspectLock,
  frameCorners, frameRadius, setFrameCorners, setFrameRadius,
  frameStroke, updateStroke,
  frameEffects, effectRowRefs, toggleEffectPopup, updateEffect, removeEffect, addEffect,
  handleSwatchClick, makePercentDrag,
}) {
  return (
    <div className={`flex flex-col p-4 ... ${toolbarMode === "frame" ? "" : "hidden"}`}>
<SectionHeader label="Appearance" open={openSections.appearance} onToggle={() => toggleSection("appearance")} />

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.appearance ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-4">
                  {/* Size */}
<div className="flex flex-col gap-2">
  <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Size</label>
  <SizeLockRow
    width={frameWidth}
    height={frameHeight}
    onWidthChange={handleFrameWidthChange}
    onHeightChange={handleFrameHeightChange}
    wMixed={frameWMixed}
    hMixed={frameHMixed}
    locked={frameAspectLocked}
    onToggleLock={toggleFrameAspectLock}
  />
</div>
                  {/* Radius */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Radius</label>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
<Scrubber
  label="Corner radius"
  mixed={frameCorners !== null && !frameCorners.every((c) => c === frameCorners[0])}
  value={frameCorners ? Math.round(frameCorners.reduce((a, b) => a + b, 0) / 4) : Math.round(frameRadius)}
  min={0}
  max={50}
  hardMax={Infinity}
                          onChange={(v) => {
                            setFrameRadius(v);
                            if (frameCorners) setFrameCorners([v, v, v, v]); // master control when corners are split
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="Individual corners"
                        aria-pressed={frameCorners !== null}
                        onClick={() => {
                          if (frameCorners) {
                            setFrameRadius(Math.round(frameCorners.reduce((a, b) => a + b, 0) / 4));
                            setFrameCorners(null);
                          } else {
                            setFrameCorners([frameRadius, frameRadius, frameRadius, frameRadius]);
                          }
                        }}
                        className="group flex items-center justify-center w-9 h-9 shrink-0 rounded-[10px] transition-[background-color,transform] duration-150 active:scale-[0.94] hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <CornersOut
                          size={16}
                          weight="regular"
                          className={`transition-colors ${
                            frameCorners
                              ? "text-[#FF47BC]"
                              : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
                          }`}
                        />
                      </button>
                    </div>
                    {frameCorners && (
                      <CornerRadiusFields
                        values={frameCorners}
                        onChange={(i, v) => setFrameCorners((prev) => prev && prev.map((c, idx) => (idx === i ? v : c)))}
                      />
                    )}
                  </div>

                  {/* Stroke */}
<div className="flex flex-col gap-2">
  <AppearanceHeader label="Stroke" onClick={() => updateStroke({ on: !frameStroke.on })}>
    <span key={frameStroke.on ? "on" : "off"} className="icon-swap flex">
      {frameStroke.on ? <Minus size={16} weight="regular" /> : <Plus size={16} weight="regular" />}
    </span>
  </AppearanceHeader>

  {frameStroke.on && (
    <div className="fx-enter flex flex-col gap-2">
      <ColorOpacityField
        hex={frameStroke.hex}
        opacity={frameStroke.opacity}
        onHexChange={(hex) => updateStroke({ hex })}
        onOpacityChange={(opacity) => updateStroke({ opacity })}
        onSwatchClick={() => handleSwatchClick("stroke")}
        makePercentDrag={makePercentDrag}
      />
      <Scrubber
        label="Weight"
        value={frameStroke.width}
        min={0}
        max={50}
        onChange={(width) => updateStroke({ width })}
      />
      <PopupDropdown
        value={frameStroke.position}
        options={STROKE_POSITIONS}
        onChange={(position) => updateStroke({ position })}
      />
    </div>
  )}
</div>

{/* Effects */}
<div className="flex flex-col gap-2">
<AppearanceHeader label="Effects" onClick={addEffect}>
  <Plus size={16} weight="regular" />
</AppearanceHeader>

  {frameEffects.map((fx) => (
    <div
      key={fx.id}
      ref={(el) => { effectRowRefs.current[fx.id] = el; }}
      className="fx-enter flex items-center gap-1"
    >
      <button
        type="button"
        data-effect-trigger
        onClick={() => toggleEffectPopup(fx.id)}
        className="group flex-1 min-w-0 flex items-center gap-1"
      >
        <span className="flex-1 min-w-0 h-9 flex items-center px-2.5 bg-[#EDEDED] dark:bg-[#292929] group-hover:bg-[#E3E3E3] dark:group-hover:bg-[#333333] rounded-[10px] text-[13px] font-medium tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] text-left transition-colors duration-200">
          {EFFECT_TYPE_OPTIONS.find((o) => o.value === fx.type)?.label}
        </span>
      </button>
      <button
        type="button"
        onClick={() => updateEffect(fx.id, { visible: !fx.visible })}
        className="group flex items-center justify-center w-9 h-9 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
      >
        {fx.visible ? (
          <Eye size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        ) : (
          <EyeSlash size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        )}
      </button>
      <button
        type="button"
        onClick={() => removeEffect(fx.id)}
        className="group flex items-center justify-center w-9 h-9 shrink-0 rounded-lg hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
      >
        <Minus size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
      </button>
    </div>
  ))}
</div>
                </div>
              </div>
            </div>
          </div>
            );
}