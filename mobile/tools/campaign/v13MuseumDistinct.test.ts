import assert from 'node:assert/strict';
import {test} from 'node:test';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {V13_MUSEUM_DISTINCT,MUSEUM_DISTINCT_WITNESSES} from './v13MuseumDistinct';
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

const source=[...raw,...V13_MUSEUM_DISTINCT.map((m,i)=>({...structuredClone(raw.find(d=>d.id===`01-0${i+1}`)!),id:m.id,number:46+i,chapter:1,mission:6+i}))] as StageDefinition[];
const plans=V13_MUSEUM_DISTINCT.map(m=>watchExit(polishPatrol(authorCoverCheckpoints(m))));
const defs=plans.map(m=>composeV13(m,source));

test('The three redesigned Museum maps have different placement triples and real room choices in both approach lanes',()=>{
 assert.deepEqual(plans.map(m=>m.id),['01-06','01-07','01-08']);
 assert.equal(new Set(plans.map(m=>m.placement.join('/'))).size,3);
 for(const [i,m] of plans.entries()){
  assert(m.approach.some(room=>!m.risk.includes(room)),`${m.id}: protected-only room`);
  assert(m.risk.some(room=>!m.approach.includes(room)),`${m.id}: risk-only room`);
  const def=defs[i];assert.deepEqual([placement(def,def.playerSpawn),placement(def,def.objective!),placement(def,def.exitPosition!)],m.placement);
 }
});

test('Remembered spatial decisions differ: staggered-room bypass, opposite pavilion arcs, and a restoration T junction',()=>{
 const [enfilade,ring,branch]=plans;
 assert(enfilade.approach.includes('b')&&!enfilade.risk.includes('b'));
 assert(enfilade.risk.includes('j')&&!enfilade.approach.includes('j'));
 assert(ring.approach.includes('n')&&ring.approach.includes('r')&&!ring.approach.includes('w'));
 assert(ring.risk.includes('w')&&!ring.risk.includes('n'));
 const central=defs[1].topologyPlan!.rooms.find(r=>r.id==='o')!;
 assert(central.x>8&&central.y>6&&central.x+central.w<defs[1].layout[0].length-8,'prize pavilion is physically in the centre');
 const neighbors=new Set(branch.edges.filter(e=>e.from==='h'||e.to==='h').map(e=>e.from==='h'?e.to:e.from));
 assert(neighbors.size>=3,'restoration has an actual T junction');
 assert(branch.approach.includes('v')&&!branch.risk.includes('v'));
 assert(branch.risk.includes('h')&&!branch.approach.includes('h'));
 assert.deepEqual(branch.alternateEscape.slice(-5),['r','l','q','m','x'],'a new workshop and handling room commit toward the lower exit');
});

for(const [i,def] of defs.entries()){
 test(`${def.id}: final cover-wrapped architecture passes the complete release audit without exceptions`,()=>{
  const audit=auditMission(def);assert.deepEqual(audit.issues,[]);assert.deepEqual(audit.known,[]);
  assert.deepEqual(fakeGaps(def),{sealed:[],squeezes:[]});assert(emptiness(def).worst.clearance<=2.8);
  assert.equal(def.guards.length,i===2?3:2);assert.equal(def.cameras?.length??0,0);
  assert.equal(def.objective?.highSecurity,false);
 });
 for(const kind of ['quick','alternate'] as const)test(`${def.id}: ${kind} escape has three neighboring clean real-AI departure witnesses`,()=>{
  const w=MUSEUM_DISTINCT_WITNESSES[def.id as keyof typeof MUSEUM_DISTINCT_WITNESSES][kind];
  for(const offset of [-.25,0,.25]){
   let evidence:number|undefined;
   const run=exposureRun(def,w.approach,w.escape,w.mode,w.delay+offset,s=>evidence=extraDetectionsForMastery(s.events));
   assert(run.clear&&!run.caught,JSON.stringify({id:def.id,kind,offset,...run}));assert.equal(evidence,0);
  }
 });
 test(`${def.id}: arrival allows ten seconds of room reading without an automatic capture or alarm`,()=>{
  const stage=compileStage(def),state=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius);state.playerMode=0;
  for(let frame=0;frame<600;frame++)stepPlayground(state,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  assert.equal(state.events.caught,false);assert.equal(extraDetectionsForMastery(state.events),0);assert.equal(state.theft.empty,false);
 });
 test(`${def.id}: genuine prize inspection survives final cover assignments without a timed alarm`,()=>{
  const stage=compileStage(def),state=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius);assert.equal(state.theft.alarmDelay,undefined);
  const hidden={x:-10000,y:-10000,gait:0};let time=0;
  const tick=()=>{time+=1/60;stepGuards(state.guards,hidden,stage.visionBlockers,nav,1/60,state.events,time,true,1,state.theft);};
  for(let frame=0;frame<120;frame++)tick();assert.equal(state.events.theftWhistleRevision,0);
  state.theft.empty=true;
  for(let frame=0;frame<7200&&!state.events.theftAlert;frame++)tick();
  assert(state.events.theftAlert);assert.equal(state.events.theftWhistleRevision,1);assert.equal(state.events.spottedWhistleRevision,0);
 });
}

test('West Exhibits bypass offers a different live patrol window rather than falsely claiming a shorter route',()=>{
 const def=defs[0];let evidence:number|undefined;
 const exposed=exposureRun(def,0,0,2,2);
 const bypass=exposureRun(def,1,0,2,2,s=>evidence=extraDetectionsForMastery(s.events));
 assert(exposed.caught&&exposed.spottedBy==='01-06-g1');
 assert(bypass.clear&&!bypass.caught);assert.equal(evidence,0);
});
