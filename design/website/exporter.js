// Export: one self-contained index.html (images inline as data: URLs), or a .zip with index.html + images/.
// Pure: the zip function gets fflate's zipSync passed in, so Node tests can run it directly.
import { renderSite, slugify, pageList, pageFile, normSettings, siteBase } from "./blocks.js";

/** Single-file page: inline CSS, images as data: URLs, tiny inline script. Multi-page sites: the page open in the
 *  editor (or `page`); the ZIP has every page. */
export function exportHtml(site, page = null) { return renderSite(site, { mode: "export", imageMode: "inline", page }); }

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

/** Files of the zip version: { "index.html": Uint8Array, "<page>.html": …, "images/…": Uint8Array }.
 *  publish: also robots.txt (search visibility) and, with a site address, sitemap.xml. `html` = the home page. */
export function siteFiles(site, { publish = false } = {}) {
  const assets = new Map(), enc = new TextEncoder(), files = {};
  const pages = pageList(site);
  let html = "";
  pages.forEach((_, i) => {
    const h = renderSite(site, { mode: "export", imageMode: "files", assets, page: site.pages?.length ? i : null });
    files[pageFile(site, i)] = enc.encode(h);
    if (i === 0) html = h;
  });
  for (const [url, name] of assets) files[name] = dataUrlToBytes(url).bytes;
  if (publish) {
    const S = normSettings(site.settings);
    const base = siteBase(S);
    files["robots.txt"] = enc.encode(S.indexable ? `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}sitemap.xml\n` : ""}` : "User-agent: *\nDisallow: /\n");
    if (base) {
      const urls = pages.map((_, i) => `  <url><loc>${base}${i ? pageFile(site, i) : ""}</loc></url>`).join("\n");
      files["sitemap.xml"] = enc.encode(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    }
  }
  return { html, files };
}

/** The .zip bytes. Images that are already compressed are stored, text files are deflated. */
export function buildZip(site, { zipSync, publish = false }) {
  const { files } = siteFiles(site, { publish });
  const input = {};
  const mtime = new Date();
  for (const [name, bytes] of Object.entries(files)) input[name] = [bytes, { level: /\.(html|svg|css|js|txt|xml)$/.test(name) ? 6 : 0, mtime }];
  return zipSync(input);
}

export const zipName = (site) => `${slugify(site?.name)}-website.zip`;
