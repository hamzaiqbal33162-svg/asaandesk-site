// AsaanDesk Sheets template gallery (pure module, no DOM): used by the editor's Templates panel and the intro page.
// Every template is our own: names, numbers, colours and the little sheet pictures drawn below. Hand-made templates
// plus generated ones ("<layout>~p<NN>~<theme>", see tpl-data.js and layouts.js) up to Canva's count (TOTAL).
// Open one with /design/sheets/?template=<id>; ?new=1 starts a blank sheet.

import { COUNT, LAYOUT_META, MULTI_PAGE_LAYOUTS, generatedIds, parseId, templateName } from "./tpl-data.js";
import { STARTERS } from "./starters.js";

const S = "More templates for you";
const CLASSIC = [
  { id: "budget-tracker", name: "Budget tracker", tool: "sheets", section: S, tags: ["budget", "finance", "monthly", "chart"] },
  { id: "price-list", name: "Price list", tool: "sheets", section: S, tags: ["price", "shop", "products", "margin"] },
  { id: "monthly-budget", name: "Monthly budget", tool: "sheets", section: S, tags: ["budget", "home", "expenses", "pie"] },
  { id: "balance-sheet", name: "Balance sheet", tool: "sheets", section: S, tags: ["accounts", "assets", "liabilities", "finance"] },
  { id: "kpi-dashboard", name: "Financial KPI dashboard", tool: "sheets", section: S, tags: ["kpi", "dashboard", "revenue", "profit", "chart"] },
  { id: "price-calculator", name: "Price calculator", tool: "sheets", section: S, tags: ["price", "cost", "markup", "tax"] },
  { id: "income-statement", name: "Income statement", tool: "sheets", section: S, tags: ["profit", "loss", "accounts", "finance"] },
  { id: "blank-table-rose", name: "Titled table (rose)", tool: "sheets", section: S, tags: ["blank", "table", "simple"] },
  { id: "marketing-budget", name: "Marketing budget tracker", tool: "sheets", section: S, tags: ["marketing", "campaign", "budget", "chart"] },
  { id: "blank-table-sky", name: "Titled table (sky)", tool: "sheets", section: S, tags: ["blank", "table", "simple"] },
  { id: "inventory-tracker", name: "Inventory tracker", tool: "sheets", section: S, tags: ["inventory", "stock", "shop", "chart"] },
  { id: "sales-tracker", name: "Sales tracker", tool: "sheets", section: S, tags: ["sales", "revenue", "products", "chart"] },
  { id: "invoice-list", name: "Invoice list", tool: "sheets", section: S, tags: ["invoices", "billing", "clients"] },
  { id: "attendance", name: "Attendance sheet", tool: "sheets", section: S, tags: ["school", "class", "attendance"] },
  { id: "grade-sheet", name: "Grade sheet", tool: "sheets", section: S, tags: ["school", "marks", "grades"] },
];
// Hand-made templates first, then generated ones (base layout × palette × content theme) up to Canva's count,
// then 24 starters each for Magic Insights (tool "magic-insights") and Magic Formulas (tool "magic-formulas").
// Order: one template of every base layout first (so the first cards are all different designs), then the
// hand-made ones, then the rest of the generated list.
const GEN = generatedIds(COUNT - CLASSIC.length).map((id) => {
  const p = parseId(id);
  return { id, name: templateName(p), tool: "sheets", section: S, tags: [...p.layout.tags, p.theme.label.toLowerCase(), p.palette.name.toLowerCase()], layout: p.layout.id, layoutName: p.layout.name, theme: p.theme.id, themeName: p.theme.label, palette: p.palette.name, pages: MULTI_PAGE_LAYOUTS.has(p.layout.id) ? 2 : 1 };
});
// The two-page templates ("1 of 2") come early (cards 6, 12 and 18) so they show among the first cards.
const ROUND0 = GEN.slice(0, LAYOUT_META.length).filter((t) => !MULTI_PAGE_LAYOUTS.has(t.layout));
GEN.slice(0, LAYOUT_META.length).filter((t) => MULTI_PAGE_LAYOUTS.has(t.layout)).forEach((t, i) => ROUND0.splice(5 + i * 6, 0, t));
export const TEMPLATES = [...ROUND0, ...CLASSIC, ...GEN.slice(LAYOUT_META.length), ...STARTERS.map(({ look, ...t }) => t)];
/** Templates per tool slug: sheets 362 (Canva's count), magic-insights 24, magic-formulas 24. */
export const TOTALS = TEMPLATES.reduce((a, t) => ((a[t.tool] = (a[t.tool] || 0) + 1), a), {});
export const TOTAL = TOTALS.sheets; // the Sheets tool; the two Magic tools are counted in TOTALS
export const LAYOUTS = LAYOUT_META.length;

