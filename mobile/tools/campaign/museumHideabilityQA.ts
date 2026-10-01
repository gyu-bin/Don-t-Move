/** Offline geometric evidence. A witness proves occlusion from one authored guard
 * anchor, not safety from every guard or human Tilt difficulty. Never auto-places props. */
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import type {PropKind, StageDefinition} from '../../src/game/levels/StageDefinition';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath,nodeX,nodeY} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {PROP_KIT} from '../../src/game/world/propKit';
import {describeMuseumDesign,type MuseumDesignZone} from './museumFinalDesign';

type Point={x:number;y:number};
const round=(n:number)=>Math.round(n*100)/100;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const fullKinds:PropKind[]=['partition','shelf','pillar'];
export function structureRole(kind:PropKind){
 if(PROP_KIT[kind].blocksVision)return fullKinds.includes(kind)?'FULL COVER':'LOS BREAKER';
 if(['table','counter','sofa','statuePedestal','diamondPedestal'].includes(kind))return 'ROUTE DIVIDER';
 return 'DECORATION';
}
export function auditHideability(def:StageDefinition,design:{zones:MuseumDesignZone[]}=describeMuseumDesign(def)){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.playerRadius),guardNav=buildNavigation(stage,BODY.guardRadius);
 const anchors=stage.guards.flatMap(g=>g.route.map((p,i)=>({x:p.x,y:p.y,guard:g.id,index:i,range:g.visionRange})));
 const valid=(p:Point)=>clearSegment(p.x,p.y,p.x,p.y,nav.blockers,BODY.playerRadius);
 const reaches=(a:Point,b:Point,n=nav)=>{const path=findPath(n,a.x,a.y,b.x,b.y);return path.length>=2&&Math.hypot(path.at(-2)!-b.x,path.at(-1)!-b.y)<.01;};
 const toTile=(p:Point)=>({x:round(p.x/TILE),y:round(p.y/TILE)});
 const hidden=(a:Point,p:Point,blockers=stage.visionBlockers)=>[
  [0,0],[BODY.playerRadius,0],[-BODY.playerRadius,0],[0,BODY.playerRadius],[0,-BODY.playerRadius],
 ].every(([dx,dy])=>!clearSegment(a.x,a.y,p.x+dx,p.y+dy,blockers));
 const zoneAt=(p:Point)=>design.zones.find(z=>(z.regions??[z.bounds]).some(b=>p.x>=b.x&&p.x<b.x+b.w&&p.y>=b.y&&p.y<b.y+b.h))?.id??null;
 const structures=def.props.map((p,index)=>({index,kind:p.kind,x:p.x,y:p.y,role:structureRole(p.kind),zone:zoneAt(p)}));
 const witnesses:{structure:number;zone:string|null;point:Point;anchor:Point;guard:string;approach:Point|null;escapePocket:boolean}[]=[];
 for(const item of structures){
  if(item.role!=='FULL COVER'&&item.role!=='LOS BREAKER')continue;
  const prop=def.props[item.index],spec=PROP_KIT[prop.kind],sc=prop.collisionScale??1;
  const cx=prop.x*TILE,cy=(prop.y-spec.footprint.h*sc/2)*TILE;
  const rx=spec.footprint.w*sc*TILE/2+BODY.playerRadius+8,ry=spec.footprint.h*sc*TILE/2+BODY.playerRadius+8;
  const ownBox=[cx-spec.footprint.w*sc*TILE/2,cy-spec.footprint.h*sc*TILE/2,cx+spec.footprint.w*sc*TILE/2,cy+spec.footprint.h*sc*TILE/2];
  const candidates=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y])=>({x:cx+x*rx,y:cy+y*ry})).filter(valid);
  let result:typeof witnesses[number]|undefined;
  for(const point of candidates){
   if(!reaches(stage.playerSpawn,point))continue;
   for(const anchor of anchors){
    if(distance(anchor,point)>anchor.range||distance(anchor,point)<TILE||!hidden(anchor,point,ownBox))continue;
    // A short, body-clear approach from an exposed point makes this a local escape pocket.
    let approach:Point|null=null;
    for(let i=0;i<16&&!approach;i++){
     const a=i*Math.PI/8,q={x:cx+Math.cos(a)*(rx+TILE),y:cy+Math.sin(a)*(ry+TILE)};
     if(!valid(q)||!clearSegment(anchor.x,anchor.y,q.x,q.y,stage.visionBlockers))continue;
     const path=findPath(nav,q.x,q.y,point.x,point.y);if(!path.length||Math.hypot(path.at(-2)!-point.x,path.at(-1)!-point.y)>.01)continue;
     let length=0,last=q;for(let j=0;j<path.length;j+=2){const next={x:path[j],y:path[j+1]};length+=distance(last,next);last=next;}
     if(length<=4*TILE)approach=q;
    }
    result={structure:item.index,zone:item.zone,point:toTile(point),anchor:toTile(anchor),guard:anchor.guard,approach:approach?toTile(approach):null,escapePocket:!!approach};
    if(approach)break;
   }
   if(result?.escapePocket)break;
  }
  if(result)witnesses.push(result);
 }
 // Architectural refuges are measured separately from prop witnesses. One site
 // per zone, separated from existing witnesses, avoids counting perimeter tiles.
 const walls=stage.wallRects.flatMap(r=>[r.x,r.y,r.x+r.w,r.y+r.h]);
 const architecturalRefuges:{zone:string;point:Point;anchor:Point;guard:string;approach:Point;escapePocket:true}[]=[];
 for(const zone of design.zones){
  const inZone=(p:Point)=>(zone.regions??[zone.bounds]).some(b=>p.x/TILE>=b.x&&p.x/TILE<b.x+b.w&&p.y/TILE>=b.y&&p.y/TILE<b.y+b.h);
  const nodes=nav.walkable.flatMap((ok,i)=>ok&&inZone({x:nodeX(nav,i),y:nodeY(nav,i)})?[{x:nodeX(nav,i),y:nodeY(nav,i)}]:[]);
  let found=false;
  for(const point of nodes){
   if(witnesses.some(w=>distance({x:w.point.x*TILE,y:w.point.y*TILE},point)<2*TILE)||!reaches(stage.playerSpawn,point))continue;
   for(const anchor of anchors){
    if(distance(anchor,point)>anchor.range||distance(anchor,point)<TILE||!hidden(anchor,point,walls))continue;
    for(const approach of nodes){
     if(distance(approach,point)>3*TILE||!clearSegment(anchor.x,anchor.y,approach.x,approach.y,stage.visionBlockers))continue;
     const path=findPath(nav,approach.x,approach.y,point.x,point.y);if(path.length<2||Math.hypot(path.at(-2)!-point.x,path.at(-1)!-point.y)>.01)continue;
     let length=0,last=approach;for(let j=0;j<path.length;j+=2){const next={x:path[j],y:path[j+1]};length+=distance(last,next);last=next;}
     if(length>4*TILE)continue;
     architecturalRefuges.push({zone:zone.id,point:toTile(point),anchor:toTile(anchor),guard:anchor.guard,approach:toTile(approach),escapePocket:true});found=true;break;
    }if(found)break;
   }if(found)break;
  }
 }
 const routes=[...(def.testRoutes??[]),...(def.escapeRoutes??[])].map(route=>{
  let minClearance=Infinity;const samples:Point[]=[];
  route.points.slice(1).forEach((b,i)=>{const a=route.points[i],n=Math.max(1,Math.ceil(distance(a,b)*4));for(let j=0;j<=n;j++)samples.push({x:(a.x+(b.x-a.x)*j/n)*TILE,y:(a.y+(b.y-a.y)*j/n)*TILE});});
  for(const p of samples)for(let i=0;i<nav.blockers.length;i+=4){const b=nav.blockers;minClearance=Math.min(minClearance,Math.hypot(Math.max(b[i]-p.x,0,p.x-b[i+2]),Math.max(b[i+1]-p.y,0,p.y-b[i+3])));}
  return {name:route.name,bodyClear:route.points.slice(1).every((b,i)=>{const a=route.points[i];return clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,nav.blockers,BODY.playerRadius);}),minimumBodyMargin:round(minClearance-BODY.playerRadius)};
 });
 // Eight-direction open sightline samples. Long rays warn; they do not certify certain capture.
 let maxLOS=0;let maxLOSOrigin:Point|null=null;const longOrigins:Point[]=[];
 for(let i=0;i<nav.walkable.length;i++){
  if(!nav.walkable[i]||i%2!==0)continue;
  const p={x:nodeX(nav,i),y:nodeY(nav,i)};let longest=0;
  for(let dir=0;dir<8;dir++){const a=dir*Math.PI/4;let ray=0;for(let t=.5;t<=Math.max(stage.cols,stage.rows);t+=.5){
   const q={x:p.x+Math.cos(a)*t*TILE,y:p.y+Math.sin(a)*t*TILE};
   if(q.x<0||q.y<0||q.x>stage.width||q.y>stage.height||!clearSegment(p.x,p.y,q.x,q.y,stage.visionBlockers))break;ray=t;
  }longest=Math.max(longest,ray);}
  if(longest>maxLOS){maxLOS=longest;maxLOSOrigin=toTile(p);}if(longest>=12)longOrigins.push(toTile(p));
 }
 const guards=stage.guards.map(g=>({id:g.id,anchors:g.route.map((a,i)=>({index:i,point:toTile(a),bodyClear:clearSegment(a.x,a.y,a.x,a.y,guardNav.blockers,BODY.guardRadius),reachable:reaches(g,a,guardNav)})),theftPosts:(g.theftPosts??[]).map(a=>({point:toTile(a),bodyClear:clearSegment(a.x,a.y,a.x,a.y,guardNav.blockers,BODY.guardRadius),reachable:reaches(g,a,guardNav)}))}));
 const zones=design.zones.map(z=>{const ss=structures.filter(p=>p.zone===z.id),ws=witnesses.filter(p=>p.zone===z.id),aw=architecturalRefuges.filter(p=>p.zone===z.id);return {...z,fullCover: ss.filter(p=>p.role==='FULL COVER').length,architecturalRefuges:aw.length,losBreakers:ss.filter(p=>p.role==='LOS BREAKER').length,hidePoints:ws.length+aw.length,escapePockets:ws.filter(p=>p.escapePocket).length+aw.length};});
 const warnings:string[]=[];
 for(const z of zones)if(!z.hidePoints)warnings.push(`${z.id} ${z.name}: no body occlusion witness from an authored guard anchor; ${z.exception??'inspect missing hiding place or anchor coverage'}.`);
 if(maxLOS>=12)warnings.push(`Long straight LOS ${maxLOS} tiles; inspect nearby corner/cover and guard orientation. No automatic map changes.`);
 for(const r of routes)if(!r.bodyClear)warnings.push(`BLOCKED ROUTE ${r.name}`);
 for(const g of guards)if([...g.anchors,...g.theftPosts].some(a=>!a.bodyClear||!a.reachable))warnings.push(`UNREACHABLE GUARD ANCHOR ${g.id}`);
 const refuges=[...witnesses.filter(w=>w.escapePocket),...architecturalRefuges];
 const nearbyBreakCount=longOrigins.filter(p=>refuges.some(w=>distance(p,w.point)<=4&&reaches({x:p.x*TILE,y:p.y*TILE},{x:w.point.x*TILE,y:w.point.y*TILE}))).length;
 return {id:def.id,title:def.title,zones,structures,witnesses,architecturalRefuges,fullCover:structures.filter(p=>p.role==='FULL COVER').length,losBreakers:structures.filter(p=>p.role==='LOS BREAKER').length,hidePoints:witnesses.length+architecturalRefuges.length,escapePockets:witnesses.filter(p=>p.escapePocket).length+architecturalRefuges.length,mergedArchitecturalWallBoxes:stage.wallRects.length,routes,guards,maxUnbrokenLOS:maxLOS,maxLOSOrigin,longLOSOriginCount:longOrigins.length,longLOSNearbyRefugeFraction:longOrigins.length?round(nearbyBreakCount/longOrigins.length):1,warnings};
}
export function writeHideabilityQA(){
 const defs=campaignStages.filter(d=>d.chapter===1),baseline:StageDefinition[]=JSON.parse(readFileSync('Reports/MuseumFinalDesignV2/before/campaignStages.json','utf8'));
 const report={method:['Offline real collision/occlusion/navigation geometry, not device play acceptance.','Full cover counts partition/shelf/pillar props; architecture wall boxes are listed separately to avoid counting perimeter tiles as hiding spots.','LOS breakers count other actual blocksVision props. Plants are never counted as sight blockers.','Hide point: reachable player-radius-clear position; centre and four body-edge rays blocked by that specific prop from an authored guard anchor inside its sight range. One witness maximum per prop.','Escape pocket: same witness plus an exposed approach reachable within four tiles around the structure. This proves local geometry, not survival time.','Architectural refuge: at most one additional reachable site per semantic zone, separated by two tiles from prop witnesses; five body rays occluded by actual wall boxes and an exposed approach reachable within four tiles. Included in hide/pocket totals, excluded from full-cover prop count.','Long LOS: half-tile ray increments in eight directions at half-grid samples; warning threshold 12 tiles.','Zero witness can mean no guard anchor observes that zone, architectural corner cover, or a missing hiding place; review explicitly.','Route margin is sampled clearance minus actual player radius; zero means no spare input margin. Human Tilt comfort remains unverified.'],playerRadius:BODY.playerRadius,guardRadius:BODY.guardRadius,missions:defs.map(def=>auditHideability(def)),before:baseline.filter(d=>['01-05','01-08','01-10'].includes(d.id)).map(def=>auditHideability(def))};
 mkdirSync('Reports/MuseumFinalDesignV2',{recursive:true});writeFileSync('Reports/MuseumFinalDesignV2/hideability.json',JSON.stringify(report,null,2)+'\n');
 const rows=report.missions.map(m=>`|${m.id}|${m.zones.length}|${m.hidePoints}|${m.fullCover}|${m.losBreakers}|${m.escapePockets}|${m.maxUnbrokenLOS}|${m.routes.every(r=>r.bodyClear)?'PASS':'FAIL'}|`);
 writeFileSync('Reports/MuseumFinalDesignV2/hideability.md',['# Museum Final Design — measured geometry','',...report.method.map(s=>'- '+s),'','|Mission|Zones|Hide witnesses|Full cover props|LOS breaker props|Escape pockets|Max LOS tiles|Route radius QA|','|---|---|---|---|---|---|---|---|',...rows,'',...report.missions.flatMap(m=>[`## ${m.id}`,'',...m.warnings.map(w=>'- '+w),''])].join('\n'));
 console.log(JSON.stringify(report.missions.map(m=>({id:m.id,zones:m.zones.length,hide:m.hidePoints,full:m.fullCover,los:m.losBreakers,pockets:m.escapePockets,warnings:m.warnings})),null,2));return report;
}
if(process.argv[1]?.endsWith('museumHideabilityQA.ts'))writeHideabilityQA();
