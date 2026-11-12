// AsaanDesk Docs: a third set of hand-designed base layouts (timeline grid, comparison, SWOT grid, journal, contract,
// receipt, event programme, sign-up sheet, book report, meal planner). Own text; P = palette, T = content theme.
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
const doc = (title, blocks) => normalizeDoc({ ...newDoc(title), blocks });
const hero = (band, ...parts) => ({ type: "h1", pad: 26, minh: 130, ...band, runs: cleanRuns(lines2(...parts)) });
const F = (P) => (P.font ? { font: P.font } : {});
const H = (P, level, text, extra = {}) => ({ type: "h" + level, runs: cleanRuns(look(text, { color: P.dark, ...F(P) })), ...extra });
const band = (P, text, deco, dark = false, level = 2) => ({ type: "h" + level, pad: 10, bg: dark ? P.dark : P.light, deco, dc: dark ? P.light : P.dark, dc2: dark ? P.cream : P.mid, runs: cleanRuns(look(text, { color: dark ? P.cream : P.ink, ...F(P) })) });
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const cell = (P, title, body) => [{ text: title, b: true, color: P.dark }, { text: "\n" + body }];

export const LAYOUT_BUILDERS_3 = {
  "timeline-grid": (P, T) => doc(`${T.project} timeline`, [
    hero({ bg: P.dark, deco: "steps", dc: P.light, dc2: P.mid }, look("Project Timeline", { color: P.cream, size: 34, ...F(P) }), look(`${cap(T.project)} · ${T.org}`, { color: P.light, size: 12 })),
    p(`Six months from first idea to launch. Filled squares show when each task happens.`),
    table([["Task", "Jan", "Feb", "Mar", "Apr", "May", "Jun"], ["Plan and budget", "■", "■", "", "", "", ""], [T.steps[1], "", "■", "■", "■", "", ""], ["Testing", "", "", "", "■", "■", ""], [T.steps[2], "", "", "", "", "■", "■"]], { accent: P.light }),
    band(P, "Owners", "dots"),
    table([["Task", "Owner"], ["Plan and budget", T.person], [T.steps[1], T.person2], ["Testing", T.person3]], { tstyle: "lines" }),
    H(P, 2, "Key dates"), ...ul(["Budget signed off: 31 January", "Testing starts: 1 April", "Launch: 15 June"]),
  ]),
  comparison: (P, T) => doc("Options compared", [
    hero({ bg: P.light, deco: "diamonds", dc: P.dark, dc2: P.mid }, look("Which option is best?", { color: P.ink, size: 30, ...F(P) }), look(`${cap(T.project)} · decision paper`, { color: P.dark, size: 12 })),
    H(P, 2, "The question"), p(`${T.org} needs to choose how to run the ${T.project}. Here are three options side by side.`),
    table([["", "Option A · Do it ourselves", "Option B · Partner", "Option C · Wait a year"], ["Cost", "Medium", "Low", "None now"], ["Speed", "6 months", "3 months", "—"], ["Control", "Full", "Shared", "Full"], ["Risk", "Medium", "Low", "High"]], { accent: P.light }),
    band(P, "Recommendation", "diamonds", true), p(`**Option B.** A local ${T.partner} can help us launch quickly and at low cost.`),
  ]),
  swot: (P, T) => doc("SWOT analysis", [
    hero({ bg: P.dark, deco: "circles", dc: P.mid, dc2: P.light }, look("SWOT Analysis", { color: P.cream, size: 34, ...F(P) }), look(T.org, { color: P.light, size: 13 })),
    p(`A quick look at where ${T.org} stands before the ${T.project}.`),
    table([["Strengths", "Weaknesses"], [cell(P, "Inside, helpful", `Loyal ${T.audience}\nA skilled team\nGood location in ${T.city}`), cell(P, "Inside, harmful", "Too much paperwork\nSmall marketing budget")]], { accent: P.light }),
    table([["Opportunities", "Threats"], [cell(P, "Outside, helpful", `Growing demand for ${T.offer}\nCheaper online tools`), cell(P, "Outside, harmful", "New competitors\nRising costs")]], { accent: P.light }),
    H(P, 2, "What we will do"), ...ul(T.goals, "number"),
  ]),
  journal: (P, T) => doc("Daily journal", [
    band(P, "Wednesday · 12 November", "sun", false, 1),
    H(P, 2, "Today I am grateful for"), ...checks([["A good night's sleep", true], ["Help from a friend", false], ["Time to read", false]]),
    H(P, 2, "Top three tasks"), ...ul([T.steps[0], `Call ${T.person2.split(" ")[0]}`, "30 minutes of exercise"], "number"),
    H(P, 2, "Notes"), p("What went well today? What would I do differently?"),
    hr(), quote("Small steps every day add up to big results."),
  ]),
  contract: (P, T) => doc("Service agreement", [
    { type: "h1", align: "center", runs: cleanRuns(look("SERVICE AGREEMENT", { color: P.dark, size: 26, ...F(P) })) },
    p(`Agreement number SA-2026-041 · ${T.city}`, { align: "center" }), hr(),
    table([["Provider", "Client"], [cell(P, T.org, `${T.city}\n${T.email}`), cell(P, T.person2, `${T.city}\nclient@example.com`)]], { tstyle: "lines" }),
    H(P, 3, "1. Services"), p(`The provider will deliver ${T.offer} as described in the attached plan.`, { align: "justify" }),
    H(P, 3, "2. Payment"), p("The client pays PKR 45,000: half on signing, half on completion.", { align: "justify" }),
    H(P, 3, "3. Term and ending"), p("This agreement runs for six months. Either side may end it with 14 days' written notice.", { align: "justify" }),
    table([["Signed for the provider", "Signed for the client"], [`${T.person}\nDate:`, `${T.person2}\nDate:`]], { tstyle: "lines" }),
  ]),
  receipt: (P, T) => doc(`${T.short} receipt`, [
    { type: "h1", align: "center", pad: 14, bg: P.light, runs: cleanRuns(lines2(look(T.org, { color: P.ink, size: 24, ...F(P) }), look(`${T.city} · ${T.email}`, { color: P.dark, size: 10 }))) },
    p("**RECEIPT** No. R-00872", { align: "center" }), p("12 November 2026, 4:35 pm", { align: "center" }), hr(),
    table([["Item", "Qty", "Amount (PKR)"], [cap(T.offer), "1", "2,500"], ["Extra service", "2", "1,000"], ["**Total paid**", "", "**3,500**"]], { tstyle: "lines" }),
    p("Paid by card. Thank you!", { align: "center" }),
    p(`Keep this receipt for returns within 7 days. ${T.tagline}.`, { align: "center" }),
  ]),
  "event-program": (P, T) => doc(`${T.event} programme`, [
    hero({ bg: P.dark, deco: "confetti", dc: P.light, dc2: P.mid, align: "center" }, look(cap(T.event), { color: P.cream, size: 32, ...F(P) }), look(`Programme · Saturday 6 December · ${T.city}`, { color: P.light, size: 12 })),
    table([["Time", "What", "Who"], ["10:00", "Welcome and opening words", T.person], ["10:30", "Talk: what's new this year", T.person2], ["12:00", "Lunch", "Everyone"], ["14:00", "Workshops", T.person3], ["16:00", "Thank-yous and close", T.person]], { accent: P.light }),
    band(P, "Speakers", "dots"),
    ...ul([`**${T.person}**, ${T.role}, ${T.org}`, `**${T.person2}**, guest speaker`, `**${T.person3}**, workshop lead`]),
    p("Wi-Fi: Guest · Password on your badge", { align: "center" }),
  ]),
  "signup-sheet": (P, T) => doc("Sign-up sheet", [
    hero({ bg: P.light, deco: "confetti", dc: P.dark, dc2: P.mid, minh: 110 }, look("Volunteer Sign-up", { color: P.ink, size: 30, ...F(P) }), look(`${cap(T.event)} · ${T.org}`, { color: P.dark, size: 12 })),
    p("Write your name next to a time slot. Thank you for helping!"),
    table([["Time slot", "Task", "Name", "Phone"], ["8:00 to 10:00", "Set up", "", ""], ["10:00 to 12:00", "Welcome desk", "", ""], ["12:00 to 14:00", "Food and drinks", "", ""], ["14:00 to 16:00", "Clean up", "", ""]], { accent: P.light }),
    H(P, 3, "What to bring"), ...ul(["Comfortable shoes", "A water bottle", "A smile"]),
    H(P, 3, "Questions?"), p(`Contact ${T.person} at ${T.email}.`),
  ]),
  "book-report": (P, T) => doc("Book report", [
    hero({ bg: P.dark, deco: "leaves", dc: P.light, dc2: P.mid, minh: 120 }, look("Book Report", { color: P.cream, size: 34, font: "serif" }), look(`By ${T.person3} · ${T.org}`, { color: P.light, size: 12 })),
    table([["Title", "Author", "Pages", "My rating"], ["The River Keeper (example)", "A. Writer", "214", "★★★★☆"]], { tstyle: "lines" }),
    H(P, 2, "What happens"), p("A young girl looks after an old boat on a busy river and learns that small acts of care can change a whole town.", { align: "justify" }),
    H(P, 2, "Favourite part"), quote("“The river remembers everyone who is kind to it.”"),
    H(P, 2, "Would I recommend it?"), p("Yes, for anyone aged 10 and up who likes adventure and friendship."),
  ]),
  "meal-planner": (P, T) => doc("Meal planner", [
    hero({ bg: P.light, deco: "sun", dc: P.mid, dc2: P.dark, minh: 110 }, look("Weekly Meal Plan", { color: P.ink, size: 32, ...F(P) }), look(`Week of 17 November · ${T.person}`, { color: P.dark, size: 12 })),
    table([["Day", "Breakfast", "Lunch", "Dinner"], ["Monday", "Oats and fruit", "Lentil soup", "Chicken and rice"], ["Tuesday", "Eggs and toast", "Chickpea salad", "Vegetable curry"], ["Wednesday", "Yogurt and honey", "Wraps", "Fish and greens"], ["Thursday", "Paratha and tea", "Rice and beans", "Pasta"], ["Friday", "Fruit smoothie", "Leftovers", "Biryani"]], { accent: P.light }),
    band(P, "Shopping list", "dots"), ...checks([["Oats, rice, lentils", false], ["Fruit and vegetables", false], ["Chicken and fish", false], ["Milk and yogurt", false]]),
  ]),
};
