// AI video, music and voice generators. They call AsaanDesk AI (the Worker) only when it is switched on
// (aiReady()); otherwise they show an honest "coming soon" panel and point to the tools that work today.
// Nothing here ever invents a result: only media returned by the AI service is shown.
import { $, $$, esc, toast, downloadBlob } from "../video/ui.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";
import { putHandoff, saveProject, listProjects, deleteProject } from "../shared/store.js";
import { TOOLS, TOOL_IDS, OFFLINE_LINKS, toolFromQuery, validate, buildRequest, resultMedia, fileNameFor, extForMime, promptWarnings, scriptTips, addPhrase } from "./tools.js";
/** What a tool makes, in words: "video", "music", "voice", "sound effect". */
const noun = (t) => (t.kind === "video" ? "video" : t.id === "music" ? "music" : t.id === "sfx" ? "sound effect" : "voice");

const state = {
  tool: toolFromQuery(location.search), ready: aiReady(), busy: false, lastRequest: null, result: null, error: "",
  forms: Object.fromEntries(TOOL_IDS.map((id) => [id, { [TOOLS[id].field]: "", ...TOOLS[id].defaults }])),
};
const prompt = $("#prompt"), genBtn = $("#genBtn");

function setTool(id, { focus = false } = {}) {
  if (!TOOLS[id]) return;
  state.tool = id; state.error = "";
  const t = TOOLS[id], form = state.forms[id];
  for (const b of $$("#tabs [role=tab]")) { const on = b.dataset.tool === id; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; }
  $("#toolPanel").setAttribute("aria-labelledby", "tab-" + id);
  $("#toolTitle").textContent = t.title; $("#barTitle").textContent = t.title; $("#toolLead").textContent = t.lead;
  document.title = `${t.title} | AsaanDesk`;
  $("#fieldLabel").textContent = t.fieldLabel;
  prompt.placeholder = t.placeholder; prompt.maxLength = t.max + 200;
  prompt.value = form[t.field] || "";
  $("#max").textContent = t.max;
  const rules = $("#rules"); // prompt rules, safety / licence notes: honest text for each tool
  if (rules) rules.innerHTML = (t.rules || []).map((r) => `<p class="am-rule"><b>${esc(r.title)}:</b> ${esc(r.text)}</p>`).join("");
  const u = new URL(location.href); u.searchParams.set("tool", id); history.replaceState(null, "", u.pathname + u.search + u.hash);
  renderOptions(); renderExamples(); renderSide(); updateCount(); renderHelpers(); renderNotes();
  $("#sayRow").hidden = id !== "voice" || !("speechSynthesis" in globalThis);
  stopSay();
  $("#formMsg").hidden = true;
  if (focus) prompt.focus();
  onToolChange(id);
}
/* Prompt helpers (chips that add a phrase) and live notes (copying warnings, voice script tips). */
function renderHelpers() {
  const t = TOOLS[state.tool];
  $("#helpers").innerHTML = (t.helpers || []).length ? `<span class="mx-hint">Add:</span>${t.helpers.map((p) => `<button type="button" class="chip" data-phrase="${esc(p)}">${esc(p)}</button>`).join("")}` : "";
}
function renderNotes() {
  const notes = [...promptWarnings(state.tool, prompt.value), ...(state.tool === "voice" ? scriptTips(prompt.value) : [])];
  $("#promptNotes").innerHTML = notes.map((n) => `<li>${esc(n)}</li>`).join("");
  return notes;
}
$("#helpers").addEventListener("click", (e) => {
  const b = e.target.closest("[data-phrase]"); if (!b) return;
  prompt.value = addPhrase(state.tool, prompt.value, b.dataset.phrase);
  prompt.dispatchEvent(new Event("input"));
});
/* Voice: listen to the script with the device's own speech voice (honestly labelled; not AI). */
const LANG_TAG = { en: "en-GB", ur: "ur-PK", hi: "hi-IN", ar: "ar-SA", pa: "pa-IN", es: "es-ES", fr: "fr-FR" };
let sayUtter = null;
function say() {
  const synth = globalThis.speechSynthesis, text = prompt.value.trim();
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") { toast("This browser has no speech voice."); return false; }
  if (!text) { toast("Type the script first."); prompt.focus(); return false; }
  synth.cancel();
  const f = state.forms.voice, lang = LANG_TAG[f.language] || "en-GB";
  const u = new SpeechSynthesisUtterance(text.slice(0, 3000));
  u.lang = lang; u.rate = Number(f.speed) || 1;
  const v = (synth.getVoices?.() || []).find((x) => x.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (v) u.voice = v; else if (f.language !== "en") toast("This device has no voice for that language, so its default voice reads it.");
  u.onend = u.onerror = () => { $("#sayStop").hidden = true; sayUtter = null; };
  sayUtter = u; $("#sayStop").hidden = false;
  synth.speak(u);
  return true;
}
function stopSay() { try { globalThis.speechSynthesis?.cancel(); } catch {} sayUtter = null; const s = $("#sayStop"); if (s) s.hidden = true; }
$("#sayBtn").addEventListener("click", say);
$("#sayStop").addEventListener("click", stopSay);
function renderOptions() {
  const t = TOOLS[state.tool], form = state.forms[state.tool];
  $("#options").innerHTML = Object.entries(t.options).map(([key, o]) => `
    <div class="mx-field" role="group" aria-labelledby="opt-${key}"><span id="opt-${key}">${esc(o.label)}</span>
      <div class="mx-seg">${o.choices.map((c) => `<button type="button" data-key="${key}" data-value="${esc(c.value)}" aria-pressed="${String(c.value) === String(form[key])}">${esc(c.label)}</button>`).join("")}</div>
    </div>`).join("") + (t.extras || []).map((x) => x.type === "text"
    ? `<label class="mx-field am-extra"><span>${esc(x.label)}</span><input class="ad-input" type="text" data-extra="${x.key}" maxlength="${x.max || 120}" placeholder="${esc(x.placeholder || "")}" value="${esc(form[x.key] || "")}"></label>`
    : `<div class="mx-field am-extra"><span>${esc(x.label)}</span><div class="am-ref"><label class="btn sm" for="amRef">${form[x.key] ? "Change picture" : "Choose a picture"}</label><input type="file" id="amRef" data-extra="${x.key}" accept="image/*" hidden>${form[x.key] ? `<img class="am-refimg" alt="Reference picture" src="${esc(form[x.key].dataUrl)}"><button type="button" class="btn sm" data-unref="${x.key}">Remove</button>` : ""}</div><small class="mx-hint">${esc(x.hint || "")}</small></div>`).join("");
}
$("#options").addEventListener("input", (e) => {
  const k = e.target.dataset?.extra; if (!k || e.target.type !== "text") return;
  state.forms[state.tool][k] = e.target.value;
});
$("#options").addEventListener("change", (e) => {
  const k = e.target.dataset?.extra; if (!k || e.target.type !== "file") return;
  const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
  if (f.size > 8 * 1048576) { toast("Please pick a picture under 8 MB."); return; }
  const r = new FileReader();
  r.onload = () => { state.forms[state.tool][k] = { name: f.name, dataUrl: String(r.result) }; renderOptions(); };
  r.readAsDataURL(f);
});
$("#options").addEventListener("click", (e) => {
  const u = e.target.closest("[data-unref]"); if (!u) return;
  delete state.forms[state.tool][u.dataset.unref]; renderOptions();
});
$("#options").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-key]"); if (!b) return;
  const key = b.dataset.key, t = TOOLS[state.tool];
  const choice = t.options[key].choices.find((c) => String(c.value) === b.dataset.value);
  state.forms[state.tool][key] = choice.value;
  for (const x of $$(`button[data-key="${key}"]`, $("#options"))) x.setAttribute("aria-pressed", String(x === b));
  syncPill();
});
function updateCount() {
  const t = TOOLS[state.tool], n = prompt.value.trim().length;
  $("#count").textContent = n;
  $("#countLine").classList.toggle("over", n > t.max);
}
prompt.addEventListener("input", () => { state.forms[state.tool][TOOLS[state.tool].field] = prompt.value; updateCount(); renderNotes(); $("#formMsg").hidden = true; });
prompt.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); generate(); } });

