import {test} from 'node:test';
import assert from 'node:assert/strict';
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createGuardState,observeGuard} from '../../src/game/guards/guardBrain';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {COVER_CHECKPOINTS} from './v13CoverCheckpoints';
import {V13_MISSIONS} from './v13Build';
import {v13Prop} from './v13Builder';
import {coverWindows} from './v13CoverWindows';
import witnesses from './v13CoverWitnesses.json';
import {exposureRun} from './cameraExposure';
import {heistRun} from './v12Phase5Bot';

test('All remaining 44 missions have individual cover inspections, without replacing 01-01',()=>{
 assert.deepEqual(Object.keys(COVER_CHECKPOINTS).sort(),stages.slice(1).map(d=>d.id).sort());
 for(const [id,points] of Object.entries(COVER_CHECKPOINTS)){
  assert(points.length>=2,id);
  assert.equal(new Set(points.map(p=>`${p.guard}/${p.stop}`)).size,points.length,`${id}: conflicting inspection stops`);
 }
});
for(const def of (stages as StageDefinition[]).slice(1))test(`${def.id}: genuine cover, adjacent exposed crossing and live patrol inspection`,()=>{
 const stage=compileStage(def),points=COVER_CHECKPOINTS[def.id],plan=V13_MISSIONS.find(m=>m.id===def.id)!;
 const walls=stage.wallRects.flatMap(r=>[r.x,r.y,r.x+r.w,r.y+r.h]);
 for(const p of points){
  const authored=plan.guards[p.guard].stops[p.stop];
  assert.deepEqual({x:authored.x,y:authored.y},p.post,`${p.structure}: correct semantic stop`);
  const g=createGuardState(stage.guards[p.guard]);g.x=p.post.x*TILE;g.y=p.post.y*TILE;
  g.facing=Math.atan2(p.look.y-p.post.y,p.look.x-p.post.x);
  assert(g.route.some(q=>Math.hypot(q.x-g.x,q.y-g.y)<.01&&q.wait>0),`${p.structure}: actual waiting patrol point`);
  for(const q of [p.hidden,p.exposed])assert(clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,BODY.playerRadius+2),`${p.structure}: body clearance`);
  assert(clearSegment(p.hidden.x*TILE,p.hidden.y*TILE,p.exposed.x*TILE,p.exposed.y*TILE,stage.movementBlockers,BODY.playerRadius),`${p.structure}: walk out to peek`);
  const player=(q:{x:number;y:number})=>({x:q.x*TILE,y:q.y*TILE,gait:2});
  observeGuard(g,player(p.hidden),stage.visionBlockers);
  assert.equal(g.samplesSeen,0,`${p.structure}: whole body hidden`);
  observeGuard(g,player(p.hidden),p.wall?[]:walls);
  assert.equal(g.samplesSeen,3,`${p.structure}: structure creates cover, not range/angle`);
  const namedBlockers=p.wall?walls:compileStage({...def,props:[v13Prop(plan.structures.find(s=>s.name===p.structure)!)]}).visionBlockers.slice(walls.length);
  observeGuard(g,player(p.hidden),namedBlockers);
  assert.equal(g.samplesSeen,0,`${p.structure}: this named structure itself hides the body`);
  observeGuard(g,player(p.exposed),stage.visionBlockers);
  assert(g.canSee&&g.samplesSeen>=2,`${p.structure}: adjacent exposed crossing`);
 }
 const s=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius),visited=new Set<number>();
 for(let f=0;f<60*180;f++){
  stepGuards(s.guards,{x:-10000,y:-10000,gait:0},stage.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);
  points.forEach((p,i)=>{const g=s.guards[p.guard],angle=Math.atan2(p.look.y-p.post.y,p.look.x-p.post.x);
   const error=Math.atan2(Math.sin(g.facing-angle),Math.cos(g.facing-angle));
   if(Math.hypot(g.x-p.post.x*TILE,g.y-p.post.y*TILE)<2&&g.speed<2&&Math.abs(error)<.12)visited.add(i);
  });
 }
 assert.deepEqual([...visited].sort(),points.map((_,i)=>i).sort(),`${def.id}: live patrol must reach and inspect every cover`);
 for(const p of coverWindows(def))assert(p.longestUnwatchedSeconds>=1,`${p.structure}: usable waiting window against ALL guards and sweeping CCTV`);
 const w=witnesses[def.id as keyof typeof witnesses];
 const result='patience' in w?heistRun(def,w.approach,w.delay,w.patience):exposureRun(def,w.approach,w.escape,w.mode,w.delay);
 assert(result.clear&&!result.caught,`${def.id}: continuous spawn → objective → escape with real guards/CCTV/theft/capture`);
});
