/** Runtime-only CCTV parity and continuous-input evidence. No camera overrides. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY,GUARD_TUNING} from '../../src/game/guards/guardTuning';
import {createSecurityCamera,CAMERA_TUNING} from '../../src/game/security/cctv';
import {Awareness} from '../../src/game/core/types';
export type RuntimeScenario={route:number;escape:number;mode:number;delay:number};
export function loadRuntimeMission(id:string){const def=campaignStages.find(d=>d.id===id);assert(def,`Runtime mission missing: ${id}`);return structuredClone(def);}
export function runtimeCameraSnapshot(id:string){
 const def=loadRuntimeMission(id),stage=compileStage(def),state=createPlaygroundState(stage),compiled=stage.cameras??[];
 assert.deepEqual(state.securityCameras,compiled.map(createSecurityCamera));
 const authored=def.cameras??[];assert.equal(authored.length,compiled.length);assert.equal(authored.length,state.securityCameras.length);
 authored.forEach((a,i)=>{const c=compiled[i],s=state.securityCameras[i];assert.equal(c.x,a.x*TILE);assert.equal(c.y,a.y*TILE);assert.equal(c.range,a.range*TILE);assert.equal(s.id,a.id);assert.equal(s.centerFacing,a.centerFacing);assert.equal(s.visionRange,a.range*TILE);assert.equal(s.visionHalfAngle,a.visionAngle/2);assert.equal(s.sweepAngle,a.sweepAngle);assert.equal(s.sweepSpeed,a.sweepSpeed);assert.equal(s.pauseAtEnds,a.pauseAtEnds);assert.equal(s.suspicionRate,a.suspicionRate??GUARD_TUNING.baseGain);assert.equal(s.sweepDirection,1);assert.equal(s.sweepOffset,0);assert.equal(s.pauseRemaining,0);});
 return {id,runtimeDataHash:createHash('sha256').update(JSON.stringify(def)).digest('hex'),authored,compiled,tuning:CAMERA_TUNING,defaultSuspicionRate:GUARD_TUNING.baseGain,visionBlockers:stage.visionBlockers,movementBlockers:stage.movementBlockers,state:state.securityCameras.map(c=>({id:c.id,x:c.x,y:c.y,centerFacing:c.centerFacing,range:c.visionRange,visionAngle:c.visionHalfAngle*2,sweepAngle:c.sweepAngle,sweepSpeed:c.sweepSpeed,pauseAtEnds:c.pauseAtEnds,suspicionRate:c.suspicionRate,enabled:true,sweepDirection:c.sweepDirection,sweepOffset:c.sweepOffset,pauseRemaining:c.pauseRemaining}))};
}
export function runRuntimeReplay(id:string,scenario:RuntimeScenario){
 const def=loadRuntimeMission(id),stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 const entry=def.testRoutes![scenario.route].points,points=[...entry,...def.escapeRoutes![scenario.escape].points.slice(1)];
 const metrics=s.securityCameras.map(c=>({id:c.id,totalExposure:0,maxContinuousExposure:0,currentExposure:0,maxSuspicion:0,firstDetectionAt:null as number|null,detections:0,guardOverlapSeconds:0,firstOverlapGuards:[] as string[]}));
 let leg=1,pickupAt:number|null=null,theftAt:number|null=null,spottedAt:number|null=null,searchAt:number|null=null,guardSearchAt:number|null=null,losBreak=false,saw=false;
 for(let f=0;f<9000&&!s.events.caught&&!s.mission.complete;f++){
  const issued=s.t>=scenario.delay;
  if(issued){s.playerMode=leg>=entry.length?3:scenario.mode;s.player.tx=points[leg].x*TILE;s.player.ty=points[leg].y*TILE;s.player.hasTarget=true;}
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  assert(Number.isFinite(s.player.x)&&Number.isFinite(s.player.y));
  if(s.mission.treasure&&pickupAt===null)pickupAt=s.t;if(s.events.theftAlert&&theftAt===null)theftAt=s.t;if(s.events.globalAlert&&spottedAt===null)spottedAt=s.t;if(s.events.phase==='SEARCH'&&searchAt===null)searchAt=s.t;if(s.guards.some(g=>g.awareness===Awareness.Search)&&guardSearchAt===null)guardSearchAt=s.t;
  const guardSees=s.guards.filter(g=>g.canSee).map(g=>g.id),sees=guardSees.length>0;if(saw&&!sees&&s.events.globalAlert)losBreak=true;saw=sees;
  s.securityCameras.forEach((c,i)=>{const m=metrics[i];if(c.canSee){m.totalExposure+=1/60;m.currentExposure+=1/60;m.maxContinuousExposure=Math.max(m.maxContinuousExposure,m.currentExposure);if(sees){m.guardOverlapSeconds+=1/60;if(!m.firstOverlapGuards.length)m.firstOverlapGuards=guardSees;}}else m.currentExposure=0;m.maxSuspicion=Math.max(m.maxSuspicion,c.suspicion);if(c.alerted&&m.firstDetectionAt===null)m.firstDetectionAt=s.t;m.detections=c.alertRevision;});
  if(issued&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
 }
 return {id,...scenario,routeName:def.testRoutes![scenario.route].name,clear:s.mission.complete,caught:s.events.caught,caughtBy:s.events.caughtBy,finalLeg:leg,timeout:!s.mission.complete&&!s.events.caught,time:s.t,pickupAt,theftAt,spottedAt,search:searchAt!==null,searchAt,guardSearchAt,losBreak,cameras:metrics};
}
export const RUNTIME_MUSEUM_WITNESSES=[{id:'01-05',route:1,escape:0,mode:1,delay:0},{id:'01-08',route:1,escape:1,mode:2,delay:.5},{id:'01-10',route:0,escape:0,mode:1,delay:3}];

export function writeRuntimeCctvQA(){
 const ids=['01-05','01-08','01-10'];
 const safeMain=RUNTIME_MUSEUM_WITNESSES.map(({id,...scenario})=>runRuntimeReplay(id,scenario));
 const safe10=runRuntimeReplay('01-10',{route:1,escape:0,mode:3,delay:1});
 const risk=ids.map(id=>runRuntimeReplay(id,{route:2,escape:0,mode:3,delay:0}));
 const report={method:'Production campaignStages → compileStage → createPlaygroundState/createSecurityCamera. Real stepPlayground at60Hz, authored spawn and continuous targets, no teleport/disabled AI. Safe and main identified by routeName. Offline evidence, no simulator/device claim.',parity:ids.map(runtimeCameraSnapshot),safeMain,safe10,risk,runtimeModified:false,nativeVerified:false};
 mkdirSync('Reports/MuseumV92',{recursive:true});writeFileSync('Reports/MuseumV92/runtime-camera-replays.json',JSON.stringify(report,null,2)+'\n');return report;
}
