/**
 * V13 Phase 4 — Chapter 6–8, structural first pass (see v13Reuse.ts).
 * Mansion ← Gallery plans, Warehouse ← Museum plans, Security HQ ← Lab plans, all mirrored. Which plans exactly, and
 * whether they carry the Phase 7 layer, is set in v13Sources.ts. Chapter 9 has plans of its own (v13Vault.ts).
 * These chapters have no painted kit of their own: furniture uses the nearest existing art or the theme's drawn
 * shapes, and is meant to be swapped piece for piece when their art exists (docs/design/v13/ASSET_REQUEST_CH6_CH9.md).
 */
import type {V13Mission,V13Structure} from './v13Types';
import {derivedBases} from './v13Sources';
import {mirrorX,refit,secure,type Refit} from './v13Reuse';
import {phase7Late} from './v13Phase7';
import {PROP_KIT} from '../../src/game/world/propKit';

const as=(s:V13Structure,kind:V13Structure['kind'],asset:V13Structure['asset']|undefined,factor=1):V13Structure[]=>[{...s,kind,asset,scale:+(s.scale*factor).toFixed(3)}];
/** Mansion: wood partitions, classical statues, sofas and tables in place of the gallery's modern pieces; portraits stay.
 *  The classical statue is drawn taller than the gallery sculpture it replaces, so it is placed at three quarters of the size. */
const MANSION:Refit=s=>s.kind==='partition'?as(s,'partition','museum_partition'):s.kind==='statue'?as(s,'statue','museum_statue_large',.75):s.kind==='bench'?as(s,'sofa',undefined,.83)
 :s.kind==='table'?as(s,'table','museum_display_low'):s.kind==='statuePedestal'?as(s,'statuePedestal','museum_pedestal'):s.kind==='equipment'?as(s,'shelf',undefined,.77):[s];
/** Mansion art (Phase 5): the same kinds, scales and positions as MANSION above, so walls, cover, sight lines and routes
 *  do not move; only the picture changes. Partitions alternate bookshelf and folding screen, statues alternate armour
 *  and china cabinet (the large ones are always cabinets: the armour niche would stand three tiles tall), wide tables are dining tables and narrow ones writing desks, the big island is the grand piano. */
const MANSION_ART=new Set([0,1,2,3,4]);
const mansionArt=(mission:number):Refit=>{if(!MANSION_ART.has(mission))return MANSION;const turn=new Map<string,number>(),next=(k:string)=>{const n=turn.get(k)??0;turn.set(k,n+1);return n;};
 return s=>MANSION(s).map(q=>q.kind==='partition'?{...q,asset:next('partition')%2?'mansion_room_divider':'mansion_bookshelf'}:q.kind==='statue'?{...q,asset:q.scale>=1.9||next('statue')%2?'mansion_cabinet':'mansion_armor_display'}
  :q.kind==='table'?{...q,asset:PROP_KIT.table.footprint.w*q.scale>=2.3?'mansion_dining_table':'mansion_writing_desk'}:q.kind==='sofa'?{...q,asset:'mansion_sofa'}
  :q.kind==='shelf'?{...q,asset:'mansion_grand_piano'}:q.kind==='statuePedestal'?{...q,asset:'mansion_writing_desk'}:q) as V13Structure[];};
/** A piece placed in another piece's slot is scaled so its footprint fits inside the old one: lanes never narrow. */
const fit=(s:V13Structure,kind:V13Structure['kind'],asset?:V13Structure['asset']):V13Structure[]=>{
 const a=PROP_KIT[s.kind].footprint,b=PROP_KIT[kind].footprint;return as(s,kind,asset,a.w&&b.w?Math.min(a.w/b.w,a.h/b.h):1);};
type Option=[kind:V13Structure['kind'],asset?:V13Structure['asset']];
/** Warehouse: the painted warehouse kit. Each Museum slot has several pieces used in turn, so a floor never shows
 *  one piece down a whole room: big loads where statues stood, pallet loads for display cases, long stock for partitions. */
const WAREHOUSE=(mission:number):Refit=>{
 const turn=new Map<string,number>(),slots:Record<string,Option[]>={
  statue:[['warehouseContainer','warehouse_container'],['warehouseRack','warehouse_rack'],['warehouseForklift','warehouse_forklift']],
  displayCase:[['warehouseCrateStack','warehouse_crate_stack'],['warehouseTarpCargo','warehouse_tarp_cargo'],['warehouseDrumStack','warehouse_drum_stack'],['warehouseStorageCage','warehouse_storage_cage'],['warehouseLiquidTank','warehouse_liquid_tank'],['warehousePalletStack','warehouse_pallet_stack']],
  partition:[['warehouseConveyor','warehouse_conveyor'],['warehousePlankStack','warehouse_plank_stack'],['warehousePipeStack','warehouse_pipe_stack']],
  pillar:[['warehouseDrumStack','warehouse_drum_stack'],['warehouseLiquidTank','warehouse_liquid_tank']],
  statuePedestal:[['warehouseToolCart','warehouse_tool_cart'],['warehouseHandTrolley','warehouse_hand_trolley'],['warehouseCones','warehouse_cones']],
  table:[['warehouseWorkbench','warehouse_workbench'],['warehousePalletStack','warehouse_pallet_stack'],['warehouseToolCart','warehouse_tool_cart']],
  bench:[['warehouseBarrier','warehouse_barrier'],['warehouseFence','warehouse_fence']],
  equipment:[['warehouseStorageCage','warehouse_storage_cage']],
 };
 return s=>{if(s.kind==='painting')return as(s,'warehouseControlPanel','warehouse_control_panel',.5);
  // The desk slot is wider and shallower than the workbench: placed at the desk's own scale it leaves 0.2 tile a side, too little to read as a gap.
  // On the fifth floor both desks stand beside a waiting pocket, where the deeper workbench does not fit: a conveyor does.
  if(s.kind==='counter')return mission===4?fit(s,'warehouseConveyor','warehouse_conveyor'):as(s,'warehouseWorkbench','warehouse_workbench',1);
  const options=slots[s.kind];if(!options)return [s];const n=turn.get(s.kind)??0;turn.set(s.kind,n+1);const[kind,asset]=options[n%options.length];return fit(s,kind,asset);};
};
/** Security HQ: the Lab's control-room pieces; wet-lab pieces become racks, consoles and monitor stations. */
/** Cryo units have no place in a security building: each is drawn as a pair of server racks. The unit's footprint is kept
 *  (Phase 7C): the shallower rack tried first hid much less than the Lab's unit and opened long uncovered stretches. */
