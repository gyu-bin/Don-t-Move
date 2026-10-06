/**
 * V12 Phase 5 — Chapter 1–5 gameplay tuning layer.
 *
 * Applied on top of the Phase 4D composition. It changes level security data only:
 * patrol waits and reach, guard start delays, post-theft search sectors, and CCTV placement/facing.
 * Map geometry, structures, doors, entry/exit/objective, art, guard perception/speed and CCTV
 * detection constants are never touched (v125Scope.test.ts enforces this).
 */
import type {StageDefinition,PatrolPoint} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,findPath,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';

type Point={x:number;y:number};
export interface Phase5Tuning {
 /** Objective guard dwell in seconds: [at the inspection post, at the away post]. A long away dwell is the approach window. */
 objectiveWait?:[number,number];
 /** Dwell at each stop for the other guards. */
 patrolWait?:number;
 /** Start delay per guard, in guard order. */
 startDelays?:number[];
 /** Guard indexes whose patrol also walks to the next room on the approach, so the crossing needs timing. */
 reach?:number[];
 /** Re-authored patrol stops by guard index (tile coordinates). The guard starts on the first stop and ping-pongs
  *  through them on straight, clear legs. Used where the authored patrol stood on the approach line itself. */
 patrol?:Record<number,Point[]>;
 /** Where the objective guard walks to between inspections. Farther from the prize means a longer, clearer window. */
 objectiveAway?:Point;
 /** How many non-objective guards sweep the escape side after a theft (0 keeps the escape unguarded). */
 escapeSweeps?:number;
 /** Move camera i: room centre-relative placement stays authored; only position/facing change. */
 moveCamera?:{index:number;at:Point;facing:number}[];
 /** Add one camera, copied from the chapter's approved camera so detection constants stay identical. */
 addCamera?:{at:Point;facing:number}[];
 removeCamera?:number[];
 note:string;
}

