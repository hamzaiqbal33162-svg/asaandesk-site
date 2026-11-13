// Template design kit: SVG building blocks and ready "Canva-pattern" compositions for template thumbnails and template
// artwork in every design app (websites, photo, video, AI, recorder, voice, layers, draw, code…). Pure ES module (no DOM).
// Real photos come from the shared library (photo-library.js: CC0 / public-domain); thumbnails use the small "thumb"
// files, opened designs the "full" ones. Every SVG gets its own id prefix, so many thumbnails can sit inline on one page.
//   const k = kit("my-template-id");                       // ids/defs for one SVG
//   const p = k.pick("restaurant menu", "my-template-id");  // a photo for a topic (deterministic)
//   return k.svg(320, 240, compose.fullBleed(k, { w: 320, h: 240, pal: PAL.ink, photo: p, title: "Fresh desi food" }));
import { pickPhoto, photosFor, photoUrl } from "./photo-library.js";

export { pickPhoto, photosFor, photoUrl };

export const FONT = {
  sans: "Inter,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
  display: "'Arial Black','Segoe UI Black',Inter,'Helvetica Neue',Arial,sans-serif",
  serif: "'Playfair Display','DM Serif Display',Georgia,'Times New Roman',serif",
  mono: "'JetBrains Mono',Consolas,'Courier New',monospace",
  cond: "'Bebas Neue',Oswald,'Arial Narrow','Roboto Condensed','Helvetica Neue',sans-serif",
  script: "'Segoe Script','Brush Script MT','Snell Roundhand',cursive",
};
// Average glyph width (em) per font for the text fitting below; generous so text never overflows.
const CW = { sans: 0.6, display: 0.74, serif: 0.56, mono: 0.62, cond: 0.46, script: 0.5 };

// Curated palettes: bg (page), ink (text on bg), a (main accent), b (second accent), soft (tint), dark (deep tone).
export const PAL = {
  ink: { bg: "#ffffff", ink: "#0f172a", a: "#2563eb", b: "#38bdf8", soft: "#e8efff", dark: "#0b1530" },
  midnight: { bg: "#0b1020", ink: "#f4f6ff", a: "#7c5cff", b: "#22d3ee", soft: "#1a2140", dark: "#05070f" },
  coral: { bg: "#fff6f1", ink: "#2b1712", a: "#f2552c", b: "#ffb347", soft: "#ffe3d6", dark: "#4a1d10" },
  forest: { bg: "#f3f6ef", ink: "#14251a", a: "#1f7a4d", b: "#c8e05c", soft: "#dde9d4", dark: "#0e2a1b" },
  plum: { bg: "#fbf5ff", ink: "#25112f", a: "#8b2fc9", b: "#ff6fb5", soft: "#f0defb", dark: "#2a0f3d" },
  sand: { bg: "#f7f1e8", ink: "#2c241b", a: "#b4652e", b: "#e9b872", soft: "#ece0cf", dark: "#3a2a1c" },
  lime: { bg: "#0f0f10", ink: "#f5f5f0", a: "#c6f432", b: "#ffffff", soft: "#1f2120", dark: "#000000" },
  ocean: { bg: "#f0f8fb", ink: "#0b2a3a", a: "#0e7490", b: "#f59e0b", soft: "#d6eef5", dark: "#082636" },
  rose: { bg: "#fff4f6", ink: "#3a0f1d", a: "#e11d48", b: "#fda4af", soft: "#ffe0e7", dark: "#4c0519" },
  gold: { bg: "#121212", ink: "#f8f1e3", a: "#d4a64a", b: "#f3d9a4", soft: "#26221b", dark: "#0a0a0a" },
  mint: { bg: "#f2fbf7", ink: "#0d2b22", a: "#10b981", b: "#6366f1", soft: "#d5f5e8", dark: "#06281d" },
  sunset: { bg: "#1d0f2b", ink: "#fff3ea", a: "#ff6a3d", b: "#ffc23d", soft: "#3a1d4f", dark: "#12071c" },
  slate: { bg: "#f4f6f9", ink: "#111827", a: "#334155", b: "#f97316", soft: "#e2e8f0", dark: "#0f172a" },
  berry: { bg: "#fdf2f8", ink: "#3b0a2a", a: "#be185d", b: "#7c3aed", soft: "#fbd5e8", dark: "#3b0a2a" },
  cream: { bg: "#fbf7ef", ink: "#1f1b16", a: "#1f1b16", b: "#c2410c", soft: "#efe7d8", dark: "#1f1b16" },
  electric: { bg: "#eef2ff", ink: "#0a0f2c", a: "#4f46e5", b: "#ec4899", soft: "#dfe4ff", dark: "#0a0f2c" },
};
export const PAL_LIST = Object.keys(PAL);

