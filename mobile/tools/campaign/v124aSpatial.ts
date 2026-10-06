/** Phase 4A authoring only: five semantic rooms and a persistent service circuit.
 * Compiled JSON is the runtime source; this module never runs on the phone. */
import type {StageDefinition, PropDef} from '../../src/game/levels/StageDefinition';
import type {DoorDefinition} from '../../src/game/doors/doorTypes';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {v12Layout} from './v12Runtime';
type Point={x:number;y:number};
type Rect=[number,number,number,number];
type Zone={id:string;name:string;role:'public'|'transition'|'restricted'|'objective'|'escape';x:number;y:number;w:number;h:number;purpose:string};
type Def=StageDefinition&{functionalZones:Zone[];doors:DoorDefinition[];lockdownDoors:string[]};
type Plan={id:string;title:string;names:string[];rooms:Rect[];kind:'statue'|'archive'|'security'|'portrait'|'sculpture'|'glass'|'installation';orientation?:'quarter'|'mirror';};
const p=(x:number,y:number):Point=>({x,y});
const center=([x,y,w,h]:Rect)=>p(x+w/2,y+h/2);
export const V124A_PLANS:Plan[]=[
 {id:'01-01',title:'Entrance Hall',names:['Visitor Entrance','Main Exhibit Hall','Side Collection','Objective Display','Service Exit'],rooms:[[1,10,4,3],[1,5,6,4],[9,5,4,4],[9,1,4,3],[15,1,3,12]],kind:'statue'},
 {id:'01-02',title:'Main Gallery',names:['Gallery Entry','Main Rotunda','Sculpture Wing','Restricted Exhibit','Exit Loggia'],rooms:[[1,13,5,4],[1,5,8,7],[11,5,5,7],[11,1,5,3],[18,1,3,16]],kind:'statue'},
 {id:'01-03',title:'Archive & Conservation',names:['Public Archive','Storage','Conservation Workspace','Restricted Archive / Objective Room','Loading Return'],rooms:[[1,11,4,4],[1,5,6,5],[9,5,5,5],[9,1,5,3],[16,1,3,14]],kind:'archive'},
 {id:'01-04',title:'Security Wing',names:['Museum Corridor','Security Desk','Monitoring Room','Restricted Collection / Objective','Dispatch Return'],rooms:[[1,12,4,4],[1,6,7,5],[10,6,5,5],[10,1,5,4],[17,1,3,15]],kind:'security',orientation:'mirror'},
 {id:'01-05',title:'Grand Heist',names:['Grand Lobby','Master Exhibition','Security Threshold','Private Collection / Grand Objective Chamber','Service Cloister'],rooms:[[1,13,5,4],[1,6,8,6],[11,6,6,6],[11,1,6,4],[19,1,3,16]],kind:'statue'},
 {id:'02-01',title:'Portrait Hall',names:['Reception','Portrait Corridor / Main Viewing','Collection Threshold','Private Portrait Collection','Conservation Exit'],rooms:[[1,13,5,4],[1,5,10,7],[13,5,5,7],[13,1,5,3],[20,1,3,16]],kind:'portrait'},
 {id:'02-02',title:'Sculpture Studio',names:['Public Sculpture Hall','Work Studio / Central Sculpture Field','Workshop Threshold','Restricted Workshop / Objective','Preparation Return'],rooms:[[1,14,5,4],[1,6,9,7],[12,6,6,7],[12,1,6,4],[20,1,3,17]],kind:'sculpture'},
 {id:'02-03',title:'Glass Gallery',names:['Reception','Glass Exhibit','Installation Corridor','Private Glass Room / Objective','Opaque Service Spine'],rooms:[[1,14,5,4],[1,6,10,7],[13,6,6,7],[13,1,6,4],[21,1,3,17]],kind:'glass',orientation:'mirror'},
 {id:'02-04',title:'Grand Atrium',names:['Arrival Gallery','Grand Atrium','Art Wall Threshold','Private Installation Collection','Side Exhibition Return'],rooms:[[1,14,5,4],[1,5,11,8],[14,5,6,8],[14,1,6,3],[22,1,3,17]],kind:'installation'},
 {id:'02-05',title:'Masterpiece',names:['Main Gallery','Curator Wing','Private Exhibition','Masterpiece Chamber','Service Escape / Preparation Corridor'],rooms:[[1,14,5,4],[1,6,10,7],[13,6,6,7],[13,1,6,4],[21,1,3,17]],kind:'portrait'},
];
const roles:Zone['role'][]=['public','transition','restricted','objective','escape'];
const purposes=['Protected entry read and public visitor arrival','Landmark viewing island divides a protected shoulder from a timed central crossing','Staff-controlled threshold and semantic collection inspection','Secure collection interior; objective is beyond the public circulation axis','Persistent preparation/service route after the quick return door closes'];
function joinedRects(rooms:Rect[]){
 const [a,b,c,d,e]=rooms;
 // All gaps are actual wall thresholds. Three-tile portals are explicit floor cuts.
 return [
 [a[0]+1,b[1]+b[3]-1,3,a[1]-b[1]-b[3]+2],
 [b[0]+b[2]-1,b[1]+2, c[0]-b[0]-b[2]+2,3],
 [c[0]+1,d[1]+d[3]-1,3,c[1]-d[1]-d[3]+2],
 [d[0]+d[2]-1,d[1]+.0,e[0]-d[0]-d[2]+2,3],
 [a[0]+a[2]-1,a[1]+a[3]-3,e[0]-a[0]-a[2]+2,3],
 ] as Rect[];
}
function closedStage(def:Def){const stage=compileStage(def);for(const d of def.doors.filter(d=>def.lockdownDoors.includes(d.id))){
 const half=d.width*TILE/2,th=d.thickness*TILE/2;
 const box=d.orientation==='horizontal'?[d.x*TILE-half,d.y*TILE-th,d.x*TILE+half,d.y*TILE+th]:[d.x*TILE-th,d.y*TILE-half,d.x*TILE+th,d.y*TILE+half];
 stage.movementBlockers.push(...box);if(d.type==='solid')stage.visionBlockers.push(...box);
 }return stage;}