function renderSide() {
  const t = TOOLS[state.tool], soon = $("#soon"), result = $("#result");
  if (!state.ready) {
    comingSoon(soon, t.soon);
    soon.insertAdjacentHTML("beforeend", `<p class="am-links-title">Works today, free and offline-friendly:</p><ul class="am-links">${OFFLINE_LINKS.map((l) =>
      `<li><a href="${esc(l.href)}"><b>${esc(l.label)}</b><span>${esc(l.note)}</span></a></li>`).join("")}</ul>`);
    result.innerHTML = "";
    genBtn.disabled = true; genBtn.textContent = "Generate (coming soon)";
    genBtn.setAttribute("aria-describedby", "soon");
    $("#formHint").textContent = "You can try the options now. Generating will work as soon as AsaanDesk AI is switched on.";
    return;
  }
  soon.innerHTML = "";
  genBtn.disabled = state.busy; genBtn.textContent = state.busy ? "Creating…" : `Generate ${noun(t)}`;
  genBtn.removeAttribute("aria-describedby");
  $("#formHint").textContent = "Your text is sent to AsaanDesk AI only when you press Generate.";
  if (state.busy || state.error) return;
  if (state.result?.tool === state.tool) { if (!result.querySelector(".mx-result")) showResult(); return; }
  result.innerHTML = `<div class="am-empty"><div><b>Your ${t.id === "music" ? "track" : noun(t)} will appear here</b>Write a prompt, pick the options and press Generate.</div></div>`;
}
function renderExamples() {
  const t = TOOLS[state.tool];
  $("#examples").innerHTML = t.examples.map((ex, i) => {
    const tags = Object.keys(t.options).map((k) => t.options[k].choices.find((c) => String(c.value) === String(ex[k]))?.label).filter(Boolean);
    return `<button type="button" class="am-card" data-ex="${i}" aria-label="Use example: ${esc(ex.title)}"><b>${esc(ex.title)}</b><span class="p" dir="auto">${esc(ex.prompt)}</span><span class="tags">${tags.map((x) => `<span>${esc(x)}</span>`).join("")}</span></button>`;
  }).join("");
}
function fillExample(i) {
  const t = TOOLS[state.tool], ex = t.examples[i]; if (!ex) return;
  const form = state.forms[state.tool];
  form[t.field] = ex.prompt;
  for (const k of Object.keys(t.options)) if (ex[k] != null) form[k] = ex[k];
  prompt.value = ex.prompt; renderOptions(); updateCount(); syncPill();
  $("#formMsg").hidden = true;
  prompt.scrollIntoView({ behavior: "smooth", block: "center" });
  prompt.focus({ preventScroll: true });
  toast(`Example "${ex.title}" added. Change it to fit your idea.`);
}
$("#examples").addEventListener("click", (e) => { const c = e.target.closest(".am-card"); if (c) fillExample(Number(c.dataset.ex)); });

