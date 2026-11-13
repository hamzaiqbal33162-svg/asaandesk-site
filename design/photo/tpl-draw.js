// SVG drawing of photo templates (pure module, no DOM): a template recipe (gallery.js) drawn the way the photo editor
// draws it, so a thumbnail looks like the design that opens: the real photo (cover crop to the template's shape), the
// look (an SVG colour matrix close to adjust.js), overlays (shapes, photos, text: same sizes, anchors, outlines and
// shadows as draw.js) and the frame (polaroid, mat, film, floating card, shape frames). Also the "pop" backdrops the
// background remover puts behind a cut-out (drawn at the photo's own aspect, so the editor and the thumbnail match).
import { photoUrl } from "../shared/tpl-kit.js";

const n = (v) => String(Math.round(v * 100) / 100);
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// the editor's fonts (shared/brand.js FONT_FAMILIES); thumbnails fall back to the same metric-compatible system fonts
export const FAM = {
  sans: "'AD Sans',Arial,Helvetica,'Liberation Sans',sans-serif", serif: "'AD Serif','Times New Roman',Times,'Liberation Serif',serif",
  mono: "'AD Mono','Courier New','Liberation Mono',monospace", calibri: "'AD Calibri',Calibri,Carlito,sans-serif", cambria: "'AD Cambria',Cambria,Caladea,serif",
};
/** Rough width of a text line in ems (a little generous, so fitted text never runs off the picture). */
export function em(s, fam = "sans", bold = true) {
  s = String(s ?? "");
  if (fam === "mono") return s.length * 0.62;
  let w = 0;
  for (const ch of s) w += ch === " " ? 0.28 : /[MW@%]/.test(ch) ? 0.94 : /[mw]/.test(ch) ? 0.88 : /[A-Z&]/.test(ch) ? (bold ? 0.74 : 0.68) : /[0-9]/.test(ch) ? 0.57
    : /[ijlI.,:;'!|’·]/.test(ch) ? 0.29 : /[ftr()\-–“”"]/.test(ch) ? 0.38 : /[a-z]/.test(ch) ? (bold ? 0.61 : 0.55) : 0.62;
  return w * (fam === "serif" || fam === "cambria" ? 0.95 : 1);
}
export const hexRgb = (h) => { const v = parseInt(String(h).slice(1, 7), 16) || 0; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
export const isDarkHex = (h) => { const [r, g, b] = hexRgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140; };
const contrastInk = (h) => (isDarkHex(h) ? "#ffffff" : "#1b2133");

/* ---------- the look: a rough SVG colour matrix (the real look is worked out on pixels by adjust.js) ---------- */
const DUO_COLORS = { berry: ["#2b1055", "#ff7eb3"], ocean: ["#0b2545", "#7ee8fa"], sunset: ["#3a0ca3", "#ffb703"], forest: ["#1b4332", "#d8f3dc"], lemon: ["#283618", "#fefae0"], coral: ["#22223b", "#ff8c69"], violet: ["#240046", "#c77dff"], teal: ["#03045e", "#48cae4"] };
const hex3 = (h) => hexRgb(h).map((v) => (v / 255).toFixed(3));
export function lookFilter(t, fid, extraBlur = 0) {
  const a = t.adjust || {}, f = t.filter?.[0], k = (t.filter?.[1] ?? 100) / 100;
  let sat = 1 + ((a.saturation || 0) + (a.vibrance || 0) * 0.6) / 100, br = 1 + ((a.exposure || 0) + (a.brightness || 0)) / 180, con = 1 + ((a.contrast || 0) + (a.clarity || 0) * 0.3) / 150, warm = (a.warmth || 0) / 400;
  let mono = false, sepia = false, green = 0, pink = 0, fade = (a.fade || 0) / 260;
  if (f === "mono" || f === "noir") mono = true;
  if (f === "film" || f === "old-fort") sepia = true;
  if (f === "lahore-gold" || f === "thar-dusk") warm += 0.08 * k;
  if (f === "thar-dusk") br -= 0.08 * k;
  if (f === "frost") warm -= 0.08 * k;
  if (f === "vivid") sat += 0.35 * k;
  if (f === "night") { br -= 0.15 * k; warm -= 0.05 * k; }
  if (f === "soft") { con -= 0.12 * k; fade += 0.04; }
  if (f === "karachi-sea") { warm -= 0.07 * k; sat += 0.15 * k; green += 0.02 * k; }
  if (f === "monsoon") { warm -= 0.05 * k; sat -= 0.25 * k; br -= 0.06 * k; }
  if (f === "hunza-morning") { warm -= 0.04 * k; br += 0.08 * k; con -= 0.05 * k; }
  if (f === "chai") { warm += 0.1 * k; sat -= 0.12 * k; }
  if (f === "mehndi") { green += 0.07 * k; sat += 0.1 * k; }
  if (f === "rose-petal") { pink += 0.07 * k; con -= 0.06 * k; }
  if (f === "old-fort") br -= 0.04;
  if (f === "kite-day") { sat += 0.25 * k; br += 0.05 * k; }
  if (f === "noir") con += 0.3;
  if (mono) sat = 0;
  const parts = [`<feColorMatrix type="saturate" values="${Math.max(0, sat).toFixed(2)}"/>`];
  if (sepia) parts.push(`<feColorMatrix type="matrix" values=".45 .55 .14 0 0 .38 .5 .12 0 0 .3 .4 .1 0 0 0 0 0 1 0"/>`);
  const s = (br * con) * (1 - fade), off = 0.5 - 0.5 * con + fade * 0.9;
  parts.push(`<feComponentTransfer><feFuncR type="linear" slope="${s.toFixed(3)}" intercept="${(off + warm + pink).toFixed(3)}"/><feFuncG type="linear" slope="${s.toFixed(3)}" intercept="${(off + green - pink * 0.5).toFixed(3)}"/><feFuncB type="linear" slope="${s.toFixed(3)}" intercept="${(off - warm + pink * 0.4).toFixed(3)}"/></feComponentTransfer>`);
  const blur = (a.blur || 0) / 14 + extraBlur;
  if (blur > 0) parts.push(`<feGaussianBlur stdDeviation="${blur.toFixed(1)}"/>`);
  const duo = t.duotone && DUO_COLORS[t.duotone];
  if (duo) { const A = hex3(duo[0]), B = hex3(duo[1]); parts.push(`<feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues="${A[0]} ${B[0]}"/><feFuncG type="table" tableValues="${A[1]} ${B[1]}"/><feFuncB type="table" tableValues="${A[2]} ${B[2]}"/></feComponentTransfer>`); }
  if (t.invert) parts.push(`<feComponentTransfer><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/></feComponentTransfer>`);
  return parts.length === 2 && !sepia && Math.abs(sat - 1) < 0.01 && Math.abs(s - 1) < 0.01 && Math.abs(off + warm) < 0.005 && !green && !pink ? "" : `<filter id="${fid}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">${parts.join("")}</filter>`;
}

/** The photo (cover crop) with the template's look and vignette, in a W×H box at x, y. */
export function lookPhoto(k, t, photo, x, y, W, H, size, { extraBlur = 0, clip = "" } = {}) {
  const fid = k.id("lf"), f = lookFilter(t, fid, extraBlur);
  if (f) k.defs.push(f);
  const url = photoUrl(photo, size);
  const img = url ? `<image href="${url}" x="${n(x)}" y="${n(y)}" width="${n(W)}" height="${n(H)}" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="${n(x)}" y="${n(y)}" width="${n(W)}" height="${n(H)}" fill="#8c95a8"/>`;
  let s = `<g${f ? ` filter="url(#${fid})"` : ""}${clip}>${img}</g>`;
  const v = t.adjust?.vignette || 0;
  if (v > 0) s += `<rect x="${n(x)}" y="${n(y)}" width="${n(W)}" height="${n(H)}" fill="${k.rad([["#000", 0], ["#000", 0], ["#000", Math.min(0.85, v / 90)]], 0.5, 0.5, 0.75)}"${clip}/>`;
  return s;
}

/* ---------- overlays, exactly like draw.js drawOverlay (positions are fractions of the W×H picture) ---------- */
function shapeD(kind, w, h) {
  const hw = w / 2, hh = h / 2;
  switch (kind) {
    case "triangle": return `M0 ${n(-hh)}L${n(hw)} ${n(hh)}L${n(-hw)} ${n(hh)}Z`;
    case "arrow": { const t = Math.min(h * 0.5, w * 0.35), sh = h * 0.18; return `M${n(-hw)} ${n(-sh)}L${n(hw - t)} ${n(-sh)}L${n(hw - t)} ${n(-hh)}L${n(hw)} 0L${n(hw - t)} ${n(hh)}L${n(hw - t)} ${n(sh)}L${n(-hw)} ${n(sh)}Z`; }
    case "star": { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.45 : 1; d += (i ? "L" : "M") + n(Math.cos(a) * hw * r) + " " + n(Math.sin(a) * hh * r + hh * 0.1); } return d + "Z"; }
    case "heart": return `M0 ${n(hh)}C${n(-hw * 1.1)} ${n(hh * 0.1)} ${n(-hw * 0.9)} ${n(-hh * 1.05)} 0 ${n(-hh * 0.45)}C${n(hw * 0.9)} ${n(-hh * 1.05)} ${n(hw * 1.1)} ${n(hh * 0.1)} 0 ${n(hh)}Z`;
    default: return "";
  }
}
const FADE_ANGLE = { top: 90, bottom: 270, left: 0, right: 180 };
export function overlaySvg(k, o, W, H, size = "thumb") {
  if (o.hidden) return "";
  const cx = (o.x ?? 0.5) * W, cy = (o.y ?? 0.5) * H, rot = o.rotation || 0, op = o.opacity ?? 1;
  const g = (body, cxx = cx, cyy = cy) => `<g transform="translate(${n(cxx)} ${n(cyy)})${rot ? ` rotate(${n(rot)})` : ""}"${op !== 1 ? ` opacity="${op}"` : ""}>${body}</g>`;
  if (o.type === "image") {
    const w = o.w * W, h = o.h * H, url = photoUrl(o.photo, size);
    return g(url ? `<image href="${url}" x="${n(-w / 2)}" y="${n(-h / 2)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="${n(-w / 2)}" y="${n(-h / 2)}" width="${n(w)}" height="${n(h)}" fill="#8c95a8"/>`);
  }
  if (o.type === "shape") {
    const w = o.w * W, h = o.h * H, sw = (o.strokeWidth || 0) * Math.min(W, H) * 0.01;
    let fill = o.fill === "transparent" ? "none" : o.fill || "#5b4cf0";
    if (o.fade && fill !== "none") fill = k.lin([[fill, 0], [fill, 1]], FADE_ANGLE[o.fade] ?? 90);
    const st = sw > 0 && o.shape !== "line" ? ` stroke="${o.stroke || "#ffffff"}" stroke-width="${n(sw)}" stroke-linejoin="round"` : "";
    const soft = o.soft > 0 ? k.blur(o.soft * Math.min(W, H)) : "";
    let el;
    if (o.shape === "line") el = `<path d="M${n(-w / 2)} 0H${n(w / 2)}" stroke="${o.fill}" stroke-width="${n(Math.max(1, sw || Math.min(W, H) * 0.012))}" stroke-linecap="round"/>`;
    else if (o.shape === "ellipse") el = `<ellipse rx="${n(w / 2)}" ry="${n(h / 2)}" fill="${fill}"${st}${soft}/>`;
    else if (o.shape === "rect" || o.shape === "rounded" || !o.shape) el = `<rect x="${n(-w / 2)}" y="${n(-h / 2)}" width="${n(w)}" height="${n(h)}"${o.shape === "rounded" ? ` rx="${n(Math.min(w, h) * 0.18)}"` : ""} fill="${fill}"${st}${soft}/>`;
    else el = `<path d="${shapeD(o.shape, w, h)}" fill="${fill}"${st}${soft}/>`;
    return g(el);
  }
  if (o.type === "text") {
    const fs = Math.max(2, (o.size || 0.08) * H), lines = String(o.text || " ").split("\n"), lh = fs * 1.2;
    const fam = o.family || "sans", bold = !!o.bold, pad = o.bg ? fs * 0.35 : o.outline ? fs * 0.08 : 0;
    const tw = Math.max(...lines.map((l) => em(l, fam, bold))) * fs, bw = tw + pad * 2, bh = lh * lines.length + pad * 2;
    // anchors: left / right put that edge of the box at the given fraction (app.js measures the real text the same way)
    const bx = o.left != null ? o.left * W + bw / 2 : o.right != null ? o.right * W - bw / 2 : cx;
    const al = o.align === "left" || o.left != null ? "start" : o.align === "right" || o.right != null ? "end" : "middle";
    const ax = al === "start" ? -bw / 2 + pad : al === "end" ? bw / 2 - pad : 0;
    let s = o.bg ? `<rect x="${n(-bw / 2)}" y="${n(-bh / 2)}" width="${n(bw)}" height="${n(bh)}" rx="${n(fs * 0.25)}" fill="${o.bg}"/>` : "";
    const fill = o.color === "transparent" ? "none" : o.color || "#ffffff";
    const attrs = ` font-family="${FAM[fam] || FAM.sans}" font-size="${n(fs)}" font-weight="${bold ? 700 : 400}"${o.italic ? ' font-style="italic"' : ""}${al !== "start" ? ` text-anchor="${al}"` : ""}`;
    const sh = o.shadow ? k.shadow(n(fs * 0.05), n(fs * 0.18), 0.5, "#000000") : "";
    const ys = lines.map((_, i) => -bh / 2 + pad + lh * (i + 0.5) + fs * 0.35);
    const tspans = (lines.length === 1 ? esc(lines[0]) : lines.map((l, i) => `<tspan x="${n(ax)}" y="${n(ys[i])}">${esc(l)}</tspan>`).join(""));
    const pos = lines.length === 1 ? ` x="${n(ax)}" y="${n(ys[0])}"` : "";
    if (o.outline) s += `<text${pos}${attrs} fill="none" stroke="${o.outline}" stroke-width="${n(fs * 0.14)}" stroke-linejoin="round">${tspans}</text>`;
    s += `<text${pos}${attrs} fill="${fill}"${sh}>${tspans}</text>`;
    return g(s, bx, cy);
  }
  return "";
}

/* ---------- frames, like draw.js drawFrame ---------- */
export function borderPad(frame, W, H) {
  const z = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!frame || !frame.id || frame.id === "none" || SHAPES.has(frame.id)) return z;
  const u = Math.round(((frame.width ?? 4) / 100) * Math.max(W, H) * 100) / 100;
  switch (frame.id) {
    case "solid": case "double": return { top: u, right: u, bottom: u, left: u };
    case "polaroid": return { top: u, right: u, bottom: u * 3.5, left: u };
    case "film": return { top: u * 2, right: u * 0.5, bottom: u * 2, left: u * 0.5 };
    case "shadow": return { top: u * 1.5, right: u * 1.5, bottom: u * 1.5, left: u * 1.5 };
    default: return z;
  }
}
const SHAPES = new Set(["rounded", "circle", "heart", "star", "hexagon", "arch", "diamond", "blob"]);
export function frameShapeD(id, W, H, inset = 0) {
  const w = W - inset * 2, h = H - inset * 2, X = inset, Y = inset, cx = W / 2, cy = H / 2;
  switch (id) {
    case "circle": return `M${n(cx - w / 2)} ${n(cy)}A${n(w / 2)} ${n(h / 2)} 0 1 0 ${n(cx + w / 2)} ${n(cy)}A${n(w / 2)} ${n(h / 2)} 0 1 0 ${n(cx - w / 2)} ${n(cy)}Z`;
    case "rounded": { const r = Math.min(W, H) * 0.08; return `M${n(X + r)} ${n(Y)}H${n(X + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(X + w)} ${n(Y + r)}V${n(Y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(X + w - r)} ${n(Y + h)}H${n(X + r)}A${n(r)} ${n(r)} 0 0 1 ${n(X)} ${n(Y + h - r)}V${n(Y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(X + r)} ${n(Y)}Z`; }
    case "heart": return `M${n(cx)} ${n(Y + h)}C${n(X - w * 0.05)} ${n(Y + h * 0.55)} ${n(X + w * 0.02)} ${n(Y - h * 0.02)} ${n(cx)} ${n(Y + h * 0.26)}C${n(X + w * 0.98)} ${n(Y - h * 0.02)} ${n(X + w * 1.05)} ${n(Y + h * 0.55)} ${n(cx)} ${n(Y + h)}Z`;
    case "star": { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.46 : 1; d += (i ? "L" : "M") + n(cx + Math.cos(a) * (w / 2) * r) + " " + n(Y + h * 0.53 + Math.sin(a) * (h * 0.53) * r); } return d + "Z"; }
    case "hexagon": { let d = ""; for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; d += (i ? "L" : "M") + n(cx + Math.cos(a) * (w / 2)) + " " + n(cy + Math.sin(a) * (h / 2)); } return d + "Z"; }
    case "arch": { const r = w / 2, ry = Math.min(h, r); return `M${n(X)} ${n(Y + h)}V${n(Y + ry)}A${n(r)} ${n(ry)} 0 0 1 ${n(X + w)} ${n(Y + ry)}V${n(Y + h)}Z`; }
    case "diamond": return `M${n(cx)} ${n(Y)}L${n(X + w)} ${n(cy)}L${n(cx)} ${n(Y + h)}L${n(X)} ${n(cy)}Z`;
    case "blob": {
      const kk = [1, 0.9, 1.04, 0.92, 1.02, 0.88, 1.05, 0.95];
      const pts = kk.map((r, i) => { const a = (i / kk.length) * Math.PI * 2; return [cx + Math.cos(a) * (w / 2) * r * 0.97, cy + Math.sin(a) * (h / 2) * r * 0.97]; });
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const m0 = mid(pts[pts.length - 1], pts[0]);
      let d = `M${n(m0[0])} ${n(m0[1])}`;
      for (let i = 0; i < pts.length; i++) { const m = mid(pts[i], pts[(i + 1) % pts.length]); d += `Q${n(pts[i][0])} ${n(pts[i][1])} ${n(m[0])} ${n(m[1])}`; }
      return d + "Z";
    }
    default: return `M${n(X)} ${n(Y)}H${n(X + w)}V${n(Y + h)}H${n(X)}Z`;
  }
}
/** Wraps a W×H picture body in its frame; returns { svg, w, h } (the framed size). */
export function framed(k, frame, body, W, H) {
  if (!frame || !frame.id || frame.id === "none") return { svg: body, w: W, h: H };
  const p = borderPad(frame, W, H), OW = W + p.left + p.right, OH = H + p.top + p.bottom, color = frame.color || "#ffffff";
  const u = Math.max(1, ((frame.width ?? 4) / 100) * Math.max(W, H));
  const inner = (b) => `<g transform="translate(${n(p.left)} ${n(p.top)})">${b}</g>`;
  switch (frame.id) {
    case "solid": case "polaroid": return { w: OW, h: OH, svg: `<rect width="${n(OW)}" height="${n(OH)}" fill="${color}"/>${inner(body)}` };
    case "double": { const d = u * 0.45; return { w: OW, h: OH, svg: `<rect width="${n(OW)}" height="${n(OH)}" fill="${color}"/>${inner(body)}<rect x="${n(p.left - d)}" y="${n(p.top - d)}" width="${n(W + 2 * d)}" height="${n(H + 2 * d)}" fill="none" stroke="${contrastInk(color)}" stroke-width="${n(Math.max(0.6, u * 0.12))}"/>` }; }
    case "film": {
      const hole = p.top * 0.42, gap = hole * 0.9; let holes = "";
      for (let x = gap; x + hole < OW; x += hole + gap) holes += `<rect x="${n(x)}" y="${n((p.top - hole) / 2)}" width="${n(hole)}" height="${n(hole * 0.8)}" rx="${n(hole * 0.2)}"/><rect x="${n(x)}" y="${n(OH - p.bottom + (p.bottom - hole) / 2)}" width="${n(hole)}" height="${n(hole * 0.8)}" rx="${n(hole * 0.2)}"/>`;
      return { w: OW, h: OH, svg: `<rect width="${n(OW)}" height="${n(OH)}" fill="${color === "#ffffff" ? "#111318" : color}"/>${inner(body)}<g fill="#f4f4f6">${holes}</g>` };
    }
    case "shadow": {
      const r = Math.min(W, H) * 0.03, cp = k.clipRect(0, 0, W, H, r);
      return { w: OW, h: OH, svg: `<rect width="${n(OW)}" height="${n(OH)}" fill="${color}"/><rect x="${n(p.left)}" y="${n(p.top)}" width="${n(W)}" height="${n(H)}" rx="${n(r)}" fill="#fff"${k.shadow(n(u * 0.35), n(u * 1.2), 0.35, "#1b2133")}/>${inner(`<g${cp}>${body}</g>`)}` };
    }
    default: {
      if (!SHAPES.has(frame.id)) return { svg: body, w: W, h: H };
      const cp = k.clip(`<path d="${frameShapeD(frame.id, W, H)}"/>`), lw = u * 0.5;
      return { w: W, h: H, svg: `<g${cp}>${body}</g>` + (frame.width > 0 ? `<path d="${frameShapeD(frame.id, W, H, lw / 2)}" fill="none" stroke="${color}" stroke-width="${n(lw)}" stroke-linejoin="round"/>` : "") };
    }
  }
}

