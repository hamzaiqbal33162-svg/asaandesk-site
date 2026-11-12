// ROUND 2 layout batch (filled by a helper; see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md). Pure module, no imports.
// 20 own Instagram layouts (14 square 1080 × 1080, 6 portrait 1080 × 1350), about 40% photo collages / moodboards /
// photo dumps, the rest sale, quote, birthday, fashion, announcement, real estate, food and event posts.
// Four of them are carousels (several pages: cover, content, call to action).
export default function add(k) {
  const { tpl, T, R, C, E, F, page, flow } = k;
  const { INK, WHITE } = k.K;
  const P = "instagram-post", PP = "instagram-portrait";
  const r1 = (v) => Math.round(v * 10) / 10;

  // Rotates layers laid out upright around the centre of box b, so a card, its photo and its tape turn together.
  function turn(b, deg, layers) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    for (const l of layers) {
      const dx = l.x + l.w / 2 - cx, dy = l.y + l.h / 2 - cy;
      l.x = r1(cx + dx * c - dy * s - l.w / 2);
      l.y = r1(cy + dx * s + dy * c - l.h / 2);
      l.rotation = (l.rotation || 0) + deg;
    }
    return layers;
  }
  // A printed photo: soft shadow, paper card, photo frame (m = border, foot = bottom border), optional caption and tape.
  function snap(x, y, w, h, deg, o = {}) {
    const m = o.m ?? 18, foot = o.foot ?? m;
    const parts = [];
    if (o.shadow !== false) parts.push(R(x + 6, y + 10, w, h, "#000000", { op: 0.13, name: "Photo shadow" }));
    parts.push(R(x, y, w, h, o.card || WHITE, { name: "Photo card" }));
    parts.push(F(x + m, y + m, w - 2 * m, h - m - foot, { name: o.name || "Photo" }));
    if (o.cap) {
      const t = T(o.cap, x + m, 0, w - 2 * m, { size: o.capSize || 30, family: "serif", italic: true, color: o.capColor || "#44403c", align: "center", name: "Caption" });
      t.y = y + h - foot + (foot - t.h) / 2;
      parts.push(t);
    }
    if (o.tape) parts.push(R(x + w / 2 - 70, y - 20, 140, 42, o.tape, { op: 0.8, rot: o.tapeRot ?? -5, name: "Tape" }));
    return turn({ x, y, w, h }, deg, parts);
  }
  // Text centred vertically in a box (buttons, circles).
  const mid = (s, x, y, w, h, o) => { const t = T(s, x, y, w, { align: "center", ...o }); t.y = r1(y + (h - t.h) / 2); return t; };
  const pill = (s, x, y, w, h, fill, color, size = 34) => [R(x, y, w, h, fill, { radius: h / 2, name: "Button" }), mid(s, x, y, w, h, { size, bold: true, color, name: "Button text" })];

  /* ---------- 1. Photo dump: scattered polaroids on kraft paper ---------- */
  tpl("polaroid-photo-dump-ig4", "Kraft polaroid photo dump post", P, "instagram photo dump polaroid collage weekend memories friends aesthetic", () => [page("#efe6d8", [
    T("weekend", 70, 44, 500, { size: 112, family: "serif", italic: true, color: INK, lh: 1, name: "Title" }),
    T("PHOTO DUMP", 76, 170, 500, { size: 38, bold: true, color: "#b45309", ls: 12, name: "Kicker" }),
    E("deco-sparkles", 470, 40, 110, { c1: "#f59e0b", c2: "#b45309" }),
    snap(650, 70, 330, 384, 6, { foot: 72, tape: "#fde68a", cap: "brunch club" }),
    snap(70, 290, 350, 410, -7, { m: 20, foot: 74, tape: "#fecaca" }),
    snap(400, 370, 320, 380, 4, { foot: 70, cap: "golden hour" }),
    snap(690, 510, 320, 380, -5, { foot: 70, tape: "#bae6fd", tapeRot: 6 }),
    snap(120, 620, 320, 370, 8, { foot: 66, cap: "late-night fries" }),
    T("saturday, mostly sunshine", 520, 965, 500, { size: 34, family: "serif", italic: true, color: "#78350f", align: "right", name: "Caption" }),
  ])]);

  /* ---------- 2. Moodboard: asymmetric grid, palette swatches, note card ---------- */
  tpl("neutral-moodboard-ig4", "Neutral tones moodboard post", P, "instagram moodboard mood board collage aesthetic neutral inspiration photos palette", () => [page("#f5f0ea", [
    T("MOODBOARD", 60, 56, 600, { size: 44, bold: true, color: "#3f3a36", ls: 14, name: "Title" }),
    T("autumn edit · vol. 03", 60, 114, 600, { size: 30, family: "serif", italic: true, color: "#8a7f74", name: "Subtitle" }),
    ["#e9dccb", "#c8b6a6", "#a4907c", "#6f5f4e"].map((c, i) => C(744 + i * 70, 64, 60, 60, c, { stroke: WHITE, sw: 4, name: "Colour swatch" })),
    F(60, 180, 520, 560, { name: "Main photo" }),
    F(600, 180, 420, 270, { name: "Photo 2" }),
    F(600, 470, 200, 270, { name: "Photo 3" }),
    F(820, 470, 200, 270, { name: "Photo 4" }),
    F(60, 760, 300, 260, { name: "Photo 5" }),
    R(380, 760, 300, 260, "#e7ddd1", { name: "Note card" }),
    mid("Warm tones,\nsoft linen,\nslow mornings.", 400, 760, 260, 260, { size: 36, family: "serif", italic: true, color: "#3f3a36", lh: 1.25, name: "Note" }),
    F(700, 760, 320, 260, { name: "Photo 6" }),
  ])]);

  /* ---------- 3. Film strip: tilted negative strip with three photos ---------- */
  tpl("film-strip-reel-ig4", "Sunset film strip memories post", P, "instagram film strip photo collage memories summer reel retro photos", () => {
    const b = { x: -60, y: 330, w: 1200, h: 430 };
    const strip = [R(b.x, b.y, b.w, b.h, "#151515", { name: "Film strip" })];
    for (let i = 0; i < 18; i++) for (const yy of [b.y + 18, b.y + b.h - 44]) strip.push(R(b.x + 22 + i * 68, yy, 34, 26, "#f5f5f4", { radius: 5, name: "Sprocket hole" }));
    for (let i = 0; i < 3; i++) strip.push(F(40 + i * 345, b.y + 70, 320, b.h - 140, { name: `Photo ${i + 1}` }));
    turn(b, -5, strip);
    return [page(["#fb923c", "#e11d48", 140], [
      T("SUMMER REEL", 0, 96, 1080, { size: 84, bold: true, color: WHITE, align: "center", ls: 12, name: "Title" }),
      T("June to August, frame by frame", 0, 202, 1080, { size: 36, family: "serif", italic: true, color: "#ffe4e6", align: "center", name: "Subtitle" }),
      strip,
      T("Swipe through our favourite days  →", 0, 905, 1080, { size: 36, bold: true, color: WHITE, align: "center", name: "Call to action" }),
      E("deco-sparkle", 70, 880, 90, { c1: "#fde68a" }),
      E("deco-sparkle", 950, 40, 80, { c1: "#fde68a" }),
    ])];
  });

  /* ---------- 4. Arch trio: three capsule photos, staggered ---------- */
  tpl("golden-hour-arches-ig4", "Golden hour arch photo trio post", P, "instagram photo collage arch frames golden hour sunset lifestyle aesthetic trio", () => [page("#fdf6ec", [
    T("golden hour", 0, 56, 1080, { size: 104, family: "serif", italic: true, color: "#9a3412", align: "center", lh: 1.1, name: "Title" }),
    [[90, 300], [400, 220], [710, 300]].flatMap(([x, y], i) => [
      R(x + 18, y + 18, 280, 600, "none", { radius: 140, stroke: "#f59e0b", sw: 3, name: "Arch outline" }),
      F(x, y, 280, 600, { shape: "rounded", radius: 140, name: `Photo ${i + 1}` }),
    ]),
    E("deco-sparkle", 150, 196, 64, { c1: "#f59e0b" }),
    E("deco-sparkle", 860, 200, 56, { c1: "#f59e0b" }),
    T("Chasing light, one evening at a time", 0, 962, 1080, { size: 36, color: "#7c2d12", align: "center", name: "Caption" }),
  ])]);

  /* ---------- 5. Sale: half photo, half bold type ---------- */
  tpl("season-sale-split-ig4", "Green end of season sale post", P, "instagram sale end of season discount promo fashion shop offer code", () => [page("#1f3d2b", [
    F(0, 0, 540, 1080, { name: "Product photo" }),
    R(540, 0, 16, 1080, "#f97316", { name: "Accent stripe" }),
    T("END OF SEASON", 610, 130, 420, { size: 36, bold: true, color: "#f6efe3", ls: 6, name: "Kicker" }),
    T("SALE", 604, 182, 440, { size: 150, bold: true, color: "#f6efe3", lh: 0.95, name: "Headline" }),
    T("up to", 610, 340, 420, { size: 40, family: "serif", italic: true, color: "#fdba74", name: "Up to" }),
    T("60% OFF", 606, 392, 440, { size: 96, bold: true, color: "#f97316", lh: 1, name: "Discount" }),
    T("Selected styles, in store and online until Sunday.", 610, 520, 400, { size: 30, color: "#d9e4dc", lh: 1.35, name: "Details" }),
    pill("Shop the sale", 610, 680, 320, 86, "#f6efe3", "#1f3d2b"),
    T("Use code SEASON60\nat checkout", 610, 820, 420, { size: 28, family: "mono", bold: true, color: "#fdba74", lh: 1.35, name: "Code" }),
    E("badge-sale", 40, 930, 210, { c1: "#f97316", c2: WHITE, rot: -8 }),
  ])]);

  /* ---------- 6. Birthday: round photo, bunting and balloons ---------- */
  tpl("birthday-photo-circle-ig4", "Pink birthday photo wishes post", P, "instagram birthday happy birthday wishes photo celebration party balloons", () => [page(["#fce7f3", "#ede9fe", 160], [
    E("deco-bunting", 0, 0, 540, { c1: "#f472b6", c2: "#a78bfa", c3: "#facc15" }),
    E("deco-bunting", 540, 0, 540, { c1: "#f472b6", c2: "#a78bfa", c3: "#facc15" }),
    C(330, 196, 420, 420, "#f9a8d4", { name: "Photo ring" }),
    F(348, 214, 384, 384, { shape: "circle", name: "Birthday photo" }),
    E("deco-balloons", 70, 250, 200, { c1: "#f472b6", c2: "#a78bfa", c3: "#facc15" }),
    E("deco-balloons", 820, 300, 180, { c1: "#60a5fa", c2: "#f472b6", c3: "#facc15" }),
    T("Happy Birthday", 40, 650, 1000, { size: 108, family: "serif", bold: true, color: "#831843", align: "center", name: "Headline" }),
    T("to our favourite human, Maya!", 60, 792, 960, { size: 42, color: "#9d174d", align: "center", name: "Name" }),
    pill("turns 30", 400, 890, 280, 80, "#db2777", WHITE, 36),
    E("deco-confetti", 40, 880, 150, { c1: "#f472b6", c2: "#facc15" }),
    E("deco-confetti", 890, 880, 150, { c1: "#a78bfa", c2: "#facc15" }),
  ])]);

  /* ---------- 7. Quote: highlighter lines on dark ---------- */
  tpl("highlight-quote-ig4", "Bold highlighter quote post", P, "instagram quote motivation mindset typography highlight words monday", () => {
    const hl = (s, y, w, c) => T(s, 90, y, w, { size: 96, bold: true, color: "#111827", lh: 1.1, bg: { color: c, pad: 0.16, radius: 0.08 }, name: "Quote line" });
    return [page("#111827", [
      T("MONDAY REMINDER", 90, 150, 700, { size: 30, bold: true, color: "#facc15", ls: 8, name: "Kicker" }),
      hl("Be the energy", 260, 676, "#facc15"),
      hl("you want", 406, 456, "#facc15"),
      hl("to attract.", 552, 478, "#f472b6"),
      R(90, 790, 120, 6, "#f472b6", { name: "Rule" }),
      T("Save this for the week ahead", 90, 822, 660, { size: 36, color: "#e5e7eb", name: "Line" }),
      T("@yourhandle", 90, 880, 660, { size: 30, color: "#9ca3af", name: "Handle" }),
      E("deco-sparkles", 850, 110, 150, { c1: "#facc15", c2: "#f472b6" }),
      E("deco-squiggle", 790, 850, 220, { c1: "#facc15" }),
    ])];
  });

  /* ---------- 8. Real estate: three photos, price and open house blocks ---------- */
  tpl("just-listed-home-ig4", "Navy just listed real estate post", P, "instagram real estate just listed house home for sale property listing realtor open house", () => [page(WHITE, [
    F(40, 40, 640, 620, { name: "House photo" }),
    F(700, 40, 340, 300, { name: "Room photo" }),
    F(700, 360, 340, 300, { name: "Room photo" }),
    E("badge-new", 570, 60, 96, { c1: "#c8a96a", c2: WHITE, rot: 10 }),
    T("Just listed", 40, 684, 540, { size: 80, family: "serif", bold: true, color: "#0f2a44", name: "Headline" }),
    E("icon-home", 606, 696, 70, { c1: "#c8a96a" }),
    T("12 Cedar Lane, Riverside", 40, 790, 640, { size: 36, color: INK, name: "Address" }),
    T("4 beds  ·  3 baths  ·  2,150 sq ft", 40, 852, 640, { size: 30, bold: true, color: "#0f2a44", name: "Specs" }),
    R(40, 912, 640, 2, "#e2e8f0", { name: "Rule" }),
    T("Jordan Lee, Realtor\n(555) 012-3456  ·  yourrealty.com", 40, 932, 640, { size: 28, color: "#64748b", lh: 1.35, name: "Agent" }),
    R(700, 680, 340, 180, "#0f2a44", { name: "Price block" }),
    T("Offered at", 700, 712, 340, { size: 28, color: "#cbd5e1", align: "center", name: "Price label" }),
    T("$685,000", 700, 754, 340, { size: 60, bold: true, color: WHITE, align: "center", name: "Price" }),
    R(700, 880, 340, 160, "#c8a96a", { name: "Open house block" }),
    T("OPEN HOUSE", 700, 906, 340, { size: 30, bold: true, color: "#0f2a44", align: "center", ls: 4, name: "Open house" }),
    T("Sunday, 1 – 4 pm", 700, 956, 340, { size: 36, color: "#0f2a44", align: "center", name: "Open house time" }),
  ])]);

  /* ---------- 9. Food: dark menu board with a round dish photo ---------- */
  tpl("brunch-menu-board-ig4", "Dark brunch menu board post", P, "instagram food menu brunch cafe restaurant prices weekend dishes", () => {
    const item = (y, name, price, desc) => [
      T(name, 70, y, 390, { size: 36, bold: true, color: "#fafaf9", name: "Dish" }),
      T(price, 470, y, 100, { size: 36, bold: true, color: "#fbbf24", align: "right", name: "Price" }),
      T(desc, 70, y + 50, 500, { size: 26, color: "#a8a29e", name: "Description" }),
    ];
    return [page("#1c1917", [
      T("Brunch", 70, 60, 500, { size: 130, family: "serif", italic: true, bold: true, color: "#fbbf24", lh: 1.1, name: "Title" }),
      T("SAT & SUN  ·  9 AM TO 2 PM", 74, 222, 500, { size: 26, bold: true, color: "#d6d3d1", ls: 4, name: "Hours" }),
      R(70, 290, 500, 2, "#57534e", { name: "Rule" }),
      item(330, "Avocado toast", "$9", "sourdough, chilli flakes, lime"),
      item(450, "Berry pancakes", "$11", "maple syrup, whipped butter"),
      item(570, "Shakshuka", "$12", "baked eggs, tomato, warm pita"),
      item(690, "Iced oat latte", "$5", "double shot, vanilla"),
      C(585, 205, 450, 450, "none", { stroke: "#fbbf24", sw: 4, name: "Plate ring" }),
      F(600, 220, 420, 420, { shape: "circle", name: "Dish photo" }),
      E("badge-seal", 880, 170, 150, { c1: "#f59e0b", c2: "#1c1917" }),
      T("Chef's pick", 600, 690, 420, { size: 44, family: "serif", italic: true, color: "#fbbf24", align: "center", name: "Pick" }),
      T("Shakshuka with warm pita", 600, 748, 420, { size: 28, color: "#d6d3d1", align: "center", name: "Pick dish" }),
      R(70, 880, 940, 2, "#44403c", { name: "Rule" }),
      T("Order at the counter or on yourcafe.com", 70, 910, 940, { size: 30, color: "#a8a29e", align: "center", name: "Footer" }),
      E("deco-sprig", 950, 960, 90, { c1: "#84cc16", c2: "#4d7c0f", rot: 20 }),
    ])];
  });

  /* ---------- 10. Event: date column, photo and ticket button ---------- */
  tpl("live-music-night-ig4", "Purple live music night event post", P, "instagram event live music concert gig night tickets venue", () => [page("#4c1d95", [
    R(0, 0, 300, 1080, "#facc15", { name: "Date column" }),
    T("FRI", 0, 150, 300, { size: 60, bold: true, color: "#4c1d95", align: "center", ls: 6, name: "Day" }),
    T("21", 0, 222, 300, { size: 210, bold: true, color: "#4c1d95", align: "center", lh: 1, name: "Date" }),
    T("NOV", 0, 440, 300, { size: 60, bold: true, color: "#4c1d95", align: "center", ls: 6, name: "Month" }),
    R(100, 560, 100, 6, "#4c1d95", { name: "Rule" }),
    T("8 PM", 0, 600, 300, { size: 56, bold: true, color: "#4c1d95", align: "center", name: "Time" }),
    T("doors 7:30", 0, 672, 300, { size: 32, family: "serif", italic: true, color: "#6d28d9", align: "center", name: "Doors" }),
    E("deco-stars", 90, 840, 120, { c1: "#4c1d95", c2: "#7c3aed" }),
    F(360, 60, 660, 520, { shape: "rounded", radius: 28, name: "Band photo" }),
    T("LIVE MUSIC\nNIGHT", 360, 616, 660, { size: 84, bold: true, color: WHITE, lh: 1, name: "Event" }),
    T("The Velvet Room  ·  22 Harbor St", 360, 802, 660, { size: 34, color: "#e9d5ff", name: "Venue" }),
    T("Tickets $15  ·  link in bio", 360, 856, 660, { size: 34, color: "#e9d5ff", name: "Tickets" }),
    pill("Get tickets", 360, 940, 300, 84, "#facc15", "#4c1d95"),
    E("deco-sparkles", 900, 930, 110, { c1: "#facc15", c2: "#f0abfc" }),
  ])]);

  /* ---------- 11. Fashion: magazine cover over a full photo ---------- */
  tpl("fashion-magazine-cover-ig4", "Fashion magazine cover post", P, "instagram fashion magazine cover style editorial outfit new collection", () => [page("#1c1917", [
    F(0, 0, 1080, 1080, { name: "Cover photo" }),
    R(0, 0, 1080, 330, "#000000", { op: 0.25, name: "Top shade" }),
    R(0, 846, 1080, 234, "#000000", { op: 0.35, name: "Bottom shade" }),
    T("MODE", 0, 34, 1080, { size: 230, family: "serif", bold: true, color: WHITE, align: "center", ls: 24, lh: 1, name: "Masthead" }),
    T("THE STYLE ISSUE  ·  NO. 07", 0, 270, 1080, { size: 28, bold: true, color: WHITE, align: "center", ls: 10, name: "Issue" }),
    E("badge-seal", 860, 620, 160, { c1: "#f43f5e", c2: WHITE, rot: 12 }),
    T("THE NEW NEUTRALS", 60, 866, 660, { size: 60, bold: true, color: WHITE, name: "Cover line" }),
    T("12 pieces to wear all season", 60, 948, 640, { size: 34, family: "serif", italic: true, color: WHITE, name: "Cover line 2" }),
    pill("Shop the look", 740, 892, 280, 80, WHITE, INK, 30),
  ])]);

  /* ---------- 12. Announcement: we've moved ---------- */
  tpl("weve-moved-ig4", "Teal we've moved announcement post", P, "instagram announcement moving new address location store opening news", () => [page("#ecfeff", [
    C(700, 40, 340, 340, "#cffafe", { name: "Pin halo" }),
    E("icon-location", 760, 90, 220, { c1: "#f97316" }),
    T("WE'VE\nMOVED!", 80, 110, 660, { size: 150, bold: true, color: "#0e7490", lh: 0.95, name: "Headline" }),
    E("arrow-sketch", 712, 396, 160, { c1: "#f97316", rot: 125 }),
    R(80, 560, 920, 300, WHITE, { radius: 32, stroke: "#a5f3fc", sw: 3, name: "Address card" }),
    T("FIND US AT OUR NEW HOME", 130, 600, 820, { size: 28, bold: true, color: "#0e7490", ls: 4, name: "Card kicker" }),
    T("48 Willow Street, Unit 2\nGreenfield", 130, 650, 820, { size: 52, bold: true, color: INK, lh: 1.15, name: "Address" }),
    T("Doors open Monday, 1 December", 130, 790, 820, { size: 30, color: "#64748b", name: "Date" }),
    T("Same team, more space, better coffee.", 80, 920, 920, { size: 38, family: "serif", italic: true, color: "#155e75", align: "center", name: "Line" }),
  ])]);

  /* ---------- 13. Carousel: 3 phone photo tips (5 pages) ---------- */
  tpl("photo-tips-carousel-ig4", "Orange phone photo tips carousel", P, "instagram carousel tips guide phone photography education swipe slides", () => {
    const BG = "#fff7ed", ACC = "#ea580c", DARK = "#431407";
    const tips = [
      ["Clean your lens", "A quick wipe with a soft cloth clears the haze that makes photos look flat."],
      ["Face the window light", "Soft light from the side flatters faces, food and products. Switch off the flash."],
      ["Use the grid", "Turn on the camera grid and place your subject on a line, not in the middle."],
    ];
    const cover = page(BG, [
      C(545, 55, 480, 480, "#fed7aa", { name: "Photo ring" }),
      F(560, 70, 450, 450, { shape: "circle", name: "Cover photo" }),
      T("3", 70, 40, 400, { size: 420, bold: true, color: ACC, lh: 1, name: "Number" }),
      T("phone photo tips\nthat actually work", 70, 570, 940, { size: 88, bold: true, color: DARK, lh: 1.05, name: "Title" }),
      pill("Swipe  →", 70, 900, 300, 90, DARK, WHITE, 36),
      T("SAVE THIS POST", 600, 926, 410, { size: 28, bold: true, color: ACC, ls: 4, align: "right", name: "Save note" }),
    ]);
    const tipPage = ([title, body], i) => page(BG, [
      T(`0${i + 2} / 05`, 70, 64, 300, { size: 28, family: "mono", bold: true, color: "#9a3412", name: "Page number" }),
      C(70, 150, 150, 150, ACC, { name: "Number circle" }),
      mid(String(i + 1), 70, 150, 150, 150, { size: 84, bold: true, color: WHITE, name: "Tip number" }),
      flow(350, 34,
        T(title, 70, 0, 520, { size: 68, bold: true, color: DARK, lh: 1.08, name: "Tip title" }),
        T(body, 70, 0, 520, { size: 34, color: "#57534e", lh: 1.4, name: "Tip text" })),
      F(640, 150, 370, 600, { shape: "rounded", radius: 28, name: "Example photo" }),
      R(70, 860, 940, 8, "#fed7aa", { radius: 4, name: "Progress track" }),
      R(70, 860, (940 * (i + 1)) / 3, 8, ACC, { radius: 4, name: "Progress" }),
      T(i < 2 ? "Next tip  →" : "One more thing  →", 610, 910, 400, { size: 32, bold: true, color: ACC, align: "right", name: "Next" }),
    ]);
    const end = page(BG, [
      T("Found this helpful?", 0, 170, 1080, { size: 84, bold: true, color: DARK, align: "center", name: "Headline" }),
      T("Save it for your next photo walk and send it to a friend who takes blurry photos.", 140, 300, 800, { size: 36, color: "#57534e", align: "center", lh: 1.4, name: "Text" }),
      [["icon-bookmark", "Save"], ["icon-upload", "Share"], ["icon-user", "Follow"]].flatMap(([ic, label], i) => [
        C(200 + i * 260, 500, 160, 160, "#ffedd5", { name: "Icon circle" }),
        E(ic, 240 + i * 260, 540, 80, { c1: ACC }),
        T(label, 180 + i * 260, 680, 200, { size: 32, bold: true, color: DARK, align: "center", name: "Icon label" }),
      ]),
      pill("Follow @yourhandle", 270, 830, 540, 96, ACC, WHITE, 36),
      T("05 / 05", 0, 980, 1080, { size: 26, family: "mono", bold: true, color: "#9a3412", align: "center", name: "Page number" }),
    ]);
    return [cover, ...tips.map(tipPage), end];
  });

  /* ---------- 14. Carousel: trip recap photo dump (4 pages) ---------- */
  tpl("trip-recap-carousel-ig4", "Seaside trip recap photo carousel", P, "instagram carousel travel trip recap photo dump collage holiday sea vacation", () => {
    const BG = "#fefae0", TEAL = "#0f766e", DEEP = "#134e4a";
    const num = (s, x, y, align = "left", color = "#0f766e") => T(s, x, y, 200, { size: 26, family: "mono", bold: true, color, align, name: "Page number" });
    return [
      page(BG, [
        F(60, 60, 960, 600, { shape: "rounded", radius: 28, name: "Cover photo" }),
        E("badge-seal", 830, 570, 170, { c1: "#f59e0b", c2: BG, rot: -10 }),
        T("4 days by the sea", 60, 700, 900, { size: 96, family: "serif", bold: true, color: DEEP, name: "Title" }),
        T("a little trip recap", 60, 826, 700, { size: 44, family: "serif", italic: true, color: TEAL, name: "Subtitle" }),
        num("01 / 04", 60, 964),
        pill("Swipe  →", 780, 940, 240, 80, TEAL, WHITE, 32),
      ]),
      page(BG, [
        T("Day 1 & 2", 60, 56, 600, { size: 64, family: "serif", bold: true, color: DEEP, name: "Heading" }),
        T("old town, tiled streets, too much coffee", 60, 142, 760, { size: 30, color: "#57534e", name: "Caption" }),
        num("02 / 04", 820, 72, "right"),
        F(60, 210, 470, 395, { name: "Photo 1" }), F(550, 210, 470, 395, { name: "Photo 2" }),
        F(60, 625, 470, 395, { name: "Photo 3" }), F(550, 625, 470, 395, { name: "Photo 4" }),
      ]),
      page(BG, [
        F(60, 60, 560, 820, { name: "Photo 1" }),
        F(640, 60, 380, 400, { name: "Photo 2" }),
        F(640, 480, 380, 400, { name: "Photo 3" }),
        T("Day 3  ·  the coast road", 60, 906, 760, { size: 52, family: "serif", bold: true, color: DEEP, name: "Heading" }),
        T("Best sunset of the trip, hands down.", 60, 980, 700, { size: 32, color: "#57534e", name: "Caption" }),
        num("03 / 04", 820, 986, "right"),
      ]),
      page(TEAL, [
        snap(150, 110, 350, 420, -6, { foot: 64 }),
        snap(580, 130, 350, 420, 5, { foot: 64 }),
        T("Where should we\ngo next?", 60, 600, 960, { size: 88, family: "serif", bold: true, color: BG, align: "center", lh: 1.1, name: "Headline" }),
        T("Drop your pick in the comments", 60, 816, 960, { size: 36, color: "#ccfbf1", align: "center", name: "Text" }),
        pill("Follow @yourhandle", 320, 900, 440, 84, BG, TEAL, 32),
        num("04 / 04", 820, 1010, "right", "#99f6e4"),
      ]),
    ];
  });

  /* ---------- 15. Portrait scrapbook photo dump ---------- */
  tpl("scrapbook-photo-dump-ig4", "Cream scrapbook photo dump post", PP, "instagram portrait photo dump scrapbook collage memories taped photos aesthetic", () => [page("#f3ede4", [
    E("deco-dots", 900, 50, 130, { c1: "#d6cbbd" }),
    T("little things", 70, 56, 760, { size: 110, family: "serif", italic: true, color: INK, lh: 1.1, name: "Title" }),
    T("OCTOBER  ·  PHOTO DUMP", 74, 186, 700, { size: 28, bold: true, color: "#be123c", ls: 8, name: "Kicker" }),
    snap(90, 290, 540, 620, -4, { m: 22, tape: "#fde68a" }),
    snap(600, 250, 390, 470, 6, { tape: "#fbcfe8", tapeRot: 8 }),
    snap(560, 780, 440, 400, -3, { tape: "#bfdbfe" }),
    T("coffee + rain", 110, 850, 280, { size: 30, bold: true, color: INK, align: "center", rot: -6, bg: { color: "#fde68a", pad: 0.35, radius: 0.1 }, name: "Label" }),
    C(90, 960, 330, 330, WHITE, { name: "Round mat" }),
    F(108, 978, 294, 294, { shape: "circle", name: "Photo 4" }),
    E("deco-hearts", 440, 1190, 110, { c1: "#f43f5e", c2: "#fb7185" }),
    E("deco-sparkle", 470, 1000, 60, { c1: "#f59e0b" }),
    T("the small stuff counts", 560, 1236, 460, { size: 36, family: "serif", italic: true, color: "#57534e", align: "right", name: "Caption" }),
  ])]);

  /* ---------- 16. Portrait masonry: week in pictures ---------- */
  tpl("week-in-pictures-ig4", "Week in pictures masonry collage post", PP, "instagram portrait photo collage week in pictures masonry grid weekly recap", () => {
    const day = (s, x, y) => T(s, x + 20, y + 20, 104, { size: 24, bold: true, color: WHITE, align: "center", ls: 2, bg: { color: INK, pad: 0.4, radius: 0.6 }, name: "Day label" });
    return [page("#fafaf9", [
      T("WEEK", 60, 52, 560, { size: 130, bold: true, color: INK, lh: 0.9, name: "Title" }),
      T("in pictures", 64, 172, 560, { size: 60, family: "serif", italic: true, color: "#a16207", name: "Subtitle" }),
      T("NOV 3 – 9", 660, 92, 360, { size: 36, bold: true, color: INK, align: "right", ls: 2, name: "Dates" }),
      T("vol. 45", 660, 142, 360, { size: 30, family: "serif", italic: true, color: "#78716c", align: "right", name: "Volume" }),
      F(60, 290, 470, 580, { name: "Photo 1" }), day("MON", 60, 290),
      F(60, 890, 470, 400, { name: "Photo 2" }), day("WED", 60, 890),
      F(550, 290, 470, 320, { name: "Photo 3" }), day("THU", 550, 290),
      F(550, 630, 470, 380, { name: "Photo 4" }), day("SAT", 550, 630),
      F(550, 1030, 470, 260, { name: "Photo 5" }), day("SUN", 550, 1030),
    ])];
  });

  /* ---------- 17. Portrait carousel: collection drop (3 pages) ---------- */
  tpl("linen-drop-carousel-ig4", "Linen collection drop fashion carousel", PP, "instagram portrait carousel fashion new collection drop lookbook shop launch", () => {
    const BG = "#f4f1ec", INK2 = "#111111", RUST = "#9a3412";
    const look = (y, name, price) => [
      T(name, 60, y, 700, { size: 36, color: INK2, name: "Item" }),
      T(price, 820, y, 200, { size: 36, bold: true, color: RUST, align: "right", name: "Price" }),
      R(60, y + 62, 960, 2, "#d6d3d1", { name: "Rule" }),
    ];
    return [
      page(BG, [
        F(0, 0, 1080, 980, { name: "Cover photo" }),
        T("NEW COLLECTION", 60, 60, 340, { size: 24, bold: true, color: WHITE, align: "center", ls: 6, bg: { color: INK2, pad: 0.6, radius: 0 }, name: "Tag" }),
        T("The Linen Drop", 60, 1016, 960, { size: 110, family: "serif", bold: true, color: INK2, name: "Title" }),
        T("12 pieces  ·  out this Friday", 60, 1160, 700, { size: 36, color: "#57534e", name: "Subtitle" }),
        T("01 / 03", 60, 1258, 300, { size: 26, family: "mono", bold: true, color: "#78716c", name: "Page number" }),
        T("Swipe  →", 760, 1252, 260, { size: 32, bold: true, color: RUST, align: "right", name: "Swipe" }),
      ]),
      page(BG, [
        T("The looks", 60, 64, 600, { size: 72, family: "serif", bold: true, color: INK2, name: "Heading" }),
        T("02 / 03", 820, 92, 200, { size: 26, family: "mono", bold: true, color: "#78716c", align: "right", name: "Page number" }),
        F(60, 200, 470, 700, { name: "Look 1" }),
        F(550, 200, 470, 340, { name: "Look 2" }),
        F(550, 560, 470, 340, { name: "Look 3" }),
        look(950, "Relaxed linen shirt", "$58"),
        look(1030, "Wide-leg trousers", "$72"),
        look(1110, "Woven market tote", "$40"),
        T("Sizes XS to XL  ·  three colours", 60, 1234, 960, { size: 28, color: "#78716c", name: "Note" }),
      ]),
      page(INK2, [
        C(275, 105, 530, 530, "none", { stroke: BG, sw: 3, name: "Photo ring" }),
        F(290, 120, 500, 500, { shape: "circle", name: "Detail photo" }),
        T("Shop the drop", 0, 690, 1080, { size: 110, family: "serif", bold: true, color: BG, align: "center", name: "Headline" }),
        T("Friday, 10 am  ·  link in bio", 0, 840, 1080, { size: 40, color: "#d6d3d1", align: "center", name: "When" }),
        pill("Set a reminder", 330, 950, 420, 96, BG, INK2, 36),
        T("Free shipping on orders over $80", 0, 1110, 1080, { size: 30, color: "#a8a29e", align: "center", name: "Note" }),
        T("03 / 03", 0, 1250, 1080, { size: 26, family: "mono", bold: true, color: "#a8a29e", align: "center", name: "Page number" }),
      ]),
    ];
  });

  /* ---------- 18. Portrait carousel: recipe (4 pages) ---------- */
  tpl("tomato-pasta-recipe-carousel-ig4", "Tomato pasta recipe carousel", PP, "instagram portrait carousel food recipe pasta cooking ingredients steps kitchen", () => {
    const BG = "#fff8e7", ACC = "#c2410c", GREEN = "#4d7c0f", INK3 = "#292524";
    const num = (s, y, color = "#a8a29e") => T(s, 760, y, 260, { size: 26, family: "mono", bold: true, color, align: "right", name: "Page number" });
    const steps = [
      "Boil the pasta in salted water until just tender. Keep a cup of the water.",
      "Warm the oil, add the garlic for a minute, then the tomatoes. Simmer for 8 minutes.",
      "Stir in the cream and season with salt and pepper.",
      "Toss the pasta through the sauce, loosen with pasta water and top with basil.",
    ];
    return [
      page(BG, [
        F(60, 60, 960, 820, { shape: "rounded", radius: 40, name: "Dish photo" }),
        C(800, 670, 220, 220, ACC, { name: "Time badge" }),
        mid("20\nmin", 800, 670, 220, 220,{ size: 54, bold: true, color: WHITE, lh: 1, name: "Time" }),
        T("Creamy tomato pasta", 60, 916, 960, { size: 86, family: "serif", bold: true, color: INK3, name: "Title" }),
        T("Serves 2  ·  one pan  ·  weeknight easy", 60, 1036, 960, { size: 36, color: "#57534e", name: "Subtitle" }),
        pill("Recipe inside  →", 60, 1160, 360, 90, GREEN, WHITE, 34),
        num("01 / 04", 1190),
      ]),
      page(BG, [
        T("You'll need", 60, 76, 640, { size: 84, family: "serif", bold: true, color: INK3, name: "Heading" }),
        T("INGREDIENTS FOR 2", 64, 190, 640, { size: 30, bold: true, color: ACC, ls: 4, name: "Kicker" }),
        C(705, 45, 330, 330, "#fde68a", { name: "Photo ring" }),
        F(720, 60, 300, 300, { shape: "circle", name: "Ingredients photo" }),
        ["250 g spaghetti", "2 cloves garlic, sliced", "1 can chopped tomatoes", "120 ml cream", "1 tbsp olive oil", "A handful of fresh basil", "Salt, pepper and parmesan"].flatMap((s, i) => [
          C(60, 432 + i * 100, 26, 26, ACC, { name: "Bullet" }),
          T(s, 112, 420 + i * 100, 900, { size: 40, color: INK3, name: "Ingredient" }),
        ]),
        T("Swap the cream for coconut milk to keep it dairy-free.", 60, 1150, 960, { size: 32, family: "serif", italic: true, color: GREEN, name: "Tip" }),
        num("02 / 04", 1262),
      ]),
      page(BG, [
        T("How to make it", 60, 76, 960, { size: 84, family: "serif", bold: true, color: INK3, name: "Heading" }),
        steps.flatMap((s, i) => [
          C(60, 250 + i * 210, 90, 90, ACC, { name: "Step circle" }),
          mid(String(i + 1), 60, 250 + i * 210, 90, 90, { size: 44, bold: true, color: WHITE, name: "Step number" }),
          T(s, 180, 252 + i * 210, 840, { size: 36, color: INK3, lh: 1.35, name: "Step" }),
        ]),
        R(60, 1100, 960, 120, "#fde68a", { radius: 24, name: "Tip card" }),
        mid("Tip: the starchy pasta water makes the sauce silky.", 90, 1100, 900, 120, { size: 32, color: INK3, name: "Tip" }),
        num("03 / 04", 1262),
      ]),
      page(ACC, [
        C(225, 85, 630, 630, "none", { stroke: "#fed7aa", sw: 4, name: "Photo ring" }),
        F(240, 100, 600, 600, { shape: "circle", name: "Your plate" }),
        E("icon-heart", 90, 110, 100, { c1: "#fed7aa" }),
        E("deco-sparkles", 880, 600, 130, { c1: "#fde68a", c2: WHITE }),
        T("Made it?", 0, 770, 1080, { size: 120, family: "serif", bold: true, color: "#fff8e7", align: "center", name: "Headline" }),
        T("Tag @yourkitchen so we can see your plate", 140, 930, 800, { size: 40, color: "#ffedd5", align: "center", lh: 1.3, name: "Text" }),
        pill("Save for later", 290, 1100, 500, 96, "#fff8e7", ACC, 36),
        T("04 / 04", 0, 1262, 1080, { size: 26, family: "mono", bold: true, color: "#fed7aa", align: "center", name: "Page number" }),
      ]),
    ];
  });

  /* ---------- 19. Portrait sale: buy one get one ---------- */
  tpl("buy-one-get-one-ig4", "Red buy one get one free sale post", PP, "instagram portrait sale promo buy one get one free bogo offer shop weekend", () => [page("#e11d48", [
    E("badge-free", 40, 40, 190, { c1: "#facc15", c2: "#7f1d1d", rot: -12 }),
    T("BUY 1\nGET 1", 0, 70, 1080, { size: 200, bold: true, color: "#fff1f2", align: "center", lh: 0.9, name: "Headline" }),
    T("free on every summer tee", 0, 448, 1080, { size: 52, family: "serif", italic: true, color: "#ffe4e6", align: "center", name: "Offer" }),
    F(70, 560, 440, 520, { shape: "rounded", radius: 32, name: "Product 1" }),
    F(570, 560, 440, 520, { shape: "rounded", radius: 32, name: "Product 2" }),
    C(470, 750, 140, 140, "#facc15", { stroke: "#e11d48", sw: 8, name: "Plus circle" }),
    mid("+", 470, 750, 140, 140, { size: 100, bold: true, color: "#e11d48", lh: 1, name: "Plus" }),
    T("This weekend only  ·  in store and online", 0, 1118, 1080, { size: 36, bold: true, color: WHITE, align: "center", name: "Details" }),
    pill("Shop now", 390, 1200, 300, 90, "#facc15", "#7f1d1d", 38),
  ])]);

  /* ---------- 20. Portrait wedding photo collage ---------- */
  tpl("wedding-moments-collage-ig4", "Ivory wedding moments photo collage post", PP, "instagram portrait wedding photo collage couple marriage thank you memories", () => [page("#faf7f2", [
    R(220, 70, 640, 840, "none", { radius: 320, stroke: "#c9b18a", sw: 3, name: "Arch outline" }),
    F(240, 90, 600, 800, { shape: "rounded", radius: 300, name: "Couple photo" }),
    R(76, 650, 300, 300, "#000000", { op: 0.12, rot: -5, name: "Photo shadow" }),
    F(70, 640, 300, 300, { border: { color: WHITE, width: 12 }, rot: -5, name: "Photo 2" }),
    R(716, 670, 300, 300, "#000000", { op: 0.12, rot: 4, name: "Photo shadow" }),
    F(710, 660, 300, 300, { border: { color: WHITE, width: 12 }, rot: 4, name: "Photo 3" }),
    E("deco-sprig", 40, 520, 140, { c1: "#7c8b6f", c2: "#5f6b52", rot: -20 }),
    E("deco-sprig", 920, 540, 130, { c1: "#7c8b6f", c2: "#5f6b52", rot: 25 }),
    T("Amelia & James", 40, 990, 1000, { size: 96, family: "serif", italic: true, color: "#3f3a2e", align: "center", name: "Names" }),
    E("line-ornament", 390, 1112, 300, { c1: "#c9b18a" }),
    T("THE BEST DAY  ·  14 . 06 . 2026", 40, 1166, 1000, { size: 28, bold: true, color: "#8b6f47", align: "center", ls: 8, name: "Date" }),
    T("Thank you for celebrating with us", 40, 1236, 1000, { size: 36, family: "serif", italic: true, color: "#78716c", align: "center", name: "Thanks" }),
  ])]);
}
