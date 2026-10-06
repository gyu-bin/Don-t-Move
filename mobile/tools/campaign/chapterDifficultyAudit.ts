/** Independent axes, real moving patrol/cone/LOS sampling. Never auto-tunes from a score. */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {chapterDifficulty} from '../../src/game/levels/chapterDifficulty';
import {CHAPTER_MISSION_COUNTS} from '../../src/game/levels/campaignCatalog';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {stepSecurityCameras} from '../../src/game/security/cctv';
import {buildVisionFan,pointVisible} from '../../src/game/guards/guardVision';
export function auditDifficulty(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 const points:{x:number;y:number}[]=[];
 for(let y=.5;y<stage.rows;y++)for(let x=.5;x<stage.cols;x++)if(clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,stage.movementBlockers,BODY.playerRadius)&&stage.grid[Math.floor(y)*stage.cols+Math.floor(x)]===1)points.push({x:x*TILE,y:y*TILE});
 const route=(def.testRoutes?.find(r=>r.name.startsWith('safe'))??def.testRoutes?.[0])?.points??[];
 const safePoints=route.flatMap((b,i)=>{if(!i)return[];const a=route[i-1],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)));return Array.from({length:n},(_,j)=>({x:(a.x+(b.x-a.x)*(j+1)/n)*TILE,y:(a.y+(b.y-a.y)*(j+1)/n)*TILE}));});
 const seen=new Set<number>(),last=points.map(()=>false);let guard=0,camera=0,overlap=0,objective=0,escape=0,safe=0,visits=0,samples=0;
 const hidden={x:-10000,y:-10000,gait:0};
 for(let f=0;f<3600;f++){
  const t=(f+1)/60;stepSecurityCameras(s.securityCameras,hidden,stage.visionBlockers,s.events,1/60,t);stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,t,true,1,s.theft);
  if(f%30)continue;samples++;s.guards.forEach(g=>buildVisionFan(g,stage.visionBlockers));
  const counts=(p:{x:number;y:number})=>[s.guards.filter(g=>pointVisible(g,p.x,p.y,stage.visionBlockers)).length,s.securityCameras.filter(c=>pointVisible(c,p.x,p.y,stage.visionBlockers)).length];
  points.forEach((p,i)=>{const[g,c]=counts(p);guard+=g>0?1:0;camera+=c>0?1:0;overlap+=g+c>1?1:0;if(g+c)seen.add(i);if(g+c&&!last[i])visits++;last[i]=g+c>0;});
  objective+=counts(stage.objective).some(Boolean)?1:0;escape+=counts({x:stage.exit.x+stage.exit.w/2,y:stage.exit.y+stage.exit.h/2}).some(Boolean)?1:0;
  safe+=safePoints.filter(p=>counts(p).some(Boolean)).length;
 }
 const round=(n:number)=>+n.toFixed(4),areaSamples=Math.max(1,points.length*samples);
 return {id:def.id,chapter:def.chapter!,tier:chapterDifficulty(def.chapter!).difficultyTier,floor:points.length,guards:def.guards.length,cameras:def.cameras?.length??0,safeRouteSampleCount:safePoints.length,evidenceComplete:points.length>0&&safePoints.length>0,
 guardCoverage:round(guard/areaSamples),cctvCoverage:round(camera/areaSamples),overlap:round(overlap/areaSamples),potentialCoverage:round(seen.size/Math.max(1,points.length)),patrolVisitsPerTileMinute:round(visits/Math.max(1,points.length)),safeRouteExposure:round(safe/Math.max(1,samples*safePoints.length)),objectivePressure:round(objective/samples),escapePressure:round(escape/samples),unseenFraction:round(1-seen.size/Math.max(1,points.length)),safePockets:def.safeZones?.length??0,escapeChoices:def.escapeRoutes?.length??0,
 theft:{highSecurity:!!def.objective?.highSecurity,roles:[...new Set(def.guards.map(g=>g.theftRole??g.role))],posts:def.guards.reduce((n,g)=>n+(g.theftPosts?.length??0),0)}};
}
export type DifficultyAudit=ReturnType<typeof auditDifficulty>;
const axes=['guardCoverage','cctvCoverage','overlap','patrolVisitsPerTileMinute','safeRouteExposure','objectivePressure','escapePressure'] as const;
export function summarizeDifficulty(rows:DifficultyAudit[]){
 return Array.from({length:9},(_,i)=>{const missions=rows.filter(r=>r.chapter===i+1);return{chapter:i+1,target:chapterDifficulty(i+1),count:missions.length,means:Object.fromEntries(axes.map(k=>[k,missions.reduce((n,r)=>n+r[k],0)/Math.max(1,missions.length)])),medians:Object.fromEntries(axes.map(k=>{const values=missions.map(r=>r[k]).sort((a,b)=>a-b);const middle=Math.floor(values.length/2);return[k,values.length?(values.length%2?values[middle]:(values[middle-1]+values[middle])/2):null];})),outliers:axes.flatMap(k=>{const values=missions.map(r=>r[k]).sort((a,b)=>a-b);const q1=values[Math.floor((values.length-1)*.25)]??0,q3=values[Math.ceil((values.length-1)*.75)]??0,limit=q3+1.5*(q3-q1);return missions.filter(r=>r[k]>limit+.001).map(r=>({id:r.id,axis:k,value:r[k],fence:limit,status:'REVIEW_REQUIRED'}));})};});
}
/** Separate acceptance findings per axis. Passing test code never substitutes for this result.
 * These diagnostics request human review; they must never drive automatic stat tuning.
 */
