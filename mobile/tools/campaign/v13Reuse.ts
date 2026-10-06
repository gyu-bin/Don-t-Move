/**
 * V13 Phase 4 — helpers for the chapters that have no floor plans of their own yet (Chapter 6–9).
 * A proven plan is mirrored left-to-right, re-furnished piece by piece inside the same footprints, and given
 * the extra guards and cameras its chapter calls for. Extra security is placed by rule, never at random:
 * guards go to route rooms nobody watches (escape legs first) and walk them end to end; cameras go on the
 * north wall of unwatched route rooms where they see the most floor with nothing in front of them.
 */
import type {V13Mission,V13Structure,V13Guard,V13Camera} from './v13Types';
import {v13Draft} from './v13Builder';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {PROP_KIT} from '../../src/game/world/propKit';

const SIDE={left:'right',right:'left',top:'top',bottom:'bottom'} as const;
export function mirrorX(base:V13Mission):V13Mission{
 const W=base.map[0].length,mx=<T extends {x:number;y:number}>(p:T):T=>({...p,x:+(W-p.x).toFixed(3)});
 return {...base,map:base.map.map(r=>[...r].reverse().join('')),
  zones:Object.fromEntries(Object.entries(base.zones).map(([k,z])=>[k,{...z,...(z.hub?{hub:mx(z.hub)}:{})}])),
  entry:mx(base.entry),objective:mx(base.objective),exit:mx(base.exit),entryEdge:SIDE[base.entryEdge],exitEdge:SIDE[base.exitEdge],
  placement:base.placement.map(p=>p.replace(/left|right/g,s=>s==='left'?'right':'left')) as V13Mission['placement'],
  edges:base.edges.map(e=>({...e,...(e.via?{via:e.via.map(mx)}:{}),...(e.door?{door:{...e.door,at:mx(e.door.at)}}:{})})),
  structures:base.structures.map(mx),guards:base.guards.map(g=>({...g,stops:g.stops.map(s=>({...mx(s),look:mx(s.look)}))})),
  cameras:base.cameras.map(c=>({...c,at:mx(c.at),facing:+(Math.PI-c.facing).toFixed(4)}))};
}
export type Refit=(s:V13Structure)=>V13Structure[];
/** New identity, furniture and doors on an existing plan. Cover lists keep only the names that survive. */
export function refit(base:V13Mission,id:string,title:string,family:string,swap:Refit,doors:{normal:string;secure:string}):V13Mission{
 // A piece that became opaque is cover, whatever its predecessor was.
 const objectiveZone=Object.values(base.zones).find(z=>z.role==='objective')!.id,structures=base.structures.flatMap(swap).map(s=>PROP_KIT[s.kind].blocksVision&&s.roles.every(r=>r==='decor')?{...s,roles:['losBreak','decor'] as V13Structure['roles']}:s);
 const names=new Set([...structures.map(s=>s.name),...base.walls.map(w=>w.name)]),lane=(l:string[])=>{const kept=l.filter(n=>names.has(n));return kept.length?kept:[base.walls[0]?.name??structures[0].name];};
 return {...base,id,title,family,structures,cover:{safe:lane(base.cover.safe),risk:lane(base.cover.risk),escape:lane(base.cover.escape)},
  edges:base.edges.map(e=>e.door?{...e,door:{...e.door,style:(e.role==='approach'&&(e.to===objectiveZone||e.from===objectiveZone)&&!e.door.lockdown?doors.secure:doors.normal) as never}}:e),
  objectiveAsset:'museum_diamond_case',objectiveScale:1.15,secureDoorStyle:doors.secure as never,highSecurity:undefined};
}
/** Brings the mission up to the given number of guards and cameras (see the file comment for the rule). */
export function secure(m:V13Mission,guards:number,cameras:number):V13Mission{
 const stage=compileStage(v13Draft(m)),zoneAt=(x:number,y:number)=>m.zones[m.map[Math.floor(y)]?.[Math.floor(x)]]?.id;
 const box=(id:string)=>{const letter=Object.keys(m.zones).find(k=>m.zones[k].id===id)!;let x0=99,x1=-1,y0=99,y1=-1;m.map.forEach((r,y)=>[...r].forEach((ch,x)=>{if(ch===letter){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}));return{x0,x1:x1+1,y0,y1:y1+1};};
 const entryZone=m.approach[0],objectiveZone=m.approach.at(-1)!,far=(x:number,y:number,p:{x:number;y:number},d:number)=>Math.hypot(x-p.x,y-p.y)>=d;
 const watched=()=>new Set([...out.guards.flatMap(g=>g.stops.map(s=>zoneAt(s.x,s.y))),...out.cameras.map(c=>zoneAt(c.at.x,c.at.y))]);
 const order=(lists:string[][])=>{const ids=[...new Set(lists.flat())].filter(z=>z!==entryZone&&z!==objectiveZone),w=watched();return[...ids.filter(z=>!w.has(z)),...ids.filter(z=>w.has(z))];};
 const out:V13Mission={...m,guards:[...m.guards],cameras:[...m.cameras]};
 for(const zone of order([m.risk,m.approach,m.quickEscape,m.alternateEscape])){
  if(out.cameras.length>=cameras)break;if(out.cameras.some(c=>zoneAt(c.at.x,c.at.y)===zone))continue;
  const b=box(zone);let best:{x:number;y:number;score:number}|null=null;
  for(let cy=b.y0;cy<b.y1;cy++)for(let cx=b.x0;cx<b.x1;cx++){
   if(zoneAt(cx,cy)!==zone||m.map[cy-1]?.[cx]!=='#')continue;const x=cx+.5,y=cy+.4;
   // Not on top of a guard post: a camera and a guard on one spot read as one blob and double the same coverage.
   if(out.guards.some(g=>g.stops.some(p=>!far(x,y,p,2.5))))continue;
   if(!far(x,y,m.entry,5)||out.cameras.some(c=>!far(x,y,c.at,6))||!clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,stage.movementBlockers,6))continue;
   if(!clearSegment(x*TILE,y*TILE,x*TILE,(y+4)*TILE,stage.visionBlockers))continue;
   let score=0;for(let a=-.85;a<=.85;a+=.17)for(let r=1;r<=5;r+=.5){const px=x+Math.cos(1.5708+a)*r,py=y+Math.sin(1.5708+a)*r;
    if(zoneAt(px,py)&&clearSegment(px*TILE,py*TILE,px*TILE,py*TILE,stage.movementBlockers,6)&&clearSegment(x*TILE,y*TILE,px*TILE,py*TILE,stage.visionBlockers))score++;}
   if(!best||score>best.score)best={x,y,score};}
  if(best)out.cameras.push({zone,at:{x:best.x,y:best.y},facing:1.5708,watches:`The ${Object.values(m.zones).find(z=>z.id===zone)!.name}, which no patrol covers`} as V13Camera);
 }
 for(const zone of order([m.alternateEscape,m.quickEscape,m.risk,m.approach])){
  if(out.guards.length>=guards)break;if(out.guards.some(g=>g.stops.some(s=>zoneAt(s.x,s.y)===zone)))continue;
  const b=box(zone),points:{x:number;y:number}[]=[];
  for(let y=b.y0+.5;y<b.y1;y+=.5)for(let x=b.x0+.5;x<b.x1;x+=.5)if(zoneAt(x,y)===zone&&far(x,y,m.entry,4)&&far(x,y,m.exit,2.5)&&out.cameras.every(c=>far(x,y,c.at,2.5))&&clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,stage.movementBlockers,.8*TILE))points.push({x,y});
  let pair:[typeof points[number],typeof points[number]]|null=null,span=2.9;
  for(const a of points)for(const c of points){const d=Math.hypot(a.x-c.x,a.y-c.y);if(d>span&&(a.x===c.x||a.y===c.y)&&clearSegment(a.x*TILE,a.y*TILE,c.x*TILE,c.y*TILE,stage.movementBlockers,.45*TILE)){pair=[a,c];span=d;}}
  if(!pair)continue;const[a,c]=pair,name=Object.values(m.zones).find(z=>z.id===zone)!.name;
  const guard:V13Guard={role:'crossing',zone,watches:`The ${name}, end to end`,stops:[{...a,look:{...c},wait:3},{...c,look:{...a},wait:3}]};
  out.guards.splice(out.guards.length-1,0,guard);
 }
 return out;
}
