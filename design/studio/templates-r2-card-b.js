// ROUND 2 layout batch (filled by a helper; see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md). Pure module, no imports.
// 20 own business cards (front + back), one per profession, each a different composition.
// Important text stays 10 px inside the trim; background shapes that touch an edge run 12 px past it (bleed).
import { castFor, face, KIND } from "./templates-faces.js";

export default function add(k) {
  const { T, S, R, C, E, F, page } = k;
  // Person spots show people photos of their kind (templates-faces.js): one person picker per template build.
  let CAST = null;
  const tpl = (id, title, preset, tags, build) => k.tpl(id, title, preset, tags, (W, H) => { CAST = castFor(id); return build(W, H); });
  const { INK, MUTED, WHITE } = k.K;
  const B = 12; // bleed past the trim for shapes that touch an edge
  const tags = (extra) => "business card visiting card contact " + extra;

  // A group layer (children are positioned relative to the group's box).
  const group = (x, y, w, h, children, name) => {
    const g = R(x, y, w, h, "none", { name });
    delete g.shape;
    g.type = "group";
    g.children = children;
    return g;
  };
  // Decorative QR-style square (own rects, not a real code): quiet zone, three finder squares, seeded modules.
  const qr = (x, y, size, dark, light, seed = 7) => {
    const n = 21, c = size / (n + 2);
    const kids = [R(0, 0, size, size, light, { radius: c, name: "QR background" })];
    const finder = (r, q) => [
      R((q + 1) * c, (r + 1) * c, 7 * c, 7 * c, dark, { name: "QR finder" }),
      R((q + 2) * c, (r + 2) * c, 5 * c, 5 * c, light, { name: "QR finder" }),
      R((q + 3) * c, (r + 3) * c, 3 * c, 3 * c, dark, { name: "QR finder" }),
    ];
    kids.push(...finder(0, 0), ...finder(0, n - 7), ...finder(n - 7, 0));
    let s = seed >>> 0;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const reserved = (r, q) => (r < 8 && q < 8) || (r < 8 && q >= n - 8) || (r >= n - 8 && q < 8);
    for (let r = 0; r < n; r++) {
      let start = -1;
      for (let q = 0; q <= n; q++) {
        const on = q < n && !reserved(r, q) && (r === 6 ? q % 2 === 0 : q === 6 ? r % 2 === 0 : rnd() < 0.48);
        if (on && start < 0) start = q;
        if (!on && start >= 0) { kids.push(R((start + 1) * c, (r + 1) * c, (q - start) * c, c * 1.04, dark, { name: "QR module" })); start = -1; }
      }
    }
    return group(x, y, size, size, kids, "QR code (replace with yours)");
  };
  // Contact rows: small icon + one line of text.
  const rows = (list, x, y, gap, size, ic, c3, tc, w) => list.flatMap(([icon, t], i) => {
    const s = size + 3, ty = y + i * gap;
    return [E(icon, x, ty + (size * 1.2 - s) / 2, s, { c1: ic, c2: ic, c3 }), T(t, x + s + 6, ty, w, { size, color: tc })];
  });
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");

  /* 1 Architect: blueprint grid with a dimension line (US) */
  tpl("blueprint-architect-card-bc5", "Blueprint architect business card", "business-card-us", tags("architect architecture blueprint grid technical drawing minimal blue studio"), (W, H) => {
    const grid = (col, op) => [
      ...Array.from({ length: 13 }, (_, i) => R(24 + i * 24, -B, 0.6, H + 2 * B, col, { op, name: "Grid line" })),
      ...Array.from({ length: 7 }, (_, i) => R(-B, 24 + i * 24, W + 2 * B, 0.6, col, { op, name: "Grid line" })),
    ];
    return [
      page("#12355b", [
        grid(WHITE, 0.09),
        T("MARCUS LIND", 24, 32, 220, { size: 20, bold: true, color: WHITE, ls: 3 }),
        T("Architect, RIBA", 24, 60, 220, { size: 10, family: "mono", color: "#9cc9f5" }),
        R(24, 86, 168, 1, "#9cc9f5", { name: "Dimension line" }),
        R(24, 81, 1, 11, "#9cc9f5", { name: "Dimension tick" }),
        R(191, 81, 1, 11, "#9cc9f5", { name: "Dimension tick" }),
        T("12 400 mm", 24, 92, 168, { size: 7, family: "mono", color: "#9cc9f5", align: "center" }),
        C(272, 24, 40, 40, "none", { stroke: WHITE, sw: 1, name: "North ring" }),
        S("triangle", 285, 30, 14, 22, WHITE, { name: "North arrow" }),
        T("N", 272, 68, 40, { size: 8, family: "mono", bold: true, color: WHITE, align: "center" }),
        T("+1 555 0142 778\nmarcus@example.com\n44 Harbor Lane, Seattle WA", 24, 120, 250, { size: 8.5, family: "mono", color: WHITE, lh: 1.5 }),
      ]),
      page("#eef4fb", [
        grid("#12355b", 0.07),
        S("triangle", 120, 26, 96, 30, "none", { stroke: "#12355b", sw: 1.2, name: "Roof" }),
        R(128, 56, 80, 52, "none", { stroke: "#12355b", sw: 1.2, name: "Facade" }),
        R(138, 66, 16, 14, "none", { stroke: "#12355b", sw: 1, name: "Window" }),
        R(182, 66, 16, 14, "none", { stroke: "#12355b", sw: 1, name: "Window" }),
        R(160, 82, 16, 26, "none", { stroke: "#12355b", sw: 1, name: "Door" }),
        R(92, 108, 152, 1.2, "#12355b", { name: "Ground line" }),
        T("LIND ARCHITECTS", 20, 124, W - 40, { size: 14, bold: true, color: "#12355b", align: "center", ls: 4 }),
        T("Buildings with a sense of place", 20, 148, W - 40, { size: 9, family: "serif", italic: true, color: "#3b6a9a", align: "center" }),
      ]),
    ];
  });

  /* 2 Doctor: side panel with a cross, opening hours on the back (US) */
  tpl("family-clinic-card-bc5", "Family clinic doctor business card", "business-card-us", tags("doctor clinic medical physician health hospital teal opening hours"), (W, H) => [
    page("#ffffff", [
      R(212, -B, W - 212 + B, H + 2 * B, "#0e7c86", { name: "Side panel" }),
      R(266, 40, 16, 48, WHITE, { radius: 3, name: "Cross" }),
      R(250, 56, 48, 16, WHITE, { radius: 3, name: "Cross" }),
      T("BRIGHTWELL\nFAMILY CLINIC", 222, 104, 104, { size: 8.5, bold: true, color: WHITE, align: "center", ls: 1.5, lh: 1.35 }),
      T("Dr. Amelia Hart", 22, 28, 180, { size: 19, bold: true, color: "#0b3c49" }),
      T("MD, Family Physician", 22, 54, 180, { size: 10, color: "#0e7c86" }),
      R(22, 76, 28, 2.5, "#0e7c86", { name: "Rule" }),
      rows([["icon-call", "+1 555 0108 432"], ["icon-mail", "amelia.hart@example.com"], ["icon-globe", "example.com/brightwell"], ["icon-location", "210 Elm Street, Denver CO"]], 22, 94, 19, 8.5, "#0e7c86", "#e0f4f5", INK, 160),
    ]),
    page("#0e7c86", [
      T("OPENING HOURS", 24, 24, 200, { size: 10, bold: true, color: WHITE, ls: 3 }),
      ...[["Monday to Friday", "8:00 – 18:00"], ["Saturday", "9:00 – 13:00"], ["Sunday", "Closed"]].flatMap(([d, t], i) => [
        T(d, 24, 52 + i * 24, 160, { size: 10, color: "#e0f4f5" }),
        T(t, W - 24 - 110, 52 + i * 24, 110, { size: 10, bold: true, color: WHITE, align: "right" }),
        R(24, 70 + i * 24, W - 48, 0.6, WHITE, { op: 0.35, name: "Row line" }),
      ]),
      R(24, 142, 190, 26, WHITE, { radius: 13, name: "Button" }),
      T("Book online: example.com/book", 24, 149.4, 190, { size: 8.5, bold: true, color: "#0e7c86", align: "center" }),
      R(284, 140, 8, 28, WHITE, { radius: 2, op: 0.8, name: "Cross" }),
      R(274, 150, 28, 8, WHITE, { radius: 2, op: 0.8, name: "Cross" }),
    ]),
  ]);

  /* 3 Accountant: single-colour ledger lines (EU) */
  tpl("ledger-accountant-card-bc5", "Ledger lines accountant business card", "business-card-eu", tags("accountant accounting cpa tax bookkeeping finance ledger minimal green single colour"), (W, H) => {
    const G = "#1d5c45", rowY = (r) => 50 + r * 20;
    return [
      page("#fbfcfa", [
        ...Array.from({ length: 8 }, (_, r) => R(-B, rowY(r), W + 2 * B, 0.6, G, { op: 0.22, name: "Ledger line" })),
        R(40, -B, 0.8, H + 2 * B, G, { op: 0.5, name: "Margin rule" }),
        R(43, -B, 0.8, H + 2 * B, G, { op: 0.5, name: "Margin rule" }),
        R(W - 70, -B, 0.6, H + 2 * B, G, { op: 0.35, name: "Column rule" }),
        T("Daniel Okafor, CPA", 54, 18, 190, { size: 17, bold: true, color: G }),
        ...["Certified Public Accountant", "", "+1 555 0193 220", "daniel@example.com", "okafor-cpa.example.com", "18 Market Square, Boston MA"].map((t, r) => t && T(t, 54, rowY(r) + 6, W - 140, { size: 9, color: r ? INK : G, italic: !r })),
        ...["TAX", "AUDIT", "PAYROLL", "ADVICE"].map((t, r) => T(t, W - 64, rowY(r) + 6.5, 50, { size: 7.5, family: "mono", bold: true, color: G, align: "right" })),
      ]),
      page(G, [
        ...[20, 34, 28, 50, 68].map((h, i) => R(W / 2 - 56 + i * 24, 116 - h, 16, h, "#cfe3d9", { op: 0.55 + i * 0.1, name: "Bar" })),
        R(W / 2 - 80, 116, 160, 1, "#cfe3d9", { name: "Baseline" }),
        T("OKAFOR & CO.", 20, 132, W - 40, { size: 16, bold: true, color: WHITE, align: "center", ls: 4 }),
        T("Accounting · Tax · Advisory", 20, 158, W - 40, { size: 9, color: "#cfe3d9", align: "center" }),
      ]),
    ];
  });

  /* 4 Veterinarian: big paw emblem (square) */
  tpl("paw-vet-card-bc5", "Paw print vet clinic business card", "business-card-square", tags("vet veterinarian animal pet clinic dog cat paw square"), (W, H) => [
    page("#fff4e8", [
      C(60, 20, 120, 120, "#2f7d6d", { name: "Emblem" }),
      C(96, 74, 48, 40, WHITE, { name: "Paw pad" }),
      C(82, 54, 16, 20, WHITE, { rot: -25, name: "Paw toe" }),
      C(101, 40, 16, 22, WHITE, { rot: -8, name: "Paw toe" }),
      C(123, 40, 16, 22, WHITE, { rot: 8, name: "Paw toe" }),
      C(142, 54, 16, 20, WHITE, { rot: 25, name: "Paw toe" }),
      T("Happy Tails", 14, 150, W - 28, { size: 22, bold: true, color: "#2f7d6d", align: "center" }),
      T("VETERINARY CLINIC", 14, 180, W - 28, { size: 8.5, bold: true, color: "#e0704a", align: "center", ls: 3 }),
      T("Dr. Sofia Marin, DVM", 14, 202, W - 28, { size: 9.5, color: INK, align: "center" }),
    ]),
    page("#2f7d6d", [
      C(170, -40, 110, 110, "#f28c6b", { op: 0.9, name: "Corner circle" }),
      T("Dr. Sofia Marin", 22, 26, 150, { size: 16, bold: true, color: WHITE }),
      T("Veterinarian, DVM", 22, 48, 150, { size: 9.5, color: "#bfe6dc" }),
      rows([["icon-call", "+1 555 0177 240"], ["icon-mail", "sofia@example.com"], ["icon-location", "5 Oak Road, Austin TX"], ["icon-clock", "Mon – Sat, 8:00 – 19:00"]], 22, 78, 21, 9, WHITE, "#2f7d6d", WHITE, 180),
      R(-B, 186, W + 2 * B, H - 186 + B, "#f28c6b", { name: "Emergency band" }),
      T("24/7 EMERGENCY  +1 555 0177 911", 14, 206, W - 28, { size: 9.5, bold: true, color: WHITE, align: "center" }),
    ]),
  ]);

  /* 5 Musician / DJ: neon equalizer bars, vinyl and QR on the back (US, dark) */
  tpl("dj-equalizer-card-bc5", "Neon equalizer DJ business card", "business-card-us", tags("dj musician music band producer club party neon dark equalizer qr code"), (W, H) => {
    const hs = [26, 40, 58, 34, 66, 48, 30, 54, 70, 44, 62, 38, 52, 68, 36, 56, 42, 60, 32, 46];
    const col = (i) => (i < 10 ? mix("#22d3ee", "#8b5cf6", i / 9) : mix("#8b5cf6", "#ff3ea5", (i - 10) / 9));
    return [
      page("#0d0b1a", [
        ...hs.map((h, i) => R(21 + i * 15, H - h, 9, h + B, col(i), { op: 0.92, radius: 2, name: "Equalizer bar" })),
        T("DJ NOVA", 22, 22, 170, { size: 34, bold: true, color: WHITE, ls: 2 }),
        T("Live sets · Weddings · Club nights", 22, 66, 220, { size: 9.5, color: "#22d3ee" }),
        T("BOOKINGS\n+1 555 0166 404\nnova@example.com", 200, 24, 114, { size: 8, color: WHITE, align: "right", lh: 1.45 }),
      ]),
      page("#0d0b1a", [
        C(30, 26, 140, 140, "#16132a", { name: "Record" }),
        C(42, 38, 116, 116, "none", { stroke: "#2c2850", sw: 1, name: "Groove" }),
        C(54, 50, 92, 92, "none", { stroke: "#2c2850", sw: 1, name: "Groove" }),
        C(66, 62, 68, 68, "none", { stroke: "#2c2850", sw: 1, name: "Groove" }),
        C(76, 72, 48, 48, "#ff3ea5", { name: "Label" }),
        C(97, 93, 6, 6, "#0d0b1a", { name: "Hole" }),
        qr(206, 30, 90, "#0d0b1a", "#ffffff", 11),
        T("SCAN FOR MIXES", 196, 128, 110, { size: 8, bold: true, color: "#22d3ee", align: "center", ls: 2 }),
        T("djnova.example.com", 196, 142, 110, { size: 8, color: WHITE, align: "center" }),
      ]),
    ];
  });

  /* 6 Tattoo artist: framed nautical star, appointment card back (vertical, dark luxe) */
  tpl("tattoo-ink-card-bc5", "Ink studio tattoo business card", "business-card-vertical", tags("tattoo artist ink studio piercing dark luxe black appointment card vertical"), (W, H) => [
    page("#0b0b0b", [
      R(10, 10, W - 20, H - 20, "none", { stroke: "#efe6d8", sw: 1, name: "Frame" }),
      R(15, 15, W - 30, H - 30, "none", { stroke: "#efe6d8", sw: 0.5, op: 0.6, name: "Inner frame" }),
      C(46, 46, 100, 100, "none", { stroke: "#efe6d8", sw: 1.2, name: "Ring" }),
      S("star", 59, 59, 74, 74, "#efe6d8", { name: "Star" }),
      S("star", 78, 78, 36, 36, "#a3242c", { name: "Inner star" }),
      T("INK & IRON", 20, 166, W - 40, { size: 22, bold: true, family: "serif", color: "#efe6d8", align: "center", ls: 2 }),
      T("TATTOO STUDIO", 20, 196, W - 40, { size: 8.5, bold: true, color: "#c8424a", align: "center", ls: 5 }),
      R(76, 218, 40, 1, "#efe6d8", { name: "Rule" }),
      T("Rafe Cortez", 20, 228, W - 40, { size: 12, family: "serif", italic: true, color: "#efe6d8", align: "center" }),
      T("Custom work · Cover-ups · Fine line", 20, 248, W - 40, { size: 7.5, color: "#b9ad9b", align: "center" }),
      T("@inkandiron.example\n+1 555 0124 913", 20, 278, W - 40, { size: 8, color: "#efe6d8", align: "center", lh: 1.5 }),
    ]),
    page("#efe6d8", [
      T("YOUR NEXT SESSION", 20, 28, W - 40, { size: 11, bold: true, color: "#0b0b0b", align: "center", ls: 2 }),
      S("star", 88, 50, 16, 16, "#a3242c", { name: "Star" }),
      ...["DATE", "TIME", "ARTIST"].flatMap((t, i) => [
        T(t, 22, 80 + i * 40, 100, { size: 7.5, bold: true, color: "#6b5f55", ls: 2 }),
        R(22, 110 + i * 40, W - 44, 0.8, "#0b0b0b", { name: "Write-in line" }),
      ]),
      T("Please give 48 hours notice to change\na booking. Deposits are non-refundable.", 22, 206, W - 44, { size: 7.5, color: "#5a5048", align: "center", lh: 1.4 }),
      R(-B, 268, W + 2 * B, H - 268 + B, "#0b0b0b", { name: "Footer band" }),
      T("12 Mercer Street, Brooklyn NY\nTue – Sat · 12:00 – 20:00", 14, 286, W - 28, { size: 8, color: "#efe6d8", align: "center", lh: 1.5 }),
    ]),
  ]);

  /* 7 Landscaper: layered rolling hills (US) */
  tpl("garden-hills-card-bc5", "Rolling hills landscaper business card", "business-card-us", tags("landscaper gardener garden landscaping lawn care nature green hills"), (W, H) => [
    page("#f3f8ec", [
      C(270, 24, 40, 40, "#f4b740", { name: "Sun" }),
      C(-80, 112, 300, 140, "#9bc46b", { name: "Back hill" }),
      C(150, 104, 300, 160, "#5f9e46", { name: "Middle hill" }),
      C(-60, 140, 460, 140, "#2f6b3a", { name: "Front hill" }),
      T("Greenway Gardens", 22, 24, 230, { size: 22, bold: true, family: "serif", color: "#2f6b3a" }),
      T("Landscaping and garden care", 22, 54, 230, { size: 10.5, color: "#4b8a35" }),
      T("Owen Price · Head Gardener", 22, 74, 230, { size: 9, color: INK }),
      T("+1 555 0187 260  ·  example.com/greenway", 22, 168, 292, { size: 8.5, color: WHITE }),
    ]),
    page("#2f6b3a", [
      C(-40, 168, 420, 80, "#245530", { name: "Hill" }),
      T("WHAT WE DO", 22, 20, 160, { size: 9, bold: true, color: "#c8e6a0", ls: 3 }),
      ...[["Garden design", "Irrigation"], ["Lawn care", "Hedge trimming"], ["Planting", "Seasonal clean-up"]].flatMap((pair, r) => pair.flatMap((t, c) => [
        E("icon-leaf", 22 + c * 150, 44 + r * 20, 11, { c1: "#c8e6a0", c3: "#2f6b3a" }),
        T(t, 39 + c * 150, 43 + r * 20, 125, { size: 9, color: WHITE }),
      ])),
      R(22, 112, W - 44, 0.8, "#c8e6a0", { op: 0.5, name: "Divider" }),
      T("+1 555 0187 260\nowen@example.com", 22, 124, 140, { size: 8.5, color: WHITE, lh: 1.5 }),
      T("example.com/greenway\nPortland, Oregon", W - 22 - 140, 124, 140, { size: 8.5, color: WHITE, align: "right", lh: 1.5 }),
    ]),
  ]);

  /* 8 Interior designer: paint chip strip, fanned swatches on the back (EU) */
  tpl("swatch-interior-card-bc5", "Paint swatch interior designer business card", "business-card-eu", tags("interior designer interiors home decor paint colour swatch palette stylist"), (W, H) => {
    const chips = [["#e8d9c8", "OAT"], ["#d9c3a5", "LINEN"], ["#b9805a", "CLAY"], ["#7d8b74", "SAGE"], ["#3f4f5a", "SLATE"]];
    const cw = (W + 2 * B - 12) / 5;
    return [
      page("#faf7f2", [
        ...chips.flatMap(([c, n], i) => {
          const cx = -B + i * (cw + 3), lx = Math.max(14, cx + 8), rx = Math.min(W - 14, cx + cw - 6);
          return [R(cx, -B, cw, 82, c, { name: "Paint chip" }), T(n, lx, 76, rx - lx, { size: 7, family: "mono", color: "#6f665c", ls: 1 })];
        }),
        T("Claire Dubois", 22, 102, 220, { size: 20, family: "serif", color: "#2d2a26" }),
        T("Interior Designer", 22, 128, 220, { size: 9.5, color: "#b9805a", ls: 1 }),
        T("+1 555 0151 388  ·  claire@example.com\nduboisinteriors.example.com", 22, 158, W - 44, { size: 8.2, color: "#2d2a26", lh: 1.5 }),
      ]),
      page("#3f4f5a", [
        R(38, 50, 70, 108, "#e8d9c8", { radius: 6, rot: -16, name: "Swatch" }),
        R(56, 46, 70, 108, "#d9c3a5", { radius: 6, rot: -6, name: "Swatch" }),
        R(74, 48, 70, 108, "#b9805a", { radius: 6, rot: 5, name: "Swatch" }),
        R(92, 54, 70, 108, "#7d8b74", { radius: 6, rot: 15, name: "Swatch" }),
        T("DUBOIS\nINTERIORS", 184, 72, 120, { size: 18, bold: true, family: "serif", color: WHITE, lh: 1.15, ls: 2 }),
        R(184, 122, 28, 1.5, "#d9c3a5", { name: "Rule" }),
        T("Calm, lived-in spaces", 184, 132, 120, { size: 8.5, italic: true, family: "serif", color: "#e8d9c8" }),
      ]),
    ];
  });

  /* 9 Travel agent: dotted flight route arc (US) */
  tpl("travel-route-card-bc5", "Flight route travel agent business card", "business-card-us", tags("travel agent agency tour holiday flight trip vacation route map"), (W, H) => {
    const P = (t) => [(1 - t) ** 2 * 30 + 2 * t * (1 - t) * 160 + t * t * 300, (1 - t) ** 2 * 104 + t * t * 50];
    const dots = [];
    for (let t = 0.07; t < 0.93; t += 0.032) if (Math.abs(t - 0.5) > 0.06) { const [x, y] = P(t); dots.push(C(x - 1.5, y - 1.5, 3, 3, "#f2994a", { name: "Route dot" })); }
    const [px, py] = P(0.5);
    return [
      page("#fffaf2", [
        C(196, -50, 190, 190, "#1f6f9f", { op: 0.07, name: "Globe" }),
        ...dots,
        S("triangle", px - 7, py - 8, 14, 16, "#1f6f9f", { rot: 79, name: "Plane" }),
        C(24, 98, 12, 12, "#1f6f9f", { name: "Start pin" }),
        C(27.5, 101.5, 5, 5, WHITE, { name: "Start pin" }),
        E("icon-location", 289, 28, 22, { c1: "#f2994a" }),
        T("Nadia Brooks", 22, 122, 200, { size: 18, bold: true, color: "#1b2b3a" }),
        T("Travel Consultant · Wanderwise Travel", 22, 146, 292, { size: 9, color: "#1f6f9f" }),
        T("+1 555 0139 512  ·  nadia@example.com", 22, 164, 292, { size: 8.5, color: "#1b2b3a" }),
      ]),
      page(["#1f6f9f", "#14506f", 160], [
        T("Where to next?", 22, 26, 292, { size: 22, family: "serif", italic: true, color: WHITE }),
        T("Flights · Tours · Honeymoons · Visa help", 22, 58, 292, { size: 9.5, color: "#cfe8f5" }),
        ...["Lisbon", "Bali", "Kyoto", "Cusco"].flatMap((t, i) => [
          R(22 + i * 62, 86, 54, 20, WHITE, { radius: 10, op: 0.16, name: "Tag" }),
          T(t, 22 + i * 62, 90.9, 54, { size: 8.5, color: WHITE, align: "center" }),
        ]),
        E("icon-globe", W - 22 - 40, 128, 40, { c1: "#ffd8a8", c3: "#1a5f86" }),
        T("wanderwise.example.com", 22, 140, 220, { size: 9.5, bold: true, color: "#ffd8a8" }),
        T("9 Bay Street, Miami FL", 22, 156, 220, { size: 8.5, color: WHITE }),
      ]),
    ];
  });

  /* 10 Makeup artist: circle portrait, eyeshadow palette back (vertical) */
  tpl("makeup-palette-card-bc5", "Blush palette makeup artist business card", "business-card-vertical", tags("makeup artist beauty bridal mua cosmetics blush pink portrait photo vertical"), (W, H) => [
    page("#fbe9e4", [
      C(36, 32, 120, 120, "#f4cfc6", { name: "Photo backdrop" }),
      face(CAST, F(44, 40, 104, 104, { shape: "circle", name: "Portrait photo" }), KIND.beauty + " portrait", { sex: "f" }),
      E("deco-sparkles", 146, 22, 26, { c1: "#c9a46a", c2: "#c9667a" }),
      T("Bella Moreau", 16, 170, W - 32, { size: 22, family: "serif", italic: true, color: "#5a2a35", align: "center" }),
      T("MAKEUP ARTIST", 16, 200, W - 32, { size: 8.5, bold: true, color: "#b4546a", align: "center", ls: 4 }),
      E("line-ornament", 56, 218, 80, { c1: "#c9a46a" }),
      T("Bridal · Editorial · Lessons", 16, 234, W - 32, { size: 8.5, color: "#5a2a35", align: "center" }),
      T("+1 555 0118 646\nbella@example.com\n@bellamoreau.example", 16, 268, W - 32, { size: 8, color: "#5a2a35", align: "center", lh: 1.5 }),
    ]),
    page("#5a2a35", [
      R(36, 56, 120, 86, "#3e1c25", { radius: 10, name: "Palette" }),
      ...["#f2c4b8", "#d98a8a", "#b0556a", "#e8c39e", "#a87452", "#6b3b4a"].map((c, i) => C(46 + (i % 3) * 36, 66 + Math.floor(i / 3) * 36, 28, 28, c, { stroke: "#c9a46a", sw: 1.2, name: "Shade" })),
      T("BELLA MOREAU", 16, 166, W - 32, { size: 15, bold: true, family: "serif", color: WHITE, align: "center", ls: 2 }),
      T("Beauty for your big day", 16, 190, W - 32, { size: 9, italic: true, family: "serif", color: "#f4cfc6", align: "center" }),
      R(46, 230, 100, 24, "#c9a46a", { radius: 12, name: "Button" }),
      T("BOOK A TRIAL", 46, 237.2, 100, { size: 8, bold: true, color: "#3e1c25", align: "center", ls: 1 }),
      T("bellamoreau.example.com", 16, 286, W - 32, { size: 8, color: "#f4cfc6", align: "center" }),
    ]),
  ]);

  /* 11 Chef / caterer: plate and cutlery, chalkboard back (US) */
  tpl("chef-plate-card-bc5", "Plate and cutlery catering business card", "business-card-us", tags("chef caterer catering cook kitchen food restaurant private dining menu"), (W, H) => {
    const ch = "#2b2b2b", ac = "#b5523b";
    return [
      page("#f7f1e8", [
        C(40, 36, 120, 120, WHITE, { stroke: "#e3d9ca", sw: 2, name: "Plate" }),
        C(56, 52, 88, 88, "none", { stroke: "#e3d9ca", sw: 1.2, name: "Plate rim" }),
        ...[19, 23, 27].map((x) => R(x, 52, 2, 20, ch, { radius: 1, name: "Fork tine" })),
        R(18, 70, 12, 6, ch, { radius: 3, name: "Fork" }),
        R(21.5, 74, 5, 70, ch, { radius: 2.5, name: "Fork handle" }),
        R(170, 52, 9, 52, ch, { radius: 4, name: "Knife blade" }),
        R(171, 102, 7, 42, ch, { radius: 3, name: "Knife handle" }),
        T("SC", 40, 78, 120, { size: 30, bold: true, family: "serif", color: ac, align: "center" }),
        T("Sam Carter", 196, 44, 128, { size: 18, bold: true, family: "serif", color: ch }),
        T("Chef and Caterer", 196, 68, 128, { size: 9.5, color: ac }),
        R(196, 88, 24, 2, ac, { name: "Rule" }),
        T("+1 555 0162 845\nsam@example.com\ncarterkitchen.example.com", 196, 100, 128, { size: 8, color: ch, lh: 1.55 }),
      ]),
      page(ch, [
        T("Catering for every table", 22, 26, W - 44, { size: 16, italic: true, family: "serif", color: WHITE, align: "center" }),
        ...[["WEDDINGS", "50 to 300 guests"], ["CORPORATE", "Lunches and launches"], ["PRIVATE", "Chef at your home"]].flatMap(([h, d], i) => [
          T(h, 22 + i * 98, 70, 96, { size: 8, bold: true, color: "#f0c987", align: "center", ls: 1.5 }),
          T(d, 22 + i * 98, 84, 96, { size: 8, color: "#d8d2c8", align: "center" }),
        ]),
        R(119, 66, 0.8, 32, "#5a5a5a", { name: "Column line" }),
        R(217, 66, 0.8, 32, "#5a5a5a", { name: "Column line" }),
        E("line-ornament", 128, 122, 80, { c1: "#f0c987" }),
        T("Tasting menus on request  ·  carterkitchen.example.com", 22, 148, W - 44, { size: 8.5, color: WHITE, align: "center" }),
      ]),
    ];
  });

  /* 12 Insurance agent: split header with a shield on the seam, 2 × 2 cover tiles on the back (EU) */
  tpl("insurance-shield-card-bc5", "Shield split insurance agent business card", "business-card-eu", tags("insurance agent broker cover policy home auto life business shield navy"), (W, H) => {
    const N = "#16325c", SK = "#3d7dd8";
    const tw = (W - 50) / 2;
    return [
      page("#ffffff", [
        R(-B, -B, W + 2 * B, 92 + B, N, { name: "Header" }),
        E("shape-shield", 24, 58, 52, { c1: SK }),
        E("icon-check", 37, 72, 26, { c1: WHITE }),
        T("SHIELDLINE INSURANCE", 92, 26, 210, { size: 11, bold: true, color: WHITE, ls: 2 }),
        T("Home · Auto · Life · Business", 92, 46, 210, { size: 8.5, color: "#b8cdf0" }),
        T("Marcus Webb", 92, 102, 210, { size: 17, bold: true, color: N }),
        T("Licensed Insurance Agent", 92, 125, 210, { size: 9, color: SK }),
        T("+1 555 0147 305  ·  marcus@example.com\n2 Grove Avenue, Columbus OH", 24, 158, W - 48, { size: 8.3, color: INK, lh: 1.5 }),
      ]),
      page("#eef3fb", [
        T("WHAT WE COVER", 20, 20, W - 40, { size: 9, bold: true, color: N, align: "center", ls: 3 }),
        ...[["icon-home", "Home", "Property and contents"], ["icon-key", "Auto", "Cars and motorbikes"], ["icon-heart", "Life", "Family protection"], ["icon-money", "Business", "Liability and assets"]].flatMap(([ic, t, d], i) => {
          const x = 20 + (i % 2) * (tw + 10), y = 42 + Math.floor(i / 2) * 66;
          return [
            R(x, y, tw, 58, WHITE, { radius: 8, stroke: "#d5e0f2", sw: 1, name: "Tile" }),
            E(ic, x + 12, y + 17, 24, { c1: SK, c2: SK, c3: "#e3ecfa" }),
            T(t, x + 44, y + 14, tw - 52, { size: 10.5, bold: true, color: N }),
            T(d, x + 44, y + 31, tw - 52, { size: 7.5, color: MUTED }),
          ];
        }),
        T("Get a free quote: example.com/quote", 20, 180, W - 40, { size: 8.5, bold: true, color: N, align: "center" }),
      ]),
    ];
  });

  /* 13 Marketing consultant: one big number, bold statement back (US) */
  tpl("growth-stat-card-bc5", "Big number marketing consultant business card", "business-card-us", tags("marketing consultant growth strategy agency digital ads bold yellow typographic statistic"), (W, H) => [
    page("#ffd23f", [
      T("+240%", 18, 14, 228, { size: 64, bold: true, color: "#111111", lh: 1 }),
      E("arrow-growth", 252, 24, 64, { c1: "#e5431f" }),
      T("average lead growth for our clients*", 22, 82, 230, { size: 9.5, color: "#111111" }),
      R(22, 110, W - 44, 1.5, "#111111", { name: "Divider" }),
      T("Jordan Lee", 22, 122, 150, { size: 15, bold: true, color: "#111111" }),
      T("Growth Marketing Consultant", 22, 142, 150, { size: 8.5, color: "#111111" }),
      T("jordan@example.com\n+1 555 0155 718\nleegrowth.example.com", 180, 122, 134, { size: 8, color: "#111111", align: "right", lh: 1.5 }),
      T("*Example figure for this template. Results vary.", 22, 166, W - 44, { size: 6.5, color: "#5c4a00" }),
    ]),
    page("#111111", [
      T("Strategy.\nContent.", 22, 30, 190, { size: 26, bold: true, color: WHITE, lh: 1.05 }),
      T("Results.", 22, 85, 190, { size: 26, bold: true, color: "#ffd23f", lh: 1.05 }),
      C(232, 40, 82, 82, "#ff5a36", { name: "Badge" }),
      T("FREE\nAUDIT", 232, 67.8, 82, { size: 12, bold: true, color: WHITE, align: "center", lh: 1.1 }),
      T("Book a 20-minute call: leegrowth.example.com/call", 22, 150, W - 44, { size: 8.5, color: "#d0d0d0" }),
    ]),
  ]);

  /* 14 Pharmacist: two-tone capsule (square) */
  tpl("pharmacy-capsule-card-bc5", "Capsule pharmacy business card", "business-card-square", tags("pharmacist pharmacy chemist medicine drugstore health capsule pill square blue"), (W, H) => {
    const BL = "#1d4ed8", LB = "#93c5fd";
    return [
      page("#f2f7ff", [
        R(26, 32, 26, 10, "#bfdbfe", { radius: 5, rot: -30, name: "Small pill" }),
        R(186, 40, 26, 10, "#bfdbfe", { radius: 5, rot: 28, name: "Small pill" }),
        C(30, 112, 12, 12, "#bfdbfe", { name: "Tablet" }),
        R(190, 112, 22, 9, "#bfdbfe", { radius: 4.5, rot: -18, name: "Small pill" }),
        R(50, 60, 98, 56, BL, { radius: 28, name: "Capsule" }),
        R(120, 60, 42, 56, LB, { name: "Capsule" }),
        C(134, 60, 56, 56, LB, { name: "Capsule" }),
        R(64, 70, 30, 6, WHITE, { radius: 3, op: 0.45, name: "Shine" }),
        T("CORNER PHARMACY", 14, 146, W - 28, { size: 14, bold: true, color: "#0f2a6b", align: "center", ls: 1.5 }),
        T("Lena Park, PharmD", 14, 168, W - 28, { size: 10, color: INK, align: "center" }),
        T("Pharmacist in charge", 14, 182, W - 28, { size: 8.5, color: MUTED, align: "center" }),
        R(-B, 206, W + 2 * B, H - 206 + B, BL, { name: "Footer band" }),
        T("Open 7 days · 8:00 – 22:00", 14, 214, W - 28, { size: 8.5, bold: true, color: WHITE, align: "center" }),
      ]),
      page(BL, [
        R(170, 18, 50, 20, "none", { stroke: LB, sw: 1.5, radius: 10, rot: -35, name: "Capsule outline" }),
        T("Lena Park", 20, 26, 150, { size: 18, bold: true, color: WHITE }),
        T("PharmD · Corner Pharmacy", 20, 50, 170, { size: 9, color: "#bfdbfe" }),
        rows([["icon-call", "+1 555 0104 330"], ["icon-mail", "lena@example.com"], ["icon-location", "300 Main Street, Reno NV"], ["icon-globe", "cornerpharmacy.example.com"]], 20, 82, 21, 8.5, WHITE, BL, WHITE, 180),
        R(20, 184, W - 40, 28, WHITE, { radius: 14, name: "Button" }),
        T("Free prescription delivery", 20, 192.6, W - 40, { size: 9, bold: true, color: BL, align: "center" }),
      ]),
    ];
  });

  /* 15 Tailor / fashion: measuring tape edge, stitched border back (vertical) */
  tpl("tailor-tape-card-bc5", "Measuring tape tailor business card", "business-card-vertical", tags("tailor fashion bespoke suit alterations sewing atelier dressmaker measuring tape vertical"), (W, H) => {
    const ink = "#222222", tape = "#f2c94c", wine = "#7a1f2b";
    const ticks = [];
    for (let y = 8, i = 1; y <= H - 8; y += 8, i++) ticks.push(R(i % 5 === 0 ? 22 : 28, y, i % 5 === 0 ? 12 : 6, 1, ink, { name: "Tape tick" }));
    const stitch = [];
    for (let x = 18; x <= W - 23; x += 9) stitch.push(R(x - 16, 0, 5, 1.2, tape, { name: "Stitch" }), R(x - 16, H - 33.2, 5, 1.2, tape, { name: "Stitch" }));
    for (let y = 18; y <= H - 23; y += 9) stitch.push(R(0, y - 16, 1.2, 5, tape, { name: "Stitch" }), R(W - 33.2, y - 16, 1.2, 5, tape, { name: "Stitch" }));
    return [
      page("#f8f3ea", [
        R(-B, -B, 34 + B, H + 2 * B, tape, { name: "Measuring tape" }),
        ...ticks,
        ...[1, 2, 3, 4, 5, 6, 7].map((n) => T(String(n), 10, n * 40 - 3.7, 11, { size: 7, bold: true, color: ink })),
        T("Atelier\nVance", 52, 38, 128, { size: 28, bold: true, family: "serif", color: ink, lh: 1.05 }),
        T("BESPOKE TAILORING", 52, 104, 128, { size: 7.5, bold: true, color: wine, ls: 2 }),
        R(52, 124, 30, 1.5, wine, { name: "Rule" }),
        T("Thomas Vance\nMaster Tailor", 52, 138, 128, { size: 10, color: ink, lh: 1.4 }),
        E("line-wavy", 52, 196, 92, { c1: wine }),
        C(144, 199.6, 9, 4.4, "none", { stroke: ink, sw: 1, name: "Needle eye" }),
        R(152.5, 200.7, 26, 2.2, ink, { radius: 1.1, name: "Needle" }),
        T("+1 555 0129 474\nthomas@example.com\n31 Savile Lane\nChicago IL", 52, 252, 128, { size: 8, color: ink, lh: 1.5 }),
      ]),
      page(ink, [
        group(16, 16, W - 32, H - 32, stitch, "Stitched border"),
        T("AV", 16, 104, W - 32, { size: 54, bold: true, family: "serif", color: tape, align: "center", lh: 1 }),
        T("ATELIER VANCE", 26, 166, W - 52, { size: 10, bold: true, color: WHITE, align: "center", ls: 4 }),
        T("Made to measure since 1998", 26, 186, W - 52, { size: 8.5, italic: true, family: "serif", color: "#cfc6b8", align: "center" }),
        R(W / 2 - 10, 212, 20, 1, tape, { name: "Rule" }),
        T("By appointment only", 26, 224, W - 52, { size: 8, color: tape, align: "center", ls: 1 }),
      ]),
    ];
  });

  /* 16 Mechanic: hazard stripe band, bold slogan back (US) */
  tpl("mechanic-hazard-card-bc5", "Hazard stripe mechanic business card", "business-card-us", tags("mechanic auto repair garage car service workshop motor hazard stripes yellow"), (W, H) => {
    const D = "#1f2326", Y = "#f5c518";
    return [
      page(D, [
        R(-B, 156, W + 2 * B, H - 156 + B, Y, { name: "Hazard band" }),
        ...Array.from({ length: 14 }, (_, i) => R(-20 + i * 28, 140, 12, 80, D, { rot: 35, name: "Hazard stripe" })),
        E("icon-settings", 22, 22, 34, { c1: Y }),
        T("RIVERA AUTO REPAIR", 66, 22, 250, { size: 15, bold: true, color: WHITE, ls: 1 }),
        T("Brakes · Engines · Diagnostics · Tyres", 66, 42, 250, { size: 8.5, color: "#9aa3ab" }),
        T("Luis Rivera", 22, 76, 120, { size: 13, bold: true, color: Y }),
        T("Owner and Master Technician", 22, 94, 124, { size: 8.5, color: WHITE }),
        T("+1 555 0173 640\nservice@example.com\n77 Industrial Way, Tulsa OK", 150, 76, 164, { size: 8, color: WHITE, align: "right", lh: 1.5 }),
        T("OPEN MON – SAT  7:30 – 18:00", 22, 126, 292, { size: 8, bold: true, color: Y, ls: 1.5 }),
      ]),
      page(Y, [
        T("WE FIX IT\nRIGHT.", 22, 26, 200, { size: 30, bold: true, color: D, lh: 1 }),
        T("Free brake check with every oil change", 22, 98, 200, { size: 9, color: D }),
        E("icon-settings", 230, 22, 86, { c1: D }),
        R(-B, 146, W + 2 * B, H - 146 + B, D, { name: "Footer band" }),
        T("Book a service: example.com/rivera  ·  +1 555 0173 640", 22, 164, W - 44, { size: 8.5, color: WHITE, align: "center" }),
      ]),
    ];
  });

  /* 17 Event photo booth: film strip with three photo frames, QR on the back (EU) */
  tpl("photobooth-film-card-bc5", "Film strip photo booth business card", "business-card-eu", tags("photo booth event party wedding hire props prints film strip pink qr code"), (W, H) => {
    const film = "#141414", pink = "#ff4f8b";
    const holes = [];
    for (let x = 6; x + 8 <= W - 4; x += 16) holes.push(R(x - 6, 0, 8, 6, WHITE, { radius: 1.5, name: "Sprocket hole" }), R(x - 6, 74, 8, 6, WHITE, { radius: 1.5, name: "Sprocket hole" }));
    const fx = (W - 3 * 80 - 2 * 14) / 2;
    return [
      page("#fff0f6", [
        R(-B, 20, W + 2 * B, 92, film, { name: "Film strip" }),
        group(6, 26, holes.length ? holes[holes.length - 1].x + 8 : 8, 80, holes, "Sprocket holes"),
        ...[0, 1, 2].map((i) => face(CAST, F(fx + i * 94, 36, 80, 60, { name: "Booth photo" }), ["friends group selfie young", "couple love happy", "family parents mother father"][i], { group: i !== 1 })),
        T("SNAPBOX", 22, 124, 140, { size: 24, bold: true, color: film, ls: 1 }),
        T("Photo Booth Hire", 22, 154, 140, { size: 10, bold: true, color: pink }),
        T("Weddings · Parties · Launches\n+1 555 0115 822\nhello@example.com", W - 22 - 130, 126, 130, { size: 8, color: film, align: "right", lh: 1.5 }),
        T("Mia Torres, Event Manager", 22, 178, 200, { size: 8.5, color: MUTED }),
      ]),
      page(pink, [
        T("Strike a pose!", 22, 30, 170, { size: 22, bold: true, color: WHITE }),
        T("Unlimited prints, fun props and an online\ngallery for every guest.", 22, 62, 170, { size: 9, color: WHITE, lh: 1.4 }),
        R(22, 106, 124, 24, "#ffd84d", { radius: 12, name: "Price tag" }),
        T("Packages from $299", 22, 112.6, 124, { size: 9, bold: true, color: film, align: "center" }),
        E("icon-camera", 22, 164, 22, { c1: WHITE, c3: pink }),
        T("snapbox.example.com", 50, 169, 150, { size: 10, bold: true, color: WHITE }),
        qr(W - 22 - 86, 30, 86, film, WHITE, 23),
        T("Scan to see\nyour photos", W - 22 - 86, 124, 86, { size: 8, bold: true, color: WHITE, align: "center", lh: 1.3 }),
      ]),
    ];
  });

  /* 18 NGO coordinator: overlapping community circles (square) */
  tpl("ngo-circles-card-bc5", "Community circles nonprofit business card", "business-card-square", tags("ngo nonprofit charity volunteer community coordinator foundation social square"), (W, H) => {
    const tealD = "#264653";
    return [
      page("#fffaf0", [
        C(66, 38, 72, 72, "#f4a259", { op: 0.85, name: "Circle" }),
        C(102, 38, 72, 72, "#5b8e7d", { op: 0.85, name: "Circle" }),
        C(84, 69, 72, 72, "#bc4b51", { op: 0.85, name: "Circle" }),
        T("Common Ground", 14, 154, W - 28, { size: 18, bold: true, color: tealD, align: "center" }),
        T("COMMUNITY ALLIANCE", 14, 178, W - 28, { size: 8, bold: true, color: "#4a7a6a", align: "center", ls: 3 }),
        T("Neighbours helping neighbours since 2011", 14, 200, W - 28, { size: 8, italic: true, family: "serif", color: MUTED, align: "center" }),
      ]),
      page(tealD, [
        C(186, -24, 80, 80, "#2f5966", { name: "Circle" }),
        C(200, 44, 18, 18, "#e9c46a", { name: "Dot" }),
        T("Hannah Osei", 22, 24, 160, { size: 18, bold: true, color: WHITE }),
        T("Volunteer Coordinator", 22, 48, 160, { size: 9.5, color: "#f4a259" }),
        rows([["icon-call", "+1 555 0120 774"], ["icon-mail", "hannah@example.org"], ["icon-location", "88 Hope Street, Dayton OH"], ["icon-globe", "commonground.example.org"]], 22, 82, 21, 8.5, "#e9c46a", tealD, WHITE, 180),
        R(22, 178, W - 44, 30, "#f4a259", { radius: 15, name: "Button" }),
        T("Volunteer with us", 22, 186, W - 44, { size: 10, bold: true, color: tealD, align: "center" }),
      ]),
    ];
  });

  /* 19 Software developer: code editor front, terminal + QR back (US) */
  tpl("code-editor-card-bc5", "Code editor developer business card", "business-card-us", tags("software developer programmer engineer coder web app code editor terminal dark tech qr code"), (W, H) => {
    const ch = 5.1, x0 = 36, y0 = 36, lh = 14.875;
    const tok = (line, col, text, color) => T(text, x0 + col * ch, y0 + line * lh, text.length * ch + 4, { size: 8.5, family: "mono", color, lh: 1.75 });
    const PU = "#cba6f7", GR = "#a6e3a1", BL = "#89b4fa", TX = "#cdd6f4", CM = "#7f849c";
    return [
      page("#1e1e2e", [
        R(-B, -B, W + 2 * B, 36, "#181825", { name: "Title bar" }),
        C(14, 8, 8, 8, "#f38ba8", { name: "Window dot" }),
        C(26, 8, 8, 8, "#f9e2af", { name: "Window dot" }),
        C(38, 8, 8, 8, "#a6e3a1", { name: "Window dot" }),
        T("contact.js", 128, 10, 80, { size: 8, family: "mono", color: "#a6adc8", align: "center" }),
        T("1\n2\n3\n4\n5\n6\n7", 12, y0, 16, { size: 8.5, family: "mono", color: "#585b70", align: "right", lh: 1.75 }),
        tok(0, 0, "const", PU), tok(0, 6, "dev = {", TX),
        tok(1, 2, "name:", BL), tok(1, 9, "\"Priya Shah\",", GR),
        tok(2, 2, "role:", BL), tok(2, 9, "\"Full-stack developer\",", GR),
        tok(3, 2, "email:", BL), tok(3, 9, "\"priya@example.com\",", GR),
        tok(4, 2, "phone:", BL), tok(4, 9, "\"+1 555 0136 207\"", GR),
        tok(5, 0, "};", TX),
        tok(6, 0, "// open to freelance work", CM),
        T("</>", 232, 52, 90, { size: 40, bold: true, family: "mono", color: "#313244", align: "center" }),
        R(-B, 166, W + 2 * B, H - 166 + B, "#89b4fa", { name: "Status bar" }),
        T("main  ·  JavaScript  ·  UTF-8", 14, 171, 200, { size: 7.5, family: "mono", color: "#11111b" }),
      ]),
      page("#11111b", [
        ...[["$ whoami", GR], ["priya shah · full-stack developer", TX], ["$ ls skills/", GR], ["react  node  postgres  aws", BL], ["$ open priyashah.example.com", GR]].map(([t, c], i) => T(t, 22, 26 + i * 17, 200, { size: 9, family: "mono", color: c })),
        R(22, 112, 6, 11, TX, { name: "Cursor" }),
        qr(236, 26, 78, "#11111b", TX, 5),
        T("SCAN · PORTFOLIO", 226, 110, 98, { size: 7, family: "mono", color: "#a6adc8", align: "center" }),
        T("Available for freelance and contract work", 22, 158, W - 44, { size: 8.5, family: "mono", color: CM }),
      ]),
    ];
  });

  /* 20 Luxury real-estate developer: gold framed monogram, skyline back (US, dark luxe) */
  tpl("luxe-estates-card-bc5", "Gold frame luxury real estate business card", "business-card-us", tags("luxury real estate developer property residences realtor gold dark luxe premium elegant"), (W, H) => {
    const gold = "#c9a85c", pale = "#e8d5a3";
    const towers = [[10, 30], [14, 46], [12, 38], [16, 62], [12, 50], [10, 28], [14, 40]];
    const tx = (W - (towers.reduce((a, t) => a + t[0], 0) + 4 * (towers.length - 1))) / 2;
    let cx = tx;
    const sky = towers.map(([w, h], i) => { const r = R(cx, 100 - h, w, h, gold, { op: i % 2 ? 0.75 : 1, name: "Tower" }); cx += w + 4; return r; });
    return [
      page("#0e1512", [
        R(22, 22, 104, H - 44, "none", { stroke: gold, sw: 1, name: "Gold frame" }),
        R(27, 27, 94, H - 54, "none", { stroke: gold, sw: 0.5, op: 0.6, name: "Inner frame" }),
        T("A", 22, 50, 104, { size: 56, family: "serif", color: gold, align: "center", lh: 1 }),
        T("AURELIA", 22, 114, 104, { size: 9, color: pale, align: "center", ls: 4 }),
        T("ESTATES", 22, 128, 104, { size: 7, color: gold, align: "center", ls: 3 }),
        T("Victoria Hale", 146, 32, 170, { size: 18, family: "serif", color: "#f5ecd6" }),
        T("MANAGING DIRECTOR", 146, 56, 170, { size: 7.5, color: gold, ls: 2 }),
        R(146, 76, 36, 1, gold, { name: "Rule" }),
        T("+1 555 0109 880\nvictoria@example.com\naureliaestates.example.com\n1 Park Crescent, New York NY", 146, 90, 170, { size: 8, color: "#d9d2c3", lh: 1.6 }),
      ]),
      page("#123b2f", [
        R(12, 12, W - 24, H - 24, "none", { stroke: gold, sw: 0.8, name: "Gold border" }),
        ...sky,
        R(W / 2 - 72, 100, 144, 1, gold, { name: "Ground line" }),
        T("AURELIA ESTATES", 20, 114, W - 40, { size: 15, family: "serif", color: gold, align: "center", ls: 4 }),
        T("Residences of distinction · Est. 2009", 20, 138, W - 40, { size: 8, color: "#cfc3a3", align: "center", ls: 1 }),
        T("Private viewings by appointment", 20, 154, W - 40, { size: 7.5, italic: true, family: "serif", color: pale, align: "center" }),
      ]),
    ];
  });
}
