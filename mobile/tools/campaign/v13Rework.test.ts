/**
 * Gameplay Improvement v3 — 07-01 rework (tools/campaign/v13Rework.ts, docs/reports/gameplay-improvement-v3/).
 * The rework stays confined to 07-01, keeps the mission's identity, adds its two lines without closing the old ones,
 * and each new line has a real unseen clear in the production simulation.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {composeV13} from './v13Builder';
import {V13_MISSIONS} from './v13Build';
import {BEFORE_REWORK,HQ_PATROL} from './v13Late';
import {REWORK} from './v13Rework';
import {physicalRoute} from './v124bBuilder';
import {blindRun} from '../gameplay-improvement/accessibility';
import {authorCoverCheckpoints} from './v13CoverCheckpoints';
import {polishPatrol} from './v13PatrolPolish';
import {watchExit} from './v13ExitWatch';

const runtime=(id:string)=>(campaign as unknown as StageDefinition[]).find(d=>d.id===id)!;
const before=JSON.parse(JSON.stringify(composeV13(BEFORE_REWORK.get('07-01')!,raw as StageDefinition[]))) as StageDefinition;
const after=runtime('07-01');
/** A line through the court breach and the collection's north door (the risk line of candidate 07-01:B). */
const BREACH=[{x:19.8,y:16.5},{x:17.75,y:14.75},{x:13.75,y:14.75},{x:12.5,y:16.5},{x:12.5,y:18.25},{x:12.5,y:13.5},{x:12,y:13.5},{x:12,y:11.5},{x:10.5,y:11.5},{x:9.75,y:10.25},
  {x:10.25,y:6.25},{x:10.5,y:6.5},{x:10.5,y:3.5},{x:11,y:3.5},{x:8.5,y:3.5},{x:6.25,y:4.75},{x:4.25,y:4.75},{x:3,y:3.5},{x:1.75,y:2.75},{x:2,y:2.5}];

test('v3 rework is confined to 07-01: every other derived mission is exactly its pre-rework plan', () => {
  assert.deepEqual(Object.keys(REWORK),['07-01']);
  // Compare at the same pipeline stage: the later cover, patrol and exit passes
  // are intentionally applied to all missions after the local rework.
  for (const [id,plan] of BEFORE_REWORK) if (id!=='07-01') {
    const patch=HQ_PATROL[id];
    const afterHQ=patch?{...plan,guards:plan.guards.map(g=>g.zone!==patch.zone?g:{...g,watches:patch.watches,stops:g.stops.map((s,i)=>i?s:{...s,look:{...patch.look},wait:patch.wait})})}:plan;
    assert.deepEqual(V13_MISSIONS.find(m=>m.id===id),watchExit(polishPatrol(authorCoverCheckpoints(afterHQ))),id);
  }
});

test('07-01 keeps its id, chapter, title, entry, prize, exit and security head-count', () => {
  for (const k of ['id','chapter','title','playerSpawn','objective','exitPosition','exit'] as const) assert.deepEqual(after[k],before[k],k);
  assert.equal(after.guards.length,before.guards.length);
  assert.equal(after.cameras?.length,before.cameras?.length);
  assert.deepEqual(after.cameras,before.cameras,'cameras are not moved');
});

test('07-01 opens the freight door and the court breach; the breach shuts at lockdown; the old lines still exist', () => {
  const floor=(x:number,y:number)=>after.layout[y][x]==='.';
  for (const x of [17,18,19]) { assert.ok(floor(x,13),`freight door cell ${x},13`); assert.ok(!(before.layout[13][x]==='.')); }
  for (const [x,y] of [[9,6],[10,6],[11,6],[11,7]]) assert.ok(floor(x,y),`breach cell ${x},${y}`);
  const breach=after.doors!.find(d=>Math.abs(d.x-10.5)<1e-6&&Math.abs(d.y-6.5)<1e-6)!;
  assert.ok(breach&&after.lockdownDoors!.includes(breach.id),'breach door is a lockdown door');
  assert.equal(after.lockdownDoors!.length,before.lockdownDoors!.length+1);
  assert.deepEqual(after.testRoutes![0],before.testRoutes![0],'the hall lane is unchanged');
  assert.doesNotThrow(()=>physicalRoute(after,before.testRoutes![1].points),'the old court crossing is still walkable');
  assert.doesNotThrow(()=>physicalRoute(after,BREACH),'the breach line is walkable');
  assert.ok(after.testRoutes![1].points.some(p=>p.x>=18&&p.y>12&&p.y<14),'the risk line uses the freight door');
});

test('07-01: each new line has a real unseen clear (production simulation, fixed start times)', () => {
  const withBreach={...after,testRoutes:[...after.testRoutes!,{...after.testRoutes![1],name:'breach',points:BREACH}]} as StageDefinition;
  const unseen=(route:number,gait:'sneak'|'walk'|'run',delay:number)=>{const r=blindRun(withBreach,route,gait,delay);return r.outcome==='clear'&&!r.spotted;};
  assert.ok(unseen(1,'run',1),'freight line, Run, start 1 s');
  assert.ok(unseen(1,'walk',10.5),'freight line, Walk, start 10.5 s');
  assert.ok(unseen(2,'walk',1),'breach line, Walk, start 1 s');
  assert.ok(unseen(2,'sneak',10),'breach line, Sneak, start 10 s');
  assert.ok(unseen(0,'sneak',0),'hall lane, Sneak, start 0 s');
});