// Look of each picture: band colour, header tint, ink, number of columns, chart kind and place, KPI tiles.
const LOOK = {
  "inventory-tracker": { band: "#f59e0b", band2: "#fbbf24", head: "#fde68a", ink: "#78350f", zebra: "#fffbeb", cols: 7, chart: "bar", kpis: 3 },
  "budget-tracker": { band: "#4f46e5", band2: "#7c3aed", head: "#c7d2fe", ink: "#312e81", zebra: "#f5f7ff", cols: 7, chart: "bar2" },
  "price-list": { band: "#ea580c", band2: "#fb923c", head: "#fed7aa", ink: "#7c2d12", zebra: "#fff7ed", cols: 7, chart: null },
  "monthly-budget": { band: "#e11d48", band2: "#fb7185", head: "#fecdd3", ink: "#881337", zebra: "#fff1f2", cols: 6, chart: "pie", kpis: 3 },
  "balance-sheet": { band: "#c026d3", band2: "#e879f9", head: "#f5d0fe", ink: "#701a75", zebra: "#fdf4ff", cols: 6, chart: "bar2", kpis: 3 },
  "kpi-dashboard": { band: "#1e3a8a", band2: "#2563eb", head: "#bfdbfe", ink: "#1e3a8a", zebra: "#f1f5ff", cols: 6, chart: "line", kpis: 4 },
  "price-calculator": { band: "#7c3aed", band2: "#c026d3", head: "#ddd6fe", ink: "#4c1d95", zebra: "#faf5ff", cols: 8, chart: "bar2" },
  "income-statement": { band: "#0f766e", band2: "#14b8a6", head: "#99f6e4", ink: "#134e4a", zebra: "#f0fdfa", cols: 6, chart: "bar2" },
  "blank-table-rose": { band: "#db2777", band2: "#f472b6", head: "#fbcfe8", ink: "#831843", zebra: "#fff5fa", cols: 8, chart: null, blank: true, label: "Title" },
  "blank-table-sky": { band: "#0284c7", band2: "#38bdf8", head: "#bae6fd", ink: "#0c4a6e", zebra: "#f3faff", cols: 8, chart: null, blank: true, label: "Title" },
  "marketing-budget": { band: "#16a34a", band2: "#4ade80", head: "#bbf7d0", ink: "#14532d", zebra: "#f0fdf4", cols: 7, chart: "bar2" },
  "sales-tracker": { band: "#5b4cf0", band2: "#8b5cf6", head: "#ddd6fe", ink: "#2a2373", zebra: "#f7f6ff", cols: 6, chart: "bar" },
  "invoice-list": { band: "#ff7a59", band2: "#fb923c", head: "#fed7aa", ink: "#7c2d12", zebra: "#fff7ed", cols: 7, chart: null },
  "attendance": { band: "#14b8a6", band2: "#2dd4bf", head: "#99f6e4", ink: "#134e4a", zebra: "#f0fdfa", cols: 10, chart: null },
  "grade-sheet": { band: "#2f80ff", band2: "#60a5fa", head: "#bfdbfe", ink: "#1e3a8a", zebra: "#eff6ff", cols: 8, chart: "bar" },
};

const escXml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/** Small repeatable random numbers so each picture always looks the same. */
function rng(seed) { let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }

