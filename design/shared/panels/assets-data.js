// Elements kit › Charts, Tables and Sheets. Specs follow the insert interface (panels/index.js):
//   chart {kind: bar (horizontal) | column | line | area | pie | donut | progress | number, title, labels, series, …}
//   table {rows, cols, cells, header, style: {variant, color, head, stripe, border}, formulas?: {"C6": "=SUM(C2:C5)"},
//          sheet?: true}  (Sheets items are small ready-made spreadsheets: real numbers, totals as formulas)
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const Q = ["Q1", "Q2", "Q3", "Q4"];
const C = (id, name, tags, spec) => ({ id, name, tags: "chart graph data " + tags, spec: { name, ...spec } });

const BARS = [
  C("column", "Column chart", "column bar vertical", { kind: "column", labels: Q, series: [{ name: "Sales", values: [42, 58, 51, 74] }] }),
  C("column-2", "Grouped columns", "column grouped compare two series", { kind: "column", labels: Q, series: [{ name: "This year", values: [42, 58, 51, 74] }, { name: "Last year", values: [35, 41, 47, 60] }] }),
  C("column-stacked", "Stacked columns", "column stacked parts", { kind: "column", stacked: true, labels: Q, series: [{ name: "Online", values: [20, 28, 26, 38] }, { name: "Store", values: [18, 22, 19, 25] }, { name: "Partners", values: [6, 9, 8, 12] }] }),
  C("bar", "Bar chart", "bar horizontal ranking", { kind: "bar", labels: ["North", "South", "East", "West"], series: [{ name: "Customers", values: [68, 45, 82, 57] }] }),
  C("bar-2", "Grouped bars", "bar horizontal grouped compare", { kind: "bar", labels: ["Email", "Social", "Search", "Ads"], series: [{ name: "Visits", values: [40, 62, 75, 30] }, { name: "Sign-ups", values: [22, 30, 41, 12] }] }),
  C("bar-stacked", "Stacked bars", "bar horizontal stacked survey", { kind: "bar", stacked: true, labels: ["Price", "Quality", "Service", "Speed"], series: [{ name: "Agree", values: [55, 70, 62, 48] }, { name: "Neutral", values: [25, 18, 24, 30] }, { name: "Disagree", values: [20, 12, 14, 22] }] }),
];
const LINES = [
  C("line", "Line chart", "line trend growth time", { kind: "line", labels: MONTHS, series: [{ name: "Visitors", values: [120, 180, 160, 240, 290, 340] }] }),
  C("line-2", "Two lines", "line compare two series", { kind: "line", labels: MONTHS, series: [{ name: "2025", values: [120, 180, 160, 240, 290, 340] }, { name: "2024", values: [100, 130, 150, 170, 210, 230] }] }),
  C("line-3", "Three lines", "line three series compare", { kind: "line", labels: MONTHS, series: [{ name: "A", values: [30, 45, 40, 60, 72, 80] }, { name: "B", values: [20, 28, 35, 38, 50, 55] }, { name: "C", values: [10, 18, 22, 30, 28, 40] }] }),
  C("area", "Area chart", "area filled trend volume", { kind: "area", labels: MONTHS, series: [{ name: "Revenue", values: [30, 42, 38, 55, 68, 80] }] }),
  C("area-2", "Two areas", "area two series overlap", { kind: "area", labels: MONTHS, series: [{ name: "Revenue", values: [30, 42, 38, 55, 68, 80] }, { name: "Costs", values: [22, 26, 30, 33, 38, 42] }] }),
];
const PIES = [
  C("pie", "Pie chart", "pie share parts percentage", { kind: "pie", labels: ["Rent", "Salaries", "Marketing", "Other"], series: [{ name: "Budget", values: [30, 40, 18, 12] }] }),
  C("donut", "Donut chart", "donut ring share percentage", { kind: "donut", labels: ["Mobile", "Desktop", "Tablet"], series: [{ name: "Devices", values: [58, 34, 8] }] }),
  C("donut-single", "Single donut", "donut single percent goal", { kind: "donut", labels: ["Done", "Left"], series: [{ name: "Progress", values: [72, 28] }], colors: ["#14b8a6", "#e6f6f3"] }),
  C("pie-5", "Five-part pie", "pie five parts survey", { kind: "pie", labels: ["Very happy", "Happy", "Okay", "Unhappy", "No answer"], series: [{ name: "Survey", values: [35, 30, 18, 10, 7] }] }),
];
const PROGRESS = [
  C("ring", "Progress ring", "progress ring circle percent goal", { kind: "progress", value: 75, label: "Goal reached", labels: ["Goal reached", "Left"], series: [{ name: "Goal reached", values: [75, 100 - 75] }], style: "ring" }),
  C("progress-bar", "Progress bar", "progress bar line percent", { kind: "progress", value: 60, label: "Project", labels: ["Project", "Left"], series: [{ name: "Project", values: [60, 100 - 60] }], style: "bar", aspect: 3 }),
  C("gauge", "Gauge", "progress gauge semi half speedometer", { kind: "progress", value: 40, label: "Capacity", labels: ["Capacity", "Left"], series: [{ name: "Capacity", values: [40, 100 - 40] }], style: "semi", colors: ["#ff7a59"] }),
  C("ring-90", "Almost there ring", "progress ring percent nearly complete", { kind: "progress", value: 90, label: "Complete", labels: ["Complete", "Left"], series: [{ name: "Complete", values: [90, 100 - 90] }], style: "ring", colors: ["#14b8a6"] }),
];
const NUMBERS = [
  C("number", "Big number", "number stat kpi figure metric", { kind: "number", value: "1,250", label: "New customers", delta: "+12% this month" }),
  C("number-percent", "Percentage", "number percent stat satisfaction", { kind: "number", value: "98%", label: "Happy customers", colors: ["#14b8a6"] }),
  C("number-revenue", "Revenue figure", "number revenue money stat", { kind: "number", value: "48k", label: "Monthly revenue", delta: "+8%", colors: ["#ff7a59"] }),
  C("number-views", "Views", "number views reach stat", { kind: "number", value: "3.2M", label: "Video views", delta: "-3% vs last week", colors: ["#2f80ff"] }),
];
export const CHART_SECTIONS = [
  { id: "bars", label: "Bar and column charts", items: BARS },
  { id: "lines", label: "Line and area charts", items: LINES },
  { id: "pies", label: "Pie and donut charts", items: PIES },
  { id: "progress", label: "Progress", items: PROGRESS },
  { id: "numbers", label: "Numbers", items: NUMBERS },
];

