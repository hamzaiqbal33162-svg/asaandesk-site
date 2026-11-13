// Sheets insert adapter for the shared left-rail panel kit (../shared/panels/, LEFT-RAIL PANELS PARITY), like Canva
// Sheets: Charts and Tables go INTO the sheet — a table is written into cells (header row, stripes, borders) and a chart
// is a real sheet chart over cells (your selected data when you have some, else the kit's sample data written into free
// cells, so changing a number changes the chart). Pictures, graphics, shapes, frames, grids and drawings float over the
// grid like charts do (photo frames and grids take dropped photos), and text comes in as floating text boxes. Nothing is
// written over cells that already hold data: the block moves below the used range. A click uses the active cell / the
// middle of the visible grid, a drop the cell / point under the pointer. D: the Sheets app's own functions (app.js).

let U = null;
const util = () => (U ||= import("../shared/insert-adapt.js"));
const hex = (v, d = null) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v.toLowerCase() : /^#[0-9a-f]{3}$/i.test(v || "") ? "#" + [...v.slice(1)].map((c) => c + c).join("").toLowerCase() : d);
const ROLE_REL = { heading: 0.075, subheading: 0.045, body: 0.03, caption: 0.022 };
const FAMILIES = ["sans", "serif", "mono", "calibri", "cambria"];
const KIND = { column: "bar", bar: "hbar", hbar: "hbar", stacked: "stacked", line: "line", area: "area", pie: "pie", donut: "donut", scatter: "scatter" };
const lum = (h) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000; };

