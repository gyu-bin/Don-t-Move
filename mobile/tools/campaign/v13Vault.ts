/**
 * V13 Phase 5 — Chapter 9 High Security Vault. Five floor plans of their own, each a different way in and out:
 * a ring round a central vault, a perimeter in two halves, a spine of layers, a shell walked counter-clockwise,
 * and a deep final vault. The old maps were eight 5×5 rooms on corridors with three props in the vault.
 *
 * The vault kit (gold, cash cages, blast screens, deposit walls) stands in the middle of the rooms as cover.
 * Four guards per floor are authored by role; `secure` adds the two extra guards and the three cameras of the
 * chapter in route rooms nobody watches.
 */
import type {V13Mission,V13Structure,V13Guard,V13Camera,StructureRole} from './v13Types';
import type {V124bEdge} from './v124bTypes';
import {secure} from './v13Reuse';

type Rect=[x0:number,y0:number,x1:number,y1:number];
/** Draws the ASCII plan: zone rectangles, then openings (owned by a zone), then wall piers. Coordinates are cells, inclusive. */
function draw(W:number,H:number,zones:Record<string,Rect>,openings:[zone:string,...Rect][],piers:Rect[]=[]):string[]{
 const g=Array.from({length:H},()=>Array.from({length:W},()=>'#'));
 const fill=(ch:string,[x0,y0,x1,y1]:Rect)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)g[y][x]=ch;};
 for(const[k,r]of Object.entries(zones))fill(k,r);for(const[k,...r]of openings)fill(k,r);for(const r of piers)fill('#',r);
 return g.map(r=>r.join(''));
}
const p=(x:number,y:number)=>({x,y});
const via=(...q:[number,number][])=>q.map(([x,y])=>p(x,y));
const zone=(id:string,name:string,role:V13Mission['zones'][string]['role'],purpose:string,hub?:[number,number])=>({id,name,role,purpose,...(hub?{hub:p(...hub)}:{})});
const door=(x:number,y:number,orientation:'horizontal'|'vertical',lockdown=false):NonNullable<V124bEdge['door']>=>({at:p(x,y),orientation,style:'vaultReinforced',...(lockdown?{lockdown:true}:{})});
const COVER:StructureRole[]=['hiding','losBreak','divider'];
type Art='vault_door'|'vault_deposit_wall'|'vault_blast_screen'|'vault_lockers'|'vault_cash_table'|'vault_inspection_table'|'vault_cash_desk'|'vault_gold_pallet'|'vault_cash_cage'|'vault_case_stack'|'vault_armored_crate'|'vault_gold_strapped'|'vault_black_cases'|'vault_camera_pillar'|'vault_gold_rack'|'vault_cash_trolley';
const KIND:Record<Art,V13Structure['kind']>={vault_door:'bankVaultDoor',vault_deposit_wall:'partition',vault_blast_screen:'partition',vault_lockers:'partition',vault_cash_table:'counter',vault_inspection_table:'counter',vault_cash_desk:'counter',
 vault_gold_pallet:'equipment',vault_cash_cage:'equipment',vault_case_stack:'equipment',vault_armored_crate:'equipment',vault_gold_strapped:'equipment',vault_black_cases:'equipment',vault_camera_pillar:'pillar',vault_gold_rack:'shelf',vault_cash_trolley:'shelf'};
const s=(name:string,asset:Art,x:number,y:number,scale:number,roles:StructureRole[]=COVER):V13Structure=>({name,roles,kind:KIND[asset],asset,x,y,scale});
const guard=(role:V13Guard['role'],zoneId:string,watches:string,...stops:[x:number,y:number,lookX:number,lookY:number,wait:number][]):V13Guard=>
 ({role,zone:zoneId,watches,stops:stops.map(([x,y,lx,ly,wait])=>({x,y,look:p(lx,ly),wait}))});
const third=(v:number,size:number,names:[string,string,string])=>names[Math.min(2,Math.floor(v/size*3))];
const SOUTH=1.5708,NORTH=-1.5708,EAST=0,WEST=3.1416;
const camera=(zoneId:string,x:number,y:number,facing:number,watches:string):V13Camera=>({zone:zoneId,at:p(x,y),facing,watches});
function finish(m:Omit<V13Mission,'placement'|'family'|'objectiveAsset'|'objectiveScale'|'secureDoorStyle'|'highSecurity'>):V13Mission{
 const W=m.map[0].length,H=m.map.length,at=(q:{x:number;y:number})=>{const v=third(q.y,H,['top','centre','bottom']),h=third(q.x,W,['left','centre','right']);return v==='centre'&&h==='centre'?'centre':v==='centre'?`${h}-centre`:`${v}-${h}`;};
 return secure({...m,family:'Vault',placement:[at(m.entry),at(m.objective),at(m.exit)],objectiveAsset:'museum_diamond_case',objectiveScale:1.15,secureDoorStyle:'vaultReinforced',highSecurity:false},6,3);
}

