/**
 * Chapter 2/3 furnishing pass. Applied last in buildMission.
 *
 * Adds wall-backed furniture, open-floor low furniture and wall decor so large
 * rooms stop reading as empty, and corrects a few authored placement errors.
 * Every added collider is movement-only (never blocks vision), so guard and
 * camera detection geometry is unchanged. A prop is kept only if all authored
 * player routes, patrol routes and guard search targets stay clear/reachable.
 */
import type {StageDefinition,PropDef,PropKind} from '../../src/game/levels/StageDefinition';
import type {EnvironmentAssetId} from '../../src/assets/environmentKit';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,findPath,clearSegment,nodeX,nodeY} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {PROP_KIT} from '../../src/game/world/propKit';

type Point={x:number;y:number};
type Item={kind:PropKind;asset:EnvironmentAssetId;scale?:number};
type Box={x0:number;y0:number;x1:number;y1:number};
const ROUTE_RADIUS=18;

const KIT:Record<number,{wall:Item[];center:Item[];decor:Item[]}>={
 2:{
  wall:[{kind:'bench',asset:'gallery_modern_bench',scale:1.2},{kind:'statuePedestal',asset:'gallery_low_pedestal',scale:.85}],
  center:[{kind:'statuePedestal',asset:'gallery_central_plinth',scale:2},{kind:'bench',asset:'gallery_modern_bench',scale:1.2}],
  decor:[{kind:'painting',asset:'gallery_portrait_frame_a',scale:.6},{kind:'painting',asset:'gallery_abstract_frame',scale:.85},{kind:'painting',asset:'gallery_portrait_frame_b',scale:.6}],
 },
 3:{
  wall:[{kind:'bankOfficeDesk',asset:'bank_office_desk'},{kind:'bankPlant',asset:'bank_plant'},{kind:'bankCashCart',asset:'bank_cash_cart'},{kind:'bankCashProcessingTable',asset:'bank_cash_processing_table'}],
  center:[{kind:'bankCashProcessingTable',asset:'bank_cash_processing_table'},{kind:'bankQueueBarrier',asset:'bank_queue_barrier'},{kind:'bankCashCart',asset:'bank_cash_cart'}],
  decor:[{kind:'bankMonitor',asset:'bank_monitor'},{kind:'bankClock',asset:'bank_clock'}],
 },
};

/** Authored placement errors found by tools/campaign/mapAudit.ts. */
function fixPlacement(def:StageDefinition){
 const move=(kind:PropKind,from:Point,to:Point)=>{
  const p=def.props.find(q=>q.kind===kind&&q.x===from.x&&q.y===from.y);
  if(!p)throw Error(`${def.id}: furnishing fix target missing ${kind}@${from.x},${from.y}`);
  p.x=to.x;p.y=to.y;
 };
 // Gate stood inside the room, one tile left of its doorway (x 16-18, rows 18-19).
 if(def.id==='03-08')move('bankSecurityGate',{x:16,y:20.5},{x:17,y:19.5});
 // Table was embedded in the wall row above it.
 if(def.id==='03-07')move('bankCashProcessingTable',{x:12,y:11},{x:12,y:12});
}

function size(item:Item){
 const spec=PROP_KIT[item.kind],k=item.scale??1;
 return {w:spec.footprint.w*k,h:spec.footprint.h*k};
}
function toProp(item:Item,x:number,y:number):PropDef{
 const p:PropDef={kind:item.kind,visualAssetId:item.asset,x:+x.toFixed(2),y:+y.toFixed(2)};
 if(item.scale!==undefined){p.scale=item.scale;if(PROP_KIT[item.kind].footprint.w>0&&!item.kind.startsWith('bank'))p.collisionScale=item.scale;}
 return p;
}
function boxes(def:StageDefinition):Box[]{
 const out:Box[]=[];
 for(const p of def.props){
  const spec=PROP_KIT[p.kind];
  const k=p.collisionScale??(/^(bank|galleryGlass|lab|casino)/.test(p.kind)?(p.scale??1):1);
  // Visual extent matters for spacing even where the collider is unscaled.
  const v=Math.max(k,p.scale??1),w=Math.max(spec.footprint.w*v,spec.drawWidth*(p.scale??1)),h=Math.max(spec.footprint.h*v,.3);
  if(spec.wallMounted||spec.floorDetail)continue;
  out.push({x0:p.x-w/2,x1:p.x+w/2,y0:p.y-h,y1:p.y});
 }
 return out;
}
const gap=(a:Box,b:Box)=>Math.hypot(Math.max(b.x0-a.x1,a.x0-b.x1,0),Math.max(b.y0-a.y1,a.y0-b.y1,0));
const pointGap=(b:Box,p:Point)=>Math.hypot(Math.max(b.x0-p.x,0,p.x-b.x1),Math.max(b.y0-p.y,0,p.y-b.y1));

