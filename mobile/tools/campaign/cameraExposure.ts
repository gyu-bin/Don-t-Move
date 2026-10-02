/** QA probe: scripted route runs with per-camera exposure, to balance CCTV against authored routes.
 *  Usage: node --import tsx tools/campaign/cameraExposure.ts [ids...] */
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {BODY} from '../../src/game/guards/guardTuning';
export function exposureRun(def:StageDefinition,route:number,escape:number,mode:number,delay:number){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 const entry=def.testRoutes![route].points,points=[...entry,...def.escapeRoutes![escape].points.slice(1)];
 let leg=1;const run=s.securityCameras.map(()=>0),longest=s.securityCameras.map(()=>0),peak=s.securityCameras.map(()=>0);
 let cameraAlertAt:number|null=null,spottedBy='';
 for(let f=0;f<9000&&!s.events.caught&&!s.mission.complete;f++){
  const issued=s.t>=delay;
  if(issued){s.playerMode=leg>=entry.length?3:mode;s.player.tx=points[leg].x*TILE;s.player.ty=points[leg].y*TILE;s.player.hasTarget=true;}
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  s.securityCameras.forEach((c,i)=>{run[i]=c.canSee?run[i]+1/60:0;longest[i]=Math.max(longest[i],run[i]);peak[i]=Math.max(peak[i],c.suspicion);});
  if(cameraAlertAt===null&&(s.events.cameraAlertRevision??0)>0)cameraAlertAt=s.t;
  if(!spottedBy&&s.events.spottedSource)spottedBy=s.events.spottedSource;
  if(issued&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
 }
 return {clear:s.mission.complete,caught:s.events.caught,time:+s.t.toFixed(1),spottedBy,cameraAlertAt,
  cameras:s.securityCameras.map((c,i)=>({id:c.id,longest:+longest[i].toFixed(2),peak:+peak[i].toFixed(2)}))};
}
if(process.argv[1]?.endsWith('cameraExposure.ts')){
 const ids=process.argv.slice(2);
 for(const def of stages as unknown as StageDefinition[]){
  if(ids.length?!ids.includes(def.id):!(def.cameras?.length&&(def.chapter??9)<=3))continue;
  for(let r=0;r<def.testRoutes!.length;r++)for(let e=0;e<def.escapeRoutes!.length;e++)for(const mode of [1,2]){
   const best=[0,.5,1,2,3,5].map(delay=>({delay,...exposureRun(def,r,e,mode,delay)}));
   const wins=best.filter(b=>b.clear).map(b=>b.delay);
   const sample=best[0];
   console.log(def.id,`route${r}/esc${e}/${mode===1?'sneak':'walk'}`,'wins at delays',JSON.stringify(wins),'| delay0:',sample.clear?'CLEAR':sample.caught?'caught':'timeout','spotted',sample.spottedBy||'-',JSON.stringify(sample.cameras));
  }
 }
}
