// AI image generator and AI art generator (/design/ai-image/?tool=image|art).
// Pictures come only from AsaanDesk AI through onlineAi('/ai/image', …) when it is switched on (aiReady()).
// Until then the page shows an honest "coming soon" panel and points to the tools that already work.
import { TOOLS, STYLES, ASPECTS, MAX_PROMPT, MAX_COUNT, buildRequest, parseResult, fileNameFor, aspectById, STYLE_ORDER, EXAMPLES, cleanReference,
  stylesFor, styleById, GROUP_ORDER, REF_MODES, inspire, PROMPT_HELP, addToPrompt, promptTips, cleanColors, buildRefine } from "./gen.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";
import { saveProject, listProjects, deleteProject, putHandoff } from "../shared/store.js";
import { loadBrand } from "../shared/brand.js";

const $ = (s, el = document) => el.querySelector(s);
const params = new URLSearchParams(location.search);
const state = { reference: "", refMode: "look", useBrand: false, tool: TOOLS[params.get("tool")] ? params.get("tool") : "image", prompt: "", negative: "", style: null, aspect: "1:1", count: 1, busy: false, lastRequest: null, lastError: null };
state.style = TOOLS[state.tool].defaultStyle;
const urls = new Map(); // project id -> object URL for its picture

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
let toastTimer = null;
function toast(msg, ms = 3500) { const t = $("#toast"); t.textContent = msg; if (shell) { try { shell.toast(msg, ms); return; } catch {} } t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms); }

/* ---------- form ---------- */
function renderTool() {
  const t = TOOLS[state.tool];
  document.title = `${t.title} · AsaanDesk Design`;
  $("#appName").textContent = t.title;
  $("#title").textContent = t.title;
  $("#lead").textContent = t.lead;
  for (const b of document.querySelectorAll("#toolTabs button")) { const on = b.dataset.tool === state.tool; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); }
  $("#prompt").placeholder = state.tool === "art" ? "For example: a peacock made of mirror work, on a deep blue wall" : state.tool === "graphic" ? "For example: a smiling coffee cup sticker with steam hearts" : "For example: a cup of chai on a wooden table by a rainy window";
}
/** Styles grouped by family (Photography / Digital art / Fine art, or Graphics), each family in the tool's own order. */
function renderStyles() {
  const box = $("#styles");
  box.innerHTML = "";
  const order = STYLE_ORDER[state.tool] || stylesFor(state.tool).map((s) => s.id);
  for (const g of GROUP_ORDER[state.tool] || GROUP_ORDER.image) {
    const ids = order.filter((id) => styleById(id)?.group === g);
    if (!ids.length) continue;
    box.append(h("span", { class: "style-group", role: "presentation" }, g));
    for (const id of ids) {
      const s = styleById(id);
      box.append(h("button", { class: "style" + (state.style === s.id ? " on" : ""), "data-style": s.id, "aria-pressed": String(state.style === s.id), title: s.hint,
        onclick: () => { state.style = s.id; renderStyles(); } }, h("span", { class: "swatch s-" + s.id, "aria-hidden": "true" }), h("span", {}, s.name)));
    }
  }
}
function renderTips() {
  const tips = promptTips($("#prompt").value);
  $("#promptTips").replaceChildren(...tips.slice(0, 2).map((t) => h("li", {}, t)));
}
function renderHelper() {
  const box = $("#helperChips");
  box.replaceChildren(...Object.entries(PROMPT_HELP).map(([group, list]) => h("div", { class: "help-row" }, h("b", {}, group),
    ...list.map((phrase) => h("button", { class: "chip", type: "button", "data-helper": phrase, title: `Add "${phrase}" to the prompt` }, phrase)))));
}
function renderBrand() {
  const cs = cleanColors(loadBrand().colors);
  $("#brandSw").replaceChildren(...cs.map((c) => h("i", { style: `background:${c}` })));
  $("#useBrand").disabled = !cs.length;
  $("#useBrand").closest("label").title = cs.length ? "Ask for your brand kit colours in the picture" : "Add colours to your brand kit first (Brand in the side bar).";
  if (!cs.length) state.useBrand = $("#useBrand").checked = false;
}
function renderAspects() {
  const box = $("#aspects");
  box.innerHTML = "";
  for (const a of ASPECTS) {
    const r = a.w / a.h, w = r >= 1 ? 22 : Math.round(22 * r), hh = r >= 1 ? Math.round(22 / r) : 22;
    box.append(h("button", { class: "aspect" + (state.aspect === a.id ? " on" : ""), "data-aspect": a.id, "aria-pressed": String(state.aspect === a.id), "aria-label": `${a.label} ${a.id}`,
      onclick: () => { state.aspect = a.id; renderAspects(); } }, h("i", { style: `width:${w}px;height:${hh}px`, "aria-hidden": "true" }), h("span", {}, a.label), h("small", {}, a.id)));
  }
}
function renderCount() {
  const box = $("#count");
  box.innerHTML = "";
  for (let n = 1; n <= MAX_COUNT; n++) box.append(h("button", { class: state.count === n ? "on" : "", "data-count": n, "aria-pressed": String(state.count === n), onclick: () => { state.count = n; renderCount(); renderReady(); } }, String(n)));
}
function renderReady() {
  const ready = aiReady();
  const soon = $("#soon");
  soon.hidden = ready;
  if (!ready) {
    comingSoon(soon, { title: `${TOOLS[state.tool].title} is coming soon`,
      what: "AsaanDesk AI will turn your words into pictures here. It is not switched on yet, so nothing you type is sent anywhere and no pictures are made up.",
      offline: "Make something now with the tools that already work:" });
    soon.querySelector(".ad-soon").append(h("div", { class: "soon-links" },
      h("a", { class: "btn", href: "/design/studio/" }, "Studio templates"),
      h("a", { class: "btn", href: "/design/draw/" }, "Draw"),
      h("a", { class: "btn", href: "/design/photo/" }, "Photo editor"),
      h("a", { class: "btn", href: "/design/photo/?mode=bg" }, "Background remover")));
  }
  const go = $("#generate");
  go.disabled = !ready || state.busy;
  go.textContent = state.busy ? "Making…" : ready ? `Generate ${state.count > 1 ? state.count + " pictures" : ""}`.trim() : "Generate (coming soon)";
}

