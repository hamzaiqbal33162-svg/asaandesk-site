// Composition timing maths (pure, no DOM, unit tested): what is visible and audible at time t.
import { PRESETS, layoutVideo, itemEnd } from "./model.js";

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
    const pr = b.tIn.type === "crossfade" && b.tIn.dur > 0 ? clamp((t - b.start) / b.tIn.dur, 0, 1) : 1;
    visuals.push({ entry: a, src: srcTime(a, t), alpha: 1 }, { entry: b, src: srcTime(b, t), alpha: pr });
    env = (1 - pr) * clipEnvelope(a, t) + pr * clipEnvelope(b, t);
  }
  const texts = [];
  for (const c of p.text) { const s = textState(c, t); if (s) texts.push({ clip: c, ...s }); }
  return { visuals, black: visuals.length ? clamp(1 - env, 0, 1) : 0, texts };
}

/** Text animation state at t, or null when the text isn't on screen. dx/dy are in 1080p pixels. */
export function textState(c, t) {
  const local = t - c.start;
  if (local < -EPS || local >= c.dur - EPS) return null;
  const ad = Math.min(ANIM_DUR, c.dur / 2);
  const s = { alpha: 1, dx: 0, dy: 0, scale: 1, chars: Infinity };
  const apply = (kind, q, dir) => {
    if (!kind || kind === "none" || q >= 1) return;
    const e = easeOut(q);
    if (kind === "fade") s.alpha *= e;
    else if (kind === "slide-up") { s.alpha *= e; s.dy += (1 - e) * 60 * dir; }
    else if (kind === "slide-left") { s.alpha *= e; s.dx += (1 - e) * 140 * dir; }
    else if (kind === "pop") { s.alpha *= Math.min(1, q * 2); s.scale *= 0.6 + 0.4 * backOut(q); }
    else if (kind === "typewriter") s.chars = Math.min(s.chars, Math.floor(String(c.text || "").length * q));
  };
  apply(c.animIn, ad > 0 ? clamp(local / ad, 0, 1) : 1, 1);
  apply(c.animOut, ad > 0 ? clamp((c.dur - local) / ad, 0, 1) : 1, -1);
  s.alpha = clamp(s.alpha, 0, 1);
  return s;
}

/** Gain of a video clip's own sound at t: volume x fades x crossfade ramps. */
export function videoGain(e, t) {
  const c = e.clip;
  if (c.muted) return 0;
  let g = (c.volume ?? 1) * clipEnvelope(e, t);
  if (e.tIn.type === "crossfade" && e.tIn.dur > 0) g *= clamp((t - e.start) / e.tIn.dur, 0, 1);
  if (e.tOut.type === "crossfade" && e.tOut.dur > 0) g *= clamp((e.end - t) / e.tOut.dur, 0, 1);
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
