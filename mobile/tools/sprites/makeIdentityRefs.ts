/**
 * Builds the identity references the validator compares new character art
 * against. Crop and alignment only; nothing is drawn or redesigned.
 *
 *   npm run sprites:identity
 *
 * Output: art/characters/reference/<who>_identity.png, 4 cells (Down, Up,
 * Left, Right) at 256×256 on the feet anchor.
 *   player: assets/characters/player_walk.png, frame #4 of every row — the
 *           cleanest neutral stance (Down #1/#5/#7 carry the W1 leg smear; also
 *           the frame the game holds at rest). Already at spec scale; copied as-is.
 *   guard:  assets/characters/legacy/guard_directions.png (2×2 Down, Up / Left,
 *           Right). Cut from its real alpha, scaled so Down = spec height,
 *           torso centred on x=128, soles on y=224.
 */
import * as fs from 'fs';
import * as path from 'path';

import { cutCell, measure } from './cutout';
import { initSkiaNode } from './skiaNode';
import { ANCHOR, CELL, CHARACTERS } from './spriteSpec';

const MOBILE = path.resolve(__dirname, '../..');
const OUT = path.join(MOBILE, 'art/characters/reference');

/** player_walk.png frame (0-based column) used per row. */
const PLAYER_FRAMES = [3, 3, 3, 3];
/** guard_directions.png quadrants (x, y, w, h) in Down, Up, Left, Right order. */
const GUARD_QUADS = [
  [0, 0, 627, 627],
  [627, 0, 627, 627],
  [0, 627, 627, 627],
  [627, 627, 627, 627],
];

async function main() {
  const ck = await initSkiaNode();
  fs.mkdirSync(OUT, { recursive: true });
  const save = (file: string, draw: (c: any) => void) => {
    const surface = ck.MakeSurface(4 * CELL, CELL)!;
    const c = surface.getCanvas();
    c.clear(ck.TRANSPARENT);
    draw(c);
    surface.flush();
    fs.writeFileSync(path.join(OUT, file), surface.makeImageSnapshot().encodeToBytes()!);
    surface.delete();
    console.log(`wrote art/characters/reference/${file}`);
  };

  // Player: straight cell copies.
  const walk = ck.MakeImageFromEncoded(
    fs.readFileSync(path.join(MOBILE, 'assets/characters/player_walk.png')),
  )!;
  save('player_identity.png', (c) =>
    PLAYER_FRAMES.forEach((f, r) =>
      c.drawImageRect(
        walk,
        ck.XYWHRect(f * CELL, r * CELL, CELL, CELL),
        ck.XYWHRect(r * CELL, 0, CELL, CELL),
        null,
      ),
    ),
  );

  // Guard: cut from alpha, one scale for all four views.
  const legacy = ck.MakeImageFromEncoded(
    fs.readFileSync(path.join(MOBILE, 'assets/characters/legacy/guard_directions.png')),
  )!;
  const W = legacy.width();
  const src = legacy.readPixels(0, 0, {
    width: W,
    height: legacy.height(),
    colorType: ck.ColorType.RGBA_8888,
    alphaType: ck.AlphaType.Unpremul,
    colorSpace: ck.ColorSpace.SRGB,
  }) as Uint8Array;
  const cuts = GUARD_QUADS.map(([x, y, w, h]) => cutCell(src, W, x, y, w, h, { kind: 'alpha' }));
  const boxes = cuts.map(measure);
  const scale = CHARACTERS.guard.height / (boxes[0].bottom - boxes[0].top + 1);
  console.log(`guard legacy Down height ${boxes[0].bottom - boxes[0].top + 1}px → ×${scale.toFixed(3)}`);
  save('guard_identity.png', (c) =>
    cuts.forEach((cut, r) => {
      const b = boxes[r];
      const img = ck.MakeImage(
        {
          width: cut.w,
          height: cut.h,
          colorType: ck.ColorType.RGBA_8888,
          alphaType: ck.AlphaType.Unpremul,
          colorSpace: ck.ColorSpace.SRGB,
        },
        cut.rgba,
        cut.w * 4,
      )!;
      c.save();
      c.clipRect(ck.XYWHRect(r * CELL, 0, CELL, CELL), ck.ClipOp.Intersect, true);
      c.drawImageRectCubic(
        img,
        ck.XYWHRect(0, 0, cut.w, cut.h),
        ck.XYWHRect(
          r * CELL + ANCHOR.x - b.torsoX * scale,
          ANCHOR.y - (b.bottom + 1) * scale,
          cut.w * scale,
          cut.h * scale,
        ),
        1 / 3,
        1 / 3,
        null,
      );
      c.restore();
      img.delete();
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
