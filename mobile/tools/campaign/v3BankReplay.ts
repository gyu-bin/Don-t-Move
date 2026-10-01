import {BANK_PLANS} from './v3BankPlans';
import {Awareness} from '../../src/game/core/types';
/** Continuous real-engine inputs, including optional idle after pickup; never teleport or suppress AI. */
import assert from 'node:assert/strict';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
export type Scenario={route:number;escape:number;mode:number;delay:number;objectiveHold?:number;cameraPeekCycles?:number;evadeAfterAlert?:number;zoneWait?:{zone:string;seconds:number}};
export function runV3BankMission(def:StageDefinition,scenario:Scenario,onFrame?:(state:ReturnType<typeof createPlaygroundState>)=>void){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 let evadeHoldAt=-1;let peekStart=-1,peekEnd=-1;const entry=def.testRoutes![scenario.route].points,escapePoints=[...def.escapeRoutes![scenario.escape].points.slice(1)];if(scenario.cameraPeekCycles&&def.mission===10){const at=escapePoints.findIndex(p=>Math.abs(p.x-36)<.01&&Math.abs(p.y-26.5)<.01);if(at<0)throw Error('Authored return-corridor waypoint absent');const peek=[];for(let i=0;i<scenario.cameraPeekCycles;i++)peek.push({x:27,y:26.5},{x:29,y:26.5});escapePoints.splice(at+1,0,...peek);peekStart=entry.length+at+1;peekEnd=peekStart+peek.length;}const points=[...entry,...escapePoints];
 const plan=BANK_PLANS[def.mission!-1],zoneVisits:{zone:string;at:number;phase:string}[]=[],eventTrace:{event:string;at:number;source?:string;guardIds?:string[];cameraIds?:string[];searchGuardIds?:string[];globalPhase?:string}[]=[];let previousZone='',globalSearchAt:number|null=null;
 const cameraTelemetry=s.securityCameras.map(c=>({id:c.id,seenSeconds:0,maxSuspicion:0,maxGain:0}));let waitUntil=0,zoneWaitUsed=false;let leg=1,pickupAt:number|null=null,theftAt:number|null=null,spottedAt:number|null=null,search=false,losBreak=false,saw=false;
 for(let f=0;f<9000&&!s.events.caught&&!s.mission.complete;f++){
  if(s.events.globalAlert&&peekStart>=0&&leg>=peekStart&&leg<peekEnd){if(scenario.evadeAfterAlert!==undefined){points.splice(peekEnd,0,{x:33,y:26.5},{x:31.5,y:31.5},{x:33,y:26.5});evadeHoldAt=peekEnd+1;}leg=peekEnd;eventTrace.push({event:'INPUT_ESCAPE_REACTION',at:Math.round(s.t*1000)/1000});}
  // Arrival must refer to a target issued on this frame. Crossing the start
  // delay during stepPlayground otherwise accepts the stale spawn target.
  const inWaitZone=!!scenario.zoneWait&&plan.rooms.some(r=>r.name===scenario.zoneWait!.zone&&s.player.x/TILE>=r.x&&s.player.x/TILE<r.x+r.w&&s.player.y/TILE>=r.y&&s.player.y/TILE<r.y+r.h);if(pickupAt!==null&&inWaitZone&&!zoneWaitUsed){zoneWaitUsed=true;waitUntil=s.t+scenario.zoneWait!.seconds;}const holding=(pickupAt!==null && s.t<pickupAt+(scenario.objectiveHold??0))||s.t<waitUntil;
  const targetIssued=s.t>=scenario.delay&&!holding;
  if(holding){s.playerMode=0;s.player.hasTarget=false;}
  if(targetIssued){s.playerMode=leg>=entry.length?3:scenario.mode;s.player.tx=points[leg].x*TILE;s.player.ty=points[leg].y*TILE;s.player.hasTarget=true;}
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  s.securityCameras.forEach((c,i)=>{cameraTelemetry[i].seenSeconds+=c.canSee?1/60:0;cameraTelemetry[i].maxSuspicion=Math.max(cameraTelemetry[i].maxSuspicion,c.suspicion);cameraTelemetry[i].maxGain=Math.max(cameraTelemetry[i].maxGain,c.detectionGain);});
  assert(Number.isFinite(s.player.x)&&Number.isFinite(s.player.y));for(const g of s.guards)assert(Number.isFinite(g.x)&&Number.isFinite(g.y));
  const currentZone=plan.rooms.find(r=>s.player.x/TILE>=r.x&&s.player.x/TILE<r.x+r.w&&s.player.y/TILE>=r.y&&s.player.y/TILE<r.y+r.h)?.name??'connecting corridor';
  if(currentZone!==previousZone){zoneVisits.push({zone:currentZone,at:Math.round(s.t*1000)/1000,phase:pickupAt===null?'approach':'escape'});previousZone=currentZone;}
  const trace=(event:string,source?:string)=>eventTrace.push({event,at:Math.round(s.t*1000)/1000,source,guardIds:s.guards.filter(g=>g.canSee).map(g=>g.id),cameraIds:s.securityCameras.filter(c=>c.canSee).map(c=>c.id)});
  if(s.mission.treasure&&pickupAt===null){pickupAt=s.t;trace('OBJECTIVE');}
  if(s.events.theftAlert&&theftAt===null){theftAt=s.t;trace('THEFT_ALERT',s.events.theftGuard);}
  if(s.events.theftRolesAssigned&&globalSearchAt===null&&s.guards.some(g=>g.awareness===Awareness.Investigate)){globalSearchAt=s.t;trace('GLOBAL_THEFT_SEARCH');}
  if(s.events.globalAlert&&spottedAt===null){spottedAt=s.t;trace('PLAYER_SPOTTED',s.events.spottedSource||s.events.cameraAlertSource||s.events.whistleGuard);}

  const sees=s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);if(saw&&!sees&&s.events.globalAlert&&!losBreak){losBreak=true;trace('LOS_BREAK');}saw=sees;if(spottedAt!==null&&losBreak&&!sees&&s.guards.some(g=>g.awareness===Awareness.Search)&&!search){search=true;eventTrace.push({event:'GUARD_SEARCH_ACTIVE',at:Math.round(s.t*1000)/1000,searchGuardIds:s.guards.filter(g=>g.awareness===Awareness.Search).map(g=>g.id),globalPhase:s.events.phase});}
  if(targetIssued&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1){if(leg===evadeHoldAt){waitUntil=s.t+(scenario.evadeAfterAlert??0);eventTrace.push({event:'NEUTRAL_COVER_WAIT',at:Math.round(s.t*1000)/1000});}leg++;}
  onFrame?.(s);
 }
 const round=(v:number|null)=>v===null?null:Math.round(v*1000)/1000;
 if(s.events.caught)eventTrace.push({event:'CAUGHT',at:Math.round(s.t*1000)/1000,source:s.events.caughtBy});if(s.mission.complete)eventTrace.push({event:'COMPLETE',at:Math.round(s.t*1000)/1000});
 return {cameraTelemetry,zoneVisits,eventTrace,globalSearchAt:round(globalSearchAt),...scenario,clear:s.mission.complete,caught:s.events.caught,caughtBy:s.events.caughtBy,finalLeg:leg,timeout:!s.mission.complete&&!s.events.caught,time:round(s.t),pickupAt:round(pickupAt),theftAt:round(theftAt),spottedAt:round(spottedAt),losBreak,search};
}