/* ---------- generating ---------- */
async function generate() {
  if (state.busy) return;
  state.lastError = null;
  let body;
  try { body = buildRequest({ prompt: $("#prompt").value, negative: $("#negative").value, style: state.style, aspect: state.aspect, count: state.count, tool: state.tool, reference: state.reference, refMode: state.refMode, colors: state.useBrand ? loadBrand().colors : [] }); }
  catch (e) { toast(e.message); $("#prompt").focus(); return; }
  if (!aiReady()) { renderReady(); $("#soon").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  savePrompt({ quiet: true });
  state.busy = true;
  state.lastRequest = body;
  renderReady();
  const pending = h("div", { class: "pending", role: "status", "aria-live": "polite" },
    ...Array.from({ length: body.count }, () => h("div", { class: "ph", style: `aspect-ratio:${aspectById(body.aspect).w}/${aspectById(body.aspect).h}` }, h("div", { class: "spinner" }))),
    h("p", {}, "AsaanDesk AI is making your picture…"));
  $("#results").prepend(pending);
  try {
    const data = await onlineAi("/ai/image", body, TOOLS[state.tool].title);
    const srcs = parseResult(data, body.count);
    for (const [i, src] of srcs.entries()) await keep(src, body, i);
    toast(srcs.length > 1 ? `${srcs.length} pictures made and saved below.` : "Picture made and saved below.");
  } catch (e) {
    console.error(e);
    state.lastError = e.message;
    toast(e.message || "AsaanDesk AI could not make the picture. Please try again.", 5000);
  } finally {
    pending.remove();
    state.busy = false;
    renderReady();
    await renderGallery();
  }
}
async function keep(src, body, i) {
  let blob = null;
  try { blob = await (await fetch(src)).blob(); } catch { /* keep the address only */ }
  const thumb = blob ? await thumbOf(blob) : null;
  return saveProject({ app: "ai-image", name: body.prompt.slice(0, 80), data: { ...body, index: i, blob, src: blob ? null : src, created: Date.now() }, thumb });
}
async function thumbOf(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const s = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } catch { return null; }
}

