import {writeRuntimeCctvQA} from './museumRuntimeCctvQA';
/** Offline continuous-input game simulation; not a device or human Tilt acceptance. */
import assert from 'node:assert/strict';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
type Scenario={route:number;escape:number;mode:number;delay:number};
export function runMission(def:StageDefinition,scenario:Scenario){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 const entry=def.testRoutes![scenario.route].points,points=[...entry,...def.escapeRoutes![scenario.escape].points.slice(1)];
 let leg=1,pickupAt:number|null=null,theftAt:number|null=null,spottedAt:number|null=null,search=false,losBreak=false,saw=false;
 for(let f=0;f<9000&&!s.events.caught&&!s.mission.complete;f++){
  // Arrival must refer to a target issued on this frame. Crossing the start
  // delay during stepPlayground otherwise accepts the stale spawn target.
  const targetIssued=s.t>=scenario.delay;
  if(targetIssued){s.playerMode=leg>=entry.length?3:scenario.mode;s.player.tx=points[leg].x*TILE;s.player.ty=points[leg].y*TILE;s.player.hasTarget=true;}
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  assert(Number.isFinite(s.player.x)&&Number.isFinite(s.player.y));for(const g of s.guards)assert(Number.isFinite(g.x)&&Number.isFinite(g.y));
  if(s.mission.treasure&&pickupAt===null)pickupAt=s.t;if(s.events.theftAlert&&theftAt===null)theftAt=s.t;if(s.events.globalAlert&&spottedAt===null)spottedAt=s.t;
  const sees=s.guards.some(g=>g.canSee);if(saw&&!sees&&s.events.globalAlert)losBreak=true;saw=sees;if(spottedAt!==null&&s.events.phase==='SEARCH')search=true;
  if(targetIssued&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
 }
 const round=(v:number|null)=>v===null?null:Math.round(v*1000)/1000;
 return {...scenario,clear:s.mission.complete,caught:s.events.caught,caughtBy:s.events.caughtBy,finalLeg:leg,timeout:!s.mission.complete&&!s.events.caught,time:round(s.t),pickupAt:round(pickupAt),theftAt:round(theftAt),spottedAt:round(spottedAt),losBreak,search};
}
export function writeFinalPlayQA(){return writeRuntimeCctvQA();}
if(process.argv[1]?.endsWith('museumFinalPlayQA.ts'))writeFinalPlayQA();
