import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contractTables } from './syncContract';
import { advancePlayerSpritePhase, GAIT_SPEED, PLAYER_SPRITE_GEOMETRY, PLAYER_SPRITE_SCALE, PLAYER_SPRITE_STRIDE } from '../../src/game/core/locomotion';
import { CELL, plantingFor, SHEETS } from './spriteSpec';
import { syntheticTracks } from './footTrackFixture';
import { validateRightFootTracks } from './footTracks';

const spec = SHEETS.find(s => s.file === 'player_walk.png')!;
test('generated SPEC stays synchronized with the runtime contract',()=>{
  const doc=fs.readFileSync(new URL('../../art/characters/SPEC.md',import.meta.url),'utf8');
  assert(doc.includes(contractTables()),'run npm run sprites:contract');
});
function fixture() {
  const frames = syntheticTracks(spec);
  const px = { w: CELL * spec.frames, h: CELL, data: new Uint8Array(CELL * spec.frames * CELL * 4) };
  frames.forEach((f, i) => {
    for (const p of [f.hip, ...['L','R'].flatMap(id => {
      const foot = f[id as 'L'|'R']; return [foot.sole, foot.ankle, foot.knee];
    })]) px.data[(Math.round(p[1]) * px.w + i * CELL + Math.round(p[0])) * 4 + 3] = 255;
  });
  return { px, frames };
}
test('Player Walk authoring contract is derived from actual sprite runtime', () => {
  const pl = plantingFor(spec)!;
  assert.equal(spec.frames, PLAYER_SPRITE_GEOMETRY.walkFrames);
  assert.equal(pl.strideWorld, PLAYER_SPRITE_STRIDE.walk);
  assert.equal(pl.perFramePx, PLAYER_SPRITE_STRIDE.walk / spec.frames / PLAYER_SPRITE_SCALE);
  assert.equal(GAIT_SPEED[2] / pl.strideWorld * 2, 2.4);
  assert.equal(advancePlayerSpritePhase(0, pl.strideWorld / spec.frames, GAIT_SPEED[2]), 1 / spec.frames);
  for (const gait of ['sneak','run'] as const) assert.equal(plantingFor(SHEETS.find(s=>s.file===`player_${gait}.png`)!)!.strideWorld, PLAYER_SPRITE_STRIDE[gait]);
  assert.equal(plantingFor(SHEETS.find(s=>s.file==='guard_walk.png')!)!.strideWorld,40);
});
test('labelled synthetic cycle passes all eight same-foot transitions and both boundaries', () => {
  const { px, frames } = fixture();
  const result = validateRightFootTracks(px, spec, 0, frames);
  assert.deepEqual(result.errors, []);
  assert.equal(result.transitions.length, 8);
  assert.equal(result.transitions.filter(t=>t.boundary && t.pass).length,2);
  assert(result.transitions.every(t=>Math.abs(t.residualWorld)<1e-10));
});
test('same contact pixels with swapped foot labels cannot pass', () => {
  const { px, frames } = fixture();
  [frames[1].L,frames[1].R]=[frames[1].R,frames[1].L];
  assert(validateRightFootTracks(px,spec,0,frames).errors.some(e=>e.includes('stance/swing')));
});
test('grounded swing, root jitter, missing anatomy and wrong phase are errors', () => {
  for (const corrupt of [
    (f: ReturnType<typeof syntheticTracks>)=>{f[1].R.sole[1]=224;},
    (f: ReturnType<typeof syntheticTracks>)=>{f[2].root[0]+=3;},
    (f: ReturnType<typeof syntheticTracks>)=>{f[2].hip=[0,0];},
    (f: ReturnType<typeof syntheticTracks>)=>{f[3].phase=0;},
  ]) {
    const { px, frames } = fixture(); corrupt(frames);
    assert(validateRightFootTracks(px,spec,0,frames).errors.length>0);
  }
  assert(validateRightFootTracks(fixture().px,spec,0,undefined).errors.length>0);
});
test('4→5 and 8→1 must each pass even when other transitions meet 75 percent', () => {
  for (const [frame,id] of [[4,'L'],[0,'R']] as const) {
    const { px, frames }=fixture(); frames[frame][id].sole[0]+=20;
    assert(validateRightFootTracks(px,spec,0,frames).errors.some(e=>e.includes('boundary fails')));
  }
});
test('old 40-unit artwork is not silently accepted against the 60-unit contract', () => {
  const { px,frames }=fixture();
  frames.forEach(f=>{for(const id of ['L','R'] as const) f[id].sole[0]=128+(f[id].sole[0]-128)*2/3;});
  assert(validateRightFootTracks(px,spec,0,frames).errors.length>0);
});
