// Magic Layers: pure layer-building functions (no DOM). They turn OCR lines, PDF text items, PDF image
// placements and cut-out masks into Design JSON layers (see SPEC.md "Shared design document").
// Everything works on plain pixel data ({ data: Uint8ClampedArray RGBA, width, height }) so the same
// code runs in the browser and in the Node tests (tests/layers.test.mjs).

/* ---------- ids, numbers, colours ---------- */

let counter = 0;
export const newId = (prefix = "l") => `${prefix}${Date.now().toString(36).slice(-5)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const r2 = (v) => Math.round(v * 100) / 100;
const hex2 = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
export const toHex = (rgb) => `#${hex2(rgb[0])}${hex2(rgb[1])}${hex2(rgb[2])}`;
export const fromHex = (h) => { const s = String(h || "").replace("#", ""); return s.length === 6 ? [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) : [0, 0, 0]; };
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/* ---------- text geometry (matches Studio's layout: x, y = top-left of a line box) ---------- */

// Vertical metrics (hhea ascent/descent per em) of the open fonts in /pdf-editor/fonts, which Studio uses.
export const METRICS = {
  sans: { asc: 0.905, desc: 0.212 },
  serif: { asc: 0.891, desc: 0.216 },
  mono: { asc: 0.833, desc: 0.3 },
  calibri: { asc: 0.952, desc: 0.269 },
  cambria: { asc: 0.9, desc: 0.25 },
};
export const LINE_HEIGHT = 1.2;
/** Distance from the top of a line box to the baseline (CSS-style half-leading). */
export function baselineOffset(size, family = "sans", lineHeight = LINE_HEIGHT) {
  const m = METRICS[family] || METRICS.sans;
  return ((lineHeight - (m.asc + m.desc)) / 2 + m.asc) * size;
}

/** Family, bold and italic from a font name (PDF BaseFont, subset tag allowed) plus optional flags. */
export function familyFromFontName(name, { bold = false, italic = false, fallback = "" } = {}) {
  const n = String(name || "").replace(/^[A-Z]{6}\+/, "").replace(/[\s_]/g, "");
  const isBold = !!bold || /bold|black|heavy|semibold|demi|extrabold|w[6-9]$/i.test(n);
  const isItalic = !!italic || /italic|oblique|slanted|-it$|-ita?$/i.test(n);
  let family = null;
  if (/calibri|carlito/i.test(n)) family = "calibri";
  else if (/cambria|caladea/i.test(n)) family = "cambria";
  else if (/courier|mono|consol|cousine|menlo|typewriter|lucidaconsole|inconsolata/i.test(n)) family = "mono";
  else if (/sans|arial|helvetica|arimo|verdana|tahoma|segoe|roboto|opensans|lato|swiss|calibri|futura|gill|frutiger|myriad|univers|inter|poppins|montserrat|nunito|ubuntu|noto(?!serif)/i.test(n)) family = "sans";
  else if (/times|tinos|roman|serif|georgia|garamond|book|minion|palatino|century|baskerville|bodoni|didot|charter|cambria|caslon|schoolbook/i.test(n)) family = "serif";
  if (!family) family = /mono/i.test(fallback) ? "mono" : /^serif/i.test(fallback) ? "serif" : "sans";
  return { family, bold: isBold, italic: isItalic };
}

const layerBase = (type, name, x, y, w, h, extra) => ({
  id: newId(), type, name, x: r2(x), y: r2(y), w: r2(Math.max(1, w)), h: r2(Math.max(1, h)),
  rotation: 0, opacity: 1, locked: false, hidden: false, animation: null, ...extra,
});

/** Neutral image filters (Studio's DEFAULT_FILTERS: multipliers 1 = unchanged, others 0 = off). */
export const NEUTRAL_FILTERS = Object.freeze({ brightness: 1, contrast: 1, saturate: 1, blur: 0, grayscale: 0, sepia: 0, hue: 0 });

/**
 * A text layer from a baseline start point. run: { content, x, baseline, size, family, bold, italic,
 * color, width, angle (deg, clockwise), source }. `slack` widens the box a little so Studio does not
 * wrap the line when its font is a touch wider than the original.
 */
export function textLayer(run) {
  const size = Math.max(1, run.size);
  const family = METRICS[run.family] ? run.family : "sans";
  const off = baselineOffset(size, family);
  const w = Math.max(run.width || 0, run.measured || 0) * 1.02 + Math.max(2, size * 0.1);
  const h = size * LINE_HEIGHT;
  const a = ((run.angle || 0) * Math.PI) / 180;
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux; // along the line, and "down" across it
  const tlx = run.x - nx * off, tly = run.baseline - ny * off;
  const cx = tlx + (ux * w) / 2 + (nx * h) / 2, cy = tly + (uy * w) / 2 + (ny * h) / 2;
  const content = String(run.content || "").trim();
  const layer = layerBase("text", content.slice(0, 24) || "Text", cx - w / 2, cy - h / 2, w, h, {
    text: {
      content, family, size: r2(size), bold: !!run.bold, italic: !!run.italic, underline: false,
      color: run.color || "#000000", align: "left", lineHeight: LINE_HEIGHT, letterSpacing: 0,
    },
  });
  layer.rotation = r2(Math.abs(run.angle || 0) < 0.05 ? 0 : run.angle);
  return layer;
}

