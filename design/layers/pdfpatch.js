// Magic Layers: makes the "background" copy of a PDF for rendering. Every text operator is kept (so the page
// draws exactly the same vector art) but text is switched to render mode 3 (invisible), and the images that
// became their own layers are taken out (their "Do" operators are dropped). Works on bytes with pdf-lib
// (passed in as PDFLib, so the same code runs in the browser and in Node). No DOM needed.

const WS = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set([40, 41, 60, 62, 91, 93, 123, 125, 47, 37]); // ( ) < > [ ] { } / %
const isRegular = (b) => !WS.has(b) && !DELIM.has(b);

/**
 * Tokenises a content stream. Returns operations [{ op, operands: [{ type, value, s, e }], s, e }] where
 * s/e are byte offsets (operands included), so callers can splice the original bytes.
 * Handles strings with nested parentheses and escapes, hex strings, arrays, dictionaries, names, numbers,
 * comments and inline images (BI … ID <binary> EI).
 */
export function parseContent(bytes) {
  const n = bytes.length;
  const ops = [];
  let operands = [];
  let i = 0;
  const latin = (s, e) => { let t = ""; for (let k = s; k < e; k++) t += String.fromCharCode(bytes[k]); return t; };
  // one object starting at i (no leading whitespace); returns { type, value, s, e }
  const readObject = () => {
    const s = i, b = bytes[i];
    if (b === 40) { // ( string )
      let depth = 1; i++;
      while (i < n && depth > 0) {
        const c = bytes[i];
        if (c === 92) { i += 2; continue; }
        if (c === 40) depth++;
        else if (c === 41) depth--;
        i++;
      }
      return { type: "string", s, e: i };
    }
    if (b === 60 && bytes[i + 1] === 60) { // << dict >>
      i += 2;
      const items = [];
      for (;;) {
        skipSpace();
        if (i >= n) break;
        if (bytes[i] === 62 && bytes[i + 1] === 62) { i += 2; break; }
        items.push(readObject());
      }
      return { type: "dict", value: items, s, e: i };
    }
    if (b === 60) { // <hex>
      while (i < n && bytes[i] !== 62) i++;
      i++;
      return { type: "hex", s, e: i };
    }
    if (b === 91) { // [ array ]
      i++;
      const items = [];
      for (;;) {
        skipSpace();
        if (i >= n) break;
        if (bytes[i] === 93) { i++; break; }
        items.push(readObject());
      }
      return { type: "array", value: items, s, e: i };
    }
    if (b === 47) { // /Name
      i++;
      while (i < n && isRegular(bytes[i])) i++;
      return { type: "name", value: latin(s + 1, i).replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), s, e: i };
    }
    if (b === 41 || b === 62 || b === 93 || b === 123 || b === 125) { i++; return { type: "junk", s, e: i }; }
    while (i < n && isRegular(bytes[i])) i++;
    const word = latin(s, i);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) return { type: "number", value: parseFloat(word), s, e: i };
    if (word === "true" || word === "false") return { type: "bool", value: word === "true", s, e: i };
    if (word === "null") return { type: "null", s, e: i };
    return { type: "op", value: word, s, e: i };
  };
  const skipSpace = () => {
    for (;;) {
      while (i < n && WS.has(bytes[i])) i++;
      if (i < n && bytes[i] === 37) { while (i < n && bytes[i] !== 10 && bytes[i] !== 13) i++; continue; }
      return;
    }
  };
  for (;;) {
    skipSpace();
    if (i >= n) break;
    const t = readObject();
    if (t.type !== "op") { if (t.type !== "junk") operands.push(t); continue; }
    if (t.value === "BI") {
      // inline image: key/value pairs, then ID, one white-space byte, binary data, then EI
      const s = operands.length ? operands[0].s : t.s;
      for (;;) {
        skipSpace();
        if (i >= n) break;
        const k = readObject();
        if (k.type === "op" && k.value === "ID") break;
      }
      i++; // the single white-space after ID
      while (i < n) {
        if (bytes[i] === 69 && bytes[i + 1] === 73 && (i === 0 || WS.has(bytes[i - 1])) && (i + 2 >= n || WS.has(bytes[i + 2]) || DELIM.has(bytes[i + 2]))) { i += 2; break; }
        i++;
      }
      ops.push({ op: "BI", operands: [], s, e: i });
      operands = [];
      continue;
    }
    ops.push({ op: t.value, operands, s: operands.length ? operands[0].s : t.s, e: t.e });
    operands = [];
  }
  return ops;
}

const enc = (s) => { const out = new Uint8Array(s.length); for (let k = 0; k < s.length; k++) out[k] = s.charCodeAt(k) & 255; return out; };