// ---------- tables: rows of colours × styles, like Canva's Tables page
const TCOL = [["grey", "#6b7280"], ["coral", "#ef6a5a"], ["amber", "#f2b84b"], ["blue", "#4f7cf0"], ["violet", "#7c5cf0"], ["teal", "#14b8a6"]];
const tint = (hex, k) => { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return "#" + v.map((c) => Math.round(c + (255 - c) * k).toString(16).padStart(2, "0")).join(""); };
const empty = (r, c) => Array.from({ length: r }, () => Array(c).fill(""));
const T = (id, name, variant, color, extra = {}) => ({ id, name, tags: `table grid cells rows columns ${variant} ${name.toLowerCase()}`, spec: { name, rows: 4, cols: 3, cells: empty(4, 3), header: true, style: { variant, color, border: variant === "solid" ? "#fff" : color, ...extra } } });
export const TABLE_ITEMS = [
  ...TCOL.flatMap(([cn, c]) => [
    T(`${cn}-lines`, `${cn[0].toUpperCase() + cn.slice(1)} lines`, "lines", c),
    T(`${cn}-header`, `${cn[0].toUpperCase() + cn.slice(1)} header`, "header", c),
    T(`${cn}-solid`, `${cn[0].toUpperCase() + cn.slice(1)} blocks`, "solid", c, { stripe: tint(c, 0.62), stripe2: tint(c, 0.8) }),
  ]),
  ...TCOL.map(([cn, c]) => T(`${cn}-minimal`, `${cn[0].toUpperCase() + cn.slice(1)} minimal`, "minimal", c)),
];