export function imageLayer({ src, x, y, w, h, name = "Image" }) {
  return layerBase("image", name, x, y, w, h, {
    image: { src, crop: { x: 0, y: 0, w: 1, h: 1 }, filters: { ...NEUTRAL_FILTERS }, radius: 0, flipX: false, flipY: false },
  });
}

/** Scales layers (in place) by k. Used to fit a big photo or another page size into the design size. */
export function scaleLayers(layers, k, dx = 0, dy = 0) {
  if (k === 1 && !dx && !dy) return layers;
  for (const l of layers) {
    l.x = r2(l.x * k + dx); l.y = r2(l.y * k + dy); l.w = r2(l.w * k); l.h = r2(l.h * k);
    if (l.type === "text") l.text.size = r2(l.text.size * k);
  }
  return layers;
}

/**
 * Design JSON from pages [{ w, h, layers }] (layers bottom first). The preset is page 1's size in px;
 * other page sizes are fitted (contain, centred) into it.
 */
export function buildDesign({ name = "Magic Layers", pages }) {
  if (!pages?.length) throw new Error("There is nothing to open yet.");
  const W = Math.round(pages[0].w), H = Math.round(pages[0].h);
  return {
    version: 1,
    name,
    preset: { id: "custom", label: "Custom size", w: W, h: H, unit: "px", dpi: 96, bleed: 0 },
    pages: pages.map((p) => {
      const layers = p.layers.map((l) => JSON.parse(JSON.stringify(l)));
      if (Math.abs(p.w - W) > 0.5 || Math.abs(p.h - H) > 0.5) {
        const k = Math.min(W / p.w, H / p.h);
        scaleLayers(layers, k, (W - p.w * k) / 2, (H - p.h * k) / 2);
      }
      return { id: newId("p"), background: { color: "#ffffff" }, layers };
    }),
  };
}

/* ---------- OCR results ---------- */

/**
 * Tesseract settings for reading pictures (browser.js sets them on its worker; the tests use them with the same
 * engine). tesseract.js reads a picture as one uniform block of text by default (page mode 6), which drops a big
 * heading over body text and a line on a dark band; automatic page layout (3, Tesseract's own default) finds them.
 */
export const OCR_PARAMS = Object.freeze({ tessedit_pageseg_mode: "3" });

/** Lines from a tesseract.js result: data.lines (v5) or data.blocks → paragraphs → lines (v6). */
export function ocrLines(data) {
  if (Array.isArray(data?.lines) && data.lines.length) return data.lines;
  const out = [];
  for (const b of data?.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) out.push(l);
  return out;
}

/** One OCR line → pieces (a table row comes back as one line: split where the word gap is wide). */
export function splitLine(line, minConfidence = 40) {
  const words = (line.words || []).filter((w) => String(w.text || "").trim());
  if (!words.length) return [];
  const rowH = line.rowAttributes?.row_height || line.bbox.y1 - line.bbox.y0;
  const groups = [];
  let cur = [words[0]];
  for (let i = 1; i < words.length; i++) {
    if (words[i].bbox.x0 - words[i - 1].bbox.x1 > rowH * 1.2) { groups.push(cur); cur = []; }
    cur.push(words[i]);
  }
  groups.push(cur);
  const bl = line.baseline;
  return groups.map((ws) => {
    const x0 = Math.min(...ws.map((w) => w.bbox.x0)), x1 = Math.max(...ws.map((w) => w.bbox.x1));
    const y0 = Math.min(...ws.map((w) => w.bbox.y0)), y1 = Math.max(...ws.map((w) => w.bbox.y1));
    const mid = (x0 + x1) / 2;
    const baseline = bl && bl.x1 !== bl.x0 && bl.has_baseline !== false ? bl.y0 + ((bl.y1 - bl.y0) * (mid - bl.x0)) / (bl.x1 - bl.x0) : y1;
    return {
      text: ws.map((w) => w.text).join(" "),
      box: { x0, y0, x1, y1 },
      baseline: clamp(baseline, y0, y1 + rowH * 0.5),
      rowH,
      confidence: Math.min(...ws.map((w) => (w.confidence ?? 100))),
    };
  }).filter((s) => s.confidence >= minConfidence && /[\p{L}\p{N}]/u.test(s.text));
}

/** Font size guess for an OCR piece when no font match is available (row height ≈ 1 em). */
export const guessSize = (seg) => Math.max(6, seg.rowH || (seg.box.y1 - seg.box.y0) / 0.8);

/* ---------- pixels ---------- */

