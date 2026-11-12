// 30 more own layouts: T-shirt prints, stickers and logos (each its own composition).
// Pure module, called once from templates.js with its helpers (no imports). Own text, colours and shapes only.
export default function add(k) {
  const { tpl, T, S, R, C, E } = k;
  const { INK, MUTED, IND, COR, TEA, AMB, ROS, WHITE, GOLD, NAVY } = k.K;
  const page = k.page;
  const TS = "t-shirt tshirt shirt print ";

  /* ================= T-shirt prints (12 × 16 in = 1152 × 1536 px, transparent) ================= */
  tpl("stacked-words-tshirt-x5", "Stacked words T-shirt", "tshirt", TS + "typography stacked words bold", (W, H) => [page("none", [
    T("EAT", 80, 220, W - 160, { size: 260, bold: true, color: INK, align: "center", lh: 1 }),
    T("SLEEP", 80, 500, W - 160, { size: 260, bold: true, color: COR, align: "center", lh: 1 }),
    T("CODE", 80, 780, W - 160, { size: 260, bold: true, color: INK, align: "center", lh: 1 }),
    T("REPEAT", 80, 1060, W - 160, { size: 230, bold: true, color: IND, align: "center", lh: 1 }),
  ])]);
  tpl("circle-badge-tshirt-x5", "Circle badge T-shirt", "tshirt", TS + "badge circle club round emblem", (W, H) => [page("none", [
    C(176, 260, 800, 800, "none", { stroke: TEA, sw: 26, name: "Outer ring" }),
    C(236, 320, 680, 680, TEA, { name: "Badge" }),
    T("RIVER", 236, 470, 680, { size: 150, bold: true, color: WHITE, align: "center", lh: 1 }),
    T("ROWING CLUB", 236, 640, 680, { size: 70, bold: true, color: "#ccfbf1", align: "center", ls: 6 }),
    T("EST. 2026", 236, 760, 680, { size: 50, color: WHITE, align: "center", ls: 10 }),
    T("Row together", 100, 1180, W - 200, { size: 90, family: "serif", italic: true, color: INK, align: "center" }),
  ])]);
  tpl("pixel-heart-tshirt-x5", "Pixel heart T-shirt", "tshirt", TS + "pixel heart retro game love", (W, H) => {
    const grid = ["01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000"];
    const cell = 100, x0 = (W - 8 * cell) / 2, y0 = 220;
    const cells = [];
    grid.forEach((row, r) => [...row].forEach((v, c) => { if (v === "1") cells.push(R(x0 + c * cell + 4, y0 + r * cell + 4, cell - 8, cell - 8, r < 2 ? ROS : "#be123c", { name: "Pixel" })); }));
    return [page("none", [...cells, T("PLAYER ONE", 80, 1000, W - 160, { size: 130, bold: true, family: "mono", color: INK, align: "center" }), T("press start", 80, 1180, W - 160, { size: 70, family: "mono", color: ROS, align: "center" })])];
  });
  tpl("arch-city-tshirt-x5", "Arched city name T-shirt", "tshirt", TS + "city name arch varsity travel", (W, H) => [page("none", [
    E("shape-arch", 226, 300, 700, { h: 700, c1: "#fde68a" }),
    E("icon-sun", 456, 440, 240, { c1: AMB }),
    T("LISBON", 80, 1030, W - 160, { size: 210, bold: true, family: "serif", color: INK, align: "center", lh: 1 }),
    T("PORTUGAL · 38.7° N", 80, 1270, W - 160, { size: 60, color: AMB, align: "center", ls: 6 }),
  ])]);
  tpl("plant-parent-tshirt-x5", "Plant parent T-shirt", "tshirt", TS + "plant parent leaf green funny", (W, H) => [page("none", [
    C(326, 200, 500, 500, "#dcfce7", { name: "Halo" }),
    E("icon-leaf", 426, 280, 300, { c1: "#16a34a" }),
    T("PLANT", 80, 780, W - 160, { size: 220, bold: true, color: "#166534", align: "center", lh: 1 }),
    T("parent", 80, 1010, W - 160, { size: 170, family: "serif", italic: true, color: "#16a34a", align: "center", lh: 1 }),
  ])]);
  tpl("stripes-speed-tshirt-x5", "Speed stripes T-shirt", "tshirt", TS + "speed stripes racing sport fast", (W, H) => [page("none", [
    ...[0, 1, 2].map((i) => R(120 + i * 60, 380 + i * 90, 900 - i * 120, 50, [ROS, AMB, IND][i], { radius: 25, name: "Speed stripe" })),
    T("FULL", 100, 720, W - 200, { size: 230, bold: true, italic: true, color: INK, lh: 1 }),
    T("THROTTLE", 100, 960, W - 200, { size: 170, bold: true, italic: true, color: ROS, lh: 1 }),
    T("Track day crew", 100, 1180, W - 200, { size: 70, color: MUTED }),
  ])]);
  tpl("moon-phases-tshirt-x5", "Moon phases T-shirt", "tshirt", TS + "moon phases night sky stars", (W, H) => [page("none", [
    ...[0, 1, 2, 3, 4].map((i) => C(116 + i * 190, 440, 160, 160, i === 2 ? GOLD : "#e5e7eb", { name: "Moon" })),
    ...[0, 1, 3, 4].map((i) => C(116 + i * 190 + (i < 2 ? 50 - i * 25 : -50 + (i - 3) * 25), 440, 160, 160, NAVY, { name: "Moon shadow" })),
    E("deco-stars", 420, 200, 300, { c1: GOLD }),
    T("trust the process", 80, 760, W - 160, { size: 110, family: "serif", italic: true, color: NAVY, align: "center", lh: 1.1 }),
  ])]);
  tpl("dog-walk-tshirt-x5", "Dog walker T-shirt", "tshirt", TS + "dog walk pet lover paw", (W, H) => [page("none", [
    R(176, 240, 800, 560, COR, { radius: 280, name: "Pill" }),
    T("DOG", 176, 330, 800, { size: 230, bold: true, color: WHITE, align: "center", lh: 1 }),
    T("PERSON", 176, 560, 800, { size: 120, bold: true, color: "#fff7ed", align: "center", ls: 8 }),
    T("Walks · Treats · Naps", 80, 920, W - 160, { size: 80, bold: true, color: INK, align: "center" }),
    E("icon-heart", 516, 1080, 120, { c1: COR }),
  ])]);
  tpl("est-year-tshirt-x5", "Established year T-shirt", "tshirt", TS + "family reunion established year classic", (W, H) => [page("none", [
    R(100, 360, W - 200, 8, INK, { name: "Rule" }),
    T("THE MORGANS", 100, 440, W - 200, { size: 116, bold: true, family: "serif", color: INK, align: "center" }),
    R(100, 640, W - 200, 8, INK, { name: "Rule" }),
    T("EST.", 100, 720, 400, { size: 90, bold: true, color: WINE(), lh: 1 }),
    T("1986", W - 500, 720, 400, { size: 90, bold: true, color: WINE(), align: "right", lh: 1 }),
    T("Family reunion", 100, 900, W - 200, { size: 100, family: "serif", italic: true, color: WINE(), align: "center" }),
  ])]);
  function WINE() { return "#9f1239"; }
  tpl("checklist-tshirt-x5", "Weekend checklist T-shirt", "tshirt", TS + "checklist weekend funny list", (W, H) => [page("none", [
    T("Weekend plans", 120, 220, W - 240, { size: 120, bold: true, color: INK }),
    ...["Coffee", "Sunshine", "Good book", "More coffee"].flatMap((t, i) => [
      R(140, 470 + i * 200, 110, 110, "none", { stroke: INK, sw: 10, radius: 16, name: "Box" }),
      E("icon-check-circle", 150, 480 + i * 200, 90, { c1: TEA }),
      T(t, 300, 482 + i * 200, W - 420, { size: 90, color: INK }),
    ]),
  ])]);

  /* ================= Stickers (3 in = 288 px) ================= */
  tpl("speech-bubble-sticker-x5", "Speech bubble sticker", "sticker-square-3in", "sticker square speech bubble hello chat", (W, H) => [page("#ffffff", [
    R(30, 50, 228, 150, IND, { radius: 40, name: "Bubble" }),
    S("triangle", 70, 190, 60, 50, IND, { rot: 180, name: "Tail" }),
    T("HELLO!", 30, 92, 228, { size: 46, bold: true, color: WHITE, align: "center" }),
  ])]);
  tpl("stamp-perforated-sticker-x5", "Postage stamp sticker", "sticker-square-3in", "sticker square stamp postage travel mail", (W, H) => [page("#fffbeb", [
    ...Array.from({ length: 6 }, (_, i) => [C(14 + i * 46, 4, 26, 26, WHITE, { name: "Perforation" }), C(14 + i * 46, H - 30, 26, 26, WHITE, { name: "Perforation" })]).flat(),
    R(34, 40, 220, 208, "#0e7490", { name: "Stamp art" }),
    E("icon-globe", 104, 70, 80, { c1: "#cffafe" }),
    T("AIR MAIL", 34, 170, 220, { size: 26, bold: true, color: WHITE, align: "center", ls: 3 }),
    T("2.50", 34, 206, 220, { size: 18, color: "#a5f3fc", align: "center" }),
  ])]);
  tpl("ribbon-banner-sticker-x5", "Ribbon banner sticker", "sticker-round-3in", "sticker round ribbon banner best quality", (W, H) => [page("#ffffff", [
    C(44, 30, 200, 200, GOLD, { name: "Medal" }),
    C(64, 50, 160, 160, AMB, { name: "Medal inner" }),
    T("★", 64, 82, 160, { size: 70, bold: true, color: WHITE, align: "center" }),
    R(14, 180, 260, 56, ROS, { radius: 6, name: "Ribbon" }),
    T("BEST QUALITY", 14, 196, 260, { size: 22, bold: true, color: WHITE, align: "center" }),
  ])]);
  tpl("emoji-face-sticker-x5", "Big smile sticker", "sticker-round-3in", "sticker round smile happy face emoji", (W, H) => [page(GOLD, [
    C(84, 80, 34, 46, INK, { name: "Eye" }), C(170, 80, 34, 46, INK, { name: "Eye" }),
    C(74, 130, 140, 80, INK, { name: "Smile" }), C(74, 116, 140, 74, GOLD, { name: "Smile cut" }),
    T("have a nice day", 24, 226, 240, { size: 20, bold: true, color: INK, align: "center" }),
  ])]);
  tpl("arrow-direction-sticker-x5", "This way up sticker", "sticker-square-3in", "sticker square arrow this way up packaging box", (W, H) => [page("#ffffff", [
    R(16, 16, 256, 256, "none", { stroke: INK, sw: 8, radius: 20, name: "Border" }),
    E("arrow-up", 70, 34, 60, { c1: INK }), E("arrow-up", 158, 34, 60, { c1: INK }),
    T("THIS WAY", 16, 150, 256, { size: 36, bold: true, color: INK, align: "center" }),
    T("UP", 16, 196, 256, { size: 44, bold: true, color: COR, align: "center" }),
  ])]);
  tpl("halftone-dots-sticker-x5", "Pop dots sticker", "sticker-round-3in", "sticker round pop art dots wow comic", (W, H) => [page("#fde047", [
    ...Array.from({ length: 25 }, (_, i) => C(20 + (i % 5) * 54, 20 + Math.floor(i / 5) * 54, 16 + (i % 3) * 6, 16 + (i % 3) * 6, "#f97316", { op: 0.6, name: "Dot" })),
    S("star", 34, 34, 220, 220, ROS, { points: 12, name: "Burst" }),
    T("WOW!", 34, 116, 220, { size: 58, bold: true, color: WHITE, align: "center", outline: { width: 3, color: INK } }),
  ])]);
  tpl("plant-label-sticker-x5", "Water me sticker", "sticker-round-3in", "sticker round plant water me pot garden", (W, H) => [page("#ecfccb", [
    C(14, 14, 260, 260, "none", { stroke: "#4d7c0f", sw: 6, name: "Ring" }),
    E("icon-leaf", 104, 40, 80, { c1: "#4d7c0f" }),
    T("water me", 24, 136, 240, { size: 40, family: "serif", italic: true, bold: true, color: "#365314", align: "center" }),
    T("every Sunday", 24, 194, 240, { size: 20, color: "#4d7c0f", align: "center" }),
  ])]);
  tpl("number-one-sticker-x5", "Number one fan sticker", "sticker-round-3in", "sticker round number one fan sport team", (W, H) => [page(NAVY, [
    T("#1", 24, 40, 240, { size: 130, bold: true, color: GOLD, align: "center", lh: 1 }),
    T("FAN", 24, 186, 240, { size: 46, bold: true, color: WHITE, align: "center", ls: 8 }),
  ])]);
  tpl("open-sign-sticker-x5", "We are open sticker", "sticker-square-3in", "sticker square open sign shop door hours", (W, H) => [page(INK, [
    R(24, 60, 240, 120, "none", { stroke: "#22d3ee", sw: 8, radius: 60, name: "Neon frame" }),
    T("OPEN", 24, 88, 240, { size: 60, bold: true, color: "#22d3ee", align: "center", shadow: { x: 0, y: 0, blur: 12, color: "#22d3ee", opacity: 0.9 } }),
    T("Mon–Sat · 9 to 7", 24, 210, 240, { size: 22, color: WHITE, align: "center" }),
  ])]);
  tpl("bee-kind-sticker-x5", "Be kind sticker", "sticker-square-3in", "sticker square be kind heart kindness", (W, H) => [page("#fce7f3", [
    E("deco-hearts", 74, 30, 140, { c1: ROS }),
    T("be", 24, 150, 240, { size: 40, family: "serif", italic: true, color: "#9d174d", align: "center" }),
    T("KIND", 24, 196, 240, { size: 56, bold: true, color: "#be185d", align: "center", ls: 6 }),
  ])]);

  /* ================= Logos (1000 × 1000) ================= */
  tpl("hexagon-tech-logo-x5", "Hexagon tech logo", "logo", "logo hexagon tech software cloud", (W, H) => [page(WHITE, [
    S("polygon", 360, 180, 280, 300, IND, { sides: 6, name: "Hexagon" }),
    S("polygon", 420, 245, 160, 170, WHITE, { sides: 6, name: "Hexagon inner" }),
    T("NODEWAVE", 100, 560, 800, { size: 96, bold: true, color: INK, align: "center", ls: 6 }),
    T("cloud software", 100, 700, 800, { size: 44, color: IND, align: "center" }),
  ])]);
  tpl("script-signature-logo-x5", "Signature script logo", "logo", "logo signature script personal brand photographer", (W, H) => [page("#fdf8f3", [
    T("Amelia Rose", 80, 350, 840, { size: 130, family: "serif", italic: true, color: "#7c2d12", align: "center" }),
    R(330, 560, 340, 3, "#c2410c", { name: "Rule" }),
    T("PHOTOGRAPHY", 80, 600, 840, { size: 44, color: "#9a3412", align: "center", ls: 14 }),
  ])]);
  tpl("stacked-block-logo-x5", "Stacked block logo", "logo", "logo stacked block construction build bold", (W, H) => [page(WHITE, [
    R(300, 200, 400, 120, AMB, { name: "Block" }), R(260, 340, 480, 120, INK, { name: "Block" }), R(220, 480, 560, 120, AMB, { name: "Block" }),
    T("BLOCKWORKS", 100, 660, 800, { size: 92, bold: true, color: INK, align: "center" }),
    T("BUILDERS · SINCE 2009", 100, 790, 800, { size: 38, color: MUTED, align: "center", ls: 4 }),
  ])]);
  tpl("leaf-circle-logo-x5", "Leaf in circle logo", "logo", "logo leaf circle organic wellness spa", (W, H) => [page("#f0fdf4", [
    C(330, 160, 340, 340, "#16a34a", { name: "Circle" }),
    E("icon-leaf", 400, 230, 200, { c1: WHITE }),
    T("Green Haven", 100, 560, 800, { size: 100, family: "serif", bold: true, color: "#14532d", align: "center" }),
    T("WELLNESS SPA", 100, 700, 800, { size: 40, color: "#16a34a", align: "center", ls: 10 }),
  ])]);
  tpl("letter-mark-logo-x5", "Bold letter mark logo", "logo", "logo letter mark initial bold agency", (W, H) => [page(INK, [
    R(320, 180, 360, 360, ROS, { radius: 60, name: "Tile" }),
    T("K", 320, 210, 360, { size: 300, bold: true, color: WHITE, align: "center", lh: 1 }),
    T("KESTREL", 100, 610, 800, { size: 100, bold: true, color: WHITE, align: "center", ls: 10 }),
    T("creative agency", 100, 750, 800, { size: 44, color: "#fda4af", align: "center" }),
  ])]);
  tpl("mountain-line-logo-x5", "Mountain line logo", "logo", "logo mountain outdoor adventure travel", (W, H) => [page(WHITE, [
    S("triangle", 260, 220, 300, 260, "none", { stroke: NAVY, sw: 18, name: "Peak" }),
    S("triangle", 440, 280, 300, 200, "none", { stroke: TEA, sw: 18, name: "Peak" }),
    R(220, 500, 560, 14, NAVY, { radius: 7, name: "Ground" }),
    T("SUMMIT TRAILS", 100, 580, 800, { size: 88, bold: true, color: NAVY, align: "center", ls: 4 }),
    T("guided hikes", 100, 710, 800, { size: 46, family: "serif", italic: true, color: TEA, align: "center" }),
  ])]);
  tpl("speech-logo-x5", "Speech bubble logo", "logo", "logo speech bubble chat podcast talk", (W, H) => [page("#eef2ff", [
    R(300, 170, 400, 280, IND, { radius: 70, name: "Bubble" }),
    S("triangle", 360, 430, 90, 80, IND, { rot: 180, name: "Tail" }),
    C(390, 285, 50, 50, WHITE, { name: "Dot" }), C(475, 285, 50, 50, WHITE, { name: "Dot" }), C(560, 285, 50, 50, WHITE, { name: "Dot" }),
    T("Talk Shop", 100, 580, 800, { size: 110, bold: true, color: INK, align: "center" }),
    T("THE PODCAST", 100, 730, 800, { size: 40, color: IND, align: "center", ls: 12 }),
  ])]);
  tpl("shield-crest-logo-x5", "Shield crest logo", "logo", "logo shield crest academy school security", (W, H) => [page(WHITE, [
    E("shape-shield", 350, 150, 300, { c1: NAVY }),
    T("A", 350, 240, 300, { size: 170, bold: true, family: "serif", color: GOLD, align: "center", lh: 1 }),
    T("ASHFORD ACADEMY", 80, 600, 840, { size: 80, bold: true, family: "serif", color: NAVY, align: "center" }),
    T("Learn · Lead · Serve", 80, 720, 840, { size: 42, color: MUTED, align: "center" }),
  ])]);
  tpl("droplet-logo-x5", "Water droplet logo", "logo", "logo water droplet plumbing clean fresh", (W, H) => [page(WHITE, [
    C(380, 260, 240, 240, "#0ea5e9", { name: "Drop" }),
    S("triangle", 400, 150, 200, 190, "#0ea5e9", { name: "Drop tip" }),
    C(430, 330, 60, 60, "#e0f2fe", { name: "Shine" }),
    T("PureFlow", 100, 580, 800, { size: 112, bold: true, color: "#0c4a6e", align: "center" }),
    T("PLUMBING", 100, 730, 800, { size: 42, color: "#0ea5e9", align: "center", ls: 14 }),
  ])]);
  tpl("bowl-steam-logo-x5", "Noodle bowl logo", "logo", "logo noodle bowl food restaurant ramen", (W, H) => [page("#fff7ed", [
    C(300, 180, 400, 360, ROS, { name: "Bowl" }),
    R(280, 160, 440, 200, "#fff7ed", { name: "Bowl cut" }),
    R(420, 150, 14, 130, COR, { radius: 7, name: "Steam" }), R(493, 130, 14, 150, COR, { radius: 7, name: "Steam" }), R(566, 150, 14, 130, COR, { radius: 7, name: "Steam" }),
    R(280, 350, 440, 24, "#9f1239", { radius: 12, name: "Rim" }),
    T("NOODLE BAR", 100, 600, 800, { size: 96, bold: true, color: "#7c2d12", align: "center", ls: 4 }),
    T("hand-pulled daily", 100, 730, 800, { size: 46, family: "serif", italic: true, color: ROS, align: "center" }),
  ])]);
}
