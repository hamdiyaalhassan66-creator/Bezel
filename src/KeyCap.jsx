export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export const KEY_LABELS = {
  mod: IS_MAC ? "⌘" : "Ctrl",
  shift: IS_MAC ? "⇧" : "Shift",
  alt: IS_MAC ? "⌥" : "Alt",
};

export function KeyCap({ children }) {
  return (
    <kbd className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md bg-[#EDEDED] dark:bg-[#292929] border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 font-sans text-[12px] leading-none font-medium text-[#3A3A3A] dark:text-[#FAF9FA]">
      {KEY_LABELS[children] ?? children}
    </kbd>
  );
}