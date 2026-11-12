// Built-in media for the video editor frame: colour scenes (PNG drawn from gallery.js sceneSvg), music beds and sound
// effects made from simple synthesis (WAV), and overlay elements (shapes, stickers, titles as text clips). Our own content.
import { sceneSvg } from "./gallery.js";
import { encodeWav } from "./wav.js";
import { PRESETS } from "./model.js";

/** PNG blob of a colour scene in the project's size (long side 1280 px, enough for 1080p export of a flat picture). */
export async function sceneBlob(scene, presetId) {
  const pr = PRESETS[presetId] || PRESETS.youtube, k = 1280 / Math.max(pr.w, pr.h), w = Math.round(pr.w * k), h = Math.round(pr.h * k);
  const svg = sceneSvg(scene, w, h);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image(); img.decoding = "async"; img.src = url;
    await img.decode();
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("This browser could not draw the scene."))), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

// ---------- sounds (mono 22.05 kHz WAV) ----------
const SR = 22050;
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);
function tone(out, t0, dur, freq, gain, { type = "sine", attack = 0.01, release = 0.25 } = {}) {
  const a = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n && a + i < out.length; i++) {
    const t = i / SR, ph = 2 * Math.PI * freq * t;
    let v = type === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : type === "soft" ? Math.sin(ph) * 0.7 + Math.sin(2 * ph) * 0.2 + Math.sin(3 * ph) * 0.1 : Math.sin(ph);
    const env = Math.min(1, t / attack) * (t > dur - release ? Math.max(0, (dur - t) / release) : 1);
    out[a + i] += v * gain * env;
  }
}
function noise(out, t0, dur, gain, decay = 30) {
  const a = Math.floor(t0 * SR), n = Math.floor(dur * SR); let seed = 7;
  for (let i = 0; i < n && a + i < out.length; i++) { seed = (seed * 16807) % 2147483647; out[a + i] += ((seed / 2147483647) * 2 - 1) * gain * Math.exp((-decay * i) / SR); }
}
function kick(out, t0, gain = 0.8) {
  const a = Math.floor(t0 * SR), n = Math.floor(0.25 * SR); let ph = 0;
  for (let i = 0; i < n && a + i < out.length; i++) { const t = i / SR, f = 50 + 90 * Math.exp(-t * 30); ph += (2 * Math.PI * f) / SR; out[a + i] += Math.sin(ph) * gain * Math.exp(-t * 12); }
}
/** Chord loop: progression of [root midi, minor?] chords, one per bar. */
function chords(out, bars, barDur, prog, { gain = 0.11, type = "soft", arp = false } = {}) {
  for (let b = 0; b < bars; b++) {
    const [root, minor] = prog[b % prog.length], notes = [root, root + (minor ? 3 : 4), root + 7];
    if (arp) notes.forEach((n, i) => { for (let r = 0; r < 2; r++) tone(out, b * barDur + (i + r * 3) * (barDur / 6), barDur / 5, NOTE(n + 12), gain * 1.3, { type: "tri", release: 0.15 }); });
    else notes.forEach((n) => tone(out, b * barDur, barDur, NOTE(n), gain, { type, attack: 0.25, release: 0.5 }));
    tone(out, b * barDur, barDur, NOTE(root - 12), gain * 0.9, { type: "sine", attack: 0.05, release: 0.3 });
  }
}
const SOUND_MAKERS = {
  upbeat: () => { const bd = 1.6, o = new Float32Array(Math.ceil(bd * 8 * SR)); chords(o, 8, bd, [[60, 0], [67, 0], [69, 1], [65, 0]], { arp: true, gain: 0.08 }); for (let i = 0; i < 32; i++) { kick(o, i * (bd / 4), 0.5); if (i % 2) noise(o, i * (bd / 4), 0.08, 0.12, 60); } return o; },
  calm: () => { const bd = 3, o = new Float32Array(Math.ceil(bd * 5 * SR)); chords(o, 5, bd, [[57, 1], [53, 0], [60, 0], [55, 0]], { gain: 0.09 }); return o; },
  happy: () => { const bd = 1.2, o = new Float32Array(Math.ceil(bd * 10 * SR)); chords(o, 10, bd, [[62, 0], [67, 0], [64, 1], [69, 0]], { arp: true, gain: 0.09 }); for (let i = 0; i < 20; i++) noise(o, i * (bd / 2), 0.05, 0.1, 80); return o; },
  whoosh: () => { const o = new Float32Array(Math.ceil(1 * SR)); let seed = 3, lp = 0; for (let i = 0; i < o.length; i++) { seed = (seed * 16807) % 2147483647; const t = i / o.length, k = 0.02 + 0.3 * Math.sin(Math.PI * t); lp += k * (((seed / 2147483647) * 2 - 1) - lp); o[i] = lp * Math.sin(Math.PI * t) * 1.6; } return o; },
  ding: () => { const o = new Float32Array(Math.ceil(1.5 * SR)); tone(o, 0, 1.5, NOTE(88), 0.35, { release: 1.4 }); tone(o, 0, 1.2, NOTE(95), 0.12, { release: 1.1 }); return o; },
  drumroll: () => { const o = new Float32Array(Math.ceil(2.4 * SR)); for (let i = 0; i < 40; i++) noise(o, i * 0.05, 0.06, 0.12 + i * 0.006, 50); noise(o, 2.0, 0.4, 0.5, 8); kick(o, 2.0, 0.9); return o; },
  pop: () => { const o = new Float32Array(Math.ceil(0.3 * SR)); let ph = 0; for (let i = 0; i < o.length; i++) { const t = i / SR; ph += (2 * Math.PI * (300 + 900 * Math.exp(-t * 40))) / SR; o[i] = Math.sin(ph) * 0.5 * Math.exp(-t * 18); } return o; },
  heartbeat: () => { const o = new Float32Array(Math.ceil(4 * SR)); for (let i = 0; i < 5; i++) { kick(o, i * 0.8, 0.8); kick(o, i * 0.8 + 0.22, 0.55); } return o; },
};
export const SOUNDS = [
  { id: "upbeat", name: "Upbeat pop", kind: "Music", hint: "Bright chords and a beat, 13 s loop" },
  { id: "calm", name: "Calm pads", kind: "Music", hint: "Soft background, 15 s" },
  { id: "happy", name: "Happy pluck", kind: "Music", hint: "Light and cheerful, 12 s" },
  { id: "heartbeat", name: "Heartbeat", kind: "Music", hint: "Low pulse for suspense, 4 s" },
  { id: "whoosh", name: "Whoosh", kind: "Sound effect", hint: "For transitions, 1 s" },
  { id: "ding", name: "Ding", kind: "Sound effect", hint: "Bell for a new point, 1.5 s" },
  { id: "pop", name: "Pop", kind: "Sound effect", hint: "For text that pops in" },
  { id: "drumroll", name: "Drum roll", kind: "Sound effect", hint: "Before a big reveal, 2.4 s" },
];
/** WAV blob of a built-in sound (made on this device, nothing downloaded). */
export function soundBlob(id) {
  const make = SOUND_MAKERS[id]; if (!make) throw new Error("Unknown sound.");
  const o = make(); let peak = 0; for (const v of o) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.95) for (let i = 0; i < o.length; i++) o[i] *= 0.95 / peak;
  return new Blob([encodeWav([o], SR)], { type: "audio/wav" });
}

