// ROUND 4 layout batch: own "3D-style" designs (layered soft shadows, glossy gradient shapes, extruded headlines,
// isometric blocks, tilted photo / device stacks) for Instagram posts and presentations. Pure module; the award
// winners show people photos of their kind (templates-faces.js).
// 7 Instagram posts (1080 × 1080) + 5 presentations (1920 × 1080, title / content / closing slides with notes).
import { castFor, member } from "./templates-faces.js";

export default function add(k) {
  const { tpl, T, S, R, C, E, F, page } = k;
  const { WHITE } = k.K;
  const IG = "instagram-post", PR = "presentation-16x9";
  const r1 = (v) => Math.round(v * 10) / 10;

  /* ---------- depth helpers ---------- */
  // Extruded ("3D") text: solid side steps in `color` (darker than light text, a soft tint behind dark text).
  const ext = (t, color, depth = 50, direction = -45, shade = 35) => { t.text.effect = { type: "extrude", depth, direction, shade, color }; return t; };
  const grad = (l, stops, angle = 180) => { l.shape.gradient = { stops, angle }; return l; };
  const split = (a, b) => [a, a, a, a, a, b, b, b, b, b]; // a hard-ish edge in the middle (left face / right face)
  // Layered soft shadow: three black copies, each a little further down and wider, fading out.
  function shadow(kind, x, y, w, h, o = {}) {
    const s = o.s ?? Math.max(5, Math.min(w, h) * 0.035), rad = o.radius || 0;
    return [[3, 0.05], [2, 0.07], [1, 0.1]].map(([i, op]) => {
      const g = s * (i - 1) * 0.8;
      return S(kind, r1(x - g / 2 + s * 0.3 * i), r1(y + s * i), r1(w + g), r1(h + s * (i - 1) * 0.5), "#000000", { op: r1(op * (o.k ?? 1) * 100) / 100, radius: rad ? r1(rad + s * (i - 1) * 0.4) : 0, sides: o.sides, rot: o.rot || 0, name: "Shadow" });
    });
  }
  // A card with a layered shadow, optional gradient fill and a glossy highlight over its top part.
  function card(x, y, w, h, fill, o = {}) {
    const r = o.radius ?? 0;
    const c = S(o.kind || "rect", x, y, w, h, fill, { radius: r, name: o.name || "Card", rot: o.rot || 0, op: o.op ?? 1 });
    if (o.grad) grad(c, o.grad, o.angle ?? 180);
    const out = [...(o.shadow === false ? [] : shadow(o.kind || "rect", x, y, w, h, { radius: r, rot: o.rot, k: o.k, s: o.s })), c];
    if (o.gloss) out.push(S(o.kind || "rect", r1(x + w * 0.05), r1(y + h * 0.05), r1(w * 0.9), r1(h * 0.42), "#ffffff", { op: o.gloss, radius: r ? r1(r * 0.8) : 0, name: "Highlight" }));
    return out;
  }
  // Text centred vertically in a box.
  const mid = (s, x, y, w, h, o) => { const t = T(s, x, y, w, { align: "center", ...o }); t.y = r1(y + (h - t.h) / 2); return t; };
  // Glossy pill button.
  const pill = (s, x, y, w, h, stops, color, size = 40) => [...card(x, y, w, h, stops[1], { radius: h / 2, grad: stops, gloss: 0.22, name: "Button" }), mid(s, x, y, w, h, { size, bold: true, color, name: "Button text" })];
  // Isometric cube (side s): hexagon body shaded left / right, light rhombus top, a darker front edge.
  function cube(x, y, s, top, left, right, edge) {
    const hh = r1(s * 1.1547), t = r1(s * 0.57735);
    return [grad(S("polygon", x, y, s, hh, left, { sides: 6, name: "Cube" }), split(left, right), 90), S("polygon", x, y, s, t, top, { sides: 4, name: "Cube top" }), R(r1(x + s / 2 - 1.5), r1(y + t), 3, r1(hh - t), edge, { name: "Cube edge" })];
  }
  // Isometric bar (a prism) standing on `base`: pointed bottom, shaded body, light rhombus top.
  function bar(x, base, w, h, top, left, right) {
    const t = r1(w * 0.57735);
    return [grad(S("polygon", x, r1(base - t / 2), w, t, right, { sides: 4, name: "Bar base" }), split(left, right), 90), grad(R(x, r1(base - h), w, h, left, { name: "Bar" }), split(left, right), 90), S("polygon", x, r1(base - h - t / 2), w, t, top, { sides: 4, name: "Bar top" })];
  }
  // Glossy ball: gradient circle, soft floor shadow, highlight.
  function orb(x, y, d, stops, o = {}) {
    const out = [];
    if (o.floor !== false) out.push(C(r1(x + d * 0.1), r1(y + d * 1.02), r1(d * 0.8), r1(d * 0.12), "#000000", { op: o.floorOp ?? 0.12, name: "Shadow" }));
    out.push(grad(C(x, y, d, d, stops[1], { name: o.name || "Ball" }), stops, 135), C(r1(x + d * 0.18), r1(y + d * 0.1), r1(d * 0.42), r1(d * 0.28), "#ffffff", { op: 0.32, name: "Highlight" }));
    return out;
  }
  // A printed photo card (paper border, photo frame), with a layered shadow; rot turns it.
  function photo(x, y, w, h, rot, o = {}) {
    const m = o.m ?? 18, foot = o.foot ?? m;
    return [...shadow("rect", x, y, w, h, { rot, s: o.s ?? 10 }), R(x, y, w, h, o.paper || WHITE, { rot, name: "Photo card" }), F(x + m, y + m, w - 2 * m, h - m - foot, { rot, name: o.name || "Photo" })];
  }
  const slide = (bg, layers, notes) => Object.assign(page(bg, layers), { notes });

  /* ================= Instagram posts ================= */
  /* 1. Mega sale: extruded two-line headline, fanned glass cards, glossy button */
  tpl("glass-cards-sale-3d", "Mega sale 3D cards post", IG, "sale discount offer weekend shop 3d cards glossy mega", () => [page(["#6d28d9", "#312e81", 160], [
    E("deco-sparkles", 70, 60, 120, { c1: "#fde68a", c2: WHITE }),
    E("deco-sparkle", 900, 90, 90, { c1: "#fde68a" }),
    ext(T("MEGA\nSALE", 40, 70, 1000, { size: 200, bold: true, color: WHITE, align: "center", lh: 0.95, name: "Headline" }), "#4c1d95", 60),
    ...card(250, 545, 580, 250, "#c4b5fd", { radius: 40, rot: -7, name: "Back card", shadow: false }),
    ...card(250, 545, 580, 250, "#ddd6fe", { radius: 40, rot: 4, name: "Back card" }),
    ...card(220, 540, 640, 260, WHITE, { radius: 44, grad: ["#ffffff", "#ffffff", "#ede9fe"], gloss: 0.5 }),
    T("UP TO 50% OFF", 240, 595, 600, { size: 60, bold: true, color: "#4c1d95", align: "center", name: "Offer" }),
    T("Friday to Sunday, in store and online", 240, 690, 600, { size: 29, color: "#6b21a8", align: "center", name: "Dates" }),
    ...pill("Shop now", 340, 880, 400, 110, ["#fde68a", "#fbbf24", "#d97706"], "#1e1b4b", 46),
  ])]);

  /* 2. Tech release: isometric cube tower, extruded dark headline with a soft tint */
  tpl("isometric-tech-launch-3d", "Isometric app release 3D post", IG, "tech app software launch release new version 3d isometric startup", () => {
    const top = "#c7d2fe", L = "#6366f1", Rr = "#3730a3", edge = "#312e81";
    return [page("#eef2ff", [
      C(560, 770, 470, 80, "#000000", { op: 0.1, name: "Shadow" }),
      ...cube(560, 560, 170, "#99f6e4", "#14b8a6", "#0f766e", "#115e59"),
      ...cube(730, 427, 240, top, L, Rr, edge),
      ...cube(730, 288.5, 240, top, L, Rr, edge),
      ...cube(730, 150, 240, "#fde68a", "#f59e0b", "#b45309", "#92400e"),
      T("NEW RELEASE", 80, 110, 520, { size: 32, bold: true, color: "#4f46e5", ls: 8, name: "Kicker" }),
      ext(T("Build\nfaster.", 80, 165, 560, { size: 120, bold: true, color: "#1e1b4b", lh: 1, name: "Headline" }), "#c7d2fe", 55, -45, 15),
      T("Version 4.0 is here: quicker sync, offline mode and a cleaner look.", 80, 450, 470, { size: 36, color: "#3730a3", lh: 1.35, name: "Body" }),
      ...pill("Try it free", 80, 850, 380, 110, ["#818cf8", "#4f46e5", "#3730a3"], WHITE, 44),
      T("Free for 30 days", 500, 885, 420, { size: 34, bold: true, color: "#4338ca", name: "Note" }),
    ])];
  });

  /* 3. Travel: fanned photo cards with layered shadows, extruded serif headline */
  tpl("stacked-photos-travel-3d", "Summer escapes photo stack post", IG, "travel trip holiday summer island photo stack 3d vacation tour", () => [page(["#fff7ed", "#fde7cf", 180], [
    E("icon-sun", 900, 50, 120, { c1: "#f59e0b" }),
    ...photo(150, 100, 400, 450, -9, { foot: 70 }),
    ...photo(530, 110, 400, 450, 7, { foot: 70 }),
    ...photo(340, 140, 400, 460, -2, { foot: 80 }),
    ext(T("Summer escapes", 40, 660, 1000, { size: 92, family: "serif", bold: true, color: "#0f766e", align: "center", name: "Headline" }), "#fdba74", 50, -45, 20),
    T("Island hopping in the warm season", 90, 795, 900, { size: 40, color: "#7c2d12", align: "center", name: "Subline" }),
    ...pill("From $899 per person", 250, 890, 580, 100, ["#fb923c", "#f97316", "#c2410c"], WHITE, 34),
  ])]);

  /* 4. Quote: glossy orbs on a night gradient, extruded gold quote mark */
  tpl("glossy-orbs-quote-3d", "Glossy orbs quote post", IG, "quote motivation inspiration daily words 3d glossy design", () => [page(["#0f172a", "#1e3a8a", 150], [
    ...orb(640, 70, 360, ["#fde68a", "#f59e0b", "#b45309"], { floorOp: 0.3 }),
    ...orb(110, 120, 150, ["#99f6e4", "#14b8a6", "#0f766e"], { floorOp: 0.3 }),
    ...orb(520, 300, 90, ["#fbcfe8", "#ec4899", "#9d174d"], { floorOp: 0.3 }),
    ext(T("“", 80, 330, 220, { size: 240, family: "serif", bold: true, color: "#fde68a", lh: 1, name: "Quote mark" }), "#92400e", 60),
    T("Make it simple, but significant.", 90, 540, 900, { size: 78, family: "serif", color: WHITE, lh: 1.2, name: "Quote" }),
    T("— Studio notes, 2026", 90, 760, 700, { size: 36, bold: true, color: "#fde68a", name: "Author" }),
    ...pill("Daily design quote", 90, 890, 440, 90, ["#60a5fa", "#2563eb", "#1e40af"], WHITE, 34),
  ])]);

  /* 5. Beauty product on a 3D podium with a glossy price ball */
  tpl("product-podium-3d", "Product podium 3D post", IG, "product launch beauty skincare serum shop new 3d podium", () => [page(["#fdf2f8", "#fbcfe8", 180], [
    T("NEW IN", 84, 70, 400, { size: 30, bold: true, color: "#be185d", ls: 8, name: "Kicker" }),
    ext(T("Glow\nserum", 80, 110, 520, { size: 120, family: "serif", bold: true, color: "#831843", lh: 1, name: "Headline" }), "#f9a8d4", 55, -45, 15),
    T("Vitamin C serum for a bright, even look in 14 days.", 80, 390, 430, { size: 36, color: "#9d174d", lh: 1.35, name: "Body" }),
    ...orb(110, 600, 190, ["#fef3c7", "#fbbf24", "#d97706"], { floorOp: 0.14 }),
    mid("$24", 110, 600, 190, 190, { size: 64, bold: true, color: "#7c2d12", name: "Price" }),
    C(530, 905, 480, 80, "#000000", { op: 0.12, name: "Shadow" }),
    grad(C(560, 860, 420, 90, "#ec4899", { name: "Podium base" }), split("#f472b6", "#be185d"), 90),
    grad(R(560, 760, 420, 145, "#ec4899", { name: "Podium" }), split("#f472b6", "#be185d"), 90),
    grad(C(560, 715, 420, 90, "#fbcfe8", { name: "Podium top" }), ["#fdf2f8", "#fbcfe8"], 180),
    ...shadow("rect", 640, 350, 260, 390, { radius: 32, s: 9 }),
    F(640, 350, 260, 390, { shape: "rounded", radius: 32, name: "Product photo" }),
    E("deco-sparkles", 920, 300, 110, { c1: "#f59e0b", c2: "#ec4899" }),
    ...pill("Shop the drop", 80, 890, 400, 100, ["#f472b6", "#db2777", "#9d174d"], WHITE, 36),
  ])]);

  /* 6. Business tips: isometric staircase of prisms with step labels */
  tpl("isometric-steps-growth-3d", "Five steps isometric growth post", IG, "business growth plan steps small business tips 3d isometric chart", () => {
    const steps = [["Plan", "#a7f3d0", "#34d399", "#047857"], ["Build", "#99f6e4", "#2dd4bf", "#0f766e"], ["Launch", "#a5f3fc", "#22d3ee", "#0e7490"], ["Learn", "#bae6fd", "#38bdf8", "#0369a1"], ["Scale", "#c7d2fe", "#818cf8", "#4338ca"]];
    const out = [];
    steps.forEach(([lab, top, L, Rr], i) => {
      const x = 90 + i * 185, h = 140 + i * 75, base = 960;
      out.push(...bar(x, base, 150, h, top, L, Rr));
      out.push(mid(String(i + 1), x, base - h, 150, Math.min(h, 160), { size: 64, bold: true, color: WHITE, name: "Step number" }));
      out.push(T(lab, x - 10, r1(base - h - 43 - 58), 170, { size: 32, bold: true, color: "#134e4a", align: "center", name: "Step" }));
    });
    return [page("#ecfeff", [
      ext(T("Grow in\n5 steps", 80, 70, 640, { size: 116, bold: true, color: "#134e4a", lh: 1, name: "Headline" }), "#99f6e4", 55, -45, 15),
      T("A simple plan for small shops", 84, 320, 600, { size: 36, color: "#0f766e", name: "Subline" }),
      E("arrow-growth", 770, 80, 230, { c1: "#0d9488" }),
      ...out,
    ])];
  });

  /* 7. Event: layered paper frames, extruded white headline */
  tpl("layered-paper-event-3d", "Layered paper event post", IG, "event design week festival conference ticket 3d paper layers", () => [page("#fff7ed", [
    ...card(60, 60, 960, 960, "#fed7aa", { radius: 90, s: 7 }),
    ...card(120, 120, 840, 840, "#fdba74", { radius: 78, s: 8 }),
    ...card(180, 180, 720, 720, "#fb923c", { radius: 66, s: 9 }),
    ...card(240, 240, 600, 600, "#ea580c", { radius: 54, s: 10, grad: ["#f97316", "#ea580c", "#c2410c"] }),
    E("deco-sparkle", 95, 95, 70, { c1: "#c2410c" }),
    E("deco-sparkle", 915, 915, 70, { c1: "#c2410c" }),
    ext(T("DESIGN\nWEEK", 260, 300, 560, { size: 128, bold: true, color: WHITE, align: "center", lh: 0.95, name: "Headline" }), "#7c2d12", 50),
    T("2026", 260, 560, 560, { size: 72, bold: true, color: "#ffedd5", align: "center", name: "Year" }),
    T("June 12 to 14 · City Hall", 260, 680, 560, { size: 34, color: WHITE, align: "center", name: "Details" }),
    T("Free entry · Talks · Workshops", 260, 735, 560, { size: 28, color: "#ffedd5", align: "center", name: "Extras" }),
  ])]);

  /* ================= Presentations (3 slides each) ================= */
  /* P1. Quarterly growth: isometric bar chart, glossy metric cards, cube cluster */
  tpl("isometric-growth-3d-deck", "Isometric growth report presentation", PR, "presentation report quarterly growth business results 3d isometric chart", (W, H) => {
    const bars = [["Q1", 220], ["Q2", 320], ["Q3", 410], ["Q4", 540]].flatMap(([q, h], i) => {
      const x = 1060 + i * 200;
      return [...bar(x, 900, 150, h, "#bfdbfe", "#3b82f6", "#1d4ed8"), T(q, x, 960, 150, { size: 36, bold: true, color: "#1e3a8a", align: "center", name: "Quarter" })];
    });
    const stat = ([big, small, stops], i) => { const x = 140 + i * 570; return [...card(x, 380, 500, 420, WHITE, { radius: 40, gloss: 0, s: 12 }), ...orb(x + 40, 420, 120, stops, { floor: false }), T(big, x + 40, 570, 420, { size: 110, bold: true, color: "#1e3a8a", lh: 1, name: "Number" }), T(small, x + 40, 700, 420, { size: 36, color: "#475569", name: "Label" })]; };
    return [
      slide(["#eff6ff", "#dbeafe", 180], [
        C(1020, 940, 820, 90, "#000000", { op: 0.08, name: "Shadow" }),
        ...bars,
        T("ANNUAL REVIEW 2026", 140, 220, 800, { size: 36, bold: true, color: "#2563eb", ls: 8, name: "Kicker" }),
        ext(T("Growing\nevery quarter", 140, 290, 860, { size: 120, bold: true, color: "#1e3a8a", lh: 1.02, name: "Title" }), "#bfdbfe", 55, -45, 15),
        T("Results, lessons and next steps", 144, 580, 800, { size: 44, color: "#334155", name: "Subtitle" }),
        T("Finance team · January 2027", 144, 900, 800, { size: 32, color: "#64748b", name: "Presenter" }),
      ], "Welcome everyone. In the next ten minutes we look at the year quarter by quarter and agree on next steps."),
      slide("#f8fafc", [
        ext(T("The year in numbers", 140, 120, 1400, { size: 86, bold: true, color: "#1e3a8a", name: "Heading" }), "#dbeafe", 45, -45, 10),
        T("Revenue, customers and repeat orders all went up.", 144, 250, 1500, { size: 38, color: "#475569", name: "Intro" }),
        ...[["+48%", "Revenue growth", ["#bfdbfe", "#3b82f6", "#1d4ed8"]], ["12k", "New customers", ["#99f6e4", "#14b8a6", "#0f766e"]], ["64%", "Repeat orders", ["#fde68a", "#f59e0b", "#b45309"]]].flatMap(stat),
      ], "Three numbers to remember. Revenue grew 48 percent, we welcomed 12 thousand new customers and two in three orders came from people who bought before."),
      slide(["#1e3a8a", "#1e1b4b", 160], [
        C(1180, 860, 520, 80, "#000000", { op: 0.25, name: "Shadow" }),
        ...cube(1230, 540, 200, "#99f6e4", "#14b8a6", "#0f766e", "#115e59"),
        ...cube(1430, 540, 200, "#bfdbfe", "#3b82f6", "#1d4ed8", "#1e3a8a"),
        ...cube(1330, 424.5, 200, "#fde68a", "#f59e0b", "#b45309", "#92400e"),
        ext(T("Thank you", 140, 360, 1000, { size: 150, bold: true, color: WHITE, name: "Title" }), "#1e40af", 60),
        T("Questions and ideas are welcome.", 144, 580, 900, { size: 44, color: "#bfdbfe", name: "Subtitle" }),
        T("finance@yourcompany.com", 144, 660, 900, { size: 36, bold: true, color: "#fde68a", name: "Contact" }),
      ], "Thank you. I am happy to take questions now, or send them to the finance inbox."),
    ];
  });

  /* P2. Product update on a dark glass dashboard */
  tpl("glass-dashboard-3d-deck", "Glass dashboard product update presentation", PR, "presentation product update tech dashboard glass dark 3d software", (W, H) => {
    const glass = (x, y, w, h) => card(x, y, w, h, "#ffffff", { radius: 36, op: 0.12, grad: ["#ffffff", "#c7d2fe"], angle: 160, s: 12, k: 2.2, gloss: 0.06 });
    const statCard = ([big, small, color], i) => { const x = 140 + (i % 2) * 830, y = 300 + Math.floor(i / 2) * 330; return [...glass(x, y, 780, 280), T(big, x + 50, y + 50, 680, { size: 96, bold: true, color, lh: 1, name: "Number" }), T(small, x + 50, y + 175, 680, { size: 36, color: "#e0e7ff", name: "Label" })]; };
    return [
      slide(["#0b1023", "#312e81", 135], [
        ...orb(1300, 180, 420, ["#c4b5fd", "#7c3aed", "#4c1d95"], { floorOp: 0.35 }),
        ...orb(1640, 640, 160, ["#99f6e4", "#14b8a6", "#0f766e"], { floorOp: 0.35 }),
        ...glass(140, 300, 980, 470),
        T("PRODUCT UPDATE · NOVEMBER", 200, 360, 860, { size: 32, bold: true, color: "#a5b4fc", ls: 6, name: "Kicker" }),
        ext(T("What we shipped", 200, 420, 880, { size: 104, bold: true, color: WHITE, lh: 1.05, name: "Title" }), "#4338ca", 55),
        T("Four wins, two lessons, one plan", 204, 660, 860, { size: 40, color: "#e0e7ff", name: "Subtitle" }),
      ], "Hello team. This is our monthly product update: what shipped, what we learned and what comes next."),
      slide(["#0b1023", "#1e1b4b", 135], [
        ext(T("This month", 140, 120, 1200, { size: 90, bold: true, color: WHITE, name: "Heading" }), "#4338ca", 45),
        ...[["2.1 s", "Faster start-up on phones", "#99f6e4"], ["4.8", "Average store rating", "#fde68a"], ["31%", "More weekly active users", "#c4b5fd"], ["0", "Open critical bugs", "#fbcfe8"]].flatMap(statCard),
      ], "Start-up is down to 2.1 seconds, the rating is 4.8, weekly active users grew 31 percent and there are no open critical bugs."),
      slide(["#312e81", "#0b1023", 135], [
        ...orb(840, 150, 240, ["#c4b5fd", "#7c3aed", "#4c1d95"], { floorOp: 0.35 }),
        ext(T("Questions?", 140, 470, 1640, { size: 150, bold: true, color: WHITE, align: "center", name: "Title" }), "#4338ca", 60),
        T("Next update: first Monday of December", 140, 700, 1640, { size: 42, color: "#c7d2fe", align: "center", name: "Subtitle" }),
      ], "That is all for this month. Any questions? The next update is on the first Monday of December."),
    ];
  });

  /* P3. Lesson: stacked paper cards */
  tpl("paper-stack-lesson-3d-deck", "Paper stack lesson presentation", PR, "presentation education lesson school class science plant cells 3d paper", (W, H) => {
    const stack = (x, y, w, h, colors) => colors.flatMap((c, i) => card(x + (colors.length - 1 - i) * 18, y + (colors.length - 1 - i) * 18, w, h, c, { radius: 30, s: 8, name: i === colors.length - 1 ? "Card" : "Paper" }));
    const step = ([n, title, body, c], i) => { const x = 140 + i * 570; return [...stack(x, 330, 480, 560, ["#d9f99d", "#bef264", WHITE]), ...orb(x + 40, 370, 100, c, { floor: false }), mid(n, x + 40, 370, 100, 100, { size: 48, bold: true, color: WHITE, name: "Number" }), T(title, x + 40, 510, 400, { size: 52, bold: true, color: "#14532d", name: "Step title" }), T(body, x + 40, 590, 400, { size: 34, color: "#3f6212", lh: 1.35, name: "Step text" })]; };
    return [
      slide("#f7fee7", [
        ...stack(1080, 200, 640, 680, ["#bbf7d0", "#86efac", "#4ade80"]),
        F(1130, 250, 540, 470, { shape: "rounded", radius: 24, name: "Lesson photo" }),
        T("Microscope photo", 1130, 760, 540, { size: 34, bold: true, color: "#14532d", align: "center", name: "Caption" }),
        T("SCIENCE · LESSON 4", 140, 260, 860, { size: 34, bold: true, color: "#15803d", ls: 6, name: "Kicker" }),
        ext(T("Inside a\nplant cell", 140, 320, 900, { size: 130, bold: true, color: "#14532d", lh: 1, name: "Title" }), "#bbf7d0", 55, -45, 15),
        T("Grade 7 · 40 minutes", 144, 620, 800, { size: 40, color: "#3f6212", name: "Subtitle" }),
      ], "Today we open up a plant cell and meet the parts that keep it alive."),
      slide("#fefce8", [
        ext(T("Three parts to know", 140, 110, 1500, { size: 86, bold: true, color: "#14532d", name: "Heading" }), "#d9f99d", 45, -45, 10),
        ...[["1", "Cell wall", "A firm outer layer that gives the cell its shape.", ["#86efac", "#22c55e", "#15803d"]], ["2", "Chloroplast", "Turns sunlight into food for the plant.", ["#fde68a", "#f59e0b", "#b45309"]], ["3", "Nucleus", "The control centre that holds the plans.", ["#a5f3fc", "#06b6d4", "#0e7490"]]].flatMap(step),
      ], "Walk through each card. Ask the class which part they think makes the plant green."),
      slide(["#14532d", "#166534", 160], [
        ...stack(560, 230, 800, 560, ["#86efac", "#4ade80", WHITE]),
        ext(T("Quiz time!", 600, 335, 720, { size: 108, bold: true, color: "#14532d", align: "center", name: "Title" }), "#bbf7d0", 55, -45, 15),
        T("Name the part that makes food from sunlight.", 640, 520, 640, { size: 40, color: "#3f6212", align: "center", lh: 1.3, name: "Question" }),
      ], "Quick check: hands up if you know which part makes food from sunlight. Answer: the chloroplast."),
    ];
  });

  /* P4. Team awards on isometric podiums */
  tpl("podium-awards-3d-deck", "Podium team awards presentation", PR, "presentation awards team recognition winners celebration office 3d podium", (W, H) => {
    const cast = castFor("podium-awards-3d-deck");
    // A podium block: the place number sits on the front, below the light top face.
    const block = (x, base, w, h, n, stops) => { const t = w * 0.57735; return [...bar(x, base, w, h, stops[0], stops[1], stops[2]), mid(n, x, r1(base - h + t / 2), w, Math.min(h - t / 2, 150), { size: 80, bold: true, color: WHITE, name: "Place" })]; };
    // A winner: round photo standing on the podium's top face, name and role under the podium.
    const winner = (x, base, h, n, name, role, stops) => [...block(x, base, 360, h, n, stops), ...shadow("ellipse", x + 80, base - h - 175, 200, 200, { s: 7 }), member(cast, F(x + 80, base - h - 175, 200, 200, { shape: "circle", name: "Winner photo" }), name, role), T(name, x - 20, base + 112, 400, { size: 38, bold: true, color: "#1e1b4b", align: "center", name: "Name" }), T(role, x - 20, base + 162, 400, { size: 30, color: "#4c1d95", align: "center", name: "Role" })];
    return [
      slide(["#faf5ff", "#ede9fe", 180], [
        E("deco-confetti", 1580, 90, 220, { c1: "#f59e0b", c2: "#8b5cf6" }),
        ...block(1080, 900, 220, 240, "2", ["#e2e8f0", "#94a3b8", "#475569"]),
        ...block(1320, 900, 220, 360, "1", ["#fef3c7", "#fbbf24", "#b45309"]),
        ...block(1560, 900, 220, 160, "3", ["#fed7aa", "#fb923c", "#c2410c"]),
        T("YEAR-END CELEBRATION", 140, 260, 860, { size: 34, bold: true, color: "#7c3aed", ls: 6, name: "Kicker" }),
        ext(T("Team awards\n2026", 140, 320, 900, { size: 130, bold: true, color: "#4c1d95", lh: 1, name: "Title" }), "#ddd6fe", 55, -45, 15),
        T("Thank you for a brilliant year", 144, 620, 860, { size: 44, color: "#6d28d9", name: "Subtitle" }),
      ], "Welcome to our awards. This is the moment to thank the people who made this year special."),
      slide("#ffffff", [
        ext(T("Team player of the year", 140, 90, 1640, { size: 80, bold: true, color: "#4c1d95", align: "center", name: "Heading" }), "#ede9fe", 45, -45, 10),
        ...winner(330, 820, 220, "2", "Sana Malik", "Support lead", ["#e2e8f0", "#94a3b8", "#475569"]),
        ...winner(780, 820, 320, "1", "Omar Farooq", "Product designer", ["#fef3c7", "#fbbf24", "#b45309"]),
        ...winner(1230, 820, 170, "3", "Hina Raza", "Sales manager", ["#fed7aa", "#fb923c", "#c2410c"]),
      ], "Our three winners, voted by the whole team. Please come up as I call your name."),
      slide(["#4c1d95", "#1e1b4b", 160], [
        E("deco-confetti", 120, 100, 220, { c1: "#fde68a", c2: "#f472b6" }),
        E("deco-confetti", 1580, 700, 220, { c1: "#fde68a", c2: "#a7f3d0" }),
        ...orb(860, 160, 200, ["#fef3c7", "#fbbf24", "#b45309"], { floorOp: 0.3 }),
        E("icon-star", 910, 210, 100, { c1: WHITE }),
        ext(T("Congratulations!", 140, 470, 1640, { size: 140, bold: true, color: WHITE, align: "center", name: "Title" }), "#7c3aed", 60),
        T("Dinner starts at 8 pm in the main hall", 140, 690, 1640, { size: 42, color: "#ddd6fe", align: "center", name: "Subtitle" }),
      ], "Congratulations to everyone. Dinner starts at 8 in the main hall."),
    ];
  });

  /* P5. App launch with tilted phone mockups */
  tpl("tilted-devices-launch-3d-deck", "Tilted phones app launch presentation", PR, "presentation app launch mobile product tech startup 3d devices", (W, H) => {
    const phone = (x, y, rot, op = 1) => [...shadow("rect", x, y, 300, 600, { radius: 48, rot, s: 12 }), R(x, y, 300, 600, "#111827", { radius: 48, rot, op, name: "Phone" }), F(x + 18, y + 18, 264, 564, { shape: "rounded", radius: 34, rot, name: "Screen" })];
    const feat = ([icon, title, body, stops], i) => { const y = 300 + i * 220; return [...card(140, y, 1000, 180, WHITE, { radius: 36, s: 9 }), ...orb(180, y + 30, 120, stops, { floor: false }), E(icon, 210, y + 60, 60, { c1: WHITE }), T(title, 340, y + 32, 760, { size: 46, bold: true, color: "#0f172a", name: "Feature" }), T(body, 340, y + 100, 760, { size: 32, color: "#475569", name: "Feature text" })]; };
    return [
      slide(["#ecfeff", "#cffafe", 180], [
        ...phone(1180, 300, -10),
        ...phone(1440, 220, 6),
        T("LAUNCHING TODAY", 140, 280, 900, { size: 34, bold: true, color: "#0e7490", ls: 6, name: "Kicker" }),
        ext(T("Meet Pocket\nPlanner", 140, 340, 960, { size: 128, bold: true, color: "#164e63", lh: 1, name: "Title" }), "#a5f3fc", 55, -45, 15),
        T("Plan your week in two minutes", 144, 640, 900, { size: 44, color: "#155e75", name: "Subtitle" }),
        ...pill("Get the app", 140, 760, 380, 100, ["#22d3ee", "#0891b2", "#155e75"], WHITE, 40),
      ], "Today we launch Pocket Planner, the simplest way to plan your week."),
      slide("#f8fafc", [
        ext(T("Why people love it", 140, 110, 1100, { size: 86, bold: true, color: "#164e63", name: "Heading" }), "#cffafe", 45, -45, 10),
        ...[["icon-clock", "Two-minute planning", "Drag tasks into your week, done.", ["#a5f3fc", "#06b6d4", "#0e7490"]], ["icon-bell", "Gentle reminders", "A nudge at the right moment.", ["#fde68a", "#f59e0b", "#b45309"]], ["icon-users", "Shared lists", "Plan with family or your team.", ["#c4b5fd", "#8b5cf6", "#5b21b6"]]].flatMap(feat),
        ...phone(1400, 250, -6),
      ], "Three reasons: planning takes two minutes, reminders are gentle and lists can be shared."),
      slide(["#164e63", "#0f172a", 160], [
        ...phone(1380, 240, 8),
        ext(T("Download\ntoday", 140, 300, 1100, { size: 150, bold: true, color: WHITE, lh: 1, name: "Title" }), "#0e7490", 60),
        T("Free on iPhone and Android", 144, 680, 1000, { size: 44, color: "#a5f3fc", name: "Subtitle" }),
        ...pill("pocketplanner.app", 140, 790, 520, 100, ["#22d3ee", "#0891b2", "#155e75"], WHITE, 40),
      ], "It is free on both stores today. Thank you, and happy planning."),
    ];
  });
}
