// AsaanDesk Studio: more own print templates (business cards, invitations, flyers, brochures, posters, labels).
// Pure module. templates.js calls the default export with its helpers (tpl, T, R, C, S, E, F, page, flow, K).
// All text, colours and layouts are our own; artwork is plain shapes and our own stickers.
export default function addPrintTemplates(k) {
  const { tpl, T, R, C, S, E, F, page, flow } = k;
  const { INK, MUTED, IND, COR, TEA, AMB, ROS, WHITE, GOLD, NAVY } = k.K;

  /* ================= Business cards (front + back) ================= */
  const contacts = (rows, x, y, gap, size, iconColor, textColor, w = 220) => rows.flatMap(([ic, t], i) => [E(ic, x, y + i * gap, size + 2, { c1: iconColor }), T(t, x + size + 10, y + i * gap, w, { size, color: textColor })]);

  tpl("corporate-business-card", "Corporate business card", "business-card-us", "business card corporate company office professional contact", (W, H) => [
    page(WHITE, [
      R(0, 0, W, 10, NAVY, { name: "Top band" }),
      R(0, H - 10, W, 10, TEA, { name: "Bottom band" }),
      T("Daniel Carter", 24, 30, 220, { size: 22, bold: true, color: NAVY }),
      T("Chief Financial Officer", 24, 60, 220, { size: 11.5, color: TEA, bold: true }),
      ...contacts([["icon-call", "+1 555 0142 778"], ["icon-mail", "daniel@northbridge.co"], ["icon-location", "200 Market Street, Suite 5"]], 24, 96, 21, 10.5, NAVY, INK),
      S("polygon", W - 86, 34, 60, 60, NAVY, { name: "Logo mark", sides: 6 }),
      T("NB", W - 86, 52, 60, { size: 20, bold: true, color: WHITE, align: "center" }),
    ]),
    page(NAVY, [
      S("polygon", W / 2 - 34, 42, 68, 68, TEA, { sides: 6, name: "Logo mark" }),
      T("NB", W / 2 - 34, 62, 68, { size: 22, bold: true, color: WHITE, align: "center" }),
      T("NORTHBRIDGE CAPITAL", 20, 124, W - 40, { size: 15, bold: true, color: WHITE, align: "center", ls: 3 }),
      T("www.northbridge.co", 20, 148, W - 40, { size: 10.5, color: "#99f6e4", align: "center" }),
    ]),
  ]);
  tpl("creative-studio-business-card", "Creative studio business card", "business-card-us", "business card creative studio designer colourful agency", (W, H) => [
    page("#fdf2f8", [
      C(-40, -40, 150, 150, ROS, { op: 0.9, name: "Blob" }),
      C(W - 90, H - 80, 140, 140, AMB, { op: 0.9, name: "Blob" }),
      C(W - 60, 18, 36, 36, TEA, { name: "Dot" }),
      T("Maya Lopez", 120, 40, 200, { size: 22, bold: true, color: INK }),
      T("Art Director", 120, 68, 200, { size: 12, family: "serif", italic: true, color: ROS }),
      T("hello@pixelandpaint.studio\n+1 555 0199 314\npixelandpaint.studio", 120, 96, 180, { size: 10.5, color: INK, lh: 1.5 }),
    ]),
    page(INK, [
      E("deco-squiggle", 30, 30, 70, { c1: AMB }),
      E("deco-sparkle", W - 70, H - 70, 40, { c1: ROS }),
      T("pixel\n& paint", 20, 54, W - 40, { size: 34, family: "serif", bold: true, italic: true, color: WHITE, align: "center", lh: 1 }),
      T("DESIGN STUDIO", 20, 140, W - 40, { size: 10, color: "#fbcfe8", align: "center", ls: 5 }),
    ]),
  ]);
  tpl("clinic-business-card", "Doctor clinic business card", "business-card-eu", "business card doctor clinic medical health physician", (W, H) => [
    page(WHITE, [
      R(0, 0, 90, H, "#e0f2fe", { name: "Side panel" }),
      E("shape-plus", 22, H / 2 - 23, 46, { c1: "#0284c7", name: "Medical cross" }),
      T("Dr. Amelia Grant", 108, 32, W - 120, { size: 19, bold: true, color: "#0c4a6e" }),
      T("Family Physician · MBBS, FCPS", 108, 58, W - 120, { size: 10, color: "#0284c7" }),
      R(108, 80, 50, 2, "#0284c7", { name: "Line" }),
      ...contacts([["icon-call", "+1 555 0110 220"], ["icon-clock", "Mon–Sat · 9 am – 5 pm"], ["icon-location", "Riverside Health Centre"]], 108, 98, 22, 10, "#0284c7", INK, 190),
    ]),
    page("#0284c7", [
      E("shape-plus", W / 2 - 26, 46, 52, { c1: WHITE, name: "Medical cross" }),
      T("Riverside Family Clinic", 20, 116, W - 40, { size: 17, bold: true, color: WHITE, align: "center" }),
      T("Caring for every generation", 20, 142, W - 40, { size: 10.5, family: "serif", italic: true, color: "#e0f2fe", align: "center" }),
    ]),
  ]);
  tpl("real-estate-business-card", "Real estate agent business card", "business-card-us", "business card real estate property agent realtor homes", (W, H) => [
    page("#f8fafc", [
      R(W * 0.58, 0, W * 0.42, H, "#065f46", { name: "Colour block" }),
      E("icon-home", W * 0.58 + (W * 0.42) / 2 - 30, 40, 60, { c1: GOLD }),
      T("KEY HOMES", W * 0.58, 112, W * 0.42, { size: 14, bold: true, color: WHITE, align: "center", ls: 2 }),
      T("Realty group", W * 0.58, 134, W * 0.42, { size: 10, family: "serif", italic: true, color: "#a7f3d0", align: "center" }),
      T("Olivia Bennett", 18, 34, 180, { size: 19, bold: true, color: "#065f46" }),
      T("Licensed property agent", 18, 60, 180, { size: 10.5, color: MUTED }),
      T("+1 555 0175 640\nolivia@keyhomes.com\nkeyhomes.com", 18, 96, 180, { size: 10.5, color: INK, lh: 1.55 }),
    ]),
    page("#065f46", [
      E("icon-key", W / 2 - 26, 36, 52, { c1: GOLD }),
      T("Find the key to your next home", 30, 104, W - 60, { size: 17, family: "serif", bold: true, color: WHITE, align: "center", lh: 1.2 }),
      T("Buy · Sell · Rent", 20, 160, W - 40, { size: 10.5, color: GOLD, align: "center", ls: 2 }),
    ]),
  ]);
  tpl("photographer-business-card", "Photographer business card", "business-card-eu", "business card photographer photography camera wedding portrait", (W, H) => [
    page(INK, [
      E("icon-camera", 22, 26, 34, { c1: AMB }),
      T("Noah Kim", 22, 74, 200, { size: 24, bold: true, color: WHITE }),
      T("Wedding & portrait photographer", 22, 104, 220, { size: 10.5, color: "#cbd5e1" }),
      T("+1 555 0133 908 · noahkim.photo", 22, H - 46, W - 44, { size: 10, color: AMB }),
      C(W - 100, 30, 76, 76, "none", { stroke: AMB, sw: 3, name: "Lens ring" }),
      C(W - 82, 48, 40, 40, "#334155", { name: "Lens" }),
    ]),
    page("#f5f5f4", [
      F(14, 14, W - 28, H - 70, { shape: "rounded", radius: 8, name: "Your best photo" }),
      T("NOAH KIM PHOTOGRAPHY", 14, H - 44, W - 28, { size: 12, bold: true, color: INK, align: "center", ls: 3 }),
    ]),
  ]);
  tpl("bakery-business-card", "Bakery business card", "business-card-us", "business card bakery cake cafe pastry sweet shop", (W, H) => [
    page("#fff1f2", [
      R(0, H - 46, W, 46, "#be185d", { name: "Bottom band" }),
      E("deco-hearts", W - 74, 18, 52, { c1: ROS, c2: "#fecdd3" }),
      T("Sweet Crumbs", 22, 26, 230, { size: 26, family: "serif", bold: true, italic: true, color: "#9d174d" }),
      T("Cakes · Cookies · Cupcakes", 22, 64, 240, { size: 11, color: "#be185d", ls: 1 }),
      T("Order: +1 555 0168 452\nsweetcrumbs.bakery", 22, 92, 260, { size: 11, color: INK, lh: 1.5 }),
      T("12 Baker Lane, Old Town", 22, H - 33, W - 44, { size: 11, bold: true, color: WHITE }),
    ]),
    page("#9d174d", [
      E("deco-flower", W / 2 - 30, 30, 60, { c1: "#fbcfe8", c2: GOLD }),
      T("Sweet Crumbs", 20, 100, W - 40, { size: 28, family: "serif", bold: true, italic: true, color: WHITE, align: "center" }),
      T("BAKED FRESH EVERY MORNING", 20, 142, W - 40, { size: 9.5, color: "#fbcfe8", align: "center", ls: 3 }),
    ]),
  ]);

  /* ================= Invitations (5 × 7 in) ================= */
  tpl("baby-shower-invitation", "Baby shower invitation", "invitation-5x7", "invitation baby shower newborn party mom", (W, H) => [page("#eff6ff", [
    C(-80, -80, 260, 260, "#dbeafe", { name: "Soft circle" }),
    C(W - 160, H - 180, 260, 260, "#fce7f3", { name: "Soft circle" }),
    E("deco-stars", W - 150, 40, 110, { c1: "#93c5fd", c2: AMB }),
    E("icon-moon", 50, 60, 70, { c1: AMB }),
    flow(170,
      T("Please join us for a", 40, 0, W - 80, { size: 20, family: "serif", italic: true, color: "#1e3a8a", align: "center" }), 10,
      T("Baby Shower", 30, 0, W - 60, { size: 58, family: "serif", bold: true, color: "#1e40af", align: "center" }), 8,
      T("honouring Emma Wilson", 40, 0, W - 80, { size: 22, color: "#be185d", align: "center" }), 30,
      E("line-ornament", W / 2 - 80, 0, 160, { c1: "#93c5fd" }), 24,
      T("Saturday, 6 February · 2:00 pm", 40, 0, W - 80, { size: 20, bold: true, color: INK, align: "center" }), 8,
      T("The Garden Room, 18 Elm Street", 40, 0, W - 80, { size: 17, color: INK, align: "center" }), 22,
      T("RSVP to Lily · +1 555 0187 220", 40, 0, W - 80, { size: 15, color: MUTED, align: "center" })),
  ])]);
  tpl("graduation-party-invitation", "Graduation party invitation", "invitation-5x7", "invitation graduation party class of 2026 celebration school college", (W, H) => [page(NAVY, [
    E("deco-confetti", 20, 20, W - 40, { c1: GOLD, c2: "#a5b4fc" }),
    S("star", W / 2 - 40, 150, 80, 80, GOLD, { name: "Star" }),
    flow(260,
      T("CLASS OF", 40, 0, W - 80, { size: 22, bold: true, color: GOLD, align: "center", ls: 8 }), 0,
      T("2026", 40, 0, W - 80, { size: 96, bold: true, color: WHITE, align: "center", lh: 1 }), 14,
      T("Graduation Party for Ethan Brooks", 40, 0, W - 80, { size: 22, family: "serif", italic: true, color: "#c7d2fe", align: "center" }), 30,
      T("Friday, 19 June · 7 pm", 40, 0, W - 80, { size: 21, bold: true, color: WHITE, align: "center" }), 8,
      T("Brooks family home · 44 Oak Avenue", 40, 0, W - 80, { size: 16, color: "#c7d2fe", align: "center" })),
    R(120, H - 90, W - 240, 44, GOLD, { radius: 22, name: "RSVP pill" }),
    T("RSVP by 10 June", 120, H - 79, W - 240, { size: 17, bold: true, color: NAVY, align: "center" }),
  ])]);
  tpl("engagement-invitation", "Engagement invitation", "invitation-5x7", "invitation engagement ring ceremony couple party", (W, H) => [page("#fdf4ff", [
    R(30, 30, W - 60, H - 60, "none", { stroke: "#a21caf", sw: 1.5, radius: 18, name: "Border" }),
    E("deco-flower", 46, 46, 80, { c1: "#f0abfc", c2: GOLD }),
    E("deco-flower", W - 126, H - 126, 80, { c1: "#f0abfc", c2: GOLD }),
    flow(170,
      T("We're engaged!", 40, 0, W - 80, { size: 24, family: "serif", italic: true, color: "#a21caf", align: "center" }), 18,
      T("Sophie\n&\nJames", 40, 0, W - 80, { size: 52, family: "serif", bold: true, color: "#701a75", align: "center", lh: 1.05 }), 24,
      T("Join us for an evening of love and laughter", 70, 0, W - 140, { size: 17, color: INK, align: "center", lh: 1.4 }), 24,
      T("Saturday, 12 September · 6:30 pm", 40, 0, W - 80, { size: 19, bold: true, color: INK, align: "center" }), 6,
      T("Rose Hall, Lakeside Hotel", 40, 0, W - 80, { size: 16, color: MUTED, align: "center" })),
  ])]);
  tpl("dinner-party-invitation", "Dinner party invitation", "invitation-5x7", "invitation dinner party evening food friends supper", (W, H) => [page("#1c1917", [
    R(0, 0, W, 230, "#78350f", { name: "Top panel" }),
    E("icon-chai", W / 2 - 40, 60, 80, { c1: GOLD }),
    T("You are invited to", 40, 160, W - 80, { size: 20, family: "serif", italic: true, color: "#fde68a", align: "center" }),
    flow(270,
      T("Dinner Party", 30, 0, W - 60, { size: 60, family: "serif", bold: true, color: WHITE, align: "center" }), 14,
      E("line-diamonds", W / 2 - 100, 0, 200, { c1: GOLD }), 22,
      T("A cosy evening of good food, good wine and great company", 70, 0, W - 140, { size: 17, color: "#e7e5e4", align: "center", lh: 1.4 }), 30,
      T("Saturday, 21 November · 8 pm", 40, 0, W - 80, { size: 20, bold: true, color: GOLD, align: "center" }), 8,
      T("Hosted by Clara & Ben · 7 Willow Court", 40, 0, W - 80, { size: 15, color: "#d6d3d1", align: "center" })),
  ])]);
  tpl("kids-party-invitation", "Kids party invitation", "invitation-5x7", "invitation kids birthday party fun children balloons", (W, H) => [page("#ecfeff", [
    E("deco-rainbow", W / 2 - 150, 40, 300, { c1: ROS, c2: AMB, c3: TEA }),
    flow(220,
      T("Let's party!", 40, 0, W - 80, { size: 26, bold: true, color: "#0e7490", align: "center" }), 10,
      T("Leo turns 5", 30, 0, W - 60, { size: 62, bold: true, color: COR, align: "center" }), 18,
      T("Games, cake and lots of fun", 40, 0, W - 80, { size: 19, color: INK, align: "center" }), 24,
      T("Sunday, 8 March · 3 pm to 6 pm", 40, 0, W - 80, { size: 19, bold: true, color: INK, align: "center" }), 6,
      T("Jungle Play Zone, Park Road", 40, 0, W - 80, { size: 16, color: MUTED, align: "center" })),
    E("deco-balloons", 20, H - 170, 110, { c1: TEA, c2: COR, c3: AMB }),
    E("face-star-eyes", W - 110, H - 120, 80, {}),
    T("RSVP · +1 555 0101 456", 110, H - 60, W - 220, { size: 14, bold: true, color: WHITE, align: "center", bg: { color: "#0e7490", pad: 0.5, radius: 0.6 } }),
  ])]);

  /* ================= Flyers ================= */
  tpl("tuition-classes-flyer", "Tuition classes flyer", "flyer-a4", "flyer tuition classes tutor education school maths science coaching", (W, H) => [page(WHITE, [
    R(0, 0, W, 360, "#1d4ed8", { name: "Header" }),
    E("icon-idea", W - 190, 60, 130, { c1: GOLD }),
    flow(70, T("Tuition", 60, 0, 520, { size: 92, bold: true, color: WHITE, lh: 1 }), 0, T("Classes", 60, 0, 520, { size: 92, bold: true, color: GOLD, lh: 1 }), 20,
      T("Grades 6 to 10 · small groups", 60, 0, 600, { size: 30, color: "#dbeafe" })),
    ...["Mathematics", "Physics", "Chemistry", "English"].flatMap((s, i) => [
      R(60 + (i % 2) * 345, 420 + Math.floor(i / 2) * 120, 325, 96, "#eff6ff", { radius: 18, name: "Subject card" }),
      E("icon-check-circle", 82 + (i % 2) * 345, 448 + Math.floor(i / 2) * 120, 40, { c1: "#1d4ed8" }),
      T(s, 136 + (i % 2) * 345, 452 + Math.floor(i / 2) * 120, 240, { size: 30, bold: true, color: INK }),
    ]),
    flow(700,
      T("Experienced teachers · weekly tests · progress reports for parents", 60, 0, W - 120, { size: 26, color: INK, lh: 1.4 }), 30,
      T("Evening batches: 4 pm – 7 pm, Monday to Friday", 60, 0, W - 120, { size: 26, bold: true, color: "#1d4ed8" })),
    R(60, H - 170, W - 120, 100, AMB, { radius: 50, name: "Contact bar" }),
    T("Call now: +1 555 0120 300", 60, H - 142, W - 120, { size: 36, bold: true, color: INK, align: "center" }),
  ])]);
  tpl("gym-membership-flyer", "Gym membership flyer", "flyer-a4", "flyer gym fitness membership workout sport training offer", (W, H) => [page("#0f172a", [
    S("triangle", -120, 520, 640, 640, "#f97316", { op: 0.85, name: "Accent shape" }),
    F(W - 460, 260, 400, 520, { shape: "rounded", radius: 30, name: "Athlete photo" }),
    flow(70, T("GET FIT", 60, 0, W - 120, { size: 120, bold: true, color: WHITE, lh: 1 }), 0, T("THIS YEAR", 60, 0, W - 120, { size: 64, bold: true, color: "#f97316", ls: 4 })),
    flow(300, T("Join today and save", 60, 0, 300, { size: 32, color: "#cbd5e1" }), 10, T("40%", 60, 0, 360, { size: 150, bold: true, color: WHITE, lh: 1 }), 0, T("on yearly plans", 60, 0, 300, { size: 32, color: "#cbd5e1" })),
    flow(830, T("Personal trainers · cardio zone · group classes · open 6 am – 11 pm", 60, 0, W - 120, { size: 28, color: WHITE, lh: 1.4 })),
    R(60, H - 160, W - 120, 92, "#f97316", { radius: 14, name: "Button" }),
    T("IRONCORE GYM · +1 555 0150 900", 60, H - 132, W - 120, { size: 32, bold: true, color: WHITE, align: "center" }),
  ])]);
  tpl("lost-pet-flyer", "Lost pet flyer", "flyer-letter", "flyer lost pet dog cat missing reward help find", (W, H) => [page("#fefce8", [
    R(0, 0, W, 200, "#dc2626", { name: "Header" }),
    T("LOST DOG", 0, 40, W, { size: 120, bold: true, color: WHITE, align: "center", lh: 1 }),
    F(W / 2 - 280, 240, 560, 400, { shape: "rounded", radius: 24, name: "Pet photo" }),
    flow(680,
      T("Have you seen Max?", 60, 0, W - 120, { size: 52, bold: true, color: INK, align: "center" }), 14,
      T("Golden retriever · 3 years old · red collar\nLast seen near Maple Park on 2 November", 60, 0, W - 120, { size: 26, color: INK, align: "center", lh: 1.4 })),
    R(W / 2 - 200, 860, 400, 70, AMB, { radius: 35, name: "Reward" }),
    T("REWARD OFFERED", W / 2 - 200, 878, 400, { size: 30, bold: true, color: INK, align: "center" }),
    T("Please call +1 555 0177 012", 60, 960, W - 120, { size: 36, bold: true, color: "#dc2626", align: "center" }),
  ])]);
  tpl("restaurant-menu-flyer", "Restaurant menu flyer", "flyer-a5", "flyer menu restaurant food cafe dishes prices takeaway", (W, H) => {
    const items = [["Grilled chicken bowl", "$12"], ["Spicy beef noodles", "$11"], ["Garden pasta", "$10"], ["Fish tacos (3)", "$9"], ["Chocolate lava cake", "$6"], ["Fresh lemonade", "$4"]];
    return [page("#fffbeb", [
      R(0, 0, W, 170, "#7c2d12", { name: "Header" }),
      T("The Corner Kitchen", 30, 40, W - 60, { size: 46, family: "serif", bold: true, color: WHITE, align: "center" }),
      T("MENU", 30, 104, W - 60, { size: 22, color: GOLD, align: "center", ls: 10 }),
      ...items.flatMap(([n, p], i) => [
        T(n, 50, 220 + i * 74, W - 200, { size: 24, bold: true, color: INK }),
        T(p, W - 140, 220 + i * 74, 90, { size: 24, bold: true, color: "#b45309", align: "right" }),
        R(50, 258 + i * 74, W - 100, 1, "#e7d3b5", { name: "Divider" }),
      ]),
      E("icon-chai", W / 2 - 24, 680, 48, { c1: "#7c2d12" }),
      T("Open daily 11 am – 11 pm · Free delivery over $25", 30, 740, W - 60, { size: 17, color: "#7c2d12", align: "center" }),
    ])];
  });
  tpl("yard-sale-flyer", "Yard sale flyer", "flyer-letter", "flyer yard sale garage sale bargain weekend household items", (W, H) => [page("#ecfccb", [
    E("deco-bunting", 0, 0, W, { c1: "#65a30d", c2: AMB }),
    flow(170, T("YARD", 60, 0, W - 120, { size: 150, bold: true, color: "#3f6212", align: "center", lh: 1 }), 0, T("SALE", 60, 0, W - 120, { size: 150, bold: true, color: COR, align: "center", lh: 1 })),
    ...[["icon-calendar", "Saturday, 14 November"], ["icon-clock", "8 am – 2 pm"], ["icon-location", "52 Birch Road"]].flatMap(([ic, t], i) => [
      E(ic, 140, 540 + i * 80, 50, { c1: "#3f6212" }),
      T(t, 210, 546 + i * 80, W - 300, { size: 38, bold: true, color: INK }),
    ]),
    T("Furniture · toys · books · clothes · kitchenware", 60, 820, W - 120, { size: 28, color: INK, align: "center" }),
    E("badge-sale", W / 2 - 80, 880, 160, { c1: COR, c2: WHITE }),
  ])]);

  /* ================= Brochures (tri-fold, outside + inside) ================= */
  // Outside page: panel 1 = inside flap, panel 2 = back, panel 3 = front cover. Inside page: three content panels.
  const tri = (W, pad = 34) => ({ p3: W / 3, pad, cw: W / 3 - pad * 2 });
  const insidePanels = (W, H, items, color, ink, icons) => {
    const { p3, pad, cw } = tri(W);
    return items.flatMap(([h, b], i) => [
      E(icons[i], i * p3 + pad, 60, 50, { c1: color }),
      T(h, i * p3 + pad, 128, cw, { size: 28, bold: true, color: ink }),
      T(b, i * p3 + pad, 176, cw, { size: 16, color: ink, lh: 1.55 }),
      F(i * p3 + pad, H - 330, cw, 260, { shape: "rounded", radius: 16, name: "Photo" }),
    ]);
  };
  tpl("travel-agency-brochure", "Travel agency brochure", "brochure-trifold-a4", "brochure trifold travel agency tours holiday trips vacation", (W, H) => {
    const { p3, pad, cw } = tri(W);
    return [
      page(WHITE, [
        flow(60, T("Popular trips", pad, 0, cw, { size: 28, bold: true, color: "#0369a1" }), 16,
          T("• Mountain lakes, 5 days\n• Desert safari, 3 days\n• Island beaches, 7 days\n• City lights, 4 days", pad, 0, cw, { size: 17, color: INK, lh: 1.7 })),
        F(pad, 400, cw, 320, { shape: "rounded", radius: 18, name: "Trip photo" }),
        flow(60, T("Book with us", p3 + pad, 0, cw, { size: 28, bold: true, color: "#0369a1" }), 16,
          T("+1 555 0104 880\nbook@skyway.travel\n9 Harbour Road", p3 + pad, 0, cw, { size: 17, color: INK, lh: 1.6 })),
        E("icon-globe", p3 + p3 / 2 - 40, 320, 80, { c1: "#0369a1" }),
        R(2 * p3, 0, p3, H, "#0284c7", { name: "Cover panel" }),
        E("icon-sun", 2 * p3 + p3 / 2 - 50, 90, 100, { c1: GOLD }),
        flow(250, T("SkyWay Travel", 2 * p3 + pad, 0, cw, { size: 46, bold: true, color: WHITE, align: "center", lh: 1.1 }), 16,
          T("See the world, your way", 2 * p3 + pad, 0, cw, { size: 22, family: "serif", italic: true, color: "#e0f2fe", align: "center" })),
        F(2 * p3 + pad, 460, cw, 260, { shape: "rounded", radius: 18, name: "Cover photo" }),
      ]),
      page("#f0f9ff", insidePanels(W, H, [["Tour packages", "Flights, hotels and guides in one simple price. Pick a trip and we handle the rest."], ["Family deals", "Kids under 10 travel at half price on all summer tours this year."], ["Why travel with us", "Fifteen years of happy travellers, 24/7 support and flexible dates."]], "#0369a1", INK, ["icon-flag", "icon-users", "icon-thumbs-up"])),
    ];
  });
  tpl("dental-clinic-brochure", "Dental clinic brochure", "brochure-trifold-a4", "brochure trifold dental clinic dentist teeth health care", (W, H) => {
    const { p3, pad, cw } = tri(W);
    return [
      page(WHITE, [
        flow(60, T("Our services", pad, 0, cw, { size: 28, bold: true, color: TEA }), 16,
          T("• Check-ups and cleaning\n• Fillings and root canals\n• Braces and aligners\n• Teeth whitening\n• Kids dentistry", pad, 0, cw, { size: 17, color: INK, lh: 1.7 })),
        flow(60, T("Opening hours", p3 + pad, 0, cw, { size: 28, bold: true, color: TEA }), 16,
          T("Mon–Fri: 9 am – 7 pm\nSaturday: 10 am – 2 pm\nEmergency: +1 555 0109 911", p3 + pad, 0, cw, { size: 17, color: INK, lh: 1.6 })),
        E("icon-clock", p3 + p3 / 2 - 35, 340, 70, { c1: TEA }),
        R(2 * p3, 0, p3, H, "#0f766e", { name: "Cover panel" }),
        C(2 * p3 + p3 / 2 - 80, 110, 160, 160, "#ccfbf1", { name: "Circle" }),
        E("face-happy", 2 * p3 + p3 / 2 - 55, 135, 110, {}),
        flow(320, T("Bright Smile Dental", 2 * p3 + pad, 0, cw, { size: 42, bold: true, color: WHITE, align: "center", lh: 1.1 }), 16,
          T("Gentle care for the whole family", 2 * p3 + pad, 0, cw, { size: 20, color: "#ccfbf1", align: "center" })),
      ]),
      page("#f0fdfa", insidePanels(W, H, [["Gentle care", "Modern tools and a calm clinic make every visit easy, even for nervous patients."], ["For kids", "Fun first visits, sealants and fluoride to keep young smiles healthy."], ["Book a visit", "Call or walk in. New patients get a free check-up and cleaning."]], TEA, INK, ["icon-heart", "face-happy", "icon-calendar"])),
    ];
  });
  tpl("real-estate-brochure", "Real estate brochure", "brochure-trifold-letter", "brochure trifold real estate property homes apartments sale", (W, H) => {
    const { p3, pad, cw } = tri(W);
    return [
      page(WHITE, [
        F(pad, 50, cw, 300, { shape: "rounded", radius: 14, name: "Home photo" }),
        flow(380, T("Featured homes", pad, 0, cw, { size: 26, bold: true, color: "#065f46" }), 12,
          T("3 bed family house · $420k\n2 bed city flat · $310k\nGarden villa · $690k", pad, 0, cw, { size: 16, color: INK, lh: 1.7 })),
        flow(60, T("Talk to an agent", p3 + pad, 0, cw, { size: 26, bold: true, color: "#065f46" }), 14,
          T("+1 555 0175 640\nhello@keyhomes.com\n31 Park Lane", p3 + pad, 0, cw, { size: 16, color: INK, lh: 1.6 })),
        E("icon-key", p3 + p3 / 2 - 35, 320, 70, { c1: "#065f46" }),
        R(2 * p3, 0, p3, H, "#064e3b", { name: "Cover panel" }),
        E("icon-home", 2 * p3 + p3 / 2 - 50, 90, 100, { c1: GOLD }),
        flow(240, T("Key Homes Realty", 2 * p3 + pad, 0, cw, { size: 40, family: "serif", bold: true, color: WHITE, align: "center", lh: 1.1 }), 14,
          T("Your next home starts here", 2 * p3 + pad, 0, cw, { size: 19, color: "#a7f3d0", align: "center" })),
        F(2 * p3 + pad, 440, cw, 300, { shape: "rounded", radius: 14, name: "Cover photo" }),
      ]),
      page("#f0fdf4", insidePanels(W, H, [["Buy", "We match you with homes that fit your budget and your family, and guide every step."], ["Sell", "Free valuation, great photos and fast sales at the right price."], ["Rent", "Verified listings and clear contracts for tenants and landlords."]], "#065f46", INK, ["icon-home", "icon-money", "icon-key"])),
    ];
  });
  tpl("restaurant-brochure", "Restaurant brochure", "brochure-trifold-a4", "brochure trifold restaurant food menu dining cafe", (W, H) => {
    const { p3, pad, cw } = tri(W);
    return [
      page("#1c1917", [
        flow(60, T("Chef's picks", pad, 0, cw, { size: 28, bold: true, color: GOLD }), 16,
          T("Slow-cooked lamb\nWood-fired pizza\nLemon herb fish\nSaffron rice pudding", pad, 0, cw, { size: 18, color: "#e7e5e4", lh: 1.7 })),
        F(pad, 420, cw, 300, { shape: "rounded", radius: 18, name: "Dish photo" }),
        flow(60, T("Reservations", p3 + pad, 0, cw, { size: 28, bold: true, color: GOLD }), 16,
          T("+1 555 0130 777\n8 River Walk\nOpen daily 12 pm – 11 pm", p3 + pad, 0, cw, { size: 18, color: "#e7e5e4", lh: 1.6 })),
        R(2 * p3, 0, p3, H, "#7c2d12", { name: "Cover panel" }),
        E("icon-chai", 2 * p3 + p3 / 2 - 45, 100, 90, { c1: GOLD }),
        flow(240, T("Olive & Ember", 2 * p3 + pad, 0, cw, { size: 48, family: "serif", bold: true, color: WHITE, align: "center", lh: 1.1 }), 14,
          E("line-diamonds", 2 * p3 + p3 / 2 - 90, 0, 180, { c1: GOLD }), 14,
          T("Fire-grilled food since 2010", 2 * p3 + pad, 0, cw, { size: 20, family: "serif", italic: true, color: "#fed7aa", align: "center" })),
      ]),
      page("#fffbeb", insidePanels(W, H, [["Starters", "Soup of the day · garlic bread · grilled halloumi · crispy calamari"], ["Mains", "Ember steak · roast chicken · vegetable tagine · seafood pasta"], ["Desserts", "Honey cake · chocolate tart · fresh fruit · ice cream"]], "#b45309", INK, ["icon-leaf", "icon-star", "icon-heart"])),
    ];
  });
  tpl("school-admissions-brochure", "School admissions brochure", "brochure-trifold-letter", "brochure trifold school admissions education students college", (W, H) => {
    const { p3, pad, cw } = tri(W);
    return [
      page(WHITE, [
        flow(60, T("Programmes", pad, 0, cw, { size: 26, bold: true, color: "#7c3aed" }), 14,
          T("• Early years\n• Primary school\n• Middle school\n• High school with science and arts streams", pad, 0, cw, { size: 16, color: INK, lh: 1.7 })),
        F(pad, 400, cw, 300, { shape: "rounded", radius: 16, name: "Campus photo" }),
        flow(60, T("Apply now", p3 + pad, 0, cw, { size: 26, bold: true, color: "#7c3aed" }), 14,
          T("Open day: 5 December\nadmissions@brightfuture.edu\n+1 555 0190 222", p3 + pad, 0, cw, { size: 16, color: INK, lh: 1.6 })),
        E("icon-document", p3 + p3 / 2 - 35, 320, 70, { c1: "#7c3aed" }),
        R(2 * p3, 0, p3, H, "#6d28d9", { name: "Cover panel" }),
        E("deco-stars", 2 * p3 + p3 / 2 - 70, 80, 140, { c1: GOLD, c2: WHITE }),
        flow(260, T("Bright Future Academy", 2 * p3 + pad, 0, cw, { size: 40, bold: true, color: WHITE, align: "center", lh: 1.1 }), 14,
          T("Admissions open for 2027", 2 * p3 + pad, 0, cw, { size: 20, color: GOLD, align: "center" })),
      ]),
      page("#faf5ff", insidePanels(W, H, [["Learning", "Small classes and caring teachers help every student grow with confidence."], ["Activities", "Sports, music, robotics and debate clubs after school every week."], ["Scholarships", "Merit and need-based scholarships for up to half of the yearly fee."]], "#7c3aed", INK, ["icon-idea", "icon-flag", "badge-rosette"])),
    ];
  });
  tpl("charity-brochure", "Charity brochure", "brochure-trifold-a4", "brochure trifold charity donation nonprofit volunteer help community", (W, H) => {
    const { p3, pad, cw } = tri(W);
    return [
      page(WHITE, [
        flow(60, T("Where your gift goes", pad, 0, cw, { size: 28, bold: true, color: ROS }), 16,
          T("$10 feeds a child for a week\n$25 buys school books\n$50 pays for a health check\n$100 brings clean water", pad, 0, cw, { size: 17, color: INK, lh: 1.7 })),
        flow(60, T("Get involved", p3 + pad, 0, cw, { size: 28, bold: true, color: ROS }), 16,
          T("Donate online at helpinghands.org\nVolunteer: +1 555 0115 404", p3 + pad, 0, cw, { size: 17, color: INK, lh: 1.6 })),
        E("icon-users", p3 + p3 / 2 - 40, 320, 80, { c1: ROS }),
        R(2 * p3, 0, p3, H, ROS, { name: "Cover panel" }),
        E("icon-heart", 2 * p3 + p3 / 2 - 55, 100, 110, { c1: WHITE }),
        flow(270, T("Helping Hands", 2 * p3 + pad, 0, cw, { size: 48, bold: true, color: WHITE, align: "center", lh: 1.1 }), 16,
          T("Small gifts, big change", 2 * p3 + pad, 0, cw, { size: 22, family: "serif", italic: true, color: "#ffe4e6", align: "center" })),
        F(2 * p3 + pad, 470, cw, 250, { shape: "rounded", radius: 18, name: "Cover photo" }),
      ]),
      page("#fff1f2", insidePanels(W, H, [["Our mission", "We bring food, schooling and clean water to families who need them most."], ["Our impact", "Last year 12,000 children got meals and 40 villages got clean water."], ["Join us", "Give once, give monthly or give your time as a volunteer."]], ROS, INK, ["icon-flag", "icon-thumbs-up", "icon-gift"])),
    ];
  });
  tpl("fitness-club-brochure", "Fitness club brochure", "brochure-trifold-letter", "brochure trifold fitness club gym sport membership training", (W, H) => {
    const { p3, pad, cw } = tri(W);
    return [
      page("#0f172a", [
        flow(60, T("Membership", pad, 0, cw, { size: 26, bold: true, color: "#f97316" }), 14,
          T("Monthly · $39\nQuarterly · $99\nYearly · $349\nStudents save 20%", pad, 0, cw, { size: 18, color: WHITE, lh: 1.7 })),
        F(pad, 420, cw, 280, { shape: "rounded", radius: 16, name: "Gym photo" }),
        flow(60, T("Visit us", p3 + pad, 0, cw, { size: 26, bold: true, color: "#f97316" }), 14,
          T("IronCore Fitness\n77 Stadium Road\n+1 555 0150 900\nOpen 6 am – 11 pm", p3 + pad, 0, cw, { size: 17, color: WHITE, lh: 1.6 })),
        R(2 * p3, 0, p3, H, "#f97316", { name: "Cover panel" }),
        E("icon-flag", 2 * p3 + p3 / 2 - 45, 90, 90, { c1: WHITE }),
        flow(250, T("IRONCORE FITNESS", 2 * p3 + pad, 0, cw, { size: 42, bold: true, color: WHITE, align: "center", lh: 1.05 }), 14,
          T("Stronger every day", 2 * p3 + pad, 0, cw, { size: 22, color: "#0f172a", align: "center", bold: true })),
      ]),
      page("#f8fafc", insidePanels(W, H, [["Training", "Personal trainers build a plan around your goals and check in every week."], ["Classes", "Spin, yoga, boxing and HIIT classes run all day, every day."], ["Recovery", "Sauna, stretching zone and nutrition advice included for members."]], "#f97316", INK, ["icon-thumbs-up", "icon-calendar", "icon-heart"])),
    ];
  });

  /* ================= Posters ================= */
  tpl("concert-poster", "Rock concert poster", "poster-18x24", "poster concert music band live gig rock event", (W, H) => [page("#111827", [
    C(W / 2 - 700, 300, 1400, 1400, "#be123c", { op: 0.85, name: "Big circle" }),
    C(W / 2 - 500, 500, 1000, 1000, "#111827", { name: "Inner circle" }),
    F(W / 2 - 420, 580, 840, 840, { shape: "circle", name: "Band photo" }),
    flow(130, T("THE NIGHT OWLS", 80, 0, W - 160, { size: 170, bold: true, color: WHITE, align: "center", lh: 1 }), 10,
      T("LIVE IN CONCERT", 80, 0, W - 160, { size: 80, color: "#fda4af", align: "center", ls: 16 })),
    flow(1790, T("Saturday, 30 January · Doors 8 pm", 80, 0, W - 160, { size: 80, bold: true, color: WHITE, align: "center" }), 24,
      T("Riverside Arena · Tickets from $25", 80, 0, W - 160, { size: 64, color: "#fda4af", align: "center" })),
  ])]);
  tpl("science-fair-poster", "Science fair poster", "poster-a3", "poster science fair school exhibition students experiments", (W, H) => [page("#ecfeff", [
    R(0, 0, W, 420, "#0e7490", { name: "Header" }),
    E("icon-idea", W - 260, 90, 200, { c1: GOLD }),
    flow(110, T("SCIENCE", 80, 0, 700, { size: 130, bold: true, color: WHITE, lh: 1 }), 0, T("FAIR 2026", 80, 0, 700, { size: 100, bold: true, color: GOLD, lh: 1 })),
    ...[["Robots", "icon-settings"], ["Space", "icon-moon"], ["Nature", "icon-leaf"]].flatMap(([t, ic], i) => [
      C(110 + i * 320, 520, 260, 260, WHITE, { stroke: "#0e7490", sw: 6, name: "Topic circle" }),
      E(ic, 170 + i * 320, 570, 140, { c1: "#0e7490" }),
      T(t, 90 + i * 320, 810, 300, { size: 46, bold: true, color: INK, align: "center" }),
    ]),
    flow(960, T("Over 60 student projects, live experiments and prizes for the best ideas", 90, 0, W - 180, { size: 44, color: INK, align: "center", lh: 1.35 }), 50,
      T("Friday, 4 December · 10 am – 3 pm", 90, 0, W - 180, { size: 52, bold: true, color: "#0e7490", align: "center" }), 14,
      T("Main Hall, Westfield School · Free entry", 90, 0, W - 180, { size: 40, color: MUTED, align: "center" })),
  ])]);
  tpl("movie-night-poster", "Movie night poster", "poster-a3", "poster movie night cinema film outdoor screening popcorn", (W, H) => [page(["#1e1b4b", "#0f172a", 180], [
    E("deco-stars", 80, 80, 300, { c1: GOLD, c2: WHITE }),
    E("icon-moon", W - 300, 90, 200, { c1: GOLD }),
    flow(380, T("Outdoor", 60, 0, W - 120, { size: 90, family: "serif", italic: true, color: GOLD, align: "center" }), 0,
      T("MOVIE NIGHT", 60, 0, W - 120, { size: 140, bold: true, color: WHITE, align: "center", lh: 1 })),
    R(160, 720, W - 320, 440, "#334155", { radius: 20, name: "Screen" }),
    R(180, 740, W - 360, 400, "#e2e8f0", { radius: 12, name: "Screen glow" }),
    T("Feature film + cartoons for kids", 180, 920, W - 360, { size: 44, bold: true, color: INK, align: "center" }),
    flow(1250, T("Friday, 16 October · 7:30 pm", 60, 0, W - 120, { size: 58, bold: true, color: WHITE, align: "center" }), 12,
      T("Bring a blanket · Free popcorn · Central Park lawn", 60, 0, W - 120, { size: 40, color: "#c7d2fe", align: "center" })),
  ])]);
  tpl("hiring-poster", "We are hiring poster", "poster-18x24", "poster hiring recruitment job vacancy careers join team", (W, H) => [page(WHITE, [
    R(0, 0, W, H * 0.45, IND, { name: "Top block" }),
    E("deco-sparkles", W - 380, 120, 260, { c1: GOLD, c2: WHITE }),
    flow(260, T("WE ARE", 120, 0, W - 240, { size: 140, bold: true, color: "#c7d2fe", lh: 1 }), 0, T("HIRING", 120, 0, W - 240, { size: 300, bold: true, color: WHITE, lh: 1 })),
    T("Join our growing team", 120, 900, W - 240, { size: 80, family: "serif", italic: true, color: GOLD }),
    ...["Sales associate", "Graphic designer", "Delivery rider", "Customer support"].flatMap((role, i) => [
      E("icon-check-circle", 120, 1180 + i * 150, 90, { c1: IND }),
      T(role, 250, 1190 + i * 150, W - 400, { size: 76, bold: true, color: INK }),
    ]),
    R(120, H - 340, W - 240, 200, COR, { radius: 100, name: "Apply bar" }),
    T("Apply: jobs@brightmart.com", 120, H - 284, W - 240, { size: 80, bold: true, color: WHITE, align: "center" }),
  ])]);
  tpl("health-awareness-poster", "Health awareness poster", "poster-a2", "poster health awareness hand washing hygiene clinic public", (W, H) => [page("#f0fdf4", [
    R(0, 0, W, 360, "#15803d", { name: "Header" }),
    T("STAY HEALTHY", 80, 110, W - 160, { size: 150, bold: true, color: WHITE, align: "center" }),
    T("Five simple habits for every day", 80, 450, W - 160, { size: 80, family: "serif", italic: true, color: "#166534", align: "center" }),
    ...[["Wash hands often", "icon-check-circle"], ["Drink clean water", "icon-umbrella"], ["Eat fruit and greens", "icon-leaf"], ["Sleep 7–8 hours", "icon-moon"], ["Walk 30 minutes", "icon-sun"]].flatMap(([t, ic], i) => [
      R(140, 640 + i * 250, W - 280, 200, WHITE, { radius: 40, stroke: "#86efac", sw: 4, name: "Tip card" }),
      E(ic, 200, 680 + i * 250, 120, { c1: "#15803d" }),
      T(t, 380, 700 + i * 250, W - 600, { size: 76, bold: true, color: INK }),
    ]),
    T("Community Health Centre · Free check-ups every Saturday", 80, H - 220, W - 160, { size: 56, color: "#166534", align: "center" }),
  ])]);
  tpl("art-exhibition-poster", "Art exhibition poster", "poster-a2", "poster art exhibition gallery painting show museum", (W, H) => [page("#fafaf9", [
    S("triangle", 100, 300, 700, 700, "#f59e0b", { op: 0.9, name: "Shape" }),
    C(700, 500, 760, 760, "#0ea5e9", { op: 0.8, name: "Shape" }),
    R(300, 1000, 900, 420, "#e11d48", { op: 0.85, rot: -8, name: "Shape" }),
    flow(1560, T("COLOUR", 100, 0, W - 200, { size: 220, bold: true, color: INK, lh: 1 }), 0, T("& FORM", 100, 0, W - 200, { size: 220, bold: true, color: INK, lh: 1 })),
    T("Modern art exhibition · 3 – 24 May", 100, 2060, W - 200, { size: 66, color: INK }),
    T("City Gallery · free entry", 100, 140, W - 200, { size: 60, family: "serif", italic: true, color: MUTED }),
  ])]);

  /* ================= Labels ================= */
  tpl("candle-product-label", "Candle label", "label-product-2x1", "label product candle soy wax scented handmade", (W, H) => [page("#faf5ff", [
    R(4, 4, W - 8, H - 8, "none", { stroke: "#7e22ce", sw: 1, radius: 6, name: "Border" }),
    E("icon-sun", 10, 26, 32, { c1: "#a855f7" }),
    T("Lavender Glow", 48, 16, W - 54, { size: 19, family: "serif", bold: true, color: "#6b21a8" }),
    T("Soy wax candle · 200 g", 48, 46, W - 54, { size: 10, color: "#581c87" }),
    T("Burn time 40 hours", 48, 62, W - 54, { size: 9, color: MUTED }),
  ])]);
  tpl("soap-product-label", "Handmade soap label", "label-product-2x1", "label product soap handmade natural organic skin care", (W, H) => [page("#ecfdf5", [
    R(0, 0, 54, H, "#047857", { name: "Side band" }),
    E("icon-leaf", 10, 26, 34, { c1: WHITE }),
    T("Mint & Aloe", 62, 14, W - 68, { size: 20, bold: true, color: "#065f46" }),
    T("Handmade soap", 62, 42, W - 68, { size: 11, family: "serif", italic: true, color: "#047857" }),
    T("100 g · natural oils", 62, 62, W - 68, { size: 9.5, color: INK }),
  ])]);
  tpl("coffee-bag-label", "Coffee bag label", "label-product-2x1", "label product coffee beans roast bag cafe", (W, H) => [page("#292524", [
    E("icon-chai", 8, 22, 40, { c1: GOLD }),
    T("MORNING ROAST", 54, 14, W - 60, { size: 14, bold: true, color: WHITE }),
    T("Medium roast · whole beans", 54, 40, W - 60, { size: 9.5, color: "#d6d3d1" }),
    T("250 g", 54, 60, W - 60, { size: 12, bold: true, color: GOLD }),
  ])]);
  tpl("strawberry-jam-round-label", "Strawberry jam round label", "label-round-2in", "label round jar jam strawberry homemade preserve", (W, H) => [page(WHITE, [
    C(0, 0, W, H, "#ffe4e6", { name: "Circle" }),
    C(7, 7, W - 14, H - 14, "none", { stroke: ROS, sw: 1.5, name: "Ring" }),
    E("deco-hearts", W / 2 - 22, 20, 44, { c1: ROS, c2: "#fecdd3" }),
    T("Strawberry", 16, 70, W - 32, { size: 22, family: "serif", bold: true, italic: true, color: "#be123c", align: "center" }),
    T("JAM", 16, 98, W - 32, { size: 26, bold: true, color: "#881337", align: "center", ls: 4 }),
    T("Made with love · 300 g", 16, 140, W - 32, { size: 10, color: "#9f1239", align: "center" }),
  ])]);
  tpl("fragile-shipping-label", "Fragile shipping label", "label-shipping-4x6", "label shipping fragile parcel courier handle with care", (W, H) => [page(WHITE, [
    R(0, 0, W, 120, "#dc2626", { name: "Header" }),
    E("icon-warning", 20, 24, 72, { c1: WHITE }),
    T("FRAGILE", 106, 26, W - 120, { size: 52, bold: true, color: WHITE }),
    T("Handle with care · this side up", 20, 140, W - 40, { size: 18, bold: true, color: "#dc2626", align: "center" }),
    E("arrow-up", W / 2 - 50, 176, 40, { c1: INK }), E("arrow-up", W / 2 + 10, 176, 40, { c1: INK }),
    R(20, 240, W - 40, 1.5, "#94a3b8", { name: "Divider" }),
    T("DELIVER TO", 20, 256, W - 40, { size: 13, bold: true, color: MUTED, ls: 2 }),
    T("Hannah Moore\n15 Lake View Drive\nSpringfield 45021\n+1 555 0123 789", 20, 280, W - 40, { size: 18, color: INK, lh: 1.45 }),
    R(20, 430, W - 40, 1.5, "#94a3b8", { name: "Divider" }),
    T("FROM", 20, 446, W - 40, { size: 13, bold: true, color: MUTED, ls: 2 }),
    T("Glass & Clay Studio · 4 Kiln Road, Brookfield", 20, 470, W - 40, { size: 14, color: INK, lh: 1.4 }),
    T("ORDER 20931", 20, 528, W - 40, { size: 14, family: "mono", color: INK, align: "center", ls: 3 }),
  ])]);
}
