// ffmpeg command lines for the video apps (pure, no DOM, unit tested in tests/video.test.mjs).
// Same codec choices as the site's converter tools (lib/media.ts): H.264 "veryfast" + AAC, yuv420p, faststart.

export const QUALITY = {
  high: { crf: 20, label: "High quality (bigger file)" },
  balanced: { crf: 23, label: "Balanced" },
  small: { crf: 28, label: "Small file" },
};
export const HEIGHTS = [0, 1080, 720, 480];

const even = (n) => Math.max(2, Math.round(n / 2) * 2);
/** Seconds as a plain ffmpeg time ("12.345"). Throws on bad input so a broken command is never run. */
export function secs(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error("Time must be a number of seconds, 0 or more.");
  return String(Math.round(n * 1000) / 1000);
}
/** Output size when the shorter side should become `short` px (never upscales). Null = keep the size. */
export function targetSize(srcW, srcH, short) {
  if (!short || !(srcW > 0) || !(srcH > 0)) return null;
  const s = Math.min(srcW, srcH);
  if (s <= short) return null;
  const k = short / s;
  return { w: even(srcW * k), h: even(srcH * k) };
}
/** Video filter: optional downscale to `height` (shorter side), always even sizes (H.264 4:2:0 needs them). */
export function scaleFilter({ height = 0, srcW = 0, srcH = 0 } = {}) {
  const t = targetSize(srcW, srcH, height);
  if (t) return `scale=${t.w}:${t.h}`;
  if (height && !(srcW > 0 && srcH > 0)) return `scale=-2:'trunc(min(ih,${height})/2)*2'`;
  return "scale=trunc(iw/2)*2:trunc(ih/2)*2";
}
/** Encoder options for MP4 (H.264 + AAC). */
export function h264Args({ crf = 23, preset = "veryfast", audio = true, audioKbps = 128 } = {}) {
  return ["-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-pix_fmt", "yuv420p",
    ...(audio ? ["-c:a", "aac", "-b:a", `${audioKbps}k`] : ["-an"]), "-movflags", "+faststart"];
}
const crfOf = (quality) => (QUALITY[quality] || QUALITY.balanced).crf;

/** Convert any video ffmpeg can read to MP4 (H.264/AAC). */
export function convertArgs({ input, output = "output.mp4", quality = "balanced", height = 0, srcW = 0, srcH = 0 }) {
  if (!input) throw new Error("No input file.");
  return ["-i", input, "-vf", scaleFilter({ height, srcW, srcH }), ...h264Args({ crf: crfOf(quality) }), output];
}

/** Editor export: the WebM the browser recorded -> MP4 at a constant frame rate. */
export function webmToMp4Args({ input = "input.webm", output = "output.mp4", fps = 30, quality = "high" } = {}) {
  return ["-i", input, "-r", String(fps), "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", ...h264Args({ crf: crfOf(quality), audioKbps: 160 }), output];
}

/** Keep only start..end (exact cut: re-encodes). Fast input seek is frame-accurate when transcoding. */
export function trimArgs({ input, output = "output.mp4", start = 0, end, quality = "balanced", srcW = 0, srcH = 0 }) {
  if (!(end > start)) throw new Error("The end must be after the start.");
  return ["-ss", secs(start), "-i", input, "-t", secs(end - start), "-vf", scaleFilter({ srcW, srcH }),
    ...h264Args({ crf: crfOf(quality) }), output];
}

/** Remove start..end and join what is left (0..start + end..duration). */
export function cutMiddleArgs({ input, output = "output.mp4", start, end, duration, hasAudio = true, quality = "balanced" }) {
  if (!(end > start)) throw new Error("The end must be after the start.");
  if (!(duration > 0)) throw new Error("Unknown video length.");
  if (start <= 0.01 && end >= duration - 0.01) throw new Error("That would cut out the whole video.");
  if (start <= 0.01) return trimArgs({ input, output, start: end, end: duration, quality });
  if (end >= duration - 0.01) return trimArgs({ input, output, start: 0, end: start, quality });
  const S = secs(start), E = secs(end), ev = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
  const parts = [`[0:v]trim=end=${S},setpts=PTS-STARTPTS,${ev}[v0]`, `[0:v]trim=start=${E},setpts=PTS-STARTPTS,${ev}[v1]`];
  if (hasAudio) parts.push(`[0:a]atrim=end=${S},asetpts=PTS-STARTPTS[a0]`, `[0:a]atrim=start=${E},asetpts=PTS-STARTPTS[a1]`,
    "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]");
  else parts.push("[v0][v1]concat=n=2:v=1:a=0[v]");
  return ["-i", input, "-filter_complex", parts.join(";"), "-map", "[v]", ...(hasAudio ? ["-map", "[a]"] : []),
    ...h264Args({ crf: crfOf(quality), audio: hasAudio }), output];
}

/** "time=00:01:02.50" in an ffmpeg log line -> 62.5 (or null). */
export function parseTime(line) {
  const m = /time=\s*(-?\d+):(\d+):(\d+(?:\.\d+)?)/.exec(String(line || ""));
  if (!m) return null;
  const t = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  return t >= 0 ? t : null;
}
/** File extension (lower case) -> a safe name for ffmpeg's virtual disk. */
export function inputName(fileName, fallback = "mp4") {
  const ext = (String(fileName || "").split(".").pop() || "").toLowerCase();
  return "input." + (/^[a-z0-9]{2,5}$/.test(ext) && ext !== String(fileName).toLowerCase() ? ext : fallback);
}
