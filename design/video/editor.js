// Video editor UI (also the YouTube editor with ?preset=youtube). Timeline + preview + inspector, autosaved in this browser.
import * as M from "./model.js";
import { exportSize, fitRect, frameAt } from "./compose.js";
import { chaptersText, checkChapters, fmtChapterTime, parseChapters } from "./chapters.js";
import { Assets, Player, exportWebM, exportMp4, snapshot, peaksOf, loadFonts, scheduleSounds } from "./player.js";
import { runFFmpeg } from "./ffmpeg.js";
import { movArgs } from "./ffcmd.js";
import { audioBufferToWav } from "./wav.js";
import * as C2 from "./compose.js";
import { probeVideo, seekTo, pickType, WEBM_AUDIO_TYPES } from "./mediakit.js";
import { putMedia, getMedia, deleteMediaOf, storageLeft } from "./mediastore.js";
import { $, $$, esc, toast, downloadBlob, fmtTime, fmtBytes, baseName, progressBox, isAbort } from "./ui.js";
import { saveProject, listProjects, getProject, deleteProject, takeHandoff, uid } from "../shared/store.js";
import { FONT_FAMILIES, ensureFont, loadBrand } from "../shared/brand.js";
import * as G from "./gallery.js";
import { sceneBlob, soundBlob, SOUNDS, SHAPES, STICKERS, TITLES } from "./builtins.js";
import * as CP from "./captions.js";
import * as B from "./beats.js";

const FPS = 30;
const ICON = {
  play: '<path d="M8 5v14l11-7z"/>', pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>', start: '<path d="M6 5h2v14H6zM20 5v14L9 12z"/>',
  end: '<path d="M16 5h2v14h-2zM4 5v14l11-7z"/>', back: '<path d="M15 6l-6 6 6 6z"/>', fwd: '<path d="M9 6l6 6-6 6z"/>',
  split: '<path d="M11 3h2v18h-2zM4 8h5v8H4zM15 8h5v8h-5z"/>', del: '<path d="M8 4h8l1 2h4v2H3V6h4zM5 9h14l-1 11H6z"/>',
  undo: '<path d="M12 5a7 7 0 1 1-6.3 10l1.8-.9A5 5 0 1 0 12 7H8.8l2.6 2.6L10 11 5 6l5-5 1.4 1.4L8.8 5z"/>',
  redo: '<path d="M12 5a7 7 0 1 0 6.3 10l-1.8-.9A5 5 0 1 1 12 7h3.2l-2.6 2.6L14 11l5-5-5-5-1.4 1.4L15.2 5z"/>',
  media: '<path d="M4 5h16v14H4zM6 15l3.5-4 2.5 3 2-2 4 3z"/>', text: '<path d="M5 5h14v3h-2V7h-4v10h2v2H9v-2h2V7H7v1H5z"/>',
  audio: '<path d="M10 4v10.3A3.5 3.5 0 1 0 12 17V8h6V4z"/>', canvas: '<path d="M3 6h18v12H3zm2 2v8h14V8z"/>',
  yt: '<path d="M3 7.5C3 6 4 5 5.5 5h13C20 5 21 6 21 7.5v9c0 1.5-1 2.5-2.5 2.5h-13C4 19 3 18 3 16.5zM10 9v6l5-3z"/>', edit: '<path d="M4 17.5V20h2.5L17 9.5 14.5 7zM19.7 6.8a1 1 0 0 0 0-1.4l-1.1-1.1a1 1 0 0 0-1.4 0L16 5.5 18.5 8z"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">${ICON[n]}</svg>`;

const S = { p: null, sel: null, t: 0, pps: 40, tab: "media", yt: false, guides: false, undo: [], redo: [], sheet: "", busy: 0, presetChosen: false, lastExport: null, saved: "", multi: new Set(), slip: false };
const assets = new Assets();
let player, els = {}, shell = null;

// ---------- start ----------
export async function startEditor(root, bar, params) {
  S.yt = params.get("preset") === "youtube";
  S.guides = S.yt;
  document.title = (S.yt ? "YouTube video editor" : "Video editor") + " | AsaanDesk";
  bar.querySelector(".mx-title").textContent = S.yt ? "YouTube video editor" : "Video editor";
  buildBar(bar); buildUi(root);
  player = new Player(els.pv, assets, { onTime: onTime, onState: updatePlay, onEnd: updatePlay });
  player.guides = S.guides;
  const pid = params.get("project"), hid = params.get("handoff"), preset = params.get("preset");
  if (pid) await openProject(pid);
  if (!S.p) {
    S.p = M.newProject({ preset: M.PRESETS[preset] ? preset : "youtube", id: uid() });
    S.presetChosen = !!M.PRESETS[preset];
  }
  if (hid) {
    const url = new URL(location.href); url.searchParams.delete("handoff"); history.replaceState(null, "", url);
    await applyHandoff(await takeHandoff(hid).catch(() => null));
  }
  changed({ history: false, save: !!hid });
  fitZoom();
  window.adApp = api;
  await mountFrame(params);
  const tpl = params.get("template");
  // ?template= is used once (a reload must not apply it again); ?new=1 stays in the address (a reload of an empty new video is harmless, ?project= wins once saved).
  if (tpl) { const url = new URL(location.href); url.searchParams.delete("template"); history.replaceState(null, "", url); }
  if (tpl && !pid) await applyTemplate(tpl);
}

// ---------- layout ----------
function buildBar(bar) {
  const slot = document.createElement("div");
  slot.className = "mx-bar-actions vx-baract";
  slot.innerHTML = `<input class="ad-input vx-name" id="vxName" aria-label="Project name" maxlength="80">
    <span class="vx-saved" id="vxSaved" aria-live="polite"></span>
    <div class="vx-pill" id="vxPill" role="group" aria-label="Edit the video">
    <button class="btn sq" id="bUndo" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" disabled>${icon("undo")}</button>
    <button class="btn sq" id="bRedo" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)" disabled>${icon("redo")}</button>
    <span class="vx-psep" aria-hidden="true"></span>
    <button class="btn sm vx-pb" id="pSplit" title="Split at the playhead (S)">${icon("split")}<span>Split</span></button>
    <button class="btn sm vx-pb" id="pTrimS" title="Trim: the selected clip starts at the playhead ([)"><span>Trim start</span></button>
    <button class="btn sm vx-pb" id="pTrimE" title="Trim: the selected clip ends at the playhead (])"><span>Trim end</span></button>
    <button class="btn sm vx-pb" id="pSlip" aria-pressed="false" title="Slip: drag the selected clip on the timeline to choose which part of it plays (or hold Alt and drag)"><span>Slip</span></button>
    <label class="vx-pf" title="Speed of the selected clip"><select id="pSpeed" aria-label="Speed">${M.SPEEDS.map((v) => `<option value="${v}">${v}× speed</option>`).join("")}</select></label>
    <label class="vx-pf" title="Volume of the selected clip"><span>Volume</span><input type="range" id="pVol" min="0" max="2" step="0.05" value="1" aria-label="Volume"></label>
    <label class="vx-pf" title="Transition into the selected clip"><select id="pTrans" aria-label="Transition">${Object.entries(M.TRANSITIONS).map(([k, v]) => `<option value="${k}">${k === "none" ? "No transition" : esc(v)}</option>`).join("")}</select></label>
    <span class="vx-psep" aria-hidden="true"></span>
    <label class="vx-pf" title="Add text at the playhead"><select id="pText" aria-label="Add text"><option value="">Add text…</option>${Object.entries(M.TEXT_STYLES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select></label>
    <input type="color" id="pColor" class="vx-pcolor" value="#ffffff" aria-label="Text colour" title="Text colour">
    <button class="btn sm sq" id="pBold" aria-pressed="false" aria-label="Bold text" title="Bold text"><b>B</b></button>
    <button class="btn sm vx-pedit" id="pEdit" title="Edit the selected clip">${icon("edit")}<span>Edit</span></button>
    <span class="vx-psep" aria-hidden="true"></span>
    <button class="btn sm" id="bProjects">Projects</button>
    <button class="btn primary sm" id="bExport">Export</button></div>`;
  bar.append(slot);
}
function buildUi(root) {
  root.innerHTML = `<div class="vx" id="vx">
  <aside class="vx-side vx-sheet" id="side" aria-label="Add media, text and sound">
    <div class="vx-sheet-head"><b id="sideTitle">Media</b><button class="btn" data-close>Done</button></div>
    <div class="ad-tabs vx-tabs" role="tablist" aria-label="Panels">
      <button role="tab" data-tab="media">Media</button><button role="tab" data-tab="text">Text</button><button role="tab" data-tab="audio">Audio</button><button role="tab" data-tab="canvas">Canvas</button>${S.yt ? '<button role="tab" data-tab="youtube">YouTube</button>' : ""}
    </div>
    <div class="vx-panel" id="panel" role="tabpanel"></div>
  </aside>
  <section class="vx-stage" aria-label="Preview">
    <div class="vx-preview" id="pvWrap"><canvas id="pv" role="img" aria-label="Video preview"></canvas>
      <div class="vx-empty" id="empty" hidden></div>
      <div class="vx-busy" id="busy" hidden><span class="spin" aria-hidden="true"></span><span id="busyText"></span></div>
    </div>
    <div class="vx-transport" role="toolbar" aria-label="Playback">
      <button class="ic" id="bStart" aria-label="Go to start (Home)" title="Start">${icon("start")}</button>
      <button class="ic" id="bBack" aria-label="Back one frame (Left arrow)" title="Back one frame">${icon("back")}</button>
      <button class="ic play" id="bPlay" aria-label="Play (Space)" title="Play / pause">${icon("play")}</button>
      <button class="ic" id="bFwd" aria-label="Forward one frame (Right arrow)" title="Forward one frame">${icon("fwd")}</button>
      <button class="ic" id="bEnd" aria-label="Go to end (End)" title="End">${icon("end")}</button>
      <span class="mx-time vx-time" id="time" aria-live="off">0:00.0 / 0:00.0</span>
      <span class="mx-grow"></span>
      <button class="btn vx-tbtn" id="bSplit" title="Split at the playhead (S)">${icon("split")}<span>Split</span></button>
      <button class="btn vx-tbtn" id="bDel" title="Delete the selected clip (Delete)">${icon("del")}<span>Delete</span></button>
    </div>
  </section>
  <aside class="vx-inspect vx-sheet" id="inspect" aria-label="Selected clip"></aside>
  <section class="vx-tl" id="tl" aria-label="Timeline">
    <div class="vx-tl-grip" id="tlGrip" role="separator" aria-orientation="horizontal" aria-label="Timeline height (drag, or arrow keys)" tabindex="0"></div>
    <div class="vx-tl-bar">
      <span class="vx-tl-title">Timeline</span><span class="mx-hint" id="tlHint">Drag clips to reorder · drag the edges to trim</span><span class="mx-grow"></span>
      <button class="btn sm" id="tlAddMedia" title="Add videos, photos or a blank page to the main track" aria-haspopup="menu">+ Add media</button>
      <button class="btn sm" id="tlAddAudio" title="Add music, sound effects or your voice">+ Add audio</button>
      <button class="ic sm" id="zOut" aria-label="Zoom out">−</button>
      <input type="range" id="zoom" min="0" max="100" value="40" aria-label="Timeline zoom">
      <button class="ic sm" id="zIn" aria-label="Zoom in">+</button>
      <button class="btn sm" id="zFit">Fit</button>
    </div>
    <div class="vx-tl-body">
      <div class="vx-tl-labels" id="tlLabels"></div>
      <div class="vx-tl-scroll" id="tlScroll"><div class="vx-tl-inner" id="tlInner"></div></div>
    </div>
  </section>
  <nav class="vx-phonebar" aria-label="Tools">
    <button data-sheet="media">${icon("media")}<span>Media</span></button><button data-sheet="text">${icon("text")}<span>Text</span></button>
    <button data-sheet="audio">${icon("audio")}<span>Audio</span></button><button data-sheet="canvas">${icon("canvas")}<span>Canvas</span></button>
    ${S.yt ? `<button data-sheet="youtube">${icon("yt")}<span>YouTube</span></button>` : ""}<button data-sheet="edit" id="pbEdit">${icon("edit")}<span>Edit</span></button>
  </nav>
</div>
<input type="file" id="fileIn" multiple accept="video/*,image/*,audio/*,.mkv,.mov,.m4a,.mp3,.wav,.ogg,.flac,.webm" hidden>
<input type="file" id="audioIn" multiple accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm" hidden>`;
  for (const id of ["vx", "side", "panel", "pv", "pvWrap", "empty", "busy", "busyText", "inspect", "tlInner", "tlScroll", "tlLabels", "time", "zoom", "fileIn", "audioIn", "sideTitle"]) els[id] = document.getElementById(id);
  els.name = $("#vxName"); els.saved = $("#vxSaved"); els.pill = $("#vxPill");
  bindUi(); bindPill();
}

// ---------- state changes ----------
const snap = () => JSON.stringify({ ...S.p, media: undefined });
function checkpoint(state = snap()) { S.undo.push(state); if (S.undo.length > 60) S.undo.shift(); S.redo = []; }
function restore(json) { const q = M.normalizeProject(JSON.parse(json)); q.media = S.p.media; q.id = S.p.id; S.p = q; }
/** Call after changing S.p. light = during a drag (no inspector rebuild, no save). */
function changed({ history = false, save = true, light = false, inspector = !light, seek = true } = {}) {
  if (history) checkpoint(history === true ? undefined : history);
  if (S.sel && !M.findClip(S.p, S.sel)) S.sel = null;
  player.set(S.p);
  if (S.t > player.total) S.t = player.total;
  renderTimeline();
  if (inspector) renderInspector();
  if (!light) renderPanel();
  renderChrome();
  if (seek) player.seek(S.t);
  if (save) scheduleSave();
}
function undo() { if (!S.undo.length) return; S.redo.push(snap()); restore(S.undo.pop()); changed(); }
function redo() { if (!S.redo.length) return; S.undo.push(snap()); restore(S.redo.pop()); changed(); }

// ---------- saving ----------
let saveTimer = 0;
function scheduleSave() { clearTimeout(saveTimer); setSaved("Saving…"); saveTimer = setTimeout(saveNow, 1000); }
function setSaved(t) { S.saved = t; if (els.saved) els.saved.textContent = t; shell?.setSaved(t === "Saving…" ? "saving" : t === "Not saved" ? "unsaved" : "saved"); }
async function saveNow() {
  clearTimeout(saveTimer);
  const empty = !S.p.video.length && !S.p.text.length && !S.p.audio.length && !Object.keys(S.p.media).length;
  if (empty) { setSaved(""); return; }
  try {
    S.p.yt = S.yt;
    await saveProject({ id: S.p.id, app: "video", name: S.p.name, data: S.p, thumb: snapshot(player, 240), duration: player.total });
    setSaved("Saved");
    const url = new URL(location.href);
    if (url.searchParams.get("project") !== S.p.id) { url.searchParams.set("project", S.p.id); history.replaceState(null, "", url); }
  } catch (e) { setSaved("Not saved"); toast("Couldn't save in this browser: " + (e?.message || "storage error")); }
}
async function openProject(id) {
  const rec = await getProject(id).catch(() => null);
  if (!rec || rec.app !== "video") { toast("That project isn't in this browser any more."); return; }
  S.p = M.normalizeProject(rec.data); S.p.id = rec.id; S.presetChosen = true;
  if (rec.data?.yt && !S.yt) { const u = new URL(location.href); u.searchParams.set("preset", "youtube"); location.replace(u); return; }
  busy(+1, "Opening your project…");
  const missing = [];
  await Promise.all(Object.values(S.p.media).map(async (m) => {
    const r = await getMedia(m.id).catch(() => null);
    if (!r?.blob) { missing.push(m.name); return; }
    assets.add(m.id, r.blob);
    if (m.kind === "image") await assets.loadImage(m.id).catch(() => {});
    else if (m.hasAudio !== false) assets.loadSound(m.id).then((b) => { if (S.p.media[m.id]) S.p.media[m.id].hasAudio = !!b; });
  }));
  busy(-1);
  if (missing.length) toast(`Missing file${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Add ${missing.length > 1 ? "them" : "it"} again.`, 6000);
}

// ---------- import ----------
const kindOf = (f) => {
  const t = f.type || "", n = (f.name || "").toLowerCase();
  if (t.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|avif)$/.test(n)) return "image";
  if (t.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|oga|flac|aac|opus)$/.test(n)) return "audio";
  if (t.startsWith("video/") || /\.(mp4|webm|mov|mkv|m4v|avi|ogv|3gp)$/.test(n)) return "video";
  return null;
};
function busy(d, text) { S.busy = Math.max(0, S.busy + d); els.busy.hidden = !S.busy; if (text) els.busyText.textContent = text; }
async function thumbOf(src, sw, sh) {
  const c = document.createElement("canvas"); c.width = 160; c.height = 90;
  const r = fitRect(sw, sh, 160, 90, "cover"); const x = c.getContext("2d"); x.fillStyle = "#111"; x.fillRect(0, 0, 160, 90);
  try { x.drawImage(src, r.x, r.y, r.w, r.h); return c.toDataURL("image/jpeg", 0.7); } catch { return ""; }
}
/** Reads one file into the project's media library (and this browser's storage). */
async function importOne(blob, kind, name = blob.name || "clip") {
  const id = uid();
  const m = { id, kind, name, mime: blob.type || "", duration: 0, w: 0, h: 0, hasAudio: false, thumb: "", size: blob.size };
  assets.add(id, blob);
  try {
    if (kind === "video") {
      const info = await probeVideo(blob, { keep: true });
      try {
        Object.assign(m, { duration: info.duration, w: info.width, h: info.height });
        if (!(m.duration > 0)) throw new Error("This video has no length the browser can read. Convert it to MP4 first.");
        await seekTo(info.el, Math.min(0.5, m.duration / 4));
        m.thumb = await thumbOf(info.el, m.w, m.h);
      } finally { info.el.remove(); info.el.removeAttribute("src"); info.el.load(); URL.revokeObjectURL(info.url); }
      m.hasAudio = null;
      // Decoding the sound can take a while; it may finish before or after the media is added to the project.
      assets.loadSound(id).then((b) => { m.hasAudio = !!b; const mm = S.p.media[id]; if (mm) { mm.hasAudio = !!b; renderInspector(); scheduleSave(); } });
    } else if (kind === "image") {
      const b = await assets.loadImage(id).catch(() => { throw new Error(`${name}: this picture can't be opened in this browser.`); });
      Object.assign(m, { w: b.width, h: b.height, thumb: await thumbOf(b, b.width, b.height) });
      const an = assets.anim(id); // an animated GIF plays like a short clip (it loops when made longer)
      if (an) Object.assign(m, { duration: Math.round(an.dur * 1000) / 1000, animated: true, frames: an.frames.length });
    } else {
      const b = await assets.loadSound(id);
      if (!b) throw new Error(`${name}: this browser can't play this sound file. Try MP3, WAV or M4A.`);
      Object.assign(m, { duration: b.duration, hasAudio: true, peaks: peaksOf(b) });
    }
  } catch (e) { assets.remove(id); if (e.code === "UNPLAYABLE") e.message = `${name}: ${e.message}`; throw e; }
  if (blob.size > (await storageLeft())) toast("This browser is low on storage, so this file may not be kept for next time.", 5000);
  await putMedia({ id, project: S.p.id, name, type: blob.type, blob }).catch(() => toast("Couldn't keep this file in the browser storage. It works until you close the page."));
  M.addMedia(S.p, m);
  return S.p.media[id];
}
function autoPreset(m) {
  if (S.presetChosen || S.yt || S.p.video.length > 1 || !(m.w > 0 && m.h > 0)) return;
  const r = m.w / m.h;
  const best = Object.values(M.PRESETS).sort((a, b) => Math.abs(Math.log(a.w / a.h / r)) - Math.abs(Math.log(b.w / b.h / r)))[0];
  if (best.id !== S.p.preset) { S.p.preset = best.id; toast(`Canvas set to ${best.short} to match your video. Change it under Canvas.`); }
  S.presetChosen = true;
}
async function importFiles(files, { audioOnly = false } = {}) {
  const list = [...files];
  let last = null;
  for (const f of list) {
    const kind = audioOnly ? "audio" : kindOf(f);
    if (!kind) { toast(`${f.name}: please choose a video, picture or sound file.`); continue; }
    busy(+1, `Adding ${f.name}…`);
    try {
      const before = snap();
      const m = await importOne(f, kind);
      checkpoint(before);
      last = addToTimeline(m);
    } catch (e) { showError(e); }
    finally { busy(-1); }
  }
  if (last) { S.sel = last.id; changed(); }
  return last;
}
/** The main track's + button: upload, a blank page, a colour scene, or a file already in this project. */
function openPlusMenu(anchor) {
  document.querySelector(".vx-plusmenu")?.remove();
  const m = hEl("div", "vx-plusmenu", `<button data-pm="upload">Videos or photos from this device…</button><button data-pm="blank">Blank page (white)</button><button data-pm="black">Blank page (black)</button><button data-pm="scene">Colour scene</button><button data-pm="record">Record yourself…</button>`);
  m.setAttribute("role", "menu");
  m.querySelectorAll("button").forEach((b) => b.setAttribute("role", "menuitem"));
  document.body.append(m);
  const r = anchor.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(innerWidth - 260, r.left)) + "px"; m.style.top = Math.max(8, r.top - m.offsetHeight - 6) + "px";
  const close = () => { m.remove(); document.removeEventListener("pointerdown", out, true); };
  const out = (e) => { if (!m.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener("pointerdown", out, true));
  m.addEventListener("click", (e) => {
    const k = e.target.closest("[data-pm]")?.dataset.pm; if (!k) return;
    close();
    if (k === "upload") els.fileIn.click();
    else if (k === "blank") addScene({ bg: ["#ffffff", "#ffffff"], art: "none", name: "Blank page" });
    else if (k === "black") addScene({ bg: ["#000000", "#000000"], art: "none", name: "Blank page" });
    else if (k === "scene") addScene({ bg: ["#5b4cf0", "#2f80ff"], art: "circles" });
    else if (k === "record") location.href = "/design/recorder/";
  });
  m.querySelector("button")?.focus();
  return m;
}
/** Puts a picture on the overlay (upper) track at the playhead: top right, 30% wide, 4 s (or to the end of the video). */
function addPictureOverlay(m) {
  if (!m || !(m.kind === "image" || m.kind === "video")) { toast("Overlays are pictures or videos: add a photo, logo, sticker or clip."); return null; }
  const before = snap(), total = player.total;
  const start = total > 0 && S.t < total - 0.2 ? S.t : 0;
  const dur = m.kind === "video" ? Math.max(M.MIN_LEN, total > 0 ? Math.min(m.duration, total - start) : m.duration) : total > 0 ? Math.max(1, Math.min(4, total - start)) : 4;
  const c = M.addOverlay(S.p, m, { start, dur });
  checkpoint(before); S.sel = c.id; changed();
  toast(m.kind === "video" ? "Video added on top (picture-in-picture). Drag it on the preview to move it." : "Picture added on top of the video. Drag it on the preview to move it.");
  return c;
}
/** Main track <-> overlay (upper) track, like dragging a clip between tracks. */
function moveTrack(to) {
  const f = S.sel && M.findClip(S.p, S.sel); if (!f) return null;
  const before = snap(), c = to === "overlay" ? M.moveToOverlay(S.p, f.clip.id) : M.moveToMain(S.p, f.clip.id);
  if (!c) { toast("This clip can't move to that track."); return null; }
  checkpoint(before); S.sel = c.id; changed();
  toast(to === "overlay" ? "Moved to the overlay track: it plays on top of the video now." : "Moved to the main track.");
  return c;
}
function addToTimeline(m, opts = {}) {
  if (m.kind === "audio") return M.addAudioClip(S.p, m, { start: opts.start ?? (S.t < player.total - 0.1 ? S.t : 0) });
  const c = M.addVideoClip(S.p, m, opts);
  if (m.animated && m.duration > 0) M.setTrim(S.p, c.id, { dur: Math.max(1, m.duration) });
  if (S.p.video.length === 1) autoPreset(m);
  return c;
}
async function applyHandoff(payload) {
  if (!payload) { toast("That link has expired. Open the file again."); return; }
  try {
    if (payload.type === "video-media" || payload.type === "audio-media") {
      const blob = payload.blob;
      const kind = payload.type === "audio-media" ? "audio" : kindOf({ type: blob.type, name: payload.name || "" }) || "video";
      busy(+1, "Adding your recording…");
      const m = await importOne(blob, kind, payload.name || (kind === "audio" ? "Recording.webm" : "Recording.webm"));
      const tr = payload.trim || {};
      let c;
      if (kind === "audio") { c = M.addAudioClip(S.p, m, { start: 0 }); if (tr.start != null || tr.end != null) M.setTrim(S.p, c.id, { inT: tr.start || 0, outT: tr.end ?? m.duration }); }
      else c = M.addVideoClip(S.p, m, { inT: tr.start || 0, outT: tr.end ?? null });
      if (kind === "video") autoPreset(m);
      S.sel = c.id;
      toast(kind === "audio" ? "Your recording is on the audio track." : "Your recording is on the timeline.");
    } else if (payload.type === "captions") {
      const added = M.addCaptions(S.p, payload.lines || []);
      if (added[0]) S.sel = added[0].id;
      toast(`Added ${added.length} caption${added.length === 1 ? "" : "s"}. Add your video and voice under them.`, 5000);
    } else toast("That item can't be opened in the video editor.");
  } catch (e) { showError(e); } finally { if (payload.type?.endsWith("-media")) busy(-1); }
}
function showError(e) {
  const msg = e?.message || String(e);
  toast(msg, 6000);
  if (e?.code === "UNPLAYABLE") showEmptyNote(`${msg} <a href="?mode=convert">Open Convert to MP4</a>`);
}
function showEmptyNote(html) { const n = $("#emptyNote"); if (n) { n.innerHTML = html; n.hidden = false; } }

