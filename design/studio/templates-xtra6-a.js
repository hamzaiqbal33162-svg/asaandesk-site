// AsaanDesk Studio: 30 more own layouts: 10 tri-fold brochures, 10 labels, 10 mug wraps (each its own composition).
// Pure module (no imports). templates.js calls the default export with its helpers. Own text, colours and shapes only.
export default function addXtra6A(k) {
  const { tpl, T, S, R, C, F, page } = k;
  const { INK, MUTED, WHITE } = k.K;

  /* ================= Tri-fold brochures (2 pages: outside = flap | back | cover, inside = 3 panels) ================= */
  const BT = "brochure trifold pamphlet leaflet ";
  const head = (s, x, y, w, color, size = 22) => T(s, x, y, w, { size, bold: true, color });
  const body = (s, x, y, w, color, size = 12.5) => T(s, x, y, w, { size, color, lh: 1.45 });
  function bro(id, title, preset, tags, bg, outside, inside) {
    tpl(id, title, preset, BT + tags, (W, H) => {
      const P = W / 3, m = 26, pw = P - 2 * m;
      const g = { W, H, P, m, pw, x: (i) => i * P + m };
      return [page(bg, outside(g)), page(bg, inside(g))];
    });
  }
  // Back panel (middle of the outside page): contact block.
  const contact = (g, lines, c, y = g.H - 230) => [head("Find us", g.x(1), y, g.pw, c.h, 20), body(lines, g.x(1), y + 34, g.pw, c.b)];

  bro("coffee-roastery-brochure-x6", "Coffee roastery brochure", "brochure-trifold-a4", "coffee roastery cafe beans tasting", "#fbf6f0",
    (g) => [
      R(2 * g.P, 0, g.P, g.H, "#3b2416", { name: "Cover" }),
      C(2 * g.P + g.P / 2 - 110, 150, 220, 220, "#c08552", { name: "Bean circle" }),
      C(2 * g.P + g.P / 2 - 80, 180, 160, 160, "#3b2416", { name: "Bean inner" }),
      T("SMALL BATCH", 2 * g.P + g.m, 430, g.pw, { size: 15, bold: true, color: "#e8c39e", align: "center", ls: 4 }),
      T("Ember Coffee Roasters", 2 * g.P + g.m, 462, g.pw, { size: 34, family: "serif", bold: true, color: WHITE, align: "center", lh: 1.1 }),
      head("Our beans", g.x(0), 70, g.pw, "#3b2416", 24),
      body("We buy straight from three family farms and roast twice a week, so every bag reaches you within days.", g.x(0), 110, g.pw, "#5c4636"),
      ...contact(g, "14 Mill Lane, Bristol\nOpen daily 7 am to 5 pm\nhello@embercoffee.example", { h: "#3b2416", b: "#5c4636" }),
    ],
    (g) => [
      ...["Light roast", "Medium roast", "Dark roast"].flatMap((t, i) => [
        R(g.x(i), 70, g.pw, 8, ["#c08552", "#8b5a35", "#3b2416"][i], { name: "Roast bar" }),
        head(t, g.x(i), 100, g.pw, "#3b2416", 24),
        body(["Bright and fruity. Notes of berry and citrus. Best as pour-over.", "Round and sweet. Chocolate and caramel. Great for every brew.", "Bold and smoky. Dark cocoa finish. Made for espresso and milk."][i], g.x(i), 145, g.pw, "#5c4636", 13),
        F(g.x(i), 300, g.pw, g.pw, { shape: "circle", name: "Bag photo" }),
        T(["$14", "$15", "$16"][i] + " / 250 g", g.x(i), 330 + g.pw, g.pw, { size: 20, bold: true, color: "#8b5a35", align: "center" }),
      ]),
    ]);

  bro("solar-installer-brochure-x6", "Solar installer brochure", "brochure-trifold-letter", "solar energy panels home installer green", "#ffffff",
    (g) => [
      R(2 * g.P, 0, g.P, g.H, "#0b3b5c", { name: "Cover" }),
      S("triangle", 2 * g.P, g.H * 0.45, g.P, g.H * 0.55, "#facc15", { name: "Sun slope" }),
      C(2 * g.P + g.P - 130, 60, 100, 100, "#facc15", { name: "Sun" }),
      T("Power your home with the sun", 2 * g.P + g.m, 190, g.pw, { size: 32, bold: true, color: WHITE, lh: 1.15 }),
      T("BRIGHTROOF SOLAR", 2 * g.P + g.m, g.H - 90, g.pw, { size: 16, bold: true, color: "#0b3b5c", ls: 3 }),
      head("Why solar?", g.x(0), 70, g.pw, "#0b3b5c"),
      body("Lower bills from month one, a quieter grid and panels that last over 25 years.", g.x(0), 108, g.pw, MUTED),
      ...contact(g, "Free roof survey\n555 0101\nbrightroof.example", { h: "#0b3b5c", b: MUTED }),
    ],
    (g) => [
      ...[["1", "Survey", "We check your roof, shade and bills, and send a clear quote."], ["2", "Install", "Our own team fits the panels in one or two days."], ["3", "Save", "Watch your savings live in the app, every day."]].flatMap(([n, t, d], i) => [
        C(g.x(i), 70, 64, 64, "#facc15", { name: "Step circle" }),
        T(n, g.x(i), 86, 64, { size: 28, bold: true, color: "#0b3b5c", align: "center" }),
        head(t, g.x(i), 160, g.pw, "#0b3b5c", 26),
        body(d, g.x(i), 205, g.pw, MUTED, 13.5),
      ]),
      R(g.m, g.H - 200, g.W - 2 * g.m, 150, "#fef9c3", { radius: 16, name: "Savings band" }),
      T("Average family saving: $1,100 a year", g.m + 30, g.H - 145, g.W - 2 * g.m - 60, { size: 28, bold: true, color: "#0b3b5c", align: "center" }),
    ]);

  bro("art-school-brochure-x6", "Art school brochure", "brochure-trifold-a4", "art school classes painting drawing courses", "#ffffff",
    (g) => [
      ...["#ef4444", "#f59e0b", "#3b82f6", "#10b981"].map((c, i) => R(2 * g.P, i * 60, g.P, 60, c, { name: "Stripe" })),
      T("2026", 2 * g.P + g.m, 300, g.pw, { size: 96, bold: true, color: INK, lh: 1 }),
      T("Courses at the Open Studio Art School", 2 * g.P + g.m, 420, g.pw, { size: 26, color: INK, lh: 1.2 }),
      head("Learn by making", g.x(0), 70, g.pw, "#3b82f6"),
      body("Small classes, real materials and teachers who are working artists.", g.x(0), 108, g.pw, MUTED),
      ...contact(g, "8 Canal Street\nopenstudio.example\n555 0177", { h: "#3b82f6", b: MUTED }),
    ],
    (g) => [
      ...[["Drawing", "Mondays", "#ef4444"], ["Painting", "Wednesdays", "#f59e0b"], ["Ceramics", "Saturdays", "#10b981"]].flatMap(([t, d, c], i) => [
        F(g.x(i), 60, g.pw, 220, { shape: "rounded", radius: 14, name: "Class photo" }),
        R(g.x(i), 300, 60, 6, c, { name: "Accent" }),
        head(t, g.x(i), 320, g.pw, INK, 28),
        T(d + " · 6 pm", g.x(i), 362, g.pw, { size: 14, bold: true, color: c }),
        body("Eight weekly sessions for beginners and improvers. All materials included.", g.x(i), 400, g.pw, MUTED, 13),
      ]),
    ]);

  bro("physio-clinic-brochure-x6", "Physiotherapy clinic brochure", "brochure-trifold-letter", "physiotherapy clinic health recovery back pain", "#f0fdfa",
    (g) => [
      F(2 * g.P, 0, g.P, g.H * 0.5, { name: "Cover photo" }),
      R(2 * g.P, g.H * 0.5, g.P, g.H * 0.5, "#0f766e", { name: "Cover block" }),
      T("Move without pain", 2 * g.P + g.m, g.H * 0.5 + 50, g.pw, { size: 34, bold: true, color: WHITE, lh: 1.1 }),
      T("Riverside Physiotherapy", 2 * g.P + g.m, g.H * 0.5 + 180, g.pw, { size: 16, color: "#ccfbf1" }),
      head("New patients", g.x(0), 70, g.pw, "#0f766e"),
      body("Book a 45-minute first visit. We listen, test and make a plan with you.", g.x(0), 108, g.pw, "#134e4a"),
      ...contact(g, "Riverside Health Centre\nMon to Sat · 8 am to 7 pm\n555 0145", { h: "#0f766e", b: "#134e4a" }),
    ],
    (g) => [
      head("We help with", g.x(0), 60, g.pw, "#0f766e", 26),
      ...["Back and neck pain", "Sports injuries", "After surgery", "Posture at work", "Headaches"].flatMap((t, i) => [C(g.x(0), 116 + i * 52, 22, 22, "#14b8a6", { name: "Dot" }), T(t, g.x(0) + 36, 116 + i * 52, g.pw - 36, { size: 16, color: "#134e4a" })]),
      F(g.x(1), 60, g.pw, g.pw, { shape: "circle", name: "Therapist photo" }),
      T("Our team of five physiotherapists has over 60 years of experience together.", g.x(1), 90 + g.pw, g.pw, { size: 15, italic: true, color: "#134e4a", align: "center", lh: 1.4 }),
      R(g.x(2), 60, g.pw, 300, "#ccfbf1", { radius: 16, name: "Price card" }),
      head("Prices", g.x(2) + 20, 84, g.pw - 40, "#0f766e", 24),
      body("First visit  $70\nFollow-up  $55\nSports massage  $60\nHome visit  $90", g.x(2) + 20, 130, g.pw - 40, "#134e4a", 15),
    ]);

  bro("wedding-venue-brochure-x6", "Wedding venue brochure", "brochure-trifold-a4", "wedding venue events elegant garden hall", "#fffdf8",
    (g) => [
      R(2 * g.P + 20, 20, g.P - 40, g.H - 40, "none", { stroke: "#b08d57", sw: 2, name: "Frame" }),
      R(2 * g.P + 30, 30, g.P - 60, g.H - 60, "none", { stroke: "#b08d57", sw: 0.8, name: "Inner frame" }),
      T("Willow Hall", 2 * g.P + g.m, 250, g.pw, { size: 44, family: "serif", italic: true, color: "#5b4636", align: "center" }),
      R(2 * g.P + g.P / 2 - 40, 330, 80, 1.5, "#b08d57", { name: "Rule" }),
      T("WEDDINGS · CELEBRATIONS", 2 * g.P + g.m, 350, g.pw, { size: 12, color: "#b08d57", align: "center", ls: 3 }),
      head("Your day, your way", g.x(0), 70, g.pw, "#5b4636"),
      body("A restored barn, a walled garden and a team that plans every detail with you.", g.x(0), 108, g.pw, "#7a6656"),
      ...contact(g, "Willow Lane, Oxford\nVisits by appointment\nevents@willowhall.example", { h: "#5b4636", b: "#7a6656" }),
    ],
    (g) => [
      ...[["The Barn", "Up to 150 guests, oak beams and a dance floor."], ["The Garden", "Ceremonies under the willow tree, May to September."], ["The Kitchen", "Seasonal menus from our own chef, tastings included."]].flatMap(([t, d], i) => [
        F(g.x(i), 60, g.pw, 260, { shape: "rounded", radius: 140, name: "Arch photo" }),
        T(t, g.x(i), 350, g.pw, { size: 28, family: "serif", italic: true, color: "#5b4636", align: "center" }),
        T(d, g.x(i), 400, g.pw, { size: 13, color: "#7a6656", align: "center", lh: 1.45 }),
      ]),
    ]);

  bro("city-tour-brochure-x6", "City walking tour brochure", "brochure-trifold-letter", "city tour walking travel guide sightseeing", "#ffffff",
    (g) => [
      R(2 * g.P, 0, g.P / 2, g.H, "#e11d48", { name: "Half" }), R(2 * g.P + g.P / 2, 0, g.P / 2, g.H, "#1e293b", { name: "Half" }),
      C(2 * g.P + g.P / 2 - 100, 120, 200, 200, WHITE, { name: "Photo ring" }),
      F(2 * g.P + g.P / 2 - 90, 130, 180, 180, { shape: "circle", name: "City photo" }),
      T("Old Town Walks", 2 * g.P + g.m, 380, g.pw, { size: 36, bold: true, color: WHITE, align: "center", lh: 1.1 }),
      T("2-hour guided tours", 2 * g.P + g.m, 480, g.pw, { size: 16, color: WHITE, align: "center" }),
      head("Meet your guide", g.x(0), 70, g.pw, "#e11d48"),
      body("Local historians who know the stories behind every door and bridge.", g.x(0), 108, g.pw, MUTED),
      ...contact(g, "Start: Clock Tower Square\nDaily at 10 am and 3 pm\noldtownwalks.example", { h: "#e11d48", b: MUTED }),
    ],
    (g) => [
      R(g.m, 170, g.W - 2 * g.m, 4, "#e11d48", { name: "Route line" }),
      ...[["Clock Tower", "Where the city began in 1210."], ["River Market", "Taste cheese and fresh bread."], ["Castle Gate", "Views over the whole valley."]].flatMap(([t, d], i) => [
        C(g.x(i), 150, 44, 44, "#e11d48", { name: "Stop" }),
        T(String(i + 1), g.x(i), 160, 44, { size: 20, bold: true, color: WHITE, align: "center" }),
        head(t, g.x(i), 230, g.pw, "#1e293b", 24),
        body(d, g.x(i), 270, g.pw, MUTED, 14),
        F(g.x(i), 340, g.pw, 220, { shape: "rounded", radius: 12, name: "Stop photo" }),
      ]),
    ]);

  bro("coworking-brochure-x6", "Coworking space brochure", "brochure-trifold-a4", "coworking office desk space startup", "#f8fafc",
    (g) => [
      ...[0, 1, 2, 3].map((i) => R(2 * g.P + g.m + (i % 2) * (g.pw / 2 + 6), 80 + Math.floor(i / 2) * (g.pw / 2 + 6), g.pw / 2 - 6, g.pw / 2 - 6, ["#6366f1", "#22d3ee", "#a5b4fc", "#312e81"][i], { radius: 14, name: "Tile" })),
      T("Hive Workspace", 2 * g.P + g.m, 120 + g.pw, g.pw, { size: 38, bold: true, color: "#312e81", lh: 1.05 }),
      T("Desks, rooms and coffee in the city centre.", 2 * g.P + g.m, 230 + g.pw, g.pw, { size: 15, color: MUTED, lh: 1.4 }),
      head("Try a free day", g.x(0), 70, g.pw, "#4338ca"),
      body("Bring your laptop and work with us for a day. No card needed.", g.x(0), 108, g.pw, MUTED),
      ...contact(g, "3rd floor, 40 King Street\n7 am to 10 pm\nhive.example", { h: "#4338ca", b: MUTED }),
    ],
    (g) => [
      ...[["Hot desk", "$150", "a month"], ["Fixed desk", "$240", "a month"], ["Private office", "$690", "a month"]].flatMap(([t, p, per], i) => [
        R(g.x(i), 70, g.pw, 420, i === 1 ? "#4338ca" : WHITE, { radius: 18, stroke: "#c7d2fe", sw: 2, name: "Plan card" }),
        T(t, g.x(i), 110, g.pw, { size: 22, bold: true, color: i === 1 ? WHITE : "#312e81", align: "center" }),
        T(p, g.x(i), 160, g.pw, { size: 54, bold: true, color: i === 1 ? WHITE : "#4338ca", align: "center" }),
        T(per, g.x(i), 236, g.pw, { size: 14, color: i === 1 ? "#c7d2fe" : MUTED, align: "center" }),
        T("Wi-Fi · coffee · printing\nmeeting room hours", g.x(i) + 16, 300, g.pw - 32, { size: 14, color: i === 1 ? WHITE : INK, align: "center", lh: 1.5 }),
      ]),
    ]);

  bro("animal-shelter-brochure-x6", "Animal shelter brochure", "brochure-trifold-letter", "animal shelter rescue adopt volunteer donate", "#fff7ed",
    (g) => [
      C(2 * g.P + g.P / 2 - 140, 90, 280, 280, "#fdba74", { name: "Photo ring" }),
      F(2 * g.P + g.P / 2 - 125, 105, 250, 250, { shape: "circle", name: "Pet photo" }),
      ...[0, 1, 2, 3, 4].map((i) => C(2 * g.P + g.m + i * 56, 410, 26, 26, "#ea580c", { op: 0.25 + i * 0.15, name: "Dot" })),
      T("Second Chance Animal Rescue", 2 * g.P + g.m, 470, g.pw, { size: 30, bold: true, color: "#7c2d12", align: "center", lh: 1.15 }),
      head("Since 2009", g.x(0), 70, g.pw, "#c2410c"),
      body("Over 4,000 cats and dogs have found new homes through our volunteers.", g.x(0), 108, g.pw, "#7c2d12"),
      ...contact(g, "2 Farm Road\nOpen Tue to Sun · 11 am to 4 pm\nsecondchance.example", { h: "#c2410c", b: "#7c2d12" }),
    ],
    (g) => [
      ...[["Adopt", "Meet our animals and take a friend home."], ["Foster", "Give a pet a calm home while it waits."], ["Donate", "$25 feeds one dog for a whole month."]].flatMap(([t, d], i) => [
        R(g.x(i), 60, g.pw, 160, ["#ea580c", "#f59e0b", "#7c2d12"][i], { radius: 18, name: "Header block" }),
        T(t, g.x(i), 110, g.pw, { size: 40, bold: true, color: WHITE, align: "center" }),
        body(d, g.x(i), 250, g.pw, "#7c2d12", 15),
      ]),
    ]);

  bro("language-school-brochure-x6", "Language school brochure", "brochure-trifold-a4", "language school english spanish lessons course", "#ffffff",
    (g) => [
      R(2 * g.P, 0, g.P, g.H, "#2563eb", { name: "Cover" }),
      R(2 * g.P + g.m, 90, g.pw, 120, WHITE, { radius: 26, name: "Bubble" }),
      S("triangle", 2 * g.P + g.m + 40, 200, 40, 34, WHITE, { rot: 180, name: "Bubble tail" }),
      T("Hello! Hola! Bonjour!", 2 * g.P + g.m, 132, g.pw, { size: 22, bold: true, color: "#2563eb", align: "center" }),
      T("Speak with confidence", 2 * g.P + g.m, 320, g.pw, { size: 36, bold: true, color: WHITE, lh: 1.1 }),
      T("Globe Language Centre", 2 * g.P + g.m, g.H - 100, g.pw, { size: 16, color: "#dbeafe" }),
      head("Free level test", g.x(0), 70, g.pw, "#2563eb"),
      body("Find your level in 20 minutes online, then join the right class.", g.x(0), 108, g.pw, MUTED),
      ...contact(g, "12 Station Road\nglobelanguage.example\n555 0162", { h: "#2563eb", b: MUTED }),
    ],
    (g) => [
      ...[["English", "Beginner to advanced"], ["Spanish", "Travel and business"], ["French", "Conversation club"]].flatMap(([t, d], i) => [
        R(g.x(i), 60, g.pw, 90, "#dbeafe", { radius: 45, name: "Pill" }),
        T(t, g.x(i), 86, g.pw, { size: 30, bold: true, color: "#1d4ed8", align: "center" }),
        T(d, g.x(i), 180, g.pw, { size: 16, bold: true, color: INK, align: "center" }),
        body("Groups of up to eight. Evenings and Saturdays. Ten-week terms start every January, April and September.", g.x(i), 220, g.pw, MUTED, 13),
      ]),
    ]);

  bro("garden-centre-brochure-x6", "Garden centre brochure", "brochure-trifold-letter", "garden centre plants nursery flowers seeds", "#f7fee7",
    (g) => [
      R(2 * g.P, g.H - 260, g.P, 260, "#3f6212", { name: "Ground" }),
      ...[0, 1, 2].map((i) => C(2 * g.P + 30 + i * 100, g.H - 330, 120, 120, ["#84cc16", "#65a30d", "#a3e635"][i], { name: "Bush" })),
      T("Greenleaf Garden Centre", 2 * g.P + g.m, 110, g.pw, { size: 36, family: "serif", bold: true, color: "#3f6212", lh: 1.1 }),
      T("Plants, seeds and friendly advice", 2 * g.P + g.m, 250, g.pw, { size: 16, italic: true, color: "#4d7c0f" }),
      head("Spring hours", g.x(0), 70, g.pw, "#3f6212"),
      body("Open every day from 8 am. Free parking and a café in the glasshouse.", g.x(0), 108, g.pw, "#365314"),
      ...contact(g, "Old Mill Road\ngreenleaf.example\n555 0129", { h: "#3f6212", b: "#365314" }),
    ],
    (g) => [
      ...[["Spring", "Bulbs, seeds and starter plants."], ["Summer", "Roses, herbs and patio pots."], ["Autumn", "Trees, hedges and spring bulbs."]].flatMap(([t, d], i) => [
        F(g.x(i), 60, g.pw, g.pw, { shape: "rounded", radius: 30, name: "Season photo" }),
        R(g.x(i), 80 + g.pw, g.pw, 54, "#3f6212", { radius: 27, name: "Season tag" }),
        T(t, g.x(i), 92 + g.pw, g.pw, { size: 24, bold: true, color: WHITE, align: "center" }),
        body(d, g.x(i), 160 + g.pw, g.pw, "#365314", 14),
      ]),
    ]);

  /* ================= Labels ================= */
  // Product labels 2 × 1 in = 192 × 96 px.
  tpl("hot-sauce-label-x6", "Hot sauce label", "label-product-2x1", "label product hot sauce chili bottle spicy", (W, H) => [page("#7f1d1d", [
    S("triangle", 8, 10, 46, 76, "#f97316", { name: "Flame" }),
    S("triangle", 18, 34, 26, 52, "#facc15", { name: "Flame core" }),
    T("FIRE ROAD", 62, 14, 124, { size: 18, bold: true, color: WHITE }),
    T("Hot sauce", 62, 38, 124, { size: 12, italic: true, color: "#fed7aa" }),
    T("150 ml · heat 4/5", 62, 66, 124, { size: 9, color: "#fecaca" }),
  ])]);
  tpl("lip-balm-label-x6", "Lip balm label", "label-product-2x1", "label product lip balm beauty cosmetics", (W, H) => [page("#fdf2f8", [
    ...[0, 1, 2, 3].map((i) => R(0, i * 24, 26, 12, "#f9a8d4", { name: "Stripe" })),
    T("Rosy Lips", 38, 16, 148, { size: 20, family: "serif", italic: true, color: "#9d174d" }),
    T("BEESWAX LIP BALM", 38, 46, 148, { size: 8.5, bold: true, color: "#be185d", ls: 1.5 }),
    T("4.5 g", 38, 68, 148, { size: 9, color: MUTED }),
  ])]);
  tpl("cold-brew-label-x6", "Cold brew label", "label-product-2x1", "label product cold brew coffee bottle drink", (W, H) => [page("#0f172a", [
    R(8, 8, W - 16, H - 16, "none", { stroke: "#38bdf8", sw: 1, name: "Frame" }),
    T("COLD BREW", 16, 20, W - 32, { size: 20, bold: true, color: "#e0f2fe", align: "center", ls: 2 }),
    R(W / 2 - 20, 48, 40, 1.5, "#38bdf8", { name: "Rule" }),
    T("Steeped 18 hours", 16, 56, W - 32, { size: 10, color: "#7dd3fc", align: "center" }),
  ])]);
  tpl("bath-salt-label-x6", "Bath salt label", "label-product-2x1", "label product bath salt spa relax jar", (W, H) => [page("#ecfeff", [
    C(-20, -20, 90, 90, "#a5f3fc", { name: "Bubble" }), C(150, 60, 60, 60, "#cffafe", { name: "Bubble" }),
    T("Sea Calm", 14, 26, W - 28, { size: 22, family: "serif", bold: true, color: "#155e75", align: "center" }),
    T("lavender bath salts · 300 g", 14, 58, W - 28, { size: 9.5, color: "#0e7490", align: "center" }),
  ])]);
  // Round labels 2 in = 192 px.
  tpl("lemonade-round-label-x6", "Lemonade round label", "label-round-2in", "label round lemonade drink jar fresh", (W, H) => [page("#fef9c3", [
    C(16, 16, 160, 160, "#facc15", { name: "Lemon" }), C(36, 36, 120, 120, "#fef08a", { name: "Lemon inner" }),
    T("Fresh", 36, 62, 120, { size: 16, italic: true, family: "serif", color: "#854d0e", align: "center" }),
    T("LEMONADE", 26, 86, 140, { size: 18, bold: true, color: "#713f12", align: "center" }),
    T("homemade", 36, 116, 120, { size: 10, color: "#a16207", align: "center" }),
  ])]);
  tpl("chutney-round-label-x6", "Chutney jar round label", "label-round-2in", "label round chutney jar homemade preserve", (W, H) => [page("#fff7ed", [
    C(8, 8, 176, 176, "none", { stroke: "#9a3412", sw: 3, name: "Ring" }),
    R(8, 76, 176, 40, "#9a3412", { name: "Band" }),
    T("MANGO CHUTNEY", 8, 87, 176, { size: 13, bold: true, color: WHITE, align: "center", ls: 1 }),
    T("Small batch", 30, 44, 132, { size: 12, italic: true, family: "serif", color: "#9a3412", align: "center" }),
    T("Best by  ____", 30, 128, 132, { size: 10, color: "#7c2d12", align: "center" }),
  ])]);
  tpl("sourdough-round-label-x6", "Bakery round label", "label-round-2in", "label round bakery bread sourdough bag seal", (W, H) => [page("#f5f0e8", [
    C(20, 20, 152, 152, "#78350f", { name: "Seal" }),
    T("BAKED", 20, 54, 152, { size: 14, bold: true, color: "#fde68a", align: "center", ls: 3 }),
    T("today", 20, 76, 152, { size: 30, family: "serif", italic: true, color: WHITE, align: "center" }),
    T("Crumb & Co.", 20, 122, 152, { size: 11, color: "#fde68a", align: "center" }),
  ])]);
  // Shipping labels 4 × 6 in = 384 × 576 px.
  const ship = (id, title, tags, accent, banner, note) => tpl(id, title, "label-shipping-4x6", "label shipping parcel " + tags, (W, H) => [page("#ffffff", [
    R(0, 0, W, 92, accent, { name: "Banner" }),
    T(banner, 18, 26, W - 36, { size: 34, bold: true, color: WHITE, align: "center" }),
    T("FROM", 22, 116, 120, { size: 11, bold: true, color: MUTED, ls: 2 }),
    T("Little Paper Shop\n5 Elm Court, Leeds LS1 4AB", 22, 134, W - 44, { size: 13, color: INK, lh: 1.35 }),
    R(22, 200, W - 44, 1.5, "#cbd5e1", { name: "Rule" }),
    T("TO", 22, 222, 120, { size: 11, bold: true, color: MUTED, ls: 2 }),
    T("Customer Name\n24 Harbour Road\nCity, Postcode", 22, 244, W - 44, { size: 22, bold: true, color: INK, lh: 1.3 }),
    R(22, 380, W - 44, 110, "#f1f5f9", { radius: 10, name: "Note box" }),
    T(note, 40, 404, W - 80, { size: 16, bold: true, color: accent, align: "center", lh: 1.35 }),
    ...Array.from({ length: 22 }, (_, i) => R(40 + i * 14, 510, i % 3 ? 6 : 10, 44, INK, { name: "Bar" })),
  ])]);
  ship("gift-shipping-label-x6", "Gift parcel shipping label", "gift present", "#db2777", "A GIFT FOR YOU", "Please do not open\nuntil the big day!");
  ship("overnight-shipping-label-x6", "Overnight shipping label", "overnight express next day", "#0f172a", "NEXT DAY", "Deliver before 12 noon\nSignature needed");
  ship("cold-chain-shipping-label-x6", "Keep cold shipping label", "keep cold refrigerated food", "#0284c7", "KEEP COLD", "Perishable food\nStore at 2–8 °C");

  /* ================= Mug wraps (8.5 × 3.5 in = 816 × 336 px) ================= */
  const MT = "mug cup wrap print ";
  tpl("dotted-world-mug-x6", "Dotted world mug", "mug", MT + "world travel map dots wanderlust", (W, H) => [page("#ffffff", [
    ...Array.from({ length: 70 }, (_, i) => { const x = 40 + (i % 14) * 24, y = 70 + Math.floor(i / 14) * 24; return (i * 7) % 5 ? C(x, y, 14, 14, "#0ea5e9", { op: 0.75, name: "Map dot" }) : null; }).filter(Boolean),
    T("Collect moments,\nnot things", 440, 110, 340, { size: 38, family: "serif", italic: true, color: "#0c4a6e", lh: 1.15 }),
  ])]);
  tpl("sunrise-stripes-mug-x6", "Sunrise stripes mug", "mug", MT + "sunrise stripes retro morning", (W, H) => [page("#fffbeb", [
    C(W / 2 - 120, 60, 240, 240, "#f97316", { name: "Sun" }),
    ...[0, 1, 2, 3].map((i) => R(W / 2 - 140, 120 + i * 40, 280, 14, "#fffbeb", { name: "Sun stripe" })),
    T("RISE", 40, 120, 240, { size: 64, bold: true, color: "#9a3412" }),
    T("& SHINE", W - 280, 130, 240, { size: 48, bold: true, color: "#ea580c", align: "right" }),
  ])]);
  tpl("checkmate-mug-x6", "Chess checkmate mug", "mug", MT + "chess checkmate board game", (W, H) => [page("#ffffff", [
    ...Array.from({ length: 16 }, (_, i) => ((i + Math.floor(i / 4)) % 2 ? R(60 + (i % 4) * 50, 68 + Math.floor(i / 4) * 50, 50, 50, INK, { name: "Square" }) : null)).filter(Boolean),
    R(60, 68, 200, 200, "none", { stroke: INK, sw: 3, name: "Board edge" }),
    T("Check", 330, 90, 440, { size: 70, family: "serif", color: INK }),
    T("MATE.", 330, 180, 440, { size: 70, bold: true, color: "#b45309" }),
  ])]);
  tpl("book-lover-mug-x6", "Book lover mug", "mug", MT + "book lover reading library", (W, H) => [page("#f5f3ff", [
    ...[["#7c3aed", 150], ["#a78bfa", 130], ["#4c1d95", 160], ["#c4b5fd", 120], ["#6d28d9", 145]].map(([c, hh], i) => R(50 + i * 44, 280 - hh, 36, hh, c, { radius: 4, name: "Book" })),
    R(40, 280, 240, 8, "#4c1d95", { name: "Shelf" }),
    T("Just one more chapter", 330, 120, 440, { size: 44, family: "serif", italic: true, color: "#4c1d95", lh: 1.15 }),
  ])]);
  tpl("level-up-mug-x6", "Level up gamer mug", "mug", MT + "gamer level up video game", (W, H) => [page("#111827", [
    T("LEVEL UP", 40, 70, 400, { size: 64, bold: true, family: "mono", color: "#4ade80" }),
    R(40, 170, 400, 40, "none", { stroke: "#4ade80", sw: 3, name: "XP bar" }),
    R(46, 176, 300, 28, "#4ade80", { name: "XP fill" }),
    T("XP 75%", 40, 228, 400, { size: 22, family: "mono", color: "#86efac" }),
    ...[0, 1, 2].map((i) => S("heart", 520 + i * 80, 120, 64, 60, "#f43f5e", { name: "Life" })),
  ])]);
  tpl("nurse-coffee-mug-x6", "Nurse coffee mug", "mug", MT + "nurse doctor medical hospital coffee", (W, H) => [page("#ffffff", [
    R(70, 120, 90, 30, "#0ea5e9", { name: "Cross bar" }), R(100, 90, 30, 90, "#0ea5e9", { name: "Cross bar" }),
    S("heart", 600, 90, 150, 140, "#f43f5e", { name: "Heart" }),
    T("Nurses run on\ncaffeine and kindness", 210, 100, 360, { size: 32, bold: true, color: "#0c4a6e", lh: 1.25, align: "center" }),
  ])]);
  tpl("baker-mug-x6", "Home baker mug", "mug", MT + "baker baking bread cake kitchen", (W, H) => [page("#fff7ed", [
    C(60, 70, 200, 200, "#fed7aa", { name: "Plate" }), C(90, 100, 140, 140, "#c2410c", { name: "Pie" }),
    ...[0, 1, 2].map((i) => R(110 + i * 34, 120, 8, 100, "#fed7aa", { rot: 45, name: "Lattice" })),
    T("Keep calm\nand bake on", 330, 90, 440, { size: 52, family: "serif", bold: true, color: "#7c2d12", lh: 1.1 }),
  ])]);
  tpl("camping-mug-x6", "Camping mountains mug", "mug", MT + "camping mountains outdoor adventure hiking", (W, H) => [page("#ecfeff", [
    S("triangle", 0, 120, 300, 216, "#155e75", { name: "Mountain" }),
    S("triangle", 180, 160, 260, 176, "#0e7490", { name: "Mountain" }),
    C(80, 40, 70, 70, "#fbbf24", { name: "Sun" }),
    T("The mountains\nare calling", 480, 100, 300, { size: 40, bold: true, color: "#164e63", lh: 1.15 }),
  ])]);
  tpl("hydrate-mug-x6", "Water level reminder mug", "mug", MT + "hydrate water reminder healthy", (W, H) => [page("#ffffff", [
    ...["8 am", "11 am", "2 pm", "5 pm", "8 pm"].flatMap((t, i) => [R(80, 50 + i * 52, 70, 4, "#38bdf8", { name: "Level" }), T(t, 162, 40 + i * 52, 120, { size: 20, bold: true, color: "#0369a1" })]),
    T("Drink your water!", 340, 130, 440, { size: 48, bold: true, color: "#0369a1" }),
  ])]);
  tpl("wave-line-mug-x6", "Minimal wave mug", "mug", MT + "minimal wave line ocean calm", (W, H) => [page("#f8fafc", [
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => C(40 + i * 110, 150 + (i % 2) * 20, 90, 30, "none", { stroke: "#0f766e", sw: 3, name: "Wave" })),
    T("salt water heals", 40, 240, W - 80, { size: 30, italic: true, family: "serif", color: "#0f766e", align: "center" }),
  ])]);
}
