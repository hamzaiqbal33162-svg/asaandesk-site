// More own templates: stickers, T-shirt and hoodie prints, mug wraps, photo collages and logos.
// Pure module, called once from templates.js with its helpers (KIT). Original text, colours and layouts;
// artwork comes only from our own shapes and stickers (/pdf-editor/elements.js).
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page, flow, collagePage } = k;
  const { INK, MUTED, IND, COR, TEA, AMB, ROS, WHITE, GOLD, NAVY } = k.K;
  const BROWN = "#7c4a2d", FOREST = "#166534", PINE = "#0f766e", WINE = "#b91c1c", CREAM = "#fffbf5";

  /* ================= Stickers (3 in = 288 px) ================= */
  tpl("handmade-love-sticker", "Handmade with love sticker", "sticker-round-3in", "sticker round handmade love craft packaging small business", (W, H) => [page(WHITE, [
    C(0, 0, W, H, ROS, { name: "Circle" }),
    C(14, 14, W - 28, H - 28, "none", { stroke: WHITE, sw: 3, name: "Ring" }),
    E("icon-heart", W / 2 - 30, 44, 60, { c1: WHITE, c2: GOLD, c3: "#ffe4e6" }),
    T("HANDMADE", 24, 116, W - 48, { size: 36, bold: true, color: WHITE, align: "center", ls: 2 }),
    T("with love", 24, 162, W - 48, { size: 30, family: "serif", italic: true, color: GOLD, align: "center" }),
  ])]);
  tpl("coffee-time-sticker", "Coffee time sticker", "sticker-square-3in", "sticker square coffee time cafe cup break", (W, H) => [page("#fef3c7", [
    R(10, 10, W - 20, H - 20, BROWN, { radius: 20, name: "Card" }),
    E("deco-sparkle", 214, 28, 40, { c1: GOLD }),
    E("icon-chai", W / 2 - 45, 32, 90, { c1: GOLD, c2: "#fdba74", c3: "#fef3c7" }),
    T("COFFEE\nTIME", 20, 138, W - 40, { size: 46, bold: true, color: WHITE, align: "center", lh: 1 }),
  ])]);
  tpl("eco-friendly-sticker", "Eco friendly sticker", "sticker-round-3in", "sticker round eco friendly green recycle nature", (W, H) => [page(WHITE, [
    C(0, 0, W, H, FOREST, { name: "Circle" }),
    C(12, 12, W - 24, H - 24, "none", { stroke: "#86efac", sw: 2, name: "Ring" }),
    E("icon-leaf", W / 2 - 40, 36, 80, { c1: "#86efac", c2: "#dcfce7", c3: "#bbf7d0" }),
    T("ECO\nFRIENDLY", 20, 124, W - 40, { size: 38, bold: true, color: WHITE, align: "center", lh: 1.05 }),
    T("reuse · recycle", 40, 222, W - 80, { size: 18, color: "#bbf7d0", align: "center" }),
  ])]);
  tpl("best-teacher-sticker", "Best teacher sticker", "sticker-round-3in", "sticker round teacher school award thank you", (W, H) => [page(WHITE, [
    C(0, 0, W, H, AMB, { name: "Circle" }),
    C(12, 12, W - 24, H - 24, "#fff7ed", { name: "Inner circle" }),
    E("badge-rosette", W / 2 - 34, 26, 68, { c1: IND, c2: ROS, c3: "#e0e7ff" }),
    T("BEST", 40, 112, W - 80, { size: 28, bold: true, color: IND, align: "center", ls: 8 }),
    T("TEACHER", 20, 146, W - 40, { size: 44, bold: true, color: INK, align: "center" }),
    T("ever", 40, 202, W - 80, { size: 24, family: "serif", italic: true, color: COR, align: "center" }),
  ])]);
  tpl("sale-tag-sticker", "Sale tag sticker", "sticker-square-3in", "sticker square sale tag discount offer price", (W, H) => [page(ROS, [
    E("deco-burst", 24, 24, 240, { c1: "#fb7185", c2: "#fecdd3", c3: "#ffe4e6", op: 0.45 }),
    T("SALE", 20, 70, W - 40, { size: 88, bold: true, color: WHITE, align: "center", lh: 1 }),
    T("UP TO 40% OFF", 20, 172, W - 40, { size: 26, bold: true, color: GOLD, align: "center", ls: 1 }),
    E("deco-sparkles", 214, 214, 52, { c1: WHITE, c2: GOLD }),
  ])]);
  tpl("good-job-star-sticker", "Good job star sticker", "sticker-round-3in", "sticker round good job star kids school reward", (W, H) => [page(WHITE, [
    C(0, 0, W, H, "#1e3a8a", { name: "Circle" }),
    S("star", 49, 22, 190, 182, GOLD, { points: 5, name: "Star" }),
    E("face-star-eyes", W / 2 - 32, 86, 64, {}),
    T("GOOD JOB!", 20, 210, W - 40, { size: 36, bold: true, color: WHITE, align: "center" }),
  ])]);

  /* ================= T-shirt prints (12 × 16 in = 1152 × 1536 px, transparent) ================= */
  tpl("retro-sunset-tshirt", "Retro sunset T-shirt", "tshirt", "t-shirt tshirt shirt print retro sunset summer mountains", (W, H) => [page("none", [
    C(326, 160, 500, 500, AMB, { name: "Sun" }),
    ...[0, 1, 2, 3].map((i) => R(326 + i * 20, 520 + i * 40, 500 - i * 40, 16, ["#fb923c", COR, ROS, "#be185d"][i], { radius: 8, name: "Sun stripe" })),
    S("triangle", 176, 470, 480, 300, IND, { name: "Mountain" }),
    S("triangle", 500, 420, 480, 350, "#4338ca", { name: "Mountain" }),
    flow(830,
      T("STAY GOLDEN", 40, 0, W - 80, { size: 130, bold: true, color: COR, align: "center", lh: 1 }), 30,
      T("summer · 2026", 60, 0, W - 120, { size: 80, family: "serif", italic: true, color: INK, align: "center" })),
  ])]);
  tpl("team-number-tshirt", "Team name and number T-shirt", "tshirt", "t-shirt tshirt shirt print team sports jersey number", (W, H) => [page("none", [
    T("FALCONS", 40, 200, W - 80, { size: 190, bold: true, color: IND, align: "center", ls: 8 }),
    T("10", 140, 460, W - 280, { size: 560, bold: true, color: COR, align: "center", lh: 1, outline: { width: 10, color: INK } }),
    T("CAPTAIN", 60, 1110, W - 120, { size: 90, bold: true, color: INK, align: "center", ls: 20 }),
  ])]);
  tpl("city-skyline-tshirt", "City skyline T-shirt", "tshirt", "t-shirt tshirt shirt print city skyline night buildings", (W, H) => {
    const base = 860, heights = [220, 340, 260, 420, 300, 520, 360, 280, 400, 240];
    const bw = 80;
    return [page("none", [
      E("icon-moon", 780, 200, 150, { c1: GOLD, c2: AMB, c3: "#fef3c7" }),
      ...heights.map((hh, i) => R(176 + i * bw, base - hh, bw - 8, hh, i % 2 ? NAVY : IND, { name: "Building" })),
      ...heights.flatMap((hh, i) => [0, 1, 2].filter((r) => 40 + r * 70 < hh - 40).map((r) => R(176 + i * bw + 26, base - hh + 40 + r * 70, 20, 28, GOLD, { name: "Window" }))),
      R(156, base, 840, 14, INK, { name: "Street" }),
      flow(920,
        T("MY CITY", 40, 0, W - 80, { size: 190, bold: true, color: INK, align: "center", ls: 10 }), 16,
        T("CITY OF LIGHTS", 60, 0, W - 120, { size: 70, bold: true, color: COR, align: "center", ls: 16 })),
    ])];
  });
  tpl("coffee-slogan-tshirt", "But first coffee T-shirt", "tshirt", "t-shirt tshirt shirt print coffee slogan cafe funny", (W, H) => [page("none", [
    E("icon-chai", W / 2 - 180, 170, 360, { c1: BROWN, c2: "#c08457", c3: "#fde7c7" }),
    flow(620,
      T("BUT FIRST,", 60, 0, W - 120, { size: 120, bold: true, color: INK, align: "center" }), 10,
      T("COFFEE", 40, 0, W - 80, { size: 240, bold: true, color: BROWN, align: "center", lh: 1 }), 40,
      T("brewed with good vibes", 60, 0, W - 120, { size: 66, family: "serif", italic: true, color: COR, align: "center" })),
  ])]);
  tpl("mountain-adventure-tshirt", "Mountain adventure T-shirt", "tshirt", "t-shirt tshirt shirt print mountain adventure hiking outdoor", (W, H) => [page("none", [
    C(226, 140, 700, 700, "none", { stroke: TEA, sw: 18, name: "Badge ring" }),
    C(650, 260, 100, 100, AMB, { name: "Sun" }),
    S("triangle", 300, 400, 360, 320, PINE, { name: "Mountain" }),
    S("triangle", 500, 300, 360, 420, TEA, { name: "Mountain" }),
    R(300, 712, 560, 14, PINE, { radius: 7, name: "Ground" }),
    flow(900,
      T("ADVENTURE", 40, 0, W - 80, { size: 170, bold: true, color: PINE, align: "center", lh: 1 }), 24,
      T("awaits", 60, 0, W - 120, { size: 130, family: "serif", italic: true, color: AMB, align: "center", lh: 1 })),
  ])]);
  tpl("family-trip-tshirt", "Family trip T-shirt", "tshirt", "t-shirt tshirt shirt print family trip holiday travel matching", (W, H) => [page("none", [
    E("icon-sun", W / 2 - 110, 120, 220, { c1: AMB, c2: COR, c3: "#fef3c7" }),
    flow(380,
      T("FAMILY", 40, 0, W - 80, { size: 200, bold: true, color: ROS, align: "center", lh: 1 }), 0,
      T("TRIP", 40, 0, W - 80, { size: 320, bold: true, color: IND, align: "center", lh: 1 }), 30,
      T("Northern Areas · 2026", 60, 0, W - 120, { size: 72, color: INK, align: "center" })),
    E("deco-bunting", 176, 1200, 800, { c1: COR, c2: TEA, c3: GOLD }),
  ])]);
  tpl("believe-word-tshirt", "Believe word T-shirt", "tshirt", "t-shirt tshirt shirt print motivation believe word quote", (W, H) => [page("none", [
    E("deco-sparkles", 860, 360, 140, { c1: AMB, c2: COR }),
    R(226, 520, 700, 10, COR, { radius: 5, name: "Line" }),
    T("BELIEVE", 40, 560, W - 80, { size: 220, bold: true, color: INK, align: "center", ls: 6, lh: 1 }),
    R(226, 820, 700, 10, COR, { radius: 5, name: "Line" }),
    T("in yourself", 60, 860, W - 120, { size: 100, family: "serif", italic: true, color: COR, align: "center" }),
  ])]);

  /* ================= Hoodie prints (12 × 14 in = 1152 × 1344 px, transparent) ================= */
  tpl("varsity-college-hoodie", "Varsity college hoodie", "hoodie", "hoodie sweatshirt print varsity college university athletics", (W, H) => [page("none", [
    T("STATE", 40, 140, W - 80, { size: 150, bold: true, color: NAVY, align: "center", ls: 20 }),
    T("COLLEGE", 30, 320, W - 60, { size: 210, bold: true, color: WINE, align: "center", lh: 1, outline: { width: 8, color: NAVY } }),
    C(426, 600, 300, 300, NAVY, { name: "Badge" }),
    T("26", 426, 675, 300, { size: 150, bold: true, color: WHITE, align: "center", lh: 1 }),
    T("ATHLETICS DEPT.", 60, 980, W - 120, { size: 72, bold: true, color: NAVY, align: "center", ls: 10 }),
  ])]);
  tpl("gamer-hoodie", "Game on hoodie", "hoodie", "hoodie sweatshirt print gamer gaming controller player", (W, H) => [page("none", [
    R(276, 180, 600, 300, "#4338ca", { radius: 150, name: "Controller" }),
    R(356, 312, 130, 36, WHITE, { radius: 8, name: "Pad" }), R(403, 265, 36, 130, WHITE, { radius: 8, name: "Pad" }),
    C(690, 250, 56, 56, "#22c55e", { name: "Button" }), C(760, 314, 56, 56, ROS, { name: "Button" }),
    C(620, 314, 56, 56, AMB, { name: "Button" }), C(690, 378, 56, 56, "#38bdf8", { name: "Button" }),
    T("GAME ON", 30, 600, W - 60, { size: 220, bold: true, color: "#22c55e", align: "center", lh: 1, outline: { width: 8, color: INK } }),
    T("PLAYER ONE", 60, 880, W - 120, { size: 96, family: "mono", bold: true, color: INK, align: "center", ls: 8 }),
  ])]);
  tpl("run-club-hoodie", "Run club hoodie", "hoodie", "hoodie sweatshirt print run club running sports fitness", (W, H) => [page("none", [
    flow(140,
      T("RUN", 40, 0, W - 80, { size: 320, bold: true, italic: true, color: COR, align: "center", lh: 1 }), 0,
      T("CLUB", 40, 0, W - 80, { size: 320, bold: true, italic: true, color: INK, align: "center", lh: 1 }), 40,
      R(276, 0, 600, 12, COR, { radius: 6, name: "Line" }), 40,
      T("5 AM · EVERY SUNDAY", 60, 0, W - 120, { size: 72, bold: true, color: MUTED, align: "center", ls: 6 })),
    E("arrow-right", W / 2 - 90, 1100, 180, { c1: COR }),
  ])]);
  tpl("minimal-logo-hoodie", "Minimal logo hoodie", "hoodie", "hoodie sweatshirt print minimal logo brand clean", (W, H) => [page("none", [
    C(486, 420, 180, 180, INK, { name: "Logo circle" }),
    T("N", 486, 450, 180, { size: 120, bold: true, color: WHITE, align: "center", lh: 1 }),
    T("NORTH STUDIO", 60, 660, W - 120, { size: 64, bold: true, color: INK, align: "center", ls: 18 }),
    T("made to wander", 60, 760, W - 120, { size: 44, family: "serif", italic: true, color: MUTED, align: "center" }),
  ])]);
  tpl("stay-wild-hoodie", "Stay wild nature hoodie", "hoodie", "hoodie sweatshirt print nature forest trees outdoor", (W, H) => [page("none", [
    ...[[316, 220, 220, 300], [466, 140, 220, 380], [616, 220, 220, 300]].flatMap(([x, y, w, hh], i) => [
      S("triangle", x, y, w, hh, i === 1 ? FOREST : "#15803d", { name: "Tree" }),
      R(x + w / 2 - 15, y + hh, 30, 50, BROWN, { name: "Trunk" })]),
    R(296, 570, 560, 10, FOREST, { radius: 5, name: "Ground" }),
    flow(660,
      T("STAY WILD", 40, 0, W - 80, { size: 190, bold: true, color: FOREST, align: "center", lh: 1 }), 30,
      T("protect our forests", 60, 0, W - 120, { size: 72, family: "serif", italic: true, color: TEA, align: "center" })),
  ])]);
  tpl("night-owls-band-hoodie", "Band tour hoodie", "hoodie", "hoodie sweatshirt print music band tour concert", (W, H) => [page("none", [
    E("icon-moon", W / 2 - 100, 100, 200, { c1: GOLD, c2: AMB, c3: "#fef3c7" }),
    flow(360,
      T("THE", 60, 0, W - 120, { size: 90, bold: true, color: INK, align: "center", ls: 30 }), 0,
      T("NIGHT OWLS", 30, 0, W - 60, { size: 160, bold: true, color: IND, align: "center", lh: 1 }), 40,
      T("WORLD TOUR 2026", 60, 0, W - 120, { size: 84, bold: true, color: COR, align: "center", ls: 10 }), 30,
      T("Lahore · Dubai · London · Toronto", 60, 0, W - 120, { size: 54, color: INK, align: "center" })),
  ])]);
  tpl("class-of-2026-hoodie", "Class of 2026 hoodie", "hoodie", "hoodie sweatshirt print class graduation school leavers", (W, H) => [page("none", [
    E("deco-stars", W / 2 - 90, 90, 180, { c1: AMB, c2: IND }),
    flow(300,
      T("CLASS OF", 40, 0, W - 80, { size: 150, bold: true, color: INK, align: "center", ls: 16 }), 0,
      T("2026", 40, 0, W - 80, { size: 400, bold: true, color: AMB, align: "center", lh: 1, outline: { width: 10, color: INK } }), 40,
      T("we made it", 60, 0, W - 120, { size: 96, family: "serif", italic: true, color: ROS, align: "center" })),
  ])]);

  /* ================= Mug wraps (8.5 × 3.5 in = 816 × 336 px) ================= */
  tpl("best-dad-mug", "World's best dad mug", "mug", "mug cup wrap dad father gift fathers day", (W, H) => [page(WHITE, [
    T("WORLD'S\nBEST DAD", 30, 70, 360, { size: 62, bold: true, color: NAVY, lh: 1 }),
    R(30, 222, 120, 8, AMB, { radius: 4, name: "Line" }),
    E("deco-crown", 545, 40, 150, { c1: AMB, c2: COR, c3: "#fef3c7" }),
    T("Love you, Dad", 440, 214, 360, { size: 40, family: "serif", italic: true, color: COR, align: "center" }),
  ])]);
  tpl("teacher-thanks-mug", "Thank you teacher mug", "mug", "mug cup wrap teacher thank you school gift", (W, H) => [page("#fef9c3", [
    E("icon-pencil", 40, 60, 90, { c1: COR, c2: IND }),
    T("Thank you\nfor helping\nme grow", 150, 54, 300, { size: 44, bold: true, color: INK, lh: 1.1 }),
    E("deco-flower", 560, 50, 120, { c1: ROS, c2: AMB }),
    T("Best Teacher", 450, 210, 340, { size: 46, family: "serif", bold: true, color: IND, align: "center" }),
  ])]);
  tpl("coffee-quote-mug", "Coffee quote mug", "mug", "mug cup wrap coffee quote ideas morning", (W, H) => [page(INK, [
    T("Coffee in,", 40, 80, 380, { size: 64, bold: true, color: GOLD }),
    T("good ideas out.", 40, 166, 400, { size: 50, family: "serif", italic: true, color: WHITE }),
    E("icon-chai", 560, 70, 180, { c1: GOLD, c2: COR, c3: "#fde7c7" }),
  ])]);
  tpl("name-pattern-mug", "Name and pattern mug", "mug", "mug cup wrap name personal pattern dots gift", (W, H) => [page(WHITE, [
    ...[0, 1, 2].flatMap((r) => Array.from({ length: 13 }, (_, i) => C(18 + i * 62 + (r % 2) * 31, 22 + r * 120, 24, 24, r === 1 ? TEA : ROS, { op: 0.3, name: "Dot" }))),
    R(248, 104, 320, 128, WHITE, { radius: 64, name: "Name pill", stroke: ROS, sw: 4 }),
    T("Sara", 248, 122, 320, { size: 76, family: "serif", bold: true, italic: true, color: ROS, align: "center", lh: 1.1 }),
  ])]);
  tpl("birthday-mug", "Happy birthday mug", "mug", "mug cup wrap birthday party gift celebration", (W, H) => [page("#fce7f3", [
    E("deco-balloons", 30, 30, 150, { c1: ROS, c2: IND, c3: "#ffe4e6" }),
    T("Happy\nBirthday!", 220, 84, 380, { size: 72, bold: true, color: ROS, align: "center", lh: 1 }),
    E("icon-gift", 640, 90, 130, { c1: IND, c2: AMB, c3: "#e8e5fe" }),
    E("deco-confetti", 600, 230, 80, { op: 0.8 }),
  ])]);
  tpl("meeting-email-mug", "Office meeting mug", "mug", "mug cup wrap office work funny meeting colleague", (W, H) => [page(WHITE, [
    T("This meeting\ncould have\nbeen an email", 40, 56, 380, { size: 46, bold: true, color: INK, lh: 1.1 }),
    E("face-wink", 560, 54, 150, {}),
    T("(but I'm glad you're here)", 440, 236, 360, { size: 24, italic: true, color: MUTED, align: "center" }),
  ])]);
  tpl("plant-lover-mug", "Plant lover mug", "mug", "mug cup wrap plant lover garden green gift", (W, H) => [page("#ecfdf5", [
    E("deco-sprig", 30, 50, 140, { c1: TEA, c2: PINE }),
    T("Plant\nlover", 190, 70, 250, { size: 80, family: "serif", bold: true, italic: true, color: FOREST, lh: 1 }),
    E("icon-leaf", 570, 40, 110, { c1: "#22c55e", c2: FOREST }),
    T("Grow where you are planted", 450, 190, 340, { size: 34, bold: true, color: PINE, align: "center", lh: 1.15 }),
  ])]);

  /* ================= Photo collages ================= */
  tpl("birthday-photo-collage", "Birthday photo collage", "collage-square", "collage photos birthday party album memories", (W, H) => [collagePage(W, H, "mosaic", { gap: 14, radius: 18, bg: GOLD }, [
    E("deco-balloons", 30, 20, 140, { c1: ROS, c2: IND }),
    T("Happy Birthday, Zara!", 140, H - 150, W - 280, { size: 52, bold: true, color: ROS, align: "center", bg: { color: WHITE, pad: 0.4, radius: 0.5 } }),
  ])]);
  tpl("wedding-album-collage", "Wedding album collage", "collage-landscape", "collage photos wedding album marriage memories", (W, H) => [collagePage(W, H, "three", { gap: 24, radius: 0, bg: CREAM }, [
    T("Hina & Omar", 50, H - 140, 440, { size: 48, family: "serif", italic: true, bold: true, color: "#b8860b", align: "center", bg: { color: CREAM, pad: 0.4, radius: 0.2 } }),
  ])]);
  tpl("travel-moodboard-collage", "Travel moodboard", "collage-square", "collage photos travel moodboard trip places", (W, H) => [collagePage(W, H, "six", { gap: 20, radius: 24, bg: TEA }, [
    T("Travel moodboard", 240, H / 2 - 40, W - 480, { size: 48, bold: true, color: PINE, align: "center", bg: { color: WHITE, pad: 0.4, radius: 0.5 } }),
  ])]);
  tpl("before-after-collage", "Before and after", "collage-landscape", "collage photos before after compare makeover result", (W, H) => [collagePage(W, H, "two", { gap: 12, bg: INK }, [
    T("BEFORE", 40, 40, 260, { size: 40, bold: true, color: WHITE, align: "center", bg: { color: INK, pad: 0.4, radius: 0.5 } }),
    T("AFTER", W / 2 + 40, 40, 260, { size: 40, bold: true, color: INK, align: "center", bg: { color: GOLD, pad: 0.4, radius: 0.5 } }),
  ])]);

  /* ================= Logos (1000 × 1000 px) ================= */
  tpl("bakery-badge-logo", "Bakery badge logo", "logo", "logo badge bakery cake bread sweets", (W, H) => [page(WHITE, [
    C(150, 150, 700, 700, "#7c2d12", { name: "Badge" }),
    C(190, 190, 620, 620, "none", { stroke: "#fde68a", sw: 5, name: "Ring" }),
    E("deco-sprig", 430, 230, 140, { c1: "#fde68a", c2: "#fbbf24" }),
    T("SWEET CRUMB", 200, 420, 600, { size: 64, family: "serif", bold: true, color: "#fde68a", align: "center", lh: 1.05 }),
    T("BAKERY", 200, 520, 600, { size: 56, bold: true, color: WHITE, align: "center", ls: 16 }),
    T("SINCE 2026", 200, 640, 600, { size: 30, color: "#fed7aa", align: "center", ls: 10 }),
  ])]);
  tpl("tech-monogram-logo", "Tech startup monogram", "logo", "logo monogram tech startup software app", (W, H) => [page(WHITE, [
    R(330, 180, 340, 340, IND, { radius: 80, name: "Tile" }),
    T("nx", 330, 245, 340, { size: 190, bold: true, color: WHITE, align: "center", lh: 1 }),
    C(630, 150, 80, 80, TEA, { name: "Dot" }),
    T("nexora", 100, 580, 800, { size: 130, bold: true, color: INK, align: "center" }),
    T("SOFTWARE LABS", 100, 760, 800, { size: 34, color: MUTED, align: "center", ls: 14 }),
  ])]);
  tpl("fitness-gym-logo", "Fitness gym logo", "logo", "logo fitness gym training sports health", (W, H) => [page(WHITE, [
    E("shape-shield", 320, 130, 360, { c1: INK, c2: INK, c3: INK }),
    R(390, 318, 220, 28, WHITE, { radius: 6, name: "Bar" }),
    R(370, 276, 34, 112, ROS, { radius: 8, name: "Weight" }), R(596, 276, 34, 112, ROS, { radius: 8, name: "Weight" }),
    T("IRONFIT", 100, 560, 800, { size: 130, bold: true, italic: true, color: INK, align: "center" }),
    T("GYM & TRAINING", 100, 730, 800, { size: 40, bold: true, color: ROS, align: "center", ls: 12 }),
  ])]);
  tpl("daily-grind-cafe-logo", "Cafe logo", "logo", "logo cafe coffee shop books bakes", (W, H) => [page(WHITE, [
    C(380, 160, 240, 240, TEA, { name: "Circle" }),
    E("icon-chai", 420, 200, 160, { c1: WHITE, c2: "#ccfbf1", c3: "#99f6e4" }),
    T("Daily Grind", 100, 450, 800, { size: 120, family: "serif", bold: true, italic: true, color: INK, align: "center" }),
    R(350, 620, 300, 4, TEA, { name: "Line" }),
    T("COFFEE · BAKES · BOOKS", 100, 650, 800, { size: 34, color: MUTED, align: "center", ls: 8 }),
  ])]);
  tpl("law-firm-logo", "Law firm logo", "logo", "logo law firm legal advocate lawyer", (W, H) => [page(WHITE, [
    S("triangle", 370, 190, 260, 100, NAVY, { name: "Roof" }),
    R(385, 296, 230, 16, NAVY, { name: "Beam" }),
    ...[0, 1, 2, 3].map((i) => R(400 + i * 56, 324, 30, 150, NAVY, { name: "Pillar" })),
    R(370, 484, 260, 22, NAVY, { name: "Base" }),
    T("MALIK & ASSOCIATES", 60, 570, 880, { size: 66, family: "serif", bold: true, color: NAVY, align: "center", ls: 3 }),
    R(380, 680, 240, 3, "#b8860b", { name: "Line" }),
    T("ADVOCATES · LEGAL ADVISORS", 60, 710, 880, { size: 30, color: "#b8860b", align: "center", ls: 8 }),
  ])]);
}
