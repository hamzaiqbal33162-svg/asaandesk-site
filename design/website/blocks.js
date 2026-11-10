// Website builder: the site model, block definitions (with the fields shown in the Edit panel) and ONE pure
// renderer used for both the editor preview and the exported page, so what you see is what you export.
// No DOM here: Node tests import this file directly.
import { FONT_FAMILIES } from "../shared/brand.js";
import { art, iconSvg, ICON_NAMES } from "./art.js";

/* ------------------------------------------------------------------ small helpers */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uidB = () => "b" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const clone = (v) => JSON.parse(JSON.stringify(v));
const isIndex = (k) => /^\d+$/.test(k);
export function getPath(obj, path) {
  if (!path) return obj;
  return String(path).split(".").reduce((o, k) => (o == null ? undefined : o[isIndex(k) ? +k : k]), obj);
}
export function setPath(obj, path, value) {
  const keys = String(path).split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = isIndex(keys[i]) ? +keys[i] : keys[i];
    if (o[k] == null || typeof o[k] !== "object") o[k] = isIndex(keys[i + 1]) ? [] : {};
    o = o[k];
  }
  const last = keys[keys.length - 1];
  o[isIndex(last) ? +last : last] = value;
  return obj;
}
export const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "my-site";
export const waDigits = (s) => String(s || "").replace(/\D/g, "");
/** WhatsApp chat link (wa.me) with a prefilled message. Without a number WhatsApp asks who to send it to. */
export const waLink = (number, text = "") => `https://wa.me/${waDigits(number)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
/** Only safe link kinds: in-page anchors, web, email, phone, WhatsApp, relative files. Anything else becomes "#". */
export function safeHref(h) {
  const v = String(h ?? "").trim();
  if (!v) return "#";
  if (/^(#|mailto:|tel:|sms:|https?:\/\/)/i.test(v)) return v;
  if (/^(javascript|data|vbscript|file):/i.test(v)) return "#";
  if (/^www\./i.test(v)) return "https://" + v;
  if (/^\+?[\d\s-]{7,}$/.test(v)) return "tel:" + v.replace(/[\s-]/g, "");
  if (/^[\w.-]+\.(html?|pdf|jpe?g|png)$/i.test(v)) return v;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v)) return "mailto:" + v;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(v)) return "https://" + v;
  return "#";
}
const isExternal = (h) => /^https?:\/\//i.test(h);

/* ------------------------------------------------------------------ colours */
const hex6 = (h) => { const s = String(h || "").trim().toLowerCase(); if (/^#[0-9a-f]{6}$/.test(s)) return s; if (/^#[0-9a-f]{3}$/.test(s)) return "#" + [...s.slice(1)].map((c) => c + c).join(""); return null; };
const rgb = (h) => { const v = hex6(h) || "#000000"; return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)); };
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
export function luminance(h) {
  const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export const onColor = (bg) => (contrast(bg, "#ffffff") >= contrast(bg, "#111318") ? "#ffffff" : "#111318");
const rgba = (h, a) => `rgba(${rgb(h).join(",")},${a})`;

/* ------------------------------------------------------------------ theme */
export const MODES = { light: { bg: "#ffffff", text: "#1b2133" }, dark: { bg: "#0f1222", text: "#e9ebf5" } };
export const DEFAULT_THEME = { primary: "#5b4cf0", accent: "#ff7a59", bg: "#ffffff", text: "#1b2133", headingFont: "sans", bodyFont: "sans", corners: "soft", mode: "light" };
export const CORNERS = { sharp: { r: "3px", rb: "3px", label: "Sharp" }, soft: { r: "14px", rb: "10px", label: "Soft" }, round: { r: "26px", rb: "999px", label: "Round" } };
/** CSS font stack for an exported site: the FONT_FAMILIES stack without the editor-only "AD …" web font. */
export const fontStack = (key) => (FONT_FAMILIES[key] || FONT_FAMILIES.sans).css.split(",").slice(1).join(",").trim();

export function themeVars(theme) {
  const t = { ...DEFAULT_THEME, ...theme };
  const dark = t.mode === "dark";
  const bg = hex6(t.bg) || MODES[t.mode]?.bg || "#ffffff", fg = hex6(t.text) || MODES[t.mode]?.text || "#1b2133";
  const p = hex6(t.primary) || DEFAULT_THEME.primary, a = hex6(t.accent) || DEFAULT_THEME.accent;
  const c = CORNERS[t.corners] || CORNERS.soft;
  const ft = dark ? mix(bg, "#000000", 0.35) : mix(fg, "#000000", 0.25);
  return {
    "--p": p, "--a": a, "--onp": onColor(p), "--ona": onColor(a), "--bg": bg, "--fg": fg, "--hd": dark ? mix(fg, "#ffffff", 0.5) : mix(fg, "#000000", 0.25),
    "--mu": mix(fg, bg, 0.32), "--sf": mix(bg, fg, dark ? 0.06 : 0.045), "--card": dark ? mix(bg, "#ffffff", 0.05) : mix(bg, "#ffffff", 0.7),
    "--ln": mix(bg, fg, 0.13), "--ln2": mix(bg, fg, 0.25), "--pt": mix(bg, p, dark ? 0.22 : 0.12), "--pl": dark ? mix(p, "#ffffff", 0.35) : p,
    "--hbg": rgba(bg, 0.9), "--ft": ft, "--ftfg": mix(onColor(ft), ft, 0.15), "--r": c.r, "--rb": c.rb,
    "--hf": fontStack(t.headingFont), "--bf": fontStack(t.bodyFont), "color-scheme": dark ? "dark" : "light",
  };
}

/* ------------------------------------------------------------------ block definitions */
// Field kinds for the Edit panel: text, area (multi-line), lines (one per line -> array), email, tel, link ({label, href}),
// image (data: URL), icon, select, bool, list (array of objects with `item` fields).
const L = (label, href) => ({ label, href });
export const BLOCK_TYPES = {
  header: {
    label: "Header & menu", desc: "Your name or logo, menu links and a button.", anchor: "",
    fields: [{ k: "brand", t: "text", label: "Name" }, { k: "logo", t: "image", label: "Logo (optional)", optional: true },
      { k: "links", t: "list", label: "Menu links", itemLabel: "Link", item: [{ k: "label", t: "text", label: "Text" }, { k: "href", t: "href", label: "Goes to" }], add: () => L("New link", "#contact") },
      { k: "cta", t: "link", label: "Button" }],
    make: () => ({ brand: "My business", logo: "", links: [L("About", "#about"), L("Services", "#features"), L("Contact", "#contact")], cta: L("Contact us", "#contact") }),
  },
  hero: {
    label: "Hero", desc: "Big headline at the top with buttons and a picture.", anchor: "home",
    fields: [{ k: "eyebrow", t: "text", label: "Small line above" }, { k: "title", t: "text", label: "Headline" }, { k: "text", t: "area", label: "Text" },
      { k: "primary", t: "link", label: "Main button" }, { k: "secondary", t: "link", label: "Second button" }, { k: "image", t: "image", label: "Picture", optional: true },
      { k: "layout", t: "select", label: "Layout", options: [["split", "Text and picture"], ["cover", "Picture behind the text"], ["center", "Centred text only"]] }],
    make: () => ({ eyebrow: "Welcome", title: "A clear headline about what you do", text: "One or two short lines that tell visitors why you are the right choice.", primary: L("Get in touch", "#contact"), secondary: L("Learn more", "#about"), image: art("work"), layout: "split" }),
  },
  features: {
    label: "Features", desc: "Cards with an icon, a title and a short text.", anchor: "features",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" },
      { k: "items", t: "list", label: "Cards", itemLabel: "Card", item: [{ k: "icon", t: "icon", label: "Icon" }, { k: "title", t: "text", label: "Title" }, { k: "text", t: "area", label: "Text" }], add: () => ({ icon: "star", title: "New feature", text: "Say what makes this special." }) }],
    make: () => ({ title: "Why people choose us", intro: "", items: [{ icon: "shield", title: "Trusted", text: "Honest work and fair prices." }, { icon: "clock", title: "On time", text: "We keep our promises." }, { icon: "heart", title: "Friendly", text: "We listen and we care." }] }),
  },
  about: {
    label: "About", desc: "Your story with a picture.", anchor: "about",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "text", t: "area", label: "Text" }, { k: "image", t: "image", label: "Picture", optional: true }, { k: "button", t: "link", label: "Button" },
      { k: "side", t: "select", label: "Picture side", options: [["left", "Left"], ["right", "Right"]] }],
    make: () => ({ title: "About us", text: "Tell your story here: who you are, what you do and why you started.", image: art("shop"), button: L("", ""), side: "left" }),
  },
  gallery: {
    label: "Gallery", desc: "A grid of pictures with captions.", anchor: "gallery",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" },
      { k: "images", t: "list", label: "Pictures", itemLabel: "Picture", item: [{ k: "src", t: "image", label: "Picture" }, { k: "caption", t: "text", label: "Caption" }], add: () => ({ src: art("abstract", "violet", Math.floor(Math.random() * 1000)), caption: "" }) }],
    make: () => ({ title: "Gallery", intro: "", images: [1, 2, 3, 4, 5, 6].map((i) => ({ src: art("abstract", "violet", i), caption: "" })) }),
  },
  pricing: {
    label: "Services & prices", desc: "Packages or services with prices and a button.", anchor: "pricing",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" },
      { k: "plans", t: "list", label: "Packages", itemLabel: "Package", item: [{ k: "name", t: "text", label: "Name" }, { k: "price", t: "text", label: "Price" }, { k: "period", t: "text", label: "Per (e.g. /month)" },
        { k: "text", t: "area", label: "Short text" }, { k: "features", t: "lines", label: "What's included (one per line)" }, { k: "button", t: "link", label: "Button" }, { k: "featured", t: "bool", label: "Highlight this one" }],
      add: () => ({ name: "New package", price: "Rs 0", period: "", text: "", features: ["What is included"], button: L("Choose", "#contact"), featured: false }) }],
    make: () => ({ title: "Services and prices", intro: "Simple prices, no surprises.", plans: [
      { name: "Basic", price: "Rs 2,000", period: "", text: "For small jobs.", features: ["One visit", "Basic check"], button: L("Book", "#contact"), featured: false },
      { name: "Standard", price: "Rs 5,000", period: "", text: "Most popular.", features: ["Two visits", "Full check", "Free advice"], button: L("Book", "#contact"), featured: true },
      { name: "Premium", price: "Rs 9,000", period: "", text: "Everything included.", features: ["Unlimited visits", "Priority help"], button: L("Book", "#contact"), featured: false }] }),
  },
  products: {
    label: "Shop catalogue", desc: "Products with prices and an \"Order on WhatsApp\" button.", anchor: "shop",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" }, { k: "whatsapp", t: "tel", label: "WhatsApp number for orders" }, { k: "orderLabel", t: "text", label: "Order button text" },
      { k: "items", t: "list", label: "Products", itemLabel: "Product", item: [{ k: "image", t: "image", label: "Picture" }, { k: "name", t: "text", label: "Name" }, { k: "price", t: "text", label: "Price" }, { k: "text", t: "area", label: "Short text" }],
        add: () => ({ image: art("abstract", "forest", Math.floor(Math.random() * 1000)), name: "New product", price: "Rs 1,000", text: "" }) }],
    make: () => ({ title: "Shop", intro: "Order in one tap on WhatsApp.", whatsapp: "923000000000", orderLabel: "Order on WhatsApp", items: [
      { image: art("abstract", "forest", 3), name: "Product one", price: "Rs 1,500", text: "A short line about it." },
      { image: art("abstract", "forest", 4), name: "Product two", price: "Rs 2,200", text: "A short line about it." },
      { image: art("abstract", "forest", 5), name: "Product three", price: "Rs 900", text: "A short line about it." }] }),
  },
  testimonials: {
    label: "Testimonials", desc: "What your customers say.", anchor: "reviews",
    fields: [{ k: "title", t: "text", label: "Title" },
      { k: "items", t: "list", label: "Reviews", itemLabel: "Review", item: [{ k: "quote", t: "area", label: "Quote" }, { k: "name", t: "text", label: "Name" }, { k: "role", t: "text", label: "Role or city" }], add: () => ({ quote: "Great service!", name: "Customer name", role: "City" }) }],
    make: () => ({ title: "What our customers say", items: [{ quote: "Quick, friendly and honest. Highly recommended.", name: "Hina A.", role: "Lahore" }, { quote: "They explained everything and the price was fair.", name: "Bilal K.", role: "Karachi" }] }),
  },
  faq: {
    label: "FAQ", desc: "Questions and answers that open on tap.", anchor: "faq",
    fields: [{ k: "title", t: "text", label: "Title" },
      { k: "items", t: "list", label: "Questions", itemLabel: "Question", item: [{ k: "q", t: "text", label: "Question" }, { k: "a", t: "area", label: "Answer" }], add: () => ({ q: "A new question?", a: "The answer." }) }],
    make: () => ({ title: "Questions and answers", items: [{ q: "How do I order?", a: "Send us a message on WhatsApp or use the form below." }, { q: "Where are you?", a: "See the map section for our address." }] }),
  },
  team: {
    label: "Team", desc: "People with a photo, name and role.", anchor: "team",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" },
      { k: "members", t: "list", label: "People", itemLabel: "Person", item: [{ k: "photo", t: "image", label: "Photo" }, { k: "name", t: "text", label: "Name" }, { k: "role", t: "text", label: "Role" }], add: () => ({ photo: art("portrait", "violet", Math.floor(Math.random() * 8)), name: "Name", role: "Role" }) }],
    make: () => ({ title: "Meet the team", intro: "", members: [0, 1, 2].map((i) => ({ photo: art("portrait", "violet", i), name: ["Ali", "Sara", "Usman"][i], role: ["Founder", "Manager", "Expert"][i] })) }),
  },
  timeline: {
    label: "Timeline", desc: "Schedule, experience or steps in order.", anchor: "timeline",
    fields: [{ k: "title", t: "text", label: "Title" },
      { k: "items", t: "list", label: "Steps", itemLabel: "Step", item: [{ k: "when", t: "text", label: "When" }, { k: "title", t: "text", label: "Title" }, { k: "text", t: "area", label: "Text" }], add: () => ({ when: "Time", title: "New step", text: "" }) }],
    make: () => ({ title: "How it works", items: [{ when: "Step 1", title: "Tell us what you need", text: "" }, { when: "Step 2", title: "We visit and fix it", text: "" }, { when: "Step 3", title: "Pay when you are happy", text: "" }] }),
  },
  contact: {
    label: "Contact", desc: "Contact details, a WhatsApp button and an email form.", anchor: "contact",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "text", t: "area", label: "Text" }, { k: "email", t: "email", label: "Email (the form sends here)" }, { k: "phone", t: "tel", label: "Phone" },
      { k: "whatsapp", t: "tel", label: "WhatsApp number" }, { k: "waText", t: "text", label: "WhatsApp first message" }, { k: "waLabel", t: "text", label: "WhatsApp button text" }, { k: "address", t: "area", label: "Address" },
      { k: "formTitle", t: "text", label: "Form title" }, { k: "send", t: "text", label: "Send button text" }],
    make: () => ({ title: "Get in touch", text: "Message us on WhatsApp or send an email. We reply the same day.", email: "hello@example.com", phone: "+92 300 0000000", whatsapp: "923000000000", waText: "Hello! I have a question.", waLabel: "Chat on WhatsApp", address: "Main Boulevard, Lahore", formTitle: "Send us a message", send: "Send message" }),
  },
  map: {
    label: "Map link", desc: "Your address with an \"Open in Maps\" button.", anchor: "location",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "address", t: "area", label: "Address" }, { k: "note", t: "area", label: "Opening hours or note" }, { k: "query", t: "text", label: "Map search (place or address)" },
      { k: "label", t: "text", label: "Button text" }, { k: "image", t: "image", label: "Picture", optional: true }],
    make: () => ({ title: "Find us", address: "Main Boulevard, Lahore", note: "Open every day, 10am to 9pm.", query: "Main Boulevard Lahore", label: "Open in Maps", image: art("map") }),
  },
  footer: {
    label: "Footer", desc: "Bottom line with links and copyright.", anchor: "",
    fields: [{ k: "text", t: "area", label: "Text" }, { k: "links", t: "list", label: "Links", itemLabel: "Link", item: [{ k: "label", t: "text", label: "Text" }, { k: "href", t: "href", label: "Goes to" }], add: () => L("New link", "#top") },
      { k: "copy", t: "text", label: "Copyright line" }],
    make: () => ({ text: "Thanks for visiting.", links: [L("Home", "#top"), L("Contact", "#contact")], copy: "© 2026 My business" }),
  },
};
export const BLOCK_ORDER = ["header", "hero", "features", "about", "gallery", "pricing", "products", "testimonials", "faq", "team", "timeline", "contact", "map", "footer"];
export const BG_CHOICES = [["", "Page colour"], ["alt", "Soft grey"], ["tint", "Light main colour"], ["primary", "Main colour"], ["dark", "Dark"]];

export function newBlock(type, data = {}, style = {}) {
  const def = BLOCK_TYPES[type];
  if (!def) throw new Error("Unknown block type " + type);
  return { id: uidB(), type, data: { ...def.make(), ...clone(data) }, style: { bg: "", bgImage: "", ...style } };
}
/** Makes any stored or imported JSON a valid site (unknown blocks dropped, missing fields filled in). */
export function normalizeSite(json) {
  const s = json && typeof json === "object" ? json : {};
  const ids = new Set();
  const blocks = (Array.isArray(s.blocks) ? s.blocks : []).filter((b) => b && BLOCK_TYPES[b.type]).map((b) => {
    let id = typeof b.id === "string" && /^[\w-]{1,40}$/.test(b.id) ? b.id : uidB();
    if (ids.has(id)) id = uidB();
    ids.add(id);
    return { id, type: b.type, anchor: typeof b.anchor === "string" ? b.anchor : undefined, data: { ...BLOCK_TYPES[b.type].make(), ...(b.data || {}) }, style: { bg: "", bgImage: "", ...(b.style || {}) } };
  });
  return { version: 1, name: String(s.name || "My website").slice(0, 120), description: String(s.description ?? "").slice(0, 300), lang: /^[a-z]{2}(-[A-Za-z]{2})?$/.test(s.lang || "") ? s.lang : "en", template: s.template || "", theme: { ...DEFAULT_THEME, ...(s.theme || {}) }, blocks };
}

/* site edits (pure, in place) */
export function moveBlock(site, from, to) {
  const n = site.blocks.length;
  if (from < 0 || from >= n) return false;
  to = Math.max(0, Math.min(n - 1, to));
  if (from === to) return false;
  const [b] = site.blocks.splice(from, 1);
  site.blocks.splice(to, 0, b);
  return true;
}
export function insertBlock(site, block, index = site.blocks.length) { site.blocks.splice(Math.max(0, Math.min(site.blocks.length, index)), 0, block); return block; }
export function removeBlock(site, id) { const i = site.blocks.findIndex((b) => b.id === id); if (i >= 0) site.blocks.splice(i, 1); return i; }
export function duplicateBlock(site, id) {
  const i = site.blocks.findIndex((b) => b.id === id);
  if (i < 0) return null;
  const copy = { ...clone(site.blocks[i]), id: uidB() };
  delete copy.anchor;
  site.blocks.splice(i + 1, 0, copy);
  return copy;
}
/** Where a new block goes: after the selected one, else before the footer, else at the end. */
export function insertIndex(site, selectedId) {
  const i = site.blocks.findIndex((b) => b.id === selectedId);
  if (i >= 0) return site.blocks[i].type === "footer" ? i : i + 1;
  const f = site.blocks.findIndex((b) => b.type === "footer");
  return f >= 0 ? f : site.blocks.length;
}
/** Section ids (anchors) for each block, unique on the page. */
export function anchors(site) {
  const used = new Set(["top", "main"]), out = {};
  for (const b of site.blocks) {
    let base = slugify(b.anchor || BLOCK_TYPES[b.type]?.anchor || "");
    if (!BLOCK_TYPES[b.type]?.anchor && !b.anchor) continue;
    if (!base || base === "my-site") base = b.type;
    let a = base, k = 2;
    while (used.has(a)) a = `${base}-${k++}`;
    used.add(a);
    out[b.id] = a;
  }
  return out;
}
export const blockTitle = (b) => {
  const d = b.data || {};
  const t = String(d.title || d.brand || d.text || "").replace(/\s+/g, " ").trim();
  return t.length > 34 ? t.slice(0, 33) + "…" : t;
};

/* ------------------------------------------------------------------ renderer */
const SCRIPT = `(function(){var d=document;function shut(m){m.setAttribute("aria-expanded","false");var n=d.getElementById(m.getAttribute("aria-controls"));if(n)n.classList.remove("open")}d.addEventListener("click",function(e){var t=e.target;if(!t||!t.closest)return;var b=t.closest(".menu-btn");if(b){var n=d.getElementById(b.getAttribute("aria-controls")),o=b.getAttribute("aria-expanded")!=="true";b.setAttribute("aria-expanded",String(o));if(n)n.classList.toggle("open",o);return}if(t.closest(".nav a")){var m=d.querySelector('.menu-btn[aria-expanded="true"]');if(m)shut(m)}});d.addEventListener("keydown",function(e){if(e.key==="Escape"){var m=d.querySelector('.menu-btn[aria-expanded="true"]');if(m){shut(m);m.focus()}}});d.addEventListener("toggle",function(e){var t=e.target;if(d.documentElement.hasAttribute("data-editing")||!t||t.tagName!=="DETAILS"||!t.open)return;var f=t.closest(".faq");if(f)f.querySelectorAll("details[open]").forEach(function(o){if(o!==t)o.open=false})},true)})();`;
export const SITE_SCRIPT = SCRIPT;

const BASE_CSS = `*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;scroll-padding-top:80px}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.65 var(--bf)}
img{max-width:100%;height:auto;display:block}a{color:var(--pl)}
h1,h2,h3{font-family:var(--hf);line-height:1.15;margin:0 0 .45em;color:var(--hd);overflow-wrap:break-word}
h1{font-size:clamp(2.1rem,5.2vw,3.6rem);letter-spacing:-.025em}h2{font-size:clamp(1.65rem,3.4vw,2.4rem);letter-spacing:-.015em}h3{font-size:1.18rem}
p{margin:0 0 1em}.wrap{width:min(1140px,100% - 40px);margin-inline:auto}
:focus-visible{outline:3px solid var(--a);outline-offset:3px}
.skip{position:absolute;left:-9999px;top:10px;z-index:20;background:var(--p);color:var(--onp);padding:10px 16px;border-radius:var(--rb)}.skip:focus{left:10px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.blk{padding:clamp(56px,8vw,104px) 0;position:relative}
.sec-head{max-width:720px;margin:0 auto 40px;text-align:center}.lead{font-size:1.14rem;color:var(--mu)}
.eyebrow{display:inline-block;font-weight:700;font-size:.9rem;letter-spacing:.02em;color:var(--pl);background:var(--pt);padding:6px 14px;border-radius:999px;margin-bottom:18px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 24px;border-radius:var(--rb);background:var(--p);color:var(--onp);font:700 1rem/1.2 var(--bf);text-decoration:none;border:2px solid var(--p);cursor:pointer;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.16)}.btn.ghost{background:transparent;color:var(--pl);border-color:currentColor}.btn-sm{padding:9px 18px;font-size:.95rem}
.btn.wa{background:#1d9b52;border-color:#1d9b52;color:#fff}.btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px}.center{text-align:center}.center .actions{justify-content:center}.center .lead{margin-inline:auto;max-width:640px}
.card{background:var(--card);border:1px solid var(--ln);border-radius:var(--r);padding:26px}
.grid{display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))}
.site-head{position:sticky;top:0;z-index:10;background:var(--hbg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--ln)}
.nav-wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px}
.logo{display:inline-flex;align-items:center;gap:10px;font:800 1.3rem/1.1 var(--hf);color:var(--hd);text-decoration:none}.logo img{height:42px;width:auto}
.nav{display:flex;align-items:center;gap:26px}.nav ul{display:flex;gap:22px;list-style:none;margin:0;padding:0}.nav ul a{color:var(--fg);text-decoration:none;font-weight:600}.nav ul a:hover{color:var(--pl)}
.menu-btn{display:none;align-items:center;gap:8px;border:1px solid var(--ln2);background:transparent;color:var(--fg);font:700 .95rem/1 var(--bf);padding:10px 14px;border-radius:var(--rb);cursor:pointer}
.menu-btn .bars,.menu-btn .bars::before,.menu-btn .bars::after{display:block;width:18px;height:2px;background:currentColor;border-radius:2px;position:relative}.menu-btn .bars::before,.menu-btn .bars::after{content:"";position:absolute;left:0}.menu-btn .bars::before{top:-6px}.menu-btn .bars::after{top:6px}
@media (max-width:780px){.menu-btn{display:inline-flex}.nav{display:none;position:absolute;left:0;right:0;top:100%;flex-direction:column;align-items:stretch;gap:12px;padding:12px 20px 22px;background:var(--bg);border-bottom:1px solid var(--ln);box-shadow:0 18px 30px rgba(0,0,0,.12)}.nav.open{display:flex}.nav ul{flex-direction:column;gap:0}.nav ul a{display:block;padding:12px 4px;border-bottom:1px solid var(--ln)}}
.hero-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center}.hero-media img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--r);box-shadow:0 30px 60px rgba(0,0,0,.14)}
.blk-hero .lead{font-size:1.22rem}.hero-c{max-width:820px}.blk-hero.has-img{padding:clamp(96px,14vw,180px) 0}
.split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}.split.rev .split-media{order:2}.split-media img{width:100%;border-radius:var(--r);aspect-ratio:4/3;object-fit:cover}
.text-block p:last-child{margin-bottom:0}
.feat .ic{width:52px;height:52px;border-radius:calc(var(--r)*.8);display:grid;place-items:center;background:var(--pt);color:var(--pl);margin-bottom:16px}.ic svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.feat p{color:var(--mu);margin:0}
.gal{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))}.gal figure{margin:0}.gal img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--r)}.gal figcaption{font-size:.92rem;color:var(--mu);margin-top:8px}
.plan{display:flex;flex-direction:column;position:relative}.plan.featured{border:2px solid var(--p);box-shadow:0 24px 50px rgba(0,0,0,.12)}.plan .badge{position:absolute;top:-13px;left:24px;background:var(--a);color:var(--ona);font-size:.8rem;font-weight:800;padding:4px 12px;border-radius:999px}
.price{font:800 2.1rem/1.1 var(--hf);color:var(--hd);margin:4px 0 8px}.price small{font-size:.95rem;color:var(--mu);font-weight:600}.plan p{color:var(--mu)}
.plan ul{list-style:none;padding:0;margin:6px 0 24px;flex:1}.plan li{padding:7px 0 7px 28px;position:relative;border-top:1px solid var(--ln)}.plan li::before{content:"";position:absolute;left:5px;top:15px;width:11px;height:6px;border:solid var(--pl);border-width:0 0 2.5px 2.5px;transform:rotate(-45deg)}
.prod{display:flex;flex-direction:column;padding:16px}.prod img{width:100%;aspect-ratio:5/4;object-fit:cover;border-radius:calc(var(--r)*.8);margin-bottom:14px}.prod .price{font-size:1.35rem}.prod p{color:var(--mu);flex:1}.prod .btn{margin-top:6px}
.quote{margin:0;display:flex;flex-direction:column}.quote blockquote{margin:0 0 16px;font-size:1.08rem;flex:1}.quote blockquote::before{content:"\\201C";display:block;font:800 3rem/1 var(--hf);color:var(--pl);height:.6em}.quote figcaption{color:var(--mu)}.quote strong{display:block;color:var(--hd)}
.faq{max-width:820px;margin-inline:auto}.faq details{border:1px solid var(--ln);border-radius:var(--r);background:var(--card);margin-bottom:12px}
.faq summary{cursor:pointer;padding:18px 22px;font-weight:700;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:14px;color:var(--hd)}.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font-size:1.6rem;line-height:1;color:var(--pl);transition:transform .2s}.faq details[open] summary::after{transform:rotate(45deg)}.faq .ans{padding:0 22px 20px;color:var(--mu)}.faq .ans p{margin:0}
.member{text-align:center}.member img{width:150px;height:150px;border-radius:50%;object-fit:cover;margin:0 auto 16px;border:4px solid var(--pt)}.member p{color:var(--mu);margin:0}
.tl{list-style:none;margin:0 auto;padding:0;max-width:760px;border-left:3px solid var(--pt)}.tl li{position:relative;padding:0 0 30px 30px}.tl li:last-child{padding-bottom:0}.tl li::before{content:"";position:absolute;left:-11px;top:5px;width:19px;height:19px;border-radius:50%;background:var(--p);border:4px solid var(--bg)}
.when{display:block;font-weight:800;color:var(--pl);font-size:.92rem;margin-bottom:2px}.tl p{color:var(--mu);margin:0}
.contact{align-items:start}.contact-list{list-style:none;padding:0;margin:20px 0 24px;display:grid;gap:12px}.contact-list li{display:flex;gap:12px;align-items:flex-start}.contact-list .ic{width:40px;height:40px;flex:none;margin:0}.contact-list .ic svg{width:20px;height:20px}
.form{display:grid;gap:14px}.form h3{margin:0}.form label{display:grid;gap:6px;font-weight:600;font-size:.95rem}.form input,.form textarea{font:inherit;padding:12px 14px;border:1px solid var(--ln2);border-radius:var(--rb);background:var(--bg);color:var(--fg);width:100%}.form textarea{border-radius:min(var(--rb),16px);resize:vertical}.form .note{font-size:.88rem;color:var(--mu);margin:0}
.mapcard{display:grid;grid-template-columns:1.2fr 1fr;padding:0;overflow:hidden}.mapcard img{width:100%;height:100%;min-height:260px;object-fit:cover}.mapcard .body{padding:32px}.mapcard p{color:var(--mu)}
.site-foot{padding:44px 0;background:var(--ft);color:var(--ftfg)}.foot{display:flex;flex-wrap:wrap;gap:18px 32px;justify-content:space-between;align-items:center}.foot p{margin:0}.foot ul{display:flex;flex-wrap:wrap;gap:8px 22px;list-style:none;margin:0;padding:0}.foot a{color:inherit}.foot .copy{opacity:.8;font-size:.92rem;flex-basis:100%}
.bg-alt{background:var(--sf)}.bg-tint{background:var(--pt)}
.bg-primary{background:var(--p);--fg:var(--onp);--hd:var(--onp);--mu:var(--onp);--mu:color-mix(in srgb,var(--onp) 82%,transparent);--card:color-mix(in srgb,var(--onp) 10%,transparent);--ln:color-mix(in srgb,var(--onp) 25%,transparent);--pl:var(--onp);--pt:color-mix(in srgb,var(--onp) 18%,transparent);color:var(--fg)}
.bg-primary .btn{background:var(--onp);color:var(--p);border-color:var(--onp)}.bg-primary .btn.ghost{background:transparent;color:var(--onp)}
.bg-dark{background:var(--ft)}
.on-dark,.bg-dark{--fg:#eef0f7;--hd:#ffffff;--mu:#c9cdda;--card:rgba(255,255,255,.07);--ln:rgba(255,255,255,.16);--ln2:rgba(255,255,255,.3);--pt:rgba(255,255,255,.14);--pl:#ffffff;color:var(--fg)}
.on-light{--fg:#1b2133;--hd:#11131c;--mu:#535b70;--card:#ffffff;--ln:rgba(0,0,0,.1);--ln2:rgba(0,0,0,.2);color:var(--fg)}
.has-img{background-size:cover;background-position:center}
@media (max-width:860px){.hero-grid,.split,.mapcard{grid-template-columns:1fr}.split.rev .split-media{order:0}.hero-grid{gap:36px}}
@media (max-width:520px){body{font-size:16px}.wrap{width:calc(100% - 32px)}.card{padding:20px}.actions .btn{flex:1 1 auto}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}`;

const EDIT_CSS = `[data-edit]{outline:1.5px dashed transparent;outline-offset:3px;border-radius:4px;cursor:text;min-width:1ch;transition:outline-color .15s}
[data-edit]:hover{outline-color:rgba(91,76,240,.6)}[data-edit]:focus{outline:2px solid #5b4cf0;outline-offset:3px}
[data-edit]:empty::before{content:attr(data-ph);opacity:.45}
[data-img]{cursor:pointer;transition:outline-color .15s;outline:3px solid transparent;outline-offset:-3px}[data-img]:hover{outline-color:rgba(91,76,240,.75)}
[data-link]{cursor:pointer}[data-link]:hover{outline:2px dashed rgba(91,76,240,.8);outline-offset:3px}
[data-block]{transition:box-shadow .15s}[data-block]:hover{box-shadow:inset 0 0 0 1px rgba(91,76,240,.35)}[data-block].ed-sel{box-shadow:inset 0 0 0 3px #5b4cf0}
.ed-empty{display:grid;place-items:center;min-height:160px;border:2px dashed var(--ln2);border-radius:var(--r);color:var(--mu);font-weight:600;cursor:pointer}`;

/** The site CSS (theme variables + layout). */
export function siteCss(theme) {
  const vars = Object.entries(themeVars(theme)).map(([k, v]) => `${k}:${v}`).join(";");
  return `:root{${vars}}\n${BASE_CSS}`;
}

function faviconSvg(site) {
  const t = { ...DEFAULT_THEME, ...site.theme };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${hex6(t.primary) || "#5b4cf0"}"/><circle cx="32" cy="32" r="14" fill="none" stroke="${onColor(hex6(t.primary) || "#5b4cf0")}" stroke-width="6"/></svg>`;
}

/**
 * The whole page as an HTML string.
 * mode: 'export' (clean HTML) or 'edit' (adds data-edit / data-link / data-img hooks for the editor).
 * imageMode: 'inline' (data: URLs) or 'files' (images/… paths; `assets` Map(dataUrl -> path) is filled for the zip).
 */
export function renderSite(input, { mode = "export", imageMode = "inline", assets = null } = {}) {
  const site = normalizeSite(input);
  const edit = mode === "edit";
  const files = imageMode === "files";
  const assetMap = assets || new Map();
  const extOf = (url) => ({ "image/svg+xml": "svg", "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[(/^data:([^;,]+)/.exec(url) || [])[1]] || "bin");
  const asset = (url, name) => {
    if (!url || !files || !/^data:/.test(url)) return url;
    if (!assetMap.has(url)) assetMap.set(url, name ? `images/${name}.${extOf(url)}` : `images/image-${assetMap.size + 1}.${extOf(url)}`);
    return assetMap.get(url);
  };
  const ids = anchors(site);
  const hasTitle = (b) => !!String(b.data.title || "").trim();
  const h1Id = (site.blocks.find((b) => b.type === "hero" && hasTitle(b)) || site.blocks.find((b) => !["header", "footer"].includes(b.type) && hasTitle(b)))?.id || null;

  const renderBlock = (b) => {
    const d = b.data, isH1 = b.id === h1Id;
    const T = (tag, path, { cls = "", multi = false, ph = "", attrs = "" } = {}) => {
      const v = String(getPath(d, path) ?? "");
      if (!edit && !v.trim()) return "";
      const inner = multi ? esc(v.trim()).replace(/\r?\n/g, "<br>") : esc(v.trim());
      const ea = edit ? ` data-edit="${esc(path)}" contenteditable="plaintext-only" spellcheck="true" data-ph="${esc(ph || "Type here")}"${multi ? ' data-multi="1"' : ""}` : "";
      return `<${tag}${cls ? ` class="${cls}"` : ""}${attrs}${ea}>${inner}</${tag}>`;
    };
    const A = (path, cls = "btn", { li = false } = {}) => {
      const l = getPath(d, path);
      if (!l || (!String(l.label || "").trim() && !edit)) return "";
      const href = safeHref(l.href);
      const out = `<a${cls ? ` class="${cls}"` : ""} href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ""}${edit ? ` data-link="${esc(path)}"` : ""}>${esc(String(l.label || "").trim() || (edit ? "Add button text" : ""))}</a>`;
      return li ? `<li>${out}</li>` : out;
    };
    const I = (path, alt, { cls = "", eager = false, ph = "Add a picture" } = {}) => {
      const src = getPath(d, path);
      if (!src) return edit ? `<div class="ed-empty" data-img="${esc(path)}" role="button" tabindex="0">${esc(ph)}</div>` : "";
      return `<img src="${esc(asset(src))}" alt="${esc(String(alt || "").trim())}"${cls ? ` class="${cls}"` : ""}${eager ? "" : ' loading="lazy"'} decoding="async"${edit ? ` data-img="${esc(path)}"` : ""}>`;
    };
    const items = (k) => (Array.isArray(d[k]) ? d[k] : []);
    const head = (center = true, introKey = "intro") => {
      const h = T(isH1 ? "h1" : "h2", "title", { ph: "Section title" }) + (introKey ? T("p", introKey, { cls: "lead", multi: true, ph: "Short intro (optional)" }) : "");
      return h ? `<div class="${center ? "sec-head" : "text-head"}">${h}</div>` : "";
    };
    // Section wrapper with the block's background.
    const st = b.style || {};
    let cls = "", css = "";
    const bg = st.bg || "";
    if (["alt", "tint", "primary", "dark"].includes(bg)) cls += ` bg-${bg}`;
    else if (hex6(bg)) { css += `background-color:${hex6(bg)};`; cls += luminance(hex6(bg)) < 0.4 ? " on-dark" : " on-light"; }
    const coverImg = b.type === "hero" && d.layout === "cover" && d.image ? d.image : "";
    const bgImg = coverImg || st.bgImage;
    if (bgImg) { css += `background-image:linear-gradient(rgba(12,14,28,.58),rgba(12,14,28,.58)),url("${asset(bgImg)}");`; cls += " has-img on-dark"; }
    const attrs = (css ? ` style="${esc(css)}"` : "") + (edit ? ` data-block="${esc(b.id)}"` : "");
    const section = (inner) => `<section id="${ids[b.id]}" class="blk blk-${b.type}${cls}"${attrs}>${inner}</section>`;

    switch (b.type) {
      case "header": {
        const navId = `nav-${b.id}`;
        const links = items("links").map((_, i) => A(`links.${i}`, "", { li: true })).join("");
        const logo = d.logo ? I("logo", d.brand ? `${d.brand} logo` : "Logo", { eager: true }) : "";
        return `<header class="site-head${cls}"${attrs}><div class="wrap nav-wrap"><a class="logo" href="#top">${logo}${T("span", "brand", { ph: "Your name" }) || (logo ? "" : `<span>${esc(site.name)}</span>`)}</a>` +
          `<button class="menu-btn" type="button" aria-expanded="false" aria-controls="${navId}"><span class="bars" aria-hidden="true"></span>Menu</button>` +
          `<nav id="${navId}" class="nav" aria-label="Main menu">${links ? `<ul>${links}</ul>` : ""}${A("cta", "btn btn-sm")}</nav></div></header>`;
      }
      case "hero": {
        const split = d.layout !== "center" && d.layout !== "cover" && (d.image || edit);
        const btns = A("primary") + A("secondary", "btn ghost");
        const text = T("p", "eyebrow", { cls: "eyebrow", ph: "Small line above" }) + T(isH1 ? "h1" : "h2", "title", { ph: "Big headline" }) + T("p", "text", { cls: "lead", multi: true, ph: "A short line about you" }) + (btns ? `<div class="actions">${btns}</div>` : "");
        return section(split ? `<div class="wrap hero-grid"><div class="hero-text">${text}</div><div class="hero-media">${I("image", d.title, { eager: true })}</div></div>` : `<div class="wrap hero-c center">${text}</div>`);
      }
      case "features":
        return section(`<div class="wrap">${head()}<div class="grid">${items("items").map((it, i) => `<article class="card feat"><div class="ic">${iconSvg(it.icon)}</div>${T("h3", `items.${i}.title`, { ph: "Title" })}${T("p", `items.${i}.text`, { multi: true, ph: "Text" })}</article>`).join("")}</div></div>`);
      case "about": {
        const media = d.image || edit ? `<div class="split-media">${I("image", d.title)}</div>` : "";
        const body = `<div class="text-block">${T(isH1 ? "h1" : "h2", "title", { ph: "Title" })}${T("p", "text", { multi: true, ph: "Your story" })}${d.button?.label || edit ? `<div class="actions">${A("button")}</div>` : ""}</div>`;
        return section(`<div class="wrap ${media ? `split${d.side === "right" ? " rev" : ""}` : "about-c"}">${media}${body}</div>`);
      }
      case "gallery":
        return section(`<div class="wrap">${head()}<div class="gal">${items("images").map((g, i) => `<figure>${I(`images.${i}.src`, g.caption || `${d.title || "Gallery"} picture ${i + 1}`)}${T("figcaption", `images.${i}.caption`, { ph: "Caption (optional)" })}</figure>`).join("")}</div></div>`);
      case "pricing":
        return section(`<div class="wrap">${head()}<div class="grid">${items("plans").map((p, i) => {
          const feats = (Array.isArray(p.features) ? p.features : []).map((f, j) => (String(f).trim() || edit ? `<li${edit ? ` data-edit="plans.${i}.features.${j}" contenteditable="plaintext-only" data-ph="Feature"` : ""}>${esc(String(f).trim())}</li>` : "")).join("");
          return `<article class="card plan${p.featured ? " featured" : ""}">${p.featured ? '<span class="badge">Popular</span>' : ""}${T("h3", `plans.${i}.name`, { ph: "Name" })}<p class="price">${T("span", `plans.${i}.price`, { ph: "Price" })}${T("small", `plans.${i}.period`, { ph: "" })}</p>${T("p", `plans.${i}.text`, { multi: true, ph: "Short text" })}${feats ? `<ul>${feats}</ul>` : ""}${A(`plans.${i}.button`, p.featured ? "btn" : "btn ghost")}</article>`;
        }).join("")}</div></div>`);
      case "products": {
        const label = String(d.orderLabel || "Order on WhatsApp").trim();
        return section(`<div class="wrap">${head()}<div class="grid">${items("items").map((p, i) => {
          const msg = `Hello! I would like to order: ${String(p.name || "").trim()}${p.price ? ` (${String(p.price).trim()})` : ""}.`;
          return `<article class="card prod">${I(`items.${i}.image`, p.name)}${T("h3", `items.${i}.name`, { ph: "Product name" })}<p class="price">${T("span", `items.${i}.price`, { ph: "Price" })}</p>${T("p", `items.${i}.text`, { multi: true, ph: "Short text" })}<a class="btn wa" href="${esc(waLink(d.whatsapp, msg))}" target="_blank" rel="noopener"${edit ? ' data-order="1"' : ""}>${iconSvg("chat")}<span>${esc(label)}</span></a></article>`;
        }).join("")}</div></div>`);
      }
      case "testimonials":
        return section(`<div class="wrap">${head(true, "")}<div class="grid">${items("items").map((q, i) => `<figure class="card quote"><blockquote>${T("p", `items.${i}.quote`, { multi: true, ph: "What they said" })}</blockquote><figcaption>${T("strong", `items.${i}.name`, { ph: "Name" })}${T("span", `items.${i}.role`, { ph: "Role or city" })}</figcaption></figure>`).join("")}</div></div>`);
      case "faq":
        return section(`<div class="wrap">${head(true, "")}<div class="faq">${items("items").map((q, i) => `<details${edit ? " open" : ""}><summary>${T("span", `items.${i}.q`, { ph: "Question" })}</summary><div class="ans">${T("p", `items.${i}.a`, { multi: true, ph: "Answer" })}</div></details>`).join("")}</div></div>`);
      case "team":
        return section(`<div class="wrap">${head()}<div class="grid">${items("members").map((m, i) => `<article class="card member">${I(`members.${i}.photo`, m.name ? `Photo of ${m.name}` : "Team member photo")}${T("h3", `members.${i}.name`, { ph: "Name" })}${T("p", `members.${i}.role`, { ph: "Role" })}</article>`).join("")}</div></div>`);
      case "timeline":
        return section(`<div class="wrap">${head(true, "")}<ol class="tl">${items("items").map((s, i) => `<li>${T("span", `items.${i}.when`, { cls: "when", ph: "When" })}${T("h3", `items.${i}.title`, { ph: "Title" })}${T("p", `items.${i}.text`, { multi: true, ph: "Details (optional)" })}</li>`).join("")}</ol></div>`);
      case "contact": {
        const email = String(d.email || "").trim(), phone = String(d.phone || "").trim(), wa = waDigits(d.whatsapp);
        const li = (icon, inner) => `<li><span class="ic">${iconSvg(icon)}</span><span>${inner}</span></li>`;
        const list = [
          email ? li("chat", `<a href="mailto:${esc(email)}">${esc(email)}</a>`) : "",
          phone ? li("phone", `<a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">${esc(phone)}</a>`) : "",
          String(d.address || "").trim() || edit ? li("pin", T("span", "address", { multi: true, ph: "Address" })) : "",
        ].join("");
        const waBtn = wa ? `<a class="btn wa" href="${esc(waLink(wa, String(d.waText || "").trim()))}" target="_blank" rel="noopener">${iconSvg("chat")}${T("span", "waLabel", { ph: "Chat on WhatsApp" }) || "<span>Chat on WhatsApp</span>"}</a>` : "";
        const fid = (k) => `${k}-${b.id}`;
        const form = `<form class="card form" action="mailto:${esc(email)}" method="post" enctype="text/plain">${T("h3", "formTitle", { ph: "Form title" })}` +
          `<label for="${fid("name")}">Your name</label><input id="${fid("name")}" name="name" type="text" autocomplete="name" required>` +
          `<label for="${fid("email")}">Your email</label><input id="${fid("email")}" name="email" type="email" autocomplete="email" required>` +
          `<label for="${fid("msg")}">Message</label><textarea id="${fid("msg")}" name="message" rows="4" required></textarea>` +
          `<button class="btn" type="submit">${esc(String(d.send || "Send message").trim() || "Send message")}</button><p class="note">This opens your email app with the message ready to send.</p></form>`;
        return section(`<div class="wrap split contact"><div class="text-block">${T(isH1 ? "h1" : "h2", "title", { ph: "Title" })}${T("p", "text", { cls: "lead", multi: true, ph: "Short text" })}${list ? `<ul class="contact-list">${list}</ul>` : ""}${waBtn}</div>${email ? form : ""}</div>`);
      }
      case "map": {
        const q = String(d.query || d.address || "").trim();
        const link = q ? `<a class="btn" href="${esc("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q))}" target="_blank" rel="noopener">${iconSvg("pin")}<span>${esc(String(d.label || "Open in Maps").trim() || "Open in Maps")}</span></a>` : "";
        return section(`<div class="wrap"><div class="card mapcard">${d.image || edit ? `<div>${I("image", `Map of ${d.address || "our location"}`)}</div>` : ""}<div class="body">${T(isH1 ? "h1" : "h2", "title", { ph: "Title" })}${T("p", "address", { multi: true, ph: "Address" })}${T("p", "note", { multi: true, ph: "Opening hours" })}${link}</div></div></div>`);
      }
      case "footer": {
        const links = items("links").map((_, i) => A(`links.${i}`, "", { li: true })).join("");
        return `<footer class="site-foot${cls}"${attrs}><div class="wrap foot">${T("p", "text", { multi: true, ph: "A short line" })}${links ? `<nav aria-label="Footer"><ul>${links}</ul></nav>` : ""}${T("p", "copy", { cls: "copy", ph: "© Your name" })}</div></footer>`;
      }
      default: return "";
    }
  };

  // Leading headers go before <main>, trailing footers after it, everything else inside the one <main>.
  const bl = site.blocks;
  let s = 0, e = bl.length;
  while (s < e && bl[s].type === "header") s++;
  while (e > s && bl[e - 1].type === "footer") e--;
  const before = bl.slice(0, s).map(renderBlock).join("\n");
  const mainHtml = (h1Id ? "" : `<h1 class="sr-only">${esc(site.name)}</h1>`) + bl.slice(s, e).map(renderBlock).join("\n");
  const after = bl.slice(e).map(renderBlock).join("\n");

  const t = { ...DEFAULT_THEME, ...site.theme };
  const title = site.name.trim() || "My website";
  const hero = bl.find((b) => b.type === "hero");
  const desc = (site.description || String(hero?.data?.text || "") || title).replace(/\s+/g, " ").trim().slice(0, 300);
  const logo = bl.find((b) => b.type === "header" && b.data.logo)?.data.logo;
  const icon = logo || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(faviconSvg(site));
  return `<!doctype html>
<html lang="${esc(site.lang)}"${edit ? " data-editing data-site" : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${esc(hex6(t.primary) || DEFAULT_THEME.primary)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta name="generator" content="AsaanDesk Website builder">
<link rel="icon" href="${esc(asset(icon, logo ? "" : "favicon"))}">
<style id="site-css">${siteCss(t)}</style>${edit ? `\n<style id="edit-css">${EDIT_CSS}</style>` : ""}
</head>
<body id="top">
<a class="skip" href="#main">Skip to content</a>
${before}
<main id="main">
${mainHtml}
</main>
${after}
<script>${SCRIPT}</script>
</body>
</html>
`;
}

export { ICON_NAMES };
