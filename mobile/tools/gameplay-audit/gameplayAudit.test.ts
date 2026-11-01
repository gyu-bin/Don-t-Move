import test from 'node:test';
import assert from 'node:assert/strict';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {GUARD_TUNING as T} from '../../src/game/guards/guardTuning';
import {runMission,CANDIDATES} from './campaignAudit';
import {planMission,WAITS,BUDGET,START_DELAYS} from './expertPlanner';
import {difficultyIndex} from './difficultyIndex';
import type {MissionMetrics} from './difficultyIndex';
import {guardPass,timeToAlert,G} from './controlledExposure';

const def=(id:string)=>(campaign as StageDefinition[]).find(d=>d.id===id)!;

test('candidate A is the production movement factor table', () => {
  assert.deepEqual(CANDIDATES.A,[...T.movementFactor]);
});

test('reactive bot runs are deterministic and end within the cap', () => {
  const a=runMission(def('01-02'),'walk',0,2), b=runMission(def('01-02'),'walk',0,2);
  assert.deepEqual(a,b);
  assert.ok(a.seconds<=100+1e-6);
  assert.equal([a.clear,a.caught,a.timeout,a.stuck].filter(Boolean).length,1,'exactly one terminal outcome');
});

test('candidate factors are restored and the campaign is untouched after a candidate run', () => {
  const factors=T.movementFactor as unknown as number[], before=[...factors], json=JSON.stringify(campaign);
  try { factors.splice(0,4,...CANDIDATES.B); runMission(def('01-01'),'run',0,0,'B'); }
  finally { factors.splice(0,4,...before); }
  assert.deepEqual([...T.movementFactor],before);
  assert.equal(JSON.stringify(campaign),json);
});

test('expert planner is deterministic, bounded, and its windows are option shares', () => {
  const a=planMission(def('01-01'),0,'walk'), b=planMission(def('01-01'),0,'walk');
  assert.deepEqual(a,b);
  assert.ok(a.budgetUsed>0&&a.budgetUsed<=START_DELAYS.length*2*(BUDGET+WAITS.length));
  for (const w of a.windows) assert.ok(w>=0&&w<=1&&Number.isInteger(Math.round(w*WAITS.length*1e6)/1e6));
  assert.equal(a.clear,true,'01-01 tutorial route is walkable unseen by a patient player');
});

test('controlled guard fixture matches the analytic suspicion formula', () => {
  // Thief stationary on the cone axis at 0.3 × range (inside the 60-unit close radius, all 3 body samples visible):
  // gain = baseGain × closeFloor × distanceFactor(0.3) × cone(0) × visibility(1).
  const dist=T.distanceFactorNear+(T.distanceFactorFar-T.distanceFactorNear)*0.3;
  const gain=T.baseGain*Math.max(T.movementFactor[0],T.closeMovementFloor)*dist;
  assert.ok(0.3*G.range<=T.closeDetectionRadius);
  const r=guardPass(0,0.3,0,1);
  assert.ok(Math.abs(r.suspicion-gain)<1e-3,`expected ${gain}, got ${r.suspicion}`);
  const tta=timeToAlert(0,0.3)!;
  assert.ok(Math.abs(tta-1/gain)<=1/60+1e-9,`alert at ${tta}, analytic ${1/gain}`);
});

test('difficulty index follows its published formula', () => {
  const m={expertScore:0.5,bottleneckWindow:0.25,reactiveClearRate:0.2,dangerSections:5} as MissionMetrics;
  const d=difficultyIndex(m);
  assert.deepEqual(d.parts,{P:0.5,W:0.75,N:0.8,C:0.5});
  assert.equal(d.total,Math.round(100*(0.3*0.5+0.25*0.75+0.25*0.8+0.2*0.5)));
});

test('risk grid: guard Run÷Sneak per-tile ratio equals the analytic value inside and outside the close radius', async () => {
  const {grid}=await import('./riskGrid');
  const {GAIT_SPEED}=await import('../../src/game/core/locomotion');
  const g=grid() as unknown as {cells:{observer:string;depthTiles:number;runOverSneakPerTile:number}[]};
  const far=(T.movementFactor[3]/GAIT_SPEED[3])/(T.movementFactor[1]/GAIT_SPEED[1]);
  const near=(T.movementFactor[3]/GAIT_SPEED[3])/(T.closeMovementFloor/GAIT_SPEED[1]);
  for (const c of g.cells.filter(x=>x.observer==='guard')) {
    const expected=c.depthTiles*40<=T.closeDetectionRadius?near:far;
    assert.ok(Math.abs(c.runOverSneakPerTile-expected)<1e-3,`${c.depthTiles} tiles: ${c.runOverSneakPerTile} vs ${expected}`);
  }
  for (const c of g.cells.filter(x=>x.observer==='camera')) assert.ok(c.runOverSneakPerTile<0.5,'CCTV: Run must be cheaper per tile');
});