// ---------- rendering: chrome, panel, inspector ----------
function renderChrome() {
  const p = S.p;
  if (document.activeElement !== els.name) els.name.value = p.name;
  $("#bUndo").disabled = !S.undo.length; $("#bRedo").disabled = !S.redo.length;
  const f = S.sel && M.findClip(p, S.sel);
  $("#bDel").disabled = !f;
  const r = f && M.clipRange(p, S.sel);
  $("#bSplit").disabled = !((r && r.start + M.MIN_LEN < S.t && S.t < r.end - M.MIN_LEN) || M.videoEntryAt(p, S.t));
  $("#pbEdit").disabled = !f;
  const empty = !p.video.length && !p.audio.length && !p.text.length;
  els.empty.hidden = !empty;
  if (empty && !els.empty.dataset.built) buildEmpty();
  const pr = M.PRESETS[p.preset];
  els.pvWrap.style.setProperty("--ar", `${pr.w} / ${pr.h}`);
  sizeCanvas();
  updateTime();
  renderPill(f);
  if (shell && document.activeElement?.classList?.contains("ads-title") !== true) shell.setTitle(p.name);
}
function buildEmpty() {
  els.empty.dataset.built = "1";
  els.empty.innerHTML = `<div class="vx-empty-in"><h2>Start your video</h2>
    <p>Add videos, photos and music. Everything stays on your device.</p>
    <button class="btn primary big" data-act="pick">Add videos, photos or music</button>
    <p class="mx-hint">or drop files here</p>
    <div class="mx-msg err" id="emptyNote" hidden></div>
    <div class="vx-empty-links"><a href="?mode=trim">Video trimmer</a><a href="?mode=convert">Convert to MP4</a><a href="/design/recorder/">Record screen or camera</a></div>
    <div class="vx-recent" id="recent"></div></div>`;
  listProjects("video").then((list) => {
    const r = $("#recent"); if (!r) return;
    list = list.filter((x) => x.id !== S.p.id).slice(0, 3);
    if (!list.length) return;
    r.innerHTML = `<p class="mx-hint">Recent projects</p>` + list.map((x) => `<a class="vx-recent-item" href="?project=${esc(x.id)}${x.data?.yt ? "&preset=youtube" : ""}">${x.thumb ? `<img alt="" src="${esc(x.thumb)}">` : '<span class="ph"></span>'}<span>${esc(x.name)}</span></a>`).join("");
  }).catch(() => {});
}
const sideTitles = { media: "Media", text: "Text", audio: "Audio", canvas: "Canvas", youtube: "YouTube" };
function renderPanel() {
  $$(".vx-tabs [data-tab]").forEach((b) => { b.classList.toggle("on", b.dataset.tab === S.tab); b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)); });
  els.sideTitle.textContent = sideTitles[S.tab] || "";
  const p = S.p, P = els.panel, media = Object.values(p.media);
  if (S.tab === "media") {
    const vis = media.filter((m) => m.kind !== "audio");
    P.innerHTML = `<label class="btn primary block" for="fileIn">Add videos or photos</label>
      <p class="mx-hint">MP4, WebM, MOV and pictures. Click a file to add it to the end of the video.</p>
      <div class="vx-lib">${vis.map(libItem).join("") || '<p class="mx-hint">Nothing added yet.</p>'}</div>`;
  } else if (S.tab === "text") {
    P.innerHTML = `<p class="mx-hint">Adds text at the playhead (${fmtTime(S.t, true)}).</p>
      <div class="vx-styles">${Object.entries(M.TEXT_STYLES).map(([k, s]) => `<button class="vx-style vx-style-${k}" data-text="${k}"><span>${esc(s.label)}</span></button>`).join("")}</div>
      <p class="mx-hint">Select a text on the timeline to change its words, font, colour, position and animation. Drag it on the preview to move it.</p>`;
  } else if (S.tab === "audio") {
    const au = media.filter((m) => m.kind === "audio");
    P.innerHTML = `<label class="btn primary block" for="audioIn">Add music or sound</label>
      <p class="mx-hint">MP3, WAV, M4A or OGG. It is placed at the playhead. Tip: set music to about 30% under speech.</p>
      <div class="vx-lib">${au.map(libItem).join("") || '<p class="mx-hint">No sounds yet.</p>'}</div>
      <p class="mx-hint">Need a voiceover? <a href="/design/voice/">Text to speech voiceover</a> or <a href="/design/recorder/">record your voice</a>.</p>`;
  } else if (S.tab === "canvas") {
    P.innerHTML = `<h4>Size</h4><div class="vx-presets">${Object.values(M.PRESETS).map((pr) => `<button class="vx-preset${pr.id === p.preset ? " on" : ""}" data-preset="${pr.id}" aria-pressed="${pr.id === p.preset}"><i style="aspect-ratio:${pr.w}/${pr.h}"></i><span>${esc(pr.label)}</span><small>${pr.w}×${pr.h}</small></button>`).join("")}</div>
      <h4>Background</h4><p class="mx-hint">Shown when a clip doesn't fill the frame.</p>
      <div class="mx-seg" role="group" aria-label="Background"><button data-bg="blur" aria-pressed="${p.background.mode === "blur"}">Blurred clip</button><button data-bg="color" aria-pressed="${p.background.mode === "color"}">Colour</button></div>
      <label class="mx-field vx-inline"><span>Colour</span><input type="color" id="bgColor" value="${esc(p.background.color)}"></label>
      <div class="vx-swatches">${loadBrand().colors.map((c) => `<button class="sw" data-swatch="${esc(c)}" style="background:${esc(c)}" aria-label="Use colour ${esc(c)}"></button>`).join("")}</div>`;
  } else if (S.tab === "youtube") renderYoutube(P);
}
function libItem(m) {
  const kindLabel = m.animated ? "GIF" : { video: "Video", image: "Photo", audio: "Sound" }[m.kind];
  return `<div class="vx-libitem" data-media="${esc(m.id)}"><button class="vx-libadd" data-add="${esc(m.id)}" aria-label="Add ${esc(m.name)} to the timeline">
    ${m.thumb ? `<img alt="" src="${esc(m.thumb)}">` : `<span class="ph">${m.kind === "audio" ? icon("audio") : ""}</span>`}
    <span class="nm">${esc(m.name)}</span><small>${kindLabel}${m.duration ? " · " + fmtTime(m.duration) : ""}</small></button>
    ${m.kind === "image" || m.kind === "video" ? `<button class="vx-libov" data-ov="${esc(m.id)}" aria-label="Add ${esc(m.name)} on top of the video (overlay track)" title="Put it on top of the video at the playhead">+ Overlay</button>` : ""}
    ${M.mediaInUse(S.p, m.id) ? "" : `<button class="vx-libdel" data-unmedia="${esc(m.id)}" aria-label="Remove ${esc(m.name)} from this project">×</button>`}</div>`;
}
function renderYoutube(P) {
  const p = S.p, total = player.total, probs = checkChapters(p.chapters, total);
  const rows = [...p.chapters].map((c, i) => ({ c, i })).sort((a, b) => a.c.t - b.c.t);
  P.innerHTML = `<h4>Chapters</h4><p class="mx-hint">Shown on YouTube when you paste them into the description.</p>
    <div class="vx-chapters">${rows.map(({ c, i }) => `<div class="vx-chap"><input class="ad-input t" data-chap-t="${i}" value="${fmtChapterTime(c.t, total)}" aria-label="Chapter ${i + 1} time" inputmode="numeric">
      <input class="ad-input" data-chap-title="${i}" value="${esc(c.title)}" placeholder="Chapter title" aria-label="Chapter ${i + 1} title"><button class="ic sm" data-chap-del="${i}" aria-label="Remove chapter ${i + 1}">×</button></div>`).join("")}</div>
    <div class="mx-row"><button class="btn" data-act="chapAdd">Add chapter at ${fmtChapterTime(S.t, total)}</button><button class="btn" data-act="chapCopy" ${p.chapters.length ? "" : "disabled"}>Copy chapters</button></div>
    ${probs.length ? `<ul class="vx-probs">${probs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : p.chapters.length ? '<p class="mx-msg ok">Chapters look good for YouTube.</p>' : ""}
    <textarea class="ad-input vx-chaptext" id="chapText" rows="4" readonly aria-label="Chapters text for the description">${esc(chaptersText(p.chapters, total))}</textarea>
    <h4>Layout help</h4>
    <label class="vx-check"><input type="checkbox" id="guides" ${S.guides ? "checked" : ""}> Show safe area (not exported)</label>
    <div class="mx-row"><button class="btn" data-act="endscreen">${p.video.some((c) => c.kind === "endscreen") ? "Select end screen" : "Add end screen"}</button></div>
    <p class="mx-hint">The end screen leaves room for YouTube's end-screen elements. Add the real links in YouTube Studio at the same spots (last 5 to 20 seconds).</p>
    <h4>Publish</h4><p class="mx-hint">Export MP4 (1080p), then upload it in YouTube Studio and paste the chapters into the description. AsaanDesk does not sign in to your YouTube account.</p>
    <h4>Thumbnail</h4>
    <div class="mx-row"><a class="btn" href="/design/studio/?preset=youtube-thumbnail" target="_blank" rel="noopener">Make a thumbnail</a><button class="btn" data-act="frame">Save this frame (PNG)</button></div>`;
}

const field = (label, html, hint = "") => `<label class="mx-field"><span>${label}${hint ? ` <small>${hint}</small>` : ""}</span>${html}</label>`;
const range = (k, v, min, max, step, label) => `<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}" aria-label="${label}">`;
const seg = (k, opts, v, label) => `<div class="mx-seg" role="group" aria-label="${label}">${opts.map(([val, txt]) => `<button data-seg="${k}" data-v="${val}" aria-pressed="${String(val) === String(v)}">${txt}</button>`).join("")}</div>`;
const sel = (k, opts, v, label) => `<select class="ad-input" data-k="${k}" aria-label="${label}">${Object.entries(opts).map(([val, txt]) => `<option value="${val}"${val === v ? " selected" : ""}>${esc(txt)}</option>`).join("")}</select>`;
function renderInspector() {
  const I = els.inspect, f = S.sel && M.findClip(S.p, S.sel);
  const head = (title) => `<div class="vx-sheet-head"><b>${title}</b><button class="btn" data-close>Done</button></div>`;
  const multi = multiIds();
  if (multi.length > 1) {
    // Timing panel for several clips (Shift + click on the timeline): one exact length for all of them
    const lens = multi.map((id) => { const r = M.clipRange(S.p, id); return r ? r.end - r.start : 0; });
    I.innerHTML = `${head(`${multi.length} clips`)}<div class="vx-multi"><p><b>${multi.length} clips selected</b> <small class="mx-hint">(Shift + click a clip to add or remove it)</small></p>
      ${field("Length of each clip (s)", `<input class="ad-input" type="number" id="multiLen" min="0.1" step="0.1" value="${(lens[0] || 3).toFixed(1)}" aria-label="Length of each selected clip in seconds">`, "videos and sounds can't grow past their file")}
      <div class="mx-row vx-actions"><button class="btn primary" data-act="multiLen">Set length</button><button class="btn" data-act="multiNone">Select one</button><button class="btn danger" data-act="multiDel">Delete ${multi.length} clips</button></div></div>`;
    return;
  }
  if (!f) {
    const pr = M.PRESETS[S.p.preset], sz = exportSize(S.p.preset, 1080);
    I.innerHTML = `${head("Edit")}<div class="vx-insp-empty"><p><b>Select a clip</b> on the timeline to trim it, change speed, volume, fades and transitions, or edit text.</p>
      <dl class="vx-facts"><dt>Length</dt><dd>${fmtTime(player.total, true)}</dd><dt>Size</dt><dd>${esc(pr.label)} · ${sz.w}×${sz.h}</dd><dt>Clips</dt><dd>${S.p.video.length} video · ${S.p.text.length} text · ${S.p.audio.length} sound</dd></dl>
      <p class="mx-hint">Keys: Space play · S split · Delete · Ctrl+D duplicate · [ ] trim to playhead · ← → one frame</p></div>`;
    return;
  }
  const c = f.clip, m = S.p.media[c.mediaId], r = M.clipRange(S.p, c.id);
  const canReplace = f.track !== "text" && c.kind !== "endscreen";
  const canExtract = f.track === "video" && c.kind === "video" && m?.hasAudio !== false;
  const actions = `<div class="mx-row vx-actions"><button class="btn" data-act="split">Split</button><button class="btn" data-act="dup">Duplicate</button>${canReplace ? '<button class="btn" data-act="replace">Replace</button>' : ""}<button class="btn danger" data-act="del">Delete</button></div>
    ${canExtract ? `<div class="mx-row vx-actions"><button class="btn sm" data-act="extract" title="The sound becomes its own clip on the audio track and this clip is muted">Extract audio</button>${m?.hasAudio ? '<button class="btn sm" data-act="autotrim" title="Cuts quiet parts at the start and end of this clip">Trim silent start and end</button>' : ""}</div>` : ""}
    ${f.track === "audio" && m?.hasAudio !== false ? '<div class="mx-row vx-actions"><button class="btn sm" data-act="autotrim" title="Cuts quiet parts at the start and end of this sound">Trim silent start and end</button></div>' : ""}`;
  const fades = f.track === "text" ? "" : `<div class="mx-row">${field("Fade in", range("fadeIn", c.fadeIn, 0, 3, 0.1, "Fade in seconds"), `${c.fadeIn.toFixed(1)} s`)}${field("Fade out", range("fadeOut", c.fadeOut, 0, 3, 0.1, "Fade out seconds"), `${c.fadeOut.toFixed(1)} s`)}</div>`;
  const first = f.track === "video" && f.index === 0;
  const trans = f.track === "video" ? `<h4>Transition into this clip</h4>${first ? '<p class="mx-hint">Transitions go between two clips. Add another clip before this one.</p>' :
    `${sel("transition.type", M.TRANSITIONS, c.transition?.type || "none", "Transition")}${c.transition?.type && c.transition.type !== "none" ? field("Duration", `<div class="vx-speed">${range("transition.dur", c.transition.dur, 0.1, 2.5, 0.1, "Transition seconds")}<input class="ad-input vx-num" type="number" data-k="transition.dur" min="0.1" max="2.5" step="0.1" value="${(c.transition.dur || 0.5).toFixed(1)}" aria-label="Transition seconds, 0.1 to 2.5"></div>`, `${(c.transition.dur || 0).toFixed(1)} s`) : ""}
    ${M.DIR_TRANSITIONS.has(c.transition?.type) ? field("Direction", sel("transition.dir", M.DIRECTIONS, M.DIRECTIONS[c.transition.dir] ? c.transition.dir : "left", "Transition direction")) : ""}`}` : "";
  const timeRow = `<p class="vx-when">${fmtTime(r.start, true)} → ${fmtTime(r.end, true)} <small>(${fmtTime(r.end - r.start, true)})</small></p>`;
  let html = "";
  if (f.track === "overlay") {
    const corners = [["0.22,0.24", "Top left"], ["0.78,0.24", "Top right"], ["0.5,0.5", "Centre"], ["0.22,0.76", "Bottom left"], ["0.78,0.76", "Bottom right"]];
    const isVid = m?.kind === "video", osr = isVid && M.slipRange(S.p, c.id);
    html = `${head(isVid ? "Video overlay" : "Picture overlay")}<p class="vx-clipname">${esc(m?.name || "Picture")}</p>${timeRow}
      ${isVid ? volumeFields(c, m.hasAudio !== false) : ""}
      ${osr && osr.max > 0.01 ? field("Slip: which part plays", range("slip", c.in || 0, 0, osr.max, 0.01, "Slip: which part of the file plays"), `from ${(c.in || 0).toFixed(2)} s`) : ""}
      ${field("Size", range("w", c.w, 0.05, 1, 0.01, "Overlay size"), `${Math.round(c.w * 100)}%`)}
      ${field("Opacity", range("opacity", c.opacity, 0.1, 1, 0.05, "Overlay opacity"), `${Math.round(c.opacity * 100)}%`)}
      <div class="mx-seg vx-corners" role="group" aria-label="Place the picture">${corners.map(([v, l]) => `<button data-seg="corner" data-v="${v}" aria-pressed="${Math.abs(c.x - Number(v.split(",")[0])) < 0.01 && Math.abs(c.y - Number(v.split(",")[1])) < 0.01}">${l}</button>`).join("")}</div>
      <div class="mx-row">${field("Left ↔ right", range("x", c.x, 0, 1, 0.01, "Horizontal position"))}${field("Up ↕ down", range("y", c.y, 0, 1, 0.01, "Vertical position"))}</div>
      <div class="mx-row">${field("Starts at (s)", `<input class="ad-input" type="number" data-k="start" min="0" step="0.1" value="${c.start.toFixed(1)}">`)}${field("Length (s)", `<input class="ad-input" type="number" data-k="dur" min="0.1" step="0.1" value="${c.dur.toFixed(1)}">`)}</div>
      ${fades}<div class="mx-row">${field("Animation in", sel("animIn", M.ANIMS, c.animIn || "none", "Animation in"))}${field("Animation out", sel("animOut", M.ANIMS, c.animOut === "typewriter" ? "fade" : c.animOut || "none", "Animation out"))}</div>
      ${animDurFields(c)}${lookFields(c)}<p class="mx-hint">Drag the picture on the preview to move it. On the overlay (upper) track it plays on top of the main video.</p>
      <div class="mx-row"><button class="btn sm" data-act="toMain">Move to main track</button></div>${actions}`;
  } else if (f.track === "text") {
    html = `${head("Text")}${timeRow}${field("Words", `<textarea class="ad-input" data-k="text" rows="3" aria-label="Text">${esc(c.text)}</textarea>`)}
      <div class="mx-row">${field("Font", sel("family", Object.fromEntries(Object.entries(FONT_FAMILIES).map(([k, v]) => [k, v.label])), c.family, "Font"))}${field("Colour", `<input type="color" data-k="color" value="${esc(c.color)}" aria-label="Text colour">`)}</div>
      ${field("Size", range("size", c.size, 24, 220, 2, "Text size"), `${c.size}`)}
      <div class="mx-row"><div class="mx-seg" role="group" aria-label="Style"><button data-toggle="bold" aria-pressed="${!!c.bold}"><b>B</b> Bold</button><button data-toggle="italic" aria-pressed="${!!c.italic}"><i>I</i> Italic</button></div>
      ${seg("align", [["left", "Left"], ["center", "Centre"], ["right", "Right"]], c.align, "Alignment")}</div>
      ${field("Box behind text", sel("bg", { "": "None", "#000000a6": "Dark box", "#ffffffe6": "Light box", [c.bg && !["#000000a6", "#ffffffe6"].includes(c.bg) ? c.bg : "#5b4cf0e6"]: "Colour box" }, c.bg || "", "Box behind text"))}
      ${field("Position", seg("pos", [["0.14", "Top"], ["0.5", "Middle"], ["0.86", "Bottom"]], [0.14, 0.5, 0.86].find((y) => Math.abs(y - c.y) < 0.01) ?? "", "Position"))}
      <div class="mx-row">${field("Left ↔ right", range("x", c.x, 0.05, 0.95, 0.01, "Horizontal position"))}${field("Up ↕ down", range("y", c.y, 0.05, 0.95, 0.01, "Vertical position"))}</div>
      <div class="mx-row">${field("Animation in", sel("animIn", M.ANIMS, c.animIn, "Animation in"))}${field("Animation out", sel("animOut", M.ANIMS, c.animOut === "typewriter" ? "fade" : c.animOut, "Animation out"))}</div>
      ${animDurFields(c)}
      ${c.cap ? `<div class="mx-row">${field("Word animation", sel("capAnim", M.CAPTION_ANIMS, c.capAnim || "none", "Word animation"))}${field("Word colour", `<input type="color" data-k="hl" value="${esc(c.hl || "#ffd166")}" aria-label="Colour of the word being said">`)}</div>` : ""}
      <div class="mx-row">${field("Starts at (s)", `<input class="ad-input" type="number" data-k="start" min="0" step="0.1" value="${c.start.toFixed(1)}">`)}${field("Length (s)", `<input class="ad-input" type="number" data-k="dur" min="0.1" step="0.1" value="${c.dur.toFixed(1)}">`)}</div>${actions}`;
  } else if (f.track === "audio") {
    html = `${head("Sound")}<p class="vx-clipname">${esc(m?.name || "Sound")}</p>${timeRow}
      ${volumeFields(c, true)}${fades}
      <div class="mx-row">${field("Starts at (s)", `<input class="ad-input" type="number" data-k="start" min="0" step="0.1" value="${c.start.toFixed(1)}">`)}</div>
      ${trimFields(c, m)}${speedFields(c, "pitch changes too")}
      <h4>Beat Sync</h4><p class="mx-hint">${m?.bpm ? `${m.bpm} BPM · ${B.clipBeats(c, m.beats).length} beats in this clip` : "Finds the beats of this sound on your device."}</p>
      <div class="mx-row"><button class="btn sm" data-act="beatMarks" aria-pressed="${!!c.beats}">${c.beats ? "Hide beat markers" : "Show beat markers"}</button><button class="btn sm" data-act="beatSync">Sync now</button></div>${actions}`;
  } else if (c.kind === "endscreen") {
    const es = c.endscreen;
    html = `${head("End screen")}${timeRow}${field("Length", range("dur", M.clipLen(c), 5, 20, 1, "End screen seconds"), `${M.clipLen(c)} s`)}
      ${field("Title", `<input class="ad-input" data-k="endscreen.title" value="${esc(es.title)}" maxlength="60">`)}${field("Line under it", `<input class="ad-input" data-k="endscreen.subtitle" value="${esc(es.subtitle)}" maxlength="80">`)}
      <div class="mx-row">${field("Colour 1", `<input type="color" data-k="endscreen.color1" value="${esc(es.color1)}">`)}${field("Colour 2", `<input type="color" data-k="endscreen.color2" value="${esc(es.color2)}">`)}</div>
      ${trans}${actions}`;
  } else {
    const isImg = c.kind === "image";
    html = `${head(isImg ? "Photo" : "Video clip")}<p class="vx-clipname">${esc(m?.name || "")}</p>${timeRow}
      ${isImg ? field("Show for", range("dur", M.clipLen(c), 0.5, 30, 0.5, "Photo seconds"), `${M.clipLen(c).toFixed(1)} s`) : trimFields(c, m)}
      ${isImg ? "" : speedFields(c)}
      ${isImg ? "" : volumeFields(c, m?.hasAudio !== false)}
      ${fades}${field("Fit", seg("fit", [["contain", "Fit (show all)"], ["cover", "Fill (crop)"]], c.fit, "Fit"))}${lookFields(c)}${trans}
      <div class="mx-row"><button class="btn sm" data-act="toOverlay" title="Plays on top of the main video, small in a corner (picture-in-picture)">Move to overlay track</button></div>${actions}`;
  }
  I.innerHTML = html;
}
function trimFields(c, m) {
  const max = m?.duration || c.out, sr = M.slipRange(S.p, c.id);
  return `<h4>Trim <small class="mx-hint">(seconds in the file, 0 to ${max.toFixed(1)})</small></h4>
    <div class="mx-row">${field("Start", `<input class="ad-input" type="number" data-k="in" min="0" max="${max}" step="0.1" value="${c.in.toFixed(2)}" aria-label="Trim start">`)}${field("End", `<input class="ad-input" type="number" data-k="out" min="0" max="${max}" step="0.1" value="${c.out.toFixed(2)}" aria-label="Trim end">`)}</div>
    <div class="mx-row"><button class="btn sm" data-act="inHere">Start at playhead</button><button class="btn sm" data-act="outHere">End at playhead</button></div>
    ${sr && sr.max > 0.01 ? field("Slip: which part plays", range("slip", c.in, 0, sr.max, 0.01, "Slip: which part of the file plays"), `from ${c.in.toFixed(2)} s`) + '<p class="mx-hint">Same length and place on the timeline. Or turn on Slip in the toolbar and drag the clip.</p>' : ""}`;
}
/** Crop, flip, filter and Adjust (brightness, contrast, saturation) of a video, photo or overlay. */
function lookFields(c) {
  const cr = c.crop || {}, a = c.adj || {};
  const pct = (k, v, label) => field(label, range(k, v || 0, 0, 0.45, 0.01, label), `${Math.round((v || 0) * 100)}%`);
  const adj = (k, label) => field(label, range("adj." + k, a[k] || 0, -100, 100, 1, label), `${a[k] || 0}`);
  return `<h4>Crop, flip and filter</h4>
    <div class="mx-row">${pct("crop.l", cr.l, "Crop left")}${pct("crop.r", cr.r, "Crop right")}</div>
    <div class="mx-row">${pct("crop.t", cr.t, "Crop top")}${pct("crop.b", cr.b, "Crop bottom")}</div>
    <div class="mx-row"><button class="btn sm" data-toggle="flipH" aria-pressed="${!!c.flipH}">Flip horizontal</button><button class="btn sm" data-toggle="flipV" aria-pressed="${!!c.flipV}">Flip vertical</button><button class="btn sm" data-act="lookReset">Reset look</button></div>
    ${field("Filter", sel("filter", Object.fromEntries(Object.entries(C2.FILTERS).map(([k, v]) => [k, v.label])), c.filter || "none", "Filter"))}
    <div class="mx-row">${adj("brightness", "Brightness")}${adj("contrast", "Contrast")}</div>${adj("saturation", "Saturation")}`;
}
function animDurFields(c) {
  const v = (x) => (x ?? 0.5).toFixed(1);
  return `<div class="mx-row">${field("Intro (s)", `<input class="ad-input" type="number" data-k="animInDur" min="0.1" max="10" step="0.1" value="${v(c.animInDur)}" aria-label="Intro animation seconds">`)}${field("Outro (s)", `<input class="ad-input" type="number" data-k="animOutDur" min="0.1" max="10" step="0.1" value="${v(c.animOutDur)}" aria-label="Outro animation seconds">`)}</div>`;
}
function speedFields(c, hint = "") {
  return `${field("Speed", `<div class="vx-speed">${range("speed", c.speed || 1, M.SPEED_MIN, M.SPEED_MAX, 0.05, "Speed")}<input class="ad-input vx-num" type="number" data-k="speed" min="${M.SPEED_MIN}" max="${M.SPEED_MAX}" step="0.05" value="${c.speed || 1}" aria-label="Speed, 0.25 to 2"></div>`, `${c.speed || 1}×${hint ? " · " + hint : ""}`)}
    ${seg("speed", [[0.25, "0.25×"], [0.5, "0.5×"], [1, "1×"], [1.5, "1.5×"], [2, "2×"]], c.speed || 1, "Speed presets")}`;
}
function volumeFields(c, hasAudio) {
  if (!hasAudio) return '<p class="mx-hint">This clip has no sound.</p>';
  return `<div class="mx-row vx-vol">${field("Volume", range("volume", c.volume, 0, 2, 0.05, "Volume"), `${Math.round(c.volume * 100)}%`)}
    <input class="ad-input vx-num" type="number" data-k="volumePct" min="0" max="200" step="1" value="${Math.round(c.volume * 100)}" aria-label="Volume in percent">
    <button class="btn sm" data-toggle="muted" aria-pressed="${!!c.muted}">${c.muted ? "Muted" : "Mute"}</button></div>
    <div class="mx-row"><button class="btn sm" data-act="balance" title="Sets every clip's volume so they all play about equally loud">Balance all</button><button class="btn sm" data-act="muteAll">${allMuted() ? "Unmute all sound" : "Mute all sound"}</button></div>`;
}

