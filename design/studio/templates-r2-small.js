// ROUND 2 layout batch (filled by a helper; see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md). Pure module, no imports.
// 15 labels (product 2 × 1 in, round 2 in, shipping 4 × 6 in) and 15 stickers (round, square, oval, rectangle).
// Own artwork only: shapes, text and our stickers. Barcodes and QR-like squares are drawn from plain rectangles.
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page } = k;
  const { INK, MUTED, WHITE, GOLD } = k.K;

  // Small deterministic random numbers, so a template always builds the same way.
  const rng = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

  /** A simple barcode look: thin bars (own rectangles) in the box x, y, w, h; guard bars run a little longer. */
  function barcode(x, y, w, h, color, seed = 7, pairs = 22) {
    const r = rng(seed);
    const seq = [1, 1, 1, 1];
    for (let i = 0; i < pairs; i++) seq.push(1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2.4));
    seq.push(1, 1, 1);
    const unit = w / seq.reduce((a, b) => a + b, 0);
    const out = [];
    let cx = x;
    seq.forEach((u, i) => {
      if (i % 2 === 0) {
        const guard = i < 4 || i >= seq.length - 3;
        out.push(R(cx, y, u * unit, guard ? h + 4 : h, color, { name: "Barcode bar" }));
      }
      cx += u * unit;
    });
    return out;
  }

  /** A QR-like square (not a real code): three corner markers, a small marker and random modules, size × size. */
  function qr(x, y, size, dark, light, seed = 3, N = 21) {
    const m = size / N, r = rng(seed), out = [];
    const corner = (row, col) => (row < 8 && col < 8) || (row < 8 && col >= N - 8) || (row >= N - 8 && col < 8);
    const small = (row, col) => row >= N - 9 && row < N - 4 && col >= N - 9 && col < N - 4;
    for (const [fr, fc] of [[0, 0], [0, N - 7], [N - 7, 0]]) {
      out.push(R(x + fc * m, y + fr * m, 7 * m, 7 * m, dark, { name: "QR marker" }));
      out.push(R(x + (fc + 1) * m, y + (fr + 1) * m, 5 * m, 5 * m, light, { name: "QR marker" }));
      out.push(R(x + (fc + 2) * m, y + (fr + 2) * m, 3 * m, 3 * m, dark, { name: "QR marker" }));
    }
    const a = N - 9;
    out.push(R(x + a * m, y + a * m, 5 * m, 5 * m, dark, { name: "QR marker" }));
    out.push(R(x + (a + 1) * m, y + (a + 1) * m, 3 * m, 3 * m, light, { name: "QR marker" }));
    out.push(R(x + (a + 2) * m, y + (a + 2) * m, m, m, dark, { name: "QR marker" }));
    for (let row = 0; row < N; row++) {
      let start = -1;
      for (let col = 0; col <= N; col++) {
        const on = col < N && !corner(row, col) && !small(row, col) && r() < 0.5;
        if (on && start < 0) start = col;
        if (!on && start >= 0) { out.push(R(x + start * m, y + row * m, (col - start) * m, m, dark, { name: "QR module" })); start = -1; }
      }
    }
    return out;
  }

  /** Star or burst with a chosen inner radius (0.45 = classic star, 0.85 = scalloped edge). */
  const burst = (x, y, w, h, fill, points, inner, o = {}) => { const s = S("star", x, y, w, h, fill, { ...o, points }); s.shape.inner = inner; return s; };

  /* ================= Product labels (2 × 1 in = 192 × 96 px) ================= */
  const LP = "label product ";
  tpl("fig-cedar-candle-label-sm2", "Soy candle scent label", "label-product-2x1", LP + "candle soy wax scent fig cedar jar handmade", (W, H) => [page("#f5efe6", [
    R(0, 0, 60, H, "#3f3a36", { name: "Side panel" }),
    E("shape-drop", 21, 10, 18, { c1: "#f59e0b", name: "Flame" }),
    E("shape-drop", 25.5, 18, 9, { c1: "#fde68a", name: "Flame core" }),
    R(29.25, 28, 1.5, 8, "#f5efe6", { name: "Wick" }),
    R(16, 36, 28, 46, "#f5efe6", { radius: 3, name: "Candle" }),
    R(16, 50, 28, 12, "#b45309", { name: "Candle band" }),
    T("Fig & Cedar", 70, 12, 114, { size: 18, family: "serif", bold: true, color: "#3f3a36" }),
    R(70, 38, 28, 1.5, "#b45309", { name: "Rule" }),
    T("HAND-POURED SOY CANDLE", 70, 45, 118, { size: 6.5, bold: true, ls: 0.6, color: "#78716c" }),
    T("8 oz · 45 hour burn", 70, 58, 116, { size: 8.5, color: "#3f3a36" }),
    T("Trim the wick before lighting", 70, 72, 118, { size: 6.5, italic: true, color: "#78716c" }),
  ])]);

  tpl("hillside-wine-label-sm2", "Vineyard wine label", "label-product-2x1", LP + "wine bottle vineyard red reserve vintage cellar", (W, H) => [page("#fbf7ef", [
    R(5, 5, W - 10, H - 10, "none", { stroke: "#7f1d1d", sw: 1.2, name: "Frame" }),
    R(9, 9, W - 18, H - 18, "none", { stroke: "#7f1d1d", sw: 0.5, name: "Inner frame" }),
    T("VINTAGE 2024", 12, 14, W - 24, { size: 7, bold: true, ls: 2.5, color: "#a16207", align: "center" }),
    T("Hillside Reserve", 12, 24, W - 24, { size: 18, family: "serif", bold: true, italic: true, color: "#450a0a", align: "center" }),
    E("line-ornament", W / 2 - 30, 49, 60, { c1: "#a16207" }),
    T("CABERNET SAUVIGNON", 12, 59, W - 24, { size: 7.5, bold: true, ls: 1.6, color: "#7f1d1d", align: "center" }),
    T("750 ml · 13.5% vol", 12, 71, W - 24, { size: 7, color: "#78716c", align: "center" }),
  ])]);

  tpl("green-glow-juice-label-sm2", "Cold pressed juice label", "label-product-2x1", LP + "juice bottle cold pressed green drink lime fresh healthy", (W, H) => [page("#ecfccb", [
    R(124, 0, W - 124, H, "#4d7c0f", { name: "Side panel" }),
    C(132, 14, 52, 52, "#365314", { name: "Lime rind" }),
    C(135, 17, 46, 46, "#d9f99d", { name: "Lime flesh" }),
    ...[0, 45, 90, 135].map((rot) => S("line", 137, 39, 42, 2, "#ecfccb", { sw: 1.5, rot, name: "Lime segment" })),
    C(154, 36, 8, 8, "#ecfccb", { name: "Lime centre" }),
    T("KEEP COLD", 124, 74, W - 124, { size: 6.5, bold: true, ls: 1, color: "#ecfccb", align: "center" }),
    T("GREEN\nGLOW", 12, 12, 108, { size: 24, bold: true, lh: 0.95, color: "#14532d" }),
    T("apple · kale · lime · ginger", 12, 62, 108, { size: 7.5, color: "#3f6212" }),
    T("COLD PRESSED · 330 ML", 12, 76, 108, { size: 6.5, bold: true, ls: 1, color: "#14532d" }),
  ])]);

  tpl("glow-serum-label-sm2", "Face serum label", "label-product-2x1", LP + "serum skincare cosmetics beauty dropper bottle minimal", (W, H) => [page("#f4f1ee", [
    T("NO. 03", 14, 12, 80, { size: 7, bold: true, ls: 2, color: "#a8876f" }),
    T("Glow\nSerum", 14, 24, 104, { size: 22, family: "serif", lh: 1, color: "#3d2f2a" }),
    T("vitamin C + niacinamide", 14, 72, 108, { size: 7.5, italic: true, color: "#6b5a52" }),
    R(128, 14, 1, H - 28, "#c9b8a8", { name: "Divider" }),
    T("30 ml\n1 fl oz", 138, 14, 46, { size: 8, color: "#3d2f2a", lh: 1.3 }),
    T("FOR ALL\nSKIN\nTYPES", 138, 44, 46, { size: 6, bold: true, ls: 0.8, lh: 1.35, color: "#a8876f" }),
    C(138, 74, 8, 8, "#e7a98f", { name: "Dot" }),
  ])]);

  tpl("granola-barcode-label-sm2", "Granola barcode label", "label-product-2x1", LP + "barcode granola pouch shop retail price food", (W, H) => [page(WHITE, [
    R(0, 0, W, 28, "#b45309", { name: "Top band" }),
    T("MAPLE CRUNCH GRANOLA", 8, 8, W - 16, { size: 9.5, bold: true, ls: 1, color: WHITE, align: "center" }),
    T("Net wt 400 g", 10, 36, 86, { size: 8.5, bold: true, color: INK }),
    T("Best before\n12 / 2027", 10, 50, 86, { size: 7.5, color: MUTED, lh: 1.25 }),
    T("Rs 950", 10, 72, 86, { size: 13, bold: true, color: "#b45309" }),
    ...barcode(106, 36, 76, 34, INK, 11, 20),
    T("8 901234 567890", 102, 76, 84, { size: 7, family: "mono", color: INK, align: "center" }),
  ])]);

  tpl("school-name-label-sm2", "School name label", "label-product-2x1", "label name school kids belongings lunchbox book uniform", (W, H) => [page("#e0f2fe", [
    R(6, 6, W - 12, H - 12, WHITE, { radius: 16, name: "Card" }),
    C(14, 18, 60, 60, "#0ea5e9", { name: "Icon circle" }),
    E("icon-star", 26, 30, 36, { c1: GOLD }),
    T("THIS BELONGS TO", 84, 20, 98, { size: 7, bold: true, ls: 1.2, color: "#0284c7" }),
    T("Zara Khan", 84, 31, 98, { size: 17, bold: true, color: INK }),
    R(84, 56, 90, 1, "#bae6fd", { name: "Rule" }),
    T("Class 3 · Blue House", 84, 62, 98, { size: 8, color: "#0369a1" }),
  ])]);

  tpl("coffee-qr-label-sm2", "Coffee brew guide QR label", "label-product-2x1", LP + "coffee bag qr code scan brew guide roast beans", (W, H) => [page("#2b1d16", [
    R(8, 12, 72, 72, WHITE, { radius: 4, name: "QR backing" }),
    ...qr(12, 16, 64, "#2b1d16", WHITE, 5),
    T("ETHIOPIA", 90, 12, 96, { size: 14, bold: true, ls: 1.5, color: "#fde68a" }),
    T("Yirgacheffe · light roast", 90, 31, 96, { size: 7, color: "#e7d3c1" }),
    T("SCAN FOR\nBREW GUIDE", 90, 48, 96, { size: 8, bold: true, ls: 1, lh: 1.2, color: WHITE }),
    T("250 g · whole bean", 90, 74, 96, { size: 7, color: "#c8a98e" }),
  ])]);

  /* ================= Round labels (2 in = 192 px, cut on the circle) ================= */
  const LR = "label round ";
  tpl("honeycomb-round-label-sm2", "Honeycomb round label", "label-round-2in", LR + "honey jar honeycomb bee raw wildflower", (W, H) => {
    const hw = 24, hh = 27.7, combs = [];
    for (let row = -5; row <= 5; row++) for (let col = -5; col <= 5; col++) {
      const cx = W / 2 + col * hw + (Math.abs(row) % 2 ? hw / 2 : 0), cy = H / 2 + row * hh * 0.75;
      const far = Math.hypot(cx - 96, cy - 96);
      if (far + hh / 2 < 90 && far > 54) combs.push(S("polygon", cx - hw / 2 + 1, cy - hh / 2 + 1, hw - 2, hh - 2, "none", { sides: 6, stroke: "#fcd34d", sw: 1.5, name: "Comb" }));
    }
    return [page("#f59e0b", [
      ...combs,
      S("polygon", 37, 28, 118, 136, "#fffbeb", { sides: 6, name: "Hexagon" }),
      S("polygon", 43, 35, 106, 122, "none", { sides: 6, stroke: "#d97706", sw: 1.2, name: "Hexagon line" }),
      T("RAW", 37, 52, 118, { size: 10, bold: true, ls: 3, color: "#b45309", align: "center" }),
      T("Wildflower\nHoney", 37, 68, 118, { size: 18, family: "serif", bold: true, lh: 1.05, color: "#78350f", align: "center" }),
      T("local · unfiltered", 37, 110, 118, { size: 8.5, italic: true, color: "#92400e", align: "center" }),
      T("340 g", 37, 126, 118, { size: 9, bold: true, color: "#b45309", align: "center" }),
    ])];
  });

  tpl("cumin-tile-round-label-sm2", "Spice jar lid label", "label-round-2in", LR + "spice jar lid cumin kitchen pantry seasoning", (W, H) => [page("#7c2d12", [
    C(8, 8, W - 16, H - 16, "none", { stroke: "#fdba74", sw: 1, name: "Ring" }),
    T("SPICE CO.", 46, 24, 100, { size: 8.5, bold: true, ls: 3, color: "#fed7aa", align: "center" }),
    R(48, 44, 96, 98, "#fff7ed", { radius: 8, name: "Tile" }),
    T("07", 56, 50, 36, { size: 10, bold: true, color: "#c2410c" }),
    T("50 g", 100, 51, 36, { size: 8, color: "#9a3412", align: "right" }),
    T("Cm", 48, 62, 96, { size: 40, bold: true, color: "#7c2d12", align: "center", lh: 1.1 }),
    T("CUMIN", 48, 108, 96, { size: 10, bold: true, ls: 2, color: "#c2410c", align: "center" }),
    T("whole seeds", 48, 122, 96, { size: 8, italic: true, color: "#9a3412", align: "center" }),
    T("small batch", 46, 150, 100, { size: 8.5, italic: true, color: "#fed7aa", align: "center" }),
  ])]);

  tpl("oat-honey-soap-round-label-sm2", "Soap bar seal label", "label-round-2in", LR + "soap bar seal handmade natural oat honey skincare wrap", (W, H) => [page("#ecfdf5", [
    burst(6, 6, W - 12, H - 12, "#8fb996", 24, 0.88, { name: "Scalloped edge" }),
    C(24, 24, W - 48, H - 48, "#f7f3ea", { name: "Centre" }),
    C(30, 30, W - 60, H - 60, "none", { stroke: "#8fb996", sw: 1, name: "Ring" }),
    E("deco-sprig", 76, 38, 40, { c1: "#4d7c4a", c2: "#8fb996" }),
    T("Oat & Honey", 30, 82, W - 60, { size: 18, family: "serif", bold: true, color: "#1f3d2b", align: "center" }),
    T("COLD PROCESS SOAP", 30, 107, W - 60, { size: 7.5, bold: true, ls: 1.5, color: "#4d7c4a", align: "center" }),
    T("110 g · palm free", 30, 122, W - 60, { size: 8, color: "#57534e", align: "center" }),
  ])]);

  tpl("kitchen-of-round-label-sm2", "From the kitchen of label", "label-round-2in", "label round name jar homemade kitchen gift baking preserves personal", (W, H) => [page("#dc2626", [
    ...Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return C(96 + 88 * Math.cos(a) - 2.5, 96 + 88 * Math.sin(a) - 2.5, 5, 5, WHITE, { name: "Dot" }); }),
    C(14, 14, W - 28, H - 28, WHITE, { name: "Centre" }),
    C(20, 20, W - 40, H - 40, "none", { stroke: "#fca5a5", sw: 1, name: "Ring" }),
    T("From the kitchen of", 30, 48, 132, { size: 11.5, family: "serif", italic: true, color: "#7f1d1d", align: "center" }),
    T("Grandma Rose", 24, 68, 144, { size: 19, family: "serif", bold: true, color: "#b91c1c", align: "center" }),
    S("heart", 88, 100, 16, 14, "#dc2626", { name: "Heart" }),
    T("MADE WITH LOVE", 30, 122, 132, { size: 7.5, bold: true, ls: 2, color: "#7f1d1d", align: "center" }),
    T("date  ________", 30, 138, 132, { size: 8, color: "#9f1239", align: "center" }),
  ])]);

  tpl("scan-reorder-round-label-sm2", "Scan to reorder round label", "label-round-2in", LR + "qr code scan reorder shop packaging small business", (W, H) => [page("#1e1b4b", [
    C(6, 6, W - 12, H - 12, "none", { stroke: GOLD, sw: 1.5, name: "Ring" }),
    T("SCAN TO", 36, 20, 120, { size: 9, bold: true, ls: 2.5, color: GOLD, align: "center" }),
    T("REORDER", 36, 31, 120, { size: 14, bold: true, ls: 2, color: WHITE, align: "center" }),
    R(60, 54, 72, 72, WHITE, { radius: 6, name: "QR backing" }),
    ...qr(64, 58, 64, "#1e1b4b", WHITE, 9),
    T("yourshop.com", 36, 133, 120, { size: 9, color: "#c7d2fe", align: "center" }),
    T("Thank you!", 36, 147, 120, { size: 12, family: "serif", italic: true, color: GOLD, align: "center" }),
  ])]);

  /* ================= Shipping labels (4 × 6 in = 384 × 576 px) ================= */
  const LS = "label shipping parcel courier ";
  tpl("return-parcel-label-sm2", "Return parcel label", "label-shipping-4x6", LS + "return refund exchange barcode prepaid", (W, H) => [page(WHITE, [
    R(12, 12, W - 24, H - 24, "none", { stroke: INK, sw: 2, name: "Frame" }),
    R(12, 12, 96, 96, INK, { name: "Service box" }),
    T("R", 12, 20, 96, { size: 66, bold: true, color: WHITE, align: "center", lh: 1.15 }),
    T("RETURN\nPARCEL", 124, 22, W - 148, { size: 26, bold: true, lh: 1.05, color: INK }),
    T("Prepaid · no postage needed", 124, 82, W - 148, { size: 11, color: MUTED }),
    R(12, 108, W - 24, 2, INK, { name: "Rule" }),
    T("FROM (CUSTOMER)", 26, 122, 170, { size: 9, bold: true, ls: 1.5, color: MUTED }),
    T("Customer Name\n12 Park Lane\nCity, Postcode", 26, 138, 170, { size: 12, lh: 1.35, color: INK }),
    R(206, 122, 152, 64, "#f1f5f9", { radius: 6, name: "Order box" }),
    T("ORDER NO.", 218, 132, 130, { size: 9, bold: true, ls: 1.5, color: MUTED }),
    T("#A-20418", 218, 148, 130, { size: 20, bold: true, family: "mono", color: INK }),
    R(12, 200, W - 24, 2, INK, { name: "Rule" }),
    T("RETURN TO", 26, 214, 200, { size: 10, bold: true, ls: 2, color: MUTED }),
    T("Returns Dept.\nLittle Paper Shop\nUnit 4, Mill Yard\nLeeds LS2 7HQ", 26, 232, W - 52, { size: 20, bold: true, lh: 1.25, color: INK }),
    R(12, 346, W - 24, 2, INK, { name: "Rule" }),
    T("REASON FOR RETURN", 26, 360, 220, { size: 9, bold: true, ls: 1.5, color: MUTED }),
    ...[["Wrong size", 26, 382], ["Damaged", 200, 382], ["Changed my mind", 26, 404], ["Other ________", 200, 404]].flatMap(([t, x, y]) => [
      R(x, y, 12, 12, "none", { stroke: INK, sw: 1.5, radius: 2, name: "Tick box" }),
      T(t, x + 18, y - 1, 150, { size: 11, color: INK }),
    ]),
    R(12, 428, W - 24, 2, INK, { name: "Rule" }),
    ...barcode(40, 444, W - 80, 68, INK, 21, 30),
    T("RTN 4402 1873 0091", 12, 520, W - 24, { size: 12, family: "mono", ls: 2, color: INK, align: "center" }),
    T("Seal the box and stick this label on top", 12, 540, W - 24, { size: 9, color: MUTED, align: "center" }),
  ])]);

  tpl("fragile-glass-label-sm2", "Fragile glass parcel label", "label-shipping-4x6", LS + "fragile glass handle with care this way up", (W, H) => [page(WHITE, [
    R(0, 0, 88, H, "#dc2626", { name: "Side band" }),
    T("FRAGILE", 44 - 260, H / 2 - 38.4, 520, { size: 64, bold: true, ls: 10, color: WHITE, align: "center", rot: -90 }),
    E("shape-half-circle", 196, 40, 84, { c1: "#dc2626", rot: 180, name: "Glass bowl" }),
    R(236, 84, 4, 42, "#dc2626", { name: "Glass stem" }),
    C(214, 122, 48, 10, "#dc2626", { name: "Glass base" }),
    T("GLASS INSIDE", 104, 150, W - 112, { size: 26, bold: true, color: "#dc2626", align: "center" }),
    T("Handle with care · do not stack", 104, 186, W - 112, { size: 12, color: MUTED, align: "center" }),
    S("arrow", 174, 224, 60, 28, INK, { sw: 6, rot: -90, name: "Up arrow" }),
    S("arrow", 242, 224, 60, 28, INK, { sw: 6, rot: -90, name: "Up arrow" }),
    T("THIS WAY UP", 104, 276, W - 112, { size: 13, bold: true, ls: 3, color: INK, align: "center" }),
    R(104, 310, W - 112, 1.5, "#e5e7eb", { name: "Rule" }),
    T("SHIP TO", 112, 326, 150, { size: 10, bold: true, ls: 2, color: MUTED }),
    T("Customer Name\n8 Orchard Street\nCity, Postcode", 112, 344, 252, { size: 18, bold: true, lh: 1.3, color: INK }),
    T("FROM", 112, 432, 150, { size: 10, bold: true, ls: 2, color: MUTED }),
    T("Clearwater Glassworks\n3 Quay Road, Bristol BS1 5TT", 112, 450, 252, { size: 12, lh: 1.35, color: INK }),
    R(104, 504, W - 112, 52, "#fef2f2", { radius: 8, name: "Contents box" }),
    T("Contains: 6 drinking glasses", 104, 522, W - 112, { size: 12, color: "#991b1b", align: "center" }),
  ])]);

  tpl("happy-mail-label-sm2", "Happy mail shipping label", "label-shipping-4x6", LS + "small business happy mail brand logo cute pink", (W, H) => [page("#fdf2f8", [
    C(146, 22, 92, 92, "#fbcfe8", { name: "Logo ring" }),
    F(152, 28, 80, 80, { shape: "circle", name: "Logo" }),
    T("Happy mail is here!", 24, 124, W - 48, { size: 28, family: "serif", italic: true, bold: true, color: "#be185d", align: "center" }),
    E("line-wavy", W / 2 - 50, 162, 100, { c1: "#f9a8d4" }),
    R(24, 190, W - 48, 224, WHITE, { radius: 18, name: "Address card" }),
    T("TO", 44, 210, 60, { size: 11, bold: true, ls: 2, color: "#be185d" }),
    T("Customer Name\n24 Harbour Road\nCity, Postcode\nCountry", 44, 228, W - 88, { size: 20, bold: true, lh: 1.3, color: INK }),
    R(44, 346, W - 88, 1, "#fbcfe8", { name: "Rule" }),
    T("FROM", 44, 360, 80, { size: 11, bold: true, ls: 2, color: "#be185d" }),
    T("Bloom Studio · 7 Rose Lane, York YO1 7HH", 44, 378, W - 88, { size: 11, color: MUTED, lh: 1.3 }),
    T("Packed with love by Bloom Studio", 24, 446, W - 48, { size: 13, italic: true, color: "#9d174d", align: "center" }),
    E("icon-heart", 126, 476, 36, { c1: "#f472b6" }),
    E("icon-gift", 174, 476, 36, { c1: "#be185d" }),
    E("deco-sparkle", 222, 476, 36, { c1: "#f472b6" }),
    T("@bloomstudio", 24, 526, W - 48, { size: 12, bold: true, color: "#be185d", align: "center" }),
  ])]);

  /* ================= Round stickers (3 in = 288 px, cut on the circle) ================= */
  const SR = "sticker round ";
  tpl("pumpkin-halloween-sticker-sm2", "Pumpkin trick or treat sticker", "sticker-round-3in", SR + "halloween pumpkin trick or treat spooky october", (W, H) => [page("#3b0764", [
    C(10, 10, W - 20, H - 20, "none", { stroke: "#f97316", sw: 3, name: "Ring" }),
    E("deco-stars", 56, 46, 44, { c1: GOLD, c2: "#fde68a" }),
    E("deco-sparkle", 196, 52, 30, { c1: "#fde68a" }),
    R(138, 58, 12, 24, "#65a30d", { radius: 3, name: "Stem" }),
    C(150, 60, 24, 11, "#84cc16", { rot: -20, name: "Leaf" }),
    C(78, 78, 84, 100, "#ea580c", { name: "Pumpkin side" }),
    C(126, 78, 84, 100, "#ea580c", { name: "Pumpkin side" }),
    C(104, 74, 80, 106, "#f97316", { name: "Pumpkin middle" }),
    S("triangle", 112, 106, 22, 20, "#3b0764", { name: "Eye" }),
    S("triangle", 154, 106, 22, 20, "#3b0764", { name: "Eye" }),
    S("triangle", 137, 130, 14, 11, "#3b0764", { rot: 180, name: "Nose" }),
    R(110, 146, 68, 16, "#3b0764", { radius: 8, name: "Mouth" }),
    R(128, 146, 9, 7, "#f97316", { name: "Tooth" }),
    R(151, 146, 9, 7, "#f97316", { name: "Tooth" }),
    T("TRICK OR TREAT", 30, 194, W - 60, { size: 20, bold: true, ls: 2, color: "#fdba74", align: "center" }),
    T("happy halloween", 30, 222, W - 60, { size: 14, family: "serif", italic: true, color: "#e9d5ff", align: "center" }),
  ])]);

  tpl("heart-eyes-emoji-sticker-sm2", "Heart eyes emoji sticker", "sticker-round-3in", SR + "emoji face heart eyes love cute fun", (W, H) => [page(WHITE, [
    C(8, 8, W - 16, H - 16, "#facc15", { stroke: "#ca8a04", sw: 6, name: "Face" }),
    C(66, 34, 46, 22, WHITE, { op: 0.35, rot: -30, name: "Shine" }),
    S("heart", 76, 70, 56, 50, "#e11d48", { name: "Heart eye" }),
    S("heart", 156, 70, 56, 50, "#e11d48", { name: "Heart eye" }),
    C(44, 130, 38, 20, "#fb923c", { op: 0.55, name: "Blush" }),
    C(206, 130, 38, 20, "#fb923c", { op: 0.55, name: "Blush" }),
    E("shape-half-circle", 88, 146, 112, { c1: "#7c2d12", rot: 180, name: "Mouth" }),
    C(124, 180, 40, 22, "#fb7185", { name: "Tongue" }),
    R(72, 222, 144, 36, "#e11d48", { radius: 18, name: "Banner" }),
    T("LOVE IT!", 72, 229, 144, { size: 18, bold: true, ls: 2, color: WHITE, align: "center" }),
  ])]);

  tpl("sale-burst-sticker-sm2", "Sale burst 30% off sticker", "sticker-round-3in", SR + "sale burst discount offer price shop 30% off", (W, H) => [page(WHITE, [
    burst(6, 6, W - 12, H - 12, "#e11d48", 24, 0.86, { name: "Back burst" }),
    burst(28, 28, W - 56, H - 56, "#fbbf24", 24, 0.9, { name: "Front burst" }),
    T("UP TO", 64, 56, 160, { size: 15, bold: true, ls: 3, color: "#9f1239", align: "center" }),
    T("30%", 34, 76, 220, { size: 70, bold: true, color: "#9f1239", align: "center", lh: 1 }),
    T("OFF", 64, 146, 160, { size: 32, bold: true, color: "#9f1239", align: "center", lh: 1 }),
    R(60, 186, 168, 38, INK, { radius: 4, rot: -6, name: "Ribbon" }),
    T("SALE NOW ON", 60, 194, 168, { size: 17, bold: true, ls: 2, color: WHITE, align: "center", rot: -6 }),
  ])]);

  tpl("team-crest-sticker-sm2", "Sports team crest sticker", "sticker-round-3in", SR + "sports team club crest football fan eagles", (W, H) => [page("#1e3a8a", [
    C(12, 12, W - 24, H - 24, "none", { stroke: "#facc15", sw: 4, name: "Ring" }),
    C(22, 22, W - 44, H - 44, "none", { stroke: "#facc15", sw: 1, name: "Inner ring" }),
    E("shape-shield", 84, 50, 120, { c1: "#facc15", name: "Shield" }),
    E("shape-shield", 96, 62, 96, { c1: "#1e3a8a", name: "Shield inside" }),
    S("star", 122, 78, 44, 42, "#facc15", { name: "Star" }),
    T("FC", 104, 122, 80, { size: 22, bold: true, color: "#facc15", align: "center" }),
    S("star", 50, 102, 22, 21, "#facc15", { name: "Star" }),
    S("star", 216, 102, 22, 21, "#facc15", { name: "Star" }),
    T("EAGLES", 30, 182, W - 60, { size: 40, bold: true, ls: 4, color: WHITE, align: "center" }),
    T("GO TEAM GO", 30, 232, W - 60, { size: 12, bold: true, ls: 3, color: "#facc15", align: "center" }),
  ])]);

  /* ================= Square stickers (3 × 3 in, rounded corners) ================= */
  const SQ = "sticker square ";
  tpl("merry-tree-sticker-sm2", "Merry and bright tree sticker", "sticker-square-3in", SQ + "christmas tree holiday xmas festive winter", (W, H) => [page("#b91c1c", [
    ...[[34, 44, 8], [64, 96, 6], [38, 150, 7], [36, 196, 5], [244, 44, 7], [222, 100, 6], [250, 152, 8], [246, 198, 5], [102, 30, 5], [186, 34, 6]].map(([x, y, d]) => C(x, y, d, d, WHITE, { op: 0.6, name: "Snow" })),
    S("triangle", 70, 112, 148, 86, "#166534", { name: "Tree" }),
    S("triangle", 82, 74, 124, 80, "#15803d", { name: "Tree" }),
    S("triangle", 94, 40, 100, 70, "#16a34a", { name: "Tree" }),
    R(134, 198, 20, 18, "#78350f", { name: "Trunk" }),
    S("star", 128, 22, 32, 30, GOLD, { name: "Star" }),
    ...[[122, 92, GOLD], [158, 124, WHITE], [112, 156, GOLD], [172, 172, WHITE], [138, 140, GOLD], [96, 182, WHITE]].map(([x, y, c]) => C(x, y, 10, 10, c, { name: "Bauble" })),
    T("Merry & Bright", 20, 224, W - 40, { size: 30, family: "serif", bold: true, italic: true, color: WHITE, align: "center" }),
  ])]);

  tpl("cat-nap-club-sticker-sm2", "Cat nap club sticker", "sticker-square-3in", SQ + "cat kitten pet sleepy nap cute animal", (W, H) => [page("#c7d2fe", [
    S("triangle", 70, 40, 56, 64, "#f59e0b", { rot: -14, name: "Ear" }),
    S("triangle", 162, 40, 56, 64, "#f59e0b", { rot: 14, name: "Ear" }),
    S("triangle", 83, 58, 30, 36, "#fda4af", { rot: -14, name: "Inner ear" }),
    S("triangle", 175, 58, 30, 36, "#fda4af", { rot: 14, name: "Inner ear" }),
    C(64, 70, 160, 130, "#f59e0b", { name: "Head" }),
    R(142, 76, 4, 22, "#d97706", { radius: 2, name: "Stripe" }),
    R(130, 80, 4, 16, "#d97706", { radius: 2, name: "Stripe" }),
    R(154, 80, 4, 16, "#d97706", { radius: 2, name: "Stripe" }),
    S("line", 100, 124, 30, 4, INK, { sw: 3.5, rot: 6, name: "Closed eye" }),
    S("line", 158, 124, 30, 4, INK, { sw: 3.5, rot: -6, name: "Closed eye" }),
    S("triangle", 136, 144, 16, 12, "#e11d48", { rot: 180, name: "Nose" }),
    S("line", 40, 148, 52, 3, INK, { sw: 2, rot: -8, name: "Whisker" }),
    S("line", 40, 162, 52, 3, INK, { sw: 2, rot: 6, name: "Whisker" }),
    S("line", 196, 148, 52, 3, INK, { sw: 2, rot: 8, name: "Whisker" }),
    S("line", 196, 162, 52, 3, INK, { sw: 2, rot: -6, name: "Whisker" }),
    C(100, 186, 34, 20, "#fbbf24", { name: "Paw" }),
    C(154, 186, 34, 20, "#fbbf24", { name: "Paw" }),
    T("z", 232, 58, 16, { size: 16, bold: true, italic: true, color: "#4338ca" }),
    T("Z", 246, 26, 24, { size: 26, bold: true, italic: true, color: "#4338ca" }),
    T("CAT NAP CLUB", 20, 212, W - 40, { size: 26, bold: true, ls: 2, color: "#312e81", align: "center" }),
    T("members only", 20, 246, W - 40, { size: 13, italic: true, color: "#4338ca", align: "center" }),
  ])]);

  tpl("you-got-this-sticker-sm2", "You got this sticker", "sticker-square-3in", SQ + "motivational quote you got this positive encouragement", (W, H) => [page("#111827", [
    E("deco-sparkle", 214, 30, 40, { c1: "#facc15" }),
    R(40, 46, 150, 58, "#f472b6", { radius: 4, rot: -4, name: "Highlight" }),
    T("YOU", 40, 51, 150, { size: 48, bold: true, lh: 1, color: "#111827", align: "center", rot: -4 }),
    R(96, 112, 156, 58, "#facc15", { radius: 4, rot: 3, name: "Highlight" }),
    T("GOT", 96, 117, 156, { size: 48, bold: true, lh: 1, color: "#111827", align: "center", rot: 3 }),
    R(36, 178, 200, 58, "#22d3ee", { radius: 4, rot: -2, name: "Highlight" }),
    T("THIS", 36, 183, 200, { size: 48, bold: true, lh: 1, color: "#111827", align: "center", rot: -2 }),
    T("one step at a time", 20, 246, W - 40, { size: 14, family: "serif", italic: true, color: "#e5e7eb", align: "center" }),
  ])]);

  tpl("star-reader-reward-sticker-sm2", "Star reader reward sticker", "sticker-square-3in", SQ + "kids reward school reading star medal teacher good job", (W, H) => [page("#e0f2fe", [
    E("deco-confetti", 24, 22, 54, { c1: "#f472b6", c2: "#2563eb" }),
    E("deco-confetti", 210, 22, 54, { c1: "#22c55e", c2: "#f59e0b" }),
    R(110, 140, 28, 84, "#2563eb", { rot: 16, name: "Ribbon" }),
    R(150, 140, 28, 84, "#dc2626", { rot: -16, name: "Ribbon" }),
    C(74, 40, 140, 140, "#f59e0b", { name: "Medal" }),
    C(86, 52, 116, 116, "#fde68a", { name: "Medal face" }),
    C(92, 58, 104, 104, "none", { stroke: "#f59e0b", sw: 1.5, name: "Medal ring" }),
    S("star", 116, 66, 56, 54, "#f97316", { name: "Star" }),
    T("10 BOOKS", 86, 124, 116, { size: 13, bold: true, color: "#92400e", align: "center" }),
    T("STAR READER", 20, 228, W - 40, { size: 28, bold: true, color: "#1e3a8a", align: "center" }),
  ])]);

  /* ================= Oval stickers (3 × 2 in = 288 × 192 px, cut on the oval) ================= */
  const SO = "sticker oval ";
  tpl("euro-oval-car-sticker-sm2", "Euro oval car sticker", "sticker-oval-3x2", SO + "car bumper decal euro oval road trip weekend", (W, H) => [page(WHITE, [
    C(8, 8, W - 16, H - 16, "none", { stroke: INK, sw: 8, name: "Ring" }),
    S("triangle", 122, 36, 26, 18, INK, { name: "Mountain" }),
    S("triangle", 136, 30, 32, 24, INK, { name: "Mountain" }),
    T("WKND", 24, 60, W - 48, { size: 58, bold: true, lh: 1, color: INK, align: "center" }),
    T("WEEKEND EXPLORER", 24, 124, W - 48, { size: 12, bold: true, ls: 3, color: INK, align: "center" }),
  ])]);

  tpl("wedding-favour-oval-sticker-sm2", "Wedding favour oval sticker", "sticker-oval-3x2", SO + "wedding favour thank you couple names date gold", (W, H) => [page("#fdfaf5", [
    C(10, 10, W - 20, H - 20, "none", { stroke: "#b8860b", sw: 1.5, name: "Ring" }),
    C(16, 16, W - 32, H - 32, "none", { stroke: "#b8860b", sw: 0.6, name: "Inner ring" }),
    T("thank you", 44, 30, 200, { size: 18, family: "serif", italic: true, color: "#8a6d3b", align: "center" }),
    T("Sara & Adam", 24, 56, 240, { size: 30, family: "serif", bold: true, color: "#3f3a36", align: "center" }),
    E("line-ornament", 104, 97, 80, { c1: "#b8860b" }),
    T("for celebrating with us", 44, 110, 200, { size: 11, italic: true, color: "#6b5d4f", align: "center" }),
    T("12 · 06 · 2026", 44, 130, 200, { size: 11, bold: true, ls: 3, color: "#b8860b", align: "center" }),
    S("heart", 137, 152, 14, 12, "#e8a0a8", { name: "Heart" }),
  ])]);

  tpl("plastic-free-oval-sticker-sm2", "Plastic free packaging sticker", "sticker-oval-3x2", SO + "eco plastic free packaging recycle green earth sustainable", (W, H) => [page("#dcfce7", [
    C(12, 12, W - 24, H - 24, "none", { stroke: "#166534", sw: 2, name: "Ring" }),
    E("icon-leaf", 124, 22, 40, { c1: "#166534" }),
    T("PLASTIC FREE", 24, 64, W - 48, { size: 28, bold: true, color: "#14532d", align: "center" }),
    T("packaging · please recycle", 24, 100, W - 48, { size: 13, color: "#166534", align: "center" }),
    R(96, 128, 96, 26, "#166534", { radius: 13, name: "Pill" }),
    T("100% PAPER", 96, 134, 96, { size: 10, bold: true, ls: 1, color: WHITE, align: "center" }),
  ])]);

  /* ================= Rectangle stickers (3 × 2 in = 288 × 192 px, rounded corners) ================= */
  const SX = "sticker rectangle ";
  tpl("terminal-laptop-sticker-sm2", "Code coffee repeat laptop sticker", "sticker-rect-3x2", SX + "laptop coding developer programmer terminal coffee tech", (W, H) => [page("#0f172a", [
    R(0, 0, W, 34, "#1e293b", { name: "Title bar" }),
    C(24, 12, 10, 10, "#ef4444", { name: "Window dot" }),
    C(40, 12, 10, 10, "#f59e0b", { name: "Window dot" }),
    C(56, 12, 10, 10, "#22c55e", { name: "Window dot" }),
    T("~/daily-loop.sh", 70, 10, W - 140, { size: 11, family: "mono", color: "#94a3b8", align: "center" }),
    T("$ code", 22, 50, 244, { size: 24, bold: true, family: "mono", color: "#4ade80" }),
    T("$ coffee", 22, 82, 244, { size: 24, bold: true, family: "mono", color: "#fbbf24" }),
    T("$ repeat_", 22, 114, 244, { size: 24, bold: true, family: "mono", color: "#22d3ee" }),
    T("// works on my machine", 22, 156, 244, { size: 11, family: "mono", color: "#64748b" }),
  ])]);

  tpl("hello-name-tag-rect-sticker-sm2", "Hello my name is name tag", "sticker-rect-3x2", SX + "name tag hello my name is event badge meeting", (W, H) => [page(WHITE, [
    R(0, 0, W, 66, "#2563eb", { name: "Top band" }),
    T("HELLO", 0, 6, W, { size: 32, bold: true, ls: 3, lh: 1.1, color: WHITE, align: "center" }),
    T("my name is", 0, 42, W, { size: 13, color: "#dbeafe", align: "center" }),
    T("Jordan", 36, 88, W - 72, { size: 34, family: "serif", italic: true, color: INK, align: "center" }),
    R(36, 136, W - 72, 1.5, "#cbd5e1", { name: "Write line" }),
    R(0, 168, W, 24, "#2563eb", { name: "Bottom band" }),
  ])]);

  tpl("kraft-thank-you-sticker-sm2", "Kraft thank you order sticker", "sticker-rect-3x2", SX + "thank you for your order small business packaging kraft heart", (W, H) => [page("#c8a27a", [
    R(10, 10, W - 20, H - 20, "none", { stroke: "#3f2a1a", sw: 1, radius: 12, name: "Border" }),
    C(22, 46, 100, 100, "#fff7ed", { name: "Circle" }),
    S("heart", 48, 74, 48, 44, "#be123c", { name: "Heart" }),
    T("Thank you", 134, 36, 140, { size: 28, family: "serif", italic: true, bold: true, color: "#3f2a1a" }),
    T("FOR YOUR ORDER", 134, 72, 140, { size: 11, bold: true, ls: 2, color: "#7c2d12" }),
    R(134, 92, 40, 2, "#7c2d12", { name: "Rule" }),
    T("Your support means the world to our small shop.", 134, 102, 136, { size: 10, lh: 1.35, color: "#3f2a1a" }),
  ])]);

  tpl("wander-mountain-sticker-sm2", "Wander more mountain sticker", "sticker-rect-3x2", SX + "travel adventure mountain hiking outdoors wander sunset", (W, H) => [page(["#fde68a", "#fb7185", 180], [
    C(44, 26, 48, 48, "#fff7ed", { op: 0.9, name: "Sun" }),
    S("triangle", 10, 64, 170, 90, "#6d28d9", { name: "Mountain" }),
    S("triangle", 79.9, 64, 30.2, 16, WHITE, { name: "Snow cap" }),
    S("triangle", 108, 44, 170, 110, "#4c1d95", { name: "Mountain" }),
    S("triangle", 177.5, 44, 31, 20, WHITE, { name: "Snow cap" }),
    S("triangle", 60, 100, 110, 54, "#8b5cf6", { name: "Hill" }),
    R(0, 150, W, 42, "#2e1065", { name: "Ground" }),
    T("WANDER MORE", 0, 158, W, { size: 22, bold: true, ls: 4, color: WHITE, align: "center" }),
  ])]);
}
