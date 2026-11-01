import type {SkCanvas} from '@shopify/react-native-skia';
import {Cell,TILE} from '../../game/world/compileStage';
import type {CompiledStage} from '../../game/world/compileStage';
import {MATERIALS} from '../../game/levels/chapterArt';
import {fill,stroke} from '../paints';
import {fillRect} from '../skiaScratch';
import {hasVenueFinish} from './venueFloorFinish';
import {linear} from './stagePaints';

/** Ambient occlusion, contact shadows and the exit pad — independent of the art source. */
export function drawFloorShading(c: SkCanvas, stage: CompiledStage): void {
  const { cols, rows, grid } = stage;
  const at = (cc: number, rr: number) =>
    cc < 0 || rr < 0 || cc >= cols || rr >= rows ? Cell.Void : grid[rr * cols + cc];
  // Keep the approved Lab joint; selected venues receive the same short architectural contact treatment.
  // These are the existing wall contacts, never new shadows below furniture.
  const lab = stage.def.theme === 'lab',finished=hasVenueFinish(stage.def.theme);
  const baseboard = lab||finished ? fill(MATERIALS[stage.def.theme].seam,lab?.9:.75) : null;

  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      if (at(cc, r) !== Cell.Floor) continue;
      const x = cc * TILE;
      const y = r * TILE;
      if (at(cc, r - 1) === Cell.Wall) {
        if (baseboard) {
          fillRect(c, x, y, TILE, 2, baseboard);
          fillRect(c, x, y + 2, TILE, 10, linear(0, y + 2, 0, y + 12, ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']));
        } else fillRect(c, x, y, TILE, 18, linear(0, y, 0, y + 18, ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']));
      }
      if (at(cc - 1, r) === Cell.Wall) {
        if (baseboard) {
          fillRect(c, x, y, 2, TILE, baseboard);
          fillRect(c, x + 2, y, 8, TILE, linear(x + 2, 0, x + 10, 0, ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']));
        } else fillRect(c, x, y, 12, TILE, linear(x, 0, x + 12, 0, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']));
      }
      if (at(cc + 1, r) === Cell.Wall) {
        const x1 = x + TILE;
        if (baseboard) {
          fillRect(c, x1 - 2, y, 2, TILE, baseboard);
          fillRect(c, x1 - 10, y, 8, TILE, linear(x1 - 2, 0, x1 - 10, 0, ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']));
        } else fillRect(c, x1 - 12, y, 12, TILE, linear(x1, 0, x1 - 12, 0, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']));
      }
    }
  }

  // No shadow is drawn under structures (2026-10-06): the dark patch read as a stain on the floor and made the
  // painted pieces look as if they hovered. Characters keep theirs.

  if (!stage.def.exit) return;
  const ex = stage.exit;
  fillRect(c, ex.x + 2, ex.y, ex.w - 4, ex.h, fill('#111820', 0.9));
  fillRect(
    c,
    ex.x + 2,
    ex.y,
    ex.w - 4,
    ex.h,
    linear(0, ex.y, 0, ex.y + ex.h, ['rgba(140,155,175,0.04)', 'rgba(140,155,175,0.2)']),
  );
  for (let i = 1; i < 4; i++) {
    const yy = ex.y + (ex.h * i) / 4;
    c.drawLine(ex.x + 4, yy, ex.x + ex.w - 4, yy, stroke('#52606f', 1, 0.5));
  }
}
