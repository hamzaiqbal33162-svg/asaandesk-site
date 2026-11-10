// Ready-made sheets (all our own content and names). buildTemplate(id) → { name, sheets: [{ name, cells: { A1: input },
// styles: { A1: style }, colW: { col: px }, charts: [] }] }.
import { cellName } from "./formula.js";

export const TEMPLATES = [
  { id: "budget", name: "Monthly budget", desc: "Income, expenses and what is left, in rupees.", color: "#5b4cf0" },
  { id: "invoice-list", name: "Invoice list", desc: "Track bills, due dates, paid and unpaid.", color: "#ff7a59" },
  { id: "attendance", name: "Attendance sheet", desc: "Present, absent and leave for a class or team.", color: "#14b8a6" },
  { id: "sales-tracker", name: "Sales tracker", desc: "Daily sales with totals per product and a chart.", color: "#f59e0b" },
  { id: "grade-sheet", name: "Grade sheet", desc: "Marks, totals, percentages, grades and rank.", color: "#2f80ff" },
  { id: "inventory", name: "Inventory", desc: "Stock, reorder alerts and stock value.", color: "#a64bf4" },
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
};

export function buildTemplate(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error("Unknown template: " + id);
  return fn();
}
