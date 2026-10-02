import {writeRuntimeCctvQA} from './museumRuntimeCctvQA';
import {guardPhysicalContract} from './guardPhysicalContract';
/** Sampled geometry evidence, not rendered-gap or human Tilt certification. */
import assert from 'node:assert/strict';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {PROP_KIT} from '../../src/game/world/propKit';
import {describeMuseumDesign,type MuseumDesignZone} from './museumFinalDesign';
import {auditHideability,structureRole} from './museumHideabilityQA';
import {CENTRAL_COVER_MOVES} from './museumCentralCover';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {GAIT_SPEED} from '../../src/game/core/locomotion';
import {DEFAULT_TILT} from '../../src/game/input/tilt';
export const TILT_SPARE_PER_SIDE=GAIT_SPEED[3]*DEFAULT_TILT.smoothing; // max-speed one smoothing-time overshoot proxy
export const MIN_COMFORT_GAP=2*(BODY.playerRadius+TILT_SPARE_PER_SIDE);
type P={x:number;y:number};
type Box={id:string;l:number;t:number;r:number;b:number};
const round=(v:number)=>Math.round(v*100)/100;
function pathDistance(nav:ReturnType<typeof buildNavigation>,a:P,b:P){const p=findPath(nav,a.x,a.y,b.x,b.y);if(p.length<2||Math.hypot(p.at(-2)!-b.x,p.at(-1)!-b.y)>.01)return null;let d=0,x=a.x,y=a.y;for(let i=0;i<p.length;i+=2){d+=Math.hypot(p[i]-x,p[i+1]-y);x=p[i];y=p[i+1];}return d;}
export function narrowGap(a:Box,b:Box){
 const result:{axis:'x'|'y';width:number;from:P;to:P}[]=[];
 for(const [left,right] of [[a,b],[b,a]]){
  const overlap=Math.min(left.b,right.b)-Math.max(left.t,right.t),width=right.l-left.r;
  if(width>2&&width<MIN_COMFORT_GAP-1e-6&&overlap>=8){const x=(right.l+left.r)/2;result.push({axis:'x',width,from:{x,y:Math.max(left.t,right.t)-18},to:{x,y:Math.min(left.b,right.b)+18}});}
  const horizontal=Math.min(left.r,right.r)-Math.max(left.l,right.l),height=right.t-left.b;
  if(height>2&&height<MIN_COMFORT_GAP-1e-6&&horizontal>=8){const y=(right.t+left.b)/2;result.push({axis:'y',width:height,from:{x:Math.max(left.l,right.l)-18,y},to:{x:Math.min(left.r,right.r)+18,y}});}
 }
 return result;
}
export function auditCentralCover(def:StageDefinition,design:{zones:MuseumDesignZone[]}=describeMuseumDesign(def)){
 const s=compileStage(def),nav=buildNavigation(s,BODY.playerRadius),hide=auditHideability(def,design);
 const boxes:Box[]=[];for(let i=0;i<s.movementBlockers.length;i+=4)boxes.push({id:`collision-${i/4}`,l:s.movementBlockers[i],t:s.movementBlockers[i+1],r:s.movementBlockers[i+2],b:s.movementBlockers[i+3]});
 const gaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)for(const g of narrowGap(boxes[i],boxes[j])){
  if(!clearSegment(g.from.x,g.from.y,g.to.x,g.to.y,s.movementBlockers,0))continue;
  const accessibleEnds=[g.from,g.to].filter(p=>clearSegment(p.x,p.y,p.x,p.y,s.movementBlockers,BODY.playerRadius)&&pathDistance(nav,s.playerSpawn,p)!==null).length;if(!accessibleEnds)continue;
  gaps.push({accessibleEnds,crossingOrBlindSlot:accessibleEnds===2?'CROSSING':'BLIND_SLOT',a:boxes[i].id,b:boxes[j].id,...g,width:round(g.width/TILE),from:{x:round(g.from.x/TILE),y:round(g.from.y/TILE)},to:{x:round(g.to.x/TILE),y:round(g.to.y/TILE)},bodyPassable:clearSegment(g.from.x,g.from.y,g.to.x,g.to.y,s.movementBlockers,BODY.playerRadius),classification:!clearSegment(g.from.x,g.from.y,g.to.x,g.to.y,s.movementBlockers,BODY.playerRadius)?'PHYSICAL_FAKE_GAP':'TILT_MARGIN_WARNING'});
 }
 const refs=[...hide.witnesses,...hide.architecturalRefuges].map(w=>({x:w.point.x*TILE,y:w.point.y*TILE}));
 const zones=design.zones.map(z=>{const regions=z.regions??[z.bounds];const inside=(p:P,central=false)=>regions.some(b=>{const inset=central?.225:0;return p.x>=b.x+b.w*inset&&p.x<b.x+b.w*(1-inset)&&p.y>=b.y+b.h*inset&&p.y<b.y+b.h*(1-inset);});let playableArea=0,centralArea=0;for(let y=0;y<s.rows;y+=.25)for(let x=0;x<s.cols;x+=.25){const p={x:x+.125,y:y+.125};if(inside(p)&&clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,s.movementBlockers,BODY.playerRadius)){playableArea+=.0625;if(inside(p,true))centralArea+=.0625;}}const covers=def.props.filter(p=>PROP_KIT[p.kind].blocksVision&&inside(p));const central=covers.filter(p=>inside(p,true)).length;return {id:z.id,name:z.name,centralLinearFraction:.55,playableArea,centralArea,edgeArea:playableArea-centralArea,centralCover:central,edgeCover:covers.length-central,fullCover:covers.filter(p=>structureRole(p.kind)==='FULL COVER').length,losBreakers:covers.filter(p=>structureRole(p.kind)==='LOS BREAKER').length,centralCoverageRatio:covers.length?round(central/covers.length):0,hideWitnesses:refs.filter(p=>inside({x:p.x/TILE,y:p.y/TILE})).length,exception:z.exception??null,warning:central===0&&!z.exception?'NO_CENTRAL_PROP_COVER':null};});
 const chain=refs.map((p,i)=>{const ds=refs.map((q,j)=>({q,d:i===j?null:pathDistance(nav,p,q)})).filter((v):v is {q:P;d:number}=>v.d!==null).sort((a,b)=>a.d-b.d);const target=ds[0]?.q;const path=target?findPath(nav,p.x,p.y,target.x,target.y):[];return {point:{x:p.x/TILE,y:p.y/TILE},nearestHidePoint:target?{x:target.x/TILE,y:target.y/TILE}:null,nearestHidePath:(target?[p.x,p.y,...path]:[]).filter((_,i)=>i%2===0).map((x,i)=>({x:x/TILE,y:(target?[p.x,p.y,...path]:[])[i*2+1]/TILE})),nearestHidePathTiles:ds.length?round(ds[0].d/TILE):null};});
 const anchors=s.guards.flatMap(g=>g.route.map(p=>({x:p.x,y:p.y,range:g.visionRange})));
 const routes=[...def.testRoutes??[],...def.escapeRoutes??[]].map(route=>{let longest=0,continuous=0;let currentPath:P[]=[],longestPath:P[]=[];const nearest:number[]=[];for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],length=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.ceil(length*4);for(let k=1;k<=steps;k++){const p={x:(a.x+(b.x-a.x)*k/steps)*TILE,y:(a.y+(b.y-a.y)*k/steps)*TILE};const visible=anchors.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<=q.range&&clearSegment(q.x,q.y,p.x,p.y,s.visionBlockers));continuous=visible?continuous+length/steps:0;currentPath=visible?[...currentPath,{x:p.x/TILE,y:p.y/TILE}]:[];if(continuous>longest){longest=continuous;longestPath=currentPath;}if(k%4===0){const ds=refs.map(q=>pathDistance(nav,p,q)).filter((d):d is number=>d!==null);if(ds.length)nearest.push(Math.min(...ds)/TILE);}}}return {name:route.name,maxPotentialExposureTiles:round(longest),maxPotentialExposurePath:longestPath,averageNearestHidePathTiles:nearest.length?round(nearest.reduce((a,b)=>a+b,0)/nearest.length):null};});
 const uniqueCovers=def.props.filter(p=>PROP_KIT[p.kind].blocksVision);
 const isCentral=(p:P)=>design.zones.some(z=>(z.regions??[z.bounds]).some(b=>p.x>=b.x+b.w*.225&&p.x<b.x+b.w*.775&&p.y>=b.y+b.h*.225&&p.y<b.y+b.h*.775));
 const centralCoverCount=uniqueCovers.filter(isCentral).length;
 const hideDistances=chain.map(c=>c.nearestHidePathTiles).filter((d):d is number=>d!==null);
 const routeHideDistances=routes.map(r=>r.averageNearestHidePathTiles).filter((d):d is number=>d!==null);
 return {id:def.id,centralCoverCount,edgeCoverCount:uniqueCovers.length-centralCoverCount,fakeGapCount:gaps.filter(g=>!g.bodyPassable).length,maxExposureDistance:Math.max(0,...routes.map(r=>r.maxPotentialExposureTiles)),nearestHideDistance:routeHideDistances.length?round(routeHideDistances.reduce((a,b)=>a+b,0)/routeHideDistances.length):null,hideToHideDistance:hideDistances.length?round(hideDistances.reduce((a,b)=>a+b,0)/hideDistances.length):null,centralCoverageWarning:zones.filter(z=>z.warning).map(z=>z.id),zones,gaps,physicalFakeGaps:gaps.filter(g=>!g.bodyPassable).length,tiltMarginWarnings:gaps.filter(g=>g.bodyPassable).length,hideChain:chain,averageHideToHidePathTiles:chain.some(p=>p.nearestHidePathTiles!==null)?round(chain.reduce((sum,p)=>sum+(p.nearestHidePathTiles??0),0)/chain.filter(p=>p.nearestHidePathTiles!==null).length):null,hidePoints:hide.hidePoints,escapePockets:hide.escapePockets,routeMetrics:routes,routeClearance:hide.routes,guardAnchors:hide.guards};
}
export function auditIslandBypasses(def:StageDefinition){
 const stage=compileStage(def);const r=BODY.playerRadius+TILT_SPARE_PER_SIDE;
 return (CENTRAL_COVER_MOVES[def.id]??[]).map(move=>{const prop=def.props.find(p=>p.kind===move.kind&&p.x===move.to[0]&&p.y===move.to[1])!;const spec=PROP_KIT[prop.kind],sc=prop.collisionScale??1,cx=prop.x*TILE,cy=(prop.y-spec.footprint.h*sc/2)*TILE,dx=spec.footprint.w*sc*TILE/2+r+.01,dy=spec.footprint.h*sc*TILE/2+r+.01;
 const p=(x:number,y:number)=>({x:cx+x*dx,y:cy+y*dy});
 const options=[[[p(0,-1),p(-1,-1),p(-1,1),p(0,1)],[p(0,-1),p(1,-1),p(1,1),p(0,1)]],[[p(-1,0),p(-1,-1),p(1,-1),p(1,0)],[p(-1,0),p(-1,1),p(1,1),p(1,0)]]];
 const result=options.map(paths=>({paths:paths.map(path=>path.map(q=>({x:q.x/TILE,y:q.y/TILE}))),bothClear:paths.every(path=>path.slice(1).every((b,i)=>clearSegment(path[i].x,path[i].y,b.x,b.y,stage.movementBlockers,r)))}));
 return {kind:prop.kind,point:{x:prop.x,y:prop.y},marginRadius:r,localTwoSideWitness:result.find(o=>o.bothClear)??null,warning:result.some(o=>o.bothClear)?null:'LOCAL_MARGIN_RING_BLOCKED_REVIEW_REQUIRED'};
 });
}
export function traceCentralChase(def:StageDefinition,input:{route:number;escape:number;mode:number;delay:number}){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;const entry=def.testRoutes![input.route].points,points=[...entry,...def.escapeRoutes![input.escape].points.slice(1)];let leg=1,seen=false,spotted=false,search=false;let observers:P[]=[];const breaks:{time:number;point:P;nearestMovedProp:string|null;distanceTiles:number|null;movedPropOccludesPriorObserver:boolean}[]=[];
 for(let f=0;f<9000&&!s.events.caught&&!s.mission.complete;f++){
 if(s.t>=input.delay){s.playerMode=leg>=entry.length?3:input.mode;s.player.tx=points[leg].x*TILE;s.player.ty=points[leg].y*TILE;s.player.hasTarget=true;}
 stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
 if(s.events.globalAlert)spotted=true;const sees=s.guards.some(g=>g.canSee);if(seen&&!sees&&spotted){const nearby=(CENTRAL_COVER_MOVES[def.id]??[]).map(m=>({m,d:Math.hypot(s.player.x/TILE-m.to[0],s.player.y/TILE-m.to[1])})).sort((a,b)=>a.d-b.d)[0];const prop=nearby?def.props.find(p=>p.kind===nearby.m.kind&&p.x===nearby.m.to[0]&&p.y===nearby.m.to[1]):null;let occludes=false;if(prop){const kit=PROP_KIT[prop.kind],sc=prop.collisionScale??1,x=prop.x*TILE,y=prop.y*TILE,box=[x-kit.footprint.w*sc*TILE/2,y-kit.footprint.h*sc*TILE,x+kit.footprint.w*sc*TILE/2,y];occludes=observers.some(o=>!clearSegment(o.x,o.y,s.player.x,s.player.y,box));}breaks.push({movedPropOccludesPriorObserver:occludes,time:round(s.t),point:{x:round(s.player.x/TILE),y:round(s.player.y/TILE)},nearestMovedProp:nearby?.m.kind??null,distanceTiles:nearby?round(nearby.d):null});}seen=sees;observers=s.guards.filter(g=>g.canSee).map(g=>({x:g.x,y:g.y}));if(spotted&&s.events.phase==='SEARCH')search=true;
 if(s.t>=input.delay&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
 }
 return {...input,clear:s.mission.complete,caught:s.events.caught,spotted,search,breaks,time:round(s.t)};
}
export function findCentralChaseWitness(def:StageDefinition){const attempts:ReturnType<typeof traceCentralChase>[]=[];for(const delay of [0,3,6])for(const mode of [1,2,3])for(const escape of [0,1]){if(escape>=def.escapeRoutes!.length)continue;for(const route of [0,1]){const r=traceCentralChase(def,{route,escape,mode,delay});attempts.push(r);if(r.spotted&&r.search&&r.clear&&r.breaks.some(b=>(b.distanceTiles??Infinity)<3))return {witness:r,attempts};}}const candidates=attempts.filter(r=>r.spotted&&r.search&&r.breaks.length).sort((a,b)=>(Number(b.clear)*10+Number(b.breaks.some(p=>(p.distanceTiles??Infinity)<3))*5)-(Number(a.clear)*10+Number(a.breaks.some(p=>(p.distanceTiles??Infinity)<3))*5));return {witness:candidates[0]??null,attempts};}
export function auditCentralPatrol(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage),metrics=s.guards.map(g=>({id:g.id,visited:new Set<number>(),collisionFrames:0,recoveries:0}));
 for(let f=0;f<7200;f++){stepGuards(s.guards,{x:-9999,y:-9999,gait:0},stage.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);s.guards.forEach((g,i)=>{assert([g.x,g.y,g.facing,g.speed].every(Number.isFinite));const m=metrics[i];if(!clearSegment(g.x,g.y,g.x,g.y,nav.blockers,BODY.guardRadius))m.collisionFrames++;m.recoveries=g.patrolRecoveries;g.route.forEach((p,j)=>{if(Math.hypot(g.x-p.x,g.y-p.y)<10)m.visited.add(j);});});}
 return metrics.map((m,i)=>({id:m.id,seconds:120,visited:m.visited.size,total:s.guards[i].route.length,collisionFrames:m.collisionFrames,recoveries:m.recoveries,pass:m.visited.size===s.guards[i].route.length&&m.collisionFrames===0&&m.recoveries===0}));
}
export function assertCentralProtected(a:StageDefinition,b:StageDefinition){for(const key of ['layout','playerSpawn','objective','exit','guards','patrolRoutes','testRoutes','escapeRoutes','patrolPlan','securityZones'] as const)assert.deepEqual(key==='guards'?guardPhysicalContract(b.guards):b[key],key==='guards'?guardPhysicalContract(a.guards):a[key],`${b.id}: protected ${key}`);}
export function writeCentralCoverQA(){return writeRuntimeCctvQA();}
if(process.argv[1]?.endsWith('museumCentralCoverQA.ts'))writeCentralCoverQA();

