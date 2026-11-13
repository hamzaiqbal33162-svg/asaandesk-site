// SVG rendering of layers and pages. Pure (string output, no DOM), so the same code draws:
// the editor canvas (one inline <svg> per layer), template thumbnails (Templates Marketplace) and the SVG export.
import { layoutText, underlineMetrics, strikeMetrics, CSS_FAMILY } from "./textlayout.js";
import { textPaint, curveLayout, curveOffset, hasGradient, gradientOk } from "./textfx.js";
import { shapePrims, elementPrims, framePath, rectPath, gradientLine } from "./shapes.js";

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v) => +(+v).toFixed(2);
const attrFamily = (fam) => (CSS_FAMILY[fam] || CSS_FAMILY.sans).replace(/"/g, "'");

/** SVG markup for a primitive list (paths + text), in its own coordinates. */
export function primsMarkup(prims) {
  return prims.map((p) => {
    if (p.t !== undefined) {
      const anchor = p.anchor === "middle" || p.anchor === "center" ? "middle" : p.anchor === "end" || p.anchor === "right" ? "end" : "start";
      return `<text x="${n(p.x)}" y="${n(p.y)}" font-size="${n(p.size)}" font-family="${attrFamily(p.font)}" font-weight="${p.bold ? 700 : 400}" font-style="${p.italic ? "italic" : "normal"}" text-anchor="${anchor}" fill="${p.fill || "#000000"}"${p.ls ? ` letter-spacing="${n(p.ls)}"` : ""}${p.op != null && p.op < 1 ? ` opacity="${p.op}"` : ""} style="font-kerning:none;white-space:pre">${esc(p.t)}</text>`;
    }
    const a = [`d="${p.d}"`, `fill="${p.fill && p.fill !== "none" ? p.fill : "none"}"`];
    if (p.stroke && p.stroke !== "none") a.push(`stroke="${p.stroke}"`, `stroke-width="${n(p.sw ?? 1)}"`, `stroke-linecap="${p.cap || "round"}"`, `stroke-linejoin="${p.join || "round"}"`);
    if (p.op != null && p.op < 1) a.push(`opacity="${p.op}"`);
    if (p.dash && p.stroke && p.stroke !== "none") a.push(`stroke-dasharray="${p.dash.map(n).join(" ")}"`);
    return `<path ${a.join(" ")}/>`;
  }).join("");
}

/** SVG <filter> equivalent of the CSS image filters (Filter Effects spec definitions). */
export function svgImageFilter(id, f) {
  const fx = [];
  const lin = (slope, icpt) => `<feComponentTransfer><feFuncR type="linear" slope="${slope}" intercept="${icpt}"/><feFuncG type="linear" slope="${slope}" intercept="${icpt}"/><feFuncB type="linear" slope="${slope}" intercept="${icpt}"/></feComponentTransfer>`;
  if (f.brightness != null && f.brightness !== 1) fx.push(lin(n(f.brightness), 0));
  if (f.contrast != null && f.contrast !== 1) fx.push(lin(n(f.contrast), n(0.5 - 0.5 * f.contrast)));
  if (f.saturate != null && f.saturate !== 1) fx.push(`<feColorMatrix type="saturate" values="${n(f.saturate)}"/>`);
  if (f.grayscale) { const g = Math.min(1, f.grayscale), k = 1 - g; fx.push(`<feColorMatrix type="matrix" values="${[0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k, 0, 0, 0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k, 0, 0, 0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k, 0, 0, 0, 0, 0, 1, 0].map((v) => n(v)).join(" ")}"/>`); }
  if (f.sepia) { const s = Math.min(1, f.sepia), k = 1 - s; fx.push(`<feColorMatrix type="matrix" values="${[0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k, 0, 0, 0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k, 0, 0, 0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k, 0, 0, 0, 0, 0, 1, 0].map((v) => n(v)).join(" ")}"/>`); }
  if (f.hue) fx.push(`<feColorMatrix type="hueRotate" values="${n(f.hue)}"/>`);
  if (f.blur) fx.push(`<feGaussianBlur stdDeviation="${n(f.blur)}"/>`);
  if (!fx.length) return "";
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">${fx.join("")}</filter>`;
}

/** Characters visible for the typewriter animation (reveal 0..1 of the text). */
export function revealRuns(lines, reveal) {
  if (reveal == null || reveal >= 1) return lines;
  const total = lines.reduce((s, l) => s + l.runs.reduce((a, r) => a + [...r.t].length, 0), 0);
  let left = Math.floor(total * Math.max(0, reveal));
  return lines.map((l) => ({ ...l, runs: l.runs.map((r) => { const ch = [...r.t]; const take = Math.max(0, Math.min(ch.length, left)); left -= take; return { ...r, t: ch.slice(0, take).join("") }; }) }));
}

/** One gradient stop; #rrggbbaa colours (see-through photo shades in templates) become colour + stop-opacity. */
const stopTag = (c, at) => {
  const m = /^(#[0-9a-f]{6})([0-9a-f]{2})$/i.exec(c || "");
  return m ? `<stop offset="${n(at)}" stop-color="${m[1]}" stop-opacity="${n(parseInt(m[2], 16) / 255)}"/>` : `<stop offset="${n(at)}" stop-color="${c}"/>`;
};
/** A linear gradient (userSpaceOnUse over a w × h box) for gradient fills. g = { stops: [#hex…], angle }. */
export function gradientDef(id, g, w, h) {
  const L = gradientLine(g.angle ?? 90, w, h), stops = g.stops || [];
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(L.x1)}" y1="${n(L.y1)}" x2="${n(L.x2)}" y2="${n(L.y2)}">${stops.map((c, i) => stopTag(c, i / Math.max(1, stops.length - 1))).join("")}</linearGradient>`;
}

function textContent(l, env, ids) {
  const t = l.text;
  const out = [];
  const defs = [];
  if (t.bg && t.bg.color && t.bg.color !== "none") out.push(`<path d="${rectPath(0, 0, l.w, l.h, (t.bg.radius ?? 0.25) * t.size)}" fill="${t.bg.color}"${t.bg.opacity != null && t.bg.opacity < 1 ? ` opacity="${t.bg.opacity}"` : ""}/>`);
  const font = `font-family="${attrFamily(t.family)}" font-size="${n(t.size)}" font-weight="${t.bold ? 700 : 400}" font-style="${t.italic ? "italic" : "normal"}"`;
  const ls = t.letterSpacing ? ` letter-spacing="${n(t.letterSpacing)}"` : "";
  const st = ` xml:space="preserve" style="white-space:pre;font-kerning:none;font-variant-ligatures:none"`;
  const paint = textPaint(t);
  let gradFill = null;
  if (hasGradient(t.gradient)) { const gid = ids("tg"); defs.push(gradientDef(gid, t.gradient, l.w, l.h)); gradFill = `url(#${gid})`; }
  const cl = curveLayout(t);
  const um = underlineMetrics(t.size), sm = strikeMetrics(t.size);
  // The letters with one paint: fill colour (or none) and an optional stroke.
  const letters = (fill, stroke) => {
    const pa = ` fill="${fill || "none"}"${stroke ? ` stroke="${stroke.color}" stroke-width="${n(stroke.width)}" stroke-linejoin="round"${fill ? ` paint-order="stroke"` : ""}` : ""}`;
    let s = "";
    if (cl) {
      const [ox, oy] = curveOffset(cl, l.w, l.h);
      const reveal = env.reveal?.[l.id], shown = reveal == null || reveal >= 1 ? cl.glyphs.length : Math.floor(cl.glyphs.length * Math.max(0, reveal));
      cl.glyphs.slice(0, shown).forEach((g) => { if (g.ch.trim()) s += `<text transform="translate(${n(g.x + ox)} ${n(g.y + oy)}) rotate(${n(g.rot)})" x="0" y="0" text-anchor="middle" ${font}${pa}${st}>${esc(g.ch)}</text>`; });
      return s;
    }
    for (const line of lines) {
      for (const r of line.runs) if (r.t) s += `<text x="${n(r.x)}" y="${n(line.baseline)}" ${font}${pa}${ls}${st}>${esc(r.t)}</text>`;
      const shown = line.runs.filter((r) => r.t);
      if ((t.underline || t.strike) && line.text.trim() && shown.length) {
        const x0 = shown[0].x, x1 = shown.length === line.runs.length ? line.x + line.width : shown[shown.length - 1].x + shown[shown.length - 1].w;
        const bar = (y, th) => `<rect x="${n(x0)}" y="${n(y)}" width="${n(Math.max(0, x1 - x0))}" height="${n(th)}" fill="${fill || stroke?.color || t.color}"/>`;
        if (t.underline) s += bar(line.baseline + um.offset - um.thickness / 2, um.thickness);
        if (t.strike) s += bar(line.baseline - sm.offset - sm.thickness / 2, sm.thickness);
      }
    }
    return s;
  };
  const lines = cl ? [] : revealRuns(layoutText(t, l.w).lines, env.reveal?.[l.id]);
  let body = "";
  for (const p of paint.passes) {
    let f = "";
    if (p.blur > 0) { const fid = ids("bl"); defs.push(`<filter id="${fid}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${n(p.blur / 2)}"/></filter>`); f = ` filter="url(#${fid})"`; }
    body += `<g${p.dx || p.dy ? ` transform="translate(${n(p.dx)} ${n(p.dy)})"` : ""}${p.opacity < 1 ? ` opacity="${n(p.opacity)}"` : ""}${f}>${letters(p.fill, p.stroke)}</g>`;
  }
  // Canva: Shadow, Lift, Glow, Echo and Curve show the whole gradient; Neon, Hollow, Glitch and Splice the first colour.
  const mainFill = paint.main.fill ? (gradFill && gradientOk(t) ? gradFill : paint.main.fill) : null;
  body += letters(mainFill, paint.main.stroke);
  if (t.shadow && (t.shadow.x || t.shadow.y || t.shadow.blur)) {
    const id = ids("sh");
    defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${n(t.shadow.x || 0)}" dy="${n(t.shadow.y || 0)}" stdDeviation="${n((t.shadow.blur || 0) / 2)}" flood-color="${t.shadow.color || "#000000"}" flood-opacity="${t.shadow.opacity ?? 0.5}"/></filter>`);
    out.push(`<g filter="url(#${id})">${body}</g>`);
  } else out.push(body);
  return (defs.length ? `<defs>${defs.join("")}</defs>` : "") + out.join("");
}

function imageMarkup(src, crop, w, h, { flipX, flipY, filterId, urlOf }) {
  const c = crop || { x: 0, y: 0, w: 1, h: 1 };
  const W = w / c.w, H = h / c.h;
  const flip = flipX || flipY ? ` transform="translate(${flipX ? n(w) : 0} ${flipY ? n(h) : 0}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1})"` : "";
  return `<g${flip}><image href="${esc(urlOf ? urlOf(src) : src)}" x="${n(-c.x * W)}" y="${n(-c.y * H)}" width="${n(W)}" height="${n(H)}" preserveAspectRatio="none"${filterId ? ` filter="url(#${filterId})"` : ""}/></g>`;
}

function placeholder(w, h, label, env) {
  const s = Math.min(w, h);
  let m = `<rect width="${n(w)}" height="${n(h)}" fill="#ecebfb"/>`;
  if (env.editor && s > 24) {
    const k = s / 100, cx = w / 2, cy = h / 2 - (label ? 6 * k : 0);
    m += `<g transform="translate(${n(cx - 18 * k)} ${n(cy - 14 * k)}) scale(${n(k)})" fill="none" stroke="#8b80f5" stroke-width="3" stroke-linejoin="round"><rect x="0" y="0" width="36" height="28" rx="5"/><path d="M3 24 L13 13 L21 20 L26 15 L34 24"/><circle cx="25" cy="8" r="3"/></g>`;
    if (label && s > 70) m += `<text x="${n(w / 2)}" y="${n(cy + 32 * k)}" font-family="system-ui, sans-serif" font-size="${n(Math.max(9, 9 * k))}" fill="#6a63c9" text-anchor="middle">${esc(label)}</text>`;
  }
  return m;
}

/** Markup of one layer's content in its own w × h box (no position/rotation). */
export function layerContent(l, env = {}) {
  let k = 0;
  const idp = (env.idp || "s") + "-" + l.id;
  const ids = (what) => `${idp}-${what}${k++}`;
  switch (l.type) {
    case "text": return textContent(l, env, ids);
    case "shape": {
      const pr = shapePrims(l.shape, l.w, l.h);
      if (!hasGradient(l.shape.gradient)) return primsMarkup(pr);
      const gid = ids("g");
      return `<defs>${gradientDef(gid, l.shape.gradient, l.w, l.h)}</defs>` + primsMarkup(pr.map((p) => (p.fill && p.fill !== "none" ? { ...p, fill: `url(#${gid})` } : p)));
    }
    case "element": {
      const [vw, vh] = l.element.vb;
      const fl = l.element.flipX || l.element.flipY ? ` transform="translate(${l.element.flipX ? n(l.w) : 0} ${l.element.flipY ? n(l.h) : 0}) scale(${l.element.flipX ? -1 : 1} ${l.element.flipY ? -1 : 1})"` : "";
      const inner = `<svg x="0" y="0" width="${n(l.w)}" height="${n(l.h)}" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none" overflow="visible">${primsMarkup(elementPrims(l.element))}</svg>`;
      return fl ? `<g${fl}>${inner}</g>` : inner;
    }
    case "image": {
      const im = l.image, cid = ids("c");
      const fid = env.cssFilters ? null : ids("f");
      const fdef = fid ? svgImageFilter(fid, im.filters || {}) : "";
      return `<defs><clipPath id="${cid}"><path d="${rectPath(0, 0, l.w, l.h, im.radius || 0)}"/></clipPath>${fdef}</defs><g clip-path="url(#${cid})">${imageMarkup(im.src, im.crop, l.w, l.h, { flipX: im.flipX, flipY: im.flipY, filterId: fdef ? fid : null, urlOf: env.urlOf })}</g>${im.border && im.border.width > 0 ? `<path d="${rectPath(0, 0, l.w, l.h, im.radius || 0)}" fill="none" stroke="${im.border.color || "#ffffff"}" stroke-width="${n(im.border.width * 2)}" clip-path="url(#${cid})"/>` : ""}`;
    }
    case "frame": {
      const f = l.frame, cid = ids("c");
      const inner = f.image?.src ? imageMarkup(f.image.src, f.image.crop, l.w, l.h, { urlOf: env.urlOf }) : placeholder(l.w, l.h, env.editor ? "Drop a photo" : "", env);
      const border = f.border && f.border.width > 0 ? `<path d="${framePath(f.shape, l.w, l.h, f.radius)}" fill="none" stroke="${f.border.color}" stroke-width="${n(f.border.width * 2)}" clip-path="url(#${cid})"/>` : "";
      return `<defs><clipPath id="${cid}"><path d="${framePath(f.shape, l.w, l.h, f.radius)}"/></clipPath></defs><g clip-path="url(#${cid})">${inner}</g>${border}`;
    }
    case "chart": {
      const prims = env.chartPrims ? env.chartPrims(l.chart.spec, l.w, l.h) : null;
      return prims ? primsMarkup(prims) : placeholder(l.w, l.h, "Chart", env);
    }
    case "table": {
      const prims = env.tablePrims ? env.tablePrims(l.table, l.w) : null;
      return prims ? primsMarkup(prims) : placeholder(l.w, l.h, "Table", env);
    }
    case "group": return l.children.filter((c) => !c.hidden).map((c) => layerMarkup(c, env)).join("");
    default: return "";
  }
}

/** Layer positioned on the page: <g transform> + content. */
export function layerMarkup(l, env = {}) {
  if (l.hidden) return "";
  const tr = `translate(${n(l.x)} ${n(l.y)})${l.rotation ? ` rotate(${n(l.rotation)} ${n(l.w / 2)} ${n(l.h / 2)})` : ""}`;
  const g = `<g transform="${tr}"${l.opacity < 1 ? ` opacity="${n(l.opacity)}"` : ""}>${layerContent(l, env)}</g>`;
  // SVG downloads keep links (Canva: links on text and elements).
  return env.links && l.link ? `<a href="${esc(l.link)}" target="_blank">${g}</a>` : g;
}

/** Background markup covering x, y, w, h (the page plus bleed). */
export function backgroundMarkup(bg, W, H, env = {}, b = 0) {
  const id = (env.idp || "s") + "-bg";
  if (bg?.gradient) {
    const g = gradientLine(bg.gradient.angle ?? 135, W + 2 * b, H + 2 * b);
    const stops = bg.gradient.stops || ["#ffffff", "#000000"];
    return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(g.x1 - b)}" y1="${n(g.y1 - b)}" x2="${n(g.x2 - b)}" y2="${n(g.y2 - b)}">${stops.map((c, i) => `<stop offset="${n(i / Math.max(1, stops.length - 1))}" stop-color="${c}"/>`).join("")}</linearGradient></defs><rect x="${n(-b)}" y="${n(-b)}" width="${n(W + 2 * b)}" height="${n(H + 2 * b)}" fill="url(#${id})"/>`;
  }
  if (bg?.image) {
    return `<rect x="${n(-b)}" y="${n(-b)}" width="${n(W + 2 * b)}" height="${n(H + 2 * b)}" fill="${bg.color || "#ffffff"}"/><image href="${esc(env.urlOf ? env.urlOf(bg.image) : bg.image)}" x="${n(-b)}" y="${n(-b)}" width="${n(W + 2 * b)}" height="${n(H + 2 * b)}" preserveAspectRatio="${bg.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}"/>`;
  }
  return `<rect x="${n(-b)}" y="${n(-b)}" width="${n(W + 2 * b)}" height="${n(H + 2 * b)}" fill="${bg?.color || "#ffffff"}"/>`;
}

/**
 * A whole page as a standalone SVG document.
 * opts: { width (output px, default page width), bleed (px, 0 = trim only), idp, urlOf, chartPrims, tablePrims, editor }
 */
export function pageSvg(design, pageIndex, page, opts = {}) {
  const pg = design.pages[pageIndex];
  const W = page.w, H = page.h, b = opts.bleed || 0;
  const outW = opts.width || W + 2 * b, outH = (outW * (H + 2 * b)) / (W + 2 * b);
  const env = { idp: opts.idp || "p" + pageIndex, ...opts };
  const body = (opts.transparent ? "" : backgroundMarkup(pg.background, W, H, env, b)) + pg.layers.map((l) => layerMarkup(l, env)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(outW)}" height="${n(outH)}" viewBox="${n(-b)} ${n(-b)} ${n(W + 2 * b)} ${n(H + 2 * b)}">${body}</svg>`;
}
