// AsaanDesk Docs: more hand-designed base layouts (different structures: sidebar / timeline / minimal resumes, pricing
// proposals, action tables, stat blocks, brochure, checklists, letterhead, recipe, menu, FAQ, how-to, policy, roadmap, OKRs,
// syllabus, title-page report, two-column newsletter, price list). Own text; P = palette, T = content theme (gallery.js).
import { mdInline, cleanRuns, normalizeDoc, newDoc } from "./model.js";
import { STICKERS, svgDataUrl } from "./decos.js";

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
const hero = (band, ...parts) => ({ type: "h1", pad: 26, minh: 150, ...band, runs: cleanRuns(lines2(...parts)) });
const F = (P) => (P.font ? { font: P.font } : {});
const H = (P, level, text, extra = {}) => ({ type: "h" + level, runs: cleanRuns(look(text, { color: P.dark, ...F(P) })), ...extra });
const band = (P, text, deco, dark = false, level = 2) => ({ type: "h" + level, pad: 10, bg: dark ? P.dark : P.light, deco, dc: dark ? P.light : P.dark, dc2: dark ? P.cream : P.mid, runs: cleanRuns(look(text, { color: dark ? P.cream : P.ink, ...F(P) })) });
const sticker = (id, w = 90) => ({ type: "image", src: svgDataUrl(STICKERS[id].svg()), alt: "", w, align: "left" });
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const M = (T, i) => T.metrics[i];
const stat = (P, big, small) => [{ text: big, b: true, size: 24, color: P.dark }, { text: "\n" }, { text: small, color: "#475569" }];

