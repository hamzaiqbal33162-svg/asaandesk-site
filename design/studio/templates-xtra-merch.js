// More own base layouts: stickers, T-shirt and hoodie prints, mug wraps, photo collages, logos and social posts.
// Pure module, called once from templates.js with its helpers (KIT). Original text, colours and layouts;
// artwork comes only from our own shapes and stickers (/pdf-editor/elements.js).
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page, flow, collagePage } = k;
  const { INK, MUTED, IND, COR, TEA, AMB, ROS, WHITE, GOLD, NAVY } = k.K;
  const FOREST = "#166534", PINE = "#0f766e", WINE = "#9f1239", CREAM = "#fffbf5", SKY = "#0ea5e9", LIME = "#84cc16", PLUM = "#6d28d9", SAND = "#fef3c7";

  /* ================= Stickers (3 in = 288 px) ================= */
  tpl("thank-you-order-sticker-x2", "Thank you for your order sticker", "sticker-round-3in", "sticker round thank you order packaging small business shop", (W, H) => [page(WHITE, [
    C(0, 0, W, H, TEA, { name: "Circle" }),
    C(16, 16, W - 32, H - 32, "none", { stroke: WHITE, sw: 2, name: "Ring" }),
    T("THANK YOU", 24, 70, W - 48, { size: 34, bold: true, color: WHITE, align: "center", ls: 2 }),
    T("for your order", 24, 116, W - 48, { size: 26, family: "serif", italic: true, color: "#ccfbf1", align: "center" }),
    E("icon-heart", W / 2 - 22, 170, 44, { c1: GOLD, c2: WHITE }),
  ])]);
  tpl("hello-name-sticker-x2", "Hello my name is sticker", "sticker-square-3in", "sticker square name tag hello event badge", (W, H) => [page(WHITE, [
    R(6, 6, W - 12, H - 12, ROS, { radius: 26, name: "Card" }),
    T("HELLO", 16, 26, W - 32, { size: 54, bold: true, color: WHITE, align: "center" }),
    T("my name is", 16, 92, W - 32, { size: 22, color: "#ffe4e6", align: "center" }),
    R(22, 132, W - 44, 128, WHITE, { radius: 14, name: "Name box" }),
    T("Your name", 22, 172, W - 44, { size: 36, family: "serif", italic: true, color: INK, align: "center" }),
  ])]);
  tpl("fragile-stamp-sticker-x2", "Handle with care sticker", "sticker-square-3in", "sticker square fragile handle with care shipping box parcel", (W, H) => [page(SAND, [
    R(14, 14, W - 28, H - 28, "none", { stroke: WINE, sw: 6, radius: 12, name: "Border" }),
    E("icon-warning", W / 2 - 40, 34, 80, { c1: WINE, c2: SAND }),
    T("HANDLE\nWITH CARE", 24, 126, W - 48, { size: 40, bold: true, color: WINE, align: "center", lh: 1 }),
    T("fragile inside", 24, 226, W - 48, { size: 20, color: "#7f1d1d", align: "center", ls: 2 }),
  ])]);
  tpl("vegan-badge-sticker-x2", "Plant based badge sticker", "sticker-round-3in", "sticker round vegan plant based food label badge healthy", (W, H) => [page(WHITE, [
    C(0, 0, W, H, LIME, { name: "Circle" }),
    C(22, 22, W - 44, H - 44, WHITE, { name: "Inner circle" }),
    E("deco-sprig", W / 2 - 40, 40, 80, { c1: FOREST, c2: LIME }),
    T("100%", 30, 124, W - 60, { size: 46, bold: true, color: FOREST, align: "center" }),
    T("PLANT BASED", 30, 182, W - 60, { size: 24, bold: true, color: FOREST, align: "center", ls: 2 }),
  ])]);
  tpl("stay-cool-face-sticker-x2", "Stay cool sticker", "sticker-round-3in", "sticker round cool emoji fun kids sunglasses", (W, H) => [page(WHITE, [
    C(0, 0, W, H, SKY, { name: "Circle" }),
    E("face-cool", W / 2 - 70, 30, 140, {}),
    T("STAY COOL", 20, 190, W - 40, { size: 38, bold: true, color: WHITE, align: "center", outline: { width: 2, color: NAVY } }),
  ])]);
  tpl("new-product-burst-sticker-x2", "New product burst sticker", "sticker-round-3in", "sticker round new launch burst product shop label", (W, H) => [page(WHITE, [
    S("star", 0, 0, W, H, AMB, { points: 12, name: "Burst" }),
    C(52, 52, W - 104, H - 104, INK, { name: "Centre" }),
    T("NEW!", 52, 104, W - 104, { size: 54, bold: true, color: GOLD, align: "center" }),
    T("just landed", 52, 168, W - 104, { size: 18, color: WHITE, align: "center", ls: 1 }),
  ])]);
  tpl("planner-reminder-sticker-x2", "Planner reminder sticker", "sticker-square-3in", "sticker square planner reminder journal to do note", (W, H) => [page("#ede9fe", [
    R(22, 22, W - 44, H - 44, WHITE, { radius: 18, name: "Note" }),
    R(22, 22, W - 44, 56, PLUM, { radius: 18, name: "Top band" }),
    T("DON'T FORGET", 30, 38, W - 60, { size: 22, bold: true, color: WHITE, align: "center", ls: 2 }),
    E("icon-check-circle", 40, 108, 40, { c1: PLUM }), T("Drink water", 90, 116, W - 120, { size: 22, color: INK }),
    E("icon-check-circle", 40, 166, 40, { c1: PLUM }), T("Call mum", 90, 174, W - 120, { size: 22, color: INK }),
  ])]);

  /* ================= T-shirt prints (12 × 16 in = 1152 × 1536 px, transparent) ================= */
  tpl("vintage-badge-tshirt-x2", "Vintage badge T-shirt", "tshirt", "t-shirt tshirt shirt print vintage badge outdoors est", (W, H) => [page("none", [
    C(226, 200, 700, 700, "none", { stroke: INK, sw: 14, name: "Ring" }),
    C(266, 240, 620, 620, "none", { stroke: INK, sw: 4, name: "Inner ring" }),
    S("triangle", 376, 380, 400, 300, FOREST, { name: "Mountain" }),
    C(626, 360, 110, 110, AMB, { name: "Sun" }),
    T("WILD TRAILS", 226, 700, 700, { size: 74, bold: true, color: INK, align: "center", ls: 6 }),
    T("EST. 2026", 76, 980, W - 152, { size: 96, family: "serif", bold: true, color: FOREST, align: "center", ls: 12 }),
  ])]);
  tpl("pocket-heart-tshirt-x2", "Pocket heart T-shirt", "tshirt", "t-shirt tshirt shirt print pocket small heart minimal", (W, H) => [page("none", [
    E("icon-heart", 760, 160, 180, { c1: ROS, c2: "#ffe4e6" }),
    T("kind\nhearts", 700, 360, 300, { size: 64, family: "serif", italic: true, bold: true, color: INK, align: "center", lh: 1 }),
  ])]);
  tpl("big-number-tshirt-x2", "Big number sports T-shirt", "tshirt", "t-shirt tshirt shirt print sports jersey number team player", (W, H) => [page("none", [
    T("TIGERS", 40, 140, W - 80, { size: 170, bold: true, italic: true, color: AMB, align: "center", outline: { width: 6, color: INK } }),
    T("07", 40, 380, W - 80, { size: 560, bold: true, color: INK, align: "center", lh: 1 }),
    T("KHAN", 40, 1000, W - 80, { size: 120, bold: true, color: AMB, align: "center", ls: 20 }),
  ])]);
  tpl("wave-surf-tshirt-x2", "Ocean waves T-shirt", "tshirt", "t-shirt tshirt shirt print ocean waves beach surf summer", (W, H) => [page("none", [
    C(276, 160, 600, 600, SKY, { name: "Circle" }),
    C(476, 260, 200, 200, GOLD, { name: "Sun" }),
    ...[0, 1, 2].map((i) => E("line-wavy", 316, 520 + i * 70, 520, { c1: WHITE })),
    T("SALT & SUN", 40, 850, W - 80, { size: 140, bold: true, color: NAVY, align: "center" }),
    T("beach club", 40, 1020, W - 80, { size: 90, family: "serif", italic: true, color: SKY, align: "center" }),
  ])]);
  tpl("bookworm-tshirt-x2", "Bookworm T-shirt", "tshirt", "t-shirt tshirt shirt print books reading library bookworm", (W, H) => [page("none", [
    ...[0, 1, 2, 3, 4].map((i) => R(276 + i * 120, 300 + (i % 2) * 40, 100, 420 - (i % 2) * 40, [ROS, IND, TEA, AMB, COR][i], { radius: 10, name: "Book" })),
    R(236, 720, 680, 24, INK, { radius: 6, name: "Shelf" }),
    T("Just one more\nchapter", 40, 820, W - 80, { size: 120, family: "serif", bold: true, italic: true, color: INK, align: "center", lh: 1.05 }),
  ])]);
  tpl("good-vibes-arc-tshirt-x2", "Good vibes only T-shirt", "tshirt", "t-shirt tshirt shirt print good vibes positive rainbow retro", (W, H) => [page("none", [
    E("deco-rainbow", 226, 200, 700, { c1: COR, c2: AMB, c3: TEA }),
    T("GOOD VIBES", 40, 680, W - 80, { size: 150, bold: true, color: COR, align: "center", lh: 1 }),
    T("only", 40, 870, W - 80, { size: 150, family: "serif", italic: true, color: TEA, align: "center", lh: 1 }),
  ])]);
  tpl("charity-run-tshirt-x2", "Charity run event T-shirt", "tshirt", "t-shirt tshirt shirt print charity run event 5k volunteer", (W, H) => [page("none", [
    T("RUN FOR", 40, 160, W - 80, { size: 130, bold: true, color: INK, align: "center" }),
    T("HOPE", 40, 330, W - 80, { size: 330, bold: true, color: ROS, align: "center", lh: 1 }),
    R(276, 720, 600, 12, INK, { radius: 6, name: "Line" }),
    T("5K CHARITY RUN · 2026", 40, 770, W - 80, { size: 70, bold: true, color: INK, align: "center", ls: 4 }),
    E("icon-heart", 516, 910, 120, { c1: ROS, c2: "#ffe4e6" }),
  ])]);

  /* ================= Hoodie prints (12 × 14 in = 1152 × 1344 px, transparent) ================= */
  tpl("university-crest-hoodie-x2", "University crest hoodie", "hoodie", "hoodie sweatshirt print university crest college alumni", (W, H) => [page("none", [
    E("shape-shield", 426, 120, 300, { c1: NAVY, c2: NAVY, c3: NAVY }),
    E("deco-crown", 506, 190, 140, { c1: GOLD, c2: GOLD }),
    T("NORTHFIELD", 40, 520, W - 80, { size: 150, family: "serif", bold: true, color: NAVY, align: "center" }),
    T("UNIVERSITY", 40, 700, W - 80, { size: 90, bold: true, color: "#b8860b", align: "center", ls: 24 }),
    T("ALUMNI 2026", 40, 860, W - 80, { size: 60, color: NAVY, align: "center", ls: 12 }),
  ])]);
  tpl("mountain-explorer-hoodie-x2", "Explorer hoodie", "hoodie", "hoodie sweatshirt print mountains explore adventure hiking", (W, H) => [page("none", [
    S("triangle", 226, 260, 460, 360, PINE, { name: "Mountain" }),
    S("triangle", 486, 200, 460, 420, "#115e59", { name: "Mountain" }),
    S("triangle", 656, 200, 120, 90, WHITE, { name: "Snow" }),
    T("EXPLORE MORE", 40, 700, W - 80, { size: 116, bold: true, color: PINE, align: "center" }),
    T("worry less", 40, 870, W - 80, { size: 110, family: "serif", italic: true, color: INK, align: "center" }),
  ])]);
  tpl("coding-hoodie-x2", "Developer hoodie", "hoodie", "hoodie sweatshirt print code developer programmer tech", (W, H) => [page("none", [
    T("</>", 40, 160, W - 80, { size: 300, bold: true, color: TEA, align: "center", family: "mono" }),
    T("EAT · SLEEP · CODE", 40, 560, W - 80, { size: 96, bold: true, color: INK, align: "center", family: "mono" }),
    T("repeat", 40, 720, W - 80, { size: 110, family: "serif", italic: true, color: TEA, align: "center" }),
  ])]);
  tpl("dance-crew-hoodie-x2", "Dance crew hoodie", "hoodie", "hoodie sweatshirt print dance crew team music", (W, H) => [page("none", [
    E("deco-stars", 216, 140, 220, { c1: ROS, c2: AMB }),
    T("MOVE", 40, 300, W - 80, { size: 300, bold: true, italic: true, color: ROS, align: "center", lh: 1 }),
    T("DANCE CREW", 40, 640, W - 80, { size: 120, bold: true, color: INK, align: "center", ls: 10 }),
    E("deco-sparkles", 760, 820, 160, { c1: AMB, c2: ROS }),
  ])]);
  tpl("cozy-season-hoodie-x2", "Cozy season hoodie", "hoodie", "hoodie sweatshirt print cozy winter autumn season tea", (W, H) => [page("none", [
    E("icon-chai", 426, 140, 300, { c1: COR, c2: AMB, c3: SAND }),
    T("cozy", 40, 500, W - 80, { size: 260, family: "serif", italic: true, bold: true, color: COR, align: "center", lh: 1 }),
    T("SEASON", 40, 800, W - 80, { size: 110, bold: true, color: INK, align: "center", ls: 30 }),
  ])]);
  tpl("chess-club-hoodie-x2", "Chess club hoodie", "hoodie", "hoodie sweatshirt print chess club school team strategy", (W, H) => [page("none", [
    ...Array.from({ length: 16 }, (_, i) => R(376 + (i % 4) * 100, 140 + Math.floor(i / 4) * 100, 100, 100, (i + Math.floor(i / 4)) % 2 ? INK : WHITE, { name: "Square", stroke: INK, sw: 2 })),
    T("CHESS CLUB", 40, 600, W - 80, { size: 160, bold: true, color: INK, align: "center" }),
    T("think three moves ahead", 40, 790, W - 80, { size: 64, italic: true, color: MUTED, align: "center" }),
  ])]);
  tpl("save-planet-hoodie-x2", "Save the planet hoodie", "hoodie", "hoodie sweatshirt print planet earth climate green nature", (W, H) => [page("none", [
    C(376, 140, 400, 400, SKY, { name: "Earth" }),
    E("shape-blob", 420, 200, 180, { c1: LIME }), E("shape-blob-2", 600, 330, 140, { c1: LIME }),
    T("THERE IS NO", 40, 620, W - 80, { size: 100, bold: true, color: INK, align: "center" }),
    T("PLANET B", 40, 760, W - 80, { size: 200, bold: true, color: FOREST, align: "center", lh: 1 }),
  ])]);

  /* ================= Mug wraps (8.5 × 3.5 in = 816 × 336 px) ================= */
  tpl("best-mom-mug-x2", "Best mom ever mug", "mug", "mug cup wrap mom mother gift mothers day", (W, H) => [page("#fff1f2", [
    E("deco-flower", 30, 60, 150, { c1: ROS, c2: AMB }),
    T("Best Mom\nEver", 200, 70, 380, { size: 74, family: "serif", bold: true, italic: true, color: WINE, align: "center", lh: 1 }),
    E("deco-hearts", 640, 80, 140, { c1: ROS, c2: COR }),
  ])]);
  tpl("monday-mug-x2", "Monday fuel mug", "mug", "mug cup wrap monday coffee funny office work", (W, H) => [page(NAVY, [
    T("MONDAY", 30, 70, 400, { size: 86, bold: true, color: GOLD }),
    T("needs extra coffee", 30, 180, 400, { size: 38, family: "serif", italic: true, color: WHITE }),
    E("icon-battery", 560, 70, 170, { c1: GOLD, c2: WHITE }),
  ])]);
  tpl("periodic-name-mug-x2", "Science name mug", "mug", "mug cup wrap science chemistry teacher student periodic name", (W, H) => [page(WHITE, [
    ...["Sa", "Ra"].map((sym, i) => R(40 + i * 170, 70, 150, 170, i ? TEA : IND, { radius: 14, name: "Element tile" })),
    T("Sa", 40, 112, 150, { size: 84, bold: true, color: WHITE, align: "center" }), T("Ra", 210, 112, 150, { size: 84, bold: true, color: WHITE, align: "center" }),
    T("Science is\nmy element", 440, 90, 340, { size: 48, bold: true, color: INK, align: "center", lh: 1.1 }),
  ])]);
  tpl("motivation-mug-x2", "Do it anyway mug", "mug", "mug cup wrap motivation quote positive gym study", (W, H) => [page(SAND, [
    E("icon-sun", 40, 80, 150, { c1: AMB }),
    T("Do it scared.\nDo it anyway.", 220, 92, 560, { size: 54, bold: true, color: INK, lh: 1.15 }),
    R(220, 250, 160, 8, COR, { radius: 4, name: "Line" }),
  ])]);
  tpl("cat-lover-mug-x2", "Pet lover mug", "mug", "mug cup wrap pet lover cat dog paws animals", (W, H) => [page(WHITE, [
    ...[0, 1, 2, 3, 4, 5].map((i) => C(30 + i * 130, 30 + (i % 2) * 220, 40, 40, COR, { op: 0.35, name: "Paw dot" })),
    T("Powered by\npets and coffee", 160, 100, 500, { size: 52, family: "serif", bold: true, color: INK, align: "center", lh: 1.1 }),
  ])]);
  tpl("graduation-mug-x2", "Graduation mug", "mug", "mug cup wrap graduation graduate class congratulations", (W, H) => [page(INK, [
    E("deco-hanging-stars", 30, 0, 140, { c1: GOLD, c2: GOLD }),
    T("Class of\n2026", 200, 70, 400, { size: 80, bold: true, color: GOLD, align: "center", lh: 1 }),
    T("Proud graduate", 560, 230, 240, { size: 30, italic: true, color: WHITE, align: "center" }),
  ])]);
  tpl("couple-names-mug-x2", "Couple names mug", "mug", "mug cup wrap couple love names anniversary wedding gift", (W, H) => [page(CREAM, [
    T("Ali", 40, 110, 280, { size: 90, family: "serif", italic: true, bold: true, color: WINE, align: "center" }),
    E("icon-heart", W / 2 - 50, 110, 100, { c1: ROS, c2: "#ffe4e6" }),
    T("Mina", W - 320, 110, 280, { size: 90, family: "serif", italic: true, bold: true, color: WINE, align: "center" }),
    T("since 2020", 40, 250, W - 80, { size: 28, color: MUTED, align: "center", ls: 6 }),
  ])]);

  /* ================= Photo collages ================= */
  tpl("family-grid-collage-x2", "Family photo grid", "collage-square", "collage photos family grid memories album", (W, H) => [collagePage(W, H, "four", { gap: 24, radius: 28, bg: SAND }, [
    T("Our family", W / 2 - 220, H / 2 - 44, 440, { size: 52, family: "serif", bold: true, italic: true, color: COR, align: "center", bg: { color: WHITE, pad: 0.4, radius: 0.5 } }),
  ])]);
  tpl("year-recap-collage-x2", "Year in photos", "collage-square", "collage photos year recap nine grid highlights", (W, H) => [collagePage(W, H, "nine", { gap: 10, radius: 10, bg: INK }, [
    T("2026 in photos", W / 2 - 240, H / 2 - 40, 480, { size: 46, bold: true, color: WHITE, align: "center", bg: { color: ROS, pad: 0.4, radius: 0.5 } }),
  ])]);
  tpl("food-diary-collage-x2", "Food diary collage", "collage-landscape", "collage photos food diary recipes restaurant", (W, H) => [collagePage(W, H, "three-row", { gap: 18, radius: 20, bg: "#fff7ed" }, [
    T("Weekend food diary", 40, 30, 520, { size: 40, bold: true, color: "#9a3412", bg: { color: WHITE, pad: 0.35, radius: 0.5 } }),
  ])]);
  tpl("baby-milestones-collage-x2", "Baby milestones", "collage-square", "collage photos baby milestones months newborn", (W, H) => [collagePage(W, H, "six", { gap: 18, radius: 30, bg: "#e0f2fe" }, [
    T("First year", W / 2 - 200, 20, 400, { size: 44, family: "serif", bold: true, color: SKY, align: "center", bg: { color: WHITE, pad: 0.35, radius: 0.5 } }),
  ])]);
  tpl("event-highlights-collage-x2", "Event highlights", "collage-landscape", "collage photos event highlights conference party", (W, H) => [collagePage(W, H, "mosaic-7", { gap: 12, bg: IND }, [
    T("EVENT HIGHLIGHTS", W - 520, H - 100, 480, { size: 36, bold: true, color: WHITE, align: "center", bg: { color: IND, pad: 0.4, radius: 0.3 } }),
  ])]);
  tpl("friends-strip-collage-x2", "Friends photo strip", "collage-landscape", "collage photos friends trip stacked two", (W, H) => [collagePage(W, H, "two-stack", { gap: 16, radius: 16, bg: LIME }, [
    T("best friends", 40, H / 2 - 34, 360, { size: 44, family: "serif", italic: true, bold: true, color: FOREST, align: "center", bg: { color: WHITE, pad: 0.35, radius: 0.5 } }),
  ])]);
  tpl("product-showcase-collage-x2", "Product showcase", "collage-square", "collage photos product showcase shop new collection", (W, H) => [collagePage(W, H, "mosaic", { gap: 8, bg: WHITE }, [
    T("NEW COLLECTION", 40, H - 110, 520, { size: 40, bold: true, color: WHITE, bg: { color: INK, pad: 0.4, radius: 0.2 } }),
  ])]);

  /* ================= Logos (1000 × 1000 px) ================= */
  tpl("florist-wreath-logo-x2", "Florist wreath logo", "logo", "logo florist flowers wreath boutique wedding", (W, H) => [page(WHITE, [
    C(250, 150, 500, 500, "none", { stroke: "#86efac", sw: 10, name: "Wreath" }),
    E("deco-flower", 290, 150, 140, { c1: ROS, c2: AMB }), E("deco-flower", 570, 510, 140, { c1: ROS, c2: AMB }),
    T("Bloom\n& Petal", 250, 300, 500, { size: 96, family: "serif", italic: true, bold: true, color: FOREST, align: "center", lh: 1 }),
    T("FLORAL STUDIO", 100, 740, 800, { size: 40, color: MUTED, align: "center", ls: 16 }),
  ])]);
  tpl("real-estate-roof-logo-x2", "Real estate logo", "logo", "logo real estate property homes roof agency", (W, H) => [page(WHITE, [
    S("triangle", 300, 180, 400, 200, NAVY, { name: "Roof" }),
    R(380, 380, 240, 200, "none", { stroke: NAVY, sw: 16, name: "House" }),
    R(470, 470, 60, 110, AMB, { name: "Door" }),
    T("KEYSTONE", 100, 630, 800, { size: 110, bold: true, color: NAVY, align: "center", ls: 4 }),
    T("PROPERTIES", 100, 770, 800, { size: 44, color: AMB, align: "center", ls: 20 }),
  ])]);
  tpl("photo-studio-logo-x2", "Photography logo", "logo", "logo photography photographer camera studio", (W, H) => [page(WHITE, [
    C(380, 160, 240, 240, INK, { name: "Lens ring" }),
    C(430, 210, 140, 140, WHITE, { name: "Lens" }),
    C(470, 250, 60, 60, ROS, { name: "Lens centre" }),
    T("Lumen", 100, 450, 800, { size: 140, family: "serif", italic: true, color: INK, align: "center" }),
    T("PHOTOGRAPHY", 100, 650, 800, { size: 40, bold: true, color: ROS, align: "center", ls: 18 }),
  ])]);
  tpl("kids-academy-logo-x2", "Kids academy logo", "logo", "logo kids school academy education playful", (W, H) => [page(WHITE, [
    ...["A", "B", "C"].map((l, i) => R(260 + i * 170, 180 + (i % 2) * 40, 140, 140, [ROS, AMB, SKY][i], { radius: 28, name: "Block " + l, rot: [-8, 6, -4][i] })),
    ...["A", "B", "C"].map((l, i) => T(l, 260 + i * 170, 206 + (i % 2) * 40, 140, { size: 90, bold: true, color: WHITE, align: "center", rot: [-8, 6, -4][i] })),
    T("Little Steps", 100, 450, 800, { size: 120, bold: true, color: INK, align: "center" }),
    T("KIDS ACADEMY", 100, 620, 800, { size: 46, bold: true, color: TEA, align: "center", ls: 14 }),
  ])]);
  tpl("barber-pole-logo-x2", "Barber shop logo", "logo", "logo barber shop salon grooming men hair", (W, H) => [page(WHITE, [
    R(460, 140, 80, 360, WHITE, { radius: 40, name: "Pole", stroke: INK, sw: 8 }),
    ...[0, 1, 2, 3].map((i) => R(470, 170 + i * 80, 60, 30, i % 2 ? SKY : ROS, { rot: -25, name: "Stripe" })),
    T("SHARP CUTS", 100, 560, 800, { size: 110, bold: true, color: INK, align: "center" }),
    T("BARBER CO.", 100, 700, 800, { size: 50, family: "serif", italic: true, color: ROS, align: "center", ls: 6 }),
  ])]);
  tpl("travel-plane-logo-x2", "Travel agency logo", "logo", "logo travel agency tours trips world globe", (W, H) => [page(WHITE, [
    E("icon-globe", 380, 150, 240, { c1: TEA, c2: "#ccfbf1" }),
    E("arrow-curved", 560, 120, 140, { c1: AMB, rot: 20 }),
    T("Wander Ways", 100, 450, 800, { size: 120, bold: true, color: PINE, align: "center" }),
    T("TOURS & TRAVEL", 100, 620, 800, { size: 44, color: AMB, align: "center", ls: 14 }),
  ])]);
  tpl("organic-farm-logo-x2", "Organic farm logo", "logo", "logo organic farm fresh produce agriculture green", (W, H) => [page(WHITE, [
    S("ellipse", 280, 160, 440, 440, "#ecfccb", { name: "Field" }),
    E("icon-sun", 430, 190, 140, { c1: AMB }),
    ...[0, 1, 2].map((i) => R(320, 420 + i * 40, 360, 16, FOREST, { radius: 8, name: "Furrow" })),
    T("GREEN ACRES", 100, 660, 800, { size: 100, bold: true, color: FOREST, align: "center" }),
    T("organic farm", 100, 790, 800, { size: 54, family: "serif", italic: true, color: LIME, align: "center" }),
  ])]);

  /* ================= Social posts ================= */
  tpl("podcast-episode-post-x2", "Podcast episode post", "instagram-post", "instagram post podcast episode audio show guest", (W, H) => [page(INK, [
    C(620, 120, 360, 360, PLUM, { name: "Circle" }),
    F(660, 160, 280, 280, { shape: "circle", name: "Guest photo" }),
    T("NEW EPISODE", 80, 140, 500, { size: 34, bold: true, color: GOLD, ls: 6 }),
    T("Ep. 24", 80, 200, 500, { size: 110, bold: true, color: WHITE, lh: 1 }),
    T("Building a business from your bedroom", 80, 560, 920, { size: 64, bold: true, color: WHITE, lh: 1.15 }),
    T("with guest Ayesha Noor", 80, 780, 900, { size: 40, color: "#c4b5fd" }),
    R(80, 900, 340, 90, GOLD, { radius: 45, name: "Button" }), T("Listen now", 80, 922, 340, { size: 38, bold: true, color: INK, align: "center" }),
  ])]);
  tpl("giveaway-post-x2", "Giveaway post", "instagram-post", "instagram post giveaway contest win prize follow", (W, H) => [page([ROS, AMB, 135], [
    E("deco-confetti", 40, 40, 260, { c1: WHITE, c2: GOLD }),
    E("icon-gift", 390, 150, 300, { c1: WHITE, c2: GOLD, c3: "#ffe4e6" }),
    T("GIVEAWAY", 40, 500, 1000, { size: 150, bold: true, color: WHITE, align: "center", lh: 1, shadow: { x: 0, y: 6, blur: 16, color: "#7f1d1d", opacity: 0.3 } }),
    T("1. Follow us   2. Like this post   3. Tag two friends", 80, 700, 920, { size: 40, bold: true, color: WHITE, align: "center", lh: 1.3 }),
    T("Winner announced Friday", 80, 900, 920, { size: 36, color: "#fff7ed", align: "center" }),
  ])]);
  tpl("testimonial-post-x2", "Customer review post", "instagram-post", "instagram post testimonial review customer feedback quote stars", (W, H) => [page("#f0fdfa", [
    R(80, 80, 920, 920, WHITE, { radius: 40, name: "Card" }),
    E("badge-rating", 330, 160, 420, { c1: AMB }),
    T("“Fast delivery and the quality is even better than the photos. I will order again!”", 160, 320, 760, { size: 56, family: "serif", italic: true, color: INK, align: "center", lh: 1.3 }),
    C(470, 700, 140, 140, "#99f6e4", { name: "Avatar" }), F(480, 710, 120, 120, { shape: "circle", name: "Customer photo" }),
    T("Nadia R. · Lahore", 160, 870, 760, { size: 36, bold: true, color: PINE, align: "center" }),
  ])]);
  tpl("tips-cover-story-x2", "Tips carousel cover story", "instagram-story", "instagram story tips carousel guide how to swipe", (W, H) => [page(SAND, [
    T("5 TIPS", 80, 300, 920, { size: 220, bold: true, color: COR, lh: 1 }),
    T("to save money every month", 80, 560, 920, { size: 96, bold: true, color: INK, lh: 1.1 }),
    ...[0, 1, 2].map((i) => R(80, 980 + i * 140, 920, 110, WHITE, { radius: 55, name: "Tip pill" })),
    T("Plan your meals", 140, 1010, 800, { size: 44, color: INK }), T("Track small spends", 140, 1150, 800, { size: 44, color: INK }), T("Pay yourself first", 140, 1290, 800, { size: 44, color: INK }),
    E("arrow-right", 820, 1600, 180, { c1: COR }), T("Swipe", 560, 1622, 240, { size: 48, bold: true, color: COR, align: "right" }),
  ])]);
  tpl("countdown-story-x2", "Event countdown story", "whatsapp-status", "whatsapp status story countdown event days to go launch", (W, H) => [page(NAVY, [
    E("deco-sparkles", 760, 180, 220, { c1: GOLD, c2: WHITE }),
    T("ONLY", 80, 420, 920, { size: 80, bold: true, color: "#a5b4fc", align: "center", ls: 10 }),
    T("3", 80, 520, 920, { size: 520, bold: true, color: GOLD, align: "center", lh: 1 }),
    T("DAYS TO GO", 80, 1080, 920, { size: 110, bold: true, color: WHITE, align: "center" }),
    T("Grand opening · Saturday 10 am", 80, 1300, 920, { size: 52, color: "#c7d2fe", align: "center" }),
  ])]);
  tpl("listing-facebook-x2", "Property listing post", "facebook-post", "facebook post real estate property listing house for sale", (W, H) => [page(WHITE, [
    F(0, 0, 680, 630, { name: "House photo" }),
    R(620, 60, 160, 64, ROS, { radius: 32, name: "Tag" }), T("FOR SALE", 620, 78, 160, { size: 24, bold: true, color: WHITE, align: "center" }),
    T("Modern family home", 720, 160, 440, { size: 52, bold: true, color: INK, lh: 1.05 }),
    T("4 bedrooms · 3 baths · garden", 720, 300, 440, { size: 28, color: MUTED }),
    T("Rs 3.2 crore", 720, 380, 440, { size: 56, bold: true, color: PINE }),
    T("Call 0300 7654321", 720, 500, 440, { size: 30, bold: true, color: INK }),
  ])]);
  tpl("recipe-youtube-x2", "Recipe video thumbnail", "youtube-thumbnail", "youtube thumbnail recipe cooking food video easy", (W, H) => [page(AMB, [
    F(620, 40, 620, 640, { shape: "rounded", radius: 40, name: "Dish photo" }),
    T("EASY", 60, 90, 560, { size: 90, bold: true, color: WHITE, outline: { width: 4, color: INK } }),
    T("10 MIN\nPASTA", 60, 200, 580, { size: 150, bold: true, color: INK, lh: 0.95 }),
    R(60, 560, 300, 90, ROS, { radius: 20, name: "Badge" }), T("NO OVEN", 60, 580, 300, { size: 44, bold: true, color: WHITE, align: "center" }),
  ])]);
  tpl("hiring-linkedin-x2", "We are hiring post", "linkedin-post", "linkedin post hiring job vacancy career team", (W, H) => [page("#eef2ff", [
    R(0, 0, 18, H, IND, { name: "Edge" }),
    T("WE'RE HIRING", 80, 80, 700, { size: 40, bold: true, color: IND, ls: 6 }),
    T("Frontend Developer", 80, 140, 700, { size: 76, bold: true, color: INK, lh: 1.05 }),
    T("Remote · Full time · 3+ years React", 80, 330, 700, { size: 30, color: MUTED }),
    R(80, 450, 300, 80, IND, { radius: 40, name: "Button" }), T("Apply today", 80, 470, 300, { size: 32, bold: true, color: WHITE, align: "center" }),
    E("icon-users", 860, 160, 260, { c1: IND, c2: "#c7d2fe" }),
  ])]);
  tpl("webinar-x-post-x2", "Free webinar post", "x-post", "x twitter post webinar online event live talk register", (W, H) => [page(PLUM, [
    C(1180, 0, 420, 420, "#7c3aed", { name: "Circle" }),
    T("FREE LIVE WEBINAR", 100, 120, 900, { size: 44, bold: true, color: GOLD, ls: 6 }),
    T("Grow your shop with simple online ads", 100, 200, 960, { size: 92, bold: true, color: WHITE, lh: 1.1 }),
    E("icon-calendar", 100, 600, 70, { c1: GOLD }), T("Thursday · 7 pm", 190, 612, 600, { size: 44, color: WHITE }),
    R(100, 720, 380, 100, GOLD, { radius: 50, name: "Button" }), T("Save my seat", 100, 746, 380, { size: 42, bold: true, color: INK, align: "center" }),
    F(1120, 260, 380, 460, { shape: "rounded", radius: 30, name: "Speaker photo" }),
  ])]);
  tpl("product-feature-pin-x2", "Product feature pin", "pinterest-pin", "pinterest pin product feature shop details benefits", (W, H) => [page(CREAM, [
    F(80, 80, 840, 760, { shape: "rounded", radius: 40, name: "Product photo" }),
    T("The everyday tote", 80, 900, 840, { size: 76, family: "serif", bold: true, color: INK }),
    ...["Water resistant canvas", "Inside zip pocket", "Fits a 15 inch laptop"].map((t, i) => [E("icon-check-circle", 80, 1030 + i * 100, 56, { c1: TEA }), T(t, 160, 1038 + i * 100, 760, { size: 40, color: INK })]).flat(),
    T("Shop now · link in bio", 80, 1360, 840, { size: 36, bold: true, color: TEA }),
  ])]);
}
