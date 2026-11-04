/** Three separate Museum blockouts: enfilade, collection pavilion ring, and branching restoration wing.
 * Coordinates and connections are authored independently. Helpers draw geometry; they do not select a layout. */
import type {V13Mission,V13Structure,V13Guard} from './v13Types';
import type {RoomRole,V124bEdge,Point} from './v124bTypes';

type Room=[key:string,name:string,role:RoomRole,x:number,y:number,w:number,h:number,hub?:Point];
function draft(W:number,H:number,rooms:Room[]){
 const cells=Array.from({length:H},()=>Array<string>(W).fill('#'));
 const zones:V13Mission['zones']={};
 for(const [key,name,role,x,y,w,h,hub] of rooms){
  zones[key]={id:key,name,role,purpose:`${name}: ${role}`,hub:hub??{x:x+w/2,y:y+h/2}};
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
   if(cells[yy][xx]!=='#')throw Error(`Overlapping authored room ${key} at ${xx},${yy}`);
   cells[yy][xx]=key;
  }
 }
 return {cells,zones};
}
const art=(name:string,kind:V13Structure['kind'],asset:V13Structure['asset'],x:number,y:number,scale=1.2,roles:V13Structure['roles']=['hiding','losBreak']):V13Structure=>({name,kind,asset,x,y,scale,roles});
const statue=(name:string,x:number,y:number,scale=1.2)=>art(name,'statue','museum_statue_large',x,y,scale);
const screen=(name:string,x:number,y:number,scale=1.2)=>art(name,'partition','museum_partition',x,y,scale,['hiding','losBreak','divider']);
const painting=(name:string,x:number,y:number)=>art(name,'painting','museum_painting',x,y,1.2,['decor']);
const stop=(x:number,y:number,lx:number,ly:number,wait=2.5)=>({x,y,look:{x:lx,y:ly},wait});
const paths=(routes:{role:V124bEdge['role'];rooms:string[]}[],doors:Record<string,NonNullable<V124bEdge['door']>>={}):V124bEdge[]=>{
 const result:V124bEdge[]=[];
 for(const route of routes)for(let i=1;i<route.rooms.length;i++){
  const from=route.rooms[i-1],to=route.rooms[i],key=[from,to].sort().join('/');
  if(result.some(e=>e.from===from&&e.to===to))continue;
  result.push({from,to,role:route.role,...(doors[key]&&!result.some(e=>e.door&&[e.from,e.to].sort().join('/')===key)?{door:doors[key]}:{})});
 }
 return result;
};

