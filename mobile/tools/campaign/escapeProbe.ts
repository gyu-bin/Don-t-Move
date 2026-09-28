import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';

/** Start at the case at a sampled patrol time, then move continuously along the authored escape.
 * This validates the escape leg, not a full stealth solution from spawn. No guard state is overridden.
 */
export function silentEscapeWindow(def:StageDefinition):number|null {
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 for(let delay=0;delay<=60;delay+=2){
  const s=createPlaygroundState(stage);s.playerMode=3;
  for(let f=0;f<delay*60;f++)stepGuards(s.guards,{x:-1000,y:-1000,gait:0},stage.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);
  s.t=delay;s.player.x=stage.objective.x;s.player.y=stage.objective.y;
  const points=def.escapeRoutes![0].points;let leg=1;
  for(let f=0;f<60*30&&!s.events.caught&&!s.events.globalAlert&&!s.events.theftAlert&&!s.mission.complete;f++){
   const point=points[Math.min(leg,points.length-1)];
   s.player.tx=point.x*TILE;s.player.ty=point.y*TILE;s.player.hasTarget=true;
   stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
   if(Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<3&&leg<points.length-1)leg++;
  }
  if(s.mission.complete&&!s.events.globalAlert&&!s.events.theftAlert)return delay;
 }
 return null;
}
if(process.argv[1]?.endsWith('escapeProbe.ts'))for(const def of campaignStages)console.log(def.id,silentEscapeWindow(def));
