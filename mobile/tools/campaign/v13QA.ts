/**
 * V13 Phase 1 per-mission QA: geometry checks that back the Simulator review, never replace it.
 * Fake gaps, empty space, player-only traversal, entry/objective/exit placement, structure roles.
 */
import fs from 'node:fs';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment,buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {PROP_KIT} from '../../src/game/world/propKit';
import {auditV124bTopology,measureV124bRoutePressure,pathLength} from './v124bTopologyQA';
import {composeV13} from './v13Builder';
import type {V13Mission} from './v13Types';
import {heistMatrix} from './v12Phase5Bot';

const STEP=.125;
type Cell={x:number;y:number};
function grid(def:StageDefinition){
 const stage=compileStage(def),cols=Math.max(...def.layout.map(r=>r.length)),rows=def.layout.length,nx=Math.round(cols/STEP),ny=Math.round(rows/STEP);
 const at=(i:number,j:number):Cell=>({x:(i+.5)*STEP,y:(j+.5)*STEP});
 const free=(q:Cell,r:number)=>def.layout[Math.floor(q.y)]?.[Math.floor(q.x)]==='.'&&clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,r);
 const flood=(r:number)=>{
  const ok=new Uint8Array(nx*ny),seen=new Uint8Array(nx*ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)if(free(at(i,j),r))ok[j*nx+i]=1;
  const s=def.playerSpawn,start=Math.floor(s.y/STEP)*nx+Math.floor(s.x/STEP),queue=[start];seen[start]=1;
  while(queue.length){const k=queue.pop()!,i=k%nx,j=(k-i)/nx;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=nx||b>=ny)continue;const n=b*nx+a;if(ok[n]&&!seen[n]){seen[n]=1;queue.push(n);}}}
  return seen;
 };
 return {stage,nx,ny,at,free,flood};
}
function components(mask:Uint8Array,nx:number,ny:number){
 const seen=new Uint8Array(mask.length),out:{cells:number;x0:number;y0:number;x1:number;y1:number}[]=[];
 for(let k=0;k<mask.length;k++){if(!mask[k]||seen[k])continue;const c={cells:0,x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity},queue=[k];seen[k]=1;
  while(queue.length){const q=queue.pop()!,i=q%nx,j=(q-i)/nx;c.cells++;c.x0=Math.min(c.x0,i);c.x1=Math.max(c.x1,i);c.y0=Math.min(c.y0,j);c.y1=Math.max(c.y1,j);
   for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=nx||b>=ny)continue;const n=b*nx+a;if(mask[n]&&!seen[n]){seen[n]=1;queue.push(n);}}}
  out.push(c);}
 return out;
}
/** Floor the thief's body can never overlap although it is drawn open, and places reachable only through a sub-tile squeeze. */
export function fakeGaps(def:StageDefinition){
 const g=grid(def),{nx,ny}=g,body=BODY.playerRadius,reach=g.flood(body+1),wide=new Uint8Array(nx*ny);
 // "Wide" is what the game's own half-tile navigation grid reaches with a full-tile body: lanes it cannot thread are squeezes.
 const nav=buildNavigation(g.stage,TILE/2) as unknown as {cols:number;cell:number;walkable:ArrayLike<number|boolean>;components:ArrayLike<number>};
 let home=-1,bestD=Infinity;for(let i=0;i<nav.walkable.length;i++){if(!nav.walkable[i])continue;const x=(i%nav.cols)*nav.cell/TILE,y=Math.floor(i/nav.cols)*nav.cell/TILE,d=Math.hypot(x-def.playerSpawn.x,y-def.playerSpawn.y);if(d<bestD){bestD=d;home=i;}}
 for(let i=0;i<nav.walkable.length;i++){if(!nav.walkable[i]||nav.components[i]!==nav.components[home])continue;const a=Math.round((i%nav.cols)*nav.cell/TILE/STEP),b=Math.round(Math.floor(i/nav.cols)*nav.cell/TILE/STEP);if(a>=0&&b>=0&&a<nx&&b<ny)wide[b*nx+a]=1;}
 const near=(mask:Uint8Array,i:number,j:number,r:number)=>{const n=Math.ceil(r/STEP);for(let dj=-n;dj<=n;dj++)for(let di=-n;di<=n;di++){const a=i+di,b=j+dj;if(a<0||b<0||a>=nx||b>=ny)continue;if(mask[b*nx+a]&&Math.hypot(di,dj)*STEP<=r)return true;}return false;};
 const dead=new Uint8Array(nx*ny),squeeze=new Uint8Array(nx*ny);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const q=g.at(i,j);
  if(g.free(q,0)&&!near(reach,i,j,(body+1)/TILE+STEP))dead[j*nx+i]=1;
  if(reach[j*nx+i]&&!near(wide,i,j,.8))squeeze[j*nx+i]=1;
 }
 const describe=(c:{cells:number;x0:number;y0:number;x1:number;y1:number})=>({area:+(c.cells*STEP*STEP).toFixed(2),x:+((c.x0+c.x1+1)/2*STEP).toFixed(2),y:+((c.y0+c.y1+1)/2*STEP).toFixed(2),w:+((c.x1-c.x0+1)*STEP).toFixed(2),h:+((c.y1-c.y0+1)*STEP).toFixed(2)});
 return {
  // A sealed pocket at least a third of a tile across reads as floor the player should be able to step on.
  sealed:components(dead,nx,ny).map(describe).filter(c=>Math.min(c.w,c.h)>=.375&&c.area>=.2),
  squeezes:components(squeeze,nx,ny).map(describe).filter(c=>Math.min(c.w,c.h)>=.5&&c.area>=.75),
 };
}
/** Largest open disc on the floor: the measure of an empty plaza. */
export function emptiness(def:StageDefinition){
 const g=grid(def),{nx,ny}=g;let worst={x:0,y:0,clearance:0},open=0,floor=0;
 for(let j=0;j<ny;j+=2)for(let i=0;i<nx;i+=2){
  const q=g.at(i,j);if(!g.free(q,0))continue;floor++;
  let lo=0,hi=8;for(let n=0;n<7;n++){const mid=(lo+hi)/2;if(g.free(q,mid*TILE)&&walled(def,q,mid))lo=mid;else hi=mid;}
  if(lo>2.5)open++;if(lo>worst.clearance)worst={x:+q.x.toFixed(2),y:+q.y.toFixed(2),clearance:+lo.toFixed(2)};
 }
 return {worst,openShare:+(open/Math.max(1,floor)).toFixed(3)};
}
function walled(def:StageDefinition,q:Cell,r:number){
 for(let y=Math.floor(q.y-r);y<=Math.floor(q.y+r);y++)for(let x=Math.floor(q.x-r);x<=Math.floor(q.x+r);x++){if(def.layout[y]?.[x]==='.')continue;if(Math.hypot(Math.max(x-q.x,0,q.x-x-1),Math.max(y-q.y,0,q.y-y-1))<r)return false;}
 return true;
}
const third=(v:number,size:number,names:[string,string,string])=>names[Math.min(2,Math.floor(v/size*3))];
export function placement(def:StageDefinition,q:{x:number;y:number}){
 const cols=Math.max(...def.layout.map(r=>r.length)),rows=def.layout.length,v=third(q.y,rows,['top','centre','bottom']),h=third(q.x,cols,['left','centre','right']);
 return v==='centre'&&h==='centre'?'centre':v==='centre'?`${h}-centre`:`${v}-${h}`;
}
export async function v13Report(m:V13Mission,source:StageDefinition[]=raw as StageDefinition[]){
 const def=composeV13(m,source),audit=auditV124bTopology(def),gaps=fakeGaps(def),empty=emptiness(def);
 const bare={...def,guards:[],patrolRoutes:[],cameras:[]} as StageDefinition;
 const traversal=[await measureV124bRoutePressure(bare,0),await measureV124bRoutePressure(bare,1)].map(r=>r.outcome);
 const solid=m.structures.filter(s=>PROP_KIT[s.kind].blocksMovement),unexplained=solid.filter(s=>!s.roles.length).map(s=>s.name);
 const covered=new Set([...m.cover.safe,...m.cover.risk,...m.cover.escape]),unknown=[...covered].filter(n=>![...m.structures,...m.walls].some(s=>s.name===n));
 const floor=def.layout.join('').split('.').length-1,footprint=solid.reduce((sum,s)=>sum+PROP_KIT[s.kind].footprint.w*PROP_KIT[s.kind].footprint.h*s.scale*s.scale,0);
 return {id:m.id,title:m.title,topology:m.topology,size:`${def.layout[0].length}x${def.layout.length}`,floorTiles:floor,structureShare:+(footprint/floor).toFixed(3),
  placement:{entry:placement(def,def.playerSpawn),objective:placement(def,def.objective!),exit:placement(def,def.exitPosition!),expected:m.placement},
  topologyErrors:audit.errors,approachZones:audit.approachZones,escapeZones:audit.escapeZones,
  lengths:{safe:+pathLength(def.testRoutes![0].points).toFixed(1),risk:+pathLength(def.testRoutes![1].points).toFixed(1),quick:+audit.quickEscapeLength.toFixed(1),alternate:+audit.alternateEscapeLength.toFixed(1),entryExit:+audit.entryExitDistance.toFixed(1)},
  fakeGaps:gaps,emptiness:empty,playerOnlyTraversal:{safeThenQuick:traversal[0],riskThenQuick:traversal[1]},
  scripted:(h=>({clears:`${h.clears}/${h.runs}`,safe:h.safeClears,risk:h.riskClears,caughtBefore:h.caughtBeforePickup,caughtAfter:h.caughtAfterPickup,timeouts:h.timeouts,lockdownRuns:h.lockdownRuns,caughtBy:h.caughtBy,meanClearTime:h.meanClearTime}))(heistMatrix(def)),
  guards:m.guards.map(g=>`${g.role}@${g.zone}`),cameras:m.cameras.length,structures:solid.length,unexplainedStructures:unexplained,unknownCoverNames:unknown};
}
if(process.argv[1]?.endsWith('v13QA.ts')){
 (async()=>{
  const {V13_MISSIONS}=await import('./v13Build');const ids=process.argv.slice(2),out=[];
  for(const m of V13_MISSIONS.filter(m=>!ids.length||ids.includes(m.id))){const r=await v13Report(m);out.push(r);console.log(JSON.stringify(r));}
  if(!ids.length){fs.mkdirSync('Reports/V13Phase1',{recursive:true});fs.writeFileSync('Reports/V13Phase1/mission-qa.json',JSON.stringify(out,null,2));}
 })();
}
