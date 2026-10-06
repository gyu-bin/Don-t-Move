/** Strict checks against compiled walls/props/closed-door geometry, not plan labels alone. */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import type {V124bPlan,V124bAudit,Point} from './v124bTypes';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment,buildNavigation,findPath} from '../../src/game/world/navigation';
import {physicalRoute,stageWithLockdown,firstBreakErrors,physicalEdgeRoute} from './v124bBuilder';
export function routeRooms(p:V124bPlan,points:Point[]):string[]{
 const seen:string[]=[];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*4));for(let n=0;n<=steps;n++){const x=a.x+(b.x-a.x)*n/steps,y=a.y+(b.y-a.y)*n/steps;for(const r of p.rooms)if(x>=r.x+.05&&x<r.x+r.w-.05&&y>=r.y+.05&&y<r.y+r.h-.05&&!seen.includes(r.id))seen.push(r.id);}}return seen;
}
function shortest(def:StageDefinition,a:Point,b:Point,closed=false){return physicalRoute(def,[a,b],closed);}
export function pathLength(points:Point[]){return points.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y):0,0);}
/** Half a floor tile (20 world px) excludes rounding-only changes to the best escape. */
export const MIN_LOCKDOWN_DETOUR_TILES=.5;
export function auditV124bTopology(def:StageDefinition):V124bAudit{
 const p=def.topologyPlan;if(!p)throw Error(`${def.id}: missing topology plan`);const errors:string[]=[];
 const entry=def.playerSpawn,goal=def.objective!,exit=def.exitPosition!;let openReachable=false,closedReachable=false,approachZones:string[]=[],escapeZones:string[]=[],approachPath:Point[]=[],escapePath:Point[]=[];
 try{const approach=shortest(def,entry,goal);approachPath=approach;approachZones=routeRooms(p,approach);openReachable=true;}catch(e){errors.push(String(e));}
 try{const escape=shortest(def,goal,exit,true);escapePath=escape;escapeZones=routeRooms(p,escape);closedReachable=true;}catch(e){errors.push(String(e));}
 let openEscapeLength=NaN;try{openEscapeLength=pathLength(shortest(def,goal,exit));}catch(e){errors.push(String(e));}
 const closedEscapeLength=closedReachable?pathLength(escapePath):NaN;
 const quickEscapeLength=pathLength(def.escapeRoutes?.[0]?.points??[]),alternateEscapeLength=pathLength(def.escapeRoutes?.[1]?.points??[]);
 if(Number.isFinite(openEscapeLength)&&Number.isFinite(closedEscapeLength)&&closedEscapeLength-openEscapeLength<MIN_LOCKDOWN_DETOUR_TILES-1e-6)errors.push('Lockdown does not add at least 0.5 tile to actual shortest escape');
 if(!quickEscapeLength||!alternateEscapeLength||alternateEscapeLength-quickEscapeLength<MIN_LOCKDOWN_DETOUR_TILES-1e-6)errors.push('Authored quick escape is not at least 0.5 tile shorter than CLOSED alternate');
 const entryExitDistance=Math.hypot(entry.x-exit.x,entry.y-exit.y);if(entryExitDistance<8)errors.push('Entry and Exit separation below 8 tiles');
 if(p.entryRoom===p.exitRoom||p.entryRoom===p.objectiveRoom||p.exitRoom===p.objectiveRoom)errors.push('Entry/objective/exit must occupy distinct zones');
 if(approachZones.length<3||!approachZones.includes(p.objectiveRoom)||!approachZones.some(id=>p.rooms.find(r=>r.id===id)?.role==='restricted'))errors.push('Actual shortest approach bypasses required 3-zone restricted infiltration');
 const newEscapeZones=escapeZones.filter(id=>!approachZones.includes(id));if(newEscapeZones.filter(id=>id!==p.exitRoom).length<2)errors.push('Actual CLOSED escape requires two distinct new service zones before exit');
 const overlap=escapeZones.filter(id=>approachZones.includes(id)&&id!==p.objectiveRoom).length/Math.max(1,escapeZones.length-1);if(overlap>.5)errors.push('Actual approach/escape zone overlap exceeds 50%');
 const sample=(path:Point[])=>{const out:Point[]=[];for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)*2));for(let j=1;j<=n;j++){const q={x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n};if(Math.hypot(q.x-goal.x,q.y-goal.y)>2)out.push(q);}}return out;};
 const ap=sample(approachPath),ep=sample(escapePath),physicalOverlap=ep.filter(q=>ap.some(a=>Math.hypot(a.x-q.x,a.y-q.y)<.7)).length/Math.max(1,ep.length);
 if(physicalOverlap>.5)errors.push('Actual CLOSED escape physically overlaps approach above 50%');
 const stage=compileStage(def),nav=buildNavigation(stage,20),closed=stageWithLockdown(def);
 for(const d of def.doors??[]){const horizontal=d.orientation==='horizontal',row=Math.floor(d.y),col=Math.floor(d.x),isFloor=(x:number,y:number)=>def.layout[y]?.[x]==='.';let lo=horizontal?col:row,hi=lo;
 if(!isFloor(col,row)){errors.push(`Floating door not on floor: ${d.id}`);continue;}
 while(isFloor(horizontal?lo-1:col,horizontal?row:lo-1))lo--;while(isFloor(horizontal?hi+1:col,horizontal?row:hi+1))hi++;
 if(hi-lo+1>5||Math.abs(hi-lo+1-d.width)>.01)errors.push(`Floating door/jamb gap: ${d.id}`);
 }
 for(const g of def.guards)if(!clearSegment(g.x*TILE,g.y*TILE,g.x*TILE,g.y*TILE,nav.blockers,8))errors.push(`Guard body intersects blocker: ${g.id}`);
 if(!def.safeZones?.[1])errors.push('Missing certified first LOS break');else errors.push(...firstBreakErrors(def,def.safeZones[1],def.safeZones[1].radius));
 for(const q of def.safeZones??[])if(!clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,nav.blockers,20+q.radius*TILE))errors.push('Safe waiting pocket body/margin intersects solid geometry');
 for(const c of stage.cameras??[])if(!clearSegment(c.x,c.y,c.x,c.y,stage.visionBlockers,0))errors.push(`CCTV origin inside opaque blocker: ${c.id}`);
 // Every declared graph edge must correspond to a physical 20px-clear corridor.
 for(const e of p.edges){try{physicalEdgeRoute(def,p,e);}catch(err){errors.push(`Edge ${e.from}→${e.to}: ${String(err)}`);}}
 // Stored routes cannot use fallback endpoints or clip a wall/prop.
 for(const r of [...(def.testRoutes??[]),...(def.escapeRoutes??[])]){for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];const blockers=r.name.includes('after lockdown')?closed.movementBlockers:nav.blockers;if(!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,blockers,20)){errors.push(`Route collision/fake gap: ${r.name}`);break;}}}
 // Designated closure must actually interrupt the corresponding quick route.
 if(!def.lockdownDoors?.length)errors.push('No designated lockdown door');
 const quick=def.escapeRoutes?.[0];if(quick&&!quick.points.some((b,i)=>i>0&&!clearSegment(quick.points[i-1].x*TILE,quick.points[i-1].y*TILE,b.x*TILE,b.y*TILE,closed.movementBlockers,20)))errors.push('Designated CLOSED door does not block quick route');
 // Guards remain physically connected across their authored patrol; radius9 is real body footprint.
 const gnav=buildNavigation(stage,9);for(const r of def.patrolRoutes)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];const path=findPath(gnav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);if(path.length<2||Math.hypot(path.at(-2)!/TILE-b.x,path.at(-1)!/TILE-b.y)>.01){errors.push(`Guard nav disconnected: ${r.id}`);break;}}
 return {id:def.id,errors,entryExitDistance,approachZones,escapeZones,newEscapeZones,overlap,physicalOverlap,openReachable,closedReachable,openEscapeLength,closedEscapeLength,quickEscapeLength,alternateEscapeLength};
}
export function auditV124bCampaign(defs:StageDefinition[]){const reports=defs.map(auditV124bTopology);return {pass:reports.filter(r=>!r.errors.length).length,fail:reports.filter(r=>r.errors.length).length,reports};}

