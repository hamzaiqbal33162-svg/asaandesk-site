// Starter sheets for Magic Insights (data sets to explore) and Magic Formulas (formula practice), 24 each.
// Pure module (no DOM). STARTERS = gallery entries; buildStarter(id) → workbook in the templates.js format.
import { PALETTES, PEOPLE, CITIES, rng } from "./tpl-data.js";

const colL = (c) => { let s = ""; for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const ref = (r, c) => colL(c) + (r + 1);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
const LABELS = {
  months: MONTHS,
  days: Array.from({ length: 14 }, (_, i) => iso(2026, 10, 1 + i)),
  weeks: Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`),
  cities: CITIES.slice(0, 8),
  people: PEOPLE.slice(0, 10),
};

// Magic Insights data sets: [slug, name, label heading, labels, [[column, low, high, decimals?, trend?]], chart]
const INS = [
  ["monthly-sales", "Monthly sales by region", "Month", "months", [["North (Rs)", 200000, 600000, 0, 1], ["South (Rs)", 180000, 520000, 0, 1], ["Central (Rs)", 150000, 450000]], "line"],
  ["website-visitors", "Website visitors", "Date", "days", [["Visitors", 800, 2600], ["Sign-ups", 20, 140]], "line"],
  ["class-marks", "Class marks", "Student", "people", [["Maths", 35, 98], ["English", 40, 95], ["Science", 30, 99]], "bar"],
  ["shop-daily-sales", "Shop daily sales", "Date", "days", [["Sales (Rs)", 18000, 65000], ["Customers", 40, 160]], "line"],
  ["clinic-visits", "Clinic patient visits", "Month", "months", [["Patients", 300, 900, 0, 1], ["New patients", 40, 160]], "line"],
  ["dish-orders", "Restaurant orders by dish", "Dish", ["Chicken karahi", "Beef biryani", "Daal tadka", "Garlic naan", "Grilled fish", "Mixed salad", "Mint lemonade", "Chocolate cake"], [["Orders", 40, 400], ["Revenue (Rs)", 20000, 380000]], "bar"],
  ["gym-members", "Gym members by month", "Month", "months", [["New members", 10, 80], ["Left", 2, 30]], "bar"],
  ["delivery-times", "Delivery times by city", "City", "cities", [["Average minutes", 25, 75], ["Late deliveries", 0, 25]], "bar"],
  ["survey-scores", "Customer survey scores", "Question", ["Staff were friendly", "Easy to find what I needed", "Fair prices", "Fast checkout", "Clean shop", "Good quality", "Would come again", "Would tell a friend"], [["Score out of 5", 2.8, 4.9, 1], ["Answers", 40, 200]], "bar"],
  ["electricity-use", "Electricity use", "Month", "months", [["Units (kWh)", 250, 900], ["Bill (Rs)", 9000, 52000]], "line"],
  ["fuel-spending", "Fuel spending", "Week", "weeks", [["Litres", 20, 60], ["Cost (Rs)", 5500, 17000]], "line"],
  ["crop-yield", "Crop yield by field", "Field", ["Field A", "Field B", "Field C", "Field D", "Field E", "Field F", "Field G", "Field H"], [["Wheat (maunds)", 20, 60], ["Cotton (maunds)", 10, 40]], "bar"],
  ["rainfall", "Rainfall by month", "Month", "months", [["Rainfall (mm)", 2, 250]], "bar"],
  ["app-downloads", "App downloads", "Week", "weeks", [["Downloads", 400, 3000, 0, 1], ["Uninstalls", 20, 300]], "line"],
  ["call-centre", "Call centre calls", "Date", "days", [["Calls", 120, 480], ["Answered in 1 minute", 80, 400]], "line"],
  ["hotel-bookings", "Hotel bookings", "Month", "months", [["Rooms booked", 120, 600], ["Average rate (Rs)", 6000, 14000]], "line"],
  ["exam-subjects", "Exam results by subject", "Subject", ["Maths", "English", "Urdu", "Science", "Computer", "History", "Geography", "Islamiat"], [["Average mark", 48, 88], ["Students passed", 20, 40]], "bar"],
  ["work-hours", "Team working hours", "Name", "people", [["Hours", 120, 190], ["Overtime", 0, 30]], "bar"],
  ["product-returns", "Product returns", "Product", ["Phone case", "Earbuds", "Charger", "Power bank", "Smart watch", "Laptop bag", "Mouse", "Keyboard"], [["Sold", 100, 900], ["Returned", 2, 60]], "bar"],
  ["social-followers", "Social media followers", "Month", "months", [["Followers", 1200, 9000, 0, 1], ["Posts", 8, 40]], "line"],
  ["online-orders", "Online orders by city", "City", "cities", [["Orders", 60, 800], ["Revenue (Rs)", 90000, 1400000]], "bar"],
  ["expense-categories", "Expenses by category", "Category", ["Rent", "Salaries", "Electricity", "Internet", "Transport", "Marketing", "Repairs", "Supplies"], [["Amount (Rs)", 5000, 90000]], "pie"],
  ["city-temperature", "Temperature by city", "City", "cities", [["High (°C)", 28, 46], ["Low (°C)", 8, 28]], "bar"],
  ["bus-riders", "Bus riders by route", "Route", ["Route 1", "Route 2", "Route 3", "Route 4", "Route 5", "Route 6", "Route 7", "Route 8"], [["Riders", 800, 5200], ["Trips", 20, 90]], "bar"],
];

// Magic Formulas practice sheets: { slug, name, how, head, rows (cells may hold "=…{R}…" with {R} = this row,
// {P} = row above), fcols: { col: "=…{R}…" } for every row, sum: [[label, formula or value, fmt]], extra: [[ref, value, style]] }
const P5 = PEOPLE.slice(0, 8);
const FX = [
  { slug: "sum-average", name: "SUM and AVERAGE", how: "=SUM(B5:B10) adds the prices; =AVERAGE(B5:B10) gives the average.", head: ["Item", "Price (Rs)"], rows: [["Notebook", 150], ["Pen pack", 260], ["School bag", 2400], ["Water bottle", 650], ["Lunch box", 900], ["Geometry box", 380]], sum: [["Total", "=SUM(B5:B10)", "thousands"], ["Average", "=AVERAGE(B5:B10)", "thousands"], ["Count", "=COUNT(B5:B10)"]] },
  { slug: "if-pass-fail", name: "IF: pass or fail", how: '=IF(B5>=50,"Pass","Fail") shows Pass when the marks are 50 or more.', head: ["Student", "Marks", "Result"], rows: P5.map((p, i) => [p, [78, 45, 91, 52, 38, 66, 49, 83][i]]), fcols: { 2: '=IF(B{R}>=50,"Pass","Fail")' }, sum: [["Passed", '=COUNTIF(C5:C12,"Pass")'], ["Failed", '=COUNTIF(C5:C12,"Fail")']] },
  { slug: "vlookup-prices", name: "VLOOKUP: find a price", how: "=VLOOKUP(A5,$G$5:$H$10,2,FALSE) looks up each item in the price list on the right.", head: ["Item", "Qty", "Price (Rs)", "Total (Rs)"], rows: [["Tea", 2], ["Sugar", 3], ["Rice", 1], ["Milk", 6], ["Bread", 2], ["Eggs", 1]], fcols: { 2: "=VLOOKUP(A{R},$G$5:$H$10,2,FALSE)", 3: "=B{R}*C{R}" }, sum: [["Bill total", "=SUM(D5:D10)", "thousands"]], extra: [["G4", "Price list", { b: true }], ["H4", "Price (Rs)", { b: true }], ["G5", "Tea"], ["H5", 900], ["G6", "Sugar"], ["H6", 165], ["G7", "Rice"], ["H7", 1950], ["G8", "Milk"], ["H8", 280], ["G9", "Bread"], ["H9", 170], ["G10", "Eggs"], ["H10", 400]] },
  { slug: "sumif-categories", name: "SUMIF: totals by category", how: '=SUMIF($B$5:$B$14,"Food",$C$5:$C$14) adds only the Food amounts.', head: ["Date", "Category", "Amount (Rs)"], rows: Array.from({ length: 10 }, (_, i) => [iso(2026, 11, 1 + i * 2), ["Food", "Transport", "Bills", "Food", "Shopping", "Transport", "Food", "Bills", "Shopping", "Food"][i], [2400, 800, 6500, 1800, 3200, 650, 2900, 4100, 2100, 1500][i]]), sum: [["Food", '=SUMIF($B$5:$B$14,"Food",$C$5:$C$14)', "thousands"], ["Transport", '=SUMIF($B$5:$B$14,"Transport",$C$5:$C$14)', "thousands"], ["Bills", '=SUMIF($B$5:$B$14,"Bills",$C$5:$C$14)', "thousands"], ["Shopping", '=SUMIF($B$5:$B$14,"Shopping",$C$5:$C$14)', "thousands"]], dates: [0] },
  { slug: "countif-attendance", name: "COUNTIF: attendance", how: '=COUNTIF(B5:B14,"Present") counts how many people were present.', head: ["Name", "Status"], rows: PEOPLE.slice(0, 10).map((p, i) => [p, i % 4 === 3 ? "Absent" : i % 5 === 4 ? "Leave" : "Present"]), sum: [["Present", '=COUNTIF(B5:B14,"Present")'], ["Absent", '=COUNTIF(B5:B14,"Absent")'], ["On leave", '=COUNTIF(B5:B14,"Leave")'], ["Attendance", '=COUNTIF(B5:B14,"Present")/COUNTA(B5:B14)', "percent"]] },
  { slug: "percent-change", name: "Percent change", how: "=C5/B5-1 shows how much this year changed from last year.", head: ["Month", "Last year (Rs)", "This year (Rs)", "Change"], rows: MONTHS.slice(0, 6).map((m, i) => [m, [120000, 135000, 128000, 150000, 162000, 158000][i], [131000, 129000, 149000, 171000, 166000, 184000][i]]), fcols: { 3: "=IF(B{R}=0,0,C{R}/B{R}-1)" }, fmts: { 1: "thousands", 2: "thousands", 3: "percent" }, sum: [["Average change", "=AVERAGE(D5:D10)", "percent"]] },
  { slug: "ifs-grades", name: "IFS: grades from marks", how: '=IFS(B5>=80,"A",B5>=70,"B",B5>=60,"C",TRUE,"F") picks the first grade that fits.', head: ["Student", "Marks", "Grade"], rows: P5.map((p, i) => [p, [88, 72, 64, 91, 55, 79, 68, 83][i]]), fcols: { 2: '=IFS(B{R}>=80,"A",B{R}>=70,"B",B{R}>=60,"C",TRUE,"F")' }, sum: [["A grades", '=COUNTIF(C5:C12,"A")'], ["Class average", "=AVERAGE(B5:B12)", "fixed2"]] },
  { slug: "index-match", name: "INDEX and MATCH lookup", how: "=INDEX(C5:C12,MATCH(B14,A5:A12,0)) finds the price of the code typed in B14.", head: ["Code", "Product", "Price (Rs)"], rows: ["P-101", "P-102", "P-103", "P-104", "P-105", "P-106", "P-107", "P-108"].map((c, i) => [c, ["Desk lamp", "Office chair", "Bookshelf", "Wall clock", "Table fan", "Kettle", "Iron", "Toaster"][i], [1850, 14500, 9800, 1200, 6500, 3200, 4100, 5600][i]]), sum: [["Code to find", "P-104"], ["Product", "=INDEX(B5:B12,MATCH(B14,A5:A12,0))"], ["Price", "=INDEX(C5:C12,MATCH(B14,A5:A12,0))", "thousands"]] },
  { slug: "discount", name: "Discount calculator", how: "=ROUND(B5*(1-C5),0) takes the discount off the price.", head: ["Item", "Price (Rs)", "Discount", "Sale price (Rs)"], rows: [["Shoes", 6500, 0.2], ["Jacket", 9800, 0.3], ["Shirt", 2800, 0.15], ["Watch", 12000, 0.1], ["Bag", 4500, 0.25], ["Scarf", 1600, 0.4]], fcols: { 3: "=ROUND(B{R}*(1-C{R}),0)" }, fmts: { 1: "thousands", 2: "percent", 3: "thousands" }, sum: [["You save", "=SUM(B5:B10)-SUM(D5:D10)", "thousands"]] },
  { slug: "days-between", name: "DAYS between dates", how: "=DAYS(C5,B5) counts the days from the start date to the end date.", head: ["Task", "Start", "End", "Days"], rows: [["Design", "2026-11-02", "2026-11-09"], ["Build", "2026-11-10", "2026-11-28"], ["Test", "2026-11-29", "2026-12-06"], ["Launch", "2026-12-07", "2026-12-09"], ["Review", "2026-12-10", "2026-12-17"], ["Holiday", "2026-12-20", "2027-01-02"]], fcols: { 3: "=DAYS(C{R},B{R})" }, dates: [1, 2], sum: [["Longest task", "=MAX(D5:D10)"], ["All days", "=SUM(D5:D10)"]] },
  { slug: "join-text", name: "Join text with &", how: '=A5&" "&B5 joins the first and last name with a space.', head: ["First name", "Last name", "Full name", "Email"], rows: [["Ayesha", "Khan"], ["Bilal", "Ahmed"], ["Fatima", "Noor"], ["Hamza", "Ali"], ["Sana", "Tariq"], ["Usman", "Raza"]], fcols: { 2: '=A{R}&" "&B{R}', 3: '=LOWER(A{R})&"."&LOWER(B{R})&"@example.com"' }, sum: [["Names", "=COUNTA(C5:C10)"], ["Longest name (letters)", "=MAX(LEN(C5),LEN(C6),LEN(C7),LEN(C8),LEN(C9),LEN(C10))"]] },
  { slug: "rounding", name: "ROUND, ROUNDUP, ROUNDDOWN", how: "=ROUND(B5,0) rounds to the nearest whole number; ROUNDUP and ROUNDDOWN always go one way.", head: ["Item", "Exact (Rs)", "ROUND", "ROUNDUP", "ROUNDDOWN"], rows: [["Electricity share", 2456.38], ["Taxi split", 733.5], ["Dinner split", 1249.75], ["Gift share", 416.67], ["Fuel share", 1987.2], ["Internet share", 583.33]], fcols: { 2: "=ROUND(B{R},0)", 3: "=ROUNDUP(B{R},0)", 4: "=ROUNDDOWN(B{R},0)" }, sum: [["Total exact", "=SUM(B5:B10)"], ["Total rounded", "=SUM(C5:C10)"]] },
  { slug: "max-min", name: "MAX and MIN", how: "=MAX(B5:B12) finds the highest number and =MIN(B5:B12) the lowest.", head: ["City", "Temperature (°C)"], rows: CITIES.slice(0, 8).map((c, i) => [c, [38, 35, 31, 33, 40, 42, 29, 24][i]]), sum: [["Hottest", "=MAX(B5:B12)"], ["Coolest", "=MIN(B5:B12)"], ["Hottest city", "=INDEX(A5:A12,MATCH(MAX(B5:B12),B5:B12,0))"]] },
  { slug: "running-total", name: "Running total", how: "=SUM($B$5:B5) keeps adding as you copy it down.", head: ["Day", "Sales (Rs)", "Running total (Rs)"], rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => [d, [12000, 15500, 9800, 18200, 21000, 26500, 14300][i]]), fcols: { 2: "=SUM($B$5:B{R})" }, fmts: { 1: "thousands", 2: "thousands" }, sum: [["Week total", "=SUM(B5:B11)", "thousands"]] },
  { slug: "weighted-average", name: "Weighted average", how: "=SUMPRODUCT(B5:B9,C5:C9)/SUM(B5:B9) counts each score by its weight.", head: ["Assessment", "Weight", "Score"], rows: [["Homework", 0.1, 92], ["Quiz", 0.15, 78], ["Project", 0.25, 85], ["Mid-term", 0.2, 71], ["Final exam", 0.3, 80]], fmts: { 1: "percent" }, sum: [["Weighted average", "=SUMPRODUCT(B5:B9,C5:C9)/SUM(B5:B9)", "fixed2"], ["Plain average", "=AVERAGE(C5:C9)", "fixed2"]] },
  { slug: "loan-instalment", name: "Loan instalment", how: "Monthly instalment = amount × r ÷ (1 − (1 + r)^−months), with r = yearly rate ÷ 12.", head: ["Input", "Value"], rows: [["Loan amount (Rs)", 500000], ["Yearly rate", 0.16], ["Years", 3]], fmts: {}, sum: [["Monthly instalment", "=ROUND(B5*(B6/12)/(1-(1+B6/12)^(-B7*12)),0)", "thousands"], ["Total paid", "=B9*B7*12", "thousands"], ["Total interest", "=B10-B5", "thousands"]], cellFmts: { B5: "thousands", B6: "percent" } },
  { slug: "age-from-date", name: "Age from date of birth", how: "=INT((DATE(2026,11,11)-B5)/365.25) gives the age in whole years on 11 Nov 2026.", head: ["Name", "Born on", "Age (years)"], rows: P5.slice(0, 6).map((p, i) => [p, ["1990-04-12", "1985-11-30", "2001-07-08", "1978-02-19", "1996-09-25", "2010-01-03"][i]]), fcols: { 2: "=INT((DATE(2026,11,11)-B{R})/365.25)" }, dates: [1], sum: [["Oldest", "=MAX(C5:C10)"], ["Average age", "=AVERAGE(C5:C10)", "fixed2"]] },
  { slug: "working-days", name: "Working days", how: "=NETWORKDAYS(B5,C5) counts Monday to Friday between two dates.", head: ["Project", "Start", "End", "Working days"], rows: [["Website", "2026-11-02", "2026-11-27"], ["Brochure", "2026-11-09", "2026-11-20"], ["Training", "2026-11-16", "2026-11-18"], ["Audit", "2026-12-01", "2026-12-15"], ["Move office", "2026-12-14", "2026-12-24"]], fcols: { 3: "=NETWORKDAYS(B{R},C{R})" }, dates: [1, 2], sum: [["Total working days", "=SUM(D5:D9)"]] },
  { slug: "rank-scores", name: "RANK: who came first", how: "=RANK(B5,$B$5:$B$12) gives 1 to the highest score.", head: ["Player", "Score", "Rank"], rows: P5.map((p, i) => [p, [340, 415, 298, 502, 377, 455, 310, 389][i]]), fcols: { 2: "=RANK(B{R},$B$5:$B$12)" }, sum: [["Winner", "=INDEX(A5:A12,MATCH(1,C5:C12,0))"], ["Top score", "=MAX(B5:B12)"]] },
  { slug: "tax-slabs", name: "Tax by income slab", how: "=IF(B5>200000,15%,IF(B5>100000,10%,5%)) picks the tax rate for each income.", head: ["Name", "Monthly income (Rs)", "Tax rate", "Tax (Rs)"], rows: P5.slice(0, 6).map((p, i) => [p, [85000, 145000, 260000, 98000, 310000, 120000][i]]), fcols: { 2: "=IF(B{R}>200000,0.15,IF(B{R}>100000,0.1,0.05))", 3: "=ROUND(B{R}*C{R},0)" }, fmts: { 1: "thousands", 2: "percent", 3: "thousands" }, sum: [["Total tax", "=SUM(D5:D10)", "thousands"]] },
  { slug: "profit-margin", name: "Profit and margin", how: "=C5-B5 is the profit and =D5/C5 the margin.", head: ["Product", "Cost (Rs)", "Price (Rs)", "Profit (Rs)", "Margin"], rows: [["Candle", 400, 640], ["Wallet", 1200, 1800], ["Soap", 215, 390], ["Tote bag", 550, 850], ["Planter", 650, 950], ["Bracelet", 360, 680]], fcols: { 3: "=C{R}-B{R}", 4: "=IF(C{R}=0,0,D{R}/C{R})" }, fmts: { 4: "percent" }, sum: [["Best margin", "=MAX(E5:E10)", "percent"], ["Total profit", "=SUM(D5:D10)", "thousands"]] },
  { slug: "currency-converter", name: "Currency converter", how: "=ROUND(A5/$F$5,2) turns rupees into dollars with the rate in F5.", head: ["Amount (Rs)", "US dollars", "Euros"], rows: [[5000], [12500], [28000], [75000], [150000], [400000]], fcols: { 1: "=ROUND(A{R}/$F$5,2)", 2: "=ROUND(A{R}/$F$6,2)" }, fmts: { 0: "thousands", 1: "number", 2: "number" }, sum: [["Total in dollars", "=SUM(B5:B10)", "number"]], extra: [["E4", "Rates", { b: true }], ["E5", "Rs per US dollar"], ["F5", 280, { color: "#1d4ed8" }], ["E6", "Rs per euro"], ["F6", 305, { color: "#1d4ed8" }]] },
  { slug: "unit-converter", name: "Unit converter", how: "=ROUND(A5*0.621371,2) turns kilometres into miles.", head: ["Kilometres", "Miles", "Metres"], rows: [[1], [5], [10], [21.1], [42.2], [100]], fcols: { 1: "=ROUND(A{R}*0.621371,2)", 2: "=A{R}*1000" }, fmts: { 2: "thousands" }, sum: [["Total miles", "=SUM(B5:B10)", "fixed2"]] },
  { slug: "compound-interest", name: "Compound interest", how: "Each year's closing amount = opening × (1 + rate); the rate is in F5.", head: ["Year", "Opening (Rs)", "Interest (Rs)", "Closing (Rs)"], rows: [1, 2, 3, 4, 5, 6, 7, 8].map((y, i) => [y, i ? "=D{P}" : 100000]), fcols: { 2: "=ROUND(B{R}*$F$5,0)", 3: "=B{R}+C{R}" }, fmts: { 1: "thousands", 2: "thousands", 3: "thousands" }, sum: [["Grown to", "=D12", "thousands"], ["Interest earned", "=D12-B5", "thousands"]], extra: [["E5", "Yearly rate"], ["F5", 0.12, { fmt: "percent", color: "#1d4ed8" }]] },
];

const pal = (i) => PALETTES[(i * 5 + 2) % PALETTES.length];
export const STARTERS = [
  ...INS.map(([slug, name, , , vals, chart], i) => ({ id: "ins-" + slug, name, tool: "magic-insights", section: "Data sets to explore", tags: ["insights", "data", "sample", chart], look: { p: pal(i), cols: 1 + vals.length + 1, chart: chart === "pie" ? "pie" : chart === "line" ? "line" : "bar", kpis: 0 } })),
  ...FX.map((f, i) => ({ id: "fx-" + f.slug, name: f.name, tool: "magic-formulas", section: "Formula practice", tags: ["formulas", "practice", "learn"], look: { p: pal(i + 7), cols: f.head.length + 1, chart: null, kpis: f.sum.length > 2 ? 3 : 0 } })),
];

function sheet(name, th) {
  const s = { name, cells: {}, styles: {}, colW: {}, rowH: {}, charts: [] };
  const t = {
    s,
    put(r, c, v, st) { if (v !== null && v !== undefined && v !== "") s.cells[ref(r, c)] = String(v); if (st) t.style(r, c, st); return t; },
    style(r, c, st) { const k = ref(r, c); s.styles[k] = { ...(s.styles[k] || {}), ...st }; return t; },
    at(a1, v, st) { const m = /^([A-Z]+)(\d+)$/.exec(a1); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return t.put(+m[2] - 1, c - 1, v, st); },
    title(text, c2, note) {
      for (let c = 0; c <= c2; c++) t.style(0, c, { fill: th.band, color: "#ffffff" });
      t.put(0, 0, text, { b: true, size: 22, valign: "middle" }); s.rowH[0] = 48;
      if (note) t.put(1, 0, note, { i: true, color: "#5b6478" });
      return t;
    },
    head(r, values) { values.forEach((v, c) => t.put(r, c, v, { b: true, fill: th.head, color: th.ink, bd: "b", bc: th.band })); s.rowH[r] = 30; return t; },
  };
  return t;
}

/** Builds a starter sheet ("ins-…" or "fx-…"), or null for other ids. */
export function buildStarter(id) {
  const meta = STARTERS.find((x) => x.id === id);
  if (!meta) return null;
  const P = meta.look.p, th = { band: P.band, head: P.head, ink: P.ink, zebra: P.zebra }, rnd = rng(id);
  if (id.startsWith("ins-")) {
    const [, name, labelHead, labels0, vals, chart] = INS.find((x) => "ins-" + x[0] === id);
    const labels = Array.isArray(labels0) ? labels0 : LABELS[labels0], n = labels.length, nc = vals.length;
    const t = sheet("Data", th);
    t.s.colW = { 0: labels0 === "days" ? 120 : 190, ...Object.fromEntries(vals.map((_, j) => [j + 1, 140])) };
    t.title(name, nc, "Sample data to explore: click inside the table, then press Magic Insights (✦) for totals, trends and chart ideas.");
    t.head(3, [labelHead, ...vals.map((v) => v[0])]);
    labels.forEach((lab, i) => {
      const r = 4 + i;
      t.put(r, 0, lab, labels0 === "days" ? { fmt: "date" } : null);
      vals.forEach(([, lo, hi, dec = 0, trend = 0], j) => {
        let v = lo + rnd() * (hi - lo);
        if (trend) v = lo + (hi - lo) * (0.15 + (0.8 * i) / Math.max(1, n - 1)) * (0.92 + rnd() * 0.16);
        v = dec ? Math.round(v * 10 ** dec) / 10 ** dec : hi > 5000 ? Math.round(v / 100) * 100 : Math.round(v);
        t.put(r, j + 1, v, hi >= 10000 ? { fmt: "thousands" } : null);
      });
      if (i % 2) for (let c = 0; c <= nc; c++) t.style(r, c, { fill: th.zebra });
    });
    const e = 4 + n; // last data row (Excel row number)
    const sums = [["Total", "SUM"], ["Average", "AVERAGE"], ["Highest", "MAX"], ["Lowest", "MIN"]];
    sums.forEach(([lab, fn], k) => {
      const r = 5 + n + k;
      t.put(r, 0, lab, { b: true, fill: th.head, color: th.ink });
      vals.forEach(([, , hi, dec = 0], j) => t.put(r, j + 1, `=${fn}(${colL(j + 1)}5:${colL(j + 1)}${e})`, { b: true, fill: th.head, ...(dec ? { fmt: "fixed2" } : hi >= 1000 || fn === "AVERAGE" ? { fmt: "thousands" } : {}) }));
    });
    const same = vals.every((v) => v[2] <= vals[0][2] * 3 && v[2] * 3 >= vals[0][2]);
    t.s.charts.push({ kind: chart, cols: chart === "pie" || !same ? [0, 1] : [0, ...vals.map((_, j) => j + 1)], r1: 3, r2: 3 + n, title: name, at: ref(3, nc + 2), w: 460, h: 290 });
    return { name, sheets: [t.s] };
  }
  const f = FX.find((x) => "fx-" + x.slug === id), nc = f.head.length, n = f.rows.length;
  const t = sheet("Practice", th);
  t.s.colW = Object.fromEntries(f.head.map((h, c) => [c, c ? Math.max(110, h.length * 9) : 190]));
  t.title(f.name, Math.max(nc - 1, 3), "Formula used: " + f.how);
  t.head(3, f.head);
  f.rows.forEach((row, i) => {
    const r = 4 + i, R = r + 1, sub = (v) => (typeof v === "string" ? v.replace(/\{R\}/g, R).replace(/\{P\}/g, R - 1) : v);
    const cells = [...row];
    for (const [c, tpl] of Object.entries(f.fcols || {})) cells[+c] = tpl;
    cells.forEach((v, c) => t.put(r, c, sub(v), { ...(f.fmts?.[c] ? { fmt: f.fmts[c] } : {}), ...((f.dates || []).includes(c) ? { fmt: "date" } : {}), ...(f.fcols?.[c] ? { color: th.ink, b: true } : {}), ...(i % 2 ? { fill: th.zebra } : {}) }));
  });
  for (const [a1, fmt] of Object.entries(f.cellFmts || {})) t.at(a1, f.rows[+a1.slice(1) - 5]?.[1], { fmt });
  f.sum.forEach(([lab, v, fmt], k) => { const r = 5 + n + k; t.put(r, 0, lab, { b: true }).put(r, 1, v, { b: true, fill: th.head, color: th.ink, ...(fmt ? { fmt } : {}) }); });
  for (const [a1, v, st] of f.extra || []) t.at(a1, v, st);
  return { name: f.name, sheets: [t.s] };
}
