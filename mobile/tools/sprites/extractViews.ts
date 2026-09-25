/**
 * Cuts the four locked Character Views (Down, Up, Left, Right) out of a
 * character design sheet and normalises them to the sprite contract
 * (spec height, feet anchor, 256×256 cells). Nothing is redrawn.
 *
 *   npm run sprites:views -- --src design.png --character player \
 *     --down x,y,w,h --up x,y,w,h --left x,y,w,h --right x,y,w,h [--darken 13 --lighten 6 --spread 4]
 *
 * Writes:
 *   art/characters/reference/<character>_design_views.png
 *       4 cells (Down, Up, Left, Right) — the design source at game scale;
 *       used by the validator's palette identity check when present
 *   art/characters/templates/<character>_idle_base.png
 *       4×4 sheet with each view repeated across the row — a pose/identity
 *       base for producing Idle (img2img or artist underlay). Not an animation.
 */
import * as fs from 'fs';
import * as path from 'path';

import { cutCell, measure } from './cutout';
import type { Box, Cut } from './cutout';
import { initSkiaNode } from './skiaNode';
import { ANCHOR, CELL, CHARACTERS, ROWS } from './spriteSpec';

const MOBILE = path.resolve(__dirname, '../..');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const ck = await initSkiaNode();
  const srcFile = arg('src');
  const who = (arg('character') ?? 'player') as 'player' | 'guard';
  const keyer = {
    kind: 'solid' as const,
    maxDarken: Number(arg('darken') ?? 13),
    maxLighten: Number(arg('lighten') ?? 6),
    spread: Number(arg('spread') ?? 4),
  };
  if (!srcFile) throw new Error('--src required');
  const rects = ROWS.map((row) => {
    const r = arg(row)?.split(',').map(Number);
    if (!r || r.length !== 4) throw new Error(`--${row} x,y,w,h required`);
    return r;
  });

  const img = ck.MakeImageFromEncoded(fs.readFileSync(srcFile))!;
  const W = img.width();
  const src = img.readPixels(0, 0, {
    width: W,
    height: img.height(),
    colorType: ck.ColorType.RGBA_8888,
    alphaType: ck.AlphaType.Unpremul,
    colorSpace: ck.ColorSpace.SRGB,
  }) as Uint8Array;

  const cuts: Cut[] = rects.map(([x, y, w, h]) => cutCell(src, W, x, y, w, h, keyer));
  const boxes: Box[] = cuts.map(measure);
  const heights = boxes.map((b) => b.bottom - b.top + 1);
  // One scale for all views: the Down (front) view defines the spec height.
  const scale = CHARACTERS[who].height / heights[0];
  console.log(
    `view heights ${heights.join(', ')} px → scale ×${scale.toFixed(3)} (Down = ${CHARACTERS[who].height}px)`,
  );

  const draw = (canvas: any, i: number, cx: number, cy: number) => {
    const c = cuts[i];
    const b = boxes[i];
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
    canvas.save();
    canvas.clipRect(ck.XYWHRect(cx, cy, CELL, CELL), ck.ClipOp.Intersect, true);
    canvas.drawImageRectCubic(
      cellImg,
      ck.XYWHRect(0, 0, c.w, c.h),
      ck.XYWHRect(
        cx + ANCHOR.x - b.torsoX * scale,
        cy + ANCHOR.y - (b.bottom + 1) * scale,
        c.w * scale,
        c.h * scale,
      ),
      1 / 3,
      1 / 3,
      null,
    );
    canvas.restore();
    cellImg.delete();
  };

  const write = (file: string, w: number, h: number, fill: (canvas: any) => void) => {
    const surface = ck.MakeSurface(w, h)!;
    const canvas = surface.getCanvas();
    canvas.clear(ck.TRANSPARENT);
    fill(canvas);
    surface.flush();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, surface.makeImageSnapshot().encodeToBytes()!);
    surface.delete();
    console.log(`wrote ${path.relative(MOBILE, file)}  ${w}×${h}`);
  };

  write(path.join(MOBILE, `art/characters/reference/${who}_design_views.png`), 4 * CELL, CELL, (c) =>
    ROWS.forEach((_, i) => draw(c, i, i * CELL, 0)),
  );
  write(path.join(MOBILE, `art/characters/templates/${who}_idle_base.png`), 4 * CELL, 4 * CELL, (c) =>
    ROWS.forEach((_, r) => {
      for (let f = 0; f < 4; f++) draw(c, r, f * CELL, r * CELL);
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
