/** Chapter 7: hand-routed freight sidings, machinery transfer, container lines and secure dispatch. */
import type {V13Mission} from './v13Types';
import {drawServiceBlueprint} from './v13MansionDistinct';

type Blueprint=Parameters<typeof drawServiceBlueprint>[0];
type Prop=Blueprint['props'][number];
const warehouse=(b:Omit<Blueprint,'family'>)=>drawServiceBlueprint({...b,family:'Warehouse'});
const rack=(room:string,name:string,corner?:Prop[5]):Prop=>[room,name,'warehouseRack','warehouse_rack',.68,corner];
const crate=(room:string,name:string,corner?:Prop[5]):Prop=>[room,name,'warehouseCrateStack','warehouse_crate_stack',.72,corner];
const container=(room:string,name:string,corner?:Prop[5]):Prop=>[room,name,'warehouseContainer','warehouse_container',.72,corner];
const lift=(room:string,name:string,corner?:Prop[5]):Prop=>[room,name,'warehouseForklift','warehouse_forklift',.68,corner];
const belt=(room:string,name:string,corner?:Prop[5]):Prop=>[room,name,'warehouseConveyor','warehouse_conveyor',.84,corner];
const cage=(room:string,name:string,corner?:Prop[5]):Prop=>[room,name,'warehouseStorageCage','warehouse_storage_cage',.72,corner];

