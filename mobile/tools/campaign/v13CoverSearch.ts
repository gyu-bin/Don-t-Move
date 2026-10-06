/**
 * Phase 7 authoring aid: proposes where a small opaque cover piece shortens the longest stretch without cover on a
 * mission's routes (see v13Corridor.ts). A proposal is only a candidate: it is checked here against the cheap rules
 * (floor, no narrow gap to any solid, clear of every route, patrol leg, door, camera axis, entry / prize / exit) and
 * must then be composed, audited and looked at like any authored structure.
 * Usage: node --import tsx tools/campaign/v13CoverSearch.ts <mission> [pieces=2] [target=6]
 */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {PROP_KIT} from '../../src/game/world/propKit';
import {corridorAudit} from './v13Corridor';
import {V13_MISSIONS} from './v13Build';
import {composeV13} from './v13Builder';
import {auditV124bTopology} from './v124bTopologyQA';
import {fakeGaps} from './v13QA';
import source from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
type Piece={kind:keyof typeof PROP_KIT;asset:string;scale:number;tall:boolean;label:string};
const KIT:Record<number,Piece[]>={
 7:[{kind:'warehouseCrateStack',asset:'warehouse_crate_stack',scale:1,tall:true,label:'Crate Stack'},{kind:'warehouseDrumStack',asset:'warehouse_drum_stack',scale:1,tall:false,label:'Drum Stack'},{kind:'warehousePalletStack',asset:'warehouse_pallet_stack',scale:1,tall:false,label:'Pallet Stack'}],
 8:[{kind:'labServerRack',asset:'hq_server_row',scale:.9,tall:true,label:'Server Row'},{kind:'labMonitorStation',asset:'hq_security_desk',scale:1,tall:false,label:'Security Desk'},{kind:'labWorkstation',asset:'hq_duty_desk',scale:1,tall:false,label:'Duty Desk'}],
 9:[{kind:'equipment',asset:'vault_gold_pallet',scale:1.4,tall:false,label:'Gold Pallet'},{kind:'equipment',asset:'vault_cash_cage',scale:1.4,tall:true,label:'Cash Cage'},{kind:'pillar',asset:'vault_camera_pillar',scale:1.3,tall:true,label:'Security Pillar'}],
 1:[{kind:'pillar',asset:'museum_column',scale:1.4,tall:true,label:'Column'},{kind:'displayCase',asset:'museum_display_case_large',scale:1.3,tall:false,label:'Display Case'}],
 2:[{kind:'statue',asset:'gallery_sculpture_large',scale:1.5,tall:true,label:'Sculpture'},{kind:'partition',asset:'gallery_movable_art_wall',scale:1.4,tall:true,label:'Art Wall'}],
 3:[{kind:'bankMarbleColumn',asset:'bank_marble_column',scale:1,tall:true,label:'Column'},{kind:'bankCountingMachine',asset:'bank_counting_machine',scale:1,tall:false,label:'Counting Machine'},{kind:'bankCageTrolley',asset:'bank_cage_trolley',scale:1.2,tall:false,label:'Cage Trolley'}],
 4:[{kind:'labGasRack',asset:'lab_gas_rack',scale:1,tall:true,label:'Gas Rack'},{kind:'labSampleFridge',asset:'lab_sample_fridge_front',scale:.9,tall:true,label:'Sample Fridge'},{kind:'labMonitorStation',asset:'lab_monitor_station',scale:1,tall:true,label:'Monitor Station'}],
};
const [id,nArg,tArg]=process.argv.slice(2),want=Number(nArg??2),target=Number(tArg??6);
const def=(JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON??'src/game/levels/stages/campaignStages.json','utf8')) as StageDefinition[]).find(d=>d.id===id)!;
const stage=compileStage(def),solids:number[][]=[];for(let i=0;i<stage.movementBlockers.length;i+=4)solids.push(stage.movementBlockers.slice(i,i+4).map(v=>v/TILE));
// Walls may be touched; other structures may not (a mirrored chapter draws some of them smaller, which opens a slit).
const walls=new Set(stage.wallRects.map(r=>[r.x,r.y,r.x+r.w,r.y+r.h].map(v=>(v/TILE).toFixed(2)).join()));
const isWall=(r:number[])=>walls.has(r.map(v=>v.toFixed(2)).join());
// The walked lines of the present bake (the composer re-routes a leg round a new piece, so only a body's width is
// kept free), the patrol legs (guards walk them straight, so they keep more) and the authored route nodes.
const walks:[number,number,number,number][]=[],patrols:[number,number,number,number][]=[];
for(const r of [...(def.testRoutes??[]),...(def.escapeRoutes??[])])for(let i=1;i<r.points.length;i++)walks.push([r.points[i-1].x,r.points[i-1].y,r.points[i].x,r.points[i].y]);
for(const g of stage.guards){const r=g.route,n=g.routeMode==='loop'?r.length:r.length-1;for(let k=0;k<n;k++){const a=r[k],b=r[(k+1)%r.length];patrols.push([a.x/TILE,a.y/TILE,b.x/TILE,b.y/TILE]);}}
const nodes=[...def.topologyPlan!.rooms.map(r=>r.hub??{x:r.x+r.w/2,y:r.y+r.h/2}),...def.topologyPlan!.edges.flatMap(e=>[...(e.via??[]),...(e.door?[e.door.at]:[])])];
const spots=[def.playerSpawn,def.objective!,def.exitPosition!,...(stage.doors??[]).map(d=>({x:d.x/TILE,y:d.y/TILE}))].map(q=>({x:q.x,y:q.y}));
const near=(b:number[],x:number,y:number)=>Math.hypot(Math.max(b[0]-x,0,x-b[2]),Math.max(b[1]-y,0,y-b[3]));
function allowed(b:number[],tall:boolean,placed:number[][]):boolean{
 for(let y=Math.floor(b[1]);y<=Math.floor(b[3]-1e-6);y++)for(let x=Math.floor(b[0]);x<=Math.floor(b[2]-1e-6);x++)if(def.layout[y]?.[x]!=='.')return false;
 for(const r of [...solids,...placed]){const gx=Math.max(r[0]-b[2],b[0]-r[2]),gy=Math.max(r[1]-b[3],b[1]-r[3]);
  if(gx<-.02&&gy<-.02)return false;const d=Math.hypot(Math.max(0,gx),Math.max(0,gy));
  if(d<1.5&&(d>.04||!isWall(r)))return false;
  // A tall piece against the wall south of it is cut by that wall's cap in the render.
  if(d<=.04&&tall&&gy>=-.04&&r[1]>=b[3]-.05&&gx<0)return false;}
 for(const[list,keep]of[[walks,.4],[patrols,.6]] as const)for(const[x0,y0,x1,y1]of list){if(REROUTE&&list===walks)continue;const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*8));for(let j=0;j<=n;j++)if(near(b,x0+(x1-x0)*j/n,y0+(y1-y0)*j/n)<keep)return false;}
 if(nodes.some(q=>near(b,q.x,q.y)<.65))return false;
 if(spots.some((q,i)=>near(b,q.x,q.y)<(i<3?1.75:1.1)))return false;
 for(const c of stage.cameras??[])for(let r=0;r<=4;r+=.25)if(near(b,c.x/TILE+Math.cos(c.centerFacing)*r,c.y/TILE+Math.sin(c.centerFacing)*r)<.35)return false;
 return true;
}
const cost=(extra:number[][])=>corridorAudit(def,extra,true).reduce((n,r)=>n+Math.max(0,r.gap.len-target)**1.5,0);
// REROUTE=1: the piece may stand on a walked line (never on an authored node). The stage is then really composed with
// it, so the composer bends the leg round it, and the gaps are measured on the routes that result. Slower.
const REROUTE=!!process.env.REROUTE;
const real=(pieces:{p:Piece;x:number;y:number}[])=>{const m=V13_MISSIONS.find(q=>q.id===id)!;
 try{const d=composeV13({...m,structures:[...m.structures,...pieces.map((q,i)=>({name:`Phase7 Try ${i}`,roles:['hiding','losBreak'] as ('hiding'|'losBreak')[],kind:q.p.kind as never,asset:q.p.asset as never,x:q.x,y:q.y,scale:q.p.scale}))]},source as unknown as StageDefinition[]);
  const gaps=fakeGaps(d);if(auditV124bTopology(d).errors.length||gaps.sealed.length||gaps.squeezes.length)return null;return d;}catch{return null;}};
