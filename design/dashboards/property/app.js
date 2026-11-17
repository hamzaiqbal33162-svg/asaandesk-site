// Property dealer: listings for sale and rent (marla, kanal, sq ft), buyer and tenant leads with matching listings,
// deals board, site visits calendar, rent collection with WhatsApp reminders, owners and reports.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, num, sum, groupCount, groupSum, columnChart, barList } from "../shared/dash.js";

const TYPES = ["House", "Plot", "Flat / apartment", "Shop", "Office", "Farmhouse", "Portion"];
const UNITS = ["Marla", "Kanal", "Sq ft", "Sq yd"];
const STAGES = [
  { value: "Inquiry", label: "Inquiry", tone: "gray" },
  { value: "Visit", label: "Visit done", tone: "blue" },
  { value: "Offer", label: "Offer", tone: "purple" },
  { value: "Token", label: "Token paid", tone: "amber" },
  { value: "Closed", label: "Closed", tone: "green" },
  { value: "Lost", label: "Lost", tone: "red" },
];
const STONE = Object.fromEntries(STAGES.map((s) => [s.value, s.tone]));
const LTONE = { Available: "green", "Under offer": "amber", Sold: "gray", Rented: "blue", "Off market": "gray" };
const crore = (v) => (num(v) >= 1e7 ? (num(v) / 1e7).toFixed(2).replace(/\.?0+$/, "") + " crore" : num(v) >= 1e5 ? (num(v) / 1e5).toFixed(1).replace(/\.0$/, "") + " lakh" : Math.round(num(v)).toLocaleString("en-US"));
const priceText = (l) => (l.purpose === "Rent" ? `PKR ${crore(l.price)} / month` : `PKR ${crore(l.price)}`);
const sizeText = (l) => (l.size ? `${num(l.size)} ${l.unit || "Marla"}` : "");
const commissionOf = (d, app) => Math.round((num(d.amount || app.find("listings", d.listing)?.price) * num(d.commission)) / 100);
const matches = (app, lead) =>
  app.db.listings.filter(
    (l) =>
      l.status === "Available" &&
      l.purpose === (lead.want === "Rent" ? "Rent" : "Sale") &&
      (!lead.type || l.type === lead.type) &&
      (!num(lead.budget) || num(l.price) <= num(lead.budget) * 1.1) &&
      (!lead.area || String(l.society + " " + l.city).toLowerCase().includes(String(lead.area).toLowerCase().split(",")[0].trim())),
  );
const rentFor = (app, t, month) => app.db.rentpay.filter((p) => p.tenancy === t.id && p.month === month);

