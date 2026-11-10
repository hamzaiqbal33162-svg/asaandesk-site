// Export: one self-contained index.html (images inline as data: URLs), or a .zip with index.html + images/.
// Pure: the zip function gets fflate's zipSync passed in, so Node tests can run it directly.
import { renderSite, slugify } from "./blocks.js";

/** Single-file site: inline CSS, images as data: URLs, tiny inline script for the menu and FAQ only. */
export function exportHtml(site) { return renderSite(site, { mode: "export", imageMode: "inline" }); }

/** data: URL -> { mime, bytes } (base64 or percent-encoded). */
export function dataUrlToBytes(url) {
  const m = /^data:([^;,]*)((?:;[^;,]*)*?),(.*)$/s.exec(String(url));
  if (!m) throw new Error("Not a data: URL");
  const mime = m[1] || "text/plain", base64 = /;base64/i.test(m[2]), body = m[3];
  if (base64) {
    const bin = atob(body.replace(/\s+/g, ""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return { mime, bytes: out };
  }
  return { mime, bytes: new TextEncoder().encode(decodeURIComponent(body)) };
}

/** Files of the zip version: { "index.html": Uint8Array, "images/…": Uint8Array }. */
export function siteFiles(site) {
  const assets = new Map();
  const html = renderSite(site, { mode: "export", imageMode: "files", assets });
  const files = { "index.html": new TextEncoder().encode(html) };
  for (const [url, name] of assets) files[name] = dataUrlToBytes(url).bytes;
  return { html, files };
}

/** The .zip bytes. Images that are already compressed are stored, text files are deflated. */
export function buildZip(site, { zipSync }) {
  const { files } = siteFiles(site);
  const input = {};
  const mtime = new Date();
  for (const [name, bytes] of Object.entries(files)) input[name] = [bytes, { level: /\.(html|svg|css|js|txt)$/.test(name) ? 6 : 0, mtime }];
  return zipSync(input);
}

export const zipName = (site) => `${slugify(site?.name)}-website.zip`;