/** Continuous custom approach→natural alert→run to verified cover. No state forcing. */
export type CentralHideScenario={structure:number;point:P;approach:P;delay:number;gait:number;pocketChoice:number};
export function probeCentralHideRoutes(def:StageDefinition,expanded=false,selected?:CentralHideScenario){
 const stage=compileStage(def),playerNav=buildNavigation(stage,BODY.playerRadius),guardNav=buildNavigation(stage,BODY.guardRadius),h=auditHideability(def);
 let witnesses:{structure:number;point:P;approach:P|null}[]=h.witnesses.filter(w=>(CENTRAL_COVER_MOVES[def.id]??[]).some(m=>def.props[w.structure].x===m.to[0]&&def.props[w.structure].y===m.to[1])&&w.approach);
 if(expanded)for(const move of CENTRAL_COVER_MOVES[def.id]??[]){const structure=def.props.findIndex(p=>p.kind===move.kind&&p.x===move.to[0]&&p.y===move.to[1]);const p=def.props[structure],kit=PROP_KIT[p.kind],sc=p.collisionScale??1,cx=p.x*TILE,cy=(p.y-kit.footprint.h*sc/2)*TILE,rx=kit.footprint.w*sc*TILE/2+BODY.playerRadius+8,ry=kit.footprint.h*sc*TILE/2+BODY.playerRadius+8;
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const hide={x:cx+dx*rx,y:cy+dy*ry},approach={x:cx-dx*(rx+TILE),y:cy-dy*(ry+TILE)};if(![hide,approach].every(q=>clearSegment(q.x,q.y,q.x,q.y,stage.movementBlockers,BODY.playerRadius)&&pathDistance(playerNav,stage.playerSpawn,q)!==null))continue;witnesses.push({structure,point:{x:hide.x/TILE,y:hide.y/TILE},approach:{x:approach.x/TILE,y:approach.y/TILE}});}
 }
 if(selected)witnesses=[selected];
 const delays=selected?[selected.delay]:expanded?Array.from({length:16},(_,i)=>i):[0,3,6,9],gaits=selected?[selected.gait]:expanded?[3,2]:[1,2,3],pocketChoices=selected?[selected.pocketChoice]:expanded?[0,1]:[0];
 const attempts=[];
 for(const w of witnesses)for(const delay of delays)for(const gait of gaits)for(const pocketChoice of pocketChoices){
  const s=createPlaygroundState(stage),prop=def.props[w.structure],spec=PROP_KIT[prop.kind],sc=prop.collisionScale??1,x=prop.x*TILE,y=prop.y*TILE,box=[x-spec.footprint.w*sc*TILE/2,y-spec.footprint.h*sc*TILE,x+spec.footprint.w*sc*TILE/2,y];
  const hidePoint={x:w.point.x*TILE,y:w.point.y*TILE},approach={x:w.approach!.x*TILE,y:w.approach!.y*TILE};
  let path=findPath(playerNav,s.player.x,s.player.y,approach.x,approach.y),index=0,flee=false,spottedAt:number|null=null,searchAt:number|null=null,arrivedAt:number|null=null,causalAt:number|null=null,causalPoint:P|null=null;
  let runStartedAt:number|null=null;
  let invalidPath=path.length<2||Math.hypot(path.at(-2)!-approach.x,path.at(-1)!-approach.y)>.01;
  let priorObservers:(P&{id:string})[]=[],lastVisibleAt=-Infinity,wiggle=0;let pocket:P|null=null,goal=hidePoint;let previousPhase=s.events.phase;const transitions:{time:number;from:string;to:string}[]=[];let causalObserver:string|null=null,causalLinePoint:P|null=null;let searchAfterCoverAt:number|null=null,causalLineAt:number|null=null;
  for(let f=0;f<3600&&!s.events.caught&&!invalidPath;f++){
   if(s.events.globalAlert&&!flee){flee=true;runStartedAt=s.t;path=findPath(playerNav,s.player.x,s.player.y,hidePoint.x,hidePoint.y);index=0;invalidPath=path.length<2||Math.hypot(path.at(-2)!-hidePoint.x,path.at(-1)!-hidePoint.y)>.01;if(invalidPath)break;}
   if(s.t>=delay){
    while(index<path.length&&Math.hypot(s.player.x-path[index],s.player.y-path[index+1])<2)index+=2;
    if(index<path.length){s.playerMode=flee?3:gait;s.player.tx=path[index];s.player.ty=path[index+1];s.player.hasTarget=true;}
    else if(flee){if(Math.hypot(s.player.x-goal.x,s.player.y-goal.y)>=2){invalidPath=true;break;}arrivedAt??=s.t;
     if(!pocket){const options=h.architecturalRefuges.map(w=>({x:w.point.x*TILE,y:w.point.y*TILE})).map(p=>({p,d:pathDistance(playerNav,goal,p)})).filter((v):v is {p:P;d:number}=>v.d!==null&&v.d>TILE).sort((a,b)=>a.d-b.d);pocket=options[pocketChoice]?.p??options[0]?.p??null;if(pocket){goal=pocket;path=findPath(playerNav,s.player.x,s.player.y,goal.x,goal.y);index=0;invalidPath=path.length<2||Math.hypot(path.at(-2)!-goal.x,path.at(-1)!-goal.y)>.01;if(invalidPath)break;s.playerMode=3;}else{s.playerMode=0;s.player.hasTarget=false;}}
     else{s.playerMode=0;s.player.hasTarget=false;}
    }
    else{wiggle++;const candidate={x:approach.x+(wiggle%2?16:-16),y:approach.y};path=findPath(playerNav,s.player.x,s.player.y,candidate.x,candidate.y);index=0;invalidPath=path.length<2||Math.hypot(path.at(-2)!-candidate.x,path.at(-1)!-candidate.y)>.01;if(invalidPath)break;s.playerMode=gait;}
   }else{s.playerMode=0;s.player.hasTarget=false;}
   stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,guardNav);
   if(s.events.phase==='PLAYER_SPOTTED')spottedAt??=s.t;
   const observers=s.guards.filter(g=>g.canSee).map(g=>({id:g.id,x:g.x,y:g.y}));
   const observerPositions=priorObservers.map(o=>s.guards.find(g=>g.id===o.id)!).filter(Boolean);
   const blockingObserver=observerPositions.find(o=>!clearSegment(o.x,o.y,s.player.x,s.player.y,box));if(flee&&priorObservers.length&&!observers.length&&s.t-lastVisibleAt<=.5&&blockingObserver&&causalLineAt===null){causalLineAt=s.t;causalObserver=blockingObserver.id;causalLinePoint={x:round(s.player.x/TILE),y:round(s.player.y/TILE)};}
   if(flee&&priorObservers.length&&!observers.length&&s.t-lastVisibleAt<=.5&&observerPositions.some(o=>[[0,0],[BODY.playerRadius,0],[-BODY.playerRadius,0],[0,BODY.playerRadius],[0,-BODY.playerRadius]].every(([dx,dy])=>!clearSegment(o.x,o.y,s.player.x+dx,s.player.y+dy,box)))){causalAt??=s.t;causalPoint??={x:round(s.player.x/TILE),y:round(s.player.y/TILE)};}
   if(observers.length){priorObservers=observers;lastVisibleAt=s.t;}
   if(flee&&s.events.phase==='SEARCH')searchAt??=s.t;
   if(spottedAt!==null&&causalLineAt!==null&&spottedAt<=causalLineAt&&s.events.phase==='SEARCH'&&previousPhase!=='SEARCH')searchAfterCoverAt??=s.t;
   if(previousPhase!==s.events.phase)transitions.push({time:round(s.t),from:previousPhase,to:s.events.phase});previousPhase=s.events.phase;
   if(causalLineAt!==null&&searchAfterCoverAt!==null)break;
  }
  const result={structure:w.structure,kind:prop.kind,prop:{x:prop.x,y:prop.y},hidePoint:w.point,approach:w.approach,delay,gait,pocketChoice,spottedAt,runStartedAt,arrivedAt,causalAt,causalPoint,causalLineAt,causalObserver,causalLinePoint,transitions,searchAt,searchAfterCoverAt,caught:s.events.caught,caughtBy:s.events.caughtBy,time:round(s.t),pocket:pocket?{x:pocket.x/TILE,y:pocket.y/TILE}:null,invalidPath,pass:!invalidPath&&!s.events.caught&&spottedAt!==null&&causalLineAt!==null&&searchAfterCoverAt!==null};attempts.push(result);if(result.pass)return {id:def.id,witness:result,attempts};
 }
 return {id:def.id,witness:null,attempts};
}
