/** Offline authoring compiler: explicit room graphs to runtime geometry. No runtime AI tuning. */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import type {V124bPlan,V124bRoom,V124bEdge,Point} from './v124bTypes';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {v12Layout} from './v12Runtime';
import {doorRect} from '../../src/game/doors/doorSystem';
export const roomCenter=(r:V124bRoom):Point=>r.hub??{x:r.x+r.w/2,y:r.y+r.h/2};
function room(p:V124bPlan,id:string){const r=p.rooms.find(r=>r.id===id);if(!r)throw Error(`${p.id}: unknown room ${id}`);return r;}
export function edgePoints(p:V124bPlan,e:V124bEdge):Point[]{
 const chain=[roomCenter(room(p,e.from)),...(e.via??[]),roomCenter(room(p,e.to))];if(!e.door)return chain;
 const at=e.door.at;for(let i=1;i<chain.length;i++){const a=chain[i-1],b=chain[i],on=a.x===b.x&&at.x===a.x&&at.y>=Math.min(a.y,b.y)&&at.y<=Math.max(a.y,b.y)||a.y===b.y&&at.y===a.y&&at.x>=Math.min(a.x,b.x)&&at.x<=Math.max(a.x,b.x);if(on){if(Math.hypot(at.x-a.x,at.y-a.y)>.001&&Math.hypot(at.x-b.x,at.y-b.y)>.001)chain.splice(i,0,at);return chain;}}
 throw Error(`${p.id}: door is not on its declared edge ${e.from}→${e.to}`);
}
function corridors(p:V124bPlan):[number,number,number,number][]{
 const rects:[number,number,number,number][]=[];
 for(const e of p.edges){const points=edgePoints(p,e),w=e.width??3;if(w<3)throw Error(`${p.id}: corridor below 3 tiles`);
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(a.x!==b.x&&a.y!==b.y)throw Error(`${p.id}: edge ${e.from}→${e.to} requires explicit orthogonal via`);
 // Floor tile union: half-open integer rectangles, span includes endpoints.
 const x=Math.floor(Math.min(a.x,b.x)-w/2),y=Math.floor(Math.min(a.y,b.y)-w/2);
 rects.push([x,y,Math.ceil(Math.max(a.x,b.x)+w/2)-x,Math.ceil(Math.max(a.y,b.y)+w/2)-y]);}}
 return rects;
}
export function stageWithLockdown(def:StageDefinition){const s=compileStage(def);for(const d of s.doors??[]){if(!def.lockdownDoors?.includes(d.id))continue;const b=doorRect(d);s.movementBlockers.push(b.x,b.y,b.x+b.w,b.y+b.h);if(d.type==='solid')s.visionBlockers.push(b.x,b.y,b.x+b.w,b.y+b.h);}return s;}
export function physicalRoute(def:StageDefinition,points:Point[],closed=false,radius=20):Point[]{
 const stage=closed?stageWithLockdown(def):compileStage(def),nav=buildNavigation(stage,radius),out:Point[]=[points[0]];
 for(const b of points.slice(1)){const a=out.at(-1)!;
 if(!clearSegment(b.x*TILE,b.y*TILE,b.x*TILE,b.y*TILE,nav.blockers,radius))throw Error(`${def.id}: ${closed?'CLOSED':'OPEN'} blocked waypoint ${b.x},${b.y}`);
 const path=findPath(nav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);
 if(path.length<2||Math.hypot(path.at(-2)!/TILE-b.x,path.at(-1)!/TILE-b.y)>.01)throw Error(`${def.id}: ${closed?'CLOSED':'OPEN'} disconnected ${b.x},${b.y}`);
 for(let i=0;i<path.length;i+=2){const q={x:path[i]/TILE,y:path[i+1]/TILE};if(Math.hypot(q.x-out.at(-1)!.x,q.y-out.at(-1)!.y)>.001)out.push(q);}}
 return out;
}
/** A declared edge may avoid props inside its endpoint rooms, never borrow another corridor. */
export function physicalEdgeRoute(def:StageDefinition,p:V124bPlan,e:V124bEdge,points=edgePoints(p,e),closed=false):Point[]{
 const allowed=[...p.rooms.filter(r=>r.id===e.from||r.id===e.to).map(r=>[r.x,r.y,r.w,r.h] as [number,number,number,number]),...corridors({...p,edges:[e]})];
 const mask=def.layout.map((row,y)=>row.split('').map((ch,x)=>ch==='.'&&!allowed.some(([rx,ry,w,h])=>x>=rx&&x<rx+w&&y>=ry&&y<ry+h)?'#':ch).join(''));
 try{return physicalRoute({...def,layout:mask},points,closed);}catch(err){throw Error(`${def.id}: declared ${e.role} edge ${e.from}→${e.to} is blocked inside its own corridor: ${String(err)}`);}
}
function authoredRoomRoute(def:StageDefinition,p:V124bPlan,ids:string[],start:Point,end:Point,roles:V124bEdge['role'][],closed=false){
 const out:Point[]=[start];for(let i=1;i<ids.length;i++){
 const a=ids[i-1],b=ids[i],candidates=p.edges.filter(e=>(e.from===a&&e.to===b||e.from===b&&e.to===a)&&roles.includes(e.role));
 const e=candidates.find(e=>e.role===roles[0])??candidates[0];if(!e)throw Error(`${p.id}: missing ${a}→${b} route edge`);
 const points=edgePoints(p,e);if(e.to===a)points.reverse();if(i===1)points[0]=start;if(i===ids.length-1)points[points.length-1]=end;
 const path=physicalEdgeRoute(def,p,e,points,closed);out.push(...path.slice(1));}
 return out;
}
function defaultPatrolStops(def:StageDefinition,r:V124bRoom):Point[]{
 const stage=compileStage(def),nav=buildNavigation(stage,9),candidates:Point[]=[];
 for(let y=r.y+1;y<r.y+r.h-1;y+=.5)for(let x=r.x+1;x<r.x+r.w-1;x+=.5)if(clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,nav.blockers,9))candidates.push({x,y});
 const target={x:r.x+1.5,y:r.y+1.5};candidates.sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y));
 const start=candidates[0];if(!start)throw Error(`${def.id}: no valid guard body space in ${r.id}`);
 const end=candidates.findLast(q=>Math.hypot(q.x-start.x,q.y-start.y)>1.5&&(()=>{try{physicalRoute(def,[start,q],false,9);return true;}catch{return false;}})());
 if(!end)throw Error(`${def.id}: no connected patrol sweep in ${r.id}`);return [start,end];
}
function objectivePatrolStops(def:StageDefinition,r:V124bRoom):Point[]{
 const stage=compileStage(def),nav=buildNavigation(stage,9),o=def.objective!,choices:Point[]=[];
 for(let y=o.y-3;y<=o.y+3;y+=.5)for(let x=o.x-3;x<=o.x+3;x+=.5){const d=Math.hypot(x-o.x,y-o.y);if(d<1.5||d>2.7||!clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,nav.blockers,9)||!clearSegment(x*TILE,y*TILE,o.x*TILE,o.y*TILE,stage.visionBlockers))continue;choices.push({x,y});}
 choices.sort((a,b)=>Math.abs(Math.hypot(a.x-o.x,a.y-o.y)-2)-Math.abs(Math.hypot(b.x-o.x,b.y-o.y)-2));
 const inspect=choices[0];if(!inspect)throw Error(`${def.id}: no real objective inspection position`);
 const away=defaultPatrolStops(def,r).find(q=>Math.hypot(q.x-inspect.x,q.y-inspect.y)>2)??defaultPatrolStops(def,r)[1];
 physicalRoute(def,[inspect,away],false,9);return [inspect,away];
}
function security(def:StageDefinition,p:V124bPlan,old:StageDefinition,source:StageDefinition[]){
 const authored:NonNullable<V124bPlan['patrols']>=p.patrols??p.rooms.filter(r=>r.role==='transition'||r.role==='objective').map(r=>({room:r.id,role:r.role==='objective'?'objective' as const:'room' as const}));
 // Explicit empty semantic plan suppresses the legacy 01-01 id-based patrol fallback.
 def.guards=[];def.patrolRoutes=[];def.securityZones=[];def.patrolPlan={zones:[],anchors:[],assignments:[]};
 const guardCount=p.guardCount??({4:3,5:4,6:4,7:5,8:5,9:6} as Record<number,number>)[old.chapter!]??old.guards.length;
 for(let i=0;i<guardCount;i++){
 const a=authored[i%authored.length],objective=i===guardCount-1,r=room(p,objective?p.objectiveRoom:a.room),c=roomCenter(r);const stops=objective?p.objectiveStops??objectivePatrolStops(def,r):a.points??defaultPatrolStops(def,r);
 const template=old.guards[Math.min(i,old.guards.length-1)],id=`${def.id}-g${i+1}`,facing=objective?Math.atan2(def.objective!.y-stops[0].y,def.objective!.x-stops[0].x):Math.atan2(c.y-stops[0].y,c.x-stops[0].x);
 const points=physicalRoute(def,[...stops,stops[0]],false,9).slice(0,-1);
 def.guards.push({...structuredClone(template),...(old.chapter!>=4?{pace:.8,visionRange:({4:4.1,5:4.3,6:4.4,7:4.6,8:4.8,9:5} as Record<number,number>)[old.chapter!]}:{}),id,...stops[0],facing,initialFacing:facing,initialLookTarget:undefined,routeId:id,role:objective?'objective':a.role==='objective'?'corridor':a.role??'room',theftRole:objective?'objective':a.role==='exit'?'exit':'zone',theftPosts:stops.slice(0,2),theftSearchSectors:[{id:`${id}: ${r.name}`,anchors:stops}]});
 def.patrolRoutes.push({id,mode:'pingpong',points:points.map(q=>({...q,waitDuration:stops.some(s=>Math.hypot(s.x-q.x,s.y-q.y)<.01)?1.5:0,lookDirection:objective?(Math.hypot(q.x-stops[0].x,q.y-stops[0].y)<.01?facing:Math.atan2(q.y-def.objective!.y,q.x-def.objective!.x)):Math.atan2(c.y-q.y,c.x-q.x),turnDuration:.4}))});
 def.securityZones.push({name:r.name,...c,radius:Math.max(r.w,r.h)/2,guardId:id});}
 def.objectiveZone={guardId:def.guards.find(g=>g.role==='objective')?.id??def.guards.at(-1)!.id,spotlight:true};
 const cameraCount=p.cameras?.length??old.cameras?.length??0, fallback=source.flatMap(s=>s.chapter===3?s.cameras??[]:[])[0];
 def.cameras=[];for(let i=0;i<cameraCount;i++){const a=p.cameras?.[i%p.cameras.length],r=room(p,a?.room??p.rooms.find(r=>r.role==='restricted')!.id),template=old.cameras?.[Math.min(i,old.cameras.length-1)]??fallback;if(!template)throw Error(`${def.id}: approved CCTV template missing`);def.cameras.push({...template,id:`${def.id}-cam${i+1}`,...(a?.at??{x:r.x+1.5,y:r.y+1.5}),centerFacing:a?.facing??Math.PI/4});}

}
function aperture(def:StageDefinition,at:Point,orientation:'horizontal'|'vertical'){
 const row=Math.floor(at.y),col=Math.floor(at.x),horizontal=orientation==='horizontal',isFloor=(x:number,y:number)=>def.layout[y]?.[x]==='.';
 if(!isFloor(col,row))throw Error(`${def.id}: door does not sit on floor ${at.x},${at.y}`);
 let lo=horizontal?col:row,hi=lo;while(isFloor(horizontal?lo-1:col,horizontal?row:lo-1))lo--;while(isFloor(horizontal?hi+1:col,horizontal?row:hi+1))hi++;
 const width=hi-lo+1;if(width<3||width>5)throw Error(`${def.id}: door aperture ${width} tiles is not a narrow wall threshold at ${at.x},${at.y}`);
 return {...(horizontal?{x:(lo+hi+1)/2,y:at.y}:{x:at.x,y:(lo+hi+1)/2}),width};
}
function secureThreshold(def:StageDefinition,p:V124bPlan){
 const e=p.edges.find(e=>e.role==='approach'&&(e.from===p.objectiveRoom||e.to===p.objectiveRoom));if(!e)throw Error(`${p.id}: objective missing controlled approach edge`);
 if(e.door&&!e.door.lockdown){const d=def.doors!.find(d=>d.id===`${p.id}-door-${e.id??p.edges.indexOf(e)}`)!;d.style=def.chapter===3?'bankVault':def.chapter===1?'museumRestrictedCollection':d.style;return;}
 const chain=edgePoints(p,e), candidates:{at:Point;orientation:'horizontal'|'vertical';width:number;score:number}[]=[];
 for(let i=1;i<chain.length;i++){const a=chain[i-1],b=chain[i],len=Math.hypot(b.x-a.x,b.y-a.y);for(let d=.5;d<len;d+=.5){const at={x:a.x+(b.x-a.x)*d/len,y:a.y+(b.y-a.y)*d/len};
 if(p.rooms.some(r=>at.x>=r.x-.1&&at.x<=r.x+r.w+.1&&at.y>=r.y-.1&&at.y<=r.y+r.h+.1))continue;
 const verticalTravel=a.x===b.x,orientation=verticalTravel?'horizontal':'vertical';const row=Math.floor(at.y),col=Math.floor(at.x);
 const isFloor=(x:number,y:number)=>def.layout[y]?.[x]==='.';let lo=verticalTravel?col:row,hi=lo;
 while(isFloor(verticalTravel?lo-1:col,verticalTravel?row:lo-1))lo--;
 while(isFloor(verticalTravel?hi+1:col,verticalTravel?row:hi+1))hi++;
 const width=hi-lo+1;if(width>5||width<3)continue;
 const adjusted=verticalTravel?{x:(lo+hi+1)/2,y:at.y}:{x:at.x,y:(lo+hi+1)/2};
 candidates.push({at:adjusted,orientation,width,score:Math.hypot(adjusted.x-def.objective!.x,adjusted.y-def.objective!.y)});
 }}
 candidates.sort((a,b)=>a.score-b.score);const d=candidates[0];if(!d)throw Error(`${p.id}: no real wall-bounded secure threshold aperture`);
 const chapter=def.chapter!,glass=e.door?.type==='glass';const style=chapter===1?'museumRestrictedCollection':chapter===2?(glass?'galleryGlassSliding':'galleryPrivateCollection'):chapter===3?'bankVault':chapter===4?(glass?'labRestrictedGlass':'labSliding'):chapter===5?'casinoVip':chapter===6?'mansionLibrary':chapter===7?'warehouseIndustrial':chapter===8?'hqSteel':'vaultReinforced';
 def.doors!.push({id:`${def.id}-secure-threshold`,type:glass?'glass':'solid',style,...d.at,width:d.width,thickness:.2,orientation:d.orientation,initialState:'OPEN',closeDuration:.65,occupancyMargin:.05,lockdownBehavior:'stayOpen'});
}
function facade(p:V124bPlan,id:string,override?:'top'|'bottom'|'left'|'right'){
 const r=room(p,id),width=Math.max(...p.rooms.map(r=>r.x+r.w)),height=Math.max(...p.rooms.map(r=>r.y+r.h));
 const edges=[{edge:'left' as const,d:r.x,point:{x:r.x+1.2,y:r.y+r.h/2}},{edge:'right' as const,d:width-r.x-r.w,point:{x:r.x+r.w-1.2,y:r.y+r.h/2}},{edge:'top' as const,d:r.y,point:{x:r.x+r.w/2,y:r.y+1.2}},{edge:'bottom' as const,d:height-r.y-r.h,point:{x:r.x+r.w/2,y:r.y+r.h-1.2}}];
 edges.sort((a,b)=>a.d-b.d);return edges.find(e=>e.edge===override)??edges[0];
}
/** Certified opaque shoulder beside a real escape path; never an authored label alone. */
export function firstBreakErrors(def:StageDefinition,q:Point,radius=.2):string[]{
 const stage=compileStage(def),o=def.objective!,g=def.guards.find(g=>g.role==='objective')!,errors:string[]=[],body=20+radius*TILE;
 if(Math.hypot(q.x-o.x,q.y-o.y)>6.01||Math.hypot(q.x-o.x,q.y-o.y)<1.2)errors.push('First break outside 1.2–6 tile pickup neighbourhood');
 if(!clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,body))errors.push('First break waiting pocket intersects solid geometry');
 if(clearSegment(o.x*TILE,o.y*TILE,q.x*TILE,q.y*TILE,stage.visionBlockers))errors.push('First break has unobstructed LOS from objective centre');
 if(clearSegment(g.x*TILE,g.y*TILE,q.x*TILE,q.y*TILE,stage.visionBlockers))errors.push('First break has unobstructed LOS from objective inspection post');
 try{physicalRoute(def,[o,q]);}catch{errors.push('First break is not physically reachable from pickup');}
 return errors;
}
function selectFirstBreak(def:StageDefinition):Point{
 const stage=compileStage(def),o=def.objective!,g=def.guards.find(g=>g.role==='objective')!,candidates:Point[]=[],seen=new Set<string>();
 const nearRoute:Point[]=[];
 for(const route of def.escapeRoutes??[])for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*4));for(let j=0;j<=n;j++){const q={x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n};if(Math.hypot(q.x-o.x,q.y-o.y)<=6.8)nearRoute.push(q);}}
 for(const q of nearRoute)for(const dx of [-.75,-.5,-.25,0,.25,.5,.75])for(const dy of [-.75,-.5,-.25,0,.25,.5,.75]){const a={x:Math.round((q.x+dx)*4)/4,y:Math.round((q.y+dy)*4)/4},key=`${a.x},${a.y}`;if(seen.has(key))continue;seen.add(key);const dist=Math.hypot(a.x-o.x,a.y-o.y);if(dist<1.2||dist>6||!clearSegment(a.x*TILE,a.y*TILE,a.x*TILE,a.y*TILE,stage.movementBlockers,28)||clearSegment(o.x*TILE,o.y*TILE,a.x*TILE,a.y*TILE,stage.visionBlockers)||clearSegment(g.x*TILE,g.y*TILE,a.x*TILE,a.y*TILE,stage.visionBlockers))continue;candidates.push(a);}
 candidates.sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y));
 for(const q of candidates)if(firstBreakErrors(def,q).length===0)return q;
 if(process.env.V13_DEBUG)console.log('first break',{o:{x:o.x,y:o.y},g:{x:g.x,y:g.y},near:nearRoute.length,candidates:candidates.slice(0,6).map(q=>[q,firstBreakErrors(def,q)]),routes:JSON.stringify((def.escapeRoutes??[]).map(r=>r.points.slice(0,6)))});
 throw Error(`${def.id}: no reachable body-clear opaque first LOS break within 6 tiles of pickup on escape corridor`);
}
export function composeV124bPlan(p:V124bPlan,source:StageDefinition[]):StageDefinition{
 const old=source.find(s=>s.id===p.id);if(!old)throw Error(`Missing source ${p.id}`);
 const ef=facade(p,p.entryRoom,p.entryEdge),xf=facade(p,p.exitRoom,p.exitEdge),entry=p.entry??ef.point,goal=p.objective??roomCenter(room(p,p.objectiveRoom)),exit=p.exit??xf.point;
 const rectangles=[...p.rooms.map(r=>[r.x,r.y,r.w,r.h] as [number,number,number,number]),...(p.drawnFloor?[]:corridors(p))];
 if(rectangles.some(r=>r[0]<1||r[1]<1))throw Error(`${p.id}: corridor outside positive grid`);
 const def:StageDefinition={...structuredClone(old),title:p.title,...(p.visualRevision?{visualRevision:p.visualRevision}:{}),layout:v12Layout(rectangles,(p.islands??[]).map(i=>[i.x,i.y,i.w,i.h])),topologyPlan:structuredClone(p),functionalZones:p.rooms.map(r=>({...r,purpose:r.purpose??`${r.name}: ${r.role}`})),props:structuredClone(p.structures??[]),dressing:[],lights:structuredClone(p.lights??[]),carpets:[],doors:[],lockdownDoors:[],playerSpawn:{...entry,facing:ef.edge==='left'?0:ef.edge==='right'?Math.PI:ef.edge==='top'?Math.PI/2:-Math.PI/2},entryPosition:entry,entryEdge:ef.edge,exitPosition:exit,exitEdge:xf.edge,exit:{x:exit.x-.6,y:exit.y-.6,w:1.2,h:1.2},objective:{...old.objective!,...goal,highSecurity:p.highSecurity??old.objective?.highSecurity},testRoutes:[],escapeRoutes:[],safeZones:[{...entry,radius:.2}],structurePlan:`V12 ${p.visualRevision==='v12-4c'?'PHASE4C':'PHASE4B'} ${p.family}: ${p.rooms.map(r=>r.name).join(' → ')}`};
 for(let i=0;i<p.edges.length;i++){const e=p.edges[i];if(!e.door)continue;const d=e.door,id=`${p.id}-door-${e.id??i}`;const glass=d.type==='glass';def.doors!.push({id,...aperture(def,d.at,d.orientation),type:d.type??'solid',orientation:d.orientation,thickness:.2,closeDuration:.65,occupancyMargin:.05,initialState:'OPEN',lockdownBehavior:d.lockdown?'close':'stayOpen',style:old.chapter===1?(d.lockdown?'museumSecurity':'museumExhibition'):old.chapter===2?(glass?'galleryGlassSliding':d.lockdown?'galleryPrivateCollection':'galleryMinimal'):old.chapter===3?(d.lockdown?'bankSecurity':'bankStaff'):old.chapter===4?(glass?'labRestrictedGlass':'labSliding'):old.chapter===5?(d.lockdown?'casinoVip':'casinoStaff'):old.chapter===6?(d.lockdown?'mansionLibrary':'mansionWood'):old.chapter===7?'warehouseIndustrial':old.chapter===8?'hqSteel':'vaultReinforced'});if(d.lockdown)def.lockdownDoors!.push(id);}
 secureThreshold(def,p);
 if(p.visualRevision==='v12-4c'){
  for(const door of def.doors!){const authored=p.edges.find((e,i)=>`${p.id}-door-${e.id??i}`===door.id);door.style=authored?.door?.style??(door.id.endsWith('secure-threshold')&&p.secureDoorStyle?p.secureDoorStyle:`${door.style}4c` as typeof door.style);}
 }
 // Secure objective focal point; no pedestal collision or accidental full cover at pickup.
 def.props.push({kind:'objectiveCase',visualAssetId:old.chapter===1?'museum_diamond_case':old.chapter===2?'gallery_low_pedestal':old.chapter===3?'bank_main_vault':old.chapter===4?'lab_prototype_machine':old.chapter===5?'casino_cashier_vault':undefined,...goal,...(p.objectiveVisualAssetId?{visualAssetId:p.objectiveVisualAssetId}:{}),...(p.objectiveScale?{scale:p.objectiveScale}: {})});def.landmark={name:room(p,p.objectiveRoom).name,kind:'objectiveCase',...goal};
 if(old.chapter===3){const r=room(p,p.objectiveRoom);const backing=def.props.find(q=>q.kind.startsWith('bank')&&q.x>=r.x&&q.x<=r.x+r.w&&q.y>=r.y&&q.y<=r.y+r.h);if(!backing)throw Error(`${p.id}: Bank secure chamber needs an actual Bank focal structure`);def.landmark={name:r.name,kind:backing.kind,x:backing.x,y:backing.y};}
 security(def,p,old,source);
 def.testRoutes!.push({name:'safe: public → restricted → secure objective',points:authoredRoomRoute(def,p,p.approach,entry,goal,['approach'])});
 def.testRoutes!.push({name:'risk: exposed alternate approach',points:authoredRoomRoute(def,p,p.risk??p.approach,entry,goal,['risk','approach'])});
 def.escapeRoutes!.push({name:'escape: quick return closes at lockdown',points:authoredRoomRoute(def,p,p.quickEscape,goal,exit,['quickEscape','approach','alternateEscape'])});
 def.escapeRoutes!.push({name:'escape: independent service route after lockdown',points:authoredRoomRoute(def,p,p.alternateEscape,goal,exit,['alternateEscape'],true)});
 const firstBreak=selectFirstBreak(def);def.safeZones!.push({...firstBreak,radius:.2});def.topologyPlan!.firstBreak=firstBreak;
 for(const r of p.rooms){const c=roomCenter(r);def.lights.push({x:c.x,y:r.y+1,radius:Math.min(r.w,r.h)*.7,kind:old.chapter===4||old.chapter===8?'cool':'warm',intensity:.3});}
 def.lights.push({x:goal.x+1,y:goal.y-1,radius:2.2,kind:'warm',intensity:.28},{...goal,radius:2.5,kind:'cyan',intensity:.65},{...exit,radius:2,kind:'green',intensity:.4});
 return def;
}
export function buildV124bCampaign(source:StageDefinition[],plans:V124bPlan[]):StageDefinition[]{if(source.length!==45||plans.length!==45||new Set(plans.map(p=>p.id)).size!==45)throw Error('Phase4B needs 45 unique plans and 45 source missions');return source.map(s=>composeV124bPlan(plans.find(p=>p.id===s.id)!,source));}
