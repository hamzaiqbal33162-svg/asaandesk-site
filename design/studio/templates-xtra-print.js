// AsaanDesk Studio: more own print base layouts (business cards, invitations, flyers, brochures, posters, labels).
// Pure module. templates.js calls the default export with its helpers (tpl, T, R, C, S, E, F, page, flow, K).
// All text, colours and layouts are our own; artwork is plain shapes and our own stickers.
import { castFor, face, KIND } from "./templates-faces.js";

export default function addXtraPrint(k) {
  const { T, R, C, S, E, F, page, flow } = k;
  // Person spots show people photos of their kind (templates-faces.js): one person picker per template build.
  let CAST = null;
  const tpl = (id, title, preset, tags, build) => k.tpl(id, title, preset, tags, (W, H) => { CAST = castFor(id); return build(W, H); });
  const { INK, MUTED, TEA, AMB, ROS, WHITE, GOLD, NAVY } = k.K;

  /* ================= Business cards (front + back) ================= */
  const rows = (items, x, y, gap, size, ic, tc, w) => items.flatMap(([icon, t], i) => [E(icon, x, y + i * gap, size + 2, { c1: ic }), T(t, x + size + 9, y + i * gap, w, { size, color: tc })]);

  tpl("minimal-line-business-card", "Minimal line business card", "business-card-us", "business card minimal clean simple white elegant consultant", (W, H) => [
    page(WHITE, [
      T("Olivia Bennett", 20, 52, W - 40, { size: 22, family: "serif", color: INK, align: "center", ls: 1 }),
      R(W / 2 - 30, 88, 60, 1.5, INK, { name: "Line" }),
      T("INTERIOR CONSULTANT", 20, 100, W - 40, { size: 9.5, color: MUTED, align: "center", ls: 4 }),
      T("olivia@bennettinteriors.com  ·  +1 555 0177 210", 16, 158, W - 32, { size: 8.5, color: INK, align: "center" }),
    ]),
    page("#f5f5f4", [
      C(W / 2 - 32, 44, 64, 64, "none", { stroke: INK, sw: 1.5, name: "Ring" }),
      T("OB", W / 2 - 32, 62, 64, { size: 22, family: "serif", color: INK, align: "center" }),
      T("Bennett Interiors", 20, 126, W - 40, { size: 13, family: "serif", italic: true, color: INK, align: "center" }),
    ]),
  ]);
  tpl("bold-block-business-card", "Bold colour block business card", "business-card-us", "business card bold colour block modern agency marketing", (W, H) => [
    page(WHITE, [
      R(0, 0, 124, H, "#f97316", { name: "Colour block" }),
      T("JR", 0, 66, 124, { size: 44, bold: true, color: WHITE, align: "center" }),
      T("Jamal Reed", 142, 34, W - 156, { size: 21, bold: true, color: INK }),
      T("Marketing Manager", 142, 62, W - 156, { size: 11, bold: true, color: "#f97316" }),
      ...rows([["icon-call", "+1 555 0163 400"], ["icon-mail", "jamal@brightloop.io"], ["icon-globe", "brightloop.io"]], 142, 96, 22, 10, "#f97316", INK, 170),
    ]),
    page("#f97316", [
      T("brightloop", 20, 64, W - 40, { size: 38, bold: true, color: WHITE, align: "center" }),
      T("Ideas that move people", 20, 116, W - 40, { size: 12, color: "#ffedd5", align: "center", ls: 1 }),
    ]),
  ]);
  tpl("photo-half-business-card", "Photo half business card", "business-card-eu", "business card photo picture portrait stylist salon personal", (W, H) => [
    page(WHITE, [
      face(CAST, F(W / 2, 0, W / 2, H, { name: "Portrait photo" }), KIND.beauty + " portrait", { sex: "f" }),
      T("Sofia Marin", 16, 36, W / 2 - 24, { size: 19, bold: true, color: INK }),
      T("Hair stylist", 16, 62, W / 2 - 24, { size: 11, family: "serif", italic: true, color: ROS }),
      T("+1 555 0181 512\nsofia@marinstudio.com\nmarinstudio.com", 16, 100, W / 2 - 24, { size: 9, color: INK, lh: 1.6 }),
    ]),
    page("#fff1f2", [
      E("deco-sparkle", W / 2 - 18, 40, 36, { c1: ROS }),
      T("Marin Hair Studio", 20, 92, W - 40, { size: 18, family: "serif", bold: true, color: "#9f1239", align: "center" }),
      T("Cuts · colour · styling", 20, 122, W - 40, { size: 10.5, color: "#be123c", align: "center" }),
    ]),
  ]);
  tpl("gold-monogram-business-card", "Gold monogram business card", "business-card-us", "business card luxury gold monogram dark lawyer jeweller premium", (W, H) => [
    page("#111827", [
      C(W / 2 - 40, 34, 80, 80, "none", { stroke: "#d4a017", sw: 2, name: "Gold ring" }),
      T("H", W / 2 - 40, 50, 80, { size: 40, family: "serif", color: "#d4a017", align: "center" }),
      T("HARTWELL & CO", 20, 132, W - 40, { size: 14, family: "serif", color: WHITE, align: "center", ls: 4 }),
      T("Fine jewellery since 1987", 20, 156, W - 40, { size: 9, italic: true, family: "serif", color: "#d1d5db", align: "center" }),
    ]),
    page("#111827", [
      T("Edward Hartwell", 24, 36, W - 48, { size: 19, family: "serif", color: "#d4a017" }),
      T("Director", 24, 62, W - 48, { size: 10, color: "#d1d5db", ls: 2 }),
      R(24, 84, 40, 1.5, "#d4a017", { name: "Gold line" }),
      ...rows([["icon-call", "+1 555 0100 987"], ["icon-mail", "edward@hartwell.co"], ["icon-location", "12 Crown Street"]], 24, 100, 22, 10, "#d4a017", WHITE, 220),
    ]),
  ]);
  tpl("gradient-business-card", "Gradient business card", "business-card-us", "business card gradient colourful tech developer startup", (W, H) => [
    page(["#6366f1", "#ec4899", 120], [
      T("Leo Park", 22, 40, W - 44, { size: 26, bold: true, color: WHITE }),
      T("Full-stack developer", 22, 74, W - 44, { size: 12, color: "#fce7f3" }),
      T("leo@parkcode.dev", 22, 140, W - 44, { size: 11, bold: true, color: WHITE }),
      E("deco-sparkles", W - 70, 24, 46, { c1: WHITE, c2: "#fde68a" }),
    ]),
    page(WHITE, [
      R(0, 0, W, 8, "#8b5cf6", { name: "Top band" }),
      ...rows([["icon-call", "+1 555 0135 246"], ["icon-mail", "leo@parkcode.dev"], ["icon-globe", "parkcode.dev"], ["icon-location", "Remote · Seattle"]], 40, 46, 26, 11, "#8b5cf6", INK, 240),
    ]),
  ]);
  tpl("badge-centred-business-card", "Centred badge business card", "business-card-eu", "business card badge logo centred bakery cafe restaurant", (W, H) => [
    page("#fef3c7", [
      C(W / 2 - 34, 20, 68, 68, "#92400e", { name: "Badge" }),
      E("icon-chai", W / 2 - 18, 36, 36, { c1: "#fef3c7" }),
      T("Corner Cup Café", 20, 100, W - 40, { size: 18, bold: true, color: "#78350f", align: "center" }),
      T("Nora Hughes · Owner", 20, 128, W - 40, { size: 10.5, color: "#92400e", align: "center" }),
      T("+1 555 0150 018  ·  cornercup.cafe", 16, 172, W - 32, { size: 9, color: "#78350f", align: "center" }),
    ]),
    page("#92400e", [
      T("Open daily\n7 am – 7 pm", 20, 56, W - 40, { size: 20, bold: true, color: "#fef3c7", align: "center", lh: 1.3 }),
      T("8 Mill Lane, Oakridge", 20, 140, W - 40, { size: 10.5, color: "#fde68a", align: "center" }),
    ]),
  ]);
  const qr = (x, y, s, c) => {
    const cells = [], n = 7, u = s / n, on = "1111111100010110101111011101000110010111011101111101".split("");
    for (let i = 0; i < n * n; i++) if (on[i % on.length] === "1") cells.push(R(x + (i % n) * u, y + Math.floor(i / n) * u, u, u, c, { name: "Code square" }));
    return cells;
  };
  tpl("code-corner-business-card", "Scan code corner business card", "business-card-us", "business card scan code modern tech contact digital", (W, H) => [
    page(WHITE, [
      T("Ava Thompson", 22, 34, 200, { size: 20, bold: true, color: NAVY }),
      T("Product Designer", 22, 60, 200, { size: 11, color: TEA, bold: true }),
      ...rows([["icon-call", "+1 555 0191 702"], ["icon-mail", "ava@thompson.design"]], 22, 104, 22, 10, NAVY, INK, 180),
      R(W - 104, 30, 82, 82, "#f1f5f9", { radius: 8, name: "Code box" }),
      ...qr(W - 96, 38, 66, NAVY),
      T("Scan to connect", W - 112, 120, 98, { size: 8.5, color: MUTED, align: "center" }),
    ]),
    page(NAVY, [
      T("thompson.design", 20, 80, W - 40, { size: 22, bold: true, color: WHITE, align: "center" }),
      R(W / 2 - 24, 116, 48, 3, TEA, { name: "Line" }),
    ]),
  ]);

  /* ================= Invitations (5 × 7 in) ================= */
  tpl("floral-wedding-invitation", "Floral wedding invitation", "invitation-5x7", "invitation wedding floral elegant marriage ceremony", (W, H) => [page("#fffbf7", [
    E("deco-flower", -20, -20, 170, { c1: "#f9a8d4", c2: "#fbcfe8", rot: -10 }),
    E("deco-flower", W - 150, H - 150, 170, { c1: "#f9a8d4", c2: "#fbcfe8", rot: 20 }),
    flow(170,
      T("Together with their families", 40, 0, W - 80, { size: 14, family: "serif", italic: true, color: MUTED, align: "center" }), 20,
      T("Emma\n& James", 40, 0, W - 80, { size: 58, family: "serif", color: "#9d174d", align: "center", lh: 1.05 }), 18,
      E("line-ornament", W / 2 - 100, 0, 200, { c1: "#be185d" }), 18,
      T("invite you to celebrate their wedding", 40, 0, W - 80, { size: 15, family: "serif", color: INK, align: "center" }), 26,
      T("Saturday, 12 June 2027 · 4 pm\nRosewood Gardens", 40, 0, W - 80, { size: 16, bold: true, color: INK, align: "center", lh: 1.5 })),
  ])]);
  tpl("number-birthday-invitation", "Big number birthday invitation", "invitation-5x7", "invitation birthday party number celebration modern bold", (W, H) => [page("#0f172a", [
    T("30", 0, 70, W, { size: 260, bold: true, color: "#facc15", align: "center", lh: 1 }),
    E("deco-confetti", 20, 30, 140, { c1: "#facc15", c2: "#f472b6" }),
    flow(370,
      T("Sam's birthday party", 40, 0, W - 80, { size: 34, bold: true, color: WHITE, align: "center" }), 14,
      T("Friday, 9 April · 8 pm\nThe Rooftop, 21 King Street", 40, 0, W - 80, { size: 17, color: "#cbd5e1", align: "center", lh: 1.5 })),
    R(W / 2 - 110, H - 110, 220, 50, "#facc15", { radius: 25, name: "RSVP pill" }),
    T("RSVP by 1 April", W / 2 - 110, H - 96, 220, { size: 16, bold: true, color: INK, align: "center" }),
  ])]);
  tpl("housewarming-invitation", "Housewarming invitation", "invitation-5x7", "invitation housewarming new home party friends", (W, H) => [page("#fff7ed", [
    R(0, H - 220, W, 220, "#fdba74", { name: "Ground" }),
    E("icon-home", W / 2 - 90, 70, 180, { c1: "#c2410c" }),
    flow(280,
      T("Come see our", 40, 0, W - 80, { size: 22, family: "serif", italic: true, color: "#9a3412", align: "center" }), 4,
      T("NEW HOME", 40, 0, W - 80, { size: 54, bold: true, color: "#7c2d12", align: "center", ls: 2 })),
    flow(H - 190,
      T("Sunday, 16 May · 2 pm onwards", 40, 0, W - 80, { size: 18, bold: true, color: "#7c2d12", align: "center" }), 8,
      T("44 Willow Court, Greenfield\nFood, drinks and good company", 40, 0, W - 80, { size: 15, color: "#7c2d12", align: "center", lh: 1.5 })),
  ])]);
  tpl("garden-party-invitation", "Garden party invitation", "invitation-5x7", "invitation garden party brunch spring tea shower", (W, H) => [page("#f0fdf4", [
    R(24, 24, W - 48, H - 48, "none", { stroke: "#16a34a", sw: 2, radius: 18, name: "Border" }),
    E("deco-sprig", 40, 40, 90, { c1: "#22c55e", c2: "#15803d" }),
    E("deco-sprig", W - 130, 40, 90, { c1: "#22c55e", c2: "#15803d", rot: 90 }),
    flow(170,
      T("You're invited to a", 50, 0, W - 100, { size: 16, color: "#166534", align: "center" }), 8,
      T("Garden Party", 50, 0, W - 100, { size: 50, family: "serif", italic: true, bold: true, color: "#14532d", align: "center" }), 18,
      T("in honour of Grace", 50, 0, W - 100, { size: 18, family: "serif", color: "#166534", align: "center" }), 30,
      T("Saturday, 22 May · 11 am\nThe Orchard House, Hill Road", 50, 0, W - 100, { size: 16, bold: true, color: INK, align: "center", lh: 1.5 }), 20,
      T("Light lunch and lemonade", 50, 0, W - 100, { size: 14, italic: true, color: MUTED, align: "center" })),
  ])]);
  tpl("gala-dinner-invitation", "Gala dinner invitation", "invitation-5x7", "invitation gala dinner corporate black gold awards formal", (W, H) => [page("#0b0b0f", [
    R(30, 30, W - 60, H - 60, "none", { stroke: "#d4a017", sw: 1.5, name: "Gold border" }),
    E("line-diamonds", W / 2 - 90, 90, 180, { c1: "#d4a017" }),
    flow(150,
      T("THE ANNUAL", 50, 0, W - 100, { size: 16, color: "#d4a017", align: "center", ls: 6 }), 10,
      T("Gala\nDinner", 50, 0, W - 100, { size: 64, family: "serif", color: WHITE, align: "center", lh: 1 }), 20,
      T("Awards night for our partners and team", 50, 0, W - 100, { size: 14, family: "serif", italic: true, color: "#d1d5db", align: "center" }), 40,
      T("Thursday, 2 December · 7 pm\nGrand Hall, Hotel Meridian", 50, 0, W - 100, { size: 16, color: WHITE, align: "center", lh: 1.6 }), 24,
      T("Black tie", 50, 0, W - 100, { size: 14, bold: true, color: "#d4a017", align: "center", ls: 3 })),
  ])]);
  tpl("retirement-party-invitation", "Retirement party invitation", "invitation-5x7", "invitation retirement party farewell celebration office", (W, H) => [page("#eff6ff", [
    R(0, 0, W, 250, "#1d4ed8", { name: "Header" }),
    E("deco-bunting", 0, 0, W, { c1: "#facc15", c2: "#f472b6", c3: WHITE }),
    T("Happy\nRetirement", 30, 90, W - 60, { size: 48, bold: true, color: WHITE, align: "center", lh: 1.05 }),
    flow(290,
      T("Join us to celebrate", 40, 0, W - 80, { size: 18, color: "#1e3a8a", align: "center" }), 6,
      T("Robert Nguyen", 40, 0, W - 80, { size: 36, family: "serif", bold: true, color: "#1e40af", align: "center" }), 8,
      T("after 32 wonderful years", 40, 0, W - 80, { size: 16, italic: true, color: MUTED, align: "center" }), 30,
      T("Friday, 30 July · 5 pm\nOffice terrace, 5th floor", 40, 0, W - 80, { size: 17, bold: true, color: INK, align: "center", lh: 1.5 })),
    E("deco-balloons", W - 120, H - 170, 100, { c1: "#1d4ed8", c2: "#facc15", c3: "#f472b6" }),
  ])]);
  tpl("save-the-date-invitation", "Save the date card", "invitation-5x7", "invitation save the date wedding engagement date announcement", (W, H) => [page(WHITE, [
    F(30, 30, W - 60, 300, { shape: "rounded", radius: 16, name: "Couple photo" }),
    T("SAVE THE DATE", 30, 360, W - 60, { size: 30, bold: true, color: INK, align: "center", ls: 6 }),
    R(70, 412, W - 140, 1.5, INK, { name: "Line" }),
    T("10 · 09 · 2027", 30, 430, W - 60, { size: 46, family: "serif", color: "#b45309", align: "center" }),
    R(70, 500, W - 140, 1.5, INK, { name: "Line" }),
    T("Lily & Marcus", 30, 520, W - 60, { size: 26, family: "serif", italic: true, color: INK, align: "center" }),
    T("Lakeside, Vermont · invitation to follow", 30, 568, W - 60, { size: 13, color: MUTED, align: "center" }),
  ])]);

  /* ================= Flyers ================= */
  tpl("home-listing-flyer", "Home for sale flyer", "flyer-letter", "flyer real estate listing home for sale property open house", (W, H) => [page(WHITE, [
    F(0, 0, W, 470, { name: "House photo" }),
    R(40, 400, 300, 110, "#065f46", { radius: 12, name: "Price tag" }),
    T("FOR SALE", 40, 412, 300, { size: 20, bold: true, color: "#a7f3d0", align: "center", ls: 4 }),
    T("$489,000", 40, 440, 300, { size: 46, bold: true, color: WHITE, align: "center" }),
    flow(550, T("Sunny family home near the park", 40, 0, W - 80, { size: 40, bold: true, color: INK }), 10,
      T("27 Cedar Lane, Brookside", 40, 0, W - 80, { size: 22, color: MUTED })),
    ...[["4", "Bedrooms"], ["3", "Bathrooms"], ["2,150", "Square feet"], ["2", "Car garage"]].flatMap(([n, l], i) => [
      R(40 + i * 188, 690, 172, 120, "#ecfdf5", { radius: 14, name: "Feature card" }),
      T(n, 40 + i * 188, 708, 172, { size: 40, bold: true, color: "#065f46", align: "center" }),
      T(l, 40 + i * 188, 764, 172, { size: 16, color: INK, align: "center" }),
    ]),
    T("Open house: Sunday 1 – 4 pm", 40, 850, W - 80, { size: 24, bold: true, color: "#065f46" }),
    R(0, H - 120, W, 120, "#065f46", { name: "Footer" }),
    T("Call Mia Torres · +1 555 0172 600 · brooksidehomes.com", 30, H - 80, W - 60, { size: 22, bold: true, color: WHITE, align: "center" }),
  ])]);
  tpl("yoga-schedule-flyer", "Yoga class schedule flyer", "flyer-a4", "flyer class schedule timetable yoga studio fitness weekly", (W, H) => [page("#faf5ff", [
    C(W - 300, -160, 460, 460, "#e9d5ff", { name: "Circle" }),
    E("icon-sun", W - 190, 60, 110, { c1: "#a855f7" }),
    flow(70, T("Weekly classes", 60, 0, 520, { size: 26, color: "#7e22ce", bold: true, ls: 2 }), 6, T("Lotus Yoga", 60, 0, 560, { size: 80, family: "serif", bold: true, color: "#581c87", lh: 1 })),
    ...[["Monday", "Morning flow", "7:00 am"], ["Tuesday", "Gentle stretch", "6:30 pm"], ["Wednesday", "Power yoga", "7:00 am"], ["Thursday", "Breath and calm", "6:30 pm"], ["Saturday", "Family yoga", "10:00 am"]].flatMap(([d, c, t], i) => [
      R(60, 330 + i * 120, W - 120, 100, i % 2 ? "#f3e8ff" : WHITE, { radius: 16, name: "Class row" }),
      T(d, 90, 362 + i * 120, 180, { size: 26, bold: true, color: "#6b21a8" }),
      T(c, 280, 362 + i * 120, 240, { size: 26, color: INK }),
      T(t, 540, 362 + i * 120, 170, { size: 26, bold: true, color: "#7e22ce", align: "right" }),
    ]),
    T("First class free · mats provided", 60, 960, W - 120, { size: 28, family: "serif", italic: true, color: "#581c87", align: "center" }),
    T("12 Lotus Lane · lotusyoga.studio · +1 555 0147 330", 60, H - 90, W - 120, { size: 20, color: INK, align: "center" }),
  ])]);
  tpl("now-hiring-flyer", "Now hiring flyer", "flyer-a5", "flyer hiring jobs vacancy staff recruitment shop cafe", (W, H) => [page("#fde047", [
    T("NOW", 40, 50, W - 80, { size: 90, bold: true, color: INK, lh: 1 }),
    T("HIRING", 40, 140, W - 80, { size: 90, bold: true, color: WHITE, lh: 1, outline: { width: 3, color: INK } }),
    E("icon-users", W - 150, 60, 110, { c1: INK }),
    flow(290, T("Join the team at Daily Bread Bakery", 40, 0, W - 80, { size: 22, bold: true, color: INK }), 18,
      ...["Bakers (early shift)", "Counter staff", "Delivery riders"].flatMap((r) => [T("✓  " + r, 50, 0, W - 100, { size: 22, color: INK }), 10])),
    R(40, 560, W - 80, 2, INK, { name: "Line" }),
    T("Friendly team · fair pay · free breakfast", 40, 580, W - 80, { size: 18, italic: true, color: INK }),
    R(40, H - 130, W - 80, 80, INK, { radius: 12, name: "Apply box" }),
    T("Apply: jobs@dailybread.shop", 40, H - 106, W - 80, { size: 22, bold: true, color: "#fde047", align: "center" }),
  ])]);
  tpl("charity-run-flyer", "Charity fun run flyer", "flyer-a4", "flyer charity run event fundraiser race community sport", (W, H) => [page(WHITE, [
    R(0, 0, W, H * 0.45, "#0ea5e9", { name: "Sky block" }),
    S("triangle", -60, H * 0.3, 520, 260, "#0284c7", { name: "Hill" }),
    S("triangle", 300, H * 0.28, 600, 300, "#0369a1", { name: "Hill" }),
    flow(70, T("5K FUN RUN", 60, 0, W - 120, { size: 96, bold: true, color: WHITE, lh: 1 }), 10, T("for Children's Hospital", 60, 0, W - 120, { size: 34, color: "#e0f2fe" })),
    E("icon-heart", W - 170, 330, 110, { c1: ROS }),
    flow(560, T("Sunday, 18 April · 8 am", 60, 0, W - 120, { size: 40, bold: true, color: INK }), 12,
      T("Start: Lakeside Park main gate", 60, 0, W - 120, { size: 28, color: MUTED }), 30,
      T("Walk, jog or run. Every ticket helps buy new equipment for the children's ward.", 60, 0, W - 120, { size: 26, color: INK, lh: 1.45 })),
    ...[["$15", "Adults"], ["$5", "Kids"], ["Free", "Under 5"]].flatMap(([p, l], i) => [
      C(90 + i * 230, 840, 150, 150, ["#0ea5e9", ROS, AMB][i], { name: "Price circle" }),
      T(p, 90 + i * 230, 880, 150, { size: 38, bold: true, color: WHITE, align: "center" }),
      T(l, 70 + i * 230, 1000, 190, { size: 22, color: INK, align: "center" }),
    ]),
  ])]);
  tpl("cafe-menu-flyer", "Café menu flyer", "flyer-a5", "flyer menu cafe coffee food prices restaurant", (W, H) => [page("#1c1917", [
    E("icon-chai", W / 2 - 40, 40, 80, { c1: "#fbbf24" }),
    T("The Bean House", 30, 130, W - 60, { size: 40, family: "serif", bold: true, color: WHITE, align: "center" }),
    T("MENU", 30, 184, W - 60, { size: 16, color: "#fbbf24", align: "center", ls: 8 }),
    ...[["Espresso", "2.50"], ["Cappuccino", "3.80"], ["Iced latte", "4.20"], ["Masala tea", "3.00"], ["Butter croissant", "2.90"], ["Banana bread", "3.40"], ["Avocado toast", "6.50"]].flatMap(([n, p], i) => [
      T(n, 50, 250 + i * 60, 300, { size: 21, color: WHITE }),
      T("$" + p, W - 170, 250 + i * 60, 120, { size: 21, bold: true, color: "#fbbf24", align: "right" }),
      R(50, 286 + i * 60, W - 100, 1, "#57534e", { name: "Divider" }),
    ]),
    T("Open 7 am – 6 pm · 3 Station Road", 30, H - 70, W - 60, { size: 15, color: "#d6d3d1", align: "center" }),
  ])]);
  tpl("music-festival-flyer", "Music festival flyer", "flyer-letter", "flyer music festival concert event summer outdoor", (W, H) => [page(["#7c3aed", "#f43f5e", 160], [
    C(W / 2 - 260, 120, 520, 520, "#fde047", { op: 0.9, name: "Sun" }),
    R(0, 420, W, 30, "#7c3aed", { op: 0.6, name: "Stripe" }), R(0, 480, W, 22, "#7c3aed", { op: 0.6, name: "Stripe" }), R(0, 530, W, 16, "#7c3aed", { op: 0.6, name: "Stripe" }),
    flow(660, T("SUNSET SOUNDS", 40, 0, W - 80, { size: 82, bold: true, color: WHITE, align: "center", lh: 1 }), 14,
      T("Music festival · 3 stages · 20 artists", 40, 0, W - 80, { size: 28, color: "#fde047", align: "center" }), 30,
      T("24 – 26 JULY · RIVERSIDE FIELDS", 40, 0, W - 80, { size: 30, bold: true, color: WHITE, align: "center", ls: 2 })),
    T("Tickets at sunsetsounds.fest", 40, H - 90, W - 80, { size: 24, bold: true, color: WHITE, align: "center" }),
  ])]);
  tpl("cleaning-service-flyer", "Cleaning service flyer", "flyer-a4", "flyer cleaning service home office business offer checklist", (W, H) => [page("#f0fdfa", [
    R(0, 0, W, 300, "#0d9488", { name: "Header" }),
    E("deco-sparkles", W - 200, 60, 140, { c1: WHITE, c2: "#99f6e4" }),
    flow(70, T("Sparkle Clean", 60, 0, 560, { size: 72, bold: true, color: WHITE, lh: 1 }), 10, T("Home and office cleaning", 60, 0, 560, { size: 30, color: "#ccfbf1" })),
    ...["Kitchens and bathrooms", "Dusting and vacuuming", "Windows and floors", "Move-in and move-out cleans", "Eco-friendly products"].flatMap((s, i) => [E("icon-check-circle", 60, 370 + i * 78, 40, { c1: "#0d9488" }), T(s, 120, 372 + i * 78, W - 180, { size: 30, color: INK })]),
    R(60, 800, W - 120, 150, "#ccfbf1", { radius: 20, name: "Offer box" }),
    T("20% OFF your first clean", 60, 830, W - 120, { size: 44, bold: true, color: "#115e59", align: "center" }),
    T("Book online: sparkleclean.co", 60, 892, W - 120, { size: 24, color: "#115e59", align: "center" }),
    T("+1 555 0166 222", 60, H - 110, W - 120, { size: 40, bold: true, color: "#0d9488", align: "center" }),
  ])]);

  /* ================= Brochures (tri-fold, 2 pages, 3 panels each) ================= */
  const tri = (W, pad = 32) => ({ p3: W / 3, pad, cw: W / 3 - pad * 2 });
  function brochure({ W, H, look, c, ink = INK, soft, cover, back, flap, inside }) {
    const { p3, pad, cw } = tri(W);
    const outside = [];
    // Panel 1 (inside flap), panel 2 (back), panel 3 (cover).
    outside.push(...flow(56, T(flap.title, pad, 0, cw, { size: 26, bold: true, color: c }), 14, T(flap.text, pad, 0, cw, { size: 16, color: ink, lh: 1.6 })));
    if (look === "photo") outside.push(F(pad, H - 320, cw, 260, { shape: "rounded", radius: 16, name: "Photo" }));
    else outside.push(R(pad, H - 120, cw, 70, soft, { radius: 14, name: "Note box" }), T(flap.note, pad, H - 100, cw, { size: 15, bold: true, color: c, align: "center" }));
    outside.push(E(back.icon, p3 + p3 / 2 - 34, 70, 68, { c1: c }), ...flow(170, T(back.title, p3 + pad, 0, cw, { size: 24, bold: true, color: ink, align: "center" }), 14, T(back.text, p3 + pad, 0, cw, { size: 16, color: ink, align: "center", lh: 1.6 })));
    if (look === "band") outside.push(R(2 * p3, 0, p3, H, c, { name: "Cover panel" }), R(2 * p3, H - 150, p3, 150, soft, { name: "Cover foot" }));
    else if (look === "split") outside.push(R(2 * p3, 0, p3, H * 0.55, c, { name: "Cover block" }));
    else outside.push(F(2 * p3, 0, p3, H * 0.5, { name: "Cover photo" }), R(2 * p3, H * 0.5, p3, 12, c, { name: "Cover line" }));
    const coverTop = look === "band" ? 200 : look === "split" ? H * 0.15 : H * 0.5 + 60;
    const coverInk = look === "photo" ? ink : WHITE;
    if (look !== "photo") outside.push(E(cover.icon, 2 * p3 + p3 / 2 - 40, coverTop - 100, 80, { c1: WHITE }));
    outside.push(...flow(coverTop, T(cover.title, 2 * p3 + pad, 0, cw, { size: 40, bold: true, color: coverInk, align: "center", lh: 1.1 }), 14, T(cover.sub, 2 * p3 + pad, 0, cw, { size: 18, family: "serif", italic: true, color: look === "photo" ? c : "#f8fafc", align: "center" })));
    outside.push(T(cover.foot, 2 * p3 + pad, H - 100, cw, { size: 14, bold: true, color: look === "band" ? c : look === "split" ? c : MUTED, align: "center" }));
    const inn = inside.flatMap(([h, b, ic], i) => {
      const x = i * p3 + pad;
      const out = [];
      if (look === "band") out.push(R(i * p3, 0, p3, 150, i === 1 ? c : soft, { name: "Panel header" }), T(h, x, 54, cw, { size: 26, bold: true, color: i === 1 ? WHITE : c, align: "center" }), T(b, x, 190, cw, { size: 16, color: ink, lh: 1.6 }), E(ic, i * p3 + p3 / 2 - 40, H - 170, 80, { c1: c }));
      else if (look === "split") out.push(C(i * p3 + p3 / 2 - 50, 50, 100, 100, soft, { name: "Icon circle" }), E(ic, i * p3 + p3 / 2 - 30, 70, 60, { c1: c }), T(h, x, 180, cw, { size: 26, bold: true, color: ink, align: "center" }), T(b, x, 228, cw, { size: 16, color: ink, align: "center", lh: 1.6 }), R(x + cw / 2 - 30, H - 80, 60, 4, c, { name: "Line" }));
      else out.push(F(x, 40, cw, 240, { shape: "rounded", radius: 14, name: "Photo" }), T(h, x, 310, cw, { size: 26, bold: true, color: c }), T(b, x, 356, cw, { size: 16, color: ink, lh: 1.6 }));
      return out;
    });
    return [page(WHITE, outside), page(look === "split" ? WHITE : "#fafafa", inn)];
  }
  tpl("bakery-brochure", "Bakery brochure", "brochure-trifold-a4", "brochure trifold bakery cakes bread pastry cafe", (W, H) => brochure({ W, H, look: "band", c: "#b45309", soft: "#fef3c7",
    cover: { icon: "icon-heart", title: "Golden Crust Bakery", sub: "Baked fresh every morning", foot: "goldencrust.bakery" },
    back: { icon: "icon-location", title: "Visit us", text: "18 Baker Street\nOpen 6 am – 8 pm\n+1 555 0140 210" },
    flap: { title: "Custom cakes", text: "Birthdays, weddings and office treats. Tell us your idea and we bake it.", note: "Order 3 days ahead" },
    inside: [["Breads", "Sourdough, rye and seeded loaves made with slow-rise dough.", "icon-sun"], ["Pastries", "Croissants, cinnamon rolls and fruit tarts from our own ovens.", "icon-star"], ["Coffee", "Fresh coffee and tea to enjoy with your favourite bake.", "icon-chai"]] }));
  tpl("yoga-studio-brochure", "Yoga studio brochure", "brochure-trifold-letter", "brochure trifold yoga studio wellness meditation classes", (W, H) => brochure({ W, H, look: "split", c: "#7c3aed", soft: "#ede9fe",
    cover: { icon: "icon-sun", title: "Still Water Yoga", sub: "Breathe, move, rest", foot: "stillwater.yoga" },
    back: { icon: "icon-calendar", title: "Class times", text: "Mornings 7 am\nEvenings 6:30 pm\nWeekends 10 am" },
    flap: { title: "New here?", text: "Start with our two-week intro pass: unlimited classes for beginners.", note: "Intro pass $29" },
    inside: [["Gentle yoga", "Slow movement and stretching for every body and age.", "icon-leaf"], ["Meditation", "Guided sessions to calm the mind and sleep better.", "icon-moon"], ["Private lessons", "One-to-one sessions planned around your goals.", "icon-user"]] }));
  tpl("law-firm-brochure", "Law firm brochure", "brochure-trifold-a4", "brochure trifold law firm legal lawyer attorney services", (W, H) => brochure({ W, H, look: "band", c: "#1e3a8a", soft: "#dbeafe",
    cover: { icon: "shape-shield", title: "Grant & Hale Law", sub: "Clear advice you can trust", foot: "grantandhale.law" },
    back: { icon: "icon-call", title: "Free first meeting", text: "+1 555 0108 404\nhello@grantandhale.law\n5 Court Square" },
    flap: { title: "About us", text: "A team of twelve lawyers helping families and small businesses since 2004.", note: "Since 2004" },
    inside: [["Family law", "Divorce, custody and wills handled with care and privacy.", "icon-users"], ["Business law", "Contracts, company setup and disputes for growing firms.", "icon-document"], ["Property law", "Buying, selling and leasing homes and offices.", "icon-home"]] }));
  tpl("resort-brochure", "Hotel and resort brochure", "brochure-trifold-letter", "brochure trifold hotel resort holiday beach spa travel", (W, H) => brochure({ W, H, look: "photo", c: "#0891b2", soft: "#cffafe",
    cover: { icon: "icon-sun", title: "Coral Bay Resort", sub: "Your seaside escape", foot: "coralbay.resort" },
    back: { icon: "icon-globe", title: "Getting here", text: "20 minutes from the airport\nFree shuttle every hour" },
    flap: { title: "Stay and save", text: "Book four nights and the fifth one is on us, all year round.", note: "" },
    inside: [["Rooms", "Sea-view rooms and family suites with private balconies.", "icon-home"], ["Spa", "Massages, steam room and an outdoor pool by the beach.", "icon-leaf"], ["Dining", "Three restaurants serving fresh local seafood.", "icon-star"]] }));
  tpl("software-brochure", "Software company brochure", "brochure-trifold-a4", "brochure trifold software tech startup app product business", (W, H) => brochure({ W, H, look: "split", c: "#2563eb", soft: "#dbeafe",
    cover: { icon: "icon-settings", title: "TaskFlow", sub: "Plan work your team will love", foot: "taskflow.app" },
    back: { icon: "icon-mail", title: "Talk to us", text: "sales@taskflow.app\n+1 555 0115 880\nFree 30-day trial" },
    flap: { title: "Trusted by teams", text: "Over 4,000 teams plan projects, track tasks and meet deadlines with TaskFlow.", note: "4,000+ teams" },
    inside: [["Plan", "Boards, lists and timelines that show who does what and when.", "icon-calendar"], ["Track", "Live progress and simple reports for every project.", "arrow-growth"], ["Connect", "Works with your email, calendar and chat tools.", "icon-link"]] }));
  tpl("museum-brochure", "Museum brochure", "brochure-trifold-letter", "brochure trifold museum gallery exhibition history culture visit", (W, H) => brochure({ W, H, look: "photo", c: "#9f1239", soft: "#ffe4e6",
    cover: { icon: "icon-flag", title: "City History Museum", sub: "Three thousand years in one visit", foot: "cityhistory.museum" },
    back: { icon: "icon-clock", title: "Opening hours", text: "Tuesday – Sunday\n10 am – 5 pm\nFree on Sundays" },
    flap: { title: "Plan your visit", text: "Audio guides in six languages, a café and a shop for gifts and books.", note: "" },
    inside: [["Ancient world", "Tools, coins and pottery from the first river towns.", "icon-globe"], ["The old port", "Ships, maps and stories of the traders who built the city.", "icon-flag"], ["Modern city", "Photos and films of the last hundred years.", "icon-camera"]] }));
  tpl("pet-care-brochure", "Pet care brochure", "brochure-trifold-a4", "brochure trifold pet care vet veterinary dog cat grooming", (W, H) => brochure({ W, H, look: "band", c: "#16a34a", soft: "#dcfce7",
    cover: { icon: "icon-heart", title: "Happy Paws Pet Care", sub: "Vets who love your pets", foot: "happypaws.vet" },
    back: { icon: "icon-call", title: "Book a visit", text: "+1 555 0118 900\nOpen 7 days\n24-hour emergency line" },
    flap: { title: "New pets", text: "Puppy and kitten packs with first vaccines, check-ups and a care guide.", note: "Pack from $49" },
    inside: [["Check-ups", "Yearly health checks, vaccines and friendly advice.", "icon-check-circle"], ["Grooming", "Baths, haircuts and nail trims for dogs and cats.", "icon-star"], ["Boarding", "Safe, clean rooms with daily walks while you are away.", "icon-home"]] }));

  /* ================= Posters ================= */
  tpl("typographic-poster", "Typographic poster", "poster-18x24", "poster typographic words bold type design minimal", (W, H) => [page("#f5f5f4", [
    flow(140, T("MAKE", 100, 0, W - 200, { size: 360, bold: true, color: INK, lh: 0.95 }), 0,
      T("THINGS", 100, 0, W - 200, { size: 360, bold: true, color: "#ea580c", lh: 0.95 }), 0,
      T("THAT", 100, 0, W - 200, { size: 360, bold: true, color: INK, lh: 0.95 }), 0,
      T("MATTER", 100, 0, W - 200, { size: 360, bold: true, color: INK, lh: 0.95, outline: { width: 6, color: INK } })),
    R(100, H - 260, W - 200, 4, INK, { name: "Line" }),
    T("Design week 2027 · talks, workshops, people", 100, H - 220, W - 200, { size: 56, color: INK }),
  ])]);
  tpl("infographic-poster", "Infographic poster", "poster-a2", "poster infographic facts statistics data chart awareness education", (W, H) => [page(WHITE, [
    R(0, 0, W, 420, "#0f766e", { name: "Header" }),
    flow(110, T("Water in numbers", 100, 0, W - 200, { size: 120, bold: true, color: WHITE }), 10, T("Small facts about something we use every day", 100, 0, W - 200, { size: 48, color: "#ccfbf1" })),
    ...[["71%", "of Earth is covered by water"], ["3%", "of all water is fresh"], ["150 L", "used per person each day"]].flatMap(([n, l], i) => [
      C(120 + i * 470, 560, 380, 380, ["#14b8a6", "#0ea5e9", "#f59e0b"][i], { name: "Fact circle" }),
      T(n, 120 + i * 470, 690, 380, { size: 110, bold: true, color: WHITE, align: "center" }),
      T(l, 100 + i * 470, 980, 420, { size: 44, color: INK, align: "center", lh: 1.3 }),
    ]),
    T("Where we use it at home", 100, 1220, W - 200, { size: 64, bold: true, color: INK }),
    ...[["Shower", 0.34], ["Toilet", 0.24], ["Laundry", 0.17], ["Kitchen", 0.13], ["Garden", 0.12]].flatMap(([n, v], i) => [
      T(n, 100, 1340 + i * 150, 320, { size: 48, color: INK }),
      R(440, 1340 + i * 150, (W - 640) * v / 0.34, 80, ["#0f766e", "#14b8a6", "#0ea5e9", "#38bdf8", "#f59e0b"][i], { radius: 16, name: "Bar" }),
      T(Math.round(v * 100) + "%", 460 + (W - 640) * v / 0.34, 1352 + i * 150, 160, { size: 44, bold: true, color: INK }),
    ]),
    T("Save water: turn off the tap while brushing.", 100, H - 160, W - 200, { size: 52, italic: true, color: "#0f766e", align: "center" }),
  ])]);
  tpl("quote-poster", "Quote poster", "poster-a3", "poster quote motivation inspiration wall office words", (W, H) => [page("#1e1b4b", [
    T("“", 100, 120, 400, { size: 400, family: "serif", color: "#f59e0b", lh: 1 }),
    T("The best way to learn something is to teach it to someone else.", 120, 600, W - 240, { size: 96, family: "serif", italic: true, color: WHITE, lh: 1.2 }),
    R(120, 1180, 160, 8, "#f59e0b", { name: "Line" }),
    T("Words for the classroom", 120, 1220, W - 240, { size: 48, color: "#c7d2fe" }),
    E("deco-stars", W - 340, H - 340, 240, { c1: "#f59e0b", c2: "#fde68a" }),
  ])]);
  tpl("film-night-poster", "Film premiere poster", "poster-18x24", "poster movie film premiere cinema night drama", (W, H) => [page("#030712", [
    F(0, 0, W, H * 0.68, { name: "Film still" }),
    R(0, H * 0.6, W, H * 0.08, "#030712", { op: 0.6, name: "Fade" }),
    flow(H * 0.69, T("THE LONG ROAD", 80, 0, W - 160, { size: 200, bold: true, color: WHITE, align: "center", lh: 1, ls: 6 }), 30,
      T("A story about finding your way home", 80, 0, W - 160, { size: 64, family: "serif", italic: true, color: "#fca5a5", align: "center" }), 60,
      T("IN CINEMAS 14 FEBRUARY", 80, 0, W - 160, { size: 72, bold: true, color: WHITE, align: "center", ls: 10 })),
    T("Directed by Nadia Khan · Starring Leo Hart, Ivy Moss · Music by Arlo Day", 80, H - 120, W - 160, { size: 34, color: "#9ca3af", align: "center" }),
  ])]);
  tpl("mega-sale-poster", "Mega sale poster", "poster-a2", "poster sale discount shop store offer big", (W, H) => [page("#dc2626", [
    E("deco-burst", W / 2 - 700, 300, 1400, { c1: "#fde047", c2: "#facc15", op: 0.9 }),
    T("MEGA", 0, 520, W, { size: 260, bold: true, color: "#dc2626", align: "center", lh: 1 }),
    T("SALE", 0, 790, W, { size: 330, bold: true, color: INK, align: "center", lh: 1 }),
    T("UP TO 70% OFF", 0, 1240, W, { size: 140, bold: true, color: WHITE, align: "center" }),
    T("This weekend only · all stores and online", 100, 1460, W - 200, { size: 64, color: "#fee2e2", align: "center" }),
    R(W / 2 - 500, H - 420, 1000, 180, "#fde047", { radius: 90, name: "Button" }),
    T("Shop now", W / 2 - 500, H - 372, 1000, { size: 84, bold: true, color: INK, align: "center" }),
  ])]);
  tpl("awareness-poster", "Health awareness poster", "poster-a3", "poster awareness health campaign wash hands public school", (W, H) => [page("#ecfeff", [
    R(0, 0, W, 300, "#0891b2", { name: "Header" }),
    T("Clean hands save lives", 80, 90, W - 160, { size: 96, bold: true, color: WHITE, align: "center" }),
    ...["Wet your hands", "Add soap", "Scrub 20 seconds", "Rinse well", "Dry with a clean towel"].flatMap((s, i) => [
      C(120, 400 + i * 200, 140, 140, i % 2 ? "#f59e0b" : "#0891b2", { name: "Step circle" }),
      T(String(i + 1), 120, 430 + i * 200, 140, { size: 72, bold: true, color: WHITE, align: "center" }),
      T(s, 310, 440 + i * 200, W - 400, { size: 60, color: INK }),
    ]),
    R(80, H - 260, W - 160, 160, "#cffafe", { radius: 30, name: "Note box" }),
    T("Before eating · after the toilet · after coughing", 80, H - 210, W - 160, { size: 44, bold: true, color: "#155e75", align: "center" }),
  ])]);
  tpl("startup-weekend-poster", "Startup event poster", "poster-18x24", "poster event startup weekend hackathon tech conference", (W, H) => [page("#0b1120", [
    ...[0, 1, 2, 3, 4].map((i) => R(-200 + i * 420, 200 + i * 60, 900, 40, ["#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"][i], { rot: -20, op: 0.85, name: "Stripe" })),
    flow(900, T("BUILD", 120, 0, W - 240, { size: 280, bold: true, color: WHITE, lh: 0.95 }), 0, T("SOMETHING", 120, 0, W - 240, { size: 200, bold: true, color: "#22d3ee", lh: 1 }), 0, T("IN 48 HOURS", 120, 0, W - 240, { size: 160, bold: true, color: WHITE, lh: 1 })),
    T("Startup weekend · 5 – 7 March · Innovation Hub", 120, H - 360, W - 240, { size: 64, color: "#cbd5e1" }),
    T("Free for students · sign up at buildweekend.events", 120, H - 240, W - 240, { size: 56, bold: true, color: "#fbbf24" }),
  ])]);

  /* ================= Labels ================= */
  tpl("olive-oil-label", "Olive oil label", "label-product-2x1", "label product olive oil bottle kitchen gourmet", (W, H) => [page("#f7fee7", [
    R(0, 0, W, 18, "#4d7c0f", { name: "Top band" }),
    E("icon-leaf", 8, 30, 30, { c1: "#4d7c0f" }),
    T("Extra Virgin", 44, 24, W - 50, { size: 10, color: "#3f6212", ls: 1 }),
    T("Olive Oil", 44, 38, W - 50, { size: 20, family: "serif", bold: true, color: "#365314" }),
    T("Cold pressed · 500 ml", 44, 66, W - 50, { size: 9, color: INK }),
  ])]);
  tpl("herbal-tea-round-label", "Herbal tea round label", "label-round-2in", "label round tea herbal jar tin organic", (W, H) => [page(WHITE, [
    C(0, 0, W, H, "#065f46", { name: "Circle" }),
    C(10, 10, W - 20, H - 20, "none", { stroke: "#a7f3d0", sw: 1.5, name: "Ring" }),
    E("icon-leaf", W / 2 - 18, 24, 36, { c1: "#a7f3d0" }),
    T("Chamomile", 16, 70, W - 32, { size: 22, family: "serif", italic: true, bold: true, color: WHITE, align: "center" }),
    T("HERBAL TEA", 16, 102, W - 32, { size: 12, bold: true, color: "#a7f3d0", align: "center", ls: 3 }),
    T("20 bags · caffeine free", 16, 136, W - 32, { size: 9.5, color: "#d1fae5", align: "center" }),
  ])]);
  tpl("cookies-round-label", "Cookie jar round label", "label-round-2in", "label round cookies bakery treats homemade gift jar", (W, H) => [page(WHITE, [
    C(0, 0, W, H, "#fde68a", { name: "Circle" }),
    S("star", 10, 10, W - 20, H - 20, "#fbbf24", { points: 12, name: "Scallop" }),
    C(30, 30, W - 60, H - 60, "#fffbeb", { name: "Centre" }),
    T("Grandma's", 30, 60, W - 60, { size: 13, family: "serif", italic: true, color: "#92400e", align: "center" }),
    T("COOKIES", 30, 80, W - 60, { size: 20, bold: true, color: "#78350f", align: "center", ls: 1 }),
    T("Baked with love", 30, 110, W - 60, { size: 9.5, color: "#92400e", align: "center" }),
  ])]);
  tpl("standard-shipping-label", "Standard shipping label", "label-shipping-4x6", "label shipping parcel courier address barcode delivery", (W, H) => [page(WHITE, [
    R(14, 14, W - 28, H - 28, "none", { stroke: INK, sw: 2, name: "Border" }),
    T("FROM", 28, 28, 120, { size: 11, bold: true, color: MUTED, ls: 2 }),
    T("North Pine Goods\n9 Forest Road, Elmwood 30211", 28, 44, W - 56, { size: 12, color: INK, lh: 1.35 }),
    R(14, 92, W - 28, 2, INK, { name: "Divider" }),
    T("SHIP TO", 28, 108, 140, { size: 13, bold: true, color: INK, ls: 2 }),
    T("Priya Shah\n88 Harbor Avenue, Apt 4\nBayside 60412", 28, 132, W - 56, { size: 21, bold: true, color: INK, lh: 1.35 }),
    R(14, 240, W - 28, 2, INK, { name: "Divider" }),
    ...Array.from({ length: 30 }, (_, i) => R(40 + i * 10.2, 268, [3, 6, 2, 4][i % 4], 120, INK, { name: "Bar" })),
    T("1Z 482 0091 3377 2105", 28, 396, W - 56, { size: 14, family: "mono", color: INK, align: "center" }),
    R(14, 430, W - 28, 2, INK, { name: "Divider" }),
    T("STANDARD", 28, 448, 200, { size: 28, bold: true, color: INK }),
    T("Weight 1.2 kg · 1 of 1", 28, 490, W - 56, { size: 13, color: INK }),
  ])]);
  tpl("return-address-label", "Return address label", "label-product-2x1", "label return address mail envelope small", (W, H) => [page("#eff6ff", [
    E("icon-home", 8, 24, 36, { c1: "#1d4ed8" }),
    T("The Garcia Family", 52, 18, W - 58, { size: 13, bold: true, color: "#1e3a8a" }),
    T("212 Sunset Boulevard\nLakewood, CO 80226", 52, 40, W - 58, { size: 9.5, color: INK, lh: 1.35 }),
  ])]);
  tpl("spice-blend-label", "Spice blend label", "label-product-2x1", "label product spice blend kitchen jar food homemade", (W, H) => [page("#7c2d12", [
    R(6, 6, W - 12, H - 12, "none", { stroke: "#fdba74", sw: 1, radius: 4, name: "Border" }),
    T("SMOKY", 14, 14, W - 28, { size: 11, bold: true, color: "#fdba74", align: "center", ls: 4 }),
    T("BBQ Rub", 14, 30, W - 28, { size: 22, family: "serif", bold: true, color: WHITE, align: "center" }),
    T("Paprika · garlic · brown sugar · 80 g", 14, 64, W - 28, { size: 8, color: "#fed7aa", align: "center" }),
  ])]);
  tpl("priority-shipping-label", "Priority shipping label", "label-shipping-4x6", "label shipping priority express parcel courier urgent", (W, H) => [page(WHITE, [
    R(0, 0, W, 110, INK, { name: "Header" }),
    T("P", 20, 14, 80, { size: 76, bold: true, color: WHITE, align: "center" }),
    T("PRIORITY\nEXPRESS", 110, 22, W - 130, { size: 28, bold: true, color: WHITE, lh: 1.05 }),
    T("DELIVER BY: NEXT DAY", 20, 126, W - 40, { size: 16, bold: true, color: "#dc2626" }),
    T("TO", 20, 166, 60, { size: 12, bold: true, color: MUTED, ls: 2 }),
    T("Marco Rossi\nRossi Auto Parts\n17 Mill Street, Unit 2\nRiverton 70119", 20, 186, W - 40, { size: 20, bold: true, color: INK, lh: 1.35 }),
    R(20, 330, W - 40, 150, "#f1f5f9", { radius: 8, name: "Code area" }),
    ...Array.from({ length: 26 }, (_, i) => R(36 + i * 12, 350, [5, 2, 3, 7][i % 4], 90, INK, { name: "Bar" })),
    T("EX 7731 0490 22 US", 20, 448, W - 40, { size: 13, family: "mono", color: INK, align: "center" }),
    T("FROM: Bolt Supply Co · 3 Iron Way, Steelton", 20, H - 70, W - 40, { size: 12, color: INK }),
  ])]);
}