// ---------- elements: overlays made of text clips (they export with the video) ----------
export const SHAPES = [
  { id: "star", label: "Star", text: "★", color: "#ffd166" }, { id: "heart", label: "Heart", text: "♥", color: "#ff6b9a" },
  { id: "circle", label: "Circle", text: "●", color: "#5ec8ff" }, { id: "square", label: "Square", text: "■", color: "#8b5cf6" },
  { id: "triangle", label: "Triangle", text: "▲", color: "#06d6a0" }, { id: "arrow", label: "Arrow", text: "➜", color: "#ffffff" },
  { id: "check", label: "Tick", text: "✔", color: "#06d6a0" }, { id: "diamond", label: "Diamond", text: "◆", color: "#ff7a59" },
];
export const STICKERS = [
  { id: "new", label: "NEW", text: "NEW", color: "#ffffff", bg: "#ff3b3b" }, { id: "sale", label: "SALE", text: "SALE", color: "#1b2133", bg: "#ffd166" },
  { id: "off", label: "50% OFF", text: "50% OFF", color: "#ffffff", bg: "#5b4cf0" }, { id: "live", label: "LIVE", text: "● LIVE", color: "#ffffff", bg: "#e11d48" },
  { id: "subscribe", label: "Subscribe", text: "SUBSCRIBE ▶", color: "#ffffff", bg: "#ff0033" }, { id: "follow", label: "Follow", text: "+ FOLLOW", color: "#1b2133", bg: "#ffffff" },
  { id: "free", label: "Free delivery", text: "FREE DELIVERY", color: "#ffffff", bg: "#14b8a6" }, { id: "wow", label: "WOW", text: "WOW!", color: "#ff6b9a", bg: "" },
];
export const TITLES = [
  { id: "big-bold", label: "Big bold title", parts: [{ style: "title", text: "BIG NEWS" }] },
  { id: "title-sub", label: "Title + subtitle", parts: [{ style: "title", text: "Your title", y: 0.42 }, { style: "subtitle", text: "A short line under it", y: 0.58 }] },
  { id: "lower-third", label: "Name tag (lower third)", parts: [{ style: "lower", text: "Ayesha Khan · Designer" }] },
  { id: "caption-bar", label: "Caption bar", parts: [{ style: "caption", text: "Add your caption here" }] },
  { id: "chapter", label: "Chapter card", parts: [{ style: "subtitle", text: "CHAPTER 1", y: 0.4, size: 48, bold: true, color: "#ffd166" }, { style: "title", text: "The beginning", y: 0.55 }] },
  { id: "quote", label: "Quote", parts: [{ style: "subtitle", text: "“Do one thing well.”", italic: true, family: "serif", size: 80 }] },
];
