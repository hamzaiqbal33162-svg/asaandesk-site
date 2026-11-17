// Restaurant: POS for dine-in, takeaway and delivery (GST, receipt), kitchen board, table floor plan,
// reservations, menu, order history and reports.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, nowTime, num, sum, groupSum, groupCount, columnChart, lineChart, barList } from "../shared/dash.js";

const CATS = ["Starters", "BBQ", "Karahi & handi", "Rice", "Bread", "Fast food", "Drinks", "Desserts"];
const KITCHEN = [
  { value: "New", label: "New", tone: "blue" },
  { value: "Cooking", label: "Cooking", tone: "amber" },
  { value: "Ready", label: "Ready", tone: "green" },
  { value: "Served", label: "Served / sent", tone: "gray" },
];
const KTONE = Object.fromEntries(KITCHEN.map((s) => [s.value, s.tone]));
const minsAgo = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  const [nh, nm] = nowTime().split(":").map(Number);
  return Math.max(0, nh * 60 + nm - (h * 60 + m));
};
const openOrder = (app, tableId) => app.db.orders.find((o) => o.table === tableId && o.date === today() && !o.paid);
const tableState = (app, t) => {
  if (openOrder(app, t.id)) return ["Occupied", "red"];
  const until = (time) => {
    const [h, m] = String(time).split(":").map(Number);
    const [nh, nm] = nowTime().split(":").map(Number);
    return h * 60 + m - (nh * 60 + nm);
  };
  // A booking for this table that starts within the next hour (or started up to 15 minutes ago).
  const soon = app.db.reservations.find((r) => r.table === t.id && r.date === today() && r.status === "Booked" && until(r.time) >= -15 && until(r.time) <= 60);
  if (t.status === "Occupied") return ["Occupied", "red"];
  if (t.status === "Cleaning") return ["Cleaning", "amber"];
  if (soon || t.status === "Reserved") return ["Reserved", "purple"];
  return ["Free", "green"];
};
const orderTotal = (o) => num(o.total) || 0;

function makeOrder(app, s, sale, paid) {
  const type = s.otype || "Dine-in";
  const order = app.upsert("orders", {
    no: app.nextNo("orders", "#"),
    date: today(),
    time: nowTime(),
    type,
    table: type === "Dine-in" ? s.table || "" : "",
    customer: s.cname || "",
    phone: s.cphone || "",
    address: s.caddr || "",
    lines: sale.lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
    discount: sale.disc,
    tax: sale.tax,
    total: sale.total,
    status: "New",
    paid,
    method: paid ? sale.method : "",
  });
  s.table = "";
  s.cname = s.cphone = s.caddr = "";
  return order;
}