/**
 * Rewrites one content stream: text becomes invisible ("3 Tr" first, and every Tr operand becomes 3) unless
 * hideText is false, and "Do" of the XObjects for which dropXObject(name) is true is removed.
 * Returns { bytes, tr, dropped }.
 */
export function rewriteContent(bytes, { dropXObject = () => false, hideText = true } = {}) {
  const ops = parseContent(bytes);
  const pieces = hideText ? [enc("3 Tr\n")] : [];
  let pos = 0, tr = 0, dropped = 0;
  for (const o of ops) {
    let rep = null;
    if (o.op === "Tr" && hideText) { rep = "3 Tr"; tr++; }
    else if (o.op === "Do") {
      const name = o.operands[o.operands.length - 1];
      if (name?.type === "name" && dropXObject(name.value)) { rep = ""; dropped++; }
    }
    if (rep === null) continue;
    pieces.push(bytes.subarray(pos, o.s), enc(rep));
    pos = o.e;
  }
  pieces.push(bytes.subarray(pos));
  const total = pieces.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of pieces) { out.set(p, off); off += p.length; }
  return { bytes: out, tr, dropped };
}

/**
 * pdf-lib copy of the whole PDF with invisible text and without the layered images, for rendering
 * backgrounds. Throws for encrypted files or streams pdf-lib cannot decode (the caller then falls back to
 * erasing text from the normal render). Returns { bytes, stats: { pages, forms, tr, dropped } }.
 */
export async function patchPdfBytes(PDFLib, bytes, { dropImages = () => true, hideText = true } = {}) {
  const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, PDFStream, PDFRef, decodePDFRawStream } = PDFLib;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (doc.isEncrypted) throw new Error("This PDF is encrypted.");
  const ctx = doc.context;
  const N = (s) => PDFName.of(s);
  const stats = { pages: 0, forms: 0, tr: 0, dropped: 0 };
  const streamBytes = (s) => {
    if (s instanceof PDFRawStream) return decodePDFRawStream(s).decode();
    if (typeof s.getUnencodedContents === "function") return s.getUnencodedContents();
    if (typeof s.getContents === "function" && !s.dict.get(N("Filter"))) return s.getContents();
    throw new Error("Unsupported content stream.");
  };
  const xobjects = (res) => { const x = res?.lookup?.(N("XObject")); return x instanceof PDFDict ? x : null; };
  const isLayerImage = (res, pageIndex) => (name) => {
    const x = xobjects(res);
    const obj = x ? x.lookup(N(name)) : null;
    if (!(obj instanceof PDFStream)) return false;
    const sub = obj.dict.lookup(N("Subtype"));
    if (!sub || sub.toString() !== "/Image") return false;
    const mask = obj.dict.lookup(N("ImageMask"));
    if (mask && mask.toString() === "true") return false;
    return dropImages(pageIndex);
  };
  const seen = new Set();
  const patchForms = (res, pageIndex) => {
    const x = xobjects(res);
    if (!x) return;
    for (const [, val] of x.entries()) {
      if (!(val instanceof PDFRef) || seen.has(val.toString())) continue;
      seen.add(val.toString());
      const s = ctx.lookup(val);
      if (!(s instanceof PDFStream)) continue;
      const sub = s.dict.lookup(N("Subtype"));
      if (!sub || sub.toString() !== "/Form") continue;
      const fres = s.dict.lookup(N("Resources"));
      const own = fres instanceof PDFDict ? fres : res;
      const r = rewriteContent(streamBytes(s), { dropXObject: isLayerImage(own, pageIndex), hideText });
      const dict = s.dict.clone(ctx);
      dict.delete(N("Filter"));
      dict.delete(N("DecodeParms"));
      ctx.assign(val, PDFRawStream.of(dict, r.bytes));
      stats.forms++; stats.tr += r.tr; stats.dropped += r.dropped;
      patchForms(own, pageIndex);
    }
  };
  doc.getPages().forEach((page, pageIndex) => {
    const node = page.node;
    const res = node.Resources();
    const c = node.Contents();
    const parts = [];
    if (c instanceof PDFArray) for (let k = 0; k < c.size(); k++) { const s = c.lookup(k); if (s instanceof PDFStream) parts.push(streamBytes(s)); }
    else if (c instanceof PDFStream) parts.push(streamBytes(c));
    const joined = new Uint8Array(parts.reduce((a, p) => a + p.length + 1, 0));
    let off = 0;
    for (const p of parts) { joined.set(p, off); off += p.length; joined[off++] = 10; }
    const r = rewriteContent(joined, { dropXObject: isLayerImage(res, pageIndex), hideText });
    node.set(N("Contents"), ctx.register(PDFRawStream.of(ctx.obj({}), r.bytes)));
    stats.pages++; stats.tr += r.tr; stats.dropped += r.dropped;
    patchForms(res, pageIndex);
  });
  return { bytes: await doc.save({ useObjectStreams: false }), stats };
}
