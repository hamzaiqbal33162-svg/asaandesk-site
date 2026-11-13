// ROUND 2 layout batch (filled by a helper; see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md). Pure module, no imports.
// 20 presentation decks. Each one is its own design system: grid, type pairing, shape language, palette and photo
// treatment, plus its own English content and speaker notes on every slide.
import { castFor, member, face, KIND } from "./templates-faces.js";

export default function add(k) {
  const { tpl, T, S, R, C, E, F, page, flow } = k;
  const { WHITE } = k.K;
  const P169 = "presentation-16x9", P43 = "presentation-4x3";
  // deck(id, title, preset, tags, build): build(W, H) returns [[background, layers, notes], ...].
  let CAST = null; // the person picker of the deck being built (team portraits, avatars, quotes)
  const deck = (id, title, preset, tags, build) => tpl(id, title, preset, "presentation slides deck " + tags, (W, H) => (CAST = castFor(id), build(W, H)).map(([b, layers, notes]) => { const p = page(b, layers); p.notes = notes; return p; }));
  // Centre a text layer vertically in the band y0..y0+h0.
  const vmid = (l, y0, h0) => { l.y = Math.round(y0 + (h0 - l.h) / 2); return l; };
  // Straight line between two points, drawn as a thin rotated rectangle.
  const seg = (x1, y1, x2, y2, c, sw, o = {}) => { const L = Math.hypot(x2 - x1, y2 - y1), a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI; return R((x1 + x2) / 2 - L / 2, (y1 + y2) / 2 - sw / 2, L, sw, c, { ...o, rot: Math.round(a * 100) / 100, name: o.name || "Line" }); };
  // Dotted path through a list of points.
  const dotted = (pts, gap, d, c, o = {}) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], n = Math.max(1, Math.floor(Math.hypot(x2 - x1, y2 - y1) / gap));
      for (let j = 0; j < n; j++) out.push(C(x1 + ((x2 - x1) * j) / n - d / 2, y1 + ((y2 - y1) * j) / n - d / 2, d, d, c, { op: o.op ?? 1, name: o.name || "Route dot" }));
    }
    return out;
  };
  const ring = (cx, cy, r, c, sw, o = {}) => C(cx - r, cy - r, 2 * r, 2 * r, "none", { stroke: c, sw, name: "Ring", ...o });
  const grid = (x, y, cols, rows, gap, d, c, op = 1, kind = "ellipse") => {
    const out = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) out.push(S(kind, x + q * gap, y + r * gap, d, d, c, { op, name: "Pattern dot" }));
    return out;
  };

  /* 1 ─ Brutalist type · design critique ─────────────────────────────────────────────── */
  deck("brutalist-design-critique-dk2", "Brutalist design critique", P169, "design critique review feedback ux checkout crit brutalist bold type", (W, H) => {
    const BG = "#f1efe8", K0 = "#0d0d0d", RED = "#ff3d00", GR = "#6f6b62";
    const mono = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", size: 24, color: K0, ...o });
    const big = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 120, color: K0, lh: 0.9, ls: -3, ...o });
    const body = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", size: 30, color: K0, lh: 1.4, ...o });
    const head = (label, n) => [R(0, 0, W, 14, K0, { name: "Top rule" }), mono(label, 72, 40, 1100, { name: "Running head" }), mono(n + " / 10", W - 372, 40, 300, { align: "right", name: "Page number" })];
    return [
      [BG, [
        R(0, 0, W, 14, K0, { name: "Top rule" }),
        mono("SESSION 07 / CHECKOUT REDESIGN", 72, 40, 1100),
        mono("14.11.2026", W - 472, 40, 400, { align: "right" }),
        big("DESIGN\nCRIT.", 60, 150, 1360, { size: 330, lh: 0.84, ls: -10 }),
        R(1468, 150, 380, 380, RED, { name: "Red block" }),
        big("03", 1500, 176, 320, { size: 190 }),
        mono("ROUND", 1500, 470, 320, { size: 30, bold: true }),
        R(72, 800, W - 144, 8, K0, { name: "Rule" }),
        ...[["PRESENTER", "Noor Haddad"], ["TEAM", "Checkout squad"], ["FORMAT", "45 min, open floor"]].flatMap(([a, b], i) => [mono(a, 72 + i * 620, 840, 560, { size: 20, color: GR }), body(b, 72 + i * 620, 876, 560, { size: 40, bold: true })]),
      ], "Welcome to round three of the checkout critique. Ground rules: critique the work, not the person, and every comment needs a reason."],
      [BG, [
        ...head("AGENDA / 45 MINUTES", "02"),
        big("AGENDA", 60, 110, 1000, { size: 170, ls: -6 }),
        mono("Speak up after each part.\nBig ideas go to the parking lot.", 1200, 150, 648, { size: 24, color: GR, align: "right", lh: 1.5 }),
        ...[["Context and goals", "5 MIN"], ["What we saw", "10 MIN"], ["Numbers from testing", "10 MIN"], ["Open critique", "15 MIN"], ["Decisions and owners", "5 MIN"]].flatMap(([t, m], i) => {
          const y = 330 + i * 140;
          return [
            i === 0 ? R(72, y, W - 144, 140, RED, { name: "Current item" }) : null,
            R(72, y, W - 144, 4, K0, { name: "Row rule" }),
            big("0" + (i + 1), 96, y + 26, 200, { size: 96 }),
            T(t, 340, y + 38, 1100, { size: 56, bold: true, color: K0 }),
            mono(m, W - 420, y + 54, 320, { size: 28, align: "right", bold: true }),
          ];
        }),
        R(72, 1030, W - 144, 4, K0, { name: "Row rule" }),
      ], "Five parts in 45 minutes. The red row shows where we are. Anything too big for today goes on the parking lot and gets an owner at the end."],
      [K0, [
        mono("PART 02", 72, 72, 600, { size: 30, color: RED, bold: true }),
        big("02", 40, 110, 1000, { size: 560, color: RED, lh: 0.85, ls: -24 }),
        R(72, 620, W - 144, 10, BG, { name: "Rule" }),
        big("WHAT WE\nSAW.", 60, 668, 1300, { size: 170, color: BG, lh: 0.88 }),
        mono("Screens from round 2 testing, with notes from six sessions.", 1480, 700, 368, { size: 26, color: "#b8b4aa", lh: 1.5 }),
      ], "Part two: what we saw. Walk through the screens in the order a shopper meets them, and hold opinions until the open critique."],
      [BG, [
        ...head("FINDING 01 / CART", "04"),
        F(72, 130, 900, 690, { border: { width: 8, color: K0 }, name: "Screenshot" }),
        R(72, 820, 560, 64, RED, { name: "Caption tag" }),
        mono("FIG. 1  CART STEP, MOBILE", 96, 838, 520, { size: 22, bold: true }),
        ...flow(140,
          big("The cart hides\nthe total.", 1060, 0, 788, { size: 88, lh: 0.95 }), 56,
          body("Shoppers scrolled past three upsell cards before they saw what they would pay. Four of six testers asked “where is the total?” out loud.", 1060, 0, 760), 40,
          R(1060, 0, 788, 6, K0, { name: "Rule" }), 30,
          mono("→ Move the total above the fold\n→ Collapse upsells by default\n→ Keep the pay button in view", 1060, 0, 788, { size: 28, lh: 1.7 })),
      ], "Finding one. Drop the cart screenshot into the frame. The point to land: people can't see the total, so they don't trust it. Three fixes are on the right."],
      [BG, [
        ...head("DATA / FUNNEL", "05"),
        big("WHERE THEY\nDROP OFF.", 60, 110, 1000, { size: 110 }),
        body("Share of 2,400 test sessions that ended at each step.", 1240, 230, 608, { size: 28, color: GR, align: "right" }),
        R(96, 960, 1728, 10, K0, { name: "Baseline" }),
        ...[["CART", 12], ["DETAILS", 9], ["SHIPPING", 41], ["PAYMENT", 18], ["REVIEW", 6]].flatMap(([c, v], i) => {
          const x = 150 + i * 340, h = Math.round((v / 41) * 470);
          return [R(x, 960 - h, 220, h, v === 41 ? RED : K0, { name: c + " bar" }), mono(v + "%", x - 20, 960 - h - 60, 260, { size: 40, bold: true, align: "center" }), mono(c, x - 30, 992, 280, { size: 24, align: "center" })];
        }),
        mono("← FIX THIS FIRST", 1060, 480, 330, { size: 26, bold: true, color: RED }),
      ], "The funnel from testing. Shipping is the cliff: 41% of sessions end there. Everything else is noise next to it, so that is where we spend the critique time."],
      [BG, [
        ...head("PLAN / TIMELINE", "06"),
        big("FROM BRIEF\nTO SHIP.", 60, 110, 1100, { size: 110 }),
        R(72, 600, W - 144, 16, K0, { name: "Timeline bar" }),
        ...[["WK 01", "Brief signed", "Goals, budget and success metric agreed."], ["WK 03", "Wireframes", "Three flows sketched and reviewed."], ["WK 05", "Round 2 test", "Six sessions on the new cart."], ["WK 07", "Final UI", "Visual polish and copy pass."], ["WK 09", "Ship to 100%", "Staged roll-out, then full launch."]].flatMap(([d, t, s], i) => {
          const cx = 72 + 355 * i + 177;
          return [
            R(cx - 32, 576, 64, 64, i === 2 ? RED : K0, { name: "Marker" }),
            i === 2 ? mono("YOU ARE HERE", cx - 160, 520, 320, { size: 22, bold: true, color: RED, align: "center" }) : null,
            mono(d, cx - 160, 672, 320, { size: 24, color: GR, align: "center" }),
            T(t, cx - 160, 710, 320, { size: 38, bold: true, color: K0, align: "center" }),
            body(s, cx - 150, 766, 300, { size: 24, align: "center" }),
          ];
        }),
      ], "Nine weeks from brief to launch. We're in week five, right after the second round of testing, so this is the last cheap moment to change direction."],
      [BG, [
        ...head("PEOPLE", "07"),
        big("WHO'S IN\nTHE ROOM.", 60, 110, 1100, { size: 110 }),
        ...[["Noor Haddad", "LEAD DESIGNER"], ["Tom Becker", "PRODUCT MANAGER"], ["Aiko Mori", "UX RESEARCHER"], ["Sam Okafor", "FRONT-END ENGINEER"]].flatMap(([n, r], i) => {
          const x = 72 + i * 450;
          return [member(CAST, F(x, 360, 400, 400, { border: { width: 8, color: K0 }, name: "Portrait" }), n, r), R(x, 360, 84, 84, RED, { name: "Number tag" }), mono("0" + (i + 1), x, 384, 84, { size: 30, bold: true, align: "center" }), T(n, x, 790, 400, { size: 42, bold: true, color: K0 }), mono(r, x, 848, 400, { size: 22, color: GR })];
        }),
        body("Plus guests from support, marketing and payments.", 72, 960, 1200, { size: 28, color: GR }),
      ], "Quick round of names. Each person owns one part of the decision log, so say who to send follow-up questions to."],
      [RED, [
        R(0, 0, W, 14, K0, { name: "Top rule" }),
        T("“", 64, 40, 300, { size: 360, bold: true, color: K0, lh: 0.8 }),
        big("I CAN'T FIND THE PRICE, SO I DON'T TRUST THE PRICE.", 72, 360, 1776, { size: 124, lh: 0.95 }),
        R(72, 800, 200, 14, K0, { name: "Rule" }),
        mono("TESTER 04 / ROUND 2 SESSION, 6 NOV", 72, 846, 1200, { size: 30, bold: true }),
      ], "Read this one out loud and pause. It is the clearest summary of the problem we heard in six sessions."],
      [BG, [
        ...head("DATA / KEY NUMBER", "09"),
        big("41%", 48, 100, 1180, { size: 500, lh: 0.85, ls: -20 }),
        T("of test shoppers quit at the shipping step.", 72, 560, 1100, { size: 64, bold: true, color: K0, lh: 1.05 }),
        ...[["SAMPLE", "2,400 sessions", "none"], ["TIME LOST", "3 min 12 s", "none"], ["TARGET", "Under 15%", RED]].flatMap(([a, b, f], i) => {
          const y = 120 + i * 270;
          return [R(1300, y, 548, 240, f, { stroke: K0, sw: 8, name: "Stat box" }), mono(a, 1336, y + 36, 476, { size: 22, color: f === RED ? K0 : GR }), T(b, 1336, y + 84, 476, { size: 62, bold: true, color: K0 })];
        }),
        R(72, 880, 1100, 8, K0, { name: "Rule" }),
        mono("SOURCE: ROUND 2 USABILITY TESTS, NOV 2026", 72, 912, 1100, { size: 22, color: GR }),
      ], "One number to remember: 41%. The goal for launch is under 15%, and the boxes on the right give the sample size and the time people lost."],
      [BG, [
        R(0, 0, W, 14, K0, { name: "Top rule" }),
        big("THANKS.\nNOW TEAR\nIT APART.", 60, 90, 1340, { size: 180, lh: 0.86 }),
        R(1500, 90, 348, 348, RED, { name: "Red block" }),
        T("Q&A", 1500, 200, 348, { size: 110, bold: true, color: K0, align: "center" }),
        R(0, 680, W, 400, K0, { name: "Footer block" }),
        ...[["EMAIL", "noor@studio.example"], ["CHANNEL", "#checkout-crit"], ["NEXT CRIT", "Thu 21 Nov, 10:00"]].flatMap(([a, b], i) => [mono(a, 72 + i * 620, 770, 560, { size: 22, color: "#a8a49a" }), T(b, 72 + i * 620, 812, 580, { size: 42, bold: true, color: BG })]),
      ], "Open the floor. Capture every point in the channel, and close by naming an owner for each decision before the next crit."],
    ];
  });

  /* 2 ─ Paper cut-out layers · nonprofit impact ──────────────────────────────────────── */
  deck("paper-cutout-nonprofit-impact-dk2", "Paper cut-out nonprofit impact report", P169, "nonprofit impact report charity food bank community donors volunteers paper cut out", (W, H) => {
    const BG = "#f6efe3", TER = "#d9633b", MUS = "#e8b04b", SAGE = "#5f8a5b", TEAL = "#1f4e5a", INKP = "#2c2a26", SH = "#4a3826";
    const cut = (kind, x, y, w, h, fill, o = {}) => [S(kind, x + 10, y + 14, w, h, SH, { op: 0.18, rot: o.rot, radius: o.radius, name: "Paper shadow" }), S(kind, x, y, w, h, fill, { ...o, name: o.name || "Paper layer" })];
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "cambria", bold: true, size: 84, color: TEAL, lh: 1.05, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 32, color: INKP, lh: 1.4, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", bold: true, size: 24, color: TER, ls: 4, ...o });
    const hills = () => [...cut("ellipse", -260, 700, 1300, 800, TER, { name: "Paper hill" }), ...cut("ellipse", 760, 640, 1600, 900, SAGE, { name: "Paper hill" }), ...cut("ellipse", -400, 860, 2800, 700, TEAL, { name: "Paper hill" })];
    const top = (l, h) => [lab(l, 140, 110, 1000), hd(h, 140, 150, 1200)];
    const COLS = [MUS, TER, SAGE, TEAL];
    return [
      [BG, [
        ...cut("ellipse", 1440, 110, 300, 300, MUS, { name: "Paper sun" }),
        ...hills(),
        lab("RIVERBEND FOOD BANK", 140, 150, 900),
        hd("Our year of\nfull plates", 140, 200, 1100, { size: 130, lh: 1.0 }),
        tx("2026 impact report for donors, volunteers and partners", 140, 480, 880, { size: 38 }),
        tx("Presented by Amara Lewis, Director  ·  March 2027", 140, 975, 1000, { size: 28, color: WHITE, bold: true }),
      ], "Thank everyone for coming. This report covers January to December 2026 and every number in it was counted by our volunteers."],
      [BG, [
        ...top("INSIDE THIS REPORT", "What's inside"),
        ...[["1", "A year in numbers", TER, WHITE], ["2", "The people we reached", MUS, TEAL], ["3", "Where the food came from", SAGE, WHITE], ["4", "Stories from our pantry", TEAL, WHITE], ["5", "What comes next", TER, WHITE]].flatMap(([n, t, c, ink], i) => {
          const y = 300 + i * 140, x = 140 + (i % 2) * 60;
          return [...cut("rect", x, y, 860, 104, c, { radius: 20, name: "Paper tag" }), vmid(T(n, x + 24, 0, 70, { family: "cambria", bold: true, size: 56, color: ink, align: "center" }), y, 104), vmid(tx(t, x + 120, 0, 700, { size: 38, bold: true, color: ink }), y, 104)];
        }),
        ...cut("ellipse", 1180, 260, 600, 600, MUS, { name: "Paper circle" }),
        ...cut("ellipse", 1260, 340, 440, 440, TER, { name: "Paper circle" }),
        ...cut("ellipse", 1340, 420, 280, 280, BG, { name: "Paper circle" }),
        T("5", 1340, 448, 280, { family: "cambria", bold: true, size: 140, color: TEAL, align: "center", lh: 1 }),
        tx("chapters", 1365, 592, 230, { size: 30, align: "center", color: TEAL, bold: true }),
      ], "Five short chapters. We start with the numbers, then the people behind them, and finish with our plans for 2027."],
      [TEAL, [
        ...cut("ellipse", 1000, 90, 900, 900, MUS, { name: "Paper circle" }),
        ...cut("ellipse", 1120, 210, 660, 660, TER, { name: "Paper circle" }),
        ...cut("ellipse", 1240, 330, 420, 420, BG, { name: "Paper circle" }),
        E("icon-heart", 1370, 460, 160, { c1: TER }),
        lab("PART 2", 140, 360, 600, { color: MUS }),
        hd("The people\nwe reached", 140, 410, 820, { size: 120, color: WHITE }),
        tx("Families, seniors and students across six neighbourhoods.", 140, 690, 760, { color: "#d9e6e3" }),
      ], "Part two is about people, not pounds of food. Keep this section personal and use first names only with permission."],
      [BG, [
        ...cut("ellipse", 120, 130, 780, 780, MUS, { name: "Paper mat" }),
        F(170, 180, 680, 680, { shape: "circle", name: "Photo" }),
        ...cut("rect", 300, 950, 420, 76, TEAL, { radius: 38, name: "Caption tag" }),
        vmid(tx("Saturday market, May", 300, 0, 420, { size: 28, bold: true, color: WHITE, align: "center" }), 950, 76),
        lab("WHAT CHANGED", 1020, 200, 760),
        ...flow(240, hd("Fresh food,\nnot leftovers", 1020, 0, 780), 30, tx("This year 62% of what we handed out was fresh: fruit, vegetables, eggs and milk from 14 local farms. Families told us it was the change that mattered most.", 1020, 0, 780)),
        ...["14 partner farms", "3 new cold rooms", "Weekly market stalls"].flatMap((s, i) => [...cut("rect", 1020, 700 + i * 96, 520, 72, [SAGE, TER, TEAL][i], { radius: 14, name: "Paper chip" }), vmid(tx(s, 1050, 0, 470, { size: 30, bold: true, color: WHITE }), 700 + i * 96, 72)]),
      ], "Our biggest shift: fresh food instead of whatever was left over. Put a photo from a market day in the circle."],
      [BG, [
        ...top("MEALS SERVED", "Every quarter, more plates"),
        tx("Meals per quarter in 2026, in thousands.", 1380, 168, 400, { size: 26, color: "#6f655a", align: "right" }),
        ...cut("rect", 120, 900, 1680, 40, TEAL, { name: "Paper ground" }),
        ...[["Q1", 41], ["Q2", 48], ["Q3", 57], ["Q4", 66]].flatMap(([q, v], i) => {
          const h = Math.round((v / 66) * 560), x = 220 + i * 400, c = COLS[i];
          return [...cut("rect", x, 900 - h, 240, h, c, { name: q + " bar" }), R(x, 900 - h, 240, 26, WHITE, { op: 0.35, name: "Paper fold" }), T(v + "k", x, 900 - h - 80, 240, { family: "cambria", bold: true, size: 56, color: TEAL, align: "center" }), T(q, x, 956, 240, { family: "calibri", bold: true, size: 30, color: INKP, align: "center" })];
        }),
      ], "Meals grew every single quarter, from 41,000 to 66,000. The jump in Q3 is the new cold room opening."],
      [BG, [
        ...top("THE YEAR", "How 2026 unfolded"),
        ...dotted([[240, 440], [600, 510], [960, 440], [1320, 510], [1680, 440]], 28, 12, TEAL, { op: 0.45 }),
        ...[["JAN", "Cold room opens", "Doubles how much fresh food we can keep."], ["APR", "Market stalls", "Free weekly stalls in three parks."], ["JUN", "School pantry", "Snack shelves in four schools."], ["SEP", "Farm partners", "Fourteen farms now give us surplus."], ["DEC", "Record week", "7,200 meals in one December week."]].flatMap(([m, t, s], i) => {
          const cx = 240 + i * 360, cy = i % 2 ? 510 : 440;
          return [...cut("ellipse", cx - 75, cy - 75, 150, 150, COLS[i % 4], { name: "Stepping stone" }), vmid(T(m, cx - 75, 0, 150, { family: "cambria", bold: true, size: 40, color: i % 4 === 0 ? TEAL : WHITE, align: "center" }), cy - 75, 150), ...flow(650, tx(t, cx - 160, 0, 320, { size: 34, bold: true, color: TEAL, align: "center" }), 8, tx(s, cx - 160, 0, 320, { size: 26, align: "center" }))];
        }),
      ], "Five moments that shaped the year. Each stepping stone made the next one possible."],
      [BG, [
        ...top("OUR TEAM", "The people behind it"),
        ...[["Amara Lewis", "Director"], ["Jonah Pike", "Warehouse lead"], ["Priya Nair", "Volunteer coordinator"], ["Luis Ortega", "Farm partnerships"]].flatMap(([n, r], i) => {
          const x = 160 + i * 420;
          return [...cut("ellipse", x, 320, 340, 340, COLS[i], { name: "Paper ring" }), member(CAST, F(x + 30, 350, 280, 280, { shape: "circle", name: "Portrait" }), n, r), T(n, x - 20, 700, 380, { family: "cambria", bold: true, size: 40, color: TEAL, align: "center" }), tx(r, x - 20, 756, 380, { size: 28, align: "center" })];
        }),
        tx("Plus 310 volunteers who gave 18,000 hours.", 140, 900, 1640, { size: 34, align: "center", bold: true, color: TER }),
      ], "Four staff and a huge volunteer crew. Mention the volunteer hours: that's nine full-time jobs' worth of time."],
      [BG, [
        S("triangle", 430, 714, 140, 120, SH, { rot: 180, op: 0.18, name: "Paper shadow" }),
        ...cut("rect", 240, 150, 1440, 560, WHITE, { radius: 48, name: "Speech bubble" }),
        S("triangle", 420, 700, 140, 120, WHITE, { rot: 180, name: "Bubble tail" }),
        T("“", 300, 180, 200, { family: "cambria", bold: true, size: 200, color: MUS, lh: 0.8 }),
        hd("The fresh box means my kids eat the same food as their friends. It made us feel like part of the neighbourhood again.", 360, 350, 1200, { size: 56, italic: true, bold: false, lh: 1.3, align: "center" }),
        face(CAST, F(600, 780, 140, 140, { shape: "circle", name: "Portrait" }), KIND.customer, { sex: "f" }),
        tx("Maria, a parent from Eastside", 770, 800, 800, { bold: true, color: TEAL }),
        tx("Fresh box family since 2025", 770, 846, 800, { size: 26 }),
      ], "Let this quote breathe. Maria agreed to be quoted by first name; always check before using a family's words."],
      [BG, [
        ...top("2026 IN NUMBERS", "A year in numbers"),
        ...[["66,000", "meals served", MUS, "icon-leaf"], ["1,250", "families helped each month", TER, "icon-home"], ["310", "volunteers on the rota", SAGE, "icon-users"]].flatMap(([n, l, c, ic], i) => {
          const x = 140 + i * 560;
          return [...cut("rect", x + 16, 330, 500, 560, c, { rot: i === 1 ? 3 : -3, radius: 16, name: "Paper card" }), ...cut("rect", x, 340, 500, 540, WHITE, { radius: 16, name: "Paper card" }), C(x + 190, 400, 120, 120, c, { op: 0.18, name: "Icon disc" }), E(ic, x + 210, 420, 80, { c1: c }), T(n, x + 30, 560, 440, { family: "cambria", bold: true, size: 110, color: TEAL, align: "center" }), tx(l, x + 40, 710, 420, { size: 34, align: "center" })];
        }),
      ], "Three numbers to take home. If you only remember one, make it 1,250 families every month."],
      [BG, [
        ...cut("ellipse", 1440, 110, 300, 300, MUS, { name: "Paper sun" }),
        E("icon-heart", 1530, 200, 120, { c1: TER }),
        ...hills(),
        hd("Thank you,\nneighbours", 140, 170, 1100, { size: 130, lh: 1.0 }),
        tx("Give, volunteer or share our story.", 140, 450, 900, { size: 38 }),
        tx("riverbendfood.example  ·  (555) 014 2290  ·  hello@riverbendfood.example", 140, 975, 1500, { size: 28, color: WHITE, bold: true }),
      ], "Close with thanks and one clear ask: sign up for a volunteer shift or set up a monthly gift."],
    ];
  });

  /* 3 ─ Duotone print · startup pitch ───────────────────────────────────────────────── */
  deck("duotone-startup-pitch-dk2", "Duotone startup pitch", P169, "startup pitch investor seed funding round business plan duotone", (W, H) => {
    const BL = "#2323d8", PK = "#ff5fa8", NV = "#0d0d3b";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 96, color: BL, lh: 0.98, ls: -2, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 32, color: NV, lh: 1.4, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 22, color: PK, ls: 5, ...o });
    // (who = [name, role]: a team member's portrait)
    const duo = (x, y, w, h, back, who) => [R(x + 36, y + 36, w, h, back, { name: "Offset block" }), who ? member(CAST, F(x, y, w, h, { name: "Portrait" }), who[0], who[1]) : F(x, y, w, h, { name: "Photo" })];
    const logo = (x, y, c) => [C(x, y + 2, 60, 60, "none", { stroke: PK, sw: 13, name: "Logo ring" }), T("loop", x + 76, y, 300, { family: "sans", bold: true, size: 52, color: c })];
    return [
      [BL, [
        ...logo(120, 110, WHITE),
        hd("Refills that\nreplace the\nbottle.", 120, 300, 900, { size: 124, color: WHITE, lh: 0.95 }),
        lab("SEED ROUND  ·  JANUARY 2027", 120, 720, 800),
        tx("Maya Chen, co-founder and CEO", 120, 770, 800, { color: "#c9caff" }),
        ...grid(940, 860, 4, 4, 40, 16, PK, 0.8),
        ...duo(1100, 120, 680, 800, PK),
      ], "Open with the one-liner: we sell cleaning refills so homes stop buying plastic bottles. Then let the photo do the talking."],
      [WHITE, [
        R(0, 0, 640, H, BL, { name: "Colour panel" }),
        lab("AGENDA", 100, 120, 460),
        hd("What we'll\ncover", 100, 170, 460, { size: 84, color: WHITE }),
        T("06", 100, 700, 460, { family: "sans", bold: true, size: 240, color: PK, lh: 1 }),
        ...["The problem", "Our product", "Traction", "Business model", "Roadmap", "Team and the ask"].flatMap((s, i) => {
          const y = 130 + i * 140;
          return [C(760, y + 10, 76, 76, i % 2 ? BL : PK, { name: "Number dot" }), vmid(T(String(i + 1), 760, 0, 76, { family: "sans", bold: true, size: 36, color: i % 2 ? WHITE : NV, align: "center" }), y + 10, 76), vmid(hd(s, 880, 0, 900, { size: 54, lh: 1.2 }), y + 10, 76), R(760, y + 120, 1060, 2, BL, { op: 0.2, name: "Divider" })];
        }),
      ], "Six parts, about twelve minutes, then questions. Keep the problem section short; investors have heard about plastic before."],
      [PK, [
        ...grid(1360, 170, 9, 9, 52, 22, BL, 0.35),
        lab("PART 01 / 03", 120, 300, 800, { color: NV }),
        hd("The\nproblem.", 110, 350, 1200, { size: 260, lh: 0.88, ls: -8 }),
      ], "Section one: the problem. One slide, one number, then move on."],
      [WHITE, [
        ...duo(100, 120, 780, 800, BL),
        lab("THE PROBLEM", 1020, 150, 800),
        ...flow(200, hd("90 plastic bottles a year, per home.", 1020, 0, 800, { size: 76 }), 48, tx("Sprays, soaps and cleaners are mostly water, shipped in single-use plastic. Fewer than one in ten of those bottles is ever recycled.", 1020, 0, 780)),
        ...[["90", "bottles per home"], ["<10%", "get recycled"]].flatMap(([a, b], i) => [hd(a, 1020 + i * 400, 720, 360, { size: 96, color: PK }), tx(b, 1020 + i * 400, 830, 360, { size: 28 })]),
      ], "Use a photo of a cupboard full of half-empty bottles. The two pink numbers are the whole argument."],
      [BL, [
        lab("TRACTION", 120, 110, 800),
        hd("Monthly revenue, $k", 120, 150, 1100, { size: 84, color: WHITE }),
        R(120, 900, 1280, 3, WHITE, { op: 0.6, name: "Baseline" }),
        ...[["APR", 12], ["MAY", 18], ["JUN", 24], ["JUL", 31], ["AUG", 42], ["SEP", 55], ["OCT", 68], ["NOV", 84], ["DEC", 102]].flatMap(([m, v], i) => {
          const h = Math.round((v / 102) * 560), x = 140 + i * 140;
          return [R(x, 900 - h, 96, h, i >= 6 ? PK : WHITE, { name: m + " bar" }), T(String(v), x - 12, 900 - h - 44, 120, { family: "sans", bold: true, size: 28, color: i >= 6 ? PK : WHITE, align: "center" }), T(m, x - 12, 920, 120, { family: "calibri", bold: true, size: 24, color: "#c9caff", align: "center" })];
        }),
        R(1500, 330, 300, 420, PK, { name: "Callout" }),
        T("8.5x", 1500, 400, 300, { family: "sans", bold: true, size: 110, color: BL, align: "center" }),
        tx("growth in nine months", 1530, 560, 240, { align: "center", bold: true }),
      ], "Revenue went from 12k to 102k a month in nine months, with no paid ads until October. The pink bars are after we started paid social."],
      [WHITE, [
        lab("ROADMAP", 120, 110, 800),
        hd("Where the seed takes us", 120, 150, 1400, { size: 84 }),
        R(120, 430, 1680, 6, BL, { name: "Track" }),
        ...[["Q1 2027", "Close the seed", "Hire six people and double the warehouse."], ["Q2 2027", "Three new scents", "Kitchen, bath and laundry refills."], ["Q3 2027", "Retail pilot", "Refill bars in 40 grocery stores."], ["Q4 2027", "Refill stations", "Self-serve stations in two cities."], ["2028", "Series A", "Expand to five countries."]].flatMap(([d, t, s], i) => {
          const x = 120 + i * 350;
          return [R(x, 396, 260, 74, i % 2 ? PK : BL, { radius: 37, name: "Milestone pill" }), vmid(T(d, x, 0, 260, { family: "sans", bold: true, size: 28, color: i % 2 ? NV : WHITE, align: "center" }), 396, 74), ...flow(530, hd(t, x, 0, 320, { size: 44, lh: 1.1 }), 16, tx(s, x, 0, 300, { size: 30 }))];
        }),
        ...grid(120, 920, 10, 3, 40, 14, PK, 0.7),
      ], "Twelve months of milestones, then the Series A. Each step is funded by this round; nothing here assumes more money."],
      [WHITE, [
        R(0, 0, W, 300, BL, { name: "Top band" }),
        lab("TEAM", 120, 100, 800),
        hd("Built by people who clean for a living", 120, 140, 1600, { size: 72, color: WHITE }),
        ...[["Maya Chen", "CEO", "Ran operations at a 200-van cleaning company."], ["Dev Patel", "CTO", "Built logistics software for nine years."], ["Rosa Diaz", "Head chemist", "Formulated plant-based cleaners at scale."]].flatMap(([n, r, s], i) => {
          const x = 140 + i * 580;
          return [...duo(x, 350, 440, 420, i === 1 ? BL : PK, [n, r]), hd(n, x, 850, 480, { size: 44 }), lab(r.toUpperCase(), x, 904, 480), tx(s, x, 940, 480, { size: 26 })];
        }),
      ], "Three founders, three skills: operations, software and chemistry. Mention that Rosa holds the formula patents."],
      [PK, [
        T("“", 120, 80, 300, { family: "sans", bold: true, size: 320, color: BL, lh: 0.8 }),
        hd("I used to buy six bottles a month. Now I buy one, and refill it. It feels like the obvious way.", 120, 360, 1500, { size: 80, lh: 1.08, color: NV }),
        R(120, 790, 120, 10, BL, { name: "Rule" }),
        T("Hana K., subscriber since month one", 120, 830, 1200, { family: "sans", bold: true, size: 34, color: BL }),
        ...grid(1480, 800, 8, 4, 40, 16, BL, 0.4),
      ], "A real customer line beats any claim we could make. Hana has reordered for fourteen months straight."],
      [BL, [
        lab("TRACTION TO DATE", 120, 110, 800),
        ...[["38k", "households subscribed"], ["2.1M", "bottles kept out of the bin"], ["71%", "reorder every month"]].flatMap(([a, b], i) => [hd(a, 120 + i * 580, 260, 540, { size: 190, color: WHITE, lh: 1 }), R(120 + i * 580, 480, 80, 10, PK, { name: "Rule" }), tx(b, 120 + i * 580, 520, 480, { color: "#d6d7ff", size: 34 })]),
        R(0, 760, W, 320, PK, { name: "Ask band" }),
        lab("THE ASK", 120, 820, 600, { color: NV }),
        hd("$3M seed to reach 150k homes by 2028.", 120, 864, 1680, { size: 76 }),
      ], "Three proof points, then the ask. Say the number clearly and stop talking for a moment."],
      [BL, [
        ...duo(1100, 140, 680, 760, PK),
        hd("Let's make\nthe bottle\nobsolete.", 120, 200, 900, { size: 120, color: WHITE, lh: 0.95 }),
        lab("CONTACT", 120, 640, 800),
        tx("maya@loop.example\nloop.example/invest\n+1 555 0148", 120, 690, 800, { color: WHITE, size: 36, lh: 1.5 }),
        ...logo(120, 930, WHITE),
      ], "Thank them, share the data room link and offer a product box to anyone who wants to try it at home."],
    ];
  });

  /* 4 ─ Split diagonal · sales kickoff ──────────────────────────────────────────────── */
  deck("diagonal-sales-kickoff-dk2", "Split diagonal sales kickoff", P169, "sales kickoff sko team targets revenue annual meeting motivation diagonal", (W, H) => {
    const CH = "#17191e", LM = "#c8f031", GY = "#2b2f38", LG = "#a4aab5", OL = "#5d7a00", DK = "#3a3f4a";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, italic: true, size: 96, color: WHITE, lh: 0.95, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 32, color: DK, lh: 1.4, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", bold: true, size: 24, color: LM, ls: 6, ...o });
    const slash = (x, y, h, c, n = 3) => Array.from({ length: n }, (_, i) => R(x + i * 44, y, 18, h, c, { rot: 15, name: "Slash" }));
    const tag = (x, y, w, h, c) => E("shape-parallelogram", x, y, w, { h, c1: c, name: "Slanted tag" });
    return [
      [CH, [
        R(1250, -300, 1200, 1700, LM, { rot: 15, name: "Diagonal panel" }),
        ...slash(1080, -40, 1160, GY),
        lab("FY27 SALES KICKOFF", 120, 200, 900),
        hd("Go\nfurther.", 110, 260, 1000, { size: 240, lh: 0.88 }),
        tx("Northwind Supply  ·  13–14 January  ·  Lisbon", 120, 720, 900, { color: LG, size: 34 }),
        T("27", 1420, 330, 440, { family: "sans", bold: true, italic: true, size: 320, color: CH, lh: 1 }),
      ], "Big energy from the first slide. Welcome everyone to Lisbon and set the theme for the two days: go further than last year."],
      [WHITE, [
        R(-600, -300, 1400, 1700, CH, { rot: 15, name: "Diagonal panel" }),
        lab("AGENDA", 120, 150, 500),
        hd("Two days.\nFive\nsessions.", 120, 200, 560, { size: 100 }),
        ...slash(150, 780, 200, LM),
        ...[["Where we won in FY26", "Day 1  ·  09:30"], ["The FY27 number", "Day 1  ·  11:00"], ["New chilled range", "Day 1  ·  14:00"], ["Territory plans", "Day 2  ·  09:30"], ["Awards night", "Day 2  ·  19:00"]].flatMap(([t, d], i) => {
          const y = 150 + i * 160;
          return [tag(1040, y, 130, 78, LM), vmid(T("0" + (i + 1), 1050, 0, 110, { family: "sans", bold: true, italic: true, size: 34, color: CH, align: "center" }), y, 78), hd(t, 1210, y - 4, 640, { size: 46, color: CH, lh: 1.1 }), tx(d, 1210, y + 54, 640, { size: 26, color: "#6b7280" })];
        }),
      ], "Two days, five sessions. Day one is about the number and the product; day two is territory plans and the awards night."],
      [LM, [
        R(1150, -300, 1400, 1700, CH, { rot: 15, name: "Diagonal panel" }),
        T("01", 110, 140, 700, { family: "sans", bold: true, italic: true, size: 300, color: CH, lh: 1 }),
        hd("Where we\nwon in FY26", 120, 500, 1000, { size: 130, color: CH }),
        lab("DAY 1  ·  09:30", 1460, 960, 400),
      ], "Section one: last year's wins. Celebrate first, then raise the bar."],
      [WHITE, [
        F(1000, 0, 920, H, { name: "Photo" }),
        R(970, -60, 44, 1200, LM, { rot: 6, name: "Slash" }),
        lab("FY26 WIN OF THE YEAR", 120, 160, 760, { color: OL }),
        ...flow(210, hd("Coastal Foods signed for three years.", 120, 0, 760, { size: 80, color: CH }), 48, tx("A six-month pilot became our biggest contract: 140 stores, one supplier and a shared forecast that cut their waste by 18%.", 120, 0, 740)),
        ...[["$6.2M", "contract value"], ["140", "stores supplied"]].flatMap(([a, b], i) => [hd(a, 120 + i * 380, 760, 340, { size: 88, color: CH }), tx(b, 120 + i * 380, 856, 340, { size: 26, color: "#6b7280" })]),
      ], "Tell the Coastal Foods story in two minutes: pilot, proof, contract. Invite Ana's team to stand up."],
      [CH, [
        lab("PIPELINE BY REGION", 120, 110, 800),
        hd("$48M of pipeline, ready to close", 120, 150, 1600, { size: 76 }),
        ...[["North", 14.2], ["West", 11.5], ["South", 9.8], ["Central", 7.1], ["Export", 5.4]].flatMap(([r, v], i) => {
          const y = 330 + i * 140, len = Math.round((v / 14.2) * 1080), x0 = 400;
          return [vmid(T(r, 120, 0, 250, { family: "calibri", bold: true, size: 36, color: LG }), y, 70), R(x0, y, len, 70, LM, { op: [1, 0.85, 0.7, 0.55, 0.45][i], name: r + " bar" }), R(x0 + len + 20, y - 4, 14, 78, LM, { rot: 15, name: "Slash" }), vmid(hd("$" + v + "M", x0 + len + 56, 0, 220, { size: 40 }), y, 70)];
        }),
      ], "North leads, but Export is the fastest-growing line. Every region owner will walk through their top five deals tomorrow."],
      [WHITE, [
        lab("FY27 PLAN", 120, 110, 800, { color: OL }),
        hd("Four quarters, one direction", 120, 150, 1600, { size: 80, color: CH }),
        ...[["Q1", "JAN–MAR", "Land", "Kick off 40 key accounts and lock in pricing."], ["Q2", "APR–JUN", "Expand", "Cross-sell the new chilled range."], ["Q3", "JUL–SEP", "Defend", "Renew every contract over $500k."], ["Q4", "OCT–DEC", "Close strong", "Pull FY28 deals forward."]].flatMap(([q, m, t, s], i) => {
          const x = 120 + i * 430, c = [CH, GY, CH, LM][i], ink = i === 3 ? CH : WHITE;
          return [tag(x, 300, 400, 220, c), hd(q, x + 120, 352, 200, { size: 84, color: ink }), lab(m, x + 120, 444, 200, { size: 22, color: i === 3 ? CH : LM }), hd(t, x + 20, 580, 380, { size: 44, color: CH }), tx(s, x + 20, 640, 360, { size: 28 })];
        }),
        R(120, 850, 1680, 130, CH, { name: "Rule band" }),
        R(120, 850, 16, 130, LM, { name: "Band accent" }),
        vmid(tx("Our one rule for FY27: no deal sits for more than 14 days without a next step.", 180, 0, 1580, { size: 36, bold: true, color: WHITE }), 850, 130),
      ], "One verb per quarter: land, expand, defend, close. Ask every rep to write their own four verbs before lunch."],
      [CH, [
        lab("REGIONAL LEADS", 120, 110, 800),
        hd("Your captains for FY27", 120, 150, 1600, { size: 80 }),
        ...[["Ana Ferreira", "North", "Coastal Foods, Harbor Markets"], ["James Holt", "West", "Biggest growth in FY26"], ["Mei Lin", "South", "Joined from Freshway"], ["Omar Saleh", "Export", "Opened 3 new countries"]].flatMap(([n, r, s], i) => {
          const x = 120 + i * 440;
          return [member(CAST, F(x, 300, 380, 460, { name: "Portrait" }), n, r), tag(x, 790, 220, 56, LM), vmid(T(r.toUpperCase(), x + 30, 0, 160, { family: "calibri", bold: true, size: 24, color: CH, align: "center", ls: 3 }), 790, 56), hd(n, x, 868, 400, { size: 44, italic: false }), tx(s, x, 922, 400, { size: 26, color: LG })];
        }),
      ], "Introduce the four regional leads. Each one runs a breakout tomorrow morning."],
      [LM, [
        R(-200, 820, 2400, 600, CH, { rot: -4, name: "Diagonal band" }),
        T("“", 120, 60, 300, { family: "sans", bold: true, size: 300, color: CH, lh: 0.8 }),
        hd("Nobody remembers the deals we almost closed. Let's make FY27 the year of “signed”.", 120, 300, 1650, { size: 84, color: CH }),
        lab("RITA SOUZA, VP SALES", 120, 960, 900),
        tx("Opening keynote, SKO 2027", 120, 1000, 900, { color: LG, size: 28 }),
      ], "Rita's line from the keynote. Pause after it and let the room react."],
      [CH, [
        R(1250, -300, 1200, 1700, GY, { rot: 15, name: "Diagonal panel" }),
        lab("THE FY27 NUMBER", 120, 160, 900),
        hd("$48M", 100, 220, 1100, { size: 360, color: LM, lh: 0.9, ls: -10 }),
        tx("New bookings target, up 22% on FY26.", 120, 580, 980, { color: LG, size: 40 }),
        ...[["+22%", "growth vs FY26"], ["140", "new customer logos"], ["12", "reps joining in Q1"]].flatMap(([a, b], i) => [hd(a, 1400, 200 + i * 240, 440, { size: 110 }), tx(b, 1400, 312 + i * 240, 440, { color: LM, size: 30 })]),
      ], "This is the number. 48 million in new bookings, 22% up on last year, with 12 more reps to help carry it."],
      [CH, [
        R(1250, -300, 1200, 1700, LM, { rot: 15, name: "Diagonal panel" }),
        ...slash(1080, -40, 1160, GY),
        hd("Let's go\nget it.", 110, 220, 1000, { size: 200, lh: 0.9 }),
        lab("QUESTIONS & RESOURCES", 120, 680, 900),
        tx("Sales ops: ops@northwind.example\nSlides: hub.northwind.example/sko27\nAwards night: Day 2, 19:00, Rooftop Hall", 120, 730, 860, { color: WHITE, size: 32, lh: 1.6 }),
        T("FY27", 1430, 440, 420, { family: "sans", bold: true, italic: true, size: 160, color: CH, lh: 1 }),
      ], "Close loud. Point people to the hub for slides and recordings, and remind them about the awards night."],
    ];
  });

  /* 5 ─ Circular orbit · science fair ───────────────────────────────────────────────── */
  deck("orbit-science-fair-dk2", "Orbit science fair project", P169, "science fair project experiment school student plants light phototropism orbit", (W, H) => {
    const BG = "#eef3ff", NAV = "#14213d", ORB = "#9fb4e0", COR = "#ff6b4a", YEL = "#ffc93c", TQ = "#2ec4b6", MUT = "#4a5878", DR = "#3b4f7a";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 84, color: NAV, lh: 1.05, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 32, color: MUT, lh: 1.45, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", bold: true, size: 22, color: COR, ls: 2, ...o });
    const planet = (cx, cy, r, c) => C(cx - r, cy - r, 2 * r, 2 * r, c, { name: "Planet" });
    const at = (cx, cy, r, deg) => [Math.round(cx + r * Math.cos((deg * Math.PI) / 180)), Math.round(cy + r * Math.sin((deg * Math.PI) / 180))];
    const top = (l, h, w = 1400) => [lab(l, 120, 100, 1200), hd(h, 120, 140, w)];
    return [
      [BG, [
        ring(1500, 540, 260, ORB, 4), ring(1500, 540, 400, ORB, 4), ring(1500, 540, 560, ORB, 4, { op: 0.6 }),
        F(1340, 380, 320, 320, { shape: "circle", name: "Photo" }),
        planet(...at(1500, 540, 260, -50), 30, COR), planet(...at(1500, 540, 400, 205), 24, YEL), planet(...at(1500, 540, 400, 60), 40, TQ), planet(...at(1500, 540, 560, 160), 20, COR),
        lab("GRADE 8 SCIENCE FAIR  ·  TABLE 12", 120, 210, 820),
        hd("Do plants\nchase the\nlight?", 120, 260, 820, { size: 120, lh: 1.0 }),
        tx("A phototropism experiment with 24 bean sprouts", 120, 640, 760, { size: 36, color: NAV }),
        tx("Lina Ortega & Kai Brennan  ·  Mentor: Mr. Adeyemi", 120, 790, 800, { size: 28 }),
      ], "Hi, we're Lina and Kai. Our question was simple: do plants really grow towards light, and how fast? The photo in the middle is our light box."],
      [BG, [
        planet(-200, 540, 300, YEL),
        ring(-200, 540, 700, ORB, 4), ring(-200, 540, 520, ORB, 3, { op: 0.6 }),
        ...["Question", "Hypothesis", "Experiment", "Results", "What we learned"].flatMap((s, i) => {
          const [x, y] = at(-200, 540, 700, -36 + i * 18), c = [COR, YEL, TQ, COR, YEL][i];
          return [planet(x, y, 42, c), vmid(T(String(i + 1), x - 42, 0, 84, { family: "sans", bold: true, size: 36, color: NAV, align: "center" }), y - 42, 84), vmid(hd(s, x + 70, 0, 620, { size: 50 }), y - 42, 84)];
        }),
        lab("TODAY'S ORBIT", 1280, 400, 520),
        hd("Five stops,\nten minutes", 1280, 440, 560, { size: 76 }),
        tx("Ask us questions at any stop.", 1280, 630, 520),
      ], "Our talk follows the scientific method: question, hypothesis, experiment, results and what we learned."],
      [NAV, [
        ring(1400, 540, 220, DR, 4), ring(1400, 540, 360, DR, 4), ring(1400, 540, 500, DR, 4),
        planet(1400, 540, 130, YEL), planet(...at(1400, 540, 360, -30), 36, COR), planet(...at(1400, 540, 500, 140), 28, TQ),
        lab("STEP 3", 120, 380, 600, { color: YEL }),
        hd("The\nexperiment", 120, 420, 860, { size: 130, color: WHITE }),
        tx("How we built the light box and measured each sprout.", 120, 720, 720, { color: "#b8c4e0" }),
      ], "Step three: the experiment itself. This is the part judges ask most about, so slow down here."],
      [BG, [
        ring(520, 560, 370, ORB, 4), ring(520, 560, 440, ORB, 2, { op: 0.5 }),
        F(220, 260, 600, 600, { shape: "circle", name: "Photo" }),
        planet(...at(520, 560, 370, -40), 30, COR), planet(...at(520, 560, 440, 130), 22, TQ),
        lab("HOW WE SET IT UP", 1020, 180, 780),
        hd("The light box", 1020, 220, 780),
        ...["Two shoe boxes lined with black card.", "One box lit through a side slot, one from the top.", "Twelve sprouts per box: same soil, same water.", "Photo and bend angle measured at 4 pm daily."].flatMap((s, i) => [planet(1050, 420 + i * 130, 30, [COR, YEL, TQ, COR][i]), vmid(T(String(i + 1), 1020, 0, 60, { family: "sans", bold: true, size: 28, color: NAV, align: "center" }), 390 + i * 130, 60), vmid(tx(s, 1110, 0, 700, { color: NAV }), 390 + i * 130, 60)]),
      ], "Swap in a photo of your own setup. Keep everything the same except the direction of the light: that is what makes it a fair test."],
      [BG, [
        ...top("RESULTS", "How far the sprouts bent", 1180),
        planet(1400, 180, 14, COR), tx("Light from the side", 1428, 158, 400, { size: 28, color: NAV }),
        planet(1400, 236, 14, TQ), tx("Light from above", 1428, 214, 400, { size: 28, color: NAV }),
        ...[10, 20, 30, 40, 50].flatMap((v) => [R(200, 900 - v * 10.4, 1520, 2, ORB, { op: 0.6, name: "Grid line" }), T(v + "°", 110, 900 - v * 10.4 - 14, 70, { family: "mono", size: 22, color: MUT, align: "right" })]),
        R(200, 898, 1520, 4, NAV, { name: "Baseline" }),
        ...[[5, 1], [14, 2], [27, 2], [38, 3], [46, 3]].flatMap(([a, b], i) => {
          const gx = 360 + i * 300, ha = Math.max(24, Math.round(a * 10.4)), hb = Math.max(24, Math.round(b * 10.4));
          return [R(gx - 100, 900 - ha, 90, ha, COR, { radius: 45, name: "Side light bar" }), R(gx + 10, 900 - hb, 90, hb, TQ, { radius: 45, name: "Top light bar" }), T(a + "°", gx - 105, 900 - ha - 44, 100, { family: "mono", bold: true, size: 26, color: NAV, align: "center" }), T(b + "°", gx + 5, 900 - hb - 44, 100, { family: "mono", bold: true, size: 26, color: NAV, align: "center" }), T("DAY " + (i + 1), gx - 100, 922, 200, { family: "mono", bold: true, size: 22, color: MUT, align: "center" })];
        }),
      ], "The coral bars are side-lit sprouts, the teal bars top-lit. By day five the side-lit ones leaned 46 degrees; the others stayed almost upright."],
      [BG, [
        ...top("FIVE DAYS IN THE BOX", "What happened each day"),
        C(200, 520, 1520, 480, "none", { stroke: ORB, sw: 4, name: "Orbit" }),
        ...[["DAY 1", "Setup", "All sprouts upright, 3 cm tall."], ["DAY 2", "First lean", "Side-lit sprouts tilt by 4 pm."], ["DAY 3", "Clear curve", "Stems bend about 27°."], ["DAY 4", "Racing", "Top-lit ones only grow taller."], ["DAY 5", "Final count", "Average bend 46° towards the slot."]].flatMap(([d, t, s], i) => {
          const a = ([200, 235, 270, 305, 340][i] * Math.PI) / 180, x = Math.round(960 + 760 * Math.cos(a)), y = Math.round(760 + 240 * Math.sin(a));
          return [ring(x, y, 30, NAV, 3), planet(x, y, 20, [COR, YEL, TQ, COR, YEL][i]), ...flow(y - 214, lab(d, x - 135, 0, 270, { align: "center" }), 6, hd(t, x - 135, 0, 270, { size: 40, align: "center" }), 6, tx(s, x - 135, 0, 270, { size: 26, align: "center", lh: 1.3 }))];
        }),
        tx("Side-lit sprouts bent a little more every day. Top-lit sprouts just grew taller.", 560, 820, 800, { align: "center", color: NAV, bold: true, size: 34 }),
      ], "Day by day. The key moment is day two, when the lean first showed up after only one afternoon."],
      [BG, [
        ...top("MISSION CREW", "Who did what"),
        ...[["Lina Ortega", "Lead scientist", "Built the light box and kept the lab log."], ["Kai Brennan", "Data and charts", "Measured every angle with a protractor app."], ["Mr. Adeyemi", "Mentor", "Science teacher, Room 12."]].flatMap(([n, r, s], i) => {
          const cx = 400 + i * 560;
          return [ring(cx, 500, 210, ORB, 4), member(CAST, F(cx - 170, 330, 340, 340, { shape: "circle", name: "Portrait" }), n, r, { base: KIND.student }), planet(...at(cx, 500, 210, -45), 22, [COR, YEL, TQ][i]), T(n, cx - 240, 750, 480, { family: "sans", bold: true, size: 44, color: NAV, align: "center" }), lab(r.toUpperCase(), cx - 240, 812, 480, { align: "center" }), tx(s, cx - 220, 852, 440, { size: 28, align: "center" })];
        }),
      ], "Introduce the team and our mentor. Mention who did which job; judges like to know."],
      [BG, [
        ring(960, 540, 430, ORB, 4), ring(960, 540, 520, ORB, 3, { op: 0.6 }), ring(960, 540, 610, ORB, 2, { op: 0.35 }),
        planet(...at(960, 540, 520, -40), 28, COR), planet(...at(960, 540, 520, 190), 20, TQ), planet(...at(960, 540, 610, 20), 34, YEL),
        T("“", 860, 240, 200, { family: "sans", bold: true, size: 200, color: COR, align: "center", lh: 0.8 }),
        hd("We expected the sprouts to lean. We did not expect them to turn in a single afternoon.", 580, 420, 760, { size: 52, align: "center", lh: 1.25 }),
        lab("LINA, LAB NOTEBOOK, DAY 2", 580, 730, 760, { align: "center" }),
      ], "A line from our lab notebook. It's the moment we knew the experiment was working."],
      [BG, [
        ...top("BY THE NUMBERS", "Our experiment in three numbers"),
        ...[["46°", "biggest average bend, day 5", 330, COR], ["24", "bean sprouts tested", 260, YEL], ["5", "days of measuring", 220, TQ]].flatMap(([n, l, d, c], i) => {
          const cx = 400 + i * 560, cy = 590;
          return [ring(cx, cy, d / 2 + 30, ORB, 3), C(cx - d / 2, cy - d / 2, d, d, c, { name: "Planet" }), vmid(T(n, cx - d / 2, 0, d, { family: "sans", bold: true, size: 100, color: NAV, align: "center" }), cy - d / 2, d), tx(l, cx - 220, cy + d / 2 + 50, 440, { align: "center", bold: true, color: NAV })];
        }),
      ], "Three numbers to remember. The planet sizes match how big each number feels, not their value."],
      [NAV, [
        ring(1920, 1080, 400, DR, 4), ring(1920, 1080, 600, DR, 4), ring(1920, 1080, 800, DR, 4),
        planet(1920, 1080, 260, YEL),
        planet(...at(1920, 1080, 600, -150), 30, COR), planet(...at(1920, 1080, 800, -120), 36, TQ), planet(...at(1920, 1080, 400, -170), 18, COR),
        lab("THANK YOU", 120, 160, 600, { color: YEL }),
        hd("Thanks for visiting\nour orbit!", 120, 200, 1100, { size: 110, color: WHITE }),
        tx("Questions? Ask us anything at table 12.\nlina.kai.science@school.example", 120, 520, 900, { color: "#b8c4e0", size: 34 }),
      ], "Thank the judges and visitors, and invite questions. Have the real sprouts on the table to show."],
    ];
  });

  /* 6 ─ Polaroid scrapbook · travel itinerary ─────────────────────────────────────────── */
  deck("scrapbook-travel-itinerary-dk2", "Polaroid scrapbook travel itinerary", P169, "travel itinerary trip plan holiday vacation lisbon porto portugal scrapbook polaroid", (W, H) => {
    const KR = "#e9dcc4", INK = "#2b2420", RED = "#c8402f", BLU = "#2f5d8a", PAPER = "#fffdf7", RULE = "#b9cde3";
    const TAPES = ["#f3e39a", "#f2b8c6", "#bfe3cf", "#bcd3ee"];
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "serif", bold: true, size: 84, color: INK, lh: 1.05, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", size: 30, color: INK, lh: 1.45, ...o });
    const hand = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "cambria", italic: true, size: 32, color: BLU, lh: 1.3, ...o });
    const stamp = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", bold: true, size: 22, color: RED, ls: 3, ...o });
    const turn = (ox, oy, d) => { const a = (d * Math.PI) / 180; return [ox * Math.cos(a) - oy * Math.sin(a), ox * Math.sin(a) + oy * Math.cos(a)]; };
    // Polaroid card (w × 1.18w) with a square photo, a caption strip and washi tape, all turned by deg.
    const polaroid = (x, y, w, deg, caption = "", tape = 0) => {
      const h = Math.round(w * 1.18), m = Math.round(w * 0.06), fw = w - 2 * m, cx = x + w / 2, cy = y + h / 2;
      const [fx, fy] = turn(0, -h / 2 + m + fw / 2, deg), [qx, qy] = turn(0, h / 2 - (h - m - fw) / 2, deg), [ux, uy] = turn(0, -h / 2, deg);
      const out = [R(x + 8, y + 12, w, h, "#000000", { op: 0.14, rot: deg, name: "Polaroid shadow" }), R(x, y, w, h, PAPER, { rot: deg, name: "Polaroid" }), F(cx + fx - fw / 2, cy + fy - fw / 2, fw, fw, { name: "Photo", rot: deg })];
      if (caption) { const cap = hand(caption, 0, 0, fw, { size: Math.max(18, Math.round(w * 0.072)), align: "center", color: INK, rot: deg }); cap.x = Math.round(cx + qx - fw / 2); cap.y = Math.round(cy + qy - cap.h / 2); out.push(cap); }
      const tw = Math.round(w * 0.4), th = Math.round(w * 0.1);
      out.push(R(cx + ux - tw / 2, cy + uy - th / 2, tw, th, TAPES[tape % 4], { rot: deg - 4, op: 0.85, name: "Washi tape" }));
      return out;
    };
    const top = (h, s) => [hd(h, 140, 100, 1200, { size: 76 }), hand(s, 140, 196, 1000)];
    return [
      [KR, [
        ...polaroid(1010, 80, 400, -6, "Alfama rooftops", 0),
        ...polaroid(1460, 150, 360, 5, "Pastéis de nata!", 1),
        ...polaroid(1220, 620, 340, -3, "Ribeira, Porto", 2),
        R(120, 150, 440, 64, "none", { stroke: RED, sw: 4, radius: 6, name: "Stamp box" }),
        vmid(stamp("TRIP PLAN · MAY 2027", 120, 0, 440, { align: "center" }), 150, 64),
        hd("Lisbon\n& Porto", 120, 260, 840, { size: 150, lh: 0.98 }),
        hand("Seven days, two cities and one very slow train", 120, 590, 760, { size: 40 }),
        R(128, 772, 620, 150, "#000000", { op: 0.12, name: "Ticket shadow" }),
        R(120, 760, 620, 150, PAPER, { radius: 10, name: "Ticket" }),
        C(104, 819, 32, 32, KR, { name: "Ticket notch" }), C(724, 819, 32, 32, KR, { name: "Ticket notch" }),
        ...grid(560, 776, 1, 6, 22, 8, KR),
        stamp("DATES", 150, 784, 300), hd("12–18 May", 150, 816, 380, { size: 50 }),
        stamp("ROUTE", 590, 784, 130), tx("LIS > OPO", 590, 826, 140, { size: 26, bold: true }),
      ], "Our itinerary for the Portugal trip. Everything in here is a plan, not a promise: we'll keep a day free for rain or good food."],
      [KR, [
        R(132, 134, 1000, 840, "#000000", { op: 0.12, name: "Paper shadow" }),
        R(120, 120, 1000, 840, PAPER, { name: "Note paper" }),
        ...[0, 1, 2, 3, 4, 5, 6].map((i) => R(120, 290 + i * 104, 1000, 2, RULE, { name: "Ruled line" })),
        R(232, 120, 3, 840, RED, { op: 0.5, name: "Margin line" }),
        R(520, 100, 200, 44, TAPES[1], { rot: -3, op: 0.85, name: "Washi tape" }),
        hd("The plan", 270, 160, 800, { size: 76 }),
        ...[["DAYS 1–3", "Lisbon: Alfama, Belém, LX Factory"], ["DAY 4", "Day trip to Sintra"], ["DAY 5", "Train north to Porto"], ["DAY 6", "Porto: Ribeira and port cellars"], ["DAY 7", "Douro valley, then fly home"]].flatMap(([d, s], i) => {
          const y = 290 + i * 104;
          return [stamp(d, 270, y + 50, 190, { size: 20 }), hand(s, 470, y + 40, 630, { size: 36, color: INK })];
        }),
        hand("Don't forget: passports, plug adapters, comfy shoes!", 270, 820, 820, { size: 32, color: RED }),
        ...polaroid(1260, 200, 480, 4, "Our route, sort of", 2),
        ring(1620, 900, 90, RED, 4, { name: "Postmark" }), ring(1620, 900, 74, RED, 2, { name: "Postmark" }),
        stamp("LISBOA\n2027", 1550, 872, 140, { align: "center", size: 20 }),
      ], "The whole week on one page. Days one to three in Lisbon, a day in Sintra, then the train north to Porto."],
      [BLU, [
        R(-100, 300, 2120, 460, PAPER, { rot: -3, name: "Paper band" }),
        R(140, 270, 160, 50, TAPES[0], { rot: -8, op: 0.9, name: "Washi tape" }),
        ...polaroid(1380, 200, 380, 7, "Tram 28", 3),
        stamp("PART 1", 160, 410, 400),
        hd("Lisbon", 160, 450, 900, { size: 160, lh: 1 }),
        hand("Days 1–3: hills, trams and custard tarts", 160, 630, 900, { size: 40 }),
      ], "Part one: Lisbon. Three days, mostly on foot, so bring good shoes."],
      [KR, [
        ...polaroid(140, 120, 640, -3, "Miradouro da Graça at sunset", 0),
        stamp("DAY 1 · MON 12 MAY", 940, 150, 860),
        hd("Alfama and the old tram", 940, 190, 860, { size: 76 }),
        ...[["09:00", "Coffee and a pastel de nata at the corner bakery"], ["10:30", "Walk up to the castle, Castelo de São Jorge"], ["13:00", "Grilled sardines for lunch in Alfama"], ["15:00", "Ride Tram 28 up to Graça"], ["19:30", "Sunset at the miradouro, then fado"]].flatMap(([t, s], i) => {
          const y = 400 + i * 92;
          return [stamp(t, 940, y + 6, 120, { ls: 1 }), tx(s, 1080, y, 760, { size: 30 }), R(940, y + 74, 880, 2, "#cdbb9c", { name: "Rule" })];
        }),
        hand("Tip: a 24-hour card covers the trams and the castle bus.", 940, 880, 880, { color: RED }),
      ], "Day one in detail. Times are rough; the only fixed thing is sunset at the miradouro."],
      [KR, [
        ...top("Where the money goes", "Daily budget per person, in euros"),
        ...[["Stays", 95], ["Food", 55], ["Trains & trams", 18], ["Museums", 14], ["Pastries", 6]].flatMap(([c, v], i) => {
          const y = 330 + i * 130, len = Math.round((v / 95) * 1060);
          return [vmid(hand(c, 140, 0, 330, { size: 38, color: INK }), y, 76), R(500, y, len, 76, TAPES[i % 4], { rot: i % 2 ? 0.6 : -0.6, name: c + " tape" }), vmid(T("€" + v, 500 + len + 30, 0, 200, { family: "serif", bold: true, size: 44, color: INK }), y, 76)];
        }),
        R(1470, 650, 300, 280, "#000000", { op: 0.12, rot: 3, name: "Note shadow" }),
        R(1460, 640, 300, 280, "#f7e17c", { rot: 3, name: "Sticky note" }),
        (() => { const n = hand("Total:\nabout €188\na day each", 0, 0, 260, { size: 36, align: "center", color: INK, rot: 3 }); n.x = 1480; n.y = Math.round(780 - n.h / 2); return n; })(),
      ], "Stays are half the budget. Pastries are a small number on paper and a big number in our hearts."],
      [KR, [
        ...top("Day by day", "Seven days, 312 km by train"),
        ...dotted([[160, 560], [1760, 560]], 24, 10, RED, { op: 0.7 }),
        ...[["MON", "Alfama"], ["TUE", "Belém"], ["WED", "LX Factory"], ["THU", "Sintra"], ["FRI", "Train to Porto"], ["SAT", "Ribeira"], ["SUN", "Douro valley"]].flatMap(([d, p], i) => {
          const x = 140 + i * 240, up = i % 2 === 0, y = up ? 340 : 610, cx = x + 120;
          return [
            R(x + 18, y + 8, 220, 180, "#000000", { op: 0.1, name: "Card shadow" }), R(x + 10, y, 220, 180, PAPER, { name: "Day card" }),
            R(cx - 44, y - 14, 88, 28, TAPES[i % 4], { rot: up ? -5 : 5, op: 0.85, name: "Washi tape" }),
            stamp(d, x + 10, y + 30, 220, { align: "center", size: 24 }), hand(p, x + 20, y + 72, 200, { size: 34, align: "center", color: INK }),
            C(cx - 22, 538, 44, 44, RED, { name: "Day dot" }), vmid(T(String(i + 1), cx - 22, 0, 44, { family: "sans", bold: true, size: 22, color: WHITE, align: "center" }), 538, 44),
          ];
        }),
        hand("Keep Thursday flexible in case of rain.", 140, 880, 1000, { color: RED }),
      ], "Seven days at a glance, alternating above and below the route line. Thursday is our weather backup day."],
      [KR, [
        ...top("Travel crew", "Four friends, one shared folder"),
        ...[["Inês", "NAVIGATOR", "Knows every bakery"], ["Tom", "TICKETS", "Holds the train passes"], ["Ama", "PHOTOS", "Fills the shared album"], ["Raj", "BUDGET", "Splits every bill"]].flatMap(([n, r, s], i) => {
          const x = 140 + i * 430;
          return [...polaroid(x, 290, 360, [-4, 3, -2, 5][i], n, i), stamp(r, x, 770, 360, { align: "center", size: 24 }), hand(s, x, 810, 360, { align: "center", size: 34 })];
        }),
      ], "Who's doing what. Ask Inês about food, Tom about tickets, Ama about photos and Raj about money."],
      [KR, [
        R(270, 292, 1400, 500, "#000000", { op: 0.12, name: "Ticket shadow" }),
        R(260, 280, 1400, 500, PAPER, { radius: 12, name: "Ticket" }),
        R(260, 280, 1400, 70, RED, { name: "Ticket band" }),
        C(236, 506, 48, 48, KR, { name: "Ticket notch" }), C(1636, 506, 48, 48, KR, { name: "Ticket notch" }),
        ...grid(1296, 372, 1, 15, 26, 8, KR),
        vmid(stamp("ADMIT ONE  ·  TRAM 28  ·  LISBOA", 300, 0, 900, { color: PAPER }), 280, 70),
        hand("“The tram climbs the hill so slowly that the lemon trees have time to wave at you.”", 330, 400, 920, { size: 50, color: INK }),
        stamp("OVERHEARD ON TRAM 28", 330, 690, 900),
        T("NO.\n028", 1340, 470, 280, { family: "mono", bold: true, size: 56, color: RED, align: "center" }),
      ], "A line we overheard on the tram in a previous trip. It sums up the pace we want: slow."],
      [KR, [
        ...top("The trip in numbers", "Everything we counted before we left"),
        ...[["7", "days"], ["2", "cities"], ["312", "km by train"], ["€1,480", "each, all in"]].flatMap(([n, l], i) => {
          const x = 140 + i * 430, c = [PAPER, TAPES[0], PAPER, TAPES[3]][i];
          return [R(x + 179, 250, 3, 110, INK, { name: "Tag string" }), R(x + 10, 352, 360, 520, "#000000", { op: 0.12, radius: 24, name: "Tag shadow" }), R(x, 340, 360, 520, c, { radius: 24, name: "Luggage tag" }), C(x + 160, 370, 40, 40, KR, { name: "Tag hole" }), ring(x + 180, 390, 26, INK, 3), T(n, x, 520, 360, { family: "serif", bold: true, size: 96, color: INK, align: "center" }), hand(l, x + 20, 680, 320, { size: 38, align: "center" })];
        }),
      ], "The trip in four numbers. The total covers flights, stays, trains and food, but not souvenirs."],
      [KR, [
        ...polaroid(1160, 120, 560, 4, "See you at the station!", 1),
        hd("Boa viagem!", 140, 220, 960, { size: 150 }),
        hand("Have a good trip! Everything else is in the shared folder.", 140, 420, 860, { size: 40 }),
        R(150, 632, 760, 220, "#000000", { op: 0.12, name: "Card shadow" }),
        R(140, 620, 760, 220, PAPER, { name: "Info card" }),
        tx("Folder: trips.example/lisbon-porto\nQuestions: Inês, +351 555 0162\nMeet: Gate 14, 06:40, Mon 12 May", 180, 650, 700, { lh: 1.6 }),
      ], "Boa viagem means have a good trip. Point everyone to the shared folder and the meeting point at the airport."],
    ];
  });

  /* 7 ─ Newspaper columns · history lesson (4:3) ──────────────────────────────────────── */
  deck("newspaper-history-lesson-dk2", "Newspaper history lesson", P43, "history lesson class school teacher printing press gutenberg europe newspaper", (W, H) => {
    const NP = "#f3efe4", INK = "#161616", GR = "#5f5a52", RED = "#8f1d1d", RL = "#bdb6a6";
    const M0 = 48, CW = W - 96, COL = (CW - 48) / 3;
    const cx = (i) => M0 + i * (COL + 24);
    const head = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "serif", bold: true, size: 44, color: INK, lh: 1.05, ...o });
    const body = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "cambria", size: 15, color: INK, lh: 1.45, align: "justify", ...o });
    const kick = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 12, color: RED, ls: 2, ...o });
    const mono = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", size: 11, color: GR, ...o });
    const masthead = (n, label) => [
      T("The History Herald", M0, 18, CW, { family: "serif", bold: true, size: 40, color: INK, align: "center" }),
      R(M0, 72, CW, 3, INK, { name: "Rule" }), R(M0, 78, CW, 1, INK, { name: "Rule" }),
      mono("YEAR 9 HISTORY", M0, 86, 300), mono(label, M0 + 314, 86, 300, { align: "center" }), mono("PAGE " + n, M0 + 628, 86, 300, { align: "right" }),
      R(M0, 104, CW, 1, INK, { name: "Rule" }),
      R(M0, 718, CW, 1, INK, { name: "Footer rule" }), mono("THE HISTORY HERALD  ·  LESSON 3: THE PRINTING PRESS", M0, 728, CW, { align: "center", size: 10 }),
    ];
    return [
      [NP, [
        mono("VOL. IX  ·  NO. 3", M0, 24, 300), mono("YEAR 9 HISTORY  ·  LESSON 3", M0 + 314, 24, 300, { align: "center" }), mono("PRICE: ONE GOOD QUESTION", M0 + 628, 24, 300, { align: "right" }),
        R(M0, 44, CW, 1, INK, { name: "Rule" }),
        T("The History Herald", M0, 52, CW, { family: "serif", bold: true, size: 76, color: INK, align: "center", lh: 1 }),
        R(M0, 138, CW, 4, INK, { name: "Rule" }), R(M0, 146, CW, 1, INK, { name: "Rule" }),
        kick("SPECIAL EDITION: THE PRINTING REVOLUTION", M0, 158, CW, { align: "center" }),
        head("How One Press Changed Europe", M0, 182, CW, { size: 50, align: "center" }),
        T("In the 1450s a goldsmith in Mainz built a machine that made books fast, cheap and identical. Europe would never read the same way again.", 110, 248, 804, { family: "cambria", italic: true, size: 18, color: GR, align: "center", lh: 1.35 }),
        R(M0, 312, CW, 1, INK, { name: "Rule" }),
        F(M0, 328, 2 * COL + 24, 300, { name: "Photo" }),
        mono("A reconstruction of a 15th-century press. Add a photo from your class trip.", M0, 634, 2 * COL + 24, { size: 10 }),
        R(cx(2) - 12, 328, 1, 318, RL, { name: "Column rule" }),
        ...flow(328, kick("FROM OUR REPORTER", cx(2), 0, COL), 8, head("A Scribe's Year, Done in a Week", cx(2), 0, COL, { size: 22 }), 10, body("Before printing, one Bible could take a scribe many months to copy by hand. Gutenberg's workshop set each page once in metal letters and then printed it again and again. Today we find out how it worked, who paid for it and why it mattered.", cx(2), 0, COL)),
        R(M0, 664, CW, 1, INK, { name: "Rule" }),
        mono("TEACHER: MS. RAHMAN  ·  ROOM B14  ·  BRING A NOTEBOOK AND A QUESTION", M0, 678, CW, { align: "center" }),
      ], "Today's lesson is laid out like a newspaper front page. Ask the class: what would a front page about the printing press have said in 1455?"],
      [NP, [
        ...masthead(2, "IN THIS EDITION"),
        head("In This Edition", M0, 124, 600, { size: 46 }),
        kick("TODAY'S LESSON, 50 MINUTES", M0, 182, 600),
        ...[["The machine", "How movable type worked", "p. 4"], ["Key dates", "From Mainz to the first newspaper", "p. 6"], ["The people", "Inventors, bankers and printers", "p. 7"], ["By the numbers", "Books, Bibles and pages per day", "p. 9"], ["Your homework", "A front page of your own", "p. 10"]].flatMap(([t, s, p], i) => {
          const y = 214 + i * 92;
          return [R(M0, y, 600, 1, INK, { name: "Rule" }), head(t, M0, y + 12, 460, { size: 28 }), body(s, M0, y + 50, 460, { align: "left", color: GR }), T(p, M0 + 480, y + 16, 120, { family: "serif", bold: true, italic: true, size: 26, color: RED, align: "right" })];
        }),
        R(M0, 674, 600, 1, INK, { name: "Rule" }),
        R(696, 124, 280, 556, "none", { stroke: INK, sw: 2, name: "Box" }),
        R(696, 124, 280, 40, INK, { name: "Box header" }),
        vmid(kick("LESSON GOALS", 696, 0, 280, { align: "center", color: NP }), 124, 40),
        body("By the end of today you can:\n\n1. Explain how movable type made printing faster.\n\n2. Name three people who spread the press.\n\n3. Give two ways printing changed ideas in Europe.", 716, 180, 240, { align: "left", size: 16 }),
        F(716, 452, 240, 208, { name: "Photo" }),
      ], "Run through the contents and the three lesson goals. Students should be able to tick all three off by the end."],
      [NP, [
        ...masthead(3, "SPECIAL REPORT"),
        R(M0, 150, CW, 56, RED, { name: "Banner" }),
        vmid(T("SPECIAL REPORT", M0, 0, CW, { family: "sans", bold: true, size: 26, color: NP, align: "center", ls: 8 }), 150, 56),
        kick("PART ONE", M0, 246, CW, { align: "center" }),
        head("The Machine That\nCopied the World", M0, 270, CW, { size: 76, align: "center", lh: 1.0 }),
        R(380, 448, 264, 2, INK, { name: "Rule" }),
        T("Mainz, around 1450", M0, 466, CW, { family: "cambria", italic: true, size: 24, color: GR, align: "center" }),
        body("Gutenberg did not invent printing: woodblock printing was centuries old in East Asia, and movable type had been used in China and Korea. His breakthrough was a full system that worked with the Latin alphabet.", M0, 540, 440),
        R(M0 + 464, 540, 1, 150, RL, { name: "Column rule" }),
        body("Watch for three parts of that system on the next page: the metal type, the ink and the press itself. Each one solved a different problem.", M0 + 488, 540, 440),
      ], "Section one: the machine. Point out that movable type existed in China and Korea first; Gutenberg's achievement was the complete system."],
      [NP, [
        ...masthead(4, "THE MACHINE"),
        kick("HOW IT WORKED", M0, 122, CW),
        head("Metal Letters, Oily Ink and a Screw Press", M0, 140, CW, { size: 38 }),
        R(M0, 194, CW, 1, INK, { name: "Rule" }),
        ...flow(210, body("Before the press, every book in Europe was copied by hand. Gutenberg, a goldsmith, brought three ideas together: letters cast in metal that could be used again and again, an oil-based ink that stuck to metal, and a screw press like the ones used for wine and paper.", cx(0), 0, COL), 14, head("Why it mattered", cx(0), 0, COL, { size: 22 }), 6, body("Once a page was set, a print shop could make hundreds of identical copies. A mistake was fixed once, not in every copy, and books grew cheaper every decade.", cx(0), 0, COL)),
        R(cx(1) - 12, 210, 1, 490, RL, { name: "Column rule" }),
        F(cx(1), 210, 2 * COL + 24, 290, { name: "Photo" }),
        mono("Drop in a diagram or photo of movable type.", cx(1), 506, 2 * COL + 24, { size: 10 }),
        body("The letters were set one by one in a frame, inked, pressed onto damp paper and then taken apart for the next page.", cx(1), 534, COL),
        R(cx(2) - 12, 534, 1, 166, RL, { name: "Column rule" }),
        body("Gutenberg's workshop finished its famous Bible around 1455. Fewer than fifty copies survive today.", cx(2), 534, COL),
      ], "Walk through the three parts: type, ink and press. Ask why reusable metal letters were such a big deal compared with carved wooden blocks."],
      [NP, [
        ...masthead(5, "BY THE NUMBERS"),
        kick("INFOGRAPHIC", M0, 122, CW),
        head("A Flood of Books", M0, 140, CW, { size: 40 }),
        T("Books printed in Western Europe per century, in millions (rounded estimates)", M0, 190, CW, { family: "cambria", italic: true, size: 17, color: GR }),
        R(M0, 222, CW, 1, INK, { name: "Rule" }),
        ...[["1454–1500", 13], ["1500s", 217], ["1600s", 533], ["1700s", 1000]].flatMap(([c, v], i) => {
          const y = 256 + i * 100, len = Math.max(6, Math.round((v / 1000) * 540));
          return [vmid(T(c, M0, 0, 180, { family: "serif", bold: true, size: 22, color: INK }), y, 52), R(250, y, len, 52, i === 3 ? RED : INK, { name: c + " bar" }), vmid(T((v >= 1000 ? "1,000" : v) + " million", 250 + len + 14, 0, 180, { family: "serif", bold: true, size: 18, color: i === 3 ? RED : INK }), y, 52), R(M0, y + 76, CW, 1, RL, { name: "Rule" })];
        }),
        mono("Figures are rounded estimates from economic historians. Swap in the numbers from your textbook if they differ.", M0, 664, CW, { size: 11 }),
      ], "The numbers are rounded estimates, but the shape is what matters: output grew roughly tenfold every century. Ask students what might have caused each jump."],
      [NP, [
        ...masthead(6, "KEY DATES"),
        kick("TIMELINE", M0, 122, 600),
        head("Seventy Years That Changed Reading", M0, 140, 600, { size: 32 }),
        R(M0 + 120, 226, 2, 460, INK, { name: "Timeline rule" }),
        ...[["c. 1440", "Gutenberg experiments with metal type in Strasbourg."], ["c. 1455", "The Gutenberg Bible is finished in Mainz."], ["1476", "William Caxton opens the first press in England, at Westminster."], ["1500", "Print shops are now open in hundreds of European towns."], ["1517", "Luther's 95 Theses spread across Germany in weeks, thanks to print."], ["1605", "The first printed weekly newspaper appears in Strasbourg."]].flatMap(([d, s], i) => {
          const y = 232 + i * 76;
          return [T(d, M0, y, 104, { family: "serif", bold: true, size: 20, color: RED, align: "right" }), C(M0 + 113, y + 6, 16, 16, INK, { name: "Date dot" }), body(s, M0 + 144, y, 456, { align: "left", size: 16 })];
        }),
        F(696, 140, 280, 380, { name: "Photo" }),
        mono("A page of the Gutenberg Bible. Add a picture here.", 696, 526, 280, { size: 10 }),
        R(696, 572, 280, 112, "none", { stroke: INK, sw: 1.5, name: "Box" }),
        kick("DID YOU KNOW?", 712, 584, 248),
        body("The first newspapers were weekly, not daily.", 712, 604, 248, { align: "left", size: 15 }),
      ], "From experiments in Strasbourg to the first newspaper in 1605. Stress the speed: Luther's ideas travelled in weeks, not years."],
      [NP, [
        ...masthead(7, "THE PEOPLE"),
        kick("WHO'S WHO", M0, 122, CW),
        head("The People Behind the Press", M0, 140, CW, { size: 40 }),
        R(M0, 196, CW, 1, INK, { name: "Rule" }),
        ...[["Johannes Gutenberg", "INVENTOR", "Goldsmith from Mainz who built Europe's first movable-type press."], ["Johann Fust", "FINANCIER", "Lent Gutenberg money for the workshop, then took it over after a lawsuit."], ["Peter Schöffer", "PRINTER", "Gutenberg's assistant; later ran the press with Fust and printed in colour."], ["William Caxton", "MERCHANT & PRINTER", "Brought printing to England and printed The Canterbury Tales."]].flatMap(([n, r, s], i) => {
          const x = M0 + i * 238;
          return [member(CAST, F(x, 214, 214, 260, { name: "Portrait" }), n, r, { kind: "senior elderly man portrait", sex: "m" }), head(n, x, 488, 214, { size: 20 }), kick(r, x, 516, 214), body(s, x, 538, 214, { align: "left", size: 14 })];
        }),
      ], "Four people, four roles. Money mattered as much as invention: Fust's loan made the workshop possible."],
      [NP, [
        ...masthead(8, "OPINION"),
        R(M0, 196, CW, 4, INK, { name: "Rule" }),
        T("“", 64, 214, 110, { family: "serif", bold: true, size: 160, color: RED, lh: 0.8 }),
        T("A book that once took a scribe a year to copy could now be printed in hundreds of copies in a few months.", 190, 250, 760, { family: "serif", italic: true, size: 40, color: INK, lh: 1.25 }),
        kick("OUR LESSON IN ONE SENTENCE", 190, 430, 600),
        R(M0, 470, CW, 4, INK, { name: "Rule" }),
        kick("DISCUSS WITH YOUR PARTNER", M0, 510, CW),
        body("Who gained from cheaper books? Who might have lost out? Write one answer for each before we share with the class.", M0, 532, 600, { align: "left", size: 18 }),
      ], "The one sentence to remember. Then give pairs three minutes on winners and losers of the printing revolution."],
      [NP, [
        ...masthead(9, "BY THE NUMBERS"),
        head("By the Numbers", M0, 124, CW, { size: 46, align: "center" }),
        ...[["c. 180", "GUTENBERG BIBLES", "Copies printed in Mainz around 1455."], ["49", "STILL SURVIVE", "Known copies today, complete or in part."], ["3,600", "PAGES A DAY", "What one press could print in a working day. A scribe managed a few."]].flatMap(([n, l, s], i) => {
          const x = cx(i);
          return [R(x, 210, COL, 340, "none", { stroke: INK, sw: 2, name: "Box" }), R(x, 210, COL, 8, i === 1 ? RED : INK, { name: "Box top" }), T(n, x, 250, COL, { family: "serif", bold: true, size: 80, color: i === 1 ? RED : INK, align: "center" }), kick(l, x, 360, COL, { align: "center", color: INK }), body(s, x + 24, 392, COL - 48, { align: "center", size: 17 })];
        }),
        R(M0, 590, CW, 1, INK, { name: "Rule" }),
        body("These numbers are the estimates historians use. They help us compare, not count exactly.", M0, 604, CW, { align: "left", italic: true, color: GR }),
      ], "Three numbers. The contrast between 3,600 pages a day and a scribe's few pages is the heart of the lesson."],
      [NP, [
        ...masthead(10, "CLASSIFIEDS"),
        head("Homework & Questions", M0, 124, CW, { size: 46, align: "center" }),
        R(M0, 186, CW, 1, INK, { name: "Rule" }),
        ...[["WANTED", "Your own front page about the printing press: one headline, one picture and two short articles. Due Friday."], ["FOUND", "Three great questions from today's class. Bring yours on a sticky note to the next lesson."], ["CONTACT", "Ms. Rahman\nRoom B14\nhistory@school.example\nHelp desk: Tuesdays, 1:00 pm"]].flatMap(([t, s], i) => {
          const x = cx(i);
          return [R(x, 206, COL, 240, "none", { stroke: INK, sw: 1.5, name: "Ad box" }), head(t, x + 18, 224, COL - 36, { size: 30 }), R(x + 18, 266, 60, 3, RED, { name: "Rule" }), body(s, x + 18, 284, COL - 36, { align: "left", size: 17 })];
        }),
        R(M0, 480, CW, 4, INK, { name: "Rule" }), R(M0, 488, CW, 1, INK, { name: "Rule" }),
        T("Thank you for reading.", M0, 530, CW, { family: "serif", italic: true, size: 52, color: INK, align: "center" }),
        mono("LATE EDITION  ·  QUESTIONS WELCOME AT ANY TIME", M0, 612, CW, { align: "center", size: 12 }),
      ], "Set the homework and remind students where to find you. Collect sticky-note questions on the way out."],
    ];
  });

  /* 8 ─ Chalkboard · course syllabus (4:3) ─────────────────────────────────────────────── */
  deck("chalkboard-course-syllabus-dk2", "Chalkboard course syllabus", P43, "course syllabus class university college statistics semester schedule teacher chalkboard", (W, H) => {
    const BD = "#2e4a3b", WOOD = "#8a5a33", CK = "#f1f1e8", CY = "#f6e07a", CP = "#f3a6b8", CB = "#9fd2ef", DIM = "#b9c6b8";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 44, color: CK, lh: 1.1, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 22, color: CK, lh: 1.45, ...o });
    const note = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "cambria", italic: true, size: 22, color: CY, lh: 1.3, ...o });
    const under = (x, y, w, c = CY) => R(x, y, w, 4, c, { rot: -1, op: 0.85, radius: 2, name: "Chalk underline" });
    const board = () => [
      C(120, 70, 560, 240, CK, { op: 0.035, name: "Chalk dust" }), C(520, 400, 460, 260, CK, { op: 0.03, name: "Chalk dust" }),
      R(0, 0, W, H, "none", { stroke: WOOD, sw: 24, name: "Wood frame" }),
      R(12, H - 32, W - 24, 20, "#6d4425", { name: "Chalk tray" }),
      R(90, H - 40, 70, 10, CK, { radius: 4, name: "Chalk" }), R(180, H - 39, 44, 9, CY, { radius: 4, name: "Chalk" }),
    ];
    const title = (s, w) => [hd(s, 64, 52, 880), under(64, 108, w)];
    return [
      [BD, [
        ...board(),
        note("Spring 2027  ·  STAT 101", 64, 70, 600, { size: 26 }),
        hd("Intro to\nStatistics", 64, 112, 560, { size: 72, lh: 1.0 }),
        under(64, 272, 380),
        tx("Dr. Elena Park\nMon & Wed, 10:00–11:15  ·  Hall C", 64, 300, 520),
        ...Array.from({ length: 41 }, (_, i) => { const z = -3 + i * 0.15; return C(760 + z * 70 - 4, 470 - 220 * Math.exp(-(z * z) / 2) - 4, 8, 8, CK, { name: "Curve dot" }); }),
        R(530, 474, 460, 3, CK, { op: 0.8, name: "Axis" }),
        ...[-1, 0, 1].map((s) => R(760 + s * 70 - 1, 466, 3, 18, CK, { name: "Tick" })),
        note("mean", 720, 492, 80, { align: "center", size: 18 }),
        note("the normal curve", 690, 214, 220, { align: "center", color: CP }),
        R(64, 560, 440, 110, "none", { stroke: CK, sw: 3, rot: -1, name: "Chalk box" }),
        vmid(note("Bring a calculator and a curious mind.", 84, 0, 400, { size: 24 }), 560, 110),
      ], "Welcome to STAT 101. The curve on the board is the normal curve: by week six you will know exactly why it shows up everywhere."],
      [BD, [
        ...board(),
        ...title("Today on the board", 420),
        ...["Welcome and introductions", "How this course works", "What is a variable?", "Mean, median and mode", "Practice: our class survey"].flatMap((s, i) => {
          const y = 160 + i * 84;
          return [R(70, y + 4, 36, 36, "none", { stroke: CK, sw: 3, rot: [-3, 2, -1, 3, -2][i], name: "Chalk box" }), i === 0 ? E("icon-check", 68, y - 2, 44, { c1: CY }) : null, tx(s, 130, y, 520, { size: 30 })];
        }),
        ring(840, 330, 110, CP, 4),
        T("?", 790, 255, 100, { family: "sans", bold: true, size: 120, color: CP, align: "center", lh: 1.1 }),
        note("Questions are always welcome.", 700, 470, 280, { align: "center" }),
      ], "Today's plan. We tick items off as we go; the class survey at the end gives us our first real data set."],
      [BD, [
        ...board(),
        note("Unit 1 of 4", 64, 210, 600, { size: 30 }),
        hd("Describing\ndata", 64, 260, 620, { size: 96, lh: 1.0 }),
        under(64, 470, 440, CP), under(80, 484, 360, CP),
        tx("Weeks 1–4: averages, spread and your first charts", 64, 520, 600, { color: DIM, size: 24 }),
        E("arrow-curved", 720, 170, 140, { c1: CY }),
        ...[90, 150, 120, 200].map((h, i) => R(730 + i * 60, 540 - h, 44, h, "none", { stroke: CK, sw: 3, rot: [-2, 1, -1, 2][i], name: "Chalk bar" })),
        R(716, 544, 250, 3, CK, { name: "Axis" }),
      ], "Unit one: describing data. Everything else in the course builds on these four weeks."],
      [BD, [
        ...board(),
        ...title("What you will learn", 400),
        ...["Summarise data with averages and spread", "Read and draw honest charts", "Use probability to reason about chance", "Test a claim with real data", "Explain results in plain English"].flatMap((s, i) => [T("–", 64, 152 + i * 72, 30, { family: "sans", bold: true, size: 26, color: CY }), tx(s, 98, 150 + i * 72, 480, { size: 26 })]),
        R(640, 150, 320, 380, "none", { stroke: CK, sw: 3, rot: 2, name: "Chalk outline" }),
        F(630, 140, 320, 380, { border: { width: 6, color: CK }, name: "Photo" }),
        R(740, 126, 100, 30, CY, { rot: -4, op: 0.7, name: "Tape" }),
        note("Last year's project: the campus coffee survey", 600, 556, 380, { size: 20, align: "center" }),
        tx("Prerequisite: none. Just the algebra you already know.", 64, 620, 520, { color: DIM, size: 20 }),
      ], "Five outcomes for the term. Point at the photo: last year's class surveyed 400 students about coffee, and the results made the campus paper."],
      [BD, [
        ...board(),
        ...title("How your grade is built", 460),
        R(100, 600, 840, 3, CK, { name: "Baseline" }),
        ...[["Homework", 20, CY], ["Quizzes", 15, CB], ["Project", 25, CP], ["Midterm", 15, CB], ["Final exam", 25, CY]].flatMap(([l, v, c], i) => {
          const x = 120 + i * 165, h = v * 16;
          return [R(x, 600 - h, 120, h, c, { op: 0.15, name: l + " fill" }), R(x, 600 - h, 120, h, "none", { stroke: c, sw: 4, rot: [-1, 1, -0.5, 1, -1][i], name: l + " bar" }), T(v + "%", x - 10, 600 - h - 46, 140, { family: "sans", bold: true, size: 32, color: c, align: "center" }), tx(l, x - 20, 614, 160, { align: "center", size: 22 })];
        }),
        note("Late work: 10% off per day, up to three days.", 100, 664, 820),
      ], "The project and the final are worth the most, a quarter each. Homework is 20%, and it is the best practice for both."],
      [BD, [
        ...board(),
        ...title("Semester at a glance", 420),
        R(120, 382, 784, 4, CK, { name: "Timeline" }),
        ...Array.from({ length: 15 }, (_, i) => [R(120 + i * 56 - 1, 374, 3, 20, CK, { op: 0.7, name: "Week tick" }), T(String(i + 1), 120 + i * 56 - 20, 400, 40, { family: "calibri", size: 16, color: DIM, align: "center" })]).flat(),
        ...[[1, "Course starts", CY], [5, "Quiz 1", CB], [8, "Midterm", CP], [12, "Project due", CY], [15, "Final exam", CP]].flatMap(([w, t, c], i) => {
          const x = 120 + (w - 1) * 56, up = i % 2 === 0;
          return [C(x - 14, 370, 28, 28, c, { name: "Event dot" }), note("Week " + w, x - 90, up ? 274 : 440, 180, { align: "center", size: 20, color: c }), hd(t, x - 90, up ? 304 : 470, 180, { size: 26, align: "center" })];
        }),
        note("Spring break is week 9: no class, no homework.", 120, 600, 780, { color: CK }),
      ], "Fifteen weeks, five dates to put in your calendar now. Week nine is spring break."],
      [BD, [
        ...board(),
        ...title("Teaching team", 300),
        ...[["Dr. Elena Park", "Lecturer", "Office hours: Tue 2–4 pm"], ["Sam Whitaker", "Teaching assistant", "Lab help: Thu 3–5 pm"], ["Aisha Bello", "Peer tutor", "Drop-in: Fri 11 am–1 pm"]].flatMap(([n, r, s], i) => {
          const cx = 200 + i * 312;
          return [ring(cx, 320, 110, [CY, CB, CP][i], 4), member(CAST, F(cx - 95, 225, 190, 190, { shape: "circle", name: "Portrait" }), n, r), hd(n, cx - 145, 452, 290, { size: 28, align: "center" }), note(r, cx - 145, 490, 290, { align: "center", size: 22 }), tx(s, cx - 145, 526, 290, { align: "center", size: 20, color: DIM })];
        }),
        note("Email any of us; we reply within one working day.", 64, 620, 896, { align: "center", color: CK, size: 24 }),
      ], "Three people you can ask for help. Sam runs the Thursday lab; Aisha is a student who took the course last year."],
      [BD, [
        ...board(),
        T("“", 70, 120, 100, { family: "cambria", bold: true, size: 160, color: CY, lh: 0.8 }),
        T("All models are wrong, but some are useful.", 180, 200, 760, { family: "cambria", italic: true, size: 58, color: CK, lh: 1.2 }),
        under(180, 360, 340, CP),
        note("George E. P. Box, statistician", 180, 390, 600, { size: 26 }),
        tx("Keep this in mind all term: a model is a tool for thinking, not the truth.", 180, 470, 700, { color: DIM }),
      ], "George Box's famous line. Come back to it whenever a result looks too neat."],
      [BD, [
        ...board(),
        ...title("This course by numbers", 440),
        ...[["28", "lectures", CY], ["10", "problem sets", CB], ["1", "real-data project", CP]].flatMap(([n, l, c], i) => {
          const cx = 200 + i * 312;
          return [ring(cx, 330, 120, c, 4), vmid(T(n, cx - 120, 0, 240, { family: "sans", bold: true, size: 96, color: c, align: "center" }), 210, 240), note(l, cx - 140, 476, 280, { align: "center", size: 28, color: CK })];
        }),
        tx("Problem sets are due Sundays at 11:59 pm.", 64, 600, 896, { color: DIM, align: "center" }),
      ], "The shape of the term in three numbers. The project uses a data set you choose yourself."],
      [BD, [
        ...board(),
        hd("See you Monday!", 64, 110, 760, { size: 72 }),
        under(64, 200, 520, CY),
        E("icon-mail", 860, 100, 90, { c1: CK }),
        ...[["Email", "e.park@uni.example"], ["Office", "Room 3.14, Maths Building"], ["Hours", "Tuesdays 2–4 pm, or by appointment"], ["Course page", "stat101.uni.example"]].flatMap(([l, v], i) => {
          const y = 270 + i * 72;
          return [note(l, 64, y + 4, 200, { size: 24 }), tx(v, 280, y, 680, { size: 28 })];
        }),
        note("Read chapter 1 before Monday.", 64, 590, 700, { color: CP, size: 26 }),
      ], "Contact details and the first reading. Remind everyone to join the course page today."],
    ];
  });

  /* 9 ─ Watercolour wash · cooking class ───────────────────────────────────────────────── */
  deck("watercolour-pasta-class-dk2", "Watercolour cooking class", P169, "recipe cooking class workshop pasta food kitchen chef menu watercolour", (W, H) => {
    const BG = "#fffaf4", PEA = "#f4a68c", SAG = "#9cc59a", LAV = "#c3aee6", BUT = "#f5d27a", BLU = "#a7c8e8", PLUM = "#4a2c3a", MUT = "#7d6470";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "serif", italic: true, size: 96, color: PLUM, lh: 1.05, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 32, color: PLUM, lh: 1.45, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", bold: true, size: 24, color: MUT, ls: 5, ...o });
    // Soft watercolour wash: three overlapping translucent ellipses.
    const wash = (cx, cy, r, c, k = 1) => [
      C(cx - r, cy - r * 0.8, 2 * r, 1.6 * r, c, { op: 0.32, name: "Wash" }),
      C(cx - r * 0.85 + 30 * k, cy - r * 0.9, 1.7 * r, 1.5 * r, c, { op: 0.28, rot: 20 * k, name: "Wash" }),
      C(cx - r * 1.05, cy - r * 0.55 + 20 * k, 1.9 * r, 1.2 * r, c, { op: 0.22, rot: -15 * k, name: "Wash" }),
    ];
    const dot = (cx, cy, r, c) => [C(cx - r, cy - r, 2 * r, 2 * r, c, { op: 0.45, name: "Wash dot" }), C(cx - r * 0.6, cy - r * 0.7, r * 1.3, r * 1.3, c, { op: 0.6, name: "Wash dot" })];
    return [
      [BG, [
        ...wash(1400, 540, 420, PEA), ...wash(1660, 260, 240, BUT, -1), ...wash(1160, 880, 220, SAG),
        F(1150, 230, 520, 620, { shape: "circle", name: "Photo" }),
        lab("OLIVE & THYME COOKERY SCHOOL", 140, 250, 900),
        hd("Fresh pasta\nby hand", 140, 300, 940, { size: 140 }),
        tx("A spring evening class: one dough, three shapes, two sauces", 140, 620, 760, { size: 36 }),
        lab("THURSDAY 17 APRIL  ·  6:00–8:30 PM", 140, 780, 900, { color: "#b4533a" }),
      ], "Welcome everyone, aprons on. Tonight we make one dough and turn it into three shapes, and we eat everything we make."],
      [BG, [
        ...wash(220, 280, 260, LAV), ...wash(1720, 820, 300, SAG, -1), ...wash(1760, 180, 160, BUT), ...wash(200, 900, 200, PEA, -1),
        lab("TONIGHT'S MENU", 460, 120, 1000, { align: "center" }),
        hd("Five courses of learning", 460, 160, 1000, { size: 84, align: "center" }),
        ...[["Welcome and the perfect dough", "6:00"], ["Rolling by hand", "6:30"], ["Three shapes to master", "7:00"], ["Two quick sauces", "7:40"], ["Dinner at the long table", "8:00"]].flatMap(([s, t], i) => {
          const y = 330 + i * 130;
          return [...dot(960, y - 18, 10, [PEA, BUT, SAG, LAV, BLU][i]), hd(s, 460, y, 1000, { size: 48, align: "center", lh: 1.15 }), lab(t, 460, y + 62, 1000, { align: "center", size: 22 })];
        }),
      ], "The evening in five steps, written like a menu. Dinner at the end is the reward, so keep an eye on the clock."],
      [BG, [
        ...wash(960, 540, 560, BLU), ...wash(700, 420, 300, LAV, -1), ...wash(1320, 700, 260, BUT),
        lab("COURSE TWO", 360, 330, 1200, { align: "center" }),
        hd("Shaping", 360, 370, 1200, { size: 200, align: "center" }),
        tx("Tagliatelle, ravioli and farfalle", 360, 620, 1200, { size: 40, align: "center" }),
      ], "Course two: shaping. This is the fun part, and the part where mistakes are still delicious."],
      [BG, [
        ...wash(520, 560, 380, BUT), ...wash(780, 900, 200, PEA, -1),
        F(240, 200, 560, 720, { shape: "circle", name: "Photo" }),
        lab("THE DOUGH", 960, 190, 860),
        hd("Just flour\nand eggs", 960, 230, 860, { size: 100 }),
        ...[["400 g", "tipo 00 flour"], ["4", "large eggs"], ["1 pinch", "fine salt"], ["1 tbsp", "olive oil, optional"]].flatMap(([a, b], i) => {
          const x = 960 + (i % 2) * 430, y = 490 + Math.floor(i / 2) * 110;
          return [...dot(x + 18, y + 26, 16, [PEA, BUT, SAG, LAV][i]), T(a, x + 50, y, 360, { family: "serif", italic: true, size: 44, color: PLUM }), tx(b, x + 50, y + 54, 360, { size: 26, color: MUT })];
        }),
        tx("Make a well, crack in the eggs, stir with a fork, then knead for ten minutes until smooth. Wrap and rest for thirty minutes.", 960, 760, 860),
      ], "The whole recipe fits on one slide. The only trick is patience: knead for the full ten minutes and let it rest."],
      [BG, [
        ...wash(1700, 200, 200, LAV),
        lab("TONIGHT'S TIMING", 140, 120, 900),
        hd("Where the time goes", 140, 160, 1200, { size: 84 }),
        ...[["Making the dough", 25, PEA], ["Resting & sauces", 30, BUT], ["Rolling & cutting", 40, SAG], ["Filling & shaping", 35, LAV], ["Cooking & eating", 20, BLU]].flatMap(([l, v, c], i) => {
          const y = 330 + i * 130, len = Math.round((v / 40) * 900);
          return [vmid(T(l, 140, 0, 440, { family: "serif", italic: true, size: 40, color: PLUM }), y, 76), R(620, y + 6, len, 70, c, { radius: 35, op: 0.45, name: l + " wash" }), R(610, y, len - 20, 70, c, { radius: 35, op: 0.7, name: l + " bar" }), vmid(tx(v + " min", 620 + len + 24, 0, 200, { bold: true }), y, 76)];
        }),
      ], "Rolling and cutting takes the longest, so we start the sauces while the dough rests."],
      [BG, [
        ...wash(960, 640, 640, BLU),
        lab("THE EVENING", 140, 120, 900),
        hd("How the evening flows", 140, 160, 1400, { size: 84 }),
        ...[["6:00", "Aprons on", "Wine, welcome and a quick tour."], ["6:20", "Dough", "Everyone makes their own."], ["7:00", "Roll & cut", "Pasta machines and rolling pins."], ["7:40", "Sauces", "Brown butter sage, fresh tomato."], ["8:00", "Eat!", "Long table, shared plates."]].flatMap(([t, n, s], i) => {
          const cx = 240 + i * 360;
          return [...dot(cx, 470, 48, [PEA, BUT, SAG, LAV, PEA][i]), T(t, cx - 160, 560, 320, { family: "serif", italic: true, size: 64, color: PLUM, align: "center" }), tx(n, cx - 160, 650, 320, { bold: true, size: 36, align: "center" }), tx(s, cx - 150, 708, 300, { size: 26, align: "center", color: MUT })];
        }),
      ], "Two and a half hours, start to finish. If we fall behind, the sauces can wait; the dough can't."],
      [BG, [
        lab("YOUR CHEFS", 140, 120, 900),
        hd("Who's cooking with you", 140, 160, 1400, { size: 84 }),
        ...[["Giulia Rossi", "HEAD CHEF", PEA], ["Tom Hart", "PASTRY & DOUGH", SAG], ["Ines Moreno", "SAUCES & WINE", LAV]].flatMap(([n, r, c], i) => {
          const x = 220 + i * 540;
          return [...wash(x + 180, 520, 230, c, i % 2 ? -1 : 1), member(CAST, F(x, 300, 360, 440, { shape: "circle", name: "Portrait" }), n, r), T(n, x - 60, 790, 480, { family: "serif", italic: true, size: 54, color: PLUM, align: "center" }), lab(r, x - 60, 866, 480, { align: "center" })];
        }),
      ], "Three chefs, one per station. Giulia leads, Tom helps with dough and Ines runs the sauce station and the wine."],
      [BG, [
        ...wash(960, 540, 600, PEA), ...wash(560, 300, 200, BUT, -1), ...wash(1420, 820, 220, SAG),
        hd("“Pasta is patience\nyou can eat.”", 260, 330, 1400, { size: 120, align: "center" }),
        lab("CHEF GIULIA ROSSI", 260, 640, 1400, { align: "center" }),
      ], "Giulia's motto. Say it slowly; it gets a laugh and it's true."],
      [BG, [
        lab("TONIGHT IN NUMBERS", 140, 120, 900),
        hd("A small recipe, a big table", 140, 160, 1400, { size: 84 }),
        ...[["400 g", "of flour", PEA], ["4", "eggs", BUT], ["3", "pasta shapes", SAG], ["12", "cooks at the table", LAV]].flatMap(([n, l, c], i) => {
          const cx = 300 + i * 440;
          return [...wash(cx, 560, 170, c, i % 2 ? -1 : 1), vmid(T(n, cx - 200, 0, 400, { family: "serif", italic: true, size: 120, color: PLUM, align: "center" }), 470, 180), tx(l, cx - 200, 760, 400, { align: "center", size: 34 })];
        }),
      ], "Four numbers for the evening. Twelve cooks means everyone gets their own board and their own dough."],
      [BG, [
        ...wash(1420, 520, 420, SAG), ...wash(1700, 860, 220, BUT, -1), ...wash(300, 900, 240, LAV),
        F(1200, 240, 460, 560, { shape: "circle", name: "Photo" }),
        hd("Buon appetito!", 140, 280, 1000, { size: 130 }),
        tx("Recipes go home with you. Book the next class while the dough is still on your hands.", 140, 470, 900, { size: 36 }),
        lab("NEXT CLASS: THURSDAY 15 MAY", 140, 680, 900, { color: "#b4533a" }),
        tx("oliveandthyme.example  ·  (555) 019 4410", 140, 726, 900),
      ], "Thank everyone, hand out the recipe cards and mention the next class date."],
    ];
  });

  /* 10 ─ Sports scoreboard · season review ───────────────────────────────────────────── */
  deck("scoreboard-season-review-dk2", "Scoreboard sports season review", P169, "sports season review football soccer team club results stats awards scoreboard", (W, H) => {
    const PITCH = "#123524", PANEL = "#0b0b0b", AMB = "#ffb000", RED = "#e63946", DIM = "#8fa294", EDGE = "#2f2f2f", LIT = "#2b2410";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, italic: true, size: 80, color: WHITE, lh: 1.0, ...o });
    const led = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", bold: true, size: 64, color: AMB, lh: 1.1, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", size: 30, color: "#d7e2d9", lh: 1.4, ...o });
    const panel = (x, y, w, h) => R(x, y, w, h, PANEL, { radius: 14, stroke: EDGE, sw: 6, name: "Scoreboard panel" });
    const pitch = () => [
      ...Array.from({ length: 8 }, (_, i) => R(i * 240, 0, 120, H, WHITE, { op: 0.025, name: "Mowing stripe" })),
      R(W / 2 - 2, 0, 4, H, WHITE, { op: 0.1, name: "Halfway line" }), ring(W / 2, H / 2, 180, WHITE, 4, { op: 0.1 }),
      R(-6, H / 2 - 220, 200, 440, "none", { stroke: WHITE, sw: 4, op: 0.1, name: "Penalty box" }), R(W - 194, H / 2 - 220, 200, 440, "none", { stroke: WHITE, sw: 4, op: 0.1, name: "Penalty box" }),
    ];
    return [
      [PITCH, [
        ...pitch(),
        panel(260, 170, 1400, 560),
        C(296, 206, 24, 24, RED, { name: "Light" }), C(1600, 206, 24, 24, RED, { name: "Light" }),
        led("NORTHSIDE HAWKS FC  ·  UNDER-16", 260, 214, 1400, { size: 30, align: "center" }),
        led("2026", 260, 290, 1400, { size: 260, align: "center", lh: 1 }),
        hd("SEASON REVIEW", 260, 600, 1400, { size: 70, align: "center" }),
        tx("Presented by Coach Dana Wells  ·  Awards night, 30 November 2026", 260, 800, 1400, { align: "center" }),
      ], "Welcome to the awards night. Tonight we look back at the best season in the club's history."],
      [PITCH, [
        ...pitch(),
        hd("Match programme", 240, 80, 1440, { size: 72 }),
        ...[["00'", "Kick-off: the season in a minute"], ["15'", "Match of the season"], ["30'", "Goals, month by month"], ["45'", "Player awards"], ["60'", "What's next"]].flatMap(([m, s], i) => {
          const y = 200 + i * 150;
          return [panel(240, y, 1440, 120), vmid(led(m, 280, 0, 200, { size: 56 }), y, 120), R(480, y + 24, 4, 72, EDGE, { name: "Divider" }), vmid(hd(s, 520, 0, 1100, { size: 46, italic: false }), y, 120)];
        }),
      ], "Tonight's programme, timed like a match. We should be done by the hour mark."],
      [PITCH, [
        ...pitch(),
        panel(560, 200, 800, 420),
        led("45'", 560, 240, 800, { size: 220, align: "center", lh: 1.1 }),
        led("HALF TIME", 560, 520, 800, { size: 40, align: "center", color: RED }),
        led("PART 2", 0, 700, W, { size: 28, align: "center", color: DIM }),
        hd("The highlights", 0, 750, W, { size: 110, align: "center" }),
      ], "Half time. Part two is all about the moments people will still be talking about next year."],
      [PITCH, [
        ...pitch(),
        hd("Match of the season", 120, 80, 1100, { size: 64 }),
        F(120, 190, 980, 720, { name: "Photo" }),
        panel(1200, 190, 600, 240),
        led("HAWKS", 1240, 220, 380, { size: 48, color: WHITE }), led("3", 1620, 220, 140, { size: 48, align: "right" }),
        led("RIVER CITY", 1240, 290, 380, { size: 48, color: WHITE }), led("2", 1620, 290, 140, { size: 48, align: "right" }),
        led("FULL TIME  ·  9 AUG", 1240, 372, 520, { size: 24, color: DIM }),
        tx("Two goals down at half time, we changed shape, pushed Sam up front and scored three in twenty minutes. Maya's winner came in the 88th minute.", 1200, 470, 600),
        R(1200, 810, 600, 100, RED, { radius: 10, name: "Award bar" }),
        vmid(hd("Player of the match: Maya Ito", 1230, 0, 560, { size: 34, italic: false }), 810, 100),
      ], "The comeback against River City. Drop in the best photo from that game and let the score panel tell the story."],
      [PITCH, [
        ...pitch(),
        hd("Goals, month by month", 160, 80, 1600, { size: 64 }),
        panel(160, 200, 1600, 760),
        led("44 GOALS IN TOTAL", 1100, 236, 620, { size: 26, align: "right", color: DIM }),
        ...[["MAR", 5], ["APR", 8], ["MAY", 11], ["JUN", 7], ["JUL", 9], ["AUG", 12]].flatMap(([m, v], i) => {
          const x = 260 + i * 250;
          return [...Array.from({ length: 12 }, (_, k) => R(x, 840 - (k + 1) * 38 + 8, 140, 30, k < v ? AMB : LIT, { radius: 4, name: k < v ? "Lit segment" : "Unlit segment" })), led(String(v), x, 300, 140, { size: 48, align: "center" }), led(m, x, 864, 140, { size: 28, align: "center", color: DIM })];
        }),
      ], "Every month we scored more than we conceded. August, with twelve goals, was our best ever."],
      [PITCH, [
        ...pitch(),
        hd("Season fixtures", 120, 80, 1600, { size: 64 }),
        R(80, 538, W - 160, 4, WHITE, { op: 0.6, name: "Timeline" }),
        ...[["12 MAR", "W 3–1", "vs Eastfield"], ["2 APR", "D 2–2", "at Kingsway"], ["7 MAY", "L 0–1", "vs Harbour"], ["11 JUN", "W 4–0", "at Millbrook"], ["9 JUL", "W 2–1", "vs Lakeside"], ["9 AUG", "W 3–2", "vs River City"]].flatMap(([d, r, o], i) => {
          const x = 110 + i * 290, up = i % 2 === 0, y = up ? 280 : 600, c = r[0] === "W" ? AMB : r[0] === "D" ? WHITE : RED;
          return [panel(x, y, 260, 200), R(x + 128, up ? 480 : 540, 4, 60, WHITE, { op: 0.6, name: "Stem" }), C(x + 116, 526, 28, 28, c, { name: "Result dot" }), led(r, x, y + 24, 260, { size: 52, align: "center", color: c }), tx(o, x, y + 100, 260, { align: "center", size: 28, color: WHITE }), led(d, x, y + 146, 260, { size: 22, align: "center", color: DIM })];
        }),
      ], "Six key fixtures. The one loss to Harbour in May was the turning point: we didn't lose again all season."],
      [PITCH, [
        ...pitch(),
        hd("Player awards", 140, 80, 1600, { size: 64 }),
        ...[["Maya Ito", "PLAYER OF THE SEASON", "9"], ["Sam Reyes", "TOP SCORER, 15 GOALS", "11"], ["Leo Park", "BEST DEFENDER", "4"], ["Ana Cruz", "MOST IMPROVED", "7"]].flatMap(([n, a, j], i) => {
          const x = 140 + i * 420;
          return [member(CAST, F(x, 190, 340, 500, { name: "Portrait" }), n, a), C(x + 250, 630, 110, 110, RED, { stroke: PITCH, sw: 6, name: "Shirt number" }), vmid(T(j, x + 250, 0, 110, { family: "sans", bold: true, italic: true, size: 52, color: WHITE, align: "center" }), 630, 110), hd(n, x, 780, 380, { size: 50, italic: false }), led(a, x, 846, 380, { size: 24 })];
        }),
      ], "Four awards, voted by the players. Call each winner up as their photo appears."],
      [PITCH, [
        ...pitch(),
        T("“", 140, 140, 300, { family: "sans", bold: true, size: 300, color: AMB, lh: 0.8 }),
        hd("We stopped playing not to lose. We started playing to win.", 140, 400, 1640, { size: 96 }),
        led("COACH DANA WELLS", 140, 680, 900, { size: 32 }),
      ], "Dana's line from the team talk at half time against River City. It became our motto."],
      [PITCH, [
        ...pitch(),
        panel(160, 160, 1600, 560),
        ...[["P", "22", "PLAYED"], ["W", "14", "WON"], ["D", "5", "DRAWN"], ["L", "3", "LOST"], ["GF", "44", "SCORED"], ["GA", "19", "CONCEDED"]].flatMap(([k, v, l], i) => {
          const x = 160 + i * 266;
          return [led(k, x, 220, 266, { size: 40, align: "center", color: DIM }), led(v, x, 330, 266, { size: 170, align: "center", color: k === "L" ? RED : AMB, lh: 1 }), led(l, x, 590, 266, { size: 24, align: "center", color: DIM }), i ? R(x, 220, 3, 440, EDGE, { name: "Divider" }) : null];
        }),
        hd("2nd in the Metro League  ·  47 points", 0, 790, W, { size: 60, align: "center" }),
        tx("The best season in the club's 31-year history.", 0, 880, W, { align: "center", size: 34 }),
      ], "The final table line. Second place, 47 points, and only three defeats all year."],
      [PITCH, [
        ...pitch(),
        panel(360, 200, 1200, 420),
        led("SEE YOU\nNEXT SEASON", 360, 270, 1200, { size: 110, align: "center", lh: 1.2 }),
        tx("Training restarts Tuesday 6 January, 17:30, Northside Park", 0, 700, W, { align: "center", size: 34, color: WHITE }),
        tx("hawksfc.example  ·  coach@hawksfc.example", 0, 760, W, { align: "center" }),
      ], "Thank the parents, volunteers and sponsors. Remind everyone of the date training restarts."],
    ];
  });

  /* 11 ─ Film strip · event recap ─────────────────────────────────────────────────────── */
  deck("filmstrip-festival-recap-dk2", "Film strip event recap", P169, "event recap festival film cinema highlights review summary film strip", (W, H) => {
    const CRM = "#f7f1e5", FILM = "#151515", OR = "#ff7a1a", MUT = "#7a7266", DK = "#2b2620", CELL = "#2a2a2a", SOFT = "#b9b0a2";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "serif", bold: true, italic: true, size: 96, color: FILM, lh: 1.0, ...o });
    const cap = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 24, color: OR, ls: 5, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", size: 30, color: DK, lh: 1.45, ...o });
    const tc = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", size: 22, color: MUT, ...o });
    const strip = (x, y, w, h) => {
      const out = [R(x, y, w, h, FILM, { name: "Film strip" })];
      for (let hx = x + 18; hx + 26 <= x + w - 10; hx += 52) out.push(R(hx, y + 12, 26, 18, CRM, { radius: 4, name: "Sprocket" }), R(hx, y + h - 30, 26, 18, CRM, { radius: 4, name: "Sprocket" }));
      return out;
    };
    const vstrip = (x, y, w, h) => {
      const out = [R(x, y, w, h, FILM, { name: "Film strip" })];
      for (let hy = y + 18; hy + 26 <= y + h - 10; hy += 52) out.push(R(x + 12, hy, 18, 26, CRM, { radius: 4, name: "Sprocket" }), R(x + w - 30, hy, 18, 26, CRM, { radius: 4, name: "Sprocket" }));
      return out;
    };
    return [
      [CRM, [
        cap("SHORTCUT FILM FESTIVAL 2026", 120, 90, 900),
        tc("12–15 SEPTEMBER  ·  OLD MILL CINEMA", 1100, 94, 700, { align: "right" }),
        hd("The recap", 120, 130, 1200, { size: 150 }),
        ...strip(0, 400, W, 420),
        ...[0, 1, 2, 3].map((i) => F(60 + i * 460, 450, 420, 320, { name: "Still" })),
        tx("46 films  ·  4 days  ·  4,200 tickets  ·  one very busy popcorn machine", 120, 880, 1680, { size: 34 }),
      ], "Four days, 46 films. Fill the strip with four stills that sum up the weekend."],
      [CRM, [
        ...vstrip(120, 0, 260, H),
        ...[0, 1, 2, 3, 4].map((i) => R(150, 40 + i * 205, 200, 180, CELL, { name: "Frame cell" })),
        ...[0, 1, 2, 3, 4].map((i) => vmid(T(String(i + 1), 150, 0, 200, { family: "serif", bold: true, italic: true, size: 96, color: OR, align: "center" }), 40 + i * 205, 180)),
        cap("PROGRAMME", 1480, 60, 360, { align: "right" }),
        ...[["Opening night", "The gala and our first full house"], ["The screenings", "46 shorts across three screens"], ["Audience numbers", "Who came, and when"], ["The crew", "The people who made it run"], ["Awards and 2027", "The winners and next year's dates"]].flatMap(([t, s], i) => [hd(t, 460, 40 + i * 205 + 34, 1000, { size: 64 }), tx(s, 460, 40 + i * 205 + 108, 1000, { size: 30, color: MUT })]),
      ], "Five reels, five parts. We'll move fast through numbers and slow down for the stories."],
      [FILM, [
        ring(1340, 540, 300, CRM, 6), ring(1340, 540, 240, CRM, 3, { op: 0.6 }),
        R(1000, 538, 680, 4, CRM, { op: 0.5, name: "Cross line" }), R(1338, 200, 4, 680, CRM, { op: 0.5, name: "Cross line" }),
        vmid(T("2", 1140, 0, 400, { family: "serif", bold: true, size: 360, color: CRM, align: "center", lh: 1 }), 360, 360),
        cap("REEL TWO", 120, 400, 700),
        hd("The\nscreenings", 120, 450, 760, { size: 120, color: CRM }),
        tc("46 SHORTS  ·  3 SCREENS  ·  18 COUNTRIES", 120, 730, 760, { color: SOFT }),
      ], "Reel two: the screenings. The countdown is a nod to the old film leaders the projectionists still love."],
      [CRM, [
        ...strip(100, 160, 940, 760),
        F(130, 210, 880, 660, { name: "Photo" }),
        cap("OPENING NIGHT  ·  FRI 12 SEP", 1140, 200, 700),
        ...flow(244, hd("A full house for “Small Hours”", 1140, 0, 680, { size: 76 }), 40, tx("Mira Okafor's nine-minute film about a night-shift baker opened the festival. The room went quiet, then stood up for six minutes.", 1140, 0, 660)),
        R(1140, 760, 660, 2, FILM, { op: 0.3, name: "Rule" }),
        ...[["380", "seats filled"], ["6 min", "standing ovation"]].flatMap(([a, b], i) => [hd(a, 1140 + i * 330, 790, 300, { size: 72, color: OR }), tc(b.toUpperCase(), 1140 + i * 330, 870, 300)]),
      ], "Opening night. Put the best photo from the gala in the frame; the standing ovation is the story."],
      [CRM, [
        hd("Who came, and when", 120, 90, 1400, { size: 80 }),
        tx("Tickets scanned per day", 120, 190, 900, { color: MUT }),
        R(200, 900, 1520, 4, FILM, { name: "Baseline" }),
        ...[["THU", 620], ["FRI", 1140], ["SAT", 1480], ["SUN", 960]].flatMap(([d, v], i) => {
          const h = Math.round((v / 1480) * 560), x = 300 + i * 360;
          return [...vstrip(x, 900 - h, 150, h), hd(v.toLocaleString("en-US"), x - 75, 900 - h - 80, 300, { size: 56, align: "center", color: OR }), cap(d, x - 25, 924, 200, { align: "center", color: FILM })];
        }),
      ], "Saturday was the big day with nearly 1,500 tickets. Thursday was quiet, so next year we'll move a headline film there."],
      [CRM, [
        hd("Festival at a glance", 120, 100, 1600, { size: 80 }),
        ...strip(0, 300, W, 360),
        ...[["THU 18:00", "Doors open", "Drinks in the mill yard and the first programme."], ["FRI 19:30", "Opening gala", "“Small Hours” and a Q&A with the director."], ["SAT 11:00", "Shorts marathon", "Four blocks, three screens, one long day."], ["SUN 15:00", "Kids' matinee", "Animated shorts and a flip-book table."], ["SUN 20:00", "Awards night", "Jury and audience prizes, then the party."]].flatMap(([t, n, s], i) => {
          const x = 60 + i * 366;
          return [R(x, 342, 330, 276, CELL, { name: "Frame cell" }), tc(t, x + 24, 370, 290, { color: OR, size: 26 }), T(n, x + 24, 416, 290, { family: "serif", bold: true, italic: true, size: 54, color: CRM, lh: 1.05 }), tx(s, x, 700, 330, { size: 30 })];
        }),
      ], "The festival in five frames. Use this slide to remind people how much happened in four days."],
      [CRM, [
        hd("Roll the credits: the crew", 120, 100, 1600, { size: 80 }),
        ...strip(0, 260, W, 420),
        ...[["Nadia Brooks", "FESTIVAL DIRECTOR"], ["Owen Hale", "PROGRAMMER"], ["Zara Quinn", "VOLUNTEER LEAD"], ["Felix Moreau", "TECH & PROJECTION"]].flatMap(([n, r], i) => {
          const x = 110 + i * 440;
          return [member(CAST, F(x, 310, 380, 320, { name: "Portrait" }), n, r), hd(n, x, 720, 400, { size: 48 }), cap(r, x, 784, 400)];
        }),
        tx("And 62 volunteers who tore tickets, poured coffee and stacked chairs.", 120, 880, 1600, { color: MUT }),
      ], "Thank the core crew by name and the volunteers as a group. Ask the volunteers in the room to stand."],
      [FILM, [
        R(0, 240, W, 600, DK, { name: "Picture area" }),
        tc("TC 00:42:17:03", 80, 120, 600, { color: OR }),
        T("“", 860, 300, 200, { family: "serif", bold: true, size: 200, color: OR, align: "center", lh: 0.8 }),
        T("I've never cried at a nine-minute film before. I did twice this weekend.", 260, 470, 1400, { family: "sans", size: 60, color: CRM, align: "center", lh: 1.3 }),
        tc("AUDIENCE CARD, SATURDAY 14 SEPTEMBER", 260, 740, 1400, { align: "center", color: SOFT }),
      ], "A line from an audience feedback card, shown like a subtitle. Pause on it."],
      [CRM, [
        hd("The weekend in numbers", 120, 100, 1600, { size: 80 }),
        ...[["4,200", "TICKETS SCANNED"], ["46", "FILMS SCREENED"], ["18", "COUNTRIES"]].flatMap(([n, l], i) => {
          const x = 140 + i * 570;
          return [R(x + 10, 332, 500, 420, "#000000", { op: 0.1, radius: 12, name: "Ticket shadow" }), R(x, 320, 500, 420, WHITE, { radius: 12, name: "Ticket" }), R(x, 320, 500, 70, OR, { name: "Ticket band" }), C(x - 24, 506, 48, 48, CRM, { name: "Ticket notch" }), C(x + 476, 506, 48, 48, CRM, { name: "Ticket notch" }), vmid(cap("ADMIT ONE", x, 0, 500, { align: "center", color: WHITE }), 320, 70), hd(n, x, 450, 500, { size: 130, align: "center" }), cap(l, x, 640, 500, { align: "center", color: FILM })];
        }),
      ], "Three numbers on three tickets. 4,200 tickets is up a third on last year."],
      [FILM, [
        hd("Fin.", 120, 140, 800, { size: 240, color: CRM }),
        cap("THANK YOU TO", 120, 460, 700),
        tx("Old Mill Cinema\nRiverside Arts Fund\n62 volunteers\nEvery single audience member", 120, 504, 760, { color: CRM, lh: 1.6 }),
        cap("SEE YOU IN 2027", 1100, 460, 700),
        T("11–14 September 2027", 1100, 500, 720, { family: "serif", bold: true, italic: true, size: 56, color: CRM }),
        tx("hello@shortcutfest.example\nshortcutfest.example", 1100, 590, 720, { color: SOFT, lh: 1.6 }),
        ...strip(0, 880, W, 200),
      ], "Roll the credits. Thank the venue, funders and volunteers, then announce next year's dates."],
    ];
  });

  /* 12 ─ Map and route · strategy ────────────────────────────────────────────────────── */
  deck("route-map-strategy-dk2", "Route map strategy plan", P169, "strategy plan roadmap growth business three year goals company map route", (W, H) => {
    const MAP = "#eef0e4", LAND = "#dfe4d0", WATER = "#c2dbe3", ROUTE = "#e2453b", INK = "#1f2d3a", GRD = "#cdd3bf", YEL = "#f2c14e", MUT = "#56636f";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 80, color: INK, lh: 1.05, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 30, color: MUT, lh: 1.45, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", bold: true, size: 22, color: ROUTE, ls: 2, ...o });
    const pin = (x, y, c = ROUTE, s = 1) => [S("triangle", x - 18 * s, y - 34 * s, 36 * s, 34 * s, c, { rot: 180, name: "Pin tip" }), C(x - 26 * s, y - 82 * s, 52 * s, 52 * s, c, { name: "Pin" }), C(x - 10 * s, y - 66 * s, 20 * s, 20 * s, WHITE, { name: "Pin dot" })];
    const mapbg = (k = 0) => [
      ...Array.from({ length: 9 }, (_, i) => R(0, 120 * i + 60, W, 1, GRD, { name: "Grid line" })),
      ...Array.from({ length: 16 }, (_, i) => R(120 * i + 60, 0, 1, H, GRD, { name: "Grid line" })),
      C(k ? 200 : 1100, k ? 500 : 420, 1000, 760, LAND, { op: 0.9, name: "Land" }),
      ring(k ? 700 : 1600, k ? 880 : 760, 140, GRD, 3), ring(k ? 700 : 1600, k ? 880 : 760, 220, GRD, 3), ring(k ? 700 : 1600, k ? 880 : 760, 300, GRD, 3, { op: 0.6 }),
      C(k ? 1500 : -160, k ? -160 : 820, 560, 380, WATER, { name: "Lake" }),
    ];
    const compass = (x, y) => [S("star", x, y, 120, 120, INK, { points: 4, name: "Compass" }), C(x + 48, y + 48, 24, 24, WHITE, { name: "Compass dot" }), T("N", x, y - 40, 120, { family: "mono", bold: true, size: 26, color: INK, align: "center" })];
    return [
      [MAP, [
        ...mapbg(),
        ...dotted([[160, 1000], [700, 800], [1100, 880], [1500, 560], [1760, 300]], 26, 12, ROUTE),
        ...pin(700, 800), ...pin(1100, 880, INK), ...pin(1500, 560),
        E("icon-flag", 1724, 196, 90, { c1: ROUTE }),
        ...compass(1700, 760),
        R(120, 160, 820, 520, WHITE, { radius: 16, stroke: INK, sw: 3, name: "Legend card" }),
        lab("PATHWAY BIKES  ·  STRATEGY 2027–2029", 160, 200, 760),
        hd("Route to\n2029", 160, 250, 740, { size: 120 }),
        tx("Where we ride next: three years, six cities, one plan.", 160, 530, 740),
      ], "This is our three-year strategy, drawn as a route. Every stop on the map is a milestone we commit to."],
      [MAP, [
        ...mapbg(1),
        ...dotted([[260, 160], [420, 360], [260, 560], [420, 760], [260, 960]], 26, 12, ROUTE),
        ...[["Where we are", "Our riders, cities and numbers today"], ["Where we play", "The six cities we will focus on"], ["How we win", "Three moves for the next three years"], ["Milestones", "The route, stop by stop"], ["Who drives it", "The team and the next steps"]].flatMap(([t, s], i) => {
          const x = i % 2 ? 420 : 260, y = 160 + i * 200 + 50;
          return [...pin(x, y, i === 4 ? INK : ROUTE), vmid(T(String(i + 1), x - 26, 0, 52, { family: "sans", bold: true, size: 26, color: WHITE, align: "center" }), y - 82, 52), hd(t, 540, y - 100, 900, { size: 50 }), tx(s, 540, y - 42, 900, { size: 28 })];
        }),
        R(1420, 700, 380, 260, WHITE, { radius: 14, stroke: INK, sw: 2, name: "Legend" }),
        lab("LEGEND", 1450, 724, 320, { color: INK }),
        ...dotted([[1460, 790], [1540, 790]], 26, 12, ROUTE), tx("Planned route", 1570, 770, 220, { size: 26 }),
        ...pin(1490, 880, ROUTE, 0.6), tx("Milestone", 1570, 836, 220, { size: 26 }),
        E("icon-flag", 1466, 890, 46, { c1: ROUTE }), tx("2029 goal", 1570, 896, 220, { size: 26 }),
      ], "Five stops on today's route. We'll spend most of the time on stops two and three."],
      [MAP, [
        ...mapbg(),
        C(1060, 140, 800, 800, WHITE, { stroke: INK, sw: 4, name: "Zoom lens" }),
        ring(1460, 540, 300, GRD, 3), ring(1460, 540, 220, GRD, 3), ring(1460, 540, 140, GRD, 3),
        ...dotted([[1160, 700], [1460, 560], [1760, 420]], 26, 12, ROUTE),
        ...pin(1460, 560, ROUTE, 1.6),
        lab("STOP 2", 120, 380, 800),
        hd("Where\nwe play", 120, 420, 900, { size: 140 }),
        tx("Six cities, picked for hills we can handle and commutes we can win.", 120, 730, 820),
      ], "Stop two: where we play. We said no to more cities than we said yes to."],
      [MAP, [
        ...mapbg(1),
        R(120, 160, 820, 780, WHITE, { radius: 20, stroke: INK, sw: 3, name: "Location card" }),
        F(150, 190, 760, 520, { name: "Photo" }),
        ...pin(530, 168, ROUTE, 1.2),
        lab("YOU ARE HERE", 150, 744, 760),
        hd("Riverside, 2026", 150, 780, 760, { size: 52 }),
        tx("Our home city since 2019", 150, 846, 760, { size: 28 }),
        hd("Where we are today", 1040, 180, 780, { size: 72 }),
        tx("One city, one fleet and a loyal base of commuters. We are profitable in Riverside, but growth there has slowed to 6% a year.", 1040, 350, 780),
        ...[["38,000", "monthly riders"], ["2", "cities"], ["€11M", "revenue in 2026"]].flatMap(([a, b], i) => [R(1040, 600 + i * 120, 8, 92, ROUTE, { name: "Marker" }), hd(a, 1072, 596 + i * 120, 360, { size: 56 }), tx(b, 1440, 612 + i * 120, 380, { size: 28 })]),
      ], "Where we start from. Strong at home, but home alone won't get us to our 2029 number."],
      [MAP, [
        ...mapbg(),
        hd("Where we play", 120, 90, 1000, { size: 72 }),
        tx("Riders we can reach by 2029, in thousands", 120, 176, 900),
        ...[["Riverside", 38, 380, 480], ["Northgate", 22, 920, 420], ["Port Ellis", 30, 1180, 800], ["Lakemoor", 15, 720, 820], ["Highfield", 26, 1520, 430], ["Westbrook", 12, 240, 880]].flatMap(([n, v, x, y], i) => {
          const r = Math.round(Math.sqrt(v) * 28);
          return [C(x - r, y - r, 2 * r, 2 * r, ROUTE, { op: 0.22, stroke: ROUTE, sw: 3, name: n + " bubble" }), C(x - 8, y - 8, 16, 16, i ? INK : ROUTE, { name: "City dot" }), T(n, x - 150, y + r + 10, 300, { family: "sans", bold: true, size: 30, color: INK, align: "center" }), lab(v + "K", x - 150, y + r + 48, 300, { align: "center", color: MUT })];
        }),
      ], "Bubble size shows the riders we think each city can give us. Riverside is home; Port Ellis is the biggest prize."],
      [MAP, [
        ...mapbg(1),
        hd("The route, stop by stop", 120, 90, 1400, { size: 72 }),
        ...dotted([[140, 940], [520, 660], [900, 780], [1300, 540], [1700, 420]], 26, 12, ROUTE),
        lab("START: 2026", 120, 966, 400, { color: INK }),
        ...[["2027 H1", "Open Northgate", "Second city, 40 docking stations.", 520, 660, 1], ["2027 H2", "E-bike fleet", "Half the fleet goes electric.", 900, 780, 0], ["2028", "Three new cities", "Port Ellis, Highfield, Lakemoor.", 1300, 540, 1], ["2029", "120,000 riders", "Break even in every city.", 1700, 420, 1]].flatMap(([w, t, s, x, y, below], i) => {
          const cy = below ? y + 30 : y - 300, cx = Math.min(x - 170, W - 380);
          return [...pin(x, y, i === 3 ? YEL : ROUTE), R(cx, cy, 340, 190, WHITE, { radius: 14, stroke: GRD, sw: 2, name: "Milestone card" }), lab(w, cx + 24, cy + 20, 300), hd(t, cx + 24, cy + 52, 300, { size: 34 }), tx(s, cx + 24, cy + 100, 300, { size: 24 })];
        }),
      ], "Four milestones. The e-bike switch in late 2027 is the one that makes the new cities possible."],
      [MAP, [
        ...mapbg(),
        hd("The navigators", 120, 90, 1400, { size: 72 }),
        ...[["Hana Okoro", "CEO", "Sets the destination"], ["Marc Duval", "COO", "Runs the fleet"], ["Lucía Ramos", "HEAD OF GROWTH", "Opens new cities"], ["Ben Achter", "CFO", "Keeps us fuelled"]].flatMap(([n, r, s], i) => {
          const x = 160 + i * 430;
          return [C(x - 10, 330, 320, 320, WHITE, { stroke: INK, sw: 3, name: "Ring" }), member(CAST, F(x + 10, 350, 280, 280, { shape: "circle", name: "Portrait" }), n, r), ...pin(x + 150, 336, i % 2 ? INK : ROUTE, 0.8), hd(n, x - 40, 690, 380, { size: 40, align: "center" }), lab(r, x - 40, 744, 380, { align: "center" }), tx(s, x - 40, 780, 380, { size: 28, align: "center" })];
        }),
      ], "The four people accountable for the route. Each one owns at least one milestone."],
      [MAP, [
        ...mapbg(1),
        R(260, 200, 1400, 640, WHITE, { radius: 24, stroke: INK, sw: 3, name: "Quote card" }),
        ...compass(1500, 260),
        T("“", 320, 230, 200, { family: "sans", bold: true, size: 200, color: ROUTE, lh: 0.8 }),
        hd("A strategy is a map: it shows the roads we will take, and the ones we won't.", 360, 420, 1100, { size: 64, lh: 1.15 }),
        lab("HANA OKORO, CEO", 360, 740, 900, { color: INK }),
      ], "Hana's framing for the whole plan. The roads we won't take matter as much as the ones we will."],
      [MAP, [
        ...mapbg(),
        hd("Distance to go", 120, 90, 1400, { size: 72 }),
        tx("Where the route ends in 2029", 120, 176, 900),
        ...[["120K", "riders a month"], ["06", "cities"], ["€40M", "revenue"]].flatMap(([n, l], i) => {
          const cxg = 360 + i * 600, cw = 96, gap = 10, tw = n.length * cw + (n.length - 1) * gap, x0 = cxg - tw / 2;
          return [R(x0 - 20, 380, tw + 40, 190, INK, { radius: 14, name: "Odometer" }), ...[...n].flatMap((ch, j) => [R(x0 + j * (cw + gap), 400, cw, 150, "#2d3e4f", { radius: 8, name: "Digit cell" }), vmid(T(ch, x0 + j * (cw + gap), 0, cw, { family: "mono", bold: true, size: 96, color: WHITE, align: "center" }), 400, 150)]), R(x0 - 20, 584, tw + 40, 8, ROUTE, { radius: 4, name: "Odometer accent" }), hd(l, cxg - 250, 620, 500, { size: 40, align: "center" })];
        }),
        ...dotted([[160, 880], [1740, 880]], 26, 12, ROUTE, { op: 0.6 }),
        ...pin(560, 880, INK), lab("TODAY", 460, 906, 200, { align: "center", color: INK }),
        E("icon-flag", 1716, 796, 70, { c1: ROUTE }), lab("2029", 1650, 906, 200, { align: "center" }),
      ], "The destination in three readings: 120,000 riders, six cities and 40 million euros in revenue."],
      [MAP, [
        ...mapbg(1),
        ...dotted([[1000, 1000], [1300, 820], [1520, 900], [1760, 640]], 26, 12, ROUTE),
        E("icon-flag", 1724, 536, 90, { c1: ROUTE }),
        R(120, 200, 860, 620, WHITE, { radius: 20, stroke: INK, sw: 3, name: "Card" }),
        lab("NEXT STOP", 170, 250, 760),
        hd("Your\nquestions", 170, 290, 760, { size: 110 }),
        tx("strategy@pathwaybikes.example\nFull plan: intranet / strategy-2029\nOffice hours with Hana: Fridays, 3 pm", 170, 560, 760, { lh: 1.6, color: INK }),
      ], "Open the floor. Point people to the full plan on the intranet and Hana's Friday office hours."],
    ];
  });

  /* 13 ─ Data dashboard cards · investor update ─────────────────────────────────────────── */
  deck("dashboard-investor-update-dk2", "Dashboard investor update", P169, "investor update quarterly report kpi metrics startup board dashboard cards", (W, H) => {
    const BG = "#f2f4f8", BOR = "#e2e6ee", INK = "#101828", MUT = "#667085", EM = "#12b76a", VIO = "#6e56cf", RED = "#f04438", AM = "#f79009", SV = "#eeeaff", SE = "#e7f8ef", SR = "#fdecea", SA = "#fff4e0";
    const card = (x, y, w, h, o = {}) => R(x, y, w, h, WHITE, { radius: 24, stroke: BOR, sw: 2, name: "Card", ...o });
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 64, color: INK, lh: 1.1, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", size: 28, color: MUT, lh: 1.45, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", size: 20, color: MUT, ls: 1, ...o });
    const chip = (s, x, y, w, c, bgc) => [R(x, y, w, 44, bgc, { radius: 22, name: "Chip" }), vmid(T(s, x, 0, w, { family: "sans", bold: true, size: 22, color: c, align: "center" }), y, 44)];
    const nav = (n) => [R(0, 0, W, 88, WHITE, { name: "Top bar" }), R(0, 88, W, 2, BOR, { name: "Top bar rule" }), C(60, 26, 36, 36, VIO, { name: "Logo" }), C(72, 38, 12, 12, WHITE, { name: "Logo dot" }), T("Fieldnote", 108, 24, 300, { family: "sans", bold: true, size: 30, color: INK }), lab("Q3 2026 INVESTOR UPDATE  ·  " + n + " / 10", W - 760, 32, 700, { align: "right" })];
    const spark = (x, y, w, h, vals, c) => { const mx = Math.max(...vals), mn = Math.min(...vals), pts = vals.map((v, i) => [x + (i * w) / (vals.length - 1), y + h - ((v - mn) / (mx - mn)) * h]); return [...pts.slice(1).map((p, i) => seg(pts[i][0], pts[i][1], p[0], p[1], c, 5, { name: "Sparkline" })), ...pts.map(([px, py], i) => C(px - 6, py - 6, 12, 12, i === pts.length - 1 ? c : WHITE, { stroke: c, sw: 3, name: "Spark point" }))]; };
    return [
      [BG, [
        ...nav(1),
        ...chip("CONFIDENTIAL", 120, 200, 220, VIO, SV),
        hd("Q3 2026\ninvestor update", 120, 280, 900, { size: 110 }),
        tx("Fieldnote: field notes for frontline teams.\nPrepared by Priya Shah, CEO  ·  14 October 2026", 120, 560, 880),
        ...[["ANNUAL RECURRING REVENUE", "$3.2M", "+14% QoQ", EM, SE], ["NET REVENUE RETENTION", "118%", "+3 pts", EM, SE], ["MONTHLY BURN", "$310k", "−8% QoQ", EM, SE]].flatMap(([l, v, d, c, b], i) => {
          const y = 180 + i * 250;
          return [card(1100, y, 700, 220), lab(l, 1140, y + 32, 440), hd(v, 1140, y + 76, 380, { size: 76 }), ...chip(d, 1600, y + 26, 170, c, b), ...(i === 0 ? spark(1440, y + 110, 320, 70, [2050, 2180, 2290, 2420, 2560, 2800, 2930, 3050, 3200], VIO) : [])];
        }),
      ], "The quarter in one glance: revenue up 14%, retention up and burn down. Details follow, section by section."],
      [BG, [
        ...nav(2),
        hd("Agenda", 120, 140, 1200),
        ...[["01", "Highlights", "The quarter on one page", VIO, SV], ["02", "Product & customers", "What shipped, who signed", EM, SE], ["03", "Financials", "Revenue, burn and runway", AM, SA], ["04", "Roadmap", "What's next in Q4 and 2027", VIO, SV], ["05", "Team", "Hires and open roles", EM, SE], ["06", "Our asks", "Where you can help", RED, SR]].flatMap(([n, t, s, c, b], i) => {
          const x = 120 + (i % 3) * 570, y = 270 + Math.floor(i / 3) * 370;
          return [card(x, y, 540, 330), C(x + 40, y + 40, 80, 80, b, { name: "Icon disc" }), vmid(T(n, x + 40, 0, 80, { family: "mono", bold: true, size: 28, color: c, align: "center" }), y + 40, 80), hd(t, x + 40, y + 160, 460, { size: 40 }), tx(s, x + 40, y + 216, 460)];
        }),
      ], "Six short sections. Questions are welcome at any point, but the asks at the end are where we need you most."],
      [BG, [
        ...nav(3),
        card(360, 240, 1200, 600),
        lab("SECTION 02 OF 06", 440, 310, 600),
        hd("Product &\ncustomers", 440, 360, 1040, { size: 120 }),
        R(440, 720, 1040, 16, BOR, { radius: 8, name: "Progress track" }),
        R(440, 720, 347, 16, VIO, { radius: 8, name: "Progress" }),
        lab("2 / 6", 1280, 748, 200, { align: "right" }),
      ], "Section two: product and customers. Two big launches and our first utility contract."],
      [BG, [
        ...nav(4),
        card(120, 140, 1680, 860),
        F(160, 180, 760, 780, { shape: "rounded", radius: 20, name: "Screenshot" }),
        ...chip("SHIPPED IN Q3", 1000, 200, 250, EM, SE),
        ...flow(276, hd("Offline mode for field teams", 1000, 0, 740, { size: 60 }), 40, tx("Crews in tunnels, basements and rural sites can now capture notes with no signal. Everything syncs the moment they reconnect.", 1000, 0, 740)),
        ...["Works offline for up to 72 hours", "Used by 64% of active teams in week one", "Support tickets about lost notes down 80%"].flatMap((s, i) => [E("icon-check-circle", 1000, 650 + i * 90, 44, { c1: EM }), vmid(tx(s, 1064, 0, 700, { color: INK }), 650 + i * 90, 44)]),
      ], "Offline mode was the most requested feature for two years. Show a screenshot of the sync screen in the frame."],
      [BG, [
        ...nav(5),
        card(120, 140, 1160, 860),
        lab("ARR, $K", 160, 180, 600),
        hd("Annual recurring revenue", 160, 214, 1000, { size: 44 }),
        ...[1000, 2000, 3000].flatMap((v) => [R(250, 900 - (v / 3500) * 560, 990, 2, BOR, { name: "Grid line" }), T("$" + v / 1000 + "M", 150, 900 - (v / 3500) * 560 - 16, 84, { family: "mono", size: 20, color: MUT, align: "right" })]),
        R(250, 899, 990, 3, "#c7cdd8", { name: "Baseline" }),
        ...[["J", 2050], ["F", 2180], ["M", 2290], ["A", 2420], ["M", 2560], ["J", 2800], ["J", 2930], ["A", 3050], ["S", 3200]].flatMap(([m, v], i) => {
          const h = Math.round((v / 3500) * 560), x = 280 + i * 106;
          return [R(x, 900 - h, 72, h, i === 8 ? EM : VIO, { radius: 10, op: i === 8 ? 1 : 0.85, name: "Bar" }), T(m, x, 916, 72, { family: "mono", size: 22, color: MUT, align: "center" })];
        }),
        ...chip("$3.2M", 1088, 900 - 512 - 60, 140, WHITE, EM),
        card(1320, 140, 480, 410),
        lab("QUARTER ON QUARTER", 1360, 180, 400),
        hd("+14%", 1360, 230, 400, { size: 120, color: EM }),
        tx("ARR growth from Q2 to Q3, the best quarter yet.", 1360, 400, 400),
        card(1320, 590, 480, 410),
        lab("BIGGEST SEGMENT", 1360, 630, 400),
        hd("Utilities", 1360, 676, 400, { size: 60 }),
        tx("41% of new ARR came from water and power companies.", 1360, 760, 400),
        R(1360, 920, 400, 14, BOR, { radius: 7, name: "Progress track" }), R(1360, 920, 164, 14, VIO, { radius: 7, name: "Progress" }),
      ], "ARR grew every month this year and reached 3.2 million in September. Utilities are now our biggest segment."],
      [BG, [
        ...nav(6),
        hd("Roadmap", 120, 140, 1200),
        R(120, 380, 1680, 6, BOR, { radius: 3, name: "Track" }),
        R(120, 380, 1080, 6, EM, { radius: 3, name: "Track done" }),
        ...[["Q2 2026", "Done", EM, SE, "Offline mode", "Works with no signal for 72 hours."], ["Q3 2026", "Done", EM, SE, "Photo notes", "Snap, tag and share from the field."], ["Q4 2026", "In progress", AM, SA, "Team analytics", "Managers see trends across crews."], ["Q1 2027", "Next", VIO, SV, "Public API", "Connect Fieldnote to any CRM."]].flatMap(([q, st, c, b, t, s], i) => {
          const x = 120 + i * 430;
          return [lab(q, x, 320, 400), C(x + 186, 369, 28, 28, c, { stroke: WHITE, sw: 4, name: "Track dot" }), card(x, 450, 400, 440), ...chip(st, x + 30, 486, 190, c, b), F(x + 30, 556, 340, 150, { shape: "rounded", radius: 12, name: "Screenshot" }), hd(t, x + 30, 730, 340, { size: 40 }), tx(s, x + 30, 786, 340)];
        }),
      ], "Two of four roadmap items are done. Team analytics is in beta with five customers and ships in December."],
      [BG, [
        ...nav(7),
        card(120, 140, 1100, 860),
        lab("TEAM", 160, 180, 600),
        hd("24 people, up from 19", 160, 214, 1000, { size: 60 }),
        tx("Five new hires this quarter, all in product and customer success.", 160, 300, 1000),
        ...[["Ana", "Backend"], ["Kofi", "Design"], ["Lea", "Success"], ["Max", "Mobile"], ["Yui", "Success"]].flatMap(([n, r], i) => {
          const x = 160 + i * 205;
          return [member(CAST, F(x, 440, 170, 170, { shape: "circle", name: "Avatar" }), n, r), T(n, x - 10, 640, 190, { family: "sans", bold: true, size: 30, color: INK, align: "center" }), lab(r.toUpperCase(), x - 10, 684, 190, { align: "center" })];
        }),
        tx("Attrition this quarter: zero.", 160, 860, 1000, { color: EM, bold: true }),
        card(1260, 140, 540, 860),
        lab("HIRING", 1300, 180, 460),
        hd("3 open roles", 1300, 214, 460, { size: 52 }),
        ...["Senior backend engineer", "Customer success lead", "Product designer"].flatMap((s, i) => [R(1300, 330 + i * 130, 460, 104, BG, { radius: 16, name: "Role row" }), vmid(T(s, 1330, 0, 400, { family: "sans", bold: true, size: 28, color: INK }), 330 + i * 130, 104)]),
        tx("Know someone great? Intros are our first ask.", 1300, 760, 460),
      ], "Five new people and no one left. If you know a senior backend engineer, please send them our way."],
      [BG, [
        ...nav(8),
        card(260, 200, 1400, 680),
        ...[0, 1, 2, 3, 4].map((i) => S("star", 340 + i * 64, 260, 48, 48, AM, { name: "Rating star" })),
        hd("“Our crews stopped losing notes the week we switched on offline mode. It paid for itself in a month.”", 340, 350, 1240, { size: 52, lh: 1.25 }),
        F(340, 700, 110, 110, { shape: "circle", name: "Customer photo" }),
        T("Dana Whitfield", 476, 712, 600, { family: "sans", bold: true, size: 32, color: INK }),
        tx("Operations director, Northline Water", 476, 756, 600),
        R(1340, 716, 240, 80, BG, { radius: 12, name: "Logo slot" }),
        vmid(lab("CUSTOMER LOGO", 1340, 0, 240, { align: "center" }), 716, 80),
      ], "A quote from our largest new customer. Replace the logo slot with their logo once marketing approves it."],
      [BG, [
        ...nav(9),
        hd("Q3 at a glance", 120, 140, 1200),
        ...[["ARR", "$3.2M", "+14%", EM, SE, "Up from $2.8M in Q2.", [24, 25, 26, 28, 29, 32]], ["NET RETENTION", "118%", "+3 pts", EM, SE, "Expansion beats churn.", [112, 113, 115, 114, 116, 118]], ["GROSS MARGIN", "81%", "−1 pt", RED, SR, "New hosting region.", [80, 82, 82, 83, 82, 81]], ["RUNWAY", "26 mo", "+2 mo", EM, SE, "At the current burn.", [21, 22, 22, 24, 25, 26]]].flatMap(([l, v, d, c, b, s, vals], i) => {
          const x = 120 + i * 430;
          return [card(x, 280, 400, 560), lab(l, x + 36, 320, 330), hd(v, x + 36, 370, 340, { size: 96 }), ...chip(d, x + 36, 510, 150, c, b), tx(s, x + 36, 580, 330), ...spark(x + 46, 700, 300, 90, vals, c === RED ? RED : VIO)];
        }),
        tx("All figures unaudited. Full financials in the data room.", 120, 900, 1680),
      ], "Four numbers. Margin dipped one point because we opened a second hosting region for a utility customer."],
      [BG, [
        ...nav(10),
        card(120, 140, 1100, 860),
        lab("OUR ASKS", 160, 180, 600),
        hd("Where you can help", 160, 214, 1000, { size: 60 }),
        ...[["Intros to utility companies", "Especially water boards in the US Midwest."], ["Senior backend engineer", "Referrals for our hardest hire."], ["Q1 board date", "Please hold 22 January for the board meeting."]].flatMap(([t, s], i) => {
          const y = 340 + i * 190;
          return [C(160, y, 72, 72, SV, { name: "Number disc" }), vmid(T(String(i + 1), 160, 0, 72, { family: "mono", bold: true, size: 30, color: VIO, align: "center" }), y, 72), T(t, 260, y - 4, 900, { family: "sans", bold: true, size: 38, color: INK }), tx(s, 260, y + 48, 900)];
        }),
        R(1260, 140, 540, 860, VIO, { radius: 24, name: "Contact card" }),
        hd("Thank you", 1300, 200, 460, { size: 64, color: WHITE }),
        T("Priya Shah, CEO\npriya@fieldnote.example\n+1 555 0177\n\nData room:\nfieldnote.example/investors", 1300, 330, 460, { family: "sans", size: 30, color: "#e9e4ff", lh: 1.5 }),
      ], "Three asks, in order of impact. Thank everyone and point them to the data room."],
    ];
  });

  /* 14 ─ Memphis pattern · creative workshop ──────────────────────────────────────────── */
  deck("memphis-idea-workshop-dk2", "Memphis creative workshop", P169, "workshop training session creative ideas brainstorm team hands-on memphis pattern", (W, H) => {
    const BG = "#fff4e4", BK = "#111111", PK = "#ff6fae", YL = "#ffd23f", CY2 = "#3ec1d3", PU = "#8a63d2";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 96, color: BK, lh: 1.0, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 32, color: BK, lh: 1.4, ...o });
    const tag = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 24, color: BK, ls: 3, ...o });
    const pop = (kind, x, y, w, h, fill, o = {}) => [S(kind, x + 12, y + 12, w, h, BK, { rot: o.rot, radius: o.radius, sides: o.sides, name: "Hard shadow" }), S(kind, x, y, w, h, fill, { stroke: BK, sw: 6, ...o, name: o.name || "Memphis shape" })];
    const squig = (x, y, w, c, rot = 0) => E("deco-squiggle", x, y, w, { c1: c, rot });
    const zig = (x, y, w, c, rot = 0) => E("line-zigzag", x, y, w, { c1: c, rot });
    const shadow = (c) => ({ x: 8, y: 8, blur: 0, color: c, opacity: 1 });
    const COLS = [PK, YL, CY2, PU, PK];
    return [
      [BG, [
        ...pop("ellipse", 1420, 130, 300, 300, YL),
        ...pop("triangle", 1620, 600, 220, 200, CY2, { rot: 12 }),
        ...pop("rect", 1260, 560, 200, 200, PK, { rot: -10 }),
        squig(1000, 90, 260, PU),
        ...grid(1500, 880, 7, 3, 40, 14, BK),
        zig(120, 930, 480, PK),
        R(120, 196, 520, 52, BK, { radius: 26, name: "Tag pill" }),
        vmid(tag("HANDS-ON WORKSHOP  ·  3 HOURS", 120, 0, 520, { align: "center", color: YL, size: 22 }), 196, 52),
        hd("Creative\nConfidence", 120, 280, 1100, { size: 170, shadow: shadow(PK) }),
        tx("An idea workshop for people who say “I'm not creative”", 120, 650, 900, { size: 38 }),
        tag("WITH MO, JUNE & RAVI  ·  ROOM 4B", 120, 790, 1000, { size: 22 }),
      ], "Welcome! Today is about doing, not listening. By the end, every team will have a paper prototype and a two-minute pitch."],
      [BG, [
        squig(1560, 90, 240, PK),
        hd("Today's plan", 120, 110, 1200, { shadow: shadow(YL) }),
        ...[["01", "Warm-up", "30 circles in 3 minutes", "15 MIN"], ["02", "Make it weird", "Bad ideas on purpose", "40 MIN"], ["03", "Steal like an artist", "Remix three products", "40 MIN"], ["04", "Prototype", "Paper, tape and 20 minutes", "45 MIN"], ["05", "Show & tell", "Two minutes per team", "40 MIN"]].flatMap(([n, t, s, m], i) => {
          const x = 120 + i * 352, y = i % 2 ? 340 : 300, c = COLS[i], ink = c === PU ? WHITE : BK;
          return [...pop("rect", x, y, 320, 420, c, { radius: 18 }), hd(n, x + 28, y + 30, 260, { size: 96, color: ink }), T(t, x + 28, y + 160, 264, { family: "sans", bold: true, size: 36, color: ink, lh: 1.1 }), tx(s, x + 28, y + 250, 264, { size: 28, color: ink }), tag(m, x + 28, y + 360, 264, { size: 22, color: ink })];
        }),
        ...grid(160, 860, 12, 3, 40, 12, BK, 0.8),
      ], "Five rounds, three hours, one break after round three. Keep each round to time; the pressure helps."],
      [PU, [
        ...pop("ellipse", 1340, 160, 400, 400, YL),
        ...pop("triangle", 1500, 640, 260, 230, PK, { rot: -14 }),
        squig(1240, 760, 360, YL),
        ...grid(140, 120, 10, 3, 44, 14, WHITE, 0.5),
        hd("Round 2:\nMake it weird", 120, 330, 1200, { size: 150, color: WHITE, shadow: shadow(BK) }),
        tag("BAD IDEAS ARE WELCOME HERE", 120, 680, 900, { color: YL, size: 28 }),
      ], "Round two: make it weird. The goal is quantity and silliness; the good ideas hide behind the bad ones."],
      [BG, [
        ...pop("rect", 140, 160, 760, 760, PK, { radius: 0 }),
        F(176, 196, 688, 688, { border: { width: 6, color: BK }, name: "Photo" }),
        squig(820, 900, 200, CY2, -8),
        tag("WARM-UP", 1000, 200, 800, { color: PU }),
        hd("30 circles in\n3 minutes", 1000, 240, 820, { size: 84 }),
        tx("Turn as many circles as you can into something: a clock, a planet, a cookie. Don't judge and don't erase. Most people reach 12. The record is 30.", 1000, 450, 780),
        ...pop("ellipse", 1540, 720, 240, 240, YL),
        vmid(tag("TIP:\nQUANTITY\nFIRST", 1540, 0, 240, { align: "center", size: 26, lh: 1.25 }), 720, 240),
      ], "The warm-up gets hands moving before brains start judging. Show a photo of last session's circle sheets."],
      [BG, [
        hd("Ideas per round", 120, 100, 1200, { shadow: shadow(CY2) }),
        tx("Sticky notes on the wall after each round", 120, 210, 1000),
        R(140, 900, 1640, 8, BK, { name: "Baseline" }),
        ...[["ROUND 1", 12], ["ROUND 2", 27], ["ROUND 3", 41], ["ROUND 4", 19]].flatMap(([r, v], i) => {
          const h = Math.round((v / 41) * 520), x = 220 + i * 400, c = [CY2, YL, PK, PU][i];
          return [...pop("rect", x, 900 - h, 240, h, c), ...(i === 2 ? grid(x + 34, 900 - h + 34, 4, Math.floor((h - 40) / 56), 56, 14, BK, 0.3) : []), hd(String(v), x, 900 - h - 104, 240, { size: 80, align: "center" }), tag(r, x, 930, 240, { align: "center" })];
        }),
        tx("Round 4 is after voting: we keep the best 19.", 1420, 300, 400, { size: 28 }),
        E("arrow-curved", 1490, 416, 110, { c1: BK, rot: 90 }),
      ], "Ideas peak in round three, when people stop filtering. Round four is smaller on purpose: that's after the vote."],
      [BG, [
        hd("Workshop flow", 120, 100, 1200, { shadow: shadow(PK) }),
        ...[[200, 760], [560, 470], [920, 760], [1280, 470], [1640, 760]].slice(1).map(([x, y], i, a) => { const p = i ? a[i - 1] : [200, 760]; return seg(p[0], p[1], x, y, BK, 10, { name: "Flow line" }); }),
        ...[["0:00", "Warm-up", "Circles and doodles"], ["0:15", "Weird round", "Worst ideas first"], ["0:55", "Remix", "Steal from three products"], ["1:35", "Prototype", "Paper and tape"], ["2:20", "Show & tell", "Two minutes each"]].flatMap(([t, n, s], i) => {
          const x = 200 + i * 360, y = i % 2 ? 470 : 760, c = COLS[i], up = i % 2 === 1;
          return [...pop("ellipse", x - 60, y - 60, 120, 120, c), vmid(T(String(i + 1), x - 60, 0, 120, { family: "sans", bold: true, size: 48, color: c === PU ? WHITE : BK, align: "center" }), y - 60, 120), ...flow(up ? 250 : 840, tag(t, x - 160, 0, 320, { align: "center", color: PU }), 4, T(n, x - 160, 0, 320, { family: "sans", bold: true, size: 38, color: BK, align: "center" }), 4, tx(s, x - 160, 0, 320, { size: 26, align: "center" }))];
        }),
      ], "The whole session on one zigzag. The break sits between remix and prototype."],
      [BG, [
        hd("Your facilitators", 120, 100, 1400, { shadow: shadow(YL) }),
        ...[["Mo Adeyemi", "LEAD FACILITATOR", "Ran 200+ workshops; still can't draw hands."], ["June Park", "DESIGNER", "Prototypes everything in cardboard first."], ["Ravi Shah", "ENGINEER", "Believes every idea fits on a sticky note."]].flatMap(([n, r, s], i) => {
          const cx = 380 + i * 580, c = [PK, CY2, YL][i];
          return [C(cx - 170 + 18, 270 + 18, 340, 340, c, { name: "Colour disc" }), member(CAST, F(cx - 170, 270, 340, 340, { shape: "circle", border: { width: 6, color: BK }, name: "Portrait" }), n, r), hd(n, cx - 260, 670, 520, { size: 48, align: "center" }), tag(r, cx - 260, 734, 520, { align: "center", color: PU }), tx(s, cx - 230, 780, 460, { size: 28, align: "center" })];
        }),
      ], "Three facilitators, one per table group. Wave when you need tape, markers or a second opinion."],
      [YL, [
        ...pop("ellipse", 1500, 640, 300, 300, PK),
        ...pop("triangle", 160, 760, 220, 200, CY2, { rot: -12 }),
        squig(1500, 120, 280, PU),
        ...grid(140, 120, 8, 3, 44, 14, BK, 0.6),
        hd("“Every expert was once a beginner who kept drawing.”", 240, 330, 1300, { size: 100, lh: 1.05, shadow: shadow(PK) }),
        tag("MO ADEYEMI, LEAD FACILITATOR", 240, 700, 1000, { size: 26 }),
      ], "Mo's favourite line. Use it when someone says they can't draw."],
      [BG, [
        hd("Today in numbers", 120, 100, 1400, { shadow: shadow(CY2) }),
        ...[["120", "sticky notes used", PK], ["3", "hours, start to finish", CY2], ["1", "prototype per team", YL]].flatMap(([n, l, c], i) => {
          const x = 180 + i * 560;
          return [E("shape-blob", x + 14, 304, 400, { c1: BK, name: "Blob shadow" }), E("shape-blob", x, 290, 400, { c1: c }), vmid(hd(n, x, 0, 400, { size: 150, align: "center" }), 290, 400), tx(l, x, 740, 400, { size: 36, align: "center", bold: true })];
        }),
      ], "Three numbers to close the loop. Ask each team to photograph their prototype before they leave."],
      [BG, [
        ...pop("ellipse", 1360, 140, 360, 360, PK),
        ...pop("rect", 1500, 600, 240, 240, CY2, { rot: 12 }),
        squig(1160, 820, 300, PU),
        zig(120, 940, 520, YL),
        hd("Keep\nmaking!", 120, 200, 1100, { size: 180, shadow: shadow(YL) }),
        tx("mo@ideaworks.example\nSlides and templates: ideaworks.example/kit\nNext session: Wednesday 3 December", 120, 620, 1000, { size: 34, lh: 1.6 }),
      ], "Thank everyone. Templates and slides are on the kit page, and the next open session is on 3 December."],
    ];
  });

  /* 15 ─ Japanese minimal · UX research ───────────────────────────────────────────────── */
  deck("japanese-minimal-ux-research-dk2", "Japanese minimal UX research", P169, "ux research user study findings interviews onboarding usability minimal japanese", (W, H) => {
    const WA = "#f6f3ec", SUMI = "#1f1f1f", VER = "#c8372d", GR = "#8a8780", HAIR = "#d6d0c4", BODY = "#4a4844";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "serif", size: 72, color: SUMI, lh: 1.25, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 28, color: BODY, lh: 1.6, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", size: 18, color: GR, ls: 6, ...o });
    const hair = (x, y, w, c = HAIR) => R(x, y, w, 2, c, { name: "Hairline" });
    const seal = (x, y, s = 72) => [R(x, y, s, s, VER, { radius: 6, name: "Seal" }), vmid(T("UX", x, 0, s, { family: "serif", bold: true, size: Math.round(s * 0.4), color: WA, align: "center" }), y, s)];
    const folio = (n) => [hair(200, 1000, 1520), lab(String(n).padStart(2, "0") + " / 10", 1520, 1016, 200, { align: "right" }), lab("ONBOARDING STUDY", 200, 1016, 600)];
    return [
      [WA, [
        C(1180, 240, 440, 440, VER, { name: "Red sun" }),
        R(200, 180, 2, 720, HAIR, { name: "Hairline" }),
        lab("UX RESEARCH  ·  ONBOARDING STUDY  ·  NOVEMBER 2026", 260, 180, 1000),
        hd("Listening to\nfirst-time users", 260, 620, 1000, { size: 96 }),
        tx("Findings from eight interviews and two weeks of session recordings", 260, 880, 900, { size: 26, color: GR }),
        ...seal(1648, 828),
      ], "A short read-out of our onboarding study. One idea runs through all of it: new users want to see their own work, fast."],
      [WA, [
        lab("CONTENTS", 260, 160, 600),
        hd("What this covers", 260, 200, 900, { size: 64 }),
        ...[["01", "Why we looked"], ["02", "Who we spoke to"], ["03", "What we heard"], ["04", "Where people struggle"], ["05", "What we recommend"]].flatMap(([n, t], i) => {
          const y = 360 + i * 116;
          return [i === 0 ? C(214, y + 22, 14, 14, VER, { name: "Current marker" }) : null, T(n, 260, y + 8, 80, { family: "serif", size: 28, color: VER }), hd(t, 360, y, 860, { size: 44 }), hair(260, y + 90, 960)];
        }),
        F(1400, 160, 300, 760, { name: "Photo" }),
        ...folio(2),
      ], "Five parts. The recommendations at the end are short; most of the time goes on what we heard."],
      [WA, [
        C(-240, 140, 800, 800, VER, { name: "Red sun" }),
        lab("PART THREE", 900, 400, 800),
        hd("What we heard", 900, 440, 900, { size: 110 }),
        R(900, 620, 120, 3, VER, { name: "Red rule" }),
        tx("Patterns from eight conversations, in the participants' own words.", 900, 660, 760, { color: GR }),
      ], "Part three: what we heard. Quotes are lightly edited for length, never for meaning."],
      [WA, [
        F(260, 140, 440, 800, { name: "Photo" }),
        lab("FINDING 01", 860, 200, 800),
        hd("People skip the tour,\nthen feel lost.", 860, 240, 900, { size: 64 }),
        tx("Most participants closed the welcome tour straight away. Ten minutes later they could not find the import button the tour would have shown them.", 860, 440, 800),
        hair(860, 720, 860),
        T("6 / 8", 860, 750, 260, { family: "serif", size: 80, color: VER }),
        tx("participants closed the tour in under five seconds", 1140, 766, 560, { color: GR }),
      ], "Finding one. Use a calm, simple photo here: a hand on a phone, or the empty first screen."],
      [WA, [
        lab("TASK SUCCESS", 260, 140, 800),
        hd("How far people got, first session", 260, 180, 1400, { size: 60 }),
        ...[["Create an account", 92], ["Import contacts", 48], ["Set a first goal", 75], ["Invite a teammate", 33], ["Turn on reminders", 81]].flatMap(([t, v], i) => {
          const y = 380 + i * 120, len = Math.round((v / 100) * 900), c = v < 50 ? VER : SUMI;
          return [vmid(tx(t, 260, 0, 440, { color: SUMI }), y - 22, 44), hair(740, y - 1, 900), R(740, y - 2, len, 4, c, { name: "Stem" }), C(740 + len - 14, y - 14, 28, 28, c, { name: "Dot" }), vmid(T(v + "%", 1670, 0, 120, { family: "serif", size: 36, color: c, align: "right" }), y - 22, 44)];
        }),
        lab("8 PARTICIPANTS  ·  MODERATED SESSIONS  ·  OCTOBER 2026", 260, 960, 1200),
      ], "Two tasks stand out in red: importing contacts and inviting a teammate. Both happen after the tour most people skipped."],
      [WA, [
        lab("METHOD", 260, 140, 800),
        hd("How the study ran", 260, 180, 1400, { size: 64 }),
        hair(260, 540, 1400),
        ...[["WEEK 1", "Recruit", "Eight people new to the app, mixed roles."], ["WEEK 2", "Interview", "Sixty-minute sessions, thinking aloud."], ["WEEK 3", "Synthesise", "An affinity map of 340 notes."], ["WEEK 4", "Share", "A read-out and three decisions."]].flatMap(([w, t, s], i) => {
          const x = 260 + i * 466;
          return [C(x - 12, 529, 24, 24, i === 3 ? VER : SUMI, { name: "Point" }), lab(w, x - 180, 470, 360, { align: "center" }), hd(t, x - 180, 590, 360, { size: 44, align: "center" }), tx(s, x - 170, 660, 340, { size: 26, align: "center", color: GR })];
        }),
        ...folio(6),
      ], "Four weeks from recruiting to read-out. The synthesis week matters most; don't skip it."],
      [WA, [
        lab("RESEARCH TEAM", 260, 140, 800),
        hd("Who listened", 260, 180, 1400, { size: 64 }),
        ...[["Emi Tanaka", "LEAD RESEARCHER"], ["Daniel Osei", "PRODUCT DESIGNER"], ["Sara Lind", "PRODUCT MANAGER"]].flatMap(([n, r], i) => {
          const x = 380 + i * 460;
          return [member(CAST, F(x, 320, 300, 520, { name: "Portrait" }), n, r), hd(n, x, 868, 360, { size: 40 }), lab(r, x, 930, 360)];
        }),
      ], "Three people ran every session: one interviewer, one note-taker, one observer."],
      [WA, [
        C(930, 220, 60, 60, VER, { name: "Red dot" }),
        hd("“I didn't want a tour. I wanted to see my own stuff in there.”", 360, 360, 1200, { size: 64, align: "center", lh: 1.4 }),
        R(900, 640, 120, 3, VER, { name: "Red rule" }),
        lab("PARTICIPANT 6  ·  DESIGNER  ·  34", 360, 680, 1200, { align: "center" }),
      ], "The line that summed up the study. Let it sit for a moment before moving on."],
      [WA, [
        lab("THE KEY NUMBER", 260, 140, 800),
        T("5 of 8", 240, 220, 1000, { family: "serif", size: 240, color: SUMI, lh: 1.1 }),
        tx("participants gave up at the import step and never saw their own data.", 260, 520, 860, { size: 34, color: SUMI }),
        R(1320, 220, 2, 560, HAIR, { name: "Hairline" }),
        ...[["11 min", "average time to first value"], ["3", "fixes tested in prototypes"]].flatMap(([a, b], i) => [T(a, 1400, 240 + i * 280, 400, { family: "serif", size: 90, color: i ? SUMI : VER }), tx(b, 1400, 360 + i * 280, 380, { color: GR })]),
        ...folio(9),
      ], "Five of eight never reached their own data. That is the problem the three recommendations solve."],
      [WA, [
        C(900, 200, 120, 120, VER, { name: "Red sun" }),
        hd("Thank you", 360, 400, 1200, { size: 120, align: "center" }),
        hair(860, 600, 200),
        lab("EMI.TANAKA@COMPANY.EXAMPLE", 360, 650, 1200, { align: "center" }),
        tx("Full report and recordings are in the research library.", 360, 700, 1200, { align: "center", color: GR }),
        ...seal(924, 860),
      ], "Thank you. Recordings and the full report are in the research library; ask Emi for access."],
    ];
  });

  /* 16 ─ Geometric pattern borders · annual report ─────────────────────────────────────── */
  deck("geometric-border-annual-report-dk2", "Geometric pattern annual report", P169, "annual report foundation charity education year review results geometric pattern border", (W, H) => {
    const SAND = "#f5eddc", EMR = "#0e4d45", TERR = "#c4673d", OCH = "#d6a03f", INK = "#1c2b28", LT = "#e2d5b8";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "cambria", bold: true, size: 80, color: EMR, lh: 1.1, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 30, color: INK, lh: 1.45, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", bold: true, size: 22, color: TERR, ls: 5, ...o });
    // Eight-point star made of two squares (one turned 45°).
    const khatam = (cx, cy, s, c, o = {}) => { const a = s * 0.72; return [R(cx - a / 2, cy - a / 2, a, a, c, { name: "Star square", ...o }), R(cx - a / 2, cy - a / 2, a, a, c, { name: "Star square", ...o, rot: 45 })]; };
    const diamond = (cx, cy, s, c) => R(cx - s / 2, cy - s / 2, s, s, c, { rot: 45, name: "Diamond" });
    const frieze = (x, y, w, s, c1, c2) => {
      const n = Math.floor(w / s), out = [R(x, y, w, 3, c1, { name: "Rule" }), R(x, y + s + 21, w, 3, c1, { name: "Rule" })];
      for (let i = 0; i < n; i++) { const cx = x + (i + 0.5) * (w / n), cy = y + 12 + s / 2; out.push(...(i % 2 ? [diamond(cx, cy, s * 0.36, c2)] : khatam(cx, cy, s * 0.8, c1))); }
      return out;
    };
    const arch = (x, y, w, h, c) => E("shape-arch", x, y, w, { h, c1: c });
    return [
      [EMR, [
        ...frieze(0, 40, W, 48, OCH, SAND), ...frieze(0, H - 112, W, 48, OCH, SAND),
        lab("OASIS LEARNING FOUNDATION", 140, 300, 900, { color: OCH }),
        hd("Annual\nreport 2026", 140, 350, 900, { size: 130, color: SAND }),
        tx("A year of classrooms, libraries and second chances", 140, 670, 800, { color: "#cfe0da", size: 34 }),
        arch(1160, 170, 560, 740, SAND),
        F(1280, 330, 320, 520, { shape: "rounded", radius: 160, name: "Photo" }),
        ...khatam(1440, 236, 44, OCH),
      ], "Welcome to our 2026 annual report. It was our biggest year yet, and every number in it belongs to our donors and teachers."],
      [SAND, [
        R(0, 0, 120, H, EMR, { name: "Side band" }),
        ...Array.from({ length: 13 }, (_, i) => (i % 2 ? [diamond(60, 60 + i * 80, 16, SAND)] : khatam(60, 60 + i * 80, 36, OCH))).flat(),
        lab("CONTENTS", 220, 120, 800),
        hd("In this report", 220, 160, 1000),
        ...[["A message from our director", "3"], ["Our year in numbers", "4"], ["Programmes", "5"], ["Milestones of 2026", "6"], ["Our people", "7"], ["Thank you", "10"]].flatMap(([t, p], i) => {
          const y = 310 + i * 112;
          return [...khatam(244, y + 30, 34, TERR), T(t, 290, y + 2, 740, { family: "cambria", bold: true, size: 44, color: EMR }), T(p, 1060, y + 6, 100, { family: "cambria", size: 38, color: TERR, align: "right" }), R(220, y + 86, 940, 2, LT, { name: "Rule" })];
        }),
        arch(1300, 200, 460, 720, EMR),
        F(1395, 380, 270, 460, { shape: "rounded", radius: 135, name: "Photo" }),
      ], "What's inside. The director's message is short; the programme pages carry the stories."],
      [TERR, [
        ring(1440, 540, 330, SAND, 4, { op: 0.5 }), ring(1440, 540, 400, SAND, 2, { op: 0.35 }),
        ...khatam(1440, 540, 560, SAND, { op: 0.2 }), ...khatam(1440, 540, 400, SAND, { op: 0.35 }), ...khatam(1440, 540, 240, SAND),
        C(1390, 490, 100, 100, TERR, { name: "Centre" }),
        lab("SECTION 3", 140, 380, 800, { color: SAND }),
        hd("Our\nprogrammes", 140, 430, 900, { size: 130, color: WHITE }),
        tx("Reading rooms, teacher grants and scholarships", 140, 740, 800, { color: "#fbe5d6" }),
      ], "Section three: our programmes. Three of them carried most of the year's work."],
      [SAND, [
        arch(140, 120, 640, 860, EMR),
        F(290, 330, 340, 560, { shape: "rounded", radius: 170, name: "Photo" }),
        ...khatam(460, 210, 40, OCH),
        lab("PROGRAMME 01", 900, 220, 880),
        ...flow(260, hd("Reading rooms in 40 villages", 900, 0, 880, { size: 72 }), 42, tx("Each room has 1,500 books, a trained librarian and a weekly story hour. Attendance at partner schools rose by 18% in the first year.", 900, 0, 860)),
        ...[["40", "reading rooms"], ["60,000", "books on shelves"], ["18%", "higher attendance"]].flatMap(([a, b], i) => [...khatam(930, 734 + i * 80, 30, TERR), T(a, 970, 714 + i * 80, 230, { family: "cambria", bold: true, size: 44, color: EMR }), tx(b, 1220, 720 + i * 80, 500)]),
      ], "Programme one: reading rooms. Use a photo of children in one of the rooms, with consent from their school."],
      [SAND, [
        lab("STUDENTS SUPPORTED", 140, 110, 900),
        hd("Five years of growth", 140, 150, 1400),
        ...[["2022", 4.1], ["2023", 5.6], ["2024", 7.2], ["2025", 9.0], ["2026", 11.4]].flatMap(([yr, v], i) => {
          const y = 320 + i * 120, len = Math.round((v / 11.4) * 1060), c = i === 4 ? TERR : EMR;
          return [vmid(T(yr, 140, 0, 200, { family: "cambria", bold: true, size: 44, color: INK }), y, 64), R(380, y, len, 64, c, { name: yr + " bar" }), ...khatam(380 + len, y + 32, 84, OCH), vmid(T(v.toFixed(1) + "k", 380 + len + 60, 0, 200, { family: "cambria", bold: true, size: 44, color: c }), y, 64)];
        }),
        ...frieze(0, H - 84, W, 40, OCH, TERR),
      ], "Students supported each year, in thousands. We nearly tripled in five years without losing quality."],
      [SAND, [
        lab("2026", 140, 110, 900),
        hd("Milestones of the year", 140, 150, 1400),
        R(160, 600, 1600, 4, EMR, { name: "Timeline" }),
        ...[["FEB", "Library bus", "A mobile library starts weekly rounds."], ["APR", "Teacher fund", "120 teachers get training grants."], ["JUN", "40th reading room", "Opened in Wadi Saba."], ["SEP", "Girls in science", "Scholarships for 300 students."], ["DEC", "Digital lab", "Laptops for twelve schools."]].flatMap(([m, t, s], i) => {
          const x = 200 + i * 380, c = [EMR, TERR, OCH, EMR, TERR][i];
          return [F(x - 140, 290, 280, 200, { shape: "rounded", radius: 100, name: "Photo" }), diamond(x, 602, 44, c), lab(m, x - 170, 520, 340, { align: "center", color: c === OCH ? "#9a6f1e" : c }), hd(t, x - 170, 650, 340, { size: 40, align: "center" }), tx(s, x - 160, 710, 320, { size: 28, align: "center" })];
        }),
        ...frieze(0, H - 84, W, 40, OCH, TERR),
      ], "Five milestones. The 40th reading room in June was the one our founders had set as a ten-year goal."],
      [SAND, [
        lab("OUR PEOPLE", 140, 110, 900),
        hd("Board and leadership", 140, 150, 1400),
        ...[["Layla Haddad", "DIRECTOR"], ["Omar Nasser", "CHAIR OF THE BOARD"], ["Sofia Ruiz", "HEAD OF PROGRAMMES"], ["Karim Aziz", "FINANCE DIRECTOR"]].flatMap(([n, r], i) => {
          const x = 160 + i * 420;
          return [arch(x, 270, 320, 440, i % 2 ? TERR : EMR), member(CAST, F(x + 70, 370, 180, 290, { shape: "rounded", radius: 90, name: "Portrait" }), n, r), hd(n, x - 20, 740, 360, { size: 38, align: "center" }), lab(r, x - 20, 790, 360, { align: "center" })];
        }),
      ], "The people who steer the foundation. All board members serve as volunteers."],
      [EMR, [
        R(240, 140, 1440, 800, "none", { stroke: OCH, sw: 4, name: "Frame" }),
        R(262, 162, 1396, 756, "none", { stroke: OCH, sw: 1.5, name: "Inner frame" }),
        ...[[240, 140], [1680, 140], [240, 940], [1680, 940]].flatMap(([x, y]) => khatam(x, y, 70, OCH)),
        ...khatam(960, 290, 60, OCH),
        T("“A book in a child's hands is the first door we open. Everything else follows.”", 360, 380, 1200, { family: "cambria", italic: true, size: 64, color: SAND, align: "center", lh: 1.3 }),
        lab("LAYLA HADDAD, DIRECTOR", 360, 720, 1200, { align: "center", color: OCH }),
      ], "Layla's words from the opening of the 40th reading room."],
      [SAND, [
        lab("2026 AT A GLANCE", 140, 110, 900),
        hd("The year in four numbers", 140, 150, 1400),
        ...[["11,400", "students supported", EMR], ["40", "reading rooms", TERR], ["120", "teachers trained", OCH], ["$2.3M", "raised from 3,100 donors", EMR]].flatMap(([n, l, c], i) => {
          const x = 140 + i * 430;
          return [S("polygon", x, 300, 380, 380, c, { sides: 8, name: "Octagon" }), S("polygon", x + 20, 320, 340, 340, "none", { sides: 8, stroke: SAND, sw: 3, name: "Octagon line" }), vmid(T(n, x, 0, 380, { family: "cambria", bold: true, size: 84, color: c === OCH ? INK : SAND, align: "center" }), 300, 380), tx(l, x, 720, 380, { align: "center", bold: true, color: EMR })];
        }),
        ...frieze(0, H - 84, W, 40, OCH, TERR),
      ], "Four numbers for the year. Every dollar raised went further this year thanks to our volunteer teachers."],
      [EMR, [
        ...frieze(0, 40, W, 48, OCH, SAND), ...frieze(0, H - 112, W, 48, OCH, SAND),
        ...khatam(960, 300, 90, OCH),
        hd("Thank you to every donor", 160, 380, 1600, { size: 96, color: SAND, align: "center" }),
        tx("oasislearning.example  ·  info@oasislearning.example  ·  +971 4 555 0190", 160, 560, 1600, { align: "center", color: "#cfe0da" }),
        lab("GIVE A READING ROOM IN 2027", 160, 650, 1600, { align: "center", color: OCH }),
      ], "Close with thanks and next year's ask: each new reading room costs about 18,000 dollars."],
    ];
  });

  /* 17 ─ Festival poster · town hall ──────────────────────────────────────────────────── */
  deck("festival-poster-town-hall-dk2", "Festival poster town hall", P169, "town hall all hands company meeting team update leadership festival poster", (W, H) => {
    const PUR = "#2a0e57", ORN = "#ff6a13", YLW = "#ffd21f", CRM = "#fff2d8", PNK = "#ff4f8b", DPU = "#3d1878", LOR = "#ff8a45";
    const big = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 120, color: CRM, lh: 0.9, ...o });
    const ital = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "serif", italic: true, size: 44, color: YLW, lh: 1.2, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", size: 30, color: CRM, lh: 1.4, ...o });
    const mono = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", bold: true, size: 24, color: YLW, ls: 2, ...o });
    // Sunburst: thin triangles pointing at (cx, cy), starting r0 from the centre.
    const burst = (cx, cy, n, len, wid, c, op = 1, r0 = 0) => Array.from({ length: n }, (_, i) => {
      const a = (360 / n) * i, rad = (a * Math.PI) / 180, d = r0 + len / 2;
      // Skip rays that would fall completely outside the page.
      const seen = Array.from({ length: 11 }, (_, k) => [cx + Math.sin(rad) * (r0 + (k / 10) * len), cy - Math.cos(rad) * (r0 + (k / 10) * len)]).some(([x, y]) => x >= 0 && x <= W && y >= 0 && y <= H);
      return seen ? S("triangle", cx + Math.sin(rad) * d - wid / 2, cy - Math.cos(rad) * d - len / 2, wid, len, c, { rot: a + 180, op, name: "Sun ray" }) : null;
    }).filter(Boolean);
    const star = (x, y, s, c) => S("star", x, y, s, s, c, { name: "Star" });
    const ticket = (x, y, w, h, c, bgc) => [R(x, y, w, h, c, { radius: 6, name: "Ticket" }), C(x - h * 0.18, y + h * 0.32, h * 0.36, h * 0.36, bgc, { name: "Notch" }), C(x + w - h * 0.18, y + h * 0.32, h * 0.36, h * 0.36, bgc, { name: "Notch" }), ...grid(x + 70, y + 10, 1, Math.max(1, Math.floor((h - 20) / 16)), 16, 6, bgc, 0.6)];
    return [
      [PUR, [
        ...burst(960, 1180, 24, 1500, 260, DPU),
        C(600, 820, 720, 720, ORN, { name: "Sun" }),
        star(200, 180, 80, YLW), star(1660, 300, 60, PNK), star(1500, 140, 40, YLW), star(320, 620, 50, PNK),
        ital("Brightline presents", 160, 130, 1600, { align: "center" }),
        big("SPRING\nTOWN HALL", 160, 210, 1600, { size: 190, align: "center", lh: 0.88 }),
        mono("THURSDAY 12 MARCH  ·  10:00  ·  MAIN HALL + LIVE STREAM", 160, 590, 1600, { align: "center", size: 28 }),
        tx("CEO update  /  Product on stage  /  People & culture  /  Open Q&A", 160, 650, 1600, { align: "center", size: 34 }),
        big("2027", 760, 900, 400, { color: PUR, align: "center" }),
      ], "Welcome to the spring town hall. Treat it like a festival line-up: short sets, big moments, and Q&A as the closing act."],
      [PUR, [
        R(40, 40, W - 80, H - 80, "none", { stroke: YLW, sw: 4, name: "Poster border" }),
        mono("THE LINE-UP", 160, 100, 1600, { align: "center", size: 28 }),
        ital("in order of appearance", 160, 140, 1600, { align: "center", size: 36, color: CRM }),
        star(250, 250, 90, PNK), star(1580, 250, 90, PNK),
        big("CEO UPDATE", 160, 240, 1600, { size: 150, align: "center", color: YLW }),
        mono("10:15  ·  ANA RUIZ", 160, 392, 1600, { align: "center", color: CRM }),
        big("PRODUCT ON STAGE", 160, 470, 1600, { size: 96, align: "center" }),
        mono("10:45  ·  BEN CHO AND TEAM", 160, 568, 1600, { align: "center", color: CRM }),
        big("PEOPLE & CULTURE", 160, 646, 1600, { size: 80, align: "center", color: LOR }),
        mono("11:15  ·  DEV OKAFOR", 160, 728, 1600, { align: "center", color: CRM }),
        big("OPEN Q&A", 160, 806, 1600, { size: 72, align: "center", color: PNK }),
        mono("11:40  ·  EVERYONE", 160, 880, 1600, { align: "center", color: CRM }),
      ], "The running order as a festival line-up. Ana headlines; Q&A closes the show."],
      [ORN, [
        ...burst(1400, 540, 28, 900, 160, LOR, 1, 240),
        C(1160, 300, 480, 480, PUR, { name: "Sun" }),
        big("II", 1160, 0, 480, { size: 260, color: YLW, align: "center", lh: 1 }),
        big("ACT II", 140, 300, 900, { size: 90, color: PUR }),
        big("PRODUCT\nON STAGE", 140, 410, 980, { size: 150, color: PUR }),
        ital("Three teams, three demos, ten minutes each", 140, 720, 900, { color: PUR }),
      ].map((l) => (l.name === "II" ? vmid(l, 300, 480) : l)), "Act two: the product teams take the stage. Keep demos live and short."],
      [PUR, [
        ...burst(540, 540, 32, 150, 46, YLW, 1, 390),
        F(160, 160, 760, 760, { shape: "circle", name: "Photo" }),
        mono("MAIN STAGE", 1080, 180, 760),
        big("WHAT WE\nSHIPPED", 1080, 220, 760, { size: 120 }),
        ...["Brightline Go, our new mobile app", "Faster checkout in 14 markets", "Dark mode, finally"].flatMap((s, i) => [star(1080, 520 + i * 100, 44, i === 1 ? PNK : YLW), vmid(tx(s, 1150, 0, 700, { size: 34 }), 520 + i * 100, 44)]),
        ital("Thank you to every team who stayed late for these.", 1080, 860, 760, { size: 32 }),
      ], "What we shipped this quarter. Put a launch-day photo in the circle and let the product leads take the cheers."],
      [PUR, [
        big("YOUR VOTES", 140, 110, 1200, { size: 100, color: YLW }),
        ital("Next quarter's focus, from 412 votes", 140, 210, 1200, { color: CRM }),
        ...[["Faster support", 38, YLW], ["Mobile app", 27, PNK], ["New markets", 21, LOR], ["Team offsite", 14, CRM]].flatMap(([l, v, c], i) => {
          const y = 340 + i * 150, len = Math.round((v / 38) * 1200);
          return [...ticket(140, y, len, 100, c, PUR), vmid(T(l, 240, 0, Math.max(300, len - 120), { family: "sans", bold: true, size: 34, color: PUR }), y, 100), vmid(big(v + "%", 140 + len + 40, 0, 260, { size: 72, color: c }), y, 100)];
        }),
      ], "Your votes for next quarter. Faster support won clearly, so it gets its own team in Q2."],
      [PUR, [
        big("RUNNING ORDER", 140, 110, 1600, { size: 100, color: YLW }),
        R(0, 380, W, 8, ORN, { name: "Stage line" }),
        ...[["10:00", "DOORS", "Coffee and pastries in the atrium."], ["10:15", "CEO", "Ana on the year so far."], ["10:45", "PRODUCT", "Demos from three teams."], ["11:15", "PEOPLE", "Benefits, hiring and awards."], ["11:40", "Q&A", "Ask anything, anonymous too."]].flatMap(([t, n, s], i) => {
          const x = 120 + i * 344, cx = x + 160;
          return [star(cx - 32, 352, 64, i === 4 ? PNK : YLW), mono(t, x, 470, 320, { size: 48, align: "center" }), big(n, x, 550, 320, { size: 62, align: "center" }), tx(s, x + 10, 640, 300, { align: "center", size: 32 })];
        }),
        R(560, 840, 800, 4, ORN, { name: "Rule" }),
        ital("Live stream and captions for every set.", 140, 880, 1640, { align: "center", color: CRM }),
      ], "The full running order. We finish at noon on the dot so people can make lunch."],
      [DPU, [
        big("ON STAGE TODAY", 140, 110, 1600, { size: 100, color: YLW }),
        ...[["Ana Ruiz", "Chief executive"], ["Ben Cho", "Head of product"], ["Dev Okafor", "People & culture"], ["Mia Lund", "Host & Q&A"]].flatMap(([n, r], i) => {
          const cx = 300 + i * 440;
          return [ring(cx, 530, 200, i % 2 ? PNK : YLW, 8), member(CAST, F(cx - 180, 350, 360, 360, { shape: "circle", name: "Portrait" }), n, r), star(cx + 110, 330, 76, i % 2 ? YLW : PNK), big(n, cx - 210, 780, 420, { size: 56, align: "center" }), ital(r, cx - 210, 846, 420, { size: 34, align: "center" })];
        }),
      ], "Today's speakers. Mia hosts and runs the Q&A, including anonymous questions from the stream."],
      [ORN, [
        ...burst(960, 1080, 30, 1300, 140, LOR, 1, 300),
        C(660, 780, 600, 600, YLW, { name: "Sun" }),
        T("“", 160, 90, 300, { family: "serif", bold: true, size: 280, color: PUR, lh: 0.8 }),
        big("We grew because every team said yes to hard things. Let's keep saying it.", 160, 330, 1600, { size: 92, color: PUR, lh: 1.0, align: "center" }),
        mono("ANA RUIZ, CHIEF EXECUTIVE", 160, 660, 1600, { align: "center", color: PUR, size: 28 }),
      ], "Ana's closing line from her update. Pause, then hand over to the product teams."],
      [PUR, [
        ...burst(1500, 540, 20, 700, 120, DPU, 1, 120),
        big("THIS YEAR\nSO FAR", 140, 120, 900, { size: 110, color: CRM }),
        ...[["312", "PEOPLE", YLW], ["9", "OFFICES", PNK], ["1", "BIG LAUNCH", LOR]].flatMap(([n, l, c], i) => {
          const y = 400 + i * 200;
          return [big(n, 140, y, 360, { size: 190, color: c, lh: 0.85 }), vmid(big(l, 520, 0, 900, { size: 72 }), y, 160)];
        }),
      ], "Three numbers: 312 people, nine offices and one big launch."],
      [PUR, [
        ...burst(960, 1180, 24, 1500, 260, DPU),
        C(600, 820, 720, 720, PNK, { name: "Sun" }),
        star(220, 220, 70, YLW), star(1620, 200, 90, YLW), star(1480, 520, 40, PNK),
        big("SEE YOU AT THE\nAFTER-PARTY", 160, 200, 1600, { size: 140, align: "center", color: YLW }),
        ital("Rooftop terrace  ·  17:30  ·  bring your badge", 160, 480, 1600, { align: "center", color: CRM }),
        mono("QUESTIONS AFTER TODAY: TOWNHALL@BRIGHTLINE.EXAMPLE", 160, 580, 1600, { align: "center", size: 26 }),
      ], "Thank everyone, point them to the after-party and the inbox for questions we didn't get to."],
    ];
  });

  /* 18 ─ Sunset gradient · book report ───────────────────────────────────────────────── */
  deck("sunset-book-report-dk2", "Sunset gradient book report", P169, "book report novel reading literature english class student review sunset gradient", (W, H) => {
    const DEEP = "#3a1840", SUN = "#fff0c4", SEA = "#4a1f5c", COR = "#ff8a5c", ROSE = "#c94f7c", SOFT = "#ffe3c9", MUT = "#7b4a6b";
    const LIGHT = ["#fff4e8", "#ffd4bf", 180], DUSK = ["#ffc98b", "#c94f7c", 180], NIGHT = ["#3b1e5f", "#ff8a5c", 180];
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "serif", italic: true, size: 84, color: DEEP, lh: 1.1, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", size: 30, color: DEEP, lh: 1.5, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 22, color: ROSE, ls: 5, ...o });
    const glow = (cx, y, n = 6, c = "#ffd98a") => Array.from({ length: n }, (_, k) => { const w = 260 - k * 40; return R(cx - w / 2, y + k * 40, w, 12, c, { radius: 6, op: 0.75 - k * 0.08, name: "Reflection" }); });
    const horizon = (y, sunR, cx = 960) => [C(cx - sunR, y - sunR * 1.3, sunR * 2, sunR * 2, SUN, { name: "Sun" }), R(0, y, W, H - y, SEA, { name: "Sea" }), ...glow(cx, y + 40)];
    return [
      [DUSK, [
        ...horizon(640, 200),
        lab("A NOVEL BY MARA ELLISON", 160, 100, 1600, { align: "center", color: DEEP }),
        hd("The Salt Lantern", 160, 140, 1600, { size: 150, align: "center" }),
        tx("A book report by Jonah Whitfield  ·  English 10", 160, 920, 1600, { align: "center", color: SOFT, size: 34 }),
      ], "My book report on The Salt Lantern. If you are using this template, swap in your own book; the layout works for any novel."],
      [LIGHT, [
        lab("CONTENTS", 160, 140, 900),
        hd("What I'll cover", 160, 180, 1000),
        ...["The story in one minute", "Setting: a lighthouse town", "Main characters", "Themes: memory and the sea", "My verdict"].flatMap((s, i) => {
          const y = 360 + i * 120;
          return [C(160, y + 14, 36, 36, [COR, ROSE, COR, ROSE, COR][i], { name: "Sun dot" }), T(s, 230, y, 900, { family: "serif", italic: true, size: 48, color: DEEP }), R(230, y + 80, 760, 2, COR, { op: 0.4, name: "Rule" })];
        }),
        F(1260, 140, 500, 780, { shape: "rounded", radius: 250, name: "Photo" }),
      ], "Five parts, about eight minutes. The verdict is at the end, so no spoilers until then."],
      [NIGHT, [
        ...horizon(760, 180),
        lab("PART II", 160, 220, 1600, { align: "center", color: SOFT }),
        hd("The characters", 160, 270, 1600, { size: 140, align: "center", color: WHITE }),
        tx("Three people, one lighthouse and a very long summer", 160, 460, 1600, { align: "center", color: SOFT }),
      ], "Part two: the characters. Each one stands for a different way of holding on to the past."],
      [LIGHT, [
        F(200, 140, 520, 780, { shape: "rounded", radius: 18, name: "Book cover" }),
        lab("THE STORY IN ONE MINUTE", 860, 170, 900),
        ...flow(214, hd("A keeper's daughter and a light that won't go out", 860, 0, 900, { size: 64 }), 48, tx("Sixteen-year-old Nell Arden keeps her late father's lighthouse running after the town votes to switch it off. Over one stormy summer she learns why the light mattered, and to whom.", 860, 0, 880)),
        R(860, 760, 900, 2, COR, { op: 0.5, name: "Rule" }),
        ...[["2019", "published"], ["312", "pages"], ["Coming of age", "genre"]].flatMap(([a, b], i) => [hd(a, 860 + i * 300, 790, 290, { size: 44 }), lab(b.toUpperCase(), 860 + i * 300, 852, 290, { color: MUT })]),
      ], "The plot in one breath. Put a photo of the cover in the frame."],
      [["#2d1650", "#7a2f6f", 180], [
        lab("TENSION ACROSS THE BOOK", 160, 110, 1200, { color: SOFT }),
        hd("How the story builds", 160, 150, 1400, { color: WHITE }),
        R(160, 900, 1600, 3, SOFT, { op: 0.6, name: "Baseline" }),
        ...[2, 3, 3, 5, 4, 6, 7, 5, 8, 9, 10, 6].flatMap((v, i) => {
          const h = v * 54, x = 190 + i * 130, c = ["#ffcf8a", "#ffc07d", "#ffb070", "#ffa066", "#ff905e", "#ff8058", "#f97056", "#ee6158", "#e0545d", "#d14a66", "#c2456f", "#b14277"][i];
          return [R(x, 900 - h, 90, h, c, { radius: 12, name: "Chapter bar" }), T("Ch " + (i * 2 + 1) + "–" + (i * 2 + 2), x - 20, 916, 130, { family: "sans", size: 20, color: SOFT, align: "center" })];
        }),
        tx("The storm", 1400, 290, 300, { color: SUN, bold: true, align: "center" }),
        R(1548, 340, 3, 30, SUN, { name: "Pointer" }),
      ], "My own tension score for each pair of chapters, from one to ten. The storm in chapters 21 and 22 is the peak."],
      [LIGHT, [
        lab("PLOT TIMELINE", 160, 110, 900),
        hd("Five turning points", 160, 150, 1400),
        R(120, 600, 1680, 3, ROSE, { op: 0.6, name: "Horizon" }),
        ...[["Ch. 1", "The vote", "The town decides to switch off the light."], ["Ch. 6", "The logbook", "Nell finds her father's secret log."], ["Ch. 12", "The stranger", "A sailor washes up after a storm."], ["Ch. 21", "The storm", "Nell keeps the light burning all night."], ["Ch. 24", "Morning", "The town votes again."]].flatMap(([c, t, s], i) => {
          const cx = 280 + i * 340, r = i === 3 ? 48 : 32;
          return [C(cx - r, 601 - r, 2 * r, 2 * r, i === 3 ? COR : SUN, { stroke: COR, sw: 4, name: "Sun marker" }), lab(c.toUpperCase(), cx - 160, 420, 320, { align: "center" }), hd(t, cx - 160, 460, 320, { size: 50, align: "center" }), tx(s, cx - 150, 680, 300, { align: "center", size: 30, color: MUT })];
        }),
        R(560, 880, 800, 2, COR, { op: 0.5, name: "Rule" }),
        tx("Each turning point changes what Nell wants.", 160, 910, 1600, { align: "center", color: DEEP }),
      ], "Five turning points. Chapter 21 is the storm, the moment everything in the book has been building to."],
      [LIGHT, [
        lab("MAIN CHARACTERS", 160, 110, 900),
        hd("Who's who", 160, 150, 1400),
        ...[["Nell Arden", "The narrator: sixteen, stubborn and brave."], ["Tomas Reyes", "The stranger who knows the sea too well."], ["Aunt Bea", "Runs the café and every rumour in town."]].flatMap(([n, s], i) => {
          const cx = 400 + i * 560;
          return [C(cx - 190, 290, 380, 380, "none", { stroke: COR, sw: 6, name: "Sun ring" }), member(CAST, F(cx - 170, 310, 340, 340, { shape: "circle", name: "Portrait" }), n, s, { base: KIND.young }), hd(n, cx - 240, 700, 480, { size: 52, align: "center" }), tx(s, cx - 220, 776, 440, { align: "center", color: MUT })];
        }),
      ], "The three people the story turns on. Use drawings or film stills; real photos of people aren't needed."],
      [["#ff9a6b", "#5b2a6e", 180], [
        C(880, 120, 160, 160, SUN, { op: 0.9, name: "Sun" }),
        hd("“The sea keeps every promise it never made.”", 210, 360, 1500, { size: 96, align: "center", color: WHITE, lh: 1.15 }),
        lab("CHAPTER 9", 210, 640, 1500, { align: "center", color: SUN }),
        tx("The line that made me stop and read the page again.", 210, 690, 1500, { align: "center", color: SOFT }),
      ], "My favourite line in the book. Read it slowly and explain why it stayed with you."],
      [LIGHT, [
        lab("BY THE NUMBERS", 160, 110, 900),
        hd("The book in numbers", 160, 150, 1400),
        ...[["312", "pages"], ["24", "chapters"], ["1", "lighthouse"]].flatMap(([n, l], i) => {
          const cx = 360 + i * 400;
          return [C(cx - 150, 320, 300, 300, [SUN, "#ffd0a8", "#ffc0b0"][i], { name: "Sun" }), vmid(T(n, cx - 150, 0, 300, { family: "serif", italic: true, size: 110, color: DEEP, align: "center" }), 320, 300), tx(l, cx - 150, 650, 300, { align: "center", size: 34 })];
        }),
        R(1420, 300, 2, 420, COR, { op: 0.5, name: "Rule" }),
        lab("MY RATING", 1480, 330, 360),
        ...[0, 1, 2, 3, 4].map((i) => C(1480 + i * 66, 390, 52, 52, i < 4 ? COR : "none", { stroke: COR, sw: 4, name: "Rating sun" })),
        hd("4 out of 5", 1480, 470, 360, { size: 56 }),
        tx("Slow start, brilliant ending.", 1480, 550, 360, { color: MUT }),
      ], "The numbers, then my rating: four suns out of five. It loses one for a slow first act."],
      [DUSK, [
        ...horizon(700, 160),
        hd("Would I recommend it?", 160, 150, 1600, { size: 110, align: "center" }),
        tx("Yes, especially on a rainy day with the window open.", 160, 320, 1600, { align: "center", size: 40 }),
        lab("QUESTIONS WELCOME", 160, 420, 1600, { align: "center", color: DEEP }),
      ], "My verdict, then questions. Have one discussion question ready in case the room is quiet."],
    ];
  });

  /* 19 ─ Monochrome photo grid · case study ─────────────────────────────────────────── */
  deck("mono-grid-case-study-dk2", "Monochrome photo grid case study", P169, "case study project portfolio agency client results website redesign photo grid", (W, H) => {
    const BK = "#0e0e0e", G1 = "#efefef", G2 = "#8f8f8f", G3 = "#2a2a2a", GL = "#cfcfcf";
    const hd = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 72, color: BK, lh: 1.0, ls: -1, ...o });
    const tx = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "calibri", size: 30, color: G3, lh: 1.45, ...o });
    const lab = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "sans", bold: true, size: 20, color: G2, ls: 5, ...o });
    const ph = (x, y, w, h) => F(x, y, w, h, { name: "Photo" });
    return [
      [BK, [
        ph(768, 0, 1152, 536), ph(768, 544, 572, 536), ph(1348, 544, 572, 536),
        lab("CASE STUDY  ·  2026", 100, 120, 600),
        hd("Rebuilding\nHarbor\nMarket", 100, 180, 620, { size: 110, color: WHITE }),
        tx("How a 40-stall food market doubled its online orders in six months.", 100, 560, 560, { color: GL }),
        lab("STUDIO NORTH  ·  STUDIONORTH.EXAMPLE", 100, 960, 620),
      ], "A case study of our Harbor Market project. Fill the grid with your strongest photos; they carry this whole deck."],
      [WHITE, [
        R(0, 0, W, 200, BK, { name: "Title band" }),
        vmid(hd("Contents", 100, 0, 900, { color: WHITE }), 0, 200),
        vmid(lab("FIVE PARTS  ·  12 MINUTES", 1220, 0, 600, { align: "right" }), 0, 200),
        ...[["01", "The brief"], ["02", "Research"], ["03", "Design"], ["04", "Results"], ["05", "What's next"]].flatMap(([n, t], i) => {
          const x = (i % 3) * 643, y = 208 + Math.floor(i / 3) * 440, w = 634;
          return [R(x, y, w, 432, i % 2 ? G1 : "#e2e2e2", { name: "Cell" }), hd(n, x + 50, y + 50, 300, { size: 110, color: G2 }), hd(t, x + 50, y + 320, 520, { size: 56 })];
        }),
        ph(1286, 648, 634, 432),
      ], "Five parts. Each cell is a chapter; the photo cell is a teaser for the results."],
      [BK, [
        ph(0, 0, 1272, H),
        T("02", 1360, 160, 480, { family: "sans", bold: true, size: 200, color: G3, lh: 1 }),
        lab("PART TWO", 1360, 380, 480),
        hd("The\napproach", 1360, 420, 500, { size: 100, color: WHITE }),
        tx("Photograph every stall, then design around the food.", 1360, 680, 460, { color: GL }),
      ], "Part two: the approach. The big decision was to lead with photography, not features."],
      [WHITE, [
        ph(0, 0, 1272, 700),
        R(0, 708, 1272, 372, G1, { name: "Cell" }),
        ...[["40", "stalls"], ["600", "dishes photographed"], ["9", "languages on the menu"]].flatMap(([a, b], i) => [hd(a, 80 + i * 400, 790, 360, { size: 96 }), lab(b.toUpperCase(), 80 + i * 400, 900, 360)]),
        R(1280, 0, 640, H, BK, { name: "Text cell" }),
        lab("THE PROBLEM", 1360, 160, 480),
        ...flow(200, hd("Great food, invisible online", 1360, 0, 500, { size: 64, color: WHITE }), 52, tx("The market's old site had one photo, no menus and a phone number that went to voicemail. Most orders came from people walking past.", 1360, 0, 500, { color: GL })),
      ], "The starting point. Use a wide photo of the market hall in the big frame."],
      [WHITE, [
        lab("RESULTS", 100, 100, 900),
        hd("Online orders per week", 100, 140, 1300),
        R(1420, 120, 400, 120, BK, { name: "Legend" }),
        R(1450, 158, 44, 44, GL, { name: "Before key" }), vmid(lab("BEFORE", 1504, 0, 120, { color: WHITE }), 158, 44),
        R(1620, 158, 44, 44, WHITE, { name: "After key" }), vmid(lab("AFTER", 1674, 0, 120, { color: WHITE }), 158, 44),
        R(140, 900, 1640, 4, BK, { name: "Baseline" }),
        R(899, 300, 4, 600, BK, { name: "Launch line" }),
        lab("LAUNCH", 916, 300, 300, { color: BK }),
        ...[["JAN", 180], ["FEB", 195], ["MAR", 210], ["APR", 420], ["MAY", 560], ["JUN", 640]].flatMap(([m, v], i) => {
          const h = Math.round((v / 640) * 520), x = 200 + i * 260 + (i > 2 ? 40 : 0), c = i > 2 ? BK : GL;
          return [R(x, 900 - h, 160, h, c, { name: m + " bar" }), T(String(v), x, 900 - h - 56, 160, { family: "sans", bold: true, size: 40, color: BK, align: "center" }), lab(m, x, 924, 160, { align: "center" })];
        }),
      ], "Orders tripled after launch, from about 200 a week to 640. The grey bars are before the new site."],
      [WHITE, [
        hd("Six months, four moments", 60, 50, 1500, { size: 64 }),
        ...[["WEEK 1", "Interviews with 40 stall owners"], ["WEEK 4", "Photo day: 600 dishes"], ["WEEK 9", "New site in testing"], ["WEEK 14", "Launch weekend"]].flatMap(([w, s], i) => {
          const x = i * 482, w2 = 474;
          return [ph(x, 150, w2, 560), R(x, 718, w2, 362, i % 2 ? G3 : BK, { name: "Caption cell" }), lab(w, x + 40, 770, 400, { color: GL }), T(s, x + 40, 810, 400, { family: "sans", bold: true, size: 40, color: WHITE, lh: 1.1 })];
        }),
      ], "The project in four photos. Keep the captions short; the pictures do the work."],
      [WHITE, [
        hd("The team", 60, 100, 1500),
        tx("Four people, one market, a lot of dumplings.", 60, 190, 1200, { color: G2 }),
        ...[["Lena Fox", "CREATIVE DIRECTOR"], ["Marco Bell", "PHOTOGRAPHER"], ["Aya Ono", "PRODUCT DESIGNER"], ["Will Grant", "DEVELOPER"]].flatMap(([n, r], i) => {
          const x = i * 482, w2 = 474;
          return [member(CAST, ph(x, 300, w2, 476), n, r), R(x, 784, w2, 296, BK, { name: "Name cell" }), T(n, x + 40, 840, 400, { family: "sans", bold: true, size: 44, color: WHITE }), lab(r, x + 40, 900, 400)];
        }),
      ], "The studio team. Black-and-white portraits keep the grid calm."],
      [WHITE, [
        // (the client who is quoted, half the slide, like Canva's testimonial slides)
        face(CAST, ph(0, 0, 956, H), KIND.business, { sex: "f" }),
        T("“", 1040, 140, 200, { family: "sans", bold: true, size: 220, color: BK, lh: 0.8 }),
        hd("People come for the photos and stay for the food. Our quiet Tuesday is now our busiest day.", 1040, 360, 780, { size: 56, lh: 1.15 }),
        R(1040, 760, 80, 6, BK, { name: "Rule" }),
        lab("NADIA KARIM, MARKET MANAGER", 1040, 796, 780, { color: BK }),
      ], "The client's words. Their Tuesday story is the one people remember."],
      [WHITE, [
        R(0, 0, 956, 536, BK, { name: "Stat cell" }),
        hd("3.2x", 80, 120, 800, { size: 200, color: WHITE }),
        lab("WEEKLY ONLINE ORDERS", 80, 360, 800),
        ph(964, 0, 956, 536),
        R(0, 544, 956, 536, G1, { name: "Stat cell" }),
        hd("+68%", 80, 660, 800, { size: 200 }),
        lab("MOBILE CONVERSION", 80, 900, 800, { color: G3 }),
        R(964, 544, 956, 536, G3, { name: "Stat cell" }),
        hd("1.9 s", 1044, 660, 800, { size: 200, color: WHITE }),
        lab("PAGE LOAD, DOWN FROM 6.8 S", 1044, 900, 800, { color: GL }),
      ], "Three results in a grid. 3.2 times the weekly orders, 68% better mobile conversion and pages that load in under two seconds."],
      [BK, [
        ph(0, 0, 632, 420), ph(640, 0, 640, 420), ph(1288, 0, 632, 420),
        lab("NEXT PROJECT", 100, 520, 800),
        hd("Let's build yours", 100, 560, 1300, { size: 110, color: WHITE }),
        tx("hello@studionorth.example  ·  +44 20 5550 1188  ·  studionorth.example/work", 100, 720, 1700, { color: GL }),
      ], "Close with the contact details and leave the photo strip on screen during questions."],
    ];
  });

  /* 20 ─ Pixel 8-bit · product demo ───────────────────────────────────────────────────── */
  deck("pixel-product-demo-dk2", "Pixel game product demo", P169, "product demo launch app software features roadmap retro game pixel 8-bit", (W, H) => {
    const CRM = "#fff1e8", NV = "#1d2b53", RD = "#ff004d", OR = "#ffa300", YL = "#ffec27", GN = "#00b543", BL = "#29adff", PL = "#7e2553", GY = "#c2c3c7", BR = "#ab5236", BRD = "#7e3a22";
    const px = (s, x, y, w, o = {}) => T(s, x, y, w, { family: "mono", bold: true, size: 40, color: NV, lh: 1.2, ...o });
    const sprite = (x, y, p, rows, pal) => rows.flatMap((row, j) => [...row].map((ch, i) => (pal[ch] ? R(x + i * p, y + j * p, p, p, pal[ch], { name: "Pixel" }) : null))).filter(Boolean);
    const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
    const COIN = [".OOO.", "OYYYO", "OYOYO", "OYYYO", ".OOO."];
    const FLAG = ["XRRR", "XRRR", "XRR.", "X...", "X...", "X..."];
    // Box with stepped (pixel) corners: border cross, then fill cross inset by p.
    const pbox = (x, y, w, h, fill, border, p = 12) => [R(x + p, y, w - 2 * p, h, border, { name: "Pixel border" }), R(x, y + p, w, h - 2 * p, border, { name: "Pixel border" }), R(x + 2 * p, y + p, w - 4 * p, h - 2 * p, fill, { name: "Pixel fill" }), R(x + p, y + 2 * p, w - 2 * p, h - 4 * p, fill, { name: "Pixel fill" })];
    const ground = () => [R(0, 948, W, 24, GN, { name: "Grass" }), R(0, 972, W, 108, BR, { name: "Bricks" }), R(0, 1024, W, 4, BRD, { name: "Brick line" }), ...Array.from({ length: 16 }, (_, i) => R(i * 120 + (i % 2) * 0, 972, 4, 52, BRD, { name: "Brick line" })), ...Array.from({ length: 16 }, (_, i) => R(i * 120 + 60, 1028, 4, 52, BRD, { name: "Brick line" }))];
    const bar = (x, y, n, filled, c, s = 28) => Array.from({ length: n }, (_, i) => R(x + i * (s + 6), y, s, s, i < filled ? c : GY, { name: "Bar segment" }));
    return [
      [NV, [
        ...sprite(80, 70, 10, HEART, { X: RD }), ...sprite(160, 70, 10, HEART, { X: RD }), ...sprite(240, 70, 10, HEART, { X: GY }),
        ...sprite(1500, 66, 12, COIN, { O: OR, Y: YL }), px("x 12,400", 1580, 72, 300, { color: CRM, size: 36 }),
        ...[[300, 380], [1600, 300], [420, 760], [1500, 700], [960, 180]].map(([x, y], i) => R(x, y, 12, 12, i % 2 ? YL : CRM, { name: "Pixel star" })),
        px("TASKQUEST", 160, 280, 1600, { size: 180, color: YL, align: "center", shadow: { x: 10, y: 10, blur: 0, color: RD, opacity: 1 } }),
        px("PRODUCT DEMO  ·  VERSION 2.0", 160, 520, 1600, { size: 40, color: CRM, align: "center" }),
        px("> PRESS START", 160, 680, 1600, { size: 44, color: OR, align: "center" }),
        ...ground(),
      ], "Taskquest turns family chores into a game. Today's demo shows version 2.0 live; press start and we'll begin."],
      [CRM, [
        px("LEVEL SELECT", 120, 100, 1680, { size: 72 }),
        px("Five levels, about fifteen minutes", 120, 200, 1680, { size: 30, color: PL }),
        ...sprite(255, 290, 10, ["..X..", ".XXX.", "XXXXX"].reverse(), { X: RD }),
        ...[["1-1", "THE\nPROBLEM"], ["1-2", "MEET\nTHE APP"], ["1-3", "LIVE\nDEMO"], ["1-4", "WHAT'S\nNEXT"], ["1-5", "Q&A"]].flatMap(([n, t], i) => {
          const x = 120 + i * 344, cur = i === 0;
          return [...pbox(x, 360, 320, 540, cur ? YL : WHITE, NV), px(n, x, 420, 320, { size: 80, align: "center", color: cur ? RD : NV }), px(t, x + 30, 580, 260, { size: 40, align: "center" }), ...bar(x + 74, 820, 5, cur ? 1 : 0, GN, 24)];
        }),
      ], "The demo as a level select. We're on level 1-1, the problem, and the green pips fill as we go."],
      [NV, [
        ...[[200, 200], [1700, 160], [380, 640], [1560, 600], [900, 120], [1200, 760]].map(([x, y], i) => R(x, y, 14, 14, i % 2 ? YL : CRM, { name: "Pixel star" })),
        ...sprite(860, 200, 40, COIN, { O: OR, Y: YL }),
        px("WORLD 2", 160, 470, 1600, { size: 120, color: YL, align: "center" }),
        px("THE QUEST BOARD", 160, 640, 1600, { size: 56, color: CRM, align: "center" }),
        ...ground(),
      ], "World two: the quest board, the screen kids open every day."],
      [CRM, [
        ...pbox(160, 110, 520, 860, NV, NV, 16),
        F(204, 176, 432, 720, { name: "Screenshot" }),
        R(380, 918, 80, 16, GY, { name: "Home button" }),
        px("FEATURE 01", 800, 170, 1000, { size: 30, color: RD }),
        px("CHORES BECOME\nQUESTS", 800, 220, 1000, { size: 72 }),
        T("Parents add a chore, kids accept it as a quest. Finish it, snap a photo, earn XP and coins. Streaks unlock new avatars.", 800, 440, 940, { family: "mono", size: 30, color: NV, lh: 1.5 }),
        px("XP 70 / 100", 800, 740, 600, { size: 30, color: PL }),
        ...bar(800, 800, 10, 7, GN, 56),
      ], "Feature one: the quest board. Show the real screenshot and complete a quest live if the Wi-Fi allows."],
      [CRM, [
        px("XP EARNED PER WEEK", 120, 100, 1680, { size: 64 }),
        px("Average per family, beta group, in hundreds", 120, 190, 1680, { size: 28, color: PL }),
        R(160, 924, 1600, 8, NV, { name: "Ground line" }),
        ...[["W1", 4], ["W2", 6], ["W3", 7], ["W4", 9], ["W5", 11], ["W6", 13]].flatMap(([wk, v], i) => {
          const x = 260 + i * 250, cells = [];
          for (let k = 0; k < v; k++) for (let c = 0; c < 2; c++) cells.push(R(x + c * 48, 920 - (k + 1) * 48, 44, 44, k === v - 1 ? YL : GN, { name: "XP block" }));
          return [...cells, px(String(v * 100), x - 40, 920 - v * 48 - 60, 176, { size: 36, align: "center" }), px(wk, x - 40, 948, 176, { size: 30, align: "center", color: PL })];
        }),
      ], "XP grows every week: families do more chores the longer they play, which is the whole point."],
      [CRM, [
        px("ROADMAP", 120, 100, 1680, { size: 72 }),
        ...Array.from({ length: 34 }, (_, i) => R(140 + i * 48, 600, 40, 40, i % 2 ? OR : YL, { name: "Path tile" })),
        ...[["V2.0", "NOW", "Family quests and streaks"], ["V2.1", "JAN", "A rewards shop for coins"], ["V2.2", "MAR", "School mode for classes"], ["V3.0", "JUN", "Co-op quests with friends"]].flatMap(([v, m, s], i) => {
          const x = 260 + i * 460;
          return [...sprite(x, 380, 30, FLAG, { X: NV, R: i === 0 ? RD : i === 3 ? GN : BL }), px(v, x - 120, 290, 360, { size: 44, align: "center" }), px(m, x - 120, 680, 360, { size: 30, align: "center", color: RD }), T(s, x - 120, 730, 360, { family: "mono", size: 28, color: NV, align: "center", lh: 1.4 })];
        }),
        ...ground(),
      ], "Four checkpoints. Version 2.1 adds a rewards shop, and co-op quests arrive with 3.0 in June."],
      [NV, [
        px("PARTY MEMBERS", 120, 100, 1680, { size: 72, color: YL }),
        ...[["KAI", "DEVELOPER", 9], ["ROSA", "DESIGNER", 8], ["OMAR", "PRODUCT", 10], ["JEN", "SUPPORT", 7]].flatMap(([n, r, hp], i) => {
          const x = 120 + i * 430;
          return [...pbox(x, 240, 400, 700, CRM, WHITE), member(CAST, F(x + 40, 280, 320, 320, { name: "Portrait" }), n, r), px(n, x + 40, 630, 320, { size: 52 }), px(r, x + 40, 700, 320, { size: 26, color: PL }), px("HP", x + 40, 760, 80, { size: 24, color: RD }), ...bar(x + 100, 760, 8, Math.round(hp * 0.8), RD, 24)];
        }),
      ], "The team, as a game party. Everyone here built part of today's demo."],
      [CRM, [
        ...sprite(1500, 160, 20, HEART, { X: RD }),
        face(CAST, F(160, 140, 300, 300, { name: "Portrait" }), KIND.customer, { sex: "m" }),
        ...pbox(160, 560, 1600, 380, NV, NV),
        ...pbox(200, 500, 440, 92, RD, NV),
        vmid(px("PARENT, BETA", 200, 0, 440, { size: 32, color: WHITE, align: "center" }), 500, 92),
        px("MY KIDS NOW ASK TO DO THE DISHES. FOR THE XP.", 220, 650, 1480, { size: 56, color: CRM, lh: 1.3 }),
        S("triangle", 1660, 870, 40, 30, YL, { rot: 180, name: "Next arrow" }),
      ], "A real line from a beta parent. It gets a laugh every time; let it land."],
      [NV, [
        px("HIGH SCORES", 160, 100, 1600, { size: 80, color: YL, align: "center" }),
        ...pbox(360, 240, 1200, 640, NV, CRM, 14),
        ...[["1ST", "12,400", "FAMILIES PLAYING"], ["2ND", "310K", "QUESTS COMPLETED"], ["3RD", "4.8", "APP STORE RATING"], ["4TH", "83%", "PLAY EVERY WEEK"]].flatMap(([r, v, l], i) => {
          const y = 300 + i * 140, c = [YL, CRM, CRM, CRM][i];
          return [px(r, 420, y, 140, { size: 44, color: i === 0 ? RD : GY }), px(v, 580, y, 340, { size: 52, color: c }), px(l, 960, y + 8, 560, { size: 34, color: c })];
        }),
      ], "The numbers that matter, as a high-score table. Families playing weekly is the one we watch most."],
      [NV, [
        ...sprite(160, 80, 10, HEART, { X: GY }), ...sprite(240, 80, 10, HEART, { X: GY }), ...sprite(320, 80, 10, HEART, { X: RD }),
        px("GAME OVER?", 160, 230, 1600, { size: 150, color: RD, align: "center" }),
        px("CONTINUE?   > YES     NO", 160, 450, 1600, { size: 52, color: CRM, align: "center" }),
        px("kai@taskquest.example  ·  taskquest.example/demo", 160, 600, 1600, { size: 32, color: YL, align: "center" }),
        ...ground(),
      ], "Thanks for playing. Try the demo build at the link, and continue the conversation with Kai."],
    ];
  });
}
