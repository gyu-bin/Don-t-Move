/** V3 semantic authoring. Existing rooms survive unless their actual portal or coverage fails.
 * This pass must run AFTER applySecurityData: the authored search circuits are the authority.
 * No density filler, random prop placement, engine or presentation changes. */
import baseline from './fixtures/v3MuseumGalleryBefore.json';
import type {V3MissionDesign,V3Zone,ZonePurpose} from './v3DesignSchema';
import type {StageDefinition,PatrolPoint} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath,nodeX,nodeY} from '../../src/game/world/navigation';
import {PROP_KIT} from '../../src/game/world/propKit';
import {BODY} from '../../src/game/guards/guardTuning';
import {describeMuseumDesign} from './museumFinalDesign';
import {describeGalleryDesign} from './galleryEnvironmentDesign';
type P={x:number;y:number};
const p=(x:number,y:number):P=>({x,y});
export const V3_FANTASIES:Record<string,string>={
 '01-01':'Cross the first exhibition behind its grand statue, steal the diamond and leave through the east gallery.',
 '01-02':'Slip around the rotunda sculpture to take the northern artifact, then leave through the southern sculpture wing.',
 '01-03':'Enter staff access, steal a restricted archive record and escape through the storage return.',
 '01-04':'Cross the museum control junction, steal the restricted data and leave through the northern security passage.',
 '01-05':'Steal the diamond inside the restricted collection and escape through the service gallery.',
 '01-06':'Cross the restoration workbench bays to take the specimen, then use the equipment aisle and service return.',
 '01-07':'Infiltrate the private portrait rooms, take the salon artifact and return along the western portrait route.',
 '01-08':'Enter the security core from the east, use the desk junction to reach the restricted archive and leave through the south evacuation circuit.',
 '01-09':'Traverse the sculpture suite to steal the eastern collection artifact and escape through the northern portrait rooms.',
 '01-10':'Steal the master diamond inside its chamber, break search sight through the security junction and western exhibition, and escape through the service gallery.',
 '02-01':'Use the sculpture court to reach the featured painting and leave through the south court.',
 '02-02':'Pass the staggered portrait screens, steal the recessed painting and leave via the northwest spine.',
 '02-03':'Cross the large studio sculpture, steal the east collection painting and escape through the north installation annex.',
 '02-04':'Cross the lower installation to take the modern collection painting and escape through the northern movable wall wing.',
 '02-05':'Choose the west collection or central installation, steal the private painting and return through the service gallery.',
 '02-06':'Read the sealed glass display, time the viewing court patrol, steal the glazed study painting and escape through the east sculpture hall.',
 '02-07':'Enter the visitor foyer, steal the curated collection painting and escape through the crossroads into the northwest curator study.',
 '02-08':'Cross the grand atrium sculpture shoulders, take the eastern masterpiece and escape through the south return.',
 '02-09':'Choose the north salon or private courtyard viewing head, steal the collection painting and escape through the east balcony, with a western service arm as an alternate.',
 '02-10':'Steal the painting displayed in the masterpiece court, cross the searched atrium and escape through the east gallery.',
};
const SHAPES=['eastward reveal','rotunda hook','archive dogleg','northbound checkpoint','restricted/service L','restoration U','portrait return loop','security cross','sculpture deep U','diamond alternate circuit','sculpture south hook','portrait reverse L','studio north dogleg','screen diagonal return','collector split loop','glazed parallel lanes','curator reverse diagonal','atrium south loop','private double loop','masterpiece east circuit'];
export const V3_REBUILT_MUSEUM_GALLERY=['01-01','01-02','01-04','01-05','01-06','01-07','01-08','01-10','02-03','02-04','02-05','02-06','02-07','02-08','02-09','02-10'];
function path(def:StageDefinition,via:P[],radius=BODY.playerRadius+9){
 const stage=compileStage(def),nav=buildNavigation(stage,radius),out:P[]=[via[0]];
 for(let i=1;i<via.length;i++){
  const a=via[i-1],b=via[i],route=findPath(nav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);
  if(route.length<2||Math.hypot(route.at(-2)!/TILE-b.x,route.at(-1)!/TILE-b.y)>.01)throw Error(`${def.id}: V3 inaccessible authored point ${JSON.stringify(b)}`);
  out.push(...Array.from({length:route.length/2},(_,n)=>p(route[n*2]/TILE,route[n*2+1]/TILE)));
 }
 return out;
}
function exit(def:StageDefinition,point:P,edge:NonNullable<StageDefinition['exitEdge']>,via:P[]){
 def.exitPosition=point;def.exitEdge=edge;def.exit={x:point.x-.6,y:point.y-.6,w:1.2,h:1.2};
 def.escapeRoutes=[{name:'escape: '+V3_FANTASIES[def.id],points:path(def,[def.objective!,...via,point])}];
}
function patrol(def:StageDefinition,index:number,via:P[],subject:string){
 const g=def.guards[index],points:PatrolPoint[]=path(def,via,BODY.guardRadius).map((q,i,all)=>({...q,waitDuration:i===0||i===all.length-1?2:0,lookDirection:Math.atan2((all[i+1]??all[0]).y-q.y,(all[i+1]??all[0]).x-q.x),turnDuration:1.1}));
 Object.assign(g,{x:via[0].x,y:via[0].y,facing:points[0].lookDirection,initialFacing:points[0].lookDirection,role:'roaming',theftRole:'roaming',theftPosts:via});
 const route=def.patrolRoutes.find(r=>r.id===g.routeId)!;route.points=points;route.mode='pingpong';
 const zone=def.securityZones?.find(z=>z.guardId===g.id);if(zone)Object.assign(zone,{name:subject,x:g.x,y:g.y});
 if(def.patrolPlan){
  // compileStage prioritizes the semantic plan. Keep that live authority aligned
  // with the navigation route; a data-only patrolRoutes edit would not execute.
  const assignment=def.patrolPlan.assignments.find(a=>a.guardId===g.id)!;
  const old=new Set(assignment.anchors);def.patrolPlan.anchors=def.patrolPlan.anchors.filter(a=>!old.has(a.id));
  const zoneId=`${g.id}-V3-axis`;
  if(!def.patrolPlan.zones.some(z=>z.id===zoneId))def.patrolPlan.zones.push({id:zoneId,name:subject});
  const semantic:PatrolPoint[]=[];
  for(const [i,q] of points.entries()){
   if(i===0||Math.hypot(q.x-semantic.at(-1)!.x,q.y-semantic.at(-1)!.y)>.7)semantic.push(q);
   else if(i===points.length-1){semantic.pop();semantic.push(q);}
  }
  const circuit=[...semantic,...semantic.slice(1,-1).reverse()];
  def.patrolPlan.anchors.push(...circuit.map((q,i)=>({id:`${g.id}-V3-${i}`,zone:zoneId,subject,x:q.x,y:q.y,look:q.lookDirection??0,wait:q.waitDuration??0})));
  assignment.zones=[zoneId];assignment.anchors=circuit.map((_,i)=>`${g.id}-V3-${i}`);assignment.roaming=false;
 }

}
export function applyV3MuseumGallery(source:StageDefinition):StageDefinition{
 if(source.chapter!==1&&source.chapter!==2)return source;
 const def=structuredClone(source);
 if(def.id==='02-03')exit(def,p(15.5,1.6),'top',[p(18,8.5),p(16,5),p(15.5,3)]);
 if(def.id==='02-04')exit(def,p(12,2.6),'top',[p(20,6.5),p(17,6.5)]);
 if(def.id==='02-07')exit(def,p(1.6,3),'left',[p(9,2)]);
 if(def.id==='02-06'){
  // The installation is already central cover; its north and south viewing shoulders
  // now form one explicit timed patrol cell, rather than an unstaffed walking court.
  patrol(def,0,[p(5.75,8.25),p(2,8.5),p(2,14),p(5,11.25)],'West Viewing Hall / glass shoulder / threshold return');
  patrol(def,1,[p(12,7.25),p(17.5,8),p(21,8),p(17.5,16.5),p(12,16.5)],'Viewing Court / east shoulder / south crossing');
 }
 if(def.id==='02-10'){
  // Objective court -> searched atrium -> east gallery creates the required two-zone
  // escape. A west terrace escape remains a distinct longer mastery route.
  const finalWall=def.props.find(v=>v.visualAssetId==='gallery_masterpiece_wall')!;finalWall.x=25.5;finalWall.y=5.8;
  exit(def,p(32.4,24),'right',[p(18,10.5),p(21.5,16.5),p(25,16.5),p(31.5,23)]);
  def.escapeRoutes!.push({name:'escape: portrait terrace / west installation / atrium / east gallery',points:path(def,[def.objective!,p(12.5,5.5),p(6.5,9),p(9,23),p(15,22.5),p(21.5,16.5),p(25,16.5),def.exitPosition!])});
  const artwork=def.props.find(v=>v.kind==='objectiveCase')!;
  artwork.visualAssetId='gallery_low_pedestal';
  const wall=def.props.find(v=>v.visualAssetId==='gallery_masterpiece_wall')!;
  wall.x=25.5;wall.y=5.8;
  def.landmark={name:'Masterpiece Wall — objective court climax',kind:wall.kind,x:wall.x,y:wall.y};
  const stage=compileStage(def);
  for(const r of [...def.testRoutes??[],...def.escapeRoutes??[]])if(r.points.some((b,i)=>i>0&&!clearSegment(r.points[i-1].x*TILE,r.points[i-1].y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,18)))r.points=path(def,r.points,18);
 }
 if(def.id==='02-09'){
  // An exterior private courtyard makes the collection a real U-shaped building:
  // the installation overlooks it; west/east balconies are separate return arms.
  const floor=def.layout.map(row=>[...row].map(c=>c==='.'));
  for(let y=19;y<floor.length;y++)for(let x=12;x<18;x++)floor[y][x]=false;
  def.layout=floor.map((row,y)=>row.map((v,x)=>v?'.':[-1,0,1].some(dy=>[-1,0,1].some(dx=>floor[y+dy]?.[x+dx]))?'#':' ').join(''));
  def.dressing=def.dressing?.map(c=>({...c,items:c.items.filter(q=>!(q.x>=12&&q.x<18&&q.y>=19))}));
  const installation=def.props.find(q=>q.visualAssetId==='gallery_installation_art')!;
  installation.y=19; // Flush courtyard parapet; no enticing subdiameter rear gap.
  const westBase=def.props.find(q=>q.visualAssetId==='gallery_central_plinth'&&q.y>20)!;
  westBase.x=9.765; // Left-wall flush; full-width right balcony traversal remains.
  def.landmark={name:'Private Collection courtyard installation',kind:installation.kind,x:installation.x,y:installation.y};
  def.structurePlan='Reception → West Collection / North Salon → private courtyard viewing head → East Exhibition → East Private Return; west service balcony is the alternate courtyard arm';
  const stage=compileStage(def);
  for(const r of [...def.testRoutes??[],...def.escapeRoutes??[]]){
   const via=r.points.filter((q,i)=>i===0||i===r.points.length-1||clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,18));
   r.points=path(def,via,18);
  }
 }
 // Actual120s moving-vision review found these were open viewing lanes, rather
 // than shelter: extend existing exhibition axes, preserving objective inspectors.
 if(def.id==='02-04'){
  patrol(def,0,[p(14.75,16.25),p(18,13),p(11,12.5),p(11.75,18.75)],'Lower Installation / screen end / crossing');
  patrol(def,1,[p(13.75,7.75),p(17,9),p(17,4),p(10,4)],'Movable Wall Wing / north viewing lane');
 }
 if(def.id==='02-05'){
  patrol(def,1,[p(15.75,14.75),p(18,9),p(12,9),p(12,18),p(23,18)],'Collector Atrium / north crossing / service junction');
 }
 if(def.id==='02-07'){
  patrol(def,0,[p(6.25,16.25),p(8,12),p(8,8),p(3.25,18.75)],'Public Portrait Wing / east viewing shoulder');
  patrol(def,2,[p(16.75,10.25),p(19,5),p(12,5),p(19,12),p(23,18)],'Installation Crossroads / collection return junction');
 }
 if(def.id==='02-08'){
  patrol(def,0,[p(16.75,4.25),p(11,3),p(22,5)],'North Art Terrace / full viewing axis');
  patrol(def,1,[p(19.5,14.5),p(12,10),p(22,10),p(22,18),p(16,19)],'Grand Atrium / paired sculpture shoulders');
  patrol(def,2,[p(29.75,10.75),p(29,18),p(29,24),p(20,24)],'East Collection / South Return transition');
 }
 if(def.id==='02-09')patrol(def,2,[p(19,21),p(18.5,17.5),p(12,18),p(11,21)],'Courtyard viewing head / east private balcony / west service balcony');
 if(def.id==='02-10'){
  patrol(def,1,[p(8.75,5.25),p(10.5,8),p(12.5,5),p(17,5)],'Portrait Terrace / masterpiece approach junction');
  patrol(def,3,[p(18.25,16.75),p(22,13),p(21,17),p(15,19)],'Atrium Crossing / east escape decision');
 }
 // Search is authored from actual meaningful room thresholds, never player tracking.
 if(def.chapter===2&&V3_REBUILT_MUSEUM_GALLERY.includes(def.id)){
  const zones=describeGalleryDesign(def).zones,stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
  const anchors=zones.map(z=>{
   const center=p(z.bounds.x+z.bounds.w/2,z.bounds.y+z.bounds.h/2);
   const candidates=(def.testRoutes??[]).flatMap(r=>r.points).concat((def.escapeRoutes??[]).flatMap(r=>r.points));
   return candidates.filter(q=>q.x>=z.bounds.x&&q.x<=z.bounds.x+z.bounds.w&&q.y>=z.bounds.y&&q.y<=z.bounds.y+z.bounds.h&&clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,BODY.guardRadius)).sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y))[0];
  }).filter((v):v is P=>!!v);
  for(const [i,g] of def.guards.entries()){
   const ring=anchors.map((_,j)=>anchors[(j+i)%anchors.length]).filter(q=>{const r=findPath(nav,g.x*TILE,g.y*TILE,q.x*TILE,q.y*TILE);return r.length>=2&&Math.hypot(r.at(-2)!/TILE-q.x,r.at(-1)!/TILE-q.y)<.01;});
   g.theftSearchSectors=[{id:`${g.id}: V3 adjacent exhibition and junction sweep`,anchors:ring},{id:`${g.id}: V3 objective and escape recheck`,anchors:[def.objective!,def.exitPosition!]}];
  }
 }
 if(def.chapter===1){
  // Reference paths now certify the full18px Tilt envelope. Keep their authored room
  // sequence; only route corners/portal offsets that clip that envelope move.
  const stage=compileStage(def),nav=buildNavigation(stage,18);
  const nodes=nav.walkable.flatMap((v,i)=>v?[p(nodeX(nav,i)/TILE,nodeY(nav,i)/TILE)]:[]);
  const clear=(q:P)=>clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,18);
  const adjust=(q:P)=>clear(q)?q:nodes.filter(n=>Math.hypot(n.x-q.x,n.y-q.y)<.7).sort((a,b)=>Math.hypot(a.x-q.x,a.y-q.y)-Math.hypot(b.x-q.x,b.y-q.y))[0]??q;
  const entry=adjust(def.entryPosition!),exitPoint=adjust(def.exitPosition!);
  def.entryPosition=entry;Object.assign(def.playerSpawn,entry);def.exitPosition=exitPoint;def.exit={...def.exit!,x:exitPoint.x-.6,y:exitPoint.y-.6};
  for(const r of [...def.testRoutes??[],...def.escapeRoutes??[]]){
   if(r.points.some((b,i)=>!clear(b)||i>0&&!clearSegment(r.points[i-1].x*TILE,r.points[i-1].y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,18)))r.points=path(def,r.points.map(adjust),18);
  }
 }
 return def;
}
type Bounds={x:number;y:number;w:number;h:number};
type SafetyIntent={reason:string;bounds?:Bounds;wholeRoom?:boolean};
/** Explicit local design permissions. Never inferred from absent patrol waypoints. */
const SAFETY_INTENTS:Record<string,SafetyIntent>={
 '01-01/Entrance':{reason:'Lobby threshold read before the grand-statue crossing; limited to the arrival pocket.'},
 '01-02/Painting Entrance':{reason:'Painting entrance doorway read before the rotunda patrol; limited to the arrival pocket.'},
 '01-03/Staff Access':{reason:'Staff-access dog-leg arrival pauses behind the architectural bend before the shelf aisle.'},
 '01-04/Security Office':{reason:'Office entry read before the control-desk crossing; the rest of the office is not exempt.'},
 '01-05/Service Escape':{reason:'Partition-corner LOS refuge while choosing the last service turn; open service travel remains exposed.',bounds:{x:14.8,y:11.1,w:.7,h:1.2}},
 '01-06/Intake':{reason:'Intake-rack threshold read before entering the restoration workbench bay.'},
 '01-08/Security Desk':{reason:'West maintenance shelf recess offers a short LOS-break interval; the entire security-desk room is not safe.',bounds:{x:1.4,y:11.5,w:1.3,h:1.7}},
 '01-09/Vestibule':{reason:'Vestibule threshold read before the sculpture pockets; limited to the arrival pocket.'},
 '02-01/Arrival':{reason:'Arrival screen/door pocket lets the player observe the sculpture-court timing before committing.'},
 '02-02/Reception':{reason:'Reception doorway read precedes the staggered portrait spine; limited to the arrival pocket.'},
 '02-03/Studio Entrance':{reason:'Studio entrance screen pocket establishes the large sculpture and its patrol before the crossing.'},
 '02-04/Arrival':{reason:'Modern-wing arrival screen gives a local observation pause before the lower installation patrol.'},
 '02-05/Reception':{wholeRoom:true,reason:'The reception is an intentionally protected collection-reading room: its central exhibit screen frames the west-collection versus atrium choice before both guarded thresholds. No normal patrol is assigned inside; authored theft search revisits the reception route anchor.'},
 '02-07/Visitor Foyer':{reason:'Visitor-foyer door pocket offers an initial public-wing versus crossroads read.'},
 '02-08/West Arrival':{wholeRoom:true,reason:'The west arrival is an intentionally protected exhibition-reading room. Its central screen shelters the choice between the north connector and the atrium crossing; normal security starts beyond those thresholds. Authored theft search revisits its arrival route anchor.'},
 '02-09/Reception':{wholeRoom:true,reason:'The private reception is a deliberately calm reading room before the salon/courtyard branch. Its display screen makes the two outgoing routes visible while pressure begins in the west collection and courtyard balcony; authored theft search revisits the reception route anchor.'},
 '02-09/Private Return':{reason:'Return-door/bench corner is a local recovery pocket after the private balcony crossing; the remaining return lane is not exempt.',bounds:{x:28.8,y:21.2,w:.7,h:1.4}},
 '02-10/South Entrance':{reason:'South entrance screen/door pocket establishes the west installation versus atrium choice before the heist.'},
};
export function explicitV3SafetyIntent(def:StageDefinition,zone:{name:string;bounds:Bounds}):SafetyIntent|undefined{
 const intent=SAFETY_INTENTS[`${def.id}/${zone.name}`];if(!intent)return undefined;
 if(intent.bounds)return {...intent,bounds:{...intent.bounds}};
 if(intent.wholeRoom)return {...intent,bounds:{...zone.bounds}};
 const entry=def.entryPosition??def.playerSpawn,b=zone.bounds;
 if(entry.x<b.x||entry.x>b.x+b.w||entry.y<b.y||entry.y>b.y+b.h)return undefined;
 const x=Math.max(b.x,entry.x-.65),y=Math.max(b.y,entry.y-.65);
 return {reason:intent.reason+' This authoring intent is an arrival/refuge interval, not perpetual safety.',bounds:{x,y,w:Math.min(b.x+b.w,entry.x+.65)-x,h:Math.min(b.y+b.h,entry.y+.65)-y}};
}
export function describeV3MuseumGallery(def:StageDefinition){
 const description=def.chapter===1?describeMuseumDesign(def):describeGalleryDesign(def);
 const entry=def.entryPosition??def.playerSpawn,objective=def.objective!,exitPoint=def.exitPosition!;
 const routes=[...(def.testRoutes??[]),...(def.escapeRoutes??[])];
 const zones=description.zones.map(z=>{
  const b=z.bounds,inside=(q:P)=>q.x>=b.x&&q.x<=b.x+b.w&&q.y>=b.y&&q.y<=b.y+b.h;
  const coveredByGuard=def.guards.filter(g=>def.patrolRoutes.find(r=>r.id===g.routeId)?.points.some(inside)).map(g=>g.id);
  const coveredByCCTV=(def.cameras??[]).filter(c=>inside(c)).map(c=>c.id);
  const safetyIntent=explicitV3SafetyIntent(def,z),intentionallySafe=!!safetyIntent;
  return {...z,...(def.id==='02-09'&&z.name==='Central Collection'?{name:'Private Courtyard Galleries',purpose:'viewing-head junction / separated balcony service arms'}:{}),coveredByGuard,coveredByCCTV,intentionallySafe,safeReason:safetyIntent?.reason,intentionalSafeBounds:safetyIntent?.bounds,routeWitnesses:routes.filter(r=>r.points.some(inside)).map(r=>r.name)};
 });
 return {missionId:def.id,missionFantasy:V3_FANTASIES[def.id],decision:V3_REBUILT_MUSEUM_GALLERY.includes(def.id)?'targeted semantic rebuild':'preserve authored architecture',reason:V3_REBUILT_MUSEUM_GALLERY.includes(def.id)?'Portal separation / purposeful viewing coverage / two-zone final escape':'Existing architecture has central gameplay, legible route decisions and related route or objective landmark',entry,objective,exit:exitPoint,routeTopology:{entrySide:def.entryEdge,objectiveRegion:def.id==='01-01'?'East Objective Room':zones.find(z=>objective.x>=z.bounds.x&&objective.x<z.bounds.x+z.bounds.w&&objective.y>=z.bounds.y&&objective.y<z.bounds.y+z.bounds.h)?.name,exitSide:def.exitEdge,routeShape:SHAPES[(def.chapter!-1)*10+def.mission!-1],escapeDirection:Math.atan2(exitPoint.y-objective.y,exitPoint.x-objective.x)},zones,landmark:{...def.landmark,relation:def.id==='02-10'?'Objective displayed in this court; its screens frame the theft and escape transition':'Route landmark: shapes a major route decision, LOS break or restricted checkpoint on the approach'},coverChain:def.props.filter(v=>!['lamp','painting','plant','cctv','objectiveCase'].includes(v.kind)).map(v=>({kind:v.kind,x:v.x,y:v.y,reason:'Authored exhibit / architectural shoulder along the existing room circulation'})),safeRoute:def.testRoutes?.[0],riskRoute:def.testRoutes?.[1],escapeRoute:def.escapeRoutes,guardRoles:def.guards.map(g=>({id:g.id,role:g.role,searchSectors:g.theftSearchSectors})),reviewStatus:'DEBUG_OFF_VISUAL_AND_USER_REVIEW_REQUIRED'};
}

