// AsaanDesk Docs: a seventh set of hand-designed base layouts (property listing, meal plan, workshop handout, product
// catalogue, donation receipt, shift schedule, pitch one-sheet, release notes, daily planner, trip budget).
// Own text and artwork; P = palette, T = content theme.
import { mdInline, cleanRuns, normalizeDoc, newDoc } from "./model.js";
import { CHARTS, svgDataUrl } from "./decos.js";

const runs = (md) => cleanRuns(mdInline(md));
const look = (md, st = {}) => runs(md).map((r) => ({ ...r, ...st }));
const lines2 = (...parts) => parts.flatMap((x, i) => (i ? [{ text: "\n" }, ...x] : x));
const p = (md = "", props = {}) => ({ type: "p", runs: runs(md), ...props });
const li = (md, list = "bullet", props = {}) => ({ type: "li", list, level: 0, runs: runs(md), ...props });
const ul = (items, list = "bullet") => items.map((x) => li(x, list));
const checks = (items) => items.map(([md, done]) => li(md, "check", { checked: !!done }));
const table = (rows, extra = {}) => ({ type: "table", header: true, rows: rows.map((r) => r.map((c) => (Array.isArray(c) ? { runs: cleanRuns(c) } : { runs: runs(String(c)) }))), ...extra });
const quote = (md) => ({ type: "quote", runs: runs(md) });
const hr = () => ({ type: "hr" });
const img = (svg, w) => ({ type: "image", src: svgDataUrl(svg), alt: "", w, align: "center" });
const doc = (title, blocks) => normalizeDoc({ ...newDoc(title), blocks });
const hero = (band, ...parts) => ({ type: "h1", pad: 26, minh: 130, ...band, runs: cleanRuns(lines2(...parts)) });
const F = (P) => (P.font ? { font: P.font } : {});
const H = (P, level, text, extra = {}) => ({ type: "h" + level, runs: cleanRuns(look(text, { color: P.dark, ...F(P) })), ...extra });
const band = (P, text, deco, dark = false, level = 2) => ({ type: "h" + level, pad: 10, bg: dark ? P.dark : P.light, deco, dc: dark ? P.light : P.dark, dc2: dark ? P.cream : P.mid, runs: cleanRuns(look(text, { color: dark ? P.cream : P.ink, ...F(P) })) });
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const M = (T, i) => T.metrics[i];
const big = (P, n, label) => [{ text: n, b: true, size: 24, color: P.dark }, { text: "\n" + label, color: "#475569" }];
// Own illustration: a simple house.
const house = (P) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 220"><rect width="480" height="220" rx="12" fill="${P.light}"/><rect x="0" y="176" width="480" height="44" fill="${P.mid}" opacity=".5"/><polygon points="150,96 240,36 330,96" fill="${P.dark}"/><rect x="164" y="96" width="152" height="84" fill="#ffffff"/><rect x="226" y="128" width="28" height="52" fill="${P.mid}"/><rect x="178" y="110" width="32" height="26" fill="${P.light}"/><rect x="270" y="110" width="32" height="26" fill="${P.light}"/><circle cx="400" cy="60" r="22" fill="${P.mid}"/></svg>`;

