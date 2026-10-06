import assert from 'node:assert/strict';
import {test} from 'node:test';
import phase3Source from '../../docs/design/v12/phase3/SOURCE_STAGES.json';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {BODY} from '../../src/game/guards/guardTuning';
import {applyV11Museum} from './v11Museum';
import {auditV5Geometry} from './v5Geometry';
import {exposureRun} from './cameraExposure';
const campaignStages=phase3Source as import('../../src/game/levels/StageDefinition').StageDefinition[]; // Historical authoring contract; runtime is covered separately.
const changed=['01-01','01-04','01-05','01-08','01-10'];
const stage=(id:string)=>{const d=campaignStages.find(s=>s.id===id);assert(d,id);return d;};

test('V11 Museum authoring is pure, idempotent and protects every unlisted mission',()=>{
 for(const source of campaignStages){
  const snapshot=structuredClone(source),result=applyV11Museum(source);
  assert.deepEqual(source,snapshot,`${source.id}: mutated input`);
  assert.deepEqual(applyV11Museum(result),result,`${source.id}: cumulative overlay`);
  if(!changed.includes(source.id))assert.equal(result,source,`${source.id}: protected mission`);
 }
});
test('V11 Museum preserves entry/objective/exit, guard count and sensor/AI pressure parameters',()=>{
 for(const id of changed){
  const before=stage(id),after=applyV11Museum(before);
  for(const key of ['playerSpawn','objective','exitPosition','props','dressing','lights'] as const)assert.deepEqual(after[key],before[key],`${id} ${key}`);
  assert.equal(after.guards.length,before.guards.length);
  for(let i=0;i<after.guards.length;i++){
   const a=after.guards[i],b=before.guards[i];
   for(const key of ['id','role','theftRole','pace','visionRange','visionHalfAngle','startDelay'] as const)assert.deepEqual(a[key],b[key],`${id} guard ${i} ${key}`);
  }
  for(let i=0;i<(after.cameras?.length??0);i++){
   const a=after.cameras![i],b=before.cameras![i];
   assert.deepEqual({...a,centerFacing:b.centerFacing},b,`${id}: camera tuning changed`);
  }
 }
});
test('V11 Museum validates actual compiled radius18 reference legs and every guard search anchor',()=>{
 for(const id of changed)assert.deepEqual(auditV5Geometry(applyV11Museum(stage(id))).issues,[],id);
});
test('01-01 inspector wait is effective through semantic patrol compilation',()=>{
 const d=applyV11Museum(stage('01-01')),g=compileStage(d).guards.find(g=>g.id==='01-01-g2');
 assert(g);assert.equal(g.route[0].wait,2.4);assert.equal(g.route[0].look,-Math.PI/2);
});
test('Museum relief bays are real opaque LOS breaks rather than soft dressing or safe-zone immunity',()=>{
 const cases:[string,[number,number],[number,number]][]=[
  ['01-04',[14.2,4.8],[18,7.3]],
  ['01-08',[18.5,1.5],[10.5,1.8]],
  ['01-10',[9,25],[3,25]],
 ];
 for(const[id,a,b]of cases){
  const s=compileStage(applyV11Museum(stage(id)));
  assert.equal(clearSegment(a[0]*TILE,a[1]*TILE,b[0]*TILE,b[1]*TILE,s.visionBlockers),false,id);
 }
});
test('V11 Museum shared-runtime full heist witnesses reach CLEAR without teleporting or event mutation',()=>{
 for(const[id,r,e,mode,delay]of [
  ['01-04',0,0,1,2],['01-05',0,0,2,3],['01-05',1,0,1,0],['01-08',0,0,1,3],['01-10',0,0,1,3],
 ] as const){const result=exposureRun(applyV11Museum(stage(id)),r,e,mode,delay);
  assert.equal(result.clear,true,`${id}: ${JSON.stringify(result)}`);assert.equal(result.caught,false,id);
 }
});

test('V11 Museum every patrol and empty-case search stays outside blockers over 180 seconds',()=>{
 for(const id of changed)for(const empty of [false,true]){
  const compiled=compileStage(applyV11Museum(stage(id)));
  const nav=buildNavigation(compiled,BODY.guardRadius),s=createPlaygroundState(compiled);
  // Isolated scenario setup: player remains off-map; no teleport used in full-heist witnesses.
  s.theft.empty=empty;
  for(let f=0;f<180*60;f++){
   stepGuards(s.guards,{x:-1000,y:-1000,gait:0},compiled.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);
   for(const g of s.guards)assert(clearSegment(g.x,g.y,g.x,g.y,nav.blockers,BODY.guardRadius),`${id} ${g.id} empty=${empty} frame=${f} at ${g.x/TILE},${g.y/TILE}`);
  }
  if(empty)assert(s.events.theftAlert,`${id}: empty case was not discovered`);
 }
});
