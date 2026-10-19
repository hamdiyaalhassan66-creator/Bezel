import { CornersOut, Drop, Eye, EyeSlash, Minus, Plus, X } from "@phosphor-icons/react";
import { SizeLockRow } from "../SizeFields.jsx";
import Tooltip from "../Tooltip.jsx";
import { FX_ICON } from "../constants/effectIcons.js";
import { STROKE_POSITIONS } from "../lib/frameUtils.js";
import { ALL_EFFECT_OPTIONS } from "../lib/sharedEffects.js";
import {
  SectionHeader, Scrubber, AppearanceHeader, ColorOpacityField, PopupDropdown, CornerRadiusFields,
} from "../components/controls.jsx";

export function FrameAppearance({
  toolbarMode, openSections, toggleSection,
  frameWidth, frameHeight, frameWMixed, frameHMixed, frameAspectLocked,
  handleFrameWidthChange, handleFrameHeightChange, toggleFrameAspectLock,
  frameCorners, frameRadius, setFrameCorners, setFrameRadius,
  frameStroke, updateStroke,
  frameEffects, effectRowRefs, openEffectId, toggleEffectPopup, updateEffect, removeEffect, openFrameFxMenu,
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
  <div data-fx-add>
    <AppearanceHeader label="Effects" onClick={openFrameFxMenu}>
      <Plus size={16} weight="regular" />
    </AppearanceHeader>
  </div>

  <div className={frameEffects.length ? "flex flex-col gap-1" : "hidden"}>
    {frameEffects.map((fx) => {
      const Icon = FX_ICON[fx.type] ?? Drop;
      const label = ALL_EFFECT_OPTIONS.find((o) => o.value === fx.type)?.label;
      const active = openEffectId === fx.id || frameEffects.length === 1; // a lone effect reads as selected, like a lone text layer
      return (
        <div
          key={fx.id}
          ref={(el) => { effectRowRefs.current[fx.id] = el; }}
          data-effect-trigger
          className={`group fx-enter flex items-center h-8 pl-2 pr-1 gap-1 rounded-lg transition-[background-color,opacity] duration-100 ease-in-out ${
            active ? "bg-[#FF47BC]/10" : "hover:bg-[#F2F2F2] dark:hover:bg-[#1F1F1F]"
          }`}
        >
          <button
            type="button"
            onClick={() => toggleEffectPopup(fx.id)}
            className={`flex-1 min-w-0 h-full flex items-center gap-2 text-left text-[12px] font-medium tracking-[-0.005em] ${
              active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA]"
            } ${fx.visible ? "" : "opacity-50"}`}
          >
            <Icon size={16} weight="regular" className="shrink-0" />
            <span className="truncate">{label}</span>
          </button>
          <Tooltip label={fx.visible ? "Hide" : "Show"} placement="bottom" className="shrink-0">
            <button
              type="button"
              aria-label={fx.visible ? "Hide" : "Show"}
              onClick={() => updateEffect(fx.id, { visible: !fx.visible })}
              className="flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-[background-color,transform] duration-150 active:scale-[0.94]"
            >
              {fx.visible ? (
                <Eye size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
              ) : (
                <EyeSlash size={16} weight="regular" className={active ? "text-[#FF47BC]" : "text-[#8C8C8C] dark:text-[#9A9A9A]"} />
              )}
            </button>
          </Tooltip>
          <Tooltip label="Remove" placement="bottom" className="shrink-0">
            <button
              type="button"
              aria-label="Remove"
              onClick={() => removeEffect(fx.id)}
              className="group/x flex items-center justify-center w-6 h-6 shrink-0 rounded-md hover:bg-[#F04438]/10 transition-[background-color,transform] duration-150 active:scale-[0.94]"
            >
              <X size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover/x:text-[#F04438] transition-colors" />
            </button>
          </Tooltip>
        </div>
      );
    })}
  </div>
</div>
                </div>
              </div>
            </div>
          </div>
            );
}