// AsaanDesk Studio: 10 more hoodie prints and 10 more photo collages, each its own composition.
// Pure module (no imports). templates.js calls the default export with its helpers. Own text, colours, shapes only.
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page, collagePage } = k;
  const { INK, MUTED, IND, COR, TEA, AMB, ROS, WHITE, GOLD, NAVY } = k.K;
  const HT = "hoodie sweatshirt print ";
  const CT = "collage photos grid album ";

  /* ================= Hoodie prints (12 × 14 in = 1152 × 1344 px, transparent) ================= */
  tpl("back-number-hoodie-x7", "Back number hoodie", "hoodie", HT + "team number back sport jersey", (W, H) => [page("none", [
    T("CARTER", 76, 160, W - 152, { size: 150, bold: true, color: INK, align: "center", ls: 12 }),
    T("23", 76, 380, W - 152, { size: 560, bold: true, color: ROS, align: "center", lh: 1 }),
    R(276, 1010, 600, 16, INK, { name: "Rule" }),
    T("NORTHSIDE HOCKEY", 76, 1060, W - 152, { size: 70, bold: true, color: INK, align: "center", ls: 6 }),
  ])]);
  tpl("sunset-stripes-hoodie-x7", "Sunset stripes hoodie", "hoodie", HT + "sunset retro stripes beach summer", (W, H) => [page("none", [
    C(276, 160, 600, 600, AMB, { name: "Sun" }),
    ...[0, 1, 2, 3].map((i) => R(236, 520 + i * 64, 680, 34, [COR, ROS, "#be185d", IND][i], { name: "Stripe" })),
    T("SALT & SUN", 76, 860, W - 152, { size: 150, bold: true, family: "serif", color: INK, align: "center" }),
    T("since summer 2026", 76, 1060, W - 152, { size: 70, italic: true, family: "serif", color: COR, align: "center" }),
  ])]);
  tpl("minimal-chest-hoodie-x7", "Small chest text hoodie", "hoodie", HT + "minimal small chest text clean simple", (W, H) => [page("none", [
    C(706, 220, 70, 70, TEA, { name: "Dot" }),
    T("quiet\nmornings", 796, 200, 300, { size: 52, family: "serif", italic: true, color: INK, lh: 1.05 }),
    R(796, 330, 160, 4, TEA, { name: "Line" }),
  ])]);
  tpl("outline-type-hoodie-x7", "Outline letters hoodie", "hoodie", HT + "outline letters bold typography repeat", (W, H) => [page("none", [
    ...[0, 1, 2].map((i) => T("DREAM", 60, 180 + i * 250, W - 120, { size: 230, bold: true, color: i === 1 ? IND : "#ffffff", outline: i === 1 ? undefined : { width: 6, color: IND }, align: "center", lh: 1, name: "Dream " + (i + 1) })),
    T("BIG", 60, 960, W - 120, { size: 200, bold: true, color: AMB, align: "center", lh: 1 }),
  ])]);
  tpl("campfire-hoodie-x7", "Campfire club hoodie", "hoodie", HT + "camping campfire outdoors club trees", (W, H) => [page("none", [
    S("triangle", 216, 260, 300, 420, "#166534", { name: "Tree" }),
    S("triangle", 636, 260, 300, 420, "#166534", { name: "Tree" }),
    S("triangle", 426, 200, 300, 480, "#15803d", { name: "Tree" }),
    S("triangle", 486, 560, 180, 160, COR, { name: "Flame" }),
    S("triangle", 526, 620, 100, 100, AMB, { name: "Flame core" }),
    R(416, 720, 320, 30, "#78350f", { radius: 15, rot: 8, name: "Log" }),
    T("CAMPFIRE CLUB", 60, 860, W - 120, { size: 108, bold: true, color: INK, align: "center" }),
    T("stories · stars · s'mores", 76, 1060, W - 152, { size: 64, color: "#166534", align: "center" }),
  ])]);
  tpl("wave-circle-hoodie-x7", "Wave circle hoodie", "hoodie", HT + "ocean wave circle surf badge", (W, H) => [page("none", [
    C(276, 180, 600, 600, "#e0f2fe", { name: "Circle" }),
    ...[0, 1, 2].map((i) => S("ellipse", 316 + i * 20, 440 + i * 90, 520 - i * 40, 90, ["#38bdf8", "#0284c7", "#075985"][i], { name: "Wave" })),
    E("icon-sun", 486, 240, 180, { c1: AMB }),
    T("PACIFIC", 76, 860, W - 152, { size: 170, bold: true, color: "#075985", align: "center", ls: 10 }),
    T("SURF COLLECTIVE", 76, 1070, W - 152, { size: 60, bold: true, color: "#0284c7", align: "center", ls: 12 }),
  ])]);
  tpl("slogan-box-hoodie-x7", "Boxed slogan hoodie", "hoodie", HT + "slogan box frame bold statement", (W, H) => [page("none", [
    R(156, 300, 840, 640, "none", { stroke: INK, sw: 22, name: "Box" }),
    T("BE\nKIND\nTODAY", 156, 360, 840, { size: 160, bold: true, color: INK, align: "center", lh: 1 }),
    R(356, 960, 440, 90, ROS, { name: "Tag" }),
    T("a small reminder", 356, 980, 440, { size: 46, bold: true, color: WHITE, align: "center" }),
  ])]);
  tpl("bear-paw-hoodie-x7", "School mascot hoodie", "hoodie", HT + "school mascot paw bears team spirit", (W, H) => [page("none", [
    C(436, 330, 280, 260, "#7c2d12", { name: "Paw pad" }),
    ...[0, 1, 2, 3].map((i) => C(396 + i * 100, 200 - (i === 1 || i === 2 ? 40 : 0), 90, 110, "#7c2d12", { name: "Toe" })),
    T("BEARS", 76, 700, W - 152, { size: 250, bold: true, color: "#7c2d12", align: "center", lh: 1 }),
    T("OAKWOOD HIGH", 76, 990, W - 152, { size: 80, bold: true, color: AMB, align: "center", ls: 8 }),
  ])]);
  tpl("coffee-cup-hoodie-x7", "Coffee lover hoodie", "hoodie", HT + "coffee cup cozy lover cafe", (W, H) => [page("none", [
    R(396, 300, 360, 400, "#78350f", { radius: 40, name: "Cup" }),
    C(716, 400, 160, 180, "none", { stroke: "#78350f", sw: 36, name: "Handle" }),
    R(436, 340, 280, 60, "#fde68a", { radius: 20, name: "Foam" }),
    E("icon-heart", 516, 470, 120, { c1: "#fde68a" }),
    T("but first,", 76, 780, W - 152, { size: 90, family: "serif", italic: true, color: "#78350f", align: "center" }),
    T("COFFEE", 76, 900, W - 152, { size: 220, bold: true, color: INK, align: "center", lh: 1 }),
  ])]);
  tpl("galaxy-hoodie-x7", "Galaxy planet hoodie", "hoodie", HT + "space planet galaxy stars astronomy", (W, H) => [page("none", [
    C(376, 230, 400, 400, "#7c3aed", { name: "Planet" }),
    S("ellipse", 236, 390, 680, 90, "none", { stroke: GOLD, sw: 18, rot: -12, name: "Ring" }),
    E("deco-stars", 156, 160, 220, { c1: GOLD }),
    E("deco-sparkle", 856, 600, 120, { c1: GOLD }),
    T("LOST IN SPACE", 60, 780, W - 120, { size: 116, bold: true, color: NAVY, align: "center" }),
    T("astronomy club", 76, 1000, W - 152, { size: 70, color: "#7c3aed", align: "center", ls: 6 }),
  ])]);

  /* ================= Photo collages ================= */
  tpl("polaroid-wall-collage-x7", "Polaroid wall collage", "collage-landscape", CT + "polaroid wall memories tilted", (W, H) => [page("#fef3c7", [
    ...[[60, 80, -6], [440, 60, 4], [820, 90, -3], [240, 420, 5], [640, 430, -5]].flatMap(([x, y, r], i) => [
      R(x, y, 320, 340, WHITE, { rot: r, name: "Polaroid" }),
      F(x + 20, y + 20, 280, 250, { rot: r, name: "Photo " + (i + 1) }),
    ]),
    T("Summer memories", 760, 700, 400, { size: 44, family: "serif", italic: true, bold: true, color: "#92400e", align: "right" }),
  ])]);
  tpl("film-strip-collage-x7", "Film strip collage", "collage-landscape", CT + "film strip cinema movie frames", (W, H) => [page(INK, [
    R(0, 180, W, 440, "#111827", { name: "Strip" }),
    ...Array.from({ length: 14 }, (_, i) => [R(20 + i * 85, 200, 46, 30, WHITE, { radius: 6, name: "Hole" }), R(20 + i * 85, 570, 46, 30, WHITE, { radius: 6, name: "Hole" })]).flat(),
    ...[0, 1, 2, 3].map((i) => F(40 + i * 285, 250, 265, 300, { name: "Frame " + (i + 1) })),
    T("OUR WEEKEND", 0, 60, W, { size: 64, bold: true, color: WHITE, align: "center", ls: 12 }),
    T("scene 1 · take 4", 0, 670, W, { size: 34, family: "mono", color: AMB, align: "center" }),
  ])]);
  tpl("heart-centre-collage-x7", "Heart centre collage", "collage-square", CT + "love heart valentine couple anniversary", (W, H) => [collagePage(W, H, "four", { gap: 14, radius: 20, bg: "#ffe4e6" }, [
    C(W / 2 - 170, H / 2 - 170, 340, 340, "#ffe4e6", { name: "Centre circle" }),
    E("icon-heart", W / 2 - 90, H / 2 - 110, 180, { c1: ROS }),
    T("us", W / 2 - 150, H / 2 + 70, 300, { size: 60, family: "serif", italic: true, bold: true, color: "#9f1239", align: "center" }),
  ])]);
  tpl("magazine-cover-collage-x7", "Magazine cover collage", "collage-square", CT + "magazine cover feature editorial", (W, H) => [page(WHITE, [
    F(0, 0, W, H * 0.72, { name: "Cover photo" }),
    T("WEEKEND", 40, 30, W - 80, { size: 130, bold: true, color: WHITE, lh: 1, shadow: { x: 0, y: 4, blur: 14, color: "#000000", opacity: 0.35 } }),
    F(40, H * 0.72 + 30, 250, 250, { name: "Inset 1" }),
    F(310, H * 0.72 + 30, 250, 250, { name: "Inset 2" }),
    T("Issue 12\nThe road trip special", 590, H * 0.72 + 50, 450, { size: 40, bold: true, color: INK, lh: 1.25 }),
  ])]);
  tpl("seven-mosaic-collage-x7", "Seven photo mosaic", "collage-landscape", CT + "mosaic seven photos event party", (W, H) => [collagePage(W, H, "mosaic-7", { gap: 8, radius: 6, bg: NAVY }, [
    R(30, 30, 320, 80, NAVY, { radius: 40, name: "Label" }),
    T("Party night", 30, 48, 320, { size: 40, bold: true, color: GOLD, align: "center" }),
  ])]);
  tpl("three-row-strip-collage-x7", "Three in a row collage", "collage-landscape", CT + "three in a row panorama trip", (W, H) => [collagePage(W, H, "three-row", { gap: 24, radius: 0, bg: "#f1f5f9" }, [
    R(0, H - 140, W, 140, "#0f172a", { op: 0.75, name: "Caption band" }),
    T("Mountains · Lakes · Forests", 0, H - 100, W, { size: 50, bold: true, color: WHITE, align: "center" }),
  ])]);
  tpl("stacked-duo-collage-x7", "Stacked pair collage", "collage-square", CT + "two photos stacked then now", (W, H) => [collagePage(W, H, "two-stack", { gap: 16, radius: 0, bg: WHITE }, [
    R(W / 2 - 160, H / 2 - 50, 320, 100, WHITE, { radius: 50, name: "Middle pill" }),
    T("then & now", W / 2 - 160, H / 2 - 28, 320, { size: 44, family: "serif", italic: true, bold: true, color: INK, align: "center" }),
  ])]);
  tpl("circle-cluster-collage-x7", "Circle photos collage", "collage-square", CT + "circles round photos friends cluster", (W, H) => [page("#ecfeff", [
    F(80, 80, 520, 520, { shape: "circle", name: "Big circle" }),
    F(640, 120, 340, 340, { shape: "circle", name: "Circle 2" }),
    F(560, 520, 420, 420, { shape: "circle", name: "Circle 3" }),
    F(120, 660, 300, 300, { shape: "circle", name: "Circle 4" }),
    T("best friends", 80, 990, 500, { size: 54, family: "serif", italic: true, bold: true, color: "#0e7490" }),
  ])]);
  tpl("nine-border-collage-x7", "Framed nine grid collage", "collage-square", CT + "nine grid border frame year", (W, H) => [page(AMB, [
    R(40, 40, W - 80, H - 80, WHITE, { name: "Mat" }),
    ...Array.from({ length: 9 }, (_, i) => F(80 + (i % 3) * 310, 80 + Math.floor(i / 3) * 290, 290, 270, { radius: 12, shape: "rounded", name: "Photo " + (i + 1) })),
    T("2026 in pictures", 80, H - 150, W - 160, { size: 52, bold: true, color: "#92400e", align: "center" }),
  ])]);
  tpl("scrapbook-collage-x7", "Scrapbook page collage", "collage-landscape", CT + "scrapbook tape notes journal", (W, H) => [page("#fdf6e3", [
    F(60, 70, 480, 360, { rot: -3, name: "Photo 1" }),
    R(220, 50, 160, 40, "#fde68a", { rot: -8, op: 0.85, name: "Tape" }),
    F(640, 110, 480, 320, { rot: 4, name: "Photo 2" }),
    R(820, 90, 160, 40, "#bbf7d0", { rot: 6, op: 0.85, name: "Tape" }),
    R(80, 500, 420, 220, "#fff7d6", { name: "Note card" }),
    T("Day 3: the hike to the waterfall was worth every step.", 110, 525, 360, { size: 30, family: "serif", italic: true, color: "#78350f", lh: 1.35 }),
    F(640, 470, 300, 260, { rot: -2, name: "Photo 3" }),
    E("deco-sparkle", 1000, 560, 120, { c1: AMB }),
  ])]);
}
