// ROUND 2 layout batch (filled by a helper; see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md). Pure module, no imports.
// 20 own Instagram layouts, batch B (14 square 1080 × 1080, 6 portrait 1080 × 1350): holiday greetings with our own
// shape artwork (Eid, Christmas, Diwali, Y2K New Year, Valentine's), an awareness day statement, fitness challenge,
// salon promo, coffee menu, book pick, podcast guest, travel postcard, pet adoption, webinar, product comparison,
// retro 80s Black Friday countdown, 10k followers thank-you and three carousels (back-to-school tips, app feature, FAQ).
export default function add(k) {
  const { tpl, T, S, R, C, E, F } = k;
  const { INK, MUTED, WHITE, GOLD } = k.K;
  const P = "instagram-post", PP = "instagram-portrait";
  const r1 = (v) => Math.round(v * 10) / 10;
  const page = (bg, layers) => k.page(bg, layers.flat(Infinity)); // our builders nest layer lists freely

  // Text centred vertically in a box (buttons, badges, tabs).
  const mid = (s, x, y, w, h, o) => { const t = T(s, x, y, w, { align: "center", ...o }); t.y = r1(y + (h - t.h) / 2); return t; };
  const pill = (s, x, y, w, h, fill, color, size = 34) => [R(x, y, w, h, fill, { radius: h / 2, name: "Button" }), mid(s, x, y, w, h, { size, bold: true, color, name: "Button text" })];
  // Rotates layers laid out upright around the centre of box b, so a card and everything on it turn together.
  function turn(b, deg, layers) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    for (const l of layers.flat()) {
      const dx = l.x + l.w / 2 - cx, dy = l.y + l.h / 2 - cy;
      l.x = r1(cx + dx * c - dy * s - l.w / 2);
      l.y = r1(cy + dx * s + dy * c - l.h / 2);
      l.rotation = (l.rotation || 0) + deg;
    }
    return layers;
  }

  /* ---------- 1. Eid: crescent moon inside a mosque arch, hanging lanterns ---------- */
  tpl("eid-mubarak-arch-ig5", "Emerald arch Eid Mubarak greeting post", P, "instagram eid mubarak ramadan greeting holiday festival crescent moon lanterns islamic wishes", () => {
    const BG = "#0b3b36", ARCH = "#115e54", GLD = "#f2c94c", CREAM = "#fdf6e3";
    const lantern = (x, len, w) => [R(x + w / 2 - 1.5, 0, 3, len, GLD, { name: "Lantern string" }), E("deco-lantern", x, len - 4, w, { c1: GLD, c2: "#f59e0b", c3: "#fde68a" })];
    return [page(BG, [
      E("deco-stars", 50, 660, 130, { c1: GLD, c2: "#5eead4" }),
      E("deco-stars", 900, 700, 120, { c1: GLD, c2: "#5eead4" }),
      R(222, 92, 636, 1100, "none", { radius: 318, stroke: GLD, sw: 4, name: "Arch outline" }),
      R(240, 110, 600, 1100, ARCH, { radius: 300, name: "Arch" }),
      lantern(120, 200, 70), lantern(40, 360, 52), lantern(890, 200, 70), lantern(990, 360, 52),
      C(440, 190, 200, 200, GLD, { name: "Moon" }),
      C(492, 166, 190, 190, ARCH, { name: "Moon shadow" }),
      S("star", 612, 250, 52, 52, GLD, { name: "Star" }),
      T("Eid\nMubarak", 260, 420, 560, { size: 124, family: "serif", bold: true, italic: true, color: CREAM, align: "center", lh: 1, name: "Headline" }),
      E("line-ornament", 390, 690, 300, { c1: GLD, c2: GLD }),
      T("May this Eid fill your home with peace, joy and many blessings.", 290, 750, 500, { size: 32, color: "#ccfbf1", align: "center", lh: 1.4, name: "Message" }),
      T("WITH LOVE FROM THE NOOR BAKERY FAMILY", 300, 920, 480, { size: 22, bold: true, color: GLD, align: "center", ls: 4, lh: 1.4, name: "Sign-off" }),
    ])];
  });

  /* ---------- 2. Christmas: geometric tree, gifts and snow hill ---------- */
  tpl("christmas-tree-greeting-ig5", "Red geometric Christmas tree greeting post", P, "instagram christmas merry christmas holiday greeting xmas tree winter season festive card", () => {
    const BG = "#9f1d2b", SNOW = "#fdf2f2";
    const snow = [[40, 40, 14], [200, 64, 10], [340, 28, 16], [480, 84, 9], [600, 40, 12], [980, 60, 16], [1030, 200, 10], [560, 190, 11], [1010, 380, 14], [600, 430, 9], [1040, 560, 12], [580, 640, 10], [630, 330, 8], [960, 250, 9], [380, 770, 12], [470, 700, 8], [90, 780, 10]];
    const balls = [[720, 360, GOLD], [840, 350, WHITE], [700, 520, "#f87171"], [810, 470, GOLD], [890, 540, WHITE], [650, 730, GOLD], [760, 640, WHITE], [880, 700, "#f87171"], [930, 770, GOLD], [720, 780, "#f87171"]];
    return [page(BG, [
      snow.map(([x, y, d]) => C(x, y, d, d, WHITE, { op: 0.75, name: "Snowflake" })),
      C(-160, 880, 1400, 420, SNOW, { name: "Snow hill" }),
      S("triangle", 650, 190, 280, 220, "#14532d", { name: "Tree top" }),
      S("triangle", 615, 320, 350, 260, "#166534", { name: "Tree middle" }),
      S("triangle", 580, 480, 420, 320, "#15803d", { name: "Tree bottom" }),
      R(760, 800, 60, 90, "#78350f", { name: "Trunk" }),
      balls.map(([x, y, c]) => C(x - 17, y - 17, 34, 34, c, { name: "Ornament" })),
      S("star", 745, 116, 90, 90, GOLD, { name: "Tree star" }),
      R(600, 820, 120, 96, GOLD, { radius: 6, name: "Gift" }), R(652, 820, 16, 96, BG, { name: "Ribbon" }), R(600, 856, 120, 14, BG, { name: "Ribbon" }),
      R(860, 846, 96, 72, WHITE, { radius: 6, name: "Gift" }), R(900, 846, 16, 72, "#15803d", { name: "Ribbon" }), R(860, 872, 96, 12, "#15803d", { name: "Ribbon" }),
      T("SEASON'S GREETINGS", 70, 110, 500, { size: 26, bold: true, color: "#fecaca", ls: 6, name: "Kicker" }),
      T("Merry", 64, 160, 500, { size: 120, family: "serif", italic: true, color: WHITE, lh: 1, name: "Headline" }),
      T("Christmas", 64, 282, 520, { size: 112, family: "serif", bold: true, color: GOLD, lh: 1, name: "Headline 2" }),
      T("Wishing you warm cocoa, cosy nights and a very happy holiday season.", 70, 440, 480, { size: 34, color: "#fee2e2", lh: 1.4, name: "Message" }),
      R(70, 620, 80, 4, GOLD, { name: "Rule" }),
      T("Love, the Pine & Co. team", 70, 650, 480, { size: 36, family: "serif", italic: true, color: WHITE, name: "Sign-off" }),
      T("Closed 25 & 26 Dec  ·  back on the 27th", 60, 990, 500, { size: 26, bold: true, color: BG, name: "Hours" }),
    ])];
  });

  /* ---------- 3. Diwali: diya lamp on a petal rangoli, string of lights ---------- */
  tpl("diwali-diya-rangoli-ig5", "Purple diya and rangoli Happy Diwali post", P, "instagram diwali happy diwali festival of lights greeting holiday diya lamp rangoli wishes", () => {
    const cx = 540, cy = 400;
    const petals = Array.from({ length: 16 }, (_, i) => {
      const a = (i * 22.5 * Math.PI) / 180, px = cx + 205 * Math.sin(a), py = cy - 205 * Math.cos(a);
      return C(r1(px - 28), r1(py - 56), 56, 112, i % 2 ? "#fb923c" : "#f472b6", { rot: i * 22.5, name: "Rangoli petal" });
    });
    const dots = Array.from({ length: 16 }, (_, i) => {
      const a = ((i * 22.5 + 11.25) * Math.PI) / 180;
      return C(r1(cx + 250 * Math.sin(a) - 9), r1(cy - 250 * Math.cos(a) - 9), 18, 18, "#fde68a", { name: "Rangoli dot" });
    });
    const lights = Array.from({ length: 14 }, (_, i) => {
      const x = 22 + i * 78, y = i % 2 ? 46 : 26;
      return [R(x + 13, 0, 2, y, "#fbbf24", { op: 0.6, name: "Light string" }), C(x - 6, y - 6, 40, 40, "#fbbf24", { op: 0.25, name: "Glow" }), C(x, y, 28, 28, i % 2 ? "#fde68a" : "#fb923c", { name: "Light" })];
    });
    return [page(["#2e1065", "#7c2d12", 160], [
      lights,
      C(cx - 275, cy - 275, 550, 550, "none", { stroke: "#fbbf24", sw: 3, op: 0.6, name: "Rangoli ring" }),
      petals, dots,
      C(cx - 160, cy - 160, 320, 320, "#4c1d95", { name: "Rangoli centre" }),
      S("star", cx - 130, cy - 130, 260, 260, "#6d28d9", { points: 8, name: "Rangoli star" }),
      C(cx - 140, cy - 140, 280, 280, "none", { stroke: "#fde68a", sw: 2, op: 0.7, name: "Inner ring" }),
      C(cx - 110, 230, 220, 220, "#fbbf24", { op: 0.18, name: "Flame glow" }),
      E("shape-drop", cx - 35, 248, 70, { h: 112, c1: "#fb923c" }),
      E("shape-drop", cx - 20, 290, 40, { h: 66, c1: "#fde68a" }),
      E("shape-half-circle", cx - 130, 356, 260, { rot: 180, c1: "#ea580c" }),
      R(cx - 140, 362, 280, 18, "#fbbf24", { radius: 9, name: "Diya rim" }),
      [-60, 0, 60].map((d) => C(cx + d - 10, d ? 408 : 420, 20, 20, "#fde68a", { name: "Diya dot" })),
      T("Happy Diwali", 40, 700, 1000, { size: 116, family: "serif", bold: true, color: "#fde68a", align: "center", lh: 1.1, name: "Headline" }),
      T("May the festival of lights fill your home with joy, warmth and new beginnings.", 140, 840, 800, { size: 34, color: "#fed7aa", align: "center", lh: 1.4, name: "Message" }),
      T("WARM WISHES FROM SAFFRON SWEETS", 40, 980, 1000, { size: 24, bold: true, color: "#fbbf24", align: "center", ls: 6, name: "Sign-off" }),
      E("deco-sparkle", 60, 880, 70, { c1: "#fde68a" }),
      E("deco-sparkle", 950, 860, 80, { c1: "#fde68a" }),
    ])];
  });

  /* ---------- 4. Portrait New Year: Y2K pastel, chrome year, retro computer window ---------- */
  tpl("y2k-new-year-ig5", "Y2K pastel New Year party post", PP, "instagram portrait new year happy new year nye party y2k aesthetic retro pastel 2027 celebration", () => {
    const DK = "#1e1b4b", PINK = "#f472b6";
    const checker = (y) => [R(0, y, 1080, 80, WHITE, { name: "Checker strip" }), Array.from({ length: 54 }, (_, i) => (i % 27) % 2 === (i < 27 ? 0 : 1) ? R((i % 27) * 40, y + (i < 27 ? 0 : 40), 40, 40, DK, { name: "Checker" }) : null)];
    return [page(["#a5b4fc", "#f9a8d4", 135], [
      checker(0),
      pill("HAPPY NEW YEAR", 290, 124, 500, 76, DK, WHITE, 30),
      T("2027", 0, 228, 1080, { size: 330, bold: true, color: "#f8fafc", align: "center", lh: 1, outline: { color: "#6d28d9", width: 7 }, shadow: { x: 12, y: 14, blur: 0, color: "#ec4899", opacity: 1 }, name: "Year" }),
      E("deco-sparkles", 860, 150, 150, { c1: WHITE, c2: "#fef08a" }),
      E("deco-sparkle", 80, 220, 110, { c1: WHITE }),
      E("deco-sparkle", 930, 500, 80, { c1: "#fef08a" }),
      R(154, 654, 800, 440, DK, { name: "Window shadow" }),
      R(140, 640, 800, 440, WHITE, { stroke: DK, sw: 5, name: "Window" }),
      R(140, 640, 800, 72, "#c4b5fd", { stroke: DK, sw: 5, name: "Title bar" }),
      T("new_year.exe", 170, 658, 520, { size: 30, family: "mono", bold: true, color: DK, name: "Window title" }),
      [776, 826, 876].map((x) => R(x, 658, 36, 36, WHITE, { stroke: DK, sw: 3, name: "Window button" })),
      mid("x", 876, 658, 36, 36, { size: 26, family: "mono", bold: true, color: DK, name: "Close" }),
      T("Loading a fresh start...", 190, 750, 700, { size: 40, family: "mono", bold: true, color: DK, name: "Loading" }),
      R(190, 830, 700, 56, WHITE, { stroke: DK, sw: 4, name: "Progress track" }),
      Array.from({ length: 11 }, (_, i) => R(r1(198 + i * 57.2), 838, 50, 40, PINK, { name: "Progress block" })),
      T("99%", 590, 900, 300, { size: 32, family: "mono", bold: true, color: "#be185d", align: "right", name: "Percent" }),
      T("NYE party  ·  Dec 31  ·  9 pm till late", 190, 990, 700, { size: 32, bold: true, color: DK, name: "Party" }),
      E("face-happy", 40, 960, 130, { c1: "#fef08a", c2: DK, rot: -12 }),
      T("See you in the new year, besties", 0, 1128, 1080, { size: 48, family: "serif", italic: true, color: DK, align: "center", name: "Line" }),
      T("@yourhandle", 0, 1196, 1080, { size: 30, bold: true, color: "#6d28d9", align: "center", name: "Handle" }),
      S("star", 50, 580, 60, 60, WHITE, { points: 4, name: "Twinkle" }),
      S("star", 960, 1150, 50, 50, "#fef08a", { points: 4, name: "Twinkle" }),
      checker(1270),
    ])];
  });

  /* ---------- 5. Valentine's: shape-built envelope with a love note ---------- */
  tpl("valentines-love-letter-ig5", "Pink love letter Valentine's Day post", P, "instagram valentines day valentine love letter hearts greeting holiday romance gift florist", () => {
    const hearts = [[70, 80, 70, "#fda4af", -15], [930, 90, 80, "#fb7185", 12], [120, 430, 50, "#f43f5e", 10], [910, 420, 60, "#fda4af", -10], [60, 640, 40, "#fb7185", 0], [990, 620, 44, "#f43f5e", 20], [210, 210, 36, "#fb7185", 8], [850, 270, 40, "#f43f5e", -12], [50, 860, 34, "#fda4af", 14], [990, 850, 30, "#fb7185", -8]];
    return [page("#ffe4e6", [
      hearts.map(([x, y, s, c, rot]) => S("heart", x, y, s, s * 0.9, c, { rot, name: "Heart" })),
      turn({ x: 310, y: 150, w: 460, h: 360 }, -3, [
        R(310, 150, 460, 360, WHITE, { name: "Letter" }),
        T("you + me", 330, 186, 420, { size: 64, family: "serif", italic: true, color: "#be123c", align: "center", name: "Letter text" }),
        S("heart", 520, 272, 40, 36, "#f43f5e", { name: "Letter heart" }),
      ]),
      R(240, 330, 600, 380, "#fb7185", { name: "Envelope" }),
      S("triangle", 200, 370, 380, 300, "#f43f5e", { rot: 90, name: "Envelope flap" }),
      S("triangle", 500, 370, 380, 300, "#f43f5e", { rot: -90, name: "Envelope flap" }),
      S("triangle", 240, 470, 600, 240, "#e11d48", { name: "Envelope pocket" }),
      S("heart", 490, 428, 100, 90, "#9f1239", { stroke: WHITE, sw: 5, name: "Heart seal" }),
      T("Happy Valentine's Day", 40, 756, 1000, { size: 84, family: "serif", bold: true, color: "#9f1239", align: "center", name: "Headline" }),
      T("Love is in the details: hand-tied roses, gift boxes and cards, ready until 14 Feb.", 140, 876, 800, { size: 32, color: "#881337", align: "center", lh: 1.35, name: "Message" }),
      T("@petalandpost", 0, 990, 1080, { size: 30, bold: true, color: "#e11d48", align: "center", name: "Handle" }),
    ])];
  });

  /* ---------- 6. Awareness day: minimalist typographic statement ---------- */
  tpl("kindness-day-statement-ig5", "Minimal World Kindness Day statement post", P, "instagram awareness day world kindness day minimalist typography statement quote kind simple", () => {
    const INK1 = "#1c1917", RED = "#ef4444";
    const big = (s, y, color) => T(s, 74, y, 940, { size: 168, bold: true, color, lh: 0.95, ls: -4, name: "Statement" });
    return [page("#f7f5f0", [
      T("13 NOVEMBER", 80, 80, 500, { size: 26, family: "mono", bold: true, color: INK1, ls: 4, name: "Date" }),
      C(930, 78, 70, 70, RED, { name: "Dot" }),
      big("Be kind.", 250, INK1),
      big("It costs", 410, INK1),
      big("nothing.", 570, RED),
      T("Hold the door. Send the text. Say thank you.", 80, 790, 920, { size: 36, family: "serif", italic: true, color: "#57534e", name: "Line" }),
      R(80, 900, 920, 3, INK1, { name: "Rule" }),
      T("World Kindness Day", 80, 930, 500, { size: 30, bold: true, color: INK1, name: "Day" }),
      T("@yourhandle", 600, 930, 400, { size: 30, color: "#78716c", align: "right", name: "Handle" }),
    ])];
  });

  /* ---------- 7. Carousel: back-to-school study tips on notebook paper (5 pages) ---------- */
  tpl("study-tips-carousel-ig5", "Notebook back to school study tips carousel", P, "instagram carousel back to school study tips students habits notebook swipe education school", () => {
    const PAPER = "#fffdf6", BLUE = "#2563eb", INK2 = "#1e293b", TABS = ["#fca5a5", "#fde047", "#86efac", "#93c5fd", "#c4b5fd"];
    const paper = (active) => [
      Array.from({ length: 15 }, (_, i) => R(0, 140 + i * 64, 1080, 2, "#dbe5f5", { name: "Ruled line" })),
      R(150, 0, 3, 1080, "#f5b4b4", { name: "Margin line" }),
      [200, 518, 836].map((y) => C(52, y, 44, 44, "#e9e4d8", { name: "Punch hole" })),
      TABS.flatMap((c, j) => { const w = j === active ? 74 : 44, y = 150 + j * 160; return [R(1080 - w, y, w, 140, c, { name: "Tab" }), mid(String(j + 1), 1080 - w, y, w, 140, { size: 28, bold: true, color: INK2, name: "Tab number" })]; }),
    ];
    const pencil = (x, y, len, th, deg) => turn({ x, y, w: len, h: th }, deg, [
      R(x, y, len * 0.1, th, "#f9a8d4", { radius: 8, name: "Eraser" }),
      R(x + len * 0.1, y, len * 0.06, th, "#cbd5e1", { name: "Ferrule" }),
      R(x + len * 0.16, y, len * 0.64, th, "#facc15", { name: "Pencil" }),
      R(x + len * 0.16, y + th * 0.36, len * 0.64, th * 0.28, "#eab308", { name: "Pencil stripe" }),
      S("triangle", x + len * 0.9 - th / 2, y + th / 2 - len * 0.1, th, len * 0.2, "#f5d0a9", { rot: 90, name: "Pencil tip" }),
      S("triangle", x + len * 0.97 - th * 0.15, y + th / 2 - len * 0.03, th * 0.3, len * 0.06, INK2, { rot: 90, name: "Pencil lead" }),
    ]);
    const num = (n) => T(`${n} / 5`, 800, 1006, 180, { size: 28, family: "mono", bold: true, color: BLUE, align: "right", name: "Page number" });
    // Ruled-line rows: text tops sit 20 px below a 64 px grid so the baselines land on the lines.
    const row = (i) => 140 + i * 64 - 44;
    const tips = [
      ["Plan the night before", "Pack your bag and check tomorrow's timetable before bed. Mornings get calmer, fast.", ["Bag packed", "Timetable checked", "Water bottle filled"], "Calmer mornings, every day."],
      ["Study in 25-minute sprints", "Set a timer, work on one thing, then take a 5-minute break. Repeat four times.", ["Phone in another room", "Timer set", "One task only"], "Focus beats long hours."],
      ["Teach it to someone", "Explain today's lesson to a friend or your pet. If you can teach it, you know it.", ["Pick one topic", "Explain it out loud", "Note what you missed"], "The best memory trick there is."],
    ];
    const cover = page(PAPER, [
      paper(0),
      T("BACK TO SCHOOL", 200, 100, 600, { size: 30, bold: true, color: BLUE, ls: 6, name: "Kicker" }),
      R(192, 392, 300, 96, "#fde047", { op: 0.85, rot: -1, name: "Highlighter" }),
      T("3 study habits\nthat actually\nstick", 196, 166, 780, { size: 104, bold: true, color: INK2, lh: 1.02, name: "Title" }),
      pencil(220, 640, 600, 70, -12),
      E("deco-stars", 830, 520, 120, { c1: BLUE, c2: "#f59e0b" }),
      T("Swipe for the tips", 200, 900, 420, { size: 42, family: "serif", italic: true, color: INK2, name: "Swipe" }),
      E("arrow-sketch", 590, 896, 130, { c1: BLUE }),
      num(1),
    ]);
    const tipPage = ([title, body, todo, why], i) => page(PAPER, [
      paper(i + 1),
      T(`TIP 0${i + 1}`, 200, 76, 400, { size: 30, family: "mono", bold: true, color: BLUE, ls: 4, name: "Tip label" }),
      T(String(i + 1), 750, 120, 240, { size: 360, bold: true, color: PAPER, align: "center", lh: 1.1, outline: { color: BLUE, width: 4 }, name: "Big number" }),
      turn({ x: 200, y: 150, w: 520, h: 400 }, -2, [
        R(208, 162, 520, 400, "#000000", { op: 0.1, name: "Note shadow" }),
        R(200, 150, 520, 400, "#fde047", { name: "Sticky note" }),
        R(390, 130, 140, 40, "#bfdbfe", { op: 0.85, name: "Tape" }),
        T(title, 240, 206, 440, { size: 60, bold: true, color: INK2, lh: 1.08, name: "Tip title" }),
        T(why, 240, 476, 440, { size: 32, family: "serif", italic: true, color: "#854d0e", name: "Tip why" }),
      ]),
      T(body, 200, row(8), 780, { size: 36, color: "#334155", lh: 64 / 36, name: "Tip text" }),
      T("Try this:", 200, row(10), 400, { size: 36, family: "serif", bold: true, italic: true, color: BLUE, lh: 64 / 36, name: "Checklist title" }),
      todo.flatMap((s, j) => [
        R(200, row(11 + j) + 16, 32, 32, "none", { stroke: INK2, sw: 3, radius: 4, name: "Checkbox" }),
        T(s, 252, row(11 + j), 520, { size: 34, color: INK2, lh: 64 / 34, name: "Checklist item" }),
      ]),
      num(i + 2),
    ]);
    const end = page(PAPER, [
      paper(4),
      T("Quick recap", 200, 90, 760, { size: 96, bold: true, color: INK2, name: "Heading" }),
      tips.flatMap(([title], j) => [
        R(200, 290 + j * 110, 50, 50, WHITE, { stroke: INK2, sw: 3, radius: 6, name: "Checkbox" }),
        E("icon-check", 204, 280 + j * 110, 56, { c1: "#16a34a" }),
        T(title, 280, 290 + j * 110 - 2, 680, { size: 44, bold: true, color: INK2, name: "Recap item" }),
      ]),
      turn({ x: 580, y: 650, w: 380, h: 280 }, 4, [
        R(588, 662, 380, 280, "#000000", { op: 0.1, name: "Note shadow" }),
        R(580, 650, 380, 280, "#86efac", { name: "Sticky note" }),
        mid("Save this for exam week!", 610, 650, 320, 280, { size: 50, bold: true, color: INK2, lh: 1.1, name: "Note text" }),
      ]),
      E("icon-bookmark", 200, 680, 80, { c1: BLUE }),
      T("Follow\n@studywithsam\nfor more tips", 200, 790, 340, { size: 36, bold: true, color: INK2, lh: 1.25, name: "Follow" }),
      num(5),
    ]);
    return [cover, ...tips.map(tipPage), end];
  });

  /* ---------- 8. Portrait: 30-day fitness challenge calendar grid ---------- */
  tpl("30-day-core-challenge-ig5", "Black and lime 30-day fitness challenge post", PP, "instagram portrait fitness challenge 30 day workout gym calendar core exercise plan training", () => {
    const BG = "#0c0a09", LIME = "#a3e635", CELL = "#1c1917";
    const moves = [["squats", 20, 10], ["push-ups", 10, 5], ["sec plank", 30, 15], ["lunges", 16, 8], ["crunches", 20, 10], ["burpees", 8, 4]];
    let m = 0;
    const cells = Array.from({ length: 30 }, (_, i) => {
      const d = i + 1, x = 60 + (i % 6) * 162, y = 430 + Math.floor(i / 6) * 144, week = Math.floor(i / 7);
      const rest = d % 7 === 0, last = d === 30;
      let big, small;
      if (rest) { big = "REST"; small = "stretch"; }
      else if (last) { big = "MAX"; small = "plank"; }
      else { const [name, base, step] = moves[m++ % moves.length]; big = String(base + step * week); small = name; }
      const on = rest || last, fg = on ? BG : WHITE;
      return [
        R(x, y, 150, 132, last ? "#f472b6" : rest ? LIME : CELL, { radius: 16, name: "Day cell" }),
        T(`DAY ${d}`, x + 14, y + 12, 122, { size: 18, family: "mono", bold: true, color: on ? BG : LIME, name: "Day" }),
        T(big, x, y + 40, 150, { size: rest ? 36 : 46, bold: true, color: fg, align: "center", lh: 1, name: "Reps" }),
        T(small, x, y + 92, 150, { size: 22, color: on ? BG : "#d6d3d1", align: "center", name: "Move" }),
      ];
    });
    return [page(BG, [
      T("30-DAY", 60, 60, 640, { size: 120, bold: true, color: LIME, lh: 0.95, name: "Title" }),
      T("CORE\nCHALLENGE", 60, 180, 640, { size: 84, bold: true, color: WHITE, lh: 1, name: "Title 2" }),
      C(745, 45, 290, 290, "none", { stroke: LIME, sw: 4, name: "Photo ring" }),
      F(760, 60, 260, 260, { shape: "circle", name: "Coach photo" }),
      T("Starts 1 December  ·  one move a day  ·  10 minutes", 60, 372, 960, { size: 28, color: "#d6d3d1", name: "Subtitle" }),
      cells,
      T("Tag #CoreWith30 to join the crew", 60, 1172, 640, { size: 34, bold: true, color: WHITE, name: "Hashtag" }),
      T("Save this post and tick off each day", 60, 1226, 640, { size: 28, color: "#a8a29e", name: "Save" }),
      pill("Join free", 760, 1176, 260, 84, LIME, BG, 34),
    ])];
  });

  /* ---------- 9. Beauty salon: offset photo, price list and round offer badge ---------- */
  tpl("salon-glow-season-ig5", "Blush beauty salon price list promo post", P, "instagram beauty salon promo makeup facial hair nails price list offer spa glow booking", () => {
    const ACC = "#9d174d", DEEP = "#4a0d24";
    const service = (y, name, price) => [
      T(name, 60, y, 330, { size: 32, bold: true, color: DEEP, name: "Service" }),
      T(price, 390, y, 130, { size: 32, bold: true, color: ACC, align: "right", name: "Price" }),
      R(60, y + 56, 460, 2, "#f9a8d4", { name: "Rule" }),
    ];
    return [page("#fbe7ea", [
      R(580, 80, 460, 940, "none", { stroke: ACC, sw: 3, name: "Photo outline" }),
      F(560, 60, 460, 940, { name: "Model photo" }),
      T("STUDIO ROSÉ", 60, 70, 460, { size: 28, bold: true, color: ACC, ls: 8, name: "Brand" }),
      T("Glow\nseason", 56, 118, 480, { size: 140, family: "serif", italic: true, color: DEEP, lh: 0.95, name: "Headline" }),
      E("deco-sparkles", 400, 150, 100, { c1: ACC, c2: "#f472b6" }),
      T("Treat yourself before the holidays", 60, 410, 440, { size: 32, color: "#831843", lh: 1.3, name: "Subtitle" }),
      service(540, "Signature facial", "$45"),
      service(620, "Party makeup", "$60"),
      service(700, "Blowout & style", "$35"),
      service(780, "Gel manicure", "$25"),
      T("Book: (555) 014-2290\n5 Elm Avenue, Westfield", 60, 900, 360, { size: 26, color: "#831843", lh: 1.4, name: "Contact" }),
      C(430, 812, 230, 230, ACC, { stroke: "#fbe7ea", sw: 8, name: "Offer badge" }),
      T("20%", 430, 860, 230, { size: 76, bold: true, color: WHITE, align: "center", lh: 1, name: "Offer" }),
      T("OFF FIRST VISIT", 465, 944, 160, { size: 20, bold: true, color: "#fce7f3", align: "center", ls: 2, name: "Offer note" }),
    ])];
  });

  /* ---------- 10. Portrait: coffee shop menu with an illustrated cup ---------- */
  tpl("little-bean-coffee-menu-ig5", "Kraft coffee shop menu post", PP, "instagram portrait coffee shop menu cafe drinks prices espresso latte bakery", () => {
    const BR = "#3b2418", CAR = "#b45309";
    const item = (x, y, name, price) => [
      T(name, x, y, 330, { size: 34, color: BR, name: "Item" }),
      T(price, x + 330, y, 110, { size: 34, bold: true, color: BR, align: "right", name: "Price" }),
    ];
    const head = (x, y, s) => T(s, x, y, 440, { size: 30, bold: true, color: CAR, ls: 4, name: "Section" });
    return [page("#f3e9dc", [
      T("LITTLE BEAN COFFEE CO.", 70, 70, 560, { size: 26, bold: true, color: CAR, ls: 6, name: "Brand" }),
      T("Menu", 62, 108, 560, { size: 200, family: "serif", italic: true, bold: true, color: BR, lh: 1, name: "Title" }),
      T("Brewed fresh, every single cup", 70, 330, 540, { size: 32, family: "serif", italic: true, color: "#78350f", name: "Subtitle" }),
      [685, 745, 805].map((x, i) => E("line-wavy", x, 96 + (i % 2) * 12, 150, { c1: "#9c8b7a", rot: 90, name: "Steam" })),
      C(640, 384, 380, 64, "#e2cdb4", { name: "Saucer" }),
      C(900, 222, 120, 120, "none", { stroke: BR, sw: 24, name: "Cup handle" }),
      R(690, 196, 260, 210, BR, { radius: 44, name: "Cup" }),
      R(676, 182, 288, 34, "#5b3a29", { radius: 17, name: "Cup rim" }),
      C(696, 186, 248, 22, "#c08457", { name: "Coffee" }),
      S("heart", 788, 266, 64, 58, "#f3e9dc", { name: "Cup heart" }),
      R(70, 470, 940, 3, BR, { name: "Divider" }),
      head(70, 510, "ESPRESSO BAR"),
      item(70, 570, "Espresso", "3.00"), item(70, 636, "Americano", "3.50"), item(70, 702, "Flat white", "4.20"),
      item(70, 768, "Cappuccino", "4.50"), item(70, 834, "Caramel latte", "4.80"),
      R(540, 510, 2, 430, "#d6c2a8", { name: "Column rule" }),
      head(580, 510, "NOT COFFEE"),
      item(580, 570, "Chai latte", "4.20"), item(580, 636, "Matcha latte", "4.80"), item(580, 702, "Hot chocolate", "4.00"),
      head(580, 790, "BAKERY"),
      item(580, 850, "Croissant", "3.20"), item(580, 916, "Banana bread", "3.50"),
      T("Extra shot +0.80  ·  oat, almond or soy milk +0.50", 70, 1000, 940, { size: 28, family: "serif", italic: true, color: "#78350f", align: "center", name: "Extras" }),
      R(0, 1080, 1080, 270, BR, { name: "Footer band" }),
      T("OPEN DAILY", 70, 1130, 400, { size: 26, bold: true, color: "#fbbf24", ls: 6, name: "Open" }),
      T("7 am to 6 pm", 70, 1170, 480, { size: 56, bold: true, color: "#f3e9dc", name: "Hours" }),
      T("12 Harbor Road  ·  @littlebeancoffee", 70, 1262, 940, { size: 28, color: "#e2cdb4", name: "Address" }),
      pill("Order ahead", 700, 1140, 310, 90, "#f3e9dc", BR, 34),
    ])];
  });

  /* ---------- 11. Book recommendation: book mock-up with pages and spine ---------- */
  tpl("book-club-pick-ig5", "Green book club pick recommendation post", P, "instagram book recommendation book club review reading library novel bookstagram read", () => {
    const CREAM = "#f5ecd7", MUST = "#e9b949";
    return [page("#1f3a2e", [
      T("BOOK CLUB PICK  ·  DECEMBER", 70, 70, 940, { size: 28, bold: true, color: MUST, ls: 6, name: "Kicker" }),
      R(132, 204, 380, 500, "#000000", { op: 0.25, radius: 6, name: "Book shadow" }),
      R(462, 190, 30, 486, "#efe6d0", { radius: 4, name: "Pages" }),
      Array.from({ length: 9 }, (_, i) => R(468, 220 + i * 50, 22, 2, "#cfc4a8", { name: "Page edge" })),
      F(110, 180, 360, 500, { name: "Book cover" }),
      R(110, 180, 24, 500, "#000000", { op: 0.2, name: "Spine shade" }),
      T("The Quiet\nOrchard", 560, 176, 460, { size: 76, family: "serif", bold: true, color: CREAM, lh: 1.05, name: "Book title" }),
      T("by Nora Hale", 560, 350, 460, { size: 36, family: "serif", italic: true, color: "#d9cfb6", name: "Author" }),
      E("badge-rating", 560, 418, 260, { c1: MUST }),
      T("A slow, warm story about starting over in a small town. Perfect for long winter weekends.", 560, 516, 450, { size: 30, color: "#e7dfc9", lh: 1.45, name: "Review" }),
      T("320 pages  ·  literary fiction", 560, 716, 450, { size: 26, bold: true, color: MUST, name: "Details" }),
      R(70, 800, 940, 200, "#2b4a3c", { radius: 24, name: "Meetup card" }),
      E("icon-calendar", 110, 852, 96, { c1: MUST, c2: CREAM }),
      T("Next meetup", 240, 834, 740, { size: 34, bold: true, color: MUST, name: "Meetup" }),
      T("Thursday 4 Dec, 7 pm  ·  Riverside Library", 240, 884, 740, { size: 32, color: CREAM, name: "Meetup when" }),
      T("New members always welcome", 240, 932, 740, { size: 28, family: "serif", italic: true, color: "#d9cfb6", name: "Welcome" }),
    ])];
  });

  /* ---------- 12. Podcast: guest circle photo, big episode number and waveform ---------- */
  tpl("podcast-guest-episode-ig5", "Dark podcast new episode guest post", P, "instagram podcast new episode guest interview audio listen show waveform", () => {
    const OR = "#f97316", LIGHT = "#f9fafb", MUTE = "#9ca3af";
    const bars = Array.from({ length: 44 }, (_, i) => {
      const h = r1(24 + 96 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.17)));
      return R(r1(70 + i * 21.4), r1(712 - h / 2), 12, h, i < 26 ? OR : "#374151", { radius: 6, name: "Wave bar" });
    });
    return [page("#111827", [
      T("THE SIDE PROJECT PODCAST", 70, 64, 940, { size: 28, bold: true, color: MUTE, ls: 6, name: "Show" }),
      C(60, 140, 470, 470, "none", { stroke: OR, sw: 6, name: "Photo ring" }),
      F(85, 165, 420, 420, { shape: "circle", name: "Guest photo" }),
      pill("NEW EPISODE", 580, 160, 280, 60, OR, "#111827", 24),
      T("EP. 42", 576, 240, 450, { size: 140, bold: true, color: LIGHT, lh: 1, name: "Episode" }),
      T("with", 580, 400, 440, { size: 36, family: "serif", italic: true, color: OR, name: "With" }),
      T("Dana Okafor", 580, 446, 440, { size: 58, bold: true, color: LIGHT, name: "Guest" }),
      T("Founder, Field Notes Studio", 580, 524, 440, { size: 28, color: MUTE, name: "Guest role" }),
      bars,
      T("How to grow a side project without burning out", 70, 790, 940, { size: 50, bold: true, color: LIGHT, lh: 1.15, name: "Topic" }),
      C(70, 950, 84, 84, OR, { name: "Play button" }),
      S("triangle", 96, 975, 40, 34, "#111827", { rot: 90, name: "Play" }),
      T("Listen now  ·  link in bio", 180, 970, 520, { size: 34, bold: true, color: LIGHT, name: "Listen" }),
      T("42 min", 760, 972, 250, { size: 30, family: "mono", color: MUTE, align: "right", name: "Length" }),
    ])];
  });

  /* ---------- 13. Portrait travel: postcard with stamp and postmark ---------- */
  tpl("lisbon-travel-postcard-ig5", "Postcard travel destination post", PP, "instagram portrait travel destination postcard holiday trip vacation package tour stamp lisbon", () => {
    const NAV = "#0c4a6e", TER = "#c2410c";
    const chip = (x, w, s) => pill(s, x, 1126, w, 70, NAV, WHITE, 28);
    return [page("#f6efe4", [
      F(60, 60, 960, 700, { name: "Destination photo" }),
      C(100, 96, 170, 170, "none", { stroke: NAV, sw: 4, op: 0.85, name: "Postmark" }),
      C(116, 112, 138, 138, "none", { stroke: NAV, sw: 2, op: 0.85, name: "Postmark ring" }),
      mid("LISBON\n12 . 05", 116, 112, 138, 138, { size: 24, family: "mono", bold: true, color: NAV, lh: 1.3, op: 0.85, name: "Postmark text" }),
      [0, 1, 2].map((i) => E("line-wavy", 286, 128 + i * 34, 220, { c1: NAV, op: 0.85 })),
      T("WISH YOU WERE HERE", 90, 680, 420, { size: 24, bold: true, color: WHITE, align: "center", ls: 4, bg: { color: NAV, pad: 0.6, radius: 0.2 }, name: "Tag" }),
      turn({ x: 790, y: 600, w: 200, h: 250 }, 6, [
        R(796, 608, 200, 250, "#000000", { op: 0.15, name: "Stamp shadow" }),
        R(790, 600, 200, 250, WHITE, { name: "Stamp" }),
        R(800, 610, 180, 230, "none", { stroke: TER, sw: 2, name: "Stamp border" }),
        F(812, 622, 156, 156, { name: "Stamp photo" }),
        T("PORTUGAL", 800, 790, 180, { size: 22, bold: true, color: TER, align: "center", ls: 3, name: "Stamp text" }),
      ]),
      T("Lisbon", 56, 788, 700, { size: 190, family: "serif", bold: true, italic: true, color: NAV, lh: 1, name: "Destination" }),
      T("Pastel streets, ocean sunsets and the best custard tarts you will ever taste.", 60, 998, 940, { size: 34, color: "#44403c", lh: 1.35, name: "Description" }),
      chip(60, 210, "7 nights"), chip(290, 230, "from $899"), chip(540, 320, "flights included"),
      T("Book by 30 November  ·  link in bio", 60, 1240, 760, { size: 32, bold: true, color: TER, name: "Call to action" }),
      E("arrow-right", 900, 1232, 110, { c1: TER }),
    ])];
  });

  /* ---------- 14. Pet adoption: tilted profile card, facts and paw trail ---------- */
  tpl("adopt-biscuit-pet-ig5", "Yellow pet adoption profile post", P, "instagram pet adoption adopt dog rescue shelter animal puppy profile meet", () => {
    const BR = "#78350f", DK = "#451a03", OR = "#ea580c";
    const paw = (x, y, s, rot = 0) => turn({ x, y, w: s, h: s * 0.92 }, rot, [
      C(x + 0.19 * s, y + 0.42 * s, 0.62 * s, 0.5 * s, BR, { op: 0.35, name: "Paw pad" }),
      ...[[0, 0.12], [0.25, 0], [0.53, 0], [0.78, 0.12]].map(([dx, dy]) => C(x + dx * s, y + dy * s, 0.22 * s, 0.28 * s, BR, { op: 0.35, name: "Paw toe" })),
    ]);
    return [page("#fde68a", [
      paw(880, 40, 80, 20), paw(940, 160, 60, 30),
      turn({ x: 70, y: 90, w: 470, h: 610 }, -3, [
        R(78, 102, 470, 610, "#000000", { op: 0.12, name: "Card shadow" }),
        R(70, 90, 470, 610, WHITE, { radius: 18, name: "Profile card" }),
        F(90, 110, 430, 500, { shape: "rounded", radius: 12, name: "Pet photo" }),
        T("Biscuit, 2 years", 90, 630, 430, { size: 36, family: "serif", italic: true, color: DK, align: "center", name: "Caption" }),
      ]),
      T("ADOPT ME", 420, 60, 260, { size: 40, bold: true, color: WHITE, align: "center", rot: 8, bg: { color: OR, pad: 0.4, radius: 0.2 }, name: "Tag" }),
      T("Hi, I'm\nBiscuit!", 600, 180, 420, { size: 84, family: "serif", bold: true, color: DK, lh: 1.05, name: "Headline" }),
      T("A cuddly terrier mix who loves long walks, squeaky toys and naps in the sun.", 600, 380, 420, { size: 30, color: BR, lh: 1.4, name: "About" }),
      ["Vaccinated, chipped", "Good with kids and cats", "House trained"].flatMap((s, i) => [
        E("icon-check-circle", 600, 560 + i * 60, 40, { c1: "#16a34a", c2: WHITE }),
        T(s, 656, 562 + i * 60, 364, { size: 28, bold: true, color: DK, name: "Fact" }),
      ]),
      pill("Apply to adopt", 70, 790, 400, 96, DK, "#fde68a", 38),
      T("happytailsrescue.org", 500, 818, 520, { size: 34, bold: true, color: DK, name: "Website" }),
      T("Adoption fee $120, includes a first vet visit", 70, 924, 760, { size: 28, color: BR, name: "Fee" }),
      paw(860, 960, 56, 70), paw(960, 1000, 56, 80),
    ])];
  });

  /* ---------- 15. Webinar: headline panel, info chips, agenda and host card ---------- */
  tpl("pricing-webinar-signup-ig5", "Indigo free webinar sign-up post", P, "instagram webinar workshop online event live class signup speaker host agenda business", () => {
    const IND = "#3730a3", YEL = "#fde047";
    const chip = (x, w, icon, s, col) => [R(x, 440, w, 64, "#4338ca", { radius: 32, name: "Info chip" }), E(icon, x + 16, 452, 40, col), mid(s, x + 66, 440, w - 82, 64, { size: 28, bold: true, color: WHITE, align: "left", name: "Info" })];
    const point = (y, n, s) => [C(70, y, 56, 56, IND, { name: "Number circle" }), mid(String(n), 70, y, 56, 56, { size: 28, bold: true, color: WHITE, name: "Number" }), T(s, 146, y + 8, 500, { size: 30, color: INK, lh: 1.3, name: "Point" })];
    return [page("#eef2ff", [
      R(0, 0, 1080, 540, IND, { name: "Header panel" }),
      E("deco-dots", 880, 40, 160, { c1: "#6366f1" }),
      T("FREE LIVE WEBINAR", 70, 70, 420, { size: 26, bold: true, color: IND, ls: 4, bg: { color: YEL, pad: 0.5, radius: 0.3 }, name: "Tag" }),
      T("Pricing your first\nproduct with\nconfidence", 70, 160, 940, { size: 78, bold: true, color: WHITE, lh: 1.05, name: "Headline" }),
      chip(70, 236, "icon-calendar", "Thu 4 Dec", { c1: YEL, c2: "#c7d2fe" }), chip(326, 236, "icon-clock", "6 pm GMT", { c1: YEL, c3: "#4338ca" }), chip(582, 296, "icon-users", "45 min + Q&A", { c1: YEL, c2: "#c7d2fe" }),
      T("What you'll learn", 70, 590, 560, { size: 38, bold: true, color: IND, name: "Agenda title" }),
      point(670, 1, "How to find your price floor"),
      point(760, 2, "Three pricing models that work"),
      point(850, 3, "When and how to raise prices"),
      R(690, 590, 330, 330, WHITE, { radius: 28, name: "Host card" }),
      F(785, 615, 140, 140, { shape: "circle", name: "Host photo" }),
      T("Priya Shah", 690, 770, 330, { size: 34, bold: true, color: INK, align: "center", name: "Host" }),
      T("Founder, Tidy Studio", 690, 818, 330, { size: 24, color: MUTED, align: "center", name: "Host role" }),
      T("YOUR HOST", 690, 862, 330, { size: 20, bold: true, color: IND, align: "center", ls: 4, name: "Host label" }),
      pill("Save your seat", 70, 950, 380, 86, IND, WHITE, 34),
      T("Only 100 spots  ·  link in bio", 480, 976, 540, { size: 30, color: IND, align: "right", name: "Spots" }),
    ])];
  });

  /* ---------- 16. Carousel: app feature launch with phone mock-ups (3 pages) ---------- */
  tpl("app-feature-carousel-ig5", "Dark app new feature launch carousel", P, "instagram carousel app feature launch product update mobile phone saas how it works swipe", () => {
    const BG = "#0f172a", TEAL = "#2dd4bf", LIGHT = "#f1f5f9", MUTE = "#94a3b8", CARD = "#1e293b";
    const phone = (x, y, w, name = "App screen") => {
      const h = Math.round(w * 2.05), b = Math.round(w * 0.05);
      return [
        R(x, y, w, h, "#020617", { radius: Math.round(w * 0.16), stroke: "#334155", sw: 4, name: "Phone" }),
        F(x + b, y + b, w - 2 * b, h - 2 * b, { shape: "rounded", radius: Math.round(w * 0.12), name }),
        R(r1(x + w * 0.36), r1(y + b + w * 0.03), r1(w * 0.28), r1(w * 0.07), "#020617", { radius: r1(w * 0.035), name: "Camera notch" }),
      ];
    };
    const dots = (n) => [0, 1, 2].map((i) => C(500 + i * 32, 1042, 16, 16, i === n ? TEAL : "#334155", { name: "Page dot" }));
    const steps = [
      ["Create a wallet", "Name it, pick an emoji and set a monthly budget."],
      ["Invite your people", "Send a link. They join with one tap, no forms."],
      ["Split as you spend", "Every expense is shared fairly and settled in-app."],
    ];
    return [
      page(BG, [
        C(560, 230, 520, 520, TEAL, { op: 0.12, name: "Glow" }),
        T("NEW FEATURE", 70, 90, 400, { size: 26, bold: true, color: TEAL, ls: 6, name: "Kicker" }),
        T("Shared\nwallets are\nhere", 70, 140, 520, { size: 92, bold: true, color: LIGHT, lh: 1.02, name: "Headline" }),
        T("Split rent, groceries and trips with the people you live with. No spreadsheets.", 70, 460, 470, { size: 32, color: MUTE, lh: 1.4, name: "Text" }),
        phone(620, 90, 400, "App screenshot"),
        R(500, 640, 390, 120, CARD, { radius: 22, stroke: "#334155", sw: 2, name: "Notification" }),
        C(522, 668, 64, 64, TEAL, { name: "Notification icon" }),
        E("icon-users", 534, 680, 40, { c1: BG, c2: BG }),
        T("Sam added $42.50", 604, 664, 270, { size: 26, bold: true, color: LIGHT, name: "Notification title" }),
        T("Groceries  ·  split 3 ways", 604, 702, 270, { size: 22, color: MUTE, name: "Notification text" }),
        ["Shared budgets", "Live balances", "One-tap settle up"].flatMap((s, i) => [
          E("icon-check", 70, 640 + i * 62, 40, { c1: TEAL }),
          T(s, 126, 642 + i * 62, 340, { size: 30, color: LIGHT, name: "Feature" }),
        ]),
        pill("See how it works  →", 70, 860, 400, 86, TEAL, BG, 30),
        dots(0),
      ]),
      page(BG, [
        T("How it works", 70, 70, 940, { size: 72, bold: true, color: LIGHT, name: "Heading" }),
        phone(70, 200, 360, "App screenshot"),
        steps.flatMap(([title, text], i) => {
          const y = 230 + i * 240;
          return [
            S("line", 440, y + 36, 56, 8, TEAL, { sw: 4, name: "Connector" }),
            C(500, y, 80, 80, TEAL, { name: "Step circle" }),
            mid(String(i + 1), 500, y, 80, 80, { size: 40, bold: true, color: BG, name: "Step number" }),
            T(title, 610, y, 410, { size: 40, bold: true, color: LIGHT, name: "Step title" }),
            T(text, 610, y + 58, 410, { size: 28, color: MUTE, lh: 1.35, name: "Step text" }),
          ];
        }),
        dots(1),
      ]),
      page(BG, [
        T("Loved by 12,000 households", 0, 40, 1080, { size: 28, bold: true, color: MUTE, align: "center", name: "Proof" }),
        C(290, 140, 500, 500, TEAL, { op: 0.12, name: "Glow" }),
        turn({ x: 240, y: 110, w: 300, h: 615 }, -8, phone(240, 110, 300, "Screen 1")),
        turn({ x: 540, y: 140, w: 300, h: 615 }, 8, phone(540, 140, 300, "Screen 2")),
        T("Update the app\nand try it today", 0, 776, 1080, { size: 66, bold: true, color: LIGHT, align: "center", lh: 1.1, name: "Headline" }),
        pill("Update now", 340, 940, 400, 80, TEAL, BG, 34),
        dots(2),
      ]),
    ];
  });

  /* ---------- 17. Portrait carousel: customer FAQ as a chat thread (4 pages) ---------- */
  tpl("candle-faq-chat-carousel-ig5", "Sage customer FAQ chat carousel", PP, "instagram portrait carousel faq questions answers customer service shop candles chat help", () => {
    const BG = "#e7ede4", DARK = "#2f4a3a", ACC = "#d97706", SOFT = "#4b5d50";
    const bubble = (s, x, y, w, mine) => {
      const t = T(s, x + 40, y + 30, w - 80, { size: 36, color: mine ? WHITE : DARK, lh: 1.35, name: mine ? "Answer" : "Question" });
      const h = r1(t.h + 60), fill = mine ? DARK : WHITE;
      return { h, layers: [
        S("triangle", mine ? x + w - 90 : x + 50, y + h - 10, 40, 36, fill, { rot: 180, name: "Bubble tail" }),
        R(x, y, w, h, fill, { radius: 36, name: mine ? "Answer bubble" : "Question bubble" }),
        t,
      ] };
    };
    const num = (n, y = 74) => T(`0${n} / 04`, 820, y, 200, { size: 26, family: "mono", bold: true, color: SOFT, align: "right", name: "Page number" });
    const qaPage = (n, pairs) => {
      const L = [T("FAQ", 70, 70, 300, { size: 30, bold: true, color: ACC, ls: 8, name: "Kicker" }), num(n)];
      let y = 200;
      for (const [q, a] of pairs) {
        L.push(T("YOU ASKED", 70, y, 400, { size: 22, bold: true, color: SOFT, ls: 4, name: "Label" }));
        const qb = bubble(q, 70, y + 40, 760, false); L.push(qb.layers); y += 40 + qb.h + 70;
        L.push(T("FERNWOOD", 610, y, 400, { size: 22, bold: true, color: SOFT, align: "right", ls: 4, name: "Label" }));
        const ab = bubble(a, 250, y + 40, 760, true); L.push(ab.layers); y += 40 + ab.h + 110;
      }
      return page(BG, L);
    };
    return [
      page(BG, [
        T("FERNWOOD CANDLES", 70, 80, 940, { size: 28, bold: true, color: DARK, ls: 8, name: "Brand" }),
        S("triangle", 640, 520, 90, 100, DARK, { rot: 210, name: "Bubble tail" }),
        C(600, 170, 400, 400, DARK, { name: "Big bubble" }),
        mid("?", 680, 170, 240, 400, { size: 300, bold: true, color: BG, lh: 1, name: "Question mark" }),
        C(450, 440, 190, 190, ACC, { stroke: BG, sw: 8, name: "Small bubble" }),
        mid("!", 450, 440, 190, 190, { size: 130, bold: true, color: WHITE, lh: 1, name: "Exclamation" }),
        E("deco-sprig", 90, 200, 220, { c1: "#7c9a6d", c2: DARK, rot: -15 }),
        T("You asked,\nwe answered", 70, 700, 940, { size: 110, family: "serif", bold: true, color: DARK, lh: 1.02, name: "Title" }),
        T("Our most common questions about shipping, ingredients and care, all in one place.", 70, 960, 860, { size: 36, color: SOFT, lh: 1.4, name: "Text" }),
        pill("Swipe for answers  →", 70, 1140, 470, 92, DARK, WHITE, 34),
        num(1, 1172),
      ]),
      qaPage(2, [
        ["How long does shipping take?", "Orders leave our studio in 1 to 2 days. Most arrive within 3 to 5 working days, with tracking."],
        ["Are your candles vegan?", "Yes! Every candle is poured with 100% soy wax, cotton wicks and phthalate-free fragrance."],
      ]),
      qaPage(3, [
        ["What if my candle arrives broken?", "Send us a photo within 14 days and we will replace it for free. No need to send it back."],
        ["How do I get the best burn?", "On the first light, let the top melt edge to edge. Trim the wick to 5 mm before every burn."],
      ]),
      page(BG, [
        S("triangle", 220, 560, 80, 70, WHITE, { rot: 180, name: "Bubble tail" }),
        R(140, 160, 800, 420, WHITE, { radius: 60, name: "Chat bubble" }),
        [0, 1, 2].map((i) => C(420 + i * 90, 340, 60, 60, i === 1 ? ACC : DARK, { name: "Typing dot" })),
        T("Still have a question?", 70, 680, 940, { size: 84, family: "serif", bold: true, color: DARK, align: "center", lh: 1.05, name: "Headline" }),
        T("Send us a DM or email hello@fernwoodcandles.com. We reply within one working day.", 120, 810, 840, { size: 36, color: SOFT, align: "center", lh: 1.4, name: "Text" }),
        pill("Message us", 330, 1010, 420, 92, DARK, WHITE, 36),
        T("04 / 04", 0, 1262, 1080, { size: 26, family: "mono", bold: true, color: SOFT, align: "center", name: "Page number" }),
      ]),
    ];
  });

  /* ---------- 18. Product comparison: two highlighted columns with ticks and crosses ---------- */
  tpl("bottle-comparison-ig5", "Teal product comparison table post", P, "instagram product comparison versus vs table features ticks crosses switch eco bottle", () => {
    const TEAL = "#0f766e", DK = "#0f172a";
    const feats = ["Cold for 24 hours", "Lasts for years", "No plastic taste", "Dishwasher safe", "Saves $200 a year"];
    return [page("#f8fafc", [
      T("Which bottle wins?", 60, 50, 960, { size: 72, bold: true, color: DK, name: "Headline" }),
      T("We put our steel bottle up against a regular plastic one. Here is how they compare.", 60, 190, 420, { size: 30, color: "#475569", lh: 1.4, name: "Intro" }),
      R(520, 170, 240, 800, TEAL, { radius: 30, name: "Our column" }),
      R(780, 170, 240, 800, "#e2e8f0", { radius: 30, name: "Their column" }),
      F(565, 200, 150, 150, { shape: "circle", name: "Our product" }),
      F(825, 200, 150, 150, { shape: "circle", name: "Other product" }),
      C(725, 240, 90, 90, "#f59e0b", { stroke: WHITE, sw: 6, name: "VS circle" }),
      mid("VS", 725, 240, 90, 90, { size: 32, bold: true, color: WHITE, name: "VS" }),
      T("Steel bottle", 520, 366, 240, { size: 30, bold: true, color: WHITE, align: "center", name: "Our name" }),
      T("Plastic bottle", 780, 366, 240, { size: 30, bold: true, color: "#475569", align: "center", name: "Their name" }),
      feats.flatMap((f, i) => {
        const y = 450 + i * 100;
        return [
          R(60, y, 440, 2, "#cbd5e1", { name: "Row rule" }),
          T(f, 60, y + 30, 440, { size: 34, bold: true, color: DK, name: "Feature" }),
          E("icon-check-circle", 610, y + 20, 60, { c1: "#f59e0b" }),
          E("icon-cross-circle", 870, y + 20, 60, { c1: "#94a3b8", c2: WHITE }),
        ];
      }),
      R(60, 950, 440, 2, "#cbd5e1", { name: "Row rule" }),
      T("Make the switch: 15% off with code SWITCH15", 60, 1000, 960, { size: 32, bold: true, color: TEAL, name: "Offer" }),
    ])];
  });

  /* ---------- 19. Retro 80s Black Friday countdown: neon sun and grid floor ---------- */
  tpl("retro-black-friday-countdown-ig5", "Retro 80s Black Friday countdown post", P, "instagram black friday countdown sale retro 80s synthwave neon deals discount shop timer", () => {
    const BG = "#1a0b2e", NEON = "#e879f9", CYAN = "#22d3ee", VX = 540, VY = 640, BOT = 920;
    const ray = (k) => {
      const dx = k * 300, dy = 440;
      let t = (BOT - VY) / dy;
      if (dx) t = Math.min(t, (dx > 0 ? 1080 - VX : -VX) / dx);
      const x2 = VX + dx * t, y2 = VY + dy * t, L = Math.hypot(x2 - VX, y2 - VY);
      return S("line", r1((VX + x2) / 2 - L / 2), r1((VY + y2) / 2 - 3), r1(L), 6, NEON, { rot: r1((Math.atan2(y2 - VY, x2 - VX) * 180) / Math.PI), sw: 3, name: "Grid line" });
    };
    const box = (i, n, label) => {
      const x = 101 + i * 226;
      return [R(x, 690, 200, 170, BG, { stroke: CYAN, sw: 4, radius: 16, name: "Timer box" }),
        T(n, x, 704, 200, { size: 96, bold: true, color: "#fdf4ff", align: "center", lh: 1, name: "Timer number" }),
        T(label, x, 812, 200, { size: 24, bold: true, color: CYAN, align: "center", ls: 6, name: "Timer label" })];
    };
    return [page(BG, [
      C(290, 310, 500, 500, "#fb7185", { op: 0.2, name: "Sun glow" }),
      C(320, 340, 440, 440, "#fb7185", { name: "Sun" }),
      [[532, 8], [560, 12], [590, 16], [622, 18]].map(([y, h]) => R(300, y, 480, h, BG, { name: "Sun stripe" })),
      R(0, VY, 1080, 440, "#2a0e4a", { name: "Floor" }),
      [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(ray),
      [VY, 656, 680, 712, 754, 806, 870].map((y) => R(0, y, 1080, 3, NEON, { name: "Grid line" })),
      T("THE COUNTDOWN IS ON", 0, 44, 1080, { size: 26, bold: true, color: CYAN, align: "center", ls: 8, name: "Kicker" }),
      T("BLACK\nFRIDAY", 0, 92, 1080, { size: 150, bold: true, italic: true, color: "#fdf4ff", align: "center", lh: 0.92, outline: { color: "#ec4899", width: 5 }, shadow: { x: 8, y: 8, blur: 0, color: CYAN, opacity: 1 }, name: "Headline" }),
      box(0, "02", "DAYS"), box(1, "14", "HRS"), box(2, "36", "MIN"), box(3, "09", "SEC"),
      R(0, BOT, 1080, 160, "#ec4899", { name: "Offer band" }),
      T("UP TO 70% OFF EVERYTHING", 0, 940, 1080, { size: 54, bold: true, color: WHITE, align: "center", name: "Offer" }),
      T("Starts Friday 27 Nov  ·  midnight  ·  online only", 0, 1012, 1080, { size: 28, color: "#fdf2f8", align: "center", name: "Details" }),
    ])];
  });

  /* ---------- 20. Portrait: thank you for 10k followers ---------- */
  tpl("10k-followers-thank-you-ig5", "Orange thank you 10k followers post", PP, "instagram portrait thank you 10k followers milestone celebration community grateful", () => {
    const BG = "#ff5a36", CREAM = "#fff7ed", DK = "#1c1917";
    const ty = (y, solid) => T("THANK YOU", 0, y, 1080, { size: 150, bold: true, color: solid ? CREAM : BG, align: "center", lh: 1, outline: solid ? undefined : { color: CREAM, width: 3 }, op: y > 300 ? 0.55 : 1, name: "Thank you" });
    return [page(BG, [
      ty(60, true), ty(210, false), ty(360, false),
      E("deco-burst", 300, 500, 480, { c1: "#fde047" }),
      E("deco-confetti", 40, 560, 170, { c1: CREAM, c2: "#fde047" }),
      E("deco-confetti", 870, 600, 170, { c1: CREAM, c2: DK }),
      T("10K", 0, 570, 1080, { size: 330, bold: true, color: DK, align: "center", lh: 0.9, name: "Number" }),
      T("followers!", 310, 878, 460, { size: 72, family: "serif", italic: true, color: CREAM, align: "center", bg: { color: DK, pad: 0.25, radius: 0.5 }, name: "Followers" }),
      [0, 1, 2, 3, 4].map((i) => [C(294 + i * 84, 1022, 122, 122, CREAM, { name: "Avatar ring" }), F(300 + i * 84, 1028, 110, 110, { shape: "circle", name: `Follower ${i + 1}` })]),
      pill("+9,995", 750, 1046, 190, 74, DK, CREAM, 32),
      T("Every like, share and kind DM got us here. Thank you for being part of the story.", 120, 1168, 840, { size: 32, color: CREAM, align: "center", lh: 1.35, name: "Message" }),
      T("@yourhandle", 0, 1274, 1080, { size: 30, bold: true, color: DK, align: "center", name: "Handle" }),
    ])];
  });
}
