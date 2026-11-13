// Whiteboard templates, part B: strategy canvases, planners, retros and team boards (own layouts and wording).
import { W, H, M, TOP, BOT, A, TI, N, NOTES, INK, GREY, SOFT, LINE, WHITE, th, tv, who, cap, low, nameOf, roleOf,
  txt, shape, note, pill, tag, link, line, pen, icon, badge, avatar, photo, board, panel, notesIn, columns, table, bar, fitSize, themed, sexOf } from "./templates-kit.js";
import { makeFrame } from "./model.js";

/** Columns of sections, each a card with a coloured header pill and sticky notes. cols: [name, accent, note colour, icon, notes, prompt]. */
export function colBoard(o) {
  const out = board(o);
  columns(o.cols.length, M, W - M, o.gap ?? 20).forEach(({ x, w }, i) => {
    const [name, c, nc, ic, items, prompt] = o.cols[i];
    const p = panel(x, TOP + 12, w, BOT - TOP - 12, name, { fill: c, icon: ic });
    out.push(...p.objs);
    let box = p;
    if (prompt) { out.push(txt(p.x + 2, p.y - 2, p.w, prompt, fitSize(prompt, p.w, 16, 11, false), { color: GREY })); box = { ...p, y: p.y + 30, h: p.h - 30 }; }
    out.push(...notesIn(box, items, { cols: o.ncols || 2, color: nc, size: o.size || 22, maxh: o.maxh }));
  });
  return out;
}
/** Four tinted quadrants: [letter or icon, title, prompt, accent, tint, note colour, notes]. */
export function quadBoard(o) {
  const out = board(o), x0 = o.x0 ?? M, y0 = o.y0 ?? TOP + 12, w = ((W - M) - x0 - 16) / 2, h = (BOT - y0 - 16) / 2;
  o.q.forEach(([mark, name, sub, c, t, nc, items], i) => {
    const x = x0 + (i % 2) * (w + 16), y = y0 + Math.floor(i / 2) * (h + 16);
    out.push(shape(x, y, w, h, { fill: t, stroke: t }));
    if (mark.length === 1) out.push(shape(x + 16, y + 16, 54, 54, { fill: c, stroke: c, text: mark, size: 30, bold: true, tc: WHITE }));
    else out.push(...badge(x + 16, y + 16, 54, mark, c));
    out.push(txt(x + 84, y + 16, w - 100, name, fitSize(name, w - 100, 26, 16), { bold: true }), txt(x + 86, y + 50, w - 100, sub, fitSize(sub, w - 100, 16, 11, false), { color: GREY }));
    const n = items.length, nw = Math.min(176, (w - 32 - (n - 1) * 14) / n);
    items.forEach((s, k) => out.push(note(x + 16 + k * (nw + 14), y + 86, nw, Math.min(nw, h - 102), s, nc, { size: 22 })));
  });
  return out;
}
/** A white card with a small icon badge and a bold title; returns { objs, x, y, w, h } (inner area under the title). */
export function card(x, y, w, h, title, ic, c, o = {}) {
  const objs = [shape(x, y, w, h, { fill: o.bg || WHITE, stroke: o.bg || LINE })];
  objs.push(...badge(x + 12, y + 12, 36, ic, c), txt(x + 56, y + 18, w - 66, title, fitSize(title, w - 66, 19, 12), { bold: true }));
  return { objs, x: x + 12, y: y + 58, w: w - 24, h: h - 70 };
}
const check = (x, y, text, done, c = A[5], w = 280) => [shape(x, y, 30, 30, { fill: done ? c : WHITE, stroke: done ? c : "#b8bdd0", sw: 2 }), ...(done ? [icon("check", x + 4, y + 4, 22, WHITE, 3)] : []), txt(x + 42, y + 3, w - 42, text, fitSize(text, w - 42, 19, 12, false), { color: done ? GREY : INK })];

