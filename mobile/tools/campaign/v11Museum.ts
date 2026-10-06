/** V11 approved Museum authoring after V9/V10. Pure absolute edits, no AI/stat changes. */
import type {StageDefinition,PatrolPoint,TheftSearchSector} from '../../src/game/levels/StageDefinition';
type Point={x:number;y:number};
const p=(x:number,y:number):Point=>({x,y});
const ids=new Set(['01-01','01-04','01-05','01-08','01-10']);
function floorRect(def:StageDefinition,x:number,y:number,w:number,h:number){
 const cols=Math.max(...def.layout.map(r=>r.length),x+w+1),rows=Math.max(def.layout.length,y+h+1);
 const grid=Array.from({length:rows},(_,j)=>(def.layout[j]??'').padEnd(cols,' ').split(''));
 for(let j=y-1;j<=y+h;j++)for(let i=x-1;i<=x+w;i++){
  if(j<0||i<0)continue;
  if(j>=y&&j<y+h&&i>=x&&i<x+w)grid[j][i]='.';
  else if(grid[j][i]===' ')grid[j][i]='#';
 }
 def.layout=grid.map(r=>r.join(''));
}
function sector(def:StageDefinition,n:number,anchors:Point[]){
 const guard=def.guards.find(g=>g.id===`${def.id}-g${n}`)!;
 const value:TheftSearchSector={id:`${guard.id}: V11 local inspection circuit`,anchors};
 guard.theftSearchSectors=[value];
}
function patrol(def:StageDefinition,n:number,points:PatrolPoint[]){
 const guard=def.guards.find(g=>g.id===`${def.id}-g${n}`)!;
 const route=def.patrolRoutes.find(r=>r.id===guard.routeId)!;
 route.points=points;guard.x=points[0].x;guard.y=points[0].y;
 guard.facing=points[0].lookDirection??0;guard.initialFacing=guard.facing;
 guard.theftPosts=points.map(({x,y})=>({x,y}));
}
const pause=(x:number,y:number,look:number,wait=.8):PatrolPoint=>({x,y,lookDirection:look,waitDuration:wait,turnDuration:1.1});
export function applyV11Museum(source:StageDefinition):StageDefinition{
 if(source.chapter!==1||!ids.has(source.id))return source;
 const def=structuredClone(source);
 if(def.id==='01-01'){
  // Periodic inspector stop faces the north exhibit; retain the slow north recess.
  const stop=def.patrolRoutes.find(r=>r.id==='01-01-g2')?.points[0];
  if(stop){stop.lookDirection=-Math.PI/2;stop.waitDuration=2.4;}
  const anchor=def.patrolPlan?.anchors.find(a=>a.id==='diamond-door');
  if(anchor){anchor.look=-Math.PI/2;anchor.wait=2.4;}
  const guard=def.guards.find(g=>g.id==='01-01-g2');
  if(guard){guard.initialFacing=-Math.PI/2;guard.facing=-Math.PI/2;}
 }
 if(def.id==='01-05'){
  const stop=def.patrolRoutes.find(r=>r.id==='01-05-g2')?.points[0];
  if(stop){stop.lookDirection=0;stop.waitDuration=.8;}
  sector(def,1,[p(13.2,10.5),p(19,18.5),p(11.5,18.5)]);
  sector(def,2,[p(20,4.2),p(20,8),p(16,4.2)]);
  sector(def,3,[p(29.5,3.5),p(29.5,9.5),p(25,3.5)]);
  sector(def,4,[p(11,3.5),p(11,6.5),p(3.5,6.5)]);
 }
 if(def.id==='01-04'){
  // Enter east of retained x15/y4..6 wall, then return north to unchanged exit.
  // The bay creates a real opaque corner, not an immunity zone.
  floorRect(def,16,5,4,4);floorRect(def,14,7,3,2);
  floorRect(def,17,2,2,4);floorRect(def,14,2,5,2);
  def.escapeRoutes=[{name:'escape: V11 outbound inspection bay and upper return',points:[
   def.objective!,p(14,7.6),p(16.5,7.6),p(18,7.3),p(18,3),p(14,3),def.exitPosition!,
  ]},{name:'escape: retained north gate timing option',points:[def.objective!,p(14,5.5),p(14,3),def.exitPosition!]}];
  def.safeZones=[...(def.safeZones??[]).filter(q=>!(q.x===18&&q.y===7.3)),{x:18,y:7.3,radius:.35}];
  def.structurePlan='V11: Security Office → Hub observation → Gate asset → eastern Outbound Inspection Bay → upper return → existing north staff exit';
 }
 if(def.id==='01-08'){
  floorRect(def,9,1,3,5);floorRect(def,11,3,3,2);floorRect(def,10,5,2,4);
  const archiveGrid=def.layout.map(r=>r.split(''));
  for(const y of [0,1,2,5,6])archiveGrid[y][12]='#';
  def.layout=archiveGrid.map(r=>r.join(''));
  const safe=def.testRoutes?.find(r=>r.name.startsWith('safe:'));
  if(safe){const i=safe.points.findIndex(q=>q.x===11&&q.y===9.5);
   safe.points=[...safe.points.slice(0,i+1),p(10.5,7.5),p(10.5,3.75),p(13.5,3.75),p(13.5,2.7),def.objective!];}
  const existing=def.escapeRoutes![0].points;
  const i=existing.findIndex(q=>q.x===10&&q.y===12);
  def.escapeRoutes![0]={name:'escape: V11 archive west relief bay → maintenance → evacuation',points:[
   def.objective!,p(13.5,3),p(13.5,3.75),p(10.5,3.75),p(10.5,1.8),p(10.5,7.5),p(11,9.5),p(13,9),...existing.slice(i),
  ]};
  patrol(def,3,[pause(18.5,1.5,0,2.2),pause(18.5,3.2,Math.PI/2,2.2),pause(18.5,6,Math.PI,2.2),pause(16.5,6,-Math.PI/2,2.2)]);
  const camera=def.cameras?.find(c=>c.id==='01-08-cam1');if(camera)camera.centerFacing=Math.PI/2;
  sector(def,1,[p(27,10.5),p(27,15),p(22.5,10.5)]);
  sector(def,2,[p(18.5,9.5),p(18.5,17),p(11.5,17)]);
  sector(def,3,[p(18.5,1.5),p(18.5,6),p(16.5,6),p(16.5,2.3)]);
  sector(def,4,[p(7.5,10.5),p(6,16),p(2.2,10.5)]);
  sector(def,5,[p(16.5,20.2),p(16.5,24),p(4.5,20.2)]);
  def.safeZones=[...(def.safeZones??[]).filter(q=>!(q.x===10.5&&q.y===1.8)),{x:10.5,y:1.8,radius:.35}];
  def.structurePlan='V11: east access → control cross → west archive read bay → north asset; archive west relief → maintenance → south evacuation';
 }
 if(def.id==='01-10'){
  // Western refuge/eastern inspection connect around both ends of opaque wall.
  const grid=def.layout.map(r=>r.split(''));for(let y=22;y<=26;y++)grid[y][6]='#';
  def.layout=grid.map(r=>r.join(''));
  patrol(def,5,[pause(10.25,22.5,0),pause(10.75,22.5,Math.PI/2),pause(10.75,28,Math.PI),pause(10.25,28,-Math.PI/2)]);
  sector(def,1,[p(23.5,23.5),p(23.5,28),p(16.5,23.5)]);
  sector(def,2,[p(23.5,13.5),p(23.5,21),p(14.5,21)]);
  sector(def,3,[p(25.5,2.5),p(25.5,9),p(16.5,2.5)]);
  sector(def,4,[p(10.5,4.5),p(10.5,14.5),p(2.5,4.5)]);
  sector(def,5,[p(10.25,22.5),p(10.75,28),p(10.25,28)]);
  sector(def,6,[p(34.5,10.5),p(34.5,20),p(29.5,20)]);
  def.safeZones=(def.safeZones??[]).map(q=>q.x===6.5&&q.y===26?{x:4.5,y:26,radius:q.radius}:q);
  def.structurePlan='V11: Grand Arrival → Exhibition → Sanctuary; west Cloister → western Evacuation Bay / separate eastern Service Inspection → existing west exit';
 }
 return def;
}
