/**
 * Proves the sprite validator catches real delivery mistakes.
 *   npm run sprites:selftest
 *
 * 1. Bakes a contract-correct fixture set (fallback rig, placeholder icons)
 *    into a temp dir and expects 0 errors.
 * 2. Corrupts copies in specific ways and expects each to be reported.
 * Fixtures are temporary test data, never game assets.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CanvasKit, Image } from 'canvaskit-wasm';

import { FACING, RIG_SOLE_OFFSET, guideReachScale, poseFor, rigScale } from './rigGuide';
import { initSkiaNode, loadLabelFont } from './skiaNode';
import { ANCHOR, CELL, CHARACTERS, ICON_CELL, ICONS, ROWS, SHEETS } from './spriteSpec';
import { validate } from './validateSprites';

async function bakeFixtures(ck: CanvasKit, chars: string, ui: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Skia } = require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia');
  const { createCharacterArt, drawCharacter } =
    await import('../../src/rendering/fallback/proceduralCharacter');
  const { GUARD_PALETTE, PLAYER_PALETTE } = await import('../../src/rendering/fallback/characterPalettes');
  const arts = {
    player: createCharacterArt(PLAYER_PALETTE, false),
    guard: createCharacterArt(GUARD_PALETTE, true),
  };
  // Contract: no baked ground shadow, soles exactly on the ground line.
  arts.player.shadow.setAlphaf(0);
  arts.guard.shadow.setAlphaf(0);
  for (const sheet of SHEETS) {
    const W = sheet.frames * CELL;
    const H = ROWS.length * CELL;
    const surface = ck.MakeSurface(W, H)!;
    const cv = surface.getCanvas();
    cv.clear(ck.TRANSPARENT);
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(0, 0, W, H));
    const scale = rigScale(sheet);
    const reachScale = guideReachScale(sheet);
    ROWS.forEach((row, r) => {
      for (let i = 0; i < sheet.frames; i++) {
        const p = poseFor(sheet, i);
        c.save();
        c.translate(i * CELL + ANCHOR.x, r * CELL + ANCHOR.y - RIG_SOLE_OFFSET * scale);
        c.scale(scale, scale);
        drawCharacter(
          c,
          arts[sheet.character],
          0,
          0,
          FACING[row],
          p.gait,
          p.phase,
          p.t,
          p.action,
          p.actionT,
          reachScale,
        );
        c.restore();
      }
    });
    cv.drawPicture((rec.finishRecordingAsPicture() as unknown as { ref: never }).ref);
    surface.flush();
    fs.writeFileSync(path.join(chars, sheet.file), surface.makeImageSnapshot().encodeToBytes()!);
    surface.delete();
  }
  const font = loadLabelFont(ck, 96);
  for (const icon of ICONS) {
    const surface = ck.MakeSurface(ICON_CELL, ICON_CELL)!;
    const cv = surface.getCanvas();
    cv.clear(ck.TRANSPARENT);
    const p = new ck.Paint();
    p.setAntiAlias(true);
    if (font) {
      const w = font.getGlyphWidths(font.getGlyphIDs(icon.glyph))[0];
      const x = (ICON_CELL - w) / 2;
      const y = 98;
      p.setStyle(ck.PaintStyle.Stroke);
      p.setStrokeWidth(10);
      p.setColor(ck.parseColorString('#0a0b0e'));
      cv.drawText(icon.glyph, x, y, p, font);
      p.setStyle(ck.PaintStyle.Fill);
      p.setColor(ck.parseColorString(icon.hue === 'yellow' ? '#f5c236' : '#ff3b30'));
      cv.drawText(icon.glyph, x, y, p, font);
    }
    p.delete();
    surface.flush();
    fs.writeFileSync(path.join(ui, icon.file), surface.makeImageSnapshot().encodeToBytes()!);
    surface.delete();
  }
}

/** Re-encodes `file` after drawing it through `edit`. */
function mutate(ck: CanvasKit, file: string, w: number, h: number, edit: (c: any, img: Image) => void) {
  const img = ck.MakeImageFromEncoded(fs.readFileSync(file))!;
  const surface = ck.MakeSurface(w, h)!;
  const c = surface.getCanvas();
  c.clear(ck.TRANSPARENT);
  edit(c, img);
  surface.flush();
  fs.writeFileSync(file, surface.makeImageSnapshot().encodeToBytes()!);
  surface.delete();
}

function copyDir(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f));
}