/**
 * Ink and paper colours of the text inside box {x0,y0,x1,y1}: paper = per-channel median of a ring just
 * outside the box, ink = mean of the pixels farthest from the paper (so light-on-dark text works too).
 */
export function sampleTextColors(img, box) {
  const { data, width: W, height: H } = img;
  const bh = Math.max(1, box.y1 - box.y0);
  const pad = Math.max(2, Math.round(bh * 0.15));
  const x0 = clamp(Math.floor(box.x0), 0, W - 1), x1 = clamp(Math.ceil(box.x1), x0 + 1, W);
  const y0 = clamp(Math.floor(box.y0), 0, H - 1), y1 = clamp(Math.ceil(box.y1), y0 + 1, H);
  const ox0 = Math.max(0, x0 - pad), ox1 = Math.min(W, x1 + pad), oy0 = Math.max(0, y0 - pad), oy1 = Math.min(H, y1 + pad);
  const ring = [[], [], []];
  const add = (x, y) => { const i = (y * W + x) * 4; ring[0].push(data[i]); ring[1].push(data[i + 1]); ring[2].push(data[i + 2]); };
  for (let x = ox0; x < ox1; x++) { add(x, oy0); add(x, oy1 - 1); }
  for (let y = oy0 + 1; y < oy1 - 1; y++) { add(ox0, y); add(ox1 - 1, y); }
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  const paper = ring.map(med);
  const n = (x1 - x0) * (y1 - y0);
  const d = new Float32Array(n);
  let k = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4; d[k++] = Math.sqrt(dist2([data[i], data[i + 1], data[i + 2]], paper)); }
  const sorted = Float32Array.from(d).sort();
  const top = sorted[Math.min(n - 1, Math.floor(n * 0.97))];
  if (top < 24) return { ink: lumOf(paper) > 128 ? [0, 0, 0] : [255, 255, 255], paper, contrast: top };
  const cut = top * 0.7;
  const sum = [0, 0, 0];
  let cnt = 0;
  k = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++, k++) {
    if (d[k] < cut) continue;
    const i = (y * W + x) * 4;
    sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2]; cnt++;
  }
  return { ink: sum.map((s) => Math.round(s / cnt)), paper, contrast: top };
}
const lumOf = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

/** Square dilation of a 0/1 mask by r pixels (separable max via prefix sums). */
export function dilateMask(mask, w, h, r) {
  if (r <= 0) return mask.slice();
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  const pre = new Int32Array(Math.max(w, h) + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + (mask[row + x] ? 1 : 0);
    for (let x = 0; x < w; x++) tmp[row + x] = pre[Math.min(w, x + r + 1)] - pre[Math.max(0, x - r)] > 0 ? 1 : 0;
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) pre[y + 1] = pre[y] + tmp[y * w + x];
    for (let y = 0; y < h; y++) out[y * w + x] = pre[Math.min(h, y + r + 1)] - pre[Math.max(0, y - r)] > 0 ? 1 : 0;
  }
  return out;
}

/**
 * Mask (0/1 per pixel) of the letters inside text boxes: pixels closer to the ink than to the paper,
 * grown by about an eighth of the line height so anti-aliased edges and shadows go too.
 * pieces: [{ box, ink, paper }].
 */
export function inkMask(img, pieces) {
  const { data, width: W, height: H } = img;
  let mask = new Uint8Array(W * H);
  let maxR = 0;
  for (const p of pieces) {
    const bh = p.box.y1 - p.box.y0;
    const x0 = clamp(Math.floor(p.box.x0) - 1, 0, W), x1 = clamp(Math.ceil(p.box.x1) + 1, 0, W);
    const y0 = clamp(Math.floor(p.box.y0) - 1, 0, H), y1 = clamp(Math.ceil(p.box.y1) + 1, 0, H);
    const span = Math.sqrt(dist2(p.ink, p.paper));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4, c = [data[i], data[i + 1], data[i + 2]];
      if (span < 24 || Math.sqrt(dist2(c, p.paper)) > span * 0.35) mask[y * W + x] = 1;
    }
    maxR = Math.max(maxR, Math.max(2, Math.round(bh * 0.12)));
  }
  // grow per piece size: one pass with the largest radius is close enough and much faster
  if (pieces.length) mask = dilateMask(mask, W, H, maxR);
  return mask;
}

/** Bounding box {x0,y0,x1,y1} (exclusive end) of mask values > thr, or null. */
export function maskBBox(mask, w, h, thr = 0) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (mask[y * w + x] <= thr) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

/** Copy of a rectangle of RGBA pixels; keep (optional, 0/1 per source pixel) clears alpha elsewhere. */
export function cropPixels(img, box, keep = null) {
  const w = box.x1 - box.x0, h = box.y1 - box.y0, out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const s = ((box.y0 + y) * img.width + box.x0) * 4;
    out.set(img.data.subarray(s, s + w * 4), y * w * 4);
    if (keep) for (let x = 0; x < w; x++) if (!keep[(box.y0 + y) * img.width + box.x0 + x]) out[(y * w + x) * 4 + 3] = 0;
  }
  return { data: out, width: w, height: h };
}