export const LAYOUT_BUILDERS_7 = {
  "property-listing": (P, T) => doc("Property listing", [
    band(P, "FOR SALE · Two-bedroom apartment", "dots", true, 1),
    img(house(P), 460),
    table([["Price", "Bedrooms", "Bathrooms", "Area"], [[{ text: "PKR 18.5M", b: true, size: 18, color: P.dark }], [{ text: "2", b: true, size: 18, color: P.dark }], [{ text: "2", b: true, size: 18, color: P.dark }], [{ text: "1,150 sq ft", b: true, size: 18, color: P.dark }]]], { tstyle: "lines" }),
    H(P, 2, "About the home"), p(`A bright, quiet apartment on the third floor in ${T.city}, five minutes from schools and shops. Lift, parking and backup power.`, { align: "justify" }),
    H(P, 2, "Features"), ...checks([["Open kitchen with storage", true], ["Balcony facing the park", true], ["Covered parking", true], ["24-hour security", true]]),
    band(P, `Viewings: ${T.person} · +92 300 0000000`, "arc"),
  ]),
  "meal-plan-nutrition": (P, T) => doc("Nutrition plan", [
    hero({ bg: P.light, deco: "leaves", dc: P.dark, dc2: P.mid, minh: 110, pad: 20 }, look("7-Day Nutrition Plan", { color: P.ink, size: 30, ...F(P) }), look(`Prepared for ${T.person3} · About 2,000 kcal a day`, { color: P.dark, size: 12 })),
    table([["", "Breakfast", "Lunch", "Snack", "Dinner"], ["Mon", "Oats, banana", "Lentils, rice", "Yogurt", "Grilled chicken, salad"], ["Tue", "Eggs, toast", "Chickpea wrap", "Apple", "Fish, vegetables"], ["Wed", "Smoothie", "Vegetable curry", "Nuts", "Daal, roti"]], { accent: P.light }),
    H(P, 2, "Daily goals"), ...checks([["8 glasses of water", false], ["5 portions of fruit and vegetables", false], ["30 minutes of walking", false]]),
    quote("Check with a doctor before big changes to your diet."),
  ]),
  "workshop-handout": (P, T) => doc("Workshop handout", [
    hero({ bg: P.dark, deco: "steps", dc: P.light, dc2: P.mid, minh: 120 }, look(`Workshop: better ${T.offer}`, { color: P.cream, size: 30, ...F(P) }), look(`${T.org} · 90 minutes · Handout`, { color: P.light, size: 12 })),
    H(P, 2, "Key ideas"), ...ul(["Start with what the customer needs", "Write steps down, then simplify them", "Measure one thing at a time"], "number"),
    { type: "p", pad: 14, bd: 2, bc: P.mid, rad: 10, runs: cleanRuns([{ text: "Exercise · 10 minutes", b: true, color: P.dark }, { text: "\nList the three steps a new customer goes through. Circle the one that takes longest. How could it be shorter?" }]) },
    H(P, 2, "Your notes"), hr(), hr(), hr(),
    p(`Slides and extra reading: ${T.email}`),
  ]),
  "product-catalog": (P, T) => doc("Product catalogue", [
    { type: "h1", align: "center", pad: 24, minh: 120, bg: P.light, deco: "confetti", dc: P.dark, dc2: P.mid, runs: cleanRuns(lines2(look(`${T.short} Catalogue`, { color: P.ink, size: 32, ...F(P) }), look("Winter 2026 · Prices in PKR", { color: P.dark, size: 12 }))) },
    table([["Item", "What it is", "Price"], [[{ text: "Starter pack", b: true, color: P.dark }], "Everything you need to begin", "2,500"], [[{ text: "Plus pack", b: true, color: P.dark }], "More time, more extras", "4,000"], [[{ text: "Family pack", b: true, color: P.dark }], "For four or more people", "9,000"], [[{ text: "Gift card", b: true, color: P.dark }], "Any amount from 1,000", "—"]], { accent: P.light }),
    band(P, "How to order", "dots"), ...ul([`Call or message +92 300 0000000`, `Email ${T.email}`, `Visit us in ${T.city}`], "number"),
    p("Prices include tax. Free delivery over PKR 5,000.", { align: "center" }),
  ]),
  "donation-receipt": (P, T) => doc("Donation receipt", [
    { type: "h2", pad: 14, bg: P.dark, deco: "flower", dc: P.light, dc2: P.mid, runs: cleanRuns(lines2(look(T.org, { color: P.cream, ...F(P) }), look("Thank you for your gift", { color: P.light, size: 11 }))) },
    p("12 November 2026", { align: "right" }),
    p(`Dear ${T.person2.split(" ")[0]},`),
    p(`Thank you for your generous donation. It helps us keep ${T.offer} going for ${T.audience} in ${T.city}.`, { align: "justify" }),
    table([["Receipt no.", "Date", "Amount (PKR)", "Paid by"], ["D-2026-0412", "10 November 2026", "25,000", "Bank transfer"]], { accent: P.light }),
    p("With gratitude,"), p(`**${T.person}**`), p(`${T.role}, ${T.org}`),
  ]),
  "shift-schedule": (P, T) => doc("Shift schedule", [
    band(P, `Shift schedule · Week of 17 November`, "steps", true, 1),
    table([["Shift", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], ["Morning 8 to 2", T.person, T.person2, T.person, T.person3, T.person2, T.person], ["Evening 2 to 8", T.person3, T.person, T.person2, T.person, T.person3, T.person2]], { accent: P.light }),
    H(P, 2, "Rules"), ...ul(["Swap shifts only with a team member, then tell the manager", "Arrive 10 minutes early", "Sign in and out at the desk"]),
    p(`Questions: ${T.person} · ${T.email}`),
  ]),
  "pitch-one-sheet": (P, T) => doc("Pitch one-sheet", [
    hero({ bg: P.dark, deco: "petals", dc: P.mid, dc2: P.light, minh: 140 }, look(T.org, { color: P.cream, size: 34, ...F(P) }), look(T.tagline, { color: P.light, size: 14, i: true })),
    table([["Problem", "Our solution"], [`${cap(T.audience)} waste hours on calls and paper forms.`, `${cap(T.product)}: simple, fast, works on any phone.`]], { accent: P.light }),
    table([[M(T, 0)[0], M(T, 1)[0], M(T, 2)[0]], T.metrics.map((m) => big(P, m[2], `from ${m[1]}`))], { tstyle: "lines" }),
    H(P, 2, "Why now"), p(`Demand for ${T.offer} in ${T.city} grew every month this year.`),
    band(P, "The ask", "diamonds"), p(`We are raising PKR 25 million to open in three more cities. ${T.person}, ${T.role} · ${T.email}`),
  ]),
  "release-notes": (P, T) => doc("Release notes", [
    band(P, `${T.product} · Release notes · Version 2.4`, "dots", true, 1),
    p("*Released 12 November 2026*"),
    H(P, 2, "✨ New"), ...ul(["Reminders a day before every booking", "Dark mode"]),
    H(P, 2, "⚡ Improved"), ...ul(["Sign-up is 40% faster", "Clearer error messages"]),
    H(P, 2, "🐞 Fixed"), ...ul(["Dates showed in the wrong format on some phones", "The search box lost its text after going back"]),
    p(`Feedback? ${T.email}`),
  ]),
  "daily-planner": (P, T) => doc("Daily planner", [
    hero({ bg: P.light, deco: "sun", dc: P.mid, dc2: P.dark, minh: 100, pad: 20 }, look("Today", { color: P.ink, size: 34, ...F(P) }), look(`Wednesday 12 November · ${T.person}`, { color: P.dark, size: 12 })),
    table([["Top 3", "Schedule"], [[{ text: `1. ${T.steps[0]}\n2. Call ${T.person2.split(" ")[0]}\n3. 30-minute walk` }], [{ text: "08:00 Plan the day\n10:00 Team meeting\n13:00 Lunch\n15:00 Deep work\n17:30 Review" }]]], { accent: P.light }),
    H(P, 3, "To do"), ...checks([["Reply to emails", false], ["Pay the electricity bill", false], ["Buy groceries", false]]),
    H(P, 3, "Notes"), hr(), hr(),
  ]),
  "trip-budget": (P, T) => doc("Trip budget", [
    hero({ bg: P.dark, deco: "waves", dc: P.light, dc2: P.mid, minh: 120 }, look("Trip Budget", { color: P.cream, size: 32, ...F(P) }), look("Northern areas · 5 days · 4 people", { color: P.light, size: 12 })),
    table([["Category", "Plan (PKR)", "Spent (PKR)"], ["Transport", "60,000", "58,500"], ["Stay", "80,000", "82,000"], ["Food", "40,000", "31,200"], ["Activities", "20,000", "14,000"], ["**Total**", "**200,000**", "**185,700**"]], { accent: P.light }),
    img(CHARTS.pie.svg(P.dark), 380),
    band(P, "Per person: PKR 46,425", "steps"),
    H(P, 3, "Money tips"), ...ul(["Carry some cash for small hotels and tea stalls", "Book the jeep a day ahead"]),
    p("Keep receipts in the shared folder."),
  ]),
};
