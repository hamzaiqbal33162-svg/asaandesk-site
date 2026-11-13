// AsaanDesk Studio: 30 more own print layouts (10 flyers, 10 posters, 10 invitations), each its own composition.
// Pure module (no imports). templates.js calls the default export with its helpers. Own text, colours, shapes only.
import { castFor, face, member, KIND } from "./templates-faces.js";

export default function addXtra4Print(k) {
  const { T, S, R, C, E, F, page } = k;
  // Person spots show people photos of their kind (templates-faces.js): one person picker per template build.
  let CAST = null;
  const tpl = (id, title, preset, tags, build) => k.tpl(id, title, preset, tags, (W, H) => { CAST = castFor(id); return build(W, H); });
  const { INK, MUTED, WHITE } = k.K;
  // Every layout is drawn in a reference space 800 units wide (480 for invitations) and scaled to the real page.
  const kit = (W, H, ref = 800) => {
    const u = W / ref, h = H / u;
    const sc = (o = {}) => ({ ...o, ...(o.size ? { size: o.size * u } : {}), ...(o.sw ? { sw: o.sw * u } : {}), ...(o.radius ? { radius: o.radius * u } : {}) });
    return {
      u, h,
      t: (s, x, y, w, o = {}) => T(s, x * u, y * u, w * u, sc(o)),
      r: (x, y, w, hh, fill, o = {}) => R(x * u, y * u, w * u, hh * u, fill, sc(o)),
      c: (x, y, w, hh, fill, o = {}) => C(x * u, y * u, w * u, hh * u, fill, sc(o)),
      s: (kind, x, y, w, hh, fill, o = {}) => S(kind, x * u, y * u, w * u, hh * u, fill, sc(o)),
      f: (x, y, w, hh, o = {}) => F(x * u, y * u, w * u, hh * u, sc(o)),
      e: (id, x, y, w, o = {}) => E(id, x * u, y * u, w * u, o),
    };
  };
  const FT = "flyer print leaflet ";
  const PT = "poster print wall ";
  const IT = "invitation card invite party ";

  /* ================= Flyers ================= */
  tpl("bake-sale-flyer-x4", "Bake sale flyer", "flyer-a4", FT + "bake sale cakes school charity food", (W, H) => {
    const { h, t, r, c } = kit(W, H);
    const scallop = Array.from({ length: 9 }, (_, i) => c(i * 100 - 10, 250, 120, 120, "#f9a8d4", { name: "Scallop" }));
    return [page("#fff1f2", [
      r(0, 0, 800, 310, "#f9a8d4", { name: "Header" }), ...scallop,
      t("SCHOOL", 60, 70, 680, { size: 40, bold: true, color: "#831843", align: "center", ls: 10 }),
      t("Bake Sale", 60, 120, 680, { size: 110, family: "serif", bold: true, italic: true, color: "#831843", align: "center", lh: 1 }),
      t("Cupcakes\nBrownies\nCookies\nBanana bread", 90, 450, 300, { size: 34, color: INK, lh: 1.6 }),
      t("$2\n$1.50\n$1\n$3", 410, 450, 300, { size: 34, bold: true, color: "#be185d", align: "right", lh: 1.6 }),
      r(90, 790, 620, 3, "#f9a8d4", { name: "Rule" }),
      t("Friday, 12 May · 3 pm to 6 pm", 60, 820, 680, { size: 34, bold: true, color: "#831843", align: "center" }),
      t("Main hall · All money goes to the library fund", 60, 875, 680, { size: 26, color: MUTED, align: "center" }),
      r(0, h - 90, 800, 90, "#831843", { name: "Footer" }),
      t("Everyone welcome", 0, h - 66, 800, { size: 32, bold: true, color: WHITE, align: "center" }),
    ])];
  });
  tpl("tear-off-tutoring-flyer-x4", "Tear-off tabs flyer", "flyer-letter", FT + "tutor lessons tear off tabs math english", (W, H) => {
    const { h, t, r } = kit(W, H);
    const tabs = Array.from({ length: 8 }, (_, i) => [
      r(i * 100, h - 230, 100, 230, i % 2 ? "#ffffff" : "#f1f5f9", { stroke: "#94a3b8", sw: 1.5, name: "Tab" }),
      t("Maths tutor · 555 0142", i * 100 - 65, h - 125, 230, { size: 17, bold: true, color: INK, align: "center", rot: -90 }),
    ]).flat();
    return [page("#ffffff", [
      r(0, 0, 800, 24, "#2563eb", { name: "Top bar" }),
      t("NEED HELP WITH", 60, 90, 680, { size: 40, bold: true, color: "#2563eb", ls: 6 }),
      t("Maths and English?", 60, 150, 680, { size: 84, bold: true, color: INK, lh: 1.05 }),
      t("One-to-one lessons for ages 8 to 16. Homework help, exam practice and friendly support at your home or online.", 60, 360, 680, { size: 32, color: MUTED, lh: 1.45 }),
      t("✓ First lesson free\n✓ Flexible evening times\n✓ 10 years of experience", 60, 540, 680, { size: 34, bold: true, color: INK, lh: 1.6 }),
      t("Take a number below", 60, h - 300, 680, { size: 28, italic: true, color: "#2563eb" }),
      ...tabs,
    ])];
  });
  tpl("open-house-flyer-x4", "Open house flyer", "flyer-a4", FT + "open house real estate home viewing property", (W, H) => {
    const { h, t, r, s, f } = kit(W, H);
    return [page("#f8fafc", [
      f(0, 0, 800, 560, { name: "House photo" }),
      s("triangle", -40, 400, 880, 260, "#f8fafc", { name: "Slant" }),
      r(60, 470, 300, 70, "#0f766e", { radius: 35, name: "Tag" }),
      t("OPEN HOUSE", 60, 486, 300, { size: 32, bold: true, color: WHITE, align: "center", ls: 3 }),
      t("Sunday 2 pm – 5 pm", 60, 600, 680, { size: 54, bold: true, color: INK }),
      t("4 bedrooms · 3 baths · garden · garage", 60, 680, 680, { size: 30, color: MUTED }),
      r(60, 760, 330, 160, "#e2e8f0", { radius: 18, name: "Price box" }),
      t("Asking", 90, 785, 270, { size: 24, color: MUTED }),
      t("$485,000", 90, 825, 280, { size: 52, bold: true, color: "#0f766e" }),
      t("22 Maple Avenue\nRiverside", 430, 780, 320, { size: 32, bold: true, color: INK, lh: 1.3 }),
      r(0, h - 80, 800, 80, "#0f766e", { name: "Footer" }),
      t("Call Dana · 555 0188", 0, h - 58, 800, { size: 30, bold: true, color: WHITE, align: "center" }),
    ])];
  });
  tpl("workshop-agenda-flyer-x4", "Workshop agenda flyer", "flyer-a5", FT + "workshop agenda schedule timeline day program", (W, H) => {
    const { h, t, r, c } = kit(W, H);
    const items = [["9:00", "Welcome and coffee"], ["9:30", "Hands-on session one"], ["11:00", "Group challenge"], ["12:30", "Lunch together"], ["1:30", "Share and wrap-up"]];
    return [page("#1e1b4b", [
      t("PHOTOGRAPHY", 70, 80, 660, { size: 36, bold: true, color: "#a5b4fc", ls: 8 }),
      t("Day Workshop", 70, 130, 660, { size: 72, bold: true, color: WHITE, lh: 1 }),
      r(110, 330, 6, 160 * items.length - 80, "#6366f1", { name: "Timeline" }),
      ...items.flatMap(([tm, what], i) => [
        c(95, 320 + i * 160, 36, 36, "#a5b4fc", { name: "Dot" }),
        t(tm, 160, 314 + i * 160, 160, { size: 36, bold: true, color: "#a5b4fc" }),
        t(what, 330, 314 + i * 160, 420, { size: 36, color: WHITE }),
      ]),
      t("Saturday 3 June · Studio 4 · Bring your camera", 70, h - 110, 660, { size: 28, color: "#c7d2fe" }),
    ])];
  });
  tpl("farmers-market-flyer-x4", "Farmers market flyer", "flyer-letter", FT + "farmers market fresh produce local food weekend", (W, H) => {
    const { h, t, r, c } = kit(W, H);
    const produce = [["Apples", "#ef4444"], ["Greens", "#22c55e"], ["Honey", "#f59e0b"], ["Bread", "#b45309"], ["Berries", "#7c3aed"], ["Eggs", "#e2e8f0"]];
    return [page("#fefce8", [
      c(-100, -520, 1000, 820, "#65a30d", { name: "Arch" }),
      t("Saturday", 0, 70, 800, { size: 44, italic: true, family: "serif", color: "#ecfccb", align: "center" }),
      t("FARMERS MARKET", 40, 130, 720, { size: 74, bold: true, color: WHITE, align: "center" }),
      ...produce.flatMap(([name, col], i) => {
        const x = 90 + (i % 3) * 220, y = 390 + Math.floor(i / 3) * 250;
        return [c(x + 20, y, 160, 160, col, { name: "Produce" }), t(name, x, y + 175, 200, { size: 32, bold: true, color: "#3f6212", align: "center" })];
      }),
      t("Every Saturday · 8 am to 1 pm", 40, 920, 720, { size: 40, bold: true, color: "#3f6212", align: "center" }),
      t("Town square car park", 40, 980, 720, { size: 30, color: MUTED, align: "center" }),
    ])];
  });
  tpl("pet-adoption-flyer-x4", "Pet adoption flyer", "flyer-a4", FT + "pet adoption dog cat shelter rescue adopt", (W, H) => {
    const { h, t, r, c, f } = kit(W, H);
    return [page("#fff7ed", [
      c(160, 120, 480, 480, "#fdba74", { name: "Photo ring" }),
      f(185, 145, 430, 430, { shape: "circle", name: "Pet photo" }),
      r(120, 560, 560, 110, "#ea580c", { radius: 20, rot: -4, name: "Ribbon" }),
      t("ADOPT ME", 120, 580, 560, { size: 66, bold: true, color: WHITE, align: "center", rot: -4, ls: 4 }),
      t("Hi, I'm Biscuit!", 60, 720, 680, { size: 50, family: "serif", bold: true, color: "#7c2d12", align: "center" }),
      t("2 years · friendly · house trained · loves walks", 60, 790, 680, { size: 30, color: MUTED, align: "center" }),
      r(60, 870, 680, 2, "#fdba74", { name: "Rule" }),
      t("Happy Tails Shelter · 555 0177", 60, 900, 680, { size: 32, bold: true, color: "#7c2d12", align: "center" }),
      t("Visit us any day from 10 am", 60, 950, 680, { size: 26, color: MUTED, align: "center" }),
    ])];
  });
  tpl("coding-bootcamp-flyer-x4", "Coding bootcamp flyer", "flyer-a4", FT + "coding bootcamp course programming tech class", (W, H) => {
    const { h, t, r, c } = kit(W, H);
    return [page("#0b1020", [
      r(60, 80, 680, 420, "#111827", { radius: 18, stroke: "#334155", sw: 2, name: "Terminal" }),
      r(60, 80, 680, 50, "#1f2937", { radius: 18, name: "Terminal bar" }),
      c(85, 97, 18, 18, "#ef4444"), c(115, 97, 18, 18, "#f59e0b"), c(145, 97, 18, 18, "#22c55e"),
      t("> learn --to code\n> build --real apps\n> get --hired", 100, 170, 600, { size: 40, family: "mono", color: "#4ade80", lh: 1.6 }),
      t("12-WEEK", 60, 560, 680, { size: 40, bold: true, color: "#60a5fa", ls: 8 }),
      t("Coding Bootcamp", 60, 610, 680, { size: 70, bold: true, color: WHITE, lh: 1 }),
      t("Evenings and weekends · beginners welcome · laptop provided", 60, 720, 680, { size: 28, color: "#94a3b8" }),
      r(60, 820, 330, 86, "#2563eb", { radius: 43, name: "Button" }),
      t("Apply by 30 June", 60, 843, 330, { size: 30, bold: true, color: WHITE, align: "center" }),
      t("codecamp.example", 430, 843, 310, { size: 30, family: "mono", color: "#60a5fa" }),
    ])];
  });
  tpl("book-club-flyer-x4", "Book club flyer", "flyer-a5", FT + "book club reading library meeting literature", (W, H) => {
    const { h, t, r } = kit(W, H);
    const spines = [[140, "#7c2d12"], [190, "#b45309"], [160, "#065f46"], [210, "#1e3a8a"], [150, "#9d174d"], [180, "#57534e"], [200, "#0f766e"], [170, "#a16207"]];
    return [page("#faf6ee", [
      t("Join our", 60, 90, 680, { size: 44, italic: true, family: "serif", color: "#7c2d12", align: "center" }),
      t("BOOK CLUB", 60, 150, 680, { size: 100, family: "serif", bold: true, color: INK, align: "center", ls: 4 }),
      t("One book a month, good tea and better talk. This month: a mystery set by the sea.", 100, 300, 600, { size: 32, family: "serif", color: MUTED, align: "center", lh: 1.45 }),
      t("First Thursday · 7 pm · Corner Library", 60, 520, 680, { size: 32, bold: true, color: "#7c2d12", align: "center" }),
      ...spines.map(([hh, col], i) => r(110 + i * 75, h - 90 - hh, 64, hh, col, { radius: 4, name: "Book spine" })),
      r(80, h - 90, 640, 10, "#57534e", { name: "Shelf" }),
    ])];
  });
  tpl("car-wash-flyer-x4", "Car wash flyer", "flyer-letter", FT + "car wash service prices cleaning auto", (W, H) => {
    const { h, t, r, c } = kit(W, H);
    const bubbles = [[620, 60, 120], [700, 200, 70], [560, 220, 50], [60, 300, 60], [120, 380, 34]].map(([x, y, d]) => c(x, y, d, d, "#bae6fd", { op: 0.8, name: "Bubble" }));
    const tiers = [["Basic", "$10", "Outside wash"], ["Shine", "$18", "Wash + wax"], ["Deluxe", "$30", "Inside + out"]];
    return [page("#e0f2fe", [
      ...bubbles,
      t("SPARKLE", 60, 90, 560, { size: 50, bold: true, color: "#0284c7", ls: 6 }),
      t("Car Wash", 60, 150, 560, { size: 110, bold: true, color: "#0c4a6e", lh: 1 }),
      ...tiers.flatMap(([name, price, what], i) => {
        const x = 60 + i * 235;
        return [r(x, 450, 210, 300, i === 1 ? "#0284c7" : WHITE, { radius: 22, name: "Price card" }),
          t(name, x, 480, 210, { size: 34, bold: true, color: i === 1 ? WHITE : "#0c4a6e", align: "center" }),
          t(price, x, 540, 210, { size: 70, bold: true, color: i === 1 ? WHITE : "#0284c7", align: "center" }),
          t(what, x + 15, 650, 180, { size: 24, color: i === 1 ? "#e0f2fe" : MUTED, align: "center" })];
      }),
      t("Open daily 8 am – 7 pm · 40 Harbour Road", 60, 850, 680, { size: 32, bold: true, color: "#0c4a6e", align: "center" }),
    ])];
  });
  tpl("volunteer-cleanup-flyer-x4", "Volunteer clean-up flyer", "flyer-a4", FT + "volunteer clean up park beach community environment", (W, H) => {
    const { h, t, r, c, e } = kit(W, H);
    const steps = ["Meet at the main gate", "Get gloves and bags", "Clean for two hours", "Free lunch for helpers"];
    return [page("#f0fdf4", [
      r(0, 0, 260, h, "#15803d", { name: "Side panel" }),
      t("VOLUN\nTEERS\nWANTED", 30, 80, 210, { size: 46, bold: true, color: WHITE, lh: 1.05 }),
      e("icon-leaf", 70, 420, 120, { c1: "#bbf7d0" }),
      t("Park Clean-up Day", 300, 80, 460, { size: 70, bold: true, color: "#14532d", lh: 1.05 }),
      ...steps.flatMap((s, i) => [c(300, 330 + i * 120, 70, 70, "#22c55e", { name: "Step" }), t(String(i + 1), 300, 345 + i * 120, 70, { size: 34, bold: true, color: WHITE, align: "center" }), t(s, 395, 345 + i * 120, 365, { size: 32, color: INK })]),
      e("icon-location", 300, 850, 50, { c1: "#15803d" }),
      t("Green Hill Park · Sat 9 am", 365, 856, 395, { size: 32, bold: true, color: "#14532d" }),
    ])];
  });

  /* ================= Posters ================= */
  tpl("jazz-night-poster-x4", "Jazz night poster", "poster-18x24", PT + "jazz music night concert live band", (W, H) => {
    const { h, t, r, c } = kit(W, H);
    return [page("#111827", [
      c(150, 120, 500, 500, "#1f2937", { name: "Record" }), c(220, 190, 360, 360, "#111827", { name: "Groove" }), c(330, 300, 140, 140, "#f59e0b", { name: "Label" }),
      t("JAZZ", 60, 680, 680, { size: 190, bold: true, color: "#f59e0b", align: "center", lh: 1, ls: 20 }),
      t("NIGHT", 60, 870, 680, { size: 80, bold: true, color: WHITE, align: "center", ls: 30 }),
      r(250, 1000, 300, 3, "#f59e0b", { name: "Rule" }),
      t("Live quartet · every Friday · 9 pm", 60, 1030, 680, { size: 30, color: "#d1d5db", align: "center" }),
    ])];
  });
  tpl("half-marathon-poster-x4", "Half marathon poster", "poster-a2", PT + "marathon run race sport city running", (W, H) => {
    const { h, t, r, s } = kit(W, H);
    return [page("#fef3c7", [
      s("line", 60, 300, 700, 30, "#ea580c", { sw: 10, rot: -12, name: "Route" }),
      s("line", 100, 420, 600, 30, "#ea580c", { sw: 10, rot: 14, name: "Route" }),
      t("21K", 40, 470, 720, { size: 330, bold: true, color: "#9a3412", align: "center", lh: 1 }),
      t("CITY HALF MARATHON", 40, 820, 720, { size: 52, bold: true, color: INK, align: "center", ls: 4 }),
      t("Sunday 8 October · start 7 am · river path", 40, 900, 720, { size: 30, color: MUTED, align: "center" }),
      r(220, 980, 360, 80, "#ea580c", { radius: 40, name: "Button" }),
      t("Register now", 220, 1000, 360, { size: 32, bold: true, color: WHITE, align: "center" }),
    ])];
  });
  tpl("climate-stripes-poster-x4", "Climate stripes poster", "poster-a3", PT + "climate change environment awareness warming", (W, H) => {
    const { h, t, r } = kit(W, H);
    const cols = ["#08306b", "#2171b5", "#6baed6", "#c6dbef", "#fcbba1", "#fb6a4a", "#de2d26", "#a50f15"];
    return [page("#ffffff", [
      ...cols.map((col, i) => r(i * 100, 0, 100, 760, col, { name: "Stripe" })),
      t("Every stripe is a year.", 60, 820, 680, { size: 58, bold: true, color: INK }),
      t("Blue is cooler, red is warmer. Small changes at home add up: walk more, waste less, switch it off.", 60, 910, 680, { size: 30, color: MUTED, lh: 1.45 }),
      t("ACT FOR THE CLIMATE", 60, h - 100, 680, { size: 34, bold: true, color: "#a50f15", ls: 6 }),
    ])];
  });
  tpl("book-fair-poster-x4", "Book fair poster", "poster-18x24", PT + "book fair reading school library festival", (W, H) => {
    const { h, t, r } = kit(W, H);
    const books = [["#ef4444", 520, 70], ["#3b82f6", 480, 70], ["#f59e0b", 560, 60], ["#10b981", 500, 70], ["#8b5cf6", 440, 60]];
    return [page("#fdf4ff", [
      ...books.map(([col, w, hh], i) => r((800 - w) / 2, 620 - i * hh, w, hh - 6, col, { radius: 8, name: "Book" })),
      t("BOOK FAIR", 40, 680, 720, { size: 104, bold: true, color: "#701a75", align: "center", lh: 1 }),
      t("Thousands of books · author talks · story time", 40, 840, 720, { size: 32, color: "#86198f", align: "center" }),
      t("15–17 March · City Hall", 40, 920, 720, { size: 44, bold: true, color: INK, align: "center" }),
    ])];
  });
  tpl("comedy-night-poster-x4", "Comedy night poster", "poster-a3", PT + "comedy stand up night show funny", (W, H) => {
    const { h, t, c, s } = kit(W, H);
    return [page("#facc15", [
      c(80, 120, 640, 480, WHITE, { name: "Speech bubble" }),
      s("triangle", 200, 540, 140, 140, WHITE, { rot: 200, name: "Bubble tail" }),
      t("HA HA HA!", 130, 260, 540, { size: 82, bold: true, color: INK, align: "center", lh: 1 }),
      t("Stand-up", 130, 400, 540, { size: 50, italic: true, family: "serif", color: "#a16207", align: "center" }),
      t("COMEDY NIGHT", 40, 760, 720, { size: 86, bold: true, color: INK, align: "center" }),
      t("Five comics · one stage · Friday 8 pm", 40, 880, 720, { size: 32, bold: true, color: "#713f12", align: "center" }),
      t("The Laugh Box, Main Street", 40, 940, 720, { size: 28, color: "#713f12", align: "center" }),
    ])];
  });
  tpl("tech-conference-poster-x4", "Tech conference poster", "poster-a2", PT + "tech conference speakers event developers", (W, H) => {
    const { h, t, f, r } = kit(W, H);
    const names = ["Ana Lopez", "Sam Okafor", "Mei Chen", "Leo Hart"];
    return [page("#0f172a", [
      t("DEVCON 2026", 60, 80, 680, { size: 96, bold: true, color: WHITE, lh: 1 }),
      t("Two days of talks on AI, web and cloud", 60, 200, 680, { size: 32, color: "#94a3b8" }),
      ...names.flatMap((n, i) => {
        const x = 60 + (i % 2) * 360, y = 300 + Math.floor(i / 2) * 330;
        return [member(CAST, f(x, y, 220, 220, { shape: "circle", name: "Speaker photo" }), n, "Speaker"), t(n, x, y + 235, 320, { size: 30, bold: true, color: WHITE }), t("Speaker", x, y + 275, 320, { size: 22, color: "#38bdf8" })];
      }),
      r(60, 1000, 680, 4, "#38bdf8", { name: "Rule" }),
      t("9–10 November · Expo Centre · devcon.example", 60, 1030, 680, { size: 28, color: "#cbd5e1" }),
    ])];
  });
  tpl("food-festival-poster-x4", "Food festival poster", "poster-18x24", PT + "food festival street food tasting event", (W, H) => {
    const { h, t, c, e } = kit(W, H);
    return [page("#7c2d12", [
      c(150, 120, 500, 500, "#fff7ed", { name: "Plate" }), c(200, 170, 400, 400, "#ffedd5", { name: "Plate inner" }),
      e("icon-chai", 330, 300, 140, { c1: "#9a3412" }),
      t("STREET", 40, 680, 720, { size: 70, bold: true, color: "#fdba74", align: "center", ls: 16 }),
      t("Food Festival", 40, 770, 720, { size: 110, family: "serif", bold: true, color: WHITE, align: "center", lh: 1 }),
      t("40 stalls · live music · family fun", 40, 920, 720, { size: 32, color: "#fed7aa", align: "center" }),
      t("Riverside Park · 20–22 July", 40, 980, 720, { size: 38, bold: true, color: WHITE, align: "center" }),
    ])];
  });
  tpl("museum-night-poster-x4", "Museum late night poster", "poster-a3", PT + "museum art night gallery culture exhibition", (W, H) => {
    const { h, t, r, c } = kit(W, H);
    return [page("#f5f5f4", [
      ...[0, 1, 2].map((i) => [r(110 + i * 200, 260, 180, 400, "#d6d3d1", { name: "Arch" }), c(110 + i * 200, 170, 180, 180, "#d6d3d1", { name: "Arch top" })]).flat(),
      r(80, 660, 640, 14, "#57534e", { name: "Base" }),
      t("Museum Late", 60, 740, 680, { size: 96, family: "serif", color: INK, align: "center", lh: 1 }),
      t("Galleries open until midnight · music · talks", 60, 860, 680, { size: 30, color: MUTED, align: "center" }),
      t("LAST FRIDAY OF EVERY MONTH", 60, 940, 680, { size: 28, bold: true, color: "#57534e", align: "center", ls: 4 }),
    ])];
  });
  tpl("safety-first-poster-x4", "Safety first poster", "poster-a2", PT + "safety workplace warning rules sign", (W, H) => {
    const { h, t, r, s } = kit(W, H);
    const stripes = Array.from({ length: 12 }, (_, i) => r(i * 80 - 40, 0, 40, 90, INK, { rot: 30, name: "Hazard stripe" }));
    return [page("#fde047", [
      ...stripes,
      s("triangle", 250, 160, 300, 260, INK, { name: "Warning" }), s("triangle", 285, 205, 230, 195, "#fde047", { name: "Warning inner" }),
      t("!", 250, 255, 300, { size: 120, bold: true, color: INK, align: "center", lh: 1 }),
      t("SAFETY FIRST", 40, 470, 720, { size: 100, bold: true, color: INK, align: "center" }),
      t("1. Wear your helmet and boots\n2. Keep walkways clear\n3. Report every spill", 120, 640, 560, { size: 40, bold: true, color: INK, lh: 1.6 }),
      r(0, h - 90, 800, 90, INK, { name: "Footer" }),
      t("Think safe · work safe · home safe", 0, h - 66, 800, { size: 32, bold: true, color: "#fde047", align: "center" }),
    ])];
  });
  tpl("summer-camp-poster-x4", "Summer camp poster", "poster-18x24", PT + "summer camp kids outdoor adventure holiday", (W, H) => {
    const { h, t, c, s } = kit(W, H);
    return [page("#e0f2fe", [
      c(520, 80, 200, 200, "#facc15", { name: "Sun" }),
      s("triangle", -60, 280, 520, 380, "#16a34a", { name: "Mountain" }), s("triangle", 300, 330, 560, 330, "#15803d", { name: "Mountain" }),
      s("triangle", 140, 280, 140, 90, WHITE, { name: "Snow cap" }),
      t("SUMMER CAMP", 40, 720, 720, { size: 82, bold: true, color: "#0c4a6e", align: "center" }),
      t("Hiking · swimming · campfires · crafts", 40, 850, 720, { size: 34, color: "#0369a1", align: "center" }),
      t("Ages 8–14 · July and August · sign up today", 40, 920, 720, { size: 30, bold: true, color: INK, align: "center" }),
    ])];
  });

  /* ================= Invitations (480 × 672) ================= */
  const IV = "invitation-5x7";
  tpl("baptism-invitation-x4", "Christening invitation", IV, IT + "christening baptism baby blessing", (W, H) => {
    const { t, r, c } = kit(W, H, 480);
    return [page("#eff6ff", [
      c(80, 70, 320, 320, WHITE, { name: "Arch top" }), r(80, 230, 320, 380, WHITE, { name: "Arch" }),
      t("Please join us for the", 100, 150, 280, { size: 16, italic: true, family: "serif", color: "#1e3a8a", align: "center" }),
      t("Christening", 100, 185, 280, { size: 40, family: "serif", color: "#1e3a8a", align: "center" }),
      t("of", 100, 245, 280, { size: 16, italic: true, family: "serif", color: MUTED, align: "center" }),
      t("Oliver James", 100, 275, 280, { size: 30, bold: true, family: "serif", color: INK, align: "center" }),
      r(200, 335, 80, 2, "#93c5fd", { name: "Rule" }),
      t("Sunday 4 June · 11 am\nSt Mary's Church\nLunch to follow", 100, 360, 280, { size: 16, color: INK, align: "center", lh: 1.6 }),
    ])];
  });
  tpl("bridal-shower-invitation-x4", "Bridal shower invitation", IV, IT + "bridal shower bride wedding brunch", (W, H) => {
    const { t, c } = kit(W, H, 480);
    const petals = [[-40, -40, 160, "#fbcfe8"], [60, -30, 90, "#f9a8d4"], [-30, 70, 100, "#fce7f3"], [380, 560, 150, "#fbcfe8"], [330, 610, 90, "#f9a8d4"]].map(([x, y, d, col]) => c(x, y, d, d, col, { name: "Petal" }));
    return [page("#fff1f2", [
      ...petals,
      t("BRIDAL SHOWER", 40, 170, 400, { size: 18, bold: true, color: "#be185d", align: "center", ls: 6 }),
      t("Sophie", 40, 210, 400, { size: 64, family: "serif", italic: true, color: "#831843", align: "center" }),
      t("is getting married!", 40, 300, 400, { size: 20, family: "serif", color: INK, align: "center" }),
      t("Saturday 10 June · 1 pm\nThe Garden Room, 5 Rose Lane", 40, 380, 400, { size: 17, color: INK, align: "center", lh: 1.6 }),
      t("RSVP to Emma · 555 0102", 40, 470, 400, { size: 15, bold: true, color: "#be185d", align: "center" }),
    ])];
  });
  tpl("anniversary-invitation-x4", "Silver anniversary invitation", IV, IT + "anniversary wedding 25 years celebration", (W, H) => {
    const { t, r } = kit(W, H, 480);
    return [page("#111827", [
      r(24, 24, 432, 624, "none", { stroke: "#d1d5db", sw: 2, name: "Frame" }),
      t("25", 40, 90, 400, { size: 170, family: "serif", color: "#d1d5db", align: "center", lh: 1 }),
      t("YEARS TOGETHER", 40, 290, 400, { size: 18, bold: true, color: WHITE, align: "center", ls: 8 }),
      t("Maria and Tom", 40, 340, 400, { size: 36, family: "serif", italic: true, color: WHITE, align: "center" }),
      t("invite you to celebrate their silver anniversary", 70, 400, 340, { size: 16, color: "#9ca3af", align: "center", lh: 1.4 }),
      t("Saturday 9 September · 7 pm\nThe Grand Hotel", 40, 480, 400, { size: 17, bold: true, color: "#d1d5db", align: "center", lh: 1.6 }),
    ])];
  });
  tpl("pool-party-invitation-x4", "Pool party invitation", IV, IT + "pool party summer swim kids splash", (W, H) => {
    const { t, c, r } = kit(W, H, 480);
    const waves = Array.from({ length: 6 }, (_, i) => c(i * 90 - 40, 520, 140, 90, "#0ea5e9", { name: "Wave" }));
    return [page("#ecfeff", [
      c(330, 40, 110, 110, "#facc15", { name: "Sun" }),
      t("Make a splash!", 40, 120, 400, { size: 22, italic: true, color: "#0369a1" }),
      t("POOL\nPARTY", 40, 160, 400, { size: 80, bold: true, color: "#0c4a6e", lh: 0.95 }),
      t("Max is turning 9", 40, 340, 400, { size: 22, bold: true, color: "#0891b2" }),
      t("Sunday 2 July · 2 pm\n12 Bay View Road\nBring a towel!", 40, 385, 400, { size: 17, color: INK, lh: 1.6 }),
      ...waves, r(0, 565, 480, 107, "#0ea5e9", { name: "Water" }),
    ])];
  });
  tpl("halloween-party-invitation-x4", "Costume party invitation", IV, IT + "costume party autumn night spooky", (W, H) => {
    const { t, c, r } = kit(W, H, 480);
    return [page("#2e1065", [
      c(150, 50, 180, 180, "#fde68a", { name: "Moon" }), c(190, 40, 170, 170, "#2e1065", { name: "Moon shadow" }),
      t("COSTUME", 40, 260, 400, { size: 54, bold: true, color: "#fb923c", align: "center", ls: 4 }),
      t("PARTY", 40, 334, 400, { size: 54, bold: true, color: WHITE, align: "center", ls: 10 }),
      r(160, 400, 160, 3, "#fb923c", { name: "Rule" }),
      t("Friday 31 October · 8 pm\nThe Old Barn, Mill Lane\nBest costume wins a prize", 40, 430, 400, { size: 17, color: "#e9d5ff", align: "center", lh: 1.6 }),
    ])];
  });
  tpl("corporate-event-invitation-x4", "Company event invitation", IV, IT + "corporate company event business reception", (W, H) => {
    const { t, r } = kit(W, H, 480);
    return [page("#ffffff", [
      r(0, 0, 90, 672, "#1d4ed8", { name: "Band" }),
      t("NORTHWIND", 0, 300, 90, { size: 14, bold: true, color: WHITE, align: "center", rot: -90, ls: 4 }),
      t("You are invited", 120, 90, 320, { size: 18, color: "#1d4ed8" }),
      t("Annual Partner Evening", 120, 120, 330, { size: 36, bold: true, color: INK, lh: 1.1 }),
      t("DATE", 120, 290, 150, { size: 12, bold: true, color: MUTED, ls: 3 }), t("Thu 14 Sept", 120, 310, 160, { size: 18, bold: true, color: INK }),
      t("TIME", 290, 290, 150, { size: 12, bold: true, color: MUTED, ls: 3 }), t("6:30 pm", 290, 310, 150, { size: 18, bold: true, color: INK }),
      t("PLACE", 120, 370, 150, { size: 12, bold: true, color: MUTED, ls: 3 }), t("Skyline Rooftop, 200 King Street", 120, 390, 320, { size: 18, bold: true, color: INK }),
      r(120, 470, 320, 1.5, "#cbd5e1", { name: "Rule" }),
      t("Please reply by 1 September", 120, 490, 320, { size: 15, color: MUTED }),
    ])];
  });
  tpl("tea-party-invitation-x4", "Afternoon tea invitation", IV, IT + "tea party afternoon tea birthday garden", (W, H) => {
    const { t, c, e } = kit(W, H, 480);
    const dots = Array.from({ length: 12 }, (_, i) => c(i * 42 - 6, -18, 48, 48, "#a7f3d0", { name: "Scallop" }));
    return [page("#f0fdfa", [
      ...dots, ...dots.map((d) => ({ ...c(d.x / (W / 480), 642, 48, 48, "#a7f3d0", { name: "Scallop" }) })),
      e("icon-chai", 190, 90, 100, { c1: "#0f766e" }),
      t("You're invited to", 40, 230, 400, { size: 18, italic: true, family: "serif", color: "#0f766e", align: "center" }),
      t("Afternoon Tea", 40, 265, 400, { size: 48, family: "serif", color: INK, align: "center" }),
      t("for Grandma Ruth's 80th", 40, 335, 400, { size: 20, bold: true, color: "#0f766e", align: "center" }),
      t("Sunday 18 June · 3 pm\nThe Rose Garden Café", 40, 400, 400, { size: 17, color: INK, align: "center", lh: 1.6 }),
    ])];
  });
  tpl("class-reunion-invitation-x4", "Class reunion invitation", IV, IT + "class reunion school alumni 10 years", (W, H) => {
    const { t, c, r } = kit(W, H, 480);
    return [page("#fffbeb", [
      c(150, 60, 180, 180, "#b45309", { name: "Badge" }), c(162, 72, 156, 156, "none", { stroke: "#fde68a", sw: 3, name: "Badge ring" }),
      t("CLASS OF", 150, 110, 180, { size: 15, bold: true, color: "#fde68a", align: "center", ls: 4 }),
      t("2016", 150, 132, 180, { size: 48, bold: true, color: WHITE, align: "center" }),
      t("10-Year Reunion", 40, 280, 400, { size: 38, bold: true, color: "#78350f", align: "center" }),
      t("Old friends, old photos and a few new stories.", 60, 340, 360, { size: 16, color: MUTED, align: "center", lh: 1.4 }),
      r(60, 410, 360, 110, WHITE, { radius: 14, name: "Details box" }),
      t("Saturday 12 August · 7 pm\nRiverside High School Hall", 60, 430, 360, { size: 17, bold: true, color: INK, align: "center", lh: 1.6 }),
    ])];
  });
  tpl("holiday-dinner-invitation-x4", "Holiday dinner invitation", IV, IT + "holiday dinner winter christmas family", (W, H) => {
    const { t, c, r, e } = kit(W, H, 480);
    const balls = [[70, "#dc2626"], [190, "#facc15"], [310, "#dc2626"]].map(([x, col]) => [r(x + 29, 0, 2, 80, "#d1d5db", { name: "String" }), c(x, 80, 60, 60, col, { name: "Bauble" })]).flat();
    return [page("#14532d", [
      ...balls,
      e("deco-sparkle", 380, 120, 50, { c1: "#fde68a" }),
      t("Holiday Dinner", 40, 210, 400, { size: 46, family: "serif", bold: true, color: WHITE, align: "center" }),
      t("at the Wilsons'", 40, 275, 400, { size: 22, italic: true, family: "serif", color: "#bbf7d0", align: "center" }),
      r(170, 330, 140, 2, "#facc15", { name: "Rule" }),
      t("Saturday 23 December · 6 pm\n14 Pine Street\nBring your favourite dessert", 40, 360, 400, { size: 17, color: WHITE, align: "center", lh: 1.6 }),
    ])];
  });
  tpl("book-launch-invitation-x4", "Book launch invitation", IV, IT + "book launch author reading signing", (W, H) => {
    const { t, r } = kit(W, H, 480);
    return [page("#faf5ff", [
      r(150, 50, 180, 250, "#6d28d9", { radius: 6, name: "Book cover" }), r(150, 50, 16, 250, "#4c1d95", { name: "Book spine" }),
      t("The Quiet\nHarbour", 175, 110, 140, { size: 22, family: "serif", bold: true, color: WHITE, align: "center", lh: 1.15 }),
      t("a novel", 175, 230, 140, { size: 13, italic: true, color: "#ddd6fe", align: "center" }),
      t("BOOK LAUNCH", 40, 340, 400, { size: 20, bold: true, color: "#6d28d9", align: "center", ls: 6 }),
      t("Join author Hana Ito for a reading and signing", 60, 380, 360, { size: 20, family: "serif", color: INK, align: "center", lh: 1.35 }),
      t("Thursday 6 July · 6:30 pm\nPage Turner Books", 40, 470, 400, { size: 17, bold: true, color: INK, align: "center", lh: 1.6 }),
    ])];
  });
}
