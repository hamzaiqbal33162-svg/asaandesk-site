// Elements kit › Audio: our own music loops and sound effects, synthesised in the browser with WebAudio (oscillators,
// filters, noise). Nothing is downloaded: renderTrack() renders a track offline (OfflineAudioContext), previewTrack()
// plays it, trackDataUrl() gives a WAV data URL for insert.audio({track, src, name, duration, mime, loop}).
// Every track is an original arrangement (chord progressions, patterns and sounds are generic building blocks).

const SR = 22050;
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
// Chords as semitones above the key root.
const CH = { I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16], Imaj7: [0, 4, 7, 11], ii7: [2, 5, 9, 12], V7: [7, 11, 14, 17], vi7: [9, 12, 16, 19], IVmaj7: [5, 9, 12, 16],
  i: [0, 3, 7], iv: [5, 8, 12], v: [7, 10, 14], III: [3, 7, 10], VI: [8, 12, 15], VII: [10, 14, 17], i7: [0, 3, 7, 10], iv7: [5, 8, 12, 15] };
const prog = (s) => s.split(" ").map((k) => CH[k]);

// part flags: pad, bass (pattern), arp (step in beats), stab (beats), keys, kick (beats), snare (beats), hat (step), clap, chime, drone
const M = (id, name, sec, mood, bpm, root, p, parts, bars = 8) => ({ id, name, sec, mood, kind: "music", bpm, root, prog: prog(p), parts, bars, dur: +(bars * 4 * 60 / bpm + 1.2).toFixed(1), loop: true });
export const MUSIC = [
  M("morning-light", "Morning Light", "calm", "Calm · gentle pads", 84, 60, "I V vi IV", { pad: 0.07, arp: 0.5, arpVel: 0.05, chime: true }),
  M("deep-focus", "Deep Focus", "calm", "Ambient · focus", 60, 50, "i VI III VII", { pad: 0.08, drone: true, chime: true }, 6),
  M("study-lofi", "Study Lo-fi", "calm", "Lo-fi · relaxed", 76, 53, "ii7 V7 Imaj7 vi7", { keys: true, bass: "roots", kick: [0, 2.5], snare: [1, 3], hat: 0.5, swing: 0.12, lp: 2400 }),
  M("gentle-piano", "Gentle Piano", "calm", "Piano · soft", 72, 63, "I vi IV V", { keys: true, arp: 1, arpVel: 0.06, bass: "roots" }),
  M("bright-start", "Bright Start", "upbeat", "Pop · upbeat", 112, 55, "I V vi IV", { pad: 0.04, bass: "8ths", stab: [0, 1.5, 2.5], kick: [0, 2], snare: [1, 3], hat: 0.5 }),
  M("happy-steps", "Happy Steps", "upbeat", "Acoustic · happy", 120, 60, "I IV V I", { strum: true, bass: "roots", clap: [1, 3], hat: 0.5 }),
  M("celebration", "Celebration", "upbeat", "Dance · party", 128, 57, "vi IV I V", { pad: 0.04, bass: "offbeat", stab: [0, 0.75, 2, 2.75], kick: [0, 1, 2, 3], clap: [1, 3], hat: 0.25 }),
  M("corporate-rise", "Corporate Rise", "business", "Corporate · confident", 104, 62, "I vi IV V", { pad: 0.05, arp: 0.5, arpVel: 0.06, bass: "8ths", kick: [0, 1, 2, 3], hat: 0.5 }),
  M("night-drive", "Night Drive", "business", "Synthwave · driving", 96, 52, "i VI III VII", { pad: 0.05, bass: "8ths", saw: true, kick: [0, 2], snare: [1, 3], hat: 0.5 }),
  M("cinematic-swell", "Cinematic Swell", "cinematic", "Cinematic · epic", 70, 45, "i VI III VII", { pad: 0.1, swell: true, boom: true, chime: true }),
  M("soft-hope", "Soft Hope", "cinematic", "Cinematic · hopeful", 80, 58, "IV I V vi", { pad: 0.08, arp: 0.5, arpVel: 0.045, boom: true }),
];
const X = (id, name, dur, tags) => ({ id, name, sec: "sfx", mood: "Sound effect", kind: "sfx", dur, tags, loop: false });
export const SFX = [
  X("whoosh", "Whoosh", 1, "whoosh swoosh transition fast"), X("pop", "Pop", 0.4, "pop bubble click"), X("ding", "Ding", 1.6, "ding bell notification"),
  X("success", "Success chime", 1.4, "success win correct chime"), X("error", "Error buzz", 0.8, "error wrong buzz fail"), X("click", "Click", 0.25, "click tap button ui"),
  X("notify", "Notification", 0.9, "notification message alert"), X("drumroll", "Drum roll", 2.4, "drum roll reveal suspense cymbal"), X("swoosh-down", "Swoosh down", 1, "swoosh down drop fall"),
  X("typing", "Typing", 1.8, "typing keyboard keys writing"), X("heartbeat", "Heartbeat", 2.2, "heartbeat heart pulse tension"), X("claps", "Hand claps", 2, "clap applause hands cheer"),
];
export const AUDIO_SECTIONS = [
  { id: "calm", label: "Calm and focus" }, { id: "upbeat", label: "Upbeat" }, { id: "business", label: "Business" }, { id: "cinematic", label: "Cinematic" }, { id: "sfx", label: "Sound effects" },
].map((s) => ({ ...s, items: [...MUSIC, ...SFX].filter((t) => t.sec === s.id) }));
export const ALL_TRACKS = [...MUSIC, ...SFX];
export const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// ---------- synth building blocks
function noiseBuf(ctx, seed = 7) {
  const len = ctx.sampleRate, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  let x = seed; for (let i = 0; i < len; i++) { x = (x * 1664525 + 1013904223) >>> 0; d[i] = x / 2147483648 - 1; }
  return b;
}
function env(ctx, out, t, a, hold, r, vel) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + a); g.gain.setValueAtTime(vel, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
  g.connect(out); return g;
}
function tone(ctx, out, { type = "sine", f, t, len = 0, vel = 0.2, a = 0.01, r = 0.3, detune = 0, lp = 0, q = 0.8, glideTo }) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + a + len + r); o.detune.value = detune;
  const g = env(ctx, out, t, a, len, r, vel);
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; fl.Q.value = q; o.connect(fl).connect(g); } else o.connect(g);
  o.start(t); o.stop(t + a + len + r + 0.05);
}
function noise(ctx, out, nb, { t, len = 0, vel = 0.3, a = 0.002, r = 0.1, hp = 0, bp = 0, lp = 0, q = 0.8, sweep }) {
  const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true;
  let node = s;
  for (const [type, fr] of [["highpass", hp], ["bandpass", bp], ["lowpass", lp]]) if (fr) { const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(fr, t); fl.Q.value = q; if (sweep && type === "bandpass") fl.frequency.exponentialRampToValueAtTime(sweep, t + a + len + r); node.connect(fl); node = fl; }
  node.connect(env(ctx, out, t, a, len, r, vel));
  s.start(t, (t * 0.37) % 0.5); s.stop(t + a + len + r + 0.05);
}
const kick = (ctx, out, t, vel = 0.9) => tone(ctx, out, { f: 140, glideTo: 42, t, a: 0.002, r: 0.32, vel });
const snare = (ctx, out, nb, t, vel = 0.32) => { noise(ctx, out, nb, { t, hp: 1400, r: 0.16, vel }); tone(ctx, out, { type: "triangle", f: 190, t, a: 0.002, r: 0.08, vel: vel * 0.6 }); };
const hat = (ctx, out, nb, t, vel = 0.09) => noise(ctx, out, nb, { t, hp: 7000, r: 0.045, vel });
const clap = (ctx, out, nb, t, vel = 0.28) => { for (const d of [0, 0.012, 0.026]) noise(ctx, out, nb, { t: t + d, bp: 1500, q: 1.4, r: 0.09, vel }); };
const bell = (ctx, out, f, t, vel = 0.08, r = 1.4) => { tone(ctx, out, { f, t, a: 0.003, r, vel }); tone(ctx, out, { f: f * 2.76, t, a: 0.003, r: r * 0.4, vel: vel * 0.35 }); };

