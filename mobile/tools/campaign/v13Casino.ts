/**
 * V13 Phase 4 — Chapter 5 Casino (MEDIUM-HIGH), first pass.
 *
 * The five casino floors reuse the floor plans, routes and patrols of the reworked Bank missions, mirrored
 * left-to-right, and are furnished with the Casino kit: every Bank structure is replaced by a Casino piece that
 * fits inside the same footprint, so the routes proven on the Bank plans stay clear. Casino adds a second camera
 * per floor (the chapter archetype). This is a stand-in for individually drawn casino plans, not a substitute.
 */
import type {V13Mission,V13Structure} from './v13Types';
import {derivedBases} from './v13Sources';

type Swap=[kind:V13Structure['kind'],asset:NonNullable<V13Structure['asset']>,factor:number];
/** Each Bank piece has one or more Casino counterparts; a floor uses them in turn so no piece repeats down a room. */
const SWAP:Record<string,Swap[]>={
 bankTellerCounter:[['casinoBarCounter','casino_bar_counter',1]],
 bankSecurityCheckpoint:[['casinoSlotBank','casino_slot_bank',.94]],
 bankDepositBoxWall:[['casinoCashierCage','casino_cashier_cage',.958],['casinoSlotBank','casino_slot_bank',.767]],
 bankVaultCorridorWall:[['casinoWall','casino_wall',1]],bankWall:[['casinoWall','casino_wall',1]],
 bankCashProcessingTable:[['casinoCardTable','casino_card_table',.77],['casinoBlackjackTable','casino_blackjack_table',.71],['casinoRouletteTable','casino_roulette_table',.66]],
 bankOfficeDesk:[['casinoSecurityStation','casino_security_station',.85],['casinoCardTable','casino_card_table',.69]],
 bankFilingCabinet:[['casinoSlotMachine','casino_slot_machine',1],['casinoColumn','casino_column',.72]],
 bankSmallSafe:[['casinoColumn','casino_column',.72],['casinoSlotMachine','casino_slot_machine',1]],
 bankCashCart:[['casinoChipCart','casino_chip_cart',1]],bankSecurityGate:[['casinoGoldArch','casino_gold_arch',.75]],
 bankMainVault:[['casinoCashierVault','casino_cashier_vault',.7]],
 bankClock:[['casinoWallArt','casino_wall_art',1],['casinoChandelier','casino_chandelier',1]],bankMonitor:[['casinoNeonSignGeneric','casino_neon_sign_generic',1]],
 bankFloorMarker:[['casinoCarpetPattern','casino_carpet_pattern',.5]],
 bankMarbleColumn:[['casinoColumn','casino_column',1],['casinoSlotMachine','casino_slot_machine',1.3],['casinoColumn','casino_column',1]],
 bankAtmBank:[['casinoSlotBank','casino_slot_bank',.66]],bankSecurityDesk:[['casinoBarCounter','casino_bar_counter',1.03]],
 bankGuardBooth:[['casinoSecurityStation','casino_security_station',.95]],bankCashPallet:[['casinoColumn','casino_column',1.2]],
 bankCageTrolley:[['casinoChipCart','casino_chip_cart',1.15]],bankCountingMachine:[['casinoSecurityStation','casino_security_station',.75]],
 bankDepositIsland:[['casinoBarIsland','casino_bar_island',.8],['casinoHighRollerTable','casino_high_roller_table',.578]],
 bankBrassScreen:[['casinoRopeStanchion','casino_rope_stanchion',1.45]],bankWaitingBench:[['casinoSofa','casino_sofa',1]],
 bankQueueBarrier:[['casinoRopeStanchion','casino_rope_stanchion',1]],bankPlant:[['casinoPlanter','casino_planter',.55]],
};
export const ROTATE:Record<string,number[]>={bankCashProcessingTable:[0,1,0,2,1],bankDepositIsland:[0,1,0,1,0]};
const WORDS:[RegExp,string][]=[[/Banking Hall/g,'Gaming Floor'],[/Teller/g,'Cashier'],[/teller/g,'cashier'],[/Main Vault/g,'Count Room'],[/Vault/g,'Count Room'],[/vault/g,'count room'],
 [/Deposit/g,'Chip'],[/deposit/g,'chip'],[/bank/g,'casino'],[/Bank/g,'Casino'],[/cash safe|records safe|deposit safe|vault gem|cash/g,'jewel'],[/safe bay|gem bay/g,'jewel bay'],[/scanner/g,'slot bank'],[/Scanner/g,'Slot Bank']];