const LEG_RADIUS=BODY.guardRadius+1;
function stops(route:{points:PatrolPoint[]}){return route.points.filter(p=>(p.waitDuration??0)>0);}
export function straightLegs(def:StageDefinition,from:Point,to:Point):Point[]{
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 const path=findPath(nav,from.x*TILE,from.y*TILE,to.x*TILE,to.y*TILE);
 if(path.length<2||Math.hypot(path.at(-2)!-to.x*TILE,path.at(-1)!-to.y*TILE)>.1)throw Error(`${def.id}: phase5 patrol target unreachable ${to.x},${to.y}`);
 // Start from the exact stop, not the nearest grid node, so the first leg is checked too.
 const nodes:Point[]=[{x:from.x*TILE,y:from.y*TILE}];for(let i=0;i<path.length;i+=2)nodes.push({x:path[i],y:path[i+1]});
 const legs:Point[]=[];
 for(let i=0;i<nodes.length-1;){
  let j=nodes.length-1;while(j>i+1&&!clearSegment(nodes[i].x,nodes[i].y,nodes[j].x,nodes[j].y,stage.movementBlockers,LEG_RADIUS))j--;
  if(!clearSegment(nodes[i].x,nodes[i].y,nodes[j].x,nodes[j].y,stage.movementBlockers,BODY.guardRadius))throw Error(`${def.id}: phase5 patrol leg blocked near ${nodes[j].x/TILE},${nodes[j].y/TILE}`);
  legs.push(nodes[j]);i=j;
 }
 return legs.map(p=>({x:+(p.x/TILE).toFixed(2),y:+(p.y/TILE).toFixed(2)}));
}
function anchorOk(def:StageDefinition,guard:Point,p:Point){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),path=findPath(nav,guard.x*TILE,guard.y*TILE,p.x*TILE,p.y*TILE);
 return path.length>=2&&Math.hypot(path.at(-2)!-p.x*TILE,path.at(-1)!-p.y*TILE)<=.1&&clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,stage.movementBlockers,BODY.guardRadius);
}
/** Point at a fraction of a polyline's length. */
function along(points:Point[],fraction:number):Point{
 const lengths=points.slice(1).map((b,i)=>Math.hypot(b.x-points[i].x,b.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0);
 let d=total*fraction;
 for(let i=0;i<lengths.length;i++){if(d<=lengths[i]){const k=lengths[i]?d/lengths[i]:0;return {x:points[i].x+(points[i+1].x-points[i].x)*k,y:points[i].y+(points[i+1].y-points[i].y)*k};}d-=lengths[i];}
 return points.at(-1)!;
}

export function applyPhase5(source:StageDefinition,tuning:Phase5Tuning|undefined):StageDefinition{
 if(!tuning)return source;
 const def=structuredClone(source),plan=def.topologyPlan!;
 const objectiveIndex=def.guards.findIndex(g=>g.role==='objective');

 const restop=(index:number,points:Point[],look:(q:Point)=>number)=>{
  const guard=def.guards[index],route=def.patrolRoutes!.find(r=>r.id===guard.routeId)!;
  const out:PatrolPoint[]=[{...points[0],waitDuration:1.5,lookDirection:look(points[0]),turnDuration:.4}];
  for(let i=1;i<points.length;i++){const legs=straightLegs(def,points[i-1],points[i]);legs.forEach((q,k)=>out.push({...q,waitDuration:k===legs.length-1?1.5:0,lookDirection:look(q),turnDuration:.4}));}
  // Authored routes list the way back too, so the sequence closes on straight, clear legs (the Bank QA walks it as a loop).
  const back=straightLegs(def,points.at(-1)!,points[0]).slice(0,-1);
  for(const q of back)out.push({...q,waitDuration:0,lookDirection:look(q),turnDuration:.4});
  route.points=out;guard.x=points[0].x;guard.y=points[0].y;
  guard.theftPosts=points.slice(0,2).map(q=>({...q}));
  guard.theftSearchSectors=[{id:guard.theftSearchSectors?.[0]?.id??`${guard.id}: patrol`,anchors:points.map(q=>({...q}))}];
  const zone=def.securityZones?.find(z=>z.guardId===guard.id);
  if(zone&&!points.some(q=>Math.hypot(q.x-zone.x,q.y-zone.y)<=zone.radius+1))throw Error(`${def.id}: phase5 patrol for guard ${index} leaves its security zone`);
 };
 for(const [key,points] of Object.entries(tuning.patrol??{})){
  const index=Number(key);if(index===objectiveIndex)throw Error(`${def.id}: use objectiveAway for the objective guard`);
  const authored=plan.patrols?.[index%(plan.patrols?.length??1)],room=plan.rooms.find(r=>r.id===authored?.room);
  const c=room?{x:room.x+room.w/2,y:room.y+room.h/2}:points[0];
  restop(index,points,q=>Math.atan2(c.y-q.y,c.x-q.x));
 }
 if(tuning.objectiveAway){
  const guard=def.guards[objectiveIndex],route=def.patrolRoutes!.find(r=>r.id===guard.routeId)!,inspect=stops(route)[0],o=def.objective!;
  const facing=guard.facing!;
  // Inspection post keeps its authored facing (at the prize); everywhere else the guard looks away from it.
  restop(objectiveIndex,[{x:inspect.x,y:inspect.y},tuning.objectiveAway],q=>Math.hypot(q.x-inspect.x,q.y-inspect.y)<.01?facing:Math.atan2(q.y-o.y,q.x-o.x));
 }

 if(tuning.reach)for(const index of tuning.reach){
  const guard=def.guards[index],route=def.patrolRoutes!.find(r=>r.id===guard.routeId)!,authored=plan.patrols?.[index%(plan.patrols?.length??1)];
  const order=plan.approach,at=authored?order.indexOf(authored.room):-1;
  const nextId=at>=0?order[at+1]??order[at-1]:undefined,next=plan.rooms.find(r=>r.id===nextId);
  if(!next)throw Error(`${def.id}: phase5 reach has no neighbouring approach room for guard ${index}`);
  // Stand just inside the neighbouring room, on the side nearest the guard's own room.
  const last=stops(route).at(-1)!,cx=next.x+next.w/2,cy=next.y+next.h/2;
  const target={x:+Math.max(next.x+1.25,Math.min(next.x+next.w-1.25,cx+(last.x-cx)*.35)).toFixed(2),y:+Math.max(next.y+1.25,Math.min(next.y+next.h-1.25,cy+(last.y-cy)*.35)).toFixed(2)};
  const legs=straightLegs(def,last,target);
  route.points=[...route.points,...legs.map((p,i)=>({...p,waitDuration:i===legs.length-1?1.5:0,lookDirection:Math.atan2(cy-p.y,cx-p.x),turnDuration:.4}))];
 }

 def.guards.forEach((guard,i)=>{
  const route=def.patrolRoutes!.find(r=>r.id===guard.routeId)!,stopPoints=stops(route);
  if(i===objectiveIndex&&tuning.objectiveWait)stopPoints.forEach((p,k)=>{p.waitDuration=tuning.objectiveWait![k===0?0:1];});
  if(i!==objectiveIndex&&tuning.patrolWait!==undefined)for(const p of stopPoints)p.waitDuration=tuning.patrolWait;
  if(tuning.startDelays?.[i]!==undefined)guard.startDelay=tuning.startDelays[i];
 });

 if(tuning.escapeSweeps){
  // After the theft the nearest free guards leave their rooms and walk the middle of the escape routes:
  // first the secondary (service) route, then the quick route. They never stand on the exit itself.
  const routes=[def.escapeRoutes![1]??def.escapeRoutes![0],def.escapeRoutes![0]],exit={x:def.exit!.x+def.exit!.w/2,y:def.exit!.y+def.exit!.h/2};
  const free=def.guards.map((g,i)=>({g,i})).filter(({i})=>i!==objectiveIndex),taken=new Set<number>();
  for(let n=0;n<Math.min(tuning.escapeSweeps,free.length);n++){
   const escape=routes[n%routes.length].points,mid=along(escape,.5);
   const pick=free.filter(f=>!taken.has(f.i)).sort((a,b)=>Math.hypot(a.g.x-mid.x,a.g.y-mid.y)-Math.hypot(b.g.x-mid.x,b.g.y-mid.y)||a.i-b.i)[0];
   taken.add(pick.i);
   const anchors:Point[]=[];
   for(const fraction of [.35,.5,.65]){
    const base=along(escape,fraction);
    const candidate=[[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5],[.75,.75],[-.75,-.75],[.75,-.75],[-.75,.75]].map(([dx,dy])=>({x:+(base.x+dx).toFixed(2),y:+(base.y+dy).toFixed(2)}))
     .find(p=>Math.hypot(p.x-exit.x,p.y-exit.y)>=4&&anchorOk(def,pick.g,p));
    if(candidate&&!anchors.some(a=>Math.hypot(a.x-candidate.x,a.y-candidate.y)<1.5))anchors.push(candidate);
   }
   if(anchors.length<2)throw Error(`${def.id}: phase5 escape sweep has no walkable mid-route anchors`);
   pick.g.theftRole=n===0?'corridor':'zone';
   pick.g.theftPosts=anchors.slice(0,2);
   pick.g.theftSearchSectors=[{id:`${pick.g.id}: ${n===0?'secondary escape':'quick escape'} sweep`,anchors}];
  }
 }

 const cameras=def.cameras??[];
 for(const move of tuning.moveCamera??[]){const c=cameras[move.index];if(!c)throw Error(`${def.id}: phase5 camera ${move.index} missing`);c.x=move.at.x;c.y=move.at.y;c.centerFacing=move.facing;}
 if(tuning.removeCamera)def.cameras=cameras.filter((_,i)=>!tuning.removeCamera!.includes(i));
 return def;
}

/** Cameras are added from the chapter's own approved camera so every detection constant is inherited unchanged. */
export function addPhase5Cameras(def:StageDefinition,tuning:Phase5Tuning|undefined,campaign:StageDefinition[]):StageDefinition{
 if(!tuning?.addCamera?.length)return def;
 const template=campaign.flatMap(s=>s.chapter===def.chapter?s.cameras??[]:[])[0]??campaign.flatMap(s=>s.chapter===3?s.cameras??[]:[])[0];
 if(!template)throw Error(`${def.id}: no approved CCTV template`);
 const out=structuredClone(def);out.cameras=[...(out.cameras??[])];
 for(const add of tuning.addCamera)out.cameras.push({...structuredClone(template),id:`${def.id}-cam${out.cameras.length+1}`,x:add.at.x,y:add.at.y,centerFacing:add.facing});
 return out;
}

/**
 * Authored Phase 5 values, proposed by v125Search.ts against each chapter's intended pressure and then fixed here
 * as plain data. Escape sweeps follow the chapter, not the mission: Museum 0 (the first LOS break is the whole
 * escape lesson), Gallery and Bank 1 (the secondary route is watched), Lab and Casino 2 (both routes are).
 */
export const PHASE5:Record<string,Phase5Tuning>={
 // Chapter 1 — Museum (EASY). Long objective-guard dwell gives a readable approach window; no escape sweep.
 '01-01':{objectiveWait:[1.5,5],patrolWait:4.5,note:'Objective guard caught 18 of 24 scripted approaches; a 5s away dwell opens the window. Hall guard lingers so its pattern reads at a glance.'},
 '01-02':{patrolWait:4.5,reach:[0],note:'Was the one Museum map with no pressure on the direct line; the hall guard now walks into the next room.'},
 '01-03':{objectiveWait:[1.5,5],patrolWait:3,note:'Slightly above its chapter; longer, readable dwells bring it level with 01-01/01-02.'},
 '01-04':{moveCamera:[{index:0,at:{x:5.25,y:12.75},facing:2.36}],objectiveWait:[1.5,3],
  note:'The Museum spike (0 of 24 scripted clears). Its camera sat in the desk room on top of the desk guard — CCTV plus guard on one doorway, which Museum must not have. The camera now watches the unguarded records room on the safe route, and the objective guard dwells 3s away from the prize.'},
 // 01-05 is unchanged: it already sits at Museum level with both routes clearing.
 // Chapter 2 — Gallery (EASY+). Same guard count as Museum; pressure comes from timing the open crossings and a watched secondary escape.
 '02-01':{patrolWait:4.5,escapeSweeps:1,note:'Cleared on every scripted run. The crossing guard now holds each end long enough that the open floor has to be timed.'},
 '02-02':{objectiveWait:[1.5,3],patrolWait:4.5,escapeSweeps:1,note:'Objective guard caught every safe-route run after pickup; a 3s away dwell makes the safe route real.'},
 '02-03':{escapeSweeps:1,note:'Approach already sits at Gallery level (camera + two patrols); only the secondary escape gains a sweep.'},
 '02-04':{objectiveWait:[1.5,5],escapeSweeps:1,note:'Cleared on every scripted run. The long objective dwell keeps the guard on the open crossing side longer.'},
 '02-05':{patrol:{0:[{x:15.75,y:20.25},{x:14.25,y:23.25}]},escapeSweeps:1,note:'Gallery finale cleared 20 of 24 scripted runs, easier than most of Museum. The hall guard now patrols across the open floor in front of the corridor, so the crossing has to be timed.'},
 // Chapter 3 — Bank (MEDIUM). Staggered starts separate the layers; the service route is swept after a theft.
 '03-01':{objectiveWait:[1.5,3],patrolWait:4.5,escapeSweeps:1,note:'No scripted approach survived the lobby and staff patrols together; longer dwells separate the two layers.'},
 '03-02':{objectiveWait:[1.5,3],patrolWait:4.5,patrol:{0:[{x:14.75,y:20.25},{x:11.75,y:23.25}]},escapeSweeps:1,note:'The Bank spike (0 of 24). The office guard stood on the only doorway line; it now patrols the desk side so the doorway has a window.'},
 '03-03':{objectiveWait:[1.5,5],startDelays:[0,3,4],escapeSweeps:1,note:'Staff corridor guard starts 1s later so public and staff patrols no longer cross the same doorway together.'},
 '03-04':{objectiveWait:[1.5,3],escapeSweeps:1,note:'Vault guard dwell lengthened; both approaches now clear.'},
 '03-05':{startDelays:[0,3,4],escapeSweeps:1,note:'Reference Bank finale. Approach unchanged in difficulty; the service corridor is swept after the theft so Vault→Exit is no longer free.'},
 // Chapter 4 — Lab (MEDIUM+). Both escape routes are swept; glass keeps guards visible but unreachable.
 '04-01':{objectiveWait:[1.5,5],patrolWait:3,escapeSweeps:2,note:'Every scripted run was caught; a readable objective window plus slower lab patrols.'},
 '04-02':{escapeSweeps:2,note:'Approach already at Lab level; both escape routes gain a sweep.'},
 '04-03':{objectiveWait:[1.5,5],escapeSweeps:2,note:'Objective window opened; both escape routes swept.'},
 '04-04':{objectiveWait:[1.5,3],patrolWait:3,escapeSweeps:2,note:'Every scripted run was caught; dwell and patrol timing relaxed to Lab level.'},
 '04-05':{patrol:{0:[{x:2.25,y:12.75},{x:5.25,y:12.75}]},escapeSweeps:2,note:'Lab finale: the lane guard caught 22 of 24 approaches. It now patrols straight across the lane mouth with a turn at each wall, so the lane opens once per pass; both escapes are swept.'},
 // Chapter 5 — Casino (MEDIUM-HIGH). Staggered floor patrols create crossing windows between islands; both escapes swept.
 '05-01':{objectiveWait:[3,1.5],patrolWait:0.8,escapeSweeps:2,note:'No scripted clear. Floor guards now keep moving (short stops) so gaps between islands open regularly; the vault guard inspects longer and steps away briefly.'},
 '05-02':{objectiveWait:[1.5,7],patrolWait:0.8,escapeSweeps:2,note:'No scripted clear. Floor guards keep moving and the VIP guard takes a long walk away from the table, giving one clear window per cycle.'},
 '05-03':{patrolWait:0.8,escapeSweeps:1,note:'No scripted clear with two cameras and four guards. Floor guards keep moving; only the secondary escape is swept so the camera pair stays the main pressure.'},
 '05-04':{objectiveWait:[1.5,3],startDelays:[0,3,6,4],escapeSweeps:2,note:'Floor patrols started together and closed every island gap at once; staggering opens timed gaps.'},
 '05-05':{objectiveWait:[1.5,3],patrolWait:4.5,startDelays:[0,3,6,1.95],escapeSweeps:2,note:'Casino finale: staggered floor patrols and longer dwells make the multi-direction floor readable but still the hardest.'},
};
