/** V12 offline, authored 30→15 rebuild. No runtime AI/input/speed changes. */
import type {StageDefinition,PropDef,GuardDef} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment,buildNavigation,findPath} from '../../src/game/world/navigation';
import {authoredRoute} from './curatedHeistFlows';
import blueprint from '../../docs/design/v12/CHAPTER_01_03_PLAN.json';
type Point={x:number;y:number};type Rect=[number,number,number,number];
type Plan={id:string;source:string;rooms:Rect[];islands:Rect[];entry:Point;goal:Point;exit:Point;safe:Point[];risk:Point[];escape:Point[];patrols:Point[][];camera?:Point;glass?:Point[];subjects:string[]};
const p=(x:number,y:number):Point=>({x,y});
/** Explicit room/route authoring. Rectangle union is construction, not procedural difficulty. */
export const V12_PLANS:Plan[]=[
 {id:'01-02',source:'01-02',rooms:[[1,5,18,10],[6,1,10,5],[17,3,6,9],[15,3,4,3]],islands:[[8,8,3,3],[15,5,1,3]],entry:p(2,12),goal:p(19.5,5),exit:p(21.5,10.5),safe:[p(4,13),p(6,6.5),p(12,3),p(17,3.8)],risk:[p(18,8.5)],escape:[p(18,9),p(21.5,10.5)],patrols:[[p(5,8),p(5,11),p(12,12.5)],[p(21,4),p(21,7.8)]],subjects:['Rotunda sculpture','Private collection salon','East loggia']},
 {id:'01-03',source:'01-03',rooms:[[1,8,9,7],[7,3,9,10],[14,1,8,8],[17,7,5,8]],islands:[[9,6,1,4],[14,5,1,4],[17,5,3,1]],entry:p(2,12),goal:p(18,3),exit:p(20.5,13.5),safe:[p(5,13),p(8,11),p(8,4.5),p(12,4.5),p(16,2.8)],risk:[p(8.75,5.25)],escape:[p(16,8.5),p(20,9.5)],patrols:[[p(6,10),p(6,13),p(11.5,11)],[p(20.5,2.5),p(20.5,6)]],subjects:['Broad archive shelf bays','Conservation benches','Staff return']},
 {id:'01-04',source:'01-04',rooms:[[1,9,8,7],[6,4,11,9],[15,1,8,9],[18,8,5,8]],islands:[[10,7,2,2],[16,5,1,3]],entry:p(2,13),goal:p(19,3),exit:p(21,14.5),safe:[p(4,14),p(7.5,11),p(7.5,5.5),p(14,5),p(16,3)],risk:[p(18,8.5)],escape:[p(18,8.5),p(21,11)],patrols:[[p(8,10.5),p(14,10.5),p(14,6)],[p(21,2.5),p(21,7)]],camera:p(7,5),subjects:['Security office','Control hub','Outbound inspection bay']},
 {id:'01-05',source:'01-10',rooms:[[1,9,8,7],[6,5,10,10],[14,1,10,10],[19,9,5,7],[8,13,15,4]],islands:[[10,8,2,3],[16,5,1,3],[19,5,3,1]],entry:p(2,13),goal:p(20,3),exit:p(10,15.5),safe:[p(5,14),p(7.5,6.5),p(13,6.5),p(15,3)],risk:[p(19,8.5)],escape:[p(18,8.8),p(21.5,12),p(17,15)],patrols:[[p(7.5,10.5),p(7.5,7),p(13,7)],[p(22,2.5),p(22,7.5)]],subjects:['Sculpture promenade','Warm sanctuary','Separate service cloister']},
 {id:'02-01',source:'02-03',rooms:[[1,9,9,8],[7,3,13,12],[17,1,8,8],[21,7,5,10]],islands:[[11,8,3,3],[18,4,1,3]],entry:p(2,14),goal:p(22,3),exit:p(24,15),safe:[p(5,15),p(8.5,5),p(16,5),p(18,2.5)],risk:[p(21,8)],escape:[p(20.5,8),p(24,10)],patrols:[[p(9,7),p(9,12.5),p(16,12.5)],[p(23.5,2),p(23.5,6.5)]],subjects:['Commissioned sculpture court','Two-sided sculpture island','East installation annex']},
 {id:'02-03',source:'02-04',rooms:[[1,1,9,9],[7,6,11,9],[1,12,9,8],[16,10,10,10],[11,16,7,4]],islands:[[11,8,1,3],[5,14,1,3],[19,14,2,2]],entry:p(2,3),goal:p(3,17),exit:p(24,17),safe:[p(4,7.5),p(8.5,8),p(8.5,14),p(7.5,18)],risk:[p(3,13)],escape:[p(3,13),p(8.5,13),p(13,18),p(17.5,18),p(23,18)],patrols:[[p(14.5,8),p(14.5,13),p(8.5,11)],[p(2,14),p(2,18.5)]],camera:p(24,11),subjects:['Staggered movable-screen wing','Curator collection','Installation return court']},
 {id:'02-04',source:'02-06',rooms:[[1,10,9,9],[7,3,14,13],[18,1,8,8],[22,7,5,12]],islands:[[12,10,2,2],[19,4,1,3]],entry:p(2,16),goal:p(23,3),exit:p(25,17),safe:[p(5,17),p(8.5,6),p(17,5),p(19,2.5)],risk:[p(22,8)],escape:[p(21,8),p(25,11)],patrols:[[p(9,7),p(9,14),p(17,14)],[p(24.5,2),p(24.5,6.5)]],camera:p(8,4),glass:[p(13.5,7.5),p(16.5,10)],subjects:['Glazed central installation','Opaque perimeter viewing shoulders','East sculpture return']},
 {id:'02-05',source:'02-10',rooms:[[1,10,9,8],[7,4,13,13],[17,1,10,9],[22,8,5,11],[9,15,17,5]],islands:[[12,9,3,3],[19,5,1,3],[23,5,3,1]],entry:p(2,15),goal:p(24,3),exit:p(11,18),safe:[p(5,16),p(8.5,6),p(16,6),p(18,3)],risk:[p(22,8.5)],escape:[p(21,8.5),p(24.5,13),p(19,18)],patrols:[[p(9,8),p(9,13),p(17,13)],[p(25.5,2),p(25.5,7)]],camera:p(8,5),subjects:['Grand commissioned atrium','Masterpiece recess','Independent collection return']},
 {id:'03-01',source:'03-01',rooms:[[1,9,10,9],[8,3,11,13],[17,1,9,8],[22,7,5,11]],islands:[[12,9,2,3],[19,4,1,3]],entry:p(2,15),goal:p(23,3),exit:p(25,16),safe:[p(5,16),p(9.5,5),p(16,5),p(18,2.5)],risk:[p(22,8)],escape:[p(21,8),p(25,11)],patrols:[[p(6,11),p(6,15),p(10,15)],[p(10,6),p(16,6),p(16,13)],[p(24.5,2),p(24.5,6.5)]],camera:p(9,4),subjects:['PUBLIC queue','STAFF teller verification','SECURITY asset and dispatch']},
 {id:'03-02',source:'03-03',rooms:[[1,11,9,8],[7,7,10,10],[14,2,12,10],[21,10,5,9],[9,16,15,4]],islands:[[10,10,1,4],[17,6,1,3],[21,3,1,3]],entry:p(2,16),goal:p(24,4),exit:p(11,18.5),safe:[p(5,17),p(8.5,9),p(13,9),p(15.5,4),p(19,4),p(19,2.8),p(24,2.8)],risk:[p(24,8)],escape:[p(23.5,8.5),p(23.5,13),p(19,18)],patrols:[[p(6,13),p(6,17),p(9,17)],[p(12.5,9),p(12.5,14),p(16,14)],[p(24.5,6),p(19,10)]],camera:p(15,3),subjects:['Staggered staff offices','Records bank','Secure audit alcove and dispatch']},
 {id:'03-03',source:'03-05',rooms:[[1,9,9,10],[7,3,14,14],[18,1,9,9],[23,8,5,11]],islands:[[11,9,2,3],[17,5,1,4],[21,4,1,3]],entry:p(2,16),goal:p(25,3),exit:p(26,17),safe:[p(5,17),p(8.5,5),p(15,5),p(18.5,2.5),p(23,2.5)],risk:[p(22,8.5)],escape:[p(23,8.5),p(26,12)],patrols:[[p(6,11),p(6,16),p(9,16)],[p(9,7),p(15,7),p(15,13)],[p(25.5,6),p(23,9)]],camera:p(8,4),subjects:['PUBLIC deposit reception','Twin access lanes','SECURITY deposit-wall landmark']},
 {id:'03-04',source:'03-08',rooms:[[1,12,9,8],[7,7,11,11],[1,3,9,9],[15,1,12,10],[22,9,6,11]],islands:[[11,11,2,3],[5,6,1,3],[19,5,1,3]],entry:p(2,17),goal:p(24,3),exit:p(26,18),safe:[p(4,13),p(3,10),p(3,4.5),p(8.5,4.5),p(8.5,8.5),p(16,8.5),p(16,3),p(18,3)],risk:[p(22,9)],escape:[p(21,9),p(26,13)],patrols:[[p(8.5,10),p(8.5,15),p(15,15)],[p(3,10),p(7.5,10),p(7.5,5)],[p(25.5,2),p(25.5,7.5)]],camera:p(16,2),subjects:['PUBLIC credential read bay','STAFF analyst bypass','SECURITY command island and audit exit']},
 {id:'03-05',source:'03-10',rooms:[[1,15,9,8],[7,10,11,12],[7,2,11,10],[16,1,13,10],[24,9,6,14],[10,20,18,5]],islands:[[11,14,2,3],[11,6,2,2],[20,5,1,3]],entry:p(2,20),goal:p(26,3),exit:p(12,23),safe:[p(5,21),p(8.5,18),p(8.5,4),p(15,4),p(18,3)],risk:[p(23,9)],escape:[p(22,9),p(27,14),p(26,22),p(19,23)],patrols:[[p(9,13),p(9,19),p(15,19)],[p(9,4),p(15,4),p(15,9)],[p(27.5,2),p(27.5,8)]],camera:p(8,3),subjects:['PUBLIC access and STAFF checkpoint','SECURITY antechamber','VAULT masterpiece','Cash processing and records evacuation']},
];
const metadata=new Map(blueprint.missions.map(m=>[m.id,m]));
export function v12Layout(rooms:Rect[],islands:Rect[]):string[]{
 const floor=new Set<string>();for(const[x,y,w,h]of rooms)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)floor.add(`${xx},${yy}`);
 for(const[x,y,w,h]of islands)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)floor.delete(`${xx},${yy}`);
 const cols=Math.max(...rooms.map(r=>r[0]+r[2]))+1,rows=Math.max(...rooms.map(r=>r[1]+r[3]))+1;
 return Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>floor.has(`${x},${y}`)?'.':[-1,0,1].some(dy=>[-1,0,1].some(dx=>floor.has(`${x+dx},${y+dy}`)))?'#':' ').join(''));
}
function security(def:StageDefinition,plan:Plan,source:StageDefinition[]){
 const baseline=source.find(d=>d.id===`${String(def.chapter).padStart(2,'0')}-01`)!;
 def.patrolPlan=undefined;def.guards=[];def.patrolRoutes=[];def.securityZones=[];
 plan.patrols.forEach((stops,i)=>{
  const id=`${def.id}-g${i+1}`,objective=i===plan.patrols.length-1;
  const archetype=baseline.guards[Math.min(i,baseline.guards.length-1)];
  const facing=objective?Math.atan2(def.objective!.y-stops[0].y,def.objective!.x-stops[0].x):0;
  const guard:GuardDef={id,...stops[0],facing,initialFacing:facing,routeId:id,role:objective?'objective':i===0?'room':'corridor',theftRole:objective?'objective':i===0?'zone':'corridor',pace:archetype.pace,visionRange:archetype.visionRange,visionHalfAngle:archetype.visionHalfAngle,startDelay:i*2,
   theftPosts:stops.slice(0,2),theftSearchSectors:[{id:`${id}: local authored inspection`,anchors:stops}]};
  def.guards.push(guard);
  def.securityZones!.push({name:objective?`Objective inspection: ${metadata.get(def.id)!.objective}`:`${plan.subjects[Math.min(i,plan.subjects.length-1)]}: ${guard.role} patrol`,...stops[0],radius:Math.max(...stops.map(q=>Math.hypot(q.x-stops[0].x,q.y-stops[0].y)))+(guard.visionRange??0),guardId:id});
  const route=authoredRoute(def,[...stops,stops[0]],9).slice(0,-1);
  def.patrolRoutes.push({id,mode:'pingpong',points:route.map(q=>({...q,waitDuration:stops.some(a=>Math.hypot(a.x-q.x,a.y-q.y)<.01)?1.5:0,turnDuration:0,lookDirection:objective?Math.atan2(def.objective!.y-q.y,def.objective!.x-q.x):Math.PI/2}))});
 });
 const cameraTemplate=source.flatMap(d=>d.chapter===def.chapter?d.cameras??[]:[])[0];
 def.cameras=plan.camera&&cameraTemplate?[{...cameraTemplate,id:`${def.id}-cam1`,...plan.camera,centerFacing:Math.PI/2}]:[];
}
function firstBreak(def:StageDefinition):Point{
 const stage=compileStage(def),nav=buildNavigation(stage,20),o=def.objective!,observer=def.guards.find(g=>g.role==='objective')!;
 // A genuine nearby opaque shoulder, not a safe-zone immunity flag.
 const candidates:Point[]=[];
 for(let y=1;y<def.layout.length;y+=.125)for(let x=1;x<def.layout[0].length;x+=.125){
  const distance=Math.hypot(x-o.x,y-o.y);if(distance<1.2||distance>4.8)continue;
  if(!clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,stage.movementBlockers,20))continue;
  if(clearSegment(observer.x*TILE,observer.y*TILE,x*TILE,y*TILE,stage.visionBlockers))continue;
  const path=findPath(nav,o.x*TILE,o.y*TILE,x*TILE,y*TILE);
  if(path.length<2||Math.hypot(path.at(-2)!/TILE-x,path.at(-1)!/TILE-y)>.01)continue;
  candidates.push(p(x,y));
 }
 candidates.sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y));
 if(!candidates[0])throw Error(`${def.id}: no genuine first opaque break within4.8tiles`);return candidates[0];
}
/** Half-tile historical anchors can exactly touch an expanded wall corner.
 * Keep their authored shoulder, move only invalid reference points up to.75tile
 * onto real20px-clear floor. Runtime player/portal positions remain unchanged. */