/** Endpoint equality is mandatory: findPath intentionally returns a nearby fallback for disconnected goals. */
export function strictSpatialRoute(def:StageDefinition,via:Point[],closed=false,radius=20):Point[]{
 const stage=closed?closedStage(def as Def):compileStage(def),nav=buildNavigation(stage,radius),out=[via[0]];
 for(const b of via.slice(1)){const a=out.at(-1)!;const path=findPath(nav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);
 if(path.length<2||Math.hypot(path.at(-2)!/TILE-b.x,path.at(-1)!/TILE-b.y)>.01)throw Error(`${def.id}: ${closed?'CLOSED':'OPEN'} unreachable ${b.x},${b.y} from ${a.x},${a.y}`);
 for(let i=0;i<path.length;i+=2){const q=p(path[i]/TILE,path[i+1]/TILE);if(Math.hypot(q.x-out.at(-1)!.x,q.y-out.at(-1)!.y)>.01)out.push(q);}
 }return out;
}
function addDoor(def:Def,id:string,style:DoorDefinition['style'],x:number,y:number,orientation:DoorDefinition['orientation'],lock=false,type:DoorDefinition['type']='solid'){
 def.doors.push({id:`${def.id}-${id}`,type,style,x,y,width:3,thickness:.2,orientation,initialState:'OPEN',closeDuration:.65,occupancyMargin:.05,lockdownBehavior:lock?'close':'stayOpen'});
 if(lock)def.lockdownDoors.push(`${def.id}-${id}`);
}
function firstBreak(def:Def):Point{
 const stage=compileStage(def),o=def.objective!,guard=def.guards[1];const choices:Point[]=[];
 for(let y=o.y-4;y<o.y+4;y+=.25)for(let x=o.x-4;x<o.x+4;x+=.25){const q=p(x,y),dist=Math.hypot(x-o.x,y-o.y);
 if(dist<1.2||dist>4||!clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,stage.movementBlockers,20))continue;
 if(clearSegment(guard.x*TILE,guard.y*TILE,x*TILE,y*TILE,stage.visionBlockers))continue;
 try{strictSpatialRoute(def,[o,q]);choices.push(q);}catch{/* Not a real shoulder. */}
 }choices.sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y));
 if(!choices[0])throw Error(def.id+': missing nearby opaque first break');return choices[0];
}
function compose(plan:Plan,source:StageDefinition[]):Def{
 const old=source.find(s=>s.id===plan.id)!;const chapter=Number(plan.id.slice(0,2)),r=plan.rooms,centers=r.map(center),[entry,hall,restricted,secure,service]=centers;
 const def={...structuredClone(old),title:plan.title,layout:v12Layout([...r,...joinedRects(r),[r[4][0]+r[4][2],r[4][1]+4,2,3],[r[4][0]+r[4][2],r[4][1]+r[4][3]-5,2,3]],plan.id==='01-02'?[[r[1][0],r[1][1],1,1],[r[1][0]+r[1][2]-1,r[1][1],1,1],[r[1][0],r[1][1]+r[1][3]-1,1,1]]:plan.kind==='archive'?[[r[1][0]+r[1][2]-2,r[1][1],2,1]]:plan.kind==='installation'?[[r[1][0],r[1][1],2,1],[r[1][0]+r[1][2]-2,r[1][1],2,1]]:[]),props:[],dressing:[],lights:[],carpets:[],patrolPlan:{zones:[],anchors:[],assignments:[]},guards:[],patrolRoutes:[],cameras:[],securityZones:[],functionalZones:r.map(([x,y,w,h],i)=>({id:`${plan.id}-zone${i+1}`,name:plan.names[i],role:roles[i],x,y,w,h,purpose:purposes[i]})),doors:[],lockdownDoors:[]} as Def;
 def.playerSpawn={...entry,facing:-Math.PI/2};def.entryPosition=entry;def.entryEdge='bottom';def.exitPosition=p(r[0][0]+1,r[0][1]+r[0][3]-1);def.exitEdge='left';def.exit={x:def.exitPosition.x-.6,y:def.exitPosition.y-.6,w:1.2,h:1.2};
 def.objective={...old.objective!,...secure,highSecurity:plan.id==='02-05'};
 const mainAsset=chapter===1?'museum_statue_large':plan.kind==='installation'||plan.kind==='glass'?'gallery_installation_art':'gallery_sculpture_large';
 const mainKind:PropDef['kind']=plan.kind==='archive'?'shelf':plan.kind==='security'?'equipment':plan.kind==='portrait'?'partition':'statue';
 const mainVisual=plan.kind==='archive'?'museum_display_case_large':plan.kind==='security'?'museum_security_desk':plan.kind==='portrait'?'gallery_movable_art_wall':mainAsset;
 // Central island is functional cover, not a grid wall with a decorative sprite pasted over it.
 def.props.push({kind:mainKind,visualAssetId:mainVisual,x:hall.x,y:hall.y,scale:plan.kind==='archive'?2.2:plan.kind==='portrait'?2.8:plan.id==='01-02'?2:chapter===1?1.5:1.9,collisionScale:plan.kind==='archive'?2.2:plan.kind==='portrait'?2.8:plan.id==='01-02'?2:chapter===1?1.5:1.9});
 def.props.push({kind:'shelf',visualAssetId:chapter===1?'museum_display_case_large':'gallery_movable_art_wall',x:r[2][0]+r[2][2]-.6,y:restricted.y+.7,scale:1.3,collisionScale:1.3});
 // A real opaque rear shoulder next to the objective; never an immunity flag.
 def.props.push({kind:'partition',visualAssetId:chapter===1?'museum_partition':'gallery_white_wall',x:secure.x-1.3,y:secure.y+.7,scale:1,collisionScale:1});
 def.props.push({kind:'objectiveCase',visualAssetId:chapter===1?'museum_diamond_case':'gallery_low_pedestal',...secure,scale:1.4});
 const serviceBase=p(service.x, r[4][1]+r[4][3]-3);
 def.props.push({kind:'table',visualAssetId:chapter===1?'museum_display_low':'gallery_central_plinth',x:r[4][0]+r[4][2]+1,y:r[4][1]+6,scale:.85,collisionScale:.85});
 def.props.push({kind:chapter===1?'displayCase':'table',visualAssetId:chapter===1?'museum_display_low':'gallery_low_pedestal',x:r[4][0]+r[4][2]+1,y:r[4][1]+r[4][3]-3,scale:.75,collisionScale:.75});
 def.props.push({kind:'statuePedestal',visualAssetId:chapter===1?'museum_pedestal':'gallery_low_pedestal',x:secure.x+1.6,y:secure.y-.1,scale:.75,collisionScale:.75});
 // Satellite exhibit creates a second observation/cover node in the public viewing cell.
 if(!['sculpture','installation','security'].includes(plan.kind))def.props.push({kind:'displayCase',visualAssetId:chapter===1?'museum_display_case_large':'gallery_central_plinth',x:r[1][0]+r[1][2]-.3,y:hall.y-1.4,scale:.85,collisionScale:.85});
 if(plan.kind==='sculpture')def.props.push({kind:'statue',visualAssetId:'gallery_sculpture_large',x:hall.x-2.2,y:hall.y+1.7,scale:1.1,collisionScale:1.1});
 if(plan.kind==='installation')def.props.push({kind:'table',visualAssetId:'gallery_central_plinth',x:hall.x+2.6,y:hall.y+1.8,scale:1.2,collisionScale:1.2});
 if(plan.kind==='security')def.props.push({kind:'pillar',visualAssetId:'museum_column',x:r[1][0]+.3,y:hall.y,scale:.85,collisionScale:.85});
 if(plan.kind==='glass')def.props.push({kind:'galleryGlassPanelVertical',x:hall.x+2,y:hall.y,scale:1.6,collisionScale:1.6});
 def.landmark={name:plan.names[1],kind:mainKind,...hall};def.structurePlan=`PHASE 4A ${plan.names.join(' → ')} | public reception, themed viewing island, controlled collection threshold, secure interior, persistent service escape`;
 const museum=chapter===1;
 addDoor(def,'visitor',museum?'museumExhibition':'galleryMinimal',r[0][0]+2.5,(r[1][1]+r[1][3]+r[0][1])/2,'horizontal');
 addDoor(def,'quick-return',museum?(plan.kind==='security'?'museumSecurity':'museumRestrictedCollection'):plan.kind==='glass'?'galleryGlassSliding':'galleryPrivateCollection',(r[1][0]+r[1][2]+r[2][0])/2,r[1][1]+3.5,'vertical',true,plan.kind==='glass'?'glass':'solid');
 addDoor(def,'collection',museum?'museumRestrictedCollection':'galleryPrivateCollection',r[2][0]+2.5,(r[3][1]+r[3][3]+r[2][1])/2,'horizontal');
 addDoor(def,'service',museum?'museumSecurity':'galleryMinimal',(r[3][0]+r[3][2]+r[4][0])/2,r[3][1]+1.5,'vertical');
 const safeShoulder=p(r[1][0]+(plan.kind==='archive'?.75:1.6),r[1][1]+1.6),riskShoulder=p(r[1][0]+r[1][2]-1,r[1][1]+r[1][3]-1);
 const publicStops=[p(r[1][0]+1.3,r[1][1]+1.3),p(r[1][0]+r[1][2]-1.3,r[1][1]+1.3),p(r[1][0]+1.3,r[1][1]+r[1][3]-1.3)];
 const inspect=p(secure.x,secure.y+2.5),away=p(r[2][0]+1.2,r[2][1]+r[2][3]-1.2);
 for(const [i,stops]of [publicStops,[inspect,away]].entries()){
 const template=old.guards[Math.min(i,old.guards.length-1)],id=`${def.id}-g${i+1}`;
 const facing=i?Math.atan2(secure.y-inspect.y,secure.x-inspect.x):-Math.PI/2;
 def.guards.push({...template,id,...stops[0],initialLookTarget:undefined,routeId:id,role:i?'objective':'room',theftRole:i?'objective':'zone',initialFacing:facing,facing,startDelay:i*1.5,theftPosts:stops,theftSearchSectors:[{id:`${id}: ${plan.names[i?2:1]} inspection`,anchors:stops}]});
 const points=strictSpatialRoute(def,[...stops,stops[0]],false,9).slice(0,-1);
 def.patrolRoutes.push({id,mode:'pingpong',points:points.map(q=>({...q,waitDuration:stops.some(s=>Math.hypot(q.x-s.x,q.y-s.y)<.01)?1.5:0,turnDuration:.4,lookDirection:i?(Math.hypot(q.x-inspect.x,q.y-inspect.y)<.01?facing:Math.PI/2):-Math.PI/2}))});
 def.securityZones!.push({name:`${plan.names[i?2:1]} assigned inspection`,...stops[0],radius:template.visionRange??4,guardId:id});
 }
 def.objectiveZone={guardId:def.guards[1].id,spotlight:true};
 const cameraIds=['01-04','02-03','02-04','02-05'];
 if(cameraIds.includes(def.id)){const camera=old.cameras?.[0]??source.flatMap(s=>s.chapter===chapter?s.cameras??[]:[])[0];if(!camera)throw Error(def.id+': missing approved CCTV archetype');def.cameras=[{...camera,id:`${def.id}-cam1`,x:r[1][0]+r[1][2]-1.5,y:r[1][1]+1.5,centerFacing:Math.PI*.75}];}

 for(const [i,z]of def.functionalZones.entries()){
 const portrait=plan.kind==='portrait',art=chapter===1?'museum_painting':portrait?`gallery_portrait_frame_${['a','b','c','d','e'][i]}`:'gallery_abstract_frame';
 def.dressing!.push({id:`${def.id}-exhibit-${i}`,zoneId:z.id,identity:`${z.name}: ${z.purpose}`,items:[{kind:'painting_wall',visualAssetId:art as NonNullable<PropDef['visualAssetId']>,x:z.x+z.w/2,y:z.y+.7,scale:portrait?1.15:.9},{kind:'plaque',x:z.x+z.w/2+1,y:z.y+.8}]});
 def.lights.push({x:z.x+z.w/2,y:z.y+1.2,radius:Math.min(z.w,z.h)*.65,kind:'warm',intensity:.34});
 }
 def.dressing!.push({id:`${def.id}-secure-presentation`,zoneId:def.functionalZones[3].id,identity:'Secure collection focal wall, caption and directed presentation light',items:[{kind:'plaque',x:secure.x+.6,y:secure.y-.4},{kind:'painting_wall',visualAssetId:chapter===1?'museum_painting':plan.kind==='portrait'?'gallery_portrait_frame_f':'gallery_masterpiece_wall',x:secure.x,y:r[3][1]+.55,scale:1.1}],light:{x:secure.x+1,y:secure.y-1,radius:2.4,kind:'warm',intensity:.48}});
 def.functionalZones[4].w+=2;
 def.lights.push({x:r[4][0]+r[4][2]+1,y:r[4][1]+5.3,radius:2,kind:'warm',intensity:.4},{x:r[4][0]+r[4][2]+1,y:r[4][1]+r[4][3]-4,radius:2,kind:'warm',intensity:.4});
 def.lights.push({...secure,radius:2.3,kind:'cyan',intensity:.64},{...def.exitPosition,radius:1.8,kind:'green',intensity:.36});
 const b=firstBreak(def);def.safeZones=[{...entry,radius:.2},{...b,radius:.2}];
 def.testRoutes=[{name:'safe: sheltered exhibit shoulder',points:strictSpatialRoute(def,[entry,safeShoulder,restricted,secure])},{name:'risk: exposed central exhibit crossing',points:strictSpatialRoute(def,[entry,riskShoulder,restricted,secure])},{name:'main: public → transition → restricted → secure',points:strictSpatialRoute(def,[entry,p(r[1][0]+(['archive','sculpture'].includes(plan.kind)?.75:1.6),r[1][1]+r[1][3]-1.6),restricted,secure])}];
 def.escapeRoutes=[{name:'escape: quick return (closes at lockdown)',points:strictSpatialRoute(def,[secure,b,restricted,safeShoulder,def.exitPosition])},{name:'escape: persistent service alternate after lockdown',points:strictSpatialRoute(def,[secure,b,p(service.x,secure.y),serviceBase,def.exitPosition],true)}];
 return orient(def,plan.orientation);
}
function orient(def:Def,mode?:Plan['orientation']):Def{
 if(!mode)return def;const width=def.layout[0].length,height=def.layout.length;
 const point=(q:Point)=>mode==='mirror'?p(width-q.x,q.y):p(height-q.y,q.x);const angle=(a:number)=>mode==='mirror'?Math.PI-a:a+Math.PI/2;const at=<T extends Point>(q:T):T=>({...q,...point(q)});
 const rect=<T extends {x:number;y:number;w:number;h:number}>(q:T):T=>mode==='mirror'?{...q,x:width-q.x-q.w}:{...q,x:height-q.y-q.h,y:q.x,w:q.h,h:q.w};
 def.layout=mode==='mirror'?def.layout.map(row=>[...row].reverse().join('')):Array.from({length:width},(_,y)=>Array.from({length:height},(_,x)=>def.layout[height-1-x][y]).join(''));
 def.playerSpawn={...at(def.playerSpawn),facing:angle(def.playerSpawn.facing)};def.entryPosition=at(def.entryPosition!);def.exitPosition=at(def.exitPosition!);def.objective=at(def.objective!);def.exit=rect(def.exit!);def.entryEdge=mode==='mirror'?'bottom':'left';def.exitEdge=mode==='mirror'?'right':'top';
 def.cameras=def.cameras?.map(c=>({...at(c),centerFacing:angle(c.centerFacing)}));
 def.props=def.props.map(q=>({...at(q),flip:mode==='mirror'?!q.flip:q.flip}));def.lights=def.lights.map(at);def.landmark=at(def.landmark!);def.functionalZones=def.functionalZones.map(rect);def.securityZones=def.securityZones?.map(at);def.safeZones=def.safeZones?.map(at);
 def.dressing=def.dressing?.map(c=>({...c,items:c.items.map(at)}));
 def.doors=def.doors.map(d=>({...at(d),orientation:mode==='quarter'?(d.orientation==='horizontal'?'vertical':'horizontal'):d.orientation}));
 def.guards=def.guards.map(g=>({...at(g),facing:angle(g.facing),initialFacing:angle(g.initialFacing??g.facing),theftPosts:g.theftPosts?.map(at),theftSearchSectors:g.theftSearchSectors?.map(s=>({...s,anchors:s.anchors.map(at)}))}));
 def.patrolRoutes=def.patrolRoutes.map(r=>({...r,points:r.points.map(q=>({...at(q),lookDirection:angle(q.lookDirection??0)}))}));
 def.testRoutes=def.testRoutes?.map(r=>({...r,points:strictSpatialRoute(def,r.points.map(at))}));def.escapeRoutes=def.escapeRoutes?.map((r,i)=>({...r,points:strictSpatialRoute(def,r.points.map(at),i===1)}));return def;
}
export function buildV124aCampaign(source:StageDefinition[]):StageDefinition[]{return source.map(s=>s.chapter!<=2?compose(V124A_PLANS.find(p=>p.id===s.id)!,source):structuredClone(s));}
export function v124aSpatialReport(def:StageDefinition){const d=def as Def,length=(points:Point[])=>points.slice(1).reduce((n,q,i)=>n+Math.hypot(q.x-points[i].x,q.y-points[i].y),0);return{id:d.id,title:d.title,size:[d.layout[0].length,d.layout.length],floor:d.layout.join('').split('.').length-1,zones:d.functionalZones,doors:d.doors,lockdownDoors:d.lockdownDoors,guards:d.guards.length,cameras:d.cameras?.length??0,objective:d.objective,firstBreak:d.safeZones?.[1],safe:length(d.testRoutes![0].points),risk:length(d.testRoutes![1].points),quickEscape:length(d.escapeRoutes![0].points),lockdownEscape:length(d.escapeRoutes![1].points),structures:d.props.map(q=>({kind:q.kind,asset:q.visualAssetId,x:q.x,y:q.y}))};}