export const LAYOUT_BUILDERS_2 = {
  "resume-sidebar": (P, T) => doc(`${T.person} resume`, [
    hero({ bg: P.light, deco: "avatar", dc: P.mid, dc2: P.cream, minh: 130, pad: 20 }, look(T.person, { color: P.ink, size: 30, ...F(P) }), look(T.role, { color: P.dark, size: 13 })),
    table([["Contact and skills", "Experience"], [[{ text: T.email }, { text: "\n+92 300 0000000\n" }, { text: T.city }, { text: "\n\nSkills", b: true }, { text: "\nPlanning\nTeam leadership\nClear writing" }], [{ text: `${T.role}, ${T.org}`, b: true }, { text: "\n2022 to now\n" }, { text: `Led the ${T.project}.` }, { text: `\n\nAssistant ${T.role.toLowerCase()}`, b: true }, { text: "\n2018 to 2022\n" }, { text: `Ran the ${T.offer}.` }]]], { accent: P.light }),
    H(P, 2, "Education"), p("Bachelor's degree, example university, 2018"),
    H(P, 2, "Languages"), p("English (fluent), Urdu (native)"),
  ]),
  "resume-timeline": (P, T) => doc(`${T.person} resume`, [
    hero({ bg: P.dark, deco: "steps", dc: P.light, dc2: P.mid, minh: 120, pad: 22 }, look(T.person, { color: P.cream, size: 30, ...F(P) }), look(`${T.role} · ${T.email}`, { color: P.light, size: 12 })),
    p(`I help ${T.audience} get great service. Calm, organised and kind under pressure.`, { align: "center" }),
    band(P, "Career timeline", "dots"),
    H(P, 3, "2022 → now · " + T.role), p(`${T.org}, ${T.city}. Grew ${M(T, 0)[0].toLowerCase()} from ${M(T, 0)[1]} to ${M(T, 0)[2]}.`),
    H(P, 3, "2019 → 2022 · Team lead"), p(`Ran the ${T.offer} for 40 ${T.audience} a day.`),
    H(P, 3, "2016 → 2019 · Assistant"), p("Learned the job from the ground up."),
    band(P, "Skills", "dots"), ...ul(["Planning and budgets", "Training new staff", "Customer care"]),
  ]),
  "resume-minimal": (P, T) => doc(`${T.person} CV`, [
    { type: "h1", align: "center", runs: cleanRuns(look(T.person.toUpperCase(), { color: P.ink, size: 26, ...F(P) })) },
    p(`${T.role} · ${T.city} · ${T.email}`, { align: "center" }), hr(),
    H(P, 3, "PROFILE"), p(`Experienced ${T.role.toLowerCase()} who keeps things simple and gets results for ${T.audience}.`), hr(),
    H(P, 3, "EXPERIENCE"), p(`**${T.org}**, ${T.role} · 2021 to now`), ...ul([`Led the ${T.project}`, `Improved ${M(T, 1)[0].toLowerCase()} to ${M(T, 1)[2]}`]), hr(),
    H(P, 3, "EDUCATION"), p("Bachelor's degree · 2016"), hr(),
    H(P, 3, "SKILLS"), p("Planning · Budgets · Writing · Team leadership"),
  ]),
  "pricing-proposal": (P, T) => doc(`${T.short} pricing proposal`, [
    hero({ bg: P.dark, deco: "diamonds", dc: P.light, minh: 140 }, look("Proposal & Pricing", { color: P.cream, size: 34, ...F(P) }), look(`${cap(T.offer)} · prepared by ${T.org}`, { color: P.light, size: 12 })),
    H(P, 2, "What you get"), p(`Everything you need for ${T.offer}, from the first meeting to the final check.`),
    band(P, "Packages", "steps"),
    table([["", "Basic", "Standard", "Premium"], ["Price (PKR)", "25,000", "45,000", "80,000"], ["Planning call", "✓", "✓", "✓"], ["Monthly report", "—", "✓", "✓"], ["Priority support", "—", "—", "✓"]], { accent: P.light }),
    H(P, 2, "Terms"), ...ul(["50% to start, 50% on delivery", "Prices valid for 30 days", "Cancel any time with 2 weeks' notice"]),
    H(P, 2, "Accept"), table([["Client name", "Signature", "Date"], ["", "", ""]], { tstyle: "lines" }),
  ]),
  "action-minutes": (P, T) => doc(`${T.short} meeting minutes`, [
    band(P, "MEETING MINUTES", "dots", true, 1),
    table([["Date", "Time", "Chair", "Minutes by"], ["12 November 2026", "10:00", T.person, T.person3]], { tstyle: "lines" }),
    H(P, 2, "Discussion"), ...ul([`Update on the ${T.project}`, `${cap(T.event)}: dates and budget`, "Any other business"], "number"),
    band(P, "Action items", "steps"),
    table([["Owner", "Task", "Due", "Status"], [T.person, T.steps[0], "15 Nov", "Open"], [T.person2, T.steps[1], "22 Nov", "Open"], [T.person3, "Share these minutes", "12 Nov", "Done"]], { accent: P.light }),
    H(P, 2, "Next meeting"), p("Tuesday 19 November, 10:00."),
  ]),
  "stats-case-study": (P, T) => doc(`${T.short} results`, [
    hero({ bg: P.dark, deco: "circles", dc: P.mid, dc2: P.light, minh: 150 }, look("Results that speak", { color: P.cream, size: 34, ...F(P) }), look(`A case study with ${T.org}`, { color: P.light, size: 13 })),
    table([[M(T, 0)[0], M(T, 1)[0], M(T, 2)[0]], T.metrics.map((m) => stat(P, m[2], `from ${m[1]}`))], { accent: P.light }),
    H(P, 2, "The story"), p(`${T.org} wanted better ${M(T, 0)[0].toLowerCase()} without hiring more people. In six months, small changes made a big difference.`),
    H(P, 2, "What we changed"), ...ul(T.steps, "number"),
    quote(`“Our ${T.audience} noticed the difference in the first month.” ${T.person}`),
  ]),
  brochure: (P, T) => doc(`${T.short} brochure`, [
    hero({ bg: P.dark, deco: "petals", dc: P.mid, dc2: P.light, minh: 190 }, look(T.org, { color: P.cream, size: 36, ...F(P) }), look(T.tagline, { color: P.light, size: 15, i: true })),
    p(`Welcome to ${T.org} in ${T.city}. Here is what we can do for you.`, { align: "center" }),
    band(P, `${cap(T.offer)}`, "sun"), sticker("check", 70), p(`Our most popular service for ${T.audience}.`),
    band(P, `${cap(T.project)}`, "leaves"), sticker("sparkle", 70), p("New this year, built with feedback from people like you."),
    band(P, cap(T.event), "confetti"), sticker("badge", 70), p("Join us. Everyone is welcome."),
    table([["Visit us", "Call us", "Write to us"], [T.city, "+92 300 0000000", T.email]], { accent: P.light }),
  ]),
  "launch-checklist": (P, T) => doc(`${T.project} checklist`, [
    hero({ bg: P.light, deco: "steps", dc: P.dark, dc2: P.mid, minh: 120 }, look("Launch Checklist", { color: P.ink, size: 34, ...F(P) }), look(cap(T.project), { color: P.dark, size: 13 })),
    H(P, 3, "Four weeks before"), ...checks([["Agree the budget", true], ["Choose the launch date", true], ["Book people and space", false]]),
    H(P, 3, "Two weeks before"), ...checks([[`Tell ${T.audience}`, false], ["Print signs and flyers", false], ["Test everything once", false]]),
    H(P, 3, "Launch day"), ...checks([["Arrive one hour early", false], ["Take photos", false], ["Say thank you", false]]),
    H(P, 3, "After launch"), ...checks([["Collect feedback", false], ["Share the results", false]]),
  ]),
  letterhead: (P, T) => doc(`${T.short} letter`, [
    { type: "h2", pad: 12, bg: P.dark, runs: cleanRuns([{ text: T.org, color: P.cream, ...F(P) }, { text: "\n" }, { text: `${T.city} · ${T.email} · +92 51 0000000`, color: P.light, size: 10 }]) },
    p("12 November 2026", { align: "right" }), p(""),
    p(T.person2), p(T.city), p(""),
    p(`**Subject: ${cap(T.project)}**`),
    p(`Dear ${T.person2.split(" ")[0]},`),
    p(`Thank you for your interest in our ${T.project}. We are happy to confirm that it will start in January, and we would like you to be part of it.`, { align: "justify" }),
    p("Please reply by 30 November so we can plan the first meeting.", { align: "justify" }),
    p(""), p("Yours sincerely,"), p(""), p(`**${T.person}**`), p(`${T.role}, ${T.org}`),
    hr(), p(`${T.org} · ${T.tagline}`, { align: "center" }),
  ]),
  "award-letter": (P, T) => doc("Certificate of appreciation", [
    hero({ bg: P.light, deco: "sun", dc: P.mid, dc2: P.dark, minh: 120, pad: 22, align: "center" }, look("Certificate of Appreciation", { color: P.ink, size: 30, ...F(P) })),
    p("This is proudly presented to", { align: "center" }),
    { type: "h1", align: "center", runs: cleanRuns(look(T.person2, { color: P.dark, size: 34, font: "serif", i: true })) },
    hr(),
    p(`for outstanding help with the ${T.event} at ${T.org}. Your time and care made a real difference.`, { align: "center" }),
    p(""), table([["Date", "Signed"], ["12 November 2026", `${T.person}, ${T.role}`]], { tstyle: "lines" }),
  ]),
  recipe: (P, T) => doc("Recipe card", [
    hero({ bg: P.dark, deco: "leaves", dc: P.light, dc2: P.mid, minh: 140 }, look("Golden Honey Cake", { color: P.cream, size: 34, ...F(P) }), look(`From the kitchen of ${T.org} · Serves 8 · 45 minutes`, { color: P.light, size: 12 })),
    band(P, "Ingredients", "dots"),
    ...checks([["2 cups flour", false], ["1 cup sugar", false], ["3 eggs", false], ["1/2 cup honey", false], ["1 cup warm milk", false]]),
    band(P, "Method", "dots"),
    ...ul(["Heat the oven to 180 °C and grease a tin.", "Beat the eggs and sugar until pale.", "Fold in the flour, honey and milk.", "Bake for 35 minutes, then cool."], "number"),
    quote("Tip: drizzle warm honey on top just before serving."),
  ]),
  menu: (P, T) => doc(`${T.short} menu`, [
    { type: "h1", align: "center", runs: cleanRuns(look(T.org, { color: P.dark, size: 34, font: "serif" })) },
    p(T.tagline, { align: "center" }), hr(),
    band(P, "Starters", "leaves"),
    table([["Dish", "Price (PKR)"], ["Lentil soup with lemon", "650"], ["Garden salad", "750"]], { tstyle: "lines" }),
    band(P, "Mains", "leaves"),
    table([["Dish", "Price (PKR)"], ["Chicken karahi", "1,850"], ["Vegetable biryani", "1,250"], ["Grilled fish", "2,200"]], { tstyle: "lines" }),
    band(P, "Desserts", "leaves"),
    table([["Dish", "Price (PKR)"], ["Kheer", "450"], ["Honey cake", "500"]], { tstyle: "lines" }),
    p("Please tell us about any allergies.", { align: "center" }),
  ]),
  faq: (P, T) => doc(`${T.short} FAQ`, [
    hero({ bg: P.dark, deco: "circles", dc: P.mid, dc2: P.light, minh: 130 }, look("Frequently Asked Questions", { color: P.cream, size: 30, ...F(P) }), look(T.org, { color: P.light, size: 13 })),
    H(P, 3, `What is the ${T.offer}?`), p(`It is our main service for ${T.audience}, run by a friendly, trained team.`),
    H(P, 3, "How do I book?"), p(`Call us, send an email to ${T.email}, or visit us in ${T.city}.`),
    H(P, 3, "How much does it cost?"), p("Prices start at PKR 2,500. Ask us for a full price list."),
    H(P, 3, "Can I change my booking?"), p("Yes, up to 24 hours before, free of charge."),
    band(P, "Still have a question?", "dots"), p(`Write to ${T.email}. We reply within one working day.`),
  ]),
  "how-to-guide": (P, T) => doc(`How to use the ${T.product}`, [
    hero({ bg: P.light, deco: "steps", dc: P.dark, dc2: P.mid, minh: 120 }, look(`How to use the ${T.product}`, { color: P.ink, size: 28, ...F(P) }), look(`A step-by-step guide from ${T.org}`, { color: P.dark, size: 12 })),
    p("Follow these steps. It takes about five minutes."),
    band(P, "Step 1 · Sign up", "dots", true, 3), p("Open the link we sent you and enter your name and phone number."),
    band(P, "Step 2 · Set it up", "dots", true, 3), p("Choose what you need and pick a time that suits you."),
    band(P, "Step 3 · Confirm", "dots", true, 3), p("Check the details and press Confirm. You will get a message straight away."),
    quote(`Tip: save ${T.email} in your contacts so our messages never go to spam.`),
  ]),
  policy: (P, T) => doc(`${T.short} policy`, [
    hero({ bg: P.dark, deco: "arc", dc: P.light, minh: 110, pad: 22 }, look("Health and Safety Policy", { color: P.cream, size: 28, ...F(P) }), look(`${T.org} · Version 2.0 · November 2026`, { color: P.light, size: 11 })),
    H(P, 2, "1. Purpose"), p(`This policy explains how ${T.org} keeps staff, ${T.audience} and visitors safe.`, { align: "justify" }),
    H(P, 2, "2. Scope"), p(`It applies to everyone who works at or visits ${T.org} in ${T.city}.`, { align: "justify" }),
    H(P, 2, "3. Responsibilities"), table([["Who", "Responsible for"], [T.person, "This policy and yearly review"], [T.person2, "Training and records"], ["Everyone", "Reporting hazards at once"]], { tstyle: "lines" }),
    H(P, 2, "4. Review"), p("We review this policy every year, or sooner if the law changes."),
    table([["Approved by", "Date"], [T.person, "12 November 2026"]], { tstyle: "lines" }),
  ]),
  roadmap: (P, T) => doc(`${T.short} roadmap`, [
    hero({ bg: P.dark, deco: "waves", dc: P.light, dc2: P.mid, minh: 140 }, look("2027 Roadmap", { color: P.cream, size: 36, ...F(P) }), look(T.org, { color: P.light, size: 13 })),
    p(`Where ${T.org} is heading next year, quarter by quarter.`),
    table([["Quarter", "Focus", "Lead", "Outcome"], ["Q1", cap(T.project), T.person, "Launched"], ["Q2", cap(T.offer), T.person2, `${M(T, 1)[0]} ${M(T, 1)[2]}`], ["Q3", T.product, T.person3, "In use"], ["Q4", cap(T.event), T.person, "500 guests"]], { accent: P.light }),
    band(P, "Milestones", "steps"), ...checks(T.goals.map((g) => [g, false])),
  ]),
  okrs: (P, T) => doc(`${T.short} goals`, [
    hero({ bg: P.light, deco: "circles", dc: P.dark, dc2: P.mid, minh: 120 }, look("Goals and Key Results", { color: P.ink, size: 30, ...F(P) }), look(`${T.org} · Next 6 months`, { color: P.dark, size: 12 })),
    band(P, `Objective 1 · ${T.goals[1]}`, "diamonds", true),
    table([["Key result", "Target", "Progress"], [M(T, 0)[0], M(T, 0)[2], "40%"], [M(T, 1)[0], M(T, 1)[2], "25%"]], { tstyle: "lines" }),
    band(P, `Objective 2 · ${T.goals[0]}`, "diamonds", true),
    table([["Key result", "Target", "Progress"], ["Plan agreed", "December", "Done"], ["First users", "100", "0%"]], { tstyle: "lines" }),
    band(P, `Objective 3 · ${T.goals[2]}`, "diamonds", true),
    table([["Key result", "Target", "Progress"], [M(T, 2)[0], M(T, 2)[2], "10%"]], { tstyle: "lines" }),
  ]),
  syllabus: (P, T) => doc("Course syllabus", [
    hero({ bg: P.dark, deco: "sun", dc: P.mid, dc2: P.light, minh: 130 }, look("Course Syllabus", { color: P.cream, size: 34, ...F(P) }), look(`${T.lesson} · ${T.org}`, { color: P.light, size: 13 })),
    table([["Teacher", "Classes", "Room"], [T.person, "Mon and Wed, 10:00", "Room 4"]], { tstyle: "lines" }),
    H(P, 2, "What you will learn"), ...ul(["The key ideas, step by step", "How to use them in real life", "How to explain them to others"]),
    band(P, "Weekly plan", "dots"),
    table([["Week", "Topic", "Homework"], ["1", "Introduction", "Read chapter 1"], ["2", "Practice", "Worksheet A"], ["3", "Project", "Group poster"], ["4", "Review and quiz", "None"]], { accent: P.light }),
    H(P, 2, "Grading"), table([["Part", "Weight"], ["Homework", "30%"], ["Project", "30%"], ["Quiz", "40%"]], { tstyle: "lines" }),
  ]),
  "title-page-report": (P, T) => doc(`${T.short} report`, [
    { type: "h1", pad: 30, minh: 300, bg: P.dark, deco: "leaves", dc: P.light, dc2: P.mid, runs: cleanRuns(lines2(look("REPORT", { color: P.light, size: 13 }), look(`${cap(T.project)}: what we learned`, { color: P.cream, size: 34, ...F(P) }), look(`${T.org} · November 2026`, { color: P.light, size: 12 }))) },
    { type: "pagebreak" },
    H(P, 2, "Contents"), ...ul(["Summary", "Findings", "Recommendations"], "number"),
    H(P, 2, "Summary"), p(`The ${T.project} reached its main goals. ${M(T, 0)[0]} went from ${M(T, 0)[1]} to ${M(T, 0)[2]}.`, { align: "justify" }),
    H(P, 2, "Findings"), table([["Measure", "Before", "After"], ...T.metrics], { accent: P.light }),
    H(P, 2, "Recommendations"), ...ul(T.goals, "number"),
  ]),
  "two-column-newsletter": (P, T) => doc(`${T.short} news`, [
    hero({ bg: P.light, deco: "confetti", dc: P.dark, dc2: P.mid, minh: 120 }, look(`${T.short} News`, { color: P.ink, size: 34, ...F(P) }), look("Monthly · November 2026", { color: P.dark, size: 12 })),
    table([["This month", "Coming up"], [[{ text: `Our ${T.project}`, b: true, color: P.dark }, { text: `\nWork has started and ${T.audience} can already see the first results.\n\n` }, { text: "Team news", b: true, color: P.dark }, { text: `\nWelcome to ${T.person3}, who joins as a new team member.` }], [{ text: cap(T.event), b: true, color: P.dark }, { text: `\nSaturday 6 December in ${T.city}. Everyone welcome.\n\n` }, { text: "Did you know?", b: true, color: P.dark }, { text: `\n${M(T, 2)[0]} is now ${M(T, 2)[2]}.` }]]], { accent: P.light }),
    band(P, "A word from the team", "dots"),
    quote(`“Thank you for being part of ${T.org}.” ${T.person}`),
    H(P, 2, "Dates for your diary"),
    table([["Date", "What"], ["20 November", "Open day"], ["6 December", cap(T.event)]], { tstyle: "lines" }),
    p(`Questions or ideas? Write to ${T.email}.`),
  ]),
  "price-list": (P, T) => doc(`${T.short} price list`, [
    hero({ bg: P.dark, deco: "diamonds", dc: P.light, minh: 110, pad: 22 }, look("Price List 2027", { color: P.cream, size: 32, ...F(P) }), look(`${T.org} · ${T.city}`, { color: P.light, size: 12 })),
    band(P, cap(T.offer), "dots"),
    table([["Item", "Details", "Price (PKR)"], ["Standard", "Our most popular choice", "2,500"], ["Plus", "More time and extras", "4,000"], ["Family / group", "For 4 or more people", "9,000"]], { accent: P.light }),
    band(P, "Extras", "dots"),
    table([["Item", "Price (PKR)"], ["Home visit", "1,500"], ["Express (same day)", "1,000"]], { tstyle: "lines" }),
    p("Prices include tax. Valid from 1 January 2027.", { align: "center" }),
  ]),
};