function reachable(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,ROUTE_RADIUS),seen=new Set<number>();
 let start=-1,best=Infinity;
 for(let i=0;i<nav.walkable.length;i++){
  if(!nav.walkable[i])continue;
  const d=Math.hypot(nodeX(nav,i)-def.playerSpawn.x*TILE,nodeY(nav,i)-def.playerSpawn.y*TILE);
  if(d<best){best=d;start=i;}
 }
 const queue=[start];seen.add(start);
 while(queue.length){const i=queue.pop()!;for(const j of nav.neighbors[i]??[])if(!seen.has(j)){seen.add(j);queue.push(j);}}
 return {nav,seen};
}

/** All authored movement contracts still hold with the candidate props. */
function contractsHold(def:StageDefinition,baseReach:Set<number>,baseLegs:Map<string,number>):boolean{
 let stage;
 try{stage=compileStage(def);}catch{return false;}
 const px=(p:Point)=>[p.x*TILE,p.y*TILE] as const;
 for(const route of [...(def.testRoutes??[]),...(def.escapeRoutes??[])])for(let i=1;i<route.points.length;i++){
  const [ax,ay]=px(route.points[i-1]),[bx,by]=px(route.points[i]);
  if(!clearSegment(ax,ay,bx,by,stage.movementBlockers,ROUTE_RADIUS))return false;
 }
 const guardNav=buildNavigation(stage,BODY.guardRadius);
 for(const g of stage.guards){
  for(let i=0;i<g.route.length;i++){
   const a=g.route[i],b=g.route[(i+1)%g.route.length];
   // Guards walk patrol legs as straight lines; a leg that was clear must stay clear with margin.
   const margin=baseLegs.get(`${g.id}:${i}`);
   if(margin!==undefined&&!clearSegment(a.x,a.y,b.x,b.y,stage.movementBlockers,BODY.guardRadius+margin))return false;
  }
  for(const t of [...g.route,...(g.theftPosts??[]),...(g.theftSearchSectors??[]).flatMap(s=>s.anchors)]){
   const path=findPath(guardNav,g.x,g.y,t.x,t.y);
   if(path.length<2||Math.hypot(path.at(-2)!-t.x,path.at(-1)!-t.y)>guardNav.cell)return false;
  }
 }
 // No floor that the player could reach before may be sealed off.
 const {nav,seen}=reachable(def);
 for(const i of baseReach)if(nav.walkable[i]&&!seen.has(i))return false;
 return true;
}

