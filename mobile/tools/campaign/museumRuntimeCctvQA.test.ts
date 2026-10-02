import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {loadRuntimeMission,runtimeCameraSnapshot,writeRuntimeCctvQA} from './museumRuntimeCctvQA';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {BODY,GUARD_TUNING} from '../../src/game/guards/guardTuning';
import {createSecurityCamera,stepSecurityCameras,CAMERA_TUNING} from '../../src/game/security/cctv';
import {createGuardEvents} from '../../src/game/guards/guardBrain';
import {wrapAngle} from '../../src/game/core/math';
type Point={x:number;y:number};
const sensorEvidence:unknown[]=[];
for(const id of ['01-05','01-08','01-10'])test(`${id} runtime camera source parity and actual geometry A/B/C/D`,()=>{
 const original=JSON.stringify(campaignStages.find(d=>d.id===id)),def=loadRuntimeMission(id),snapshot=runtimeCameraSnapshot(id),stage=compileStage(def),nav=buildNavigation(stage,BODY.playerRadius);
 assert.equal(JSON.stringify(def),original);assert(snapshot.state.length>0);
 const points:Point[]=[];for(let y=.5;y<stage.rows;y+=.25)for(let x=.5;x<stage.cols;x+=.25)points.push({x:x*TILE,y:y*TILE});
 const reachable=(p:Point)=>{if(!clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.playerRadius))return false;const path=findPath(nav,stage.playerSpawn.x,stage.playerSpawn.y,p.x,p.y);return path.length>=2&&Math.hypot(path.at(-2)!-p.x,path.at(-1)!-p.y)<.01;};
 const accessible=points.filter(reachable);
 for(const spec of stage.cameras??[]){
  const candidates=[...accessible].sort((a,b)=>Math.hypot(a.x-spec.x,a.y-spec.y)-Math.hypot(b.x-spec.x,b.y-spec.y));
  const outside=candidates.find(p=>(Math.hypot(p.x-spec.x,p.y-spec.y)>spec.range||Math.abs(wrapAngle(Math.atan2(p.y-spec.y,p.x-spec.x)-spec.centerFacing))>spec.sweepAngle+spec.visionAngle/2+.05));assert(outside,`${spec.id} reachable outside swept cone (range independent)`);
  const a=createSecurityCamera(spec),ae=createGuardEvents();for(let f=0;f<720;f++)stepSecurityCameras([a],{...outside,gait:1},stage.visionBlockers,ae,1/60,(f+1)/60);assert.equal(a.suspicion,0);assert.equal(ae.globalAlert,false);
  const visible=candidates.find(p=>{const c=createSecurityCamera(spec),e=createGuardEvents();for(let f=0;f<18;f++){stepSecurityCameras([c],{...p,gait:1},stage.visionBlockers,e,1/60,(f+1)/60);if(!c.canSee)return false;}return c.suspicion>0&&c.suspicion<1;});assert(visible,`${spec.id} reachable partial exposure`);
  const c=createSecurityCamera(spec),e=createGuardEvents();let t=0;const tick=(p:Point)=>{t+=1/60;stepSecurityCameras([c],{...p,gait:1},stage.visionBlockers,e,1/60,t);};for(let f=0;f<18;f++)tick(visible);const partial=c.suspicion;assert(partial>0&&partial<1);assert.equal(e.globalAlert,false);
  for(let f=0;f<720&&!c.alerted;f++)tick(visible);assert(c.alerted,`${spec.id} sustained sweep exposure alerts`);assert.equal(c.suspicion,1);assert.equal(e.cameraAlertRevision,1);assert(e.globalAlert);const detectedAt=t,known=[e.globalX,e.globalY];
  const blockedPoint=candidates.find(p=>Math.hypot(p.x-c.x,p.y-c.y)<c.visionRange&&Math.abs(wrapAngle(Math.atan2(p.y-c.y,p.x-c.x)-c.centerFacing))<c.sweepAngle+c.visionHalfAngle&&!clearSegment(c.x,c.y,p.x,p.y,stage.visionBlockers));const hidden=blockedPoint??outside;
  for(let f=0;blockedPoint&&f<720&&Math.abs(wrapAngle(Math.atan2(hidden.y-c.y,hidden.x-c.x)-c.facing))>=c.visionHalfAngle;f++)tick(visible);if(blockedPoint)assert(Math.abs(wrapAngle(Math.atan2(hidden.y-c.y,hidden.x-c.x)-c.facing))<c.visionHalfAngle,'LOS-break point lies within current cone');
  tick(hidden);assert.equal(c.canSee,false);assert.equal(c.suspicion,1);assert.deepEqual([e.globalX,e.globalY],known);
  for(let f=0;f<Math.ceil((GUARD_TUNING.memorySeconds+.1)*60);f++){tick(hidden);assert.equal(c.canSee,false);assert.deepEqual([e.globalX,e.globalY],known);}assert(c.suspicion<1);for(let f=0;f<600;f++)tick(hidden);assert.equal(c.suspicion,0);assert.equal(c.alerted,false);assert.equal(e.cameraAlertRevision,1);
  sensorEvidence.push({id,camera:spec.id,outside,partial:{point:visible,seconds:.3,suspicion:partial},full:{detectedAt,lastKnown:known},losBreak:{point:hidden,cause:blockedPoint?'ACTUAL_RUNTIME_LOS_BLOCKER':'OUTSIDE_CONE_OR_RANGE',geometryBlockedCase:blockedPoint?'PASS':'N/A: no reachable occluded point in authored swept coverage; no synthetic cover added',memoryRetained:true,finalSuspicion:c.suspicion}});
 }
 assert.equal(JSON.stringify(campaignStages.find(d=>d.id===id)),original,'source data unchanged');
 mkdirSync('Reports/MuseumV92',{recursive:true});writeFileSync('Reports/MuseumV92/runtime-camera-sensor-qa.json',JSON.stringify({method:'Real runtime camera configs and geometry. Isolated point perception probes at reachable positions, not player survival claims.',tuning:CAMERA_TUNING,sensorEvidence},null,2)+'\n');
});
test('Runtime Museum safe/main pickup → escape and meaningful risk pressure',()=>{
 const r=writeRuntimeCctvQA();for(const run of r.safeMain){assert(run.clear&&!run.caught,run.id);assert(run.pickupAt!==null);assert(run.finalLeg>1);}
 assert(r.safe10.clear&&!r.safe10.caught);assert(r.safe10.pickupAt!==null);assert(r.safe10.routeName.startsWith('safe:'));
 const security=r.safeMain.find(run=>run.id==='01-08')!;assert(security.theftAt!==null);assert(security.spottedAt!==null);assert(security.search);assert(security.guardSearchAt!==null);assert(security.losBreak);
 for(const run of r.risk)assert(run.caught||run.spottedAt!==null,`${run.id} risk remains dangerous`);
});

test('Changing any authored CCTV field flows through production compiler and state (no stale QA constants)',()=>{
 const original=JSON.stringify(campaignStages.find(d=>d.id==='01-08'));
 const fields={id:'parity-probe',x:11.25,y:12.75,centerFacing:.217,range:6.91,visionAngle:.73,sweepAngle:.37,sweepSpeed:.193,pauseAtEnds:.72,suspicionRate:.53};
 for(const [field,value] of Object.entries(fields)){
  const def=loadRuntimeMission('01-08'),authored=def.cameras![0];Object.assign(authored,{[field]:value});
  const stage=compileStage(def),state=createSecurityCamera(stage.cameras![0]);
  const property=field==='range'?'visionRange':field==='visionAngle'?'visionHalfAngle':field;
  const expected=field==='x'||field==='y'||field==='range'?Number(value)*TILE:field==='visionAngle'?Number(value)/2:value;
  assert.equal((state as unknown as Record<string,unknown>)[property],expected,`${field} must propagate`);
  assert.deepEqual(createPlaygroundState(stage).securityCameras[0],state);
 }
 assert.equal(JSON.stringify(campaignStages.find(d=>d.id==='01-08')),original);
});