/* ---------- "pop" backdrops: vivid gradient + pattern + a shape behind the cut-out (+ an optional big word) ---------- */
// Drawn in a VW × VH box whose short side is 1000, so any photo aspect gets the same design (centred).
function blobD(cx, cy, r, seed = 3) {
  const kk = [1, 0.86, 1.06, 0.9, 1.03, 0.84, 1.08, 0.93, 1.02].map((v, i) => v * (1 + 0.04 * Math.sin(seed * 7 + i * 3)));
  const pts = kk.map((rr, i) => { const a = (i / kk.length) * Math.PI * 2 - 0.4; return [cx + Math.cos(a) * r * rr, cy + Math.sin(a) * r * rr]; });
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const m0 = mid(pts[pts.length - 1], pts[0]);
  let d = `M${n(m0[0])} ${n(m0[1])}`;
  for (let i = 0; i < pts.length; i++) { const m = mid(pts[i], pts[(i + 1) % pts.length]); d += `Q${n(pts[i][0])} ${n(pts[i][1])} ${n(m[0])} ${n(m[1])}`; }
  return d + "Z";
}
/** Geometry of the backdrop's main shape (also the clip of the photo in the thumbnail's cut-out look). */
export function popShape(spec, VW, VH, grow = 1) {
  const m = Math.min(VW, VH), cx = VW / 2, cy = VH * (spec.cy ?? 0.54), R = m * (spec.r ?? 0.36) * grow;
  switch (spec.shape) {
    case "circle": case "ring": case "stack": return `M${n(cx - R)} ${n(cy)}A${n(R)} ${n(R)} 0 1 0 ${n(cx + R)} ${n(cy)}A${n(R)} ${n(R)} 0 1 0 ${n(cx - R)} ${n(cy)}Z`;
    case "arch": { const w = R * 1.7, top = cy - R * 1.25; return `M${n(cx - w / 2)} ${n(VH)}V${n(top + w / 2)}A${n(w / 2)} ${n(w / 2)} 0 0 1 ${n(cx + w / 2)} ${n(top + w / 2)}V${n(VH)}Z`; }
    case "square": { const s = R * 1.75, r = s * 0.16; return `M${n(cx - s / 2 + r)} ${n(cy - s / 2)}H${n(cx + s / 2 - r)}Q${n(cx + s / 2)} ${n(cy - s / 2)} ${n(cx + s / 2)} ${n(cy - s / 2 + r)}V${n(cy + s / 2 - r)}Q${n(cx + s / 2)} ${n(cy + s / 2)} ${n(cx + s / 2 - r)} ${n(cy + s / 2)}H${n(cx - s / 2 + r)}Q${n(cx - s / 2)} ${n(cy + s / 2)} ${n(cx - s / 2)} ${n(cy + s / 2 - r)}V${n(cy - s / 2 + r)}Q${n(cx - s / 2)} ${n(cy - s / 2)} ${n(cx - s / 2 + r)} ${n(cy - s / 2)}Z`; }
    case "half": return `M${n(cx - R * 1.4)} ${n(VH)}A${n(R * 1.4)} ${n(R * 1.4)} 0 0 1 ${n(cx + R * 1.4)} ${n(VH)}Z`;
    case "diamond": return `M${n(cx)} ${n(cy - R * 1.25)}L${n(cx + R * 1.25)} ${n(cy)}L${n(cx)} ${n(cy + R * 1.25)}L${n(cx - R * 1.25)} ${n(cy)}Z`;
    case "none": return "";
    default: return blobD(cx, cy, R * 1.05, spec.seed || 3);
  }
}
const lin = (id, a, b, ang) => { const r = (ang * Math.PI) / 180, dx = Math.cos(r) / 2, dy = Math.sin(r) / 2; return `<linearGradient id="${id}" x1="${n(0.5 - dx)}" y1="${n(0.5 - dy)}" x2="${n(0.5 + dx)}" y2="${n(0.5 + dy)}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`; };
export function popBody(spec, VW, VH, p) {
  const c1 = spec.c1 || "#ff7a59", c2 = spec.c2 || "#5b4cf0", c3 = spec.c3 || "#1b2133", m = Math.min(VW, VH), cx = VW / 2, cy = VH * (spec.cy ?? 0.54);
  const defs = [];
  let s = "";
  const g = spec.grad || "linear";
  if (g === "radial") { defs.push(`<radialGradient id="${p}g" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`); s += `<rect width="${VW}" height="${VH}" fill="url(#${p}g)"/>`; }
  else if (g === "flat") s += `<rect width="${VW}" height="${VH}" fill="${c1}"/>`;
  else if (g === "split") s += `<rect width="${VW}" height="${VH}" fill="${c1}"/><path d="M${n(VW * 0.62)} 0H${VW}V${VH}H${n(VW * 0.38)}Z" fill="${c2}"/>`;
  else { defs.push(lin(p + "g", c1, c2, g === "diag" ? 45 : 90)); s += `<rect width="${VW}" height="${VH}" fill="url(#${p}g)"/>`; }
  const pc = spec.pc || "#ffffff", po = spec.po ?? 0.22;
  switch (spec.pattern) {
    case "dots": for (let y = 30; y < VH; y += 70) for (let x = 30 + ((y / 70) % 2) * 35; x < VW; x += 70) s += `<circle cx="${n(x)}" cy="${n(y)}" r="9" fill="${pc}" opacity="${po}"/>`; break;
    case "rays": for (let i = 0; i < 18; i++) { const a = (i * 20 * Math.PI) / 180, b = ((i * 20 + 10) * Math.PI) / 180, R = Math.max(VW, VH); s += `<path d="M${n(cx)} ${n(cy)}L${n(cx + R * Math.cos(a))} ${n(cy + R * Math.sin(a))}L${n(cx + R * Math.cos(b))} ${n(cy + R * Math.sin(b))}Z" fill="${pc}" opacity="${po}"/>`; } break;
    case "stripes": for (let x = -VH; x < VW; x += 120) s += `<path d="M${n(x)} ${VH}L${n(x + VH)} 0h50L${n(x + 50)} ${VH}Z" fill="${pc}" opacity="${po}"/>`; break;
    case "grid": for (let x = 0; x <= VW; x += 80) s += `<path d="M${x} 0V${VH}" stroke="${pc}" stroke-width="3" opacity="${po}"/>`; for (let y = 0; y <= VH; y += 80) s += `<path d="M0 ${y}H${VW}" stroke="${pc}" stroke-width="3" opacity="${po}"/>`; break;
    case "halftone": for (let y = 25; y < VH; y += 50) for (let x = 25; x < VW; x += 50) s += `<circle cx="${x}" cy="${y}" r="${n(3 + (x / VW + y / VH) * 9)}" fill="${pc}" opacity="${po}"/>`; break;
    case "waves": for (let i = 0; i < 6; i++) s += `<path d="M0 ${n(VH * 0.3 + i * VH * 0.12)}C${n(VW * 0.25)} ${n(VH * 0.24 + i * VH * 0.12)} ${n(VW * 0.5)} ${n(VH * 0.38 + i * VH * 0.12)} ${VW} ${n(VH * 0.28 + i * VH * 0.12)}V${VH}H0Z" fill="${pc}" opacity="${n(po * 0.45)}"/>`; break;
    case "confetti": for (let i = 0; i < 46; i++) { const x = (i * 211) % VW, y = (i * 137) % VH, c = [pc, c3, "#ffd166", c2][i % 4]; s += i % 3 ? `<rect x="${x}" y="${y}" width="34" height="13" rx="5" fill="${c}" opacity=".8" transform="rotate(${(i * 53) % 180} ${x} ${y})"/>` : `<circle cx="${x}" cy="${y}" r="11" fill="${c}" opacity=".8"/>`; } break;
    case "bokeh": for (let i = 0; i < 26; i++) s += `<circle cx="${(i * 197) % VW}" cy="${(i * 113) % VH}" r="${30 + (i % 5) * 18}" fill="${[pc, "#ffd166", c1][i % 3]}" opacity="${n(0.1 + (i % 4) * 0.06)}"/>`; break;
    case "stars": for (let i = 0; i < 70; i++) s += `<circle cx="${(i * 233) % VW}" cy="${(i * 151) % VH}" r="${n(1.5 + (i % 4) * 1.2)}" fill="#fff" opacity="${n(0.4 + (i % 5) / 10)}"/>`; break;
    case "terrazzo": for (let i = 0; i < 60; i++) { const x = (i * 173) % VW, y = (i * 97) % VH; s += `<path d="M${x} ${y}l${16 + (i % 4) * 8} ${6 + (i % 3) * 6}l-8 ${14 + (i % 5) * 4}z" fill="${[c2, c3, "#ffffff", "#ffd166"][i % 4]}" opacity=".6"/>`; } break;
    case "marble": for (let i = 0; i < 9; i++) s += `<path d="M${n(-60 + (i * VW) / 7)} 0C${n(40 + (i * VW) / 7)} ${n(VH * 0.25)} ${n(-60 + (i * VW) / 7)} ${n(VH * 0.55)} ${n(80 + (i * VW) / 7)} ${VH}" stroke="${i % 2 ? "#c9c6c1" : c2}" stroke-width="${2 + (i % 3)}" fill="none" opacity=".4"/>`; break;
    case "wood": s += `<rect y="${n(VH * 0.7)}" width="${VW}" height="${n(VH * 0.3)}" fill="#a0693f"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M0 ${n(VH * 0.73 + i * VH * 0.045)}C${n(VW * 0.3)} ${n(VH * 0.72 + i * VH * 0.045)} ${n(VW * 0.7)} ${n(VH * 0.745 + i * VH * 0.045)} ${VW} ${n(VH * 0.73 + i * VH * 0.045)}" stroke="#7d4f2c" stroke-width="4" fill="none"/>`).join("") + `<rect y="${n(VH * 0.7)}" width="${VW}" height="14" fill="#7d4f2c"/>`; break;
    case "floor": s += `<ellipse cx="${n(cx)}" cy="${n(VH * 0.93)}" rx="${n(m * 0.55)}" ry="${n(m * 0.08)}" fill="${c3}" opacity=".18"/>`; break;
    default: break;
  }
  if (spec.word) {
    const w = String(spec.word), fs = Math.min(m * 0.42, (VW * 0.94) / Math.max(1, em(w, "sans", true)));
    s += `<text x="${n(cx)}" y="${n(VH * (spec.wordY ?? 0.36) + fs * 0.35)}" text-anchor="middle" font-family="${FAM.sans}" font-weight="700" font-size="${n(fs)}" fill="${spec.wc || "#ffffff"}" opacity="${spec.wo ?? 0.9}">${esc(w)}</text>`;
  }
  const d = popShape(spec, VW, VH);
  if (d) {
    const sc = spec.sc || c3;
    if (spec.shape === "ring") s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(m * (spec.r ?? 0.36) * 1.12)}" fill="none" stroke="${sc}" stroke-width="${n(m * 0.03)}" opacity=".9"/><path d="${d}" fill="${spec.sf || "#ffffff"}" opacity=".95"/>`;
    else if (spec.shape === "stack") s += `<circle cx="${n(cx + m * 0.1)}" cy="${n(cy - m * 0.06)}" r="${n(m * (spec.r ?? 0.36))}" fill="${sc}" opacity=".9"/><path d="${d}" fill="${spec.sf || "#ffffff"}"/>`;
    else s += `<path d="${d}" fill="${spec.sf || sc}"${spec.shape === "half" ? "" : ` transform="translate(${n(m * 0.025)} ${n(m * 0.03)})" opacity=".35"`}/>` + (spec.shape === "half" ? "" : `<path d="${d}" fill="${spec.sf || sc}"/>`);
  }
  return (defs.length ? `<defs>${defs.join("")}</defs>` : "") + s;
}
/** Units of the pop box for a w×h picture (short side 1000). */
export const popBox = (w, h) => { const s = 1000 / Math.min(w, h); return [Math.round(w * s), Math.round(h * s)]; };
