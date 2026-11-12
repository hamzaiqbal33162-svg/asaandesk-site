// AsaanDesk Studio: 25 more own business card layouts (front + back), each a different composition.
// Pure module. templates.js calls the default export with its helpers. Own text, colours and shapes only.
export default function addCardTemplates(k) {
  const { tpl, T, R, C, S, E, F, page } = k;
  const { INK, MUTED, WHITE } = k.K;
  const tags = (extra) => "business card visiting card contact " + extra;
  // Contact rows with small icons.
  const rows = (list, x, y, gap, size, ic, tc, w = 180, align = "left") => list.flatMap(([icon, t], i) => (icon
    ? [E(icon, x, y + i * gap, size + 2, { c1: ic }), T(t, x + size + 8, y + i * gap, w, { size, color: tc, align })]
    : [T(t, x, y + i * gap, w, { size, color: tc, align })]));
  const STD = (phone, mail, place) => [["icon-call", phone], ["icon-mail", mail], ["icon-location", place]];

  // 1 centred name
  tpl("centered-name-card-x3", "Centred name business card", "business-card-us", tags("centered minimal classic"), (W, H) => [
    page("#ffffff", [
      T("OLIVIA BENNETT", 20, 58, W - 40, { size: 20, bold: true, color: "#1f2a44", align: "center", ls: 3 }),
      R(W / 2 - 30, 90, 60, 2, "#c08a2b", { name: "Rule" }),
      T("Interior Designer", 20, 100, W - 40, { size: 11, italic: true, family: "serif", color: "#5b6478", align: "center" }),
      T("+1 555 0110 245  ·  olivia@bennettinteriors.co", 20, 150, W - 40, { size: 8.5, color: "#5b6478", align: "center" }),
    ]),
    page("#1f2a44", [
      T("BENNETT", 20, 72, W - 40, { size: 26, bold: true, family: "serif", color: "#ffffff", align: "center", ls: 6 }),
      T("INTERIORS", 20, 106, W - 40, { size: 10, color: "#e8c78a", align: "center", ls: 8 }),
    ]),
  ]);
  // 2 split halves
  tpl("split-halves-card-x3", "Split colour business card", "business-card-us", tags("split two colour modern"), (W, H) => [
    page("#ffffff", [
      R(0, 0, W / 2, H, "#0f766e", { name: "Left half" }),
      T("Ethan\nCole", 18, 52, W / 2 - 30, { size: 24, bold: true, color: "#ffffff", lh: 1.05 }),
      T("Software Engineer", 18, 118, W / 2 - 30, { size: 10, color: "#ccfbf1" }),
      ...rows(STD("+1 555 0133 902", "ethan@cole.dev", "Austin, Texas"), W / 2 + 16, 62, 24, 9, "#0f766e", INK, 130),
    ]),
    page("#ffffff", [
      R(W / 2, 0, W / 2, H, "#0f766e", { name: "Right half" }),
      T("cole.dev", 18, 84, W / 2 - 30, { size: 18, bold: true, color: "#0f766e" }),
      T("Apps · Web · Cloud", W / 2 + 14, 88, W / 2 - 28, { size: 10, color: "#ffffff" }),
    ]),
  ]);
  // 3 vertical stack with rotated name
  tpl("vertical-stack-card-x3", "Vertical stack business card", "business-card-us", tags("vertical rotated side modern"), (W, H) => [
    page("#fff7ed", [
      R(0, 0, 54, H, "#9a3412", { name: "Side strip" }),
      T("HARBOR BAKERY", -60, H / 2 - 10, 174, { size: 13, bold: true, color: "#ffffff", align: "center", ls: 3, rot: -90 }),
      T("Grace Kim", 76, 34, 240, { size: 20, bold: true, color: "#7c2d12" }),
      T("Head Baker and Owner", 76, 62, 240, { size: 10.5, color: "#9a3412" }),
      ...rows(STD("+1 555 0175 330", "grace@harborbakery.com", "18 Pier Road, Portland"), 76, 98, 22, 9, "#9a3412", INK, 220),
    ]),
    page("#9a3412", [
      E("icon-chai", W / 2 - 22, 44, 44, { c1: "#fed7aa" }),
      T("Fresh bread every morning", 20, 104, W - 40, { size: 13, italic: true, family: "serif", color: "#ffffff", align: "center" }),
      T("harborbakery.com", 20, 132, W - 40, { size: 9.5, color: "#fed7aa", align: "center" }),
    ]),
  ]);
  // 4 monogram badge
  tpl("monogram-badge-card-x3", "Monogram badge business card", "business-card-eu", tags("monogram badge initials elegant"), (W, H) => [
    page("#f8fafc", [
      C(W / 2 - 36, 26, 72, 72, "none", { stroke: "#334155", sw: 2, name: "Badge ring" }),
      T("JR", W / 2 - 36, 46, 72, { size: 26, family: "serif", bold: true, color: "#334155", align: "center" }),
      T("Julia Reyes", 20, 112, W - 40, { size: 17, bold: true, color: "#0f172a", align: "center" }),
      T("Attorney at Law", 20, 136, W - 40, { size: 10, color: "#64748b", align: "center" }),
      T("julia@reyeslegal.com  ·  +1 555 0190 116", 20, 170, W - 40, { size: 8, color: "#64748b", align: "center" }),
    ]),
    page("#334155", [
      C(W / 2 - 44, H / 2 - 44, 88, 88, "none", { stroke: "#e2e8f0", sw: 2, name: "Badge ring" }),
      T("JR", W / 2 - 44, H / 2 - 18, 88, { size: 30, family: "serif", bold: true, color: "#ffffff", align: "center" }),
    ]),
  ]);
  // 5 photo circle
  tpl("photo-circle-card-x3", "Photo circle business card", "business-card-us", tags("photo portrait circle personal"), (W, H) => [
    page("#ffffff", [
      C(18, 40, 112, 112, "#e0f2fe", { name: "Photo ring" }),
      F(26, 48, 96, 96, { shape: "circle", name: "Portrait photo" }),
      T("Noah Patel", 148, 46, 170, { size: 19, bold: true, color: "#0c4a6e" }),
      T("Fitness Coach", 148, 72, 170, { size: 10.5, color: "#0284c7" }),
      ...rows(STD("+1 555 0122 818", "noah@fitwithnoah.com", "Denver, Colorado"), 148, 100, 20, 8.5, "#0284c7", INK, 160),
    ]),
    page("#0284c7", [
      T("FIT WITH NOAH", 20, 74, W - 40, { size: 20, bold: true, color: "#ffffff", align: "center", ls: 2 }),
      T("Personal training · Online plans", 20, 106, W - 40, { size: 10, color: "#e0f2fe", align: "center" }),
    ]),
  ]);
  // 6 minimal line
  tpl("minimal-line-card-x3", "Minimal line business card", "business-card-eu", tags("minimal simple clean line"), (W, H) => [
    page("#ffffff", [
      T("Lena Fischer", 22, 112, 200, { size: 16, bold: true, color: INK }),
      T("Architect", 22, 134, 200, { size: 9.5, color: MUTED }),
      R(22, 156, W - 44, 1, INK, { name: "Line" }),
      T("lena@fischer.studio", 22, 166, 130, { size: 8, color: INK }),
      T("+49 30 555 0144", W - 152, 166, 130, { size: 8, color: INK, align: "right" }),
    ]),
    page("#ffffff", [
      R(22, H / 2, W - 44, 1, INK, { name: "Line" }),
      T("FISCHER STUDIO", 22, H / 2 - 24, W - 44, { size: 12, bold: true, color: INK, ls: 4 }),
    ]),
  ]);
  // 7 bold side band with initials
  tpl("side-band-card-x3", "Bold side band business card", "business-card-us", tags("bold band side colour"), (W, H) => [
    page("#ffffff", [
      R(W - 92, 0, 92, H, "#7c3aed", { name: "Side band" }),
      T("AS", W - 92, 74, 92, { size: 30, bold: true, color: "#ffffff", align: "center" }),
      T("Amir Shah", 22, 36, 200, { size: 20, bold: true, color: "#2e1065" }),
      T("Marketing Consultant", 22, 62, 200, { size: 10.5, color: "#7c3aed" }),
      ...rows(STD("+1 555 0161 404", "amir@shahgrowth.com", "Chicago, Illinois"), 22, 98, 22, 9, "#7c3aed", INK, 190),
    ]),
    page("#7c3aed", [
      R(0, 0, 92, H, "#2e1065", { name: "Side band" }),
      T("Shah Growth", 112, 72, 210, { size: 20, bold: true, color: "#ffffff" }),
      T("Brands that people remember", 112, 102, 210, { size: 10, color: "#ede9fe" }),
    ]),
  ]);
  // 8 diagonal block
  tpl("diagonal-block-card-x3", "Diagonal block business card", "business-card-us", tags("diagonal angle dynamic modern"), (W, H) => [
    page("#ffffff", [
      R(W * 0.48, -60, 260, 320, "#f59e0b", { rot: 18, name: "Diagonal block" }),
      T("Carlos Mendes", 20, 40, 190, { size: 18, bold: true, color: "#1c1917" }),
      T("Electrician", 20, 66, 190, { size: 10.5, color: "#b45309" }),
      ...rows(STD("+1 555 0157 280", "carlos@brightwire.com", "Phoenix, Arizona"), 20, 102, 22, 9, "#b45309", INK, 160),
    ]),
    page("#1c1917", [
      R(-80, -60, 220, 320, "#f59e0b", { rot: 18, name: "Diagonal block" }),
      T("BRIGHT\nWIRE", 150, 66, 170, { size: 24, bold: true, color: "#ffffff", lh: 1 }),
      T("Licensed and insured", 150, 128, 170, { size: 9.5, color: "#fcd34d" }),
    ]),
  ]);
  // 9 corner ribbon
  tpl("corner-ribbon-card-x3", "Corner ribbon business card", "business-card-eu", tags("corner ribbon triangle accent"), (W, H) => [
    page("#fdf4ff", [
      S("triangle", W - 110, -50, 160, 120, "#c026d3", { rot: 45, name: "Corner" }),
      T("Sofia Rossi", 22, 52, 200, { size: 19, bold: true, color: "#4a044e" }),
      T("Wedding Planner", 22, 78, 200, { size: 10.5, family: "serif", italic: true, color: "#a21caf" }),
      ...rows(STD("+39 02 555 0188", "sofia@rossievents.it", "Milan, Italy"), 22, 116, 21, 8.5, "#a21caf", INK, 180),
    ]),
    page("#4a044e", [
      S("triangle", -50, H - 70, 160, 120, "#f0abfc", { rot: 225, name: "Corner" }),
      T("Rossi Events", 20, 82, W - 40, { size: 22, family: "serif", bold: true, color: "#ffffff", align: "center" }),
      T("Days you will never forget", 20, 114, W - 40, { size: 9.5, color: "#f5d0fe", align: "center" }),
    ]),
  ]);
  // 10 big initial
  tpl("big-initial-card-x3", "Big initial business card", "business-card-us", tags("big letter initial typographic"), (W, H) => [
    page("#ecfeff", [
      T("M", -6, -22, 160, { size: 200, bold: true, family: "serif", color: "#0891b2", op: 0.18, name: "Big initial" }),
      T("Mia Thompson", 140, 50, 180, { size: 19, bold: true, color: "#164e63" }),
      T("Speech Therapist", 140, 76, 180, { size: 10.5, color: "#0891b2" }),
      ...rows(STD("+1 555 0119 662", "mia@clearvoice.org", "Seattle, Washington"), 140, 108, 20, 8.5, "#0891b2", INK, 170),
    ]),
    page("#0891b2", [
      T("M", W / 2 - 60, 8, 120, { size: 116, bold: true, family: "serif", color: "#ffffff", align: "center", op: 0.95 }),
      T("CLEAR VOICE THERAPY", 20, 162, W - 40,{ size: 9.5, color: "#cffafe", align: "center", ls: 3 }),
    ]),
  ]);
  // 11 dark luxe
  tpl("dark-luxe-card-x3", "Dark luxe business card", "business-card-eu", tags("luxury dark gold premium elegant"), (W, H) => [
    page("#0b0b0f", [
      R(12, 12, W - 24, H - 24, "none", { stroke: "#d4af37", sw: 1, name: "Gold frame" }),
      T("VICTOR LANE", 20, 70, W - 40, { size: 18, bold: true, family: "serif", color: "#d4af37", align: "center", ls: 4 }),
      T("Private Jeweller", 20, 98, W - 40, { size: 10, italic: true, family: "serif", color: "#e5e5e5", align: "center" }),
      T("by appointment  ·  +44 20 555 0122", 20, 150, W - 40, { size: 8, color: "#a3a3a3", align: "center" }),
    ]),
    page("#0b0b0f", [
      S("polygon", W / 2 - 24, 60, 48, 48, "none", { stroke: "#d4af37", sw: 1.5, sides: 4, rot: 45, name: "Diamond" }),
      T("LANE & CO.", 20, 124, W - 40, { size: 13, family: "serif", color: "#d4af37", align: "center", ls: 6 }),
    ]),
  ]);
  // 12 outline frame
  tpl("outline-frame-card-x3", "Outline frame business card", "business-card-us", tags("frame border outline classic"), (W, H) => [
    page("#fffbeb", [
      R(10, 10, W - 20, H - 20, "none", { stroke: "#166534", sw: 2, name: "Frame" }),
      R(16, 16, W - 32, H - 32, "none", { stroke: "#166534", sw: 0.75, name: "Inner frame" }),
      T("Green Thumb Gardens", 30, 40, W - 60, { size: 17, bold: true, family: "serif", color: "#166534", align: "center" }),
      T("Peter Walsh · Landscape Gardener", 30, 70, W - 60, { size: 10, color: "#3f6212", align: "center" }),
      T("+1 555 0148 019\npeter@greenthumb.garden", 30, 112, W - 60, { size: 9, color: INK, align: "center", lh: 1.5 }),
    ]),
    page("#166534", [
      R(10, 10, W - 20, H - 20, "none", { stroke: "#fef9c3", sw: 2, name: "Frame" }),
      E("icon-leaf", W / 2 - 22, 56, 44, { c1: "#fef9c3" }),
      T("We grow what you love", 20, 118, W - 40, { size: 11, italic: true, family: "serif", color: "#fef9c3", align: "center" }),
    ]),
  ]);
  // 13 dotted pattern
  tpl("dotted-pattern-card-x3", "Dotted pattern business card", "business-card-us", tags("pattern dots playful"), (W, H) => {
    const dots = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) dots.push(C(W - 116 + c * 20, 18 + r * 24, 8, 8, "#ec4899", { op: 0.25 + ((r + c) % 3) * 0.2, name: "Dot" }));
    return [
      page("#ffffff", [...dots,
        T("Zoe Martin", 22, 46, 200, { size: 20, bold: true, color: "#831843" }),
        T("Illustrator", 22, 72, 200, { size: 10.5, color: "#db2777" }),
        ...rows(STD("+1 555 0109 553", "zoe@zoedraws.art", "Brooklyn, New York"), 22, 104, 21, 8.5, "#db2777", INK, 170)]),
      page("#831843", [T("zoe draws", 20, 78, W - 40, { size: 26, family: "serif", italic: true, bold: true, color: "#ffffff", align: "center" }), T("Books · Brands · Murals", 20, 114, W - 40, { size: 9.5, color: "#fbcfe8", align: "center" })]),
    ];
  });
  // 14 wave footer
  tpl("wave-footer-card-x3", "Wave footer business card", "business-card-eu", tags("wave water calm footer"), (W, H) => [
    page("#ffffff", [
      C(-40, H - 46, 180, 90, "#38bdf8", { name: "Wave" }), C(110, H - 36, 180, 90, "#0ea5e9", { name: "Wave" }), C(250, H - 50, 180, 90, "#38bdf8", { name: "Wave" }),
      T("Liam O'Brien", 22, 30, 240, { size: 19, bold: true, color: "#0c4a6e" }),
      T("Swim Instructor", 22, 56, 240, { size: 10.5, color: "#0284c7" }),
      ...rows(STD("+353 1 555 0177", "liam@splashswim.ie", "Dublin, Ireland"), 22, 84, 20, 8.5, "#0284c7", INK, 190),
    ]),
    page("#0ea5e9", [
      C(-40, -46, 180, 90, "#38bdf8", { name: "Wave" }), C(110, -54, 180, 90, "#7dd3fc", { name: "Wave" }), C(250, -44, 180, 90, "#38bdf8", { name: "Wave" }),
      T("Splash Swim School", 20, 98, W - 40, { size: 19, bold: true, color: "#ffffff", align: "center" }),
      T("Lessons for all ages", 20, 128, W - 40, { size: 9.5, color: "#e0f2fe", align: "center" }),
    ]),
  ]);
  // 15 stamp seal
  tpl("stamp-seal-card-x3", "Stamp seal business card", "business-card-us", tags("seal stamp badge vintage"), (W, H) => [
    page("#fefce8", [
      C(W - 120, 36, 100, 100, "none", { stroke: "#b91c1c", sw: 2, name: "Seal ring" }),
      C(W - 112, 44, 84, 84, "none", { stroke: "#b91c1c", sw: 0.75, name: "Seal inner ring" }),
      T("EST.\n2009", W - 120, 66, 100, { size: 13, bold: true, color: "#b91c1c", align: "center", lh: 1.1 }),
      T("Old Mill Coffee", 22, 44, 190, { size: 18, bold: true, family: "serif", color: "#451a03" }),
      T("Hannah Price · Roaster", 22, 72, 190, { size: 10, color: "#92400e" }),
      ...rows(STD("+1 555 0124 670", "hannah@oldmill.coffee", "Asheville, NC"), 22, 106, 21, 8.5, "#b91c1c", INK, 170),
    ]),
    page("#451a03", [
      C(W / 2 - 50, H / 2 - 50, 100, 100, "none", { stroke: "#fde68a", sw: 2, name: "Seal ring" }),
      T("OLD\nMILL", W / 2 - 50, H / 2 - 24, 100, { size: 18, bold: true, family: "serif", color: "#fde68a", align: "center", lh: 1.05 }),
    ]),
  ]);
  // 16 stacked columns
  tpl("stacked-columns-card-x3", "Three column business card", "business-card-eu", tags("columns grid information corporate"), (W, H) => {
    const cw = (W - 44) / 3;
    const col = (i, head, body) => [T(head, 22 + i * cw, 120, cw - 8, { size: 7.5, bold: true, color: "#4338ca", ls: 1 }), T(body, 22 + i * cw, 134, cw - 8, { size: 8, color: INK, lh: 1.35 })];
    return [
      page("#ffffff", [
        T("Ravi Kumar", 22, 34, W - 44, { size: 20, bold: true, color: "#1e1b4b" }),
        T("Data Analyst · Brightlane", 22, 62, W - 44, { size: 10, color: "#6366f1" }),
        R(22, 104, W - 44, 1, "#c7d2fe", { name: "Rule" }),
        ...col(0, "CALL", "+44 20 555\n0166"), ...col(1, "EMAIL", "ravi@\nbrightlane.io"), ...col(2, "VISIT", "12 King St\nLondon"),
      ]),
      page("#1e1b4b", [T("brightlane", 20, 84, W - 40, { size: 24, bold: true, color: "#ffffff", align: "center" }), R(W / 2 - 20, 120, 40, 3, "#818cf8", { name: "Rule" })]),
    ];
  });
  // 17 tab label
  tpl("tab-label-card-x3", "Tab label business card", "business-card-us", tags("tab label folder playful"), (W, H) => [
    page("#f0fdf4", [
      R(22, 0, 130, 34, "#15803d", { radius: 6, name: "Tab" }),
      T("PLUMBING", 22, 10, 130, { size: 11, bold: true, color: "#ffffff", align: "center", ls: 2 }),
      T("Marcus Hill", 22, 58, 220, { size: 20, bold: true, color: "#14532d" }),
      T("Master Plumber · 24/7", 22, 86, 220, { size: 10.5, color: "#15803d" }),
      ...rows(STD("+1 555 0181 909", "marcus@hillplumbing.com", "Columbus, Ohio"), 22, 116, 21, 8.5, "#15803d", INK, 200),
    ]),
    page("#15803d", [
      R(W - 152, H - 34, 130, 34, "#f0fdf4", { radius: 6, name: "Tab" }),
      T("Hill Plumbing", 20, 70, W - 40, { size: 22, bold: true, color: "#ffffff", align: "center" }),
      T("No leak too small", 20, 102, W - 40, { size: 10, color: "#dcfce7", align: "center" }),
    ]),
  ]);
  // 18 duotone halves (top / bottom)
  tpl("duotone-card-x3", "Duotone business card", "business-card-eu", tags("duotone two tone top bottom"), (W, H) => [
    page("#ffe4e6", [
      R(0, 0, W, H * 0.55, "#be123c", { name: "Top block" }),
      T("Emma Clarke", 22, 40, W - 44, { size: 20, bold: true, color: "#ffffff" }),
      T("Florist", 22, 68, W - 44, { size: 10.5, color: "#ffe4e6" }),
      T("+44 161 555 0133  ·  emma@petalandstem.uk  ·  Manchester", 22, H * 0.55 + 30, W - 44, { size: 8, color: "#881337" }),
    ]),
    page("#be123c", [
      R(0, H * 0.55, W, H * 0.45, "#ffe4e6", { name: "Bottom block" }),
      T("Petal & Stem", 22, 48, W - 44, { size: 22, family: "serif", bold: true, color: "#ffffff" }),
      T("Fresh flowers, delivered", 22, H * 0.55 + 30, W - 44, { size: 10, color: "#be123c" }),
    ]),
  ]);
  // 19 icon grid
  tpl("icon-grid-card-x3", "Icon grid business card", "business-card-us", tags("icons grid info tech"), (W, H) => {
    const cell = (i, icon, t) => { const x = 22 + (i % 2) * 150, y = 96 + Math.floor(i / 2) * 36; return [R(x, y, 26, 26, "#eef2ff", { radius: 6, name: "Icon tile" }), E(icon, x + 5, y + 5, 16, { c1: "#4f46e5" }), T(t, x + 34, y + 7, 112, { size: 8.5, color: INK })]; };
    return [
      page("#ffffff", [
        T("Hiro Tanaka", 22, 30, 280, { size: 20, bold: true, color: "#1e1b4b" }),
        T("IT Support Specialist", 22, 58, 280, { size: 10.5, color: "#4f46e5" }),
        ...cell(0, "icon-call", "+1 555 0136 225"), ...cell(1, "icon-mail", "hiro@fixit.tech"), ...cell(2, "icon-globe", "fixit.tech"), ...cell(3, "icon-location", "San Jose, CA"),
      ]),
      page("#4f46e5", [E("icon-settings", W / 2 - 22, 46, 44, { c1: "#e0e7ff" }), T("FixIt Tech Help", 20, 104, W - 40, { size: 18, bold: true, color: "#ffffff", align: "center" }), T("Same-day home and office visits", 20, 132, W - 40, { size: 9, color: "#e0e7ff", align: "center" })]),
    ];
  });
  // 20 square code corner (decorative block pattern)
  tpl("square-pattern-card-x3", "Square pattern corner business card", "business-card-eu", tags("squares pattern corner digital modern"), (W, H) => {
    const blocks = [];
    const on = [1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1];
    on.forEach((v, i) => { if (v) blocks.push(R(W - 92 + (i % 5) * 14, H - 92 + Math.floor(i / 5) * 14, 12, 12, "#111827", { name: "Square" })); });
    return [
      page("#ffffff", [...blocks,
        T("Aisha Bello", 22, 34, 200, { size: 19, bold: true, color: "#111827" }),
        T("Web Developer", 22, 60, 200, { size: 10.5, color: "#059669" }),
        ...rows(STD("+234 1 555 0102", "aisha@bello.dev", "Lagos, Nigeria"), 22, 96, 21, 8.5, "#059669", INK, 180)]),
      page("#059669", [T("bello.dev", 20, 84, W - 40, { size: 24, bold: true, family: "mono", color: "#ffffff", align: "center" }), T("< clean code, fast sites />", 20, 118, W - 40, { size: 9, family: "mono", color: "#d1fae5", align: "center" })]),
    ];
  });
  // 21 ticket stub
  tpl("ticket-stub-card-x3", "Ticket stub business card", "business-card-us", tags("ticket stub event cinema perforated"), (W, H) => {
    const perf = [];
    for (let i = 0; i < 12; i++) perf.push(C(W - 98, 6 + i * 16, 5, 5, "#fde68a", { name: "Perforation" }));
    return [
      page("#1e3a8a", [...perf,
        T("Ben Ortiz", 20, 40, 200, { size: 20, bold: true, color: "#ffffff" }),
        T("Event Producer", 20, 66, 200, { size: 10.5, color: "#fde68a" }),
        T("+1 555 0170 448\nben@stagelight.events\nNashville, Tennessee", 20, 100, 200, { size: 9, color: "#dbeafe", lh: 1.5 }),
        T("ADMIT\nONE", W - 90, 70, 80, { size: 14, bold: true, color: "#fde68a", align: "center", lh: 1.1 })]),
      page("#fde68a", [T("STAGELIGHT", 20, 70, W - 40, { size: 24, bold: true, color: "#1e3a8a", align: "center", ls: 4 }), T("Concerts · Festivals · Shows", 20, 106, W - 40, { size: 10, color: "#1e3a8a", align: "center" })]),
    ];
  });
  // 22 big circle crop
  tpl("circle-crop-card-x3", "Big circle business card", "business-card-us", tags("circle round bold shape"), (W, H) => [
    page("#ffffff", [
      C(-70, -40, 230, 230, "#facc15", { name: "Big circle" }),
      T("Leo\nGarcia", 22, 54, 140, { size: 22, bold: true, color: "#1c1917", lh: 1.05 }),
      T("Photographer", 190, 52, 140, { size: 11, bold: true, color: "#a16207" }),
      T("+1 555 0151 372\nleo@garcia.photo\nMiami, Florida", 190, 80, 140, { size: 9, color: INK, lh: 1.5 }),
    ]),
    page("#1c1917", [
      C(W - 160, -40, 230, 230, "#facc15", { name: "Big circle" }),
      E("icon-camera", 40, 70, 50, { c1: "#facc15" }),
      T("garcia.photo", 110, 84, 120, { size: 15, bold: true, color: "#ffffff" }),
    ]),
  ]);
  // 23 thin stripes top
  tpl("stripes-top-card-x3", "Stripes business card", "business-card-eu", tags("stripes lines retro colourful"), (W, H) => [
    page("#ffffff", [
      R(0, 0, W, 8, "#ef4444", { name: "Stripe" }), R(0, 10, W, 8, "#f97316", { name: "Stripe" }), R(0, 20, W, 8, "#eab308", { name: "Stripe" }), R(0, 30, W, 8, "#22c55e", { name: "Stripe" }),
      T("Kids Corner Daycare", 22, 62, W - 44, { size: 17, bold: true, color: "#1e293b" }),
      T("Nora Evans · Director", 22, 88, W - 44, { size: 10.5, color: "#ef4444" }),
      ...rows(STD("+1 555 0128 731", "nora@kidscorner.care", "Boise, Idaho"), 22, 120, 21, 8.5, "#f97316", INK, 200),
    ]),
    page("#1e293b", [
      R(0, H - 38, W, 8, "#22c55e", { name: "Stripe" }), R(0, H - 28, W, 8, "#eab308", { name: "Stripe" }), R(0, H - 18, W, 8, "#f97316", { name: "Stripe" }), R(0, H - 8, W, 8, "#ef4444", { name: "Stripe" }),
      T("Play · Learn · Grow", 20, 76, W - 40, { size: 18, bold: true, color: "#ffffff", align: "center" }),
    ]),
  ]);
  // 24 arch window
  tpl("arch-card-x3", "Arch business card", "business-card-us", tags("arch window soft boho"), (W, H) => [
    page("#fdf6ec", [
      C(30, 26, 110, 110, "#d6a37c", { name: "Arch top" }), R(30, 81, 110, 111, "#d6a37c", { name: "Arch body" }),
      T("Sage\nYoga", 30, 96, 110, { size: 18, bold: true, family: "serif", color: "#ffffff", align: "center", lh: 1.05 }),
      T("Rina Das", 168, 46, 150, { size: 18, bold: true, family: "serif", color: "#7c4a2d" }),
      T("Yoga Teacher", 168, 72, 150, { size: 10, color: "#a16207" }),
      T("+1 555 0113 840\nrina@sageyoga.studio\nSanta Fe, NM", 168, 104, 150, { size: 9, color: INK, lh: 1.5 }),
    ]),
    page("#d6a37c", [
      C(W / 2 - 50, 30, 100, 100, "#fdf6ec", { name: "Arch top" }), R(W / 2 - 50, 80, 100, 112, "#fdf6ec", { name: "Arch body" }),
      T("breathe", W / 2 - 50, 120, 100, { size: 15, italic: true, family: "serif", color: "#7c4a2d", align: "center" }),
    ]),
  ]);
  // 25 typographic
  tpl("typographic-card-x3", "Typographic business card", "business-card-eu", tags("typographic bold type editorial"), (W, H) => [
    page("#f5f5f4", [
      T("SAM\nWELLS", 18, 16, W - 36, { size: 46, bold: true, family: "serif", color: "#1c1917", lh: 0.95 }),
      T("Copywriter", 20, 124, 200, { size: 10.5, italic: true, family: "serif", color: "#dc2626" }),
      T("sam@wellswords.com · +1 555 0145 602", 20, 172, W - 40, { size: 8, color: "#44403c" }),
    ]),
    page("#dc2626", [
      T("Words\nthat\nwork.", 20, 22, W - 40, { size: 40, bold: true, family: "serif", color: "#ffffff", lh: 0.95 }),
    ]),
  ]);
}
