import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {campaignStages} from '../../src/game/levels/campaignStages';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {castRay} from '../../src/game/world/visibility';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {Awareness} from '../../src/game/core/types';
import {findWitness,playthrough} from './museumPlaythrough';

/** Explicit mechanics probes below are NOT continuous gameplay-clear witnesses. */
export function validateMuseumV2(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 const guards=stage.guards.map(g=>({id:g.id,
  spawnClear:clearSegment(g.x,g.y,g.x,g.y,stage.movementBlockers,BODY.guardRadius),
  forwardClearanceTiles:castRay(g.x,g.y,Math.cos(g.facing),Math.sin(g.facing),g.visionRange,stage.visionBlockers)/TILE,
  anchors:g.route.map(p=>({clear:clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.guardRadius),lookValid:Number.isFinite(p.look),waitValid:Number.isFinite(p.wait)&&p.wait>=0,
   reachable:(()=>{const path=findPath(nav,g.x,g.y,p.x,p.y);return path.length>=2&&Math.hypot(path.at(-2)!-p.x,path.at(-1)!-p.y)<1;})()})),
  theftRole:g.theftRole,theftPosts:g.theftPosts}));
 const state=createPlaygroundState(stage);state.theft.empty=true;
 let t=0,alertAt:number|null=null;
 const hidden={x:-1000,y:-1000,gait:0};
 const tick=(p=hidden)=>{t+=1/60;stepGuards(state.guards,p,stage.visionBlockers,nav,1/60,state.events,t,true,1,state.theft);};
 // Let a real patrol see the empty case through its real fan; do not force alert.
 for(let i=0;i<60*120&&!state.events.theftAlert;i++)tick();
 if(state.events.theftAlert)alertAt=t;
 const initial=state.guards.map(g=>({x:g.x,y:g.y})),distance=initial.map(()=>0);
 const dispatch=state.guards.map(g=>({id:g.id,reacted:g.awareness===Awareness.Investigate,target:{x:g.targetX,y:g.targetY}}));
 for(let i=0;i<60*12&&alertAt!==null;i++){
  const before=state.guards.map(g=>({x:g.x,y:g.y}));tick();
  state.guards.forEach((g,j)=>{distance[j]+=Math.hypot(g.x-before[j].x,g.y-before[j].y);});
 }
 const hiddenLkpStayedUnpublished=state.events.globalRevision===0;
 let spotted=false,contactCaught=false;
 for(const g of state.guards){
  const p={x:g.x+Math.cos(g.facing)*30,y:g.y+Math.sin(g.facing)*30,gait:1};
  if(!clearSegment(g.x,g.y,p.x,p.y,stage.visionBlockers))continue;
  tick(p);spotted=state.events.globalAlert&&state.guards.some(a=>a.awareness===Awareness.Chase)&&state.events.globalX===p.x&&state.events.globalY===p.y;
  break;
 }
 if(state.guards[0]){tick({x:state.guards[0].x,y:state.guards[0].y,gait:0});contactCaught=state.events.caught;}
 const fresh=createPlaygroundState(stage);
 return {id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),title:def.title,playerRadius:BODY.playerRadius,spawnValid:clearSegment(stage.playerSpawn.x,stage.playerSpawn.y,stage.playerSpawn.x,stage.playerSpawn.y,stage.movementBlockers,BODY.playerRadius),entry:def.entryPosition,exit:def.exitPosition,guards,
  geometryOnly:[0,1].map(r=>({route:r,...playthrough(def,r,2,0,true)})),
  fullAi:[0,1].map(r=>({route:r,...findWitness(def,r)})),
  silentWitness:findWitness(def,0,true),
  mechanicsProbe:{naturalCaseDiscoverySeconds:alertAt,whistleCount:state.events.whistleCount,theftWhistle:state.events.theftWhistleRevision,spottedWhistle:state.events.spottedWhistleRevision,dispatch,
   allDispatched:dispatch.every(g=>g.reacted),distinctTargets:new Set(dispatch.map(g=>`${g.target.x},${g.target.y}`)).size,
   distanceTiles:distance.map(d=>d/TILE),allMoved:distance.every(d=>d>10),hiddenLkpStayedUnpublished,spotted,contactCaught,
   retryReset:!fresh.events.caught&&!fresh.events.theftAlert&&!fresh.events.globalAlert&&!fresh.mission.treasure}};
}
export function writeMuseumV2Validation(){
 const missions=campaignStages.filter(d=>d.chapter===1).map(validateMuseumV2);
 const report={notes:['Node real-engine evidence, not Simulator touch/visual or physical iPhone Tilt acceptance.','geometryOnly drives the real player radius, acceleration, collision, pickup and exit with guards explicitly removed.','fullAi/silentWitness use continuous normal input with all guards active; found=false is an unverified witness, not a pass.','mechanicsProbe explicitly initializes an empty case and positions an observation target/contact target; not a continuous clear.'],missions};
 mkdirSync('Reports/MuseumChapterQA',{recursive:true});
 writeFileSync('Reports/MuseumChapterQA/v2-validation.json',JSON.stringify(report,null,2)+'\n');
 return report;
}
if(process.argv[1]?.endsWith('museumV2Validation.ts'))console.log(JSON.stringify(writeMuseumV2Validation().missions.map(m=>({id:m.id,geometry:m.geometryOnly.map(r=>r.clear),ai:m.fullAi.map(r=>r.found),silent:m.silentWitness.found,mechanics:m.mechanicsProbe,forward:m.guards.map(g=>g.forwardClearanceTiles)})),null,2));
