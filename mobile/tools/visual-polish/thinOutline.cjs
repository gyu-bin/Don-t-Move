/**
 * Visual Polish Pass 2: thins an over-thick painted contour so a piece matches the thin edge line of the rest of
 * the kit. The silhouette (alpha) is never changed: the outer dark band is kept only `keepExt` px deep from the
 * transparent edge, inner contour lines are kept only along their centre line (`keepInner` px each side), and
 * the released pixels take the colour of the nearest painted (non-contour) pixels. Pixel work only; output goes
 * to a candidate dir, the runtime file is not written.
 *
 *   NODE_PATH=node_modules node tools/visual-polish/thinOutline.cjs <assetId> <outDir> [lumThreshold=60] [keepExt=2.5] [keepInner=1]
 */
const fs = require('fs'), path = require('path'), {PNG} = require('pngjs');

const [id, outDir, lumArg = '60', keepExtArg = '2.5', keepInnerArg = '1'] = process.argv.slice(2);
if (!id || !outDir) throw Error('usage: thinOutline.cjs <assetId> <outDir> [lumThreshold] [keepExt] [keepInner]');
const lumT = Number(lumArg), keepExt = Number(keepExtArg), keepInner = Number(keepInnerArg);
const asset = JSON.parse(fs.readFileSync('assets/environment/environment-assets.json', 'utf8')).assets.find(a => a.id === id);
if (!asset) throw Error(`unknown asset ${id}`);
const im = PNG.sync.read(fs.readFileSync(asset.path)), W = im.width, H = im.height, d = im.data;

const R = 16, offsets = [];
for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const r = Math.hypot(dx, dy); if (r <= R && (dx || dy)) offsets.push([dx, dy, r]); }
offsets.sort((a, b) => a[2] - b[2]);

const kind = new Uint8Array(W * H); // 0 exterior, 1 painted, 2 contour
for (let i = 0; i < W * H; i++) {
  const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
  if (a < 128) continue;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b, chroma = Math.max(r, g, b) - Math.min(r, g, b);
  // Any half-opaque dark low-chroma pixel is contour (the anti-aliased rim included); 3 = clearly painted body,
  // the only colour source for released pixels; 1 = painted but too dark/soft to copy from.
  kind[i] = lum < lumT && chroma < 48 ? 2 : a >= 250 && lum >= lumT + 25 ? 3 : 1;
}
const nearest = (x, y, want) => {
  for (const [dx, dy, r] of offsets) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) { if (want === 0) return r; continue; } if (kind[yy * W + xx] === want) return r; }
  return R + 1;
};
const dExt = new Float32Array(W * H), dInt = new Float32Array(W * H);
const nearestPainted = (x, y) => { for (const [dx, dy, r] of offsets) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = kind[yy * W + xx]; if (k === 1 || k === 3) return r; } return R + 1; };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (kind[i] !== 2) continue; dExt[i] = nearest(x, y, 0); dInt[i] = nearestPainted(x, y); }

const out = new PNG({width: W, height: H}); im.data.copy(out.data);
// Pass 1: which contour pixels stay dark. Outer rim ≤ keepExt from the transparent edge; inner contours keep
// their core (≥ keepInner px from paint on both sides) and a line that thin already stays whole.
const kept = new Uint8Array(W * H);
let contour = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x; if (kind[i] !== 2) continue; contour++;
  if (dExt[i] <= keepExt) { kept[i] = 1; continue; }
  if (dExt[i] > keepExt + 3) {
    let localMax = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && kind[yy * W + xx] === 2) localMax = Math.max(localMax, dInt[yy * W + xx]); }
    if (localMax <= keepInner + 1 || dInt[i] >= keepInner + 1) kept[i] = 1;
  }
}
// Pass 2: released pixels take the nearest body colour, shaded darker towards the kept line so the thick contour
// becomes edge shading (how the thin-edged pieces of the kit are painted) rather than a light halo.
const nearestKept = (x, y) => { for (const [dx, dy, r] of offsets) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && kept[yy * W + xx]) return r; } return R + 1; };
const released = new Uint8Array(W * H);
let releasedN = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x; if (kind[i] !== 2) continue;
  // The outer rim fades into the released paint over 1.5 px instead of a hard cut, so the kept rim's
  // integer-distance boundary does not step.
  const soft = dExt[i] <= keepExt + 3 ? Math.max(0, Math.min(1, (dExt[i] - keepExt + 0.5) / 1.5)) : kept[i] ? 0 : 1;
  if (soft === 0) continue;
  let r = 0, g = 0, b = 0, w = 0, n = 0;
  for (const [dx, dy, dist] of offsets) {
    const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const j = yy * W + xx; if (kind[j] !== 3) continue;
    const wt = 1 / (dist * dist); r += d[j * 4] * wt; g += d[j * 4 + 1] * wt; b += d[j * 4 + 2] * wt; w += wt; if (++n >= 10) break;
  }
  if (!w) continue;
  const a = nearestKept(x, y), bdy = dInt[i], t = a / (a + bdy); // 0 at the kept line, 1 at the body
  const shade = 0.62 + 0.38 * t;
  for (let k = 0; k < 3; k++) out.data[i * 4 + k] = Math.round(d[i * 4 + k] * (1 - soft) + [r, g, b][k] / w * shade * soft);
  if (soft >= 1) { released[i] = 1; releasedN++; }
}
// Smooth the released paint (3×3 box over released + body pixels) so copied colours do not speckle.
const smooth = Uint8Array.from(out.data);
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const i = y * W + x; if (!released[i]) continue;
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * W + x + dx; if (released[j] || kind[j] === 3) { r += smooth[j * 4]; g += smooth[j * 4 + 1]; b += smooth[j * 4 + 2]; n++; } }
  out.data[i * 4] = Math.round(r / n); out.data[i * 4 + 1] = Math.round(g / n); out.data[i * 4 + 2] = Math.round(b / n);
}
fs.mkdirSync(outDir, {recursive: true});
const file = path.join(outDir, `${id}.png`);
fs.writeFileSync(file, PNG.sync.write(out));
console.log(`${id}: ${contour} contour px, ${releasedN} released (${(releasedN / contour * 100).toFixed(0)}%) → ${file}`);