type Draft=Parameters<typeof finish>[0];
/** Adds a second wall row along the top and moves the whole plan down a tile, so tall art on the north wall has wall behind it. */
function lower(m:Draft):Draft{
 const d=<T extends {x:number;y:number}>(q:T):T=>({...q,y:+(q.y+1).toFixed(3)});
 return {...m,map:['#'.repeat(m.map[0].length),...m.map],zones:Object.fromEntries(Object.entries(m.zones).map(([k,z])=>[k,{...z,...(z.hub?{hub:d(z.hub)}:{})}])),
  entry:d(m.entry),objective:d(m.objective),exit:d(m.exit),edges:m.edges.map(e=>({...e,...(e.via?{via:e.via.map(d)}:{}),...(e.door?{door:{...e.door,at:d(e.door.at)}}:{})})),
  structures:m.structures.map(d),guards:m.guards.map(g=>({...g,stops:g.stops.map(q=>({...d(q),look:d(q.look)}))})),cameras:m.cameras.map(c=>({...c,at:d(c.at)}))};
}

/**
 * 09-01 Inner Core Ring — the vault is the middle of the building and the halls run round it.
 * In from the south hall and up the east ring to the vault's east door; out by its north door to the exit lobby,
 * or, after lockdown, back down and all the way round the west side.
 */
const M0901=finish({
 id:'09-01',title:'Inner Core Ring',topology:'Ring round a central vault',
 map:draw(27,23,{x:[1,1,5,5],n:[7,1,25,5],d:[1,7,5,10],w:[1,12,5,15],v:[7,7,19,15],k:[21,7,25,15],s:[1,17,25,21]},
  [['x',6,2,6,4],['x',2,6,4,6],['d',2,11,4,11],['w',2,16,4,16],['n',12,6,14,6],['n',22,6,24,6],['v',20,10,20,12],['k',22,16,24,16]],[[9,7,9,10]]),
 zones:{
  s:zone('southHall','South Hall','public','Arrival; a screen and a table split it into two lanes',[17.5,19.9]),
  k:zone('eastRing','East Ring','restricted','Up the west side to the vault door while the ring guard walks the east side of the case stack',[21.9,11.5]),
  v:zone('core','Core Vault','objective','Diamond in the north-west bay behind the wall pier; a blast screen and two gold islands make three lanes',[11,12.45]),
  n:zone('northRing','North Ring','escape','Quick way west to the exit lobby; its lobby door closes at lockdown',[13.5,3.5]),
  w:zone('westRing','West Ring','escape','Way round after lockdown',[3.5,13.5]),
  d:zone('westStair','West Stair','escape','Last leg to the exit lobby after lockdown',[3.5,8.5]),
  x:zone('exitLobby','Exit Lobby','escape','Exit',[3.5,3.5]),
 },
 entry:p(17.5,20.8),objective:p(8,8.6),exit:p(2.2,3.5),entryEdge:'bottom',exitEdge:'left',
 edges:[
  {from:'southHall',to:'eastRing',role:'approach',via:via([23.5,19.9],[23.5,16.5],[21.9,15.2])},
  {from:'southHall',to:'eastRing',role:'risk',via:via([17.5,17.9],[23.5,17.9],[23.5,16.5],[21.9,15.2])},
  {from:'eastRing',to:'core',role:'approach',via:via([20.5,11.5],[19,12.45]),door:door(20.5,11.5,'vertical')},
  {from:'core',to:'northRing',role:'quickEscape',via:via([11,9],[13.5,9],[13.5,6.5]),door:door(13.5,6.5,'horizontal')},
  {from:'northRing',to:'exitLobby',role:'quickEscape',via:via([11.5,4.9],[8.5,4.9]),door:door(6.5,3.5,'vertical',true)},
  {from:'core',to:'eastRing',role:'alternateEscape',via:via([19,12.45],[20.5,11.5])},
  {from:'eastRing',to:'southHall',role:'alternateEscape',via:via([21.9,15.2],[23.5,16.5],[23.5,19.9])},
  {from:'southHall',to:'westRing',role:'alternateEscape',via:via([3.5,19.9],[3.5,16.5])},
  {from:'westRing',to:'westStair',role:'alternateEscape'},
  {from:'westStair',to:'exitLobby',role:'alternateEscape'},
 ],
 approach:['southHall','eastRing','core'],risk:['southHall','eastRing','core'],
 quickEscape:['core','northRing','exitLobby'],alternateEscape:['core','eastRing','southHall','westRing','westStair','exitLobby'],
 cover:{safe:['Hall Blast Screen','Hall Inspection Table','Ring Case Stack','Core Gold Bars','Core Gold Pallet'],risk:['Hall Blast Screen','Core Blast Screen'],escape:['Core Pier','Core Blast Screen','North Case Stack','North Black Cases']},
 structures:[
  s('Core Blast Screen','vault_blast_screen',14.5,11.3,1.6),s('Core Gold Pallet','vault_gold_pallet',12.5,13.9,1.5),s('Core Gold Bars','vault_gold_strapped',16.5,13.9,1.5),
  s('Core Cash Cage','vault_cash_cage',19.25,7.6,1.5),s('Core Deposit Wall','vault_deposit_wall',8,7.23,1.3,['losBreak','sightline']),
  s('Hall Blast Screen','vault_blast_screen',9.5,18.9,1.6),s('Hall Inspection Table','vault_inspection_table',19,18.9,1.5),
  s('Ring Case Stack','vault_case_stack',23.5,13.6,1.3),s('Ring Cash Trolley','vault_cash_trolley',21.65,8.4,1),
  s('North Black Cases','vault_black_cases',11.5,3.5,1.5),s('North Case Stack','vault_case_stack',18,3.5,1.5),
  s('West Armoured Crate','vault_armored_crate',1.6,14,1.2),s('Stair Crate','vault_armored_crate',5.5,7.4,1),s('Lobby Black Cases','vault_black_cases',5.4,1.48,1.2),
 ],
 walls:[{name:'Core Pier',roles:['losBreak','hiding','divider'],at:'pier closing the diamond bay of the Core Vault'}],
 guards:[
  guard('lobby','southHall','The north lane of the South Hall west of the arrival point: the west ring opening from the west post, the middle of the hall from the east post',[4.5,17.9,3.5,16.6,3],[13,17.9,17,17.9,3]),
  guard('restricted','eastRing','The east side of the East Ring: the vault door from the north post, the hall opening from the south post',[25.1,8.6,20.6,11.5,3],[25.1,14.6,23.5,16.6,3]),
  guard('escape','exitLobby','The way out: the north ring door from the lobby post, then the West Stair',[3.5,4.6,6.4,3.5,2],[3.5,8.5,3.5,11,5]),
  guard('crossing','northRing','The north lane of the North Ring east of the vault door, as far as the east ring opening',[15.5,2.2,12,2.2,3],[24,2.2,23.5,6,3]),
  guard('crossing','westRing','The West Ring: the stair opening from the north post, the hall opening from the south post',[4.8,12.7,3.5,11.4,3],[4.8,15.3,3.5,16.6,3]),
  guard('objective','core','The diamond; between inspections walks the south lane of the vault behind the gold',[8,11.6,8,8.6,2],[8,15.25,12,15.25,0],[18.5,15.25,18.5,12,5]),
 ],
 cameras:[
  camera('northRing',9,1.4,SOUTH,'The west end of the North Ring in front of the lobby door'),
  camera('southHall',21.4,17.4,SOUTH,'The east end of the South Hall under the east ring opening'),
  camera('core',17.5,7.4,SOUTH,'The north-east of the Core Vault: the short way from the east door to the diamond bay'),
 ],
});

