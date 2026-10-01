/** Gallery enrichment is an overlay: existing floorplan, routes, LOS geometry and guard data are immutable. */
import type {DressingCluster,DressingItem,StageDefinition} from '../../src/game/levels/StageDefinition';
import {DRESSING_KIT} from '../../src/game/world/dressingKit';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {galleryExhibitClusters,describeGalleryDesign} from './galleryEnvironmentDesign';
import {auditHideability} from './museumHideabilityQA';
import {PROP_KIT} from '../../src/game/world/propKit';

type P={x:number;y:number};
const art=(kind:DressingItem['kind'],visualAssetId:NonNullable<DressingItem['visualAssetId']>,x:number,y:number,scale=1,flip=false):DressingItem=>({kind,visualAssetId,x,y,scale,flip});
const identities=['Arrival Collection','Portrait Viewing Suite','Sculpture Studio Group','Modern Screen Exhibition','Collector Display','Glass Viewing Island','Curator Work Display','Atrium Seating Exhibition','Private Collection Pair','Masterpiece Chamber'];
function box(item:DressingItem){const spec=DRESSING_KIT[item.kind],s=item.scale??1;return[(item.x-spec.footprint.w*s/2)*TILE,(item.y-spec.footprint.h*s)*TILE,(item.x+spec.footprint.w*s/2)*TILE,item.y*TILE];}
function overlaps(a:number[],b:number[],margin:number){return a[0]<b[2]+margin&&a[2]>b[0]-margin&&a[1]<b[3]+margin&&a[3]>b[1]-margin;}
export function enrichGallery(def:StageDefinition):StageDefinition{
 if(def.chapter!==2)throw Error('Gallery enrichment cannot modify other chapters');
 const mission=def.mission!,base=compileStage(def),existing=base.movementBlockers;
 const hide=auditHideability(def,describeGalleryDesign(def));
 const playerRoutes=[...(def.testRoutes??[]),...(def.escapeRoutes??[])];
 const reserved=[...playerRoutes.map((r,i)=>({...r,radius:Math.max(BODY.playerRadius+9,BODY.playerRadius+hide.routes[i].minimumBodyMargin+.02)})),...def.patrolRoutes.map(r=>({...r,radius:BODY.playerRadius+9}))];
 const protectedPoints=[...hide.witnesses,...hide.architecturalRefuges].map(w=>w.point);
 const zones=galleryExhibitClusters(mission);
 // Preserve the complete original four-sided Tilt bypass, not just the named routes.
 for(const c of zones){const p=def.props.find(v=>Math.abs(v.x-c.central.x)<.001&&Math.abs(v.y-c.central.y)<.001)!;const spec=PROP_KIT[p.kind],sc=p.collisionScale??1,radius=BODY.playerRadius+9,x=p.x,y=p.y-spec.footprint.h*sc/2,dx=spec.footprint.w*sc/2+(radius+.01)/TILE,dy=spec.footprint.h*sc/2+(radius+.01)/TILE;const ring=[{x:x-dx,y:y-dy},{x:x+dx,y:y-dy},{x:x+dx,y:y+dy},{x:x-dx,y:y+dy},{x:x-dx,y:y-dy}];reserved.push({name:'central Tilt bypass',points:ring,radius});}
 const accepted:number[]=[];
 const valid=(item:DressingItem,flushTop?:number)=>{const b=box(item);for(let i=0;i<existing.length;i+=4){const obstacle=existing.slice(i,i+4);if(flushTop!==undefined&&Math.abs(b[1]-flushTop*TILE)<.01&&obstacle[3]<=b[1]+.01)continue;if(overlaps(b,obstacle,37))return false;}for(let i=0;i<accepted.length;i+=4)if(overlaps(b,accepted.slice(i,i+4),37))return false;
  for(const r of reserved)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],z=r.points[i];if(!clearSegment(a.x*TILE,a.y*TILE,z.x*TILE,z.y*TILE,b,r.radius))return false;}
  for(const p of [...protectedPoints,def.playerSpawn,def.objective!,def.exitPosition!]){if(!clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,b,BODY.playerRadius+15))return false;}
  return true;};
 const clusters:DressingCluster[]=[];
 zones.forEach((zone,index)=>{
  const b=zone.bounds,central=zone.central;
  const final=mission===10&&index===3,glass=mission===6&&index===2;
  const desired=final?3:glass?3:mission===3?(index===1?2:1):mission===1?1:b.w*b.h>=100?2:1;
  // Alternate works by collection identity, never clone a sculpture/bench pair throughout the chapter.
  const types:DressingItem['kind'][]=glass?['gallery_plinth_low','pedestal_medium','pedestal_medium']:final?['pedestal_medium','sculpture_small','gallery_installation_low']:mission===2?['bench_museum','pedestal_small']:mission===3?['sculpture_small','sculpture_small']:mission===7?['gallery_plinth_low','pedestal_small']:mission===9&&index%2?['gallery_installation_low','pedestal_small']:['pedestal_small',index%2?'bench_museum':'sculpture_small'];
  const sprite:Partial<Record<DressingItem['kind'],NonNullable<DressingItem['visualAssetId']>>>={gallery_plinth_low:'gallery_central_plinth',pedestal_small:'gallery_low_pedestal',pedestal_medium:'gallery_low_pedestal',sculpture_small:'gallery_sculpture_large',bench_museum:'gallery_modern_bench',gallery_installation_low:'gallery_installation_art'};
  const focus: P=final?{x:def.objective!.x-2.3,y:def.objective!.y+1.8}:central;
  const candidates:P[]=[];
  for(let y=b.y+1.4;y<=b.y+b.h-1;y+=.4)for(let x=b.x+1.1;x<=b.x+b.w-1;x+=.4)candidates.push({x,y});
  // A coherent exhibit shoulder sits near its central work; actual route + body clearance wins over density.
  candidates.sort((a,z)=>Math.abs(Math.hypot(a.x-focus.x,a.y-focus.y)-2.2)-Math.abs(Math.hypot(z.x-focus.x,z.y-focus.y)-2.2));
  const items:DressingItem[]=[];
  for(let n=0;n<desired;n++){
   const kind=types[n%types.length],s=glass?(kind==='gallery_plinth_low'?1.6:1.45):(mission===3||final)&&kind==='sculpture_small'?1.9:final?(kind==='pedestal_medium'?1.5:1.4):kind==='bench_museum'?.85:.9;
   const candidate=candidates.find(p=>valid(art(kind,sprite[kind]!,p.x,p.y,s,n%2===1))&&items.filter(v=>DRESSING_KIT[v.kind].category==='soft').every(v=>Math.hypot(v.x-p.x,v.y-p.y)<4.3));
   if(!candidate)continue;
   const item=art(kind,sprite[kind]!,candidate.x,candidate.y,s,n%2===1);items.push(item);accepted.push(...box(item));
  }
  if(mission===6&&index===1){
   const item=art('sculpture_small','gallery_sculpture_large',4,b.y+.4*1.9,1.9);
   if(valid(item,b.y)){items.push(item);accepted.push(...box(item));}
  }
  if(mission===6&&index===3){
   // Visible side exhibition on the east glass-return shoulder, not another full-height blocker.
   const item=art('gallery_installation_low','gallery_installation_art',22,b.y+.5*1.5,1.5);
   if(valid(item,b.y)){items.push(item);accepted.push(...box(item));}
  }
  if(final){
   // Medium works mounted on low wall-flush display bases: zero phantom gap behind them.
   for(const [kind,asset,x,scale] of [['sculpture_small','gallery_sculpture_large',23,1.9],['gallery_installation_low','gallery_installation_art',25,1.4]] as const){
    const y=b.y+DRESSING_KIT[kind].footprint.h*scale;
    const item=art(kind,asset,x,y,scale);
    if(valid(item,b.y)){items.push(item);accepted.push(...box(item));}
   }
  }
  const anchor=items[0]??central;
  // Placards and track fixtures target their exhibit, not random pools on empty floor.
  items.push({kind:'plaque',x:anchor.x+.42,y:anchor.y+.08,scale:.8},art('spotlight_small','gallery_track_light',anchor.x,anchor.y-.8,.85));
  if(mission===2||mission===4||mission===6||mission===7||final)items.push(art('painting_wall','gallery_abstract_frame',final?def.objective!.x-1.8:b.x+b.w*.46,b.y+.4,final?1.45:1.25,index%2===1));
  if(final){items.push(art('painting_wall','gallery_abstract_frame',def.objective!.x-4.2,b.y+.4,1.2,true),art('spotlight_small','gallery_track_light',def.objective!.x-1.5,b.y+.7,1));}
  if(mission>=5)items.push({kind:'gallery_floor_marker',x:anchor.x,y:anchor.y+.25,scale:final?1.6:1.1});
  clusters.push({id:`${def.id}-enrich-${index+1}`,zoneId:zone.id,identity:`${identities[mission-1]}: ${zone.name}${final?' — objective remains clear, paired low plinths and flanking modern works':glass?' — installation, low plinth and paired pedestals':''}`,items,light:{x:anchor.x,y:anchor.y-.3,radius:final?2.5:1.6,kind:'warm',intensity:final?.3:.16}});
 });
 // Two low satellite viewing groups frame the glazed court without sealing the open circulation.
 // Existing west/east room clusters supply these side exhibits; the glass itself remains untouched.
 return {...def,dressing:[...(def.dressing??[]),...clusters]};
}
export function galleryEnrichmentStats(def:StageDefinition){const c=(def.dressing??[]).filter(v=>v.id.includes('-enrich-'));return {missionId:def.id,addedExhibitClusters:c.length,addedSoftStructure:c.flatMap(v=>v.items).filter(v=>DRESSING_KIT[v.kind].category==='soft').length,addedDecoration:c.flatMap(v=>v.items).filter(v=>DRESSING_KIT[v.kind].category==='decoration').length,centralIslandCount:galleryExhibitClusters(def.mission!).length,addedCentralIslandCount:0,enrichedCentralIslandCount:c.length,clusters:c.map(v=>({id:v.id,identity:v.identity,soft:v.items.filter(i=>DRESSING_KIT[i.kind].category==='soft').map(i=>i.kind)}))};}
