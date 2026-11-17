// Inventory: products with stock levels, stock moves, purchase orders (Receive adds stock), sales orders
// (Dispatch takes stock out), suppliers, customers and reports.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, num, sum, groupSum, columnChart, barList } from "../shared/dash.js";

const CATS = ["Grocery", "Beverages", "Personal care", "Household", "Stationery", "Electronics", "Hardware"];
const UNITS = ["pcs", "box", "pack", "kg", "ltr", "dozen", "carton"];
const ORDER = [
  { value: "New", label: "New", tone: "blue" },
  { value: "Packed", label: "Packed", tone: "purple" },
  { value: "Shipped", label: "Shipped", tone: "amber" },
  { value: "Delivered", label: "Delivered", tone: "green" },
  { value: "Cancelled", label: "Cancelled", tone: "red" },
];
const OTONE = Object.fromEntries(ORDER.map((s) => [s.value, s.tone]));
const level = (p) => (num(p.stock) <= 0 ? ["Out of stock", "red"] : num(p.stock) <= num(p.reorder) ? ["Low", "amber"] : ["In stock", "green"]);
const productByName = (app, name) => app.db.products.find((p) => p.name.toLowerCase() === String(name).toLowerCase());

// Every stock change is a move, so the stock level always has a history.
function move(app, product, type, qty, reason, ref = "") {
  const p = app.find("products", product);
  if (!p) return;
  p.stock = num(p.stock) + (type === "Out" ? -num(qty) : num(qty));
  app.db.moves.push({ id: Math.random().toString(36).slice(2), created: Date.now(), date: today(), product, type, qty: num(qty), reason, ref, applied: true });
}

