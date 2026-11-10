// Removes text-showing operators from a page's content stream so edited text is
// really gone from the PDF (not just painted over). Each removed operator is
// replaced by an empty TJ that advances the pen by the same amount, so any text
// that follows on the same line keeps its position.
const { PDFName, PDFArray, PDFDict, PDFNumber, PDFRawStream, decodePDFRawStream } = window.PDFLib;

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

export function fontInfo(fontDict) {
  const get = (d, k) => d.lookup(PDFName.of(k));
  const num = (v) => (v instanceof PDFNumber ? v.asNumber() : null);
  const sub = get(fontDict, "Subtype")?.toString();
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
    return { bytes: 2, width: (code) => widths.get(code) ?? dw, known: true };
  }
  const first = num(get(fontDict, "FirstChar")) ?? 0;
  const W = get(fontDict, "Widths");
  if (!(W instanceof PDFArray)) return { bytes: 1, known: false };
  const arr = W.asArray().map((x) => num(fontDict.context.lookup(x)) ?? 0);
  const fd = get(fontDict, "FontDescriptor");
  const missing = num(fd && get(fd, "MissingWidth")) ?? 0;
  return { bytes: 1, width: (code) => arr[code - first] ?? missing, known: true };
}

/* ---------- interpreter ---------- */

const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];
const ID = [1, 0, 0, 1, 0, 0];

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
 * runs: [{ x, y, width, size }] in PDF user space (baseline start point, run width, font size).
 * Returns a Set of run indexes whose text was removed from the page.
 */
export function removeTextRuns(page, runs) {
  const removed = new Set();
  if (!runs.length || !page.node.Contents()) return removed;
  const bytes = readContent(page);
  const cmds = commands(tokenize(bytes));

  const fontsDict = page.node.Resources()?.lookup(PDFName.of("Font"));
  const fontCache = new Map();
  const getFont = (name) => {
    if (!fontCache.has(name)) {
      const fd = fontsDict instanceof PDFDict ? fontsDict.lookup(PDFName.of(name)) : null;
      fontCache.set(name, fd instanceof PDFDict ? fontInfo(fd) : { bytes: 1, known: false });
    }
    return fontCache.get(name);
  };

  let gs = { ctm: ID, Tc: 0, Tw: 0, Th: 1, TL: 0, Tfs: 0, font: null, rise: 0 };
  const stack = [];
  let Tm = ID, Tlm = ID;
  const edits = []; // { s, e, text }

  const nextLine = (tx, ty) => { Tlm = mul([1, 0, 0, 1, tx, ty], Tlm); Tm = Tlm; };

  // Advance in text space for one string; null if the font's widths are unknown.
  const advance = (codes) => {
    const f = gs.font;
    if (!f?.known) return null;
    let tx = 0;
    for (let i = 0; i < codes.length; i += f.bytes) {
      const code = f.bytes === 2 ? (codes[i] << 8) | (codes[i + 1] ?? 0) : codes[i];
      tx += (f.width(code) / 1000) * gs.Tfs + gs.Tc + (f.bytes === 1 && code === 32 ? gs.Tw : 0);
    }
    return tx * gs.Th;
  };

  const matchRun = (x, y) => {
    for (let i = 0; i < runs.length; i++) {
      const r = runs[i];
      if (Math.abs(y - r.y) <= r.size * 0.35 && x >= r.x - 1 && x <= r.x + Math.max(r.width - 0.5, 0.5)) return i;
    }
    return -1;
  };

  const show = (cmd, items) => {
    const m = mul(Tm, gs.ctm);
    const start = [gs.rise * m[2] + m[4], gs.rise * m[3] + m[5]];
    let total = 0, unknown = false;
    for (const it of items) {
      if (it.t === "num") total += (-it.v / 1000) * gs.Tfs * gs.Th;
      else if (it.t === "str") {
        const a = advance(it.v);
        if (a === null) unknown = true; else total += a;
      }
    }
    const hit = matchRun(start[0], start[1]);
    if (hit >= 0) {
      let tx = unknown ? null : total;
      if (tx === null) {
        // Widths unknown: fall back to the run width when this op is the whole run.
        const r = runs[hit];
        const sx = Math.hypot(m[0], m[1]) || 1;
        if (Math.abs(start[0] - r.x) < 1) tx = r.width / sx;
      }
      if (tx !== null) {
        const n = gs.Tfs && gs.Th ? (-tx * 1000) / (gs.Tfs * gs.Th) : 0;
        let prefix = "";
        if (cmd.op === "'") prefix = "T* ";
        if (cmd.op === '"') prefix = `${cmd.args[0].v} Tw ${cmd.args[1].v} Tc T* `;
        edits.push({ s: cmd.s, e: cmd.e, text: `${prefix}[${n.toFixed(3)}] TJ` });
        removed.add(hit);
      }
      if (tx !== null) total = tx;
    }
    Tm = mul([1, 0, 0, 1, total, 0], Tm);
  };

  for (const c of cmds) {
    const a = c.args.map((x) => x.v);
    switch (c.op) {
      case "q": stack.push({ ...gs }); break;
      case "Q": if (stack.length) gs = stack.pop(); break;
      case "cm": if (a.length === 6) gs.ctm = mul(a, gs.ctm); break;
      case "BT": Tm = Tlm = ID; break;
      case "Tf": gs.font = getFont(a[0]); gs.Tfs = a[1]; break;
      case "Tc": gs.Tc = a[0]; break;
      case "Tw": gs.Tw = a[0]; break;
      case "Tz": gs.Th = a[0] / 100; break;
      case "TL": gs.TL = a[0]; break;
      case "Ts": gs.rise = a[0]; break;
      case "Td": nextLine(a[0], a[1]); break;
      case "TD": gs.TL = -a[1]; nextLine(a[0], a[1]); break;
      case "Tm": Tm = Tlm = a; break;
      case "T*": nextLine(0, -gs.TL); break;
      case "Tj": show(c, c.args); break;
      case "TJ": show(c, c.args[0]?.v || []); break;
      case "'": nextLine(0, -gs.TL); show(c, c.args); break;
      case '"': gs.Tw = a[0]; gs.Tc = a[1]; nextLine(0, -gs.TL); show(c, [c.args[2]]); break;
    }
  }

  if (!edits.length) return removed;
  const enc = new TextEncoder();
  const chunks = [];
  let pos = 0;
  for (const ed of edits) {
    chunks.push(bytes.subarray(pos, ed.s), enc.encode(ed.text));
    pos = ed.e;
  }
  chunks.push(bytes.subarray(pos));
  const len = chunks.reduce((t, c) => t + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  const ctx = page.doc.context;
  page.node.set(PDFName.of("Contents"), ctx.register(ctx.flateStream(out)));
  return removed;
}
