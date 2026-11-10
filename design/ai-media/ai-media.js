// AI video, music and voice generators. They call AsaanDesk AI (the Worker) only when it is switched on
// (aiReady()); otherwise they show an honest "coming soon" panel and point to the tools that work today.
// Nothing here ever invents a result: only media returned by the AI service is shown.
import { $, $$, esc, toast, downloadBlob } from "../video/ui.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";
import { putHandoff } from "../shared/store.js";
import { TOOLS, TOOL_IDS, OFFLINE_LINKS, toolFromQuery, validate, buildRequest, resultMedia, fileNameFor, extForMime } from "./tools.js";

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
  const u = new URL(location.href); u.searchParams.set("tool", id); history.replaceState(null, "", u.pathname + u.search + u.hash);
  renderOptions(); renderExamples(); renderSide(); updateCount();
  $("#formMsg").hidden = true;
  if (focus) prompt.focus();
}
function renderOptions() {
  const t = TOOLS[state.tool], form = state.forms[state.tool];
  $("#options").innerHTML = Object.entries(t.options).map(([key, o]) => `
    <div class="mx-field" role="group" aria-labelledby="opt-${key}"><span id="opt-${key}">${esc(o.label)}</span>
      <div class="mx-seg">${o.choices.map((c) => `<button type="button" data-key="${key}" data-value="${esc(c.value)}" aria-pressed="${String(c.value) === String(form[key])}">${esc(c.label)}</button>`).join("")}</div>
    </div>`).join("");
}
$("#options").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-key]"); if (!b) return;
  const key = b.dataset.key, t = TOOLS[state.tool];
  const choice = t.options[key].choices.find((c) => String(c.value) === b.dataset.value);
  state.forms[state.tool][key] = choice.value;
  for (const x of $$(`button[data-key="${key}"]`, $("#options"))) x.setAttribute("aria-pressed", String(x === b));
});
function updateCount() {
  const t = TOOLS[state.tool], n = prompt.value.trim().length;
  $("#count").textContent = n;
  $("#countLine").classList.toggle("over", n > t.max);
}
prompt.addEventListener("input", () => { state.forms[state.tool][TOOLS[state.tool].field] = prompt.value; updateCount(); $("#formMsg").hidden = true; });
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
  genBtn.disabled = state.busy; genBtn.textContent = state.busy ? "Creating…" : `Generate ${t.kind === "video" ? "video" : t.id === "music" ? "music" : "voice"}`;
  genBtn.removeAttribute("aria-describedby");
  $("#formHint").textContent = "Your text is sent to AsaanDesk AI only when you press Generate.";
  if (state.busy || state.error) return;
  if (state.result?.tool === state.tool) { if (!result.querySelector(".mx-result")) showResult(); return; }
  result.innerHTML = `<div class="am-empty"><div><b>Your ${t.kind === "video" ? "video" : t.id === "music" ? "track" : "voice"} will appear here</b>Write a prompt, pick the options and press Generate.</div></div>`;
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
  prompt.value = ex.prompt; renderOptions(); updateCount();
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

// Tabs: click + arrow keys (roving focus).
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("[role=tab]"); if (b && b.dataset.tool !== state.tool) setTool(b.dataset.tool); });
$("#tabs").addEventListener("keydown", (e) => {
  const i = TOOL_IDS.indexOf(state.tool);
  const next = e.key === "ArrowRight" ? TOOL_IDS[(i + 1) % TOOL_IDS.length] : e.key === "ArrowLeft" ? TOOL_IDS[(i + TOOL_IDS.length - 1) % TOOL_IDS.length] : e.key === "Home" ? TOOL_IDS[0] : e.key === "End" ? TOOL_IDS[TOOL_IDS.length - 1] : null;
  if (!next) return;
  e.preventDefault(); setTool(next); $("#tab-" + next).focus();
});

setTool(state.tool);
window.adApp = { state, setTool, fillExample, generate, tools: TOOLS };