/* ---------- gallery ---------- */
const srcOf = (p) => { if (p.data.blob) { if (!urls.has(p.id)) urls.set(p.id, URL.createObjectURL(p.data.blob)); return urls.get(p.id); } return p.data.src || p.thumb; };
async function blobOf(p) { return p.data.blob || (await (await fetch(p.data.src)).blob()); }
function download(blob, name) {
  const a = h("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
async function sizeOf(blob) { try { const b = await createImageBitmap(blob); const r = { w: b.width, h: b.height }; b.close?.(); return r; } catch { return null; } }
async function toStudio(p) {
  try {
    const blob = await blobOf(p);
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
    const sz = (await sizeOf(blob)) || { w: p.data.width, h: p.data.height };
    const design = { version: 1, name: p.name || "AI picture", preset: { id: "custom", label: "Custom size", w: sz.w, h: sz.h, unit: "px", dpi: 96, bleed: 0 },
      pages: [{ id: "p" + p.id, background: { color: "#ffffff" }, layers: [{ id: "l" + p.id, type: "image", name: "AI picture", x: 0, y: 0, w: sz.w, h: sz.h, rotation: 0, opacity: 1, locked: false, hidden: false, animation: null,
        image: { src: dataUrl, crop: { x: 0, y: 0, w: 1, h: 1 }, filters: { brightness: 1, contrast: 1, saturate: 1, blur: 0, grayscale: 0, sepia: 0, hue: 0 }, radius: 0, flipX: false, flipY: false, nw: sz.w, nh: sz.h } }] }] };
    const id = await putHandoff({ type: "design", design });
    location.href = "/design/studio/?handoff=" + id;
  } catch (e) { toast(e.message || "Could not open Studio."); }
}
async function toPhoto(p) {
  try {
    const blob = await blobOf(p);
    const id = await putHandoff({ type: "image", blob, name: fileNameFor(p.name, p.data.index, (blob.type.split("/")[1] || "png").replace("jpeg", "jpg")) });
    location.href = "/design/photo/?handoff=" + id;
  } catch (e) { toast(e.message || "Could not open the photo editor."); }
}
async function renderGallery() {
  const box = $("#gallery");
  const list = (await listProjects("ai-image").catch(() => [])).filter(isPicture); // saved prompts (Projects) have no picture
  box.innerHTML = "";
  $("#galleryHead").hidden = !list.length;
  for (const p of list) {
    const style = styleById(p.data.style);
    box.append(h("figure", { class: "card", "data-id": p.id },
      h("span", { class: "ai-label", title: "Made by AsaanDesk AI" }, "AI"),
      h("img", { src: srcOf(p), alt: p.name, loading: "lazy" }),
      h("figcaption", {}, h("span", { class: "cap" }, p.name), h("span", { class: "meta" }, [style?.name, p.data.aspect, p.data.kind && p.data.kind !== "new" ? { edit: "edited", boost: "boosted", similar: "more like this" }[p.data.kind] : ""].filter(Boolean).join(" · "))),
      h("div", { class: "actions" },
        h("button", { class: "btn", onclick: async () => { try { const b = await blobOf(p); download(b, fileNameFor(p.name, p.data.index, (b.type.split("/")[1] || "png").replace("jpeg", "jpg"))); } catch (e) { toast("Could not download this picture."); } } }, "Download"),
        h("button", { class: "btn", onclick: () => toPhoto(p) }, "Edit photo"),
        h("button", { class: "btn", onclick: () => toStudio(p) }, "Use in a design"),
        h("button", { class: "btn", "data-card": "use-prompt", onclick: () => usePrompt(p.data) }, "Use prompt"),
        h("button", { class: "btn", "data-card": "regenerate", onclick: () => { usePrompt(p.data); generate(); } }, "Generate again"),
        h("button", { class: "btn", "data-card": "similar", onclick: () => moreLikeThis(p) }, "More like this"),
        h("button", { class: "btn", "data-card": "edit", onclick: () => refine(p, "edit") }, "Change with words"),
        h("button", { class: "btn", "data-card": "boost", onclick: () => refine(p, "boost") }, "Boost resolution"),
        h("button", { class: "btn del", "aria-label": "Delete this picture", onclick: async () => { await deleteProject(p.id); URL.revokeObjectURL(urls.get(p.id) || ""); urls.delete(p.id); renderGallery(); } }, "Delete"))));
  }
}
/** "More like this": the picture's prompt, style and shape go back into the form, with the picture as the reference. */
async function moreLikeThis(p) {
  usePrompt(p.data);
  try { setReference(await refFromFile(await blobOf(p))); state.refMode = "look"; syncRefMode(); toast("Prompt, style and this picture as the reference are set. Press Generate for more like it."); }
  catch { toast("Prompt and style are set. This picture could not be used as the reference."); }
  $("#prompt").scrollIntoView?.({ behavior: "smooth", block: "center" });
}
/** Change a picture with words, or boost its resolution: sent to AsaanDesk AI only when it is on; new results are kept. */
function openEditBox(p) {
  const card = $(`#gallery .card[data-id="${p.id}"]`);
  if (!card) return null;
  card.querySelector(".edit-box")?.remove();
  const inp = h("input", { class: "ad-input", type: "text", maxlength: "400", placeholder: "What should change? e.g. make the cup blue", "aria-label": "What should change in this picture" });
  const form = h("form", { class: "edit-box", onsubmit: (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) { inp.focus(); return; } form.remove(); refine(p, "edit", v); } },
    inp, h("button", { class: "btn primary", type: "submit" }, "Change"), h("button", { class: "btn", type: "button", onclick: () => form.remove() }, "Cancel"));
  card.querySelector(".actions").after(form);
  inp.focus();
  return form;
}
async function refine(p, kind, edit = "") {
  if (!aiReady()) { renderReady(); toast(`${kind === "boost" ? "Boost resolution" : "Changing a picture with words"} needs AsaanDesk AI, which is coming soon. Nothing was sent.`, 5000); return null; }
  edit = String(edit || "").trim();
  if (kind === "edit" && !edit) { openEditBox(p); return null; }
  let body;
  try {
    const blob = await blobOf(p);
    const source = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob); });
    body = buildRefine({ kind, source, edit, prompt: p.data.prompt, style: p.data.style, aspect: p.data.aspect });
  } catch (e) { toast(e.message || "That picture can't be changed."); return null; }
  state.busy = true; renderReady();
  try {
    const data = await onlineAi(kind === "boost" ? "/ai/image/boost" : "/ai/image/edit", body, TOOLS[state.tool].title);
    const srcs = parseResult(data, 1);
    await keep(srcs[0], { ...p.data, prompt: kind === "edit" ? `${p.data.prompt} (${edit})`.slice(0, MAX_PROMPT) : p.data.prompt, kind }, 0);
    toast(kind === "boost" ? "Sharper copy made and saved below." : "Changed picture made and saved below.");
  } catch (e) { toast(e.message || "AsaanDesk AI could not do that. Please try again.", 5000); }
  finally { state.busy = false; renderReady(); await renderGallery(); }
  return true;
}

