/** Offline continuous-input game simulation; not a device or human Tilt acceptance. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {campaignStages} from '../../src/game/levels/campaignStages';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {SECURITY_CORE_REACTION_SECONDS,theftSearchPosts} from '../../src/game/guards/theftAlert';
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
function fairness08(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.theft.empty=true;
 let t=0;const dt=1/60,hidden={x:-9999,y:-9999,gait:0};
 while(!s.events.theftAlert&&t<120){t+=dt;stepGuards(s.guards,hidden,stage.visionBlockers,nav,dt,s.events,t,true,1,s.theft);}
 assert(s.events.theftAlert);const activatedAt=t,positions=s.guards.map(g=>({x:g.x,y:g.y}));
 while(t<activatedAt+40){t+=dt;stepGuards(s.guards,hidden,stage.visionBlockers,nav,dt,s.events,t,true,1,s.theft);
  assert(!s.events.globalAlert&&s.events.globalRevision===0);
  s.guards.forEach((g,i)=>{assert(!g.hasLkp);assert(theftSearchPosts(s.theft,i,s.theft.posts[i]).some(p=>p.x===g.targetX&&p.y===g.targetY));if(t-activatedAt<SECURITY_CORE_REACTION_SECONDS)assert(g.x===positions[i].x&&g.y===positions[i].y);});
 }
 return {pass:true,secondsObserved:40,theftActivatedAt:activatedAt,extraReactionHoldSeconds:SECURITY_CORE_REACTION_SECONDS,nominalDiscoveryToMovementSeconds:0.45+0.6+SECURITY_CORE_REACTION_SECONDS,timingNote:'Facing may extend confirmation. Extra hold begins after whistle completion.',roles:s.guards.map((g,i)=>({id:g.id,role:s.theft.roles?.[i],posts:s.theft.posts[i]})),globalLkpCreated:false,lockdownObserved:s.events.lockdownActive};
}
export function writeFinalPlayQA(){
 const baseline:StageDefinition[]=JSON.parse(readFileSync('Reports/MuseumFinalDesignV2/before/campaignStages.json','utf8'));
 const fixed:Scenario[]=[];for(const route of [0,1])for(const mode of [1,2,3])for(const delay of [0,3])fixed.push({route,escape:0,mode,delay});
 const missions=['01-05','01-07','01-08','01-10'].map(id=>{
  const def=campaignStages.find(d=>d.id===id)!,matched=fixed.map(s=>runMission(def,s)),extra:ReturnType<typeof runMission>[]=[];
  let witness=matched.find(r=>r.clear)??null;
  if(!witness)for(const delay of [6,9,12]){for(const escape of def.escapeRoutes!.map((_,i)=>i)){for(const route of [0,1]){const r=runMission(def,{route,escape,mode:2,delay});extra.push(r);if(r.clear){witness=r;break;}}if(witness)break;}if(witness)break;}
  if(!witness)for(const mode of [1,3]){for(const delay of [0,3,6]){for(const escape of def.escapeRoutes!.map((_,i)=>i)){for(const route of [0,1]){const r=runMission(def,{route,escape,mode,delay});extra.push(r);if(r.clear){witness=r;break;}}if(witness)break;}if(witness)break;}if(witness)break;}
  return {id,fixed:matched,matchedClears:matched.filter(r=>r.clear).length,matchedRuns:matched.length,extraSearch:extra,clearWitness:witness};
 });
 const ten=missions.find(m=>m.id==='01-10')!,prior=fixed.map(s=>runMission(baseline.find(d=>d.id==='01-10')!,s));assert.deepEqual(ten.fixed,prior,'01-10 matched outcomes');
 const report={method:['Real stepPlayground 60Hz, authored spawn, continuous target input; no teleport or disabled AI/capture.','Idle at start delay; selected approach gait and Run on escape. Timeout 150 seconds.','12 fixed scenarios per mission, separate bounded clear-witness search. Bot outcomes do not establish human 07<08<10 difficulty.','Theft fairness is an isolated guard test with hidden off-map perception probe, not a survival run.','01-10 baseline/current geometry compared using same current engine.'],missions,fairness08:fairness08(campaignStages.find(d=>d.id==='01-08')!),grandHeistBaseline:{exactOutcomeMatch:true,scenarios:prior},nativeVerification:false,humanTiltReview:'PENDING'};
 mkdirSync('Reports/MuseumFinalDesignV2',{recursive:true});writeFileSync('Reports/MuseumFinalDesignV2/play-qa.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({missions:missions.map(m=>({id:m.id,fixedClears:m.matchedClears,runs:m.matchedRuns,witness:m.clearWitness})),fairness08:true,grandHeistExactMatch:true},null,2));return report;
}
if(process.argv[1]?.endsWith('museumFinalPlayQA.ts'))writeFinalPlayQA();
