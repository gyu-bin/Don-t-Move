/** Offline actual collider/LOS/nav audit; excludes artistic and human Tilt acceptance. */
import {mkdirSync,writeFileSync} from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {galleryEnvironmentMission,galleryExhibitClusters,describeGalleryDesign} from './galleryEnvironmentDesign';
import {auditHideability} from './museumHideabilityQA';
import {auditCentralCover,TILT_SPARE_PER_SIDE} from './museumCentralCoverQA';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {PROP_KIT} from '../../src/game/world/propKit';
import {BODY} from '../../src/game/guards/guardTuning';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
const radius=BODY.playerRadius+TILT_SPARE_PER_SIDE;
export function auditGalleryArchitecture(def:StageDefinition){
 const design=describeGalleryDesign(def),stage=compileStage(def),nav=buildNavigation(stage,BODY.playerRadius);
 const hide=auditHideability(def,design),central=auditCentralCover(def,design);
 const clusters=galleryExhibitClusters(def.mission!).map(c=>{
  const prop=def.props.find(p=>Math.abs(p.x-c.central.x)<.001&&Math.abs(p.y-c.central.y)<.001)!,spec=PROP_KIT[prop.kind],scale=prop.collisionScale??1;
  const x=prop.x*TILE,y=(prop.y-spec.footprint.h*scale/2)*TILE,dx=spec.footprint.w*scale*TILE/2+radius+.01,dy=spec.footprint.h*scale*TILE/2+radius+.01;
  const ring=[{x:x-dx,y:y-dy},{x:x+dx,y:y-dy},{x:x+dx,y:y+dy},{x:x-dx,y:y+dy}];
  const localTwoSide=ring.every((a,i)=>{const b=ring[(i+1)%4];return clearSegment(a.x,a.y,b.x,b.y,stage.movementBlockers,radius);});
  const reaches=(p:{x:number;y:number})=>{const path=findPath(nav,stage.playerSpawn.x,stage.playerSpawn.y,p.x,p.y);return path.length>=2&&Math.hypot(path.at(-2)!-p.x,path.at(-1)!-p.y)<.01;};
  const ownBox=[x-spec.footprint.w*scale*TILE/2,y-spec.footprint.h*scale*TILE/2,x+spec.footprint.w*scale*TILE/2,y+spec.footprint.h*scale*TILE/2];
  // Synthetic directional probe proves the isolated prop can occlude a full body; not a real patrol witness.
  let syntheticFullBodyWitness:null|{point:{x:number;y:number};probe:{x:number;y:number}}=null;
  for(let n=0;n<16&&!syntheticFullBodyWitness;n++){
   const a=n*Math.PI/8,probe={x:x+Math.cos(a)*3*TILE,y:y+Math.sin(a)*3*TILE},p={x:x-Math.cos(a)*dx,y:y-Math.sin(a)*dy};
   if(!clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.playerRadius)||!reaches(p))continue;
   if([[0,0],[9,0],[-9,0],[0,9],[0,-9]].every(([ox,oy])=>!clearSegment(probe.x,probe.y,p.x+ox,p.y+oy,ownBox)))syntheticFullBodyWitness={point:{x:p.x/TILE,y:p.y/TILE},probe:{x:probe.x/TILE,y:probe.y/TILE}};
  }
  const zoneHide=hide.zones.find(z=>z.id===c.id)!;
  // Declared central + perimeter exhibit groups; this is not a measured artistic acceptance count.
  return {id:c.id,name:c.name,centralAsset:prop.visualAssetId,central:{x:prop.x,y:prop.y},area:c.bounds.w*c.bounds.h,edgeCover:def.props.filter(p=>PROP_KIT[p.kind].blocksVision&&p.x>=c.bounds.x&&p.x<c.bounds.x+c.bounds.w&&p.y>=c.bounds.y&&p.y<c.bounds.y+c.bounds.h&&(p.x<c.bounds.x+c.bounds.w*.225||p.x>c.bounds.x+c.bounds.w*.775||p.y<c.bounds.y+c.bounds.h*.225||p.y>c.bounds.y+c.bounds.h*.775)).length,authoredExhibitGroupCount:2,localTwoSide,syntheticFullBodyWitness,actualAnchorHidePoints:zoneHide.hidePoints,actualAnchorEscapePockets:zoneHide.escapePockets};
 });
 const glass=def.props.filter(p=>p.kind.startsWith('galleryGlass')).map(p=>({kind:p.kind,x:p.x,y:p.y,scale:p.scale,collisionScale:p.collisionScale,collision:PROP_KIT[p.kind].blocksMovement,los:PROP_KIT[p.kind].blocksVision?'BLOCK':'PASS'}));
 const routeDistance=(r:NonNullable<StageDefinition['testRoutes']>[number])=>r.points.slice(1).reduce((d,p,i)=>d+Math.hypot(p.x-r.points[i].x,p.y-r.points[i].y),0);
 const objective=def.objective!,exit=def.exitPosition!,shortest=findPath(nav,objective.x*TILE,objective.y*TILE,exit.x*TILE,exit.y*TILE);let shortestEscape=0,last={x:objective.x*TILE,y:objective.y*TILE};for(let i=0;i<shortest.length;i+=2){shortestEscape+=Math.hypot(shortest[i]-last.x,shortest[i+1]-last.y);last={x:shortest[i],y:shortest[i+1]};}
 return {id:def.id,design,clusters,hide,central,glass,guards:def.guards.length,movableWalls:def.props.filter(p=>p.visualAssetId==='gallery_movable_art_wall').length,sculptures:def.props.filter(p=>p.visualAssetId==='gallery_sculpture_large').length,installations:def.props.filter(p=>p.visualAssetId==='gallery_installation_art').length,landmark:def.landmark,routes:[...def.testRoutes??[],...def.escapeRoutes??[]].map(r=>({name:r.name,distanceTiles:routeDistance(r)})),shortestEscapeTiles:shortestEscape/TILE,oppositeExit:def.entryEdge==='bottom'&&def.exitEdge==='top',nativeVerification:false};
}
export function writeGalleryArchitectureQA(){const missions=Array.from({length:10},(_,i)=>auditGalleryArchitecture(galleryEnvironmentMission(i+1)));mkdirSync('Reports/GalleryArchitectureV2',{recursive:true});writeFileSync('Reports/GalleryArchitectureV2/geometry-qa.json',JSON.stringify({method:['Actual compileStage/LOS/nav. Body9px + Tilt spare9px for central bypass rings.','Hide witnesses: five body rays occluded from an actual patrol anchor in range; reachable by actual player radius.','Synthetic witness is separately labelled and does not certify guard timing or survival.','Static potential exposure combines patrol anchors without facing/time.','User Tilt, native FPS and artistic overlap remain pending.'],missions},null,2)+'\n');return missions;}
if(process.argv[1]?.endsWith('galleryArchitectureQA.ts'))for(const m of writeGalleryArchitectureQA())console.log(JSON.stringify({id:m.id,central:m.clusters.length,twoSide:m.clusters.every(c=>c.localTwoSide),synthetic:m.clusters.every(c=>c.syntheticFullBodyWitness),hide:m.hide.hidePoints,pockets:m.hide.escapePockets,fake:m.central.fakeGapCount,tilt:m.central.tiltMarginWarnings,escape:m.shortestEscapeTiles}));
