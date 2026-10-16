import {
  AlignLeftSimple, AlignCenterHorizontalSimple, AlignRightSimple,
  AlignTopSimple, AlignCenterVerticalSimple, AlignBottomSimple,
} from "@phosphor-icons/react";
import { ALT } from "../ShortcutsModal.jsx";

export const ALIGN_ACTIONS = [
  { key: "left", label: "Align left", Icon: AlignLeftSimple, shortcut: [ALT, "A"] },
  { key: "hcenter", label: "Align horizontal centers", Icon: AlignCenterHorizontalSimple, shortcut: [ALT, "H"] },
  { key: "right", label: "Align right", Icon: AlignRightSimple, shortcut: [ALT, "D"] },
  { key: "top", label: "Align top", Icon: AlignTopSimple, shortcut: [ALT, "W"] },
  { key: "vcenter", label: "Align vertical centers", Icon: AlignCenterVerticalSimple, shortcut: [ALT, "V"] },
  { key: "bottom", label: "Align bottom", Icon: AlignBottomSimple, shortcut: [ALT, "S"] },
];

// Matched on e.code, because Option on Mac types special characters instead of letters.
export const ALIGN_KEYS = { KeyA: "left", KeyD: "right", KeyW: "top", KeyS: "bottom", KeyH: "hcenter", KeyV: "vcenter" };

export const RESIZE_HANDLES = [
  ["nw", 0, 0, "nwse-resize"], ["n", 50, 0, "ns-resize"], ["ne", 100, 0, "nesw-resize"], ["e", 100, 50, "ew-resize"],
  ["se", 100, 100, "nwse-resize"], ["s", 50, 100, "ns-resize"], ["sw", 0, 100, "nesw-resize"], ["w", 0, 50, "ew-resize"],
];