import React from "react";
import { X } from "@phosphor-icons/react";
import { PopupDropdown, Scrubber, ColorOpacityField, SEG_ON, SEG_OFF } from "./controls.jsx";
import { EffectControls } from "./EffectControls.jsx";
import { MOCKUP_FX_OPTIONS, FRAME_FX_OPTIONS } from "../lib/appConstants.js";
import { pbAngle, pbRotate } from "../lib/progressiveBlur.js";

export function EffectPopup({
  openEffect, effectPopupPos, effectPopupRef, closeEffectPopup, toolbarMode,
  changeEffectType, updateEffect, canvasDims, handleSwatchClick, makePercentDrag,
}) {
  return (
  <div
    ref={effectPopupRef}
    style={{ position: "fixed", top: effectPopupPos.top, right: effectPopupPos.right }}
    className="panel-enter w-[240px] px-3 pb-3 flex flex-col gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
  >
    <div className="-mx-3 mb-1 flex items-center justify-between h-11 pl-4 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
      <span className="text-[14px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">Effect</span>
      <button
        type="button"
        onClick={closeEffectPopup}
        aria-label="Close"
        className="group flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
      </button>
    </div>
    <PopupDropdown
      value={openEffect.type}
      options={toolbarMode === "mockup" ? MOCKUP_FX_OPTIONS : FRAME_FX_OPTIONS}
      onChange={(t) => changeEffectType(openEffect.id, t)}
    />
    <div className={`flex flex-col gap-2 transition-opacity duration-200 ${openEffect.visible ? "opacity-100" : "opacity-40"}`}>
      {openEffect.type === "dropShadow" && (
        <>
          <Scrubber label="X" value={openEffect.x} min={-100} max={100} onChange={(x) => updateEffect(openEffect.id, { x })} />
          <Scrubber label="Y" value={openEffect.y} min={-100} max={100} onChange={(y) => updateEffect(openEffect.id, { y })} />
          <Scrubber label="Blur" value={openEffect.blur} min={0} max={200} onChange={(blur) => updateEffect(openEffect.id, { blur })} />
          <Scrubber label="Spread" value={openEffect.spread} min={-50} max={50} onChange={(spread) => updateEffect(openEffect.id, { spread })} />
          <ColorOpacityField
            hex={openEffect.hex}
            opacity={openEffect.opacity}
            onHexChange={(hex) => updateEffect(openEffect.id, { hex })}
            onOpacityChange={(opacity) => updateEffect(openEffect.id, { opacity })}
            onSwatchClick={() => handleSwatchClick(`fx-${openEffect.id}`)}
            makePercentDrag={makePercentDrag}
          />
        </>
      )}
      {openEffect.type === "layerBlur" && (
        <>
          <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
            {[["uniform", "Uniform"], ["progressive", "Progressive"]].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => updateEffect(openEffect.id, { mode: v })}
                className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  (openEffect.mode ?? "uniform") === v ? SEG_ON : SEG_OFF
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {openEffect.mode === "progressive" ? (
            <>
              <Scrubber label="Start blur" value={openEffect.startBlur ?? 0} min={0} max={100} onChange={(startBlur) => updateEffect(openEffect.id, { startBlur })} />
              <Scrubber label="End blur" value={openEffect.blur} min={0} max={100} onChange={(blur) => updateEffect(openEffect.id, { blur })} />
              <Scrubber
                label="Angle"
                value={pbAngle(openEffect, canvasDims?.w || 1, canvasDims?.h || 1)}
                min={-180} max={180}
                onChange={(a) => updateEffect(openEffect.id, pbRotate(openEffect, canvasDims?.w || 1, canvasDims?.h || 1, a))}
              />
            </>
          ) : (
            <Scrubber label="Blur" value={openEffect.blur} min={0} max={100} onChange={(blur) => updateEffect(openEffect.id, { blur })} />
          )}
        </>
      )}
      {openEffect.type === "noise" && (
        <>
          <Scrubber label="Amount" value={openEffect.amount} min={0} max={100} onChange={(amount) => updateEffect(openEffect.id, { amount })} />
          <Scrubber label="Size" value={openEffect.size} min={1} max={20} onChange={(size) => updateEffect(openEffect.id, { size })} />
        </>
      )}
      <EffectControls
        type={openEffect.type}
        value={openEffect}
        onChange={(patch) => updateEffect(openEffect.id, patch)}
        onSwatch={handleSwatchClick}
        colorTarget={`fx-${openEffect.id}`}
        makePercentDrag={makePercentDrag}
      />
    </div>
  </div>
  );
}

