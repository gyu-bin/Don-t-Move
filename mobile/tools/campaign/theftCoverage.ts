/**
 * Post-theft exit pressure. Applied last in buildMission.
 *
 * Playtest feedback: after the theft every guard toured the same map-wide ring,
 * so the exit was rarely watched (02-10) or never held (03-03). One guard per
 * listed mission now keeps a short circuit around the exit approach instead.
 * Only authored theft search circuits change: patrols, vision, counts, layout
 * and objective timing are untouched, and no target uses player data.
 */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,findPath,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';

type Point={x:number;y:number};
/** Other guards' theft stops inside this radius of the exit are removed once a hold guard is assigned. */
const EXIT_CLEAR_TILES=7;
const EXIT_HOLD:Record<string,{guard:string;circuit:Point[]}>={
 // Private Escape guard stays on the south-west exit gallery and its north door.
 '02-10':{guard:'02-10-g5',circuit:[{x:6.25,y:28.25},{x:2.6,y:28.6},{x:6,y:25.6},{x:5.25,y:19.25}]},
 // East Audit guard confirms the empty safe, then holds the exit room below it.
 // The auto plan kept this guard inside the small exit room the whole time;
 // walking back to the command junction leaves a real window.
 '03-08':{guard:'03-08-g4',circuit:[{x:23.25,y:13.5},{x:31.75,y:15.75},{x:34.75,y:22.25}]},
 '03-03':{guard:'03-03-g3',circuit:[{x:27,y:14.5},{x:27,y:20.4},{x:24,y:22},{x:27,y:24.5},{x:29.6,y:24.3}]},
};

/** Maps measured (tools/campaign/exitPressure.ts) with the exit unwatched for 35s or more after a theft. */
const AUTO_EXIT_HOLD=new Set(['02-03','02-04','02-05','02-06','02-07','02-08','02-09','03-02','03-04','03-05','03-06','03-07','03-09','03-10']);

/** Exit approach from the authored escape route plus two flanking stands near the exit. */
function autoPlan(def:StageDefinition):{guard:string;circuit:Point[]}{
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 const exit={x:def.exit!.x+def.exit!.w/2,y:def.exit!.y+def.exit!.h/2};
 const reach=(from:Point,to:Point)=>{const path=findPath(nav,from.x*TILE,from.y*TILE,to.x*TILE,to.y*TILE);
  if(path.length<2||Math.hypot(path.at(-2)!-to.x*TILE,path.at(-1)!-to.y*TILE)>.1)return Infinity;
  let d=0;for(let i=2;i<path.length;i+=2)d+=Math.hypot(path[i]-path[i-2],path[i+1]-path[i-1]);return d/TILE;};
 // The assigned exit guard if one exists; otherwise the non-objective guard with the shortest walk to the exit.
 const candidates=def.guards.filter(g=>g.theftRole==='exit');
 const pool=candidates.length?candidates:def.guards.filter(g=>g.theftRole!=='objective'&&g.role!=='objective');
 const guard=[...(pool.length?pool:def.guards)].sort((a,b)=>reach(a,exit)-reach(b,exit)||a.id.localeCompare(b.id))[0];
 // Walkable stands 2-4.5 tiles from the exit, reachable from it without leaving its room (short path).
 const stands:Point[]=[];
 for(let i=0;i<nav.walkable.length;i++){
  if(!nav.walkable[i])continue;
  const p={x:(i%nav.cols+.5)*nav.cell/TILE,y:(Math.floor(i/nav.cols)+.5)*nav.cell/TILE},d=Math.hypot(p.x-exit.x,p.y-exit.y);
  if(d<2||d>4.5)continue;
  const walk=reach(exit,p);if(walk>d*1.6)continue;
  stands.push(p);
 }
 if(stands.length<2)throw Error(`${def.id}: no exit stands for theft coverage`);
 const angle=(p:Point)=>Math.atan2(p.y-exit.y,p.x-exit.x);
 // Two stands with the widest angular separation, deterministic tie-break by coordinates.
 let best:[Point,Point]=[stands[0],stands[1]],spread=-1;
 for(const a of stands)for(const b of stands){
  const s=Math.abs(Math.atan2(Math.sin(angle(a)-angle(b)),Math.cos(angle(a)-angle(b))));
  if(s>spread+1e-6){spread=s;best=[a,b];}
 }
 const far=(p:Point)=>Math.hypot(p.x-exit.x,p.y-exit.y);
 // The guard also walks back up the escape route, which opens a window at the exit itself.
 const route=def.escapeRoutes![0].points,approach=route.filter(p=>far(p)>5&&far(p)<11).at(-1)??route.filter(p=>far(p)>=11&&far(p)<18).at(-1);
 const circuit=[...(approach&&reach(guard,approach)<Infinity?[{x:approach.x,y:approach.y}]:[]),best[0],best[1]].map(p=>({x:+p.x.toFixed(2),y:+p.y.toFixed(2)}));
 return {guard:guard.id,circuit};
}

/** Everyone except the exit's owner drops theft stops near the exit, so the escape is never walled by three guards. */
function clearExitForOthers(def:StageDefinition,owner:string){
 const exit={x:def.exit!.x+def.exit!.w/2,y:def.exit!.y+def.exit!.h/2},nearExit=(p:Point)=>Math.hypot(p.x-exit.x,p.y-exit.y)<EXIT_CLEAR_TILES;
 for(const other of def.guards){
  if(other.id===owner)continue;
  const sectors=(other.theftSearchSectors??[]).map(sec=>({...sec,anchors:sec.anchors.filter(a=>!nearExit(a))})).filter(sec=>sec.anchors.length);
  if(sectors.length)other.theftSearchSectors=sectors;
  const posts=(other.theftPosts??[]).filter(a=>!nearExit(a));
  if(posts.length)other.theftPosts=posts;
 }
}

export function applyTheftCoverage(source:StageDefinition):StageDefinition{
 const plan=EXIT_HOLD[source.id]??(AUTO_EXIT_HOLD.has(source.id)?autoPlan(source):undefined);
 if(!plan){
  // Maps whose authored exit guard already watches the exit: only the crowding rule applies.
  const owner=(source.chapter===2||source.chapter===3)?source.guards.find(g=>g.theftRole==='exit'):undefined;
  if(!owner)return source;
  const def=structuredClone(source);clearExitForOthers(def,owner.id);return def;
 }
 const def=structuredClone(source),guard=def.guards.find(g=>g.id===plan.guard);
 if(!guard)throw Error(`${def.id}: theft coverage guard missing ${plan.guard}`);
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 for(const p of plan.circuit){
  const path=findPath(nav,guard.x*TILE,guard.y*TILE,p.x*TILE,p.y*TILE);
  // Same rule the campaign QA applies to every search anchor: the guard body fits there and the path ends exactly on it.
  if(path.length<2||Math.hypot(path.at(-2)!-p.x*TILE,path.at(-1)!-p.y*TILE)>.1||!clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,stage.movementBlockers,BODY.guardRadius))throw Error(`${def.id}: exit-hold anchor blocked ${p.x},${p.y}`);
 }
 guard.theftPosts=plan.circuit.slice(0,2).map(p=>({...p}));
 guard.theftSearchSectors=[{id:`${guard.id}: exit approach hold`,anchors:plan.circuit.map(p=>({...p}))}];
 clearExitForOthers(def,guard.id);
 return def;
}
