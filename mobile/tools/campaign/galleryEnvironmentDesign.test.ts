import v3FinalJSON from './fixtures/v3MuseumGalleryFinal.json';
import historicalJSON from './fixtures/v3MuseumGalleryBefore.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {applyV3MuseumGallery,explicitV3SafetyIntent,v3ZoneFeatures,v3MuseumGalleryDesign} from './v3MuseumGallery';
import {auditV3MuseumGallery} from './v3MuseumGalleryQA';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {galleryEnvironmentMission,galleryExhibitClusters,describeGalleryDesign} from './galleryEnvironmentDesign';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {PROP_KIT} from '../../src/game/world/propKit';
import {clearSegment,buildNavigation,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';

test('historical Gallery central islands retain shoulders at their original9px Tilt margin',()=>{
 // This ten-map authoring fixture predates V12 .07s smoothing. Current runtime is audited separately.
 const radius=BODY.playerRadius+9;
 let witnesses=0;
 for(let mission=1;mission<=10;mission++){
  const def=galleryEnvironmentMission(mission),stage=compileStage(def);
  const islands=galleryExhibitClusters(mission).map(c=>def.props.find(p=>Math.abs(p.x-c.central.x)<.001&&Math.abs(p.y-c.central.y)<.001)!);
  for(const p of islands){
   const f=PROP_KIT[p.kind].footprint,scale=p.collisionScale??1;
   const x=p.x*TILE,y=(p.y-f.h*scale/2)*TILE,dx=f.w*scale*TILE/2+radius+.01,dy=f.h*scale*TILE/2+radius+.01;
   const corners=[[x-dx,y-dy],[x+dx,y-dy],[x+dx,y+dy],[x-dx,y+dy]];
   for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];assert(clearSegment(a[0],a[1],b[0],b[1],stage.movementBlockers,radius),`${def.id}: island shoulder blocked ${p.visualAssetId} (${p.x},${p.y})`);}
   witnesses++;
  }
 }
 assert(witnesses>20);
});

test('Gallery zone and guard counts, glazing physics and opposite-side finale remain explicit',()=>{
 const counts=[3,3,4,4,5,5,5,5,6,6];
 for(let n=1;n<=10;n++){const d=galleryEnvironmentMission(n);assert.equal(galleryExhibitClusters(n).length,counts[n-1]);assert(d.guards.length>=2&&d.guards.length<=(n===10?6:5));}
 const panes=galleryEnvironmentMission(6).props.filter(p=>p.kind.startsWith('galleryGlass'));assert.equal(panes.length,4);for(const p of panes){assert(PROP_KIT[p.kind].blocksMovement);assert.equal(PROP_KIT[p.kind].blocksVision,false);assert.equal(p.scale,p.collisionScale);}
 const finale=galleryEnvironmentMission(10);assert.equal(finale.entryEdge,'bottom');assert.equal(finale.exitEdge,'top');assert(Math.hypot(finale.objective!.x-finale.exitPosition!.x,finale.objective!.y-finale.exitPosition!.y)>20);
});

test('02-06 closed glass bay blocks player traversal while transmitting vision',()=>{
 const stage=compileStage(galleryEnvironmentMission(6));
 // Outside→inside crosses only the transparent western pane, not an opaque artwork.
 const a={x:2.5*TILE,y:6.2*TILE},b={x:4.85*TILE,y:6.2*TILE};
 assert.equal(clearSegment(a.x,a.y,b.x,b.y,stage.movementBlockers,BODY.playerRadius),false);
 assert.equal(clearSegment(a.x,a.y,b.x,b.y,stage.visionBlockers),true);
 const nav=buildNavigation(stage,BODY.playerRadius),path=findPath(nav,stage.playerSpawn.x,stage.playerSpawn.y,b.x,b.y);
 assert(path.length===0||Math.hypot(path.at(-2)!-b.x,path.at(-1)!-b.y)>BODY.playerRadius,'closed glazing must prevent an exact reachable interior goal');
});


test('Studio collection escape returns across the sculpture zone, with three readable large works',()=>{
 const d=galleryEnvironmentMission(3),s=compileStage(d),nav=buildNavigation(s,BODY.playerRadius);
 assert.equal(d.exitEdge,'left');
 assert.equal(d.props.filter(p=>p.visualAssetId==='gallery_sculpture_large').length,3);
 const p=findPath(nav,s.objective.x,s.objective.y,d.exitPosition!.x*TILE,d.exitPosition!.y*TILE);
 assert(p.length>=4,'objective must not escape immediately in the same room');
 let distance=0,last={x:s.objective.x,y:s.objective.y};
 for(let i=0;i<p.length;i+=2){distance+=Math.hypot(p[i]-last.x,p[i+1]-last.y);last={x:p[i],y:p[i+1]};}
 assert(distance/TILE>20,'studio escape must cross the collection and main studio');
 assert(d.escapeRoutes![0].points.some(p=>p.x>7&&p.x<17&&p.y>5&&p.y<17),'escape includes Model Studio');
});

test('Finale has exactly six distributed guards, with objective confirmer separate from roaming escape response',()=>{
 const d=galleryEnvironmentMission(10),s=compileStage(d),nav=buildNavigation(s,BODY.guardRadius);
 assert.equal(d.guards.length,6);
 assert.equal(d.guards.find(g=>g.id==='02-10-g5')!.theftRole,'objective');
 const escape=d.guards.find(g=>g.id==='02-10-g6')!;
 assert.equal(escape.theftRole,'roaming');assert(escape.x>=24&&escape.y>=11);
 assert.equal(d.guards.filter(g=>g.theftRole==='objective').length,1);
 assert(d.guards.some(g=>g.theftRole==='exit'));assert(d.guards.some(g=>g.theftRole==='corridor'));
 for(const g of d.guards)for(const p of g.theftPosts??[]){
  const path=findPath(nav,g.x*TILE,g.y*TILE,p.x*TILE,p.y*TILE);
  assert(path.length>=2&&Math.hypot(path.at(-2)!-p.x*TILE,path.at(-1)!-p.y*TILE)<.01,`${g.id}: theft post must be genuinely reachable`);
 }
});


