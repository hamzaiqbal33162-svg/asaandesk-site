// Builders for the generated Sheets templates: 30 base layouts filled with a content theme and a colour palette
// (see tpl-data.js). buildGenerated("budget-tracker~p07~clinic") → { name, sheets: [...] } in the same format as
// templates.js: cells (inputs), styles, colW, rowH and charts. Pure module: no DOM.
import { parseId, rng, templateName, PEOPLE, CITIES } from "./tpl-data.js";

const colL = (c) => { let s = ""; for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const ref = (r, c) => colL(c) + (r + 1);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BLUE = { color: "#1d4ed8" };
const iso = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

function sheet(name) {
  const s = { name, cells: {}, styles: {}, colW: {}, rowH: {}, charts: [] };
  const t = {
    s,
    put(r, c, v, st) { if (v !== null && v !== undefined && v !== "") s.cells[ref(r, c)] = String(v); if (st) t.style(r, c, st); return t; },
    row(r, values, st) { values.forEach((v, c) => t.put(r, c, v, st)); return t; },
    style(r, c, st) { const k = ref(r, c); s.styles[k] = { ...(s.styles[k] || {}), ...st }; return t; },
    range(r1, c1, r2, c2, st) { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) t.style(r, c, st); return t; },
    widths(list) { list.forEach((w, c) => { if (w) s.colW[c] = w; }); return t; },
    height(r, px) { s.rowH[r] = px; return t; },
    title(text, c2, th, note) {
      t.range(0, 0, 0, c2, { fill: th.band, color: "#ffffff" }).put(0, 0, text, { b: true, size: 22, valign: "middle" }).height(0, 48);
      if (note) t.put(1, 0, note, { i: true, color: "#5b6478" });
      return t;
    },
    head(r, values, th) { return t.row(r, values, { b: true, fill: th.head, color: th.ink, bd: "b", bc: th.band }).height(r, 30); },
    zebra(r1, r2, c2, th) { for (let r = r1; r <= r2; r++) if ((r - r1) % 2) t.range(r, 0, r, c2, { fill: th.zebra }); return t; },
    total(r, values, th) { return t.row(r, values, { b: true, fill: th.head, bd: "t", bc: th.band }); },
    kpis(r, pairs, th) { // label row r, value row r+1: [[label, formula, fmt], …] two columns apart
      pairs.forEach(([label, f, fmt], i) => { t.put(r, i * 2, label, { b: true, color: "#475569" }); t.put(r + 1, i * 2, f, { b: true, size: 17, color: th.ink, ...(fmt ? { fmt } : {}) }); });
      return t.height(r + 1, 34);
    },
    box(r1, c1, r2, c2, color) { return t.range(r1, c1, r2, c2, { bd: "trbl", bc: color }); },
    chart(ch) { s.charts.push({ w: 440, h: 280, ...ch }); return t; },
    merge(r1, c1, r2, c2) { (s.merges ||= []).push({ r1, c1, r2, c2 }); return t; },
    /** Dropdown pills on a range: [[label, colour], …]. */
    dd(range, opts) { (s.dropdowns ||= []).push({ range, options: opts.map(([label, color]) => ({ label, color })) }); return t; },
    /** Conditional formatting rule on a range. */
    cf(range, op, v1, style, v2 = "") { (s.cf ||= []).push({ id: "r" + ((s.cf?.length || 0) + 1), range, op, v1: String(v1), v2: String(v2), style }); return t; },
    link(r, c, url, text) { t.put(r, c, text, { link: url }); return t; },
  };
  return t;
}

