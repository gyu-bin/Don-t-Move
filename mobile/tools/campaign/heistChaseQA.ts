import historicalHeist from './fixtures/v3GrandHeist.json';
/**
 * 01-10 Grand Heist chase QA on the real simulation (continuous normal input, live AI):
 * objective → theft alert → faster sweep → spotted → Direct Chase → capture, and a
 * LOS-break escape that ends in Search instead. Not a Simulator capture.
 *   node --import tsx tools/campaign/heistChaseQA.ts [missionId]
 */
import {campaignStages} from '../../src/game/levels/campaignStages';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {Awareness} from '../../src/game/core/types';

export interface HeistRun{
 route:number;escape:number;mode:number;delay:number;clear:boolean;caught:boolean;pickupAt:number|null;theftAt:number|null;spottedAt:number|null;
 caughtAt:number|null;chaseGaps:number[];minChaseSpeedInSight:number;losBreaks:number;searched:boolean;searchAfterSpot:boolean;
 theftSweepSpeed:number;guardsMovingInTheft:number;
}

/** Walk the safe/risk route to the objective, then Run the chosen escape. */
export function heistRun(def:StageDefinition,route:number,escape:number,mode:number,delay:number):HeistRun{
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 const points=[...def.testRoutes![route].points,...def.escapeRoutes![escape].points.slice(1)],pickupLeg=def.testRoutes![route].points.length-1;
 let searchAfterSpot=false,leg=1,pickupAt:number|null=null,theftAt:number|null=null,spottedAt:number|null=null,caughtAt:number|null=null,losBreaks=0,searched=false,sawBefore=false;
 const chaseGaps:number[]=[];let minChase=Infinity,sweepSum=0,sweepN=0;const moving=new Set<string>();
 for(let f=0;f<60*150&&!s.events.caught&&!s.mission.complete;f++){
  if(f>=delay*60){s.playerMode=leg>pickupLeg?3:mode;const p=points[leg];s.player.tx=p.x*TILE;s.player.ty=p.y*TILE;s.player.hasTarget=true;}
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  if(s.mission.treasure&&pickupAt===null)pickupAt=s.t;
  if(s.events.theftAlert&&theftAt===null)theftAt=s.t;
  if(s.events.theftAlert&&!s.events.globalAlert)for(const g of s.guards)if(g.awareness===Awareness.Investigate&&g.speed>1){sweepSum+=g.speed;sweepN++;moving.add(g.id);}
  const seeing=s.guards.filter(g=>g.canSee);
  if(s.events.globalAlert&&spottedAt===null&&seeing.length)spottedAt=s.t;
  if(sawBefore&&!seeing.length&&s.events.globalAlert)losBreaks++;
  sawBefore=seeing.length>0;
  for(const g of s.guards){
   if(g.awareness===Awareness.Chase&&g.canSee&&s.t-(spottedAt??s.t)>1)minChase=Math.min(minChase,g.speed);
   if(g.awareness===Awareness.Search){searched=true;if(spottedAt!==null&&s.events.globalAlert)searchAfterSpot=true;}
  }
  if(spottedAt!==null&&f%30===0&&s.guards.some(g=>g.awareness===Awareness.Chase))
   chaseGaps.push(+Math.min(...s.guards.filter(g=>g.awareness===Awareness.Chase).map(g=>Math.hypot(g.x-s.player.x,g.y-s.player.y))).toFixed(1));
  if(f>=delay*60&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
 }
 if(s.events.caught)caughtAt=s.t;
 return {route,escape,mode,delay,clear:s.mission.complete,caught:s.events.caught,pickupAt,theftAt,spottedAt,caughtAt,chaseGaps,
  minChaseSpeedInSight:minChase===Infinity?-1:+minChase.toFixed(1),losBreaks,searched,searchAfterSpot,theftSweepSpeed:sweepN?+(sweepSum/sweepN).toFixed(1):-1,guardsMovingInTheft:moving.size};
}

/** First spotted-then-caught run (straight escape) and first spotted-then-survived run (LOS break). */
export function heistChaseQA(id='01-10'){
 const def=campaignStages.find(d=>d.id===id)!;
 let capture:HeistRun|null=null,escape:HeistRun|null=null;const tally={runs:0,spotted:0,spottedCaught:0,spottedSurvived:0,clears:0};
 for(const route of [0,1])for(const esc of def.escapeRoutes!.map((_,i)=>i))for(const mode of [2,1])for(let delay=0;delay<=30;delay+=3){
  const r=heistRun(def,route,esc,mode,delay);tally.runs++;if(r.clear)tally.clears++;
  if(r.spottedAt!==null&&r.pickupAt!==null&&r.spottedAt>=r.pickupAt){tally.spotted++;
   if(r.caught){tally.spottedCaught++;capture??=r;}else{tally.spottedSurvived++;if(r.losBreaks>0&&r.searchAfterSpot)escape??=r;}}
 }
 return {id,tally,capture,escape};
}
if(process.argv[1]?.endsWith('heistChaseQA.ts'))console.log(JSON.stringify(process.argv[2]==='los'?heistLosBreak():heistChaseQA(process.argv[2]),null,1));

/** Seeded 01-10 pursuit (same fixture as chaseMissionQA.museumCorridorPursuit), continued past
 * the corner: the chaser must drop to the LKP and Search while the player keeps moving out of sight. */
export function heistLosBreak(hide:number[][]=[[580,400],[590,610],[630,690],[820,700]]){ // corner, then south into the east maintenance circuit
 // Coordinates in this fixed corridor regression belong to the V3 fixture.
 const def=historicalHeist as StageDefinition,stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 const g=s.guards[0];s.guards=[g];s.guardPlayback=[s.guardPlayback[0]];
 Object.assign(g,{x:580,y:60,facing:Math.PI/2,baseFacing:Math.PI/2,speed:0,awareness:Awareness.Chase,path:[],pathIndex:0,repathAt:0});
 Object.assign(s.player,{x:580,y:180,vx:0,vy:0,speed:0,facing:Math.PI/2});
 s.events.globalAlert=true;s.events.globalRevision=1;s.mission.enabled=false;
 let leg=0,firstBreak:number|null=null;const states:number[]=[];const gaps:number[]=[];
 for(let f=0;f<60*20&&!s.events.caught;f++){
  s.playerMode=3;s.player.tx=hide[leg][0];s.player.ty=hide[leg][1];s.player.hasTarget=true;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  if(Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<hide.length-1)leg++;
  if(!g.canSee&&f>30&&firstBreak===null)firstBreak=s.t;
  if(states.at(-1)!==g.awareness)states.push(g.awareness);
  if(f%30===29)gaps.push(+Math.hypot(s.player.x-g.x,s.player.y-g.y).toFixed(1));
  if(!s.events.globalAlert)break;
 }
 const name=(a:number)=>Object.entries(Awareness).find(([,v])=>v===a)?.[0];
 return {caught:s.events.caught,firstBreak,states:states.map(name),alertEnded:!s.events.globalAlert,gaps};
}
