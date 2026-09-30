// DEPRECATED (V1 procedural look). Kept as a motion/debug reference only; runtime uses the V2 cutout atlases (tools/locomotion/v2).
/**
 * Bakes the Production Locomotion Atlas from the cutout rig.
 *   node --import tsx tools/locomotion/bake.ts [outDir]
 * Default outDir: assets/characters. Also writes locomotion-manifest.json and
 * <outDir>/../locomotion-feet.json (per-frame projected sole points, for QA).
 */
import * as fs from 'fs';
import * as path from 'path';
import type { CanvasKit, Image as CKImage } from 'canvaskit-wasm';
import { initSkiaNode } from '../../sprites/skiaNode';
import { LOCO_CELL, LOCO_CHARACTERS, LOCO_PIVOT, LOCO_ROWS, locoScale, locoStride, type LocoDir, type LocoState, type LocoWho } from '../../../src/game/core/locomotionAtlas';
import { idlePose, locomotionPose, project, type Pose } from './rig';
import { drawCharacter, Painter } from './draw';

const SS = 4;
export const ATLAS_STATES: Record<LocoWho, LocoState[]> = { player: ['idle', 'sneak', 'walk', 'run'], guard: ['idle', 'walk', 'run'] };

export function framesFor(who: LocoWho, state: LocoState) {
  return state === 'idle' ? LOCO_CHARACTERS[who].idle.frames : LOCO_CHARACTERS[who].gaits[state]!.frames;
}
export function poseFor(who: LocoWho, state: LocoState, k: number): Pose {
  const n = framesFor(who, state);
  // Locomotion frames sample the middle of their playback window (floor(phase·n)).
  return state === 'idle' ? idlePose(who, k / n) : locomotionPose(who, state, (k + 0.5) / n);
}

export function renderFrame(ck: CanvasKit, who: LocoWho, state: LocoState, k: number, dir: LocoDir): CKImage {
  const big = LOCO_CELL * SS;
  const s1 = ck.MakeSurface(big, big)!; const c1 = s1.getCanvas(); c1.clear(ck.TRANSPARENT); c1.scale(SS, SS);
  drawCharacter(new Painter(ck, c1), who, poseFor(who, state, k), dir);
  const flat = s1.makeImageSnapshot();
  const s2 = ck.MakeSurface(big, big)!; const c2 = s2.getCanvas(); c2.clear(ck.TRANSPARENT);
  c2.drawImage(flat, 0, 0);
  const full = ck.XYWHRect(0, 0, big, big);
  // Soft neutral top light → gentle floor-side shade (inside the silhouette only).
  const top = (LOCO_PIVOT.y - LOCO_CHARACTERS[who].heightPx) * SS, bottom = LOCO_PIVOT.y * SS;
  const light = new ck.Paint(); light.setBlendMode(ck.BlendMode.SrcATop);
  light.setShader(ck.Shader.MakeLinearGradient([0, top], [0, bottom],
    [ck.Color4f(1, 1, 1, 0.07), ck.Color4f(1, 1, 1, 0), ck.Color4f(0, 0, 0, 0.16)], [0, 0.45, 1], ck.TileMode.Clamp));
  c2.drawRect(full, light);
  // Subtle cyan rim on the upper-right silhouette edge.
  const rimLayer = new ck.Paint(); rimLayer.setBlendMode(ck.BlendMode.SrcATop); rimLayer.setAlphaf(0.42);
  c2.saveLayer(rimLayer);
  const tint = new ck.Paint(); tint.setColorFilter(ck.ColorFilter.MakeBlend(ck.Color4f(0.36, 0.83, 1, 1), ck.BlendMode.SrcIn));
  c2.drawImage(flat, 0, 0, tint);
  const cut = new ck.Paint(); cut.setBlendMode(ck.BlendMode.DstOut);
  c2.drawImage(flat, -1.15 * SS, 1.0 * SS, cut);
  c2.restore();
  const lit = s2.makeImageSnapshot().makeCopyWithDefaultMipmaps();
  const s3 = ck.MakeSurface(LOCO_CELL, LOCO_CELL)!; const c3 = s3.getCanvas(); c3.clear(ck.TRANSPARENT);
  c3.drawImageRectOptions(lit, full, ck.XYWHRect(0, 0, LOCO_CELL, LOCO_CELL), ck.FilterMode.Linear, ck.MipmapMode.Linear, null);
  const out = s3.makeImageSnapshot();
  s1.delete(); s2.delete();
  return out;
}

async function main() {
  const outDir = process.argv[2] ?? 'assets/characters';
  fs.mkdirSync(outDir, { recursive: true });
  const ck = await initSkiaNode();
  const manifest: Record<string, unknown> = {
    version: 1, generator: 'tools/locomotion/bake.ts (2D cutout rig)', cell: LOCO_CELL, pivot: LOCO_PIVOT, rows: LOCO_ROWS,
    characters: {} as Record<string, unknown>,
  };
  const feet: Record<string, unknown> = {};
  for (const who of ['player', 'guard'] as LocoWho[]) {
    const C = LOCO_CHARACTERS[who];
    const chars: Record<string, unknown> = { heightPx: C.heightPx, worldHeight: C.worldHeight, scale: locoScale(who), depth: C.depth, atlases: {} };
    for (const state of ATLAS_STATES[who]) {
      const n = framesFor(who, state), W = n * LOCO_CELL, H = LOCO_ROWS.length * LOCO_CELL;
      const surf = ck.MakeSurface(W, H)!; const c = surf.getCanvas(); c.clear(ck.TRANSPARENT);
      const soles: Record<string, unknown[]> = {};
      LOCO_ROWS.forEach((dir, row) => {
        soles[dir] = [];
        for (let k = 0; k < n; k++) {
          const img = renderFrame(ck, who, state, k, dir);
          c.drawImage(img, k * LOCO_CELL, row * LOCO_CELL);
          img.delete();
          const pose = poseFor(who, state, k);
          soles[dir].push(pose.legs.map(l => { const q = project(l.sole, dir, C.depth); return { x: +q.x.toFixed(3), y: +q.y.toFixed(3), planted: l.planted }; }));
        }
      });
      const file = `${who}_${state}.png`;
      fs.writeFileSync(path.join(outDir, file), surf.makeImageSnapshot().encodeToBytes()!);
      surf.delete();
      const entry: Record<string, unknown> = { file, width: W, height: H, columns: n, rows: LOCO_ROWS.length };
      if (state === 'idle') { entry.mode = 'time'; entry.fps = C.idle.fps; }
      else {
        const g = C.gaits[state]!;
        entry.mode = 'distance'; entry.stance = g.stance; entry.reachPx = g.reach;
        entry.strideWorld = Object.fromEntries(LOCO_ROWS.map(d => [d, +locoStride(who, state, d).toFixed(4)]));
      }
      (chars.atlases as Record<string, unknown>)[state] = entry;
      feet[`${who}_${state}`] = soles;
      console.log(`${file}: ${W}×${H}`);
    }
    (manifest.characters as Record<string, unknown>)[who] = chars;
  }
  fs.writeFileSync(path.join(outDir, 'locomotion-manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  fs.writeFileSync(path.join(outDir, 'locomotion-feet.json'), JSON.stringify(feet) + '\n');
}
if (process.argv[1]?.endsWith('bake.ts')) void main();