// ---------- timeline ----------
const ROW = { video: 58, text: 30, audio: 40, overlay: 34 };
function renderTimeline() {
  const p = S.p, pps = S.pps, total = player.total;
  const width = Math.max(els.tlScroll.clientWidth, (Math.max(total, 5) + 6) * pps);
  const lay = player.layout;
  const capList = p.text.filter((c) => c.cap), txtList = p.text.filter((c) => !c.cap);
  const tl = M.lanes(txtList), cl = M.lanes(capList), al = M.lanes(p.audio), ol = M.lanes(p.overlay || []);
  const hT = tl.count * ROW.text + 8, hC = cl.count * ROW.text + 8, hA = al.count * ROW.audio + 8, hO = ol.count * ROW.overlay + 8;
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  const step = steps.find((s) => s * pps >= 64) || 600;
  let ruler = "";
  for (let t = 0; t * pps < width; t += step) ruler += `<span class="tick" style="left:${t * pps}px">${fmtTime(t)}</span>`;
  if (S.yt) for (const ch of p.chapters) ruler += `<span class="chap" style="left:${ch.t * pps}px" title="${esc(ch.title)}"></span>`;
  const clipHtml = (c, left, w, cls, extra = "", top = 4, h = ROW.video - 8) => {
    const label = esc(c.text ?? p.media[c.mediaId]?.name ?? (c.kind === "endscreen" ? "End screen" : "Clip"));
    return `<div class="clip ${cls}${c.id === S.sel || S.multi.has(c.id) ? " sel" : ""}${S.slip && c.id === S.sel ? " slip" : ""}" data-id="${c.id}" role="button" tabindex="0" aria-pressed="${c.id === S.sel}" aria-label="${label}, ${fmtTime(left / pps, true)} to ${fmtTime((left + w) / pps, true)}" style="left:${left}px;width:${Math.max(6, w)}px;top:${top}px;height:${h}px">${extra}<span class="nm">${label}</span><span class="h l" data-edge="start" aria-hidden="true"></span><span class="h r" data-edge="end" aria-hidden="true"></span></div>`;
  };
  const vids = lay.map((e) => {
    const c = e.clip, m = p.media[c.mediaId];
    const bg = c.kind === "endscreen" ? "" : m?.thumb ? `<span class="th" style="background-image:url('${m.thumb}')"></span>` : "";
    const badges = `${c.speed !== 1 ? `<b class="bd">${c.speed}×</b>` : ""}${c.muted ? '<b class="bd">muted</b>' : ""}`;
    return clipHtml(c, e.start * pps, e.len * pps, `v k-${c.kind}`, bg + badges);
  }).join("") + lay.slice(1).map((e) => `<button class="tr${e.tIn.type !== "none" ? " on" : ""}" data-tr="${e.clip.id}" style="left:${(e.start + (M.OVERLAP_TRANSITIONS.has(e.tIn.type) ? e.tIn.dur / 2 : 0)) * pps}px" aria-label="Transition before clip ${e.index + 1}: ${M.TRANSITIONS[e.tIn.type]}" title="Transition: ${M.TRANSITIONS[e.tIn.type]}">◆</button>`).join("");
  const texts = txtList.map((c) => clipHtml(c, c.start * pps, c.dur * pps, "t", "", 4 + tl.map[c.id] * ROW.text, ROW.text - 6)).join("");
  const capsHtml = capList.map((c) => clipHtml(c, c.start * pps, c.dur * pps, "t cap", "", 4 + cl.map[c.id] * ROW.text, ROW.text - 6)).join("");
  const beatTicks = (c) => !c.beats ? "" : B.clipBeats(c, p.media[c.mediaId]?.beats).map((b) => `<i class="beat" style="left:${(b - c.start) * pps}px" aria-hidden="true"></i>`).join("");
  const auds = p.audio.map((c) => clipHtml(c, c.start * pps, M.clipLen(c) * pps, "a", `<canvas class="wave" data-wave="${c.id}" aria-hidden="true"></canvas>${beatTicks(c)}`, 4 + al.map[c.id] * ROW.audio, ROW.audio - 6)).join("");
  const ovs = (p.overlay || []).map((c) => { const m = p.media[c.mediaId]; return clipHtml({ ...c, text: m?.name || "Picture" }, c.start * pps, c.dur * pps, "o", m?.thumb ? `<span class="th" style="background-image:url('${m.thumb}')"></span>` : "", 4 + ol.map[c.id] * ROW.overlay, ROW.overlay - 6); }).join("");
  const hOv = (p.overlay || []).length ? hO : 26;
  els.tlInner.style.width = width + "px";
  els.tlInner.innerHTML = `<div class="ruler" data-row="ruler">${ruler}</div>
    <div class="row overlay" data-row="overlay" style="height:${hOv}px">${ovs || '<span class="row-empty">Overlay: pictures and videos on top (Videos panel: + Overlay)</span>'}</div>
    <div class="row video" data-row="video" style="height:${ROW.video}px">${vids || '<span class="row-empty">Add videos or photos</span>'}<button class="vx-plus" data-plus="1" style="left:${(lay.length ? lay[lay.length - 1].end * pps : 0) + 6}px" aria-label="Add media or a blank page at the end" title="Add media or a blank page">+</button></div>
    <div class="row text" data-row="text" style="height:${hT}px">${texts || '<span class="row-empty">Text overlays</span>'}</div>
    ${capList.length ? `<div class="row text captions" data-row="captions" style="height:${hC}px">${capsHtml}</div>` : ""}
    <div class="row audio" data-row="audio" style="height:${hA}px">${auds || '<span class="row-empty">Music and sounds</span>'}</div>
    <div class="ph" id="ph" style="left:${S.t * pps}px"><i></i></div><div class="drop" id="dropMark" hidden></div>`;
  els.tlLabels.innerHTML = `<div class="lb ruler"></div><div class="lb" style="height:${hOv}px">${icon("canvas")}<span>Overlay</span></div><div class="lb" style="height:${ROW.video}px">${icon("media")}<span>Video</span></div><div class="lb" style="height:${hT}px">${icon("text")}<span>Text</span></div>${capList.length ? `<div class="lb" style="height:${hC}px">${icon("text")}<span>Captions</span></div>` : ""}<div class="lb" style="height:${hA}px">${icon("audio")}<span>Audio</span></div>`;
  for (const cv of $$("canvas.wave", els.tlInner)) drawWave(cv);
}
function drawWave(cv) {
  const c = S.p.audio.find((x) => x.id === cv.dataset.wave), m = c && S.p.media[c.mediaId];
  if (!m?.peaks?.length) return;
  const w = cv.width = Math.max(4, Math.round(cv.parentElement.offsetWidth)), h = cv.height = 26, x = cv.getContext("2d");
  x.fillStyle = "rgba(255,255,255,.75)";
  const a = (c.in / m.duration) * m.peaks.length, b = (c.out / m.duration) * m.peaks.length;
  for (let i = 0; i < w; i += 2) { const v = m.peaks[Math.min(m.peaks.length - 1, Math.floor(a + ((b - a) * i) / w))] || 0; const hh = Math.max(1, v * h); x.fillRect(i, (h - hh) / 2, 1.5, hh); }
}
function updatePlayhead() {
  const ph = $("#ph"); if (ph) ph.style.left = S.t * S.pps + "px";
  if (player.playing) {
    const sc = els.tlScroll, x = S.t * S.pps;
    if (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 40);
  }
}
function updateTime() { els.time.textContent = `${fmtTime(S.t, true)} / ${fmtTime(player.total, true)}`; }
function onTime(t) { S.t = t; updatePlayhead(); updateTime(); }
function updatePlay() {
  const b = $("#bPlay"); if (!b) return;
  b.innerHTML = icon(player.playing ? "pause" : "play");
  b.setAttribute("aria-label", player.playing ? "Pause (Space)" : "Play (Space)");
  if (!player.playing) renderChrome();
}
function fitZoom() { const w = els.tlScroll.clientWidth || 600; setZoom(Math.max(8, Math.min(200, (w - 30) / Math.max(10, player.total + 2)))); }
function setZoom(pps) { S.pps = Math.max(8, Math.min(200, pps)); els.zoom.value = String(Math.round((Math.log(S.pps / 8) / Math.log(25)) * 100)); renderTimeline(); }