function scheduleMusic(ctx, out, tr) {
  const nb = noiseBuf(ctx), beat = 60 / tr.bpm, P = tr.parts, bus = ctx.createGain(); bus.gain.value = 1;
  if (P.lp) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = P.lp; bus.connect(fl).connect(out); } else bus.connect(out);
  const sw = (pos) => (P.swing && pos % 1 === 0.5 ? P.swing * beat : 0);
  for (let bar = 0; bar < tr.bars; bar++) {
    const ch = tr.prog[bar % tr.prog.length], t0 = 0.05 + bar * 4 * beat, rootN = tr.root + ch[0];
    const swell = P.swell ? 0.5 + (bar % 4) / 6 : 1;
    if (P.pad) for (const s of ch) for (const det of [-7, 7]) tone(ctx, bus, { type: "sawtooth", f: midiHz(tr.root + s), t: t0, len: 4 * beat - 0.3, a: 0.4, r: 0.6, vel: P.pad * swell * 0.5, detune: det, lp: 1400 });
    if (P.drone && bar % 2 === 0) tone(ctx, bus, { type: "sine", f: midiHz(tr.root - 12), t: t0, len: 8 * beat - 0.5, a: 1.5, r: 1.5, vel: 0.12 });
    if (P.keys) ch.forEach((s, i) => tone(ctx, bus, { type: "triangle", f: midiHz(tr.root + s + 12), t: t0 + i * 0.02, len: 0.1, a: 0.005, r: 1.6, vel: 0.07, lp: 2600 }));
    if (P.arp) for (let k = 0, pos = 0; pos < 4; pos += P.arp, k++) tone(ctx, bus, { type: P.saw ? "sawtooth" : "triangle", f: midiHz(tr.root + 12 + ch[k % ch.length] + (k % 8 >= 4 ? 12 : 0)), t: t0 + pos * beat + sw(pos), a: 0.005, r: 0.28, vel: P.arpVel || 0.05, lp: 3200 });
    if (P.stab) for (const pos of P.stab) for (const s of ch) tone(ctx, bus, { type: "square", f: midiHz(tr.root + 12 + s), t: t0 + pos * beat, a: 0.004, len: 0.05, r: 0.14, vel: 0.03, lp: 2200 });
    if (P.strum) for (const pos of [0, 1, 1.5, 2.5, 3]) ch.concat(ch[0] + 12).forEach((s, i) => tone(ctx, bus, { type: "triangle", f: midiHz(tr.root + s), t: t0 + pos * beat + i * 0.015, a: 0.003, r: 0.35, vel: 0.05, lp: 3000 }));
    if (P.bass) {
      const pat = P.bass === "8ths" ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] : P.bass === "offbeat" ? [0.5, 1.5, 2.5, 3.5] : [0, 2];
      for (const pos of pat) tone(ctx, bus, { type: P.saw ? "sawtooth" : "triangle", f: midiHz(rootN - 24), t: t0 + pos * beat + sw(pos), len: (P.bass === "roots" ? 1.6 : 0.3) * beat, a: 0.01, r: 0.12, vel: P.saw ? 0.1 : 0.22, lp: P.saw ? 700 : 900 });
    }
    if (P.kick) for (const pos of P.kick) kick(ctx, bus, t0 + pos * beat);
    if (P.snare) for (const pos of P.snare) snare(ctx, bus, nb, t0 + pos * beat);
    if (P.clap) for (const pos of P.clap) clap(ctx, bus, nb, t0 + pos * beat);
    if (P.hat) for (let pos = 0; pos < 4; pos += P.hat) hat(ctx, bus, nb, t0 + pos * beat + sw(pos), pos % 1 ? 0.07 : 0.1);
    if (P.boom && bar % 2 === 0) { kick(ctx, bus, t0, 0.8); noise(ctx, bus, nb, { t: t0, lp: 300, r: 1.2, vel: 0.25 }); }
    if (P.chime && bar % 2 === 1) bell(ctx, bus, midiHz(tr.root + 24 + ch[(bar >> 1) % ch.length]), t0 + 2 * beat, 0.05, 2);
  }
}
function scheduleSfx(ctx, out, tr) {
  const nb = noiseBuf(ctx, 11), t = 0.02;
  switch (tr.id) {
    case "whoosh": noise(ctx, out, nb, { t, a: 0.35, len: 0.1, r: 0.45, bp: 300, sweep: 3000, q: 1.2, vel: 0.6 }); break;
    case "swoosh-down": noise(ctx, out, nb, { t, a: 0.2, len: 0.1, r: 0.6, bp: 3200, sweep: 250, q: 1.2, vel: 0.6 }); break;
    case "pop": tone(ctx, out, { f: 900, glideTo: 180, t, a: 0.003, r: 0.12, vel: 0.5 }); break;
    case "ding": bell(ctx, out, 1320, t, 0.35, 1.4); break;
    case "success": [72, 76, 79, 84].forEach((m, i) => bell(ctx, out, midiHz(m), t + i * 0.11, 0.22, 0.9)); break;
    case "error": [0, 0.22].forEach((d) => tone(ctx, out, { type: "square", f: 140, t: t + d, len: 0.14, a: 0.005, r: 0.05, vel: 0.18, lp: 900 })); break;
    case "click": noise(ctx, out, nb, { t, hp: 2500, r: 0.03, vel: 0.6 }); tone(ctx, out, { f: 2000, t, a: 0.001, r: 0.02, vel: 0.2 }); break;
    case "notify": bell(ctx, out, midiHz(79), t, 0.25, 0.5); bell(ctx, out, midiHz(84), t + 0.16, 0.25, 0.6); break;
    case "drumroll": for (let k = 0; k < 34; k++) snare(ctx, out, nb, t + k * 0.05, 0.12 + (k / 34) * 0.2); noise(ctx, out, nb, { t: t + 1.75, hp: 4000, r: 0.6, vel: 0.35 }); kick(ctx, out, t + 1.75); break;
    case "typing": for (let k = 0; k < 14; k++) noise(ctx, out, nb, { t: t + k * 0.12 + ((k * 37) % 5) * 0.012, bp: 2400 + ((k * 53) % 7) * 200, q: 2, r: 0.025, vel: 0.5 }); break;
    case "heartbeat": for (const b of [0, 1]) { kick(ctx, out, t + b * 1.0, 0.8); kick(ctx, out, t + b * 1.0 + 0.24, 0.55); } break;
    case "claps": for (let k = 0; k < 22; k++) clap(ctx, out, nb, t + k * 0.085 + ((k * 29) % 7) * 0.006, 0.12 + ((k * 13) % 5) * 0.02); break;
  }
}
const RENDERED = new Map();
/** Renders a track offline to an AudioBuffer (cached). */
export function renderTrack(tr) {
  if (RENDERED.has(tr.id)) return RENDERED.get(tr.id);
  const p = (async () => {
    const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!OAC) throw new Error("This browser cannot make audio.");
    const ctx = new OAC(1, Math.ceil(SR * tr.dur), SR);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    const master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp).connect(ctx.destination);
    if (tr.kind === "music") scheduleMusic(ctx, master, tr); else scheduleSfx(ctx, master, tr);
    const buf = await ctx.startRendering();
    normalize(buf.getChannelData(0), 0.89, tr.loop ? 0.8 : 0.02);
    return buf;
  })();
  RENDERED.set(tr.id, p); p.catch(() => RENDERED.delete(tr.id));
  return p;
}
/** Peak-normalises and fades the tail out (fadeS seconds). */
export function normalize(d, peak = 0.89, fadeS = 0.02, sr = SR) {
  let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  const k = m > 0 ? peak / m : 1, f = Math.min(d.length, Math.round(fadeS * sr));
  for (let i = 0; i < d.length; i++) d[i] *= k * (i >= d.length - f ? (d.length - i) / f : 1);
}
/** 16-bit mono PCM WAV bytes of an AudioBuffer-like {sampleRate, getChannelData(0)}. */
export function wavBytes(buf) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, nS = d.length, out = new ArrayBuffer(44 + nS * 2), v = new DataView(out);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + nS * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, nS * 2, true);
  for (let i = 0; i < nS; i++) { const s = Math.max(-1, Math.min(1, d[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Uint8Array(out);
}
const URLS = new Map();
/** WAV data URL of a track (cached). */
export function trackDataUrl(tr) {
  if (URLS.has(tr.id)) return URLS.get(tr.id);
  const p = renderTrack(tr).then((buf) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(new Blob([wavBytes(buf)], { type: "audio/wav" })); }));
  URLS.set(tr.id, p); p.catch(() => URLS.delete(tr.id));
  return p;
}
// ---------- preview (one track at a time)
let AC = null, cur = null;
export function stopPreview() { const c = cur; cur = null; if (c) { try { c.src.stop(); } catch {} c.onEnd?.(); } }
/** Plays a track; onEnd() runs when it stops (ended or stopped). Resolves when playback starts. */
export async function previewTrack(tr, onEnd) {
  stopPreview();
  const buf = await renderTrack(tr);
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext; if (!Ctx) throw new Error("No audio output.");
  AC ||= new Ctx(); await AC.resume?.();
  const src = AC.createBufferSource(); src.buffer = buf; src.connect(AC.destination);
  const me = { src, onEnd, start: AC.currentTime, dur: buf.duration }; cur = me;
  src.onended = () => { if (cur === me) { cur = null; onEnd?.(); } };
  src.start();
  return me;
}
export const previewProgress = () => (cur && AC ? Math.min(1, (AC.currentTime - cur.start) / cur.dur) : 0);
export const previewing = () => cur;

/** Waveform-ish bars for a track card (deterministic, from the id). */
export function bars(id, k = 28) { let x = [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0; return Array.from({ length: k }, () => { x = (x * 1664525 + 1013904223) >>> 0; return 0.25 + (x / 4294967296) * 0.75; }); }