/**
 * 09-02 Split Perimeter — the building is two halves that meet only inside the vault.
 * In along the west hall and the north hall to the vault's north door. Out by the south door straight into the
 * exit lobby; after lockdown, out of the west door and round through the sorting room and the south passage.
 */
const M0902=finish({
 id:'09-02',title:'Split Perimeter',topology:'Two halves joined by the vault',
 map:draw(26,22,{a:[1,12,6,20],b:[1,1,6,10],c:[8,1,24,5],v:[15,7,24,14],t:[8,7,13,14],q:[8,16,17,20],x:[19,16,24,20]},
  [['b',3,11,5,11],['b',7,2,7,4],['c',17,6,19,6],['t',14,10,14,12],['v',20,15,22,15],['t',10,15,12,15],['q',18,17,18,19]],[[22,7,22,10]]),
 zones:{
  a:zone('arrival','Arrival','public','Arrival in the south-west corner under a camera; the cases are the cover from it',[5.2,14.2]),
  b:zone('westHall','West Hall','transition','North up the east lane while the hall guard walks the west lane behind the two islands',[5.2,6.5]),
  c:zone('northHall','North Hall','restricted','East along the south lane behind the gold; the guard walks the north lane and a camera watches the vault door',[13.5,5]),
  v:zone('vault','Vault','objective','Diamond in the north-east bay behind the wall pier; the blast screen and the gold split the vault into a watched north lane and the guard\'s south lane',[21.3,10.4]),
  t:zone('sorting','Sorting Room','escape','Way out of the vault\'s west door after lockdown',[12.9,13.6]),
  q:zone('southPassage','South Passage','escape','East to the exit lobby after lockdown',[11.5,17.2]),
  x:zone('exitLobby','Exit Lobby','escape','Exit; the vault\'s south door into it closes at lockdown',[21.5,18.5]),
 },
 entry:p(2.2,18.5),objective:p(24,8.6),exit:p(23.8,18.5),entryEdge:'left',exitEdge:'right',
 edges:[
  {from:'arrival',to:'westHall',role:'approach',via:via([5.2,11.5])},
  {from:'westHall',to:'northHall',role:'approach',via:via([5.2,3.5],[7.5,3.5],[9,5])},
  {from:'westHall',to:'northHall',role:'risk',via:via([5.2,3.5],[7.5,3.5],[9.6,3.5],[9.6,2],[13.5,2])},
  {from:'northHall',to:'vault',role:'approach',via:via([18.5,5],[18.5,6.5],[18.5,9.6],[21.3,9.6]),door:door(18.5,6.5,'horizontal')},
  {from:'vault',to:'exitLobby',role:'quickEscape',via:via([21.3,10.4],[21.3,12.6],[21.5,15.5]),door:door(21.5,15.5,'horizontal',true)},
  {from:'vault',to:'sorting',role:'alternateEscape',via:via([21.3,13.9],[16.5,13.9],[16.5,11.5],[14.5,11.5],[12.9,11.5]),door:door(14.5,11.5,'vertical')},
  {from:'sorting',to:'southPassage',role:'alternateEscape',via:via([11.5,15.5])},
  {from:'southPassage',to:'exitLobby',role:'alternateEscape',via:via([16.6,17.2],[16.6,18.5],[18.5,18.5])},
 ],
 approach:['arrival','westHall','northHall','vault'],risk:['arrival','westHall','northHall','vault'],
 quickEscape:['vault','exitLobby'],alternateEscape:['vault','sorting','southPassage','exitLobby'],
 cover:{safe:['Arrival Black Cases','Hall Case Stack','Hall Armoured Crate','North Gold Bars','North Case Stack'],risk:['North Gold Bars','North Case Stack'],escape:['Vault Pier','Vault Blast Screen','Sorting Gold Rack','Passage Blast Screen']},
 structures:[
  s('Vault Blast Screen','vault_blast_screen',18.6,11.3,1.6),s('Vault Gold Pallet','vault_gold_pallet',18.6,12.16,1.4),
  s('Vault Deposit Wall','vault_deposit_wall',16,7.23,1.3,['losBreak','sightline']),
  s('North Gold Bars','vault_gold_strapped',11.5,3.5,1.5),s('North Case Stack','vault_case_stack',17,3.5,1.5),
  s('Hall Case Stack','vault_case_stack',3.6,8.3,1.5),s('Hall Armoured Crate','vault_armored_crate',3.6,4.6,1.4),s('Arrival Black Cases','vault_black_cases',3.5,14.2,1.5),s('Arrival Armoured Crate','vault_armored_crate',4.2,17.6,1.3),
  s('Sorting Gold Rack','vault_gold_rack',11.1,11.5,1.4),s('Sorting Cash Trolley','vault_cash_trolley',13.35,7.35,1),
  s('Passage Blast Screen','vault_blast_screen',14,18.3,1.6),
 ],
 walls:[{name:'Vault Pier',roles:['losBreak','hiding','divider'],at:'pier closing the diamond bay of the Vault'}],
 guards:[
  guard('lobby','westHall','The west lane of the West Hall: the arrival opening from the south post, the north hall opening from the north post',[1.9,9.8,4.5,11.4,3],[1.9,2.2,7.4,3.5,3]),
  guard('restricted','northHall','The north lane of the North Hall: the west opening from the west post, the east end from the east post',[9.5,2,7.6,3.5,3],[15.5,2,19,2,3]),
  guard('escape','exitLobby','The way out: the exit from the lobby post, then the east end of the South Passage',[20.3,18.5,23.8,18.5,2],[16.6,18.5,13,18.5,5]),
  guard('crossing','sorting','The west side of the Sorting Room, across the vault door and the passage opening',[9.2,8.2,13,8.2,3],[9.2,13.8,11.5,15.4,3]),
  guard('crossing','southPassage','The south lane of the South Passage behind the blast screen',[9.5,19.9,11.5,16.4,3],[14.5,19.9,17,19.9,3]),
  guard('objective','vault','The diamond; between inspections walks the south lane to the west door',[24,11.6,24,8.6,2],[24,13.9,20,13.9,0],[16.3,13.9,15.2,11.5,7]),
 ],
 cameras:[
  camera('arrival',1.5,12.4,SOUTH,'The north half of the Arrival room below the hall opening'),
  camera('northHall',20.5,1.4,SOUTH,'The vault door from the east end of the North Hall'),
  camera('vault',15.4,9.5,EAST,'The north lane of the Vault from the west wall: the short way from the north door to the diamond bay'),
 ],
});

