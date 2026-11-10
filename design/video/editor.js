// Video editor UI (also the YouTube editor with ?preset=youtube). Timeline + preview + inspector, autosaved in this browser.
import * as M from "./model.js";
import { exportSize, fitRect } from "./compose.js";
import { chaptersText, checkChapters, fmtChapterTime, parseChapters } from "./chapters.js";
import { Assets, Player, exportWebM, exportMp4, snapshot, peaksOf, loadFonts } from "./player.js";
import { probeVideo, seekTo } from "./mediakit.js";
import { putMedia, getMedia, deleteMediaOf, storageLeft } from "./mediastore.js";
import { $, $$, esc, toast, downloadBlob, fmtTime, fmtBytes, baseName, progressBox, isAbort } from "./ui.js";
import { saveProject, listProjects, getProject, deleteProject, takeHandoff, uid } from "../shared/store.js";
import { FONT_FAMILIES, ensureFont, loadBrand } from "../shared/brand.js";

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

const S = { p: null, sel: null, t: 0, pps: 40, tab: "media", yt: false, guides: false, undo: [], redo: [], sheet: "", busy: 0, presetChosen: false, lastExport: null, saved: "" };
const assets = new Assets();
let player, els = {};

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
}

// ---------- layout ----------
function buildBar(bar) {
  const slot = document.createElement("div");
  slot.className = "mx-bar-actions vx-baract";
  slot.innerHTML = `<input class="ad-input vx-name" id="vxName" aria-label="Project name" maxlength="80">
    <span class="vx-saved" id="vxSaved" aria-live="polite"></span>
    <button class="btn sq" id="bUndo" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" disabled>${icon("undo")}</button>
    <button class="btn sq" id="bRedo" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)" disabled>${icon("redo")}</button>
    <button class="btn" id="bProjects">Projects</button>
    <button class="btn primary" id="bExport">Export</button>`;
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
    <div class="vx-tl-bar">
      <span class="vx-tl-title">Timeline</span><span class="mx-hint" id="tlHint">Drag clips to reorder · drag the edges to trim</span><span class="mx-grow"></span>
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
  els.name = $("#vxName"); els.saved = $("#vxSaved");
  bindUi();
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
function setSaved(t) { S.saved = t; if (els.saved) els.saved.textContent = t; }
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
function addToTimeline(m, opts = {}) {
  if (m.kind === "audio") return M.addAudioClip(S.p, m, { start: opts.start ?? (S.t < player.total - 0.1 ? S.t : 0) });
  const c = M.addVideoClip(S.p, m, opts);
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
  const kindLabel = { video: "Video", image: "Photo", audio: "Sound" }[m.kind];
  return `<div class="vx-libitem" data-media="${esc(m.id)}"><button class="vx-libadd" data-add="${esc(m.id)}" aria-label="Add ${esc(m.name)} to the timeline">
    ${m.thumb ? `<img alt="" src="${esc(m.thumb)}">` : `<span class="ph">${m.kind === "audio" ? icon("audio") : ""}</span>`}
    <span class="nm">${esc(m.name)}</span><small>${kindLabel}${m.duration ? " · " + fmtTime(m.duration) : ""}</small></button>
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
  if (!f) {
    const pr = M.PRESETS[S.p.preset], sz = exportSize(S.p.preset, 1080);
    I.innerHTML = `${head("Edit")}<div class="vx-insp-empty"><p><b>Select a clip</b> on the timeline to trim it, change speed, volume, fades and transitions, or edit text.</p>
      <dl class="vx-facts"><dt>Length</dt><dd>${fmtTime(player.total, true)}</dd><dt>Size</dt><dd>${esc(pr.label)} · ${sz.w}×${sz.h}</dd><dt>Clips</dt><dd>${S.p.video.length} video · ${S.p.text.length} text · ${S.p.audio.length} sound</dd></dl>
      <p class="mx-hint">Keys: Space play · S split · Delete · Ctrl+D duplicate · [ ] trim to playhead · ← → one frame</p></div>`;
    return;
  }
  const c = f.clip, m = S.p.media[c.mediaId], r = M.clipRange(S.p, c.id);
  const actions = `<div class="mx-row vx-actions"><button class="btn" data-act="split">Split</button><button class="btn" data-act="dup">Duplicate</button><button class="btn danger" data-act="del">Delete</button></div>`;
  const fades = f.track === "text" ? "" : `<div class="mx-row">${field("Fade in", range("fadeIn", c.fadeIn, 0, 3, 0.1, "Fade in seconds"), `${c.fadeIn.toFixed(1)} s`)}${field("Fade out", range("fadeOut", c.fadeOut, 0, 3, 0.1, "Fade out seconds"), `${c.fadeOut.toFixed(1)} s`)}</div>`;
  const first = f.track === "video" && f.index === 0;
  const trans = f.track === "video" ? `<h4>Transition into this clip</h4>${first ? '<p class="mx-hint">Transitions go between two clips. Add another clip before this one.</p>' :
    `${sel("transition.type", M.TRANSITIONS, c.transition?.type || "none", "Transition")}${c.transition?.type && c.transition.type !== "none" ? field("Length", range("transition.dur", c.transition.dur, 0.2, 2, 0.1, "Transition seconds"), `${(c.transition.dur || 0).toFixed(1)} s`) : ""}`}` : "";
  const timeRow = `<p class="vx-when">${fmtTime(r.start, true)} → ${fmtTime(r.end, true)} <small>(${fmtTime(r.end - r.start, true)})</small></p>`;
  let html = "";
  if (f.track === "text") {
    html = `${head("Text")}${timeRow}${field("Words", `<textarea class="ad-input" data-k="text" rows="3" aria-label="Text">${esc(c.text)}</textarea>`)}
      <div class="mx-row">${field("Font", sel("family", Object.fromEntries(Object.entries(FONT_FAMILIES).map(([k, v]) => [k, v.label])), c.family, "Font"))}${field("Colour", `<input type="color" data-k="color" value="${esc(c.color)}" aria-label="Text colour">`)}</div>
      ${field("Size", range("size", c.size, 24, 220, 2, "Text size"), `${c.size}`)}
      <div class="mx-row"><div class="mx-seg" role="group" aria-label="Style"><button data-toggle="bold" aria-pressed="${!!c.bold}"><b>B</b> Bold</button><button data-toggle="italic" aria-pressed="${!!c.italic}"><i>I</i> Italic</button></div>
      ${seg("align", [["left", "Left"], ["center", "Centre"], ["right", "Right"]], c.align, "Alignment")}</div>
      ${field("Box behind text", sel("bg", { "": "None", "#000000a6": "Dark box", "#ffffffe6": "Light box", [c.bg && !["#000000a6", "#ffffffe6"].includes(c.bg) ? c.bg : "#5b4cf0e6"]: "Colour box" }, c.bg || "", "Box behind text"))}
      ${field("Position", seg("pos", [["0.14", "Top"], ["0.5", "Middle"], ["0.86", "Bottom"]], [0.14, 0.5, 0.86].find((y) => Math.abs(y - c.y) < 0.01) ?? "", "Position"))}
      <div class="mx-row">${field("Left ↔ right", range("x", c.x, 0.05, 0.95, 0.01, "Horizontal position"))}${field("Up ↕ down", range("y", c.y, 0.05, 0.95, 0.01, "Vertical position"))}</div>
      <div class="mx-row">${field("Animation in", sel("animIn", M.ANIMS, c.animIn, "Animation in"))}${field("Animation out", sel("animOut", M.ANIMS, c.animOut === "typewriter" ? "fade" : c.animOut, "Animation out"))}</div>
      <div class="mx-row">${field("Starts at (s)", `<input class="ad-input" type="number" data-k="start" min="0" step="0.1" value="${c.start.toFixed(1)}">`)}${field("Length (s)", `<input class="ad-input" type="number" data-k="dur" min="0.1" step="0.1" value="${c.dur.toFixed(1)}">`)}</div>${actions}`;
  } else if (f.track === "audio") {
    html = `${head("Sound")}<p class="vx-clipname">${esc(m?.name || "Sound")}</p>${timeRow}
      ${volumeFields(c, true)}${fades}
      <div class="mx-row">${field("Starts at (s)", `<input class="ad-input" type="number" data-k="start" min="0" step="0.1" value="${c.start.toFixed(1)}">`)}</div>
      ${trimFields(c, m)}${field("Speed", seg("speed", M.SPEEDS.map((s) => [s, s + "×"]), c.speed, "Speed"), "pitch changes too")}${actions}`;
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
      ${isImg ? "" : field("Speed", seg("speed", M.SPEEDS.map((s) => [s, s + "×"]), c.speed, "Speed"))}
      ${isImg ? "" : volumeFields(c, m?.hasAudio !== false)}
      ${fades}${field("Fit", seg("fit", [["contain", "Fit (show all)"], ["cover", "Fill (crop)"]], c.fit, "Fit"))}${trans}${actions}`;
  }
  I.innerHTML = html;
}
function trimFields(c, m) {
  const max = m?.duration || c.out;
  return `<h4>Trim <small class="mx-hint">(seconds in the file, 0 to ${max.toFixed(1)})</small></h4>
    <div class="mx-row">${field("Start", `<input class="ad-input" type="number" data-k="in" min="0" max="${max}" step="0.1" value="${c.in.toFixed(2)}" aria-label="Trim start">`)}${field("End", `<input class="ad-input" type="number" data-k="out" min="0" max="${max}" step="0.1" value="${c.out.toFixed(2)}" aria-label="Trim end">`)}</div>
    <div class="mx-row"><button class="btn sm" data-act="inHere">Start at playhead</button><button class="btn sm" data-act="outHere">End at playhead</button></div>`;
}
function volumeFields(c, hasAudio) {
  if (!hasAudio) return '<p class="mx-hint">This clip has no sound.</p>';
  return `<div class="mx-row vx-vol">${field("Volume", range("volume", c.volume, 0, 2, 0.05, "Volume"), `${Math.round(c.volume * 100)}%`)}
    <button class="btn sm" data-toggle="muted" aria-pressed="${!!c.muted}">${c.muted ? "Muted" : "Mute"}</button></div>`;
}

