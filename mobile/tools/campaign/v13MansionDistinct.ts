/** Chapter 6: independently drawn reception, library, courtyard, family and vault plans. */
import type {V13Camera,V13Guard,V13Mission,V13Structure} from './v13Types';
import type {Point,RoomRole,V124bEdge} from './v124bTypes';
import {PROP_KIT} from '../../src/game/world/propKit';

type Room = [key:string, column:number, row:number, name:string, role:RoomRole];
type Prop = [room:string, name:string, kind:V13Structure['kind'], art:NonNullable<V13Structure['asset']>, scale?:number, corner?:'nw'|'ne'|'sw'|'se'|'side-east'|'side-west'|Point];
type Post = [room:string, facing:'north'|'east'|'south'|'west', wall?:'north'|'south'|'east'|'west', wait?:number, along?:number];
type Patrol = [role:Exclude<V13Guard['role'],'objective'>, first:Post, second:Post];
type Camera = [room:string, mount:'north'|'east'|'south'|'west', bearing:number, watches:string];
type Blueprint = {
 id:string; title:string; family:'Mansion'|'Warehouse'; topology:string;
 rooms:Room[]; masonry?:[room:string, x:number, y:number, width:number, height:number, name:string][]; paths:[string,string,string,string]; crossLinks?:string[];
 entryEdge:V13Mission['entryEdge']; exitEdge:V13Mission['exitEdge']; props:Prop[];
 patrols:Patrol[]; cameras:Camera[]; goalShoulder?:keyof typeof directions; reflectShoulder?:boolean; objectiveWait?:number; objectiveDelay?:number;
};
const directions={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]} as const;

