// Timer music and sounds: short loops made from simple synthesis (our own sound, no recordings) and a WAV encoder.
// Styles follow Canva's timer music choices (Focus, Dramatic, Upbeat, Energetic, Lofi) plus Calm.
// Pure module (no DOM): musicLoop(style) -> Float32Array samples at RATE Hz; wav(samples) -> Uint8Array (16-bit mono WAV).
export const RATE = 22050;
export const STYLES = [
  { id: "focus", label: "Focus", bpm: 84, chords: [[57, 60, 64], [60, 64, 67], [55, 59, 62], [53, 57, 60]], arp: true, beat: false },
  { id: "dramatic", label: "Dramatic", bpm: 70, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], arp: false, beat: false, boom: true },
  { id: "upbeat", label: "Upbeat", bpm: 112, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], arp: true, beat: true },
  { id: "energetic", label: "Energetic", bpm: 132, chords: [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]], arp: true, beat: true, fast: true },
  { id: "lofi", label: "Lofi", bpm: 76, chords: [[57, 60, 64, 67], [50, 53, 57, 60], [55, 59, 62, 65], [52, 55, 59, 62]], arp: false, beat: true, soft: true },
  { id: "calm", label: "Calm", bpm: 66, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], arp: false, beat: false },
];
const hz = (n) => 440 * 2 ** ((n - 69) / 12);

function add(out, t0, dur, freq, gain, { attack = 0.02, release = 0.3, soft = false } = {}) {
  const a = Math.floor(t0 * RATE), n = Math.floor(dur * RATE);
  for (let i = 0; i < n && a + i < out.length; i++) {
    const t = i / RATE, ph = 2 * Math.PI * freq * t;
    const v = soft ? Math.sin(ph) * 0.75 + Math.sin(2 * ph) * 0.18 + Math.sin(3 * ph) * 0.07 : Math.sin(ph);
    const env = Math.min(1, t / attack) * (t > dur - release ? Math.max(0, (dur - t) / release) : 1);
    out[a + i] += v * gain * env;
  }
}
function tick(out, t0, gain, len = 0.08, decay = 0.012) {
  const a = Math.floor(t0 * RATE), n = Math.floor(len * RATE);
  let seed = 11;
  for (let i = 0; i < n && a + i < out.length; i++) { seed = (seed * 16807) % 2147483647; out[a + i] += ((seed / 2147483647) * 2 - 1) * gain * Math.exp(-i / (RATE * decay)); }
}
function kick(out, t0, gain) {
  const a = Math.floor(t0 * RATE), n = Math.floor(0.25 * RATE);
  for (let i = 0; i < n && a + i < out.length; i++) { const t = i / RATE, f = 110 * Math.exp(-t * 18) + 42; out[a + i] += Math.sin(2 * Math.PI * f * t) * gain * Math.exp(-t * 9); }
}

/** One loop (4 bars, one chord per bar) of a style; it repeats seamlessly. */
export function musicLoop(styleId = "focus") {
  const st = STYLES.find((s) => s.id === styleId) || STYLES[0];
  const beat = 60 / st.bpm, bar = beat * 4, len = bar * st.chords.length;
  const out = new Float32Array(Math.round(len * RATE));
  st.chords.forEach((ch, b) => {
    const t0 = b * bar;
    for (const n of ch) add(out, t0, bar, hz(n - 12), st.soft ? 0.045 : 0.06, { attack: 0.4, release: 0.6, soft: true }); // pad
    add(out, t0, bar, hz(ch[0] - 24), st.boom ? 0.1 : 0.07, { attack: 0.05, release: 0.5 }); // bass
    if (st.arp) { const steps = st.fast ? 16 : 8; for (let k = 0; k < steps; k++) add(out, t0 + (k * bar) / steps, bar / steps, hz(ch[k % ch.length] + (k >= steps / 2 ? 12 : 0)), 0.035, { attack: 0.01, release: bar / steps / 1.5, soft: true }); }
    if (st.beat) for (let k = 0; k < 4; k++) { if (st.fast || k % 2 === 0) kick(out, t0 + k * beat, st.soft ? 0.05 : 0.09); tick(out, t0 + k * beat + beat / 2, st.soft ? 0.025 : 0.05, st.soft ? 0.05 : 0.08); }
    if (st.boom) { kick(out, t0, 0.14); add(out, t0 + bar / 2, bar / 2, hz(ch[2]), 0.03, { attack: 0.2, release: 0.4, soft: true }); }
  });
  // Soft limiter so it never clips.
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0.9 ? 0.9 / peak : 1;
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return out;
}
/** A short three-note chime for "time is up". */
export function chime() {
  const out = new Float32Array(Math.round(1.4 * RATE));
  [76, 79, 84].forEach((n, i) => add(out, i * 0.18, 1.0, hz(n), 0.18, { attack: 0.005, release: 0.8, soft: true }));
  return out;
}
/** Timer sounds: "start" (a rising blip), "ten" (two short beeps at 10 seconds left), "end" (the chime). */
export function timerSound(kind) {
  if (kind === "end") return chime();
  const out = new Float32Array(Math.round(0.6 * RATE));
  if (kind === "ten") { add(out, 0, 0.12, hz(81), 0.16, { attack: 0.005, release: 0.06 }); add(out, 0.2, 0.12, hz(81), 0.16, { attack: 0.005, release: 0.06 }); }
  else { add(out, 0, 0.12, hz(72), 0.14, { attack: 0.005, release: 0.06, soft: true }); add(out, 0.11, 0.2, hz(79), 0.14, { attack: 0.005, release: 0.12, soft: true }); }
  return out;
}
/** 16-bit PCM mono WAV bytes. */
export function wav(samples, rate = RATE) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Uint8Array(buf);
}
