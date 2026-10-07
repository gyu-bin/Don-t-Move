/**
 * Mission override index (Phase 8B). Everything that changes ONE mission after its floor plan is drawn, in the order
 * the build applies it, with the file and table it lives in. The index is read from the real tables (it does not
 * copy them), so it cannot fall out of step; the few edits made inside a plan file are listed in AUTHORED_IN_PLAN
 * and checked against the plans by v13Integrity.test.ts.
 *
 * Order of application (the build does this; the index only reports it):
 *
 *   Chapter 1–4, 9   1 plan → 2 Phase 7 lane ops → 3 Phase 7 replacements → 4 Phase 7 added cover
 *   Chapter 5, 6     the base plan with stages 1–4 already applied → 5 derive (mirror, re-furnish; Ch5 second
 *                    camera, table rotation, moved pieces and replaced patrols; Ch6 secure())
 *   Chapter 7, 8     the base plan at stage 1 only (frozen) → 5 derive (mirror, re-furnish, secure())
 *                    → 6 camera pins → 7 late lane ops
 *
 * Chapter-wide rules (the Casino SWAP table, the Mansion / Warehouse / HQ refits and picture tables, secure()) are
 * not per-mission overrides and are not listed here.
 *
 *   npm run campaign:overrides              every mission that has any
 *   npm run campaign:overrides -- 04-05     one mission
 */
import {PHASE7,REPLACED,LANES,LATE,type LaneOp} from './v13Phase7';
import {PINNED} from './v13Late';
import {EXTRA_CAMERA,ROTATE,MOVED,PATROL} from './v13Casino';
import {DERIVED_FROM,baseMissionOf,type DerivedChapter} from './v13Sources';

export const STAGES=['1 plan','2 phase7 lanes','3 phase7 replace','4 phase7 cover','5 derive','6 pin','7 late'] as const;
export type OverrideStage=typeof STAGES[number];
export type OverrideCategory='authored in plan'|'wall cell'|'route anchor'|'patrol stop'|'structure added'|'structure replaced'|'structure moved'|'patrol replaced'|'camera added'|'camera pinned'|'art rotation'|'refit exception';
export interface OverrideEntry {mission:string;stage:OverrideStage;category:OverrideCategory;file:string;table:string;detail:string;why?:string;
 /** Set when the entry belongs to the base plan this mission is derived from. Coordinates are the base plan's: the derived mission is mirrored. */
 inheritedFrom?:string;}