function comfortRoute(def:StageDefinition,via:Point[]){
 const stage=compileStage(def);
 const points=via.map(q=>{
  if(clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,20))return q;
  const portal=[def.playerSpawn,def.objective!,def.exitPosition!].some(a=>Math.hypot(q.x-a.x,q.y-a.y)<.01);
  if(portal)throw Error(`${def.id}: portal lacks20pxcomfortclearance`);
  for(const distance of [.25,.5,.75])for(const [dx,dy]of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const b=p(q.x+dx*distance,q.y+dy*distance);
   if(clearSegment(b.x*TILE,b.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,20))return b;
  }
  throw Error(`${def.id}: authored shoulder ${q.x},${q.y} has no nearby20pxclearpoint`);
 });
 return authoredRoute(def,points,20);
}
function finishRoutes(def:StageDefinition,safe:Point[],risk:Point[],escape:Point[]){
 const o=def.objective!,e=def.exitPosition!,entry=def.playerSpawn;
 def.testRoutes=[{name:'safe: protected outer observation shoulders',points:comfortRoute(def,[entry,...safe,o])},{name:'risk: direct timed exhibit crossing',points:comfortRoute(def,[entry,...risk,o])}];
 const b=firstBreak(def);
 def.escapeRoutes=[{name:'escape: immediate opaque break → independent service return',points:comfortRoute(def,[o,b,...escape,e])},{name:'escape: alternate exhibit shoulders',points:comfortRoute(def,[o,b,...[...safe].reverse(),e])}];
 def.safeZones=[{...entry,radius:.2},{...b,radius:.2}];
}
export function composeV12Plan(plan:Plan,source:StageDefinition[]):StageDefinition{
 const original=source.find(d=>d.id===plan.source);if(!original)throw Error(`V12 source missing ${plan.source}`);
 const m=metadata.get(plan.id)!;const chapter=Number(plan.id.slice(0,2)),mission=Number(plan.id.slice(3));
 const def:StageDefinition={...structuredClone(original),id:plan.id,chapter,mission,number:(chapter-1)*5+mission,title:m.title,layout:v12Layout(plan.rooms,plan.islands),playerSpawn:{...plan.entry,facing:-Math.PI/2},entryPosition:plan.entry,entryEdge:'left',exitPosition:plan.exit,exitEdge:'right',exit:{x:plan.exit.x-.6,y:plan.exit.y-.6,w:1.2,h:1.2},objective:{...original.objective!,...plan.goal,highSecurity:plan.id==='02-05'||plan.id==='03-05'},props:[],dressing:[],carpets:[],lights:[],securityZones:[],structurePlan:`V12 ${m.fantasy} | ${plan.subjects.join(' → ')}`,landmark:undefined,objectiveZone:undefined,testPurpose:'V12 actual 5-per-chapter authored tier rebuild'};
 const familyAssets=chapter===1?{main:'museum_statue_large',kind:'statue'}:chapter===2?{main:'gallery_sculpture_large',kind:'statue'}:{main:'bank_security_checkpoint',kind:'bankSecurityCheckpoint'};
 const identityAssets:Record<string,{main:NonNullable<PropDef['visualAssetId']>;kind:PropDef['kind']}>={
 '01-03':{main:'museum_display_case_large',kind:'shelf'},'01-04':{main:'museum_security_desk',kind:'equipment'},
 '02-03':{main:'gallery_white_wall',kind:'partition'},'02-04':{main:'gallery_installation_art',kind:'statue'},
 '03-01':{main:'bank_teller_counter',kind:'bankTellerCounter'},'03-02':{main:'bank_filing_cabinet',kind:'bankFilingCabinet'},'03-03':{main:'bank_deposit_box_wall',kind:'bankDepositBoxWall'}
 };
 const assets=identityAssets[plan.id]??familyAssets;
 // Islands use opaque architecture for physics; approved themed focal sculptures
 // are visually centred on their solid base. No thin fake-gap props around them.
 for(const[x,y,w,h]of plan.islands){def.props.push({kind:assets.kind as PropDef['kind'],visualAssetId:assets.main as PropDef['visualAssetId'],x:x+w/2,y:y+h/2,scale:.95});}
 def.props.push({kind:'objectiveCase',visualAssetId:chapter===1?'museum_diamond_case':chapter===2?'gallery_low_pedestal':'bank_small_safe',...plan.goal,scale:1.5});
 if(chapter===3)def.props.push({kind:'bankMainVault',visualAssetId:plan.id==='03-05'?'bank_main_vault':'bank_deposit_box_wall',x:plan.goal.x,y:1.7,scale:1});
 for(const [i,q] of (plan.glass??[]).entries())def.props.push({kind:i===0?'galleryGlassPanel':'galleryGlassPanelVertical',...q,scale:2,collisionScale:2});
 def.landmark={name:plan.subjects[0],kind:assets.kind as PropDef['kind'],x:plan.islands[0][0]+plan.islands[0][2]/2,y:plan.islands[0][1]+plan.islands[0][3]/2};
 plan.rooms.forEach(([x,y,w,h],i)=>{
  const artwork=chapter===1?'museum_painting':chapter===2?(plan.id==='02-02'?'gallery_portrait_frame_a':'gallery_abstract_frame'):'bank_monitor';
  def.dressing!.push({id:`${def.id}-exhibit-${i}`,zoneId:plan.subjects[Math.min(i,plan.subjects.length-1)],identity:chapter===3?'Authored operational workcell':'Wall artwork, caption and directed exhibition light',items:[{kind:'painting_wall',visualAssetId:artwork as PropDef['visualAssetId'],x:x+w/2,y:y+.6,scale:1.2},{kind:'plaque',x:x+w/2+1,y:y+.8}]});
  def.lights.push({x:x+w/2,y:y+2,radius:Math.min(w,h)*.65,kind:'warm',intensity:.3});
 });
 def.lights.push({x:plan.goal.x+1,y:plan.goal.y-1,radius:2.8,kind:'warm',intensity:.32},{...plan.entry,radius:3,kind:'cool',intensity:.12},{...plan.goal,radius:2.4,kind:'cyan',intensity:.65},{...plan.exit,radius:2,kind:'green',intensity:.4});
 if(plan.id==='03-05')def.props.push({kind:'bankTellerCounter',visualAssetId:'bank_teller_counter',x:5,y:17,scale:1.2});
 security(def,plan,source);finishRoutes(def,plan.safe,plan.risk,plan.escape);return orient(def);
}
/** Authored room orientation variants also change entry/exit/security facing,
 * not camera rotation alone. Each still has its distinct room/island topology. */
