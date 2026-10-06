/**
 * V13 Phase 7 — cover on long stretches (Chapter 1–6).
 *
 * Each piece here stands where a route ran more than six tiles with nothing to step behind (tools/campaign/v13Corridor.ts
 * measures it, v13CoverSearch.ts proposes the spot). Nothing else in the plans moves: entry, prize, exit, doors, guards,
 * cameras and authored route nodes are as they were; the composer bends a leg round a new piece where it must.
 * Chapter 5 and 6 inherit their pieces from the Bank and Gallery plans they are built on. Chapter 7 and 8 are built
 * from the plans WITHOUT these pieces (`frozen` exports), so they stay exactly as shipped.
 */
import type {V13Mission,V13Structure} from './v13Types';
export type Cover=Pick<V13Structure,'name'|'kind'|'asset'|'x'|'y'|'scale'>&{why:string};
export const PHASE7:Record<string,Cover[]>={
 '01-02':[{name:'Rotunda Floor Display Case',kind:'displayCase',asset:'museum_display_case_large',x:7.1,y:12,scale:1.3,why:'risk lane up the rotunda: the only cover between the vestibule and the anteroom door'}],
 '02-02':[{name:'South Ring Sculpture',kind:'statue',asset:'gallery_sculpture_large',x:18.75,y:15.525,scale:1.5,why:'safe lane: cover at the east end of the south ring before the turn into the east ring'}],
 '02-03':[{name:'East Turn Sculpture',kind:'statue',asset:'gallery_sculpture_large',x:23.325,y:10.6,scale:1.5,why:'safe lane: cover where the south lane turns north under the east-turn camera'}],
 '02-05':[{name:'Loading Corridor Sculpture',kind:'statue',asset:'gallery_sculpture_large',x:15.5,y:18.525,scale:1.5,why:'quick escape: a pocket against the north wall half-way down the loading corridor'}],
 '04-03':[{name:'South Lane Gas Rack',kind:'labGasRack',asset:'lab_gas_rack',x:17.75,y:12.54,scale:1,why:'risk lane: cover at the foot of the south lane before the glass gap'},
  {name:'North Lab Gas Rack',kind:'labGasRack',asset:'lab_gas_rack',x:11.89,y:3,scale:1,why:'both escapes: a second island on the long walk across the north lab'}],
 '04-04':[{name:'Coolant Passage Monitor Station',kind:'labMonitorStation',asset:'lab_monitor_station',x:10.5,y:18.425,scale:1,why:'lockdown escape: a pocket against the north wall of the coolant passage'},
  {name:'Intake Gas Rack',kind:'labGasRack',asset:'lab_gas_rack',x:8.25,y:1.325,scale:1,why:'safe lane: cover in the west half of the intake hall before the storage opening'}],
 '04-05':[{name:'Glass Lab Sample Fridge',kind:'labSampleFridge',asset:'lab_sample_fridge_front',x:10,y:7.293,scale:.9,why:'risk lane: cover against the north wall of the glass lab on the way to the lock'}],
};
/** An existing see-through piece replaced by an opaque one in the same place (name kept, so the cover graph still reads). */
export const REPLACED:Record<string,Record<string,Pick<V13Structure,'kind'|'asset'|'x'|'y'|'scale'>&{why:string}>>={
 '02-01':{'Curator Plinth':{kind:'statue',asset:'gallery_sculpture_large',x:19.325,y:5.835,scale:1.5,why:'lockdown escape down the curator aisle: the low plinth hid nothing; a sculpture of the same depth against the same wall breaks the nine-tile sightline'}},
};
/** What each piece is for, by mission: printed in the report. */
export const PHASE7_ROLES=Object.fromEntries([...new Set([...Object.keys(PHASE7),...Object.keys(REPLACED)])].sort().map(id=>[id,[...(PHASE7[id]??[]).map(c=>`+ ${c.name} (${c.asset}) → ${c.why}`),...Object.entries(REPLACED[id]??{}).map(([n,c])=>`~ ${n} becomes ${c.asset} → ${c.why}`)]]));
// ---- Phase 7B: six lanes that no extra piece could fix. Each is a local change to one lane: a wall cell, a route
// anchor moved by a tile at most, or a patrol line moved by half a tile. Entry, prize, exit and doors do not move.
const wall=(m:V13Mission,x:number,y:number):V13Mission=>({...m,map:m.map.map((r,j)=>j===y?r.slice(0,x)+'#'+r.slice(x+1):r)});
const at=(q:{x:number;y:number},x:number,y:number)=>Math.abs(q.x-x)<1e-6&&Math.abs(q.y-y)<1e-6;
/** Moves one authored route point (a via) wherever it is used. */
const anchor=(m:V13Mission,from:[number,number],to:[number,number]):V13Mission=>({...m,edges:m.edges.map(e=>e.via?{...e,via:e.via.map(q=>at(q,...from)?{x:to[0],y:to[1]}:q)}:e)});
/** Moves one patrol stop (and what it looks at, by the same amount). */
const stop=(m:V13Mission,from:[number,number],to:[number,number]):V13Mission=>({...m,guards:m.guards.map(g=>({...g,stops:g.stops.map(q=>at(q,...from)?{...q,x:to[0],y:to[1]}:q)}))});
const add=(m:V13Mission,...list:Omit<V13Structure,'roles'>[]):V13Mission=>({...m,structures:[...m.structures,...list.map(q=>({...q,roles:['hiding','losBreak'] as V13Structure['roles']}))]});
const place=(m:V13Mission,name:string,x:number,y:number):V13Mission=>({...m,structures:m.structures.map(q=>q.name===name?{...q,x,y}:q)});
/** One local change to a lane. Ops run in the order they are listed. */
export type LaneOp=
 |{op:'wall';x:number;y:number}                                   // one floor cell becomes wall
 |{op:'anchor';from:[number,number];to:[number,number]}          // one authored route point (a via) moves
 |{op:'stop';from:[number,number];to:[number,number]}            // one patrol stop moves
 |{op:'add';pieces:Omit<V13Structure,'roles'>[]};                 // cover pieces appended to the structure list
