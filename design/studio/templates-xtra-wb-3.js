// Extra base layouts from the whiteboard helper (ROUND 2). Pure module, no imports; templates.js calls add(k).
// 45 own small-format layouts (ids end in "-wb"): 15 logos, 15 stickers (round, square and rectangle) and
// 15 labels (2 x 1 product labels and 2 in round labels). Emblems and wordmarks in 15 different compositions.
export default function add(k) {
  const { tpl, T, S, R, C, E, page } = k;
  const { WHITE } = k.K;

  function kit(W, H, ref = 1000) {
    const u = W / ref, h = H / u;
    const sc = (o = {}) => { const r = { ...o }; for (const key of ["size", "sw", "radius", "ls"]) if (r[key]) r[key] *= u; if (r.outline) r.outline = { ...r.outline, width: r.outline.width * u }; return r; };
    const t = (s, x, y, w, o = {}) => (s ? T(s, x * u, y * u, w * u, sc(o)) : null);
    return {
      u, w: ref, h, t,
      tm: (s, x, y, w, bh, o = {}) => { const l = t(s, x, y, w, o); if (l) l.y = (y + bh / 2) * u - l.h / 2; return l; },
      r: (x, y, w, hh, fill, o = {}) => R(x * u, y * u, w * u, hh * u, fill, sc(o)),
      c: (x, y, w, hh, fill, o = {}) => C(x * u, y * u, w * u, hh * u, fill, sc(o)),
      s: (kind, x, y, w, hh, fill, o = {}) => S(kind, x * u, y * u, w * u, hh * u, fill, sc(o)),
      e: (id, x, y, w, o = {}) => E(id, x * u, y * u, w * u, o.h ? { ...o, h: o.h * u } : o),
    };
  }

  /* ---------- square emblems (1000 x 1000) ---------- */
  const EM = [
    // 0 ring badge
    (q, c) => { const { t, c: cc, e, tm } = q, P = c.p; return [cc(40, 40, 920, 920, P.a, { name: "Badge" }), cc(90, 90, 820, 820, "none", { stroke: P.b, sw: 10, name: "Ring" }),
      t(c.small, 200, 200, 600, { size: 54, bold: true, color: P.b, align: "center", ls: 10 }), tm(c.a, 160, 330, 680, 300, { size: 140, bold: true, color: WHITE, align: "center", lh: 0.95 }),
      e("shape-star", 330, 690, 80, { c1: P.b }), e("shape-star", 460, 690, 80, { c1: P.b }), e("shape-star", 590, 690, 80, { c1: P.b })]; },
    // 1 shield
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("shape-shield", 170, 60, 660, { h: 860, c1: P.a }), tm(c.a, 230, 260, 540, 300, { size: 90, bold: true, color: WHITE, align: "center", lh: 0.95 }), t(c.small, 250, 600, 500, { size: 50, color: P.b, align: "center", ls: 8, bold: true })]; },
    // 2 monogram
    (q, c) => { const { t, c: cc, tm } = q, P = c.p; return [cc(150, 100, 700, 700, "none", { stroke: P.a, sw: 16 }), tm(c.mono, 200, 150, 600, 600, { size: 300, family: "serif", color: P.a, align: "center" }), t(c.a, 100, 830, 800, { size: 64, bold: true, color: P.a, align: "center", ls: 14 })]; },
    // 3 wordmark + swoosh
    (q, c) => { const { t, e, tm } = q, P = c.p; return [tm(c.a, 60, 260, 880, 300, { size: 180, family: "serif", italic: true, bold: true, color: P.a, align: "center" }), e("line-swoosh", 220, 560, 560, { c1: P.b }), t(c.small, 100, 700, 800, { size: 48, color: P.a, align: "center", ls: 16 })]; },
    // 4 icon over wordmark
    (q, c) => { const { t, c: cc, e } = q, P = c.p; return [cc(350, 120, 300, 300, P.b), e(c.icon || "icon-leaf", 410, 180, 180, { c1: WHITE }), t(c.a, 60, 480, 880, { size: 120, bold: true, color: P.a, align: "center", lh: 1 }), t(c.small, 100, 660, 800, { size: 46, color: P.b, align: "center", ls: 12 })]; },
    // 5 hexagon
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("shape-hexagon", 120, 90, 760, { h: 820, c1: P.a }), tm(c.a, 200, 310, 600, 260, { size: 120, bold: true, color: WHITE, align: "center", lh: 0.95 }), t(c.small, 220, 600, 560, { size: 46, color: P.b, align: "center", ls: 8, bold: true })]; },
    // 6 ribbon across circle
    (q, c) => { const { t, c: cc, r, s, tm } = q, P = c.p; return [cc(140, 100, 720, 720, P.a), s("triangle", 40, 420, 140, 140, P.b, { rot: -90 }), s("triangle", 820, 420, 140, 140, P.b, { rot: 90 }), r(100, 400, 800, 180, P.b, { name: "Ribbon" }),
      tm(c.a, 120, 400, 760, 180, { size: 96, bold: true, color: WHITE, align: "center" }), t(c.small, 240, 200, 520, { size: 52, color: WHITE, align: "center", ls: 8, bold: true }), t(c.b, 240, 640, 520, { size: 46, color: WHITE, align: "center", ls: 6 })]; },
    // 7 split circle
    (q, c) => { const { c: cc, e, tm } = q, P = c.p; return [cc(100, 100, 800, 800, P.a), e("shape-half-circle", 100, 500, 800, { h: 400, c1: P.b, rot: 180 }), cc(100, 100, 800, 800, "none", { stroke: P.a, sw: 14 }),
      tm(c.a, 150, 240, 700, 260, { size: 130, bold: true, color: WHITE, align: "center" }), tm(c.small, 150, 540, 700, 200, { size: 64, bold: true, color: P.a, align: "center", ls: 6 })]; },
    // 8 dotted stamp
    (q, c) => { const { t, c: cc, tm } = q, P = c.p; return [cc(80, 80, 840, 840, P.bg || WHITE, { stroke: P.a, sw: 22 }), ...Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return cc(500 + Math.cos(a) * 360 - 12, 500 + Math.sin(a) * 360 - 12, 24, 24, P.b); }),
      tm(c.a, 220, 330, 560, 260, { size: 92, bold: true, color: P.a, align: "center", lh: 0.95 }), t(c.small, 240, 620, 520, { size: 44, color: P.a, align: "center", ls: 6 })]; },
    // 9 seal
    // (a solid disc covers the seal's centre star so the words sit on one clean colour)
    (q, c) => { const { t, e, tm, c: cc } = q, P = c.p; return [e("badge-seal", 80, 80, 840, { h: 840, c1: P.a }), cc(215, 215, 570, 570, P.a, { name: "Seal centre", stroke: P.b, sw: 6 }), tm(c.a, 240, 300, 520, 260, { size: 96, bold: true, color: WHITE, align: "center", lh: 0.95 }), t(c.small, 260, 590, 480, { size: 40, color: P.b, align: "center", ls: 6, bold: true })]; },
    // 10 stacked bar wordmark
    (q, c) => { const { t, r } = q, P = c.p, a = t(c.a, 100, 250, 800, { size: 160, bold: true, color: P.a, align: "center", lh: 0.9 }), yb = 250 + a.h / q.u + 20; return [r(120, 220, 760, 12, P.b), a, r(120, yb, 760, 12, P.b), t(c.small, 100, yb + 36, 800, { size: 52, color: P.a, align: "center", ls: 20 })]; },
    // 11 organic leaf + serif
    (q, c) => { const { t, e } = q, P = c.p, a = t(c.a, 60, 400, 880, { size: 130, family: "serif", color: P.a, align: "center", lh: 1 }); return [e("deco-sprig", 360, 100, 280, { c1: P.b }), a, t(c.small, 100, 400 + a.h / q.u + 24, 800, { size: 44, family: "serif", italic: true, color: P.b, align: "center" })]; },
    // 12 tag
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("frame-tag", 90, 230, 820, { h: 540, c1: P.a }), tm(c.a, 220, 320, 640, 220, { size: 110, bold: true, color: P.a, align: "center" }), t(c.small, 240, 560, 600, { size: 46, color: P.b, align: "center", ls: 8, bold: true })]; },
    // 13 app icon initials
    (q, c) => { const { t, r, tm } = q, P = c.p; return [r(170, 120, 660, 660, P.a, { radius: 150, name: "Tile" }), tm(c.mono, 170, 120, 660, 660, { size: 330, bold: true, color: P.b, align: "center" }), t(c.a, 100, 820, 800, { size: 72, bold: true, color: P.a, align: "center" })]; },
    // 14 starburst
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("deco-burst", 60, 60, 880, { h: 880, c1: P.a }), tm(c.a, 220, 320, 560, 260, { size: 120, bold: true, color: P.b, align: "center", lh: 0.95 }), t(c.small, 240, 600, 520, { size: 46, color: P.b, align: "center", ls: 6, bold: true })]; },
  ];
  const LOGOS = [
    ["Bakery ring badge logo", "bakery bread cafe food", { small: "EST. 2026", a: "Sun\nBakery", p: { a: "#9a3412", b: "#fcd34d" } }],
    ["Sports club shield logo", "sports club team football", { a: "FALCONS", small: "FOOTBALL CLUB", p: { a: "#1e3a8a", b: "#fde047" } }],
    ["Monogram studio logo", "monogram initials studio fashion", { mono: "AK", a: "AK STUDIO", p: { a: "#111827" } }],
    ["Script boutique logo", "boutique script fashion shop", { a: "Bloom", small: "BOUTIQUE", p: { a: "#9d174d", b: "#f9a8d4" } }],
    ["Garden icon logo", "garden plants nature", { a: "Green Room", small: "PLANT SHOP", icon: "icon-leaf", p: { a: "#14532d", b: "#16a34a" } }],
    ["Hexagon tech logo", "tech software startup", { a: "HEXA", small: "LABS", p: { a: "#312e81", b: "#a5b4fc" } }],
    ["Ribbon diner logo", "diner restaurant ribbon retro", { a: "Route 9", small: "DINER", b: "BURGERS & SHAKES", p: { a: "#b91c1c", b: "#111827" } }],
    ["Split circle cafe logo", "cafe coffee split circle", { a: "BREW", small: "& BITE", p: { a: "#78350f", b: "#fde68a" } }],
    ["Dotted stamp craft logo", "craft handmade stamp", { a: "HAND\nMADE", small: "WITH CARE", p: { a: "#7c2d12", b: "#f59e0b" } }],
    ["Seal quality logo", "seal quality award", { a: "PRIME\nGOODS", small: "QUALITY", p: { a: "#0f766e", b: "#ccfbf1" } }],
    ["Bar wordmark logo", "wordmark minimal agency", { a: "NORTH", small: "AGENCY", p: { a: "#111827", b: "#f97316" } }],
    ["Botanical serif logo", "botanical spa beauty serif", { a: "Sage & Co", small: "natural skincare", p: { a: "#365314", b: "#65a30d" } }],
    ["Price tag shop logo", "shop tag market store", { a: "Corner Shop", small: "OPEN DAILY", p: { a: "#0c4a6e", b: "#0ea5e9" } }],
    ["App icon logo", "app icon initials digital", { mono: "Q", a: "Quickly", p: { a: "#7c3aed", b: "#ffffff" } }],
    ["Starburst kids logo", "kids toys fun starburst", { a: "Fun\nZone", small: "TOYS & GAMES", p: { a: "#facc15", b: "#7c2d12" } }],
  ];
  LOGOS.forEach(([title, tg, c], i) => tpl(title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-wb", title, "logo", tg + " logo brand mark", (W, H) => [page(WHITE, EM[i](kit(W, H), { a: "", b: "", small: "", mono: "", ...c }))]));

  // Stickers: round and square die-cut prints (transparent around the shape).
  const STICK = [
    [0, "sticker-round-3in", "Thank you round sticker", "thank you small business", { small: "SMALL SHOP", a: "Thank\nyou!", p: { a: "#db2777", b: "#fbcfe8" } }],
    [9, "sticker-round-3in", "Handmade seal sticker", "handmade seal craft", { a: "MADE\nWITH\nLOVE", small: "", p: { a: "#7c3aed", b: "#ddd6fe" } }],
    [14, "sticker-round-3in", "New burst sticker", "new launch burst sale", { a: "NEW!", small: "JUST IN", p: { a: "#facc15", b: "#b91c1c" } }],
    [8, "sticker-round-3in", "Organic stamp sticker", "organic stamp natural", { a: "100%\nORGANIC", small: "FARM FRESH", p: { a: "#166534", b: "#86efac", bg: "#f0fdf4" } }],
    [6, "sticker-round-3in", "Ribbon award sticker", "award winner ribbon", { a: "WINNER", small: "BEST IN SHOW", b: "2026", p: { a: "#1e3a8a", b: "#f59e0b" } }],
    [7, "sticker-round-3in", "Split circle sticker", "split circle fresh", { a: "FRESH", small: "DAILY", p: { a: "#0f766e", b: "#fde047" } }],
    [5, "sticker-square-3in", "Hexagon bee sticker", "bee hexagon honey nature", { a: "SAVE\nTHE BEES", small: "PLANT FLOWERS", p: { a: "#ca8a04", b: "#fef9c3" } }],
    [1, "sticker-square-3in", "Shield team sticker", "team shield sports", { a: "TEAM\nBLUE", small: "GO GO GO", p: { a: "#1d4ed8", b: "#bfdbfe" } }],
    [12, "sticker-square-3in", "Price tag sticker", "price tag sale", { a: "SALE", small: "20% OFF", p: { a: "#dc2626", b: "#111827" } }],
    [13, "sticker-square-3in", "App icon sticker", "app icon fun initials", { mono: "Hi", a: "say hello", p: { a: "#0ea5e9", b: "#ffffff" } }],
    [10, "sticker-square-3in", "Bar word sticker", "word bold minimal", { a: "STAY\nWILD", small: "OUTSIDE", p: { a: "#14532d", b: "#f97316" } }],
    [11, "sticker-square-3in", "Botanical sticker", "botanical plant leaf", { a: "Grow", small: "a little every day", p: { a: "#166534", b: "#4ade80" } }],
    [4, "sticker-square-3in", "Camera icon sticker", "camera photo icon", { a: "SNAP", small: "SAY CHEESE", icon: "icon-camera", p: { a: "#111827", b: "#f43f5e" } }],
    [3, "sticker-square-3in", "Script hello sticker", "hello script lettering", { a: "Hello", small: "FRIEND", p: { a: "#7c3aed", b: "#f472b6" } }],
    [2, "sticker-round-3in", "Monogram sticker", "monogram initials name", { mono: "S", a: "SARA", p: { a: "#9d174d" } }],
  ];
  STICK.forEach(([ai, preset, title, tg, c]) => tpl(title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-wb", title, preset, tg + " sticker die cut print", (W, H) => {
    const q = kit(W, H);
    const base = preset.includes("round") ? [] : [q.r(40, 40, 920, 920, c.p.bg || WHITE, { radius: 140, stroke: c.p.a, sw: 10, name: "Sticker" })];
    const disc = preset.includes("round") && ![0, 6, 7, 8, 9, 14].includes(ai) ? [q.c(20, 20, 960, 960, c.p.bg || WHITE, { stroke: c.p.a, sw: 10, name: "Sticker" })] : [];
    return [page("none", [...base, ...disc, ...EM[ai](q, { a: "", b: "", small: "", mono: "", ...c })])];
  }));

  /* ---------- product labels (2 x 1 in, 1000 x 500 reference) ---------- */
  const WL = [
    (q, c) => { const { t, r, tm } = q, P = c.p; return [r(0, 0, 360, 500, P.a), tm(c.a, 20, 0, 320, 500, { size: 70, bold: true, color: WHITE, align: "center", lh: 1 }), tm(c.b, 400, 60, 560, 220, { size: 54, bold: true, color: P.a }), t(c.small, 400, 300, 560, { size: 34, color: P.a, lh: 1.3 })]; },
    (q, c) => { const { t, r, tm } = q, P = c.p; return [r(30, 30, 940, 440, "none", { stroke: P.a, sw: 8, radius: 30 }), r(80, 140, 840, 4, P.b), r(80, 356, 840, 4, P.b), tm(c.a, 60, 150, 880, 200, { size: 96, family: "serif", color: P.a, align: "center" }), t(c.small, 60, 380, 880, { size: 34, color: P.a, align: "center", ls: 6 })]; },
    (q, c) => { const { t, c: cc, e, tm } = q, P = c.p; return [cc(40, 50, 400, 400, P.a), e(c.icon || "icon-leaf", 140, 150, 200, { c1: WHITE }), tm(c.a, 480, 60, 490, 240, { size: 76, bold: true, color: P.a, lh: 1 }), t(c.small, 480, 320, 490, { size: 32, color: P.b, bold: true, ls: 4 })]; },
    (q, c) => { const { t, r } = q, P = c.p; return [r(0, 0, 1000, 120, P.a), t(c.b, 40, 26, 920, { size: 56, bold: true, color: WHITE, align: "center", ls: 8 }), t(c.a, 40, 160, 920, { size: 84, bold: true, color: P.a, align: "center" }), t(c.small, 60, 330, 880, { size: 30, color: P.a, align: "center", lh: 1.3 })]; },
    (q, c) => { const { t, r, tm } = q, P = c.p; return [...Array.from({ length: 10 }, (_, i) => r(i * 100, 0, 100, 80, i % 2 ? P.b : P.a)), tm(c.a, 40, 100, 920, 260, { size: 100, bold: true, color: P.a, align: "center" }), t(c.small, 40, 380, 920, { size: 34, color: P.a, align: "center", ls: 6 })]; },
    (q, c) => { const { t, r, tm } = q, P = c.p; return [r(40, 90, 920, 320, P.a, { radius: 160 }), tm(c.a, 100, 90, 800, 220, { size: 90, bold: true, color: WHITE, align: "center" }), t(c.small, 100, 300, 800, { size: 34, color: P.b, align: "center", ls: 6, bold: true })]; },
    (q, c) => { const { t, tm } = q, P = c.p; return [tm(c.mono, 20, 0, 360, 500, { size: 330, family: "serif", bold: true, color: P.b }), tm(c.a, 380, 70, 590, 220, { size: 70, family: "serif", color: P.a, lh: 1 }), t(c.small, 380, 320, 590, { size: 32, color: P.a, ls: 4 })]; },
    (q, c) => { const { t, s, tm } = q, P = c.p; return [s("triangle", 0, 0, 1000, 500, P.b, { name: "Diagonal", op: 0.25 }), tm(c.a, 60, 60, 880, 260, { size: 92, bold: true, color: P.a, align: "center", lh: 1 }), t(c.small, 60, 350, 880, { size: 34, bold: true, color: P.a, align: "center", ls: 6 })]; },
  ];
  const LABELS = [
    ["wide", 0, "Honey jar label", "honey jar food", { a: "RAW\nHONEY", b: "Wildflower", small: "250 g · Hill Farm\nBest before 12/27", p: { a: "#b45309", b: "#fde68a" } }],
    ["wide", 1, "Candle label", "candle scent home", { a: "Fig & Cedar", small: "SOY CANDLE · 40 HOURS", p: { a: "#3f3f46", b: "#d4a373" } }],
    ["wide", 2, "Herbal tea label", "tea herbal drink", { a: "Mint Tea", small: "CALM BLEND · 20 BAGS", icon: "icon-leaf", p: { a: "#166534", b: "#65a30d" } }],
    ["wide", 3, "Hot sauce label", "sauce chilli food", { a: "Fire Sauce", b: "EXTRA HOT", small: "Chilli · garlic · lime\n150 ml", p: { a: "#b91c1c", b: "#fca5a5" } }],
    ["wide", 4, "Bakery box label", "bakery cookies box", { a: "Fresh Cookies", small: "BAKED TODAY", p: { a: "#7c2d12", b: "#fed7aa" } }],
    ["wide", 5, "Soap bar label", "soap handmade bath", { a: "Oat & Milk", small: "HANDMADE SOAP", p: { a: "#0f766e", b: "#ccfbf1" } }],
    ["wide", 6, "Jam label", "jam preserve fruit", { mono: "J", a: "Strawberry\nJam", small: "HOMEMADE · 340 g", p: { a: "#9f1239", b: "#fecdd3" } }],
    ["wide", 7, "Coffee bag label", "coffee beans bag", { a: "Morning Roast", small: "MEDIUM · WHOLE BEAN", p: { a: "#78350f", b: "#f59e0b" } }],
    ["round", 0, "Round thank you label", "thank you packaging round", { small: "WITH LOVE", a: "Thank\nyou", p: { a: "#0f766e", b: "#99f6e4" } }],
    ["round", 3, "Round script label", "script name label round", { a: "Lina's", small: "KITCHEN", p: { a: "#9d174d", b: "#fbcfe8" } }],
    ["round", 4, "Round icon label", "icon round organic", { a: "Organic", small: "FARM GROWN", icon: "icon-sun", p: { a: "#15803d", b: "#facc15" } }],
    ["round", 8, "Round stamp label", "stamp round handmade", { a: "SMALL\nBATCH", small: "NO. 07", p: { a: "#1e3a8a", b: "#93c5fd", bg: "#eff6ff" } }],
    ["round", 9, "Round seal label", "seal round quality", { a: "TOP\nPICK", small: "2026", p: { a: "#b45309", b: "#fde68a" } }],
    ["round", 11, "Round botanical label", "botanical round natural", { a: "Rose\nWater", small: "pure and gentle", p: { a: "#9f1239", b: "#fb7185" } }],
    ["round", 13, "Round initials label", "initials round gift", { mono: "M", a: "Maya", p: { a: "#4338ca", b: "#ffffff" } }],
  ];
  LABELS.forEach(([kind, ai, title, tg, c]) => tpl(title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-wb", title, kind === "wide" ? "label-product-2x1" : "label-round-2in", tg + " label sticker product print", (W, H) => {
    const q = kit(W, H);
    const cc = { a: "", b: "", small: "", mono: "", ...c };
    if (kind === "wide") return [page(c.p.bg || WHITE, WL[ai](q, cc))];
    return [page("none", [...(![0, 6, 7, 8, 9, 14].includes(ai) ? [q.c(20, 20, 960, 960, c.p.bg || WHITE, { stroke: c.p.a, sw: 12, name: "Label" })] : []), ...EM[ai](q, cc)])];
  }));
}
