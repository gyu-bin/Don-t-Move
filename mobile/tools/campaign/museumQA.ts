import {mkdirSync,writeFileSync} from 'node:fs';
import {campaignStages} from '../../src/game/levels/campaignStages';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {pointVisible} from '../../src/game/guards/guardVision';
import {PROP_KIT} from '../../src/game/world/propKit';
import {playthrough,findWitness} from './museumPlaythrough';

const round=(n:number)=>Math.round(n*1000)/1000;
type Point={x:number;y:number};
export function routeLength(points:Point[]){return points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);}
/** Equal-distance samples; the exposure statistic averages space and patrol time, not human risk. */
function samples(points:Point[]){
 const result:(Point&{stepTiles:number})[]=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.25));
  for(let j=0;j<n;j++)result.push({x:(a.x+(b.x-a.x)*j/n)*TILE,y:(a.y+(b.y-a.y)*j/n)*TILE,stepTiles:Math.hypot(b.x-a.x,b.y-a.y)/n});
 }
 return result;
}
export function measureMuseum(def:StageDefinition,seconds=180){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage),dt=1/60;
 const routeSamples=def.testRoutes!.slice(0,2).map(r=>samples(r.points));
 const everVisible=routeSamples.map(points=>points.map(()=>false));
 const nearStructuralCover=routeSamples.map(points=>points.map(p=>{
  for(let b=0;b<stage.visionBlockers.length;b+=4){
   const box=stage.visionBlockers,dx=Math.max(box[b]-p.x,0,p.x-box[b+2]),dy=Math.max(box[b+1]-p.y,0,p.y-box[b+3]);
   if(Math.hypot(dx,dy)<=TILE)return true;
  }
  return false;
 }));
 const longestUnobservedUncovered=(r:number)=>{
  let current=0,longest=0;
  routeSamples[r].forEach((p,j)=>{current=!everVisible[r][j]&&!nearStructuralCover[r][j]?current+p.stepTiles:0;longest=Math.max(longest,current);});
  return round(longest);
 };
 const visibleCounts=[0,0],unoccludedCounts=[0,0];let snapshots=0,caseSeen=0,blind=0,maxBlind=0,watched=0,maxWatched=0;
 const guards=s.guards.map(g=>({id:g.id,role:def.guards.find(d=>d.id===g.id)?.role,assignedZones:def.patrolPlan?.assignments.find(a=>a.guardId===g.id)?.zones??[],distance:0,maxStationarySeconds:0,stationary:0,anchors:new Set<number>(),collisionSamples:0,recoveries:0,minX:g.x,maxX:g.x,minY:g.y,maxY:g.y}));
 for(let frame=0;frame<seconds*60;frame++){
  const previous=s.guards.map(g=>({x:g.x,y:g.y}));
  stepGuards(s.guards,{x:-1000,y:-1000,gait:0},stage.visionBlockers,nav,dt,s.events,frame*dt,true,1,s.theft);
  s.guards.forEach((g,i)=>{
   const m=guards[i],d=Math.hypot(g.x-previous[i].x,g.y-previous[i].y);m.distance+=d;
   m.stationary=d<.001?m.stationary+dt:0;m.maxStationarySeconds=Math.max(m.maxStationarySeconds,m.stationary);
   g.route.forEach((p,j)=>{if(Math.hypot(g.x-p.x,g.y-p.y)<8)m.anchors.add(j);});
   m.recoveries=g.patrolRecoveries;m.minX=Math.min(m.minX,g.x);m.maxX=Math.max(m.maxX,g.x);m.minY=Math.min(m.minY,g.y);m.maxY=Math.max(m.maxY,g.y);
   if(frame%15===0&&!clearSegment(g.x,g.y,g.x,g.y,nav.blockers,BODY.guardRadius))m.collisionSamples++;
  });
  const sees=s.guards.some(g=>pointVisible(g,stage.objective.x,stage.objective.y,stage.visionBlockers));
  if(sees){caseSeen++;watched+=dt;blind=0;}else{blind+=dt;watched=0;}
  maxBlind=Math.max(maxBlind,blind);maxWatched=Math.max(maxWatched,watched);
  if(frame%30===0){snapshots++;
   routeSamples.forEach((points,r)=>points.forEach((p,j)=>{
    if(s.guards.some(g=>pointVisible(g,p.x,p.y,stage.visionBlockers))){visibleCounts[r]++;everVisible[r][j]=true;}
    if(s.guards.some(g=>Math.hypot(g.x-p.x,g.y-p.y)<=g.visionRange&&clearSegment(g.x,g.y,p.x,p.y,stage.visionBlockers)))unoccludedCounts[r]++;
   }));
  }
 }
 const propCounts:Record<string,number>={};def.props.forEach(p=>{propCounts[p.kind]=(propCounts[p.kind]??0)+1;});
 const floor=def.layout.reduce((n,row)=>n+[...row].filter(c=>c==='.').length,0);
 const routes=def.testRoutes!.slice(0,2).map((r,i)=>({name:r.name,longestUnobservedUncoveredTiles:longestUnobservedUncovered(i),lengthTiles:round(routeLength(r.points)),allSegmentsClear:r.points.slice(1).every((p,j)=>clearSegment(r.points[j].x*TILE,r.points[j].y*TILE,p.x*TILE,p.y*TILE,nav.blockers,BODY.playerRadius)),patrolTimeSpaceExposureFraction:round(visibleCounts[i]/(snapshots*routeSamples[i].length)),withinRangeUnoccludedFraction:round(unoccludedCounts[i]/(snapshots*routeSamples[i].length)),objectiveApproach:r.points.at(-2),pointsNearCoverFraction:round(routeSamples[i].filter(p=>def.props.some(prop=>PROP_KIT[prop.kind].cover&&Math.hypot(p.x-prop.x*TILE,p.y-prop.y*TILE)<2*TILE)).length/routeSamples[i].length)}));
 const traversals=[0,1].map(route=>({route:routes[route].name,...findWitness(def,route)}));
 const silentWitness=findWitness(def,0,true);
 const geometryTraversals=[0,1].map(route=>({route:routes[route].name,...playthrough(def,route,2,0,true)}));
 const escape=def.escapeRoutes![0];
 return {id:def.id,title:def.title,seconds,simulationHz:60,exposureSampleHz:2,mapTiles:[stage.cols,stage.rows],floorTiles:floor,propCount:def.props.length,propCounts,propsPerFloorTile:round(def.props.length/floor),landmark:def.landmark,objective:def.objective,entry:def.entryPosition,exit:def.exitPosition,routes,traversals,silentWitness,geometryTraversals,escape:{name:escape.name,lengthTiles:round(routeLength(escape.points)),allSegmentsClear:escape.points.slice(1).every((p,j)=>clearSegment(escape.points[j].x*TILE,escape.points[j].y*TILE,p.x*TILE,p.y*TILE,nav.blockers,BODY.playerRadius)),endsAtExit:Math.hypot(escape.points.at(-1)!.x-def.exitPosition!.x,escape.points.at(-1)!.y-def.exitPosition!.y)<.01},caseCoverage:{visibleFraction:round(caseSeen/(seconds*60)),longestBlindSeconds:round(maxBlind),longestWatchedSeconds:round(maxWatched)},guards:guards.map((g,i)=>({id:g.id,role:g.role,assignedZones:g.assignedZones,distanceTiles:round(g.distance/TILE),maxStationarySeconds:round(g.maxStationarySeconds),visitedAnchors:g.anchors.size,totalAnchors:s.guards[i].route.length,collisionSamples:g.collisionSamples,recoveries:g.recoveries,travelBoundsTiles:[g.minX,g.minY,g.maxX,g.maxY].map(n=>round(n/TILE))}))};
}
export function writeMuseumQA(){
 const missions=campaignStages.filter(d=>d.chapter===1).map(d=>measureMuseum(d));
 const notes=['Automated real-engine simulation only; no manual Simulator or iPhone acceptance.', '180 seconds per mission at 60 Hz; guards receive a hidden player so patrol behavior is measured without chase interference.', 'Exposure is route-space x patrol-time sampling at 2 Hz, not a single journey or a change to suspicion tuning.', 'Witness search is bounded to 30 mode/departure combinations per route and escape variant; silent search includes alternate escapes; found=false is UNVERIFIED, never a successful clear.', 'geometryTraversals remove guards explicitly and prove only real body-radius movement/pickup/exit geometry, not stealth balance.', 'Traversals use real collision, objective pickup, guards, theft, and exit without teleporting. Their maxSuspicion is the actual shared gameplay model.', 'Stationary duration includes initial start delay, authored wait and turn; anchor coverage and recovery counts expose stuck patrols. Zone names are semantic labels, not enforceable polygon boundaries.', 'Near-cover fraction is a two-tile prop proximity measure, not a guarantee of occlusion.', 'Longest unobserved/uncovered segment is sampled every <=0.25 tile: never visible at 2Hz during the three-minute patrol AND farther than one tile from any vision-blocking wall/cover. This flags empty walking, not artistic emptiness.'];
 mkdirSync('Reports/MuseumChapterQA',{recursive:true});
 writeFileSync('Reports/MuseumChapterQA/metrics.json',JSON.stringify({notes,missions},null,2)+'\n');
 const lines=['# Museum automated QA comparison','',...notes.map(n=>'- '+n),'','## Mission roles','', '|Mission|Main route|Alternate route|Landmark|Objective|Escape|Core gameplay|','|---|---|---|---|---|---|---|', ...missions.map(m=>`|${m.id}|${m.routes[0].name}|${m.routes[1].name}|${m.landmark?.name}|${m.objective?.kind}|${m.escape.name}|${m.title}|`),'','','## Measured geometry and exposure','', '|Mission|Map / floor tiles|Guards|Safe / risk tiles|Safe / risk exposure|Landmark|Escape tiles|','|---|---|---|---|---|---|---|',...missions.map(m=>`|${m.id}|${m.mapTiles.join(' × ')} / ${m.floorTiles}|${m.guards.length}|${m.routes.map(r=>r.lengthTiles).join(' / ')}|${m.routes.map(r=>(r.patrolTimeSpaceExposureFraction*100).toFixed(1)+'%').join(' / ')}|${m.landmark?.name}|${m.escape.lengthTiles}|`),'','## Empty traversal flags','', '|Mission|Main / alternate longest unobserved, uncovered tiles|','|---|---|',...missions.map(m=>`|${m.id}|${m.routes.map(r=>r.longestUnobservedUncoveredTiles).join(' / ')}|`),'','## Continuous traversal witnesses','','|Mission|Route|Input mode / delay|Clear|Alert count / theft|Time|Peak suspicion|','|---|---|---|---|---|---|---|',...missions.flatMap(m=>m.traversals.map(t=>`|${m.id}|${t.route}|${t.mode} / ${t.departureDelaySeconds}s|${t.clear}|${t.alertCount} / ${t.theft}|${t.time.toFixed(2)}s|${(t.maxSuspicion*100).toFixed(1)}%|`)),'','## Silent continuous main-route witnesses','', '|Mission|Mode / delay|Clear|Alert count / theft|Time|', '|---|---|---|---|---|', ...missions.map(m=>`|${m.id}|${m.silentWitness.mode} / ${m.silentWitness.departureDelaySeconds}s|${m.silentWitness.clear}|${m.silentWitness.alertCount} / ${m.silentWitness.theft}|${m.silentWitness.time.toFixed(2)}s|`),'','## Patrol integrity','','|Mission / guard|Anchors visited|Travel tiles|Longest stationary|Recoveries|Collision samples|','|---|---|---|---|---|---|',...missions.flatMap(m=>m.guards.map(g=>`|${m.id} / ${g.id}|${g.visitedAnchors}/${g.totalAnchors}|${g.distanceTiles}|${g.maxStationarySeconds}s|${g.recoveries}|${g.collisionSamples}|`)),''];
 writeFileSync('Reports/MuseumChapterQA/comparison.md',lines.join('\n'));
 return missions;
}
if(process.argv[1]?.endsWith('museumQA.ts'))console.log(JSON.stringify(writeMuseumQA().map(m=>({id:m.id,routes:m.routes,guards:m.guards,caseCoverage:m.caseCoverage})),null,2));