const app = createApp({
  id: "property",
  title: "Property dealer dashboard",
  brand: "Zameen Point Estate",
  icon: "building",
  accent: "#7c3aed",
  settings: [
    { key: "business", label: "Agency name", type: "text", default: "Zameen Point Estate" },
    { key: "phone", label: "Phone", type: "phone", default: "0322 4445556" },
    { key: "address", label: "Office", type: "text", default: "Main Boulevard, DHA Phase 5, Lahore" },
    { key: "commission", label: "Default commission (%)", type: "percent", default: 1 },
  ],
  entities: {
    listings: {
      label: "Listings",
      one: "Listing",
      search: ["title", "society", "city", "type", "ref"],
      title: (r) => r.title,
      badge: (r, app) => app.pill(r.status, LTONE[r.status]) + " " + app.pill(r.purpose === "Rent" ? "For rent" : "For sale", r.purpose === "Rent" ? "blue" : "purple"),
      fields: [
        { key: "title", label: "Title", type: "text", required: true, placeholder: "e.g. 10 Marla house, DHA Phase 5" },
        { key: "ref", label: "Reference no.", type: "text", default: (app) => app.nextNo("listings", "ZP-") },
        { key: "purpose", label: "Purpose", type: "select", options: ["Sale", "Rent"], default: "Sale", required: true },
        { key: "type", label: "Type", type: "select", options: TYPES, required: true },
        { key: "society", label: "Society / area", type: "text", required: true },
        { key: "city", label: "City", type: "select", options: ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar"], default: "Lahore" },
        { key: "size", label: "Size", type: "number" },
        { key: "unit", label: "Unit", type: "select", options: UNITS, default: "Marla" },
        { key: "price", label: "Demand (PKR, or rent per month)", type: "money", required: true },
        { key: "beds", label: "Bedrooms", type: "number" },
        { key: "baths", label: "Bathrooms", type: "number" },
        { key: "status", label: "Status", type: "select", options: ["Available", "Under offer", "Sold", "Rented", "Off market"], default: "Available" },
        { key: "owner", label: "Owner", type: "relation", entity: "owners" },
        { key: "features", label: "Features", type: "textarea", placeholder: "Corner, park facing, gas, servant quarter…" },
        { key: "listed", label: "Listed on", type: "date", default: today },
      ],
      actions: [
        { label: "Book a visit", icon: "calendar", primary: true, run: (r, app) => (app.open("visits", "", true, { listing: r.id }), "keep") },
        { label: "New deal", icon: "board", run: (r, app) => (app.open("deals", "", true, { listing: r.id, amount: r.price, commission: app.setting("commission") }), "keep") },
        {
          label: "Share on WhatsApp",
          icon: "wa",
          run: (r, app) => {
            const text = `*${r.title}*\n${r.type} for ${r.purpose.toLowerCase()} · ${sizeText(r)}\n${r.society}, ${r.city}\nDemand: ${priceText(r)}${r.beds ? `\n${r.beds} bed · ${r.baths || "?"} bath` : ""}${r.features ? "\n" + r.features : ""}\nRef ${r.ref} · ${app.setting("business")} ${app.setting("phone")}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
            return "keep";
          },
        },
        { label: "Print flyer", icon: "print", run: (r, app) => (printFlyer(r, app), "keep") },
      ],
      related: (r, app) => {
        const leads = app.db.leads.filter((l) => !["Closed", "Lost"].includes(l.status) && matches(app, l).some((x) => x.id === r.id));
        const vis = app.db.visits.filter((v) => v.listing === r.id).sort((a, b) => b.date.localeCompare(a.date));
        return `<div class="dx-related"><h3>Leads looking for this (${leads.length})</h3>${app.list(leads.slice(0, 8), (l) => `<li>${app.openLink("leads", l, `<span class="dx-li-main"><b>${esc(l.name)}</b><small>budget ${esc(crore(l.budget))} · ${esc(l.phone || "")}</small></span>`)}</li>`, "No matching leads yet.")}</div><div class="dx-related"><h3>Visits (${vis.length})</h3>${app.list(vis.slice(0, 6), (v) => `<li>${app.openLink("visits", v, `<span class="dx-when">${esc(fmtShort(v.date))}</span><span class="dx-li-main"><b>${esc(app.label("leads", v.lead))}</b><small>${esc(v.status)}${v.feedback ? " · " + esc(v.feedback) : ""}</small></span>`)}</li>`, "No visits yet.")}</div>`;
      },
    },
    leads: {
      label: "Leads",
      one: "Lead",
      search: ["name", "phone", "area", "type"],
      title: (r) => r.name,
      badge: (r, app) => app.pill(r.status, { New: "blue", Contacted: "purple", Visiting: "amber", Negotiating: "amber", Closed: "green", Lost: "red" }[r.status]) + " " + app.pill(r.want === "Rent" ? "Wants to rent" : "Wants to buy", "gray"),
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "want", label: "Wants to", type: "select", options: [{ value: "Buy", label: "Buy" }, { value: "Rent", label: "Rent" }], default: "Buy" },
        { key: "type", label: "Property type", type: "select", options: TYPES },
        { key: "area", label: "Areas", type: "text", placeholder: "e.g. DHA, Bahria Town" },
        { key: "size", label: "Size wanted", type: "text", placeholder: "e.g. 10 Marla" },
        { key: "budget", label: "Budget (PKR, or rent per month)", type: "money" },
        { key: "source", label: "Source", type: "select", options: ["Walk-in", "Zameen.com", "OLX", "Facebook", "WhatsApp", "Referral", "Signboard"] },
        { key: "status", label: "Status", type: "select", options: ["New", "Contacted", "Visiting", "Negotiating", "Closed", "Lost"], default: "New" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [
        { label: "Book a visit", icon: "calendar", primary: true, run: (r, app) => (app.open("visits", "", true, { lead: r.id }), "keep") },
        {
          label: "Send matches on WhatsApp",
          icon: "wa",
          when: (r, app) => r.phone && matches(app, r).length,
          run: (r, app) => {
            const list = matches(app, r).slice(0, 5);
            app.whatsapp(r.phone, `Assalam o Alaikum ${r.name}, ${app.setting("business")} has these options for you:\n${list.map((l, i) => `${i + 1}. ${l.title} · ${sizeText(l)} · ${priceText(l)} (ref ${l.ref})`).join("\n")}\nReply with a number to book a visit.`);
            return "keep";
          },
        },
      ],
      related: (r, app) => {
        const m = matches(app, r);
        return `<div class="dx-related"><h3>Matching listings (${m.length})</h3>${app.list(m.slice(0, 10), (l) => `<li>${app.openLink("listings", l, `<span class="dx-li-main"><b>${esc(l.title)}</b><small>${esc(sizeText(l))} · ${esc(l.society)}</small></span><b>${esc(crore(l.price))}</b>`)}</li>`, "Nothing matches yet. Try a wider budget or area.")}</div>`;
      },
    },
    deals: {
      label: "Deals",
      one: "Deal",
      search: [(r, app) => app.label("listings", r.listing), (r, app) => app.label("leads", r.lead)],
      title: (r, app) => `${app.label("listings", r.listing) || "Deal"}`,
      badge: (r, app) => app.pill(r.stage, STONE[r.stage]),
      fields: [
        { key: "listing", label: "Listing", type: "relation", entity: "listings", required: true },
        { key: "lead", label: "Buyer / tenant", type: "relation", entity: "leads" },
        { key: "stage", label: "Stage", type: "select", options: STAGES, default: "Inquiry" },
        { key: "amount", label: "Agreed price (PKR)", type: "money" },
        { key: "token", label: "Token / bayana (PKR)", type: "money" },
        { key: "commission", label: "Commission (%)", type: "percent", default: (app) => app.setting("commission") },
        { key: "closedOn", label: "Closed on", type: "date" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      afterSave: (r, before, app) => syncListing(r, app),
      actions: [
        { label: "Mark closed", icon: "check", primary: true, when: (r) => !["Closed", "Lost"].includes(r.stage), run: (r, app) => ((r.stage = "Closed"), (r.closedOn = today()), syncListing(r, app)) },
        { label: "Print receipt of token", icon: "print", when: (r) => num(r.token) > 0, run: (r, app) => (printToken(r, app), "keep") },
      ],
    },
    visits: {
      label: "Visits",
      one: "Visit",
      search: [(r, app) => app.label("leads", r.lead), (r, app) => app.label("listings", r.listing)],
      title: (r, app) => `${app.label("leads", r.lead) || "Visit"} · ${fmtShort(r.date)}`,
      fields: [
        { key: "listing", label: "Listing", type: "relation", entity: "listings", required: true },
        { key: "lead", label: "Client", type: "relation", entity: "leads" },
        { key: "date", label: "Date", type: "date", required: true, default: () => addDays(today(), 1) },
        { key: "time", label: "Time", type: "time", required: true, default: "16:00" },
        { key: "status", label: "Status", type: "select", options: ["Scheduled", "Done", "Cancelled"], default: "Scheduled" },
        { key: "feedback", label: "Feedback", type: "text", placeholder: "e.g. liked it, wants a lower price" },
      ],
      actions: [
        { label: "Visit done", icon: "check", primary: true, when: (r) => r.status === "Scheduled", run: (r, app) => ((r.status = "Done"), app.find("leads", r.lead) && (app.find("leads", r.lead).status = "Visiting")) },
        {
          label: "WhatsApp location",
          icon: "wa",
          when: (r, app) => app.find("leads", r.lead)?.phone,
          run: (r, app) => {
            const l = app.find("listings", r.listing) || {};
            const c = app.find("leads", r.lead);
            app.whatsapp(c.phone, `Assalam o Alaikum ${c.name}, your visit to ${l.title} (${l.society}, ${l.city}) is on ${fmtShort(r.date)} at ${app.time(r.time)}. ${app.setting("business")} · ${app.setting("phone")}`);
            return "keep";
          },
        },
      ],
    },
    tenancies: {
      label: "Rentals",
      one: "Rental",
      search: ["tenant", "phone", (r, app) => app.label("listings", r.listing)],
      title: (r, app) => `${r.tenant} · ${app.label("listings", r.listing)}`,
      fields: [
        { key: "listing", label: "Property", type: "relation", entity: "listings", required: true },
        { key: "tenant", label: "Tenant", type: "text", required: true },
        { key: "phone", label: "Tenant mobile", type: "phone" },
        { key: "rent", label: "Monthly rent (PKR)", type: "money", required: true },
        { key: "dueDay", label: "Rent due on day", type: "number", default: 5 },
        { key: "start", label: "Start", type: "date", default: today },
        { key: "end", label: "Agreement ends", type: "date", default: () => addDays(today(), 364) },
        { key: "deposit", label: "Security deposit (PKR)", type: "money" },
        { key: "status", label: "Status", type: "select", options: ["Active", "Ended"], default: "Active" },
      ],
      afterSave: (r, before, app) => {
        const l = app.find("listings", r.listing);
        if (l && r.status === "Active") l.status = "Rented";
      },
      actions: [
        { label: "Record this month's rent", icon: "money", primary: true, when: (r, app) => r.status === "Active" && !rentFor(app, r, thisMonth()).length, run: (r, app) => recordRent(app, r, thisMonth()) },
        { label: "WhatsApp reminder", icon: "wa", when: (r) => r.phone, run: (r, app) => (app.whatsapp(r.phone, `Assalam o Alaikum ${r.tenant}, a reminder that the rent of ${app.money(r.rent)} for ${fmtMonth(thisMonth())} is due on the ${num(r.dueDay)}th. ${app.setting("business")}`), "keep") },
      ],
    },
    rentpay: {
      label: "Rent payments",
      one: "Rent payment",
      hidden: true,
      title: (r, app) => `${app.find("tenancies", r.tenancy)?.tenant || ""} · ${fmtMonth(r.month)}`,
      fields: [
        { key: "tenancy", label: "Rental", type: "relation", entity: "tenancies", required: true },
        { key: "month", label: "For month", type: "text", required: true, default: thisMonth },
        { key: "amount", label: "Amount (PKR)", type: "money", required: true },
        { key: "date", label: "Received on", type: "date", default: today },
        { key: "method", label: "Paid by", type: "select", options: ["Cash", "Bank transfer", "Cheque", "JazzCash"], default: "Cash" },
      ],
    },
    owners: {
      label: "Owners",
      one: "Owner",
      search: ["name", "phone", "cnic"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "cnic", label: "CNIC", type: "text" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      related: (r, app) => {
        const ls = app.db.listings.filter((l) => l.owner === r.id);
        return `<div class="dx-related"><h3>Listings (${ls.length})</h3>${app.list(ls, (l) => `<li>${app.openLink("listings", l, `<span class="dx-li-main"><b>${esc(l.title)}</b><small>${esc(priceText(l))}</small></span>${app.pill(l.status, LTONE[l.status])}`)}</li>`, "No listings.")}</div>`;
      },
    },
  },
  onAction: (code, app) => {
    const [a, id] = code.split(":");
    if (a === "rentpay") {
      const t = app.find("tenancies", id);
      if (t) recordRent(app, t, app.ui.rent.month || thisMonth());
      app.save();
      return app.refresh();
    }
    if (a === "rentwa") {
      const t = app.find("tenancies", id);
      const m = app.ui.rent.month || thisMonth();
      return app.whatsapp(t.phone, `Assalam o Alaikum ${t.tenant}, the rent of ${app.money(t.rent)} for ${fmtMonth(m)} is pending (due on the ${num(t.dueDay)}th). Kindly pay at your earliest. ${app.setting("business")}`);
    }
  },
  onChange: (ev, app) => {
    if (ev.target.dataset.rentm) {
      app.ui.rent.month = ev.target.value;
      app.refresh();
    }
  },
  pages: [
    {
      id: "overview",
      label: "Overview",
      icon: "home",
      type: "overview",
      actions: [
        { id: "l", label: "New listing", new: "listings", primary: true },
        { id: "ld", label: "New lead", new: "leads", icon: "user" },
      ],
      kpis: (db, app) => {
        const openDeals = db.deals.filter((d) => !["Closed", "Lost"].includes(d.stage));
        const closedM = db.deals.filter((d) => d.stage === "Closed" && monthOf(d.closedOn) === thisMonth());
        const active = db.tenancies.filter((t) => t.status === "Active");
        const unpaid = active.filter((t) => !rentFor(app, t, thisMonth()).length);
        return [
          { label: "Available listings", value: db.listings.filter((l) => l.status === "Available").length, note: `${db.listings.filter((l) => l.status === "Available" && l.purpose === "Rent").length} for rent`, icon: "building", go: "listings" },
          { label: "Deals in progress", value: openDeals.length, note: `${crore(sum(openDeals, (d) => d.amount))} PKR`, icon: "board", go: "deals" },
          { label: "Commission this month", value: app.money(sum(closedM, (d) => commissionOf(d, app))), note: `${closedM.length} deals closed`, icon: "money", tone: "good" },
          { label: "Rent not received", value: unpaid.length, note: `of ${active.length} rentals · ${app.money(sum(unpaid, "rent"))}`, icon: "key", tone: unpaid.length ? "warn" : "", go: "rent" },
        ];
      },
      blocks: (db, app) => {
        const up = db.visits.filter((v) => v.status === "Scheduled" && v.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        const fresh = db.leads.filter((l) => l.status === "New").sort((a, b) => b.created - a.created);
        return [
          { title: "Upcoming visits", go: "visits", html: app.list(up.slice(0, 7), (v) => `<li>${app.openLink("visits", v, `<span class="dx-when">${esc(fmtShort(v.date))}<small>${esc(app.time(v.time))}</small></span><span class="dx-li-main"><b>${esc(app.label("leads", v.lead))}</b><small>${esc(app.label("listings", v.listing))}</small></span>`)}</li>`, "No visits booked.") },
          { title: "New leads", go: "leads", html: app.list(fresh.slice(0, 7), (l) => `<li>${app.openLink("leads", l, `<span class="dx-li-main"><b>${esc(l.name)}</b><small>${esc(l.want)} · ${esc(l.type || "any")} · ${esc(l.area || "")}</small></span><b>${esc(crore(l.budget))}</b>`)}</li>`, "No new leads.") },
          { title: "Listings by area", html: barList(groupCount(db.listings.filter((l) => l.status === "Available"), (l) => l.society)) },
          { title: "Deals by stage", html: barList(STAGES.filter((s) => s.value !== "Lost").map((s) => ({ label: s.label, value: db.deals.filter((d) => d.stage === s.value).length }))) },
        ];
      },
    },
    {
      id: "listings",
      label: "Listings",
      icon: "building",
      type: "table",
      entity: "listings",
      sort: "listed",
      dir: -1,
      views: ["cards", "table"],
      cards: (r, app) => `<span class="pp-ph pp-${(r.type || "").split(" ")[0].toLowerCase()}" aria-hidden="true">${app.icon(r.type === "Plot" ? "grid" : "building")}<em>${esc(r.ref)}</em></span><b>${esc(r.title)}</b><small>${esc(r.society)}, ${esc(r.city)} · ${esc(sizeText(r))}${r.beds ? ` · ${r.beds} bed` : ""}</small><span style="font-weight:750">${esc(priceText(r))}</span><span>${app.pill(r.status, LTONE[r.status])} ${app.pill(r.purpose === "Rent" ? "Rent" : "Sale", r.purpose === "Rent" ? "blue" : "purple")}</span><style>.pp-ph{position:relative;display:grid;place-items:center;height:96px;border-radius:10px;background:linear-gradient(135deg,color-mix(in srgb,var(--acc) 22%,var(--panel)),color-mix(in srgb,var(--acc) 6%,var(--panel)));color:var(--acc)}.pp-ph .dx-ico{width:34px;height:34px}.pp-ph em{position:absolute;right:8px;bottom:6px;font-size:11px;font-style:normal;color:var(--ink-2)}</style>`,
      filters: [
        { key: "purpose", label: "Purpose", options: ["Sale", "Rent"] },
        { key: "type", label: "Type", options: TYPES },
        { key: "status", label: "Status", options: ["Available", "Under offer", "Sold", "Rented", "Off market"] },
        { key: "city", label: "City", options: ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar"] },
      ],
      columns: [
        { key: "ref", label: "Ref" },
        { key: "title", label: "Listing", html: (r) => `<b>${esc(r.title)}</b>` },
        { key: "society", label: "Area" },
        { key: "size", label: "Size", get: (r) => sizeText(r), sortValue: (r) => num(r.size) * (r.unit === "Kanal" ? 20 : 1) },
        { key: "price", label: "Demand", right: true, get: (r) => num(r.price), html: (r) => esc(priceText(r)) },
        { key: "status", label: "Status", html: (r, app) => app.pill(r.status, LTONE[r.status]) },
        { key: "listed", label: "Listed", date: true },
      ],
    },
    {
      id: "leads",
      label: "Leads",
      icon: "users",
      type: "table",
      entity: "leads",
      sort: "status",
      filters: [
        { key: "want", label: "Wants to", options: ["Buy", "Rent"] },
        { key: "status", label: "Status", options: ["New", "Contacted", "Visiting", "Negotiating", "Closed", "Lost"] },
        { key: "source", label: "Source", options: ["Walk-in", "Zameen.com", "OLX", "Facebook", "WhatsApp", "Referral", "Signboard"] },
      ],
      columns: [
        { key: "name", label: "Name", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "phone", label: "Mobile" },
        { key: "want", label: "Wants" },
        { key: "type", label: "Type" },
        { key: "area", label: "Areas" },
        { key: "budget", label: "Budget", right: true, get: (r) => num(r.budget), html: (r) => esc(crore(r.budget)) },
        { key: "matches", label: "Matches", right: true, get: (r, app) => matches(app, r).length },
        { key: "status", label: "Status" },
      ],
    },
    {
      id: "deals",
      label: "Deals",
      icon: "board",
      type: "board",
      entity: "deals",
      field: "stage",
      intro: "Drag deals from inquiry to closing. Closing a sale marks the listing Sold; a token marks it Under offer.",
      columns: STAGES,
      where: (r) => r.stage !== "Closed" || r.closedOn >= addDays(today(), -45),
      total: (list, app) => (list.length ? "Commission " + app.moneyShort(sum(list, (d) => commissionOf(d, app))) : ""),
      card: (r, app) => {
        const l = app.find("listings", r.listing) || {};
        return `<b>${esc(l.title || "?")}</b><small>${esc(app.label("leads", r.lead) || "No client yet")}</small><span>PKR ${esc(crore(r.amount || l.price))}</span>${num(r.token) ? `<small>Token ${esc(crore(r.token))}</small>` : ""}`;
      },
      onMove: (r, before, value, app) => {
        if (value === "Closed") r.closedOn = today();
        syncListing(r, app);
      },
    },
    {
      id: "visits",
      label: "Visits",
      icon: "calendar",
      type: "calendar",
      entity: "visits",
      dateKey: "date",
      timeKey: "time",
      hours: [9, 21],
      duration: () => 45,
      tone: (r) => ({ Scheduled: "blue", Done: "green", Cancelled: "gray" })[r.status],
      event: (r, app) => `<b>${esc(app.label("leads", r.lead) || "Visit")}</b><small>${esc(app.find("listings", r.listing)?.society || "")}</small>`,
    },
    {
      id: "rent",
      label: "Rent collection",
      icon: "key",
      type: "custom",
      render: (app, s) => {
        s.month ||= thisMonth();
        const rows = app.db.tenancies.filter((t) => t.status === "Active");
        const paid = rows.filter((t) => rentFor(app, t, s.month).length);
        return `<div class="dx-tools"><label class="dx-inline">Month <select data-rentm="1">${Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), -i)).map((m) => `<option value="${m}" ${m === s.month ? "selected" : ""}>${fmtMonth(m)}</option>`).join("")}</select></label><span>${app.pill(`Received ${paid.length}`, "green")} ${app.pill(`Pending ${rows.length - paid.length}`, "amber")}</span><span class="dx-grow"></span><b>${esc(app.money(sum(paid, (t) => sum(rentFor(app, t, s.month), "amount"))))}</b>&nbsp;of ${esc(app.money(sum(rows, "rent")))}<button type="button" class="dx-btn primary" data-x="new:tenancies">${app.icon("plus")}New rental</button></div><div class="dx-card">${app.list(rows.sort((a, b) => num(a.dueDay) - num(b.dueDay)), (t) => {
          const got = rentFor(app, t, s.month);
          const late = !got.length && s.month === thisMonth() && Number(today().slice(8)) > num(t.dueDay);
          return `<li style="display:flex;align-items:center;gap:8px">${app.openLink("tenancies", t, `<span class="dx-when">Due ${num(t.dueDay)}</span><span class="dx-li-main"><b>${esc(t.tenant)}</b><small>${esc(app.label("listings", t.listing))}</small></span><b>${esc(app.money(t.rent))}</b>${got.length ? app.pill("Received " + fmtShort(got[0].date), "green") : app.pill(late ? "Late" : "Pending", late ? "red" : "amber")}`)}${got.length ? "" : `<button type="button" class="dx-btn" data-x="rentpay:${t.id}">${app.icon("money")}Received</button>${t.phone ? `<button type="button" class="dx-ib" data-x="rentwa:${t.id}" aria-label="WhatsApp ${esc(t.tenant)}">${app.icon("wa")}</button>` : ""}`}</li>`;
        }, "No active rentals.")}</div>`;
      },
      badge: (db, app) => db.tenancies.filter((t) => t.status === "Active" && !db.rentpay.some((p) => p.tenancy === t.id && p.month === thisMonth()) && Number(today().slice(8)) > num(t.dueDay)).length,
    },
    {
      id: "owners",
      label: "Owners",
      icon: "user",
      type: "table",
      entity: "owners",
      sort: "name",
      columns: [
        { key: "name", label: "Owner", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "phone", label: "Mobile" },
        { key: "cnic", label: "CNIC" },
        { key: "listings", label: "Listings", right: true, get: (r, app) => app.db.listings.filter((l) => l.owner === r.id).length },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const comm = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.deals.filter((d) => d.stage === "Closed" && monthOf(d.closedOn) === m), (d) => commissionOf(d, app)) }));
        const rentM = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.rentpay.filter((p) => p.month === m), "amount") }));
        return [
          { title: "Commission earned", note: "closed deals", html: columnChart(comm, { fmt: (v) => app.moneyShort(v) }), table: comm.map((d) => [d.label, app.money(d.value)]) },
          { title: "Rent collected", html: columnChart(rentM, { fmt: (v) => app.moneyShort(v) }), table: rentM.map((d) => [d.label, app.money(d.value)]) },
          { title: "Leads by source", html: barList(groupCount(db.leads, (l) => l.source)) },
          { title: "Listings by type", html: barList(groupCount(db.listings, (l) => l.type)) },
          { title: "Average demand by area", note: "for sale, PKR", html: barList(groupSum(db.listings.filter((l) => l.purpose === "Sale"), (l) => l.society, (l) => l.price).map((x) => ({ ...x, value: x.value / db.listings.filter((l) => l.purpose === "Sale" && l.society === x.label).length })), { fmt: (v) => crore(v) }) },
          { title: "Why deals were lost", html: barList(groupCount(db.deals.filter((d) => d.stage === "Lost"), (d) => d.notes || "Not noted")) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const areas = [["DHA Phase 5", "Lahore"], ["Bahria Town", "Lahore"], ["Johar Town", "Lahore"], ["Gulberg III", "Lahore"], ["Model Town", "Lahore"], ["Wapda Town", "Lahore"], ["Bahria Town Phase 8", "Rawalpindi"], ["DHA Phase 2", "Islamabad"]];
    const owners = Array.from({ length: 14 }, (_, i) => ({ id: "o" + i, name: h.person(), phone: h.phone(), cnic: `35202-${h.int(1000000, 9999999)}-${h.int(1, 9)}` }));
    const listings = Array.from({ length: 38 }, (_, i) => {
      const [society, city] = h.pick(areas);
      const type = h.pick(["House", "House", "House", "Plot", "Plot", "Flat / apartment", "Shop", "Portion"]);
      const purpose = type === "Plot" ? "Sale" : h.rand() < 0.35 ? "Rent" : "Sale";
      const size = type === "Flat / apartment" ? h.pick([850, 1100, 1450]) : h.pick([5, 7, 10, 10, 1, 2]);
      const unit = type === "Flat / apartment" ? "Sq ft" : size <= 2 ? "Kanal" : "Marla";
      const marlas = unit === "Kanal" ? size * 20 : unit === "Sq ft" ? size / 225 : size;
      const price = purpose === "Rent" ? Math.round((marlas * h.int(9, 16) * 1000) / 1000) * 1000 : Math.round((marlas * h.int(45, 95) * 100000) / 100000) * 100000;
      const status = i < 26 ? "Available" : h.pick(["Sold", "Rented", "Under offer", "Off market"]);
      return { id: "l" + i, title: `${size} ${unit} ${type.toLowerCase()}${type === "Plot" ? "" : ""}, ${society}`, ref: "ZP-" + String(i + 1).padStart(4, "0"), purpose, type, society, city, size, unit, price, beds: ["House", "Flat / apartment", "Portion"].includes(type) ? h.int(2, 6) : "", baths: ["House", "Flat / apartment", "Portion"].includes(type) ? h.int(2, 6) : "", status: purpose === "Rent" && status === "Sold" ? "Rented" : purpose === "Sale" && status === "Rented" ? "Sold" : status, owner: h.pick(owners).id, features: h.pick(["Corner, park facing", "Near mosque and market", "Gas available, servant quarter", "Possession ready", "Double unit, basement"]), listed: h.day(-h.int(0, 120)) };
    });
    const leads = Array.from({ length: 30 }, (_, i) => {
      const want = h.rand() < 0.35 ? "Rent" : "Buy";
      const [society] = h.pick(areas);
      return { id: "ld" + i, name: h.person(), phone: h.phone(), want, type: h.pick(["House", "Plot", "Flat / apartment", ""]), area: society.split(" Phase")[0], size: h.pick(["5 Marla", "10 Marla", "1 Kanal", ""]), budget: want === "Rent" ? h.int(6, 25) * 10000 : h.int(15, 120) * 1000000, source: h.pick(["Walk-in", "Zameen.com", "OLX", "Facebook", "WhatsApp", "Referral", "Signboard"]), status: h.pick(["New", "New", "Contacted", "Visiting", "Negotiating", "Closed", "Lost"]) };
    });
    const deals = Array.from({ length: 16 }, (_, i) => {
      const l = h.pick(listings);
      const stage = h.pick(["Inquiry", "Visit", "Offer", "Token", "Closed", "Closed", "Lost"]);
      return { listing: l.id, lead: h.pick(leads).id, stage, amount: l.price - (l.purpose === "Sale" ? h.int(0, 5) * 100000 : 0), token: ["Token", "Closed"].includes(stage) ? Math.round(l.price * 0.05) : 0, commission: 1, closedOn: stage === "Closed" ? h.day(-h.int(0, 150)) : "", notes: stage === "Lost" ? h.pick(["Price too high", "Bought elsewhere", "Family did not agree"]) : "" };
    });
    const visits = Array.from({ length: 22 }, () => {
      const d = h.int(-10, 8);
      return { listing: h.pick(listings).id, lead: h.pick(leads).id, date: h.day(d), time: h.pick(["11:00", "13:00", "15:00", "16:30", "18:00"]), status: d < 0 ? h.pick(["Done", "Done", "Cancelled"]) : "Scheduled", feedback: d < 0 ? h.pick(["Liked it", "Wants lower price", "Too small", ""]) : "" };
    });
    const rented = listings.filter((l) => l.purpose === "Rent").slice(0, 9);
    const tenancies = rented.map((l, i) => ({ id: "t" + i, listing: l.id, tenant: h.person(), phone: h.phone(), rent: l.price, dueDay: h.pick([1, 5, 10]), start: h.day(-h.int(60, 300)), end: h.day(h.int(60, 300)), deposit: l.price * 2, status: "Active" }));
    for (const l of rented) l.status = "Rented";
    const rentpay = [];
    for (const t of tenancies) for (let k = 5; k >= 0; k--) {
      const m = addMonths(thisMonth(), -k);
      if (k === 0 && h.rand() < 0.45) continue;
      rentpay.push({ tenancy: t.id, month: m, amount: t.rent, date: `${m}-${String(Math.min(28, t.dueDay + h.int(0, 4))).padStart(2, "0")}`, method: h.pick(["Cash", "Bank transfer", "JazzCash"]) });
    }
    return { owners, listings, leads, deals, visits, tenancies, rentpay: rentpay.filter((p) => p.date <= today()) };
  },
});

function syncListing(d, app) {
  const l = app.find("listings", d.listing);
  if (!l) return;
  if (d.stage === "Closed") l.status = l.purpose === "Rent" ? "Rented" : "Sold";
  else if (d.stage === "Token") l.status = "Under offer";
  const lead = app.find("leads", d.lead);
  if (lead && d.stage === "Closed") lead.status = "Closed";
}
function recordRent(app, t, month) {
  const a = prompt(`Rent received from ${t.tenant} for ${fmtMonth(month)}:`, String(t.rent));
  if (a === null) return "keep";
  app.upsert("rentpay", { tenancy: t.id, month, amount: num(a), date: today(), method: "Cash" });
  app.toast(`Rent of ${app.money(a)} recorded.`);
}
function printFlyer(r, app) {
  app.print("For " + r.purpose.toLowerCase(), `<h2 style="font-size:24px;margin:12px 0 4px">${esc(r.title)}</h2><p style="font-size:16px">${esc(r.society)}, ${esc(r.city)}</p><div class="dx-doc-meta" style="font-size:14px"><div><b>Type:</b> ${esc(r.type)}</div><div><b>Size:</b> ${esc(sizeText(r))}</div>${r.beds ? `<div><b>Bedrooms:</b> ${esc(r.beds)}</div><div><b>Bathrooms:</b> ${esc(r.baths || "")}</div>` : ""}<div><b>Demand:</b> ${esc(priceText(r))}</div><div><b>Ref:</b> ${esc(r.ref)}</div></div>${r.features ? `<p style="font-size:14px">${esc(r.features)}</p>` : ""}<p style="font-size:18px;margin-top:24px"><b>Call / WhatsApp:</b> ${esc(app.setting("phone"))}</p>`);
}
function printToken(d, app) {
  const l = app.find("listings", d.listing) || {};
  const c = app.find("leads", d.lead) || {};
  app.print("Token receipt", `<p>Received with thanks from <b>${esc(c.name || "")}</b> (${esc(c.phone || "")}) a token / bayana of <b>${esc(app.money(d.token))}</b> against the property <b>${esc(l.title || "")}</b>, ref ${esc(l.ref || "")}, at an agreed price of <b>${esc(app.money(d.amount || l.price))}</b>.</p><p>Date: ${esc(app.date(today()))}</p><div style="display:flex;justify-content:space-between;margin-top:50px"><span>Buyer ____________</span><span>Seller ____________</span><span>Dealer ____________</span></div>`);
}

export default app;
