// ROUND 2 layout batch (filled by a helper; see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md). Pure module, no imports.
// 15 logos (1000 × 1000) and 15 photo collages (1080 × 1080 square, 1200 × 800 landscape). Ids end in "-lc2".
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page, collagePage } = k;
  const { INK, MUTED, IND, COR, TEA, AMB, ROS, WHITE, GOLD } = k.K;

  /* ---------- small helpers ---------- */
  // Straight line from (x1, y1) to (x2, y2) as a rotated line shape.
  const seg = (x1, y1, x2, y2, color, sw = 6, o = {}) => {
    const len = Math.hypot(x2 - x1, y2 - y1), ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return S("line", (x1 + x2) / 2 - len / 2, (y1 + y2) / 2 - sw / 2, len, sw, color, { sw, rot: ang, name: "Line", ...o });
  };
  // Same, drawn with a line sticker (dashed, dotted, wavy ...).
  const eseg = (id, x1, y1, x2, y2, th, o = {}) => {
    const len = Math.hypot(x2 - x1, y2 - y1), ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return E(id, (x1 + x2) / 2 - len / 2, (y1 + y2) / 2 - th / 2, len, { h: th, rot: ang, ...o });
  };
  // Turns a group of layers by deg around (cx, cy): every layer keeps its place in the group.
  const tilt = (layers, cx, cy, deg) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    for (const l of layers) {
      const mx = l.x + l.w / 2 - cx, my = l.y + l.h / 2 - cy;
      l.x = cx + mx * c - my * s - l.w / 2;
      l.y = cy + mx * s + my * c - l.h / 2;
      l.rotation = (l.rotation || 0) + deg;
    }
    return layers;
  };
  // Cells of a collage layout (same maths as collage.js), to put labels on top of collagePage() frames.
  const cellRects = (cells, W, H, gap) => {
    const g = Math.max(0, Math.min(gap, Math.min(W, H) / 8)), aw = W - g, ah = H - g;
    return cells.map(([x0, y0, x1, y1]) => ({ x: g + x0 * aw, y: g + y0 * ah, w: (x1 - x0) * aw - g, h: (y1 - y0) * ah - g }));
  };
  // Star with a custom inner radius (0.9+ gives a scalloped seal edge).
  const scallop = (x, y, s, fill, points, inner, o = {}) => { const l = S("star", x, y, s, s, fill, { points, ...o }); l.shape.inner = inner; return l; };
  // Colour between two hex colours.
  const mix = (a, b, t) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");
  // Label pill: centred text on a rounded background.
  const pill = (text, x, y, w, size, color, fill, o = {}) => T(text, x, y, w, { size, bold: true, color, align: "center", bg: { color: fill, pad: 0.4, radius: 0.5 }, ...o });
  const SHADOW = { x: 0, y: 3, blur: 12, color: "#000000", opacity: 0.45 };

  /* ================= Logos (1000 × 1000) ================= */
  const LOGO = "logo brand identity ";

  // 1. Vintage seal: scalloped edge, gold rings, ribbon across the middle.
  tpl("bakery-vintage-seal-lc2", "Vintage bakery seal logo", "logo", LOGO + "bakery bread pastry vintage seal badge ribbon retro", () => {
    const BR = "#7c2d12", CR = "#fdf6ec", GD = "#fcd34d";
    return [page(CR, [
      scallop(110, 110, 780, BR, 36, 0.93, { name: "Scalloped seal" }),
      C(170, 170, 660, 660, "none", { stroke: GD, sw: 6, name: "Gold ring" }),
      C(198, 198, 604, 604, "none", { stroke: GD, sw: 2, op: 0.6, name: "Thin ring" }),
      E("icon-star", 296, 252, 34, { c1: GD }), E("icon-star", 670, 252, 34, { c1: GD }),
      T("EST. 1998", 350, 250, 300, { size: 30, bold: true, color: GD, align: "center", ls: 8 }),
      T("HONEY OAK", 200, 312, 600, { size: 82, family: "serif", bold: true, color: CR, align: "center" }),
      R(40, 492, 130, 106, "#92400e", { name: "Ribbon tail" }), R(830, 492, 130, 106, "#92400e", { name: "Ribbon tail" }),
      S("triangle", 7, 525, 106, 40, CR, { rot: 90, name: "Ribbon notch" }), S("triangle", 887, 525, 106, 40, CR, { rot: -90, name: "Ribbon notch" }),
      R(100, 450, 800, 120, "#d97706", { name: "Ribbon" }),
      T("BAKEHOUSE", 107, 471, 800, { size: 66, bold: true, color: WHITE, align: "center", ls: 14 }),
      T("ARTISAN BREAD · PASTRY", 220, 604, 560, { size: 28, bold: true, color: GD, align: "center", ls: 4 }),
      R(285, 702, 70, 22, GD, { radius: 11, name: "Rolling pin handle" }), R(645, 702, 70, 22, GD, { radius: 11, name: "Rolling pin handle" }),
      R(340, 690, 320, 46, GD, { radius: 23, name: "Rolling pin" }),
    ])];
  });

  // 2. Horizontal combination mark: kettlebell icon + stacked italic wordmark on dark.
  tpl("kettlebell-gym-logo-lc2", "Kettlebell gym logo", "logo", LOGO + "gym fitness kettlebell strength training crossfit sport club", () => {
    const LIME = "#a3e635", DK = "#0b0f19";
    return [page(DK, [
      C(150, 290, 210, 210, "none", { stroke: LIME, sw: 40, name: "Kettlebell handle" }),
      R(170, 630, 170, 40, LIME, { radius: 10, name: "Kettlebell base" }),
      C(110, 390, 290, 280, LIME, { name: "Kettlebell" }),
      T("24", 110, 470, 290, { size: 110, bold: true, color: DK, align: "center" }),
      T("IRON", 450, 330, 500, { size: 140, bold: true, italic: true, color: WHITE, lh: 1 }),
      T("PULSE", 450, 470, 500, { size: 140, bold: true, italic: true, color: LIME, lh: 1 }),
      R(456, 632, 440, 8, LIME, { name: "Bar" }),
      T("STRENGTH CLUB", 452, 660, 500, { size: 38, bold: true, color: "#9ca3af", ls: 12 }),
    ])];
  });

  // 3. Minimal line art: outlined skyline, spaced serif wordmark (transparent page).
  tpl("skyline-estates-logo-lc2", "Minimal skyline real estate logo", "logo", LOGO + "real estate property homes realtor skyline minimal line agency", () => {
    const NV = "#1e3a5f", GL = "#b08d57";
    return [page("none", [
      C(600, 210, 76, 76, "none", { stroke: GL, sw: 6, name: "Sun" }),
      R(330, 340, 110, 250, "none", { stroke: NV, sw: 8, name: "Building" }),
      R(450, 240, 110, 350, "none", { stroke: NV, sw: 8, name: "Tower" }),
      R(570, 390, 100, 200, "none", { stroke: NV, sw: 8, name: "Building" }),
      seg(505, 186, 505, 240, NV, 8, { name: "Antenna" }),
      ...[0, 1, 2].map((i) => R(360, 380 + i * 55, 50, 6, GL, { name: "Window" })),
      ...[0, 1, 2, 3].map((i) => R(480, 285 + i * 62, 50, 6, GL, { name: "Window" })),
      ...[0, 1].map((i) => R(595, 430 + i * 55, 50, 6, GL, { name: "Window" })),
      seg(250, 594, 750, 594, NV, 8, { name: "Ground line" }),
      T("SKYLINE", 111, 640, 800, { size: 96, family: "serif", color: NV, align: "center", ls: 22 }),
      T("ESTATES & HOMES", 106, 772, 800, { size: 30, bold: true, color: GL, align: "center", ls: 12 }),
    ])];
  });

  // 4. Abstract mark: three see-through circles with an orbit ring.
  tpl("orbit-tech-logo-lc2", "Abstract orbit tech logo", "logo", LOGO + "tech technology startup software cloud app abstract circles", () => {
    const cx = 500, cy = 360, rx = 270, ry = 78, rot = -16;
    const a = (-38 * Math.PI) / 180, r = (rot * Math.PI) / 180;
    const px = rx * Math.cos(a), py = ry * Math.sin(a);
    const dx = cx + px * Math.cos(r) - py * Math.sin(r), dy = cy + px * Math.sin(r) + py * Math.cos(r);
    return [page("none", [
      C(330, 190, 230, 230, IND, { op: 0.9, name: "Circle" }),
      C(440, 190, 230, 230, TEA, { op: 0.85, name: "Circle" }),
      C(385, 285, 230, 230, COR, { op: 0.85, name: "Circle" }),
      C(cx - rx, cy - ry, rx * 2, ry * 2, "none", { stroke: INK, sw: 7, rot, name: "Orbit" }),
      C(dx - 20, dy - 20, 40, 40, INK, { name: "Satellite" }),
      T("orbitly", 100, 590, 800, { size: 150, bold: true, color: INK, align: "center" }),
      T("CLOUD PLATFORM", 107, 790, 800, { size: 32, bold: true, color: MUTED, align: "center", ls: 14 }),
    ])];
  });

  // 5. Lettermark: two serif initials split by a rule inside a double diamond.
  tpl("law-diamond-monogram-lc2", "Law firm diamond monogram", "logo", LOGO + "law firm lawyer attorney legal monogram initials diamond", () => {
    const BG = "#0f1d3a", GD = "#c9a227", cy = 380;
    return [page(BG, [
      R(325, cy - 175, 350, 350, "none", { stroke: GD, sw: 6, rot: 45, name: "Diamond" }),
      R(355, cy - 145, 290, 290, "none", { stroke: GD, sw: 2, rot: 45, name: "Inner diamond" }),
      T("R", 322, cy - 72, 155, { size: 120, family: "serif", color: GD, align: "right" }),
      R(498, cy - 52, 4, 104, GD, { name: "Rule" }),
      T("W", 520, cy - 72, 160, { size: 120, family: "serif", color: GD }),
      T("REYES & WARD", 83, 690, 840, { size: 66, family: "serif", color: "#f5efe0", align: "center", ls: 6 }),
      R(420, 790, 160, 3, GD, { name: "Line" }),
      T("ATTORNEYS AT LAW", 86, 815, 840, { size: 30, bold: true, color: GD, align: "center", ls: 12 }),
    ])];
  });

  // 6. Wordmark: big spaced serif name with a small crescent moon.
  tpl("luna-beauty-wordmark-lc2", "Beauty lounge wordmark", "logo", LOGO + "beauty salon spa skin hair nails wordmark elegant moon", () => {
    const BG = "#fdf2f4", PL = "#4a1d3f", RG = "#c27c6b";
    return [page(BG, [
      C(450, 236, 120, 120, RG, { name: "Moon" }),
      C(478, 220, 112, 112, BG, { name: "Moon cut" }),
      E("deco-sparkle", 584, 244, 46, { c1: RG }),
      T("LUNA", 115, 380, 800, { size: 210, family: "serif", color: PL, align: "center", ls: 30 }),
      R(420, 652, 160, 3, RG, { name: "Line" }),
      T("BEAUTY LOUNGE", 108, 676, 800, { size: 40, bold: true, color: "#a35d4f", align: "center", ls: 16 }),
      T("SKIN · HAIR · NAILS", 104, 744, 800, { size: 26, color: PL, align: "center", ls: 8, op: 0.75 }),
    ])];
  });

  // 7. Geometric: camera aperture from a ring and six tangent blades.
  tpl("aperture-photo-logo-lc2", "Geometric aperture photography logo", "logo", LOGO + "photography photographer camera studio aperture lens geometric", () => {
    const AM = "#f59e0b", cx = 500, cy = 380, ro = 186, ri = 74;
    const V = Array.from({ length: 6 }, (_, i) => { const a = ((i * 60 - 90) * Math.PI) / 180; return [cx + ri * Math.cos(a), cy + ri * Math.sin(a)]; });
    const blades = V.map((p, i) => {
      const q = V[(i + 1) % 6], len = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / len, uy = (q[1] - p[1]) / len;
      const fx = p[0] - cx, fy = p[1] - cy, b = fx * ux + fy * uy, t = -b + Math.sqrt(b * b - (fx * fx + fy * fy - ro * ro));
      return seg(p[0], p[1], p[0] + ux * t, p[1] + uy * t, AM, 10, { name: "Blade" });
    });
    return [page("#18181b", [
      C(cx - 200, cy - 200, 400, 400, "none", { stroke: AM, sw: 18, name: "Lens ring" }),
      ...blades,
      T("FRAMEWORK", 107, 640, 800, { size: 84, bold: true, color: WHITE, align: "center", ls: 14 }),
      T("PHOTO STUDIO", 109, 752, 800, { size: 34, color: AM, align: "center", ls: 18 }),
    ])];
  });

  // 8. Combination mark: tower crane built from shapes over a hazard stripe band.
  tpl("crane-construction-logo-lc2", "Construction crane logo", "logo", LOGO + "construction builder contractor crane building hazard industrial", () => {
    const YL = "#facc15", DK = "#1c1917", o = -30;
    return [page(DK, [
      S("triangle", 290, 150 + o, 60, 80, YL, { name: "Crane top" }),
      seg(320, 156 + o, 716, 234 + o, YL, 6, { name: "Tie" }), seg(320, 156 + o, 226, 234 + o, YL, 6, { name: "Tie" }),
      R(220, 230 + o, 500, 26, YL, { name: "Jib" }),
      R(220, 256 + o, 72, 58, YL, { radius: 4, name: "Counterweight" }),
      R(300, 250 + o, 40, 372, YL, { name: "Tower" }),
      ...[0, 1, 2, 3, 4].map((i) => seg(306, 330 + o + i * 58, 334, 300 + o + i * 58, DK, 5, { name: "Lattice" })),
      R(344, 256 + o, 56, 46, YL, { radius: 6, name: "Cab" }),
      R(598, 256 + o, 44, 16, YL, { name: "Trolley" }),
      R(618, 272 + o, 4, 176, YL, { name: "Cable" }),
      R(598, 446 + o, 44, 36, YL, { radius: 6, name: "Hook block" }),
      seg(620, 482 + o, 562, 540 + o, YL, 4, { name: "Sling" }), seg(620, 482 + o, 678, 540 + o, YL, 4, { name: "Sling" }),
      R(540, 538 + o, 160, 30, YL, { name: "Steel beam" }),
      R(260, 620 + o, 120, 20, YL, { radius: 4, name: "Base" }),
      R(200, 668 + o, 600, 44, YL, { name: "Hazard band" }),
      ...Array.from({ length: 9 }, (_, i) => E("shape-parallelogram", 214 + i * 64, 668 + o, 40, { h: 44, c1: DK })),
      T("BUILDRIGHT", 100, 740 + o, 800, { size: 104, bold: true, color: WHITE, align: "center", ls: 2 }),
      T("CONSTRUCTION · SINCE 2005", 104, 872 + o, 800, { size: 30, bold: true, color: YL, align: "center", ls: 8 }),
    ])];
  });

  // 9. Mascot: smiling coffee cup character made of shapes.
  tpl("happy-cup-cafe-mascot-lc2", "Coffee cup mascot logo", "logo", LOGO + "cafe coffee shop mascot cute character cup kawaii", () => {
    const BR = "#6b3e26", ox = -22;
    return [page("#fff4e6", [
      C(190, 100, 620, 620, "#f8d9b0", { name: "Backdrop" }),
      ...[[440, 215], [500, 196], [560, 215]].map(([x, y]) => E("line-wavy", x + ox - 62, y - 23, 124, { h: 46, c1: BR, rot: 90, op: 0.75, name: "Steam" })),
      C(600 + ox, 352, 150, 170, "none", { stroke: BR, sw: 26, name: "Handle" }),
      R(330 + ox, 300, 320, 300, WHITE, { radius: 60, stroke: BR, sw: 12, name: "Cup" }),
      R(316 + ox, 288, 348, 44, BR, { radius: 22, name: "Rim" }),
      C(420 + ox, 398, 36, 46, BR, { name: "Eye" }), C(524 + ox, 398, 36, 46, BR, { name: "Eye" }),
      C(430 + ox, 406, 12, 12, WHITE, { name: "Eye shine" }), C(534 + ox, 406, 12, 12, WHITE, { name: "Eye shine" }),
      C(378 + ox, 462, 48, 28, "#f9a8b8", { name: "Cheek" }), C(554 + ox, 462, 48, 28, "#f9a8b8", { name: "Cheek" }),
      E("shape-half-circle", 455 + ox, 466, 70, { h: 38, c1: BR, rot: 180, name: "Smile" }),
      R(270 + ox, 596, 440, 34, BR, { radius: 17, name: "Saucer" }),
      T("Happy Bean", 80, 748, 840, { size: 112, family: "serif", bold: true, italic: true, color: BR, align: "center" }),
      T("COFFEE CO.", 88, 886, 840, { size: 34, bold: true, color: "#b45309", align: "center", ls: 16 }),
    ])];
  });

  // 10. Mascot: friendly puppy face with collar and tag (transparent page).
  tpl("puppy-pet-care-logo-lc2", "Puppy mascot pet care logo", "logo", LOGO + "pet care dog puppy grooming daycare vet mascot cute", () => {
    const TAN = "#d39b62", DB = "#7a4a26", CRM = "#f6e3c4", DK = "#2b1a10", PINE = "#0f766e";
    return [page("none", [
      C(262, 214, 130, 250, DB, { rot: 18, name: "Ear" }), C(608, 214, 130, 250, DB, { rot: -18, name: "Ear" }),
      C(330, 196, 340, 320, TAN, { name: "Head" }),
      C(512, 236, 120, 108, DB, { name: "Patch" }),
      C(418, 316, 42, 50, DK, { name: "Eye" }), C(540, 316, 42, 50, DK, { name: "Eye" }),
      C(428, 326, 13, 13, WHITE, { name: "Eye shine" }), C(550, 326, 13, 13, WHITE, { name: "Eye shine" }),
      C(405, 376, 190, 130, CRM, { name: "Muzzle" }),
      R(482, 462, 36, 58, "#f472b6", { radius: 18, name: "Tongue" }),
      seg(500, 428, 500, 466, DK, 6, { name: "Mouth" }),
      C(462, 384, 76, 54, DK, { name: "Nose" }),
      R(380, 512, 240, 32, TEA, { radius: 16, name: "Collar" }),
      C(480, 530, 40, 40, AMB, { name: "Tag" }),
      T("Pawsome Pals", 60, 616, 880, { size: 104, bold: true, color: PINE, align: "center" }),
      T("PET CARE · GROOMING · DAYCARE", 62, 758, 880, { size: 30, bold: true, color: "#b45309", align: "center", ls: 4 }),
    ])];
  });

  // 11. Horizontal combination mark: mortarboard icon, divider, serif name and tagline.
  tpl("scholar-cap-education-logo-lc2", "Graduation cap tutoring logo", "logo", LOGO + "education tutoring school academy test prep graduation cap teacher", () => {
    const NV = "#1e2a5a", AD = "#b45309", ox = -20, oy = 30;
    return [page("#eef2ff", [
      R(190 + ox, 440 + oy, 160, 92, NV, { radius: 18, name: "Cap base" }),
      S("polygon", 110 + ox, 360 + oy, 320, 130, NV, { sides: 4, name: "Mortarboard" }),
      C(258 + ox, 413 + oy, 24, 24, AMB, { name: "Button" }),
      seg(270 + ox, 425 + oy, 400 + ox, 452 + oy, AMB, 6, { name: "Tassel cord" }),
      R(397 + ox, 452 + oy, 6, 86, AMB, { name: "Tassel cord" }),
      R(388 + ox, 534 + oy, 24, 46, AMB, { radius: 8, name: "Tassel" }),
      R(470 + ox, 360 + oy, 4, 220, NV, { op: 0.18, name: "Divider" }),
      T("Scholarly", 510 + ox, 352 + oy, 470, { size: 108, family: "serif", bold: true, color: NV }),
      T("TUTORING & TEST PREP", 514 + ox, 492 + oy, 470, { size: 24, bold: true, color: AD, ls: 5 }),
      T("Grades 6–12 · online & in person", 514 + ox, 536 + oy, 470, { size: 24, color: MUTED }),
    ])];
  });

  // 12. Postage stamp badge: perforated edge, landscape art, postmark.
  tpl("postage-stamp-travel-logo-lc2", "Postage stamp travel logo", "logo", LOGO + "travel agency tours holiday trips postage stamp vintage mountains", () => {
    const BG = "#fff7ed", RU = "#9a3412", oy = 40;
    const perf = [];
    for (let x = 280; x <= 720; x += 40) perf.push(C(x - 14, 110 + oy - 14, 28, 28, BG, { name: "Perforation" }), C(x - 14, 710 + oy - 14, 28, 28, BG, { name: "Perforation" }));
    for (let y = 150; y <= 670; y += 40) perf.push(C(260 - 14, y + oy - 14, 28, 28, BG, { name: "Perforation" }), C(740 - 14, y + oy - 14, 28, 28, BG, { name: "Perforation" }));
    return [page(BG, [
      R(266, 118 + oy, 480, 600, "#000000", { op: 0.08, name: "Stamp shadow" }),
      R(260, 110 + oy, 480, 600, WHITE, { name: "Stamp" }),
      ...perf,
      R(300, 150 + oy, 400, 400, "#0e7490", { name: "Sky" }),
      C(560, 196 + oy, 84, 84, "#fbbf24", { name: "Sun" }),
      S("triangle", 300, 360 + oy, 240, 190, "#155e75", { name: "Mountain" }),
      S("triangle", 420, 300 + oy, 280, 250, "#164e63", { name: "Mountain" }),
      S("triangle", 532, 300 + oy, 56, 50, WHITE, { name: "Snow" }), S("triangle", 395, 360 + oy, 50, 40, WHITE, { name: "Snow" }),
      R(300, 522 + oy, 400, 28, "#0c4a6e", { name: "Lake" }),
      T("ROAMWELL", 283, 572 + oy, 440, { size: 62, bold: true, color: "#0e7490", align: "center", ls: 6 }),
      T("TRAVEL CO.", 285, 650 + oy, 440, { size: 26, bold: true, color: RU, align: "center", ls: 10 }),
      C(664, 50 + oy, 168, 168, "none", { stroke: RU, sw: 5, op: 0.8, name: "Postmark" }),
      C(684, 70 + oy, 128, 128, "none", { stroke: RU, sw: 2, op: 0.8, name: "Postmark inner" }),
      ...[0, 1, 2].map((i) => E("line-wavy", 812, 104 + oy + i * 28, 170, { h: 20, c1: RU, op: 0.8, name: "Postmark wave" })),
      T("JOURNEYS WORTH KEEPING", 104, 772 + oy, 800, { size: 32, bold: true, color: RU, align: "center", ls: 8 }),
    ])];
  });

  // 13. Geometric: equalizer bars in a disc, bold lowercase wordmark on navy.
  tpl("equalizer-music-logo-lc2", "Sound wave music label logo", "logo", LOGO + "music record label band studio podcast sound wave equalizer", () => {
    const hs = [70, 130, 200, 270, 310, 250, 180, 120, 80], bw = 24, gap = 14, x0 = 500 - (hs.length * bw + (hs.length - 1) * gap) / 2, cy = 330;
    const col = (i) => { const t = i / (hs.length - 1); return t < 0.5 ? mix("#a855f7", "#ec4899", t * 2) : mix("#ec4899", "#f59e0b", t * 2 - 1); };
    return [page("#0f172a", [
      C(300, 130, 400, 400, "#1e293b", { name: "Disc" }),
      ...hs.map((h, i) => R(x0 + i * (bw + gap), cy - h / 2, bw, h, col(i), { radius: 12, name: "Bar" })),
      T("echo", 100, 572, 800, { size: 170, bold: true, color: WHITE, align: "center" }),
      T("RECORDS", 112, 786, 800, { size: 38, bold: true, color: "#f472b6", align: "center", ls: 24 }),
    ])];
  });

  // 14. Combination mark: arch window with a bouquet, script-like serif name.
  tpl("fern-arch-florist-logo-lc2", "Florist arch logo", "logo", LOGO + "florist flowers floral design wedding bouquet boutique arch", () => {
    const SG = "#9caf88", DG = "#2f4f3a", BL = "#e8a3a3", oy = 35;
    return [page("#f3f1ea", [
      C(330, 130 + oy, 340, 340, SG, { name: "Arch top" }),
      R(330, 300 + oy, 340, 260, SG, { name: "Arch" }),
      E("deco-sprig", 340, 300 + oy, 190, { c1: "#4d7c5a", c2: DG, rot: -28 }),
      E("deco-sprig", 470, 300 + oy, 190, { c1: "#4d7c5a", c2: DG, rot: 28 }),
      E("deco-flower", 412, 226 + oy, 176, { c1: BL, c2: "#f6c177" }),
      E("deco-flower", 368, 382 + oy, 104, { c1: "#f4c4c4", c2: "#f6c177" }),
      E("deco-flower", 528, 382 + oy, 104, { c1: "#f4c4c4", c2: "#f6c177" }),
      R(300, 556 + oy, 400, 6, DG, { radius: 3, name: "Ground" }),
      T("Wild Fern", 80, 590 + oy, 840, { size: 124, family: "serif", italic: true, color: DG, align: "center" }),
      T("FLORAL DESIGN STUDIO", 86, 762 + oy, 840, { size: 30, bold: true, color: "#6b7f5a", align: "center", ls: 12 }),
    ])];
  });

  // 15. Abstract tile mark (rising bars) with a left-aligned stacked name.
  tpl("northbridge-consulting-logo-lc2", "Consulting growth mark logo", "logo", LOGO + "consulting business strategy finance advisor corporate growth", () => {
    const NV = "#0b2545", TL = "#13a89e", ox = -10;
    return [page(WHITE, [
      R(90 + ox, 370, 250, 250, NV, { radius: 44, name: "Tile" }),
      R(140 + ox, 535, 38, 45, WHITE, { radius: 6, name: "Bar" }),
      R(196 + ox, 495, 38, 85, WHITE, { radius: 6, name: "Bar" }),
      R(252 + ox, 455, 38, 125, WHITE, { radius: 6, name: "Bar" }),
      C(252 + ox, 405, 38, 38, TL, { name: "Dot" }),
      T("NORTHBRIDGE", 380 + ox, 412, 600, { size: 74, bold: true, color: NV, ls: 1 }),
      R(384 + ox, 510, 70, 6, TL, { name: "Line" }),
      T("STRATEGY PARTNERS", 382 + ox, 532, 600, { size: 30, bold: true, color: TL, ls: 10 }),
    ])];
  });

  /* ================= Photo collages ================= */
  const CT = "collage photos pictures album ";

  // 1. Before / after stacked top and bottom, arrow badge on the seam.
  tpl("before-after-stacked-lc2", "Before and after stacked collage", "collage-square", CT + "before after makeover transformation compare renovation", (W, H) => [collagePage(W, H, "two-stack", { gap: 0, bg: INK }, [
    R(0, H / 2 - 8, W, 16, WHITE, { name: "Divider" }),
    C(W / 2 - 70, H / 2 - 70, 140, 140, AMB, { stroke: WHITE, sw: 10, name: "Arrow badge" }),
    E("arrow-down", W / 2 - 22, H / 2 - 44, 44, { c1: WHITE }),
    pill("BEFORE", 40, H / 2 - 116, 230, 38, WHITE, INK, { ls: 6 }),
    pill("AFTER", 40, H - 92, 210, 38, INK, AMB, { ls: 6 }),
    pill("Living room makeover", W - 410, 40, 370, 28, WHITE, "#111827", { bg: { color: "#111827", opacity: 0.65, pad: 0.45, radius: 0.5 } }),
    pill("6 weeks later", W - 280, H / 2 + 40, 240, 28, WHITE, "#111827", { bg: { color: "#111827", opacity: 0.65, pad: 0.45, radius: 0.5 } }),
  ])]);

  // 2. Two tall halves with a heart badge and names banner.
  tpl("couple-split-heart-lc2", "Couple split heart collage", "collage-square", CT + "couple love anniversary valentine wedding heart two photos", (W, H) => [collagePage(W, H, "two", { gap: 24, radius: 28, bg: "#fff1f2" }, [
    pill("Together since 2024", W / 2 - 200, 60, 400, 28, WHITE, ROS),
    C(W / 2 - 90, H / 2 - 90, 180, 180, WHITE, { stroke: "#fff1f2", sw: 12, name: "Heart badge" }),
    E("icon-heart", W / 2 - 55, H / 2 - 55, 110, { c1: ROS }),
    T("Sara & Adam", W / 2 - 250, H - 180, 500, { size: 60, family: "serif", bold: true, italic: true, color: "#9f1239", align: "center", bg: { color: WHITE, pad: 0.3, radius: 0.5 } }),
  ])]);

  // 3. Six step cells with numbered badges and a recipe title on the middle seam.
  tpl("recipe-steps-six-lc2", "Recipe step by step collage", "collage-landscape", CT + "recipe cooking baking steps how to food tutorial six", (W, H) => {
    const g = 16, cells = cellRects([[0, 0, 1 / 3, 0.5], [1 / 3, 0, 2 / 3, 0.5], [2 / 3, 0, 1, 0.5], [0, 0.5, 1 / 3, 1], [1 / 3, 0.5, 2 / 3, 1], [2 / 3, 0.5, 1, 1]], W, H, g);
    const steps = [["Gather", 140], ["Mix", 100], ["Knead", 134], ["Rest", 112], ["Bake", 118], ["Enjoy!", 134]];
    return [collagePage(W, H, "six", { gap: g, radius: 18, bg: "#fff7ed" }, [
      ...cells.flatMap((c, i) => [
        C(c.x + 18, c.y + 18, 64, 64, COR, { stroke: WHITE, sw: 4, name: "Step badge" }),
        T(String(i + 1), c.x + 18, c.y + 30, 64, { size: 34, bold: true, color: WHITE, align: "center" }),
        pill(steps[i][0], c.x + 94, c.y + 26, steps[i][1], 26, INK, WHITE),
      ]),
      pill("Homemade bread", W / 2 - 190, H / 2 - 52, 380, 34, WHITE, COR),
    ])];
  });

  // 4. Four seasons: seamless quarters, white cross, centre disc and season tags.
  tpl("four-seasons-grid-lc2", "Four seasons photo grid", "collage-square", CT + "four seasons spring summer autumn winter year grid", (W, H) => [collagePage(W, H, "four", { gap: 0, bg: WHITE }, [
    R(W / 2 - 4, 0, 8, H, WHITE, { name: "Cross" }), R(0, H / 2 - 4, W, 8, WHITE, { name: "Cross" }),
    C(W / 2 - 160, H / 2 - 160, 320, 320, WHITE, { name: "Centre disc" }),
    T("FOUR\nSEASONS", W / 2 - 140, 466, 280, { size: 50, bold: true, color: INK, align: "center", lh: 1.05, ls: 2 }),
    T("2026", W / 2 - 100, 580, 200, { size: 26, bold: true, color: MUTED, align: "center", ls: 10 }),
    pill("SPRING", 40, 40, 200, 30, "#14532d", "#bbf7d0", { ls: 4 }),
    pill("SUMMER", W - 240, 40, 200, 30, "#78350f", "#fde68a", { ls: 4 }),
    pill("AUTUMN", 40, H - 94, 200, 30, "#7c2d12", "#fed7aa", { ls: 4 }),
    pill("WINTER", W - 240, H - 94, 200, 30, "#1e3a8a", "#dbeafe", { ls: 4 }),
  ])]);

  // 5. Shop the look: mosaic with a headline in the big cell and numbered item tags.
  tpl("shop-the-look-mosaic-lc2", "Shop the look mosaic", "collage-landscape", CT + "shop the look fashion outfit product lookbook store mosaic", (W, H) => {
    const g = 12, cells = cellRects([[0, 0, 0.62, 0.62], [0.62, 0, 1, 0.31], [0.62, 0.31, 1, 0.62], [0, 0.62, 0.38, 1], [0.38, 0.62, 1, 1]], W, H, g);
    const items = [["01  Linen shirt", 230], ["02  Straw hat", 210], ["03  Sunglasses", 220], ["04  Canvas tote", 236], ["05  Leather sandals", 280]];
    return [collagePage(W, H, "mosaic", { gap: g, bg: "#111827" }, [
      T("SHOP\nTHE LOOK", 44, 40, 420, { size: 76, bold: true, color: WHITE, lh: 1, shadow: SHADOW }),
      pill("Summer edit 2026", 44, 204, 280, 26, INK, AMB),
      ...cells.map((c, i) => pill(items[i][0], c.x + c.w - items[i][1] - 18, c.y + c.h - 60, items[i][1], 22, INK, WHITE)),
    ])];
  });

  // 6. Vision board: pinned photos in three columns with goal captions and a quote card.
  tpl("vision-board-captions-lc2", "Vision board with captions", "collage-square", CT + "vision board mood board goals dreams new year plan inspiration", (W, H) => {
    const pin = (x, w, y, c) => C(x + w / 2 - 12, y - 12, 24, 24, c, { name: "Pin" });
    const cap = (text, x, y, w, fill) => pill(text, x, y, w, 26, INK, fill);
    return [page("#f4efe6", [
      T("MY 2027 VISION BOARD", 60, 50, 960, { size: 54, bold: true, color: INK, align: "center", ls: 6 }),
      F(60, 160, 300, 380, { name: "Travel photo" }), pin(60, 300, 160, ROS),
      cap("Travel more", 60, 554, 220, "#fde68a"),
      F(60, 640, 300, 280, { name: "Business photo" }), pin(60, 300, 640, TEA),
      cap("Grow my business", 60, 934, 280, "#bfdbfe"),
      R(390, 160, 300, 240, INK, { name: "Quote card" }), pin(390, 300, 160, AMB),
      T("Dream big.\nStart small.\nKeep going.", 410, 210, 260, { size: 38, family: "serif", italic: true, color: WHITE, align: "center", lh: 1.2 }),
      F(390, 430, 300, 420, { name: "Health photo" }), pin(390, 300, 430, IND),
      cap("Healthy & strong", 390, 864, 270, "#bbf7d0"),
      T("one day at a time", 390, 940, 300, { size: 30, family: "serif", italic: true, color: MUTED, align: "center" }),
      F(720, 160, 300, 300, { name: "Books photo" }), pin(720, 300, 160, COR),
      cap("Read 24 books", 720, 474, 240, "#fbcfe8"),
      F(720, 560, 300, 360, { name: "Home photo" }), pin(720, 300, 560, ROS),
      cap("Home sweet home", 720, 934, 270, "#fed7aa"),
    ])];
  });

  // 7. Kraft scrapbook: tilted matted photos, washi tape, a note card and doodles.
  tpl("kraft-scrapbook-tape-lc2", "Kraft scrapbook collage with tape", "collage-square", CT + "scrapbook journal tape kraft memories lake trip summer handmade", () => {
    const note = { family: "serif", italic: true, color: "#3f2d1c" };
    return [page("#c8a97e", [
      ...tilt([R(70, 90, 540, 440, WHITE, { name: "Photo mat" }), F(90, 110, 500, 360, { name: "Photo 1" }), T("lake day", 90, 476, 500, { size: 36, ...note, align: "center" })], 340, 310, -4),
      R(250, 64, 180, 50, "#fef08a", { op: 0.8, rot: -10, name: "Tape" }),
      ...tilt([R(640, 80, 380, 460, WHITE, { name: "Photo mat" }), F(660, 100, 340, 360, { name: "Photo 2" }), T("sunset swim", 660, 476, 340, { size: 32, ...note, align: "center" })], 830, 310, 5),
      R(604, 64, 120, 40, "#bae6fd", { op: 0.85, rot: -38, name: "Tape" }), R(944, 508, 120, 40, "#bae6fd", { op: 0.85, rot: -38, name: "Tape" }),
      ...tilt([
        R(80, 610, 400, 370, "#fffdf3", { name: "Note card" }),
        R(110, 674, 340, 2, "#fca5a5", { name: "Note line" }),
        T("JUNE 2026", 110, 632, 340, { size: 24, family: "mono", bold: true, color: "#9a3412", ls: 2 }),
        T("The whole gang at the lake. Cold water, warm chai and far too many photos!", 110, 696, 340, { size: 30, ...note, lh: 1.35 }),
      ], 280, 795, 2),
      R(212, 590, 130, 44, "#fbcfe8", { op: 0.85, rot: 4, name: "Tape" }),
      ...tilt([R(530, 610, 470, 400, WHITE, { name: "Photo mat" }), F(550, 630, 430, 300, { name: "Photo 3" }), T("we'll be back!", 550, 940, 430, { size: 32, ...note, align: "center" })], 765, 810, -3),
      R(700, 588, 140, 44, "#fef08a", { op: 0.8, rot: 5, name: "Tape" }),
      E("deco-hearts", 474, 536, 64, { c1: ROS, c2: COR }),
      E("deco-stars", 20, 990, 70, { c1: AMB, c2: "#7c2d12" }),
    ])];
  });

  // 8. Heart outline made of circle photos with a message inside.
  tpl("heart-of-circles-lc2", "Heart of circle photos", "collage-square", CT + "heart love anniversary valentine circles romantic shape", () => {
    const d = 116, s = 27, cx = 540, cy = 472, N0 = 900;
    const pts = Array.from({ length: N0 + 1 }, (_, i) => {
      const t = (i / N0) * 2 * Math.PI;
      return [cx + 16 * Math.sin(t) ** 3 * s, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s];
    });
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const n = Math.floor(L[N0] / (d + 18));
    const at = [];
    for (let k = 0, j = 0; k < n; k++) { const target = (k / n) * L[N0]; while (L[j + 1] < target) j++; at.push(pts[j]); }
    return [page("#fff1f2", [
      ...at.map(([x, y], i) => F(x - d / 2, y - d / 2, d, d, { shape: "circle", name: "Photo " + (i + 1), border: { width: 5, color: WHITE } })),
      T("Happy\nAnniversary", 290, 420, 500, { size: 70, family: "serif", bold: true, italic: true, color: "#9f1239", align: "center", lh: 1.1 }),
      T("10 YEARS OF US", 340, 600, 400, { size: 28, bold: true, color: ROS, align: "center", ls: 6 }),
      E("icon-heart", cx - 22, 650, 44, { c1: ROS }),
    ])];
  });

  // 9. Graduation ring: big centre circle wrapped by twelve small circles, text panel on the right.
  tpl("graduation-photo-wreath-lc2", "Graduation photo ring", "collage-landscape", CT + "graduation graduate class of 2026 school college congratulations ring circles", () => {
    const GD = "#e3b341", cx = 400, cy = 400, ring = 286, d = 104;
    return [page("#0f1e3d", [
      C(cx - ring, cy - ring, ring * 2, ring * 2, "none", { stroke: GD, sw: 2, op: 0.5, name: "Ring line" }),
      F(cx - 175, cy - 175, 350, 350, { shape: "circle", name: "Main photo", border: { width: 8, color: GD } }),
      ...Array.from({ length: 12 }, (_, i) => { const a = ((i * 30 - 90) * Math.PI) / 180; return F(cx + ring * Math.cos(a) - d / 2, cy + ring * Math.sin(a) - d / 2, d, d, { shape: "circle", name: "Photo " + (i + 2), border: { width: 4, color: WHITE } }); }),
      E("deco-sparkles", 1060, 60, 90, { c1: GOLD, c2: GD }),
      T("CLASS OF", 800, 210, 360, { size: 40, bold: true, color: GD, ls: 12 }),
      T("2026", 796, 262, 360, { size: 150, bold: true, color: WHITE, lh: 1 }),
      R(804, 440, 120, 6, GD, { name: "Line" }),
      T("Congratulations,\nAyesha!", 800, 470, 370, { size: 46, family: "serif", italic: true, color: GOLD, lh: 1.2 }),
      T("We are so proud of you.", 800, 600, 370, { size: 26, color: "#cbd5e1" }),
    ])];
  });

  // 10. Open photo book: two pages, gutter shadow, story text and page numbers.
  tpl("photo-book-spread-lc2", "Open photo book spread", "collage-landscape", CT + "photo book album spread story travel memories pages", () => {
    const PG = "#fffdf7";
    return [page("#3d3a36", [
      R(48, 52, 1120, 720, "#000000", { op: 0.3, radius: 8, name: "Book shadow" }),
      R(40, 40, 560, 720, PG, { name: "Left page" }), R(600, 40, 560, 720, PG, { name: "Right page" }),
      R(585, 40, 30, 720, "#ece6d8", { name: "Gutter" }), R(599, 40, 2, 720, "#d8d0bf", { name: "Fold" }),
      F(80, 80, 480, 400, { name: "Big photo" }),
      T("CHAPTER THREE", 80, 506, 480, { size: 20, bold: true, color: "#a16207", ls: 6 }),
      T("Summer by the sea", 80, 538, 480, { size: 46, family: "serif", bold: true, color: INK }),
      T("Long days, salty hair and sunsets we never wanted to end.", 80, 606, 460, { size: 22, color: MUTED, lh: 1.5 }),
      T("24", 80, 712, 60, { size: 18, color: MUTED }),
      F(640, 80, 480, 300, { name: "Wide photo" }),
      F(640, 400, 230, 230, { name: "Photo" }), F(890, 400, 230, 230, { name: "Photo" }),
      T("Morning swims and beach picnics.", 640, 652, 480, { size: 24, family: "serif", italic: true, color: INK }),
      T("25", 1060, 712, 60, { size: 18, color: MUTED, align: "right" }),
    ])];
  });

  // 11. Polaroid pile: four tilted instant photos with shadows, caption on the top one.
  tpl("polaroid-stack-pile-lc2", "Polaroid stack collage", "collage-square", CT + "polaroid instant photos stack pile memories road trip vintage", () => {
    const pol = (cx, cy, deg, i, caption) => tilt([
      R(cx - 212, cy - 248, 440, 520, "#000000", { op: 0.25, name: "Shadow" }),
      R(cx - 220, cy - 260, 440, 520, WHITE, { name: "Polaroid" }),
      F(cx - 195, cy - 235, 390, 390, { name: "Photo " + i }),
      caption ? T(caption, cx - 195, cy + 176, 390, { size: 40, family: "serif", italic: true, color: INK, align: "center" }) : null,
    ].filter(Boolean), cx, cy, deg);
    return [page("#2f3e46", [
      T("our little adventures", 60, 50, 960, { size: 54, family: "serif", italic: true, color: "#f1f5f9", align: "center" }),
      ...pol(500, 560, -12, 1), ...pol(590, 540, 9, 2), ...pol(520, 580, -4, 3), ...pol(556, 548, 3, 4, "Road trip, 2026"),
      T("SUMMER · 2026", 60, 970, 960, { size: 28, bold: true, color: "#cbd5e1", align: "center", ls: 12 }),
    ])];
  });

  // 12. Family tree: three generations of circle photos joined by branch lines, names underneath.
  tpl("family-tree-photos-lc2", "Family tree photo collage", "collage-landscape", CT + "family tree generations grandparents parents kids heritage ancestry", () => {
    const BR = "#8b6f47", ox = 20, oy = 4;
    const node = (cx, cy, d, name, lw = 140) => [
      F(cx - d / 2 + ox, cy - d / 2 + oy, d, d, { shape: "circle", name, border: { width: 5, color: WHITE } }),
      T(name, cx - lw / 2 + ox, cy + d / 2 + 8 + oy, lw, { size: 24, bold: true, color: "#3f3a2a", align: "center" }),
    ];
    const ln = (x1, y1, x2, y2) => seg(x1 + ox, y1 + oy, x2 + ox, y2 + oy, BR, 4, { name: "Branch" });
    return [page("#f7f3ea", [
      E("deco-sprig", 312 + ox, 22, 72, { c1: "#65a30d", c2: "#3f6212", rot: -35 }),
      E("deco-sprig", 816 + ox, 22, 72, { c1: "#65a30d", c2: "#3f6212", rot: 35 }),
      T("Our Family Tree", 400 + ox, 30, 400, { size: 54, family: "serif", bold: true, color: "#3f5a2a", align: "center" }),
      ln(570, 200, 630, 200), ln(600, 200, 600, 330), ln(290, 330, 750, 330), ln(290, 330, 290, 375), ln(750, 330, 750, 375),
      ln(355, 440, 385, 440), ln(815, 440, 845, 440), ln(370, 440, 370, 580), ln(830, 440, 830, 580),
      ln(210, 580, 530, 580), ln(760, 580, 900, 580),
      ...[210, 370, 530, 760, 900].map((x) => ln(x, 580, x, 604)),
      E("icon-heart", 586 + ox, 186 + oy, 28, { c1: ROS }),
      ...node(510, 200, 140, "Grandpa"), ...node(690, 200, 140, "Grandma"),
      ...node(290, 440, 130, "Dad"), ...node(450, 440, 130, "Mum"), ...node(750, 440, 130, "Aunt"), ...node(910, 440, 130, "Uncle"),
      ...node(210, 660, 112, "Zara", 130), ...node(370, 660, 112, "Me", 130), ...node(530, 660, 112, "Omar", 130), ...node(760, 660, 112, "Lina", 130), ...node(900, 660, 112, "Sami", 130),
    ])];
  });

  // 13. Year in review: title column and a 4 × 3 month grid with month tags.
  tpl("year-review-months-lc2", "Year in review twelve months", "collage-landscape", CT + "year in review recap twelve months highlights 2026 calendar", () => {
    const x0 = 330, y0 = 40, gw = 830, gh = 720, g = 14, cw = (gw - 3 * g) / 4, ch = (gh - 2 * g) / 3;
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return [page("#111827", [
      T("2026", 40, 60, 270, { size: 112, bold: true, color: WHITE, lh: 1 }),
      T("YEAR IN\nREVIEW", 44, 190, 260, { size: 44, bold: true, color: AMB, lh: 1.05, ls: 4 }),
      R(44, 305, 80, 6, AMB, { name: "Line" }),
      T("Twelve months, twelve favourite moments.", 44, 330, 240, { size: 24, color: "#cbd5e1", lh: 1.4 }),
      E("deco-sparkles", 44, 620, 110, { c1: AMB, c2: GOLD }),
      ...months.flatMap((m, i) => {
        const x = x0 + (i % 4) * (cw + g), y = y0 + Math.floor(i / 4) * (ch + g);
        return [F(x, y, cw, ch, { shape: "rounded", radius: 12, name: m + " photo" }), pill(m, x + 12, y + 12, 76, 18, INK, WHITE, { ls: 2 })];
      }),
    ])];
  });

  // 14. Travel map: land shapes, dashed route between pins, photo cards for each stop.
  tpl("travel-map-route-lc2", "Travel map route collage", "collage-landscape", CT + "travel map road trip route journey vacation stops pins adventure", () => {
    const SEA = "#0f3d56", PIN = ROS;
    const stops = [[300, 300], [470, 560], [720, 310], [1010, 470]];
    const card = (x, y, name) => F(x, y, 230, 150, { shape: "rounded", radius: 14, name, border: { width: 6, color: WHITE } });
    const label = (t, x, y) => T(t, x, y, 230, { size: 22, bold: true, color: SEA, align: "center" });
    return [page("#cfe6f0", [
      E("shape-blob", 40, 150, 640, { h: 600, c1: "#f1e7cf" }),
      E("shape-blob-2", 520, 30, 660, { h: 720, c1: "#efe2c2" }),
      ...stops.slice(1).map((p, i) => eseg("line-dashed", stops[i][0], stops[i][1], p[0], p[1], 18, { c1: PIN })),
      ...stops.map(([x, y]) => E("icon-location", x - 28, y - 60, 56, { c1: PIN })),
      T("Our Road Trip", 50, 40, 460, { size: 56, family: "serif", bold: true, color: SEA }),
      T("7 days · 4 stops · 1,200 km", 52, 112, 460, { size: 24, bold: true, color: "#3b7a99" }),
      card(50, 280, "Stop 1 photo"), label("Day 1 · The coast", 50, 440),
      card(355, 596, "Stop 2 photo"), label("Day 3 · Wine valley", 355, 756),
      label("Day 4 · Old town", 605, 40), card(605, 74, "Stop 3 photo"),
      card(895, 506, "Stop 4 photo"), label("Day 7 · The lakes", 895, 666),
      C(70, 640, 100, 100, "none", { stroke: SEA, sw: 3, name: "Compass" }),
      S("star", 85, 655, 70, 70, SEA, { points: 4, name: "Compass star" }),
      T("N", 70, 606, 100, { size: 22, bold: true, color: SEA, align: "center" }),
    ])];
  });

  // 15. Photo booth: three tilted four-shot strips and a party title.
  tpl("photo-booth-strips-lc2", "Photo booth strips collage", "collage-landscape", CT + "photo booth strip party birthday friends fun four shots", () => {
    const strip = (sx, deg, caption, n) => tilt([
      R(sx, 40, 230, 720, WHITE, { name: "Strip" }),
      ...[0, 1, 2, 3].map((k) => F(sx + 17, 58 + k * 152, 196, 140, { name: `Shot ${n * 4 + k + 1}` })),
      T(caption, sx + 15, 674, 200, { size: 22, family: "mono", bold: true, color: INK, align: "center" }),
    ], sx + 115, 400, deg);
    return [page("#1e1b4b", [
      ...strip(40, -4, "STRIKE A POSE", 0), ...strip(326, 3, "BEST FRIENDS", 1), ...strip(612, -2, "14.06.2026", 2),
      E("deco-confetti", 1040, 50, 120, { c1: "#f472b6", c2: AMB }),
      T("Say\ncheese!", 880, 200, 290, { size: 84, family: "serif", bold: true, italic: true, color: WHITE, lh: 1.05 }),
      R(884, 400, 90, 6, "#f472b6", { name: "Line" }),
      T("Mia's 30th birthday", 880, 428, 290, { size: 30, bold: true, color: "#fbcfe8" }),
      T("Saturday, 14 June", 880, 474, 290, { size: 24, color: "#c7d2fe" }),
      E("deco-stars", 920, 610, 110, { c1: AMB, c2: "#f472b6" }),
    ])];
  });
}
