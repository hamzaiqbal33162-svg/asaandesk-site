// Pure logic for the online video recorder (no DOM at import; unit tested in tests/recorder.test.mjs).

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r3 = (n) => Math.round(n * 1000) / 1000;

/** Recording types and what each one needs. */
export const MODES = {
  screen: { label: "Screen", display: true, camera: false },
  camera: { label: "Camera", display: false, camera: true },
  both: { label: "Screen + camera", display: true, camera: true },
  audio: { label: "Audio only", display: false, camera: false },
};

/**
 * Streams a recording needs: { display, displayAudio, camera, mic, composite, video, audioSources, mixAudio }.
 * tabAudio asks for the shared tab / system sound (screen modes, or audio-only when switched on).
 */
export function plan(mode, { mic = true, tabAudio = false } = {}) {
  const m = MODES[mode];
  if (!m) throw new Error("Unknown recording type.");
  const p = { display: m.display, displayAudio: false, camera: m.camera, mic: !!mic, composite: m.display && m.camera, video: m.display || m.camera };
  if (tabAudio && (m.display || mode === "audio")) { p.display = true; p.displayAudio = true; } // camera mode never asks to share a screen
  if (!p.video && !p.mic && !p.displayAudio) throw new Error("Turn on the microphone or tab sound to record audio.");
  p.audioSources = (p.mic ? 1 : 0) + (p.displayAudio ? 1 : 0);
  p.mixAudio = p.audioSources > 1;
  return p;
}

/** Browser / device from the user agent. iPadOS reports "Macintosh" but has touch points. */
export function detectDevice(ua = "", maxTouchPoints = 0) {
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const mobile = ios || android || /Mobi/i.test(ua);
  const chromium = !ios && /(Chrome|Chromium|Edg)\//.test(ua);
  const firefox = /Firefox\//.test(ua);
  const safari = /Safari\//.test(ua) && !/(Chrome|Chromium|CriOS|FxiOS|Edg|EdgiOS)\//.test(ua);
  return { ios, android, mobile, chromium, firefox, safari };
}

/**
 * Honest support messages. caps = { secure, mediaDevices, getUserMedia, getDisplayMedia, mediaRecorder }.
 * Returns { fatal, screen, camera, tabAudio, dev }: empty strings mean "fine".
 */
export function support(caps, ua = "", maxTouchPoints = 0) {
  const dev = detectDevice(ua, maxTouchPoints);
  const out = { fatal: "", screen: "", camera: "", tabAudio: "", dev };
  if (!caps.secure) out.fatal = "Recording only works on a secure (https) page. Open this page with https:// and try again.";
  else if (!caps.mediaDevices || (!caps.getUserMedia && !caps.getDisplayMedia)) out.fatal = "This browser doesn't let websites use the camera, microphone or screen. Try Chrome, Edge or Firefox.";
  else if (!caps.mediaRecorder) out.fatal = "This browser can't record video. Try Chrome, Edge or Firefox" + (dev.ios ? ", or update your iPhone or iPad." : ".");
  if (!caps.getDisplayMedia) {
    out.screen = dev.ios
      ? "iPhone and iPad Safari don't let websites record the screen. You can still record your camera or sound here. For the screen, use Screen Recording in Control Centre."
      : dev.mobile
        ? "Phone browsers don't let websites record the screen. You can still record your camera or sound here."
        : "This browser can't record the screen. Try Chrome, Edge or Firefox on a computer.";
  }
  if (!caps.getUserMedia) out.camera = "This browser can't use the camera or microphone.";
  if (caps.getDisplayMedia && !dev.chromium) out.tabAudio = "Tab and system sound can only be recorded in Chrome and Edge. Your microphone works in every browser.";
  return out;
}
/** Why this recording can't start here ("" = it can). */
export function modeProblem(mode, sup, { mic = true, tabAudio = false } = {}) {
  if (sup.fatal) return sup.fatal;
  const p = plan(mode, { mic, tabAudio });
  if (p.display && sup.screen) return sup.screen;
  if ((p.camera || p.mic) && sup.camera) return sup.camera;
  return "";
}

/* ---------- Camera bubble (canvas pixels) ---------- */
export const BUBBLE = { S: 0.18, M: 0.25, L: 0.34 }; // diameter as a share of the shorter canvas side
export const bubbleDiameter = (size, W, H) => Math.round((BUBBLE[size] || BUBBLE.M) * Math.min(W, H));
/** Bubble { x, y, d } kept fully inside the canvas (x, y = top-left of its square). */
export function clampBubble(b, W, H) {
  const d = clamp(Math.round(b.d), 8, Math.min(W, H));
  return { d, x: Math.round(clamp(b.x, 0, W - d)), y: Math.round(clamp(b.y, 0, H - d)) };
}
/** Default: bottom-left with a small margin. */
export function defaultBubble(W, H, size = "M") {
  const d = bubbleDiameter(size, W, H), m = Math.round(Math.min(W, H) * 0.04);
  return clampBubble({ x: m, y: H - d - m, d }, W, H);
}
export const moveBubble = (b, dx, dy, W, H) => clampBubble({ ...b, x: b.x + dx, y: b.y + dy }, W, H);
/** New size, same centre. */
export function resizeBubble(b, size, W, H) {
  const d = bubbleDiameter(size, W, H), cx = b.x + b.d / 2, cy = b.y + b.d / 2;
  return clampBubble({ d, x: cx - d / 2, y: cy - d / 2 }, W, H);
}
export function inBubble(b, x, y) { const r = b.d / 2; return (x - b.x - r) ** 2 + (y - b.y - r) ** 2 <= r * r; }
/** Where content of size w x h sits inside a box with object-fit: contain. */
export function containRect(boxW, boxH, w, h) {
  if (!(w > 0 && h > 0 && boxW > 0 && boxH > 0)) return { x: 0, y: 0, w: boxW, h: boxH };
  const k = Math.min(boxW / w, boxH / h), cw = w * k, ch = h * k;
  return { x: (boxW - cw) / 2, y: (boxH - ch) / 2, w: cw, h: ch };
}
/** Pointer position on the preview element (object-fit: contain) -> canvas pixels. */
export function previewToCanvas(px, py, box, W, H) {
  const r = containRect(box.width, box.height, W, H);
  return { x: ((px - box.left - r.x) * W) / r.w, y: ((py - box.top - r.y) * H) / r.h };
}
/** Centre square of a camera frame (the circle shows a square crop, no stretching). */
export function coverCrop(w, h) { const s = Math.min(w, h); return { sx: (w - s) / 2, sy: (h - s) / 2, s }; }
/** Canvas size for screen + camera: the screen size, shorter side at most maxShort, even numbers. */
export function compositeSize(w, h, maxShort = 1080) {
  w = w > 0 ? w : 1280; h = h > 0 ? h : 720;
  const k = Math.min(1, maxShort / Math.min(w, h));
  return { w: Math.max(2, Math.round((w * k) / 2) * 2), h: Math.max(2, Math.round((h * k) / 2) * 2) };
}

