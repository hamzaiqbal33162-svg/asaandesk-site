// ROUND 4 layout batch: own animated designs (choreographed entrance animations per element) for Instagram posts
// and presentations. Pure module, no imports. Every page plays in Present and in WebM / MP4 / GIF exports and is
// fully on screen within about 3 seconds: backgrounds fade first, then things enter in reading order.
// 7 Instagram posts (1080 × 1080) + 5 presentations (1920 × 1080, title / content / closing slides with notes).
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page } = k;
  const { WHITE } = k.K;
  const IG = "instagram-post", PR = "presentation-16x9";
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;

  /* ---------- motion helpers ---------- */
  const A = (l, type, delay, duration = 0.6) => { l.animation = { type, delay: r2(delay), duration: r2(duration) }; return l; };
  const AA = (list, type, delay, duration) => list.map((l) => A(l, type, delay, duration));
  // Typewriter time for a text (about 22 letters a second, 0.6 to 1.8 s).
  const tw = (l, delay) => A(l, "typewriter", delay, Math.min(1.8, Math.max(0.6, l.text.content.length * 0.045)));
  const grad = (l, stops, angle = 180) => { l.shape.gradient = { stops, angle }; return l; };
  function shadow(kind, x, y, w, h, o = {}) {
    const s = o.s ?? Math.max(5, Math.min(w, h) * 0.035), rad = o.radius || 0;
    return [[3, 0.05], [2, 0.07], [1, 0.1]].map(([i, op]) => { const g = s * (i - 1) * 0.8; return S(kind, r1(x - g / 2 + s * 0.3 * i), r1(y + s * i), r1(w + g), r1(h + s * (i - 1) * 0.5), "#000000", { op: r1(op * (o.k ?? 1) * 100) / 100, radius: rad ? r1(rad + s * (i - 1) * 0.4) : 0, rot: o.rot || 0, name: "Shadow" }); });
  }
  const card = (x, y, w, h, fill, o = {}) => { const c = R(x, y, w, h, fill, { radius: o.radius ?? 0, rot: o.rot || 0, name: o.name || "Card", op: o.op ?? 1 }); if (o.grad) grad(c, o.grad, o.angle ?? 180); return [...(o.shadow === false ? [] : shadow("rect", x, y, w, h, { radius: o.radius, rot: o.rot, s: o.s, k: o.k })), c]; };
  const mid = (s, x, y, w, h, o) => { const t = T(s, x, y, w, { align: "center", ...o }); t.y = r1(y + (h - t.h) / 2); return t; };
  const pill = (s, x, y, w, h, fill, color, size = 38, stops = null) => [...card(x, y, w, h, fill, { radius: h / 2, grad: stops, name: "Button" }), mid(s, x, y, w, h, { size, bold: true, color, name: "Button text" })];
  const photoCard = (x, y, w, h, rot, foot = 60) => [...shadow("rect", x, y, w, h, { rot, s: 10 }), R(x, y, w, h, WHITE, { rot, name: "Photo card" }), F(x + 18, y + 18, w - 36, h - 18 - foot, { rot, name: "Photo" })];
  const slide = (bg, layers, notes) => Object.assign(page(bg, layers), { notes });

  /* ================= Instagram posts ================= */
  /* 1. Launch day: product ring pops out of a burst, badge, headline, typed subline, button rises */
  tpl("pop-launch-motion", "Launch day animated post", IG, "product launch new release animated motion shop bottle", () => [page(["#0ea5e9", "#6366f1", 135], [
    A(C(560, 60, 460, 460, WHITE, { op: 0.12, name: "Glow circle" }), "fade", 0, 0.5),
    A(C(60, 700, 220, 220, WHITE, { op: 0.08, name: "Glow circle" }), "fade", 0, 0.5),
    A(E("deco-burst", 290, 130, 500, { c1: WHITE, c2: "#e0f2fe", op: 0.3 }), "pop", 0.15, 0.6),
    ...AA([...shadow("ellipse", 370, 200, 340, 340, { s: 10 }), C(370, 200, 340, 340, WHITE, { name: "Photo ring" }), F(390, 220, 300, 300, { shape: "circle", name: "Product photo" })], "pop", 0.35, 0.6),
    A(E("badge-new", 690, 170, 150, { c1: "#f43f5e", c2: WHITE, rot: 12 }), "pop", 0.75, 0.45),
    A(T("LAUNCH DAY", 40, 590, 1000, { size: 124, bold: true, color: WHITE, align: "center", name: "Headline" }), "pop", 0.95, 0.55),
    tw(T("Our smart bottle is finally here", 90, 750, 900, { size: 42, color: "#e0f2fe", align: "center", name: "Subline" }), 1.35),
    ...AA(pill("Order now", 340, 870, 400, 110, "#fde68a", "#1e1b4b", 46, ["#fef3c7", "#fde68a", "#fbbf24"]), "rise", 2.3, 0.5),
  ])]);

  /* 2. Grand opening countdown: tiles pop one after another, line wipes, date rises */
  tpl("countdown-opening-motion", "Grand opening countdown animated post", IG, "event grand opening countdown store launch animated motion days", () => {
    const tiles = [["03", "DAYS"], ["12", "HOURS"], ["45", "MINUTES"]].flatMap(([n, lab], i) => {
      const x = 80 + i * 320;
      return AA([...card(x, 430, 280, 300, "#fbbf24", { radius: 36, grad: ["#fde68a", "#fbbf24", "#f59e0b"], s: 10, k: 2 }), T(n, x, 470, 280, { size: 140, bold: true, color: "#111827", align: "center", lh: 1, name: "Number" }), T(lab, x, 640, 280, { size: 34, bold: true, color: "#78350f", align: "center", ls: 4, name: "Unit" })], "pop", 0.8 + i * 0.22, 0.5);
    });
    return [page(["#111827", "#1f2937", 180], [
      A(E("deco-hanging-stars", 60, 0, 180, { c1: "#fbbf24", c2: "#fde68a" }), "fade", 0, 0.6),
      A(E("deco-hanging-stars", 840, 0, 180, { c1: "#fbbf24", c2: "#fde68a" }), "fade", 0, 0.6),
      A(T("GRAND OPENING", 40, 130, 1000, { size: 40, bold: true, color: "#fbbf24", align: "center", ls: 10, name: "Kicker" }), "fade", 0.1, 0.5),
      A(T("The countdown is on", 40, 210, 1000, { size: 76, bold: true, color: WHITE, align: "center", lh: 1.05, name: "Headline" }), "rise", 0.3, 0.6),
      ...tiles,
      A(R(240, 800, 600, 6, "#fbbf24", { radius: 3, name: "Line" }), "wipe", 1.6, 0.5),
      A(T("Saturday, 10 am · Main Street", 40, 835, 1000, { size: 42, color: WHITE, align: "center", name: "Details" }), "rise", 1.85, 0.5),
      A(T("Free gift for the first 50 visitors", 40, 910, 1000, { size: 32, color: "#fde68a", align: "center", name: "Offer" }), "rise", 2.1, 0.5),
      A(E("deco-sparkles", 900, 880, 120, { c1: "#fbbf24", c2: WHITE }), "pop", 2.35, 0.45),
    ])];
  });

  /* 3. Menu: dish rows slide in one by one, prices pop */
  tpl("menu-rows-food-motion", "Today's menu animated post", IG, "food menu restaurant cafe lunch dishes animated motion prices", () => {
    const rows = [["Grilled chicken bowl", "$12"], ["Spicy lentil soup", "$7"], ["Garden pasta", "$10"], ["Mango cheesecake", "$6"]].flatMap(([dish, price], i) => {
      const y = 420 + i * 125, d = 0.9 + i * 0.25;
      return [...AA([...card(80, y, 920, 100, WHITE, { radius: 26, s: 6 }), T(dish, 120, y + 25, 640, { size: 42, bold: true, color: "#7c2d12", name: "Dish" })], "slide-right", d, 0.55), A(mid(price, 800, y, 170, 100, { size: 44, bold: true, color: "#ea580c", name: "Price" }), "pop", d + 0.3, 0.4)];
    });
    return [page("#fff7ed", [
      A(R(0, 0, 1080, 380, "#fed7aa", { name: "Header band" }), "fade", 0, 0.5),
      ...AA([C(685, 30, 330, 330, "#fb923c", { name: "Photo ring" }), F(700, 45, 300, 300, { shape: "circle", name: "Dish photo" })], "pop", 0.25, 0.55),
      A(T("Today's\nmenu", 80, 60, 560, { size: 112, family: "serif", bold: true, color: "#7c2d12", lh: 1, name: "Headline" }), "rise", 0.1, 0.6),
      tw(T("Fresh from our kitchen", 84, 300, 560, { size: 38, family: "serif", italic: true, color: "#9a3412", name: "Subline" }), 0.45),
      ...rows,
      A(T("Call to order · Free delivery nearby", 40, 950, 1000, { size: 34, bold: true, color: "#9a3412", align: "center", name: "Footer" }), "fade", 2.3, 0.5),
    ])];
  });

  /* 4. Quote: mark pops, words type out, ornament wipes, author rises */
  tpl("typewriter-quote-motion", "Typewriter quote animated post", IG, "quote motivation inspiration daily words animated motion typewriter", () => [page("#f5f3ff", [
    A(C(700, 60, 320, 320, "#ddd6fe", { name: "Circle" }), "fade", 0, 0.6),
    A(C(60, 800, 220, 220, "#ede9fe", { name: "Circle" }), "fade", 0, 0.6),
    A(T("“", 90, 170, 300, { size: 340, family: "serif", bold: true, color: "#7c3aed", lh: 1, name: "Quote mark" }), "pop", 0.1, 0.5),
    tw(T("Done is better than perfect. Start today.", 100, 470, 860, { size: 64, family: "serif", color: "#1e1b4b", lh: 1.2, name: "Quote" }), 0.5),
    A(E("line-ornament", 100, 730, 320, { c1: "#7c3aed" }), "wipe", 2.3, 0.4),
    A(T("— Your name", 100, 800, 700, { size: 40, bold: true, color: "#6d28d9", name: "Author" }), "rise", 2.4, 0.5),
  ])]);

  /* 5. Fitness: progress bars wipe in, values pop */
  tpl("progress-bars-fitness-motion", "Weekly fitness progress animated post", IG, "fitness gym workout progress stats running animated motion health", () => {
    const rows = [["Running", "42 km", 0.84], ["Cycling", "120 km", 0.7], ["Strength", "5 sessions", 0.62], ["Sleep", "7.5 h a night", 0.9]].flatMap(([lab, val, p], i) => {
      const y = 330 + i * 150, d = 0.6 + i * 0.3;
      return [A(T(lab, 80, y, 420, { size: 38, bold: true, color: WHITE, name: "Label" }), "slide-right", d, 0.5), A(R(80, y + 62, 920, 36, "#1e293b", { radius: 18, name: "Track" }), "fade", d, 0.5), A(grad(R(80, y + 62, r1(920 * p), 36, "#a3e635", { radius: 18, name: "Progress" }), ["#bef264", "#84cc16"], 90), "wipe", d + 0.2, 0.7), A(T(val, 560, y, 440, { size: 38, bold: true, color: "#bef264", align: "right", name: "Value" }), "pop", d + 0.5, 0.4)];
    });
    return [page(["#0f172a", "#111827", 180], [
      A(C(680, 0, 400, 400, "#a3e635", { op: 0.08, name: "Glow circle" }), "fade", 0, 0.5),
      A(T("Weekly progress", 80, 90, 920, { size: 96, bold: true, color: WHITE, name: "Headline" }), "rise", 0.1, 0.6),
      A(T("Week 32 · Keep the streak going", 84, 210, 920, { size: 38, color: "#cbd5e1", name: "Subline" }), "fade", 0.35, 0.5),
      ...rows,
      ...AA(pill("Keep going!", 330, 930, 420, 100, "#a3e635", "#0f172a", 44, ["#d9f99d", "#a3e635", "#65a30d"]), "rise", 2.4, 0.5),
    ])];
  });

  /* 6. Flash sale: words slide in from both sides, offer card pops, badge, button */
  tpl("flash-sale-motion", "Flash sale animated post", IG, "sale flash discount offer shop deal animated motion weekend", () => [page(["#f43f5e", "#be123c", 160], [
    ...[0, 1, 2].map((i) => A(R(-60 + i * 380, -40, 140, 1160, WHITE, { op: 0.07, rot: 20, name: "Stripe" }), "fade", 0, 0.5)).map((l) => { l.x = Math.max(0, l.x); l.y = 0; l.h = 1080; return l; }),
    A(T("FLASH", 40, 120, 1000, { size: 180, bold: true, color: "#fde68a", align: "center", lh: 1, name: "Headline 1" }), "slide-right", 0.2, 0.55),
    A(T("SALE", 40, 300, 1000, { size: 220, bold: true, color: WHITE, align: "center", lh: 1, name: "Headline 2" }), "slide-left", 0.4, 0.55),
    ...AA([...card(240, 590, 600, 230, WHITE, { radius: 40, s: 10, k: 1.6 }), T("70% OFF", 240, 625, 600, { size: 96, bold: true, color: "#be123c", align: "center", lh: 1, name: "Offer" }), T("on selected items", 240, 740, 600, { size: 36, color: "#9f1239", align: "center", name: "Offer note" })], "pop", 0.95, 0.55),
    A(E("badge-hot", 800, 500, 200, { c1: "#fde68a", c2: "#9f1239", rot: 10 }), "pop", 1.35, 0.45),
    ...AA(pill("Ends at midnight", 300, 890, 480, 100, "#1f2937", WHITE, 38), "rise", 1.7, 0.5),
    A(E("deco-sparkles", 70, 860, 130, { c1: "#fde68a", c2: WHITE }), "pop", 2.1, 0.45),
  ])]);

  /* 7. Travel postcard: photos slide in from both sides, title rises, subline types, stamp pops */
  tpl("postcard-travel-motion", "Postcard travel animated post", IG, "travel trip holiday coast postcard vacation animated motion tour", () => [page(["#e0f2fe", "#bae6fd", 180], [
    A(E("icon-sun", 880, 40, 140, { c1: "#f59e0b" }), "pop", 0.05, 0.5),
    ...AA(photoCard(90, 120, 440, 400, -6), "slide-right", 0.2, 0.6),
    ...AA(photoCard(550, 150, 440, 400, 5), "slide-left", 0.4, 0.6),
    A(T("Wish you were here", 40, 620, 1000, { size: 72, family: "serif", italic: true, bold: true, color: "#0c4a6e", align: "center", name: "Headline" }), "rise", 0.9, 0.6),
    tw(T("Postcards from the coast", 90, 740, 900, { size: 42, color: "#075985", align: "center", name: "Subline" }), 1.3),
    ...AA([C(820, 830, 180, 180, "#f97316", { name: "Stamp" }), mid("2026", 820, 830, 180, 180, { size: 46, bold: true, color: WHITE, name: "Stamp text" })], "pop", 2.05, 0.45),
    ...AA(pill("Book your trip", 80, 880, 440, 100, "#0369a1", WHITE, 40), "rise", 2.3, 0.5),
  ])]);

  /* ================= Presentations (3 slides each) ================= */
  /* D1. Pitch: words rise one after another, cards pop 1-2-3, closing pops */
  tpl("kinetic-pitch-motion-deck", "Kinetic pitch animated presentation", PR, "presentation pitch startup business investor animated motion deck", () => {
    const step = ([icon, title, body], i) => { const x = 140 + i * 570, d = 0.6 + i * 0.3; return [...AA([...card(x, 360, 500, 470, "#1e1b4b", { radius: 36, s: 12, k: 2 }), C(x + 40, 400, 120, 120, "#a78bfa", { name: "Icon circle" }), E(icon, x + 70, 430, 60, { c1: "#1e1b4b" }), T(title, x + 40, 560, 420, { size: 50, bold: true, color: WHITE, name: "Card title" }), T(body, x + 40, 640, 420, { size: 34, color: "#c4b5fd", lh: 1.35, name: "Card text" })], "pop", d, 0.5)]; };
    return [
      slide(["#0f0a2e", "#312e81", 135], [
        A(C(1220, 0, 700, 700, "#7c3aed", { op: 0.25, name: "Glow circle" }), "fade", 0, 0.6),
        A(T("SEED ROUND · 2027", 140, 250, 900, { size: 36, bold: true, color: "#a78bfa", ls: 8, name: "Kicker" }), "fade", 0.1, 0.5),
        A(T("Small shops.", 140, 320, 1500, { size: 150, bold: true, color: WHITE, lh: 1, name: "Title line 1" }), "rise", 0.3, 0.6),
        A(T("Big tools.", 140, 480, 1500, { size: 150, bold: true, color: "#c4b5fd", lh: 1, name: "Title line 2" }), "rise", 0.55, 0.6),
        A(R(144, 690, 240, 10, "#a78bfa", { radius: 5, name: "Accent line" }), "wipe", 0.95, 0.5),
        tw(T("A simple shop app for the next million sellers", 144, 730, 1500, { size: 44, color: "#e0e7ff", name: "Subtitle" }), 1.15),
      ], "Hi, we are building the simplest shop app for small sellers. Two lines say it all: small shops, big tools."),
      slide(["#0f0a2e", "#1e1b4b", 160], [
        A(T("How it works", 140, 120, 1400, { size: 90, bold: true, color: WHITE, name: "Heading" }), "rise", 0.1, 0.6),
        A(T("Three steps from first sale to steady growth", 144, 240, 1500, { size: 40, color: "#c4b5fd", name: "Intro" }), "fade", 0.35, 0.5),
        ...[["icon-mobile", "Set up", "Open a shop on your phone in five minutes."], ["icon-cart", "Sell", "Take orders and payments in one place."], ["icon-idea", "Grow", "See what sells and restock in time."]].flatMap(step),
      ], "The product in three steps: set up in five minutes, sell in one place, grow with simple insights."),
      slide(["#312e81", "#0f0a2e", 135], [
        A(C(760, 120, 400, 400, "#7c3aed", { op: 0.3, name: "Glow circle" }), "fade", 0, 0.6),
        A(E("deco-sparkles", 880, 210, 160, { c1: "#fde68a", c2: WHITE }), "pop", 0.2, 0.5),
        A(T("Let's build it together", 140, 520, 1640, { size: 120, bold: true, color: WHITE, align: "center", name: "Title" }), "pop", 0.5, 0.6),
        A(T("founders@yourstartup.com", 140, 700, 1640, { size: 44, bold: true, color: "#fde68a", align: "center", name: "Contact" }), "rise", 1.1, 0.5),
      ], "Thank you. We would love to build this with you. Our email is on the slide."),
    ];
  });

  /* D2. Roadmap: the line wipes across, milestones pop in order */
  tpl("milestones-roadmap-motion-deck", "Roadmap milestones animated presentation", PR, "presentation roadmap timeline plan project milestones animated motion", () => {
    const ms = [["Jan", "Research"], ["Mar", "Prototype"], ["May", "Pilot"], ["Aug", "Launch"], ["Nov", "Scale"]];
    const items = ms.flatMap(([when, what], i) => {
      const cx = 260 + i * 350, d = 0.9 + i * 0.3, up = i % 2 === 0;
      return [A(C(cx - 55, 545, 110, 110, ["#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b", "#f43f5e"][i], { name: "Milestone" }), "pop", d, 0.4), A(T(when, cx - 160, up ? 370 : 690, 320, { size: 56, bold: true, color: "#0f172a", align: "center", name: "When" }), "rise", d + 0.15, 0.45), A(T(what, cx - 160, up ? 445 : 765, 320, { size: 40, color: "#475569", align: "center", name: "What" }), "rise", d + 0.2, 0.45)];
    });
    return [
      slide(["#f0f9ff", "#e0f2fe", 180], [
        A(R(0, 820, 1920, 260, "#bae6fd", { name: "Band" }), "fade", 0, 0.5),
        A(T("PROJECT PLAN", 140, 260, 900, { size: 36, bold: true, color: "#0284c7", ls: 8, name: "Kicker" }), "fade", 0.1, 0.5),
        A(T("Roadmap 2027", 140, 320, 1600, { size: 160, bold: true, color: "#0c4a6e", lh: 1, name: "Title" }), "rise", 0.3, 0.6),
        A(R(144, 530, 600, 12, "#0ea5e9", { radius: 6, name: "Line" }), "wipe", 0.8, 0.6),
        A(T("Five milestones, one year", 144, 580, 1200, { size: 48, color: "#075985", name: "Subtitle" }), "rise", 1.1, 0.5),
      ], "This is our plan for 2027: five milestones in one year."),
      slide("#ffffff", [
        A(T("Milestones", 140, 110, 1400, { size: 90, bold: true, color: "#0c4a6e", name: "Heading" }), "rise", 0.1, 0.6),
        A(R(140, 594, 1640, 12, "#cbd5e1", { radius: 6, name: "Timeline" }), "wipe", 0.4, 0.8),
        ...items,
      ], "We start with research in January and finish the year scaling up in November."),
      slide(["#0c4a6e", "#082f49", 160], [
        A(E("arrow-right", 1300, 420, 360, { c1: "#38bdf8" }), "slide-left", 0.2, 0.6),
        A(T("Next stop:\nlaunch", 140, 330, 1100, { size: 150, bold: true, color: WHITE, lh: 1, name: "Title" }), "rise", 0.4, 0.6),
        A(T("Questions about the plan?", 144, 700, 1100, { size: 48, color: "#bae6fd", name: "Subtitle" }), "fade", 1.0, 0.5),
      ], "Our next big moment is the August launch. Any questions about the plan?"),
    ];
  });

  /* D3. Lesson: steps slide in one by one, numbers pop */
  tpl("story-steps-lesson-motion-deck", "Story writing lesson animated presentation", PR, "presentation lesson education school writing story class animated motion", () => {
    const steps = [["Pick a hero", "Someone who wants something."], ["Add a problem", "Something stands in the way."], ["Make it hard", "The hero tries and fails."], ["Find the ending", "Show what the hero learns."]].flatMap(([t1, t2], i) => {
      const y = 290 + i * 180, d = 0.5 + i * 0.35;
      return [...AA([...card(260, y, 1500, 150, WHITE, { radius: 30, s: 7 }), T(t1, 320, y + 22, 1100, { size: 50, bold: true, color: "#7c2d12", name: "Step" }), T(t2, 320, y + 88, 1100, { size: 34, color: "#9a3412", name: "Step text" })], "slide-right", d, 0.55), ...AA([C(140, y + 15, 120, 120, "#f59e0b", { name: "Number circle" }), mid(String(i + 1), 140, y + 15, 120, 120, { size: 60, bold: true, color: WHITE, name: "Number" })], "pop", d + 0.25, 0.4)];
    });
    return [
      slide(["#fffbeb", "#fef3c7", 180], [
        A(E("deco-stars", 1500, 120, 260, { c1: "#f59e0b", c2: "#fb923c" }), "pop", 0.1, 0.5),
        A(T("ENGLISH · WRITING", 140, 280, 900, { size: 36, bold: true, color: "#d97706", ls: 8, name: "Kicker" }), "fade", 0.1, 0.5),
        A(T("How to write\na great story", 140, 340, 1500, { size: 140, bold: true, color: "#7c2d12", lh: 1, name: "Title" }), "rise", 0.3, 0.6),
        tw(T("Four steps you can use today", 144, 660, 1200, { size: 48, color: "#9a3412", name: "Subtitle" }), 0.9),
      ], "Today we learn four steps that every good story uses."),
      slide("#fff7ed", [
        A(T("Four steps", 140, 100, 1400, { size: 90, bold: true, color: "#7c2d12", name: "Heading" }), "rise", 0.1, 0.6),
        ...steps,
      ], "Go through the steps one by one. Ask the class for a hero and a problem for each step."),
      slide(["#f59e0b", "#ea580c", 135], [
        A(E("icon-pencil", 860, 150, 200, { c1: WHITE }), "pop", 0.1, 0.5),
        A(T("Your turn!", 140, 420, 1640, { size: 160, bold: true, color: WHITE, align: "center", name: "Title" }), "pop", 0.4, 0.6),
        tw(T("Write a short story in ten sentences.", 140, 650, 1640, { size: 52, color: "#fffbeb", align: "center", name: "Task" }), 1.0),
      ], "Now it is your turn. Write a story of ten sentences that uses all four steps."),
    ];
  });

  /* D4. Report: horizontal bars wipe in, numbers pop, takeaways rise */
  tpl("results-bars-report-motion-deck", "Results report animated presentation", PR, "presentation report results sales quarterly business chart animated motion", () => {
    const bars = [["North", 0.92, "$1.8M"], ["South", 0.74, "$1.4M"], ["East", 0.58, "$1.1M"], ["West", 0.41, "$0.8M"]].flatMap(([lab, p, val], i) => {
      const y = 330 + i * 160, d = 0.5 + i * 0.3;
      return [A(T(lab, 140, y + 18, 260, { size: 44, bold: true, color: "#134e4a", name: "Region" }), "fade", d, 0.4), A(grad(R(420, y, r1(1100 * p), 90, "#14b8a6", { radius: 16, name: "Bar" }), ["#5eead4", "#0d9488"], 90), "wipe", d + 0.1, 0.7), A(T(val, r1(440 + 1100 * p), y + 18, 260, { size: 44, bold: true, color: "#0f766e", name: "Value" }), "pop", d + 0.6, 0.4)];
    });
    const take = ([big, small], i) => { const x = 140 + i * 570, d = 0.6 + i * 0.3; return AA([...card(x, 380, 500, 360, WHITE, { radius: 32, s: 10 }), T(big, x + 40, 430, 420, { size: 110, bold: true, color: "#0d9488", lh: 1, name: "Number" }), T(small, x + 40, 580, 420, { size: 36, color: "#334155", lh: 1.35, name: "Label" })], "rise", d, 0.55); };
    return [
      slide(["#f0fdfa", "#ccfbf1", 180], [
        A(C(1380, 160, 520, 520, "#99f6e4", { name: "Circle" }), "fade", 0, 0.6),
        A(C(1560, 640, 260, 260, "#5eead4", { name: "Circle" }), "fade", 0.1, 0.6),
        A(T("Q3 RESULTS", 140, 300, 900, { size: 36, bold: true, color: "#0d9488", ls: 8, name: "Kicker" }), "fade", 0.1, 0.5),
        A(T("Sales by region", 140, 360, 1200, { size: 140, bold: true, color: "#134e4a", lh: 1, name: "Title" }), "rise", 0.3, 0.6),
        A(T("July to September", 144, 540, 900, { size: 48, color: "#115e59", name: "Subtitle" }), "rise", 0.6, 0.5),
      ], "Here are the third-quarter sales, region by region."),
      slide("#ffffff", [
        A(T("Revenue by region", 140, 110, 1400, { size: 86, bold: true, color: "#134e4a", name: "Heading" }), "rise", 0.1, 0.6),
        ...bars,
      ], "North leads with 1.8 million. West is smallest but grew fastest."),
      slide(["#f0fdfa", "#ccfbf1", 180], [
        A(T("Three takeaways", 140, 130, 1400, { size: 90, bold: true, color: "#134e4a", name: "Heading" }), "rise", 0.1, 0.6),
        ...[["+18%", "Total revenue against last quarter"], ["2 of 4", "Regions above target"], ["West", "Fastest growth: give it more support"]].flatMap(take),
      ], "Three things to remember: revenue is up 18 percent, two regions beat target and the West needs support."),
    ];
  });

  /* D5. Event agenda: talks slide in from the right, times pop, confetti at the end */
  tpl("conference-agenda-motion-deck", "Conference agenda animated presentation", PR, "presentation event conference agenda schedule talks animated motion", () => {
    const talks = [["09:30", "Welcome and coffee"], ["10:00", "Keynote: designing for everyone"], ["11:30", "Panel: small teams, big ideas"], ["13:00", "Lunch and demos"], ["14:30", "Workshops in three rooms"]].flatMap(([time, title], i) => {
      const y = 270 + i * 150, d = 0.5 + i * 0.25;
      return [...AA([...card(420, y, 1360, 120, WHITE, { radius: 28, s: 6 }), T(title, 470, y + 32, 1260, { size: 46, bold: true, color: "#3b0764", name: "Talk" })], "slide-left", d, 0.55), ...AA([R(140, y, 240, 120, "#a855f7", { radius: 28, name: "Time box" }), mid(time, 140, y, 240, 120, { size: 48, bold: true, color: WHITE, name: "Time" })], "pop", d + 0.2, 0.4)];
    });
    return [
      slide(["#3b0764", "#6b21a8", 135], [
        A(E("deco-bunting", 1260, 0, 560, { c1: "#f0abfc", c2: "#fde68a" }), "fade", 0, 0.6),
        A(T("JUNE 12 · CITY HALL", 140, 300, 900, { size: 38, bold: true, color: "#f0abfc", ls: 8, name: "Kicker" }), "fade", 0.1, 0.5),
        A(T("Make Things\nConference", 140, 360, 1500, { size: 150, bold: true, color: WHITE, lh: 1, name: "Title" }), "rise", 0.3, 0.6),
        tw(T("One day of talks, panels and workshops", 144, 700, 1400, { size: 46, color: "#f5d0fe", name: "Subtitle" }), 0.9),
      ], "Welcome to Make Things, a one-day conference of talks, panels and workshops."),
      slide("#faf5ff", [
        A(T("Today's agenda", 140, 90, 1400, { size: 86, bold: true, color: "#3b0764", name: "Heading" }), "rise", 0.1, 0.6),
        ...talks,
      ], "Here is the day. Workshops after lunch are in rooms A, B and C."),
      slide(["#6b21a8", "#3b0764", 135], [
        A(E("deco-confetti", 140, 120, 260, { c1: "#fde68a", c2: "#f0abfc" }), "pop", 0.1, 0.5),
        A(E("deco-confetti", 1520, 680, 260, { c1: "#a7f3d0", c2: "#fde68a" }), "pop", 0.3, 0.5),
        A(T("See you there!", 140, 430, 1640, { size: 150, bold: true, color: WHITE, align: "center", name: "Title" }), "pop", 0.5, 0.6),
        A(T("Tickets at makethings.events", 140, 640, 1640, { size: 48, color: "#f5d0fe", align: "center", name: "Subtitle" }), "rise", 1.1, 0.5),
      ], "Thank you. Tickets are on the website, see you there."),
    ];
  });
}