const serverRow=(s:V13Structure):V13Structure[]=>[{...s,asset:'hq_server_row'}];
const HQ:Refit=s=>s.kind==='labCryoUnit'?serverRow(s):s.kind==='labCryoChamber'?as(s,'labMonitorStation','lab_monitor_station',1.1)
 :s.kind==='labSpecimenTank'?as(s,'labObservationConsole','lab_observation_console',.92):s.kind==='labCentrifugeBench'?as(s,'labMonitorStation','lab_monitor_station',1.17)
 :s.kind==='labFumeHood'?as(s,'labServerRack','lab_server_rack_front',1.2):s.kind==='labSampleFridge'?as(s,'labServerRack','lab_server_rack_front'):s.kind==='labCentralExperiment'?as(s,'labObservationConsole','lab_observation_console',1.2)
 :s.kind==='labPrototypeMachine'?as(s,'labObservationConsole','lab_observation_console',1.14):s.kind==='labRobotCell'?as(s,'labMonitorStation','lab_monitor_station',1.05)
 :s.kind==='labGasRack'?as(s,'labServerRack','lab_server_rack_front',.88):s.kind==='labExperimentMachine'?as(s,'labMonitorStation','lab_monitor_station',1.05):[s];
/** Security HQ art (Phase 5): the Lab kinds, scales and positions stay exactly as HQ above leaves them; only the picture
 *  changes. Glass, floor markings, cables and stools are not Lab-specific and keep their art. */
const HQ_ART=new Set([0,1,2,3,4]);
const HQ_PICTURE:Partial<Record<V13Structure['kind'],NonNullable<V13Structure['asset']>>>={labObservationConsole:'hq_command_console',labMonitorStation:'hq_security_desk',labServerRack:'hq_server_row',
 labWallScreen:'hq_video_wall',labWall:'hq_security_locker',labMobileScreen:'hq_security_locker',labWorkstation:'hq_duty_desk',labObservationRoom:'hq_checkpoint',labDeconArch:'hq_checkpoint',
 labWarningSign:'hq_wall_sign',labLargeTable:'hq_response_table'};
const hqArt=(mission:number):Refit=>HQ_ART.has(mission)?s=>HQ(s).map(q=>HQ_PICTURE[q.kind]?{...q,asset:HQ_PICTURE[q.kind]}:q):HQ;
/** Generated cameras that must stay where they were when furniture changed (the rule would otherwise re-seat them):
 *  08-04 kept its storage camera when the cryo units became server racks. */
export const PINNED:Record<string,Record<string,{x:number;y:number}>>={'08-04':{storage:{x:5.5,y:7.4}}};
const pin=(m:V13Mission):V13Mission=>PINNED[m.id]?{...m,cameras:m.cameras.map(c=>PINNED[m.id][c.zone]?{...c,at:PINNED[m.id][c.zone]}:c)}:m;
const chapter=(n:number,titles:string[],bases:V13Mission[],family:string,swap:(mission:number)=>Refit,doors:{normal:string;secure:string},guards:number,cameras:number)=>
 bases.map((b,i)=>phase7Late(pin(secure(refit(b,`0${n}-0${i+1}`,titles[i],family,swap(i),doors),guards,cameras))));
export const V13_MANSION=chapter(6,['Reception Wing','Library Passage','Private Courtyard','East Family Wing','Secret Vault'],derivedBases(6).map(mirrorX),'Mansion',mansionArt,{normal:'mansionWood',secure:'mansionLibrary'},4,2);
export const V13_WAREHOUSE=chapter(7,['Loading Aisles','Restricted Freight','Machinery Cross','Container Spine','Secure Container'],derivedBases(7).map(mirrorX),'Warehouse',WAREHOUSE,{normal:'warehouseIndustrial',secure:'warehouseIndustrial'},4,2);
export const V13_HQ=chapter(8,['Monitoring Spine','Guard Network','Surveillance Junction','Operations Block','Control Core Heist'],derivedBases(8).map(mirrorX),'Security HQ',hqArt,{normal:'hqSteel',secure:'hqSteel'},5,3);
// Chapter 9 has floor plans of its own: tools/campaign/v13Vault.ts.
export const V13_LATE=[...V13_MANSION,...V13_WAREHOUSE,...V13_HQ];