export type LanePatch={why:string;ops:LaneOp[]};
const run=(m:V13Mission,patch:LanePatch|undefined):V13Mission=>(patch?.ops??[]).reduce((q,o)=>o.op==='wall'?wall(q,o.x,o.y):o.op==='anchor'?anchor(q,o.from,o.to):o.op==='stop'?stop(q,o.from,o.to):add(q,...o.pieces),m);
export const LANES:Record<string,LanePatch>={
 '03-04':{why:'Quick escape: the vault\'s west opening loses its south cell, so the first turn out of the vault is a corner to stand behind.',
  ops:[{op:'wall',x:16,y:4}]},
 '04-01':{why:'Safe lane along the bottom of the reception: one wall pier on the south wall, a pocket on either side of it.',
  ops:[{op:'wall',x:14,y:18}]},
 '04-05':{why:'Safe lane through the glass lab: one wall pier on the south wall west of the glass; the lane\'s first anchor moves 0.6 north to pass it.',
  ops:[{op:'wall',x:9,y:15},{op:'anchor',from:[8.25,15],to:[8.25,14.4]}]},
 '03-02':{why:'Lockdown escape through the copy room: the stair guard walks the west side of the three-wide opening (half a tile west of its middle) and the route takes the east side, where the wall beside the opening is a place to wait.',
  ops:[{op:'stop',from:[3,16],to:[2.5,16]},{op:'stop',from:[3,11.2],to:[2.5,11.2]},{op:'anchor',from:[3.5,14.5],to:[4.2,14.5]}]},
 '02-04':{why:'Both escapes across the forecourt: a free-standing art wall between the private door and the east cell.',
  ops:[{op:'add',pieces:[{name:'Forecourt Art Wall',kind:'partition',asset:'gallery_movable_art_wall',x:13.5,y:14.5,scale:1.4}]}]},
 '02-02':{why:'Safe lane along the south ring: one wall pier on the south wall under the colossus; the ring guard\'s south stop moves 0.15 north so his walk clears it.',
  ops:[{op:'wall',x:13,y:18},{op:'stop',from:[12.5,17.9],to:[12.5,17.75]}]},
};
// ---- Phase 7C: Chapter 7–9. Chapters 7 and 8 are built from the frozen Museum and Lab plans, so their fixes are
// applied to the finished (mirrored, re-furnished, secured) mission, in its own coordinates. Chapter 9 has plans of its
// own and is edited there (v13Vault.ts).
export const LATE:Record<string,LanePatch>={
 '07-02':{why:'Risk lane up the freight hall: the same spot that worked in 01-02, as a crate stack.',
  ops:[{op:'add',pieces:[{name:'Freight Hall Crate Stack',kind:'warehouseCrateStack',asset:'warehouse_crate_stack',x:16.9,y:12,scale:.95}]}]},
 '08-01':{why:'Safe lane along the bottom of the reception: one wall pier on the south wall (as 04-01).',
  ops:[{op:'wall',x:11,y:18}]},
 '08-03':{why:'Risk lane and both escapes: a server row at the foot of the south lane and a second one across the north room (as 04-03).',
  ops:[{op:'add',pieces:[{name:'South Lane Server Row',kind:'labServerRack',asset:'hq_server_row',x:8.25,y:12.505,scale:.89},{name:'North Room Server Row',kind:'labServerRack',asset:'hq_server_row',x:14.11,y:3,scale:.89}]}]},
 '08-04':{why:'Lockdown escape pocket in the south passage and cover in the east half of the intake (as 04-04).',
  ops:[{op:'add',pieces:[{name:'Passage Security Desk',kind:'labMonitorStation',asset:'hq_security_desk',x:13.5,y:18.425,scale:1},{name:'Intake Server Row',kind:'labServerRack',asset:'hq_server_row',x:15.75,y:1.29,scale:.89}]}]},
 '08-05':{why:'Safe lane: wall pier on the south wall and the lane\'s first anchor 0.6 north; risk lane: a server row on the north wall (as 04-05).',
  ops:[{op:'wall',x:18,y:15},{op:'anchor',from:[19.75,15],to:[19.75,14.4]},{op:'add',pieces:[{name:'Operations Server Row',kind:'labServerRack',asset:'hq_server_row',x:18,y:7.29,scale:.89}]}]},
};
/** Chapter 7–8 patches, applied last: after mirroring, refit, secure() and the camera pins (v13Late.ts). */
export const phase7Late=(m:V13Mission):V13Mission=>run(m,LATE[m.id]);
/** What each lane change is, by mission: printed in the report. */
export const LANE_NOTES:Record<string,string>=Object.fromEntries(Object.entries({...LANES,...LATE}).map(([id,p])=>[id,p.why]));
/** Chapter 1–4 layer, applied to the authored plan: first the lane ops (LANES), then replacements (REPLACED), then added cover (PHASE7). */
export const phase7=(base:V13Mission):V13Mission=>{const m=run(base,LANES[base.id]),add=PHASE7[m.id]??[],swap=REPLACED[m.id]??{};if(!add.length&&!Object.keys(swap).length)return m;
 return {...m,structures:[...m.structures.map(s=>swap[s.name]?(({why:_why,...r})=>({...s,...r,roles:['hiding','losBreak','divider'] as V13Structure['roles']}))(swap[s.name]):s),
  ...add.map(({why:_why,...s})=>({...s,roles:['hiding','losBreak'] as V13Structure['roles']}))]};};
