import {test} from 'node:test';
import assert from 'node:assert/strict';
import current from '../../src/game/levels/stages/campaignStages.json';
import source from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {PROP_KIT} from '../../src/game/world/propKit';
import {buildV125Campaign} from './v125Build';
import {buildV13Campaign,V13_MISSIONS} from './v13Build';
import {auditV124bTopology,measureV124bRoutePressure} from './v124bTopologyQA';
import {fakeGaps,placement,emptiness} from './v13QA';

const live=current as unknown as StageDefinition[],before=source as StageDefinition[];
const stage=(id:string)=>live.find(d=>d.id===id)!;
/** Authored security per mission: guards / cameras, from the Chapter 1–2 level blueprint. */
const SECURITY:Record<string,[number,number]>={'01-01':[2,0],'01-02':[2,0],'01-03':[2,0],'01-04':[2,1],'01-05':[3,0],'02-01':[2,0],'02-02':[2,0],'02-03':[2,1],'02-04':[2,1],'02-05':[3,1],
 '03-01':[4,1],'03-02':[4,1],'03-03':[4,1],'03-04':[4,1],'03-05':[4,1],
 '04-01':[4,1],'04-02':[4,1],'04-03':[4,1],'04-04':[4,1],'04-05':[4,1],
 '05-01':[4,2],'05-02':[4,2],'05-03':[4,2],'05-04':[4,2],'05-05':[4,2]};
const FAMILY:Record<number,string[]>={1:['museum_'],2:['gallery_'],3:['bank_'],4:['lab_'],5:['casino_'],6:['museum_','gallery_','mansion_'],7:['warehouse_'],8:['lab_','hq_'],9:['vault_']};
// Chapter 6–9 reuse earlier plans; their extra guards and cameras are placed by rule (v13Reuse.ts), so the counts are read from the plans.
for(const m of V13_MISSIONS)if(Number(m.id.slice(0,2))>=6)SECURITY[m.id]=[m.guards.length,m.cameras.length];

test('V13: bake is reproducible and is the live campaign',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(buildV13Campaign())),live);
 assert.deepEqual(V13_MISSIONS.map(m=>m.id),Object.keys(SECURITY));
});

test('V13: every mission it has not rebuilt is byte-equal to the Phase 5 build',()=>{
 const phase5=JSON.parse(JSON.stringify(buildV125Campaign())) as StageDefinition[];
 const rest=live.filter(d=>!SECURITY[d.id]);
 assert.equal(rest.length,45-V13_MISSIONS.length);
 assert.equal(JSON.stringify(rest),JSON.stringify(phase5.filter(d=>!SECURITY[d.id])));
});

test('V13: every rebuilt mission passes the physical topology audit',()=>{
 for(const m of V13_MISSIONS)assert.deepEqual(auditV124bTopology(stage(m.id)).errors,[],m.id);
});

test('V13: entry, objective and exit stand where the blueprint puts them, in three different zones',()=>{
 for(const m of V13_MISSIONS){
  const def=stage(m.id),plan=def.topologyPlan!;
  assert.deepEqual([placement(def,def.playerSpawn),placement(def,def.objective!),placement(def,def.exitPosition!)],m.placement,m.id);
  assert.equal(new Set([plan.entryRoom,plan.objectiveRoom,plan.exitRoom]).size,3,m.id);
  const room=plan.rooms.find(r=>r.id===plan.objectiveRoom)!,o=def.objective!;
  // The prize is inside its chamber, away from the room centre.
  assert(o.x>room.x&&o.x<room.x+room.w&&o.y>room.y&&o.y<room.y+room.h,`${m.id} objective inside its room`);
  assert(Math.hypot(o.x-(room.x+room.w/2),o.y-(room.y+room.h/2))>=1,`${m.id} objective off the room centre`);
 }
});

