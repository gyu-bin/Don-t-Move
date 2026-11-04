/** Offline evidence search. Never writes level plans or the authored checkpoint tables. */
import fs from 'node:fs';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createGuardState,observeGuard} from '../../src/game/guards/guardBrain';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {createSecurityCamera,stepSecurityCameras} from '../../src/game/security/cctv';
import {pointVisible} from '../../src/game/guards/guardVision';
import {PROP_KIT} from '../../src/game/world/propKit';
import {composeV13,v13Prop} from './v13Builder';
import type {V13Mission} from './v13Types';
import type {CoverCheckpoint} from './v13CoverCheckpoints';
import {V13_GALLERY_EXPANSION,GALLERY_EXPANSION_ARCHETYPES} from './v13GalleryExpansion';
import {exposureRun} from './cameraExposure';
import {extraDetectionsForMastery} from '../../src/game/progress/chapterOneMastery';
import type {GuardEvents} from '../../src/game/guards/guardBrain';

type Point={x:number;y:number};
const round=(n:number)=>+n.toFixed(5);
const sources=raw as StageDefinition[];
const source:StageDefinition[]=[...sources,...V13_GALLERY_EXPANSION.map((m,index)=>{
 const template=sources.find(s=>s.id===GALLERY_EXPANSION_ARCHETYPES[m.id]);
 if(!template)throw Error(`Missing Gallery archetype for ${m.id}`);
 return {...template,id:m.id,number:51+index,chapter:2,mission:Number(m.id.slice(3))};
})];

function checkpoints(plan:V13Mission,def:StageDefinition):CoverCheckpoint[]{
 const stage=compileStage(def),walls=stage.wallRects.flatMap(r=>[r.x,r.y,r.x+r.w,r.y+r.h]);
 const stand=(q:Point)=>clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,BODY.playerRadius+2);
 const props=plan.structures.filter(s=>PROP_KIT[s.kind].blocksVision).map(s=>{
  const only=compileStage({...def,props:[v13Prop(s)]}).visionBlockers.slice(walls.length);
  const xs=only.filter((_,i)=>i%2===0),ys=only.filter((_,i)=>i%2===1);
  return {name:s.name,blockers:only,wall:false,x0:Math.min(...xs)/TILE,y0:Math.min(...ys)/TILE,x1:Math.max(...xs)/TILE,y1:Math.max(...ys)/TILE};
 }).filter(s=>s.blockers.length>0);
 const covers=[...props,...stage.wallRects.map(r=>({name:`Gallery wall corner (${r.x/TILE},${r.y/TILE})`,blockers:walls,wall:true,
  x0:r.x/TILE,y0:r.y/TILE,x1:(r.x+r.w)/TILE,y1:(r.y+r.h)/TILE}))];
 const result:CoverCheckpoint[]=[];
 for(let gi=0;gi<plan.guards.length;gi++)for(let si=0;si<plan.guards[gi].stops.length;si++){
  const post=plan.guards[gi].stops[si],g=createGuardState(stage.guards[gi]);g.x=post.x*TILE;g.y=post.y*TILE;
  const range=g.visionRange/TILE;
  const views=(q:Point,blockers:number[])=>{observeGuard(g,{x:q.x*TILE,y:q.y*TILE,gait:2},blockers);return g.samplesSeen;};
  let best:{checkpoint:CoverCheckpoint;score:number}|undefined;
  for(const prop of covers){
   const cx=(prop.x0+prop.x1)/2,cy=(prop.y0+prop.y1)/2;
   if(Math.hypot(Math.max(prop.x0-post.x,0,post.x-prop.x1),Math.max(prop.y0-post.y,0,post.y-prop.y1))>range)continue;
   // First preserve the authored look. A second pass may turn the existing post toward its exhibit.
   const looks=[post.look,{x:cx,y:cy}];
   for(let li=0;li<looks.length;li++){
    g.facing=Math.atan2(looks[li].y-post.y,looks[li].x-post.x);
    for(let y=Math.max(1.3,prop.y0-1.8,post.y-range);y<=Math.min(def.layout.length-1.3,prop.y1+1.8,post.y+range);y+=.1)
     for(let x=Math.max(1.3,prop.x0-1.8,post.x-range);x<=Math.min(def.layout[0].length-1.3,prop.x1+1.8,post.x+range);x+=.1){
      const hidden={x:round(x),y:round(y)},distance=Math.hypot(x-post.x,y-post.y);
      if(distance<.7||distance>range||!stand(hidden))continue;
      if(views(hidden,prop.blockers)!==0||views(hidden,prop.wall?[]:walls)!==3||views(hidden,stage.visionBlockers)!==0)continue;
      for(const length of [.5,.7,.9,1.2,1.5,1.8,2.1])for(let dir=0;dir<16;dir++){
       const angle=dir*Math.PI/8,exposed={x:round(x+Math.cos(angle)*length),y:round(y+Math.sin(angle)*length)};
       if(!stand(exposed)||!clearSegment(x*TILE,y*TILE,exposed.x*TILE,exposed.y*TILE,stage.movementBlockers,BODY.playerRadius))continue;
       if(views(exposed,stage.visionBlockers)<2)continue;
       const score=length+li*4+distance*.03;
       if(!best||score<best.score)best={score,checkpoint:{structure:prop.name,guard:gi,stop:si,post:{x:post.x,y:post.y},hidden,exposed,look:{...looks[li]},...(prop.wall?{wall:true}:{})}};
      }
     }
   }
  }
  if(best)result.push(best.checkpoint);
 }
 // Independent waiting stops are required; favor a spread of guard responsibilities, then the shortest peek.
 return result.sort((a,b)=>a.guard-b.guard||a.stop-b.stop);
}

