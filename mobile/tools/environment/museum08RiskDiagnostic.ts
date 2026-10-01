/** Diagnostic only: existing authored Risk points, per-leg gait/optional Neutral waits.
 * Actual engine/AI/capture stays enabled; no mission/guard changes or player teleports. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {BODY} from '../../src/game/guards/guardTuning';
import {buildNavigation} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';

const def=campaignStages.find(d=>d.id==='01-08')!;
const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
type Scenario={modes:number[];delay:number;pause:number;escape:number};
function run(scenario:Scenario){
 const s=createPlaygroundState(stage),entry=def.testRoutes![1].points,points=[...entry,...def.escapeRoutes![scenario.escape].points.slice(1)];
 let leg=1,waitUntil=0,pauseDone=false,pickupAt:number|null=null,spottedAt:number|null=null;
 const transitions:{t:number;leg:number;x:number;y:number;event:string}[]=[];
 for(let f=0;f<9000&&!s.events.caught&&!s.mission.complete;f++){
  const targetIssued=s.t>=scenario.delay&&s.t>=waitUntil;
  if(targetIssued){s.playerMode=leg>=entry.length?3:scenario.modes[leg-1];s.player.tx=points[leg].x*TILE;s.player.ty=points[leg].y*TILE;s.player.hasTarget=true;}
  else{s.playerMode=0;s.player.hasTarget=false;}
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  if(s.mission.treasure&&pickupAt===null){pickupAt=s.t;transitions.push({t:s.t,leg,x:s.player.x/TILE,y:s.player.y/TILE,event:'PICKUP'});}
  if(s.events.globalAlert&&spottedAt===null){spottedAt=s.t;transitions.push({t:s.t,leg,x:s.player.x/TILE,y:s.player.y/TILE,event:'SPOTTED'});}
  if(targetIssued&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1){
   transitions.push({t:s.t,leg,x:s.player.x/TILE,y:s.player.y/TILE,event:'WAYPOINT'});
   if(leg===1&&!pauseDone){waitUntil=s.t+scenario.pause;pauseDone=true;}leg++;
  }
 }
 return {scenario,clear:s.mission.complete,caught:s.events.caught,caughtBy:s.events.caughtBy,time:s.t,leg,pickupAt,spottedAt,x:s.player.x/TILE,y:s.player.y/TILE,transitions};
}
const tested=[];let witness:ReturnType<typeof run>|undefined;
outer:for(const delay of [0,.5,1,1.5,2])for(const first of [1,2,3])for(const second of [1,2,3])for(const third of [1,2,3])for(const pause of [0,.5,1,2,3,4,6])for(const escape of [0,1]){
 const r=run({modes:[first,second,third],delay,pause,escape});tested.push(r);if(r.clear){witness=r;break outer;}
}
if(witness){
 const entry=def.testRoutes![1].points;
 for(let leg=1;leg<entry.length;leg++){
  const visited=witness.transitions.find(t=>t.event==='WAYPOINT'&&t.leg===leg);
  assert(visited&&Math.hypot(visited.x-entry[leg].x,visited.y-entry[leg].y)<2/TILE,
   `Risk waypoint ${leg} must really be visited before advancing`);
 }
 assert(witness.spottedAt!==null&&!witness.caught);
}
fs.writeFileSync('Reports/ChaptersFinalAuditV1/museum08-risk-diagnostic.json',JSON.stringify({sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),method:'Existing exact authored Risk route; continuous actual engine from original spawn, AI/capture enabled. Search per-leg gait and Neutral pause after first Risk waypoint. No telemetry/logic/data edited. Every entry waypoint physically visited and asserted. Existence witness only; no all-timing or human difficulty claim.',gaitKey:{0:'Idle/Neutral',1:'Sneak',2:'Walk',3:'Run'},guards:stage.guards.length,testedCount:tested.length,witness:witness??null,failures:tested.filter(r=>!r.clear)},null,2)+'\n');
console.log(JSON.stringify({tested:tested.length,witness:witness??null,last:tested.at(-1)}));
