import assert from 'node:assert/strict';
import {test} from 'node:test';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {measureMuseum} from './museumQA';
import {validateMuseumV2} from './museumV2Validation';

const museum=campaignStages.filter(d=>d.chapter===1);
test('Museum V2 contains ten consecutively selectable missions',()=>{
 assert.equal(museum.length,10);
 assert.deepEqual(museum.map(d=>d.id),Array.from({length:10},(_,i)=>`01-${String(i+1).padStart(2,'0')}`));
});
for(const def of museum)test(`${def.id}: real body traversal, initial facing, global theft and continuous AI clear`,()=>{
 const v=validateMuseumV2(def);
 assert(v.spawnValid,"Player spawn body overlaps blockers");
 for(const g of v.guards){
  assert(g.spawnClear,`${g.id}: spawn body collides`);
  assert(g.forwardClearanceTiles>=.6,`${g.id}: facing an immediate wall (${g.forwardClearanceTiles} tiles)`);
  assert(g.anchors.length>0&&g.anchors.every(a=>a.clear&&a.reachable&&a.lookValid&&a.waitValid),`${g.id}: invalid semantic anchor`);
 }
 for(const r of v.geometryOnly){assert(r.clear&&!r.caught,`Body traversal: ${JSON.stringify(r)}`);assert.equal(r.collisionFailures,0);assert(r.pickupAt!==null);}
 for(const r of v.fullAi)assert(r.found&&r.clear&&!r.caught,`No continuous AI witness within bounded search: ${JSON.stringify(r)}`);
 // A silent witness is reported, but not required for every authored route or
 // every difficulty. Core silent-escape eligibility is tested in theftV3.test.ts.
 const p=v.mechanicsProbe;
 assert(p.naturalCaseDiscoverySeconds!==null,'No patrol naturally inspects the empty case within120s');
 assert(p.allDispatched&&p.allMoved,JSON.stringify(p));
 assert(p.distinctTargets>1,'Guards must not all converge to the same post');
 assert(p.hiddenLkpStayedUnpublished&&p.spotted&&p.contactCaught&&p.retryReset,JSON.stringify(p));
 assert.equal(p.theftWhistle,1);assert.equal(p.spottedWhistle,1);
 assert.equal(p.whistleCount,2);
});
for(const def of museum)test(`${def.id}: three-minute semantic patrol and route geometry`,()=>{
 const m=measureMuseum(def);
 for(const g of m.guards){
  assert.equal(g.collisionSamples,0,`${g.id} patrol entered blockers`);
  assert.equal(g.recoveries,0,`${g.id} needed blocked-route recovery`);
  assert.equal(g.visitedAnchors,g.totalAnchors,`${g.id} missed assigned anchors`);
  assert(g.distanceTiles>20,`${g.id} remained near one spot`);
  assert(g.maxStationarySeconds<12,`${g.id} stood still excessively`);
 }
 assert(m.caseCoverage.visibleFraction>0&&m.caseCoverage.visibleFraction<1);
 assert(m.caseCoverage.longestBlindSeconds>1);
 assert(m.routes.every(r=>r.allSegmentsClear));
 assert(m.escape.allSegmentsClear&&m.escape.endsAtExit);
});

test('Security Wing safe approach leaves a usable body margin past the desk',async()=>{
 const {compileStage,TILE}=await import('../../src/game/world/compileStage');
 const {BODY}=await import('../../src/game/guards/guardTuning');
 const def=museum.find(d=>d.id==='01-04')!,stage=compileStage(def);
 // Sample the desk-side segment, not just the route endpoints: the previous
 // x=6.5 path passed collision tests with only 0.02 tile body-edge clearance.
 const a=def.testRoutes![0].points[2],b=def.testRoutes![0].points[3];
 for(let i=0;i<=60;i++){
  const x=(a.x+(b.x-a.x)*i/60)*TILE,y=(a.y+(b.y-a.y)*i/60)*TILE;
  for(let j=0;j<stage.movementBlockers.length;j+=4){
   const z=stage.movementBlockers,dx=Math.max(z[j]-x,0,x-z[j+2]),dy=Math.max(z[j+1]-y,0,y-z[j+3]);
   assert(Math.hypot(dx,dy)-BODY.playerRadius>=.14*TILE,'Safe approach hugs the desk or wall');
  }
 }
});

test('Five-mission benchmark ends in Diamond Hall while the ten-mission finale stays distinct',()=>{
 const benchmark=museum.find(d=>d.id==='01-05')!,finale=museum.find(d=>d.id==='01-10')!;
 assert.equal(benchmark.title,'Diamond Hall');
 assert.equal(benchmark.objective?.kind,'diamond');
 assert.equal(finale.objective?.kind,'masterDiamond');
 assert.equal(museum.length,10);
});