/**
 * 09-03 Layered Vault Spine — lobby, checkpoint hall, lock and vault in a line, service runs above and below.
 * In through the layers. Out north through the control run to the exit lobby beside the entrance; when that door
 * and the lobby door close, out south through the bullion run and back up through the lobby.
 */
const M0903=finish({
 id:'09-03',title:'Layered Vault Spine',topology:'Layers in a line, service runs either side',
 map:draw(28,23,{l:[22,7,26,15],h:[14,7,20,15],c:[9,7,12,15],v:[1,7,7,15],n:[1,1,13,5],a:[15,1,20,5],x:[22,1,26,5],u:[1,17,13,21],t:[15,17,26,21]},
  [['h',21,10,21,12],['c',13,10,13,12],['v',8,10,8,12],['n',4,6,6,6],['n',14,2,14,4],['a',21,2,21,4],['v',3,16,5,16],['u',14,18,14,20],['l',23,16,25,16],['x',23,6,25,6]],[[3,7,3,10]]),
 zones:{
  l:zone('lobby','Lobby','public','Arrival behind the cases; the exit guard walks down into the north of the room, and the hall door closes at lockdown',[24,11.5]),
  h:zone('checkpoint','Checkpoint Hall','transition','Round the block in the middle: the guard walks the slot between the screen and the gold, a camera watches the north lane, the south lane is cover',[20,11.5]),
  c:zone('lock','Vault Lock','restricted','Narrow lock walked end to end by the lock guard; crossed behind his back',[11,11.5]),
  v:zone('vault','Vault','objective','Diamond in the north-west bay behind the wall pier',[5.5,11.5]),
  n:zone('controlRun','Control Run','escape','Quick way east above the layers, along the south lane behind the crate and the table',[5.5,5]),
  a:zone('archive','Archive','escape','Last room before the exit lobby under a camera; its door closes at lockdown',[17.4,5.1]),
  u:zone('bullionRun','Bullion Run','escape','Way out below the layers after lockdown, under a camera',[4.6,20.6]),
  t:zone('loading','Loading Bay','escape','Back east along the south lane to the lobby',[16.5,20.6]),
  x:zone('exitLobby','Exit Lobby','escape','Exit above the lobby',[24.5,4.4]),
 },
 entry:p(25.8,14.4),objective:p(2,8.6),exit:p(24,2.2),entryEdge:'right',exitEdge:'top',
 edges:[
  {from:'lobby',to:'checkpoint',role:'approach',door:door(21.5,11.5,'vertical',true)},
  {from:'checkpoint',to:'lock',role:'approach',via:via([20,15.25],[15,15.25],[15,11.5],[13.5,11.5]),door:door(13.5,11.5,'vertical')},
  {from:'checkpoint',to:'lock',role:'risk',via:via([20,9.2],[15,9.2],[15,11.5],[13.5,11.5])},
  {from:'lock',to:'vault',role:'approach',door:door(8.5,11.5,'vertical')},
  {from:'vault',to:'controlRun',role:'quickEscape',via:via([5.5,9.5],[5.5,6.5])},
  {from:'controlRun',to:'archive',role:'quickEscape',via:via([13,5],[13,3.5],[14.5,3.5],[15.6,3.5],[15.6,5.1])},
  {from:'archive',to:'exitLobby',role:'quickEscape',via:via([20.3,5.1],[20.3,3.5],[21.5,3.5],[24.5,3.5]),door:door(21.5,3.5,'vertical',true)},
  {from:'vault',to:'bullionRun',role:'alternateEscape',via:via([4.6,12.6],[4.6,16.5])},
  {from:'bullionRun',to:'loading',role:'alternateEscape',via:via([13.4,20.6],[13.4,19.5],[14.5,19.5],[16.5,19.5])},
  {from:'loading',to:'lobby',role:'alternateEscape',via:via([24.5,20.6],[24.5,16.5],[24,16.5])},
  {from:'lobby',to:'exitLobby',role:'alternateEscape',via:via([24.5,11.5],[24.5,6.5])},
 ],
 approach:['lobby','checkpoint','lock','vault'],risk:['lobby','checkpoint','lock','vault'],
 quickEscape:['vault','controlRun','archive','exitLobby'],alternateEscape:['vault','bullionRun','loading','lobby','exitLobby'],
 cover:{safe:['Lobby Black Cases','Hall Gold Pallet','Hall Gold Bars','Lock Camera Pillar'],risk:['Hall Blast Screen','Lock Cash Trolley'],escape:['Vault Pier','Vault Gold Pallet','Run Armoured Crate','Run Inspection Table','Archive Case Stack','Bullion Blast Screen','Loading Gold Pallet']},
 structures:[
  s('Vault Deposit Wall','vault_deposit_wall',2,7.23,1.3,['losBreak','sightline']),s('Vault Gold Pallet','vault_gold_pallet',7.25,8.6,1.5),s('Vault Cash Cage','vault_cash_cage',7.25,13.6,1.5),s('Vault Blast Screen','vault_blast_screen',2.12,13.7,1.6),
  s('Lock Camera Pillar','vault_camera_pillar',12.48,9.3,1.3),s('Lock Cash Trolley','vault_cash_trolley',12.35,13.7,1),
  s('Hall Blast Screen','vault_blast_screen',17.5,11.5,1.8),s('Hall Gold Pallet','vault_gold_pallet',16.8,13.91,1.4),s('Hall Gold Bars','vault_gold_strapped',18.2,13.91,1.4),
  s('Lobby Black Cases','vault_black_cases',26.4,12.4,1.2),
  s('Run Armoured Crate','vault_armored_crate',8,3.5,1.4),s('Run Inspection Table','vault_inspection_table',11.2,3.5,1.4),s('Archive Case Stack','vault_case_stack',17.4,3.5,1.3),
  s('Bullion Blast Screen','vault_blast_screen',6.6,19.5,1.6),s('Bullion Gold Rack','vault_gold_rack',11.5,19.5,1.4),
  s('Loading Gold Pallet','vault_gold_pallet',18,19.5,1.4),s('Loading Cash Table','vault_cash_table',21.3,19.5,1.4),
 ],
 walls:[{name:'Vault Pier',roles:['losBreak','hiding','divider'],at:'pier closing the diamond bay of the Vault'}],
 guards:[
  guard('lobby','checkpoint','The slot between the screen and the gold in the Checkpoint Hall: the lobby door from the east post, the lock door from the west post',[19.9,12.6,21.4,11.5,3],[15.1,12.6,13.6,11.5,3]),
  guard('restricted','lock','The Vault Lock end to end; turns his back on the doors at each end wall',[10.2,8.2,10.2,7.2,3],[10.2,14.8,10.2,15.8,3]),
  guard('escape','exitLobby','The way out: the archive door from the lobby post, then the north of the Lobby',[26,4.8,22.2,3.5,2],[26,8.4,22.5,8.4,5]),
  guard('crossing','controlRun','The north lane of the Control Run: the vault opening from the west post, the archive opening from the east post',[2.5,2,5.5,5.8,3],[12.5,2,14.4,3.5,3]),
  guard('crossing','loading','The north lane of the Loading Bay: the bullion opening from the west post, the lobby opening from the east post',[16.5,17.9,15.1,19.5,3],[22,17.9,24.5,16.6,3]),
  guard('objective','vault','The diamond; between inspections stands over the south opening',[2,11.6,2,8.6,2],[5.6,12.8,5.6,14,0],[5.6,14.8,4.6,16.4,5]),
 ],
 cameras:[
  camera('checkpoint',17.5,7.4,SOUTH,'The north lane of the Checkpoint Hall, the short way between its two doors'),
  camera('archive',19.8,1.4,SOUTH,'The east half of the Archive in front of the exit lobby door'),
  camera('bullionRun',9.5,17.4,SOUTH,'The middle of the Bullion Run between the screen and the rack'),
 ],
});