function inspectionPlan(plan:V13Mission,points:CoverCheckpoint[]):V13Mission {
 return {...plan,guards:plan.guards.map((g,gi)=>({...g,stops:g.stops.map((s,si)=>{
  const p=points.find(p=>p.guard===gi&&p.stop===si);return p?{...s,look:{...p.look}}:s;
 })}))};
}
function proof(plan:V13Mission,points:CoverCheckpoint[]){
 const def=composeV13(inspectionPlan(plan,points),source),stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 const cameras=(stage.cameras??[]).map(createSecurityCamera),visited=new Set<number>(),longest=points.map(()=>0),current=points.map(()=>0);
 const missing={x:-10000,y:-10000,gait:0};
 for(let f=0;f<60*180;f++){
  stepGuards(s.guards,missing,stage.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);
  stepSecurityCameras(cameras,missing,stage.visionBlockers,s.events,1/60,f/60);
  points.forEach((p,i)=>{
   const g=s.guards[p.guard],angle=Math.atan2(p.look.y-p.post.y,p.look.x-p.post.x),error=Math.atan2(Math.sin(g.facing-angle),Math.cos(g.facing-angle));
   if(Math.hypot(g.x-p.post.x*TILE,g.y-p.post.y*TILE)<2&&g.speed<2&&Math.abs(error)<.12)visited.add(i);
   if(f%6)return;
   const player={x:p.hidden.x*TILE,y:p.hidden.y*TILE,gait:0};
   const watched=s.guards.some(g=>{const view={...g};observeGuard(view,player,stage.visionBlockers);return view.canSee;})||cameras.some(c=>pointVisible(c,player.x,player.y,stage.visionBlockers));
   current[i]=watched?0:current[i]+.1;longest[i]=Math.max(longest[i],current[i]);
  });
 }
 const walls=stage.wallRects.flatMap(r=>[r.x,r.y,r.x+r.w,r.y+r.h]);
 return points.map((p,i)=>{
  const g=createGuardState(stage.guards[p.guard]);g.x=p.post.x*TILE;g.y=p.post.y*TILE;
  g.facing=Math.atan2(p.look.y-p.post.y,p.look.x-p.post.x);
  const samples=(q:Point,blockers:number[])=>{observeGuard(g,{x:q.x*TILE,y:q.y*TILE,gait:2},blockers);return g.samplesSeen;};
  const named=p.wall?walls:compileStage({...def,props:[v13Prop(plan.structures.find(s=>s.name===p.structure)!)]}).visionBlockers.slice(walls.length);
  const stand=(q:Point)=>clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,BODY.playerRadius+2);
  return {structure:p.structure,guard:p.guard,stop:p.stop,visited:visited.has(i),longestUnwatchedSeconds:round(longest[i]),
   originalLookPreserved:JSON.stringify(plan.guards[p.guard].stops[p.stop].look)===JSON.stringify(p.look),
   hiddenSamples:samples(p.hidden,stage.visionBlockers),withoutCoverSamples:samples(p.hidden,p.wall?[]:walls),
   namedCoverSamples:samples(p.hidden,named),exposedSamples:samples(p.exposed,stage.visionBlockers),
   hiddenStandable:stand(p.hidden),exposedStandable:stand(p.exposed),walkoutClear:clearSegment(p.hidden.x*TILE,p.hidden.y*TILE,p.exposed.x*TILE,p.exposed.y*TILE,stage.movementBlockers,BODY.playerRadius)};
 });
}