function westEnfilade():V13Mission{
 const rooms:Room[]=[
  ['e','West Visitor Vestibule','public',1,10,5,6,{x:3.5,y:13}],
  ['c','Exhibit Threshold','transition',6,11,2,3],
  ['a','Staggered Exhibit Hall','restricted',8,10,6,6,{x:11.5,y:13}],
  ['d','North Stair Gallery','transition',9,7,3,3],
  ['b','North Portrait Room','restricted',8,1,6,6,{x:10.5,y:5.8}],
  ['f','Collection Threshold','restricted',14,2,3,3],
  ['o','Silver Collection Room','objective',17,1,6,6,{x:18.2,y:5.8}],
  ['j','Risk Crossing','restricted',14,11,9,3,{x:21.5,y:12.5}],
  ['k','South Collection Access','restricted',20,7,3,4],
  ['g','East Collection Passage','escape',23,2,3,3],
  ['p','East Handling Room','escape',26,1,5,6,{x:28.5,y:4}],
  ['h','Handling Stair','escape',27,7,3,3],
  ['s','Packing Workroom','escape',26,10,5,6,{x:28.5,y:13}],
  ['i','South Packing Passage','escape',27,16,3,3],
  ['t','South Return Gallery','escape',8,19,23,5,{x:11,y:21.5}],
  ['l','Dispatch Threshold','escape',6,20,2,3],
  ['x','West Dispatch Exit','escape',1,19,5,5,{x:3.5,y:21.5}],
  ['m','Visitor Dispatch Link','public',2,16,3,3],
 ];
 const {cells,zones}=draft(32,25,rooms);cells[4][20]='#';cells[4][21]='#';
 const approach=['e','c','a','d','b','f','o'],risk=['e','c','a','j','k','o'];
 const quickEscape=['o','k','j','a','c','e','m','x'],alternateEscape=['o','g','p','h','s','i','t','l','x'];
 const structures=[
  screen('Arrival Information Screen',3.5,10.2,1.1),statue('Staggered Exhibit Island',10,11.5,1.2),
  screen('North Portrait Screen',9,5,1),painting('North Portrait',9.5,1.3),
  statue('Handling Collection Statue',28,2.7,1.1),
  screen('Packing Work Screen',28,11.5,1.1),statue('South Return East Statue',26.4,21.4,1.1),
  statue('South Return Centre Statue',19,21.5,1.2),statue('South Return West Statue',11,20.2,1),
  statue('Dispatch Waiting Statue',2.2,20.2,.8),painting('West Exhibit Portrait',9.5,10.3),
 ];
 const guards:V13Guard[]=[
  {role:'restricted',zone:'a',watches:'The separate east crossing from an exhibit post, then the north-gallery threshold',stops:[stop(12.5,11.5,16,11.5,3),stop(12.5,4.7,9,4.7,3)]},
  {role:'objective',zone:'o',watches:'Inspect the silver collection, then leave its south shoulder for a visible waiting window',stops:[stop(21,3.4,21,2.4,2),stop(18.3,5.5,17,5.5,5)],startDelay:3},
 ];
 return {id:'01-06',title:'West Exhibits',family:'Museum',topology:'Offset enfilade with a bypass crossing and far-east packing return',highSecurity:false,map:cells.map(r=>r.join('')),zones,
  entry:{x:2.2,y:14.2},objective:{x:21,y:2.4},exit:{x:2.3,y:22.3},entryEdge:'left',exitEdge:'bottom',placement:['left-centre','top-centre','bottom-left'],
  edges:paths([{role:'approach',rooms:approach},{role:'risk',rooms:risk},{role:'quickEscape',rooms:quickEscape},{role:'alternateEscape',rooms:alternateEscape}],{'b/f':{at:{x:14.7,y:3.5},orientation:'vertical',lockdown:true},'f/o':{at:{x:16.3,y:3.5},orientation:'vertical'},'k/o':{at:{x:21.5,y:8.5},orientation:'horizontal',lockdown:true}}),
  approach,risk,quickEscape,alternateEscape,structures,guards,cameras:[],
  walls:[{name:'Silver Collection Pier',roles:['hiding','losBreak'],at:'two-tile opaque sill x20..21 y4 below the collection'}],
  cover:{safe:['Arrival Information Screen','Staggered Exhibit Island','North Portrait Screen','Silver Collection Pier'],risk:['Staggered Exhibit Island','Silver Collection Pier'],escape:['Silver Collection Pier','Handling Collection Statue','Packing Work Screen','South Return East Statue','South Return Centre Statue','South Return West Statue','Dispatch Waiting Statue']}};
}

