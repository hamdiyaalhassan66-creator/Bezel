import { backFillOf } from "../lib/frameModel.js";
import { DIM_TRANSITION } from "../lib/frameFade.js";

// Curved surface for a 3D plane: a row (or column) of thin strips on the arc, each turned to the tangent.
// Limits: image / placeholder / back fill, shade and corner radii only. No video, social UI, status bar or chromatic.
export function CurvedPlane({ f, r, short, radiiFrac, imgUrl, backVisible, zIndex, transform, ap, dim = 0, playing }) {
  const { axis, radius } = f.rig.curve;
  const horiz = axis === "y";
  const Rc = Math.max(1, radius * short);
  const len = horiz ? r.width : r.height;
  const n = Math.min(64, Math.max(12, Math.round(len / 10)));
  const sl = len / n;
  const fs = Math.min(r.width, r.height);
  const [tl, tr, br, bl] = radiiFrac.map((p) => p * fs);
  const fill = backVisible ? backFillOf(f) : null;
  const shade = 1 - (1 - (f.sh || 0)) * (1 - dim); // existing 3D shade + fade dim

  return (
    <div
      data-frame-id={f.id}
      style={{
        position: "absolute",
        display: f.hidden ? "none" : undefined,
        left: r.left, top: r.top, width: r.width, height: r.height,
        transform, transformStyle: "preserve-3d", zIndex,
      }}
    >
      {Array.from({ length: n }, (_, i) => {
        const c = (i + 0.5) * sl - len / 2; // strip center along the bend axis
        const th = Math.max(-Math.PI, Math.min(Math.PI, c / Rc));
        const deg = (th * 180) / Math.PI;
        const pos = Rc * Math.sin(th) - c; // how far the strip slides along the axis
        const sg = f.rig.curve.inward ? -1 : 1;
        const z = sg * Rc * (Math.cos(th) - 1);
        const first = i === 0, last = i === n - 1;
        const ov = 1.5; // each strip overlaps its neighbours by this much, which hides the seams
        const a = Math.max(0, i * sl - ov), b = Math.min(len, (i + 1) * sl + ov);
        const start = a, wid = b - a; // the first and last strips stay inside the plane
        const radii = horiz
          ? `${first ? tl : 0}px ${last ? tr : 0}px ${last ? br : 0}px ${first ? bl : 0}px`
          : `${first ? tl : 0}px ${first ? tr : 0}px ${last ? br : 0}px ${last ? bl : 0}px`;
        // the full-size face, shifted so each strip shows its own slice
        const off = horiz ? { left: -start, top: 0 } : { left: 0, top: -start };
        const face = { position: "absolute", width: r.width, height: r.height, ...off };
        return (
          <div
            key={i}
            className="absolute overflow-hidden pointer-events-auto"
            style={{
              ...(horiz ? { left: start, top: 0, width: wid, height: r.height } : { left: 0, top: start, width: r.width, height: wid }),
              borderRadius: radii,
              transform: horiz ? `translate3d(${pos}px, 0, ${z}px) rotateY(${sg * deg}deg)` : `translate3d(0, ${pos}px, ${z}px) rotateX(${-sg * deg}deg)`,
              backfaceVisibility: f.rig.hide ? "hidden" : undefined,
            }}
          >
            {fill ? (
              <div style={{ ...face, background: fill }} />
            ) : imgUrl ? (
              <img src={imgUrl} alt="" draggable={false} className="select-none pointer-events-none" style={{ ...face, maxWidth: "none", objectFit: "cover" }} />
            ) : (
              <div
                className="keep-size flex items-center justify-center text-center text-[#FAF9FA] font-semibold select-none"
                style={{
                  ...face,
                  background: "linear-gradient(180deg, #FFFFFF 0%, #FF47BC 100%)",
                  fontSize: Math.max(11, r.width * 0.05),
                  lineHeight: 1.3,
                }}
              >
                <span style={{ maxWidth: "45%" }}>Drop your image here</span>
              </div>
            )}
            {ap?.noise.map((n) => (
              <div key={n.id} className="absolute pointer-events-none" style={{ ...face, backgroundImage: n.url, opacity: n.opacity, mixBlendMode: "overlay" }} />
            ))}
            {ap?.sheen && <div className="absolute pointer-events-none" style={{ ...face, backgroundImage: ap.sheen }} />}
            {ap?.insetStroke && (
              <div className="absolute pointer-events-none" style={{ ...face, borderRadius: `${tl}px ${tr}px ${br}px ${bl}px`, boxShadow: ap.insetStroke }} />
            )}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none bg-black"
              style={{ opacity: shade, transition: playing ? "none" : DIM_TRANSITION }}
            />
          </div>
        );
      })}
    </div>
  );
}