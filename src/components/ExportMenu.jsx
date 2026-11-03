import React from "react";
import { CircleNotch, UploadSimple } from "@phosphor-icons/react";
import { SEG_ON, SEG_OFF, ToggleRow } from "./controls.jsx";
import ToolbarDropdown from "../Dropdown.jsx";
import { EXPORT_FORMATS, EXPORT_SIZES, CANVAS_SIZE_OPTIONS, formatBytes } from "../constants/options.js";
import { VIDEO_FORMATS, VIDEO_RESOLUTIONS, VIDEO_SPEEDS, VIDEO_FPS_OPTIONS, estimateVideoBytes } from "../exportVideo.js";

export function ExportMenu({
  videoOn, exporting, exportProgress, exportFormat, setExportFormat, videoFormat, setVideoFormat,
  videoRes, setVideoRes, videoSpeed, setVideoSpeed, videoFps, setVideoFps,
  exportTransparent, setExportTransparent, canvasSize, setCanvasSize, exportWidth, setExportWidth,
  vidDuration, measuredBpp, exactSize, sampleKey, videoOutDims, exportDims, handleExport,
}) {
  const labelCls = "text-[13px] font-medium tracking-[0.01em] text-[#737373] dark:text-[#ABABAB]";
  const segWrap = "flex items-center p-0.5 w-full h-8 bg-[#F0F0F0] dark:bg-black rounded-2xl";
  const segBtn = (on, off = false) =>
    `seg-tab flex-1 h-7 flex items-center justify-center px-2.5 py-1 rounded-[14px] leading-5 transition-colors duration-200 ${
      on ? SEG_ON : SEG_OFF
    } ${off ? "opacity-40 cursor-not-allowed" : ""}`;

  const imgFmt = EXPORT_FORMATS.find((f) => f.value === exportFormat);
  const vidFmt = VIDEO_FORMATS.find((f) => f.value === videoFormat);
  const alphaOk = videoOn ? vidFmt.alpha : exportFormat !== "jpg";

  let dims, estimate;
  if (videoOn) {
    dims = videoOutDims();
    const fps = Math.min(videoFps, vidFmt.maxFps);
    const frames = Math.max(1, Math.round((vidDuration / videoSpeed) * fps));
    estimate = formatBytes(estimateVideoBytes(videoFormat, dims.w, dims.h, fps, frames) * (measuredBpp[`v:${videoFormat}`] ?? 1));
  } else {
    dims = exportDims(exportWidth);
    estimate = dims ? (exactSize?.key === sampleKey ? formatBytes(exactSize.bytes) : "calculating…") : null;
  }
  const size = !videoOn ? EXPORT_SIZES.find((s) => s.width === exportWidth) : null;

  const changeVideoFormat = (v) => {
    const f = VIDEO_FORMATS.find((x) => x.value === v);
    setVideoFormat(v);
    setVideoRes((r) => Math.min(r, f.maxLong));
    setVideoFps((p) => Math.min(p, f.maxFps));
  };

  return (
    <div className="pop-enter absolute right-0 mt-1 w-[340px] p-4 flex flex-col gap-4 rounded-2xl border border-[#3A3A3A]/10 dark:border-[#FAF9FA]/10 bg-[#FAF9FA] dark:bg-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)] z-10">
      <div className="flex flex-col gap-2">
        <label className={labelCls}>File type</label>
        {videoOn ? (
          <ToolbarDropdown value={videoFormat} options={VIDEO_FORMATS} onChange={changeVideoFormat} />
        ) : (
          <ToolbarDropdown value={exportFormat} options={EXPORT_FORMATS} onChange={setExportFormat} />
        )}
      </div>

      <ToggleRow
        muted
        label="Transparent background"
        checked={exportTransparent && alphaOk}
        disabled={!alphaOk || exporting}
        onChange={setExportTransparent}
      />

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Size</label>
        <ToolbarDropdown value={canvasSize} options={CANVAS_SIZE_OPTIONS} onChange={setCanvasSize} />
      </div>

      {videoOn ? (
        <>
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Resolution</label>
            <ToolbarDropdown
              value={videoRes}
              options={VIDEO_RESOLUTIONS.filter((r) => r.value <= vidFmt.maxLong)}
              onChange={setVideoRes}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Speed</label>
            <div className={segWrap}>
              {VIDEO_SPEEDS.map((sp) => (
                <button key={sp} type="button" disabled={exporting} onClick={() => setVideoSpeed(sp)} className={segBtn(videoSpeed === sp)}>
                  {sp}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Frame rate (FPS)</label>
            <div className={segWrap}>
              {VIDEO_FPS_OPTIONS.map((f) => {
                const off = f > vidFmt.maxFps;
                return (
                  <button
                    key={f}
                    type="button"
                    disabled={exporting || off}
                    onClick={() => setVideoFps(f)}
                    className={segBtn(videoFps === f, off)}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-0.5 text-[12px] font-medium text-[#737373] dark:text-[#ABABAB]">
              <span className="tabular-nums">{dims.w} × {dims.h} px · ~{estimate}</span>
              {videoFormat === "lottie" && <span>Lottie is exported as an image sequence, so files get large.</span>}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Resolution</label>
          <div className={segWrap}>
            {EXPORT_SIZES.map((opt) => (
              <button key={opt.width} type="button" disabled={exporting} onClick={() => setExportWidth(opt.width)} className={segBtn(exportWidth === opt.width)}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-0.5 text-[12px] font-medium text-[#737373] dark:text-[#ABABAB]">
            <span className="tabular-nums">
              {dims ? `${dims.w} × ${dims.h} px` : "—"}{estimate ? ` · ~${estimate}` : ""}
            </span>
            {size?.warn && <span>Large export. It can take a few seconds and the page may pause.</span>}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="w-full h-8 flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl border border-[#FCFCFC]/20 bg-[#FF47BC] text-[13px] leading-5 font-medium tracking-[0.01em] text-[#FCFCFC] enabled:hover:bg-[#F230AE] transition-[background-color,transform] duration-150 enabled:active:scale-[0.97] disabled:opacity-70 disabled:cursor-wait"
        style={{ boxShadow: "0px 4px 4px rgba(255,71,188,0.06), inset 0px 4px 4px rgba(255,240,255,0.25), inset 0px -2px 4px rgba(71,0,45,0.25)" }}
      >
        {exporting ? (
          <>
            <CircleNotch size={14} weight="regular" className="animate-spin" />
            {exportProgress != null ? `Exporting ${Math.round(exportProgress * 100)}%` : "Exporting…"}
          </>
        ) : (
          <><UploadSimple size={14} weight="regular" /> {videoOn ? "Export video" : "Export image"}</>
        )}
      </button>
    </div>
  );
}