function showError(msg) {
  state.error = msg;
  $("#result").innerHTML = '<p class="mx-msg err" role="alert"></p>';
  $("#result").firstChild.textContent = msg;
}
async function generate() {
  if (!state.ready || state.busy) return;
  const id = state.tool, t = TOOLS[id], form = { ...state.forms[id], [t.field]: prompt.value };
  const errs = validate(id, form);
  if (errs.length) { const m = $("#formMsg"); m.textContent = errs[0]; m.hidden = false; prompt.focus(); return; }
  const req = buildRequest(id, form);
  state.busy = true; state.error = ""; state.lastRequest = req;
  if (state.result?.blobUrl) URL.revokeObjectURL(state.result.blobUrl);
  state.result = null;
  renderSide();
  $("#result").innerHTML = `<div class="am-working"><div class="mx-bar busy" aria-label="Working"><i></i></div><p>AsaanDesk AI is making your ${t.kind === "video" ? "video" : "audio"}. This can take a minute.</p></div>`;
  try {
    const data = await onlineAi(req.path, req.body, req.feature);
    if (state.tool !== id) return;
    const media = resultMedia(data, t.kind);
    const blobUrl = media.bytes ? URL.createObjectURL(new Blob([media.bytes], { type: media.mime })) : "";
    state.result = { tool: id, src: blobUrl || media.url, blobUrl, mime: media.mime, name: fileNameFor(id, req.body.prompt || req.body.text, media.mime) };
    showResult();
    await saveCreation(state.result, req, media).catch((err) => console.warn("Not kept in Your creations", err));
  } catch (e) {
    showError(/failed to fetch|networkerror|load failed/i.test(e.message) ? "Couldn't reach AsaanDesk AI. Check your connection and try again." : e.message || "Something went wrong. Please try again.");
  } finally {
    state.busy = false; renderSide();
  }
}
function showResult() {
  const r = state.result, t = TOOLS[r.tool], isVideo = t.kind === "video";
  $("#result").innerHTML = `<div class="mx-result">${isVideo ? '<video controls playsinline preload="metadata"></video>' : '<audio controls preload="metadata"></audio>'}
    <div class="mx-row"><button type="button" class="btn primary" id="dlBtn">Download ${esc(extForMime(r.mime, t.kind).toUpperCase())}</button>
    <button type="button" class="btn" id="toEditor">Open in video editor</button><span class="mx-meta">Made by AsaanDesk AI</span></div></div>`;
  $("#result").querySelector(isVideo ? "video" : "audio").src = r.src;
  $("#dlBtn").addEventListener("click", async () => {
    try { downloadBlob(await (await fetch(r.src)).blob(), r.name); } catch { window.open(r.src, "_blank", "noopener"); }
  });
  $("#toEditor").addEventListener("click", async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try {
      const blob = await (await fetch(r.src)).blob();
      const hid = await putHandoff({ type: isVideo ? "video-media" : "audio-media", blob, name: r.name });
      location.href = "/design/video/?handoff=" + encodeURIComponent(hid);
    } catch { b.disabled = false; toast("Couldn't open this file in the video editor. Download it instead."); }
  });
}
$("#genForm").addEventListener("submit", (e) => { e.preventDefault(); generate(); });

