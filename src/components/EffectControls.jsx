import { Scrubber, ColorOpacityField } from "./controls.jsx";
import { SHARED_FX } from "../lib/sharedEffects.js";

// Popup controls for any shared effect. Used by both the Frame and the Animation effect popups.
export function EffectControls({ type, value, onChange, onSwatch, colorTarget, makePercentDrag }) {
  const def = SHARED_FX[type];
  if (!def) return null;
  return (
    <>
      {def.fields.map((f) =>
        f.color ? (
          <ColorOpacityField
            key="color"
            hex={value.hex}
            opacity={value.opacity}
            onHexChange={(hex) => onChange({ hex })}
            onOpacityChange={(opacity) => onChange({ opacity })}
            onSwatchClick={() => onSwatch(colorTarget)}
            makePercentDrag={makePercentDrag}
          />
        ) : (
          <Scrubber key={f.key} label={f.label} value={value[f.key]} min={f.min} max={f.max} onChange={(v) => onChange({ [f.key]: v })} />
        )
      )}
    </>
  );
}