import {test} from 'node:test';
import assert from 'node:assert/strict';
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createGuardState,observeGuard} from '../../src/game/guards/guardBrain';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {ENTRANCE_HIDE_PROBES} from './v13EntranceStealth';
import {exposureRun} from './cameraExposure';
import {heistRun} from './v12Phase5Bot';
import {Awareness} from '../../src/game/core/types';
import {missionOverrides} from './v13Overrides';
import {V13_MUSEUM_FROZEN} from './v13Museum';

const def=(stages as StageDefinition[])[0],stage=compileStage(def);
test('01-01 refinement does not leak into frozen Warehouse plans or their override index',()=>{
 assert(missionOverrides('01-01').some(e=>e.table==='entranceStealth'));
 assert(!missionOverrides('07-01').some(e=>e.table==='entranceStealth'));
 const frozen=V13_MUSEUM_FROZEN[0];
 assert.deepEqual(frozen.guards[0].stops.map(s=>[s.x,s.y]),[[10.25,11.75],[13.5,15]]);
 assert.equal(frozen.structures.find(s=>s.name==='Lobby Security Desk')!.y,16.2);
});
test('01-01: four actual solid covers hide the full body and allow adjacent peeking',()=>{
 const walls=stage.wallRects.flatMap(r=>[r.x,r.y,r.x+r.w,r.y+r.h]);
 for(const p of ENTRANCE_HIDE_PROBES){
  const g=createGuardState(stage.guards.find(g=>g.id===p.guard)!);
  g.x=p.post.x*TILE;g.y=p.post.y*TILE;g.facing=Math.atan2(p.look.y-p.post.y,p.look.x-p.post.x);
  for(const q of [p.hidden,p.exposed])assert(clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,BODY.playerRadius+2),`${p.name}: usable body clearance`);
  const player=(q:{x:number;y:number})=>({x:q.x*TILE,y:q.y*TILE,gait:2});
  observeGuard(g,player(p.hidden),stage.visionBlockers);
  assert(!g.canSee&&g.samplesSeen===0,`${p.name}: all three body samples hidden`);
  observeGuard(g,player(p.hidden),walls);
  assert(g.canSee&&g.samplesSeen===3,`${p.name}: actual prop, not distance/angle/wall, creates cover`);
  observeGuard(g,player(p.exposed),stage.visionBlockers);
  assert(g.canSee&&g.samplesSeen>=2,`${p.name}: stepping out is genuinely exposed`);
 }
});

test('01-01: live patrol really visits and faces every named cover checkpoint',()=>{
 const s=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius),visited=new Set<string>();
 for(let f=0;f<60*120;f++){
  stepGuards(s.guards,{x:-10000,y:-10000,gait:0},stage.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);
  for(const p of ENTRANCE_HIDE_PROBES){const g=s.guards.find(g=>g.id===p.guard)!;
   const angle=Math.atan2(p.look.y-p.post.y,p.look.x-p.post.x),error=Math.atan2(Math.sin(g.facing-angle),Math.cos(g.facing-angle));
   if(Math.hypot(g.x-p.post.x*TILE,g.y-p.post.y*TILE)<2&&g.speed<2&&Math.abs(error)<.12)visited.add(p.name);
  }
 }
 assert.deepEqual([...visited].sort(),ENTRANCE_HIDE_PROBES.map(p=>p.name).sort());
});

test('01-01: safe and shorter risk approaches plus both escapes remain full playable heists',()=>{
 const length=(points:{x:number;y:number}[])=>points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);
 assert(length(def.testRoutes![0].points)-length(def.testRoutes![1].points)>6,'risk shortcut has a meaningful distance saving');
 assert(exposureRun(def,0,0,2,0).clear,'safe Walk → objective → quick exit');
 assert(exposureRun(def,1,0,1,6).clear,'timed risk Sneak → objective → quick exit');
 assert(exposureRun(def,0,1,2,2).clear,'safe Walk → objective → distinct service escape');
 const observed=heistRun(def,1,0,3);
 assert(observed.clear&&!observed.caught&&observed.waitSeconds>1,'observe/wait → crossing → objective → escape with live AI');
});

test('01-01: spotted service escape breaks real LOS without publishing hidden player positions',()=>{
 let chased=false,hiddenAlertFrames=0,previous:{x:number;y:number}|null=null;
 const result=exposureRun(def,0,1,3,10,s=>{
  if(s.guards.some(g=>g.awareness===Awareness.Chase))chased=true;
  if(s.events.globalAlert){
   if(previous&&!s.guards.some(g=>g.canSee)){
    hiddenAlertFrames++;
    assert.deepEqual({x:s.events.globalX,y:s.events.globalY},previous,'LKP must freeze when all guards lose sight');
   }
   previous={x:s.events.globalX,y:s.events.globalY};
  }else previous=null;
 });
 assert(result.clear&&!result.caught&&chased&&hiddenAlertFrames>30,'actual chase → LOS break → distinct escape → clear');
});