function sculpturePavilion():V13Mission{
 const rooms:Room[]=[
  ['e','North Visitor Gate','public',1,1,5,5,{x:3.5,y:3.5}],['a','North Arcade Threshold','transition',6,2,2,3],
  ['n','North Sculpture Arcade','public',8,1,15,5,{x:20.5,y:3.5}],['b','East Arcade Threshold','transition',23,2,3,3],
  ['d','East Sculpture Loggia','restricted',26,1,6,5,{x:29,y:3.5}],['c','East Courtyard Steps','transition',27,6,3,3],
  ['r','East Courtyard Walk','restricted',26,9,6,7,{x:29,y:12.5}],['f','Pavilion East Bridge','restricted',20,11,6,3,{x:23,y:12.5}],
  ['o','Central Marble Pavilion','objective',11,9,9,7,{x:18.7,y:14.2}],
  ['w','West Courtyard Walk','restricted',1,9,7,7,{x:5,y:12.5}],['g','West Courtyard Steps','transition',2,6,3,3],
  ['h','Pavilion West Bridge','restricted',8,11,3,3],
  ['q','West Workshop Steps','escape',2,16,3,3],['v','Sculpture Workshop','escape',1,19,5,5,{x:3.5,y:21.5}],
  ['i','South Workshop Threshold','escape',6,20,2,3],['s','South Exhibition Walk','escape',8,19,15,5,{x:20.5,y:21.5}],
  ['j','South Exit Threshold','escape',23,20,3,3],['x','South Sculpture Exit','escape',26,19,6,5,{x:29,y:21.5}],
  ['k','East Exit Steps','escape',27,16,3,3],
 ];
 const {cells,zones}=draft(33,25,rooms);for(let y=10;y<13;y++)cells[y][16]='#';
 const approach=['e','a','n','b','d','c','r','f','o'],risk=['e','g','w','h','o'];
 const quickEscape=['o','f','r','k','x'],alternateEscape=['o','h','w','q','v','i','s','j','x'];
 const structures=[
  screen('Visitor Gate Screen',2.8,1.2,1),statue('North Arcade West Statue',11,3.5,1.1),statue('North Arcade East Statue',17,3.5,1.1),
  screen('East Loggia Screen',28,2.2,1),statue('East Courtyard Statue',28.2,10.6,1.2),
  statue('West Courtyard Statue',4,10.7,1.4),screen('Workshop Waiting Screen',3,20.3,1),
  statue('South Walk West Statue',11,21.5,1.1),statue('South Walk East Statue',17,21.5,1.2),
  screen('Exit Sculpture Screen',29,20.2,1),statue('Pavilion Study Statue',12.8,13.3,1.1),
  painting('Pavilion Portrait',13,9.3),painting('Workshop Drawing',2,19.3),
 ];
 const guards:V13Guard[]=[
  {role:'crossing',zone:'n',watches:'Walk the north courtyard arc, leaving the west arcade as a separate timing choice',stops:[stop(20.5,4.7,15,4.7,3),stop(30.7,10.1,30.7,14,3)]},
  {role:'objective',zone:'o',watches:'Inspect the central pavilion prize then the west bridge, never watching both approaches at once',stops:[stop(18.2,12.2,18.2,10.1,2),stop(12,11,9,11,4)],startDelay:3},
 ];
 return {id:'01-07',title:'Sculpture Court',family:'Museum',topology:'Courtyard ring with a central collection pavilion and opposite approach arcs',highSecurity:false,map:cells.map(r=>r.join('')),zones,
  entry:{x:2.2,y:4.5},objective:{x:18.2,y:10.1},exit:{x:30.2,y:22.2},entryEdge:'left',exitEdge:'right',placement:['top-left','centre','bottom-right'],
  edges:paths([{role:'approach',rooms:approach},{role:'risk',rooms:risk},{role:'quickEscape',rooms:quickEscape},{role:'alternateEscape',rooms:alternateEscape}],{'a/e':{at:{x:7,y:3.5},orientation:'vertical',lockdown:true},'f/o':{at:{x:21.3,y:12.5},orientation:'vertical'},'f/r':{at:{x:24.5,y:12.5},orientation:'vertical',lockdown:true}}),
  approach,risk,quickEscape,alternateEscape,structures,guards,cameras:[],
  walls:[{name:'Marble Pavilion Pier',roles:['hiding','losBreak'],at:'central pavilion pier at x16 y10..12'}],
  cover:{safe:['Visitor Gate Screen','North Arcade West Statue','North Arcade East Statue','East Courtyard Statue','Marble Pavilion Pier'],risk:['West Courtyard Statue','Marble Pavilion Pier'],escape:['Marble Pavilion Pier','West Courtyard Statue','Workshop Waiting Screen','South Walk West Statue','South Walk East Statue','Exit Sculpture Screen']}};
}

