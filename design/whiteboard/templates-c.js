// Whiteboard templates, part C: diagrams, charts, trackers and event boards (own layouts and wording).
import { W, H, M, TOP, BOT, A, TI, N, NOTES, INK, GREY, SOFT, LINE, WHITE, th, tv, who, cap, low, nameOf, roleOf,
  txt, shape, note, pill, tag, link, line, pen, icon, badge, avatar, photo, board, panel, notesIn, columns, table, bar, fitSize } from "./templates-kit.js";
import { colBoard, card } from "./templates-b.js";

const PI = Math.PI;
const tick = (x, y, done, c = A[5]) => [shape(x, y, 30, 30, { fill: done ? c : WHITE, stroke: done ? c : "#b8bdd0", sw: 2 }), ...(done ? [icon("check", x + 4, y + 4, 22, WHITE, 3)] : [])];
const ring = (cx, cy, r, n = 48) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * 2 * PI) * r, cy + Math.sin((i / n) * 2 * PI) * r]);
const wobble = (pts, a = 4) => pts.map(([x, y], i) => [x + Math.sin(i * 1.7) * a, y + Math.cos(i * 2.3) * a]);

export const BUILDERS_C = {
  "check-in"() {
    const T = tv("Team check-in", (t) => `${t}: team check-in`);
    const out = board({ name: T, title: T, sub: "How are you feeling today? Add a dot, then one word", icon: "smile", acc: 3, chip: "Monday 9:00" });
    const moods = [["Great", "smile", A[5], 5], ["Good", "smile", A[2], 4], ["Okay", "meh", A[3], 2], ["Tired", "frown", A[1], 2], ["Stressed", "angry", A[4], 1]];
    columns(5).forEach(({ x, w }, i) => {
      const [n, ic, c, votes] = moods[i];
      out.push(shape(x, TOP + 12, w, 330, { fill: WHITE, stroke: LINE }), ...badge(x + (w - 96) / 2, TOP + 32, 96, ic, c, WHITE, { circle: true, sw: 2.2 }), txt(x, TOP + 144, w, n, 24, { bold: true, align: "center" }));
      for (let k = 0; k < votes; k++) out.push(shape(x + 30 + (k % 4) * 46, TOP + 196 + Math.floor(k / 4) * 46, 34, 34, { kind: "ellipse", fill: A[(k + i) % 6], stroke: WHITE, sw: 2 }));
      out.push(txt(x, TOP + 300, w, `${votes} vote${votes > 1 ? "s" : ""}`, 16, { color: GREY, align: "center" }));
    });
    out.push(txt(M, 520, 600, "One word for today", 21, { bold: true }));
    const words = th(["Focused", "Excited", "Busy", "Curious", "Calm", "Hopeful"], 0), ppl = who(["Sara Ahmed", "Bilal Khan", "Hina Raza", "Omar Shah", "Maham Tariq", "Danish Ali"]).map(nameOf);
    words.forEach((t, i) => out.push(note(M + i * 202, 560, 186, 186, t, NOTES[i % 7], { size: 26, author: ppl[i] })));
    return out;
  },

  "month-calendar"() {
    const T = tv("November 2026", (t) => `${t}: November plan`);
    const out = board({ name: T, title: T, sub: "Team calendar · launches, events and deadlines", icon: "calendar", acc: 1, chip: "4 launches" });
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], cs = columns(7, M, W - M, 6), rh = 108;
    cs.forEach(({ x, w }, i) => out.push(pill(x, TOP + 6, w, 38, days[i], i >= 5 ? A[1] : INK, { size: 16 })));
    const ev = { 3: ["Team kickoff", 0], 6: ["Payday", 5], 10: ["Supplier visit", 3], 13: ["Launch: app 2.4", 4], 17: ["Workshop", 2], 20: ["Newsletter", 1], 24: ["Board meeting", 0], 27: ["Sale weekend", 4], 30: ["Month report", 3] };
    for (let r = 0; r < 5; r++) cs.forEach(({ x, w }, c) => {
      const d = r * 7 + c - 5, y = TOP + 52 + r * (rh + 6), inMonth = d >= 1 && d <= 30, num = inMonth ? d : d < 1 ? 31 + d : d - 30;
      out.push(shape(x, y, w, rh, { fill: inMonth ? WHITE : "#f1f2f7", stroke: LINE, sw: 1 }), txt(x + 10, y + 8, 40, String(num), 18, { bold: true, color: inMonth ? INK : SOFT }));
      if (inMonth && ev[d]) out.push(shape(x + 8, y + 44, w - 16, 50, { fill: TI[ev[d][1]], stroke: A[ev[d][1]], sw: 2, text: th([ev[d][0]], d)[0], size: 15, bold: true }));
      if (inMonth && d === 12) out.push(shape(x + w - 38, y + 8, 28, 28, { kind: "ellipse", fill: A[4], stroke: A[4] }), txt(x + w - 38, y + 12, 28, "12", 13, { bold: true, color: WHITE, align: "center" }));
    });
    return out;
  },

  "project-kickoff"() {
    const T = tv("Project kickoff", (t) => `${t}: project kickoff`);
    const out = board({ name: T, title: T, sub: "New online shop · why, what, who, when and the risks", icon: "rocket", acc: 0, chip: "Kickoff · 17 Nov" });
    const why = card(M, TOP + 12, 380, 290, "Why", "target", A[0]);
    out.push(...why.objs, note(why.x, why.y + 4, why.w, 200, tv("Half our customers ask to order online", (t) => `Make the ${low(t)} easy for everyone`), N.lilac, { size: 24 }));
    const what = card(440, TOP + 12, 400, 290, "What is in, what is out", "list", A[1]);
    out.push(...what.objs, txt(what.x, what.y, 180, "In", 17, { bold: true, color: A[5] }), txt(what.x + 196, what.y, 180, "Out", 17, { bold: true, color: A[4] }));
    th(["Product pages", "Card payments", "Delivery slots"], 0).forEach((t, i) => out.push(tag(what.x, what.y + 30 + i * 44, t, TI[5], { size: 15, h: 34 })));
    ["Mobile app", "Gift cards", "Subscriptions"].forEach((t, i) => out.push(tag(what.x + 196, what.y + 30 + i * 44, t, TI[4], { size: 15, h: 34 })));
    const wh = card(860, TOP + 12, 380, 290, "Who", "users", A[2]);
    out.push(...wh.objs);
    who(["Sara Ahmed, Owner", "Bilal Khan, Design", "Hina Raza, Build", "Omar Shah, Marketing"]).forEach((p, i) => out.push(avatar(wh.x + (i % 2) * 180, wh.y + 4 + Math.floor(i / 2) * 96, 52, p, A[(i + 1) % 6], { sw: 2 }), txt(wh.x + 60 + (i % 2) * 180, wh.y + 8 + Math.floor(i / 2) * 96, 112, nameOf(p), 16, { bold: true }), txt(wh.x + 60 + (i % 2) * 180, wh.y + 32 + Math.floor(i / 2) * 96, 112, roleOf(p), 14, { color: GREY })));
    const wn = card(M, 476, 800, BOT - 476, "When", "calendar", A[3]);
    out.push(...wn.objs, line(wn.x + 20, wn.y + 100, wn.x + 760, wn.y + 100, { stroke: INK, sw: 4, arrow: "end" }));
    [["Week 1", "Plan"], ["Week 3", "Design"], ["Week 6", "Build"], ["Week 8", "Test"], ["Week 9", "Launch"]].forEach(([w, t], i) => { const x = wn.x + 40 + i * 172; out.push(shape(x - 14, wn.y + 86, 28, 28, { kind: "ellipse", fill: A[i % 6], stroke: WHITE, sw: 3 }), txt(x - 60, wn.y + 30, 120, w, 15, { color: GREY, align: "center" }), txt(x - 60, wn.y + 128, 120, th([t], i)[0], 19, { bold: true, align: "center" })); });
    const rk = panel(860, 476, 380, BOT - 476, "Risks", { fill: A[4], icon: "alert" });
    out.push(...rk.objs, ...notesIn(rk, th(["Photos take longer", "Payment approval delay"], 3), { cols: 2, color: N.pink, size: 20 }));
    return out;
  },

  funnel() {
    const T = tv("Sales funnel", (t) => `${t}: sales funnel`);
    const out = board({ name: T, title: T, sub: "From people who hear about us to customers who come back", icon: "trend", acc: 4, chip: "Last 30 days" });
    const st = [["Aware", "50,000", ""], ["Visit", "12,000", "24%"], ["Sign up", "3,000", "25%"], ["Buy", "900", "30%"], ["Buy again", "360", "40%"]];
    st.forEach(([n, v, p], i) => {
      const w = 760 - i * 130, x = M + 20 + (760 - w) / 2, y = TOP + 16 + i * 116;
      out.push(shape(x, y, w, 104, { fill: A[[0, 1, 2, 3, 4][i]], stroke: A[[0, 1, 2, 3, 4][i]], text: `${n}  ·  ${v}`, size: 24, bold: true, tc: WHITE }));
      if (p) out.push(tag(M + 20 + 760 + 14, y - 12, `${p} move on`, TI[i % 6], { size: 15 }));
    });
    out.push(txt(960, TOP + 16, 280, "Ideas to improve", 21, { bold: true }));
    out.push(...notesIn({ x: 960, y: TOP + 56, w: 280, h: BOT - TOP - 56 }, th(["Reels with real customers", "Faster landing page", "First order 10% off", "Thank-you message + review link"], 0), { cols: 1, color: [N.lilac, N.sky, N.mint, N.yellow], size: 20, maxh: 128 }));
    return out;
  },

  "daily-standup"() {
    const T = tv("Daily stand-up", (t) => `${t}: daily stand-up`);
    const out = board({ name: T, title: T, sub: "Yesterday, today and anything in the way · 15 minutes", icon: "users", acc: 0, chip: "Thu 13 Nov" });
    const x0 = 250, cs = columns(3, x0, W - M, 12), hd = [["Yesterday", A[1], N.sky], ["Today", A[5], N.mint], ["Blockers", A[4], N.pink]];
    cs.forEach(({ x, w }, i) => out.push(pill(x, TOP + 8, w, 44, hd[i][0], hd[i][1], { size: 19 })));
    const P = who(["Sara Ahmed, Lead", "Bilal Khan, Design", "Hina Raza, Engineering", "Omar Shah, Sales"]);
    const items = th(["Planned the sprint", "Sent the launch email", "No blockers", "Finished the icons", "Checkout screen", "Need the final copy", "Fixed 3 bugs", "Payment tests", "Waiting for API keys", "Called 12 shops", "Visit 2 new clients", "No blockers"], 0);
    P.forEach((p, r) => {
      const y = TOP + 62 + r * 138;
      out.push(shape(M, y, 196, 128, { fill: WHITE, stroke: LINE }), avatar(M + 12, y + 14, 56, p, A[(r + 1) % 6], { sw: 2 }), txt(M + 12, y + 76, 176, nameOf(p), 17, { bold: true }), txt(M + 12, y + 100, 176, roleOf(p), 14, { color: GREY }));
      cs.forEach(({ x, w }, k) => out.push(note(x, y, w, 128, items[r * 3 + k], hd[k][2], { size: 21 })));
    });
    return out;
  },

  comparison() {
    const T = tv("Which plan is best?", (t) => `${t}: compare the options`);
    const out = board({ name: T, title: T, sub: "Three delivery partners compared, feature by feature", icon: "layers", acc: 1, chip: "Pick by Friday" });
    const x0 = M, fw = 280, cw = 240, opts = th(["SwiftRide", "CityDrop", "GoParcel"], 0);
    out.push(shape(x0, TOP + 12, fw, 70, { fill: WHITE, stroke: LINE, text: "Feature", size: 20, bold: true }));
    opts.forEach((o, i) => out.push(shape(x0 + fw + i * cw, TOP + 12, cw - 8, 70, { fill: i === 1 ? A[1] : INK, stroke: i === 1 ? A[1] : INK, text: o, size: 22, bold: true, tc: WHITE })));
    out.push(tag(x0 + fw + cw + 70, TOP - 6, "Recommended", A[3], { size: 14 }));
    const rows = [["Same-day delivery", 1, 1, 0], ["Live tracking", 0, 1, 1], ["Cash on delivery", 1, 1, 1], ["Cold boxes for food", 0, 1, 0], ["Weekend service", 1, 1, 0]];
    rows.forEach(([f, ...v], r) => {
      const y = TOP + 90 + r * 74;
      out.push(shape(x0, y, fw + cw * 3 - 8, 66, { kind: "rect", fill: r % 2 ? WHITE : "#f6f7fb", stroke: LINE, sw: 1 }), txt(x0 + 18, y + 22, fw - 30, f, 19, { bold: true }));
      v.forEach((ok, i) => out.push(...badge(x0 + fw + i * cw + cw / 2 - 22, y + 11, 44, ok ? "check" : "x", ok ? A[5] : "#c4c8d6", WHITE, { circle: true, sw: 2.6 })));
    });
    const y = TOP + 90 + 5 * 74;
    out.push(shape(x0, y, fw + cw * 3 - 8, 66, { kind: "rect", fill: TI[1], stroke: LINE, sw: 1 }), txt(x0 + 18, y + 22, fw - 30, "Price per parcel", 19, { bold: true }));
    ["PKR 180", "PKR 210", "PKR 150"].forEach((p, i) => out.push(txt(x0 + fw + i * cw, y + 18, cw - 8, p, 24, { bold: true, align: "center" })));
    out.push(note(x0 + fw + cw * 3 + 6, TOP + 12, W - M - (x0 + fw + cw * 3 + 6), 220, "CityDrop: best for food orders", N.yellow, { size: 21 }));
    out.push(note(x0 + fw + cw * 3 + 6, TOP + 250, W - M - (x0 + fw + cw * 3 + 6), 200, "Ask for a 3-month trial", N.mint, { size: 21 }));
    return out;
  },

  brainwriting() {
    const T = tv("Brainwriting 6-3-5", (t) => `${t}: brainwriting`);
    const out = board({ name: T, title: T, sub: "Six people, three ideas each, five minutes per round", icon: "edit", acc: 2, chip: "Round 2 of 6" });
    const x0 = 230, cs = columns(3, x0, W - M, 12);
    ["Idea 1", "Idea 2", "Idea 3"].forEach((n, i) => out.push(pill(cs[i].x, TOP + 6, cs[i].w, 40, n, A[i + 1], { size: 17 })));
    const P = who(["Sara Ahmed", "Bilal Khan", "Hina Raza", "Omar Shah", "Maham Tariq", "Danish Ali"]).map(nameOf);
    const ideas = th(["Free tasting Saturdays", "Recipe cards in bags", "Kids' baking class", "Add a coffee corner", "Seasonal gift boxes", "Office breakfast plan", "Loyalty stamps on the app", "Photo wall for guests", "Late-night orders", "Partner with gyms", "Healthy snack line", "Student discount cards", "Cake of the month", "Delivery by bike", "Wedding tasting days", "Feedback QR on boxes", "Mini cakes for offices", "Charity bake sale"], 0);
    P.forEach((p, r) => {
      const y = TOP + 54 + r * 92;
      out.push(avatar(M, y + 14, 56, p, A[(r + 1) % 6], { sw: 2 }), txt(M + 66, y + 30, 130, p, 18, { bold: true }));
      cs.forEach(({ x, w }, k) => out.push(note(x, y, w, 84, ideas[r * 3 + k], [N.yellow, N.sky, N.mint, N.pink, N.lilac, N.peach][r], { size: 19 })));
    });
    return out;
  },

  "feedback-wall"() {
    const T = tv("Feedback wall", (t) => `${t}: feedback wall`);
    return colBoard({ name: T, title: T, sub: "What customers told us this month, sorted into three groups", icon: "chat", acc: 4, chip: "48 comments", size: 20,
      cols: [["Loved", A[4], N.pink, "heart", th(["\"The chocolate cake is perfect\"", "\"Delivery was super fast\"", "\"Friendly staff every time\"", "\"Love the new boxes\""], 0), "Keep doing this"],
        ["Ideas", A[3], N.yellow, "bulb", th(["\"Add sugar-free options\"", "\"Open on Sunday mornings\"", "\"A loyalty card please\""], 4), "Worth trying"],
        ["Fix next", A[1], N.sky, "tool", th(["\"App crashed at checkout\"", "\"Parking is hard\"", "\"Wrong order once\""], 7), "Fix in December"]] });
  },

  cycle() {
    const T = tv("Plan, do, check, improve", (t) => `${t}: improvement cycle`);
    const out = board({ name: T, title: T, sub: "A cycle we repeat every month to get a little better", icon: "trend", acc: 2, chip: "Monthly" });
    const cx = 480, cy = 466, st = [["Plan", "calendar", A[0], -PI / 2], ["Do", "bolt", A[1], 0], ["Check", "search", A[3], PI / 2], ["Improve", "trend", A[5], PI]];
    out.push(shape(cx - 90, cy - 90, 180, 180, { kind: "ellipse", fill: WHITE, stroke: LINE, sw: 2, text: "Every month", size: 22, bold: true }));
    const nodes = st.map(([n, ic, c, a]) => { const x = cx + Math.cos(a) * 250 - 90, y = cy + Math.sin(a) * 200 - 90; const s = shape(x, y, 180, 180, { kind: "ellipse", fill: c, stroke: c, text: n, size: 26, bold: true, tc: WHITE }); out.push(s, icon(ic, x + 72, y + 26, 36, WHITE)); return s; });
    nodes.forEach((n, i) => out.push(link(n, nodes[(i + 1) % 4], { stroke: INK, sw: 4 })));
    const acts = th(["Set one goal: 10% less waste", "Try smaller batches", "Weigh waste every Friday", "Keep what worked"], 0);
    acts.forEach((t, i) => out.push(...badge(840, TOP + 22 + i * 148, 48, st[i][1], st[i][2], WHITE, { circle: true }), note(900, TOP + 12 + i * 148, 340, 134, t, NOTES[[4, 1, 0, 3][i]], { size: 21 })));
    return out;
  },

  pyramid() {
    const T = tv("Our strategy pyramid", (t) => `${t}: strategy pyramid`);
    const out = board({ name: T, title: T, sub: "From the big why at the top to the work we do each day", icon: "layers", acc: 0, chip: "2027 plan" });
    const L = th(["Vision", "Goals", "Strategy", "Projects", "Daily work"], 0), desc = ["The best bakery in the city", "3 shops and 10,000 regulars", "Fresh, local, fast delivery", "App, new shop, catering", "Bake, serve, deliver, smile"];
    const cx = 420, top = TOP + 16, lh = 112;
    out.push(shape(cx - 110, top, 220, lh - 8, { kind: "triangle", fill: A[0], stroke: A[0] }), txt(cx - 60, top + 58, 120, L[0], 20, { bold: true, color: WHITE, align: "center" }));
    for (let i = 1; i < 5; i++) { const w = 220 + i * 150, y = top + i * lh; out.push(shape(cx - w / 2, y, w, lh - 8, { fill: A[i % 6], stroke: A[i % 6], text: L[i], size: 24, bold: true, tc: WHITE })); }
    desc.forEach((d, i) => { const y = top + i * lh; out.push(line(cx + 120 + i * 75, y + 50, 860, y + 50, { stroke: "#c3c8da", sw: 2, dash: true }), shape(870, y + 6, 370, lh - 20, { fill: WHITE, stroke: A[i % 6], sw: 2, text: d, size: 19, bold: true })); });
    return out;
  },

  "value-proposition"() {
    const T = tv("Value proposition", (t) => `${t}: value proposition`);
    const out = board({ name: T, title: T, sub: "What our customers need, and how our product fits", icon: "heart", acc: 4, chip: "Meal kits" });
    const sx = M + 20, sy = TOP + 30, s = 540;
    out.push(shape(sx, sy, s, s, { kind: "rect", fill: TI[1], stroke: A[1], sw: 3 }), line(sx + s / 2, sy, sx + s / 2, sy + s, { stroke: A[1], sw: 3 }), line(sx + s / 2, sy + s / 2, sx + s, sy + s / 2, { stroke: A[1], sw: 3 }));
    out.push(txt(sx + 14, sy + 14, 240, "Products", 20, { bold: true, color: A[1] }), txt(sx + s / 2 + 14, sy + 14, 240, "Gain makers", 20, { bold: true, color: A[1] }), txt(sx + s / 2 + 14, sy + s / 2 + 14, 240, "Pain fixers", 20, { bold: true, color: A[1] }));
    out.push(...notesIn({ x: sx + 14, y: sy + 56, w: 240, h: 460 }, th(["Weekly meal kits", "Recipe videos", "Spice packs"], 0), { cols: 1, color: N.sky, size: 20, maxh: 130 }));
    out.push(note(sx + s / 2 + 14, sy + 56, 240, 190, th(["Dinner ready in 20 minutes"], 3)[0], N.mint, { size: 21 }), note(sx + s / 2 + 14, sy + s / 2 + 56, 240, 190, th(["No shopping or waste"], 4)[0], N.pink, { size: 21 }));
    const cx = 960, cy = sy + s / 2, r = 270;
    out.push(shape(cx - r, cy - r, r * 2, r * 2, { kind: "ellipse", fill: TI[4], stroke: A[4], sw: 3 }), line(cx - r, cy, cx, cy, { stroke: A[4], sw: 3 }), line(cx, cy - r, cx, cy + r, { stroke: A[4], sw: 3 }));
    out.push(txt(cx - 190, cy - 160, 170, "Gains", 20, { bold: true, color: A[4] }), txt(cx - 190, cy + 30, 170, "Pains", 20, { bold: true, color: A[4] }), txt(cx + 20, cy - 60, 220, "Customer jobs", 20, { bold: true, color: A[4] }));
    out.push(note(cx - 200, cy - 124, 180, 112, th(["Eat healthy"], 5)[0], N.mint, { size: 20 }), note(cx - 200, cy + 66, 180, 112, th(["No time to cook"], 6)[0], N.pink, { size: 20 }), note(cx + 30, cy - 20, 200, 130, th(["Feed a family of 4"], 7)[0], N.yellow, { size: 20 }));
    out.push(line(sx + s + 10, cy, cx - r - 10, cy, { arrow: "both", stroke: INK, sw: 4, text: "Fit" }));
    return out;
  },

  scamper() {
    const T = tv("SCAMPER ideas", (t) => `${t}: SCAMPER`);
    const out = board({ name: T, title: T, sub: "Seven ways to rethink our lunch menu", icon: "sparkle", acc: 0, chip: "7 prompts" });
    const L = [["S", "Swap"], ["C", "Combine"], ["A", "Adapt"], ["M", "Modify"], ["P", "Other use"], ["E", "Remove"], ["R", "Reverse"]];
    const ideas = th(["Brown rice for white", "Soup + sandwich deal", "Office lunch boxes", "Bigger kids' portions", "Leftover bread to croutons", "Drop plastic cutlery", "Pay first, then choose", "Local cheese", "Coffee + cake combo", "Ramadan iftar boxes", "Spicier wraps", "Lunch kits for picnics", "Fewer menu items", "Dessert first day"], 0);
    columns(7, M, W - M, 10).forEach(({ x, w }, i) => {
      out.push(shape(x, TOP + 12, w, BOT - TOP - 12, { fill: WHITE, stroke: LINE }), shape(x + (w - 84) / 2, TOP + 28, 84, 84, { fill: A[i % 6], stroke: A[i % 6], text: L[i][0], size: 46, bold: true, tc: WHITE }), txt(x, TOP + 124, w, L[i][1], 19, { bold: true, align: "center" }));
      out.push(note(x + 8, TOP + 170, w - 16, 180, ideas[i * 2], NOTES[i % 7], { size: 19 }), note(x + 8, TOP + 362, w - 16, 180, ideas[i * 2 + 1], NOTES[(i + 3) % 7], { size: 19 }));
    });
    return out;
  },

  checklist() {
    const T = tv("Event checklist", (t) => `${t}: checklist`);
    const out = board({ name: T, title: T, sub: "Spring fair · what to do and who does it", icon: "checkCircle", acc: 5, chip: "Fair: 14 March" });
    const grp = [["4 weeks before", A[0], th(["Book the venue", "Set the budget", "Invite the stalls", "Order the posters"], 0), 4], ["1 week before", A[3], th(["Confirm the food", "Print the map", "Brief volunteers", "Charge the speakers"], 4), 2], ["On the day", A[4], th(["Set up at 7 am", "Welcome desk", "First aid kit", "Clean up by 6 pm"], 8), 0]];
    const ppl = who(["Sara Ahmed", "Bilal Khan", "Hina Raza", "Omar Shah"]);
    columns(3).forEach(({ x, w }, i) => {
      const [n, c, items, done] = grp[i];
      const p = panel(x, TOP + 12, w, BOT - TOP - 12, n, { fill: c, icon: "clock" });
      out.push(...p.objs, ...bar(p.x, p.y, p.w - 70, 18, done / 4, c, { label: `${done}/4` }));
      items.forEach((t, k) => { const y = p.y + 44 + k * 118; out.push(shape(p.x, y, p.w, 104, { fill: k < done ? TI[5] : "#f6f7fb", stroke: LINE }), ...tick(p.x + 14, y + 36, k < done), txt(p.x + 56, y + 22, p.w - 130, t, fitSize(t, p.w - 130, 20, 13), { bold: true }), txt(p.x + 56, y + 56, p.w - 130, k < done ? "Done" : "Due " + ["Mon", "Wed", "Fri", "Sat"][k], 15, { color: GREY }), avatar(p.x + p.w - 62, y + 26, 50, ppl[(i + k) % 4], A[(i + k + 1) % 6], { sw: 2 })); });
    });
    return out;
  },

  "uml-class"() {
    const T = tv("UML class diagram", (t) => `${t}: class diagram`);
    const out = board({ name: T, title: T, sub: "Online shop · the main classes and how they relate", icon: "db", acc: 0, chip: "v1" });
    const cls = (x, y, name, fields, methods, c) => {
      const w = 280, fh = fields.length * 30 + 16, mh = methods.length * 30 + 16, o = [];
      const head = shape(x, y, w, 50, { kind: "rect", fill: c, stroke: c, text: name, size: 21, bold: true, tc: WHITE });
      o.push(head, shape(x, y + 50, w, fh, { kind: "rect", fill: WHITE, stroke: c, sw: 2 }), shape(x, y + 50 + fh, w, mh, { kind: "rect", fill: "#f6f7fb", stroke: c, sw: 2 }));
      fields.forEach((f, i) => o.push(txt(x + 14, y + 58 + i * 30, w - 20, f, 16, { color: INK })));
      methods.forEach((m, i) => o.push(txt(x + 14, y + 58 + fh + i * 30, w - 20, m, 16, { color: A[0] })));
      return { head, o, box: shape(x, y, w, 50 + fh + mh, { kind: "rect", fill: "none", stroke: "none", sw: 0 }) };
    };
    const a = cls(M, 190, "Customer", ["- id: number", "- name: text", "- phone: text"], ["+ placeOrder()", "+ addAddress()"], A[0]);
    const b = cls(470, 190, "Order", ["- id: number", "- date: date", "- status: text", "- total: money"], ["+ pay()", "+ cancel()"], A[1]);
    const c = cls(900, 190, "Payment", ["- method: text", "- amount: money"], ["+ refund()"], A[2]);
    const d = cls(470, 540, "OrderItem", ["- quantity: number", "- price: money"], ["+ subtotal()"], A[3]);
    const e = cls(900, 540, "Product", ["- name: text", "- stock: number"], ["+ restock()"], A[4]);
    for (const k of [a, b, c, d, e]) out.push(k.box, ...k.o);
    out.push(link(a.box, b.box, { text: "1 … *", arrow: "none" }), link(b.box, c.box, { text: "1 … 1", arrow: "none" }), link(b.box, d.box, { text: "1 … *", arrow: "none" }), link(d.box, e.box, { text: "* … 1", arrow: "none" }));
    return out;
  },

  architecture() {
    const T = tv("System architecture", (t) => `${t}: system architecture`);
    const out = board({ name: T, title: T, sub: "How the apps, services and data of our shop talk to each other", icon: "server", acc: 1, chip: "Cloud · v2" });
    const node = (x, y, t, ic, c, w = 200) => { const s = shape(x, y, w, 76, { fill: WHITE, stroke: c, sw: 3 }); return [s, ...badge(x + 12, y + 18, 40, ic, c), txt(x + 62, y + 27, w - 70, t, fitSize(t, w - 70, 18, 12), { bold: true })]; };
    out.push(shape(300, TOP + 12, 700, BOT - TOP - 12, { fill: TI[1], stroke: A[1], sw: 2, dash: true }), tag(316, TOP + 24, "Our cloud", A[1], { tc: WHITE, size: 15 }));
    const web = node(M, 250, "Web shop", "globe", A[0], 220), app = node(M, 480, "Mobile app", "phone", A[0], 220);
    const api = node(330, 365, "API gateway", "shield", A[1], 230);
    const s1 = node(620, 220, "Orders", "cart", A[2]), s2 = node(620, 365, "Payments", "money", A[2]), s3 = node(620, 510, "Accounts", "user", A[2]);
    const d1 = node(330, 600, "Database", "db", A[3], 230), d2 = node(620, 650, "File storage", "cloud", A[3]);
    const x1 = node(1040, 300, "Bank gateway", "lock", A[4]), x2 = node(1040, 470, "Email service", "mail", A[4]);
    out.push(...web, ...app, ...api, ...s1, ...s2, ...s3, ...d1, ...d2, ...x1, ...x2);
    out.push(link(web[0], api[0]), link(app[0], api[0]), link(api[0], s1[0]), link(api[0], s2[0]), link(api[0], s3[0]), link(s1[0], d1[0], { kind: "elbow" }), link(s3[0], d2[0], { kind: "elbow", fromSide: "bottom", toSide: "top" }), link(s2[0], x1[0]), link(s1[0], x2[0], { kind: "elbow" }));
    out.push(txt(1040, TOP + 24, 200, "Outside services", 18, { bold: true, color: A[4] }));
    return out;
  },

  "strategy-map"() {
    const T = tv("Strategy map", (t) => `${t}: strategy map`);
    const out = board({ name: T, title: T, sub: "Four layers of goals, each one holding up the layer above", icon: "map", acc: 0, chip: "2027" });
    const layers = [["Money", A[5], TI[5], th(["Profit +15%", "New income from catering"], 0)], ["Customers", A[1], TI[1], th(["Faster service", "Top rated in the city", "More regulars"], 2)], ["How we work", A[3], TI[3], th(["Online ordering", "Less waste"], 5)], ["People and skills", A[0], TI[0], th(["Train every baker", "Happy, stable team"], 7)]];
    const rows = layers.map(([n, c, t, goals], r) => {
      const y = TOP + 12 + r * 150;
      out.push(shape(M, y, W - M * 2, 138, { kind: "rect", fill: t, stroke: t }), shape(M, y, 190, 138, { kind: "rect", fill: c, stroke: c, text: n, size: 21, bold: true, tc: WHITE }));
      return goals.map((g, k) => { const s = shape(300 + k * 320 + (goals.length === 2 ? 160 : 0), y + 24, 260, 90, { kind: "ellipse", fill: WHITE, stroke: c, sw: 3, text: g, size: 19, bold: true }); out.push(s); return s; });
    });
    out.push(link(rows[3][0], rows[2][0]), link(rows[3][1], rows[2][1]), link(rows[2][0], rows[1][0]), link(rows[2][1], rows[1][2]), link(rows[1][1], rows[0][0]), link(rows[1][2], rows[0][1]));
    return out;
  },

  "habit-tracker"() {
    const T = tv("Habit tracker", (t) => `${t}: habit tracker`);
    const out = board({ name: T, title: T, sub: "Week of 10 November · a circle for every day you did it", icon: "checkCircle", acc: 5, chip: "Best streak: 12", people: 0 });
    const days = ["M", "T", "W", "T", "F", "S", "S"], hw = 330, cw = 100;
    days.forEach((d, i) => out.push(shape(M + hw + i * cw + 20, TOP + 8, 60, 44, { fill: INK, stroke: INK, text: d, size: 18, bold: true, tc: WHITE })));
    out.push(txt(M + hw + 7 * cw + 10, TOP + 18, 160, "Streak", 18, { bold: true, color: GREY }));
    const hb = th(["Walk 8,000 steps", "Drink 8 glasses of water", "Read 20 pages", "No phone after 10 pm", "Plan tomorrow", "Call family"], 0), ics = ["fitness", "coffee", "book", "phone", "list", "heart"];
    const done = [[1, 1, 1, 0, 1, 1, 1], [1, 1, 0, 1, 1, 1, 0], [1, 0, 1, 1, 0, 1, 1], [0, 1, 1, 1, 1, 0, 0], [1, 1, 1, 1, 1, 0, 1], [1, 0, 0, 1, 0, 1, 1]];
    hb.forEach((h, r) => {
      const y = TOP + 64 + r * 92, c = A[r % 6];
      out.push(shape(M, y, hw + cw * 7 + 190, 82, { fill: WHITE, stroke: LINE }), ...badge(M + 14, y + 17, 48, ics[r], c), txt(M + 74, y + 28, hw - 80, h, fitSize(h, hw - 80, 19, 13), { bold: true }));
      done[r].forEach((d, i) => out.push(shape(M + hw + i * cw + 28, y + 19, 44, 44, { kind: "ellipse", fill: d ? c : WHITE, stroke: d ? c : "#c4c8d6", sw: 3 })));
      out.push(txt(M + hw + 7 * cw + 10, y + 22, 160, `${done[r].filter(Boolean).length} days`, 22, { bold: true, color: c }));
    });
    return out;
  },

  "risk-matrix"() {
    const T = tv("Risk matrix", (t) => `${t}: risk matrix`);
    const out = board({ name: T, title: T, sub: "How likely, how serious: the red corner gets a plan this week", icon: "alert", acc: 4, chip: "8 risks" });
    const x0 = 150, y0 = TOP + 12, cw = 220, ch = 176, heat = [["#fde68a", "#fdba74", "#fca5a5"], ["#d9f99d", "#fde68a", "#fdba74"], ["#bbf7d0", "#d9f99d", "#fde68a"]];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(shape(x0 + c * (cw + 6), y0 + r * (ch + 6), cw, ch, { kind: "rect", fill: heat[r][c], stroke: WHITE, sw: 2 }));
    ["High", "Medium", "Low"].forEach((t, r) => out.push(txt(M, y0 + r * (ch + 6) + ch / 2 - 12, 100, t, 18, { bold: true, align: "right" })));
    ["Minor", "Moderate", "Severe"].forEach((t, c) => out.push(txt(x0 + c * (cw + 6), y0 + 3 * (ch + 6) + 4, cw, t, 18, { bold: true, align: "center" })));
    const risks = th(["Key baker leaves", "Oven breaks down", "Flour price jump", "Bad review goes viral", "Power cuts", "Late supplier", "Card machine fails", "Rain on fair day"], 0);
    const pos = [[0, 2], [0, 1], [1, 2], [1, 1], [0, 0], [1, 0], [2, 1], [2, 0]];
    pos.forEach(([r, c], i) => out.push(shape(x0 + c * (cw + 6) + 24 + (i % 2) * 90, y0 + r * (ch + 6) + 40 + (i % 2) * 40, 52, 52, { kind: "ellipse", fill: INK, stroke: WHITE, sw: 3, text: String(i + 1), size: 20, bold: true, tc: WHITE })));
    const lx = x0 + 3 * (cw + 6) + 24, lp = card(lx, TOP + 12, W - M - lx, BOT - TOP - 12, "Risks", "list", A[4]);
    out.push(...lp.objs);
    risks.forEach((t, i) => out.push(shape(lp.x, lp.y + i * 64, 36, 36, { kind: "ellipse", fill: INK, stroke: INK, text: String(i + 1), size: 15, bold: true, tc: WHITE }), txt(lp.x + 46, lp.y + 6 + i * 64, lp.w - 46, t, fitSize(t, lp.w - 46, 18, 12), { bold: i < 3 })));
    return out;
  },

  "five-forces"() {
    const T = tv("Five forces", (t) => `${t}: five forces`);
    const out = board({ name: T, title: T, sub: "How strong is the competition around our bakery?", icon: "shield", acc: 0, chip: "Market review" });
    const f = (x, y, n, d, lvl, c) => { const s = shape(x, y, 300, 150, { fill: WHITE, stroke: c, sw: 3 }); return [s, pill(x + 14, y + 14, 200, 38, n, c, { size: 16 }), tag(x + 222, y + 20, lvl, lvl === "High" ? TI[4] : lvl === "Low" ? TI[5] : TI[3], { size: 13 }), txt(x + 16, y + 64, 270, d, 20, { color: INK, bold: true })]; };
    const mid = shape(490, 380, 300, 170, { fill: INK, stroke: INK, text: "Rivalry: 6 bakeries within 2 km", size: 22, bold: true, tc: WHITE });
    const top = f(490, TOP + 20, "New entrants", th(["Home bakers selling online"], 0)[0], "Medium", A[1]);
    const lft = f(M + 20, 390, "Suppliers", th(["Only two good flour mills"], 1)[0], "High", A[3]);
    const rgt = f(940, 390, "Buyers", th(["Easy to switch shops"], 2)[0], "High", A[4]);
    const bot = f(490, 604, "Substitutes", th(["Supermarket cakes, sweets"], 3)[0], "Low", A[5]);
    out.push(mid, ...top, ...lft, ...rgt, ...bot);
    for (const s of [top[0], lft[0], rgt[0], bot[0]]) out.push(link(s, mid, { stroke: INK, sw: 3 }));
    return out;
  },

  "renovation-plan"() {
    const T = tv("Home renovation plan", (t) => `${t}: renovation plan`);
    const out = board({ name: T, title: T, sub: "Room by room: what changes, what it costs and when", icon: "home", acc: 3, chip: "Budget PKR 1.8M", people: 0 });
    const rooms = [["Kitchen", "interior kitchen home", "PKR 750k", th(["New cabinets", "Brighter lights"], 0)], ["Living room", "interior living room furniture", "PKR 450k", th(["Paint warm white", "Wooden floor"], 2)], ["Bedroom", "interior bedroom home", "PKR 300k", th(["Built-in wardrobe", "Blackout curtains"], 4)]], used = [];
    rooms.forEach(([n, topic, cost, items], i) => {
      const x = M + i * 404, w = 388;
      out.push(shape(x, TOP + 12, w, 400, { fill: WHITE, stroke: LINE }), ...photo(x + 12, TOP + 24, w - 24, 190, topic, { slot: i, card: false, used, exclude: used.slice() }), txt(x + 16, TOP + 226, 200, n, 24, { bold: true }), tag(x + w - 118, TOP + 228, cost, TI[3], { size: 15 }));
      items.forEach((t, k) => out.push(note(x + 16 + k * 182, TOP + 270, 172, 128, t, [N.yellow, N.peach][k], { size: 20 })));
    });
    out.push(txt(M, 590, 300, "Order of work", 21, { bold: true }));
    ["Plan and buy", "Kitchen", "Living room", "Bedroom", "Clean and move in"].forEach((t, i) => { const s = pill(M + i * 242, 630, 222, 54, t, A[i % 6], { size: 18 }); out.push(s, txt(M + i * 242, 696, 222, ["Dec", "Jan", "Feb", "Mar", "Apr"][i], 16, { color: GREY, align: "center" })); if (i) out.push(line(M + i * 242 - 18, 657, M + i * 242 - 2, 657, { arrow: "end", stroke: INK, sw: 3 })); });
    return out;
  },

  "brainstorm-grid"() {
    const T = tv("Brainstorm grid", (t) => `${t}: ideas by category`);
    const out = board({ name: T, title: T, sub: "Ideas for next year, sorted into six areas", icon: "grid", acc: 0, chip: "36 ideas" });
    const cats = [["Product", "star", A[0], N.lilac], ["Marketing", "chart", A[4], N.pink], ["Service", "heart", A[2], N.mint], ["Team", "users", A[1], N.sky], ["Tech", "phone", A[3], N.yellow], ["Events", "calendar", A[5], N.lime]];
    const ideas = th(["Sugar-free range", "Party platters", "Mini cakes", "Reels twice a week", "Food bloggers", "Referral cards", "Order by WhatsApp", "Free gift wrap", "Faster pickup", "Monthly awards", "Baking school", "Uniforms", "Online booking", "Stock app", "Card terminal", "Tasting night", "Kids' class", "Charity bake sale"], 0);
    cats.forEach(([n, ic, c, nc], i) => {
      const x = M + (i % 3) * 404, y = TOP + 12 + Math.floor(i / 3) * 300;
      const p = panel(x, y, 388, 288, n, { fill: c, icon: ic });
      out.push(...p.objs, ...notesIn(p, ideas.slice(i * 3, i * 3 + 3), { cols: 3, color: nc, size: 19 }));
    });
    return out;
  },

  "doodle-brainstorm"() {
    const T = tv("Doodle brainstorm", (t) => `${t}: doodle brainstorm`);
    const out = board({ name: T, title: T, sub: "Big ideas, drawn fast: what could our weekend market stall be?", icon: "edit", acc: 3, chip: "Hand-drawn" });
    const cx = 640, cy = 470;
    out.push(pen(wobble(ring(cx, cy, 120, 40), 7), INK, 5), txt(cx - 100, cy - 30, 200, tv("Market stall ideas", (t) => cap(t)), 26, { bold: true, align: "center" }));
    const ideas = th(["Live baking show", "Free mini tastes", "Kids decorate cookies", "Photo frame for selfies", "Pre-order boxes", "Stamp card"], 0);
    const spots = [[150, 200], [520, 190], [900, 200], [150, 560], [520, 600], [900, 560]];
    ideas.forEach((t, i) => {
      const [x, y] = spots[i], c = NOTES[i % 7];
      const n = note(x + (i % 3 === 1 ? -10 : 0), y, 190, 150, t, c, { size: 22 }); n.rot = [-4, 3, -2, 4, -3, 2][i];
      out.push(n);
      const ex = x + 95, ey = y + (y < cy ? 160 : -12), tx = cx + (ex - cx) * 0.42, ty = cy + (ey - cy) * 0.5;
      out.push(pen(wobble([[ex, ey], [(ex + tx) / 2 + 12, (ey + ty) / 2 - 8], [tx, ty]], 2), A[i % 6], 4));
    });
    out.push(pen(wobble(ring(1150, 420, 26, 10), 3), A[3], 4), pen([[1124, 420], [1176, 420]], A[3], 4), pen([[1150, 394], [1150, 446]], A[3], 4));
    out.push(pen(wobble([[60, 420], [90, 400], [120, 430], [150, 405], [180, 432]], 1), A[4], 5), pen([[440, 470], [470, 455], [440, 440]], INK, 4), pen([[840, 470], [810, 455], [840, 440]], INK, 4));
    return out;
  },

  "sequence-diagram"() {
    const T = tv("Sequence diagram", (t) => `${t}: sequence diagram`);
    const out = board({ name: T, title: T, sub: "Paying for an order in the app, step by step", icon: "list", acc: 1, chip: "Happy path" });
    const who4 = [["Customer", A[0], "user"], ["Shop app", A[1], "phone"], ["Payment service", A[2], "money"], ["Bank", A[3], "lock"]];
    const xs = who4.map((_, i) => 160 + i * 320);
    who4.forEach(([n, c, ic], i) => out.push(shape(xs[i] - 120, TOP + 10, 240, 60, { fill: c, stroke: c }), icon(ic, xs[i] - 104, TOP + 28, 24, WHITE), txt(xs[i] - 72, TOP + 27, 184, n, fitSize(n, 184, 19, 12), { bold: true, color: WHITE }), line(xs[i], TOP + 74, xs[i], BOT - 6, { stroke: "#9aa1b5", sw: 2, dash: true })));
    const msgs = [[0, 1, "Taps Pay now"], [1, 2, "Create payment"], [2, 3, "Check the card"], [3, 2, "Approved"], [2, 1, "Payment done"], [1, 0, "Shows receipt"]];
    msgs.forEach(([a, b, t], i) => {
      const y = TOP + 120 + i * 92;
      out.push(shape(xs[b] - 8, y - 14, 16, 70, { kind: "rect", fill: TI[b], stroke: who4[b][1], sw: 2 }));
      out.push(line(xs[a] + (b > a ? 8 : -8), y, xs[b] + (b > a ? -10 : 10), y, { arrow: "end", stroke: b > a ? INK : "#6a7389", sw: 3, dash: b < a }), txt(Math.min(xs[a], xs[b]) + 20, y - 34, 280, th([t], i)[0], 17, { bold: true, align: "center" }));
    });
    return out;
  },

  "now-next-later"() {
    const T = tv("Now, next, later", (t) => `${t}: now, next, later`);
    return colBoard({ name: T, title: T, sub: "A simple roadmap in three time buckets", icon: "map", acc: 2, chip: "Updated weekly",
      cols: [["Now", A[4], N.pink, "bolt", th(["Fix checkout bugs", "New price list", "Holiday menu", "Hire a cashier"], 0), "This month"],
        ["Next", A[3], N.yellow, "arrow", th(["Loyalty app", "Office lunch plans", "New photos", "Weekend brunch"], 4), "Next 3 months"],
        ["Later", A[1], N.sky, "clock", th(["Second branch", "Catering van", "Baking school"], 8), "This year or after"]] });
  },

  "mad-sad-glad"() {
    const T = tv("Mad, sad, glad", (t) => `${t}: mad, sad, glad`);
    return colBoard({ name: T, title: T, sub: "A feelings retro: be honest, be kind", icon: "smile", acc: 4, chip: "Sprint 14",
      cols: [["Mad", A[4], N.pink, "angry", th(["Server went down twice", "Scope changed on Thursday", "Too many pings"], 0), "What frustrated you?"],
        ["Sad", A[1], N.sky, "frown", th(["Missed the demo", "Hina is leaving", "Bugs found late"], 3), "What let you down?"],
        ["Glad", A[5], N.mint, "smile", th(["Launch went smoothly", "Great customer emails", "New teammate settled in", "Pizza Friday"], 6), "What made you happy?"]] });
  },

  "vertical-timeline"() {
    const T = tv("Our story", (t) => `${t}: our story`);
    const out = board({ name: T, title: T, sub: "Milestones from the first stall to three shops", icon: "flag", acc: 3, chip: "2009 – 2026" });
    const cx = 640;
    out.push(line(cx, TOP + 10, cx, BOT - 4, { stroke: INK, sw: 5 }));
    const ms = [["2009", "A market stall on Sundays"], ["2012", "First shop opens"], ["2016", "Wedding cakes added"], ["2019", "Online orders"], ["2023", "Second shop"], ["2026", "Third shop and an app"]];
    const tx = th(ms.map((m) => m[1]), 0);
    ms.forEach(([y0], i) => {
      const y = TOP + 18 + i * 98, left = i % 2 === 0, c = A[i % 6];
      out.push(shape(cx - 16, y + 24, 32, 32, { kind: "ellipse", fill: c, stroke: WHITE, sw: 4 }), pill(left ? cx + 34 : cx - 34 - 100, y + 18, 100, 44, y0, c, { size: 18 }));
      out.push(shape(left ? cx - 40 - 420 : cx + 40, y + 6, 420, 76, { fill: WHITE, stroke: c, sw: 2, text: tx[i], size: 20, bold: true }));
    });
    out.push(...photo(M + 8, TOP + 20, 140, 120, "food bakery bread", { slot: 0 }), ...photo(W - M - 148, BOT - 140, 140, 120, "city shop street", { slot: 1 }));
    return out;
  },

  bracket() {
    const T = tv("Best new cake: team vote", (t) => `${t}: tournament`);
    const out = board({ name: T, title: T, sub: "Eight ideas, quarter finals to one winner", icon: "trophy", acc: 3, chip: "Final: Friday" });
    const e = th(["Mango cheesecake", "Pistachio roll", "Date and walnut", "Lemon drizzle", "Chai tres leches", "Rose falooda cake", "Carrot cake", "Red velvet"], 0);
    const w = 230, hgt = 58, xs = [M, 330, 620], ys0 = e.map((_, i) => TOP + 14 + i * 74);
    const r1 = e.map((t, i) => shape(xs[0], ys0[i], w, hgt, { fill: WHITE, stroke: LINE, sw: 2, text: t, size: 17, bold: true }));
    const r2 = [0, 1, 2, 3].map((i) => shape(xs[1], (ys0[i * 2] + ys0[i * 2 + 1]) / 2, w, hgt, { fill: TI[i % 6], stroke: A[i % 6], sw: 2, text: e[[0, 3, 4, 7][i]], size: 17, bold: true }));
    const r3 = [0, 1].map((i) => shape(xs[2], (r2[i * 2].y + r2[i * 2 + 1].y) / 2, w, hgt, { fill: A[i ? 4 : 0], stroke: A[i ? 4 : 0], text: e[[0, 4][i]], size: 17, bold: true, tc: WHITE }));
    const win = shape(910, (r3[0].y + r3[1].y) / 2 - 30, 300, 118, { fill: A[3], stroke: A[3], text: "Winner: " + e[4], size: 22, bold: true, tc: WHITE });
    out.push(...r1, ...r2, ...r3, win, ...badge(1030, win.y - 70, 60, "trophy", A[3], WHITE, { circle: true }));
    r1.forEach((s, i) => out.push(link(s, r2[Math.floor(i / 2)], { kind: "elbow", arrow: "none", stroke: "#9aa1b5" })));
    r2.forEach((s, i) => out.push(link(s, r3[Math.floor(i / 2)], { kind: "elbow", arrow: "none", stroke: "#9aa1b5" })));
    r3.forEach((s) => out.push(link(s, win, { kind: "elbow", arrow: "none", stroke: "#9aa1b5" })));
    out.push(note(940, 640, 270, 110, "Voting closes Thursday 5 pm", N.yellow, { size: 20 }));
    return out;
  },

  "seating-plan"() {
    const T = tv("Seating plan", (t) => `${t}: seating plan`);
    const out = board({ name: T, title: T, sub: "Annual dinner · 6 tables of 8, stage at the front", icon: "users", acc: 4, chip: "48 guests", people: 0 });
    out.push(shape(260, TOP + 10, 560, 56, { fill: INK, stroke: INK, text: "Stage", size: 22, bold: true, tc: WHITE }));
    const names = ["Family", "Friends", "Team A", "Team B", "Guests", "Partners"];
    names.forEach((n, i) => {
      const cx = 160 + (i % 3) * 380, cy = 340 + Math.floor(i / 3) * 260, c = A[i % 6];
      for (let k = 0; k < 8; k++) { const a = (k / 8) * 2 * PI; out.push(shape(cx + Math.cos(a) * 92 - 18, cy + Math.sin(a) * 92 - 18, 36, 36, { kind: "ellipse", fill: k % 3 ? TI[i % 6] : c, stroke: c, sw: 2 })); }
      out.push(shape(cx - 66, cy - 66, 132, 132, { kind: "ellipse", fill: WHITE, stroke: c, sw: 3, text: `Table ${i + 1}\n${th([n], i)[0]}`, size: 18, bold: true }));
    });
    const gp = card(980, TOP + 10, 260, BOT - TOP - 10, "Guest notes", "list", A[4]);
    out.push(...gp.objs, ...notesIn(gp, th(["Table 1: grandparents near the stage", "Vegetarian meals: 6", "High chair at table 2"], 3), { cols: 1, color: [N.pink, N.mint, N.yellow], size: 19 }));
    return out;
  },

  "meal-planner"() {
    const T = tv("Weekly meal plan", (t) => `${t}: meal plan`);
    const out = board({ name: T, title: T, sub: "Breakfast, lunch and dinner for the week, plus the shopping list", icon: "food", acc: 5, chip: "Family of 4", people: 0 });
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"], meals = [["Breakfast", A[3], N.yellow], ["Lunch", A[5], N.mint], ["Dinner", A[0], N.lilac]], x0 = 170, cw = 160;
    days.forEach((d, i) => out.push(pill(x0 + i * cw, TOP + 8, cw - 10, 42, d, INK, { size: 17 })));
    const food = th(["Paratha and eggs", "Oats and fruit", "Yogurt bowl", "Halwa puri", "Pancakes", "Chicken wrap", "Daal and rice", "Pasta salad", "Chana chaat", "Club sandwich", "Chicken karahi", "Veg biryani", "Fish and greens", "Keema with naan", "Pizza night"], 0);
    meals.forEach(([m, c, nc], r) => { const y = TOP + 60 + r * 150; out.push(shape(M, y, 120, 140, { fill: c, stroke: c, text: m, size: 18, bold: true, tc: WHITE })); days.forEach((_, i) => out.push(note(x0 + i * cw, y, cw - 10, 140, food[r * 5 + i], nc, { size: 19 }))); });
    const sl = card(990, TOP + 8, 250, 320, "Shopping list", "cart", A[5]);
    out.push(...sl.objs, ...["Eggs (12)", "Chicken 1 kg", "Rice 5 kg", "Spinach", "Yogurt"].flatMap((t, i) => [...tick(sl.x, sl.y + i * 46, i < 2), txt(sl.x + 40, sl.y + 4 + i * 46, 190, t, 17)]));
    out.push(...photo(998, 528, 234, 226, "food cooking kitchen", { slot: 0 }));
    return out;
  },

  "kanban-swimlanes"() {
    const T = tv("Kanban with swimlanes", (t) => `${t}: team kanban`);
    const out = board({ name: T, title: T, sub: "Status across, one lane per team", icon: "grid", acc: 0, chip: "WIP limit: 3" });
    const x0 = 210, cs = columns(3, x0, W - M, 12), st = [["To do", A[0]], ["Doing", A[3]], ["Done", A[5]]];
    cs.forEach(({ x, w }, i) => out.push(pill(x, TOP + 8, w, 44, st[i][0], st[i][1], { size: 19 })));
    const lanes = [["Design", "palette", N.lilac], ["Build", "tool", N.sky], ["Marketing", "chart", N.pink]];
    const items = th(["Menu card", "App icons", "Shop sign", "Order screen", "Payments", "Login", "Launch post", "Flyers", "Press note"], 0);
    lanes.forEach(([n, ic, nc], r) => {
      const y = TOP + 62 + r * 182;
      out.push(shape(M, y, W - M * 2, 172, { kind: "rect", fill: r % 2 ? WHITE : "#f3f4f9", stroke: LINE, sw: 1 }), ...badge(M + 14, y + 20, 48, ic, A[r % 6]), txt(M + 14, y + 80, 150, n, 20, { bold: true }));
      cs.forEach(({ x, w }, k) => { const cnt = (r + k) % 2 ? 1 : 2; for (let j = 0; j < cnt; j++) out.push(note(x + 8 + j * ((w - 16) / 2 + 4), y + 14, (w - 16) / 2 - 4, 144, items[(r * 3 + k + j) % items.length], nc, { size: 19 })); });
    });
    return out;
  },

  "onion-diagram"() {
    const T = tv("Onion diagram", (t) => `${t}: who is involved`);
    const out = board({ name: T, title: T, sub: "Rings from the core team outwards: who is closest to the work", icon: "target", acc: 1, chip: "New app project" });
    const cx = 420, cy = 466, R = [300, 225, 150, 78], L = ["Community", "Partners", "Wider team", "Core team"];
    R.forEach((r, i) => out.push(shape(cx - r, cy - r * 0.95, r * 2, r * 1.9, { kind: "ellipse", fill: [TI[2], TI[1], TI[0], A[0]][i], stroke: WHITE, sw: 3 }), txt(cx - 120, cy - r * 0.95 + (i === 3 ? 56 : 14), 240, L[i], i === 3 ? 22 : 18, { bold: true, align: "center", color: i === 3 ? WHITE : INK })));
    const g = [["Core team", A[0], th(["Product lead", "2 engineers", "Designer"], 0)], ["Wider team", A[1], th(["Sales", "Support", "Finance"], 3)], ["Partners", A[2], th(["Delivery firm", "Payment app"], 6)], ["Community", A[3], th(["Customers", "Local shops"], 8)]];
    g.forEach(([n, c, items], i) => { const y = TOP + 16 + i * 150; out.push(pill(800, y, 180, 40, n, c, { size: 17 })); items.forEach((t, k) => out.push(tag(800 + k * 148, y + 56, t, TI[i % 6], { size: 15, h: 36 }))); });
    return out;
  },

  "radar-chart"() {
    const T = tv("Team skills radar", (t) => `${t}: skills radar`);
    const out = board({ name: T, title: T, sub: "Where we are strong today, and where we want to be by June", icon: "target", acc: 0, chip: "Score 1–5" });
    const cx = 460, cy = 470, R = 250, ax = th(["Design", "Coding", "Sales", "Writing", "Data", "Support"], 0);
    const pt = (i, v) => [cx + Math.cos((i / 6) * 2 * PI - PI / 2) * R * v, cy + Math.sin((i / 6) * 2 * PI - PI / 2) * R * v];
    const poly = (vals, stroke, sw) => vals.map((v, i) => { const [x1, y1] = pt(i, v), [x2, y2] = pt((i + 1) % 6, vals[(i + 1) % 6]); return line(x1, y1, x2, y2, { stroke, sw }); });
    for (let k = 1; k <= 4; k++) out.push(...poly(Array(6).fill(k / 4), "#c9cde0", 2));
    for (let i = 0; i < 6; i++) { const [x, y] = pt(i, 1); out.push(line(cx, cy, x, y, { stroke: "#c9cde0", sw: 2 })); const [lx, ly] = pt(i, 1.17); out.push(txt(lx - 70, ly - 12, 140, ax[i], 19, { bold: true, align: "center" })); }
    const now = [0.8, 0.6, 0.4, 0.7, 0.5, 0.9], goal = [0.9, 0.8, 0.75, 0.8, 0.8, 0.9];
    out.push(...poly(goal, A[3], 5), ...poly(now, A[0], 6));
    now.forEach((v, i) => { const [x, y] = pt(i, v); out.push(shape(x - 9, y - 9, 18, 18, { kind: "ellipse", fill: A[0], stroke: WHITE, sw: 2 })); });
    out.push(pill(860, TOP + 30, 180, 44, "Today", A[0], { size: 18 }), pill(1060, TOP + 30, 180, 44, "June goal", A[3], { size: 18 }));
    out.push(...notesIn({ x: 860, y: TOP + 100, w: 380, h: 480 }, th(["Sales training in January", "Data course for two people", "Writing club on Fridays", "Hire a support lead"], 3), { cols: 2, color: [N.yellow, N.sky, N.mint, N.pink], size: 21 }));
    return out;
  },

  "lotus-blossom"() {
    const T = tv("Lotus blossom", (t) => `${t}: lotus blossom`);
    const out = board({ name: T, title: T, sub: "One theme, eight ideas around it, each grown into more", icon: "sparkle", acc: 4, chip: "Ideas: 40+" });
    const cs = 64, g = 4, bg = 14, bs = cs * 3 + g * 2, x0 = M + 20, y0 = TOP + 6;
    const center = tv("Happy guests", (t) => cap(t)), petals = ["Faster service", "Better menu", "Rewards", "Cosy space", "Delivery", "Events", "Friendly staff", "Reviews"];
    const subs = [["Two tills", "Pre-order", "Clear queue"], ["Seasonal", "Healthy", "Kids' menu"], ["Stamps", "Birthday", "Referral"], ["Plants", "Music", "Wi-Fi"], ["Bikes", "Slots", "Tracking"], ["Tastings", "Classes", "Markets"], ["Training", "Uniforms", "Names"], ["QR cards", "Survey", "Replies"]];
    const ring8 = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
    for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
      const bx = x0 + bc * (bs + bg), by = y0 + br * (bs + bg), mid = br === 1 && bc === 1, pi = ring8.findIndex(([c, r]) => c === bc && r === br);
      const theme = mid ? center : petals[pi], c = mid ? A[4] : A[pi % 6];
      for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
        const x = bx + q * (cs + g), y = by + r * (cs + g), core = r === 1 && q === 1, k = ring8.findIndex(([cc, rr]) => cc === q && rr === r);
        const text = core ? theme : mid ? petals[k] : subs[pi][k % 3];
        out.push(shape(x, y, cs, cs, { kind: "rect", fill: core ? c : mid ? TI[k % 6] : TI[pi % 6], stroke: WHITE, sw: 1, text, size: 11, bold: core, tc: core ? WHITE : INK }));
      }
    }
    const rx = x0 + 3 * bs + 2 * bg + 40;
    out.push(txt(rx, TOP + 10, W - M - rx, "How it works", 22, { bold: true }));
    ["Write the theme in the middle", "Add eight ideas around it", "Copy each idea to the middle of its own square", "Grow eight more ideas from each one"].forEach((t, i) => out.push(shape(rx, TOP + 56 + i * 82, 44, 44, { kind: "ellipse", fill: A[4], stroke: A[4], text: String(i + 1), size: 19, bold: true, tc: WHITE }), txt(rx + 56, TOP + 66 + i * 82, W - M - rx - 60, t, fitSize(t, W - M - rx - 60, 19, 13), { bold: true })));
    out.push(note(rx, TOP + 400, W - M - rx, 190, "Pick the three ideas with the most votes", N.yellow, { size: 24 }));
    return out;
  },

  "hero-journey"() {
    const T = tv("Story circle", (t) => `${t}: story circle`);
    const out = board({ name: T, title: T, sub: "A brand story in eight steps, from everyday life to change", icon: "book", acc: 0, chip: "Video script" });
    const cx = 490, cy = 470, R = 240;
    out.push(shape(cx - R, cy - R, R * 2, R * 2, { kind: "ellipse", fill: TI[0], stroke: A[0], sw: 4 }), line(cx - R, cy, cx + R, cy, { stroke: A[0], sw: 2, dash: true }));
    out.push(txt(cx - 140, cy - 70, 280, "Everyday world", 18, { bold: true, color: GREY, align: "center" }), txt(cx - 140, cy + 46, 280, "New world", 18, { bold: true, color: GREY, align: "center" }));
    const st = th(["A busy mum", "Wants healthy dinners", "Tries our meal kit", "Finds it easy", "Family loves it", "Saves 5 hours a week", "Tells her friends", "Cooks with joy"], 0);
    st.forEach((t, i) => { const a = (i / 8) * 2 * PI - PI / 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; out.push(shape(x - 26, y - 26, 52, 52, { kind: "ellipse", fill: A[i % 6], stroke: WHITE, sw: 3, text: String(i + 1), size: 20, bold: true, tc: WHITE })); const lx = x + (Math.cos(a) >= -0.01 ? 34 : -210), ly = y - 20; out.push(shape(lx, ly, 176, 44, { fill: WHITE, stroke: A[i % 6], sw: 2, text: t, size: 15, bold: true })); });
    out.push(...notesIn({ x: 960, y: TOP + 20, w: 280, h: 560 }, th(["Open on a messy kitchen", "Show the box arriving", "End with a family dinner"], 4), { cols: 1, color: [N.yellow, N.sky, N.mint], size: 21, maxh: 170 }));
    return out;
  },

  burndown() {
    const T = tv("Sprint burndown", (t) => `${t}: burndown chart`);
    const out = board({ name: T, title: T, sub: "Points left each day against the ideal line · Sprint 14", icon: "chart", acc: 1, chip: "Day 7 of 10" });
    const x0 = 120, y0 = TOP + 20, w = 760, h = 520;
    for (let k = 0; k <= 4; k++) { const y = y0 + (h * k) / 4; out.push(line(x0, y, x0 + w, y, { stroke: "#e3e6ef", sw: 1.5 }), txt(M, y - 12, 70, String(40 - k * 10), 16, { align: "right", color: GREY })); }
    for (let d = 0; d <= 10; d++) out.push(txt(x0 + (w * d) / 10 - 20, y0 + h + 10, 40, String(d), 15, { align: "center", color: GREY }));
    out.push(line(x0, y0, x0, y0 + h, { stroke: INK, sw: 3 }), line(x0, y0 + h, x0 + w + 10, y0 + h, { stroke: INK, sw: 3 }), txt(x0, y0 + h + 34, w, "Day of the sprint", 17, { bold: true, align: "center" }));
    out.push(line(x0, y0, x0 + w, y0 + h, { stroke: "#9aa1b5", sw: 3, dash: true }));
    const left = [40, 38, 35, 33, 30, 24, 22, 18];
    const pts = left.map((v, d) => [x0 + (w * d) / 10, y0 + h - (h * v) / 40]);
    out.push(pen(pts, A[4], 6));
    pts.forEach(([x, y]) => out.push(shape(x - 8, y - 8, 16, 16, { kind: "ellipse", fill: A[4], stroke: WHITE, sw: 2 })));
    const k = [["18", "points left"], ["22", "points done"], ["3", "days to go"]];
    k.forEach(([v, n], i) => out.push(shape(930, TOP + 20 + i * 132, 310, 118, { fill: WHITE, stroke: LINE }), txt(950, TOP + 34 + i * 132, 120, v, 46, { bold: true, color: [A[4], A[5], A[1]][i] }), txt(1060, TOP + 58 + i * 132, 170, n, 19, { bold: true, color: GREY })));
    out.push(note(930, TOP + 420, 310, 170, th(["Slightly behind: move two small tasks out"], 0)[0], N.yellow, { size: 21 }));
    return out;
  },

  pareto() {
    const T = tv("Why customers complain", (t) => `${t}: Pareto chart`);
    const out = board({ name: T, title: T, sub: "Pareto chart: the first three causes make up 80% of complaints", icon: "chart", acc: 4, chip: "214 complaints" });
    const x0 = 110, y0 = TOP + 20, w = 820, h = 480, causes = th(["Late delivery", "Wrong item", "Cold food", "Rude reply", "App error", "Other"], 0), v = [82, 52, 38, 18, 14, 10];
    const tot = v.reduce((a, b) => a + b, 0), bw = w / 6;
    out.push(line(x0, y0 + h, x0 + w, y0 + h, { stroke: INK, sw: 3 }), line(x0, y0, x0, y0 + h, { stroke: INK, sw: 3 }));
    let cum = 0;
    const pts = v.map((n, i) => { const bh = (h * n) / 90; out.push(shape(x0 + i * bw + 14, y0 + h - bh, bw - 28, bh, { kind: "rect", fill: i < 3 ? A[4] : "#c9cde0", stroke: i < 3 ? A[4] : "#c9cde0" }), txt(x0 + i * bw, y0 + h - bh - 30, bw, String(n), 18, { bold: true, align: "center" }), txt(x0 + i * bw, y0 + h + 10, bw, causes[i], fitSize(causes[i], bw - 4, 16, 11), { bold: true, align: "center" })); cum += n; return [x0 + i * bw + bw / 2, y0 + h - (h * cum) / tot]; });
    out.push(pen(pts, A[1], 5), ...pts.map(([x, y]) => shape(x - 8, y - 8, 16, 16, { kind: "ellipse", fill: A[1], stroke: WHITE, sw: 2 })));
    out.push(line(x0, y0 + h * 0.2, x0 + w, y0 + h * 0.2, { stroke: A[1], sw: 2, dash: true }), tag(x0 + w - 70, y0 + h * 0.2 - 34, "80%", TI[1], { size: 14 }));
    out.push(...notesIn({ x: 970, y: TOP + 20, w: 270, h: 560 }, th(["Fix delivery first: 2 more riders", "Double-check packing", "Insulated bags"], 3), { cols: 1, color: [N.pink, N.yellow, N.mint], size: 21, maxh: 170 }));
    return out;
  },

  kano() {
    const T = tv("What makes customers happy?", (t) => `${t}: Kano model`);
    const out = board({ name: T, title: T, sub: "Kano model: must-haves, performance and delighters", icon: "smile", acc: 5, chip: "Product team" });
    const cx = 450, cy = 470, Wd = 380, Ht = 270;
    out.push(line(cx - Wd, cy, cx + Wd, cy, { arrow: "end", stroke: INK, sw: 3 }), line(cx, cy + Ht, cx, cy - Ht, { arrow: "end", stroke: INK, sw: 3 }));
    out.push(txt(cx + Wd - 220, cy + 12, 220, "Done well", 16, { align: "right", color: GREY }), txt(cx - Wd, cy + 12, 200, "Not done", 16, { color: GREY }), txt(cx + 12, cy - Ht, 200, "Delighted", 16, { color: GREY }), txt(cx + 12, cy + Ht - 24, 200, "Unhappy", 16, { color: GREY }));
    const curve = (f) => Array.from({ length: 31 }, (_, i) => { const t = (i / 30) * 2 - 1; return [cx + t * Wd * 0.95, cy - f(t) * Ht * 0.9]; });
    out.push(pen(curve((t) => t * 0.9), A[1], 5), pen(curve((t) => (t < 0 ? -1 + (t + 1) * 0.9 : -0.1 + t * 0.15)), A[4], 5), pen(curve((t) => (t > 0 ? 0.1 + t * t * 0.9 : 0.1 * (t + 1))), A[5], 5));
    [["Delighters", A[5], N.mint, TOP + 10, "Free gift wrap"], ["Performance", A[1], N.sky, TOP + 205, "Faster delivery"], ["Must-haves", A[4], N.pink, TOP + 400, "Safe payment"]].forEach(([t, c, nc, y, ex], i) => {
      out.push(pill(880, y, 200, 44, t, c, { size: 18 }), note(880, y + 54, 170, 130, th([ex], i * 3)[0], nc, { size: 20 }), note(1064, y + 54, 170, 130, th([["Surprise samples", "Live tracking", "Clear prices"][i]], i * 3 + 1)[0], nc, { size: 20 }));
    });
    return out;
  },
};
