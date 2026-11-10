// Magic Animate exports: WebM video (canvas render loop + captureStream + MediaRecorder) and animated GIF
// (our own encoder in gif.js). Both draw every frame with the same renderer as PNG export.
import { drawPage, loadImages, ensureFonts } from "./canvas.js";
import { pageDuration, frameTimes } from "./animate.js";
import { presetPx } from "./presets.js";
import { encodeGif, buildPalette } from "./gif.js";
import { addWebmDuration } from "./webm.js";

const sizeFor = (design, maxSide) => { const { w, h } = presetPx(design.preset); const k = Math.min(1, maxSide / Math.max(w, h)); return { k, cw: Math.round(w * k / 2) * 2, ch: Math.round(h * k / 2) * 2 }; };
export function webmSupported() { return typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function"; }
function pickMime() {
  for (const m of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) if (MediaRecorder.isTypeSupported?.(m)) return m;
  return "video/webm";
}

/**
 * Records page `index` as a WebM video in real time. opts: { fps, maxSide, onProgress(0..1), env }.
 * Returns { blob, duration (s), width, height }.
 */
export async function recordWebm(design, index, { fps = 30, maxSide = 1080, onProgress, env = {} } = {}) {
  if (!webmSupported()) throw new Error("This browser can't record video. Try Chrome, Edge or Firefox, or save a GIF instead.");
  const pg = design.pages[index];
  const duration = pageDuration(pg);
  const images = await loadImages(design, [index]);
  await ensureFonts(design);
  const { k, cw, ch } = sizeFor(design, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  // Kept in the page (invisible) so every browser keeps painting it while recording.
  Object.assign(canvas.style, { position: "fixed", left: "0", top: "0", width: "2px", height: "2px", opacity: "0.01", pointerEvents: "none", zIndex: "-1" });
  document.body.append(canvas);
  // Opaque: Chrome records a canvas without alpha on its fast path; with alpha it drops most frames.
  const ctx = canvas.getContext("2d", { alpha: false });
  const paint = (t) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch); drawPage(ctx, design, index, { scale: k, images, time: t, chartPrims: env.chartPrims, tablePrims: env.tablePrims }); };
  paint(0);
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((res) => { rec.onstop = res; });
  rec.start(250);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      paint(Math.min(t, duration));
      // Some browsers only send a frame when asked.
      stream.getVideoTracks()[0]?.requestFrame?.();
      onProgress?.(Math.min(1, t / duration));
      if (t < duration + 0.15) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
  await finishRecording(rec);
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  canvas.remove();
  const raw = new Blob(chunks, { type: "video/webm" });
  // MediaRecorder leaves the duration out; put it in so players show the right length.
  const fixed = addWebmDuration(new Uint8Array(await raw.arrayBuffer()), (duration + 0.15) * 1000);
  return { blob: new Blob([fixed], { type: "video/webm" }), duration, width: cw, height: ch };
}

/**
 * Stops a MediaRecorder without losing the end: Chrome's stop() throws away frames still being encoded, so pause,
 * keep asking for the data written so far until nothing new comes (0.7 s, at most 8 s), then stop.
 */
async function finishRecording(rec, { settleMs = 700, maxMs = 8000 } = {}) {
  if (!rec || rec.state === "inactive") return;
  if (rec.state === "recording") { try { rec.pause(); } catch {} }
  let bytes = 0, seen = -1;
  const onData = (e) => { bytes += e.data?.size || 0; };
  rec.addEventListener("dataavailable", onData);
  try {
    const t0 = performance.now();
    let quietSince = t0;
    while (rec.state === "paused" && performance.now() - t0 < maxMs) {
      const got = new Promise((res) => { const f = () => { rec.removeEventListener("dataavailable", f); res(); }; rec.addEventListener("dataavailable", f); setTimeout(f, 1000); });
      try { rec.requestData(); } catch { break; }
      await got;
      const now = performance.now();
      if (bytes !== seen) { seen = bytes; quietSince = now; } else if (now - quietSince >= settleMs) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  } finally { rec.removeEventListener("dataavailable", onData); }
  if (rec.state !== "inactive") rec.stop();
}

/** Renders page `index` as an animated GIF. opts: { fps, maxSide, onProgress, env }. Returns { blob, frames, width, height }. */
export async function renderGif(design, index, { fps = 12, maxSide = 480, onProgress, env = {} } = {}) {
  const pg = design.pages[index];
  const duration = pageDuration(pg);
  const images = await loadImages(design, [index]);
  await ensureFonts(design);
  const { k, cw, ch } = sizeFor(design, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const times = frameTimes(duration, fps);
  const frames = [];
  for (const [i, t] of times.entries()) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch);
    drawPage(ctx, design, index, { scale: k, images, time: t, chartPrims: env.chartPrims, tablePrims: env.tablePrims });
    frames.push({ data: ctx.getImageData(0, 0, cw, ch).data, delay: 1000 / fps });
    onProgress?.((i + 1) / times.length * 0.5);
    if (i % 4 === 3) await new Promise((r) => setTimeout(r));
  }
  // Hold the last frame a little longer.
  frames[frames.length - 1].delay = 1200;
  const palette = buildPalette(frames.filter((_, i) => i % 3 === 0 || i === frames.length - 1).map((f) => f.data));
  onProgress?.(0.7);
  await new Promise((r) => setTimeout(r));
  const bytes = encodeGif(frames, cw, ch, { palette });
  onProgress?.(1);
  return { blob: new Blob([bytes], { type: "image/gif" }), frames: frames.length, width: cw, height: ch };
}
