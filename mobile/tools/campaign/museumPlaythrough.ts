import {museumMission02,museumProduction} from './museumProduction';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';

/** Continuous spawn-to-exit input. No teleport, guard override or forced pickup. */
function playthrough(def:ReturnType<typeof museumProduction>,routeIndex:number,mode:number,delay:number){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 const state=createPlaygroundState(stage);state.playerMode=0;
 const points=[...def.testRoutes![routeIndex].points,...def.escapeRoutes![0].points.slice(1)];
 let leg=1,maxSuspicion=0;
 for(let f=0;f<60*120&&!state.events.caught&&!state.mission.complete;f++){
  if(f>=delay*60){
   state.playerMode=mode;
   const p=points[leg];state.player.tx=p.x*TILE;state.player.ty=p.y*TILE;state.player.hasTarget=true;
  }
  stepPlayground(state,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  maxSuspicion=Math.max(maxSuspicion,...state.guards.map(g=>g.suspicion));
  if(f>=delay*60&&Math.hypot(state.player.x-state.player.tx,state.player.y-state.player.ty)<2&&leg<points.length-1)leg++;
 }
 return {clear:state.mission.complete,caught:state.events.caught,alert:state.events.globalAlert,theft:state.events.theftAlert,maxSuspicion,time:state.t,leg};
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
