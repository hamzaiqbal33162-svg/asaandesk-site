// ffmpeg.wasm for MP4 export and conversion, loaded exactly like the site's converter tools (lib/media.ts):
// @ffmpeg/ffmpeg 0.12.10 + @ffmpeg/util 0.12.1 (vendored in lib/, MIT) with the ffmpeg core 0.12.6 from unpkg.
// The ~31 MB core is downloaded only when someone presses an MP4 button; the browser keeps it cached after that.
import { parseTime } from "./ffcmd.js";

export const CORE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
const WASM_SIZE_GUESS = 32 * 1048576;

export class EngineDownloadError extends Error {
  constructor(cause) {
    super("Couldn't download the MP4 engine (about 31 MB from unpkg.com). Check your internet connection and try again. WebM export works without it.");
    this.code = "ENGINE_DOWNLOAD"; this.cause = cause;
  }
}
const abortError = () => new DOMException("Cancelled", "AbortError");

let loading = null, status = null, busy = Promise.resolve();
export const ffmpegState = { loaded: false, downloading: false, received: 0 };

async function fetchBlobURL(url, type, onBytes) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body?.getReader?.();
  if (!reader) return URL.createObjectURL(new Blob([await res.arrayBuffer()], { type }));
  const chunks = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    // Content-Length may be the compressed size, so never show more than 99 % before the end.
    onBytes?.(got, Math.min(0.99, got / Math.max(total, got, WASM_SIZE_GUESS)));
  }
  return URL.createObjectURL(new Blob(chunks, { type }));
}

/** Loads (once) and returns the FFmpeg instance. onStatus(text, fraction?) shows download progress. */
export function loadFFmpeg(onStatus) {
  if (onStatus) status = onStatus;
  if (!loading) loading = (async () => {
    const [{ FFmpeg }] = await Promise.all([import("./lib/ffmpeg/index.js"), import("./lib/ffmpeg-util/index.js")]);
    let coreURL, wasmURL;
    ffmpegState.downloading = true;
    try {
      status?.("Downloading the MP4 engine (about 31 MB, only the first time)…", 0);
      coreURL = await fetchBlobURL(`${CORE}/ffmpeg-core.js`, "text/javascript");
      wasmURL = await fetchBlobURL(`${CORE}/ffmpeg-core.wasm`, "application/wasm", (got, f) => {
        ffmpegState.received = got;
        status?.(`Downloading the MP4 engine… ${(got / 1048576).toFixed(1)} MB`, f);
      });
    } catch (e) { throw new EngineDownloadError(e); } finally { ffmpegState.downloading = false; }
    status?.("Starting the MP4 engine…");
    const f = new FFmpeg();
    await f.load({ coreURL, wasmURL });
    ffmpegState.loaded = true;
    return f;
  })().catch((e) => { loading = null; ffmpegState.loaded = false; throw e; });
  return loading;
}

const raceAbort = (p, signal) => !signal ? p : new Promise((res, rej) => {
  if (signal.aborted) return rej(abortError());
  const on = () => rej(abortError());
  signal.addEventListener("abort", on, { once: true });
  p.then((v) => { signal.removeEventListener("abort", on); res(v); }, (e) => { signal.removeEventListener("abort", on); rej(e); });
});

/**
 * Runs one ffmpeg command. files: [{ name, data: Blob | Uint8Array }], output: file name to read back.
 * duration (seconds of output) makes progress exact; onProgress(0..1). Cancel with an AbortSignal.
 * Resolves to a Uint8Array. Commands run one after another (one engine).
 */
export function runFFmpeg({ files = [], args, output, duration = 0, onProgress, onStatus, signal }) {
  const run = async () => {
    if (signal?.aborted) throw abortError();
    const f = await raceAbort(loadFFmpeg(onStatus), signal);
    const log = [];
    const onLog = ({ message }) => {
      log.push(message); if (log.length > 40) log.shift();
      const t = parseTime(message);
      if (t != null && duration > 0) onProgress?.(Math.min(0.99, t / duration));
    };
    const onProg = ({ progress }) => { if (!(duration > 0) && progress >= 0 && progress <= 1) onProgress?.(Math.min(0.99, progress)); };
    const onAbort = () => { f.terminate(); loading = null; ffmpegState.loaded = false; };
    f.on("log", onLog); f.on("progress", onProg);
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      onStatus?.("Preparing the file…");
      for (const { name, data } of files) await f.writeFile(name, data instanceof Uint8Array ? data.slice() : new Uint8Array(await data.arrayBuffer()));
      onStatus?.("Encoding MP4…");
      const code = await f.exec(args);
      if (signal?.aborted) throw abortError();
      let out = null;
      try { out = await f.readFile(output); } catch { out = null; }
      if (code !== 0 || !(out instanceof Uint8Array) || !out.length) {
        const why = log.filter((l) => /error|invalid|could not|not supported|no such|matches no streams/i.test(l)).slice(-2).join(" ").slice(0, 200);
        throw new Error("The engine couldn't make this file. The codec may not be supported or the file may be damaged." + (why ? ` (${why})` : ""));
      }
      onProgress?.(1);
      return out;
    } catch (e) {
      if (signal?.aborted) throw abortError();
      throw e;
    } finally {
      signal?.removeEventListener("abort", onAbort);
      if (!signal?.aborted) {
        f.off("log", onLog); f.off("progress", onProg);
        for (const n of [...files.map((x) => x.name), output]) await f.deleteFile(n).catch(() => {});
      }
    }
  };
  const p = busy.then(run, run);
  busy = p.catch(() => {});
  return p;
}
