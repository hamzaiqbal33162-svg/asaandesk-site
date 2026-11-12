// Ready-made sheets (all our own content, names and colours). buildTemplate(id) → { name, sheets: [{ name,
// cells: { A1: input }, styles: { A1: style }, colW: { col: px }, rowH: { row: px }, charts: [] }] }.
// Style keys: b, i, color, fill, fmt, align, wrap, size (px), font, valign, bd (borders "trbl"), bc (border colour).
import { cellName } from "./formula.js";
import { buildGenerated } from "./layouts.js";
import { buildStarter } from "./starters.js";

export const TEMPLATES = [
  { id: "budget", name: "Monthly budget", desc: "Income, expenses and what is left, in rupees.", color: "#5b4cf0" },
  { id: "invoice-list", name: "Invoice list", desc: "Track bills, due dates, paid and unpaid.", color: "#ff7a59" },
  { id: "attendance", name: "Attendance sheet", desc: "Present, absent and leave for a class or team.", color: "#14b8a6" },
  { id: "sales-tracker", name: "Sales tracker", desc: "Daily sales with totals per product and a chart.", color: "#f59e0b" },
  { id: "grade-sheet", name: "Grade sheet", desc: "Marks, totals, percentages, grades and rank.", color: "#2f80ff" },
  { id: "inventory", name: "Inventory", desc: "Stock, reorder alerts and stock value.", color: "#a64bf4" },
  { id: "inventory-tracker", name: "Inventory tracker", desc: "Stock on hand, suppliers, reorder alerts and a stock chart.", color: "#f59e0b" },
  { id: "budget-tracker", name: "Budget tracker", desc: "Six months of spending against the plan, with a chart.", color: "#4f46e5" },
  { id: "price-list", name: "Price list", desc: "Cost, selling price, margin and stock for each item.", color: "#ea580c" },
  { id: "monthly-budget", name: "Monthly budget", desc: "Budget, spent and remaining per category, with a pie chart.", color: "#e11d48" },
  { id: "balance-sheet", name: "Balance sheet", desc: "Assets, liabilities and equity, this year against last year.", color: "#c026d3" },
  { id: "kpi-dashboard", name: "Financial KPI dashboard", desc: "Revenue, costs, profit, margin and growth by month.", color: "#1e3a8a" },
  { id: "price-calculator", name: "Price calculator", desc: "Costs plus markup give the selling price, profit and tax.", color: "#7c3aed" },
  { id: "income-statement", name: "Income statement", desc: "Income, expenses, profit before tax and net profit.", color: "#0f766e" },
  { id: "blank-table-rose", name: "Titled table (rose)", desc: "A blank table with a title band and a total row.", color: "#db2777" },
  { id: "blank-table-sky", name: "Titled table (sky)", desc: "A blank table with a title band and a total row.", color: "#0284c7" },
  { id: "marketing-budget", name: "Marketing budget tracker", desc: "Planned and actual spend per campaign and channel.", color: "#16a34a" },
];

const HEAD = { b: true, fill: "#ece9ff", color: "#2a2373" }, TITLE = { b: true, color: "#2a2373" }, NOTE = { i: true, color: "#6a7389" }, TOTAL = { b: true, fill: "#f3f4fb" };
function sheet(name) {
  const s = { name, cells: {}, styles: {}, colW: {}, rowH: {}, charts: [] };
  const api = {
    s,
    row(r, values, style) { values.forEach((v, c) => { if (v !== null && v !== undefined && v !== "") s.cells[cellName(r, c)] = String(v); if (style) api.style(r, c, style); }); return api; },
    set(ref, v, style) { s.cells[ref] = String(v); if (style) s.styles[ref] = { ...(s.styles[ref] || {}), ...style }; return api; },
    style(r, c, st) { const k = cellName(r, c); s.styles[k] = { ...(s.styles[k] || {}), ...st }; return api; },
    styleRange(r1, c1, r2, c2, st) { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) api.style(r, c, st); return api; },
    widths(list) { list.forEach((w, c) => { if (w) s.colW[c] = w; }); return api; },
    height(r, px) { s.rowH[r] = px; return api; },
    /** Title band across columns 0..c2 of row 0 and a note in row 1. */
    title(text, c2, theme, note) {
      api.styleRange(0, 0, 0, c2, { fill: theme.band, color: theme.on || "#ffffff" }).set("A1", text, { b: true, size: 22, valign: "middle" }).height(0, 48);
      if (note) api.set("A2", note, { i: true, color: "#5b6478" });
      return api;
    },
    head(r, values, theme) { return api.row(r, values, { b: true, fill: theme.head, color: theme.ink, bd: "b", bc: theme.band }).height(r, 30); },
    zebra(r1, r2, c2, theme) { for (let r = r1; r <= r2; r++) if ((r - r1) % 2) api.styleRange(r, 0, r, c2, { fill: theme.zebra }); return api; },
    box(r1, c1, r2, c2, color = "#cbd5e1") { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) api.style(r, c, { bd: "trbl", bc: color }); return api; },
  };
  return api;
}

