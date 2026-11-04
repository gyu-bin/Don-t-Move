import assert from 'node:assert/strict';
import {test} from 'node:test';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {V13_MUSEUM_FINALE,MUSEUM_FINALE_WITNESSES} from './v13MuseumFinale';
import {composeV13} from './v13Builder';
import {authorCoverCheckpoints} from './v13CoverCheckpoints';
import {polishPatrol} from './v13PatrolPolish';
import {watchExit} from './v13ExitWatch';
import {auditMission} from './v13FullAudit';
import {fakeGaps,emptiness,placement} from './v13QA';
import {exposureRun} from './cameraExposure';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {extraDetectionsForMastery} from '../../src/game/progress/chapterOneMastery';
import {auditV124bTopology,routeRooms} from './v124bTopologyQA';

const source=[...raw,...V13_MUSEUM_FINALE.map((m,i)=>({...structuredClone(raw.find(d=>d.id===`01-0${i+4}`)!),id:m.id,number:49+i,chapter:1,mission:9+i}))] as StageDefinition[];
const plans=V13_MUSEUM_FINALE.map(m=>watchExit(polishPatrol(authorCoverCheckpoints(m))));
const defs=plans.map(m=>composeV13(m,source));

test('Camera Crossing and Crown Collection require different readings of entrance, prize and exit',()=>{
 assert.deepEqual(plans.map(m=>m.id),['01-09','01-10']);
 assert.deepEqual(plans[0].placement,['top-right','bottom-right','bottom-left']);
 assert.deepEqual(plans[1].placement,['top-centre','bottom-centre','right-centre']);
 const [crossing,crown]=plans;
 assert(crossing.approach.includes('n')&&crossing.approach.includes('w')&&!crossing.approach.includes('r'),'north observation bypass');
 assert(crossing.risk.includes('r')&&!crossing.risk.includes('w'),'direct east CCTV crossing');
 assert.deepEqual(crossing.alternateEscape.slice(-5),['c','j','h','q','x']);
 assert(crown.approach.includes('t')&&!crown.approach.includes('p'),'deep east handling approach');
 assert(crown.risk.includes('p')&&crown.risk.includes('w')&&!crown.risk.includes('t'),'west portrait approach');
 assert.deepEqual(crown.alternateEscape.slice(-5),['i','p','h','z','x']);
});

for(const [i,def] of defs.entries()){
 test(`${def.id}: final cover-wrapped architecture passes the full release audit without exceptions`,()=>{
  assert.deepEqual(auditMission(def).issues,[]);assert.deepEqual(auditMission(def).known,[]);
  assert.deepEqual(fakeGaps(def),{sealed:[],squeezes:[]});assert(emptiness(def).worst.clearance<=2.8);
  assert.deepEqual([placement(def,def.playerSpawn),placement(def,def.objective!),placement(def,def.exitPosition!)],plans[i].placement);
  assert.equal(def.guards.length,i===0?2:3);assert.equal(def.cameras?.length,1);
  const camera=def.cameras![0],cameraRoom=def.topologyPlan!.rooms.find(r=>camera.x>=r.x&&camera.x<=r.x+r.w&&camera.y>=r.y&&camera.y<=r.y+r.h)!;
  assert(cameraRoom);assert(!def.guards.some(g=>g.x>=cameraRoom.x&&g.x<=cameraRoom.x+cameraRoom.w&&g.y>=cameraRoom.y&&g.y<=cameraRoom.y+cameraRoom.h),'easy-chapter CCTV must not double a guarded room');
  assert.equal(def.objective?.highSecurity,source.find(d=>d.id===def.id)!.objective?.highSecurity);
  const topology=auditV124bTopology(def);assert.deepEqual(topology.errors,[]);
  assert(topology.closedEscapeLength-topology.openEscapeLength>=.5);
  assert(topology.newEscapeZones.filter(id=>id!==def.topologyPlan!.exitRoom).length>=2);
 });
 test(`${def.id}: safe and exposed approaches use exclusive actual rooms`,()=>{
  const safe=new Set(routeRooms(def.topologyPlan!,def.testRoutes![0].points));
  const risk=new Set(routeRooms(def.topologyPlan!,def.testRoutes![1].points));
  assert([...safe].some(id=>!risk.has(id)));assert([...risk].some(id=>!safe.has(id)));
 });
 for(const kind of ['quick','alternate'] as const)test(`${def.id}: ${kind} escape has three neighboring clean real-AI witnesses`,()=>{
  const w=MUSEUM_FINALE_WITNESSES[def.id as keyof typeof MUSEUM_FINALE_WITNESSES][kind];
  for(const offset of[-.25,0,.25]){
   let extra:number|undefined;
   const run=exposureRun(def,w.approach,w.escape,w.mode,w.delay+offset,s=>extra=extraDetectionsForMastery(s.events));
   assert(run.clear&&!run.caught,JSON.stringify({id:def.id,kind,offset,...run}));assert.equal(extra,0);
  }
 });
 test(`${def.id}: protected arrival allows ten seconds of observation without capture or alarm`,()=>{
  const stage=compileStage(def),state=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius);state.playerMode=0;
  for(let frame=0;frame<600;frame++)stepPlayground(state,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  assert.equal(state.events.caught,false);assert.equal(extraDetectionsForMastery(state.events),0);assert.equal(state.theft.empty,false);
 });
 test(`${def.id}: natural empty-prize inspection survives the cover assignments`,()=>{
  const stage=compileStage(def),state=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius);assert.equal(state.theft.alarmDelay,undefined);
  const hidden={x:-10000,y:-10000,gait:0};let time=0;
  const tick=()=>{time+=1/60;stepGuards(state.guards,hidden,stage.visionBlockers,nav,1/60,state.events,time,true,1,state.theft);};
  for(let frame=0;frame<120;frame++)tick();assert.equal(state.events.theftWhistleRevision,0);
  state.theft.empty=true;
  for(let frame=0;frame<7200&&!state.events.theftAlert;frame++)tick();
  assert(state.events.theftAlert);assert.equal(state.events.theftWhistleRevision,1);assert.equal(state.events.spottedWhistleRevision,0);
 });
}

test('Camera Crossing direct lane has a genuine CCTV consequence while the observation balcony stays behind walls',()=>{
 const exposed=exposureRun(defs[0],1,0,2,0);
 assert(exposed.cameraAlertAt!==null);assert.equal(exposed.spottedBy,'01-09-cam1');assert(exposed.caught&&!exposed.clear);
 const w=MUSEUM_FINALE_WITNESSES['01-09'].quick;
 const protectedRun=exposureRun(defs[0],w.approach,w.escape,w.mode,w.delay);
 assert(protectedRun.clear);assert.equal(protectedRun.cameraAlertAt,null);assert.equal(protectedRun.cameras[0].longest,0);
});


test('Crown Collection CCTV guards the separate west visitor threshold while the eastern approach stays readable',()=>{
 const exposed=exposureRun(defs[1],1,0,2,5);
 assert(exposed.cameraAlertAt!==null);assert.equal(exposed.spottedBy,'01-10-cam1');assert(exposed.caught&&!exposed.clear);
 const w=MUSEUM_FINALE_WITNESSES['01-10'].quick;
 const protectedRun=exposureRun(defs[1],w.approach,w.escape,w.mode,w.delay);
 assert(protectedRun.clear);assert.equal(protectedRun.cameraAlertAt,null);assert.equal(protectedRun.cameras[0].longest,0);
});