function restorationBranches():V13Mission{
 const rooms:Room[]=[
  ['e','East Conservation Arrival','public',28,11,6,6,{x:31,y:14}],['a','East Observation Link','transition',29,8,3,3],
  ['v','Observation Room','public',28,1,6,7,{x:31,y:4.5}],['b','North Observation Bridge','transition',25,3,3,3],
  ['n','Restoration Study','restricted',18,1,7,7,{x:21.5,y:5.8}],['c','Archive Study Threshold','restricted',15,3,3,3],
  ['o','Conservation Archive','objective',8,1,7,7,{x:13.6,y:6.6}],
  ['d','Arrival Junction Link','transition',25,12,3,3],['h','Restoration T Junction','restricted',18,11,7,6,{x:21.5,y:14}],
  ['f','North Junction Link','transition',20,8,3,3],
  ['g','West Archive Shortcut','escape',5,3,3,3],['w','West Conservation Store','escape',1,1,4,7,{x:3,y:5.8}],
  ['i','West Store Stairs','escape',1,8,3,3],['u','Conservation Dispatch','escape',1,11,6,6,{x:4.8,y:14}],
  ['j','Dispatch Exit Stairs','escape',2,17,3,5],['x','Restoration Exit','escape',1,22,6,6,{x:4.8,y:25}],
  ['k','Handling Junction Link','escape',15,12,3,3],['r','Restoration Workshop','escape',10,11,5,6,{x:12.5,y:14}],
  ['l','South Workshop Steps','escape',10,17,3,5],['q','Crate Handling Room','escape',10,22,7,6,{x:12.5,y:25}],
  ['m','Restoration Exit Link','escape',7,24,3,3],
 ];
 const {cells,zones}=draft(35,29,rooms);for(let y=2;y<5;y++)cells[y][11]='#';
 const approach=['e','a','v','b','n','c','o'],risk=['e','d','h','f','n','c','o'];
 const quickEscape=['o','g','w','i','u','j','x'],alternateEscape=['o','c','n','f','h','k','r','l','q','m','x'];
 const structures=[
  screen('Conservation Arrival Screen',30,12.5,1.2),statue('Observation Refuge Statue',30,3.2,1.3),
  screen('Study Work Screen',20.4,3,1.3),statue('T Junction Statue',20.5,12.1,1.3),
  screen('West Store Partition',2.8,3.2,.9),statue('Dispatch Work Statue',3,12.8,1.1),
  screen('Workshop Refuge Screen',12.5,12,1.1),statue('South Workshop Stair Statue',10.36,19.5,.8),statue('Conservation Stair Statue',1.36,9.6,.8),statue('Handling Waiting Statue',14.5,24.3,1.1),
  screen('Restoration Exit Screen',2.3,23.3,1.1),painting('Archive Record Portrait',9.2,1.3),painting('Workshop Portrait',11.5,11.3),
 ];
 const guards:V13Guard[]=[
  {role:'restricted',zone:'h',watches:'The central T junction and the study-side turn: the upper observation branch remains a different approach',stops:[stop(23.5,15.7,20,15.7,3),stop(23.5,3.1,19,3.1,3)]},
  {role:'escape',zone:'r',watches:'The restoration workshop then the lower crate room, leaving a physical refuge on either side',stops:[stop(13.8,15.5,13.8,12.5,3),stop(11.2,26.7,15,26.7,3)]},
  {role:'objective',zone:'o',watches:'Inspect the archive prize, then walk below its opaque pier to check the west shortcut',stops:[stop(13.1,5,13.1,2.5,2),stop(9.2,6.5,8,6.5,4)],startDelay:3},
 ];
 return {id:'01-08',title:'Conservation Loop',family:'Museum',topology:'Asymmetric restoration T with upper observation approach and west shortcut versus south workshop return',highSecurity:false,map:cells.map(r=>r.join('')),zones,
  entry:{x:32.5,y:15.2},objective:{x:13.1,y:2.5},exit:{x:2.2,y:26.2},entryEdge:'right',exitEdge:'left',placement:['right-centre','top-centre','bottom-left'],
  edges:paths([{role:'approach',rooms:approach},{role:'risk',rooms:risk},{role:'quickEscape',rooms:quickEscape},{role:'alternateEscape',rooms:alternateEscape}],{'c/o':{at:{x:16.5,y:4.5},orientation:'vertical'},'g/o':{at:{x:6.5,y:4.5},orientation:'vertical',lockdown:true}}),
  approach,risk,quickEscape,alternateEscape,structures,guards,cameras:[],
  walls:[{name:'Conservation Archive Pier',roles:['hiding','losBreak'],at:'archive pier x11 y2..4'}],
  cover:{safe:['Conservation Arrival Screen','Observation Refuge Statue','Study Work Screen','Conservation Archive Pier'],risk:['Conservation Arrival Screen','T Junction Statue','Study Work Screen','Conservation Archive Pier'],escape:['Conservation Archive Pier','West Store Partition','Dispatch Work Statue','Workshop Refuge Screen','Handling Waiting Statue','Restoration Exit Screen']}};
}

export const V13_MUSEUM_DISTINCT:V13Mission[]=[westEnfilade(),sculpturePavilion(),restorationBranches()];

/** Reviewed finite input witnesses; these do not teleport, disable capture or alter AI. */
export const MUSEUM_DISTINCT_WITNESSES={
 '01-06':{quick:{approach:0,escape:0,mode:2,delay:8},alternate:{approach:0,escape:1,mode:2,delay:8}},
 '01-07':{quick:{approach:0,escape:0,mode:2,delay:10},alternate:{approach:0,escape:1,mode:2,delay:10}},
 '01-08':{quick:{approach:0,escape:0,mode:2,delay:6},alternate:{approach:1,escape:1,mode:2,delay:5}},
} as const;
