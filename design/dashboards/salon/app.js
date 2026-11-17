// Salon: today's chairs board, bookings calendar, checkout with stylist, tip and discount, clients, services,
// staff commission, prepaid packages and reports.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, nowTime, num, sum, groupSum, groupCount, columnChart, barList } from "../shared/dash.js";

const CATS = ["Hair", "Colour", "Skin & facial", "Nails", "Waxing & threading", "Makeup", "Bridal", "Massage"];
const FLOW = [
  { value: "Booked", label: "Booked", tone: "blue" },
  { value: "Arrived", label: "Arrived", tone: "amber" },
  { value: "In chair", label: "In chair", tone: "purple" },
  { value: "Done", label: "Done", tone: "green" },
  { value: "No-show", label: "No-show", tone: "red" },
];
const FTONE = Object.fromEntries(FLOW.map((s) => [s.value, s.tone]));
const saleTotal = (s) => num(s.total);

const app = createApp({
  id: "salon",
  title: "Salon dashboard",
  brand: "Glow Beauty Lounge",
  icon: "scissors",
  accent: "#be185d",
  settings: [
    { key: "business", label: "Salon name", type: "text", default: "Glow Beauty Lounge" },
    { key: "phone", label: "Phone", type: "phone", default: "0300 5556667" },
    { key: "address", label: "Address", type: "text", default: "MM Alam Road, Lahore" },
    { key: "tax", label: "Tax on services (%)", type: "percent", default: 0 },
  ],
  entities: {
    bookings: {
      label: "Bookings",
      one: "Booking",
      search: [(r, app) => app.label("clients", r.client), (r, app) => app.label("services", r.service), (r, app) => app.label("staff", r.staff)],
      title: (r, app) => `${app.label("clients", r.client) || "Client"} · ${app.label("services", r.service)}`,
      badge: (r, app) => app.pill(r.status, FTONE[r.status]),
      fields: [
        { key: "client", label: "Client", type: "relation", entity: "clients", required: true },
        { key: "service", label: "Service", type: "relation", entity: "services", required: true },
        { key: "staff", label: "Stylist", type: "relation", entity: "staff" },
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "time", label: "Time", type: "time", required: true, default: "15:00" },
        { key: "status", label: "Status", type: "select", options: FLOW, default: "Booked" },
        { key: "notes", label: "Notes", type: "text" },
      ],
      beforeSave: (r, before, app) => {
        const clash = r.staff && app.db.bookings.find((x) => x.id !== r.id && x.staff === r.staff && x.date === r.date && x.time === r.time && x.status !== "No-show");
        if (clash && !confirm(`${app.label("staff", r.staff)} already has a booking at ${app.time(r.time)}. Book anyway?`)) return "Not saved.";
      },
      actions: [
        { label: "Arrived", icon: "check", primary: true, when: (r) => r.status === "Booked", run: (r) => (r.status = "Arrived") },
        { label: "In chair", icon: "scissors", primary: true, when: (r) => r.status === "Arrived", run: (r) => (r.status = "In chair") },
        { label: "Check out", icon: "money", primary: true, when: (r) => ["Arrived", "In chair", "Done"].includes(r.status), run: (r, app) => checkout(app, r) },
        { label: "No-show", icon: "close", when: (r) => r.status === "Booked", run: (r) => (r.status = "No-show") },
        {
          label: "WhatsApp reminder",
          icon: "wa",
          when: (r, app) => app.find("clients", r.client)?.phone,
          run: (r, app) => {
            const c = app.find("clients", r.client);
            app.whatsapp(c.phone, `Hi ${c.name}, a reminder of your ${app.label("services", r.service)} at ${app.setting("business")} on ${fmtShort(r.date)} at ${app.time(r.time)}${r.staff ? " with " + app.label("staff", r.staff) : ""}. Reply to change it.`);
            return "keep";
          },
        },
      ],
    },
    sales: {
      label: "Sales",
      one: "Sale",
      search: ["no", (r, app) => app.label("clients", r.client), (r, app) => app.label("staff", r.staff)],
      title: (r) => `Sale ${r.no}`,
      fields: [
        { key: "no", label: "Receipt no.", type: "text" },
        { key: "date", label: "Date", type: "date", default: today },
        { key: "client", label: "Client", type: "relation", entity: "clients" },
        { key: "staff", label: "Stylist", type: "relation", entity: "staff" },
        { key: "lines", label: "Services and products", type: "lines", catalog: "services", priceKey: "price", itemLabel: "Service" },
        { key: "discount", label: "Discount (PKR)", type: "money" },
        { key: "tip", label: "Tip (PKR)", type: "money" },
        { key: "method", label: "Paid by", type: "select", options: ["Cash", "Card", "JazzCash", "Easypaisa"], default: "Cash" },
      ],
      beforeSave: (r, before, app) => {
        const sub = app.linesTotal(r.lines);
        const disc = Math.min(sub, num(r.discount));
        r.tax = Math.round(((sub - disc) * num(app.setting("tax"))) / 100);
        r.total = sub - disc + r.tax + num(r.tip);
        r.sub = sub;
        if (!r.no) r.no = app.nextNo("sales", "R-");
      },
      actions: [{ label: "Print receipt", icon: "print", primary: true, run: (r, app) => (printReceipt(r, app), "keep") }],
    },
    clients: {
      label: "Clients",
      one: "Client",
      search: ["name", "phone"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "birthday", label: "Birthday", type: "date" },
        { key: "skin", label: "Skin / hair notes", type: "text", placeholder: "e.g. sensitive skin, dye 5.0" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [
        { label: "Book", icon: "calendar", primary: true, run: (r, app) => (app.open("bookings", "", true, { client: r.id }), "keep") },
        { label: "WhatsApp", icon: "wa", when: (r) => r.phone, run: (r, app) => (app.whatsapp(r.phone, `Hi ${r.name}! ${app.setting("business")} here.`), "keep") },
      ],
      related: (r, app) => {
        const sales = app.db.sales.filter((s) => s.client === r.id).sort((a, b) => b.date.localeCompare(a.date));
        const pk = app.db.packages.filter((p) => p.client === r.id);
        return `<div class="dx-related"><h3>Visits (${sales.length}) · spent ${esc(app.money(sum(sales, saleTotal)))}</h3>${app.list(sales.slice(0, 8), (s) => `<li>${app.openLink("sales", s, `<span class="dx-when">${esc(fmtShort(s.date))}</span><span class="dx-li-main"><b>${esc((s.lines || []).map((l) => l.name).join(", "))}</b><small>${esc(app.label("staff", s.staff))}</small></span><b>${esc(app.money(saleTotal(s)))}</b>`)}</li>`, "No visits yet.")}</div>${pk.length ? `<div class="dx-related"><h3>Packages</h3>${app.list(pk, (p) => `<li>${app.openLink("packages", p, `<span class="dx-li-main"><b>${esc(p.name)}</b><small>${num(p.sessions) - num(p.used)} of ${num(p.sessions)} sessions left</small></span>`)}</li>`)}</div>` : ""}`;
      },
    },
    services: {
      label: "Services",
      one: "Service",
      search: ["name", "category"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Service", type: "text", required: true },
        { key: "category", label: "Category", type: "select", options: CATS, required: true },
        { key: "duration", label: "Minutes", type: "number", default: 45 },
        { key: "price", label: "Price (PKR)", type: "money", required: true },
      ],
    },
    staff: {
      label: "Staff",
      one: "Staff member",
      search: ["name", "role", "phone"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "role", label: "Role", type: "select", options: ["Senior stylist", "Stylist", "Beautician", "Makeup artist", "Nail technician", "Trainee"] },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "commission", label: "Commission (%)", type: "percent", default: 20 },
        { key: "off", label: "Day off", type: "select", options: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
      ],
      related: (r, app) => {
        const m = app.db.sales.filter((s) => s.staff === r.id && monthOf(s.date) === thisMonth());
        const work = sum(m, (s) => num(s.sub) - num(s.discount));
        return `<div class="dx-related"><h3>This month</h3><dl class="dx-dl"><div><dt>Clients served</dt><dd>${m.length}</dd></div><div><dt>Service sales</dt><dd>${esc(app.money(work))}</dd></div><div><dt>Commission (${num(r.commission)}%)</dt><dd>${esc(app.money((work * num(r.commission)) / 100))}</dd></div><div><dt>Tips</dt><dd>${esc(app.money(sum(m, "tip")))}</dd></div></dl></div>`;
      },
    },
    packages: {
      label: "Packages",
      one: "Package",
      search: ["name", (r, app) => app.label("clients", r.client)],
      title: (r, app) => `${r.name} · ${app.label("clients", r.client)}`,
      fields: [
        { key: "client", label: "Client", type: "relation", entity: "clients", required: true },
        { key: "name", label: "Package", type: "text", required: true, placeholder: "e.g. 6 facials" },
        { key: "sessions", label: "Sessions", type: "number", default: 6 },
        { key: "used", label: "Used", type: "number", default: 0 },
        { key: "price", label: "Price paid (PKR)", type: "money" },
        { key: "expiry", label: "Valid until", type: "date", default: () => addDays(today(), 180) },
      ],
      actions: [
        {
          label: "Use one session",
          icon: "check",
          primary: true,
          when: (r) => num(r.used) < num(r.sessions),
          run: (r, app) => {
            r.used = num(r.used) + 1;
            app.toast(`${num(r.sessions) - r.used} sessions left.`);
          },
        },
      ],
    },
  },
  onChange: (ev, app) => {
    const t = ev.target;
    if (!t.dataset.tf) return;
    const [p, k] = t.dataset.tf.split(":");
    app.ui[p][k] = t.value;
  },
  pages: [
    {
      id: "overview",
      label: "Overview",
      icon: "home",
      type: "overview",
      actions: [
        { id: "b", label: "New booking", new: "bookings", primary: true },
        { id: "co", label: "Checkout", icon: "money", run: (app) => app.go("checkout") },
      ],
      kpis: (db, app) => {
        const t = db.bookings.filter((b) => b.date === today());
        const st = db.sales.filter((s) => s.date === today());
        const m = db.sales.filter((s) => monthOf(s.date) === thisMonth());
        return [
          { label: "Bookings today", value: t.length, note: `${t.filter((b) => b.status === "Done").length} done · ${t.filter((b) => ["Arrived", "In chair"].includes(b.status)).length} in salon`, icon: "calendar", go: "today" },
          { label: "Takings today", value: app.money(sum(st, saleTotal)), note: `${st.length} receipts`, icon: "money" },
          { label: "This month", value: app.moneyShort(sum(m, saleTotal)), note: `${m.length} clients served`, icon: "chart" },
          { label: "Birthdays this week", value: db.clients.filter((c) => c.birthday && Array.from({ length: 7 }, (_, i) => addDays(today(), i).slice(5)).includes(c.birthday.slice(5))).length, icon: "star", go: "clients" },
        ];
      },
      blocks: (db, app) => {
        const t = db.bookings.filter((b) => b.date === today()).sort((a, b) => a.time.localeCompare(b.time));
        const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
        const per = days.map((d) => ({ label: fmtShort(d), value: sum(db.sales.filter((s) => s.date === d), saleTotal) }));
        const bday = db.clients.filter((c) => c.birthday && Array.from({ length: 7 }, (_, i) => addDays(today(), i).slice(5)).includes(c.birthday.slice(5)));
        return [
          { title: "Today's appointments", go: "today", html: app.list(t, (b) => `<li>${app.openLink("bookings", b, `<span class="dx-when">${esc(app.time(b.time))}</span><span class="dx-li-main"><b>${esc(app.label("clients", b.client))}</b><small>${esc(app.label("services", b.service))} · ${esc(app.label("staff", b.staff) || "anyone")}</small></span>${app.pill(b.status, FTONE[b.status])}`)}</li>`, "No bookings today.") },
          { title: "Takings per day", note: "last 14 days", html: columnChart(per, { fmt: (v) => app.moneyShort(v) }), table: per.map((d) => [d.label, app.money(d.value)]) },
          { title: "Top services", note: "this month", html: barList(groupSum(db.sales.filter((s) => monthOf(s.date) === thisMonth()).flatMap((s) => s.lines || []), (l) => l.name, (l) => num(l.qty) * num(l.price)), { fmt: (v) => app.moneyShort(v) }) },
          {
            title: "Birthdays this week",
            note: "send a wish or an offer",
            html: app.list(bday, (c) => `<li>${app.openLink("clients", c, `<span class="dx-when">${esc(fmtShort(c.birthday.replace(/^\d{4}/, today().slice(0, 4))))}</span><span class="dx-li-main"><b>${esc(c.name)}</b><small>${esc(c.phone || "")}</small></span>`)}</li>`, "No birthdays this week."),
          },
        ];
      },
    },
    {
      id: "today",
      label: "Today",
      icon: "board",
      type: "board",
      entity: "bookings",
      field: "status",
      intro: "Move clients along as they arrive and finish. Open a booking to check out.",
      columns: FLOW,
      where: (r) => r.date === today(),
      order: (a, b) => a.time.localeCompare(b.time),
      card: (r, app) => `<b>${esc(app.label("clients", r.client))}</b><small>${esc(app.time(r.time))} · ${esc(app.label("services", r.service))}</small><small>${esc(app.label("staff", r.staff) || "Any stylist")}</small>`,
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: "calendar",
      type: "calendar",
      entity: "bookings",
      dateKey: "date",
      timeKey: "time",
      hours: [10, 22],
      duration: (r, app) => num(app.find("services", r.service)?.duration) || 45,
      tone: (r) => FTONE[r.status],
      event: (r, app) => `<b>${esc(app.label("clients", r.client))}</b><small>${esc(app.label("services", r.service))} · ${esc(app.label("staff", r.staff) || "")}</small>`,
    },
    {
      id: "checkout",
      label: "Checkout",
      icon: "money",
      type: "pos",
      catalog: "services",
      catKey: "category",
      priceKey: "price",
      taxKey: "tax",
      tip: true,
      ticketTitle: "Bill",
      itemNote: (r) => `${num(r.duration)} min`,
      ticketFields: (app, s) => `<div class="dx-tfields"><select data-tf="checkout:client" aria-label="Client"><option value="">Walk-in client</option>${app.db.clients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => `<option value="${c.id}" ${s.client === c.id ? "selected" : ""}>${esc(c.name)}</option>`)
        .join("")}</select><select data-tf="checkout:staff" aria-label="Stylist"><option value="">Stylist</option>${app.db.staff.map((c) => `<option value="${c.id}" ${s.staff === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>`,
      complete: (app, s, sale) => {
        const r = app.upsert("sales", { no: app.nextNo("sales", "R-"), date: today(), time: nowTime(), client: s.client || "", staff: s.staff || "", lines: sale.lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })), sub: sale.sub, discount: sale.disc, tax: sale.tax, tip: sale.tip, total: sale.total, method: sale.method });
        if (s.booking) {
          const b = app.find("bookings", s.booking);
          if (b) b.status = "Done";
          s.booking = "";
        }
        s.client = s.staff = "";
        return { ...sale, no: r.no, rec: r };
      },
      receipt: (sale, app) => receiptHtml(sale.rec, app),
    },
    {
      id: "clients",
      label: "Clients",
      icon: "users",
      type: "table",
      entity: "clients",
      sort: "name",
      columns: [
        { key: "name", label: "Client", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "phone", label: "Mobile" },
        { key: "visits", label: "Visits", right: true, get: (r, app) => app.db.sales.filter((s) => s.client === r.id).length },
        { key: "spent", label: "Spent", right: true, get: (r, app) => sum(app.db.sales.filter((s) => s.client === r.id), saleTotal), html: (r, app) => esc(app.moneyShort(sum(app.db.sales.filter((s) => s.client === r.id), saleTotal))) },
        { key: "last", label: "Last visit", get: (r, app) => app.db.sales.filter((s) => s.client === r.id).map((s) => s.date).sort().pop() || "", html: (r, app) => esc(app.date(app.db.sales.filter((s) => s.client === r.id).map((s) => s.date).sort().pop() || "")) },
        { key: "birthday", label: "Birthday", html: (r) => esc(r.birthday ? fmtShort(r.birthday) : "") },
      ],
    },
    {
      id: "sales",
      label: "Sales",
      icon: "receipt",
      type: "table",
      entity: "sales",
      sort: "date",
      dir: -1,
      importCsv: false,
      filters: [
        { key: "staff", label: "Stylist", options: (app) => app.db.staff.map((s) => ({ value: s.id, label: s.name })) },
        { key: "month", label: "Month", options: () => Array.from({ length: 6 }, (_, i) => ({ value: addMonths(thisMonth(), -i), label: fmtMonth(addMonths(thisMonth(), -i)) })), test: (r, v) => monthOf(r.date) === v },
      ],
      total: (rows, app) => `Total <b>${esc(app.money(sum(rows, saleTotal)))}</b> · tips <b>${esc(app.money(sum(rows, "tip")))}</b>`,
      columns: [
        { key: "no", label: "Receipt", html: (r) => `<b>${esc(r.no)}</b>` },
        { key: "date", label: "Date", date: true },
        { key: "client", label: "Client" },
        { key: "staff", label: "Stylist" },
        { key: "items", label: "Services", get: (r) => (r.lines || []).map((l) => l.name).join(", ") },
        { key: "total", label: "Total", money: true, right: true },
        { key: "method", label: "Paid by" },
      ],
    },
    {
      id: "staff",
      label: "Staff & commission",
      icon: "user",
      type: "table",
      entity: "staff",
      sort: "name",
      intro: "Commission is worked out on service sales after discount, for this month.",
      columns: [
        { key: "name", label: "Name", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "role", label: "Role" },
        { key: "clients", label: "Clients", right: true, get: (r, app) => app.db.sales.filter((s) => s.staff === r.id && monthOf(s.date) === thisMonth()).length },
        { key: "sales", label: "Sales", right: true, get: (r, app) => sum(app.db.sales.filter((s) => s.staff === r.id && monthOf(s.date) === thisMonth()), (s) => num(s.sub) - num(s.discount)), html: (r, app) => esc(app.money(sum(app.db.sales.filter((s) => s.staff === r.id && monthOf(s.date) === thisMonth()), (s) => num(s.sub) - num(s.discount)))) },
        { key: "commission", label: "Rate", right: true, html: (r) => num(r.commission) + "%" },
        { key: "earned", label: "Commission", right: true, get: (r, app) => (sum(app.db.sales.filter((s) => s.staff === r.id && monthOf(s.date) === thisMonth()), (s) => num(s.sub) - num(s.discount)) * num(r.commission)) / 100, html: (r, app) => esc(app.money((sum(app.db.sales.filter((s) => s.staff === r.id && monthOf(s.date) === thisMonth()), (s) => num(s.sub) - num(s.discount)) * num(r.commission)) / 100)) },
        { key: "tips", label: "Tips", right: true, get: (r, app) => sum(app.db.sales.filter((s) => s.staff === r.id && monthOf(s.date) === thisMonth()), "tip"), html: (r, app) => esc(app.money(sum(app.db.sales.filter((s) => s.staff === r.id && monthOf(s.date) === thisMonth()), "tip"))) },
      ],
    },
    {
      id: "services",
      label: "Services",
      icon: "list",
      type: "table",
      entity: "services",
      sort: "category",
      filters: [{ key: "category", label: "Category", options: CATS }],
      columns: [
        { key: "name", label: "Service", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "category", label: "Category" },
        { key: "duration", label: "Minutes", right: true },
        { key: "price", label: "Price", money: true, right: true },
      ],
    },
    {
      id: "packages",
      label: "Packages",
      icon: "star",
      type: "table",
      entity: "packages",
      sort: "expiry",
      columns: [
        { key: "client", label: "Client" },
        { key: "name", label: "Package", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "left", label: "Sessions left", right: true, get: (r) => num(r.sessions) - num(r.used) },
        { key: "price", label: "Paid", money: true, right: true },
        { key: "expiry", label: "Valid until", date: true },
        { key: "state", label: "Status", html: (r, app) => (num(r.used) >= num(r.sessions) ? app.pill("Used up", "gray") : r.expiry < today() ? app.pill("Expired", "red") : app.pill("Active", "green")) },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const rev = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.sales.filter((s) => monthOf(s.date) === m), saleTotal) }));
        const svc = Object.fromEntries(db.services.map((s) => [s.name, s.category]));
        const lines = db.sales.filter((s) => s.date >= addDays(today(), -90)).flatMap((s) => s.lines || []);
        const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({ label: d, value: db.sales.filter((s) => new Date(s.date + "T12:00").toLocaleDateString("en-US", { weekday: "short" }) === d).length }));
        return [
          { title: "Takings by month", html: columnChart(rev, { fmt: (v) => app.moneyShort(v) }), table: rev.map((d) => [d.label, app.money(d.value)]) },
          { title: "By service category", note: "90 days", html: barList(groupSum(lines, (l) => svc[l.name] || "Other", (l) => num(l.qty) * num(l.price)), { fmt: (v) => app.moneyShort(v) }) },
          { title: "By stylist", note: "90 days", html: barList(groupSum(db.sales.filter((s) => s.date >= addDays(today(), -90)), (s) => app.label("staff", s.staff) || "Not set", saleTotal), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Busiest days", html: barList(wd.sort((a, b) => b.value - a.value), { max: 7 }) },
          { title: "Payment methods", html: barList(groupCount(db.sales, (s) => s.method)) },
          { title: "No-shows", note: "90 days", html: barList(groupCount(db.bookings.filter((b) => b.status === "No-show" && b.date >= addDays(today(), -90)), (b) => app.label("services", b.service))) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const list = [
      ["Haircut", "Hair", 45, 1500],
      ["Blow dry", "Hair", 30, 1200],
      ["Keratin treatment", "Hair", 150, 18000],
      ["Hair colour (full)", "Colour", 120, 8500],
      ["Highlights", "Colour", 150, 12000],
      ["Root touch-up", "Colour", 60, 4000],
      ["Whitening facial", "Skin & facial", 60, 4500],
      ["Hydra facial", "Skin & facial", 75, 7000],
      ["Manicure", "Nails", 40, 2000],
      ["Pedicure", "Nails", 50, 2500],
      ["Gel nails", "Nails", 60, 3500],
      ["Full arms wax", "Waxing & threading", 30, 1500],
      ["Eyebrow threading", "Waxing & threading", 10, 300],
      ["Party makeup", "Makeup", 60, 6000],
      ["Bridal makeup", "Bridal", 180, 45000],
      ["Head massage", "Massage", 30, 1500],
    ];
    const services = list.map(([name, category, duration, price], i) => ({ id: "s" + i, name, category, duration, price }));
    const staff = [
      ["Rabia", "Senior stylist", 25],
      ["Hina", "Makeup artist", 30],
      ["Sobia", "Beautician", 20],
      ["Kiran", "Nail technician", 20],
      ["Nimra", "Trainee", 10],
    ].map(([name, role, commission], i) => ({ id: "st" + i, name, role, commission, phone: h.phone(), off: h.pick(["Mon", "Tue"]) }));
    const clients = Array.from({ length: 48 }, (_, i) => ({ id: "c" + i, name: h.person("f"), phone: h.phone(), birthday: `${h.int(1975, 2005)}-${i < 3 ? today().slice(5, 7) : String(h.int(1, 12)).padStart(2, "0")}-${i < 3 ? addDays(today(), i + 1).slice(8) : String(h.int(1, 28)).padStart(2, "0")}` }));
    const bookings = [];
    const sales = [];
    let n = 0;
    for (let d = -60; d <= 7; d++) {
      const cnt = d === 0 ? 10 : h.int(5, 12);
      for (let k = 0; k < cnt; k++) {
        const s = h.pick(services.filter((x) => x.price < 20000 || h.rand() < 0.1));
        const st = h.pick(staff);
        const c = h.pick(clients);
        const time = h.pick(["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]);
        let status = d < 0 ? (h.rand() < 0.07 ? "No-show" : "Done") : d === 0 ? (time < nowTime() ? h.pick(["Done", "Done", "In chair"]) : h.pick(["Booked", "Booked", "Arrived"])) : "Booked";
        bookings.push({ client: c.id, service: s.id, staff: st.id, date: h.day(d), time, status });
        if (status === "Done") {
          const tip = h.rand() < 0.3 ? h.pick([200, 300, 500]) : 0;
          const extra = h.rand() < 0.25 ? [{ name: "Eyebrow threading", qty: 1, price: 300 }] : [];
          const lines = [{ name: s.name, qty: 1, price: s.price }, ...extra];
          const sub = lines.reduce((a, l) => a + l.price, 0);
          n++;
          sales.push({ no: "R-" + String(n).padStart(4, "0"), date: h.day(d), client: c.id, staff: st.id, lines, sub, discount: 0, tax: 0, tip, total: sub + tip, method: h.pick(["Cash", "Cash", "Card", "JazzCash"]) });
        }
      }
    }
    const packages = Array.from({ length: 8 }, () => {
      const sessions = h.pick([4, 6, 10]);
      return { client: h.pick(clients).id, name: `${sessions} ${h.pick(["facials", "manicures", "blow dries"])}`, sessions, used: h.int(0, sessions), price: sessions * 3000, expiry: h.day(h.int(-20, 160)) };
    });
    return { services, staff, clients, bookings, sales, packages };
  },
});

function checkout(app, b) {
  const s = (app.ui.checkout ||= { ticket: [], cat: "All", disc: 0 });
  const svc = app.find("services", b.service);
  s.ticket = svc ? [{ ref: svc.id, name: svc.name, price: num(svc.price), qty: 1 }] : [];
  s.client = b.client;
  s.staff = b.staff;
  s.booking = b.id;
  app.closeDrawer();
  app.go("checkout");
  return "keep";
}
function receiptHtml(r, app) {
  return `<div class="dx-doc-meta"><div><b>Receipt:</b> ${esc(r.no)}</div><div><b>Date:</b> ${esc(app.date(r.date))}</div><div><b>Client:</b> ${esc(app.label("clients", r.client) || "Walk-in")}</div><div><b>Stylist:</b> ${esc(app.label("staff", r.staff) || "—")}</div></div>${app.receiptLines({ lines: r.lines || [], sub: num(r.sub) || app.linesTotal(r.lines), disc: num(r.discount), tax: num(r.tax), taxRate: num(app.setting("tax")), tip: num(r.tip), total: num(r.total), method: r.method })}<p style="text-align:center;margin-top:16px">Thank you for visiting ${esc(app.setting("business"))}!</p>`;
}
function printReceipt(r, app) {
  app.print("Receipt", receiptHtml(r, app));
}

export default app;
