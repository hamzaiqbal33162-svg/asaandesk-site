// Left-rail kit items (Elements, Text, Tools) as real HTML for the code generator's "My code": headings and paragraphs
// with their font and colour, <img>, inline <svg>, <table>, a CSS grid of picture spots, <video>, <audio>. Pure string
// builders (no DOM) so they are easy to test; app.js puts the result before </body> of the user's code.
import { FONT_FAMILIES } from "../shared/brand.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** A web page's "shorter side" for kit sizes (rel): a 1280 x 640 desktop view. */
export const PAGE_SIDE = 640;
const px = (rel, def) => Math.round(Math.max(0.02, Math.min(1.5, Number(rel) || def)) * PAGE_SIDE);
const color = (c) => (/^#[0-9a-f]{3,8}$/i.test(String(c || "")) || /^(rgb|hsl)a?\([\d\s.,%]+\)$/i.test(String(c || "")) ? String(c) : "");
/** CSS font stack for a FONT_FAMILIES key (without the editor-only "AD …" web font), or a CSS family name. */
export function fontCss(f) {
  if (!f) return "";
  if (FONT_FAMILIES[f]) return FONT_FAMILIES[f].css.split(",").slice(1).join(",").trim();
  const name = String(f).replace(/[^\w\s,'"-]/g, "").trim();
  return name ? `${/[\s]/.test(name) && !/["',]/.test(name) ? `"${name}"` : name}, sans-serif` : "";
}
const ROLE = { heading: ["h1", 0.075, "Add a heading"], subheading: ["h2", 0.045, "Add a subheading"], body: ["p", 0.03, "Add a little bit of body text"], caption: ["p", 0.022, "Add a caption"] };

/** One kit text spec -> a heading or paragraph with inline style. */
export function textHtml(spec = {}, { block = true } = {}) {
  const [tag, defRel, defText] = ROLE[spec.role] || ROLE.body;
  const st = [`margin:${block ? ".3em auto" : "0"}`, `font-size:${px(spec.rel, defRel)}px`];
  const fam = fontCss(spec.family); if (fam) st.push(`font-family:${fam}`);
  const w = Number(spec.weight) || (spec.bold ? 700 : spec.role === "heading" || spec.role === "subheading" ? 700 : 0); if (w) st.push(`font-weight:${w}`);
  if (spec.italic) st.push("font-style:italic");
  const c = color(spec.color); if (c) st.push(`color:${c}`);
  if (["left", "center", "right", "justify"].includes(spec.align)) st.push(`text-align:${spec.align}`);
  if (Number(spec.letterSpacing)) st.push(`letter-spacing:${Math.round(Number(spec.letterSpacing) * 1000) / 1000}em`);
  if (Number(spec.lineHeight)) st.push(`line-height:${Number(spec.lineHeight)}`);
  if (spec.uppercase) st.push("text-transform:uppercase");
  const sc = color(spec.stroke); if (sc && Number(spec.strokeWidth)) st.push(`-webkit-text-stroke:${Math.round(Number(spec.strokeWidth) * 1000) / 1000}em ${sc}`);
  const bg = color(spec.background); if (bg) st.push(`background:${bg}`, "padding:.15em .4em", "display:inline-block");
  if (Number(spec.width)) st.push(`max-width:${px(spec.width, 0.5)}px`);
  const text = esc(String(spec.content ?? "").trim() || defText).replace(/\n/g, "<br>");
  return `<${tag} style="${st.join(";")}">${text}</${tag}>`;
}
/** Font combinations: the boxes together in one block, in reading order (top to bottom by dy, else as given). */
export function groupHtml(specs = []) {
  const list = (Array.isArray(specs) ? specs : [specs]).map((s, i) => ({ s, i })).sort((a, b) => (Number(a.s.dy) || 0) - (Number(b.s.dy) || 0) || a.i - b.i);
  const align = list.find((x) => x.s.align)?.s.align || "center";
  return `<div style="margin:24px auto;max-width:${PAGE_SIDE}px;text-align:${["left", "center", "right"].includes(align) ? align : "center"}">\n  ${list.map((x) => textHtml(x.s, { block: false })).join("\n  ")}\n</div>`;
}
/** <img> sized like the kit asked (rel of the page's shorter side), centred. */
export function imageHtml(src, name = "Picture", rel = 0.6) {
  return `<img src="${esc(src)}" alt="${esc(String(name || "").replace(/\.[a-z0-9]{2,4}$/i, ""))}" style="display:block;width:${px(rel, 0.6)}px;max-width:100%;height:auto;margin:16px auto">`;
}
/** Inline SVG (graphics, shapes, charts, frames, drawings) without scripts or event handlers, scaled to rel. */
export function svgHtml(markup, meta = {}) {
  let s = String(markup || "").replace(/<\?xml[^>]*>/gi, "").replace(/<!doctype[^>]*>/gi, "").trim();
  if (!/^<svg[\s>]/i.test(s)) throw new Error("That graphic could not be added.");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/(href\s*=\s*["'])\s*javascript:[^"']*/gi, "$1#");
  s = s.replace(/<svg\b([^>]*)>/i, (m, a) => `<svg${a.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, "")} width="100%" style="display:block;height:auto">`);
  if (!/xmlns=/.test(s.slice(0, 300))) s = s.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  const w = px(meta.rel, 0.3), a = Number(meta.aspect) || 1, wide = a >= 1 ? w : Math.round(w * a);
  return `<div style="width:${wide}px;max-width:100%;margin:16px auto"${meta.name ? ` aria-label="${esc(meta.name)}" role="img"` : ""}>${s}</div>`;
}
/** A real <table> (header row, stripes and border colours from the kit's table style). */
export function tableHtml(spec = {}) {
  const rows = Math.max(1, Math.min(40, +spec.rows || spec.cells?.length || 3)), cols = Math.max(1, Math.min(12, +spec.cols || spec.cells?.[0]?.length || 3));
  const st = spec.style || {}, head = spec.header !== false;
  const hb = color(st.head) || "#5b4cf0", stripe = color(st.stripe), line = color(st.border) || "#d9dbe7";
  const cell = (r, c) => esc(String(spec.cells?.[r]?.[c] ?? ""));
  let h = `<table style="width:100%;max-width:${Math.round(PAGE_SIDE * 1.2)}px;margin:16px auto;border-collapse:collapse;font:15px/1.45 system-ui,sans-serif">\n`;
  for (let r = 0; r < rows; r++) {
    const th = head && r === 0, bg = th ? hb : stripe && r % 2 === (head ? 0 : 1) ? stripe : "";
    h += `  <tr${bg ? ` style="background:${bg}"` : ""}>`;
    for (let c = 0; c < cols; c++) h += `<${th ? "th" : "td"} style="border:1px solid ${line};padding:8px 12px;text-align:left${th ? ";color:#fff" : ""}">${cell(r, c)}</${th ? "th" : "td"}>`;
    h += "</tr>\n";
  }
  return h + "</table>";
}
/** Layout grid: picture spots placed like the kit's cells (0..1); put an <img> in each spot. */
export function gridHtml(spec = {}) {
  const cells = Array.isArray(spec.cells) && spec.cells.length ? spec.cells.slice(0, 16) : [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]];
  const g = Math.max(0, Math.min(40, Number(spec.gap) || 8)) / 2;
  const pc = (v) => Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 10000) / 100;
  const spots = cells.map(([x, y, w, h], i) => `  <div style="position:absolute;left:${pc(x)}%;top:${pc(y)}%;width:${pc(w)}%;height:${pc(h)}%;padding:${g}px;box-sizing:border-box"><div style="width:100%;height:100%;background:#e7e9f2;border-radius:8px;display:grid;place-items:center;color:#7a8099;font:13px system-ui,sans-serif">Picture ${i + 1}</div></div>`);
  return `<!-- Layout grid: replace each "Picture" spot with <img src="…" style="width:100%;height:100%;object-fit:cover;border-radius:8px"> -->\n<div style="position:relative;width:100%;max-width:${Math.round(PAGE_SIDE * 1.2)}px;aspect-ratio:4/3;margin:16px auto">\n${spots.join("\n")}\n</div>`;
}
/** A video the page can play: a video file (data:, https .mp4/.webm…) or a YouTube / Vimeo link; else "" (not playable). */
export function videoHtml(spec = {}) {
  const src = String(spec.src || "").trim(), a = Number(spec.aspect) || 16 / 9, w = px(spec.rel, 0.9);
  const ratio = `${Math.round(a * 1000)}/1000`;
  let m = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i.exec(src);
  if (m) return `<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="${esc(spec.name || "Video")}" style="display:block;width:${w}px;max-width:100%;aspect-ratio:${ratio};border:0;margin:16px auto" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  m = /^(?:https?:\/\/)?(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{5,12})/i.exec(src);
  if (m) return `<iframe src="https://player.vimeo.com/video/${m[1]}" title="${esc(spec.name || "Video")}" style="display:block;width:${w}px;max-width:100%;aspect-ratio:${ratio};border:0;margin:16px auto" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  if (/^data:video\/[\w.+-]+;base64,/i.test(src) || /^https?:\/\/[^\s"'<>]+\.(mp4|webm|ogv|mov|m4v)(\?[^\s"'<>]*)?$/i.test(src) || /^\/[^\s"'<>]+\.(mp4|webm|ogv|mov|m4v)$/i.test(src))
    return `<video src="${esc(src)}"${spec.poster && !/^blob:/.test(spec.poster) ? ` poster="${esc(spec.poster)}"` : ""} controls playsinline preload="metadata" style="display:block;width:${w}px;max-width:100%;aspect-ratio:${ratio};margin:16px auto;background:#000"></video>`;
  if (/^data:image\/svg\+xml|\.svg(\?|$)/i.test(src)) return imageHtml(src, spec.name || "Animation", spec.rel || 0.5); // our animated clips are moving SVG pictures
  return "";
}
/** An audio player for a sound file (data: or https/same-site .mp3/.wav/.ogg/.m4a); "" when not a file. */
export function audioHtml(src, name = "Sound") {
  const s = String(src || "").trim();
  if (!(/^data:audio\/[\w.+-]+;base64,/i.test(s) || /^(https?:\/\/[^\s"'<>]+|\/[^\s"'<>]+)\.(mp3|wav|ogg|oga|m4a|aac|opus|webm)(\?[^\s"'<>]*)?$/i.test(s))) return "";
  return `<figure style="margin:16px auto;max-width:480px;font:14px system-ui,sans-serif"><figcaption style="margin-bottom:6px">${esc(name)}</figcaption><audio src="${esc(s)}" controls preload="metadata" style="width:100%"></audio></figure>`;
}
/** Puts a snippet before the last </body> (or at the end). -> { html, start, end } (where the snippet sits). */
export function spliceBody(html, snippet) {
  const src = String(html || ""), add = String(snippet || "");
  const i = src.search(/<\/body>(?![\s\S]*<\/body>)/i);
  if (i < 0) { const pre = src && !src.endsWith("\n") ? src + "\n" : src; return { html: pre + add + "\n", start: pre.length, end: pre.length + add.length }; }
  const before = src.slice(0, i).replace(/\s*$/, "\n");
  return { html: before + add + "\n" + src.slice(i), start: before.length, end: before.length + add.length };
}
