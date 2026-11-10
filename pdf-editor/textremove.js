// Reads a page's content stream: the exact style of every piece of text (font, size, colour,
// spacing, leading) and of stroked drawings, and takes edited text out of the stream so it is
// really gone from the PDF (not just painted over). Removed glyphs are replaced by the same
// advance, so text that follows on the same line keeps its position.
const { PDFDocument, PDFName, PDFArray, PDFDict, PDFNumber, PDFRawStream, decodePDFRawStream } = window.PDFLib;

const WS = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set([40, 41, 60, 62, 91, 93, 123, 125, 47, 37]);

/* ---------- tokenizer ---------- */

function tokenize(b) {
  const toks = [];
  let i = 0;
  const n = b.length;
  while (i < n) {
    const c = b[i];
    if (WS.has(c)) { i++; continue; }
    if (c === 37) { while (i < n && b[i] !== 10 && b[i] !== 13) i++; continue; } // % comment
    const start = i;
    if (c === 40) { // ( literal string )
      const out = [];
      let depth = 1;
      i++;
      while (i < n && depth > 0) {
        let ch = b[i++];
        if (ch === 92) {
          const e = b[i++];
          const map = { 110: 10, 114: 13, 116: 9, 98: 8, 102: 12 };
          if (e in map) out.push(map[e]);
          else if (e >= 48 && e <= 55) {
            let v = e - 48;
            for (let k = 0; k < 2 && b[i] >= 48 && b[i] <= 55; k++) v = v * 8 + (b[i++] - 48);
            out.push(v & 255);
          } else if (e === 13) { if (b[i] === 10) i++; }
          else if (e !== 10) out.push(e);
          continue;
        }
        if (ch === 40) depth++;
        if (ch === 41 && --depth === 0) break;
        out.push(ch);
      }
      toks.push({ t: "str", v: out, s: start, e: i });
      continue;
    }
    if (c === 60 && b[i + 1] === 60) { toks.push({ t: "dict<", s: i, e: i + 2 }); i += 2; continue; }
    if (c === 62 && b[i + 1] === 62) { toks.push({ t: "dict>", s: i, e: i + 2 }); i += 2; continue; }
    if (c === 60) { // <hex>
      i++;
      let hex = "";
      while (i < n && b[i] !== 62) { if (!WS.has(b[i])) hex += String.fromCharCode(b[i]); i++; }
      i++;
      if (hex.length % 2) hex += "0";
      const out = [];
      for (let k = 0; k < hex.length; k += 2) out.push(parseInt(hex.slice(k, k + 2), 16));
      toks.push({ t: "str", v: out, s: start, e: i });
      continue;
    }
    if (c === 91) { toks.push({ t: "[", s: i, e: ++i }); continue; }
    if (c === 93) { toks.push({ t: "]", s: i, e: ++i }); continue; }
    if (c === 47) { // /Name
      i++;
      while (i < n && !WS.has(b[i]) && !DELIM.has(b[i])) i++;
      toks.push({ t: "name", v: String.fromCharCode(...b.subarray(start + 1, i)), s: start, e: i });
      continue;
    }
    while (i < n && !WS.has(b[i]) && !DELIM.has(b[i])) i++;
    if (i === start) { i++; continue; }
    const word = String.fromCharCode(...b.subarray(start, i));
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) toks.push({ t: "num", v: parseFloat(word), s: start, e: i });
    else {
      toks.push({ t: "op", v: word, s: start, e: i });
      if (word === "ID") { // inline image data: skip to EI
        i++;
        while (i < n && !(b[i] === 69 && b[i + 1] === 73 && WS.has(b[i - 1]) && (i + 2 >= n || WS.has(b[i + 2])))) i++;
        i += 2;
      }
    }
  }
  return toks;
}

// Group operands with their operator: { op, args, s, e }.
function commands(toks) {
  const out = [];
  let stack = [], start = null;
  const arrays = [];
  for (const tk of toks) {
    if (start === null) start = tk.s;
    if (tk.t === "[") { arrays.push([]); continue; }
    if (tk.t === "]") { const a = arrays.pop() || []; (arrays.length ? arrays[arrays.length - 1] : stack).push({ t: "arr", v: a }); continue; }
    if (tk.t === "op") {
      out.push({ op: tk.v, args: stack, s: start, e: tk.e });
      stack = []; start = null;
      continue;
    }
    (arrays.length ? arrays[arrays.length - 1] : stack).push(tk);
  }
  return out;
}