/* ---------- Timer with pause/resume (milliseconds) ---------- */
export const clockNew = () => ({ state: "idle", start: 0, paused: 0, pausedAt: 0, stoppedAt: 0 });
export const clockStart = (c, now) => ({ state: "recording", start: now, paused: 0, pausedAt: 0, stoppedAt: 0 });
export const clockPause = (c, now) => (c.state === "recording" ? { ...c, state: "paused", pausedAt: now } : c);
export const clockResume = (c, now) => (c.state === "paused" ? { ...c, state: "recording", paused: c.paused + (now - c.pausedAt), pausedAt: 0 } : c);
export const clockStop = (c, now) => (c.state === "recording" || c.state === "paused" ? { ...c, state: "stopped", stoppedAt: c.state === "paused" ? c.pausedAt : now } : c);
/** Recorded time without the paused parts. */
export function clockElapsed(c, now) {
  if (c.state === "idle") return 0;
  const end = c.state === "paused" ? c.pausedAt : c.state === "stopped" ? c.stoppedAt : now;
  return Math.max(0, end - c.start - c.paused);
}
export const countdownSteps = (n = 3) => (n > 0 ? Array.from({ length: Math.floor(n) }, (_, i) => Math.floor(n) - i) : []);

/* ---------- Files ---------- */
const SLUG = { screen: "screen-recording", camera: "camera-recording", both: "screen-and-camera", audio: "audio-recording" };
/** "asaandesk-screen-recording-2026-11-10-0915.webm" (local time). */
export function recordingName(mode, date = new Date(), ext = "webm", suffix = "") {
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
  return `asaandesk-${SLUG[mode] || "recording"}-${stamp}${suffix}.${ext}`;
}
/** File extension for a MediaRecorder MIME type. */
export function extForType(type = "", audioOnly = false) {
  const t = String(type).toLowerCase();
  if (t.includes("mp4")) return audioOnly || t.startsWith("audio/") ? "m4a" : "mp4";
  if (t.includes("ogg")) return "ogg";
  return "webm";
}
export const baseType = (type = "") => String(type).split(";")[0].trim() || "video/webm";

/* ---------- Trim ---------- */
export const MIN_TRIM = 0.2;
const span = (d, min) => Math.min(min, Math.max(0, d));
/** Keeps 0 <= start < end <= duration with at least `min` seconds kept. */
export function clampTrim(t, duration, min = MIN_TRIM) {
  const d = Math.max(0, Number(duration) || 0), m = span(d, min);
  let s = clamp(Number(t?.start) || 0, 0, d), e = clamp(t?.end == null ? d : Number(t.end), 0, d);
  if (e < s) [s, e] = [e, s];
  if (e - s < m) { e = Math.min(d, s + m); s = Math.max(0, e - m); }
  return { start: r3(s), end: r3(e) };
}
/** Moves one handle (which = "start" | "end") without passing the other one. */
export function moveHandle(t, which, value, duration, min = MIN_TRIM) {
  const d = Math.max(0, Number(duration) || 0), m = span(d, min), v = Number(value) || 0;
  if (which === "start") return { start: r3(clamp(v, 0, Math.max(0, t.end - m))), end: t.end };
  return { start: t.start, end: r3(clamp(v, Math.min(d, t.start + m), d)) };
}
export const isTrimmed = (t, duration) => t.start > 0.05 || t.end < duration - 0.05;
/** Pointer x inside the trim bar -> seconds. */
export const xToTime = (x, width, duration) => clamp(width > 0 ? (x / width) * duration : 0, 0, Math.max(0, duration));
/** Times for n preview pictures across the video (middle of each slice). */
export const stripTimes = (duration, n = 8) => Array.from({ length: n }, (_, i) => r3(((i + 0.5) * Math.max(0, duration)) / n));
/** Sample indexes [from, to) of start..end seconds. */
export function sampleRange(sampleRate, length, start, end) {
  const a = clamp(Math.round(start * sampleRate), 0, length), b = clamp(Math.round(end * sampleRate), a, length);
  return [a, b];
}
/** Loudness 0..1 of a block of samples (RMS, scaled so speech fills the meter). */
export function level(samples) {
  if (!samples?.length) return 0;
  let s = 0;
  for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i];
  return clamp(Math.sqrt(s / samples.length) * 3, 0, 1);
}