export function chapterOrderingAcceptance(rows:DifficultyAudit[]){
 const chapters=summarizeDifficulty(rows);
 const measuredAxes=['guardCoverage','safeRouteExposure','objectivePressure','cctvCoverage','escapePressure'] as const;
 const evidence=[1,2,3].map(chapter=>{
  const missions=rows.filter(r=>r.chapter===chapter);
  const expected=Array.from({length:CHAPTER_MISSION_COUNTS[chapter-1]},(_,i)=>`0${chapter}-${String(i+1).padStart(2,'0')}`);
  const ids=new Set(missions.map(r=>r.id));
  return {chapter,count:missions.length,uniqueCount:ids.size,missingMissionIds:expected.filter(id=>!ids.has(id)),complete:missions.length===expected.length&&ids.size===expected.length&&expected.every(id=>ids.has(id))&&missions.every(r=>r.evidenceComplete&&r.safeRouteSampleCount>0)};
 });
 const findings=measuredAxes.map(axis=>{
  const means=[1,2,3].map(chapter=>({chapter,count:chapters[chapter-1].count,value:chapters[chapter-1].means[axis]}));
  const complete=evidence.every(e=>e.complete)&&means.every(m=>Number.isFinite(m.value));
  const comparisons=means.slice(1).map((next,i)=>({from:means[i].chapter,to:next.chapter,lower:means[i].value,higher:next.value,ordered:complete&&means[i].value<next.value}));
  const accepted=complete&&comparisons.every(c=>c.ordered);
  return {axis,means,comparisons,accepted,status:accepted?'MEASURED_ORDERED':'REVIEW_REQUIRED'};
 });
 const accepted=findings.every(f=>f.accepted);
 return {accepted,status:accepted?'MEASURED_ORDERED':'REVIEW_REQUIRED',humanPlaytestVerified:false,evidence,findings};
}
if(process.argv[1]?.endsWith('chapterDifficultyAudit.ts')){
 const input=process.argv[2]??'src/game/levels/stages/campaignStages.json',out=process.argv[3]??'Reports/V10/difficulty-after.json';
 const stages=JSON.parse(fs.readFileSync(input,'utf8')) as StageDefinition[];const missions=stages.map(auditDifficulty);
 fs.mkdirSync('Reports/V10',{recursive:true});fs.writeFileSync(out,JSON.stringify({method:'60s actual patrol/CCTV at60Hz; tile centres and authored safe-route points sampled2Hz with collision+LOS. Seven axes retained separately; potential coverage is not guaranteed detection. High outliers use per-chapter Tukey fence, never auto-tuning. No human difficulty certification.',missions,chapters:summarizeDifficulty(missions),orderingAcceptance:chapterOrderingAcceptance(missions)},null,2)+'\n');console.log(out);
}