export function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const rng = (seed) => { let s = (hash(seed) % 2147483646) + 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n = (v) => String(Math.round(v * 10) / 10);
export const mix = (c1, c2, t) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const a = p(c1), b = p(c2); return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
export const isDark = (c) => { const v = parseInt(String(c).slice(1), 16); return ((v >> 16) * 299 + ((v >> 8) & 255) * 587 + (v & 255) * 114) / 1000 < 140; };

// ---------- plain shapes
export const rect = (x, y, w, h, fill, rx = 0, ex = "") => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${n(rx)}"` : ""} fill="${fill}"${ex}/>`;
export const circle = (cx, cy, r, fill, ex = "") => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${ex}/>`;
export const pathEl = (d, fill, ex = "") => `<path d="${d}" fill="${fill}"${ex}/>`;
export const line = (x1, y1, x2, y2, stroke, sw = 1, ex = "") => `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" fill="none"${ex}/>`;

// ---------- text fitting
/** Wrap `text` into lines no wider than maxW at `size`; shrinks the size (down to `min`) until it fits `maxLines`. */
export function fit(text, maxW, { size = 32, min = 8, maxLines = 3, font = "sans", ls = 0, upper = false, maxH = 0, lh = 1.05 } = {}) {
  const t = String(text ?? "").trim(); const src = upper ? t.toUpperCase() : t;
  const words = src.split(/\s+/).filter(Boolean);
  const cw = (CW[font] ?? 0.6) * (upper ? 1.08 : 1);
  for (let s = size; s >= min; s = Math.floor(s * 0.92)) {
    const per = (str) => str.length * s * cw + Math.max(0, str.length - 1) * ls;
    const lines = []; let cur = "";
    let ok = true;
    for (const w of words) {
      if (per(w) > maxW) { ok = false; break; }
      const tryL = cur ? cur + " " + w : w;
      if (per(tryL) <= maxW) cur = tryL; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (ok && lines.length <= maxLines && (!maxH || s * 0.9 + (lines.length - 1) * s * lh <= maxH)) return { lines, size: s };
    if (s === min) break;
  }
  // last resort: hard cut into maxLines at the min size
  const s = min, lim = Math.max(3, Math.floor(maxW / (s * cw)));
  const lines = []; let cur = "";
  for (const w of words) { const tryL = cur ? cur + " " + w : w; if (tryL.length <= lim) cur = tryL; else { if (cur) lines.push(cur); cur = w.slice(0, lim); } }
  if (cur) lines.push(cur);
  const out = lines.slice(0, maxLines); if (lines.length > maxLines) out[maxLines - 1] = out[maxLines - 1].replace(/.?$/, "…");
  return { lines: out, size: s };
}
/** <text> with one tspan per line; y = baseline of the first line. */
export function text(x, y, lines, { size = 16, lh = 1.08, weight = 700, fill = "#111", font = "sans", anchor = "start", ls = 0, opacity = 1, italic = false, upper = false, stroke = "", sw = 0, ex = "" } = {}) {
  const arr = (Array.isArray(lines) ? lines : [lines]).filter((l) => l !== "" && l != null);
  if (!arr.length) return "";
  const fam = FONT[font] || font;
  const attrs = `font-family="${esc(fam)}" font-size="${n(size)}" font-weight="${weight}" fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${ls ? ` letter-spacing="${n(ls)}"` : ""}${opacity !== 1 ? ` opacity="${opacity}"` : ""}${italic ? ' font-style="italic"' : ""}${stroke ? ` stroke="${stroke}" stroke-width="${sw}" paint-order="stroke"` : ""}${ex}`;
  if (arr.length === 1) return `<text x="${n(x)}" y="${n(y)}" ${attrs}>${esc(upper ? arr[0].toUpperCase() : arr[0])}</text>`;
  return `<text x="${n(x)}" y="${n(y)}" ${attrs}>` + arr.map((l, i) => `<tspan x="${n(x)}" dy="${i ? n(size * lh) : 0}">${esc(upper ? l.toUpperCase() : l)}</tspan>`).join("") + `</text>`;
}
/** Fit + draw a headline in a box: returns { svg, h (height used), size, lines }. */
export function headline(x, y, maxW, str, o = {}) {
  const lh = o.lh ?? (o.font === "serif" ? 1.08 : 0.98);
  const f = fit(str, maxW, { ...o, lh });
  const svg = text(x, y + f.size * 0.86, f.lines, { ...o, size: f.size, lh });
  return { svg, h: f.size * 0.86 + (f.lines.length - 1) * f.size * lh + f.size * 0.2, size: f.size, lines: f.lines };
}
const textW = (s, size, font = "sans", ls = 0) => String(s).length * size * (CW[font] ?? 0.6) + Math.max(0, String(s).length - 1) * ls;
export { textW };

// ---------- icons (24×24 stroke paths)
export const ICONS = {
  play: "M8 5v14l11-7z", mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z", star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  check: "M5 12l4 4 10-10", arrow: "M5 12h14M13 6l6 6-6 6", sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", code: "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
  phone: "M7 2h10v20H7zM11 18h2", heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  cart: "M3 4h2l2.5 11h11L21 7H6.5M9 20a1 1 0 1 0 0-.1M18 20a1 1 0 1 0 0-.1", pin: "M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2", calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0", chart: "M4 20V10M10 20V4M16 20v-7M22 20H2", bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18", brush: "M18 3l3 3-9 9-3-3zM9 12c-3 0-5 2-5 5 0 1.5-1 2-2 2 4 2 9 1 9-4z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5", wave: "M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0", screen: "M3 4h18v12H3zM8 20h8M12 16v4", video: "M3 6h13v12H3zM16 10l5-3v10l-5-3z",
  quote: "M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6", leaf: "M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7",
};
export const icon = (name, x, y, s = 24, stroke = "#fff", sw = 2, fill = "none") => ICONS[name] ? `<path d="${ICONS[name]}" transform="translate(${n(x)} ${n(y)}) scale(${n(s / 24 * 100) / 100})" fill="${fill}" stroke="${stroke}" stroke-width="${n(sw * 24 / s * 10) / 10}" stroke-linecap="round" stroke-linejoin="round"/>` : "";

// ---------- the kit: defs + ids for one SVG
// Ids are deterministic per (seed, salt): the same thumbnail twice on a page repeats identical defs (harmless); use a
// different salt when one page shows two different drawings of the same template (e.g. "thumb" and "full").
export function kit(seed = "t", salt = "") {
  const pre = "k" + hash(seed + "|" + salt).toString(36);
  const defs = []; let c = 0;
  const id = (s = "x") => `${pre}${s}${(c++).toString(36)}`;
  const shadows = new Map();
  const k = {
    seed, id, defs,
    /** Linear gradient; angle in degrees (0 = left->right, 90 = top->bottom). stops: [color, …] or [[color, opacity, offset], …] */
    lin(stops, angle = 90) {
      const i = id("g"); const a = (angle * Math.PI) / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
      defs.push(`<linearGradient id="${i}" x1="${n(0.5 - dx)}" y1="${n(0.5 - dy)}" x2="${n(0.5 + dx)}" y2="${n(0.5 + dy)}">${stopsOf(stops)}</linearGradient>`);
      return `url(#${i})`;
    },
    rad(stops, cx = 0.5, cy = 0.5, r = 0.6) { const i = id("r"); defs.push(`<radialGradient id="${i}" cx="${cx}" cy="${cy}" r="${r}">${stopsOf(stops)}</radialGradient>`); return `url(#${i})`; },
    /** filter attribute for a soft drop shadow */
    shadow(dy = 6, blur = 10, op = 0.28, color = "#0b1020", dx = 0) {
      const key = [dy, blur, op, color, dx].join(); if (!shadows.has(key)) { const i = id("s"); shadows.set(key, i); defs.push(`<filter id="${i}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${blur / 2}" flood-color="${color}" flood-opacity="${op}"/></filter>`); }
      return ` filter="url(#${shadows.get(key)})"`;
    },
    blur(sd = 6) { const i = id("b"); defs.push(`<filter id="${i}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${sd}"/></filter>`); return ` filter="url(#${i})"`; },
    glow(color = "#fff", sd = 4) { const i = id("o"); defs.push(`<filter id="${i}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feFlood flood-color="${color}"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`); return ` filter="url(#${i})"`; },
    /** clip-path attribute from any SVG shape markup */
    clip(shape) { const i = id("c"); defs.push(`<clipPath id="${i}">${shape}</clipPath>`); return ` clip-path="url(#${i})"`; },
    clipRect(x, y, w, h, rx = 0) { return k.clip(rect(x, y, w, h, "#000", rx)); },
    pattern(w, h, body) { const i = id("p"); defs.push(`<pattern id="${i}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${body}</pattern>`); return `url(#${i})`; },
    dots(color = "#fff", gap = 10, r = 1.4, op = 0.35) { return k.pattern(gap, gap, circle(gap / 2, gap / 2, r, color, ` opacity="${op}"`)); },
    /** a photo for a topic (deterministic per seed) */
    pick(topic, s = seed, o = {}) { return pickPhoto(topic, s, o); },
    picks(topic, count, s = seed) { return photosFor(topic, count, s); },
    /** a real photo filling a box (cover crop). opts: rx, size ("thumb" | "full"), align, opacity, clip (shape markup), ex, fallback colour */
    photo(p, x, y, w, h, { rx = 0, size = "thumb", align = "xMidYMid", opacity = 1, clip = "", ex = "", fallback = "#94a3b8", tint = "" } = {}) {
      const url = photoUrl(p, size);
      const cp = clip ? k.clip(clip) : rx ? k.clipRect(x, y, w, h, rx) : "";
      const img = url ? `<image href="${url}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="${align} slice"${opacity !== 1 ? ` opacity="${opacity}"` : ""}${ex}/>` : rect(x, y, w, h, fallback);
      const t = tint ? rect(x, y, w, h, tint) : "";
      return cp ? `<g${cp}>${rect(x, y, w, h, fallback)}${img}${t}</g>` : rect(x, y, w, h, fallback) + img + t;
    },
    /** gradient scrim over a photo for readable text; dir: "up" (dark at bottom), "down", "left", "right" */
    scrim(x, y, w, h, color = "#000", from = 0, to = 0.75, dir = "up") {
      const ang = { up: 90, down: 270, left: 180, right: 0 }[dir] ?? 90;
      return rect(x, y, w, h, k.lin([[color, from], [color, to]], ang));
    },
    /** organic blob */
    blob(cx, cy, r, fill, { pts = 7, jitter = 0.28, ex = "" } = {}) {
      const R = rng(seed + ":" + cx + ":" + cy + ":" + r); const P = [];
      for (let i = 0; i < pts; i++) { const a = (i / pts) * Math.PI * 2, rr = r * (1 - jitter / 2 + R() * jitter); P.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      let d = ""; for (let i = 0; i < pts; i++) { const p0 = P[(i - 1 + pts) % pts], p1 = P[i], p2 = P[(i + 1) % pts], p3 = P[(i + 2) % pts];
        if (!i) d += `M${n(p1[0])} ${n(p1[1])}`; d += `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`; }
      return `<path d="${d}Z" fill="${fill}"${ex}/>`;
    },
    /** rounded pill with centred text; returns { svg, w } */
    pill(x, y, label, { size = 10, fill = "#fff", color = "#111", weight = 700, padX, h, font = "sans", stroke = "", anchor = "start", ls = 0, upper = false } = {}) {
      const L = upper ? String(label).toUpperCase() : String(label);
      const px = padX ?? size * 0.95, hh = h ?? size * 2.1, w = textW(L, size, font, ls) * 0.92 + px * 2;
      const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
      return { w, h: hh, svg: rect(x0, y, w, hh, fill, hh / 2, stroke ? ` stroke="${stroke}" stroke-width="1"` : "") + text(x0 + w / 2, y + hh / 2 + size * 0.36, L, { size, fill: color, weight, anchor: "middle", font, ls }) };
    },
    /** soft card with shadow */
    card(x, y, w, h, { fill = "#fff", rx = 12, sh = [6, 14, 0.18], stroke = "" } = {}) { return rect(x, y, w, h, fill, rx, (sh ? k.shadow(...sh) : "") + (stroke ? ` stroke="${stroke}" stroke-width="1"` : "")); },
    /** audio waveform bars */
    wave(x, y, w, h, fill = "#fff", { bars = 40, gap = 0.4, op = 1, round = true, played = 0, playedFill = "" } = {}) {
      const R = rng(seed + ":w" + x + y); const bw = w / bars; let s = "";
      for (let i = 0; i < bars; i++) { const e = Math.sin((i / bars) * Math.PI); const v = Math.max(0.12, (0.25 + R() * 0.75) * (0.45 + e * 0.55)); const bh = h * v;
        s += rect(x + i * bw + (bw * gap) / 2, y + (h - bh) / 2, bw * (1 - gap), bh, playedFill && i / bars < played ? playedFill : fill, round ? (bw * (1 - gap)) / 2 : 0); }
      return op !== 1 ? `<g opacity="${op}">${s}</g>` : s;
    },
    /** round play button */
    play(cx, cy, r = 14, { fill = "#fff", color = "#111", op = 0.95, ring = false } = {}) {
      return (ring ? circle(cx, cy, r * 1.35, fill, ` opacity="${op * 0.3}"`) : "") + circle(cx, cy, r, fill, ` opacity="${op}"` + k.shadow(3, 8, 0.25)) + pathEl(`M${n(cx - r * 0.3)} ${n(cy - r * 0.42)}L${n(cx + r * 0.48)} ${n(cy)}L${n(cx - r * 0.3)} ${n(cy + r * 0.42)}Z`, color);
    },
    /** browser window chrome; returns { svg, top } (content starts at top) */
    browser(x, y, w, h, { dark = false, url = "", rx = 10 } = {}) {
      const bar = Math.max(12, h * 0.07);
      return { top: y + bar, svg: rect(x, y, w, h, dark ? "#111827" : "#fff", rx, k.shadow(8, 18, 0.22)) + `<g${k.clipRect(x, y, w, bar + 2, rx)}>${rect(x, y, w, bar + rx, dark ? "#1f2937" : "#eef0f4")}</g>`
        + [0, 1, 2].map((i) => circle(x + bar * 0.6 + i * bar * 0.5, y + bar / 2, bar * 0.14, ["#f87171", "#fbbf24", "#34d399"][i])).join("")
        + (url ? rect(x + w * 0.3, y + bar * 0.22, w * 0.4, bar * 0.56, dark ? "#111827" : "#fff", bar * 0.28) + text(x + w / 2, y + bar * 0.66, url, { size: bar * 0.4, fill: dark ? "#9ca3af" : "#6b7280", anchor: "middle", weight: 500 }) : "") };
    },
    /** phone frame; returns { svg, x, y, w, h } of the screen */
    phone(x, y, w, h, { color = "#0b0b0f" } = {}) {
      const b = w * 0.05, r = w * 0.14;
      return { x: x + b, y: y + b, w: w - b * 2, h: h - b * 2, rx: r - b, svg: rect(x, y, w, h, color, r, k.shadow(10, 22, 0.35)) };
    },
    phoneNotch(sx, sy, sw) { return rect(sx + sw * 0.36, sy + sw * 0.03, sw * 0.28, sw * 0.07, "#0b0b0f", sw * 0.035); },
    /** wrap the body into an SVG document */
    svg(w, h, body, { bg = "", width = "", height = "", ex = "" } = {}) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"${width ? ` width="${width}" height="${height}"` : ""} preserveAspectRatio="xMidYMid meet"${ex}>${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${bg ? rect(0, 0, w, h, bg) : ""}${body}</svg>`;
    },
  };
  return k;
}
function stopsOf(stops) {
  const L = stops.length;
  return stops.map((s, i) => { const [c, o = 1, off = L > 1 ? i / (L - 1) : 0] = Array.isArray(s) ? s : [s]; return `<stop offset="${n(off * 100)}%" stop-color="${c}"${o !== 1 ? ` stop-opacity="${o}"` : ""}/>`; }).join("");
}

// ---------- compositions: whole Canva-pattern designs in a w×h box (x0,y0 offset optional)
// o = { w, h, x = 0, y = 0, pal, photo, photos, title, sub, eyebrow, cta, brand, size: "thumb" | "full", font }
const P = (o) => ({ x: 0, y: 0, size: "thumb", ...o, pal: typeof o.pal === "string" ? PAL[o.pal] || PAL.ink : o.pal || PAL.ink });
const brandMark = (k, x, y, label, color, s) => circle(x + s * 0.5, y + s * 0.5, s * 0.5, color) + circle(x + s * 0.5, y + s * 0.5, s * 0.22, "none", ` stroke="${isDark(color) ? "#fff" : "#000"}" stroke-width="${n(s * 0.1)}" opacity=".85"`) + text(x + s * 1.35, y + s * 0.78, label, { size: s * 0.82, weight: 800, fill: color });

export const compose = {
  /** full-bleed photo, dark gradient, big headline bottom-left */
  fullBleed(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, cta, brand, size } = P(o); const m = Math.min(w, h);
    let s = k.photo(photo, x, y, w, h, { size }) + k.scrim(x, y + h * 0.12, w, h * 0.88, pal.dark, 0, 0.9);
    if (eyebrow || brand) s += k.scrim(x, y, w, h * 0.3, pal.dark, 0, 0.45, "down");
    const ho = { size: Math.min(m * 0.17, w * 0.1), min: m * 0.06, maxLines: 3, maxH: h * 0.5, weight: 900, fill: "#fff", font: o.font || "sans" };
    const hl = headline(x + m * 0.08, y, w * 0.84, title, ho);
    const ty = y + h - m * 0.1 - hl.h - (sub ? m * 0.09 : 0) - (cta ? m * 0.12 : 0);
    if (eyebrow) s += k.pill(x + m * 0.08, y + m * 0.08, eyebrow, { size: m * 0.04, fill: pal.a, color: isDark(pal.a) ? "#fff" : "#111", upper: true, ls: 0.5 }).svg;
    if (brand) s += text(x + w - m * 0.08, y + m * 0.13, brand, { size: m * 0.045, fill: "#fff", weight: 800, anchor: "end", ls: 0.6, upper: true });
    s += headline(x + m * 0.08, ty, w * 0.84, title, ho).svg;
    let yy = ty + hl.h + m * 0.02;
    if (sub) { s += text(x + m * 0.08, yy + m * 0.05, fit(sub, w * 0.8, { size: m * 0.045, maxLines: 1 }).lines, { size: m * 0.045, fill: "#fff", opacity: 0.85, weight: 500 }); yy += m * 0.09; }
    if (cta) s += k.pill(x + m * 0.08, yy + m * 0.01, cta, { size: m * 0.042, fill: pal.a, color: isDark(pal.a) ? "#fff" : "#111" }).svg;
    return s;
  },
  /** photo on one side, colour panel with heavy type on the other */
  split(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, cta, size } = P(o); const m = Math.min(w, h); const left = o.photoLeft ?? true;
    const pw = w * (o.ratio ?? 0.5), px = left ? x : x + w - pw, tx = left ? x + pw : x, tw = w - pw;
    let s = rect(x, y, w, h, o.panel || pal.dark) + k.photo(photo, px, y, pw, h, { size });
    s += k.blob(tx + tw * (left ? 0.95 : 0.05), y + h * 0.1, m * 0.28, pal.a, { ex: ' opacity=".35"' });
    const ink = isDark(o.panel || pal.dark) ? "#fff" : pal.ink, pad = m * 0.08;
    if (eyebrow) s += text(tx + pad, y + pad + m * 0.04, eyebrow, { size: m * 0.04, fill: pal.b, weight: 800, ls: 1, upper: true });
    const hl = headline(tx + pad, y + pad + m * 0.09, tw - pad * 2, title, { size: m * 0.14, min: m * 0.05, maxLines: 4, weight: 900, fill: ink, font: o.font || "sans" });
    s += hl.svg; let yy = y + pad + m * 0.09 + hl.h + m * 0.03;
    s += rect(tx + pad, yy, m * 0.12, m * 0.018, pal.a); yy += m * 0.05;
    if (sub) { const f = fit(sub, tw - pad * 2, { size: m * 0.042, maxLines: 3 }); s += text(tx + pad, yy + f.size, f.lines, { size: f.size, fill: ink, opacity: 0.78, weight: 500, lh: 1.3 }); yy += f.lines.length * f.size * 1.3 + m * 0.04; }
    if (cta) s += k.pill(tx + pad, Math.min(yy, y + h - pad - m * 0.09), cta, { size: m * 0.04, fill: pal.a, color: isDark(pal.a) ? "#fff" : "#111" }).svg;
    return s;
  },
  /** gradient background with blobs, photo in a tilted shadowed card, headline */
  floatCard(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, size } = P(o); const m = Math.min(w, h);
    let s = rect(x, y, w, h, k.lin([pal.a, pal.b], 35)) + k.blob(x + w * 0.85, y + h * 0.15, m * 0.32, "#fff", { ex: ' opacity=".18"' }) + k.blob(x + w * 0.1, y + h * 0.95, m * 0.3, pal.dark, { ex: ' opacity=".18"' });
    s += rect(x, y, w, h, k.dots("#fff", m * 0.05, m * 0.006, 0.25));
    const cw = w * 0.46, ch = h * 0.62, cx = x + w * 0.5, cy = y + h * 0.22;
    s += `<g transform="rotate(${o.tilt ?? 4} ${n(cx + cw / 2)} ${n(cy + ch / 2)})">` + rect(cx - m * 0.015, cy - m * 0.015, cw + m * 0.03, ch + m * 0.03, "#fff", m * 0.05, k.shadow(m * 0.04, m * 0.08, 0.3)) + k.photo(photo, cx, cy, cw, ch, { rx: m * 0.04, size }) + `</g>`;
    const ink = isDark(pal.a) ? "#fff" : pal.ink;
    if (eyebrow) s += k.pill(x + m * 0.08, y + m * 0.1, eyebrow, { size: m * 0.038, fill: "#fff", color: pal.dark, upper: true, ls: 0.5 }).svg;
    s += headline(x + m * 0.08, y + h * 0.3, w * 0.4, title, { size: m * 0.13, min: m * 0.05, maxLines: 4, weight: 900, fill: ink, font: o.font || "sans" }).svg;
    if (sub) s += text(x + m * 0.08, y + h - m * 0.1, fit(sub, w * 0.38, { size: m * 0.038, maxLines: 1 }).lines, { size: m * 0.038, fill: ink, opacity: 0.85, weight: 600 });
    return s;
  },
  /** duotone photo + huge centred uppercase type with an outline echo */
  duotone(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, size } = P(o); const m = Math.min(w, h);
    let s = k.photo(photo, x, y, w, h, { size }) + rect(x, y, w, h, pal.a, 0, ' opacity=".62" style="mix-blend-mode:multiply"') + rect(x, y, w, h, k.lin([[pal.dark, 0.15], [pal.dark, 0.7]], 90));
    const f = fit(title, w * 0.84, { size: m * 0.2, min: m * 0.07, maxLines: 3, upper: true, font: o.font || "display" });
    const lh = 0.96, th = f.size * 0.86 + (f.lines.length - 1) * f.size * lh, ty = y + h / 2 - th / 2;
    s += text(x + w / 2 + m * 0.012, ty + f.size * 0.86 + m * 0.012, f.lines, { size: f.size, lh, weight: 900, fill: "none", stroke: pal.b, sw: m * 0.004, anchor: "middle", upper: true, font: o.font || "display" });
    s += text(x + w / 2, ty + f.size * 0.86, f.lines, { size: f.size, lh, weight: 900, fill: "#fff", anchor: "middle", upper: true, font: o.font || "display" });
    if (eyebrow) s += text(x + w / 2, ty - m * 0.06, eyebrow, { size: m * 0.04, fill: pal.b, weight: 800, anchor: "middle", ls: m * 0.008, upper: true });
    if (sub) s += k.pill(x + w / 2, ty + th + m * 0.06, sub, { size: m * 0.04, fill: "#fff", color: pal.dark, anchor: "middle" }).svg;
    return s;
  },
  /** solid colour, big circle-cropped photo at one side, headline, dot grid */
  circleCut(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, cta, size } = P(o); const m = Math.min(w, h);
    const r = h * 0.42, cx = x + w * 0.72, cy = y + h * 0.5;
    let s = rect(x, y, w, h, pal.bg) + circle(cx + r * 0.18, cy - r * 0.12, r * 1.06, pal.a) + rect(x + w * 0.04, y + h * 0.62, m * 0.3, m * 0.3, k.dots(pal.a, m * 0.04, m * 0.007, 0.6));
    s += k.photo(photo, cx - r, cy - r, r * 2, r * 2, { size, clip: circle(cx, cy, r, "#000") }) + circle(cx, cy, r, "none", ` stroke="#fff" stroke-width="${n(m * 0.015)}"`);
    if (eyebrow) s += text(x + m * 0.08, y + m * 0.14, eyebrow, { size: m * 0.04, fill: pal.a, weight: 800, ls: 1, upper: true });
    const hl = headline(x + m * 0.08, y + m * 0.18, w * 0.46, title, { size: m * 0.13, min: m * 0.05, maxLines: 4, weight: 900, fill: pal.ink, font: o.font || "sans" });
    s += hl.svg; let yy = y + m * 0.18 + hl.h + m * 0.04;
    if (sub) { const f = fit(sub, w * 0.4, { size: m * 0.04, maxLines: 2 }); s += text(x + m * 0.08, yy + f.size, f.lines, { size: f.size, fill: pal.ink, opacity: 0.7, weight: 500, lh: 1.3 }); yy += f.lines.length * f.size * 1.3 + m * 0.05; }
    if (cta) s += k.pill(x + m * 0.08, yy, cta, { size: m * 0.04, fill: pal.ink, color: pal.bg }).svg;
    return s;
  },
  /** magazine cover: photo top, white band with serif headline and issue label */
  magazine(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, brand, size } = P(o); const m = Math.min(w, h);
    const ph = h * 0.64;
    let s = rect(x, y, w, h, pal.bg) + k.photo(photo, x, y, w, ph, { size });
    if (brand) s += text(x + m * 0.07, y + m * 0.15, brand, { size: m * 0.11, weight: 900, fill: "#fff", font: "serif", ls: -0.5 });
    if (eyebrow) s += k.pill(x + w - m * 0.07, y + m * 0.08, eyebrow, { size: m * 0.035, fill: pal.a, color: "#fff", anchor: "end", upper: true }).svg;
    s += rect(x + m * 0.07, y + ph + m * 0.05, m * 0.1, m * 0.012, pal.a);
    const avail = h - ph - m * 0.08 - (sub ? m * 0.12 : m * 0.05);
    const hl = headline(x + m * 0.07, y + ph + m * 0.08, w - m * 0.14, title, { size: m * 0.1, min: m * 0.035, maxLines: 2, maxH: avail, weight: 700, fill: pal.ink, font: "serif" });
    s += hl.svg;
    if (sub) s += text(x + m * 0.07, y + h - m * 0.06, fit(sub, w - m * 0.14, { size: m * 0.036, maxLines: 1 }).lines, { size: m * 0.036, fill: pal.ink, opacity: 0.6, weight: 600, ls: 0.4, upper: true });
    return s;
  },
  /** dark band across a photo with a giant number / stat */
  bigStat(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, size } = P(o); const m = Math.min(w, h);
    const num = o.stat || "01";
    let s = rect(x, y, w, h, pal.dark) + k.photo(photo, x + w * 0.45, y, w * 0.55, h, { size, opacity: 0.9 }) + rect(x + w * 0.45, y, w * 0.55, h, k.lin([[pal.dark, 1], [pal.dark, 0]], 0));
    s += text(x + m * 0.07, y + h * 0.5, num, { size: m * 0.42, weight: 900, fill: pal.a, ls: -m * 0.01, font: "display" });
    if (eyebrow) s += text(x + m * 0.08, y + m * 0.12, eyebrow, { size: m * 0.04, fill: "#fff", opacity: 0.7, weight: 700, ls: 1, upper: true });
    s += headline(x + m * 0.08, y + h * 0.58, w * 0.55, title, { size: m * 0.09, min: m * 0.045, maxLines: 2, weight: 800, fill: "#fff" }).svg;
    if (sub) s += text(x + m * 0.08, y + h - m * 0.08, fit(sub, w * 0.5, { size: m * 0.036, maxLines: 1 }).lines, { size: m * 0.036, fill: "#fff", opacity: 0.7, weight: 500 });
    return s;
  },
  /** fan of three photo cards on a gradient, headline above */
  stack(k, o) {
    const { x, y, w, h, pal, photos = [], photo, title, sub, size } = P(o); const m = Math.min(w, h);
    const ps = photos.length ? photos : [photo, photo, photo];
    let s = rect(x, y, w, h, k.lin([pal.soft, pal.bg], 90)) + k.blob(x + w * 0.5, y + h * 0.72, m * 0.42, pal.a, { ex: ' opacity=".14"' });
    s += headline(x + m * 0.07, y + m * 0.07, w * 0.86, title, { size: m * 0.1, min: m * 0.045, maxLines: 2, weight: 900, fill: pal.ink, anchor: "start" }).svg;
    const cw = w * 0.3, ch = h * 0.48, by = y + h * 0.4;
    [[-9, -0.27], [7, 0.27], [0, 0]].forEach(([rot, off], i) => {
      const cx = x + w / 2 + off * w - cw / 2, cy = by + (i === 2 ? -h * 0.03 : h * 0.03);
      s += `<g transform="rotate(${rot} ${n(cx + cw / 2)} ${n(cy + ch / 2)})">` + rect(cx - m * 0.012, cy - m * 0.012, cw + m * 0.024, ch + m * 0.06, "#fff", m * 0.02, k.shadow(m * 0.03, m * 0.06, 0.25)) + k.photo(ps[i % ps.length], cx, cy, cw, ch, { rx: m * 0.01, size }) + `</g>`;
    });
    if (sub) s += k.pill(x + w / 2, y + h - m * 0.12, sub, { size: m * 0.038, fill: pal.ink, color: pal.bg, anchor: "middle" }).svg;
    return s;
  },
  /** photo with a diagonal colour band carrying the headline */
  band(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, size } = P(o); const m = Math.min(w, h);
    let s = k.photo(photo, x, y, w, h, { size });
    const y1 = y + h * 0.52, y2 = y + h * 0.66;
    s += pathEl(`M${n(x)} ${n(y1)}L${n(x + w)} ${n(y1 - h * 0.14)}L${n(x + w)} ${n(y + h)}L${n(x)} ${n(y + h)}Z`, pal.a, k.shadow(-4, 12, 0.25));
    s += pathEl(`M${n(x)} ${n(y2)}L${n(x + w)} ${n(y2 - h * 0.14)}L${n(x + w)} ${n(y + h)}L${n(x)} ${n(y + h)}Z`, pal.dark);
    if (eyebrow) s += k.pill(x + m * 0.07, y + m * 0.07, eyebrow, { size: m * 0.038, fill: "#fff", color: pal.dark, upper: true }).svg;
    s += headline(x + m * 0.07, y + h * 0.68, w * 0.86, title, { size: m * 0.12, min: m * 0.045, maxLines: 2, weight: 900, fill: "#fff", upper: true, font: o.font || "sans" }).svg;
    if (sub) s += text(x + m * 0.07, y + h - m * 0.06, fit(sub, w * 0.8, { size: m * 0.038, maxLines: 1 }).lines, { size: m * 0.038, fill: pal.b, weight: 700 });
    return s;
  },
  /** blurred photo background with a frosted glass card */
  glass(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, cta, size } = P(o); const m = Math.min(w, h);
    let s = `<g${k.clipRect(x, y, w, h)}>` + `<g${k.blur(m * 0.03)}>${k.photo(photo, x - m * 0.05, y - m * 0.05, w + m * 0.1, h + m * 0.1, { size })}</g>` + rect(x, y, w, h, pal.dark, 0, ' opacity=".25"') + `</g>`;
    const cw = w * 0.74, ch = h * 0.62, cx = x + (w - cw) / 2, cy = y + (h - ch) / 2;
    s += rect(cx, cy, cw, ch, "#ffffff", m * 0.05, ` fill-opacity=".16" stroke="#fff" stroke-opacity=".55" stroke-width="${n(m * 0.004)}"` + k.shadow(m * 0.03, m * 0.08, 0.25));
    s += k.photo(photo, cx + cw - m * 0.26, cy + m * 0.05, m * 0.21, m * 0.21, { size, clip: circle(cx + cw - m * 0.155, cy + m * 0.155, m * 0.105, "#000") });
    if (eyebrow) s += text(cx + m * 0.06, cy + m * 0.11, eyebrow, { size: m * 0.038, fill: "#fff", weight: 800, ls: 1, upper: true });
    s += headline(cx + m * 0.06, cy + m * 0.15, cw - m * 0.36, title, { size: m * 0.11, min: m * 0.045, maxLines: 3, weight: 900, fill: "#fff" }).svg;
    if (sub) s += text(cx + m * 0.06, cy + ch - m * 0.14, fit(sub, cw - m * 0.12, { size: m * 0.038, maxLines: 1 }).lines, { size: m * 0.038, fill: "#fff", opacity: 0.9, weight: 500 });
    if (cta) s += k.pill(cx + m * 0.06, cy + ch - m * 0.11, cta, { size: m * 0.036, fill: "#fff", color: pal.dark }).svg;
    return s;
  },
  /** cream luxury: arch-shaped photo, serif headline, thin rules */
  arch(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, brand, size } = P(o); const m = Math.min(w, h);
    const aw = w * 0.4, ah = h * 0.78, ax = x + w - aw - m * 0.08, ay = y + h - ah - m * 0.08;
    let s = rect(x, y, w, h, pal.bg) + rect(ax + m * 0.03, ay + m * 0.03, aw, ah, pal.soft, 0);
    const archD = `M${n(ax)} ${n(ay + ah)}V${n(ay + aw / 2)}A${n(aw / 2)} ${n(aw / 2)} 0 0 1 ${n(ax + aw)} ${n(ay + aw / 2)}V${n(ay + ah)}Z`;
    s += k.photo(photo, ax, ay, aw, ah, { size, clip: `<path d="${archD}"/>` });
    if (brand) s += text(x + m * 0.08, y + m * 0.12, brand, { size: m * 0.038, fill: pal.ink, weight: 700, ls: m * 0.01, upper: true });
    s += line(x + m * 0.08, y + m * 0.17, x + w * 0.45, y + m * 0.17, pal.ink, m * 0.003, ' opacity=".4"');
    if (eyebrow) s += text(x + m * 0.08, y + h * 0.36, eyebrow, { size: m * 0.04, fill: pal.b, weight: 600, italic: true, font: "serif" });
    s += headline(x + m * 0.08, y + h * 0.4, w * 0.44, title, { size: m * 0.12, min: m * 0.05, maxLines: 3, weight: 600, fill: pal.ink, font: "serif" }).svg;
    if (sub) s += text(x + m * 0.08, y + h - m * 0.1, fit(sub, w * 0.42, { size: m * 0.035, maxLines: 1 }).lines, { size: m * 0.035, fill: pal.ink, opacity: 0.7, weight: 600, ls: 0.6, upper: true });
    return s;
  },
  /** three-photo collage grid with a label band */
  grid3(k, o) {
    const { x, y, w, h, pal, photos = [], photo, title, sub, size } = P(o); const m = Math.min(w, h); const g = m * 0.02;
    const ps = photos.length >= 3 ? photos : [photo, photo, photo];
    let s = rect(x, y, w, h, pal.bg) + k.photo(ps[0], x + g, y + g, w * 0.58 - g * 1.5, h - g * 2, { size, rx: m * 0.02 })
      + k.photo(ps[1], x + w * 0.58 + g / 2, y + g, w * 0.42 - g * 1.5, h / 2 - g * 1.5, { size, rx: m * 0.02 })
      + k.photo(ps[2], x + w * 0.58 + g / 2, y + h / 2 + g / 2, w * 0.42 - g * 1.5, h / 2 - g * 1.5, { size, rx: m * 0.02 });
    const f = fit(title, w * 0.5, { size: m * 0.09, min: m * 0.04, maxLines: 2, font: "sans" });
    const bh = f.size * (f.lines.length * 1.0 + 0.9) + (sub ? m * 0.06 : 0);
    s += rect(x + m * 0.06, y + h - bh - m * 0.08, w * 0.56, bh, pal.a, m * 0.02, k.shadow(m * 0.02, m * 0.05, 0.25));
    s += text(x + m * 0.1, y + h - bh - m * 0.08 + f.size * 1.2, f.lines, { size: f.size, lh: 1, weight: 900, fill: isDark(pal.a) ? "#fff" : pal.ink });
    if (sub) s += text(x + m * 0.1, y + h - m * 0.08 - m * 0.04, fit(sub, w * 0.48, { size: m * 0.034, maxLines: 1 }).lines, { size: m * 0.034, fill: isDark(pal.a) ? "#fff" : pal.ink, opacity: 0.85, weight: 600 });
    return s;
  },
  /** minimal editorial: off-white, huge type, small photo, thin rules */
  editorial(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, brand, size } = P(o); const m = Math.min(w, h);
    let s = rect(x, y, w, h, pal.bg);
    if (brand) s += text(x + m * 0.07, y + m * 0.1, brand, { size: m * 0.036, fill: pal.ink, weight: 800, ls: 0.8, upper: true });
    if (eyebrow) s += text(x + w - m * 0.07, y + m * 0.1, eyebrow, { size: m * 0.036, fill: pal.ink, weight: 600, anchor: "end", opacity: 0.6 });
    s += line(x + m * 0.07, y + m * 0.14, x + w - m * 0.07, y + m * 0.14, pal.ink, m * 0.003, ' opacity=".5"');
    s += headline(x + m * 0.07, y + m * 0.2, w * 0.62, title, { size: m * 0.17, min: m * 0.06, maxLines: 3, weight: 900, fill: pal.ink, ls: -m * 0.004 }).svg;
    s += k.photo(photo, x + w * 0.66, y + h * 0.42, w * 0.27, h * 0.48, { size, rx: m * 0.015 });
    s += circle(x + w * 0.66, y + h * 0.42, m * 0.05, pal.b);
    if (sub) s += text(x + m * 0.07, y + h - m * 0.08, fit(sub, w * 0.5, { size: m * 0.036, maxLines: 1 }).lines, { size: m * 0.036, fill: pal.ink, opacity: 0.7, weight: 600 });
    return s;
  },
  /** soft mesh gradient (blurred colour blobs on a light page), big clean headline bottom-left, small corner details */
  mesh(k, o) {
    const { x, y, w, h, pal, title, sub, eyebrow, brand } = P(o); const m = Math.min(w, h);
    const bl = k.blur(m * 0.09);
    const dk = o.dark ?? isDark(pal.bg);
    let s = `<g${k.clipRect(x, y, w, h)}>` + rect(x, y, w, h, dk ? pal.dark : "#f7f8fb") + `<g${bl}>` + circle(x + w * 0.78, y + h * 0.32, m * 0.42, pal.a, ' opacity=".85"') + circle(x + w * 0.95, y + h * 0.8, m * 0.34, pal.b, ' opacity=".8"') + circle(x + w * 0.55, y + h * 0.05, m * 0.26, pal.soft, ' opacity=".9"') + `</g></g>`;
    const ink = dk ? "#fff" : isDark(pal.ink) ? pal.ink : "#111827";
    if (brand) s += circle(x + m * 0.1, y + m * 0.1, m * 0.025, "none", ` stroke="${ink}" stroke-width="${n(m * 0.008)}"`) + text(x + m * 0.15, y + m * 0.115, brand, { size: m * 0.04, fill: ink, weight: 700 });
    if (eyebrow) s += text(x + w - m * 0.07, y + m * 0.115, eyebrow, { size: m * 0.032, fill: ink, weight: 500, anchor: "end", opacity: 0.75 });
    const hl = headline(x + m * 0.08, y, w * 0.7, title, { size: Math.min(m * 0.2, w * 0.12), min: m * 0.06, maxLines: 2, maxH: h * 0.45, weight: 800, fill: ink, ls: -m * 0.004 });
    const ty = y + h - m * 0.1 - hl.h - (sub ? m * 0.06 : 0);
    s += headline(x + m * 0.08, ty, w * 0.7, title, { size: Math.min(m * 0.2, w * 0.12), min: m * 0.06, maxLines: 2, maxH: h * 0.45, weight: 800, fill: ink, ls: -m * 0.004 }).svg;
    if (sub) s += text(x + m * 0.08, y + h - m * 0.08, fit(sub, w * 0.6, { size: m * 0.034, maxLines: 1 }).lines, { size: m * 0.034, fill: ink, weight: 500, opacity: 0.8 });
    return s;
  },
  /** giant condensed type that bleeds off the edges (two tones), with small corner details and an optional photo */
  mega(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, brand, size } = P(o); const m = Math.min(w, h);
    const words = String(title || "").toUpperCase().split(/\s+/).filter(Boolean);
    let cut = 1, best = 1e9; for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length); if (d < best) { best = d; cut = i; } }
    const lines = words.length > 1 ? [words.slice(0, cut).join(" "), words.slice(cut).join(" ")] : words;
    const longest = Math.max(...lines.map((l) => l.length), 1);
    const fs = Math.min(h * 0.5 / Math.max(1, lines.length) * 1.15, (w * 0.98) / (longest * 0.72));
    let s = `<g${k.clipRect(x, y, w, h)}>` + rect(x, y, w, h, o.dark === false ? pal.bg : pal.dark);
    if (photo && o.withPhoto !== false) s += k.photo(photo, x + w * 0.58, y + h * 0.3, w * 0.42, h * 0.7, { size }) + rect(x + w * 0.58, y + h * 0.3, w * 0.42, h * 0.7, pal.dark, 0, ' opacity=".25"');
    const ink = o.dark === false ? pal.ink : "#fff";
    const y0 = y + h * 0.1 + fs * 0.78;
    s += text(x - fs * 0.04, y0, lines, { size: fs, lh: 0.84, weight: 900, fill: ink, font: "cond", ls: -fs * 0.01 });
    s += text(x - fs * 0.04, y0 + fs * 0.84 * lines.length, lines.slice(-1), { size: fs, weight: 900, fill: "none", stroke: pal.a, sw: m * 0.004, font: "cond", ls: -fs * 0.01, opacity: 0.9 }) + `</g>`;
    if (brand) s += text(x + w - m * 0.06, y + m * 0.08, brand, { size: m * 0.032, fill: ink, weight: 800, anchor: "end", upper: true, ls: 0.5 });
    if (eyebrow) s += text(x + m * 0.06, y + h - m * 0.06, eyebrow, { size: m * 0.032, fill: ink, weight: 700, upper: true, ls: 0.5, opacity: 0.85 });
    if (sub) s += text(x + w - m * 0.06, y + h - m * 0.06, fit(sub, w * 0.4, { size: m * 0.032, maxLines: 1 }).lines, { size: m * 0.032, fill: ink, weight: 700, anchor: "end", upper: true, ls: 0.5 });
    return s;
  },
  /** quiet luxury: muted page, centred serif title with a small kicker, thin frame and a footer band of three labels */
  serifMinimal(k, o) {
    const { x, y, w, h, pal, title, sub, eyebrow, brand } = P(o); const m = Math.min(w, h);
    const bg = o.page || pal.soft, ink = pal.ink;
    let s = rect(x, y, w, h, bg) + rect(x + m * 0.04, y + m * 0.04, w - m * 0.08, h - m * 0.08, "none", 0, ` stroke="${ink}" stroke-opacity=".25" stroke-width="${n(m * 0.003)}"`);
    s += rect(x, y + h * 0.88, w, h * 0.12, pal.a, 0, ' opacity=".9"');
    const f = fit(title, w * 0.76, { size: m * 0.16, min: m * 0.06, maxLines: 2, font: "serif", upper: true });
    const th = f.size * 0.86 + (f.lines.length - 1) * f.size * 0.96, ty = y + h * 0.44 - th / 2;
    if (eyebrow) s += text(x + w / 2, ty - m * 0.03, eyebrow, { size: m * 0.04, fill: ink, weight: 500, anchor: "middle", upper: true, ls: m * 0.006, font: "serif" });
    s += text(x + w / 2, ty + f.size * 0.86, f.lines, { size: f.size, lh: 0.96, weight: 500, fill: ink, anchor: "middle", font: "serif", upper: true, ls: f.size * 0.02 });
    if (sub) s += text(x + w / 2, ty + th + m * 0.08, fit(sub, w * 0.6, { size: m * 0.04, maxLines: 1, font: "script" }).lines, { size: m * 0.045, fill: ink, weight: 400, anchor: "middle", font: "script", opacity: 0.85 });
    const lab = [brand || "Studio", "2027", "Presented by the team"];
    lab.forEach((l, i) => { s += text(x + w * (0.12 + i * 0.38), y + h * 0.95, l, { size: m * 0.028, fill: isDark(pal.a) ? "#fff" : ink, weight: 600, anchor: i === 0 ? "start" : i === 1 ? "middle" : "end", ls: 0.4 }); });
    return s;
  },
  /** dark neon: photo with colour glow, gradient type */
  neon(k, o) {
    const { x, y, w, h, pal, photo, title, sub, eyebrow, size } = P(o); const m = Math.min(w, h);
    let s = rect(x, y, w, h, pal.dark || "#05070f") + k.photo(photo, x, y, w, h, { size, opacity: 0.45 }) + rect(x, y, w, h, k.rad([[pal.a, 0.55], [pal.dark || "#000", 0]], 0.2, 0.15, 0.8)) + rect(x, y, w, h, k.rad([[pal.b, 0.45], [pal.dark || "#000", 0]], 0.9, 0.95, 0.7));
    const gfill = k.lin([pal.b, "#ffffff", pal.a], 0);
    if (eyebrow) s += k.pill(x + m * 0.07, y + m * 0.08, eyebrow, { size: m * 0.036, fill: "none", color: pal.b, stroke: pal.b, upper: true, ls: 0.6 }).svg;
    s += headline(x + m * 0.07, y + h * 0.36, w * 0.86, title, { size: m * 0.17, min: m * 0.06, maxLines: 3, weight: 900, fill: gfill, font: o.font || "sans", ex: k.glow(pal.a, m * 0.012) }).svg;
    s += line(x + m * 0.07, y + h - m * 0.16, x + w * 0.4, y + h - m * 0.16, pal.b, m * 0.008, k.glow(pal.b, m * 0.01));
    if (sub) s += text(x + m * 0.07, y + h - m * 0.08, fit(sub, w * 0.8, { size: m * 0.04, maxLines: 1 }).lines, { size: m * 0.04, fill: "#fff", opacity: 0.85, weight: 600 });
    return s;
  },
};
export const COMPOSITIONS = Object.keys(compose);