export const BUILDERS_B = {
  "business-canvas"() {
    const T = tv("Business plan on a page", (t) => `${t}: business plan on a page`);
    const out = board({ name: T, title: T, sub: "Bright Bakes: nine boxes for the whole business", icon: "grid", acc: 0, chip: "Version 3" });
    const cell = (x, y, w, h, t, ic, c, items, nc) => { const k = card(x, y, w, h, t, ic, c); out.push(...k.objs, ...notesIn(k, items, { cols: w > 400 ? 3 : 1, color: nc, size: 18, maxh: 132 })); };
    const cw = 232, g = 10, xs = [0, 1, 2, 3, 4].map((i) => M + i * (cw + g)), yT = TOP + 12, hT = 420, hH = 205;
    const it = th(["Flour mill", "Delivery app", "Weekly menu", "Baking", "Ovens and van", "Fresh cakes delivered same day", "Loyalty app", "Instagram shop", "Office teams", "Families", "Ingredients, rent", "Cake sales", "Catering"], 0);
    cell(xs[0], yT, cw, hT, "Key partners", "link", A[0], [it[0], it[1]], N.lilac);
    cell(xs[1], yT, cw, hH, "Key activities", "gear", A[1], [it[2]], N.sky);
    cell(xs[1], yT + hH + g, cw, hH, "Key resources", "tool", A[1], [it[4]], N.sky);
    cell(xs[2], yT, cw, hT, "Value we give", "heart", A[4], [it[5], it[3]], N.pink);
    cell(xs[3], yT, cw, hH, "Relationships", "chat", A[2], [it[6]], N.mint);
    cell(xs[3], yT + hH + g, cw, hH, "Channels", "phone", A[2], [it[7]], N.mint);
    cell(xs[4], yT, W - M - xs[4], hT, "Customers", "users", A[3], [it[8], it[9]], N.yellow);
    cell(M, yT + hT + g, 595, BOT - yT - hT - g, "Costs", "money", A[4], [it[10], "Staff wages", "Packaging"], N.peach);
    cell(M + 605, yT + hT + g, W - M * 2 - 605, BOT - yT - hT - g, "Revenue", "chart", A[5], [it[11], it[12], "Baking classes"], N.lime);
    return out;
  },

  "stakeholder-map"() {
    const T = tv("Stakeholder map", (t) => `${t}: stakeholder map`);
    const out = board({ name: T, title: T, sub: "Who has power over the project, and how much they care", icon: "users", acc: 1, chip: "Project: New branch" });
    const x0 = 130, y0 = TOP + 12, w = (W - M - x0 - 12) / 2, h = (BOT - 50 - y0 - 12) / 2;
    const q = [["Keep satisfied", TI[3], A[3]], ["Manage closely", TI[4], A[4]], ["Monitor", TI[1], A[1]], ["Keep informed", TI[5], A[5]]];
    q.forEach(([n, t, c], i) => { const x = x0 + (i % 2) * (w + 12), y = y0 + Math.floor(i / 2) * (h + 12); out.push(shape(x, y, w, h, { fill: t, stroke: t }), pill(x + 14, y + 14, 220, 42, n, c, { size: 18 })); });
    out.push(line(x0 - 20, BOT - 40, x0 - 20, y0, { arrow: "end", stroke: INK, sw: 3 }), line(x0 - 20, BOT - 40, W - M, BOT - 40, { arrow: "end", stroke: INK, sw: 3 }));
    const pw = txt(M - 10, (y0 + BOT) / 2 - 12, 120, "Power", 20, { bold: true, align: "center" }); pw.rot = -90; out.push(pw, txt(x0, BOT - 30, W - M - x0, "Interest", 20, { bold: true, align: "center" }));
    const P = who(["Bank manager, Funding", "City office, Permits", "Shop owners, Neighbours", "Our staff, Team", "Regular customers, Buyers", "Local press, Media", "Suppliers, Stock", "Landlord, Building"]);
    const pos = [[0.2, 0.35, 0], [0.45, 0.62, 0], [0.62, 0.3, 1], [0.86, 0.6, 1], [0.7, 0.75, 3], [0.2, 0.75, 2], [0.42, 0.85, 2], [0.85, 0.28, 1]];
    P.forEach((p, i) => { const [fx, fy, qd] = pos[i], x = x0 + fx * (w * 2 + 12) - 28, y = y0 + fy * (h * 2 + 12) - 28; out.push(avatar(x, y, 56, p, A[(i + 1) % 6]), tag(x + 62, y + 12, nameOf(p), WHITE, { size: 17, h: 32 })); });
    return out;
  },

  "data-flow"() {
    const T = tv("Data flow diagram", (t) => `${t}: data flow`);
    const out = board({ name: T, title: T, sub: "How an online order moves through our systems", icon: "db", acc: 1, chip: "Level 1" });
    const ent = (x, y, t) => shape(x, y, 170, 88, { kind: "rect", fill: INK, stroke: INK, text: t, size: 20, bold: true, tc: WHITE });
    const proc = (x, y, t, c) => shape(x, y, 214, 118, { kind: "ellipse", fill: TI[c], stroke: A[c], sw: 3, text: t, size: 19, bold: true });
    const store = (x, y, t) => shape(x, y, 230, 64, { kind: "rect", fill: TI[3], stroke: A[3], sw: 3, text: t, size: 18, bold: true });
    const cust = ent(M, 410, "Customer"), bank = ent(650, 650, "Bank"), cour = ent(1070, 640, "Courier");
    const p1 = proc(290, 210, "1. Take the order", 0), p2 = proc(290, 590, "2. Check payment", 1), p3 = proc(850, 210, "3. Pack and send", 2);
    const d1 = store(570, 420, "D1  Orders"), d2 = store(870, 420, "D2  Stock");
    out.push(cust, bank, cour, p1, p2, p3, d1, d2);
    out.push(link(cust, p1, { text: "Order details" }), link(cust, p2, { text: "Payment" }), link(p1, d1, { text: "Save order" }), link(p2, bank, { text: "Card check" }));
    out.push(link(p2, d1, { text: "Paid" }), link(d1, p3, { text: "To pack" }), link(p3, d2, { text: "Update stock" }), link(p3, cour, { kind: "elbow", fromSide: "right", toSide: "top", text: "Delivery note" }));
    return out;
  },

  "daily-planner"() {
    const T = tv("Daily planner", (t) => `${t}: today's plan`);
    const out = board({ name: T, title: T, sub: "Wednesday, 12 November · make today count", icon: "clock", acc: 2, chip: "Focus: launch email", people: 0 });
    out.push(shape(M, TOP + 12, 470, BOT - TOP - 12, { fill: WHITE, stroke: LINE }), txt(M + 18, TOP + 26, 300, "Schedule", 22, { bold: true }));
    ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00", "4:00"].forEach((h, i) => { const y = 228 + i * 59; out.push(txt(M + 16, y + 6, 70, h, 16, { bold: true, color: GREY }), line(M + 88, y, M + 452, y, { stroke: LINE, sw: 1.5 })); });
    const blocks = th(["Team stand-up", "Write the launch email", "Lunch with Hina", "Supplier call", "Review the week's sales"], 0);
    [[0, 0.8, 1], [1, 2.6, 0], [4, 1, 3], [5.3, 1, 2], [7, 1.5, 4]].forEach(([s, d, c], i) => out.push(shape(M + 96, 232 + s * 59, 350, d * 59 - 8, { fill: TI[c], stroke: A[c], sw: 2, text: blocks[i], size: 18, bold: true })));
    const pr = card(530, TOP + 12, 370, 300, "Top 3 priorities", "star", A[3]);
    out.push(...pr.objs);
    th(["Send the launch email", "Approve the new prices", "Book the photographer"], 5).forEach((t, i) => out.push(shape(pr.x, pr.y + 8 + i * 72, 44, 44, { kind: "ellipse", fill: A[3], stroke: A[3], text: String(i + 1), size: 20, bold: true, tc: WHITE }), txt(pr.x + 56, pr.y + 18 + i * 72, 280, t, fitSize(t, 280, 19, 12), { bold: true })));
    out.push(...notesIn({ x: 530, y: 494, w: 370, h: 270 }, th(["Call the bank before 12", "Gym at 6:30 pm"], 8), { cols: 2, color: [N.yellow, N.pink], size: 22 }));
    const td = card(920, TOP + 12, 320, BOT - TOP - 12, "To do", "checkCircle", A[5]);
    out.push(...td.objs);
    th(["Reply to emails", "Order printer paper", "Update the website", "Pay the electricity bill", "Plan Friday's post", "Water the plants", "Read 20 pages"], 1).forEach((t, i) => out.push(...check(td.x + 4, td.y + 10 + i * 72, t, i < 3, A[5], 290)));
    return out;
  },

  "budget-plan"() {
    const T = tv("Monthly budget", (t) => `${t}: budget plan`);
    const out = board({ name: T, title: T, sub: "November · money in, money out and what we save", icon: "money", acc: 5, chip: "PKR", people: 0 });
    const k = [["Income", "250,000", A[5]], ["Spending", "182,500", A[4]], ["Left over", "67,500", A[1]], ["Saved so far", "60%", A[0]]];
    columns(4).forEach(({ x, w }, i) => out.push(shape(x, TOP + 12, w, 100, { fill: WHITE, stroke: LINE }), shape(x, TOP + 12, 8, 100, { kind: "rect", fill: k[i][2], stroke: k[i][2] }), txt(x + 24, TOP + 26, w - 30, k[i][0], 17, { color: GREY }), txt(x + 24, TOP + 52, w - 30, k[i][1], 38, { bold: true })));
    const rows = th(["Rent", "Groceries", "School fees", "Transport", "Bills", "Eating out"], 0);
    const amt = [70000, 38000, 30000, 18000, 16500, 10000];
    const mo = card(M, 292, 580, BOT - 292, "Money out", "cart", A[4]);
    out.push(...mo.objs);
    rows.forEach((r, i) => { const y = mo.y + 6 + i * 66; out.push(txt(mo.x + 4, y + 8, 170, r, 19, { bold: true }), ...bar(mo.x + 180, y + 6, 250, 30, amt[i] / 70000, A[i % 6]), txt(mo.x + 444, y + 8, 110, amt[i].toLocaleString("en-US"), 18, { align: "right", color: GREY })); });
    const sv = card(640, 292, 600, 220, "Savings goal: new laptop", "target", A[0]);
    out.push(...sv.objs, ...bar(sv.x, sv.y + 30, 440, 40, 0.6, A[0], { label: "60%" }), txt(sv.x, sv.y + 90, 560, "PKR 120,000 of 200,000 · on track for February", 18, { color: GREY }));
    out.push(...notesIn({ x: 640, y: 530, w: 600, h: 234 }, th(["Cook at home on weekdays", "Cancel the unused app", "Sell the old bike"], 3), { cols: 3, color: [N.mint, N.yellow, N.sky], size: 22 }));
    return out;
  },

  "value-chain"() {
    const T = tv("Value chain", (t) => `${t}: value chain`);
    const out = board({ name: T, title: T, sub: "Where our business adds value, from supplier to customer", icon: "layers", acc: 0, chip: "Strategy" });
    const sup = th(["Company: planning, finance, legal", "People: hiring and training", "Technology: ordering app, website", "Buying: flour, packaging, gas"], 0);
    sup.forEach((s, i) => out.push(shape(M, TOP + 14 + i * 70, 1000, 60, { fill: TI[i % 6], stroke: A[i % 6], sw: 2, text: s, size: 19, bold: true })));
    out.push(txt(M, 462, 600, "Main activities", 20, { bold: true, color: GREY }));
    const pri = th(["Inbound", "Baking", "Delivery", "Sales and marketing", "Service"], 4), ex = th(["Fresh flour every Monday", "120 cakes a day", "Same-day in the city", "Instagram + offices", "Free replacement"], 6);
    pri.forEach((p, i) => { const x = M + i * 204; const b = shape(x, 494, 190, 92, { fill: A[i % 6], stroke: A[i % 6], text: p, size: 19, bold: true, tc: WHITE }); out.push(b, note(x, 604, 190, 150, ex[i], NOTES[i % 7], { size: 20 })); if (i) out.push(line(x - 14, 540, x - 2, 540, { arrow: "end", stroke: INK, sw: 3 })); });
    out.push(shape(1060, TOP + 14, 180, 412, { fill: INK, stroke: INK, text: "Margin\n+18%", size: 30, bold: true, tc: WHITE }));
    out.push(note(1060, 604, 180, 150, "Cut waste by 10%", N.lime, { size: 22 }));
    return out;
  },

  storyboard() {
    const T = tv("Video storyboard", (t) => `${t}: video storyboard`);
    const out = board({ name: T, title: T, sub: "30-second ad · six scenes, about five seconds each", icon: "camera", acc: 4, chip: "Shoot: 20 Nov" });
    const scenes = th(["Morning light over the city", "Coffee is poured at the counter", "The team plans the day", "Fresh food comes out of the kitchen", "Friends share a table", "Logo and offer at sunset"], 0);
    const topics = ["city skyline", "coffee", "office workspace meeting", "food kitchen", "food restaurant friends", "sky sunset"], used = [];
    scenes.forEach((s, i) => {
      const x = M + (i % 3) * 404, y = TOP + 12 + Math.floor(i / 3) * 300, w = 388;
      out.push(shape(x, y, w, 288, { fill: WHITE, stroke: LINE }), ...photo(x + 12, y + 12, w - 24, 196, topics[i], { slot: i, card: false, used, exclude: used.slice() }));
      out.push(shape(x + 22, y + 22, 40, 40, { kind: "ellipse", fill: A[4], stroke: WHITE, sw: 3, text: String(i + 1), size: 18, bold: true, tc: WHITE }));
      out.push(txt(x + 14, y + 220, w - 110, s, fitSize(s, w - 110, 19, 13), { bold: true }), tag(x + w - 82, y + 220, "0:" + String(i * 5).padStart(2, "0"), TI[4], { size: 15 }), txt(x + 14, y + 252, w - 30, ["Wide shot, slow push in", "Close-up, steam and sound", "Hand-held, natural light", "Top view, quick cuts", "Medium shot, laughter", "Text appears, music ends"][i], 15, { color: GREY }));
    });
    return out;
  },

  "project-update"() {
    const T = tv("Project update", (t) => `${t}: project update`);
    const out = board({ name: T, title: T, sub: "Website relaunch · status at a glance for the team", icon: "chart", acc: 1, chip: "Week 46" });
    const k = [["Done", "12", A[5], "checkCircle"], ["In progress", "5", A[1], "clock"], ["Blocked", "2", A[4], "alert"], ["Next up", "6", A[3], "flag"]];
    const cs = columns(4);
    cs.forEach(({ x, w }, i) => out.push(shape(x, TOP + 12, w, 96, { fill: WHITE, stroke: LINE }), ...badge(x + 16, TOP + 30, 58, k[i][3], k[i][2]), txt(x + 88, TOP + 22, w - 96, k[i][1], 40, { bold: true }), txt(x + 90, TOP + 72, w - 96, k[i][0], 17, { color: GREY })));
    out.push(txt(M, 296, 300, "Overall progress", 19, { bold: true }), ...bar(M + 190, 294, 900, 30, 0.68, A[1], { label: "68%" }));
    const lists = [th(["Home page design", "New photos", "Product pages", "Checkout tested"], 0), th(["Blog import", "Speed fixes", "Email sign-up"], 4), th(["Payment gateway", "Domain transfer"], 7), th(["Launch post", "Staff training", "Final check"], 9)];
    cs.forEach(({ x, w }, i) => { const p = panel(x, 344, w, BOT - 344, k[i][0], { fill: k[i][2], icon: k[i][3] }); out.push(...p.objs, ...notesIn(p, lists[i], { cols: 1, color: [N.mint, N.sky, N.pink, N.yellow][i], size: 20, maxh: 74 })); });
    return out;
  },

  "quarterly-plan"() {
    const T = tv("Quarterly plan 2027", (t) => `${t}: quarterly plan`);
    return colBoard({ name: T, title: T, sub: "One big goal and the milestones for each quarter", icon: "target", acc: 0, chip: "2027", ncols: 1, size: 20, maxh: 104,
      cols: [["Q1 · Jan–Mar", A[0], N.lilac, "flag", th(["Goal: launch the app", "Beta with 200 users", "Fix top 10 issues", "Press kit ready"], 0), "Build"],
        ["Q2 · Apr–Jun", A[1], N.sky, "rocket", th(["Goal: 5,000 users", "Referral program", "Two city partners", "Hire 2 engineers"], 4), "Grow"],
        ["Q3 · Jul–Sep", A[2], N.mint, "chart", th(["Goal: break even", "Paid plans live", "Cut costs by 10%", "Monthly reports"], 8), "Earn"],
        ["Q4 · Oct–Dec", A[3], N.yellow, "trophy", th(["Goal: second city", "Hire a city lead", "Local events", "Plan 2028"], 2), "Expand"]] });
  },

  "chore-chart"() {
    const T = tv("Family chore chart", (t) => `${t}: chore chart`);
    const out = board({ name: T, title: T, sub: "Who does which job each day · a star when it is done", icon: "home", acc: 3, chip: "This week", people: 0 });
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], tw = 250, cw = 120;
    out.push(...table(M, TOP + 12, [tw, ...Array(7).fill(cw), 110], 50, [["Job", ...days, "Who"]], { acc: INK }));
    const jobs = th(["Make the beds", "Set the table", "Feed the cat", "Water the plants", "Take out the bins", "Tidy the toys", "Fold the laundry"], 0);
    const kids = who(["Zara", "Ali", "Hamza", "Noor"]).map(nameOf);
    jobs.forEach((j, r) => {
      const y = TOP + 62 + r * 75;
      out.push(shape(M, y, tw + cw * 7 + 110, 75, { kind: "rect", fill: r % 2 ? WHITE : "#f6f7fb", stroke: LINE, sw: 1 }), txt(M + 16, y + 26, tw - 20, j, 19, { bold: true }));
      days.forEach((_, d) => { if ((r * 3 + d) % 4 !== 3) out.push(icon("star", M + tw + d * cw + 40, y + 18, 38, (r + d) % 3 ? A[3] : "#d5d9e6", 2.5)); });
      out.push(avatar(M + tw + cw * 7 + 30, y + 12, 50, kids[r % 4], A[(r + 1) % 6], { sw: 2, kind: themed() ? undefined : `child kids ${sexOf(kids[r % 4]) === "f" ? "girl" : "boy"}` }));
    });
    return out;
  },

  "lean-canvas"() {
    const T = tv("Lean canvas", (t) => `${t}: lean canvas`);
    const out = board({ name: T, title: T, sub: "LunchBox: healthy office lunches, ordered by 11 am", icon: "rocket", acc: 4, chip: "Startup idea" });
    const cell = (x, y, w, h, t, ic, c, items, nc) => { const k = card(x, y, w, h, t, ic, c); out.push(...k.objs, ...notesIn(k, items, { cols: w > 400 ? 3 : 1, color: nc, size: 18, maxh: 128 })); };
    const cw = 232, g = 10, xs = [0, 1, 2, 3, 4].map((i) => M + i * (cw + g)), yT = TOP + 12, hT = 420, hH = 205;
    const it = th(["Lunch takes too long", "Food is unhealthy", "Weekly menu, delivered at 1 pm", "Orders per office", "Healthy lunch in 2 taps", "Chef-approved menus", "Office managers", "LinkedIn, office visits", "Teams of 10 to 200", "Kitchen and riders", "Monthly office plans"], 0);
    cell(xs[0], yT, cw, hT, "Problem", "alert", A[4], [it[0], it[1]], N.pink);
    cell(xs[1], yT, cw, hH, "Solution", "bulb", A[0], [it[2]], N.lilac);
    cell(xs[1], yT + hH + g, cw, hH, "Key metrics", "chart", A[0], [it[3]], N.lilac);
    cell(xs[2], yT, cw, hT, "Unique value", "star", A[3], [it[4], "Same price as a cafe"], N.yellow);
    cell(xs[3], yT, cw, hH, "Unfair advantage", "shield", A[2], [it[5]], N.mint);
    cell(xs[3], yT + hH + g, cw, hH, "Channels", "phone", A[2], [it[7]], N.mint);
    cell(xs[4], yT, W - M - xs[4], hT, "Customers", "users", A[1], [it[6], it[8]], N.sky);
    cell(M, yT + hT + g, 595, BOT - yT - hT - g, "Costs", "money", A[4], [it[9], "Packaging", "App upkeep"], N.peach);
    cell(M + 605, yT + hT + g, W - M * 2 - 605, BOT - yT - hT - g, "Revenue", "trend", A[5], [it[10], "Catering days", "Snack boxes"], N.lime);
    return out;
  },

  affinity() {
    const T = tv("Customer feedback themes", (t) => `${t}: feedback themes`);
    const out = board({ title: T, sub: "Affinity map: 12 comments from our survey, sorted into groups", icon: "grid", acc: 0, chip: "Survey · Oct", frame: false });
    const groups = [["Speed", A[3], N.yellow, "bolt", ["Pages load slowly", "Checkout takes long", "Search is slow"]], ["Ease of use", A[1], N.sky, "user", ["Too many steps", "Menu is confusing", "Hard to find help"]],
      ["Price", A[4], N.pink, "money", ["Shipping costs", "Wants a bundle", "Student discount?"]], ["Wishes", A[5], N.mint, "star", ["Dark mode", "Save for later", "Gift wrapping"]]];
    groups.forEach(([name, c, nc, ic, notes], g) => {
      const x = M + (g % 2) * 610, y = g < 2 ? TOP + 12 : 484, w = 590, h = 280;
      const f = makeFrame({ x, y, w, h, name, fill: TI[[3, 1, 4, 5][g]] }); f.stroke = c;
      out.unshift(f);
      out.push(pill(x + 16, y + 16, 200, 46, name, c, { size: 20 }), icon(ic, x + 30, y + 27, 24, WHITE), tag(x + w - 96, y + 26, `${notes.length} notes`, WHITE, { size: 14 }));
      th(notes, g * 3).forEach((t, i) => out.push(note(x + 16 + i * 190, y + 80, 176, 176, t, nc, { size: 23 })));
    });
    return out;
  },

  sailboat() {
    const T = tv("Sailboat retrospective", (t) => `${t}: sailboat retro`);
    const out = board({ name: T, title: T, sub: "What pushes us, what holds us back, and what is ahead", icon: "anchor", acc: 1, chip: "Sprint 14" });
    out.push(shape(M, 470, W - M * 2, BOT - 470, { kind: "rect", fill: TI[1], stroke: TI[1] }));
    out.push(shape(450, 410, 280, 70, { fill: INK, stroke: INK, text: "Our team", size: 20, bold: true, tc: WHITE }), line(590, 200, 590, 410, { stroke: INK, sw: 5 }), shape(470, 216, 116, 180, { kind: "triangle", fill: WHITE, stroke: INK, sw: 3 }), shape(596, 236, 100, 160, { kind: "triangle", fill: A[3], stroke: A[3] }));
    out.push(line(560, 480, 560, 640, { stroke: "#475069", sw: 3, dash: true }), ...badge(530, 640, 60, "anchor", INK, WHITE, { circle: true }));
    out.push(shape(1000, 230, 240, 100, { kind: "ellipse", fill: TI[3], stroke: A[3], sw: 2 }), ...badge(1094, 254, 52, "flag", A[5], WHITE, { circle: true }));
    [[820, 570, 120, 70], [900, 630, 90, 56], [770, 640, 80, 50]].forEach(([x, y, w, h]) => out.push(shape(x, y, w, h, { kind: "ellipse", fill: "#8a91a5", stroke: "#6a7389" })));
    const lab = (x, y, t, ic, c) => [...badge(x, y, 40, ic, c, WHITE, { circle: true }), txt(x + 50, y + 8, 260, t, 19, { bold: true })];
    out.push(...lab(M + 6, 180, "Wind: what helps us", "wind", A[5]), ...notesIn({ x: M + 6, y: 232, w: 380, h: 170 }, th(["Clear goals this sprint", "Great design support"], 0), { cols: 2, color: N.mint, size: 21 }));
    out.push(...lab(M + 20, 494, "Anchors: what slows us", "anchor", A[4]), ...notesIn({ x: M + 20, y: 546, w: 400, h: 200 }, th(["Waiting on approvals", "Too many meetings"], 2), { cols: 2, color: N.pink, size: 21 }));
    out.push(...lab(760, 494, "Rocks: risks ahead", "alert", A[3]), ...notesIn({ x: 1040, y: 494, w: 200, h: 250 }, th(["New rules in March"], 4), { cols: 1, color: N.yellow, size: 21 }));
    out.push(...lab(780, 180, "Island: our goal", "flag", A[0]), note(780, 330, 200, 120, th(["Launch on 1 March"], 5)[0], N.lilac, { size: 21 }));
    return out;
  },

  "priority-matrix"() {
    const T = tv("Priority matrix", (t) => `${t}: priority matrix`);
    const out = board({ name: T, title: T, sub: "Urgent or important? Do, schedule, delegate or drop", icon: "grid", acc: 0, chip: "This week" });
    const x0 = 112, y0 = TOP + 56, w = (W - M - x0 - 12) / 2, h = (BOT - y0 - 12) / 2;
    out.push(pill(x0, TOP + 8, w, 38, "Urgent", INK, { size: 17 }), pill(x0 + w + 12, TOP + 8, w, 38, "Not urgent", "#6a7389", { size: 17 }));
    const l1 = pill(x0 - 72 - h / 2 + 19, y0 + h / 2 - 19, h, 38, "Important", INK, { size: 17 }), l2 = pill(x0 - 72 - h / 2 + 19, y0 + h + 12 + h / 2 - 19, h, 38, "Not important", "#6a7389", { size: 17 });
    l1.rot = -90; l2.rot = -90; out.push(l1, l2);
    const q = [["Do now", "checkCircle", A[5], TI[5], N.mint, th(["Pay the supplier", "Fix the card machine", "Reply to the landlord"], 0)], ["Schedule", "calendar", A[1], TI[1], N.sky, th(["Plan the summer menu", "Staff training day", "Update the website"], 3)],
      ["Delegate", "users", A[3], TI[3], N.yellow, th(["Order printer paper", "Book the van service", "Post on Instagram"], 6)], ["Drop", "x", A[4], TI[4], N.pink, th(["Redesign the logo again", "Long weekly reports"], 9)]];
    q.forEach(([n, ic, c, t, nc, items], i) => { const x = x0 + (i % 2) * (w + 12), y = y0 + Math.floor(i / 2) * (h + 12); out.push(shape(x, y, w, h, { fill: t, stroke: t }), ...badge(x + 14, y + 14, 44, ic, c), txt(x + 70, y + 22, 300, n, 24, { bold: true })); items.forEach((s, k) => out.push(note(x + 14 + k * 180, y + 72, 166, h - 88, s, nc, { size: 21 }))); });
    return out;
  },

  "story-map"() {
    const T = tv("User story map", (t) => `${t}: user story map`);
    const out = board({ name: T, title: T, sub: "Food ordering app · the big steps, the details and what ships first", icon: "map", acc: 0, chip: "MVP: March" });
    const x0 = 190, cw = 210, acts = th(["Find food", "Choose", "Pay", "Track", "Review"], 0);
    acts.forEach((a, i) => out.push(pill(x0 + i * cw, TOP + 10, cw - 12, 46, a, A[i % 6], { size: 19 })));
    out.push(txt(M, TOP + 22, 140, "Activities", 17, { bold: true, color: GREY }), txt(M, 248, 140, "Steps", 17, { bold: true, color: GREY }));
    const steps = th(["Search by area", "See the menu", "Pay by card", "Live map", "Rate the meal"], 5);
    steps.forEach((s, i) => out.push(note(x0 + i * cw, 226, cw - 12, 92, s, N.yellow, { size: 20 })));
    const rel = [["Release 1 · MVP", A[5], TI[5], th(["Filter: halal, veg", "Photos of dishes", "Cash on delivery", "SMS updates", "Star rating"], 1), N.mint], ["Release 2", A[1], TI[1], th(["Saved favourites", "Add notes for the chef", "Wallet and promo codes", "Rider chat", "Photo reviews"], 6), N.sky]];
    rel.forEach(([name, c, t, items, nc], r) => {
      const y = 338 + r * 214;
      out.push(shape(M, y, W - M * 2, 202, { fill: t, stroke: t }), txt(M + 12, y + 14, 140, name, 18, { bold: true, color: c }));
      items.forEach((s, i) => out.push(note(x0 + i * cw, y + 14, cw - 12, 84, s, nc, { size: 19 }), note(x0 + i * cw, y + 106, cw - 12, 84, th([(r ? ["Group orders", "Meal plans", "Pay in parts", "Rider rating", "Reply to reviews"] : ["Area search map", "Combo deals", "Split the bill", "Delivery time", "Tip the rider"])[i]], i + r * 5 + 3)[0], nc, { size: 19 })));
    });
    return out;
  },

  "empathy-map"() {
    const T = tv("Empathy map", (t) => `${t}: empathy map`);
    const out = board({ name: T, title: T, sub: "Persona: Sana, 34, runs a home bakery and orders supplies online", icon: "heart", acc: 4, chip: "From 8 interviews" });
    const x0 = M, y0 = TOP + 12, w = 400, h = 290;
    const q = [["Says", "chat", A[1], TI[1], N.sky, th(["I need it by Friday", "Is delivery free?"], 0)], ["Thinks", "bulb", A[0], TI[0], N.lilac, th(["Will the cake hold up?", "Prices keep rising"], 2)], ["Does", "tool", A[2], TI[2], N.mint, th(["Orders at night", "Compares 3 shops"], 4)], ["Feels", "heart", A[4], TI[4], N.pink, th(["Proud of her work", "Stressed on weekends"], 6)]];
    q.forEach(([n, ic, c, t, nc, items], i) => { const x = x0 + (i % 2) * (w + 10), y = y0 + Math.floor(i / 2) * (h + 10); out.push(shape(x, y, w, h, { fill: t, stroke: t }), ...badge(x + (i % 2 ? w - 58 : 14), y + (i < 2 ? 14 : h - 58), 44, ic, c), txt(x + (i % 2 ? w - 250 : 70), y + (i < 2 ? 22 : h - 50), 180, n, 24, { bold: true, align: i % 2 ? "right" : "left" })); items.forEach((s, k) => out.push(note(i % 2 ? x + w - 20 - 150 - k * 162 : x + 20 + k * 162, i < 2 ? y + 72 : y + 26, 150, 150, s, nc, { size: 20 }))); });
    out.push(shape(x0 + w + 5 - 92, y0 + h + 5 - 92, 184, 184, { kind: "ellipse", fill: WHITE, stroke: A[4], sw: 4 }), avatar(x0 + w + 5 - 60, y0 + h + 5 - 76, 120, "Sana Baker", A[4], { sw: 0, ring: A[4] }), txt(x0 + w + 5 - 80, y0 + h + 52, 160, "Sana", 20, { bold: true, align: "center" }));
    const pg = [["Pains", "alert", A[4], N.pink, th(["Late deliveries", "Hidden fees"], 8)], ["Gains", "star", A[5], N.mint, th(["Next-day delivery", "Bulk prices"], 10)]];
    pg.forEach(([n, ic, c, nc, items], i) => { const p = panel(870, y0 + i * 300, 370, 290, n, { fill: c, icon: ic }); out.push(...p.objs, ...notesIn(p, items, { cols: 2, color: nc, size: 20, maxh: 190 })); });
    return out;
  },

  "decision-tree"() {
    const T = tv("Decision tree", (t) => `${t}: decision tree`);
    const out = board({ name: T, title: T, sub: "Should we open a second branch this year?", icon: "layers", acc: 0, chip: "Board meeting" });
    const root = shape(M, 410, 220, 120, { kind: "diamond", fill: TI[0], stroke: A[0], sw: 3, text: "Open a second branch?", size: 18, bold: true });
    const opt = (y, t, c) => shape(330, y, 240, 84, { fill: A[c], stroke: A[c], text: t, size: 20, bold: true, tc: WHITE });
    const yes = opt(250, "Yes, open in 2027", 5), no = opt(610, "No, grow online first", 1);
    const out1 = th(["Busy area: +PKR 3M profit", "Quiet area: -PKR 1M loss", "Online grows 40%", "Online grows 10%"], 0);
    const res = [[180, 0, yes, "60%"], [330, 4, yes, "40%"], [540, 2, no, "70%"], [690, 3, no, "30%"]].map(([y, c, from, p], i) => { const r = shape(680, y, 300, 78, { fill: WHITE, stroke: A[c], sw: 3, text: out1[i], size: 18, bold: true }); out.push(r, link(from, r, { text: p, kind: "elbow" })); return r; });
    out.push(root, yes, no, link(root, yes, { kind: "elbow", text: "Yes" }), link(root, no, { kind: "elbow", text: "No" }));
    [["+PKR 1.4M", A[5], 255], ["+PKR 0.9M", A[1], 615]].forEach(([v, c, y]) => out.push(shape(1030, y, 210, 74, { fill: c, stroke: c, text: "Expected " + v, size: 18, bold: true, tc: WHITE })));
    out.push(line(990, 220, 1030, 290, { stroke: "#9aa1b5", sw: 2 }), line(990, 370, 1030, 300, { stroke: "#9aa1b5", sw: 2 }), line(990, 580, 1030, 650, { stroke: "#9aa1b5", sw: 2 }), line(990, 730, 1030, 660, { stroke: "#9aa1b5", sw: 2 }));
    out.push(note(1030, 420, 210, 150, "Pick the higher expected value", N.yellow, { size: 21 }));
    return out;
  },

  "brand-board"() {
    const T = tv("Brand board", (t) => `${t}: brand board`);
    const out = board({ name: T, title: T, sub: "Golden Crust Bakery · logo, colours, type, photos and voice", icon: "palette", acc: 3, chip: "Brand v1.0", people: 0 });
    const lg = card(M, TOP + 12, 400, 270, "Logo", "star", A[3]);
    out.push(...lg.objs, shape(lg.x + 20, lg.y + 10, 150, 150, { kind: "ellipse", fill: A[3], stroke: A[3], text: "GC", size: 54, bold: true, tc: WHITE }), txt(lg.x + 190, lg.y + 40, 190, "Golden Crust", 28, { bold: true }), txt(lg.x + 190, lg.y + 84, 190, "BAKERY · SINCE 2009", 14, { bold: true, color: GREY }));
    const ty = card(M, 474, 400, BOT - 474, "Typography", "edit", A[0]);
    out.push(...ty.objs, txt(ty.x, ty.y, 380, "Heading bold", 40, { bold: true }), txt(ty.x, ty.y + 60, 380, "Body text is simple, warm and easy to read at any size.", 18, { color: GREY }), txt(ty.x, ty.y + 130, 380, "Aa Bb Cc 123", 26, { bold: true, color: A[3] }));
    const pc = card(460, TOP + 12, 400, 220, "Colours", "palette", A[4]);
    out.push(...pc.objs);
    [["#e9a23b", "Honey"], ["#7a3e1f", "Crust"], ["#f6e7c8", "Cream"], ["#c2410c", "Spice"], ["#1b2133", "Ink"]].forEach(([c, n], i) => out.push(shape(pc.x + i * 74, pc.y + 6, 64, 64, { fill: c, stroke: LINE, sw: 1 }), txt(pc.x + i * 74 - 6, pc.y + 76, 76, n, 14, { align: "center", color: GREY }), txt(pc.x + i * 74 - 6, pc.y + 96, 76, c.toUpperCase(), 11, { align: "center", color: SOFT })));
    const used = [];
    out.push(...photo(468, 432, 186, 324, "food bakery bread", { slot: 0, used }), ...photo(674, 432, 186, 324, "coffee cafe", { slot: 1, used, exclude: used.slice() }));
    const vc = card(880, TOP + 12, 360, BOT - TOP - 12, "Our voice", "chat", A[2]);
    out.push(...vc.objs, txt(vc.x, vc.y, 300, "We are", 18, { bold: true, color: A[5] }));
    th(["Warm", "Honest", "Local", "Cheerful"], 0).forEach((t, i) => out.push(tag(vc.x + (i % 2) * 150, vc.y + 30 + Math.floor(i / 2) * 44, t, TI[5], { size: 17, h: 34 })));
    out.push(txt(vc.x, vc.y + 130, 300, "We are not", 18, { bold: true, color: A[4] }));
    ["Fancy", "Pushy"].forEach((t, i) => out.push(tag(vc.x + i * 150, vc.y + 160, t, TI[4], { size: 17, h: 34 })));
    out.push(note(vc.x, vc.y + 230, 330, 200, "\"Baked this morning, just for you.\"", N.yellow, { size: 24 }));
    return out;
  },

  "start-stop-continue"() {
    const T = tv("Start, stop, continue", (t) => `${t}: start, stop, continue`);
    return colBoard({ name: T, title: T, sub: "A quick retro: three questions, one note per idea", icon: "chat", acc: 5, chip: "15 minutes",
      cols: [["Start", A[5], N.mint, "play", th(["Weekly demo on Fridays", "Pair on tricky tasks", "Share wins in chat", "Ask customers early"], 0), "What should we begin doing?"],
        ["Stop", A[4], N.pink, "x", th(["Last-minute changes", "Meetings without notes", "Working late on Thursdays"], 4), "What gets in our way?"],
        ["Continue", A[1], N.sky, "arrow", th(["Morning stand-ups", "Clear task owners", "Celebrating launches", "Code reviews"], 7), "What works well?"]] });
  },

  "impact-effort"() {
    const T = tv("Impact and effort", (t) => `${t}: impact and effort`);
    const out = board({ name: T, title: T, sub: "Sort the ideas: quick wins first, time sinks last", icon: "target", acc: 2, chip: "12 ideas" });
    const x0 = 120, y0 = TOP + 12, w = (W - M - x0 - 12) / 2, h = (BOT - 48 - y0 - 12) / 2;
    const q = [["Quick wins", "bolt", A[5], TI[5], N.mint, th(["Online booking button", "Loyalty stamps", "Better shop photos"], 0)], ["Big bets", "rocket", A[1], TI[1], N.sky, th(["Mobile app", "Second branch"], 3)],
      ["Fill-ins", "list", A[3], TI[3], N.yellow, th(["New tablecloths", "Music playlist"], 5)], ["Time sinks", "clock", A[4], TI[4], N.pink, th(["Custom software", "TV advert"], 7)]];
    q.forEach(([n, ic, c, t, nc, items], i) => { const x = x0 + (i % 2) * (w + 12), y = y0 + Math.floor(i / 2) * (h + 12); out.push(shape(x, y, w, h, { fill: t, stroke: t }), ...badge(x + 14, y + 14, 44, ic, c), txt(x + 70, y + 22, 300, n, 24, { bold: true })); items.forEach((s, k) => out.push(note(x + 14 + k * 180, y + 74, 166, h - 90, s, nc, { size: 21 }))); });
    out.push(line(x0 - 24, BOT - 34, x0 - 24, y0, { arrow: "end", stroke: INK, sw: 3 }), line(x0 - 24, BOT - 34, W - M, BOT - 34, { arrow: "end", stroke: INK, sw: 3 }));
    const im = txt(M - 26, (y0 + BOT) / 2 - 22, 130, "Impact", 20, { bold: true, align: "center" }); im.rot = -90;
    out.push(im, txt(x0, BOT - 28, W - M - x0, "Effort", 20, { bold: true, align: "center" }));
    return out;
  },

  meeting() {
    const T = tv("Weekly team meeting", (t) => `${t}: team meeting`);
    const out = board({ name: T, title: T, sub: "Monday 10:00 · Meeting room 2 and online", icon: "users", acc: 0, chip: "45 min" });
    const ag = card(M, TOP + 12, 600, BOT - TOP - 12, "Agenda", "list", A[0]);
    out.push(...ag.objs);
    const items = th(["Last week's numbers", "New price list", "Holiday schedule", "Customer feedback", "Any other business"], 0);
    const ppl = who(["Sara Ahmed", "Bilal Khan", "Hina Raza", "Omar Shah", "Sara Ahmed"]);
    items.forEach((t, i) => { const y = ag.y + 6 + i * 104; out.push(shape(ag.x, y, 576, 92, { fill: i % 2 ? WHITE : "#f6f7fb", stroke: LINE }), pill(ag.x + 12, y + 24, 92, 42, ["10:00", "10:10", "10:20", "10:30", "10:40"][i], A[i % 6], { size: 16 }), txt(ag.x + 120, y + 32, 360, t, 20, { bold: true }), avatar(ag.x + 516, y + 22, 48, ppl[i], A[(i + 1) % 6], { sw: 2 })); });
    const nt = card(660, TOP + 12, 580, 290, "Notes", "edit", A[1]);
    out.push(...nt.objs, ...notesIn(nt, th(["Sales up 6% on target", "New prices from 1 Dec", "Office closed 25–27 Dec"], 5), { cols: 3, color: N.sky, size: 21 }));
    const dc = card(660, 474, 280, BOT - 474, "Decisions", "checkCircle", A[5]);
    out.push(...dc.objs, ...["Keep Saturday hours", "Hire one cashier"].flatMap((t, i) => check(dc.x, dc.y + 8 + i * 60, t, true, A[5], 250)));
    const ac = card(960, 474, 280, BOT - 474, "Action items", "flag", A[4]);
    out.push(...ac.objs, ...th(["Bilal: price tags", "Hina: rota", "Sara: send report"], 8).flatMap((t, i) => check(ac.x, ac.y + 8 + i * 58, t, false, A[4], 250)));
    return out;
  },

  "pros-cons"() {
    const T = tv("Should we open a second shop?", (t) => `${t}: pros and cons`);
    const out = board({ name: T, title: T, sub: "Pros and cons, then one clear decision", icon: "layers", acc: 0, chip: "Decision by 30 Nov" });
    const [l, r] = columns(2);
    const pros = panel(l.x, TOP + 12, l.w, 450, "Pros", { fill: A[5], icon: "checkCircle" }), cons = panel(r.x, TOP + 12, r.w, 450, "Cons", { fill: A[4], icon: "x" });
    out.push(...pros.objs, ...cons.objs);
    out.push(...notesIn(pros, th(["More customers in DHA", "Bulk buying saves 8%", "Staff can grow", "Strong brand already"], 0), { cols: 2, color: N.mint, size: 23 }));
    out.push(...notesIn(cons, th(["Rent is high", "Need a second manager", "Six months to break even", "Less time for new recipes"], 4), { cols: 2, color: N.pink, size: 23 }));
    out.push(shape(M, 642, W - M * 2, 122, { fill: INK, stroke: INK }), ...badge(M + 22, 668, 70, "flag", A[3]), txt(M + 112, 664, 900, "Decision: yes, open in March", 34, { bold: true, color: WHITE }), txt(M + 114, 712, 900, "Start small: 6 tables and delivery. Review after three months.", 19, { color: "#c9cde0" }));
    return out;
  },

  "sprint-planning"() {
    const T = tv("Sprint planning", (t) => `${t}: sprint planning`);
    const out = board({ name: T, title: T, sub: "Sprint 15 · 17 – 28 November", icon: "bolt", acc: 0, chip: "34 points" });
    out.push(shape(M, TOP + 10, W - M * 2, 64, { fill: A[0], stroke: A[0], text: "Sprint goal: customers can pay in the app", size: 24, bold: true, tc: WHITE }));
    const bl = panel(M, 252, 340, BOT - 252, "Backlog", { fill: INK, icon: "list" });
    out.push(...bl.objs, ...notesIn(bl, th(["Saved cards", "Receipts by email", "Refund button", "Dark mode"], 0), { cols: 1, color: N.yellow, size: 19, maxh: 92 }));
    const cs = [["Planned", A[1], N.sky, th(["Card payment screen", "Payment API", "Error messages"], 4)], ["In progress", A[3], N.peach, th(["Checkout tests", "Order summary"], 7)], ["Done", A[5], N.mint, th(["Design review"], 9)]];
    columns(3, 400, 1010, 14).forEach(({ x, w }, i) => { const [n, c, nc, items] = cs[i]; const p = panel(x, 252, w, BOT - 252, n, { fill: c }); out.push(...p.objs, ...notesIn(p, items, { cols: 1, color: nc, size: 19, maxh: 120 })); });
    const cp = card(1026, 252, 214, BOT - 252, "Capacity", "users", A[2]);
    out.push(...cp.objs);
    who(["Sara Ahmed", "Bilal Khan", "Hina Raza", "Omar Shah"]).forEach((p, i) => out.push(avatar(cp.x, cp.y + 10 + i * 104, 46, p, A[(i + 1) % 6], { sw: 2 }), txt(cp.x + 56, cp.y + 12 + i * 104, 130, nameOf(p), 16, { bold: true }), ...bar(cp.x + 56, cp.y + 40 + i * 104, 130, 16, [0.8, 0.6, 0.9, 0.5][i], A[2])));
    return out;
  },

  weekly() {
    const T = tv("This week", (t) => `${t}: this week`);
    const out = board({ name: T, title: T, sub: "Weekly planner · 10 – 16 November", icon: "calendar", acc: 0, chip: "3 goals" });
    out.push(txt(M, TOP + 20, 220, "Goals this week:", 20, { bold: true }));
    th(["Finish the price list", "Two supplier calls", "Gym three times"], 0).forEach((t, i) => out.push(tag(M + 190 + i * 290, TOP + 14, t, TI[i], { size: 17, h: 36 })));
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], items = th(["Team stand-up", "Write the newsletter", "Supplier visit", "Bank meeting", "Pay salaries", "Family lunch", "Plan next week", "Dentist 4 pm", "Order stock", "Gym 7 am", "Market stall", "Rest"], 3);
    columns(7, M, W - M, 10).forEach(({ x, w }, i) => {
      const c = i >= 5 ? A[1] : A[0];
      out.push(shape(x, 222, w, BOT - 222, { fill: i >= 5 ? TI[1] : WHITE, stroke: i >= 5 ? TI[1] : LINE }), pill(x + 8, 232, w - 16, 42, days[i], c, { size: 18 }));
      out.push(note(x + 8, 288, w - 16, w - 16, items[i], NOTES[i % 7], { size: 19 }));
      if (i % 2 === 0 || i === 3) out.push(note(x + 8, 300 + w, w - 16, w - 16, items[(i + 7) % items.length], NOTES[(i + 3) % 7], { size: 19 }));
    });
    return out;
  },

  persona() {
    const T = tv("Persona: Busy Bilal", (t) => `${t}: customer persona`);
    const out = board({ name: T, title: T, sub: "Who we design for: goals, frustrations and what he says", icon: "user", acc: 1, chip: "Persona 1 of 3", people: 0 });
    const pc = shape(M, TOP + 12, 360, BOT - TOP - 12, { fill: WHITE, stroke: LINE });
    out.push(pc, ...photo(M + 16, TOP + 28, 328, 200, "office business city workspace", { slot: 0, card: false }), avatar(M + 130, TOP + 186, 100, "Bilal Hassan", A[1], { sw: 5 }));
    out.push(txt(M + 16, TOP + 300, 328, "Bilal Hassan", 28, { bold: true, align: "center" }), txt(M + 16, TOP + 340, 328, "34 · Sales manager · Lahore", 18, { color: GREY, align: "center" }));
    [["Tech skills", 0.8], ["Time free", 0.25], ["Budget", 0.6]].forEach(([n, v], i) => out.push(txt(M + 24, TOP + 392 + i * 58, 120, n, 17, { bold: true }), ...bar(M + 140, TOP + 392 + i * 58, 190, 22, v, A[(i + 1) % 6])));
    const g = card(420, TOP + 12, 400, 290, "Goals", "target", A[5]), f = card(420, 474, 400, BOT - 474, "Frustrations", "alert", A[4]);
    out.push(...g.objs, ...f.objs);
    th(["Order lunch for the team fast", "Keep within the budget", "Look good to his boss"], 0).forEach((t, i) => out.push(...check(g.x, g.y + 8 + i * 62, t, true, A[5], 370)));
    th(["Apps that need many taps", "Late deliveries", "Hidden fees"], 3).forEach((t, i) => out.push(...badge(f.x, f.y + 8 + i * 62, 30, "x", A[4]), txt(f.x + 42, f.y + 11 + i * 62, 330, t, 19)));
    out.push(note(840, TOP + 12, 400, 290, "\"I have ten minutes for lunch orders, not thirty.\"", N.yellow, { size: 30 }));
    const ch = card(840, 474, 400, BOT - 474, "Where to find him", "pin", A[2]);
    out.push(...ch.objs);
    ["LinkedIn", "WhatsApp", "Office lobby", "Email at 9 am"].forEach((t, i) => out.push(tag(ch.x + (i % 2) * 180, ch.y + 10 + Math.floor(i / 2) * 50, t, TI[(i + 1) % 6], { size: 17, h: 36 })));
    return out;
  },

  "four-ls"() {
    const T = tv("4 Ls retrospective", (t) => `${t}: 4 Ls retro`);
    return quadBoard({ name: T, title: T, sub: "Liked, learned, lacked and longed for", icon: "chat", acc: 0, chip: "Sprint 14",
      q: [["heart", "Liked", "What we enjoyed", A[4], TI[4], N.pink, th(["Team lunch on Friday", "Fast design reviews", "Happy customers"], 0)], ["book", "Learned", "What we found out", A[1], TI[1], N.sky, th(["Customers want delivery", "Tests save time"], 3)],
        ["alert", "Lacked", "What was missing", A[3], TI[3], N.yellow, th(["Clear deadlines", "Time for testing", "Feedback early"], 5)], ["star", "Longed for", "What we wish we had", A[0], TI[0], N.lilac, th(["A bigger screen", "Quiet focus hours"], 8)]] });
  },

  "crazy-eights"() {
    const T = tv("Crazy eights", (t) => `${t}: crazy eights`);
    const out = board({ name: T, title: T, sub: "Eight sketches in eight minutes: new home screen ideas", icon: "edit", acc: 4, chip: "8:00 timer" });
    const caps = th(["Big search bar", "Photo grid", "Today's deals", "Map first", "Voice order", "Favourites row", "Chat with chef", "One-tap reorder"], 0);
    caps.forEach((c, i) => {
      const x = M + (i % 4) * 302, y = TOP + 12 + Math.floor(i / 4) * 302, w = 290, h = 290;
      out.push(shape(x, y, w, h, { fill: WHITE, stroke: LINE }), shape(x + 14, y + 14, 36, 36, { kind: "ellipse", fill: A[4], stroke: A[4], text: String(i + 1), size: 17, bold: true, tc: WHITE }));
      const sx = x + 80, sy = y + 24, k = i % 4;
      const r = (dx, dy, w0, h0, c, o2 = {}) => shape(sx + dx, sy + dy, w0, h0, { kind: o2.kind || "rounded", fill: o2.solid ? c : WHITE, stroke: c, sw: 2.5 });
      const ln = (dy, w0, c = "#c4c8d6") => shape(sx + 14, sy + dy, w0, 8, { fill: c, stroke: c });
      out.push(shape(sx, sy, 130, 196, { fill: WHITE, stroke: INK, sw: 3 }));
      if (i === 0) out.push(r(12, 16, 106, 24, A[1]), icon("search", sx + 18, sy + 20, 16, A[1]), r(12, 54, 50, 60, A[4]), r(68, 54, 50, 60, A[2]), ln(130, 100), ln(146, 70));
      if (i === 1) for (let rr = 0; rr < 3; rr++) for (let q = 0; q < 2; q++) out.push(r(12 + q * 56, 14 + rr * 58, 50, 50, A[(rr + q) % 6]));
      if (i === 2) out.push(shape(sx + 30, sy + 22, 70, 70, { kind: "star", fill: TI[3], stroke: A[3], sw: 2.5 }), r(14, 104, 102, 26, A[4], { solid: true }), ln(144, 100), ln(160, 64));
      if (i === 3) out.push(r(12, 14, 106, 110, A[5]), icon("pin", sx + 46, sy + 44, 38, A[4], 2.5), r(14, 138, 102, 22, A[0], { solid: true }), ln(170, 80));
      if (i === 4) out.push(shape(sx + 35, sy + 30, 60, 60, { kind: "ellipse", fill: A[0], stroke: A[0] }), icon("chat", sx + 50, sy + 45, 30, WHITE), ...[0, 1, 2, 3, 4].map((j) => shape(sx + 22 + j * 18, sy + 120 - [6, 14, 20, 12, 8][j], 10, [12, 28, 40, 24, 16][j], { fill: A[1], stroke: A[1] })), ln(160, 100));
      if (i === 5) out.push(...[0, 1, 2].map((j) => icon("heart", sx + 14 + j * 36, sy + 18, 28, A[4], 2.5)), r(12, 60, 106, 44, A[2]), r(12, 112, 106, 44, A[3]), ln(170, 80));
      if (i === 6) out.push(r(12, 16, 80, 36, A[1]), r(38, 62, 80, 36, A[5], { solid: true }), r(12, 108, 70, 32, A[1]), r(12, 158, 106, 24, "#c4c8d6"));
      if (i === 7) out.push(ln(18, 100), ln(36, 80), ln(54, 100), ln(72, 60), r(14, 112, 102, 50, A[4], { solid: true }), icon("bolt", sx + 54, sy + 124, 24, WHITE, 2.5));
      out.push(txt(x + 14, y + 232, w - 28, c, fitSize(c, w - 28, 21, 13), { bold: true, align: "center" }));
    });
    return out;
  },

  swimlanes() {
    const T = tv("Order process by team", (t) => `${t}: swimlane flowchart`);
    const out = board({ name: T, title: T, sub: "Who does what, from order to payment", icon: "layers", acc: 1, chip: "4 teams" });
    const lanes = [["Customer", A[0], TI[0]], ["Sales", A[1], TI[1]], ["Warehouse", A[2], TI[2]], ["Finance", A[3], TI[3]]], lh = 146;
    lanes.forEach(([n, c, t], i) => { const y = TOP + 12 + i * (lh + 6); out.push(shape(M, y, W - M * 2, lh, { kind: "rect", fill: t, stroke: t }), shape(M, y, 150, lh, { kind: "rect", fill: c, stroke: c, text: n, size: 20, bold: true, tc: WHITE })); });
    const ly = (i) => TOP + 12 + i * (lh + 6) + (lh - 76) / 2;
    const st = th(["Places an order", "Checks the order", "Sends a quote", "Picks and packs", "Ships the parcel", "Sends the invoice", "Pays the invoice", "Confirms payment"], 0);
    const b = (x, lane, t, kind) => shape(x, ly(lane), 170, 76, { kind: kind || "rounded", fill: WHITE, stroke: lanes[lane][1], sw: 3, text: t, size: 17, bold: true });
    const n = [b(220, 0, st[0]), b(420, 1, st[1]), b(620, 1, "In stock?", "rounded"), b(620, 2, st[3]), b(830, 2, st[4]), b(830, 3, st[5]), b(1040, 0, st[6]), b(1040, 3, st[7])];
    n[2].kind = "diamond"; n[2].fill = TI[3]; n[2].h = 96; n[2].y -= 10;
    out.push(...n, link(n[0], n[1], { kind: "elbow" }), link(n[1], n[2]), link(n[2], n[3], { text: "Yes" }), link(n[3], n[4]), link(n[4], n[5]), link(n[5], n[6], { kind: "elbow" }), link(n[6], n[7], { kind: "elbow" }));
    return out;
  },

  okr() {
    const T = tv("Goals and key results", (t) => `${t}: goals and key results`);
    const out = board({ name: T, title: T, sub: "Q1 2027 · three goals, each with results we can measure", icon: "target", acc: 0, chip: "Score: 0.62" });
    const objs = th(["Delight our customers", "Grow online sales", "Build a strong team"], 0);
    const krs = [[["Rating from 4.3 to 4.7", 0.7], ["Reply to reviews in 24 h", 0.9], ["Complaints down 30%", 0.4]], [["Online orders +40%", 0.55], ["1,000 app downloads", 0.8], ["Basket size PKR 2,500", 0.3]], [["Train every new hire", 1], ["Monthly 1:1s for all", 0.6], ["Staff survey 8/10", 0.45]]];
    objs.forEach((o, i) => {
      const y = TOP + 12 + i * 202, c = A[[0, 1, 5][i]];
      out.push(shape(M, y, 350, 190, { fill: c, stroke: c }), txt(M + 22, y + 22, 300, `Goal ${i + 1}`, 17, { bold: true, color: WHITE }), txt(M + 22, y + 52, 310, o, fitSize(o, 310, 30, 18), { bold: true, color: WHITE }));
      out.push(shape(M + 362, y, W - M * 2 - 362, 190, { fill: WHITE, stroke: LINE }));
      krs[i].forEach(([t, v], k) => { const ky = y + 20 + k * 56; out.push(txt(M + 384, ky + 6, 360, th([t], i * 3 + k)[0], 19, { bold: true }), ...bar(M + 760, ky + 6, 330, 26, v, c, { label: Math.round(v * 100) + "%" })); });
    });
    return out;
  },

  "get-to-know"() {
    const T = tv("Get to know the team", (t) => `${t}: meet the team`);
    const out = board({ name: T, title: T, sub: "Icebreaker: a fun fact, a favourite place and one hidden talent", icon: "smile", acc: 3, chip: "New starters", people: 0 });
    const P = who(["Sara Ahmed, Team lead", "Bilal Khan, Designer", "Hina Raza, Operations", "Omar Shah, Sales", "Maham Tariq, Marketing", "Danish Ali, Support"]);
    const facts = th(["Has climbed to Fairy Meadows", "Bakes the best brownies", "Speaks four languages", "Ran the Lahore marathon", "Paints city skylines", "Knows every cricket score"], 0);
    const topics = ["mountains travel", "food bakery", "travel city", "sport fitness", "city architecture", "nature sky"], used = [];
    P.forEach((p, i) => {
      const x = M + (i % 3) * 404, y = TOP + 12 + Math.floor(i / 3) * 300, w = 388;
      out.push(shape(x, y, w, 288, { fill: WHITE, stroke: LINE }), ...photo(x + 12, y + 12, w - 24, 120, topics[i], { slot: i, card: false, used, exclude: used.slice() }));
      out.push(avatar(x + 24, y + 96, 72, p, A[(i + 1) % 6], { sw: 4 }), txt(x + 108, y + 142, w - 120, nameOf(p), 21, { bold: true }), txt(x + 108, y + 170, w - 120, roleOf(p), 16, { color: GREY }));
      out.push(note(x + 14, y + 206, w - 28, 70, facts[i], NOTES[i % 7], { size: 19 }));
    });
    return out;
  },

  "five-whys"() {
    const T = tv("5 whys", (t) => `${t}: 5 whys`);
    const out = board({ name: T, title: T, sub: "Ask why five times to find the real cause, then fix it", icon: "search", acc: 4, chip: "Problem solving" });
    const prob = shape(M, TOP + 16, 290, 130, { fill: A[4], stroke: A[4], text: tv("Customers wait 40 minutes for food", (t) => `${cap(t)} is running late`), size: 22, bold: true, tc: WHITE });
    out.push(prob);
    const whys = th(["The kitchen gets orders late", "Waiters write orders on paper", "The order screen is broken", "Nobody owns repairs", "No budget line for upkeep"], 0);
    let prev = prob;
    whys.forEach((t, i) => {
      const x = 360 + i * 176, y = TOP + 16 + i * 92;
      const b = shape(x, y, 200, 80, { fill: WHITE, stroke: A[i % 6], sw: 3, text: t, size: 16, bold: true });
      out.push(b, pill(x - 6, y - 14, 70, 28, `Why ${i + 1}`, A[i % 6], { size: 13 }), link(prev, b, { kind: "elbow", fromSide: i ? "bottom" : "right", toSide: "left" }));
      prev = b;
    });
    const root = shape(560, 664, 330, 90, { fill: INK, stroke: INK, text: "Root cause: no one owns the kitchen tools", size: 19, bold: true, tc: WHITE });
    const fix = shape(920, 664, 320, 90, { fill: A[5], stroke: A[5], text: "Fix: a tools owner and a repair budget", size: 19, bold: true, tc: WHITE });
    out.push(root, fix, link(prev, root, { kind: "elbow", fromSide: "bottom", toSide: "right" }), link(root, fix));
    out.push(txt(M, 330, 290, "Facts we know", 19, { bold: true }), ...notesIn({ x: M, y: 366, w: 290, h: 390 }, th(["Busy on Fridays", "Two new waiters", "Screen down since May", "Complaints doubled"], 6), { cols: 2, color: N.yellow, size: 19 }));
    return out;
  },

  pest() {
    const T = tv("PEST analysis", (t) => `${t}: PEST analysis`);
    return colBoard({ name: T, title: T, sub: "The outside forces that can help or hurt our plans", icon: "globe", acc: 0, chip: "Market review", ncols: 1, size: 21, maxh: 120,
      cols: [["Political", A[0], N.lilac, "shield", th(["New tax on imports", "Trade fair support", "Stricter food rules", "Local elections"], 0), "Rules and government"],
        ["Economic", A[1], N.sky, "money", th(["Rising fuel prices", "Strong online spending", "Higher rent", "Weaker rupee"], 4), "Money and prices"],
        ["Social", A[3], N.yellow, "users", th(["Healthy eating trend", "More working parents", "Shopping by phone", "Love for local brands"], 8), "People and habits"],
        ["Technological", A[2], N.mint, "phone", th(["Cheap online payments", "Delivery apps", "AI customer chat", "Smart ovens"], 2), "Tools and tech"]] });
  },

  "lesson-plan"() {
    const T = tv("Lesson plan: the water cycle", (t) => `${t}: lesson plan`);
    const out = board({ name: T, title: T, sub: "Science · Grade 5 · 50 minutes", icon: "school", acc: 2, chip: "Room 12", people: 0 });
    const ob = card(M, TOP + 12, 380, 300, "By the end, students can…", "target", A[2]);
    out.push(...ob.objs, ...th(["Name the 4 stages", "Draw the cycle", "Explain why it rains"], 0).flatMap((t, i) => check(ob.x, ob.y + 10 + i * 64, t, true, A[2], 350)));
    out.push(...photo(M + 8, 498, 364, 258, "education school science", { slot: 0 }));
    const steps = [["Warm-up", "5 min", "Quick quiz on clouds"], ["Teach", "15 min", "Video and drawing"], ["Practice", "15 min", "Groups label the cycle"], ["Share", "10 min", "Each group explains"], ["Wrap-up", "5 min", "Exit ticket"]];
    out.push(txt(450, TOP + 16, 500, "Lesson flow", 22, { bold: true }));
    steps.forEach(([n, m, d], i) => { const y = TOP + 56 + i * 82; out.push(shape(450, y, 500, 72, { fill: WHITE, stroke: LINE }), shape(450, y, 10, 72, { kind: "rect", fill: A[i % 6], stroke: A[i % 6] }), txt(474, y + 12, 370, th([n], i)[0], fitSize(th([n], i)[0], 370, 20, 12), { bold: true }), txt(474, y + 42, 300, d, 15, { color: GREY }), tag(860, y + 22, m, TI[i % 6], { size: 15 })); });
    const mt = card(970, TOP + 12, 270, 300, "Materials", "list", A[3]);
    out.push(...mt.objs, ...["Globe", "Coloured pencils", "Worksheet", "Short video"].flatMap((t, i) => check(mt.x, mt.y + 8 + i * 56, t, false, A[3], 240)));
    out.push(...notesIn({ x: 970, y: 488, w: 270, h: 276 }, th(["Homework: draw the cycle at home", "Extra help: picture cards"], 6), { cols: 1, color: [N.yellow, N.mint], size: 20 }));
    return out;
  },

  "pi-planning"() {
    const T = tv("Program board", (t) => `${t}: program board`);
    const out = board({ name: T, title: T, sub: "Teams by row, sprints by column, with the links between them", icon: "grid", acc: 0, chip: "PI 3 · 10 weeks" });
    const x0 = 210, cw = 250, sp = ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4"];
    sp.forEach((s, i) => out.push(pill(x0 + i * cw, TOP + 10, cw - 10, 44, s, INK, { size: 18 })));
    const teams = [["Mobile", A[0]], ["Web", A[1]], ["Payments", A[2]], ["Data", A[3]]], rh = 136, cards = [];
    const feats = th(["Login with phone", "Order history", "Push alerts", "New checkout", "Saved cards", "Promo codes", "Wallet top-up", "Refunds", "Sales dashboard", "Weekly report"], 0);
    const plan = [[0, 0, 0], [0, 2, 1], [1, 1, 2], [1, 3, 3], [2, 0, 4], [2, 2, 5], [2, 3, 6], [3, 1, 8], [3, 3, 9], [0, 3, 7]];
    teams.forEach(([n, c], r) => { const y = TOP + 64 + r * (rh + 8); out.push(shape(M, y, W - M * 2, rh, { kind: "rect", fill: r % 2 ? WHITE : "#f3f4f9", stroke: LINE, sw: 1 }), ...badge(M + 12, y + 18, 44, ["phone", "globe", "money", "chart"][r], c), txt(M + 12, y + 74, 150, n, 20, { bold: true })); });
    plan.forEach(([r, s, f]) => { const n = note(x0 + s * cw + 8, TOP + 64 + r * (rh + 8) + 14, cw - 26, rh - 28, feats[f], [N.lilac, N.sky, N.mint, N.yellow][r], { size: 19 }); cards.push(n); out.push(n); });
    out.push(link(cards[4], cards[1], { stroke: A[4], sw: 3, kind: "elbow" }), link(cards[5], cards[3], { stroke: A[4], sw: 3, kind: "elbow" }), link(cards[7], cards[8], { stroke: A[4], sw: 3, kind: "elbow" }));
    out.push(...badge(x0 + 4 * cw - 44, TOP + 14, 36, "flag", A[4], WHITE, { circle: true }));
    return out;
  },

  "workshop-agenda"() {
    const T = tv("Workshop agenda", (t) => `${t}: workshop agenda`);
    const out = board({ name: T, title: T, sub: "Brand refresh workshop · Saturday 9:30 – 1:00", icon: "calendar", acc: 2, chip: "12 people" });
    const ses = th(["Welcome and goals", "What customers say", "Ideas sprint", "Tea break", "Pick the top 3", "Next steps"], 0), times = ["9:30", "9:45", "10:15", "11:00", "11:20", "12:30"];
    const ppl = who(["Sara Ahmed", "Hina Raza", "Bilal Khan", "Omar Shah", "Sara Ahmed", "Bilal Khan"]);
    ses.forEach((s, i) => { const y = TOP + 12 + i * 100; out.push(shape(M, y, 760, 88, { fill: i === 3 ? TI[3] : WHITE, stroke: i === 3 ? TI[3] : LINE }), pill(M + 14, y + 22, 96, 44, times[i], A[i % 6], { size: 17 }), txt(M + 128, y + 30, 480, s, 22, { bold: true }), ...(i === 3 ? [icon("coffee", M + 700, y + 26, 36, A[3], 2.5)] : [avatar(M + 690, y + 18, 52, ppl[i], A[(i + 1) % 6], { sw: 2 })])); });
    const pl = panel(820, TOP + 12, 420, 400, "Parking lot", { fill: INK, icon: "pin" });
    out.push(...pl.objs, ...notesIn(pl, th(["New shop sign?", "Budget for photos", "Ask the team about uniforms", "Social media rules"], 6), { cols: 2, color: [N.yellow, N.pink, N.sky, N.mint], size: 20 }));
    const gr = card(820, 592, 420, BOT - 592, "Ground rules", "shield", A[2]);
    out.push(...gr.objs);
    ["Phones away", "Every idea counts", "Start on time"].forEach((t, i) => out.push(tag(gr.x + (i % 2) * 200, gr.y + Math.floor(i / 2) * 46, t, TI[(i + 2) % 6], { size: 17, h: 36 })));
    return out;
  },

  "experiment-board"() {
    const T = tv("Experiment board", (t) => `${t}: experiment board`);
    const out = board({ name: T, title: T, sub: "We believe, we will test, we will know when · three live tests", icon: "bulb", acc: 0, chip: "Growth team" });
    const hd = [["We believe…", A[0], "bulb"], ["We will test by…", A[1], "tool"], ["We will know when…", A[5], "target"], ["Status", A[3], "flag"]];
    const x0 = M, cws = [340, 340, 340, 168];
    let x = x0; hd.forEach(([n, c, ic], i) => { out.push(pill(x, TOP + 10, cws[i] - 12, 46, n, c, { size: 18 })); x += cws[i]; });
    const rows = [[th(["Free delivery brings more orders"], 0)[0], "Free delivery for 2 weeks", "Orders grow 20%", "Running", A[1]], [th(["People want lunch boxes"], 1)[0], "A pre-order page", "50 sign-ups in a week", "Passed", A[5]], [th(["Videos sell better than photos"], 2)[0], "Same post, video vs photo", "Clicks go up 30%", "Failed", A[4]]];
    rows.forEach((r, i) => { const y = TOP + 70 + i * 178; let cx = x0; r.slice(0, 3).forEach((t, k) => { out.push(note(cx, y, cws[k] - 12, 164, t, [N.lilac, N.sky, N.mint][k], { size: 22 })); cx += cws[k]; }); out.push(shape(cx, y, cws[3] - 12, 164, { fill: WHITE, stroke: LINE }), pill(cx + 14, y + 60, cws[3] - 40, 44, r[3], r[4], { size: 17 })); });
    return out;
  },
};