const app = createApp({
  id: "inventory",
  title: "Inventory dashboard",
  brand: "Madina Wholesale",
  icon: "box",
  accent: "#c2410c",
  settings: [
    { key: "business", label: "Business name", type: "text", default: "Madina Wholesale" },
    { key: "phone", label: "Phone", type: "phone", default: "0333 1112223" },
    { key: "address", label: "Address", type: "text", default: "Shah Alam Market, Lahore" },
    { key: "tax", label: "Sales tax on invoices (%)", type: "percent", default: 0 },
  ],
  entities: {
    products: {
      label: "Products",
      one: "Product",
      search: ["name", "sku", "category", "location"],
      title: (r) => r.name,
      badge: (r, app) => app.pill(...level(r)) + " " + app.pill(`${num(r.stock)} ${r.unit || ""} in stock`, "gray"),
      fields: [
        { key: "name", label: "Product", type: "text", required: true },
        { key: "sku", label: "SKU / code", type: "text", default: (app) => app.nextNo("products", "SKU-") },
        { key: "category", label: "Category", type: "select", options: CATS },
        { key: "unit", label: "Unit", type: "select", options: UNITS, default: "pcs" },
        { key: "cost", label: "Cost price (PKR)", type: "money" },
        { key: "price", label: "Sale price (PKR)", type: "money", required: true },
        { key: "stock", label: "Stock now", type: "number", default: 0, hint: "Later changes go through Stock moves, purchases and orders." },
        { key: "reorder", label: "Reorder at", type: "number", default: 10, hint: "Shows as Low at or below this." },
        { key: "supplier", label: "Supplier", type: "relation", entity: "suppliers" },
        { key: "location", label: "Shelf / location", type: "text" },
      ],
      actions: [
        {
          label: "Add stock",
          icon: "plus",
          primary: true,
          run: (r, app) => {
            const q = num(prompt(`How many ${r.unit || "pcs"} of ${r.name} came in?`, "10"));
            if (q > 0) move(app, r.id, "In", q, "Received");
          },
        },
        {
          label: "Remove stock",
          icon: "close",
          run: (r, app) => {
            const q = num(prompt(`How many ${r.unit || "pcs"} of ${r.name} to take out (damaged, used, sold at the counter)?`, "1"));
            if (q > 0) move(app, r.id, "Out", q, "Taken out");
          },
        },
        { label: "Reorder from supplier", icon: "truck", when: (r) => num(r.stock) <= num(r.reorder), run: (r, app) => (app.open("purchases", "", true, { supplier: r.supplier, lines: [{ name: r.name, qty: Math.max(1, num(r.reorder) * 3 - num(r.stock)), price: num(r.cost) }] }), "keep") },
      ],
      related: (r, app) => {
        const moves = app.db.moves.filter((m) => m.product === r.id).sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);
        return `<div class="dx-related"><h3>Stock history</h3>${app.list(moves.slice(0, 12), (m) => `<li>${app.openLink("moves", m, `<span class="dx-when">${esc(fmtShort(m.date))}</span><span class="dx-li-main"><b>${m.type === "Out" ? "−" : "+"}${m.qty} ${esc(r.unit || "")}</b><small>${esc(m.reason || m.type)}${m.ref ? " · " + esc(m.ref) : ""}</small></span>`)}</li>`, "No stock changes yet.")}</div>`;
      },
    },
    moves: {
      label: "Stock moves",
      one: "Stock move",
      search: [(r, app) => app.label("products", r.product), "reason", "ref"],
      title: (r, app) => `${r.type === "Out" ? "−" : "+"}${r.qty} ${app.label("products", r.product)}`,
      fields: [
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "product", label: "Product", type: "relation", entity: "products", required: true },
        { key: "type", label: "Type", type: "select", options: [{ value: "In", label: "Stock in" }, { value: "Out", label: "Stock out" }], default: "In", required: true },
        { key: "qty", label: "Quantity", type: "number", required: true, default: 1 },
        { key: "reason", label: "Reason", type: "select", options: ["Received", "Sold", "Returned", "Damaged", "Stock count", "Used in shop", "Other"] },
        { key: "ref", label: "Reference", type: "text", placeholder: "Bill or order no." },
      ],
      // Saving a move changes the product's stock; editing reverses the old move first.
      afterSave: (r, before, app) => {
        if (before && !before.applied) return; // sample history rows are already counted in the stock
        const p = app.find("products", r.product);
        if (before?.applied) {
          const old = app.find("products", before.product);
          if (old) old.stock = num(old.stock) - (before.type === "Out" ? -num(before.qty) : num(before.qty));
        }
        if (p) p.stock = num(p.stock) + (r.type === "Out" ? -num(r.qty) : num(r.qty));
        r.applied = true;
      },
      beforeDelete: (r, app) => {
        const p = app.find("products", r.product);
        if (p && r.applied) p.stock = num(p.stock) - (r.type === "Out" ? -num(r.qty) : num(r.qty));
      },
    },
    purchases: {
      label: "Purchase orders",
      one: "Purchase order",
      search: ["no", (r, app) => app.label("suppliers", r.supplier)],
      title: (r) => r.no,
      badge: (r, app) => app.pill(r.status, r.status === "Received" ? "green" : r.status === "Ordered" ? "amber" : "gray"),
      fields: [
        { key: "no", label: "PO no.", type: "text", default: (app) => app.nextNo("purchases", "PO-") },
        { key: "supplier", label: "Supplier", type: "relation", entity: "suppliers", required: true },
        { key: "date", label: "Date", type: "date", default: today },
        { key: "status", label: "Status", type: "select", options: ["Draft", "Ordered", "Received"], default: "Ordered" },
        { key: "lines", label: "Items", type: "lines", catalog: "products", priceKey: "cost", itemLabel: "Product" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [
        {
          label: "Receive stock",
          icon: "truck",
          primary: true,
          when: (r) => r.status !== "Received",
          run: (r, app) => {
            const missing = [];
            for (const l of r.lines || []) {
              const p = productByName(app, l.name);
              if (p) {
                move(app, p.id, "In", l.qty, "Received", r.no);
                if (num(l.price)) p.cost = num(l.price);
              } else missing.push(l.name);
            }
            r.status = "Received";
            r.received = today();
            app.toast(missing.length ? `Received. Not in Products, so not counted: ${missing.join(", ")}` : "Stock received and added.");
          },
        },
        { label: "Print", icon: "print", run: (r, app) => (printDoc(app, "Purchase order", r, app.find("suppliers", r.supplier)), "keep") },
      ],
    },
    orders: {
      label: "Sales orders",
      one: "Sales order",
      search: ["no", (r, app) => app.label("customers", r.customer)],
      title: (r) => r.no,
      badge: (r, app) => app.pill(r.status, OTONE[r.status]) + " " + app.pill(r.paid ? "Paid" : "Unpaid", r.paid ? "green" : "amber"),
      fields: [
        { key: "no", label: "Order no.", type: "text", default: (app) => app.nextNo("orders", "SO-") },
        { key: "customer", label: "Customer", type: "relation", entity: "customers", required: true },
        { key: "date", label: "Date", type: "date", default: today },
        { key: "status", label: "Status", type: "select", options: ORDER, default: "New" },
        { key: "lines", label: "Items", type: "lines", catalog: "products", priceKey: "price", itemLabel: "Product" },
        { key: "paid", label: "Paid", type: "bool" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [
        { label: "Packed", icon: "box", primary: true, when: (r) => r.status === "New", run: (r) => (r.status = "Packed") },
        { label: "Dispatch (takes stock out)", icon: "truck", primary: true, when: (r) => ["New", "Packed"].includes(r.status), run: (r, app) => dispatch(r, app) },
        { label: "Delivered", icon: "check", when: (r) => r.status === "Shipped", run: (r) => (r.status = "Delivered") },
        { label: "Mark paid", icon: "money", when: (r) => !r.paid, run: (r) => (r.paid = true) },
        { label: "Print invoice", icon: "print", run: (r, app) => (printDoc(app, "Invoice", r, app.find("customers", r.customer)), "keep") },
        {
          label: "WhatsApp",
          icon: "wa",
          when: (r, app) => app.find("customers", r.customer)?.phone,
          run: (r, app) => {
            const c = app.find("customers", r.customer);
            app.whatsapp(c.phone, `${app.setting("business")}: your order ${r.no} (${app.money(app.linesTotal(r.lines))}) is ${r.status.toLowerCase()}. Thank you!`);
            return "keep";
          },
        },
      ],
    },
    suppliers: {
      label: "Suppliers",
      one: "Supplier",
      search: ["name", "phone", "city"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Supplier", type: "text", required: true },
        { key: "contact", label: "Contact person", type: "text" },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "city", label: "City", type: "text" },
        { key: "terms", label: "Payment terms", type: "select", options: ["Cash", "7 days", "15 days", "30 days"] },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [{ label: "New purchase order", icon: "plus", primary: true, run: (r, app) => (app.open("purchases", "", true, { supplier: r.id }), "keep") }],
    },
    customers: {
      label: "Customers",
      one: "Customer",
      search: ["name", "phone", "city"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Customer", type: "text", required: true },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "city", label: "City / area", type: "text" },
        { key: "type", label: "Type", type: "select", options: ["Retail", "Wholesale", "Online"] },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [{ label: "New order", icon: "plus", primary: true, run: (r, app) => (app.open("orders", "", true, { customer: r.id }), "keep") }],
      related: (r, app) => {
        const orders = app.db.orders.filter((o) => o.customer === r.id).sort((a, b) => b.date.localeCompare(a.date));
        return `<div class="dx-related"><h3>Orders (${orders.length}) · ${esc(app.money(sum(orders, (o) => app.linesTotal(o.lines))))}</h3>${app.list(orders.slice(0, 8), (o) => `<li>${app.openLink("orders", o, `<span class="dx-when">${esc(fmtShort(o.date))}</span><span class="dx-li-main"><b>${esc(o.no)}</b><small>${esc(app.money(app.linesTotal(o.lines)))}</small></span>${app.pill(o.status, OTONE[o.status])}`)}</li>`, "No orders yet.")}</div>`;
      },
    },
  },
  pages: [
    {
      id: "overview",
      label: "Overview",
      icon: "home",
      type: "overview",
      actions: [
        { id: "o", label: "New sales order", new: "orders", primary: true },
        { id: "p", label: "New purchase order", new: "purchases", icon: "truck" },
        { id: "pr", label: "New product", new: "products", icon: "box" },
      ],
      kpis: (db, app) => {
        const sold = db.orders.filter((o) => monthOf(o.date) === thisMonth() && o.status !== "Cancelled");
        return [
          { label: "Stock value (at cost)", value: app.moneyShort(sum(db.products, (p) => Math.max(0, num(p.stock)) * num(p.cost))), note: `${db.products.length} products`, icon: "box", go: "products" },
          { label: "Low or out of stock", value: db.products.filter((p) => num(p.stock) <= num(p.reorder)).length, note: `${db.products.filter((p) => num(p.stock) <= 0).length} out of stock`, icon: "bell", tone: db.products.some((p) => num(p.stock) <= 0) ? "warn" : "", go: "products" },
          { label: "Orders to dispatch", value: db.orders.filter((o) => ["New", "Packed"].includes(o.status)).length, icon: "truck", go: "orders" },
          { label: "Sales this month", value: app.moneyShort(sum(sold, (o) => app.linesTotal(o.lines))), note: `${sold.length} orders`, icon: "money" },
        ];
      },
      blocks: (db, app) => {
        const low = db.products.filter((p) => num(p.stock) <= num(p.reorder)).sort((a, b) => num(a.stock) - num(b.stock));
        const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
        const perDay = days.map((d) => ({ label: fmtShort(d), value: sum(db.orders.filter((o) => o.date === d && o.status !== "Cancelled"), (o) => app.linesTotal(o.lines)) }));
        const open = db.orders.filter((o) => ["New", "Packed", "Shipped"].includes(o.status)).sort((a, b) => a.date.localeCompare(b.date));
        return [
          { title: "Reorder now", note: "low or out of stock", go: "products", html: app.list(low.slice(0, 8), (p) => `<li>${app.openLink("products", p, `<span class="dx-li-main"><b>${esc(p.name)}</b><small>${num(p.stock)} ${esc(p.unit || "")} left · reorder at ${num(p.reorder)}</small></span>${app.pill(...level(p))}`)}</li>`, "Everything is in stock.") },
          { title: "Sales per day", note: "last 14 days", html: columnChart(perDay, { fmt: (v) => app.moneyShort(v) }), table: perDay.map((d) => [d.label, app.money(d.value)]) },
          { title: "Open orders", go: "orders", html: app.list(open.slice(0, 8), (o) => `<li>${app.openLink("orders", o, `<span class="dx-when">${esc(fmtShort(o.date))}</span><span class="dx-li-main"><b>${esc(o.no)} · ${esc(app.label("customers", o.customer))}</b><small>${esc(app.money(app.linesTotal(o.lines)))}</small></span>${app.pill(o.status, OTONE[o.status])}`)}</li>`, "No open orders.") },
          { title: "Stock value by category", html: barList(groupSum(db.products, (p) => p.category, (p) => Math.max(0, num(p.stock)) * num(p.cost)), { fmt: (v) => app.moneyShort(v) }) },
        ];
      },
    },
    {
      id: "products",
      label: "Products",
      icon: "box",
      type: "table",
      entity: "products",
      sort: "name",
      filters: [
        { key: "category", label: "Category", options: CATS },
        { key: "level", label: "Stock", options: ["In stock", "Low", "Out of stock"], test: (r, v) => level(r)[0] === v },
      ],
      total: (rows, app) => `Stock value <b>${esc(app.money(sum(rows, (p) => Math.max(0, num(p.stock)) * num(p.cost))))}</b> at cost · <b>${esc(app.money(sum(rows, (p) => Math.max(0, num(p.stock)) * num(p.price))))}</b> at sale price`,
      columns: [
        { key: "sku", label: "SKU" },
        { key: "name", label: "Product", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "category", label: "Category" },
        { key: "stock", label: "Stock", right: true, get: (r) => num(r.stock), html: (r) => `${num(r.stock)} ${esc(r.unit || "")}` },
        { key: "level", label: "Status", get: (r) => level(r)[0], html: (r, app) => app.pill(...level(r)) },
        { key: "cost", label: "Cost", money: true, right: true },
        { key: "price", label: "Price", money: true, right: true },
        { key: "margin", label: "Margin", right: true, get: (r) => (num(r.price) ? Math.round(((num(r.price) - num(r.cost)) / num(r.price)) * 100) : 0), html: (r) => (num(r.price) ? Math.round(((num(r.price) - num(r.cost)) / num(r.price)) * 100) + "%" : "—") },
      ],
      badge: (db) => db.products.filter((p) => num(p.stock) <= 0).length,
    },
    {
      id: "orders",
      label: "Sales orders",
      icon: "cart",
      type: "board",
      entity: "orders",
      field: "status",
      intro: "Move each order to its next step. Dispatching takes the items out of stock.",
      columns: ORDER,
      where: (r) => r.status !== "Delivered" || r.date >= addDays(today(), -14),
      order: (a, b) => a.date.localeCompare(b.date),
      total: (list, app) => (list.length ? app.money(sum(list, (o) => app.linesTotal(o.lines))) : ""),
      card: (r, app) => `<b>${esc(r.no)} · ${esc(app.label("customers", r.customer))}</b><small>${esc(fmtShort(r.date))} · ${(r.lines || []).length} items</small><span>${esc(app.money(app.linesTotal(r.lines)))}</span>${r.paid ? app.pill("Paid", "green") : app.pill("Unpaid", "amber")}`,
      onMove: (r, before, value, app) => {
        if (["Shipped", "Delivered"].includes(value) && !r.dispatched) dispatch(r, app, value);
      },
    },
    {
      id: "purchases",
      label: "Purchase orders",
      icon: "truck",
      type: "table",
      entity: "purchases",
      sort: "date",
      dir: -1,
      filters: [{ key: "status", label: "Status", options: ["Draft", "Ordered", "Received"] }],
      columns: [
        { key: "no", label: "PO no.", html: (r) => `<b>${esc(r.no)}</b>` },
        { key: "date", label: "Date", date: true },
        { key: "supplier", label: "Supplier" },
        { key: "items", label: "Items", right: true, get: (r) => (r.lines || []).length },
        { key: "total", label: "Total", right: true, get: (r, app) => app.linesTotal(r.lines), html: (r, app) => esc(app.money(app.linesTotal(r.lines))) },
        { key: "status", label: "Status", html: (r, app) => app.pill(r.status, r.status === "Received" ? "green" : r.status === "Ordered" ? "amber" : "gray") },
      ],
    },
    {
      id: "moves",
      label: "Stock moves",
      icon: "list",
      type: "table",
      entity: "moves",
      sort: "date",
      dir: -1,
      filters: [{ key: "type", label: "Type", options: [{ value: "In", label: "Stock in" }, { value: "Out", label: "Stock out" }] }],
      columns: [
        { key: "date", label: "Date", date: true },
        { key: "product", label: "Product" },
        { key: "type", label: "Type", html: (r, app) => app.pill(r.type === "Out" ? "Out" : "In", r.type === "Out" ? "red" : "green") },
        { key: "qty", label: "Qty", right: true },
        { key: "reason", label: "Reason" },
        { key: "ref", label: "Reference" },
      ],
    },
    {
      id: "suppliers",
      label: "Suppliers",
      icon: "building",
      type: "table",
      entity: "suppliers",
      sort: "name",
      columns: [
        { key: "name", label: "Supplier", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "contact", label: "Contact" },
        { key: "phone", label: "Phone" },
        { key: "city", label: "City" },
        { key: "terms", label: "Terms" },
        { key: "bought", label: "Bought", right: true, get: (r, app) => sum(app.db.purchases.filter((p) => p.supplier === r.id && p.status === "Received"), (p) => app.linesTotal(p.lines)), html: (r, app) => esc(app.moneyShort(sum(app.db.purchases.filter((p) => p.supplier === r.id && p.status === "Received"), (p) => app.linesTotal(p.lines)))) },
      ],
    },
    {
      id: "customers",
      label: "Customers",
      icon: "users",
      type: "table",
      entity: "customers",
      sort: "name",
      filters: [{ key: "type", label: "Type", options: ["Retail", "Wholesale", "Online"] }],
      columns: [
        { key: "name", label: "Customer", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "phone", label: "Phone" },
        { key: "city", label: "City" },
        { key: "type", label: "Type" },
        { key: "spent", label: "Bought", right: true, get: (r, app) => sum(app.db.orders.filter((o) => o.customer === r.id && o.status !== "Cancelled"), (o) => app.linesTotal(o.lines)), html: (r, app) => esc(app.moneyShort(sum(app.db.orders.filter((o) => o.customer === r.id && o.status !== "Cancelled"), (o) => app.linesTotal(o.lines)))) },
        { key: "due", label: "Unpaid", right: true, get: (r, app) => sum(app.db.orders.filter((o) => o.customer === r.id && !o.paid && o.status !== "Cancelled"), (o) => app.linesTotal(o.lines)), html: (r, app) => esc(app.moneyShort(sum(app.db.orders.filter((o) => o.customer === r.id && !o.paid && o.status !== "Cancelled"), (o) => app.linesTotal(o.lines)))) },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const sales = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.orders.filter((o) => monthOf(o.date) === m && o.status !== "Cancelled"), (o) => app.linesTotal(o.lines)) }));
        const lines = db.orders.filter((o) => o.status !== "Cancelled" && o.date >= addDays(today(), -90)).flatMap((o) => o.lines || []);
        const profit = db.orders
          .filter((o) => o.status !== "Cancelled" && monthOf(o.date) === thisMonth())
          .flatMap((o) => o.lines || [])
          .reduce((s, l) => s + num(l.qty) * (num(l.price) - num(productByName(app, l.name)?.cost)), 0);
        const soldNames = new Set(db.orders.filter((o) => o.date >= addDays(today(), -60)).flatMap((o) => (o.lines || []).map((l) => l.name)));
        const slow = db.products.filter((p) => !soldNames.has(p.name) && num(p.stock) > 0);
        return [
          { title: "Sales by month", html: columnChart(sales, { fmt: (v) => app.moneyShort(v) }), table: sales.map((d) => [d.label, app.money(d.value)]) },
          { title: "Gross profit this month", html: `<div class="dx-kpi" style="box-shadow:none;border:0;padding:0"><b>${esc(app.money(profit))}</b><small>sale price − cost price, on this month's orders</small></div>` },
          { title: "Best sellers", note: "quantity, last 90 days", html: barList(groupSum(lines, (l) => l.name, (l) => l.qty)) },
          { title: "Best sellers by value", note: "last 90 days", html: barList(groupSum(lines, (l) => l.name, (l) => num(l.qty) * num(l.price)), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Slow movers", note: "in stock, not sold in 60 days", html: app.list(slow.slice(0, 10), (p) => `<li>${app.openLink("products", p, `<span class="dx-li-main"><b>${esc(p.name)}</b><small>${num(p.stock)} ${esc(p.unit || "")} · ${esc(app.money(num(p.stock) * num(p.cost)))} tied up</small></span>`)}</li>`, "Everything sold recently.") },
          { title: "Orders by status", html: barList(ORDER.map((s) => ({ label: s.label, value: db.orders.filter((o) => o.status === s.value).length }))) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const catalog = [
      ["Basmati rice 5kg", "Grocery", "pack", 1850, 2150],
      ["Cooking oil 5 ltr", "Grocery", "pack", 2650, 2950],
      ["Sugar 1kg", "Grocery", "kg", 145, 165],
      ["Atta 10kg", "Grocery", "pack", 1250, 1400],
      ["Tea 950g", "Beverages", "pack", 1480, 1690],
      ["Mineral water 1.5L (6)", "Beverages", "pack", 420, 520],
      ["Soft drink 1.5L", "Beverages", "pcs", 160, 200],
      ["Shampoo 400ml", "Personal care", "pcs", 590, 720],
      ["Soap (pack of 3)", "Personal care", "pack", 280, 345],
      ["Toothpaste", "Personal care", "pcs", 230, 290],
      ["Washing powder 1kg", "Household", "pack", 480, 560],
      ["Dish wash bar", "Household", "pcs", 95, 120],
      ["Tissue box", "Household", "pcs", 140, 185],
      ["A4 paper ream", "Stationery", "pack", 1350, 1600],
      ["Ball pens (box of 50)", "Stationery", "box", 620, 800],
      ["LED bulb 12W", "Electronics", "pcs", 210, 290],
      ["Extension board", "Electronics", "pcs", 650, 890],
      ["Mobile charger", "Electronics", "pcs", 520, 750],
      ["PVC pipe 1 inch", "Hardware", "pcs", 380, 470],
      ["Paint 1 gallon", "Hardware", "pcs", 2100, 2500],
    ];
    const suppliers = ["Unilever Distributor", "Punjab Grain Traders", "Sunrise Stationers", "Hall Road Electronics", "Brandreth Hardware"].map((n, i) => ({ id: "s" + i, name: n, contact: h.person("m"), phone: h.phone(), city: h.pick(["Lahore", "Karachi", "Faisalabad"]), terms: h.pick(["Cash", "15 days", "30 days"]) }));
    const products = catalog.map(([name, category, unit, cost, price], i) => ({ id: "pr" + i, name, sku: "SKU-" + String(i + 1).padStart(4, "0"), category, unit, cost, price, stock: i % 7 === 3 ? 0 : i % 5 === 1 ? h.int(2, 8) : h.int(20, 160), reorder: 10, supplier: "s" + (["Grocery", "Beverages"].includes(category) ? 1 : category === "Stationery" ? 2 : category === "Electronics" ? 3 : category === "Hardware" ? 4 : 0), location: "Rack " + h.pick(["A", "B", "C", "D"]) + h.int(1, 6) }));
    const customers = ["Al-Noor Store", "City Mart", "Rehman Kiryana", "Fresh Basket", "Daraz seller (online)", "Iqbal General Store", "Hostel canteen", "Corner Shop DHA"].map((n, i) => ({ id: "cu" + i, name: n, phone: h.phone(), city: h.pick(["Gulberg", "Samanabad", "Johar Town", "Model Town", "Online"]), type: i === 4 ? "Online" : i % 3 ? "Wholesale" : "Retail" }));
    const orders = [];
    for (let i = 0; i < 70; i++) {
      const d = -h.int(0, 160);
      const lines = Array.from({ length: h.int(1, 4) }, () => {
        const p = h.pick(products);
        return { name: p.name, qty: h.int(1, 12), price: p.price };
      });
      const status = d > -2 ? h.pick(["New", "New", "Packed", "Shipped"]) : d > -5 ? h.pick(["Shipped", "Delivered"]) : h.rand() < 0.06 ? "Cancelled" : "Delivered";
      orders.push({ no: "SO-" + String(i + 1).padStart(4, "0"), customer: h.pick(customers).id, date: h.day(d), status, lines, paid: status === "Delivered" ? h.rand() < 0.85 : h.rand() < 0.3, dispatched: ["Shipped", "Delivered"].includes(status) });
    }
    const purchases = Array.from({ length: 10 }, (_, i) => {
      const s = h.pick(suppliers);
      const lines = products.filter((p) => p.supplier === s.id).slice(0, 3).map((p) => ({ name: p.name, qty: h.int(10, 60), price: p.cost }));
      return { no: "PO-" + String(i + 1).padStart(4, "0"), supplier: s.id, date: h.day(-h.int(0, 120)), status: i < 2 ? "Ordered" : "Received", lines };
    });
    const moves = purchases.filter((p) => p.status === "Received").flatMap((p) => p.lines.map((l) => ({ date: p.date, product: products.find((x) => x.name === l.name).id, type: "In", qty: l.qty, reason: "Received", ref: p.no, applied: false })));
    return { products, suppliers, customers, orders, purchases, moves };
  },
});

function dispatch(r, app, to = "Shipped") {
  const missing = [];
  for (const l of r.lines || []) {
    const p = productByName(app, l.name);
    if (p) move(app, p.id, "Out", l.qty, "Sold", r.no);
    else missing.push(l.name);
  }
  r.dispatched = true;
  r.status = to;
  if (missing.length) app.toast(`Dispatched. Not in Products, so stock not changed: ${missing.join(", ")}`);
}

function printDoc(app, title, r, party = {}) {
  const sub = app.linesTotal(r.lines);
  const taxRate = title === "Invoice" ? num(app.setting("tax")) : 0;
  const tax = Math.round((sub * taxRate) / 100);
  app.print(
    `${title} ${r.no}`,
    `<div class="dx-doc-meta"><div><b>${title === "Invoice" ? "Bill to" : "Supplier"}:</b> ${esc(party?.name || "")}</div><div><b>Date:</b> ${esc(app.date(r.date))}</div><div><b>Phone:</b> ${esc(party?.phone || "")}</div><div><b>City:</b> ${esc(party?.city || "")}</div></div>${app.receiptLines({ lines: r.lines || [], sub, disc: 0, tax, taxRate, total: sub + tax, method: title === "Invoice" ? (r.paid ? "Paid" : "Unpaid") : "—" })}${r.notes ? `<p>${esc(r.notes)}</p>` : ""}`,
  );
}

export default app;
