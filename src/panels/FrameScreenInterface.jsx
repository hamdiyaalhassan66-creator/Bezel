import { UploadSimple, Trash } from "@phosphor-icons/react";
import Tooltip from "../Tooltip.jsx";
import ToolbarDropdown from "../Dropdown.jsx";
import { SOCIAL_OPTIONS } from "../lib/social.js";
import { SEG_ON, SEG_OFF, SectionHeader, ToggleRow } from "../components/controls.jsx";
import { SOCIAL_FULL_WIDTH, SocialField, ImageUploadField } from "../components/SocialFields.jsx";

export function FrameScreenInterface({
  toolbarMode, openSections, toggleSection,
  frameStatusBar, setFrameStatusBar, frameHomeIndicator, setFrameHomeIndicator,
  frameSocial, toggleSocialOn, changeSocialPlatform, changeSocialMode,
  activeSocialPlatform, activeSocialMode, updateSocial,
  avatarInputRef, handleAvatarUpload,
}) {
  return (
    <div className={`order-4 flex flex-col p-4 ... ${toolbarMode === "frame" ? "" : "hidden"}`}>
            <SectionHeader label="Screen Interface" open={openSections.social} onToggle={() => toggleSection("social")} />

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                openSections.social ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-4 flex flex-col gap-2">
                  <ToggleRow label="Status bar" checked={!!frameStatusBar} onChange={setFrameStatusBar} />
                  <ToggleRow label="Home indicator" checked={!!frameHomeIndicator} onChange={setFrameHomeIndicator} />
                  <ToggleRow label="Social media UI" checked={frameSocial.on} onChange={toggleSocialOn} />

{frameSocial.on && (
  <div className="fx-enter flex flex-col gap-2">
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">Platform</label>
      <ToolbarDropdown value={frameSocial.platform} options={SOCIAL_OPTIONS} onChange={changeSocialPlatform} />
    </div>

    {activeSocialPlatform.modes.length > 1 && (
      <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
        {activeSocialPlatform.modes.map((m) => (
          <button
            key={m.value}
            onClick={() => changeSocialMode(m.value)}
            className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
              activeSocialMode.value === m.value ? SEG_ON : SEG_OFF
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    )}

    {activeSocialMode.themed && (
      <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
        {["light", "dark"].map((t) => (
          <button
            key={t}
            onClick={() => updateSocial({ theme: t })}
            className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 capitalize transition-colors duration-200 ${
              frameSocial.theme === t ? SEG_ON : SEG_OFF
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    )}

{["instagram", "whatsapp", "tiktok", "linkedin", "facebook"].includes(frameSocial.platform) && (
  <div className="flex flex-col gap-2">
    <label className="text-[13px] font-medium tracking-[0.01em] text-[#8C8C8C] dark:text-[#9A9A9A]">{frameSocial.platform === "tiktok" ? "Profile picture" : "Avatar"}</label>
    {frameSocial.avatar ? (
      <div className="w-full h-[66px] flex items-center justify-between py-2 pl-2 pr-1 gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl">
        <div className="flex items-center gap-2 h-12 min-w-0">
          <div
            className="w-12 h-12 rounded-full shrink-0 bg-cover bg-center bg-[#EDEDED]"
            style={{ backgroundImage: `url(${frameSocial.avatar})` }}
          />
          <span className="text-[13px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] truncate">
            {frameSocial.avatarName}
          </span>
        </div>
        <div className="flex items-start gap-0.5 shrink-0">
          <Tooltip label="Replace avatar" placement="bottom">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
            </button>
          </Tooltip>
          <Tooltip label="Remove avatar" placement="bottom">
            <button
              type="button"
              onClick={() => updateSocial({ avatar: null, avatarName: null })}
              className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F04438]/10 transition-colors"
            >
              <Trash size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A] group-hover:text-[#F04438] transition-colors" />
            </button>
          </Tooltip>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => avatarInputRef.current?.click()}
        className="w-full h-[66px] bg-white dark:bg-[#1F1F1F] border border-dashed border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-[10px] flex flex-col items-center justify-center gap-1 hover:bg-[#EAEAEA] dark:hover:bg-[#333333] transition-colors"
      >
        <UploadSimple size={16} weight="regular" className="text-[#8C8C8C] dark:text-[#9A9A9A]" />
        <span className="text-[13px] font-medium tracking-[-0.005em] text-[#8C8C8C] dark:text-[#9A9A9A]">Upload avatar</span>
      </button>
    )}
    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
    {frameSocial.platform === "tiktok" && activeSocialMode.value === "post" && (
  <ImageUploadField
    label="Sound avatar"
    value={frameSocial.soundAvatar}
    onChange={(url) => updateSocial({ soundAvatar: url })}
    uploadLabel="Upload sound avatar"
  />
)}
  </div>
)}

<div className="grid grid-cols-2 gap-x-2 gap-y-3">
  {Object.entries(activeSocialMode.fields).map(([key, [label]]) => (
    <SocialField
      key={key}
      label={label}
      full={SOCIAL_FULL_WIDTH.has(key)}
      value={frameSocial[key] ?? ""}
      onChange={(v) => updateSocial({ [key]: v })}
    />
  ))}
</div>
  </div>
)}
                </div>
              </div>
            </div>
          </div>
            );
}