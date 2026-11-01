/**
 * Environment Polish Pass 2: targeted value correction for one Lab piece. Lifts (or lowers) only the low-saturation
 * midtones of the body — the greys of metal and plastic — by a smooth gain, leaving saturated accents (yellow caps,
 * blue LEDs, hazard marks), deep shadows/edge lines and highlights alone, so the piece moves toward the kit's
 * reference value without a flat brightness change. Hue is preserved (gain applied to all channels equally).
 *
 *   NODE_PATH=node_modules node tools/visual-polish/environment-pass2/toneMidtones.cjs <in.png> <out.png> <gain> [lumLo=45] [lumHi=175] [maxSat=0.22]
 *   gain 1.12 = +12 % at the centre of the window, fading to 0 at lumLo / lumHi and above maxSat.
 */
const fs = require('fs'), {PNG} = require('pngjs');
const [inp, out, gainArg, loArg = '45', hiArg = '175', satArg = '0.22'] = process.argv.slice(2);
if (!inp || !out || !gainArg) throw Error('usage: toneMidtones.cjs <in.png> <out.png> <gain> [lumLo] [lumHi] [maxSat]');
const gain = Number(gainArg), lo = Number(loArg), hi = Number(hiArg), maxSat = Number(satArg);
const im = PNG.sync.read(fs.readFileSync(inp)), d = im.data;
const smooth = t => t * t * (3 - 2 * t);
let n = 0, before = 0, after = 0;
for (let i = 0; i < d.length; i += 4) {
  if (d[i + 3] < 8) continue;
  const r = d[i], g = d[i + 1], b = d[i + 2], lum = 0.299 * r + 0.587 * g + 0.114 * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
  before += lum; n++;
  // window weight: 1 in the middle of [lo, hi], 0 at the ends; 0 for saturated pixels
  const mid = (lo + hi) / 2, half = (hi - lo) / 2, wl = smooth(Math.max(0, 1 - Math.abs(lum - mid) / half)), ws = smooth(Math.max(0, 1 - sat / maxSat));
  const k = 1 + (gain - 1) * wl * ws;
  d[i] = Math.min(255, Math.round(r * k)); d[i + 1] = Math.min(255, Math.round(g * k)); d[i + 2] = Math.min(255, Math.round(b * k));
  after += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
}
fs.mkdirSync(require('path').dirname(out), {recursive: true});
fs.writeFileSync(out, PNG.sync.write(im));
console.log(`${inp} → ${out}: mean lum ${(before / n).toFixed(0)} → ${(after / n).toFixed(0)} (gain ${gain}, window ${lo}–${hi}, sat ≤ ${maxSat})`);
