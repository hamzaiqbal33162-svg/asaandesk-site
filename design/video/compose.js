// Composition timing maths (pure, no DOM, unit tested): what is visible and audible at time t.
import { PRESETS, layoutVideo, itemEnd, OVERLAP_TRANSITIONS, isVideoOverlay, overlaySrc } from "./model.js";

const EPS = 1e-6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const even = (n) => Math.max(2, Math.round(n / 2) * 2);
export const ANIM_DUR = 0.5;
export const easeOut = (x) => 1 - (1 - x) ** 3;
export const backOut = (x) => { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

/** Export frame size for a preset at 720p/1080p (the shorter side), even numbers. */
export function exportSize(presetId, res = 1080) {
  const p = PRESETS[presetId] || PRESETS.youtube, k = res / Math.min(p.w, p.h);
  return { w: even(p.w * k), h: even(p.h * k) };
}
/** Where a sw x sh picture goes inside W x H ("contain" letterboxes, "cover" fills and crops). */
export function fitRect(sw, sh, W, H, mode = "contain") {
  if (!(sw > 0 && sh > 0)) return { x: 0, y: 0, w: W, h: H };
  const k = mode === "cover" ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
  const w = sw * k, h = sh * k;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}
/** True when the picture doesn't fill the frame (then the background colour or blur shows). */
export const needsFill = (sw, sh, W, H, mode = "contain") => mode !== "cover" && Math.abs(sw / sh - W / H) > 0.01;

/** 0..1 visibility of a video-track entry from its own fades and fade-through-black transitions. */
export function clipEnvelope(e, t) {
  const c = e.clip, local = t - e.start, left = e.end - t;
  let v = 1;
  if (c.fadeIn > 0) v = Math.min(v, local / c.fadeIn);
  if (c.fadeOut > 0) v = Math.min(v, left / c.fadeOut);
  if (e.tIn.type === "black" && e.tIn.dur > 0) v = Math.min(v, local / (e.tIn.dur / 2));
  if (e.tOut.type === "black" && e.tOut.dur > 0) v = Math.min(v, left / (e.tOut.dur / 2));
  return clamp(v, 0, 1);
}
/** Source time (seconds into the media file) shown at timeline time t. Images/end screens: seconds since clip start. */
export function srcTime(e, t) {
  const c = e.clip;
  if (c.kind !== "video") return clamp(t - e.start, 0, e.len);
  return clamp(c.in + (t - e.start) * (c.speed || 1), c.in, Math.max(c.in, c.out - 0.001));
}
/**
 * Everything drawn at time t: { visuals: [{ entry, src, alpha }] (bottom first), black: 0..1 overlay, texts: [{ clip, ...anim }] }.
 * During a crossfade the incoming clip is drawn over the outgoing one with alpha = progress.
 */
export function frameAt(p, t, layout = layoutVideo(p.video)) {
  const act = layout.filter((e) => t >= e.start - EPS && t < e.end - EPS);
  const visuals = [];
  let env = 1;
  if (act.length === 1) {
    const e = act[0];
    visuals.push({ entry: e, src: srcTime(e, t), alpha: 1 });
    env = clipEnvelope(e, t);
  } else if (act.length >= 2) {
    const [a, b] = act.slice(-2);
    const type = b.tIn.type, overlap = OVERLAP_TRANSITIONS.has(type) && b.tIn.dur > 0;
    const pr = overlap ? clamp((t - b.start) / b.tIn.dur, 0, 1) : 1;
    // crossfade and zoom blend the incoming clip in; slide, push, wipe and circle draw it fully, moved or cut to shape
    const alpha = type === "crossfade" || type === "zoom" ? pr : 1;
    const tr = overlap && type !== "crossfade" ? { type, dir: b.tIn.dir || "left", pr } : null;
    visuals.push({ entry: a, src: srcTime(a, t), alpha: 1, ...(tr && type === "push" ? { tr: { ...tr, role: "out" } } : {}) },
      { entry: b, src: srcTime(b, t), alpha, ...(tr ? { tr: { ...tr, role: "in" } } : {}) });
    env = (1 - pr) * clipEnvelope(a, t) + pr * clipEnvelope(b, t);
  }
  const texts = [];
  for (const c of p.text) { const s = textState(c, t); if (s) texts.push({ clip: c, ...s }); }
  const overlays = [];
  for (const c of p.overlay || []) {
    const a = overlayAlpha(c, t); if (!(a > 0)) continue;
    const an = (c.animIn && c.animIn !== "none") || (c.animOut && c.animOut !== "none") ? animState(c, t - c.start) : null;
    overlays.push({ clip: c, alpha: a * (an ? an.alpha : 1), ...(an ? { anim: an } : {}), src: isVideoOverlay(p, c) ? overlaySrc(c, t) : t - c.start });
  }
  return { visuals, black: visuals.length ? clamp(1 - env, 0, 1) : 0, texts, overlays };
}
/** Opacity of an overlay picture at t (fades in/out at its ends), 0 when it isn't on screen. */
export function overlayAlpha(c, t) {
  const local = t - c.start;
  if (local < -EPS || local >= c.dur - EPS) return 0;
  let a = c.opacity ?? 1;
  if (c.fadeIn > 0 && local < c.fadeIn) a *= clamp(local / c.fadeIn, 0, 1);
  if (c.fadeOut > 0 && c.dur - local < c.fadeOut) a *= clamp((c.dur - local) / c.fadeOut, 0, 1);
  return clamp(a, 0, 1);
}
/** Where an overlay picture of size sw x sh sits in a W x H frame: { x, y, w, h } (width c.w of the frame, centred on c.x, c.y). */
export function overlayRect(c, sw, sh, W, H) {
  const w = clamp(c.w ?? 0.3, 0.02, 2) * W, h = sw > 0 ? (w * sh) / sw : w;
  return { x: (c.x ?? 0.5) * W - w / 2, y: (c.y ?? 0.5) * H - h / 2, w, h };
}

/** Text animation state at t, or null when the text isn't on screen. dx/dy are in 1080p pixels. */
export function textState(c, t) {
  const local = t - c.start;
  if (local < -EPS || local >= c.dur - EPS) return null;
  const s = animState(c, local, c.text);
  if (c.capAnim && c.capAnim !== "none") s.word = captionWord(c.text, local, c.dur);
  return s;
}
const NEON = [0, 0.9, 0.15, 1, 0.35, 1];
/**
 * Intro/outro animation of a text or picture `local` seconds into it: { alpha, dx, dy (1080p px), scale, rot (rad), wipe (0..1
 * of the width shown from the left), chars }. Intro/outro lengths: c.animInDur / c.animOutDur (default 0.5 s, at most half).
 */
export function animState(c, local, text = "") {
  const inD = Math.min(c.animInDur ?? ANIM_DUR, c.dur / 2), outD = Math.min(c.animOutDur ?? ANIM_DUR, c.dur / 2);
  const s = { alpha: 1, dx: 0, dy: 0, scale: 1, chars: Infinity, rot: 0, wipe: 1 };
  const apply = (kind, q, dir) => {
    if (!kind || kind === "none" || q >= 1) return;
    const e = easeOut(q);
    if (kind === "fade" || kind === "breathe" || kind === "drift") s.alpha *= e;
    else if (kind === "slide-up") { s.alpha *= e; s.dy += (1 - e) * 60 * dir; }
    else if (kind === "slide-left") { s.alpha *= e; s.dx += (1 - e) * 140 * dir; }
    else if (kind === "pop") { s.alpha *= Math.min(1, q * 2); s.scale *= 0.6 + 0.4 * backOut(q); }
    else if (kind === "typewriter") s.chars = Math.min(s.chars, Math.floor(String(text || "").length * q));
    else if (kind === "wipe") s.wipe = Math.min(s.wipe, e);
    else if (kind === "baseline") { s.alpha *= Math.min(1, q * 1.5); s.dy += (1 - e) * 40 * dir; s.wipe = Math.min(s.wipe, 0.25 + 0.75 * e); }
    else if (kind === "tumble") { s.alpha *= e; s.rot += (1 - e) * -0.6 * dir; s.scale *= 0.7 + 0.3 * e; }
    else if (kind === "stomp") { s.alpha *= Math.min(1, q * 3); s.scale *= 1 + (1 - e) * 0.8; }
    else if (kind === "bounce") { s.alpha *= Math.min(1, q * 3); s.dy -= Math.abs(Math.sin(q * Math.PI * 2.5)) * (1 - q) * 90; }
    else if (kind === "neon") s.alpha *= NEON[Math.min(NEON.length - 1, Math.floor(q * NEON.length))];
  };
  apply(c.animIn, inD > 0 ? clamp(local / inD, 0, 1) : 1, 1);
  apply(c.animOut, outD > 0 ? clamp((c.dur - local) / outD, 0, 1) : 1, -1);
  // effects that last the whole time on screen
  if (c.animIn === "breathe" || c.animOut === "breathe") s.scale *= 1 + 0.035 * Math.sin((2 * Math.PI * local) / 1.6);
  if (c.animIn === "drift" || c.animOut === "drift") s.dx += (local / Math.max(EPS, c.dur) - 0.5) * 60;
  s.alpha = clamp(s.alpha, 0, 1);
  return s;
}
/**
 * Word-by-word caption timing: the words share the caption's time (by length, the last 8% is a pause).
 * Returns { index (word being said), frac (0..1 through it), count }.
 */
export function captionWord(text, local, dur) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return { index: -1, frac: 0, count: 0 };
  const w = words.map((x) => x.length + 1), total = w.reduce((a, b) => a + b, 0), span = Math.max(EPS, dur * 0.92);
  let at = 0;
  for (let i = 0; i < words.length; i++) {
    const len = (w[i] / total) * span;
    if (local < at + len || i === words.length - 1) return { index: i, frac: clamp((local - at) / len, 0, 1), count: words.length };
    at += len;
  }
  return { index: words.length - 1, frac: 1, count: words.length };
}