const zone=(x:number,y:number)=>def.topologyPlan!.rooms.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
const placed:number[][]=[],chosen:{p:Piece;x:number;y:number}[]=[];let now=cost([]);
console.log(id,'gaps',corridorAudit(def,[],true).map(r=>`${r.route} ${r.gap.len.toFixed(1)}`).join(' | '));
for(let n=0;n<want&&now>0;n++){
 let best:{c:number;b:number[];p:Piece;x:number;y:number}|null=null;
 // Only positions within three tiles of an over-long stretch can shorten it.
 const hot=corridorAudit(def,placed,true).filter(r=>r.gap.len>target).flatMap(r=>[r.gap.from,r.gap.to,{x:(r.gap.from.x+r.gap.to.x)/2,y:(r.gap.from.y+r.gap.to.y)/2}]);
 for(const p of KIT[def.chapter!]){const f=PROP_KIT[p.kind].footprint,w=f.w*p.scale,h=f.h*p.scale;
  for(let y=1;y<def.layout.length-1;y+=REROUTE?.5:.25)for(let x=1;x<def.layout[0].length-1;x+=REROUTE?.5:.25){
   if(!hot.some(q=>Math.hypot(q.x-x,q.y-y)<6))continue;
   // The grid position itself, and the same piece pushed flush against whatever solid is within a third of a tile.
   const base=[x-w/2,y-h/2,x+w/2,y+h/2],tries=[base];
   for(const r of solids){const overlapX=r[0]<base[2]&&r[2]>base[0],overlapY=r[1]<base[3]&&r[3]>base[1];
    if(overlapX&&Math.abs(r[3]-base[1])<.34)tries.push([base[0],r[3],base[2],r[3]+h]);if(overlapX&&Math.abs(r[1]-base[3])<.34)tries.push([base[0],r[1]-h,base[2],r[1]]);
    if(overlapY&&Math.abs(r[2]-base[0])<.34)tries.push([r[2],base[1],r[2]+w,base[3]]);if(overlapY&&Math.abs(r[0]-base[2])<.34)tries.push([r[0]-w,base[1],r[0],base[3]]);}
   for(const b of tries){if(!allowed(b,p.tall,placed))continue;const cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2;
    if(REROUTE){if(b===base||!hot.some(q=>Math.hypot(q.x-cx,q.y-cy)<4))continue;const d=real([...chosen,{p,x:cx,y:cy}]);if(!d)continue;
     const c=corridorAudit(d,[],true).reduce((n,r)=>n+Math.max(0,r.gap.len-target)**1.5,0);if(c<now-.5&&(!best||c<best.c))best={c,b,p,x:cx,y:cy};continue;}
    const c=cost([...placed,b]);if(c<now-.5&&(!best||c<best.c))best={c,b,p,x:cx,y:cy};}}}
 if(!best){console.log('  no further position helps');break;}
 placed.push(best.b);chosen.push({p:best.p,x:best.x,y:best.y});now=best.c;const z=zone(best.x,best.y);
 console.log(`  {name:'${z?.name??'Hall'} ${best.p.label}',roles:['hiding','losBreak'],kind:'${best.p.kind}',asset:'${best.p.asset}',x:${+best.x.toFixed(3)},y:${+best.y.toFixed(3)},scale:${best.p.scale}},`);
 console.log('   →',corridorAudit(def,placed,true).map(r=>`${r.route} ${r.gap.len.toFixed(1)}`).join(' | '));
}