/* Your creations (Canva keeps generated clips automatically): every real result is kept in this browser. */
const CAPP = "ai-media-result", curls = new Map();
async function saveCreation(r, req, media) {
  let blob = null;
  if (media.bytes) blob = new Blob([media.bytes], { type: media.mime });
  else { try { blob = await (await fetch(r.src)).blob(); } catch { /* keep the link only */ } }
  await saveProject({ app: CAPP, name: String(req.body.prompt || req.body.text || TOOLS[r.tool].title).slice(0, 80), data: { tool: r.tool, mime: r.mime, name: r.name, blob, url: blob ? "" : r.src, body: { ...req.body, reference: undefined }, created: Date.now() } });
  await renderCreations();
}
async function renderCreations() {
  const list = (await listProjects(CAPP).catch(() => [])).filter((p) => TOOLS[p.data?.tool]);
  $("#creationsWrap").hidden = !list.length;
  const ul = $("#creations");
  ul.replaceChildren();
  for (const p of list) {
    const t = TOOLS[p.data.tool], isVideo = t.kind === "video";
    if (!curls.has(p.id)) curls.set(p.id, p.data.blob ? URL.createObjectURL(p.data.blob) : p.data.url);
    const li = document.createElement("li");
    li.className = "am-citem"; li.dataset.id = p.id;
    li.innerHTML = `<b>${esc(p.name)}</b><small>${esc(t.title)} · ${esc(new Date(p.data.created || p.updated || Date.now()).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }))}</small>${isVideo ? '<video controls playsinline preload="metadata"></video>' : '<audio controls preload="metadata"></audio>'}<span class="mx-row"><button type="button" class="btn sm" data-cact="dl">Download</button><button type="button" class="btn sm" data-cact="edit">Open in video editor</button><button type="button" class="btn sm" data-cact="prompt">Use prompt</button><button type="button" class="btn sm" data-cact="del">Delete</button></span>`;
    li.querySelector(isVideo ? "video" : "audio").src = curls.get(p.id) || "";
    ul.append(li);
  }
  return list.length;
}
$("#creations").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cact]"), li = e.target.closest(".am-citem");
  if (!b || !li) return;
  const p = (await listProjects(CAPP)).find((x) => x.id === li.dataset.id);
  if (!p) return;
  const blob = async () => p.data.blob || (await (await fetch(p.data.url)).blob());
  if (b.dataset.cact === "dl") { try { downloadBlob(await blob(), p.data.name || fileNameFor(p.data.tool, p.name, p.data.mime)); } catch { toast("Couldn't download this file."); } }
  else if (b.dataset.cact === "edit") {
    try { const hid = await putHandoff({ type: TOOLS[p.data.tool].kind === "video" ? "video-media" : "audio-media", blob: await blob(), name: p.data.name }); location.href = "/design/video/?handoff=" + encodeURIComponent(hid); }
    catch { toast("Couldn't open this file in the video editor. Download it instead."); }
  } else if (b.dataset.cact === "prompt") {
    const t = TOOLS[p.data.tool], body = p.data.body || {};
    setTool(p.data.tool);
    const form = state.forms[p.data.tool];
    form[t.field] = body.prompt || body.text || "";
    for (const k of Object.keys(t.options)) if (body[k] != null && t.options[k].choices.some((c) => String(c.value) === String(body[k]))) form[k] = body[k];
    prompt.value = form[t.field]; renderOptions(); updateCount(); renderNotes(); syncPill();
    prompt.focus();
  } else if (b.dataset.cact === "del") {
    await deleteProject(p.id); URL.revokeObjectURL(curls.get(p.id) || ""); curls.delete(p.id); await renderCreations();
  }
});