// ---------- timeline ----------
const ROW = { video: 58, text: 30, audio: 40 };
function renderTimeline() {
  const p = S.p, pps = S.pps, total = player.total;
  const width = Math.max(els.tlScroll.clientWidth, (Math.max(total, 5) + 6) * pps);
  const lay = player.layout;
  const tl = M.lanes(p.text), al = M.lanes(p.audio);
  const hT = tl.count * ROW.text + 8, hA = al.count * ROW.audio + 8;
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  const step = steps.find((s) => s * pps >= 64) || 600;
  let ruler = "";
  for (let t = 0; t * pps < width; t += step) ruler += `<span class="tick" style="left:${t * pps}px">${fmtTime(t)}</span>`;
  if (S.yt) for (const ch of p.chapters) ruler += `<span class="chap" style="left:${ch.t * pps}px" title="${esc(ch.title)}"></span>`;
  const clipHtml = (c, left, w, cls, extra = "", top = 4, h = ROW.video - 8) => {
    const label = esc(c.text ?? p.media[c.mediaId]?.name ?? (c.kind === "endscreen" ? "End screen" : "Clip"));
    return `<div class="clip ${cls}${c.id === S.sel ? " sel" : ""}" data-id="${c.id}" role="button" tabindex="0" aria-pressed="${c.id === S.sel}" aria-label="${label}, ${fmtTime(left / pps, true)} to ${fmtTime((left + w) / pps, true)}" style="left:${left}px;width:${Math.max(6, w)}px;top:${top}px;height:${h}px">${extra}<span class="nm">${label}</span><span class="h l" data-edge="start" aria-hidden="true"></span><span class="h r" data-edge="end" aria-hidden="true"></span></div>`;
  };
  const vids = lay.map((e) => {
    const c = e.clip, m = p.media[c.mediaId];
    const bg = c.kind === "endscreen" ? "" : m?.thumb ? `<span class="th" style="background-image:url('${m.thumb}')"></span>` : "";
    const badges = `${c.speed !== 1 ? `<b class="bd">${c.speed}×</b>` : ""}${c.muted ? '<b class="bd">muted</b>' : ""}`;
    return clipHtml(c, e.start * pps, e.len * pps, `v k-${c.kind}`, bg + badges);
  }).join("") + lay.slice(1).map((e) => `<button class="tr${e.tIn.type !== "none" ? " on" : ""}" data-tr="${e.clip.id}" style="left:${(e.start + (e.tIn.type === "crossfade" ? e.tIn.dur / 2 : 0)) * pps}px" aria-label="Transition before clip ${e.index + 1}: ${M.TRANSITIONS[e.tIn.type]}" title="Transition: ${M.TRANSITIONS[e.tIn.type]}">◆</button>`).join("");
  const texts = p.text.map((c) => clipHtml(c, c.start * pps, c.dur * pps, "t", "", 4 + tl.map[c.id] * ROW.text, ROW.text - 6)).join("");
  const auds = p.audio.map((c) => clipHtml(c, c.start * pps, M.clipLen(c) * pps, "a", `<canvas class="wave" data-wave="${c.id}" aria-hidden="true"></canvas>`, 4 + al.map[c.id] * ROW.audio, ROW.audio - 6)).join("");
  els.tlInner.style.width = width + "px";
  els.tlInner.innerHTML = `<div class="ruler" data-row="ruler">${ruler}</div>
    <div class="row video" data-row="video" style="height:${ROW.video}px">${vids || '<span class="row-empty">Add videos or photos</span>'}</div>
    <div class="row text" data-row="text" style="height:${hT}px">${texts || '<span class="row-empty">Text overlays</span>'}</div>
    <div class="row audio" data-row="audio" style="height:${hA}px">${auds || '<span class="row-empty">Music and sounds</span>'}</div>
    <div class="ph" id="ph" style="left:${S.t * pps}px"><i></i></div><div class="drop" id="dropMark" hidden></div>`;
  els.tlLabels.innerHTML = `<div class="lb ruler"></div><div class="lb" style="height:${ROW.video}px">${icon("media")}<span>Video</span></div><div class="lb" style="height:${hT}px">${icon("text")}<span>Text</span></div><div class="lb" style="height:${hA}px">${icon("audio")}<span>Audio</span></div>`;
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
function select(id) { S.sel = id; renderTimeline(); renderInspector(); renderChrome(); }
async function seek(t) { S.t = Math.max(0, Math.min(t, player.total)); await player.seek(S.t); }
function split() {
  const before = snap();
  const b = (S.sel && M.splitAt(S.p, S.t, S.sel)) || M.splitAt(S.p, S.t);
  if (!b) { toast("Move the playhead inside a clip to split it."); return null; }
  checkpoint(before); S.sel = b.id; changed(); toast("Split. Delete a part or move it.");
  return b;
}
function del() {
  if (!S.sel) return;
  const before = snap();
  if (M.removeClip(S.p, S.sel)) { checkpoint(before); S.sel = null; changed(); }
}
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
      <label class="vx-opt"><input type="radio" name="fmt" value="webm"><span><b>WebM</b> is quicker and works offline. Plays in browsers, YouTube and VLC.</span></label></fieldset>
    <fieldset><legend>Quality</legend>
      <label class="vx-opt inline"><input type="radio" name="res" value="720"><span>720p</span></label>
      <label class="vx-opt inline"><input type="radio" name="res" value="1080" checked><span>1080p</span></label></fieldset>
    <p class="mx-hint">Your video plays once in real time while it records (${lenTxt}). Keep this tab open. MP4 then takes a little longer to convert.${globalThis.MediaRecorder?.isTypeSupported?.("video/webm") ? "" : " This browser records MP4 instead of WebM for the quick option."}</p>
    <div class="mx-row vx-dialog-btns"><button class="btn" value="cancel">Cancel</button><button class="btn primary" value="go" id="goExport">Export</button></div></form>`;
  document.body.append(d);
  d.addEventListener("close", () => {
    const go = d.returnValue === "go", fd = new FormData(d.querySelector("form"));
    d.remove();
    if (go) runExport({ format: fd.get("fmt"), res: Number(fd.get("res")) });
  });
  d.showModal();
}
const fileName = (ext) => (baseName(S.p.name).replace(/[\\/:*?"<>|]+/g, "").trim() || "video") + "." + ext;
async function runExport({ format = "webm", res = 1080 } = {}) {
  player.pause();
  const box = progressBox(format === "mp4" ? "Exporting MP4" : "Exporting WebM");
  try {
    const opts = { res, signal: box.signal, onProgress: (f) => box.set(null, f), onStatus: (t) => box.set(t) };
    const r = format === "mp4" ? await exportMp4(S.p, assets, opts) : await exportWebM(S.p, assets, opts);
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
  if (!matchMedia("(max-width: 760px)").matches) { if (name !== "edit" && sideTitles[name]) { S.tab = name; renderPanel(); } return; }
  if (S.sheet === name) name = "";
  S.sheet = name;
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
  $("#zIn").onclick = () => setZoom(S.pps * 1.4); $("#zOut").onclick = () => setZoom(S.pps / 1.4); $("#zFit").onclick = fitZoom;
  els.zoom.addEventListener("input", () => setZoom(8 * 25 ** (Number(els.zoom.value) / 100)));
  new ResizeObserver(() => { sizeCanvas(); }).observe(els.pvWrap);

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
      if (k === "in" || k === "out") M.setTrim(S.p, c.id, { [k === "in" ? "inT" : "outT"]: v });
      else if (k === "dur") { if (f.track === "text") c.dur = Math.max(M.MIN_LEN, v); else M.setTrim(S.p, c.id, { dur: v }); }
      else if (k === "start") M.moveItem(S.p, c.id, v);
      else if (k === "transition.type") { c.transition = { ...(c.transition || {}), type: v, dur: c.transition?.dur || 0.5 }; }
      else setPath(c, k, v);
      if (["family", "bold", "italic"].includes(k)) ensureFont(c.family, c.bold, c.italic).then(() => player.render());
      const lab = t.closest(".mx-field")?.querySelector("small");
      if (lab && t.type === "range") lab.textContent = k === "volume" ? `${Math.round(v * 100)}%` : k === "size" ? String(v) : `${v.toFixed(1)} s`;
    }, { inspector: k === "transition.type" });
  });
  I.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.seg) {
      const k = b.dataset.seg, raw = b.dataset.v;
      if (k === "speed") { checkpoint(); M.setSpeed(S.p, S.sel, Number(raw)); changed(); return; }
      S.editing = false;
      if (k === "pos") return editClip((c) => { c.y = Number(raw); c.x = 0.5; }, { inspector: true });
      return editClip((c) => { c[k] = raw; }, { inspector: true });
    }
    if (b.dataset.toggle) { S.editing = false; const k = b.dataset.toggle; return editClip((c) => { c[k] = !c[k]; if (["bold", "italic"].includes(k)) ensureFont(c.family, c.bold, c.italic).then(() => player.render()); }, { inspector: true }); }
    const act = b.dataset.act;
    if (act === "split") split(); else if (act === "dup") dup(); else if (act === "del") del();
    else if (act === "inHere" || act === "outHere") { const before = snap(); M.trimToTime(S.p, S.sel, act === "inHere" ? "start" : "end", S.t); checkpoint(before); changed(); }
  });

  // timeline pointer: trim handles, move/reorder clips, scrub
  const sc = els.tlScroll;
  const timeAt = (x) => (x - els.tlInner.getBoundingClientRect().left) / S.pps;
  sc.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const trBtn = e.target.closest(".tr");
    if (trBtn) { select(trBtn.dataset.tr); openSheet("edit"); return; }
    const handle = e.target.closest(".h"), clipEl = e.target.closest(".clip");
    const x0 = e.clientX, t0 = timeAt(x0);
    let moved = false;
    if (clipEl) {
      const id = clipEl.dataset.id, f = M.findClip(S.p, id), base = snap(), range = M.clipRange(S.p, id);
      if (S.sel !== id) select(id);
      const edge = handle?.dataset.edge;
      sc.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dt = (ev.clientX - x0) / S.pps;
        if (!moved && Math.abs(ev.clientX - x0) < 4) return;
        moved = true; player.pause();
        restore(base);
        if (edge) {
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
          const tol = 8 / S.pps, pts = M.snapPoints(S.p, id, [S.t]);
          const len = range.end - range.start, st = range.start + dt;
          const a = M.snap(st, pts, tol), b = M.snap(st + len, pts, tol) - len;
          M.moveItem(S.p, id, a !== st ? a : b);
          changed({ light: true, save: false, seek: false });
        }
      };
      const up = () => {
        sc.removeEventListener("pointermove", move); sc.removeEventListener("pointerup", up); sc.removeEventListener("pointercancel", up);
        if (!moved) return;
        if (!edge && f.track === "video") { restore(base); M.moveVideoClip(S.p, id, S.dragIdx ?? f.index); }
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
      player.render();
    };
    const up = () => { els.pv.removeEventListener("pointermove", move); els.pv.removeEventListener("pointerup", up); if (snap() !== before) { checkpoint(before); changed(); } };
    els.pv.addEventListener("pointermove", move); els.pv.addEventListener("pointerup", up);
  });

  // keyboard
  document.addEventListener("keydown", (e) => {
    if (!S.p) return; // still opening a project
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

// ---------- test hooks ----------
const api = {
  state: S,
  get project() { return S.p; },
  get player() { return player; },
  assets, model: M,
  importFiles, select, seek, split, del, dup, undo, redo, addText: addTextStyle,
  play: () => player.play(), pause: () => player.pause(),
  exportVideo: (o) => runExport(o),
  get lastExport() { return S.lastExport; },
  save: saveNow,
  duration: () => player.total,
  ready: () => assets.ready(),
};