const requested=process.argv.slice(2).filter(arg=>/^02-\d{2}$/.test(arg));
const output:{checkpoints:Record<string,CoverCheckpoint[]>;recommended:Record<string,CoverCheckpoint[]>;proof:Record<string,unknown>;witnesses:Record<string,unknown>;errors:Record<string,string>}={checkpoints:{},recommended:{},proof:{},witnesses:{},errors:{}};
const witnessDelay:Record<string,number>={'02-06':15,'02-07':8,'02-08':8,'02-09':18,'02-10':10};
if(process.argv.includes('--live-witnesses')){
 const live=JSON.parse(fs.readFileSync('src/game/levels/stages/campaignStages.json','utf8')) as StageDefinition[];
 const witnesses:Record<string,unknown>={};
 for(const id of requested.length?requested:['02-06','02-07','02-08','02-09','02-10']){
  const def=live.find(d=>d.id===id);if(!def)throw Error(`No live mission ${id}`);
  const results=[];
  for(const escape of [0,1]){
   let firstClear:unknown,clean:unknown;
   for(let delay=0;delay<=30;delay++){
    let events:GuardEvents|undefined;
    const run=exposureRun(def,0,escape,2,delay,state=>{events=state.events;});
    const extra=events?extraDetectionsForMastery(events):undefined;
    const row={approach:0,escape,mode:2,delay,...run,extraDetections:extra};
    if(run.clear&&!run.caught){firstClear??=row;if(extra===0){clean=row;break;}}
   }
   results.push({escape,firstClear,clean});
  }
  witnesses[id]=results;console.log(id,JSON.stringify(results));
 }
 const target=process.env.COVER_PROBE_OUTPUT??'/private/tmp/gallery-expansion-live-witnesses.json';
 fs.writeFileSync(target,JSON.stringify(witnesses,null,2)+'\n');console.log(`Evidence: ${target}`);
}else{
for(const plan of V13_GALLERY_EXPANSION.filter(p=>!requested.length||requested.includes(p.id))){
 try{
  const def=composeV13(plan,source),found=checkpoints(plan,def);
  const sameLook=(p:CoverCheckpoint)=>JSON.stringify(plan.guards[p.guard].stops[p.stop].look)===JSON.stringify(p.look);
  const recommended=[...found].sort((a,b)=>Number(sameLook(b))-Number(sameLook(a))||a.guard-b.guard||a.stop-b.stop).slice(0,2);
  output.checkpoints[plan.id]=found;output.recommended[plan.id]=recommended;output.proof[plan.id]=proof(plan,recommended);
  const witness=exposureRun(composeV13(inspectionPlan(plan,recommended),source),0,1,2,witnessDelay[plan.id]);
  output.witnesses[plan.id]={delay:witnessDelay[plan.id],clear:witness.clear,caught:witness.caught};
  console.log(plan.id,`${found.length} checkpoints`,JSON.stringify(output.proof[plan.id]));
  console.log(plan.id,'recommended inspection witness',JSON.stringify(output.witnesses[plan.id]));
 }catch(error){output.errors[plan.id]=String(error);console.log(plan.id,String(error));}
}
const target=process.env.COVER_PROBE_OUTPUT??'/private/tmp/gallery-expansion-cover-candidates.json';
fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');console.log(`Evidence: ${target}`);
}