const L = {
  "budget-tracker"(x) {
    const { T, th } = x, cats = T.costs.slice(0, 5);
    const t = sheet("Budget").widths([100, 120, 120, 120, 120, 120, 120, 110, 110]);
    t.title("Budget tracker", 8, th, `${T.biz}: six months of spending against the plan, in rupees. Change the blue numbers.`);
    t.head(3, ["Month", ...cats, "Total spent", "Budget", "Left over"], th);
    const base = cats.map(() => x.money(0.6)), budget = Math.round((base.reduce((a, b) => a + b, 0) * 1.08) / 1000) * 1000;
    for (let i = 0; i < 6; i++) { const R = 5 + i; t.row(4 + i, [MONTHS[i], ...base.map((b) => Math.round((b * (0.8 + x.rnd() * 0.4)) / 100) * 100), `=SUM(B${R}:F${R})`, budget, `=H${R}-G${R}`]); }
    t.zebra(4, 9, 8, th).range(4, 1, 9, 5, BLUE).range(4, 7, 9, 7, BLUE);
    t.total(10, ["Total", ..."BCDEFGHI".split("").map((c) => `=SUM(${c}5:${c}10)`)], th).range(4, 1, 10, 8, { fmt: "thousands" });
    return t.chart({ kind: "bar", cols: [0, 6, 7], r1: 3, r2: 9, title: "Spent against budget", at: "K4", w: 460 });
  },
  "monthly-budget"(x) {
    const { T, th } = x;
    const t = sheet("Budget").widths([180, 110, 110, 120, 120, 90]);
    const rows = T.costs.map((c) => { const b = x.money(0.5); return [c, b, Math.round((b * (0.7 + x.rnd() * 0.45)) / 100) * 100]; });
    const income = Math.round((rows.reduce((a, r) => a + r[1], 0) * 1.15) / 1000) * 1000;
    t.title("Monthly budget", 5, th, `${T.biz}: this month, in rupees. Change the blue numbers.`);
    t.row(2, ["Income", income, "Spent", "=C14", "Saved", "=B3-D3"], { b: true, size: 15 }).height(2, 32).style(2, 1, { fmt: "thousands", color: "#1d4ed8" }).style(2, 3, { fmt: "thousands" }).style(2, 5, { fmt: "thousands", color: "#047857" });
    t.head(4, ["Category", "Budget", "Spent", "Remaining", "Status", "Share"], th);
    rows.forEach(([c, b, sp], i) => { const R = 6 + i; t.row(5 + i, [c, b, sp, `=B${R}-C${R}`, `=IF(C${R}>B${R},"Over budget","On track")`, `=IF($C$14=0,0,C${R}/$C$14)`]); });
    t.zebra(5, 12, 5, th).range(5, 1, 12, 2, BLUE).range(5, 4, 12, 4, { align: "center" });
    t.total(13, ["Total", "=SUM(B6:B13)", "=SUM(C6:C13)", "=SUM(D6:D13)", "", "=SUM(F6:F13)"], th).range(5, 1, 13, 3, { fmt: "thousands" }).range(5, 5, 13, 5, { fmt: "percent" });
    return t.chart({ kind: "pie", cols: [0, 2], r1: 4, r2: 12, title: "Where the money went", at: "H5", w: 420, h: 300 });
  },
  "price-list"(x) {
    const { T, th } = x, pre = T.id.slice(0, 2).toUpperCase();
    const t = sheet("Prices").widths([80, 200, 120, 120, 90, 80, 110]);
    t.title("Price list", 6, th, `${T.biz}: prices from 1 November 2026. Margins and stock status work out by themselves.`);
    t.head(3, ["Code", "Item", "Cost (Rs)", "Price (Rs)", "Margin", "In stock", "Status"], th);
    T.items.forEach(([n, cost, price], i) => { const R = 5 + i; t.row(4 + i, [`${pre}-${101 + i}`, n, cost, price, `=IF(D${R}=0,0,(D${R}-C${R})/D${R})`, x.n(2, 60), `=IF(F${R}<10,"Low stock","Available")`]); });
    t.zebra(4, 11, 6, th).range(4, 2, 11, 3, { fmt: "thousands" }).range(4, 4, 11, 4, { fmt: "percent" }).range(4, 6, 11, 6, { align: "center" }).box(3, 0, 11, 6, th.head);
    t.put(13, 0, "Average margin", { b: true }).put(13, 4, "=AVERAGE(E5:E12)", { b: true, fmt: "percent" });
    t.put(14, 0, "Items low on stock", { b: true }).put(14, 4, '=COUNTIF(G5:G12,"Low stock")', { b: true, color: "#c2410c" });
    return t;
  },
  "inventory-tracker"(x) {
    const { T, th } = x, pre = T.id.slice(0, 2).toUpperCase();
    const t = sheet("Inventory").widths([90, 190, 170, 80, 100, 120, 130, 100]);
    t.title("Inventory tracker", 7, th, `${T.biz}: stock on hand, suppliers and reorder alerts.`);
    t.kpis(2, [["Total stock value", "=SUM(G7:G14)", "thousands"], ["Items to reorder", '=COUNTIF(H7:H14,"Reorder")'], ["Units in stock", "=SUM(D7:D14)", "thousands"]], th);
    t.head(5, ["Item no.", "Item", "Supplier", "In stock", "Reorder level", "Unit cost (Rs)", "Stock value (Rs)", "Status"], th);
    T.items.forEach(([n, cost], i) => { const R = 7 + i; t.row(6 + i, [`${pre}-${201 + i}`, n, T.clients[i % 6], x.n(3, 80), x.n(8, 30), cost, `=D${R}*F${R}`, `=IF(D${R}<=E${R},"Reorder","In stock")`]); });
    t.zebra(6, 13, 7, th).range(6, 3, 13, 4, BLUE).range(6, 5, 14, 6, { fmt: "thousands" }).range(6, 7, 13, 7, { align: "center" });
    t.total(14, ["Total", "", "", "=SUM(D7:D14)", "", "", "=SUM(G7:G14)"], th);
    return t.chart({ kind: "bar", cols: [1, 3], r1: 5, r2: 13, title: "Units in stock", at: "J6" });
  },
  "balance-sheet"(x) {
    const { T, th } = x, k = (v) => Math.round((v * T.money) / 50) * 1;
    const t = sheet("Balance sheet").widths([220, 150, 130, 130, 120, 100]);
    t.title("Balance sheet", 5, th, `${T.biz}: as at 30 June 2026, compared with last year. Amounts in rupees.`);
    t.row(2, ["Total assets", "=C12", "Total liabilities", "=C17", "Check", '=IF(ROUND(C12-C23,0)=0,"Balanced","Not balanced")'], { b: true, color: th.ink }).style(2, 1, { fmt: "thousands" }).style(2, 3, { fmt: "thousands" }).style(2, 5, { color: "#047857" });
    t.head(4, ["Account", "Type", "This year", "Last year", "Change", "Change %"], th);
    const lines = { 5: ["Cash in hand", "Current asset", 85, 60], 6: ["Bank balance", "Current asset", 640, 520], 7: ["Money owed by customers", "Current asset", 310, 280], 8: ["Stock", "Current asset", 455, 400], 9: ["Equipment", "Fixed asset", 900, 950], 10: ["Vehicles", "Fixed asset", 1200, 1300], 13: ["Money owed to suppliers", "Current liability", 270, 300], 14: ["Short-term loan", "Current liability", 150, 200], 15: ["Long-term loan", "Long-term liability", 800, 950], 18: ["Owner's capital", "Equity", 1500, 1500] };
    for (const [r, [n, ty, a, b]] of Object.entries(lines)) { const R = +r + 1, f = 0.9 + x.rnd() * 0.2; t.row(+r, [n, ty, k(a * f), k(b * f), `=C${R}-D${R}`, `=IF(D${R}=0,0,E${R}/D${R})`]); }
    t.row(19, ["Retained profit", "Equity", "=C12-C17-C19", "=D12-D17-D19", "=C20-D20", "=IF(D20=0,0,E20/D20)"]);
    t.row(12, ["Liabilities"], { b: true, color: th.ink }).row(17, ["Equity"], { b: true, color: th.ink });
    const tot = { 11: ["Total assets", "=SUM(C6:C11)", "=SUM(D6:D11)"], 16: ["Total liabilities", "=SUM(C14:C16)", "=SUM(D14:D16)"], 20: ["Total equity", "=SUM(C19:C20)", "=SUM(D19:D20)"], 22: ["Total liabilities and equity", "=C17+C21", "=D17+D21"] };
    for (const [r, [n, a, b]] of Object.entries(tot)) { const R = +r + 1; t.row(+r, [n, "", a, b, `=C${R}-D${R}`, `=IF(D${R}=0,0,E${R}/D${R})`], { b: true, fill: th.head }); }
    t.range(5, 2, 22, 4, { fmt: "thousands" }).range(5, 5, 22, 5, { fmt: "percent" });
    return t.chart({ kind: "bar", cols: [0, 2, 3], r1: 4, r2: 10, title: "Assets: this year and last year", at: "H5", w: 460 });
  },
  "kpi-dashboard"(x) {
    const { T, th } = x;
    const t = sheet("Dashboard").widths([130, 130, 130, 130, 110, 110]);
    t.title("Financial KPI dashboard", 5, th, `${T.biz}: revenue, costs and profit by month, in rupees.`);
    t.row(2, ["Total revenue", "Total profit", "Average margin", "Best month", "Months growing"], { b: true, color: "#475569", fill: "#f8fafc" });
    t.row(3, ["=SUM(B8:B19)", "=SUM(D8:D19)", "=AVERAGE(E8:E19)", "=INDEX(A8:A19,MATCH(MAX(B8:B19),B8:B19,0))", '=COUNTIF(F9:F19,">0")'], { b: true, size: 17, color: th.ink, fill: "#f8fafc" }).height(3, 36);
    t.style(3, 0, { fmt: "thousands" }).style(3, 1, { fmt: "thousands" }).style(3, 2, { fmt: "percent" }).box(2, 0, 3, 4, th.head);
    t.head(6, ["Month", "Revenue", "Costs", "Profit", "Margin", "Growth"], th);
    let rev = T.money * 6;
    MONTHS.forEach((m, i) => { const R = 8 + i; rev = Math.round((rev * (0.96 + x.rnd() * 0.1)) / 1000) * 1000; const cost = Math.round((rev * (0.62 + x.rnd() * 0.16)) / 1000) * 1000; t.row(7 + i, [m, rev, cost, `=B${R}-C${R}`, `=IF(B${R}=0,0,D${R}/B${R})`, i ? `=B${R}/B${R - 1}-1` : ""]); });
    t.total(19, ["Total", "=SUM(B8:B19)", "=SUM(C8:C19)", "=SUM(D8:D19)", "=D20/B20"], th);
    t.zebra(7, 18, 5, th).range(7, 1, 19, 3, { fmt: "thousands" }).range(7, 4, 19, 5, { fmt: "percent" });
    t.chart({ kind: "line", cols: [0, 1, 2], r1: 6, r2: 18, title: "Revenue and costs", at: "H3", w: 470, h: 270 });
    return t.chart({ kind: "bar", cols: [0, 3], r1: 6, r2: 18, title: "Profit by month", at: "H15", w: 470, h: 250 });
  },
  "price-calculator"(x) {
    const { T, th } = x, r10 = (v) => Math.max(10, Math.round(v / 10) * 10);
    const t = sheet("Calculator").widths([190, 110, 110, 110, 110, 120, 90, 130, 110, 140]);
    t.title("Price calculator", 9, th, `${T.biz}: type your costs and markup; selling price, profit and price with tax work out by themselves.`);
    t.row(2, ["Sales tax", 0.17, "", "Average profit", "=AVERAGE(I7:I14)", "", "Best profit", "=INDEX(A7:A14,MATCH(MAX(I7:I14),I7:I14,0))"], { b: true, color: th.ink }).style(2, 1, { fmt: "percent", color: "#1d4ed8" }).style(2, 4, { fmt: "thousands" });
    t.head(5, ["Product", "Material (Rs)", "Labour (Rs)", "Packing (Rs)", "Shipping (Rs)", "Total cost (Rs)", "Markup", "Selling price (Rs)", "Profit (Rs)", "Price with tax (Rs)"], th);
    T.items.forEach(([n, cost], i) => { const R = 7 + i; t.row(6 + i, [n, r10(cost * 0.5), r10(cost * 0.3), r10(cost * 0.1), r10(cost * 0.1), `=SUM(B${R}:E${R})`, Math.round((0.3 + x.rnd() * 0.6) * 20) / 20, `=ROUND(F${R}*(1+G${R}),0)`, `=H${R}-F${R}`, `=ROUND(H${R}*(1+$B$3),0)`]); });
    t.total(14, ["Average", "", "", "", "", "=AVERAGE(F7:F14)", "=AVERAGE(G7:G14)", "=AVERAGE(H7:H14)", "=AVERAGE(I7:I14)", "=AVERAGE(J7:J14)"], th);
    t.zebra(6, 13, 9, th).range(6, 1, 14, 5, { fmt: "thousands" }).range(6, 7, 14, 9, { fmt: "thousands" }).range(6, 6, 14, 6, { fmt: "percent" }).range(6, 1, 13, 4, BLUE).range(6, 6, 13, 6, BLUE);
    return t.chart({ kind: "bar", cols: [0, 5, 7], r1: 5, r2: 13, title: "Cost and selling price", at: "L6", w: 460 });
  },
  "income-statement"(x) {
    const { T, th } = x, I = T.money * 60, k = (v) => Math.round(v / 1000) * 1000;
    const t = sheet("Income statement").widths([110, 220, 130, 130, 120, 100]);
    t.title("Income statement", 5, th, `${T.biz}: for the year ended 30 June 2026. Amounts in rupees.`);
    t.head(3, ["Section", "Item", "This year", "Last year", "Change", "Change %"], th);
    const inc = [["Income", "Sales", I * 0.75], ["Income", "Services", I * 0.19], ["Income", "Other operating income", I * 0.06]];
    const shares = [0.3, 0.17, 0.08, 0.06, 0.05];
    const exp = T.costs.slice(0, 5).map((c, i) => ["Expenses", c, I * shares[i] * (0.9 + x.rnd() * 0.2)]);
    const lines = [...inc.map(([s, n, v]) => [s, n, k(v), k(v * (0.82 + x.rnd() * 0.12))]), ["", "Total income", "=SUM(C5:C7)", "=SUM(D5:D7)"], ...exp.map(([s, n, v]) => [s, n, k(v), k(v * (0.85 + x.rnd() * 0.1))]), ["", "Total expenses", "=SUM(C9:C13)", "=SUM(D9:D13)"], ["", "Operating profit", "=C8-C14", "=D8-D14"], ["Other", "Interest earned", k(I * 0.01), k(I * 0.008)], ["Other", "Other income", k(I * 0.004), k(I * 0.003)], ["", "Profit before tax", "=C15+C16+C17", "=D15+D16+D17"], ["Tax", "Income tax (15%)", "=ROUND(C18*0.15,0)", "=ROUND(D18*0.15,0)"], ["", "Net profit", "=C18-C19", "=D18-D19"]];
    lines.forEach((v, i) => { const R = 5 + i; t.row(4 + i, [...v, `=C${R}-D${R}`, `=IF(D${R}=0,0,E${R}/D${R})`], v[0] ? null : { b: true, fill: th.head }); });
    t.range(19, 0, 19, 5, { fill: th.band, color: "#ffffff", size: 15 }).height(19, 30);
    t.range(4, 2, 19, 4, { fmt: "thousands" }).range(4, 5, 19, 5, { fmt: "percent" });
    return t.chart({ kind: "bar", cols: [1, 2, 3], r1: 3, r2: 6, title: "Income: this year and last year", at: "H4" });
  },
  "blank-table"(x) {
    const { T, th } = x;
    const t = sheet("Table").widths([150, 120, 120, 120, 120, 120, 120, 120]);
    t.title("Title", 7, th, T.biz);
    t.head(2, ["Column 1", "Column 2", "Column 3", "Column 4", "Column 5", "Column 6", "Column 7", "Column 8"], th);
    t.zebra(3, 17, 7, th).box(2, 0, 17, 7, th.head);
    return t.total(18, ["Total", ..."BCDEFGH".split("").map((c) => `=SUM(${c}4:${c}18)`)], th);
  },
  "marketing-budget"(x) {
    const { T, th } = x, s = T.money / 60000;
    const t = sheet("Marketing").widths([100, 120, 180, 150, 110, 110, 120, 120, 30, 120, 110, 110]);
    t.title("Marketing budget tracker", 7, th, `${T.biz}: planned and actual spend for each campaign, in rupees.`);
    t.head(3, ["Date", "Channel", "Campaign", "Vendor", "Planned (Rs)", "Actual (Rs)", "Difference (Rs)", "Status"], th);
    const ch = ["Social media", "Search ads", "Print", "Radio", "Events"], camp = ["New season launch", "Weekend offer", "Festival promo", "Referral drive", "Open day", "Year-end sale", "Short videos", "Loyalty push", "Local radio spot", "Flyer drop"];
    camp.forEach((c, i) => { const R = 5 + i, p = Math.round((x.n(20, 120) * 1000 * s) / 500) * 500; t.row(4 + i, [iso(2026, 7 + Math.floor(i / 4), 1 + (i % 4) * 7), ch[i % 5], c, T.clients[i % 6], p, Math.round((p * (0.85 + x.rnd() * 0.25)) / 100) * 100, `=E${R}-F${R}`, `=IF(F${R}>E${R},"Over budget","Within budget")`]); });
    t.total(14, ["Total", "", "", "", "=SUM(E5:E14)", "=SUM(F5:F14)", "=SUM(G5:G14)"], th);
    t.zebra(4, 13, 7, th).range(4, 0, 13, 0, { fmt: "date" }).range(4, 4, 14, 6, { fmt: "thousands" }).range(4, 7, 13, 7, { align: "center" });
    t.put(3, 9, "Channel", { b: true, fill: th.band, color: "#fff" }).put(3, 10, "Planned", { b: true, fill: th.band, color: "#fff" }).put(3, 11, "Actual", { b: true, fill: th.band, color: "#fff" });
    ch.forEach((c, i) => { const R = 5 + i; t.put(4 + i, 9, c).put(4 + i, 10, `=SUMIF($B$5:$B$14,J${R},$E$5:$E$14)`, { fmt: "thousands" }).put(4 + i, 11, `=SUMIF($B$5:$B$14,J${R},$F$5:$F$14)`, { fmt: "thousands" }); });
    t.box(3, 9, 8, 11, th.head);
    return t.chart({ kind: "bar", range: "J4:L9", title: "Planned and actual by channel", at: "J12" });
  },
  "sales-tracker"(x) {
    const { T, th } = x, items = T.items.slice(0, 4);
    const t = sheet("Sales").widths([110, 190, 110, 80, 120, 130, 30, 190, 130]);
    t.title("Sales tracker", 5, th, `${T.biz}: sales by day, with totals per item and a chart.`);
    t.head(3, ["Date", "Item", "City", "Units", "Price (Rs)", "Revenue (Rs)"], th);
    for (let i = 0; i < 12; i++) { const R = 5 + i, [n, , price] = items[i % 4]; t.row(4 + i, [iso(2026, 10, 1 + i * 2 + (i > 5 ? 1 : 0)), n, CITIES[(i * 3 + x.n(0, 9)) % CITIES.length], price > 100000 ? x.n(1, 3) : x.n(5, 120), price, `=D${R}*E${R}`]); }
    t.zebra(4, 15, 5, th).range(4, 0, 15, 0, { fmt: "date" }).range(4, 4, 16, 5, { fmt: "thousands" });
    t.total(16, ["Total", "", "", "=SUM(D5:D16)", "", "=SUM(F5:F16)"], th);
    t.put(3, 7, "Item", { b: true, fill: th.band, color: "#fff" }).put(3, 8, "Revenue (Rs)", { b: true, fill: th.band, color: "#fff" });
    items.forEach(([n], i) => { const R = 5 + i; t.put(4 + i, 7, n).put(4 + i, 8, `=SUMIF($B$5:$B$16,H${R},$F$5:$F$16)`, { fmt: "thousands" }); });
    t.put(8, 7, "Best seller", { b: true }).put(8, 8, "=INDEX(H5:H8,MATCH(MAX(I5:I8),I5:I8,0))", { b: true }).box(3, 7, 8, 8, th.head);
    return t.chart({ kind: "bar", range: "H4:I8", title: "Revenue by item", at: "H11" });
  },
  "invoice-tracker"(x) {
    const { T, th } = x;
    const t = sheet("Invoices").widths([110, 200, 110, 110, 130, 100, 120]);
    t.title("Invoice tracker", 6, th, `${T.biz}: bills sent, due dates, paid and unpaid.`);
    t.row(2, ["As of", "2026-11-15", "Billed", "=SUM(E7:E14)", "Unpaid", '=SUMIF(F7:F14,"Unpaid",E7:E14)'], { b: true, color: th.ink }).style(2, 1, { fmt: "date" }).style(2, 3, { fmt: "thousands" }).style(2, 5, { fmt: "thousands", color: "#c2410c" });
    t.head(5, ["Invoice #", "Client", "Date", "Due date", "Amount (Rs)", "Status", "Days overdue"], th);
    for (let i = 0; i < 8; i++) { const R = 7 + i; t.row(6 + i, [`INV-${2001 + i}`, T.clients[i % 6], iso(2026, 8, 1 + i * 9), `=C${R}+30`, x.money(0.8), x.rnd() < 0.55 ? "Paid" : "Unpaid", `=IF(F${R}="Paid",0,MAX(0,$B$3-D${R}))`]); }
    t.zebra(6, 13, 6, th).range(6, 2, 13, 3, { fmt: "date" }).range(6, 4, 14, 4, { fmt: "thousands" }).range(6, 5, 13, 6, { align: "center" });
    return t.total(14, ["Total", "", "", "", "=SUM(E7:E14)", '=COUNTIF(F7:F14,"Unpaid")&" unpaid"', "=MAX(G7:G14)"], th);
  },
  attendance(x) {
    const { T, th } = x, ppl = x.people(8);
    const t = sheet("Attendance").widths([160, ...Array(10).fill(48), 80, 80, 70, 110]);
    t.title("Attendance sheet", 14, th, `${T.biz}: P = present, A = absent, L = leave.`);
    t.head(3, ["Name", ...Array.from({ length: 10 }, (_, i) => `Day ${i + 1}`), "Present", "Absent", "Leave", "Attendance"], th);
    ppl.forEach((n, i) => { const R = 5 + i, marks = Array.from({ length: 10 }, () => { const v = x.rnd(); return v < 0.84 ? "P" : v < 0.93 ? "A" : "L"; }); t.row(4 + i, [n, ...marks, `=COUNTIF(B${R}:K${R},"P")`, `=COUNTIF(B${R}:K${R},"A")`, `=COUNTIF(B${R}:K${R},"L")`, `=L${R}/COUNTA(B${R}:K${R})`]).range(4 + i, 1, 4 + i, 10, { align: "center" }); });
    t.zebra(4, 11, 14, th).range(4, 14, 11, 14, { fmt: "percent" });
    return t.total(12, ["Present each day", ...Array.from({ length: 10 }, (_, c) => `=COUNTIF(${colL(c + 1)}5:${colL(c + 1)}12,"P")`)], th).range(12, 1, 12, 10, { align: "center" });
  },
  scorecard(x) {
    const { T, th } = x, ppl = x.people(8), crit = T.criteria || ["Quality", "Speed", "Teamwork", "Attendance"];
    const t = sheet("Scores").widths([160, 90, 90, 90, 90, 80, 100, 70, 60]);
    t.title("Scorecard", 8, th, `${T.biz}: scores out of 100, with totals, grades and rank.`);
    t.head(3, ["Name", ...crit, "Total", "Percent", "Grade", "Rank"], th);
    ppl.forEach((n, i) => { const R = 5 + i; t.row(4 + i, [n, x.n(45, 98), x.n(45, 98), x.n(45, 98), x.n(45, 98), `=SUM(B${R}:E${R})`, `=F${R}/400`, `=IFS(G${R}>=0.8,"A",G${R}>=0.7,"B",G${R}>=0.6,"C",G${R}>=0.5,"D",TRUE,"F")`, `=RANK(F${R},F$5:F$12)`]); });
    t.zebra(4, 11, 8, th).range(4, 1, 11, 4, BLUE).range(4, 6, 12, 6, { fmt: "percent" }).range(4, 7, 11, 8, { align: "center" });
    t.total(12, ["Average", "=AVERAGE(B5:B12)", "=AVERAGE(C5:C12)", "=AVERAGE(D5:D12)", "=AVERAGE(E5:E12)", "=AVERAGE(F5:F12)", "=AVERAGE(G5:G12)"], th).range(12, 1, 12, 5, { fmt: "fixed2" });
    return t.chart({ kind: "bar", cols: [0, 5], r1: 3, r2: 11, title: "Total score", at: "K4" });
  },
  "project-tracker"(x) {
    const { T, th } = x, ppl = x.people(4), done = [1, 1, 0.75, 0.5, 0.6, 0.25, 0, 0];
    const t = sheet("Project").widths([210, 140, 110, 110, 70, 80, 130, 110]);
    t.title("Project tracker", 7, th, `${T.biz}: tasks, owners, dates and progress.`);
    t.kpis(2, [["Tasks", "=COUNTA(A7:A14)"], ["Done", '=COUNTIF(H7:H14,"Done")'], ["Overall progress", "=AVERAGE(F7:F14)", "percent"]], th);
    t.head(5, ["Task", "Owner", "Start", "End", "Days", "Done", "Progress", "Status"], th);
    T.tasks.forEach((n, i) => { const R = 7 + i, d0 = 2 + i * 4; t.row(6 + i, [n, ppl[i % 4], iso(2026, 11, d0), iso(2026, 11, d0 + x.n(3, 12)), `=D${R}-C${R}`, done[i], `=REPT("█",ROUND(F${R}*10,0))&REPT("░",10-ROUND(F${R}*10,0))`, `=IF(F${R}>=1,"Done",IF(F${R}>0,"In progress","Not started"))`]); });
    return t.zebra(6, 13, 7, th).range(6, 2, 13, 3, { fmt: "date" }).range(6, 5, 13, 5, { fmt: "percent", color: "#1d4ed8" }).range(6, 6, 13, 6, { color: th.band }).range(6, 7, 13, 7, { align: "center" });
  },
  "expense-report"(x) {
    const { T, th } = x, cats = T.costs.slice(0, 6), ppl = x.people(3);
    const t = sheet("Expenses").widths([110, 170, 220, 120, 140, 30, 170, 120]);
    t.title("Expense report", 4, th, `${T.biz}: every expense this month, with totals by category.`);
    t.head(3, ["Date", "Category", "Description", "Amount (Rs)", "Paid by"], th);
    for (let i = 0; i < 12; i++) t.row(4 + i, [iso(2026, 10, 1 + i * 2), cats[i % 6], i % 2 ? `Paid to ${T.clients[i % 6]}` : T.tasks[i % 8], x.money(0.3), ppl[i % 3]]);
    t.zebra(4, 15, 4, th).range(4, 0, 15, 0, { fmt: "date" }).range(4, 3, 16, 3, { fmt: "thousands" });
    t.total(16, ["Total", "", "", "=SUM(D5:D16)"], th);
    t.put(3, 6, "Category", { b: true, fill: th.band, color: "#fff" }).put(3, 7, "Total (Rs)", { b: true, fill: th.band, color: "#fff" });
    cats.forEach((c, i) => { const R = 5 + i; t.put(4 + i, 6, c).put(4 + i, 7, `=SUMIF($B$5:$B$16,G${R},$D$5:$D$16)`, { fmt: "thousands" }); });
    t.box(3, 6, 9, 7, th.head);
    return t.chart({ kind: "pie", range: "G4:H10", title: "Spending by category", at: "G13", w: 400, h: 290 });
  },
  "cash-flow"(x) {
    const { T, th } = x;
    const t = sheet("Cash flow").widths([100, 140, 130, 130, 120, 140]);
    t.title("Cash flow", 5, th, `${T.biz}: money in and out each month, with the running balance.`);
    t.head(3, ["Month", "Opening balance", "Cash in", "Cash out", "Net", "Closing balance"], th);
    MONTHS.forEach((m, i) => { const R = 5 + i, inn = x.money(3); t.row(4 + i, [m, i ? `=F${R - 1}` : x.money(4), inn, Math.round((inn * (0.75 + x.rnd() * 0.35)) / 500) * 500, `=C${R}-D${R}`, `=B${R}+E${R}`]); });
    t.zebra(4, 15, 5, th).range(4, 1, 16, 5, { fmt: "thousands" }).range(4, 2, 15, 3, BLUE).style(4, 1, BLUE);
    t.total(16, ["Total", "", "=SUM(C5:C16)", "=SUM(D5:D16)", "=SUM(E5:E16)", "=F16"], th);
    return t.chart({ kind: "line", cols: [0, 2, 3], r1: 3, r2: 15, title: "Cash in and cash out", at: "H4", w: 460 });
  },
  payroll(x) {
    const { T, th } = x, ppl = x.people(8), roles = ["Manager", "Assistant", "Accountant", "Sales officer", "Driver", "Supervisor", "Helper", "Receptionist"];
    const t = sheet("Payroll").widths([160, 140, 120, 130, 130, 100, 130]);
    t.title("Payroll", 6, th, `${T.biz}: November 2026 salaries in rupees.`);
    t.kpis(2, [["Total payroll", "=SUM(G7:G14)", "thousands"], ["Average net pay", "=AVERAGE(G7:G14)", "thousands"], ["Staff", "=COUNTA(A7:A14)"]], th);
    t.head(5, ["Name", "Role", "Basic (Rs)", "Allowances (Rs)", "Deductions (Rs)", "Tax (Rs)", "Net pay (Rs)"], th);
    ppl.forEach((n, i) => { const R = 7 + i, basic = Math.round((x.n(35, 160) * 1000) / 500) * 500; t.row(6 + i, [n, roles[i], basic, Math.round(basic * 0.15 / 100) * 100, x.n(0, 6) * 500, `=ROUND(C${R}*0.05,0)`, `=C${R}+D${R}-E${R}-F${R}`]); });
    t.zebra(6, 13, 6, th).range(6, 2, 14, 6, { fmt: "thousands" }).range(6, 2, 13, 4, BLUE);
    return t.total(14, ["Total", "", "=SUM(C7:C14)", "=SUM(D7:D14)", "=SUM(E7:E14)", "=SUM(F7:F14)", "=SUM(G7:G14)"], th);
  },
  "order-tracker"(x) {
    const { T, th } = x, ppl = x.people(10), st = ["Delivered", "Shipped", "Pending"];
    const t = sheet("Orders").widths([100, 110, 160, 190, 60, 120, 130, 110]);
    t.title("Order tracker", 7, th, `${T.biz}: orders, amounts and delivery status.`);
    t.kpis(2, [["Orders", "=COUNTA(A7:A16)"], ["Revenue", "=SUM(G7:G16)", "thousands"], ["Pending", '=COUNTIF(H7:H16,"Pending")']], th);
    t.head(5, ["Order #", "Date", "Customer", "Item", "Qty", "Price (Rs)", "Total (Rs)", "Status"], th);
    ppl.forEach((n, i) => { const R = 7 + i, [item, , price] = T.items[i % 8]; t.row(6 + i, [`ORD-${501 + i}`, iso(2026, 11, 1 + i), n, item, price > 100000 ? 1 : x.n(1, 12), price, `=E${R}*F${R}`, st[Math.floor(x.rnd() * 3)]]); });
    t.zebra(6, 15, 7, th).range(6, 1, 15, 1, { fmt: "date" }).range(6, 5, 16, 6, { fmt: "thousands" }).range(6, 7, 15, 7, { align: "center" });
    return t.total(16, ["Total", "", "", "", "=SUM(E7:E16)", "", "=SUM(G7:G16)"], th);
  },
  "event-budget"(x) {
    const { T, th } = x;
    const EV = { home: "Family get-together", shop: "Grand opening", school: "Annual prize day", clinic: "Free health camp", restaurant: "Food festival night", wedding: "Wedding", realestate: "Property expo", gym: "Fitness challenge day", startup: "Product launch", ngo: "Fundraising dinner", travel: "Tour partners meet-up", salon: "Bridal show" };
    const items = T.id === "wedding" ? T.items.map((i) => i[0]) : ["Venue", "Food and drinks", "Decor", "Sound system", "Photography", "Printing", "Gifts", "Transport"];
    const t = sheet("Event").widths([190, 180, 120, 120, 130, 130]);
    t.title("Event budget", 5, th, `${T.biz}: ${EV[T.id] || "Event"}. Estimates, actual costs, deposits and what is still due.`);
    t.head(3, ["Item", "Supplier", "Estimate (Rs)", "Actual (Rs)", "Deposit paid (Rs)", "Balance due (Rs)"], th);
    items.forEach((n, i) => { const R = 5 + i, est = x.money(0.8); t.row(4 + i, [n, T.clients[i % 6], est, Math.round((est * (0.85 + x.rnd() * 0.3)) / 500) * 500, Math.round((est * (0.2 + x.rnd() * 0.4)) / 500) * 500, `=D${R}-E${R}`]); });
    t.zebra(4, 11, 5, th).range(4, 2, 12, 5, { fmt: "thousands" }).range(4, 2, 11, 4, BLUE);
    t.total(12, ["Total", "", "=SUM(C5:C12)", "=SUM(D5:D12)", "=SUM(E5:E12)", "=SUM(F5:F12)"], th);
    t.put(14, 0, "Over or under estimate", { b: true }).put(14, 3, "=D13-C13", { b: true, fmt: "thousands" });
    return t.chart({ kind: "pie", cols: [0, 3], r1: 3, r2: 11, title: "Actual cost by item", at: "H4", w: 420, h: 300 });
  },
  "savings-goals"(x) {
    const { T, th } = x, goals = ["Emergency fund", "New equipment", "Family holiday", "Renovation", "Vehicle", "Training course"];
    const t = sheet("Savings").widths([180, 120, 120, 130, 90, 130, 100]);
    t.title("Savings goals", 6, th, `${T.biz}: what we are saving for and how close we are.`);
    t.head(3, ["Goal", "Target (Rs)", "Saved (Rs)", "Monthly saving (Rs)", "Progress", "", "Months left"], th);
    goals.forEach((g, i) => { const R = 5 + i, target = x.money(4); t.row(4 + i, [g, target, Math.round((target * x.rnd() * 0.9) / 500) * 500, Math.round((target / x.n(6, 24)) / 500) * 500 || 500, `=IF(B${R}=0,0,C${R}/B${R})`, `=REPT("█",ROUND(E${R}*10,0))&REPT("░",10-ROUND(E${R}*10,0))`, `=IF(C${R}>=B${R},0,ROUNDUP((B${R}-C${R})/D${R},0))`]); });
    t.zebra(4, 9, 6, th).range(4, 1, 10, 3, { fmt: "thousands" }).range(4, 1, 9, 3, BLUE).range(4, 4, 10, 4, { fmt: "percent" }).range(4, 5, 9, 5, { color: th.band });
    t.total(10, ["Total", "=SUM(B5:B10)", "=SUM(C5:C10)", "=SUM(D5:D10)", "=IF(B11=0,0,C11/B11)", "", "=MAX(G5:G10)"], th);
    return t.chart({ kind: "bar", cols: [0, 1, 2], r1: 3, r2: 9, title: "Target and saved", at: "I4" });
  },
  "loan-calculator"(x) {
    const { T, th } = x;
    const t = sheet("Loan").widths([190, 140, 120, 120, 140]);
    t.title("Loan calculator", 4, th, `${T.biz}: monthly instalment and the first year of repayments. Change the blue numbers.`);
    const amt = Math.round((T.money * 30) / 10000) * 10000;
    const inputs = [["Loan amount (Rs)", amt, "thousands"], ["Yearly interest rate", Math.round((0.14 + x.rnd() * 0.08) * 200) / 200, "percent"], ["Years", x.n(3, 7), null]];
    inputs.forEach(([l, v, f], i) => t.put(3 + i, 0, l, { b: true }).put(3 + i, 1, v, { ...BLUE, b: true, ...(f ? { fmt: f } : {}) }));
    const outs = [["Monthly instalment (Rs)", "=ROUND(B4*(B5/12)/(1-(1+B5/12)^(-B6*12)),0)"], ["Total paid (Rs)", "=B7*B6*12"], ["Total interest (Rs)", "=B8-B4"]];
    outs.forEach(([l, f], i) => t.put(6 + i, 0, l, { b: true }).put(6 + i, 1, f, { b: true, fmt: "thousands", fill: th.head, color: th.ink }));
    t.height(6, 30).style(6, 1, { size: 16 }).box(3, 0, 8, 1, th.head);
    t.head(10, ["Month", "Opening (Rs)", "Interest (Rs)", "Principal (Rs)", "Closing (Rs)"], th);
    for (let i = 0; i < 12; i++) { const R = 12 + i; t.row(11 + i, [i + 1, i ? `=E${R - 1}` : "=$B$4", `=ROUND(B${R}*$B$5/12,0)`, `=$B$7-C${R}`, `=B${R}-D${R}`]); }
    t.zebra(11, 22, 4, th).range(11, 1, 22, 4, { fmt: "thousands" }).range(11, 0, 22, 0, { align: "center" });
    return t.chart({ kind: "line", cols: [0, 4], r1: 10, r2: 22, title: "Balance left after each month", at: "G4", w: 440 });
  },
  "weekly-schedule"(x) {
    const { T, th } = x, days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const t = sheet("Schedule").widths([90, 150, 150, 150, 150, 150, 150]);
    t.title("Weekly schedule", 6, th, `${T.biz}: who does what this week.`);
    t.head(3, ["Time", ...days], th);
    for (let i = 0; i < 9; i++) {
      const row = [`${9 + i > 12 ? 9 + i - 12 : 9 + i}:00 ${9 + i >= 12 ? "PM" : "AM"}`];
      for (let d = 0; d < 6; d++) row.push(x.rnd() < 0.42 ? T.tasks[(i + d * 3) % 8] : "");
      t.row(4 + i, row);
      row.forEach((v, d) => { if (d && v) t.style(4 + i, d, { fill: th.head, color: th.ink, wrap: true }); });
    }
    t.range(4, 0, 12, 0, { b: true, color: "#475569", fmt: "time" }).box(3, 0, 12, 6, th.head);
    return t.total(13, ["Busy slots", ..."BCDEFG".split("").map((c) => `=COUNTA(${c}5:${c}13)`)], th).range(13, 1, 13, 6, { align: "center" });
  },
  "customer-list"(x) {
    const { T, th } = x, ppl = x.people(10), gold = T.money * 2, silver = T.money * 0.8;
    const t = sheet("Customers").widths([170, 140, 120, 80, 140, 100]);
    t.title("Customer list", 5, th, `${T.biz}: customers, orders and what they spend.`);
    t.kpis(2, [["Customers", "=COUNTA(A7:A16)"], ["Total sales", "=SUM(E7:E16)", "thousands"], ["Gold customers", '=COUNTIF(F7:F16,"Gold")']], th);
    t.head(5, ["Name", "Phone", "City", "Orders", "Total spent (Rs)", "Segment"], th);
    ppl.forEach((n, i) => { const R = 7 + i, o = x.n(1, 30); t.row(6 + i, [n, `0300 ${x.n(1000000, 9999999)}`, CITIES[(i + x.n(0, 9)) % CITIES.length], o, Math.round((o * T.money * (0.05 + x.rnd() * 0.15)) / 100) * 100, `=IF(E${R}>=${gold},"Gold",IF(E${R}>=${silver},"Silver","Bronze"))`]); });
    return t.zebra(6, 15, 5, th).range(6, 4, 15, 4, { fmt: "thousands" }).range(6, 5, 15, 5, { align: "center" });
  },
  commission(x) {
    const { T, th } = x, ppl = x.people(6);
    const t = sheet("Commission").widths([160, 120, 120, 100, 80, 130, 110, 120]);
    t.title("Sales commission", 7, th, `${T.biz}: targets, sales, commission and bonus for each person.`);
    t.head(3, ["Name", "Target (Rs)", "Sales (Rs)", "Achieved", "Rate", "Commission (Rs)", "Bonus (Rs)", "Total pay (Rs)"], th);
    ppl.forEach((n, i) => { const R = 5 + i, target = x.money(5); t.row(4 + i, [n, target, Math.round((target * (0.7 + x.rnd() * 0.5)) / 500) * 500, `=IF(B${R}=0,0,C${R}/B${R})`, Math.round((0.03 + x.rnd() * 0.05) * 200) / 200, `=ROUND(C${R}*E${R},0)`, `=IF(D${R}>=1,ROUND(B${R}*0.02,0),0)`, `=F${R}+G${R}`]); });
    t.zebra(4, 9, 7, th).range(4, 1, 10, 2, { fmt: "thousands" }).range(4, 3, 10, 4, { fmt: "percent" }).range(4, 5, 10, 7, { fmt: "thousands" }).range(4, 1, 9, 2, BLUE);
    t.total(10, ["Total", "=SUM(B5:B10)", "=SUM(C5:C10)", "=IF(B11=0,0,C11/B11)", "", "=SUM(F5:F10)", "=SUM(G5:G10)", "=SUM(H5:H10)"], th);
    return t.chart({ kind: "bar", cols: [0, 1, 2], r1: 3, r2: 9, title: "Target and sales", at: "J4" });
  },
  "habit-tracker"(x) {
    const { T, th } = x, days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const habits = T.id === "home" || T.id === "gym" ? ["Drink 8 glasses of water", "Walk 30 minutes", "Read 20 pages", "Sleep by 11 pm", "No sugary drinks", "Plan tomorrow"] : T.tasks.slice(0, 6);
    const t = sheet("Habits").widths([220, 52, 52, 52, 52, 52, 52, 52, 70, 80, 130]);
    t.title(T.id === "home" || T.id === "gym" ? "Habit tracker" : "Daily routine tracker", 10, th, `${T.biz}: tick each day with ✓. Totals and progress update by themselves.`);
    t.head(3, ["Habit", ...days, "Done", "Rate", "Progress"], th);
    habits.forEach((h, i) => { const R = 5 + i; t.row(4 + i, [h, ...days.map(() => (x.rnd() < 0.68 ? "✓" : "")), `=COUNTIF(B${R}:H${R},"✓")`, `=I${R}/7`, `=REPT("█",ROUND(J${R}*10,0))&REPT("░",10-ROUND(J${R}*10,0))`]).range(4 + i, 1, 4 + i, 8, { align: "center", color: th.band }); });
    t.zebra(4, 9, 10, th).range(4, 9, 10, 9, { fmt: "percent" }).range(4, 10, 9, 10, { color: th.band });
    return t.total(10, ["Every habit", ...days.map((_, c) => `=COUNTIF(${colL(c + 1)}5:${colL(c + 1)}10,"✓")`), "=SUM(I5:I10)", "=I11/42"], th).range(10, 1, 10, 8, { align: "center" });
  },
  quotation(x) {
    const { T, th } = x;
    const t = sheet("Quotation").widths([240, 80, 130, 140]);
    t.title("Quotation", 3, th, T.biz);
    t.put(2, 0, "Quote for", { b: true }).put(2, 1, T.clients[x.n(0, 5)]).put(3, 0, "Date", { b: true }).put(3, 1, "2026-11-11", { fmt: "date" }).put(4, 0, "Valid until", { b: true }).put(4, 1, "=B4+15", { fmt: "date" });
    t.head(6, ["Item", "Qty", "Rate (Rs)", "Amount (Rs)"], th);
    T.items.slice(0, 6).forEach(([n, , price], i) => { const R = 8 + i; t.row(7 + i, [n, price > 100000 ? 1 : x.n(1, 10), price, `=B${R}*C${R}`]); });
    t.zebra(7, 12, 3, th).range(7, 2, 16, 3, { fmt: "thousands" }).range(7, 1, 12, 1, { align: "center", ...BLUE });
    t.row(13, ["Subtotal", "", "", "=SUM(D8:D13)"], { b: true }).row(14, ["Discount", "", 0.05, "=-ROUND(D14*C15,0)"]).row(15, ["Sales tax", "", 0.17, "=ROUND((D14+D15)*C16,0)"]);
    t.range(14, 2, 15, 2, { fmt: "percent", ...BLUE });
    t.total(16, ["Total to pay", "", "", "=D14+D15+D16"], th).style(16, 3, { size: 16 }).height(16, 32);
    return t.put(18, 0, "Thank you for your business.", { i: true, color: "#5b6478" });
  },
  "break-even"(x) {
    const { T, th } = x, [item, cost, price] = T.items[x.n(0, 7)];
    const t = sheet("Break-even").widths([220, 140, 140, 140]);
    t.title("Break-even analysis", 3, th, `${T.biz}: how many ${item.toLowerCase()} sales cover the fixed costs. Change the blue numbers.`);
    const ins = [["Fixed costs per month (Rs)", Math.round((T.money * 1.5) / 1000) * 1000], ["Price per unit (Rs)", price], ["Cost per unit (Rs)", cost]];
    ins.forEach(([l, v], i) => t.put(3 + i, 0, l, { b: true }).put(3 + i, 1, v, { b: true, fmt: "thousands", ...BLUE }));
    t.put(6, 0, "Break-even units", { b: true }).put(6, 1, "=ROUNDUP(B4/(B5-B6),0)", { b: true, size: 16, fill: th.head, color: th.ink }).put(7, 0, "Break-even sales (Rs)", { b: true }).put(7, 1, "=B7*B5", { b: true, fmt: "thousands", fill: th.head, color: th.ink }).box(3, 0, 7, 1, th.head);
    t.head(9, ["Units sold", "Revenue (Rs)", "Total cost (Rs)", "Profit (Rs)"], th);
    for (let i = 0; i <= 10; i++) { const R = 11 + i; t.row(10 + i, [i ? `=ROUND($B$7*${i}/5,0)` : 0, `=A${R}*$B$5`, `=$B$4+A${R}*$B$6`, `=B${R}-C${R}`]); }
    t.zebra(10, 20, 3, th).range(10, 0, 20, 3, { fmt: "thousands" });
    return t.chart({ kind: "line", cols: [0, 1, 2], r1: 9, r2: 20, title: "Revenue and total cost", at: "F4", w: 460 });
  },
  "asset-register"(x) {
    const { T, th } = x, assets = ["Laptop", "Printer", "Air conditioner", "Furniture set", "Delivery bike", "Generator", "CCTV system", "Water dispenser"];
    const t = sheet("Assets").widths([180, 120, 120, 120, 150, 100, 140]);
    t.title("Asset register", 6, th, `${T.biz}: equipment we own, its cost and its value today.`);
    t.put(2, 0, "Value as at", { b: true }).put(2, 1, "2026-06-30", { b: true, fmt: "date", ...BLUE });
    t.head(5, ["Asset", "Bought on", "Cost (Rs)", "Useful life (years)", "Yearly depreciation (Rs)", "Years used", "Book value (Rs)"], th);
    assets.forEach((a, i) => { const R = 7 + i; t.row(6 + i, [a, iso(2020 + x.n(0, 5), x.n(1, 12), x.n(1, 28)), Math.round((x.money(1.5)) / 1000) * 1000, x.n(3, 10), `=ROUND(C${R}/D${R},0)`, `=ROUND(($B$3-B${R})/365,1)`, `=MAX(0,C${R}-E${R}*F${R})`]); });
    t.zebra(6, 13, 6, th).range(6, 1, 13, 1, { fmt: "date" }).range(6, 2, 14, 2, { fmt: "thousands" }).range(6, 4, 14, 4, { fmt: "thousands" }).range(6, 6, 14, 6, { fmt: "thousands" }).range(6, 3, 13, 3, { align: "center" });
    return t.total(14, ["Total", "", "=SUM(C7:C14)", "", "=SUM(E7:E14)", "", "=SUM(G7:G14)"], th);
  },
  comparison(x) {
    const { T, th } = x, opts = T.clients.slice(0, 3), crit = [["Price", 0.3], ["Quality", 0.25], ["Delivery time", 0.2], ["After-sales support", 0.15], ["Reviews", 0.1]];
    const t = sheet("Compare").widths([200, 90, 150, 150, 150, 30, 170, 130]);
    t.title("Comparison table", 4, th, `${T.biz}: score each option from 1 to 10. Weights add up to 100%.`);
    t.head(3, ["What matters", "Weight", ...opts], th);
    crit.forEach(([c, w], i) => t.row(4 + i, [c, w, x.n(4, 10), x.n(4, 10), x.n(4, 10)]).range(4 + i, 2, 4 + i, 4, { align: "center", ...BLUE }));
    t.zebra(4, 8, 4, th).range(4, 1, 8, 1, { fmt: "percent" });
    t.total(9, ["Weighted score", "=SUM(B5:B9)", "=SUMPRODUCT($B$5:$B$9,C5:C9)", "=SUMPRODUCT($B$5:$B$9,D5:D9)", "=SUMPRODUCT($B$5:$B$9,E5:E9)"], th).style(9, 1, { fmt: "percent" }).range(9, 2, 9, 4, { fmt: "fixed2", align: "center" });
    t.put(10, 0, "Best choice", { b: true, size: 15 }).put(10, 2, "=INDEX(C4:E4,MATCH(MAX(C10:E10),C10:E10,0))", { b: true, size: 15, color: th.band });
    t.put(3, 6, "Option", { b: true, fill: th.band, color: "#fff" }).put(3, 7, "Score", { b: true, fill: th.band, color: "#fff" });
    ["C", "D", "E"].forEach((c, i) => t.put(4 + i, 6, `=${c}4`).put(4 + i, 7, `=${c}10`, { fmt: "fixed2" }));
    return t.box(3, 6, 6, 7, th.head).chart({ kind: "bar", range: "G4:H7", title: "Weighted score", at: "G10", w: 400, h: 260 });
  },
  "sales-dashboard"(x) {
    const { T, th } = x, items = T.items.slice(0, 6);
    const t = sheet("Dashboard").widths([170, 110, 110, 110, 120, 110, 110, 110]);
    t.title("Sales dashboard", 7, th, `${T.biz}: this quarter at a glance.`);
    const tiles = [["Revenue (Rs)", "=SUM(E14:E19)", "thousands"], ["Units sold", "=SUM(D14:D19)", "thousands"], ["Best seller", "=INDEX(A14:A19,MATCH(MAX(E14:E19),E14:E19,0))"], ["Revenue per order (Rs)", "=ROUND(SUM(E14:E19)/SUM(C14:C19),0)", "thousands"]];
    tiles.forEach(([lab, f, fmt], i) => {
      const c = i * 2;
      t.range(2, c, 2, c + 1, { fill: th.band, color: "#ffffff", b: true }).range(3, c, 4, c + 1, { fill: th.head }).put(2, c, lab).put(3, c, f, { b: true, size: 19, color: th.ink, valign: "middle", ...(fmt ? { fmt } : {}) }).merge(2, c, 2, c + 1).merge(3, c, 4, c + 1);
    });
    t.height(3, 30).height(4, 22);
    t.head(12, ["Item", "Price (Rs)", "Orders", "Units", "Revenue (Rs)", "Share"], th);
    items.forEach(([n, , price], i) => { const R = 14 + i; t.row(13 + i, [n, price, x.n(5, 60), price > 100000 ? x.n(1, 6) : x.n(20, 400), `=B${R}*D${R}`, `=IF(SUM($E$14:$E$19)=0,0,E${R}/SUM($E$14:$E$19))`]); });
    t.zebra(13, 18, 5, th).range(13, 1, 18, 1, { fmt: "thousands" }).range(13, 4, 18, 4, { fmt: "thousands" }).range(13, 5, 18, 5, { fmt: "percent" });
    t.chart({ kind: "bar", cols: [0, 4], r1: 12, r2: 18, title: "Revenue by item", at: "A6", w: 450, h: 180 });
    return t.chart({ kind: "donut", cols: [0, 3], r1: 12, r2: 18, title: "Units by item", at: "E6", w: 420, h: 180 });
  },
  "monthly-calendar"(x) {
    const { T, th } = x, days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const t = sheet("Calendar").widths(Array(7).fill(132));
    t.title("Monthly calendar", 6, th, `${T.biz}: change the year or month (blue) and the dates move by themselves.`);
    t.put(2, 0, "Year", { b: true }).put(2, 1, 2026, { b: true, ...BLUE }).put(2, 2, "Month", { b: true }).put(2, 3, 12, { b: true, ...BLUE }).put(2, 4, "=DATE(B3,D3,1)", { b: true, size: 16, fmt: "mmmm yyyy", color: th.ink }).merge(2, 4, 2, 6);
    t.head(4, days, th).range(4, 0, 4, 6, { align: "center" });
    for (let w = 0; w < 6; w++) {
      const r = 5 + w * 2;
      for (let d = 0; d < 7; d++) {
        const f = w === 0 && d === 0 ? "=DATE($B$3,$D$3,1)-WEEKDAY(DATE($B$3,$D$3,1),2)+1" : d ? `=${ref(r, d - 1)}+1` : `=${ref(r - 2, 6)}+1`;
        t.put(r, d, f, { fmt: "d", b: true, color: d > 4 ? th.band : "#334155", align: "right", fill: d > 4 ? th.zebra : undefined });
        t.style(r + 1, d, { bd: "b", bc: th.head, valign: "top", wrap: true, size: 11, ...(d > 4 ? { fill: th.zebra } : {}) });
        if (x.rnd() < 0.24) t.put(r + 1, d, T.tasks[(w * 7 + d) % 8], { fill: th.head, color: th.ink });
      }
      t.height(r + 1, 48);
    }
    return t.put(18, 0, "Events this month", { b: true }).put(18, 2, "=COUNTA(A7:G7,A9:G9,A11:G11,A13:G13,A15:G15,A17:G17)", { b: true, color: th.band });
  },
  "gantt-timeline"(x) {
    const { T, th } = x, ppl = x.people(4), W = 12;
    const t = sheet("Timeline").widths([200, 130, 100, 100, ...Array(W).fill(44)]);
    t.title("Project timeline", 3 + W, th, `${T.biz}: each bar shows when a task runs, week by week. Change the dates and the bars move.`);
    t.put(2, 0, "Project starts", { b: true }).put(2, 1, "2026-11-02", { b: true, fmt: "date", ...BLUE });
    t.head(4, ["Task", "Owner", "Start", "End", ...Array.from({ length: W }, (_, i) => `=$B$3+${i * 7}`)], th).range(4, 4, 4, 3 + W, { fmt: "d mmm", size: 10, align: "center" });
    T.tasks.forEach((n, i) => {
      const r = 5 + i, R = r + 1, off = Math.min(70, i * 8 + x.n(0, 6)), dur = x.n(6, 24);
      t.row(r, [n, ppl[i % 4], iso(2026, 11, 2 + off), iso(2026, 11, 2 + off + dur), ...Array.from({ length: W }, (_, k) => { const L5 = colL(4 + k) + "$5"; return `=IF(AND(${L5}+6>=$C${R},${L5}<=$D${R}),"██","")`; })]);
      t.range(r, 4, r, 3 + W, { color: i % 2 ? th.band : P2(th), align: "center", size: 14 }).range(r, 2, r, 3, { fmt: "date" });
    });
    t.zebra(5, 12, 3, th).box(4, 4, 12, 3 + W, "#e5e7eb");
    return t.put(14, 0, "Last task ends", { b: true }).put(14, 2, "=MAX(D6:D13)", { b: true, fmt: "date" }).put(15, 0, "Length (days)", { b: true }).put(15, 2, "=MAX(D6:D13)-MIN(C6:C13)", { b: true });
  },
  gradebook(x) {
    const { T, th } = x, ppl = x.people(10), tasks = ["Homework 1", "Quiz 1", "Project", "Homework 2", "Mid-term", "Final exam"], wts = [0.1, 0.1, 0.2, 0.1, 0.2, 0.3];
    const t = sheet("Grade book").widths([170, 95, 95, 95, 95, 95, 95, 100, 70]);
    t.title("Grade book", 8, th, `${T.biz}: weighted marks out of 100. Weights (row 4) add up to 100%.`);
    t.row(3, ["Weight", ...wts, "=SUM(B4:G4)"], { b: true, color: th.ink, fmt: "percent" });
    t.head(4, ["Student", ...tasks, "Final", "Grade"], th);
    ppl.forEach((n, i) => { const R = 6 + i; t.row(5 + i, [n, ...tasks.map(() => x.n(42, 99)), `=SUMPRODUCT($B$4:$G$4,B${R}:G${R})/100`, `=IFS(H${R}>=0.85,"A",H${R}>=0.7,"B",H${R}>=0.55,"C",H${R}>=0.4,"D",TRUE,"F")`]); });
    t.zebra(5, 14, 8, th).range(5, 7, 15, 7, { fmt: "percent", b: true }).range(5, 8, 14, 8, { align: "center", b: true, color: th.band }).range(5, 1, 14, 6, { align: "center" });
    t.total(15, ["Class average", ..."BCDEFG".split("").map((c) => `=AVERAGE(${c}6:${c}15)`), "=AVERAGE(H6:H15)", '=COUNTIF(I6:I15,"A")&" A grades"'], th).range(15, 1, 15, 6, { fmt: "fixed2", align: "center" });
    return t.chart({ kind: "bar", cols: [0, 7], r1: 4, r2: 14, title: "Final mark", at: "K5" });
  },
  invoice(x) {
    const { T, th } = x, client = T.clients[x.n(0, 5)];
    const t = sheet("Invoice").widths([250, 70, 130, 90, 140]);
    t.title("Invoice", 4, th, T.biz);
    t.put(2, 0, "Bill to", { b: true, color: th.ink }).put(3, 0, client, { b: true, size: 15 }).put(4, 0, CITIES[x.n(0, 9)]);
    t.put(2, 3, "Invoice no.", { b: true }).put(2, 4, `INV-${x.n(1000, 9999)}`).put(3, 3, "Date", { b: true }).put(3, 4, "2026-11-11", { fmt: "date" }).put(4, 3, "Due date", { b: true }).put(4, 4, "=E4+14", { fmt: "date" });
    t.head(6, ["Description", "Qty", "Unit price (Rs)", "Discount", "Amount (Rs)"], th);
    T.items.slice(0, 6).forEach(([n, , price], i) => { const R = 8 + i; t.row(7 + i, [n, price > 100000 ? 1 : x.n(1, 12), price, [0, 0, 0.05, 0, 0.1, 0][i], `=ROUND(B${R}*C${R}*(1-D${R}),0)`]); });
    t.zebra(7, 12, 4, th).range(7, 2, 12, 2, { fmt: "thousands" }).range(7, 3, 12, 3, { fmt: "percent" }).range(7, 4, 16, 4, { fmt: "thousands" }).range(7, 1, 12, 1, { align: "center" });
    t.put(14, 3, "Subtotal", { b: true }).put(14, 4, "=SUM(E8:E13)", { b: true });
    t.put(15, 3, "Sales tax", { b: true }).put(15, 2, 0.17, { fmt: "percent", ...BLUE }).put(15, 4, "=ROUND(E15*C16,0)");
    t.put(16, 3, "Delivery", { b: true }).put(16, 4, 500, BLUE);
    t.range(17, 0, 17, 4, { fill: th.band, color: "#ffffff", b: true, size: 16 }).put(17, 0, "Amount due").put(17, 4, "=E15+E16+E17", { fmt: "thousands" }).merge(17, 0, 17, 3).height(17, 36);
    return t.put(19, 0, "Payment", { b: true, color: th.ink }).put(20, 0, `Bank transfer to ${T.biz}, or cash at the counter.`).put(21, 0, "Please pay by the due date. Thank you!", { i: true, color: "#5b6478" });
  },
  "meal-planner"(x) {
    const { T, th } = x, days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const meals = { Breakfast: ["Paratha and tea", "Omelette and toast", "Oats with fruit", "Halwa puri", "Yogurt and honey", "Egg sandwich", "Pancakes"], Lunch: ["Daal chawal", "Chicken salad", "Vegetable pulao", "Chana chaat", "Lentil soup", "Kebab roll", "Biryani"], Dinner: ["Chicken karahi", "Grilled fish", "Mixed sabzi", "Beef qorma", "Pasta", "Aloo gosht", "Pizza night"], Snack: ["Fruit", "Nuts", "Samosa", "Corn", "Biscuits", "Lassi", "Popcorn"] };
    const t = sheet("Meal plan").widths([110, 160, 160, 160, 120, 30, 170, 60, 100, 110]);
    t.title("Weekly meal planner", 9, th, `${T.biz}: meals for the week and the shopping list.`);
    t.head(3, ["Day", ...Object.keys(meals)], th);
    days.forEach((d, i) => { t.row(4 + i, [d, ...Object.values(meals).map((l) => l[(i + x.n(0, 6)) % 7])]).style(4 + i, 0, { b: true, color: th.ink }).height(4 + i, 34); t.range(4 + i, 1, 4 + i, 4, { wrap: true, valign: "middle", ...(i % 2 ? { fill: th.zebra } : {}) }); });
    t.box(3, 0, 10, 4, th.head);
    t.row(3, [null, null, null, null, null, null, "Shopping list", "Qty", "Price (Rs)", "Cost (Rs)"]).range(3, 6, 3, 9, { b: true, fill: th.band, color: "#ffffff" });
    const shop = [["Chicken 1kg", 2, 780], ["Rice 5kg", 1, 1950], ["Eggs, dozen", 2, 400], ["Milk 1L", 7, 280], ["Vegetables", 1, 1500], ["Fruit", 1, 1200], ["Bread", 3, 170], ["Yogurt 1kg", 2, 320]];
    shop.forEach(([n, q, p], i) => { const R = 5 + i; t.put(4 + i, 6, n).put(4 + i, 7, q, { align: "center", ...BLUE }).put(4 + i, 8, p, { fmt: "thousands" }).put(4 + i, 9, `=H${R}*I${R}`, { fmt: "thousands" }); });
    return t.put(12, 6, "Total", { b: true }).put(12, 9, "=SUM(J5:J12)", { b: true, fmt: "thousands", fill: th.head }).box(3, 6, 12, 9, th.head);
  },
  "content-calendar"(x) {
    const { T, th } = x, ppl = x.people(3), plat = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn"], fmts = ["Photo", "Short video", "Carousel", "Story", "Live"], st = [["Posted", "#dcfce7", "#166534"], ["Scheduled", "#e0f2fe", "#075985"], ["Draft", "#fef3c7", "#92400e"], ["Idea", "#f1f5f9", "#334155"]];
    const t = sheet("Content").widths([100, 110, 220, 110, 110, 140, 80, 30, 120, 70, 90]);
    t.title("Content calendar", 6, th, `${T.biz}: posts planned for the month, who makes them and how they did.`);
    t.head(3, ["Date", "Platform", "Topic", "Format", "Status", "Owner", "Likes"], th);
    for (let i = 0; i < 12; i++) { const R = 5 + i, s = st[i < 5 ? 0 : i < 8 ? 1 : i < 10 ? 2 : 3]; t.row(4 + i, [iso(2026, 11, 2 + i * 2), plat[i % 5], `${T.tasks[i % 8]}: behind the scenes`.replace(/: behind the scenes$/, i % 2 ? ": tips" : ": news"), fmts[(i + 2) % 5], s[0], ppl[i % 3], i < 5 ? x.n(40, 900) : 0]).style(4 + i, 4, { fill: s[1], color: s[2], b: true, align: "center" }); }
    t.zebra(4, 15, 3, th).range(4, 0, 15, 0, { fmt: "date" }).range(4, 6, 15, 6, { fmt: "thousands" });
    t.row(3, [null, null, null, null, null, null, null, null, "Platform", "Posts", "Likes"]).range(3, 8, 3, 10, { b: true, fill: th.band, color: "#ffffff" });
    plat.forEach((p, i) => { const R = 5 + i; t.put(4 + i, 8, p).put(4 + i, 9, `=COUNTIF($B$5:$B$16,I${R})`).put(4 + i, 10, `=SUMIF($B$5:$B$16,I${R},$G$5:$G$16)`, { fmt: "thousands" }); });
    t.put(10, 8, "Posted", { b: true }).put(10, 9, '=COUNTIF(E5:E16,"Posted")', { b: true }).box(3, 8, 10, 10, th.head);
    return t.chart({ kind: "bar", range: "I4:I9", cols: [8, 10], r1: 3, r2: 8, title: "Likes by platform", at: "I13", w: 380, h: 240 });
  },
  "kanban-board"(x) {
    const { T, th } = x, cols = ["To do", "In progress", "Review", "Done"], per = [3, 2, 2, 3], ppl = x.people(4);
    const t = sheet("Board").widths([210, 210, 210, 210]);
    t.title("Task board", 3, th, `${T.biz}: move a task by cutting it (Ctrl+X) and pasting it into another column.`);
    t.head(3, cols, th).range(3, 0, 3, 3, { align: "center" });
    let k = 0;
    cols.forEach((c, j) => { for (let i = 0; i < 6; i++) { const r = 4 + i; t.style(r, j, { bd: "trbl", bc: "#ffffff", fill: "#f8fafc", wrap: true, valign: "top", size: 12 }); if (i < per[j]) { t.put(r, j, `${T.tasks[k % 8]}\n${ppl[k % 4]}`, { fill: j === 3 ? "#dcfce7" : j === 1 ? th.head : "#ffffff", bd: "trbl", bc: th.head }); k++; } } });
    for (let i = 0; i < 6; i++) t.height(4 + i, 50);
    t.total(10, cols.map((_, j) => `=COUNTA(${colL(j)}5:${colL(j)}10)&" tasks"`), th).range(10, 0, 10, 3, { align: "center" });
    return t.put(12, 0, "Done", { b: true }).put(12, 1, "=COUNTA(D5:D10)/COUNTA(A5:D10)", { b: true, fmt: "percent", color: th.band });
  },
  "team-directory"(x) {
    const { T, th } = x, ppl = x.people(10), roles = [["Manager", "Management"], ["Accountant", "Finance"], ["Sales officer", "Sales"], ["Sales officer", "Sales"], ["Designer", "Marketing"], ["Driver", "Operations"], ["Supervisor", "Operations"], ["Assistant", "Management"], ["Clerk", "Finance"], ["Helper", "Operations"]];
    const t = sheet("Team").widths([170, 140, 130, 140, 240, 110, 90]);
    t.title("Team directory", 6, th, `${T.biz}: who is who, how to reach them and how long they have been with us.`);
    t.kpis(2, [["People", "=COUNTA(A7:A16)"], ["Departments", '=SUMPRODUCT((C7:C16<>"")/COUNTIF(C7:C16,C7:C16&""))', "fixed2"], ["Average years", "=AVERAGE(G7:G16)", "fixed2"]], th);
    t.head(5, ["Name", "Role", "Department", "Phone", "Email", "Joined", "Years"], th);
    ppl.forEach((n, i) => { const R = 7 + i; t.row(6 + i, [n, ...roles[i], `0301 ${x.n(1000000, 9999999)}`, `=LOWER(SUBSTITUTE(A${R}," ","."))&"@example.com"`, iso(2014 + x.n(0, 11), x.n(1, 12), x.n(1, 28)), `=ROUND((DATE(2026,11,11)-F${R})/365,1)`]); });
    return t.zebra(6, 15, 6, th).range(6, 5, 15, 5, { fmt: "date" }).range(6, 4, 15, 4, { color: "#1d4ed8" }).range(6, 2, 15, 2, { color: th.ink, b: true });
  },
  "cash-count"(x) {
    const { T, th } = x, notes = [5000, 1000, 500, 100, 50, 20, 10, 5];
    const t = sheet("Cash count").widths([170, 100, 140, 30, 200, 140]);
    t.title("Daily cash count", 5, th, `${T.biz}: count the notes and coins at closing time. Type the counts in blue.`);
    t.head(3, ["Note or coin (Rs)", "Count", "Amount (Rs)"], th);
    notes.forEach((v, i) => { const R = 5 + i; t.row(4 + i, [v, x.n(0, v >= 1000 ? 12 : 40), `=A${R}*B${R}`]).style(4 + i, 1, { ...BLUE, align: "center" }); });
    t.zebra(4, 11, 2, th).range(4, 0, 11, 0, { fmt: "thousands", b: true }).range(4, 2, 12, 2, { fmt: "thousands" });
    t.total(12, ["Counted", "=SUM(B5:B12)", "=SUM(C5:C12)"], th);
    const exp = [["Opening float (Rs)", 5000], ["Cash sales from the register (Rs)", Math.round(x.money(0.6) / 10) * 10], ["Expected in the drawer (Rs)", "=F5+F6"], ["Counted (Rs)", "=C13"], ["Difference (Rs)", "=F8-F7"], ["Result", '=IF(F9=0,"Matches",IF(F9>0,"Extra cash","Short"))']];
    exp.forEach(([l, v], i) => t.put(4 + i, 4, l, { b: true }).put(4 + i, 5, v, { fmt: i < 5 ? "thousands" : undefined, b: true, ...(i < 2 ? BLUE : { fill: th.head, color: th.ink }) }));
    return t.box(4, 4, 9, 5, th.head);
  },
  "sales-pipeline"(x) {
    const { T, th } = x, stages = [["Lead", 0.1], ["Contacted", 0.25], ["Proposal", 0.5], ["Negotiation", 0.75], ["Won", 1]];
    const t = sheet("Pipeline").widths([180, 200, 120, 130, 100, 140, 110, 30, 130, 120]);
    t.title("Sales pipeline", 6, th, `${T.biz}: open deals, their stage and what they are likely to bring in.`);
    t.head(3, ["Client", "Deal", "Stage", "Value (Rs)", "Chance", "Expected (Rs)", "Close by"], th);
    for (let i = 0; i < 10; i++) { const R = 5 + i; t.row(4 + i, [T.clients[i % 6], T.items[i % 8][0], stages[(i * 3 + x.n(0, 4)) % 5][0], x.money(2), `=VLOOKUP(C${R},$I$5:$J$9,2,FALSE)`, `=ROUND(D${R}*E${R},0)`, iso(2026, 11, 20 + i * 4)]); }
    t.zebra(4, 13, 6, th).range(4, 3, 14, 3, { fmt: "thousands" }).range(4, 4, 13, 4, { fmt: "percent" }).range(4, 5, 14, 5, { fmt: "thousands" }).range(4, 6, 13, 6, { fmt: "date" }).range(4, 2, 13, 2, { b: true, color: th.ink });
    t.total(14, ["Total", "", "", "=SUM(D5:D14)", "", "=SUM(F5:F14)"], th);
    t.row(3, [null, null, null, null, null, null, null, null, "Stage", "Chance", "Deals", "Value (Rs)"]).range(3, 8, 3, 11, { b: true, fill: th.band, color: "#ffffff" });
    stages.forEach(([s, p], i) => { const R = 5 + i; t.put(4 + i, 8, s).put(4 + i, 9, p, { fmt: "percent" }).put(4 + i, 10, `=COUNTIF($C$5:$C$14,I${R})`).put(4 + i, 11, `=SUMIF($C$5:$C$14,I${R},$D$5:$D$14)`, { fmt: "thousands" }); });
    t.box(3, 8, 8, 11, th.head);
    return t.chart({ kind: "bar", cols: [8, 11], r1: 3, r2: 8, title: "Deal value by stage", at: "I11", w: 420, h: 250 });
  },
  "shift-roster"(x) {
    const { T, th } = x, ppl = x.people(8), days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], codes = ["M", "E", "N", "Off"], look = { M: { fill: "#fef3c7", color: "#92400e" }, E: { fill: "#e0f2fe", color: "#075985" }, N: { fill: "#312e81", color: "#ffffff" }, Off: { fill: "#f1f5f9", color: "#64748b" } };
    const t = sheet("Roster").widths([170, ...Array(7).fill(64), 90]);
    t.title("Shift roster", 8, th, `${T.biz}: M = morning, E = evening, N = night (8 hours each), Off = day off.`);
    t.head(3, ["Name", ...days, "Hours"], th).range(3, 1, 3, 8, { align: "center" });
    ppl.forEach((n, i) => { const R = 5 + i; const row = days.map((_, d) => (d === (i + 5) % 7 || d === (i + 6) % 7 ? "Off" : codes[(i + d) % 3])); t.row(4 + i, [n, ...row, `=(7-COUNTIF(B${R}:H${R},"Off"))*8`]); row.forEach((v, d) => t.style(4 + i, d + 1, { ...look[v], align: "center", b: true })); });
    t.total(12, ["On duty", ...days.map((_, d) => `=COUNTIF(${colL(d + 1)}5:${colL(d + 1)}12,"<>Off")`), "=SUM(I5:I12)"], th).range(12, 1, 12, 8, { align: "center" });
    return t.put(14, 0, "Night shifts", { b: true }).put(14, 1, '=COUNTIF(B5:H12,"N")', { b: true });
  },
  "travel-itinerary"(x) {
    const { T, th } = x, stops = [["Lahore", "Arrive, check in, food street dinner"], ["Lahore", "Old city walk and museum"], ["Islamabad", "Drive north, lake view lunch"], ["Murree", "Hill walk and mall road"], ["Nathia Gali", "Pipeline trail hike"], ["Islamabad", "Shopping and flight home"]];
    const t = sheet("Itinerary").widths([60, 110, 130, 280, 170, 120]);
    t.title("Travel itinerary", 5, th, `${T.biz}: day-by-day plan with stays and costs.`);
    t.put(2, 0, "Starts", { b: true }).put(2, 1, "2026-12-20", { b: true, fmt: "date", ...BLUE }).put(2, 3, "Budget (Rs)", { b: true, align: "right" }).put(2, 4, Math.round(x.money(4) / 1000) * 1000, { b: true, fmt: "thousands", ...BLUE });
    t.head(4, ["Day", "Date", "Place", "Plan", "Stay", "Cost (Rs)"], th);
    stops.forEach(([p, plan], i) => { const R = 6 + i; t.row(5 + i, [i + 1, `=$B$3+A${R}-1`, p, plan, i === 5 ? "Home" : ["City Inn", "City Inn", "Lake Lodge", "Pine Hotel", "Forest Huts", "Home"][i], Math.round(x.money(0.5) / 500) * 500]).height(5 + i, 32); });
    t.zebra(5, 10, 5, th).range(5, 1, 10, 1, { fmt: "date" }).range(5, 3, 10, 3, { wrap: true, valign: "middle" }).range(5, 0, 10, 0, { align: "center", b: true, color: th.band }).range(5, 5, 11, 5, { fmt: "thousands" });
    t.total(11, ["Total", "", "", "", "", "=SUM(F6:F11)"], th);
    return t.put(12, 4, "Left from budget", { b: true }).put(12, 5, "=E3-F12", { b: true, fmt: "thousands", fill: th.head, color: th.ink });
  },
  "rent-tracker"(x) {
    const { T, th } = x, ppl = x.people(8), months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const t = sheet("Rent").widths([90, 170, 110, ...Array(6).fill(62), 80, 130]);
    t.title("Rent tracker", 10, th, `${T.biz}: rent for each unit, month by month. Type Paid or Due.`);
    t.head(3, ["Unit", "Tenant", "Rent (Rs)", ...months, "Paid", "Still due (Rs)"], th).range(3, 3, 3, 9, { align: "center" });
    ppl.forEach((n, i) => { const R = 5 + i, rent = Math.round(x.money(1.2) / 1000) * 1000; const st = months.map((_, m) => (m < 4 || x.rnd() < 0.6 ? "Paid" : "Due")); t.row(4 + i, [`Unit ${101 + i}`, n, rent, ...st, `=COUNTIF(D${R}:I${R},"Paid")`, `=(6-J${R})*C${R}`]); st.forEach((v, m) => t.style(4 + i, 3 + m, v === "Paid" ? { fill: "#dcfce7", color: "#166534", align: "center" } : { fill: "#fee2e2", color: "#991b1b", align: "center", b: true })); });
    t.range(4, 2, 12, 2, { fmt: "thousands" }).range(4, 10, 12, 10, { fmt: "thousands" }).range(4, 9, 11, 9, { align: "center" });
    return t.total(12, ["Total", "", "=SUM(C5:C12)", ...months.map((_, m) => `=COUNTIF(${colL(3 + m)}5:${colL(3 + m)}12,"Paid")`), "=SUM(J5:J12)", "=SUM(K5:K12)"], th);
  },
  fundraiser(x) {
    const { T, th } = x, ppl = x.people(5), donors = [...T.clients.slice(0, 5).map((c) => [c, "Company"]), ...ppl.map((p) => [p, "Person"])];
    const t = sheet("Fundraiser").widths([210, 110, 130, 110, 30, 150, 130]);
    t.title("Fundraising tracker", 6, th, `${T.biz}: gifts received against our goal.`);
    t.put(2, 0, "Goal (Rs)", { b: true }).put(2, 1, Math.round((T.money * 25) / 10000) * 10000, { b: true, fmt: "thousands", ...BLUE }).put(3, 0, "Raised (Rs)", { b: true }).put(3, 1, "=SUM(C9:C18)", { b: true, fmt: "thousands", size: 16, color: th.band }).put(4, 0, "Progress", { b: true }).put(4, 1, "=MIN(1,B4/B3)", { b: true, fmt: "percent" });
    t.put(4, 2, '=REPT("█",ROUND(B5*20,0))&REPT("░",20-ROUND(B5*20,0))', { color: th.band, size: 14 }).merge(4, 2, 4, 5);
    t.head(7, ["Donor", "Type", "Amount (Rs)", "Date"], th);
    donors.forEach(([d, ty], i) => t.row(8 + i, [d, ty, Math.round(x.money(ty === "Company" ? 3 : 0.8) / 500) * 500, iso(2026, 10, 1 + i * 3)]));
    t.zebra(8, 17, 3, th).range(8, 2, 17, 2, { fmt: "thousands" }).range(8, 3, 17, 3, { fmt: "date" });
    t.row(7, [null, null, null, null, null, "Donor type", "Total (Rs)"]).range(7, 5, 7, 6, { b: true, fill: th.band, color: "#ffffff" });
    ["Company", "Person"].forEach((ty, i) => t.put(8 + i, 5, ty).put(8 + i, 6, `=SUMIF($B$9:$B$18,F${9 + i},$C$9:$C$18)`, { fmt: "thousands" }));
    return t.box(7, 5, 9, 6, th.head).chart({ kind: "pie", range: "F8:G10", title: "Gifts by donor type", at: "F12", w: 360, h: 240 });
  },
  "recipe-cost"(x) {
    const { T, th } = x, ing = [["Chicken", 1.2, "kg", 780], ["Onions", 0.5, "kg", 120], ["Tomatoes", 0.6, "kg", 160], ["Yogurt", 0.25, "kg", 320], ["Cooking oil", 0.15, "litre", 560], ["Spice mix", 1, "pack", 140], ["Ginger and garlic", 0.1, "kg", 600], ["Fresh coriander", 1, "bunch", 40]];
    const t = sheet("Recipe").widths([200, 80, 80, 150, 120]);
    t.title("Recipe cost calculator", 4, th, `${T.biz}: what one batch costs, per serving and the price to charge.`);
    t.put(2, 0, "Recipe", { b: true }).put(2, 1, "Chicken karahi", { b: true, size: 15, color: th.ink }).merge(2, 1, 2, 3);
    t.head(4, ["Ingredient", "Qty", "Unit", "Price per unit (Rs)", "Cost (Rs)"], th);
    ing.forEach(([n, q, u, p], i) => { const R = 6 + i; t.row(5 + i, [n, q, u, p, `=ROUND(B${R}*D${R},0)`]).style(5 + i, 1, BLUE).style(5 + i, 3, BLUE); });
    t.zebra(5, 12, 4, th).range(5, 3, 12, 4, { fmt: "thousands" });
    t.total(13, ["Cost of one batch", "", "", "", "=SUM(E6:E13)"], th).style(13, 4, { fmt: "thousands" });
    const out = [["Servings per batch", 6, null], ["Cost per serving (Rs)", "=ROUND(E14/B16,0)", "thousands"], ["Markup", 1.5, "percent"], ["Price per serving (Rs)", "=ROUND(B17*(1+B18),-1)", "thousands"], ["Profit per batch (Rs)", "=B19*B16-E14", "thousands"]];
    out.forEach(([l, v, f], i) => t.put(15 + i, 0, l, { b: true }).put(15 + i, 1, v, { b: true, ...(f ? { fmt: f } : {}), ...(typeof v === "number" ? BLUE : { fill: th.head, color: th.ink }) }));
    return t.box(15, 0, 19, 1, th.head);
  },
  timesheet(x) {
    const { T, th } = x, days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], who = x.people(1)[0];
    const t = sheet("Timesheet").widths([130, 110, 110, 110, 100, 100, 260]);
    t.title("Weekly timesheet", 6, th, `${T.biz}: hours worked this week. Type start and end times in blue.`);
    t.put(2, 0, "Name", { b: true }).put(2, 1, who, { b: true }).put(2, 3, "Week starting", { b: true }).put(2, 4, "2026-11-09", { b: true, fmt: "date" }).put(3, 0, "Rate per hour (Rs)", { b: true }).put(3, 1, Math.round(x.money(0.02) / 10) * 10, { b: true, fmt: "thousands", ...BLUE });
    t.head(5, ["Day", "Date", "Start", "End", "Break (hours)", "Hours", "Notes"], th);
    days.forEach((d, i) => { const R = 7 + i, s = 8 + x.n(0, 2), e = 16 + x.n(0, 3); t.row(6 + i, [d, `=$E$3+${i}`, `${s}:${i % 2 ? "30" : "00"} AM`, `${e - 12}:00 PM`, i === 5 ? 0 : 1, `=ROUND((D${R}-C${R})*24-E${R},2)`, T.tasks[i % 8]]); });
    t.zebra(6, 11, 6, th).range(6, 1, 11, 1, { fmt: "date" }).range(6, 2, 11, 3, { fmt: "h:mm AM/PM", ...BLUE }).range(6, 5, 12, 5, { fmt: "fixed2", b: true });
    t.total(12, ["Total", "", "", "", "=SUM(E7:E12)", "=SUM(F7:F12)"], th);
    return t.put(14, 4, "Pay (Rs)", { b: true }).put(14, 5, "=ROUND(F13*B4,0)", { b: true, fmt: "thousands", size: 15, fill: th.head, color: th.ink });
  },
  checklist(x) {
    const { T, th } = x, ppl = x.people(3), pr = [["High", "#fee2e2", "#991b1b"], ["Medium", "#fef3c7", "#92400e"], ["Low", "#e0f2fe", "#075985"]];
    const t = sheet("Checklist").widths([50, 260, 100, 110, 150]);
    t.title("To-do checklist", 4, th, `${T.biz}: put ✓ in the first column when a task is done.`);
    t.put(2, 1, "Done", { b: true, align: "right" }).put(2, 2, '=COUNTIF(A6:A15,"✓")&" of "&COUNTA(B6:B15)', { b: true, color: th.band }).put(2, 3, '=COUNTIF(A6:A15,"✓")/COUNTA(B6:B15)', { b: true, fmt: "percent" });
    t.put(3, 1, "Progress", { b: true, align: "right" }).put(3, 2, '=REPT("█",ROUND(D3*10,0))&REPT("░",10-ROUND(D3*10,0))', { color: th.band }).merge(3, 2, 3, 3);
    t.head(4, ["✓", "Task", "Priority", "Due", "Owner"], th);
    const tasks = [...T.tasks, ...T.tasks.slice(0, 2).map((s) => s + " (follow-up)")];
    tasks.forEach((n, i) => { const p = pr[(i + x.n(0, 2)) % 3], done = i < 4 && x.rnd() < 0.8; t.row(5 + i, [done ? "✓" : "", n, p[0], iso(2026, 11, 12 + i * 2), ppl[i % 3]]).style(5 + i, 2, { fill: p[1], color: p[2], b: true, align: "center" }).style(5 + i, 0, { align: "center", b: true, color: "#16a34a", bd: "trbl", bc: "#cbd5e1" }); if (done) t.style(5 + i, 1, { color: "#94a3b8" }); });
    return t.range(5, 3, 14, 3, { fmt: "date" });
  },
  "report-card"(x) {
    const { T, th } = x, who = x.people(1)[0], subj = (T.criteria && T.criteria.length >= 4 ? [...T.criteria, "Islamiat", "Urdu"] : ["English", "Maths", "Science", "Computer", "Islamiat", "Urdu"]);
    const t = sheet("Report card").widths([170, 100, 100, 110, 90, 90, 160]);
    t.title("Report card", 6, th, T.biz);
    t.put(2, 0, "Name", { b: true }).put(2, 1, who, { b: true, size: 15 }).merge(2, 1, 2, 3).put(3, 0, "Class", { b: true }).put(3, 1, "Grade 7, Blue").put(3, 4, "Roll no.", { b: true }).put(3, 5, x.n(1, 40));
    t.head(5, ["Subject", "Term 1", "Term 2", "Final exam", "Total", "Average", "Remarks"], th);
    subj.forEach((s, i) => { const R = 7 + i; t.row(6 + i, [s, x.n(50, 98), x.n(50, 98), x.n(45, 99), `=SUM(B${R}:D${R})`, `=ROUND(E${R}/3,1)`, `=IF(F${R}>=85,"Excellent",IF(F${R}>=70,"Very good",IF(F${R}>=55,"Good","Needs work")))`]); });
    t.zebra(6, 11, 6, th).range(6, 1, 11, 5, { align: "center" });
    t.total(12, ["Overall", "=AVERAGE(B7:B12)", "=AVERAGE(C7:C12)", "=AVERAGE(D7:D12)", "=SUM(E7:E12)", "=ROUND(AVERAGE(F7:F12),1)", '=IFS(F13>=85,"Grade A",F13>=70,"Grade B",F13>=55,"Grade C",TRUE,"Grade D")'], th).range(12, 1, 12, 3, { fmt: "fixed2" });
    t.put(14, 0, "Days present", { b: true }).put(14, 1, x.n(160, 190), BLUE).put(15, 0, "School days", { b: true }).put(15, 1, 192).put(16, 0, "Attendance", { b: true }).put(16, 1, "=B15/B16", { b: true, fmt: "percent" });
    return t.put(18, 0, "Class teacher's note", { b: true, color: th.ink }).put(19, 0, "A hard-working student. Keep reading every day.", { i: true }).merge(19, 0, 19, 6);
  },
  "investment-tracker"(x) {
    const { T, th } = x, h = [["Gold, 10 grams", 2, 210000, 238000], ["Savings certificates", 10, 10000, 10900], ["Mutual fund", 300, 120, 141], ["Cement company shares", 500, 95, 88], ["Bank shares", 400, 160, 182], ["Dollar savings", 300, 278, 281], ["Fixed deposit", 1, 300000, 318000]];
    const t = sheet("Investments").widths([200, 80, 120, 130, 130, 130, 110, 90]);
    t.title("Investment tracker", 7, th, `${T.biz}: what we own, what it cost and what it is worth today. Update the blue prices.`);
    t.kpis(2, [["Worth today (Rs)", "=SUM(F7:F13)", "thousands"], ["Gain (Rs)", "=SUM(G7:G13)", "thousands"], ["Gain %", "=SUM(G7:G13)/SUM(E7:E13)", "percent"]], th);
    t.head(5, ["Holding", "Qty", "Buy price (Rs)", "Price now (Rs)", "Cost (Rs)", "Value (Rs)", "Gain (Rs)", "Gain %"], th);
    h.forEach(([n, q, b, c], i) => { const R = 7 + i, f = 0.9 + x.rnd() * 0.2; t.row(6 + i, [n, q, b, Math.round(c * f), `=B${R}*C${R}`, `=B${R}*D${R}`, `=F${R}-E${R}`, `=IF(E${R}=0,0,G${R}/E${R})`]).style(6 + i, 3, BLUE); });
    t.zebra(6, 12, 7, th).range(6, 2, 13, 6, { fmt: "thousands" }).range(6, 7, 13, 7, { fmt: "percent" });
    t.total(13, ["Total", "", "", "", "=SUM(E7:E13)", "=SUM(F7:F13)", "=SUM(G7:G13)", "=IF(E14=0,0,G14/E14)"], th);
    return t.chart({ kind: "donut", cols: [0, 5], r1: 5, r2: 12, title: "Where the money is", at: "J6", w: 420, h: 300 });
  },
  "goals-tracker"(x) {
    const { T, th } = x, objs = [["Grow sales", [["New customers", 0, 120], ["Repeat orders", 40, 200], ["Average bill (Rs)", 1200, 1800]]], ["Happier customers", [["Survey score (out of 5)", 3.6, 4.5], ["Complaints per month", 30, 10], ["Replies within a day", 0.5, 0.95]]], ["Stronger team", [["Training hours", 0, 60], ["Staff who stay", 0.7, 0.9], ["Ideas tried", 0, 12]]]];
    const t = sheet("Goals").widths([260, 90, 90, 90, 90, 140]);
    t.title("Goals and key results", 5, th, `${T.biz}: this quarter's goals, measured. Type the current numbers in blue.`);
    t.head(3, ["Goal / key result", "Start", "Target", "Now", "Progress", ""], th);
    let r = 4;
    objs.forEach(([o, krs]) => {
      const first = r + 2, last = r + krs.length + 1;
      t.put(r, 0, o, { b: true, size: 14, color: th.ink, fill: th.head }).range(r, 1, r, 5, { fill: th.head }).put(r, 4, `=AVERAGE(E${first}:E${last})`, { b: true, fmt: "percent" }).put(r, 5, `=REPT("█",ROUND(E${r + 1}*10,0))&REPT("░",10-ROUND(E${r + 1}*10,0))`, { color: th.band });
      krs.forEach(([k, s, g], j) => { const rr = r + 1 + j, R = rr + 1, now = Math.round((s + (g - s) * (0.25 + x.rnd() * 0.7)) * 100) / 100; t.row(rr, ["   " + k, s, g, now, `=MIN(1,MAX(0,(D${R}-B${R})/(C${R}-B${R})))`, `=REPT("█",ROUND(E${R}*10,0))&REPT("░",10-ROUND(E${R}*10,0))`]).style(rr, 3, BLUE).style(rr, 4, { fmt: "percent" }).style(rr, 5, { color: th.band }); });
      r += krs.length + 1;
    });
    return t.put(r + 1, 0, "Overall", { b: true }).put(r + 1, 4, "=AVERAGE(E5,E9,E13)", { b: true, fmt: "percent", size: 15, color: th.band });
  },
  "mileage-log"(x) {
    const { T, th } = x;
    const t = sheet("Mileage").widths([110, 220, 110, 110, 100, 100, 110, 120]);
    t.title("Mileage log", 7, th, `${T.biz}: trips, distance, fuel and cost. Each trip starts where the last one ended.`);
    t.put(2, 0, "Fuel price (Rs per litre)", { b: true }).put(2, 2, 268, { b: true, ...BLUE });
    t.head(4, ["Date", "Trip", "Start km", "End km", "Distance", "Fuel (litres)", "Km per litre", "Fuel cost (Rs)"], th);
    for (let i = 0; i < 10; i++) { const R = 6 + i, d = x.n(12, 160); t.row(5 + i, [iso(2026, 11, 1 + i * 2), T.tasks[i % 8], i ? `=D${R - 1}` : 48210, i ? `=C${R}+${d}` : `=C6+${d}`, `=D${R}-C${R}`, Math.round((d / (9 + x.rnd() * 6)) * 10) / 10, `=IF(F${R}=0,0,ROUND(E${R}/F${R},1))`, `=ROUND(F${R}*$C$3,0)`]); }
    t.zebra(5, 14, 7, th).range(5, 0, 14, 0, { fmt: "date" }).range(5, 2, 14, 3, { fmt: "thousands" }).range(5, 7, 15, 7, { fmt: "thousands" });
    return t.total(15, ["Total", "", "", "", "=SUM(E6:E15)", "=SUM(F6:F15)", "=ROUND(E16/F16,1)", "=SUM(H6:H15)"], th).chart({ kind: "line", cols: [0, 6], r1: 4, r2: 14, title: "Km per litre", at: "J5", w: 420, h: 260 });
  },
  "bill-splitter"(x) {
    const { T, th } = x, ppl = x.people(4), exp = [["Dinner", 0], ["Taxi", 1], ["Hotel", 2], ["Tickets", 3], ["Snacks", 0], ["Fuel", 1]];
    const t = sheet("Split").widths([170, 150, 120, 30, 170, 110, 110, 130]);
    t.title("Bill splitter", 7, th, `${T.biz}: who paid what, and who owes whom. Everyone pays an equal share.`);
    t.head(3, ["Expense", "Paid by", "Amount (Rs)"], th);
    exp.forEach(([n, p], i) => t.row(4 + i, [n, ppl[p], Math.round(x.money(0.3) / 10) * 10]).style(4 + i, 2, { fmt: "thousands", ...BLUE }));
    t.zebra(4, 9, 2, th).total(10, ["Total", "", "=SUM(C5:C10)"], th).style(10, 2, { fmt: "thousands" });
    t.row(3, [null, null, null, null, "Person", "Paid (Rs)", "Share (Rs)", "Gets back (Rs)"]).range(3, 4, 3, 7, { b: true, fill: th.band, color: "#ffffff" });
    ppl.forEach((p, i) => { const R = 5 + i; t.put(4 + i, 4, p).put(4 + i, 5, `=SUMIF($B$5:$B$10,E${R},$C$5:$C$10)`, { fmt: "thousands" }).put(4 + i, 6, "=ROUND($C$11/4,0)", { fmt: "thousands" }).put(4 + i, 7, `=F${R}-G${R}`, { fmt: "thousands", b: true }); });
    return t.box(3, 4, 7, 7, th.head).put(9, 4, "Minus means that person still owes money.", { i: true, color: "#5b6478" });
  },
  "daily-planner"(x) {
    const { T, th } = x;
    const t = sheet("Day").widths([90, 260, 30, 230, 60]);
    t.title("Daily planner", 4, th, `${T.biz}: plan the day hour by hour. Tick ✓ the water glasses as you go.`);
    t.put(2, 0, "Date", { b: true }).put(2, 1, "2026-11-11", { b: true, fmt: "date", ...BLUE });
    t.head(3, ["Time", "Plan"], th);
    for (let h = 0; h < 14; h++) { const hr = 7 + h; t.put(4 + h, 0, `${hr > 12 ? hr - 12 : hr}:00 ${hr >= 12 ? "PM" : "AM"}`, { fmt: "h:mm AM/PM", b: true, color: "#475569" }); if (x.rnd() < 0.5) t.put(4 + h, 1, T.tasks[h % 8], { fill: th.head, color: th.ink }); }
    t.box(3, 0, 17, 1, "#e5e7eb");
    t.put(3, 3, "Top 3 priorities", { b: true, fill: th.band, color: "#ffffff" }).put(3, 4, "Done", { b: true, fill: th.band, color: "#ffffff" });
    T.tasks.slice(0, 3).forEach((n, i) => t.put(4 + i, 3, `${i + 1}. ${n}`).put(4 + i, 4, i ? "" : "✓", { align: "center", color: "#16a34a", b: true }));
    t.put(7, 3, "Priorities done", { b: true }).put(7, 4, '=COUNTIF(E5:E7,"✓")', { b: true, align: "center" }).box(3, 3, 7, 4, th.head);
    t.put(9, 3, "Water (8 glasses)", { b: true, fill: th.band, color: "#ffffff" }).put(9, 4, "", { fill: th.band });
    t.put(10, 3, "✓✓✓✓✓", { color: th.band, size: 16, bd: "trbl", bc: th.head }).put(10, 4, '=LEN(SUBSTITUTE(D11," ",""))/8', { fmt: "percent", b: true });
    return t.put(13, 3, "Notes", { b: true, fill: th.band, color: "#ffffff" }).range(14, 3, 17, 3, { fill: th.zebra, bd: "b", bc: th.head });
  },
  "loyalty-card"(x) {
    const { T, th } = x, ppl = x.people(8);
    const t = sheet("Stamps").widths([170, ...Array(10).fill(40), 80, 120]);
    t.title("Loyalty stamp card", 12, th, `${T.biz}: one ★ per visit. Ten stamps earn a free reward.`);
    t.head(3, ["Customer", ...Array.from({ length: 10 }, (_, i) => String(i + 1)), "Stamps", "Reward"], th).range(3, 1, 3, 11, { align: "center" });
    ppl.forEach((p, i) => { const R = 5 + i, n = x.n(2, 10); t.row(4 + i, [p, ...Array.from({ length: 10 }, (_, k) => (k < n ? "★" : "")), `=COUNTIF(B${R}:K${R},"★")`, `=IF(L${R}>=10,"Free reward!",10-L${R}&" to go")`]).range(4 + i, 1, 4 + i, 10, { align: "center", color: th.band, size: 15, bd: "trbl", bc: th.head }).style(4 + i, 11, { align: "center", b: true }); });
    return t.total(12, ["Rewards earned", "", "", "", "", "", "", "", "", "", "", '=COUNTIF(L5:L12,">=10")', ""], th);
  },
  "price-comparison"(x) {
    const { T, th } = x, shops = T.clients.slice(0, 3);
    const t = sheet("Compare prices").widths([190, 130, 130, 130, 120, 170]);
    t.title("Price comparison", 5, th, `${T.biz}: the same items at three suppliers. The cheapest price and supplier show by themselves.`);
    t.head(3, ["Item", ...shops, "Cheapest (Rs)", "Buy from"], th);
    T.items.forEach(([n, , price], i) => { const R = 5 + i; t.row(4 + i, [n, ...[0, 1, 2].map(() => Math.round((price * (0.9 + x.rnd() * 0.25)) / 10) * 10), `=MIN(B${R}:D${R})`, `=INDEX($B$4:$D$4,MATCH(E${R},B${R}:D${R},0))`]).range(4 + i, 1, 4 + i, 4, { fmt: "thousands" }).style(4 + i, 4, { b: true, color: "#047857" }).style(4 + i, 5, { b: true, fill: "#dcfce7", color: "#166534", align: "center" }); });
    t.zebra(4, 11, 3, th);
    t.total(12, ["Basket total", "=SUM(B5:B12)", "=SUM(C5:C12)", "=SUM(D5:D12)", "=SUM(E5:E12)", "=INDEX(B4:D4,MATCH(MIN(B13:D13),B13:D13,0))"], th).range(12, 1, 12, 4, { fmt: "thousands" });
    return t.chart({ kind: "bar", cols: [0, 1, 2, 3], r1: 3, r2: 11, title: "Prices by supplier", at: "H4", w: 460, h: 300 });
  },
  "debt-payoff"(x) {
    const { T, th } = x, debts = [["Credit card", 0.32], ["Personal loan", 0.21], ["Car loan", 0.17], ["Phone instalment", 0], ["Family loan", 0]];
    const t = sheet("Debts").widths([180, 130, 90, 140, 120, 110, 120]);
    t.title("Debt payoff plan", 6, th, `${T.biz}: pay the highest interest first. Type balances and payments in blue.`);
    t.head(3, ["Debt", "Balance (Rs)", "Interest", "Monthly payment (Rs)", "Months to clear", "Pay first", "Interest a month (Rs)"], th);
    debts.forEach(([n, r], i) => { const R = 5 + i, bal = Math.round(x.money(3) / 1000) * 1000; t.row(4 + i, [n, bal, r, Math.round(bal / x.n(6, 30) / 500) * 500 || 500, `=ROUNDUP(B${R}/D${R},0)`, `=RANK(C${R},$C$5:$C$9)`, `=ROUND(B${R}*C${R}/12,0)`]).style(4 + i, 1, BLUE).style(4 + i, 3, BLUE); });
    t.zebra(4, 8, 6, th).range(4, 1, 9, 1, { fmt: "thousands" }).range(4, 2, 8, 2, { fmt: "percent" }).range(4, 3, 9, 3, { fmt: "thousands" }).range(4, 5, 8, 5, { align: "center", b: true, color: th.band }).range(4, 6, 9, 6, { fmt: "thousands" });
    t.total(9, ["Total", "=SUM(B5:B9)", "", "=SUM(D5:D9)", "=MAX(E5:E9)", "", "=SUM(G5:G9)"], th);
    return t.chart({ kind: "bar", cols: [0, 1], r1: 3, r2: 8, title: "What we owe", at: "I4", w: 420, h: 260 });
  },
  "guest-list"(x) {
    const { T, th } = x, ppl = PEOPLE.slice(0, 14), rs = [["Yes", "#dcfce7", "#166534"], ["No", "#fee2e2", "#991b1b"], ["Maybe", "#fef3c7", "#92400e"]];
    const t = sheet("Guests").widths([180, 120, 90, 90, 80, 150]);
    t.title("Guest list", 5, th, `${T.biz}: invitations, replies and seating.`);
    t.kpis(2, [["Invited", "=SUM(C7:C20)"], ["Coming", '=SUMIF(D7:D20,"Yes",C7:C20)'], ["Not replied", '=COUNTIF(D7:D20,"Maybe")']], th);
    t.head(5, ["Guest", "Side", "People", "Reply", "Table", "Phone"], th);
    ppl.forEach((p, i) => { const r = rs[i % 5 === 4 ? 1 : i % 4 === 3 ? 2 : 0]; t.row(6 + i, [p, ["Family", "Friends", "Work"][i % 3], x.n(1, 5), r[0], r[0] === "Yes" ? Math.floor(i / 3) + 1 : "", `0302 ${x.n(1000000, 9999999)}`]).style(6 + i, 3, { fill: r[1], color: r[2], b: true, align: "center" }).range(6 + i, 2, 6 + i, 4, { align: "center" }); });
    t.zebra(6, 19, 2, th).total(20, ["Total", "", "=SUM(C7:C20)", '=COUNTIF(D7:D20,"Yes")&" yes"', "=MAX(E7:E20)&\" tables\""], th);
    t.row(5, [null, null, null, null, null, null, null, "Reply", "Guests"]).range(5, 7, 5, 8, { b: true, fill: th.band, color: "#ffffff" });
    rs.forEach(([v], i) => t.put(6 + i, 7, v).put(6 + i, 8, `=SUMIF($D$7:$D$20,H${7 + i},$C$7:$C$20)`));
    return t.box(5, 7, 8, 8, th.head).chart({ kind: "pie", range: "H6:I9", title: "Replies", at: "H12", w: 340, h: 240 });
  },
  "class-timetable"(x) {
    const { T, th } = x, days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], subj = [["Maths", "#dbeafe"], ["English", "#fce7f3"], ["Science", "#dcfce7"], ["Urdu", "#fef3c7"], ["Computer", "#ede9fe"], ["Islamiat", "#ccfbf1"], ["Art", "#ffedd5"], ["Sports", "#e2e8f0"]];
    const t = sheet("Timetable").widths([110, 120, 120, 120, 120, 120, 30, 120, 90]);
    t.title("Class timetable", 5, th, `${T.biz}: periods for the week. Lessons per subject count by themselves.`);
    t.head(3, ["Period", ...days], th).range(3, 1, 3, 5, { align: "center" });
    for (let p = 0; p < 7; p++) {
      const r = 4 + p;
      if (p === 3) { t.put(r, 0, "Break", { b: true, color: "#64748b" }).range(r, 1, r, 5, { fill: "#f1f5f9" }).put(r, 1, "Lunch break", { i: true, color: "#64748b" }).merge(r, 1, r, 5); continue; }
      t.put(r, 0, `${8 + p}:00 AM`.replace(/^(1[2-9]|1[0-1]):00 AM/, (m, h) => (+h >= 12 ? `${h - 12 || 12}:00 PM` : m)), { b: true, color: "#475569", fmt: "h:mm AM/PM" });
      days.forEach((_, d) => { const s = subj[(p * 3 + d * 2 + x.n(0, 7)) % 8]; t.put(r, d + 1, s[0], { fill: s[1], align: "center", b: true, color: "#1e293b", valign: "middle" }); });
      t.height(r, 34);
    }
    t.row(3, [null, null, null, null, null, null, null, "Subject", "Lessons"]).range(3, 7, 3, 8, { b: true, fill: th.band, color: "#ffffff" });
    subj.forEach(([s, f], i) => t.put(4 + i, 7, s, { fill: f }).put(4 + i, 8, `=COUNTIF($B$5:$F$11,H${5 + i})`, { align: "center" }));
    return t.box(3, 7, 11, 8, th.head).box(3, 0, 10, 5, "#ffffff");
  },
  "kpi-scorecard"(x) {
    const { T, th } = x, kpis = [["Revenue (Rs)", T.money * 18, "thousands", 1], ["New customers", 120, null, 1], ["Repeat customers", 0.42, "percent", 1], ["Average order (Rs)", T.money / 20, "thousands", 1], ["Complaints", 24, null, -1], ["Delivery on time", 0.88, "percent", 1], ["Staff turnover", 0.12, "percent", -1], ["Website visits", 18000, "thousands", 1]];
    const t = sheet("Scorecard").widths([190, 110, 110, 110, 110, 70, 110]);
    t.title("Quarterly KPI scorecard", 6, th, `${T.biz}: each measure by quarter, with the trend and the target.`);
    t.head(3, ["Measure", "Q1", "Q2", "Q3", "Q4", "Trend", "Target"], th);
    kpis.forEach(([n, base, fmt, good], i) => {
      const R = 5 + i, q = [0, 1, 2, 3].map((k) => { const v = base * (0.85 + k * 0.06 * good + x.rnd() * 0.1); return fmt === "percent" ? Math.round(v * 100) / 100 : Math.round(v); });
      t.row(4 + i, [n, ...q, `=IF(E${R}>D${R},"▲",IF(E${R}<D${R},"▼","■"))`, fmt === "percent" ? Math.round(base * (good > 0 ? 1.1 : 0.8) * 100) / 100 : Math.round(base * (good > 0 ? 1.1 : 0.8))]);
      t.range(4 + i, 1, 4 + i, 4, fmt ? { fmt } : {}).style(4 + i, 6, { ...(fmt ? { fmt } : {}), b: true, color: th.ink }).style(4 + i, 5, { align: "center", b: true, size: 15, color: good > 0 ? "#16a34a" : "#dc2626" });
    });
    t.zebra(4, 11, 6, th);
    return t.put(13, 0, "Measures going up", { b: true }).put(13, 1, '=COUNTIF(F5:F12,"▲")', { b: true, color: "#16a34a" }).put(14, 0, "Measures going down", { b: true }).put(14, 1, '=COUNTIF(F5:F12,"▼")', { b: true, color: "#dc2626" });
  },
  "candidate-tracker"(x) {
    const { T, th } = x, ppl = PEOPLE.slice(10, 20), stages = [["Applied", PC.grey], ["Screening", PC.blue], ["Interview", PC.violet], ["Offer", PC.amber], ["Hired", PC.green], ["Rejected", PC.red]];
    const roles = ["Sales officer", "Accountant", "Designer", "Driver", "Receptionist"];
    const t = sheet("Candidates").widths([170, 140, 110, 120, 70, 150, 110, 30, 120, 80]);
    t.title("Candidate tracker", 6, th, `${T.biz}: everyone who applied, where they are and what happens next.`);
    t.head(3, ["Candidate", "Role", "Applied on", "Stage", "Score", "Interviewer", "Next step"], th);
    ppl.forEach((p, i) => { const st = stages[[0, 1, 2, 2, 3, 4, 5, 1, 2, 0][i]][0]; t.row(4 + i, [p, roles[i % 5], iso(2026, 10, 3 + i * 2), st, x.n(2, 5), PEOPLE[(i + 3) % 6], st === "Hired" || st === "Rejected" ? "" : iso(2026, 11, 14 + i)]); });
    t.zebra(4, 13, 6, th).range(4, 2, 13, 2, { fmt: "date" }).range(4, 6, 13, 6, { fmt: "date" }).range(4, 4, 13, 4, { align: "center", b: true });
    t.dd("D5:D14", stages).cf("E5:E14", "ge", 4, CG);
    t.row(3, [null, null, null, null, null, null, null, null, "Stage", "People"]).range(3, 8, 3, 9, { b: true, fill: th.band, color: "#fff" });
    stages.forEach(([s], i) => t.put(4 + i, 8, s).put(4 + i, 9, `=COUNTIF($D$5:$D$14,I${5 + i})`, { align: "center" }));
    return t.box(3, 8, 9, 9, th.head).chart({ kind: "hbar", cols: [8, 9], r1: 3, r2: 9, title: "Candidates by stage", at: "I12", w: 380, h: 260 });
  },
  "purchase-order"(x) {
    const { T, th } = x, sup = T.clients[x.n(0, 5)];
    const t = sheet("Purchase order").widths([90, 240, 70, 130, 140]);
    t.title("Purchase order", 4, th, T.biz);
    t.put(2, 0, "Supplier", { b: true, color: th.ink }).put(3, 0, sup, { b: true }).merge(3, 0, 3, 1).put(4, 0, CITIES[x.n(0, 9)]);
    t.put(2, 3, "PO number", { b: true }).put(2, 4, `PO-${x.n(1000, 9999)}`).put(3, 3, "Date", { b: true }).put(3, 4, "2026-11-11", { fmt: "date" }).put(4, 3, "Deliver by", { b: true }).put(4, 4, "=E4+10", { fmt: "date" });
    t.put(5, 0, "Ship to", { b: true, color: th.ink }).put(5, 1, `${T.biz}, ${CITIES[x.n(0, 9)]}`);
    t.head(7, ["Code", "Description", "Qty", "Unit price (Rs)", "Amount (Rs)"], th);
    T.items.slice(0, 7).forEach(([n, cost], i) => { const R = 9 + i; t.row(8 + i, [`${T.id.slice(0, 2).toUpperCase()}-${301 + i}`, n, x.n(2, 40), cost, `=C${R}*D${R}`]); });
    t.zebra(8, 14, 4, th).range(8, 3, 18, 4, { fmt: "thousands" }).range(8, 2, 14, 2, { align: "center", ...BLUE });
    t.put(15, 3, "Subtotal", { b: true }).put(15, 4, "=SUM(E9:E15)", { b: true }).put(16, 3, "Sales tax 17%", { b: true }).put(16, 4, "=ROUND(E16*0.17,0)").put(17, 3, "Shipping", { b: true }).put(17, 4, 1500, BLUE);
    t.range(18, 0, 18, 4, { fill: th.band, color: "#fff", b: true, size: 15 }).put(18, 0, "Order total").put(18, 4, "=E16+E17+E18", { fmt: "thousands" }).merge(18, 0, 18, 3).height(18, 34);
    return t.put(20, 0, "Approved by", { b: true }).put(20, 1, x.people(1)[0]).put(21, 0, "Terms", { b: true }).put(21, 1, "Payment within 30 days of delivery. Please quote the PO number on your bill.", { i: true, color: "#5b6478" });
  },
  "pay-stub"(x) {
    const { T, th } = x, who = x.people(1)[0], basic = Math.round(x.n(45, 150) * 1000);
    const t = sheet("Pay slip").widths([220, 140, 30, 220, 140]);
    t.title("Pay slip", 4, th, `${T.biz}: November 2026`);
    t.put(2, 0, "Employee", { b: true }).put(2, 1, who, { b: true }).put(2, 3, "Employee no.", { b: true }).put(2, 4, `E-${x.n(100, 999)}`);
    t.put(3, 0, "Designation", { b: true }).put(3, 1, ["Manager", "Sales officer", "Accountant", "Supervisor"][x.n(0, 3)]).put(3, 3, "Pay date", { b: true }).put(3, 4, "2026-11-30", { fmt: "date" });
    t.head(5, ["Earnings", "Amount (Rs)", "", "Deductions", "Amount (Rs)"], th);
    const earn = [["Basic salary", basic], ["House rent allowance", Math.round(basic * 0.4)], ["Transport allowance", 6000], ["Overtime (hours × rate)", `=8*${Math.round(basic / 160)}`]];
    const ded = [["Income tax", "=ROUND(B11*0.05,0)"], ["Provident fund", `=ROUND(B7*0.06,0)`], ["Loan instalment", 5000], ["Late days", 0]];
    earn.forEach(([l, v], i) => t.put(6 + i, 0, l).put(6 + i, 1, v, { fmt: "thousands" }));
    ded.forEach(([l, v], i) => t.put(6 + i, 3, l).put(6 + i, 4, v, { fmt: "thousands" }));
    t.zebra(6, 9, 4, th);
    t.total(10, ["Gross pay", "=SUM(B7:B10)", "", "Total deductions", "=SUM(E7:E10)"], th).style(10, 1, { fmt: "thousands" }).style(10, 4, { fmt: "thousands" });
    t.range(12, 0, 12, 4, { fill: th.band, color: "#fff", b: true, size: 17 }).put(12, 0, "Net pay").put(12, 4, "=B11-E11", { fmt: "pkr" }).merge(12, 0, 12, 3).height(12, 38);
    return t.put(14, 0, "Paid by bank transfer. Keep this slip for your records.", { i: true, color: "#5b6478" });
  },
  "shoot-schedule"(x) {
    const { T, th } = x, crew = x.people(4), status = [["Ready", PC.green], ["Setting up", PC.amber], ["Waiting", PC.grey], ["Done", PC.blue]];
    const shots = ["Opening wide shot", "Team at work", "Product close-up", "Customer interview", "Behind the counter", "Street view", "Logo reveal", "Closing group shot"];
    const t = sheet("Call sheet").widths([90, 210, 160, 150, 160, 110]);
    t.title("Shoot schedule", 5, th, `${T.biz}: call sheet for the photo and video shoot.`);
    t.put(2, 0, "Date", { b: true }).put(2, 1, "2026-11-20", { b: true, fmt: "date" }).put(2, 2, "Call time", { b: true, align: "right" }).put(2, 3, "7:30 AM", { b: true, fmt: "h:mm AM/PM" }).put(3, 0, "Location", { b: true }).put(3, 1, `${T.biz}, ${CITIES[x.n(0, 9)]}`).merge(3, 1, 3, 3);
    t.head(5, ["Time", "Shot", "Place", "Crew", "Props", "Status"], th);
    shots.forEach((s, i) => { const h = 8 + Math.floor(i / 2), mm = i % 2 ? "30" : "00"; t.row(6 + i, [`${h > 12 ? h - 12 : h}:${mm} ${h >= 12 ? "PM" : "AM"}`, s, ["Front door", "Main hall", "Studio table", "Office", "Counter", "Street", "Studio", "Main hall"][i], crew[i % 4], ["Tripod", "Reflector", "Turntable", "Mic", "Apron", "Drone", "Screen", "Banner"][i], status[i < 2 ? 3 : i < 4 ? 0 : i < 6 ? 1 : 2][0]]).height(6 + i, 30); });
    t.zebra(6, 13, 5, th).range(6, 0, 13, 0, { fmt: "h:mm AM/PM", b: true, color: th.ink });
    t.dd("F7:F14", status);
    return t.put(15, 0, "Shots done", { b: true }).put(15, 1, '=COUNTIF(F7:F14,"Done")&" of "&COUNTA(B7:B14)', { b: true, color: th.band }).put(16, 0, "Hours on set", { b: true }).put(16, 1, "=ROUND((A14-A7)*24+0.5,1)", { b: true });
  },
  "campaign-tracker"(x) {
    const { T, th } = x, st = [["Live", PC.green], ["Planned", PC.blue], ["Paused", PC.amber], ["Done", PC.grey]], ch = ["Social media", "Search ads", "Email", "Radio", "Events", "Print"];
    const camps = ["Winter sale", "New branch opening", "Refer a friend", "Weekend deals", "Back to school", "Year-end clearance", "Loyalty week", "Festival offers"];
    const t = sheet("Campaigns").widths([180, 120, 100, 100, 110, 110, 70, 120, 90]);
    t.title("Campaign tracker", 8, th, `${T.biz}: every campaign, its spend and the leads it brought in.`);
    t.head(3, ["Campaign", "Channel", "Start", "End", "Budget (Rs)", "Spent (Rs)", "Leads", "Cost per lead (Rs)", "Status"], th);
    camps.forEach((c, i) => { const R = 5 + i, b = x.money(1.2); t.row(4 + i, [c, ch[i % 6], iso(2026, 9 + Math.floor(i / 3), 1 + (i % 3) * 9), iso(2026, 9 + Math.floor(i / 3), 20 + (i % 3) * 3), b, Math.round(b * (0.4 + x.rnd() * 0.7) / 500) * 500, x.n(20, 400), `=IF(G${R}=0,0,ROUND(F${R}/G${R},0))`, st[i % 4][0]]); });
    t.zebra(4, 11, 8, th).range(4, 2, 11, 3, { fmt: "date" }).range(4, 4, 12, 5, { fmt: "thousands" }).range(4, 7, 12, 7, { fmt: "thousands" }).range(4, 6, 12, 6, { align: "center" });
    t.dd("I5:I12", st).cf("H5:H12", "gt", Math.round(T.money / 40), CR).cf("H5:H12", "le", Math.round(T.money / 120), CG);
    t.total(12, ["Total", "", "", "", "=SUM(E5:E12)", "=SUM(F5:F12)", "=SUM(G5:G12)", "=IF(G13=0,0,ROUND(F13/G13,0))"], th);
    return t.chart({ kind: "bar", cols: [0, 6], r1: 3, r2: 11, title: "Leads by campaign", at: "K4", w: 440 });
  },
  "assignment-tracker"(x) {
    const { T, th } = x, st = [["Not started", PC.grey], ["In progress", PC.amber], ["Submitted", PC.blue], ["Graded", PC.green]], subj = ["Maths", "English", "Science", "Computer", "Urdu", "History"];
    const tasks = ["Chapter 5 exercises", "Essay: my city", "Lab report: plants", "Poster on recycling", "Grammar worksheet", "Coding project", "Book review", "Map project", "Quiz revision"];
    const t = sheet("Assignments").widths([110, 210, 110, 90, 130, 80]);
    t.title("Assignment tracker", 5, th, `${T.biz}: what is due, what is done and the marks.`);
    t.put(2, 0, "Today", { b: true }).put(2, 1, "2026-11-11", { b: true, fmt: "date", ...BLUE });
    t.head(4, ["Subject", "Assignment", "Due", "Days left", "Status", "Mark"], th);
    tasks.forEach((n, i) => { const R = 6 + i, s = st[i < 3 ? 3 : i < 5 ? 2 : i < 7 ? 1 : 0][0]; t.row(5 + i, [subj[i % 6], n, iso(2026, 11, 2 + i * 3), `=C${R}-$B$3`, s, s === "Graded" ? x.n(60, 98) : ""]); });
    t.zebra(5, 13, 5, th).range(5, 2, 13, 2, { fmt: "date" }).range(5, 3, 13, 3, { align: "center", b: true }).range(5, 5, 13, 5, { align: "center" });
    t.dd("E6:E14", st).cf("D6:D14", "lt", 3, CR).cf("D6:D14", "ge", 7, CG);
    return t.put(15, 0, "Still to do", { b: true }).put(15, 1, '=COUNTIF(E6:E14,"Not started")+COUNTIF(E6:E14,"In progress")', { b: true, color: "#c2410c" }).put(16, 0, "Average mark", { b: true }).put(16, 1, "=AVERAGE(F6:F14)", { b: true, fmt: "fixed2" });
  },
  "bug-tracker"(x) {
    const { T, th } = x, sev = [["Critical", PC.red], ["High", PC.amber], ["Medium", PC.blue], ["Low", PC.grey]], st = [["Open", PC.red], ["In progress", PC.amber], ["Fixed", PC.green], ["Closed", PC.grey]], ppl = x.people(3);
    const bugs = ["Login button does nothing", "Totals off by one", "Slow report page", "Wrong date on receipts", "Search misses names", "Logo blurry on phones", "Typo on price list", "Export file empty", "Dark text on dark band", "Reminder emails twice"];
    const t = sheet("Issues").widths([70, 240, 100, 110, 130, 100, 80, 30, 110, 70]);
    t.title("Issue tracker", 6, th, `${T.biz}: problems reported, how bad they are and who is fixing them.`);
    t.put(2, 0, "Today", { b: true }).put(2, 1, "2026-11-11", { fmt: "date", b: true });
    t.head(4, ["ID", "Issue", "Severity", "Status", "Owner", "Reported", "Days open"], th);
    bugs.forEach((b, i) => { const R = 6 + i; t.row(5 + i, [`#${101 + i}`, b, sev[[0, 1, 1, 2, 2, 3, 3, 1, 2, 3][i]][0], st[[0, 1, 0, 2, 1, 3, 2, 0, 1, 2][i]][0], ppl[i % 3], iso(2026, 10, 10 + i * 3), `=IF(OR(D${R}="Fixed",D${R}="Closed"),0,$B$3-F${R})`]); });
    t.zebra(5, 14, 6, th).range(5, 5, 14, 5, { fmt: "date" }).range(5, 6, 14, 6, { align: "center" }).range(5, 0, 14, 0, { color: "#64748b" });
    t.dd("C6:C15", sev).dd("D6:D15", st).cf("G6:G15", "gt", 14, CR);
    t.row(4, [null, null, null, null, null, null, null, null, "Severity", "Open"]).range(4, 8, 4, 9, { b: true, fill: th.band, color: "#fff" });
    sev.forEach(([s], i) => t.put(5 + i, 8, s).put(5 + i, 9, `=COUNTIFS($C$6:$C$15,I${6 + i},$D$6:$D$15,"<>Closed",$D$6:$D$15,"<>Fixed")`, { align: "center" }));
    return t.box(4, 8, 8, 9, th.head).chart({ kind: "bar", cols: [8, 9], r1: 4, r2: 8, title: "Open issues by severity", at: "I11", w: 360, h: 240 });
  },
  "reading-log"(x) {
    const { T, th } = x, books = [["The Silent Garden", "Hina Rauf", 280], ["Numbers Made Easy", "Kamal Shah", 190], ["River of Lights", "Sara Malik", 360], ["Small Steps, Big Wins", "Omar Javed", 220], ["Stars over Hunza", "Ayesha Noor", 310], ["The Baker's Notebook", "Iqbal Ahmed", 150], ["Code for Beginners", "Zara Khan", 240]];
    const t = sheet("Reading log").widths([200, 140, 70, 110, 110, 70, 90, 110]);
    t.title("Reading log", 7, th, `${T.biz}: books read this year, how long they took and how much we liked them.`);
    t.head(3, ["Book", "Author", "Pages", "Started", "Finished", "Days", "Pages a day", "Rating"], th);
    books.forEach(([b, a, p], i) => { const R = 5 + i, s = 2 + i * 14; t.row(4 + i, [b, a, p, iso(2026, 3, s), iso(2026, 3, s + x.n(5, 16)), `=E${R}-D${R}`, `=ROUND(C${R}/F${R},1)`, `=REPT("★",${x.n(3, 5)})`]); });
    t.zebra(4, 10, 7, th).range(4, 3, 10, 4, { fmt: "date" }).range(4, 7, 10, 7, { color: "#f59e0b", size: 14 }).range(4, 2, 10, 2, { align: "center" }).range(4, 5, 10, 6, { align: "center" });
    return t.total(11, ["Total", `=COUNTA(A5:A11)&" books"`, "=SUM(C5:C11)", "", "", "=SUM(F5:F11)", "=ROUND(C12/F12,1)", ""], th).range(11, 2, 11, 6, { align: "center" });
  },
  "workout-log"(x) {
    const { T, th } = x, ex = [["Squats", 60], ["Bench press", 45], ["Deadlift", 80], ["Rows", 40]];
    const t = sheet("Workouts").widths([110, 150, 60, 60, 100, 110, 30, 150, 120]);
    t.title("Workout log", 5, th, `${T.biz}: sets, reps and weight; volume adds up by itself.`);
    t.head(3, ["Date", "Exercise", "Sets", "Reps", "Weight (kg)", "Volume (kg)"], th);
    for (let i = 0; i < 12; i++) { const R = 5 + i, [n, base] = ex[i % 4]; t.row(4 + i, [iso(2026, 11, 2 + Math.floor(i / 4) * 2), n, x.n(3, 5), x.n(6, 12), base + Math.floor(i / 4) * 2.5, `=C${R}*D${R}*E${R}`]); }
    t.zebra(4, 15, 5, th).range(4, 0, 15, 0, { fmt: "date" }).range(4, 5, 16, 5, { fmt: "thousands" }).range(4, 2, 15, 4, { align: "center" });
    t.total(16, ["Total", "", "=SUM(C5:C16)", "", "", "=SUM(F5:F16)"], th);
    t.put(3, 7, "Exercise", { b: true, fill: th.band, color: "#fff" }).put(3, 8, "Volume (kg)", { b: true, fill: th.band, color: "#fff" });
    ex.forEach(([n], i) => t.put(4 + i, 7, n).put(4 + i, 8, `=SUMIF($B$5:$B$16,H${5 + i},$F$5:$F$16)`, { fmt: "thousands" }));
    return t.box(3, 7, 7, 8, th.head).chart({ kind: "bar", range: "H4:I8", title: "Volume by exercise", at: "H11", w: 380, h: 240 });
  },
  "seating-chart"(x) {
    const { T, th } = x, names = [...PEOPLE].sort(() => x.rnd() - 0.5);
    const t = sheet("Seating").widths(Array(8).fill(130));
    t.title("Seating chart", 7, th, `${T.biz}: who sits at which table. Move a name by cutting and pasting it.`);
    for (let tb = 0; tb < 8; tb++) {
      const c = (tb % 4) * 2, r = 3 + Math.floor(tb / 4) * 9;
      t.range(r, c, r, c + 1, { fill: th.band, color: "#fff", b: true, align: "center" }).put(r, c, `Table ${tb + 1}`).merge(r, c, r, c + 1);
      for (let s = 0; s < 6; s++) { const rr = r + 1 + Math.floor(s / 2), cc = c + (s % 2); const n = names[tb * 3 + s]; t.put(rr, cc, s < 5 || tb % 3 ? n || "" : "", { fill: th.zebra, align: "center", bd: "trbl", bc: "#ffffff" }); }
      t.put(r + 4, c, "Seats taken", { i: true, color: "#64748b" }).put(r + 4, c + 1, `=COUNTA(${colL(c)}${r + 2}:${colL(c + 1)}${r + 4})`, { b: true, align: "center", color: th.ink });
    }
    return t.put(21, 0, "Guests seated", { b: true }).put(21, 2, "=SUM(B8,D8,F8,H8,B17,D17,F17,H17)", { b: true, color: th.band });
  },
  "swot-analysis"(x) {
    const { T, th } = x;
    const t = sheet("SWOT").widths([300, 300]);
    t.title("SWOT analysis", 1, th, `${T.biz}: what we do well, what to fix, chances ahead and risks to watch.`);
    const boxes = [["Strengths", "#dcfce7", "#166534", [`Loyal ${T.label.toLowerCase()} customers`, "Good location", "Friendly team", "Fair prices"]], ["Weaknesses", "#fee2e2", "#991b1b", ["Small budget for ads", "Slow on social media", "Few online reviews"]], ["Opportunities", "#e0f2fe", "#075985", ["New housing nearby", "Online orders", "Partnerships with schools", "Festival season"]], ["Threats", "#fef3c7", "#92400e", ["New competitor opening", "Rising rent and bills", "Price-sensitive buyers"]]];
    boxes.forEach(([h, bg, fg, items], i) => {
      const r = 3 + Math.floor(i / 2) * 7, c = i % 2;
      t.put(r, c, h, { b: true, size: 16, fill: fg, color: "#fff" }).height(r, 34);
      items.forEach((it, j) => t.put(r + 1 + j, c, it, { fill: bg, color: fg, list: true }));
      for (let j = items.length; j < 5; j++) t.style(r + 1 + j, c, { fill: bg });
      t.put(r + 6, c, `=COUNTA(${colL(c)}${r + 2}:${colL(c)}${r + 6})`, { i: true, color: "#64748b", align: "right", fmt: '0" points"' });
    });
    return t.box(3, 0, 16, 1, "#ffffff");
  },
  "risk-register"(x) {
    const { T, th } = x, ppl = x.people(3);
    const risks = [["Key supplier closes", 2, 5], ["Power cuts in summer", 4, 3], ["Staff leave in peak season", 3, 3], ["Prices of goods rise", 4, 4], ["Website goes down", 2, 3], ["Theft or damage", 1, 4], ["Bad online review spreads", 3, 2], ["Late customer payments", 3, 4]];
    const t = sheet("Risks").widths([230, 100, 90, 80, 100, 130, 220]);
    t.title("Risk register", 6, th, `${T.biz}: likelihood and impact from 1 to 5; score = likelihood × impact.`);
    t.head(3, ["Risk", "Likelihood", "Impact", "Score", "Level", "Owner", "What we will do"], th);
    const acts = ["Keep a second supplier", "Buy a backup generator", "Plan leave early", "Agree prices for 6 months", "Use a reliable host", "Install CCTV", "Reply to every review", "Send reminders on time"];
    risks.forEach(([r, l, im], i) => { const R = 5 + i; t.row(4 + i, [r, l, im, `=B${R}*C${R}`, `=IF(D${R}>=15,"High",IF(D${R}>=8,"Medium","Low"))`, ppl[i % 3], acts[i]]).range(4 + i, 1, 4 + i, 4, { align: "center" }).style(4 + i, 1, BLUE).style(4 + i, 2, BLUE); });
    t.zebra(4, 11, 6, th).cf("D5:D12", "ge", 15, CR).cf("D5:D12", "between", 8, CA, 14).cf("D5:D12", "lt", 8, CG);
    return t.put(13, 0, "High risks", { b: true }).put(13, 1, '=COUNTIF(E5:E12,"High")', { b: true, color: "#dc2626" }).put(14, 0, "Average score", { b: true }).put(14, 1, "=AVERAGE(D5:D12)", { b: true, fmt: "fixed2" });
  },
  "subscription-tracker"(x) {
    const { T, th } = x, subs = [["Accounting app", "Software", "Monthly", 2500, "https://example.com/accounts"], ["Website hosting", "Website", "Yearly", 18000, "https://example.com/hosting"], ["Design tools", "Software", "Monthly", 1800, "https://example.com/design"], ["Phone and internet", "Utilities", "Monthly", 4500, ""], ["Cloud storage", "Software", "Yearly", 9000, "https://example.com/cloud"], ["Music for the shop", "Media", "Monthly", 800, ""], ["Security cameras", "Utilities", "Yearly", 12000, ""], ["Email marketing", "Marketing", "Monthly", 3200, "https://example.com/email"]];
    const t = sheet("Subscriptions").widths([190, 110, 100, 110, 130, 120, 110, 170]);
    t.title("Subscription tracker", 7, th, `${T.biz}: what we pay for every month and year, and when it renews.`);
    t.kpis(2, [["A month (Rs)", "=SUM(E7:E14)", "thousands"], ["A year (Rs)", "=SUM(F7:F14)", "thousands"], ["Renewing in 30 days", '=COUNTIFS(G7:G14,">="&DATE(2026,11,11),G7:G14,"<="&DATE(2026,12,11))']], th);
    t.head(5, ["Service", "Category", "Billing", "Price (Rs)", "A month (Rs)", "A year (Rs)", "Renews on", "Website"], th);
    subs.forEach(([n, c, b, p, url], i) => { const R = 7 + i; t.row(6 + i, [n, c, b, p, `=IF(C${R}="Yearly",ROUND(D${R}/12,0),D${R})`, `=E${R}*12`, iso(2026, 11, 5 + i * 9)]); if (url) t.link(6 + i, 7, url, url.replace(/^https:\/\//, "")); });
    t.zebra(6, 13, 7, th).range(6, 3, 14, 5, { fmt: "thousands" }).range(6, 6, 13, 6, { fmt: "date" });
    t.dd("C7:C14", [["Monthly", PC.blue], ["Yearly", PC.violet]]);
    t.total(14, ["Total", "", "", "", "=SUM(E7:E14)", "=SUM(F7:F14)"], th);
    return t.chart({ kind: "donut", cols: [0, 4], r1: 5, r2: 13, title: "Monthly cost by service", at: "J6", w: 420, h: 300 });
  },
  "vendor-list"(x) {
    const { T, th } = x, cats = ["Supplies", "Repairs", "Printing", "Transport", "Cleaning", "IT"];
    const t = sheet("Vendors").widths([190, 150, 130, 230, 110, 90, 110]);
    t.title("Vendor list", 6, th, `${T.biz}: who we buy from, how to reach them and how good they are.`);
    t.head(3, ["Vendor", "Contact", "Phone", "Email", "Category", "Rating", "Last order"], th);
    [...T.clients, "Swift Couriers", "Neat Clean Co."].forEach((v, i) => { const R = 5 + i, contact = PEOPLE[(i * 3 + 2) % PEOPLE.length]; t.row(4 + i, [v, contact, `042 ${x.n(3000000, 3999999)}`, `=LOWER(SUBSTITUTE(B${R}," ","."))&"@example.com"`, cats[i % 6], x.n(2, 5), iso(2026, 10, 2 + i * 3)]); });
    t.zebra(4, 11, 6, th).range(4, 6, 11, 6, { fmt: "date" }).range(4, 3, 11, 3, { color: "#1d4ed8" }).range(4, 5, 11, 5, { align: "center", b: true });
    t.dd("E5:E12", cats.map((c, i) => [c, Object.values(PC)[i]])).cf("F5:F12", "ge", 4, CG).cf("F5:F12", "le", 2, CR);
    return t.put(13, 0, "Average rating", { b: true }).put(13, 1, "=AVERAGE(F5:F12)", { b: true, fmt: "fixed2" });
  },
  "maintenance-log"(x) {
    const { T, th } = x, eq = ["Air conditioner", "Generator", "Water pump", "Delivery van", "Fridge", "Printer", "Fire extinguisher", "Roof tank"];
    const t = sheet("Maintenance").widths([170, 120, 100, 120, 90, 110, 160]);
    t.title("Maintenance log", 6, th, `${T.biz}: when each machine was serviced and when it is due again.`);
    t.put(2, 0, "Today", { b: true }).put(2, 1, "2026-11-11", { b: true, fmt: "date", ...BLUE });
    t.head(4, ["Equipment", "Last service", "Every (days)", "Next due", "Days left", "Status", "Done by"], th);
    eq.forEach((e, i) => { const R = 6 + i; t.row(5 + i, [e, iso(2026, 7 + (i % 4), 3 + i * 3), [90, 60, 120, 30, 180, 90, 365, 180][i], `=B${R}+C${R}`, `=D${R}-$B$3`, `=IF(E${R}<0,"Overdue",IF(E${R}<=14,"Due soon","OK"))`, T.clients[i % 6]]); });
    t.zebra(5, 12, 6, th).range(5, 1, 12, 1, { fmt: "date" }).range(5, 3, 12, 3, { fmt: "date" }).range(5, 2, 12, 2, { align: "center", ...BLUE }).range(5, 4, 12, 5, { align: "center", b: true });
    t.cf("F6:F13", "eq", "Overdue", CR).cf("F6:F13", "eq", "Due soon", CA).cf("F6:F13", "eq", "OK", CG);
    return t.put(14, 0, "Overdue", { b: true }).put(14, 1, '=COUNTIF(F6:F13,"Overdue")', { b: true, color: "#dc2626" });
  },
  "petty-cash"(x) {
    const { T, th } = x, cats = ["Tea and snacks", "Stationery", "Transport", "Cleaning", "Postage", "Repairs"];
    const t = sheet("Petty cash").widths([110, 220, 140, 110, 110, 130]);
    t.title("Petty cash book", 5, th, `${T.biz}: small cash in and out, with the balance after each line.`);
    t.put(2, 0, "Opening balance", { b: true }).put(2, 2, 15000, { b: true, fmt: "thousands", ...BLUE });
    t.head(4, ["Date", "Details", "Category", "Cash in (Rs)", "Cash out (Rs)", "Balance (Rs)"], th);
    for (let i = 0; i < 12; i++) { const R = 6 + i, top = i === 6; t.row(5 + i, [iso(2026, 11, 1 + i * 2), top ? "Top-up from the bank" : ["Tea for the meeting", "Printer paper", "Rickshaw to the bank", "Floor cleaner", "Courier to client", "Door handle fixed"][i % 6], top ? "Top-up" : cats[i % 6], top ? 10000 : "", top ? "" : Math.round(x.n(200, 2600) / 10) * 10, i ? `=F${R - 1}+D${R}-E${R}` : `=$C$3+D${R}-E${R}`]); }
    t.zebra(5, 16, 5, th).range(5, 0, 16, 0, { fmt: "date" }).range(5, 3, 17, 5, { fmt: "thousands" }).cf("F6:F17", "lt", 3000, CR);
    return t.total(17, ["Total", "", "", "=SUM(D6:D17)", "=SUM(E6:E17)", "=F17"], th);
  },
  "meeting-actions"(x) {
    const { T, th } = x, ppl = x.people(5), st = [["Open", PC.amber], ["Done", PC.green], ["Blocked", PC.red]];
    const t = sheet("Meeting").widths([240, 150, 120, 110]);
    t.title("Meeting notes and actions", 3, th, T.biz);
    t.put(2, 0, "Date", { b: true }).put(2, 1, "2026-11-11", { fmt: "date" }).put(3, 0, "People", { b: true }).put(3, 1, ppl.join(", "), { wrap: true }).merge(3, 1, 3, 3).height(3, 36);
    t.put(5, 0, "Agenda", { b: true, fill: th.band, color: "#fff" }).range(5, 1, 5, 3, { fill: th.band });
    T.tasks.slice(0, 4).forEach((a, i) => t.put(6 + i, 0, a, { list: true }).merge(6 + i, 0, 6 + i, 3));
    t.put(11, 0, "Decisions", { b: true, fill: th.band, color: "#fff" }).range(11, 1, 11, 3, { fill: th.band });
    ["Start the new plan next month", "Keep the budget the same", "Meet again in two weeks"].forEach((d, i) => t.put(12 + i, 0, d, { list: true, color: th.ink }).merge(12 + i, 0, 12 + i, 3));
    t.head(16, ["Action", "Owner", "Due", "Status"], th);
    T.tasks.slice(2, 8).forEach((a, i) => t.row(17 + i, [a, ppl[i % 5], iso(2026, 11, 14 + i * 3), st[i % 3 === 2 ? 2 : i < 2 ? 1 : 0][0]]));
    t.zebra(17, 22, 3, th).range(17, 2, 22, 2, { fmt: "date" }).dd("D18:D23", st);
    return t.put(24, 0, "Open actions", { b: true }).put(24, 1, '=COUNTIF(D18:D23,"Open")+COUNTIF(D18:D23,"Blocked")', { b: true, color: th.band });
  },
  "volunteer-signup"(x) {
    const { T, th } = x, roles = ["Welcome desk", "Food stall", "Setup", "Clean-up"], names = PEOPLE.slice(2);
    const t = sheet("Volunteers").widths([120, 160, 160, 160, 160, 100]);
    t.title("Volunteer sign-up", 5, th, `${T.biz}: write your name in a free spot. Spots left count down by themselves.`);
    t.head(3, ["Time", ...roles, "Spots left"], th);
    let k = 0;
    for (let s = 0; s < 6; s++) {
      const r = 4 + s, R = r + 1, h = 9 + s;
      t.put(r, 0, `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`, { b: true, color: th.ink, fmt: "h:mm AM/PM" });
      roles.forEach((_, j) => { const filled = x.rnd() < 0.62; t.put(r, j + 1, filled ? names[k++ % names.length] : "", { fill: filled ? th.zebra : "#ffffff", bd: "trbl", bc: th.head, align: "center" }); });
      t.put(r, 5, `=${roles.length}-COUNTA(B${R}:E${R})`, { align: "center", b: true });
    }
    t.cf("F5:F10", "le", 0, CG).cf("F5:F10", "ge", 2, CA);
    return t.total(10, ["Total", ...roles.map((_, j) => `=COUNTA(${colL(j + 1)}5:${colL(j + 1)}10)`), "=SUM(F5:F10)"], th).range(10, 1, 10, 5, { align: "center" });
  },
  "warranty-tracker"(x) {
    const { T, th } = x, items = [["Laptop", 12], ["Printer", 12], ["Air conditioner", 24], ["Fridge", 36], ["Phone", 12], ["Generator", 18], ["Water dispenser", 12], ["CCTV set", 24]];
    const t = sheet("Warranties").widths([170, 110, 90, 110, 90, 110, 160]);
    t.title("Warranty tracker", 6, th, `${T.biz}: what is still covered and when cover ends.`);
    t.put(2, 0, "Today", { b: true }).put(2, 1, "2026-11-11", { b: true, fmt: "date", ...BLUE });
    t.head(4, ["Item", "Bought on", "Months", "Cover ends", "Days left", "Covered?", "Shop"], th);
    items.forEach(([n, mo], i) => { const R = 6 + i; t.row(5 + i, [n, iso(2024 + (i % 3), 1 + i, 10), mo, `=EDATE(B${R},C${R})`, `=MAX(0,D${R}-$B$3)`, `=IF(D${R}>=$B$3,"Yes","Ended")`, T.clients[i % 6]]); });
    t.zebra(5, 12, 6, th).range(5, 1, 12, 1, { fmt: "date" }).range(5, 3, 12, 3, { fmt: "date" }).range(5, 2, 12, 2, { align: "center" }).range(5, 4, 12, 5, { align: "center", b: true });
    t.cf("F6:F13", "eq", "Ended", CR).cf("F6:F13", "eq", "Yes", CG).cf("E6:E13", "between", 1, CA, 60);
    return t.put(14, 0, "Still covered", { b: true }).put(14, 1, '=COUNTIF(F6:F13,"Yes")', { b: true, color: "#16a34a" });
  },
  "sales-heatmap"(x) {
    const { T, th } = x, days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], items = T.items.slice(0, 7);
    const t = sheet("Week").widths([190, ...Array(7).fill(72), 100]);
    t.title("Weekly sales heat map", 8, th, `${T.biz}: units sold each day. Green is a strong day, red a slow one.`);
    t.head(3, ["Item", ...days, "Week total"], th).range(3, 1, 3, 8, { align: "center" });
    items.forEach(([n], i) => { const R = 5 + i; t.row(4 + i, [n, ...days.map((_, d) => x.n(2, 30) + (d >= 4 ? x.n(5, 20) : 0)), `=SUM(B${R}:H${R})`]).range(4 + i, 1, 4 + i, 8, { align: "center" }); });
    t.cf("B5:H11", "ge", 30, CG).cf("B5:H11", "le", 8, CR).cf("B5:H11", "between", 9, CA, 14);
    t.total(11, ["Day total", ...days.map((_, d) => `=SUM(${colL(d + 1)}5:${colL(d + 1)}11)`), "=SUM(I5:I11)"], th).range(11, 1, 11, 8, { align: "center" });
    return t.put(13, 0, "Best day", { b: true }).put(13, 1, "=INDEX(B4:H4,MATCH(MAX(B12:H12),B12:H12,0))", { b: true, color: th.band }).chart({ kind: "stacked", cols: [0, 1, 2, 3, 4, 5, 6, 7], r1: 3, r2: 10, title: "Units by item and day", at: "K4", w: 460, h: 300 });
  },
  "packing-list"(x) {
    const { T, th } = x, groups = [["Documents", ["ID card", "Tickets", "Hotel booking", "Cash and cards"]], ["Clothes", ["Shirts", "Warm jacket", "Shoes", "Sleepwear"]], ["Toiletries", ["Toothbrush", "Soap", "Sunscreen"]], ["Electronics", ["Phone charger", "Power bank", "Headphones"]]];
    const t = sheet("Packing").widths([46, 230, 120, 30, 160, 90]);
    t.title("Packing list", 5, th, `${T.biz}: tick ✓ as you pack.`);
    let r = 3;
    groups.forEach(([g, items]) => {
      t.put(r, 0, "", { fill: th.band }).put(r, 1, g, { b: true, fill: th.band, color: "#fff" }).put(r, 2, "", { fill: th.band }); r++;
      items.forEach((it) => { t.put(r, 0, x.rnd() < 0.55 ? "✓" : "", { align: "center", b: true, color: "#16a34a", bd: "trbl", bc: "#cbd5e1" }).put(r, 1, it).put(r, 2, x.rnd() < 0.3 ? "Buy" : "", { color: "#c2410c", i: true }); r++; });
    });
    const last = r;
    t.put(3, 4, "Packed", { b: true }).put(3, 5, `=COUNTIF(A4:A${last},"✓")`, { b: true, color: "#16a34a" }).put(4, 4, "Items", { b: true }).put(4, 5, `=COUNTA(B4:B${last})-${groups.length}`, { b: true }).put(5, 4, "Done", { b: true }).put(5, 5, "=F4/F5", { b: true, fmt: "percent" });
    return t.put(6, 4, '=REPT("█",ROUND(F6*10,0))&REPT("░",10-ROUND(F6*10,0))', { color: th.band }).merge(6, 4, 6, 5).box(3, 4, 6, 5, th.head);
  },
  "lesson-plan"(x) {
    const { T, th } = x, acts = [["Warm-up quiz", 5], ["New idea with examples", 15], ["Pair work", 10], ["Class discussion", 8], ["Exit ticket", 2]];
    const t = sheet("Lesson").widths([170, 260, 90, 200]);
    t.title("Lesson plan", 3, th, T.biz);
    t.put(2, 0, "Class", { b: true }).put(2, 1, "Grade 6, Green").put(3, 0, "Subject", { b: true }).put(3, 1, "Science: plants and light").put(2, 2, "Date", { b: true }).put(2, 3, "2026-11-18", { fmt: "date" }).put(3, 2, "Teacher", { b: true }).put(3, 3, x.people(1)[0]);
    t.put(5, 0, "Goals", { b: true, fill: th.band, color: "#fff" }).range(5, 1, 5, 3, { fill: th.band });
    ["Explain why plants need light", "Read a simple bar chart", "Work well in pairs"].forEach((g, i) => t.put(6 + i, 0, g, { list: true }).merge(6 + i, 0, 6 + i, 3));
    t.put(10, 0, "Materials", { b: true, fill: th.band, color: "#fff" }).range(10, 1, 10, 3, { fill: th.band });
    ["Two small plants (one kept in the dark)", "Worksheet and coloured pencils"].forEach((g, i) => t.put(11 + i, 0, g, { list: true }).merge(11 + i, 0, 11 + i, 3));
    t.head(14, ["Part", "What happens", "Minutes", "Notes"], th);
    acts.forEach(([a, m], i) => t.row(15 + i, [`Part ${i + 1}`, a, m, i === 2 ? "Mix strong and weak readers" : ""]).style(15 + i, 2, { align: "center", ...BLUE }));
    return t.zebra(15, 19, 3, th).total(20, ["Total", "", "=SUM(C16:C20)", '=IF(C21>40,"Too long for one period","Fits in one period")'], th).style(20, 2, { align: "center" });
  },
  "decision-matrix"(x) {
    const { T, th } = x, crit = [["Cost", 0.3], ["Quality", 0.25], ["Speed", 0.15], ["Support", 0.15], ["Ease of use", 0.15]], opts = [...T.clients.slice(0, 4), "Do it ourselves"];
    const t = sheet("Decision").widths([190, 90, 90, 90, 90, 100, 110, 70]);
    t.title("Decision matrix", 7, th, `${T.biz}: score each option from 1 (poor) to 5 (great); weights in blue add up to 100%.`);
    t.head(3, ["Option", ...crit.map((c) => c[0]), "Weighted score", "Rank"], th).range(3, 1, 3, 7, { align: "center" });
    t.row(4, ["Weight", ...crit.map((c) => c[1]), "=SUM(B5:F5)"], { b: true, fmt: "percent", ...BLUE, align: "center" }).style(4, 0, { color: "#1b2133", align: "left" }).style(4, 6, { color: th.ink });
    opts.forEach((o, i) => { const R = 6 + i; t.row(5 + i, [o, ...crit.map(() => x.n(1, 5)), `=ROUND(SUMPRODUCT($B$5:$F$5,B${R}:F${R}),2)`, `=RANK(G${R},$G$6:$G$10)`]).range(5 + i, 1, 5 + i, 7, { align: "center" }).style(5 + i, 6, { b: true }); });
    t.zebra(5, 9, 7, th).cf("B6:F10", "ge", 5, CG).cf("B6:F10", "le", 1, CR).cf("H6:H10", "eq", 1, { fill: th.band, color: "#ffffff", b: true });
    t.put(11, 0, "Best choice", { b: true, size: 16 }).put(11, 1, "=INDEX(A6:A10,MATCH(1,H6:H10,0))", { b: true, size: 16, color: th.band }).merge(11, 1, 11, 4).height(11, 34);
    return t.chart({ kind: "hbar", cols: [0, 6], r1: 3, r2: 9, title: "Weighted score", at: "J4", w: 400, h: 260 });
  },
  "nutrition-tracker"(x) {
    const { T, th } = x, meals = [["Breakfast", "Oats with banana", 380, 12, 64, 8], ["Snack", "Apple and nuts", 220, 6, 22, 13], ["Lunch", "Chicken rice bowl", 620, 38, 70, 18], ["Snack", "Yogurt", 150, 9, 12, 7], ["Dinner", "Daal with roti", 540, 24, 78, 14], ["Dessert", "Kheer, small bowl", 260, 7, 40, 8]];
    const t = sheet("Nutrition").widths([110, 190, 90, 90, 90, 80, 140]);
    t.title("Daily nutrition tracker", 6, th, `${T.biz}: what was eaten today against the daily targets (blue).`);
    t.head(3, ["Meal", "Food", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)"], th);
    meals.forEach((m, i) => t.row(4 + i, m).range(4 + i, 2, 4 + i, 5, { align: "center" }));
    t.zebra(4, 9, 5, th).total(10, ["Eaten", "", "=SUM(C5:C10)", "=SUM(D5:D10)", "=SUM(E5:E10)", "=SUM(F5:F10)"], th).range(10, 2, 10, 5, { align: "center" });
    t.row(11, ["Target", "", 2200, 90, 260, 70], { b: true, ...BLUE }).range(11, 2, 11, 5, { align: "center" });
    t.row(12, ["Done", "", "=C11/C12", "=D11/D12", "=E11/E12", "=F11/F12"], { b: true }).range(12, 2, 12, 5, { fmt: "percent", align: "center" });
    t.row(13, ["", "", ...["C", "D", "E", "F"].map((c) => `=REPT("█",ROUND(MIN(1,${c}13)*8,0))&REPT("░",8-ROUND(MIN(1,${c}13)*8,0))`)]).range(13, 2, 13, 5, { color: th.band, align: "center" });
    return t.cf("C13:F13", "gt", 1, CR).cf("C13:F13", "between", 0.8, CG, 1).chart({ kind: "donut", cols: [1, 2], r1: 3, r2: 9, title: "Calories by meal", at: "I4", w: 380, h: 280 });
  },
  "loan-comparison"(x) {
    const { T, th } = x, offers = [["Bank A", 0.15, 3], ["Bank B", 0.17, 5], ["Bank C", 0.14, 4]], amt = Math.round((T.money * 25) / 10000) * 10000;
    const t = sheet("Compare loans").widths([200, 150, 150, 150]);
    t.title("Loan comparison", 3, th, `${T.biz}: three offers for the same loan. Change the blue numbers.`);
    t.put(2, 0, "Loan amount (Rs)", { b: true }).put(2, 1, amt, { b: true, fmt: "thousands", ...BLUE });
    t.head(4, ["", ...offers.map((o) => o[0])], th).range(4, 1, 4, 3, { align: "center" });
    const rows = [["Yearly interest", offers.map((o) => o[1]), "percent", true], ["Years", offers.map((o) => o[2]), null, true], ["Processing fee (Rs)", offers.map(() => x.n(2, 12) * 1000), "thousands", true], ["Monthly payment (Rs)", ["B", "C", "D"].map((c) => `=ROUND(-PMT(${c}6/12,${c}7*12,$B$3),0)`), "thousands"], ["Total paid (Rs)", ["B", "C", "D"].map((c) => `=${c}9*${c}7*12+${c}8`), "thousands"], ["Total interest and fees (Rs)", ["B", "C", "D"].map((c) => `=${c}10-$B$3`), "thousands"]];
    rows.forEach(([l, vals, fmt, input], i) => t.row(5 + i, [l, ...vals], { ...(fmt ? { fmt } : {}), ...(input ? BLUE : {}), align: "center" }).style(5 + i, 0, { b: true, align: "left", color: "#1b2133" }));
    t.zebra(5, 10, 3, th).range(8, 1, 10, 3, { b: true });
    t.put(12, 0, "Cheapest overall", { b: true, size: 15 }).put(12, 1, "=INDEX(B5:D5,MATCH(MIN(B11:D11),B11:D11,0))", { b: true, size: 15, color: th.band });
    return t.put(13, 0, "You save with it (Rs)", { b: true }).put(13, 1, "=MAX(B11:D11)-MIN(B11:D11)", { b: true, fmt: "thousands", color: "#16a34a" });
  },
  "currency-matrix"(x) {
    const { T, th } = x, cur = [["Rupee (Rs)", 1], ["US dollar ($)", 280], ["Euro (€)", 305], ["Pound (£)", 356], ["Dirham (AED)", 76], ["Riyal (SAR)", 74.6]];
    const t = sheet("Currencies").widths([150, ...Array(6).fill(110)]);
    t.title("Currency table", 6, th, `${T.biz}: what 1 of each currency is worth in the others. Update the blue rates (in rupees).`);
    t.head(3, ["Currency", "Rate in Rs", "", "", "", "", ""], th);
    cur.forEach(([n, r], i) => t.put(4 + i, 0, n, { b: true }).put(4 + i, 1, r, { ...BLUE, fmt: "fixed2" }));
    t.head(11, ["1 of → in", ...cur.map((c) => c[0].replace(/ \(.*\)/, ""))], th);
    cur.forEach(([n], i) => { const R = 13 + i; t.put(12 + i, 0, n.replace(/ \(.*\)/, ""), { b: true, color: th.ink }); cur.forEach((_, j) => t.put(12 + i, 1 + j, `=ROUND($B$${5 + i}/$B$${5 + j},4)`, { fmt: i === j ? "0" : "0.0000", align: "center", ...(i === j ? { fill: th.head, color: th.ink, b: true } : {}) })); void R; });
    t.zebra(12, 17, 6, th);
    return t.put(19, 0, "Rs 10,000 in dollars", { b: true }).put(19, 2, "=ROUND(10000/B6,2)", { b: true, fmt: "usd" });
  },
  "sales-forecast"(x) {
    const { T, th } = x;
    const t = sheet("Forecast").widths([100, 140, 140, 110]);
    t.title("Sales forecast", 3, th, `${T.biz}: six months of actual sales and the next six forecast from the average growth (blue).`);
    t.put(2, 0, "Monthly growth", { b: true }).put(2, 1, "=ROUND(AVERAGE(D6:D10),4)", { b: true, fmt: "percent", ...BLUE });
    t.head(3, ["Month", "Sales (Rs)", "Type", "Growth"], th);
    let v = T.money * 4;
    MONTHS.forEach((m, i) => {
      const R = 5 + i;
      if (i < 6) { v = Math.round((v * (1 + 0.02 + x.rnd() * 0.06)) / 1000) * 1000; t.row(4 + i, [m, v, "Actual", i ? `=B${R}/B${R - 1}-1` : ""]); }
      else t.row(4 + i, [m, `=ROUND(B${R - 1}*(1+$B$3),-3)`, "Forecast", "=$B$3"]).range(4 + i, 0, 4 + i, 3, { fill: th.zebra, i: true });
    });
    t.range(4, 1, 15, 1, { fmt: "thousands" }).range(4, 3, 15, 3, { fmt: "percent" }).dd("C5:C16", [["Actual", PC.blue], ["Forecast", PC.amber]]);
    t.put(17, 0, "Actual so far", { b: true }).put(17, 1, '=SUMIF(C5:C16,"Actual",B5:B16)', { b: true, fmt: "thousands" }).put(18, 0, "Forecast rest", { b: true }).put(18, 1, '=SUMIF(C5:C16,"Forecast",B5:B16)', { b: true, fmt: "thousands", color: th.band }).put(19, 0, "Whole year", { b: true }).put(19, 1, "=B18+B19", { b: true, fmt: "thousands" });
    return t.chart({ kind: "area", cols: [0, 1], r1: 3, r2: 15, title: "Sales: actual, then forecast", at: "F4", w: 460, h: 280 });
  },
  "survey-results"(x) {
    const { T, th } = x, qs = ["Staff were friendly", "Fair prices", "Easy to find things", "Fast service", "Clean place", "Would come again"];
    const t = sheet("Survey").widths([200, 90, 90, 90, 90, 90, 90, 100]);
    t.title("Survey results", 7, th, `${T.biz}: answers from customers, from 1 (poor) to 5 (great).`);
    t.head(3, ["Question", "1 Poor", "2", "3", "4", "5 Great", "Answers", "Average"], th).range(3, 1, 3, 7, { align: "center" });
    qs.forEach((q, i) => { const R = 5 + i, a = [x.n(0, 6), x.n(2, 10), x.n(8, 20), x.n(15, 35), x.n(15, 40)]; t.row(4 + i, [q, ...a, `=SUM(B${R}:F${R})`, `=ROUND(SUMPRODUCT(B${R}:F${R},{1,2,3,4,5})/G${R},2)`]).range(4 + i, 1, 4 + i, 7, { align: "center" }); });
    t.zebra(4, 9, 7, th).cf("H5:H10", "ge", 4, CG).cf("H5:H10", "lt", 3.5, CR).range(4, 7, 9, 7, { b: true });
    return t.total(10, ["Overall", "", "", "", "", "", "=SUM(G5:G10)", "=ROUND(AVERAGE(H5:H10),2)"], th).range(10, 6, 10, 7, { align: "center" }).chart({ kind: "stacked", cols: [0, 1, 2, 3, 4, 5], r1: 3, r2: 9, title: "Answers by question", at: "J4", w: 480, h: 300 });
  },
  "leave-tracker"(x) {
    const { T, th } = x, ppl = x.people(8);
    const t = sheet("Leave").widths([170, 100, 90, 90, 90, 140]);
    t.title("Leave tracker", 5, th, `${T.biz}: days off allowed, taken and left this year.`);
    t.head(3, ["Name", "Allowed", "Taken", "Booked", "Left", "Used"], th).range(3, 1, 3, 5, { align: "center" });
    ppl.forEach((p, i) => { const R = 5 + i, al = [20, 20, 24, 18][i % 4]; t.row(4 + i, [p, al, x.n(2, al - 2), x.n(0, 4), `=B${R}-C${R}-D${R}`, `=REPT("█",ROUND((C${R}+D${R})/B${R}*10,0))&REPT("░",10-ROUND((C${R}+D${R})/B${R}*10,0))`]).range(4 + i, 1, 4 + i, 4, { align: "center" }).style(4 + i, 1, BLUE).style(4 + i, 5, { color: th.band }); });
    t.zebra(4, 11, 5, th).cf("E5:E12", "le", 2, CR).cf("E5:E12", "ge", 10, CG);
    return t.total(12, ["Team", "=SUM(B5:B12)", "=SUM(C5:C12)", "=SUM(D5:D12)", "=SUM(E5:E12)", ""], th).range(12, 1, 12, 4, { align: "center" });
  },
  "project-cost"(x) {
    const { T, th } = x, phases = ["Planning", "Build", "Testing", "Launch"], cats = ["People", "Materials", "Equipment", "Other"];
    const t = sheet("Project cost").widths([110, 200, 120, 130, 30, 120, ...Array(4).fill(110), 120]);
    t.title("Project cost by phase", 10, th, `${T.biz}: every cost line, then totals by phase and type (worked out with SUMIFS).`);
    t.head(3, ["Phase", "Item", "Type", "Cost (Rs)"], th);
    const lines = [];
    phases.forEach((p) => cats.forEach((c) => { if (x.rnd() < 0.75) lines.push([p, `${c} for ${p.toLowerCase()}`, c, x.money(0.9)]); }));
    lines.forEach((l, i) => t.row(4 + i, l));
    const last = 4 + lines.length;
    t.zebra(4, last - 1, 3, th).range(4, 3, last, 3, { fmt: "thousands" }).total(last, ["Total", "", "", `=SUM(D5:D${last})`], th);
    ["Phase", ...cats, "Total"].forEach((v, j) => t.put(3, 5 + j, v, { b: true, fill: th.band, color: "#ffffff" }));
    phases.forEach((p, i) => { const R = 5 + i; t.put(4 + i, 5, p, { b: true }); cats.forEach((c, j) => t.put(4 + i, 6 + j, `=SUMIFS($D$5:$D$${last},$A$5:$A$${last},$F${R},$C$5:$C$${last},${colL(6 + j)}$4)`, { fmt: "thousands" })); t.put(4 + i, 10, `=SUM(G${R}:J${R})`, { fmt: "thousands", b: true }); });
    t.box(3, 5, 8, 10, th.head);
    return t.chart({ kind: "stacked", cols: [5, 6, 7, 8, 9], r1: 3, r2: 7, title: "Cost by phase and type", at: "F11", w: 460, h: 280 });
  },
  "times-table"(x) {
    const { T, th } = x;
    const t = sheet("Times table").widths([54, ...Array(12).fill(54)]);
    t.title("Times table", 12, th, `${T.biz}: every cell is a formula (=$A × row 3). Bigger answers are darker.`);
    t.put(2, 0, "×", { b: true, align: "center", fill: th.band, color: "#fff", size: 15 });
    for (let c = 1; c <= 12; c++) t.put(2, c, c, { b: true, align: "center", fill: th.band, color: "#fff" });
    for (let r = 1; r <= 12; r++) { t.put(2 + r, 0, r, { b: true, align: "center", fill: th.band, color: "#fff" }); for (let c = 1; c <= 12; c++) t.put(2 + r, c, `=$A${3 + r}*${colL(c)}$3`, { align: "center" }); }
    return t.cf("B4:M15", "ge", 100, { fill: th.band, color: "#ffffff", b: true }).cf("B4:M15", "between", 50, { fill: th.head, color: th.ink }, 99).cf("B4:M15", "between", 25, { fill: th.zebra }, 49).put(16, 0, "Total of all answers", { b: true }).put(16, 4, "=SUM(B4:M15)", { b: true, fmt: "thousands" });
  },
  "unit-converter"(x) {
    const { T, th } = x, rows = [["Distance", 10, "km", "mi"], ["Distance", 5, "mi", "km"], ["Height", 6, "ft", "m"], ["Weight", 70, "kg", "lbm"], ["Weight", 500, "g", "ozm"], ["Volume", 2, "gal", "l"], ["Temperature", 37, "C", "F"], ["Temperature", 98.6, "F", "C"], ["Speed", 100, "km/h", "mph"], ["Area", 1, "acre", "m2"]];
    const t = sheet("Converter").widths([130, 110, 90, 30, 130, 90]);
    t.title("Unit converter", 5, th, `${T.biz}: type a number and units (blue); CONVERT does the rest.`);
    t.head(3, ["What", "Amount", "From", "", "Answer", "To"], th);
    rows.forEach(([w, n, f, to], i) => { const R = 5 + i; t.row(4 + i, [w, n, f, "→", `=ROUND(CONVERT(B${R},C${R},F${R}),3)`, to]).range(4 + i, 1, 4 + i, 2, BLUE).style(4 + i, 5, BLUE).style(4 + i, 4, { b: true, color: th.ink }).style(4 + i, 3, { align: "center", color: "#94a3b8" }); });
    t.zebra(4, 13, 5, th);
    return t.put(15, 0, "Units you can use: km, m, cm, mm, mi, yd, ft, in, kg, g, mg, lbm, ozm, l, ml, gal, cup, C, F, K, km/h, m/s, mph, m2, ha, acre", { i: true, color: "#64748b" }).merge(15, 0, 15, 5);
  },
  "pricing-tiers"(x) {
    const { T, th } = x, tiers = [["Basic", 1], ["Standard", 2.2], ["Premium", 4]], base = Math.round(T.money / 20 / 100) * 100;
    const feats = ["Main service", "Weekend hours", "Home delivery", "Priority support", "Monthly report", "Free extras", "Dedicated manager"];
    const t = sheet("Plans").widths([200, 140, 140, 140]);
    t.title("Pricing plans", 3, th, `${T.biz}: what each plan includes and costs. ✓ = included.`);
    t.head(3, ["", ...tiers.map((x2) => x2[0])], th).range(3, 1, 3, 3, { align: "center", size: 15 }).height(3, 34);
    t.row(4, ["Price a month (Rs)", ...tiers.map(([, k]) => Math.round((base * k) / 100) * 100)], { b: true, size: 16, align: "center", fmt: "thousands", color: th.ink }).style(4, 0, { size: 13, align: "left" }).height(4, 34);
    t.row(5, ["Price a year (Rs, 2 months free)", "=B5*10", "=C5*10", "=D5*10"], { align: "center", fmt: "thousands" }).style(5, 0, { align: "left" });
    feats.forEach((f, i) => t.row(6 + i, [f, ...tiers.map((_, k) => (i < 2 + k * 2 ? "✓" : ""))]).range(6 + i, 1, 6 + i, 3, { align: "center", color: "#16a34a", b: true }));
    t.zebra(6, 12, 3, th).range(3, 2, 12, 2, { bd: "lr", bc: th.band });
    return t.total(13, ["Features included", '=COUNTIF(B7:B13,"✓")', '=COUNTIF(C7:C13,"✓")', '=COUNTIF(D7:D13,"✓")'], th).range(13, 1, 13, 3, { align: "center" }).put(15, 0, "Most popular: Standard", { b: true, color: th.band });
  },
};
const P2 = (th) => th.ink;
/** Second sheets ("1 of 2" templates). */
const PAGE2 = {
  "gantt-timeline"(x) {
    const { T, th } = x, ppl = x.people(3), st = [["Done", PC.green], ["On track", PC.blue], ["At risk", PC.red]];
    const t = sheet("Milestones").widths([220, 120, 140, 110]);
    t.title("Milestones", 3, th, `${T.biz}: the dates that matter most.`);
    t.head(3, ["Milestone", "Date", "Owner", "Status"], th);
    ["Plan signed off", "First version ready", "Team trained", "Launch day", "Review results"].forEach((m, i) => t.row(4 + i, [m, iso(2026, 11, 6 + i * 12), ppl[i % 3], st[i < 2 ? 0 : i === 3 ? 2 : 1][0]]));
    t.zebra(4, 8, 3, th).range(4, 1, 8, 1, { fmt: "date" }).dd("D5:D9", st);
    return t.put(10, 0, "Done", { b: true }).put(10, 1, '=COUNTIF(D5:D9,"Done")', { b: true, color: th.band }).put(11, 0, "Days from first to last", { b: true }).put(11, 1, "=MAX(B5:B9)-MIN(B5:B9)", { b: true });
  },
  invoice(x) {
    const { T, th } = x, st = [["Paid", PC.green], ["Sent", PC.blue], ["Overdue", PC.red]];
    const t = sheet("Invoice log").widths([110, 200, 110, 130, 110]);
    t.title("Invoice log", 4, th, `${T.biz}: every invoice sent this quarter.`);
    t.head(3, ["Invoice", "Client", "Date", "Amount (Rs)", "Status"], th);
    for (let i = 0; i < 8; i++) t.row(4 + i, [`INV-${2101 + i}`, T.clients[i % 6], iso(2026, 9 + Math.floor(i / 3), 3 + (i % 3) * 9), x.money(1.5), st[i < 4 ? 0 : i < 6 ? 1 : 2][0]]);
    t.zebra(4, 11, 4, th).range(4, 2, 11, 2, { fmt: "date" }).range(4, 3, 12, 3, { fmt: "thousands" }).dd("E5:E12", st);
    return t.total(12, ["Total", "", "", "=SUM(D5:D12)", '=COUNTIF(E5:E12,"Overdue")&" overdue"'], th).put(14, 0, "Still to collect", { b: true }).put(14, 3, '=SUMIF(E5:E12,"<>Paid",D5:D12)', { b: true, fmt: "thousands", color: "#c2410c" });
  },
  "sales-dashboard"(x) {
    const { T, th } = x;
    const t = sheet("Monthly data").widths([110, 130, 130, 110]);
    t.title("Monthly data", 3, th, `${T.biz}: the numbers behind the dashboard.`);
    t.head(3, ["Month", "Revenue (Rs)", "Orders", "Per order (Rs)"], th);
    ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].forEach((m, i) => { const R = 5 + i; t.row(4 + i, [m, x.money(6), x.n(80, 400), `=ROUND(B${R}/C${R},0)`]); });
    t.zebra(4, 9, 3, th).range(4, 1, 10, 1, { fmt: "thousands" }).range(4, 3, 10, 3, { fmt: "thousands" });
    t.total(10, ["Total", "=SUM(B5:B10)", "=SUM(C5:C10)", "=ROUND(B11/C11,0)"], th);
    return t.chart({ kind: "area", cols: [0, 1], r1: 3, r2: 9, title: "Revenue by month", at: "F4", w: 420, h: 260 });
  },
};
export const MULTI_PAGE = Object.keys(PAGE2);
const PC = { green: "#dcfce7", amber: "#fef3c7", blue: "#e0f2fe", red: "#fee2e2", violet: "#ede9fe", pink: "#fce7f3", teal: "#ccfbf1", grey: "#f1f5f9" };
const CG = { fill: "#dcfce7", color: "#166534" }, CR = { fill: "#fee2e2", color: "#991b1b" }, CA = { fill: "#fef3c7", color: "#92400e" };

export const LAYOUT_IDS = Object.keys(L);

/** Builds a generated template from its id, or null when the id is not a generated one. */
export function buildGenerated(id) {
  const p = parseId(id);
  if (!p || !L[p.layout.id]) return null;
  const { layout, palette: P, theme: T } = p, rnd = rng(id);
  const th = { band: P.band, head: P.head, ink: P.ink, zebra: P.zebra };
  const x = {
    T, th, rnd,
    n: (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)),
    money: (f = 1) => Math.max(500, Math.round((T.money * f * (0.55 + rnd() * 0.9)) / 500) * 500),
    people: (k) => Array.from({ length: k }, (_, i) => PEOPLE[(T.people + i * 5 + (id.length % 3)) % PEOPLE.length]),
  };
  const out = L[layout.id](x), more = PAGE2[layout.id]?.(x);
  return { name: templateName(p), sheets: [out.s, ...(more ? [more.s] : [])] };
}
