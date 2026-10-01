/** Offline authored Museum pass. No runtime tuning, automatic cover scattering or map resizing. */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';

type ZoneSeed=[string,string,number,number,number,number,string,number[],string?];
export interface MuseumDesignZone {id:string;name:string;purpose:string;bounds:{x:number;y:number;w:number;h:number};landmark:string;guardIds:string[];regions?:{x:number;y:number;w:number;h:number}[];exception?:string;}
// Bounds group authored rooms/corridors into teaching beats; walls remain the actual authority.
const ZONES:ZoneSeed[][]=[
 [['Entrance','timing',1,8,5,5,'Lobby partition',[1]],['First Exhibition','vision / route choice',6,1,9,12,'Grand Statue',[1]],['Exit Gallery','objective / escape',12,5,8,6,'Diamond spotlight',[2]]],
 [['Painting Entrance','entry read',1,6,4,5,'Entrance painting',[1],'Small entry uses doorway corner rather than an added obstacle'],['Central Rotunda','safe / risk',5,5,5,7,'Paired rotunda pillars',[1]],['Sculpture / Exit Gallery','objective / escape',10,1,4,14,'Sculpture wing',[2]]],
 [['Staff Access','corner introduction',1,1,4,6,'Dog-leg doorway',[1],'Narrow entry bends itself break LOS'],['Archive Shelves','shelf-end cover',5,4,5,6,'High archive shelves',[1]],['Storage Return','escape choice',8,10,9,3,'Storage shelf',[2]],['Restricted Archive','objective approach',11,6,3,4,'Archive case',[2]]],
 [['Security Office','wait / observe',1,9,5,4,'Office counter',[1]],['Security Hub','patrol timing',6,7,4,6,'Control equipment',[1]],['Junction','timed crossing',8,4,5,3,'CCTV junction',[2],'Short transition: retain timing exposure; corner refuge at west doorway'],['Restricted Passage','objective / escape',12,1,3,8,'Security gate',[3]]],
 [['Entry Gallery','timing',1,7,5,7,'Arrival statue',[1]],['Central Collection','route choice',7,8,4,5,'Paired exhibition islands',[2]],['Restricted Gallery','stealth pressure',7,4,5,4,'Tall partition / pillar',[2]],['Diamond Chamber','objective',12,2,4,7,'Diamond focal point',[3]],['Service Escape','escape',10,10,6,3,'Service partition corner',[2,3]]],
 [['Intake','entry observation',1,7,6,5,'Intake racks',[1]],['Restoration Bay','route choice',7,5,5,9,'Restoration workbench',[1]],['Specimen Storage','objective',7,1,9,3,'Specimen glass case',[3]],['Equipment Aisle','multi route',13,5,4,10,'Large equipment',[2]],['Service Return','escape',7,15,10,3,'Service screens',[2]]],
 [['Private Foyer','branch read',6,1,6,4,'Foyer display',[3]],['Portrait Rooms','investigation / lure',3,5,5,10,'VIP statue',[1]],['VIP Bridge','risky lure crossing',7,9,4,2,'Bridge doorway',[1,3],'Short exposed bridge intentionally offers no central safe island; west/east corners are refuges'],['Private Collection','objective approach',10,5,5,10,'Private display',[2,3]],['Objective Salon / Side Exit','escape circuit',1,15,14,3,'Salon sculpture',[2]]],
 [['Access Hall','entry read',15,7,5,5,'Access desk',[1]],['Security Desk','maintenance bypass',1,7,5,9,'Monitor island',[2]],['Junction','route choice / security pressure',7,6,7,7,'Central security desk',[2]],['Restricted Core','objective / hide',8,1,5,5,'Restricted archive case',[4]],['Escape Route','escape / alternate return',5,14,11,4,'Evacuation desk',[3]]],
 [['Vestibule','entry read',1,1,6,6,'Vestibule display',[1]],['Sculpture Pockets','overlapping LOS',1,7,6,6,'Master sculpture',[1]],['South Collection','safe bypass',1,15,7,5,'Collection islands',[2]],['Middle Gallery','risk shortcut',9,5,7,15,'Centerpiece statue',[3]],['East Exhibition','objective',16,9,4,11,'Master case',[5]],['Portrait Exit','escape',14,1,6,8,'Portrait room pillar',[4]]],
 [['Grand Exhibition','arrival read',9,15,7,8,'Grand statue',[1]],['Service Gallery','escape',1,12,7,8,'Service screen',[2]],['Western Exhibition','safe approach',3,4,6,9,'Western statue',[3]],['Security Area','risk shortcut',11,9,5,6,'Security desk',[4]],['Diamond Chamber','objective / lockdown',11,1,11,7,'Master Diamond',[6]],['Maintenance Circuit','alternate escape',18,9,5,11,'Maintenance equipment',[5]]],
];
export function describeMuseumDesign(def:StageDefinition){
 const seeds=ZONES[(def.mission??0)-1];if(def.chapter!==1||!seeds)throw Error(`Not a Museum mission: ${def.id}`);
 const zones:MuseumDesignZone[]=seeds.map(([name,purpose,x,y,w,h,landmark,guards,exception],i)=>({id:`${def.id}-${String.fromCharCode(65+i)}`,name,purpose,bounds:{x,y,w,h},landmark,guardIds:guards.map(n=>`${def.id}-g${n}`),...(exception?{exception}:{})}));
 if(def.mission===1)zones[1].regions=[{x:6,y:5,w:5,h:8},{x:8,y:1,w:7,h:3},{x:9,y:4,w:2,h:1},{x:13,y:4,w:2,h:1}];
 if(def.mission===5)zones[1].regions=[{x:7,y:8,w:3,h:5},{x:10,y:8,w:1,h:2}];
 if(def.mission===7){zones[1].regions=[{x:3,y:5,w:4,h:10}];zones[4].regions=[{x:3,y:15,w:12,h:3},{x:1,y:6,w:2,h:3}];}
 if(def.mission===8){zones[1].regions=[{x:1,y:7,w:5,h:7},{x:3,y:14,w:2,h:2}];}
 return {missionId:def.id,blueprintId:def.id,zones,
  routePlan:{main:def.testRoutes?.find(r=>r.name.startsWith('main'))??def.testRoutes?.[0],safe:def.testRoutes?.[0],risk:def.testRoutes?.[1],escape:def.escapeRoutes??[]},
  guardRoles:def.guards.map(g=>({id:g.id,role:g.role,theftRole:g.theftRole,anchors:def.patrolRoutes.find(r=>r.id===g.routeId)?.points??[]})),
  // Quantitative witnesses belong to museumHideabilityQA, not authored safety promises.
  reviewStatus:'USER_PLAY_REVIEW_REQUIRED' as const};
}
export function applyMuseumFinalDesign(s:StageDefinition):StageDefinition {
 if(s.chapter!==1)return s;
 if(s.mission===2){
  const p=s.props.find(p=>p.kind==='pillar'&&p.x===6)!,oldX=p.x,oldY=p.y;
  p.x=6.4;p.y=7.65;
  // Landmark and its accent must follow the authored object, not the old coordinates.
  if(s.landmark?.kind===p.kind&&s.landmark.x===oldX&&s.landmark.y===oldY){
   s.landmark.x=p.x;s.landmark.y=p.y;
   for(const light of s.lights)if(light.x===oldX&&light.y===oldY){light.x=p.x;light.y=p.y;}
  }
 }
 if(s.mission===3)s.props.push({kind:'pillar',x:13.5,y:7.1});
 if(s.mission===4){s.props.push({kind:'pillar',x:12.55,y:2.3});const desk=s.props.find(p=>p.kind==='counter'&&p.x===3)!;desk.x=5.95;desk.y=11.6;}
 if(s.mission===5){
  s.title='Restricted Collection';
  s.structurePlan='Entry Gallery → two Central Collection exhibition islands → Restricted Gallery observation pair → Diamond Chamber → cornered Service Escape';
  // Keep the footprint and every existing route. Replace isolated southern divider with a curated
  // left-hand display island, with a paired pillar on the right and an open central axis.
  s.props=s.props.filter(p=>!(p.kind==='partition'&&p.x===8.8&&p.y===11.6));
  s.props.push({kind:'displayCase',x:8.1,y:12.55},
   {kind:'partition',x:8.1,y:5.2}, {kind:'pillar',x:10.55,y:5.2},
   {kind:'pillar',x:15.05,y:6.0}, {kind:'partition',x:14.1,y:10.45});
 }
 if(s.mission===6){const p=s.props.find(p=>p.kind==='partition')!;p.x=14.3;p.y=17.2;}
 if(s.mission===7){
  // Third role is an authored foyer/private collection patrol, not a random roaming point.
  const id='01-07-g3',points=[{x:10.8,y:4,waitDuration:4.5,lookDirection:Math.PI/2,turnDuration:1.1},{x:11.8,y:7.2,waitDuration:2,lookDirection:Math.PI,turnDuration:1.1}];
  s.guards.push({id,routeId:id,x:10.8,y:4,role:'room',theftRole:'zone',theftPosts:points.map(({x,y})=>({x,y})),facing:Math.PI/2,initialFacing:Math.PI/2,pace:s.guards[0].pace,startDelay:3,visionRange:s.guards[0].visionRange,visionHalfAngle:Math.PI/6});
  s.patrolRoutes.push({id,mode:'pingpong',points});
  s.patrolPlan!.zones.push({id:'Z2',name:'Private foyer / collection observation'});
  s.patrolPlan!.anchors.push(...points.map((p,i)=>({id:`2-${i}`,zone:'Z2',subject:'Private foyer / collection doorway',x:p.x,y:p.y,wait:p.waitDuration,look:p.lookDirection})));
  s.patrolPlan!.assignments.push({guardId:id,zones:['Z2'],anchors:['2-0','2-1'],roaming:false});
  s.securityZones!.push({name:'Private foyer / collection observation',x:10.8,y:4,radius:3.5,guardId:id});
 }
 if(s.mission===8){
  // Side-of-aisle structures create occlusion choices without adding a choke to the spine.
  s.props.push({kind:'partition',x:17.65,y:8.65}, {kind:'shelf',x:2.7,y:11.3},
   {kind:'pillar',x:9.15,y:8.35}, {kind:'partition',x:9.1,y:12.3},
   {kind:'pillar',x:11.85,y:5.65}, {kind:'partition',x:9.2,y:3.9},
   {kind:'partition',x:12.35,y:16.35}, {kind:'pillar',x:6.4,y:14.55});
  for(const g of s.guards){
   if(g.id.endsWith('g1')){g.theftRole='zone';g.theftPosts=[{x:16,y:8},{x:18,y:10.5}];}
   if(g.id.endsWith('g2')){g.theftRole='corridor';g.theftPosts=[{x:8,y:8},{x:11,y:11.5}];}
   if(g.id.endsWith('g3')){g.theftRole='exit';g.theftPosts=[{x:9,y:15},{x:14.5,y:16}];}
   if(g.id.endsWith('g4')){g.theftRole='objective';g.theftPosts=[{x:9,y:2.5},{x:11.7,y:3.5}];}
  }
 }
 // Fail generation if any authored player segment or semantic guard anchor becomes blocked.
 const stage=compileStage(s),nav=buildNavigation(stage,BODY.guardRadius);
 for(const route of [...s.testRoutes??[],...s.escapeRoutes??[]])for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i];if(!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,BODY.playerRadius))throw Error(`${s.id} final pass blocks ${route.name}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
 }
 for(const g of s.guards)for(const p of [...s.patrolRoutes.find(r=>r.id===g.routeId)!.points,...g.theftPosts??[]]){
  const path=findPath(nav,g.x*TILE,g.y*TILE,p.x*TILE,p.y*TILE);
  if(path.length<2||!path.every(Number.isFinite)||!clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,stage.movementBlockers,BODY.guardRadius)||Math.hypot(path.at(-2)!-p.x*TILE,path.at(-1)!-p.y*TILE)>1)throw Error(`${s.id} unreachable semantic anchor ${g.id} ${JSON.stringify(p)}`);
 }
 return s;
}
