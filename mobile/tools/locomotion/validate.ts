/**
 * Programmatic QA for the Production Locomotion Atlas.
 *   node --import tsx tools/locomotion/validate.ts [dir]   → prints JSON report
 * Checks grid/size, real alpha (no baked background), empty/clipped cells,
 * scale (idle height) consistency, ground contact / pivot drift, and foot
 * planting from both the rig soles and the baked pixels.
 */
import * as fs from 'fs';
import * as path from 'path';
import { initSkiaNode } from '../sprites/skiaNode';
import { LOCO_CELL, LOCO_CHARACTERS, LOCO_PIVOT, LOCO_ROWS, locoScale, locoStride, type LocoState, type LocoWho } from '../../src/game/core/locomotionAtlas';

export const ATLASES: [LocoWho, LocoState][] = [['player', 'idle'], ['player', 'sneak'], ['player', 'walk'], ['player', 'run'], ['guard', 'idle'], ['guard', 'walk'], ['guard', 'run']];
type Sole = { x: number; y: number; planted: boolean };

export async function validateAtlases(dir: string) {
  const ck = await initSkiaNode();
  const feet = JSON.parse(fs.readFileSync(path.join(dir, 'locomotion-feet.json'), 'utf8')) as Record<string, Record<string, Sole[][]>>;
  const report: Record<string, unknown> = {};
  const errors: string[] = [];
  const idleHeights: Record<LocoWho, number[]> = { player: [], guard: [] };
  for (const [who, state] of ATLASES) {
    const file = path.join(dir, `${who}_${state}.png`);
    const img = ck.MakeImageFromEncoded(fs.readFileSync(file))!;
    const W = img.width(), H = img.height();
    const n = state === 'idle' ? LOCO_CHARACTERS[who].idle.frames : LOCO_CHARACTERS[who].gaits[state]!.frames;
    if (W !== n * LOCO_CELL || H !== LOCO_ROWS.length * LOCO_CELL) errors.push(`${file}: ${W}×${H}, expected ${n * LOCO_CELL}×${LOCO_ROWS.length * LOCO_CELL}`);
    const px = img.readPixels(0, 0, { width: W, height: H, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB }) as Uint8Array;
    const A = (x: number, y: number) => px[(y * W + x) * 4 + 3];
    let semi = 0, opaqueTotal = 0, cornerAlpha = 0;
    const cells: { row: string; frame: number; top: number; bottom: number; left: number; right: number; groundGap: number }[] = [];
    const heights: number[] = [], widths: number[] = [], bottoms: number[] = [], centres: number[] = [];
    let plantResidualRig = 0, plantResidualPx = 0, pxSamples = 0;
    LOCO_ROWS.forEach((row, r) => {
      for (let k = 0; k < n; k++) {
        let top = LOCO_CELL, bottom = -1, left = LOCO_CELL, right = -1, sumX = 0, cnt = 0;
        for (let y = 0; y < LOCO_CELL; y++) for (let x = 0; x < LOCO_CELL; x++) {
          const a = A(k * LOCO_CELL + x, r * LOCO_CELL + y);
          if (a > 0 && a < 255) semi++;
          if (a > 24) { opaqueTotal++; top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x); sumX += x; cnt++; }
          if ((x < 1 || y < 1 || x > LOCO_CELL - 2 || y > LOCO_CELL - 2) && a > 0) cornerAlpha++;
        }
        if (cnt === 0) { errors.push(`${who}_${state} ${row}#${k + 1}: empty frame`); continue; }
        if (top < 1 || left < 1 || right > LOCO_CELL - 2 || bottom > LOCO_CELL - 2) errors.push(`${who}_${state} ${row}#${k + 1}: touches cell edge (clipping)`);
        cells.push({ row, frame: k + 1, top, bottom, left, right, groundGap: LOCO_PIVOT.y - bottom });
        heights.push(LOCO_PIVOT.y - top); widths.push(right - left); bottoms.push(bottom); centres.push(sumX / cnt);
        if (state === 'idle') idleHeights[who].push(LOCO_PIVOT.y + 0.5 - top);
      }
      // Foot planting: consecutive frames where the same foot stays planted must move it
      // back by exactly the body's travel per frame (rig), confirmed on the pixels.
      if (state !== 'idle') {
        const soles = feet[`${who}_${state}`][row];
        const side = row === 'left' || row === 'right';
        const perFrame = locoStride(who, state, row) / locoScale(who) / n;
        const fwd = row === 'right' ? 1 : row === 'left' ? -1 : row === 'down' ? 1 : -1;
        for (let k = 0; k < n; k++) for (const f of [0, 1]) {
          const a = soles[k][f], b = soles[(k + 1) % n][f];
          if (!a.planted || !b.planted) continue;
          const moved = side ? (b.x - a.x) * fwd : (b.y - a.y) * fwd;
          plantResidualRig = Math.max(plantResidualRig, Math.abs(moved + perFrame));
        }
        if (side) for (let k = 0; k < n; k++) for (const f of [0, 1]) {
          const s = soles[k][f];
          if (!s.planted) continue;
          // pixel evidence: opaque shoe pixels at the sole line, centred on the rig sole
          const y = Math.round(s.y) - 1; let sx = 0, c = 0;
          for (let x = Math.round(s.x) - 4 * fwd - 3; x <= Math.round(s.x) - 4 * fwd + 3; x++) {
            if (x < 0 || x >= LOCO_CELL) continue;
            if (A(k * LOCO_CELL + x, r * LOCO_CELL + y) > 128) { sx += x; c++; }
          }
          if (c === 0) { errors.push(`${who}_${state} ${row}#${k + 1}: planted sole has no pixels`); continue; }
          const centre = sx / c; // shoe span centre; compare motion of the same foot across frames
          const nxt = soles[(k + 1) % n][f];
          if (nxt.planted) {
            const y2 = Math.round(nxt.y) - 1; let sx2 = 0, c2 = 0;
            for (let x = Math.round(nxt.x) - 4 * fwd - 3; x <= Math.round(nxt.x) - 4 * fwd + 3; x++) if (x >= 0 && x < LOCO_CELL && A(((k + 1) % n) * LOCO_CELL + x, r * LOCO_CELL + y2) > 128) { sx2 += x; c2++; }
            if (c2) { plantResidualPx = Math.max(plantResidualPx, Math.abs((sx2 / c2 - centre) * fwd + perFrame)); pxSamples++; }
          }
        }
      }
    });
    const range = (v: number[]) => Math.max(...v) - Math.min(...v);
    const cornerOk = cornerAlpha === 0;
    if (!cornerOk) errors.push(`${who}_${state}: alpha on cell border (${cornerAlpha} px)`);
    const minGround = Math.min(...cells.map(c => Math.abs(c.groundGap)));
    report[`${who}_${state}`] = {
      size: `${W}×${H}`, grid: `${n}×${LOCO_ROWS.length}`, cell: `${LOCO_CELL}×${LOCO_CELL}`,
      heightRangePx: range(heights), widthRangePx: range(widths),
      groundContact: { bottomRange: range(bottoms), maxGapAbovePivot: Math.max(...cells.map(c => c.groundGap)), minGap: minGround },
      centreXDriftPx: +range(centres).toFixed(2),
      semiTransparentEdgePx: semi, opaquePx: opaqueTotal,
      planting: state === 'idle' ? null : { rigResidualPx: +plantResidualRig.toFixed(4), pixelResidualPx: +plantResidualPx.toFixed(2), pixelSamples: pxSamples },
    };
  }
  const idle = Object.fromEntries((['player', 'guard'] as LocoWho[]).map(w => {
    const h = idleHeights[w], mean = h.reduce((a, b) => a + b, 0) / h.length;
    return [w, { meanHeightPx: +mean.toFixed(2), spec: LOCO_CHARACTERS[w].heightPx, maxDeviationPx: +Math.max(...h.map(v => Math.abs(v - mean))).toFixed(2) }];
  }));
  return { report, idle, errors };
}

if (process.argv[1]?.endsWith('validate.ts')) {
  void validateAtlases(process.argv[2] ?? 'assets/characters').then(r => console.log(JSON.stringify(r, null, 1)));
}