const BUILD = {
  budget() {
    const t = sheet("Budget").widths([210, 120, 120, 120, 110]);
    t.set("A1", "Monthly budget", { ...TITLE }).set("A2", "Amounts in Pakistani rupees (Rs). Change the blue numbers.", NOTE);
    t.row(3, ["Item", "Planned", "Actual", "Difference", "% of income"], HEAD);
    t.row(4, ["Income"], { b: true, color: "#14866d" });
    t.row(5, ["Salary", 150000, 150000, "=C6-B6"]).row(6, ["Freelance work", 20000, 25000, "=C7-B7"]);
    t.row(7, ["Total income", "=SUM(B6:B7)", "=SUM(C6:C7)", "=C8-B8"], TOTAL);
    t.row(9, ["Expenses"], { b: true, color: "#c0392b" });
    const items = [["House rent", 45000, 45000], ["Groceries", 30000, 32500], ["Electricity, gas and water", 12000, 11200], ["Transport and fuel", 10000, 9500], ["School fees", 15000, 15000], ["Mobile and internet", 3000, 2800], ["Medical", 5000, 2000], ["Savings", 20000, 20000], ["Other", 5000, 6100]];
    items.forEach(([n, p, a], i) => { const r = 10 + i; t.row(r, [n, p, a, `=B${r + 1}-C${r + 1}`, `=C${r + 1}/$C$8`]); });
    t.row(19, ["Total expenses", "=SUM(B11:B19)", "=SUM(C11:C19)", "=B20-C20", "=C20/C8"], TOTAL);
    t.row(21, ["Money left", "=B8-B20", "=C8-C20"], { b: true, fill: "#e6f7f2", color: "#14866d" });
    t.styleRange(5, 1, 21, 3, { fmt: "pkr" }).styleRange(10, 4, 19, 4, { fmt: "percent" });
    t.styleRange(5, 1, 6, 2, { color: "#1d4ed8" }).styleRange(10, 1, 18, 2, { color: "#1d4ed8" });
    return { name: "Monthly budget", sheets: [t.s] };
  },
  "invoice-list"() {
    const t = sheet("Invoices").widths([100, 190, 110, 110, 120, 90, 110, 30, 150, 130]);
    t.row(0, ["Invoice #", "Client", "Date", "Due date", "Amount (Rs)", "Status", "Days overdue"], HEAD);
    const rows = [["INV-1001", "Rehman Traders", "2026-09-02", 48000, "Paid"], ["INV-1002", "Bright Future School", "2026-09-10", 125000, "Paid"], ["INV-1003", "City Pharmacy", "2026-09-21", 36500, "Unpaid"], ["INV-1004", "Noor Textiles", "2026-10-01", 92000, "Paid"], ["INV-1005", "Green Valley Foods", "2026-10-08", 15750, "Unpaid"], ["INV-1006", "Star Mobiles", "2026-10-15", 64000, "Unpaid"], ["INV-1007", "Al-Madina Stores", "2026-10-27", 28900, "Paid"], ["INV-1008", "Sky Tech Solutions", "2026-11-03", 110000, "Unpaid"]];
    rows.forEach(([no, client, date, amt, status], i) => { const r = i + 1, R = r + 1; t.row(r, [no, client, date, `=C${R}+30`, amt, status, `=IF(F${R}="Paid",0,MAX(0,TODAY()-D${R}))`]); });
    t.styleRange(1, 2, 8, 3, { fmt: "date" }).styleRange(1, 4, 8, 4, { fmt: "pkr" });
    t.set("I1", "Total billed", { b: true }).set("J1", "=SUM(E2:E9)", { fmt: "pkr", b: true });
    t.set("I2", "Paid").set("J2", '=SUMIF(F2:F9,"Paid",E2:E9)', { fmt: "pkr", color: "#14866d" });
    t.set("I3", "Not paid yet").set("J3", '=SUMIF(F2:F9,"Unpaid",E2:E9)', { fmt: "pkr", color: "#c0392b" });
    t.set("I4", "Overdue invoices").set("J4", '=COUNTIFS(F2:F9,"Unpaid",G2:G9,">0")');
    return { name: "Invoice list", sheets: [t.s] };
  },
  attendance() {
    const t = sheet("Attendance").widths([150, ...Array(10).fill(44), 80, 80, 70, 110]);
    t.set("A1", "Class attendance, first two weeks", TITLE).set("A2", "P = present, A = absent, L = leave", NOTE);
    t.row(3, ["Student", ...Array.from({ length: 10 }, (_, i) => `Day ${i + 1}`), "Present", "Absent", "Leave", "Attendance"], HEAD);
    const names = ["Ayesha Khan", "Bilal Ahmed", "Fatima Noor", "Hamza Ali", "Sana Tariq", "Usman Raza", "Zainab Iqbal", "Omar Farooq"];
    const marks = ["PPPPPPPPPP", "PPAPPPLPPP", "PPPPPPPPAP", "APPPPAPPPP", "PPPPLLPPPP", "PPPPPPPPPP", "PAPPPPPPPA", "PPPPPPPAPP"];
    names.forEach((n, i) => { const r = 4 + i, R = r + 1; t.row(r, [n, ...marks[i].split(""), `=COUNTIF(B${R}:K${R},"P")`, `=COUNTIF(B${R}:K${R},"A")`, `=COUNTIF(B${R}:K${R},"L")`, `=L${R}/COUNTA(B${R}:K${R})`]); t.styleRange(r, 1, r, 10, { align: "center" }); });
    t.row(12, ["Present each day", ...Array.from({ length: 10 }, (_, c) => { const L = String.fromCharCode(66 + c); return `=COUNTIF(${L}5:${L}12,"P")`; })], TOTAL);
    t.styleRange(4, 14, 11, 14, { fmt: "percent" }).styleRange(12, 1, 12, 10, { align: "center" });
    return { name: "Attendance sheet", sheets: [t.s] };
  },
  "sales-tracker"() {
    const t = sheet("Sales").widths([110, 130, 100, 70, 120, 130, 30, 130, 130]);
    t.row(0, ["Date", "Product", "Region", "Units", "Unit price (Rs)", "Revenue (Rs)"], HEAD);
    const data = [["2026-10-01", "Tea pack", "Lahore", 120, 450], ["2026-10-03", "Cooking oil", "Karachi", 80, 1150], ["2026-10-06", "Rice 5kg", "Islamabad", 45, 1900], ["2026-10-09", "Sugar 1kg", "Lahore", 150, 160], ["2026-10-13", "Tea pack", "Karachi", 95, 450], ["2026-10-16", "Cooking oil", "Lahore", 110, 1150], ["2026-10-20", "Rice 5kg", "Karachi", 60, 1900], ["2026-10-23", "Sugar 1kg", "Islamabad", 130, 160], ["2026-10-27", "Tea pack", "Islamabad", 140, 450], ["2026-10-30", "Cooking oil", "Karachi", 70, 1150], ["2026-11-03", "Rice 5kg", "Lahore", 85, 1900], ["2026-11-06", "Sugar 1kg", "Karachi", 175, 160]];
    data.forEach(([d, p, reg, u, price], i) => { const R = i + 2; t.row(i + 1, [d, p, reg, u, price, `=D${R}*E${R}`]); });
    t.styleRange(1, 0, 12, 0, { fmt: "date" }).styleRange(1, 4, 12, 5, { fmt: "pkr" });
    t.row(13, ["Total", "", "", "=SUM(D2:D13)", "", "=SUM(F2:F13)"], TOTAL).style(13, 5, { fmt: "pkr" });
    t.set("H1", "Product", HEAD).set("I1", "Revenue (Rs)", HEAD);
    ["Tea pack", "Cooking oil", "Rice 5kg", "Sugar 1kg"].forEach((p, i) => { const R = i + 2; t.set(`H${R}`, p).set(`I${R}`, `=SUMIF(B$2:B$13,H${R},F$2:F$13)`, { fmt: "pkr" }); });
    t.set("H6", "Best seller", { b: true }).set("I6", "=INDEX(H2:H5,MATCH(MAX(I2:I5),I2:I5,0))", { b: true });
    t.s.charts.push({ kind: "bar", range: "H1:I5", title: "Revenue by product", at: "H8", w: 420, h: 260 });
    return { name: "Sales tracker", sheets: [t.s] };
  },
  "grade-sheet"() {
    const t = sheet("Grades").widths([150, 80, 80, 80, 90, 80, 100, 70, 60]);
    t.row(0, ["Student", "Maths", "English", "Science", "Computer", "Total", "Percentage", "Grade", "Rank"], HEAD);
    const st = [["Ayesha Khan", 92, 85, 88, 95], ["Bilal Ahmed", 67, 72, 58, 80], ["Fatima Noor", 78, 90, 84, 76], ["Hamza Ali", 55, 61, 49, 70], ["Sana Tariq", 88, 79, 91, 85], ["Usman Raza", 45, 52, 47, 58], ["Zainab Iqbal", 73, 68, 77, 82], ["Omar Farooq", 81, 87, 79, 90]];
    st.forEach(([n, ...m], i) => { const R = i + 2; t.row(i + 1, [n, ...m, `=SUM(B${R}:E${R})`, `=F${R}/400`, `=IFS(G${R}>=0.8,"A",G${R}>=0.7,"B",G${R}>=0.6,"C",G${R}>=0.5,"D",TRUE,"F")`, `=RANK(F${R},F$2:F$9)`]); });
    t.styleRange(1, 6, 8, 6, { fmt: "percent" }).styleRange(1, 7, 8, 8, { align: "center" });
    t.row(10, ["Class average", "=AVERAGE(B2:B9)", "=AVERAGE(C2:C9)", "=AVERAGE(D2:D9)", "=AVERAGE(E2:E9)", "=AVERAGE(F2:F9)", "=AVERAGE(G2:G9)"], TOTAL);
    t.row(11, ["Highest", "=MAX(B2:B9)", "=MAX(C2:C9)", "=MAX(D2:D9)", "=MAX(E2:E9)", "=MAX(F2:F9)", "=MAX(G2:G9)"], TOTAL);
    t.styleRange(10, 1, 10, 5, { fmt: "fixed2" }).styleRange(10, 6, 11, 6, { fmt: "percent" });
    t.set("A13", "Passed (50% or more)", { b: true }).set("B13", '=COUNTIF(G2:G9,">=0.5")');
    return { name: "Grade sheet", sheets: [t.s] };
  },
  inventory() {
    const t = sheet("Stock").widths([170, 90, 110, 80, 100, 110, 130, 90, 30, 150, 130]);
    t.row(0, ["Item", "SKU", "Category", "In stock", "Reorder level", "Unit cost (Rs)", "Stock value (Rs)", "Status"], HEAD);
    const items = [["Basmati rice 5kg", "RC-005", "Grocery", 42, 20, 1750], ["Cooking oil 1L", "OL-001", "Grocery", 15, 25, 560], ["Green tea 100g", "TE-100", "Beverages", 60, 30, 380], ["Dish soap 500ml", "CL-500", "Cleaning", 8, 15, 240], ["Notebook A4", "ST-A4N", "Stationery", 120, 50, 150], ["Ball pens (box)", "ST-BPX", "Stationery", 18, 20, 320], ["LED bulb 12W", "EL-12W", "Electrical", 35, 15, 290], ["Extension board", "EL-EXT", "Electrical", 6, 5, 1450], ["Hand wash 250ml", "CL-250", "Cleaning", 25, 20, 210], ["Biscuits family pack", "SN-FAM", "Snacks", 12, 24, 330]];
    items.forEach(([n, sku, cat, q, lvl, cost], i) => { const R = i + 2; t.row(i + 1, [n, sku, cat, q, lvl, cost, `=D${R}*F${R}`, `=IF(D${R}<=E${R},"Reorder","OK")`]); });
    t.styleRange(1, 5, 10, 6, { fmt: "pkr" }).styleRange(1, 7, 10, 7, { align: "center" });
    t.set("J1", "Total stock value", { b: true }).set("K1", "=SUM(G2:G11)", { fmt: "pkr", b: true });
    t.set("J2", "Items to reorder").set("K2", '=COUNTIF(H2:H11,"Reorder")', { color: "#c0392b", b: true });
    t.set("J3", "Units in stock").set("K3", "=SUM(D2:D11)", { fmt: "thousands" });
    return { name: "Inventory", sheets: [t.s] };
  },
  "inventory-tracker"() {
    const th = { band: "#f59e0b", head: "#fef3c7", ink: "#78350f", zebra: "#fffbeb" };
    const t = sheet("Inventory").widths([90, 180, 110, 140, 80, 100, 110, 130, 100]);
    t.title("Inventory tracker", 8, th, "Stock on hand, suppliers and reorder alerts. Change the blue numbers.");
    t.row(2, ["Total stock value", "", "Items to reorder", "", "Units in stock"], { b: true, color: th.ink });
    t.set("A4", "=SUM(H7:H16)", { fmt: "pkr", b: true, size: 18 }).set("C4", '=COUNTIF(I7:I16,"Reorder")', { b: true, size: 18, color: "#c2410c" }).set("E4", "=SUM(E7:E16)", { fmt: "thousands", b: true, size: 18 });
    t.height(3, 34);
    t.head(5, ["Item no.", "Item name", "Category", "Supplier", "In stock", "Reorder level", "Unit cost (Rs)", "Stock value (Rs)", "Status"], th);
    const items = [["IT-101", "Steel water bottle", "Kitchen", "Sitara Supplies", 48, 20, 650], ["IT-102", "Ceramic mug", "Kitchen", "Sitara Supplies", 12, 25, 380], ["IT-103", "Cotton towel", "Home", "Noor Textiles", 64, 30, 520], ["IT-104", "Desk lamp", "Electrical", "Bright Lights Co.", 9, 10, 1850], ["IT-105", "Notebook A5", "Stationery", "Paper House", 150, 60, 120], ["IT-106", "Gel pens, pack of 5", "Stationery", "Paper House", 22, 40, 260], ["IT-107", "Storage box", "Home", "Plastico", 31, 15, 740], ["IT-108", "Phone charger", "Electrical", "Volt Traders", 17, 20, 950], ["IT-109", "Hand soap 250ml", "Cleaning", "Fresh Care", 55, 30, 210], ["IT-110", "Floor cleaner 1L", "Cleaning", "Fresh Care", 8, 12, 480]];
    items.forEach(([no, n, cat, sup, q, lvl, cost], i) => { const r = 6 + i, R = r + 1; t.row(r, [no, n, cat, sup, q, lvl, cost, `=E${R}*G${R}`, `=IF(E${R}<=F${R},"Reorder","In stock")`]); });
    t.zebra(6, 15, 8, th).styleRange(6, 4, 15, 5, { color: "#1d4ed8" }).styleRange(6, 6, 16, 7, { fmt: "pkr" }).styleRange(6, 8, 15, 8, { align: "center" });
    t.row(16, ["Total", "", "", "", "=SUM(E7:E16)", "", "", "=SUM(H7:H16)"], { b: true, fill: th.head, bd: "t", bc: th.band });
    t.s.charts.push({ kind: "bar", cols: [1, 4], r1: 5, r2: 15, title: "Units in stock", at: "K6", w: 440, h: 290 });
    return { name: "Inventory tracker", sheets: [t.s] };
  },
  "budget-tracker"() {
    const th = { band: "#4f46e5", head: "#e0e7ff", ink: "#312e81", zebra: "#f5f7ff" };
    const t = sheet("Budget").widths([110, 100, 100, 100, 100, 100, 120, 110, 110]);
    t.title("Budget tracker", 8, th, "Six months of spending against the plan, in rupees. Change the blue numbers.");
    t.head(3, ["Month", "Rent", "Groceries", "Transport", "Bills", "Fun", "Total spent", "Budget", "Left over"], th);
    const data = [["Jan", 45000, 28000, 9000, 12500, 8000], ["Feb", 45000, 26500, 8500, 14200, 6000], ["Mar", 45000, 31000, 10200, 11800, 12500], ["Apr", 48000, 29500, 9800, 10900, 7000], ["May", 48000, 33000, 11000, 15600, 9500], ["Jun", 48000, 30500, 9300, 18200, 5500]];
    data.forEach((d, i) => { const r = 4 + i, R = r + 1; t.row(r, [...d, `=SUM(B${R}:F${R})`, 110000, `=H${R}-G${R}`]); });
    t.zebra(4, 9, 8, th).styleRange(4, 1, 9, 5, { color: "#1d4ed8" }).styleRange(4, 7, 9, 7, { color: "#1d4ed8" });
    t.row(10, ["Total", "=SUM(B5:B10)", "=SUM(C5:C10)", "=SUM(D5:D10)", "=SUM(E5:E10)", "=SUM(F5:F10)", "=SUM(G5:G10)", "=SUM(H5:H10)", "=SUM(I5:I10)"], { b: true, fill: th.head, bd: "t", bc: th.band });
    t.row(11, ["Average", "=AVERAGE(B5:B10)", "=AVERAGE(C5:C10)", "=AVERAGE(D5:D10)", "=AVERAGE(E5:E10)", "=AVERAGE(F5:F10)", "=AVERAGE(G5:G10)"], { i: true, color: "#475569" });
    t.styleRange(4, 1, 11, 8, { fmt: "thousands" });
    t.s.charts.push({ kind: "bar", cols: [0, 6, 7], r1: 3, r2: 9, title: "Spent against budget", at: "K4", w: 460, h: 290 });
    return { name: "Budget tracker", sheets: [t.s] };
  },
  "price-list"() {
    const th = { band: "#ea580c", head: "#ffedd5", ink: "#7c2d12", zebra: "#fff7ed" };
    const t = sheet("Prices").widths([70, 180, 80, 120, 130, 90, 80, 110]);
    t.title("Price list", 7, th, "Prices from 1 November 2026. Margins and stock status work out by themselves.");
    t.head(3, ["Code", "Item", "Unit", "Cost price (Rs)", "Selling price (Rs)", "Margin", "In stock", "Status"], th);
    const items = [["P-01", "Green tea 100g", "Box", 290, 380, 46], ["P-02", "Basmati rice 5kg", "Bag", 1650, 1950, 22], ["P-03", "Honey 500g", "Jar", 880, 1150, 8], ["P-04", "Olive oil 1L", "Bottle", 2100, 2650, 14], ["P-05", "Dates 1kg", "Pack", 950, 1250, 30], ["P-06", "Almonds 250g", "Pack", 820, 1050, 6], ["P-07", "Brown sugar 1kg", "Pack", 210, 260, 40], ["P-08", "Lentils 1kg", "Pack", 320, 395, 52], ["P-09", "Black pepper 100g", "Pack", 260, 340, 9], ["P-10", "Oats 500g", "Box", 480, 620, 18]];
    items.forEach(([code, n, unit, cost, price, stock], i) => { const r = 4 + i, R = r + 1; t.row(r, [code, n, unit, cost, price, `=IF(E${R}=0,0,(E${R}-D${R})/E${R})`, stock, `=IF(G${R}<10,"Low stock","Available")`]); });
    t.zebra(4, 13, 7, th).styleRange(4, 3, 13, 4, { fmt: "pkr" }).styleRange(4, 5, 13, 5, { fmt: "percent" }).styleRange(4, 7, 13, 7, { align: "center" }).box(3, 0, 13, 7, "#fed7aa");
    t.set("A16", "Average margin", { b: true }).set("F16", "=AVERAGE(F5:F14)", { fmt: "percent", b: true });
    t.set("A17", "Items low on stock", { b: true }).set("F17", '=COUNTIF(H5:H14,"Low stock")', { b: true, color: "#c2410c" });
    return { name: "Price list", sheets: [t.s] };
  },
  "monthly-budget"() {
    const th = { band: "#e11d48", head: "#ffe4e6", ink: "#881337", zebra: "#fff1f2" };
    const t = sheet("November").widths([170, 110, 110, 120, 120, 110, 110]);
    t.title("Monthly budget", 6, th, "November 2026, amounts in rupees. Change the blue numbers.");
    t.row(2, ["Income", 180000, "Spent", "=C16", "Saved", "=B3-D3"], { b: true, size: 15 }).height(2, 32);
    t.styleRange(2, 1, 2, 1, { fmt: "pkr", color: "#1d4ed8" }).styleRange(2, 3, 2, 3, { fmt: "pkr" }).styleRange(2, 5, 2, 5, { fmt: "pkr", color: "#047857" });
    t.head(4, ["Category", "Budget", "Spent", "Remaining", "Paid by", "Status", "Due date"], th);
    const rows = [["Rent", 50000, 50000, "Bank transfer", "2026-11-01"], ["Groceries", 30000, 32400, "Card", "2026-11-30"], ["Electricity", 9000, 8200, "Online", "2026-11-12"], ["Gas and water", 4000, 3600, "Online", "2026-11-14"], ["Transport", 12000, 10900, "Cash", "2026-11-30"], ["School fees", 18000, 18000, "Bank transfer", "2026-11-10"], ["Internet and mobile", 4500, 4500, "Card", "2026-11-08"], ["Eating out", 6000, 7800, "Card", "2026-11-30"], ["Health", 5000, 2300, "Cash", "2026-11-30"], ["Family and gifts", 8000, 6000, "Cash", "2026-11-25"]];
    rows.forEach(([n, b, sp, by, due], i) => { const r = 5 + i, R = r + 1; t.row(r, [n, b, sp, `=B${R}-C${R}`, by, `=IF(C${R}>B${R},"Over budget",IF(C${R}=B${R},"Used up","On track"))`, due]); });
    t.zebra(5, 14, 6, th).styleRange(5, 1, 15, 3, { fmt: "pkr" }).styleRange(5, 1, 14, 2, { color: "#1d4ed8" }).styleRange(5, 6, 14, 6, { fmt: "date" }).styleRange(5, 5, 14, 5, { align: "center" });
    t.row(15, ["Total", "=SUM(B6:B15)", "=SUM(C6:C15)", "=SUM(D6:D15)"], { b: true, fill: th.head, bd: "t", bc: th.band });
    t.s.charts.push({ kind: "pie", cols: [0, 2], r1: 4, r2: 14, title: "Where the money went", at: "I5", w: 420, h: 300 });
    return { name: "Monthly budget", sheets: [t.s] };
  },
  "balance-sheet"() {
    const th = { band: "#c026d3", head: "#fae8ff", ink: "#701a75", zebra: "#fdf4ff" };
    const t = sheet("Balance sheet").widths([210, 150, 130, 130, 120, 100]);
    t.title("Balance sheet", 5, th, "As at 30 June 2026, compared with last year. Amounts in rupees.");
    t.row(2, ["Total assets", "=C12", "Total liabilities", "=C17", "Check", '=IF(ROUND(C12-C23,0)=0,"Balanced","Not balanced")'], { b: true, color: th.ink });
    t.styleRange(2, 1, 2, 1, { fmt: "pkr" }).styleRange(2, 3, 2, 3, { fmt: "pkr" }).style(2, 5, { color: "#047857" });
    t.head(4, ["Account", "Type", "This year", "Last year", "Change", "Change %"], th);
    const lines = { 5: ["Cash in hand", "Current asset", 85000, 60000], 6: ["Bank balance", "Current asset", 640000, 520000], 7: ["Money owed by customers", "Current asset", 310000, 280000], 8: ["Stock", "Current asset", 455000, 400000], 9: ["Equipment", "Fixed asset", 900000, 950000], 10: ["Vehicles", "Fixed asset", 1200000, 1300000], 13: ["Money owed to suppliers", "Current liability", 270000, 300000], 14: ["Short-term loan", "Current liability", 150000, 200000], 15: ["Long-term loan", "Long-term liability", 800000, 950000], 18: ["Owner's capital", "Equity", 1500000, 1500000], 19: ["Retained profit", "Equity", 870000, 560000] };
    const totals = { 11: ["Total assets", "=SUM(C6:C11)", "=SUM(D6:D11)"], 16: ["Total liabilities", "=SUM(C14:C16)", "=SUM(D14:D16)"], 20: ["Total equity", "=SUM(C19:C20)", "=SUM(D19:D20)"], 22: ["Total liabilities and equity", "=C17+C21", "=D17+D21"] };
    t.row(12, ["Liabilities"], { b: true, color: th.ink }).row(17, ["Equity"], { b: true, color: th.ink });
    for (const [r, v] of Object.entries(lines)) { const R = +r + 1; t.row(+r, [...v, `=C${R}-D${R}`, `=IF(D${R}=0,0,E${R}/D${R})`]); }
    for (const [r, [n, a, b]] of Object.entries(totals)) { const R = +r + 1; t.row(+r, [n, "", a, b, `=C${R}-D${R}`, `=IF(D${R}=0,0,E${R}/D${R})`], { b: true, fill: th.head }); }
    t.styleRange(5, 2, 22, 4, { fmt: "thousands" }).styleRange(5, 5, 22, 5, { fmt: "percent" });
    t.s.charts.push({ kind: "bar", cols: [0, 2, 3], r1: 4, r2: 10, title: "Assets: this year and last year", at: "H5", w: 460, h: 290 });
    return { name: "Balance sheet", sheets: [t.s] };
  },
  "kpi-dashboard"() {
    const th = { band: "#1e3a8a", head: "#dbeafe", ink: "#1e3a8a", zebra: "#f1f5ff" };
    const t = sheet("Dashboard").widths([130, 130, 130, 130, 110, 110]);
    t.title("Financial KPI dashboard", 5, th, "Year 2026: revenue, costs and profit by month, in rupees.");
    t.row(2, ["Total revenue", "Total profit", "Average margin", "Best month", "Months growing"], { b: true, color: "#475569", fill: "#f8fafc" });
    t.row(3, ["=SUM(B8:B19)", "=SUM(D8:D19)", "=AVERAGE(E8:E19)", "=INDEX(A8:A19,MATCH(MAX(B8:B19),B8:B19,0))", '=COUNTIF(F9:F19,">0")'], { b: true, size: 17, color: th.ink, fill: "#f8fafc" }).height(3, 36);
    t.style(3, 0, { fmt: "thousands" }).style(3, 1, { fmt: "thousands" }).style(3, 2, { fmt: "percent" }).box(2, 0, 3, 4, "#bfdbfe");
    t.head(6, ["Month", "Revenue", "Costs", "Profit", "Margin", "Growth"], th);
    const rev = [820000, 790000, 860000, 910000, 880000, 950000, 1010000, 990000, 1060000, 1120000, 1090000, 1180000], cost = [610000, 600000, 640000, 660000, 650000, 690000, 720000, 715000, 750000, 790000, 770000, 820000];
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].forEach((m, i) => { const r = 7 + i, R = r + 1; t.row(r, [m, rev[i], cost[i], `=B${R}-C${R}`, `=IF(B${R}=0,0,D${R}/B${R})`, i ? `=B${R}/B${R - 1}-1` : ""]); });
    t.row(19, ["Total", "=SUM(B8:B19)", "=SUM(C8:C19)", "=SUM(D8:D19)", "=D20/B20"], { b: true, fill: th.head, bd: "t", bc: th.band });
    t.zebra(7, 18, 5, th).styleRange(7, 1, 19, 3, { fmt: "thousands" }).styleRange(7, 4, 19, 5, { fmt: "percent" });
    t.s.charts.push({ kind: "line", cols: [0, 1, 2], r1: 6, r2: 18, title: "Revenue and costs", at: "H3", w: 470, h: 270 });
    t.s.charts.push({ kind: "bar", cols: [0, 3], r1: 6, r2: 18, title: "Profit by month", at: "H15", w: 470, h: 250 });
    return { name: "Financial KPI dashboard", sheets: [t.s] };
  },
  "price-calculator"() {
    const th = { band: "#7c3aed", head: "#ede9fe", ink: "#4c1d95", zebra: "#faf5ff" };
    const t = sheet("Calculator").widths([170, 100, 100, 100, 100, 120, 90, 130, 110, 140]);
    t.title("Price calculator", 9, th, "Type your costs and markup; selling price, profit and price with tax work out by themselves.");
    t.row(2, ["Sales tax", 0.18, "", "Average profit", "=AVERAGE(I7:I14)", "", "Best profit", "=INDEX(A7:A14,MATCH(MAX(I7:I14),I7:I14,0))"], { b: true, color: th.ink });
    t.style(2, 1, { fmt: "percent", color: "#1d4ed8" }).style(2, 4, { fmt: "pkr" });
    t.head(5, ["Product", "Material (Rs)", "Labour (Rs)", "Packing (Rs)", "Shipping (Rs)", "Total cost (Rs)", "Markup", "Selling price (Rs)", "Profit (Rs)", "Price with tax (Rs)"], th);
    const p = [["Hand-made candle", 180, 120, 40, 60, 0.6], ["Leather wallet", 650, 400, 60, 90, 0.5], ["Scented soap", 90, 60, 25, 40, 0.8], ["Printed tote bag", 300, 150, 30, 70, 0.55], ["Clay planter", 220, 260, 50, 120, 0.45], ["Beaded bracelet", 120, 180, 20, 40, 0.9], ["Wooden coaster set", 260, 200, 35, 80, 0.5], ["Knitted scarf", 480, 520, 45, 90, 0.4]];
    p.forEach(([n, a, b, c, d, mk], i) => { const r = 6 + i, R = r + 1; t.row(r, [n, a, b, c, d, `=SUM(B${R}:E${R})`, mk, `=ROUND(F${R}*(1+G${R}),0)`, `=H${R}-F${R}`, `=ROUND(H${R}*(1+$B$3),0)`]); });
    t.row(14, ["Average", "", "", "", "", "=AVERAGE(F7:F14)", "=AVERAGE(G7:G14)", "=AVERAGE(H7:H14)", "=AVERAGE(I7:I14)", "=AVERAGE(J7:J14)"], { b: true, fill: th.head, bd: "t", bc: th.band });
    t.zebra(6, 13, 9, th).styleRange(6, 1, 14, 5, { fmt: "thousands" }).styleRange(6, 7, 14, 9, { fmt: "thousands" }).styleRange(6, 6, 14, 6, { fmt: "percent" }).styleRange(6, 1, 13, 4, { color: "#1d4ed8" }).styleRange(6, 6, 13, 6, { color: "#1d4ed8" });
    t.s.charts.push({ kind: "bar", cols: [0, 5, 7], r1: 5, r2: 13, title: "Cost and selling price", at: "L6", w: 460, h: 290 });
    return { name: "Price calculator", sheets: [t.s] };
  },
  "income-statement"() {
    const th = { band: "#0f766e", head: "#ccfbf1", ink: "#134e4a", zebra: "#f0fdfa" };
    const t = sheet("Income statement").widths([110, 220, 130, 130, 120, 100]);
    t.title("Income statement", 5, th, "For the year ended 30 June 2026. Amounts in rupees.");
    t.head(3, ["Section", "Item", "This year", "Last year", "Change", "Change %"], th);
    const L = [["Income", "Product sales", 4850000, 4310000], ["Income", "Service income", 1240000, 1050000], ["Income", "Subscriptions", 380000, 260000], ["", "Total income", "=SUM(C5:C7)", "=SUM(D5:D7)"], ["Expenses", "Cost of goods sold", 2620000, 2390000], ["Expenses", "Salaries", 1350000, 1210000], ["Expenses", "Rent", 420000, 400000], ["Expenses", "Marketing", 260000, 190000], ["Expenses", "Electricity and internet", 145000, 132000], ["", "Total expenses", "=SUM(C9:C13)", "=SUM(D9:D13)"], ["", "Operating profit", "=C8-C14", "=D8-D14"], ["Other", "Interest earned", 45000, 38000], ["Other", "Other income", 22000, 15000], ["", "Profit before tax", "=C15+C16+C17", "=D15+D16+D17"], ["Tax", "Income tax (15%)", "=ROUND(C18*0.15,0)", "=ROUND(D18*0.15,0)"], ["", "Net profit", "=C18-C19", "=D18-D19"]];
    L.forEach((v, i) => { const r = 4 + i, R = r + 1; t.row(r, [...v, `=C${R}-D${R}`, `=IF(D${R}=0,0,E${R}/D${R})`], v[0] ? null : { b: true, fill: th.head }); });
    t.style(19, 1, { size: 15 }).style(19, 2, { size: 15 }).styleRange(19, 0, 19, 5, { fill: th.band, color: "#ffffff" }).height(19, 30);
    t.styleRange(4, 2, 19, 4, { fmt: "thousands" }).styleRange(4, 5, 19, 5, { fmt: "percent" });
    t.s.charts.push({ kind: "bar", cols: [1, 2, 3], r1: 3, r2: 6, title: "Income: this year and last year", at: "H4", w: 440, h: 280 });
    return { name: "Income statement", sheets: [t.s] };
  },
  "blank-table-rose"() { return blankTable("Titled table", { band: "#db2777", head: "#fce7f3", ink: "#831843", zebra: "#fff5fa" }); },
  "blank-table-sky"() { return blankTable("Titled table", { band: "#0284c7", head: "#e0f2fe", ink: "#0c4a6e", zebra: "#f3faff" }); },
  "marketing-budget"() {
    const th = { band: "#16a34a", head: "#dcfce7", ink: "#14532d", zebra: "#f0fdf4" };
    const t = sheet("Marketing").widths([100, 120, 170, 130, 110, 110, 120, 120, 30, 120, 110, 110]);
    t.title("Marketing budget tracker", 7, th, "Planned and actual spend for each campaign, in rupees.");
    t.head(3, ["Date", "Channel", "Campaign", "Vendor", "Planned (Rs)", "Actual (Rs)", "Difference (Rs)", "Status"], th);
    const rows = [["2026-07-01", "Social media", "Summer sale posts", "Pixel Studio", 60000, 54500], ["2026-07-08", "Search ads", "Brand keywords", "AdReach", 80000, 86200], ["2026-07-15", "Print", "Flyers for shops", "Sharp Print", 25000, 23800], ["2026-07-22", "Radio", "Morning show spots", "City FM", 90000, 90000], ["2026-08-02", "Events", "Mall stall", "Expo Partners", 120000, 131500], ["2026-08-12", "Social media", "Short videos", "Pixel Studio", 45000, 39800], ["2026-08-20", "Search ads", "New product launch", "AdReach", 70000, 64300], ["2026-09-03", "Print", "Newspaper advert", "Daily Herald", 55000, 55000], ["2026-09-14", "Events", "School fair", "Expo Partners", 40000, 46200], ["2026-09-25", "Radio", "Weekend promo", "City FM", 35000, 31000]];
    rows.forEach(([d, ch, cp, v, pl, ac], i) => { const r = 4 + i, R = r + 1; t.row(r, [d, ch, cp, v, pl, ac, `=E${R}-F${R}`, `=IF(F${R}>E${R},"Over budget","Within budget")`]); });
    t.row(14, ["Total", "", "", "", "=SUM(E5:E14)", "=SUM(F5:F14)", "=SUM(G5:G14)"], { b: true, fill: th.head, bd: "t", bc: th.band });
    t.zebra(4, 13, 7, th).styleRange(4, 0, 13, 0, { fmt: "date" }).styleRange(4, 4, 14, 6, { fmt: "thousands" }).styleRange(4, 7, 13, 7, { align: "center" });
    t.row(3, [null, null, null, null, null, null, null, null, null, "Channel", "Planned", "Actual"]);
    t.styleRange(3, 9, 3, 11, { b: true, fill: th.band, color: "#ffffff" });
    ["Social media", "Search ads", "Print", "Radio", "Events"].forEach((ch, i) => { const r = 4 + i, R = r + 1; t.set(`J${R}`, ch).set(`K${R}`, `=SUMIF($B$5:$B$14,J${R},$E$5:$E$14)`, { fmt: "thousands" }).set(`L${R}`, `=SUMIF($B$5:$B$14,J${R},$F$5:$F$14)`, { fmt: "thousands" }); });
    t.box(3, 9, 8, 11, "#bbf7d0");
    t.s.charts.push({ kind: "bar", range: "J4:L9", title: "Planned and actual by channel", at: "J12", w: 440, h: 280 });
    return { name: "Marketing budget tracker", sheets: [t.s] };
  },
};

function blankTable(name, th) {
  const t = sheet("Table").widths([150, 120, 120, 120, 120, 120, 120, 120]);
  t.title("Title", 7, th);
  t.head(1, ["Column 1", "Column 2", "Column 3", "Column 4", "Column 5", "Column 6", "Column 7", "Column 8"], th);
  t.zebra(2, 16, 7, th).box(1, 0, 16, 7, th.head);
  t.row(17, ["Total", "=SUM(B3:B17)", "=SUM(C3:C17)", "=SUM(D3:D17)", "=SUM(E3:E17)", "=SUM(F3:F17)", "=SUM(G3:G17)", "=SUM(H3:H17)"], { b: true, fill: th.head, color: th.ink, bd: "t", bc: th.band });
  return { name, sheets: [t.s] };
}

export function buildTemplate(id) {
  const fn = BUILD[id];
  if (fn) return fn();
  const gen = buildGenerated(id) || buildStarter(id); // "<layout>~p<NN>~<theme>", "ins-…", "fx-…" (see gallery.js)
  if (!gen) throw new Error("Unknown template: " + id);
  return gen;
}
