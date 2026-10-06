/** V11 Phase B: authored Gallery/Bank deltas, applied after V9/V10 composition.
 * No shared AI, sensor, velocity or detector changes. KEEP maps preserve identity.
 */
import type {PatrolPoint,StageDefinition} from '../../src/game/levels/StageDefinition';
import {authoredRoute} from './curatedHeistFlows';
type Point={x:number;y:number};
export const V11_GALLERY_BANK_IDS=['02-02','02-03','02-06','02-07','02-08','02-09','02-10','03-01','03-05','03-07','03-08'] as const;
const selected=new Set<string>(V11_GALLERY_BANK_IDS);
const point=(x:number,y:number):Point=>({x,y});
function pause(def:StageDefinition,id:string,index:number,look:number,wait?:number){
 const p=def.patrolRoutes?.find(r=>r.id===id)?.points[index];if(!p)return;
 if(p.waitDuration!==undefined)p.lookDirection=look;else p.look=look;
 if(wait!==undefined){if(p.waitDuration!==undefined)p.waitDuration=wait;else p.wait=wait;}
 const guard=def.guards.find(g=>g.routeId===id);
 const assignment=def.patrolPlan?.assignments.find(a=>a.guardId===guard?.id);
 for(const anchorId of assignment?.anchors??[]){
  const a=def.patrolPlan!.anchors.find(a=>a.id===anchorId);
  if(a&&Math.hypot(a.x-p.x,a.y-p.y)<.01){a.look=look;if(wait!==undefined)a.wait=wait;}
 }
 if(index===0&&guard){guard.facing=look;guard.initialFacing=look;}
}
function patrol(def:StageDefinition,guardId:string,stops:PatrolPoint[]){
 const g=def.guards.find(g=>g.id===guardId)!;
 const route=def.patrolRoutes.find(r=>r.id===g.routeId)!;
 // Radius9 is the existing Guard physical contract; player routes use radius18.
 const expanded=authoredRoute(def,[...stops,stops[0]],9).slice(0,-1);
 route.points=expanded.map(p=>{
  const authored=stops.find(s=>Math.hypot(s.x-p.x,s.y-p.y)<.01);
  return authored?{...authored}:{...p,waitDuration:0,turnDuration:0};
 });
 g.x=stops[0].x;g.y=stops[0].y;
 const facing=Math.atan2(stops[1].y-g.y,stops[1].x-g.x);g.facing=facing;g.initialFacing=facing;
 const zone=def.securityZones?.find(z=>z.guardId===guardId);if(zone){zone.x=g.x;zone.y=g.y;}
}
function staffReturn(def:StageDefinition){
 // Preserve the compact public/teller rooms. Add only a staff verification
 // elbow below their existing southern boundary, with a separate dispatch bay.
 const floor=new Set<string>();
 def.layout.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='.')floor.add(`${x},${y}`);}));
 for(const [x,y,w,h] of [[16,9,4,3],[14,11,8,3],[18,13,4,3]])
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)floor.add(`${xx},${yy}`);
 const rows=Math.max(def.layout.length,17),cols=Math.max(...def.layout.map(r=>r.length));
 def.layout=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>{
  if(floor.has(`${x},${y}`))return '.';
  if([-1,0,1].some(dy=>[-1,0,1].some(dx=>floor.has(`${x+dx},${y+dy}`))))return '#';
  return ' ';
 }).join(''));
 const exit=point(20.5,15.2);def.exitPosition=exit;def.exitEdge='bottom';def.exit={x:exit.x-.6,y:exit.y-.6,w:1.2,h:1.2};
 def.structurePlan='PUBLIC lobby → teller objective → STAFF verification elbow → independent dispatch bay';
 // Stable upsert makes reapplication idempotent without deleting earlier props.
 const props=[{kind:'bankFilingCabinet' as const,visualAssetId:'bank_deposit_box_wall' as const,x:14.8,y:12.6},
  {kind:'bankSecurityGate' as const,visualAssetId:'bank_security_gate' as const,x:18,y:10.8},
  {kind:'bankFloorMarker' as const,x:19.9,y:13.4}];
 for(const p of props){const old=def.props.find(q=>q.kind===p.kind&&q.x===p.x&&q.y===p.y);if(old)Object.assign(old,p);else def.props.push(p);}
 const light={x:18,y:11.8,radius:2.6,kind:'warm' as const,intensity:.42};
 if(!def.lights.some(l=>l.x===light.x&&l.y===light.y))def.lights.push(light);
 const g=def.guards.find(g=>g.id==='03-01-g2')!;
 patrol(def,g.id,[{x:19.8,y:7.8,wait:.6,look:-2.8068558162729786},
  {x:19.8,y:3.8,wait:.6,look:2.1939956567289625},{x:15.1,y:3.8,wait:.6,look:.9272952180016122},
  {x:15.1,y:7.8,wait:.6,look:-.3217505543966421},{x:18,y:10.1,wait:.6,look:Math.PI/2},
  {x:20.2,y:13.1,wait:.6,look:-Math.PI/2}]);
 g.theftPosts=[point(18,10.1),point(20.2,13.1)];
 g.theftSearchSectors=[{id:'03-01-g2: teller and staff verification inspection',anchors:[point(19.8,7.8),point(18,10.1),point(20.2,13.1)]}];
 def.escapeRoutes=[{name:'escape: teller cover → staff verification → independent dispatch',points:authoredRoute(def,[def.objective!,point(20.2,8.2),point(18,9.5),point(18,11.7),point(20.2,12.5),exit])}];
 // Existing safe/risk approaches remain geometrically identical.
}
function masterpieceReturn(def:StageDefinition){
 // A real opaque art screen separates the first post-pickup shoulder from
 // the chamber approach. Same approved neutral Gallery artwork, not soft cover.
 const wall={kind:'partition' as const,visualAssetId:'gallery_white_wall' as const,x:23.2,y:6.7,scale:2.4,collisionScale:2.4};
 const old=def.props.find(p=>p.kind==='partition'&&p.x===wall.x&&p.y===wall.y);if(old)Object.assign(old,wall);else def.props.push(wall);
 def.structurePlan='Masterpiece chamber → opaque first-break art screen → portrait inspection → separate exit collection';
 // Re-route the existing approach contracts around the physical screen.
 def.testRoutes=def.testRoutes!.map(r=>({...r,points:authoredRoute(def,r.points)}));
 const custodian=def.patrolRoutes.find(r=>r.id==='02-10-g3')!;
 const stops=custodian.points.filter(p=>(p.waitDuration??0)>0).map(p=>p.x===23&&p.y===6.5?{...p,y:8.3}:p);
 // Custodian explicitly inspects the case from its east shoulder. The screen
 // must not remove natural empty-case discovery merely because alarm is timed.
 if(!stops.some(p=>p.x===26.5&&p.y===4.5)){
  const index=stops.findIndex(p=>p.x===26.5&&p.y===2.2);
  stops.splice(index+1,0,{x:26.5,y:4.5,waitDuration:.7,turnDuration:1.1,lookDirection:Math.PI});
 }
 patrol(def,'02-10-g3',stops);
 def.escapeRoutes![0]={name:'escape: opaque chamber shoulder → portrait corridor → exit collection',points:authoredRoute(def,[def.objective!,point(18.75,7.75),point(13.4,6.5),point(10.8,6.5),point(2.3,8),point(2.3,15.3),point(2.3,21.7),point(6.5,24),point(2.3,29),def.exitPosition!])};
 def.escapeRoutes![1]={name:'escape: opaque chamber shoulder → security/side-gallery return',points:authoredRoute(def,[def.objective!,point(18.75,7.75),point(24.25,9.25),point(26.5,9.7),point(19.5,12),point(22.25,17.75),point(24.5,22),point(10.8,18.5),point(8.7,21.7),point(6.5,24),point(6.75,29.25),def.exitPosition!])};
 // Each Guard investigates its semantic room and the next junction. Previously
 // six circuits visited every room and repeatedly collapsed into the prize.
 const sectors:Record<string,Point[]>={
  '02-10-g1':[point(20.25,28.25),point(18.75,25.75)],
  '02-10-g2':[point(18.75,18.25),point(20.75,14.25)],
  '02-10-g3':[point(19.75,4.8),point(26.5,9.7),point(20.75,11.75)],
  '02-10-g4':[point(5.25,6.75),point(5.25,19.25)],
  '02-10-g5':[point(6.25,28.25),point(2.6,28.6),point(6,25.6)],
  '02-10-g6':[point(31.75,26.75),point(29.25,23.75)],
  '02-10-g7':[point(29.25,23.75),point(22.25,17.25),point(20.75,14.25)],
 };
 for(const g of def.guards){const anchors=sectors[g.id];if(!anchors)continue;g.theftPosts=anchors.slice(0,2);g.theftSearchSectors=[{id:`${g.id}: assigned local exhibition and junction`,anchors}];}
 // Custodian still inspects the masterpiece; roamer sees its own lower gallery.
 pause(def,'02-10-g7',0,Math.PI/2);
}
export function applyV11GalleryBank(source:StageDefinition):StageDefinition{
 if(!selected.has(source.id))return source;
 const def=structuredClone(source);
 switch(def.id){
  case '02-02':
   // Separate spine and lower roamer inspection directions; the long hall
   // remains the exposed choice, without both permanently watching its shoulder.
   pause(def,'02-02-g1',0,-Math.PI/2,1.2);pause(def,'02-02-g3',3,Math.PI/2,1.2);break;
  case '02-03':{
   const stops=[point(24.25,13.75),point(24.75,16.25),point(18.75,8.75),point(16.75,8.25)].map(p=>({...p,waitDuration:.7,turnDuration:1.1}));
   patrol(def,'02-03-g4',stops);break;
  }
  case '02-06':
   patrol(def,'02-06-g5',[point(27.75,12.25),point(25.25,18.25),point(14.25,18.25)].map(p=>({...p,waitDuration:.7,turnDuration:1.1})));break;
  case '02-07':
   // East installation patrol observes its own floor instead of turning into
   // the curator crossing simultaneously with the corridor custodian.
   patrol(def,'02-07-g5',[{x:26.25,y:18.25,waitDuration:.7,turnDuration:1.1,lookDirection:-Math.PI/2},
    {x:25.25,y:16.75,waitDuration:1.1,turnDuration:1.1,lookDirection:0}]);break;
  case '02-08':pause(def,'02-08-g3',1,-Math.PI/2,1.1);break;
  case '02-09':pause(def,'02-09-g2',1,Math.PI,1.1);break;
  case '02-10':masterpieceReturn(def);break;
  case '03-01':staffReturn(def);break;
  case '03-05':pause(def,'03-05-route4',1,Math.PI,1.1);break;
  case '03-07':
   // Tables remain LOS PASS. The corridor inspection explicitly watches the
   // open processing cross while the cabinet-backed route remains an option.
   pause(def,'03-07-route2',3,Math.PI,1.1);break;
  case '03-08':pause(def,'03-08-g5',1,Math.PI/2,1.1);pause(def,'03-08-g2',3,0,1.1);break;
 }
 return def;
}