// ---------- preview size ----------
function sizeCanvas() {
  if (!S.p) return; // the ResizeObserver can fire while ?project= is still being read from storage
  const wrap = els.pvWrap, pr = M.PRESETS[S.p.preset];
  const bw = wrap.clientWidth - 16, bh = wrap.clientHeight - 16;
  if (bw <= 0 || bh <= 0) return;
  const k = Math.min(bw / pr.w, bh / pr.h), cw = Math.floor(pr.w * k), ch = Math.floor(pr.h * k);
  els.pv.style.width = cw + "px"; els.pv.style.height = ch + "px";
  const dpr = Math.min(2, devicePixelRatio || 1), s = Math.min(1, (Math.min(1280, Math.max(cw, ch) * dpr)) / Math.max(pr.w, pr.h));
  const W = Math.round(pr.w * s), H = Math.round(pr.h * s);
  if (els.pv.width !== W || els.pv.height !== H) { els.pv.width = W; els.pv.height = H; player.render(); }
}

// ---------- actions ----------
function select(id) { S.sel = id; S.multi?.clear(); renderTimeline(); renderInspector(); renderChrome(); }
async function seek(t) { S.t = Math.max(0, Math.min(t, player.total)); await player.seek(S.t); }
function split() {
  const before = snap();
  const b = (S.sel && M.splitAt(S.p, S.t, S.sel)) || M.splitAt(S.p, S.t);
  if (!b) { toast("Move the playhead inside a clip to split it."); return null; }
  checkpoint(before); S.sel = b.id; changed(); toast("Split. Delete a part or move it.");
  return b;
}
function del() {
  const ids = multiIds();
  if (ids.length > 1) {
    const before = snap(), n = M.removeClips(S.p, ids);
    if (n) { checkpoint(before); S.multi.clear(); S.sel = null; changed(); toast(`Deleted ${n} clips.`); }
    return;
  }
  if (!S.sel) return;
  const before = snap();
  if (M.removeClip(S.p, S.sel)) { checkpoint(before); S.sel = null; changed(); }
}
// ---------- several clips at once (Shift + click), slip, replace, extract audio, volume tools ----------
/** Ids of the clips selected with Shift + click (with the main selection), in timeline order of selection. */
function multiIds() {
  const ids = [...S.multi].filter((id) => M.findClip(S.p, id));
  if (S.sel && ids.length && !ids.includes(S.sel) && M.findClip(S.p, S.sel)) ids.unshift(S.sel);
  return ids;
}
function toggleMulti(id) {
  if (!S.multi.size && S.sel && S.sel !== id) S.multi.add(S.sel);
  if (S.multi.has(id)) S.multi.delete(id); else S.multi.add(id);
  if (S.multi.size === 1) { const only = [...S.multi][0]; S.multi.clear(); S.sel = only; }
  else S.sel = S.multi.size ? id : null;
  renderTimeline(); renderInspector(); renderChrome();
  if (S.multi.size > 1) openSheet("edit");
}
function setMultiLength(len) {
  const ids = multiIds();
  if (!(len >= M.MIN_LEN)) { toast("Type a length of 0.1 seconds or more."); return 0; }
  const before = snap(), done = M.setLengths(S.p, ids, len);
  checkpoint(before); changed();
  const short = done.filter((c) => { const r = M.clipRange(S.p, c.id); return r && r.end - r.start < len - 0.05; }).length;
  toast(`${done.length} clips set to ${len} s${short ? ` (${short} can't be longer than their file)` : ""}.`);
  return done.length;
}
const soundCount = () => S.p.video.filter((c) => c.kind === "video" && S.p.media[c.mediaId]?.hasAudio !== false).length + S.p.audio.length + (S.p.overlay || []).filter((c) => S.p.media[c.mediaId]?.kind === "video").length;
function allMuted() {
  const list = [...S.p.video.filter((c) => c.kind === "video"), ...S.p.audio, ...(S.p.overlay || []).filter((c) => S.p.media[c.mediaId]?.kind === "video")];
  return list.length > 0 && list.every((c) => c.muted);
}
/** Mutes (or unmutes) every sound: video clips, audio tracks and video overlays. */
function muteAll(on) {
  if (!soundCount()) { toast("There is no sound in this video yet."); return 0; }
  const before = snap();
  let n = 0;
  for (const c of [...S.p.video.filter((x) => x.kind === "video"), ...S.p.audio, ...(S.p.overlay || []).filter((x) => S.p.media[x.mediaId]?.kind === "video")]) { c.muted = !!on; n++; }
  checkpoint(before); changed(); toast(on ? "All sound is muted." : "All sound is on again.");
  return n;
}
/** Loudness of a file's sound (dBFS), from the decoded sound, or null. */
function loudOf(mediaId) {
  const b = assets.sound(mediaId);
  if (!b) return null;
  const ch = Array.from({ length: Math.min(2, b.numberOfChannels) }, (_, i) => b.getChannelData(i));
  return M.loudnessDb(ch, 32);
}
async function balanceAll() {
  await assets.ready();
  const before = snap(), done = M.balanceVolumes(S.p, loudOf);
  if (!done.length) { toast("Balance all needs at least two clips with sound."); return 0; }
  checkpoint(before); changed(); toast(`Balanced the volume of ${done.length} clips.`);
  return done.length;
}
function extractAudio() {
  const f = S.sel && M.findClip(S.p, S.sel);
  if (!f || f.track !== "video" || f.clip.kind !== "video") { toast("Select a video clip first."); return null; }
  if (S.p.media[f.clip.mediaId]?.hasAudio === false) { toast("This video has no sound."); return null; }
  const before = snap(), a = M.extractAudio(S.p, f.clip.id);
  if (!a) { toast("This video has no sound to extract."); return null; }
  checkpoint(before); S.sel = a.id; changed();
  toast("The sound is now on the audio track. Trim it or move it; the video clip is muted.");
  return a;
}
/** Trims quiet parts at the start and end of the selected video or sound clip (measured from its decoded sound). */
async function autoTrim() {
  const f = S.sel && M.findClip(S.p, S.sel);
  if (!f || !(f.track === "audio" || (f.track === "video" && f.clip.kind === "video"))) { toast("Select a video or sound clip first."); return null; }
  const c = f.clip, buf = assets.sound(c.mediaId) || await assets.loadSound(c.mediaId);
  if (!buf) { toast("This clip has no sound to measure."); return null; }
  const sr = buf.sampleRate, a = Math.floor(c.in * sr), z = Math.min(buf.length, Math.ceil(c.out * sr));
  const ch = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, i) => buf.getChannelData(i).subarray(a, z));
  const b = M.soundBounds(ch, sr);
  if (!b) { toast("This part is silent, so nothing was trimmed."); return null; }
  const inT = c.in + b.start, outT = c.in + b.end;
  if (b.start < 0.05 && c.out - outT < 0.05) { toast("No quiet start or end to trim."); return { in: c.in, out: c.out }; }
  const before = snap(), cut = (c.out - c.in) - (outT - inT);
  if (f.track === "audio") { const was = c.in; M.setTrim(S.p, c.id, { inT, outT }); c.start = Math.round((c.start + (c.in - was) / (c.speed || 1)) * 1000) / 1000; }
  else M.setTrim(S.p, c.id, { inT, outT });
  checkpoint(before); changed();
  toast(`Trimmed ${cut.toFixed(1)} s of quiet start and end.`);
  return { in: c.in, out: c.out };
}
// ---------- Beat Sync (beats found on this device) ----------
/** The audio clip Beat Sync works on: the selected sound, else the longest one on the audio track. */
function beatClip() {
  const f = S.sel && M.findClip(S.p, S.sel);
  if (f?.track === "audio") return f.clip;
  return [...S.p.audio].sort((a, b) => M.clipLen(b) - M.clipLen(a))[0] || null;
}
async function findBeats(c) {
  const m = c && S.p.media[c.mediaId]; if (!m) return null;
  if (m.beats?.length) return m;
  const buf = assets.sound(m.id) || await assets.loadSound(m.id);
  if (!buf) { toast("This sound can't be read for beats."); return null; }
  if (buf.duration > 600) { toast("Beat Sync works on sounds of up to 10 minutes."); return null; }
  busy(+1, "Finding the beats…");
  await new Promise((r) => setTimeout(r, 30));
  try {
    const ch = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, i) => buf.getChannelData(i));
    const r = B.detectBeats(ch, buf.sampleRate);
    if (!r?.beats.length) { toast("No steady beat found in this sound."); return null; }
    m.beats = r.beats; m.bpm = r.bpm;
    return m;
  } finally { busy(-1); }
}
async function beatMarkers(on = true) {
  const c = beatClip(); if (!c) { toast("Add music on the audio track first."); return null; }
  if (on && !(await findBeats(c))) return null;
  const before = snap(); c.beats = !!on; checkpoint(before); changed();
  if (on) toast(`${S.p.media[c.mediaId].bpm} BPM: beat markers are on the music. Clips snap to them when you drag.`);
  return c;
}
async function beatSyncNow() {
  const c = beatClip(); if (!c) { toast("Add music on the audio track first."); return 0; }
  if (!(await findBeats(c))) return 0;
  const before = snap();
  c.beats = true;
  const beats = B.timelineBeats(S.p, (id) => S.p.media[id]?.beats);
  const n = B.syncToBeats(S.p, beats);
  checkpoint(before); changed();
  toast(n ? `Synced ${n} clips to the beat (${S.p.media[c.mediaId].bpm} BPM).` : "Everything is already on the beat.");
  return n;
}
const beatPoints = () => B.timelineBeats(S.p, (id) => S.p.media[id]?.beats);

// ---------- record a voiceover while the video plays ----------
async function recordVoiceover({ seconds = 0, countdown = 3 } = {}) {
  if (S.vo) return null;
  if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) { toast("This browser can't record sound. Try Chrome, Edge or Firefox."); return null; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { toast(e?.name === "NotAllowedError" ? "Microphone access was blocked. Allow the microphone (address bar), then try again." : "No microphone was found.", 6000); return null; }
  player.pause();
  const t0 = player.total > 0 && S.t < player.total - 0.1 ? S.t : 0;
  const bar = hEl("div", "vx-recbar", `<i class="vx-recdot" aria-hidden="true"></i><span class="vr-txt" aria-live="polite"></span>
    <label class="vx-check"><input type="checkbox" class="vr-hear"${S.voHear ? " checked" : ""}> Hear the video (headphones)</label>
    <button class="btn sm primary" data-vr="stop">Stop</button><button class="btn sm" data-vr="cancel">Cancel</button>`);
  bar.setAttribute("role", "status");
  els.pvWrap.append(bar);
  const vo = S.vo = { stream, cancel: false, stop: false };
  const txt = bar.querySelector(".vr-txt");
  const hearSync = () => { S.voHear = bar.querySelector(".vr-hear").checked; if (player.master) player.master.gain.value = S.voHear ? 1 : 0; };
  bar.querySelector(".vr-hear").addEventListener("change", hearSync);
  bar.addEventListener("click", (e) => { const x = e.target.closest("[data-vr]")?.dataset.vr; if (x === "stop") vo.stop = true; if (x === "cancel") { vo.cancel = true; vo.stop = true; } });
  const cleanup = () => { stream.getTracks().forEach((t) => t.stop()); bar.remove(); S.vo = null; if (player.master) player.master.gain.value = 1; };
  for (let i = countdown; i > 0; i--) {
    txt.textContent = `Recording in ${i}…`;
    await new Promise((r) => setTimeout(r, 1000));
    if (vo.cancel) { cleanup(); toast("Voiceover cancelled."); return null; }
  }
  const type = pickType(WEBM_AUDIO_TYPES);
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : {});
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  const stopped = new Promise((r) => { rec.onstop = r; });
  const started = new Promise((r) => { rec.onstart = r; setTimeout(r, 1500); });
  rec.start(250);
  await started;
  const recAt = performance.now();
  const withVideo = player.total > t0 + 0.05;
  if (withVideo) { player.audio(); hearSync(); await player.play(); }
  // playback starts ~0.06 s after play() returns; the recording started `lag` seconds before that (trimmed off below)
  const lag = withVideo ? (performance.now() - recAt) / 1000 + 0.06 : 0;
  await new Promise((res) => {
    const tick = () => {
      if (!S.vo) return res();
      const el = (performance.now() - recAt) / 1000;
      txt.textContent = `Recording voiceover ${fmtTime(el)} (from ${fmtTime(t0, true)})`;
      if (vo.stop || (seconds && el >= seconds) || (withVideo && !player.playing && el > lag + 0.3)) return res();
      setTimeout(tick, 100);
    };
    tick();
  });
  player.pause();
  try { rec.stop(); } catch {}
  await stopped;
  cleanup();
  if (vo.cancel) { toast("Voiceover cancelled."); return null; }
  const blob = new Blob(chunks, { type: (rec.mimeType || type || "audio/webm").split(";")[0] });
  if (blob.size < 200) { toast("Nothing was recorded. Check the microphone and try again."); return null; }
  busy(+1, "Adding your voiceover…");
  try {
    const n = Object.values(S.p.media).filter((m) => /^Voiceover/.test(m.name || "")).length + 1;
    const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
    const before = snap();
    const m = await importOne(new File([blob], `Voiceover ${n}.${ext}`, { type: blob.type }), "audio");
    const c = M.addAudioClip(S.p, m, { start: t0 });
    if (lag > 0.02 && m.duration > lag + 0.2) M.setTrim(S.p, c.id, { inT: lag });
    checkpoint(before); S.sel = c.id; changed();
    toast(`Voiceover added at ${fmtTime(t0, true)} on the audio track.`);
    return c;
  } catch (e) { showError(e); return null; } finally { busy(-1); }
}

