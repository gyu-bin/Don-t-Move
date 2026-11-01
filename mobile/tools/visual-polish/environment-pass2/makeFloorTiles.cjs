/**
 * Environment Polish Pass 2: Lab floor tile candidates A / B / C (procedural, palette-locked).
 * These are generated textures built from the Lab MATERIALS colours, not hand-painted art. Each tile is 128×128
 * (one 40-unit cell at 3.2 px per world unit = 1:1 on an iPhone 17), opaque sRGB PNG, with the 2-unit seam the
 * code draws today baked into the top and left edge so the code seams can be dropped when a tile set is used.
 * Variants a–d differ only inside the tile (periodic noise with a fade-out near the edges), so any variant tiles
 * with any other; `inlay` carries the cyan accent at the code's position; `restricted_a/b` are the same family
 * 4 % darker for restricted / objective rooms.
 *
 *   NODE_PATH=node_modules node tools/visual-polish/environment-pass2/makeFloorTiles.cjs <outRoot>
 *   → <outRoot>/{A,B,C}/lab_floor_tile_{a,b,c,d,inlay,restricted_a,restricted_b}.png + tile-test-{A,B,C}.png
 */
const fs = require('fs'), path = require('path'), {PNG} = require('pngjs');

const SIZE = 128, PX = SIZE / 40; // px per world unit
const FLOOR = [41, 66, 75], SEAM = [27, 49, 59], INLAY = [74, 109, 118], ACCENT = [146, 200, 208]; // MATERIALS.lab + the code's cyan accent

const LEVELS = {
  // amplitudes are fractions of the base value; sizes in px
  A: {grain: 0.012, blotch: 0.014, streak: 0.006, bevel: 0.0, inset: 0.0, wear: 0.0, scuffs: 0, rivets: false, panelGrad: 0.0},
  B: {grain: 0.016, blotch: 0.028, streak: 0.012, bevel: 0.055, inset: 0.045, wear: 0.02, scuffs: 0, rivets: false, panelGrad: 0.02},
  C: {grain: 0.02, blotch: 0.034, streak: 0.02, bevel: 0.075, inset: 0.065, wear: 0.03, scuffs: 3, rivets: true, panelGrad: 0.03},
};

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const smooth = t => t * t * (3 - 2 * t);
/** Periodic value noise on an n×m lattice over the tile (wraps, so a tile also tiles with itself). */
function valueNoise(seed, nx, ny) {
  const r = rng(seed), g = Array.from({length: nx * ny}, () => r() * 2 - 1);
  return (x, y) => {
    const fx = (x / SIZE) * nx, fy = (y / SIZE) * ny, ix = Math.floor(fx), iy = Math.floor(fy), tx = smooth(fx - ix), ty = smooth(fy - iy);
    const v = (a, b) => g[((b % ny) + ny) % ny * nx + ((a % nx) + nx) % nx];
    return (v(ix, iy) * (1 - tx) + v(ix + 1, iy) * tx) * (1 - ty) + (v(ix, iy + 1) * (1 - tx) + v(ix + 1, iy + 1) * tx) * ty;
  };
}
const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
const seamW = Math.round(2 * PX); // the code draws a 2-unit seam

