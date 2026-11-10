// AI for the design apps. Text tasks use Chrome's built-in on-device AI when the browser has it; everything
// else (images, music, voice, video, code, data insights) uses AsaanDesk's online AI only when AI_READY is on.
// When neither is available the app shows an honest "coming soon" state: never a fake result.
import { API, aiReady } from "./config.js";

const g = globalThis;
async function ready(api, opts) {
  if (!api?.availability) return false;
  try { const a = await api.availability(opts); return !!a && a !== "unavailable" && a !== "no"; } catch { return false; }
}
/** What can run here: { writer, rewriter, proofreader, translator, model, online, anyText }. */
export async function aiStatus() {
  const s = { writer: await ready(g.Writer), rewriter: await ready(g.Rewriter), proofreader: await ready(g.Proofreader),
    translator: await ready(g.Translator, { sourceLanguage: "en", targetLanguage: "ur" }), model: await ready(g.LanguageModel), online: aiReady() };
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
  const session = async (system) => { const m = await g.LanguageModel.create({ initialPrompts: [{ role: "system", content: system + " Reply with the resulting text only." }] }); try { return clean(await m.prompt(text)); } finally { m.destroy?.(); } };
  onStatus?.("Working on this device…");
  if (task === "write" && s.writer) { const w = await g.Writer.create({ format: "plain-text", length: "short" }); try { return clean(await w.write(text, context ? { context } : undefined)); } finally { w.destroy?.(); } }
  if ((task === "rewrite" || task === "shorten") && s.rewriter) { const r = await g.Rewriter.create({ tone: { formal: "more-formal", casual: "more-casual" }[style] || "as-is", length: task === "shorten" ? "shorter" : "as-is", format: "plain-text" }); try { return clean(await r.rewrite(text)); } finally { r.destroy?.(); } }
  if (task === "grammar" && s.proofreader) { const p = await g.Proofreader.create({ expectedInputLanguages: ["en"] }); try { const r = await p.proofread(text); return clean(r?.correctedInput ?? text); } finally { p.destroy?.(); } }
  if (task === "translate" && s.translator) {
    let source = "en";
    try { if (await ready(g.LanguageDetector)) { const [top] = await (await g.LanguageDetector.create()).detect(text); if (top?.confidence > 0.5) source = top.detectedLanguage; } } catch {}
    if (source === target) return text;
    const t = await g.Translator.create({ sourceLanguage: source, targetLanguage: target }); try { return clean(await t.translate(text)); } finally { t.destroy?.(); }
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
