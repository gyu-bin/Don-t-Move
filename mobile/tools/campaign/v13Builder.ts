/** V13 Phase 1 compiler: ASCII floor plan → topology plan → runtime stage, then authored security. */
import type {StageDefinition,PatrolPoint,PropDef} from '../../src/game/levels/StageDefinition';
import type {V124bPlan,V124bRoom,Point} from './v124bTypes';
import type {V13Mission,V13Stop} from './v13Types';
import {PROP_KIT} from '../../src/game/world/propKit';
import {composeV124bPlan} from './v124bBuilder';
import {straightLegs} from './v125Tuning';

const isFloor=(ch:string|undefined)=>!!ch&&ch!=='#'&&ch!==' ';
/** True when a body of radius r (tiles) centred at x,y touches no drawn wall and no solid structure. */
export function v13Clearance(m:V13Mission){
 const solid=m.structures.map(v13Prop).filter(p=>PROP_KIT[p.kind].blocksMovement).map(p=>{const f=PROP_KIT[p.kind].footprint,w=f.w*p.scale!,h=f.h*p.scale!;return [p.x-w/2,p.y-h,p.x+w/2,p.y];});
 return (x:number,y:number,r:number)=>{
  for(let yy=Math.floor(y-r);yy<=Math.floor(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.floor(x+r);xx++){if(isFloor(m.map[yy]?.[xx]))continue;const dx=Math.max(xx-x,0,x-xx-1),dy=Math.max(yy-y,0,y-yy-1);if(Math.max(dx,dy)<r)return false;}
  // Square inflation, like the navigation grid: a corner counts as blocked.
  return !solid.some(([x0,y0,x1,y1])=>Math.max(x0-x,0,x-x1,y0-y,y-y1)<r);
 };
}
export function v13Rooms(m:V13Mission):V124bRoom[]{
 const box=new Map<string,{x0:number;y0:number;x1:number;y1:number}>();
 m.map.forEach((row,y)=>[...row].forEach((ch,x)=>{
  if(!isFloor(ch))return;if(!m.zones[ch])throw Error(`${m.id}: map letter '${ch}' at ${x},${y} has no zone`);
  const b=box.get(ch);if(!b)box.set(ch,{x0:x,y0:y,x1:x,y1:y});else{b.x0=Math.min(b.x0,x);b.y0=Math.min(b.y0,y);b.x1=Math.max(b.x1,x);b.y1=Math.max(b.y1,y);}
 }));
 for(const ch of Object.keys(m.zones))if(!box.has(ch))throw Error(`${m.id}: zone '${ch}' is not drawn`);
 const rooms:V124bRoom[]=[...box].map(([ch,b])=>({...m.zones[ch],x:b.x0,y:b.y0,w:b.x1-b.x0+1,h:b.y1-b.y0+1}));
 // Route node: the authored hub, else the point nearest the zone centre with a full tile of clearance from walls and structures.
 const clear=v13Clearance(m);
 for(const r of rooms){
  if(r.hub){if(!clear(r.hub.x,r.hub.y,.55))throw Error(`${m.id}: hub of ${r.id} is blocked`);continue;}
  const cx=r.x+r.w/2,cy=r.y+r.h/2;let best:Point|undefined,score=Infinity;
  for(let y=r.y+.5;y<r.y+r.h;y+=.5)for(let x=r.x+.5;x<r.x+r.w;x+=.5){const d=Math.hypot(x-cx,y-cy);if(d<score&&clear(x,y,1)){best={x,y};score=d;}}
  if(!best)throw Error(`${m.id}: zone ${r.id} has no clear route node`);
  if(score>1e-6)r.hub=best;
 }
 // A zone is one rectangle: no other zone's floor may sit inside it.
 m.map.forEach((row,y)=>[...row].forEach((ch,x)=>{
  if(!isFloor(ch))return;const inside=rooms.filter(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
  if(inside.length!==1||inside[0].id!==m.zones[ch].id)throw Error(`${m.id}: cell ${x},${y} ('${ch}') lies in ${inside.map(r=>r.id).join('+')||'no zone'}`);
 }));
 return rooms;
}
function islands(m:V13Mission,rooms:V124bRoom[]){
 const out:{x:number;y:number;w:number;h:number}[]=[];
 m.map.forEach((row,y)=>{let run:{x:number;y:number;w:number;h:number}|null=null;
  for(let x=0;x<=row.length;x++){const wall=row[x]==='#'&&rooms.some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
   if(wall){if(run)run.w++;else{run={x,y,w:1,h:1};out.push(run);}}else run=null;}});
 return out;
}
export function v13Prop(s:V13Mission['structures'][number]):PropDef{
 const spec=PROP_KIT[s.kind],solid=spec.footprint.w>0&&spec.footprint.h>0;
 return {kind:s.kind,...(s.asset?{visualAssetId:s.asset}:{}),x:s.x,y:solid?+(s.y+spec.footprint.h*s.scale/2).toFixed(3):s.y,scale:s.scale,...(solid?{collisionScale:s.scale}:{}),...(s.flip?{flip:true}:{})};
}
/** Authors give doorway/bend points only; elbows are inserted so every chain leg is axis-aligned and a door is crossed square-on. */
function orthogonal(m:V13Mission,rooms:V124bRoom[],e:V13Mission['edges'][number]){
 const clear=v13Clearance(m);
 const centre=(id:string)=>{const r=rooms.find(r=>r.id===id);if(!r)throw Error(`${m.id}: edge names unknown zone ${id}`);return r.hub??{x:r.x+r.w/2,y:r.y+r.h/2};};
 const door=e.door,same=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-6;
 const mid=[...(e.via??[])];if(door&&!mid.some(q=>same(q,door.at)))mid.push(door.at);
 const pts=[centre(e.from),...mid,centre(e.to)],via:Point[]=[];
 for(let i=1;i<pts.length;i++){
  const a=pts[i-1],b=pts[i];
  if(a.x!==b.x&&a.y!==b.y){
   const viaDoor=door&&same(b,door.at)?'in':door&&same(a,door.at)?'out':null,vertical=door?.orientation==='horizontal';
   const h={x:b.x,y:a.y},v={x:a.x,y:b.y};
   via.push(viaDoor==='in'?(vertical?h:v):viaDoor==='out'?(vertical?v:h):clear(h.x,h.y,.55)||!clear(v.x,v.y,.55)?h:v);
  }
  if(i<pts.length-1)via.push(b);
 }
 return {...e,via};
}
const ENGINE_ROLE={lobby:'room',crossing:'corridor',restricted:'room',objective:'objective',escape:'exit'} as const;
export function v13Plan(m:V13Mission):V124bPlan{
 const rooms=v13Rooms(m),id=(ch:string)=>ch;void id;
 const zoneOf=(q:Point)=>rooms.find(r=>q.x>=r.x&&q.x<r.x+r.w&&q.y>=r.y&&q.y<r.y+r.h)?.id;
 const entryRoom=zoneOf(m.entry),objectiveRoom=zoneOf(m.objective),exitRoom=zoneOf(m.exit);
 if(!entryRoom||!objectiveRoom||!exitRoom)throw Error(`${m.id}: entry/objective/exit must stand inside a zone`);
 const objective=m.guards.filter(g=>g.role==='objective');
 if(objective.length!==1||m.guards.at(-1)!.role!=='objective')throw Error(`${m.id}: exactly one objective guard, authored last`);
 for(const g of m.guards)for(const s of g.stops)if(!zoneOf(s))throw Error(`${m.id}: guard stop ${s.x},${s.y} is outside the building`);
 return {id:m.id,title:m.title,family:m.family,visualRevision:'v12-4c',drawnFloor:true,guardCount:m.guards.length,rooms,edges:m.edges.map(e=>orthogonal(m,rooms,e)),entryRoom,objectiveRoom,exitRoom,
  entry:m.entry,objective:m.objective,exit:m.exit,entryEdge:m.entryEdge,exitEdge:m.exitEdge,
  approach:m.approach,risk:m.risk,quickEscape:m.quickEscape,alternateEscape:m.alternateEscape,
  structures:m.structures.map(v13Prop),islands:islands(m,rooms),
  patrols:m.guards.map(g=>({room:g.role==='objective'?objectiveRoom:g.zone,points:g.stops.map(s=>({x:s.x,y:s.y})),role:ENGINE_ROLE[g.role]})),
  objectiveStops:objective[0].stops.map(s=>({x:s.x,y:s.y})),
  cameras:m.cameras.map(c=>({room:c.zone,at:c.at,facing:c.facing})),
  ...(m.objectiveScale?{objectiveScale:m.objectiveScale}:{}),...(m.objectiveAsset?{objectiveVisualAssetId:m.objectiveAsset}:{}),...(m.secureDoorStyle?{secureDoorStyle:m.secureDoorStyle}:{}),...(m.highSecurity===undefined?{}:{highSecurity:m.highSecurity})};
}
const facing=(s:V13Stop)=>Math.atan2(s.look.y-s.y,s.look.x-s.x);
/** Guards are authored last: every stop has a stated subject, legs are straight and body-clear. */
function authorSecurity(def:StageDefinition,m:V13Mission){
 m.guards.forEach((g,i)=>{
  const guard=def.guards[i],route=def.patrolRoutes.find(r=>r.id===guard.routeId)!,stops=g.stops;
  const point=(q:Point,stop?:V13Stop,heading?:number):PatrolPoint=>({x:q.x,y:q.y,waitDuration:stop?stop.wait??1.5:0,lookDirection:stop?facing(stop):heading!,turnDuration:.4});
  const out:PatrolPoint[]=[point(stops[0],stops[0])];
  const walk=(from:Point,to:V13Stop,arrive:boolean)=>{
   const legs=straightLegs(def,from,to);let prev=from;
   legs.forEach((q,k)=>{const last=k===legs.length-1;if(!last||arrive)out.push(last?point(to,to):point(q,undefined,Math.atan2(q.y-prev.y,q.x-prev.x)));prev=q;});
  };
  // Every patrol is stored as a closed circuit of straight, clear legs. A there-and-back patrol lists its way
  // back through the same stops, so the guard walks it exactly as a ping-pong while each stored leg,
  // including the one that closes the circuit, is a real walkable segment.
  const circuit=g.loop?stops:[...stops,...stops.slice(1,-1).reverse()];
  for(let k=1;k<circuit.length;k++)walk(circuit[k-1],circuit[k],true);
  walk(circuit.at(-1)!,circuit[0],false);
  route.mode='loop';route.points=out;
  Object.assign(guard,{x:stops[0].x,y:stops[0].y,facing:facing(stops[0]),initialFacing:facing(stops[0]),startDelay:g.startDelay??0,
   theftPosts:stops.slice(0,2).map(s=>({x:s.x,y:s.y})),theftSearchSectors:[{id:guard.theftSearchSectors?.[0]?.id??`${guard.id}: patrol`,anchors:stops.map(s=>({x:s.x,y:s.y}))}]});
 });
}
export function composeV13(m:V13Mission,source:StageDefinition[]):StageDefinition{
 const old=source.find(s=>s.id===m.id);if(!old)throw Error(`Missing source ${m.id}`);
 // Guard and CCTV archetypes (perception, pace, detection constants) come from the chapter's approved source data.
 const chapterCamera=source.flatMap(s=>s.chapter===old.chapter?s.cameras??[]:[])[0];
 if(m.cameras.length&&!chapterCamera)throw Error(`${m.id}: chapter has no approved CCTV archetype`);
 const patched=source.map(s=>s.id!==m.id?s:{...s,guards:m.guards.map((_,i)=>s.guards[Math.min(i,s.guards.length-1)]),cameras:m.cameras.map(()=>chapterCamera)});
 const def=composeV124bPlan(v13Plan(m),patched);
 const rows=Math.max(def.layout.length,m.map.length);
 for(let y=0;y<rows;y++)for(let x=0;x<Math.max(def.layout[y]?.length??0,m.map[y]?.length??0);x++)
  if((def.layout[y]?.[x]==='.')!==isFloor(m.map[y]?.[x]))throw Error(`${m.id}: compiled floor differs from the drawn plan at ${x},${y} (an edge corridor cut through a wall, or a zone box covers undrawn floor)`);
 authorSecurity(def,m);
 def.testPurpose='V13 Phase 1 architecture rebuild';
 def.structurePlan=`V13 ${m.family} | ${m.topology} | ${def.topologyPlan!.rooms.map(r=>r.name).join(' → ')}`;
 return def;
}
/** Authoring view that works before the plan composes: drawn walls, structures, zone centres (+) and chain points (x). */
export function v13Draft(m:V13Mission):StageDefinition{
 const plan=v13Plan(m);
 return {id:m.id,chapter:Number(m.id.slice(0,2)),title:m.title,layout:m.map.map(r=>[...r].map(ch=>isFloor(ch)?'.':ch).join('')),props:plan.structures!,guards:[],patrolRoutes:[],lights:[],
  playerSpawn:{...m.entry,facing:0},objective:{kind:'diamond',...m.objective},exitPosition:m.exit,exit:{x:m.exit.x-.6,y:m.exit.y-.6,w:1.2,h:1.2},topologyPlan:plan} as unknown as StageDefinition;
}