/** Replace: pick another file from this project (or a new one) for the selected clip. */
function openReplace() {
  const f = S.sel && M.findClip(S.p, S.sel); if (!f || f.track === "text") return;
  const kinds = f.track === "audio" ? ["audio", "video"] : f.track === "overlay" ? ["image", "video"] : ["video", "image"];
  const list = Object.values(S.p.media).filter((m) => kinds.includes(m.kind) && m.id !== f.clip.mediaId && (f.track !== "audio" || m.kind === "audio" || m.hasAudio !== false));
  const d = document.createElement("dialog");
  d.className = "vx-dialog vx-replace"; d.setAttribute("aria-label", "Replace the clip");
  d.innerHTML = `<div class="vx-dialog-in"><h3>Replace with…</h3><p class="mx-hint">Keeps the clip's place, length (as far as the new file allows), speed, fades and transition.</p>
    <div class="vx-lib">${list.map((m) => `<button class="vx-libadd" data-rep="${esc(m.id)}">${m.thumb ? `<img alt="" src="${esc(m.thumb)}">` : `<span class="ph">${icon(m.kind === "audio" ? "audio" : "media")}</span>`}<span class="nm">${esc(m.name)}</span><small>${m.duration ? fmtTime(m.duration) : "Photo"}</small></button>`).join("") || '<p class="mx-hint">No other files in this project yet.</p>'}</div>
    <div class="mx-row vx-dialog-btns"><label class="btn primary" for="repFile">Choose a file…</label><input type="file" id="repFile" hidden accept="${f.track === "audio" ? "audio/*,video/*,.mp3,.wav,.m4a,.ogg" : f.track === "overlay" ? "image/*,video/*" : "video/*,image/*,.mkv,.mov"}"><button class="btn" data-x="close">Cancel</button></div></div>`;
  document.body.append(d);
  const done = async (m) => {
    d.close();
    const before = snap(), c = M.replaceMedia(S.p, f.clip.id, m);
    if (!c) { toast("That file can't go on this track."); return; }
    if (m.kind === "image") await assets.loadImage(m.id).catch(() => {});
    checkpoint(before); S.sel = c.id; changed(); toast(`Replaced with ${m.name}.`);
  };
  d.addEventListener("click", (e) => { const b = e.target.closest("[data-rep]"); if (b) done(S.p.media[b.dataset.rep]); if (e.target.closest("[data-x=close]")) d.close(); });
  d.querySelector("#repFile").addEventListener("change", async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const kind = f.track === "audio" && kindOf(file) !== "video" ? "audio" : kindOf(file);
    if (!kind || !kinds.includes(kind)) { toast("Please choose a " + kinds.join(" or ") + " file."); return; }
    busy(+1, `Adding ${file.name}…`);
    try { await done(await importOne(file, kind)); } catch (er) { showError(er); } finally { busy(-1); }
  });
  d.addEventListener("close", () => d.remove());
  d.showModal();
}
async function replaceWith(mediaId) { const m = S.p.media[mediaId], before = snap(), c = S.sel && M.replaceMedia(S.p, S.sel, m); if (!c) return null; if (m.kind === "image") await assets.loadImage(m.id).catch(() => {}); checkpoint(before); changed(); return c; }
function dup() {
  if (!S.sel) return;
  const before = snap(), c = M.duplicateClip(S.p, S.sel);
  if (c) { checkpoint(before); S.sel = c.id; changed(); }
}
function addTextStyle(style) {
  const before = snap();
  const c = M.addText(S.p, { style, start: S.t >= player.total - 0.2 && player.total > 0 ? Math.max(0, player.total - 3) : S.t, dur: 3 });
  ensureFont(c.family, c.bold, c.italic).then(() => player.render());
  checkpoint(before); S.sel = c.id; changed();
  openSheet("edit");
  // Focus and select the words right away (the inspector is already drawn): a delayed select would catch the
  // first letters typed in the meantime and the next letter would replace them.
  const ta = $('#inspect textarea[data-k="text"]');
  if (ta) { ta.focus(); ta.select(); }
  else setTimeout(() => { const t = $('#inspect textarea[data-k="text"]'); if (t && document.activeElement !== t) { t.focus(); t.select(); } }, 30);
  return c;
}
function editClip(fn, { history = true, inspector = false } = {}) {
  const f = S.sel && M.findClip(S.p, S.sel); if (!f) return;
  if (history && !S.editing) { checkpoint(); S.editing = true; }
  fn(f.clip, f);
  changed({ inspector, history: false });
}
function setPath(o, path, v) { const k = path.split("."); let x = o; while (k.length > 1) x = x[k.shift()] ||= {}; x[k[0]] = v; }

// ---------- export ----------
function openExport() {
  if (!(player.total > 0)) { toast("Add a clip first."); return; }
  player.pause();
  const d = document.createElement("dialog");
  d.className = "vx-dialog";
  d.setAttribute("aria-label", "Export video");
  const lenTxt = fmtTime(player.total);
  d.innerHTML = `<form method="dialog" class="vx-dialog-in"><h3>Export video</h3>
    <fieldset><legend>Format</legend>
      <label class="vx-opt"><input type="radio" name="fmt" value="mp4" checked><span><b>MP4</b> (H.264) plays everywhere. Uses a 31 MB engine the first time.</span></label>
      <label class="vx-opt"><input type="radio" name="fmt" value="webm"><span><b>WebM</b> is quicker and works offline. Plays in browsers, YouTube and VLC.</span></label>
      <label class="vx-opt"><input type="radio" name="fmt" value="mov"><span><b>MOV</b> (QuickTime, H.264) for Apple apps and editors. Made from the MP4, same quality.</span></label>
      <label class="vx-opt"><input type="radio" name="fmt" value="gif"><span><b>GIF</b> animated picture, no sound, smaller size.</span></label>
      <label class="vx-opt"><input type="radio" name="fmt" value="wav"><span><b>Audio only</b> (WAV): all the sound of your video mixed, made in seconds.</span></label></fieldset>
    <fieldset><legend>Quality</legend>
      <label class="vx-opt inline"><input type="radio" name="res" value="480"><span>480p</span></label>
      <label class="vx-opt inline"><input type="radio" name="res" value="720"><span>720p</span></label>
      <label class="vx-opt inline"><input type="radio" name="res" value="1080" checked><span>1080p</span></label></fieldset>
    <p class="mx-hint">Your video plays once in real time while it records (${lenTxt}). Keep this tab open. MP4 then takes a little longer to convert.${globalThis.MediaRecorder?.isTypeSupported?.("video/webm") ? "" : " This browser records MP4 instead of WebM for the quick option."}</p>
    <div class="mx-row vx-dialog-btns"><button class="btn" value="cancel">Cancel</button><button class="btn primary" value="go" id="goExport">Export</button></div></form>`;
  document.body.append(d);
  d.addEventListener("close", () => {
    const go = d.returnValue === "go", fd = new FormData(d.querySelector("form"));
    d.remove();
    const fmt = fd.get("fmt");
    if (go) fmt === "gif" ? exportGif() : fmt === "wav" ? exportAudio() : runExport({ format: fmt, res: Number(fd.get("res")) });
  });
  d.showModal();
}
const fileName = (ext) => (baseName(S.p.name).replace(/[\\/:*?"<>|]+/g, "").trim() || "video") + "." + ext;
async function runExport({ format = "webm", res = 1080 } = {}) {
  player.pause();
  const box = progressBox(format === "mp4" ? "Exporting MP4" : format === "mov" ? "Exporting MOV" : "Exporting WebM");
  try {
    const opts = { res, signal: box.signal, onProgress: (f) => box.set(null, f * (format === "mov" ? 0.95 : 1)), onStatus: (t) => box.set(t) };
    let r = format === "mp4" || format === "mov" ? await exportMp4(S.p, assets, opts) : await exportWebM(S.p, assets, opts);
    if (format === "mov") {
      // same H.264/AAC streams, put in a QuickTime container (no re-encoding)
      const out = await runFFmpeg({ files: [{ name: "input.mp4", data: r.blob }], args: movArgs({ input: "input.mp4", output: "output.mov" }), output: "output.mov",
        duration: r.duration, signal: box.signal, onStatus: (t) => box.set("Making the MOV: " + t), onProgress: (f) => box.set(null, 0.95 + f * 0.05) });
      r = { ...r, blob: new Blob([out], { type: "video/quicktime" }), type: "mov" };
    }
    box.close();
    S.lastExport = { ...r, name: fileName(r.type) };
    showResult(S.lastExport);
    return S.lastExport;
  } catch (e) {
    box.close();
    if (isAbort(e)) { toast("Export cancelled."); return null; }
    if (e.webm) {
      S.lastExport = { ...e.webm, name: fileName("webm"), error: e.message };
      showResult(S.lastExport, `MP4 didn't work: ${e.message} Your video is ready as WebM instead.`);
      return S.lastExport;
    }
    toast(e.message || "Export failed.", 7000);
    S.lastExport = { error: e.message || "Export failed" };
    return S.lastExport;
  }
}
function showResult(r, note = "") {
  const d = document.createElement("dialog");
  d.className = "vx-dialog vx-result";
  d.setAttribute("aria-label", "Your video is ready");
  const url = URL.createObjectURL(r.blob);
  d.innerHTML = `<div class="vx-dialog-in"><h3>Your video is ready</h3>${note ? `<p class="mx-msg">${esc(note)}</p>` : ""}
    <video controls playsinline src="${url}"></video>
    <p class="mx-meta">${r.type.toUpperCase()} · ${r.width}×${r.height} · ${fmtTime(r.duration)} · ${fmtBytes(r.blob.size)}</p>
    <div class="mx-row vx-dialog-btns"><button class="btn" data-x="close">Close</button><button class="btn primary" data-x="dl">Download ${r.type.toUpperCase()}</button></div></div>`;
  document.body.append(d);
  d.addEventListener("click", (e) => {
    const x = e.target.closest("[data-x]")?.dataset.x;
    if (x === "dl") downloadBlob(r.blob, r.name);
    if (x === "close") d.close();
  });
  d.addEventListener("close", () => { URL.revokeObjectURL(url); d.remove(); });
  d.showModal();
}

// ---------- projects ----------
async function openProjects() {
  await saveNow();
  const list = await listProjects("video").catch(() => []);
  const d = document.createElement("dialog");
  d.className = "vx-dialog vx-projects";
  d.setAttribute("aria-label", "Your video projects");
  d.innerHTML = `<div class="vx-dialog-in"><h3>Your video projects</h3><p class="mx-hint">Saved in this browser only.</p>
    <div class="vx-new">${Object.values(M.PRESETS).map((p) => `<a class="btn" href="?preset=${p.id}">New ${esc(p.short)}</a>`).join("")}</div>
    <ul class="vx-plist">${list.map((x) => `<li><a href="?project=${esc(x.id)}${x.data?.yt ? "&preset=youtube" : ""}">${x.thumb ? `<img alt="" src="${esc(x.thumb)}">` : '<span class="ph"></span>'}<span><b>${esc(x.name)}</b><small>${new Date(x.updated).toLocaleString()} · ${fmtTime(x.duration || 0)}${x.id === S.p.id ? " · open now" : ""}</small></span></a>
      <button class="btn sm" data-delp="${esc(x.id)}" aria-label="Delete ${esc(x.name)}">Delete</button></li>`).join("") || "<li class=mx-hint>No saved projects yet.</li>"}</ul>
    <div class="mx-row vx-dialog-btns"><button class="btn" data-x="close">Close</button></div></div>`;
  document.body.append(d);
  d.addEventListener("click", async (e) => {
    if (e.target.closest("[data-x=close]")) d.close();
    const id = e.target.closest("[data-delp]")?.dataset.delp;
    if (id && confirm("Delete this project and its files from this browser?")) {
      await deleteProject(id); await deleteMediaOf(id);
      e.target.closest("li").remove();
      if (id === S.p.id) location.href = "?" + (S.yt ? "preset=youtube" : "");
    }
  });
  d.addEventListener("close", () => d.remove());
  d.showModal();
}

// ---------- phone sheets ----------
function openSheet(name) {
  if (shell && name && name !== "edit") { const id = Object.keys(SIDE).find((k) => SIDE[k] === name); if (id) { shell.openPanel(id); return; } }
  if (!matchMedia("(max-width: 760px)").matches) { if (name !== "edit" && sideTitles[name]) { S.tab = name; renderPanel(); } return; }
  if (S.sheet === name) name = "";
  S.sheet = name;
  if (shell && name === "edit") shell.closePanel();
  if (name && name !== "edit") { S.tab = name; renderPanel(); }
  els.vx.dataset.sheet = name === "edit" ? "inspect" : name ? "side" : "";
  $$(".vx-phonebar [data-sheet]").forEach((b) => b.classList.toggle("on", b.dataset.sheet === name));
}

// ---------- events ----------
function bindUi() {
  $("#bPlay").onclick = () => (player.playing ? player.pause() : player.play());
  $("#bStart").onclick = () => seek(0);
  $("#bEnd").onclick = () => seek(player.total);
  $("#bBack").onclick = () => seek(S.t - 1 / FPS);
  $("#bFwd").onclick = () => seek(S.t + 1 / FPS);
  $("#bSplit").onclick = split;
  $("#bDel").onclick = del;
  $("#bUndo").onclick = undo; $("#bRedo").onclick = redo;
  $("#bExport").onclick = openExport;
  $("#bProjects").onclick = openProjects;
  els.name.addEventListener("input", () => { S.p.name = els.name.value.slice(0, 80) || "Untitled video"; scheduleSave(); });
  els.fileIn.addEventListener("change", async () => { const f = [...els.fileIn.files]; els.fileIn.value = ""; await importFiles(f); });
  els.audioIn.addEventListener("change", async () => { const f = [...els.audioIn.files]; els.audioIn.value = ""; await importFiles(f, { audioOnly: true }); });
  $("#tlAddMedia").onclick = (e) => openPlusMenu(e.currentTarget);
  $("#tlAddAudio").onclick = () => { if (shell) shell.openPanel("audio"); else openSheet("audio"); };
  $("#zIn").onclick = () => setZoom(S.pps * 1.4); $("#zOut").onclick = () => setZoom(S.pps / 1.4); $("#zFit").onclick = fitZoom;
  els.zoom.addEventListener("input", () => setZoom(8 * 25 ** (Number(els.zoom.value) / 100)));
  new ResizeObserver(() => { sizeCanvas(); }).observe(els.pvWrap);
  // Ctrl / Cmd + scroll (or a trackpad pinch) zooms the timeline around the pointer
  els.tlScroll.addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const box = els.tlScroll.getBoundingClientRect(), t = (e.clientX - els.tlInner.getBoundingClientRect().left) / S.pps;
    setZoom(S.pps * Math.exp(-e.deltaY * 0.0025));
    els.tlScroll.scrollLeft = Math.max(0, t * S.pps - (e.clientX - box.left));
  }, { passive: false });
  // timeline height: drag the grip on its top edge (kept for next time)
  const setTlH = (h) => { S.tlH = Math.round(Math.max(110, Math.min(Math.round(innerHeight * 0.7), h))); els.vx.style.setProperty("--vx-tl-h", S.tlH + "px"); try { localStorage.setItem("asaandesk-video-tl-h", String(S.tlH)); } catch {} };
  try { const h = Number(localStorage.getItem("asaandesk-video-tl-h")); if (h > 0) setTlH(h); } catch {}
  const grip = $("#tlGrip");
  grip.addEventListener("pointerdown", (e) => {
    e.preventDefault(); grip.setPointerCapture(e.pointerId);
    const y0 = e.clientY, h0 = $(".vx-tl-body").getBoundingClientRect().height;
    const move = (ev) => setTlH(h0 + (y0 - ev.clientY));
    const up = () => { grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); sizeCanvas(); };
    grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up);
  });
  grip.addEventListener("keydown", (e) => { const d = e.key === "ArrowUp" ? 24 : e.key === "ArrowDown" ? -24 : 0; if (!d) return; e.preventDefault(); setTlH((S.tlH || $(".vx-tl-body").getBoundingClientRect().height) + d); sizeCanvas(); });

  // drop files anywhere
  document.addEventListener("dragover", (e) => { if ([...(e.dataTransfer?.types || [])].includes("Files")) { e.preventDefault(); els.vx.classList.add("dropping"); } });
  document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) els.vx.classList.remove("dropping"); });
  document.addEventListener("drop", (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); els.vx.classList.remove("dropping"); if (S.p) importFiles(e.dataTransfer.files); } });

  // side panel
  $(".vx-tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) { S.tab = b.dataset.tab; renderPanel(); } });
  $(".vx-phonebar").addEventListener("click", (e) => { const b = e.target.closest("[data-sheet]"); if (b && !b.disabled) openSheet(b.dataset.sheet); });
  els.vx.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) openSheet(""); });
  els.empty.addEventListener("click", (e) => { if (e.target.closest("[data-act=pick]")) els.fileIn.click(); });
  els.panel.addEventListener("click", async (e) => {
    const t = e.target.closest("button,[data-add]"); if (!t) return;
    if (t.dataset.ov) { const m = S.p.media[t.dataset.ov]; if (m) addPictureOverlay(m); return; }
    if (t.dataset.add) {
      const m = S.p.media[t.dataset.add]; if (!m) return;
      const before = snap(); const c = addToTimeline(m); checkpoint(before); S.sel = c.id; changed();
      toast(m.kind === "audio" ? "Added to the audio track at the playhead." : "Added to the end of the video.");
    } else if (t.dataset.unmedia) {
      const id = t.dataset.unmedia; delete S.p.media[id]; assets.remove(id);
      await deleteMediaOf(S.p.id, Object.keys(S.p.media)).catch(() => {}); changed();
    } else if (t.dataset.text) addTextStyle(t.dataset.text);
    else if (t.dataset.preset) { const before = snap(); S.p.preset = t.dataset.preset; S.presetChosen = true; checkpoint(before); changed(); }
    else if (t.dataset.bg) { const before = snap(); S.p.background.mode = t.dataset.bg; checkpoint(before); changed(); }
    else if (t.dataset.swatch) { const before = snap(); S.p.background = { mode: "color", color: t.dataset.swatch }; checkpoint(before); changed(); }
    else if (t.dataset.chapDel != null) { const before = snap(); S.p.chapters.splice(Number(t.dataset.chapDel), 1); checkpoint(before); changed(); }
    else if (t.dataset.act === "chapAdd") {
      const before = snap(); const tt = S.p.chapters.length ? Math.floor(S.t) : 0;
      if (S.p.chapters.some((c) => Math.floor(c.t) === tt)) { toast("There is already a chapter at this time. Move the playhead."); return; }
      S.p.chapters.push({ t: tt, title: S.p.chapters.length ? "" : "Intro" }); checkpoint(before); changed();
      setTimeout(() => { const i = S.p.chapters.findIndex((c) => c.t === tt); $(`[data-chap-title="${i}"]`)?.focus(); }, 30);
    } else if (t.dataset.act === "chapCopy") {
      const txt = chaptersText(S.p.chapters, player.total);
      try { await navigator.clipboard.writeText(txt); toast("Chapters copied. Paste them into your YouTube description."); }
      catch { const ta = $("#chapText"); ta.select(); document.execCommand?.("copy"); toast("Chapters selected: press Ctrl+C to copy."); }
    } else if (t.dataset.act === "endscreen") {
      const ex = S.p.video.find((c) => c.kind === "endscreen");
      if (ex) select(ex.id);
      else { const before = snap(); const c = M.addEndScreen(S.p); checkpoint(before); S.sel = c.id; changed(); seek(M.clipRange(S.p, c.id).start + 1); }
    } else if (t.dataset.act === "frame") saveFrame();
  });
  els.panel.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "bgColor") { const before = snap(); S.p.background = { mode: "color", color: t.value }; checkpoint(before); changed(); }
    if (t.id === "guides") { S.guides = player.guides = t.checked; player.render(); }
    if (t.dataset.chapT != null) {
      const i = Number(t.dataset.chapT), v = parseChapters(t.value + " x")[0];
      if (!v) { toast("Write the time like 1:05."); t.value = fmtChapterTime(S.p.chapters[i].t, player.total); return; }
      const before = snap(); S.p.chapters[i].t = v.t; checkpoint(before); changed();
    }
    if (t.dataset.chapTitle != null) { const before = snap(); S.p.chapters[Number(t.dataset.chapTitle)].title = t.value.slice(0, 100); checkpoint(before); changed(); }
  });

  // inspector
  const I = els.inspect;
  I.addEventListener("focusin", () => { S.editing = false; });
  I.addEventListener("input", (e) => {
    const t = e.target, k = t.dataset.k; if (!k) return;
    let v = t.type === "range" || t.type === "number" ? Number(t.value) : t.value;
    if (t.type === "number" && !Number.isFinite(v)) return;
    editClip((c, f) => {
      if (k === "speed") { M.setSpeed(S.p, c.id, v); syncTwin(t, k, c.speed); }
      else if (k === "slip") M.slipClip(S.p, c.id, v - c.in);
      else if (k === "volumePct") { c.volume = Math.max(0, Math.min(2, v / 100)); c.muted = false; syncTwin(t, "volume", c.volume); }
      else if (k === "volume") { c.volume = v; syncTwin(t, "volumePct", Math.round(v * 100)); }
      else if (k === "animInDur" || k === "animOutDur") c[k] = Math.max(0.1, Math.min(10, v));
      else if (k === "transition.dur") { c.transition = { ...(c.transition || {}), dur: Math.max(0.1, Math.min(2.5, v)) }; syncTwin(t, k, c.transition.dur); }
      else if (k === "in" || k === "out") M.setTrim(S.p, c.id, { [k === "in" ? "inT" : "outT"]: v });
      else if (k === "dur") M.setTrim(S.p, c.id, { dur: v }); // text / overlay length (a video overlay stays inside its file)
      else if (k === "start") M.moveItem(S.p, c.id, v);
      else if (k === "transition.type") { c.transition = { ...(c.transition || {}), type: v, dur: c.transition?.dur || 0.5 }; }
      else setPath(c, k, v);
      if (["family", "bold", "italic"].includes(k)) ensureFont(c.family, c.bold, c.italic).then(() => player.render());
      const lab = t.closest(".mx-field")?.querySelector("small");
      if (lab && t.type === "range") lab.textContent = k === "volume" || k === "opacity" || k === "w" ? `${Math.round(v * 100)}%` : k === "size" ? String(v) : k === "x" || k === "y" ? "" : k === "speed" ? `${c.speed}×` : k === "slip" ? `from ${c.in.toFixed(2)} s` : k.startsWith("crop.") ? `${Math.round(v * 100)}%` : k.startsWith("adj.") ? String(v) : `${v.toFixed(1)} s`;
      if (k === "speed" && t.type === "number") { const l2 = t.closest(".mx-field")?.querySelector("small"); if (l2) l2.textContent = `${c.speed}×`; }
      if (k === "slip") { const r = M.clipRange(S.p, c.id); if (r) { S.t = r.start; } }
    }, { inspector: k === "transition.type" });
  });
  /** Keeps a slider and its number box showing the same value while one of them is changed. */
  function syncTwin(src, k, v) { for (const el of I.querySelectorAll(`[data-k="${k}"]`)) if (el !== src && document.activeElement !== el) el.value = String(v); }
  I.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.seg) {
      const k = b.dataset.seg, raw = b.dataset.v;
      if (k === "speed") { checkpoint(); M.setSpeed(S.p, S.sel, Number(raw)); changed(); return; }
      S.editing = false;
      if (k === "pos") return editClip((c) => { c.y = Number(raw); c.x = 0.5; }, { inspector: true });
      if (k === "corner") return editClip((c) => { const [x, y] = raw.split(",").map(Number); c.x = x; c.y = y; }, { inspector: true });
      return editClip((c) => { c[k] = raw; }, { inspector: true });
    }
    if (b.dataset.toggle) { S.editing = false; const k = b.dataset.toggle; return editClip((c) => { c[k] = !c[k]; if (["bold", "italic"].includes(k)) ensureFont(c.family, c.bold, c.italic).then(() => player.render()); }, { inspector: true }); }
    const act = b.dataset.act;
    if (act === "replace") return openReplace();
    if (act === "toOverlay") return moveTrack("overlay");
    if (act === "lookReset") { S.editing = false; return editClip((c) => { delete c.crop; delete c.adj; delete c.filter; delete c.flipH; delete c.flipV; }, { inspector: true }); }
    if (act === "toMain") return moveTrack("main");
    if (act === "beatMarks") { const f = M.findClip(S.p, S.sel); return beatMarkers(!f?.clip.beats); }
    if (act === "beatSync") return beatSyncNow();
    if (act === "extract") return extractAudio();
    if (act === "autotrim") return autoTrim();
    if (act === "balance") return balanceAll();
    if (act === "muteAll") return muteAll(!allMuted());
    if (act === "multiLen") return setMultiLength(Number($("#multiLen")?.value));
    if (act === "multiNone") { const id = multiIds().at(-1); S.multi.clear(); return select(id); }
    if (act === "multiDel") return del();
    if (act === "split") split(); else if (act === "dup") dup(); else if (act === "del") del();
    else if (act === "inHere" || act === "outHere") { const before = snap(); M.trimToTime(S.p, S.sel, act === "inHere" ? "start" : "end", S.t); checkpoint(before); changed(); }
  });

  // timeline pointer: trim handles, move/reorder clips, scrub
  const sc = els.tlScroll;
  const timeAt = (x) => (x - els.tlInner.getBoundingClientRect().left) / S.pps;
  sc.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const plus = e.target.closest("[data-plus]");
    if (plus) { e.preventDefault(); openPlusMenu(plus); return; }
    const trBtn = e.target.closest(".tr");
    if (trBtn) { select(trBtn.dataset.tr); openSheet("edit"); return; }
    const handle = e.target.closest(".h"), clipEl = e.target.closest(".clip");
    const x0 = e.clientX, t0 = timeAt(x0);
    let moved = false;
    if (clipEl) {
      const id = clipEl.dataset.id, f = M.findClip(S.p, id), base = snap(), range = M.clipRange(S.p, id);
      if (e.shiftKey) { toggleMulti(id); return; } // Shift + click: select several clips (Timing panel)
      if (S.sel !== id || S.multi.size) select(id);
      const edge = handle?.dataset.edge;
      // Slip (toolbar toggle or Alt + drag): drag the content to choose which part of the file plays
      const slipping = !edge && (S.slip || e.altKey) && !!M.slipRange(S.p, id);
      sc.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dt = (ev.clientX - x0) / S.pps;
        if (!moved && Math.abs(ev.clientX - x0) < 4) return;
        moved = true; player.pause();
        restore(base);
        if (slipping) {
          M.slipClip(S.p, id, -dt * (f.clip.speed || 1));
          changed({ light: true, save: false, seek: false });
          player.seek(S.t >= range.start && S.t < range.end ? S.t : range.start);
        } else if (edge) {
          M.trimEdge(S.p, id, edge, dt);
          changed({ light: true, save: false, seek: false });
          const r = M.clipRange(S.p, id);
          player.seek(edge === "start" ? r.start : Math.max(r.start, r.end - 1 / FPS));
        } else if (f.track === "video") {
          const idx = M.dropIndex(S.p, id, t0 + dt);
          const el = els.tlInner.querySelector(`.clip[data-id="${id}"]`);
          if (el) { el.style.transform = `translateX(${ev.clientX - x0}px)`; el.classList.add("dragging"); }
          const others = M.layoutVideo(S.p.video.filter((c) => c.id !== id));
          const mark = $("#dropMark"); mark.hidden = false; mark.style.left = (idx < others.length ? others[idx].start : others.at(-1)?.end || 0) * S.pps + "px";
          S.dragIdx = idx;
        } else {
          const tol = 8 / S.pps, pts = M.snapPoints(S.p, id, [S.t, ...beatPoints()]); // beat markers are snap points too
          const len = range.end - range.start, st = range.start + dt;
          const a = M.snap(st, pts, tol), b = M.snap(st + len, pts, tol) - len;
          M.moveItem(S.p, id, a !== st ? a : b);
          changed({ light: true, save: false, seek: false });
        }
      };
      const up = () => {
        sc.removeEventListener("pointermove", move); sc.removeEventListener("pointerup", up); sc.removeEventListener("pointercancel", up);
        if (!moved) return;
        if (!edge && !slipping && f.track === "video") { restore(base); M.moveVideoClip(S.p, id, S.dragIdx ?? f.index); }
        if (snap() !== base) checkpoint(base);
        changed();
      };
      sc.addEventListener("pointermove", move); sc.addEventListener("pointerup", up); sc.addEventListener("pointercancel", up);
      return;
    }
    // ruler / empty space: scrub
    if (S.sel && !e.target.closest(".ruler")) select(null);
    seek(t0);
    sc.setPointerCapture(e.pointerId);
    const move = (ev) => { S.t = Math.max(0, Math.min(timeAt(ev.clientX), player.total)); updatePlayhead(); updateTime(); player.seek(S.t); };
    const up = () => { sc.removeEventListener("pointermove", move); sc.removeEventListener("pointerup", up); renderChrome(); renderPanelIfTimed(); };
    sc.addEventListener("pointermove", move); sc.addEventListener("pointerup", up);
  });
  sc.addEventListener("focusin", (e) => { const c = e.target.closest(".clip"); if (c && S.sel !== c.dataset.id) { S.sel = c.dataset.id; renderInspector(); renderChrome(); $$(".clip.sel", sc).forEach((x) => x.classList.remove("sel")); c.classList.add("sel"); } });

  // drag text on the preview
  els.pv.addEventListener("pointerdown", (e) => {
    const r = els.pv.getBoundingClientRect(), k = els.pv.width / r.width;
    const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
    const hit = [...player.textBoxes].reverse().find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (!hit) { if (!player.playing && player.total > 0) player.play(); else player.pause(); return; }
    player.pause();
    if (S.sel !== hit.id) select(hit.id);
    const c = M.findClip(S.p, hit.id).clip, sx = c.x, sy = c.y, before = snap();
    els.pv.setPointerCapture(e.pointerId);
    const move = (ev) => {
      c.x = Math.max(0.03, Math.min(0.97, sx + ((ev.clientX - e.clientX) * k) / els.pv.width));
      c.y = Math.max(0.03, Math.min(0.97, sy + ((ev.clientY - e.clientY) * k) / els.pv.height));
      if (c.cap) for (const o of S.p.text) if (o.cap && o !== c) { o.x = c.x; o.y = c.y; } // captions move together
      player.render();
    };
    const up = () => { els.pv.removeEventListener("pointermove", move); els.pv.removeEventListener("pointerup", up); if (snap() !== before) { checkpoint(before); changed(); } };
    els.pv.addEventListener("pointermove", move); els.pv.addEventListener("pointerup", up);
  });

  // keyboard
  document.addEventListener("keydown", (e) => {
    if (!S.p) return; // still opening a project
    if (shell && shell.mode !== "edit" && !(e.key === " " || e.key === "k")) return; // Viewing / Commenting: only play and pause
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (document.querySelector("dialog[open]")) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === "y" && !typing) { e.preventDefault(); redo(); return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); dup(); return; }
    if (mod) return;
    const k = e.key;
    if (k === " " || k === "k") { if (e.target.closest?.("button") && k === " ") return; e.preventDefault(); player.playing ? player.pause() : player.play(); }
    else if (k === "s" || k === "S") { e.preventDefault(); split(); }
    else if (k === "Delete" || k === "Backspace") { if (S.sel) { e.preventDefault(); del(); } }
    else if (k === "ArrowLeft" || k === "ArrowRight") { e.preventDefault(); seek(S.t + (k === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 1 : 1 / FPS)); }
    else if (k === "Home") { e.preventDefault(); seek(0); }
    else if (k === "End") { e.preventDefault(); seek(player.total); }
    else if ((k === "[" || k === "]") && S.sel) { const before = snap(); M.trimToTime(S.p, S.sel, k === "[" ? "start" : "end", S.t); checkpoint(before); changed(); }
    else if (k === "t" || k === "T") { e.preventDefault(); addTextStyle("title"); }
    else if (k === "Escape" && S.sheet) openSheet("");
    else if (k === "Enter" && e.target.closest?.(".clip")) select(e.target.closest(".clip").dataset.id);
  });
  addEventListener("beforeunload", () => { if (S.saved === "Saving…") saveNow(); });
}
function renderPanelIfTimed() { if (S.tab === "text" || S.tab === "youtube") renderPanel(); }
async function saveFrame() {
  const { w, h } = exportSize(S.p.preset, 720);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  await loadFonts(S.p); player.render(S.t, c.getContext("2d"), w, h);
  c.toBlob((b) => b && downloadBlob(b, `${baseName(fileName("x"))}-frame-${fmtTime(S.t).replace(":", "m")}s.png`), "image/png");
}

