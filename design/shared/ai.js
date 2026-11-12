// AI for the design apps. Text tasks use Chrome's built-in on-device AI when the browser has it; everything
// else (images, music, voice, video, code, data insights) uses AsaanDesk's online AI only when AI_READY is on.
// When neither is available the app shows an honest "coming soon" state: never a fake result.
import { API, aiReady } from "./config.js";

const g = globalThis;
/** Resolves like p, or rejects with an honest timeout error after ms (some browsers expose AI objects that never answer). */
export function within(p, ms, message = "The on-device AI did not answer in time. Nothing was sent anywhere.") {
  let t = 0;
  return Promise.race([Promise.resolve(p), new Promise((_, rej) => { t = setTimeout(() => { const e = new Error(message); e.code = "AI_TIMEOUT"; rej(e); }, ms); })]).finally(() => clearTimeout(t));
}
// Only a model that is already on this device counts as ready: "downloadable" / "downloading" ("after-download" in older
// Chrome) would start or wait for a large download, so those count as not ready (the app shows its honest message).
async function ready(api, opts) {
  if (!api?.availability) return false;
  try { const a = await within(api.availability(opts), 4000); return a === "available" || a === "readily"; } catch { return false; }
}
/** What can run here: { writer, rewriter, proofreader, translator, model, online, anyText }. Checks run in parallel (max ~4 s). */
// The on-device checks are remembered for a minute (per set of browser APIs), so a design with many text boxes does not
// wait up to 4 s per box when a browser never answers its availability check.
let statusCache = null;
export async function aiStatus() {
  const apis = [g.Writer, g.Rewriter, g.Proofreader, g.Translator, g.LanguageModel];
  if (statusCache && Date.now() - statusCache.at < 60000 && statusCache.apis.every((a, i) => a === apis[i])) {
    const s = { ...statusCache.value, online: aiReady() };
    s.anyText = s.writer || s.rewriter || s.proofreader || s.translator || s.model || s.online;
    return s;
  }
  const value = await deviceStatus();
  statusCache = { at: Date.now(), apis, value };
  const s = { ...value, online: aiReady() };
  s.anyText = s.writer || s.rewriter || s.proofreader || s.translator || s.model || s.online;
  return s;
}
async function deviceStatus() {
  const [writer, rewriter, proofreader, translator, model] = await Promise.all([ready(g.Writer), ready(g.Rewriter), ready(g.Proofreader), ready(g.Translator, { sourceLanguage: "en", targetLanguage: "ur" }), ready(g.LanguageModel)]);
  const s = { writer, rewriter, proofreader, translator, model, online: aiReady() };
  s.anyText = s.writer || s.rewriter || s.proofreader || s.translator || s.model || s.online;
  return s;
}
export class AiUnavailable extends Error { constructor(feature) { super(`${feature} needs AsaanDesk AI, which is coming soon. Nothing was sent anywhere.`); this.code = "AI_UNAVAILABLE"; } }

/** Calls the online AI (only when AI_READY): POST {API}{path} with JSON, returns the JSON "data". */
export async function onlineAi(path, body, feature = "This feature") {
  if (!aiReady()) throw new AiUnavailable(feature);
  const res = await fetch(API + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || "AsaanDesk AI did not answer. Please try again in a moment.");
  return json?.data;
}

/** Text tasks (write | rewrite | shorten | grammar | translate): on-device first, then online, else AiUnavailable. */
export async function aiText(task, text, { style = "as-is", target = "en", context = "", onStatus } = {}) {
  text = String(text || "").trim();
  if (!text) throw new Error(task === "write" ? "Describe what to write first." : "There is no text to work on.");
  const s = await aiStatus();
  const clean = (t) => String(t || "").replace(/^["“]|["”]$/g, "").trim();
  const RUN = 60000; // an on-device run that takes longer than a minute is reported honestly instead of waiting forever
  const session = async (system) => { const m = await within(g.LanguageModel.create({ initialPrompts: [{ role: "system", content: system + " Reply with the resulting text only." }] }), RUN); try { return clean(await within(m.prompt(text), RUN)); } finally { m.destroy?.(); } };
  onStatus?.("Working on this device…");
  if (task === "write" && s.writer) { const w = await within(g.Writer.create({ format: "plain-text", length: "short" }), RUN); try { return clean(await within(w.write(text, context ? { context } : undefined), RUN)); } finally { w.destroy?.(); } }
  if ((task === "rewrite" || task === "shorten") && s.rewriter) { const r = await within(g.Rewriter.create({ tone: { formal: "more-formal", casual: "more-casual" }[style] || "as-is", length: task === "shorten" ? "shorter" : "as-is", format: "plain-text" }), RUN); try { return clean(await within(r.rewrite(text), RUN)); } finally { r.destroy?.(); } }
  if (task === "grammar" && s.proofreader) { const p = await within(g.Proofreader.create({ expectedInputLanguages: ["en"] }), RUN); try { const r = await within(p.proofread(text), RUN); return clean(r?.correctedInput ?? text); } finally { p.destroy?.(); } }
  if (task === "translate" && s.translator) {
    let source = "en";
    try { if (await ready(g.LanguageDetector)) { const [top] = await within((await within(g.LanguageDetector.create(), 8000)).detect(text), 8000); if (top?.confidence > 0.5) source = top.detectedLanguage; } } catch {}
    if (source === target) return text;
    const t = await within(g.Translator.create({ sourceLanguage: source, targetLanguage: target }), RUN); try { return clean(await within(t.translate(text), RUN)); } finally { t.destroy?.(); }
  }
  if (s.model) return session({ write: "Write short, clear text as asked.", rewrite: `Rewrite the text ${style === "formal" ? "more formally" : style === "casual" ? "more casually" : "more clearly"}, same meaning and language.`, shorten: "Make the text about half as long, keep key facts.", grammar: "Fix spelling and grammar only.", translate: `Translate the text into the language with code ${target}.` }[task] || "Help with the text.");
  if (s.online) return clean((await onlineAi("/ai", { task, text, target: task === "translate" ? target : "auto", style, context }, "AI writing"))?.text);
  throw new AiUnavailable("AI writing");
}

/** A friendly "coming soon" panel for AI-only features (no fake output). */
export function comingSoon(el, { title, what, offline = "" }) {
  el.innerHTML = `<div class="ad-soon" role="status"><span class="ad-soon-badge">Coming soon</span><h3></h3><p class="what"></p>${offline ? '<p class="offline"></p>' : ""}</div>`;
  el.querySelector("h3").textContent = title;
  el.querySelector(".what").textContent = what;
  if (offline) el.querySelector(".offline").textContent = offline;
}
