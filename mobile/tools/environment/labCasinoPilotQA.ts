/** Actual existing engine on a separate fixture. Not native FPS / Tilt acceptance. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {LAB_CASINO_PILOTS} from './labCasinoPilots';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {Awareness} from '../../src/game/core/types';
import {narrowGap,MIN_COMFORT_GAP} from '../campaign/museumCentralCoverQA';
import {runMission} from '../campaign/museumFinalPlayQA';

export function labCasinoPilotQA(def:StageDefinition){
 const s=compileStage(def),nav=buildNavigation(s,BODY.guardRadius);
 const reachable=(x:number,y:number)=>{const p=findPath(nav,s.playerSpawn.x,s.playerSpawn.y,x,y);return p.length>=2&&Math.hypot(p.at(-2)!-x,p.at(-1)!-y)<.01;};
 const routes=[...def.testRoutes!,...def.escapeRoutes!].map(r=>({name:r.name,segments:r.points.slice(1).map((b,i)=>({a:r.points[i],b,bodyClear:clearSegment(r.points[i].x*TILE,r.points[i].y*TILE,b.x*TILE,b.y*TILE,s.movementBlockers,BODY.playerRadius),overshootMarginClear:clearSegment(r.points[i].x*TILE,r.points[i].y*TILE,b.x*TILE,b.y*TILE,s.movementBlockers,MIN_COMFORT_GAP/2)}))}));
 const probes=routes.flatMap(r=>r.segments.map(segment=>({name:r.name,bodyPass:segment.bodyClear,marginPass:segment.overshootMarginClear})));
 const boxes=[];for(let i=0;i<s.movementBlockers.length;i+=4)boxes.push({id:`blocker-${i/4}`,l:s.movementBlockers[i],t:s.movementBlockers[i+1],r:s.movementBlockers[i+2],b:s.movementBlockers[i+3]});
 const gaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)for(const g of narrowGap(boxes[i],boxes[j])){
  if(!clearSegment(g.from.x,g.from.y,g.to.x,g.to.y,s.movementBlockers,0))continue;
  if(![g.from,g.to].some(p=>clearSegment(p.x,p.y,p.x,p.y,s.movementBlockers,BODY.playerRadius)&&reachable(p.x,p.y)))continue;
  gaps.push({...g,a:boxes[i].id,b:boxes[j].id,bodyPass:clearSegment(g.from.x,g.from.y,g.to.x,g.to.y,s.movementBlockers,BODY.playerRadius)});
 }
 const cycles=s.guards.map((_,index)=>{
  const state=createPlaygroundState(s),g=state.guards[index],seen=new Set<number>(),anchors=new Set<number>(),collisionExamples:{t:number;x:number;y:number;state:number}[]=[];let t=0,collisionSamples=0,finite=true;
  const tick=(player={x:-1000,y:-1000,gait:0})=>{t+=1/60;stepGuards(state.guards,player,s.visionBlockers,nav,1/60,state.events,t,true,1,state.theft);seen.add(g.awareness);finite=finite&&[g.x,g.y,g.targetX,g.targetY,...g.path].every(Number.isFinite);if(!clearSegment(g.x,g.y,g.x,g.y,s.movementBlockers,BODY.guardRadius)){collisionSamples++;if(collisionExamples.length<8)collisionExamples.push({t,x:g.x/TILE,y:g.y/TILE,state:g.awareness});}g.route.forEach((p,i)=>{if(Math.hypot(g.x-p.x,g.y-p.y)<8)anchors.add(i);});};
  for(let f=0;f<120*60;f++)tick();
  const patrol={visited:anchors.size,total:g.route.length,recoveries:g.patrolRecoveries};
  let target:null|{x:number;y:number;gait:number}=null;
  for(const distance of [70,90,110,50]){const p={x:g.x+Math.cos(g.facing)*distance,y:g.y+Math.sin(g.facing)*distance,gait:3};if(clearSegment(p.x,p.y,p.x,p.y,s.movementBlockers,BODY.playerRadius)&&clearSegment(g.x,g.y,p.x,p.y,s.visionBlockers)&&reachable(p.x,p.y)){target=p;break;}}
  if(target)for(let f=0;f<30*60&&g.awareness!==Awareness.Chase&&!state.events.caught;f++)tick(target);
  const chase=g.awareness===Awareness.Chase,spotted=state.events.globalAlert;
  for(let f=0;f<120*60;f++)tick();
  return {id:g.id,patrol,target,spotted,chase,search:seen.has(Awareness.Search),return:seen.has(Awareness.Return),returned:g.awareness===Awareness.Patrol,collisionSamples,collisionExamples,finite,globalAlertCleared:!state.events.globalAlert};
 });
 const replays=def.testRoutes!.map((route,index)=>{let witness:ReturnType<typeof runMission>|null=null;const attempts=[];outer:for(const mode of [1,2,3])for(const delay of [0,1,3,6,9,12]){const r=runMission(def,{route:index,escape:0,mode,delay});attempts.push(r);if(r.clear){witness=r;break outer;}}return {route:route.name,witness,attempts};});
 const baseline=JSON.parse(fs.readFileSync('Reports/LabCasinoKitV1/before/campaignStages.json','utf8'));
 assert.deepEqual(campaignStages,baseline,'All55campaign missions must remain unchanged');
 return {method:'Separate Lab/Casino fixture: actual compileStage, radius9/18 segment geometry, actual120s patrol and independent direct Chase→LOS break→Search→Return guards, continuous stepPlayground completion search. Off-map hidden perception probe used only for isolated AI lifecycle; not human/native/FPS acceptance.',sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),campaignPreserved:campaignStages.length,routes,probes,gaps,cycles,replays,native:false};
}
if(process.argv[1]?.endsWith('labCasinoPilotQA.ts')){const reports=LAB_CASINO_PILOTS.map(def=>({id:def.id,...labCasinoPilotQA(def)}));fs.mkdirSync('Reports/LabCasinoKitV1',{recursive:true});fs.writeFileSync('Reports/LabCasinoKitV1/pilot-qa.json',JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports));}