export function makeSheetsInsert(D) {
  const live = () => { if (D.S.mode !== "edit") throw new Error("You are viewing. Choose Editing at the top to change the sheet."); D.commitEdit(); };
  const Z = () => D.zoom() || 1;
  /** A client point in the floating layer's units (the grid at 100%). */
  const layerPt = (cx, cy) => { const b = D.spacer.getBoundingClientRect(); return { x: Math.max(0, (cx - b.left) / Z()), y: Math.max(0, (cy - b.top) / Z()) }; };
  const viewCentre = () => { const r = D.scroller.getBoundingClientRect(); return layerPt(r.left + (r.width || 800) / 2, r.top + (r.height || 500) / 2); };
  const dropPt = (pt) => (pt ? (pt.clientX != null ? layerPt(pt.clientX, pt.clientY) : (() => { const r = D.stage().getBoundingClientRect(); return layerPt(r.left + pt.x, r.top + pt.y); })()) : null);
  const base = () => { const r = D.scroller.getBoundingClientRect(); return Math.max(320, Math.min(1400, Math.min(r.width || 900, r.height || 560) / Z())); };
  const anchorCell = (pt) => { if (pt?.clientX != null) { const c = D.cellAt(pt.clientX, pt.clientY); return { r: c.r, c: c.c }; } return { r: D.S.sel.r1, c: D.S.sel.c1 }; };
  /** A block of free cells for rows × cols at the anchor, else below the data in the anchor's column. */
  function freeBlock(a, rows, cols) {
    const s = D.sheet(), m = D.meta(s);
    const free = (r0, c0) => { for (let r = r0; r < r0 + rows; r++) for (let c = c0; c < c0 + cols; c++) if (D.S.wb.getInput(s, r, c) !== "" || m.images.has(D.key(r, c))) return false; return true; };
    const fits = (r0, c0) => r0 + rows <= s.rows && c0 + cols <= s.cols;
    if (fits(a.r, a.c) && free(a.r, a.c)) return a;
    const used = D.S.wb.usedRange(s);
    let r = used.rows ? used.rows + 1 : 0, c = Math.min(a.c, Math.max(0, s.cols - cols));
    while (!free(r, c) && r < s.rows) r++;
    if (r + rows > s.rows) { s.rows = r + rows + 20; D.S.wb.rebuild?.(); D.layout(); }
    return { r, c };
  }
  /** Adds a floating object (picture, text box) at the drop point or in the middle of the visible grid. */
  async function addFloating(ch, pt, { focus = false } = {}) {
    const p = dropPt(pt) || viewCentre();
    ch.id = D.uid(); ch.x = Math.max(0, Math.round(p.x - ch.w / 2)); ch.y = Math.max(0, Math.round(p.y - ch.h / 2));
    // cascade repeated adds
    while (D.meta().charts.some((o) => Math.abs(o.x - ch.x) < 2 && Math.abs(o.y - ch.y) < 2)) { ch.x += 20; ch.y += 20; }
    D.snapshot();
    D.meta().charts.push(ch);
    await D.renderCharts();
    D.afterChange();
    if (focus) D.focusFloating(ch.id);
    return ch;
  }
  const picture = (src, name, w, h, pt) => addFloating({ kind: "image", src, title: String(name || "Picture").slice(0, 60), w: Math.max(60, Math.round(w)), h: Math.max(60, Math.round(h)) + D.BAR_H }, pt);
  function textBox(spec, m) {
    const size = Math.max(8, Math.round((+spec.rel > 0 ? +spec.rel : ROLE_REL[spec.role] || ROLE_REL.body) * m * 0.75));
    const bold = spec.bold ?? (spec.weight ? +spec.weight >= 600 : spec.role === "heading" || spec.role === "subheading");
    const text = String(spec.content ?? "Your text here");
    const longest = Math.max(1, ...text.split("\n").map((l) => l.length)), lines = text.split("\n").length;
    const w = Math.round(+spec.width > 0 ? +spec.width * m * 0.75 : Math.max(size * 3, Math.min(m * 0.8, longest * size * 0.6 * (spec.uppercase ? 1.15 : 1) + size)));
    const st = { family: FAMILIES.includes(spec.family) ? spec.family : "sans", size, color: hex(spec.color, "#1b2133"), bold: !!bold, italic: !!spec.italic, align: ["left", "center", "right"].includes(spec.align) ? spec.align : spec.role === "heading" || spec.role === "subheading" ? "center" : "left" };
    if (+spec.letterSpacing) st.ls = +spec.letterSpacing;
    if (spec.uppercase) st.upper = true;
    if (+spec.lineHeight > 0) st.lh = +spec.lineHeight;
    if (hex(spec.background)) st.bg = hex(spec.background);
    D.fontReady?.(st.family, st.bold, st.italic);
    return { kind: "text", text, title: String(spec.name || "Text box").slice(0, 60), st, w: w + 16, h: Math.round(lines * size * (st.lh || 1.25) + 14) };
  }
  async function fillPicture(ch, src, at) {
    const A = await util();
    const data = await A.photoDataUrl(src), { nw, nh } = await A.imageSize(data);
    const svg = A.fillFramePicture(ch.src, data, nw, nh, at);
    D.snapshot();
    ch.src = A.svgUrl(svg);
    D.refreshFloating(ch.id);
    D.afterChange();
    D.toast("Photo placed in the " + (A.frameMeta(ch.src)?.kind === "grid" ? "grid." : "frame."));
  }
  async function frameUnder(pt) {
    const A = await util();
    let id = null;
    if (pt?.clientX != null) id = document.elementFromPoint?.(pt.clientX, pt.clientY)?.closest?.(".chart")?.dataset.id;
    else id = D.lastFloating() || document.activeElement?.closest?.(".chart")?.dataset.id;
    const ch = id ? D.meta().charts.find((c) => c.id === id) : null;
    return ch && ch.kind === "image" && A.frameMeta(ch.src) ? ch : null;
  }
  const writeCells = (at, rows) => {
    const list = [];
    rows.forEach((row, r) => row.forEach((v, c) => list.push({ r: at.r + r, c: at.c + c, input: String(v ?? "") })));
    D.snapshot();
    D.setInputs(list, { snap: false });
  };
  const styleCells = (fn) => { const m = D.meta(); fn((r, c, patch) => { const k = D.key(r, c); m.styles.set(k, { ...(m.styles.get(k) || {}), ...patch }); }); };
  const selectBlock = (at, rows, cols) => D.select(at.r, at.c, at.r + rows - 1, at.c + cols - 1);

  const ins = {
    /** Photos and pictures float over the grid; on a photo frame or grid the photo goes into it. */
    async image(src, name = "Picture", pt) {
      live();
      const fr = await frameUnder(pt);
      if (fr) { const el = document.querySelector(`.chart[data-id="${fr.id}"] img`), r = el?.getBoundingClientRect(); await fillPicture(fr, src, pt?.clientX != null && r?.width ? { u: (pt.clientX - r.left) / r.width, v: (pt.clientY - r.top) / r.height } : null); return; }
      const A = await util();
      let nw = 0, nh = 0;
      if (/^data:image\/svg\+xml/.test(src)) { const s = A.svgSize(A.svgOfSrc(src)); nw = s.w; nh = s.h; }
      if (!nw || !nh) ({ nw, nh } = await A.imageSize(src));
      nw ||= 320; nh ||= 220;
      const k = Math.min(1, (base() * 0.5) / Math.max(nw, nh));
      await picture(src, name, nw * k, nh * k, pt);
    },
    /** Graphics, stickers, icons, shapes, 3D, forms (kit SVG): a floating picture sized from rel. */
    async svg(markup, opts = {}, pt) {
      live();
      const A = await util(), sz = A.svgSize(markup), aspect = +opts.aspect > 0 ? +opts.aspect : sz.w > 0 && sz.h > 0 ? sz.w / sz.h : 1;
      const box = A.relBox(opts.rel || 0.25, aspect, base());
      await picture(A.svgUrl(markup), opts.name || "Graphic", box.w, box.h, pt);
    },
    /** Text: a floating text box (font, size, colour, caps, letter spacing, background); a click starts typing. */
    async text(spec = {}, pt) {
      live();
      await addFloating(textBox(spec, base()), pt, { focus: !pt });
    },
    /** Font combinations: text boxes keeping their places around the combination's centre. */
    async textGroup(specs = [], pt) {
      live();
      const list = (Array.isArray(specs) ? specs : [specs]).filter(Boolean);
      if (!list.length) return false;
      const m = base(), c = dropPt(pt) || viewCentre();
      const boxes = list.map((s) => textBox(s, m));
      const off = list.some((s) => s.dx != null || s.dy != null);
      let y = 0;
      D.snapshot();
      boxes.forEach((b, i) => {
        b.id = D.uid();
        const cx = off ? c.x + (+list[i].dx || 0) * m * 0.75 : c.x, cy = off ? c.y + (+list[i].dy || 0) * m * 0.75 : c.y + y;
        if (!off) y += b.h + 4;
        b.x = Math.max(0, Math.round(cx - b.w / 2)); b.y = Math.max(0, Math.round(cy - b.h / 2));
        D.meta().charts.push(b);
      });
      await D.renderCharts(); D.afterChange();
    },
    /** Charts: a real sheet chart. With data selected it charts your data (like Magic Charts); otherwise the kit's
     *  sample numbers go into free cells and the chart is made from them (edit a number, the chart follows). */
    async chart(spec = {}, pt) {
      live();
      const A = await util(), c = A.chartModel(spec);
      const at0 = anchorCell(pt);
      if (c.kind === "number") {
        const rows = spec.delta ? 3 : 2, at = freeBlock(at0, rows, 1), v = spec.value ?? c.series[0]?.values[0] ?? 0, ink = hex((spec.colors || [])[0], "#5b4cf0");
        writeCells(at, [[spec.label || c.title || c.series[0]?.name || "Total"], [`${v}${spec.unit || ""}`], ...(spec.delta ? [[String(spec.delta)]] : [])]);
        styleCells((set) => { set(at.r, at.c, { color: "#64748b", b: true }); set(at.r + 1, at.c, { b: true, size: 28, color: ink }); if (spec.delta) set(at.r + 2, at.c, { b: true, color: /^-/.test(String(spec.delta)) ? "#e11d48" : "#16a34a" }); });
        D.autoHeights(D.sheet(), new Set([at.r + 1])); D.afterChange(); selectBlock(at, rows, 1);
        D.toast("Big number added in the sheet: change the number in the cell.");
        return;
      }
      if (c.kind === "progress") {
        const at = freeBlock(at0, 1, 3), v = +spec.value >= 0 ? +spec.value : c.series[0]?.values[0] ?? 0, of = 100;
        const pc = D.cellName(at.r, at.c + 1);
        writeCells(at, [[spec.label || c.title || c.labels[0] || "Progress", `${Math.round(Math.max(0, Math.min(1, v / of)) * 100)}%`, `=REPT("█",ROUND(MIN(1,MAX(0,${pc}))*10,0))&REPT("░",10-ROUND(MIN(1,MAX(0,${pc}))*10,0))`]]);
        styleCells((set) => { set(at.r, at.c + 1, { b: true }); set(at.r, at.c + 2, { color: "#5b4cf0" }); });
        D.afterChange(); selectBlock(at, 1, 3);
        D.toast("Progress bar added in the sheet: change the percent and the bar follows.");
        return;
      }
      const kind = spec.stacked && (c.kind === "column" || c.kind === "bar") ? "stacked" : KIND[c.kind] || "bar";
      const sel = D.S.sel, multi = sel.r1 !== sel.r2 || sel.c1 !== sel.c2;
      if (!pt && multi && D.hasNumbers(sel)) { await D.insertChart({ kind, title: spec.title || "" }); return; }
      const rows = [["", ...c.series.map((s) => s.name)], ...c.labels.map((l, i) => [l, ...c.series.map((s) => s.values[i])])];
      const at = freeBlock(at0, rows.length, rows[0].length);
      writeCells(at, rows);
      styleCells((set) => { for (let k = 0; k < rows[0].length; k++) set(at.r, at.c + k, { b: true, fill: "#ece9ff", color: "#2a2373" }); });
      const rg = { r1: at.r, c1: at.c, r2: at.r + rows.length - 1, c2: at.c + rows[0].length - 1 };
      selectBlock(at, rows.length, rows[0].length);
      await D.insertChart({ kind, title: c.title || (c.series.length === 1 ? c.series[0].name : "Chart"), range: D.rangeName(rg.r1, rg.c1, rg.r2, rg.c2), near: rg });
      if (pt) { const ch = D.meta().charts.at(-1), p = dropPt(pt); if (ch && p) { ch.x = Math.max(0, Math.round(p.x - ch.w / 2)); ch.y = Math.max(0, Math.round(p.y - 20)); D.renderCharts(); D.afterChange(); } }
    },
    /** Tables: written into cells — header row in the kit's colour, stripes and borders — and selected. */
    async table(spec = {}, pt) {
      live();
      const A = await util(), t = A.tableModel(spec), st = t.style || {};
      const at = freeBlock(anchorCell(pt), t.rows, t.cols);
      // Elements › Sheets items keep their formulas (totals, averages), moved to where the table lands
      const cells = t.cells.map((row) => [...row]);
      for (const [ref, f] of Object.entries(spec.formulas || {})) { const q = D.parseCellName(ref); if (q && q.row < t.rows && q.col < t.cols && /^=/.test(String(f))) cells[q.row][q.col] = D.shiftFormula(String(f), at.r, at.c); }
      writeCells(at, cells);
      const head = hex(st.head, "#ece9ff"), headInk = lum(head) > 150 ? "#1b2133" : "#ffffff";
      const line = st.border === false || st.border === "none" ? null : hex(typeof st.border === "object" ? st.border?.color : st.border, "#c9cde0");
      const stripe = st.stripe ? hex(typeof st.stripe === "string" ? st.stripe : null, "#f4f5fa") : null;
      styleCells((set) => {
        for (let r = 0; r < t.rows; r++) for (let c = 0; c < t.cols; c++) {
          const p = {};
          if (t.header && r === 0) Object.assign(p, { b: true, fill: head, color: headInk });
          else if (stripe && r % 2 === 0) p.fill = stripe;
          if (line) Object.assign(p, { bd: "trbl", bc: line });
          if (Object.keys(p).length) set(at.r + r, at.c + c, p);
        }
      });
      D.afterChange(); selectBlock(at, t.rows, t.cols);
      D.toast(`Table added in cells ${D.rangeName(at.r, at.c, at.r + t.rows - 1, at.c + t.cols - 1)}.`);
    },
    /** Photo frames: an empty frame floating over the grid; drop a photo on it (or click a photo while it is selected). */
    async frame(spec = {}, pt) {
      live();
      const A = await util(), f = A.framePicture(spec), box = A.relBox(spec.rel || 0.3, f.aspect, base());
      await picture(A.svgUrl(f.svg), spec.name || "Photo frame", box.w, box.h, pt);
    },
    /** Grids: photo spots floating over the grid; each dropped photo fills the spot under the pointer. */
    async grid(spec = {}, pt) {
      live();
      const A = await util(), g = A.gridPicture(spec), w = Math.min(base() * 0.8, 600);
      await picture(A.svgUrl(g.svg), spec.name || "Photo grid", w, (w * g.h) / g.w, pt);
      D.toast(`Grid added: ${g.cells} photo spots. Drop photos on them.`);
    },
    /** Videos: our own animated loops float as moving pictures; other clips come in as their cover (kit fallback). */
    async video(spec = {}, pt) {
      const src = String(spec.src || "");
      if (!/^data:image\/svg\+xml/.test(src)) return false;
      live();
      const A = await util(), box = A.relBox(spec.rel || 0.4, +spec.aspect > 0 ? +spec.aspect : 16 / 9, base());
      await picture(src, spec.name || "Video", box.w, box.h, pt);
    },
    /** A sheet has no pages: the PDF download splits it into numbered pages itself. */
    async pageNumber() { throw new Error("A sheet has no pages to number. The PDF download splits the sheet into pages for you."); },
    /** A drawing from the kit's drawing layer: a floating picture. */
    async drawing(markup, size = {}, pt) {
      live();
      const A = await util(), sz = A.svgSize(markup);
      await picture(A.svgUrl(markup), "Drawing", (+size.w || sz.w || 300) / Z(), (+size.h || sz.h || 200) / Z(), pt);
    },
  };
  return ins;
}