/**
 * Separate objects in a cut-out alpha mask (0..255). Connected parts are found on a small grid; parts of at
 * least minFrac of the subject that stay at least `gapFrac` of the picture apart become separate objects.
 * Returns [] when there is only one object, else [{ bbox, mask (0/1 per pixel), area }] largest first.
 */
export function splitObjects(alpha, W, H, { thr = 128, maxSide = 256, minFrac = 0.02, gapFrac = 0.015 } = {}) {
  const f = Math.min(1, maxSide / Math.max(W, H));
  const w = Math.max(1, Math.round(W * f)), h = Math.max(1, Math.round(H * f));
  const on = new Uint8Array(w * h), cnt = new Uint32Array(w * h), tot = new Uint32Array(w * h);
  for (let y = 0; y < H; y++) {
    const gy = Math.min(h - 1, Math.floor(y * f));
    for (let x = 0; x < W; x++) {
      const g = gy * w + Math.min(w - 1, Math.floor(x * f));
      tot[g]++;
      if (alpha[y * W + x] > thr) cnt[g]++;
    }
  }
  for (let i = 0; i < w * h; i++) on[i] = tot[i] && cnt[i] / tot[i] >= 0.3 ? 1 : 0;
  const label = new Int32Array(w * h);
  const comps = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!on[s] || label[s]) continue;
    const id = comps.length + 1;
    const c = { id, size: 0, x0: w, y0: h, x1: 0, y1: 0 };
    label[s] = id; stack.push(s);
    while (stack.length) {
      const p = stack.pop(), px = p % w, py = (p - px) / w;
      c.size++; c.x0 = Math.min(c.x0, px); c.y0 = Math.min(c.y0, py); c.x1 = Math.max(c.x1, px + 1); c.y1 = Math.max(c.y1, py + 1);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (on[q] && !label[q]) { label[q] = id; stack.push(q); }
      }
    }
    comps.push(c);
  }
  const total = comps.reduce((a, c) => a + c.size, 0);
  const big = comps.filter((c) => c.size >= Math.max(4, minFrac * total));
  if (big.length < 2) return [];
  // group big parts that are close together (dilate each by the gap and see what it touches)
  const gap = Math.max(1, Math.round(gapFrac * Math.max(w, h)));
  const parent = new Map(big.map((c) => [c.id, c.id]));
  const find = (a) => { while (parent.get(a) !== a) a = parent.get(a); return a; };
  for (const c of big) {
    const m = new Uint8Array(w * h);
    for (let y = c.y0; y < c.y1; y++) for (let x = c.x0; x < c.x1; x++) if (label[y * w + x] === c.id) m[y * w + x] = 1;
    const g = dilateMask(m, w, h, gap);
    for (let i = 0; i < w * h; i++) if (g[i] && label[i] && label[i] !== c.id && parent.has(label[i])) parent.set(find(label[i]), find(c.id));
  }
  const groups = [...new Set(big.map((c) => find(c.id)))];
  if (groups.length < 2) return [];
  // every part (also small specks) joins the group of the nearest big part
  const centre = (c) => [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2];
  const boxDist = (a, b) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
  const groupOf = new Map();
  for (const c of comps) {
    if (parent.has(c.id)) { groupOf.set(c.id, groups.indexOf(find(c.id))); continue; }
    let best = big[0], bd = Infinity;
    for (const b of big) { const d = boxDist(c, b) + 1e-3 * Math.hypot(centre(c)[0] - centre(b)[0], centre(c)[1] - centre(b)[1]); if (d < bd) { bd = d; best = b; } }
    groupOf.set(c.id, groups.indexOf(find(best.id)));
  }
  const nearestLabel = (gx, gy) => {
    for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = gx + dx, ny = gy + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && label[ny * w + nx]) return label[ny * w + nx];
    }
    return 0;
  };
  const out = groups.map(() => ({ mask: new Uint8Array(W * H), area: 0, x0: W, y0: H, x1: 0, y1: 0 }));
  for (let y = 0; y < H; y++) {
    const gy = Math.min(h - 1, Math.floor(y * f));
    for (let x = 0; x < W; x++) {
      if (alpha[y * W + x] === 0) continue;
      const gx = Math.min(w - 1, Math.floor(x * f));
      const lb = label[gy * w + gx] || nearestLabel(gx, gy);
      if (!lb) continue; // stray haze far from every object
      const o = out[groupOf.get(lb)];
      o.mask[y * W + x] = 1;
      if (alpha[y * W + x] > thr) { o.area++; if (x < o.x0) o.x0 = x; if (y < o.y0) o.y0 = y; if (x + 1 > o.x1) o.x1 = x + 1; if (y + 1 > o.y1) o.y1 = y + 1; }
    }
  }
  return out.filter((o) => o.area > 0).map((o) => ({ bbox: { x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1 }, mask: o.mask, area: o.area })).sort((a, b) => b.area - a.area);
}

