// Whiteboard templates, part A: brainstorming, planning and mapping boards (own layouts and wording).
// Each builder returns board objects on a 1280 × 800 board (see templates-kit.js).
import { W, H, M, TOP, BOT, A, TI, N, NOTES, INK, GREY, SOFT, LINE, WHITE, th, tv, who, cap, low, nameOf, roleOf,
  txt, shape, note, pill, tag, link, line, pen, icon, badge, avatar, photo, personPhoto, themePeople, board, panel, notesIn, columns, table, bar, fitSize } from "./templates-kit.js";

const PI = Math.PI;
const dot = (x, y, c = A[4], d = 18) => shape(x, y, d, d, { kind: "ellipse", fill: c, stroke: WHITE, sw: 2 });

export const BUILDERS_A = {
  brainstorm() {
    const T = tv("Brainstorm", (t) => `${t} brainstorm`);
    const out = board({ name: T, title: T, sub: tv("Ideas to win more repeat customers this quarter", (t) => `Ideas for our ${low(t)}`), icon: "bulb", acc: 0, chip: "Dot vote · 3 each" });
    const cx = 640, cy = 466;
    const mid = shape(cx - 150, cy - 78, 300, 156, { kind: "ellipse", fill: A[0], stroke: A[0], text: tv("How do we win more repeat customers?", (t) => `What makes our ${low(t)} a success?`), size: 24, bold: true, tc: WHITE });
    out.push(mid);
    const ideas = th(["Loyalty card: 10th coffee free", "Weekend family bundles", "Text customers about new stock", "Team up with the gym next door", "Faster checkout at peak hours", "Share reviews on our page", "Pop-up stall at the market", "Student discount on Mondays"]);
    ideas.forEach((t, i) => {
      const a = (i / 8) * 2 * PI - PI / 2 + PI / 8, x = cx + Math.cos(a) * 455 - 78, y = cy + Math.sin(a) * 214 - 78;
      const n = note(x, y, 156, 156, t, NOTES[i % 7], { size: 22 });
      out.push(link(mid, n, { arrow: "none", stroke: "#c3c8da", sw: 2, dash: true }), n);
      if (i % 3 === 0) out.push(dot(x + 120, y + 8), dot(x + 98, y + 8, A[1]));
    });
    return out;
  },

  "launch-plan"() {
    const T = tv("Launch Plan", (t) => `${t}: launch plan`);
    const out = board({ name: T, title: T, sub: "Everything we do before and after we go live", icon: "rocket", acc: 0, chip: "Launch day · 1 March" });
    const [l, r] = columns(2);
    const pre = panel(l.x, TOP + 12, l.w, BOT - TOP - 12, "Pre-launch", { fill: INK, icon: "flag" });
    const post = panel(r.x, TOP + 12, r.w, BOT - TOP - 12, "Post-launch", { fill: INK, icon: "rocket" });
    out.push(...pre.objs, ...post.objs);
    out.push(...notesIn(pre, th(["Invite 50 early testers", "Plan the preview day", "Write the launch email", "Price the bundles", "Press kit ready", "Train the support team"]), { cols: 3, color: [N.yellow, N.lime, N.mint], size: 22 }));
    out.push(...notesIn(post, th(["Share happy customer stories", "Partner with local creators", "Collect feedback in week 1", "Plan the next update", "Thank-you offer for testers", "Review sales after 30 days"], 6), { cols: 3, color: [N.sky, N.lilac, N.pink], size: 22 }));
    return out;
  },

  "concept-map"() {
    const T = tv("Concept map", (t) => `${t}: concept map`);
    const out = board({ name: T, title: T, sub: "What keeps customers coming back, and how the ideas connect", icon: "link", acc: 1, chip: "Draft 2" });
    const cx = 640, cy = 470;
    const mid = shape(cx - 140, cy - 60, 280, 120, { kind: "ellipse", fill: A[1], stroke: A[1], text: tv("Customer loyalty", (t) => cap(t)), size: 28, bold: true, tc: WHITE });
    out.push(mid);
    const nodes = th(["Friendly service", "Fair prices", "Rewards app", "Word of mouth", "Fast delivery", "Repeat orders"]);
    const verbs = ["builds", "supports", "rewards", "brings", "keeps", "grows"];
    const fills = [TI[0], TI[2], TI[3], TI[4], TI[5], TI[1]], strokes = [A[0], A[2], A[3], A[4], A[5], A[1]];
    nodes.forEach((t, i) => {
      const a = (i / 6) * 2 * PI - PI / 2, x = cx + Math.cos(a) * 440 - 110, y = cy + Math.sin(a) * 215 - 46;
      const n = shape(x, y, 220, 92, { kind: "ellipse", fill: fills[i], stroke: strokes[i], sw: 3, text: t, size: 21, bold: true });
      out.push(n, link(n, mid, { text: verbs[i], stroke: strokes[i] }));
    });
    return out;
  },

  "user-flow"() {
    const T = tv("User flow", (t) => `${t}: user flow`);
    const out = board({ name: T, title: T, sub: "From the home screen to a paid order in the shopping app", icon: "phone", acc: 0, chip: "App v2.4" });
    const screen = (x, name, i) => {
      const y = 300, o = [];
      const ph = shape(x, y, 140, 252, { fill: WHITE, stroke: INK, sw: 3 });
      o.push(ph, shape(x + 12, y + 16, 116, 20, { fill: A[i % 2 ? 1 : 0], stroke: A[i % 2 ? 1 : 0] }), shape(x + 12, y + 46, 116, 70, { fill: TI[i % 6], stroke: TI[i % 6] }));
      o.push(shape(x + 12, y + 126, 116, 9, { fill: "#dfe2ec", stroke: "#dfe2ec" }), shape(x + 12, y + 142, 80, 9, { fill: "#dfe2ec", stroke: "#dfe2ec" }));
      o.push(txt(x, y + 160, 140, name, 20, { bold: true, align: "center" }), pill(x + 22, y + 206, 96, 28, "Next", A[0], { size: 14 }));
      return { ph, o };
    };
    const start = pill(40, 400, 100, 52, "Start", A[5], { size: 18 });
    const names = th(["Home", "Search", "Product"], 0);
    const s = [screen(180, names[0], 0), screen(370, names[1], 1), screen(560, names[2], 2)];
    const ask = shape(748, 366, 144, 120, { kind: "diamond", fill: TI[3], stroke: A[3], sw: 3, text: "Signed in?", size: 18, bold: true });
    const co = screen(940, "Checkout", 3);
    const end = pill(1126, 400, 114, 52, "Paid", A[4], { size: 18 });
    const sign = shape(730, 628, 180, 76, { fill: TI[1], stroke: A[1], sw: 3, text: "Sign in or join", size: 19, bold: true });
    out.push(start, ...s.flatMap((x) => x.o), ask, ...co.o, end, sign);
    out.push(link(start, s[0].ph), link(s[0].ph, s[1].ph), link(s[1].ph, s[2].ph), link(s[2].ph, ask), link(ask, co.ph, { text: "Yes" }), link(co.ph, end));
    out.push(link(ask, sign, { text: "No", fromSide: "bottom", toSide: "top" }), link(sign, co.ph, { kind: "elbow", fromSide: "right", toSide: "bottom" }));
    return out;
  },

  mindmap() {
    const T = tv("Mind map", (t) => `${t} mind map`);
    const out = board({ name: T, title: T, sub: "Everything that goes into growing our online sales", icon: "sparkle", acc: 0, chip: "Workshop · 12 Nov" });
    const main = pill(520, 420, 240, 96, tv("Grow online sales", (t) => cap(t)), A[0], { size: 26 });
    out.push(main);
    const br = [
      [280, 230, "Goals", A[1], TI[1], th(["500 orders a month", "4.8 star rating", "30% repeat buyers"], 0), "left"],
      [800, 230, "Channels", A[2], TI[2], th(["Instagram shop", "WhatsApp orders"], 3), "right"],
      [280, 590, "Content", A[3], TI[3], th(["Weekly reels", "Customer stories"], 5), "left"],
      [800, 590, "Budget", A[4], TI[4], th(["PKR 150k a month", "Test, then scale", "Track every rupee"], 7), "right"],
    ];
    for (const [x, y, name, c, t, leaves, side] of br) {
      const b = pill(x, y, 200, 64, name, c, { size: 22 });
      out.push(b, link(main, b, { arrow: "none", stroke: c, sw: 4 }));
      leaves.forEach((text, k) => {
        const ly = y + 32 - (leaves.length * 66 - 10) / 2 + k * 66;
        const lf = shape(side === "left" ? 40 : 1050, ly, 190, 56, { fill: t, stroke: c, sw: 2, text, size: 17, bold: true });
        out.push(lf, link(b, lf, { kind: "elbow", arrow: "none", stroke: c, fromSide: side, toSide: side === "left" ? "right" : "left" }));
      });
    }
    return out;
  },

  kanban() {
    const T = tv("Team board", (t) => `${t} board`);
    const out = board({ name: T, title: T, sub: tv("Sprint 14 · what everyone is working on", (t) => `Who is doing what for the ${low(t)}`), icon: "grid", acc: 0, chip: "3 – 14 Nov" });
    const cols = [["To do", A[0], N.lilac, th(["Write the launch email", "Call the packaging supplier", "Plan the photo shoot"], 0)],
      ["Doing", A[3], N.yellow, th(["Design the new flyer", "Set up the online shop"], 3)],
      ["Review", A[1], N.sky, th(["Social posts for March", "Store window layout"], 5)],
      ["Done", A[5], N.mint, th(["Order new shelves", "Hire a part-time cashier", "Fix the card machine"], 7)]];
    const people = who(["Sara Ahmed", "Bilal Khan", "Hina Raza", "Omar Shah"]).map(nameOf);
    columns(4).forEach(({ x, w }, i) => {
      const [name, c, nc, items] = cols[i];
      out.push(shape(x, TOP + 12, w, BOT - TOP - 12, { fill: "#eef0f6", stroke: "#eef0f6" }), pill(x + 12, TOP + 24, w - 70, 46, name, c, { size: 21 }));
      out.push(shape(x + w - 50, TOP + 28, 38, 38, { kind: "ellipse", fill: WHITE, stroke: WHITE, text: String(items.length), size: 17, bold: true }));
      items.forEach((t, k) => out.push(note(x + 12, TOP + 86 + k * 168, w - 24, 152, t, nc, { size: 23, author: people[(i + k) % 4] })));
    });
    return out;
  },

  flowchart() {
    const T = tv("Order process", (t) => `${t}: process flow`);
    const out = board({ name: T, title: T, sub: "What happens from a new order to delivery", icon: "layers", acc: 0, chip: "Owner: Operations" });
    const box = (x, y, text, i) => shape(x, y, 190, 92, { fill: TI[i], stroke: A[i], sw: 3, text, size: 20, bold: true });
    const start = shape(40, 318, 140, 80, { kind: "ellipse", fill: A[5], stroke: A[5], text: "Start", size: 20, bold: true, tc: WHITE });
    const s = th(["Order received", "Pack the order", "Ship and send tracking", "Send a payment reminder"], 0);
    const b1 = box(222, 312, s[0], 1);
    const ask = shape(462, 290, 196, 136, { kind: "diamond", fill: TI[3], stroke: A[3], sw: 3, text: "Payment OK?", size: 19, bold: true });
    const b2 = box(708, 312, s[1], 0), b3 = box(960, 312, s[2], 2);
    const end = shape(985, 560, 140, 80, { kind: "ellipse", fill: A[4], stroke: A[4], text: "Done", size: 20, bold: true, tc: WHITE });
    const rem = box(465, 560, s[3], 4);
    out.push(start, b1, ask, b2, b3, end, rem);
    out.push(link(start, b1), link(b1, ask), link(ask, b2, { text: "Yes" }), link(b2, b3), link(b3, end, { fromSide: "bottom", toSide: "top" }));
    out.push(link(ask, rem, { text: "No", fromSide: "bottom", toSide: "top" }), link(rem, b1, { kind: "elbow", fromSide: "left", toSide: "bottom" }));
    out.push(note(735, 520, 190, 168, "Goal: every order ships within 24 hours", N.yellow, { size: 22 }));
    return out;
  },

  "vision-board"() {
    const T = tv("My 2027 vision board", (t) => `${t}: vision board`);
    const out = board({ name: T, title: T, sub: "The year we want, in pictures and a few big words", icon: "star", acc: 4, chip: "Review each month", people: 0 });
    const tiles = [["travel mountains adventure", "Travel more"], ["fitness sport run", "Run a 10K"], ["books education library", "Read 24 books"], ["office business city", "Open shop no. 2"], ["flowers nature garden", "Grow a garden"], ["coffee food", "Slow mornings"]];
    const used = [];
    // Like Canva's vision boards, some pictures show people living the goal (a traveller, a runner); the rest places and things.
    const who2 = [themePeople("traveler woman trip"), themePeople("fitness woman gym workout")];
    tiles.forEach(([topic, cap0], i) => { const x = 56 + (i % 3) * 286, y = 182 + Math.floor(i / 3) * 296, o = { slot: i, caption: th([cap0], i)[0], used, exclude: used.slice() }; out.push(...(i < 2 ? personPhoto(x, y, 262, 210, who2[i], o) : photo(x, y, 262, 210, topic, o))); });
    out.push(txt(918, 178, 320, "Grow.", 64, { bold: true, color: A[4] }), txt(918, 258, 320, "Rest.", 64, { bold: true, color: A[0] }), txt(918, 338, 320, "Give.", 64, { bold: true, color: A[2] }));
    out.push(...notesIn({ x: 918, y: 420, w: 322, h: 330 }, th(["Save PKR 500k", "Walk 8,000 steps a day", "One new skill each quarter", "Call home every Sunday"], 2), { cols: 2, color: [N.pink, N.yellow, N.mint, N.sky], size: 20 }));
    return out;
  },

  gantt() {
    const T = tv("Project plan", (t) => `${t}: Gantt chart`);
    const out = board({ name: T, title: T, sub: "Website relaunch · eight weeks, week by week", icon: "calendar", acc: 1, chip: "Week 3 of 8" });
    const x0 = M, tw = 250, cw = 118, y0 = 178, rh = 66;
    out.push(...table(x0, y0, [tw, ...Array(8).fill(cw)], 44, [["Task", "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]], { acc: INK }));
    const tasks = th(["Research", "Brand design", "Build the website", "Photos and copy", "Testing", "Launch campaign", "Review results"], 0);
    const spans = [[0, 2], [1, 3], [2, 6], [3, 5], [5, 7], [6, 8], [7, 8]];
    const ppl = who(["Sara Ahmed", "Bilal Khan", "Hina Raza", "Omar Shah"]);
    tasks.forEach((t, i) => {
      const y = y0 + 44 + i * rh;
      out.push(shape(x0, y, tw + cw * 8, rh, { kind: "rect", fill: i % 2 ? WHITE : "#f6f7fb", stroke: LINE, sw: 1 }));
      out.push(avatar(x0 + 10, y + 13, 40, ppl[i % 4], A[(i + 1) % 6], { sw: 2 }), txt(x0 + 60, y + 21, tw - 64, t, fitSize(t, tw - 64, 19, 13), { bold: true }));
      const [a, b] = spans[i], c = A[i % 6];
      out.push(shape(x0 + tw + a * cw + 6, y + 15, (b - a) * cw - 12, 36, { fill: c, stroke: c, text: b - a > 1 ? ["Done", "Done", "65%", "In progress", "Next", "Planned", "Planned"][i] : "", size: 15, bold: true, tc: WHITE }));
    });
    const mx = x0 + tw + 8 * cw - 40, my = y0 + 44 + 6 * rh + 13;
    out.push(shape(mx - 4, my - 4, 44, 44, { kind: "diamond", fill: A[4], stroke: A[4] }));
    const tx = x0 + tw + 2.5 * cw;
    out.push(line(tx, y0 - 6, tx, y0 + 44 + 7 * rh + 6, { stroke: A[4], sw: 3, dash: true }), tag(tx - 32, y0 + 44 + 7 * rh + 10, "Today", A[4], { tc: WHITE }));
    return out;
  },

  orgchart() {
    const T = tv("Our team", (t) => `${t} team`);
    const out = board({ name: T, title: T, sub: "Who leads which team, and who to ask", icon: "users", acc: 0, chip: "Updated Nov 2026", people: 0 });
    const card = (x, y, w, p, i, lead) => {
      const c = shape(x, y, w, 76, { fill: lead ? A[0] : WHITE, stroke: lead ? A[0] : LINE, sw: 1.5 });
      return [c, avatar(x + 10, y + 12, 52, p, A[(i + 1) % 6], { sw: 2 }), txt(x + 72, y + 14, w - 80, nameOf(p), fitSize(nameOf(p), w - 80, 19, 13), { bold: true, color: lead ? WHITE : INK }), txt(x + 72, y + 42, w - 80, roleOf(p), fitSize(roleOf(p), w - 80, 15, 11, false), { color: lead ? "#e8e5fe" : GREY })];
    };
    const P = who(["Ayesha Khan, Managing Director", "Bilal Ahmed, Head of Design", "Sara Malik, Head of Sales", "Omar Farooq, Head of Support", "Hina Saleem, Designer", "Danish Ali, Illustrator", "Maham Tariq, Account Lead", "Saad Anwar, Sales Rep", "Noor Fatima, Support Lead", "Fahad Butt, Support Agent"]);
    const top = card(520, 176, 240, P[0], 0, true);
    out.push(...top);
    [60, 470, 880].forEach((hx, k) => {
      const head = card(hx, 312, 240, P[1 + k], k + 1, false);
      out.push(...head, link(top[0], head[0], { kind: "elbow", arrow: "none", fromSide: "bottom", toSide: "top", stroke: "#9aa1b5" }));
      [0, 1].forEach((m) => { const mem = card(hx + 100, 432 + m * 108, 230, P[4 + k * 2 + m], k * 2 + m + 3, false); out.push(...mem, link(head[0], mem[0], { kind: "elbow", arrow: "none", fromSide: "bottom", toSide: "left", stroke: "#9aa1b5" })); });
    });
    out.push(note(60, 640, 300, 110, "New hires start on the first Monday of each month", N.yellow, { size: 20 }), note(470, 650, 300, 100, "Team lunch every Thursday", N.mint, { size: 20 }));
    return out;
  },

  "content-calendar"() {
    const T = tv("Content calendar", (t) => `${t}: content calendar`);
    const out = board({ name: T, title: T, sub: "Four weeks of posts across our channels", icon: "calendar", acc: 4, chip: "November" });
    const ch = [["Instagram", A[4], "camera"], ["Facebook", A[1], "users"], ["Email", A[3], "mail"], ["Blog", A[5], "book"]];
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"], x0 = 220, cw = 255;
    weeks.forEach((w, i) => out.push(pill(x0 + i * cw, 176, cw - 12, 44, w, INK, { size: 18 })));
    const posts = th(["Behind the scenes reel", "New menu photos", "Customer of the week", "Giveaway: 3 winners", "Event photo album", "Live Q&A on Friday", "Tips for busy mornings", "Poll: next flavour", "Monthly newsletter", "Early access offer", "Thank-you note", "Holiday hours", "How we source our beans", "Meet the team", "Top 5 gifts under PKR 2,000", "Year in review"]);
    const colors = [N.pink, N.sky, N.yellow, N.mint];
    ch.forEach(([name, c, ic], r) => {
      const y = 232 + r * 133;
      out.push(...badge(M, y + 14, 48, ic, c), txt(M + 58, y + 26, 120, name, 19, { bold: true }));
      weeks.forEach((_, k) => out.push(note(x0 + k * cw, y, cw - 12, 121, posts[(r * 4 + k) % posts.length], colors[r], { size: 20 })));
    });
    return out;
  },

  raci() {
    const T = tv("RACI chart", (t) => `${t}: RACI chart`);
    const out = board({ name: T, title: T, sub: "Who does it, who signs off, who helps, who is told", icon: "users", acc: 0, chip: "Event: Spring fair" });
    const ppl = who(["Sara, Lead", "Bilal, Design", "Hina, Ops", "Omar, Sales"]).map(nameOf);
    const tasks = th(["Set the budget", "Book the venue", "Design the poster", "Invite the guests", "Order the food", "Run the day", "Send thank-you notes"], 0);
    const grid = [["A", "R", "C", "I"], ["A", "I", "R", "C"], ["C", "R", "I", "A"], ["I", "C", "A", "R"], ["A", "I", "R", "C"], ["R", "C", "R", "I"], ["A", "R", "I", "C"]];
    const LC = { R: A[0], A: A[4], C: A[2], I: A[3] };
    out.push(...table(M, 176, [330, 160, 160, 160, 160], 54, [["Task", ...ppl]], { acc: INK }));
    tasks.forEach((t, i) => {
      const y = 230 + i * 74;
      out.push(shape(M, y, 970, 74, { kind: "rect", fill: i % 2 ? WHITE : "#f6f7fb", stroke: LINE, sw: 1 }));
      out.push(txt(M + 18, y + 24, 300, t, 20, { bold: true }));
      grid[i].forEach((L, k) => out.push(shape(M + 330 + k * 160 + 58, y + 15, 44, 44, { kind: "ellipse", fill: LC[L], stroke: LC[L], text: L, size: 20, bold: true, tc: WHITE })));
    });
    [["R", "Responsible", "does the work"], ["A", "Accountable", "signs it off"], ["C", "Consulted", "gives advice"], ["I", "Informed", "is kept up to date"]].forEach(([L, n, d], i) => {
      const y = 196 + i * 140;
      out.push(shape(1040, y, 200, 124, { fill: WHITE, stroke: LINE }), shape(1056, y + 14, 44, 44, { kind: "ellipse", fill: LC[L], stroke: LC[L], text: L, size: 20, bold: true, tc: WHITE }), txt(1110, y + 24, 124, n, 18, { bold: true }), txt(1058, y + 70, 172, d, 16, { color: GREY }));
    });
    return out;
  },

  timeline() {
    const T = tv("Project timeline", (t) => `${t}: timeline`);
    const out = board({ name: T, title: T, sub: "From the first idea to our second city in one year", icon: "flag", acc: 2, chip: "2026" });
    const y = 466;
    out.push(line(60, y, 1220, y, { stroke: INK, sw: 6, arrow: "end" }));
    const ms = [["JAN", "Idea and research"], ["MAR", "First prototype"], ["MAY", "Pilot with 20 shops"], ["JUL", "Public launch"], ["SEP", "1,000 customers"], ["NOV", "Second city"]];
    const items = th(ms.map((m) => m[1]), 0);
    ms.forEach(([mo], i) => {
      const x = 120 + i * 196, c = A[i % 6], up = i % 2 === 0;
      out.push(shape(x - 22, y - 22, 44, 44, { kind: "ellipse", fill: c, stroke: WHITE, sw: 4 }));
      out.push(pill(x - 46, up ? y + 40 : y - 84, 92, 44, mo, c, { size: 19 }));
      out.push(line(x, up ? y - 30 : y + 30, x, up ? y - 70 : y + 70, { stroke: c, sw: 3 }));
      out.push(note(x - 86, up ? y - 250 : y + 78, 172, 172, items[i], NOTES[i % 7], { size: 22 }));
    });
    return out;
  },

  retro() {
    const T = tv("Retrospective", (t) => `${t} retrospective`);
    const out = board({ name: T, title: T, sub: "Sprint 14 · what worked, what to fix, what we will do", icon: "chat", acc: 0, chip: "45 minutes" });
    const cols = [["What went well", A[5], N.mint, "smile", th(["Launch went out on time", "Great teamwork with sales", "Customers love the new menu", "Fewer bugs than last time"], 0)],
      ["What to improve", A[3], N.peach, "tool", th(["Too many meetings", "Late design changes", "Slow replies to reviews", "Unclear task owners"], 4)],
      ["Action items", A[0], N.lilac, "checkCircle", th(["An owner for every task", "Design freeze 3 days before", "Reply to reviews daily", "No-meeting Wednesdays"], 8)]];
    columns(3).forEach(({ x, w }, i) => {
      const [name, c, nc, ic, items] = cols[i];
      const p = panel(x, TOP + 12, w, BOT - TOP - 12, name, { fill: c, icon: ic });
      out.push(...p.objs, ...notesIn(p, items, { cols: 2, color: nc, size: 23 }));
      out.push(dot(x + 160, TOP + 108), dot(x + 182, TOP + 108, A[1]));
    });
    return out;
  },

  swot() {
    const T = tv("SWOT analysis", (t) => `${t}: SWOT analysis`);
    const out = board({ name: T, title: T, sub: "Where we stand before planning next year", icon: "target", acc: 0, chip: "Strategy day" });
    const q = [["S", "Strengths", "What we do well", A[5], TI[5], N.mint, th(["Loyal local customers", "Loved recipes", "Central location"], 0)],
      ["W", "Weaknesses", "Where we can get better", A[4], TI[4], N.pink, th(["Small marketing budget", "Slow online orders", "One supplier only"], 3)],
      ["O", "Opportunities", "Chances we can use", A[1], TI[1], N.sky, th(["Office lunch orders", "Delivery apps", "Catering for events"], 6)],
      ["T", "Threats", "Risks to watch", A[3], TI[3], N.yellow, th(["New chain opening nearby", "Rising flour prices", "Rent review in June"], 9)]];
    q.forEach(([L, name, sub, c, t, nc, items], i) => {
      const x = M + (i % 2) * 610, y = TOP + 12 + Math.floor(i / 2) * 302, w = 590, h = 290;
      out.push(shape(x, y, w, h, { fill: t, stroke: t }), shape(x + 16, y + 16, 60, 60, { fill: c, stroke: c, text: L, size: 34, bold: true, tc: WHITE }));
      out.push(txt(x + 90, y + 16, 300, name, 28, { bold: true }), txt(x + 92, y + 52, 320, sub, 17, { color: GREY }));
      items.forEach((s, k) => out.push(note(x + 16 + k * 190, y + 92, 176, 178, s, nc, { size: 23 })));
    });
    return out;
  },

  venn() {
    const T = tv("Find our sweet spot", (t) => `${t}: where ideas meet`);
    const out = board({ name: T, title: T, sub: "Three circles: what overlaps is where we focus", icon: "target", acc: 0, chip: "Venn diagram" });
    const circ = [[530, 392, A[0], th(["What we love doing"], 0)[0]], [750, 392, A[1], th(["What customers need"], 1)[0]], [640, 578, A[3], th(["What we can earn from"], 2)[0]]];
    circ.forEach(([cx, cy, c]) => out.push(shape(cx - 170, cy - 170, 340, 340, { kind: "ellipse", fill: c, stroke: c, opacity: 0.32 })));
    out.push(txt(380, 318, 150, circ[0][3], 19, { bold: true, align: "center" }), txt(752, 318, 150, circ[1][3], 19, { bold: true, align: "center" }), txt(565, 652, 150, circ[2][3], 19, { bold: true, align: "center" }));
    out.push(pill(560, 450, 160, 50, "Sweet spot", INK, { size: 18 }));
    const left = th(["Baking with local fruit", "Teaching small classes", "Telling our story"], 3), right = th(["Healthy snacks for kids", "Fast weekday lunches", "Gifts that feel personal"], 6);
    out.push(txt(M, 186, 290, "Ideas on the left", 20, { bold: true, color: A[0] }), txt(990, 186, 250, "What we heard", 20, { bold: true, color: A[1] }));
    left.forEach((t, k) => out.push(note(M, 226 + k * 176, 250, 160, t, N.lilac, { size: 22 })));
    right.forEach((t, k) => out.push(note(990, 226 + k * 176, 250, 160, t, N.sky, { size: 22 })));
    return out;
  },

  journey() {
    const T = tv("Customer journey map", (t) => `${t}: customer journey`);
    const out = board({ name: T, title: T, sub: "What a first-time buyer does, thinks and feels at each step", icon: "map", acc: 2, chip: "Persona: Busy parent" });
    const stages = ["Discover", "Compare", "Buy", "Use", "Recommend"], x0 = 190, cw = 210;
    stages.forEach((s, i) => out.push(pill(x0 + i * cw, 172, cw - 10, 46, s, A[i % 6], { size: 19 })));
    const rows = [["Doing", TI[0], th(["Sees a post from a friend", "Reads reviews", "Orders on the app", "Opens the box", "Shares a photo"], 0)], ["Thinking", TI[1], th(["Is it worth it?", "Which size is best?", "Will it come on time?", "Easy to set up", "Friends should try this"], 5)]];
    rows.forEach(([name, t, items], r) => {
      const y = 230 + r * 128;
      out.push(shape(M, y, 140, 116, { fill: t, stroke: t, text: name, size: 19, bold: true }));
      items.forEach((s, i) => out.push(note(x0 + i * cw, y, cw - 10, 116, s, r ? N.sky : N.lilac, { size: 20 })));
    });
    const fy = 486;
    out.push(shape(M, fy, 140, 136, { fill: TI[3], stroke: TI[3], text: "Feeling", size: 19, bold: true }), shape(x0, fy, cw * 5 - 10, 136, { fill: WHITE, stroke: LINE }));
    const lv = [0.55, 0.3, 0.75, 0.9, 0.85], faces = ["meh", "frown", "smile", "smile", "smile"];
    const pts = lv.map((v, i) => [x0 + i * cw + (cw - 10) / 2, fy + 118 - v * 100]);
    out.push(pen(pts.flatMap((p, i) => (i ? [[(pts[i - 1][0] + p[0]) / 2, (pts[i - 1][1] + p[1]) / 2], p] : [p])), A[2], 5));
    pts.forEach(([x, y], i) => out.push(...badge(x - 20, y - 20, 40, faces[i], faces[i] === "frown" ? A[4] : A[5], WHITE, { circle: true })));
    out.push(shape(M, 634, 140, 116, { fill: TI[5], stroke: TI[5], text: "Ideas", size: 19, bold: true }));
    th(["Referral code in posts", "Size guide quiz", "Live delivery tracking", "Video set-up guide", "Reward for reviews"], 2).forEach((s, i) => out.push(note(x0 + i * cw, 634, cw - 10, 116, s, N.mint, { size: 20 })));
    return out;
  },

  roadmap() {
    const T = tv("Product roadmap", (t) => `${t}: roadmap`);
    const out = board({ name: T, title: T, sub: "What each team ships, quarter by quarter", icon: "map", acc: 1, chip: "2027" });
    const x0 = 210, cw = 257;
    ["Q1", "Q2", "Q3", "Q4"].forEach((q, i) => out.push(pill(x0 + i * cw, 176, cw - 10, 46, q + " 2027", INK, { size: 19 })));
    const lanes = [["Product", "phone", [[0, 1.6, "Mobile app beta"], [1.7, 3.2, "Payments in app"], [3.3, 4, "Dark mode"]]],
      ["Marketing", "chart", [[0, 1.2, "Brand refresh"], [1.3, 2.6, "Summer campaign"], [2.7, 4, "Referral program"]]],
      ["Sales", "money", [[0.4, 2, "Office lunch plans"], [2.1, 4, "Two new cities"]]],
      ["Operations", "gear", [[0, 1, "New warehouse"], [1.1, 2.4, "Faster delivery"], [2.5, 4, "Green packaging"]]],
      ["Support", "chat", [[0.6, 2.2, "Help centre"], [2.3, 4, "24/7 chat"]]]];
    lanes.forEach(([name, ic, bars], r) => {
      const y = 236 + r * 104;
      out.push(shape(M, y, cw * 4 + 170, 92, { fill: r % 2 ? WHITE : "#f3f4f9", stroke: LINE, sw: 1 }), ...badge(M + 12, y + 22, 48, ic, A[r % 6]), txt(M + 68, y + 34, 96, name, 17, { bold: true }));
      const items = th(bars.map((b) => b[2]), r * 3);
      bars.forEach(([a, b], k) => out.push(shape(x0 + a * cw + 4, y + 20, (b - a) * cw - 12, 52, { fill: [TI, A][k % 2][r % 6], stroke: A[r % 6], sw: 2, text: items[k], size: 17, bold: true, tc: k % 2 ? WHITE : INK })));
    });
    return out;
  },

  fishbone() {
    const T = tv("Why are orders late?", (t) => `${t}: why are we late?`);
    const out = board({ name: T, title: T, sub: "Fishbone diagram: causes sorted by category", icon: "search", acc: 4, chip: "Root cause" });
    const sy = 470, head = shape(1030, sy - 70, 210, 140, { fill: A[4], stroke: A[4], text: tv("Orders arrive 2 days late", (t) => `${cap(t)} is behind`), size: 22, bold: true, tc: WHITE });
    out.push(line(70, sy, 1030, sy, { stroke: INK, sw: 6 }), head);
    const cats = [["People", "users"], ["Process", "list"], ["Tools", "tool"], ["Suppliers", "cart"], ["Places", "pin"], ["Rules", "shield"]];
    const causes = th(["Not enough packers", "New staff not trained", "Orders checked twice", "No cut-off time", "Old label printer", "App crashes at peak", "Boxes arrive late", "One courier only", "Warehouse far away", "Small loading bay", "Late payment checks", "Paper forms"], 0);
    cats.forEach(([name, ic], i) => {
      const up = i < 3, bx = 330 + (i % 3) * 290, ey = up ? 220 : 720, ex = bx - 150;
      out.push(line(ex, ey, bx, sy, { stroke: A[i % 6], sw: 4 }), pill(ex - 90, up ? ey - 52 : ey + 6, 180, 46, name, A[i % 6], { size: 19 }));
      [0, 1].forEach((k) => {
        const t = 0.32 + k * 0.32, yy = ey + (sy - ey) * t, xx = ex + (bx - ex) * t;
        out.push(shape(xx - 200, yy - 22, 188, 44, { fill: WHITE, stroke: A[i % 6], sw: 2, text: causes[i * 2 + k], size: 15, bold: true }));
      });
    });
    return out;
  },

  "family-tree"() {
    const T = tv("The Malik family", (t) => `${t}: family tree`);
    const out = board({ name: T, title: T, sub: "Three generations, with birthdays to remember", icon: "heart", acc: 4, chip: "Since 1958", people: 0 });
    // Photos by generation: grandparents, parents, children (same circles and rings as before).
    const P = (x, y, name, info, c, kind) => { const a = avatar(x, y, 84, name, c, { sw: 4, kind }); return [a, txt(x - 40, y + 92, 164, name, 19, { bold: true, align: "center" }), txt(x - 40, y + 118, 164, info, 15, { color: GREY, align: "center" })]; };
    const g1 = [P(470, 176, "Rashid Malik", "b. 1958", A[0], "senior elderly"), P(726, 176, "Nasreen Malik", "b. 1961", A[4], "senior elderly")];
    const g2 = [P(250, 360, "Imran Malik", "b. 1984", A[1], "smiling casual"), P(450, 360, "Sana Imran", "b. 1987", A[3], "smiling casual"), P(830, 360, "Ayesha Tariq", "b. 1989", A[2], "smiling casual"), P(1030, 360, "Tariq Aziz", "b. 1985", A[5], "smiling casual")];
    const g3 = [P(150, 572, "Zara", "b. 2012", A[3], "child kids girl"), P(350, 572, "Ali", "b. 2015", A[1], "child kids boy"), P(550, 572, "Hamza", "b. 2019", A[0], "child kids boy"), P(830, 572, "Noor", "b. 2016", A[4], "child kids girl"), P(1030, 572, "Musa", "b. 2020", A[2], "child kids boy")];
    out.push(...g1.flat(), ...g2.flat(), ...g3.flat());
    out.push(line(554, 218, 726, 218, { stroke: A[4], sw: 4 }), line(640, 218, 640, 318, { stroke: "#9aa1b5", sw: 3 }), line(292, 318, 1072, 318, { stroke: "#9aa1b5", sw: 3 }), line(292, 318, 292, 360, { stroke: "#9aa1b5", sw: 3 }), line(1072, 318, 1072, 360, { stroke: "#9aa1b5", sw: 3 }));
    out.push(line(334, 402, 450, 402, { stroke: A[4], sw: 4 }), line(914, 402, 1030, 402, { stroke: A[4], sw: 4 }));
    out.push(line(392, 402, 392, 530, { stroke: "#9aa1b5", sw: 3 }), line(192, 530, 592, 530, { stroke: "#9aa1b5", sw: 3 }), ...[192, 392, 592].map((x) => line(x, 530, x, 572, { stroke: "#9aa1b5", sw: 3 })));
    out.push(line(972, 402, 972, 530, { stroke: "#9aa1b5", sw: 3 }), line(872, 530, 1072, 530, { stroke: "#9aa1b5", sw: 3 }), ...[872, 1072].map((x) => line(x, 530, x, 572, { stroke: "#9aa1b5", sw: 3 })));
    return out;
  },

  sitemap() {
    const T = tv("Website sitemap", (t) => `${t}: website sitemap`);
    const out = board({ name: T, title: T, sub: "Every page of the new website, from the home page down", icon: "globe", acc: 1, chip: "18 pages" });
    const home = shape(540, 176, 200, 70, { fill: A[1], stroke: A[1], text: "Home", size: 24, bold: true, tc: WHITE });
    out.push(home);
    const secs = [["Shop", ["All products", "New in", "Gift cards"]], ["About", ["Our story", "Team", "Careers"]], ["Services", ["Catering", "Workshops"]], ["Blog", ["Recipes", "News", "Guides"]], ["Contact", ["Find a shop", "Help centre"]]];
    secs.forEach(([name, subs], i) => {
      const x = M + i * 242, s = shape(x, 316, 222, 64, { fill: TI[i % 6], stroke: A[i % 6], sw: 3, text: name, size: 21, bold: true });
      out.push(s, link(home, s, { kind: "elbow", arrow: "none", fromSide: "bottom", toSide: "top", stroke: "#9aa1b5" }));
      th(subs, i * 3).forEach((t, k) => { const p = shape(x + 34, 418 + k * 92, 188, 68, { fill: WHITE, stroke: LINE, sw: 1.5, text: t, size: 18, bold: true }); out.push(p, link(s, p, { kind: "elbow", arrow: "none", fromSide: "left", toSide: "left", stroke: "#9aa1b5" })); });
    });
    return out;
  },

  "mood-board"() {
    const T = tv("Summer collection mood board", (t) => `${t}: mood board`);
    const out = board({ name: T, title: T, sub: "Light, warm and relaxed: the look and feel we want", icon: "palette", acc: 3, chip: "Season 2027", people: 0 });
    const used = [];
    // Like Canva's style / bridal mood boards: a person in the look (traveller on the beach, a fashion model) beside
    // places, colours and textures.
    out.push(...personPhoto(56, 184, 420, 280, themePeople("traveler woman hat summer holiday"), { slot: 0, used, card: 8 }));
    out.push(...photo(500, 184, 260, 280, "flowers nature colour", { slot: 1, used, exclude: used.slice(), card: 8 }));
    out.push(...personPhoto(56, 492, 260, 260, themePeople("fashion model woman style outfit"), { slot: 2, used, exclude: used.slice(), card: 8 }));
    out.push(...photo(340, 492, 420, 260, "sky travel sunset", { slot: 3, used, exclude: used.slice(), card: 8 }));
    out.push(txt(800, 178, 440, "Colours", 22, { bold: true }));
    [["#f4a261", "Sun"], ["#2a9d8f", "Lagoon"], ["#e9c46a", "Sand"], ["#264653", "Night"], ["#e76f51", "Coral"]].forEach(([c, n], i) => out.push(shape(800 + i * 88, 214, 76, 76, { kind: "ellipse", fill: c, stroke: WHITE, sw: 3 }), txt(796 + i * 88, 296, 84, n, 14, { align: "center", color: GREY })));
    out.push(txt(800, 340, 440, "Type", 22, { bold: true }), txt(800, 372, 200, "Aa", 72, { bold: true }), txt(930, 386, 300, "Bold headings, soft and simple body text", 17, { color: GREY }));
    out.push(txt(800, 478, 440, "Words", 22, { bold: true }));
    th(["Easy", "Warm", "Natural", "Playful"], 0).forEach((t, i) => out.push(tag(800 + (i % 2) * 150, 514 + Math.floor(i / 2) * 46, t, [TI[3], TI[2], TI[4], TI[1]][i], { size: 18, h: 36 })));
    out.push(note(1010, 600, 230, 150, "Shoot on the beach at golden hour", N.yellow, { size: 21 }), note(800, 616, 190, 134, "Linen, straw, sea glass", N.peach, { size: 20 }));
    return out;
  },
};
