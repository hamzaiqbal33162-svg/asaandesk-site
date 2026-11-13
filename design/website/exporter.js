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

/* ------------------------------------------------------------------ library photos in downloads */
// Template photos are same-origin files ("/pdf-editor/photos/x.jpg"). A downloaded site must keep them: before an
// export they are fetched and turned into data: URLs (one self-contained index.html; the ZIP stores them as real
// files under images/ with their own names). A photo that cannot be fetched falls back to its absolute web address.
const LIB = /^\/pdf-editor\/photos\/([\w.-]+\.(?:jpe?g|png|webp))$/i;
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const walk = (v, fn) => {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map((x) => walk(x, fn));
  if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = walk(x, fn); return o; }
  return v;
};
/** Every library photo URL a site uses (all pages, block data and section backgrounds). */
export function sitePhotos(site) {
  const out = new Set();
  walk(site, (s) => { if (LIB.test(s)) out.add(s); return s; });
  return [...out];
}
/** A copy of the site with library photo URLs replaced (map: url -> new value). */
export const replacePhotos = (site, map) => walk(site, (s) => (map.has(s) ? map.get(s) : s));
/** The site with absolute photo addresses (for a page opened outside this origin, like a blob: preview tab). */
export const absolutePhotos = (site, origin) => replacePhotos(site, new Map(sitePhotos(site).map((u) => [u, String(origin || "").replace(/\/$/, "") + u])));
function b64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
/**
 * Fetches the site's library photos and returns { site, names, missing }: `site` has them as data: URLs, `names`
 * maps each data: URL to a nice file name for the ZIP ("images/x.jpg"), `missing` lists photos that could not be read
 * (they keep an absolute address on `origin`). fetchFn / origin default to the browser's.
 */
export async function bundlePhotos(site, { fetch: fetchFn = (...args) => globalThis.fetch(...args), origin = globalThis.location?.origin || "" } = {}) {
  const urls = sitePhotos(site), map = new Map(), names = new Map(), missing = [];
  await Promise.all(urls.map(async (u) => {
    const file = LIB.exec(u)[1];
    try {
      const res = await fetchFn(origin && /^https?:/.test(origin) ? origin + u : u);
      if (!res || !res.ok) throw new Error(`HTTP ${res?.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const data = `data:${MIME[file.split(".").pop().toLowerCase()] || "image/jpeg"};base64,${b64(bytes)}`;
      map.set(u, data); names.set(data, `images/${file}`);
    } catch {
      missing.push(u);
      if (/^https?:/.test(origin)) map.set(u, origin + u);
    }
  }));
  return { site: replacePhotos(site, map), names, missing };
}
/** index.html with every photo inside (works offline). */
export async function exportHtmlFile(site, page = null, opts = {}) { return exportHtml((await bundlePhotos(site, opts)).site, page); }
/** The .zip bytes with every photo as a file in images/. */
export async function buildZipFile(site, { zipSync, publish = false, ...opts }) {
  const b = await bundlePhotos(site, opts);
  return buildZip(b.site, { zipSync, publish, names: b.names });
}

/** Files of the zip version: { "index.html": Uint8Array, "<page>.html": …, "images/…": Uint8Array }.
 *  publish: also robots.txt (search visibility) and, with a site address, sitemap.xml. `html` = the home page.
 *  names: optional Map(data: URL -> "images/<name>") for pictures that should keep their own file names. */
export function siteFiles(site, { publish = false, names = null } = {}) {
  const assets = new Map(names || []), enc = new TextEncoder(), files = {};
  const pages = pageList(site);
  let html = "";
  const all = pages.map((_, i) => {
    const h = renderSite(site, { mode: "export", imageMode: "files", assets, page: site.pages?.length ? i : null });
    files[pageFile(site, i)] = enc.encode(h);
    if (i === 0) html = h;
    return h;
  }).join("\n");
  // Every picture a page uses becomes a file (named pictures given in `names` only when a page really shows them).
  for (const [url, name] of assets) if (!names?.has(url) || all.includes(`"${name}"`) || all.includes(`&quot;${name}&quot;`)) files[name] = dataUrlToBytes(url).bytes;
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
export function buildZip(site, { zipSync, publish = false, names = null }) {
  const { files } = siteFiles(site, { publish, names });
  const input = {};
  const mtime = new Date();
  for (const [name, bytes] of Object.entries(files)) input[name] = [bytes, { level: /\.(html|svg|css|js|txt|xml)$/.test(name) ? 6 : 0, mtime }];
  return zipSync(input);
}

export const zipName = (site) => `${slugify(site?.name)}-website.zip`;
