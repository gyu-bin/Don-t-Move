/**
 * Roaming guard pass for wide, thinly guarded maps. Applied in buildMission before theft coverage.
 *
 * Playtest feedback: wide maps were too easy because guards were spread thin and
 * large areas were never looked at. Each listed mission gains one roaming guard
 * that walks back and forth through the least-watched part of the map.
 *
 * The route is derived from the map: existing patrols are simulated, the floor
 * that is almost never inside a vision cone is found, and the new guard's
 * ping-pong route links the two far ends of that floor along a navigable path
 * whose legs are all straight and clear. The route stays away from the player
 * spawn and the objective, so the opening and the objective guard's job are unchanged.
 */
import type {StageDefinition,PatrolPoint} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,findPath,clearSegment,nodeX,nodeY} from '../../src/game/world/navigation';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {pointVisible} from '../../src/game/guards/guardVision';
import {BODY} from '../../src/game/guards/guardTuning';

type Point={x:number;y:number};
export const ROAMING_GUARD_MISSIONS=new Set(['02-02','02-03','02-04','02-06','02-07','02-10']);
const SIM_SECONDS=90,DEAD_SHARE=0.02,SPAWN_KEEP_OUT=9,EXIT_KEEP_OUT=9,OBJECTIVE_KEEP_OUT=4,LEG_MARGIN=8;

/** Seconds each walkable node spends inside any guard cone during a hidden-thief patrol simulation. */
export function patrolCoverage(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 const seen=new Float32Array(nav.walkable.length),hidden={x:-9999,y:-9999,gait:0};
 // Sample every 6th frame: vision changes slowly relative to 0.1s.
 for(let f=0;f<SIM_SECONDS*60;f++){
  stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);
  if(f%6)continue;
  for(let i=0;i<nav.walkable.length;i++)if(nav.walkable[i]&&s.guards.some(g=>pointVisible(g,nodeX(nav,i),nodeY(nav,i),stage.visionBlockers)))seen[i]+=0.1;
 }
 const walkable=nav.walkable.reduce((n,w)=>n+(w?1:0),0);
 let dead=0;for(let i=0;i<seen.length;i++)if(nav.walkable[i]&&seen[i]<SIM_SECONDS*DEAD_SHARE)dead++;
 return {stage,nav,seen,deadShare:dead/walkable};
}