// Pictures for layouts that are not a plain table (drawn under the 34px title band of a 320 x 200 picture).
const bar = (x, y, w, h, fill, rx = 1.5) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const SHAPES = {
  dashboard(L, rnd) {
    let s = "";
    for (let i = 0; i < 4; i++) s += bar(10 + i * 76, 42, 70, 30, L.head, 5) + bar(16 + i * 76, 48, 36, 3, L.ink) + bar(16 + i * 76, 57, 30 + rnd() * 20, 7, L.band, 2);
    s += bar(10, 80, 148, 70, "#ffffff", 6).replace("/>", ` stroke="#e2e8f0"/>`);
    for (let i = 0; i < 7; i++) { const h = 12 + rnd() * 44; s += bar(20 + i * 19, 142 - h, 12, h, i % 2 ? L.band2 : L.band); }
    s += bar(166, 80, 144, 70, "#ffffff", 6).replace("/>", ` stroke="#e2e8f0"/>`) + `<circle cx="238" cy="115" r="25" fill="none" stroke="${L.band}" stroke-width="12" stroke-dasharray="60 100"/><circle cx="238" cy="115" r="25" fill="none" stroke="${L.band2}" stroke-width="12" stroke-dasharray="40 120" stroke-dashoffset="-60"/><circle cx="238" cy="115" r="25" fill="none" stroke="${L.head}" stroke-width="12" stroke-dasharray="57 103" stroke-dashoffset="-100"/>`;
    for (let r = 0; r < 4; r++) s += bar(10, 158 + r * 10, 300, 9, r ? (r % 2 ? L.zebra : "#fff") : L.head, 0) + bar(14, 161 + r * 10, 60, 3, r ? "#64748b" : L.ink) + bar(250 - rnd() * 30, 161 + r * 10, 50, 3, "#94a3b8");
    return s;
  },
  calendar(L, rnd) {
    let s = bar(10, 40, 120, 8, L.ink, 3);
    for (let d = 0; d < 7; d++) s += bar(10 + d * 43.5, 54, 41, 10, L.head, 2);
    for (let w = 0; w < 5; w++) for (let d = 0; d < 7; d++) {
      const x = 10 + d * 43.5, y = 67 + w * 26.5;
      s += bar(x, y, 41, 24, d > 4 ? L.zebra : "#fff", 2).replace("/>", ` stroke="#e5e7eb" stroke-width=".6"/>`) + `<text x="${x + 37}" y="${y + 8}" font-size="6.5" text-anchor="end" font-family="system-ui,sans-serif" fill="#64748b">${w * 7 + d + 1 <= 31 ? w * 7 + d + 1 : ""}</text>`;
      if (rnd() < 0.22) s += bar(x + 3, y + 12, 33, 7, L.band, 2);
    }
    return s;
  },
  gantt(L, rnd) {
    let s = bar(10, 42, 300, 10, L.head, 0);
    for (let k = 0; k < 10; k++) s += `<line x1="${100 + k * 21}" x2="${100 + k * 21}" y1="42" y2="194" stroke="#e5e7eb" stroke-width=".6"/>`;
    for (let i = 0; i < 9; i++) { const y = 58 + i * 15, st = 100 + Math.min(150, i * 17 + rnd() * 12), w = 30 + rnd() * 60; s += bar(14, y + 4, 58 + rnd() * 20, 3, "#64748b") + bar(st, y + 1, Math.min(w, 308 - st), 9, i % 2 ? L.band2 : L.band, 4); }
    return s;
  },
  doc(L, rnd) {
    let s = bar(14, 44, 90, 4, L.ink) + bar(14, 52, 60, 3, "#94a3b8") + bar(14, 59, 70, 3, "#94a3b8") + bar(220, 44, 86, 4, "#64748b") + bar(220, 52, 60, 3, "#94a3b8");
    s += bar(10, 72, 300, 11, L.head, 0);
    for (let r = 0; r < 6; r++) s += bar(10, 83 + r * 11, 300, 11, r % 2 ? L.zebra : "#fff", 0) + bar(14, 87 + r * 11, 90 + rnd() * 40, 3, "#64748b") + bar(270, 87 + r * 11, 34, 3, "#94a3b8");
    s += bar(190, 154, 120, 4, "#94a3b8") + bar(190, 162, 120, 4, "#94a3b8") + bar(10, 172, 300, 18, L.band, 3) + bar(16, 179, 70, 4, "#ffffff") + bar(256, 179, 48, 4, "#ffffff");
    return s;
  },
  planner(L, rnd) {
    let s = bar(10, 42, 196, 10, L.head, 0);
    for (let r = 0; r < 7; r++) { s += bar(10, 54 + r * 19, 40, 17, L.zebra, 2) + bar(14, 61 + r * 19, 28, 3, L.ink); for (let c = 0; c < 3; c++) s += bar(54 + c * 51, 54 + r * 19, 48, 17, rnd() < 0.7 ? L.head : "#f8fafc", 3) + bar(58 + c * 51, 61 + r * 19, 24 + rnd() * 16, 3, "#475569"); }
    s += bar(214, 42, 96, 10, L.band, 0);
    for (let r = 0; r < 9; r++) s += bar(214, 54 + r * 13, 96, 12, r % 2 ? L.zebra : "#fff", 0) + bar(218, 58 + r * 13, 46, 3, "#64748b") + bar(286, 58 + r * 13, 20, 3, "#94a3b8");
    return s;
  },
  pills(L, rnd) {
    const P = [["#dcfce7", "#16a34a"], ["#e0f2fe", "#0284c7"], ["#fef3c7", "#d97706"], ["#f1f5f9", "#64748b"]];
    let s = bar(10, 42, 210, 11, L.head, 0);
    for (let r = 0; r < 12; r++) { const p = P[Math.min(3, Math.floor(r / 3.2))]; s += bar(10, 53 + r * 11.5, 210, 11, r % 2 ? L.zebra : "#fff", 0) + bar(14, 57 + r * 11.5, 22, 3, "#94a3b8") + bar(42, 57 + r * 11.5, 60 + rnd() * 30, 3, "#64748b") + bar(150, 55 + r * 11.5, 40, 7, p[0], 3.5) + bar(156, 57.5 + r * 11.5, 28, 2, p[1]); }
    s += bar(228, 42, 82, 60, "#fff", 5).replace("/>", ` stroke="#e2e8f0"/>`);
    for (let i = 0; i < 5; i++) { const h = 10 + rnd() * 36; s += bar(236 + i * 14, 96 - h, 9, h, i % 2 ? L.band2 : L.band); }
    return s;
  },
  kanban(L, rnd) {
    let s = "";
    const per = [3, 2, 2, 3], fills = ["#ffffff", L.head, "#ffffff", "#dcfce7"];
    for (let c = 0; c < 4; c++) {
      const x = 10 + c * 76;
      s += bar(x, 42, 70, 152, "#f1f5f9", 6) + bar(x + 6, 48, 40, 5, L.ink, 2);
      for (let i = 0; i < per[c]; i++) s += bar(x + 5, 60 + i * 36, 60, 31, fills[c], 4).replace("/>", ` stroke="${L.head}"/>`) + bar(x + 10, 67 + i * 36, 40 + rnd() * 10, 3, "#475569") + bar(x + 10, 75 + i * 36, 26, 3, "#94a3b8") + `<circle cx="${x + 56}" cy="${83 + i * 36}" r="3.5" fill="${L.band}"/>`;
    }
    return s;
  },
  split(L, rnd) {
    let s = bar(10, 42, 150, 11, L.head, 0);
    for (let r = 0; r < 9; r++) s += bar(10, 53 + r * 13, 150, 13, r % 2 ? L.zebra : "#fff", 0) + bar(14, 58 + r * 13, 30, 3, L.ink) + bar(70, 56 + r * 13, 22, 7, "#eff6ff", 2) + bar(122, 58 + r * 13, 34, 3, "#94a3b8");
    s += bar(172, 50, 138, 100, "#fff", 6).replace("/>", ` stroke="${L.head}"/>`);
    for (let r = 0; r < 6; r++) s += bar(180, 60 + r * 14, 70, 3, "#64748b") + bar(262, 57 + r * 14, 40, 9, r > 1 ? L.head : "#eff6ff", 2);
    s += bar(172, 158, 138, 22, L.band, 4) + bar(180, 167, 60, 4, "#ffffff");
    return s;
  },
  roster(L, rnd) {
    const C = [["#fef3c7", "#d97706"], ["#e0f2fe", "#0284c7"], [L.ink, "#ffffff"], ["#f1f5f9", "#94a3b8"]];
    let s = bar(10, 42, 300, 11, L.head, 0);
    for (let r = 0; r < 9; r++) { s += bar(14, 59 + r * 15, 50, 3, "#64748b"); for (let d = 0; d < 8; d++) { const c = C[(r + d) % 7 > 4 ? 3 : (r + d) % 3]; s += bar(78 + d * 29, 55 + r * 15, 26, 12, c[0], 3) + bar(86 + d * 29, 60 + r * 15, 10, 2, c[1]); } }
    return s;
  },
  thermo(L, rnd) {
    let s = bar(10, 44, 70, 4, "#64748b") + bar(10, 54, 110, 9, L.ink, 3) + bar(10, 70, 300, 16, L.zebra, 8) + bar(10, 70, 140 + rnd() * 110, 16, L.band, 8);
    s += bar(10, 96, 196, 11, L.head, 0);
    for (let r = 0; r < 8; r++) s += bar(10, 107 + r * 11, 196, 11, r % 2 ? L.zebra : "#fff", 0) + bar(14, 111 + r * 11, 70 + rnd() * 30, 3, "#64748b") + bar(170, 111 + r * 11, 30, 3, "#94a3b8");
    s += `<circle cx="258" cy="140" r="34" fill="${L.head}"/><path d="M258 140V106A34 34 0 0 1 290 151Z" fill="${L.band}"/><path d="M258 140L290 151A34 34 0 0 1 236 166Z" fill="${L.band2}"/>`;
    return s;
  },
  quad(L, rnd) {
    const Q = [["#16a34a", "#dcfce7"], ["#dc2626", "#fee2e2"], ["#0284c7", "#e0f2fe"], ["#d97706", "#fef3c7"]];
    let s = "";
    Q.forEach(([fg, bg], i) => {
      const x = 10 + (i % 2) * 152, y = 42 + Math.floor(i / 2) * 78;
      s += bar(x, y, 146, 72, bg, 6) + bar(x, y, 146, 16, fg, 6) + bar(x, y + 10, 146, 6, fg, 0) + bar(x + 8, y + 5, 50, 5, "#ffffff", 2);
      for (let j = 0; j < 3; j++) s += `<circle cx="${x + 12}" cy="${y + 29 + j * 13}" r="2" fill="${fg}"/>` + bar(x + 18, y + 27 + j * 13, 50 + rnd() * 60, 3.5, fg);
    });
    return s;
  },
  heat(L, rnd) {
    const C = ["#dcfce7", "#bbf7d0", "#fef3c7", "#fde68a", "#fee2e2", "#fecaca"];
    let s = bar(10, 42, 300, 11, L.head, 0);
    for (let r = 0; r < 9; r++) { s += bar(14, 60 + r * 15, 54, 3, "#64748b"); for (let d = 0; d < 7; d++) s += bar(80 + d * 32, 55 + r * 15, 29, 13, C[Math.floor(rnd() * C.length)], 2); }
    return s;
  },
  checklist(L, rnd) {
    let s = bar(10, 42, 120, 6, L.ink, 3) + bar(140, 42, 170, 8, L.zebra, 4) + bar(140, 42, 60 + rnd() * 80, 8, L.band, 4);
    const P = ["#fee2e2", "#fef3c7", "#e0f2fe"];
    for (let r = 0; r < 10; r++) {
      const y = 58 + r * 14, done = r < 4;
      s += bar(12, y, 10, 10, "#fff", 2).replace("/>", ` stroke="#94a3b8"/>`) + (done ? `<path d="M14 ${y + 5}l3 3 5-6" stroke="#16a34a" stroke-width="1.6" fill="none"/>` : "") + bar(30, y + 3.5, 110 + rnd() * 60, 3, done ? "#cbd5e1" : "#475569") + bar(232, y + 1, 34, 8, P[r % 3], 4) + bar(274, y + 3.5, 32, 3, "#94a3b8");
    }
    return s;
  },
};