/** Gain of a video clip's own sound at t: volume x fades x crossfade ramps. */
export function videoGain(e, t) {
  const c = e.clip;
  if (c.muted) return 0;
  let g = (c.volume ?? 1) * clipEnvelope(e, t);
  if (OVERLAP_TRANSITIONS.has(e.tIn.type) && e.tIn.dur > 0) g *= clamp((t - e.start) / e.tIn.dur, 0, 1);
  if (OVERLAP_TRANSITIONS.has(e.tOut.type) && e.tOut.dur > 0) g *= clamp((e.end - t) / e.tOut.dur, 0, 1);
  return g;
}
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
/**
 * How a clip is drawn during a slide / push / wipe / circle / zoom transition (W x H frame):
 * { dx, dy (move), scale (around the centre), clip: null | { kind: 'rect', x, y, w, h } | { kind: 'circle', cx, cy, r } }.
 * dir = where the new clip moves to: "left" (comes in from the right), "right", "up" (from the bottom), "down".
 */
export function transitionGeom(tr, W, H) {
  const g = { dx: 0, dy: 0, scale: 1, clip: null };
  if (!tr) return g;
  const e = easeInOut(clamp(tr.pr, 0, 1)), dir = tr.dir || "left";
  const vx = dir === "left" ? -1 : dir === "right" ? 1 : 0, vy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
  if (tr.type === "slide" || tr.type === "push") {
    if (tr.role === "out") { g.dx = vx * e * W; g.dy = vy * e * H; }
    else { g.dx = -vx * (1 - e) * W; g.dy = -vy * (1 - e) * H; }
  } else if (tr.type === "wipe" && tr.role === "in") {
    const w = W * e, h = H * e;
    g.clip = dir === "left" ? { kind: "rect", x: W - w, y: 0, w, h: H } : dir === "right" ? { kind: "rect", x: 0, y: 0, w, h: H }
      : dir === "up" ? { kind: "rect", x: 0, y: H - h, w: W, h } : { kind: "rect", x: 0, y: 0, w: W, h };
  } else if (tr.type === "circle" && tr.role === "in") g.clip = { kind: "circle", cx: W / 2, cy: H / 2, r: (e * Math.hypot(W, H)) / 2 };
  else if (tr.type === "zoom" && tr.role === "in") g.scale = 1.3 - 0.3 * e;
  return g;
}
/** Gain of an audio-track clip at t. */
export function audioGain(c, t) {
  if (c.muted) return 0;
  const local = t - c.start, left = itemEnd(c) - t;
  let v = 1;
  if (c.fadeIn > 0) v = Math.min(v, local / c.fadeIn);
  if (c.fadeOut > 0) v = Math.min(v, left / c.fadeOut);
  return (c.volume ?? 1) * clamp(v, 0, 1);
}
const r4 = (x) => Math.round(x * 1e4) / 1e4;
/** Piecewise-linear gain curve [[t, gain]] through the breakpoints (plus midpoints), for WebAudio ramps. */
export function gainPoints(fn, start, end, extra = []) {
  const xs = [...new Set([start, end, ...extra].filter((x) => Number.isFinite(x) && x >= start - EPS && x <= end + EPS).map((x) => r4(clamp(x, start, end))))].sort((a, b) => a - b);
  const pts = [], at = (x) => fn(Math.max(start, Math.min(x, end - 1e-4)));
  xs.forEach((x, i) => {
    if (i) { const m = (xs[i - 1] + x) / 2; if (x - xs[i - 1] > 0.02) pts.push([r4(m), at(m)]); }
    pts.push([x, x >= end - EPS ? fn(end) : at(x)]);
  });
  return pts;
}
/** Linear interpolation in a gain curve. */
export function gainAt(points, t) {
  if (!points.length) return 0;
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (t <= points[i][0]) {
    const [a, ga] = points[i - 1], [b, gb] = points[i];
    return b - a < EPS ? gb : ga + ((gb - ga) * (t - a)) / (b - a);
  }
  return points[points.length - 1][1];
}
/**
 * Every sound to play: [{ id, mediaId, start, end, offset (source s at start), speed, points }].
 * Video clips contribute their own sound (when the media has audio), plus every audio-track clip.
 */
