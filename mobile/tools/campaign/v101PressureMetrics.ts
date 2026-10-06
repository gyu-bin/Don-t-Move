/** V10.1 independent pressure/mitigation observations. These are proxies, not a difficulty score. */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {stepSecurityCameras} from '../../src/game/security/cctv';
import {buildVisionFan,pointVisible} from '../../src/game/guards/guardVision';

type Point={x:number;y:number};
const round=(n:number)=>+n.toFixed(4);
const mean=(a:number[])=>a.reduce((n,v)=>n+v,0)/Math.max(1,a.length);
function sampleRoute(route:Point[]) {
 const points:Point[]=[];const distances:number[]=[];let distance=0;
 route.forEach((b,i)=>{if(!i){points.push({x:b.x*TILE,y:b.y*TILE});distances.push(0);return;}
  const a=route[i-1],length=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(length*2));
  for(let j=1;j<=n;j++){points.push({x:(a.x+(b.x-a.x)*j/n)*TILE,y:(a.y+(b.y-a.y)*j/n)*TILE});distances.push(distance+length*j/n);}distance+=length;
 });return{points,distances,length:distance};
}
export function auditPressureMitigation(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 const floor:Point[]=[];
 for(let y=.5;y<stage.rows;y++)for(let x=.5;x<stage.cols;x++)if(stage.grid[Math.floor(y)*stage.cols+Math.floor(x)]===1&&clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,stage.movementBlockers,BODY.playerRadius))floor.push({x:x*TILE,y:y*TILE});
 const safe=sampleRoute((def.testRoutes?.find(r=>r.name.startsWith('safe'))??def.testRoutes?.[0])?.points??[]);
 const escapes=(def.escapeRoutes??[]).map(r=>({name:r.name,...sampleRoute(r.points)}));
 const approach=floor.filter(p=>Math.hypot(p.x-stage.objective.x,p.y-stage.objective.y)<=2*TILE&&clearSegment(p.x,p.y,stage.objective.x,stage.objective.y,stage.movementBlockers,BODY.playerRadius));
 const coverDistance=(p:Point)=>{let best=Infinity;for(let i=0;i<stage.visionBlockers.length;i+=4){const b=stage.visionBlockers;best=Math.min(best,Math.hypot(Math.max(b[i]-p.x,0,p.x-b[i+2]),Math.max(b[i+1]-p.y,0,p.y-b[i+3]))/TILE);}return best;};
 const narrow=floor.filter(p=>{const free=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>clearSegment(p.x,p.y,p.x+dx*TILE,p.y+dy*TILE,stage.movementBlockers,BODY.playerRadius));return free.filter(Boolean).length<=2;}).length;
 const hidden={x:-10000,y:-10000,gait:0};
 function phase(theft:boolean){
  const s=createPlaygroundState(stage);s.theft.empty=theft;
  const exposed=floor.map(()=>0),routeExposure=escapes.map(r=>r.points.map(()=>0));
  const routeLosBreak=escapes.map(r=>r.points.map(()=>0));
  const routeGuard=escapes.map(()=>0),routeCctv=escapes.map(()=>0),routeOverlap=escapes.map(()=>0);
  const safeExposed=safe.points.map(()=>0),safeFreeRun=safe.points.map(()=>0),safeMaxRun=safe.points.map(()=>0);
  let samples=0,guard=0,cctv=0,overlap=0,approachExposure=0,losBreak=0,alertAt:number|null=null,patrolCrossings=0;
  const onRoute=s.guards.map(()=>false);
  for(let f=0;f<3600;f++){
   const t=(f+1)/60;stepSecurityCameras(s.securityCameras,hidden,stage.visionBlockers,s.events,1/60,t);stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,t,true,1,s.theft);
   if(s.events.theftAlert&&alertAt===null)alertAt=t;
   if(f%30)continue;samples++;s.guards.forEach(g=>buildVisionFan(g,stage.visionBlockers));
   const geometricBreak=(p:Point)=>s.guards.every(g=>!clearSegment(g.x,g.y,p.x,p.y,stage.visionBlockers))&&s.securityCameras.every(c=>!clearSegment(c.x,c.y,p.x,p.y,stage.visionBlockers));
   s.guards.forEach((g,i)=>{const near=safe.points.some(p=>Math.hypot(p.x-g.x,p.y-g.y)<=.6*TILE);if(near&&!onRoute[i])patrolCrossings++;onRoute[i]=near;});
   const counts=(p:Point)=>[s.guards.filter(g=>pointVisible(g,p.x,p.y,stage.visionBlockers)).length,s.securityCameras.filter(c=>pointVisible(c,p.x,p.y,stage.visionBlockers)).length];
   floor.forEach((p,i)=>{const[g,c]=counts(p);if(g+c)exposed[i]++;guard+=Number(g>0);cctv+=Number(c>0);overlap+=Number(g+c>1);
    if(geometricBreak(p))losBreak++;
   });
   approachExposure+=approach.filter(p=>counts(p).some(Boolean)).length;
   safe.points.forEach((p,i)=>{if(counts(p).some(Boolean)){safeExposed[i]++;safeFreeRun[i]=0;}else{safeFreeRun[i]++;safeMaxRun[i]=Math.max(safeMaxRun[i],safeFreeRun[i]);}});
   escapes.forEach((r,i)=>r.points.forEach((p,j)=>{const[g,c]=counts(p);routeExposure[i][j]+=Number(g+c>0);routeLosBreak[i][j]+=Number(geometricBreak(p));routeGuard[i]+=Number(g>0);routeCctv[i]+=Number(c>0);routeOverlap[i]+=Number(g+c>1);}));
  }
  const denominator=Math.max(1,floor.length*samples);
  const routes=escapes.map((r,i)=>{const d=Math.max(1,r.points.length*samples),exposure=routeExposure[i].map(n=>n/samples);
   const firstGeometricBreak=routeLosBreak[i].findIndex(n=>n/samples>=.9);
   const firstBreak=exposure.findIndex(n=>n<=.1); // [PLACEHOLDER] <=10% phase exposure is a waiting-pocket candidate, not guaranteed safety.
   let crossings=0,last=false;exposure.forEach(n=>{const current=n>.1;if(current&&!last)crossings++;last=current;});
   const valid=r.points.every((p,j)=>!j||clearSegment(r.points[j-1].x,r.points[j-1].y,p.x,p.y,stage.movementBlockers,BODY.playerRadius));
   return{name:r.name,lengthTiles:round(r.length),collisionClear:valid,exposure:round(mean(exposure)),guardExposure:round(routeGuard[i]/d),cctvExposure:round(routeCctv[i]/d),overlap:round(routeOverlap[i]/d),firstGeometricLosBreakTiles:firstGeometricBreak<0?null:round(r.distances[firstGeometricBreak]),geometricLosBreakFraction:round(mean(routeLosBreak[i].map(n=>n/samples))),firstLowExposurePocketTiles:firstBreak<0?null:round(r.distances[firstBreak]),firstCoverProximityTiles:(()=>{const i=r.points.findIndex(p=>coverDistance(p)<=.75);return i<0?null:round(r.distances[i]);})(),exposedBands:crossings,pointExposure:exposure.map(round)};
  });
  return{patrolCrossingsNearSafeRoutePerMinute:patrolCrossings,guardCoverage:round(guard/denominator),cctvCoverage:round(cctv/denominator),overlap:round(overlap/denominator),objectiveApproachExposure:round(approachExposure/Math.max(1,approach.length*samples)),geometricLosBreakFraction:round(losBreak/denominator),neverExposedFloorFraction:round(exposed.filter(n=>!n).length/Math.max(1,floor.length)),safeRouteExposure:round(mean(safeExposed.map(n=>n/samples))),safeRouteWorstPointExposure:round(Math.max(0,...safeExposed)/samples),safeRouteMedianLongestWindowSeconds:round(safeMaxRun.map(n=>n*.5).sort((a,b)=>a-b)[Math.floor(safeMaxRun.length/2)]??0),theftAlertAtSeconds:alertAt===null?null:round(alertAt),globalPlayerAlert:s.events.globalAlert,routes};
 }
 const patrol=phase(false),search=phase(true);
 return{mapAreaTiles:stage.cols*stage.rows,layoutFloorTiles:def.layout.join('').split('').filter(c=>c==='.').length,traversableTileCenters:floor.length,narrowTileFraction:round(narrow/Math.max(1,floor.length)),coverProximityFraction:round(floor.filter(p=>coverDistance(p)<=.75).length/Math.max(1,floor.length)),objectiveApproachSampleCount:approach.length,authoredSafeRouteSampleCount:safe.points.length,authoredEscapeRoutes:escapes.length,alternateRouteDistinctness:escapes.length<2?null:round(1-mean(escapes.slice(1).map(r=>r.points.filter(p=>escapes[0].points.some(a=>Math.hypot(a.x-p.x,a.y-p.y)<.5*TILE)).length/Math.max(1,r.points.length)))),patrol,search};
}
