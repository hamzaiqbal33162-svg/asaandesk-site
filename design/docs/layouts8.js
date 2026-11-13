// AsaanDesk Docs, round 5: eight more base layouts in Canva's Docs pattern (impact report, project plan, brand
// guidelines, employee handbook, business case, social media plan, project scope, content strategy). Each builds a real,
// editable document from an own palette P and content theme T; pro.js adds the photo header, KPI cards and footer.
import { mdInline, cleanRuns, normalizeDoc, newDoc } from "./model.js";
import { CHARTS, svgDataUrl } from "./decos.js";

const runs = (md) => cleanRuns(mdInline(md));
const look = (md, st = {}) => runs(md).map((r) => ({ ...r, ...st }));
const lines2 = (...parts) => parts.flatMap((x, i) => (i ? [{ text: "\n" }, ...x] : x));
const p = (md = "", props = {}) => ({ type: "p", runs: runs(md), ...props });
const li = (md, list = "bullet") => ({ type: "li", list, level: 0, runs: runs(md) });
const ul = (items, list = "bullet") => items.map((x) => li(x, list));
const checks = (items) => items.map(([md, done]) => ({ type: "li", list: "check", level: 0, checked: !!done, runs: runs(md) }));
const table = (rows, extra = {}) => ({ type: "table", header: true, rows: rows.map((r) => r.map((c) => ({ runs: runs(String(c)) }))), ...extra });
const cols = (cells, cw) => ({ type: "table", header: false, tstyle: "cols", cw, rows: [cells.map((md) => ({ runs: runs(md) }))] });
const img = (svgStr, w) => ({ type: "image", src: svgDataUrl(svgStr), alt: "", w, align: "center" });
const doc = (title, blocks) => normalizeDoc({ ...newDoc(title), blocks });
const hero = (P, title, sub) => ({ type: "h1", bg: P.dark, pad: 30, minh: 220, runs: cleanRuns(lines2(look(title, { color: "#ffffff", size: 40, b: true }), look(sub, { color: P.light, size: 14 }))) });
const H2 = (P, text) => ({ type: "h2", runs: cleanRuns(look(text, { color: P.dark, b: true })) });
const H3 = (P, text) => ({ type: "h3", runs: cleanRuns(look(text, { color: P.dark, b: true })) });
const callout = (P, md) => ({ type: "p", bg: P.light, rad: 12, pad: 16, runs: runs(md) });
const acc = (P) => ({ accent: P.dark });
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const M = (T, i) => T.metrics[i];