/** Draw the explicit rooms and openings for one blueprint. Chains below are written per map. */
export function drawServiceBlueprint(b:Blueprint):V13Mission {
 const stride=7,size=5;
 const width=3+Math.max(...b.rooms.map(r=>r[1]))*stride+size-1;
 const height=3+Math.max(...b.rooms.map(r=>r[2]))*stride+size-1;
 const cells=Array.from({length:height},()=>Array<string>(width).fill('#'));
 const zones:V13Mission['zones']={};
 const blocks=new Map<string,{x:number;y:number}>();
 const block=(id:string)=>{const r=blocks.get(id);if(!r)throw Error(`${b.id}: no room ${id}`);return r;};
 function paint(key:string,name:string,role:RoomRole,x:number,y:number,w:number,h:number){
  zones[key]={id:key,name,role,purpose:`${name}: ${role}`};
  for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++){
   if(cells[row][col]!=='#')throw Error(`${b.id}: overlapping room at ${col},${row}`);
   cells[row][col]=key;
  }
 }
 for(const[key,column,row,name,role]of b.rooms){
  const x=1+column*stride,y=1+row*stride;
  blocks.set(key,{x,y});paint(key,name,role,x,y,size,size);
 }
 const doors=new Map<string,{key:string;at:Point;orientation:'horizontal'|'vertical'}>();
 function join(a:string,z:string){
  const k=[a,z].sort().join('');
  const previous=doors.get(k);if(previous)return previous;
  const p=block(a),q=block(z),horizontal=p.y===q.y;
  if(Math.abs(p.x-q.x)+Math.abs(p.y-q.y)!==stride||(!horizontal&&p.x!==q.x))throw Error(`${b.id}: diagonal or distant link ${a}${z}`);
  const key=String.fromCharCode(65+doors.size);
  const x=Math.min(p.x,q.x)+(horizontal?size:1),y=Math.min(p.y,q.y)+(horizontal?1:size);
  paint(key,`${zones[a].name} threshold to ${zones[z].name}`,'transition',x,y,horizontal?2:3,horizontal?3:2);
  const result={key,at:horizontal?{x:x+1,y:y+1.5}:{x:x+1.5,y:y+1},orientation:horizontal?'vertical' as const:'horizontal' as const};
  doors.set(k,result);return result;
 }
 const [safe,risky,quick,alternate]=b.paths.map(s=>s.split(''));
 const entryId=safe[0],goalId=safe.at(-1)!,exitId=quick.at(-1)!;
 const gatePair=[quick[0],quick[1]].sort().join('');
 const goalPair=[safe.at(-2)!,goalId].sort().join('');
 const doorStyle=b.family==='Mansion'?'mansionLibrary':'warehouseIndustrial';
 const drawnEdges=new Set<string>();
 const edges:V124bEdge[]=[];
 function chain(nodes:string[],role:V124bEdge['role']){
  for(let i=1;i<nodes.length;i++){
   const from=nodes[i-1],to=nodes[i],pair=[from,to].sort().join('');
   const d=join(from,to);
   if(!drawnEdges.has(pair)){
    drawnEdges.add(pair);
    edges.push({from,to:d.key,role,...(pair===gatePair?{door:{at:d.at,orientation:d.orientation,lockdown:true,style:doorStyle}}:{})});
    edges.push({from:d.key,to,role,...(pair===goalPair?{door:{at:d.at,orientation:d.orientation,lockdown:false,style:doorStyle}}:{})});
   }else{
    for(const [f,t]of [[from,d.key],[d.key,to]])if(!edges.some(e=>e.role===role&&((e.from===f&&e.to===t)||(e.from===t&&e.to===f))))edges.push({from:f,to:t,role});
   }
  }
 }
 chain(safe,'approach');chain(risky,'risk');chain(quick,'quickEscape');chain(alternate,'alternateEscape');
 for(const link of b.crossLinks??[])chain(link.split(''),'approach');
 const path=(rooms:string[])=>rooms.flatMap((r,i)=>i?[join(rooms[i-1],r).key,r]:[r]);
 const fromEdge=(id:string,edge:V13Mission['entryEdge']):Point=>{
  const p=block(id);return {x:p.x+(edge==='left'?1.2:edge==='right'?3.8:2.5),y:p.y+(edge==='top'?1.2:edge==='bottom'?3.8:2.5)};
 };
 const entry=fromEdge(entryId,b.entryEdge),exit=fromEdge(exitId,b.exitEdge);
 const g=block(goalId);
 const openings=[...doors.keys()].filter(k=>k.includes(goalId)).map(k=>block(k.replace(goalId,'')));
 const freeSide=b.goalShoulder??(['east','west','north','south'] as const).find(side=>{
  const [dx,dy]=directions[side];
  return !openings.some(p=>p.x===g.x+dx*stride&&p.y===g.y+dy*stride);
 });
 if(!freeSide)throw Error(`${b.id}: collection needs an opaque wall shoulder`);
 function chamberPoint(x:number,y:number):Point{
  if(b.reflectShoulder)y=size-y;
  switch(freeSide){
   case 'west':return {x:g.x+size-x,y:g.y+size-y};
   case 'north':return {x:g.x+y,y:g.y+size-x};
   case 'south':return {x:g.x+size-y,y:g.y+x};
   default:return {x:g.x+x,y:g.y+y};
  }
 }
 const objective=chamberPoint(4.1,.9);
 zones[goalId].hub=chamberPoint(2.2,2.5);
 for(const edge of edges){
  const neighbor=edge.from===goalId?edge.to:edge.to===goalId?edge.from:undefined;
  if(!neighbor)continue;
  const linked=[...doors.values()].find(d=>d.key===neighbor)!;
  const dx=Math.sign(linked.at.x-(g.x+2.5)),dy=Math.sign(linked.at.y-(g.y+2.5));
  const shoulder={x:g.x+2.5+dx*1.65,y:g.y+2.5+dy*1.65};
  edge.via=edge.from===goalId?[shoulder,...(edge.door?[edge.door.at]:[])]:[...(edge.door?[edge.door.at]:[]),shoulder];
 }

 for(const x of [3.5,4.5]){
  const p=chamberPoint(x,2.5);cells[Math.floor(p.y)][Math.floor(p.x)]='#';
 }

 const masonry:V13Mission['walls']=(b.masonry??[]).map(([id,x,y,width,height,name])=>{
  const r=block(id);
  for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++){
   if(cells[r.y+y+dy][r.x+x+dx]!==id)throw Error(`${b.id}: masonry outside ${zones[id].name}`);
   cells[r.y+y+dy][r.x+x+dx]='#';
  }
  return {name,at:zones[id].name,roles:['divider','losBreak']};
 });
 const structures:V13Structure[]=b.props.map(([id,name,kind,asset,scale=.72,corner='nw'])=>{
  const p=block(id),spec=PROP_KIT[kind],f=spec.footprint;
  const roles:V13Structure['roles']=spec.blocksVision?['hiding','losBreak']:spec.blocksMovement?['divider']:['decor'];
  if(typeof corner==='object')return {name,kind,asset,scale,x:p.x+corner.x,y:p.y+corner.y,roles};
  const westSide=corner.endsWith('w')||corner==='side-west',top=corner.startsWith('n');
  return {name,kind,asset,scale,x:p.x+(westSide?f.w*scale/2:size-f.w*scale/2),
   y:p.y+(corner.startsWith('side-')?1.45:top?f.h*scale/2:size-f.h*scale/2),roles};
 });
 const wallName=`${zones[goalId].name} masonry shoulder`;
 const stop=([id,facing,wall='north',wait=3,along=2.2]:Post)=>{
  const p=block(id), [dx,dy]=directions[facing];
  const x=p.x+(wall==='west'?.85:wall==='east'?4.15:along);
  const y=p.y+(wall==='north'?.85:wall==='south'?4.15:along);
  return {x,y,wait,look:{x:x+3*dx,y:y+3*dy}};
 };
 const guards:V13Guard[]=b.patrols.map(([role,first,second])=>({
  role,zone:first[0],watches:`Alternate between ${zones[first[0]].name} and ${zones[second[0]].name}`,
  stops:[stop(first),stop(second)],
 }));
 guards.push({role:'objective',zone:goalId,watches:'Inspect the prize, then check the screened shoulder',
  startDelay:b.objectiveDelay??3,
  stops:[
   {...chamberPoint(2.55,.9),look:objective,wait:2},
   {...chamberPoint(.9,4.1),look:chamberPoint(1,5),wait:b.objectiveWait??5},
  ]});
 const cameras:V13Camera[]=b.cameras.map(([id,mount,facing,watches])=>{
  const p=block(id),[dx,dy]=directions[mount];
  return {zone:id,at:{x:p.x+2.5+dx*2.15,y:p.y+2.5+dy*2.15},facing,watches};
 });
 const placement=(p:Point)=>{
  const horizontal=p.x<width/3?'left':p.x>=width*2/3?'right':'centre';
  const vertical=p.y<height/3?'top':p.y>=height*2/3?'bottom':'centre';
  return vertical==='centre'?horizontal==='centre'?'centre':`${horizontal}-centre`:`${vertical}-${horizontal}`;
 };
 const coverNames=(ids:string[])=>b.props.filter(p=>ids.includes(p[0])&&PROP_KIT[p[2]].blocksVision).map(p=>p[1]);
 return {
  id:b.id,title:b.title,family:b.family,topology:b.topology,map:cells.map(row=>row.join('')),zones,
  entry,objective,exit,entryEdge:b.entryEdge,exitEdge:b.exitEdge,placement:[placement(entry),placement(objective),placement(exit)],
  approach:path(safe),risk:path(risky),quickEscape:path(quick),alternateEscape:path(alternate),edges,structures,guards,cameras,
  walls:[{name:wallName,roles:['hiding','losBreak'],at:`${freeSide} wall of the collection`},...masonry],
  cover:{safe:[...coverNames(safe),wallName],risk:[...coverNames(risky),wallName],escape:[wallName,...coverNames(alternate)]},
  secureDoorStyle:doorStyle,objectiveAsset:'museum_diamond_case',objectiveScale:1.15,
 };
}
const mansion=(b:Omit<Blueprint,'family'>)=>drawServiceBlueprint({...b,family:'Mansion'});
const divider=(room:string,name:string,corner?:Prop[5]):Prop=>[room,name,'partition','mansion_room_divider',.72,corner];
const cabinet=(room:string,name:string,corner?:Prop[5]):Prop=>[room,name,'statue','mansion_cabinet',.67,corner];
const desk=(room:string,name:string,corner?:Prop[5]):Prop=>[room,name,'table','mansion_writing_desk',.72,corner];

