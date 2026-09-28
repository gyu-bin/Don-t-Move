import type { PropDef, PropKind, StageDefinition, PatrolPoint } from '../StageDefinition';
import { compileStage, TILE } from '../../world/compileStage';
import { buildNavigation, clearSegment, findPath, nodeX, nodeY } from '../../world/navigation';
import { PROP_KIT } from '../../world/propKit';
import { BODY } from '../../guards/guardTuning';

type Point={x:number;y:number};
const SCALE=0.87;
const THEMATIC:PropKind[][]=[
 ['statue','pillar','displayCase','bench'],['partition','painting','bench'],['counter','partition','displayCase'],
 ['equipment','table','partition'],['table','counter','pillar'],['sofa','table','displayCase'],
 ['crate','shelf'],['counter','partition','equipment'],['equipment','partition','crate'],['pillar','displayCase','equipment'],
];
const scalePoint=<T extends Point>(p:T):T=>({...p,x:p.x*SCALE,y:p.y*SCALE});
function segmentDistance(p:Point,a:Point,b:Point):number{
 const dx=b.x-a.x,dy=b.y-a.y;
 const k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(p.x-a.x-k*dx,p.y-a.y-k*dy);
}

/** Deterministic data authoring, run once at module load, never in the frame loop.
 * Resamples the actual floor plan and re-carves protected approach/patrol corridors.
 * All positions, routes and lights move with the smaller architecture, not just bounds.
 */