/** Self-contained SVG picture of a template: title band, KPI tiles, table rows and a small chart. */
export function thumb(id) {
  let L = LOOK[id], name = CLASSIC.find((x) => x.id === id)?.name, sub = "", pages = 1;
  const st = !L && STARTERS.find((x) => x.id === id);
  if (st) { const P = st.look.p; L = { band: P.band, band2: P.band2, head: P.head, ink: P.ink, zebra: P.zebra, cols: st.look.cols, chart: st.look.chart, kpis: st.look.kpis, label: st.name }; name = st.name; sub = st.tool === "magic-formulas" ? "f(x)" : "Data"; }
  if (!L) {
    const p = parseId(id);
    if (!p) return "";
    const P = p.palette, M = p.layout;
    L = { band: P.band, band2: P.band2, head: P.head, ink: P.ink, zebra: P.zebra, cols: M.cols, chart: M.chart, kpis: M.kpis, blank: M.blank, shape: M.shape, label: M.blank ? "Title" : M.name };
    name = templateName(p); sub = M.blank ? "" : p.theme.label; pages = MULTI_PAGE_LAYOUTS.has(M.id) ? 2 : 1;
  }
  const t = { name };
  const rnd = rng(id), W = 320, H = 200, out = [];
  const g = "g" + id.replace(/[^a-z0-9]/gi, "");
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escXml(t.name)}">`);
  out.push(`<defs><linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="${L.band}"/><stop offset="1" stop-color="${L.band2}"/></linearGradient></defs>`);
  out.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  out.push(`<rect width="${W}" height="34" fill="url(#${g})"/>`);
  out.push(`<circle cx="${W - 26}" cy="17" r="22" fill="#ffffff" opacity=".14"/><circle cx="${W - 58}" cy="6" r="12" fill="#ffffff" opacity=".12"/>`);
  out.push(`<text x="12" y="23" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="15" font-weight="700" fill="#ffffff">${escXml(L.label || t.name)}</text>`);
  if (sub) out.push(`<text x="${W - 10}" y="22" text-anchor="end" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="10" font-weight="600" fill="#ffffff" opacity=".92">${escXml(sub)}</text>`);
  const pageChip = pages > 1 ? `<rect x="${W - 52}" y="${H - 24}" width="44" height="17" rx="8.5" fill="#1b2133" opacity=".78"/><text x="${W - 30}" y="${H - 12}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#fff">1 of ${pages}</text>` : "";
  if (L.shape && SHAPES[L.shape]) { out.push(SHAPES[L.shape](L, rnd), pageChip, "</svg>"); return out.join(""); }
  let y = 42;
  const chartW = L.chart ? 104 : 0, tableW = W - 20 - (chartW ? chartW + 8 : 0);
  if (L.kpis) {
    const n = L.kpis, gap = 6, w = (tableW - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const x = 10 + i * (w + gap);
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="22" rx="4" fill="${L.zebra}" stroke="${L.head}"/>`);
      out.push(`<rect x="${x + 5}" y="${y + 5}" width="${w * 0.5}" height="3" rx="1.5" fill="#94a3b8"/>`);
      out.push(`<rect x="${x + 5}" y="${y + 12}" width="${w * (0.4 + rnd() * 0.3)}" height="5" rx="2" fill="${L.ink}"/>`);
    }
    y += 30;
  }
  // table
  const cols = L.cols, cw = tableW / cols, rows = Math.floor((H - y - 8) / 10) - 1;
  out.push(`<rect x="10" y="${y}" width="${tableW}" height="12" fill="${L.head}"/>`);
  for (let c = 0; c < cols; c++) out.push(`<rect x="${10 + c * cw + 3}" y="${y + 4.5}" width="${cw * (0.45 + rnd() * 0.3)}" height="3" rx="1.5" fill="${L.ink}"/>`);
  y += 12;
  for (let r = 0; r < rows; r++) {
    const ry = y + r * 10;
    if (r % 2) out.push(`<rect x="10" y="${ry}" width="${tableW}" height="10" fill="${L.zebra}"/>`);
    out.push(`<line x1="10" x2="${10 + tableW}" y1="${ry + 10}" y2="${ry + 10}" stroke="#e5e7eb" stroke-width=".6"/>`);
    if (L.blank) continue;
    for (let c = 0; c < cols; c++) {
      const w = cw * (c === 0 ? 0.55 + rnd() * 0.3 : 0.3 + rnd() * 0.35), x = c === 0 ? 10 + 3 : 10 + (c + 1) * cw - 3 - w;
      out.push(`<rect x="${x}" y="${ry + 3.5}" width="${w}" height="3" rx="1.5" fill="${c === 0 ? "#64748b" : "#94a3b8"}"/>`);
    }
  }
  for (let c = 1; c < cols; c++) out.push(`<line x1="${10 + c * cw}" x2="${10 + c * cw}" y1="${y - 12}" y2="${y + rows * 10}" stroke="#e5e7eb" stroke-width=".6"/>`);
  out.push(`<rect x="10" y="${y - 12}" width="${tableW}" height="${rows * 10 + 12}" fill="none" stroke="${L.blank ? L.head : "#e2e8f0"}"/>`);
  // chart
  if (L.chart) {
    const x0 = W - 10 - chartW, y0 = 42, ch = 96;
    out.push(`<rect x="${x0}" y="${y0}" width="${chartW}" height="${ch}" rx="6" fill="#ffffff" stroke="#e2e8f0"/>`);
    out.push(`<rect x="${x0 + 8}" y="${y0 + 7}" width="50" height="3" rx="1.5" fill="${L.ink}"/>`);
    const bx = x0 + 10, by = y0 + ch - 10, bw = chartW - 20, bh = ch - 30;
    out.push(`<line x1="${bx}" x2="${bx + bw}" y1="${by}" y2="${by}" stroke="#cbd5e1"/>`);
    if (L.chart === "pie") {
      const cx = x0 + chartW / 2, cy = y0 + ch / 2 + 6, rr = 32;
      let a = -Math.PI / 2;
      const parts = [0.34, 0.22, 0.18, 0.14, 0.12], colors = [L.band, L.band2, L.head, "#fbbf24", "#94a3b8"];
      parts.forEach((p, i) => {
        const b = a + p * Math.PI * 2, large = p > 0.5 ? 1 : 0;
        out.push(`<path d="M${cx} ${cy}L${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}A${rr} ${rr} 0 ${large} 1 ${(cx + rr * Math.cos(b)).toFixed(1)} ${(cy + rr * Math.sin(b)).toFixed(1)}Z" fill="${colors[i]}" stroke="#fff" stroke-width="1"/>`);
        a = b;
      });
    } else if (L.chart === "line") {
      for (const [k, col] of [[0, L.band2], [1, "#f59e0b"]]) {
        const pts = Array.from({ length: 8 }, (_, i) => `${(bx + (i * bw) / 7).toFixed(1)},${(by - bh * (0.25 + 0.1 * k * -1 + i * 0.07 + rnd() * 0.18)).toFixed(1)}`);
        out.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`);
      }
    } else {
      const n = 6, two = L.chart === "bar2", slot = bw / n;
      for (let i = 0; i < n; i++) {
        const h1 = bh * (0.3 + rnd() * 0.65);
        if (two) {
          const h2 = bh * (0.3 + rnd() * 0.65);
          out.push(`<rect x="${(bx + i * slot + 2).toFixed(1)}" y="${(by - h1).toFixed(1)}" width="${(slot / 2 - 2).toFixed(1)}" height="${h1.toFixed(1)}" fill="${L.band}"/>`);
          out.push(`<rect x="${(bx + i * slot + slot / 2).toFixed(1)}" y="${(by - h2).toFixed(1)}" width="${(slot / 2 - 2).toFixed(1)}" height="${h2.toFixed(1)}" fill="${L.band2}" opacity=".6"/>`);
        } else out.push(`<rect x="${(bx + i * slot + 3).toFixed(1)}" y="${(by - h1).toFixed(1)}" width="${(slot - 6).toFixed(1)}" height="${h1.toFixed(1)}" rx="1.5" fill="${i % 2 ? L.band2 : L.band}"/>`);
      }
    }
  }
  out.push(pageChip, "</svg>");
  return out.join("");
}
