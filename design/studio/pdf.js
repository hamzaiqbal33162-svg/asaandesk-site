// Vector PDF export (multi-page): shapes and stickers as real paths (/pdf-editor/vector.js drawPrims), text as
// real selectable text in the same open fonts (/pdf-editor/fontmatch.js writeLines), photos embedded, print bleed,
// trim/bleed boxes and optional crop marks. Needs window.PDFLib (and window.fontkit for the open fonts) before it
// runs; works the same in Node tests (window.PDFLib = pdf-lib).
import { presetPx, bleedPx, marginPx, PT_PER_PX, toPx, CROP_MARK } from "./presets.js";
import { layoutText, underlineMetrics, strikeMetrics, textWidth } from "./textlayout.js";
import { textPaint, paintReach, curveLayout, curveOffset, gradientOk, hasGradient } from "./textfx.js";
import { shapePrims, elementPrims, rectPath, framePath, frameOutline, gradientLine, hasFilters } from "./shapes.js";
import { ungroup, rotate } from "./geometry.js";
import { withFills } from "./tableops.js";
import { extraChartPrims } from "./chartsx.js";

let mods = null;
/** Loads the site's vector modules (they read window.PDFLib when imported, so pdf-lib must be loaded first). */
export function pdfModules() {
  if (!globalThis.window?.PDFLib) return Promise.reject(new Error("The PDF library is not loaded yet."));
  mods ||= Promise.all([import("/pdf-editor/vector.js"), import("/pdf-editor/fontmatch.js"), import("/pdf-editor/charts.js"), import("/pdf-editor/tables.js")])
    .then(([vector, fontmatch, charts, tables]) => ({ vector, fontmatch, charts, tables }))
    .catch((e) => { mods = null; throw e; });
  return mods;
}
export const tableMeasure = (size) => (s, bold) => textWidth(s, "sans", bold, false, size);

/** Layers with groups opened up (children in page coordinates), hidden ones left out. */
export function flatLayers(layers) {
  const out = [];
  for (const l of layers) {
    if (l.hidden) continue;
    if (l.type === "group") out.push(...flatLayers(ungroup(l)));
    else out.push(l);
  }
  return out;
}

function decodeDataUrl(src) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(src);
  if (!m) return null;
  const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
const kindOf = (b) => (b[0] === 0x89 && b[1] === 0x50 ? "png" : b[0] === 0xff && b[1] === 0xd8 ? "jpg" : null);