// ---------- sheets: small ready-made spreadsheets (cells are values; formulas for the totals)
const S = (id, name, tags, cells, formulas = {}, colWidths) => ({ id, name, tags: "sheet spreadsheet data table " + tags, spec: { name, rows: cells.length, cols: cells[0].length, cells, header: true, sheet: true, formulas, colWidths, style: { variant: "sheet" } } });
export const SHEET_ITEMS = [
  S("budget", "Monthly budget", "budget money expenses finance", [["Item", "Category", "Cost"], ["Rent", "Home", "45000"], ["Groceries", "Food", "18000"], ["Electricity", "Bills", "7500"], ["Internet", "Bills", "3500"], ["Total", "", "74000"]], { C6: "=SUM(C2:C5)" }, [78, 64, 58]),
  S("sales", "Sales by month", "sales revenue months units", [["Month", "Units", "Revenue"], ["January", "120", "240000"], ["February", "135", "270000"], ["March", "160", "320000"], ["Total", "415", "830000"]], { B5: "=SUM(B2:B4)", C5: "=SUM(C2:C4)" }, [70, 50, 70]),
  S("grades", "Grade book", "grades marks students school average", [["Student", "Test 1", "Test 2", "Average"], ["Ali", "78", "84", "81"], ["Sara", "92", "88", "90"], ["Usman", "65", "73", "69"], ["Hina", "85", "91", "88"]], { D2: "=AVERAGE(B2:C2)", D3: "=AVERAGE(B3:C3)", D4: "=AVERAGE(B4:C4)", D5: "=AVERAGE(B5:C5)" }, [62, 46, 46, 52]),
  S("todo", "Task tracker", "tasks todo tracker status owner project", [["Task", "Owner", "Status"], ["Write brief", "Amna", "Done"], ["Design draft", "Bilal", "In progress"], ["Review", "Zara", "To do"], ["Publish", "Omar", "To do"]], {}, [76, 52, 70]),
  S("schedule", "Weekly schedule", "schedule week timetable plan", [["Day", "Morning", "Afternoon"], ["Monday", "Team call", "Design"], ["Tuesday", "Clients", "Writing"], ["Wednesday", "Design", "Review"], ["Thursday", "Planning", "Clients"], ["Friday", "Reports", "Free"]], {}, [66, 62, 62]),
  S("inventory", "Inventory", "inventory stock products shop", [["Product", "Stock", "Price"], ["Notebook", "120", "250"], ["Pen set", "340", "180"], ["Backpack", "45", "2400"], ["Water bottle", "80", "650"]], {}, [76, 44, 50]),
  S("prices", "Price list", "price list services menu rates", [["Service", "Price"], ["Logo design", "15000"], ["Social posts (10)", "8000"], ["Website page", "25000"], ["Brand kit", "30000"]], {}, [96, 60]),
  S("attendance", "Attendance", "attendance register present week", [["Name", "Mon", "Tue", "Wed", "Thu"], ["Ayesha", "✓", "✓", "✓", "✓"], ["Hamid", "✓", "✗", "✓", "✓"], ["Noor", "✓", "✓", "✗", "✓"], ["Faisal", "✓", "✓", "✓", "✗"]], {}, [56, 34, 34, 34, 34]),
  S("expenses", "Trip expenses", "trip travel expenses split", [["Expense", "Paid by", "Amount"], ["Hotel", "Ali", "36000"], ["Fuel", "Sara", "9000"], ["Meals", "Hina", "12500"], ["Total", "", "57500"]], { C5: "=SUM(C2:C4)" }, [62, 56, 58]),
  S("blank", "Blank sheet", "blank empty sheet grid", empty(6, 4), {}, [56, 56, 56, 56]),
];