export function polishStage(source:StageDefinition):StageDefinition{
 const cols=Math.ceil(source.layout[0].length*SCALE)+1,rows=Math.ceil(source.layout.length*SCALE)+1;
 const s:StageDefinition={...source,
  playerSpawn:scalePoint(source.playerSpawn),objective:scalePoint(source.objective!),
  exit:{...scalePoint(source.exit!),w:source.exit!.w*SCALE,h:source.exit!.h*SCALE},
  guards:source.guards.map(g=>({...scalePoint(g)})),
  patrolRoutes:source.patrolRoutes.map(r=>({...r,points:r.points.map(scalePoint)})),
  testRoutes:source.testRoutes?.map(r=>({...r,points:r.points.map(scalePoint)})),
  escapeRoutes:source.escapeRoutes?.map(r=>({...r,points:r.points.map(scalePoint)})),
  safeZones:source.safeZones?.map(z=>({...scalePoint(z),radius:z.radius*SCALE})),
  carpets:source.carpets?.map(c=>({...scalePoint(c),w:c.w*SCALE,h:c.h*SCALE})),
  lights:source.lights.filter(l=>l.kind!=='cyan'||Math.hypot(l.x-source.objective!.x,l.y-source.objective!.y)>0.1).map(l=>({...scalePoint(l),radius:l.radius*SCALE})),
  props:[],
 };
 const exit={x:s.exit!.x+s.exit!.w/2,y:s.exit!.y+s.exit!.h/2};
 for(const r of s.escapeRoutes??[])r.points[r.points.length-1]=exit;
 const lines:[Point,Point][]=[];
 for(const r of [...s.testRoutes??[],...s.escapeRoutes??[]])for(let i=1;i<r.points.length;i++)lines.push([r.points[i-1],r.points[i]]);
 for(const g of s.guards){
  const r=s.patrolRoutes.find(r=>r.id===g.routeId);if(!r)continue;
  lines.push([g,r.points[0]]);
  for(let i=1;i<r.points.length;i++)lines.push([r.points[i-1],r.points[i]]);
  if(r.mode==='loop')lines.push([r.points[r.points.length-1],r.points[0]]);
 }
 const anchors=[s.playerSpawn,s.objective!,exit,...s.safeZones??[]];
 const floor=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>{
  if(x===0||y===0||x===cols-1||y===rows-1)return false;
  const p={x:x+0.5,y:y+0.5};
  return source.layout[Math.floor(p.y/SCALE)]?.[Math.floor(p.x/SCALE)]==='.' ||
    lines.some(([a,b])=>segmentDistance(p,a,b)<0.85)||anchors.some(a=>Math.hypot(p.x-a.x,p.y-a.y)<1);
 }));
 s.layout=floor.map((row,y)=>row.map((v,x)=>v?'.':[-1,0,1].some(dy=>[-1,0,1].some(dx=>floor[y+dy]?.[x+dx]))?'#':' ').join(''));
 const walls=compileStage(s).movementBlockers;
 const props:PropDef[]=[];
 const palette=THEMATIC[s.number-1];
 const fits=(p:PropDef)=>{
  const spec=PROP_KIT[p.kind],hw=spec.footprint.w/2+0.3,hh=spec.footprint.h;
  // Keep the entire footprint and a body margin inside reachable floor.
  for(const dx of [-hw,0,hw])for(const dy of [-hh-0.3,0.3])
    if(!clearSegment((p.x+dx)*TILE,(p.y+dy)*TILE,(p.x+dx)*TILE,(p.y+dy)*TILE,walls))return false;
  const box=[(p.x-hw)*TILE,(p.y-hh-0.3)*TILE,(p.x+hw)*TILE,(p.y+0.3)*TILE];
  if(lines.some(([a,b])=>!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,box)))return false;
  if(anchors.some(a=>Math.hypot(a.x-p.x,a.y-p.y)<1.15))return false;
  if(props.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1.6))return false;
  return true;
 };
 for(const p of source.props){const next={...scalePoint(p)};if(fits(next))props.push(next);}
 // Sparse rows of functional cover, not decorative walls pasted over paths.
 const target=Math.max(source.props.length+5,Math.floor(floor.flat().filter(Boolean).length/30));
 for(let y=2.5;y<rows-2&&props.length<target;y+=2.5)for(let x=2.5;x<cols-2&&props.length<target;x+=2.5){
  const p={kind:palette[props.length%palette.length],x,y};if(fits(p))props.push(p);
 }
 s.props=props;
 // A non-blocking interaction case with surrounding blocking thematic cover.
 s.props.push({kind:'objectiveCase',x:s.objective!.x,y:s.objective!.y+0.12});
 s.lights.push({x:s.objective!.x,y:s.objective!.y,radius:2.1,kind:'warm',intensity:0.85});

 const compiled=compileStage(s),nav=buildNavigation(compiled,BODY.guardRadius);
 const ox=s.objective!.x*TILE,oy=s.objective!.y*TILE;
 const candidates:number[]=[];
 for(let i=0;i<nav.walkable.length;i++)if(nav.walkable[i]){
  const d=Math.hypot(nodeX(nav,i)-ox,nodeY(nav,i)-oy);
  if(d>1.6*TILE&&d<3.1*TILE)candidates.push(i);
 }
 const stops:Point[]=[];
 for(const idx of candidates){
  const p={x:nodeX(nav,idx)/TILE,y:nodeY(nav,idx)/TILE};
  if(stops.every(a=>Math.hypot(a.x-p.x,a.y-p.y)>2 && clearSegment(a.x*TILE,a.y*TILE,p.x*TILE,p.y*TILE,nav.blockers,BODY.guardRadius))&&findPath(nav,ox,oy,p.x*TILE,p.y*TILE).length)stops.push(p);
  if(stops.length===3)break;
 }
 if(stops.length<2)throw new Error(`Stage ${s.number}: Objective patrol cannot be authored`);
 const patrol:PatrolPoint[]=[];
 for(let j=0;j<stops.length;j++){
  const a=stops[j],b=stops[(j+1)%stops.length];
  patrol.push({...a,waitDuration:2.2,lookDirection:Math.atan2(oy-a.y*TILE,ox-a.x*TILE),turnDuration:1});
  const path=findPath(nav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);
  for(let i=0;i<path.length-2;i+=2)patrol.push({x:path[i]/TILE,y:path[i+1]/TILE,waitDuration:0,turnDuration:0.2});
 }
 const guard=s.guards[s.guards.length-1];
 guard.x=patrol[0].x;guard.y=patrol[0].y;guard.facing=patrol[0].lookDirection!;guard.routeId='objective-watch';
 s.patrolRoutes.push({id:guard.routeId,mode:'loop',points:patrol});
 s.objectiveZone={guardId:guard.id,spotlight:true};
 // Roaming shares authored reachable points and the existing cached A* driver.
 const roamingCount=s.number<3?0:Math.min(s.guards.length-1,1+Math.floor((s.number-3)/3));
 for(let i=0;i<roamingCount;i++){
  const g=s.guards[i],r=s.patrolRoutes.find(r=>r.id===g.routeId)!;
  r.mode='roaming';
  if(r.points.length===2){
   const [a,b]=r.points;r.points.splice(1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2,waitDuration:2,turnDuration:0.8});
  }
 }
 return s;
}
