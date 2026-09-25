import fs from 'node:fs';
// Original temporary two-note glass chime. No external audio dependency.
const rate = 44100;
const count = Math.floor(rate * 0.48);
const wav = Buffer.alloc(44 + count * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
for (let i = 0; i < count; i++) {
  const t = i / rate;
  let value = 0;
  for (const [start, freq] of [[0, 880], [0.12, 1320]]) {
    const age = t - start;
    if (age >= 0) value += Math.sin(age * freq * Math.PI * 2) * Math.min(1, age / 0.008) * Math.exp(-age * 12) * 0.32;
  }
  value *= Math.min(1, (0.48 - t) / 0.025);
  wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
}
fs.writeFileSync(new URL('../../assets/audio/diamond.wav', import.meta.url), wav);
