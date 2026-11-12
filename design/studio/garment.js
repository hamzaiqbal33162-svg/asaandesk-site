// T-shirt and hoodie designs: a small card on the canvas with the garment colour and a size guide (print area per
// garment size, Adult S–XXL and Youth XS–XL). Canva's product page also takes a quantity and an order; AsaanDesk
// doesn't print, sell or ship, so the card says so and the print file is downloaded instead.
import { S, emit, commit, h } from "./state.js";
import { SHIRT_COLORS } from "./mockup.js";
import * as E from "./editor.js";

// Recommended print area (inches, width × height) and chest width of the garment, per size.
export const SIZE_GUIDE = {
  tshirt: {
    adult: [["S", 10, 13, 18], ["M", 11, 14, 20], ["L", 12, 16, 22], ["XL", 12, 16, 24], ["XXL", 13, 17, 26]],
    youth: [["XS", 8, 10, 15], ["S", 9, 11, 16], ["M", 10, 12, 17], ["L", 10, 13, 18], ["XL", 11, 14, 19]],
  },
  hoodie: {
    adult: [["S", 10, 11, 20], ["M", 11, 12, 21], ["L", 12, 14, 23], ["XL", 12, 14, 25], ["XXL", 13, 15, 27]],
    youth: [["XS", 8, 8, 16], ["S", 9, 9, 17], ["M", 9, 10, 18], ["L", 10, 11, 19], ["XL", 11, 12, 20]],
  },
};
const cm = (x) => (x * 2.54).toFixed(1);
export const garmentOf = (P) => (P?.mockup === "tshirt" || /^tshirt/.test(P?.id || "") ? "tshirt" : P?.mockup === "hoodie" || /^hoodie/.test(P?.id || "") ? "hoodie" : null);

let card = null;
/** Shows, updates or hides the card for the open design. */
export function renderGarment() {
  const vp = E.getViewport?.();
  const kind = S.design ? garmentOf(S.design.preset) : null;
  if (!vp || !kind) { card?.remove(); card = null; vp?.classList.remove("st-on-garment"); vp?.style.removeProperty("--garment"); return; }
  const g = (S.design.garment ||= { color: "#ffffff", fit: "adult", size: "L" });
  if (S.garmentOpen == null && innerWidth < 760) S.garmentOpen = false; // phones: a small button until opened
  const key = [kind, g.color, g.fit, g.size, S.garmentOpen !== false, S.garmentTable ? 1 : 0, S.design.preset.w, S.design.preset.h].join("|");
  if (card && card.dataset.key === key && card.isConnected) return;
  card?.remove();
  vp.style.setProperty("--garment", g.color);
  vp.classList.add("st-on-garment");
  card = h("aside.st-garment", { id: "garmentCard", "aria-label": kind === "hoodie" ? "Hoodie options" : "T-shirt options" });
  card.dataset.key = key;
  for (const ev of ["pointerdown", "dblclick", "wheel"]) card.addEventListener(ev, (e) => e.stopPropagation());
  const name = kind === "hoodie" ? "Hoodie" : "T-shirt";
  if (S.garmentOpen === false) {
    card.append(h("button.btn.small", { type: "button", id: "garmentOpen", text: `${name}: colour and size guide`, on: { click: () => { S.garmentOpen = true; renderGarment(); } } }));
    vp.append(card);
    return;
  }
  const rows = SIZE_GUIDE[kind][g.fit];
  const cur = rows.find((r) => r[0] === g.size) || rows[2];
  const set = (k, v) => { g[k] = v; if (k === "fit" && !SIZE_GUIDE[kind][v].some((r) => r[0] === g.size)) g.size = "M"; commit("garment"); renderGarment(); };
  const swatches = h("div.st-swatches", { role: "group", "aria-label": "Garment colour" },
    ...SHIRT_COLORS.map((c) => h("button.st-swatch", { type: "button", class: "st-swatch" + (g.color === c.id ? " on" : ""), style: { background: c.id }, title: c.label, "aria-label": c.label, "data-garment": c.id, "aria-pressed": String(g.color === c.id), on: { click: () => { set("color", c.id); if (S.mock) S.mock.color = c.id; } } })));
  const seg = (opts, v, onPick, label, id) => h("div.st-seg", { role: "group", "aria-label": label, id }, ...opts.map(([k, t]) => h("button.btn.small", { type: "button", class: "btn small" + (k === v ? " on" : ""), "data-v": k, "aria-pressed": String(k === v), text: t, on: { click: () => onPick(k) } })));
  const useSize = h("button.btn.small", { type: "button", id: "garmentUseSize", text: `Use the ${cur[0]} print area`, on: { click: () => {
    const P = { ...S.design.preset, w: cur[1], h: cur[2], unit: "in", label: `${name} print, ${g.fit === "youth" ? "Youth" : "Adult"} ${cur[0]} (${cur[1]} × ${cur[2]} in)` };
    emit("resize-in-place", P);
  } } });
  const table = h("table.st-sizetable", { id: "garmentSizeTable" },
    h("thead", {}, h("tr", {}, h("th", { text: "Size" }), h("th", { text: "Print area" }), h("th", { text: "Chest" }))),
    h("tbody", {}, ...rows.map((r) => h("tr", { class: r[0] === cur[0] ? "on" : "" }, h("td", { text: r[0] }), h("td", { text: `${r[1]} × ${r[2]} in (${cm(r[1])} × ${cm(r[2])} cm)` }), h("td", { text: `${r[3]} in` })))));
  card.append(
    h("div.st-garment-head", {}, h("b", { text: name }), h("button.st-garment-x", { type: "button", "aria-label": "Hide", title: "Hide", text: "×", on: { click: () => { S.garmentOpen = false; renderGarment(); } } })),
    h("span.st-lab", { text: "Garment colour" }), swatches,
    h("span.st-lab", { text: "Size guide" }), h("p.st-hint", { text: "Adult S to XXL, Youth XS to XL. Pick a size to see its print area." }),
    seg([["adult", "Adult"], ["youth", "Youth"]], g.fit, (v) => set("fit", v), "Adult or youth", "garmentFit"),
    seg(rows.map((r) => [r[0], r[0]]), cur[0], (v) => set("size", v), "Garment size", "garmentSize"),
    h("p.st-hint", { id: "garmentArea", text: `${g.fit === "youth" ? "Youth" : "Adult"} ${cur[0]}: print area ${cur[1]} × ${cur[2]} in (${cm(cur[1])} × ${cm(cur[2])} cm), chest ${cur[3]} in.` }),
    h("div.st-row.st-wrap", {}, useSize, h("button.btn.small", { type: "button", id: "garmentTable", text: S.garmentTable ? "Hide all sizes" : "All sizes", on: { click: () => { S.garmentTable = !S.garmentTable; renderGarment(); } } })),
    S.garmentTable ? table : null,
    h("p.st-hint.st-garment-note", { text: "Quantity and ordering aren't offered: AsaanDesk doesn't print, sell or ship. Download the print-ready file (Share › Download) and take it to any print shop." }),
  );
  vp.append(card);
}
