import React from "react";
import { X, Drop } from "@phosphor-icons/react";
import { PopupDropdown, Scrubber, ToggleRow, ColorOpacityField } from "./controls.jsx";
import { GRAD_FX_ICON, GRAD_FX_OPTIONS } from "../lib/appConstants.js";
import {
  HALFTONE_PATTERNS, HALFTONE_COLOR_MODES, WARP_MODES, DITHER_STYLES, LENS_MODES, LENS_QUALITY,
  PIXEL_SHAPES, DISSOLVE_MODES, HATCH_PATTERNS, FX_DEFAULTS, ROLL_DIRECTIONS, EDGE_MODES,
  REFRACT_PATTERNS, WRAP_MODES, BANKNOTE_PLACEMENTS, BANKNOTE_ACCENT_MODES, GRAIN_TYPES, GRAIN_BLENDS,
} from "../lib/gradientFilters.js";

export function GradientFxPopup({ fx, pos, popupRef, onClose, set, onTypeChange, grain, handleSwatchClick, makePercentDrag }) {
  const { grainType, setGrainType, grainAmount, setGrainAmount, grainScale, setGrainScale, grainBlend, setGrainBlend } = grain;
  const Icon = GRAD_FX_ICON[fx.type] ?? Drop;
  return (
    <div
      ref={popupRef}
      style={{ position: "fixed", top: pos.top, right: pos.right, maxHeight: "82vh" }}
      className="panel-enter w-[240px] px-3 pb-3 flex flex-col gap-2 overflow-y-auto custom-scroll bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[9000]"
    >
      <div className="-mx-3 mb-1 flex items-center justify-between h-11 pl-4 pr-2 shrink-0 sticky top-0 z-10 bg-[#FAF9FA] dark:bg-[#171717] border-b border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10">
        <span className="flex items-center gap-2 text-[14px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">
          <Icon size={16} weight="regular" className="shrink-0" />
          Filter
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="group flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
        </button>
      </div>
      <PopupDropdown value={fx.type} options={GRAD_FX_OPTIONS} onChange={onTypeChange} />
      <div className={`flex flex-col gap-2 transition-opacity duration-200 ${fx.visible ? "opacity-100" : "opacity-40"}`}>
              {fx.type === "grain" ? (
                <>
                  <PopupDropdown value={grainType} options={GRAIN_TYPES} onChange={setGrainType} />
                  <Scrubber label="Amount" value={grainAmount} min={1} max={100} onChange={setGrainAmount} />
                  {grainType !== "noise" && (
                    <>
                      <Scrubber label="Scale" value={grainScale} min={20} max={300} onChange={setGrainScale} />
                      <PopupDropdown value={grainBlend} options={GRAIN_BLENDS} onChange={setGrainBlend} />
                    </>
                  )}
                </>
              ) : fx.type === "halftone" ? (
                <>
                  <PopupDropdown value={fx.halftoneType ?? 0} options={HALFTONE_PATTERNS} onChange={(halftoneType) => set({ halftoneType })} />
                  <PopupDropdown value={fx.colorMode ?? 0} options={HALFTONE_COLOR_MODES} onChange={(colorMode) => set({ colorMode })} />
                  <Scrubber label="Dot size" value={fx.dotSize ?? 20} min={4} max={120} onChange={(dotSize) => set({ dotSize })} />
                  <Scrubber label="Dot scale" value={fx.dotScale ?? 100} min={0} max={200} onChange={(dotScale) => set({ dotScale })} />
                  <Scrubber label="Softness" value={fx.softness ?? 0} min={0} max={100} onChange={(softness) => set({ softness })} />
                  <Scrubber label="Rotation" value={fx.angle} min={-180} max={180} onChange={(angle) => set({ angle })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                </>
              ) : fx.type === "dither" ? (
                <>
                  <PopupDropdown value={fx.ditherStyle ?? "Bayer 16x16"} options={DITHER_STYLES} onChange={(ditherStyle) => set({ ditherStyle })} />
                  <Scrubber label="Size" value={fx.pixelSize ?? 2} min={1} max={8} onChange={(pixelSize) => set({ pixelSize })} />
                  <Scrubber label="Levels" value={fx.levels ?? 3} min={2} max={8} onChange={(levels) => set({ levels })} />
                  <Scrubber label="Brightness" value={fx.brightness ?? 100} min={0} max={200} onChange={(brightness) => set({ brightness })} />
                  <Scrubber label="Contrast" value={fx.contrast ?? 100} min={50} max={200} onChange={(contrast) => set({ contrast })} />
                  <ToggleRow label="Mono" checked={!!fx.mono} onChange={(mono) => set({ mono })} />
                  {fx.mono && (
                    <ColorOpacityField
                      hex={fx.monoHex ?? "FFFFFF"}
                      opacity={100}
                      onHexChange={(monoHex) => set({ monoHex })}
                      onOpacityChange={() => {}}
                      onSwatchClick={() => handleSwatchClick("gfx-mono")}
                      makePercentDrag={makePercentDrag}
                    />
                  )}
                </>
              ) : fx.type === "lens" ? (
                <>
                  <PopupDropdown value={fx.lensMode ?? 0} options={LENS_MODES} onChange={(lensMode) => set({ lensMode })} />
                  <PopupDropdown value={fx.lensQuality ?? 1} options={LENS_QUALITY} onChange={(lensQuality) => set({ lensQuality })} />
                  <Scrubber label="Distortion" value={fx.distortion ?? 50} min={0} max={100} onChange={(distortion) => set({ distortion })} />
                  <Scrubber label="Aberration" value={fx.aberration ?? 20} min={0} max={100} onChange={(aberration) => set({ aberration })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                </>
              ) : fx.type === "warp" ? (
                <>
                  <PopupDropdown value={fx.warpMode ?? 0} options={WARP_MODES} onChange={(warpMode) => set({ warpMode })} />
                  <Scrubber label="Amplitude" value={fx.amplitude ?? 15} min={0} max={100} onChange={(amplitude) => set({ amplitude })} />
                  <Scrubber label="Scale" value={fx.warpScale ?? 20} min={0} max={100} onChange={(warpScale) => set({ warpScale })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                </>
              ) : fx.type === "pixelate" ? (
                <>
                  <PopupDropdown value={fx.pixelShape ?? 0} options={PIXEL_SHAPES} onChange={(pixelShape) => set({ pixelShape })} />
                  <Scrubber label="Size" value={fx.size ?? 10} min={2} max={100} onChange={(size) => set({ size })} />
                  <Scrubber label="Stretch" value={fx.stretch ?? 100} min={0} max={2000} onChange={(stretch) => set({ stretch })} />
                  <Scrubber label="Gap" value={fx.gap ?? 0} min={0} max={50} onChange={(gap) => set({ gap })} />
                  <Scrubber label="Color trim" value={fx.colorTrim ?? 2} min={2} max={16} onChange={(colorTrim) => set({ colorTrim })} />
                  <Scrubber label="Average color" value={fx.averageColor ?? 80} min={0} max={100} onChange={(averageColor) => set({ averageColor })} />
                  <PopupDropdown value={fx.dissolveMode ?? 0} options={DISSOLVE_MODES} onChange={(dissolveMode) => set({ dissolveMode })} />
                  <Scrubber label="Dissolve" value={fx.dissolve ?? 0} min={0} max={100} onChange={(dissolve) => set({ dissolve })} />
                  <Scrubber label="Falloff" value={fx.falloff ?? 0} min={0} max={100} onChange={(falloff) => set({ falloff })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                  <Scrubber label="Radius" value={fx.radius ?? 75} min={0} max={200} onChange={(radius) => set({ radius })} />
                  <Scrubber label="Angle" value={fx.angle ?? 90} min={-180} max={180} onChange={(angle) => set({ angle })} />
                  <ToggleRow label="Knockout" checked={fx.knockout ?? true} onChange={(knockout) => set({ knockout })} />
                </>
              ) : fx.type === "hatching" ? (
                <>
                  <PopupDropdown value={fx.hatchMode ?? 1} options={HATCH_PATTERNS} onChange={(hatchMode) => set({ hatchMode })} />
                  <Scrubber label="Density" value={fx.density ?? 100} min={0} max={200} onChange={(density) => set({ density })} />
                  <Scrubber label="Softness" value={fx.softness ?? 0} min={0} max={100} onChange={(softness) => set({ softness })} />
                  <Scrubber label="Frequency" value={fx.waveFreq ?? 28} min={0} max={200} onChange={(waveFreq) => set({ waveFreq })} />
                  <Scrubber label="Amplitude" value={fx.waveAmp ?? 23} min={0} max={1000} onChange={(waveAmp) => set({ waveAmp })} />
                  <Scrubber label="Offset X" value={fx.offsetX ?? 0} min={0} max={100} onChange={(offsetX) => set({ offsetX })} />
                  <Scrubber label="Offset Y" value={fx.offsetY ?? 0} min={0} max={100} onChange={(offsetY) => set({ offsetY })} />
                  <ColorOpacityField
                    hex={fx.bgHex ?? "0A5D37"}
                    opacity={fx.bgOpacity ?? 100}
                    labelText="Background"
                    onHexChange={(bgHex) => set({ bgHex })}
                    onOpacityChange={(bgOpacity) => set({ bgOpacity })}
                    onSwatchClick={() => handleSwatchClick("gfx-bg")}
                    makePercentDrag={makePercentDrag}
                  />
                  <ColorOpacityField
                    hex={fx.fgHex ?? "C7F8F8"}
                    opacity={fx.fgOpacity ?? 100}
                    labelText="Foreground"
                    onHexChange={(fgHex) => set({ fgHex })}
                    onOpacityChange={(fgOpacity) => set({ fgOpacity })}
                    onSwatchClick={() => handleSwatchClick("gfx-fg")}
                    makePercentDrag={makePercentDrag}
                  />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                  <Scrubber label="Line width" value={fx.lineWidth ?? 8} min={1} max={100} onChange={(lineWidth) => set({ lineWidth })} />
                  <Scrubber label="Angle" value={fx.angle ?? 90} min={-180} max={180} onChange={(angle) => set({ angle })} />
                </>
              ) : fx.type === "pistons" ? (
                <>
                  <Scrubber label="Columns" value={fx.cols ?? 60} min={10} max={150} onChange={(cols) => set({ cols })} />
                  <Scrubber label="Gap" value={fx.gap ?? 18} min={2} max={50} onChange={(gap) => set({ gap })} />
                  <Scrubber label="Min bar width" value={fx.minBar ?? 5} min={0} max={50} onChange={(minBar) => set({ minBar })} />
                  <Scrubber label="Highlight" value={fx.highlight ?? 25} min={0} max={60} onChange={(highlight) => set({ highlight })} />
                </>
              ) : fx.type === "asciiwave" ? (
                <>
                  <Scrubber label="Rows" value={fx.rows ?? 20} min={5} max={60} onChange={(rows) => set({ rows })} />
                  <Scrubber label="Amplitude" value={fx.amplitude ?? 60} min={0} max={100} onChange={(amplitude) => set({ amplitude })} />
                  <Scrubber label="Frequency" value={fx.frequency ?? 20} min={0} max={100} onChange={(frequency) => set({ frequency })} />
                  <Scrubber label="Angle" value={fx.angle ?? 38} min={-90} max={90} onChange={(angle) => set({ angle })} />
                  <Scrubber label="Thickness" value={fx.thickness ?? 9} min={1} max={50} onChange={(thickness) => set({ thickness })} />
                  <Scrubber label="Softness" value={fx.softness ?? 60} min={0} max={100} onChange={(softness) => set({ softness })} />
                  <Scrubber label="Phase" value={fx.phase ?? 0} min={0} max={100} onChange={(phase) => set({ phase })} />
                  <ColorOpacityField
                    hex={fx.waveHex ?? "1166D9"}
                    opacity={100}
                    labelText="Wave color"
                    onHexChange={(waveHex) => set({ waveHex })}
                    onOpacityChange={() => {}}
                    onSwatchClick={() => handleSwatchClick("gfx-wave")}
                    makePercentDrag={makePercentDrag}
                  />
                  <ColorOpacityField
                    hex={fx.waveBgHex ?? "060611"}
                    opacity={100}
                    labelText="Background"
                    onHexChange={(waveBgHex) => set({ waveBgHex })}
                    onOpacityChange={() => {}}
                    onSwatchClick={() => handleSwatchClick("gfx-wavebg")}
                    makePercentDrag={makePercentDrag}
                  />
                </>
              ) : fx.type === "collapsinggrid" ? (
                <>
                  <Scrubber label="Grid size" value={fx.gridSize ?? 10} min={2} max={40} onChange={(gridSize) => set({ gridSize })} />
                  <Scrubber label="Collapse" value={fx.collapse ?? 30} min={0} max={100} onChange={(collapse) => set({ collapse })} />
                  <Scrubber label="Gap size" value={fx.gapSize ?? 5} min={0} max={50} onChange={(gapSize) => set({ gapSize })} />
                  <Scrubber label="Corner radius" value={fx.cornerRadius ?? 10} min={0} max={50} onChange={(cornerRadius) => set({ cornerRadius })} />
                  <ToggleRow label="Varying corners" checked={!!fx.varyCorners} onChange={(varyCorners) => set({ varyCorners })} />
                  <ColorOpacityField
                    hex={fx.bgHex ?? "000000"}
                    opacity={fx.bgOpacity ?? 100}
                    labelText="Gap color"
                    onHexChange={(bgHex) => set({ bgHex })}
                    onOpacityChange={(bgOpacity) => set({ bgOpacity })}
                    onSwatchClick={() => handleSwatchClick("gfx-bg")}
                    makePercentDrag={makePercentDrag}
                  />
                </>
              ) : fx.type === "patternrefraction" ? (
                <>
                  <PopupDropdown value={fx.patternType ?? 0} options={REFRACT_PATTERNS} onChange={(patternType) => set({ patternType })} />
                  <Scrubber label="Strength" value={fx.strength ?? 50} min={-100} max={100} onChange={(strength) => set({ strength })} />
                  <Scrubber label="Smoothness" value={fx.smoothness ?? 0} min={0} max={100} onChange={(smoothness) => set({ smoothness })} />
                  <Scrubber label="Frost" value={fx.frost ?? 0} min={0} max={100} onChange={(frost) => set({ frost })} />
                  <Scrubber label="Dispersion" value={fx.dispersion ?? 4} min={-100} max={100} onChange={(dispersion) => set({ dispersion })} />
                  <PopupDropdown value={fx.wrapMode ?? 0} options={WRAP_MODES} onChange={(wrapMode) => set({ wrapMode })} />
                  <Scrubber label="Center X" value={fx.cx ?? 50} min={0} max={100} onChange={(cx) => set({ cx })} />
                  <Scrubber label="Center Y" value={fx.cy ?? 50} min={0} max={100} onChange={(cy) => set({ cy })} />
                  <Scrubber label="Size" value={fx.radius ?? 8} min={0} max={100} onChange={(radius) => set({ radius })} />
                  <Scrubber label="Angle" value={fx.angle ?? 45} min={-180} max={180} onChange={(angle) => set({ angle })} />
                </>
              ) : fx.type === "banknote" ? (() => {
                const D = FX_DEFAULTS.banknote;
                const on = (k) => fx[k] ?? D[k];
                const S = (label, k, min, max) => (
                  <Scrubber key={k} label={label} value={on(k)} min={min} max={max} onChange={(v) => set({ [k]: v })} />
                );
                const H = (t) => (
                  <span className="pt-2 text-[12px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">{t}</span>
                );
                return (
                  <>
                    {H("Ink & paper")}
                    <ColorOpacityField
                      hex={on("inkHex")} opacity={on("inkOpacity")} labelText="Main ink"
                      onHexChange={(inkHex) => set({ inkHex })} onOpacityChange={(inkOpacity) => set({ inkOpacity })}
                      onSwatchClick={() => handleSwatchClick("gfx-ink")} makePercentDrag={makePercentDrag}
                    />
                    <ColorOpacityField
                      hex={on("paperHex")} opacity={on("paperOpacity")} labelText="Paper"
                      onHexChange={(paperHex) => set({ paperHex })} onOpacityChange={(paperOpacity) => set({ paperOpacity })}
                      onSwatchClick={() => handleSwatchClick("gfx-paper")} makePercentDrag={makePercentDrag}
                    />

                    {H("Lines")}
                    {S("Spacing", "spacing", 8, 120)}
                    {S("Line weight", "lineWeight", 40, 160)}
                    {S("Angle", "angle", -90, 90)}
                    {S("Contour flow", "flow", 0, 160)}
                    {S("Crosshatching", "crosshatch", 0, 100)}

                    {H("Guilloche")}
                    {S("Strength", "guilloche", 0, 100)}
                    <PopupDropdown value={on("placement")} options={BANKNOTE_PLACEMENTS} onChange={(placement) => set({ placement })} />
                    {on("placement") === 1 && S("Upper region reach", "patternExtent", 0, 100)}
                    {S("Scale", "patternScale", 40, 300)}
                    {S("Curvature", "curvature", 0, 160)}

                    {H("Tone")}
                    {S("Exposure", "exposure", -200, 200)}
                    {S("Contrast", "contrast", 50, 200)}
                    {S("Tone curve", "gamma", 40, 200)}
                    {S("Detail", "detail", 0, 200)}

                    {H("Print")}
                    {S("Paper grain", "grain", 0, 100)}
                    {S("Ink wear", "wear", 0, 100)}
                    {S("Fine stippling", "stipple", 0, 100)}

                    {H("Color accent")}
                    <ToggleRow label="Preserve selected hue" checked={!!on("preserveHue")} onChange={(preserveHue) => set({ preserveHue })} />
                    {on("preserveHue") && (
                      <>
                        {S("Hue", "hue", 0, 360)}
                        {S("Tolerance", "tolerance", 1, 180)}
                        {S("Feather", "feather", 1, 60)}
                        {S("Min saturation", "minSaturation", 0, 90)}
                        {S("Accent strength", "accentStrength", 0, 100)}
                        {S("Keep shadows in ink", "shadowProtection", 0, 100)}
                        <PopupDropdown value={on("accentMode")} options={BANKNOTE_ACCENT_MODES} onChange={(accentMode) => set({ accentMode })} />
                        {on("accentMode") === 1 && (
                          <ColorOpacityField
                            hex={on("accentHex")} opacity={on("accentOpacity")} labelText="Accent ink"
                            onHexChange={(accentHex) => set({ accentHex })} onOpacityChange={(accentOpacity) => set({ accentOpacity })}
                            onSwatchClick={() => handleSwatchClick("gfx-accent")} makePercentDrag={makePercentDrag}
                          />
                        )}
                        <ToggleRow label="Preview hue mask" checked={!!on("maskPreview")} onChange={(maskPreview) => set({ maskPreview })} />
                      </>
                    )}

                    {H("Finish")}
                    <ToggleRow label="Keep transparency" checked={!!on("keepAlpha")} onChange={(keepAlpha) => set({ keepAlpha })} />
                    {S("Effect amount", "amount", 0, 100)}
                  </>
                );
              })() : fx.type === "glitch" ? (() => {
                const D = FX_DEFAULTS.glitch;
                const on = (k) => fx[k] ?? D[k];
                const S = (label, k, min, max) => (
                  <Scrubber key={k} label={label} value={on(k)} min={min} max={max} onChange={(v) => set({ [k]: v })} />
                );
                const T = (label, k) => <ToggleRow key={k} label={label} checked={!!on(k)} onChange={(v) => set({ [k]: v })} />;
                const H = (t) => (
                  <span className="pt-2 text-[12px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">{t}</span>
                );
                const speeds = fx.rollingSpeeds ?? D.rollingSpeeds;
                return (
                  <>
                    {H("Master")}
                    {S("Strength", "strength", 0, 100)}
                    {S("Loop (s)", "loopSeconds", 1, 20)}
                    {S("Effect mix", "effectMix", 0, 100)}
                    <PopupDropdown value={on("edgeMode")} options={EDGE_MODES} onChange={(edgeMode) => set({ edgeMode })} />

                    {H("Timing")}
                    {S("Phase", "phase", 0, 100)}
                    {S("Bursts per loop", "bursts", 1, 12)}
                    {S("Burst duration", "burstDuration", 5, 400)}
                    {S("Irregularity", "irregularity", 0, 100)}
                    {S("Seed", "seed", 0, 9999)}

                    {T("Tearing", "tearing")}
                    {on("tearing") && (
                      <>
                        {S("Displacement", "tearAmount", 0, 40)}
                        {S("Band thickness", "bandThickness", 2, 200)}
                        {S("Band density", "bandDensity", 1, 48)}
                        {S("Edge softness", "edgeSoftness", 0, 100)}
                      </>
                    )}

                    {T("Fragments", "fragmentation")}
                    {on("fragmentation") && (
                      <>
                        {S("Band extent", "blockSize", 2, 50)}
                        {S("Displacement", "fragmentAmount", 0, 40)}
                        {S("Coverage", "coverage", 0, 100)}
                      </>
                    )}

                    {T("Color separation", "colorSplit")}
                    {on("colorSplit") && (
                      <>
                        {S("Split distance", "splitDistance", 0, 30)}
                        {S("Split angle", "splitAngle", -180, 180)}
                      </>
                    )}

                    {T("Scanlines", "scanlines")}
                    {on("scanlines") && (
                      <>
                        {S("Strength", "scanStrength", 0, 100)}
                        {S("Spacing", "scanSpacing", 2, 24)}
                      </>
                    )}

                    {T("Noise", "noiseEnabled")}
                    {on("noiseEnabled") && (
                      <>
                        {S("Amount", "noiseAmount", 0, 50)}
                        {S("Grain size", "grainSize", 10, 160)}
                      </>
                    )}

                    {T("Flicker", "flicker")}
                    {on("flicker") && S("Strength", "flickerStrength", 0, 50)}

                    {T("Diagonal buzz", "diagonalEnabled")}
                    {on("diagonalEnabled") && (
                      <>
                        {S("Amount", "diagonalAmount", 0, 100)}
                        {S("Angle", "diagonalAngle", -180, 180)}
                        {S("Width", "diagonalWidth", 1, 50)}
                      </>
                    )}

                    {T("Rolling bands", "rollingEnabled")}
                    {on("rollingEnabled") && (
                      <>
                        <PopupDropdown value={on("rollingDirection")} options={ROLL_DIRECTIONS} onChange={(rollingDirection) => set({ rollingDirection })} />
                        {S("Master speed", "rollingPasses", 1, 8)}
                        {S("Concurrent bands", "rollingCount", 3, 6)}
                        {S("Core width", "rollingCoreWidth", 10, 400)}
                        {S("Falloff", "rollingHaloExtent", 5, 200)}
                        {S("Displacement", "rollingDisplacement", 0, 120)}
                        {S("Color tearing", "rollingColorTearing", 0, 240)}
                        {S("Static strength", "rollingStaticStrength", 0, 50)}
                        {Array.from({ length: on("rollingCount") }, (_, i) => (
                          <Scrubber
                            key={`rs${i}`}
                            label={`Line ${i + 1} speed`}
                            value={speeds[i] ?? 1}
                            min={1}
                            max={8}
                            onChange={(v) => set({ rollingSpeeds: Array.from({ length: 6 }, (_, j) => (j === i ? v : speeds[j] ?? 1)) })}
                          />
                        ))}
                      </>
                    )}
                  </>
                );
              })() : (
                <>
                  <Scrubber label="Amount" value={fx.amount} min={0} max={100} onChange={(amount) => set({ amount })} />
                  <Scrubber label="Scale" value={fx.scale} min={1} max={100} onChange={(scale) => set({ scale })} />
                  <Scrubber label="Angle" value={fx.angle} min={-180} max={180} onChange={(angle) => set({ angle })} />
                </>
              )}
      </div>
    </div>
  );
}