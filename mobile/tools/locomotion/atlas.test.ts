import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LOCO_CELL, LOCO_PIVOT, LOCO_ROWS, locoStride, type LocoWho } from '../../src/game/core/locomotionAtlas';
import { validateAtlases } from './validate';

test('Production Locomotion Atlas: exact grid, clean alpha, no clipping, consistent scale, planted feet', async () => {
  const { report, idle, errors } = await validateAtlases('assets/characters');
  assert.deepEqual(errors, []);
  for (const [name, r] of Object.entries(report) as [string, { planting: { rigResidualPx: number; pixelResidualPx: number; pixelSamples: number } | null; groundContact: { minGap: number } }][]) {
    if (!r.planting) continue;
    assert(r.planting.rigResidualPx < 0.01, `${name}: stance foot must move back exactly with the body`);
    assert(r.planting.pixelSamples > 0 && r.planting.pixelResidualPx <= 1.5, `${name}: baked pixels follow the planted foot`);
    assert(r.groundContact.minGap <= 1, `${name}: a foot touches the ground line`);
  }
  for (const who of ['player', 'guard'] as LocoWho[]) assert(idle[who].maxDeviationPx <= 1.5, `${who}: idle height stable`);
});

test('locomotion-manifest.json matches the runtime stride contract', () => {
  const m = JSON.parse(readFileSync('assets/characters/locomotion-manifest.json', 'utf8'));
  assert.equal(m.cell, LOCO_CELL); assert.deepEqual(m.pivot, LOCO_PIVOT); assert.deepEqual(m.rows, [...LOCO_ROWS]);
  for (const who of ['player', 'guard'] as LocoWho[])
    for (const [state, a] of Object.entries(m.characters[who].atlases) as [string, { strideWorld?: Record<string, number>; width: number; height: number; columns: number }][]) {
      assert.equal(a.width, a.columns * LOCO_CELL); assert.equal(a.height, 4 * LOCO_CELL);
      if (a.strideWorld) for (const dir of LOCO_ROWS) assert(Math.abs(a.strideWorld[dir] - locoStride(who, state as 'walk', dir)) < 1e-3, `${who}/${state}/${dir}`);
    }
});