// ---------- editor frame (shared shell: top bar, rail + side panel, pill toolbar, bottom bar) ----------
// The old side panel (#side: media, text, audio, canvas, YouTube tabs) moves into the matching shell panel when it opens.
const SIDE = { videos: "media", text: "text", audio: "audio", canvas: "canvas", youtube: "youtube" };
const hEl = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
async function mountFrame(params) {
  let mod;
  try { mod = await import("../shared/editor-shell.js"); } catch (e) { console.warn("Editor frame not available", e); return null; }
  const host = (extra) => ({ render: (el) => { el.append(hEl("div", "vxp-host")); extra?.(el); } });
  const panels = {
    elements: { label: "Elements", icon: "elements", render: renderElementsPanel },
    text: { label: "Text", icon: "text", ...host(renderTextExtras) },
    audio: { label: "Audio", icon: "speak", ...host(renderSoundsPanel) },
    videos: { label: "Videos", icon: "video", ...host() },
    canvas: { label: "Canvas", icon: "resize", ...host() },
    captions: { label: "Captions", icon: "text", refresh: true, render: renderCaptionsPanel },
    animate: { label: "Animate", icon: "play", render: renderAnimatePanel },
    magic: { label: "AI tools", icon: "logo", render: renderMagicPanel },
  };
  if (S.yt) panels.youtube = { label: "YouTube", icon: "play", ...host() };
  const galTool = S.yt ? "youtube-video-editor" : params.get("tool") === "videos" ? "videos" : "video-editor";
  const exportItems = [
    { label: "WebM video", act: () => (player.total > 0 ? runExport({ format: "webm" }) : toast("Add a clip or a template first.")) },
    { label: "MP4 video", act: () => (player.total > 0 ? runExport({ format: "mp4" }) : toast("Add a clip or a template first.")) },
    { label: "GIF (animated, no sound)", act: () => (player.total > 0 ? exportGif() : toast("Add a clip or a template first.")) },
    { label: "MOV video (QuickTime)", act: () => (player.total > 0 ? runExport({ format: "mov" }) : toast("Add a clip or a template first.")) },
    { label: "Audio only (WAV)", act: () => (player.total > 0 ? exportAudio() : toast("Add a clip or a template first.")) },
    { label: "PNG picture of this frame", act: () => saveFrame() },
    { label: "Captions file (.srt)", act: () => downloadSrt() },
  ];
  try {
    shell = mod.mountShell({
      app: "video", kind: S.yt ? "YouTube video" : "Video", title: S.p.name, home: S.yt ? "/tools/youtube-video-editor" : "/tools/video-editor",
      onTitle: (t) => { S.p.name = String(t || "").trim().slice(0, 80) || "Untitled video"; els.name.value = S.p.name; scheduleSave(); },
      stage: els.vx, toolbar: els.pill, formulaBar: null,
      resize: { label: "Resize", open: () => shell.openPanel("canvas") },
      file: [
        { label: "New video", act: () => { location.href = "?new=1" + (S.yt ? "&preset=youtube" : ""); } },
        { label: "Add videos, photos or music…", act: () => els.fileIn.click() },
        { label: "Add music or sound…", act: () => els.audioIn.click() },
        { label: "Your video projects…", act: () => openProjects() },
        { label: "Export video…", group: "Download", act: () => openExport() },
        ...exportItems.map((x) => ({ ...x, label: "Download " + x.label, group: "Download" })),
        { label: "Undo", group: "Edit", act: undo }, { label: "Redo", group: "Edit", act: redo },
        { label: "Split at the playhead", group: "Edit", act: split }, { label: "Duplicate the selected clip", group: "Edit", act: dup },
        { label: "Delete the selected clip", group: "Edit", act: del },
        { label: "Replace the selected clip…", group: "Edit", act: () => (S.sel ? openReplace() : toast("Select a clip first.")) },
        { label: "Extract audio from the selected video", group: "Edit", act: () => extractAudio() },
        { label: "Balance all volumes", group: "Edit", act: () => balanceAll() },
        { label: "Mute or unmute all sound", group: "Edit", act: () => muteAll(!allMuted()) },
        { label: "Video trimmer", group: "More video tools", act: () => { location.href = "?mode=trim"; } },
        { label: "Convert to MP4", group: "More video tools", act: () => { location.href = "?mode=convert"; } },
        { label: "Record screen or camera", group: "More video tools", act: () => { location.href = "/design/recorder/"; } },
      ],
      share: { download: exportItems, link: () => location.href },
      templates: { gallery: G.galleryFor(galTool), tool: galTool, apply: applyTemplate, placeholder: S.yt ? "Search YouTube templates" : "Search video templates" },
      panels,
      rail: ["templates", "elements", "text", "audio", "videos", "uploads", "captions", "animate", "magic", "brand", "projects", "apps", ...(S.yt ? ["youtube"] : [])],
      insert: {
        // a picture from Uploads / Brand logos: on top of the video (overlay track) when there is video, else a clip
        image: async (src, name) => {
          const b = await (await fetch(src)).blob(), f = new File([b], name || "Picture.png", { type: b.type || "image/png" });
          if (!S.p.video.length) { await importFiles([f]); return; }
          busy(+1, "Adding the picture…");
          try { addPictureOverlay(await importOne(f, "image")); } catch (e) { showError(e); } finally { busy(-1); }
        },
        text: (str, style) => { const c = addTextStyle(style === "heading" || style === "h1" ? "title" : style === "subheading" || style === "h2" ? "subtitle" : "caption"); if (c && str) { c.text = String(str); changed({ history: false }); } },
        color: (hex) => {
          const f = S.sel && M.findClip(S.p, S.sel);
          if (f?.track === "text") editClip((c) => { c.color = hex; });
          else { checkpoint(); S.p.background = { mode: "color", color: hex }; changed(); toast("Background colour set. It shows where a clip doesn't fill the frame."); }
        },
        font: (family) => { const f = S.sel && M.findClip(S.p, S.sel); if (f?.track !== "text") { toast("Select a text on the timeline first."); return; } editClip((c) => { c.family = family; }); ensureFont(family).then(() => player.render()).catch(() => {}); },
      },
      projects: {
        save: async () => { await saveNow(); return { id: S.p.id, app: "video", name: S.p.name, data: S.p, thumb: snapshot(player, 240), duration: player.total }; },
        open: async (rec) => { location.href = `?project=${encodeURIComponent(rec.id)}${rec.data?.yt ? "&preset=youtube" : ""}`; },
      },
      bottom: {
        notes: true, outline: null, timer: true, fullscreen: true, help: true,
        zoom: { get: () => Math.round((S.pps / 40) * 100), set: (pct) => setZoom((pct / 100) * 40), min: 20, max: 500 },
        pages: {
          count: () => Math.max(1, S.p.video.length),
          current: () => { const l = M.layoutVideo(S.p.video); const i = l.findIndex((e) => S.t >= e.start - 1e-3 && S.t < e.end); return Math.max(0, i < 0 ? l.length - 1 : i); },
          go: (i) => { const e = M.layoutVideo(S.p.video)[i]; if (e) { seek(e.start + 0.01); select(e.clip.id); } },
          add: () => addScene({ bg: ["#5b4cf0", "#2f80ff"], art: "circles" }),
          thumb: (i) => { const c = S.p.video[i]; const m = c && S.p.media[c.mediaId]; return m?.thumb || ""; },
        },
      },
      shortcuts: [["Space", "Play or pause"], ["S", "Split at the playhead"], ["T", "Add a title"], ["[  /  ]", "Selected clip starts / ends at the playhead"], ["← / →", "One frame back / forward"], ["Ctrl + D", "Duplicate the selected clip"]],
      setMode: (m) => { if (m !== "edit") { player.pause(); if (S.sheet) openSheet(""); } },
      onPanel: (id) => {
        if (!SIDE[id]) return;
        const slot = shell.panel(id).querySelector(".vxp-host");
        if (slot && els.side.parentElement !== slot) slot.append(els.side);
        S.tab = SIDE[id]; renderPanel();
      },
    });
  } catch (e) { console.error("The editor frame could not start", e); shell = null; return null; }
  document.documentElement.classList.add("vx-framed");
  addEventListener("resize", () => sizeCanvas());
  requestAnimationFrame(() => { sizeCanvas(); fitZoom(); });
  return shell;
}