export function applyRoamingGuard(source:StageDefinition):StageDefinition{
 if(!ROAMING_GUARD_MISSIONS.has(source.id))return source;
 const def=structuredClone(source),{stage,nav,seen}=patrolCoverage(def);
 const tile=(i:number):Point=>({x:nodeX(nav,i)/TILE,y:nodeY(nav,i)/TILE});
 const spawn=def.playerSpawn,goal=def.objective!;
 const exit={x:def.exit!.x+def.exit!.w/2,y:def.exit!.y+def.exit!.h/2};
 const plan=(spawnKeep:number,exitKeep:number)=>{
  // Not on the exit either: the exit has its own hold guard and a second body there walls off the escape.
  const allowed=(p:Point)=>Math.hypot(p.x-exit.x,p.y-exit.y)>=exitKeep&&Math.hypot(p.x-spawn.x,p.y-spawn.y)>=spawnKeep&&Math.hypot(p.x-goal.x,p.y-goal.y)>=OBJECTIVE_KEEP_OUT&&
   (def.safeZones??[]).every(z=>Math.hypot(p.x-z.x,p.y-z.y)>=spawnKeep-2)&&
   clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,stage.movementBlockers,BODY.guardRadius+LEG_MARGIN);
  // Least-watched floor: never-seen nodes, widened to the least-seen quarter when patrols already sweep most of the map.
  const eligible:number[]=[];
  for(let i=0;i<nav.walkable.length;i++)if(nav.walkable[i]&&allowed(tile(i)))eligible.push(i);
  if(eligible.length<8)return {best:-1,route:[] as number[]};
  const cutoff=Math.max(SIM_SECONDS*DEAD_SHARE,[...eligible].map(i=>seen[i]).sort((a,b)=>a-b)[Math.floor(eligible.length/4)]);
  const dead=eligible.filter(i=>seen[i]<=cutoff);
  const pathLength=(a:number,b:number)=>{const p=findPath(nav,nodeX(nav,a),nodeY(nav,a),nodeX(nav,b),nodeY(nav,b));
   if(p.length<4)return {length:Infinity,path:p};let d=0;for(let i=2;i<p.length;i+=2)d+=Math.hypot(p[i]-p[i-2],p[i+1]-p[i-1]);return {length:d/TILE,path:p};};
  // One end: the unwatched node deepest inside unwatched floor (most unwatched neighbours within 4 tiles).
  const density=(i:number)=>{const a=tile(i);let n=0;for(const j of dead){const b=tile(j);if(Math.hypot(a.x-b.x,a.y-b.y)<4)n++;}return n;};
  const starts=[...dead].sort((a,b)=>density(b)-density(a)||a-b);
  // Other end: the unwatched node with the longest walk from it, capped so the loop returns in reasonable time.
  // The densest start is preferred; later ones are tried only when keep-outs leave it no usable route.
  let best=-1,route:number[]=[];
  for(const start of starts.slice(0,16)){
   let local=-1,localRoute:number[]=[];
   for(const j of dead){
    const {length,path}=pathLength(start,j);
    if(length===Infinity||length>26)continue;
    let clear=true;for(let k=0;k<path.length&&clear;k+=2)if(Math.hypot(path[k]/TILE-exit.x,path[k+1]/TILE-exit.y)<exitKeep-2)clear=false;
    if(!clear)continue;
    if(length>local+1e-6){local=length;localRoute=path;}
   }
   if(local>best+1e-6){best=local;route=localRoute;}
   if(best>=12)break;
  }
  return {best,route};
 };
 // Preferred exclusion zones first; compact maps fall back to tighter ones rather than getting no guard.
 let best=-1,route:number[]=[];
 for(const [spawnKeep,exitKeep] of [[SPAWN_KEEP_OUT,EXIT_KEEP_OUT],[7,7],[6,6]]){
  const found=plan(spawnKeep,exitKeep);
  if(found.best>best){best=found.best;route=found.route;}
  if(best>=6)break;
 }
 if(best<6)throw Error(`${def.id}: roaming route too short (${best})`);
 // Shortcut the node path into straight, clear legs.
 const nodes:Point[]=[];for(let i=0;i<route.length;i+=2)nodes.push({x:route[i],y:route[i+1]});
 const legs:Point[]=[nodes[0]];
 for(let i=0;i<nodes.length-1;){
  let j=nodes.length-1;
  while(j>i+1&&!clearSegment(nodes[i].x,nodes[i].y,nodes[j].x,nodes[j].y,stage.movementBlockers,BODY.guardRadius+LEG_MARGIN))j--;
  legs.push(nodes[j]);i=j;
 }
 const points:PatrolPoint[]=legs.map(p=>({x:+(p.x/TILE).toFixed(2),y:+(p.y/TILE).toFixed(2),waitDuration:0.7,turnDuration:1.1}));
 const template=def.guards.find(g=>g.role!=='objective')??def.guards[0];
 const id=`${def.id}-g${def.guards.length+1}`;
 def.patrolRoutes=[...(def.patrolRoutes??[]),{id,mode:'pingpong',points}];
 def.guards.push({
  id,routeId:id,x:points[0].x,y:points[0].y,role:'roaming',theftRole:'roaming',pace:template.pace,
  visionRange:template.visionRange,visionHalfAngle:template.visionHalfAngle,startDelay:2.5,
  facing:Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x),initialFacing:Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x),
  theftPosts:[{x:points[0].x,y:points[0].y},{x:points.at(-1)!.x,y:points.at(-1)!.y}],
  theftSearchSectors:[{id:`${id}: roaming corridor sweep`,anchors:points.map(p=>({x:p.x,y:p.y}))}],
 });
 def.securityZones=[...(def.securityZones??[]),{name:'Roaming Patrol',x:points[0].x,y:points[0].y,radius:4,guardId:id}];
 return def;
}
