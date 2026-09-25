/**
 * Converts an externally produced sprite grid that arrives as a flattened
 * image (e.g. a presentation board with a painted checkerboard "transparency"
 * and baked shadows) into a contract-compliant runtime sheet.
 *
 *   npm run sprites:extract -- --src board.png --grid x,y,w,h --sheet player_walk.png \
 *        [--bg checker|alpha|chroma:#00ff00|solid] [--align row|frame] [--inset 3] \
 *        [--out assets/characters] [--debug dir]
 *
 *   --bg     checker (painted checkerboard, default), alpha (real transparency),
 *            chroma:#rrggbb (flat key colour), solid (flat dark panel)
 *   --align  row (default): one transform per row, preserving in-row motion
 *            (breathing, weight shift, foot travel). frame: re-centre every
 *            frame — only for sources with generator jitter (e.g. the walk board).
 *
 * Per cell:
 *  1. crop (inset past the grid lines)
 *  2. background = light, low-saturation pixels (checker + baked ground
 *     shadow) flood-filled from the cell border, so light details *inside*
 *     the character survive
 *  3. anti-aliased edge pixels get alpha from their contrast with the local
 *     checker colour and are colour-decontaminated
 *  4. one uniform scale for the whole sheet (idle height from spriteSpec)
 *  5. placement: --align row keeps every frame's position relative to its row
 *     (median torso x / median lowest foot); --align frame re-centres each
 *     frame on its torso and puts its lowest foot on the ground line
 */
import * as fs from 'fs';
import * as path from 'path';
import type { CanvasKit } from 'canvaskit-wasm';

import { cutCell, measure } from './cutout';
import type { Box, Cut, Keyer } from './cutout';
import { initSkiaNode } from './skiaNode';
import { ANCHOR, CELL, CHARACTERS, ROWS, SHEETS } from './spriteSpec';

const MOBILE = path.resolve(__dirname, '../..');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const ck: CanvasKit = await initSkiaNode();
  const srcFile = arg('src');
  const grid = arg('grid')?.split(',').map(Number);
  const sheetName = arg('sheet');
  if (!srcFile || !grid || grid.length !== 4 || !sheetName) {
    throw new Error(
      'usage: --src <png> --grid x,y,w,h --sheet <name.png> [--cols 8 --rows 4 --out dir --debug dir]',
    );
  }
  const spec = SHEETS.find((s) => s.file === sheetName);
  if (!spec) throw new Error(`unknown sheet ${sheetName}`);
  const cols = Number(arg('cols') ?? spec.frames);
  const rows = Number(arg('rows') ?? ROWS.length);
  if (cols !== spec.frames || rows !== ROWS.length) throw new Error('grid does not match the sheet spec');
  const outDir = path.resolve(arg('out') ?? path.join(MOBILE, 'assets/characters'));
  const inset = Number(arg('inset') ?? 3);
  const bg = arg('bg') ?? 'checker';
  const align = arg('align') ?? 'row';
  if (align !== 'row' && align !== 'frame') throw new Error('--align must be row or frame');
  let keyer: Keyer;
  if (bg === 'checker') keyer = { kind: 'checker' };
  else if (bg === 'alpha') keyer = { kind: 'alpha' };
  else if (bg === 'solid') keyer = { kind: 'solid', maxDarken: 13, maxLighten: 6, spread: 4 };
  else if (bg.startsWith('chroma:#') && bg.length === 14) {
    const hex = bg.slice(8);
    keyer = {
      kind: 'chroma',
      color: [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16)) as [number, number, number],
    };
  } else throw new Error(`unknown --bg ${bg}`);

  const img = ck.MakeImageFromEncoded(fs.readFileSync(srcFile))!;
  const W = img.width();
  const H = img.height();
  const src = img.readPixels(0, 0, {
    width: W,
    height: H,
    colorType: ck.ColorType.RGBA_8888,
    alphaType: ck.AlphaType.Unpremul,
    colorSpace: ck.ColorSpace.SRGB,
  }) as Uint8Array;

  const [gx, gy, gw, gh] = grid;
  const cw = gw / cols;
  const chh = gh / rows;
  const cuts: Cut[][] = [];
  const boxes: Box[][] = [];
  for (let r = 0; r < rows; r++) {
    cuts.push([]);
    boxes.push([]);
    for (let i = 0; i < cols; i++) {
      const x0 = Math.round(gx + i * cw + inset);
      const y0 = Math.round(gy + r * chh + inset);
      const c = cutCell(src, W, x0, y0, Math.floor(cw - inset * 2), Math.floor(chh - inset * 2), keyer);
      cuts[r].push(c);
      boxes[r].push(measure(c));
    }
  }

  // One uniform scale: median silhouette height → spec height.
  const heights = boxes
    .flat()
    .map((b) => b.bottom - b.top + 1)
    .sort((a, b) => a - b);
  const median = heights[heights.length >> 1];
  const scale = CHARACTERS[spec.character].height / median;
  console.log(
    `source cell ${cw.toFixed(1)}×${chh.toFixed(1)}  median height ${median}px  scale ×${scale.toFixed(3)}`,
  );

  const med = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1];
  const rowRef = boxes.map((row) => ({
    torsoX: med(row.map((b) => b.torsoX)),
    bottom: med(row.map((b) => b.bottom)),
  }));
  console.log(`bg ${bg}, align ${align}`);

  const surface = ck.MakeSurface(cols * CELL, rows * CELL)!;
  const canvas = surface.getCanvas();
  canvas.clear(ck.TRANSPARENT);
  const paint = new ck.Paint();
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < cols; i++) {
      const c = cuts[r][i];
      const b = boxes[r][i];
      const cellImg = ck.MakeImage(
        {
          width: c.w,
          height: c.h,
          colorType: ck.ColorType.RGBA_8888,
          alphaType: ck.AlphaType.Unpremul,
          colorSpace: ck.ColorSpace.SRGB,
        },
        c.rgba,
        c.w * 4,
      )!;
      // Map (torsoX, bottom+1) → (ANCHOR.x, ANCHOR.y) of the destination cell —
      // per frame, or once per row (row medians) to keep in-row motion.
      const ref = align === 'frame' ? b : rowRef[r];
      const dx = i * CELL + ANCHOR.x - ref.torsoX * scale;
      const dy = r * CELL + ANCHOR.y - (ref.bottom + 1) * scale;
      canvas.save();
      canvas.clipRect(ck.XYWHRect(i * CELL, r * CELL, CELL, CELL), ck.ClipOp.Intersect, true);
      canvas.drawImageRectCubic(
        cellImg,
        ck.XYWHRect(0, 0, c.w, c.h),
        ck.XYWHRect(dx, dy, c.w * scale, c.h * scale),
        1 / 3,
        1 / 3,
        paint,
      );
      canvas.restore();
      cellImg.delete();
    }
  }
  paint.delete();
  surface.flush();
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, sheetName);
  fs.writeFileSync(outFile, surface.makeImageSnapshot().encodeToBytes()!);
  console.log(`wrote ${path.relative(MOBILE, outFile)}  ${cols * CELL}×${rows * CELL}`);

  const debug = arg('debug');
  if (debug) {
    fs.mkdirSync(debug, { recursive: true });
    const lines = boxes.map(
      (row, r) =>
        `${ROWS[r].padEnd(5)} ` +
        row.map((b) => `h${b.bottom - b.top + 1} x${b.torsoX.toFixed(0)} y${b.bottom}`).join(' | '),
    );
    fs.writeFileSync(path.join(debug, 'cells.txt'), lines.join('\n') + '\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
