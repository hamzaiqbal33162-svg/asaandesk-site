// Library photos for the code generator (widget picture fields and gallery thumbnails). Pure module, no DOM.
// A picture field holds "photo:<id>": a photo of the shared library (public/pdf-editor/photos: places and things CC0 /
// public domain, people photos Pexels License).
import { PHOTOS, ALL_PHOTOS, photoUrl, pickPhoto, pickPerson, isPerson, objectPosition } from "../shared/photo-library.js";

export { photoUrl, isPerson, objectPosition };
const BY = new Map(ALL_PHOTOS.map((p) => [p.id, p]));

/** The library photo of a "photo:<id>" value (or null): places, things and people. */
export const photoOf = (v) => { const m = /^photo:([a-z0-9-]{1,80})$/.exec(String(v || "")); return (m && BY.get(m[1])) || null; };

/** Best library photo for some words, as a "photo:<id>" value: exact tag hits first (earlier words weigh more), then
 *  theme and file-name hits; the seed picks among equally good photos, so the same template keeps the same photo.
 *  Places and things only (people come from personFor). */
export function photoFor(words, seed = "") {
  const ws = String(words || "").toLowerCase().split(/[\s,]+/).filter(Boolean);
  let best = [], top = 0;
  for (const p of PHOTOS) {
    let s = 0;
    ws.forEach((w, i) => { const wt = ws.length - i; if (p.tags?.includes(w)) s += wt * 2; if (p.theme === w) s += wt; if (p.id.includes(w)) s += 1; });
    if (s > top) { top = s; best = [p]; } else if (s && s === top) best.push(p);
  }
  let h = 2166136261;
  for (const c of String(seed) + "|" + words) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const p = best.length ? best[(h >>> 0) % best.length] : pickPhoto(words, seed);
  return p ? "photo:" + p.id : "";
}

/** A people photo for a person spot ("business woman portrait", "wedding couple"…) as a "photo:<id>" value; opts as
 *  pickPerson ({ sex, exclude: ["photo:<id>" or ids], group }). */
export function personFor(kind, seed = "", { exclude = [], ...o } = {}) {
  const p = pickPerson(kind, seed, { ...o, exclude: exclude.map((v) => String(v).replace(/^photo:/, "")) });
  return p ? "photo:" + p.id : "";
}