/** Applies a video template: a fresh project with its colour scenes, words and music (the current video stays in Projects). */
async function applyTemplate(id) {
  const t = G.byId(id);
  if (!t?.scenes) { toast("That template isn't for the video editor."); return null; }
  player.pause();
  const has = S.p.video.length || S.p.text.length || S.p.audio.length;
  if (has) { await saveNow(); S.p = M.newProject({ preset: t.preset, id: uid(), name: t.name }); S.undo = []; S.redo = []; S.sel = null; S.t = 0; }
  else { S.p.preset = t.preset; S.p.name = t.name; }
  S.presetChosen = true;
  busy(+1, "Opening the template…");
  try {
    for (const [i, sc] of t.scenes.entries()) {
      const blob = await sceneBlob(sc, t.preset);
      const m = await importOne(new File([blob], `${t.name} scene ${i + 1}.png`, { type: "image/png" }), "image");
      const c = M.addVideoClip(S.p, m);
      M.setTrim(S.p, c.id, { dur: sc.dur || 3 });
      c.fit = "cover";
      if (i > 0) c.transition = { type: "crossfade", dur: 0.5 };
    }
    const lay = M.layoutVideo(S.p.video);
    t.scenes.forEach((sc, i) => {
      const e = lay[i]; if (!e) return;
      (sc.texts || []).forEach((x, j) => { const { style, ...rest } = x; M.addText(S.p, { style, ...rest, start: Math.round((e.start + 0.15 + j * 0.35) * 100) / 100, dur: Math.max(0.8, Math.round((e.len - 0.3 - j * 0.35) * 100) / 100) }); });
    });
    if (t.chapters) S.p.chapters = t.chapters.map((title, i) => ({ t: lay[i] ? Math.max(0, Math.round(lay[i].start)) : i * 3, title }));
    if (t.music) {
      const total = M.projectDuration(S.p);
      const m = await importOne(new File([soundBlob(t.music)], `${SOUNDS.find((x) => x.id === t.music)?.name || "Music"}.wav`, { type: "audio/wav" }), "audio");
      const a = M.addAudioClip(S.p, m, { start: 0 });
      M.setTrim(S.p, a.id, { inT: 0, outT: Math.min(m.duration, total) });
      a.volume = 0.6; a.fadeOut = Math.min(1, total / 4);
    }
    await loadFonts(S.p).catch(() => {});
    S.t = 0; S.sel = null;
    changed({ history: false });
    fitZoom();
    shell?.setTitle(S.p.name);
    toast(`${t.name}: change the words in Text, swap the scenes for your clips in Videos.`, 4200);
    return S.p;
  } catch (e) { showError(e); return null; }
  finally { busy(-1); }
}

