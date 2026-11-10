// Draws the composition on a canvas, plays it with sound (WebAudio) and exports it:
// WebM = canvas.captureStream + MediaStreamDestination + MediaRecorder (real time), MP4 = that WebM converted by ffmpeg.wasm.
import { layoutVideo, projectDuration } from "./model.js";
import { frameAt, fitRect, needsFill, audioSegments, scheduleFor, gainAt, safeAreas, endScreenLayout, exportSize, easeOut } from "./compose.js";
import { FONT_FAMILIES, ensureFont } from "../shared/brand.js";
import { mediaHolder, seekTo, pickType, WEBM_VIDEO_TYPES, bitrateFor, startRecorder, finishRecording, NOTHING_RECORDED } from "./mediakit.js";
import { fixWebmDuration } from "./webm.js";
import { runFFmpeg, loadFFmpeg } from "./ffmpeg.js";
import { webmToMp4Args } from "./ffcmd.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const abortError = () => new DOMException("Cancelled", "AbortError");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- media assets (blobs, decoded pictures and sound) ----------
let decodeCtx = null;
export async function decodeAudio(blob) {
  try {
    decodeCtx ||= new OfflineAudioContext(2, 1, 48000);
    return await decodeCtx.decodeAudioData(await blob.arrayBuffer());
  } catch { return null; }
}
/** Peak levels (0..1) for drawing a waveform. */
export function peaksOf(buf, n = 400) {
  const ch = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, i) => buf.getChannelData(i));
  const len = ch[0].length, step = Math.max(1, Math.floor(len / n)), out = [];
  for (let i = 0; i < n; i++) {
    let m = 0;
    const a = i * step, b = Math.min(len, a + step);
    for (let j = a; j < b; j += 16) for (const c of ch) { const v = Math.abs(c[j]); if (v > m) m = v; }
    out.push(Math.round(Math.min(1, m) * 100) / 100);
  }
  return out;
}
export class Assets {
  constructor() { this.blobs = new Map(); this.urls = new Map(); this.images = new Map(); this.sounds = new Map(); this.jobs = new Map(); }
  add(id, blob) { this.blobs.set(id, blob); if (!this.urls.has(id)) this.urls.set(id, URL.createObjectURL(blob)); }
  has(id) { return this.blobs.has(id); }
  url(id) { return this.urls.get(id); }
  image(id) { return this.images.get(id) || null; }
  sound(id) { return this.sounds.get(id) || null; }
  loadImage(id) {
    if (!this.jobs.has("i" + id)) this.jobs.set("i" + id, createImageBitmap(this.blobs.get(id)).then((b) => { this.images.set(id, b); return b; }));
    return this.jobs.get("i" + id);
  }
  loadSound(id) {
    if (!this.jobs.has("s" + id)) this.jobs.set("s" + id, decodeAudio(this.blobs.get(id)).then((b) => { if (b) this.sounds.set(id, b); return b; }));
    return this.jobs.get("s" + id);
  }
  ready() { return Promise.allSettled([...this.jobs.values()]); }
  remove(id) { const u = this.urls.get(id); if (u) URL.revokeObjectURL(u); for (const m of [this.blobs, this.urls, this.images, this.sounds]) m.delete(id); this.jobs.delete("i" + id); this.jobs.delete("s" + id); }
}

// ---------- drawing ----------
let blurCanvas = null;
function drawBlurFill(ctx, src, sw, sh, W, H) {
  blurCanvas ||= document.createElement("canvas");
  const bw = 72, bh = Math.max(2, Math.round((72 * H) / W));
  if (blurCanvas.width !== bw || blurCanvas.height !== bh) { blurCanvas.width = bw; blurCanvas.height = bh; }
  const b = blurCanvas.getContext("2d");
  const r = fitRect(sw, sh, bw, bh, "cover");
  if (typeof b.filter === "string") b.filter = "blur(3px)";
  b.drawImage(src, r.x - 4, r.y - 4, r.w + 8, r.h + 8);
  if (typeof b.filter === "string") b.filter = "none";
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(blurCanvas, 0, 0, W, H);
  const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.3; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = a;
}
const fontCss = (c, px) => `${c.italic ? "italic " : ""}${c.bold ? 700 : 400} ${px}px ${(FONT_FAMILIES[c.family] || FONT_FAMILIES.sans).css}`;
function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split("\n")) {
    const words = para.split(/(\s+)/);
    let line = "";
    for (const w of words) {
      const next = line + w;
      if (line.trim() && ctx.measureText(next.trimEnd()).width > maxW) { out.push(line.trimEnd()); line = w.trimStart(); }
      else line = next;
    }
    out.push(line.trimEnd());
  }
  return out;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}