// Tabs: click + arrow keys (roving focus).
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("[role=tab]"); if (b && b.dataset.tool !== state.tool) setTool(b.dataset.tool); });
$("#tabs").addEventListener("keydown", (e) => {
  const i = TOOL_IDS.indexOf(state.tool);
  const next = e.key === "ArrowRight" ? TOOL_IDS[(i + 1) % TOOL_IDS.length] : e.key === "ArrowLeft" ? TOOL_IDS[(i + TOOL_IDS.length - 1) % TOOL_IDS.length] : e.key === "Home" ? TOOL_IDS[0] : e.key === "End" ? TOOL_IDS[TOOL_IDS.length - 1] : null;
  if (!next) return;
  e.preventDefault(); setTool(next); $("#tab-" + next).focus();
});

// ---------- editor frame (shared full-screen shell): prompt ideas, AI tools, honest AI status, projects ----------
const qs = new URLSearchParams(location.search);
const KIND = { video: "AI video", music: "AI music", voice: "AI voice", sfx: "AI sound effects" };
const SLUGS = { video: "ai-video-generator", music: "ai-music-generator", voice: "ai-voice-generator", sfx: "ai-music-generator" };
const GSLUG = { ...SLUGS, sfx: "" }; // prompt ideas in the Templates panel (sound effects use their own examples)
let shell = null, gallery = null, pillEl = null, userTitle = "";
// The Templates panel asks for ideas page by page (shell paged-gallery API), always for the tool that is open now.
const hayOf = (t) => (t._hay ||= [t.name, t.section, t.themeName, t.prompt, ...(t.tags || [])].join(" ").toLowerCase());
const galleryView = {
  get TEMPLATES() { return gallery && GSLUG[state.tool] ? gallery.TEMPLATES.filter((t) => t.tool === GSLUG[state.tool]) : []; },
  get TOTAL() { return galleryView.TEMPLATES.length; },
  get FILTERS() { return gallery ? [{ key: "theme", label: "Theme", options: gallery.THEME_OPTIONS }] : []; },
  page(_tool, { q = "", offset = 0, limit = 40, filters = {} } = {}) {
    const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    const list = galleryView.TEMPLATES.filter((t) => Object.entries(filters).every(([k, v]) => String(t[k]) === String(v)) && words.every((w) => hayOf(t).includes(w)));
    return { items: list.slice(offset, offset + limit), total: list.length };
  },
  meta: (id) => gallery?.byId(id) || null,
  thumb: (id) => gallery?.thumb(id) || "",
};
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function syncPill() {
  if (!pillEl) return;
  const t = TOOLS[state.tool], form = state.forms[state.tool], box = pillEl.querySelector(".am-pselects");
  box.replaceChildren();
  for (const [key, o] of Object.entries(t.options)) {
    const lab = el("label", "am-pf"), sel = el("select", "ad-input");
    sel.dataset.pkey = key; sel.setAttribute("aria-label", o.label); sel.title = o.label;
    for (const c of o.choices) sel.append(new Option(c.label, String(c.value)));
    sel.value = String(form[key]);
    sel.addEventListener("change", () => { const ch = o.choices.find((c) => String(c.value) === sel.value); if (ch) { state.forms[state.tool][key] = ch.value; renderOptions(); } });
    lab.append(el("span", "", o.label), sel); box.append(lab);
  }
  pillEl.querySelector("#pillTool").value = state.tool;
  const gb = pillEl.querySelector("#pillGen");
  gb.textContent = state.ready ? (state.busy ? "Creating…" : "Generate") : "Generate (coming soon)";
  gb.disabled = !!(state.ready && state.busy);
}
function pillGenerate() {
  if (!state.ready) {
    const soon = $("#soon");
    soon.scrollIntoView({ behavior: "smooth", block: "center" });
    soon.classList.add("am-flash"); setTimeout(() => soon.classList.remove("am-flash"), 1400);
    shell?.toast(`${TOOLS[state.tool].title} is coming soon. Your prompt is kept here; nothing was sent.`, 4000);
    return;
  }
  const p = generate(); syncPill(); Promise.resolve(p).finally(syncPill);
}
function buildPill() {
  const pill = el("div", "am-pill"); pill.id = "amPill";
  const tool = el("select", "ad-input am-ptool"); tool.id = "pillTool"; tool.setAttribute("aria-label", "AI tool");
  for (const id of TOOL_IDS) tool.append(new Option(TOOLS[id].title, id));
  tool.addEventListener("change", () => setTool(tool.value));
  const idea = el("button", "btn am-pbtn", "Surprise me"); idea.type = "button"; idea.id = "pillIdea"; idea.title = "Fill the prompt with a random idea";
  idea.addEventListener("click", () => { const list = galleryView.TEMPLATES; if (!list.length) { fillExample(Math.floor(Math.random() * TOOLS[state.tool].examples.length)); return; } const t = list[Math.floor(Math.random() * list.length)]; applyTemplate(t.id); });
  const gen = el("button", "btn primary am-pbtn"); gen.type = "button"; gen.id = "pillGen";
  gen.addEventListener("click", pillGenerate);
  pill.append(tool, el("span", "am-psep"), el("span", "am-pselects"), el("span", "am-psep"), idea, gen);
  return pill;
}
async function applyTemplate(id) {
  if (!gallery) gallery = await import("./gallery.js");
  const t = gallery.byId(id);
  if (!t) { toast("That idea was not found."); return null; }
  if (state.tool !== t.kind) setTool(t.kind);
  const T = TOOLS[t.kind], form = state.forms[t.kind];
  form[T.field] = t.prompt; Object.assign(form, t.options);
  prompt.value = t.prompt; renderOptions(); updateCount(); syncPill();
  $("#formMsg").hidden = true;
  shell?.toast(state.ready ? `"${t.name}" is in the prompt. Change it, then press Generate.` : `"${t.name}" is in the prompt. Generating is coming soon.`);
  return t;
}
function onToolChange(id) {
  syncPill();
  if (!shell) return;
  if (!userTitle) shell.setTitle(TOOLS[id].title);
  const home = shell.slots?.top?.querySelector("a.ads-tb"); if (home) home.href = "/tools/" + SLUGS[id];
  // Show the ideas of the tool that is open now: the panel redraws on a search input event.
  shell.panel("templates")?.querySelector(".ads-search-in")?.dispatchEvent(new Event("input"));
}
function renderTools(b) {
  b.replaceChildren(el("p", "am-pnote", "Pick what you want to make. Your prompt for each tool is kept while you switch."));
  for (const id of TOOL_IDS) {
    const t = TOOLS[id], c = el("button", "am-tool" + (id === state.tool ? " on" : "")); c.type = "button"; c.dataset.tool = id;
    c.setAttribute("aria-pressed", String(id === state.tool));
    c.append(el("b", "", t.title), el("small", "", t.lead));
    c.addEventListener("click", () => { setTool(id); renderTools(b); });
    b.append(c);
  }
}
function renderStatus(b) {
  const t = TOOLS[state.tool];
  b.replaceChildren();
  const badge = el("span", "am-sbadge " + (state.ready ? "on" : "soon"), state.ready ? "AsaanDesk AI is on" : "Coming soon");
  b.append(badge, el("h3", "am-ph3", t.soon.title.replace(" is coming soon", "")));
  b.append(el("p", "am-pnote", state.ready ? "Your prompt is sent to AsaanDesk AI only when you press Generate. Only real results from the AI are shown." : t.soon.what));
  if (!state.ready) b.append(el("p", "am-pnote", "Until then, nothing is generated and nothing is sent. You can write prompts, try the options and save them to Projects."));
  b.append(el("h3", "am-ph3", "Works today"));
  const ul = el("ul", "am-links");
  for (const l of OFFLINE_LINKS) { const li = el("li"), a = el("a"); a.href = l.href; a.append(el("b", "", l.label), el("span", "", l.note)); li.append(a); ul.append(li); }
  b.append(ul);
}
function promptTxt() {
  const t = TOOLS[state.tool], form = { ...state.forms[state.tool], [t.field]: prompt.value };
  const opts = Object.entries(t.options).map(([k, o]) => `${o.label}: ${o.choices.find((c) => String(c.value) === String(form[k]))?.label ?? form[k]}`).join("\n");
  return `${t.title}\n\n${prompt.value.trim()}\n\n${opts}\n`;
}
function downloadPrompt() {
  if (!prompt.value.trim()) { toast("Write a prompt first."); return; }
  downloadBlob(new Blob([promptTxt()], { type: "text/plain;charset=utf-8" }), fileNameFor(state.tool, prompt.value, "text/plain").replace(/\.[^.]+$/, "") + "-prompt.txt");
}
function downloadResult() {
  if (state.result?.tool === state.tool && $("#dlBtn")) { $("#dlBtn").click(); return; }
  toast(state.ready ? "Generate something first." : `${TOOLS[state.tool].title} is coming soon, so there is no result to download yet.`, 4000);
}
const projThumb = () => { const t = gallery?.TEMPLATES.find((x) => x.prompt === prompt.value); return t ? gallery.thumb(t.id) : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="14" fill="#5b4cf0"/><text x="20" y="100" font-family="system-ui,Arial" font-size="20" font-weight="700" fill="#fff">${esc(TOOLS[state.tool].title)}</text><text x="20" y="128" font-family="system-ui,Arial" font-size="12" fill="#fff" opacity=".85">${esc(prompt.value.trim().slice(0, 40))}</text></svg>`; };
async function mountAiShell() {
  let mod;
  try { mod = await import("../shared/editor-shell.js"); } catch (e) { console.warn("Editor frame not available", e); return null; }
  try { gallery = await import("./gallery.js"); } catch (e) { console.warn(e); }
  pillEl = buildPill();
  shell = mod.mountShell({
    app: "ai-media", kind: KIND[state.tool], title: TOOLS[state.tool].title, home: "/tools/" + SLUGS[state.tool],
    onTitle: (t) => { userTitle = t; },
    stage: document.querySelector("main.am"), toolbar: pillEl, formulaBar: null, resize: null,
    file: [
      { label: "New prompt", act: () => { prompt.value = ""; state.forms[state.tool][TOOLS[state.tool].field] = ""; updateCount(); prompt.focus(); shell?.setProjectId(null); } },
      ...TOOL_IDS.map((id) => ({ label: TOOLS[id].title, group: "Switch tool", act: () => setTool(id, { focus: true }) })),
      { label: "Copy prompt", group: "Edit", act: async () => { try { await navigator.clipboard.writeText(prompt.value); toast("Prompt copied."); } catch { toast("Could not copy. Select the text instead."); } } },
      { label: "Prompt (.txt)", group: "Download", act: downloadPrompt },
      { label: "Your result", group: "Download", act: downloadResult },
    ],
    share: { download: [{ label: "Prompt (.txt)", act: downloadPrompt }, { label: "Your result", act: downloadResult }], link: () => location.origin + "/design/ai-media/?tool=" + state.tool },
    templates: gallery ? { gallery: galleryView, apply: (id) => applyTemplate(id), placeholder: "Search prompt ideas" } : null,
    panels: {
      aitools: { label: "AI tools", icon: "elements", render: (b) => renderTools(b), refresh: true },
      status: { label: "AI status", icon: "insights", render: (b) => renderStatus(b), refresh: true },
    },
    rail: ["templates", "aitools", "status", "projects", "apps", "translate"],
    getText: () => prompt.value,
    setText: (str) => { prompt.value = String(str || ""); prompt.dispatchEvent(new Event("input")); },
    projects: {
      save: async () => ({ name: userTitle || TOOLS[state.tool].title, data: { tool: state.tool, form: { ...state.forms[state.tool], [TOOLS[state.tool].field]: prompt.value } }, thumb: projThumb() }),
      open: async (r) => {
        const d = r?.data || {}; if (!TOOLS[d.tool]) throw new Error("This project can't be opened here.");
        setTool(d.tool); Object.assign(state.forms[d.tool], d.form || {});
        prompt.value = state.forms[d.tool][TOOLS[d.tool].field] || ""; renderOptions(); updateCount(); syncPill();
        userTitle = r.name || ""; if (userTitle) shell.setTitle(userTitle);
      },
    },
    bottom: { notes: true, outline: null, timer: true, fullscreen: true, help: true, pages: null },
    shortcuts: [["Ctrl + Enter", "Generate (when AsaanDesk AI is on)"]],
    setMode: (m) => { prompt.readOnly = m !== "edit"; },
  });
  document.body.classList.add("has-shell");
  const note = el("p", "am-pnote am-tnote", state.ready ? "Prompt ideas: click one to fill the prompt and options, then press Generate." : "Prompt ideas: click one to fill the prompt and options. Generating is coming soon; nothing is sent.");
  shell.panel("templates")?.prepend(note);
  syncPill();
  return shell;
}

setTool(state.tool);
if (qs.get("new") === "1") { prompt.value = ""; updateCount(); }
// ?prompt=… (the intro page's example chips): fills the prompt box, kept to the tool's length limit
const qp = (qs.get("prompt") || "").trim();
if (qp) {
  const t = TOOLS[state.tool], v = qp.slice(0, t.max);
  prompt.value = v; state.forms[state.tool][t.field] = v; updateCount();
}
const shellReady = mountAiShell().then(async (s) => {
  const tid = qs.get("template");
  if (tid) { const t = await applyTemplate(tid).catch(() => null); if (t) s?.pushRecent(tid); }
  return s;
});
renderCreations().catch(() => {});
window.adApp = { state, setTool, fillExample, generate, tools: TOOLS, applyTemplate, shellReady, get shell() { return shell; },
  // Round 3 (Canva AI audio / video clip parity): sound effects, prompt helpers + notes, device voice, Your creations.
  notes: () => renderNotes(), say, stopSay, creations: () => listProjects(CAPP), renderCreations,
  addPhrase: (phrase) => { prompt.value = addPhrase(state.tool, prompt.value, phrase); prompt.dispatchEvent(new Event("input")); return prompt.value; } };
