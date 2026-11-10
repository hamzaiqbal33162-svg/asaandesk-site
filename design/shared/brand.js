// Brand kit shared by every design app and the /product/brand page (saved in this browser only).
// { name, colors: ["#hex", ...], fonts: { heading: family, body: family }, logos: [{ name, src (data URL) }] }
// family: one of FONT_FAMILIES keys (the open fonts AsaanDesk ships in /pdf-editor/fonts/).
const KEY = "asaandesk-brand-kit";
export const FONT_FAMILIES = {
  sans: { label: "Sans (Arial style)", css: '"AD Sans", Arial, Helvetica, sans-serif', file: "LiberationSans" },
  serif: { label: "Serif (Times style)", css: '"AD Serif", "Times New Roman", serif', file: "LiberationSerif" },
  mono: { label: "Mono (Courier style)", css: '"AD Mono", "Courier New", monospace', file: "LiberationMono" },
  calibri: { label: "Calibri style", css: '"AD Calibri", Calibri, Carlito, sans-serif', file: "Carlito" },
  cambria: { label: "Cambria style", css: '"AD Cambria", Cambria, Caladea, serif', file: "Caladea" },
};
export const DEFAULT_BRAND = { name: "My brand", colors: ["#5b4cf0", "#ff7a59", "#14b8a6", "#1f2937", "#ffffff"], fonts: { heading: "sans", body: "sans" }, logos: [] };
export function loadBrand() { try { const b = JSON.parse(localStorage.getItem(KEY) || "null"); return b ? { ...DEFAULT_BRAND, ...b, fonts: { ...DEFAULT_BRAND.fonts, ...b.fonts } } : { ...DEFAULT_BRAND }; } catch { return { ...DEFAULT_BRAND }; } }
export function saveBrand(b) { try { localStorage.setItem(KEY, JSON.stringify(b)); window.dispatchEvent(new CustomEvent("asaandesk-brand", { detail: b })); return true; } catch { return false; } }
/** Loads the open font files for the browser (FontFace) so text looks the same on screen and in exports. */
const faces = new Map();
export function ensureFont(family, bold = false, italic = false) {
  const f = FONT_FAMILIES[family] || FONT_FAMILIES.sans;
  const style = bold && italic ? "BoldItalic" : bold ? "Bold" : italic ? "Italic" : "Regular";
  const file = `${f.file}-${style}.ttf`;
  if (!faces.has(file) && typeof FontFace === "function") {
    const face = new FontFace(f.css.split(",")[0].replace(/"/g, ""), `url(/pdf-editor/fonts/${file})`, { weight: bold ? "700" : "400", style: italic ? "italic" : "normal" });
    document.fonts.add(face);
    faces.set(file, face.load().catch(() => null));
  }
  return faces.get(file) || Promise.resolve(null);
}
