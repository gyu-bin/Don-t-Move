/**
 * Generates guide templates for external sprite production.
 *   npm run sprites:templates
 *
 * Output (art/characters/templates/): one <sheet>_guide.png per sprite sheet,
 * same pixel size and grid as the final sheet, so it can be used directly as
 * an underlay layer. Each 256×256 cell shows:
 *   red cross      feet anchor (must be the ground point between the feet)
 *   blue line      ground line
 *   yellow line    target head/cap height for that character (idle)
 *   grey box       safe area (nothing opaque outside it)
 *   green ● L/R    planted-foot contact target (foot planting): the grounded
 *                  foot must be here; it moves BACKWARD frame to frame
 *   faint figure   FALLBACK rig body mechanics for that frame (motion/timing
 *                  reference — NOT the look; see SPEC "Design sources")
 *   labels         row direction, frame number, beat
 * The guide is never shipped; finals go to assets/characters/ without labels.
 */
import * as fs from 'fs';
import * as path from 'path';

import { initSkiaNode, loadLabelFont } from './skiaNode';
import {
  ANCHOR,
  CELL,
  CHARACTERS,
  EDGE_MARGIN,
  FRONT_BACK_FORESHORTEN,
  ICON_CELL,
  ICONS,
  ROWS,
  SHEETS,
  plantedFeet,
} from './spriteSpec';
import { FACING, RIG_SOLE_OFFSET, guideReachScale, poseFor, rigScale } from './rigGuide';

const OUT = path.resolve(__dirname, '../../art/characters/templates');

