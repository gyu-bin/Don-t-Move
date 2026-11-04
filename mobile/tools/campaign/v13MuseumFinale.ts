/** Museum finale: a cross-axis observation network and a deep perimeter suite.
 * Independently authored floor plans; no scaled/mirrored exhibit-circuit template. */
import type {V13Mission,V13Structure,V13Guard} from './v13Types';
import type {RoomRole,V124bEdge,Point} from './v124bTypes';
type Room=[key:string,name:string,role:RoomRole,x:number,y:number,w:number,h:number,hub?:Point];
function draft(W:number,H:number,rooms:Room[]){
 const cells=Array.from({length:H},()=>Array<string>(W).fill('#'));
 const zones:V13Mission['zones']={};
 for(const[key,name,role,x,y,w,h,hub]of rooms){
  zones[key]={id:key,name,role,purpose:`${name}: ${role}`,hub:hub??{x:x+w/2,y:y+h/2}};
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
   if(cells[yy][xx]!=='#')throw Error(`Overlapping ${key} at ${xx},${yy}`);
   cells[yy][xx]=key;
  }
 }
 return {cells,zones};
}
const art=(name:string,kind:V13Structure['kind'],asset:V13Structure['asset'],x:number,y:number,scale=1.1,roles:V13Structure['roles']=['hiding','losBreak']):V13Structure=>({name,kind,asset,x,y,scale,roles});
const screen=(name:string,x:number,y:number,scale=1.1)=>art(name,'partition','museum_partition',x,y,scale);
const statue=(name:string,x:number,y:number,scale=1.1)=>art(name,'statue','museum_statue_large',x,y,scale);
const painting=(name:string,x:number,y:number)=>art(name,'painting','museum_painting',x,y,1.1,['decor']);
const stop=(x:number,y:number,lx:number,ly:number,wait=3)=>({x,y,look:{x:lx,y:ly},wait});
function routes(chains:{role:V124bEdge['role'];rooms:string[]}[],doors:Record<string,NonNullable<V124bEdge['door']>>={}):V124bEdge[]{
 const result:V124bEdge[]=[];
 for(const chain of chains)for(let i=1;i<chain.rooms.length;i++){
  const from=chain.rooms[i-1],to=chain.rooms[i],key=[from,to].sort().join('/');
  if(result.some(e=>e.from===from&&e.to===to&&e.role===chain.role))continue;
  result.push({from,to,role:chain.role,...(doors[key]&&!result.some(e=>e.door&&[e.from,e.to].sort().join('/')===key)?{door:doors[key]}:{})});
 }
 return result;
}
function cameraCrossing():V13Mission{
 const rooms:Room[]=[
  ['e','East Observation Arrival','public',26,1,6,6,{x:29,y:4.8}],
  ['a','Observation Balcony Threshold','transition',23,2,3,3],
  ['n','North Observation Gallery','public',8,1,15,6,{x:10,y:4.8}],
  ['b','West Observation Threshold','transition',6,2,2,3],
  ['w','West Observation Room','public',1,1,5,6,{x:3.5,y:4.8}],
  ['i','West Observation Steps','transition',2,7,3,3],
  ['h','West Crossing Hall','restricted',1,10,5,6,{x:3.5,y:13.8}],
  ['j','West Crossing Threshold','restricted',6,11,4,3],
  ['c','Crossing Spine','restricted',10,10,13,6,{x:12,y:13.8}],
  ['k','Camera Gallery Steps','restricted',27,7,3,3],
  ['r','East Camera Gallery','restricted',26,10,6,6,{x:29,y:13.8}],
  ['l','Camera Crossing Threshold','restricted',23,11,3,3],
  ['f','South Crossing Steps','restricted',15,16,3,3],
  ['s','South Exhibition Hall','escape',10,19,13,6,{x:16.5,y:23.5}],
  ['d','Collection Threshold','restricted',23,20,3,3],
  ['o','Camera Collection Room','objective',26,19,6,6,{x:27.3,y:23.5}],
  ['g','South Dispatch Threshold','escape',6,20,4,3],
  ['x','Southwest Dispatch Exit','escape',1,19,5,6,{x:3.5,y:23.5}],
  ['q','West Dispatch Steps','escape',2,16,3,3],
 ];
 const {cells,zones}=draft(33,26,rooms);for(let y=20;y<23;y++)cells[y][28]='#';
 const approach=['e','a','n','b','w','i','h','j','c','f','s','d','o'];
 const risk=['e','k','r','l','c','f','s','d','o'];
 const quickEscape=['o','d','s','g','x'],alternateEscape=['o','d','s','f','c','j','h','q','x'];
 const structures=[screen('Observation Arrival Screen',28,1.2),statue('North Gallery East Statue',19,3.3),statue('North Gallery Centre Statue',15.5,3.1),statue('North Gallery West Statue',12,2.7),
  screen('West Observation Screen',2.5,1.2,.9),screen('West Crossing Refuge',2.5,11.5,.9),
  statue('Crossing West Island',11.5,10.2),statue('Crossing Centre Island',17.5,12.5,1.3),statue('Crossing South Refuge',14.5,14.7,1.1),statue('Crossing East Island',21.5,14.4,.9),
  screen('Camera Observation Screen',29,11.3,1),statue('South Exhibition West Statue',12.5,21.2),statue('South Exhibition East Statue',19,21.5),
  screen('Dispatch Waiting Screen',2.5,20.3,.9),painting('Camera Collection Portrait',30,19.3),painting('Observation Portrait',2,1.3)];
 const guards:V13Guard[]=[
  {role:'crossing',zone:'h',watches:'The west observation descent and the crossing spine, leaving the balcony and side refuges readable',stops:[stop(4.7,14.7,4.7,11,3),stop(13.5,14.7,18,14.7,3)]},
  {role:'objective',zone:'o',watches:'Inspect the southeast prize, then return behind its opaque collection pier',stops:[stop(30.3,22,30.3,20.2,2),stop(27.2,20.5,26,20.5,6)],startDelay:3},
 ];
 return {id:'01-09',title:'Camera Crossing',family:'Museum',topology:'Cross-axis observation network: northern balcony bypasses an east-facing CCTV crossing',map:cells.map(r=>r.join('')),zones,
  entry:{x:30.2,y:2.2},objective:{x:30.3,y:20.2},exit:{x:2.2,y:23.3},entryEdge:'right',exitEdge:'left',placement:['top-right','bottom-right','bottom-left'],
  approach,risk,quickEscape,alternateEscape,
  edges:routes([{role:'approach',rooms:approach},{role:'risk',rooms:risk},{role:'quickEscape',rooms:quickEscape},{role:'alternateEscape',rooms:alternateEscape}],{'d/o':{at:{x:24.5,y:21.5},orientation:'vertical'},'g/s':{at:{x:8,y:21.5},orientation:'vertical',lockdown:true}}),
  structures,guards,cameras:[{zone:'r',at:{x:26.7,y:12.7},facing:0,watches:'East-facing CCTV exposes the direct east gallery; the north observation balcony stays behind its wall'}],
  walls:[{name:'Camera Collection Pier',roles:['hiding','losBreak'],at:'opaque pier x28 y20..22; south shoulder connects both extraction routes'}],
  cover:{safe:['Observation Arrival Screen','North Gallery East Statue','North Gallery West Statue','West Observation Screen','West Crossing Refuge','Crossing West Island','South Exhibition East Statue','Camera Collection Pier'],risk:['Camera Observation Screen','Crossing Centre Island','Camera Collection Pier'],escape:['Camera Collection Pier','South Exhibition East Statue','South Exhibition West Statue','West Crossing Refuge','Dispatch Waiting Screen']}};
}
function crownSuite():V13Mission{
 const rooms:Room[]=[
  ['e','Royal Visitor Arrival','public',1,1,6,6,{x:4,y:4.8}],['a','Promenade Threshold','transition',7,2,3,3],
  ['n','Royal Promenade','public',10,1,14,6,{x:21.5,y:4.8}],['b','East Reception Threshold','transition',24,2,3,3],
  ['d','East Crown Reception','restricted',27,1,7,6,{x:30.5,y:4.8}],['c','Reception Descent','restricted',28,7,3,3],
  ['x','Royal Dispatch Exit','escape',27,10,7,7,{x:31.5,y:14.8}],['f','East Handling Steps','escape',28,17,3,3],
  ['t','Crown Handling Room','restricted',27,20,7,8,{x:30.5,y:25.5}],['g','Crown East Threshold','restricted',24,23,3,3],
  ['o','Deep Crown Collection','objective',14,20,10,8,{x:21.5,y:25.5}],['v','Crown West Threshold','restricted',10,23,4,3],
  ['w','Portrait Antechamber','restricted',1,20,9,8,{x:7.5,y:25.5}],['i','Portrait Descent','restricted',3,17,3,3],
  ['p','West Security Gallery','restricted',1,10,9,7,{x:4.5,y:14.8}],['j','West Visitor Steps','transition',3,7,3,3],
  ['h','Upper Collection Return','escape',10,12,14,3,{x:21.5,y:13.5}],['z','Dispatch Return Threshold','escape',24,12,3,3],
 ];
 const {cells,zones}=draft(35,29,rooms);for(let y=21;y<24;y++)cells[y][19]='#';
 const approach=['n','b','d','c','x','f','t','g','o'],risk=['n','a','e','j','p','i','w','v','o'];
 const quickEscape=['o','g','t','f','x'],alternateEscape=['o','v','w','i','p','h','z','x'];
 const structures=[screen('Royal Arrival Screen',2.5,3.5),statue('Visitor Descent Statue',1.5,5.3,1),statue('Promenade West Statue',12.5,3.3),statue('Promenade Centre Statue',18,2.5),screen('East Reception Screen',29,2.5,1.2),
  statue('Dispatch Waiting Statue',30,12,1.2),screen('Crown Handling Screen',29,21.5,1.2),statue('Handling South Statue',30,26.5,1.2),
  statue('Portrait East Sculpture',7.5,22.2,1.4),screen('Portrait West Screen',3,23.5,1.2),screen('West Security Refuge',3,11.5,1.2),
  statue('West Security South Statue',7.5,15.8,1.1),statue('Return West Sculpture',13,13.3,.9),statue('Return East Sculpture',19,13.2,.9),
  statue('Crown South Sculpture',16.5,26.5,1),painting('Royal Collection Portrait',21.8,20.3),painting('Royal Reception Portrait',30,1.3)];
 const guards:V13Guard[]=[
  {role:'restricted',zone:'d',watches:'The east reception threshold and handling descent; the promenade has an observation shoulder',stops:[stop(32.5,5.3,28.5,5.3,3),stop(32.5,22.5,28,22.5,3)]},
  {role:'escape',zone:'p',watches:'The west security gallery and portrait approach; the upper return is a separate extraction corridor',stops:[stop(8.7,15.7,8.7,11.5,3),stop(8.7,26.5,3,26.5,3)]},
  {role:'objective',zone:'o',watches:'Inspect the deep crown prize then the west collection shoulder behind its central pier',stops:[stop(22,23.5,22,21.2,2),stop(16,25.5,14,25.5,5)],startDelay:3},
 ];
 return {id:'01-10',title:'Crown Collection',family:'Museum',topology:'Deep south royal suite with independent east handling and west portrait approaches; crossbar return to the east dispatch',map:cells.map(r=>r.join('')),zones,
  entry:{x:21.5,y:2.2},objective:{x:22,y:21.2},exit:{x:32.2,y:13.3},entryEdge:'left',exitEdge:'right',placement:['top-centre','bottom-centre','right-centre'],
  approach,risk,quickEscape,alternateEscape,
  edges:routes([{role:'approach',rooms:approach},{role:'risk',rooms:risk},{role:'quickEscape',rooms:quickEscape},{role:'alternateEscape',rooms:alternateEscape}],{'g/o':{at:{x:25.5,y:24.5},orientation:'vertical'},'f/t':{at:{x:29.5,y:18.5},orientation:'horizontal',lockdown:true},'o/v':{at:{x:12,y:24.5},orientation:'vertical'}}),
  structures,guards,cameras:[{zone:'n',at:{x:10.7,y:3.5},facing:Math.PI,watches:'West-facing CCTV watches the separate visitor threshold and exposed west approach; the royal arrival and east handling approach stay behind its sweep'}],
  walls:[{name:'Deep Crown Pier',roles:['hiding','losBreak'],at:'opaque central collection pier x19 y21..23; southern walk passes beneath it'}],
  cover:{safe:['Royal Arrival Screen','Promenade West Statue','Promenade Centre Statue','East Reception Screen','Dispatch Waiting Statue','Crown Handling Screen','Deep Crown Pier'],risk:['West Security Refuge','Portrait East Sculpture','Portrait West Screen','Deep Crown Pier'],escape:['Deep Crown Pier','Portrait East Sculpture','West Security Refuge','Return West Sculpture','Return East Sculpture','Dispatch Waiting Statue']}};
}
export const V13_MUSEUM_FINALE:V13Mission[]=[cameraCrossing(),crownSuite()];

/** Finite departures through the final cover-wrapped real AI, checked at ±0.25 s. */
export const MUSEUM_FINALE_WITNESSES={
 '01-09':{quick:{approach:0,escape:0,mode:2,delay:1.5},alternate:{approach:0,escape:1,mode:2,delay:1.5}},
 '01-10':{quick:{approach:0,escape:0,mode:2,delay:2},alternate:{approach:0,escape:1,mode:2,delay:2.5}},
} as const;
