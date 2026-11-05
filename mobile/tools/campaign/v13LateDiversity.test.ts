import assert from 'node:assert/strict';
import {test} from 'node:test';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {LATE_LAYOUT_REVISION_IDS} from '../../src/game/progress/missionRevision';
import {V13_MISSIONS} from './v13Build';
import {canonical,sha256} from './v13QaLib';
import {routeRooms} from './v124bTopologyQA';
import {previousStageHashes,reviewedStageHashes} from './v13LateReviewed';
import {exposureRun} from './cameraExposure';
import quickWitnesses from '../../docs/design/late-campaign-diversity/REVIEWED_QUICK_ESCAPES.json';
import type {V13Mission} from './v13Types';

function roomGraph(plan:V13Mission) {
 const adjacency=new Map(Object.values(plan.zones).map(zone=>[zone.id,new Set<string>()]));
 const zoneAt=(x:number,y:number)=>plan.zones[plan.map[y]?.[x]]?.id;
 for(let y=0;y<plan.map.length;y++)for(let x=0;x<plan.map[y].length;x++){
  const room=zoneAt(x,y);
  if(room===undefined)continue;
  for(const neighbor of [zoneAt(x+1,y),zoneAt(x,y+1)]){
   if(neighbor===undefined||neighbor===room)continue;
   adjacency.get(room)!.add(neighbor);
   adjacency.get(neighbor)!.add(room);
  }
 }
 const anchors=[plan.entry,plan.objective,plan.exit].map(p=>zoneAt(Math.floor(p.x),Math.floor(p.y)));
 const role=(id:string)=>anchors.indexOf(id);
 let colors=new Map([...adjacency.keys()].map(id=>[id,String(role(id))]));
 for(let i=0;i<adjacency.size;i++){
  colors=new Map([...adjacency].map(([id,neighbors])=>[
   id,sha256([role(id),colors.get(id),[...neighbors].map(n=>colors.get(n)).sort()]),
  ]));
 }
 return [...colors.values()].sort().join('/');
}

test('Only the 21 reviewed late-campaign mission definitions changed',()=>{
 assert.equal(campaignStages.length,55);
 assert.equal(Object.keys(previousStageHashes).length,55);
 assert.deepEqual(Object.keys(reviewedStageHashes).sort(),[...LATE_LAYOUT_REVISION_IDS].sort());
 for(const stage of campaignStages){
  const changed=reviewedStageHashes[stage.id];
  if(changed)assert.notEqual(changed,previousStageHashes[stage.id],stage.id);
  assert.equal(sha256(canonical(stage)),changed??previousStageHashes[stage.id],stage.id);
 }
});

test('Late replacements have distinct actual room networks across the campaign',()=>{
 const signatures=V13_MISSIONS.map(plan=>({id:plan.id,graph:roomGraph(plan)}));
 for(const candidate of signatures.filter(x=>LATE_LAYOUT_REVISION_IDS.includes(x.id))){
  for(const other of signatures.filter(x=>x.id!==candidate.id)){
   assert.notEqual(candidate.graph,other.graph,`${candidate.id}/${other.id}: room network repeats after ignoring names, geometry and parallel doors`);
  }
 }
});

test('Late replacements retain security headcounts and offer different rooms on their approach routes',()=>{
 const expected:[number,number][]=[
  [4,2],[4,2],[4,2],[4,2],[4,2],
  [4,2],[4,2],[4,2],[4,2],[4,2],
  [4,2],[4,2],[4,1],[4,2],
  [4,3],[5,3],[5,3],[4,3],[5,3],
  [6,3],[6,3],
 ];
 for(const [index,id] of LATE_LAYOUT_REVISION_IDS.entries()){
  const stage=campaignStages.find(s=>s.id===id)!;
  assert.deepEqual([stage.guards.length,stage.cameras?.length],expected[index],id);
  const plan=stage.topologyPlan!;
  const rooms=new Set(plan.rooms.filter(room=>room.role!=='transition').map(room=>room.id));
  const [safe,risk]=stage.testRoutes!.map(route=>new Set(routeRooms(plan,route.points).filter(id=>rooms.has(id))));
  assert([...safe].some(room=>!risk.has(room))||[...risk].some(room=>!safe.has(room)),`${id}: a branch must enter or bypass a room`);
 }
});

test('Late replacements allow observation on arrival and keep natural theft discovery',()=>{
 for(const id of LATE_LAYOUT_REVISION_IDS){
  const def=campaignStages.find(s=>s.id===id)!;
  const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
  const observer=createPlaygroundState(stage);observer.playerMode=0;
  const bounds={x:0,y:0,w:stage.width,h:stage.height};
  for(let frame=0;frame<600;frame++)stepPlayground(observer,1/60,TILE,400,800,bounds,stage.movementBlockers,stage.visionBlockers,nav);
  assert(!observer.events.caught&&!observer.events.spottedSource,`${id}: ten seconds to read the room`);
  const inspection=createPlaygroundState(stage),absentPlayer={x:-10000,y:-10000,gait:0};
  const tick=(frame:number)=>stepGuards(inspection.guards,absentPlayer,stage.visionBlockers,nav,1/60,inspection.events,frame/60,true,1,inspection.theft);
  for(let frame=0;frame<120;frame++)tick(frame);
  assert(!inspection.events.theftAlert,`${id}: a full stand does not trigger theft`);
  inspection.theft.empty=true;
  for(let frame=120;frame<7200&&!inspection.events.theftAlert;frame++)tick(frame);
  assert(inspection.events.theftAlert&&!inspection.events.spottedSource,`${id}: the guard notices the empty stand without locating the thief`);
 }
});

test('Each late replacement has a real quick escape in adjacent patrol phases',()=>{
 assert.deepEqual(Object.keys(quickWitnesses).sort(),[...LATE_LAYOUT_REVISION_IDS].sort());
 for(const [id,w] of Object.entries(quickWitnesses)){
  const stage=campaignStages.find(s=>s.id===id)!;
  for(const offset of [-.25,0,.25].filter(offset=>w.delay+offset>=0)){
   const result=exposureRun(stage,w.approach,0,w.mode,w.delay+offset);
   assert(result.clear&&!result.caught,`${id} quick escape at ${w.delay+offset}s`);
  }
 }
});
