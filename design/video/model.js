// Video project model (pure, no DOM, unit tested): tracks, clips, trimming, splitting, reordering, durations, overlaps.
//
// Project = { version: 1, id, name, preset, background: { mode: 'blur' | 'color', color }, media: { [id]: Media },
//   video: [Clip] (played one after another), text: [TextClip], audio: [AudioClip], chapters: [{ t, title }] }
// Media = { id, kind: 'video' | 'image' | 'audio', name, mime, duration, w, h, hasAudio, thumb, peaks }
// Clip (video track) = { id, mediaId, kind: 'video' | 'image' | 'endscreen', in, out (source seconds), speed, volume, muted,
//   fadeIn, fadeOut, transition: { type: 'none' | 'crossfade' | 'black', dur } (into this clip), fit: 'contain' | 'cover', endscreen? }
// TextClip = { id, start, dur, text, family, size (px at 1080p), color, bold, italic, bg, x, y (0..1 centre), align, animIn, animOut }
// AudioClip = { id, mediaId, start, in, out, speed, volume, muted, fadeIn, fadeOut }

export const PRESETS = {
  youtube: { id: "youtube", label: "YouTube 16:9", short: "16:9", w: 1920, h: 1080 },
  shorts: { id: "shorts", label: "Shorts, Reels, TikTok 9:16", short: "9:16", w: 1080, h: 1920 },
  square: { id: "square", label: "Square 1:1", short: "1:1", w: 1080, h: 1080 },
  portrait: { id: "portrait", label: "Portrait 4:5", short: "4:5", w: 1080, h: 1350 },
};
export const SPEEDS = [0.5, 1, 2];
export const MIN_LEN = 0.1;
export const IMAGE_DUR = 4;
export const MAX_IMAGE_DUR = 600;
export const TRANSITIONS = { none: "None", crossfade: "Crossfade", black: "Fade through black" };
export const ANIMS = { none: "None", fade: "Fade", "slide-up": "Slide up", "slide-left": "Slide in", pop: "Pop", typewriter: "Typewriter" };
export const TEXT_STYLES = {
  title: { label: "Title", text: "Your title", size: 120, bold: true, color: "#ffffff", bg: "", y: 0.45, animIn: "pop", animOut: "fade" },
  subtitle: { label: "Subtitle", text: "Add a subtitle", size: 64, bold: false, color: "#ffffff", bg: "", y: 0.6, animIn: "fade", animOut: "fade" },
  caption: { label: "Caption", text: "Caption text", size: 54, bold: true, color: "#ffffff", bg: "#000000a6", y: 0.86, animIn: "fade", animOut: "fade" },
  lower: { label: "Lower third", text: "Name · Role", size: 56, bold: true, color: "#1b2133", bg: "#ffffffe6", y: 0.8, x: 0.3, animIn: "slide-left", animOut: "fade" },
};
const EPS = 1e-6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r3 = (v) => Math.round(v * 1000) / 1000;
let seq = 0;
export const newId = (p = "c") => p + Date.now().toString(36).slice(-5) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);

export function newProject({ preset = "youtube", name = "Untitled video", id = null } = {}) {
  return { version: 1, id, name, preset: PRESETS[preset] ? preset : "youtube", background: { mode: "blur", color: "#000000" },
    media: {}, video: [], text: [], audio: [], chapters: [] };
}
/** Fills defaults so older or hand-made projects load safely. */
export function normalizeProject(p) {
  const q = { ...newProject(), ...(p || {}) };
  q.background = { mode: "blur", color: "#000000", ...(p?.background || {}) };
  if (!PRESETS[q.preset]) q.preset = "youtube";
  q.media = { ...(q.media || {}) };
  q.video = (q.video || []).map((c) => ({ speed: 1, volume: 1, muted: false, fadeIn: 0, fadeOut: 0, fit: "contain", transition: { type: "none", dur: 0.5 }, ...c }));
  q.text = (q.text || []).map((c) => textClip(c));
  q.audio = (q.audio || []).map((c) => ({ speed: 1, volume: 1, muted: false, fadeIn: 0, fadeOut: 0, ...c }));
  q.chapters = (q.chapters || []).filter((c) => Number.isFinite(c.t)).map((c) => ({ t: Math.max(0, c.t), title: String(c.title || "") }));
  return q;
}

