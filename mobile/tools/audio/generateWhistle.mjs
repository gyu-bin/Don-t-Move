import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const duration = 0.42;
const samples = Math.floor(sampleRate * duration);
const bytes = 44 + samples * 2;
const wav = Buffer.alloc(bytes);

wav.write('RIFF', 0);
wav.writeUInt32LE(bytes - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(samples * 2, 40);

let phase = 0;
for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  const p = t / duration;
  const frequency = 2150 + 580 * Math.sin(Math.PI * Math.min(1, p * 1.45));
  phase += (Math.PI * 2 * frequency) / sampleRate;
  const attack = Math.min(1, t / 0.025);
  const release = Math.min(1, (duration - t) / 0.09);
  const breath = 0.92 + 0.08 * Math.sin(Math.PI * 2 * 17 * t);
  const tone = Math.sin(phase) * 0.82 + Math.sin(phase * 2.01) * 0.13;
  const value = Math.max(-1, Math.min(1, tone * attack * release * breath * 0.72));
  wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
}

const output = path.resolve('assets/audio/whistle.wav');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, wav);
console.log(output);

