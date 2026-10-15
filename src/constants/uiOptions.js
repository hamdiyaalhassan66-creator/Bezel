import { Desktop, Sun, Moon } from "@phosphor-icons/react";
import { PRESETS } from "../MockupScene.jsx";

export const LIGHTING_OPTIONS = Object.keys(PRESETS).map((key) => ({ value: key, label: PRESETS[key].label }));

export const THEME_OPTIONS = [
  { value: "system", label: "System", Icon: Desktop },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export const BROWSER_OPTIONS = [
  { value: "safari", label: "Safari" },
  { value: "chrome", label: "Google Chrome" },
  { value: "arc", label: "Arc" },
  { value: "edge", label: "Microsoft Edge" },
];

export const SAFARI_TABS_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
];

export const ENVIRONMENT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "studio", label: "Studio" },
  { value: "city", label: "City" },
  { value: "forest", label: "Forest" },
  { value: "clouds", label: "Clouds" },
];