/** Late edits made directly in a plan file. `structure` names a piece that must stand at `at` in that plan. */
export const AUTHORED_IN_PLAN:{mission:string;file:string;structure:string;at:[number,number];detail:string}[]=[
 {mission:'04-03',file:'v13Lab.ts',structure:'Reception Specimen Display',at:[4.6,19],detail:'Phase 4 island: Reception Specimen Display at (4.6,19)'},
 {mission:'04-04',file:'v13Lab.ts',structure:'Passage Gas Rack',at:[15.9,18.325],detail:'Phase 4 island: Passage Gas Rack at (15.9,18.325)'},
 {mission:'04-05',file:'v13Lab.ts',structure:'Control Fume Hood',at:[24.4,3.4],detail:'Phase 4 island: Control Fume Hood at (24.4,3.4)'},
 {mission:'04-05',file:'v13Lab.ts',structure:'Control Cable',at:[21.2,2.6],detail:'Phase 4: Control Cable moved to (21.2,2.6) to clear the fume hood'},
 // 09-05 is drawn one row higher than it is built (lower() in v13Vault.ts adds a row): written as y 4.1 in the plan, 5.1 in the mission.
 {mission:'09-05',file:'v13Vault.ts',structure:'Vault Blast Screen',at:[11.5,5.1],detail:'Phase 7C: Vault Blast Screen moved 0.4 north, to (11.5,5.1); written as y 4.1 in the plan (was 4.5)'},
];
const p=(q:[number,number]|{x:number;y:number})=>Array.isArray(q)?`(${q[0]},${q[1]})`:`(${q.x},${q.y})`;
const laneEntries=(mission:string,ops:LaneOp[],why:string,stage:OverrideStage,table:string):OverrideEntry[]=>ops.flatMap((o):OverrideEntry[]=>{
 const base={mission,stage,file:'v13Phase7.ts',table,why};
 if(o.op==='wall')return [{...base,category:'wall cell',detail:`floor cell (${o.x},${o.y}) becomes wall`}];
 if(o.op==='anchor')return [{...base,category:'route anchor',detail:`route anchor ${p(o.from)} → ${p(o.to)}`}];
 if(o.op==='stop')return [{...base,category:'patrol stop',detail:`patrol stop ${p(o.from)} → ${p(o.to)}`}];
 return o.pieces.map(s=>({...base,category:'structure added' as const,detail:`+ ${s.name} (${s.asset}) at ${p(s)} ×${s.scale}`}));
});
/** Entries a mission has in its own right (not through the plan it is derived from). */
function own(id:string):OverrideEntry[]{
 const out:OverrideEntry[]=[];
 for(const a of AUTHORED_IN_PLAN)if(a.mission===id)out.push({mission:id,stage:'1 plan',category:'authored in plan',file:a.file,table:'plan',detail:a.detail});
 if(LANES[id])out.push(...laneEntries(id,LANES[id].ops,LANES[id].why,'2 phase7 lanes','LANES'));
 for(const [name,r] of Object.entries(REPLACED[id]??{}))out.push({mission:id,stage:'3 phase7 replace',category:'structure replaced',file:'v13Phase7.ts',table:'REPLACED',detail:`~ ${name} becomes ${r.asset} at ${p(r)} ×${r.scale}`,why:r.why});
 for(const c of PHASE7[id]??[])out.push({mission:id,stage:'4 phase7 cover',category:'structure added',file:'v13Phase7.ts',table:'PHASE7',detail:`+ ${c.name} (${c.asset}) at ${p(c)} ×${c.scale}`,why:c.why});
 const base=baseMissionOf(id),floor=Number(id.slice(3))-1;
 if(id.startsWith('05-')&&base){
  const cam=EXTRA_CAMERA[base];if(cam)out.push({mission:id,stage:'5 derive',category:'camera added',file:'v13Casino.ts',table:'EXTRA_CAMERA',detail:`second camera, zone ${cam.zone} at ${p(cam.at)} in ${base} coordinates (mirrored with the plan)`,why:cam.watches});
  for(const [kind,starts] of Object.entries(ROTATE))if(starts[floor])out.push({mission:id,stage:'5 derive',category:'art rotation',file:'v13Casino.ts',table:'ROTATE',detail:`${kind} slots start on option ${starts[floor]} of the SWAP list`});
 }
 for(const [name,to] of Object.entries(MOVED[id]??{}))out.push({mission:id,stage:'5 derive',category:'structure moved',file:'v13Casino.ts',table:'MOVED',detail:`${name} stands at ${p(to)} instead of its Bank counterpart's place`,why:to.why});
 for(const [role,own] of Object.entries(PATROL[id]??{}))out.push({mission:id,stage:'5 derive',category:'patrol replaced',file:'v13Casino.ts',table:'PATROL',detail:`${role} guard walks ${own.stops.map(s=>p(s)).join(' ↔ ')} instead of the mirrored Bank patrol`,why:own.why});
 if(id==='07-05')out.push({mission:id,stage:'5 derive',category:'refit exception',file:'v13Late.ts',table:'WAREHOUSE (mission===4)',detail:'desk slots become conveyors instead of workbenches',why:'both desks stand beside a waiting pocket, where the deeper workbench does not fit'});
 for(const [zone,at] of Object.entries(PINNED[id]??{}))out.push({mission:id,stage:'6 pin',category:'camera pinned',file:'v13Late.ts',table:'PINNED',detail:`generated camera of zone ${zone} held at ${p(at)}`,why:'secure() would re-seat it after the furniture change'});
 if(LATE[id])out.push(...laneEntries(id,LATE[id].ops,LATE[id].why,'7 late','LATE'));
 return out;
}
/** Every override that reaches a mission: inherited ones first (they are applied first), then its own, in stage order. */
export function missionOverrides(id:string):OverrideEntry[]{
 const base=baseMissionOf(id),from=DERIVED_FROM[Number(id.slice(0,2)) as DerivedChapter];
 // A chapter built on the frozen plans inherits what is in the plan file only; one built after Phase 7 inherits that layer too.
 const inherited=base?own(base).filter(e=>from.phase7==='inherits Phase 7'?STAGES.indexOf(e.stage)<=3:e.stage==='1 plan').map(e=>({...e,mission:id,inheritedFrom:base})):[];
 return [...inherited,...own(id)].sort((a,b)=>STAGES.indexOf(a.stage)-STAGES.indexOf(b.stage));
}
/** Index of every mission that has at least one override. */
export function missionOverrideIndex(ids:string[]):Record<string,OverrideEntry[]>{
 return Object.fromEntries(ids.map(id=>[id,missionOverrides(id)] as const).filter(([,list])=>list.length));
}
if(process.argv[1]?.endsWith('v13Overrides.ts')){
 const only=process.argv.slice(2),all=Array.from({length:45},(_,i)=>`0${Math.floor(i/5)+1}-0${i%5+1}`);
 const index=missionOverrideIndex(only.length?only:all);
 for(const [id,list] of Object.entries(index)){
  const base=baseMissionOf(id),from=DERIVED_FROM[Number(id.slice(0,2)) as DerivedChapter];
  console.log(`\n${id}${base?`  ← ${base} (${from.phase7})`:''}`);
  for(const e of list)console.log(`  [${e.stage}] ${e.category.padEnd(18)} ${e.detail}\n      ${e.file} · ${e.table}${e.inheritedFrom?` · inherited from ${e.inheritedFrom}`:''}${e.why?`\n      why: ${e.why}`:''}`);
 }
 for(const id of only)if(!index[id])console.log(`\n${id}${baseMissionOf(id)?`  ← ${baseMissionOf(id)}`:''}\n  no per-mission override: the plan${baseMissionOf(id)?' it is derived from':''} and the chapter rules only`);
 if(!only.length)console.log(`\n${Object.keys(index).length} of 45 missions carry a per-mission override.`);
}
