import {BANK_PLANS} from './v5BankPlans';
import {Awareness} from '../../src/game/core/types';
/** Continuous real-engine inputs, including optional idle after pickup; never teleport or suppress AI. */
import assert from 'node:assert/strict';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
export type Scenario={route:number;escape:number;mode:number;delay:number;objectiveHold?:number;cameraPeekCycles?:number;evadeAfterAlert?:number;zoneWait?:{zone:string;seconds:number};cameraDetour?:{cameraIndex:number;cycles:number};inputDetour?:{x:number;y:number}[];alertRefuge?:{point:{x:number;y:number};seconds:number;via?:{x:number;y:number}[]}};
export function runV5BankMission(def:StageDefinition,scenario:Scenario,onFrame?:(state:ReturnType<typeof createPlaygroundState>)=>void){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 let evadeHoldAt=-1;let peekStart=-1,peekEnd=-1,peekResume=-1;const entry=def.testRoutes![scenario.route].points,escapePoints=[...def.escapeRoutes![scenario.escape].points.slice(1)];const expand=(a:{x:number;y:number},b:{x:number;y:number})=>{const p=findPath(nav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);if(p.length<2||Math.hypot(p.at(-2)!-b.x*TILE,p.at(-1)!-b.y*TILE)>.01)throw Error(`${def.id}: camera probe unreachable`);const out=[];for(let j=0;j<p.length;j+=2)out.push({x:p[j]/TILE,y:p[j+1]/TILE});return out;};
 if(scenario.cameraDetour){const camera=def.cameras![scenario.cameraDetour.cameraIndex],probe={x:camera.x+Math.cos(camera.centerFacing)*3.3,y:camera.y+Math.sin(camera.centerFacing)*3.3};let at=0;for(let j=1;j<escapePoints.length;j++)if(Math.hypot(escapePoints[j].x-probe.x,escapePoints[j].y-probe.y)<Math.hypot(escapePoints[at].x-probe.x,escapePoints[at].y-probe.y))at=j;const anchor=escapePoints[at],detour=expand(anchor,probe);for(let j=0;j<scenario.cameraDetour.cycles;j++)detour.push(probe,{x:probe.x+.25,y:probe.y+.25});const returnLeg=expand(probe,anchor);peekStart=entry.length+at+1;peekEnd=peekStart+detour.length;peekResume=peekEnd+returnLeg.length;escapePoints.splice(at+1,0,...detour,...returnLeg);}

 if(scenario.inputDetour?.length){let anchor=entry.at(-1)!;const detour=[];for(const point of scenario.inputDetour){detour.push(...expand(anchor,point));anchor=point;}detour.push(...expand(anchor,escapePoints[0]));escapePoints.unshift(...detour);}
 const points=[...entry,...escapePoints];
 const plan=BANK_PLANS[def.mission!-1],zoneVisits:{zone:string;at:number;phase:string}[]=[],eventTrace:{event:string;at:number;source?:string;guardIds?:string[];cameraIds?:string[];searchGuardIds?:string[];globalPhase?:string}[]=[];let previousZone='',globalSearchAt:number|null=null;
 const cameraTelemetry=s.securityCameras.map(c=>({id:c.id,seenSeconds:0,maxSuspicion:0,maxGain:0}));let waitUntil=0,zoneWaitUsed=false;let leg=1,pickupAt:number|null=null,theftAt:number|null=null,spottedAt:number|null=null,search=false,losBreak=false,saw=false;
 for(let f=0;f<9000&&!s.events.caught&&!s.mission.complete;f++){
  if(s.events.globalAlert&&peekStart>=0&&leg>=peekStart&&leg<peekEnd){
   if(scenario.alertRefuge){let current={x:s.player.x/TILE,y:s.player.y/TILE};const refuge=[];for(const p of[...(scenario.alertRefuge.via??[]),scenario.alertRefuge.point]){refuge.push(...expand(current,p));current=p;}const rest=points.slice(peekResume),back=expand(scenario.alertRefuge.point,rest[0]);points.splice(leg,points.length-leg,...refuge,...back,...rest);evadeHoldAt=leg+refuge.length-1;peekStart=-1;peekEnd=-1;}
   else leg=peekEnd;
   eventTrace.push({event:'INPUT_ESCAPE_REACTION',at:Math.round(s.t*1000)/1000});
  }
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
  if(targetIssued&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1){if(leg===evadeHoldAt){waitUntil=s.t+(scenario.alertRefuge?.seconds??scenario.evadeAfterAlert??0);eventTrace.push({event:'NEUTRAL_COVER_WAIT',at:Math.round(s.t*1000)/1000});}leg++;}
  onFrame?.(s);
 }
 const round=(v:number|null)=>v===null?null:Math.round(v*1000)/1000;
 if(s.events.caught)eventTrace.push({event:'CAUGHT',at:Math.round(s.t*1000)/1000,source:s.events.caughtBy});if(s.mission.complete)eventTrace.push({event:'COMPLETE',at:Math.round(s.t*1000)/1000});
 return {cameraTelemetry,zoneVisits,eventTrace,globalSearchAt:round(globalSearchAt),...scenario,clear:s.mission.complete,caught:s.events.caught,caughtBy:s.events.caughtBy,finalLeg:leg,timeout:!s.mission.complete&&!s.events.caught,time:round(s.t),pickupAt:round(pickupAt),theftAt:round(theftAt),spottedAt:round(spottedAt),losBreak,search};
}
