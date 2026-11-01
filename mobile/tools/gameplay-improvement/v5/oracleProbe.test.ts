import assert from 'node:assert/strict';
import {test} from 'node:test';
import campaign from '../../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import {TILE} from '../../../src/game/world/compileStage';
import {world,scenarios,provoke} from '../v4/chaseLab';
import {candidatesFor} from './candidates';
import {bindState,measureRun} from './experiment';
import {fixedTarget,oracleTargets} from './oracleProbe';

test('existing warehouse geometry supports strategic recovery where straight flight is caught',()=>{
  const def=(campaign as StageDefinition[]).find(d=>d.id==='07-01')!,w=world(def);
  const sc=scenarios(def)[9],sp=provoke(w,sc)!;assert.ok(sp);
  const escape=fixedTarget(w,sp,{x:5.5*TILE,y:17.5*TILE});
  assert.equal(escape.metrics.calm,true);assert.equal(escape.metrics.caught,false);
  assert.equal(escape.metrics.contactEpisodes,0);assert.ok(escape.metrics.firstLosBreakAt!<1);
  const straight=measureRun(w,sp,sc,'A');
  assert.equal(straight.caught,true);assert.equal(straight.firstLosBreakAt,null);
});

test('oracle sampling can omit an already successful baseline target; exact-goal pairing prevents false adoption',()=>{
  const def=(campaign as StageDefinition[]).find(d=>d.id==='07-01')!,w=world(def);
  const sc=scenarios(def)[9],sp=provoke(w,sc)!;
  const candidate=candidatesFor(def).find(c=>c.id==='lobby-turn')!,cw=world(candidate.def);
  const q={x:5.5*TILE,y:17.5*TILE};
  const contains=(xs:ReturnType<typeof oracleTargets>)=>xs.some(p=>p.q.x===q.x&&p.q.y===q.y);
  assert.equal(contains(oracleTargets(w,bindState(w,sp))),false);
  assert.equal(contains(oracleTargets(cw,bindState(cw,sp))),true);
  const before=fixedTarget(w,sp,q),after=fixedTarget(cw,sp,q);
  assert.equal(before.metrics.calm,true);assert.equal(after.metrics.calm,true);
  assert.equal(before.metrics.firstLosBreakAt,after.metrics.firstLosBreakAt);
  assert.equal(before.metrics.calmAt,after.metrics.calmAt);
});