/** Adds a colour scene (image clip) at the end of the video track. */
async function addScene(sc) {
  busy(+1, "Adding a scene…");
  try {
    const blob = await sceneBlob(sc, S.p.preset), before = snap();
    const m = await importOne(new File([blob], "Colour scene.png", { type: "image/png" }), "image");
    const c = M.addVideoClip(S.p, m); c.fit = "cover";
    if (S.p.video.length > 1) c.transition = { type: "crossfade", dur: 0.5 };
    checkpoint(before); S.sel = c.id; changed();
    return c;
  } catch (e) { showError(e); return null; } finally { busy(-1); }
}
/** Adds a built-in music bed or sound effect at the playhead. */
async function addSound(id) {
  const s = SOUNDS.find((x) => x.id === id); if (!s) return null;
  busy(+1, `Adding ${s.name}…`);
  try {
    const before = snap();
    const m = await importOne(new File([soundBlob(id)], `${s.name}.wav`, { type: "audio/wav" }), "audio");
    const c = M.addAudioClip(S.p, m, { start: S.t < player.total - 0.1 ? S.t : 0 });
    if (s.kind === "Music") c.volume = 0.6;
    checkpoint(before); S.sel = c.id; changed();
    toast(`${s.name} is on the audio track.`);
    return c;
  } catch (e) { showError(e); return null; } finally { busy(-1); }
}
/** Adds a text overlay (shape, sticker or title part) at the playhead. */
function addOverlay(o, { history = true } = {}) {
  const before = snap();
  const start = S.t >= player.total - 0.2 && player.total > 0 ? Math.max(0, player.total - 3) : S.t;
  const c = M.addText(S.p, { dur: 3, ...o, start: (o.start || 0) + start });
  ensureFont(c.family, c.bold, c.italic).then(() => player.render()).catch(() => {});
  if (history) checkpoint(before);
  S.sel = c.id; changed();
  return c;
}
function previewSound(id, b) {
  try {
    const a = new Audio(URL.createObjectURL(soundBlob(id)));
    b.disabled = true; a.onended = a.onerror = () => { b.disabled = false; URL.revokeObjectURL(a.src); };
    a.play().catch(() => { b.disabled = false; toast("This browser blocked the preview sound."); });
  } catch (e) { toast(e.message); }
}
const SCENES = [
  { name: "Purple glow", bg: ["#5b4cf0", "#8b5cf6"], art: "spot" }, { name: "Ocean", bg: ["#2f80ff", "#14b8a6"], art: "waves" },
  { name: "Sunset", bg: ["#ff7a59", "#ff6b9a"], art: "circles" }, { name: "Party", bg: ["#ffd166", "#ff6b9a"], art: "confetti" },
  { name: "Night", bg: ["#0f172a", "#334155"], art: "grid" }, { name: "Mint", bg: ["#06d6a0", "#5ec8ff"], art: "blobs" },
  { name: "Bold red", bg: ["#ff3b3b", "#8b5cf6"], art: "burst" }, { name: "Paper", bg: ["#fdf2e9", "#f5c6a5"], art: "frame", accent: "#b5651d" },
];
function renderElementsPanel(el) {
  el.innerHTML = `<p class="mx-hint">Shapes, stickers and titles go on top of the video at the playhead. Colour scenes join the end of the video.</p>
    <h3 class="vxp-h">Shapes</h3><div class="vxp-grid">${SHAPES.map((x) => `<button class="vxp-el" data-shape="${x.id}" aria-label="Add ${esc(x.label)}" title="${esc(x.label)}"><span style="color:${x.color};text-shadow:0 0 1px #0006">${esc(x.text)}</span></button>`).join("")}</div>
    <h3 class="vxp-h">Stickers</h3><div class="vxp-grid two">${STICKERS.map((x) => `<button class="vxp-st" data-sticker="${x.id}" aria-label="Add sticker ${esc(x.label)}"><span style="color:${x.color};background:${x.bg || "#1b2133"}">${esc(x.text)}</span></button>`).join("")}</div>
    <h3 class="vxp-h">Colour scenes</h3><div class="vxp-grid two">${SCENES.map((x, i) => `<button class="vxp-scene" data-scene="${i}" aria-label="Add scene ${esc(x.name)}"><span class="sw">${G.sceneSvg(x, 160, 90)}</span><small>${esc(x.name)}</small></button>`).join("")}</div>`;
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.shape) { const x = SHAPES.find((s) => s.id === b.dataset.shape); addOverlay({ text: x.text, color: x.color, size: 200, bold: false, bg: "", animIn: "pop", animOut: "fade", y: 0.5 }); }
    else if (b.dataset.sticker) { const x = STICKERS.find((s) => s.id === b.dataset.sticker); addOverlay({ text: x.text, color: x.color, bg: x.bg ? x.bg + "f0" : "", size: 72, bold: true, animIn: "pop", animOut: "fade", y: 0.2, x: 0.5 }); }
    else if (b.dataset.scene) addScene(SCENES[+b.dataset.scene]);
  });
}
function renderTextExtras(el) {
  const box = hEl("div", "vxp-extra", `<h3 class="vxp-h">Text combinations</h3><div class="vxp-combos">${TITLES.map((x) => `<button class="vxp-combo" data-combo="${x.id}"><b>${esc(x.parts[0].text)}</b>${x.parts[1] ? `<small>${esc(x.parts[1].text)}</small>` : ""}<em>${esc(x.label)}</em></button>`).join("")}</div>`);
  box.addEventListener("click", (e) => {
    const b = e.target.closest("[data-combo]"); if (!b) return;
    const x = TITLES.find((t) => t.id === b.dataset.combo), before = snap();
    let last = null; x.parts.forEach((p) => { last = addOverlay({ ...M.TEXT_STYLES[p.style], ...p, style: undefined, label: undefined }, { history: false }); });
    checkpoint(before); if (last) select(last.id);
  });
  el.append(box);
}
function renderSoundsPanel(el) {
  const tools = hEl("div", "vxp-extra vxp-audiotools", `<h3 class="vxp-h">Voiceover</h3><p class="mx-hint">Record your voice while the video plays from the playhead. It lands on the audio track at that spot.</p>
    <button class="btn primary block" data-vo="rec">Record voiceover</button>
    <h3 class="vxp-h">Beat Sync</h3><p class="mx-hint">Finds the beats of your music on this device and moves the cuts onto them.</p>
    <div class="mx-row"><button class="btn sm" data-beat="marks">Show beat markers</button><button class="btn sm" data-beat="sync">Sync now</button><button class="btn sm" data-beat="off">Hide markers</button></div>
    <h3 class="vxp-h">Volume</h3><div class="mx-row"><button class="btn sm" data-vol="balance">Balance all</button><button class="btn sm" data-vol="mute">Mute or unmute all</button></div>`);
  tools.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.vo) recordVoiceover();
    else if (b.dataset.beat === "marks") beatMarkers(true);
    else if (b.dataset.beat === "off") beatMarkers(false);
    else if (b.dataset.beat === "sync") beatSyncNow();
    else if (b.dataset.vol === "balance") balanceAll();
    else if (b.dataset.vol === "mute") muteAll(!allMuted());
  });
  el.append(tools);
  const box = hEl("div", "vxp-extra", `<h3 class="vxp-h">Built-in music and sounds</h3><p class="mx-hint">Made on your device, free to use in your videos.</p>
    <ul class="vxp-sounds">${SOUNDS.map((s) => `<li><button class="ic sm" data-preview="${s.id}" aria-label="Play ${esc(s.name)}" title="Listen">${icon("play")}</button><span><b>${esc(s.name)}</b><small>${esc(s.kind)} · ${esc(s.hint)}</small></span><button class="btn sm" data-sound="${s.id}" aria-label="Add ${esc(s.name)}">Add</button></li>`).join("")}</ul>`);
  box.addEventListener("click", (e) => {
    const p = e.target.closest("[data-preview]"); if (p) previewSound(p.dataset.preview, p);
    const a = e.target.closest("[data-sound]"); if (a) addSound(a.dataset.sound);
  });
  el.append(box);
}
// ---------- captions (import .srt / .vtt, script -> timed captions, looks, .srt download) ----------
const captionClips = () => S.p.text.filter((c) => c.cap);
function captionLines() { const caps = captionClips(); return (caps.length ? caps : S.p.text).map((c) => ({ start: c.start, dur: c.dur, text: c.text })); }
function addCaptionLines(lines, style = S.capStyle || "box") {
  const ok = (lines || []).filter((l) => String(l.text || "").trim() && l.dur > 0);
  if (!ok.length) { toast("No captions found. Check the file or type some words."); return []; }
  const st = CP.CAPTION_STYLES[style] || CP.CAPTION_STYLES.box, before = snap();
  const added = ok.map((l) => M.addText(S.p, { style: "caption", text: String(l.text).trim(), start: Math.max(0, l.start), dur: Math.max(M.MIN_LEN, l.dur), size: 50, cap: true,
    ...CP.captionLook(st), x: 0.5, align: "center", animIn: "fade", animOut: "fade" }));
  checkpoint(before); S.sel = added[0].id; changed();
  toast(`Added ${added.length} caption${added.length === 1 ? "" : "s"}.`);
  return added;
}
function styleCaptions(style) {
  const st = CP.CAPTION_STYLES[style]; if (!st) return 0;
  S.capStyle = style;
  const caps = captionClips(); if (!caps.length) { toast(`${st.label}: new captions get this look.`); return 0; }
  const before = snap();
  for (const c of caps) Object.assign(c, CP.captionLook(st));
  ensureFont(st.family, st.bold).then(() => player.render()).catch(() => {});
  checkpoint(before); changed(); toast(`${st.label} on ${caps.length} captions.`);
  return caps.length;
}
/** Word animation (Reveal, Highlight, Snake or none) on every caption. */
function captionAnim(kind) {
  if (!M.CAPTION_ANIMS[kind]) return 0;
  const caps = captionClips(); if (!caps.length) { toast("Add captions first."); return 0; }
  const before = snap();
  for (const c of caps) { c.capAnim = kind; c.hl ||= "#ffd166"; }
  checkpoint(before); changed(); toast(kind === "none" ? "Word animation removed." : `${M.CAPTION_ANIMS[kind]} on ${caps.length} captions.`);
  return caps.length;
}
function downloadSrt() {
  const l = captionLines();
  if (!l.length) { toast("Add captions first (Captions panel)."); return null; }
  const blob = new Blob([CP.toSrt(l)], { type: "application/x-subrip" });
  downloadBlob(blob, fileName("srt"));
  return blob;
}
function renderCaptionsPanel(el) {
  const caps = captionClips();
  el.innerHTML = `<p class="mx-hint">Captions are words on the video, timed to what is said. Import a captions file, or type the script and it is spread over the video.</p>
    <label class="btn primary block" for="capFile">Import a .srt or .vtt file</label>
    <input type="file" id="capFile" accept=".srt,.vtt,text/vtt,application/x-subrip" hidden>
    <h3 class="vxp-h">Type the script</h3>
    <textarea class="ad-input vxp-script" id="capScript" rows="5" placeholder="Type or paste what is said. A sentence becomes a caption; a blank line is a pause."></textarea>
    <button class="btn block" id="capMake">Make captions</button>
    <h3 class="vxp-h">Caption look</h3>
    <div class="vxp-capstyles">${Object.entries(CP.CAPTION_STYLES).map(([k, s]) => `<button class="vxp-capstyle${(S.capStyle || "box") === k ? " on" : ""}" data-capstyle="${k}" aria-pressed="${(S.capStyle || "box") === k}"><span style="color:${s.color};background:${s.bg || "#2b2d42"};font-family:${s.family === "serif" ? "Georgia,serif" : "inherit"};font-weight:${s.bold ? 700 : 400}">Aa</span><small>${esc(s.label)}</small></button>`).join("")}</div>
    <h3 class="vxp-h">Word animation</h3><p class="mx-hint">On every caption: words appear, light up or move as they are said.</p>
    <div class="vxp-trans">${Object.entries(M.CAPTION_ANIMS).map(([k, v]) => `<button class="btn sm" data-capanim="${k}" aria-pressed="${(caps[0]?.capAnim || "none") === k}">${esc(v)}</button>`).join("")}</div>
    <h3 class="vxp-h">Your captions (${caps.length})</h3>
    <ol class="vxp-caplist">${caps.slice(0, 120).map((c) => `<li><button class="vxp-captime" data-cap="${esc(c.id)}" title="Go to this caption">${fmtTime(c.start, true)}</button><input class="ad-input vxp-capedit" data-capedit="${esc(c.id)}" value="${esc(c.text)}" aria-label="Caption at ${fmtTime(c.start, true)}"><button class="ic sm" data-capdel="${esc(c.id)}" aria-label="Delete this caption" title="Delete this caption">×</button></li>`).join("") || '<li class="mx-hint">No captions yet.</li>'}</ol>
    <div class="mx-row"><button class="btn sm" id="capSrt"${caps.length || S.p.text.length ? "" : " disabled"}>Download .srt</button><button class="btn sm" id="capClear"${caps.length ? "" : " disabled"}>Delete all captions</button></div>
    <p class="mx-hint">Captions have their own row on the timeline: drag their edges to change timing. Dragging one caption on the video moves them all.</p>
    <p class="mx-hint">Automatic captions from the speech in your video (and translating them) come with AsaanDesk AI (coming soon). Nothing is uploaded today.</p>`;
  el.querySelector("#capFile").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    const lines = CP.parseSubtitles(await f.text());
    if (addCaptionLines(lines).length) shell?.openPanel("captions");
  });
  el.querySelector("#capMake").onclick = () => {
    const txt = el.querySelector("#capScript").value;
    const lines = CP.scriptToCaptions(txt, { total: player.total > 0 ? player.total : 0 });
    if (addCaptionLines(lines).length) shell?.openPanel("captions");
  };
  el.querySelectorAll("[data-capstyle]").forEach((b) => b.addEventListener("click", () => { styleCaptions(b.dataset.capstyle); shell?.openPanel("captions"); }));
  el.querySelectorAll("[data-cap]").forEach((b) => b.addEventListener("click", () => { const c = S.p.text.find((x) => x.id === b.dataset.cap); if (c) { seek(c.start + 0.01); select(c.id); } }));
  el.querySelectorAll("[data-capanim]").forEach((b) => b.addEventListener("click", () => { captionAnim(b.dataset.capanim); shell?.openPanel("captions"); }));
  // type a change right in the list (one undo step per line), or delete one line
  el.querySelectorAll("[data-capedit]").forEach((inp) => {
    let first = true;
    inp.addEventListener("focus", () => { first = true; const c = S.p.text.find((x) => x.id === inp.dataset.capedit); if (c) { S.t = c.start + 0.01; player.seek(S.t); } });
    inp.addEventListener("input", () => {
      const c = S.p.text.find((x) => x.id === inp.dataset.capedit); if (!c) return;
      if (first) { checkpoint(); first = false; }
      c.text = inp.value; changed({ history: false, light: true });
    });
    inp.addEventListener("change", () => changed({ history: false }));
  });
  el.querySelectorAll("[data-capdel]").forEach((b) => b.addEventListener("click", () => { const before = snap(); if (M.removeClip(S.p, b.dataset.capdel)) { checkpoint(before); if (S.sel === b.dataset.capdel) S.sel = null; changed(); shell?.openPanel("captions"); } }));
  el.querySelector("#capSrt").onclick = () => downloadSrt();
  el.querySelector("#capClear").onclick = () => { const before = snap(); S.p.text = S.p.text.filter((c) => !c.cap); checkpoint(before); S.sel = null; changed(); shell?.openPanel("captions"); toast("Captions removed."); };
}

// ---------- animate (text animation, scene transitions, fade the whole video) ----------
/** What the Animate panel changes: the selected text or picture overlay, else every text. */
function animTargets() {
  const f = S.sel && M.findClip(S.p, S.sel);
  if (f && (f.track === "text" || f.track === "overlay")) return { list: [f.clip], one: f.track === "overlay" ? "the selected picture" : "the selected text" };
  return { list: S.p.text, one: "" };
}
/** Applies an animation On enter, On exit or Both (Canva's choice); "none" removes it. */
function animateTexts(anim, mode = S.animMode || "both") {
  if (!M.ANIMS[anim]) return 0;
  const sf = S.sel && M.findClip(S.p, S.sel);
  if (sf?.track === "video" || sf?.track === "audio") {
    // a video clip (or sound) fades its picture / sound in and out: Fade On enter, On exit or Both, or Remove
    if (anim !== "fade" && anim !== "none") { toast("Clips on the main track fade in and out: choose Fade. The other animations are for text and pictures."); return 0; }
    const c = sf.clip, d = anim === "none" ? 0 : Math.min(S.animClipDur || 0.5, M.clipLen(c) / 2), before = snap();
    if (anim === "none" || mode !== "exit") c.fadeIn = Math.round(d * 10) / 10;
    if (anim === "none" || mode !== "enter") c.fadeOut = Math.round(d * 10) / 10;
    checkpoint(before); changed();
    toast(anim === "none" ? "Fades removed from the clip." : `The clip fades ${mode === "enter" ? "in" : mode === "exit" ? "out" : "in and out"} (${d.toFixed(1)} s).`);
    return 1;
  }
  const { list, one } = animTargets();
  if (!list.length) { toast("Add some text first."); return 0; }
  const before = snap();
  for (const c of list) {
    if (anim === "none") { c.animIn = "none"; c.animOut = "none"; continue; }
    if (mode !== "exit") c.animIn = anim;
    if (mode !== "enter") c.animOut = anim === "typewriter" ? "fade" : anim;
    if (mode === "enter" && c.animOut === undefined) c.animOut = "none";
  }
  checkpoint(before); changed();
  toast(anim === "none" ? "Animation removed." : `${M.ANIMS[anim]} ${mode === "enter" ? "on enter" : mode === "exit" ? "on exit" : ""} on ${one || `${list.length} texts`}.`.replace("  ", " "));
  return list.length;
}
/** Animation speed: Slow / Medium / Fast intro and outro lengths. */
function animSpeed(key) {
  const sp = M.ANIM_SPEEDS[key]; if (!sp) return 0;
  const sf = S.sel && M.findClip(S.p, S.sel);
  if (sf?.track === "video" || sf?.track === "audio") {
    S.animClipDur = sp.dur;
    const c = sf.clip, before = snap(), d = Math.min(sp.dur, M.clipLen(c) / 2);
    if (c.fadeIn > 0) c.fadeIn = d; if (c.fadeOut > 0) c.fadeOut = d;
    checkpoint(before); changed(); toast(`${sp.label}: clip fades take ${d.toFixed(1)} s.`);
    return 1;
  }
  const { list, one } = animTargets();
  if (!list.length) { toast("Add some text first."); return 0; }
  const before = snap();
  for (const c of list) { c.animInDur = sp.dur; c.animOutDur = sp.dur; }
  checkpoint(before); changed(); toast(`${sp.label} animations (${sp.dur} s) on ${one || `${list.length} texts`}.`);
  return list.length;
}
function transitionAll(type) {
  if (!M.TRANSITIONS[type]) return 0;
  if (S.p.video.length < 2) { toast("Transitions go between two clips. Add another clip or scene."); return 0; }
  const before = snap();
  S.p.video.forEach((c, i) => { if (i) c.transition = { dur: c.transition?.dur || 0.5, ...c.transition, type }; });
  checkpoint(before); changed(); toast(`${M.TRANSITIONS[type]} between all ${S.p.video.length} clips.`);
  return S.p.video.length - 1;
}
function fadeWhole(on) {
  if (!S.p.video.length) { toast("Add a clip first."); return; }
  const before = snap(), a = S.p.video[0], z = S.p.video[S.p.video.length - 1];
  a.fadeIn = on ? Math.min(0.8, M.clipLen(a) / 3) : 0; z.fadeOut = on ? Math.min(1, M.clipLen(z) / 3) : 0;
  checkpoint(before); changed(); toast(on ? "The video fades in and out." : "Fades removed.");
}
function renderAnimatePanel(el) {
  const mode = S.animMode || "both";
  el.innerHTML = `<h3 class="vxp-h">Text and picture animation</h3><p class="mx-hint">On the selected text or picture overlay, or on all text when none is selected. A selected video clip can Fade on enter, on exit or both.</p>
    <div class="mx-seg" role="group" aria-label="When it animates">${[["both", "Both"], ["enter", "On enter"], ["exit", "On exit"]].map(([k, v]) => `<button data-animmode="${k}" aria-pressed="${mode === k}">${v}</button>`).join("")}</div>
    <div class="vxp-anims">${Object.entries(M.ANIMS).map(([k, v]) => `<button class="vxp-anim" data-anim="${k}"><i class="a-${k}" aria-hidden="true">Aa</i><span>${esc(k === "none" ? "Remove" : v)}</span></button>`).join("")}</div>
    <h3 class="vxp-h">Speed</h3><div class="mx-seg" role="group" aria-label="Animation speed">${Object.entries(M.ANIM_SPEEDS).map(([k, v]) => `<button data-animspeed="${k}">${esc(v.label)}</button>`).join("")}</div>
    <p class="mx-hint">Exact intro and outro lengths: select a text, then Edit.</p>
    <h3 class="vxp-h">Captions</h3><div class="vxp-trans">${Object.entries(M.CAPTION_ANIMS).map(([k, v]) => `<button class="btn sm" data-capanim="${k}">${esc(k === "none" ? "No word animation" : v)}</button>`).join("")}</div>
    <h3 class="vxp-h">Scene transitions</h3><p class="mx-hint">Between every clip and scene. Change one clip in the toolbar.</p>
    <div class="vxp-trans">${Object.entries(M.TRANSITIONS).map(([k, v]) => `<button class="btn sm" data-alltrans="${k}">${esc(k === "none" ? "No transitions" : v)}</button>`).join("")}</div>
    <h3 class="vxp-h">Whole video</h3>
    <div class="mx-row"><button class="btn sm" id="fadeOn">Fade in and out</button><button class="btn sm" id="fadeOff">No fades</button></div>`;
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.anim) animateTexts(b.dataset.anim);
    else if (b.dataset.animmode) { S.animMode = b.dataset.animmode; el.querySelectorAll("[data-animmode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }
    else if (b.dataset.animspeed) animSpeed(b.dataset.animspeed);
    else if (b.dataset.capanim) captionAnim(b.dataset.capanim);
    else if (b.dataset.alltrans) transitionAll(b.dataset.alltrans);
    else if (b.id === "fadeOn") fadeWhole(true);
    else if (b.id === "fadeOff") fadeWhole(false);
  });
}

// ---------- AI tools (honest: AsaanDesk AI is not switched on yet; working tools are linked) ----------
function renderMagicPanel(el) {
  const soon = (title, text) => `<li class="vxp-ai"><b>${title}</b><span>${text}</span><em>Coming soon with AsaanDesk AI</em></li>`;
  el.innerHTML = `<p class="mx-hint">AsaanDesk AI is not switched on yet, so these say "coming soon" and nothing is sent anywhere. What works today is linked.</p>
    <ul class="vxp-ailist">
      <li class="vxp-ai"><b>Captions</b><span>Import a captions file or turn your script into timed captions.</span><button class="btn sm" data-go="captions">Open Captions</button></li>
      <li class="vxp-ai"><b>Voiceover</b><span>Type a script, hear it read, record your voice and add it as sound.</span><a class="btn sm" href="/design/voice/" target="_blank" rel="noopener">Open Text to speech</a></li>
      <li class="vxp-ai"><b>Text to video</b><span>Describe a short clip in words.</span><a class="btn sm" href="/design/ai-media/?tool=video" target="_blank" rel="noopener">Open AI video</a></li>
      ${soon("Automatic captions", "Captions made from the speech in your video.")}
      ${soon("Highlights", "Finds the best moments of a long video.")}
      ${soon("Background remover", "Removes the background behind a person in a video.")}
      ${soon("Enhance voice", "Removes background noise from speech in a video or sound.")}
      ${soon("Translate captions", "Captions in another language.")}
      <li class="vxp-ai"><b>Trim silent start and end</b><span>Works today without AI: select a video or sound clip, then Edit.</span></li>
      <li class="vxp-ai"><b>Beat Sync</b><span>Works today without AI: cuts land on the beat of your music.</span><button class="btn sm" data-go="audio">Open Audio</button></li>
    </ul>`;
  el.querySelector('[data-go="captions"]').onclick = () => shell?.openPanel("captions");
  el.querySelector('[data-go="audio"]').onclick = () => shell?.openPanel("audio");
}

// ---------- audio only: every sound of the video mixed offline (faster than real time) into a WAV ----------
async function exportAudio() {
  player.pause();
  const total = player.total; if (!(total > 0)) return null;
  await assets.ready();
  if (!C2.audioSegments(S.p).some((g) => assets.sound(g.mediaId))) { toast("This video has no sound to save."); return null; }
  const box = progressBox("Saving the sound");
  try {
    const sr = 48000, ac = new OfflineAudioContext(2, Math.max(1, Math.ceil(total * sr)), sr);
    scheduleSounds(ac, ac.destination, S.p, M.layoutVideo(S.p.video), assets, 0, 0);
    box.set("Mixing…", 0.3);
    const buf = await ac.startRendering();
    const blob = new Blob([audioBufferToWav(buf)], { type: "audio/wav" });
    box.close();
    S.lastAudio = { blob, name: fileName("wav"), duration: buf.duration, size: blob.size };
    downloadBlob(blob, S.lastAudio.name);
    toast(`Sound saved: ${fmtTime(buf.duration)} WAV, ${fmtBytes(blob.size)}.`);
    return S.lastAudio;
  } catch (e) { box.close(); toast(e.message || "The sound could not be saved.", 6000); return null; }
}

// ---------- GIF (animated, no sound): frames drawn by the player, packed by our own GIF encoder ----------
async function exportGif({ maxSide = 480 } = {}) {
  player.pause();
  const total = player.total; if (!(total > 0)) return null;
  const { w: W0, h: H0 } = exportSize(S.p.preset, 720), k = Math.min(1, maxSide / Math.max(W0, H0));
  const w = Math.round((W0 * k) / 2) * 2, h = Math.round((H0 * k) / 2) * 2;
  const fps = total > 20 ? 6 : 10, n = Math.max(1, Math.min(300, Math.ceil(total * fps)));
  const box = progressBox("Making a GIF"), at = S.t;
  try {
    const { encodeGif } = await import("../studio/gif.js");
    await loadFonts(S.p);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true }), frames = [];
    for (let i = 0; i < n; i++) {
      if (box.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const t = Math.min(total - 0.001, i / fps);
      await player.seek(t); player.render(t, ctx, w, h);
      frames.push({ data: ctx.getImageData(0, 0, w, h).data, delay: 1000 / fps });
      box.set(`Frame ${i + 1} of ${n}`, ((i + 1) / n) * 0.8);
      if (i % 4 === 3) await new Promise((r) => setTimeout(r));
    }
    box.set("Packing the GIF…", 0.85); await new Promise((r) => setTimeout(r, 30));
    const blob = new Blob([encodeGif(frames, w, h)], { type: "image/gif" });
    box.close();
    S.lastGif = { blob, name: fileName("gif"), frames: n, width: w, height: h, size: blob.size };
    downloadBlob(blob, S.lastGif.name);
    toast(`GIF ready: ${w}×${h}, ${n} frames, ${fmtBytes(blob.size)}.`);
    return S.lastGif;
  } catch (e) {
    box.close();
    if (isAbort(e)) { toast("GIF cancelled."); return null; }
    toast(e.message || "The GIF could not be made.", 6000); return null;
  } finally { await seek(at); }
}

// ---------- pill toolbar (split, trim, speed, volume, transition, text style) ----------
function bindPill() {
  const sel = () => S.sel && M.findClip(S.p, S.sel);
  $("#pSplit").onclick = split;
  const trimTo = (edge) => { const f = sel(); if (!f) { toast("Select a clip on the timeline first."); return; } const before = snap(); M.trimToTime(S.p, S.sel, edge, S.t); checkpoint(before); changed(); };
  $("#pTrimS").onclick = () => trimTo("start");
  $("#pTrimE").onclick = () => trimTo("end");
  $("#pSpeed").onchange = (e) => { const f = sel(); if (!f || f.track === "text") return; const before = snap(); M.setSpeed(S.p, S.sel, Number(e.target.value)); checkpoint(before); changed(); };
  $("#pSlip").onclick = () => {
    if (!S.slip && !(S.sel && M.slipRange(S.p, S.sel))) { toast("Select a trimmed video or sound clip first: Slip picks which part of it plays."); return; }
    S.slip = !S.slip; renderTimeline(); renderPill(S.sel && M.findClip(S.p, S.sel));
    if (S.slip) toast("Slip is on: drag the clip left or right to choose which part plays.");
  };
  $("#pVol").oninput = (e) => editClip((c) => { c.volume = Number(e.target.value); c.muted = false; });
  $("#pVol").onchange = () => { S.editing = false; renderInspector(); };
  $("#pTrans").onchange = (e) => { const f = sel(); if (!f || f.track !== "video" || f.index === 0) return; editClip((c) => { c.transition = { dur: 0.5, ...(c.transition || {}), type: e.target.value }; }); S.editing = false; renderInspector(); };
  $("#pText").onchange = (e) => { const k = e.target.value; e.target.value = ""; if (k) addTextStyle(k); };
  $("#pColor").oninput = (e) => editClip((c) => { c.color = e.target.value; });
  $("#pColor").onchange = () => { S.editing = false; renderInspector(); };
  $("#pBold").onclick = () => { editClip((c) => { c.bold = !c.bold; }); S.editing = false; renderInspector(); };
  $("#pEdit").onclick = () => openSheet("edit");
}
function renderPill(f) {
  if (!els.pill) return;
  const c = f?.clip, track = f?.track, txt = track === "text", av = track === "audio" || (track === "video" && c.kind === "video");
  const r = f && M.clipRange(S.p, S.sel);
  $("#pSplit").disabled = !((r && r.start + M.MIN_LEN < S.t && S.t < r.end - M.MIN_LEN) || M.videoEntryAt(S.p, S.t));
  $("#pTrimS").disabled = $("#pTrimE").disabled = !f || c.kind === "endscreen";
  const sp = $("#pSpeed"); sp.disabled = !av;
  if (av && document.activeElement !== sp) {
    const v = String(c.speed || 1);
    sp.querySelector("option[data-custom]")?.remove();
    if (![...sp.options].some((o) => o.value === v)) { const o = new Option(`${v}× speed`, v); o.dataset.custom = "1"; sp.add(o); }
    sp.value = v;
  }
  const slipOk = !!(f && M.slipRange(S.p, S.sel));
  if (!slipOk && S.slip) S.slip = false;
  const sb = $("#pSlip"); sb.disabled = !slipOk; sb.setAttribute("aria-pressed", String(S.slip));
  const vol = $("#pVol"); vol.disabled = !av; if (av && document.activeElement !== vol) vol.value = String(c.volume ?? 1);
  const tr = $("#pTrans"); tr.disabled = !(track === "video" && f.index > 0); if (!tr.disabled && document.activeElement !== tr) tr.value = c.transition?.type || "none";
  const col = $("#pColor"); col.disabled = !txt; if (txt && document.activeElement !== col && /^#[0-9a-f]{6}$/i.test(c.color)) col.value = c.color;
  const b = $("#pBold"); b.disabled = !txt; b.setAttribute("aria-pressed", String(!!(txt && c.bold)));
  $("#pEdit").disabled = !f;
}

// ---------- test hooks ----------
const api = {
  state: S,
  get project() { return S.p; },
  get player() { return player; },
  assets, model: M,
  importFiles, select, seek, split, del, dup, undo, redo, addText: addTextStyle,
  play: () => player.play(), pause: () => player.pause(),
  exportVideo: (o) => runExport(o), exportAudio: () => exportAudio(), get lastAudio() { return S.lastAudio; },
  get lastExport() { return S.lastExport; },
  applyTemplate, get shell() { return shell; }, exportGif: (o) => exportGif(o), downloadSrt: () => downloadSrt(), addCaptionLines: (l, s) => addCaptionLines(l, s),
  styleCaptions: (s) => styleCaptions(s), animateTexts: (a) => animateTexts(a), transitionAll: (t) => transitionAll(t), get lastGif() { return S.lastGif; },
  addPictureOverlay: (mediaId) => addPictureOverlay(S.p.media[mediaId]), addSound: (id) => addSound(id), addOverlay: (o) => addOverlay(o), addScene: (sc) => addScene(sc),
  save: saveNow,
  // round 3 (Canva help-page functions)
  setSpeed: (s) => { const before = snap(), c = M.setSpeed(S.p, S.sel, s); if (c) { checkpoint(before); changed(); } return c; },
  slip: (ds) => { const before = snap(), c = M.slipClip(S.p, S.sel, ds); if (c) { checkpoint(before); changed(); } return c; },
  setTimelineHeight: (h) => { els.vx.style.setProperty("--vx-tl-h", h + "px"); S.tlH = h; return getComputedStyle($(".vx-tl-body")).maxHeight; }, get zoom() { return S.pps; }, setZoom: (pps) => setZoom(pps),
  setSlipMode: (on) => { S.slip = !!on; renderTimeline(); renderPill(S.sel && M.findClip(S.p, S.sel)); return S.slip; },
  toggleMulti: (id) => toggleMulti(id), multiIds: () => multiIds(), setMultiLength: (l) => setMultiLength(l),
  replaceWith: (mediaId) => replaceWith(mediaId), openReplace: () => openReplace(),
  setLook: (look) => { const f = S.sel && M.findClip(S.p, S.sel); if (!f || f.track === "text" || f.track === "audio") return null; const before = snap(); Object.assign(f.clip, look); checkpoint(before); changed(); return f.clip; },
  extractAudio: () => extractAudio(), moveTrack: (to) => moveTrack(to), addOverlayMedia: (mediaId) => addPictureOverlay(S.p.media[mediaId]), autoTrim: () => autoTrim(), balanceAll: () => balanceAll(), muteAll: (on) => muteAll(on),
  setTransition: (type, dir, dur) => { const f = S.sel && M.findClip(S.p, S.sel); if (!f || f.track !== "video" || !f.index) return null; const before = snap(); f.clip.transition = { ...(f.clip.transition || {}), type, ...(dir ? { dir } : {}), ...(dur ? { dur } : {}) }; checkpoint(before); changed(); return f.clip.transition; },
  frameAt: (t) => frameAt(S.p, t),
  openPlusMenu: () => openPlusMenu($("#tlAddMedia")), recordVoiceover: (o) => recordVoiceover(o), stopVoiceover: () => { if (S.vo) S.vo.stop = true; },
  findBeats: async () => { const c = beatClip(); const m = c && await findBeats(c); return m ? { bpm: m.bpm, beats: m.beats.length } : null; },
  beatMarkers: (on) => beatMarkers(on), beatSyncNow: () => beatSyncNow(), beatPoints: () => beatPoints(),
  captionAnim: (k) => captionAnim(k), animSpeed: (k) => animSpeed(k), animateTexts2: (a, mode) => animateTexts(a, mode),
  duration: () => player.total,
  ready: () => assets.ready(),
};