/* ---------- PDF operator lists ---------- */

/** '#rrggbb' from a pdf.js fill colour op (pdf.js 4: [r,g,b] bytes; pdf.js 5+: ['#rrggbb']). */
export function opColor(args) {
  if (!args) return null;
  if (typeof args[0] === "string") return /^#[0-9a-f]{6}$/i.test(args[0]) ? args[0].toLowerCase() : null;
  if (args.length >= 3 && [0, 1, 2].every((i) => typeof args[i] === "number")) return toHex([args[0], args[1], args[2]]);
  return null;
}

const matMul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
export { matMul };
const isMatrix = (m) => (Array.isArray(m) || ArrayBuffer.isView(m)) && m.length === 6;
const glyphsOf = (args) => (args || []).find((a) => Array.isArray(a) && a.some((g) => g && typeof g === "object" && "unicode" in g));

/**
 * Walks a pdf.js operator list and returns the drawn text characters in order with their fill colour and
 * whether they are invisible (render mode 3/7), plus every image painted with its transform (CTM).
 * chars: [{ ch, color, invisible }]  images: [{ objId, w, h, ctm }]
 */
export function scanOperatorList(opList, OPS) {
  const { fnArray, argsArray } = opList;
  const chars = [], images = [];
  let st = { color: "#000000", mode: 0, ctm: [1, 0, 0, 1, 0, 0] };
  const stack = [];
  let inAnnot = 0;
  const push = () => stack.push({ ...st, ctm: st.ctm.slice() });
  const pop = () => { if (stack.length) st = stack.pop(); };
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i], args = argsArray[i];
    switch (fn) {
      case OPS.save: push(); break;
      case OPS.restore: pop(); break;
      case OPS.transform: if (isMatrix(args)) st.ctm = matMul(st.ctm, Array.from(args)); break;
      case OPS.paintFormXObjectBegin: push(); if (args && isMatrix(args[0])) st.ctm = matMul(st.ctm, Array.from(args[0])); break;
      case OPS.paintFormXObjectEnd: pop(); break;
      case OPS.beginGroup: push(); break;
      case OPS.endGroup: pop(); break;
      case OPS.beginAnnotation: inAnnot++; push(); break;
      case OPS.endAnnotation: inAnnot = Math.max(0, inAnnot - 1); pop(); break;
      case OPS.setFillRGBColor: case OPS.setFillGray: case OPS.setFillCMYKColor: case OPS.setFillColor: case OPS.setFillColorN: {
        const c = opColor(args);
        if (c) st.color = c;
        else if (fn === OPS.setFillGray && typeof args?.[0] === "number") st.color = toHex([args[0] * 255, args[0] * 255, args[0] * 255]);
        break;
      }
      case OPS.setTextRenderingMode: st.mode = args?.[0] | 0; break;
      case OPS.setGState: {
        // pdf.js passes [[key, value], ...]; "Tr" is not a gstate key, nothing to do for colours here
        break;
      }
      case OPS.showText: case OPS.showSpacedText: case OPS.nextLineShowText: case OPS.nextLineSetSpacingShowText: {
        if (inAnnot) break;
        const glyphs = glyphsOf(args);
        if (!glyphs) break;
        const invisible = st.mode === 3 || st.mode === 7;
        for (const g of glyphs) {
          if (!g || typeof g !== "object" || !g.unicode) continue;
          for (const ch of String(g.unicode).normalize("NFKC")) if (!/\s/.test(ch)) chars.push({ ch, color: st.color, invisible });
        }
        break;
      }
      case OPS.paintImageXObject:
        if (!inAnnot && args) images.push({ objId: args[0], w: args[1], h: args[2], ctm: st.ctm.slice() });
        break;
      case OPS.paintImageXObjectRepeat:
        if (!inAnnot && args) {
          const [objId, sx, sy, pos] = args;
          for (let k = 0; k + 1 < (pos?.length || 0); k += 2) images.push({ objId, w: 0, h: 0, ctm: matMul(st.ctm, [sx, 0, 0, sy, pos[k], pos[k + 1]]) });
        }
        break;
      default: break;
    }
  }
  return { chars, images };
}

/**
 * Gives each pdf.js text item the fill colour of the operator-list characters it came from. Both lists come
 * from the same content stream in the same order, so the non-space characters line up; a small look-ahead
 * window skips characters that one side drops (e.g. unmapped glyphs). RTL items are also tried reversed.
 * Returns [{ color, invisible, matched }] per item.
 */
