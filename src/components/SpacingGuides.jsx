import { GUIDE } from "../lib/appConstants.js";

// k = export px per canvas px, so the labels match the Alt measure and the Gap scrubber
export function SpacingGuides({ guides, k = 1 }) {
  if (!guides?.length) return null;
  return (
    <div aria-hidden className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
      {guides.map((g, i) => {
        const horiz = g.axis === "h";
        const len = horiz ? g.x2 - g.x1 : g.y2 - g.y1;
        return (
          <div
            key={i}
            className="absolute"
            style={{ left: Math.min(g.x1, g.x2), top: Math.min(g.y1, g.y2), width: horiz ? len : 1, height: horiz ? 1 : len }}
          >
            <div className="absolute inset-0" style={{ background: GUIDE }} />
            <div className="absolute" style={{ background: GUIDE, ...(horiz ? { left: 0, top: -3, width: 1, height: 7 } : { top: 0, left: -3, height: 1, width: 7 }) }} />
            <div className="absolute" style={{ background: GUIDE, ...(horiz ? { right: 0, top: -3, width: 1, height: 7 } : { bottom: 0, left: -3, height: 1, width: 7 }) }} />
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center h-4 px-1 rounded-[4px] text-[10px] leading-4 font-medium tabular-nums text-[#FAF9FA] whitespace-nowrap"
              style={{ background: GUIDE }}
            >
              {Math.round(g.value * k)}
            </span>
          </div>
        );
      })}
    </div>
  );
}