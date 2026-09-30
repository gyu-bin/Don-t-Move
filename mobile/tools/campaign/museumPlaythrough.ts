import {museumMission02,museumProduction} from './museumProduction';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';

/** Continuous spawn-to-exit input. No teleport, guard override or forced pickup. */
export function playthrough(def:StageDefinition,routeIndex:number,mode:number,delay:number,geometryOnly=false,escapeIndex=0){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 const state=createPlaygroundState(stage);state.playerMode=0;
 if(geometryOnly)state.guards=[]; // Explicit geometry-only evidence; never a full AI witness.
 const points=[...def.testRoutes![routeIndex].points,...def.escapeRoutes![escapeIndex].points.slice(1)];
 let leg=1,maxSuspicion=0,collisionFailures=0,distance=0,pickupAt:number|null=null,stationary=0;const guardSuspicion=state.guards.map(()=>0);
 for(let f=0;f<60*120&&!state.events.caught&&!state.mission.complete;f++){
  if(f>=delay*60){
   state.playerMode=mode;
   const p=points[leg];state.player.tx=p.x*TILE;state.player.ty=p.y*TILE;state.player.hasTarget=true;
  }
  const before={x:state.player.x,y:state.player.y};
  stepPlayground(state,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  const moved=Math.hypot(state.player.x-before.x,state.player.y-before.y);distance+=moved;
  if(!clearSegment(before.x,before.y,state.player.x,state.player.y,stage.movementBlockers,BODY.playerRadius))collisionFailures++;
  if(state.mission.treasure&&pickupAt===null)pickupAt=state.t;
  stationary=f>=delay*60&&moved<0.001?stationary+1/60:0;
  if(stationary>8)break;
  maxSuspicion=Math.max(maxSuspicion,...state.guards.map(g=>g.suspicion));
  state.guards.forEach((g,i)=>{guardSuspicion[i]=Math.max(guardSuspicion[i],g.suspicion);});
  if(f>=delay*60&&Math.hypot(state.player.x-state.player.tx,state.player.y-state.player.ty)<2&&leg<points.length-1)leg++;
 }
 return {clear:state.mission.complete,caught:state.events.caught,alert:state.events.globalAlert,alertCount:state.events.alertCount,theft:state.events.theftAlert,maxSuspicion,guardSuspicion,time:state.t,leg,geometryOnly,collisionFailures,distanceTiles:distance/TILE,pickupAt,escapeSeconds:pickupAt===null?null:state.t-pickupAt};
}

/** Bounded deterministic witnesses: normal input only, never teleports or AI overrides.
 * Direct Chase no longer brakes near the player, so a fixed-route bot that is spotted at
 * close range is caught (as intended). A witness therefore has to be a stealth timing
 * window: every authored escape route and each whole-second departure up to 40 s. */
export const WITNESS_DELAYS=Array.from({length:41},(_,i)=>i);
export function findWitness(def:StageDefinition,routeIndex:number,silent=false){
 let attempts=0,best:ReturnType<typeof playthrough>|null=null;
 for(const mode of [2,3,1])for(const delay of WITNESS_DELAYS)for(const escapeIndex of def.escapeRoutes!.map((_,i)=>i)){
  const result=playthrough(def,routeIndex,mode,delay,false,escapeIndex);attempts++;
  if(!best||result.leg>best.leg)best=result;
  if(result.clear&&(!silent||(!result.theft&&result.alertCount===0)))return {found:true,attempts,mode,escapeIndex,departureDelaySeconds:delay,...result};
 }
 return {found:false,attempts,mode:null,escapeIndex:null,departureDelaySeconds:null,...best!};
}

export function museumPlaythrough(routeIndex:number,mode:number,delay:number){
 return playthrough(museumProduction(),routeIndex,mode,delay);
}
export function museumMission02Playthrough(routeIndex:number,mode:number,delay:number){
 return playthrough(museumMission02(),routeIndex,mode,delay);
}
if(process.argv[1]?.endsWith('museumPlaythrough.ts'))for(let r=0;r<2;r++){
 let found=false;
 for(const mode of [2,1,3])for(let delay=0;delay<=20;delay+=2){
  const result=museumPlaythrough(r,mode,delay);
  if(result.clear){console.log({route:r,mode,delay,...result});found=true;break;}
 }
 if(!found)console.log({route:r,clear:false});
}
