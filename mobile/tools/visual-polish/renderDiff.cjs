/**
 * Visual Polish: compares two renders of the same mission (same renderMissions.ts SCALE) and reports where they
 * differ, so an art or render change can be shown to land only where it was meant to. Writes a heat-map PNG
 * (unchanged pixels dimmed, changed pixels in magenta by strength) and prints the changed fraction plus the
 * bounding boxes of the changed regions in render px and in world tiles.
 *
 *   NODE_PATH=node_modules node tools/visual-polish/renderDiff.cjs <before.png> <after.png> <out.png> [threshold=12] [scale=3]
 *
 * threshold: per-channel difference (0–255) under which a pixel counts as unchanged (anti-aliasing noise).
 * scale: px per world unit the renders were made with (renderMissions.ts SCALE; its camera puts world (0,0) at
 * render px (16,55)·scale).
 */
const fs = require('fs'), {PNG} = require('pngjs');
const [a, b, out, thrArg = '12', scaleArg = '3'] = process.argv.slice(2);
if (!a || !b || !out) throw Error('usage: renderDiff.cjs <before.png> <after.png> <out.png> [threshold] [scale]');
const thr = Number(thrArg), K = Number(scaleArg), CAM = {x: 16, y: 55};
const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
if (A.width !== B.width || A.height !== B.height) throw Error(`size differs: ${A.width}×${A.height} vs ${B.width}×${B.height} (render both with the same SCALE)`);
const W = A.width, H = A.height, o = new PNG({width: W, height: H});
const changed = new Uint8Array(W * H);
let n = 0;
for (let i = 0; i < W * H; i++) {
  const d = Math.max(Math.abs(A.data[i * 4] - B.data[i * 4]), Math.abs(A.data[i * 4 + 1] - B.data[i * 4 + 1]), Math.abs(A.data[i * 4 + 2] - B.data[i * 4 + 2]), Math.abs(A.data[i * 4 + 3] - B.data[i * 4 + 3]));
  const g = Math.round((0.299 * B.data[i * 4] + 0.587 * B.data[i * 4 + 1] + 0.114 * B.data[i * 4 + 2]) * 0.35);
  if (d > thr) { changed[i] = 1; n++; const s = Math.min(1, d / 96); o.data[i * 4] = Math.round(g + (255 - g) * s); o.data[i * 4 + 1] = Math.round(g * (1 - s)); o.data[i * 4 + 2] = Math.round(g + (255 - g) * s); }
  else { o.data[i * 4] = g; o.data[i * 4 + 1] = g; o.data[i * 4 + 2] = g; }
  o.data[i * 4 + 3] = 255;
}
// Connected regions of changed pixels on a coarse 8 px grid → bounding boxes.
const cs = 8, gw = Math.ceil(W / cs), gh = Math.ceil(H / cs), grid = new Uint8Array(gw * gh);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (changed[y * W + x]) grid[Math.floor(y / cs) * gw + Math.floor(x / cs)] = 1;
const seen = new Uint8Array(gw * gh), boxes = [];
for (let i = 0; i < gw * gh; i++) {
  if (!grid[i] || seen[i]) continue;
  const stack = [i]; seen[i] = 1; let x0 = gw, x1 = -1, y0 = gh, y1 = -1, cells = 0;
  while (stack.length) {
    const j = stack.pop(), gx = j % gw, gy = Math.floor(j / gw); cells++;
    x0 = Math.min(x0, gx); x1 = Math.max(x1, gx); y0 = Math.min(y0, gy); y1 = Math.max(y1, gy);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const k = ny * gw + nx; if (grid[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
    }
  }
  boxes.push({px: {x: x0 * cs, y: y0 * cs, w: (x1 - x0 + 1) * cs, h: (y1 - y0 + 1) * cs}, cells});
}
boxes.sort((p, q) => q.cells - p.cells);
const tile = v => +(v / K / 40).toFixed(2);
fs.writeFileSync(out, PNG.sync.write(o));
console.log(JSON.stringify({
  before: a, after: b, heatmap: out, threshold: thr,
  changedFraction: +(n / (W * H)).toFixed(5), changedPixels: n, regions: boxes.length,
  largestRegions: boxes.slice(0, 12).map(r => ({
    renderPx: r.px,
    tiles: {x: tile(r.px.x - CAM.x * K), y: tile(r.px.y - CAM.y * K), w: tile(r.px.w), h: tile(r.px.h)},
  })),
}, null, 1));