export const V13_MANSION_DISTINCT:V13Mission[]=[
 mansion({
  id:'06-01',title:'Reception Wing',topology:'Reception switchback around a central salon with a separate servants’ return',
  rooms:[
   ['e',0,1,'Visitor Reception','public'],['s',0,0,'Coat Room','public'],['h',1,0,'Portrait Walk','transition'],['t',2,0,'East Anteroom','restricted'],
   ['r',1,1,'Central Salon','restricted'],['a',2,1,'Blue Drawing Room','restricted'],['o',2,2,'Reception Collection','objective'],
   ['q',2,3,'South Veranda','escape'],['x',1,3,'Terrace Door','escape'],['l',1,2,'Linen Room','escape'],['p',0,2,'Servants’ Hall','escape'],['u',0,3,'Kitchen Landing','escape'],
  ],
  paths:['eshtao','erao','oqx','olpux'],crossLinks:['hr'],entryEdge:'left',exitEdge:'bottom',
  props:[divider('e','Reception Screen'),desk('h','Portrait Desk','ne'),cabinet('r','Salon Display','sw'),divider('a','Drawing Room Screen','ne'),['q','Veranda Cabinet','statue','mansion_cabinet',.8,{x:.75,y:1.15}],desk('l','Linen Worktable'),divider('p','Servants’ Partition','se'),cabinet('u','Kitchen Cabinet'),['x','Terrace Banquet Table','table','mansion_dining_table',1.4,'se']],
  patrols:[['lobby',['t','south','east',2],['t','west','north',3]],['crossing',['r','east','north',3],['r','west','south',4]],['escape',['u','north','west',3],['u','east','south',4]]],
  cameras:[['r','west',0,'Sweep the direct salon shortcut'],['q','south',-Math.PI/2,'Watch the short veranda route']],
 }),
 mansion({
  id:'06-02',title:'Library Passage',topology:'A library ladder with reading-room bypasses and an isolated east return',
  rooms:[
   ['e',1,0,'Library Vestibule','public'],['a',0,0,'Periodicals Room','public'],['b',0,1,'West Book Stacks','transition'],['c',0,2,'Rare Reading Room','restricted'],
   ['r',1,1,'Catalogue Gallery','restricted'],['d',1,2,'Archivist Desk','restricted'],['o',1,3,'Manuscript Room','objective'],['x',2,3,'Library Service Exit','escape'],
   ['q',2,2,'Restoration Bench','escape'],['w',3,2,'East Book Store','escape'],['v',3,3,'Delivery Alcove','escape'],['t',2,1,'East Index Room','restricted'],['y',2,0,'Map Archive','public'],
  ],
  paths:['eabcdo','erdo','ox','odqwvx'],crossLinks:['eytr','bc'],entryEdge:'top',exitEdge:'bottom',
  masonry:[['a',3,0,2,1,'Periodicals fireplace recess'],['q',0,0,1,2,'Restoration stone return']],
  props:[['a','Periodicals Bookshelf','shelf','mansion_bookshelf',1.45,'nw'],cabinet('b','Book Stack Cabinet','sw'),divider('c','Reading Screen','ne'),cabinet('r','Catalogue Cabinet'),desk('d','Archivist Writing Table','se'),divider('q','Restoration Divider','sw'),['w','East Library Stacks','shelf','mansion_bookshelf',1.45,'ne'],desk('v','Delivery Table','se'),divider('t','Index Room Screen')],
  patrols:[['lobby',['b','south','east',2],['b','north','west',4]],['restricted',['r','south','west',2],['r','north','east',4]],['escape',['v','north','east',2],['v','west','south',5]]],
  cameras:[['r','east',Math.PI,'Sweep the direct catalogue passage'],['q','north',Math.PI/2,'Watch the restoration-room crossing']],
 }),
 mansion({
  id:'06-03',title:'Private Courtyard',topology:'A planted courtyard ring with two opposite approaches and a southern garden egress',
  rooms:[
   ['e',1,3,'Garden Arrival','public'],['a',0,3,'West Garden Bench','public'],['b',0,2,'West Planting Court','transition'],['c',0,1,'West Loggia','restricted'],
   ['d',0,0,'Conservatory','restricted'],['o',1,0,'Courtyard Collection','objective'],['r',2,3,'East Garden Bench','public'],['s',2,2,'East Terrace','restricted'],
   ['t',2,1,'East Column Walk','restricted'],['u',2,0,'Portrait Arcade','restricted'],['q',1,1,'Orangery','escape'],['x',1,2,'Courtyard Gate','escape'],
   ['p',3,0,'Estate Workshop','escape'],['k',3,1,'Garden Tools','escape'],['j',3,2,'Greenhouse Return','escape'],
  ],
  paths:['eabcdo','erstuo','oqx','outsx'],crossLinks:['upkjs'],entryEdge:'bottom',exitEdge:'left',
  masonry:[['b',3,0,2,1,'Loggia planter curb'],['p',0,3,1,2,'Workshop buttress']],
  props:[cabinet('a','West Garden Cabinet'),divider('b','West Plant Screen','se'),desk('c','Loggia Writing Table'),['d','Conservatory Armour','statue','mansion_armor_display',1.45,'sw'],['r','East Terrace Sofa','sofa','mansion_sofa',1.4,'nw'],divider('s','Terrace Screen'),cabinet('t','East Column Statue'),divider('q','Orangery Divider','se'),desk('p','Estate Workshop Table'),cabinet('k','Tools Cabinet','sw'),divider('j','Greenhouse Screen')],
  patrols:[['lobby',['c','south','west',2],['c','north','east',4]],['restricted',['t','west','east',3,1.2],['t','south','east',4,3.8]],['escape',['k','east','north',2],['k','west','south',5]]],
  cameras:[['s','south',-Math.PI/2,'Read the east courtyard advance'],['p','north',Math.PI/2,'Sweep the workshop return']],
 }),
 mansion({
  id:'06-04',title:'East Family Wing',topology:'Connected family suites with a central portrait crossing and a separate west staff gallery',
  rooms:[
   ['e',3,1,'Family Stair Arrival','public'],['a',3,0,'East Sitting Room','public'],['b',2,0,'Family Portraits','transition'],['c',1,0,'North Family Hall','restricted'],
   ['o',0,0,'Family Collection','objective'],['r',2,1,'Central Passage','restricted'],['t',1,1,'West Family Suite','restricted'],
   ['q',0,1,'West Stair','escape'],['x',0,2,'Family Exit','escape'],['u',1,2,'Linen Gallery','escape'],['v',2,2,'Staff Parlour','escape'],['w',3,2,'Cleaning Store','escape'],
  ],
  paths:['eabco','ertco','oqx','octux'],crossLinks:['ewvr','vu'],entryEdge:'right',exitEdge:'left',goalShoulder:'north',
  props:[['a','Sitting Room Piano','shelf','mansion_grand_piano',1.45,'nw'],cabinet('b','Portrait Cabinet','sw'),desk('c','Family Hall Table','ne'),divider('r','Passage Screen'),cabinet('t','Suite Cabinet','se'),['u','Linen Bookshelf','shelf','mansion_bookshelf',1.2,'nw'],divider('v','Staff Parlour Screen'),cabinet('w','Cleaning Store Cabinet')],
  patrols:[['lobby',['b','east','south',2],['b','north','west',4]],['restricted',['t','west','east',2,1.1],['t','south','east',4,3.45]],['escape',['v','east','south',2],['v','north','west',5]]],
  cameras:[['r','east',Math.PI,'Cover the central crossing from the east'],['q','west',0,'Sweep the short west stair']],
 }),
 mansion({
  id:'06-05',title:'Secret Vault',topology:'A deep secret room behind split galleries with a second switchback around the east service core',
  rooms:[
   ['e',2,0,'North Estate Foyer','public'],['a',1,0,'West Guest Room','public'],['b',0,0,'Breakfast Room','transition'],['c',0,1,'Portrait Side Stair','restricted'],
   ['d',0,2,'Lower Drawing Room','restricted'],['r',2,1,'Great Stair','restricted'],['s',1,1,'West Great Hall','restricted'],
   ['t',1,2,'Private Anteroom','restricted'],['o',1,3,'Secret Collection','objective'],['q',2,3,'South Service Door','escape'],
   ['x',3,3,'Carriage Exit','escape'],['u',0,3,'Storage Room','escape'],['v',0,4,'Lower Pantry','escape'],['w',1,4,'Boiler Passage','escape'],
   ['j',2,4,'Carriage Store','escape'],['k',3,4,'West Carriage Access','escape'],['z',3,1,'East Staff Station','escape'],['p',3,2,'East Mechanical Room','escape'],
  ],
  paths:['eabcdto','ersto','oqx','ouvwjkx'],crossLinks:['rzp'],entryEdge:'top',exitEdge:'right',
  props:[divider('a','Guest Divider'),desk('b','Breakfast Table','sw'),cabinet('c','Side Stair Cabinet'),['d','Drawing Room Banquet Table','table','mansion_dining_table',1.45,'se'],divider('r','Great Stair Screen'),cabinet('s','Great Hall Cabinet','se'),desk('t','Private Writing Table'),divider('u','Storage Screen'),desk('v','Lower Pantry Table'),cabinet('w','Boiler Cabinet'),divider('j','Carriage Store Screen'),desk('k','Carriage Access Table','se'),['p','Estate Mechanical Cabinet','shelf','mansion_cabinet',1.5,'se']],
  patrols:[['lobby',['c','north','east',2],['c','south','west',4]],['restricted',['s','east','north',2],['s','west','south',4]],['escape',['j','east','south',3,1.15],['j','north','south',4,3.5]]],
  cameras:[['r','east',Math.PI,'Watch the central stair turn'],['q','south',-Math.PI/2,'Watch the short carriage door']],
 }),
];