const say=(s:string)=>WORDS.reduce((t,[a,b])=>t.replace(a,b),s);
const SIDE={left:'right',right:'left',top:'top',bottom:'bottom'} as const;
/** Second camera of each floor, in the Bank plan's own coordinates (mirrored with everything else). */
export const EXTRA_CAMERA:Record<string,V13Mission['cameras'][number]>={
 '03-01':{zone:'tellerFloor',at:{x:13.5,y:7.4},facing:1.5708,watches:'The east half of the cashier floor, on the way to the staff door'},
 '03-02':{zone:'files',at:{x:8.5,y:15.4},facing:1.5708,watches:'The west end of the corridor in front of the stair door'},
 '03-03':{zone:'southRing',at:{x:14.2,y:13.4},facing:1.5708,watches:'The middle of the south aisle between the tables'},
 '03-04':{zone:'passage',at:{x:8.2,y:1.4},facing:1.3,watches:'The west end of the north passage in front of the exit lobby door'},
 '03-05':{zone:'exitLobby',at:{x:25.5,y:16.4},facing:2.2,watches:'The exit lobby below the stair door'},
};
/** A Casino piece that does not stand where its Bank counterpart does (Casino coordinates, centre of the footprint).
 *  Only the named piece moves; its place in the structure list, and everything else in the plan, is unchanged. */
export const MOVED:Record<string,Record<string,{x:number;y:number;why:string}>>={
 '05-05':{'Exit Plant':{x:1.35,y:16.915,why:'Phase 9: 0.6 tile south, out from under the exit-lobby camera — at gameplay zoom the camera read as standing in the planter. 0.6 is the smallest move that leaves no fake gap: up to 0.55 the strip between the wall and the planter is floor the thief cannot stand on.'}},
};
function casino(base:V13Mission,id:string,title:string):V13Mission{
 const W=base.map[0].length,mx=<T extends {x:number;y:number}>(p:T):T=>({...p,x:+(W-p.x).toFixed(3)});
 const objectiveZone=Object.values(base.zones).find(z=>z.role==='objective')!.id;
 const turn=new Map<string,number>();
 const structures=base.structures.map(s=>{const options=SWAP[s.kind];if(!options)throw Error(`${id}: no casino counterpart for ${s.kind}`);
  // Table slots start on a different piece on each floor, so the roulette, blackjack and high-roller tables are all seen.
  const n=turn.get(s.kind)??(ROTATE[s.kind]?.[Number(id.slice(-1))-1]??0);turn.set(s.kind,n+1);const swap=options[n%options.length];
  return {...mx(s),name:say(s.name),kind:swap[0],asset:swap[1],scale:+(s.scale*swap[2]).toFixed(3)};})
  .map(s=>{const to=MOVED[id]?.[s.name];return to?{...s,x:to.x,y:to.y}:s;});
 const names=new Set([...structures.map(s=>s.name),...base.walls.map(w=>say(w.name))]),lane=(l:string[])=>l.map(say).filter(n=>names.has(n));
 return {...base,id,title,family:'Casino',topology:say(base.topology),map:base.map.map(r=>[...r].reverse().join('')),
  zones:Object.fromEntries(Object.entries(base.zones).map(([k,z])=>[k,{...z,name:say(z.name),purpose:say(z.purpose),...(z.hub?{hub:mx(z.hub)}:{})}])),
  entry:mx(base.entry),objective:mx(base.objective),exit:mx(base.exit),entryEdge:SIDE[base.entryEdge],exitEdge:SIDE[base.exitEdge],
  placement:base.placement.map(p=>p.replace(/left|right/g,s=>s==='left'?'right':'left')) as V13Mission['placement'],
  edges:base.edges.map(e=>({...e,...(e.via?{via:e.via.map(mx)}:{}),...(e.door?{door:{...e.door,at:mx(e.door.at),style:e.role==='approach'&&(e.to===objectiveZone||e.from===objectiveZone)&&!e.door.lockdown?'casinoVip4d' as const:'casinoSecurity4d' as const}}:{})})),
  cover:{safe:lane(base.cover.safe),risk:lane(base.cover.risk),escape:lane(base.cover.escape)},structures,
  walls:base.walls.map(w=>({...w,name:say(w.name),at:say(w.at)})),
  guards:base.guards.map(g=>({...g,watches:say(g.watches),stops:g.stops.map(s=>({...mx(s),look:mx(s.look)}))})),
  cameras:[...base.cameras,EXTRA_CAMERA[base.id]].map(c=>({...c,at:mx(c.at),facing:+(Math.PI-c.facing).toFixed(4),watches:say(c.watches)})),
  objectiveAsset:'museum_diamond_case',objectiveScale:1.15,secureDoorStyle:'casinoVip4d',highSecurity:undefined};
}
const TITLES=['Cashier Floor','High Roller Rooms','Surveillance Suite','Roulette Exchange','Casino Heist'];
// Base plans and their order (Bank after Phase 7; the third and fourth swapped) are set in v13Sources.ts.
export const V13_CASINO:V13Mission[]=derivedBases(5).map((base,i)=>casino(base,`05-0${i+1}`,TITLES[i]));