export function AnimEffectPopup({
  animFxId, effectPopupPos, effectPopupRef, activeParamTpl: tpl, animFxList, fxMeta,
  patchAnimFx, closeEffectPopup, canvasDims, handleSwatchClick, makePercentDrag,
}) {
  const fx = animFxList(tpl).find((x) => x.id === animFxId);
  if (!fx) return null;
  const { Icon, label } = fxMeta(fx.type);
  const set = (patch) => patchAnimFx(tpl, fx.id, patch);
  return (
          <div
            ref={effectPopupRef}
            style={{ position: "fixed", top: effectPopupPos.top, right: effectPopupPos.right }}
            className="panel-enter w-[240px] px-3 pb-3 flex flex-col gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
          >
            <div className="-mx-3 mb-1 flex items-center justify-between h-11 pl-4 pr-2 shrink-0 border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
              <span className="flex items-center gap-2 text-[14px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">
                <Icon size={16} weight="regular" className="shrink-0" />
                {label}
              </span>
              <button
                type="button"
                onClick={closeEffectPopup}
                aria-label="Close"
                className="group flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
              </button>
            </div>
            {fx.type === "fade" && <Scrubber label="Fade" value={fx.fade} min={0} max={100} onChange={(fade) => set({ fade })} />}
            {fx.type === "dropShadow" && (
              <>
                <Scrubber label="X" value={fx.x} min={-100} max={100} onChange={(x) => set({ x })} />
                <Scrubber label="Y" value={fx.y} min={-100} max={100} onChange={(y) => set({ y })} />
                <Scrubber label="Blur" value={fx.blur} min={0} max={200} onChange={(blur) => set({ blur })} />
                <Scrubber label="Spread" value={fx.spread} min={-50} max={50} onChange={(spread) => set({ spread })} />
                <ColorOpacityField
                  hex={fx.hex}
                  opacity={fx.opacity}
                  onHexChange={(hex) => set({ hex })}
                  onOpacityChange={(opacity) => set({ opacity })}
                  onSwatchClick={() => handleSwatchClick(`afx-${fx.id}`)}
                  makePercentDrag={makePercentDrag}
                />
              </>
            )}
            {fx.type === "blur" && (
              <>
                <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
                  {["Uniform", "Progressive"].map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => set({ mode: o })}
                      className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        fx.mode === o ? SEG_ON : SEG_OFF
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                {fx.mode === "Progressive" ? (
                  <>
                    <Scrubber label="Start blur" value={fx.startBlur ?? 0} min={0} max={100} onChange={(startBlur) => set({ startBlur })} />
                    <Scrubber label="End blur" value={fx.blur} min={0} max={100} onChange={(blur) => set({ blur })} />
                    <Scrubber
                      label="Angle"
                      value={pbAngle(fx, canvasDims?.w || 1, canvasDims?.h || 1)}
                      min={-180} max={180}
                      onChange={(a) => set(pbRotate(fx, canvasDims?.w || 1, canvasDims?.h || 1, a))}
                    />
                  </>
                ) : (
                  <Scrubber label="Blur" value={fx.blur} min={0} max={100} onChange={(blur) => set({ blur })} />
                )}
              </>
            )}
            <EffectControls
              type={fx.type}
              value={fx}
              onChange={set}
              onSwatch={handleSwatchClick}
              colorTarget={`afx-${fx.id}`}
              makePercentDrag={makePercentDrag}
            />
          </div>
  );
}