export const clipLen = (c) => Math.max(0, (c.out - c.in) / (c.speed || 1));
export const itemEnd = (c) => (c.dur != null ? c.start + c.dur : c.start + clipLen(c));

/** Positions of the video-track clips: [{ clip, index, start, end, len, tIn, tOut }]. Crossfades overlap; black fades don't. */
export function layoutVideo(clips) {
  const out = [];
  let t = 0;
  clips.forEach((clip, i) => {
    const len = clipLen(clip);
    let type = "none", dur = 0;
    const tr = clip.transition;
    if (i > 0 && tr && tr.type && tr.type !== "none") {
      dur = Math.max(0, Math.min(tr.dur || 0, out[i - 1].len / 2, len / 2));
      if (dur >= 0.05) type = tr.type; else dur = 0;
    }
    const start = type === "crossfade" ? t - dur : t;
    const e = { clip, index: i, start, len, end: start + len, tIn: { type, dur }, tOut: { type: "none", dur: 0 } };
    if (i > 0) out[i - 1].tOut = { type, dur };
    out.push(e);
    t = e.end;
  });
  return out;
}
export const videoDuration = (p) => { const l = layoutVideo(p.video); return l.length ? l[l.length - 1].end : 0; };
/** Total length: the longest of the video track, text overlays and audio. */
export function projectDuration(p) {
  let d = videoDuration(p);
  for (const c of p.text) d = Math.max(d, itemEnd(c));
  for (const c of p.audio) d = Math.max(d, itemEnd(c));
  return d;
}

/** { track, clip, index } for an id, or null. */
export function findClip(p, id) {
  for (const track of ["video", "text", "audio"]) {
    const index = p[track].findIndex((c) => c.id === id);
    if (index >= 0) return { track, clip: p[track][index], index };
  }
  return null;
}
/** The video-track entry playing at time t (the later one during a crossfade). */
export function videoEntryAt(p, t) {
  const l = layoutVideo(p.video);
  for (let i = l.length - 1; i >= 0; i--) if (t >= l[i].start - EPS && t < l[i].end - EPS) return l[i];
  return null;
}

export function addMedia(p, media) { p.media[media.id] = { ...media }; return p.media[media.id]; }
/** Adds a video or image (or end screen) clip to the video track at `index` (default: the end). */
export function addVideoClip(p, media, { index = p.video.length, inT = 0, outT = null } = {}) {
  const isImage = media.kind === "image";
  const dur = isImage ? IMAGE_DUR : Math.max(MIN_LEN, media.duration || 0);
  const a = isImage ? 0 : clamp(inT || 0, 0, Math.max(0, dur - MIN_LEN));
  const b = isImage ? dur : clamp(outT == null ? dur : outT, a + MIN_LEN, dur);
  const clip = { id: newId("v"), mediaId: media.id, kind: isImage ? "image" : "video", in: a, out: b, speed: 1, volume: 1, muted: false,
    fadeIn: 0, fadeOut: 0, fit: "contain", transition: { type: "none", dur: 0.5 } };
  p.video.splice(clamp(index, 0, p.video.length), 0, clip);
  return clip;
}
export function addEndScreen(p, { dur = 10, title = "Thanks for watching!", subtitle = "Watch next and subscribe for more" } = {}) {
  const clip = { id: newId("v"), mediaId: null, kind: "endscreen", in: 0, out: clamp(dur, 5, 20), speed: 1, volume: 1, muted: true, fadeIn: 0, fadeOut: 0,
    fit: "cover", transition: { type: p.video.length ? "crossfade" : "none", dur: 0.6 }, endscreen: { title, subtitle, color1: "#2f80ff", color2: "#a64bf4" } };
  p.video.push(clip);
  return clip;
}
export function addAudioClip(p, media, { start = 0 } = {}) {
  const clip = { id: newId("a"), mediaId: media.id, start: Math.max(0, start), in: 0, out: Math.max(MIN_LEN, media.duration || 0), speed: 1, volume: 1, muted: false, fadeIn: 0, fadeOut: 0 };
  p.audio.push(clip);
  return clip;
}
export function textClip(o = {}) {
  return { id: newId("t"), start: 0, dur: 3, text: "Your text", family: "sans", size: 72, color: "#ffffff", bold: true, italic: false, bg: "",
    x: 0.5, y: 0.5, align: "center", animIn: "fade", animOut: "fade", ...o };
}
export function addText(p, o = {}) {
  const style = TEXT_STYLES[o.style] || {};
  const { style: _s, ...rest } = o;
  const c = textClip({ ...style, ...rest });
  delete c.label;
  c.start = Math.max(0, c.start); c.dur = Math.max(MIN_LEN, c.dur);
  p.text.push(c);
  return c;
}