export function applyFurnishing(source:StageDefinition):StageDefinition{
 const kit=KIT[source.chapter??0];
 if(!kit)return source;
 const def=structuredClone(source);
 fixPlacement(def);
 const layout=def.layout,floor=(x:number,y:number)=>layout[y]?.[x]==='.';
 const floorTiles=layout.join('').split('').filter(c=>c==='.').length;
 const baseReach=reachable(def).seen,baseLegs=new Map<string,number>();
 {const stage=compileStage(def);for(const g of stage.guards)for(let i=0;i<g.route.length;i++){const a=g.route[i],b=g.route[(i+1)%g.route.length];for(const margin of [8,0])if(clearSegment(a.x,a.y,b.x,b.y,stage.movementBlockers,BODY.guardRadius+margin)){baseLegs.set(`${g.id}:${i}`,margin);break;}}}
 const keepOut:{p:Point;r:number}[]=[
  {p:def.playerSpawn,r:1.6},{p:def.objective!,r:1.8},{p:{x:def.exit!.x+def.exit!.w/2,y:def.exit!.y+def.exit!.h/2},r:1.8},
  ...(def.entryPosition?[{p:def.entryPosition,r:2}]:[]),...(def.exitPosition?[{p:def.exitPosition,r:2}]:[]),
  ...def.guards.map(g=>({p:{x:g.x,y:g.y},r:1.1})),
  ...(def.safeZones??[]).map(z=>({p:{x:z.x,y:z.y},r:1.2})),
  ...(def.cameras??[]).map(c=>({p:{x:c.x,y:c.y},r:1})),
 ];
 const tryPlace=(item:Item,x:number,y:number,spacing:number):boolean=>{
  const {w,h}=size(item),box:Box={x0:x-w/2,x1:x+w/2,y0:y-h,y1:y};
  // Whole footprint on floor.
  const why=(r:string)=>{if(process.env.FURNISH_DEBUG===def.id)console.log(def.id,item.kind,x,y,r);return false;};
  for(let ty=Math.floor(box.y0+.01);ty<=Math.floor(box.y1-.01);ty++)for(let tx=Math.floor(box.x0+.01);tx<=Math.floor(box.x1-.01);tx++)if(!floor(tx,ty))return why('off-floor');
  if(keepOut.some(k=>pointGap(box,k.p)<k.r))return why('keep-out');
  if(boxes(def).some(b=>gap(b,box)<spacing))return why('spacing');
  const prop=toProp(item,x,y);
  def.props.push(prop);
  if(contractsHold(def,baseReach,baseLegs))return true;
  def.props.pop();
  return why('contract');
 };

 // 1. Furniture backed against room walls (never in corridors or doorways).
 const wallCap=Math.ceil(floorTiles/40);let placed=0,turn=0;
 const used=new Map<PropKind,number>(),kindCap=Math.max(2,Math.ceil(wallCap/kit.wall.length)+1);
 // South walls are skipped: the raised wall cap hides whatever stands directly north of it.
 const sides:[number,number][]=[[0,-1],[-1,0],[1,0]];
 for(const [sx,sy] of sides)for(let y=1;y<layout.length&&placed<wallCap;y++)for(let x=1;x<layout[y].length&&placed<wallCap;x++){
  if(!floor(x,y)||floor(x+sx,y+sy))continue;
  // A straight wall run with open room in front of it: 4 tiles along, 4 deep.
  const along=sx===0?[[-1,0],[1,0],[2,0]]:[[0,-1],[0,1],[0,2]];
  const run=along.every(([ax,ay])=>floor(x+ax,y+ay)&&!floor(x+ax+sx,y+ay+sy));
  const depth=[1,2,3].every(k=>[[0,0],...along].every(([ax,ay])=>floor(x+ax-sx*k,y+ay-sy*k)));
  if(!run||!depth)continue;
  // Preferred piece first, then the smaller ones that may still fit this spot.
  // No single piece may dominate a map (small ones fit everywhere).
  const order=kit.wall.map((_,i)=>kit.wall[(turn+i)%kit.wall.length]).filter(item=>(used.get(item.kind)??0)<kindCap);
  if(order.some(item=>{
   const {w,h}=size(item);
   const px=sx===0?x+1:sx<0?x+w/2+.08:x+1-w/2-.08;
   const py=sy<0?y+h+.08:y+1+h/2;
   if(!tryPlace(item,px,py,2.2))return false;
   used.set(item.kind,(used.get(item.kind)??0)+1);return true;
  })){placed++;turn++;}
 }

 // 2. Companions for free-standing pieces: a viewing bench or service item beside them.
 const isolated=()=>{
  const all=boxes(def);
  return all.filter(b=>{
   const c={x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2};
   if(all.some(o=>o!==b&&pointGap(o,c)<3))return false;
   for(let wy=Math.floor(c.y)-3;wy<=c.y+3;wy++)for(let wx=Math.floor(c.x)-3;wx<=c.x+3;wx++)if(layout[wy]?.[wx]==='#'&&pointGap({x0:wx,y0:wy,x1:wx+1,y1:wy+1},c)<2.5)return false;
   return true;
  });
 };
 let companions=0;
 for(const b of isolated()){
  const item=kit.center[(companions+1)%kit.center.length],{w,h}=size(item),cx=(b.x0+b.x1)/2;
  const spots:[number,number][]=[[cx,b.y1+1.25+h],[cx,b.y0-1.25],[b.x1+1.25+w/2,b.y1],[b.x0-1.25-w/2,b.y1]];
  if(spots.some(([px,py])=>tryPlace(item,px,py,1.1)))companions++;
 }

 // 3. Low furniture in the largest remaining open floor areas.
 const centerCap=Math.ceil(floorTiles/90);
 for(let n=0;n<centerCap;n++){
  const current=boxes(def),open:{x:number;y:number;d:number}[]=[];
  for(let y=0;y<layout.length;y++)for(let x=0;x<layout[y].length;x++){
   if(!floor(x,y))continue;
   const c={x:x+.5,y:y+.5};let d=Infinity;
   for(let wy=Math.max(0,y-5);wy<=y+5;wy++)for(let wx=Math.max(0,x-5);wx<=x+5;wx++)if(layout[wy]?.[wx]==='#')d=Math.min(d,pointGap({x0:wx,y0:wy,x1:wx+1,y1:wy+1},c));
   for(const b of current)d=Math.min(d,pointGap(b,c));
   if(d>=2.2)open.push({...c,d});
  }
  open.sort((a,b)=>b.d-a.d||a.y-b.y||a.x-b.x);
  const options=[...kit.center.slice(n%kit.center.length),...kit.center.slice(0,n%kit.center.length)];
  if(!open.slice(0,12).some(spot=>options.some(item=>tryPlace(item,spot.x,spot.y+size(item).h/2,1.3))))break;
 }

 // 4. Wall decor on north wall faces: no collider, purely visual.
 const decorCap=Math.ceil(floorTiles/60),decor:Point[]=def.props.filter(p=>PROP_KIT[p.kind].wallMounted).map(p=>({x:p.x,y:p.y}));let hung=0;
 for(let y=1;y<layout.length&&hung<decorCap;y++)for(let x=1;x<layout[y].length&&hung<decorCap;x++){
  if(!floor(x,y)||floor(x,y-1)||!floor(x-1,y)||!floor(x+1,y)||floor(x-1,y-1)||floor(x+1,y-1))continue;
  const at={x:x+.5,y:def.chapter===3?y+.15:y};
  if(decor.some(d=>Math.hypot(d.x-at.x,d.y-at.y)<4))continue;
  if(boxes(def).some(b=>pointGap(b,{x:at.x,y:at.y+.4})<.9))continue;
  def.props.push(toProp(kit.decor[hung%kit.decor.length],at.x,at.y));decor.push(at);hung++;
 }
 if(!contractsHold(def,baseReach,baseLegs))throw Error(`${def.id}: furnishing pass broke an authored movement contract`);
 return def;
}
