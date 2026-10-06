import {test} from 'node:test';
import assert from 'node:assert/strict';
import current from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {buildV124dCampaign} from './v124dBuild';
import {buildV125Campaign} from './v125Build';
import {PHASE5} from './v125Tuning';
import {V13_MISSIONS} from './v13Build';

// V13 rebuilds missions from new architecture plans (see v13Scope.test.ts), so the live comparison covers
// only the missions V13 has not rebuilt; the Phase 5 layer itself is still checked on all of its own output.
const base=JSON.parse(JSON.stringify(buildV124dCampaign())) as StageDefinition[],live=current as unknown as StageDefinition[];
const rebuilt=new Set(V13_MISSIONS.map(m=>m.id)),after=live.filter(d=>!rebuilt.has(d.id));
const strip=(d:StageDefinition)=>{const {guards,patrolRoutes,cameras,...rest}=d;void guards;void patrolRoutes;void cameras;return rest;};

test('Phase5: bake is reproducible and matches the live campaign data',()=>{
 assert.deepEqual((JSON.parse(JSON.stringify(buildV125Campaign())) as StageDefinition[]).filter(d=>!rebuilt.has(d.id)),after);
 assert.equal(after.length,45-rebuilt.size);
});

test('Phase5: geometry, structures, doors, entry/exit/objective, routes and art selection are exactly the Phase 4D map',()=>{
 for(const stage of after){
  const old=base.find(d=>d.id===stage.id)!;
  assert.deepEqual(strip(stage),strip(old),`${stage.id}: only guards, patrolRoutes and cameras may differ`);
 }
});

test('Phase5: Chapter 6–9 and untuned missions are untouched',()=>{
 for(const stage of after)if(stage.chapter!>=6||!PHASE5[stage.id])assert.deepEqual(stage,base.find(d=>d.id===stage.id),stage.id);
 assert(Object.keys(PHASE5).every(id=>Number(id.slice(0,2))<=5),'Phase 5 tunes Chapter 1–5 only');
});

test('Phase5: guard count, perception and speed are unchanged; patrols move only where the mission declares it',()=>{
 for(const stage of after.filter(s=>s.chapter!<=5)){
  const old=base.find(d=>d.id===stage.id)!,tuning=PHASE5[stage.id];
  assert.equal(stage.guards.length,old.guards.length,`${stage.id} guard count`);
  stage.guards.forEach((g,i)=>{
   const o=old.guards[i],restopped=!!tuning?.patrol?.[i]||(g.role==='objective'&&!!tuning?.objectiveAway);
   for(const key of ['id','routeId','role','pace','visionRange','visionHalfAngle','escapePatrol'] as const)assert.deepEqual(g[key],o[key],`${stage.id} guard ${i} ${key}`);
   const route=stage.patrolRoutes!.find(r=>r.id===g.routeId)!,oldRoute=old.patrolRoutes!.find(r=>r.id===o.routeId)!;
   assert.equal(route.mode,oldRoute.mode);
   // The guard always starts on its first patrol stop.
   assert.equal(g.x,route.points[0].x);assert.equal(g.y,route.points[0].y);
   if(!restopped){
    for(const key of ['x','y','facing','initialFacing'] as const)assert.deepEqual(g[key],o[key],`${stage.id} guard ${i} ${key}`);
    // The authored patrol is kept as a prefix; Phase 5 may only extend it and retime its stops.
    oldRoute.points.forEach((p,k)=>{assert.equal(route.points[k].x,p.x);assert.equal(route.points[k].y,p.y);assert.equal(route.points[k].lookDirection,p.lookDirection);});
   }else{
    // A re-authored patrol stays inside the guard's own security zone.
    const zone=stage.securityZones!.find(z=>z.guardId===g.id)!;
    assert(route.points.some(p=>Math.hypot(p.x-zone.x,p.y-zone.y)<=zone.radius+1),`${stage.id} guard ${i} left its zone`);
   }
   for(const p of route.points)assert((p.waitDuration??0)>=0&&(p.waitDuration??0)<=8,`${stage.id} wait bound`);
  });
 }
});

test('Phase5: CCTV detection constants are inherited unchanged; at most one camera added or removed per mission',()=>{
 for(const stage of after.filter(s=>s.chapter!<=5)){
  const old=base.find(d=>d.id===stage.id)!,template=base.flatMap(s=>s.chapter===stage.chapter?s.cameras??[]:[])[0]??base.flatMap(s=>s.chapter===3?s.cameras??[]:[])[0];
  assert(Math.abs((stage.cameras?.length??0)-(old.cameras?.length??0))<=1,`${stage.id} camera count`);
  for(const camera of stage.cameras??[])for(const key of ['range','visionAngle','sweepAngle','sweepSpeed','pauseAtEnds','suspicionRate'] as const)
   assert.deepEqual(camera[key],template[key],`${stage.id} ${camera.id} ${key}`);
 }
});

test('Phase5: Museum keeps the easy-chapter rule — no camera shares a room with a patrolling guard',()=>{
 for(const stage of live.filter(s=>s.chapter===1))for(const camera of stage.cameras??[]){
  const room=stage.topologyPlan!.rooms.find(r=>camera.x>=r.x&&camera.x<=r.x+r.w&&camera.y>=r.y&&camera.y<=r.y+r.h);
  const guarded=stage.guards.some(g=>room&&g.x>=room.x&&g.x<=room.x+room.w&&g.y>=room.y&&g.y<=room.y+room.h);
  assert(!guarded,`${stage.id}: ${camera.id} doubles a guarded room`);
 }
});
