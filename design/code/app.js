// AsaanDesk code generator: pick a widget, change its settings, see it live, copy or download the code.
// Templates run fully in the browser (offline). "Describe with AI" uses AsaanDesk AI only when it is switched on.
import { WIDGETS, widgetById, normalize, renderWidget, warnings, PHOTO_SITE } from "./widgets.js";
import { photoOf, photoUrl } from "./photos.js";
import { loadBrand } from "../shared/brand.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";
import { saveProject, getProject, putHandoff } from "../shared/store.js";
import { cleanOwn, wrapDoc, titleOf, codeStats, sizeWarning, versionLabel, siteFromWidget } from "./own.js";

const $ = (id) => document.getElementById(id);
const SAVE_ID = "code-generator-settings";
const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })();
let brand = loadBrand();

const state = {
  mode: "templates", widget: null, raw: {}, opts: {}, code: null, view: "page", device: "desktop",
  warnings: [], copied: "", lastDownload: null, opened: 0, frameErrors: [], previewLoads: 0,
  ai: { html: "", prompt: "", error: "" }, ready: false,
  own: { html: "" }, // "My code": the user's own HTML (round 3)
};
const OWN_KEY = "asaandesk-code-own";
try { state.own.html = localStorage.getItem(OWN_KEY) || ""; } catch {}

const form = $("opts"), frame = $("preview"), codeEl = $("codeText");
const escHtml = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; d.cancel = () => clearTimeout(t); return d; };

/* ---------------------------------------------------------------- toast */
let toastTimer;
function toast(msg) {
  const t = $("toast");
  if (shell) { t.textContent = msg; try { shell.toast(msg); return; } catch {} }
  t.textContent = msg; t.hidden = false;
  t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------------------------------------------------------------- widget picker */
function buildPicker() {
  const list = $("pickList");
  list.innerHTML = WIDGETS.map((w) => `<button type="button" class="pick" data-id="${w.id}" aria-pressed="false" title="${escHtml(w.blurb)}">
    <span class="pick-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${w.icon}"/></svg></span>
    <span class="pick-name">${escHtml(w.name)}</span><span class="pick-blurb">${escHtml(w.blurb)}</span></button>`).join("");
  list.addEventListener("click", (e) => { const b = e.target.closest(".pick"); if (b) select(b.dataset.id); });
  list.addEventListener("keydown", (e) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(e.key in keys)) return;
    const all = [...list.querySelectorAll(".pick")], i = all.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    all[(i + keys[e.key] + all.length) % all.length].focus();
  });
}

/* ---------------------------------------------------------------- settings form */
const fid = (key, i, f) => ["opt", key, i, f].filter((x) => x !== undefined && x !== null).join("-");
const attrs = (key, i, f) => `data-key="${key}"${i != null ? ` data-index="${i}"` : ""}${f ? ` data-field="${f}"` : ""}`;

