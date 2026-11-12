// Beat Sync for the video editor (pure, no DOM, unit tested): finds the beats of a song on this device (onset energy +
// tempo by autocorrelation, no AI, nothing uploaded), turns them into timeline snap points, and moves cuts onto beats.
import { layoutVideo, setTrim, clipRange, MIN_LEN } from "./model.js";

const r3 = (v) => Math.round(v * 1000) / 1000;

/** Onset strength per hop (rise of the log energy), from channels of samples. Returns { env: Float32Array, fps }. */
export function onsetEnvelope(channels, sampleRate, { hop = 512, win = 1024 } = {}) {
  const ch = (channels || []).filter(Boolean), n = ch.length ? ch[0].length : 0;
  const frames = n > win ? Math.floor((n - win) / hop) + 1 : 0, energy = new Float32Array(frames), env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    const a = f * hop;
    for (const c of ch) for (let i = a; i < a + win; i += 2) s += c[i] * c[i];
    energy[f] = Math.log(1e-9 + s / (win / 2));
  }
  for (let f = 1; f < frames; f++) env[f] = Math.max(0, energy[f] - energy[f - 1]);
  // remove the slow average so only clear rises count
  const k = 8;
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let m = 0, c = 0;
    for (let j = Math.max(0, f - k); j <= Math.min(frames - 1, f + k); j++) { m += env[j]; c++; }
    out[f] = Math.max(0, env[f] - m / c);
  }
  return { env: out, fps: sampleRate / hop, lag: (win - hop / 2) / sampleRate };
}

/** Tempo in beats per minute (min..max) from an onset envelope, by autocorrelation (with a gentle preference near 120). */
export function estimateTempo(env, fps, { min = 70, max = 180 } = {}) {
  const lo = Math.max(1, Math.floor((fps * 60) / max)), hi = Math.ceil((fps * 60) / min);
  let best = 0, bestLag = 0;
  for (let lag = lo; lag <= hi && lag < env.length; lag++) {
    let s = 0;
    for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag];
    s /= env.length - lag;
    const bpm = (fps * 60) / lag, w = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    if (s * w > best) { best = s * w; bestLag = lag; }
  }
  if (!bestLag) return null;
  // refine the period between whole hops (parabola through the neighbours)
  const ac = (lag) => { let s = 0; for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag]; return s / Math.max(1, env.length - lag); };
  const a = ac(bestLag - 1), b = ac(bestLag), c = ac(bestLag + 1), d = a - 2 * b + c;
  const lag = d < 0 ? bestLag + (0.5 * (a - c)) / d : bestLag;
  return (fps * 60) / lag;
}

/**
 * Beats of a song: { bpm, beats: [seconds] } (beat grid on the strongest phase), or null when no steady beat is found.
 * channels/sampleRate as in an AudioBuffer (getChannelData).
 */
export function detectBeats(channels, sampleRate, opts = {}) {
  const { env, fps, lag } = onsetEnvelope(channels, sampleRate, opts);
  if (env.length < fps * 2) return null;
  const bpm = estimateTempo(env, fps, opts);
  if (!bpm) return null;
  const period = (fps * 60) / bpm;
  let bestPhase = 0, best = -1;
  for (let ph = 0; ph < period; ph += 0.5) {
    let s = 0;
    for (let x = ph; x < env.length; x += period) { const i = Math.round(x); s += env[i] || 0; }
    if (s > best) { best = s; bestPhase = ph; }
  }
  if (!(best > 0)) return null;
  const beats = [];
  for (let x = bestPhase; x < env.length; x += period) {
    // let each beat move to the strongest onset within a few hops (live music drifts a little)
    let i = Math.round(x), top = i;
    for (let j = Math.max(0, i - 2); j <= Math.min(env.length - 1, i + 2); j++) if (env[j] > env[top]) top = j;
    beats.push(r3(top / fps + lag));
  }
  return { bpm: Math.round(bpm * 10) / 10, beats };
}

/** Beats of an audio clip on the timeline: file times (c.in..c.out) mapped through its start and speed. */
export function clipBeats(c, fileBeats) {
  const sp = c.speed || 1, out = [];
  for (const b of fileBeats || []) if (b >= c.in - 1e-6 && b <= c.out + 1e-6) out.push(r3(c.start + (b - c.in) / sp));
  return out;
}
/** All beat times on the timeline from the audio clips that have beats shown: beatsOf(mediaId) -> file beats or null. */
export function timelineBeats(p, beatsOf) {
  const all = [];
  for (const c of p.audio) if (c.beats) all.push(...clipBeats(c, beatsOf(c.mediaId)));
  return [...new Set(all)].sort((a, b) => a - b);
}

/**
 * Sync now: each cut on the video track moves back to the nearest beat at or before it (Canva rounds down to the nearest
 * beat), clip by clip from the start; text and overlay starts/ends move to the nearest beat. Returns how many clips changed.
 */
export function syncToBeats(p, beats, { tol = 0.02 } = {}) {
  const bs = [...(beats || [])].sort((a, b) => a - b);
  if (!bs.length) return 0;
  let n = 0;
  for (let i = 0; i < p.video.length; i++) {
    const e = layoutVideo(p.video)[i], c = e.clip;
    const minEnd = e.start + Math.max(MIN_LEN, e.tIn.dur || 0) + 0.05;
    let target = null;
    for (const b of bs) { if (b > e.end + tol) break; if (b >= minEnd) target = b; }
    if (target == null || Math.abs(target - e.end) < 1e-3) continue;
    const len = target - e.start;
    if (c.kind === "image" || c.kind === "endscreen") setTrim(p, c.id, { dur: len });
    else setTrim(p, c.id, { outT: c.in + len * (c.speed || 1) });
    n++;
  }
  const near = (t) => bs.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a), bs[0]);
  for (const c of [...p.text, ...(p.overlay || [])]) {
    const r = clipRange(p, c.id), a = near(r.start), z = near(r.end);
    const start = a, end = z - a >= MIN_LEN ? z : r.end;
    if (Math.abs(start - c.start) < 1e-3 && Math.abs(end - r.end) < 1e-3) continue;
    c.start = r3(start); c.dur = r3(Math.max(MIN_LEN, end - start)); n++;
  }
  return n;
}