/* ---------- fonts ---------- */

const stripSubset = (n) => (n || "").replace(/^[A-Z]{6}\+/, "");

// WinAnsi codes 128-159 that differ from Latin-1.
const WIN_ANSI = { 128: "€", 130: "‚", 131: "ƒ", 132: "„", 133: "…", 134: "†", 135: "‡", 136: "ˆ", 137: "‰", 138: "Š", 139: "‹", 140: "Œ", 142: "Ž", 145: "‘", 146: "’", 147: "“", 148: "”", 149: "•", 150: "–", 151: "—", 152: "˜", 153: "™", 154: "š", 155: "›", 156: "œ", 158: "ž", 159: "Ÿ" };
const winAnsiChar = (code) => WIN_ANSI[code] || String.fromCharCode(code);

// Widths of the 14 standard PDF fonts, for PDFs that use them without a Widths array.
let metrics = null;
export async function initMetrics() {
  if (!metrics) metrics = { doc: await PDFDocument.create(), fonts: new Map() };
}

function standardName(baseFont, flags = 0) {
  const n = stripSubset(baseFont).replace(/[\s_]/g, "");
  const bold = /bold|black|heavy|semibold|demi/i.test(n), italic = /italic|oblique/i.test(n);
  if (/symbol/i.test(n)) return "Symbol";
  if (/dingbat/i.test(n)) return "ZapfDingbats";
  if (/courier|mono/i.test(n) || flags & 1) return "Courier" + (bold && italic ? "-BoldOblique" : bold ? "-Bold" : italic ? "-Oblique" : "");
  if (/times|roman|serif|georgia|garamond/i.test(n) && !/sans/i.test(n) || (flags & 2 && !/sans|arial|helvetica/i.test(n))) return bold && italic ? "Times-BoldItalic" : bold ? "Times-Bold" : italic ? "Times-Italic" : "Times-Roman";
  return "Helvetica" + (bold && italic ? "-BoldOblique" : bold ? "-Bold" : italic ? "-Oblique" : "");
}

function standardWidths(baseFont, flags) {
  if (!metrics) return null;
  const name = standardName(baseFont, flags);
  let font = metrics.fonts.get(name);
  if (!font) {
    try { font = metrics.doc.embedStandardFont(name); } catch { return null; }
    metrics.fonts.set(name, font);
  }
  return (code) => {
    try { return font.widthOfTextAtSize(winAnsiChar(code), 1000); } catch { return 500; }
  };
}

export function fontInfo(fontDict) {
  const get = (d, k) => d.lookup(PDFName.of(k));
  const num = (v) => (v instanceof PDFNumber ? v.asNumber() : null);
  const sub = get(fontDict, "Subtype")?.toString();
  const baseFont = get(fontDict, "BaseFont")?.toString().slice(1) || "";
  if (sub === "/Type0") {
    const desc = get(fontDict, "DescendantFonts")?.lookup(0);
    const dw = num(desc && get(desc, "DW")) ?? 1000;
    const widths = new Map();
    const W = desc && get(desc, "W");
    if (W instanceof PDFArray) {
      const arr = W.asArray().map((x) => desc.context.lookup(x));
      for (let i = 0; i < arr.length;) {
        const first = num(arr[i]);
        const next = arr[i + 1];
        if (next instanceof PDFArray) {
          next.asArray().forEach((w, k) => widths.set(first + k, num(desc.context.lookup(w))));
          i += 2;
        } else {
          const last = num(next), w = num(arr[i + 2]);
          for (let c = first; c <= last; c++) widths.set(c, w);
          i += 3;
        }
      }
    }
    return { bytes: 2, width: (code) => widths.get(code) ?? dw, known: true, baseFont };
  }
  const first = num(get(fontDict, "FirstChar")) ?? 0;
  const W = get(fontDict, "Widths");
  const fd = get(fontDict, "FontDescriptor");
  const flags = num(fd && get(fd, "Flags")) ?? 0;
  if (!(W instanceof PDFArray)) {
    const std = sub === "/Type3" ? null : standardWidths(baseFont, flags);
    return std ? { bytes: 1, width: std, known: true, baseFont, standard: true } : { bytes: 1, known: false, baseFont };
  }
  // Type3 widths are in glyph space; FontMatrix turns them into text space.
  let k = 1;
  if (sub === "/Type3") {
    const fm = get(fontDict, "FontMatrix");
    k = fm instanceof PDFArray ? (num(fm.lookup(0)) ?? 0.001) * 1000 : 1;
  }
  const arr = W.asArray().map((x) => (num(fontDict.context.lookup(x)) ?? 0) * k);
  const missing = num(fd && get(fd, "MissingWidth")) ?? 0;
  return { bytes: 1, width: (code) => arr[code - first] ?? missing, known: true, baseFont };
}

