// ROUND 2 layout batch (filled by a helper; see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md). Pure module, no imports.
// 60 own print layouts: 15 flyers, 15 posters, 15 invitations, 15 brochures (ids end in "-pr2").
// Text stays 12 px inside the page; shapes and photos that touch an edge run 12 px past it (print bleed).
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page, flow } = k;
  const { INK, MUTED, WHITE } = k.K;
  const EDGE = 12;

  // Each layout is drawn in a reference space `ref` units wide and scaled to the real page (W × H px).
  function kit(W, H, ref = W) {
    const u = W / ref, h = H / u, b = EDGE / u + 0.5;
    const sc = (o = {}) => {
      const r = { ...o };
      for (const key of ["size", "sw", "radius", "ls"]) if (r[key]) r[key] *= u;
      if (r.shadow) r.shadow = { ...r.shadow, x: r.shadow.x * u, y: r.shadow.y * u, blur: r.shadow.blur * u };
      if (r.outline) r.outline = { ...r.outline, width: r.outline.width * u };
      if (r.border) r.border = { ...r.border, width: r.border.width * u };
      return r;
    };
    // Rectangles and photo frames that touch a page edge are extended past it (bleed).
    const bl = (x, y, w, hh) => {
      let x0 = x, y0 = y, x1 = x + w, y1 = y + hh;
      if (x0 <= 0.5 && x0 > -b) x0 = -b;
      if (y0 <= 0.5 && y0 > -b) y0 = -b;
      if (x1 >= ref - 0.5 && x1 < ref + b) x1 = ref + b;
      if (y1 >= h - 0.5 && y1 < h + b) y1 = h + b;
      return [x0 * u, y0 * u, (x1 - x0) * u, (y1 - y0) * u];
    };
    const t = (s, x, y, w, o = {}) => T(s, x * u, y * u, w * u, sc(o));
    return {
      u, w: ref, h, t,
      /** text centred vertically in the band y .. y + bh */
      tm: (s, x, y, w, bh, o = {}) => { const l = t(s, x, y, w, o); l.y = (y + bh / 2) * u - l.h / 2; return l; },
      r: (x, y, w, hh, fill, o = {}) => R(...bl(x, y, w, hh), fill, sc(o)),
      c: (x, y, w, hh, fill, o = {}) => C(x * u, y * u, w * u, hh * u, fill, sc(o)),
      s: (kind, x, y, w, hh, fill, o = {}) => S(kind, x * u, y * u, w * u, hh * u, fill, sc(o)),
      f: (x, y, w, hh, o = {}) => F(...bl(x, y, w, hh), sc(o)),
      e: (id, x, y, w, o = {}) => E(id, x * u, y * u, w * u, o.h ? { ...o, h: o.h * u } : o),
      /** stacks layers down from y; numbers between items are gaps (reference units) */
      col: (y, ...items) => flow(y * u, ...items.map((it) => (typeof it === "number" ? it * u : it))),
      /** a stack centred vertically in the band y .. y + bh */
      colm: (y, bh, ...items) => {
        const tot = items.reduce((a, it) => a + (typeof it === "number" ? it * u : it.h), 0);
        return flow((y + bh / 2) * u - tot / 2, ...items.map((it) => (typeof it === "number" ? it * u : it)));
      },
      /** bottom of a layer in reference units */
      bot: (l) => (l.y + l.h) / u,
    };
  }
  const FT = "flyer leaflet print ", PT = "poster print wall ", IT = "invitation invite card ", BT = "brochure pamphlet print ";

  /* ================= Flyers ================= */
  tpl("summer-clearance-flyer-pr2", "Summer clearance sale flyer", "flyer-a4", FT + "sale summer clearance discount shop store retail offer", (W, H) => {
    const { h, t, r, c, f, e, colm } = kit(W, H, 800);
    return [page("#fff4dc", [
      t("SEASON END · 3 DAYS ONLY", 60, 50, 680, { size: 22, bold: true, color: "#9a3412", align: "center", ls: 6 }),
      e("deco-sparkles", 690, 30, 80, { c1: "#f97316", c2: "#0f172a" }),
      r(-60, 150, 920, 260, "#f97316", { rot: -6, name: "Sale band" }),
      t("SUMMER\nCLEARANCE", 40, 185, 720, { size: 100, bold: true, color: WHITE, align: "center", lh: 0.95, rot: -6 }),
      f(40, 470, 420, 420, { shape: "rounded", radius: 24, name: "Product photo" }),
      c(470, 440, 290, 290, "#0f172a", { name: "Discount circle" }),
      colm(440, 290,
        t("UP TO", 485, 0, 260, { size: 30, bold: true, color: "#fde68a", align: "center", ls: 4 }),
        t("70%", 485, 0, 260, { size: 112, bold: true, color: WHITE, align: "center", lh: 1 }),
        t("OFF", 485, 0, 260, { size: 44, bold: true, color: "#fb923c", align: "center", ls: 6 })),
      t("Swimwear\nSandals\nSun hats\nBeach bags", 500, 760, 260, { size: 26, bold: true, color: "#0f172a", lh: 1.45 }),
      r(0, 950, 800, h - 950, "#0f172a", { name: "Footer" }),
      t("Sat 12 – Mon 14 July", 40, 980, 720, { size: 42, bold: true, color: WHITE, align: "center" }),
      t("Sunny Days Store · 21 Harbour Road · sunnydays.shop", 40, 1045, 720, { size: 20, color: "#fed7aa", align: "center" }),
    ])];
  });
  tpl("vote-campaign-flyer-pr2", "Election campaign flyer", "flyer-a4", FT + "campaign election vote candidate school board politics council", (W, H) => {
    const { h, t, r, f, e, tm, col } = kit(W, H, 800);
    const NV = "#1e3a8a", RD = "#dc2626";
    const pledges = [["icon-users", "Smaller classes", "Hire 40 new teachers and cap classes at 25 pupils."], ["icon-location", "Safer routes", "Crossings, lights and cycle lanes near every school."], ["icon-document", "Open budgets", "Every school spend published online, every term."]];
    return [page(WHITE, [
      r(0, 0, 360, 640, NV, { name: "Name panel" }),
      f(360, 0, 440, 640, { name: "Candidate photo" }),
      r(0, 640, 800, 16, RD, { name: "Stripe" }),
      col(70,
        t("VOTE", 40, 0, 290, { size: 96, bold: true, color: WHITE, lh: 0.95 }), 6,
        t("FOR", 40, 0, 290, { size: 36, bold: true, color: "#fca5a5", ls: 8 }), 28,
        t("Sara\nMalik", 40, 0, 290, { size: 64, family: "serif", bold: true, color: WHITE, lh: 1 }), 22,
        t("for School Board", 40, 0, 290, { size: 26, color: "#bfdbfe" })),
      r(40, 540, 280, 64, WHITE, { radius: 32, name: "Ballot pill" }),
      e("icon-check-circle", 52, 548, 48, { c1: RD }),
      tm("BALLOT NO. 7", 108, 540, 200, 64, { size: 22, bold: true, color: NV, ls: 2 }),
      t("Three promises", 50, 694, 700, { size: 34, bold: true, color: NV }),
      ...pledges.flatMap(([ic, hd, tx], i) => [
        e(ic, 50 + i * 240, 756, 52, { c1: RD }),
        t(hd, 50 + i * 240, 822, 220, { size: 24, bold: true, color: INK }),
        t(tx, 50 + i * 240, 860, 220, { size: 17, color: MUTED, lh: 1.45 }),
      ]),
      r(0, 990, 800, h - 990, NV, { name: "Footer" }),
      t("Election day · Thursday 5 November", 50, 1012, 700, { size: 32, bold: true, color: WHITE }),
      t("Polls open 7 am – 8 pm · Find your polling place at votesara.org", 50, 1062, 700, { size: 18, color: "#bfdbfe" }),
    ])];
  });
  tpl("salsa-class-flyer-pr2", "Salsa dance class flyer", "flyer-a4", FT + "dance salsa class lessons music latin studio event", (W, H) => {
    const { t, r, c, f, e, tm } = kit(W, H, 800);
    const rows = [["Beginners", "Mon 7 pm"], ["Improvers", "Wed 7 pm"], ["Social night", "Fri 9 pm"]];
    return [page(["#4c0519", "#be123c", 160], [
      c(180, 60, 440, 440, "#fbbf24", { name: "Photo ring" }),
      f(195, 75, 410, 410, { shape: "circle", name: "Dancers photo" }),
      e("deco-sparkles", 610, 60, 110, { c1: "#fde68a", c2: WHITE }),
      e("deco-sparkle", 90, 380, 70, { c1: "#fde68a" }),
      t("Salsa", 40, 505, 720, { size: 150, family: "serif", italic: true, bold: true, color: "#fde68a", align: "center", lh: 1 }),
      t("DANCE CLASSES FOR EVERYONE", 40, 668, 720, { size: 28, bold: true, color: WHITE, align: "center", ls: 6 }),
      ...rows.flatMap(([a, b], i) => [
        r(110, 735 + i * 72, 580, 58, "#881337", { radius: 29, name: "Class row" }),
        tm(a, 145, 735 + i * 72, 300, 58, { size: 24, bold: true, color: WHITE }),
        tm(b, 455, 735 + i * 72, 205, 58, { size: 24, bold: true, color: "#fde68a", align: "right" }),
      ]),
      t("First class free · $8 drop-in", 40, 975, 720, { size: 32, bold: true, color: WHITE, align: "center" }),
      t("Studio Ritmo · 14 Mill Lane · ritmo.dance", 40, 1030, 720, { size: 20, color: "#fff1f2", align: "center" }),
    ])];
  });
  tpl("blood-drive-flyer-pr2", "Blood donation drive flyer", "flyer-a4", FT + "charity blood donation drive health hospital volunteer donor community", (W, H) => {
    const { h, t, r, c, e, tm, colm } = kit(W, H, 800);
    const RD = "#dc2626";
    const stats = [["1", "donation"], ["3", "lives saved"], ["45", "minutes, start to finish"]];
    const info = [["icon-calendar", "Saturday 18 October"], ["icon-clock", "9 am – 3 pm"], ["icon-location", "Community Hall, 5 Park Road"]];
    return [page(WHITE, [
      r(0, 0, 800, 470, RD, { name: "Red header" }),
      c(-100, 400, 1000, 160, WHITE, { name: "Wave" }),
      e("shape-drop", 330, 50, 140, { c1: WHITE }),
      e("shape-plus", 374, 112, 52, { c1: RD }),
      t("BLOOD DONATION DRIVE", 40, 218, 720, { size: 26, bold: true, color: "#fee2e2", align: "center", ls: 6 }),
      t("Be someone's hero", 40, 262, 720, { size: 68, bold: true, color: WHITE, align: "center" }),
      ...stats.flatMap(([n, l], i) => [
        r(60 + i * 240, 520, 200, 160, "#fef2f2", { radius: 16, name: "Stat box" }),
        colm(520, 160, t(n, 70 + i * 240, 0, 180, { size: 64, bold: true, color: RD, align: "center", lh: 1.05 }), 4, t(l, 70 + i * 240, 0, 180, { size: 18, color: INK, align: "center" })),
      ]),
      ...info.flatMap(([ic, s], i) => [e(ic, 150, 718 + i * 64, 40, { c1: RD }), tm(s, 208, 718 + i * 64, 480, 40, { size: 28, bold: true, color: INK })]),
      t("Bring photo ID · Eat a good meal first · Walk-ins welcome", 60, 925, 680, { size: 19, color: MUTED, align: "center" }),
      r(0, 1000, 800, h - 1000, RD, { name: "Footer" }),
      tm("Book your slot: givelife.org · 0800 555 019", 40, 1000, 720, h - 1000, { size: 26, bold: true, color: WHITE, align: "center" }),
    ])];
  });
  tpl("pizza-menu-flyer-pr2", "Pizza menu flyer", "flyer-a5", FT + "menu pizza restaurant takeaway food delivery prices", (W, H) => {
    const { h, t, r, c, f, e, tm, colm } = kit(W, H, 800);
    const menu = [["Margherita", "9", "Tomato, mozzarella, fresh basil"], ["Pepperoni", "11", "Double pepperoni, oregano, chilli oil"], ["Four Cheese", "12", "Mozzarella, gorgonzola, parmesan, ricotta"], ["Veggie Garden", "11", "Peppers, mushrooms, olives, red onion"], ["BBQ Chicken", "13", "Smoky sauce, chicken, sweetcorn"], ["Spicy Tikka", "13", "Chicken tikka, green chilli, mint drizzle"]];
    return [page("#1c1917", [
      c(130, -290, 540, 540, "#dc2626", { name: "Plate ring" }),
      f(150, -270, 500, 500, { shape: "circle", name: "Pizza photo" }),
      c(615, 150, 150, 150, "#fbbf24", { name: "Deal circle" }),
      colm(150, 150, t("2 for 1", 625, 0, 130, { size: 30, bold: true, color: "#1c1917", align: "center", lh: 1.05 }), t("TUESDAYS", 625, 0, 130, { size: 17, bold: true, color: "#1c1917", align: "center" })),
      t("LUIGI'S", 40, 300, 720, { size: 34, bold: true, color: "#fbbf24", align: "center", ls: 12 }),
      t("Pizza Menu", 40, 345, 720, { size: 88, family: "serif", bold: true, color: WHITE, align: "center", lh: 1 }),
      e("line-diamonds", 300, 444, 200, { c1: "#fbbf24" }),
      ...menu.flatMap(([n, p, d], i) => [
        t(n, 60, 495 + i * 90, 480, { size: 30, bold: true, color: WHITE }),
        t("$" + p, 560, 495 + i * 90, 180, { size: 30, bold: true, color: "#fbbf24", align: "right" }),
        t(d, 60, 535 + i * 90, 680, { size: 21, color: "#d6d3d1" }),
      ]),
      r(0, h - 96, 800, 96, "#dc2626", { name: "Footer" }),
      tm("Order: 0300 555 0123 · Free delivery over $25", 40, h - 96, 720, 96, { size: 24, bold: true, color: WHITE, align: "center" }),
    ])];
  });
  tpl("piano-lessons-flyer-pr2", "Piano lessons flyer", "flyer-a5", FT + "music piano lessons teacher school class kids adults", (W, H) => {
    const { h, t, r, c, f, tm } = kit(W, H, 800);
    const levels = [["Little hands, age 5–8", "$20"], ["Beginners and returners", "$28"], ["Exam prep, grades 1–8", "$35"]];
    const black = [1, 2, 4, 5, 6, 8, 9];
    return [page("#fdf6ec", [
      t("LEARN TO PLAY", 60, 70, 420, { size: 26, bold: true, color: "#b45309", ls: 8 }),
      t("Piano\nlessons", 60, 110, 420, { size: 104, family: "serif", bold: true, color: INK, lh: 0.95 }),
      c(490, 70, 270, 270, "#f59e0b", { name: "Photo ring" }),
      f(505, 85, 240, 240, { shape: "circle", name: "Teacher photo" }),
      t("with Miss Elena Park · 12 years of teaching", 60, 350, 680, { size: 24, family: "serif", italic: true, color: "#57534e" }),
      ...levels.flatMap(([a, p], i) => [
        c(64, 427 + i * 70, 24, 24, "#f59e0b", { name: "Dot" }),
        tm(a, 110, 420 + i * 70, 470, 38, { size: 28, bold: true, color: INK }),
        tm(p, 600, 420 + i * 70, 140, 38, { size: 28, bold: true, color: "#b45309", align: "right" }),
      ]),
      r(60, 640, 680, 110, "#1f2937", { radius: 18, name: "Offer box" }),
      tm("First lesson free · Home or studio visits", 80, 640, 640, 110, { size: 26, bold: true, color: WHITE, align: "center" }),
      t("Call 555 0199 · pianowithhana.com", 40, 782, 720, { size: 26, bold: true, color: INK, align: "center" }),
      r(0, 846, 800, 14, "#b45309", { name: "Key rail" }),
      ...Array.from({ length: 10 }, (_, i) => r(i * 80, 860, 80, h - 860, WHITE, { stroke: "#1f2937", sw: 3, name: "White key" })),
      ...black.map((bk) => r(bk * 80 - 24, 860, 48, 170, "#1f2937", { radius: 4, name: "Black key" })),
    ])];
  });
  tpl("babysitter-flyer-pr2", "Babysitting services flyer", "flyer-a5", FT + "babysitter babysitting childcare nanny services kids parents", (W, H) => {
    const { t, r, e, tm } = kit(W, H, 800);
    const PU = "#4c1d95";
    const items = ["First aid and CPR trained", "Homework help and bedtime stories", "Healthy snacks, no screens after 8", "References from 9 local families", "Own car for school pick-ups"];
    return [page("#ede9fe", [
      e("deco-stars", 620, 40, 130, { c1: "#a78bfa", c2: "#f472b6" }),
      t("Need a night off?", 60, 80, 540, { size: 64, bold: true, color: PU, lh: 1.05 }),
      t("Friendly, reliable babysitting for evenings and weekends.", 60, 228, 560, { size: 26, color: "#6d28d9", lh: 1.35 }),
      r(50, 340, 700, 470, WHITE, { radius: 30, name: "Card" }),
      e("face-happy", 650, 286, 90, { c1: "#fde047" }),
      ...items.flatMap((s, i) => [e("icon-check-circle", 90, 384 + i * 62, 40, { c1: "#8b5cf6" }), tm(s, 150, 384 + i * 62, 560, 40, { size: 26, color: INK })]),
      r(90, 704, 620, 2, "#ddd6fe", { name: "Divider" }),
      tm("$15 / hour", 90, 716, 300, 84, { size: 40, bold: true, color: "#7c3aed", align: "center" }),
      r(399, 728, 2, 60, "#ddd6fe", { name: "Divider" }),
      tm("Ages 1 to 10", 410, 716, 300, 84, { size: 30, bold: true, color: INK, align: "center" }),
      r(150, 860, 500, 90, "#7c3aed", { radius: 45, name: "Phone pill" }),
      tm("Text Maya: 555 0162", 150, 860, 500, 90, { size: 34, bold: true, color: WHITE, align: "center" }),
      t("Available Fri – Sun · Northside and Old Town", 40, 980, 720, { size: 22, color: "#6d28d9", align: "center" }),
      e("deco-hearts", 355, 1030, 90, { c1: "#f472b6" }),
    ])];
  });
  tpl("winter-craft-fair-flyer-pr2", "Winter craft fair flyer", "flyer-a5", FT + "event craft fair market winter christmas holiday handmade makers", (W, H) => {
    const { h, t, r, c, s, f, e } = kit(W, H, 800);
    const G = "#14532d", Y = "#facc15";
    const flakes = [[60, 60, 46], [690, 120, 38], [110, 330, 30], [660, 400, 52], [40, 520, 28], [720, 610, 30]];
    const perks = [["icon-gift", "Handmade gifts"], ["icon-chai", "Hot drinks"], ["icon-bell", "Live music"], ["icon-star", "Kids' corner"]];
    return [page(G, [
      ...flakes.map(([x, y, d]) => s("star", x, y, d, d, WHITE, { points: 6, op: 0.25, name: "Snowflake" })),
      c(185, 70, 430, 430, Y, { name: "Gold ring" }),
      c(195, 80, 410, 410, G, { name: "Ring gap" }),
      f(205, 90, 390, 390, { shape: "circle", name: "Market photo" }),
      t("WINTER", 40, 530, 720, { size: 34, bold: true, color: Y, align: "center", ls: 14 }),
      t("Craft Fair", 40, 575, 720, { size: 100, family: "serif", bold: true, color: WHITE, align: "center", lh: 1 }),
      t("Over 60 local makers under one roof", 40, 690, 720, { size: 26, family: "serif", italic: true, color: "#bbf7d0", align: "center" }),
      ...perks.flatMap(([ic, l], i) => [e(ic, 112 + i * 175, 760, 56, { c1: Y }), t(l, 70 + i * 175, 826, 140, { size: 19, bold: true, color: WHITE, align: "center" })]),
      r(0, 930, 800, h - 930, Y, { name: "Date block" }),
      t("Sat 6 & Sun 7 December", 40, 960, 720, { size: 40, bold: true, color: G, align: "center" }),
      t("10 am – 5 pm · Town Hall · Free entry", 40, 1022, 720, { size: 24, color: G, align: "center" }),
    ])];
  });
  tpl("just-sold-flyer-pr2", "Just sold real estate flyer", "flyer-letter", FT + "real estate just sold house home property agent realtor", (W, H) => {
    const { h, t, r, c, f, tm, colm } = kit(W, H, 800);
    const RD = "#dc2626", NV = "#0f172a";
    const stats = [["4", "bedrooms"], ["3", "bathrooms"], ["2,150", "square feet"]];
    return [page(WHITE, [
      f(0, 0, 800, 520, { name: "House photo" }),
      r(-120, 90, 560, 90, RD, { rot: -35, name: "Corner ribbon" }),
      t("JUST SOLD", 10, 111, 300, { size: 40, bold: true, color: WHITE, align: "center", ls: 4, rot: -35 }),
      t("12 Willow Crescent, Brookfield", 50, 555, 700, { size: 40, bold: true, color: INK }),
      t("Sold above asking price in just 9 days", 50, 612, 700, { size: 26, bold: true, color: RD }),
      ...stats.flatMap(([n, l], i) => [
        r(50 + i * 240, 680, 220, 120, "#f1f5f9", { radius: 14, name: "Stat box" }),
        colm(680, 120, t(n, 60 + i * 240, 0, 200, { size: 44, bold: true, color: INK, align: "center", lh: 1.1 }), t(l, 60 + i * 240, 0, 200, { size: 18, color: "#475569", align: "center" })),
      ]),
      r(0, 850, 800, h - 850, NV, { name: "Agent strip" }),
      c(48, 875, 134, 134, "#f8fafc", { name: "Photo ring" }),
      f(55, 882, 120, 120, { shape: "circle", name: "Agent photo" }),
      t("Daniel Reyes", 205, 882, 310, { size: 32, bold: true, color: WHITE }),
      t("Your local property expert", 205, 924, 310, { size: 18, color: "#cbd5e1" }),
      t("555 0148 · danielreyes.homes", 205, 956, 320, { size: 18, bold: true, color: "#fca5a5" }),
      r(545, 878, 210, 128, RD, { radius: 14, name: "Valuation box" }),
      colm(878, 128, t("Thinking of selling?", 560, 0, 180, { size: 21, bold: true, color: WHITE, align: "center", lh: 1.15 }), 6, t("Free home valuation", 560, 0, 180, { size: 16, color: WHITE, align: "center" })),
    ])];
  });
  tpl("drivers-wanted-flyer-pr2", "Delivery drivers hiring flyer", "flyer-letter", FT + "hiring jobs drivers wanted delivery work recruitment courier", (W, H) => {
    const { h, t, r, c, f, e, colm } = kit(W, H, 800);
    const perks = [["icon-money", "Weekly pay", "Plus tips, paid every Friday"], ["icon-clock", "Pick your hours", "Mornings, evenings or weekends"], ["icon-mobile", "Easy app", "Every job on your phone"], ["icon-gift", "$300 bonus", "After your first 50 trips"]];
    return [page("#facc15", [
      t("NOW HIRING", 50, 55, 480, { size: 30, bold: true, color: INK, ls: 10 }),
      t("DRIVERS\nWANTED", 50, 100, 640, { size: 116, bold: true, color: INK, lh: 0.92 }),
      r(0, 350, 800, 120, "#111827", { name: "Road" }),
      ...Array.from({ length: 6 }, (_, i) => r(30 + i * 130, 405, 76, 10, WHITE, { name: "Road line" })),
      c(570, 300, 200, 200, "#dc2626", { name: "Pay circle" }),
      colm(300, 200, t("$22", 580, 0, 180, { size: 62, bold: true, color: WHITE, align: "center", lh: 1.05 }), t("per hour", 580, 0, 180, { size: 22, bold: true, color: "#fee2e2", align: "center" })),
      ...perks.flatMap(([ic, hd, sb], i) => {
        const x = 50 + (i % 2) * 370, y = 520 + Math.floor(i / 2) * 120;
        return [e(ic, x, y, 52, { c1: INK }), t(hd, x + 72, y - 2, 280, { size: 27, bold: true, color: INK }), t(sb, x + 72, y + 34, 280, { size: 19, color: "#422006", lh: 1.3 })];
      }),
      t("You need: a full licence · a car, scooter or bike · age 18+", 50, 778, 700, { size: 22, bold: true, color: INK }),
      r(0, 840, 800, h - 840, "#111827", { name: "Footer" }),
      f(50, 862, 140, 140, { name: "QR code" }),
      t("Apply in 5 minutes", 220, 878, 530, { size: 42, bold: true, color: "#facc15" }),
      t("zoomdrop.com/drive · or text DRIVE to 55500", 220, 940, 530, { size: 22, color: WHITE }),
    ])];
  });
  tpl("personal-trainer-flyer-pr2", "Personal trainer flyer", "flyer-letter", FT + "gym fitness personal trainer coach workout training health", (W, H) => {
    const { h, t, r, c, f, colm } = kit(W, H, 800);
    const LI = "#a3e635";
    const steps = [["Body scan and goal plan", "Know your starting point"], ["3 sessions a week", "Strength, mobility and cardio"], ["Simple meal guide", "Real food, no fad diets"], ["Weekly check-ins", "Track progress and adjust"]];
    return [page("#0a0a0a", [
      f(0, 0, 360, h, { name: "Trainer photo" }),
      r(360, 0, 14, h, LI, { name: "Stripe" }),
      c(36, 36, 140, 140, LI, { name: "Offer badge" }),
      colm(36, 140, t("20%", 46, 0, 120, { size: 40, bold: true, color: "#0a0a0a", align: "center", lh: 1.05 }), t("off month one", 46, 0, 120, { size: 15, bold: true, color: "#0a0a0a", align: "center" })),
      t("PERSONAL TRAINING", 405, 66, 365, { size: 22, bold: true, color: LI, ls: 5 }),
      t("STRONGER\nIN 12\nWEEKS", 405, 104, 365, { size: 64, bold: true, color: WHITE, lh: 0.95 }),
      t("One-to-one coaching built around your goals, your schedule and your gym.", 405, 306, 365, { size: 22, color: "#d4d4d4", lh: 1.45 }),
      ...steps.flatMap(([hd, sb], i) => [
        t("0" + (i + 1), 405, 440 + i * 82, 60, { size: 30, bold: true, color: LI }),
        t(hd, 470, 442 + i * 82, 300, { size: 23, bold: true, color: WHITE }),
        t(sb, 470, 474 + i * 82, 300, { size: 17, color: "#a3a3a3" }),
      ]),
      r(405, 790, 365, 110, LI, { radius: 8, name: "Price box" }),
      t("$49 / session", 425, 802, 330, { size: 40, bold: true, color: "#0a0a0a" }),
      t("First consultation free", 425, 856, 330, { size: 20, bold: true, color: "#1a2e05" }),
      t("Coach Jordan · 555 0127\n@fitwithjordan", 405, 925, 365, { size: 19, color: WHITE, lh: 1.4 }),
    ])];
  });
  tpl("town-hall-flyer-pr2", "Town hall meeting flyer", "flyer-letter", FT + "event community town hall meeting council residents public notice", (W, H) => {
    const { h, t, r, c, f, e } = kit(W, H, 800);
    const SEA = "#0c4a6e";
    const agenda = [["6:30", "Welcome and coffee"], ["6:45", "The three park designs"], ["7:30", "Your questions"], ["8:15", "Vote and next steps"]];
    return [page("#e0f2fe", [
      r(0, 0, 800, 230, SEA, { name: "Header" }),
      c(50, 55, 120, 120, WHITE, { name: "Icon circle" }),
      e("icon-users", 75, 80, 70, { c1: SEA }),
      t("COMMUNITY MEETING", 200, 64, 560, { size: 24, bold: true, color: "#7dd3fc", ls: 6 }),
      t("Town Hall", 200, 98, 560, { size: 72, bold: true, color: WHITE, lh: 1 }),
      t("Have your say on the new Riverside Park", 50, 268, 700, { size: 46, bold: true, color: SEA, lh: 1.1 }),
      t("Plans, costs and the timeline will be shared. Every resident can ask questions and vote on three designs.", 50, 386, 700, { size: 22, color: INK, lh: 1.45 }),
      r(50, 490, 430, 330, WHITE, { radius: 16, name: "Agenda card" }),
      t("AGENDA", 80, 514, 370, { size: 22, bold: true, color: "#0369a1", ls: 6 }),
      ...agenda.flatMap(([tm, it], i) => [
        t(tm, 80, 562 + i * 62, 90, { size: 22, bold: true, color: SEA }),
        t(it, 175, 562 + i * 62, 280, { size: 22, color: INK }),
        i < 3 ? r(80, 604 + i * 62, 370, 1, "#e2e8f0", { name: "Rule" }) : null,
      ]),
      f(510, 490, 240, 330, { shape: "rounded", radius: 16, name: "Park plan" }),
      e("icon-chai", 50, 846, 44, { c1: "#0369a1" }),
      t("Free tea, coffee and childcare on site", 110, 854, 640, { size: 22, bold: true, color: SEA }),
      r(0, 912, 800, h - 912, "#0369a1", { name: "Footer" }),
      t("Tuesday 14 October · 6:30 pm", 50, 932, 700, { size: 34, bold: true, color: WHITE }),
      t("Riverside Community Centre, 2 Mill Street", 50, 978, 700, { size: 20, color: "#e0f2fe" }),
    ])];
  });
  tpl("spring-fun-fair-flyer-pr2", "Spring fun fair flyer", "flyer-a4-landscape", FT + "event fair spring family kids fun rides festival landscape", (W, H) => {
    const { t, r, c, f, e, tm } = kit(W, H, 1120);
    const NV = "#1e3a8a", PK = "#db2777";
    const tix = [["SAT 18 APRIL", 70], ["11 am – 6 pm", 270], ["Entry $5\nkids free", 470]];
    return [page("#e0f2fe", [
      e("deco-bunting", 60, 24, 420, { c1: PK, c2: "#f59e0b", c3: "#22c55e" }),
      c(-200, 600, 900, 400, "#86efac", { name: "Hill" }),
      c(500, 640, 900, 360, "#4ade80", { name: "Hill" }),
      t("Spring", 60, 160, 600, { size: 70, family: "serif", italic: true, bold: true, color: PK, lh: 1.1 }),
      t("FUN FAIR", 60, 240, 640, { size: 110, bold: true, color: NV, lh: 1 }),
      t("Rides, games, food stalls and a dog show for the whole family", 60, 360, 560, { size: 26, color: INK, lh: 1.35 }),
      r(60, 460, 600, 130, NV, { radius: 16, name: "Ticket" }),
      c(40, 505, 40, 40, "#e0f2fe", { name: "Notch" }), c(640, 505, 40, 40, "#e0f2fe", { name: "Notch" }),
      r(260, 485, 2, 80, "#93c5fd", { name: "Perforation" }), r(460, 485, 2, 80, "#93c5fd", { name: "Perforation" }),
      ...tix.map(([s, x]) => tm(s, x + 10, 460, 170, 130, { size: 25, bold: true, color: WHITE, align: "center", lh: 1.15 })),
      c(760, 70, 300, 300, "#f472b6", { name: "Photo ring" }),
      f(775, 85, 270, 270, { shape: "circle", name: "Fair photo" }),
      t("Ferris wheel\nPetting farm\nFace painting\nLive band at 3 pm", 760, 400, 240, { size: 24, bold: true, color: NV, lh: 1.5 }),
      e("deco-balloons", 1000, 395, 80, { c1: PK, c2: "#f59e0b", c3: "#22c55e" }),
      t("Meadow Park · Free parking · springfair.town", 60, 700, 1000, { size: 26, bold: true, color: "#14532d", align: "center" }),
    ])];
  });
  tpl("leadership-summit-flyer-pr2", "Leadership summit flyer", "flyer-a4-landscape", FT + "corporate business summit conference leadership speakers seminar landscape", (W, H) => {
    const { h, t, r, c, f, e, tm } = kit(W, H, 1120);
    const NV = "#0f172a", GD = "#f59e0b";
    const info = [["icon-calendar", "Thursday 21 May"], ["icon-clock", "9:00 am – 5:30 pm"], ["icon-location", "Harbourview Hotel, Pier 3"]];
    const spk = [["Amina Yusuf", "COO, Northwind Logistics"], ["Tom Becker", "Author of Quiet Teams"], ["Priya Nair", "Head of People, Lumen"]];
    return [page(WHITE, [
      r(0, 0, 440, h, NV, { name: "Side panel" }),
      r(60, 66, 80, 8, GD, { name: "Accent" }),
      t("2026 · ONE DAY", 60, 92, 340, { size: 22, bold: true, color: GD, ls: 6 }),
      t("Leadership\nSummit", 60, 132, 360, { size: 58, bold: true, color: WHITE, lh: 1.02 }),
      t("Practical ideas for managers who want calmer, sharper teams.", 60, 278, 340, { size: 22, color: "#cbd5e1", lh: 1.45 }),
      ...info.flatMap(([ic, s], i) => [e(ic, 60, 420 + i * 62, 36, { c1: GD }), tm(s, 110, 420 + i * 62, 310, 36, { size: 22, bold: true, color: WHITE })]),
      t("Early bird $249 until 30 April", 60, 660, 340, { size: 22, bold: true, color: GD }),
      t("SPEAKERS", 500, 66, 560, { size: 24, bold: true, color: NV, ls: 8 }),
      r(500, 104, 60, 4, GD, { name: "Rule" }),
      ...spk.flatMap(([n, ro], i) => [
        c(510 + i * 200, 140, 160, 160, "#fde68a", { name: "Photo ring" }),
        f(518 + i * 200, 148, 144, 144, { shape: "circle", name: "Speaker photo" }),
        t(n, 500 + i * 200, 318, 180, { size: 22, bold: true, color: INK, align: "center" }),
        t(ro, 500 + i * 200, 350, 180, { size: 16, color: MUTED, align: "center", lh: 1.3 }),
      ]),
      ...["Feedback", "Hiring", "Wellbeing"].flatMap((s, i) => [r(500 + i * 190, 440, 170, 50, "#f1f5f9", { radius: 25, name: "Track chip" }), tm(s, 500 + i * 190, 440, 170, 50, { size: 20, bold: true, color: NV, align: "center" })]),
      r(500, 540, 380, 80, GD, { radius: 40, name: "Button" }),
      tm("Register at leadsummit.co", 500, 540, 380, 80, { size: 24, bold: true, color: NV, align: "center" }),
      t("Lunch and coffee included · Certificate of attendance", 500, 660, 580, { size: 18, color: MUTED }),
    ])];
  });
  tpl("class-timetable-flyer-pr2", "Studio class timetable flyer", "flyer-a4-landscape", FT + "gym fitness dance yoga studio class timetable schedule weekly landscape", (W, H) => {
    const { t, r, tm, colm } = kit(W, H, 1120);
    const TY = { Yoga: ["#ccfbf1", "#115e59"], HIIT: ["#ffe4e6", "#9f1239"], Dance: ["#ede9fe", "#5b21b6"], Pilates: ["#fef3c7", "#92400e"] };
    const week = [["MON", [["7:00", "Yoga", "Lena"], ["12:30", "HIIT", "Marco"], ["18:30", "Dance", "Ola"]]], ["TUE", [["7:00", "Pilates", "Rhea"], ["12:30", "Yoga", "Lena"], ["18:30", "HIIT", "Marco"]]], ["WED", [["7:00", "HIIT", "Sam"], ["12:30", "Dance", "Ola"], ["18:30", "Yoga", "Kai"]]], ["THU", [["7:00", "Yoga", "Kai"], ["12:30", "Pilates", "Rhea"], ["18:30", "Dance", "Ola"]]], ["FRI", [["7:00", "Dance", "Ola"], ["12:30", "HIIT", "Sam"], ["17:30", "Pilates", "Rhea"]]]];
    return [page("#fafaf9", [
      t("MOVE STUDIO", 50, 40, 400, { size: 22, bold: true, color: "#7c3aed", ls: 8 }),
      t("Weekly class timetable", 50, 72, 640, { size: 48, bold: true, color: INK }),
      t("Autumn term · from 6 October", 720, 92, 350, { size: 22, color: MUTED, align: "right" }),
      ...week.flatMap(([d, cls], i) => {
        const x = 50 + i * 206;
        return [
          r(x, 160, 194, 50, INK, { radius: 10, name: "Day" }), tm(d, x, 160, 194, 50, { size: 22, bold: true, color: WHITE, align: "center", ls: 4 }),
          ...cls.flatMap(([tm2, n, who], j) => {
            const [bgc, ink] = TY[n];
            return [r(x, 225 + j * 120, 194, 108, bgc, { radius: 12, name: n + " class" }),
              colm(225 + j * 120, 108, t(tm2, x + 16, 0, 162, { size: 17, bold: true, color: ink }), 2, t(n, x + 16, 0, 162, { size: 25, bold: true, color: ink }), 2, t("with " + who, x + 16, 0, 162, { size: 16, color: ink }))];
          }),
        ];
      }),
      r(50, 610, 1020, 124, INK, { radius: 16, name: "Info bar" }),
      t("First class free for new members", 80, 630, 640, { size: 30, bold: true, color: WHITE }),
      t("Book in the Move app or at the desk · 18 Canal Street · movestudio.fit", 80, 678, 720, { size: 18, color: "#d6d3d1" }),
      r(840, 642, 200, 60, "#a78bfa", { radius: 30, name: "Button" }),
      tm("Book now", 840, 642, 200, 60, { size: 24, bold: true, color: INK, align: "center" }),
    ])];
  });

  /* ================= Posters ================= */
  tpl("wanted-reward-poster-pr2", "Wanted reward poster", "poster-18x24", PT + "wanted reward western outlaw funny party birthday game", (W, H) => {
    const { t, r, s, f, e } = kit(W, H, 800);
    const BR = "#3b2412", MID = "#5c3d1e";
    return [page("#f1dfb8", [
      r(30, 30, 740, 1007, "none", { stroke: MID, sw: 6, name: "Border" }),
      r(46, 46, 708, 975, "none", { stroke: MID, sw: 2, name: "Inner border" }),
      ...[[56, 56], [720, 56], [56, 987], [720, 987]].map(([x, y]) => s("star", x, y, 24, 24, MID, { name: "Corner star" })),
      t("WANTED", 70, 78, 660, { size: 138, family: "serif", bold: true, color: BR, align: "center", lh: 1, ls: 2 }),
      r(90, 226, 620, 4, MID, { name: "Rule" }),
      t("FOR CRIMES AGAINST DESSERT", 70, 240, 660, { size: 28, family: "serif", bold: true, color: MID, align: "center", ls: 4 }),
      r(90, 286, 620, 4, MID, { name: "Rule" }),
      r(200, 318, 400, 400, MID, { name: "Photo border" }),
      f(212, 330, 376, 376, { name: "Suspect photo" }),
      e("stamp-urgent", 470, 640, 180, { c1: "#991b1b", rot: -12 }),
      t("“Sticky Fingers” Sam", 70, 740, 660, { size: 56, family: "serif", bold: true, color: BR, align: "center" }),
      t("Last seen near the birthday cake with frosting on his face", 120, 812, 560, { size: 24, family: "serif", italic: true, color: MID, align: "center", lh: 1.35 }),
      t("REWARD", 70, 895, 660, { size: 46, family: "serif", bold: true, color: "#7f1d1d", align: "center", ls: 10 }),
      t("One extra slice · Sam's party, Saturday 3 pm", 70, 958, 660, { size: 24, family: "serif", bold: true, color: BR, align: "center" }),
    ])];
  });
  tpl("bass-drop-dj-poster-pr2", "DJ night club poster", "poster-18x24", PT + "music dj club night party electronic nightlife event", (W, H) => {
    const { h, t, r, c, colm } = kit(W, H, 800);
    const PK = "#ec4899", CY = "#22d3ee";
    return [page("#0b0617", [
      c(260, 160, 760, 760, "#151027", { name: "Record" }),
      ...[680, 600, 520, 440].map((d) => c(640 - d / 2, 540 - d / 2, d, d, "none", { stroke: "#2a1f4a", sw: 3, name: "Groove" })),
      c(530, 430, 220, 220, PK, { name: "Record label" }),
      c(630, 530, 20, 20, "#0b0617", { name: "Spindle" }),
      t("BASS\nDROP", 50, 80, 520, { size: 150, bold: true, color: WHITE, lh: 0.9, shadow: { x: 0, y: 0, blur: 24, color: PK, opacity: 0.8 } }),
      t("SATURDAY · 11 PM TILL LATE", 50, 370, 520, { size: 24, bold: true, color: CY, ls: 4 }),
      t("LINE-UP", 50, 650, 300, { size: 20, bold: true, color: PK, ls: 6 }),
      t("DJ NOVA\nMIRA K\nTHE LOW END", 50, 690, 460, { size: 44, bold: true, color: WHITE, lh: 1.15 }),
      r(0, 945, 800, h - 945, PK, { name: "Footer" }),
      colm(945, h - 945,
        t("THE VAULT · 9 DOCK STREET", 50, 0, 700, { size: 30, bold: true, color: "#0b0617", ls: 2 }), 4,
        t("Tickets $15 at thevault.club · 18+", 50, 0, 700, { size: 22, color: "#0b0617" })),
    ])];
  });
  tpl("boxing-gym-poster-pr2", "Boxing gym poster", "poster-18x24", PT + "gym boxing fitness training club sport workout motivation", (W, H) => {
    const { t, r, f } = kit(W, H, 800);
    const RD = "#ef4444";
    const cls = [["BOXING BASICS", "Mon · Wed 6 pm"], ["SPARRING", "Tue · Thu 7 pm"], ["KIDS CLUB", "Saturday 10 am"], ["OPEN GYM", "Daily 6 am – 10 pm"]];
    return [page("#111111", [
      f(0, 0, 800, 640, { name: "Boxer photo" }),
      r(-100, 496, 1000, 24, RD, { rot: -8, name: "Red stripe" }),
      r(-100, 520, 1000, 260, "#111111", { rot: -8, name: "Dark band" }),
      t("TRAIN", 50, 596, 700, { size: 140, bold: true, color: WHITE, lh: 0.9 }),
      t("HARD.", 50, 722, 700, { size: 140, bold: true, color: RD, lh: 0.9 }),
      ...cls.flatMap(([n, tm], i) => {
        const x = 50 + (i % 2) * 360, y = 872 + Math.floor(i / 2) * 64;
        return [t(n, x, y, 340, { size: 24, bold: true, color: WHITE, ls: 2 }), t(tm, x, y + 30, 340, { size: 18, color: "#a3a3a3" })];
      }),
      r(50, 1004, 700, 2, "#333333", { name: "Rule" }),
      t("IRON RING BOXING CLUB · 40 FOUNDRY LANE · FIRST WEEK FREE", 50, 1016, 700, { size: 17, bold: true, color: RD, ls: 2 }),
    ])];
  });
  tpl("growth-mindset-poster-pr2", "Growth mindset classroom poster", "poster-a2", PT + "school classroom growth mindset motivational education kids teacher", (W, H) => {
    const { t, r, c, e, tm } = kit(W, H, 800);
    const pairs = [["I'm not good at this.", "What am I missing?"], ["I give up.", "Let me try another way."], ["This is too hard.", "This will take some time."], ["I made a mistake.", "Mistakes help me learn."], ["I can't do it.", "I can't do it yet."], ["She's so smart.", "What can I learn from her?"]];
    return [page("#fffbeb", [
      c(340, 48, 120, 120, "#fde68a", { name: "Icon circle" }),
      e("icon-idea", 365, 70, 70, { c1: "#b45309" }),
      t("Change your words,\nchange your mindset", 50, 190, 700, { size: 52, bold: true, color: INK, align: "center", lh: 1.1 }),
      r(50, 340, 330, 60, "#fecaca", { radius: 30, name: "Header pill" }),
      tm("INSTEAD OF…", 50, 340, 330, 60, { size: 22, bold: true, color: "#991b1b", align: "center", ls: 3 }),
      r(420, 340, 330, 60, "#bbf7d0", { radius: 30, name: "Header pill" }),
      tm("TRY THINKING…", 420, 340, 330, 60, { size: 22, bold: true, color: "#166534", align: "center", ls: 3 }),
      ...pairs.flatMap(([a, b], i) => {
        const y = 428 + i * 104;
        return [
          r(50, y, 330, 88, WHITE, { radius: 14, stroke: "#fecaca", sw: 3, name: "Fixed card" }),
          tm(a, 70, y, 290, 88, { size: 23, color: "#991b1b", align: "center" }),
          e("arrow-right", 384, y + 34, 32, { c1: "#f59e0b" }),
          r(420, y, 330, 88, WHITE, { radius: 14, stroke: "#bbf7d0", sw: 3, name: "Growth card" }),
          tm(b, 440, y, 290, 88, { size: 23, bold: true, color: "#166534", align: "center" }),
        ];
      }),
      t("Your brain grows every time you practise.", 50, 1062, 700, { size: 28, family: "serif", italic: true, color: "#b45309", align: "center" }),
    ])];
  });
  tpl("food-drive-poster-pr2", "Community food drive poster", "poster-a2", PT + "charity food drive donation community winter volunteer bank", (W, H) => {
    const { h, t, r, c, tm } = kit(W, H, 800);
    const BR = "#7c2d12";
    const need = ["Canned beans", "Rice and pasta", "Cooking oil", "Baby food", "Tea and coffee", "Tinned fish"];
    return [page("#f5e9d6", [
      t("COMMUNITY", 50, 64, 700, { size: 28, bold: true, color: "#9a3412", align: "center", ls: 12 }),
      t("Food Drive", 50, 104, 700, { size: 120, family: "serif", bold: true, color: BR, align: "center", lh: 1 }),
      t("Help us fill 500 boxes for local families this winter", 100, 240, 600, { size: 28, color: BR, align: "center", lh: 1.3 }),
      c(255, 395, 92, 92, "#ef4444", { name: "Can" }), c(355, 360, 104, 104, "#22c55e", { name: "Can" }), c(468, 405, 84, 84, "#3b82f6", { name: "Can" }),
      r(318, 430, 72, 104, "#f59e0b", { radius: 10, rot: -10, name: "Cereal box" }),
      r(160, 500, 210, 50, "#b45309", { rot: -12, name: "Flap" }), r(430, 500, 210, 50, "#b45309", { rot: 12, name: "Flap" }),
      r(220, 520, 360, 22, "#92400e", { name: "Box opening" }),
      r(220, 540, 360, 250, "#d97706", { name: "Box" }),
      r(290, 610, 220, 112, "#fef3c7", { radius: 8, name: "Box label" }),
      tm("GIVE\nFOOD", 290, 610, 220, 112, { size: 40, bold: true, color: BR, align: "center", lh: 1.05 }),
      t("WE NEED", 50, 820, 700, { size: 24, bold: true, color: "#9a3412", align: "center", ls: 8 }),
      ...need.flatMap((s, i) => {
        const x = 50 + (i % 3) * 240, y = 870 + Math.floor(i / 3) * 72;
        return [r(x, y, 220, 56, WHITE, { radius: 28, name: "Item chip" }), tm(s, x, y, 220, 56, { size: 22, bold: true, color: BR, align: "center" })];
      }),
      r(0, 1040, 800, h - 1040, BR, { name: "Footer" }),
      tm("Drop off at any Oak Street Library · 1 – 30 November", 40, 1040, 720, h - 1040, { size: 25, bold: true, color: WHITE, align: "center" }),
    ])];
  });
  tpl("theatre-play-poster-pr2", "Theatre play poster", "poster-a2", PT + "event theatre play drama school stage show performance tickets", (W, H) => {
    const { h, t, r, c, e } = kit(W, H, 800);
    const RD = "#991b1b", DK = "#7f1d1d", GD = "#fde68a";
    const curtain = (x0, dir) => [
      r(x0, 0, 180, 900, RD, { name: "Curtain" }),
      ...[30, 90, 140].map((dx) => r(dir > 0 ? x0 + dx : x0 + 180 - dx - 14, 0, 14, 900, DK, { name: "Fold" })),
      c(dir > 0 ? x0 - 70 : x0 - 10, 840, 260, 120, RD, { name: "Curtain hem" }),
    ];
    return [page("#1a0a0a", [
      c(150, 140, 500, 760, "#fef3c7", { op: 0.1, name: "Spotlight" }),
      r(0, 900, 800, h - 900, "#3b1d0e", { name: "Stage floor" }),
      ...curtain(0, 1), ...curtain(620, -1),
      r(0, 0, 800, 70, DK, { name: "Valance" }),
      ...Array.from({ length: 9 }, (_, i) => c(-30 + i * 100, 30, 120, 80, DK, { name: "Valance scallop" })),
      t("WESTFIELD SCHOOL DRAMA CLUB PRESENTS", 205, 160, 390, { size: 20, bold: true, color: "#fcd34d", align: "center", ls: 4, lh: 1.4 }),
      e("line-ornament", 300, 236, 200, { c1: "#fcd34d" }),
      t("The\nTempest", 190, 282, 420, { size: 100, family: "serif", bold: true, color: GD, align: "center", lh: 1 }),
      t("A storm, a shipwreck and a little magic", 205, 496, 390, { size: 26, family: "serif", italic: true, color: "#fef3c7", align: "center", lh: 1.3 }),
      t("14 · 15 · 16 MAY", 205, 610, 390, { size: 40, bold: true, color: WHITE, align: "center" }),
      t("Doors 6:30 pm · Curtain 7 pm", 205, 664, 390, { size: 22, color: "#fcd34d", align: "center" }),
      e("deco-stars", 350, 730, 100, { c1: "#fcd34d" }),
      t("School Hall · Tickets $6, children $3", 60, 975, 680, { size: 28, bold: true, color: GD, align: "center" }),
      t("Book at westfield.school/tickets", 60, 1022, 680, { size: 22, color: "#fef3c7", align: "center" }),
    ])];
  });
  tpl("public-lecture-poster-pr2", "Public lecture poster", "poster-a3", PT + "lecture talk university corporate science event series swiss minimal", (W, H) => {
    const { t, r } = kit(W, H, 800);
    const RD = "#e11d48";
    const facts = [["DATE", "Thu 9 October"], ["TIME", "7 – 8:30 pm"], ["PLACE", "Main Library, Room 2"]];
    return [page("#f4f4f0", [
      t("04", 36, 30, 500, { size: 300, bold: true, color: RD, lh: 1 }),
      t("PUBLIC LECTURE SERIES", 560, 70, 200, { size: 18, bold: true, color: INK, ls: 3, lh: 1.4 }),
      r(560, 136, 200, 3, INK, { name: "Rule" }),
      t("Autumn 2026\nTalk 4 of 6", 560, 152, 200, { size: 18, color: "#3f3f46", lh: 1.4 }),
      t("How\ncities\nbreathe", 40, 390, 500, { size: 110, bold: true, color: INK, lh: 0.95 }),
      r(560, 390, 240, 330, RD, { name: "Speaker block" }),
      t("Dr. Lena Okafor", 585, 420, 190, { size: 30, bold: true, color: WHITE, lh: 1.1 }),
      t("Professor of Urban Ecology, Northfield University", 585, 504, 190, { size: 18, color: "#ffe4e6", lh: 1.4 }),
      t("Urban forests, clean air and the streets of tomorrow", 40, 740, 480, { size: 30, color: "#3f3f46", lh: 1.3 }),
      r(40, 900, 720, 3, INK, { name: "Rule" }),
      ...facts.flatMap(([k2, v], i) => [
        t(k2, 40 + i * 250, 925, 220, { size: 16, bold: true, color: RD, ls: 3 }),
        t(v, 40 + i * 250, 955, 220, { size: 26, bold: true, color: INK, lh: 1.15 }),
      ]),
      t("Free entry · Register at citylectures.org", 40, 1070, 720, { size: 20, color: "#3f3f46" }),
    ])];
  });
  tpl("chess-tournament-poster-pr2", "Chess tournament poster", "poster-a3", PT + "event chess tournament school club competition game prizes", (W, H) => {
    const { h, t, r } = kit(W, H, 800);
    const DK = "#1c1917", RD = "#b91c1c";
    const squares = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) if ((row + col) % 2) squares.push(r(col * 100, row * 100, 100, 100, DK, { name: "Square" }));
    return [page("#fafaf9", [
      ...squares,
      r(80, 320, 640, 250, RD, { name: "Title card" }),
      t("RAPID", 80, 342, 640, { size: 40, bold: true, color: "#fecaca", align: "center", ls: 16 }),
      t("Chess Open", 80, 392, 640, { size: 100, family: "serif", bold: true, color: WHITE, align: "center", lh: 1 }),
      t("Under-18 and adult sections", 80, 508, 640, { size: 26, color: "#fee2e2", align: "center" }),
      t("SCHEDULE", 80, 620, 300, { size: 22, bold: true, color: RD, ls: 6 }),
      t("9:00   Check-in\n9:30   Rounds 1 – 3\n1:00   Lunch break\n2:00   Rounds 4 – 6\n5:30   Prize giving", 80, 660, 320, { size: 24, color: INK, lh: 1.6 }),
      r(410, 620, 2, 230, "#d6d3d1", { name: "Divider" }),
      t("PRIZES", 440, 620, 280, { size: 22, bold: true, color: RD, ls: 6 }),
      t("1st   $300 + trophy\n2nd   $150\n3rd   $75\nBest junior: chess set", 440, 660, 290, { size: 24, color: INK, lh: 1.6 }),
      r(0, 900, 800, h - 900, DK, { name: "Footer" }),
      t("Saturday 25 October", 60, 932, 680, { size: 46, bold: true, color: WHITE }),
      t("Riverside High School · Entry $10 · Bring a clock if you have one", 60, 1000, 680, { size: 22, color: "#d6d3d1", lh: 1.35 }),
      t("Register: rapidchess.club", 60, 1068, 680, { size: 22, bold: true, color: "#fca5a5" }),
    ])];
  });
  tpl("recycling-guide-poster-pr2", "Recycling guide poster", "poster-a3", PT + "recycling guide awareness environment bins waste green office school", (W, H) => {
    const { t, r, e, tm } = kit(W, H, 800);
    const bins = [["Paper", "#2563eb", "#1e40af", WHITE, "icon-document", "Newspapers\nCardboard\nEnvelopes\nPaper bags", "No: greasy pizza boxes"], ["Plastic\n& cans", "#eab308", "#a16207", INK, "icon-cart", "Bottles\nDrink cans\nYoghurt pots\nFood tins", "No: plastic bags or film"], ["Food", "#16a34a", "#14532d", WHITE, "icon-leaf", "Peelings\nLeftovers\nTea bags\nEgg shells", "No: liquids or packaging"]];
    return [page("#f0fdf4", [
      r(0, 0, 800, 250, "#166534", { name: "Header" }),
      t("WHAT GOES WHERE?", 50, 58, 700, { size: 26, bold: true, color: "#bbf7d0", align: "center", ls: 8 }),
      t("Recycling guide", 50, 100, 700, { size: 84, bold: true, color: WHITE, align: "center" }),
      ...bins.flatMap(([n, col, dark, ink, ic, yes, no], i) => {
        const x = 50 + i * 240;
        return [
          r(x + 80, 286, 60, 18, dark, { radius: 9, name: "Handle" }),
          r(x - 10, 300, 240, 32, dark, { radius: 8, name: "Lid" }),
          r(x, 330, 220, 330, col, { radius: 14, name: "Bin" }),
          tm(n, x + 10, 360, 200, 100, { size: 34, bold: true, color: ink, align: "center", lh: 1.05 }),
          e(ic, x + 70, 500, 80, { c1: ink }),
          t(yes, x, 690, 220, { size: 24, color: INK, lh: 1.5 }),
          t(no, x, 845, 220, { size: 19, italic: true, color: "#b91c1c", lh: 1.3 }),
        ];
      }),
      r(50, 950, 700, 130, "#dcfce7", { radius: 20, name: "Tip box" }),
      e("icon-idea", 80, 985, 60, { c1: "#166534" }),
      tm("Rinse it, squash it, lid on. Clean recycling is twice as likely to be reused.", 165, 950, 560, 130, { size: 24, bold: true, color: "#14532d", lh: 1.35 }),
    ])];
  });
  tpl("vintage-travel-poster-pr2", "Vintage travel poster", "poster-a1", PT + "travel tourism vintage retro coast holiday destination illustration", (W, H) => {
    const { h, t, r, c, s } = kit(W, H, 800);
    const MAR = "#7a2e2e";
    return [page(["#fcd9a8", "#f59e7b", 180], [
      c(250, 250, 300, 300, "#fff1c1", { name: "Sun" }),
      s("triangle", -220, 380, 760, 420, "#e9967a", { name: "Far hill" }),
      s("triangle", 300, 330, 760, 470, "#d97757", { name: "Far hill" }),
      s("triangle", -140, 520, 620, 300, "#9a3b3b", { name: "Near hill" }),
      s("triangle", 420, 560, 560, 260, "#b4533f", { name: "Near hill" }),
      r(620, 600, 40, 170, WHITE, { name: "Lighthouse" }),
      r(620, 640, 40, 26, "#dc2626", { name: "Lighthouse stripe" }), r(620, 700, 40, 26, "#dc2626", { name: "Lighthouse stripe" }),
      r(612, 588, 56, 16, MAR, { radius: 4, name: "Lighthouse deck" }),
      s("triangle", 615, 548, 50, 42, "#dc2626", { name: "Lighthouse roof" }),
      r(0, 770, 800, 210, "#1e5f74", { name: "Sea" }),
      ...[[80, 810, 180], [430, 830, 150], [250, 900, 220], [560, 930, 160]].map(([x, y, w]) => r(x, y, w, 6, "#2f7f96", { radius: 3, name: "Wave" })),
      s("triangle", 300, 800, 64, 92, WHITE, { name: "Sail" }),
      r(272, 892, 120, 20, MAR, { radius: 10, name: "Boat" }),
      t("VISIT THE", 50, 60, 700, { size: 32, bold: true, color: MAR, align: "center", ls: 14 }),
      t("NORTH COAST", 40, 100, 720, { size: 84, bold: true, color: MAR, align: "center" }),
      r(0, 980, 800, h - 980, MAR, { name: "Footer" }),
      t("Cliffs · Beaches · Lighthouses", 40, 1004, 720, { size: 36, bold: true, color: "#fff1c1", align: "center" }),
      t("Rail and ferry daily from the city · northcoast.travel", 40, 1060, 720, { size: 22, color: "#fcd9a8", align: "center" }),
    ])];
  });
  tpl("trade-expo-poster-pr2", "Trade expo poster", "poster-a1", PT + "corporate expo trade show business exhibition building industry", (W, H) => {
    const { h, t, r, s } = kit(W, H, 800);
    const OR = "#f97316";
    const hexes = [[400, 40, "#12325c"], [550, 40, OR], [700, 40, "#1d4b85"], [475, 170, "#facc15"], [625, 170, "#12325c"], [400, 300, "#1d4b85"], [550, 300, "#12325c"], [700, 300, OR]];
    const stats = [["250", "exhibitors"], ["40", "free talks"], ["3", "days"]];
    return [page("#0b1f3a", [
      ...hexes.map(([x, y, col]) => s("polygon", x, y, 140, 140, col, { sides: 6, name: "Hexagon" })),
      t("TRADE SHOW", 50, 80, 320, { size: 26, bold: true, color: OR, ls: 8 }),
      t("Tools\nTimber\nSmart homes\nGreen building", 50, 130, 320, { size: 26, color: "#cbd5e1", lh: 1.5 }),
      t("BUILD", 50, 470, 700, { size: 150, bold: true, color: WHITE, lh: 0.9 }),
      t("EXPO 2026", 50, 610, 700, { size: 104, bold: true, color: OR, lh: 1 }),
      t("The trade show for builders, architects and makers", 50, 732, 600, { size: 28, color: "#cbd5e1", lh: 1.3 }),
      ...stats.flatMap(([n, l], i) => [t(n, 50 + i * 240, 840, 220, { size: 64, bold: true, color: "#facc15", lh: 1.1 }), t(l, 50 + i * 240, 916, 220, { size: 22, color: WHITE })]),
      r(0, 990, 800, h - 990, OR, { name: "Footer" }),
      t("12 – 14 MARCH · CITY EXPO CENTRE", 50, 1012, 700, { size: 32, bold: true, color: "#0b1f3a" }),
      t("Free trade pass at buildexpo.events", 50, 1060, 700, { size: 24, color: "#0b1f3a" }),
    ])];
  });
  tpl("product-launch-poster-pr2", "Product launch poster", "poster-a1", PT + "corporate product launch new tech gadget sale announcement", (W, H) => {
    const { t, r, c, f, e, tm } = kit(W, H, 800);
    const IN = "#312e81";
    const feats = [["icon-sun", "Sunrise alarm"], ["icon-mobile", "App control"], ["icon-battery", "30-day battery"]];
    return [page(["#eef2ff", "#fdf2f8", 160], [
      t("LUMEN HOME", 40, 56, 720, { size: 24, bold: true, color: IN, align: "center", ls: 10 }),
      c(150, 130, 500, 500, "#c7d2fe", { op: 0.7, name: "Glow" }),
      f(200, 180, 400, 400, { shape: "rounded", radius: 40, name: "Product photo" }),
      e("badge-new", 560, 140, 120, { c1: "#db2777", c2: WHITE, rot: 12 }),
      t("Meet Aura", 40, 670, 720, { size: 110, bold: true, color: IN, align: "center", lh: 1 }),
      t("The smart lamp that wakes you up with sunlight", 100, 795, 600, { size: 30, color: "#4338ca", align: "center", lh: 1.3 }),
      ...feats.flatMap(([ic, l], i) => [e(ic, 166 + i * 190, 905, 48, { c1: "#db2777" }), t(l, 100 + i * 190, 962, 180, { size: 20, bold: true, color: IN, align: "center" })]),
      r(200, 1030, 400, 72, IN, { radius: 36, name: "Price pill" }),
      tm("Available 1 June · $89", 200, 1030, 400, 72, { size: 26, bold: true, color: WHITE, align: "center" }),
    ])];
  });
  tpl("festival-lineup-poster-pr2", "Festival lineup poster", "poster-24x18", PT + "music festival lineup concert summer bands landscape event", (W, H) => {
    const { h, t, r, c, tm, col } = kit(W, H, 1120);
    const YL = "#fde047", PK = "#f9a8d4", NV = "#1e1b4b";
    const days = [["FRIDAY", "The Midnight Tides", "Kora Lane\nVelvet Static\nDJ Saffron\nNorth Arcade"], ["SATURDAY", "Electric Orchard", "Juno & The Kites\nPale Harbour\nMaya Sol\nThe Parallels"], ["SUNDAY", "Lumen Avenue", "Sister Echo\nCrate Diggers\nRoan Hart\nLow Tide Club"]];
    return [page([NV, "#7c3aed", 135], [
      c(820, -200, 500, 500, "#f472b6", { op: 0.25, name: "Glow" }),
      c(-150, 560, 400, 400, "#22d3ee", { op: 0.2, name: "Glow" }),
      t("SOUNDWAVE", 60, 50, 720, { size: 100, bold: true, color: WHITE, lh: 1 }),
      t("FESTIVAL 2026", 60, 156, 600, { size: 40, bold: true, color: PK, ls: 10 }),
      t("18–20\nJULY", 820, 56, 240, { size: 64, bold: true, color: YL, align: "right", lh: 1 }),
      ...days.flatMap(([d, head, rest], i) => {
        const x = 60 + i * 360;
        return [r(x, 250, 320, 50, YL, { radius: 25, name: "Day pill" }), tm(d, x, 250, 320, 50, { size: 24, bold: true, color: NV, align: "center", ls: 4 }),
          col(326, t(head, x, 0, 320, { size: 42, bold: true, color: WHITE, lh: 1.05 }), 14, t(rest, x, 0, 320, { size: 24, color: "#e9d5ff", lh: 1.45 }))];
      }),
      r(0, 690, 1120, h - 690, "#0f0a2e", { name: "Footer" }),
      t("Riverside Fields · Camping · Food village", 60, 716, 680, { size: 30, bold: true, color: WHITE }),
      t("3-day pass $149 · soundwave.fest", 60, 764, 680, { size: 26, color: PK }),
      r(800, 724, 260, 80, YL, { radius: 40, name: "Button" }),
      tm("GET TICKETS", 800, 724, 260, 80, { size: 26, bold: true, color: NV, align: "center", ls: 2 }),
    ])];
  });
  tpl("new-homes-poster-pr2", "New homes development poster", "poster-24x18", PT + "real estate new homes property development houses for sale landscape", (W, H) => {
    const { t, r, c, f, tm, colm } = kit(W, H, 1120);
    const GR = "#14532d";
    const homes = [["The Alder · 2 bed", "from $289k"], ["The Birch · 3 bed", "from $349k"], ["The Cedar · 4 bed", "from $425k"]];
    return [page("#fbf8f1", [
      f(0, 0, 600, 840, { name: "Home photo" }),
      c(450, 580, 210, 210, GR, { name: "Badge" }),
      colm(580, 210, t("Only 12", 465, 0, 180, { size: 34, bold: true, color: WHITE, align: "center", lh: 1.1 }), t("homes left", 465, 0, 180, { size: 22, color: "#bbf7d0", align: "center" })),
      r(680, 70, 210, 46, GR, { radius: 23, name: "Tag" }),
      tm("NOW SELLING", 680, 70, 210, 46, { size: 20, bold: true, color: WHITE, align: "center", ls: 4 }),
      t("Willow Park\nHomes", 680, 140, 400, { size: 72, family: "serif", bold: true, color: GR, lh: 1 }),
      t("2, 3 and 4 bedroom family homes beside the new Willow Park nature reserve", 680, 300, 390, { size: 22, color: "#44403c", lh: 1.45 }),
      ...homes.flatMap(([n, p], i) => [
        t(n, 680, 432 + i * 66, 230, { size: 24, bold: true, color: INK }),
        t(p, 910, 432 + i * 66, 160, { size: 24, bold: true, color: "#15803d", align: "right" }),
        r(680, 478 + i * 66, 390, 1.5, "#d6d3d1", { name: "Rule" }),
      ]),
      t("Show home open Thursday to Monday, 10 am – 5 pm", 680, 646, 390, { size: 20, color: "#44403c", lh: 1.4 }),
      t("willowparkhomes.com · 555 0190", 680, 724, 390, { size: 24, bold: true, color: GR }),
    ])];
  });
  tpl("basketball-tournament-poster-pr2", "Basketball tournament poster", "poster-24x18", PT + "sport basketball tournament 3on3 street summer competition event landscape", (W, H) => {
    const { h, t, r, c, tm, colm } = kit(W, H, 1120);
    const BK = "#1c1917";
    const info = [["WHEN", "Sat 9 Aug\n10 am"], ["WHERE", "Pier\nCourts"], ["ENTRY", "$40 per\nteam"]];
    return [page("#c2410c", [
      c(-180, 140, 620, 620, "#f97316", { stroke: BK, sw: 10, name: "Ball" }),
      r(125, 140, 10, 620, BK, { name: "Seam" }), r(-180, 445, 620, 10, BK, { name: "Seam" }),
      c(-110, 200, 240, 500, "none", { stroke: BK, sw: 10, name: "Seam" }),
      c(240, 230, 180, 440, "none", { stroke: BK, sw: 10, name: "Seam" }),
      t("3 ON 3", 500, 50, 580, { size: 140, bold: true, color: WHITE, lh: 0.95 }),
      t("STREET BASKETBALL TOURNAMENT", 500, 196, 580, { size: 30, bold: true, color: BK, ls: 3, lh: 1.2 }),
      ...info.flatMap(([k2, v], i) => [
        r(500 + i * 200, 300, 180, 150, BK, { radius: 14, name: "Info box" }),
        colm(300, 150, t(k2, 512 + i * 200, 0, 156, { size: 18, bold: true, color: "#fdba74", align: "center", ls: 3 }), 6, t(v, 512 + i * 200, 0, 156, { size: 28, bold: true, color: WHITE, align: "center", lh: 1.1 })),
      ]),
      t("Winners take home $1,000 and the city trophy", 500, 486, 580, { size: 32, bold: true, color: WHITE, lh: 1.25 }),
      t("Teams of 3 or 4 · Ages 16+ · Sign up by 1 August", 500, 588, 580, { size: 22, color: WHITE }),
      r(0, 720, 1120, h - 720, BK, { name: "Footer" }),
      tm("Register at hoopsdowntown.org", 60, 720, 1000, h - 720, { size: 34, bold: true, color: "#fdba74", align: "center" }),
    ])];
  });

  /* ================= Invitations ================= */
  // Small reply-card helpers: a writing line and a tick box.
  const lineFor = (k2, label, x, y, w, lw, col) => [k2.t(label, x, y, lw, { size: 14, bold: true, color: col }), k2.r(x + lw, y + 15, w - lw, 1.5, col, { name: "Write-in line" })];
  const tickFor = (k2, label, x, y, w, col) => [k2.r(x, y + 1, 16, 16, "none", { stroke: col, sw: 1.5, radius: 3, name: "Tick box" }), k2.t(label, x + 26, y, w - 26, { size: 15, color: col })];

  tpl("boho-wedding-invitation-pr2", "Boho rainbow wedding invitation", "invitation-5x7", IT + "wedding boho rainbow sunset terracotta rustic marriage rsvp two sided", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, e, col, tm } = k2;
    const BR = "#5b3a29", TC = "#a4552f", SOFT = "#7a4430", BG = "#f7efe6";
    const front = page(BG, [
      c(90, 70, 300, 300, "#c2603d", { name: "Rainbow arc" }),
      c(120, 100, 240, 240, "#e3a587", { name: "Rainbow arc" }),
      c(150, 130, 180, 180, "#d9b38c", { name: "Rainbow arc" }),
      c(180, 160, 120, 120, BG, { name: "Rainbow centre" }),
      r(60, 220, 360, 170, BG, { name: "Ground" }),
      r(70, 219, 340, 2, "#c2603d", { name: "Horizon" }),
      col(252,
        t("TOGETHER WITH THEIR FAMILIES", 40, 0, 400, { size: 12, bold: true, color: SOFT, align: "center", ls: 3 }), 12,
        t("Layla & Omar", 40, 0, 400, { size: 46, family: "serif", italic: true, bold: true, color: BR, align: "center" }), 8,
        t("invite you to celebrate their wedding", 40, 0, 400, { size: 15, color: BR, align: "center" }), 16,
        e("line-ornament", 165, 0, 150, { c1: "#c2603d" }), 14,
        t("Saturday 12 September 2026 · 4 pm", 40, 0, 400, { size: 16, bold: true, color: BR, align: "center" }), 6,
        t("The Olive Barn, Hill Road, Ashford", 40, 0, 400, { size: 14, color: SOFT, align: "center" }), 6,
        t("Dinner and dancing to follow", 40, 0, 400, { size: 14, family: "serif", italic: true, color: SOFT, align: "center" })),
      e("deco-sprig", 66, 516, 100, { c1: "#a3b18a", c2: "#6b7f53", rot: -20 }),
      e("deco-flower", 205, 540, 70, { c1: "#e3a587", c2: "#c2603d" }),
      e("deco-sprig", 314, 516, 100, { c1: "#a3b18a", c2: "#6b7f53", rot: 20 }),
    ]);
    const back = page(BG, [
      c(190, 50, 100, 100, TC, { name: "Monogram" }),
      tm("L & O", 190, 50, 100, 100, { size: 24, family: "serif", italic: true, bold: true, color: WHITE, align: "center" }),
      t("RSVP", 40, 170, 400, { size: 46, family: "serif", bold: true, color: BR, align: "center" }),
      t("Kindly reply by 1 August", 40, 228, 400, { size: 16, family: "serif", italic: true, color: SOFT, align: "center" }),
      t("rsvp@laylaandomar.com · 555 0134", 40, 258, 400, { size: 14, bold: true, color: BR, align: "center" }),
      e("line-ornament", 165, 296, 150, { c1: TC }),
      col(345,
        t("STAY", 70, 0, 340, { size: 13, bold: true, color: TC, ls: 3 }), 4,
        t("Rooms are held at The Ashford Inn until 1 August. Quote LO26 when you book.", 70, 0, 340, { size: 14, color: BR, lh: 1.45 }), 18,
        t("WHAT TO WEAR", 70, 0, 340, { size: 13, bold: true, color: TC, ls: 3 }), 4,
        t("Garden formal. Flat shoes are a good idea for the lawn.", 70, 0, 340, { size: 14, color: BR, lh: 1.45 }), 18,
        t("GIFTS", 70, 0, 340, { size: 13, bold: true, color: TC, ls: 3 }), 4,
        t("Your presence is the best gift. If you wish, a card box will be at the barn.", 70, 0, 340, { size: 14, color: BR, lh: 1.45 })),
      r(0, H - 40, W, 40, "#c2603d", { name: "Footer band" }),
    ]);
    return [front, back];
  });
  tpl("minimal-wedding-invitation-pr2", "Modern minimal wedding invitation", "invitation-5x7", IT + "wedding minimal modern simple black white rsvp reply card two sided", (W, H) => {
    const k2 = kit(W, H);
    const { t, r } = k2;
    const GD = "#a8823c";
    const front = page(WHITE, [
      r(40, 40, 400, 592, "none", { stroke: INK, sw: 1, name: "Border" }),
      t("TOGETHER WITH THEIR FAMILIES", 60, 82, 360, { size: 12, color: MUTED, align: "center", ls: 4 }),
      t("MAYA", 60, 124, 360, { size: 46, bold: true, color: INK, align: "center", ls: 12 }),
      t("&", 60, 184, 360, { size: 150, family: "serif", italic: true, color: GD, align: "center", lh: 1 }),
      t("JONAS", 60, 340, 360, { size: 46, bold: true, color: INK, align: "center", ls: 12 }),
      t("ARE GETTING MARRIED", 60, 412, 360, { size: 13, color: MUTED, align: "center", ls: 5 }),
      r(200, 450, 80, 1.5, INK, { name: "Rule" }),
      t("10 · 10 · 2026", 60, 470, 360, { size: 28, family: "mono", bold: true, color: INK, align: "center" }),
      t("The Glasshouse, 4 Quay Street\nCeremony at 3 pm, party until late", 60, 524, 360, { size: 14, color: INK, align: "center", lh: 1.6 }),
    ]);
    const back = page(WHITE, [
      r(40, 40, 400, 592, "none", { stroke: INK, sw: 1, name: "Border" }),
      t("R.S.V.P.", 60, 80, 360, { size: 40, family: "serif", bold: true, color: INK, align: "center", ls: 6 }),
      t("Kindly respond by 1 September", 60, 132, 360, { size: 14, family: "serif", italic: true, color: MUTED, align: "center" }),
      ...lineFor(k2, "Name", 80, 200, 320, 60, INK),
      ...tickFor(k2, "Joyfully accepts", 80, 250, 320, INK),
      ...tickFor(k2, "Regretfully declines", 80, 285, 320, INK),
      ...lineFor(k2, "Number of guests", 80, 340, 320, 140, INK),
      ...lineFor(k2, "Dietary needs", 80, 385, 320, 115, INK),
      r(80, 445, 320, 1.5, INK, { name: "Write-in line" }),
      r(200, 500, 80, 1.5, GD, { name: "Rule" }),
      t("Or reply online at mayaandjonas.com\nwith the code MJ1010", 60, 520, 360, { size: 13, color: MUTED, align: "center", lh: 1.6 }),
    ]);
    return [front, back];
  });
  tpl("surprise-party-invitation-pr2", "Surprise party invitation", "invitation-5x7", IT + "birthday surprise party secret adult 40th celebration", (W, H) => {
    const { t, r, c, e, tm } = kit(W, H);
    const YL = "#facc15", PK = "#f472b6";
    return [page("#111827", [
      e("deco-confetti", 24, 24, 130, { c1: YL, c2: PK }),
      e("deco-confetti", 326, 24, 130, { c1: PK, c2: "#60a5fa" }),
      c(90, 110, 300, 300, YL, { name: "Shh circle" }),
      tm("Shh!", 100, 110, 280, 300, { size: 110, bold: true, color: "#111827", align: "center" }),
      t("IT'S A SURPRISE PARTY", 40, 438, 400, { size: 20, bold: true, color: PK, align: "center", ls: 4 }),
      t("for Dev's 40th", 40, 468, 400, { size: 40, family: "serif", italic: true, bold: true, color: WHITE, align: "center" }),
      t("Friday 7 March · 7:30 pm sharp\nThe Lantern Room, 22 King Street", 40, 530, 400, { size: 15, color: "#d1d5db", align: "center", lh: 1.5 }),
      r(0, 600, 480, 72, PK, { name: "Footer band" }),
      tm("Don't tell Dev! RSVP to Priya: 555 0175", 30, 600, 420, 60, { size: 15, bold: true, color: "#111827", align: "center" }),
    ])];
  });
  tpl("gender-reveal-invitation-pr2", "Gender reveal party invitation", "invitation-5x7", IT + "baby gender reveal party boy girl shower pregnancy", (W, H) => {
    const { t, r, c, e, tm } = kit(W, H);
    return [page(WHITE, [
      r(0, 0, 240, 672, "#bfdbfe", { name: "Blue half" }),
      r(240, 0, 240, 672, "#fbcfe8", { name: "Pink half" }),
      t("Boy", 30, 48, 170, { size: 54, family: "serif", italic: true, bold: true, color: "#1d4ed8", align: "center" }),
      t("or", 205, 68, 70, { size: 24, family: "serif", italic: true, color: INK, align: "center" }),
      t("Girl", 280, 48, 170, { size: 54, family: "serif", italic: true, bold: true, color: "#be185d", align: "center" }),
      c(110, 140, 260, 260, WHITE, { name: "Centre circle" }),
      tm("?", 110, 140, 260, 260, { size: 190, bold: true, color: "#8b5cf6", align: "center" }),
      e("deco-balloons", 24, 300, 86, { c1: "#60a5fa", c2: "#93c5fd", c3: "#1d4ed8" }),
      e("deco-balloons", 370, 300, 86, { c1: "#f472b6", c2: "#f9a8d4", c3: "#be185d" }),
      t("Join us for a gender reveal party", 40, 428, 400, { size: 22, bold: true, color: INK, align: "center" }),
      t("Sunday 22 June · 2 pm", 40, 466, 400, { size: 18, bold: true, color: "#4338ca", align: "center" }),
      t("Hosted by Zara & Ali · 14 Elm Close", 40, 496, 400, { size: 15, color: INK, align: "center" }),
      r(60, 545, 160, 50, "#2563eb", { radius: 25, name: "Team pill" }),
      tm("Team Boy", 60, 545, 160, 50, { size: 17, bold: true, color: WHITE, align: "center" }),
      r(260, 545, 160, 50, "#db2777", { radius: 25, name: "Team pill" }),
      tm("Team Girl", 260, 545, 160, 50, { size: 17, bold: true, color: WHITE, align: "center" }),
      t("Wear the colour of your guess!", 40, 615, 400, { size: 14, italic: true, color: INK, align: "center" }),
    ])];
  });
  tpl("baby-naming-invitation-pr2", "Baby naming ceremony invitation", "invitation-5x7", IT + "baby naming ceremony welcome newborn family lunch celebration", (W, H) => {
    const { t, c, f, e } = kit(W, H);
    const DK = "#2f4a2a", MID = "#4d6b45", GD = "#b8913a";
    const scallops = Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; return c(240 + Math.cos(a) * 126 - 20, 210 + Math.sin(a) * 126 - 20, 40, 40, "#c9d8bf", { name: "Scallop" }); });
    return [page("#eef3ea", [
      ...scallops,
      c(115, 85, 250, 250, "#c9d8bf", { name: "Photo ring" }),
      f(127, 97, 226, 226, { shape: "circle", name: "Baby photo" }),
      e("icon-moon", 380, 60, 46, { c1: GD }),
      e("deco-sparkle", 56, 80, 40, { c1: GD }),
      t("Please join us in welcoming", 40, 368, 400, { size: 15, family: "serif", italic: true, color: MID, align: "center" }),
      t("Aria Noor", 40, 392, 400, { size: 52, family: "serif", bold: true, color: DK, align: "center" }),
      t("TO OUR FAMILY", 40, 458, 400, { size: 13, bold: true, color: MID, align: "center", ls: 5 }),
      e("line-ornament", 160, 486, 160, { c1: GD }),
      t("Naming ceremony and lunch", 40, 520, 400, { size: 18, bold: true, color: DK, align: "center" }),
      t("Sunday 9 November · 12 noon\nThe Garden Room, 3 Bay Road", 40, 550, 400, { size: 15, color: DK, align: "center", lh: 1.5 }),
      t("With love, Sana & Imran", 40, 614, 400, { size: 15, family: "serif", italic: true, color: MID, align: "center" }),
    ])];
  });
  tpl("bachelorette-weekend-invitation-pr2", "Bachelorette weekend invitation", "invitation-5x7", IT + "wedding bachelorette hen party weekend trip bride friends itinerary two sided", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, f, tm, colm } = k2;
    const PL = "#9d174d", HOT = "#be185d";
    // A tilted instant photo: white card with the photo frame turned around the same centre.
    const polaroid = (cx, cy, rot) => {
      const a = (rot * Math.PI) / 180, ox = 12 * Math.sin(a), oy = -12 * Math.cos(a);
      return [r(cx - 75, cy - 90, 150, 180, WHITE, { rot, radius: 4, name: "Photo card" }), f(cx + ox - 64, cy + oy - 64, 128, 128, { rot, name: "Trip photo" })];
    };
    const days = [["FRI", "15", "Arrive and dinner", "Check in at Casa Azul by 6 pm. Tapas at 8."], ["SAT", "16", "Beach club day", "Cabana booked from 11 am. Pack a swimsuit!"], ["SUN", "17", "Farewell brunch", "Pastries and coffee before the airport."]];
    const front = page([PL, HOT, 160], [
      ...polaroid(130, 170, -12), ...polaroid(350, 170, 10), ...polaroid(240, 150, -3),
      t("BACHELORETTE", 40, 300, 400, { size: 30, bold: true, color: WHITE, align: "center", ls: 6 }),
      t("Weekend", 40, 336, 400, { size: 72, family: "serif", italic: true, bold: true, color: "#fff1f2", align: "center", lh: 1 }),
      t("for Hannah", 40, 414, 400, { size: 22, family: "serif", italic: true, color: WHITE, align: "center" }),
      r(100, 466, 280, 64, WHITE, { radius: 32, name: "Place pill" }),
      tm("LISBON · 15 – 17 MAY", 100, 466, 280, 64, { size: 18, bold: true, color: HOT, align: "center", ls: 2 }),
      t("Sun, sangria and one very lucky bride", 40, 552, 400, { size: 16, color: WHITE, align: "center" }),
      t("Plans and RSVP on the back", 40, 606, 400, { size: 13, italic: true, color: "#fff1f2", align: "center" }),
    ]);
    const back = page("#fff1f2", [
      t("The plan", 40, 44, 400, { size: 40, family: "serif", italic: true, bold: true, color: PL, align: "center" }),
      ...days.flatMap(([d, n, hd, tx], i) => {
        const y = 116 + i * 88;
        return [r(50, y, 80, 72, HOT, { radius: 12, name: "Day tab" }),
          colm(y, 72, t(d, 50, 0, 80, { size: 14, bold: true, color: WHITE, align: "center", ls: 2 }), t(n, 50, 0, 80, { size: 28, bold: true, color: WHITE, align: "center", lh: 1.05 })),
          t(hd, 150, y + 6, 280, { size: 17, bold: true, color: INK }),
          t(tx, 150, y + 30, 280, { size: 14, color: "#57534e", lh: 1.4 })];
      }),
      t("BRING", 50, 392, 380, { size: 13, bold: true, color: HOT, ls: 3 }),
      t("Passport · swimsuit · something white for Saturday night", 50, 412, 380, { size: 14, color: INK, lh: 1.4 }),
      r(50, 478, 380, 118, WHITE, { radius: 16, name: "RSVP card" }),
      t("RSVP and deposit by 1 April", 70, 496, 340, { size: 18, bold: true, color: PL }),
      t("$150 covers the villa and Saturday dinner. Send it to Megan: 555 0129", 70, 528, 340, { size: 14, color: INK, lh: 1.45 }),
    ]);
    return [front, back];
  });
  tpl("launch-event-invitation-pr2", "Corporate launch event invitation", "invitation-5x7", IT + "corporate business launch event product evening rsvp programme two sided", (W, H) => {
    const k2 = kit(W, H);
    const { h, t, r, c, f } = k2;
    const NV = "#0b1324", GD = "#d4af37";
    const prog = [["6:30", "Welcome drinks"], ["7:00", "Keynote: why we built Nova"], ["7:30", "Hands-on demo stations"], ["8:30", "Dinner and networking"], ["10:00", "Close"]];
    const front = page(NV, [
      r(30, 30, 120, 2, GD, { name: "Corner" }), r(30, 30, 2, 120, GD, { name: "Corner" }),
      r(330, 640, 120, 2, GD, { name: "Corner" }), r(448, 522, 2, 120, GD, { name: "Corner" }),
      t("YOU ARE INVITED TO", 50, 112, 380, { size: 14, bold: true, color: GD, align: "center", ls: 5 }),
      t("the launch of", 50, 142, 380, { size: 24, family: "serif", italic: true, color: "#e5e7eb", align: "center" }),
      t("NOVA\nONE", 50, 186, 380, { size: 96, bold: true, color: WHITE, align: "center", lh: 0.95 }),
      r(200, 398, 80, 3, GD, { name: "Rule" }),
      t("An evening of live demos, drinks and conversation with the team behind Nova.", 70, 420, 340, { size: 15, color: "#cbd5e1", align: "center", lh: 1.5 }),
      t("Thursday 16 April · 6:30 pm", 50, 500, 380, { size: 18, bold: true, color: GD, align: "center" }),
      t("Skyline Rooftop, 50 Market Street", 50, 530, 380, { size: 15, color: WHITE, align: "center" }),
      f(215, 574, 50, 50, { shape: "circle", name: "Company logo" }),
    ]);
    const back = page("#f8fafc", [
      t("Evening programme", 50, 54, 380, { size: 30, bold: true, color: NV }),
      r(70, 122, 2, 236, GD, { name: "Timeline" }),
      ...prog.flatMap(([tm, ev], i) => [
        c(64, 120 + i * 58, 14, 14, GD, { name: "Dot" }),
        t(tm, 95, 116 + i * 58, 70, { size: 15, bold: true, color: NV }),
        t(ev, 170, 116 + i * 58, 260, { size: 15, color: INK }),
      ]),
      r(50, 400, 380, 1, "#cbd5e1", { name: "Rule" }),
      t("Dress code: business smart", 50, 418, 380, { size: 15, bold: true, color: INK }),
      f(50, 470, 110, 110, { name: "QR code" }),
      t("RSVP by 6 April", 180, 476, 250, { size: 20, bold: true, color: NV }),
      t("events@novaone.com\nor scan the code", 180, 508, 250, { size: 14, color: "#475569", lh: 1.5 }),
      r(0, h - 40, 480, 40, NV, { name: "Footer band" }),
    ]);
    return [front, back];
  });
  tpl("then-now-anniversary-invitation-pr2", "Then and now anniversary invitation", "invitation-5x7", IT + "anniversary ruby 40th wedding party couple photos then now celebration two sided", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, e, tm, colm } = k2;
    const RU = "#9b1c31", DK = "#5c1020";
    const nums = [["40", "years married"], ["3", "children"], ["5", "grandchildren"], ["1", "very old car"]];
    const front = page("#fff7f5", [
      t("FORTY YEARS", 40, 46, 400, { size: 16, bold: true, color: RU, align: "center", ls: 8 }),
      c(48, 88, 184, 184, "#f3d4d9", { name: "Photo ring" }), f(56, 96, 168, 168, { shape: "circle", name: "Then photo" }),
      c(248, 88, 184, 184, "#f3d4d9", { name: "Photo ring" }), f(256, 96, 168, 168, { shape: "circle", name: "Now photo" }),
      e("icon-heart", 222, 162, 36, { c1: RU }),
      r(90, 258, 100, 32, RU, { radius: 16, name: "Year pill" }), tm("1986", 90, 258, 100, 32, { size: 15, bold: true, color: WHITE, align: "center", ls: 2 }),
      r(290, 258, 100, 32, RU, { radius: 16, name: "Year pill" }), tm("2026", 290, 258, 100, 32, { size: 15, bold: true, color: WHITE, align: "center", ls: 2 }),
      t("Then & Now", 40, 312, 400, { size: 52, family: "serif", italic: true, bold: true, color: DK, align: "center" }),
      t("Please join us for the ruby anniversary of", 40, 388, 400, { size: 15, color: DK, align: "center" }),
      t("Helen & Richard Park", 40, 412, 400, { size: 30, family: "serif", bold: true, color: RU, align: "center" }),
      r(200, 466, 80, 2, "#e8a0ab", { name: "Rule" }),
      t("Saturday 14 November · 6 pm\nThe Rosewood Hotel, Garden Suite", 40, 484, 400, { size: 15, color: INK, align: "center", lh: 1.5 }),
      t("Dinner, speeches and dancing", 40, 544, 400, { size: 14, family: "serif", italic: true, color: "#7f1d2d", align: "center" }),
      r(0, 612, 480, 60, RU, { name: "Footer band" }),
      tm("RSVP DETAILS ON THE BACK", 40, 612, 400, 48, { size: 13, bold: true, color: WHITE, align: "center", ls: 2 }),
    ]);
    const back = page("#fff7f5", [
      t("A few numbers", 40, 46, 400, { size: 30, family: "serif", bold: true, color: DK, align: "center" }),
      ...nums.flatMap(([n, l], i) => {
        const x = 50 + (i % 2) * 200, y = 104 + Math.floor(i / 2) * 124;
        return [r(x, y, 180, 110, WHITE, { radius: 12, stroke: "#f3d4d9", sw: 2, name: "Number card" }),
          colm(y, 110, t(n, x + 10, 0, 160, { size: 40, bold: true, color: RU, align: "center", lh: 1.1 }), t(l, x + 10, 0, 160, { size: 14, color: DK, align: "center" }))];
      }),
      r(50, 370, 380, 1, "#e8a0ab", { name: "Rule" }),
      t("RSVP", 40, 390, 400, { size: 22, bold: true, color: DK, align: "center", ls: 6 }),
      t("by 1 November to Kate · 555 0157\nkate.park@email.com", 40, 424, 400, { size: 15, color: INK, align: "center", lh: 1.5 }),
      t("No gifts, please. Bring a favourite memory or photo for our album instead.", 70, 494, 340, { size: 15, family: "serif", italic: true, color: "#7f1d2d", align: "center", lh: 1.5 }),
      e("icon-heart", 220, 592, 40, { c1: RU }),
    ]);
    return [front, back];
  });
  tpl("sweet-sixteen-invitation-pr2", "Sweet sixteen birthday invitation", "invitation-5x7", IT + "birthday sweet 16 sixteen teen party disco sparkle", (W, H) => {
    const { t, r, c, e, tm } = kit(W, H);
    const PU = "#6d28d9";
    return [page(["#c4b5fd", "#f9a8d4", 135], [
      r(239, 0, 2, 62, "#6b7280", { name: "String" }),
      c(150, 60, 180, 180, "#e5e7eb", { name: "Disco ball" }),
      ...[[150, 100, 180, 100], [150, 130, 180, 40], [180, 60, 120, 180], [215, 60, 50, 180]].map(([x, y, w, hh]) => c(x, y, w, hh, "none", { stroke: "#9ca3af", sw: 2, name: "Ball line" })),
      e("deco-sparkle", 278, 74, 40, { c1: WHITE }),
      e("deco-stars", 30, 30, 90, { c1: WHITE, c2: "#fde68a" }),
      e("deco-stars", 360, 190, 90, { c1: WHITE, c2: "#fde68a" }),
      t("SWEET", 40, 260, 400, { size: 30, bold: true, color: PU, align: "center", ls: 14 }),
      t("16", 40, 300, 400, { size: 170, bold: true, color: PU, align: "center", lh: 1, outline: { width: 6, color: WHITE } }),
      t("Ava's birthday party", 40, 474, 400, { size: 30, family: "serif", italic: true, bold: true, color: "#4c1d95", align: "center" }),
      t("Saturday 21 March · 8 pm till midnight\nThe Loft, 9 Harbour Street", 40, 526, 400, { size: 15, color: "#3b0764", align: "center", lh: 1.5 }),
      r(110, 590, 260, 42, WHITE, { radius: 21, name: "Dress code pill" }),
      tm("Dress code: sparkle!", 110, 590, 260, 42, { size: 15, bold: true, color: PU, align: "center" }),
    ])];
  });
  tpl("game-night-invitation-pr2", "Game night invitation", "invitation-5x7", IT + "game night party board games cards friends snacks evening", (W, H) => {
    const { t, r, c, e, colm } = kit(W, H);
    const NV = "#14213d", OR = "#fca311";
    const pips = (x, y, spots, col) => spots.map(([dx, dy]) => c(x + dx - 10, y + dy - 10, 20, 20, col, { name: "Pip" }));
    return [page(NV, [
      r(80, 80, 130, 130, WHITE, { radius: 22, name: "Die" }),
      ...pips(80, 80, [[32, 32], [98, 32], [65, 65], [32, 98], [98, 98]], NV),
      r(262, 120, 130, 130, OR, { radius: 22, name: "Die" }),
      ...pips(262, 120, [[32, 32], [65, 65], [98, 98]], NV),
      e("deco-sparkle", 400, 52, 40, { c1: OR }),
      e("deco-sparkle", 40, 236, 30, { c1: WHITE }),
      t("GAME", 40, 282, 400, { size: 96, bold: true, color: OR, align: "center", lh: 0.95 }),
      t("NIGHT", 40, 373, 400, { size: 96, bold: true, color: WHITE, align: "center", lh: 0.95 }),
      t("Board games, card games and far too many snacks. Bring your best poker face.", 60, 478, 360, { size: 15, color: "#e5e5e5", align: "center", lh: 1.4 }),
      r(60, 548, 360, 96, OR, { radius: 14, name: "Details card" }),
      colm(548, 96,
        t("Friday 16 January · 7 pm", 80, 0, 320, { size: 17, bold: true, color: NV, align: "center" }), 2,
        t("At Sam and Jo's · 3 Hill Road", 80, 0, 320, { size: 15, color: NV, align: "center" }), 2,
        t("RSVP: 555 0144", 80, 0, 320, { size: 15, bold: true, color: NV, align: "center" })),
    ])];
  });
  tpl("mehndi-night-invitation-pr2", "Mehndi night invitation", "invitation-5x7", IT + "wedding mehndi henna night dholki celebration green gold", (W, H) => {
    const { t, r, e } = kit(W, H);
    const GD = "#d4af37", YL = "#fbbf24", CR = "#fde68a";
    return [page("#0f3d2e", [
      r(20, 20, 440, 632, "none", { stroke: GD, sw: 3, name: "Border" }),
      r(30, 30, 420, 612, "none", { stroke: GD, sw: 1, name: "Inner border" }),
      e("deco-lantern", 62, 30, 46, { c1: GD, c2: YL, c3: "#fff7cc" }),
      e("deco-lantern", 372, 30, 46, { c1: GD, c2: YL, c3: "#fff7cc" }),
      e("deco-flower", 190, 50, 100, { c1: "#f97316", c2: "#facc15" }),
      t("You are invited to the", 40, 166, 400, { size: 15, family: "serif", italic: true, color: CR, align: "center" }),
      t("Mehndi\nNight", 40, 190, 400, { size: 66, family: "serif", italic: true, bold: true, color: YL, align: "center", lh: 1 }),
      e("line-ornament", 150, 334, 180, { c1: GD }),
      t("celebrating", 40, 366, 400, { size: 14, family: "serif", italic: true, color: CR, align: "center" }),
      t("Sana & Ahmed", 40, 388, 400, { size: 36, family: "serif", bold: true, color: WHITE, align: "center" }),
      t("Thursday 3 December · 7 pm onwards", 40, 452, 400, { size: 16, bold: true, color: YL, align: "center" }),
      t("Rangoli Banquet Hall\n21 Canal Road, Lahore", 40, 480, 400, { size: 15, color: WHITE, align: "center", lh: 1.5 }),
      t("Dress in yellow, green or anything bright", 40, 552, 400, { size: 14, family: "serif", italic: true, color: CR, align: "center" }),
      t("DHOLKI · HENNA · DINNER", 40, 584, 400, { size: 13, bold: true, color: GD, align: "center", ls: 3 }),
    ])];
  });
  tpl("reception-landscape-invitation-pr2", "Wedding reception invitation", "invitation-7x5", IT + "wedding reception dinner dance landscape photo rsvp two sided", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, f, e, col } = k2;
    const DK = "#3d2f1f", GD = "#7f5f2c", SOFT = "#6b5a45";
    const notes = [["PARKING", "Free on site, follow the lantern signs."], ["DRESS CODE", "Black tie optional."], ["LITTLE ONES", "We love your kids, but this is an adults-only evening."], ["GIFTS", "A wishing well will be at the pavilion."]];
    const front = page("#fffaf3", [
      f(0, 0, 290, 480, { name: "Couple photo" }),
      r(290, 0, 8, 480, "#b08d57", { name: "Gold stripe" }),
      col(54,
        t("PLEASE JOIN US FOR THE", 330, 0, 310, { size: 12, bold: true, color: GD, align: "center", ls: 3 }), 6,
        t("Wedding Reception", 330, 0, 310, { size: 22, family: "serif", italic: true, color: SOFT, align: "center" }), 2,
        t("of", 330, 0, 310, { size: 13, family: "serif", italic: true, color: SOFT, align: "center" }), 8,
        t("Grace\n& Daniel", 330, 0, 310, { size: 50, family: "serif", bold: true, color: DK, align: "center", lh: 1 }), 14,
        e("line-ornament", 405, 0, 160, { c1: GD }), 14,
        t("Saturday 18 October 2026\nseven o'clock in the evening", 330, 0, 310, { size: 15, color: DK, align: "center", lh: 1.5 }), 10,
        t("The Riverside Pavilion\n5 Mill Walk, Kingston", 330, 0, 310, { size: 14, color: SOFT, align: "center", lh: 1.45 })),
      t("DINNER · DANCING · CELEBRATION", 330, 420, 310, { size: 12, bold: true, color: GD, align: "center", ls: 2 }),
    ]);
    const back = page("#f6efe4", [
      t("RSVP", 40, 44, 276, { size: 40, family: "serif", bold: true, color: DK }),
      t("by 15 September", 40, 96, 276, { size: 15, family: "serif", italic: true, color: SOFT }),
      ...lineFor(k2, "Name(s)", 40, 146, 276, 70, DK),
      ...tickFor(k2, "Will attend", 40, 190, 130, DK),
      ...tickFor(k2, "Can't make it", 176, 190, 140, DK),
      t("Meal choice", 40, 236, 276, { size: 14, bold: true, color: DK }),
      ...tickFor(k2, "Beef", 40, 262, 80, DK), ...tickFor(k2, "Fish", 126, 262, 80, DK), ...tickFor(k2, "Veggie", 212, 262, 104, DK),
      ...lineFor(k2, "Song request", 40, 312, 276, 104, DK),
      t("Reply online: graceanddaniel.love", 40, 400, 276, { size: 13, color: SOFT }),
      r(336, 40, 1.5, 400, GD, { name: "Divider" }),
      t("Good to know", 360, 44, 272, { size: 26, family: "serif", bold: true, color: DK }),
      col(96, ...notes.flatMap(([hd, tx], i) => [
        t(hd, 360, 0, 272, { size: 11, bold: true, color: GD, ls: 2 }), 3,
        t(tx, 360, 0, 272, { size: 13.5, color: DK, lh: 1.4 }), ...(i < notes.length - 1 ? [14] : []),
      ])),
    ]);
    return [front, back];
  });
  tpl("superhero-birthday-invitation-pr2", "Superhero birthday invitation", "invitation-7x5", IT + "birthday kids superhero comic party boy girl landscape", (W, H) => {
    const { t, r, c, s, f, e, tm, col } = kit(W, H);
    const BL = "#1e3a8a", RD = "#ef4444";
    return [page("#fde047", [
      e("deco-dots", 20, 20, 110, { c1: "#f59e0b" }),
      e("deco-dots", 540, 352, 110, { c1: "#f59e0b" }),
      s("star", 16, 50, 300, 300, RD, { points: 12, name: "Burst" }),
      t("POW!", 56, 166, 220, { size: 64, bold: true, color: WHITE, align: "center", rot: -10, outline: { width: 4, color: BL } }),
      c(40, 334, 116, 116, BL, { name: "Photo ring" }),
      f(48, 342, 100, 100, { shape: "circle", name: "Birthday kid photo" }),
      c(190, 362, 88, 88, BL, { name: "Age badge" }),
      tm("7", 190, 362, 88, 88, { size: 56, bold: true, color: "#fde047", align: "center" }),
      t("CALLING ALL\nHEROES!", 340, 46, 300, { size: 36, bold: true, color: BL, lh: 1.05 }),
      t("Max is turning 7 and needs your super powers to celebrate!", 340, 136, 300, { size: 16, bold: true, color: INK, lh: 1.4 }),
      r(340, 228, 300, 160, WHITE, { radius: 12, stroke: BL, sw: 4, name: "Info box" }),
      col(250,
        t("SAT 14 JUNE · 2 – 5 PM", 360, 0, 260, { size: 18, bold: true, color: "#c81e1e" }), 8,
        t("Hero HQ (aka 9 Oak Lane)", 360, 0, 260, { size: 16, bold: true, color: INK }), 8,
        t("Capes and masks welcome! RSVP to Mum: 555 0186", 360, 0, 260, { size: 14, color: INK, lh: 1.4 })),
    ])];
  });
  tpl("family-reunion-invitation-pr2", "Family reunion picnic invitation", "invitation-7x5", IT + "family reunion picnic party bbq summer gathering landscape", (W, H) => {
    const { t, r, c, f, e, tm } = kit(W, H);
    const RD = "#991b1b";
    const rows = [["icon-calendar", "Sunday 10 August · from 11 am"], ["icon-location", "Lakeside Park, Shelter B"], ["icon-heart", "Bring a dish to share"]];
    return [page("#fffdf7", [
      ...[0, 40, 80].map((y) => r(0, y, 672, 20, "#ef4444", { op: 0.45, name: "Gingham" })),
      ...Array.from({ length: 17 }, (_, i) => r(i * 40, 0, 20, 120, "#ef4444", { op: 0.45, name: "Gingham" })),
      r(0, 120, 672, 6, "#ef4444", { name: "Edge" }),
      t("You're invited to the", 40, 148, 380, { size: 16, family: "serif", italic: true, color: "#7c2d12" }),
      t("Ramos Family\nReunion", 40, 172, 400, { size: 50, family: "serif", bold: true, color: RD, lh: 1 }),
      t("Three generations, one big picnic. Come hungry!", 40, 284, 390, { size: 15, color: INK }),
      ...rows.flatMap(([ic, s2], i) => [e(ic, 40, 322 + i * 34, 24, { c1: RD }), tm(s2, 74, 322 + i * 34, 360, 24, { size: 15, bold: true, color: INK })]),
      c(452, 142, 188, 188, "#fecaca", { name: "Photo ring" }),
      f(460, 150, 172, 172, { shape: "circle", name: "Family photo" }),
      t("Games · BBQ · Group photo at 3 pm", 446, 342, 200, { size: 14, bold: true, color: RD, align: "center", lh: 1.4 }),
      r(0, 428, 672, 52, RD, { name: "Footer band" }),
      tm("RSVP to Aunt Rosa: 555 0161 · ramosreunion.com", 30, 428, 612, 40, { size: 14, bold: true, color: WHITE, align: "center" }),
    ])];
  });
  tpl("baby-shower-landscape-invitation-pr2", "Clothesline baby shower invitation", "invitation-7x5", IT + "baby shower clothesline landscape registry rsvp diaper raffle two sided", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, s, e, col } = k2;
    const NV = "#0c4a6e", BL = "#0369a1";
    const items = [["rect", "#bae6fd"], ["heart", "#fbcfe8"], ["star", "#fde68a"], ["rect", "#bbf7d0"], ["heart", "#ddd6fe"]];
    const front = page("#f0f9ff", [
      s("line", -20, 50, 712, 20, "#94a3b8", { sw: 2, name: "Clothesline" }),
      ...items.flatMap(([kind, colr], i) => {
        const x = 70 + i * 112;
        return [kind === "rect" ? r(x, 64, 90, 100, colr, { radius: 18, name: "Onesie" }) : s(kind, x, 64, 90, kind === "star" ? 90 : 80, colr, { name: "Tiny " + kind }), r(x + 40, 52, 10, 22, "#a8a29e", { radius: 3, name: "Peg" })];
      }),
      t("Oh, baby!", 40, 194, 592, { size: 70, family: "serif", italic: true, bold: true, color: NV, align: "center" }),
      t("A baby shower honouring Emma Brooks", 40, 286, 592, { size: 20, bold: true, color: BL, align: "center" }),
      r(286, 330, 100, 2, "#7dd3fc", { name: "Rule" }),
      t("Saturday 6 September · 2 pm\nThe Brooks home, 17 Linden Avenue", 40, 346, 592, { size: 16, color: INK, align: "center", lh: 1.5 }),
      t("RSVP and gift ideas on the back", 40, 420, 592, { size: 13, italic: true, color: BL, align: "center" }),
    ]);
    const back = page(WHITE, [
      r(0, 0, 672, 16, "#bae6fd", { name: "Top bar" }),
      r(0, 464, 672, 16, "#fbcfe8", { name: "Bottom bar" }),
      col(44,
        t("RSVP", 40, 0, 276, { size: 34, family: "serif", bold: true, color: NV }), 4,
        t("by 25 August to Lily\n555 0112 · lily.brooks@email.com", 40, 0, 276, { size: 14, color: INK, lh: 1.5 }), 20,
        t("Registry", 40, 0, 276, { size: 21, family: "serif", bold: true, color: NV }), 4,
        t("Emma is registered at Little Nest and Bloom Baby. Search for Emma Brooks.", 40, 0, 276, { size: 14, color: INK, lh: 1.5 }), 20,
        t("Diaper raffle", 40, 0, 276, { size: 21, family: "serif", bold: true, color: NV }), 4,
        t("Bring a pack of diapers for a chance to win a spa voucher!", 40, 0, 276, { size: 14, color: INK, lh: 1.5 })),
      r(356, 44, 276, 392, "#f0f9ff", { radius: 20, name: "Book card" }),
      e("icon-bookmark", 464, 66, 60, { c1: BL }),
      t("Bring a book instead of a card", 376, 140, 236, { size: 20, family: "serif", bold: true, color: NV, align: "center", lh: 1.2 }),
      t("Sign the inside cover with a note for the baby and help us build a little library.", 376, 200, 236, { size: 14, color: INK, align: "center", lh: 1.5 }),
      r(410, 320, 40, 90, "#fbcfe8", { radius: 4, name: "Book" }), r(455, 330, 34, 80, "#bae6fd", { radius: 4, name: "Book" }),
      r(494, 315, 44, 95, "#fde68a", { radius: 4, name: "Book" }), r(543, 335, 36, 75, "#bbf7d0", { radius: 4, name: "Book" }),
      r(396, 410, 196, 6, "#94a3b8", { radius: 3, name: "Shelf" }),
    ]);
    return [front, back];
  });

  /* ================= Brochures (2 pages: outside, inside) =================
     Tri-fold outside = [inside flap | back | cover]; bi-fold outside = [back | cover];
     gate-fold outside = [right door | back | left door] (the two doors meet to form the cover). */
  // Icon + one line of text, repeated down a column.
  const iconRows = (k2, rows, x, y, w, pitch, o = {}) => rows.flatMap(([ic, s2], i) => [
    k2.e(ic, x, y + i * pitch, o.icon || 22, { c1: o.c1 || INK }),
    k2.tm(s2, x + (o.icon || 22) + 12, y + i * pitch, w - (o.icon || 22) - 12, o.icon || 22, { size: o.size || 13.5, color: o.color || INK, bold: !!o.bold }),
  ]);

  tpl("wedding-planner-brochure-pr2", "Wedding planner brochure", "brochure-trifold-a4", BT + "trifold wedding planner events packages services bride", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, e, tm, colm } = k2;
    const P = W / 3, BR = "#7a4e3a", GD = "#b08d57", GDT = "#6f522a", SOFT = "#f3e7dc";
    const services = [["icon-calendar", "Full planning", "Budget, timeline and every supplier booked for you."], ["icon-location", "Venue search", "Shortlists and visits to venues that fit your style."], ["icon-star", "Design and styling", "Flowers, tables, lighting and signs that tell your story."], ["icon-users", "Guest care", "Invitations, RSVPs, seating plans and welcome bags."], ["icon-clock", "On-the-day team", "Two coordinators from first look to last dance."]];
    const packs = [["DAY-OF", "$1,800", "We take over in the final month and run the day."], ["PARTIAL", "$3,900", "Design help, supplier picks and the last three months."], ["FULL SERVICE", "$6,500", "Everything from the first idea to the last dance."]];
    const steps = [["Free first meeting", "Coffee, ideas and a rough budget."], ["Your plan", "A timeline, supplier list and moodboard."], ["The details", "We book, chase and check everything."], ["Your day", "You enjoy it. We handle the rest."]];
    const outside = page("#fffaf5", [
      r(0, 0, P, H, SOFT, { name: "Flap panel" }),
      t("“", 30, 36, 100, { size: 90, family: "serif", bold: true, color: "#8a6a3a", lh: 0.8 }),
      t("Clara thought of everything. We just turned up and danced all night.", 30, 120, P - 60, { size: 19, family: "serif", italic: true, color: "#5a3e2b", lh: 1.45 }),
      t("AMIRA & JOSH · JUNE 2025", 30, 216, P - 60, { size: 12, bold: true, color: GDT, ls: 2 }),
      r(30, 254, 60, 2, GD, { name: "Rule" }),
      t("Calm, kind and so organised. Our parents still talk about the flowers.", 30, 278, P - 60, { size: 19, family: "serif", italic: true, color: "#5a3e2b", lh: 1.45 }),
      t("PRIYA & SAM · MAY 2025", 30, 374, P - 60, { size: 12, bold: true, color: GDT, ls: 2 }),
      f(30, 430, P - 60, 310, { shape: "rounded", radius: 12, name: "Wedding photo" }),
      c(P + P / 2 - 75, 56, 150, 150, SOFT, { name: "Photo ring" }),
      f(P + P / 2 - 65, 66, 130, 130, { shape: "circle", name: "Planner photo" }),
      t("Meet Clara", P + 30, 228, P - 60, { size: 28, family: "serif", bold: true, color: BR, align: "center" }),
      t("Lead planner with eleven years of weddings across the coast, from barns to ballrooms.", P + 30, 274, P - 60, { size: 13.5, color: INK, align: "center", lh: 1.55 }),
      r(P + 60, 366, P - 120, 1, "#d6c3b0", { name: "Rule" }),
      ...iconRows(k2, [["icon-call", "555 0170"], ["icon-mail", "hello@everafter.events"], ["icon-location", "12 Rose Lane, Brighton"]], P + 50, 392, P - 100, 40, { c1: GD }),
      r(P + 30, 620, P - 60, 110, BR, { radius: 12, name: "Booking box" }),
      colm(620, 110, t("Book a free consultation", P + 40, 0, P - 80, { size: 17, bold: true, color: WHITE, align: "center" }), 4, t("Mon – Sat, 9 am – 6 pm", P + 40, 0, P - 80, { size: 13, color: "#fdf6f0", align: "center" })),
      f(2 * P, 0, P, 470, { name: "Cover photo" }),
      c(2 * P + P / 2 - 50, 420, 100, 100, WHITE, { name: "Heart badge" }),
      e("icon-heart", 2 * P + P / 2 - 22, 448, 44, { c1: GD }),
      t("Ever After", 2 * P + 30, 540, P - 60, { size: 46, family: "serif", italic: true, bold: true, color: BR, align: "center" }),
      t("WEDDING PLANNING & DESIGN", 2 * P + 30, 604, P - 60, { size: 13, bold: true, color: GDT, align: "center", ls: 4 }),
      e("line-ornament", 2 * P + P / 2 - 80, 640, 160, { c1: GD }),
      t("everafter.events", 2 * P + 30, 700, P - 60, { size: 15, color: BR, align: "center" }),
    ]);
    const inside = page("#fffaf5", [
      t("Our services", 30, 46, P - 60, { size: 30, family: "serif", bold: true, color: BR }),
      r(30, 94, 50, 3, GD, { name: "Rule" }),
      ...services.flatMap(([ic, hd, tx], i) => [e(ic, 30, 122 + i * 78, 30, { c1: GD }), t(hd, 76, 122 + i * 78, P - 106, { size: 15, bold: true, color: INK }), t(tx, 76, 143 + i * 78, P - 106, { size: 12.5, color: "#57534e", lh: 1.4 })]),
      f(30, 530, P - 60, 220, { shape: "rounded", radius: 12, name: "Table styling photo" }),
      r(P, 0, P, H, BR, { name: "Packages panel" }),
      t("Packages", P + 30, 46, P - 60, { size: 30, family: "serif", bold: true, color: WHITE }),
      ...packs.flatMap(([n, p], i) => {
        const y = 112 + i * 214;
        return [r(P + 30, y, P - 60, 196, "#8f6450", { radius: 12, name: "Package card" }),
          t(n, P + 50, y + 20, P - 100, { size: 14, bold: true, color: "#fdf6f0", ls: 3 }),
          t(p, P + 50, y + 44, P - 100, { size: 34, bold: true, color: WHITE }),
          t(packs[i][2], P + 50, y + 96, P - 100, { size: 13, color: "#fdf6f0", lh: 1.45 }),
          ...(i === 1 ? [r(P + 50, y + 156, 120, 24, SOFT, { radius: 12, name: "Tag" }), tm("MOST POPULAR", P + 50, y + 156, 120, 24, { size: 10.5, bold: true, color: BR, align: "center", ls: 1 })] : [])];
      }),
      t("How it works", 2 * P + 30, 46, P - 60, { size: 30, family: "serif", bold: true, color: BR }),
      r(2 * P + 30, 94, 50, 3, GD, { name: "Rule" }),
      ...steps.flatMap(([hd, tx], i) => [c(2 * P + 30, 122 + i * 86, 40, 40, "#8a6a3a", { name: "Step" }), tm(String(i + 1), 2 * P + 30, 122 + i * 86, 40, 40, { size: 18, bold: true, color: WHITE, align: "center" }), t(hd, 2 * P + 86, 123 + i * 86, P - 116, { size: 15, bold: true, color: INK }), t(tx, 2 * P + 86, 144 + i * 86, P - 116, { size: 12.5, color: "#57534e", lh: 1.4 })]),
      r(2 * P + 30, 480, P - 60, 150, SOFT, { radius: 14, name: "Quote box" }),
      colm(480, 150, t("“Your day, without the stress.”", 2 * P + 50, 0, P - 100, { size: 20, family: "serif", italic: true, bold: true, color: BR, align: "center", lh: 1.3 }), 10, t("Call 555 0170 to check your date", 2 * P + 50, 0, P - 100, { size: 13.5, bold: true, color: GDT, align: "center" })),
      e("deco-flower", 2 * P + P / 2 - 40, 660, 80, { c1: "#e8c4b8", c2: GD }),
    ]);
    return [outside, inside];
  });
  tpl("summer-camp-brochure-pr2", "Kids summer camp brochure", "brochure-trifold-a4", BT + "trifold summer camp kids school holiday activities children outdoor", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, e, tm, colm } = k2;
    const P = W / 3, NV = "#0c4a6e", BL = "#0369a1";
    const day = [["8:30", "Drop-off and games"], ["9:30", "Morning activity"], ["11:00", "Snack and swim"], ["12:30", "Lunch on the lawn"], ["1:30", "Afternoon project"], ["3:00", "Team challenge"], ["4:00", "Pick-up"]];
    const dots = ["#0284c7", "#f97316", "#16a34a", "#7c3aed", "#db2777", "#ca8a04", "#0284c7"];
    const prices = [["1 week", "$240"], ["2 weeks", "$450"], ["Full summer (6 weeks)", "$1,250"], ["Brothers and sisters", "10% off"]];
    const acts = [["icon-sun", "Swimming", "#e0f2fe", "#0369a1"], ["icon-leaf", "Nature trails", "#dcfce7", "#15803d"], ["icon-camera", "Photo club", "#ede9fe", "#6d28d9"], ["icon-star", "Arts and crafts", "#fce7f3", "#be185d"], ["icon-flag", "Sports day", "#ffedd5", "#c2410c"], ["icon-bell", "Campfire songs", "#fef9c3", "#a16207"]];
    const weeks = [["Ocean explorers", "30 Jun – 4 Jul · rock pools and boats"], ["Mini chefs", "7 – 11 Jul · bake, cook and taste"], ["Wild woods", "14 – 18 Jul · dens, bugs and trails"], ["Space camp", "21 – 25 Jul · rockets and stargazing"], ["Inventors", "28 Jul – 1 Aug · build and tinker"], ["Showtime", "4 – 8 Aug · music, drama and the big show"]];
    const tabs = ["#0369a1", "#c2410c", "#15803d", "#6d28d9", "#be185d", "#a16207"];
    const outside = page("#f0f9ff", [
      t("A day at camp", 30, 44, P - 60, { size: 28, bold: true, color: NV }),
      r(52, 104, 3, 470, "#bae6fd", { name: "Timeline" }),
      ...day.flatMap(([tm2, what], i) => [c(42, 100 + i * 76, 24, 24, dots[i], { name: "Dot" }), t(tm2, 80, 101 + i * 76, 64, { size: 14, bold: true, color: NV }), t(what, 148, 101 + i * 76, P - 178, { size: 14, color: INK, lh: 1.35 })]),
      r(30, 640, P - 60, 100, "#fef9c3", { radius: 14, name: "Note box" }),
      tm("Early drop-off from 7:45 am and late pick-up until 6 pm", 46, 640, P - 92, 100, { size: 14, bold: true, color: "#854d0e", align: "center", lh: 1.4 }),
      t("Sign up", P + 30, 44, P - 60, { size: 28, bold: true, color: NV, align: "center" }),
      ...prices.flatMap(([a, b], i) => [r(P + 30, 100 + i * 52, P - 60, 46, i % 2 ? WHITE : "#e0f2fe", { radius: 8, name: "Price row" }), tm(a, P + 46, 100 + i * 52, P - 170, 46, { size: 14, color: INK }), tm(b, 2 * P - 122, 100 + i * 52, 76, 46, { size: 15, bold: true, color: NV, align: "right" })]),
      t("How to book", P + 30, 330, P - 60, { size: 18, bold: true, color: NV }),
      t("1. Fill in the form at camppinecone.org\n2. Pay a $50 deposit\n3. Get your welcome pack by email", P + 30, 360, P - 60, { size: 14, color: INK, lh: 1.6 }),
      ...iconRows(k2, [["icon-call", "555 0150"], ["icon-mail", "hello@camppinecone.org"], ["icon-location", "Pinecone Park, 40 Lake Road"]], P + 30, 460, P - 60, 36, { c1: BL }),
      f(P + 30, 590, P - 60, 160, { shape: "rounded", radius: 12, name: "Map" }),
      r(2 * P, 0, P, H, BL, { name: "Cover panel" }),
      r(2 * P, 650, P, H - 650, "#22c55e", { name: "Grass" }),
      c(2 * P + 20, 590, 200, 120, "#22c55e", { name: "Hill" }),
      c(2 * P + 170, 606, 230, 120, "#16a34a", { name: "Hill" }),
      e("icon-sun", 2 * P + P - 130, 36, 96, { c1: "#facc15" }),
      t("CAMP", 2 * P + 30, 150, P - 60, { size: 28, bold: true, color: WHITE, align: "center", ls: 12 }),
      t("Pinecone", 2 * P + 20, 186, P - 40, { size: 62, bold: true, color: WHITE, align: "center" }),
      t("SUMMER 2026 · AGES 6 – 12", 2 * P + 30, 266, P - 60, { size: 14, bold: true, color: WHITE, align: "center", ls: 3 }),
      c(2 * P + P / 2 - 100, 310, 200, 200, "#facc15", { name: "Photo ring" }),
      f(2 * P + P / 2 - 90, 320, 180, 180, { shape: "circle", name: "Campers photo" }),
      t("Six weeks of outdoor fun, friends and big adventures", 2 * P + 40, 528, P - 80, { size: 16, bold: true, color: WHITE, align: "center", lh: 1.35 }),
      t("camppinecone.org", 2 * P + 30, 712, P - 60, { size: 20, bold: true, color: "#052e16", align: "center" }),
    ]);
    const inside = page(WHITE, [
      t("Activities", 30, 44, P - 60, { size: 28, bold: true, color: NV }),
      ...acts.flatMap(([ic, l, soft, ink], i) => {
        const x = 30 + (i % 2) * 165, y = 100 + Math.floor(i / 2) * 136;
        return [r(x, y, 149, 120, soft, { radius: 16, name: "Activity" }), e(ic, x + 50, y + 16, 48, { c1: ink }), t(l, x + 8, y + 76, 133, { size: 15, bold: true, color: ink, align: "center" })];
      }),
      r(30, 520, P - 60, 190, "#fef9c3", { radius: 16, name: "Gift box" }),
      t("EVERY CAMPER GETS", 50, 542, P - 100, { size: 13, bold: true, color: "#854d0e", ls: 2 }),
      t("A camp T-shirt\nA water bottle\nA weekly photo book\nA part in the summer show", 50, 570, P - 100, { size: 15, color: INK, lh: 1.6 }),
      r(P, 0, P, 120, "#facc15", { name: "Header band" }),
      t("Weeks and themes", P + 30, 42, P - 60, { size: 28, bold: true, color: NV }),
      ...weeks.flatMap(([th, tx], i) => {
        const y = 146 + i * 98;
        return [r(P + 30, y, 76, 76, tabs[i], { radius: 12, name: "Week tab" }),
          colm(y, 76, t("WEEK", P + 30, 0, 76, { size: 11, bold: true, color: WHITE, align: "center", ls: 2 }), t(String(i + 1), P + 30, 0, 76, { size: 30, bold: true, color: WHITE, align: "center", lh: 1.05 })),
          t(th, P + 122, y + 8, P - 152, { size: 17, bold: true, color: NV }), t(tx, P + 122, y + 32, P - 152, { size: 12.5, color: INK, lh: 1.4 })];
      }),
      t("Safety first", 2 * P + 30, 44, P - 60, { size: 28, bold: true, color: NV }),
      ...["Qualified first-aiders at every session", "One leader for every 8 campers", "Lifeguards at the pool all day", "Secure sign-in and sign-out"].flatMap((s2, i) => [e("icon-check-circle", 2 * P + 30, 100 + i * 56, 26, { c1: "#16a34a" }), t(s2, 2 * P + 66, 102 + i * 56, P - 96, { size: 14, color: INK, lh: 1.35 })]),
      t("What to pack", 2 * P + 30, 344, P - 60, { size: 24, bold: true, color: NV }),
      ...["Packed lunch and snacks", "Swimsuit and towel", "Sun hat and sunscreen", "Spare clothes", "Name on everything!"].flatMap((s2, i) => [r(2 * P + 30, 392 + i * 40, 18, 18, "none", { stroke: NV, sw: 2, radius: 4, name: "Tick box" }), t(s2, 2 * P + 60, 390 + i * 40, P - 90, { size: 15, color: INK })]),
      r(2 * P + 30, 620, P - 60, 120, BL, { radius: 16, name: "Contact box" }),
      colm(620, 120, t("Questions?", 2 * P + 40, 0, P - 80, { size: 20, bold: true, color: WHITE, align: "center" }), 4, t("Call Coach Mia on 555 0150", 2 * P + 40, 0, P - 80, { size: 14, color: WHITE, align: "center" })),
    ]);
    return [outside, inside];
  });
  tpl("financial-advisor-brochure-pr2", "Financial advisor brochure", "brochure-trifold-a4", BT + "trifold corporate finance financial advisor wealth pension business", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, e, tm } = k2;
    const P = W / 3, NV = "#0f2a44", TE = "#0f766e";
    const stats = [["98%", "of clients stay with us year after year"], ["$420M", "in savings and pensions we look after"], ["15", "years helping local families and firms"]];
    const stages = [["Starting out", "First pay cheque, first home, first pension. We help you build good habits early."], ["Growing family", "School fees, insurance and a plan that still leaves room for holidays."], ["Business owners", "Pay yourself well, cut tax the legal way and plan your exit."], ["Retirement", "Turn savings into a steady income that lasts as long as you do."]];
    const steps = [["Listen", "A free first meeting to understand your goals and worries."], ["Plan", "A written plan with clear numbers and no jargon."], ["Act", "We set up accounts, pensions and cover for you."], ["Review", "We meet every year, or sooner if life changes."]];
    const svc = [["icon-money", "Investments"], ["icon-lock", "Pensions"], ["icon-home", "Mortgages"], ["icon-users", "Family protection"], ["icon-document", "Tax planning"], ["icon-key", "Wills and inheritance"]];
    const outside = page(WHITE, [
      t("Why clients stay", 30, 44, P - 60, { size: 26, bold: true, color: NV }),
      ...stats.flatMap(([n, l], i) => [t(n, 30, 104 + i * 170, P - 60, { size: 52, bold: true, color: TE, lh: 1.1 }), t(l, 30, 166 + i * 170, P - 60, { size: 14, color: INK, lh: 1.4 }), i < 2 ? r(30, 236 + i * 170, P - 60, 1, "#e2e8f0", { name: "Rule" }) : null]),
      r(30, 640, P - 60, 100, "#f1f5f9", { radius: 12, name: "Note box" }),
      tm("Fee-only advice. No commissions, ever.", 46, 640, P - 92, 100, { size: 15, bold: true, color: NV, align: "center", lh: 1.35 }),
      t("Book a free 30-minute review", P + 30, 52, P - 60, { size: 24, bold: true, color: NV, align: "center", lh: 1.2 }),
      f(P + 30, 140, P - 60, 190, { shape: "rounded", radius: 12, name: "Office photo" }),
      ...iconRows(k2, [["icon-call", "555 0108"], ["icon-mail", "hello@clearpath.finance"], ["icon-location", "Suite 4, 18 Bank Street"], ["icon-clock", "Mon – Fri, 8:30 am – 5:30 pm"]], P + 40, 366, P - 80, 42, { c1: TE }),
      t("Clear Path Wealth Ltd is authorised and regulated. The value of investments can go down as well as up.", P + 30, 680, P - 60, { size: 11, color: MUTED, align: "center", lh: 1.45 }),
      r(2 * P, 0, P, H, NV, { name: "Cover panel" }),
      r(2 * P + 100, 520, 500, 500, TE, { rot: 30, name: "Diagonal block" }),
      e("arrow-growth", 2 * P + 40, 70, 90, { c1: "#5eead4" }),
      t("Clear Path\nWealth", 2 * P + 40, 170, P - 80, { size: 46, bold: true, color: WHITE, lh: 1.05 }),
      t("Independent financial planning for every stage of life", 2 * P + 40, 284, P - 80, { size: 16, color: "#cbd5e1", lh: 1.45 }),
      r(2 * P + 40, 370, 60, 4, "#5eead4", { name: "Rule" }),
      t("clearpath.finance", 2 * P + 40, 732, P - 80, { size: 16, bold: true, color: WHITE, align: "right" }),
    ]);
    const inside = page(WHITE, [
      t("Planning for every stage", 30, 44, P - 60, { size: 26, bold: true, color: NV, lh: 1.15 }),
      ...stages.flatMap(([hd, tx], i) => [r(30, 140 + i * 150, 6, 118, TE, { name: "Bar" }), t(hd, 50, 140 + i * 150, P - 80, { size: 17, bold: true, color: NV }), t(tx, 50, 166 + i * 150, P - 80, { size: 13, color: INK, lh: 1.5 })]),
      r(P, 0, P, H, "#f1f5f9", { name: "Process panel" }),
      t("Our process", P + 30, 44, P - 60, { size: 26, bold: true, color: NV }),
      r(P + 54, 130, 3, 450, TE, { name: "Line" }),
      ...steps.flatMap(([hd, tx], i) => [c(P + 30, 110 + i * 150, 50, 50, TE, { name: "Step" }), tm(String(i + 1), P + 30, 110 + i * 150, 50, 50, { size: 20, bold: true, color: WHITE, align: "center" }), t(hd, P + 96, 112 + i * 150, P - 126, { size: 17, bold: true, color: NV }), t(tx, P + 96, 138 + i * 150, P - 126, { size: 13, color: INK, lh: 1.5 })]),
      t("No jargon. No pressure.", P + 30, 700, P - 60, { size: 18, family: "serif", italic: true, bold: true, color: TE, align: "center" }),
      t("Services", 2 * P + 30, 44, P - 60, { size: 26, bold: true, color: NV }),
      ...svc.flatMap(([ic, l], i) => [e(ic, 2 * P + 30, 100 + i * 50, 28, { c1: TE }), tm(l, 2 * P + 72, 100 + i * 50, P - 102, 28, { size: 16, color: INK }), r(2 * P + 30, 140 + i * 50, P - 60, 1, "#e2e8f0", { name: "Rule" })]),
      f(2 * P + 30, 430, P - 60, 200, { shape: "rounded", radius: 12, name: "Team photo" }),
      t("The Clear Path team, from left: Omar, Ruth, Ben and Lina", 2 * P + 30, 644, P - 60, { size: 12, italic: true, color: MUTED, lh: 1.4 }),
    ]);
    return [outside, inside];
  });
  tpl("home-renovation-brochure-pr2", "Home renovation brochure", "brochure-trifold-letter", BT + "trifold home renovation builder construction kitchen bathroom contractor", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, f, e, tm, colm } = k2;
    const P = W / 3, CH = "#1f2937", YL = "#facc15";
    const svc = [["icon-home", "Kitchens", "Full refits, new worktops and clever storage for small spaces."], ["icon-settings", "Bathrooms", "Walk-in showers, tiling and underfloor heating."], ["icon-plus", "Extensions", "Single and double storey, from plans to paint."], ["icon-key", "Lofts", "Turn wasted roof space into a bedroom or office."]];
    const prices = [["Kitchen refit", "from $18,000", "4 – 6 weeks"], ["Bathroom refit", "from $9,500", "2 – 3 weeks"], ["Single extension", "from $45,000", "10 – 14 weeks"], ["Loft conversion", "from $38,000", "8 – 10 weeks"], ["Garden room", "from $16,000", "3 – 4 weeks"], ["Full redecoration", "from $6,000", "1 – 2 weeks"]];
    const outside = page(WHITE, [
      t("Before & after", 28, 44, P - 56, { size: 28, bold: true, color: CH }),
      f(28, 100, P - 56, 250, { shape: "rounded", radius: 10, name: "Before photo" }),
      r(42, 308, 92, 28, CH, { radius: 14, name: "Label" }), tm("BEFORE", 42, 308, 92, 28, { size: 12, bold: true, color: WHITE, align: "center", ls: 2 }),
      f(28, 380, P - 56, 250, { shape: "rounded", radius: 10, name: "After photo" }),
      r(42, 588, 80, 28, YL, { radius: 14, name: "Label" }), tm("AFTER", 42, 588, 80, 28, { size: 12, bold: true, color: CH, align: "center", ls: 2 }),
      t("Kitchen refit on Elm Street, finished in five weeks", 28, 650, P - 56, { size: 14, italic: true, color: "#4b5563", lh: 1.4 }),
      t("Get your free quote", P + 28, 50, P - 56, { size: 26, bold: true, color: CH, align: "center" }),
      t("We visit, measure and send a fixed price within 48 hours.", P + 28, 92, P - 56, { size: 14, color: INK, align: "center", lh: 1.5 }),
      e("badge-seal-check", P + 56, 168, 86, { c1: "#16a34a" }),
      e("badge-rosette", 2 * P - 142, 164, 86, { c1: "#ca8a04", c2: "#dc2626" }),
      t("Licensed and insured", P + 28, 270, 140, { size: 13, bold: true, color: CH, align: "center" }),
      t("10-year guarantee", 2 * P - 168, 270, 140, { size: 13, bold: true, color: CH, align: "center" }),
      ...iconRows(k2, [["icon-call", "555 0122"], ["icon-mail", "quotes@solidbuild.co"], ["icon-location", "Unit 7, Mill Yard, Leeds"]], P + 40, 336, P - 80, 40, { c1: CH }),
      f(P + P / 2 - 60, 486, 120, 120, { name: "QR code" }),
      t("Scan to see our project gallery", P + 28, 618, P - 56, { size: 13, color: "#4b5563", align: "center" }),
      r(P, 740, P, H - 740, YL, { name: "Footer" }),
      tm("solidbuild.co", P + 28, 740, P - 56, 64, { size: 18, bold: true, color: CH, align: "center" }),
      f(2 * P, 0, P, 470, { name: "Cover photo" }),
      r(2 * P, 470, P, 16, YL, { name: "Stripe" }),
      r(2 * P, 486, P, H - 486, CH, { name: "Cover base" }),
      t("SOLID BUILD", 2 * P + 28, 520, P - 56, { size: 16, bold: true, color: YL, ls: 6 }),
      t("Renovations\nthat last", 2 * P + 28, 550, P - 56, { size: 40, bold: true, color: WHITE, lh: 1.05 }),
      t("Kitchens · Bathrooms · Extensions · Loft conversions", 2 * P + 28, 654, P - 56, { size: 14, color: "#d1d5db", lh: 1.5 }),
      t("Family run since 1998", 2 * P + 28, 740, P - 56, { size: 13, bold: true, color: YL }),
    ]);
    const inside = page(WHITE, [
      t("What we do", 28, 44, P - 56, { size: 28, bold: true, color: CH }),
      ...svc.flatMap(([ic, n, tx], i) => {
        const y = 100 + i * 162;
        return [r(28, y, P - 56, 144, "#f9fafb", { radius: 12, stroke: "#e5e7eb", sw: 1, name: "Service card" }), e(ic, 44, y + 18, 34, { c1: CH }), tm(n, 92, y + 18, P - 136, 34, { size: 18, bold: true, color: CH }), t(tx, 44, y + 66, P - 88, { size: 13, color: INK, lh: 1.45 })];
      }),
      r(P, 0, P, H, CH, { name: "Price panel" }),
      t("Price guide", P + 28, 44, P - 56, { size: 28, bold: true, color: WHITE }),
      t("Typical prices for a 3-bed home. Your quote is fixed and free.", P + 28, 88, P - 56, { size: 13, color: "#d1d5db", lh: 1.45 }),
      ...prices.flatMap(([j, p, wk], i) => [t(j, P + 28, 156 + i * 72, P - 186, { size: 16, bold: true, color: WHITE }), t(p, 2 * P - 158, 156 + i * 72, 130, { size: 16, bold: true, color: YL, align: "right" }), t(wk, P + 28, 180 + i * 72, P - 186, { size: 12.5, color: "#9ca3af" }), r(P + 28, 212 + i * 72, P - 56, 1, "#374151", { name: "Rule" })]),
      r(P + 28, 620, P - 56, 120, YL, { radius: 12, name: "Finance box" }),
      colm(620, 120, t("Spread the cost", P + 40, 0, P - 80, { size: 18, bold: true, color: CH, align: "center" }), 4, t("0% finance over 12 months on jobs over $5,000", P + 40, 0, P - 80, { size: 13, color: CH, align: "center", lh: 1.4 })),
      t("Our promise", 2 * P + 28, 44, P - 56, { size: 28, bold: true, color: CH }),
      ...["Fixed price, no surprises", "Tidy site, every single day", "One project manager from start to finish", "Local trades we have used for years", "10-year written guarantee"].flatMap((s2, i) => [e("icon-check-circle", 2 * P + 28, 100 + i * 58, 28, { c1: "#16a34a" }), t(s2, 2 * P + 68, 102 + i * 58, P - 96, { size: 15, color: INK, lh: 1.35 })]),
      r(2 * P + 28, 410, P - 56, 210, "#fef9c3", { radius: 14, name: "Review box" }),
      t("“", 2 * P + 44, 420, 60, { size: 60, family: "serif", bold: true, color: "#a16207", lh: 1 }),
      t("They finished on time, on budget and left the house cleaner than they found it.", 2 * P + 44, 482, P - 88, { size: 15, family: "serif", italic: true, color: CH, lh: 1.45 }),
      t("— Sarah, Headingley", 2 * P + 44, 576, P - 88, { size: 13, bold: true, color: "#a16207" }),
      r(2 * P + 28, 660, P - 56, 70, CH, { radius: 35, name: "Call button" }),
      tm("Call 555 0122 today", 2 * P + 28, 660, P - 56, 70, { size: 18, bold: true, color: YL, align: "center" }),
    ]);
    return [outside, inside];
  });
  tpl("library-programmes-brochure-pr2", "Library programmes brochure", "brochure-trifold-letter", BT + "trifold library programmes school community kids teens adults reading", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, e, tm } = k2;
    const P = W / 3, TE = "#0f766e", OR = "#c2410c";
    const hours = [["Monday", "9 am – 8 pm"], ["Tuesday", "9 am – 8 pm"], ["Wednesday", "9 am – 6 pm"], ["Thursday", "9 am – 8 pm"], ["Friday", "9 am – 6 pm"], ["Saturday", "10 am – 4 pm"], ["Sunday", "Closed"]];
    const books = [[230, OR], [200, "#fde68a"], [240, "#fb7185"], [180, WHITE], [210, "#a7f3d0"]];
    const groups = [
      ["For kids", "Ages 0 – 11", "icon-star", OR, "#ffedd5", [["Story time", "Tue · Thu 10:30 am", "Songs, rhymes and picture books for little ones and their grown-ups."], ["Lego club", "Saturday 11 am", "Build to a new theme every week. All bricks provided."], ["Homework help", "Mon – Thu 4 – 6 pm", "Volunteer tutors for maths, reading and science."], ["Summer reading", "July – August", "Read six books, collect stickers and win a medal."]]],
      ["For teens", "Ages 12 – 18", "icon-wifi", TE, "#ccfbf1", [["Code club", "Wednesday 5 pm", "Make games and websites. Laptops provided."], ["Study space", "Daily after school", "Quiet room with free wifi and printing."], ["Manga and anime", "Friday 4:30 pm", "Read, draw and talk about your favourite series."], ["Job skills", "First Saturday", "CV help and mock interviews with local employers."]]],
      ["For adults", "Everyone welcome", "icon-users", "#6d28d9", "#ede9fe", [["Book club", "Last Thursday 7 pm", "One book a month, tea and friendly chat."], ["Digital help", "Tuesday 2 pm", "Phones, email and online forms, one to one."], ["English conversation", "Monday 6 pm", "Practise speaking in a relaxed group."], ["Local history talks", "Monthly", "Stories and old photos from the town's past."]]],
    ];
    const outside = page("#fffbeb", [
      t("Get your free library card", 28, 50, P - 56, { size: 26, bold: true, color: TE, lh: 1.15 }),
      ...[["Bring ID", "Any photo ID and something with your address."], ["Fill in one form", "It takes two minutes at the front desk."], ["Start borrowing", "Up to 15 books, films and games at a time."]].flatMap(([hd, tx], i) => [c(28, 150 + i * 150, 56, 56, OR, { name: "Step" }), tm(String(i + 1), 28, 150 + i * 150, 56, 56, { size: 24, bold: true, color: WHITE, align: "center" }), t(hd, 100, 154 + i * 150, P - 128, { size: 17, bold: true, color: INK }), t(tx, 100, 180 + i * 150, P - 128, { size: 13, color: "#44403c", lh: 1.45 })]),
      r(28, 600, P - 56, 130, "#ccfbf1", { radius: 14, name: "Note box" }),
      tm("Also free: wifi, printing (10 pages a day) and study rooms.", 44, 600, P - 88, 130, { size: 14, bold: true, color: TE, align: "center", lh: 1.45 }),
      t("Opening hours", P + 28, 50, P - 56, { size: 24, bold: true, color: TE }),
      ...hours.flatMap(([d, hr], i) => [i % 2 ? null : r(P + 20, 92 + i * 40, P - 40, 36, "#f5f0e1", { radius: 8, name: "Row" }), tm(d, P + 32, 92 + i * 40, 140, 36, { size: 15, color: INK }), tm(hr, P + 172, 92 + i * 40, P - 204, 36, { size: 15, bold: true, color: INK, align: "right" })]),
      f(P + 28, 400, P - 56, 200, { shape: "rounded", radius: 12, name: "Map" }),
      t("Westbrook Library\n12 Church Street, Westbrook\n555 0111 · westbrooklibrary.org", P + 28, 620, P - 56, { size: 14, color: INK, lh: 1.5 }),
      r(2 * P, 0, P, H, TE, { name: "Cover panel" }),
      t("WESTBROOK LIBRARY", 2 * P + 28, 66, P - 56, { size: 14, bold: true, color: WHITE, ls: 4 }),
      t("Read,\nMake,\nMeet.", 2 * P + 28, 104, P - 56, { size: 60, bold: true, color: WHITE, lh: 1 }),
      t("Free programmes for every age · Autumn 2026", 2 * P + 28, 300, P - 56, { size: 16, color: "#ccfbf1", lh: 1.45 }),
      ...books.flatMap(([bw, col], i) => { const x = 2 * P + P / 2 - bw / 2 + (i % 2 ? 10 : -10), y = 662 - i * 36; return [r(x, y, bw, 34, col, { radius: 4, name: "Book" }), r(x + 24, y + 13, bw - 48, 6, TE, { op: 0.25, radius: 3, name: "Book title" })]; }),
      r(2 * P + 40, 696, P - 80, 8, "#134e4a", { radius: 4, name: "Shelf" }),
      t("westbrooklibrary.org", 2 * P + 28, 740, P - 56, { size: 15, bold: true, color: WHITE, align: "center" }),
    ]);
    const inside = page(WHITE, groups.flatMap(([title, ages, ic, col, soft, items], g) => {
      const x0 = g * P;
      return [
        r(x0, 0, P, 150, col, { name: "Header" }),
        e(ic, x0 + 28, 46, 42, { c1: WHITE }),
        t(title, x0 + 84, 42, P - 112, { size: 28, bold: true, color: WHITE }),
        t(ages, x0 + 84, 80, P - 112, { size: 14, color: WHITE }),
        ...items.flatMap(([n, when, tx], i) => {
          const y = 180 + i * 142;
          return [t(n, x0 + 28, y, P - 56, { size: 18, bold: true, color: INK }), r(x0 + 28, y + 30, 180, 26, soft, { radius: 13, name: "Time chip" }), tm(when, x0 + 28, y + 30, 180, 26, { size: 12, bold: true, color: col, align: "center" }), t(tx, x0 + 28, y + 66, P - 56, { size: 13, color: "#44403c", lh: 1.45 })];
        }),
      ];
    }));
    return [outside, inside];
  });
  tpl("spa-salon-brochure-pr2", "Spa and salon brochure", "brochure-trifold-letter", BT + "trifold spa salon beauty massage facial wellness price list", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, f, e } = k2;
    const P = W / 3, DK = "#2f3a30", SG = "#5f7a64", SGD = "#4b6350", GD = "#a67c52", GDT = "#7a5530", BG = "#f4efe6";
    const menus = [
      ["Massage", [["Swedish massage", "$75", "60 min · Long, flowing strokes to ease tension."], ["Deep tissue", "$85", "60 min · Firm pressure for tight muscles."], ["Hot stones", "$95", "75 min · Warm stones melt stress away."], ["Neck and shoulders", "$45", "30 min · A quick reset for desk days."], ["Pregnancy massage", "$80", "60 min · Side-lying comfort for mums to be."], ["Reflexology", "$55", "45 min · Pressure points for whole-body calm."]]],
      ["Facials", [["Signature facial", "$70", "60 min · Cleanse, mask and a face massage."], ["Hydrating facial", "$80", "60 min · For dry or tired skin."], ["Express glow", "$40", "30 min · A fast refresh before an event."], ["Teen facial", "$45", "45 min · Gentle care for young skin."], ["Brow shape and tint", "$25", "20 min · A clean, natural shape."], ["Lash lift", "$55", "45 min · Lifted lashes for six weeks."]]],
      ["Hair and nails", [["Cut and finish", "$55", "Wash, cut and blow-dry."], ["Colour from", "$85", "Full colour or roots, with a gloss."], ["Balayage from", "$140", "Soft, sun-kissed highlights."], ["Classic manicure", "$30", "Shape, cuticle care and polish."], ["Gel pedicure", "$45", "Lasts up to three weeks."], ["Bridal hair trial", "$70", "Try your look before the big day."]]],
    ];
    const outside = page(BG, [
      t("Give the gift of calm", 28, 56, P - 56, { size: 28, family: "serif", bold: true, color: DK, lh: 1.15 }),
      r(48, 166, P - 96, 160, SGD, { radius: 14, name: "Gift card" }),
      r(48 + (P - 96) * 0.7, 166, 18, 160, GD, { name: "Ribbon" }),
      r(48, 238, P - 96, 16, GD, { name: "Ribbon" }),
      t("GIFT CARD", 68, 186, 150, { size: 13, bold: true, color: WHITE, ls: 3 }),
      t("$100", 68, 272, 150, { size: 30, bold: true, color: WHITE }),
      t("Any amount, any treatment. Valid for 12 months. Buy online or at the desk.", 28, 366, P - 56, { size: 14, color: INK, lh: 1.5 }),
      t("Packages", 28, 470, P - 56, { size: 22, family: "serif", bold: true, color: DK }),
      ...[["Half day of calm", "$160"], ["Couples retreat", "$290"], ["Bride to be", "$220"]].flatMap(([n, p], i) => [t(n, 28, 512 + i * 44, P - 162, { size: 15, color: INK }), t(p, P - 128, 512 + i * 44, 100, { size: 15, bold: true, color: GDT, align: "right" }), r(28, 544 + i * 44, P - 56, 1, "#d6cfc2", { name: "Rule" })]),
      t("Every package includes tea and the relaxation lounge.", 28, 664, P - 56, { size: 12.5, italic: true, color: "#57534e", lh: 1.4 }),
      t("Book your visit", P + 28, 56, P - 56, { size: 28, family: "serif", bold: true, color: DK, align: "center" }),
      ...iconRows(k2, [["icon-call", "555 0133"], ["icon-mail", "relax@stillwater.spa"], ["icon-location", "3 Willow Walk, Bath"], ["icon-clock", "Tue – Sun, 9 am – 8 pm"]], P + 40, 120, P - 80, 40, { c1: SG }),
      f(P + 28, 300, P - 56, 230, { shape: "rounded", radius: 14, name: "Spa interior photo" }),
      t("Please arrive 10 minutes early so you can settle in. We ask for 24 hours notice to change a booking.", P + 28, 556, P - 56, { size: 13, color: "#57534e", align: "center", lh: 1.5 }),
      e("deco-sprig", P + P / 2 - 40, 652, 80, { c1: "#9fb5a2", c2: SG }),
      r(2 * P + 44, 48, P - 88, 444, "none", { stroke: GD, sw: 1.5, radius: 132, name: "Outline" }),
      f(2 * P + 56, 60, P - 112, 420, { shape: "rounded", radius: 120, name: "Cover photo" }),
      t("Still Water", 2 * P + 28, 516, P - 56, { size: 44, family: "serif", color: DK, align: "center" }),
      t("SPA · SALON · WELLNESS", 2 * P + 28, 580, P - 56, { size: 13, bold: true, color: GDT, align: "center", ls: 4 }),
      e("line-ornament", 2 * P + P / 2 - 70, 614, 140, { c1: GD }),
      t("Slow down. Breathe. Be looked after.", 2 * P + 28, 656, P - 56, { size: 16, family: "serif", italic: true, color: "#4b5a4d", align: "center" }),
      t("stillwater.spa", 2 * P + 28, 750, P - 56, { size: 14, bold: true, color: SGD, align: "center" }),
    ]);
    const inside = page(BG, [
      r(P, 0, P, H, SGD, { name: "Middle panel" }),
      ...menus.flatMap(([title, items], g) => {
        const x0 = g * P, mid = g === 1;
        const nameC = mid ? WHITE : DK, priceC = mid ? "#f5deb3" : GDT, descC = mid ? "#e7efe8" : "#57534e";
        return [
          f(x0 + 28, 40, P - 56, 150, { shape: "rounded", radius: 12, name: title + " photo" }),
          t(title, x0 + 28, 212, P - 56, { size: 28, family: "serif", bold: true, color: nameC }),
          r(x0 + 28, 256, 40, 2, mid ? "#f5deb3" : GD, { name: "Rule" }),
          ...items.flatMap(([n, p, d], i) => [t(n, x0 + 28, 280 + i * 72, P - 162, { size: 16, bold: true, color: nameC }), t(p, x0 + P - 128, 280 + i * 72, 100, { size: 16, bold: true, color: priceC, align: "right" }), t(d, x0 + 28, 304 + i * 72, P - 56, { size: 12.5, color: descC, lh: 1.4 })]),
        ];
      }),
    ]);
    return [outside, inside];
  });

  /* ---------- Bi-fold Letter (fold at W/2) ---------- */
  tpl("bistro-menu-brochure-pr2", "Bistro menu brochure", "brochure-bifold-letter", BT + "bifold menu restaurant bistro french food wine dinner", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, f, e, tm } = k2;
    const P = W / 2, GR = "#1f3b2d", GD = "#c9a227", CR = "#f6f1e7", PR = "#7a5c12";
    const dish = (x, y, w, [n, p, d]) => [t(n, x, y, w - 70, { size: 16, bold: true, color: INK }), t(p, x + w - 60, y, 60, { size: 16, bold: true, color: PR, align: "right" }), t(d, x, y + 22, w - 70, { size: 12.5, italic: true, color: "#57534e" })];
    const head = (x, y, w, s2) => [t(s2, x, y, w, { size: 30, family: "serif", italic: true, bold: true, color: GR, align: "center" }), e("line-diamonds", x + w / 2 - 60, y + 42, 120, { c1: GD })];
    const starters = [["French onion soup", "11", "Slow-cooked onions, gruyère crouton"], ["Goat's cheese tart", "13", "Caramelised shallots, walnut salad"], ["Chicken liver pâté", "12", "Toasted brioche, cornichons, fig jam"], ["Moules marinière", "15", "White wine, garlic, parsley, cream"], ["Heritage tomato salad", "10", "Basil oil, sea salt, sourdough crumb"]];
    const mains = [["Steak frites", "29", "Bavette, peppercorn sauce, skinny fries"], ["Duck confit", "26", "Puy lentils, red cabbage, orange jus"], ["Sea bass", "27", "Crushed potatoes, samphire, beurre blanc"], ["Mushroom risotto", "21", "Wild mushrooms, truffle, aged parmesan"], ["Coq au vin", "24", "Red wine, smoked bacon, buttery mash"]];
    const desserts = [["Crème brûlée", "9", "Vanilla custard, burnt sugar"], ["Tarte Tatin", "10", "Apples, salted caramel, crème fraîche"], ["Chocolate fondant", "10", "Hot centre, vanilla ice cream"], ["Cheese board", "14", "Three French cheeses, chutney, crackers"]];
    const wines = [["House red, Languedoc", "7", "28"], ["House white, Picpoul", "7", "28"], ["Côtes du Rhône", "9", "36"], ["Sancerre", "12", "48"], ["Rosé, Provence", "9", "36"], ["Crémant de Loire", "10", "42"]];
    const outside = page(CR, [
      f(40, 40, P - 80, 300, { shape: "rounded", radius: 12, name: "Dining room photo" }),
      t("Private dining", 40, 370, P - 80, { size: 26, family: "serif", bold: true, color: GR }),
      t("Our upstairs room seats up to 24 guests for birthdays, rehearsal dinners and work parties. Set menus from $55 a head.", 40, 410, P - 80, { size: 14, color: INK, lh: 1.5 }),
      t("Opening hours", 40, 500, 210, { size: 18, family: "serif", bold: true, color: GR }),
      t("Tue – Thu  5 – 10 pm\nFri – Sat  12 – 11 pm\nSunday  12 – 4 pm", 40, 530, 220, { size: 13.5, color: INK, lh: 1.6 }),
      t("Reservations", 280, 500, 208, { size: 18, family: "serif", bold: true, color: GR }),
      t("555 0177\nbook@maisonverte.co\nWalk-ins welcome at the bar", 280, 530, 208, { size: 13.5, color: INK, lh: 1.6 }),
      r(40, 650, P - 80, 100, "#e9e2d3", { radius: 10, name: "Allergy note" }),
      tm("Please tell us about any allergies. Most dishes can be made gluten-free or vegetarian.", 60, 650, P - 120, 100, { size: 13.5, italic: true, color: GR, align: "center", lh: 1.45 }),
      r(P, 0, P, H, GR, { name: "Cover panel" }),
      r(P + 30, 30, P - 60, H - 60, "none", { stroke: GD, sw: 1.5, name: "Border" }),
      e("deco-sprig", P + P / 2 - 40, 140, 80, { c1: GD, c2: "#a3b18a" }),
      t("MAISON", P + 60, 246, P - 120, { size: 22, bold: true, color: GD, align: "center", ls: 12 }),
      t("Verte", P + 60, 278, P - 120, { size: 96, family: "serif", italic: true, color: CR, align: "center", lh: 1 }),
      e("line-ornament", P + P / 2 - 90, 392, 180, { c1: GD }),
      t("BISTRO · WINE BAR", P + 60, 436, P - 120, { size: 15, bold: true, color: CR, align: "center", ls: 6 }),
      t("Seasonal French cooking since 2009", P + 60, 474, P - 120, { size: 17, family: "serif", italic: true, color: "#d9e4d6", align: "center" }),
      t("14 Market Lane · maisonverte.co", P + 60, 716, P - 120, { size: 14, color: CR, align: "center" }),
    ]);
    const inside = page(CR, [
      ...head(50, 40, P - 100, "Starters"),
      ...starters.flatMap((d, i) => dish(50, 118 + i * 56, P - 100, d)),
      ...head(50, 412, P - 100, "Mains"),
      ...mains.flatMap((d, i) => dish(50, 490 + i * 56, P - 100, d)),
      r(P, 0, P, H, "#efe8da", { name: "Right panel" }),
      ...head(P + 50, 40, P - 100, "Desserts"),
      ...desserts.flatMap((d, i) => dish(P + 50, 118 + i * 56, P - 100, d)),
      ...head(P + 50, 372, P - 100, "Wine and drinks"),
      t("GLASS", P + 278, 446, 70, { size: 11, bold: true, color: "#57534e", align: "right", ls: 2 }),
      t("BOTTLE", P + 358, 446, 70, { size: 11, bold: true, color: "#57534e", align: "right", ls: 2 }),
      ...wines.flatMap(([n, g, b], i) => [t(n, P + 50, 472 + i * 38, 220, { size: 14.5, color: INK }), t(g, P + 278, 472 + i * 38, 70, { size: 14.5, bold: true, color: PR, align: "right" }), t(b, P + 358, 472 + i * 38, 70, { size: 14.5, bold: true, color: PR, align: "right" }), r(P + 50, 500 + i * 38, P - 100, 1, "#d8cfbd", { name: "Rule" })]),
      t("Fresh lemonade 4 · Espresso 3 · Pot of tea 3", P + 50, 716, P - 100, { size: 13.5, italic: true, color: GR, align: "center" }),
    ]);
    return [outside, inside];
  });
  tpl("conference-programme-brochure-pr2", "Conference programme brochure", "brochure-bifold-letter", BT + "bifold corporate conference programme agenda event speakers schedule", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, e, tm } = k2;
    const P = W / 2, DK = "#1e1b4b", AC = "#4f46e5", SOFT = "#eef2ff";
    const sched = [["8:30", "Registration and coffee", "Main foyer"], ["9:15", "Opening keynote: Work in 2030", "Hall A · Dr Maya Lin"], ["10:30", "Panel: Hybrid teams that work", "Hall A"], ["12:00", "Lunch and expo", "Atrium"], ["1:30", "Breakout sessions", "Rooms 1 – 4, see right"], ["3:00", "Workshop: Calm meetings", "Room 2 · Leo Grant"], ["4:30", "Fireside chat", "Hall A · Ana Duarte"], ["6:00", "Drinks on the terrace", "Level 3"]];
    const spk = [["Dr Maya Lin", "Futurist, Northlake University"], ["Leo Grant", "Author, Calm Meetings"], ["Ana Duarte", "CEO, Brightdesk"], ["Sam Okoye", "Head of People, Kiteworks"], ["Rita Haddad", "Founder, Remote First"], ["Tom Ferris", "Workplace designer"]];
    const rooms = [["Room 1", "AI tools for small teams"], ["Room 2", "Leading through change"], ["Room 3", "Designing better offices"], ["Room 4", "Wellbeing that sticks"]];
    const outside = page(WHITE, [
      t("Sponsors", 40, 40, P - 80, { size: 22, bold: true, color: DK }),
      ...Array.from({ length: 6 }, (_, i) => f(40 + (i % 3) * 152, 80 + Math.floor(i / 3) * 90, 140, 70, { shape: "rounded", radius: 8, name: "Sponsor logo" })),
      t("Venue map", 40, 286, P - 80, { size: 22, bold: true, color: DK }),
      f(40, 324, P - 80, 260, { shape: "rounded", radius: 12, name: "Venue map" }),
      r(40, 610, 214, 140, SOFT, { radius: 12, name: "Wifi box" }),
      e("icon-wifi", 58, 628, 30, { c1: AC }), tm("Wi-Fi", 100, 628, 140, 30, { size: 16, bold: true, color: DK }),
      t("Network: FWF2026\nPassword: thinkahead", 58, 672, 180, { size: 13, color: INK, lh: 1.45 }),
      r(274, 610, 214, 140, SOFT, { radius: 12, name: "App box" }),
      e("icon-mobile", 292, 628, 30, { c1: AC }), tm("Event app", 334, 628, 140, 30, { size: 16, bold: true, color: DK }),
      t("Live agenda, maps and Q&A. Search FWF in your app store.", 292, 672, 180, { size: 13, color: INK, lh: 1.45 }),
      r(P, 0, P, H, DK, { name: "Cover panel" }),
      c(P + 260, -120, 380, 380, "#6366f1", { op: 0.5, name: "Circle" }),
      c(P + 290, 520, 340, 340, "#f97316", { op: 0.85, name: "Circle" }),
      t("FUTUREWORK", P + 50, 226, P - 100, { size: 20, bold: true, color: "#a5b4fc", ls: 8 }),
      t("Forum\n2026", P + 50, 260, P - 100, { size: 96, bold: true, color: WHITE, lh: 0.95 }),
      t("Programme · 12 – 13 March · Riverside Convention Centre", P + 50, 470, 300, { size: 16, color: "#e0e7ff", lh: 1.5 }),
      t("futureworkforum.com", P + 50, 740, 300, { size: 14, bold: true, color: "#a5b4fc" }),
    ]);
    const inside = page(WHITE, [
      r(0, 0, P, 110, DK, { name: "Header" }),
      t("Day one · Thursday 12 March", 40, 40, P - 80, { size: 24, bold: true, color: WHITE }),
      r(125, 150, 2, 520, "#c7d2fe", { name: "Timeline" }),
      ...sched.flatMap(([tm2, ti, meta], i) => [t(tm2, 40, 140 + i * 72, 70, { size: 14, bold: true, color: AC }), c(120, 143 + i * 72, 12, 12, AC, { name: "Dot" }), t(ti, 150, 140 + i * 72, P - 190, { size: 15, bold: true, color: INK }), t(meta, 150, 161 + i * 72, P - 190, { size: 12.5, color: "#4b5563" })]),
      t("Day two runs 9 am – 4 pm. Full times are in the event app.", 40, 728, P - 80, { size: 13, italic: true, color: "#4b5563" }),
      t("Speakers", P + 40, 40, P - 80, { size: 28, bold: true, color: DK }),
      ...spk.flatMap(([n, ro], i) => {
        const x = P + 40 + (i % 3) * 152, y = 96 + Math.floor(i / 3) * 226;
        return [c(x + 20, y, 100, 100, "#e0e7ff", { name: "Photo ring" }), f(x + 26, y + 6, 88, 88, { shape: "circle", name: "Speaker photo" }), t(n, x, y + 112, 140, { size: 15, bold: true, color: INK, align: "center" }), t(ro, x, y + 134, 140, { size: 12, color: "#4b5563", align: "center", lh: 1.35 })];
      }),
      t("Breakout rooms · 1:30 pm", P + 40, 556, P - 80, { size: 17, bold: true, color: DK }),
      ...rooms.flatMap(([rm, top], i) => [r(P + 40, 588 + i * 38, P - 80, 32, i % 2 ? WHITE : SOFT, { radius: 6, name: "Room row" }), tm(rm, P + 52, 588 + i * 38, 86, 32, { size: 13, bold: true, color: AC }), tm(top, P + 150, 588 + i * 38, P - 200, 32, { size: 13, color: INK })]),
    ]);
    return [outside, inside];
  });
  tpl("property-listing-brochure-pr2", "Property listing brochure", "brochure-bifold-letter", BT + "bifold real estate property listing house for sale home agent floor plan", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, colm } = k2;
    const P = W / 2, NV = "#0b2545", SAND = "#f5efe6", GDT = "#7a5a22";
    const facts = [["4", "bedrooms"], ["3", "bathrooms"], ["2", "garage"], ["720", "sqm land"]];
    const rooms = [["Kitchen and dining", "6.2 × 5.1 m"], ["Living room", "5.8 × 4.4 m"], ["Main bedroom and ensuite", "4.6 × 4.0 m"], ["Bedrooms 2 – 4", "3.6 × 3.2 m"], ["Deck", "8.0 × 3.5 m"], ["Double garage", "6.0 × 6.0 m"]];
    const outside = page(WHITE, [
      t("Inspection times", 40, 44, P - 80, { size: 22, bold: true, color: NV }),
      ...[["Saturday 14 March", "11:00 – 11:45 am"], ["Wednesday 18 March", "5:30 – 6:00 pm"], ["Or by private appointment", ""]].flatMap(([d, tm2], i) => [t(d, 40, 84 + i * 34, 250, { size: 14, color: INK }), tm2 ? t(tm2, 300, 84 + i * 34, 188, { size: 14, bold: true, color: NV, align: "right" }) : null]),
      f(40, 196, P - 80, 260, { shape: "rounded", radius: 10, name: "Location map" }),
      t("Nearby", 40, 478, P - 80, { size: 18, bold: true, color: NV }),
      t("Beach 400 m · Seacliff Primary 700 m · Train station 1.2 km · Village shops 5 minutes on foot", 40, 506, P - 80, { size: 13.5, color: INK, lh: 1.5 }),
      r(40, 590, P - 80, 160, SAND, { radius: 12, name: "Agent card" }),
      c(58, 610, 124, 124, NV, { name: "Photo ring" }),
      f(64, 616, 112, 112, { shape: "circle", name: "Agent photo" }),
      t("Grace Liu", 204, 618, 270, { size: 22, bold: true, color: NV }),
      t("Sales agent, Harbour & Co.", 204, 648, 270, { size: 13, color: "#4b5563" }),
      t("555 0189\ngrace@harbourco.homes", 204, 676, 270, { size: 14, bold: true, color: NV, lh: 1.5 }),
      f(P, 0, P, 560, { name: "Front of house photo" }),
      r(P, 560, P, H - 560, NV, { name: "Cover base" }),
      r(P + 40, 480, P - 80, 170, WHITE, { radius: 4, name: "Address card" }),
      t("FOR SALE", P + 64, 500, 200, { size: 13, bold: true, color: GDT, ls: 4 }),
      t("18 Harbour View Road", P + 64, 522, P - 128, { size: 28, bold: true, color: NV }),
      t("Seacliff · 4 bed · 3 bath · double garage", P + 64, 564, P - 128, { size: 14, color: "#4b5563" }),
      t("Offers over $1,250,000", P + 64, 598, P - 128, { size: 20, bold: true, color: GDT }),
      t("HARBOUR & CO. REAL ESTATE", P + 40, 694, P - 80, { size: 13, bold: true, color: "#e8d5b0", ls: 4 }),
      t("harbourco.homes", P + 40, 722, P - 80, { size: 15, color: WHITE }),
    ]);
    const inside = page(WHITE, [
      t("A light-filled family home with sea views", 40, 40, P - 80, { size: 28, family: "serif", bold: true, color: NV, lh: 1.15 }),
      t("Set on a quiet street above the bay, this four-bedroom home has a new kitchen, oak floors and a sunny deck that catches the afternoon light. There is room for everyone, and a double garage for the boat or bikes.", 40, 120, P - 80, { size: 14, color: INK, lh: 1.55 }),
      ...facts.flatMap(([n, l], i) => [r(40 + i * 116, 258, 104, 92, SAND, { radius: 10, name: "Fact tile" }), colm(258, 92, t(n, 40 + i * 116, 0, 104, { size: 28, bold: true, color: NV, align: "center", lh: 1.1 }), t(l, 40 + i * 116, 0, 104, { size: 12.5, color: "#4b5563", align: "center" }))]),
      f(40, 380, 214, 170, { shape: "rounded", radius: 8, name: "Kitchen photo" }),
      f(274, 380, 214, 170, { shape: "rounded", radius: 8, name: "Living room photo" }),
      f(40, 570, P - 80, 180, { shape: "rounded", radius: 8, name: "Deck photo" }),
      r(P, 0, P, H, SAND, { name: "Plan panel" }),
      t("Floor plan", P + 40, 40, P - 80, { size: 24, bold: true, color: NV }),
      f(P + 40, 82, P - 80, 300, { name: "Floor plan" }),
      t("Room by room", P + 40, 406, P - 80, { size: 20, bold: true, color: NV }),
      ...rooms.flatMap(([rm, sz], i) => [t(rm, P + 40, 442 + i * 30, 270, { size: 13.5, color: INK }), t(sz, P + P - 190, 442 + i * 30, 150, { size: 13.5, bold: true, color: NV, align: "right" })]),
      t("Also included", P + 40, 632, P - 80, { size: 16, bold: true, color: NV }),
      t("Heat pump · double glazing · solar panels · fibre broadband · garden watering system", P + 40, 658, P - 80, { size: 13.5, color: INK, lh: 1.5 }),
      t("Rates $3,240 a year · Land 720 sqm · Built 2004, renovated 2023", P + 40, 730, P - 80, { size: 12, italic: true, color: "#57534e" }),
    ]);
    return [outside, inside];
  });
  tpl("ceremony-programme-brochure-pr2", "Wedding ceremony programme", "brochure-bifold-letter", BT + "bifold wedding ceremony programme order of service wedding party", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, e, tm } = k2;
    const P = W / 2, INK2 = "#2d2a26", MUT = "#6b6259", SG = "#4f6f55", GD = "#a07d4a", CR = "#f7f4ef";
    const order = [["PROCESSIONAL", "Canon in D, played by the Elm String Quartet"], ["WELCOME", "Reverend Alice Moore"], ["READING", "‘Love is patient’ read by Hannah, sister of the bride"], ["VOWS", "Written by Nadia and Samuel"], ["EXCHANGE OF RINGS", "Ring bearer: Leo, nephew of the groom"], ["PRONOUNCEMENT", "Husband and wife"], ["RECESSIONAL", "‘Here Comes the Sun’"]];
    const party = [["MAID OF HONOUR", "Hannah Reyes", "BEST MAN", "Daniel Brooks"], ["BRIDESMAIDS", "Ella Tan\nZoe Park\nMia Cole", "GROOMSMEN", "Omar Aziz\nJake Hill\nBen Ward"], ["FLOWER GIRL", "Lily Reyes", "RING BEARER", "Leo Brooks"], ["PARENTS OF THE BRIDE", "Rosa and Miguel Reyes", "PARENTS OF THE GROOM", "Clare and Peter Brooks"]];
    const outside = page(CR, [
      t("Thank you", 60, 110, P - 120, { size: 44, family: "serif", italic: true, color: INK2, align: "center" }),
      t("for being part of our day. Your love and support mean the world to us, and we are so glad you are here.", 80, 182, P - 160, { size: 15, family: "serif", color: MUT, align: "center", lh: 1.6 }),
      e("icon-heart", P / 2 - 14, 290, 28, { c1: "#c98b8b" }),
      r(80, 346, P - 160, 1, SG, { name: "Rule" }),
      t("Reception", 60, 372, P - 120, { size: 26, family: "serif", bold: true, color: INK2, align: "center" }),
      t("Join us at The Orangery, 2 Mill Lane, from 4 pm for dinner, speeches and dancing.", 80, 414, P - 160, { size: 15, color: INK2, align: "center", lh: 1.55 }),
      t("Shuttle buses leave the chapel at 3:30 pm.", 80, 496, P - 160, { size: 13.5, italic: true, color: MUT, align: "center" }),
      r(P / 2 - 120, 576, 240, 46, SG, { radius: 23, name: "Hashtag pill" }),
      tm("#NadiaAndSam", P / 2 - 120, 576, 240, 46, { size: 16, bold: true, color: WHITE, align: "center" }),
      t("Share your photos with us", 60, 636, P - 120, { size: 13, color: MUT, align: "center" }),
      r(P + 30, 30, P - 60, H - 60, "none", { stroke: SG, sw: 1, name: "Border" }),
      e("deco-flower", P + P / 2 - 60, 86, 120, { c1: "#e8c4c4", c2: "#8fb08f" }),
      t("The wedding of", P + 60, 240, P - 120, { size: 20, family: "serif", italic: true, color: MUT, align: "center" }),
      t("Nadia\n&\nSamuel", P + 60, 278, P - 120, { size: 64, family: "serif", color: INK2, align: "center", lh: 1.05 }),
      e("line-ornament", P + P / 2 - 90, 502, 180, { c1: GD }),
      t("Saturday 20 June 2026", P + 60, 544, P - 120, { size: 18, family: "serif", bold: true, color: INK2, align: "center" }),
      t("St Anne's Garden Chapel · 2 pm", P + 60, 574, P - 120, { size: 15, color: MUT, align: "center" }),
      e("deco-sprig", P + P / 2 - 30, 636, 60, { c1: "#8fb08f", c2: SG }),
      t("Please switch off your phone and enjoy the moment with us", P + 80, 716, P - 160, { size: 12.5, italic: true, color: MUT, align: "center", lh: 1.4 }),
      t("N & S · 20 . 06 . 2026", 60, 730, P - 120, { size: 14, color: SG, align: "center", ls: 4 }),
    ]);
    const inside = page(WHITE, [
      t("Order of ceremony", 60, 44, P - 120, { size: 30, family: "serif", italic: true, color: INK2, align: "center" }),
      e("line-diamonds", P / 2 - 60, 92, 120, { c1: GD }),
      ...order.flatMap(([a, b], i) => [t(a, 60, 136 + i * 84, P - 120, { size: 13, bold: true, color: SG, align: "center", ls: 3 }), t(b, 70, 158 + i * 84, P - 140, { size: 15, family: "serif", color: INK2, align: "center", lh: 1.4 })]),
      r(P, 0, P, H, CR, { name: "Right panel" }),
      t("The wedding party", P + 60, 44, P - 120, { size: 30, family: "serif", italic: true, color: INK2, align: "center" }),
      e("line-diamonds", P + P / 2 - 60, 92, 120, { c1: GD }),
      ...party.flatMap(([r1, n1, r2, n2], i) => {
        const y = [136, 210, 330, 404][i];
        return [t(r1, P + 50, y, 204, { size: 12, bold: true, color: SG, align: "center", ls: 2, lh: 1.3 }), t(n1, P + 50, y + (r1.length > 16 ? 38 : 20), 204, { size: 15, family: "serif", color: INK2, align: "center", lh: 1.45 }),
          t(r2, P + 274, y, 204, { size: 12, bold: true, color: SG, align: "center", ls: 2, lh: 1.3 }), t(n2, P + 274, y + (r2.length > 16 ? 38 : 20), 204, { size: 15, family: "serif", color: INK2, align: "center", lh: 1.45 })];
      }),
      t("OFFICIANT", P + 60, 504, P - 120, { size: 12, bold: true, color: SG, align: "center", ls: 2 }),
      t("Reverend Alice Moore", P + 60, 524, P - 120, { size: 15, family: "serif", color: INK2, align: "center" }),
      r(P + 80, 600, P - 160, 130, WHITE, { radius: 12, stroke: "#e8c4c4", sw: 1.5, name: "Memory box" }),
      tm("In loving memory of Grandpa Joe, who is with us in spirit today.", P + 100, 600, P - 200, 130, { size: 14, family: "serif", italic: true, color: MUT, align: "center", lh: 1.5 }),
    ]);
    return [outside, inside];
  });

  /* ---------- Gate-fold Letter (folds at W/4 and 3W/4) ---------- */
  tpl("furniture-catalogue-brochure-pr2", "Furniture catalogue brochure", "brochure-gatefold-letter", BT + "gatefold furniture catalogue sale home decor shop products prices", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, e, tm, col, colm } = k2;
    const D = W / 4, OAK = "#7c5230", MOSS = "#3f5d3a", CR = "#f7f3ec", DK = "#2b2622";
    const product = (x, y, w, ph, n, d, p, was) => [f(x, y, w, ph, { shape: "rounded", radius: 10, name: n + " photo" }), t(n, x, y + ph + 12, w, { size: 16, bold: true, color: DK }), t(d, x, y + ph + 36, w, { size: 13, color: "#57534e" }), t(p, x, y + ph + 58, 96, { size: 20, bold: true, color: OAK }), was ? t(was, x + 100, y + ph + 63, w - 100, { size: 13, color: "#78716c" }) : null];
    const outside = page(CR, [
      f(0, 0, D, H, { name: "Cover photo" }),
      c(52, 560, 160, 160, OAK, { name: "Sale circle" }),
      colm(560, 160, t("UP TO", 62, 0, 140, { size: 14, bold: true, color: CR, align: "center", ls: 3 }), t("30%", 62, 0, 140, { size: 44, bold: true, color: WHITE, align: "center", lh: 1.05 }), t("OFF", 62, 0, 140, { size: 16, bold: true, color: CR, align: "center", ls: 3 })),
      t("Visit our showroom", D + 36, 56, 2 * D - 72, { size: 28, family: "serif", bold: true, color: DK }),
      f(D + 36, 110, 2 * D - 72, 260, { shape: "rounded", radius: 12, name: "Showroom photo" }),
      t("Showroom", D + 36, 396, 216, { size: 16, bold: true, color: MOSS }),
      t("22 Timber Yard\nHarrow Road, Bristol\nOpen daily 10 am – 6 pm", D + 36, 422, 216, { size: 13.5, color: INK, lh: 1.55 }),
      t("Delivery", D + 276, 396, 216, { size: 16, bold: true, color: MOSS }),
      t("Free delivery within 50 miles. White-glove setup and packaging taken away.", D + 276, 422, 216, { size: 13.5, color: INK, lh: 1.55 }),
      r(D + 36, 560, 2 * D - 72, 120, "#efe7da", { radius: 12, name: "Made to order box" }),
      colm(560, 120, t("Made to order in 6 weeks", D + 56, 0, 2 * D - 112, { size: 18, bold: true, color: DK, align: "center" }), 6, t("Choose your wood, fabric and size. Every piece has a 10-year guarantee.", D + 56, 0, 2 * D - 112, { size: 13.5, color: INK, align: "center", lh: 1.5 })),
      t("oakandmoss.co · 555 0166", D + 36, 716, 2 * D - 72, { size: 15, bold: true, color: MOSS, align: "center" }),
      r(3 * D, 0, D, H, MOSS, { name: "Front door" }),
      t("Oak\n& Moss", 3 * D + 28, 86, D - 56, { size: 52, family: "serif", bold: true, color: CR, lh: 1 }),
      r(3 * D + 28, 216, 50, 3, "#d9b98c", { name: "Rule" }),
      t("Autumn collection 2026", 3 * D + 28, 236, D - 56, { size: 18, family: "serif", italic: true, color: "#e7efe2", lh: 1.3 }),
      e("icon-leaf", 3 * D + 28, 330, 46, { c1: "#d9b98c" }),
      t("Sofas\nDining\nLighting\nRugs", 3 * D + 28, 412, D - 56, { size: 24, family: "serif", italic: true, color: "#e7efe2", lh: 1.6 }),
      t("Handmade furniture for real homes", 3 * D + 28, 690, D - 56, { size: 14, color: CR, lh: 1.45 }),
    ]);
    const extras = [["Marlow bench", "$420"], ["Ash dining chair", "$180"], ["Oak sideboard", "$1,150"], ["Pendant light", "$140"]];
    const inside = page(WHITE, [
      t("Sofas", 28, 44, D - 56, { size: 28, family: "serif", bold: true, color: DK }),
      ...product(28, 96, D - 56, 170, "The Hayes 3-seater", "Linen or velvet, 12 colours", "$1,490", "was $1,890"),
      ...product(28, 390, D - 56, 170, "The Ellis armchair", "Deep seat, solid oak legs", "$690", "was $860"),
      f(D + 28, 40, 2 * D - 56, 330, { shape: "rounded", radius: 12, name: "Room photo" }),
      t("The living room edit", D + 28, 394, 2 * D - 56, { size: 30, family: "serif", bold: true, color: DK }),
      t("Warm oak, soft linen and pieces made to be used every day.", D + 28, 438, 2 * D - 56, { size: 15, color: INK, lh: 1.5 }),
      ...[["Walnut side table", "$240"], ["Wool throw", "$85"], ["Linen cushions, pair", "$60"]].flatMap(([n, p], i) => [f(D + 28 + i * 160, 490, 144, 120, { shape: "rounded", radius: 8, name: n + " photo" }), col(622, t(n, D + 28 + i * 160, 0, 144, { size: 14, bold: true, color: DK, lh: 1.25 }), 2, t(p, D + 28 + i * 160, 0, 144, { size: 15, bold: true, color: OAK }))]),
      r(D + 28, 714, 2 * D - 56, 50, MOSS, { radius: 25, name: "Sale bar" }),
      tm("Sale ends 31 October · Shop at oakandmoss.co", D + 28, 714, 2 * D - 56, 50, { size: 14, bold: true, color: CR, align: "center" }),
      r(3 * D, 0, D, H, CR, { name: "Right flap" }),
      t("Dining", 3 * D + 28, 44, D - 56, { size: 28, family: "serif", bold: true, color: DK }),
      ...product(3 * D + 28, 96, D - 56, 250, "The Marlow table", "Solid oak, seats 6 to 8", "$1,950", ""),
      t("ALSO IN THE RANGE", 3 * D + 28, 490, D - 56, { size: 12, bold: true, color: MOSS, ls: 2 }),
      ...extras.flatMap(([n, p], i) => [t(n, 3 * D + 28, 518 + i * 38, 128, { size: 14, color: INK }), t(p, 3 * D + 160, 518 + i * 38, D - 188, { size: 14, bold: true, color: DK, align: "right" }), r(3 * D + 28, 546 + i * 38, D - 56, 1, "#e7dfd2", { name: "Rule" })]),
    ]);
    return [outside, inside];
  });
  tpl("impact-report-brochure-pr2", "Annual impact report brochure", "brochure-gatefold-letter", BT + "gatefold charity annual impact report nonprofit donors food bank volunteers", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, f, e, tm, colm } = k2;
    const D = W / 4, TE = "#0e7490", SUN = "#f59e0b", DK = "#0f172a", LT = "#ecfeff";
    const bars = [["Food and programmes", 0.82, TE, "82%"], ["Fundraising", 0.12, SUN, "12%"], ["Running costs", 0.06, "#64748b", "6%"]];
    const nums = [["148k", "meals served"], ["640", "volunteers"], ["2", "new pantries"], ["1,900", "families helped"], ["35%", "less food waste"], ["12", "partner schools"]];
    const help = [["icon-money", "Give monthly", "Just $10 a month stocks a shelf."], ["icon-users", "Volunteer", "Pack boxes or drive a route, two hours a week."], ["icon-cart", "Run a food drive", "At work, at school or where you worship."], ["icon-heart", "Tell a friend", "Share our story and follow us online."]];
    const outside = page(WHITE, [
      r(0, 0, D, H, SUN, { name: "Stat door" }),
      e("icon-heart", 28, 216, 56, { c1: DK }),
      t("12,400", 28, 290, D - 56, { size: 50, bold: true, color: DK }),
      t("meals served every month", 28, 354, D - 56, { size: 18, bold: true, color: DK, lh: 1.3 }),
      f(28, 470, D - 56, 290, { shape: "rounded", radius: 12, name: "Volunteer photo" }),
      t("A note from our director", D + 36, 52, 2 * D - 72, { size: 26, family: "serif", bold: true, color: DK }),
      t("This year more families than ever came through our doors. Thanks to 640 volunteers and thousands of donors, nobody was turned away.\n\nWe opened two new pantries, started a school breakfast club and cut food waste across the city by a third. None of it happens without you.", D + 36, 100, 2 * D - 72, { size: 14, color: INK, lh: 1.6 }),
      t("— Grace Mensah, Director", D + 36, 300, 2 * D - 72, { size: 14, bold: true, color: TE }),
      f(D + 36, 344, 2 * D - 72, 176, { shape: "rounded", radius: 12, name: "Team photo" }),
      r(D + 36, 548, 2 * D - 72, 200, TE, { radius: 16, name: "Donate box" }),
      t("Help us do more in 2026", D + 60, 570, 2 * D - 120, { size: 22, bold: true, color: WHITE }),
      t("$25 feeds a family for a week. Give at brightsidefood.org or text FEED to 70707.", D + 60, 606, 2 * D - 120, { size: 14, color: LT, lh: 1.5 }),
      r(D + 60, 676, 180, 46, SUN, { radius: 23, name: "Button" }),
      tm("Donate today", D + 60, 676, 180, 46, { size: 15, bold: true, color: DK, align: "center" }),
      t("Charity no. 1182004", D + 256, 690, 2 * D - 316, { size: 12, color: "#cffafe", align: "right" }),
      r(3 * D, 0, D, H, TE, { name: "Title door" }),
      t("2025", 3 * D + 28, 76, D - 56, { size: 60, bold: true, color: WHITE }),
      t("Impact\nReport", 3 * D + 28, 156, D - 56, { size: 40, bold: true, color: "#cffafe", lh: 1.05 }),
      r(3 * D + 28, 266, 50, 4, SUN, { name: "Rule" }),
      t("Brightside Food Network", 3 * D + 28, 288, D - 56, { size: 16, bold: true, color: WHITE, lh: 1.3 }),
      t("A year of feeding families, together", 3 * D + 28, 700, D - 56, { size: 14, italic: true, color: "#cffafe", lh: 1.4 }),
    ]);
    const inside = page(WHITE, [
      t("Where your money goes", 28, 44, D - 56, { size: 22, bold: true, color: DK, lh: 1.2 }),
      ...bars.flatMap(([l, p, col2, s2], i) => [t(l, 28, 140 + i * 110, D - 56, { size: 14, bold: true, color: INK }), r(28, 166 + i * 110, D - 56, 22, "#e2e8f0", { radius: 11, name: "Bar track" }), r(28, 166 + i * 110, (D - 56) * p, 22, col2, { radius: 11, name: "Bar" }), t(s2, 28, 194 + i * 110, D - 56, { size: 22, bold: true, color: i === 1 ? "#b45309" : col2 })]),
      t("For every $1 you give, 82 cents goes straight to food and families.", 28, 480, D - 56, { size: 15, family: "serif", italic: true, color: DK, lh: 1.45 }),
      t("Audited accounts at brightsidefood.org/reports", 28, 716, D - 56, { size: 12, color: "#475569", lh: 1.4 }),
      t("Our year in numbers", D + 28, 44, 2 * D - 56, { size: 30, bold: true, color: DK }),
      ...nums.flatMap(([n, l], i) => {
        const x = D + 28 + (i % 3) * 160, y = 100 + Math.floor(i / 3) * 150;
        return [r(x, y, 148, 136, LT, { radius: 14, name: "Number tile" }), colm(y, 136, t(n, x + 8, 0, 132, { size: 32, bold: true, color: TE, align: "center", lh: 1.1 }), t(l, x + 8, 0, 132, { size: 13, color: INK, align: "center", lh: 1.35 }))];
      }),
      ...[0, 1, 2].map((i) => f(D + 28 + i * 160, 420, 148, 176, { shape: "rounded", radius: 10, name: "Programme photo" })),
      t("Our volunteers at the Eastside pantry, the school breakfast club and the summer food truck.", D + 28, 610, 2 * D - 56, { size: 12.5, italic: true, color: "#475569", lh: 1.45 }),
      r(D + 28, 672, 2 * D - 56, 86, DK, { radius: 14, name: "Quote bar" }),
      tm("“We came for food and found a community.” — Amina, Eastside", D + 48, 672, 2 * D - 96, 86, { size: 15, family: "serif", italic: true, color: WHITE, align: "center", lh: 1.4 }),
      t("How you can help", 3 * D + 28, 44, D - 56, { size: 22, bold: true, color: DK, lh: 1.2 }),
      ...help.flatMap(([ic, hd, tx], i) => [e(ic, 3 * D + 28, 100 + i * 124, 32, { c1: TE }), t(hd, 3 * D + 28, 140 + i * 124, D - 56, { size: 16, bold: true, color: INK }), t(tx, 3 * D + 28, 162 + i * 124, D - 56, { size: 13, color: INK, lh: 1.4 })]),
      r(3 * D + 28, 618, D - 56, 132, SUN, { radius: 14, name: "Contact box" }),
      colm(618, 132, t("brightsidefood.org", 3 * D + 40, 0, D - 80, { size: 15, bold: true, color: DK, align: "center" }), 4, t("555 0100", 3 * D + 40, 0, D - 80, { size: 22, bold: true, color: DK, align: "center" })),
    ]);
    return [outside, inside];
  });
  tpl("national-park-guide-brochure-pr2", "National park visitor guide brochure", "brochure-gatefold-letter", BT + "gatefold travel national park visitor guide trails hiking camping map outdoors", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, s, f, e, tm, colm } = k2;
    const D = W / 4, FO = "#1f4d3a", RU = "#9a3412", CR = "#f7f3e8", AM = "#e9b949";
    const trails = [["Lakeshore Loop", "Easy · 3 km · 1 hour", "Flat path round the lake with two picnic spots.", "Buggy friendly"], ["Eagle Ridge", "Moderate · 7 km · 3 hours", "Forest climb to the best view of the valley.", "Good boots needed"], ["Summit Trail", "Hard · 12 km · 6 hours", "Steep, rocky and worth every step. Start early.", "Not for beginners"]];
    const spots = [["Visitor centre", "Maps, toilets, café"], ["Lakeshore beach", "Swimming in summer"], ["Picnic meadow", "Tables and grills"], ["Falls lookout", "Short wheelchair path"], ["Eagle Ridge", "Valley viewpoint"], ["Old fire tower", "Open weekends"], ["Pine Hollow camp", "42 pitches"], ["Pine Ridge summit", "1,412 m high"]];
    const tips = ["Take your rubbish home with you", "Keep dogs on a lead near wildlife", "Stay on marked paths", "Fires only in the fire pits", "Tell someone your route"];
    const outside = page(CR, [
      f(0, 0, D, H, { name: "Park photo" }),
      c(56, 600, 150, 150, AM, { name: "Entry badge" }),
      colm(600, 150, t("FREE ENTRY", 66, 0, 130, { size: 13, bold: true, color: FO, align: "center", ls: 2 }), t("every Sunday", 66, 0, 130, { size: 17, bold: true, color: FO, align: "center", lh: 1.2 })),
      t("Getting here", D + 36, 50, 2 * D - 72, { size: 26, family: "serif", bold: true, color: FO }),
      f(D + 36, 100, 2 * D - 72, 280, { shape: "rounded", radius: 12, name: "Area map" }),
      t("Forty minutes from the city on Route 9. The park bus runs hourly from Central Station on weekends.", D + 36, 396, 2 * D - 72, { size: 14, color: INK, lh: 1.5 }),
      t("Visitor centre", D + 36, 470, 2 * D - 72, { size: 22, bold: true, color: FO }),
      ...iconRows(k2, [["icon-clock", "Open daily, 8 am – 6 pm"], ["icon-call", "555 0147"], ["icon-globe", "pineridgepark.org"]], D + 36, 512, 2 * D - 72, 36, { c1: RU }),
      r(D + 36, 640, 2 * D - 72, 110, RU, { radius: 14, name: "Ranger box" }),
      colm(640, 110, t("Free ranger walks", D + 56, 0, 2 * D - 112, { size: 18, bold: true, color: WHITE, align: "center" }), 4, t("Saturdays at 10 am from the visitor centre. Birds, trees and tracks.", D + 56, 0, 2 * D - 112, { size: 14, color: "#ffedd5", align: "center", lh: 1.4 })),
      s("triangle", 3 * D + 14, 470, 150, 190, "#2f6b52", { name: "Pine" }),
      s("triangle", 3 * D + 90, 420, 150, 240, "#3d7f62", { name: "Pine" }),
      r(3 * D, 640, D, H - 640, FO, { name: "Door base" }),
      t("PINE RIDGE", 3 * D + 28, 66, D - 56, { size: 18, bold: true, color: RU, ls: 6 }),
      t("National\nPark", 3 * D + 28, 94, D - 56, { size: 50, family: "serif", bold: true, color: FO, lh: 1 }),
      t("Visitor guide · trails, camping and tips", 3 * D + 28, 214, D - 56, { size: 16, color: FO, lh: 1.4 }),
      t("Summer 2026", 3 * D + 28, 676, D - 56, { size: 17, bold: true, color: AM }),
      t("Keep this guide with you on the trail", 3 * D + 28, 708, D - 56, { size: 13.5, color: WHITE, lh: 1.4 }),
    ]);
    const inside = page(CR, [
      t("Choose your trail", 28, 44, D - 56, { size: 22, bold: true, color: FO }),
      ...trails.flatMap(([n, meta, d, note], i) => {
        const y = 96 + i * 214, dark = i === 1;
        return [r(28, y, D - 56, 196, dark ? FO : WHITE, { radius: 14, stroke: "#e2dccb", sw: 1, name: "Trail card" }),
          t(n, 44, y + 18, D - 88, { size: 17, bold: true, color: dark ? WHITE : FO }),
          t(meta, 44, y + 44, D - 88, { size: 13, bold: true, color: dark ? AM : RU }),
          t(d, 44, y + 70, D - 88, { size: 13, color: dark ? "#e2e8f0" : INK, lh: 1.45 }),
          t(note, 44, y + 154, D - 88, { size: 13, italic: true, color: dark ? AM : "#57534e" })];
      }),
      t("Park map", D + 28, 40, 2 * D - 56, { size: 30, family: "serif", bold: true, color: FO }),
      f(D + 28, 90, 2 * D - 56, 380, { shape: "rounded", radius: 12, name: "Park map" }),
      ...spots.flatMap(([n, note], i) => {
        const x = D + 28 + Math.floor(i / 4) * 240, y = 496 + (i % 4) * 62;
        return [c(x, y, 30, 30, RU, { name: "Map point" }), tm(String(i + 1), x, y, 30, 30, { size: 14, bold: true, color: WHITE, align: "center" }), t(n, x + 42, y + 1, 190, { size: 14, bold: true, color: INK }), t(note, x + 42, y + 21, 190, { size: 12, color: "#57534e" })];
      }),
      t("Leave no trace", 3 * D + 28, 44, D - 56, { size: 22, bold: true, color: FO }),
      ...tips.flatMap((s2, i) => [e("icon-leaf", 3 * D + 28, 96 + i * 66, 22, { c1: FO }), t(s2, 3 * D + 60, 96 + i * 66, D - 88, { size: 13.5, color: INK, lh: 1.4 })]),
      r(3 * D + 28, 446, D - 56, 304, FO, { radius: 14, name: "Camping box" }),
      t("Camping permits", 3 * D + 44, 468, D - 88, { size: 18, bold: true, color: AM, lh: 1.25 }),
      t("$15 a night per pitch. Book ahead in summer, pitches fill fast.", 3 * D + 44, 500, D - 88, { size: 13.5, color: WHITE, lh: 1.45 }),
      f(3 * D + D / 2 - 58, 600, 116, 116, { name: "QR code" }),
    ]);
    return [outside, inside];
  });

  /* ---------- Tri-fold Legal ---------- */
  tpl("careers-brochure-pr2", "Careers and hiring brochure", "brochure-trifold-legal", BT + "trifold legal hiring careers jobs recruitment company culture benefits", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, e, tm, colm } = k2;
    const P = W / 3, GR = "#166534", LI = "#bef264", DK = "#0f172a", LT = "#f0fdf4";
    const perks = [["icon-home", "Hybrid work", "Office, home or both"], ["icon-sun", "30 days off", "Plus your birthday"], ["icon-idea", "Learning fund", "$1,500 every year"], ["icon-heart", "Health cover", "For you and family"], ["icon-users", "Parental leave", "6 months fully paid"], ["icon-globe", "Team trips", "Twice a year"]];
    const steps = [["Find your role", "Browse open jobs at fernway.io/careers."], ["Send your CV", "No cover letter needed, just tell us why in three lines."], ["Meet the team", "A friendly video call, then a short task you can do at home."], ["Get an answer fast", "We reply to everyone within 10 working days."]];
    const why = [["4.8 / 5", "Average rating in our own yearly staff survey"], ["92%", "of people would recommend working here to a friend"], ["38", "nationalities across three offices and remote"], ["0", "meetings on Wednesdays. Deep work day, every week."]];
    const roles = [["Senior Backend Engineer", "Platform · Leeds or remote", "Full time"], ["Product Designer", "Design · Lisbon", "Full time"], ["Data Analyst", "Insights · remote", "Full time"], ["Customer Success Lead", "Support · Leeds", "Full time"], ["iOS Engineer", "Mobile · remote", "Full time"], ["Marketing Manager", "Growth · Lisbon", "Full time"], ["QA Engineer", "Platform · Leeds", "Contract"], ["Graduate Developer", "Engineering · Leeds", "Sept 2026"]];
    const values = [["Be kind, be direct", "Say the useful thing, and say it with care."], ["Ship small, ship often", "Little steps beat big launches."], ["Own the outcome", "Not just the task. Ask why, then make it work."], ["Leave it better", "Code, docs or the kitchen: tidy up after yourself."]];
    const outside = page(WHITE, [
      t("Life at Fernway", 40, 50, P - 80, { size: 30, bold: true, color: DK }),
      ...perks.flatMap(([ic, hd, sb], i) => {
        const x = 40 + (i % 2) * 188, y = 116 + Math.floor(i / 2) * 150;
        return [r(x, y, 176, 136, LT, { radius: 14, name: "Perk tile" }), e(ic, x + 20, y + 18, 34, { c1: GR }), t(hd, x + 20, y + 62, 146, { size: 15, bold: true, color: DK }), t(sb, x + 20, y + 86, 146, { size: 12.5, color: "#374151", lh: 1.35 })];
      }),
      r(40, 590, P - 80, 160, GR, { radius: 16, name: "Quote box" }),
      t("“I shipped my first feature in week two, and nobody ever made me feel new.”", 64, 608, P - 128, { size: 16, family: "serif", italic: true, color: WHITE, lh: 1.45 }),
      t("Inês, Product Engineer", 64, 706, P - 128, { size: 13, bold: true, color: LI }),
      t("How to apply", P + 40, 50, P - 80, { size: 30, bold: true, color: DK }),
      ...steps.flatMap(([hd, sb], i) => [c(P + 40, 116 + i * 106, 48, 48, GR, { name: "Step" }), tm(String(i + 1), P + 40, 116 + i * 106, 48, 48, { size: 20, bold: true, color: WHITE, align: "center" }), t(hd, P + 104, 118 + i * 106, P - 144, { size: 17, bold: true, color: DK }), t(sb, P + 104, 142 + i * 106, P - 144, { size: 13.5, color: INK, lh: 1.45 })]),
      f(P + 40, 556, 130, 130, { name: "QR code" }),
      t("Scan to see every open role", P + 192, 564, P - 232, { size: 15, bold: true, color: DK, lh: 1.35 }),
      t("careers@fernway.io\n555 0115", P + 192, 620, P - 232, { size: 14, color: INK, lh: 1.5 }),
      t("Fernway is an equal opportunity employer. We welcome people of every background.", P + 40, 718, P - 80, { size: 12, color: "#475569", lh: 1.45 }),
      f(2 * P, 0, P, 460, { name: "Team photo" }),
      r(2 * P, 460, P, H - 460, GR, { name: "Cover base" }),
      c(2 * P + 274, 370, 150, 150, LI, { name: "Roles badge" }),
      colm(370, 150, t("24", 2 * P + 284, 0, 130, { size: 44, bold: true, color: DK, align: "center", lh: 1.05 }), t("open roles", 2 * P + 284, 0, 130, { size: 14, bold: true, color: DK, align: "center" })),
      t("CAREERS AT FERNWAY", 2 * P + 40, 540, 220, { size: 15, bold: true, color: LI, ls: 4, lh: 1.3 }),
      t("Build what's next with us", 2 * P + 40, 588, P - 80, { size: 40, bold: true, color: WHITE, lh: 1.05 }),
      t("Engineering, design and customer roles in Leeds, Lisbon and remote.", 2 * P + 40, 680, P - 80, { size: 15, color: "#dcfce7", lh: 1.45 }),
      t("fernway.io/careers", 2 * P + 40, 748, P - 80, { size: 15, bold: true, color: LI }),
    ]);
    const inside = page(WHITE, [
      r(0, 0, P, H, DK, { name: "Why panel" }),
      t("Why Fernway?", 40, 50, P - 80, { size: 30, bold: true, color: WHITE }),
      ...why.flatMap(([n, l], i) => [t(n, 40, 120 + i * 150, P - 80, { size: 54, bold: true, color: LI, lh: 1 }), t(l, 40, 182 + i * 150, P - 80, { size: 15, color: "#cbd5e1", lh: 1.45 })]),
      t("Open roles", P + 40, 50, P - 80, { size: 30, bold: true, color: DK }),
      ...roles.flatMap(([n, m, ty], i) => {
        const y = 112 + i * 74;
        return [r(P + 40, y, P - 80, 62, i % 2 ? WHITE : LT, { radius: 10, name: "Role row" }), t(n, P + 56, y + 10, 250, { size: 15, bold: true, color: DK }), t(m, P + 56, y + 33, 250, { size: 12.5, color: "#475569" }), r(2 * P - 136, y + 17, 84, 28, GR, { radius: 14, name: "Type chip" }), tm(ty, 2 * P - 136, y + 17, 84, 28, { size: 11.5, bold: true, color: WHITE, align: "center" })];
      }),
      t("New roles every month at fernway.io/careers", P + 40, 724, P - 80, { size: 13.5, bold: true, color: GR }),
      t("What we value", 2 * P + 40, 50, P - 80, { size: 30, bold: true, color: DK }),
      ...values.flatMap(([hd, sb], i) => [r(2 * P + 40, 112 + i * 102, 6, 84, GR, { name: "Bar" }), t(hd, 2 * P + 60, 112 + i * 102, P - 100, { size: 17, bold: true, color: DK }), t(sb, 2 * P + 60, 138 + i * 102, P - 100, { size: 13.5, color: INK, lh: 1.45 })]),
      f(2 * P + 40, 530, P - 80, 220, { shape: "rounded", radius: 12, name: "Office photo" }),
    ]);
    return [outside, inside];
  });
  tpl("music-school-brochure-pr2", "Music school brochure", "brochure-trifold-legal", BT + "trifold legal music school lessons piano guitar violin teachers fees", (W, H) => {
    const k2 = kit(W, H);
    const { t, r, c, f, e, tm } = k2;
    const P = W / 3, PU = "#4c1d95", MG = "#be185d", YL = "#fde047", LT = "#faf5ff";
    const wave = [60, 120, 200, 140, 260, 180, 100, 220, 150, 80, 40];
    const inst = ["Piano", "Guitar", "Violin", "Drums", "Voice", "Ukulele", "Cello", "Flute"];
    const dots = [PU, MG, "#0f766e", "#b45309"];
    const fees = [["30 min, one to one", "$220"], ["45 min, one to one", "$310"], ["60 min, one to one", "$400"], ["Group class, 4 – 6 pupils", "$150"], ["Little Notes, 30 min group", "$110"]];
    const teachers = [["Rosa Mendes", "Piano and theory", "Concert pianist who has taught for 15 years."], ["Kofi Asante", "Guitar and drums", "Session player and lifelong rock fan."], ["Lena Weiss", "Violin and cello", "Former orchestra leader, endlessly patient."], ["Dan Price", "Voice and ukulele", "Runs our choir and the Little Notes club."]];
    const outside = page(WHITE, [
      r(40, 56, P - 80, 304, "#fef9c3", { radius: 16, stroke: MG, sw: 2, name: "Voucher" }),
      t("FREE TRIAL LESSON", 64, 82, P - 128, { size: 15, bold: true, color: MG, ls: 3 }),
      t("Try any instrument for 30 minutes, on us.", 64, 112, P - 128, { size: 26, bold: true, color: PU, lh: 1.2 }),
      r(64, 236, P - 128, 1.5, "#eab308", { name: "Rule" }),
      ...lineFor(k2, "Name", 64, 256, P - 128, 56, PU),
      ...lineFor(k2, "Instrument", 64, 300, P - 128, 96, PU),
      t("Bring this voucher or quote TRIAL26 when you book.", 40, 380, P - 80, { size: 14, italic: true, color: "#475569" }),
      t("Student concerts", 40, 446, P - 80, { size: 24, bold: true, color: PU }),
      t("Every term our students play for family and friends at the Kendal Arts Hall. Nerves welcome, cake guaranteed.", 40, 484, P - 80, { size: 14, color: INK, lh: 1.5 }),
      f(40, 580, P - 80, 170, { shape: "rounded", radius: 12, name: "Concert photo" }),
      t("Find us", P + 40, 50, P - 80, { size: 30, bold: true, color: PU }),
      f(P + 40, 104, P - 80, 240, { shape: "rounded", radius: 12, name: "Studio photo" }),
      ...iconRows(k2, [["icon-location", "8 Chapel Street, Kendal"], ["icon-call", "555 0164"], ["icon-mail", "hello@harmonymusic.school"], ["icon-clock", "Mon – Fri 3 – 8 pm · Sat 9 am – 2 pm"]], P + 40, 370, P - 80, 40, { c1: MG, size: 14 }),
      t("Instrument hire", P + 40, 550, P - 80, { size: 18, bold: true, color: PU }),
      t("No instrument yet? Hire a violin, guitar or keyboard from $12 a month while you learn.", P + 40, 578, P - 80, { size: 14, color: INK, lh: 1.5 }),
      t("Member of the National Music Teachers Network", P + 40, 740, P - 80, { size: 12, italic: true, color: "#475569" }),
      r(2 * P, 0, P, H, PU, { name: "Cover panel" }),
      ...wave.map((hh, i) => r(2 * P + 40 + i * 34, 300 - hh / 2, 20, hh, i % 3 === 1 ? YL : i % 3 === 2 ? WHITE : "#f472b6", { radius: 10, name: "Sound bar" })),
      t("Harmony", 2 * P + 40, 470, P - 80, { size: 64, bold: true, color: WHITE, lh: 1 }),
      t("MUSIC SCHOOL", 2 * P + 40, 542, P - 80, { size: 20, bold: true, color: YL, ls: 8 }),
      t("Lessons for every age and every instrument, from first notes to grade 8.", 2 * P + 40, 588, P - 80, { size: 16, color: "#ede9fe", lh: 1.45 }),
      t("harmonymusic.school", 2 * P + 40, 740, P - 80, { size: 15, bold: true, color: YL }),
    ]);
    const inside = page(WHITE, [
      t("Instruments", 40, 50, P - 80, { size: 30, bold: true, color: PU }),
      ...inst.flatMap((n, i) => {
        const x = 40 + (i % 2) * 192, y = 108 + Math.floor(i / 2) * 84;
        return [r(x, y, 176, 72, LT, { radius: 14, name: "Instrument chip" }), c(x + 16, y + 16, 40, 40, dots[i % 4], { name: "Initial" }), tm(n[0], x + 16, y + 16, 40, 40, { size: 18, bold: true, color: WHITE, align: "center" }), tm(n, x + 66, y, 104, 72, { size: 15, bold: true, color: PU })];
      }),
      t("Ages", 40, 460, P - 80, { size: 20, bold: true, color: PU }),
      t("Little Notes (age 3 – 5) · Juniors (6 – 11) · Teens · Adults, including total beginners", 40, 490, P - 80, { size: 14, color: INK, lh: 1.5 }),
      r(40, 590, P - 80, 160, PU, { radius: 16, name: "Exam box" }),
      t("Exam ready", 64, 610, P - 128, { size: 20, bold: true, color: YL }),
      t("We prepare students for graded exams, school auditions and music scholarships. 97% passed last year.", 64, 644, P - 128, { size: 14, color: "#ede9fe", lh: 1.5 }),
      r(P, 0, P, H, LT, { name: "Fees panel" }),
      t("Lessons and fees", P + 40, 50, P - 80, { size: 30, bold: true, color: PU }),
      r(P + 40, 110, P - 80, 44, PU, { radius: 10, name: "Table header" }),
      tm("LESSON", P + 56, 110, 160, 44, { size: 12, bold: true, color: WHITE, ls: 2 }),
      tm("PER TERM", 2 * P - 200, 110, 144, 44, { size: 12, bold: true, color: WHITE, ls: 2, align: "right" }),
      ...fees.flatMap(([n, p], i) => [r(P + 40, 164 + i * 56, P - 80, 48, WHITE, { radius: 10, name: "Fee row" }), tm(n, P + 56, 164 + i * 56, 230, 48, { size: 15, bold: true, color: INK }), tm(p, 2 * P - 160, 164 + i * 56, 104, 48, { size: 16, bold: true, color: MG, align: "right" })]),
      t("A term is 10 weekly lessons.", P + 40, 448, P - 80, { size: 13, italic: true, color: "#475569" }),
      t("Good to know", P + 40, 486, P - 80, { size: 20, bold: true, color: PU }),
      ...iconRows(k2, [["icon-check", "10% off for brothers and sisters"], ["icon-check", "Pay by term or monthly"], ["icon-check", "Free make-up lesson if we cancel"], ["icon-check", "Lessons in person or online"]], P + 40, 520, P - 80, 36, { c1: MG, size: 14, icon: 20 }),
      r(P + 40, 682, P - 80, 64, MG, { radius: 32, name: "Button" }),
      tm("Book a free trial: 555 0164", P + 40, 682, P - 80, 64, { size: 17, bold: true, color: WHITE, align: "center" }),
      t("Meet the teachers", 2 * P + 40, 50, P - 80, { size: 30, bold: true, color: PU }),
      ...teachers.flatMap(([n, ins, bio], i) => {
        const y = 108 + i * 150;
        return [c(2 * P + 40, y, 110, 110, "#ede9fe", { name: "Photo ring" }), f(2 * P + 46, y + 6, 98, 98, { shape: "circle", name: "Teacher photo" }), t(n, 2 * P + 170, y + 8, P - 210, { size: 18, bold: true, color: INK }), t(ins, 2 * P + 170, y + 34, P - 210, { size: 13, bold: true, color: MG }), t(bio, 2 * P + 170, y + 56, P - 210, { size: 13, color: INK, lh: 1.45 })];
      }),
      t("All our teachers are qualified and background checked.", 2 * P + 40, 724, P - 80, { size: 13, italic: true, color: "#475569" }),
    ]);
    return [outside, inside];
  });
}
