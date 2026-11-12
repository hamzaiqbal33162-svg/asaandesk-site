// AsaanDesk Studio: presentation decks (our own content, colours and shapes). Pure module, no DOM.
// templates.js calls the default export with its helpers. Every deck has a title, agenda, content,
// chart or table, and closing slide, plus speaker notes on each slide (page.notes).
import { tableLayer } from "./model.js";

export default function addDecks(k) {
  const { tpl, T, R, C, S, F, page } = k;
  const W = 1920, H = 1080;

  // Themes: colours + font pair + decoration style.
  const TH = {
    indigo: { style: "band", bg: "#ffffff", soft: "#efedff", ink: "#1b2133", muted: "#5b6478", a: "#5b4cf0", b: "#ff7a59", head: "sans", body: "sans", chart: ["#5b4cf0", "#ff7a59", "#14b8a6", "#f59e0b"] },
    night: { style: "dark", bg: "#0f172a", soft: "#1e293b", ink: "#f8fafc", muted: "#94a3b8", a: "#38bdf8", b: "#a78bfa", head: "sans", body: "sans", chart: ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24"] },
    coral: { style: "split", bg: "#fffaf5", soft: "#ffe8dc", ink: "#2b1d16", muted: "#7a6256", a: "#ef5b3c", b: "#2a9d8f", head: "serif", body: "sans", chart: ["#ef5b3c", "#2a9d8f", "#f4a261", "#264653"] },
    ocean: { style: "gradient", bg: "#ffffff", soft: "#e0f2fe", ink: "#0b2545", muted: "#4b6584", a: "#0ea5e9", b: "#6366f1", head: "sans", body: "calibri", chart: ["#0ea5e9", "#6366f1", "#14b8a6", "#f43f5e"] },
    paper: { style: "minimal", bg: "#fbfaf7", soft: "#f1eee6", ink: "#1f1d1a", muted: "#6b665c", a: "#1f1d1a", b: "#c2410c", head: "serif", body: "serif", chart: ["#1f1d1a", "#c2410c", "#a8a29e", "#65a30d"] },
    mint: { style: "bold", bg: "#f0fdf8", soft: "#ccfbf1", ink: "#063b33", muted: "#3f6b63", a: "#0d9488", b: "#f59e0b", head: "sans", body: "sans", chart: ["#0d9488", "#f59e0b", "#6366f1", "#ef4444"] },
    plum: { style: "dark", bg: "#2e1065", soft: "#3b0f80", ink: "#faf5ff", muted: "#c4b5fd", a: "#f0abfc", b: "#fde047", head: "cambria", body: "sans", chart: ["#f0abfc", "#fde047", "#67e8f9", "#86efac"] },
    sun: { style: "bold", bg: "#fffbeb", soft: "#fef3c7", ink: "#3b2a05", muted: "#78601c", a: "#f59e0b", b: "#db2777", head: "sans", body: "sans", chart: ["#f59e0b", "#db2777", "#0ea5e9", "#16a34a"] },
    forest: { style: "split", bg: "#f7faf5", soft: "#e3eedb", ink: "#1a2e12", muted: "#55704a", a: "#3f7d20", b: "#c08a2b", head: "cambria", body: "calibri", chart: ["#3f7d20", "#c08a2b", "#7aa95c", "#2f4858"] },
    slate: { style: "band", bg: "#ffffff", soft: "#eef2f7", ink: "#111827", muted: "#4b5563", a: "#1d4ed8", b: "#10b981", head: "calibri", body: "calibri", chart: ["#1d4ed8", "#10b981", "#f59e0b", "#ef4444"] },
    rose: { style: "gradient", bg: "#ffffff", soft: "#ffe4e6", ink: "#3f0d1a", muted: "#7f4a57", a: "#e11d48", b: "#7c3aed", head: "serif", body: "sans", chart: ["#e11d48", "#7c3aed", "#f97316", "#0891b2"] },
    mono: { style: "minimal", bg: "#ffffff", soft: "#f3f4f6", ink: "#0a0a0a", muted: "#525252", a: "#0a0a0a", b: "#2563eb", head: "sans", body: "sans", chart: ["#0a0a0a", "#2563eb", "#9ca3af", "#f97316"] },
    sand: { style: "stripe", bg: "#fbf7f0", soft: "#efe5d4", ink: "#2d2418", muted: "#6f6150", a: "#b4532a", b: "#2f6f62", head: "cambria", body: "sans", chart: ["#b4532a", "#2f6f62", "#d6a35c", "#5b4b3a"] },
    lagoon: { style: "stripe", bg: "#f4fbfb", soft: "#d5f0ee", ink: "#0f2f33", muted: "#47676b", a: "#0f766e", b: "#e76f51", head: "sans", body: "calibri", chart: ["#0f766e", "#e76f51", "#2a9d8f", "#264653"] },
  };
  const grad = (t) => [t.a, t.b, 135];
  const dark = (t) => t.style === "dark";

  // Decoration per style (behind the content).
  function deco(t, kind) {
    const s = t.style, out = [];
    if (s === "band") {
      out.push(R(0, 0, kind === "title" ? 120 : 28, H, t.a, { name: "Side band" }));
      if (kind === "title") out.push(C(W - 520, -200, 720, 720, t.soft, { name: "Circle" }), C(W - 260, 640, 360, 360, t.b, { op: 0.9, name: "Accent circle" }));
    } else if (s === "dark") {
      out.push(C(W - 640, -260, 900, 900, t.soft, { name: "Glow circle" }));
      if (kind === "title") out.push(C(-180, 700, 520, 520, t.a, { op: 0.18, name: "Circle" }), S("star", W - 360, 120, 90, 90, t.b, { name: "Star" }));
      else out.push(R(110, 196, 140, 8, t.a, { radius: 4, name: "Heading bar" }));
    } else if (s === "split") {
      if (kind === "title") out.push(R(W * 0.55, 0, W * 0.45, H, t.a, { name: "Colour block" }));
      else out.push(R(W - 80, 0, 80, H, t.a, { name: "Edge strip" }), R(W - 80, 0, 80, 260, t.b, { name: "Edge accent" }));
    } else if (s === "gradient") {
      if (kind !== "title" && kind !== "closing") out.push(R(0, 0, W, 24, t.a, { name: "Top bar" }), R(W * 0.6, 0, W * 0.4, 24, t.b, { name: "Top bar end" }));
    } else if (s === "minimal") {
      out.push(R(110, H - 110, W - 220, 2, t.ink, { op: 0.25, name: "Footer rule" }));
      if (kind === "title") out.push(R(110, 150, 2, H - 300, t.ink, { op: 0.4, name: "Vertical rule" }));
    } else if (s === "stripe") {
      out.push(R(0, 0, W, 16, t.a, { name: "Top stripe" }), R(0, 16, W, 6, t.b, { name: "Top stripe 2" }), R(0, H - 22, W, 22, t.a, { name: "Bottom stripe" }));
      if (kind === "title") out.push(R(W - 300, 0, 300, H, t.soft, { name: "Side panel" }), S("polygon", W - 260, H / 2 - 110, 220, 220, t.b, { sides: 6, op: 0.85, name: "Hexagon" }));
    } else if (s === "bold") {
      out.push(C(-220, -220, 620, 620, t.soft, { name: "Corner blob" }), C(W - 380, H - 380, 600, 600, t.a, { op: kind === "title" ? 1 : 0.15, name: "Corner blob" }));
      if (kind === "title") out.push(S("triangle", W - 520, 120, 180, 160, t.b, { rot: 12, name: "Triangle" }));
    }
    return out;
  }
  const bgOf = (t, kind) => (t.style === "gradient" && (kind === "title" || kind === "closing") ? grad(t) : t.bg);
  const inkOn = (t, kind) => (t.style === "gradient" && (kind === "title" || kind === "closing") ? "#ffffff" : t.ink);
  const mutedOn = (t, kind) => (t.style === "gradient" && (kind === "title" || kind === "closing") ? "#e0f2fe" : t.muted);
  const slide = (t, kind, layers, notes) => { const p = page(kind === "plain" ? t.bg : bgOf(t, kind), [...(kind === "plain" ? [] : deco(t, kind)), ...layers]); p.notes = notes; return p; };
  const heading = (t, text, y = 110) => T(text, 110, y, 1500, { size: 72, bold: true, family: t.head, color: t.ink, name: "Heading" });
  const footer = (t, c, n) => [T(c.short, 110, H - 92, 900, { size: 22, color: t.muted, family: t.body, name: "Footer" }), T(String(n), W - 310, H - 92, 200, { size: 22, color: t.muted, align: "right", family: t.body, name: "Page number" })];

  // Layout variants (v1–v3) for the title and content slides; v0 is the layout above/below.
  function titleVariant(t, c, v) {
    const L = [];
    if (v === 1) { // centred
      L.push(C(-260, -260, 640, 640, t.soft, { name: "Corner circle" }), C(W - 380, H - 380, 640, 640, t.soft, { name: "Corner circle" }), R(W / 2 - 90, 690, 180, 10, t.b, { radius: 5, name: "Accent line" }));
      L.push(T(c.kicker.toUpperCase(), 260, 250, 1400, { size: 30, bold: true, ls: 6, color: t.a, align: "center", family: t.body, name: "Kicker" }),
        T(c.title, 160, 320, 1600, { size: c.title.length > 22 ? 100 : 130, bold: true, family: t.head, color: t.ink, align: "center", lh: 1.05, name: "Title" }),
        T(c.subtitle, 360, 730, 1200, { size: 38, color: t.muted, family: t.body, align: "center", lh: 1.3, name: "Subtitle" }),
        T(c.by, 360, 900, 1200, { size: 28, bold: true, color: t.ink, family: t.body, align: "center", name: "Presenter" }));
      return slide(t, "plain", L, c.notes[0]);
    }
    if (v === 2) { // photo half
      L.push(F(0, 0, W * 0.46, H, { name: "Cover photo" }), R(W * 0.46, 0, 24, H, t.a, { name: "Divider" }));
      L.push(T(c.kicker.toUpperCase(), W * 0.52, 280, 820, { size: 28, bold: true, ls: 5, color: t.b, family: t.body, name: "Kicker" }),
        T(c.title, W * 0.52, 340, 820, { size: c.title.length > 22 ? 84 : 104, bold: true, family: t.head, color: t.ink, lh: 1.05, name: "Title" }),
        T(c.subtitle, W * 0.52, 640, 800, { size: 36, color: t.muted, family: t.body, lh: 1.3, name: "Subtitle" }),
        T(c.by, W * 0.52, 880, 800, { size: 26, bold: true, color: t.ink, family: t.body, name: "Presenter" }));
      return slide(t, "plain", L, c.notes[0]);
    }
    if (v === 4) { // framed
      L.push(R(60, 60, W - 120, H - 120, "none", { stroke: t.a, sw: 14, name: "Frame" }), R(60, 60, 420, 70, t.a, { name: "Frame tab" }),
        T(c.kicker.toUpperCase(), 80, 78, 380, { size: 26, bold: true, ls: 4, color: "#ffffff", family: t.body, name: "Kicker" }),
        T(c.title, 160, 300, 1600, { size: c.title.length > 22 ? 100 : 124, bold: true, family: t.head, color: t.ink, lh: 1.05, name: "Title" }),
        R(160, 600, 260, 8, t.b, { name: "Underline" }),
        T(c.subtitle, 160, 650, 1300, { size: 38, color: t.muted, family: t.body, lh: 1.3, name: "Subtitle" }),
        T(c.by, 160, 860, 1300, { size: 28, bold: true, color: t.ink, family: t.body, name: "Presenter" }));
      return slide(t, "plain", L, c.notes[0]);
    }
    if (v === 5) { // banded: title on a full-width colour band
      L.push(R(0, 330, W, 400, dark(t) ? t.soft : t.a, { name: "Title band" }), C(W - 330, 250, 220, 220, t.b, { name: "Accent circle" }),
        T(c.kicker.toUpperCase(), 140, 250, 1300, { size: 30, bold: true, ls: 6, color: t.a, family: t.body, name: "Kicker" }),
        T(c.title, 140, 400, 1400, { size: c.title.length > 22 ? 96 : 120, bold: true, family: t.head, color: "#ffffff", lh: 1.05, name: "Title" }),
        T(c.subtitle, 140, 770, 1300, { size: 38, color: t.muted, family: t.body, lh: 1.3, name: "Subtitle" }),
        T(c.by, 140, 900, 1300, { size: 28, bold: true, color: t.ink, family: t.body, name: "Presenter" }));
      return slide(t, "plain", L, c.notes[0]);
    }
    // v3: bold colour block
    L.push(R(0, 0, W, H, dark(t) ? t.soft : t.a, { name: "Colour background" }), C(W - 700, -300, 1000, 1000, "#ffffff", { op: 0.1, name: "Soft circle" }), C(-200, H - 360, 560, 560, "#ffffff", { op: 0.08, name: "Soft circle" }),
      R(140, 250, 120, 12, t.b, { radius: 6, name: "Accent bar" }));
    L.push(T(c.kicker.toUpperCase(), 140, 290, 1300, { size: 30, bold: true, ls: 6, color: "#ffffff", op: 0.85, family: t.body, name: "Kicker" }),
      T(c.title, 140, 350, 1400, { size: c.title.length > 22 ? 104 : 136, bold: true, family: t.head, color: "#ffffff", lh: 1.02, name: "Title" }),
      T(c.subtitle, 140, 680, 1200, { size: 38, color: "#ffffff", op: 0.9, family: t.body, lh: 1.3, name: "Subtitle" }),
      T(c.by, 140, 880, 1200, { size: 28, bold: true, color: "#ffffff", family: t.body, name: "Presenter" }));
    return slide(t, "plain", L, c.notes[0]);
  }
  function contentVariant(t, c, v) {
    const L = [heading(t, c.contentTitle)];
    if (v === 1) { // bullets + photo
      c.points.forEach(([title, body], i) => {
        const y = 300 + i * 200;
        L.push(R(110, y + 8, 14, 14, i === 1 ? t.b : t.a, { radius: 7, name: "Bullet" }), T(title, 150, y - 6, 820, { size: 40, bold: true, color: t.ink, family: t.head, name: "Point title" }), T(body, 150, y + 50, 820, { size: 28, color: t.muted, family: t.body, lh: 1.35, name: "Point text" }));
      });
      L.push(F(1080, 270, 730, 620, { shape: "rounded", radius: 32, name: "Photo" }));
    } else if (v === 2) { // numbered rows
      c.points.forEach(([title, body], i) => {
        const y = 290 + i * 210;
        L.push(R(110, y, 1700, 180, t.soft, { radius: 24, name: "Row" }), C(150, y + 40, 100, 100, i === 1 ? t.b : t.a, { name: "Number dot" }), T(String(i + 1), 150, y + 64, 100, { size: 44, bold: true, color: "#ffffff", align: "center", family: t.body, name: "Number" }),
          T(title, 290, y + 34, 520, { size: 40, bold: true, color: t.ink, family: t.head, name: "Row title" }), T(body, 840, y + 46, 920, { size: 30, color: t.muted, family: t.body, lh: 1.35, name: "Row text" }));
      });
    } else if (v === 4) { // 2 × 2 tiles: three points and a photo
      c.points.forEach(([title, body], i) => {
        const x = 110 + (i % 2) * 860, y = 280 + Math.floor(i / 2) * 340;
        L.push(R(x, y, 830, 310, i === 1 ? t.soft : t.bg, { radius: 24, stroke: t.soft, sw: 3, name: "Tile" }), R(x + 40, y + 40, 60, 8, i === 1 ? t.b : t.a, { name: "Tile line" }),
          T(title, x + 40, y + 70, 750, { size: 40, bold: true, color: t.ink, family: t.head, name: "Tile title" }), T(body, x + 40, y + 130, 740, { size: 28, color: t.muted, family: t.body, lh: 1.35, name: "Tile text" }));
      });
      L.push(F(970, 620, 830, 310, { shape: "rounded", radius: 24, name: "Photo" }));
    } else if (v === 5) { // timeline
      L.push(R(160, 470, 1600, 8, t.soft, { name: "Timeline" }));
      c.points.forEach(([title, body], i) => {
        const x = 160 + i * 620;
        L.push(C(x - 6, 440, 68, 68, i === 1 ? t.b : t.a, { name: "Milestone" }), T(String(i + 1), x - 6, 455, 68, { size: 30, bold: true, color: "#ffffff", align: "center", family: t.body, name: "Milestone number" }),
          T(title, x - 6, 560, 520, { size: 40, bold: true, color: t.ink, family: t.head, name: "Milestone title" }), T(body, x - 6, 620, 500, { size: 28, color: t.muted, family: t.body, lh: 1.35, name: "Milestone text" }));
      });
    } else { // statement + three highlights
      L.push(R(110, 280, 12, 250, t.a, { name: "Quote bar" }), T(c.points[0][1], 160, 290, 1500, { size: 60, family: t.head, italic: true, color: t.ink, lh: 1.2, name: "Statement" }));
      c.points.forEach(([title, body], i) => {
        const x = 110 + i * 590;
        L.push(R(x, 640, 530, 6, i === 1 ? t.b : t.a, { name: "Line" }), T(title, x, 670, 530, { size: 40, bold: true, color: t.ink, family: t.head, name: "Highlight" }), T(body, x, 730, 520, { size: 26, color: t.muted, family: t.body, lh: 1.35, name: "Highlight text" }));
      });
    }
    L.push(...footer(t, c, 4));
    return slide(t, "content", L, c.notes[2]);
  }
  function titleSlide(t, c) {
    const ink = inkOn(t, "title"), muted = mutedOn(t, "title");
    const split = t.style === "split";
    const x = t.style === "band" ? 230 : t.style === "minimal" ? 170 : 130, w = split ? W * 0.55 - 220 : 1250;
    const L = [
      T(c.kicker.toUpperCase(), x, 300, w, { size: 30, bold: true, ls: 6, color: t.style === "gradient" ? "#ffffff" : t.b, family: t.body, name: "Kicker" }),
      T(c.title, x, 360, w, { size: c.title.length > 22 ? 96 : 120, bold: true, family: t.head, color: ink, lh: 1.05, name: "Title" }),
      T(c.subtitle, x, 640, w, { size: 40, color: muted, family: t.body, lh: 1.3, name: "Subtitle" }),
      T(c.by, x, 860, w, { size: 28, bold: true, color: ink, family: t.body, name: "Presenter" }),
    ];
    if (split) L.push(F(W * 0.55 + 120, 180, W * 0.45 - 240, H - 360, { shape: "rounded", radius: 36, name: "Cover photo" }));
    return slide(t, "title", L, c.notes[0]);
  }
  function agendaSlide(t, c) {
    const L = [heading(t, c.agendaTitle || "Agenda")];
    const n = c.agenda.length, top = 290, gap = Math.min(150, 600 / n);
    c.agenda.forEach((item, i) => {
      const y = top + i * gap;
      L.push(C(110, y, 84, 84, i % 2 ? t.b : t.a, { name: "Number dot" }), T(String(i + 1).padStart(2, "0"), 110, y + 22, 84, { size: 32, bold: true, color: "#ffffff", align: "center", family: t.body, name: "Number" }), T(item, 230, y + 16, 1300, { size: 44, color: t.ink, family: t.body, name: "Agenda item" }));
    });
    L.push(...footer(t, c, 2));
    return slide(t, "agenda", L, c.notes[1]);
  }
  function contentSlide(t, c) {
    const L = [heading(t, c.contentTitle)];
    const cw = 520, gap = 70, x0 = 110;
    c.points.forEach(([title, body], i) => {
      const x = x0 + i * (cw + gap);
      L.push(R(x, 300, cw, 560, t.soft, { radius: 28, name: "Card" }), R(x + 40, 340, 72, 72, i === 1 ? t.b : t.a, { radius: 18, name: "Icon tile" }), T(String(i + 1), x + 40, 355, 72, { size: 36, bold: true, color: "#ffffff", align: "center", family: t.body, name: "Card number" }),
        T(title, x + 40, 450, cw - 80, { size: 40, bold: true, color: t.ink, family: t.head, name: "Card title" }),
        T(body, x + 40, 530, cw - 80, { size: 28, color: t.muted, family: t.body, lh: 1.4, name: "Card text" }));
    });
    L.push(...footer(t, c, 4));
    return slide(t, "content", L, c.notes[2]);
  }
  // Bar chart drawn from our own shapes and text, so it stays sharp and editable everywhere.
  function barChart(t, ch, x, y, w, h) {
    const out = [], series = ch.series, labels = ch.labels;
    const max = Math.max(...series.flatMap((s) => s.values)) * 1.15 || 1;
    const legendH = series.length > 1 ? 60 : 0, labelH = 56, plotH = h - labelH - legendH - 40, top = y + legendH + 40;
    const gw = w / labels.length, bw = Math.min(140, (gw * 0.7) / series.length);
    out.push(R(x, top + plotH, w, 3, t.muted, { op: 0.5, name: "Axis" }));
    for (let g = 1; g <= 3; g++) out.push(R(x, top + plotH - (plotH * g) / 3.45, w, 1.5, t.muted, { op: 0.18, name: "Grid line" }));
    labels.forEach((lb, i) => {
      const gx = x + i * gw + (gw - bw * series.length) / 2;
      series.forEach((s, j) => {
        const v = s.values[i], bh = Math.max(4, (v / max) * plotH), bx = gx + j * bw;
        out.push(R(bx + 4, top + plotH - bh, bw - 8, bh, t.chart[j % t.chart.length], { radius: Math.min(12, bw / 4), name: "Bar " + lb }));
        out.push(T(String(v) + (ch.unit || ""), bx - 20, top + plotH - bh - 44, bw + 40, { size: 26, bold: true, color: t.ink, align: "center", family: t.body, name: "Value" }));
      });
      out.push(T(lb, x + i * gw, top + plotH + 14, gw, { size: 26, color: t.muted, align: "center", family: t.body, name: "Label " + lb }));
    });
    if (series.length > 1) series.forEach((s, j) => { out.push(R(x + j * 260, y, 32, 32, t.chart[j % t.chart.length], { radius: 8, name: "Legend key" }), T(s.name, x + j * 260 + 46, y, 200, { size: 26, color: t.ink, family: t.body, name: "Legend" })); });
    return out;
  }
  function chartSlide(t, c) {
    const ch = c.chart;
    const L = [heading(t, ch.title)];
    L.push(...barChart(t, ch, 110, 250, 1080, 700));
    L.push(R(1290, 290, 520, 640, t.soft, { radius: 28, name: "Takeaways card" }), T("Key takeaways", 1340, 330, 440, { size: 36, bold: true, color: t.ink, family: t.head, name: "Takeaways title" }));
    L.push(T(ch.takeaways.map((s) => "• " + s).join("\n"), 1340, 410, 430, { size: 28, color: t.muted, family: t.body, lh: 1.5, name: "Takeaways" }));
    L.push(...footer(t, c, 5));
    return slide(t, "chart", L, c.notes[3]);
  }
  function tableSlide(t, c) {
    const tb = c.table;
    const L = [heading(t, tb.title)];
    const cols = tb.rows[0].length, size = 30;
    const table = { cells: tb.rows.map((r) => r.map(String)), colW: Array.from({ length: cols }, (_, i) => (i === 0 ? 1.6 : 1) / (1.6 + cols - 1)), header: true, stripe: true, border: { color: dark(t) ? "#475569" : "#cbd5e1", width: 1 }, headerFill: t.a, headerColor: t.style === "minimal" || dark(t) ? (dark(t) ? "#0f172a" : "#ffffff") : "#ffffff", color: t.ink, align: Array.from({ length: cols }, (_, i) => (i === 0 ? "left" : "center")) };
    L.push(tableLayer(table, { x: 110, y: 290, w: 1700, h: Math.round(tb.rows.length * size * 2.1), size, name: "Table" }));
    if (tb.note) L.push(T(tb.note, 110, 300 + tb.rows.length * size * 2.1 + 40, 1700, { size: 28, italic: true, color: t.muted, family: t.body, name: "Table note" }));
    L.push(...footer(t, c, 5));
    return slide(t, "table", L, c.notes[4]);
  }
  function closingSlide(t, c) {
    const ink = inkOn(t, "closing"), muted = mutedOn(t, "closing");
    const L = [
      T(c.closing, 160, 330, 1600, { size: 130, bold: true, family: t.head, color: ink, align: "center", lh: 1.05, name: "Closing title" }),
      T(c.closingSub, 260, 530, 1400, { size: 40, color: muted, family: t.body, align: "center", lh: 1.35, name: "Closing text" }),
      R(660, 700, 600, 96, t.style === "gradient" ? "#ffffff" : t.a, { radius: 48, name: "Contact pill" }),
      T(c.contact, 660, 726, 600, { size: 32, bold: true, color: t.style === "gradient" ? t.a : "#ffffff", align: "center", family: t.body, name: "Contact" }),
    ];
    return slide(t, "closing", L, c.notes[5]);
  }
  const CONTENT = {};
  // More slide types (ROUND 2): section divider, timeline, big numbers, team and quote.
  function sectionSlide(t, c) {
    const L = [R(0, 0, W * 0.38, H, dark(t) ? t.soft : t.a, { name: "Section band" }), T("02", 120, 330, W * 0.3, { size: 220, bold: true, family: t.head, color: "#ffffff", lh: 1, name: "Section number" }),
      T(c.agenda[1] || c.contentTitle, W * 0.44, 400, W * 0.5, { size: 88, bold: true, family: t.head, color: t.ink, lh: 1.05, name: "Section title" }),
      T(c.subtitle, W * 0.44, 640, W * 0.48, { size: 32, family: t.body, color: t.muted, lh: 1.35, name: "Section text" })];
    return slide(t, "plain", L, "Section: " + (c.agenda[1] || c.contentTitle));
  }
  function timelineSlide(t, c) {
    const steps = c.agenda.slice(0, 4);
    const L = [heading(t, "Timeline"), R(160, 520, 1600, 8, t.soft, { name: "Timeline line" })];
    steps.forEach((s, i) => {
      const x = 160 + i * (1600 / Math.max(1, steps.length - 1)) - (i === steps.length - 1 ? 60 : 0);
      L.push(C(x - 30, 486, 76, 76, i % 2 ? t.b : t.a, { name: "Milestone" }), T(["Week 1", "Month 1", "Month 3", "Month 6"][i], x - 90, 380, 260, { size: 30, bold: true, family: t.body, color: t.a, align: "center", name: "When" }),
        T(s, x - 130, 600, 340, { size: 30, family: t.body, color: t.ink, align: "center", lh: 1.3, name: "Milestone text" }));
    });
    L.push(...footer(t, c, 6));
    return slide(t, "content", L, "Walk through the timeline step by step.");
  }
  function statsSlide(t, c) {
    const v = c.chart?.series?.[0]?.values || [], last = v[v.length - 1], first = v[0];
    const stats = [[last != null ? String(last) + (c.chart?.unit || "") : "3×", c.chart?.title || "Growth"], [first && last ? `+${Math.round(((last - first) / Math.max(1, first)) * 100)}%` : "98%", "Change over the period"], [String(c.agenda.length), "Parts in this plan"]];
    const L = [heading(t, "By the numbers")];
    stats.forEach(([n, label], i) => {
      const x = 110 + i * 590;
      L.push(R(x, 300, 540, 520, t.soft, { radius: 28, name: "Stat card" }), T(n, x + 40, 380, 460, { size: 120, bold: true, family: t.head, color: i === 1 ? t.b : t.a, lh: 1, name: "Number" }), T(label, x + 40, 560, 460, { size: 32, family: t.body, color: t.muted, lh: 1.3, name: "Stat label" }));
    });
    L.push(...footer(t, c, 7));
    return slide(t, "content", L, "Pause on each number.");
  }
  function teamSlide(t, c) {
    const people = [["Alex Morgan", "Lead"], ["Sam Rivera", "Design"], ["Jordan Lee", "Delivery"]];
    const L = [heading(t, "The team")];
    people.forEach(([n, r], i) => {
      const x = 260 + i * 520;
      L.push(C(x - 10, 290, 320, 320, t.soft, { name: "Photo ring" }), F(x + 10, 310, 280, 280, { shape: "circle", name: "Team photo" }), T(n, x - 60, 650, 420, { size: 40, bold: true, family: t.head, color: t.ink, align: "center", name: "Name" }), T(r, x - 60, 710, 420, { size: 30, family: t.body, color: t.muted, align: "center", name: "Role" }));
    });
    L.push(...footer(t, c, 8));
    return slide(t, "content", L, "Introduce each person in one line.");
  }
  function quoteSlide(t, c) {
    const L = [T("“", 140, 140, 300, { size: 300, bold: true, family: "serif", color: t.a, lh: 1, name: "Quote mark" }),
      T(c.points[1]?.[1] || c.subtitle, 240, 380, 1440, { size: 66, italic: true, family: t.head, color: t.ink, lh: 1.25, name: "Quote" }),
      T("— " + c.by, 240, 720, 1200, { size: 32, bold: true, family: t.body, color: t.muted, name: "Quote author" })];
    return slide(t, "plain", L, "Let the quote land, then move on.");
  }
  function pagesFor(t, c, v = 0) {
    const s = [v ? titleVariant(t, c, v) : titleSlide(t, c), agendaSlide(t, c), sectionSlide(t, c), v ? contentVariant(t, c, v) : contentSlide(t, c)];
    if (c.chart) s.push(chartSlide(t, c));
    if (c.table) s.push(tableSlide(t, c));
    s.push(timelineSlide(t, c), statsSlide(t, c), teamSlide(t, c), quoteSlide(t, c), closingSlide(t, c));
    return s;
  }
  function deck(id, title, th, tags, c) {
    CONTENT[id.replace(/^deck-/, "")] = { title, tags, c, theme: th };
    tpl(id, title, "presentation-16x9", "presentation slides deck " + tags, () => pagesFor(TH[th], c, 0));
  }
  const notes = (...n) => n;

  deck("deck-startup-pitch", "Startup pitch deck", "night", "pitch startup investor funding business", {
    kicker: "Seed round 2026", title: "PayLite", subtitle: "Simple payments for small shops, right from a phone.", by: "Founders: Sara Khan and Ali Raza", short: "PayLite · Pitch deck",
    agenda: ["The problem", "Our solution", "Market and traction", "Business model", "The ask"],
    contentTitle: "Why shops choose us", points: [["Problem", "Small shops lose sales when customers have no cash."], ["Solution", "Take card and wallet payments with one phone app."], ["Traction", "1,200 shops in 6 months, 18% growth every month."]],
    chart: { kind: "line", title: "Monthly active shops", labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], series: [{ name: "Shops", values: [180, 260, 410, 620, 880, 1200] }], takeaways: ["Growth every month", "Low cost to win a shop", "Most shops stay after month 3"] },
    closing: "Join us", closingSub: "We are raising a seed round to reach 10,000 shops by next year.", contact: "hello@paylite.example",
    notes: notes("Open with the shopkeeper story.", "Walk through the five parts.", "Spend most time on traction.", "Point at the curve: steady growth.", "", "Ask for the meeting and share the data room."),
  });
  deck("deck-business-plan", "Business plan", "slate", "business plan strategy company finance", {
    kicker: "Business plan 2026", title: "Green Basket Grocers", subtitle: "Fresh local produce delivered within two hours.", by: "Prepared by the founding team", short: "Green Basket · Business plan",
    agenda: ["Company overview", "Market analysis", "Operations", "Financial plan", "Next steps"],
    contentTitle: "Our plan in three parts", points: [["Customers", "Busy families in city areas who want fresh food fast."], ["Operations", "Two dark stores and our own riders on e-bikes."], ["Growth", "Open one new area every quarter."]],
    table: { title: "Three-year forecast", rows: [["", "Year 1", "Year 2", "Year 3"], ["Revenue", "$420k", "$1.1M", "$2.4M"], ["Costs", "$510k", "$980k", "$1.8M"], ["Profit", "-$90k", "$120k", "$600k"], ["Customers", "3,000", "9,500", "21,000"]], note: "Break even in month 16." },
    closing: "Thank you", closingSub: "Questions and feedback are welcome.", contact: "plan@greenbasket.example",
    notes: notes("Introduce the team and the idea.", "", "Explain who we serve.", "", "Highlight the break-even point.", "Invite questions."),
  });
  deck("deck-marketing-plan", "Marketing plan", "coral", "marketing plan campaign social media growth", {
    kicker: "Q1 marketing plan", title: "Spring Campaign", subtitle: "Grow online orders by 40% with social media and email.", by: "Marketing team", short: "Spring Campaign · Marketing plan",
    agenda: ["Goals", "Audience", "Channels", "Budget", "Timeline"],
    contentTitle: "Channels we will use", points: [["Social media", "Short videos three times a week on two platforms."], ["Email", "A weekly offer email to 12,000 subscribers."], ["Partners", "Local creators share honest reviews."]],
    chart: { kind: "bar", unit: "%", title: "Budget split", labels: ["Social ads", "Email", "Creators", "Events"], series: [{ name: "Budget", values: [45, 15, 25, 15] }], takeaways: ["Most budget goes to social ads", "Email is cheap and works", "Review the split every month"] },
    closing: "Let's launch", closingSub: "Campaign starts on 1 March. Weekly check-ins every Monday.", contact: "marketing@yourbrand.example",
    notes: notes("State the main goal: +40% online orders.", "", "Show examples of each channel.", "Explain why social ads get the most.", "", "Agree on owners and dates."),
  });
  deck("deck-science-lesson", "Science lesson", "sun", "lesson education class school teacher science water cycle", {
    kicker: "Grade 6 · Science", title: "The Water Cycle", subtitle: "How water moves between the sky, land and sea.", by: "Ms. Ayesha · Room 12", short: "The Water Cycle · Lesson",
    agendaTitle: "Today we will learn", agenda: ["What is the water cycle?", "Evaporation", "Condensation", "Precipitation", "Quick quiz"],
    contentTitle: "Three main steps", points: [["Evaporation", "The sun heats water and it rises as vapour."], ["Condensation", "Vapour cools and forms clouds."], ["Precipitation", "Water falls back as rain, snow or hail."]],
    chart: { kind: "bar", unit: "%", title: "Where Earth's water is", labels: ["Oceans", "Ice", "Ground", "Lakes"], series: [{ name: "Percent", values: [96.5, 1.7, 1.7, 0.1] }], takeaways: ["Almost all water is in oceans", "Very little is fresh water", "Save water at home"] },
    closing: "Great work!", closingSub: "Homework: draw the water cycle and label each step.", contact: "Quiz on Friday",
    notes: notes("Ask: where does rain come from?", "", "Use the kettle example for evaporation.", "Let students guess before showing.", "", "Hand out the worksheet."),
  });
  deck("deck-company-profile", "Company profile", "ocean", "company profile corporate about us services clients", {
    kicker: "Company profile", title: "Bluewave Logistics", subtitle: "Moving goods safely across the country since 2012.", by: "www.bluewave.example", short: "Bluewave Logistics · Company profile",
    agendaTitle: "About us", agenda: ["Who we are", "What we do", "Our numbers", "Our clients", "Contact"],
    contentTitle: "What we do", points: [["Freight", "Full and part truck loads to 40 cities."], ["Warehousing", "Three secure warehouses with live stock tracking."], ["Last mile", "Same-day delivery in five major cities."]],
    table: { title: "Our numbers", rows: [["", "2024", "2025", "2026"], ["Trucks", "120", "165", "210"], ["Cities", "28", "34", "40"], ["On-time rate", "94%", "96%", "97%"], ["Clients", "310", "420", "560"]] },
    closing: "Work with us", closingSub: "Tell us what you need to move. We reply within one working day.", contact: "sales@bluewave.example",
    notes: notes("Short history of the company.", "", "Pick examples close to this client.", "", "Point out the on-time rate.", "Leave the brochure."),
  });
  deck("deck-project-status", "Project status report", "indigo", "project status report update progress timeline risks team", {
    kicker: "Weekly update · Week 14", title: "Website Redesign", subtitle: "Status, progress, risks and next steps.", by: "Project lead: Omar Siddiqui", short: "Website Redesign · Status",
    agenda: ["Summary", "Progress", "Milestones", "Risks", "Next steps"],
    contentTitle: "Where we are", points: [["Done", "New design system and home page are live on staging."], ["In progress", "Product pages and checkout, 60% complete."], ["Blocked", "Payment provider keys are still pending."]],
    table: { title: "Milestones", rows: [["Milestone", "Owner", "Due", "Status"], ["Design system", "Hina", "Mar 10", "Done"], ["Home page", "Bilal", "Mar 24", "Done"], ["Checkout", "Omar", "Apr 14", "On track"], ["Launch", "Team", "May 2", "At risk"]], note: "Launch is at risk until the payment keys arrive." },
    closing: "Next steps", closingSub: "Get payment keys this week, finish checkout, start user testing on April 20.", contact: "Next update: Monday",
    notes: notes("One-line summary first.", "", "Be clear about the blocker.", "", "Ask for help on the payment keys.", "Confirm owners."),
  });
  deck("deck-portfolio", "Design portfolio", "paper", "portfolio design work case study creative designer", {
    kicker: "Portfolio 2026", title: "Selected Work", subtitle: "Brand identity, packaging and web design.", by: "Zara Ahmed · Designer", short: "Zara Ahmed · Portfolio",
    agendaTitle: "Contents", agenda: ["About me", "Brand identity", "Packaging", "Web design", "Contact"],
    contentTitle: "How I work", points: [["Listen", "I start with your goals, customers and story."], ["Sketch", "Many quick ideas, then the best one grows."], ["Polish", "Every detail checked in print and on screen."]],
    table: { title: "Recent projects", rows: [["Client", "Work", "Year"], ["Saffron Tea", "Brand and packaging", "2026"], ["Nimbus App", "Website and icons", "2025"], ["City Books", "Logo and signage", "2025"], ["Bloom Bakery", "Menu and boxes", "2024"]] },
    closing: "Let's create", closingSub: "Available for new projects from June.", contact: "zara@studio.example",
    notes: notes("Keep it personal and short.", "", "Show the process, not only results.", "", "Pick one project to talk about in depth.", "Share the portfolio link."),
  });
  deck("deck-product-launch", "Product launch", "plum", "product launch new feature release marketing event", {
    kicker: "Launch event", title: "Meet Nova Watch", subtitle: "A smart watch with a 14-day battery and health tracking.", by: "Product team · 15 October", short: "Nova Watch · Launch",
    agenda: ["Why we built it", "Key features", "Price and plans", "Launch timeline", "Questions"],
    contentTitle: "Key features", points: [["14-day battery", "Charge twice a month, not every night."], ["Health", "Heart rate, sleep and steps in one simple view."], ["Durable", "Water resistant to 50 metres and scratch proof."]],
    chart: { kind: "bar", title: "Battery life in days", labels: ["Nova", "Model A", "Model B", "Model C"], series: [{ name: "Days", values: [14, 2, 5, 7] }], takeaways: ["Longest battery in its class", "Same price as rivals", "Ships in 3 colours"] },
    closing: "Available now", closingSub: "Pre-orders open today. Shipping starts 1 November.", contact: "nova.example/preorder",
    notes: notes("Build excitement, show the watch.", "", "Demo each feature live.", "Compare battery life.", "", "Share the pre-order link."),
  });
  deck("deck-thesis-defence", "Thesis defence", "mono", "thesis defence research university academic study", {
    kicker: "MSc thesis defence", title: "Solar Power for Rural Schools", subtitle: "A low-cost design for reliable classroom electricity.", by: "Hamza Ali · Department of Energy Engineering", short: "Thesis defence · Solar for rural schools",
    agendaTitle: "Outline", agenda: ["Research question", "Method", "Results", "Discussion", "Conclusion"],
    contentTitle: "Method", points: [["Survey", "Visited 24 schools to measure daily power needs."], ["Design", "Sized panels and batteries for 6 hours of use."], ["Field test", "Installed the system in 3 schools for 4 months."]],
    chart: { kind: "line", title: "Hours of power per day", labels: ["Month 1", "Month 2", "Month 3", "Month 4"], series: [{ name: "Grid only", values: [3.1, 2.8, 3.4, 2.9] }, { name: "With solar", values: [6.2, 6.5, 6.4, 6.8] }], takeaways: ["Power hours doubled", "Cost paid back in 3 years", "Teachers reported better lessons"] },
    closing: "Thank you", closingSub: "I welcome questions from the committee.", contact: "hamza.ali@university.example",
    notes: notes("Thank the committee.", "", "Explain why these three steps.", "Main result: power hours doubled.", "", "Pause for questions."),
  });
  deck("deck-quarterly-review", "Quarterly business review", "mint", "quarterly review sales report results kpi business", {
    kicker: "Q3 2026", title: "Quarterly Business Review", subtitle: "Results, highlights and plans for next quarter.", by: "Sales and Operations", short: "Q3 review",
    agenda: ["Highlights", "Sales results", "Customer feedback", "Challenges", "Q4 plan"],
    contentTitle: "Highlights", points: [["Revenue up", "Revenue grew 22% over last quarter."], ["New clients", "38 new business clients signed."], ["Happy customers", "Satisfaction score rose to 4.7 out of 5."]],
    chart: { kind: "bar", title: "Revenue by month (thousands)", labels: ["Jul", "Aug", "Sep"], series: [{ name: "2025", values: [82, 88, 91] }, { name: "2026", values: [98, 107, 118] }], takeaways: ["Every month beat last year", "September was the best month", "Online sales led the growth"] },
    closing: "Q4 focus", closingSub: "Keep growth above 15%, launch the loyalty plan and hire two sales staff.", contact: "Next review: January",
    notes: notes("Start with the big number: +22%.", "", "Thank the team for the new clients.", "Compare with last year.", "", "Agree on Q4 targets."),
  });
  deck("deck-workshop", "Workshop training", "forest", "workshop training session team learning skills", {
    kicker: "Half-day workshop", title: "Time Management That Works", subtitle: "Simple habits to plan your week and beat busy days.", by: "Facilitator: Nadia Hussain", short: "Time management workshop",
    agendaTitle: "Plan for today", agenda: ["Warm-up activity", "The priority grid", "Plan your week", "Group exercise", "Wrap-up"],
    contentTitle: "Three habits", points: [["Plan", "Spend 15 minutes every Monday planning the week."], ["Focus", "Work in 45-minute blocks with no phone."], ["Review", "On Friday, check what worked and what didn't."]],
    table: { title: "Group exercise", rows: [["Task", "Urgent?", "Important?", "Do it"], ["Client email", "Yes", "Yes", "Now"], ["Team lunch plan", "No", "No", "Later"], ["Monthly report", "No", "Yes", "Schedule"], ["Phone call", "Yes", "No", "Delegate"]], note: "Sort your own five tasks the same way." },
    closing: "Your turn", closingSub: "Pick one habit and try it every day this week.", contact: "Feedback form: 2 minutes",
    notes: notes("Welcome everyone, quick intros.", "", "Ask people to share their worst habit.", "", "Give groups 10 minutes.", "Collect feedback."),
  });
  deck("deck-brand-guidelines", "Brand guidelines", "rose", "brand guidelines style guide logo colours fonts identity", {
    kicker: "Brand book", title: "Bloom Brand Guidelines", subtitle: "How to use our logo, colours, fonts and voice.", by: "Brand team · Version 2.0", short: "Bloom · Brand guidelines",
    agendaTitle: "Inside", agenda: ["Our story", "Logo use", "Colours", "Typography", "Voice and tone"],
    contentTitle: "Logo rules", points: [["Clear space", "Keep space around the logo equal to the height of the B."], ["Minimum size", "Never smaller than 24 px on screen or 10 mm in print."], ["Don'ts", "Do not stretch, rotate or recolour the logo."]],
    table: { title: "Brand colours", rows: [["Name", "HEX", "Use"], ["Bloom Red", "#E11D48", "Main brand colour"], ["Violet", "#7C3AED", "Accents and links"], ["Blush", "#FFE4E6", "Backgrounds"], ["Ink", "#3F0D1A", "Text"]] },
    closing: "Questions?", closingSub: "Download the logo pack and fonts from the brand portal.", contact: "brand@bloom.example",
    notes: notes("Why consistent branding matters.", "", "Show good and bad examples.", "", "Explain where each colour is used.", "Share the brand portal link."),
  });
  // Generator hook for gallery.js: any content × theme × layout variant.
  return {
    contents: Object.keys(CONTENT), themes: Object.keys(TH), variants: 6, styleOf: (key) => TH[key]?.style,
    content: (key) => CONTENT[key] || null,
    themeName: (key) => ({ indigo: "Indigo", night: "Midnight", coral: "Coral", ocean: "Ocean", paper: "Paper", mint: "Mint", plum: "Plum", sun: "Sunny", forest: "Forest", slate: "Slate", rose: "Rose", mono: "Monochrome", sand: "Sand", lagoon: "Lagoon" })[key] || key,
    pages: (contentKey, themeKey, v) => { const x = CONTENT[contentKey], t = TH[themeKey]; return x && t ? pagesFor(t, x.c, v) : null; },
  };
}
