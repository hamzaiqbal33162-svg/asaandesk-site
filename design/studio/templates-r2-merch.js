// ROUND 2 layout batch (filled by a helper; see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md). Pure module, no imports.
// 45 own merch layouts: 15 T-shirt prints (1152 × 1536, transparent; 4 are front + back), 15 hoodie prints
// (1152 × 1344, transparent; 4 are a small chest print + a big back print) and 15 mug wraps (816 × 336, key text
// inside the 768 × 307 safe area). Illustrations are built from our own shapes and stickers.
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page } = k;
  const { INK, MUTED, IND, AMB, ROS, WHITE, GOLD, NAVY } = k.K;
  const TS = "t-shirt tshirt shirt print ", HD = "hoodie sweatshirt print ", MG = "mug cup wrap ";
  const r1 = (v) => Math.round(v * 10) / 10;
  // Text centred vertically in a box (buttons, badges, circles).
  const mid = (s, x, y, w, h, o) => { const t = T(s, x, y, w, { align: "center", ...o }); t.y = r1(y + (h - t.h) / 2); return t; };
  // Straight stroke from (x1, y1) to (x2, y2) as a rotated line shape (round caps, so joints look smooth).
  const seg = (x1, y1, x2, y2, color, sw = 8, name = "Line") => {
    const len = Math.hypot(x2 - x1, y2 - y1), a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return S("line", r1((x1 + x2) / 2 - len / 2), r1((y1 + y2) / 2 - sw / 2), r1(len), sw, color, { sw, rot: r1(a), name });
  };
  const poly = (pts, color, sw, name) => pts.slice(1).map((p, i) => seg(pts[i][0], pts[i][1], p[0], p[1], color, sw, name));
  // Rotates layers drawn upright around (cx, cy), so an illustration turns as one piece.
  function turn(cx, cy, deg, layers) {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    for (const l of layers) {
      const dx = l.x + l.w / 2 - cx, dy = l.y + l.h / 2 - cy;
      l.x = r1(cx + dx * c - dy * s - l.w / 2);
      l.y = r1(cy + dx * s + dy * c - l.h / 2);
      l.rotation = r1((l.rotation || 0) + deg);
    }
    return layers;
  }
  const mix = (a, b, t) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");

  // Palette (own colours on top of the shared ones).
  const FOREST = "#166534", LEAF = "#16a34a", LEAF2 = "#22c55e", PINE = "#14532d", BARK = "#78350f";
  const BLUE = "#1d4ed8", BLUE2 = "#2563eb", RED = "#dc2626", PINK = "#db2777", BERRY = "#9d174d", PURP = "#7c3aed";
  const OCHRE = "#b45309", TEAD = "#0f766e", RUST = "#ea580c", BROWN = "#9a3412", SLATE = "#0f172a", CYAN = "#0891b2";

  /* ================= T-shirt prints (12 × 16 in = 1152 × 1536 px, transparent) ================= */

  // 1. Family reunion: small crest on the chest, big family tree on the back.
  tpl("reunion-tree-tshirt-me2", "Family reunion tree T-shirt", "tshirt", TS + "family reunion tree together generations front back", (W, H) => [
    page("none", [
      C(800, 150, 240, 240, "none", { stroke: FOREST, sw: 10, name: "Crest ring" }),
      C(826, 226, 100, 86, FOREST, { name: "Tree crown" }), C(914, 226, 100, 86, FOREST, { name: "Tree crown" }),
      C(850, 186, 140, 120, LEAF, { name: "Tree crown" }),
      R(908, 296, 24, 62, BARK, { radius: 6, name: "Trunk" }),
      R(866, 354, 108, 8, BARK, { radius: 4, name: "Ground" }),
      T("KHAN FAMILY", 700, 420, 440, { size: 44, bold: true, color: FOREST, align: "center", ls: 2 }),
      T("REUNION · 2026", 700, 478, 440, { size: 30, bold: true, color: BARK, align: "center", ls: 6 }),
    ]),
    page("none", [
      T("THE KHAN FAMILY", 60, 110, W - 120, { size: 92, family: "serif", bold: true, color: FOREST, align: "center" }),
      R(546, 600, 60, 350, BARK, { radius: 14, name: "Trunk" }),
      seg(576, 740, 470, 650, BARK, 24, "Branch"), seg(576, 710, 690, 625, BARK, 24, "Branch"),
      C(316, 380, 280, 280, FOREST, { name: "Canopy" }), C(556, 380, 280, 280, FOREST, { name: "Canopy" }),
      C(406, 250, 340, 340, LEAF, { name: "Canopy" }), C(436, 440, 280, 240, LEAF2, { name: "Canopy" }),
      S("heart", 380, 470, 60, 54, ROS, { name: "Heart" }), S("heart", 700, 450, 60, 54, ROS, { name: "Heart" }),
      S("heart", 548, 300, 56, 50, "#fb7185", { name: "Heart" }), S("heart", 480, 590, 50, 45, AMB, { name: "Heart" }),
      S("heart", 630, 560, 50, 45, AMB, { name: "Heart" }),
      R(316, 946, 520, 14, BARK, { radius: 7, name: "Ground" }),
      T("Together again", 60, 990, W - 120, { size: 110, family: "serif", italic: true, color: FOREST, align: "center" }),
      T("LAHORE · 24 JULY 2026", 60, 1150, W - 120, { size: 50, bold: true, color: BARK, align: "center", ls: 6 }),
      T("Est. 1962 · four generations, one table", 60, 1240, W - 120, { size: 40, color: MUTED, align: "center" }),
    ]),
  ]);

  // 2. Team jersey: script team name on the front, player name and number on the back.
  tpl("strikers-jersey-tshirt-me2", "Team jersey front and back T-shirt", "tshirt", TS + "team jersey football soccer club player name number front back", (W, H) => [
    page("none", [
      T("Strikers", 80, 250, W - 160, { size: 230, family: "serif", bold: true, italic: true, color: BLUE, align: "center", lh: 1, rot: -8 }),
      E("line-swoosh", 276, 540, 600, { c1: RED, rot: -8 }),
      T("SUNDAY LEAGUE · LAHORE", 60, 700, W - 120, { size: 48, bold: true, color: INK, align: "center", ls: 8 }),
      T("10", 60, 810, W - 120, { size: 400, bold: true, color: RED, align: "center", lh: 1, outline: { width: 8, color: BLUE } }),
    ]),
    page("none", [
      R(276, 150, 600, 14, RED, { radius: 7, name: "Stripe" }),
      T("AHMED", 60, 200, W - 120, { size: 150, bold: true, color: BLUE, align: "center", ls: 12 }),
      T("10", 60, 400, W - 120, { size: 600, bold: true, color: RED, align: "center", lh: 1, outline: { width: 10, color: BLUE } }),
      R(386, 1050, 380, 84, BLUE, { radius: 42, name: "Captain band" }),
      mid("CAPTAIN", 386, 1050, 380, 84, { size: 46, bold: true, color: WHITE, ls: 8 }),
      T("STRIKERS FC", 60, 1180, W - 120, { size: 80, family: "serif", bold: true, italic: true, color: BLUE, align: "center" }),
    ]),
  ]);

  // 3. Bachelorette: heart badge on the front, ring and squad list on the back.
  tpl("bride-squad-tshirt-me2", "Bachelorette bride squad T-shirt", "tshirt", TS + "bachelorette bride squad wedding hen party girls trip front back", (W, H) => [
    page("none", [
      E("deco-sparkles", 900, 140, 130, { c1: "#f59e0b", c2: PINK }),
      E("deco-sparkles", 120, 600, 110, { c1: PINK, c2: "#f59e0b" }),
      S("heart", 256, 170, 640, 580, "none", { stroke: PINK, sw: 14, name: "Heart outline" }),
      T("Team", 256, 340, 640, { size: 100, family: "serif", italic: true, color: PINK, align: "center", lh: 1 }),
      T("BRIDE", 256, 452, 640, { size: 104, bold: true, color: BERRY, align: "center", ls: 8, lh: 1 }),
      T("Mina's bachelorette", 60, 820, W - 120, { size: 84, family: "serif", italic: true, color: BERRY, align: "center" }),
      T("ISTANBUL · NOV 2026", 60, 960, W - 120, { size: 52, bold: true, color: OCHRE, align: "center", ls: 10 }),
    ]),
    page("none", [
      T("BRIDE SQUAD", 60, 140, W - 120, { size: 116, bold: true, color: PINK, align: "center" }),
      E("deco-hearts", 180, 360, 150, { c1: PINK, c2: "#f9a8d4" }),
      E("deco-hearts", 822, 360, 150, { c1: "#f9a8d4", c2: PINK }),
      C(491, 400, 170, 170, "none", { stroke: OCHRE, sw: 16, name: "Ring" }),
      S("polygon", 536, 320, 80, 90, "#93c5fd", { sides: 4, name: "Diamond" }),
      T("Mina · the bride\nSara · maid of honour\nAyesha · chief of fun\nHira · photo queen\nZoya · snack boss", 60, 640, W - 120, { size: 60, color: INK, align: "center", lh: 1.5 }),
      T("cheers to the bride-to-be", 60, 1150, W - 120, { size: 70, family: "serif", italic: true, color: BERRY, align: "center" }),
    ]),
  ]);

  // 4. Charity run: chest badge on the front; "I run for" line and sponsor boxes on the back.
  tpl("heart-run-tshirt-me2", "Charity fun run front and back T-shirt", "tshirt", TS + "charity run 10k event fun run sponsors volunteer front back", (W, H) => [
    page("none", [
      C(800, 150, 240, 240, TEAD, { name: "Badge" }),
      S("heart", 885, 184, 70, 62, "#fda4af", { name: "Heart" }),
      mid("10K", 800, 250, 240, 110, { size: 84, bold: true, color: WHITE }),
      T("CITY HEART RUN", 720, 420, 400, { size: 34, bold: true, color: TEAD, align: "center", ls: 2 }),
      T("8 MARCH 2026", 720, 470, 400, { size: 30, color: MUTED, align: "center", ls: 4 }),
    ]),
    page("none", [
      T("I RUN FOR", 60, 150, W - 120, { size: 130, bold: true, color: INK, align: "center" }),
      R(226, 400, 700, 8, TEAD, { radius: 4, name: "Name line" }),
      T("in honour of someone I love", 226, 420, 700, { size: 36, italic: true, color: MUTED, align: "center" }),
      S("heart", 506, 500, 140, 126, ROS, { name: "Heart" }),
      T("CITY HEART RUN 2026", 60, 670, W - 120, { size: 70, bold: true, color: TEAD, align: "center" }),
      T("Every step funds heart care for children", 60, 770, W - 120, { size: 40, color: INK, align: "center" }),
      T("THANK YOU TO OUR SPONSORS", 60, 900, W - 120, { size: 36, bold: true, color: MUTED, align: "center", ls: 6 }),
      ...[0, 1].flatMap((r) => [0, 1, 2].flatMap((i) => [
        R(186 + i * 270, 980 + r * 160, 240, 130, "none", { stroke: "#94a3b8", sw: 4, radius: 18, name: "Sponsor box" }),
        mid("LOGO", 186 + i * 270, 980 + r * 160, 240, 130, { size: 36, bold: true, color: "#94a3b8", ls: 4, name: "Sponsor " + (r * 3 + i + 1) }),
      ])),
    ]),
  ]);

  // 5. Festival line-up poster tee.
  tpl("sundown-lineup-tshirt-me2", "Music festival lineup T-shirt", "tshirt", TS + "music festival lineup concert event bands summer", (W, H) => [page("none", [
    E("deco-stars", 60, 30, 120, { c1: PURP, c2: PINK }),
    E("deco-stars", 972, 30, 120, { c1: PINK, c2: PURP }),
    T("SUNDOWN", 60, 160, W - 120, { size: 180, bold: true, color: PURP, align: "center", lh: 1 }),
    T("MUSIC FESTIVAL · 2026", 60, 360, W - 120, { size: 52, bold: true, color: PINK, align: "center", ls: 8 }),
    R(160, 460, W - 320, 6, INK, { radius: 3, name: "Rule" }),
    T("THE MIDNIGHT KITES", 60, 500, W - 120, { size: 76, bold: true, color: INK, align: "center" }),
    T("Neon Harbor · Velvet Static\nLumen · Paper Lanterns", 60, 610, W - 120, { size: 54, color: INK, align: "center", lh: 1.3 }),
    T("Coral Drive · Quiet Riot Club · Mango Moon\nThe Lowlands · DJ Sana · Wild Echo", 60, 770, W - 120, { size: 40, color: MUTED, align: "center", lh: 1.35 }),
    R(160, 910, W - 320, 6, INK, { radius: 3, name: "Rule" }),
    R(276, 960, 600, 160, PURP, { radius: 24, name: "Date box" }),
    mid("14–16 AUG\nLAKESIDE PARK", 276, 960, 600, 160, { size: 50, bold: true, color: WHITE, lh: 1.2 }),
    T("3 days · 2 stages · 30 artists", 60, 1170, W - 120, { size: 56, family: "serif", italic: true, color: PINK, align: "center" }),
  ])]);

  // 6. Hackathon: terminal window illustration.
  tpl("hackathon-terminal-tshirt-me2", "Hackathon terminal T-shirt", "tshirt", TS + "hackathon coding event tech developer terminal", (W, H) => [page("none", [
    R(176, 200, 800, 580, SLATE, { radius: 28, name: "Terminal window" }),
    R(176, 200, 800, 72, "#334155", { radius: 28, name: "Title bar" }),
    R(176, 244, 800, 28, "#334155", { name: "Title bar base" }),
    C(214, 222, 28, 28, "#ef4444", { name: "Dot" }), C(256, 222, 28, 28, "#f59e0b", { name: "Dot" }), C(298, 222, 28, 28, "#22c55e", { name: "Dot" }),
    T("~/hackathon", 376, 216, 400, { size: 32, family: "mono", color: "#94a3b8", align: "center" }),
    T("$ hackathon --start\n> 48 hours\n> 1 big idea\n> 0 hours of sleep\n> ship it_", 226, 310, 700, { size: 50, family: "mono", color: "#4ade80", lh: 1.45 }),
    T("HACK THE CITY", 60, 850, W - 120, { size: 104, bold: true, color: INK, align: "center" }),
    T("48-HOUR HACKATHON · KARACHI 2026", 60, 1000, W - 120, { size: 40, family: "mono", bold: true, color: TEAD, align: "center", ls: 2 }),
  ])]);

  // 7. School spirit: megaphone made of shapes.
  tpl("spirit-megaphone-tshirt-me2", "School spirit megaphone T-shirt", "tshirt", TS + "school spirit week team pride wildcats megaphone cheer", (W, H) => [page("none", [
    S("star", 130, 300, 80, 80, OCHRE, { name: "Star" }), S("star", 960, 250, 60, 60, RED, { name: "Star" }), S("star", 200, 640, 50, 50, RED, { name: "Star" }),
    R(440, 570, 54, 150, INK, { radius: 14, name: "Handle" }),
    R(258, 488, 72, 64, INK, { radius: 12, name: "Mouthpiece" }),
    S("triangle", 340, 310, 360, 420, RED, { rot: -90, name: "Megaphone" }),
    C(690, 330, 90, 380, "#991b1b", { name: "Megaphone rim" }),
    seg(830, 420, 930, 360, OCHRE, 16, "Sound line"), seg(840, 520, 960, 520, OCHRE, 16, "Sound line"), seg(830, 620, 930, 680, OCHRE, 16, "Sound line"),
    T("LOUD & PROUD", 60, 820, W - 120, { size: 112, bold: true, color: RED, align: "center" }),
    T("WESTBROOK WILDCATS", 60, 980, W - 120, { size: 62, bold: true, color: INK, align: "center", ls: 6 }),
    T("spirit week 2026", 60, 1080, W - 120, { size: 76, family: "serif", italic: true, color: OCHRE, align: "center" }),
  ])]);

  // 8. Birthday squad: big age in a burst.
  tpl("birthday-squad-tshirt-me2", "Birthday squad T-shirt", "tshirt", TS + "birthday squad party crew 30th celebration matching", (W, H) => [page("none", [
    E("deco-burst", 226, 100, 700, { c1: AMB }),
    C(431, 305, 290, 290, PINK, { name: "Circle" }),
    mid("30", 431, 305, 290, 290, { size: 190, bold: true, color: WHITE, lh: 1 }),
    E("deco-confetti", 70, 130, 180, {}),
    E("deco-confetti", 900, 600, 180, {}),
    T("BIRTHDAY", 60, 830, W - 120, { size: 160, bold: true, color: INK, align: "center", lh: 1 }),
    T("SQUAD", 60, 1000, W - 120, { size: 220, bold: true, color: PINK, align: "center", lh: 1 }),
    R(326, 1260, 500, 90, INK, { radius: 45, name: "Name pill" }),
    mid("SARA'S 30TH", 326, 1260, 500, 90, { size: 48, bold: true, color: GOLD, ls: 4 }),
  ])]);

  // 9. Retro: the same word repeated in a warm 70s colour run.
  tpl("groovy-repeat-tshirt-me2", "Groovy repeat text T-shirt", "tshirt", TS + "retro groovy 70s vintage repeat text flower power", (W, H) => [page("none", [
    E("deco-flower", 120, 120, 170, { c1: "#f59e0b", c2: BROWN }),
    E("deco-flower", 862, 120, 170, { c1: PINK, c2: "#f59e0b" }),
    T("stay", 300, 140, 552, { size: 140, family: "serif", italic: true, bold: true, color: BROWN, align: "center", lh: 1 }),
    ...[BROWN, RUST, "#f59e0b", PINK, PURP].map((c, i) => T("GROOVY", 60, 300 + i * 190, W - 120, { size: 210, bold: true, color: c, align: "center", lh: 0.9, name: "Groovy " + (i + 1) })),
    T("SINCE 1974", 60, 1290, W - 120, { size: 56, bold: true, color: BROWN, align: "center", ls: 16 }),
  ])]);

  // 10. Retro 80s: striped sun over a perspective grid.
  tpl("night-drive-grid-tshirt-me2", "80s night drive grid T-shirt", "tshirt", TS + "retro 80s synthwave neon grid sunset night drive", (W, H) => {
    const sun = [470, 498, 524, 546].map((y, i) => { const hw = Math.sqrt(230 * 230 - (560 - y) * (560 - y)); return R(r1(576 - hw), y, r1(2 * hw), 8 + i * 3, PURP, { name: "Sun stripe" }); });
    // Floor between the horizon (y 584, half width 120) and the front edge (y 880, half width 476).
    const hwAt = (y) => 120 + ((y - 584) / 296) * 356;
    const vert = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k2) => seg(576 + k2 * 30, 584, r1(576 + (k2 * hwAt(880)) / 4), 880, PURP, 6, "Grid line"));
    const hor = [608, 640, 686, 756, 880].map((y) => { const hw = hwAt(y); return seg(r1(576 - hw), y, r1(576 + hw), y, PURP, 6, "Grid line"); });
    return [page("none", [
      S("star", 150, 160, 50, 50, PURP, { name: "Star" }), S("star", 960, 220, 40, 40, PINK, { name: "Star" }),
      S("star", 250, 380, 30, 30, PINK, { name: "Star" }), S("star", 880, 120, 30, 30, PURP, { name: "Star" }),
      E("shape-half-circle", 326, 310, 500, { c1: "#f472b6" }),
      ...sun,
      R(126, 576, 900, 8, PURP, { radius: 4, name: "Horizon" }),
      ...vert, ...hor,
      T("NIGHT DRIVE", 60, 950, W - 120, { size: 120, bold: true, italic: true, color: PINK, align: "center", shadow: { x: 6, y: 6, blur: 0, color: PURP, opacity: 1 } }),
      T("SYNTHWAVE · 1986", 60, 1120, W - 120, { size: 56, bold: true, color: PURP, align: "center", ls: 14 }),
    ])];
  });

  // 11. Slogan: one word per coloured pill, tilted.
  tpl("slogan-pills-tshirt-me2", "Slogan pill words T-shirt", "tshirt", TS + "slogan typography words pills self care positive quote", (W, H) => [page("none", [
    E("deco-sparkle", 900, 200, 110, { c1: AMB }),
    E("deco-squiggle", 120, 520, 220, { c1: PURP }),
    E("deco-sparkle", 860, 880, 90, { c1: PINK }),
    T("protect", 110, 200, 600, { size: 150, bold: true, color: WHITE, align: "center", lh: 1, rot: -5, bg: { color: TEAD, pad: 0.25, radius: 0.5 } }),
    T("your", 640, 470, 420, { size: 150, bold: true, color: INK, align: "center", lh: 1, rot: 4, bg: { color: "#fbbf24", pad: 0.25, radius: 0.5 } }),
    T("peace", 200, 740, 520, { size: 150, bold: true, color: WHITE, align: "center", lh: 1, rot: -3, bg: { color: PINK, pad: 0.25, radius: 0.5 } }),
    T("and your energy, too.", 60, 1060, W - 120, { size: 84, family: "serif", italic: true, color: INK, align: "center" }),
  ])]);

  // 12. Funny slogan as a computer alert dialog.
  tpl("error-404-sleep-tshirt-me2", "Error 404 sleep not found T-shirt", "tshirt", TS + "funny slogan error 404 sleep coffee computer geek", (W, H) => [page("none", [
    R(176, 300, 800, 520, WHITE, { radius: 20, name: "Window" }),
    R(176, 300, 800, 90, BLUE2, { radius: 20, name: "Title bar" }),
    R(176, 350, 800, 40, BLUE2, { name: "Title bar base" }),
    R(176, 300, 800, 520, "none", { stroke: INK, sw: 10, radius: 20, name: "Window border" }),
    T("System alert", 216, 322, 500, { size: 40, bold: true, color: WHITE }),
    R(896, 320, 52, 52, "#ef4444", { radius: 10, name: "Close button" }),
    mid("X", 896, 320, 52, 52, { size: 34, bold: true, color: WHITE }),
    E("icon-warning", 226, 440, 130, { c1: AMB }),
    T("ERROR 404", 390, 430, 560, { size: 80, bold: true, color: INK }),
    T("Sleep not found.", 390, 540, 560, { size: 54, color: INK }),
    R(400, 680, 220, 84, "#e5e7eb", { stroke: INK, sw: 4, radius: 14, name: "Button" }),
    mid("Retry", 400, 680, 220, 84, { size: 40, bold: true, color: INK }),
    R(650, 680, 290, 84, BLUE2, { radius: 14, name: "Button" }),
    mid("More coffee", 650, 680, 290, 84, { size: 38, bold: true, color: WHITE }),
    T("please try again after coffee", 60, 900, W - 120, { size: 52, family: "mono", color: INK, align: "center" }),
  ])]);

  // 13. Illustration: potted cactus.
  tpl("stay-sharp-cactus-tshirt-me2", "Cactus stay sharp T-shirt", "tshirt", TS + "cactus plant desert illustration funny stay sharp", (W, H) => [page("none", [
    C(770, 110, 240, 240, "#fb923c", { name: "Sun" }),
    R(350, 420, 70, 230, "#15803d", { radius: 35, name: "Cactus arm" }), R(350, 580, 186, 70, "#15803d", { radius: 35, name: "Cactus arm" }),
    R(732, 340, 70, 250, "#15803d", { radius: 35, name: "Cactus arm" }), R(616, 520, 186, 70, "#15803d", { radius: 35, name: "Cactus arm" }),
    R(496, 260, 160, 640, "#15803d", { radius: 80, name: "Cactus" }),
    R(548, 310, 8, 540, FOREST, { radius: 4, name: "Rib" }), R(596, 310, 8, 540, FOREST, { radius: 4, name: "Rib" }),
    E("deco-flower", 536, 200, 80, { c1: "#f43f5e", c2: AMB }),
    R(426, 870, 300, 56, "#c2410c", { radius: 12, name: "Pot rim" }),
    R(456, 920, 240, 170, RUST, { radius: 18, name: "Pot" }),
    T("STAY SHARP", 60, 1140, W - 120, { size: 130, bold: true, color: "#15803d", align: "center", lh: 1 }),
    T("but keep it kind", 60, 1290, W - 120, { size: 84, family: "serif", italic: true, color: "#c2410c", align: "center" }),
  ])]);

  // 14. Illustration: rocket flying to the moon.
  tpl("rocket-moon-tshirt-me2", "Rocket to the moon T-shirt", "tshirt", TS + "rocket moon space stars kids illustration dream big", (W, H) => [page("none", [
    S("star", 150, 160, 50, 50, AMB, { name: "Star" }), S("star", 300, 330, 30, 30, IND, { name: "Star" }), S("star", 980, 500, 40, 40, AMB, { name: "Star" }),
    S("star", 160, 820, 36, 36, IND, { name: "Star" }), S("star", 900, 780, 30, 30, AMB, { name: "Star" }),
    C(830, 110, 200, 200, "#facc15", { name: "Moon" }), C(870, 160, 40, 40, "#eab308", { name: "Crater" }), C(950, 220, 30, 30, "#eab308", { name: "Crater" }),
    C(250, 940, 50, 50, "#fdba74", { name: "Smoke" }), C(190, 1000, 36, 36, "#fdba74", { name: "Smoke" }), C(146, 1044, 24, 24, "#fdba74", { name: "Smoke" }),
    ...turn(520, 605, 35, [
      S("triangle", 470, 790, 100, 170, "#f97316", { rot: 180, name: "Flame" }),
      S("triangle", 495, 790, 50, 100, "#facc15", { rot: 180, name: "Flame core" }),
      S("triangle", 384, 664, 92, 140, RED, { name: "Fin" }), S("triangle", 564, 664, 92, 140, RED, { name: "Fin" }),
      R(440, 380, 160, 420, "#e2e8f0", { radius: 50, stroke: INK, sw: 8, name: "Rocket body" }),
      S("triangle", 448, 276, 144, 124, RED, { name: "Nose" }),
      C(475, 470, 90, 90, "#38bdf8", { stroke: INK, sw: 8, name: "Window" }),
    ]),
    T("TO THE MOON", 60, 1090, W - 120, { size: 120, bold: true, color: INK, align: "center" }),
    T("and back again", 60, 1250, W - 120, { size: 84, family: "serif", italic: true, color: RED, align: "center" }),
  ])]);

  // 15. Event staff tee.
  tpl("event-staff-tshirt-me2", "Event staff crew T-shirt", "tshirt", TS + "event staff crew volunteer festival team uniform", (W, H) => [page("none", [
    T("CITY FOOD FESTIVAL 2026", 60, 200, W - 120, { size: 48, bold: true, color: INK, align: "center", ls: 6 }),
    R(126, 300, 900, 380, "#facc15", { radius: 24, name: "Staff panel" }),
    mid("STAFF", 126, 300, 900, 380, { size: 250, bold: true, color: INK, lh: 1 }),
    T("ASK ME ANYTHING", 60, 730, W - 120, { size: 72, bold: true, color: RED, align: "center", ls: 10 }),
    E("icon-location", 396, 870, 80, { c1: INK }), E("icon-clock", 536, 870, 80, { c1: INK }), E("icon-question", 676, 870, 80, { c1: INK }),
    T("Directions · Schedules · Lost & found", 60, 980, W - 120, { size: 44, color: MUTED, align: "center" }),
  ])]);

  /* ================= Hoodie prints (12 × 14 in = 1152 × 1344 px, transparent) ================= */

  // 1. Small chest logo + big back badge.
  tpl("peak-club-hoodie-me2", "Peak club chest and back hoodie", "hoodie", HD + "hiking mountains club outdoors minimal chest big back front back", (W, H) => [
    page("none", [
      S("triangle", 471, 200, 130, 100, TEAD, { name: "Mountain" }),
      S("triangle", 531, 176, 150, 124, "#115e59", { name: "Mountain" }),
      S("triangle", 579, 176, 54, 45, WHITE, { name: "Snow" }),
      R(451, 298, 250, 8, TEAD, { radius: 4, name: "Ground" }),
      T("PEAK CLUB", 336, 330, 480, { size: 52, bold: true, color: TEAD, align: "center", ls: 8 }),
      T("est. 2026", 336, 396, 480, { size: 36, family: "serif", italic: true, color: MUTED, align: "center" }),
    ]),
    page("none", [
      C(256, 110, 640, 640, "none", { stroke: TEAD, sw: 14, name: "Badge ring" }),
      C(380, 250, 100, 100, AMB, { name: "Sun" }),
      S("triangle", 330, 330, 300, 270, TEAD, { name: "Mountain" }),
      S("triangle", 500, 270, 330, 330, "#115e59", { name: "Mountain" }),
      S("triangle", 630, 270, 70, 70, WHITE, { name: "Snow" }),
      R(322, 594, 508, 14, TEAD, { radius: 7, name: "Horizon" }),
      E("line-wavy", 372, 636, 408, { c1: TEAD }), E("line-wavy", 432, 686, 288, { c1: TEAD }),
      T("ALTITUDE", 60, 790, W - 120, { size: 160, bold: true, color: TEAD, align: "center", lh: 1 }),
      T("is an attitude", 60, 960, W - 120, { size: 96, family: "serif", italic: true, color: INK, align: "center" }),
      T("PEAK CLUB · HIKING SINCE 2026", 60, 1110, W - 120, { size: 38, bold: true, color: MUTED, align: "center", ls: 6 }),
    ]),
  ]);

  // 2. Left-chest sun + big stacked words on the back.
  tpl("slow-mornings-hoodie-me2", "Slow mornings chest and back hoodie", "hoodie", HD + "slow mornings coffee cozy sunrise minimal chest big back front back", (W, H) => [
    page("none", [
      E("icon-sun", 785, 140, 130, { c1: RUST }),
      T("slow\nmornings", 690, 290, 320, { size: 64, family: "serif", italic: true, bold: true, color: BROWN, align: "center", lh: 1.05 }),
    ]),
    page("none", [
      E("shape-half-circle", 276, 140, 600, { c1: "#fdba74" }),
      R(176, 470, 800, 12, BROWN, { radius: 6, name: "Horizon" }),
      R(276, 504, 600, 12, BROWN, { radius: 6, op: 0.75, name: "Horizon" }),
      R(376, 538, 400, 12, BROWN, { radius: 6, op: 0.5, name: "Horizon" }),
      T("SLOW", 60, 600, W - 120, { size: 220, bold: true, color: BROWN, align: "center", lh: 1 }),
      T("MORNINGS", 60, 830, W - 120, { size: 150, bold: true, color: BROWN, align: "center", lh: 1 }),
      T("club", 60, 990, W - 120, { size: 130, family: "serif", italic: true, color: RUST, align: "center", lh: 1 }),
      T("coffee · books · no alarms", 60, 1150, W - 120, { size: 46, color: MUTED, align: "center" }),
    ]),
  ]);

  // 3. Gamer: tiny controller on the chest, lives + XP bar on the back.
  tpl("respawn-gamer-hoodie-me2", "Gamer respawn chest and back hoodie", "hoodie", HD + "gamer gaming controller respawn video games minimal chest big back front back", (W, H) => [
    page("none", [
      R(476, 190, 200, 110, PURP, { radius: 55, name: "Controller" }),
      R(506, 238, 50, 14, WHITE, { radius: 4, name: "D-pad" }), R(524, 220, 14, 50, WHITE, { radius: 4, name: "D-pad" }),
      C(612, 210, 22, 22, "#facc15", { name: "Button" }), C(636, 234, 22, 22, "#22c55e", { name: "Button" }),
      C(612, 258, 22, 22, "#38bdf8", { name: "Button" }), C(588, 234, 22, 22, "#f472b6", { name: "Button" }),
      T("GG", 376, 320, 400, { size: 64, family: "mono", bold: true, color: PURP, align: "center" }),
      T("good game", 376, 400, 400, { size: 32, family: "mono", color: MUTED, align: "center" }),
    ]),
    page("none", [
      S("heart", 401, 150, 100, 90, "#ef4444", { name: "Life" }), S("heart", 526, 150, 100, 90, "#ef4444", { name: "Life" }),
      S("heart", 651, 150, 100, 90, "none", { stroke: "#ef4444", sw: 8, name: "Lost life" }),
      T("RESPAWN", 60, 300, W - 120, { size: 190, family: "mono", bold: true, color: PURP, align: "center", lh: 1 }),
      T("in 3... 2... 1...", 60, 520, W - 120, { size: 76, family: "mono", color: INK, align: "center" }),
      R(226, 680, 700, 76, "none", { stroke: INK, sw: 8, radius: 14, name: "XP bar" }),
      R(242, 696, 470, 44, "#22c55e", { radius: 8, name: "XP fill" }),
      T("XP 68%", 226, 776, 700, { size: 40, family: "mono", bold: true, color: MUTED, align: "center" }),
      T("GAME OVER IS JUST\nA SAVE POINT", 60, 900, W - 120, { size: 70, bold: true, color: INK, align: "center", lh: 1.15 }),
    ]),
  ]);

  // 4. City: name + coordinates on the chest, lit skyline on the back.
  tpl("city-lights-hoodie-me2", "City chest and back skyline hoodie", "hoodie", HD + "city skyline karachi urban night lights minimal chest big back front back", (W, H) => {
    const mini = [[24, 40], [30, 62], [22, 48], [34, 70], [20, 36]];
    let mx = 507;
    const small = mini.map(([w, h]) => { const r = R(mx, 196 - h, w, h, ["#0e7490", "#155e75", CYAN][mx % 3], { name: "Mini building" }); mx += w + 2; return r; });
    const B = [[70, 260], [90, 380], [60, 300], [110, 520], [80, 340], [70, 440], [100, 300], [60, 380], [90, 260], [70, 220]];
    const cols = ["#0e7490", "#155e75", CYAN];
    let x = 176;
    const city = [];
    const lights = [];
    B.forEach(([w, h], i) => {
      const top = 760 - h;
      city.push(R(x, top, w, h, cols[i % 3], { name: "Building" }));
      const xs = w >= 90 ? [x + w / 3 - 9, x + (2 * w) / 3 - 9] : [x + w / 2 - 9];
      for (let y = top + 30; y + 24 <= 760 - 30; y += 52) for (const wx of xs) lights.push(R(r1(wx), y, 18, 24, "#fde68a", { radius: 3, name: "Window" }));
      x += w;
    });
    return [
      page("none", [
        ...small,
        T("KARACHI", 336, 210, 480, { size: 64, bold: true, color: INK, align: "center", ls: 12 }),
        R(536, 300, 80, 5, CYAN, { radius: 2, name: "Rule" }),
        T("24.86° N · 67.01° E", 336, 320, 480, { size: 28, family: "mono", color: MUTED, align: "center" }),
      ]),
      page("none", [
        C(860, 140, 110, 110, "#facc15", { name: "Moon" }),
        R(447, 170, 8, 72, "#155e75", { name: "Antenna" }),
        ...city, ...lights,
        E("line-wavy", 226, 790, 700, { c1: CYAN }), E("line-wavy", 326, 870, 500, { c1: CYAN, op: 0.6 }),
        T("CITY OF LIGHTS", 60, 980, W - 120, { size: 96, bold: true, color: "#155e75", align: "center" }),
        T("KARACHI · SINCE 1729", 60, 1120, W - 120, { size: 50, color: INK, align: "center", ls: 10 }),
      ]),
    ];
  });

  // 5. College: "Department of" collegiate type.
  tpl("dept-of-art-hoodie-me2", "Department of Art college hoodie", "hoodie", HD + "college university department art design student campus", (W, H) => [page("none", [
    T("WESTFIELD COLLEGE", 60, 200, W - 120, { size: 58, bold: true, color: "#1e3a8a", align: "center", ls: 12 }),
    R(176, 300, 800, 6, "#1e3a8a", { name: "Rule" }),
    T("Department", 60, 340, W - 120, { size: 140, family: "serif", color: "#1e3a8a", align: "center", lh: 1 }),
    T("of", 60, 490, W - 120, { size: 90, family: "serif", italic: true, color: OCHRE, align: "center", lh: 1 }),
    T("ART & DESIGN", 60, 600, W - 120, { size: 112, family: "serif", bold: true, color: "#1e3a8a", align: "center", lh: 1 }),
    R(176, 750, 800, 6, "#1e3a8a", { name: "Rule" }),
    S("star", 270, 795, 40, 40, OCHRE, { name: "Star" }), S("star", 842, 795, 40, 40, OCHRE, { name: "Star" }),
    T("EST. 1958", 60, 786, W - 120, { size: 52, color: "#1e3a8a", align: "center", ls: 16 }),
  ])]);

  // 6. College alumni: laurel wreath made of leaf ellipses.
  tpl("alumni-laurel-hoodie-me2", "Alumni laurel wreath hoodie", "hoodie", HD + "college university alumni laurel wreath graduate class", (W, H) => {
    // Two branches on a circle (angles in degrees, y down: 90 = bottom), each leaf pointing towards the branch tip.
    const cx = 576, cy = 460, rr = 290, LAU = "#a16207", RAD = Math.PI / 180;
    const at = (a) => [cx + rr * Math.cos(a * RAD), cy + rr * Math.sin(a * RAD)];
    const parts = [];
    for (const side of [1, -1]) {
      const mx = (x) => (side === 1 ? x : 2 * cx - x), mr = (r) => (side === 1 ? r : -r);
      const stem = [];
      for (let a = 100; a <= 240; a += 10) stem.push(at(a));
      parts.push(...poly(stem.map(([x, y]) => [r1(mx(x)), r1(y)]), LAU, 8, "Laurel stem"));
      const leaf = (a, dir, L = 84) => {
        const [sx, sy] = at(a), d = a + 90 + dir, ux = Math.cos(d * RAD), uy = Math.sin(d * RAD);
        const x = sx + (ux * L) / 2, y = sy + (uy * L) / 2;
        parts.push(C(r1(mx(x) - L / 2), r1(y - 16), L, 32, LAU, { rot: r1(mr(d)), name: "Leaf" }));
      };
      for (let a = 108; a <= 228; a += 15) { leaf(a, -40); leaf(a + 6, 40); }
      leaf(243, 0, 70);
    }
    return [page("none", [
      ...parts,
      S("triangle", 530, 742, 36, 40, NAVY, { rot: 90, name: "Bow" }), S("triangle", 586, 742, 36, 40, NAVY, { rot: -90, name: "Bow" }),
      C(564, 750, 24, 24, NAVY, { name: "Knot" }),
      T("ALUMNI", 276, 330, 600, { size: 76, bold: true, color: NAVY, align: "center", ls: 6 }),
      T("2026", 276, 430, 600, { size: 170, family: "serif", bold: true, color: NAVY, align: "center", lh: 1 }),
      T("NORTHWOOD UNIVERSITY", 60, 830, W - 120, { size: 56, bold: true, color: NAVY, align: "center", ls: 6 }),
      T("forever a Hawk", 60, 920, W - 120, { size: 80, family: "serif", italic: true, color: LAU, align: "center" }),
    ])];
  });

  // 7. Club: bicycle drawn with strokes.
  tpl("ride-club-hoodie-me2", "Cycling club bicycle hoodie", "hoodie", HD + "cycling bike club ride sunday cyclist sport", (W, H) => [page("none", [
    T("SUNDAY RIDE CLUB", 60, 120, W - 120, { size: 64, bold: true, color: INK, align: "center", ls: 10 }),
    C(266, 310, 240, 240, "none", { stroke: INK, sw: 16, name: "Wheel" }),
    C(646, 310, 240, 240, "none", { stroke: INK, sw: 16, name: "Wheel" }),
    seg(386, 430, 556, 440, RED, 16, "Frame"), seg(386, 430, 516, 296, RED, 16, "Frame"), seg(556, 440, 516, 296, RED, 16, "Frame"),
    seg(516, 300, 706, 300, RED, 16, "Frame"), seg(556, 440, 714, 330, RED, 16, "Frame"), seg(706, 300, 766, 430, RED, 16, "Fork"),
    seg(516, 296, 506, 264, INK, 12, "Seat post"), R(466, 250, 90, 20, INK, { radius: 10, name: "Saddle" }),
    seg(706, 300, 716, 264, INK, 12, "Stem"), R(696, 252, 70, 16, INK, { radius: 8, name: "Handlebar" }),
    C(536, 420, 40, 40, INK, { name: "Crank" }), seg(556, 440, 584, 478, INK, 10, "Crank arm"), R(566, 474, 40, 12, INK, { radius: 6, name: "Pedal" }),
    C(376, 420, 20, 20, INK, { name: "Hub" }), C(756, 420, 20, 20, INK, { name: "Hub" }),
    T("ride far", 60, 610, W - 120, { size: 140, family: "serif", italic: true, color: RED, align: "center", lh: 1 }),
    T("EAT CAKE", 60, 760, W - 120, { size: 120, bold: true, color: INK, align: "center", ls: 10, lh: 1 }),
    T("ISLAMABAD · 2026", 60, 920, W - 120, { size: 48, color: MUTED, align: "center", ls: 12 }),
  ])]);

  // 8. Club: retro tennis racket.
  tpl("court-side-tennis-hoodie-me2", "Tennis club retro hoodie", "hoodie", HD + "tennis club sport racket retro country club court", (W, H) => {
    const G2 = "#166534", STR = "#94a3b8";
    const strings = [
      ...[-90, -60, -30, 0, 30, 60, 90].map((dx) => { const hl = 152 * Math.sqrt(1 - (dx / 122) ** 2); return seg(576 + dx, r1(330 - hl), 576 + dx, r1(330 + hl), STR, 4, "String"); }),
      ...[-120, -80, -40, 0, 40, 80, 120].map((dy) => { const hl = 122 * Math.sqrt(1 - (dy / 152) ** 2); return seg(r1(576 - hl), 330 + dy, r1(576 + hl), 330 + dy, STR, 4, "String"); }),
    ];
    return [page("none", [
      C(810, 190, 110, 110, "#84cc16", { name: "Ball" }),
      C(822, 202, 86, 86, "none", { stroke: WHITE, sw: 5, name: "Ball seam" }),
      ...turn(576, 450, -30, [
        ...strings,
        C(436, 160, 280, 340, "none", { stroke: G2, sw: 18, name: "Racket head" }),
        seg(536, 488, 576, 566, G2, 18, "Throat"), seg(616, 488, 576, 566, G2, 18, "Throat"),
        R(561, 560, 30, 90, G2, { radius: 8, name: "Shaft" }),
        R(556, 640, 40, 110, PINE, { radius: 12, name: "Grip" }),
      ]),
      T("COURT SIDE", 60, 790, W - 120, { size: 130, family: "serif", bold: true, color: G2, align: "center", lh: 1 }),
      R(376, 934, 400, 10, G2, { radius: 5, name: "Stripe" }), R(376, 952, 400, 10, RED, { radius: 5, name: "Stripe" }),
      T("TENNIS CLUB", 60, 980, W - 120, { size: 70, bold: true, color: INK, align: "center", ls: 20 }),
      T("EST. 1998 · MEMBERS ONLY", 60, 1080, W - 120, { size: 40, color: MUTED, align: "center", ls: 6 }),
    ])];
  });

  // 9. Gamer: own pixel creature.
  tpl("pixel-player-hoodie-me2", "Pixel creature player one hoodie", "hoodie", HD + "gamer pixel retro arcade player video game 8bit", (W, H) => {
    const art = ["...XXX...", ".XXXXXXX.", "XX.XXX.XX", "XXXXXXXXX", "XXX...XXX", "XXXXXXXXX", "X.X.X.X.X"];
    const px = [];
    art.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "X") px.push(R(306 + c * 60, 150 + r * 60, 58, 58, r < 2 ? "#a78bfa" : PURP, { name: "Pixel" })); }));
    return [page("none", [
      ...px,
      ...[0, 1, 2].map((i) => R(456 + i * 90, 1060, 36, 36, "#facc15", { name: "Coin" })),
      T("PLAYER 1", 60, 640, W - 120, { size: 150, family: "mono", bold: true, color: INK, align: "center", lh: 1 }),
      T("READY?", 60, 810, W - 120, { size: 110, family: "mono", bold: true, color: PURP, align: "center", lh: 1 }),
      T("INSERT COIN TO CONTINUE", 60, 960, W - 120, { size: 46, family: "mono", color: MUTED, align: "center" }),
    ])];
  });

  // 10. Minimal: vertical side text with a rule.
  tpl("vertical-type-hoodie-me2", "Vertical side text minimal hoodie", "hoodie", HD + "minimal typography vertical text simple modern quote", (W, H) => [page("none", [
    T("NOTHING IS PERMANENT", -390, 636.4, 1100, { size: 56, bold: true, color: INK, ls: 10, rot: -90 }),
    R(250, 120, 4, 1100, INK, { name: "Rule" }),
    T("N° 07", 700, 120, 360, { size: 48, family: "mono", color: INK, align: "right" }),
    T("a reminder\nto enjoy the\nin-between", 560, 900, 500, { size: 72, family: "serif", italic: true, color: INK, align: "right", lh: 1.1 }),
    C(1036, 1180, 24, 24, RED, { name: "Dot" }),
  ])]);

  // 11. Nature: pine forest under the moon.
  tpl("pine-forest-hoodie-me2", "Pine forest night hoodie", "hoodie", HD + "nature forest pine trees woods camping outdoors moon", (W, H) => {
    const pine = (cx, h, col) => [
      R(cx - 12, 724, 24, 36, BARK, { name: "Trunk" }),
      S("triangle", r1(cx - 0.3 * h), r1(724 - 0.48 * h), r1(0.6 * h), r1(0.48 * h), col, { name: "Pine" }),
      S("triangle", r1(cx - 0.24 * h), r1(724 - 0.78 * h), r1(0.48 * h), r1(0.42 * h), col, { name: "Pine" }),
      S("triangle", r1(cx - 0.17 * h), r1(724 - h), r1(0.34 * h), r1(0.36 * h), col, { name: "Pine" }),
    ];
    return [page("none", [
      C(820, 130, 150, 150, "#facc15", { name: "Moon" }),
      S("star", 260, 200, 36, 36, AMB, { name: "Star" }), S("star", 480, 150, 28, 28, AMB, { name: "Star" }),
      S("star", 1000, 330, 30, 30, AMB, { name: "Star" }), S("star", 140, 380, 26, 26, AMB, { name: "Star" }),
      ...pine(200, 260, FOREST), ...pine(450, 300, "#15803d"), ...pine(950, 270, PINE), ...pine(702, 340, "#15803d"),
      ...pine(330, 380, PINE), ...pine(826, 400, FOREST), ...pine(576, 480, PINE),
      R(116, 756, 920, 14, PINE, { radius: 7, name: "Ground" }),
      T("INTO THE WOODS", 60, 820, W - 120, { size: 96, bold: true, color: PINE, align: "center", ls: 2 }),
      T("and the quiet", 60, 950, W - 120, { size: 90, family: "serif", italic: true, color: "#a16207", align: "center" }),
      T("N 35.9° · E 74.3°", 60, 1090, W - 120, { size: 40, family: "mono", color: MUTED, align: "center" }),
    ])];
  });

  // 12. Nature: wildflowers built from circles.
  tpl("wildflower-hoodie-me2", "Wildflower meadow hoodie", "hoodie", HD + "nature flowers wildflower meadow spring floral grow", (W, H) => {
    const flower = (cx, cy, r, petal, mid2) => [
      R(cx - 6, cy, 12, 760 - cy, "#15803d", { radius: 6, name: "Stem" }),
      C(cx + 4, r1(cy + (760 - cy) * 0.55), 80, 32, LEAF, { rot: -35, name: "Leaf" }),
      ...[0, 1, 2, 3, 4, 5].map((j) => { const a = (j * Math.PI) / 3; return C(r1(cx + 0.62 * r * Math.cos(a) - r / 2), r1(cy + 0.62 * r * Math.sin(a) - r / 2), r, r, petal, { name: "Petal" }); }),
      C(r1(cx - 0.42 * r), r1(cy - 0.42 * r), r1(0.84 * r), r1(0.84 * r), mid2, { name: "Flower centre" }),
    ];
    return [page("none", [
      ...flower(250, 430, 80, "#f472b6", "#facc15"), ...flower(413, 290, 95, "#fb923c", "#7c2d12"),
      ...flower(576, 420, 85, "#a78bfa", "#facc15"), ...flower(739, 270, 100, "#f43f5e", "#facc15"),
      ...flower(902, 440, 80, "#f59e0b", "#7c2d12"),
      R(176, 756, 800, 10, "#15803d", { radius: 5, name: "Ground" }),
      T("GROW THROUGH", 60, 810, W - 120, { size: 110, bold: true, color: "#be185d", align: "center" }),
      T("what you go through", 60, 950, W - 120, { size: 84, family: "serif", italic: true, color: "#15803d", align: "center" }),
    ])];
  });

  // 13. City: metro map with interchanges.
  tpl("metro-map-hoodie-me2", "City metro map hoodie", "hoodie", HD + "city metro subway map urban transport lines stations", (W, H) => {
    const stop = (x, y) => C(x - 15, y - 15, 30, 30, WHITE, { stroke: INK, sw: 6, name: "Station" });
    const hub = (x, y) => R(x - 28, y - 20, 56, 40, WHITE, { stroke: INK, sw: 6, radius: 20, name: "Interchange" });
    const lab = (s, x, y, w, align = "left") => T(s, x, y, w, { size: 30, bold: true, color: INK, align, name: "Station name" });
    return [page("none", [
      ...poly([[176, 300], [476, 300], [676, 500], [976, 500]], RED, 24, "Red line"),
      ...poly([[576, 170], [576, 740]], BLUE2, 24, "Blue line"),
      ...poly([[226, 640], [826, 640], [926, 740]], LEAF, 24, "Green line"),
      stop(176, 300), stop(326, 300), stop(826, 500), stop(976, 500),
      stop(576, 170), stop(576, 280), stop(576, 520), stop(576, 740),
      stop(226, 640), stop(401, 640), stop(726, 640), stop(926, 740),
      hub(576, 400), hub(576, 640),
      lab("Old Town", 96, 326, 160, "center"), lab("Museum", 606, 152, 200), lab("Central", 612, 356, 200),
      lab("Harbour", 896, 528, 160, "center"), lab("Lake", 166, 668, 120, "center"), lab("Garden Gate", 816, 768, 220, "center"),
      lab("University", 476, 770, 200, "center"),
      T("RIDE THE CITY", 60, 850, W - 120, { size: 104, bold: true, color: INK, align: "center" }),
      T("3 LINES · 1 CITY · NO TRAFFIC", 60, 990, W - 120, { size: 40, bold: true, color: MUTED, align: "center", ls: 4 }),
    ])];
  });

  // 14. Music: vinyl record.
  tpl("vinyl-record-hoodie-me2", "Vinyl record hoodie", "hoodie", HD + "music vinyl record retro play loud dj band", (W, H) => [page("none", [
    E("deco-sparkles", 910, 130, 150, { c1: RUST, c2: AMB }),
    C(276, 120, 600, 600, "#18181b", { name: "Record" }),
    ...[30, 65, 100, 135].map((d) => C(276 + d, 120 + d, 600 - 2 * d, 600 - 2 * d, "none", { stroke: "#3f3f46", sw: 4, name: "Groove" })),
    C(471, 315, 210, 210, RUST, { name: "Label" }),
    T("SIDE A", 471, 350, 210, { size: 30, bold: true, color: WHITE, align: "center", ls: 4 }),
    C(566, 410, 20, 20, WHITE, { name: "Hole" }),
    T("33 RPM", 471, 446, 210, { size: 28, color: WHITE, align: "center" }),
    T("PLAY IT LOUD", 60, 780, W - 120, { size: 112, bold: true, color: RUST, align: "center" }),
    T("good music · good mood", 60, 930, W - 120, { size: 76, family: "serif", italic: true, color: INK, align: "center" }),
  ])]);

  // 15. Music: equalizer bars in a colour run.
  tpl("equalizer-hoodie-me2", "Sound wave equalizer hoodie", "hoodie", HD + "music sound wave equalizer bass dj audio beats", (W, H) => {
    const hs = [80, 140, 220, 180, 300, 240, 380, 300, 440, 520, 440, 300, 380, 240, 300, 180, 220, 140, 80];
    const bars = hs.map((h, i) => {
      const t = i / (hs.length - 1);
      const col = t < 0.5 ? mix(PURP, PINK, t * 2) : mix(PINK, "#f97316", (t - 0.5) * 2);
      return R(165 + i * 44, 450 - h / 2, 30, h, col, { radius: 15, name: "Bar" });
    });
    return [page("none", [
      ...bars,
      T("TURN IT UP", 60, 780, W - 120, { size: 128, bold: true, color: INK, align: "center" }),
      T("the bass is calling", 60, 950, W - 120, { size: 80, family: "serif", italic: true, color: PINK, align: "center" }),
    ])];
  });

  /* ================= Mug wraps (8.5 × 3.5 in = 816 × 336 px; key text 24 px from the ends, 15 px from top/bottom) ================= */

  // 1. Best boss trophy.
  tpl("best-boss-trophy-mug-me2", "Best boss trophy mug", "mug", MG + "boss best boss office gift team manager trophy", (W, H) => [page("#fffbeb", [
    C(78, 74, 70, 70, "none", { stroke: "#ca8a04", sw: 12, name: "Trophy handle" }),
    C(232, 74, 70, 70, "none", { stroke: "#ca8a04", sw: 12, name: "Trophy handle" }),
    E("shape-half-circle", 110, 64, 160, { c1: "#ca8a04", rot: 180 }),
    S("star", 166, 80, 48, 46, WHITE, { name: "Star" }),
    R(178, 146, 24, 46, "#ca8a04", { name: "Trophy stem" }),
    R(140, 190, 100, 24, "#a16207", { radius: 6, name: "Trophy base" }),
    R(120, 212, 140, 34, "#854d0e", { radius: 8, name: "Trophy plinth" }),
    E("deco-sparkles", 40, 30, 60, { c1: "#ca8a04", c2: AMB }),
    T("WORLD'S", 320, 56, 450, { size: 36, bold: true, color: "#a16207", ls: 8 }),
    T("Best Boss", 320, 102, 450, { size: 88, family: "serif", bold: true, color: INK, lh: 1 }),
    T("Thanks for putting up with us", 320, 206, 450, { size: 28, family: "serif", italic: true, color: MUTED }),
    T("— love, the whole team", 320, 250, 450, { size: 24, color: "#a16207" }),
  ])]);

  // 2. Teacher: chalkboard with apple and pencil.
  tpl("chalkboard-teacher-mug-me2", "Chalkboard teacher mug", "mug", MG + "teacher school chalkboard thank you gift class apple", (W, H) => [page("#fef3c7", [
    R(160, 26, 496, 270, "#14532d", { radius: 14, stroke: "#92400e", sw: 16, name: "Chalkboard" }),
    T("Teaching is my", 196, 64, 424, { size: 36, family: "serif", italic: true, color: WHITE, align: "center" }),
    T("SUPERPOWER", 196, 112, 424, { size: 52, bold: true, color: "#fde68a", align: "center", ls: 2 }),
    E("line-hand", 288, 178, 240, { c1: WHITE }),
    T("Ms. Fatima · Grade 3", 196, 222, 424, { size: 28, color: "#d1fae5", align: "center" }),
    R(220, 296, 376, 12, BARK, { radius: 4, name: "Chalk ledge" }), R(470, 288, 40, 8, WHITE, { radius: 3, name: "Chalk" }),
    C(50, 140, 90, 84, RED, { name: "Apple" }), R(92, 116, 6, 26, BARK, { radius: 3, name: "Apple stem" }),
    C(98, 112, 34, 16, LEAF, { rot: -30, name: "Apple leaf" }),
    R(708, 60, 32, 26, "#f472b6", { radius: 6, name: "Eraser" }), R(708, 84, 32, 12, "#94a3b8", { name: "Pencil band" }),
    R(708, 96, 32, 150, "#facc15", { name: "Pencil" }),
    S("triangle", 708, 246, 32, 40, "#fcd9a8", { rot: 180, name: "Pencil tip" }), S("triangle", 717, 272, 14, 14, INK, { rot: 180, name: "Pencil lead" }),
  ])]);

  // 3. Nurse: heartbeat line around the whole mug.
  tpl("heartbeat-nurse-mug-me2", "Heartbeat nurse mug", "mug", MG + "nurse doctor medical hospital heartbeat coffee gift", (W, H) => [page(WHITE, [
    T("SAVING LIVES", 40, 34, 736, { size: 30, bold: true, color: "#0e7490", align: "center", ls: 10 }),
    T("one coffee at a time", 40, 78, 736, { size: 52, family: "serif", italic: true, color: INK, align: "center" }),
    ...poly([[0, 220], [90, 220], [110, 200], [130, 220], [155, 220], [170, 240], [195, 150], [220, 290], [240, 220], [270, 220], [290, 205], [310, 220], [614, 220]], "#ef4444", 8, "Heartbeat"),
    S("heart", 612, 196, 56, 50, "#ef4444", { name: "Heart" }),
    seg(666, 220, 816, 220, "#ef4444", 8, "Heartbeat"),
    T("Nurse Amna, RN", 40, 262, 736, { size: 28, color: MUTED, align: "center" }),
  ])]);

  // 4. Pet photo in a circle with a paw trail.
  tpl("pet-photo-mug-me2", "Pet photo frame mug", "mug", MG + "pet dog cat photo frame paws name gift owner", (W, H) => {
    const paw = (x, y, s, rot) => turn(x + s / 2, y + s / 2, rot, [
      C(r1(x + 0.19 * s), r1(y + 0.42 * s), r1(0.62 * s), r1(0.5 * s), "#fdba74", { name: "Paw" }),
      C(x, r1(y + 0.12 * s), r1(0.22 * s), r1(0.3 * s), "#fdba74", { name: "Toe" }),
      C(r1(x + 0.25 * s), y, r1(0.22 * s), r1(0.3 * s), "#fdba74", { name: "Toe" }),
      C(r1(x + 0.53 * s), y, r1(0.22 * s), r1(0.3 * s), "#fdba74", { name: "Toe" }),
      C(r1(x + 0.78 * s), r1(y + 0.12 * s), r1(0.22 * s), r1(0.3 * s), "#fdba74", { name: "Toe" }),
    ]);
    return [page("#fff7ed", [
      C(56, 34, 268, 268, "none", { stroke: RUST, sw: 6, name: "Photo ring" }),
      F(70, 48, 240, 240, { shape: "circle", name: "Pet photo" }),
      T("Coco", 360, 50, 410, { size: 100, family: "serif", bold: true, italic: true, color: BROWN, align: "center", lh: 1 }),
      T("GOOD GIRL · 2021", 360, 162, 410, { size: 28, bold: true, color: RUST, align: "center", ls: 4 }),
      T("Dog mom, full time.", 360, 206, 410, { size: 30, family: "serif", italic: true, color: INK, align: "center" }),
      ...[0, 1, 2, 3, 4].flatMap((i) => paw(410 + i * 68, i % 2 ? 258 : 270, 36, 70)),
    ])];
  });

  // 5. Couples: two round photos and a heart.
  tpl("couple-photos-mug-me2", "Couple photo hearts mug", "mug", MG + "couple love photos anniversary valentine you and me gift", (W, H) => [page("#fdf2f8", [
    C(46, 46, 244, 244, "none", { stroke: PINK, sw: 6, name: "Photo ring" }),
    F(58, 58, 220, 220, { shape: "circle", name: "Photo 1" }),
    C(526, 46, 244, 244, "none", { stroke: PINK, sw: 6, name: "Photo ring" }),
    F(538, 58, 220, 220, { shape: "circle", name: "Photo 2" }),
    S("heart", 368, 64, 80, 72, PINK, { name: "Heart" }),
    T("You & Me", 290, 146, 236, { size: 50, family: "serif", bold: true, italic: true, color: BERRY, align: "center" }),
    T("since 2019", 290, 214, 236, { size: 26, color: MUTED, align: "center", ls: 4 }),
  ])]);

  // 6. Minimal serif quote.
  tpl("serif-quote-mug-me2", "Minimal serif quote mug", "mug", MG + "quote minimal serif words inspiration positive", (W, H) => [page(WHITE, [
    R(24, 15, 768, 306, "none", { stroke: "#e7e5e4", sw: 3, radius: 10, name: "Border" }),
    T("“", 60, 30, 120, { size: 160, family: "serif", bold: true, color: "#d97706", lh: 1 }),
    T("Be the energy you want\nto attract.", 190, 80, 570, { size: 46, family: "serif", color: INK, lh: 1.2 }),
    R(190, 214, 80, 4, "#d97706", { radius: 2, name: "Rule" }),
    T("— your daily reminder", 190, 230, 400, { size: 26, family: "serif", italic: true, color: MUTED }),
  ])]);

  // 7. Bold two-colour quote block.
  tpl("colour-block-quote-mug-me2", "Bold colour block quote mug", "mug", MG + "quote bold colour block typography patience motivation", (W, H) => [page("#1e1b4b", [
    R(0, 0, 408, 336, "#facc15", { name: "Colour block" }),
    T("GOOD\nTHINGS", 48, 70, 340, { size: 84, bold: true, color: "#1e1b4b", lh: 0.95 }),
    T("SIP SLOWLY", 48, 256, 340, { size: 24, bold: true, color: "#1e1b4b", ls: 6 }),
    T("take\ntime.", 456, 60, 320, { size: 100, family: "serif", italic: true, color: "#facc15", lh: 0.95 }),
    T("BREATHE OUT", 456, 256, 320, { size: 24, bold: true, color: WHITE, ls: 6 }),
  ])]);

  // 8. Birthday cake with candles.
  tpl("birthday-cake-mug-me2", "Birthday cake mug", "mug", MG + "birthday cake candles party gift name celebration", (W, H) => [page("#fdf4ff", [
    E("deco-confetti", 40, 230, 80, {}),
    E("deco-sparkles", 690, 232, 70, { c1: "#a855f7", c2: "#f472b6" }),
    ...[0, 1, 2].flatMap((i) => [
      C(370 + i * 30, 78, 16, 24, "#f59e0b", { name: "Flame" }),
      R(372 + i * 30, 100, 12, 42, ["#38bdf8", "#facc15", "#34d399"][i], { radius: 4, name: "Candle" }),
    ]),
    R(343, 140, 130, 62, "#c084fc", { radius: 12, name: "Top tier" }),
    R(343, 140, 130, 18, "#f3e8ff", { radius: 9, name: "Top icing" }),
    R(318, 196, 180, 92, "#f472b6", { radius: 14, name: "Cake" }),
    R(318, 196, 180, 24, "#fbcfe8", { radius: 12, name: "Icing" }),
    ...[0, 1, 2, 3, 4].map((i) => C(344 + i * 34, 240, 12, 12, WHITE, { name: "Sprinkle" })),
    R(296, 286, 224, 12, "#a855f7", { radius: 6, name: "Plate" }),
    T("Happy", 40, 92, 250, { size: 64, family: "serif", italic: true, bold: true, color: "#a21caf", align: "center" }),
    T("BIRTHDAY", 40, 172, 250, { size: 36, bold: true, color: "#86198f", align: "center", ls: 4 }),
    T("Sara!", 540, 88, 240, { size: 76, family: "serif", bold: true, color: "#a21caf", align: "center" }),
    T("make a wish", 540, 184, 240, { size: 32, family: "serif", italic: true, color: MUTED, align: "center" }),
  ])]);

  // 9. Christmas knit (sweater) pattern bands.
  tpl("christmas-knit-mug-me2", "Christmas knit pattern mug", "mug", MG + "christmas holiday knit sweater pattern family festive", (W, H) => [page("#b91c1c", [
    ...Array.from({ length: 17 }, (_, i) => S("triangle", i * 48, 18, 48, 28, WHITE, { name: "Knit" })),
    ...Array.from({ length: 17 }, (_, i) => C(19 + i * 48, 56, 10, 10, "#fde68a", { name: "Knit dot" })),
    ...Array.from({ length: 17 }, (_, i) => C(19 + i * 48, 270, 10, 10, "#fde68a", { name: "Knit dot" })),
    ...Array.from({ length: 17 }, (_, i) => S("triangle", i * 48, 290, 48, 28, WHITE, { rot: 180, name: "Knit" })),
    S("star", 70, 116, 70, 70, WHITE, { points: 6, name: "Snowflake" }),
    S("star", 676, 116, 70, 70, WHITE, { points: 6, name: "Snowflake" }),
    T("Merry Christmas", 160, 96, 496, { size: 58, family: "serif", bold: true, italic: true, color: WHITE, align: "center" }),
    T("FROM OUR HOME TO YOURS", 160, 190, 496, { size: 22, bold: true, color: "#fde68a", align: "center", ls: 6 }),
    T("The Ahmed family", 160, 226, 496, { size: 28, family: "serif", italic: true, color: WHITE, align: "center" }),
  ])]);

  // 10. Christmas tree with presents and a name.
  tpl("christmas-tree-name-mug-me2", "Christmas tree name mug", "mug", MG + "christmas tree santa name presents holiday gift kids", (W, H) => [page("#fffbeb", [
    ...[[40, 60], [290, 120], [300, 290], [780, 40], [20, 250]].map(([x, y]) => C(x, y, 14, 14, "#bfdbfe", { name: "Snow" })),
    R(176, 268, 28, 32, BARK, { name: "Trunk" }),
    S("triangle", 110, 160, 160, 110, "#15803d", { name: "Tree" }),
    S("triangle", 125, 105, 130, 100, LEAF, { name: "Tree" }),
    S("triangle", 140, 56, 100, 90, "#15803d", { name: "Tree" }),
    S("star", 166, 26, 48, 46, "#f59e0b", { name: "Star" }),
    C(150, 228, 18, 18, RED, { name: "Bauble" }), C(212, 196, 18, 18, "#eab308", { name: "Bauble" }), C(172, 150, 16, 16, RED, { name: "Bauble" }),
    C(196, 106, 14, 14, "#eab308", { name: "Bauble" }),
    R(80, 266, 60, 40, RED, { radius: 4, name: "Present" }), R(106, 266, 8, 40, "#fde68a", { name: "Ribbon" }),
    R(226, 276, 50, 30, BLUE2, { radius: 4, name: "Present" }), R(247, 276, 8, 30, WHITE, { name: "Ribbon" }),
    T("Santa's favourite", 330, 62, 450, { size: 50, family: "serif", italic: true, color: "#b91c1c", align: "center" }),
    T("SARA", 330, 128, 450, { size: 100, bold: true, color: "#15803d", align: "center", ls: 10, lh: 1 }),
    T("CHRISTMAS 2026", 330, 244, 450, { size: 24, bold: true, color: OCHRE, align: "center", ls: 8 }),
  ])]);

  // 11. Name with gingham pattern ends and a monogram oval.
  tpl("gingham-monogram-mug-me2", "Gingham monogram name mug", "mug", MG + "name monogram initial pattern gingham personal gift", (W, H) => {
    const G = "#f87171";
    const stripes = [
      ...[0, 58, 116, 174].map((x) => R(x, 0, 29, 336, G, { op: 0.45, name: "Pattern stripe" })),
      ...[787, 729, 671, 613].map((x) => R(x, 0, 29, 336, G, { op: 0.45, name: "Pattern stripe" })),
      ...[0, 56, 112, 168, 224, 280].flatMap((y) => [R(0, y, 232, 28, G, { op: 0.45, name: "Pattern stripe" }), R(584, y, 232, 28, G, { op: 0.45, name: "Pattern stripe" })]),
    ];
    return [page(WHITE, [
      ...stripes,
      C(240, 16, 336, 304, WHITE, { stroke: G, sw: 6, name: "Name oval" }),
      T("S", 258, 40, 300, { size: 110, family: "serif", bold: true, italic: true, color: RED, align: "center", lh: 1 }),
      T("Sara Ahmed", 258, 156, 300, { size: 46, family: "serif", color: INK, align: "center" }),
      T("EST. 1996", 258, 222, 300, { size: 22, bold: true, color: MUTED, align: "center", ls: 6 }),
    ])];
  });

  // 12. Name as a dictionary entry.
  tpl("name-definition-mug-me2", "Name dictionary meaning mug", "mug", MG + "name meaning definition dictionary funny friend gift", (W, H) => [page("#f8fafc", [
    T("Ayesha", 56, 34, 520, { size: 76, family: "serif", bold: true, color: INK }),
    T("/ eye-EE-sha /   noun", 56, 128, 520, { size: 26, family: "serif", italic: true, color: MUTED }),
    R(56, 168, 520, 2, "#cbd5e1", { name: "Rule" }),
    T("1. A kind soul who makes the best chai.\n2. A loyal friend, usually right.\n3. See also: legend.", 56, 182, 520, { size: 24, color: INK, lh: 1.4 }),
    R(596, 40, 2, 250, "#cbd5e1", { name: "Rule" }),
    C(616, 78, 170, 170, "#e0e7ff", { name: "Initial circle" }),
    mid("A", 616, 78, 170, 170, { size: 120, family: "serif", bold: true, color: IND, lh: 1 }),
  ])]);

  // 13. Three photos in a row.
  tpl("three-photo-strip-mug-me2", "Three photo strip mug", "mug", MG + "photo collage three photos friends family memories", (W, H) => [page(WHITE, [
    F(24, 24, 232, 232, { shape: "rounded", radius: 18, name: "Photo 1" }),
    F(292, 24, 232, 232, { shape: "rounded", radius: 18, name: "Photo 2" }),
    F(560, 24, 232, 232, { shape: "rounded", radius: 18, name: "Photo 3" }),
    S("heart", 262, 130, 24, 22, "#e11d48", { name: "Heart" }), S("heart", 530, 130, 24, 22, "#e11d48", { name: "Heart" }),
    T("Best friends forever", 24, 268, 768, { size: 36, family: "serif", italic: true, color: "#e11d48", align: "center" }),
  ])]);

  // 14. Film strip with five photos.
  tpl("filmstrip-photo-mug-me2", "Filmstrip photo mug", "mug", MG + "photo collage film strip camera memories summer five photos", (W, H) => [page("#18181b", [
    ...Array.from({ length: 20 }, (_, i) => R(14 + i * 40, 18, 22, 16, "#e5e5e5", { radius: 4, name: "Film hole" })),
    ...Array.from({ length: 20 }, (_, i) => R(14 + i * 40, 302, 22, 16, "#e5e5e5", { radius: 4, name: "Film hole" })),
    ...[0, 1, 2, 3, 4].map((i) => F(40 + i * 150, 52, 136, 200, { name: "Photo " + (i + 1) })),
    T("SUMMER '26  ·  ROLL 01", 40, 262, 736, { size: 22, family: "mono", color: "#fbbf24", align: "center", ls: 4 }),
  ])]);

  // 15. Coffee o'clock: clock with coffee-bean hour marks.
  tpl("coffee-oclock-mug-me2", "Coffee o'clock mug", "mug", MG + "coffee clock funny morning time office gift", (W, H) => [page("#fef3c7", [
    C(288, 48, 240, 240, WHITE, { stroke: BARK, sw: 12, name: "Clock face" }),
    ...Array.from({ length: 12 }, (_, h) => { const a = ((h * 30 - 90) * Math.PI) / 180; return C(r1(408 + 92 * Math.cos(a) - 9), r1(168 + 92 * Math.sin(a) - 13), 18, 26, BARK, { rot: h * 30, name: "Coffee bean" }); }),
    seg(408, 168, 408, 96, INK, 10, "Minute hand"), seg(408, 168, 360, 140, INK, 12, "Hour hand"),
    C(400, 160, 16, 16, BARK, { name: "Clock centre" }),
    T("It's", 40, 96, 230, { size: 56, family: "serif", italic: true, color: BARK, align: "center" }),
    T("COFFEE", 40, 168, 230, { size: 44, bold: true, color: BARK, align: "center", ls: 4 }),
    T("O'CLOCK", 556, 120, 236, { size: 40, bold: true, color: BARK, align: "center", ls: 4 }),
    T("somewhere", 556, 172, 236, { size: 40, family: "serif", italic: true, color: MUTED, align: "center" }),
  ])]);
}
