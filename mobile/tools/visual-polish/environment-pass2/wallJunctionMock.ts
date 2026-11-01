/**
 * Environment Polish Pass 2: side-by-side mock of the Lab wall / floor junction, current code values (left) vs
 * the proposed parameter set (right). Draws a small 7×4-cell scene with the same primitives drawWallRow and
 * drawFloorShading use (buildStageArt.ts), so Claude can judge the proposal before touching the renderer. The
 * floor under both halves is the floor tile candidate given in FLOOR_TILES (or the flat code floor if unset).
 * No game code is changed; output is one PNG at SCALE px per world unit (default 4).
 *
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json FLOOR_TILES=<dir> node --import tsx tools/visual-polish/environment-pass2/wallJunctionMock.ts <out.png>
 */
import fs from 'node:fs';
import path from 'node:path';
import {initSkiaNode} from '../../sprites/skiaNode';

const TILE = 40, WALL_HEIGHT = 34;
const M = {floor: '#29424b', seam: '#1b313b', trim: '#83bfc7', inlay: '#4a6d76'}; // MATERIALS.lab
// Grid: '#' wall, '.' floor. A pier ends mid-room so end caps and an inner corner are visible.
const GRID = ['#######', '#...#..', '#......', '#......'];

async function main() {
  const out = process.argv[2];
  if (!out) throw Error('usage: wallJunctionMock.ts <out.png>');
  await initSkiaNode();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {Skia, BlendMode, TileMode} = require('../../sprites/skiaNodeShim');
  const K = Number(process.env.SCALE ?? 4), cols = GRID[0].length, rows = GRID.length;
  const W = cols * TILE, H = rows * TILE + WALL_HEIGHT, gap = 12;
  // The shim's Surface gives a JsiSkCanvas that takes the shim's paints (the game's paint factories do the same).
  const surface = Skia.Surface.Make((W * 2 + gap) * K, H * K)!, c = surface.getCanvas();
  c.scale(K, K);
  const fill = (color: string, a = 1) => { const p = Skia.Paint(); p.setAntiAlias(true); p.setColor(Skia.Color(color)); if (a < 1) p.setAlphaf(a); return p; };
  const stroke = (color: string, w: number, a = 1) => { const p = fill(color, a); p.setStyle(1); p.setStrokeWidth(w); return p; };
  const linear = (x0: number, y0: number, x1: number, y1: number, colors: string[]) => { const p = Skia.Paint(); p.setShader(Skia.Shader.MakeLinearGradient({x: x0, y: y0}, {x: x1, y: y1}, colors.map((s: string) => Skia.Color(s)), null, TileMode.Clamp)); return p; };
  const rect = (x: number, y: number, w: number, h: number, paint: unknown) => c.drawRect(Skia.XYWHRect(x, y, w, h), paint);
  const tileDir = process.env.FLOOR_TILES;
  const tiles = tileDir ? ['a', 'b', 'c', 'd'].map(n => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(path.join(tileDir, `lab_floor_tile_${n}.png`))))) : null;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows) ? ' ' : GRID[y][x];

  function scene(ox: number, proposal: boolean) {
    c.save(); c.translate(ox, WALL_HEIGHT);
    c.drawRect(Skia.XYWHRect(0, -WALL_HEIGHT, W, H), fill('#05070b'));
    // floor
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (at(x, y) !== '.') continue;
      if (tiles) c.drawImageRect(tiles[(x * 7 + y * 3) % 4], Skia.XYWHRect(0, 0, 128, 128), Skia.XYWHRect(x * TILE, y * TILE, TILE, TILE), fill('#ffffff'));
      else { rect(x * TILE, y * TILE, TILE, TILE, fill(M.floor)); c.drawLine(x * TILE, y * TILE, x * TILE + TILE, y * TILE, stroke(M.seam, 2)); c.drawLine(x * TILE, y * TILE, x * TILE, y * TILE + TILE, stroke(M.seam, 2)); }
    }
    // floor shading at walls (current: 18-unit 0.6 band / 12-unit 0.45; proposal: 2-unit baseboard + 10/8-unit 0.35 gradient)
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (at(x, y) !== '.') continue;
      const px = x * TILE, py = y * TILE;
      if (at(x, y - 1) === '#') {
        if (!proposal) rect(px, py, TILE, 18, linear(0, py, 0, py + 18, ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']));
        else { rect(px, py, TILE, 2, fill(M.seam, 0.9)); rect(px, py + 2, TILE, 10, linear(0, py + 2, 0, py + 12, ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)'])); }
      }
      if (at(x - 1, y) === '#') {
        if (!proposal) rect(px, py, 12, TILE, linear(px, 0, px + 12, 0, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']));
        else { rect(px, py, 2, TILE, fill(M.seam, 0.9)); rect(px + 2, py, 8, TILE, linear(px + 2, 0, px + 10, 0, ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)'])); }
      }
      if (at(x + 1, y) === '#') {
        const x1 = px + TILE;
        if (!proposal) rect(x1 - 12, py, 12, TILE, linear(x1, 0, x1 - 12, 0, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']));
        else { rect(x1 - 2, py, 2, TILE, fill(M.seam, 0.9)); rect(x1 - 10, py, 8, TILE, linear(x1 - 2, 0, x1 - 10, 0, ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)'])); }
      }
    }
    // walls, row by row (as drawWallRow: face where the cell below is not a wall, then the cap)
    for (let r = 0; r < rows; r++) for (let x = 0; x < cols; x++) {
      if (at(x, r) !== '#') continue;
      const xx = x * TILE, yy = (r + 1) * TILE - WALL_HEIGHT;
      if (at(x, r + 1) !== '#') {
        rect(xx, yy, TILE, WALL_HEIGHT, linear(0, yy, 0, yy + WALL_HEIGHT, [M.inlay, M.seam]));
        c.drawLine(xx, yy + WALL_HEIGHT - 4, xx + TILE, yy + WALL_HEIGHT - 4, stroke(M.trim, 2, 0.6));
        c.drawLine(xx + 2, yy + 3, xx + 2, yy + WALL_HEIGHT - 5, stroke(M.trim, 1, 0.22));
        if (proposal) {
          // end faces: where the run ends, a 3-unit darker strip on the face gives the wall thickness
          if (at(x - 1, r) !== '#') rect(xx, yy, 3, WALL_HEIGHT, fill('#000000', 0.28));
          if (at(x + 1, r) !== '#') rect(xx + TILE - 3, yy, 3, WALL_HEIGHT, fill('#000000', 0.28));
          // baseboard on the face itself
          rect(xx, yy + WALL_HEIGHT - 2, TILE, 2, fill(M.seam, 0.9));
        }
      }
      rect(xx, r * TILE - WALL_HEIGHT, TILE, TILE, fill(M.seam));
      c.drawLine(xx, r * TILE - WALL_HEIGHT, xx + TILE, r * TILE - WALL_HEIGHT, stroke(M.trim, 1, 0.5));
      if (proposal) {
        // two-tone cap: an inset lighter top surface that runs continuously along a wall run (the inset gap
        // appears only where no wall cell continues), and a trim edge where the run ends
        const l = at(x - 1, r) === '#' ? 0 : 3, rr = at(x + 1, r) === '#' ? 0 : 3, u = at(x, r - 1) === '#' ? 0 : 3, dn = at(x, r + 1) === '#' ? 0 : 3;
        rect(xx + l, r * TILE - WALL_HEIGHT + u, TILE - l - rr, TILE - u - dn, fill(M.inlay, 0.25));
        if (at(x - 1, r) !== '#') c.drawLine(xx + 0.5, r * TILE - WALL_HEIGHT, xx + 0.5, r * TILE - WALL_HEIGHT + TILE, stroke(M.trim, 1, 0.5));
        if (at(x + 1, r) !== '#') c.drawLine(xx + TILE - 0.5, r * TILE - WALL_HEIGHT, xx + TILE - 0.5, r * TILE - WALL_HEIGHT + TILE, stroke(M.trim, 1, 0.5));
      }
    }
    c.restore();
  }
  scene(0, false); scene(W + gap, true);
  c.drawRect(Skia.XYWHRect(W, 0, gap, H), fill('#ffd400'));
  surface.flush();
  const img = surface.makeImageSnapshot();
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, img.encodeToBytes()!);
  console.log(`${out}: left = current drawWallRow/drawFloorShading values, right = proposal (baseboard 2u α.9 + 10/8u α.35 gradient, 3u end faces α.28, cap inset inlay α.25, trim edge at run ends)`);
  void BlendMode;
}
void main();
