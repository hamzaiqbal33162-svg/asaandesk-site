// Sales CRM: pipeline board with stage totals, deals, contacts, activities, forecast and reports.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, num, sum, groupSum, groupCount, columnChart, lineChart, barList } from "../shared/dash.js";

const STAGES = [
  { value: "Lead", label: "Lead", tone: "gray", p: 10 },
  { value: "Contacted", label: "Contacted", tone: "blue", p: 25 },
  { value: "Proposal", label: "Proposal sent", tone: "purple", p: 50 },
  { value: "Negotiation", label: "Negotiation", tone: "amber", p: 75 },
  { value: "Won", label: "Won", tone: "green", p: 100 },
  { value: "Lost", label: "Lost", tone: "red", p: 0 },
];
const PROB = Object.fromEntries(STAGES.map((s) => [s.value, s.p]));
const TONE = Object.fromEntries(STAGES.map((s) => [s.value, s.tone]));
const SOURCES = ["WhatsApp", "Facebook", "Instagram", "Referral", "Walk-in", "Website", "Cold call", "Exhibition"];
const owners = (app) => String(app.setting("owners") || "").split(",").map((x) => x.trim()).filter(Boolean);
const open = (d) => !["Won", "Lost"].includes(d.stage);

const app = createApp({
  id: "sales-crm",
  title: "Sales CRM",
  brand: "Noor Traders",
  icon: "board",
  accent: "#3d5afe",
  settings: [
    { key: "business", label: "Business name", type: "text", default: "Noor Traders" },
    { key: "phone", label: "Phone", type: "phone", default: "0321 7654321" },
    { key: "address", label: "Address", type: "text", default: "Blue Area, Islamabad" },
    { key: "owners", label: "Sales people (comma separated)", type: "text", default: "Ali, Sana, Usman" },
    { key: "target", label: "Monthly sales target (PKR)", type: "money", default: 2500000 },
  ],
  entities: {
    deals: {
      label: "Deals",
      one: "Deal",
      search: ["title", "company", (r, app) => app.label("contacts", r.contact), "owner"],
      title: (r) => r.title,
      badge: (r, app) => app.pill(r.stage, TONE[r.stage]) + " " + app.pill(app.money(r.value), "gray"),
      fields: [
        { key: "title", label: "Deal", type: "text", required: true, placeholder: "e.g. 50 office chairs" },
        { key: "contact", label: "Contact", type: "relation", entity: "contacts" },
        { key: "value", label: "Value (PKR)", type: "money", required: true },
        { key: "stage", label: "Stage", type: "select", options: STAGES, default: "Lead" },
        { key: "owner", label: "Owner", type: "select", options: (r, app) => owners(app) },
        { key: "source", label: "Source", type: "select", options: SOURCES },
        { key: "close", label: "Expected close", type: "date", default: () => addDays(today(), 21) },
        { key: "lostReason", label: "Lost reason", type: "select", options: ["Price", "Went with a competitor", "No budget", "No reply", "Timing", "Other"], show: (r) => r.stage === "Lost" },
        { key: "closedOn", label: "Closed on", type: "date", show: (r) => !open(r) },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      beforeSave: (r) => {
        if (!open(r) && !r.closedOn) r.closedOn = today();
      },
      actions: [
        { label: "Mark won", icon: "check", primary: true, when: open, run: (r) => ((r.stage = "Won"), (r.closedOn = today())) },
        {
          label: "Mark lost",
          icon: "close",
          when: open,
          run: (r) => {
            const why = prompt("Why was it lost? (Price, competitor, no budget…)", "Price");
            if (why === null) return "keep";
            r.stage = "Lost";
            r.lostReason = why || "Other";
            r.closedOn = today();
          },
        },
        { label: "Add activity", icon: "plus", run: (r, app) => (app.open("activities", "", true, { deal: r.id, contact: r.contact }), "keep") },
        { label: "Print quotation", icon: "print", run: (r, app) => (printQuote(r, app), "keep") },
        {
          label: "WhatsApp",
          icon: "wa",
          when: (r, app) => app.find("contacts", r.contact)?.phone,
          run: (r, app) => {
            const c = app.find("contacts", r.contact);
            app.whatsapp(c.phone, `Assalam o Alaikum ${c.name}, following up on "${r.title}" from ${app.setting("business")}.`);
            return "keep";
          },
        },
      ],
      related: (r, app) => {
        const acts = app.db.activities.filter((a) => a.deal === r.id).sort((a, b) => b.due.localeCompare(a.due));
        return `<div class="dx-related"><h3>Activities (${acts.length})</h3>${app.list(acts, (a) => `<li>${app.openLink("activities", a, `<span class="dx-when">${esc(fmtShort(a.due))}</span><span class="dx-li-main"><b>${esc(a.title)}</b><small>${esc(a.type)}</small></span>${a.done ? app.pill("Done", "green") : app.pill("To do", a.due < today() ? "red" : "amber")}`)}</li>`, "No activities yet.")}</div>`;
      },
    },
    contacts: {
      label: "Contacts",
      one: "Contact",
      search: ["name", "company", "phone", "email", "city"],
      title: (r) => r.name + (r.company ? " · " + r.company : ""),
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "company", label: "Company", type: "text" },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "email", label: "Email", type: "email" },
        { key: "city", label: "City", type: "text" },
        { key: "role", label: "Designation", type: "text" },
        { key: "tags", label: "Tags", type: "text", placeholder: "e.g. VIP, wholesale" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [
        { label: "New deal", icon: "plus", primary: true, run: (r, app) => (app.open("deals", "", true, { contact: r.id }), "keep") },
        { label: "WhatsApp", icon: "wa", when: (r) => r.phone, run: (r, app) => (app.whatsapp(r.phone, `Assalam o Alaikum ${r.name}, this is ${app.setting("business")}.`), "keep") },
      ],
      related: (r, app) => {
        const deals = app.db.deals.filter((d) => d.contact === r.id);
        return `<div class="dx-related"><h3>Deals (${deals.length}) · won ${esc(app.money(sum(deals.filter((d) => d.stage === "Won"), "value")))}</h3>${app.list(deals, (d) => `<li>${app.openLink("deals", d, `<span class="dx-li-main"><b>${esc(d.title)}</b><small>${esc(app.money(d.value))}</small></span>${app.pill(d.stage, TONE[d.stage])}`)}</li>`, "No deals yet.")}</div>`;
      },
    },
    activities: {
      label: "Activities",
      one: "Activity",
      search: ["title", "type", (r, app) => app.label("contacts", r.contact)],
      title: (r) => r.title,
      fields: [
        { key: "title", label: "What", type: "text", required: true, placeholder: "e.g. Call about the quotation" },
        { key: "type", label: "Type", type: "select", options: ["Call", "Meeting", "WhatsApp", "Email", "Visit", "Task"], default: "Call" },
        { key: "due", label: "Due", type: "date", required: true, default: today },
        { key: "time", label: "Time", type: "time" },
        { key: "deal", label: "Deal", type: "relation", entity: "deals" },
        { key: "contact", label: "Contact", type: "relation", entity: "contacts" },
        { key: "owner", label: "Owner", type: "select", options: (r, app) => owners(app) },
        { key: "done", label: "Done", type: "bool" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [{ label: "Mark done", icon: "check", primary: true, when: (r) => !r.done, run: (r) => (r.done = true) }],
    },
  },
  pages: [
    {
      id: "overview",
      label: "Overview",
      icon: "home",
      type: "overview",
      actions: [
        { id: "d", label: "New deal", new: "deals", primary: true },
        { id: "c", label: "New contact", new: "contacts", icon: "user" },
      ],
      kpis: (db, app) => {
        const openDeals = db.deals.filter(open);
        const wonM = db.deals.filter((d) => d.stage === "Won" && monthOf(d.closedOn) === thisMonth());
        const closed90 = db.deals.filter((d) => !open(d) && d.closedOn >= addDays(today(), -90));
        const target = num(app.setting("target"));
        return [
          { label: "Open pipeline", value: app.money(sum(openDeals, "value")), note: `${openDeals.length} deals`, icon: "board", go: "pipeline" },
          { label: "Forecast (weighted)", value: app.money(sum(openDeals, (d) => (num(d.value) * PROB[d.stage]) / 100)), note: "value × stage chance", icon: "chart" },
          { label: "Won this month", value: app.money(sum(wonM, "value")), note: target ? `${Math.round((sum(wonM, "value") / target) * 100)}% of target` : `${wonM.length} deals`, icon: "check", tone: "good" },
          { label: "Win rate (90 days)", value: closed90.length ? Math.round((closed90.filter((d) => d.stage === "Won").length / closed90.length) * 100) + "%" : "—", note: `${closed90.length} closed deals`, icon: "star" },
        ];
      },
      blocks: (db, app) => {
        const byStage = STAGES.filter((s) => s.value !== "Lost").map((s) => ({ label: s.label, value: sum(db.deals.filter((d) => d.stage === s.value), "value") }));
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const won = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.deals.filter((d) => d.stage === "Won" && monthOf(d.closedOn) === m), "value") }));
        const due = db.activities.filter((a) => !a.done && a.due <= addDays(today(), 3)).sort((a, b) => a.due.localeCompare(b.due));
        const top = db.deals.filter(open).sort((a, b) => num(b.value) - num(a.value));
        return [
          { title: "Pipeline by stage", note: "value", html: barList(byStage, { fmt: (v) => app.moneyShort(v) }) },
          { title: "Won per month", html: columnChart(won, { fmt: (v) => app.moneyShort(v) }), table: won.map((d) => [d.label, app.money(d.value)]) },
          { title: "Due soon", note: "activities", go: "activities", html: app.list(due.slice(0, 8), (a) => `<li>${app.openLink("activities", a, `<span class="dx-when">${esc(fmtShort(a.due))}</span><span class="dx-li-main"><b>${esc(a.title)}</b><small>${esc(a.type)} · ${esc(app.label("contacts", a.contact))}</small></span>${a.due < today() ? app.pill("Late", "red") : ""}`)}</li>`, "Nothing due.") },
          { title: "Biggest open deals", go: "deals", html: app.list(top.slice(0, 6), (d) => `<li>${app.openLink("deals", d, `<span class="dx-li-main"><b>${esc(d.title)}</b><small>${esc(app.label("contacts", d.contact))}</small></span><b>${esc(app.moneyShort(d.value))}</b>${app.pill(d.stage, TONE[d.stage])}`)}</li>`) },
        ];
      },
    },
    {
      id: "pipeline",
      label: "Pipeline",
      icon: "board",
      type: "board",
      entity: "deals",
      field: "stage",
      intro: "Drag a deal to its next stage; totals update right away. Lost deals keep their reason.",
      columns: STAGES,
      where: (r) => open(r) || r.closedOn >= addDays(today(), -30),
      order: (a, b) => num(b.value) - num(a.value),
      total: (list, app) => (list.length ? app.money(sum(list, "value")) : ""),
      card: (r, app) => `<b>${esc(r.title)}</b><small>${esc(app.label("contacts", r.contact) || "No contact")}</small><span>${esc(app.money(r.value))}</span><small>${esc(r.owner || "")}${r.close && open(r) ? " · close " + esc(fmtShort(r.close)) : ""}</small>`,
      onMove: (r, before, value) => {
        if (!open(r)) r.closedOn = today();
        else r.closedOn = "";
        if (value === "Lost" && !r.lostReason) r.lostReason = "Other";
      },
    },
    {
      id: "deals",
      label: "Deals",
      icon: "money",
      type: "table",
      entity: "deals",
      sort: "value",
      dir: -1,
      filters: [
        { key: "stage", label: "Stage", options: STAGES.map((s) => s.value) },
        { key: "owner", label: "Owner", options: (app) => owners(app) },
        { key: "source", label: "Source", options: SOURCES },
      ],
      total: (rows, app) => `Total <b>${esc(app.money(sum(rows, "value")))}</b> · weighted <b>${esc(app.money(sum(rows.filter(open), (d) => (num(d.value) * PROB[d.stage]) / 100)))}</b>`,
      columns: [
        { key: "title", label: "Deal", html: (r) => `<b>${esc(r.title)}</b>` },
        { key: "contact", label: "Contact" },
        { key: "value", label: "Value", money: true, right: true, sortValue: (r) => num(r.value) },
        { key: "stage", label: "Stage", html: (r, app) => app.pill(r.stage, TONE[r.stage]) },
        { key: "owner", label: "Owner" },
        { key: "source", label: "Source" },
        { key: "close", label: "Close", date: true },
      ],
    },
    {
      id: "contacts",
      label: "Contacts",
      icon: "users",
      type: "table",
      entity: "contacts",
      sort: "name",
      columns: [
        { key: "name", label: "Name", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "company", label: "Company" },
        { key: "phone", label: "Mobile" },
        { key: "city", label: "City" },
        { key: "deals", label: "Deals", right: true, get: (r, app) => app.db.deals.filter((d) => d.contact === r.id).length },
        { key: "won", label: "Won", right: true, get: (r, app) => sum(app.db.deals.filter((d) => d.contact === r.id && d.stage === "Won"), "value"), html: (r, app) => esc(app.moneyShort(sum(app.db.deals.filter((d) => d.contact === r.id && d.stage === "Won"), "value"))) },
      ],
    },
    {
      id: "activities",
      label: "Activities",
      icon: "check",
      type: "table",
      entity: "activities",
      sort: "due",
      filters: [
        { key: "type", label: "Type", options: ["Call", "Meeting", "WhatsApp", "Email", "Visit", "Task"] },
        { key: "done", label: "Status", options: [{ value: "open", label: "To do" }, { value: "late", label: "Late" }, { value: "done", label: "Done" }], test: (r, v) => (v === "done" ? r.done : v === "late" ? !r.done && r.due < today() : !r.done) },
      ],
      columns: [
        { key: "due", label: "Due", date: true },
        { key: "title", label: "What", html: (r) => `<b>${esc(r.title)}</b>` },
        { key: "type", label: "Type" },
        { key: "contact", label: "Contact" },
        { key: "owner", label: "Owner" },
        { key: "done", label: "Status", html: (r, app) => (r.done ? app.pill("Done", "green") : r.due < today() ? app.pill("Late", "red") : app.pill("To do", "amber")) },
      ],
      badge: (db) => db.activities.filter((a) => !a.done && a.due <= today()).length,
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      kpis: (db, app) => {
        const won = db.deals.filter((d) => d.stage === "Won");
        const lost = db.deals.filter((d) => d.stage === "Lost");
        const days = won.filter((d) => d.created && d.closedOn).map((d) => Math.max(0, Math.round((new Date(d.closedOn) - new Date(d.created)) / 86400000)));
        return [
          { label: "Average won deal", value: app.money(won.length ? sum(won, "value") / won.length : 0), icon: "money" },
          { label: "Deals won", value: won.length, note: `${lost.length} lost`, icon: "check" },
          { label: "Lost value", value: app.moneyShort(sum(lost, "value")), icon: "close" },
          { label: "Open activities", value: db.activities.filter((a) => !a.done).length, icon: "clock" },
        ];
      },
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const won = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.deals.filter((d) => d.stage === "Won" && monthOf(d.closedOn) === m), "value") }));
        return [
          { title: "Won value", note: "last 6 months", html: lineChart(won, { fmt: (v) => app.moneyShort(v) }), table: won.map((d) => [d.label, app.money(d.value)]) },
          { title: "Won by sales person", html: barList(groupSum(db.deals.filter((d) => d.stage === "Won"), (d) => d.owner, (d) => d.value), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Won by source", html: barList(groupSum(db.deals.filter((d) => d.stage === "Won"), (d) => d.source, (d) => d.value), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Why deals were lost", html: barList(groupCount(db.deals.filter((d) => d.stage === "Lost"), (d) => d.lostReason || "Other")) },
          { title: "Where leads come from", html: barList(groupCount(db.deals, (d) => d.source)) },
          { title: "Forecast by expected close month", html: barList(groupSum(db.deals.filter(open), (d) => fmtMonth(monthOf(d.close)), (d) => (num(d.value) * PROB[d.stage]) / 100), { fmt: (v) => app.moneyShort(v) }) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const companies = ["Habib Steel", "Crescent Textiles", "Al-Fatah Stores", "Gourmet Foods", "Sapphire Mills", "City School", "Shaheen Builders", "Zong Franchise", "Pak Motors", "Bismillah Traders", "Meezan Interiors", "Green Valley Farms", "Hilal Pharma", "Kohinoor Hotel", "Sunrise Clinic"];
    const contacts = companies.map((c, i) => ({ id: "c" + i, name: h.person(), company: c, phone: h.phone(), email: `info@${c.toLowerCase().replace(/[^a-z]/g, "")}.pk`, city: h.pick(["Lahore", "Karachi", "Islamabad", "Faisalabad", "Multan", "Rawalpindi"]), role: h.pick(["Owner", "Purchase manager", "Admin", "CEO"]) }));
    const items = ["office chairs", "laptops", "CCTV cameras", "printer toner", "solar panels", "LED lights", "workstations", "air conditioners", "uniforms", "water dispensers"];
    const ownersList = ["Ali", "Sana", "Usman"];
    const deals = Array.from({ length: 46 }, (_, i) => {
      const stage = i < 26 ? h.pick(["Lead", "Contacted", "Proposal", "Negotiation"]) : h.rand() < 0.65 ? "Won" : "Lost";
      const closedOn = stage === "Won" || stage === "Lost" ? h.day(-h.int(0, 170)) : "";
      return { id: "d" + i, title: `${h.int(5, 120)} ${h.pick(items)}`, contact: "c" + h.int(0, contacts.length - 1), value: h.int(8, 240) * 5000, stage, owner: h.pick(ownersList), source: h.pick(SOURCES), close: h.day(h.int(-5, 60)), closedOn, lostReason: stage === "Lost" ? h.pick(["Price", "Went with a competitor", "No budget", "No reply"]) : "", created: Date.now() - h.int(10, 200) * 86400000 };
    });
    const activities = Array.from({ length: 34 }, (_, i) => {
      const d = h.pick(deals);
      return { title: h.pick(["Call about the quotation", "Send revised prices", "Meeting at their office", "Share product catalogue", "Follow up on payment", "Demo visit"]), type: h.pick(["Call", "Meeting", "WhatsApp", "Email", "Visit"]), due: h.day(h.int(-6, 10)), time: h.time(10, 18), deal: d.id, contact: d.contact, owner: d.owner, done: h.rand() < 0.35 };
    });
    return { contacts, deals, activities };
  },
});

function printQuote(r, app) {
  const c = app.find("contacts", r.contact) || {};
  app.print("Quotation", `<div class="dx-doc-meta"><div><b>To:</b> ${esc(c.name || "")}${c.company ? ", " + esc(c.company) : ""}</div><div><b>Date:</b> ${esc(app.date(today()))}</div><div><b>Phone:</b> ${esc(c.phone || "")}</div><div><b>Valid until:</b> ${esc(app.date(addDays(today(), 15)))}</div></div><table class="dx-doc-table"><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody><tr><td>${esc(r.title)}</td><td class="r">${esc(app.money(r.value))}</td></tr></tbody></table><div class="dx-doc-sum"><div class="dx-doc-grand"><span>Total</span><b>${esc(app.money(r.value))}</b></div></div>${r.notes ? `<p>${esc(r.notes)}</p>` : ""}<p style="margin-top:30px">Prepared by ${esc(r.owner || app.setting("business"))}</p>`);
}

export default app;