/** Fixed-input offline experience measurement. No AI/door changes or test immunity.
 * Native/physical play remains a separate gate; a caught replay is not a game bug. */
export async function measureV124aPressure(def:StageDefinition,routeIndex:0|1,departureDelay=0){
 const {createPlaygroundState,stepPlayground}=await import('../../src/game/playground/playgroundState');
 const stage=compileStage(def),nav=buildNavigation(stage,9),s=createPlaygroundState(stage);
 const approach=def.testRoutes![routeIndex].points,escape=def.escapeRoutes![0].points,points=[...approach,...escape.slice(1)];
 let leg=1,guardSeconds=0,cameraSeconds=0,overlapSeconds=0,exposedSeconds=0,current=0,longest=0,pickupAt:number|null=null,firstAlertAt:number|null=null;
 const cameraIds=new Set<string>();
 for(let f=0;f<5400&&!s.events.caught&&!s.mission.complete;f++){
  if(s.t>=departureDelay){s.playerMode=leg>=approach.length?3:2;s.player.tx=points[leg].x*TILE;s.player.ty=points[leg].y*TILE;s.player.hasTarget=true;}else s.playerMode=0;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  const guards=s.guards.some(g=>g.canSee),cameras=s.securityCameras.some(c=>c.canSee);
  if(guards)guardSeconds+=1/60;if(cameras){cameraSeconds+=1/60;for(const c of s.securityCameras.filter(c=>c.canSee))cameraIds.add(c.id);}if(guards&&cameras)overlapSeconds+=1/60;
  if(guards||cameras){exposedSeconds+=1/60;current+=1/60;longest=Math.max(longest,current);}else current=0;
  if(s.mission.treasure)pickupAt??=s.t;if(s.events.globalAlert)firstAlertAt??=s.t;
  if(s.t>=departureDelay&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
 }
 const round=(n:number)=>Math.round(n*100)/100;
 return{id:def.id,routeName:def.testRoutes![routeIndex].name,departureDelay,method:'Actual shared stepPlayground/Guard AI/CCTV/door geometry at60Hz; fixed Walk approach, Run escape, no immunity/teleport. OFFLINE, not native.',outcome:s.mission.complete?'CLEAR':s.events.caught?'CAUGHT':'INPUT_LIMITATION',time:round(s.t),leg,pickupAt,firstAlertAt,guardExposureSeconds:round(guardSeconds),cctvExposureSeconds:round(cameraSeconds),combinedExposureSeconds:round(exposedSeconds),overlapSeconds:round(overlapSeconds),longestContinuousExposureSeconds:round(longest),cameraIds:[...cameraIds],lockdown:s.events.lockdownActive,firstPostTheftBreakTiles:round(Math.hypot(def.safeZones![1].x-def.objective!.x,def.safeZones![1].y-def.objective!.y)),entryProtected:true};
}
