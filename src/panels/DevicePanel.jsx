import ToolbarDropdown from "../Dropdown.jsx";
import { getStrapStyleOptions, WATCH_STRAPS } from "../constants/finishes.js";
import { CATEGORY_DEVICE_OPTIONS, DEVICE_TYPE_OPTIONS } from "../constants/options.js";
import { LIGHTING_OPTIONS } from "../constants/uiOptions.js";
import {
  SEG_ON, SEG_OFF, SectionHeader, Scrubber, FinishDropdown, ColorOpacityField,
} from "../components/controls.jsx";

export function DevicePanel({
  toolbarMode, openSections, toggleSection,
  deviceType, deviceCategory, setDeviceType, isTablet, isWatch,
  deviceOrientation, setDeviceOrientation,
  finish, finishOptions, handleFinishChange,
  bodyHex, bodyOpacity, setBodyHex, setBodyOpacity,
  strap, setStrap, strapStyle, setStrapStyle,
  reflectionMode, handleReflectionModeChange, reflectionShiny, reflectionMatte,
  handleReflectionIntensityChange, brightness, handleBrightnessChange,
  lighting, handleLightingChange, lightingIntensity, handleLightingIntensityChange,
  handleSwatchClick, makePercentDrag,
}) {
  return (
    <div className={`order-1 flex flex-col p-4 ... ${toolbarMode === "mockup" ? "" : "hidden"}`}>
<SectionHeader label="Device" open={openSections.device} onToggle={() => toggleSection("device")} />

                        <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.device ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Type</label>
                    <ToolbarDropdown
                      value={deviceType}
                      options={CATEGORY_DEVICE_OPTIONS[deviceCategory] || DEVICE_TYPE_OPTIONS}
                      onChange={setDeviceType}
                    />
                  </div>
                  {isTablet && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Orientation</label>
                      <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
                        {["portrait", "landscape"].map((o) => (
                          <button
                            key={o}
                            onClick={() => setDeviceOrientation(o)}
                            className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 capitalize transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              deviceOrientation === o ? SEG_ON : SEG_OFF
                            }`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Body</label>
                   <FinishDropdown value={finish} options={finishOptions} onChange={handleFinishChange} />
                  </div>

{finish === "Custom" && (
  <div className="flex flex-col gap-2">
    <label className="text-[12px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Custom</label>
    <ColorOpacityField
      hex={bodyHex}
      opacity={bodyOpacity}
      onHexChange={setBodyHex}
      onOpacityChange={setBodyOpacity}
      onSwatchClick={() => handleSwatchClick("body")}
      makePercentDrag={makePercentDrag}
    />
  </div>
)}
   {isWatch && (
     <div className="fx-enter flex flex-col gap-2">
       <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Strap style</label>
       <ToolbarDropdown value={strapStyle} options={getStrapStyleOptions(deviceType)} onChange={setStrapStyle} />
       <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Strap finish</label>
       <FinishDropdown value={strap} options={WATCH_STRAPS} onChange={setStrap} />
     </div>
   )}

                  <div className="flex flex-col gap-2">
  <div className="flex flex-col gap-2">
    <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Screen reflection</label>
    <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
      <button
        onClick={() => handleReflectionModeChange("shiny")}
        className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          reflectionMode === "shiny" ? SEG_ON : SEG_OFF
        }`}
      >
        Shiny
      </button>
      <button
        onClick={() => handleReflectionModeChange("matte")}
        className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          reflectionMode === "matte" ? SEG_ON : SEG_OFF
        }`}
      >
        Matte
      </button>
    </div>
    <Scrubber
      label="Intensity"
      value={reflectionMode === "shiny" ? reflectionShiny : reflectionMatte}
      onChange={handleReflectionIntensityChange}
    />
  </div>
  <Scrubber label="Screen brightness" value={brightness} onChange={handleBrightnessChange} />
</div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Lighting</label>
                    <ToolbarDropdown value={lighting} options={LIGHTING_OPTIONS} onChange={handleLightingChange} />
                  </div>

                  <Scrubber label="Lighting intensity" value={lightingIntensity} onChange={handleLightingIntensityChange} />
                  </div>
                </div>
              </div>
            </div>
          </div>
            );
}