test('Gallery revised entry/mid-mission escapes leave the stolen-work room through a real second zone',()=>{
 for(const mission of[1,2,3,4,7]){
  const d=galleryEnvironmentMission(mission),s=compileStage(d),zones=describeGalleryDesign(d).zones;
  const contains=(p:{x:number;y:number})=>zones.find(z=>p.x>=z.bounds.x&&p.x<z.bounds.x+z.bounds.w&&p.y>=z.bounds.y&&p.y<z.bounds.y+z.bounds.h);
  assert.notEqual(contains(d.objective!)?.id,contains(d.exitPosition!)?.id,`${d.id}: no immediate same-room escape`);
  const path=findPath(buildNavigation(s,BODY.playerRadius),s.objective.x,s.objective.y,d.exitPosition!.x*TILE,d.exitPosition!.y*TILE);
  assert(path.length>=2&&Math.hypot(path.at(-2)!-d.exitPosition!.x*TILE,path.at(-1)!-d.exitPosition!.y*TILE)<.01,`${d.id}: new exit reachable`);
 }
});

for(const baseline of (historicalJSON as StageDefinition[]).filter(d=>d.chapter===2))test(`${baseline.id} V3 authored circulation remains accessible, separated and repeatable`,()=>{
 const def=applyV3MuseumGallery(baseline),qa=auditV3MuseumGallery(def);
 if(def.id==='02-09'){assert.notDeepEqual(def.layout,baseline.layout,'courtyard changes actual silhouette');assert.equal(def.layout[22][15],' ','courtyard is actual exterior void');
  const stage=compileStage(def),nav=buildNavigation(stage,18);
  for(const point of [{x:11,y:21},{x:19,y:21}]){const path=findPath(nav,stage.playerSpawn.x,stage.playerSpawn.y,point.x*TILE,point.y*TILE);assert(path.length>=2&&Math.hypot(path.at(-2)!-point.x*TILE,path.at(-1)!-point.y*TILE)<.01,'both courtyard arms need actual radius18 access');}}
 else assert.deepEqual(def.layout,baseline.layout,'purposeful existing exhibition architecture is preserved');
 assert.deepEqual(applyV3MuseumGallery(def),def,'V3 authoring must be idempotent');
 assert.deepEqual(qa.issues,[]);assert(qa.entryExitDistance>6,'distinct portal departure');
 assert.deepEqual(JSON.parse(JSON.stringify(def)),(v3FinalJSON as StageDefinition[]).find(d=>d.id===def.id),'historical V3 circulation remains reproducible');
 if(def.id==='02-03')assert.equal(def.exitEdge,'top');
 if(def.id==='02-10'){
  assert.equal(def.exitEdge,'right');
  assert(def.escapeRoutes![0].points.some(p=>p.x>11&&p.x<23&&p.y>11&&p.y<20),'final escape includes atrium');
  assert(def.escapeRoutes![0].points.some(p=>p.x>24&&p.y>11),'final escape includes east gallery');
  assert.equal(def.landmark!.kind,'partition');assert.equal(def.landmark!.x,25.5);assert.equal(def.landmark!.y,5.8);
 }
});

test('V3 coverage axes execute through the semantic plan used by compileStage',()=>{
 for(const id of ['02-04','02-05','02-06','02-07','02-08','02-09','02-10']){
  const def=applyV3MuseumGallery((historicalJSON as StageDefinition[]).find(d=>d.id===id)!),stage=compileStage(def);
  for(const assignment of def.patrolPlan!.assignments.filter(a=>a.anchors.some(id=>id.includes('-V3-')))){
   const compiled=stage.guards.find(g=>g.id===assignment.guardId)!;
   const anchors=assignment.anchors.map(id=>def.patrolPlan!.anchors.find(a=>a.id===id)!);
   assert.deepEqual(compiled.route.map(p=>({x:p.x/TILE,y:p.y/TILE})),anchors.map(p=>({x:p.x,y:p.y})),'runtime must execute the authored coverage axis');
  }
 }
});

test('V3 unknown guardless rooms cannot acquire an automatic safety exemption or invented features',()=>{
 const source=applyV3MuseumGallery((historicalJSON as StageDefinition[]).find(d=>d.id==='02-05')!);
 const zone={name:'Unknown Room',bounds:{x:1,y:14,w:8,h:8},coveredByGuard:[],coveredByCCTV:[]};
 assert.equal(explicitV3SafetyIntent(source,zone),undefined);
 const empty={...source,props:[],guards:[],patrolRoutes:[],cameras:[],testRoutes:[],escapeRoutes:[],landmark:undefined,objective:undefined};
 assert.deepEqual(v3ZoneFeatures(empty,zone),[]);
 const intent=explicitV3SafetyIntent(source,{...zone,name:'Reception'});assert(intent?.reason);assert.deepEqual(intent.bounds,zone.bounds,'only the explicit calm reception permission covers the whole room');
 const bridge=applyV3MuseumGallery((historicalJSON as StageDefinition[]).find(d=>d.id==='01-07')!);
 assert.equal(v3MuseumGalleryDesign(bridge).zones.find(z=>z.name==='VIP Bridge')!.intentionalSafeReason,undefined,'exposed timing bridge is not a safe exemption');
});