/** Fixed authored Walk approach + Run escape measurement; no immunity, no AI/target teleport. */
export async function measureV124bRoutePressure(def:StageDefinition,routeIndex:0|1,departureDelay=0){
 const {createPlaygroundState,stepPlayground}=await import('../../src/game/playground/playgroundState');
 const stage=compileStage(def),nav=buildNavigation(stage,8),s=createPlaygroundState(stage),approach=def.testRoutes![routeIndex].points,points=[...approach,...def.escapeRoutes![0].points.slice(1)];
 let leg=1,guardExposure=0,cameraExposure=0,combined=0,overlap=0,longest=0,continuous=0,pickupAt:number|null=null;
 for(let f=0;f<3600&&!s.events.caught&&!s.mission.complete;f++){
  if(s.t>=departureDelay){s.playerMode=leg>=approach.length?3:2;s.player.tx=points[leg].x*TILE;s.player.ty=points[leg].y*TILE;s.player.hasTarget=true;}else s.playerMode=0;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  const gv=s.guards.some(g=>g.canSee),cv=s.securityCameras.some(c=>c.canSee);if(gv)guardExposure+=1/60;if(cv)cameraExposure+=1/60;if(gv&&cv)overlap+=1/60;
  if(gv||cv){combined+=1/60;continuous+=1/60;longest=Math.max(longest,continuous);}else continuous=0;
  if(s.mission.treasure)pickupAt??=s.t;
  if(s.t>=departureDelay&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
 }
 const round=(n:number)=>Math.round(n*100)/100;
 return {id:def.id,route:def.testRoutes![routeIndex].name,method:'OFFLINE shared60Hzruntime; fixedauthoredWalk/Run input, no immunity/teleport; no native difficulty certification',outcome:s.mission.complete?'CLEAR':s.events.caught?'CAUGHT':'INPUT_LIMITATION',time:round(s.t),pickupAt,leg,guardExposure:round(guardExposure),cameraExposure:round(cameraExposure),combined:round(combined),overlap:round(overlap),longest:round(longest)};
}