/* ---------- colours ---------- */

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
function toRgb(space, comps) {
  if (!comps || space === "other" || comps.some((c) => typeof c !== "number")) return null;
  const n = space === "gray" ? 1 : space === "rgb" ? 3 : 4;
  if (comps.length < n) return null;
  if (n === 1) return [clamp255(comps[0]), clamp255(comps[0]), clamp255(comps[0])];
  if (n === 3) return comps.slice(0, 3).map(clamp255);
  if (n === 4) {
    const [c, m, y, k] = comps;
    return [clamp255((1 - c) * (1 - k)), clamp255((1 - m) * (1 - k)), clamp255((1 - y) * (1 - k))];
  }
  return null;
}

// Device colour space (gray / rgb / cmyk) behind a colour space name, or "other".
function spaceKind(name, resources) {
  if (name === "DeviceGray" || name === "G" || name === "CalGray") return "gray";
  if (name === "DeviceRGB" || name === "RGB" || name === "CalRGB") return "rgb";
  if (name === "DeviceCMYK" || name === "CMYK") return "cmyk";
  const cs = resources?.lookup(PDFName.of("ColorSpace"));
  const def = cs instanceof PDFDict ? cs.lookup(PDFName.of(name)) : null;
  if (def instanceof PDFArray && def.lookup(0)?.toString() === "/ICCBased") {
    const n = def.lookup(1)?.dict?.lookup(PDFName.of("N"));
    const count = n instanceof PDFNumber ? n.asNumber() : 0;
    return count === 1 ? "gray" : count === 3 ? "rgb" : count === 4 ? "cmyk" : "other";
  }
  if (def instanceof PDFArray && def.lookup(0)?.toString() === "/CalRGB") return "rgb";
  if (def instanceof PDFArray && def.lookup(0)?.toString() === "/CalGray") return "gray";
  return "other";
}

// Selecting a colour space resets the colour to that space's initial value (black).
const initialColor = (space) => ({ space, comps: space === "rgb" ? [0, 0, 0] : space === "cmyk" ? [0, 0, 0, 1] : [0] });

/* ---------- interpreter ---------- */

const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];
const ID = [1, 0, 0, 1, 0, 0];
const apply = (m, x, y) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];

function readContent(page) {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray().map((r) => page.doc.context.lookup(r)) : [contents];
  const parts = streams.filter(Boolean).map((s) => (s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents()));
  const total = parts.reduce((a, p) => a + p.length + 1, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; out[o++] = 10; }
  return out;
}

/**
 * Walks a page's content stream once and returns:
 * - shows: every text-showing operator with its exact style (font, size, fill colour, character and
 *   word spacing, horizontal scale, leading, render mode) and the position of each glyph it draws;
 * - strokes: every stroked path with its colour, width and how many segments/curves it has.
 * All positions are in PDF user space (the same space pdf.js reports text positions in).
 */
