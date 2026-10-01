/** 60 Hz displacement probes. No native device/FPS claim; synthetic corridor isolates controllers. */
import fs from 'node:fs';
import {corridor,measureSpeeds} from '../campaign/chaseBalanceQA';
import {pursue} from '../../src/game/guards/guardTravel';
import {CONTACT_DISTANCE} from '../../src/game/guards/guardSystem';
import {stepPlayground} from '../../src/game/playground/playgroundState';
import {Awareness} from '../../src/game/core/types';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY,GUARD_TUNING} from '../../src/game/guards/guardTuning';
import {TILE} from '../../src/game/world/compileStage';
import {directChaseSpeed} from '../../src/game/guards/guardChaseSpeed';

export function galleryStraight(missionId='02-06'){
 const {stage,nav,s}=corridor(),g=s.guards[0];
 s.theft.missionId=missionId;s.playerMode=3;s.player.tx=4800;s.player.ty=s.player.y;s.player.hasTarget=true;
 s.events.globalAlert=true;s.events.globalRevision=1;g.awareness=Awareness.Chase;
 const samples=[{seconds:0,gap:Math.hypot(s.player.x-g.x,s.player.y-g.y),playerSpeed:0,guardSpeed:0}];
 let playerDistance=0,guardDistance=0,firstFullSpeed=-1,minNearSpeed=Infinity;
 for(let f=0;f<1800&&!s.events.caught;f++){
  const px=s.player.x,py=s.player.y,gx=g.x,gy=g.y;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  const pv=Math.hypot(s.player.x-px,s.player.y-py)*60,gv=Math.hypot(g.x-gx,g.y-gy)*60;
  if(firstFullSpeed<0&&gv>=directChaseSpeed(missionId)-.01)firstFullSpeed=s.t;
  if(f>=120&&f<360){playerDistance+=pv/60;guardDistance+=gv/60;}
  const gap=Math.hypot(s.player.x-g.x,s.player.y-g.y);
  if(gap<80&&!s.events.caught)minNearSpeed=Math.min(minNearSpeed,gv);
  if([119,239,359].includes(f))samples.push({seconds:(f+1)/60,gap,playerSpeed:pv,guardSpeed:gv});
 }
 return {missionId,samples,steadyPlayerSpeed:playerDistance/4,steadyGuardSpeed:guardDistance/4,firstTargetSpeedSeconds:firstFullSpeed,minNearSpeed,caught:s.events.caught,caughtAt:s.t};
}

export function controllerProfile(speed=GUARD_TUNING.runSpeed){
 const results=[];
 for(const mode of ['straight','turn90','reversal','obstacle','near'] as const){
  const {stage,s}=corridor(),g=s.guards[0];g.x=400;g.y=160;g.speed=0;
  g.facing=mode==='reversal'?Math.PI:mode==='turn90'?Math.PI/2:0;
  if(mode==='obstacle')stage.movementBlockers.push(560,40,600,200);
  const nav=buildNavigation(stage,BODY.guardRadius),samples=[];let zeros=0,partial=0,steady=0,max=0;
  for(let f=0;f<180;f++){
   // Continuous live body motion: keep target ahead, even in the near-range probe.
   g.targetX=mode==='near'?g.x+45:1000+speed*f/60;g.targetY=160;
   const x=g.x,y=g.y;pursue(g,nav,speed,1/60,f/60,CONTACT_DISTANCE);
   const actual=Math.hypot(g.x-x,g.y-y)*60;max=Math.max(max,actual);
   if(actual<1e-6)zeros++;else if(actual<speed-.01)partial++;else steady++;
   if([0,29,59,119,179].includes(f))samples.push({seconds:(f+1)/60,actualSpeed:actual,controllerSpeed:g.speed,x:g.x,y:g.y,pathIndex:g.pathIndex,pathLength:g.path.length});
  }
  results.push({mode,requestedSpeed:speed,acceleration:GUARD_TUNING.accel,turnRate:GUARD_TUNING.turnRateAlert,zeroFrames:zeros,partialFrames:partial,fullSpeedFrames:steady,maxActualSpeed:max,samples});
 }
 return results;
}

if(process.argv[1]?.endsWith('galleryChaseSpeedQA.ts')){
 const result={method:'Actual 60 Hz player and guard displacement; isolated synthetic corridor. Turns/path partial steps are explicitly measured, not inferred from target speed. Not native testing.',speeds:measureSpeeds(),museum:galleryStraight('01-10'),gallery:galleryStraight('02-06'),profiles:controllerProfile(directChaseSpeed('02-06'))};
 const out=process.env.OUT_JSON??'Reports/GalleryEnrichmentV1/chase-speed-qa.json';fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