/**
 * 09-04 Counterclockwise Shell — galleries wrap the core; the way in runs against the clock.
 * Up the east gallery, west along the north gallery, in by the core's north door. Out of its west door and down
 * to the exit lobby; after lockdown, out of the south door and west through the pump room.
 */
const M0904=finish({
 id:'09-04',title:'Counterclockwise Shell',topology:'Shell walked counter-clockwise round the core',
 map:draw(26,22,{e:[20,15,24,20],g:[20,1,24,13],n:[7,1,18,5],w:[1,1,5,13],v:[7,7,18,13],u:[13,15,18,20],q:[7,15,11,20],x:[1,15,5,20]},
  [['g',21,14,23,14],['n',19,2,19,4],['w',6,2,6,4],['w',6,11,6,13],['n',14,6,16,6],['v',14,14,16,14],['w',2,14,4,14],['q',12,17,12,19],['x',6,17,6,19]],[[9,7,9,10]]),
 zones:{
  e:zone('arrival','Arrival','public','Arrival in the south-east corner',[22.5,17]),
  g:zone('eastGallery','East Gallery','transition','North up the west lane; the gallery guard walks the east lane and a camera watches the turn at the north end',[20.9,8]),
  n:zone('northGallery','North Gallery','restricted','Behind the gold to the core\'s north door while the guard walks the north lane',[18.3,5]),
  v:zone('core','Core','objective','Diamond in the north-west bay behind the wall pier; the blast screen divides the north lane from the guard\'s south lane',[10.6,9.3]),
  w:zone('westGallery','West Gallery','escape','Quick way out of the core\'s west door, two steps from the lobby door that closes at lockdown, under a camera',[3.5,12.5]),
  u:zone('southGallery','South Gallery','escape','Way out of the core\'s south door after lockdown, under a camera',[15,18.5]),
  q:zone('pumpRoom','Pump Room','escape','West to the exit lobby under the pump guard',[9.5,18.5]),
  x:zone('exitLobby','Exit Lobby','escape','Exit',[3.5,18.5]),
 },
 entry:p(22.5,19.8),objective:p(8,8.6),exit:p(2.2,18.5),entryEdge:'bottom',exitEdge:'left',
 edges:[
  {from:'arrival',to:'eastGallery',role:'approach',via:via([22.5,14.5],[22.5,13.2],[20.9,13.2])},
  {from:'arrival',to:'eastGallery',role:'risk',via:via([22.5,14.5],[22.5,13.2],[24.1,13.2],[24.1,8])},
  {from:'eastGallery',to:'northGallery',role:'approach',via:via([20.9,3.5],[19.5,3.5],[18.3,3.5])},
  {from:'northGallery',to:'core',role:'approach',via:via([15.5,5],[15.5,6.5],[15.5,9.3]),door:door(15.5,6.5,'horizontal')},
  {from:'core',to:'westGallery',role:'quickEscape',via:via([6.5,12.5]),door:door(6.5,12.5,'vertical')},
  {from:'westGallery',to:'exitLobby',role:'quickEscape',via:via([3.5,14.5]),door:door(3.5,14.5,'horizontal',true)},
  {from:'core',to:'southGallery',role:'alternateEscape',via:via([10.6,9.3],[15.5,9.3],[15.5,14.5],[15,14.5]),door:door(15.5,14.5,'horizontal')},
  {from:'southGallery',to:'pumpRoom',role:'alternateEscape',via:via([12.5,18.5])},
  {from:'pumpRoom',to:'exitLobby',role:'alternateEscape',via:via([6.5,18.5])},
 ],
 approach:['arrival','eastGallery','northGallery','core'],risk:['arrival','eastGallery','northGallery','core'],
 quickEscape:['core','westGallery','exitLobby'],alternateEscape:['core','southGallery','pumpRoom','exitLobby'],
 cover:{safe:['Arrival Black Cases','Gallery Case Stack','Gallery Armoured Crate','North Gold Bars','Core Gold Pallet'],risk:['North Cash Table','Core Blast Screen'],escape:['Core Pier','Core Blast Screen','Core Lockers','South Case Stack','Pump Armoured Crate']},
 structures:[
  s('Core Deposit Wall','vault_deposit_wall',8,7.23,1.3,['losBreak','sightline']),s('Core Blast Screen','vault_blast_screen',12.6,10.9,1.6),s('Core Lockers','vault_lockers',17.88,10.9,1.6),
  s('Core Gold Pallet','vault_gold_pallet',10.7,7.6,1.4),s('Core Cash Cage','vault_cash_cage',18.25,7.6,1.5),
  s('North Cash Table','vault_cash_table',12,3.5,1.5),s('North Gold Bars','vault_gold_strapped',16.9,3.5,1.4),
  s('Gallery Case Stack','vault_case_stack',22.5,10,1.3),s('Gallery Armoured Crate','vault_armored_crate',22.5,5.8,1.3),s('Arrival Black Cases','vault_black_cases',20.72,17.2,1.2),
  s('West Black Cases','vault_black_cases',3.6,5,1.3),s('South Case Stack','vault_case_stack',18.3,18.2,1.4),s('Pump Armoured Crate','vault_armored_crate',9.5,17.4,1.3),
 ],
 walls:[{name:'Core Pier',roles:['losBreak','hiding','divider'],at:'pier closing the diamond bay of the Core'}],
 guards:[
  guard('lobby','eastGallery','The east lane of the East Gallery: the arrival opening from the south post, the north end from the north post',[24.1,12.6,22.5,14.4,3],[24.1,7,24.1,3,3]),
  guard('restricted','northGallery','The north lane of the North Gallery: the east opening from the east post, the west opening from the west post',[17.5,2.1,19.4,3.5,3],[9,2.1,7.1,3.5,3]),
  guard('escape','exitLobby','The Exit Lobby: the pump room opening from the south post, the gallery door from the north post',[4.8,19.8,6.4,18.5,5],[4.8,16.4,3.5,15.2,2]),
  guard('crossing','westGallery','The west lane of the West Gallery: the north gallery opening from the north post, the length of the gallery from the south post',[2,2.4,6.4,3.5,3],[2,7.6,3.5,12,3]),
  guard('crossing','pumpRoom','The north side of the Pump Room, across both of its openings',[8,16.1,6.4,18.5,3],[11,16.1,12.4,18.5,3]),
  guard('objective','core','The diamond; between inspections walks the south lane and stands over the south door',[8,11.6,8,8.6,2],[8,12.6,12,12.6,0],[17.8,12.6,15.5,14,6]),
 ],
 cameras:[
  camera('eastGallery',23.5,1.4,SOUTH,'The north end of the East Gallery where the way turns west'),
  camera('westGallery',1.4,10,0.7854,'The south end of the West Gallery between the core door and the lobby door'),
  camera('southGallery',13.5,15.4,SOUTH,'The west half of the South Gallery in front of the pump room opening'),
 ],
});