export function scanPage(page) {
  const result = { shows: [], strokes: [], bytes: null, cmds: [] };
  if (!page.node.Contents()) return result;
  const bytes = readContent(page);
  const cmds = commands(tokenize(bytes));
  Object.assign(result, { bytes, cmds });

  const resources = page.node.Resources();
  const fontsDict = resources?.lookup(PDFName.of("Font"));
  const fontCache = new Map();
  const getFont = (name) => {
    if (!fontCache.has(name)) {
      const fd = fontsDict instanceof PDFDict ? fontsDict.lookup(PDFName.of(name)) : null;
      fontCache.set(name, fd instanceof PDFDict ? fontInfo(fd) : { bytes: 1, known: false, baseFont: "" });
    }
    return fontCache.get(name);
  };

  let gs = { ctm: ID, Tc: 0, Tw: 0, Th: 1, TL: 0, Tfs: 0, font: null, fontRes: "", rise: 0, Tr: 0,
    fill: { space: "gray", comps: [0] }, stroke: { space: "gray", comps: [0] }, lw: 1 };
  const stack = [];
  let Tm = ID, Tlm = ID;
  let path = { segs: 0, curves: 0, pts: [] };
  const nextLine = (tx, ty) => { Tlm = mul([1, 0, 0, 1, tx, ty], Tlm); Tm = Tlm; };

  const show = (cmd, cmdIndex, items) => {
    const f = gs.font;
    const m0 = mul(Tm, gs.ctm);
    const sx = Math.hypot(m0[0], m0[1]), sy = Math.hypot(m0[2], m0[3]);
    const record = {
      cmdIndex, op: cmd.op, fontRes: gs.fontRes, baseFont: f?.baseFont || "", font: f,
      Tfs: gs.Tfs, Tc: gs.Tc, Tw: gs.Tw, Th: gs.Th, TL: gs.TL, rise: gs.rise, render: gs.Tr,
      size: Math.abs(gs.Tfs) * sy,
      // Spacing expressed for text written at `size` with an unscaled text matrix.
      charSpacing: gs.Tc * sy, wordSpacing: gs.Tw * sy, hScale: sy ? (gs.Th * sx) / sy : 1,
      leading: gs.TL * sy,
      fill: toRgb(gs.fill.space, gs.fill.comps),
      upright: Math.abs(m0[1]) < 1e-3 * Math.max(sx, 1e-6) && m0[0] > 0 && m0[3] > 0,
      glyphs: [], unknown: !f?.known,
    };
    const start = apply(m0, 0, gs.rise);
    record.x = start[0];
    record.y = start[1];
    items.forEach((it, itemIndex) => {
      if (it.t === "num") {
        const adv = (-it.v / 1000) * gs.Tfs * gs.Th;
        Tm = mul([1, 0, 0, 1, adv, 0], Tm);
        return;
      }
      if (it.t !== "str") return;
      const step = f?.bytes || 1;
      for (let i = 0; i < it.v.length; i += step) {
        const code = step === 2 ? (it.v[i] << 8) | (it.v[i + 1] ?? 0) : it.v[i];
        const m = mul(Tm, gs.ctm);
        const [x0, y0] = apply(m, 0, gs.rise);
        const w0 = f?.known ? f.width(code) / 1000 : 0;
        const space = step === 1 && code === 32 ? gs.Tw : 0;
        const adv = (w0 * gs.Tfs + gs.Tc + space) * gs.Th;
        Tm = mul([1, 0, 0, 1, adv, 0], Tm);
        const [x1, y1] = apply(mul(Tm, gs.ctm), 0, gs.rise);
        record.glyphs.push({ itemIndex, at: i, bytes: it.v.slice(i, i + step), code, x0, y0, x1, y1, w0, space });
      }
    });
    const end = apply(mul(Tm, gs.ctm), 0, gs.rise);
    record.width = end[0] - record.x;
    result.shows.push(record);
  };

  const paint = (stroked) => {
    if (stroked && path.segs) {
      const scale = Math.sqrt(Math.abs(gs.ctm[0] * gs.ctm[3] - gs.ctm[1] * gs.ctm[2])) || 1;
      const xs = path.pts.map((p) => p[0]), ys = path.pts.map((p) => p[1]);
      result.strokes.push({
        color: toRgb(gs.stroke.space, gs.stroke.comps), width: gs.lw * scale, segs: path.segs, curves: path.curves,
        box: xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : null,
      });
    }
    path = { segs: 0, curves: 0, pts: [] };
  };
  const pt = (x, y) => path.pts.length < 400 && path.pts.push(apply(gs.ctm, x, y));

  cmds.forEach((c, cmdIndex) => {
    const a = c.args.map((x) => x.v);
    switch (c.op) {
      case "q": stack.push({ ...gs }); break;
      case "Q": if (stack.length) gs = stack.pop(); break;
      case "cm": if (a.length === 6) gs.ctm = mul(a, gs.ctm); break;
      case "w": gs.lw = a[0] ?? gs.lw; break;
      case "g": gs.fill = { space: "gray", comps: a }; break;
      case "G": gs.stroke = { space: "gray", comps: a }; break;
      case "rg": gs.fill = { space: "rgb", comps: a }; break;
      case "RG": gs.stroke = { space: "rgb", comps: a }; break;
      case "k": gs.fill = { space: "cmyk", comps: a }; break;
      case "K": gs.stroke = { space: "cmyk", comps: a }; break;
      case "cs": gs.fill = initialColor(spaceKind(a[0], resources)); break;
      case "CS": gs.stroke = initialColor(spaceKind(a[0], resources)); break;
      case "sc": case "scn": gs.fill = { ...gs.fill, comps: a.filter((v) => typeof v === "number") }; break;
      case "SC": case "SCN": gs.stroke = { ...gs.stroke, comps: a.filter((v) => typeof v === "number") }; break;
      case "m": path.segs = path.segs || 0; pt(a[0], a[1]); break;
      case "l": path.segs++; pt(a[0], a[1]); break;
      case "c": path.segs++; path.curves++; pt(a[4], a[5]); break;
      case "v": case "y": path.segs++; path.curves++; pt(a[2], a[3]); break;
      case "re": path.segs += 4; pt(a[0], a[1]); pt(a[0] + a[2], a[1] + a[3]); break;
      case "S": case "s": case "B": case "B*": case "b": case "b*": paint(true); break;
      case "f": case "F": case "f*": case "n": paint(false); break;
      case "BT": Tm = Tlm = ID; break;
      case "Tf": gs.font = getFont(a[0]); gs.fontRes = a[0]; gs.Tfs = a[1]; break;
      case "Tc": gs.Tc = a[0]; break;
      case "Tw": gs.Tw = a[0]; break;
      case "Tz": gs.Th = a[0] / 100; break;
      case "TL": gs.TL = a[0]; break;
      case "Ts": gs.rise = a[0]; break;
      case "Tr": gs.Tr = a[0]; break;
      case "Td": nextLine(a[0], a[1]); break;
      case "TD": gs.TL = -a[1]; nextLine(a[0], a[1]); break;
      case "Tm": Tm = Tlm = a; break;
      case "T*": nextLine(0, -gs.TL); break;
      case "Tj": show(c, cmdIndex, c.args); break;
      case "TJ": show(c, cmdIndex, c.args[0]?.v || []); break;
      case "'": nextLine(0, -gs.TL); show(c, cmdIndex, c.args); break;
      case '"': gs.Tw = a[0]; gs.Tc = a[1]; nextLine(0, -gs.TL); show(c, cmdIndex, [c.args[2]]); break;
    }
  });
  return result;
}