export function audioSegments(p, layout = layoutVideo(p.video)) {
  const segs = [];
  for (const e of layout) {
    const c = e.clip, m = p.media[c.mediaId];
    if (c.kind !== "video" || c.muted || !(c.volume > 0) || !m?.hasAudio) continue;
    segs.push({ id: c.id, mediaId: c.mediaId, start: e.start, end: e.end, offset: c.in, speed: c.speed || 1,
      points: gainPoints((t) => videoGain(e, t), e.start, e.end, [e.start + c.fadeIn, e.end - c.fadeOut, e.start + e.tIn.dur, e.end - e.tOut.dur, e.start + e.tIn.dur / 2, e.end - e.tOut.dur / 2]) });
  }
  // videos on the overlay track (picture-in-picture) play their own sound too
  for (const c of p.overlay || []) {
    const m = p.media[c.mediaId];
    if (m?.kind !== "video" || !m.hasAudio || c.muted || !((c.volume ?? 1) > 0)) continue;
    const end = c.start + c.dur;
    segs.push({ id: c.id, mediaId: c.mediaId, start: c.start, end, offset: c.in || 0, speed: c.speed || 1,
      points: gainPoints((t) => audioGain(c, t), c.start, end, [c.start + (c.fadeIn || 0), end - (c.fadeOut || 0)]) });
  }
  for (const c of p.audio) {
    const m = p.media[c.mediaId];
    if (c.muted || !(c.volume > 0) || !m || m.hasAudio === false) continue;
    const end = itemEnd(c);
    segs.push({ id: c.id, mediaId: c.mediaId, start: c.start, end, offset: c.in, speed: c.speed || 1,
      points: gainPoints((t) => audioGain(c, t), c.start, end, [c.start + c.fadeIn, end - c.fadeOut]) });
  }
  return segs;
}
/** Where to start a sound when playback begins at t0: { when (s after t0), offset (source s), stopAfter (s after t0) } or null. */
export function scheduleFor(seg, t0) {
  if (seg.end <= t0 + EPS) return null;
  const from = Math.max(t0, seg.start);
  return { when: from - t0, offset: seg.offset + (from - seg.start) * seg.speed, stopAfter: seg.end - t0 };
}

