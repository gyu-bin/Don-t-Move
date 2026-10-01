/** Data-only V5 composition. Apply after V3; no live system contracts are changed. */
import type {StageDefinition,PropDef,PatrolPoint} from '../../src/game/levels/StageDefinition';
import type {EnvironmentAssetId} from '../../src/assets/environmentKit';
import type {V3MissionDesign} from './v3DesignSchema';
import {V5_MG_PLANS,type Point,type V5MGPlan} from './v5MuseumGalleryPlans';
import {v3MuseumGalleryDesign} from './v3MuseumGallery';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,findPath,clearSegment,nodeX,nodeY} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {PROP_KIT} from '../../src/game/world/propKit';
export const V5_MG_REDESIGNED_IDS=Object.keys(V5_MG_PLANS);
const pt=(x:number,y:number):Point=>({x,y});
function layout(plan:V5MGPlan){
 const rectangles=[...plan.rooms.map(r=>[r.x,r.y,r.w,r.h]),...plan.links],width=Math.max(...rectangles.map(r=>r[0]+r[2]))+2,height=Math.max(...rectangles.map(r=>r[1]+r[3]))+2,floor=new Set<string>();
 for(const [x,y,w,h]of rectangles)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)floor.add(`${xx},${yy}`);
 for(const [x,y,w,h]of plan.holes??[])for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)floor.delete(`${xx},${yy}`);
 return Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>floor.has(`${x},${y}`)?'.':[-1,0,1].some(dy=>[-1,0,1].some(dx=>floor.has(`${x+dx},${y+dy}`)))?'#':' ').join(''));
}
/** Navigation expands explicitly chosen cells only; it never invents room purposes or placement. */
export function v5MGRoute(def:StageDefinition,via:Point[],radius=18){
 const s=compileStage(def),nav=buildNavigation(s,radius),out=[via[0]];
 for(const b of via.slice(1)){const a=out.at(-1)!;
  if(clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,s.movementBlockers,radius))out.push(b);
  else{const route=findPath(nav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);if(route.length<2||Math.hypot(route.at(-2)!/TILE-b.x,route.at(-1)!/TILE-b.y)>.01)throw Error(`${def.id}: V5 inaccessible authored point ${b.x},${b.y} from ${a.x},${a.y}`);for(let i=0;i<route.length;i+=2){const q=pt(route[i]/TILE,route[i+1]/TILE);if(Math.hypot(q.x-out.at(-1)!.x,q.y-out.at(-1)!.y)>.01)out.push(q);}}
 }
 return out;
}
const museumAsset:Partial<Record<PropDef['kind'],EnvironmentAssetId>>={pillar:'museum_column',partition:'museum_partition',displayCase:'museum_display_case_large',statue:'museum_statue_large',counter:'museum_security_desk',table:'museum_display_low',statuePedestal:'museum_pedestal',diamondPedestal:'museum_pedestal',painting:'museum_painting',objectiveCase:'museum_diamond_case',equipment:'museum_security_desk',shelf:'museum_display_case_large',sofa:'museum_display_low'};
/** The old blue equipment is a generic vector fixture. Explicit approved artwork keeps its existing physics. */
function presentation(def:StageDefinition){
 for(const p of def.props){
  const family=def.chapter===1?'museum_':'gallery_';
  if(p.visualAssetId&&!p.visualAssetId.startsWith(family))throw Error(`${def.id}: foreign V5 asset ${p.visualAssetId}`);
  if(def.chapter===1&&museumAsset[p.kind])p.visualAssetId=museumAsset[p.kind];
 }
 def.dressing=def.dressing?.map(c=>({...c,items:c.items.filter(i=>!i.visualAssetId||i.visualAssetId.startsWith(def.chapter===1?'museum_':'gallery_'))}));
 const goal=def.objective!;
 const target=def.props.find(p=>p.kind==='objectiveCase');
 if(target){target.visualAssetId=def.chapter===1?'museum_diamond_case':'gallery_low_pedestal';target.scale=def.chapter===1?1.5:1.9;target.x=goal.x;target.y=goal.y-.05;}
 // A lower warm spotlight avoids washing the case white. Cyan names the objective,
 // rather than raising every room's light to a flat white field.
 def.lights=def.lights.filter(l=>Math.hypot(l.x-goal.x,l.y-goal.y)>2.3);
 def.lights.push({x:goal.x,y:goal.y,radius:2.7,kind:'cyan',intensity:.72},{x:goal.x-1.3,y:goal.y-1.8,radius:3.3,kind:'warm',intensity:.48});
}
export function applyV5MuseumGallery(source:StageDefinition):StageDefinition{
 if(source.chapter!==1&&source.chapter!==2)return source;
 const def=structuredClone(source),plan=V5_MG_PLANS[def.id];
 if(!plan){presentation(def);return def;}
 def.layout=layout(plan);def.structurePlan=plan.fantasy+' | '+plan.rooms.map(r=>`${r.name}: ${r.purpose}`).join(' → ');
 def.entryPosition={...plan.entry};def.exitPosition={...plan.exit};def.entryEdge=plan.entrySide;def.exitEdge=plan.exitSide;def.playerSpawn={...plan.entry,facing:plan.entrySide==='left'?0:plan.entrySide==='right'?Math.PI:plan.entrySide==='top'?Math.PI/2:-Math.PI/2};
 def.objective={kind:source.objective!.kind,...plan.goal};def.exit={x:plan.exit.x-.6,y:plan.exit.y-.6,w:1.2,h:1.2};
 def.props=plan.props.map(p=>({kind:p.kind,visualAssetId:p.asset,x:p.x,y:p.y,scale:p.scale,collisionScale:p.scale}));
 def.props.push({kind:'objectiveCase',x:plan.goal.x,y:plan.goal.y-.05,visualAssetId:def.chapter===1?'museum_diamond_case':'gallery_low_pedestal',scale:def.chapter===1?1.5:1.9});
 if(def.chapter===2){
  // A real masterpiece wall stands behind the interaction plinth. Goal remains
  // accessible from the south; this physical screen is a named objective context.
  def.props.push({kind:'partition',visualAssetId:'gallery_masterpiece_wall',x:plan.goal.x,y:plan.goal.y-1.1,scale:2,collisionScale:2});
 }
 def.dressing=[];def.carpets=[];def.patrolPlan=undefined;def.guards=[];def.patrolRoutes=[];def.securityZones=[];def.safeZones=[{...plan.entry,radius:.45}];
 def.lights=plan.props.filter(p=>p.asset.includes('statue')||p.asset.includes('sculpture')||p.asset.includes('installation')).map(p=>({x:p.x,y:p.y-1,radius:3.2,kind:'warm' as const,intensity:.46}));def.ambientDarkness=def.chapter===1?.29:.21;
 // 02-06 glazed island: three framed, transparent-to-LOS sides. Opaque end
 // plinths provide genuine cover; glass never silently behaves as a full cover.
 if(def.id==='02-06'){
  def.props.push({kind:'galleryGlassPanel',x:15.5,y:10.3,scale:4/1.4,collisionScale:4/1.4},{kind:'galleryGlassPanel',x:15.5,y:14.3,scale:4/1.4,collisionScale:4/1.4},{kind:'galleryGlassPanelVertical',x:13.5,y:14.3,scale:4/1.4,collisionScale:4/1.4},{kind:'galleryGlassPanelVertical',x:17.5,y:14.3,scale:4/1.4,collisionScale:4/1.4});
 }
 def.cameras=(plan.cameras??[]).map((c,i)=>({id:`${def.id}-cam${i+1}`,x:c.x,y:c.y,centerFacing:c.look,sweepAngle:.5,sweepSpeed:.35,pauseAtEnds:.6,range:4.7,visionAngle:.65,suspicionRate:.4}));
 for(const [i,guard]of plan.guards.entries()){
  const inherited=source.guards[Math.min(i,source.guards.length-1)],id=`${def.id}-g${i+1}`,first=guard.points[0],next=guard.points[1],points=v5MGRoute(def,[...guard.points,first],BODY.guardRadius).slice(0,-1);
  const route:PatrolPoint[]=points.map((q,j)=>({...q,waitDuration:guard.points.some(p=>Math.hypot(p.x-q.x,p.y-q.y)<.01)?guard.role==='objective'?2.2:.8:0,lookDirection:guard.role==='objective'?Math.atan2(plan.goal.y-q.y,plan.goal.x-q.x):Math.atan2((points[j+1]??first).y-q.y,(points[j+1]??first).x-q.x),turnDuration:1.1}));
  def.guards.push({id,routeId:id,...first,role:guard.role,theftRole:guard.role==='room'?'zone':guard.role,pace:inherited.pace??.8,visionRange:inherited.visionRange??3.8,visionHalfAngle:inherited.visionHalfAngle??Math.PI/6,startDelay:i*.8,facing:Math.atan2(next.y-first.y,next.x-first.x),initialFacing:Math.atan2(next.y-first.y,next.x-first.x),theftPosts:guard.points});
  def.patrolRoutes.push({id,mode:'loop',points:route});def.securityZones.push({name:guard.zone,...first,radius:inherited.visionRange??3.8,guardId:id});
 }
 def.objectiveZone={guardId:def.guards.find(g=>g.role==='objective')!.id,spotlight:true};
 def.testRoutes=[{name:'main: '+plan.fantasy,points:v5MGRoute(def,[plan.entry,...plan.main,plan.goal])},{name:'safe: cover-chain viewing shoulders',points:v5MGRoute(def,[plan.entry,...plan.safe,plan.goal])},{name:'risk: exposed direct artwork crossing',points:v5MGRoute(def,[plan.entry,...plan.risk,plan.goal])}];
 def.escapeRoutes=[{name:'escape: '+plan.shape,points:v5MGRoute(def,[plan.goal,...plan.escape,plan.exit])},{name:'escape: alternate cell shoulders',points:v5MGRoute(def,[plan.goal,...plan.alternate,plan.exit])}];
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),candidates=nav.walkable.flatMap((v,i)=>v?[pt(nodeX(nav,i)/TILE,nodeY(nav,i)/TILE)]:[]);
 const searchAnchors=plan.rooms.map(r=>{
  // Choose each room's authored traversable threshold from authored route points.
  // For disconnected sculpture interiors use nearest valid floor, never Player.
  const cx=r.x+r.w/2,cy=r.y+r.h/2;
  return candidates.filter(p=>{if(!(p.x>r.x+.7&&p.x<r.x+r.w-.7&&p.y>r.y+.7&&p.y<r.y+r.h-.7))return false;const path=findPath(nav,plan.entry.x*TILE,plan.entry.y*TILE,p.x*TILE,p.y*TILE);return path.length>=2&&Math.hypot(path.at(-2)!-p.x*TILE,path.at(-1)!-p.y*TILE)<.1;}).sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy))[0];
 }).filter((p):p is Point=>!!p);
 for(const [i,g]of def.guards.entries())g.theftSearchSectors=[{id:`${g.id}: adjacent ${plan.guards[i].zone} and junction sweep`,anchors:searchAnchors.map((_,j)=>searchAnchors[(j+i)%searchAnchors.length])},{id:`${g.id}: objective / escape recheck`,anchors:[plan.goal,plan.exit]}];
 for(const p of plan.hide)if(clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,stage.movementBlockers,18))def.safeZones.push({...p,radius:.35});
 const landmark=def.chapter===2?def.props.find(p=>p.visualAssetId==='gallery_masterpiece_wall')!:def.props.find(p=>p.kind==='objectiveCase')!;
 def.landmark={name:def.chapter===1?'Featured collection case':'Masterpiece and premium display plinth',kind:landmark.kind,x:landmark.x,y:landmark.y};
 presentation(def);return def;
}
export function describeV5MuseumGallery(def:StageDefinition):V3MissionDesign{
 const plan=V5_MG_PLANS[def.id];
 if(!plan){const result=v3MuseumGalleryDesign(def);result.changes=['Architecture retained after visual audit; approved chapter-family fixture and objective local lighting correction'];return result;}
 return {id:def.id,missionFantasy:plan.fantasy,architecture:def.structurePlan!,topology:{entrySide:plan.entrySide,objectiveRegion:plan.rooms.find(r=>plan.goal.x>=r.x&&plan.goal.x<r.x+r.w&&plan.goal.y>=r.y&&plan.goal.y<r.y+r.h)!.name,exitSide:plan.exitSide,routeShape:plan.shape,escapeDirection:plan.exitSide},entry:plan.entry,objective:plan.goal,exit:plan.exit,zones:plan.rooms.map((r,i)=>({id:`${def.id}-v5-z${i+1}`,name:r.name,bounds:{x:r.x,y:r.y,w:r.w,h:r.h},purpose:[r.purpose],features:[...(plan.guards.some(g=>g.zone===r.name)?['security-pressure' as const]:[]),...(r.purpose==='objective'?['objective' as const,'landmark' as const]:['meaningful-traversal' as const]),...(plan.props.some(p=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h&&PROP_KIT[p.kind].cover)?['cover-interaction' as const]:[])],guardIds:plan.guards.flatMap((g,j)=>g.zone===r.name?[def.guards[j].id]:[]),cameraIds:(plan.cameras??[]).flatMap((c,j)=>c.zone===r.name?[def.cameras![j].id]:[]),...(r.safeReason?{intentionalSafeReason:r.safeReason,intentionalSafeBounds:{x:Math.max(r.x,plan.entry.x-.65),y:Math.max(r.y,plan.entry.y-.65),w:1.3,h:1.3}}:{})})),landmark:{name:def.landmark!.name,point:def.objective!,relation:'objective',reason:'Case/plinth, named artwork chamber, focused cyan+warm light and objective-inspection patrol form one composition'},coverChain:plan.props.filter(p=>PROP_KIT[p.kind].cover).map(p=>({name:p.asset,point:p,reason:p.reason})),guardRoles:plan.guards.map((g,i)=>({id:def.guards[i].id,role:g.role,zones:[g.zone]})),cctv:(plan.cameras??[]).map((c,i)=>({id:def.cameras![i].id,mountContext:`Architectural corner: ${c.zone}`,counterplay:'0.6s sweep-end pause; cover shoulders and alternate zone branch'})),searchSectors:def.guards.map(g=>({guardId:g.id,zones:plan.rooms.map(r=>r.name)})),structureReasons:[...plan.props.map(p=>({kind:p.kind,point:p,reason:p.reason})),...def.props.filter(p=>p.kind==='objectiveCase'||p.visualAssetId==='gallery_masterpiece_wall').map(p=>({kind:p.kind,point:p,reason:'Objective-support: premium case/plinth and the directly associated featured masterpiece'}))],changes:['Room silhouette and zone graph rebuilt before exhibit placement','Entry/objective/exit changed into independently readable phases','Major central exhibits form actual two-sided cover/traversal cells','Guard routes and search sectors follow named exhibition/security subjects'],baselineFailures:['Actual baseline visual review: broad/repeated floor composition or mission/place mismatch','Objective isolated or washed out instead of a chamber focal point']};
}