// Glyphs of a show that lie inside a text run (pdf.js item): same baseline, centre inside the run.
function inRun(g, r) {
  const mid = (g.x0 + g.x1) / 2;
  return Math.abs(g.y0 - r.y) <= r.size * 0.35 && mid >= r.x - 0.5 && mid <= r.x + Math.max(r.width, 0.5) + 0.5;
}

/**
 * The exact style of a text run (pdf.js item in user space: { x, y, width, size }), taken from the
 * first operator that draws inside it. Null when no operator matches (e.g. text inside a form XObject).
 */
export function runStyle(scan, run) {
  for (const s of scan.shows) {
    if (!s.glyphs.some((g) => inRun(g, run))) continue;
    return {
      fontRes: s.fontRes, baseFont: s.baseFont, size: s.size, fill: s.fill, render: s.render,
      charSpacing: s.charSpacing, wordSpacing: s.wordSpacing, hScale: s.hScale, leading: s.leading,
      invisible: s.render === 3 || s.render === 7,
    };
  }
  return null;
}

/**
 * The pen most likely used for handwriting already on the page: the stroked path with the most
 * segments that looks freehand (many segments or curves, not a straight rule or a box).
 */
export function inkFromStrokes(strokes) {
  let best = null;
  for (const s of strokes) {
    if (!s.color || !s.box) continue;
    const w = s.box[2] - s.box[0], h = s.box[3] - s.box[1];
    const freehand = s.segs >= 8 && (s.curves >= 3 || s.segs >= 15) && w > 4 && h > 4;
    if (freehand && (!best || s.segs > best.segs)) best = s;
  }
  return best ? { color: best.color, width: +best.width.toFixed(2), source: "page drawing" } : null;
}