const app = createApp({
  id: "restaurant",
  title: "Restaurant dashboard",
  brand: "Lahori Darbar",
  icon: "chef",
  accent: "#b91c1c",
  settings: [
    { key: "business", label: "Restaurant name", type: "text", default: "Lahori Darbar" },
    { key: "phone", label: "Phone", type: "phone", default: "042 35761234" },
    { key: "address", label: "Address", type: "text", default: "Food Street, Fort Road, Lahore" },
    { key: "tax", label: "GST (%)", type: "percent", default: 16, hint: "Set 0 if you do not charge GST." },
    { key: "delivery", label: "Delivery charge (PKR)", type: "money", default: 150 },
    { key: "ntn", label: "NTN / STRN", type: "text" },
  ],
  entities: {
    menu: {
      label: "Menu items",
      one: "Menu item",
      search: ["name", "category"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Dish", type: "text", required: true },
        { key: "category", label: "Category", type: "select", options: CATS, required: true },
        { key: "price", label: "Price (PKR)", type: "money", required: true },
        { key: "available", label: "Available today", type: "bool", default: true },
        { key: "note", label: "Note", type: "text", placeholder: "e.g. serves 2, spicy" },
      ],
      actions: [{ label: "Toggle available", icon: "check", run: (r) => (r.available = !r.available) }],
    },
    tables: {
      label: "Tables",
      one: "Table",
      search: ["name", "area"],
      title: (r) => r.name,
      badge: (r, app) => app.pill(...tableState(app, r)),
      fields: [
        { key: "name", label: "Table", type: "text", required: true, placeholder: "T1" },
        { key: "seats", label: "Seats", type: "number", default: 4 },
        { key: "area", label: "Area", type: "select", options: ["Main hall", "Family hall", "Rooftop", "Outdoor"], default: "Main hall" },
        { key: "status", label: "Status", type: "select", options: ["Free", "Occupied", "Reserved", "Cleaning"], default: "Free" },
      ],
      actions: [
        { label: "Take an order", icon: "cart", primary: true, run: (r, app) => ((app.ui.pos ||= {}), (app.ui.pos.otype = "Dine-in"), (app.ui.pos.table = r.id), app.closeDrawer(), app.go("pos"), "keep") },
        { label: "Open the bill", icon: "receipt", when: (r, app) => openOrder(app, r.id), run: (r, app) => (app.open("orders", openOrder(app, r.id).id), "keep") },
        { label: "Seat guests", icon: "users", when: (r, app) => tableState(app, r)[0] !== "Occupied", run: (r) => (r.status = "Occupied") },
        { label: "Cleaning", icon: "clock", run: (r) => (r.status = "Cleaning") },
        { label: "Mark free", icon: "check", when: (r, app) => !openOrder(app, r.id), run: (r) => (r.status = "Free") },
      ],
    },
    orders: {
      label: "Orders",
      one: "Order",
      search: ["no", "customer", "phone", "type", (r, app) => app.label("tables", r.table)],
      title: (r, app) => `Order ${r.no}${r.table ? " · " + app.label("tables", r.table) : r.customer ? " · " + r.customer : ""}`,
      badge: (r, app) => app.pill(r.status, KTONE[r.status]) + " " + app.pill(r.paid ? "Paid" : "Not paid", r.paid ? "green" : "amber") + " " + app.pill(r.type, "gray"),
      fields: [
        { key: "no", label: "Order no.", type: "text" },
        { key: "date", label: "Date", type: "date", default: today },
        { key: "time", label: "Time", type: "time", default: nowTime },
        { key: "type", label: "Type", type: "select", options: ["Dine-in", "Takeaway", "Delivery"], default: "Dine-in" },
        { key: "table", label: "Table", type: "relation", entity: "tables", show: (r) => (r.type || "Dine-in") === "Dine-in" },
        { key: "customer", label: "Customer", type: "text" },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "address", label: "Delivery address", type: "text", show: (r) => r.type === "Delivery" },
        { key: "lines", label: "Items", type: "lines", catalog: "menu", priceKey: "price", itemLabel: "Dish" },
        { key: "discount", label: "Discount (PKR)", type: "money" },
        { key: "status", label: "Kitchen", type: "select", options: KITCHEN, default: "New" },
        { key: "paid", label: "Paid", type: "bool" },
        { key: "method", label: "Paid by", type: "select", options: ["Cash", "Card", "JazzCash", "Easypaisa"] },
        { key: "notes", label: "Kitchen note", type: "text" },
      ],
      beforeSave: (r, before, app) => {
        const sub = app.linesTotal(r.lines);
        const disc = Math.min(sub, num(r.discount));
        r.tax = Math.round(((sub - disc) * num(app.setting("tax"))) / 100);
        r.total = sub - disc + r.tax + (r.type === "Delivery" ? num(app.setting("delivery")) : 0);
        if (!r.no) r.no = app.nextNo("orders", "#");
      },
      actions: [
        {
          label: "Take payment",
          icon: "money",
          primary: true,
          when: (r) => !r.paid,
          run: (r, app) => {
            const how = prompt(`Bill ${app.money(orderTotal(r))}. Paid by (Cash, Card, JazzCash, Easypaisa):`, "Cash");
            if (!how) return "keep";
            r.paid = true;
            r.method = how;
            const t = app.find("tables", r.table);
            if (t) t.status = "Cleaning";
          },
        },
        { label: "Next kitchen step", icon: "chef", when: (r) => r.status !== "Served", run: (r) => (r.status = KITCHEN[Math.min(3, KITCHEN.findIndex((k) => k.value === r.status) + 1)].value) },
        { label: "Print bill", icon: "print", run: (r, app) => (printBill(r, app), "keep") },
        { label: "Print kitchen slip", icon: "chef", run: (r, app) => (printKot(r, app), "keep") },
        { label: "WhatsApp customer", icon: "wa", when: (r) => r.phone, run: (r, app) => (app.whatsapp(r.phone, `${app.setting("business")}: your order ${r.no} (${app.money(orderTotal(r))}) is ${r.status === "Ready" ? "ready" : r.status === "Served" ? "on its way" : "being prepared"}. Thank you!`), "keep") },
      ],
    },
    reservations: {
      label: "Reservations",
      one: "Reservation",
      search: ["name", "phone"],
      title: (r) => `${r.name} · ${r.guests || "?"} guests`,
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "time", label: "Time", type: "time", required: true, default: "20:00" },
        { key: "guests", label: "Guests", type: "number", default: 4 },
        { key: "table", label: "Table", type: "relation", entity: "tables" },
        { key: "status", label: "Status", type: "select", options: ["Booked", "Seated", "No-show", "Cancelled"], default: "Booked" },
        { key: "notes", label: "Notes", type: "text", placeholder: "e.g. birthday, high chair" },
      ],
      actions: [
        { label: "Seat now", icon: "users", primary: true, when: (r) => r.status === "Booked", run: (r, app) => ((r.status = "Seated"), app.find("tables", r.table) && (app.find("tables", r.table).status = "Occupied")) },
        { label: "WhatsApp confirm", icon: "wa", when: (r) => r.phone, run: (r, app) => (app.whatsapp(r.phone, `Assalam o Alaikum ${r.name}, your table for ${r.guests} at ${app.setting("business")} is booked for ${fmtShort(r.date)} at ${app.time(r.time)}. See you then!`), "keep") },
        { label: "No-show", icon: "close", when: (r) => r.status === "Booked", run: (r) => (r.status = "No-show") },
      ],
    },
  },
  onAction: (code, app) => {
    const [a, p, v] = code.split(":");
    if (a === "otype") {
      app.ui[p].otype = v;
      app.refresh();
    }
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
      actions: [{ id: "pos", label: "New order", primary: true, icon: "cart", run: (app) => app.go("pos") }],
      kpis: (db, app) => {
        const t = db.orders.filter((o) => o.date === today());
        const paid = t.filter((o) => o.paid);
        const lastWeek = db.orders.filter((o) => o.date === addDays(today(), -7) && o.paid && o.time <= nowTime());
        return [
          { label: "Sales today", value: app.money(sum(paid, orderTotal)), note: `same time last week ${app.money(sum(lastWeek, orderTotal))}`, icon: "money" },
          { label: "Orders today", value: t.length, note: `${t.filter((o) => o.type === "Delivery").length} delivery · ${t.filter((o) => o.type === "Takeaway").length} takeaway`, icon: "receipt", go: "orders" },
          { label: "In the kitchen", value: t.filter((o) => ["New", "Cooking"].includes(o.status)).length, note: `${t.filter((o) => o.status === "Ready").length} ready`, icon: "chef", go: "kitchen" },
          { label: "Tables occupied", value: `${db.tables.filter((x) => tableState(app, x)[0] === "Occupied").length} / ${db.tables.length}`, icon: "table", go: "tables" },
        ];
      },
      blocks: (db, app) => {
        const hours = Array.from({ length: 13 }, (_, i) => i + 12);
        const byHour = hours.map((h) => ({ label: `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`, value: sum(db.orders.filter((o) => o.date === today() && o.paid && Number(String(o.time).slice(0, 2)) === h), orderTotal) }));
        const live = db.orders.filter((o) => o.date === today() && (o.status !== "Served" || !o.paid)).sort((a, b) => a.time.localeCompare(b.time));
        const lines = db.orders.filter((o) => o.date >= addDays(today(), -6)).flatMap((o) => o.lines || []);
        return [
          { title: "Sales by hour", note: "today", html: columnChart(byHour, { fmt: (v) => app.moneyShort(v) }), table: byHour.map((d) => [d.label, app.money(d.value)]) },
          { title: "Open orders", go: "kitchen", html: app.list(live.slice(0, 9), (o) => `<li>${app.openLink("orders", o, `<span class="dx-when">${esc(o.no)}<small>${minsAgo(o.time)} min</small></span><span class="dx-li-main"><b>${esc(o.table ? app.label("tables", o.table) : o.customer || o.type)}</b><small>${esc((o.lines || []).map((l) => l.qty + "× " + l.name).join(", "))}</small></span>${app.pill(o.status, KTONE[o.status])}${o.paid ? "" : app.pill("Not paid", "amber")}`)}</li>`, "No open orders.") },
          { title: "Best sellers", note: "last 7 days, plates", html: barList(groupSum(lines, (l) => l.name, (l) => l.qty)) },
          { title: "Tonight's reservations", go: "reservations", html: app.list(db.reservations.filter((r) => r.date === today() && r.status === "Booked").sort((a, b) => a.time.localeCompare(b.time)), (r) => `<li>${app.openLink("reservations", r, `<span class="dx-when">${esc(app.time(r.time))}</span><span class="dx-li-main"><b>${esc(r.name)}</b><small>${r.guests} guests${r.table ? " · " + esc(app.label("tables", r.table)) : ""}</small></span>`)}</li>`, "No bookings for today.") },
        ];
      },
    },
    {
      id: "pos",
      label: "New order",
      icon: "cart",
      type: "pos",
      catalog: "menu",
      catKey: "category",
      priceKey: "price",
      taxKey: "tax",
      taxLabel: "GST",
      ticketTitle: "Order",
      available: (r) => r.available !== false,
      pay: ["Cash", "Card", "JazzCash", "Easypaisa"],
      park: "Send to kitchen, pay later",
      ticketFields: (app, s) => {
        const type = s.otype || "Dine-in";
        return `<div class="dx-tfields"><div class="dx-seg" role="group" aria-label="Order type">${["Dine-in", "Takeaway", "Delivery"].map((t) => `<button type="button" data-x="otype:pos:${t}" class="${type === t ? "on" : ""}">${t}</button>`).join("")}</div>${
          type === "Dine-in"
            ? `<select data-tf="pos:table" aria-label="Table"><option value="">Choose a table</option>${app.db.tables.map((t) => `<option value="${t.id}" ${s.table === t.id ? "selected" : ""}>${esc(t.name)} · ${esc(tableState(app, t)[0])}</option>`).join("")}</select>`
            : `<input data-tf="pos:cname" value="${esc(s.cname || "")}" placeholder="Customer name" aria-label="Customer name"><input data-tf="pos:cphone" value="${esc(s.cphone || "")}" placeholder="Phone (03xx…)" inputmode="tel" aria-label="Phone">${type === "Delivery" ? `<input data-tf="pos:caddr" value="${esc(s.caddr || "")}" placeholder="Delivery address" aria-label="Delivery address"><small>Delivery charge ${esc(app.money(app.setting("delivery")))} is added to the bill.</small>` : ""}`
        }</div>`;
      },
      complete: (app, s, sale) => {
        if ((s.otype || "Dine-in") === "Delivery") {
          if (!s.caddr) return app.toast("Add the delivery address first."), false;
          sale.total += num(app.setting("delivery"));
          sale.delivery = num(app.setting("delivery"));
        }
        const o = makeOrder(app, s, sale, true);
        o.total = sale.total;
        sale.no = o.no;
        sale.order = o;
        return sale;
      },
      onPark: (app, s) => {
        if (!s.ticket.length) return;
        if ((s.otype || "Dine-in") === "Dine-in" && !s.table) return app.toast("Choose the table first.");
        const sub = sum(s.ticket, (l) => l.qty * l.price);
        const disc = Math.min(sub, num(s.disc));
        const tax = Math.round(((sub - disc) * num(app.setting("tax"))) / 100);
        const o = makeOrder(app, s, { lines: s.ticket, disc, tax, total: sub - disc + tax + ((s.otype || "") === "Delivery" ? num(app.setting("delivery")) : 0) }, false);
        const t = app.find("tables", o.table);
        if (t) t.status = "Occupied";
        s.ticket = [];
        s.disc = 0;
        app.save();
        app.refresh();
        app.toast(`Order ${o.no} sent to the kitchen.`);
      },
      receiptTitle: "Bill",
      receipt: (sale, app) => `<div class="dx-doc-meta"><div><b>Order:</b> ${esc(sale.no)}</div><div><b>Date:</b> ${esc(app.date(today()))} ${esc(app.time(nowTime()))}</div><div><b>Type:</b> ${esc(sale.order?.type || "")}</div><div>${sale.order?.table ? "<b>Table:</b> " + esc(app.label("tables", sale.order.table)) : sale.order?.customer ? "<b>Customer:</b> " + esc(sale.order.customer) : ""}</div></div>${app.receiptLines(sale)}${sale.delivery ? `<p>Includes delivery ${esc(app.money(sale.delivery))}.</p>` : ""}${app.setting("ntn") ? `<p>NTN/STRN: ${esc(app.setting("ntn"))}</p>` : ""}<p style="text-align:center;margin-top:16px">Thank you! Please visit again.</p>`,
    },
    {
      id: "kitchen",
      label: "Kitchen",
      icon: "chef",
      type: "board",
      entity: "orders",
      field: "status",
      add: false,
      intro: "Drag tickets as dishes are cooked and served. Oldest first; the minutes show how long each order has waited.",
      columns: KITCHEN,
      where: (r) => r.date === today() && (r.status !== "Served" || minsAgo(r.time) < 90),
      order: (a, b) => a.time.localeCompare(b.time),
      card: (r, app) => `<b>${esc(r.no)} · ${esc(r.table ? app.label("tables", r.table) : r.type)}</b><small>${esc(r.time ? app.time(r.time) : "")} · ${minsAgo(r.time)} min ago${r.customer ? " · " + esc(r.customer) : ""}</small><span>${(r.lines || []).map((l) => `${l.qty}× ${esc(l.name)}`).join("<br>")}</span>${r.notes ? `<small>Note: ${esc(r.notes)}</small>` : ""}`,
      badge: (db) => db.orders.filter((o) => o.date === today() && o.status === "New").length,
    },
    {
      id: "tables",
      label: "Tables",
      icon: "table",
      type: "custom",
      render: (app) => {
        const areas = [...new Set(app.db.tables.map((t) => t.area || "Main hall"))];
        return `<p class="dx-intro">Tap a table to take an order, open its bill or change its status. Red tables have an unpaid order.</p><div class="dx-tools"><span>${["Free", "Occupied", "Reserved", "Cleaning"].map((s) => app.pill(s + " " + app.db.tables.filter((t) => tableState(app, t)[0] === s).length, { Free: "green", Occupied: "red", Reserved: "purple", Cleaning: "amber" }[s])).join(" ")}</span><span class="dx-grow"></span><button type="button" class="dx-btn primary" data-x="new:tables">${app.icon("plus")}New table</button></div>${areas
          .map(
            (a) =>
              `<section class="dx-card" style="margin-bottom:14px"><div class="dx-card-h"><h2>${esc(a)}</h2></div><div class="rs-floor">${app.db.tables
                .filter((t) => (t.area || "Main hall") === a)
                .map((t) => {
                  const [st, tone] = tableState(app, t);
                  const o = openOrder(app, t.id);
                  return `<button type="button" class="rs-table ${tone}" data-open="tables:${t.id}" style="--seats:${Math.min(8, num(t.seats) || 4)}"><b>${esc(t.name)}</b><small>${num(t.seats)} seats</small><span>${esc(st)}</span>${o ? `<em>${esc(app.moneyShort(orderTotal(o)))} · ${minsAgo(o.time)} min</em>` : ""}</button>`;
                })
                .join("")}</div></section>`,
          )
          .join("")}<style>.rs-floor{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}.rs-table{display:grid;gap:3px;justify-items:center;min-height:118px;padding:14px 10px;border:2px solid var(--c);border-radius:calc(10px + var(--seats)*3px);background:color-mix(in srgb,var(--c) 10%,var(--panel));cursor:pointer}.rs-table.green{--c:var(--green)}.rs-table.red{--c:var(--red)}.rs-table.purple{--c:var(--purple)}.rs-table.amber{--c:var(--amber)}.rs-table b{font-size:20px}.rs-table small{color:var(--ink-3)}.rs-table span{font-weight:650;color:var(--c)}.rs-table em{font-style:normal;font-size:12px}</style>`;
      },
    },
    {
      id: "reservations",
      label: "Reservations",
      icon: "calendar",
      type: "calendar",
      entity: "reservations",
      dateKey: "date",
      timeKey: "time",
      hours: [12, 24],
      duration: () => 90,
      tone: (r) => ({ Booked: "blue", Seated: "green", "No-show": "red", Cancelled: "gray" })[r.status],
      event: (r, app) => `<b>${esc(r.name)}</b><small>${r.guests} guests${r.table ? " · " + esc(app.label("tables", r.table)) : ""}</small>`,
    },
    {
      id: "orders",
      label: "Orders",
      icon: "receipt",
      type: "table",
      entity: "orders",
      sort: "no",
      dir: -1,
      importCsv: false,
      filters: [
        { key: "type", label: "Type", options: ["Dine-in", "Takeaway", "Delivery"] },
        { key: "paid", label: "Payment", options: [{ value: "yes", label: "Paid" }, { value: "no", label: "Not paid" }], test: (r, v) => (v === "yes") === !!r.paid },
        { key: "day", label: "Day", options: () => Array.from({ length: 7 }, (_, i) => ({ value: addDays(today(), -i), label: i ? fmtShort(addDays(today(), -i)) : "Today" })), test: (r, v) => r.date === v },
      ],
      total: (rows, app) => `Sales <b>${esc(app.money(sum(rows.filter((o) => o.paid), orderTotal)))}</b> from ${rows.filter((o) => o.paid).length} paid orders`,
      columns: [
        { key: "no", label: "Order", html: (r) => `<b>${esc(r.no)}</b>`, sortValue: (r) => num(String(r.no).replace(/\D/g, "")) },
        { key: "date", label: "Date", date: true },
        { key: "time", label: "Time", html: (r, app) => esc(app.time(r.time)) },
        { key: "type", label: "Type" },
        { key: "table", label: "Table / customer", get: (r, app) => (r.table ? app.label("tables", r.table) : r.customer) },
        { key: "total", label: "Total", money: true, right: true, sortValue: (r) => orderTotal(r) },
        { key: "paid", label: "Payment", html: (r, app) => (r.paid ? app.pill(r.method || "Paid", "green") : app.pill("Not paid", "amber")) },
      ],
    },
    {
      id: "menu",
      label: "Menu",
      icon: "list",
      type: "table",
      entity: "menu",
      sort: "category",
      filters: [
        { key: "category", label: "Category", options: CATS },
        { key: "available", label: "Available", options: [{ value: "yes", label: "Available" }, { value: "no", label: "Not available" }], test: (r, v) => (v === "yes") === (r.available !== false) },
      ],
      columns: [
        { key: "name", label: "Dish", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "category", label: "Category" },
        { key: "price", label: "Price", money: true, right: true },
        { key: "available", label: "Available", html: (r, app) => (r.available !== false ? app.pill("Yes", "green") : app.pill("No", "gray")) },
        { key: "sold", label: "Sold (30 days)", right: true, get: (r, app) => sum(app.db.orders.filter((o) => o.date >= addDays(today(), -30)).flatMap((o) => o.lines || []).filter((l) => l.name === r.name), "qty") },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      kpis: (db, app) => {
        const m = db.orders.filter((o) => monthOf(o.date) === thisMonth() && o.paid);
        return [
          { label: "Sales this month", value: app.money(sum(m, orderTotal)), icon: "money" },
          { label: "Orders this month", value: m.length, icon: "receipt" },
          { label: "Average bill", value: app.money(m.length ? sum(m, orderTotal) / m.length : 0), icon: "chart" },
          { label: "GST collected", value: app.money(sum(m, "tax")), icon: "doc" },
        ];
      },
      blocks: (db, app) => {
        const days = Array.from({ length: 30 }, (_, i) => addDays(today(), i - 29));
        const perDay = days.map((d) => ({ label: fmtShort(d), value: sum(db.orders.filter((o) => o.date === d && o.paid), orderTotal) }));
        const hours = Array.from({ length: 13 }, (_, i) => i + 12);
        const byHour = hours.map((h) => ({ label: `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`, value: db.orders.filter((o) => o.date >= addDays(today(), -30) && Number(String(o.time).slice(0, 2)) === h).length }));
        const lines = db.orders.filter((o) => o.date >= addDays(today(), -30)).flatMap((o) => o.lines || []);
        return [
          { title: "Sales per day", note: "last 30 days", wide: true, html: lineChart(perDay, { fmt: (v) => app.money(v) }), table: perDay.map((d) => [d.label, app.money(d.value)]) },
          { title: "Busy hours", note: "orders, last 30 days", html: columnChart(byHour), table: byHour.map((d) => [d.label, d.value]) },
          { title: "Sales by order type", html: barList(groupSum(db.orders.filter((o) => o.paid && o.date >= addDays(today(), -30)), (o) => o.type, orderTotal), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Best sellers by value", note: "30 days", html: barList(groupSum(lines, (l) => l.name, (l) => num(l.qty) * num(l.price)), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Payment methods", html: barList(groupCount(db.orders.filter((o) => o.paid && o.date >= addDays(today(), -30)), (o) => o.method)) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const dishes = [
      ["Chicken karahi (half)", "Karahi & handi", 1450],
      ["Mutton karahi (half)", "Karahi & handi", 2650],
      ["Chicken handi", "Karahi & handi", 1550],
      ["Daal mash", "Karahi & handi", 650],
      ["Seekh kabab (4)", "BBQ", 950],
      ["Chicken tikka", "BBQ", 650],
      ["Malai boti", "BBQ", 1150],
      ["Mutton chops", "BBQ", 1850],
      ["Chicken biryani", "Rice", 550],
      ["Mutton pulao", "Rice", 850],
      ["Plain rice", "Rice", 350],
      ["Roghni naan", "Bread", 90],
      ["Tandoori roti", "Bread", 40],
      ["Garlic naan", "Bread", 120],
      ["Chicken corn soup", "Starters", 450],
      ["Fish pakora", "Starters", 950],
      ["Zinger burger", "Fast food", 650],
      ["Club sandwich", "Fast food", 750],
      ["Mint margarita", "Drinks", 380],
      ["Fresh lime", "Drinks", 280],
      ["Soft drink", "Drinks", 150],
      ["Lassi", "Drinks", 250],
      ["Kheer", "Desserts", 300],
      ["Gulab jamun (2)", "Desserts", 250],
    ];
    const menu = dishes.map(([name, category, price], i) => ({ id: "m" + i, name, category, price, available: i !== 7 }));
    const tables = Array.from({ length: 14 }, (_, i) => ({ id: "t" + i, name: "T" + (i + 1), seats: [2, 4, 4, 6, 8][i % 5], area: i < 8 ? "Main hall" : i < 12 ? "Family hall" : "Rooftop", status: "Free" }));
    const orders = [];
    let n = 0;
    for (let d = -30; d <= 0; d++) {
      const count = d === 0 ? 16 : h.int(12, 22);
      for (let k = 0; k < count; k++) {
        const hour = h.pick([13, 13, 14, 15, 19, 20, 20, 21, 21, 22, 23]);
        const time = `${hour}:${String(h.int(0, 59)).padStart(2, "0")}`;
        if (d === 0 && time > nowTime()) continue;
        const lines = Array.from({ length: h.int(1, 5) }, () => {
          const m = h.pick(menu);
          return { name: m.name, qty: m.category === "Bread" ? h.int(2, 6) : h.int(1, 2), price: m.price };
        });
        const sub = lines.reduce((s, l) => s + l.qty * l.price, 0);
        const tax = Math.round(sub * 0.16);
        const type = h.pick(["Dine-in", "Dine-in", "Dine-in", "Takeaway", "Delivery"]);
        const mins = d === 0 ? (() => {
          const [nh, nm] = nowTime().split(":").map(Number);
          const [oh, om] = time.split(":").map(Number);
          return nh * 60 + nm - oh * 60 - om;
        })() : 999;
        const status = mins < 12 ? "New" : mins < 25 ? "Cooking" : mins < 35 ? "Ready" : "Served";
        n++;
        orders.push({ no: "#" + String(n).padStart(4, "0"), date: h.day(d), time, type, table: type === "Dine-in" ? h.pick(tables).id : "", customer: type === "Dine-in" ? "" : h.person(), phone: type === "Dine-in" ? "" : h.phone(), address: type === "Delivery" ? h.pick(["House 12, Street 4, Gulberg", "Flat 3B, Askari 10", "Shop 7, Liberty Market"]) : "", lines, discount: 0, tax, total: sub + tax + (type === "Delivery" ? 150 : 0), status, paid: d < 0 || mins > 40 || type !== "Dine-in", method: h.pick(["Cash", "Cash", "Cash", "Card", "JazzCash"]) });
      }
    }
    const reservations = Array.from({ length: 16 }, () => {
      const d = h.int(-3, 6);
      return { name: h.person(), phone: h.phone(), date: h.day(d), time: h.pick(["13:30", "14:00", "19:30", "20:00", "20:30", "21:00", "21:30"]), guests: h.int(2, 10), table: h.pick(tables).id, status: d < 0 ? h.pick(["Seated", "Seated", "No-show"]) : "Booked" };
    });
    return { menu, tables, orders, reservations };
  },
});

function printBill(r, app) {
  const sub = app.linesTotal(r.lines);
  app.print(`Bill ${r.no}`, `<div class="dx-doc-meta"><div><b>Date:</b> ${esc(app.date(r.date))} ${esc(app.time(r.time))}</div><div><b>Type:</b> ${esc(r.type)}${r.table ? " · " + esc(app.label("tables", r.table)) : ""}</div>${r.customer ? `<div><b>Customer:</b> ${esc(r.customer)} ${esc(r.phone || "")}</div>` : ""}${r.address ? `<div><b>Address:</b> ${esc(r.address)}</div>` : ""}</div>${app.receiptLines({ lines: r.lines || [], sub, disc: num(r.discount), tax: num(r.tax), taxRate: num(app.setting("tax")), total: orderTotal(r), method: r.paid ? r.method || "Paid" : "Not paid yet" })}${r.type === "Delivery" ? `<p>Includes delivery ${esc(app.money(app.setting("delivery")))}.</p>` : ""}<p style="text-align:center;margin-top:16px">Thank you! Please visit again.</p>`);
}
function printKot(r, app) {
  app.print(`Kitchen ${r.no}`, `<div style="font-size:16px"><p><b>${esc(r.type)}${r.table ? " · " + esc(app.label("tables", r.table)) : ""}</b> · ${esc(app.time(r.time))}</p><ul>${(r.lines || []).map((l) => `<li style="margin:6px 0"><b>${l.qty} ×</b> ${esc(l.name)}</li>`).join("")}</ul>${r.notes ? `<p>Note: ${esc(r.notes)}</p>` : ""}</div>`);
}

export default app;
