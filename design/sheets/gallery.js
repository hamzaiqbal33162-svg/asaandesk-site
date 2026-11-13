// AsaanDesk Sheets template gallery (pure module, no DOM): used by the editor's Templates panel and the intro page.
// Every template is our own: names, numbers, colours and pictures (drawn from the built sheet by sheet-svg.js). Hand-made templates
// plus generated ones ("<layout>~p<NN>~<theme>", see tpl-data.js and layouts.js) up to Canva's count (TOTAL).
// Open one with /design/sheets/?template=<id>; ?new=1 starts a blank sheet.

import { COUNT, LAYOUT_META, MULTI_PAGE_LAYOUTS, generatedIds, parseId, templateName } from "./tpl-data.js";
import { STARTERS, formulaCard } from "./starters.js";
import { buildTemplate } from "./templates.js";
import { sheetSvg } from "./sheet-svg.js";
import { photoThumb } from "./sheet-kit.js";

const S = "More templates for you";
const CLASSIC = [
  { id: "budget-tracker", name: "Budget tracker", tool: "sheets", section: S, tags: ["budget", "finance", "monthly", "chart"] },
  { id: "price-list", name: "Price list", tool: "sheets", section: S, tags: ["price", "shop", "products", "margin"] },
  { id: "monthly-budget", name: "Monthly budget", tool: "sheets", section: S, tags: ["budget", "home", "expenses", "pie"] },
  { id: "balance-sheet", name: "Balance sheet", tool: "sheets", section: S, tags: ["accounts", "assets", "liabilities", "finance"] },
  { id: "kpi-dashboard", name: "Financial KPI dashboard", tool: "sheets", section: S, tags: ["kpi", "dashboard", "revenue", "profit", "chart"] },
  { id: "price-calculator", name: "Price calculator", tool: "sheets", section: S, tags: ["price", "cost", "markup", "tax"] },
  { id: "income-statement", name: "Income statement", tool: "sheets", section: S, tags: ["profit", "loss", "accounts", "finance"] },
  { id: "blank-table-rose", name: "Simple list (rose)", tool: "sheets", section: S, tags: ["blank", "table", "simple", "list"] },
  { id: "marketing-budget", name: "Marketing budget tracker", tool: "sheets", section: S, tags: ["marketing", "campaign", "budget", "chart"] },
  { id: "blank-table-sky", name: "Simple list (sky)", tool: "sheets", section: S, tags: ["blank", "table", "simple", "list"] },
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

// Pictures: drawn from the real built template (sheet-svg.js works out the formulas and draws the title banner, KPI
// cards, table and chart), so every card shows the finished sheet with its own labels and numbers. Built on demand
// and a few hundred are kept.
const cache = new Map();
const uidOf = (id) => { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return "sh" + (h >>> 0).toString(36); };
const thumbHref = (src) => photoThumb(src);
/** SVG picture of page i (0 = first sheet) of a template. */
export function thumbPage(id, i = 0) {
  const key = id + "|" + i;
  if (cache.has(key)) return cache.get(key);
  let svg = "";
  try {
    const book = buildTemplate(id);
    const k = Math.min(Math.max(0, i | 0), book.sheets.length - 1);
    const card = k === 0 && String(id).startsWith("fx-") ? formulaCard(id, book) : null; // Magic Formulas: formula card at the right
    const view = card ? Math.max(640, Math.min(820, Array.from({ length: card.tableCols }, (_, c) => +(book.sheets[0].colW?.[c]) || 110).reduce((a, b) => a + b, 0) / 0.56)) : book.sheets[k].view || 760;
    svg = sheetSvg(book, { index: k, uid: uidOf(key), label: templateMeta(id)?.name || book.name, photo: thumbHref, view, card });
  } catch { svg = ""; }
  cache.set(key, svg);
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return svg;
}
/** Self-contained SVG picture of a template (its first sheet). */
export function thumb(id) { return thumbPage(id, 0); }
let byId = null;
/** Gallery entry of an id (or null). */
export function templateMeta(id) { byId ||= new Map(TEMPLATES.map((t) => [t.id, t])); return byId.get(id) || null; }