/**
 * 09-05 Final Vault Core — three layers up to a vault seven tiles deep.
 * Lobby, checkpoint, antechamber, vault: each layer is crossed sideways to reach the next, and the diamond is at the
 * far end of the vault from its door. Out east down a stair with two screens to duck behind; after lockdown, west down the far stair and back through the lobby.
 */
const M0905=finish(lower({
 id:'09-05',title:'Final Vault Core',topology:'Deep in through three layers, loop out',
 map:draw(29,26,{l:[7,21,21,24],h:[7,15,21,19],a:[7,9,21,13],v:[7,1,21,7],k:[23,1,27,19],x:[23,21,27,24],d:[1,1,5,13],w:[1,15,5,24]},
  [['h',13,20,15,20],['a',9,14,11,14],['a',17,14,19,14],['v',9,8,11,8],['v',22,5,22,7],['k',24,20,26,20],['d',6,2,6,4],['d',2,14,4,14],['w',6,21,6,23],['l',22,21,22,23]],[[19,1,19,4]]),
 zones:{
  l:zone('lobby','Lobby','public','Arrival; the checkpoint door ahead closes at lockdown, and a camera watches the east end in front of the exit lobby',[14.5,22.5]),
  h:zone('checkpoint','Checkpoint','transition','Sideways along the south lane to one of two openings: the east one behind the lockers, the west one straight under the guard',[14.5,19]),
  a:zone('antechamber','Antechamber','restricted','West along the south lane behind the blast screen to the vault door, while the guard walks the north lane',[10.5,13.1]),
  v:zone('vault','Final Vault','objective','Diamond in the north-east bay, the whole vault away from the door: a camera over the north lane, the guard on the south lane, the screen and the gold between them',[18.3,3.2]),
  k:zone('eastStair','East Stair','escape','Quick way down the east lane, ducking behind the two screens while the stair guard passes; the door at its foot closes at lockdown',[26.8,6.5]),
  d:zone('westStair','West Stair','escape','Way out after lockdown, back across the whole vault',[5.1,8.5]),
  w:zone('westWing','West Wing','escape','Down to the lobby',[5.1,18.6]),
  x:zone('exitLobby','Exit Lobby','escape','Exit beside the lobby',[25.5,23]),
 },
 entry:p(14.5,23.8),objective:p(21,2.6),exit:p(26.8,23),entryEdge:'bottom',exitEdge:'right',
 edges:[
  {from:'lobby',to:'checkpoint',role:'approach',door:door(14.5,20.5,'horizontal',true)},
  {from:'checkpoint',to:'antechamber',role:'approach',via:via([18.5,19],[18.5,14.5],[18.5,13.1])},
  {from:'checkpoint',to:'antechamber',role:'risk',via:via([10.5,19],[10.5,14.5])},
  {from:'antechamber',to:'vault',role:'approach',via:via([10.5,8.5],[10.5,6.9],[8.6,6.9],[8.6,2.4],[18.3,2.4]),door:door(10.5,8.5,'horizontal')},
  {from:'vault',to:'eastStair',role:'quickEscape',via:via([21,6.5],[22.5,6.5])},
  {from:'eastStair',to:'exitLobby',role:'quickEscape',via:via([26.8,18.4],[25.5,18.4],[25.5,20.5]),door:door(25.5,20.5,'horizontal',true)},
  {from:'vault',to:'westStair',role:'alternateEscape',via:via([18.3,6.2],[18.3,2.4],[8.6,2.4],[8.6,3.5],[6.5,3.5],[5.1,3.5])},
  {from:'westStair',to:'westWing',role:'alternateEscape',via:via([5.1,13.2],[3.5,13.2],[3.5,14.5],[3.5,16.2],[5.1,16.2])},
  {from:'westWing',to:'lobby',role:'alternateEscape',via:via([5.1,22.5],[6.5,22.5])},
  {from:'lobby',to:'exitLobby',role:'alternateEscape',via:via([16.2,22.5],[16.2,21.75],[21.2,21.75],[21.2,22.5],[22.5,22.5],[25.5,22.5])},
 ],
 approach:['lobby','checkpoint','antechamber','vault'],risk:['lobby','checkpoint','antechamber','vault'],
 quickEscape:['vault','eastStair','exitLobby'],alternateEscape:['vault','westStair','westWing','lobby','exitLobby'],
 cover:{safe:['Checkpoint Lockers','Antechamber Blast Screen','Vault Blast Screen','Vault Gold Pallet'],risk:['Checkpoint Cash Table','Vault Blast Screen'],escape:['Vault Pier','Stair Screen North','Stair Screen South','Stair Armoured Crate','Wing Case Stack','Lobby Black Cases']},
 structures:[
  s('Vault Door','vault_door',10.2,1.16,.9,['losBreak','sightline']),s('Vault Deposit Wall','vault_deposit_wall',21,1.23,1.3,['losBreak','sightline']),
  s('Vault Blast Screen','vault_blast_screen',11.5,4.1,1.8),s('Vault Gold Pallet','vault_gold_pallet',15.8,4.5,1.6),
  s('Antechamber Blast Screen','vault_blast_screen',14.5,11.5,2),s('Antechamber Gold Bars','vault_gold_strapped',18.4,11.5,1.4),s('Antechamber Cash Cage','vault_cash_cage',21.25,9.6,1.5),
  s('Checkpoint Cash Table','vault_cash_table',12.4,17.5,1.5),s('Checkpoint Lockers','vault_lockers',16.4,17.5,1.6),
  s('Lobby Black Cases','vault_black_cases',17.8,23,1.2),
  s('Stair Screen North','vault_blast_screen',24.33,10,1.9),s('Stair Screen South','vault_lockers',24.33,15,1.9),s('Stair Gold Rack','vault_gold_rack',25.5,2.8,1.4),
  s('Stair Armoured Crate','vault_armored_crate',3.5,8.5,1.3),s('Wing Case Stack','vault_case_stack',3.5,18.6,1.3),
 ],
 walls:[{name:'Vault Pier',roles:['losBreak','hiding','divider'],at:'pier closing the diamond bay of the Final Vault'}],
 guards:[
  guard('lobby','checkpoint','The north lane of the Checkpoint: the west opening from the west post, the east opening from the east post',[9,16.1,10.5,14.6,3],[20,16.1,18.5,14.6,3]),
  guard('restricted','antechamber','The north lane of the Antechamber: the vault door from the west post, the east opening from the east post',[12,9.9,10.5,9,3],[19.5,9.9,18.5,13.8,3]),
  guard('escape','eastStair','The east lane of the East Stair: the vault opening from the north post, the foot of the stair from the south post',[26.8,8.2,22.6,6.5,3],[26.8,13.2,26.8,16.5,3]),
  guard('crossing','westStair','The west lane of the West Stair: the vault opening from the north post, the wing opening from the south post',[1.9,5.5,6.4,3.5,3],[1.9,12.5,3.5,14.4,3]),
  guard('crossing','westWing','The west lane of the West Wing: the stair opening from the north post, the lobby opening from the south post',[1.9,16.8,3.5,15.2,3],[1.9,23,6.4,22.5,3]),
  guard('objective','vault','The diamond; between inspections walks the south lane the length of the vault to the west opening',[21,5.6,21,2.6,2],[21,6.8,15,6.8,0],[8.5,6.8,7.2,3.5,6]),
 ],
 cameras:[
  camera('vault',14,1.4,SOUTH,'The gap between the blast screen and the gold, and the north lane either side of it'),
  camera('eastStair',23.4,18.3,EAST,'The foot of the East Stair in front of the exit lobby door'),
  camera('lobby',20.5,21.4,SOUTH,'The east end of the Lobby in front of the exit lobby opening'),
 ],
}));

export const V13_VAULT_CH9:V13Mission[]=[M0901,M0902,M0903,M0904,M0905];