export function itemColors(items, chars, window = 12) {
  let p = 0;
  return items.map((it) => {
    const list = [...String(it.str || "").normalize("NFKC")].filter((c) => !/\s/.test(c));
    if (!list.length) return { color: null, invisible: false, matched: 0 };
    const attempt = (seq) => {
      let q = p, n = 0, inv = 0;
      const counts = new Map();
      for (const ch of seq) {
        let k = -1;
        for (let j = q; j < Math.min(chars.length, q + window); j++) if (chars[j].ch === ch) { k = j; break; }
        if (k < 0) continue;
        const c = chars[k];
        counts.set(c.color, (counts.get(c.color) || 0) + 1);
        if (c.invisible) inv++;
        n++; q = k + 1;
      }
      let color = null, best = 0;
      for (const [c, v] of counts) if (v > best) { best = v; color = c; }
      return { color, invisible: n > 0 && inv === n, matched: n, next: q };
    };
    let r = attempt(list);
    if (r.matched < list.length) { const b = attempt(list.slice().reverse()); if (b.matched > r.matched) r = b; }
    if (r.matched) p = r.next;
    return { color: r.color, invisible: r.invisible, matched: r.matched };
  });
}

/** Axis-aligned box of the unit square under matrix m (6 numbers), after viewport matrix v. */
export function unitSquareBox(m, v = [1, 0, 0, 1, 0, 0]) {
  const t = matMul(v, m);
  const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0, matrix: t };
}

/**
 * Text runs from pdf.js text items in viewport pixels. vt = viewport.transform; fontInfo(fontName) →
 * { name, bold, italic, fallback }. colors from itemColors(). Returns runs ready for textLayer().
 */
export function pdfTextRuns(items, colors, vt, fontInfo) {
  const runs = [];
  items.forEach((it, i) => {
    const content = String(it.str || "");
    if (!content.trim()) return;
    const tr = it.transform;
    const o = [vt[0] * tr[4] + vt[2] * tr[5] + vt[4], vt[1] * tr[4] + vt[3] * tr[5] + vt[5]];
    const d = [vt[0] * tr[0] + vt[2] * tr[1], vt[1] * tr[0] + vt[3] * tr[1]]; // text x-axis in viewport space
    const scale = Math.hypot(vt[0], vt[1]);
    const size = Math.hypot(tr[2], tr[3]) * scale;
    if (!(size > 0.5)) return;
    const f = fontInfo(it.fontName) || {};
    const fam = familyFromFontName(f.name, { bold: f.bold, italic: f.italic, fallback: f.fallback });
    // pdf.js reports a leading space as part of str; move the start past it so the box hugs the letters
    const lead = content.length - content.trimStart().length;
    const width = (it.width || 0) * scale;
    const perChar = content.length ? width / content.length : 0;
    let angle = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
    if (Math.abs(angle) < 0.05) angle = 0;
    const a = (angle * Math.PI) / 180;
    runs.push({
      index: i, content: content.trim(), size, angle,
      x: o[0] + Math.cos(a) * perChar * lead, baseline: o[1] + Math.sin(a) * perChar * lead,
      width: Math.max(0, width - perChar * (lead + (content.length - content.trimEnd().length))),
      family: fam.family, bold: fam.bold, italic: fam.italic, fontKey: it.fontName,
      color: colors?.[i]?.color || null, invisible: !!colors?.[i]?.invisible, source: "pdf",
    });
  });
  return runs;
}

/**
 * Joins pieces of one line that pdf.js split (same font, size, colour, baseline; small gap), so a sentence
 * becomes one text layer instead of one per word.
 */
export function mergeRuns(runs) {
  const out = [];
  for (const r of runs) {
    const p = out[out.length - 1];
    if (p && !p.angle && !r.angle && p.fontKey === r.fontKey && Math.abs(p.size - r.size) < p.size * 0.02 && p.color === r.color &&
      p.invisible === r.invisible && Math.abs(p.baseline - r.baseline) < p.size * 0.15) {
      const gap = r.x - (p.x + p.width);
      if (gap > -p.size * 0.2 && gap < p.size * 0.6) {
        const space = gap > p.size * 0.15 && !/\s$/.test(p.content) && !/^\s/.test(r.content) ? " " : "";
        p.content += space + r.content;
        p.width = r.x + r.width - p.x;
        continue;
      }
    }
    out.push({ ...r });
  }
  return out;
}

/** Ink boxes of text runs (viewport px), for sampling colours and erasing them from a picture. */
export function runBox(r) {
  const m = METRICS[r.family] || METRICS.sans;
  return { x0: r.x - 1, y0: r.baseline - r.size * m.asc * 0.95, x1: r.x + r.width + 1, y1: r.baseline + r.size * m.desc * 0.9 };
}

/* ---------- the picture pipeline (photo, poster, scanned page) ---------- */

