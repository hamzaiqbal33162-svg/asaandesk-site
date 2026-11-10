// WAV (16-bit PCM) writer and header reader (pure, no DOM). Used for voice and audio recordings.

/** channels: Float32Array[] (same length, -1..1). Returns the bytes of a 16-bit PCM WAV file. */
export function encodeWav(channels, sampleRate) {
  const ch = channels.length, n = ch ? channels[0].length : 0;
  if (!ch || !(sampleRate > 0)) throw new Error("No audio to save.");
  const data = n * ch * 2, out = new Uint8Array(44 + data), v = new DataView(out.buffer);
  const tag = (o, s) => { for (let i = 0; i < 4; i++) out[o + i] = s.charCodeAt(i); };
  tag(0, "RIFF"); v.setUint32(4, 36 + data, true); tag(8, "WAVE");
  tag(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
  tag(36, "data"); v.setUint32(40, data, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, channels[c][i] || 0));
    v.setInt16(o, s < 0 ? Math.round(s * 32768) : Math.round(s * 32767), true); o += 2;
  }
  return out;
}
/** AudioBuffer (or { numberOfChannels, sampleRate, getChannelData }) -> WAV bytes. */
export function audioBufferToWav(buf, maxChannels = 2) {
  const ch = Math.min(maxChannels, buf.numberOfChannels);
  return encodeWav(Array.from({ length: ch }, (_, i) => buf.getChannelData(i)), buf.sampleRate);
}
/** { format, channels, sampleRate, bitsPerSample, dataBytes, duration } or null when it isn't a WAV. */
export function readWavHeader(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length < 44) return null;
  const s = (o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  if (s(0) !== "RIFF" || s(8) !== "WAVE") return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let p = 12, fmt = null, dataBytes = 0;
  while (p + 8 <= b.length) {
    const id = s(p), size = v.getUint32(p + 4, true);
    if (id === "fmt ") fmt = { format: v.getUint16(p + 8, true), channels: v.getUint16(p + 10, true), sampleRate: v.getUint32(p + 12, true), bitsPerSample: v.getUint16(p + 22, true) };
    if (id === "data") { dataBytes = Math.min(size, b.length - p - 8); break; }
    p += 8 + size + (size & 1);
  }
  if (!fmt) return null;
  const frame = fmt.channels * (fmt.bitsPerSample / 8);
  return { ...fmt, dataBytes, duration: frame && fmt.sampleRate ? dataBytes / frame / fmt.sampleRate : 0 };
}