test('V13: no fake gap, no sub-tile squeeze and no empty plaza',()=>{
 for(const m of V13_MISSIONS){
  const def=stage(m.id),gaps=fakeGaps(def);
  assert.deepEqual(gaps.sealed,[],`${m.id} sealed floor`);
  assert.deepEqual(gaps.squeezes,[],`${m.id} squeeze`);
  assert(emptiness(def).worst.clearance<=2.8,`${m.id} open floor`);
 }
});

test('V13: every solid structure states its role and the cover graph names real structures',()=>{
 for(const m of V13_MISSIONS){
  const names=new Set([...m.structures,...m.walls].map(s=>s.name));
  assert.equal(names.size,m.structures.length+m.walls.length,`${m.id} structure names are unique`);
  for(const w of m.walls)assert(w.roles.length>0&&w.at.length>0,`${m.id} ${w.name} wall role`);
  for(const s of m.structures)assert(s.roles.length>0,`${m.id} ${s.name} has no role`);
  for(const s of m.structures.filter(s=>PROP_KIT[s.kind].blocksVision))assert(s.roles.some(r=>r!=='decor'),`${m.id} ${s.name}: an opaque structure cannot be decoration only`);
  for(const lane of [m.cover.safe,m.cover.risk,m.cover.escape]){assert(lane.length>0,`${m.id} cover lane`);for(const n of lane)assert(names.has(n),`${m.id} unknown cover ${n}`);}
  // Only current production Museum / Gallery art.
  const family=FAMILY[Number(m.id.slice(0,2))];
  for(const s of m.structures)if(s.asset)assert(family.some(f=>s.asset!.startsWith(f)),`${m.id} ${s.name} uses ${s.asset}`);
 }
});

test('V13: guards and CCTV are authored by role with the chapter archetypes unchanged',()=>{
 for(const m of V13_MISSIONS){
  const def=stage(m.id),old=before.find(d=>d.id===m.id)!,[guards,cameras]=SECURITY[m.id];
  assert.equal(def.guards.length,guards,`${m.id} guard count`);
  assert.equal(def.cameras?.length??0,cameras,`${m.id} camera count`);
  assert.equal(def.guards.filter(g=>g.role==='objective').length,1,`${m.id} one objective guard`);
  def.guards.forEach((g,i)=>{
   for(const key of ['pace','visionRange','visionHalfAngle'] as const)assert.deepEqual(g[key],old.guards[Math.min(i,old.guards.length-1)][key],`${m.id} guard ${i} ${key}`);
   const route=def.patrolRoutes.find(r=>r.id===g.routeId)!;
   assert.equal(g.x,route.points[0].x);assert.equal(g.y,route.points[0].y);
   assert.equal(g.facing,route.points[0].lookDirection,`${m.id} guard ${i} starts facing its subject`);
   assert.equal(route.points.filter(p=>(p.waitDuration??0)>0).length>=2,true,`${m.id} guard ${i} has two posts`);
  });
  const template=before.flatMap(s=>s.chapter===def.chapter?s.cameras??[]:[])[0];
  for(const camera of def.cameras??[])for(const key of ['range','visionAngle','sweepAngle','sweepSpeed','pauseAtEnds','suspicionRate'] as const)
   assert.deepEqual(camera[key],template[key],`${m.id} ${camera.id} ${key}`);
 }
 // Museum stays the easy chapter: at most one camera in the whole chapter.
 assert.equal(live.filter(d=>d.chapter===1).reduce((n,d)=>n+(d.cameras?.length??0),0),1);
});

test('V13: the thief alone can walk in by either lane and out by the quick route',async()=>{
 for(const m of V13_MISSIONS){
  const bare={...stage(m.id),guards:[],patrolRoutes:[],cameras:[]} as StageDefinition;
  for(const lane of [0,1] as const)assert.equal((await measureV124bRoutePressure(bare,lane)).outcome,'CLEAR',`${m.id} lane ${lane}`);
 }
});
