// AsaanDesk code generator: pick a widget, change its settings, see it live, copy or download the code.
// Templates run fully in the browser (offline). "Describe with AI" uses AsaanDesk AI only when it is switched on.
import { WIDGETS, widgetById, normalize, renderWidget, warnings } from "./widgets.js";
import { loadBrand } from "../shared/brand.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";
import { saveProject, getProject } from "../shared/store.js";

const $ = (id) => document.getElementById(id);
const SAVE_ID = "code-generator-settings";
const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })();
let brand = loadBrand();

const state = {
  mode: "templates", widget: null, raw: {}, opts: {}, code: null, view: "page", device: "desktop",
  warnings: [], copied: "", lastDownload: null, opened: 0, frameErrors: [], previewLoads: 0,
  ai: { html: "", prompt: "", error: "" }, ready: false,
};

const form = $("opts"), frame = $("preview"), codeEl = $("codeText");
const escHtml = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; d.cancel = () => clearTimeout(t); return d; };

/* ---------------------------------------------------------------- toast */
let toastTimer;
function toast(msg) {
  const t = $("toast");
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
      const src = /^data:image\//.test(value || "") ? value : "";
      return `<div class="field" role="group" aria-labelledby="${id}-l"><span id="${id}-l">${label}</span><div class="image-pick">
        ${src ? `<img src="${escHtml(src)}" alt="">` : `<span class="noimg">${/^sample:/.test(value || "") || (i != null && !value) ? "Sample" : "None"}</span>`}
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
function wrapDoc(html) {
  if (/<html[\s>]/i.test(html)) return html;
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>My widget</title>\n</head>\n<body>\n${html}\n</body>\n</html>\n`;
}
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
  return renderWidget(state.widget, state.opts);
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
  const doc = withHook(c.page);
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
  const text = c ? (state.view === "snippet" ? c.snippet : c.page) : "";
  codeEl.innerHTML = c ? highlight(text) : `<span class="c">${state.mode === "ai" ? "Describe your widget and press “Make it”. The code shows here." : ""}</span>`;
  const kb = new Blob([text]).size / 1024;
  $("codeSize").textContent = c ? `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB · ${text.split("\n").length} lines` : "";
  for (const id of ["copyBtn", "downloadBtn", "openBtn"]) $(id).disabled = !c;
}
function showWarnings() {
  state.warnings = state.mode === "templates" ? warnings(state.widget, state.opts) : [];
  $("warnings").innerHTML = state.warnings.map((w) => `<li>${escHtml(w)}</li>`).join("");
}

const saveSoon = debounce(() => {
  saveProject({ id: SAVE_ID, app: "code", name: "Code generator settings", data: { widget: state.widget, raw: state.raw } }).catch(() => {});
}, 700);

/** Re-renders the code now; the preview follows after a short pause (or now when immediate). */
function update({ immediate = false } = {}) {
  try { state.code = currentCode(); } catch (err) { state.code = null; toast(err.message); }
  showCode();
  showWarnings();
  if (immediate) { previewSoon.cancel(); showPreview(); } else previewSoon();
  if (state.mode === "templates") saveSoon();
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
    offline: "The 12 templates work today, right in your browser, even without internet.",
  });
  $("aiForm").hidden = true;
}
function setMode(mode) {
  state.mode = mode;
  const ai = mode === "ai";
  $("layout").dataset.mode = mode;
  $("templatesView").hidden = ai;
  $("aiView").hidden = !ai;
  for (const [id, on] of [["tabTemplates", !ai], ["tabAi", ai]]) {
    const t = $(id);
    t.setAttribute("aria-selected", String(on)); t.classList.toggle("on", on); t.tabIndex = on ? 0 : -1;
  }
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
    update({ immediate: true });
  } catch (err) {
    state.ai.error = err?.message || "Something went wrong.";
    if (err?.code === "AI_UNAVAILABLE") showSoon();
    else status(state.ai.error + " Your templates still work.", true);
  } finally { $("aiGo").disabled = false; }
}

/* ---------------------------------------------------------------- copy, download, open */
async function copyCode() {
  const c = state.code;
  if (!c) return false;
  const text = state.view === "snippet" ? c.snippet : c.page;
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
  toast(ok ? (state.view === "snippet" ? "Snippet copied. Paste it into your website." : "Code copied. Paste it into a new .html file or your website.") : "Could not copy here. Select the code and copy it by hand.");
  return ok;
}
function download() {
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
  $("resetBtn").addEventListener("click", () => { state.raw[state.widget] = {}; recompute(); buildForm(); update({ immediate: true }); toast("Back to the starting text and colours."); });
  $("tabTemplates").addEventListener("click", () => setMode("templates"));
  $("tabAi").addEventListener("click", () => setMode("ai"));
  document.querySelector(".mode-tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = state.mode === "ai" ? "templates" : "ai";
    setMode(next); $(next === "ai" ? "tabAi" : "tabTemplates").focus();
  });
  $("backToTemplates").addEventListener("click", () => { setMode("templates"); $("tabTemplates").focus(); });
  $("aiForm").addEventListener("submit", generateAi);
  $("devDesktop").addEventListener("click", () => { state.device = "desktop"; $("frameWrap").classList.remove("phone"); pressGroup(["devDesktop", "devPhone"], "devDesktop"); });
  $("devPhone").addEventListener("click", () => { state.device = "phone"; $("frameWrap").classList.add("phone"); pressGroup(["devDesktop", "devPhone"], "devPhone"); });
  $("viewPage").addEventListener("click", () => { state.view = "page"; pressGroup(["viewPage", "viewSnippet"], "viewPage"); showCode(); });
  $("viewSnippet").addEventListener("click", () => { state.view = "snippet"; pressGroup(["viewPage", "viewSnippet"], "viewSnippet"); showCode(); });
  $("reloadBtn").addEventListener("click", () => showPreview(true));
  $("copyBtn").addEventListener("click", copyCode);
  $("downloadBtn").addEventListener("click", download);
  $("openBtn").addEventListener("click", openInTab);
  window.addEventListener("asaandesk-brand", (e) => { brand = e.detail || loadBrand(); recompute(); buildForm(); update(); });
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
  setMode, copy: copyCode, download, openInTab,
  flush() { previewSoon.cancel(); showPreview(); return state.code?.page || ""; },
  aiReady,
};

async function init() {
  buildPicker();
  wire();
  let saved = null;
  try { saved = await Promise.race([getProject(SAVE_ID), new Promise((r) => setTimeout(() => r(null), 1500))]); } catch {}
  if (saved?.data?.raw && typeof saved.data.raw === "object") state.raw = saved.data.raw;
  const q = new URLSearchParams(window.location.search);
  const first = widgetById(q.get("w")) ? q.get("w") : widgetById(saved?.data?.widget) ? saved.data.widget : "countdown";
  select(first, { save: false });
  if (q.get("mode") === "ai") setMode("ai");
  state.ready = true;
  window.adApp.ready = true;
  document.documentElement.dataset.ready = "1";
}
init();
