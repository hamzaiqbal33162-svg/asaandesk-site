// Captions for the video editor (pure, no DOM, unit tested): read SRT / WebVTT files, write SRT, turn a typed script
// into timed caption lines, and caption looks. Caption lines are { start, dur, text } in seconds.

const ts = (h, m, s, ms) => (+h || 0) * 3600 + (+m || 0) * 60 + (+s || 0) + (+ms || 0) / 1000;
// 00:00:01,500 (SRT) or 00:01.500 / 00:00:01.500 (VTT)
const TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;
const read = (s) => { const m = TIME.exec(s); return m ? ts(m[1], m[2], m[3], m[4].padEnd(3, "0")) : null; };

/** SRT or WebVTT text -> [{ start, dur, text }] (cues in time order; tags like <i> and {\an8} removed). */
export function parseSubtitles(text) {
  const out = [];
  const blocks = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  for (const b of blocks) {
    const lines = b.split("\n").filter((l) => l.trim() !== "");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, z] = lines[i].split("-->");
    const start = read(a), end = read(z);
    if (start == null || end == null || !(end > start)) continue;
    const words = lines.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").replace(/\{\\[^}]*\}/g, "").trim();
    if (words) out.push({ start, dur: Math.round((end - start) * 1000) / 1000, text: words });
  }
  return out.sort((x, y) => x.start - y.start);
}

const two = (n) => String(n).padStart(2, "0");
/** Seconds -> 00:00:01,500 */
export function srtTime(t) {
  const ms = Math.max(0, Math.round(t * 1000));
  return `${two(Math.floor(ms / 3600000))}:${two(Math.floor(ms / 60000) % 60)}:${two(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, "0")}`;
}
/** [{ start, dur, text }] -> SRT text. */
export function toSrt(lines) {
  return [...lines].sort((a, b) => a.start - b.start).map((l, i) => `${i + 1}\n${srtTime(l.start)} --> ${srtTime(l.start + l.dur)}\n${String(l.text).trim()}\n`).join("\n");
}

/**
 * A typed script -> caption lines across `total` seconds (from `from`): one sentence (or a piece of at most `maxWords`
 * words) per caption, each getting time in proportion to its words, at least minDur. Blank lines are short pauses.
 */
export function scriptToCaptions(text, { total = 0, from = 0, maxWords = 8, minDur = 1, wordSec = 0.4 } = {}) {
  const parts = [];
  for (const para of String(text || "").replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const sentences = para.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*["”')]*/g) || [];
    for (const s of sentences) {
      const words = s.trim().split(" ").filter(Boolean);
      for (let i = 0; i < words.length; i += maxWords) parts.push(words.slice(i, i + maxWords).join(" "));
    }
  }
  if (!parts.length) return [];
  const weight = parts.map((p) => Math.max(1, p.split(" ").length));
  const sum = weight.reduce((a, b) => a + b, 0);
  const span = total > 0 ? total - from : sum * wordSec;
  let t = from;
  return parts.map((p, i) => {
    const dur = Math.max(minDur, (span * weight[i]) / sum);
    const c = { start: Math.round(t * 1000) / 1000, dur: Math.round(dur * 1000) / 1000, text: p };
    t += dur;
    return c;
  });
}

/**
 * Caption style packs: font, colours, place and a word animation (anim: none | reveal | highlight | snake; hl = colour of
 * the word being said), set on every caption with one click.
 */
export const CAPTION_STYLES = {
  box: { label: "Dark box", color: "#ffffff", bg: "#000000a6", bold: true, family: "sans", y: 0.86, anim: "none" },
  bold: { label: "Bold yellow", color: "#ffd166", bg: "", bold: true, family: "sans", y: 0.86, anim: "none" },
  clean: { label: "Clean white", color: "#ffffff", bg: "", bold: false, family: "sans", y: 0.88, anim: "none" },
  highlight: { label: "Highlight", color: "#1b2133", bg: "#ffffffe6", bold: true, family: "sans", y: 0.84, anim: "none" },
  top: { label: "Top of the video", color: "#ffffff", bg: "#000000a6", bold: true, family: "sans", y: 0.12, anim: "none" },
  serif: { label: "Book serif", color: "#ffffff", bg: "#00000080", bold: false, family: "serif", y: 0.86, anim: "none" },
  pop: { label: "Pop word", color: "#ffffff", bg: "", bold: true, family: "sans", y: 0.8, anim: "highlight", hl: "#ffd166" },
  karaoke: { label: "Karaoke", color: "#ffffff", bg: "#000000a6", bold: true, family: "sans", y: 0.86, anim: "highlight", hl: "#22d3ee" },
  reveal: { label: "Reveal", color: "#ffffff", bg: "", bold: true, family: "sans", y: 0.84, anim: "reveal" },
  revealbox: { label: "Reveal box", color: "#ffffff", bg: "#000000b3", bold: true, family: "sans", y: 0.86, anim: "reveal" },
  snake: { label: "Snake", color: "#ffffff", bg: "", bold: true, family: "sans", y: 0.8, anim: "snake", hl: "#ffffff" },
  neon: { label: "Neon pink", color: "#ff6bd6", bg: "", bold: true, family: "sans", y: 0.84, anim: "highlight", hl: "#ffffff" },
  green: { label: "Green word", color: "#ffffff", bg: "#00000080", bold: true, family: "sans", y: 0.86, anim: "highlight", hl: "#4ade80" },
  red: { label: "Red box", color: "#ffffff", bg: "#e11d48e6", bold: true, family: "sans", y: 0.86, anim: "none" },
  blue: { label: "Blue box", color: "#ffffff", bg: "#2563ebe6", bold: true, family: "calibri", y: 0.86, anim: "none" },
  paper: { label: "Paper", color: "#1b2133", bg: "#ffffffe6", bold: false, family: "cambria", y: 0.86, anim: "reveal" },
  mono: { label: "Typewriter mono", color: "#ffffff", bg: "#000000c0", bold: false, family: "mono", y: 0.86, anim: "reveal" },
  gold: { label: "Gold serif", color: "#f5d06f", bg: "", bold: true, family: "serif", y: 0.85, anim: "highlight", hl: "#ffffff" },
  centre: { label: "Centre wave", color: "#ffffff", bg: "", bold: true, family: "sans", y: 0.5, anim: "snake" },
  topword: { label: "Top karaoke", color: "#ffffff", bg: "#000000a6", bold: true, family: "sans", y: 0.12, anim: "highlight", hl: "#ffd166" },
};
/** Text clip fields a caption style pack sets. */
export function captionLook(st) {
  return { color: st.color, bg: st.bg, bold: st.bold, family: st.family, y: st.y, capAnim: st.anim || "none", hl: st.hl || "#ffd166" };
}