/** Negative copy of RGBA pixels (alpha kept). */
export function invertPixels(img) {
  const d = new Uint8ClampedArray(img.data);
  for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
  return { data: d, width: img.width, height: img.height };
}
/**
 * Dark areas (bands, boxes, buttons) that may hold light letters. tesseract.js reads a picture as one block of
 * text and misses a line of light letters on a dark band that covers only part of the picture, also on a negative
 * of the whole picture; the same band read on its own is found. On a grid of cells, a cell is dark when most of
 * its pixels are dark; touching dark cells are grouped (one cell of slack bridges the holes the letters leave).
 * A group is kept when its box is mostly dark cells (not a thin ring or outline), big enough for a line of text,
 * has some light pixels in it (possible letters) and is not nearly the whole picture (the normal pass reads that).
 * Returns boxes { x0, y0, x1, y1 } (pixels, end exclusive), largest first, at most `max`.
 */
export function darkRegions(img, { lumMax = 100, lumLight = 150, cellDark = 0.6, solid = 0.5, maxCover = 0.85, minW = 24, minH = 14, minLight = 0.003, max = 8 } = {}) {
  const { data, width: W, height: H } = img;
  const cs = clamp(Math.round(Math.min(W, H) / 100), 4, 16);
  const gw = Math.ceil(W / cs), gh = Math.ceil(H / cs), n = gw * gh;
  const darkPx = new Uint32Array(n), lightPx = new Uint32Array(n), tot = new Uint32Array(n);
  for (let y = 0; y < H; y++) {
    const row = ((y / cs) | 0) * gw;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2], g = row + ((x / cs) | 0);
      tot[g]++;
      if (l < lumMax) darkPx[g]++; else if (l > lumLight) lightPx[g]++;
    }
  }
  const dark = new Uint8Array(n);
  for (let g = 0; g < n; g++) dark[g] = tot[g] && darkPx[g] >= tot[g] * cellDark ? 1 : 0;
  const grown = dilateMask(dark, gw, gh, 1);
  const label = new Int32Array(n), stack = [], out = [];
  for (let s = 0; s < n; s++) {
    if (!grown[s] || label[s]) continue;
    const id = out.length + 1;
    let x0 = gw, y0 = gh, x1 = -1, y1 = -1, cells = 0;
    label[s] = id; stack.push(s);
    while (stack.length) {
      const p = stack.pop(), px = p % gw, py = (p - px) / gw;
      if (dark[p]) { cells++; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const q = ny * gw + nx;
        if (grown[q] && !label[q]) { label[q] = id; stack.push(q); }
      }
    }
    out.push({ id, cells, x0, y0, x1, y1 });
  }
  const boxes = [];
  for (const c of out) {
    if (c.x1 < 0) continue;
    const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
    if (c.cells < bw * bh * solid) continue;
    // half a cell of margin: a band edge inside a cell can leave that cell under `cellDark` (letters near the
    // edge must stay in the crop); small enough that the dark area is still most of the crop
    const m = Math.ceil(cs / 2);
    const box = { x0: Math.max(0, c.x0 * cs - m), y0: Math.max(0, c.y0 * cs - m), x1: Math.min(W, (c.x1 + 1) * cs + m), y1: Math.min(H, (c.y1 + 1) * cs + m) };
    const area = (box.x1 - box.x0) * (box.y1 - box.y0);
    if (box.x1 - box.x0 < minW || box.y1 - box.y0 < minH || area > W * H * maxCover) continue;
    let light = 0;
    for (let gy = c.y0; gy <= c.y1; gy++) for (let gx = c.x0; gx <= c.x1; gx++) light += lightPx[gy * gw + gx];
    if (light < area * minLight) continue;
    boxes.push({ ...box, area });
  }
  return boxes.sort((a, b) => b.area - a.area).slice(0, max).map(({ area, ...b }) => b);
}
/** An OCR piece (from splitLine) moved by dx, dy (a crop's lines back into the whole picture). */
export const shiftSeg = (s, dx, dy) => ({ ...s, box: { x0: s.box.x0 + dx, y0: s.box.y0 + dy, x1: s.box.x1 + dx, y1: s.box.y1 + dy }, baseline: s.baseline + dy });

/** Intersection area over the smaller box's area. */
export function overlap(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / Math.max(1, Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0)));
}

/**
 * Splits a flat picture into layers. img: { data, width, height } RGBA. deps (all async, injectable for tests):
 *   ocr(img) → tesseract data | null           inpaint(img, mask{data,width,height}) → img
 *   removeBg(img) → { data, mask }             encode(img, 'image/png' | 'image/jpeg') → data URL
 *   matchFont(img, seg, colors) → { family, bold, size, measured, left } | null   step(id, status, detail)
 *     (left = how far the text origin sits left of the first letter's ink, in picture px)
 * opts: { text, removeText, subject, objects, fillBehind, scale, invertPass } (scale: design px per image px;
 *   invertPass: also read each dark area (darkRegions) as a negative crop so light text on it is found, default on)
 * Returns { w, h, layers (bottom first), info }.
 */