// Polygon outlines for clipping (fine enough that curves look smooth at print size).
function ellipsePts(cx, cy, rx, ry, n = 96) { return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }); }
function roundRectPts(w, h, r, seg = 10) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) return [[0, 0], [w, 0], [w, h], [0, h]];
  const pts = [];
  const arc = (cx, cy, a0) => { for (let i = 0; i <= seg; i++) { const a = ((a0 + (90 * i) / seg) * Math.PI) / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  arc(w - r, r, -90); arc(w - r, h - r, 0); arc(r, h - r, 90); arc(r, r, 180);
  return pts;
}
export function clipOutline(kind, w, h, radius = 0) {
  const pts = frameOutline(kind, w, h);
  if (pts) return pts;
  if (kind === "circle") return ellipsePts(w / 2, h / 2, w / 2, h / 2);
  if (kind === "rounded") return roundRectPts(w, h, radius || Math.min(w, h) * 0.12);
  return roundRectPts(w, h, radius || 0);
}

/**
 * Builds the PDF. opts: { pages: [index] | null, bleed, marks, dpi (raster resolution for processed photos) }.
 * env (optional, browser): { imageBytes(src) -> { bytes, type }, rasterImage(layer, scale) -> { bytes, type },
 *   rasterLayer(layer, scale) -> { bytes, type } (text in scripts the open fonts do not cover) }.
 * Returns Uint8Array.
 */
export async function buildPdf(design, opts = {}, env = {}) {
  const { vector, fontmatch, charts, tables } = await pdfModules();
  const L = window.PDFLib;
  const { PDFDocument, rgb, degrees, pushGraphicsState, popGraphicsState, moveTo, lineTo, closePath, clip, endPath } = L;
  const out = await PDFDocument.create();
  out.setTitle(design.name || "Design");
  out.setCreator("AsaanDesk Studio");
  out.setProducer("AsaanDesk Studio");
  if (globalThis.window?.fontkit) { out.registerFontkit(window.fontkit); out._fontkitRegistered = true; }
  const P = design.preset, { w: W, h: H } = presetPx(P);
  const b = opts.bleed ? bleedPx(P) : 0;
  const m = opts.marks ? marginPx(P, !!opts.bleed) : 0;
  const outer = b + m, k = PT_PER_PX;
  const pw = (W + 2 * outer) * k, ph = (H + 2 * outer) * k;
  const embedded = new Map(), images = new Map();
  const rasterScale = (opts.dpi || P.dpi || 300) / 96;
  const toPdf = (x, y) => [(outer + x) * k, ph - (outer + y) * k];
  const hexRgb = (hex) => { const v = vector.rgbOf(hex); return rgb(v[0] / 255, v[1] / 255, v[2] / 255); };

  async function embedSrc(src) {
    if (images.has(src)) return images.get(src);
    let bytes = null, type = null;
    if (env.imageBytes) ({ bytes, type } = (await env.imageBytes(src)) || {});
    if (!bytes && src.startsWith("data:")) { bytes = decodeDataUrl(src); type = kindOf(bytes); }
    if (!bytes) throw new Error("A photo could not be read for the PDF.");
    type ||= kindOf(bytes);
    if (type !== "png" && type !== "jpg") throw new Error("This photo type cannot go into a PDF here (use PNG or JPG).");
    const img = type === "png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
    images.set(src, img);
    return img;
  }
  // Local layer point -> PDF point.
  const at = (l, x, y) => { const [px, py] = l.rotation ? rotate(l.x + x, l.y + y, l.x + l.w / 2, l.y + l.h / 2, l.rotation) : [l.x + x, l.y + y]; return toPdf(px, py); };
  const prims = (p, l, list, sx = 1, sy = sx, opacity = l.opacity ?? 1) => vector.drawPrims(out, p, list, { origin: at(l, 0, 0), sx: sx * k, sy: sy * k, rotationDeg: -(l.rotation || 0), opacity, embedded });
  const clipTo = (p, l, pts) => {
    const ops = [pushGraphicsState()];
    pts.forEach(([x, y], i) => { const [X, Y] = at(l, x, y); ops.push(i ? lineTo(X, Y) : moveTo(X, Y)); });
    ops.push(closePath(), clip(), endPath());
    p.pushOperators(...ops);
  };
  // Draws an embedded image so that the w × h box shows the crop (0..1) of it.
  const drawCropped = (p, l, img, crop, w, h) => {
    const c = crop || { x: 0, y: 0, w: 1, h: 1 };
    const Wf = w / c.w, Hf = h / c.h, ix = -c.x * Wf, iy = -c.y * Hf;
    const [x, y] = at(l, ix, iy + Hf);
    p.drawImage(img, { x, y, width: Wf * k, height: Hf * k, rotate: degrees(-(l.rotation || 0)), opacity: l.opacity ?? 1 });
  };

  async function drawText(p, l) {
    const t = l.text, lay = layoutText(t, l.w);
    if (t.bg && t.bg.color && t.bg.color !== "none") await prims(p, l, [{ d: rectPath(0, 0, l.w, l.h, (t.bg.radius ?? 0.25) * t.size), fill: t.bg.color, op: t.bg.opacity ?? 1 }]);
    const runs = (dx = 0, dy = 0) => lay.lines.flatMap((ln) => ln.runs.filter((r) => r.t).map((r) => { const [x, y] = at(l, r.x + dx, ln.baseline + dy); return { text: r.t, x, y }; }));
    const base = { size: t.size * k, rotationDeg: -(l.rotation || 0), family: t.family, bold: !!t.bold, italic: !!t.italic, spacing: t.letterSpacing ? { charSpacing: t.letterSpacing * k } : null, embedded };
    const op = l.opacity ?? 1;
    const cl = curveLayout(t);
    if (!cl && !runs().length) return;
    // A gradient colour cannot be text paint here: the text goes in as a sharp picture (Canva also says to use
    // PNG/JPG for gradient text).
    const raster = async () => {
      const pad = paintReach(t) + 2;
      const r = await env.rasterLayer(l, rasterScale, pad);
      const img = r.type === "png" ? await out.embedPng(r.bytes) : await out.embedJpg(r.bytes);
      drawCropped(p, { ...l, opacity: 1, x: l.x - pad, y: l.y - pad, w: l.w + 2 * pad, h: l.h + 2 * pad }, img, null, l.w + 2 * pad, l.h + 2 * pad);
    };
    if (gradientOk(t) && env.rasterLayer) { await raster(); return; }
    // Curved text: one letter at a time, each turned to its place on the arc.
    const letters = (dx = 0, dy = 0) => {
      if (!cl) return [{ rot: -(l.rotation || 0), lines: runs(dx, dy) }];
      const [ox, oy] = curveOffset(cl, l.w, l.h);
      return cl.glyphs.filter((g) => g.ch.trim()).map((g) => {
        const a = (g.rot * Math.PI) / 180, bx = g.x + ox + dx - (Math.cos(a) * g.w) / 2, by = g.y + oy + dy - (Math.sin(a) * g.w) / 2;
        const [x, y] = at(l, bx, by);
        return { rot: -(l.rotation || 0) - g.rot, lines: [{ text: g.ch, x, y }] };
      });
    };
    const write = async (o, dx = 0, dy = 0) => { for (const g of letters(dx, dy)) await fontmatch.writeLines(out, p, { ...base, ...(cl ? { spacing: null } : {}), rotationDeg: g.rot, lines: g.lines, ...o }); };
    const paintOnce = async (fill, stroke, opacity, dx = 0, dy = 0) => {
      if (stroke) await write({ color: vector.rgbOf(fill || stroke.color), render: fill ? 2 : 1, stroke: { color: vector.rgbOf(stroke.color), width: stroke.width * k }, opacity }, dx, dy);
      else if (fill) await write({ color: vector.rgbOf(fill), opacity }, dx, dy);
    };
    const paint = textPaint(t);
    try {
      if (t.shadow && (t.shadow.x || t.shadow.y || t.shadow.blur)) await write({ color: vector.rgbOf(t.shadow.color || "#000000"), opacity: op * (t.shadow.opacity ?? 0.5) }, t.shadow.x || 0, t.shadow.y || 0);
      for (const ps of paint.passes) {
        // PDF has no blur: a glow is drawn as a few wide, faint outlines around the letters.
        if (ps.blur > 0) for (const f of [1, 0.6, 0.3]) await paintOnce(ps.fill, { color: ps.fill || ps.stroke?.color || t.color, width: ps.blur * f + (ps.stroke?.width || 0) }, op * ps.opacity * 0.3, ps.dx, ps.dy);
        else await paintOnce(ps.fill, ps.stroke, op * ps.opacity, ps.dx, ps.dy);
      }
      await paintOnce(paint.main.fill, paint.main.stroke, op);
    } catch (e) {
      if (!env.rasterLayer) throw e;
      await raster();
      return;
    }
    if (!cl && (t.underline || t.strike)) {
      const um = underlineMetrics(t.size), sm = strikeMetrics(t.size), col = paint.main.fill || paint.main.stroke?.color || t.color;
      const bars = lay.lines.filter((ln) => ln.text.trim()).flatMap((ln) => [
        t.underline ? { d: rectPath(ln.x, ln.baseline + um.offset - um.thickness / 2, ln.width, um.thickness), fill: col } : null,
        t.strike ? { d: rectPath(ln.x, ln.baseline - sm.offset - sm.thickness / 2, ln.width, sm.thickness), fill: col } : null].filter(Boolean));
      if (bars.length) await prims(p, l, bars);
    }
  }

  // Gradient shapes, dashed borders and flipped graphics: a sharp picture at print resolution (pdf-lib has no gradients or dashes here).
  async function rasterBox(p, l, pad = 0) {
    const r = await env.rasterLayer(l, rasterScale, pad);
    const img = r.type === "png" ? await out.embedPng(r.bytes) : await out.embedJpg(r.bytes);
    drawCropped(p, { ...l, opacity: 1, x: l.x - pad, y: l.y - pad, w: l.w + 2 * pad, h: l.h + 2 * pad }, img, null, l.w + 2 * pad, l.h + 2 * pad);
  }
  async function drawImageLayer(p, l) {
    const im = l.image;
    if ((hasFilters(im.filters) || im.flipX || im.flipY) && env.rasterImage) {
      const r = await env.rasterImage(l, rasterScale);
      const img = r.type === "png" ? await out.embedPng(r.bytes) : await out.embedJpg(r.bytes);
      drawCropped(p, l, img, null, l.w, l.h);
      return;
    }
    const img = await embedSrc(im.src);
    clipTo(p, l, clipOutline("rect", l.w, l.h, im.radius || 0));
    drawCropped(p, l, img, im.crop, l.w, l.h);
    p.pushOperators(popGraphicsState());
    const bw = im.border?.width || 0;
    if (bw > 0) await prims(p, l, [{ d: rectPath(bw / 2, bw / 2, Math.max(1, l.w - bw), Math.max(1, l.h - bw), Math.max(0, (im.radius || 0) - bw / 2)), stroke: im.border.color || "#ffffff", sw: bw, fill: "none" }]);
  }

  async function drawFrame(p, l) {
    const f = l.frame;
    if (f.image?.src) {
      const img = await embedSrc(f.image.src);
      clipTo(p, l, clipOutline(f.shape, l.w, l.h, f.radius));
      drawCropped(p, l, img, f.image.crop, l.w, l.h);
      p.pushOperators(popGraphicsState());
    } else await prims(p, l, [{ d: framePath(f.shape, l.w, l.h, f.radius), fill: "#ecebfb" }]);
    if (f.border && f.border.width > 0) await prims(p, l, [{ d: framePath(f.shape, l.w, l.h, f.radius), stroke: f.border.color, sw: f.border.width, fill: "none" }]);
  }

  async function drawBackground(p, bg) {
    const x0 = -b, y0 = -b, w = W + 2 * b, h = H + 2 * b;
    const [X, Y] = toPdf(x0, y0 + h);
    if (bg?.gradient) {
      const stops = (bg.gradient.stops || ["#ffffff", "#000000"]).map((c) => vector.rgbOf(c));
      const g = gradientLine(bg.gradient.angle ?? 135, w, h);
      p.pushOperators(pushGraphicsState(), moveTo(X, Y), lineTo(X + w * k, Y), lineTo(X + w * k, Y + h * k), lineTo(X, Y + h * k), closePath(), clip(), endPath());
      const N = 160, dx = g.x2 - g.x1, dy = g.y2 - g.y1, len = Math.hypot(dx, dy) || 1, qx = (-dy / len) * (w + h), qy = (dx / len) * (w + h);
      const colorAt = (tt) => { const s = tt * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(s)), f = s - i; return stops[i].map((v, j) => (v + (stops[i + 1][j] - v) * f) / 255); };
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = Math.min(1, (i + 1.6) / N);
        const ax = x0 + g.x1 + dx * (i === 0 ? -1 : t0), ay = y0 + g.y1 + dy * (i === 0 ? -1 : t0);
        const bx = x0 + g.x1 + dx * (i === N - 1 ? 2 : t1), by = y0 + g.y1 + dy * (i === N - 1 ? 2 : t1);
        const pts = [[ax - qx, ay - qy], [bx - qx, by - qy], [bx + qx, by + qy], [ax + qx, ay + qy]].map(([px, py]) => toPdf(px, py));
        const d = pts.map(([px, py], j) => `${j ? "L" : "M"}${px.toFixed(2)} ${(ph - py).toFixed(2)}`).join("") + "Z";
        const [r, gg, bb] = colorAt((i + 0.5) / N);
        p.drawSvgPath(d, { x: 0, y: ph, color: rgb(r, gg, bb), borderWidth: 0 });
      }
      p.pushOperators(popGraphicsState());
      return;
    }
    if (bg?.color !== "none") p.drawRectangle({ x: X, y: Y, width: w * k, height: h * k, color: hexRgb(bg?.color || "#ffffff") });
    if (bg?.image) {
      const img = await embedSrc(bg.image);
      const s = bg.fit === "contain" ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
      const iw = img.width * s, ih = img.height * s;
      p.pushOperators(pushGraphicsState(), moveTo(X, Y), lineTo(X + w * k, Y), lineTo(X + w * k, Y + h * k), lineTo(X, Y + h * k), closePath(), clip(), endPath());
      const [ix, iy] = toPdf(x0 + (w - iw) / 2, y0 + (h + ih) / 2);
      p.drawImage(img, { x: ix, y: iy, width: iw * k, height: ih * k });
      p.pushOperators(popGraphicsState());
    }
  }

  function addLink(p, l) {
    const pts = [[0, 0], [l.w, 0], [l.w, l.h], [0, l.h]].map(([x, y]) => at(l, x, y)), xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const annot = out.context.obj({ Type: "Annot", Subtype: "Link", Rect: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: L.PDFString.of(l.link) } });
    p.node.addAnnot(out.context.register(annot));
  }
  function cropMarks(p) {
    const off = Math.max(toPx(CROP_MARK.offsetMm, "mm"), b) * k, len = toPx(CROP_MARK.lengthMm, "mm") * k;
    const L0 = outer * k, R0 = (outer + W) * k, B0 = outer * k, T0 = (outer + H) * k;
    const black = rgb(0, 0, 0), th = 0.4;
    const line = (x1, y1, x2, y2) => p.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: th, color: black });
    for (const [x, sx] of [[L0, -1], [R0, 1]]) for (const [y, sy] of [[B0, -1], [T0, 1]]) {
      line(x + sx * off, y, x + sx * (off + len), y);
      line(x, y + sy * off, x, y + sy * (off + len));
    }
  }

  const indexes = opts.pages || design.pages.map((_, i) => i);
  for (const i of indexes) {
    const pg = design.pages[i];
    if (!pg) continue;
    const p = out.addPage([pw, ph]);
    p.setTrimBox(outer * k, outer * k, W * k, H * k);
    p.setBleedBox((outer - b) * k, (outer - b) * k, (W + 2 * b) * k, (H + 2 * b) * k);
    p.setArtBox(outer * k, outer * k, W * k, H * k);
    await drawBackground(p, pg.background);
    for (const l of flatLayers(pg.layers)) {
      if (l.type === "text") await drawText(p, l);
      else if (l.type === "shape") { const pr = shapePrims(l.shape, l.w, l.h); if ((hasGradient(l.shape.gradient) || pr.some((x) => x.dash)) && env.rasterLayer) await rasterBox(p, l); else await prims(p, l, pr); }
      else if (l.type === "element") { if ((l.element.flipX || l.element.flipY) && env.rasterLayer) await rasterBox(p, l); else await prims(p, l, elementPrims(l.element), l.w / l.element.vb[0], l.h / l.element.vb[1]); }
      else if (l.type === "chart") await prims(p, l, extraChartPrims(l.chart.spec, l.w, l.h) || charts.chartPrims(l.chart.spec, l.w, l.h));
      else if (l.type === "table") await prims(p, l, withFills(l.table, tables.tablePrims(l.table, l.w, l.table.size || 16, tableMeasure(l.table.size || 16))));
      else if (l.type === "image") await drawImageLayer(p, l);
      else if (l.type === "frame") await drawFrame(p, l);
    }
    // Links (Canva: links on text and elements stay clickable in PDF downloads).
    for (const l of pg.layers) if (l.link && !l.hidden) addLink(p, l);
    if (opts.marks) cropMarks(p);
  }
  return out.save();
}