const FAILURES:Record<string,string[]>={
 '01-01':['Entry and exit portal reference points clipped radius18 wall margin.'],
 '01-02':['Entry portal reference point clipped radius18 wall margin.'],
 '01-04':['Entry portal and control-room route corners clipped radius18 margin.'],
 '01-05':['Restricted gallery observation route clipped radius18 cover margin.'],
 '01-06':['Service return reference corners clipped radius18 equipment margin.'],
 '01-07':['Risk route diagonal clipped radius18 corner margin.'],
 '01-08':['Rear staff circulation diagonal clipped radius18 margin.'],
 '01-10':['Grand exhibition/diamond approach route diagonals clipped radius18 margin.'],
 '02-03':['Entry/exit distance 1.55 tiles: same studio entrance; north annex not used by escape.'],
 '02-04':['Entry/exit distance 1.55 tiles: same arrival door; lower/upper screen wings have no independent exit.','Open viewing axes outside short local patrols:19.9tiles uncovered travel.'],
 '02-05':['Collector Atrium north viewing lane and service junction outside its local2point patrol.'],
 '02-08':['Grand Atrium open north crossing and terrace only covered by local diagonals; South Return lacked an assigned normal patrol.'],
 '02-06':['Central Viewing Court patrol remained a short local line; north/south installation shoulders lacked one coherent timing challenge.'],
 '02-07':['Entry/exit distance 4 tiles: both south foyer; curator study had no escape transition.','Long public-wing and crossroads viewing axes outside local patrols:35tiles uncovered travel.'],
 '02-09':['Gallery07/08/09 broad boxed silhouettes repeated: private collection lacked an actual separate courtyard/service architecture.'],
 '02-10':['Masterpiece landmark was distant from the northeast collectible; objective required a nearby real artwork backdrop.','East Escape Gallery was optional despite its escape identity; shortest escape returned from objective directly to north terrace, omitting atrium.'],
};
function classify(name:string):ZonePurpose[]{
 if(/Chamber|Featured|Specimen|Restricted Archive|East Exhibition|Private Exhibition|Glazed Study|Curated Collection|Masterpiece Court/.test(name))return ['objective','security-check'];
 if(/Escape|Return|Exit|Service/.test(name))return ['escape','chase-break'];
 if(/Junction|Crossroads|Bridge|Security/.test(name))return ['junction','security-check'];
 if(/Entrance|Arrival|Foyer|Access|Vestibule|Threshold|Reception|Intake/.test(name))return ['approach','observation'];
 return ['safe-risk-choice','timing'];
}
export function v3ZoneFeatures(def:StageDefinition,zone:{bounds:Bounds;coveredByGuard:string[];coveredByCCTV:string[]}):V3Zone['features']{
 const b=zone.bounds,inside=(q:P)=>q.x>=b.x&&q.x<=b.x+b.w&&q.y>=b.y&&q.y<=b.y+b.h;
 const structural=def.props.filter(q=>inside(q)&&(PROP_KIT[q.kind].cover||PROP_KIT[q.kind].blocksVision));
 const legs=[...def.testRoutes??[],...def.escapeRoutes??[]].map(r=>r.points.filter(inside)).filter(points=>points.length>1&&points.some(q=>Math.hypot(q.x-points[0].x,q.y-points[0].y)>1));
 const signatures=new Set(legs.map(points=>{const forward=JSON.stringify(points),reverse=JSON.stringify([...points].reverse());return forward<reverse?forward:reverse;}));
 const security=zone.coveredByGuard.length>0||zone.coveredByCCTV.length>0;
 return [...(security?['security-pressure' as const]:[]),...(structural.length&&legs.length?['cover-interaction' as const]:[]),...(structural.length&&security?['LOS-challenge' as const]:[]),...(legs.length?['meaningful-traversal' as const]:[]),...(signatures.size>1?['route-choice' as const]:[]),...(def.landmark&&inside(def.landmark)?['landmark' as const]:[]),...(def.objective&&inside(def.objective)?['objective' as const]:[])];
}
export function v3MuseumGalleryDesign(def:StageDefinition):V3MissionDesign{
 const d=describeV3MuseumGallery(def);
 const zones:V3Zone[]=d.zones.map(z=>({id:z.id,name:z.name,purpose:classify(z.name),bounds:z.bounds,
  features:v3ZoneFeatures(def,z),
  guardIds:z.coveredByGuard,cameraIds:z.coveredByCCTV,
  ...(z.intentionallySafe?{intentionalSafeReason:z.safeReason,intentionalSafeBounds:z.intentionalSafeBounds}:{}),
  ...(def.id==='02-09'&&z.name==='Private Courtyard Galleries'?{cells:[{name:'Installation viewing head',purpose:'junction' as const,point:p(15.8,17)},{name:'West service balcony',purpose:'service-route' as const,point:p(11,21)},{name:'East private balcony',purpose:'escape' as const,point:p(19,21)}]}:{})}));
 const structureReasons=def.props.filter(v=>!['lamp','painting','plant','bench','cctv','objectiveCase','statuePedestal'].includes(v.kind)).map(v=>{
  const zone=zones.find(z=>v.x>=z.bounds.x&&v.x<=z.bounds.x+z.bounds.w&&v.y>=z.bounds.y&&v.y<=z.bounds.y+z.bounds.h);
  const reason=v.kind==='statue'?'Curated sculptural island: two shoulders create a visible bypass and break guard LOS.':v.kind==='partition'?'Exhibition screen: separates viewing/crossing lanes and makes its open ends the route decision.':v.kind==='shelf'?'Archive storage bank: interrupts the long aisle and supplies shelf-end refuge.':v.kind==='counter'?'Museum control desk: checkpoint overview with a protected back and a flank.':v.kind==='equipment'?(def.chapter===2?'Art installation: divides its viewing court into crossing and observation shoulders.':'Museum restoration/security equipment: separates work/access lanes.'):v.kind==='pillar'?'Architectural column: an intermediate LOS break on the room circulation.':v.kind.startsWith('galleryGlass')?'Continuous sealed display boundary: communicates an inaccessible exhibit bay.':'Collection display: a curated room anchor and short LOS break.';
  return {kind:v.kind,point:p(v.x,v.y),reason:`${zone?.name??'Connecting passage'}: ${reason}`};
 });
 const relation=def.id==='01-05'||def.id==='01-10'||def.id==='02-10'?'objective' as const:/Security/.test(def.landmark?.name??'')?'checkpoint' as const:'route-decision' as const;
 return {id:def.id,missionFantasy:d.missionFantasy,architecture:def.structurePlan??def.title,topology:{...d.routeTopology,entrySide:d.routeTopology.entrySide??'authored',exitSide:d.routeTopology.exitSide??'authored',objectiveRegion:d.routeTopology.objectiveRegion??'objective threshold',escapeDirection:`toward ${def.exitEdge} via ${def.escapeRoutes?.[0]?.name}`},entry:d.entry,objective:p(d.objective.x,d.objective.y),exit:d.exit,zones,
 landmark:{name:def.landmark?.name??def.title,point:p(def.landmark!.x,def.landmark!.y),relation,reason:relation==='objective'?'The collectible lies inside the named chamber/court; this focal structure frames the theft interaction.':relation==='checkpoint'?'The control structure anchors the security junction that both approach and escape cross.':'This visible exhibit controls a major safe/risk shoulder on the critical approach.'},
 coverChain:structureReasons.map(v=>({name:v.kind,point:v.point,reason:v.reason})),structureReasons,
 guardRoles:def.guards.map(g=>({id:g.id,role:g.role??'room',zones:zones.filter(z=>z.guardIds.includes(g.id)).map(z=>z.id)})),
 cctv:(def.cameras??[]).map(c=>({id:c.id,mountContext:'Attached to the authored wall face at a security intersection or exhibition threshold.',counterplay:'Observe the sweep from the adjacent exhibit/doorway shoulder; pass during its look-away interval.'})),
 searchSectors:def.guards.map(g=>({guardId:g.id,zones:zones.filter(z=>g.theftSearchSectors?.some(s=>s.anchors.some(q=>q.x>=z.bounds.x&&q.x<=z.bounds.x+z.bounds.w&&q.y>=z.bounds.y&&q.y<=z.bounds.y+z.bounds.h))).map(z=>z.id)})),
 changes:FAILURES[def.id]?.map(v=>'Resolved: '+v)??[],baselineFailures:FAILURES[def.id]??[]};
}
/** Convenient baseline authoring manifest; final QA regenerates it from freshly built definitions. */
export const MUSEUM_GALLERY_V3_DESIGNS:V3MissionDesign[]=(baseline as StageDefinition[]).slice(0,20).map(d=>v3MuseumGalleryDesign(applyV3MuseumGallery(d)));