export const V13_WAREHOUSE_DISTINCT:V13Mission[]=[
 warehouse({
  id:'07-02',title:'Restricted Freight',
  topology:'Freight sidings stagger along a loading spine; the bypass goes around the long customs loop',
  rooms:[
   ['e',0,2,'Freight Check-In','public'],['a',0,1,'Manifest Office','public'],['b',0,0,'Pallet Staging','transition'],['c',1,0,'Customs Inspection','restricted'],
   ['d',2,0,'Upper Transfer Line','restricted'],['t',2,1,'Freight Sorting Bay','restricted'],['u',2,2,'Sealed Freight Checkpoint','restricted'],['o',3,2,'Restricted Cargo','objective'],
   ['r',1,2,'Forklift Crossing','restricted'],['q',3,3,'Express Loading Bay','escape'],['x',2,3,'Dispatch Exit','escape'],
   ['s',3,1,'East Switch Room','escape'],['k',3,0,'Empty Pallet Rack','escape'],['h',4,0,'Weighbridge','escape'],['j',4,1,'Outer Truck Line','escape'],
   ['m',4,2,'East Freight Buffer','escape'],['n',4,3,'Back Loading Hall','escape'],['z',4,4,'Lower Dispatch Lane','escape'],['v',3,4,'Return Containers','escape'],['w',2,4,'Dock Tools','escape'],
  ],
  paths:['eabcdtuo','eruo','oqx','osjmnzvwx'],crossLinks:['skhj'],entryEdge:'left',exitEdge:'left',
  props:[crate('a','Manifest Office Crates'),rack('b','Pallet Staging Rack','se'),belt('c','Customs Belt','sw'),cage('d','Customs Empty Cage'),
   container('t','Sorting Bay Container','se'),['u','Checkpoint High Rack','warehouseRack','warehouse_rack',1.16,'nw'],lift('r','Forklift Refuge','sw'),crate('q','Express Bay Pallets','se'),
   crate('k','Empty Pallet Stack'),rack('s','Switch Room Rack','se'),['m','Full Buffer Container','warehouseContainer','warehouse_container',1.15,'nw'],crate('n','Loading Hall Crates','sw'),rack('w','Dock Tool Rack')],
  patrols:[['lobby',['c','east','north',2],['c','west','south',5]],['crossing',['r','east','north',3],['r','west','south',5]],['escape',['n','north','east',2,1.15],['n','west','east',5,3.5]]],
  cameras:[['r','north',Math.PI/2,'Monitor the direct forklift crossing'],['q','south',-Math.PI/2,'Monitor the express loading bay']],
 }),
 warehouse({
  id:'07-03',title:'Machinery Cross',
  topology:'A central machine transfer crossed from an exposed lane or via the western equipment turn; lower service trench after closure',
  rooms:[
   ['e',2,0,'Maintenance Entry','public'],['a',1,0,'Spare Parts Store','public'],['b',1,1,'Tool Room Junction','transition'],['c',0,1,'West Machine Shop','restricted'],
   ['d',0,2,'Heavy Lift Bay','restricted'],['o',1,2,'Machine Control Cage','objective'],['r',2,1,'Exposed Machine Walk','restricted'],['s',2,2,'Active Transfer','restricted'],
   ['q',1,3,'Lower Work Bridge','escape'],['t',2,3,'Transfer Stairs','escape'],['x',3,3,'Maintenance Exit','escape'],
   ['u',0,3,'Pipe Store','escape'],['v',0,4,'Lower Utility Turn','escape'],['w',1,4,'Maintenance Bay','escape'],['z',2,4,'Equipment Hold','escape'],['y',3,4,'Exterior Ramp','escape'],
  ],
  paths:['eabcdo','erso','oqtx','oduvwzyx'],crossLinks:['br'],entryEdge:'top',exitEdge:'right',reflectShoulder:true,
  props:[rack('a','Parts Storage Rack'),crate('b','Tool Crate','se'),belt('c','Machine Shop Conveyor','ne'),['d','Heavy Lift Bay Loader','warehouseForklift','warehouse_forklift',1.1,'sw'],cage('r','Machine Walk Cage','ne'),
   container('s','Active Transfer Container','se'),crate('q','Bridge Crates'),rack('u','Pipe Storage Rack','se'),belt('v','Utility Turn Belt'),lift('w','Maintenance Loader','sw'),container('z','Equipment Hold Container','se')],
  patrols:[['lobby',['c','east','west',2,1.2],['c','south','west',5,3.65]],['restricted',['s','west','east',2,1.2],['s','north','east',4,3.55]],['escape',['z','east','north',2,1.15],['z','south','north',5,3.7]]],
  cameras:[['r','north',Math.PI/2,'Sweep the direct machine walk'],['y','east',Math.PI,'Sweep the ramp after the lower trench']],
 }),
 warehouse({
  id:'07-04',title:'Container Spine',
  topology:'A three-way container spine between a perimeter lane, the inspection crossing and a lower loading return',
  rooms:[
   ['e',1,0,'Container Check-In','public'],['a',0,0,'North Empty Stack','public'],['b',0,1,'West Load Track','transition'],['c',0,2,'West Inspection Bay','restricted'],
   ['o',1,2,'Secure Load Pallet','objective'],['r',1,1,'Container Cross','restricted'],['t',2,1,'East Unloading Line','restricted'],['s',2,2,'Central Forklift Spine','restricted'],
   ['x',3,2,'Forklift Exit','escape'],['q',1,3,'South Rack Return','escape'],['l',2,3,'Yard Service Track','escape'],['m',3,3,'Lower Loading Ramp','escape'],
   ['p',3,1,'Lift Scheduling','public'],['v',3,0,'High Stack Landing','transition'],['u',2,0,'Container Office','public'],
  ],
  paths:['eabco','ertso','osx','oqlmx'],crossLinks:['euvpt'],entryEdge:'top',exitEdge:'right',
  props:[crate('a','Empty Stack Pallets'),rack('b','West Track Rack','se'),belt('c','Inspection Conveyor','sw'),lift('r','Crossing Loader'),
   container('t','Unloading Container','ne'),rack('s','Forklift Spine Rack','se'),crate('q','South Return Pallets','sw'),['l','Long Service Track Container','warehouseContainer','warehouse_container',1.13,'nw'],
   lift('m','Ramp Loader','se'),crate('v','High Stack Pallets','se')],
  patrols:[['lobby',['b','north','west',2],['b','south','east',5]],['crossing',['s','east','north',2],['s','west','south',5]],['escape',['m','north','east',2],['m','west','south',5]]],
  cameras:[['t','east',Math.PI,'Observe the exposed unloading line']],
 }),
 warehouse({
  id:'07-05',title:'Secure Container',
  topology:'A split dispatch complex with a high inspection line, a lower freight shortcut and an independent carrier return',
  rooms:[
   ['e',0,1,'Secure Gatehouse','public'],['a',0,0,'Manifest Landing','public'],['b',1,0,'Upper Freight Office','transition'],['c',2,0,'Checkpoint Walk','restricted'],
   ['d',3,0,'Bonded Freight Lookout','restricted'],['t',3,1,'Reinforced Checkpoint','restricted'],['o',3,2,'Bonded Container','objective'],
   ['r',1,1,'Inspection Floor','restricted'],['u',2,1,'Forklift Floor','restricted'],['q',3,3,'Express Dispatch','escape'],['x',4,3,'Carrier Exit','escape'],
   ['s',2,2,'Dispatch Cage','escape'],['p',1,2,'Crate Turn','escape'],['n',1,3,'Service Descent','escape'],['m',1,4,'Lower Repair Room','escape'],
   ['l',2,4,'Carrier Workshop','escape'],['k',3,4,'Lower Staging','escape'],['j',4,4,'Carrier Ramp','escape'],
  ],
  paths:['eabcdto','eruto','oqx','ospnmlkjx'],crossLinks:['br'],entryEdge:'left',exitEdge:'right',
  props:[crate('a','Manifest Pallets'),rack('b','Office Freight Rack','se'),container('c','Checkpoint Container','sw'),cage('d','Bonded Lookout Cage'),
   ['r','Heavy Inspection Forklift','warehouseForklift','warehouse_forklift',1.1,'se'],belt('u','Forklift Floor Belt','ne'),rack('t','Reinforced Checkpoint Rack','se'),
   rack('q','Express Bay Rack','ne'),cage('s','Dispatch Cage Cover'),crate('p','Crate Turn Stack','sw'),belt('m','Repair Conveyor'),lift('l','Carrier Shop Loader','se'),container('k','Staging Container','se')],
  patrols:[['lobby',['c','east','north',2],['c','west','south',5]],['restricted',['u','east','south',2],['u','north','west',5]],['escape',['l','east','north',3],['l','west','south',5]]],
  cameras:[['r','north',Math.PI/2,'Read the exposed inspection floor crossing'],['q','south',-Math.PI/2,'Watch the short dispatch bay']],
 }),
];