const ORIENTATION:Record<string,'quarter'|'mirror'>={'01-03':'quarter','01-04':'mirror','02-01':'quarter','02-04':'mirror','03-02':'mirror','03-03':'mirror'};
function orient(def:StageDefinition):StageDefinition{
 const mode=ORIENTATION[def.id];if(!mode)return def;
 const width=def.layout[0].length,height=def.layout.length;
 const point=(q:Point):Point=>mode==='mirror'?p(width-q.x,q.y):p(height-q.y,q.x);
 const angle=(a:number)=>mode==='mirror'?Math.PI-a:a+Math.PI/2;
 const at=<T extends Point>(q:T):T=>({...q,...point(q)});
 if(mode==='mirror')def.layout=def.layout.map(row=>[...row].reverse().join(''));
 else def.layout=Array.from({length:width},(_,y)=>Array.from({length:height},(_,x)=>def.layout[height-1-x][y]).join(''));
 def.playerSpawn={...at(def.playerSpawn),facing:angle(def.playerSpawn.facing)};
 def.entryPosition=at(def.entryPosition!);def.exitPosition=at(def.exitPosition!);def.objective=at(def.objective!);
 def.exit={...def.exit!,x:def.exitPosition.x-def.exit!.w/2,y:def.exitPosition.y-def.exit!.h/2};
 def.entryEdge=mode==='mirror'?'right':'top';def.exitEdge=mode==='mirror'?'left':'bottom';
 def.props=def.props.map(q=>({...at(q),flip:mode==='mirror'?!q.flip:q.flip}));
 def.lights=def.lights.map(at);def.landmark=at(def.landmark!);def.securityZones=def.securityZones?.map(at);
 def.dressing=def.dressing?.map(c=>({...c,items:c.items.map(at),light:c.light?at(c.light):undefined}));
 def.guards=def.guards.map(g=>({...at(g),facing:angle(g.facing),initialFacing:angle(g.initialFacing??g.facing),theftPosts:g.theftPosts?.map(at),theftSearchSectors:g.theftSearchSectors?.map(s=>({...s,anchors:s.anchors.map(at)}))}));
 def.patrolRoutes=def.patrolRoutes.map(r=>({...r,points:r.points.map(q=>({...at(q),lookDirection:angle(q.lookDirection??0)}))}));
 def.cameras=def.cameras?.map(c=>({...at(c),centerFacing:angle(c.centerFacing)}));
 def.testRoutes=def.testRoutes?.map(r=>({...r,points:comfortRoute(def,r.points.map(at))}));def.escapeRoutes=def.escapeRoutes?.map(r=>({...r,points:comfortRoute(def,r.points.map(at))}));def.safeZones=def.safeZones?.map(at);
 return def;
}
function keep(source:StageDefinition,id:string):StageDefinition{
 const def=structuredClone(source),m=metadata.get(id)!;def.title=m.title;def.number=(Number(id.slice(0,2))-1)*5+Number(id.slice(3));
 // KEEP keeps floor/props/artwork/portals. Only duplicate overlapping roamer
 // pressure and global inspection anchors are removed for the chapter tier.
 if(id==='02-02'){def.guards=def.guards.filter(g=>g.role!=='roaming');def.patrolRoutes=def.patrolRoutes.filter(r=>def.guards.some(g=>g.routeId===r.id));def.securityZones=def.securityZones?.filter(z=>!z.guardId||def.guards.some(g=>g.id===z.guardId));}
 for(const g of def.guards){const route=def.patrolRoutes.find(r=>r.id===g.routeId);const stops=route?.points.filter(q=>(q.waitDuration??q.wait??0)>0).map(({x,y})=>({x,y}))??[{x:g.x,y:g.y}];g.theftPosts=stops.slice(0,2);g.theftSearchSectors=[{id:`${g.id}: local inspection`,anchors:stops.slice(0,4)}];}
 const safe=def.testRoutes!.find(r=>r.name.startsWith('safe'))!.points.slice(1,-1),risk=def.testRoutes!.find(r=>r.name.startsWith('risk'))!.points.slice(1,-1);
 finishRoutes(def,safe,risk,def.escapeRoutes![0].points.slice(1,-1));return def;
}
/** Later chapters pass through by reference and byte/data identity. Reapply to
 * baked45 is a no-op: source audit and sources06–10 are needed for authoring. */
