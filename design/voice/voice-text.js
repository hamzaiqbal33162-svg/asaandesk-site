// Pure text helpers for the voiceover app (no DOM; unit tested in tests/voice.test.mjs).
// Offsets always point into the ORIGINAL script, so the reading view can highlight exactly what is spoken.

export const PAUSE_PER_BLANK_MS = 700;
const ENDERS = ".!?…।۔؟";
const SENTENCE_END = new RegExp(`[${ENDERS}]+["'”’)\\]]*(?=\\s|$)`, "g");
const SOFT_BREAKS = [",", ";", ":", "،", "—", "–"];
const TRAIL = /[.,!?;:…।۔؟،"'”’)\]]+$/;
const LEAD = /^["'“‘(\[]+/;

function pushTrimmed(out, text, a, b) {
  while (a < b && /\s/.test(text[a])) a++;
  while (b > a && /\s/.test(text[b - 1])) b--;
  if (b > a) out.push([a, b]);
}
/** Splits text[a..b) so that no piece is longer than maxChars: at a comma-like mark, else a space, else hard. */
function splitLong(text, a, b, maxChars, out) {
  while (b - a > maxChars) {
    const slice = text.slice(a, a + maxChars + 1);
    let cut = -1;
    for (const m of SOFT_BREAKS) { const i = slice.lastIndexOf(m, maxChars - 1); if (i > cut) cut = i; }
    if (cut >= Math.floor(maxChars * 0.35)) cut += 1;
    else { const sp = slice.lastIndexOf(" ", maxChars); cut = sp > 0 ? sp : maxChars; }
    pushTrimmed(out, text, a, a + cut);
    a += cut;
    while (a < b && /\s/.test(text[a])) a++;
  }
  pushTrimmed(out, text, a, b);
}
function sentencesOfLine(text, a, b, maxChars) {
  const line = text.slice(a, b), out = [];
  let last = 0;
  SENTENCE_END.lastIndex = 0;
  for (const m of line.matchAll(SENTENCE_END)) {
    const end = m.index + m[0].length;
    const parts = []; pushTrimmed(parts, text, a + last, a + end);
    for (const [s, e] of parts) splitLong(text, s, e, maxChars, out);
    last = end;
  }
  const parts = []; pushTrimmed(parts, text, a + last, b);
  for (const [s, e] of parts) splitLong(text, s, e, maxChars, out);
  return out;
}

/**
 * Script -> spoken chunks: one per sentence (and per line), long sentences split at commas/spaces.
 * Each blank line adds PAUSE_PER_BLANK_MS of silence after the chunk before it.
 * Returns [{ text, start, end, pauseAfterMs }] with text === script.slice(start, end).
 */
export function splitScript(script, { maxChars = 200, pauseMs = PAUSE_PER_BLANK_MS } = {}) {
  const text = String(script ?? ""), chunks = [];
  maxChars = Math.max(20, maxChars | 0);
  let i = 0;
  for (;;) {
    let j = text.indexOf("\n", i); if (j < 0) j = text.length;
    if (text.slice(i, j).trim() === "") { if (chunks.length) chunks[chunks.length - 1].pauseAfterMs += pauseMs; }
    else for (const [s, e] of sentencesOfLine(text, i, j, maxChars)) chunks.push({ text: text.slice(s, e), start: s, end: e, pauseAfterMs: 0 });
    if (j >= text.length) break;
    i = j + 1;
  }
  if (chunks.length) chunks[chunks.length - 1].pauseAfterMs = 0;
  return chunks;
}

/** The word (run of non-space characters, outer punctuation removed) around text[index]: { start, end } or null. */
export function wordAt(text, index) {
  text = String(text ?? "");
  if (index < 0 || index >= text.length || /\s/.test(text[index])) {
    // Engines sometimes point at the space before a word.
    let k = Math.max(0, index); while (k < text.length && /\s/.test(text[k])) k++;
    if (k >= text.length) return null;
    index = k;
  }
  let s = index, e = index;
  while (s > 0 && !/\s/.test(text[s - 1])) s--;
  while (e < text.length && !/\s/.test(text[e])) e++;
  const word = text.slice(s, e), lead = (LEAD.exec(word) || [""])[0].length, trail = (TRAIL.exec(word.slice(lead)) || [""])[0].length;
  if (e - trail > s + lead) return { start: s + lead, end: e - trail };
  return { start: s, end: e };
}
/** A boundary event (charIndex/charLength inside chunk.text) -> { start, end } in the original script. */
export function boundaryRange(chunk, charIndex, charLength) {
  const t = chunk.text, ci = Math.max(0, Math.min(t.length - 1, Number(charIndex) || 0));
  let r = wordAt(t, ci);
  if (Number(charLength) > 0) {
    const e = Math.min(t.length, ci + Number(charLength));
    const w = wordAt(t.slice(0, e), ci);
    r = w && w.end > w.start ? w : { start: ci, end: e };
  }
  if (!r) return null;
  return { start: chunk.start + r.start, end: chunk.start + r.end };
}
/** Index of the chunk containing script offset `pos` (or the next one after it). */
export function chunkIndexAt(chunks, pos) {
  for (let i = 0; i < chunks.length; i++) if (pos < chunks[i].end) return i;
  return Math.max(0, chunks.length - 1);
}

const LANG_NAMES = { ur: "Urdu", hi: "Hindi", en: "English", ar: "Arabic", pa: "Punjabi", bn: "Bengali", fa: "Persian", ps: "Pashto", sd: "Sindhi",
  es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese", ru: "Russian", tr: "Turkish", zh: "Chinese", ja: "Japanese", ko: "Korean",
  id: "Indonesian", ms: "Malay", nl: "Dutch", pl: "Polish", sv: "Swedish", ta: "Tamil", te: "Telugu", th: "Thai", uk: "Ukrainian", vi: "Vietnamese",
  gu: "Gujarati", mr: "Marathi", ml: "Malayalam", kn: "Kannada", ne: "Nepali", he: "Hebrew", el: "Greek", cs: "Czech", da: "Danish", fi: "Finnish",
  hu: "Hungarian", nb: "Norwegian", no: "Norwegian", ro: "Romanian", sk: "Slovak", ca: "Catalan", fil: "Filipino" };
export const FIRST_LANGS = ["ur", "hi", "en"];
export const normLang = (lang) => String(lang || "").replace(/_/g, "-").trim();
export const langCode = (lang) => normLang(lang).split("-")[0].toLowerCase() || "other";
export function languageLabel(code) {
  if (LANG_NAMES[code]) return LANG_NAMES[code];
  try { const n = new Intl.DisplayNames(["en"], { type: "language" }).of(code); if (n && n !== code) return n; } catch {}
  return code === "other" ? "Other" : code.toUpperCase();
}
/**
 * Browser voices -> [{ lang, label, voices: [voice] }]: Urdu, Hindi and English first (when present), then the rest
 * by name. Inside a group: the browser's default voice first, then on-device voices, then by region and name.
 */
export function groupVoices(voices) {
  const map = new Map();
  for (const v of voices || []) {
    if (!v || !v.name) continue;
    const code = langCode(v.lang);
    if (!map.has(code)) map.set(code, []);
    map.get(code).push(v);
  }
  const groups = [...map].map(([lang, list]) => ({ lang, label: languageLabel(lang), voices: list.sort((a, b) =>
    (b.default ? 1 : 0) - (a.default ? 1 : 0) || (b.localService ? 1 : 0) - (a.localService ? 1 : 0) ||
    normLang(a.lang).localeCompare(normLang(b.lang)) || a.name.localeCompare(b.name)) }));
  const rank = (g) => { const i = FIRST_LANGS.indexOf(g.lang); return i < 0 ? FIRST_LANGS.length : i; };
  return groups.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
}
export const voiceKey = (v) => (v ? v.voiceURI || v.name : "");
/** Voice to start with: the saved one, else the browser default, else the first English voice, else the first. */
export function pickDefaultVoice(voices, savedKey = "") {
  const list = voices || [];
  return list.find((v) => savedKey && voiceKey(v) === savedKey) || list.find((v) => v.default) || list.find((v) => langCode(v.lang) === "en") || list[0] || null;
}

const countWords = (t) => (String(t).match(/\S+/g) || []).length;
/**
 * Caption lines for the video editor: one per spoken chunk, timed like the voice will read it.
 * wordsPerMinute at rate 1; rate scales speed; blank-line pauses add silence. [{ text, start, dur }] in seconds.
 */
export function captionTimes(script, { wordsPerMinute = 150, rate = 1, gap = 0.15, minDur = 1.2, maxChars = 90 } = {}) {
  const wps = (Math.max(40, wordsPerMinute) * Math.max(0.1, rate)) / 60;
  const r2 = (x) => Math.round(x * 100) / 100;
  let t = 0;
  return splitScript(script, { maxChars }).map((c) => {
    const text = c.text.replace(/\s+/g, " ").trim();
    const dur = Math.max(minDur, countWords(text) / wps);
    const line = { text, start: r2(t), dur: r2(dur) };
    t += dur + gap + c.pauseAfterMs / 1000;
    return line;
  });
}
/** Total spoken length (seconds) for the stats line. */
export function estimateSeconds(script, opts) {
  const l = captionTimes(script, opts);
  return l.length ? l[l.length - 1].start + l[l.length - 1].dur : 0;
}
export const wordCount = countWords;

/** "voiceover-welcome-to-our-store.txt" (falls back to "voiceover-script.txt" for non-Latin text). */
export function scriptFileName(script) {
  const slug = String(script || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 5).join("-").slice(0, 40).replace(/-+$/, "");
  return `voiceover-${slug || "script"}.txt`;
}
/** File extension for a recorded audio MIME type. */
export function extForMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4") || m.includes("aac") || m.includes("m4a")) return "m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  return "webm";
}
/** "voiceover-2026-11-10-0935.wav" */
export function recordingName(date = new Date(), ext = "wav") {
  const p = (n) => String(n).padStart(2, "0");
  return `voiceover-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}.${ext}`;
}

// ---------- Design › Styles: reading styles (speed and pitch of the voice; the browser voice itself is picked in Voices) ----------
export const READING_STYLES = [
  { id: "calm", label: "Calm narrator", hint: "Unhurried, a little lower", rate: 0.9, pitch: 0.9 },
  { id: "friendly", label: "Friendly guide", hint: "Warm and a little brighter", rate: 1, pitch: 1.1 },
  { id: "ad", label: "Energetic ad", hint: "Quick and upbeat", rate: 1.2, pitch: 1.2 },
  { id: "news", label: "News reader", hint: "Steady and clear", rate: 1.1, pitch: 1 },
  { id: "story", label: "Storyteller", hint: "Slower, with feeling", rate: 0.9, pitch: 1.1 },
  { id: "clear", label: "Slow and clear", hint: "For lessons and learners", rate: 0.8, pitch: 1 },
  { id: "kids", label: "Kids' story", hint: "Bright and playful", rate: 1, pitch: 1.4 },
  { id: "deep", label: "Deep voice", hint: "Low and serious", rate: 0.9, pitch: 0.7 },
];

// ---------- left-rail kit text (shared/panels: Text panel, font combinations) ----------
export const KIT_TEXT = { heading: "Add a heading", subheading: "Add a subheading", body: "Add a little bit of body text", caption: "Add a caption" };
/** The words of a kit text spec (or a plain string): its content, else the role's default, upper case when asked. */
export function kitWords(s) {
  if (typeof s === "string") return s.trim();
  const t = String(s?.content ?? "").trim() || KIT_TEXT[s?.role] || KIT_TEXT.body;
  return s?.uppercase ? t.toUpperCase() : t;
}
/**
 * What to type at the cursor for kit text: the lines on lines of their own when it is a heading, a subheading or a
 * group (a blank line before and after, like a new paragraph of the script), else inline with a space around it.
 * before / after = the script text around the cursor. Returns "" when there is nothing to add.
 */
export function scriptInsert(before, after, specs) {
  const list = (Array.isArray(specs) ? specs : [specs]).filter((s) => s != null);
  const lines = list.map(kitWords).filter(Boolean);
  if (!lines.length) return "";
  const para = lines.length > 1 || list.some((s) => typeof s === "object" && (s.role === "heading" || s.role === "subheading"));
  const b = String(before || ""), a = String(after || "");
  const lead = !b ? "" : para ? (b.endsWith("\n\n") ? "" : b.endsWith("\n") ? "\n" : "\n\n") : /\s$/.test(b) ? "" : " ";
  const tail = !a ? (para ? "\n\n" : " ") : para ? (a.startsWith("\n\n") ? "" : a.startsWith("\n") ? "\n" : "\n\n") : /^\s/.test(a) ? "" : " ";
  return lead + lines.join("\n") + tail;
}
