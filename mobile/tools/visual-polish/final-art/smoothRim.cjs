/**
 * Visual Art Final Pass: anti-aliased outer rim for an outline-thinned sprite. The Pass 2 thinOutline candidate
 * decided "keep dark" per pixel from an integer distance, so curved edges (the statue's head) stepped. Here the
 * distance to the transparent outside is computed at 4× (chamfer distance on the bilinearly upsampled alpha),
 * averaged back to 1×, and the outer dark rim is blended smoothly between the original paint (dark rim, at the
 * edge) and the thinned candidate (released paint, further in). Inner lines and everything away from the rim
 * come from the thinned candidate unchanged; alpha (the silhouette) is the original's.
 *
 *   NODE_PATH=node_modules node tools/visual-polish/final-art/smoothRim.cjs <original.png> <thinned.png> <out.png> [rim=3]
 */
const fs = require('fs'), path = require('path'), {PNG} = require('pngjs');
const [origF, thinF, out, rimArg = '3'] = process.argv.slice(2);
if (!origF || !thinF || !out) throw Error('usage: smoothRim.cjs <original.png> <thinned.png> <out.png> [rim]');
const RIM = Number(rimArg), K = 4;
const o = PNG.sync.read(fs.readFileSync(origF)), t = PNG.sync.read(fs.readFileSync(thinF)), W = o.width, H = o.height;
if (t.width !== W || t.height !== H) throw Error('size mismatch');

// 1. Alpha at 4× (bilinear), inside = alpha ≥ 0.5.
const A = (x, y) => { x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(H - 1, y)); return o.data[(y * W + x) * 4 + 3] / 255; };
const W4 = W * K, H4 = H * K, inside = new Uint8Array(W4 * H4);
for (let y = 0; y < H4; y++) for (let x = 0; x < W4; x++) {
  const fx = (x + 0.5) / K - 0.5, fy = (y + 0.5) / K - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const a = (A(x0, y0) * (1 - tx) + A(x0 + 1, y0) * tx) * (1 - ty) + (A(x0, y0 + 1) * (1 - tx) + A(x0 + 1, y0 + 1) * tx) * ty;
  inside[y * W4 + x] = a >= 0.5 ? 1 : 0;
}
// 2. Chamfer (3-4) distance to the nearest outside cell, two passes, in 4× cells.
const INF = 1e9, d = new Float32Array(W4 * H4);
for (let i = 0; i < d.length; i++) d[i] = inside[i] ? INF : 0;
for (let y = 0; y < H4; y++) for (let x = 0; x < W4; x++) {
  const i = y * W4 + x; if (!d[i]) continue; let v = d[i];
  if (x > 0) v = Math.min(v, d[i - 1] + 3); if (y > 0) v = Math.min(v, d[i - W4] + 3);
  if (x > 0 && y > 0) v = Math.min(v, d[i - W4 - 1] + 4); if (x < W4 - 1 && y > 0) v = Math.min(v, d[i - W4 + 1] + 4);
  d[i] = v;
}
for (let y = H4 - 1; y >= 0; y--) for (let x = W4 - 1; x >= 0; x--) {
  const i = y * W4 + x; if (!d[i]) continue; let v = d[i];
  if (x < W4 - 1) v = Math.min(v, d[i + 1] + 3); if (y < H4 - 1) v = Math.min(v, d[i + W4] + 3);
  if (x < W4 - 1 && y < H4 - 1) v = Math.min(v, d[i + W4 + 1] + 4); if (x > 0 && y < H4 - 1) v = Math.min(v, d[i + W4 - 1] + 4);
  d[i] = v;
}
// 3. Back to 1×: mean distance of the 4×4 block, in source px.
const smooth = (e0, e1, v) => { const u = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return u * u * (3 - 2 * u); };
const res = new PNG({width: W, height: H}); t.data.copy(res.data);
let blended = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4; if (!o.data[i + 3]) continue;
  let s = 0; for (let yy = 0; yy < K; yy++) for (let xx = 0; xx < K; xx++) s += d[(y * K + yy) * W4 + x * K + xx];
  const dist = s / (K * K) / 3 / K; // chamfer unit 3 per 4× cell → source px
  if (dist > RIM + 1.5) continue;   // inner area: thinned candidate as is
  const w = smooth(RIM - 0.6, RIM + 0.9, dist); // 0 → original dark rim, 1 → thinned paint
  for (let k = 0; k < 3; k++) res.data[i + k] = Math.round(o.data[i + k] * (1 - w) + t.data[i + k] * w);
  res.data[i + 3] = o.data[i + 3];
  blended++;
}
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, PNG.sync.write(res));
console.log(`${out}: ${blended} rim pixels blended (rim ${RIM} px)`);