/** Sets a clip's source in/out (video/audio) or duration (images, end screens, text), clamped to what's possible. */
export function setTrim(p, id, { inT, outT, dur } = {}) {
  const f = findClip(p, id); if (!f) return null;
  const c = f.clip;
  if (f.track === "text") { if (dur != null) c.dur = Math.max(MIN_LEN, dur); return c; }
  if (c.kind === "image" || c.kind === "endscreen") {
    const d = dur != null ? dur : outT != null ? outT - (c.in || 0) : c.out - c.in;
    c.in = 0; c.out = r3(c.kind === "endscreen" ? clamp(d, 5, 20) : clamp(d, MIN_LEN, MAX_IMAGE_DUR));
    return c;
  }
  const m = p.media[c.mediaId], max = m?.duration || c.out;
  const sp = c.speed || 1;
  let a = inT != null ? inT : c.in, b = outT != null ? outT : c.out;
  a = clamp(a, 0, max); b = clamp(b, 0, max);
  if (inT != null && outT == null) a = Math.min(a, b - MIN_LEN * sp);
  else if (outT != null && inT == null) b = Math.max(b, a + MIN_LEN * sp);
  else if (b - a < MIN_LEN * sp) b = Math.min(max, a + MIN_LEN * sp);
  c.in = r3(Math.max(0, a)); c.out = r3(Math.min(max, b));
  return c;
}
/** Drags an edge by dt timeline seconds. Start edge of audio/text clips keeps the rest of the clip where it is. */
export function trimEdge(p, id, edge, dt) {
  const f = findClip(p, id); if (!f) return null;
  const c = f.clip, sp = c.speed || 1;
  if (f.track === "text") {
    if (edge === "start") { const d = clamp(dt, -c.start, c.dur - MIN_LEN); c.start = r3(c.start + d); c.dur = r3(c.dur - d); }
    else c.dur = r3(Math.max(MIN_LEN, c.dur + dt));
    return c;
  }
  if (c.kind === "image" || c.kind === "endscreen") return setTrim(p, id, { dur: (c.out - c.in) + (edge === "start" ? -dt : dt) });
  if (edge === "start") {
    const before = c.in;
    setTrim(p, id, { inT: c.in + dt * sp });
    if (f.track === "audio") c.start = r3(Math.max(0, c.start + (c.in - before) / sp));
  } else setTrim(p, id, { outT: c.out + dt * sp });
  return c;
}
/** Moves an edge to the timeline time t (the "[" and "]" keys). */
export function trimToTime(p, id, edge, t) {
  const f = findClip(p, id); if (!f) return null;
  const range = clipRange(p, id);
  return trimEdge(p, id, edge, edge === "start" ? t - range.start : t - range.end);
}
/** Timeline start/end of any clip. */
export function clipRange(p, id) {
  const f = findClip(p, id); if (!f) return null;
  if (f.track === "video") { const e = layoutVideo(p.video)[f.index]; return { start: e.start, end: e.end }; }
  return { start: f.clip.start, end: itemEnd(f.clip) };
}

