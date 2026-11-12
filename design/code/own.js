// Code generator, round 3 (Canva Code parity): "My code" (bring your own HTML, edit it, preview it), numbered versions,
// size warnings and "Publish as a website". Pure helpers, no DOM (tested in tests/own.test.mjs).

/** Your own code can be up to 2 MB (pictures inside it included). */
export const MAX_OWN = 2000000;
export const isFullDoc = (html) => /<html[\s>]/i.test(String(html || ""));

/** Text from a pasted or opened file: no BOM, \n line ends. Throws a friendly Error when it is too big. */
export function cleanOwn(text) {
  const s = String(text ?? "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (s.length > MAX_OWN) throw new Error(`That code is ${Math.round(s.length / 1024)} KB. Up to ${Math.round(MAX_OWN / 1024)} KB works here: use smaller pictures or link them instead.`);
  return s;
}

/** A complete page around a snippet (a full document stays as it is). */
export function wrapDoc(html, title = "My widget") {
  const h = String(html || "");
  if (isFullDoc(h)) return h;
  const t = String(title || "My widget").replace(/[<&>"]/g, "");
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${t}</title>\n</head>\n<body>\n${h}\n</body>\n</html>\n`;
}

/** Title of an HTML page (for names), or "". */
export function titleOf(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html || ""));
  return m ? m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 80) : "";
}

/** Lines, size in KB and what the code contains (styles, scripts, pictures inside). */
export function codeStats(text) {
  const s = String(text || "");
  return {
    lines: s ? s.split("\n").length : 0,
    kb: new TextEncoder().encode(s).length / 1024,
    styles: (s.match(/<style[\s>]/gi) || []).length,
    scripts: (s.match(/<script[\s>]/gi) || []).length,
    pictures: (s.match(/data:image\//gi) || []).length,
    external: [...new Set([...s.matchAll(/\b(?:src|href)\s*=\s*["']?(https?:\/\/[^/"'\s>]+)/gi)].map((m) => m[1].toLowerCase()))],
  };
}

/** Canva warns that oversized widgets may not publish; we say when the code gets big. "" when the size is fine. */
export function sizeWarning(bytes) {
  const kb = (+bytes || 0) / 1024;
  if (kb > 1536) return `This widget is ${(kb / 1024).toFixed(1)} MB. Very big widgets load slowly and some site builders refuse them: use smaller pictures, or split it into two widgets.`;
  if (kb > 600) return `This widget is ${Math.round(kb)} KB, mostly pictures. Smaller pictures make it load faster.`;
  return "";
}

/** "Version 3" for the newest of three saved versions (Canva numbers versions in the order they were made). */
export const versionLabel = (list, i) => `Version ${Math.max(1, (list?.length || 0) - i)}`;

/**
 * A one-page website for the Website builder with the widget as its only section ("Publish as a website"):
 * { type: "website", site } for putHandoff(). The embed block runs the code in its own safe frame.
 */
export function siteFromWidget({ title = "My widget", page = "", height = 480 } = {}) {
  const name = String(title || "My widget").replace(/\s+/g, " ").trim().slice(0, 80) || "My widget";
  const h = [320, 480, 640, 840].find((x) => x >= (+height || 0) + 24) || 840;
  return {
    type: "website",
    site: { name, description: "", blocks: [{ type: "embed", data: { title: "", code: String(page).slice(0, MAX_OWN), height: String(h) }, style: { bg: "" } }] },
  };
}
