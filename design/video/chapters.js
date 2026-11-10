// YouTube chapters (pure, unit tested): "0:00 Intro" lines for the video description, with YouTube's rules checked.
const pad = (n) => String(n).padStart(2, "0");

/** 75.9 -> "1:15" (rounded down so the link never lands after the real start); hours when the video is 1 h or longer. */
export function fmtChapterTime(sec, total = 0) {
  const s = Math.max(0, Math.floor(Number(sec) + 1e-6) || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h || total >= 3600 ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
}
/** Sorted by time, one chapter per second (the first one wins). */
export function sortChapters(list) {
  const seen = new Set();
  return [...(list || [])].filter((c) => Number.isFinite(c?.t)).sort((a, b) => a.t - b.t).filter((c) => {
    const k = Math.floor(c.t + 1e-6); if (seen.has(k)) return false; seen.add(k); return true;
  });
}
/** Text to paste into the YouTube description. */
export function chaptersText(list, total = 0) {
  return sortChapters(list).map((c, i) => `${fmtChapterTime(c.t, total)} ${String(c.title || "").trim() || `Chapter ${i + 1}`}`).join("\n");
}
/** YouTube's chapter rules: starts at 0:00, at least 3 chapters, each at least 10 seconds, all inside the video. */
export function checkChapters(list, total) {
  const c = sortChapters(list), out = [];
  if (!c.length) return out;
  if (Math.floor(c[0].t + 1e-6) !== 0) out.push("The first chapter must start at 0:00.");
  if (c.length < 3) out.push("YouTube needs at least 3 chapters.");
  c.forEach((ch, i) => {
    const name = String(ch.title || "").trim() || `Chapter ${i + 1}`;
    if (!String(ch.title || "").trim()) out.push(`Chapter ${i + 1} needs a title.`);
    if (total > 0 && ch.t >= total) out.push(`“${name}” starts after the video ends.`);
    const end = i + 1 < c.length ? Math.floor(c[i + 1].t + 1e-6) : total;
    if (end - Math.floor(ch.t + 1e-6) < 10 && !(total > 0 && ch.t >= total)) out.push(`“${name}” is shorter than 10 seconds.`);
  });
  return out;
}
/** Reads pasted lines like "1:05 Setup", "[01:02:03] Part two" or "2:10 - Ending". */
export function parseChapters(text) {
  const out = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const m = /^\s*\[?((?:\d{1,2}:)?\d{1,2}:\d{2})\]?\s*[-–—:|.)]?\s*(.*)$/.exec(line);
    if (!m) continue;
    const t = m[1].split(":").map(Number).reduce((s, n) => s * 60 + n, 0);
    out.push({ t, title: m[2].trim() });
  }
  return sortChapters(out);
}