function control(opt, value, key, i, f) {
  const id = fid(key, i, f), a = attrs(key, i, f), label = escHtml(opt.label);
  const help = opt.help ? `<span class="help" id="${id}-help">${escHtml(opt.help)}</span>` : "";
  const desc = opt.help ? ` aria-describedby="${id}-help"` : "";
  switch (opt.type) {
    case "checkbox":
      return `<label class="check" for="${id}"><input type="checkbox" id="${id}" ${a}${value ? " checked" : ""}> ${label}</label>`;
    case "textarea":
      return `<label class="field" for="${id}"><span>${label}</span><textarea class="ad-input" id="${id}" rows="${opt.rows || 3}" ${a}${desc}>${escHtml(value)}</textarea>${help}</label>`;
    case "number":
      return `<label class="field" for="${id}"><span>${label}</span><input class="ad-input" type="number" id="${id}" inputmode="decimal" ${a}${opt.min != null ? ` min="${opt.min}"` : ""}${opt.max != null ? ` max="${opt.max}"` : ""} step="${opt.step ?? "any"}" value="${escHtml(value)}"${desc}>${help}</label>`;
    case "select":
      return `<label class="field" for="${id}"><span>${label}</span><select class="ad-input" id="${id}" ${a}${desc}>${opt.choices.map(([k, t]) => `<option value="${escHtml(k)}"${k === value ? " selected" : ""}>${escHtml(t)}</option>`).join("")}</select>${help}</label>`;
    case "datetime":
      return `<label class="field" for="${id}"><span>${label}</span><input class="ad-input" type="datetime-local" id="${id}" ${a} value="${escHtml(value)}"${desc}>${help}</label>`;
    case "time":
      return `<label class="field" for="${id}"><span>${label}</span><input class="ad-input" type="time" id="${id}" ${a} value="${escHtml(value)}"></label>`;
    case "color": {
      const sw = [...new Set(brand.colors || [])].filter((c) => /^#[0-9a-f]{6}$/i.test(c));
      return `<div class="field" role="group" aria-labelledby="${id}-l"><span id="${id}-l">${label}</span><div class="color-row">
        <input type="color" id="${id}" ${a} value="${escHtml(value)}" aria-label="${label}: pick a colour">
        <input type="text" class="ad-input" id="${id}-hex" ${a} data-hex="1" value="${escHtml(value)}" maxlength="7" spellcheck="false" aria-label="${label}: colour code">
        <span class="swatches">${sw.map((c) => `<button type="button" class="swatch" ${a} data-color="${c}" style="background:${c}" aria-label="Use brand colour ${c}" title="Brand colour ${c}"></button>`).join("")}</span></div>${help}</div>`;
    }
    case "image": {
      const lib = photoOf(value);
      const src = /^data:image\//.test(value || "") ? value : lib ? photoUrl(lib, "thumb") : "";
      return `<div class="field" role="group" aria-labelledby="${id}-l"><span id="${id}-l">${label}</span><div class="image-pick">
        ${src ? `<img src="${escHtml(src)}" alt=""${lib ? ` title="${escHtml(lib.title)} (free photo, saved inside the code)"` : ""}>` : `<span class="noimg">${/^sample:/.test(value || "") || (key === "slides" && !value) ? "Sample" : "None"}</span>`}
        <input type="file" id="${id}" ${a} accept="image/*">
        <label class="btn" for="${id}">Choose picture</label>
        ${src ? `<button type="button" class="btn small" data-act="clear-image" ${a}>Remove</button>` : ""}</div>${help}</div>`;
    }
    default:
      if (opt.readonly) return `<span class="day">${escHtml(value)}</span>`;
      return `<label class="field" for="${id}"><span>${label}</span><input class="ad-input" type="${opt.type === "url" ? "url" : "text"}" id="${id}" ${a} value="${escHtml(value)}"${opt.placeholder ? ` placeholder="${escHtml(opt.placeholder)}"` : ""}${opt.type === "url" ? ' inputmode="url"' : ""}${desc}>${help}</label>`;
  }
}

function itemsBlock(opt, list) {
  const n = list.length, name = escHtml(opt.itemName || "Item");
  const items = list.map((item, i) => `<fieldset class="item${opt.fixed ? " compact" : ""}" data-item="${i}">
    <legend class="sr-only">${opt.fixed ? escHtml(item.day) : `${name} ${i + 1}`}</legend>
    ${opt.fixed ? "" : `<div class="item-head"><b aria-hidden="true">${name} ${i + 1}</b>
      <button type="button" data-act="up" data-key="${opt.key}" data-index="${i}" aria-label="Move ${name} ${i + 1} up"${i ? "" : " disabled"}>&uarr;</button>
      <button type="button" data-act="down" data-key="${opt.key}" data-index="${i}" aria-label="Move ${name} ${i + 1} down"${i < n - 1 ? "" : " disabled"}>&darr;</button>
      <button type="button" data-act="remove" data-key="${opt.key}" data-index="${i}" aria-label="Remove ${name} ${i + 1}"${n > (opt.min || 0) ? "" : " disabled"}>&times;</button></div>`}
    ${opt.fields.map((f) => control(f, item[f.key], opt.key, i, f.key)).join("\n")}
  </fieldset>`).join("");
  return `<fieldset class="items" data-wrap="${opt.key}"><legend>${escHtml(opt.label)}</legend>${items}
    ${opt.fixed || n >= (opt.max || 50) ? "" : `<button type="button" class="btn small add-item" data-act="add" data-key="${opt.key}">+ Add ${name.toLowerCase()}</button>`}</fieldset>`;
}

function buildForm() {
  const w = widgetById(state.widget);
  const main = [], style = [];
  for (const opt of w.options) {
    const html = opt.type === "items" ? itemsBlock(opt, state.opts[opt.key]) : `<div class="opt" data-wrap="${opt.key}">${control(opt, state.opts[opt.key], opt.key)}</div>`;
    (opt.group === "Style" ? style : main).push(html);
  }
  const wasOpen = form.querySelector("details.group")?.open;
  form.innerHTML = main.join("\n") + `<details class="group"${wasOpen === false ? "" : " open"}><summary>Colours and font</summary><div class="group-body">${style.join("\n")}</div></details>`;
  applyVisibility();
}
function applyVisibility() {
  for (const opt of widgetById(state.widget).options) {
    if (!opt.show) continue;
    const el = form.querySelector(`[data-wrap="${opt.key}"]`);
    if (el) el.hidden = !opt.show(state.opts);
  }
}

const rawOf = () => (state.raw[state.widget] ||= {});
function recompute() { state.opts = normalize(state.widget, rawOf(), brand, Date.now(), { tz }); }
/** Raw (as typed) value goes to state.raw; the cleaned copy in state.opts drives the code. */
/* ---------------------------------------------------------------- undo / redo and saved versions */
const H = { past: [], future: [], key: "", at: 0, busy: false };
const snap = () => JSON.stringify({ w: state.widget, raw: state.raw[state.widget] || {} });
function remember(key = "") {
  if (H.busy || !state.widget) return;
  const now = Date.now();
  if (key && key === H.key && now - H.at < 1200) { H.at = now; return; }
  H.past.push(snap()); if (H.past.length > 80) H.past.shift();
  H.future = []; H.key = key; H.at = now;
  syncUndo();
}
function restoreSnap(json) {
  const o = JSON.parse(json);
  H.busy = true;
  try {
    state.raw[o.w] = o.raw || {};
    if (state.widget !== o.w || state.mode !== "templates") select(o.w);
    else { recompute(); buildForm(); update({ immediate: true }); }
  } finally { H.busy = false; H.key = ""; }
}
function undoCode() { if (!H.past.length) return false; H.future.push(snap()); restoreSnap(H.past.pop()); syncUndo(); return true; }
function redoCode() { if (!H.future.length) return false; H.past.push(snap()); restoreSnap(H.future.pop()); syncUndo(); return true; }
function syncUndo() { for (const id of ["undoCodeBtn", "verUndoBtn"]) { const b = $(id); if (b) b.disabled = !H.past.length; } for (const id of ["redoCodeBtn", "verRedoBtn"]) { const b = $(id); if (b) b.disabled = !H.future.length; } }
const VKEY = "asaandesk-code-versions";
const readVersions = () => { try { const v = JSON.parse(localStorage.getItem(VKEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const writeVersions = (list) => { try { localStorage.setItem(VKEY, JSON.stringify(list.slice(0, 40))); return true; } catch { toast("This browser could not save the version (storage is full)."); return false; } };
function saveVersion(note = "") {
  if (state.mode === "ai") { toast("Pick a widget template, or use My code, first."); return null; }
  let v;
  if (state.mode === "own") {
    if (!state.own.html.trim()) { toast("Write or paste some code first."); return null; }
    v = { id: "v" + Date.now().toString(36), t: Date.now(), mode: "own", name: note || titleOf(state.own.html) || "My code", html: state.own.html };
  } else {
    const w = widgetById(state.widget);
    v = { id: "v" + Date.now().toString(36), t: Date.now(), w: state.widget, name: note || w.name, raw: JSON.parse(JSON.stringify(state.raw[state.widget] || {})) };
  }
  const list = [v, ...readVersions()];
  if (!writeVersions(list)) return null;
  toast(`${versionLabel(list, 0)} saved: ${v.name}`);
  refreshVersions();
  return v;
}
/** The page code of a saved version (template versions are rendered again from their settings). */
function versionCode(v) {
  if (!v) return "";
  if (v.mode === "own") return wrapDoc(v.html || "", titleOf(v.html) || "My code");
  if (!widgetById(v.w)) return "";
  return renderWidget(v.w, normalize(v.w, v.raw || {}, brand, Date.now(), { tz }), { photo: exportPhoto }).page;
}
async function copyVersion(id) {
  const text = versionCode(readVersions().find((x) => x.id === id));
  if (!text) { toast("That version could not be read."); return false; }
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {}
  state.copied = ok ? text : "";
  toast(ok ? "The code of that version is copied." : "Could not copy here. Restore the version, then copy the code.");
  return ok;
}
function restoreVersion(id) {
  const v = readVersions().find((x) => x.id === id);
  if (v?.mode === "own") { setOwn(v.html || "", { note: `Restored: ${v.name}` }); return true; }
  if (!v || !widgetById(v.w)) { toast("That version could not be opened."); return false; }
  remember();
  H.busy = true;
  try { state.raw[v.w] = JSON.parse(JSON.stringify(v.raw)); if (state.widget !== v.w || state.mode !== "templates") select(v.w); else { recompute(); buildForm(); update({ immediate: true }); } }
  finally { H.busy = false; }
  toast(`Restored: ${v.name}`);
  return true;
}
function renderVersionsPanel(box) {
  box.replaceChildren();
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (label, act, id, cls = "cg-tool") => { const b = h("button", cls, label); b.type = "button"; if (id) b.id = id; b.addEventListener("click", act); return b; };
  box.append(h("p", "cg-hint", "Every change can be undone. Save a version to keep a copy you can go back to later (kept in this browser)."));
  const row = h("div", "cg-row");
  const u = btn("Undo", () => undoCode(), "verUndoBtn", "btn"), r = btn("Redo", () => redoCode(), "verRedoBtn", "btn");
  row.append(u, r); box.append(row);
  box.append(btn("Save this version", () => saveVersion(), "saveVersionBtn", "btn primary cg-wide"));
  const list = h("ol", "cg-versions"); list.id = "versionList";
  const all = readVersions();
  if (!all.length) list.append(h("li", "cg-hint", "No saved versions yet."));
  all.forEach((v, i) => {
    const li = h("li", "cg-version"); li.dataset.version = v.id;
    const when = new Date(v.t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    li.append(h("b", "", `${versionLabel(all, i)}: ${v.name}`), h("small", "", `${v.mode === "own" ? "My code" : widgetById(v.w)?.name || v.w} · ${when}`));
    const acts = h("span", "cg-acts");
    const open = btn("Restore", () => restoreVersion(v.id), null, "btn small"); open.dataset.vact = "restore";
    const copy = btn("Copy code", () => copyVersion(v.id), null, "btn small"); copy.dataset.vact = "copy";
    const del = btn("Delete", () => { writeVersions(readVersions().filter((x) => x.id !== v.id)); refreshVersions(); }, null, "btn small"); del.dataset.vact = "delete";
    acts.append(open, copy, del); li.append(acts); list.append(li);
  });
  box.append(h("h3", "cg-h3", "Saved versions"), list);
  syncUndo();
}
function refreshVersions() { if (shell && shell.el.dataset.panel === "versions") renderVersionsPanel(shell.panel("versions")); }

/* ---------------------------------------------------------------- ideas (prompt history) and template matching */
const IKEY = "asaandesk-code-ideas";
const readIdeas = () => { try { const v = JSON.parse(localStorage.getItem(IKEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
function saveIdea(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (!t) { toast("Write your idea first."); return false; }
  const list = [t, ...readIdeas().filter((x) => x !== t)].slice(0, 30);
  try { localStorage.setItem(IKEY, JSON.stringify(list)); } catch { toast("This browser could not save the idea."); return false; }
  renderIdeas(); toast("Idea saved in this browser.");
  return true;
}
function renderIdeas() {
  const ul = $("aiIdeaList"); if (!ul) return;
  const list = readIdeas();
  ul.innerHTML = list.length ? "" : '<li class="blurb">No saved ideas yet.</li>';
  list.forEach((t, i) => {
    const li = document.createElement("li"); li.className = "idea"; li.dataset.idea = String(i);
    const span = document.createElement("span"); span.textContent = t;
    const use = document.createElement("button"); use.type = "button"; use.className = "btn small"; use.textContent = "Use"; use.dataset.iact = "use";
    use.addEventListener("click", () => { $("aiIdeaText").value = t; if (aiReady()) $("aiPrompt").value = t; $("aiIdeaText").focus(); });
    const del = document.createElement("button"); del.type = "button"; del.className = "btn small"; del.textContent = "Delete"; del.dataset.iact = "delete";
    del.addEventListener("click", () => { try { localStorage.setItem(IKEY, JSON.stringify(readIdeas().filter((x) => x !== t))); } catch {} renderIdeas(); });
    li.append(span, use, del); ul.append(li);
  });
}
/** Templates whose name, words and tags match the idea (simple word match, no AI). */
async function matchTemplates(text) {
  const words = String(text || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  const g = await import("./gallery.js");
  const STOP = new Set(["a", "an", "the", "and", "or", "for", "with", "of", "to", "in", "on", "my", "our", "at", "is", "it", "that", "this", "show", "make", "want", "about", "end"]);
  const ws = words.filter((w) => w.length > 2 && !STOP.has(w));
  const scored = g.TEMPLATES.map((t) => {
    const w = widgetById(g.starter(t.id)?.widget);
    const hay = [t.name, ...(t.tags || []), w?.name, w?.blurb].join(" ").toLowerCase();
    return { t, score: ws.reduce((n, x) => n + (hay.includes(x) || (x.endsWith("s") && hay.includes(x.slice(0, -1))) ? 1 : 0), 0) };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const seen = new Set();
  return scored.filter((x) => { const w = g.starter(x.t.id).widget; if (seen.has(w)) return false; seen.add(w); return true; }).slice(0, 4).map((x) => x.t);
}
async function showMatches() {
  const ul = $("aiIdeaMatches"), text = $("aiIdeaText").value;
  if (!text.trim()) { toast("Write your idea first."); $("aiIdeaText").focus(); return []; }
  const hits = await matchTemplates(text);
  ul.innerHTML = "";
  if (!hits.length) { ul.innerHTML = '<li class="blurb">No template matches yet. Save the idea for when AsaanDesk AI is on.</li>'; return []; }
  const g = await import("./gallery.js");
  for (const t of hits) {
    const li = document.createElement("li");
    const b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.dataset.match = t.id; b.textContent = `Use: ${t.name}`;
    b.addEventListener("click", () => { applyStarter(g.starter(t.id)); toast(`${t.name} opened. Change the text and colours on the left.`); });
    li.append(b); ul.append(li);
  }
  return hits.map((t) => t.id);
}

/* ---------------------------------------------------------------- embed code and "Add to a website" */
let frameH = 480;
function embedCode(c) {
  const a = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<iframe title="${a(c.title || "Widget")}" srcdoc="${a(c.page)}" style="display:block;width:100%;max-width:760px;height:${Math.round(frameH)}px;border:0;margin:0 auto" loading="lazy"></iframe>\n`;
}
const textFor = (c) => (!c ? "" : state.view === "snippet" ? c.snippet : state.view === "embed" ? embedCode(c) : c.page);
async function toWebsite() {
  await photosReady();
  const c = state.code;
  if (!c) { toast("Pick a widget first."); return null; }
  const id = await putHandoff({ type: "website-embed", name: c.title || "Widget", html: c.page, height: Math.round(frameH) });
  location.href = "/design/website/?handoff=" + encodeURIComponent(id);
  return id;
}
/** "Publish as a website" (Canva Code): a new one-page site with this widget, opened in the Website builder to publish. */
async function toNewWebsite() {
  await photosReady();
  const c = state.code;
  if (!c) { toast("Pick a widget first."); return null; }
  saveVersion(`${c.title || "Widget"} (published as a website)`);
  const id = await putHandoff(siteFromWidget({ title: c.title || "My widget", page: c.page, height: Math.round(frameH) }));
  location.href = "/design/website/?handoff=" + encodeURIComponent(id);
  return id;
}

/* Full-screen Preview (Canva: Preview to interact with the design), with device sizes. */
let pvDlg = null;
function openPreview(size = state.device) {
  const c = state.code;
  if (!c) { toast("Pick a widget first."); return null; }
  pvDlg?.remove();
  const d = document.createElement("dialog");
  d.className = "cg-preview"; d.id = "cgPreview"; d.setAttribute("aria-label", "Preview of the widget");
  d.innerHTML = `<div class="cg-pv-bar"><b>Preview</b><span class="ad-tabs" role="group" aria-label="Preview size">${["desktop", "tablet", "phone"].map((s) => `<button type="button" data-pv="${s}" aria-pressed="${s === size}">${s[0].toUpperCase() + s.slice(1)}</button>`).join("")}</span><button type="button" class="btn small" id="cgPvTab">Open in a new tab</button><button type="button" class="btn primary small" id="cgPvClose">Close preview</button></div><div class="cg-pv-stage" data-size="${size}"><iframe title="Widget preview" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerpolicy="no-referrer"></iframe></div>`;
  document.body.append(d);
  d.querySelector("iframe").srcdoc = withHook(previewPage(c));
  d.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pv]");
    if (b) { d.querySelector(".cg-pv-stage").dataset.size = b.dataset.pv; for (const x of d.querySelectorAll("[data-pv]")) x.setAttribute("aria-pressed", String(x === b)); }
  });
  d.querySelector("#cgPvTab").addEventListener("click", () => openInTab());
  d.querySelector("#cgPvClose").addEventListener("click", () => d.close());
  d.addEventListener("close", () => { d.remove(); if (pvDlg === d) pvDlg = null; });
  if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  pvDlg = d;
  return d;
}

function setValue(key, index, field, value) {
  const raw = rawOf();
  if (index != null && field) {
    if (!Array.isArray(raw[key])) raw[key] = structuredClone(state.opts[key]);
    raw[key][+index] = { ...raw[key][+index], [field]: value };
  } else raw[key] = value;
  recompute();
}

function onInput(e) {
  const t = e.target, key = t.dataset?.key;
  if (!key || t.type === "file") return;
  const { index, field } = t.dataset;
  let v = t.type === "checkbox" ? t.checked : t.value;
  if (t.type === "number" && v !== "") v = Number(v);
  if (t.dataset.hex) { if (!/^#[0-9a-f]{6}$/i.test(v.trim())) return; v = v.trim().toLowerCase(); }
  remember(`${key}:${index ?? ""}:${field ?? ""}`);
  setValue(key, index, field, v);
  if (t.type === "color" || t.dataset.hex) syncColor(t, v);
  applyVisibility();
  update();
}
function syncColor(src, v) {
  const id = src.id.replace(/-hex$/, "");
  const picker = $(id), hex = $(id + "-hex");
  if (picker && picker !== src) picker.value = v;
  if (hex && hex !== src) hex.value = v;
}

function onClick(e) {
  const b = e.target.closest("button[data-key]");
  if (!b) return;
  const { key, index, field, act, color } = b.dataset;
  if (color || act) remember();
  if (color) {
    setValue(key, index, field, color);
    const id = fid(key, index, field);
    $(id).value = color; $(id + "-hex").value = color;
    update();
    return;
  }
  if (act === "clear-image") { setValue(key, index, field, ""); buildForm(); update(); return; }
  if (!act) return;
  const raw = rawOf();
  const list = (raw[key] = structuredClone(Array.isArray(raw[key]) ? raw[key] : state.opts[key]));
  const opt = widgetById(state.widget).options.find((o) => o.key === key);
  const i = +index;
  let focusAfter = null;
  if (act === "add") {
    const blank = {};
    for (const f of opt.fields) blank[f.key] = f.type === "checkbox" ? false : f.type === "number" ? f.max ?? 5 : "";
    list.push(blank); focusAfter = `#${fid(key, list.length - 1, opt.fields.find((f) => f.type !== "image")?.key)}`;
  } else if (act === "remove") { list.splice(i, 1); focusAfter = `[data-act="add"][data-key="${key}"]`; }
  else if (act === "up" && i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; focusAfter = `[data-act="up"][data-key="${key}"][data-index="${i - 1}"]`; }
  else if (act === "down" && i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; focusAfter = `[data-act="down"][data-key="${key}"][data-index="${i + 1}"]`; }
  recompute(); buildForm(); update();
  const f = focusAfter && form.querySelector(focusAfter);
  (f && !f.disabled ? f : form.querySelector(`[data-wrap="${key}"] legend`))?.focus?.();
}

/** Reads a picture as a data URL; big photos are scaled down (max 1600 px) so the code stays a sensible size. */
async function fileToDataUrl(file) {
  const read = () => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  if (file.type === "image/svg+xml" || file.size <= 350 * 1024) return read();
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    const url = c.toDataURL("image/jpeg", 0.85);
    return /^data:image\/jpeg;base64,.{100,}/.test(url) ? url : read();
  } catch { return read(); }
}
async function onFile(e) {
  const t = e.target;
  if (t.type !== "file" || !t.dataset.key) return;
  const file = t.files?.[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast("Please choose a picture (JPG, PNG, WebP, GIF or SVG)."); return; }
  try {
    const url = await fileToDataUrl(file);
    setValue(t.dataset.key, t.dataset.index, t.dataset.field, url);
    buildForm(); update();
    toast("Picture added. It is saved inside the code, so nothing is uploaded.");
  } catch { toast("That picture could not be read. Please try another one."); }
}

/* ---------------------------------------------------------------- code + preview */
function extractHtml(data) {
  let s = typeof data === "string" ? data : data?.html || data?.code || data?.page || "";
  s = String(s).trim();
  const fence = /```(?:html)?\s*([\s\S]*?)```/i.exec(s);
  return (fence ? fence[1] : s).trim();
}
function currentCode() {
  if (state.mode === "ai") {
    if (!state.ai.html) return null;
    return { page: wrapDoc(state.ai.html), snippet: state.ai.html, file: "ai-widget.html", title: "AI widget" };
  }
  if (state.mode === "own") {
    const html = state.own.html;
    if (!html.trim()) return null;
    const title = titleOf(html) || "My code";
    return { page: wrapDoc(html, title), snippet: html, file: "my-code.html", title };
  }
  return renderWidget(state.widget, state.opts, { photo: exportPhoto });
}

/* Library photos in picture fields ("photo:<id>", e.g. from a template) are embedded in the code as data: URLs, the same
   way an uploaded picture is: fetched from this site once, scaled down (max 1400 px, JPEG) and kept for this session. Until
   that is done the preview shows the photo from this site, and the code points at it on asaandesk.com. */
const PHOTO_DATA = new Map(), PHOTO_WAIT = new Map();
const exportPhoto = (p) => PHOTO_DATA.get(p.id) || PHOTO_SITE + photoUrl(p, "full");
const previewPhoto = (p) => PHOTO_DATA.get(p.id) || photoUrl(p, "full");
function photosIn(v, out = new Map()) {
  if (typeof v === "string") { const p = photoOf(v); if (p) out.set(p.id, p); }
  else if (Array.isArray(v)) v.forEach((x) => photosIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => photosIn(x, out));
  return out;
}
const photosPending = () => state.mode === "templates" && [...photosIn(state.opts).keys()].some((id) => !PHOTO_DATA.has(id) && PHOTO_WAIT.get(id)?.state !== "failed");
async function embedPhoto(p) {
  const res = await fetch(photoUrl(p, "full"));
  if (!res.ok) throw new Error("Photo " + res.status);
  const blob = await res.blob();
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    const url = c.toDataURL("image/jpeg", 0.82);
    if (/^data:image\/jpeg;base64,.{100,}/.test(url)) return url;
  } catch {}
  return new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => (/^data:image\//.test(String(r.result)) ? ok(r.result) : bad(new Error("Not a picture"))); r.onerror = () => bad(r.error); r.readAsDataURL(blob); });
}
const photoDone = debounce(() => { if (state.mode === "templates" && state.widget) update(); }, 60);
/** Starts embedding every library photo the current widget uses; resolves when all are done (or failed). */
function ensurePhotos() {
  if (state.mode !== "templates") return Promise.resolve();
  return Promise.all([...photosIn(state.opts).values()].filter((p) => !PHOTO_DATA.has(p.id)).map((p) => {
    if (!PHOTO_WAIT.has(p.id)) {
      const job = embedPhoto(p).then((url) => { PHOTO_DATA.set(p.id, url); job.state = "done"; photoDone(); }, () => { job.state = "failed"; });
      PHOTO_WAIT.set(p.id, job);
    }
    return PHOTO_WAIT.get(p.id);
  }));
}
/** Waits (up to ms) until the photos are inside the code, then refreshes state.code. */
async function photosReady(ms = 6000) {
  if (!photosPending()) return;
  await Promise.race([ensurePhotos(), new Promise((r) => setTimeout(r, ms))]);
  try { state.code = currentCode(); showCode(); } catch {}
}
/** The page shown in the preview: photos that are not embedded yet come straight from this site. */
function previewPage(c) {
  if (state.mode !== "templates" || !photosPending()) return c.page;
  try { return renderWidget(state.widget, state.opts, { photo: previewPhoto }).page; } catch { return c.page; }
}

// Preview only (never in the exported code): report errors and the page height to this app,
// and open real links in a new tab so the preview is not replaced.
const PREVIEW_HOOK = `<script>(function(){function s(m){try{parent.postMessage(m,"*")}catch(e){}}addEventListener("error",function(e){s({adw:"error",message:String(e.message||e)})});function h(){s({adw:"height",h:Math.ceil(document.documentElement.getBoundingClientRect().height)})}addEventListener("load",function(){h();s({adw:"loaded"})});if(window.ResizeObserver)new ResizeObserver(h).observe(document.documentElement);document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href]");if(!a)return;var u=a.getAttribute("href")||"";if(u.charAt(0)==="#")return;if(/^(https?:)/i.test(u)){a.target="_blank";a.rel="noopener"}},true)})();<\/script>`;
const withHook = (page) => (/<head[^>]*>/i.test(page) ? page.replace(/<head[^>]*>/i, (m) => m + "\n" + PREVIEW_HOOK) : PREVIEW_HOOK + page);

let lastSrcdoc = null;
function showPreview(force = false) {
  const c = state.code;
  $("frameEmpty").hidden = !!c;
  frame.hidden = !c;
  if (!c) { lastSrcdoc = null; return; }
  const doc = withHook(previewPage(c));
  if (!force && doc === lastSrcdoc) return;
  lastSrcdoc = doc;
  frame.srcdoc = doc;
}
const previewSoon = debounce(showPreview, 220);

window.addEventListener("message", (e) => {
  if (e.source !== frame.contentWindow || !e.data || typeof e.data !== "object") return;
  if (e.data.adw === "error") state.frameErrors.push(String(e.data.message));
  if (e.data.adw === "loaded") state.previewLoads++;
  if (e.data.adw === "height") {
    frameH = Math.max(200, Math.min(2000, +e.data.h || 480));
    const max = window.innerWidth <= 640 ? 620 : 900;
    frame.style.height = Math.max(340, Math.min(max, +e.data.h || 0)) + "px";
  }
});

/** Simple colouring for the code view (all text escaped). Long data: URLs are shortened on screen only. */
function highlight(src) {
  const e = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const tag = (tok) => {
    const m = /^(<\/?)([a-zA-Z][\w-]*)([\s\S]*?)(\/?>)$/.exec(tok);
    if (!m) return e(tok);
    let out = "", last = 0;
    for (const a of m[3].matchAll(/([^\s=]+)(=)("[^"]*"|'[^']*'|[^\s>]*)/g)) {
      out += e(m[3].slice(last, a.index)) + `<span class="a">${e(a[1])}</span>=<span class="s">${e(a[3])}</span>`;
      last = a.index + a[0].length;
    }
    return `<span class="t">${e(m[1] + m[2])}</span>${out}${e(m[3].slice(last))}<span class="t">${e(m[4])}</span>`;
  };
  const short = src.replace(/data:([\w/+.-]+)((?:;[\w=.-]+)*),([^"'\s)<>]{120,})/g, (m, type) => `\u0000${type}|${Math.max(1, Math.round(m.length / 1024))}\u0001`);
  let out = "", last = 0;
  for (const m of short.matchAll(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^<>]*>/g)) {
    out += e(short.slice(last, m.index)) + (m[0].startsWith("<!--") ? `<span class="c">${e(m[0])}</span>` : tag(m[0]));
    last = m.index + m[0].length;
  }
  out += e(short.slice(last));
  return out.replace(/\u0000([^|]*)\|(\d+)\u0001/g, (m, type, kb) => `<span class="x">data:${type}… (${kb} KB picture, full in the copied code)</span>`);
}

function showCode() {
  const c = state.code;
  const text = textFor(c);
  codeEl.innerHTML = c ? highlight(text) : `<span class="c">${state.mode === "ai" ? "Describe your widget and press “Make it”. The code shows here." : state.mode === "own" ? "Paste your HTML on the left, or open an .html file. The code shows here." : ""}</span>`;
  const kb = new Blob([text]).size / 1024;
  $("codeSize").textContent = c ? `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB · ${text.split("\n").length} lines` : "";
  for (const id of ["copyBtn", "downloadBtn", "openBtn"]) $(id).disabled = !c;
}
function showWarnings() {
  state.warnings = state.mode === "templates" ? warnings(state.widget, state.opts) : [];
  // Oversized widgets (Canva: they may not publish): say so, with what to do.
  const big = state.code ? sizeWarning(new Blob([state.code.page]).size) : "";
  if (big) state.warnings.push(big);
  if (state.mode === "own" && state.code) {
    const st = codeStats(state.own.html);
    if (st.external.length) state.warnings.push(`This code loads files from ${st.external.slice(0, 3).join(", ")}${st.external.length > 3 ? " and more" : ""}: it needs the internet, and those sites see your visitors.`);
  }
  $("warnings").innerHTML = state.mode === "own" ? "" : state.warnings.map((w) => `<li>${escHtml(w)}</li>`).join("");
  const ow = $("ownWarnings"); if (ow) ow.innerHTML = state.mode === "own" ? state.warnings.map((w) => `<li>${escHtml(w)}</li>`).join("") : "";
}

const saveSoon = debounce(() => {
  saveProject({ id: SAVE_ID, app: "code", name: "Code generator settings", data: { widget: state.widget, raw: state.raw } }).catch(() => {});
}, 700);
const saveOwnSoon = debounce(() => { try { localStorage.setItem(OWN_KEY, state.own.html); } catch { toast("This browser could not keep your code (storage is full). Download it to keep it."); } }, 500);

/** Re-renders the code now; the preview follows after a short pause (or now when immediate). */
function update({ immediate = false } = {}) {
  try { state.code = currentCode(); } catch (err) { state.code = null; toast(err.message); }
  if (photosPending()) ensurePhotos();
  showCode();
  showWarnings();
  if (immediate) { previewSoon.cancel(); showPreview(); } else previewSoon();
  if (state.mode === "templates") saveSoon();
  if (state.mode === "own") { saveOwnSoon(); showOwnInfo(); }
}
function showOwnInfo() {
  const info = $("ownInfo"); if (!info) return;
  const st = codeStats(state.own.html);
  info.textContent = state.own.html.trim() ? `${st.lines} lines · ${st.kb < 10 ? st.kb.toFixed(1) : Math.round(st.kb)} KB · ${st.styles} style block${st.styles === 1 ? "" : "s"} · ${st.scripts} script${st.scripts === 1 ? "" : "s"}${st.pictures ? ` · ${st.pictures} picture${st.pictures === 1 ? "" : "s"} inside` : ""}. Kept in this browser.` : "Empty. Paste code, open a file, or start from the template.";
}
/** Puts code into "My code" (pasted, opened or copied from a template) and shows it. */
function setOwn(text, { mode = true, note = "" } = {}) {
  let html;
  try { html = cleanOwn(text); } catch (e) { toast(e.message); return false; }
  state.own.html = html;
  const ta = $("ownCode"); if (ta && ta.value !== html) ta.value = html;
  if (mode && state.mode !== "own") setMode("own"); else update({ immediate: true });
  if (note) toast(note);
  return true;
}

/* ---------------------------------------------------------------- selecting, modes */
function select(id, { save = true } = {}) {
  const w = widgetById(id);
  if (!w) return false;
  if (state.mode !== "templates") setMode("templates");
  state.widget = id;
  recompute();
  for (const b of document.querySelectorAll(".pick")) b.setAttribute("aria-pressed", String(b.dataset.id === id));
  document.querySelector(`.pick[data-id="${id}"]`)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  $("setTitle").textContent = w.name;
  $("setBlurb").textContent = w.blurb;
  buildForm();
  update({ immediate: true });
  try { window.history.replaceState(null, "", "?w=" + id); } catch {}
  if (!save) saveSoon.cancel();
  return true;
}

function showSoon() {
  comingSoon($("aiSoon"), {
    title: "AI widgets are coming soon",
    what: "Soon you can describe a widget in your own words and AsaanDesk AI will write the code for you.",
    offline: `The ${WIDGETS.length} widget templates work today, right in your browser, even without internet.`,
  });
  $("aiForm").hidden = true;
}
const MODES = ["templates", "ai", "own"];
function setMode(mode) {
  if (!MODES.includes(mode)) mode = "templates";
  state.mode = mode;
  const ai = mode === "ai";
  $("layout").dataset.mode = mode;
  $("templatesView").hidden = mode !== "templates";
  $("aiView").hidden = !ai;
  $("ownView").hidden = mode !== "own";
  for (const [id, on] of [["tabTemplates", mode === "templates"], ["tabAi", ai], ["tabOwn", mode === "own"]]) {
    const t = $(id);
    t.setAttribute("aria-selected", String(on)); t.classList.toggle("on", on); t.tabIndex = on ? 0 : -1;
  }
  if (mode === "own") { const ta = $("ownCode"); if (ta.value !== state.own.html) ta.value = state.own.html; }
  if (ai) {
    if (aiReady()) { $("aiSoon").innerHTML = ""; $("aiForm").hidden = false; }
    else showSoon();
  }
  update({ immediate: true });
}

async function generateAi(e) {
  e?.preventDefault();
  const prompt = $("aiPrompt").value.trim();
  const status = (msg, error = false) => { $("aiStatus").textContent = msg; $("aiStatus").classList.toggle("error", error); };
  if (!prompt) { status("Describe the widget first.", true); $("aiPrompt").focus(); return; }
  $("aiGo").disabled = true;
  status("AsaanDesk AI is writing your widget…");
  try {
    const html = extractHtml(await onlineAi("/code/generate", { prompt }, "AI code"));
    if (!html) throw new Error("AsaanDesk AI sent back no code. Please try again.");
    state.ai = { html, prompt, error: "" };
    status("Done. Check the preview, then copy or download the code.");
    try { localStorage.setItem(IKEY, JSON.stringify([prompt, ...readIdeas().filter((x) => x !== prompt)].slice(0, 30))); renderIdeas(); } catch {}
    update({ immediate: true });
  } catch (err) {
    state.ai.error = err?.message || "Something went wrong.";
    if (err?.code === "AI_UNAVAILABLE") showSoon();
    else status(state.ai.error + " Your templates still work.", true);
  } finally { $("aiGo").disabled = false; }
}

/* ---------------------------------------------------------------- copy, download, open */
async function copyCode() {
  await photosReady();
  const c = state.code;
  if (!c) return false;
  const text = textFor(c);
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {}
  if (!ok) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.append(ta); ta.select();
    try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
  }
  state.copied = ok ? text : "";
  const b = $("copyBtn");
  b.textContent = ok ? "Copied!" : "Copy code";
  setTimeout(() => { b.textContent = "Copy code"; }, 1800);
  toast(ok ? (state.view === "snippet" ? "Snippet copied. Paste it into your website." : state.view === "embed" ? "Embed code copied. Paste it into your site builder or blog (HTML block)." : "Code copied. Paste it into a new .html file or your website.") : "Could not copy here. Select the code and copy it by hand.");
  return ok;
}
function download() {
  if (photosPending()) return photosReady().then(() => download());
  const c = state.code;
  if (!c) return null;
  const url = URL.createObjectURL(new Blob([c.page], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = c.file; a.hidden = true;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  state.lastDownload = { name: c.file, text: c.page };
  toast(`Saved ${c.file}. Open it in any browser.`);
  return c.file;
}
function openInTab() {
  const c = state.code;
  if (!c) return;
  const url = URL.createObjectURL(new Blob([c.page], { type: "text/html;charset=utf-8" }));
  // Not "noopener": some browsers refuse blob: pages in a noopener tab. The link back is cut right away instead.
  const win = window.open(url, "_blank");
  try { if (win) win.opener = null; } catch {}
  if (!win) toast("Your browser blocked the new tab. Use Download HTML instead.");
  state.opened++;
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------------------------------------------------------------- wire up */
function pressGroup(ids, on) { for (const id of ids) { const b = $(id); const v = id === on; b.classList.toggle("on", v); b.setAttribute("aria-pressed", String(v)); } }
function wire() {
  form.addEventListener("input", onInput);
  form.addEventListener("change", (e) => (e.target.type === "file" ? onFile(e) : onInput(e)));
  form.addEventListener("click", onClick);
  form.addEventListener("submit", (e) => e.preventDefault());
  // Drag a picture onto a picture field to replace it (Canva: drag media onto the design, then Replace).
  form.addEventListener("dragover", (e) => { const z = e.target.closest?.(".image-pick"); if (!z) return; e.preventDefault(); z.classList.add("drop"); });
  form.addEventListener("dragleave", (e) => e.target.closest?.(".image-pick")?.classList.remove("drop"));
  form.addEventListener("drop", (e) => {
    const z = e.target.closest?.(".image-pick"); if (!z) return;
    e.preventDefault(); z.classList.remove("drop");
    const inp = z.querySelector('input[type="file"]'), f = e.dataTransfer?.files?.[0];
    if (!inp || !f) return;
    onFile({ target: { type: "file", dataset: inp.dataset, files: [f] } });
  });
  $("resetBtn").addEventListener("click", () => { remember(); state.raw[state.widget] = {}; recompute(); buildForm(); update({ immediate: true }); toast("Back to the starting text and colours."); });
  $("tabTemplates").addEventListener("click", () => setMode("templates"));
  $("tabAi").addEventListener("click", () => setMode("ai"));
  $("tabOwn").addEventListener("click", () => setMode("own"));
  document.querySelector(".mode-tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = MODES.indexOf(state.mode), next = MODES[(i + (e.key === "ArrowRight" ? 1 : MODES.length - 1)) % MODES.length];
    setMode(next); $({ templates: "tabTemplates", ai: "tabAi", own: "tabOwn" }[next]).focus();
  });
  // My code: type or paste, open a file, start from the open template, clear.
  const ownTa = $("ownCode");
  ownTa.value = state.own.html;
  ownTa.addEventListener("input", () => { if (ownTa.value.length > 2000000) { toast("That code is too big (2 MB at most)."); return; } state.own.html = ownTa.value; update(); });
  ownTa.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.ctrlKey || e.metaKey || e.altKey) return; // Tab types two spaces (Esc then Tab leaves the box)
    if (ownTa.dataset.esc === "1") { ownTa.dataset.esc = ""; return; }
    e.preventDefault();
    const s = ownTa.selectionStart, en = ownTa.selectionEnd;
    ownTa.setRangeText("  ", s, en, "end"); ownTa.dispatchEvent(new Event("input"));
  });
  ownTa.addEventListener("keyup", (e) => { if (e.key === "Escape") ownTa.dataset.esc = "1"; });
  $("ownFile").addEventListener("change", async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 2000000) { toast("That file is too big (2 MB at most)."); return; }
    const readText = (file) => (typeof file.text === "function" ? file.text() : new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(file); }));
    try { setOwn(await readText(f), { note: `${f.name} opened. Change it on the left; the preview follows.` }); } catch { toast("That file could not be read."); }
  });
  $("ownFromWidget").addEventListener("click", () => {
    const w = widgetById(state.widget);
    const page = renderWidget(state.widget, state.opts).page;
    setOwn(page, { note: `The ${w?.name || "template"} code is in My code. Change anything you like.` });
  });
  $("ownClear").addEventListener("click", () => { if (!state.own.html) return; saveVersion("My code (before clearing)"); setOwn("", { note: "Cleared. The old code is kept as a version." }); });
  $("backToTemplates").addEventListener("click", () => { setMode("templates"); $("tabTemplates").focus(); });
  $("aiForm").addEventListener("submit", generateAi);
  const dev = (d) => { state.device = d; $("frameWrap").classList.toggle("phone", d === "phone"); $("frameWrap").classList.toggle("tablet", d === "tablet"); pressGroup(["devDesktop", "devTablet", "devPhone"], { desktop: "devDesktop", tablet: "devTablet", phone: "devPhone" }[d]); };
  $("devDesktop").addEventListener("click", () => dev("desktop"));
  $("devTablet").addEventListener("click", () => dev("tablet"));
  $("devPhone").addEventListener("click", () => dev("phone"));
  const view = (v) => { state.view = v; pressGroup(["viewPage", "viewSnippet", "viewEmbed"], { page: "viewPage", snippet: "viewSnippet", embed: "viewEmbed" }[v]); showCode(); };
  $("viewPage").addEventListener("click", () => view("page"));
  $("viewSnippet").addEventListener("click", () => view("snippet"));
  $("viewEmbed").addEventListener("click", () => view("embed"));
  $("aiIdeaSave").addEventListener("click", () => saveIdea($("aiIdeaText").value));
  $("aiIdeaMatch").addEventListener("click", () => showMatches());
  renderIdeas();
  $("reloadBtn").addEventListener("click", () => showPreview(true));
  $("copyBtn").addEventListener("click", copyCode);
  $("downloadBtn").addEventListener("click", download);
  $("openBtn").addEventListener("click", openInTab);
  window.addEventListener("asaandesk-brand", (e) => { brand = e.detail || loadBrand(); recompute(); buildForm(); update(); });
}

/* ---------------------------------------------------------------- editor frame (shared shell) */
let shell = null;
const TITLE_KEY = "asaandesk-code-title";
const zoomState = { pct: 100 };
function setZoom(pct) { zoomState.pct = Math.max(25, Math.min(200, Math.round(pct))); $("frameWrap").style.zoom = String(zoomState.pct / 100); }
function renderToolsPanel(box) {
  const p = (text) => { const e = document.createElement("p"); e.className = "cg-hint"; e.textContent = text; return e; };
  const b = (label, act, id) => { const e = document.createElement("button"); e.type = "button"; e.className = "cg-tool"; e.textContent = label; if (id) e.dataset.tool = id; e.addEventListener("click", act); return e; };
  const head = (text) => { const e = document.createElement("h3"); e.className = "cg-h3"; e.textContent = text; return e; };
  box.append(head("Describe with AI"), p(aiReady() ? "AsaanDesk AI is on: describe a widget and it writes the code." : `Coming soon: AsaanDesk AI is not switched on yet, so no code is made up. The ${WIDGETS.length} widget templates work today.`),
    b("Describe a widget with AI", () => { setMode("ai"); }, "ai"),
    head("Bring your own code"), p("Paste HTML, CSS and JavaScript, or open an .html file, and change it with a live preview."),
    b("My code", () => setMode("own"), "own"), b("Open an .html file", () => $("ownFile").click(), "ownfile"), b("Edit the template's code by hand", () => $("ownFromWidget").click(), "ownwidget"),
    head("This widget"), b("Preview (full screen)", () => openPreview(), "preview"), b("Publish as a website", () => toNewWebsite(), "publish"), b("Run the preview again", () => showPreview(true), "run"), b("Reset text and colours", () => $("resetBtn").click(), "reset"),
    b("Copy the code", () => copyCode(), "copy"), b("Download HTML", () => download(), "download"), b("Open in a new tab", () => openInTab(), "open"),
    head("Code view"), b("Full page code", () => $("viewPage").click(), "page"), b("Snippet for your own site", () => $("viewSnippet").click(), "snippet"),
    head("Preview size"), b("Desktop preview", () => $("devDesktop").click(), "desktop"), b("Phone preview", () => $("devPhone").click(), "phone"));
}
/** Opens a gallery starter: the widget with its starting options (a fresh copy, like a new design). */
function applyStarter(st) {
  if (!st || !widgetById(st.widget)) throw new Error("That template was not found.");
  remember();
  state.raw[st.widget] = { ...st.raw };
  if (state.widget === st.widget) { recompute(); buildForm(); update({ immediate: true }); if (state.mode !== "templates") setMode("templates"); }
  else select(st.widget);
  return true;
}
async function mountFrame() {
  let mod = null, gallery = null;
  try { mod = await import("../shared/editor-shell.js"); gallery = await import("./gallery.js"); } catch (e) { console.warn("Editor frame unavailable", e); return null; }
  try {
    const bar = document.createElement("div");
    bar.className = "cg-bar"; bar.id = "codeBar";
    const sep = () => { const s = document.createElement("span"); s.className = "cg-sep"; s.setAttribute("aria-hidden", "true"); return s; };
    let title = ""; try { title = localStorage.getItem(TITLE_KEY) || ""; } catch {}
    shell = mod.mountShell({
      app: "code", kind: "Code", title: title || "My widget", home: "/tools/code-generator",
      onTitle: (t) => { try { localStorage.setItem(TITLE_KEY, String(t || "").slice(0, 120)); } catch {} },
      stage: $("layout"), toolbar: bar, formulaBar: null,
      resize: { label: "Resize", open: () => { const next = { desktop: "tablet", tablet: "phone", phone: "desktop" }[state.device] || "tablet"; $({ desktop: "devDesktop", tablet: "devTablet", phone: "devPhone" }[next]).click(); shell.toast({ desktop: "Desktop preview", tablet: "Tablet preview (768 px)", phone: "Phone preview (390 px)" }[next]); } },
      file: [
        { label: "New widget", act: () => { $("resetBtn").click(); shell.openPanel("templates"); }, hint: "Start again from a template" },
        { label: "Choose a template", act: () => shell.openPanel("templates") },
        { label: "Reset text and colours", act: () => $("resetBtn").click() },
        { label: "Describe with AI", act: () => setMode("ai") },
        { label: "Copy code", group: "Download", act: () => copyCode(), icon: "copy" },
        { label: "Download HTML", group: "Download", act: () => download() },
        { label: "Open in a new tab", group: "Download", act: () => openInTab(), icon: "eye" },
        { label: "Full page code", group: "View", act: () => $("viewPage").click() },
        { label: "Snippet code", group: "View", act: () => $("viewSnippet").click() },
        { label: "Run the preview again", group: "View", act: () => showPreview(true) },
        { label: "Tablet preview", group: "View", act: () => $("devTablet").click() },
        { label: "Embed code", group: "View", act: () => $("viewEmbed").click() },
        { label: "Show or hide the code", group: "View", act: () => $("showCodeBtn").click() },
        { label: "Undo", group: "Edit", act: () => undoCode() },
        { label: "Redo", group: "Edit", act: () => redoCode() },
        { label: "Save this version", group: "Edit", act: () => saveVersion() },
        { label: "Add to a website", group: "Use", act: () => toWebsite(), hint: "Opens the Website builder with this widget" },
        { label: "Publish as a website", group: "Use", act: () => toNewWebsite(), hint: "A new one-page site with this widget" },
        { label: "Preview", group: "View", act: () => openPreview(), icon: "eye", hint: "Full screen, desktop / tablet / phone" },
        { label: "My code (your own HTML)", act: () => setMode("own"), hint: "Paste or open code and change it" },
        { label: "Open an .html file…", act: () => $("ownFile").click() },
      ],
      share: { download: [{ label: "HTML file", act: () => download() }, { label: "Copy the code", act: () => copyCode(), icon: "copy" }, { label: "Open in a new tab", act: () => openInTab(), icon: "eye" }], link: () => location.origin + "/design/code/?w=" + state.widget },
      templates: { gallery, tool: "code-generator", apply: async (id) => applyStarter(gallery.starter?.(id) || (widgetById(id) ? { widget: id, raw: {} } : null)), placeholder: "Search widget templates" },
      panels: { tools: (box) => renderToolsPanel(box), versions: { label: "Versions", icon: "reset", render: (box) => renderVersionsPanel(box), refresh: true } },
      rail: ["templates", "tools", "versions", "brand", "projects", "apps"],
      insert: {},
      projects: {
        save: async () => ({ name: state.mode === "own" ? titleOf(state.own.html) || "My code" : widgetById(state.widget)?.name || "Widget", data: { widget: state.widget, raw: JSON.parse(JSON.stringify(state.raw)), mode: state.mode === "own" ? "own" : "templates", own: state.own.html } }),
        open: async (rec) => {
          const d = rec?.data; if (!d?.widget || !widgetById(d.widget)) throw new Error("That project could not be opened.");
          state.raw = d.raw && typeof d.raw === "object" ? d.raw : {}; select(d.widget);
          if (typeof d.own === "string" && d.own) { state.own.html = d.own; if (d.mode === "own") setOwn(d.own); }
        },
      },
      bottom: { notes: true, outline: null, timer: true, fullscreen: true, help: true, pages: null, zoom: { get: () => zoomState.pct, set: setZoom, min: 25, max: 200 } },
      setMode: (m) => { document.body.dataset.mode = m; },
      initialPanel: null,
    });
    // Move the controls only once the frame is up (if it fails, they stay where they were).
    $("reloadBtn").textContent = "Run";
    $("reloadBtn").title = "Run the widget again in the preview";
    const mk = (id, label, title, act) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn small"; b.id = id; b.textContent = label; b.title = title; b.addEventListener("click", act); return b; };
    const showCodeBtn = mk("showCodeBtn", "Hide code", "Show or hide the code under the preview", () => { const hid = $("layout").dataset.code !== "hidden"; $("layout").dataset.code = hid ? "hidden" : ""; showCodeBtn.textContent = hid ? "Show code" : "Hide code"; showCodeBtn.setAttribute("aria-pressed", String(!hid)); });
    showCodeBtn.setAttribute("aria-pressed", "true");
    const undoB = mk("undoCodeBtn", "Undo", "Undo the last change", () => undoCode()), redoB = mk("redoCodeBtn", "Redo", "Redo", () => redoCode());
    const webB = mk("toWebsiteBtn", "Add to a website", "Open the Website builder with this widget in a new section", () => toWebsite());
    const pubB = mk("publishSiteBtn", "Publish as a website", "Make a new one-page website with this widget, ready to publish", () => toNewWebsite());
    const pvB = mk("previewBtn", "Preview", "Full-screen preview to try the widget (desktop, tablet, phone)", () => openPreview());
    bar.append(document.querySelector(".mode-tabs"), sep(), $("reloadBtn"), pvB, $("actions"), webB, pubB, sep(), undoB, redoB, showCodeBtn, sep(), document.querySelector(".device-tabs"));
    syncUndo();
    document.body.classList.add("has-shell");
    return shell;
  } catch (e) { console.warn("The editor frame could not start", e); shell = null; return null; }
}

window.adApp = {
  state,
  widgets: WIDGETS.map((w) => ({ id: w.id, name: w.name })),
  ready: false,
  select: (id) => select(id),
  /** Sets one option (or an item field with index/field) and renders right away. Returns the page code. */
  setOption(key, value, index, field) { setValue(key, index, field, value); buildForm(); update({ immediate: true }); return state.code?.page || ""; },
  html: () => state.code?.page || "",
  snippet: () => state.code?.snippet || "",
  render: (id, opts = {}) => renderWidget(id, normalize(id, opts, brand, Date.now(), { tz })),
  setMode, copy: copyCode, download, openInTab, get shell() { return shell; }, undo: () => undoCode(), redo: () => redoCode(), saveVersion, restoreVersion, versions: readVersions,
  saveIdea, ideas: readIdeas, matchTemplates: async (t) => (await matchTemplates(t)).map((x) => x.id), embedCode: () => (state.code ? embedCode(state.code) : ""), toWebsite, applyTemplate: async (id) => applyStarter((await import("./gallery.js")).starter(id)),
  flush() { previewSoon.cancel(); showPreview(); return state.code?.page || ""; },
  /** Waits until library photos are embedded in the code (data: URLs); returns the page code. */
  photosReady: async () => { await photosReady(); return state.code?.page || ""; },
  aiReady,
  // Round 3 (Canva Code parity): My code, numbered versions with Copy code, Preview, Publish as a website.
  setOwn: (text) => setOwn(text), own: () => state.own.html, copyVersion, versionCode: (id) => versionCode(readVersions().find((x) => x.id === id)),
  openPreview, toNewWebsite, siteFromWidget,
};

async function init() {
  buildPicker();
  wire();
  await mountFrame();
  let saved = null;
  try { saved = await Promise.race([getProject(SAVE_ID), new Promise((r) => setTimeout(() => r(null), 1500))]); } catch {}
  if (saved?.data?.raw && typeof saved.data.raw === "object") state.raw = saved.data.raw;
  const q = new URLSearchParams(window.location.search);
  const tpl = q.get("template");
  if (q.get("new") === "1") state.raw = {};
  let st = null;
  if (tpl) { try { const g = await import("./gallery.js"); st = g.starter(tpl); } catch {} if (!st && widgetById(tpl)) st = { widget: tpl, raw: {} }; }
  if (tpl && !st) toast("That template was not found. Here is the countdown timer.");
  if (st) state.raw[st.widget] = { ...st.raw };
  const first = st ? st.widget : widgetById(q.get("w")) ? q.get("w") : q.get("new") === "1" ? "countdown" : widgetById(saved?.data?.widget) ? saved.data.widget : "countdown";
  select(first, { save: false });
  if (q.get("mode") === "ai") setMode("ai");
  if (q.get("mode") === "own") setMode("own");
  // ?prompt= (example-prompt links): open "Describe with AI" with the idea box filled; nothing is sent.
  const pr = String(q.get("prompt") || "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (pr) { setMode("ai"); $("aiIdeaText").value = pr; if (aiReady()) $("aiPrompt").value = pr; }
  state.ready = true;
  window.adApp.ready = true;
  document.documentElement.dataset.ready = "1";
}
init();
