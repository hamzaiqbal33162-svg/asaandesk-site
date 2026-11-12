// AsaanDesk Docs: turn a document into a real presentation in Studio ("doc to deck"). Every H1/H2 starts a slide; the text
// under it becomes up to six bullet lines (tables: their first rows). The first slide is a title slide in the doc's main
// colour. The deck is handed to Studio on this device (shared/store.js handoff) and opens as an editable 16:9 design.
// Uses Studio's own pure model + text layout modules, so the slides are exactly Studio's format.
const runText = (runs) => (runs || []).map((r) => r.text).join("").replace(/\s+/g, " ").trim();
const short = (t, n = 110) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const isDark = (hex) => { const m = /^#([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return true; const n = parseInt(m[1], 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 150; };

/** Sections of a doc model: [{ title, lines }]. */
export function docSections(doc) {
  const out = [];
  let cur = null;
  for (const b of doc.blocks || []) {
    if (/^h[12]$/.test(b.type) && runText(b.runs)) { cur = { title: short(runText(b.runs), 80), lines: [] }; out.push(cur); continue; }
    if (!cur) { cur = { title: doc.title || "Untitled", lines: [] }; out.push(cur); }
    if (cur.lines.length >= 6) continue;
    if (b.type === "table") { for (const row of b.rows.slice(0, 6 - cur.lines.length)) { const t = row.map((c) => runText(c.runs)).filter(Boolean).join(" · "); if (t) cur.lines.push(short(t)); } continue; }
    const t = runText(b.runs);
    if (t) cur.lines.push(short(t));
  }
  return out.filter((s, i) => i === 0 || s.lines.length || s.title);
}

/** A Studio design (16:9) for the doc. */
export async function docToDesign(doc) {
  const S = await import("../studio/model.js");
  const { textHeight } = await import("../studio/textlayout.js");
  const sections = docSections(doc).slice(0, 40);
  const design = S.newDesign("presentation-16x9", { name: (doc.title || "Untitled") + " (slides)" });
  const { w: W, h: H } = S.pageSize(design);
  const accent = (doc.blocks || []).find((b) => b.bg)?.bg || "#5b4cf0";
  const onAccent = isDark(accent) ? "#ffffff" : "#1b2133";
  const text = (content, o) => { const l = S.textLayer(content, o); l.h = Math.max(40, Math.ceil(textHeight(l.text, l.w))); return l; };
  design.pages = sections.map((s, i) => {
    const pg = S.newPage({ color: i === 0 ? accent : "#ffffff" });
    if (i === 0) {
      pg.layers.push(text(s.title, { x: 160, y: H / 2 - 170, w: W - 320, size: 96, bold: true, color: onAccent, name: "Title" }));
      if (s.lines[0]) pg.layers.push(text(s.lines[0], { x: 160, y: H / 2 + 40, w: W - 320, size: 40, color: onAccent, name: "Subtitle" }));
    } else {
      pg.layers.push(S.shapeLayer("rect", { x: 0, y: 0, w: 28, h: H, fill: accent, name: "Accent bar" }));
      pg.layers.push(text(s.title, { x: 160, y: 120, w: W - 320, size: 72, bold: true, color: "#1b2133", name: "Title" }));
      if (s.lines.length) pg.layers.push(text(s.lines.map((l) => "• " + l).join("\n"), { x: 160, y: 320, w: W - 320, size: 38, lineHeight: 1.45, color: "#334155", name: "Points" }));
    }
    return pg;
  });
  return design;
}

/** Opens the doc as slides in Studio (new tab). Returns the Studio URL. */
export async function openAsDeck(doc) {
  const design = await docToDesign(doc);
  const { putHandoff } = await import("../shared/store.js");
  const id = await putHandoff({ design, name: design.name });
  const url = `/design/studio/?handoff=${encodeURIComponent(id)}&tool=presentations`;
  const w = window.open(url, "_blank");
  if (!w) location.href = url;
  return url;
}
