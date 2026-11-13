// ROUND 2 layout batch (filled by a helper; see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md). Pure module, no imports.
// 20 own business cards (front + back), one per profession, ten styles twice each: centred, split, monogram,
// photo shape, minimal, bold band, luxury foil look, cute/kids, vintage and modern blocks.
// 14 landscape US (336 × 192), 3 portrait (192 × 336), 3 square (240 × 240).
// Print rules: important text stays at least 10 px inside the trim; background shapes that touch an edge
// run 12 px past it (bleed), so nothing white shows after cutting.
import { castFor, face, KIND } from "./templates-faces.js";

export default function add(k) {
  const { T, S, R, C, E, F, page } = k;
  // Person spots show people photos of their kind (templates-faces.js): one person picker per template build.
  let CAST = null;
  const tpl = (id, title, preset, tags, build) => k.tpl(id, title, preset, tags, (W, H) => { CAST = castFor(id); return build(W, H); });
  const { WHITE } = k.K;
  const US = "business-card-us", VT = "business-card-vertical", SQ = "business-card-square";
  const B = 12; // bleed
  const r1 = (v) => Math.round(v * 10) / 10;
  const tags = (s) => "business card visiting card " + s;
  // Text centred (both ways) in a box.
  const mid = (s, x, y, w, h, o = {}) => { const t = T(s, x, y, w, { align: "center", ...o }); t.y = r1(y + (h - t.h) / 2); return t; };
  // Contact rows: [iconId | null, text]; the icon sits centred on the text line.
  function rows(list, x, y, gap, size, ic, tc, w, o = {}) {
    return list.flatMap(([icon, s], i) => {
      const off = icon ? r1(size * 1.9) : 0;
      const t = T(s, x + off, y + i * gap, w - off, { size, color: tc, family: o.family, bold: o.bold });
      if (!icon) return [t];
      const is = r1(size * 1.25);
      return [E(icon, x, r1(t.y + (t.h - is) / 2), is, { c1: ic, c2: ic, c3: o.fill || WHITE }), t];
    });
  }
  // A centred row of pill labels.
  function pills(labels, cx, y, o) {
    const h = o.h || 20, size = o.size || 8, gap = o.gap ?? 8;
    const ws = labels.map((s) => Math.round(s.length * size * 0.56 + h * 0.9));
    let x = r1(cx - (ws.reduce((a, b) => a + b, 0) + gap * (labels.length - 1)) / 2);
    return labels.flatMap((s, i) => {
      const w = ws[i], fill = o.fills ? o.fills[i % o.fills.length] : o.fill || "none";
      const out = [R(x, y, w, h, fill, { radius: h / 2, stroke: o.stroke, sw: o.stroke ? 1 : 0, name: "Pill" }), mid(s, x, y, w, h, { size, bold: true, color: o.color || WHITE, name: s })];
      x = r1(x + w + gap);
      return out;
    });
  }

  /* 1 Real estate agent: photo shape (round portrait breaking out of a navy panel) */
  {
    const NV = "#1e3a5f", GD = "#c9a24a";
    tpl("realtor-portrait-card-bc4", "Real estate agent portrait business card", US, tags("real estate agent realtor property homes photo shape portrait circle"), (W, H) => [
      page(WHITE, [
        R(-B, -B, 150, H + 2 * B, NV, { name: "Navy panel" }),
        C(80, 30, 116, 116, WHITE, { name: "Photo ring" }),
        face(CAST, F(86, 36, 104, 104, { shape: "circle", name: "Agent photo" }), "realtor agent real estate property home", { sex: "f" }),
        E("icon-home", 20, 156, 18, { c1: GD, c2: GD, c3: NV }),
        T("HARBOR HOMES", 42, 160, 84, { size: 8, bold: true, color: WHITE, ls: 1 }),
        T("Sofia Marin", 208, 38, 118, { size: 18, bold: true, color: NV }),
        T("Licensed Realtor", 208, 61, 118, { size: 9, color: "#a07a2c" }),
        R(208, 80, 26, 2, GD, { name: "Rule" }),
        ...rows([["icon-call", "+1 555 0142 778"], ["icon-mail", "sofia@example.com"], ["icon-location", "Bayview, California"], ["icon-globe", "harborhomes.example.com"]], 208, 92, 17, 7.5, NV, "#334155", 118),
      ]),
      page(NV, [
        E("icon-home", W / 2 - 20, 28, 40, { c1: GD, c2: GD, c3: NV }),
        T("HARBOR HOMES", 20, 78, W - 40, { size: 20, bold: true, color: WHITE, align: "center", ls: 4 }),
        T("REALTY GROUP", 20, 104, W - 40, { size: 8, color: GD, align: "center", ls: 5 }),
        T("Your key to the right address", 20, 124, W - 40, { size: 9, family: "serif", italic: true, color: "#cbd5e1", align: "center" }),
        R(-B, H - 30, W + 2 * B, 30 + B, GD, { name: "Gold band" }),
        T("harborhomes.example.com", 20, H - 23, W - 40, { size: 8.5, bold: true, color: NV, align: "center", ls: 1 }),
      ]),
    ]);
  }

  /* 2 Photographer: minimal (camera viewfinder front, contact-sheet back) */
  {
    const LT = "#e5e5e5", GR = "#a3a3a3";
    const corner = (x, y, sx, sy) => [R(sx > 0 ? x : x - 16, y, 16, 1.5, LT, { name: "Viewfinder" }), R(x, sy > 0 ? y : y - 16, 1.5, 16, LT, { name: "Viewfinder" })];
    tpl("photographer-viewfinder-card-bc4", "Photographer viewfinder business card", US, tags("photographer photography camera portrait wedding minimal viewfinder dark"), (W, H) => [
      page("#111111", [
        ...corner(22, 22, 1, 1), ...corner(W - 22, 22, -1, 1), ...corner(22, H - 22, 1, -1), ...corner(W - 22, H - 22, -1, -1),
        C(34, 32, 6, 6, "#ef4444", { name: "Record dot" }),
        T("REC", 44, 30.8, 34, { size: 7, family: "mono", color: LT }),
        T("1/250   f2.8", W - 112, 30.8, 78, { size: 7, family: "mono", color: GR, align: "right" }),
        T("LEO HART", 30, 72, W - 60, { size: 24, bold: true, color: WHITE, align: "center", ls: 8 }),
        T("Photography", 30, 104, W - 60, { size: 10, family: "serif", italic: true, color: GR, align: "center" }),
        T("PORTRAITS  ·  WEDDINGS  ·  EVENTS", 30, 146, W - 60, { size: 6.5, color: "#8a8a8a", align: "center", ls: 2 }),
      ]),
      page(WHITE, [
        T("SELECTED WORK", 22, 20, 140, { size: 6.5, bold: true, color: "#737373", ls: 3 }),
        T("LEO HART", W - 162, 20, 140, { size: 6.5, bold: true, color: "#111111", ls: 3, align: "right" }),
        F(22, 36, 92, 84, { name: "Photo 1" }), F(122, 36, 92, 84, { name: "Photo 2" }), F(222, 36, 92, 84, { name: "Photo 3" }),
        T("01", 22, 124, 30, { size: 6, family: "mono", color: GR }), T("02", 122, 124, 30, { size: 6, family: "mono", color: GR }), T("03", 222, 124, 30, { size: 6, family: "mono", color: GR }),
        R(22, 144, W - 44, 0.75, "#d4d4d4", { name: "Line" }),
        T("+1 555 0187 213", 22, 154, 96, { size: 7.5, color: "#111111" }),
        T("leo@example.com", 120, 154, 96, { size: 7.5, color: "#111111", align: "center" }),
        T("leohart.example.com", 218, 154, 96, { size: 7.5, color: "#111111", align: "right" }),
      ]),
    ]);
  }

  /* 3 Hair and nail salon: photo shape (capsule photo with an offset outline), appointment back */
  {
    const RS = "#b76e79", DK = "#7a3b4a", LN = "#c98b97";
    tpl("salon-capsule-card-bc4", "Hair and nail salon business card", VT, tags("hair salon nail salon beauty stylist appointment photo shape capsule portrait vertical"), (W, H) => [
      page("#fbeff1", [
        R(46, 34, 112, 148, "none", { radius: 56, stroke: LN, sw: 1.2, name: "Offset outline" }),
        face(CAST, F(34, 24, 112, 148, { shape: "rounded", radius: 56, name: "Salon photo" }), KIND.beauty + " portrait", { sex: "f" }),
        E("deco-sparkles", 146, 18, 28, { c1: LN, c2: "#e8b4bc" }),
        T("VELVET ROOM", 16, 198, W - 32, { size: 15, family: "serif", bold: true, color: DK, align: "center", ls: 3 }),
        T("HAIR  ·  NAILS  ·  BROWS", 16, 220, W - 32, { size: 7, color: "#a0606e", align: "center", ls: 2 }),
        R(W / 2 - 14, 238, 28, 1, LN, { name: "Rule" }),
        T("Mia Torres", 16, 248, W - 32, { size: 11, bold: true, color: "#3f2a30", align: "center" }),
        T("Senior Stylist", 16, 262, W - 32, { size: 8, family: "serif", italic: true, color: "#7a5a62", align: "center" }),
        T("+1 555 0163 090", 16, 284, W - 32, { size: 7.5, color: "#3f2a30", align: "center" }),
        T("mia@example.com", 16, 297, W - 32, { size: 7.5, color: "#3f2a30", align: "center" }),
        T("velvetroom.example.com", 16, 310, W - 32, { size: 7.5, color: "#3f2a30", align: "center" }),
      ]),
      page(RS, [
        E("deco-sparkle", W / 2 - 9, 18, 18, { c1: "#fde2e6", c2: "#fde2e6" }),
        T("YOUR NEXT VISIT", 16, 42, W - 32, { size: 11, bold: true, color: WHITE, align: "center", ls: 2.5 }),
        ...[["Date", 80], ["Time", 110], ["Service", 140], ["Stylist", 170]].flatMap(([s, y]) => [
          T(s, 24, y, 44, { size: 8, color: "#fde2e6" }),
          R(70, y + 10, 98, 0.8, WHITE, { op: 0.8, name: "Write-in line" }),
        ]),
        T("Need to change your booking?\nPlease call 24 hours ahead.", 16, 206, W - 32, { size: 7.5, italic: true, color: WHITE, align: "center", lh: 1.4 }),
        R(W / 2 - 14, 250, 28, 1, "#fde2e6", { name: "Rule" }),
        T("VELVET ROOM", 16, 270, W - 32, { size: 12, family: "serif", bold: true, color: WHITE, align: "center", ls: 3 }),
        T("+1 555 0163 090", 16, 290, W - 32, { size: 7.5, color: "#fde2e6", align: "center" }),
      ]),
    ]);
  }

  /* 4 Lawyer: monogram (double ring initials, classic serif, gold rules) */
  {
    const NV = "#1f2a44", GD = "#a8873a", GL = "#c9a85a";
    tpl("lawyer-monogram-card-bc4", "Lawyer monogram business card", US, tags("lawyer attorney law firm legal monogram initials classic serif"), (W, H) => [
      page("#f7f4ee", [
        C(26, 46, 100, 100, "none", { stroke: NV, sw: 1.5, name: "Monogram ring" }),
        C(32, 52, 88, 88, "none", { stroke: GD, sw: 0.8, name: "Inner ring" }),
        mid("EW", 26, 46, 100, 100, { size: 34, family: "serif", bold: true, color: NV }),
        R(146, 44, 0.8, 104, GD, { name: "Divider" }),
        T("Eleanor Whitfield", 162, 46, 160, { size: 15, family: "serif", bold: true, color: NV }),
        T("ATTORNEY AT LAW", 162, 66, 160, { size: 7, bold: true, color: GD, ls: 2.5 }),
        ...[["T", "+1 555 0193 448", 92], ["E", "eleanor@example.com", 106], ["A", "200 Court Street, Suite 4\nHartford, Connecticut", 120]].flatMap(([a, s, y]) => [
          T(a, 162, y, 12, { size: 7.5, family: "serif", bold: true, color: GD }),
          T(s, 176, y, 146, { size: 7.5, color: "#475569", lh: 1.3 }),
        ]),
      ]),
      page(NV, [
        R(14, 14, W - 28, H - 28, "none", { stroke: GL, sw: 0.8, name: "Gold border" }),
        R(18, 18, W - 36, H - 36, "none", { stroke: GL, sw: 0.4, op: 0.6, name: "Inner border" }),
        T("WHITFIELD & GRAY", 30, 64, W - 60, { size: 19, family: "serif", bold: true, color: WHITE, align: "center", ls: 3 }),
        R(W / 2 - 98, 98, 40, 0.8, GL, { name: "Rule" }),
        T("LAW OFFICES", W / 2 - 54, 93.5, 108, { size: 7.5, color: GL, align: "center", ls: 4 }),
        R(W / 2 + 58, 98, 40, 0.8, GL, { name: "Rule" }),
        T("Family  ·  Property  ·  Business law", 30, 122, W - 60, { size: 8, family: "serif", italic: true, color: "#cbd5e1", align: "center" }),
      ]),
    ]);
  }

  /* 5 Dentist: modern blocks (teal tile mosaic), check-up reminder back */
  {
    const TL = "#14b8a6", DT = "#0f766e", MN = "#99f6e4", PL = "#ccfbf1", INK = "#1b2133";
    tpl("dentist-blocks-card-bc4", "Dentist modern blocks business card", US, tags("dentist dental clinic teeth smile appointment modern blocks tiles"), (W, H) => [
      page(WHITE, [
        R(236, -B, 100 + B, 80 + B, TL, { name: "Block" }),
        E("deco-sparkle", 266, 20, 40, { c1: WHITE, c2: WHITE }),
        R(236, 86, 50, 50, MN, { name: "Block" }),
        C(249, 99, 24, 24, WHITE, { name: "Dot" }),
        R(292, 86, 44 + B, 50, DT, { name: "Block" }),
        E("icon-plus", 302, 99, 24, { c1: WHITE, c2: WHITE, c3: DT }),
        R(236, 142, 100 + B, 50 + B, PL, { name: "Block" }),
        T("BRIGHT SMILE DENTAL", 22, 22, 200, { size: 7.5, bold: true, color: DT, ls: 2.5 }),
        T("Dr. Priya Nair", 22, 48, 200, { size: 19, bold: true, color: INK }),
        T("Family & Cosmetic Dentist", 22, 73, 200, { size: 9, color: TL }),
        ...rows([["icon-call", "+1 555 0129 640"], ["icon-mail", "priya@example.com"], ["icon-location", "48 Elm Avenue, Riverside"], ["icon-clock", "Mon – Sat  ·  9 am – 6 pm"]], 22, 102, 17, 7.5, TL, "#334155", 200),
      ]),
      page(DT, [
        T("NEXT CHECK-UP", 22, 22, 200, { size: 10, bold: true, color: WHITE, ls: 2 }),
        E("deco-sparkle", W - 46, 16, 24, { c1: MN, c2: MN }),
        R(22, 46, 140, 56, WHITE, { radius: 8, name: "Date box" }),
        T("DATE", 32, 54, 120, { size: 6.5, bold: true, color: TL, ls: 2 }),
        R(174, 46, 140, 56, WHITE, { radius: 8, name: "Time box" }),
        T("TIME", 184, 54, 120, { size: 6.5, bold: true, color: TL, ls: 2 }),
        T("Brush twice a day, floss once, smile always.", 22, 116, W - 44, { size: 8.5, italic: true, color: PL }),
        R(-B, 156, W + 2 * B, H - 156 + B, TL, { name: "Bottom band" }),
        T("brightsmile.example.com", 22, 168, 140, { size: 8, bold: true, color: WHITE }),
        T("+1 555 0129 640", W - 162, 168, 140, { size: 8, bold: true, color: WHITE, align: "right" }),
      ]),
    ]);
  }

  /* 6 Personal trainer: bold band (tilted lime band across a black card) */
  {
    const BK = "#0b0b0f", LM = "#a3e635";
    tpl("trainer-bold-band-card-bc4", "Personal trainer bold band business card", US, tags("personal trainer fitness gym coach workout bold band sporty"), (W, H) => [
      page(BK, [
        T("JAY", 22, 24, 180, { size: 34, bold: true, color: WHITE, lh: 1 }),
        T("BROOKS", 22, 58, 180, { size: 34, bold: true, color: LM, lh: 1 }),
        T("PERSONAL TRAINER", 22, 97, 180, { size: 8, bold: true, color: "#d4d4d4", ls: 4 }),
        T("@jaybrooks.fit", W - 130, 26, 108, { size: 7.5, color: "#a3a3a3", align: "right" }),
        R(-40, 128, W + 80, 34, LM, { rot: -6, name: "Bold band" }),
        T("STRONGER EVERY WEEK", 40, 138, 256, { size: 12, bold: true, color: BK, align: "center", ls: 2, rot: -6 }),
      ]),
      page(LM, [
        R(-B, -B, 116 + B, H + 2 * B, BK, { name: "Black band" }),
        mid("JB", 12, 58, 92, 50, { size: 40, bold: true, color: LM }),
        T("TRAINING", 12, 112, 92, { size: 7, bold: true, color: WHITE, align: "center", ls: 3 }),
        T("Book a free session", 134, 24, 184, { size: 13, bold: true, color: BK }),
        ...rows([["icon-call", "+1 555 0118 506"], ["icon-mail", "jay@example.com"], ["icon-location", "Iron Yard Gym, Denver"], ["icon-calendar", "Mon – Sat  ·  6 am – 9 pm"]], 134, 54, 20, 8.5, BK, BK, 184, { fill: LM }),
        T("Strength  ·  Fat loss  ·  Mobility", 134, 156, 184, { size: 7.5, bold: true, color: "#365314" }),
      ]),
    ]);
  }

  /* 7 Bakery: vintage (round emblem with double rings, opening hours back) */
  {
    const BR = "#6b3e26", CR = "#f3e9d7", TN = "#e9c99a";
    tpl("bakery-vintage-emblem-card-bc4", "Vintage bakery emblem business card", SQ, tags("bakery restaurant bread pastry cafe vintage emblem retro square"), (W, H) => [
      page(CR, [
        R(12, 12, W - 24, H - 24, "none", { stroke: BR, sw: 0.8, name: "Frame" }),
        ...[[20, 20], [W - 30, 20], [20, H - 30], [W - 30, H - 30]].map(([x, y]) => S("star", x, y, 10, 10, BR, { name: "Corner star" })),
        C(32, 32, 176, 176, "none", { stroke: BR, sw: 2, name: "Emblem ring" }),
        C(39, 39, 162, 162, "none", { stroke: BR, sw: 0.7, name: "Inner ring" }),
        T("EST.  1998", 60, 58, 120, { size: 7.5, bold: true, color: BR, align: "center", ls: 3 }),
        E("deco-sprig", W / 2 - 9, 70, 18, { c1: BR, c2: BR }),
        T("Rolling Pin", 40, 90, 160, { size: 22, family: "serif", bold: true, color: BR, align: "center" }),
        T("BAKEHOUSE", 40, 118, 160, { size: 9, bold: true, color: BR, align: "center", ls: 5 }),
        E("line-ornament", 72, 134, 96, { c1: BR }),
        T("Breads  ·  Pies  ·  Pastries", 50, 151, 140, { size: 7.5, family: "serif", italic: true, color: "#8a5a3c", align: "center" }),
      ]),
      page(BR, [
        R(12, 12, W - 24, H - 24, "none", { stroke: TN, sw: 0.8, name: "Frame" }),
        T("OPEN DAILY", 20, 26, W - 40, { size: 10, bold: true, color: CR, align: "center", ls: 3 }),
        ...[["Mon – Fri", "7 am – 6 pm", 50], ["Saturday", "8 am – 5 pm", 66], ["Sunday", "8 am – 2 pm", 82]].flatMap(([d, h, y]) => [
          T(d, 36, y, 80, { size: 8.5, color: CR }),
          T(h, 124, y, 80, { size: 8.5, color: CR, align: "right" }),
        ]),
        E("line-ornament", 60, 106, 120, { c1: TN }),
        T("12 Mill Lane, Old Town", 20, 132, W - 40, { size: 8.5, color: CR, align: "center" }),
        T("+1 555 0154 321", 20, 146, W - 40, { size: 8.5, color: CR, align: "center" }),
        T("rollingpin.example.com", 20, 160, W - 40, { size: 8.5, color: CR, align: "center" }),
        T("Baked fresh every morning since 1998", 20, 192, W - 40, { size: 8.5, family: "serif", italic: true, color: TN, align: "center" }),
      ]),
    ]);
  }

  /* 8 Wedding planner: luxury foil look (gold on deep emerald, gold foil back) */
  {
    const GF = "#d8b765", GL = "#f0dca0", EM = "#0f2e2a";
    tpl("wedding-planner-gold-card-bc4", "Wedding planner gold foil business card", VT, tags("wedding planner bridal events luxury gold foil elegant dark vertical"), (W, H) => [
      page([EM, "#1d4a43", 160], [
        R(14, 14, W - 28, H - 28, "none", { stroke: GF, sw: 0.8, name: "Gold frame" }),
        C(W / 2 - 30, 46, 60, 60, "none", { stroke: GF, sw: 1.2, name: "Monogram ring" }),
        mid("E&A", W / 2 - 30, 46, 60, 60, { size: 17, family: "serif", italic: true, bold: true, color: GF }),
        T("Amelia Rose", 20, 134, W - 40, { size: 21, family: "serif", italic: true, color: GL, align: "center" }),
        T("WEDDING PLANNER", 20, 164, W - 40, { size: 7, bold: true, color: GF, align: "center", ls: 3 }),
        E("line-ornament", W / 2 - 50, 186, 100, { c1: GF }),
        T("+1 555 0147 902", 20, 220, W - 40, { size: 7.5, color: "#e8efe9", align: "center" }),
        T("amelia@example.com", 20, 234, W - 40, { size: 7.5, color: "#e8efe9", align: "center" }),
        T("everandalways.example.com", 20, 248, W - 40, { size: 7.5, color: "#e8efe9", align: "center" }),
        E("deco-sprig", W / 2 - 16, 272, 32, { c1: GF, c2: GF }),
      ]),
      page(["#ecd595", "#b8913f", 135], [
        R(14, 14, W - 28, H - 28, "none", { stroke: EM, sw: 0.8, name: "Frame" }),
        E("deco-sprig", W / 2 - 18, 40, 36, { c1: EM, c2: EM, rot: 180 }),
        T("Ever &\nAlways", 20, 128, W - 40, { size: 28, family: "serif", italic: true, bold: true, color: EM, align: "center", lh: 1.05 }),
        T("WEDDINGS  ·  EVENTS", 20, 198, W - 40, { size: 7.5, bold: true, color: EM, align: "center", ls: 2.5 }),
        E("deco-sprig", W / 2 - 18, 260, 36, { c1: EM, c2: EM }),
      ]),
    ]);
  }

  /* 9 Graphic designer: modern blocks (geometric tile grid) */
  {
    const BL = "#2563eb", YE = "#facc15", RE = "#ef4444", IK = "#1b2133", CM = "#f5f1e8";
    tpl("designer-geometric-card-bc4", "Graphic designer geometric business card", US, tags("graphic designer brand design creative studio modern blocks geometric bauhaus colourful"), (W, H) => [
      page(CM, [
        R(196, -B, 70, 64 + B, BL, { name: "Tile" }), C(211, 12, 40, 40, YE, { name: "Circle" }),
        R(266, -B, 70 + B, 64 + B, YE, { name: "Tile" }), E("shape-half-circle", 276, 28, 50, { c1: RE }),
        R(196, 64, 70, 64, RE, { name: "Tile" }), S("triangle", 211, 76, 40, 40, CM, { name: "Triangle" }),
        R(266, 64, 70 + B, 64, IK, { name: "Tile" }), C(281, 76, 40, 40, "none", { stroke: CM, sw: 6, name: "Ring" }),
        R(196, 128, 70, 64 + B, YE, { name: "Tile" }), R(216, 145, 30, 30, BL, { rot: 45, name: "Diamond" }),
        R(266, 128, 70 + B, 64 + B, BL, { name: "Tile" }), ...[0, 1, 2].map((i) => R(278, 143 + i * 12, 46, 5, CM, { name: "Stripe" })),
        T("Nora Quinn", 22, 32, 164, { size: 22, bold: true, color: IK }),
        T("Graphic & Brand Designer", 22, 60, 164, { size: 9, bold: true, color: RE }),
        R(22, 82, 30, 3, IK, { name: "Rule" }),
        ...rows([[null, "nora@example.com"], [null, "+1 555 0115 482"], [null, "noraquinn.example.com"], [null, "@nora.makes"]], 22, 98, 15, 7.5, IK, IK, 164, { family: "mono" }),
      ]),
      page(BL, [
        T("MAKE IT\nBOLD.", 22, 32, 170, { size: 34, bold: true, color: WHITE, lh: 1 }),
        R(198, 30, 24, 24, RE, { name: "Square" }),
        S("triangle", 286, 24, 30, 26, CM, { name: "Triangle" }),
        C(226, 92, 140, 140, YE, { name: "Big circle" }),
        T("Branding  ·  Print  ·  Web", 22, 142, 180, { size: 7.5, color: "#bfdbfe" }),
        T("noraquinn.example.com", 22, 158, 180, { size: 8.5, bold: true, color: WHITE }),
      ]),
    ]);
  }

  /* 10 CEO / corporate: luxury foil look (gold wordmark on black, foil edges) */
  {
    const GD = "#d4b46a", GL = "#ecd9a3", DK = "#141414";
    tpl("ceo-gold-foil-card-bc4", "CEO gold foil business card", US, tags("ceo corporate executive company director finance luxury gold foil dark premium"), (W, H) => [
      page(["#0b0b0b", "#2a2a2a", 135], [
        R(W / 2 - 11, 48, 22, 22, "none", { stroke: GD, sw: 1.5, rot: 45, name: "Logo diamond" }),
        R(W / 2 - 5, 54, 10, 10, GD, { rot: 45, name: "Logo core" }),
        T("ORION CAPITAL", 30, 86, W - 60, { size: 19, bold: true, color: GD, align: "center", ls: 6 }),
        R(W / 2 - 20, 118, 40, 0.8, GD, { name: "Rule" }),
        T("PRIVATE EQUITY  ·  NEW YORK", 30, 128, W - 60, { size: 6.5, color: "#a3a3a3", align: "center", ls: 3 }),
        R(-B, H - 5, W + 2 * B, 5 + B, GD, { name: "Foil edge" }),
      ]),
      page(DK, [
        R(-B, -B, 6 + B, H + 2 * B, GD, { name: "Foil edge" }),
        T("Victoria Hale", 30, 32, 220, { size: 18, family: "serif", bold: true, color: GL }),
        T("Chief Executive Officer", 30, 56, 220, { size: 8.5, color: "#a3a3a3", ls: 1 }),
        R(30, 86, W - 60, 0.75, GD, { name: "Gold rule" }),
        ...rows([["icon-call", "+1 555 0100 750"], ["icon-mail", "victoria@example.com"]], 30, 100, 18, 7.5, GD, "#e5e5e5", 140, { fill: DK }),
        ...rows([["icon-globe", "orioncapital.example.com"], ["icon-location", "One Harbor Plaza, New York"]], 176, 100, 18, 7.5, GD, "#e5e5e5", 140, { fill: DK }),
        R(208, 158, 8, 8, "none", { stroke: GD, sw: 1, rot: 45, name: "Logo diamond" }),
        T("ORION CAPITAL", 222, 157, 96, { size: 7, bold: true, color: GD, ls: 2 }),
      ]),
    ]);
  }

  /* 11 Contractor / electrician: bold band (black contact band on safety yellow) */
  {
    const YL = "#facc15", BK = "#111111";
    tpl("electrician-band-card-bc4", "Electrician bold band business card", US, tags("electrician contractor builder construction trades bold band yellow"), (W, H) => [
      page(YL, [
        E("icon-idea", 22, 20, 40, { c1: BK, c3: WHITE }),
        T("BRIGHTLINE", 70, 20, 240, { size: 24, bold: true, color: BK, ls: 1 }),
        T("ELECTRIC  &  BUILD", 70, 49, 240, { size: 8, bold: true, color: BK, ls: 4 }),
        T("Marcus Reed", 22, 78, 200, { size: 13, bold: true, color: BK }),
        T("Master Electrician", 22, 95, 200, { size: 8.5, color: "#422006" }),
        R(-B, 122, W + 2 * B, H - 122 + B, BK, { name: "Black band" }),
        T("+1 555 0178 246", 22, 134, 180, { size: 15, bold: true, color: YL }),
        T("LICENSED\n& INSURED", W - 112, 134, 90, { size: 7.5, bold: true, color: YL, align: "right", ls: 1.5, lh: 1.3 }),
        T("marcus@example.com   ·   brightline.example.com", 22, 160, 292, { size: 7.5, color: WHITE }),
      ]),
      page(BK, [
        R(-B, -B, 112 + B, H + 2 * B, YL, { name: "Yellow band" }),
        E("icon-idea", 41, 22, 30, { c1: BK, c3: YL }),
        T("24/7", 12, 58, 88, { size: 30, bold: true, color: BK, align: "center" }),
        T("EMERGENCY\nCALL-OUTS", 12, 98, 88, { size: 8, bold: true, color: BK, align: "center", ls: 1.5, lh: 1.25 }),
        T("SERVICES", 130, 22, 180, { size: 9, bold: true, color: YL, ls: 3 }),
        ...rows([["icon-check", "Rewiring & new circuits"], ["icon-check", "Lighting & fittings"], ["icon-check", "Panel upgrades"], ["icon-check", "EV charger installs"], ["icon-check", "Repairs & renovations"]], 130, 42, 19, 8.5, YL, WHITE, 186),
        T("Free quotes  ·  Fully licensed  ·  Since 2008", 130, 154, 188, { size: 7, color: "#a3a3a3" }),
      ]),
    ]);
  }

  /* 12 Plumber: split (vertical split front, horizontal split back) */
  {
    const DB = "#0c4a6e", SK = "#38bdf8", MB = "#0284c7";
    tpl("plumber-split-card-bc4", "Plumber split business card", US, tags("plumber plumbing heating repair emergency split two tone blue"), (W, H) => [
      page(WHITE, [
        R(-B, -B, 142 + B, H + 2 * B, DB, { name: "Blue half" }),
        R(142, -B, 6, H + 2 * B, SK, { name: "Seam" }),
        E("shape-drop", 49, 52, 44, { c1: SK }),
        T("FLOWRIGHT", 14, 106, 114, { size: 15, bold: true, color: WHITE, align: "center", ls: 2 }),
        T("PLUMBING & HEATING", 14, 126, 114, { size: 6.5, color: SK, align: "center", ls: 1.2 }),
        T("Daniel Okafor", 166, 34, 152, { size: 17, bold: true, color: DB }),
        T("Licensed Master Plumber", 166, 56, 152, { size: 8.5, color: MB }),
        ...rows([["icon-call", "+1 555 0131 909"], ["icon-mail", "daniel@example.com"], ["icon-location", "Serving Greater Austin"], ["icon-clock", "Open 24 hours, 7 days"]], 166, 84, 18, 7.5, MB, "#334155", 152),
      ]),
      page(WHITE, [
        R(-B, -B, W + 2 * B, 104 + B, DB, { name: "Blue half" }),
        E("line-wavy", -B, 95, W + 2 * B, { h: 18, c1: SK }),
        T("LEAKS  ·  DRAINS  ·  WATER HEATERS", 20, 22, W - 40, { size: 8, bold: true, color: SK, align: "center", ls: 2 }),
        T("Call any time, day or night", 20, 40, W - 40, { size: 9, italic: true, color: "#e0f2fe", align: "center" }),
        T("+1 555 0131 909", 20, 56, W - 40, { size: 22, bold: true, color: WHITE, align: "center" }),
        T("flowright.example.com", 20, 124, W - 40, { size: 11, bold: true, color: DB, align: "center" }),
        T("Fast, tidy and fairly priced", 20, 144, W - 40, { size: 8.5, family: "serif", italic: true, color: "#475569", align: "center" }),
        ...[-26, -6, 14].map((dx) => E("shape-drop", W / 2 + dx, 164, 12, { c1: SK })),
      ]),
    ]);
  }

  /* 13 Cleaning service: cute (bubbles, sparkles, pill phone button) */
  {
    const AQ = "#e0f7fa", BU = "#b2ebf2", TD = "#0e7490", TE = "#0891b2";
    const bubble = (x, y, d) => C(x, y, d, d, WHITE, { stroke: "#67e8f9", sw: 1.2, name: "Bubble" });
    tpl("cleaning-bubbles-card-bc4", "Cleaning service bubbles business card", SQ, tags("cleaning service cleaner housekeeping maid home cute bubbles playful square"), (W, H) => [
      page(AQ, [
        C(-36, -36, 100, 100, BU, { name: "Big bubble" }),
        C(180, 176, 96, 96, BU, { name: "Big bubble" }),
        bubble(196, 24, 20), bubble(218, 50, 10), bubble(26, 74, 10), bubble(20, 190, 14), bubble(40, 210, 8),
        E("icon-home", W / 2 - 24, 34, 48, { c1: TD, c2: "#f59e0b", c3: WHITE }),
        E("deco-sparkle", W / 2 + 14, 26, 24, { c1: "#f59e0b", c2: "#f59e0b" }),
        T("Sparkle & Shine", 16, 92, W - 32, { size: 20, bold: true, color: TD, align: "center" }),
        T("HOME  CLEANING  CO.", 16, 119, W - 32, { size: 7.5, bold: true, color: "#ea580c", align: "center", ls: 3 }),
        R(W / 2 - 68, 144, 136, 26, TE, { radius: 13, name: "Phone button" }),
        mid("+1 555 0148 262", W / 2 - 68, 144, 136, 26, { size: 10, bold: true, color: WHITE }),
        T("Hana Lee  ·  Owner", 40, 184, W - 80, { size: 8, color: "#155e75", align: "center" }),
      ]),
      page(TE, [
        C(188, -24, 72, 72, "#22d3ee", { op: 0.5, name: "Bubble" }),
        C(-20, 204, 50, 50, "#22d3ee", { op: 0.5, name: "Bubble" }),
        T("We clean,\nyou relax.", 22, 22, 160, { size: 17, bold: true, color: WHITE, lh: 1.1 }),
        ...rows([["icon-check-circle", "Homes & apartments"], ["icon-check-circle", "Move-in / move-out"], ["icon-check-circle", "Offices & studios"], ["icon-check-circle", "Eco-friendly products"]], 22, 76, 21, 9, "#fde047", WHITE, 196),
        R(22, 166, W - 44, 50, WHITE, { radius: 12, name: "Contact box" }),
        T("hana@example.com", 22, 175, W - 44, { size: 8.5, bold: true, color: TD, align: "center" }),
        T("sparkleshine.example.com", 22, 193, W - 44, { size: 8, color: TD, align: "center" }),
      ]),
    ]);
  }

  /* 14 Car detailing: split (diagonal red split), package price back */
  {
    const CH = "#18181b", RD = "#dc2626";
    tpl("car-detailing-diagonal-card-bc4", "Car detailing diagonal business card", US, tags("car detailing auto wash valet garage split diagonal dark red"), (W, H) => [
      page(CH, [
        R(171.3, -104, 6, 400, "#f87171", { rot: 15, name: "Pin stripe" }),
        R(189.6, -104, 300, 400, RD, { rot: 15, name: "Diagonal split" }),
        T("Rico Alvarez", 22, 28, 150, { size: 18, bold: true, color: WHITE }),
        T("Mobile Car Detailing", 22, 52, 150, { size: 9, color: "#f87171" }),
        R(22, 72, 34, 2, RD, { name: "Speed line" }), R(60, 72, 14, 2, RD, { name: "Speed line" }), R(78, 72, 6, 2, RD, { name: "Speed line" }),
        ...rows([["icon-call", "+1 555 0190 384"], ["icon-mail", "rico@example.com"], ["icon-location", "We come to you"], ["icon-globe", "shineco.example.com"]], 22, 90, 18, 7.5, "#f87171", "#e4e4e7", 120, { fill: CH }),
        ...[245, 257, 269].map((x) => E("icon-star", x, 56, 10, { c1: WHITE, c3: WHITE })),
        T("SHINE CO.", 206, 72, 112, { size: 15, bold: true, color: WHITE, align: "center", ls: 1.5 }),
        T("AUTO DETAILING", 206, 94, 112, { size: 7, color: "#fee2e2", align: "center", ls: 2.5 }),
      ]),
      page(CH, [
        T("DETAIL PACKAGES", 22, 18, 200, { size: 9, bold: true, color: WHITE, ls: 3 }),
        ...[["WASH", "$49", "Hand wash,\ndry & vacuum"], ["POLISH", "$129", "Machine polish\n& wax"], ["CERAMIC", "$399", "5-year ceramic\ncoating"]].flatMap(([n, p, d], i) => {
          const x = 22 + i * 100;
          return [
            R(x, 40, 92, 96, "#27272a", { name: "Package card" }),
            R(x, 40, 92, 4, RD, { name: "Package top" }),
            T(n, x + 6, 54, 80, { size: 8.5, bold: true, color: WHITE, align: "center", ls: 1.5 }),
            T(p, x + 6, 70, 80, { size: 20, bold: true, color: "#ef4444", align: "center" }),
            T(d, x + 6, 100, 80, { size: 7, color: "#a1a1aa", align: "center", lh: 1.35 }),
          ];
        }),
        T("Book at shineco.example.com  ·  +1 555 0190 384", 22, 152, W - 44, { size: 7.5, color: "#d4d4d8", align: "center" }),
        R(-B, H - 8, W + 2 * B, 8 + B, RD, { name: "Red edge" }),
      ]),
    ]);
  }

  /* 15 Tutor: cute / kids (ruled notebook paper, letter blocks) */
  {
    const NB = "#1e3a8a", OR = "#ea580c";
    const block = (s, x, y, fill, rot) => [R(x, y, 26, 26, fill, { radius: 5, rot, name: "Letter block" }), mid(s, x, y, 26, 26, { size: 16, bold: true, color: WHITE, rot })];
    tpl("tutor-notebook-card-bc4", "Tutor notebook business card", US, tags("tutor teacher tuition school kids education cute notebook playful"), (W, H) => [
      page("#fffdf5", [
        ...[40, 60, 80, 100, 120, 140, 160, 180].map((y) => R(-B, y, W + 2 * B, 0.7, "#bfdbfe", { name: "Ruled line" })),
        R(44, -B, 1, H + 2 * B, "#fca5a5", { name: "Margin line" }),
        ...block("A", 236, 20, "#f87171", -8), ...block("B", 266, 22, "#60a5fa", 6), ...block("C", 296, 20, "#34d399", -4),
        T("Ms. Ruby Chen", 56, 43, 170, { size: 18, bold: true, color: NB }),
        T("Maths & Reading Tutor", 56, 71.5, 170, { size: 9, bold: true, color: OR }),
        T("Ages 6 to 12  ·  In person or online", 56, 91.5, 180, { size: 8, color: "#475569" }),
        ...rows([["icon-call", "+1 555 0124 390"], ["icon-mail", "ruby@example.com"], ["icon-calendar", "After school & weekends"]], 56, 111.5, 20, 8, NB, "#334155", 170, { fill: "#fffdf5" }),
        E("deco-stars", 252, 70, 34, { c1: "#facc15", c2: "#60a5fa" }),
        E("icon-pencil", 270, 126, 46, { c1: "#f59e0b", c2: "#f472b6" }),
      ]),
      page("#fde68a", [
        E("deco-rainbow", 22, 20, 46),
        E("deco-stars", W - 60, 16, 38, { c1: "#f97316", c2: "#60a5fa" }),
        E("face-happy", W / 2 - 18, 18, 36),
        T("Learning is fun!", 20, 60, W - 40, { size: 18, bold: true, color: NB, align: "center" }),
        ...pills(["Maths", "Phonics", "Reading"], W / 2, 94, { size: 8.5, fills: ["#f87171", "#60a5fa", "#34d399"] }),
        ...pills(["Homework help", "Exam prep"], W / 2, 122, { size: 8.5, fills: ["#a78bfa", "#fb923c"] }),
        T("rubytutors.example.com", 20, 160, W - 40, { size: 8.5, bold: true, color: NB, align: "center" }),
      ]),
    ]);
  }

  /* 16 Florist: vintage (oval photo, double frame, botanical back) */
  {
    const BRN = "#6b4f33", OL = "#4a5d3a", CR = "#f6efe3";
    tpl("florist-vintage-oval-card-bc4", "Vintage florist business card", VT, tags("florist flower shop flowers bouquet botanical vintage oval frame vertical"), (W, H) => [
      page(CR, [
        R(12, 12, W - 24, H - 24, "none", { stroke: BRN, sw: 0.8, name: "Frame" }),
        R(16, 16, W - 32, H - 32, "none", { stroke: BRN, sw: 0.4, op: 0.6, name: "Inner frame" }),
        C(42, 34, 108, 136, "none", { stroke: OL, sw: 1, name: "Oval ring" }),
        F(48, 40, 96, 124, { shape: "circle", name: "Bouquet photo" }),
        E("deco-sprig", 22, 128, 36, { c1: OL, c2: OL, rot: -25 }),
        E("deco-sprig", W - 58, 128, 36, { c1: OL, c2: OL, rot: 25 }),
        T("Wild Fern", 20, 182, W - 40, { size: 24, family: "serif", italic: true, color: OL, align: "center" }),
        T("FLOWER  SHOP", 20, 212, W - 40, { size: 7, bold: true, color: BRN, align: "center", ls: 4 }),
        E("line-ornament", W / 2 - 45, 228, 90, { c1: BRN }),
        T("Ivy Hollis, Florist", 20, 246, W - 40, { size: 8.5, family: "serif", color: "#3f3a2e", align: "center" }),
        T("+1 555 0151 676", 20, 264, W - 40, { size: 7.5, color: BRN, align: "center" }),
        T("ivy@example.com", 20, 277, W - 40, { size: 7.5, color: BRN, align: "center" }),
        T("wildfern.example.com", 20, 290, W - 40, { size: 7.5, color: BRN, align: "center" }),
      ]),
      page(OL, [
        ...[[-18, 24, 52], [150, -20, 56], [146, 292, 60], [-20, 262, 46], [150, 66, 22]].map(([x, y, w]) => E("deco-flower", x, y, w, { c1: CR, c2: CR, op: 0.18 })),
        C(26, 98, 140, 140, CR, { name: "Label" }),
        C(32, 104, 128, 128, "none", { stroke: OL, sw: 0.6, name: "Label ring" }),
        mid("Fresh\nbouquets\ndaily", 36, 102, 120, 100, { size: 16, family: "serif", italic: true, color: OL, lh: 1.1 }),
        T("Weddings  ·  Gifts  ·  Events", 36, 196, 120, { size: 7, family: "serif", italic: true, color: BRN, align: "center" }),
        T("Order by 10 am for same-day delivery", 18, 262, W - 36, { size: 7.5, italic: true, color: CR, align: "center" }),
        T("wildfern.example.com", 18, 296, W - 36, { size: 8, bold: true, color: CR, align: "center" }),
      ]),
    ]);
  }

  /* 17 Barista / cafe: centred front, coffee loyalty stamp card back */
  {
    const ES = "#3b2418", CA = "#c8a27a", CM = "#f5ebe0";
    tpl("cafe-loyalty-card-bc4", "Coffee shop loyalty business card", SQ, tags("barista cafe coffee shop loyalty stamp card centred centered square"), (W, H) => [
      page(ES, [
        C(W / 2 - 44, 30, 88, 88, CA, { name: "Badge" }),
        E("icon-chai", W / 2 - 26, 46, 52, { c1: ES, c3: CM }),
        T("Daily Grind", 16, 128, W - 32, { size: 22, family: "serif", bold: true, color: CM, align: "center" }),
        T("COFFEE  BAR", 16, 156, W - 32, { size: 8, bold: true, color: CA, align: "center", ls: 5 }),
        R(W / 2 - 16, 176, 32, 1, CA, { name: "Rule" }),
        T("Sam Ortiz  ·  Head Barista", 16, 186, W - 32, { size: 8, color: "#e7d5c4", align: "center" }),
        T("12 Market Street  ·  Open 7 am – 7 pm", 16, 201, W - 32, { size: 7, color: "#b8997c", align: "center" }),
      ]),
      page(CM, [
        T("COFFEE CLUB", 16, 18, W - 32, { size: 11, bold: true, color: ES, align: "center", ls: 3 }),
        T("Collect 9 stamps, your 10th cup is on us", 16, 35, W - 32, { size: 7.5, italic: true, color: "#7c5a43", align: "center" }),
        ...Array.from({ length: 10 }, (_, i) => {
          const x = 25 + (i % 5) * 40, y = 56 + Math.floor(i / 5) * 40, last = i === 9;
          return [
            C(x, y, 30, 30, last ? ES : "none", { stroke: CA, sw: 1.2, name: "Stamp " + (i + 1) }),
            mid(last ? "FREE" : String(i + 1), x, y, 30, 30, { size: last ? 6.5 : 8, bold: last, color: last ? CM : "#c9b29a" }),
          ];
        }),
        R(-B, 148, W + 2 * B, H - 148 + B, ES, { name: "Bottom band" }),
        T("dailygrind.example.com", 16, 164, W - 32, { size: 9, bold: true, color: CM, align: "center" }),
        T("+1 555 0136 870", 16, 180, W - 32, { size: 8, color: CA, align: "center" }),
        E("icon-chai", W / 2 - 10, 200, 20, { c1: CA, c3: ES }),
      ]),
    ]);
  }

  /* 18 Yoga teacher: minimal (small sunrise mark, lots of air), class schedule back */
  {
    const IY = "#3f3a36", TR = "#c9785a", SG = "#8a9a7b", SD = "#f4ede4";
    tpl("yoga-minimal-sun-card-bc4", "Yoga teacher minimal business card", US, tags("yoga teacher instructor wellness pilates meditation minimal calm sunrise"), (W, H) => [
      page(SD, [
        E("shape-half-circle", 226, 64, 80, { c1: TR }),
        R(206, 106, 120, 1, IY, { name: "Horizon" }),
        R(236, 112, 60, 1, TR, { op: 0.6, name: "Reflection" }),
        R(252, 118, 28, 1, TR, { op: 0.4, name: "Reflection" }),
        T("Maya Lindqvist", 26, 68, 170, { size: 18, family: "serif", color: IY }),
        T("YOGA  &  BREATHWORK", 26, 94, 170, { size: 7, color: "#8a7f75", ls: 3 }),
        T("mayayoga.example.com", 26, 156, 140, { size: 7.5, color: IY }),
        T("+1 555 0172 615", 176, 156, 134, { size: 7.5, color: IY, align: "right" }),
      ]),
      page(SG, [
        T("WEEKLY CLASSES", 26, 24, 200, { size: 8, bold: true, color: WHITE, ls: 3 }),
        E("shape-half-circle", W - 58, 22, 32, { c1: SD }),
        ...[["Mon · Wed", "Vinyasa Flow", "7:00 am"], ["Tue · Thu", "Gentle Yoga", "6:30 pm"], ["Saturday", "Breathwork", "9:00 am"]].flatMap(([d, c, t], i) => {
          const y = 50 + i * 26;
          return [
            T(d, 26, y, 80, { size: 8.5, color: SD }),
            T(c, 110, y, 120, { size: 8.5, bold: true, color: WHITE }),
            T(t, 230, y, 80, { size: 8.5, color: SD, align: "right" }),
            R(26, y + 17, W - 52, 0.6, SD, { op: 0.5, name: "Divider" }),
          ];
        }),
        T("Studio Calma, 9 Willow Road", 26, 144, W - 52, { size: 7.5, color: SD }),
        T("maya@example.com  ·  +1 555 0172 615", 26, 158, W - 52, { size: 7.5, color: SD }),
      ]),
    ]);
  }

  /* 19 IT consultant: monogram (hexagon initials, terminal-style details) */
  {
    const NT = "#0f172a", CY = "#22d3ee", SL = "#94a3b8";
    tpl("it-consultant-hex-card-bc4", "IT consultant monogram business card", US, tags("it consultant tech technology developer cloud security monogram hexagon dark"), (W, H) => [
      page(NT, [
        S("polygon", 28, 44, 92, 104, "none", { stroke: CY, sw: 2, sides: 6, name: "Hex monogram" }),
        mid("KM", 28, 44, 92, 104, { size: 28, family: "mono", bold: true, color: CY }),
        T("Kenji Mori", 146, 38, 172, { size: 19, bold: true, color: WHITE }),
        T("IT Consultant  ·  Cloud & Security", 146, 62, 172, { size: 8, color: CY }),
        ...[["tel", "+1 555 0109 377"], ["mail", "kenji@example.com"], ["web", "morisystems.example.com"], ["loc", "Seattle, Washington"]].flatMap(([a, s], i) => [
          T(a, 146, 92 + i * 14, 26, { size: 7, family: "mono", color: CY }),
          T(s, 174, 92 + i * 14, 144, { size: 7, family: "mono", color: "#e2e8f0" }),
        ]),
        C(W - 96, 167.5, 5, 5, CY, { name: "Circuit dot" }),
        R(W - 91, 169.5, 91 + B, 1, CY, { op: 0.6, name: "Circuit line" }),
      ]),
      page(CY, [
        R(-B, 71.5, 140, 1.5, NT, { name: "Circuit line" }), C(126, 69, 6, 6, NT, { name: "Circuit dot" }),
        R(-B, 90, 90, 1.5, NT, { name: "Circuit line" }), C(76, 87.5, 6, 6, NT, { name: "Circuit dot" }),
        R(208, 71.5, 140, 1.5, NT, { name: "Circuit line" }), C(204, 69, 6, 6, NT, { name: "Circuit dot" }),
        R(W - 78, 52, 90, 1.5, NT, { name: "Circuit line" }), C(W - 82, 49.5, 6, 6, NT, { name: "Circuit dot" }),
        S("polygon", W / 2 - 30, 38, 60, 68, "none", { stroke: NT, sw: 2.5, sides: 6, name: "Hex monogram" }),
        mid("KM", W / 2 - 30, 38, 60, 68, { size: 20, family: "mono", bold: true, color: NT }),
        T("MORI SYSTEMS", 20, 118, W - 40, { size: 13, bold: true, color: NT, align: "center", ls: 5 }),
        T("secure  ·  scalable  ·  simple", 20, 138, W - 40, { size: 8, family: "mono", color: "#164e63", align: "center" }),
        T("morisystems.example.com", 20, 162, W - 40, { size: 7.5, family: "mono", bold: true, color: NT, align: "center" }),
      ]),
    ]);
  }

  /* 20 Student: centred (initials badge, everything on the centre line), skills back */
  {
    const IN = "#4338ca", PA = "#c7d2fe";
    tpl("student-centred-card-bc4", "Student centred business card", US, tags("student graduate university college internship centred centered simple skills"), (W, H) => [
      page(WHITE, [
        R(-B, -B, W + 2 * B, 6 + B, IN, { name: "Top stripe" }),
        C(W / 2 - 16, 24, 32, 32, "#eef2ff", { name: "Initials badge" }),
        mid("AK", W / 2 - 16, 24, 32, 32, { size: 11, bold: true, color: IN }),
        T("Aisha Karim", 20, 64, W - 40, { size: 20, bold: true, color: "#111827", align: "center" }),
        T("Computer Science Student", 20, 90, W - 40, { size: 9.5, color: IN, align: "center" }),
        T("Lakeside University  ·  Class of 2027", 20, 105, W - 40, { size: 7.5, color: "#6b7280", align: "center" }),
        R(W / 2 - 20, 126, 40, 1, PA, { name: "Rule" }),
        T("aisha@example.com   ·   +1 555 0166 254", 20, 138, W - 40, { size: 7.5, color: "#374151", align: "center" }),
        T("aishakarim.example.com", 20, 152, W - 40, { size: 7.5, bold: true, color: IN, align: "center" }),
      ]),
      page(IN, [
        T("SKILLS", 20, 26, W - 40, { size: 8, bold: true, color: PA, align: "center", ls: 4 }),
        ...pills(["Python", "JavaScript", "UI design"], W / 2, 46, { size: 8, stroke: WHITE }),
        ...pills(["Data analysis", "Public speaking", "Teamwork"], W / 2, 74, { size: 8, stroke: WHITE }),
        T("Open to summer internships, 2027", 20, 118, W - 40, { size: 10, family: "serif", italic: true, color: WHITE, align: "center" }),
        T("Projects and portfolio at aishakarim.example.com", 20, 146, W - 40, { size: 7.5, color: PA, align: "center" }),
      ]),
    ]);
  }
}