const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * runs: [{ x, y, width, size }] in PDF user space (baseline start point, run width, font size).
 * Takes exactly the glyphs inside each run out of the page's content stream. Glyphs before or after
 * the run in the same operator are kept, and every removed glyph is replaced by the same horizontal
 * advance, so the rest of the line keeps its position.
 * Returns a Set of run indexes whose text was fully removed from the page.
 */
export function removeTextRuns(page, runs) {
  const removed = new Set();
  if (!runs.length || !page.node.Contents()) return removed;
  const scan = scanPage(page);
  const failed = new Set(), touched = new Set();
  const edits = []; // { s, e, text }

  for (const s of scan.shows) {
    const cmd = scan.cmds[s.cmdIndex];
    const hitOf = s.glyphs.map((g) => runs.findIndex((r) => inRun(g, r)));
    if (!hitOf.some((h) => h >= 0)) {
      // Unknown widths: glyph positions are unknown, so fall back to the whole operator when it starts inside a run.
      if (!s.unknown) continue;
      const r = runs.findIndex((r) => Math.abs(s.y - r.y) <= r.size * 0.35 && s.x >= r.x - 1 && s.x <= r.x + Math.max(r.width - 0.5, 0.5));
      if (r < 0) continue;
      const run = runs[r];
      const sx = s.Tfs ? s.size / Math.abs(s.Tfs) : 1;
      if (Math.abs(s.x - run.x) >= 1 || !s.Tfs || !s.Th) { failed.add(r); continue; }
      const n = (-(run.width / (sx || 1)) * 1000) / (s.Tfs * s.Th);
      edits.push({ s: cmd.s, e: cmd.e, text: prefixOf(cmd) + `[${n.toFixed(3)}] TJ` });
      touched.add(r);
      continue;
    }
    hitOf.forEach((h) => h >= 0 && touched.add(h));
    if (!s.Tfs || !s.Th) { hitOf.forEach((h) => h >= 0 && failed.add(h)); continue; }

    // Rebuild the operator as a TJ array: kept glyphs stay as they were, removed glyphs become advances.
    const items = cmd.op === "TJ" ? cmd.args[0]?.v || [] : cmd.op === '"' ? [cmd.args[2]] : cmd.args;
    const parts = [];
    let acc = 0, str = [];
    const flushStr = () => { if (str.length) { parts.push(`<${toHex(str)}>`); str = []; } };
    const flushNum = () => { if (Math.abs(acc) > 1e-6) { parts.push(acc.toFixed(3)); acc = 0; } };
    let gi = 0;
    items.forEach((it, itemIndex) => {
      if (it.t === "num") { flushStr(); acc += it.v; return; }
      if (it.t !== "str") return;
      while (gi < s.glyphs.length && s.glyphs[gi].itemIndex === itemIndex) {
        const g = s.glyphs[gi], drop = hitOf[gi] >= 0;
        if (drop) {
          flushStr();
          acc += (-(g.w0 * s.Tfs + s.Tc + g.space) * 1000) / s.Tfs;
        } else {
          flushNum();
          str.push(...g.bytes);
        }
        gi++;
      }
    });
    flushStr();
    flushNum();
    if (!parts.length) parts.push("0");
    edits.push({ s: cmd.s, e: cmd.e, text: prefixOf(cmd) + `[${parts.join(" ")}] TJ` });
  }

  for (const r of touched) if (!failed.has(r)) removed.add(r);
  if (!edits.length) return removed;
  edits.sort((a, b) => a.s - b.s);
  const enc = new TextEncoder();
  const chunks = [];
  let pos = 0;
  for (const ed of edits) {
    chunks.push(scan.bytes.subarray(pos, ed.s), enc.encode(ed.text));
    pos = ed.e;
  }
  chunks.push(scan.bytes.subarray(pos));
  const len = chunks.reduce((t, c) => t + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  const ctx = page.doc.context;
  page.node.set(PDFName.of("Contents"), ctx.register(ctx.flateStream(out)));
  return removed;
}

// ' and " also move to the next line (and " sets spacing); keep that when rewriting them as TJ.
function prefixOf(cmd) {
  if (cmd.op === "'") return "T* ";
  if (cmd.op === '"') return `${cmd.args[0].v} Tw ${cmd.args[1].v} Tc T* `;
  return "";
}
