/** Real 60 Hz guard navigation mechanics probes, not continuous player playthroughs.
 * Authored patrol origins are used; the observation target is deliberately placed
 * in a reachable visible position. Human Tilt and native performance are separate.
 */
import fs from 'node:fs';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {BODY} from '../../src/game/guards/guardTuning';
import {Awareness} from '../../src/game/core/types';
import type {PlayerView} from '../../src/game/guards/guardBrain';

function probe(mission:number){
 const def=campaignStages.find(d=>d.id===`02-${String(mission).padStart(2,'0')}`)!;if(!def)throw Error('Missing baked Gallery mission');const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 const hidden:PlayerView={x:-1000,y:-1000,gait:0};
 const state=createPlaygroundState(stage);
 const traces=state.guards.map(g=>({id:g.id,states:new Set<number>(),anchors:new Set<number>(),collisionSamples:0,finite:true,returned:false}));
 let time=0;
 const tick=(p=hidden)=>{
  time+=1/60;stepGuards(state.guards,p,stage.visionBlockers,nav,1/60,state.events,time,true,1,state.theft);
  state.guards.forEach((g,i)=>{
   const t=traces[i];t.states.add(g.awareness);
   t.finite=t.finite&&[g.x,g.y,g.speed,g.targetX,g.targetY,...g.path].every(Number.isFinite);
   if(!clearSegment(g.x,g.y,g.x,g.y,stage.movementBlockers,BODY.guardRadius))t.collisionSamples++;
   g.route.forEach((a,j)=>{if(Math.hypot(g.x-a.x,g.y-a.y)<8)t.anchors.add(j);});
   if(t.states.has(Awareness.Return)&&g.awareness===Awareness.Patrol)t.returned=true;
  });
 };
 for(let f=0;f<120*60;f++)tick();
 const patrol=traces.map((t,i)=>({id:t.id,visited:t.anchors.size,total:state.guards[i].route.length,recoveries:state.guards[i].patrolRecoveries}));
 // Empty-case discovery and objective/exit pressure use the actual theft system.
 state.theft.empty=true;
 for(let f=0;f<120*60&&!state.events.theftAlert;f++)tick();
 const theftDiscovered=state.events.theftAlert;
 for(let f=0;f<20*60;f++)tick();
 const pressure=state.guards.map((g,i)=>({id:g.id,role:state.theft.roles?.[i],target:{x:g.targetX/TILE,y:g.targetY/TILE}}));
 // Find an actual floor target in the current guard fan, with a body-clear nav path.
 let target:PlayerView|null=null;
 for(const g of state.guards){
  for(const distance of [70,90,110,50]){
   const p={x:g.x+Math.cos(g.facing)*distance,y:g.y+Math.sin(g.facing)*distance,gait:3};
   const path=findPath(nav,g.x,g.y,p.x,p.y);
   if(clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.playerRadius)&&clearSegment(g.x,g.y,p.x,p.y,stage.visionBlockers)&&path.length>=2&&Math.hypot(path.at(-2)!-p.x,path.at(-1)!-p.y)<1){target=p;break;}
  }if(target)break;
 }
 if(target)for(let f=0;f<120&&!state.events.globalAlert&&!state.events.caught;f++)tick(target);
 const spotted=state.events.globalAlert&&state.guards.some(g=>g.awareness===Awareness.Chase);
 // Break LOS immediately; the hidden target never supplies a live chase position.
 for(let f=0;f<120*60;f++)tick();
 const chaseCycle=traces.map((t,i)=>({id:t.id,investigate:t.states.has(Awareness.Investigate),chase:t.states.has(Awareness.Chase),search:t.states.has(Awareness.Search),return:t.states.has(Awareness.Return),returned:t.returned,collisionSamples:t.collisionSamples,finite:t.finite,final:{x:state.guards[i].x,y:state.guards[i].y,awareness:state.guards[i].awareness,targetX:state.guards[i].targetX,targetY:state.guards[i].targetY,returnIndex:state.guards[i].returnIndex,path:state.guards[i].path,route:state.guards[i].route}}));
 // Separate actual pursuit-to-contact probe: start at authored patrol spawns and
 // hold a visible reachable target outside capture radius; never force caught.
 const contact=createPlaygroundState(stage);
 let contactTarget:PlayerView|null=null;
 for(const g of contact.guards){
  for(const distance of [50,70,90]){
   const p={x:g.x+Math.cos(g.facing)*distance,y:g.y+Math.sin(g.facing)*distance,gait:3};
   if(clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.playerRadius)&&clearSegment(g.x,g.y,p.x,p.y,stage.visionBlockers)&&clearSegment(g.x,g.y,p.x,p.y,nav.blockers,BODY.guardRadius)){contactTarget=p;break;}
  }if(contactTarget)break;
 }
 let contactChase=false;
 if(contactTarget)for(let f=0;f<60*60&&!contact.events.caught;f++){
  stepGuards(contact.guards,contactTarget,stage.visionBlockers,nav,1/60,contact.events,(f+1)/60,true,1,contact.theft);
  contactChase=contactChase||contact.guards.some(g=>g.awareness===Awareness.Chase);
 }
 const errors:string[]=[];
 if(patrol.some(g=>g.visited!==g.total||g.recoveries))errors.push('Patrol anchors or recovery failed');
 if(!theftDiscovered)errors.push('No natural empty-case discovery in 120 seconds');
 if(!spotted)errors.push('Reachable visible target did not start Direct Chase');
 if(chaseCycle.some(g=>!g.search||!g.return||!g.returned||g.collisionSamples||!g.finite))errors.push('Search/Return navigation or finite/collision checks failed');
 if(state.events.globalAlert)errors.push('Global Alert did not clear after Search/Return');
 if(!contact.events.caught||!contactChase)errors.push('Visible reachable target did not lead to Chase/Capture');
 return {id:def.id,errors,patrol,theftDiscovered,pressure,spotted,target,chaseCycle,globalAlertCleared:!state.events.globalAlert,captureProbe:{target:contactTarget,chase:contactChase,caught:contact.events.caught,caughtBy:contact.events.caughtBy}};
}
const results=[];
const missions=process.env.MISSIONS?process.env.MISSIONS.split(',').map(Number):Array.from({length:10},(_,i)=>i+1);
for(const i of missions){const result=probe(i);results.push(result);console.log(JSON.stringify({id:result.id,errors:result.errors,spotted:result.spotted,cycle:result.chaseCycle}));}
fs.mkdirSync('Reports/GalleryEnrichmentV1',{recursive:true});
fs.writeFileSync(process.env.OUT_JSON??'Reports/GalleryEnrichmentV1/guard-runtime-qa.json',JSON.stringify({method:'Actual 60 Hz guard engine: 120s hidden-player patrol; natural empty-case discovery; deliberately placed visible reachable observation target; hidden-player LOS break; Search/Return. NOT continuous player completion or native testing.',results},null,2)+'\n');
if(results.some(r=>r.errors.length))process.exitCode=1;