export function buildV12Campaign(source:StageDefinition[]):StageDefinition[]{
 if(source.filter(s=>(s.chapter??Number(s.id.slice(0,2)))<=3).length===15)return source;
 const early=[keep(source.find(s=>s.id==='01-01')!,'01-01'),...V12_PLANS.filter(p=>p.id.startsWith('01')).map(p=>composeV12Plan(p,source)),composeV12Plan(V12_PLANS.find(p=>p.id==='02-01')!,source),keep(source.find(s=>s.id==='02-02')!,'02-02'),...V12_PLANS.filter(p=>p.id.startsWith('02')&&p.id!=='02-01').map(p=>composeV12Plan(p,source)),...V12_PLANS.filter(p=>p.id.startsWith('03')).map(p=>composeV12Plan(p,source))];
 return [...early,...source.filter(s=>(s.chapter??Number(s.id.slice(0,2)))>3)];
}
export function v12MissionReport(def:StageDefinition){const m=metadata.get(def.id)!;const stage=compileStage(def);const routeLength=(points:Point[])=>points.slice(1).reduce((n,b,i)=>n+Math.hypot(b.x-points[i].x,b.y-points[i].y),0);
 return{id:def.id,title:def.title,sourceIds:m.sourceIds,tier:m.difficultyTier,architecture:def.structurePlan,guards:def.guards.length,cameras:def.cameras?.length??0,floorTiles:def.layout.join('').split('').filter(v=>v==='.').length,safeTiles:routeLength(def.testRoutes![0].points),riskTiles:routeLength(def.testRoutes![1].points),escapeTiles:routeLength(def.escapeRoutes![0].points),firstBreak:def.safeZones!.at(-1),guardRanges:def.guards.map(g=>g.visionRange),physicalBlockers:stage.movementBlockers.length,pressureProxy:def.guards.reduce((n,g)=>n+(g.visionRange??0)*(g.visionRange??0)*(g.visionHalfAngle??0),0)+(def.cameras?.length??0)*6,acceptance:'SIMULATOR AND PHYSICAL PLAYTEST REQUIRED'};}