export async function pictureLayers(img, deps, opts = {}) {
  const o = { text: true, removeText: true, subject: true, objects: true, fillBehind: true, scale: 1, ...opts };
  const step = deps.step || (() => {});
  const W = img.width, H = img.height, k = o.scale;
  const info = { textLines: 0, subject: false, objects: 0, inpaint: [] };
  const textRuns = [];
  let clean = img;

  if (o.text && deps.ocr) {
    step("ocr", "run");
    const data = await deps.ocr(img);
    let segs = ocrLines(data).flatMap((l) => splitLine(l));
    if (o.invertPass !== false) {
      // light letters on a dark band are missed in the whole picture (see darkRegions): read each dark area on
      // its own as a negative (dark letters on light paper) and keep the lines that are new
      for (const r of darkRegions(img)) {
        const extra = ocrLines(await deps.ocr(invertPixels(cropPixels(img, r)))).flatMap((l) => splitLine(l, 55)).map((s) => shiftSeg(s, r.x0, r.y0));
        segs = segs.concat(extra.filter((e) => !segs.some((s) => overlap(s.box, e.box) > 0.3)));
      }
    }
    const pieces = [];
    for (const seg of segs) {
      const colors = sampleTextColors(img, seg.box);
      if (colors.contrast < 30) continue; // "text" with no visible letters: an OCR misread of texture
      const m = deps.matchFont ? await deps.matchFont(img, seg, colors) : null;
      const size = m?.size || guessSize(seg);
      textRuns.push({
        content: seg.text, x: seg.box.x0 + (m?.left || 0), baseline: seg.baseline, size, width: seg.box.x1 - seg.box.x0, measured: m?.measured || 0,
        family: m?.family || "sans", bold: !!m?.bold, italic: false, color: toHex(colors.ink), source: "ocr",
      });
      pieces.push({ box: seg.box, ink: colors.ink, paper: colors.paper });
    }
    info.textLines = textRuns.length;
    step("ocr", "done", textRuns.length ? `${textRuns.length} text line${textRuns.length > 1 ? "s" : ""}` : "No text found");
    if (o.removeText && pieces.length && deps.inpaint) {
      step("erase", "run");
      const mask = inkMask(img, pieces);
      const r = await deps.inpaint(img, { data: mask, width: W, height: H });
      clean = { data: r.data, width: W, height: H };
      info.inpaint.push(r.method || "done");
      step("erase", "done");
    } else step("erase", "skip");
  } else { step("ocr", "skip"); step("erase", "skip"); }

  const subjectLayers = [];
  let background = clean;
  if (o.subject && deps.removeBg) {
    step("subject", "run");
    const cut = await deps.removeBg(clean);
    const alpha = cut?.mask;
    let solid = 0;
    if (alpha) for (let i = 0; i < W * H; i++) if (alpha[i] > 128) solid++;
    const cover = solid / (W * H);
    if (cover >= 0.005 && cover <= 0.9) {
      info.subject = true;
      const cutImg = { data: cut.data, width: W, height: H };
      const parts = o.objects ? splitObjects(alpha, W, H) : [];
      info.objects = parts.length;
      const list = parts.length ? parts : [{ bbox: maskBBox(alpha, W, H, 8), mask: null }];
      let n = 0;
      for (const part of list) {
        const b = part.bbox;
        if (!b) continue;
        const pad = 1, box = { x0: Math.max(0, b.x0 - pad), y0: Math.max(0, b.y0 - pad), x1: Math.min(W, b.x1 + pad), y1: Math.min(H, b.y1 + pad) };
        const src = await deps.encode(cropPixels(cutImg, box, part.mask), "image/png");
        subjectLayers.push(imageLayer({ src, x: box.x0 * k, y: box.y0 * k, w: (box.x1 - box.x0) * k, h: (box.y1 - box.y0) * k, name: list.length > 1 ? `Object ${++n}` : "Subject" }));
      }
      step("subject", "done", list.length > 1 ? `${list.length} objects` : "Subject cut out");
      if (o.fillBehind && deps.inpaint) {
        step("fill", "run");
        const hole = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) hole[i] = alpha[i] > 24 ? 1 : 0;
        const grown = dilateMask(hole, W, H, Math.max(3, Math.round(Math.max(W, H) / 100)));
        const r = await deps.inpaint(clean, { data: grown, width: W, height: H });
        background = { data: r.data, width: W, height: H };
        info.inpaint.push(r.method || "done");
        step("fill", "done");
      } else step("fill", "skip");
    } else {
      step("subject", "done", alpha ? "No clear subject found" : "Could not cut out the subject");
      step("fill", "skip");
    }
  } else { step("subject", "skip"); step("fill", "skip"); }

  step("build", "run");
  const bgSrc = await deps.encode(background, "image/jpeg");
  const layers = [imageLayer({ src: bgSrc, x: 0, y: 0, w: W * k, h: H * k, name: "Background" }), ...subjectLayers];
  for (const r of textRuns) layers.push(textLayer({ ...r, x: r.x * k, baseline: r.baseline * k, size: r.size * k, width: r.width * k, measured: r.measured * k }));
  step("build", "done");
  return { w: W * k, h: H * k, layers, info, cleaned: background };
}