export const LAYOUT_BUILDERS_8 = {
  "impact-report": (P, T) => doc(`${T.short} impact report`, [
    hero(P, "Impact Report 2026", `${T.org} · ${T.city}`),
    p(`In 2026 ${T.org} reached more ${T.audience} than ever before. This report shows what changed, what it cost and what we will do next, so our partners can see the difference their support made.`),
    H2(P, "Our year in numbers"),
    table([["Measure", "2025", "2026", "Change"], ...T.metrics.map(([m, a, b]) => [m, a, b, "Up"])], acc(P)),
    img(CHARTS.bars.svg(P.dark), 440),
    H2(P, "Stories from the field"),
    cols([`**${T.project[0].toUpperCase() + T.project.slice(1)}**\nWe opened the ${T.project} in March. ${T.person2} and a team of six now run it every week.`, `**${cap(T.offer)}**\nThe ${T.offer} was used by twice as many ${T.audience} as we planned for the year.`], [50, 50]),
    callout(P, `“${T.tagline}. This year we proved it with real numbers.” **${T.person}, ${T.role}**`),
    H2(P, "Where the money went"),
    table([["Area", "Amount (PKR)"], ...T.items, ["**Total**", `**${T.total}**`]], acc(P)),
    H2(P, "Next year"),
    ...checks([[`Launch the ${T.product}`, false], [`Train 20 more volunteers and staff`, false], [`Publish this report for ${T.audience}`, true]]),
  ]),
  "project-plan": (P, T) => doc(`${T.short} project plan`, [
    hero(P, "Project Plan", `${cap(T.project)} · ${T.org}`),
    cols([`**Project lead**\n${T.person}`, `**Start**\n6 January 2027`, `**Finish**\n30 June 2027`], [34, 33, 33]),
    H2(P, "Goal"),
    p(`Deliver the ${T.project} for ${T.audience} in ${T.city} by the end of June 2027, on budget and with a clear handover to the team that will run it.`),
    H2(P, "Milestones"),
    table([["Phase", "What gets done", "Owner", "Due"], ["1. Plan", "Scope, budget and team agreed", T.person, "31 Jan"], ["2. Build", `Prepare the ${T.project}`, T.person2, "30 Apr"], ["3. Launch", `Open to ${T.audience}`, T.person3, "31 May"], ["4. Review", "Results, lessons and handover", T.person, "30 Jun"]], acc(P)),
    H2(P, "Tasks this month"),
    ...checks([["Book the kick-off meeting", true], ["Agree the budget with finance", true], ["Share the plan with the whole team", false], ["Set up the weekly progress check", false]]),
    H2(P, "Risks and how we handle them"),
    table([["Risk", "Likelihood", "What we do"], ["Supplier delays", "Medium", "Order four weeks early; keep a second supplier"], ["Staff leave", "Low", "Two people trained on every task"], ["Costs rise", "Medium", "10% contingency in the budget"]], { tstyle: "lines" }),
    callout(P, `**Weekly check:** every Monday at 10:00, 20 minutes, led by ${T.person}.`),
  ]),
  "brand-guidelines": (P, T) => doc(`${T.short} brand guidelines`, [
    hero(P, "Brand Guidelines", `${T.org} · Version 2.0`),
    p(`These guidelines keep ${T.org} looking and sounding the same everywhere: signs, social media, documents and packaging. When in doubt, keep it simple and leave space.`),
    H2(P, "Our story"),
    callout(P, `**${T.tagline}.** We serve ${T.audience} in ${T.city} with care, clear prices and honest advice.`),
    H2(P, "Logo"),
    cols([`**Do**\nUse the full-colour logo on white or light photos. Keep clear space equal to the height of the first letter.`, `**Don't**\nStretch, rotate, outline or recolour the logo. Never place it on a busy background.`], [50, 50]),
    H2(P, "Colours"),
    table([["Colour", "Hex", "Use for"], ["Primary", P.dark.toUpperCase(), "Headings, buttons, key shapes"], ["Accent", P.mid.toUpperCase(), "Highlights and icons"], ["Soft", P.light.toUpperCase(), "Backgrounds and cards"], ["Ink", P.ink.toUpperCase(), "Body text"]], acc(P)),
    H2(P, "Typography"),
    table([["Style", "Font", "Size"], ["Headline", "Bold sans, tight", "36 to 48 pt"], ["Subheading", "Bold sans", "16 to 20 pt"], ["Body", "Regular sans", "10 to 12 pt"]], { tstyle: "lines" }),
    H2(P, "Voice"),
    ...ul(["Warm and direct: write the way we speak to customers.", "Short sentences; one idea each.", "Numbers over adjectives: say what changed."]),
  ]),
  "employee-handbook": (P, T) => doc(`${T.short} employee handbook`, [
    hero(P, "Employee Handbook", `${T.org} · 2027 edition`),
    p(`Welcome to ${T.org}. This handbook explains how we work, what you can expect from us and what we expect from you. Keep it close during your first month.`),
    H2(P, "Your first week"),
    ...checks([["Meet your manager and team", true], ["Collect your ID card and laptop", true], ["Read the safety guide and sign it", false], [`Shadow ${T.person2} for two days`, false], ["Set your goals for the first 90 days", false]]),
    H2(P, "Working hours and leave"),
    table([["Topic", "Our policy"], ["Office hours", "9:00 to 17:30, Monday to Friday"], ["Annual leave", "20 days a year, plus public holidays"], ["Sick leave", "10 days a year with a doctor's note after 2 days"], ["Remote work", "Up to 2 days a week with your manager's agreement"]], acc(P)),
    H2(P, "Pay and benefits"),
    ...ul(["Salary paid on the last working day of the month.", "Health cover for you and your family after three months.", "Training budget of PKR 40,000 a year."]),
    callout(P, `**Questions?** Ask ${T.person}, ${T.role}, or write to ${T.email}.`),
    H2(P, "Our values"),
    cols([`**Care**\nWe treat ${T.audience} the way we want to be treated.`, `**Ownership**\nWe finish what we start.`, `**Learning**\nWe share what we learn.`], [34, 33, 33]),
  ]),
  "business-case": (P, T) => doc(`${T.short} business case`, [
    hero(P, "Business Case", `${cap(T.product)} · ${T.org}`),
    p(`We ask for approval to invest in the **${T.product}**. It will help ${T.audience}, cut manual work and pay for itself in about 14 months.`),
    H2(P, "The problem"),
    p(`Today the work is done by hand. It is slow, mistakes are common and ${T.audience} wait too long. ${M(T, 0)[0]} is stuck at ${M(T, 0)[1]}.`),
    H2(P, "Options we looked at"),
    table([["Option", "Cost (PKR)", "Benefit", "Our view"], ["Do nothing", "0", "None", "Not advised"], ["Hire two more staff", "2,400,000 a year", "Faster, same errors", "Partly"], [`Build the ${T.product}`, "1,850,000 once", "Faster and fewer errors", "**Recommended**"]], acc(P)),
    img(CHARTS.line.svg(P.dark), 440),
    H2(P, "Costs and return"),
    table([["Item", "Amount (PKR)"], ...T.items, ["**Total**", `**${T.total}**`]], { tstyle: "lines" }),
    callout(P, `**Decision needed:** approve the budget by 15 December so work can start in January.`),
    H2(P, "Next steps"),
    ...ul(["Board approval", `Appoint ${T.person} as project owner`, "Monthly report on cost and progress"], "number"),
  ]),
  "social-media-plan": (P, T) => doc(`${T.short} social media plan`, [
    hero(P, "Social Media Plan", `${T.org} · January to June 2027`),
    p(`This plan sets our goals, channels and weekly rhythm on social media, so every post helps ${T.audience} find and trust ${T.short}.`),
    H2(P, "Goals"),
    ...ul([`Grow followers by 40% across all channels`, `Bring 300 enquiries a month for our ${T.offer}`, "Answer every message within one hour"], "number"),
    H2(P, "Channels"),
    table([["Channel", "Audience", "Posts a week", "Main format"], ["Instagram", cap(T.audience), "5", "Reels and photo carousels"], ["Facebook", "Families and groups", "3", "Events and offers"], ["LinkedIn", "Partners", "2", "News and results"], ["WhatsApp", "Customers", "1", "Weekly update"]], acc(P)),
    H2(P, "Weekly rhythm"),
    table([["Day", "Theme", "Example"], ["Monday", "Tip", `One quick tip about ${T.offer}`], ["Wednesday", "Behind the scenes", `A day with ${T.person2}`], ["Friday", "Proof", "A customer story or review"]], { tstyle: "lines" }),
    callout(P, `**Tone:** friendly, short and useful. Every post ends with one clear action.`),
    H2(P, "How we measure"),
    ...checks([["Monthly report: reach, saves, messages", false], ["Best three posts reused as ads", false], ["Review the plan every quarter", true]]),
  ]),
  "project-scope": (P, T) => doc(`${T.short} project scope`, [
    { type: "h3", bg: P.dark, pad: 8, runs: cleanRuns(look("PROJECT SCOPE", { color: "#ffffff", b: true })) },
    { type: "h1", runs: cleanRuns(look(cap(T.project), { color: P.dark, size: 34, b: true })) },
    p(`${T.org} · Prepared by ${T.person}, ${T.role} · Version 1.2`),
    H2(P, "Purpose"),
    p(`This document fixes what the ${T.project} will and will not deliver, so the team, ${T.audience} and our partners share one picture of the work.`),
    H2(P, "Deliverables"),
    table([["Deliverable", "Description", "Owner", "Due"], [cap(T.project), "Ready to use, tested and signed off", T.person, "30 Apr"], ["Training", `Two sessions for staff and ${T.audience}`, T.person2, "15 May"], ["Handover pack", "Guides, contacts and support plan", T.person3, "31 May"]], acc(P)),
    H2(P, "In scope and out of scope"),
    cols([`**In scope**\nPlanning, build, testing, training and the first month of support.`, `**Out of scope**\nNew buildings, extra staff and changes after sign-off.`], [50, 50]),
    H2(P, "Assumptions"),
    ...ul(["Budget approved before work starts", "One decision-maker on each side", "Changes go through a written change request"]),
    H2(P, "Sign-off"),
    table([["Name", "Role", "Date"], [T.person, T.role, ""], [T.person2, "Finance", ""]], { tstyle: "lines" }),
  ]),
  "content-strategy": (P, T) => doc(`${T.short} content strategy`, [
    hero(P, "Content Strategy", `${T.org} · 2027`),
    p(`Content that helps ${T.audience} make better choices, and brings them back to ${T.short}. This strategy covers who we write for, what we publish and how we know it works.`),
    H2(P, "Who we write for"),
    cols([`**${cap(T.audience)}**\nBusy, practical, and looking for clear answers they can use today.`, `**Partners**\nWant proof: numbers, stories and simple next steps.`], [50, 50]),
    H2(P, "Content pillars"),
    table([["Pillar", "Why it matters", "Formats"], ["How-to guides", "Answers common questions", "Articles, short videos"], ["Customer stories", "Builds trust", "Case studies, quotes"], ["News and offers", `Promotes the ${T.offer}`, "Posts, email"]], acc(P)),
    img(CHARTS.pie.svg(P.dark), 420),
    H2(P, "Publishing calendar"),
    table([["Week", "Article", "Owner"], ["1", `5 questions about our ${T.offer}`, T.person2], ["2", `A day with ${T.person}`, T.person3], ["3", `${T.short} in numbers`, T.person], ["4", "Customer story", T.person2]], { tstyle: "lines" }),
    callout(P, `**Measure:** visits, time on page, enquiries and repeat readers, reviewed on the first Monday of each month.`),
  ]),
};