/** The frame of an animated picture at t seconds (it loops). */
export function frameIndexAt(frames, dur, t) {
  if (!frames?.length) return -1;
  const x = dur > 0 ? ((t % dur) + dur) % dur : 0;
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (frames[mid].t <= x + 1e-9) lo = mid; else hi = mid - 1; }
  return lo;
}
/** Video and photo filters (canvas filter strings) and the Adjust sliders (-100..100). */
export const FILTERS = {
  none: { label: "None", css: "" },
  mono: { label: "Mono", css: "grayscale(1)" },
  sepia: { label: "Sepia", css: "sepia(0.8)" },
  vivid: { label: "Vivid", css: "saturate(1.5) contrast(1.1)" },
  warm: { label: "Warm", css: "sepia(0.25) saturate(1.3)" },
  cool: { label: "Cool", css: "hue-rotate(12deg) saturate(1.1) brightness(1.03)" },
  faded: { label: "Faded", css: "contrast(0.85) brightness(1.1) saturate(0.8)" },
  dramatic: { label: "Dramatic", css: "contrast(1.35) saturate(1.2) brightness(0.95)" },
};
/** Canvas filter for a clip: its filter preset plus brightness / contrast / saturation, or "none". */
export function filterCss(c) {
  const parts = [];
  const f = FILTERS[c?.filter]?.css; if (f) parts.push(f);
  const a = c?.adj || {}, k = (v) => Math.round((1 + clamp(Number(v) || 0, -100, 100) / 100) * 100) / 100;
  if (a.brightness) parts.push(`brightness(${k(a.brightness)})`);
  if (a.contrast) parts.push(`contrast(${k(a.contrast)})`);
  if (a.saturation) parts.push(`saturate(${k(a.saturation)})`);
  return parts.length ? parts.join(" ") : "none";
}
/** Crop: the part of a sw x sh picture that is kept, crop = { l, t, r, b } fractions cut off each side (each side up to 45%). */
export function cropSource(sw, sh, crop) {
  const q = (v) => clamp(Number(v) || 0, 0, 0.45);
  const l = q(crop?.l), r = q(crop?.r), t = q(crop?.t), b = q(crop?.b);
  return { sx: sw * l, sy: sh * t, sw: Math.max(1, sw * (1 - l - r)), sh: Math.max(1, sh * (1 - t - b)) };
}