function makeTile(level, variant, kind) {
  const L = LEVELS[level], seed = (level.charCodeAt(0) * 131 + variant * 17 + 7) >>> 0;
  const grain = valueNoise(seed + 1, 64, 64), blotch = valueNoise(seed + 2, 4, 4), streak = valueNoise(seed + 3, 3, 48), wear = valueNoise(seed + 4, 6, 6);
  const scuffR = rng(seed + 5), scuffs = Array.from({length: L.scuffs}, () => ({x: 20 + scuffR() * 88, y: 20 + scuffR() * 88, len: 18 + scuffR() * 30, ang: scuffR() * Math.PI, a: 0.035 + scuffR() * 0.03}));
  const img = new PNG({width: SIZE, height: SIZE});
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    let rgb;
    if (x < seamW || y < seamW) {
      // Seam, with a one-pixel lighter lip on its inner edge so the panel reads as sitting in a groove.
      const lip = (x === seamW - 1 && y >= seamW - 1) || (y === seamW - 1 && x >= seamW - 1);
      rgb = lip ? SEAM.map((c, k) => c * 0.55 + INLAY[k] * 0.45) : SEAM.slice();
    } else {
      // Panel: base × (1 + texture). Texture fades to zero within 10 px of the panel edge so variants match at
      // their borders.
      const ex = Math.min(x - seamW, SIZE - 1 - x), ey = Math.min(y - seamW, SIZE - 1 - y), e = Math.min(ex, ey);
      const win = smooth(Math.max(0, Math.min(1, e / 10)));
      let t = (L.grain * grain(x, y) + L.blotch * blotch(x, y) + L.streak * streak(x, y) + L.wear * Math.max(0, wear(x, y) - 0.3)) * win;
      // Panel gradient: a touch lighter towards the top-left, like the kit's front-top lighting.
      t += L.panelGrad * (0.5 - (x + y) / (2 * SIZE));
      // Bevel: lighter inner top/left edge, darker inner bottom/right edge, 2 px each.
      const bw = Math.round(2 * PX / 3.2 * 2); // 2 px at 3.2 px/world
      if (L.bevel) {
        if (ex < bw && x - seamW < bw) t += L.bevel * (1 - (x - seamW) / bw);
        if (ey < bw && y - seamW < bw) t += L.bevel * (1 - (y - seamW) / bw);
        if (SIZE - 1 - x < bw) t -= L.bevel * 0.9 * (1 - (SIZE - 1 - x) / bw);
        if (SIZE - 1 - y < bw) t -= L.bevel * 0.9 * (1 - (SIZE - 1 - y) / bw);
      }
      // Inset line: a faint groove at a 14 px margin inside the panel (one pixel).
      if (L.inset) {
        const m = 14, inX = x - seamW, inY = y - seamW, w = SIZE - seamW;
        const onLine = (inX === m && inY >= m && inY <= w - 1 - m) || (inX === w - 1 - m && inY >= m && inY <= w - 1 - m) || (inY === m && inX >= m && inX <= w - 1 - m) || (inY === w - 1 - m && inX >= m && inX <= w - 1 - m);
        if (onLine) t -= L.inset;
      }
      for (const s of scuffs) {
        const dx = x - s.x, dy = y - s.y, along = dx * Math.cos(s.ang) + dy * Math.sin(s.ang), across = -dx * Math.sin(s.ang) + dy * Math.cos(s.ang);
        if (Math.abs(along) < s.len / 2 && Math.abs(across) < 0.8) t += s.a * (1 - Math.abs(along) / (s.len / 2));
      }
      rgb = FLOOR.map(c => c * (1 + t));
      if (L.rivets) {
        for (const [cx, cy] of [[seamW + 9, seamW + 9], [SIZE - 10, seamW + 9], [seamW + 9, SIZE - 10], [SIZE - 10, SIZE - 10]]) {
          const d = Math.hypot(x - cx, y - cy);
          if (d < 2.6) rgb = rgb.map((c, k) => c * 0.72 + (d < 1.2 ? INLAY[k] * 0.5 : SEAM[k] * 0.28));
          else if (d < 3.4) rgb = rgb.map(c => c * 1.06);
        }
      }
      if (kind === 'inlay') {
        // The code's accent: a 34×2 bar at (3,3) and a 2×30 bar at (3,5), world units, α .33 and .13.
        const wx = x / PX, wy = y / PX;
        const bar1 = wx >= 3 && wx < 37 && wy >= 3 && wy < 5, bar2 = wx >= 3 && wx < 5 && wy >= 5 && wy < 35;
        const a = bar1 ? 0.33 : bar2 ? 0.13 : 0;
        if (a) rgb = rgb.map((c, k) => c * (1 - a) + ACCENT[k] * a);
      }
      if (kind === 'restricted') rgb = rgb.map(c => c * 0.96);
    }
    img.data[i] = clamp(rgb[0]); img.data[i + 1] = clamp(rgb[1]); img.data[i + 2] = clamp(rgb[2]); img.data[i + 3] = 255;
  }
  return img;
}

function mosaic(tiles, cols, rows, scale, seed) {
  const r = rng(seed), out = new PNG({width: Math.round(cols * SIZE * scale), height: Math.round(rows * SIZE * scale)});
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
    const t = (tx + ty) % 4 === 0 ? tiles.inlay : tiles.plain[Math.floor(r() * tiles.plain.length)];
    for (let y = 0; y < SIZE * scale; y++) for (let x = 0; x < SIZE * scale; x++) {
      // box-filter downscale when scale < 1 (device density of a small phone), nearest when 1
      const sx = Math.min(SIZE - 1, Math.floor(x / scale)), sy = Math.min(SIZE - 1, Math.floor(y / scale));
      const si = (sy * SIZE + sx) * 4, di = ((Math.round(ty * SIZE * scale) + y) * out.width + Math.round(tx * SIZE * scale) + x) * 4;
      for (let k = 0; k < 4; k++) out.data[di + k] = t.data[si + k];
    }
  }
  return out;
}

const outRoot = process.argv[2];
if (!outRoot) throw Error('usage: makeFloorTiles.cjs <outRoot>');
for (const level of Object.keys(LEVELS)) {
  const dir = path.join(outRoot, level); fs.mkdirSync(dir, {recursive: true});
  const plain = ['a', 'b', 'c', 'd'].map((v, i) => makeTile(level, i, 'plain'));
  const inlay = makeTile(level, 4, 'inlay');
  const restricted = [makeTile(level, 5, 'restricted'), makeTile(level, 6, 'restricted')];
  plain.forEach((t, i) => fs.writeFileSync(path.join(dir, `lab_floor_tile_${'abcd'[i]}.png`), PNG.sync.write(t)));
  fs.writeFileSync(path.join(dir, 'lab_floor_tile_inlay.png'), PNG.sync.write(inlay));
  restricted.forEach((t, i) => fs.writeFileSync(path.join(dir, `lab_floor_tile_restricted_${'ab'[i]}.png`), PNG.sync.write(t)));
  // Repetition tests: 10×4 at 1:1 (a full iPhone 17 width is 9.4 tiles) and 10×4 at 0.62 (375-pt phone density).
  fs.writeFileSync(path.join(outRoot, `tile-test-${level}-1x.png`), PNG.sync.write(mosaic({plain, inlay}, 10, 4, 1, 99)));
  fs.writeFileSync(path.join(outRoot, `tile-test-${level}-0.62x.png`), PNG.sync.write(mosaic({plain, inlay}, 10, 4, 0.62, 99)));
  console.log(`${level}: 7 tiles → ${dir}`);
}
