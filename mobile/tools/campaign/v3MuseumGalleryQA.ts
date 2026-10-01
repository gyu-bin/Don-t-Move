import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {buildCampaign} from './buildCampaign';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {v3MuseumGalleryDesign} from './v3MuseumGallery';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {findWitness,playthrough} from './museumPlaythrough';
export function auditV3MuseumGallery(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),issues:string[]=[];
 for(const r of [...def.testRoutes??[],...def.escapeRoutes??[]])for(let i=1;i<r.points.length;i++){
  const a=r.points[i-1],b=r.points[i];if(!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,18))issues.push(`${r.name}: radius18 blocked leg${i}`);
 }
 // Semantic patrol plans are the runtime authority; validate the compiled routes.
 for(const g of stage.guards){
  if(!g.route.length)issues.push(`${g.id}: empty compiled patrol anchor list`);
  for(const q of [...g.route,...g.theftPosts??[],...g.theftSearchSectors?.flatMap(s=>s.anchors)??[]]){
   const r=findPath(nav,g.x,g.y,q.x,q.y);
   if(!clearSegment(q.x,q.y,q.x,q.y,stage.movementBlockers,BODY.guardRadius)||r.length<2||Math.hypot(r.at(-2)!-q.x,r.at(-1)!-q.y)>.1)issues.push(`${g.id}: blocked compiled patrol/search anchor ${q.x/TILE},${q.y/TILE}`);
  }
 }
 const entry=def.entryPosition!,goal=def.objective!,exit=def.exitPosition!;
 return {id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),issues,entryExitDistance:Math.hypot(entry.x-exit.x,entry.y-exit.y),objectiveExitDistance:Math.hypot(goal.x-exit.x,goal.y-exit.y),radius18:issues.every(v=>!v.includes('radius18')),guardNav:issues.every(v=>!v.includes('anchor'))};
}
if(process.argv[1]?.endsWith('v3MuseumGalleryQA.ts')){
 const defs=buildCampaign().slice(0,20);
 const audit=defs.map(auditV3MuseumGallery);const replays=[];
 for(const id of ['01-05','01-08','01-10','02-03','02-06','02-10','02-04','02-05','02-07','02-08','02-09']){
  const def=defs.find(d=>d.id===id)!;
  const result={id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),geometry:playthrough(def,0,2,0,true),safe:findWitness(def,0),risk:findWitness(def,1)};
  replays.push(result);console.log(JSON.stringify(result));
 }
 const all20FullAI=defs.map(def=>({id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),...findWitness(def,0)}));
 writeFileSync('Reports/LevelDesignV3/museum-gallery-semantic-audit.json',JSON.stringify({designs:defs.map(v3MuseumGalleryDesign),audit,replays,all20FullAI,limits:['Fixed-route headless input replays; Debug OFF renderer review is a separate gate.','No simulator or device evidence in this authoring audit.']},null,2));
 console.log(JSON.stringify({allRadius18:audit.every(a=>a.radius18),allGuardNav:audit.every(a=>a.guardNav),issues:audit.flatMap(a=>a.issues.map(v=>`${a.id} ${v}`))}));
}