/** Splits the clip `id` (or the video clip under t) at timeline time t. Returns the new (second) clip or null. */
export function splitAt(p, t, id = null) {
  let f = id ? findClip(p, id) : null;
  if (!f) { const e = videoEntryAt(p, t); if (!e) return null; f = { track: "video", clip: e.clip, index: e.index }; }
  const range = clipRange(p, f.clip.id);
  if (!(t > range.start + MIN_LEN - EPS && t < range.end - MIN_LEN + EPS)) return null;
  const c = f.clip, local = t - range.start;
  const b = JSON.parse(JSON.stringify(c));
  b.id = newId(f.track[0]);
  if (f.track === "text") { b.start = r3(t); b.dur = r3(c.dur - local); c.dur = r3(local); b.animIn = "none"; c.animOut = "none"; }
  else {
    const sp = c.speed || 1, cut = r3(c.in + local * sp);
    b.in = c.kind === "video" || f.track === "audio" ? cut : 0;
    b.out = c.kind === "video" || f.track === "audio" ? c.out : r3(c.out - local);
    c.out = c.kind === "video" || f.track === "audio" ? cut : r3(local);
    c.fadeOut = 0; b.fadeIn = 0;
    if (f.track === "audio") b.start = r3(t);
    else b.transition = { type: "none", dur: c.transition?.dur || 0.5 };
  }
  p[f.track].splice(f.index + 1, 0, b);
  return b;
}
/** Video track: moves a clip to a new position in the play order. */
export function moveVideoClip(p, id, toIndex) {
  const i = p.video.findIndex((c) => c.id === id); if (i < 0) return false;
  const [c] = p.video.splice(i, 1);
  p.video.splice(clamp(toIndex, 0, p.video.length), 0, c);
  return true;
}
/** Where a video clip dropped at timeline time t lands (index among the other clips). */
export function dropIndex(p, id, t) {
  const others = layoutVideo(p.video.filter((c) => c.id !== id));
  let idx = 0;
  for (const e of others) if (t > e.start + e.len / 2) idx = e.index + 1;
  return idx;
}
/** Text/audio: moves a clip in time (never before 0). */
export function moveItem(p, id, start) {
  const f = findClip(p, id); if (!f || f.track === "video") return null;
  f.clip.start = r3(Math.max(0, start));
  return f.clip;
}
export function removeClip(p, id) {
  const f = findClip(p, id); if (!f) return false;
  p[f.track].splice(f.index, 1);
  return true;
}
/** Copies a clip: video clips right after the original, text/audio right after it in time. */
export function duplicateClip(p, id) {
  const f = findClip(p, id); if (!f) return null;
  const c = JSON.parse(JSON.stringify(f.clip));
  c.id = newId(f.track[0]);
  if (f.track !== "video") c.start = r3(itemEnd(f.clip));
  p[f.track].splice(f.index + 1, 0, c);
  return c;
}
export function setSpeed(p, id, speed) {
  const f = findClip(p, id); if (!f || f.track === "text" || !SPEEDS.includes(speed)) return null;
  if (f.clip.kind === "image" || f.clip.kind === "endscreen") return null;
  f.clip.speed = speed;
  return f.clip;
}

export const overlaps = (a, b) => a.start < itemEnd(b) - 1e-3 && b.start < itemEnd(a) - 1e-3;
/** Lane per item so that no two items in a lane overlap (greedy by start time). Returns { [id]: lane } and the count. */
export function lanes(items) {
  const order = [...items].sort((a, b) => a.start - b.start || itemEnd(a) - itemEnd(b));
  const ends = [], map = {};
  for (const it of order) {
    let lane = ends.findIndex((e) => e <= it.start + 1e-3);
    if (lane < 0) { lane = ends.length; ends.push(0); }
    ends[lane] = itemEnd(it); map[it.id] = lane;
  }
  return { map, count: Math.max(1, ends.length) };
}
/** Snaps t to the nearest point within tol (seconds). */
export function snap(t, points, tol) {
  let best = t, d = tol;
  for (const x of points) { const k = Math.abs(x - t); if (k <= d) { d = k; best = x; } }
  return best;
}
/** Edges worth snapping to (clip starts/ends, 0, playhead). */
export function snapPoints(p, exceptId, extra = []) {
  const pts = [0, ...extra];
  for (const e of layoutVideo(p.video)) if (e.clip.id !== exceptId) pts.push(e.start, e.end);
  for (const c of [...p.text, ...p.audio]) if (c.id !== exceptId) pts.push(c.start, itemEnd(c));
  return pts;
}
/** Media still used by a clip? */
export const mediaInUse = (p, mediaId) => p.video.some((c) => c.mediaId === mediaId) || p.audio.some((c) => c.mediaId === mediaId);

/** Captions from the voiceover app: [{ text, start, dur }] -> text clips at the bottom. */
export function addCaptions(p, lines, offset = 0) {
  return (lines || []).filter((l) => String(l.text || "").trim() && l.dur > 0).map((l) =>
    addText(p, { style: "caption", text: String(l.text).trim(), start: offset + Math.max(0, l.start), dur: Math.max(MIN_LEN, l.dur), size: 50 }));
}