/* ---------- boot ---------- */
function bind() {
  for (const b of document.querySelectorAll("#toolTabs button")) b.addEventListener("click", () => {
    state.tool = b.dataset.tool;
    state.style = TOOLS[state.tool].defaultStyle;
    history.replaceState(null, "", "?tool=" + state.tool);
    renderTool(); renderStyles(); renderReady(); renderStatus(); renderExamples();
  });
  const p = $("#prompt");
  p.maxLength = MAX_PROMPT;
  p.addEventListener("input", () => { $("#promptCount").textContent = `${p.value.length}/${MAX_PROMPT}`; renderTips(); });
  $("#inspireBtn").addEventListener("click", () => inspireMe());
  renderHelper();
  $("#helperChips").addEventListener("click", (e) => { const b = e.target.closest("[data-helper]"); if (!b) return; p.value = addToPrompt(p.value, b.dataset.helper); p.dispatchEvent(new Event("input")); });
  $("#refMode").addEventListener("change", (e) => { state.refMode = e.target.value; });
  $("#useBrand").addEventListener("change", (e) => { state.useBrand = e.target.checked; });
  window.addEventListener("asaandesk-brand", renderBrand);
  renderBrand(); syncRefMode();
  p.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); generate(); } });
  $("#generate").addEventListener("click", generate);
  // Example and recent prompts: one listener each (the chips are redrawn when the tool changes).
  const pick = (e) => { const b = e.target.closest("[data-example]"); if (!b) return; p.value = b.dataset.example; p.dispatchEvent(new Event("input")); p.focus(); };
  $("#examples").addEventListener("click", pick);
  $("#recentPrompts").addEventListener("click", (e) => { const b = e.target.closest("[data-recent]"); if (!b) return; const it = readPrompts()[+b.dataset.recent]; if (it) usePrompt(it); });
  $("#savePromptBtn").addEventListener("click", () => savePrompt());
  $("#refInput").addEventListener("change", async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    try { setReference(await refFromFile(f)); toast("Reference picture added."); } catch (err) { toast(err.message || "That picture could not be used."); }
  });
  $("#refClear").addEventListener("click", () => setReference(""));
  renderExamples(); renderRecent();
}
/* ---------- examples, prompt history, reference picture ---------- */
const PKEY = "asaandesk-ai-image-prompts";
function readPrompts() { try { const v = JSON.parse(localStorage.getItem(PKEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }
function renderExamples() {
  const box = $("#examples"); if (!box) return;
  box.replaceChildren(...(EXAMPLES[state.tool] || EXAMPLES.image).map(([label, text]) => h("button", { class: "chip", type: "button", "data-example": text }, label)));
}
function renderRecent() {
  const list = readPrompts().slice(0, 5), box = $("#recentPrompts");
  $("#recentWrap").hidden = !list.length;
  box.replaceChildren(...list.map((it, i) => h("button", { class: "chip", type: "button", "data-recent": String(i), title: it.prompt }, it.prompt.length > 34 ? it.prompt.slice(0, 33) + "…" : it.prompt)));
  if (shell?.el.dataset.panel === "history") renderHistoryPanel(shell.panel("history"));
}
/** Keeps the prompt (with its tool, style and shape) in this browser's history. */
function savePrompt({ quiet = false } = {}) {
  const prompt = $("#prompt").value.replace(/\s+/g, " ").trim();
  if (!prompt) { if (!quiet) { toast("Write a prompt first."); $("#prompt").focus(); } return false; }
  const it = { prompt, negative: $("#negative").value.trim(), tool: state.tool, style: state.style, aspect: state.aspect, count: state.count, t: Date.now() };
  const list = [it, ...readPrompts().filter((x) => x.prompt !== prompt)].slice(0, 40);
  try { localStorage.setItem(PKEY, JSON.stringify(list)); } catch { if (!quiet) toast("This browser could not save the prompt."); return false; }
  renderRecent();
  if (!quiet) toast(aiReady() ? "Prompt saved." : "Prompt saved. Use it again when AsaanDesk AI is switched on.");
  return true;
}
/** Puts a saved prompt (or a picture's settings) back into the form. */
function usePrompt(it) {
  if (!it?.prompt) return;
  if (it.tool && TOOLS[it.tool] && it.tool !== state.tool) switchTool(it.tool);
  const pbox = $("#prompt"); pbox.value = it.prompt; pbox.dispatchEvent(new Event("input"));
  $("#negative").value = it.negative || "";
  if (STYLES.some((x) => x.id === it.style)) state.style = it.style;
  if (aspectById(it.aspect)) state.aspect = it.aspect;
  if (it.count >= 1 && it.count <= MAX_COUNT) state.count = it.count;
  renderStyles(); renderAspects(); renderCount(); renderReady();
}
function renderHistoryPanel(box) {
  box.replaceChildren();
  const list = readPrompts();
  box.append(h("p", { class: "hist-note" }, "Prompts you saved or generated, kept in this browser only."));
  if (!list.length) {
    box.append(h("p", { class: "hist-note" }, "No prompts yet. Write one and press Save prompt."),
      h("button", { class: "btn", type: "button", id: "historySaveNow", onclick: () => { if (savePrompt()) renderHistoryPanel(box); } }, "Save the current prompt"));
    return;
  }
  const ul = h("ul", { class: "hist-list", id: "historyList" });
  list.forEach((it, i) => ul.append(h("li", { class: "hist-item", "data-history": String(i) },
    h("b", {}, it.prompt),
    h("small", {}, [TOOLS[it.tool]?.title, STYLES.find((x) => x.id === it.style)?.name, it.aspect].filter(Boolean).join(" · ")),
    h("span", { class: "hist-acts" },
      h("button", { class: "btn", type: "button", "data-hact": "use", onclick: () => usePrompt(it) }, "Use"),
      h("button", { class: "btn", type: "button", "data-hact": "delete", onclick: () => { try { localStorage.setItem(PKEY, JSON.stringify(readPrompts().filter((x) => x.prompt !== it.prompt))); } catch {} renderRecent(); renderHistoryPanel(box); } }, "Delete")))));
  box.append(ul, h("button", { class: "btn", type: "button", id: "historyClear", onclick: () => { try { localStorage.removeItem(PKEY); } catch {} renderRecent(); renderHistoryPanel(box); } }, "Clear history"));
}
async function refFromFile(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Choose a JPG, PNG or WebP picture.");
  if (file.size > 25e6) throw new Error("That picture is too big (25 MB at most).");
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 768 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  const url = c.toDataURL("image/jpeg", 0.85);
  if (!cleanReference(url)) throw new Error("That picture could not be used.");
  return url;
}
function setReference(url) {
  state.reference = url || "";
  const img = $("#refPreview");
  img.hidden = !state.reference; if (state.reference) img.src = state.reference; else img.removeAttribute("src");
  $("#refClear").hidden = !state.reference;
  syncRefMode();
}
function syncRefMode() {
  const sel = $("#refMode");
  if (!sel.options.length) sel.append(...REF_MODES.map(([k, l]) => h("option", { value: k }, l)));
  sel.value = state.refMode;
  $("#refModeWrap").hidden = !state.reference;
}
/** "Inspire me": a random idea for the open tool fills the prompt (nothing is sent). */
function inspireMe(rnd = Math.random()) {
  const [label, text] = inspire(state.tool, rnd);
  const p = $("#prompt"); p.value = text; p.dispatchEvent(new Event("input")); p.focus();
  toast(`Idea: ${label}. Change it to make it yours.`);
  return text;
}

/* ---------- editor frame (shared shell) ---------- */
let shell = null;
const TITLE_KEY = "asaandesk-ai-image-title";
function switchTool(tool) {
  if (!TOOLS[tool] || tool === state.tool) return;
  state.tool = tool;
  state.style = TOOLS[tool].defaultStyle;
  history.replaceState(null, "", "?tool=" + tool);
  renderTool(); renderStyles(); renderReady(); renderStatus(); renderExamples();
}
function renderStatus() {
  const chip = $("#aiStatus");
  if (!chip) return;
  const on = aiReady();
  chip.textContent = on ? "AsaanDesk AI is on" : "AI: coming soon";
  chip.dataset.on = String(on);
  chip.title = on ? "Pictures are made by AsaanDesk AI." : "AsaanDesk AI is not switched on yet. Nothing is sent and no pictures are made up.";
}
function applyPreset(p) {
  if (!p) throw new Error("That template was not found.");
  switchTool(p.tool);
  state.style = p.style; state.aspect = p.aspect;
  const box = $("#prompt");
  box.value = p.prompt; box.dispatchEvent(new Event("input"));
  renderStyles(); renderAspects(); renderReady();
  toast(aiReady() ? `${p.name}: prompt, style and shape are filled in. Press Generate.` : `${p.name}: prompt, style and shape are filled in. AsaanDesk AI is coming soon, so Generate is off for now.`);
  showExample(p);
}
/** The opened template's design (same as its thumbnail, full-size library photo), clearly labelled as a style example. */
async function showExample(p) {
  try {
    const g = await import("./gallery.js");
    const svg = typeof g.design === "function" ? g.design(p.id, "full") : "";
    if (!svg) return;
    let box = $("#tplExample");
    if (!box) { box = h("figure", { id: "tplExample", class: "tpl-example", style: "margin:0 0 14px;background:#fff;border:1px solid #e5e7f0;border-radius:14px;padding:10px;box-shadow:0 8px 22px -14px rgba(15,23,42,.4)" }); $("section.out").prepend(box); }
    const art = h("div", { style: "border-radius:10px;overflow:hidden;aspect-ratio:16/10;background:#f3f4f8", html: svg });
    art.querySelector("svg")?.setAttribute("style", "display:block;width:100%;height:100%");
    box.replaceChildren(art, h("figcaption", { style: "margin-top:8px;font-size:13px;line-height:1.4;color:#475569" }, h("b", {}, `Template: ${p.name}. `),
      aiReady() ? "A style example made from a library photo. Your own picture comes from AsaanDesk AI when you press Generate." : "A style example made from a library photo, not a picture made by AsaanDesk AI. AsaanDesk AI is coming soon."));
  } catch (e) { console.warn("Template example unavailable", e); }
}
/* ---------- insert adapter (left-rail kit: Elements, Text, Tools, Uploads) ---------- */
// The generator has no canvas. Every Elements / Uploads item reaches it as a picture (photos directly; graphics, shapes,
// frames, charts, drawings through the kit's picture fallback) and becomes the reference picture ("Use a reference").
// Text and font combinations add their words to the prompt as words to show in the picture. Nothing is sent or made up.
const PAGE_NO_MSG = "AI pictures have no page numbers. Add words with Text instead.";
const isPageNo = (x) => /^page number$/i.test(String(x?.name ?? x ?? ""));
async function refFromUrl(src) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await (img.decode ? img.decode() : new Promise((res, rej) => { img.onload = res; img.onerror = rej; }));
  const nw = img.naturalWidth || 768, nh = img.naturalHeight || 768, k = Math.min(1, 768 / Math.max(nw, nh));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(nw * k)); c.height = Math.max(1, Math.round(nh * k));
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height); // see-through graphics on white, like the JPEG keeps them
  g.drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.85);
  if (!cleanReference(url)) throw new Error("That picture could not be used as a reference.");
  return url;
}
async function useAsReference(src, name) {
  if (isPageNo(name)) throw new Error(PAGE_NO_MSG);
  const tmp = src instanceof Blob ? URL.createObjectURL(src) : "";
  let url;
  try { url = cleanReference(String(tmp || src)) || await refFromUrl(String(tmp || src)); }
  catch (e) { throw new Error(e?.message && /reference/.test(e.message) ? e.message : "That picture could not be used as a reference."); }
  finally { if (tmp) URL.revokeObjectURL(tmp); }
  setReference(url);
  $("#refPreview")?.scrollIntoView?.({ block: "nearest" });
  toast(`${String(name || "Picture").replace(/\.[a-z0-9]{2,4}$/i, "")} is the reference picture now (${(REF_MODES.find(([k]) => k === state.refMode) || REF_MODES[0])[1].toLowerCase()}).`);
  return true;
}
const FONT_WORDS = { serif: "elegant serif lettering", sans: "clean sans-serif lettering", mono: "typewriter lettering", calibri: "modern rounded lettering", cambria: "classic book lettering" };
/** The words of kit text specs as a prompt phrase: with the words "…" (in capital letters, bold serif lettering…). */
function textPhrase(specs) {
  const list = (Array.isArray(specs) ? specs : [specs]).filter((s) => String(s?.content ?? "").trim());
  if (!list.length) return "";
  const words = list.map((s) => String(s.content).replace(/\s+/g, " ").trim()).join(" / ").replace(/"/g, "'").slice(0, 160);
  const s = list[0], how = [s.uppercase ? "in capital letters" : "", FONT_WORDS[s.family] ? `${s.bold || s.weight >= 600 ? "bold " : ""}${FONT_WORDS[s.family]}` : s.bold ? "bold lettering" : "", /^#[0-9a-f]{6}$/i.test(s.color || "") ? `colour ${s.color.toLowerCase()}` : ""].filter(Boolean);
  return `with the words "${words}"${how.length ? ` (${how.join(", ")})` : ""}`;
}
function wordsToPrompt(specs) {
  const list = (Array.isArray(specs) ? specs : [specs]).map((s) => (typeof s === "string" ? { content: s } : s || {}));
  if (list.some(isPageNo)) throw new Error(PAGE_NO_MSG);
  const phrase = textPhrase(list);
  if (!phrase) throw new Error("Type the words first.");
  const box = $("#prompt");
  box.value = addToPrompt(box.value, phrase);
  box.dispatchEvent(new Event("input"));
  toast("Added to the prompt: the picture will show these words. Change them in the prompt box.");
  return true;
}
const INSERT = {
  image: (src, name) => useAsReference(src, name),
  text: (spec, style) => wordsToPrompt(typeof spec === "string" ? { content: spec, role: style } : spec),
  textGroup: (specs) => wordsToPrompt(specs),
  pageNumber: () => { throw new Error(PAGE_NO_MSG); },
};
/* ---------- Projects: saved prompts (and made pictures) ---------- */
const isPicture = (p) => !!(p?.data && (p.data.blob || p.data.src));
function promptThumb(it) {
  const words = String(it.prompt || "").replace(/\s+/g, " ").trim(), lines = [words.slice(0, 26), words.slice(26, 52) + (words.length > 52 ? "…" : "")].filter(Boolean);
  const esc2 = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ece9ff"/><stop offset="1" stop-color="#ffe9e1"/></linearGradient></defs><rect width="320" height="200" rx="14" fill="url(#g)"/><rect x="18" y="18" width="70" height="22" rx="11" fill="#5b4cf0"/><text x="53" y="33.5" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#fff">PROMPT</text>${lines.map((t, i) => `<text x="20" y="${84 + i * 26}" font-family="Arial" font-size="17" font-weight="700" fill="#1b2133">${esc2(t)}</text>`).join("")}<text x="20" y="176" font-family="Arial" font-size="12" fill="#5b6175">${esc2([TOOLS[it.tool]?.title, styleById(it.style)?.name, it.aspect].filter(Boolean).join(" · "))}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function promptProject() {
  const prompt = $("#prompt").value.replace(/\s+/g, " ").trim();
  if (!prompt) throw new Error("Write a prompt first, then save it to Projects.");
  const it = { kind: "prompt", prompt, negative: $("#negative").value.trim(), tool: state.tool, style: state.style, aspect: state.aspect, count: state.count, refMode: state.refMode, ...(state.reference ? { reference: state.reference } : {}) };
  return { app: "ai-image", name: prompt.slice(0, 80), data: it, thumb: promptThumb(it) };
}
function openPromptProject(rec) {
  const d = rec?.data;
  if (!d?.prompt) throw new Error("That project could not be opened.");
  usePrompt(d);
  if (d.refMode) state.refMode = d.refMode;
  setReference(d.reference && cleanReference(d.reference) ? d.reference : "");
  $("#prompt").scrollIntoView?.({ block: "center" });
  return true;
}
/* ---------- Design panel: Styles (the picture styles) and Layouts (picture shapes); template style ---------- */
// Canva's Design panel tabs for the generator: Styles = the style list of the open tool, Layouts = the picture shapes.
// "Apply this template style" takes a template's tool, style and shape and keeps your prompt.
function renderDesignStyles(box) {
  box._shown = () => renderDesignStyles(box); // the Design tab redraws each time it is shown (selection, theme)
  box.replaceChildren();
  const order = STYLE_ORDER[state.tool] || stylesFor(state.tool).map((s) => s.id);
  for (const g of GROUP_ORDER[state.tool] || GROUP_ORDER.image) {
    const ids = order.filter((id) => styleById(id)?.group === g);
    if (!ids.length) continue;
    box.append(h("h3", { class: "ds-h3" }, g));
    const grid = h("div", { class: "ds-grid" });
    for (const id of ids) {
      const s = styleById(id), on = state.style === s.id;
      grid.append(h("button", { type: "button", class: "ds-style" + (on ? " on" : ""), "data-design-style": s.id, "aria-pressed": String(on), title: s.hint,
        onclick: () => { state.style = s.id; renderStyles(); renderDesignStyles(box); toast(`${s.name} style. Nothing is made until you press Generate.`); } },
      h("span", { class: "swatch s-" + s.id, "aria-hidden": "true" }), h("span", {}, s.name)));
    }
    box.append(grid);
  }
}
function renderDesignLayouts(box) {
  box._shown = () => renderDesignLayouts(box); // the Design tab redraws each time it is shown (selection, theme)
  box.replaceChildren(h("h3", { class: "ds-h3" }, "Picture shape"));
  const grid = h("div", { class: "ds-grid" });
  for (const a of ASPECTS) {
    const r = a.w / a.h, w = r >= 1 ? 40 : Math.round(40 * r), hh = r >= 1 ? Math.round(40 / r) : 40, on = state.aspect === a.id;
    grid.append(h("button", { type: "button", class: "ds-shape" + (on ? " on" : ""), "data-design-aspect": a.id, "aria-pressed": String(on), "aria-label": `${a.label} ${a.id}`,
      onclick: () => { state.aspect = a.id; renderAspects(); renderDesignLayouts(box); } }, h("i", { style: `width:${w}px;height:${hh}px`, "aria-hidden": "true" }), h("span", {}, a.label), h("small", {}, `${a.id} · ${a.w}×${a.h}`)));
  }
  box.append(grid);
}
function applyPresetStyle(p) {
  if (!p) throw new Error("That template was not found.");
  if (p.tool && p.tool !== state.tool) switchTool(p.tool);
  if (STYLES.some((x) => x.id === p.style)) state.style = p.style;
  if (aspectById(p.aspect)) state.aspect = p.aspect;
  renderStyles(); renderAspects(); renderReady();
  toast(`${p.name}: its style and shape are set. Your prompt stays.`);
  return true;
}
async function mountFrame() {
  let mod = null, gallery = null;
  try { mod = await import("../shared/editor-shell.js"); gallery = await import("./gallery.js"); } catch (e) { console.warn("Editor frame unavailable", e); return null; }
  try {
    const bar = h("div", { class: "ai-bar", id: "aiBar" }, h("span", { class: "ai-chip", id: "aiStatus", role: "status" }),
      h("button", { class: "btn small", type: "button", id: "barGenerate", onclick: () => { $("#generate").scrollIntoView({ block: "center" }); generate(); } }, "Generate"));
    let title = ""; try { title = localStorage.getItem(TITLE_KEY) || ""; } catch {}
    shell = mod.mountShell({
      app: "ai-image", kind: TOOLS[state.tool].title.replace(/ generator$/, ""), title: title || "", home: state.tool === "art" ? "/tools/ai-art-generator" : "/tools/ai-image-generator",
      onTitle: (t) => { try { localStorage.setItem(TITLE_KEY, String(t || "").slice(0, 120)); } catch {} },
      stage: $("main.wrap"), toolbar: bar, formulaBar: null, resize: null,
      file: [
        { label: "Save prompt", act: () => savePrompt() },
        { label: "Prompt history", act: () => shell.openPanel("history") },
        { label: "New prompt", act: () => { const p = $("#prompt"); p.value = ""; p.dispatchEvent(new Event("input")); $("#negative").value = ""; p.focus(); } },
        { label: "Choose a template", act: () => shell.openPanel("templates") },
        { label: "AI image generator", group: "Tool", act: () => switchTool("image") },
        { label: "AI art generator", group: "Tool", act: () => switchTool("art") },
        { label: "AI graphics generator", group: "Tool", act: () => switchTool("graphic"), hint: "Stickers and icons, see-through background" },
        { label: "AI video generator", group: "Tool", act: () => { location.href = "/design/ai-media/?tool=video"; }, hint: "Short clips from words" },
        { label: "Inspire me", act: () => inspireMe(), hint: "A random idea in the prompt" },
        { label: "Studio templates", group: "Works today", act: () => { location.href = "/design/studio/"; } },
        { label: "Draw", group: "Works today", act: () => { location.href = "/design/draw/"; } },
        { label: "Photo editor", group: "Works today", act: () => { location.href = "/design/photo/"; } },
      ],
      share: { download: [], link: () => location.origin + "/design/ai-image/?tool=" + state.tool },
      templates: { gallery, tool: ["ai-image-generator", "ai-art-generator"], apply: async (id) => applyPreset(gallery.presetById(id)), applyStyle: (id) => applyPresetStyle(gallery.presetById(id)), placeholder: "Search prompt templates" },
      design: { styles: (box) => renderDesignStyles(box), layouts: (box) => renderDesignLayouts(box) },
      panels: { history: { label: "History", icon: "notes", render: (box) => renderHistoryPanel(box), refresh: true } },
      // Canva's rail (Elements, Text, Brand, Uploads, Tools from the shared kit) + the prompt history.
      rail: ["templates", "elements", "text", "brand", "uploads", "tools", "history", "projects", "apps", "translate"],
      // Projects: a saved prompt (its tool, style, shape and reference) or a made picture opens its settings again.
      projects: { save: async () => promptProject(), open: async (rec) => openPromptProject(rec) },
      insert: INSERT,
      getText: () => $("#prompt").value,
      setText: (t) => { const p = $("#prompt"); p.value = String(t || "").slice(0, MAX_PROMPT); p.dispatchEvent(new Event("input")); },
      bottom: { notes: true, outline: null, timer: true, fullscreen: true, help: true, pages: null, zoom: null },
      setMode: (m) => { document.body.dataset.mode = m; },
      initialPanel: matchMedia("(max-width: 759.98px)").matches ? null : "templates",
    });
    bar.prepend($("#toolTabs")); // moved only once the frame is up
    renderStatus();
    document.body.classList.add("has-shell");
    return shell;
  } catch (e) { console.warn("The editor frame could not start", e); shell = null; return null; }
}
window.adApp = {
  get state() { return { tool: state.tool, style: state.style, aspect: state.aspect, count: state.count, busy: state.busy, aiReady: aiReady(), lastRequest: state.lastRequest, lastError: state.lastError }; },
  generate,
  gallery: async () => (await listProjects("ai-image")).filter(isPicture),
  buildRequest, savePrompt, prompts: readPrompts, usePrompt, setReference, get reference() { return state.reference; }, applyPreset: async (id) => applyPreset((await import("./gallery.js")).presetById(id)), get shell() { return shell; },
  // Round 3 (Canva Magic Media / Dream Lab parity): Graphics tool, Inspire me, prompt helper and tips, reference modes,
  // brand colours, follow-ups on a picture (more like this, change with words, boost resolution).
  switchTool, inspire: inspireMe, tips: () => promptTips($("#prompt").value), refine, moreLikeThis,
  setRefMode: (m) => { state.refMode = m; syncRefMode(); }, setUseBrand: (on) => { state.useBrand = !!on && !$("#useBrand").disabled; $("#useBrand").checked = state.useBrand; return state.useBrand; },
  // Left-rail kit insert adapter: pictures become the reference, text goes into the prompt.
  insert: INSERT, textPhrase, promptProject: () => promptProject(), openPromptProject: (r) => openPromptProject(r), design: { styles: (box) => renderDesignStyles(box), layouts: (box) => renderDesignLayouts(box) }, applyStyle: async (id) => applyPresetStyle((await import("./gallery.js")).presetById(id)),
  formRequest: () => buildRequest({ prompt: $("#prompt").value, negative: $("#negative").value, style: state.style, aspect: state.aspect, count: state.count, tool: state.tool, reference: state.reference, refMode: state.refMode, colors: state.useBrand ? loadBrand().colors : [] }),
  ready: null,
};
window.adApp.ready = (async () => {
  bind();
  renderTool(); renderStyles(); renderAspects(); renderCount(); renderReady();
  await mountFrame();
  const tpl = params.get("template");
  if (tpl) { try { const g = await import("./gallery.js"); applyPreset(g.presetById(tpl)); try { shell?.pushRecent?.(tpl); } catch {} } catch (e) { toast(e.message || "That template was not found."); } }
  // ?prompt= (example-prompt links on the intro pages): fill the prompt box; nothing is sent until Generate.
  const pr = String(params.get("prompt") || "").replace(/\s+/g, " ").trim().slice(0, MAX_PROMPT);
  if (pr) { const box = $("#prompt"); box.value = pr; box.dispatchEvent(new Event("input")); }
  await renderGallery();
})();