/** Safe-area guide boxes (fractions of the frame) for a preset: [{ x, y, w, h, label, kind: 'box' | 'zone' }]. */
export function safeAreas(presetId) {
  if (presetId === "shorts") return [
    { x: 0, y: 0, w: 1, h: 0.08, label: "Top bar", kind: "zone" },
    { x: 0, y: 0.78, w: 1, h: 0.22, label: "Title & buttons", kind: "zone" },
    { x: 0.86, y: 0.35, w: 0.14, h: 0.43, label: "Buttons", kind: "zone" },
  ];
  return [
    { x: 0.05, y: 0.05, w: 0.9, h: 0.9, label: "Action safe", kind: "box" },
    { x: 0.1, y: 0.1, w: 0.8, h: 0.8, label: "Text safe", kind: "box" },
  ];
}
/** End-screen layout (fractions): title area plus two "watch next" boxes and a subscribe circle, all inside the safe area. */
export function endScreenLayout(W, H) {
  const portrait = H > W;
  if (portrait) {
    const bw = W * 0.72, bh = bw * 9 / 16;
    return { title: { x: W / 2, y: H * 0.16 }, boxes: [{ x: (W - bw) / 2, y: H * 0.27, w: bw, h: bh }, { x: (W - bw) / 2, y: H * 0.27 + bh + H * 0.04, w: bw, h: bh }],
      circle: { x: W / 2, y: H * 0.27 + 2 * bh + H * 0.13, r: W * 0.12 } };
  }
  const bw = W * 0.34, bh = bw * 9 / 16, y = H * 0.4;
  return { title: { x: W / 2, y: H * 0.22 }, boxes: [{ x: W * 0.08, y, w: bw, h: bh }, { x: W * 0.58, y, w: bw, h: bh }],
    circle: { x: W / 2, y: y + bh / 2, r: Math.min(W * 0.065, H * 0.14) } };
}