async function main() {
  const ck = await initSkiaNode();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dm-sprites-'));
  const good = { chars: path.join(root, 'good/chars'), ui: path.join(root, 'good/ui') };
  fs.mkdirSync(good.chars, { recursive: true });
  fs.mkdirSync(good.ui, { recursive: true });
  await bakeFixtures(ck, good.chars, good.ui);

  let failed = 0;
  const expect = (name: string, ok: boolean, detail: string) => {
    console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n      ${detail}`}`);
    if (!ok) failed++;
  };

  const base = await validate(good.chars, good.ui, path.join(root, 'good/preview'));
  expect(
    'contract-correct fixture set passes with 0 errors',
    base.errors === 0,
    base.findings
      .filter((f) => f.level === 'ERROR')
      .map((f) => `${f.where}: ${f.msg}`)
      .join('\n      '),
  );

  const cases: { name: string; apply: (chars: string, ui: string) => void; expect: RegExp }[] = [
    {
      name: 'opaque background is rejected',
      apply: (chars) =>
        mutate(ck, path.join(chars, 'player_walk.png'), 8 * CELL, 4 * CELL, (c, img) => {
          c.clear(ck.parseColorString('#000000'));
          c.drawImage(img, 0, 0, null);
        }),
      expect: /player_walk\.png .*background not transparent/,
    },
    {
      name: 'one floating frame (feet off the ground line) is rejected',
      apply: (chars) =>
        mutate(ck, path.join(chars, 'guard_walk.png'), 8 * CELL, 4 * CELL, (c, img) => {
          c.drawImage(img, 0, 0, null);
          const p = new ck.Paint();
          p.setBlendMode(ck.BlendMode.Clear);
          c.drawRect(ck.XYWHRect(2 * CELL, 0, CELL, CELL), p);
          c.drawImageRect(
            img,
            ck.XYWHRect(2 * CELL, 40, CELL, CELL - 40),
            ck.XYWHRect(2 * CELL, 0, CELL, CELL - 40),
            null,
          );
          p.delete();
        }),
      expect: /guard_walk\.png down #3: feet \d+px above ground line/,
    },
    {
      name: 'walking in place (grounded foot not travelling back) is rejected',
      apply: (chars) => {
        // Every frame of the Right row replaced by frame 3: legs still, feet never travel.
        mutate(ck, path.join(chars, 'player_walk.png'), 8 * CELL, 4 * CELL, (c, img) => {
          c.drawImage(img, 0, 0, null);
          const p = new ck.Paint();
          p.setBlendMode(ck.BlendMode.Src);
          for (let i = 0; i < 8; i++) {
            c.drawImageRect(
              img,
              ck.XYWHRect(2 * CELL, 3 * CELL, CELL, CELL),
              ck.XYWHRect(i * CELL, 3 * CELL, CELL, CELL),
              p,
            );
          }
          p.delete();
        });
      },
      expect: /player_walk\.png right: foot planting/,
    },
    {
      name: 'frozen idle (identical frames) is rejected',
      apply: (chars) =>
        mutate(ck, path.join(chars, 'player_idle.png'), 4 * CELL, 4 * CELL, (c, img) => {
          const p = new ck.Paint();
          for (let r = 0; r < 4; r++) {
            for (let i = 0; i < 4; i++) {
              c.drawImageRect(
                img,
                ck.XYWHRect(0, r * CELL, CELL, CELL),
                ck.XYWHRect(i * CELL, r * CELL, CELL, CELL),
                p,
              );
            }
          }
          p.delete();
        }),
      expect: /player_idle\.png down: idle is frozen/,
    },
    {
      name: 'wrong sheet size is rejected',
      apply: (chars) =>
        mutate(ck, path.join(chars, 'player_idle.png'), 4 * CELL - 24, 4 * CELL, (c, img) =>
          c.drawImage(img, 0, 0, null),
        ),
      expect: /player_idle\.png: size 1000×1024/,
    },
    {
      name: 'scale jump inside a row is rejected',
      apply: (chars) =>
        mutate(ck, path.join(chars, 'player_sneak.png'), 6 * CELL, 4 * CELL, (c, img) => {
          c.drawImage(img, 0, 0, null);
          const p = new ck.Paint();
          p.setBlendMode(ck.BlendMode.Clear);
          const x = 3 * CELL;
          const y = 2 * CELL;
          c.drawRect(ck.XYWHRect(x, y, CELL, CELL), p);
          // Same frame at 1.25× scale, feet kept on the ground line, head not cropped.
          const s = 1.25;
          const h = 216;
          c.drawImageRect(
            img,
            ck.XYWHRect(x + ANCHOR.x - 100 / s, y + ANCHOR.y - h / s, 200 / s, h / s + 4),
            ck.XYWHRect(x + ANCHOR.x - 100, y + ANCHOR.y - h, 200, h + 4 * s),
            null,
          );
          p.delete();
        }),
      expect: /player_sneak\.png left: silhouette height varies/,
    },
    {
      name: 'recoloured outfit is flagged',
      apply: (chars) =>
        mutate(ck, path.join(chars, 'guard_run.png'), 8 * CELL, 4 * CELL, (c, img) => {
          c.drawImage(img, 0, 0, null);
          const p = new ck.Paint();
          p.setColor(ck.parseColorString('#c0392b'));
          p.setBlendMode(ck.BlendMode.SrcATop);
          c.drawRect(ck.XYWHRect(CELL, 3 * CELL, CELL, CELL), p);
          p.delete();
        }),
      expect: /guard_run\.png right #2: palette differs/,
    },
    {
      name: '"?" in the wrong colour is rejected',
      apply: (_c, ui) =>
        mutate(ck, path.join(ui, 'indicator_question.png'), ICON_CELL, ICON_CELL, (c, img) => {
          c.drawImage(img, 0, 0, null);
          const p = new ck.Paint();
          p.setColor(ck.parseColorString('#ff3b30'));
          p.setBlendMode(ck.BlendMode.Color);
          c.drawRect(ck.XYWHRect(0, 0, ICON_CELL, ICON_CELL), p);
          p.delete();
        }),
      expect: /indicator_question\.png: main colour hue/,
    },
  ];

  for (const tc of cases) {
    const dir = path.join(root, tc.name.replace(/\W+/g, '_'));
    const chars = path.join(dir, 'chars');
    const ui = path.join(dir, 'ui');
    copyDir(good.chars, chars);
    copyDir(good.ui, ui);
    tc.apply(chars, ui);
    const r = await validate(chars, ui, null);
    const lines = r.findings.map((f) => `${f.level} ${f.where}: ${f.msg}`);
    expect(
      tc.name,
      lines.some((l) => tc.expect.test(l)),
      `no finding matched ${tc.expect}; got:\n      ${lines.join('\n      ')}`,
    );
  }

  console.log(`\nfixtures: ${root}`);
  console.log(failed ? `${failed} self-test(s) FAILED` : 'validator self-test passed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