/** Draws one text overlay; returns its box (canvas px) for hit testing. */
export function drawText(ctx, W, H, c, st) {
  const k = Math.min(W, H) / 1080, px = Math.max(4, c.size * k);
  ctx.save();
  ctx.font = fontCss(c, px);
  const lines = wrapLines(ctx, c.text || "", W * 0.9);
  const widths = lines.map((l) => ctx.measureText(l).width), bw = Math.max(1, ...widths), lh = px * 1.22, bh = lines.length * lh;
  const cx = c.x * W + st.dx * k, cy = c.y * H + st.dy * k, pad = px * 0.32;
  const box = { x: cx - bw / 2 - pad, y: cy - bh / 2 - pad, w: bw + pad * 2, h: bh + pad * 2 };
  ctx.globalAlpha *= st.alpha;
  ctx.translate(cx, cy); ctx.scale(st.scale, st.scale); ctx.translate(-cx, -cy);
  if (c.bg) { ctx.fillStyle = c.bg; roundRect(ctx, box.x, box.y, box.w, box.h, px * 0.25); ctx.fill(); }
  else { ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = px * 0.12; ctx.shadowOffsetY = px * 0.04; }
  ctx.fillStyle = c.color || "#fff"; ctx.textBaseline = "middle"; ctx.textAlign = c.align === "left" ? "left" : c.align === "right" ? "right" : "center";
  const x = c.align === "left" ? cx - bw / 2 : c.align === "right" ? cx + bw / 2 : cx;
  let left = Number.isFinite(st.chars) ? st.chars : Infinity;
  lines.forEach((l, i) => {
    if (left <= 0) return;
    const s = left < l.length ? l.slice(0, left) : l;
    left -= l.length + 1;
    const y = cy - bh / 2 + lh * (i + 0.5);
    if (c.align === "center" && s !== l) { ctx.textAlign = "left"; ctx.fillText(s, cx - widths[i] / 2, y); ctx.textAlign = "center"; }
    else ctx.fillText(s, x, y);
  });
  ctx.restore();
  return box;
}
/** Our own end-screen template: title + two "watch next" spots + a subscribe spot, inside the safe area. */
export function drawEndScreen(ctx, W, H, c, local) {
  const es = c.endscreen || {}, k = Math.min(W, H) / 1080, L = endScreenLayout(W, H), a = easeOut(clamp(local / 0.7, 0, 1));
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, es.color1 || "#2f80ff"); g.addColorStop(1, es.color2 || "#a64bf4");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha *= 0.12; ctx.fillStyle = "#fff";
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(W * (0.1 + i * 0.17), H * (i % 2 ? 0.95 : 0.05), Math.min(W, H) * (0.12 + (i % 3) * 0.05), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha /= 0.12;
  ctx.globalAlpha *= a;
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 ${76 * k}px ${FONT_FAMILIES.sans.css}`; ctx.fillText(es.title || "Thanks for watching!", L.title.x, L.title.y - (1 - a) * 30 * k);
  ctx.font = `400 ${38 * k}px ${FONT_FAMILIES.sans.css}`; ctx.globalAlpha *= 0.9; ctx.fillText(es.subtitle || "", L.title.x, L.title.y + 72 * k); ctx.globalAlpha /= 0.9;
  ctx.setLineDash([14 * k, 10 * k]); ctx.lineWidth = 4 * k; ctx.strokeStyle = "rgba(255,255,255,.85)";
  L.boxes.forEach((b, i) => {
    const off = (1 - a) * 60 * k * (i ? 1 : -1);
    ctx.fillStyle = "rgba(255,255,255,.14)"; roundRect(ctx, b.x + off, b.y, b.w, b.h, 18 * k); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); const cx = b.x + off + b.w / 2, cy = b.y + b.h / 2 - 18 * k, s = 26 * k;
    ctx.moveTo(cx - s * 0.6, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx - s * 0.6, cy + s); ctx.closePath(); ctx.fill();
    ctx.font = `600 ${30 * k}px ${FONT_FAMILIES.sans.css}`; ctx.fillText(i ? "More videos" : "Watch next", cx, b.y + b.h / 2 + 40 * k);
  });
  const C = L.circle;
  ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.arc(C.x, C.y, C.r * (0.7 + 0.3 * a), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]); ctx.fillStyle = "#fff"; ctx.font = `700 ${Math.max(10, C.r * 0.3)}px ${FONT_FAMILIES.sans.css}`; ctx.fillText("Subscribe", C.x, C.y);
  ctx.restore();
}
function drawGuides(ctx, W, H, presetId) {
  ctx.save();
  const k = Math.min(W, H) / 1080;
  ctx.font = `600 ${Math.max(10, 22 * k)}px system-ui, sans-serif`; ctx.textBaseline = "top";
  for (const z of safeAreas(presetId)) {
    const x = z.x * W, y = z.y * H, w = z.w * W, h = z.h * H;
    if (z.kind === "zone") { ctx.fillStyle = "rgba(239,68,68,.22)"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText(z.label, x + 8 * k, y + 6 * k); }
    else { ctx.setLineDash([10 * k, 8 * k]); ctx.lineWidth = Math.max(1, 2 * k); ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.strokeRect(x, y, w, h); ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillText(z.label, x + 8 * k, y + 6 * k); }
  }
  ctx.restore();
}
/** Draws one frame of the plan. src(visual) gives the picture (video element / ImageBitmap) or null. Returns text boxes. */
export function drawFrame(ctx, W, H, p, plan, src, { guides = false } = {}) {
  ctx.save();
  ctx.globalAlpha = 1; ctx.fillStyle = p.background?.color || "#000"; ctx.fillRect(0, 0, W, H);
  for (const v of plan.visuals) {
    const c = v.entry.clip;
    ctx.globalAlpha = v.alpha;
    if (c.kind === "endscreen") { drawEndScreen(ctx, W, H, c, v.src); continue; }
    const s = src(v);
    const sw = s?.videoWidth || s?.width, sh = s?.videoHeight || s?.height;
    if (!sw || !sh) continue;
    if (needsFill(sw, sh, W, H, c.fit)) {
      if (p.background?.mode === "blur") drawBlurFill(ctx, s, sw, sh, W, H);
      else { ctx.fillStyle = p.background?.color || "#000"; ctx.fillRect(0, 0, W, H); }
    }
    const r = fitRect(sw, sh, W, H, c.fit);
    ctx.drawImage(s, r.x, r.y, r.w, r.h);
  }
  if (plan.black > 0) { ctx.globalAlpha = plan.black; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 1;
  const boxes = plan.texts.map((t) => ({ id: t.clip.id, ...drawText(ctx, W, H, t.clip, t) }));
  if (guides) drawGuides(ctx, W, H, p.preset);
  ctx.restore();
  return boxes;
}
/** Loads the fonts used by the project (so preview and export look the same). */
export function loadFonts(p) {
  return Promise.all([ensureFont("sans", true), ...p.text.map((c) => ensureFont(c.family, c.bold, c.italic))]).catch(() => {});
}

// ---------- sound ----------
/** Schedules every sound of the project from timeline time t0 at context time `at`. Returns the nodes (to stop them). */
export function scheduleSounds(ac, dest, p, layout, assets, t0, at) {
  const nodes = [];
  for (const seg of audioSegments(p, layout)) {
    const buf = assets.sound(seg.mediaId);
    const s = buf && scheduleFor(seg, t0);
    if (!s || s.offset >= buf.duration) continue;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buf; src.playbackRate.value = seg.speed;
    g.gain.setValueAtTime(gainAt(seg.points, t0 + s.when), at + s.when);
    for (const [pt, val] of seg.points) if (pt > t0 + s.when) g.gain.linearRampToValueAtTime(val, at + (pt - t0));
    src.connect(g); g.connect(dest);
    src.start(at + s.when, s.offset); src.stop(at + s.stopAfter);
    nodes.push(src);
  }
  return nodes;
}

// ---------- player ----------
export class Player {
  constructor(canvas, assets, { onTime, onEnd, onState, maxEls = 6 } = {}) {
    // Opaque: a canvas with alpha makes Chrome record an alpha plane too (I420A), twice the encoding work.
    this.canvas = canvas; this.ctx = canvas.getContext("2d", { alpha: false }); this.assets = assets;
    this.onTime = onTime; this.onEnd = onEnd; this.onState = onState; this.maxEls = maxEls;
    this.els = new Map(); this.t = 0; this.playing = false; this.gen = 0; this.nodes = []; this.guides = false; this.textBoxes = [];
  }
  set(p) { this.p = p; this.layout = layoutVideo(p.video); this.total = projectDuration(p); }
  el(clip) {
    let r = this.els.get(clip.id);
    if (r && r.mediaId !== clip.mediaId) { this.drop(clip.id); r = null; }
    if (!r) {
      const el = document.createElement("video");
      el.muted = true; el.playsInline = true; el.preload = "auto";
      const url = this.assets.url(clip.mediaId); if (url) el.src = url;
      mediaHolder().append(el);
      r = { el, mediaId: clip.mediaId, used: 0 };
      this.els.set(clip.id, r);
    }
    r.used = performance.now();
    return r.el;
  }
  drop(id) { const r = this.els.get(id); if (!r) return; r.el.pause(); r.el.removeAttribute("src"); r.el.load(); r.el.remove(); this.els.delete(id); }
  gc(keep) {
    if (this.els.size <= this.maxEls) return;
    for (const [id] of [...this.els].filter(([id]) => !keep.has(id)).sort((a, b) => a[1].used - b[1].used)) { if (this.els.size <= this.maxEls) break; this.drop(id); }
  }
  hasVideo(v) { const c = v.entry.clip; return c.kind === "video" && !!this.assets.url(c.mediaId); }
  source(v) {
    const c = v.entry.clip;
    if (c.kind === "image") return this.assets.image(c.mediaId);
    if (this.hasVideo(v)) { const el = this.el(c); return el.readyState >= 2 ? el : null; }
    return null;
  }
  render(t = this.t, ctx = this.ctx, W = this.canvas.width, H = this.canvas.height) {
    if (!this.p) return;
    const plan = frameAt(this.p, Math.min(t, Math.max(0, this.total - 0.0005)), this.layout);
    const boxes = drawFrame(ctx, W, H, this.p, plan, (v) => this.source(v), { guides: this.guides && ctx === this.ctx });
    if (ctx === this.ctx) this.textBoxes = boxes;
  }
  /** Keeps the video elements at the right frames (playing: run them; always: get the next clips ready). */
  sync(t, playing) {
    const plan = frameAt(this.p, t, this.layout), want = new Set();
    for (const v of plan.visuals) {
      const c = v.entry.clip;
      if (!this.hasVideo(v)) continue;
      want.add(c.id);
      const el = this.el(c), rate = c.speed || 1;
      if (el.playbackRate !== rate) el.playbackRate = rate;
      const drift = Math.abs(el.currentTime - v.src);
      if (playing) {
        if (el.paused) { if (drift > 0.04) el.currentTime = v.src; el.play().catch(() => {}); }
        else if (drift > 0.3) el.currentTime = v.src;
      }
    }
    for (const e of this.layout) {
      if (e.clip.kind !== "video" || !this.assets.url(e.clip.mediaId) || !(e.start > t && e.start - t < 1.5)) continue;
      want.add(e.clip.id);
      const el = this.el(e.clip);
      if (el.paused && !el.seeking && Math.abs(el.currentTime - e.clip.in) > 0.04) el.currentTime = e.clip.in;
    }
    for (const [id, r] of this.els) if (!want.has(id) && !r.el.paused) r.el.pause();
    this.gc(want);
    return plan;
  }
  /** Shows the exact frame at t (waits for the video frames). */
  async seek(t) {
    if (this.playing) this.pause();
    this.t = clamp(t, 0, this.total || 0);
    const gen = ++this.gen;
    const plan = this.sync(this.t, false);
    this.render(); this.onTime?.(this.t);
    await Promise.all(plan.visuals.filter((v) => this.hasVideo(v)).map((v) => seekTo(this.el(v.entry.clip), v.src)));
    if (gen !== this.gen || this.playing) return;
    this.render();
  }
  audio() {
    if (!this.ac) { try { this.ac = new AudioContext(); this.master = this.ac.createGain(); this.master.connect(this.ac.destination); } catch { this.ac = null; } }
    return this.ac;
  }
  now() {
    const c = this.clock;
    const cur = c.ac ? c.ac.currentTime : performance.now() / 1000;
    return c.t0 + Math.max(0, cur - c.at);
  }
  async play() {
    if (this.playing || !(this.total > 0)) return;
    if (this.t >= this.total - 0.02) this.t = 0;
    this.playing = true; this.onState?.();
    const ac = this.audio();
    try { await ac?.resume(); } catch {}
    const plan = frameAt(this.p, this.t, this.layout);
    await Promise.all(plan.visuals.filter((v) => this.hasVideo(v)).map((v) => seekTo(this.el(v.entry.clip), v.src, 1500)));
    if (!this.playing) return;
    const live = ac && ac.state === "running";
    this.clock = { t0: this.t, ac: live ? ac : null, at: (live ? ac.currentTime : performance.now() / 1000) + 0.06 };
    if (live) this.nodes = scheduleSounds(ac, this.master, this.p, this.layout, this.assets, this.t, this.clock.at);
    const loop = () => {
      if (!this.playing) return;
      const t = this.now();
      if (t >= this.total) { this.pause(); this.t = this.total; this.render(); this.onTime?.(this.t); this.onEnd?.(); return; }
      this.t = t; this.sync(t, true); this.render(t); this.onTime?.(t);
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }
  stopSounds() { for (const n of this.nodes) { try { n.stop(); } catch {} } this.nodes = []; }
  pause() {
    if (!this.playing) return;
    this.playing = false; cancelAnimationFrame(this.raf); this.stopSounds();
    for (const r of this.els.values()) r.el.pause();
    this.onState?.();
  }
  destroy() { this.pause(); for (const id of [...this.els.keys()]) this.drop(id); }
}

/** Small JPEG of a frame (project thumbnails). */
export function snapshot(player, w = 320) {
  const c = document.createElement("canvas"), k = w / player.canvas.width;
  c.width = w; c.height = Math.round(player.canvas.height * k);
  try { player.render(player.t, c.getContext("2d"), c.width, c.height); return c.toDataURL("image/jpeg", 0.72); } catch { return ""; }
}

// ---------- export ----------
/**
 * Plays the whole project once in real time into a hidden canvas and records it (WebM, VP8/VP9 + Opus).
 * Pauses itself while the tab is hidden. Returns { blob, duration, width, height, type }.
 */
export async function exportWebM(project, assets, { res = 1080, fps = 30, signal, onProgress, onStatus } = {}) {
  if (!globalThis.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error("This browser can't export video. Try Chrome, Edge or Firefox on a computer.");
  const total = projectDuration(project);
  if (!(total >= 0.1)) throw new Error("Add a clip to the timeline first.");
  const { w: W, h: H } = exportSize(project.preset, res);
  onStatus?.("Getting your clips ready…");
  await Promise.all([loadFonts(project), assets.ready()]);
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const player = new Player(canvas, assets, { maxEls: 8 });
  player.set(project);
  let ac;
  try { ac = new AudioContext({ sampleRate: 48000 }); } catch { ac = new AudioContext(); }
  const dest = ac.createMediaStreamDestination();
  let hidden = false, rec = null;
  const onVis = () => {
    if (!rec || rec.state === "inactive") return;
    if (document.hidden && !hidden) { hidden = true; ac.suspend(); if (rec.state === "recording") rec.pause(); for (const r of player.els.values()) r.el.pause(); onStatus?.("Paused: keep this tab open to finish the export."); }
    else if (!document.hidden && hidden) { hidden = false; rec.resume(); ac.resume(); onStatus?.("Recording your video (real time)…"); }
  };
  document.addEventListener("visibilitychange", onVis);
  let watch = null, tracks = [];
  try {
    await ac.resume().catch(() => {});
    if (ac.state !== "running") throw new Error("The browser blocked sound for this page. Click Export again.");
    await player.seek(0);
    if (signal?.aborted) throw abortError();
    const mimeType = pickType(WEBM_VIDEO_TYPES);
    tracks = [...canvas.captureStream(fps).getVideoTracks(), ...dest.stream.getAudioTracks()];
    rec = new MediaRecorder(new MediaStream(tracks),
      { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: bitrateFor(W, H, fps), audioBitsPerSecond: 160000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    // Recording starts now and the frames come from the loop below, at once: Chrome fires "start" only after the
    // first frame is written, so waiting for it before drawing never ends (see startRecorder).
    watch = startRecorder(rec);
    const recStart = ac.currentTime, at = recStart + 0.05;
    player.nodes = scheduleSounds(ac, dest, project, player.layout, assets, 0, at);
    player.clock = { t0: 0, ac, at };
    onStatus?.("Recording your video (real time)…");
    await new Promise((resolve, reject) => {
      let token = 0;
      // A frame callback plus a timer per wait; token++ makes the one still pending a no-op (also after the end).
      const next = (ms) => { const id = ++token, run = () => { if (id === token) tick(); }; requestAnimationFrame(run); setTimeout(run, ms); };
      const end = (f, x) => { token++; f(x); };
      const tick = () => {
        if (signal?.aborted) return end(reject, abortError());
        if (watch.error) return end(reject, watch.error);
        if (hidden) return next(250);
        const t = player.now();
        if (t >= total) { player.render(total); return end(resolve); }
        player.sync(t, true); player.render(t);
        onProgress?.(t / total);
        next(40);
      };
      tick();
    });
    await sleep(90);
    const recEnd = ac.currentTime;
    onStatus?.("Finishing the file…");
    document.removeEventListener("visibilitychange", onVis); // nothing may resume the recorder while it drains
    await finishRecording(rec); // pause, let the encoder catch up, then stop: Chrome's stop() drops what is still encoding
    if (watch.error) throw watch.error;
    if (!chunks.length) throw new Error(NOTHING_RECORDED);
    const raw = new Uint8Array(await new Blob(chunks).arrayBuffer());
    const actual = (rec.mimeType || mimeType || "video/webm").split(";")[0], isWebm = actual.includes("webm"); // Safari records MP4
    const blob = new Blob([isWebm ? fixWebmDuration(raw, (recEnd - recStart) * 1000) : raw], { type: isWebm ? "video/webm" : actual });
    onProgress?.(1);
    return { blob, duration: recEnd - recStart, width: W, height: H, type: isWebm ? "webm" : "mp4" };
  } finally {
    watch?.done();
    document.removeEventListener("visibilitychange", onVis);
    if (rec && rec.state !== "inactive") { try { rec.stop(); } catch {} }
    for (const t of tracks) { try { t.stop(); } catch {} }
    player.stopSounds(); player.destroy(); ac.close().catch(() => {});
  }
}
/** MP4 (H.264/AAC): gets the ffmpeg.wasm engine ready, records the WebM, then converts it. */
export async function exportMp4(project, assets, { res = 1080, signal, onProgress, onStatus } = {}) {
  // Step 1: the engine first. Downloading and compiling it (31 MB) while the video records in real time takes the
  // CPU the recorder needs (dropped frames, a lagging encoder). If it can't load, the video is still recorded and
  // offered as WebM (the error carries it, see runExport).
  let engineError = null;
  try {
    await untilAbort(loadFFmpeg((t, f) => { onStatus?.("Step 1 of 3: " + t); if (Number.isFinite(f)) onProgress?.(f * 0.1); }), signal);
  } catch (e) { if (signal?.aborted) throw abortError(); engineError = e; }
  const webm = await exportWebM(project, assets, { res, signal, onStatus: (t) => onStatus?.("Step 2 of 3: " + t), onProgress: (f) => onProgress?.(0.1 + f * 0.45) });
  if (engineError) { engineError.webm = webm; throw engineError; }
  try {
    const out = await runFFmpeg({ files: [{ name: "input.webm", data: webm.blob }], args: webmToMp4Args({ input: "input.webm", output: "output.mp4" }),
      output: "output.mp4", duration: webm.duration, signal, onStatus: (t) => onStatus?.("Step 3 of 3: " + t), onProgress: (f) => onProgress?.(0.55 + f * 0.45) });
    return { ...webm, blob: new Blob([out], { type: "video/mp4" }), type: "mp4" };
  } catch (e) { e.webm = webm; throw e; }
}
/** Waits for p, or rejects with an AbortError as soon as the signal fires (p itself keeps running). */
function untilAbort(p, signal) {
  if (!signal) return p;
  return new Promise((res, rej) => {
    if (signal.aborted) return rej(abortError());
    const on = () => rej(abortError());
    signal.addEventListener("abort", on, { once: true });
    p.then((v) => { signal.removeEventListener("abort", on); res(v); }, (e) => { signal.removeEventListener("abort", on); rej(e); });
  });
}