async function main() {
  const ck = await initSkiaNode();
  // Game rig (fallback) as pose guide. Imported after CanvasKit is ready.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Skia } = require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia');
  const { createCharacterArt, drawCharacter } =
    await import('../../src/rendering/fallback/proceduralCharacter');
  const { GUARD_PALETTE, PLAYER_PALETTE } = await import('../../src/rendering/fallback/characterPalettes');
  const arts = {
    player: createCharacterArt(PLAYER_PALETTE, false),
    guard: createCharacterArt(GUARD_PALETTE, true),
  };

  const font = loadLabelFont(ck, 12);
  const small = loadLabelFont(ck, 10);
  fs.mkdirSync(OUT, { recursive: true });

  const paint = (hex: string, alpha = 1, strokeW = 0) => {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(hex));
    p.setAlphaf(alpha);
    if (strokeW > 0) {
      p.setStyle(1);
      p.setStrokeWidth(strokeW);
    }
    return p;
  };
  const cellA = paint('#1b1f27');
  const cellB = paint('#20252e');
  const border = paint('#3a4150', 1, 1);
  const safe = paint('#565f70', 0.7, 1);
  const ground = paint('#4fb3ff', 0.9, 1.5);
  const anchor = paint('#ff5a5a', 1, 2);
  const heightLine = paint('#ffd84a', 0.9, 1.5);
  const heightBand = paint('#ffd84a', 0.12);
  const shoulder = paint('#9ad17a', 0.8, 1.5);
  const planted = paint('#3cf08c', 0.9, 2);
  const plantedLine = paint('#3cf08c', 0.9, 2);
  const ghost = Skia.Paint();
  ghost.setAlphaf(0.42);

  // CanvasKit text drawing (labels are template-only).
  const ckText = (canvas: any, s: string, x: number, y: number, f: any, color: string) => {
    if (!f) return;
    const p = new ck.Paint();
    p.setColor(ck.parseColorString(color));
    p.setAntiAlias(true);
    canvas.drawText(s, x, y, p, f);
    p.delete();
  };

  const plantedLabels: { x: number; y: number; s: string }[] = [];
  for (const sheet of SHEETS) {
    const ch = CHARACTERS[sheet.character];
    const W = sheet.frames * CELL;
    const H = ROWS.length * CELL;
    const surface = ck.MakeSurface(W, H)!;
    const ckCanvas = surface.getCanvas();
    ckCanvas.clear(ck.TRANSPARENT);
    // Wrap the CanvasKit canvas with the RN-Skia API used by the rig.
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(0, 0, W, H));
    const scale = rigScale(sheet);
    const reachScale = guideReachScale(sheet);
    const top = ANCHOR.y - ch.height;

    ROWS.forEach((row, r) => {
      for (let i = 0; i < sheet.frames; i++) {
        const x0 = i * CELL;
        const y0 = r * CELL;
        c.drawRect(Skia.XYWHRect(x0, y0, CELL, CELL), (i + r) % 2 ? cellA : cellB);
        c.drawRect(Skia.XYWHRect(x0 + 0.5, y0 + 0.5, CELL - 1, CELL - 1), border);
        c.drawRect(
          Skia.XYWHRect(x0 + EDGE_MARGIN, y0 + EDGE_MARGIN, CELL - EDGE_MARGIN * 2, CELL - EDGE_MARGIN * 2),
          safe,
        );
        // Height band + lines.
        c.drawRect(
          Skia.XYWHRect(x0 + 40, y0 + top - ch.heightTolerance, CELL - 80, ch.heightTolerance * 2),
          heightBand,
        );
        c.drawLine(x0 + 40, y0 + top, x0 + CELL - 40, y0 + top, heightLine);
        c.drawLine(x0 + 8, y0 + ANCHOR.y, x0 + CELL - 8, y0 + ANCHOR.y, ground);
        if (row === 'down' || row === 'up') {
          const sx = ch.shoulderWidth / 2;
          const sy = y0 + top + ch.height * 0.36;
          c.drawLine(x0 + ANCHOR.x - sx, sy - 6, x0 + ANCHOR.x - sx, sy + 6, shoulder);
          c.drawLine(x0 + ANCHOR.x + sx, sy - 6, x0 + ANCHOR.x + sx, sy + 6, shoulder);
        }
        // Pose guide (faint).
        const pose = poseFor(sheet, i);
        c.saveLayer(ghost);
        c.save();
        c.translate(x0 + ANCHOR.x, y0 + ANCHOR.y - RIG_SOLE_OFFSET * scale);
        c.scale(scale, scale);
        drawCharacter(
          c,
          arts[sheet.character],
          0,
          0,
          FACING[row],
          pose.gait,
          pose.phase,
          pose.t,
          pose.action,
          pose.actionT,
          reachScale,
        );
        c.restore();
        c.restore();
        // Anchor cross on top.
        c.drawLine(x0 + ANCHOR.x - 9, y0 + ANCHOR.y, x0 + ANCHOR.x + 9, y0 + ANCHOR.y, anchor);
        c.drawLine(x0 + ANCHOR.x, y0 + ANCHOR.y - 9, x0 + ANCHOR.x, y0 + ANCHOR.y + 9, anchor);
        // Planted-foot targets (foot planting contract): where each grounded
        // foot's contact must be in this frame. They move BACKWARD frame to frame.
        for (const pf of plantedFeet(sheet, i)) {
          let px = x0 + ANCHOR.x;
          let py = y0 + ANCHOR.y;
          if (row === 'right') px += pf.forwardPx;
          else if (row === 'left') px -= pf.forwardPx;
          else {
            const toCam = row === 'down' ? 1 : -1;
            py += toCam * pf.forwardPx * FRONT_BACK_FORESHORTEN;
            // character's left foot is on screen-right when facing the camera
            const lateral = (pf.foot === 'L' ? 1 : -1) * (row === 'down' ? 1 : -1) * 12;
            px += lateral;
          }
          c.drawCircle(px, py, 5, planted);
          c.drawLine(px - 7, py, px + 7, py, plantedLine);
          plantedLabels.push({ x: px - 3, y: py + 16, s: pf.foot });
        }
      }
    });
    const pic = rec.finishRecordingAsPicture();
    const labels = plantedLabels.splice(0);
    // RN-Skia web picture → CanvasKit picture.
    ckCanvas.drawPicture((pic as any).ref);

    ROWS.forEach((row, r) => {
      for (let i = 0; i < sheet.frames; i++) {
        const x0 = i * CELL;
        const y0 = r * CELL;
        ckText(
          ckCanvas,
          `${row.toUpperCase()}  ${String(i + 1).padStart(2, '0')}/${sheet.frames}`,
          x0 + 10,
          y0 + 20,
          font,
          '#e8ecf2',
        );
        ckText(ckCanvas, sheet.beats[i] ?? '', x0 + 10, y0 + CELL - 6, small, '#aab3c2');
      }
    });
    for (const l of labels) ckText(ckCanvas, l.s, l.x, l.y, small, '#3cf08c');
    surface.flush();
    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes()!;
    const out = path.join(OUT, sheet.file.replace('.png', '_guide.png'));
    fs.writeFileSync(out, bytes);
    console.log(`  ${path.basename(out)}  ${W}×${H}  (${sheet.frames} frames × ${ROWS.length} rows)`);
    img.delete();
    surface.delete();
  }

  // Indicator icon guide.
  {
    const W = ICONS.length * ICON_CELL;
    const surface = ck.MakeSurface(W, ICON_CELL)!;
    const cv = surface.getCanvas();
    cv.clear(ck.TRANSPARENT);
    const p = new ck.Paint();
    p.setAntiAlias(true);
    ICONS.forEach((icon, i) => {
      const x0 = i * ICON_CELL;
      p.setStyle(ck.PaintStyle.Fill);
      p.setColor(ck.parseColorString(i % 2 ? '#1b1f27' : '#20252e'));
      cv.drawRect(ck.XYWHRect(x0, 0, ICON_CELL, ICON_CELL), p);
      p.setStyle(ck.PaintStyle.Stroke);
      p.setStrokeWidth(1);
      p.setColor(ck.parseColorString('#565f70'));
      cv.drawRect(ck.XYWHRect(x0 + 16, 16, ICON_CELL - 32, ICON_CELL - 32), p);
      p.setColor(ck.parseColorString('#ff5a5a'));
      cv.drawLine(x0 + 56, 64, x0 + 72, 64, p);
      cv.drawLine(x0 + 64, 56, x0 + 64, 72, p);
      ckText(cv, `${icon.glyph}  ${icon.hue}`, x0 + 8, 14, small, '#e8ecf2');
      ckText(cv, 'glyph inside box, centred', x0 + 8, ICON_CELL - 4, small, '#aab3c2');
    });
    p.delete();
    surface.flush();
    const img = surface.makeImageSnapshot();
    fs.writeFileSync(path.join(OUT, 'ui_indicators_guide.png'), img.encodeToBytes()!);
    console.log(`  ui_indicators_guide.png  ${W}×${ICON_CELL}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
