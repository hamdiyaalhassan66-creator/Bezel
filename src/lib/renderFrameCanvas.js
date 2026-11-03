import { paintPhoneChrome, paintTextItem } from "../MockupScene.jsx";
import { chromeOps, sampleChromeColors, paintSocial } from "../components/SocialOverlay.jsx";
import { socialOps } from "./social.js";
import {
  isDefaultCamera, getFrameCamera, drawWarped, paintSheen, isFrameBackFacing, makeCanvasGradient,
} from "./frameUtils.js";
import { cornersOf, frameRect } from "./frameModel.js";
import { featherOf, isClipped } from "./frameKeys.js";
import { frameDim } from "./frameFade.js";
import { planeBackFacing, sortByDepth, projectPlane, drawPlane3D, planeGrid } from "./plane3d.js";
import { prepText } from "./textUtils.js";
import { drawNoise, makeGrainTile } from "./noise.js";
import { paintChromatic } from "./chromatic.js";
import { applyProgressiveBlur } from "./progressiveBlur.js";
import { applyFishEye, paintGlassBands, paintVignette } from "./canvasFx.js";
import { isShadowFx } from "./sharedEffects.js";
import { vidClamp } from "./videoMath.js";
import { depthTintOf } from "./appConstants.js";

// ov (video export only): { cam, pose, texts, bg } for the frame being rendered
export async function renderFrameCanvas(S, width, transparent = false, height = null, ov = null) {
  const {
    frameSizeRef, exportImgCacheRef, frames, textItems, tabKey, environment, frameCam,
    videoOn, videoFrameAt, vidTimeRef,
    bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientStops, gradientOpacity,
    grainAmount, grainType, customBgImageUrl, gradFxOn, gradientFx,
    renderGradientFxCanvas, hexToRgba,
  } = S;

    const size = ov?.size ?? frameSizeRef.current;
    if (!size) return null;
    const outW = width;
    const outH = height ?? Math.round(width * (size.h / size.w));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";

    const loadImg = (src) => {
      const hit = exportImgCacheRef.current.get(src);
      if (hit) return hit;
      const p = new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => (img.decode ? img.decode().catch(() => {}).then(() => resolve(img)) : resolve(img));
        img.onerror = reject;
        img.src = src;
      });
      p.catch(() => exportImgCacheRef.current.delete(src));
      exportImgCacheRef.current.set(src, p);
      return p;
    };
    const drawCover = (img, x, y, w, h, target = ctx) => {
      const iw = img.naturalWidth || img.videoWidth, ih = img.naturalHeight || img.videoHeight;
      const s = Math.max(w / iw, h / ih);
      const dw = iw * s;
      const dh = ih * s;
      target.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    };

    try {
      await Promise.all([400, 500, 600, 700].map((wt) => document.fonts.load(`${wt} 16px "TikTok Sans"`)));
      // Background. A video export passes the clip that is playing at this frame
      const liveBg = { bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientStops, gradientOpacity, grainAmount, customBgImageUrl };
      {
      const { bgType, bgHex, bgOpacity, gradientType, gradientAngle, gradientStops, gradientOpacity, grainAmount, customBgImageUrl } = ov?.bg?.snap ?? liveBg;
      const cx = outW / 2;
      const cy = outH / 2;
      if (transparent) {
        // leave the canvas clear
      } else if (ov?.bg?.canvas) {
        ctx.drawImage(ov.bg.canvas, 0, 0, outW, outH);
      } else if (bgType === "solid") {
        ctx.fillStyle = hexToRgba(bgHex, bgOpacity);
        ctx.fillRect(0, 0, outW, outH);
      } else if (
        (bgType === "gradient" || bgType === "custom") &&
        (ov?.bg?.snap
          ? (bgType === "gradient" || !!customBgImageUrl) &&
            (gradientFx.some((f) => f.visible) || (grainAmount > 0 && (bgType === "custom" || grainType !== "noise")))
          : gradFxOn)
      ) {
        // filters run at up to 2560px wide, then scale to the export size
        const FW = Math.min(outW, 2560), FH = Math.max(2, Math.round((FW * outH) / outW));
        // video export: render the filters once and reuse them for every frame
        const ck = ov?.bg?.snap ? bgKey(ov.bg.snap) : "live"; // one cached canvas per background clip
        let fxc = ov?.fxCache?.canvas;
        if (!fxc || fxc.width !== FW || fxc.height !== FH || ov?.fxCache?.key !== ck) {
          fxc = renderGradientFxCanvas(FW, FH, FW / size.w, ov?.bg?.snap ?? null);
          if (ov?.fxCache) { ov.fxCache.canvas = fxc; ov.fxCache.key = ck; }
        }
        ctx.drawImage(fxc, 0, 0, outW, outH);
      } else if (bgType === "gradient") {
        let g;
        if (gradientType === "Radial") {
          g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(outW, outH) / 2);
        } else if (gradientType === "Angular" || gradientType === "Diamond") {
          const from = (gradientType === "Diamond" ? gradientAngle + 45 : gradientAngle) - 90;
          g = ctx.createConicGradient((from * Math.PI) / 180, cx, cy);
        } else {
          const rad = (gradientAngle * Math.PI) / 180;
          const dx = Math.sin(rad);
          const dy = -Math.cos(rad);
          const len = Math.abs(outW * dx) + Math.abs(outH * dy);
          g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
        }
        [...gradientStops]
          .sort((a, b) => a.position - b.position)
          .forEach((s) => g.addColorStop(Math.min(1, Math.max(0, s.position / 100)), hexToRgba(s.hex, s.opacity)));
        ctx.globalAlpha = gradientOpacity / 100;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, outW, outH);
        ctx.globalAlpha = 1;
        if (grainAmount > 0) {
          const gk = outW / size.w; // scale the tile so grain matches the on-screen size
          ctx.save();
          ctx.scale(gk, gk);
          ctx.globalCompositeOperation = "overlay";
          ctx.fillStyle = ctx.createPattern(makeGrainTile(512, grainAmount), "repeat");
          ctx.fillRect(0, 0, size.w, size.h);
          ctx.restore();
        }
      } else if (bgType === "custom" && customBgImageUrl) {
        const bgImg = await loadImg(customBgImageUrl).catch(() => null);
        if (bgImg) drawCover(bgImg, 0, 0, outW, outH);
        else {
          ctx.fillStyle = "#808080"; // image failed to load: still draw the frames
          ctx.fillRect(0, 0, outW, outH);
        }
      }
      }

      const cam = ov?.cam ?? frameCam;
      const backFacing = isFrameBackFacing(cam);
      const k = outW / size.w;
      const FAR = outW * 3;

      // video export passes texts that already have their animation applied
      const textLayers = ov?.texts ?? textItems.filter((t) => t.mode === tabKey && t.visible !== false && t.content);
      const prep = (t) => (ov?.texts ? t : prepText(t, size));
      textLayers.filter((t) => t.layer === "behind").forEach((t) => paintTextItem(ctx, prep(t), outW, outH, k));

      // Each frame is drawn on `layer` (so its stroke/clip stay clean), then composited onto `comp`
      // with its shadows and blur. `comp` is one plane, so the camera warps all frames together.
      const frameList = ov?.frames ?? frames;

      // With a camera applied, the flat comp is warped afterwards, so it must cover everything that
      // can come into view (frames bleeding off the edges, shadows, blur), not just the canvas rect.
      let padL = 0, padT = 0, padR = 0, padB = 0;
      if (!isDefaultCamera(cam)) {
        let minX = 0, minY = 0, maxX = outW, maxY = outH;
        frameList.forEach((fr) => {
          const r = frameRect(fr, { w: outW, h: outH });
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const half = fr.r ? Math.hypot(r.width, r.height) / 2 : null; // rotated: use the circumscribed circle
          const hw = half ?? r.width / 2, hh = half ?? r.height / 2;
          const fx = Math.max(0, ...fr.effects.filter((e) => e.visible && isShadowFx(e)).map((e) => (Math.abs(e.x) + e.blur * 2 + Math.abs(e.spread)) * k));
          const fy = Math.max(0, ...fr.effects.filter((e) => e.visible && isShadowFx(e)).map((e) => (Math.abs(e.y) + e.blur * 2 + Math.abs(e.spread)) * k));
          const fb = fr.effects.filter((e) => e.visible && e.type === "layerBlur").reduce((s, e) => s + e.blur, 0) * k * 3;
          minX = Math.min(minX, cx - hw - fx - fb);
          maxX = Math.max(maxX, cx + hw + fx + fb);
          minY = Math.min(minY, cy - hh - fy - fb);
          maxY = Math.max(maxY, cy + hh + fy + fb);
        });
        padL = Math.ceil(-minX); padT = Math.ceil(-minY);
        padR = Math.ceil(maxX - outW); padB = Math.ceil(maxY - outH);
        // keep memory sane on very large exports
        const MAX_PX = 120e6;
        const area = (outW + padL + padR) * (outH + padT + padB);
        if (area > MAX_PX) {
          const s = Math.sqrt(MAX_PX / area);
          padL = Math.floor(padL * s); padT = Math.floor(padT * s);
          padR = Math.floor(padR * s); padB = Math.floor(padB * s);
        }
      }
      const compW = outW + padL + padR, compH = outH + padT + padB;

      const layer = document.createElement("canvas");
      layer.width = compW;
      layer.height = compH;
      const lctx = layer.getContext("2d");
      lctx.imageSmoothingQuality = "high";
      lctx.translate(padL, padT);
      const comp = document.createElement("canvas");
      comp.width = compW;
      comp.height = compH;
      const cctx = comp.getContext("2d");
      cctx.imageSmoothingQuality = "high";
      cctx.translate(padL, padT);

      for (const fr of sortByDepth(frameList)) {
        const fp = ov?.framePoses?.[fr.id];
        if (fp === "hidden" || fr.hidden) continue; // outside its row, or switched off with the eye
        if (fr.rig?.hide && planeBackFacing(fr, { w: outW, h: outH })) continue;
        const { left: sx, top: sy, width: sw, height: sh } = frameRect(fr, { w: outW, h: outH });
        const rs = cornersOf(fr).map((p) => Math.min((Math.min(outW, outH) * p) / 100, Math.min(sw, sh) / 2)); // [tl, tr, br, bl]
        const srcUrl = fr.img ? (fr.img.cropUrl ?? fr.img.url) : null;
        const srcImg =
          backFacing || !srcUrl
            ? null
            : fr.img?.video && videoOn
            ? await videoFrameAt(fr.img.video.url, ov?.t ?? vidTimeRef.current)
            : await loadImg(srcUrl);

        lctx.clearRect(-padL, -padT, compW, compH);
        lctx.save();
        lctx.beginPath();
        lctx.roundRect(sx, sy, sw, sh, rs);
        lctx.clip();
        if (isClipped(fr)) {
          const cw = sw * (1 - (fr.cl ?? 0) - (fr.cr ?? 0)), ch = sh * (1 - (fr.ct ?? 0) - (fr.cb ?? 0));
          const uniform = fr.cl === fr.ct && fr.ct === fr.cr && fr.cr === fr.cb; // zoom crop: round it. A one-sided slide cut stays square
          lctx.beginPath();
          lctx.roundRect(sx + sw * (fr.cl ?? 0), sy + sh * (fr.ct ?? 0), cw, ch, uniform ? rs.map((v) => Math.min(v, cw / 2, ch / 2)) : 0);
          lctx.clip();
        }
        if (backFacing) {
          lctx.save();
          lctx.translate(2 * sx + sw, 0);
          lctx.scale(-1, 1); // mirrored here, mirrored again by the warp, so it reads as authored
          if (fr.backType === "solid") {
            lctx.fillStyle = hexToRgba(fr.backHex, fr.backOpacity);
          } else {
            lctx.globalAlpha = fr.backGradientOpacity / 100;
            lctx.fillStyle = makeCanvasGradient(lctx, fr.backGradientType, fr.backGradientAngle, fr.backStops, sx, sy, sw, sh);
          }
          lctx.fillRect(sx, sy, sw, sh);
          lctx.restore();
        } else if (fr.social?.on) {
          lctx.fillStyle = "#000";
          lctx.fillRect(sx, sy, sw, sh);
        } else if (srcImg) {
          lctx.save();
          if (fr.flipX || fr.flipY) {
            lctx.translate(sx + sw / 2, sy + sh / 2);
            lctx.scale(fr.flipX ? -1 : 1, fr.flipY ? -1 : 1);
            lctx.translate(-(sx + sw / 2), -(sy + sh / 2));
          }
          drawCover(srcImg, sx, sy, sw, sh, lctx);
          lctx.restore();
          const ca = fr.effects.find((e) => e.visible && e.type === "chromatic" && e.amount > 0);
          if (ca && !fr.img?.video) {
            const rad = ((ca.angle ?? 0) * Math.PI) / 180;
            paintChromatic(lctx, padL, padT, sx, sy, sw, sh, Math.cos(rad) * ca.amount * k, Math.sin(rad) * ca.amount * k);
          }
        } else {
          const ph = await loadImg(`${import.meta.env.BASE_URL}mockup-defaults/frame.png`).catch(() => null);
          if (ph) drawCover(ph, sx, sy, sw, sh, lctx);
          else {
            lctx.fillStyle = "#808080";
            lctx.fillRect(sx, sy, sw, sh);
          }
        }
        if (fr.social?.on && !backFacing) {
          const sops = socialOps({ ...fr.social, media: srcUrl }, sw, sh);
          const imgs = new Map();
          for (const src of new Set(sops.filter((o) => (o.t === "image" || o.t === "media") && o.src).map((o) => o.src))) {
            const im = await loadImg(src).catch(() => null);
            if (im) imgs.set(src, im);
          }
          paintSocial(lctx, sops, sx, sy, imgs);
        }
if (!backFacing && (fr.statusBar || fr.homeIndicator || fr.browser?.on)) {
  const auto = srcImg ? sampleChromeColors(srcImg, fr.w, fr.h) : null;
  const cop = chromeOps(fr, sw, sh, auto)[0];
  lctx.save();
  lctx.translate(sx, sy);
  paintPhoneChrome(lctx, sw, sh, cop);
  lctx.restore();
}
        fr.effects
          .filter((e) => e.visible && e.type === "noise")
          .forEach((e) => drawNoise(lctx, sx, sy, sw, sh, e.amount, Math.max(1, ((1 + e.size * 0.5) / 1.4) * k)));
        paintSheen(lctx, sx, sy, sw, sh, environment, cam.rotationX, cam.rotationY);
        const dim = frameDim(fr, { w: outW, h: outH }); // a tint toward the background, the frame stays opaque
        const shade = Math.min(1, (fr.sh || 0) + dim);
        if (shade > 0) {
          lctx.save();
          lctx.globalAlpha = shade;
          lctx.fillStyle = fr.tint === "bg" || dim > 0 ? depthTintOf(ov?.bg?.snap ?? liveBg) : "#000";
          lctx.fillRect(sx, sy, sw, sh);
          lctx.restore();
        }
        lctx.restore();

        // Stroke: inside / center / outside are the same path offset by half the weight.
        const st = fr.stroke;
        if (st.on && st.width > 0) {
          const w = st.width * k;
          // inside / outside strokes share their edge with the image, so widen them by ~1px to cover its antialiased fringe
          const bleed = st.position !== "center" && st.opacity >= 100 ? Math.min(1, w) : 0;
          const sign = st.position === "inside" ? -1 : st.position === "outside" ? 1 : 0;
          const off = (sign * (w - bleed)) / 2;
          lctx.beginPath();
          lctx.roundRect(sx - off, sy - off, sw + off * 2, sh + off * 2, rs.map((v) => Math.max(0, v + off)));
          lctx.lineWidth = w + bleed;
          lctx.strokeStyle = hexToRgba(st.hex, st.opacity);
          lctx.stroke();
        }

        const fe = featherOf(fr);
        if (fe) {
          const gr = lctx.createLinearGradient(sx + sw * fe.p0[0], sy + sh * fe.p0[1], sx + sw * fe.p1[0], sy + sh * fe.p1[1]);
          (fe.stops ?? [[0, 1], [1, 0]]).forEach(([p, a]) => gr.addColorStop(p, `rgba(0,0,0,${a})`));
          lctx.save();
          lctx.globalCompositeOperation = "destination-in";
          lctx.fillStyle = gr;
          lctx.fillRect(-padL, -padT, compW, compH);
          lctx.restore();
        }
        const rot = ((fr.r ?? 0) * Math.PI) / 180;
        const rcos = Math.cos(rot), rsin = Math.sin(rot);
        const rcx = sx + sw / 2, rcy = sy + sh / 2;
        cctx.save();
        cctx.globalAlpha = 1;
        if (fp) {
          // this frame's own enter / exit pose
          const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = fp;
          cctx.globalAlpha = vidClamp(a, 0, 1);
          cctx.translate(x * outW, -y * outH);
          cctx.translate(rcx, rcy);
          cctx.scale(Math.max(0.001, Math.abs(s * Math.cos(ry))), Math.max(0.001, Math.abs(s * Math.cos(rx))));
          cctx.translate(-rcx, -rcy);
        }
        if (fr.rig) {
          const rr = { left: sx, top: sy, width: sw, height: sh };
          const bx = { w: outW, h: outH };
          const proj = (u, v) => projectPlane(fr, rr, bx, u, v);
          const poly = [proj(0, 0), proj(1, 0), proj(1, 1), proj(0, 1)];
          fr.effects
            .filter((e) => e.visible && isShadowFx(e))
            .forEach((e) => {
              cctx.save();
              cctx.shadowColor = hexToRgba(e.hex, e.opacity);
              cctx.shadowBlur = e.blur * k;
              cctx.shadowOffsetX = e.x * k + FAR;
              cctx.shadowOffsetY = e.y * k;
              cctx.fillStyle = "#000";
              cctx.beginPath();
              poly.forEach(([px, py], n) => (n ? cctx.lineTo(px - FAR, py) : cctx.moveTo(px - FAR, py)));
              cctx.closePath();
              cctx.fill();
              cctx.restore();
            });
          drawPlane3D(cctx, layer, { x: sx + padL, y: sy + padT, w: sw, h: sh }, proj, ...planeGrid(fr));
          cctx.restore();
          continue;
        }
        fr.effects
          .filter((e) => e.visible && isShadowFx(e))
          .forEach((e) => {
            const sp = e.spread * k;
            cctx.save();
            cctx.shadowColor = hexToRgba(e.hex, e.opacity);
            cctx.shadowBlur = e.blur * k;
            // shadow offset rotates with the frame, like CSS box-shadow
            cctx.shadowOffsetX = (e.x * rcos - e.y * rsin) * k + FAR;
            cctx.shadowOffsetY = (e.x * rsin + e.y * rcos) * k;
            cctx.translate(rcx - FAR, rcy);
            cctx.rotate(rot);
            cctx.translate(-(rcx - FAR), -rcy);
            cctx.fillStyle = "#000";
            cctx.beginPath();
            cctx.roundRect(sx - FAR - sp, sy - sp, Math.max(0, sw + sp * 2), Math.max(0, sh + sp * 2), rs.map((v) => Math.max(0, v + sp)));
            cctx.fill();
            cctx.restore();
          });
        cctx.translate(rcx, rcy);
        cctx.rotate(rot);
        cctx.translate(-rcx, -rcy);
        cctx.drawImage(layer, -padL, -padT);
        cctx.restore();
      }

      // progressive blur covers the whole canvas and is applied once to all frames together
      const isPb = (e) => e.visible && e.type === "layerBlur" && e.mode === "progressive" && (e.blur > 0 || (e.startBlur ?? 0) > 0);
      const pbFrame = frameList.find((fr) => !fr.hidden && fr.effects.some(isPb));
      (pbFrame?.effects ?? []).filter(isPb).forEach((fx) =>
        applyProgressiveBlur(comp, fx, k, { left: padL, top: padT, width: outW, height: outH })
      );

      // uniform layer blur: one blur over all frames together
      const isUb = (e) => e.visible && e.type === "layerBlur" && e.mode !== "progressive" && e.blur > 0;
      const ubFrame = frameList.find((fr) => !fr.hidden && fr.effects.some(isUb));
      const ubBlur = ubFrame ? ubFrame.effects.filter(isUb).reduce((s, e) => s + e.blur, 0) * k : 0;
      if (ubBlur > 0) {
        const tmp = document.createElement("canvas");
        tmp.width = comp.width;
        tmp.height = comp.height;
        const t = tmp.getContext("2d");
        t.filter = `blur(${ubBlur}px)`;
        t.drawImage(comp, 0, 0);
        const c2 = comp.getContext("2d");
        c2.save();
        c2.setTransform(1, 0, 0, 1, 0, 0);
        c2.clearRect(0, 0, comp.width, comp.height);
        c2.drawImage(tmp, 0, 0);
        c2.restore();
      }

      // canvas-wide effects come from the first visible frame that has them (like progressive blur above)
      const canvasFx = (type) => {
        for (const fr of frameList) {
          if (fr.hidden) continue;
          const e = fr.effects.find((x) => x.visible && x.type === type);
          if (e) return e;
        }
        return null;
      };
      const canvasRect = { left: padL, top: padT, width: outW, height: outH };
      const fish = canvasFx("fishEye");
      if (fish && fish.amount > 0) applyFishEye(comp, fish.amount, canvasRect);

      let deviceLayer = comp;
      if (!isDefaultCamera(cam)) {
        deviceLayer = document.createElement("canvas");
        deviceLayer.width = outW;
        deviceLayer.height = outH;
        drawWarped(
          deviceLayer.getContext("2d"), comp, getFrameCamera(cam, outH), outW, outH, 24,
          { x: -padL, y: -padT, w: compW, h: compH }
        );
      }
      ctx.save();
      if (ov?.pose) {
        const { a = 1, x = 0, y = 0, s = 1, rx = 0, ry = 0 } = ov.pose;
        ctx.globalAlpha = vidClamp(a, 0, 1);
        ctx.translate(outW / 2 + x * outW, outH / 2 - y * outH);
        ctx.scale(Math.max(0.02, Math.abs(s * Math.cos(ry))), Math.max(0.02, Math.abs(s * Math.cos(rx))));
        ctx.translate(-outW / 2, -outH / 2);
      }
      ctx.drawImage(deviceLayer, 0, 0);
      ctx.restore();

      const glass = canvasFx("liquidGlass");
      if (glass && !ov?.framesOnly) paintGlassBands(ctx, outW, outH, glass, k);

      const vig = canvasFx("vignette");
      if (vig && vig.amount > 0 && !ov?.framesOnly) paintVignette(ctx, outW, outH, vig);

      textLayers.filter((t) => t.layer === "front").forEach((t) => paintTextItem(ctx, prep(t), outW, outH, k));

      return canvas;
    } catch (err) {
      console.error("Frame render failed:", err);
      return null;
    }
}