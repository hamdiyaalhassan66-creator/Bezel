import { useRef } from "react";
import { UploadSimple, Trash } from "@phosphor-icons/react";
import Tooltip from "../Tooltip.jsx";
import ToolbarDropdown from "../Dropdown.jsx";
import { SOCIAL_OPTIONS, platformOf, modeOf, socialDefaults } from "../lib/social.js";
import { SEG_ON, SEG_OFF } from "./controls.jsx";
import { SOCIAL_FULL_WIDTH, SocialField, ImageUploadField } from "./SocialFields.jsx";

// Social media UI controls for the Mockup tab (same fields as the Frame tab's section).
export function SocialControls({ social, setSocial }) {
  const avatarInputRef = useRef(null);
  const update = (patch) => setSocial((prev) => ({ ...prev, ...patch }));
  const platform = platformOf(social.platform);
  const mode = modeOf(social.platform, social.mode);
  const changePlatform = (p) => update({ platform: p, mode: platformOf(p).modes[0].value, ...socialDefaults(p) });
  const changeMode = (m) => update({ mode: m, ...socialDefaults(social.platform, m) });
  const onAvatar = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) update({ avatar: URL.createObjectURL(file), avatarName: file.name });
    e.target.value = "";
  };

  return (
    <div className="fx-enter flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">Platform</label>
        <ToolbarDropdown value={social.platform} options={SOCIAL_OPTIONS} onChange={changePlatform} />
      </div>

      {platform.modes.length > 1 && (
        <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
          {platform.modes.map((m) => (
            <button
              key={m.value}
              onClick={() => changeMode(m.value)}
              className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
                mode.value === m.value ? SEG_ON : SEG_OFF
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {mode.themed && (
        <div className="flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl">
          {["light", "dark"].map((t) => (
            <button
              key={t}
              onClick={() => update({ theme: t })}
              className={`seg-tab flex-1 h-7 flex items-center justify-center gap-2 px-2.5 py-1 rounded-[14px] leading-5 capitalize transition-colors duration-200 ${
                social.theme === t ? SEG_ON : SEG_OFF
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]">
          {social.platform === "tiktok" ? "Profile picture" : "Avatar"}
        </label>
        {social.avatar ? (
          <div className="w-full h-[66px] flex items-center justify-between py-2 pl-2 pr-1 gap-2 bg-[#FAF9FA] dark:bg-[#171717] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 rounded-2xl">
            <div className="flex items-center gap-2 h-12 min-w-0">
              <div className="w-12 h-12 rounded-full shrink-0 bg-cover bg-center bg-[#EDEDED]" style={{ backgroundImage: `url(${social.avatar})` }} />
              <span className="text-[13px] font-medium leading-4 tracking-[-0.005em] text-[#3A3A3A] dark:text-[#FAF9FA] truncate">
                {social.avatarName}
              </span>
            </div>
            <div className="flex items-start gap-0.5 shrink-0">
              <Tooltip label="Replace avatar" placement="bottom">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <UploadSimple size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#3A3A3A] dark:group-hover:text-[#FAF9FA] transition-colors" />
                </button>
              </Tooltip>
              <Tooltip label="Remove avatar" placement="bottom">
                <button
                  type="button"
                  onClick={() => update({ avatar: null, avatarName: null })}
                  className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F04438]/10 transition-colors"
                >
                  <Trash size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB] group-hover:text-[#F04438] transition-colors" />
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
            <UploadSimple size={16} weight="regular" className="text-[#737373] dark:text-[#ABABAB]" />
            <span className="text-[13px] font-medium tracking-[-0.005em] text-[#737373] dark:text-[#ABABAB]">Upload avatar</span>
          </button>
        )}
        <input ref={avatarInputRef} type="file" accept="image/*" onChange={onAvatar} className="hidden" />
        {social.platform === "tiktok" && mode.value === "post" && (
          <ImageUploadField
            label="Sound avatar"
            value={social.soundAvatar}
            onChange={(url) => update({ soundAvatar: url })}
            uploadLabel="Upload sound avatar"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
        {Object.entries(mode.fields).map(([key, [label]]) => (
          <SocialField
            key={key}
            label={label}
            full={SOCIAL_FULL_WIDTH.has(key)}
            value={social[key] ?? ""}
            onChange={(v) => update({ [key]: v })}
          />
        ))}
      </div>
    </div>
  );
}