// Heavy pixel work off the main thread: the image enhancer and full-size adjustments for export.
// Message in: { id, op: "enhance" | "render", img: {data, width, height}, opts }.
// Out: { id, type: "progress", step, done } … then { id, type: "done", img } (pixels transferred) or { id, type: "error", message }.
import { enhance } from "./enhance.js";
import { renderPixels } from "./adjust.js";

self.onmessage = (e) => {
  const { id, op, img, opts = {} } = e.data || {};
  try {
    const src = { data: new Uint8ClampedArray(img.data.buffer || img.data), width: img.width, height: img.height };
    let out, scale = 1;
    if (op === "enhance") {
      out = enhance(src, opts, (p) => self.postMessage({ id, type: "progress", step: p.step, done: p.done }));
      scale = out.scale;
    } else if (op === "render") out = renderPixels(src, opts, { seed: opts.seed ?? 7 });
    else throw new Error("Unknown job " + op);
    self.postMessage({ id, type: "done", img: { data: out.data, width: out.width, height: out.height }, scale }, [out.data.buffer]);
  } catch (err) {
    self.postMessage({ id, type: "error", message: String((err && err.message) || err) });
  }
};
