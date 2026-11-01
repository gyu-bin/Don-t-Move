/** Campaign integrity (Phase 8B): what the campaign is made of and how it is built, independent of map design. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import current from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {CHAPTER_COUNT,CHAPTER_MISSION_COUNTS,MISSION_COUNT,CHAPTERS,missionId,missionIndex} from '../../src/game/levels/campaignCatalog';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {CHAPTER_SOURCE,V13_MISSIONS} from './v13Build';
import {DERIVED_FROM,baseMissionOf,type DerivedChapter} from './v13Sources';
import {V13_MUSEUM,V13_MUSEUM_FROZEN} from './v13Museum';
import {V13_LAB,V13_LAB_FROZEN} from './v13Lab';
import {V13_GALLERY} from './v13Gallery';
import {V13_BANK} from './v13Bank';
import {PHASE7,REPLACED,LANES,LATE} from './v13Phase7';
import {PINNED,HQ_PATROL} from './v13Late';
import {exposureRun} from './cameraExposure';
import {REWORK} from './v13Rework';
import {EXTRA_CAMERA,MOVED,PATROL} from './v13Casino';
import {AUTHORED_IN_PLAN,missionOverrideIndex,missionOverrides,STAGES} from './v13Overrides';
import {COVER_CHECKPOINTS} from './v13CoverCheckpoints';
import {PATROL_POLISH} from './v13PatrolPolish';
import {EXIT_CAMERA_WATCH} from './v13ExitWatch';
import {applyComposePatrolTiming,COMPOSE_PATROL_TIMINGS} from './v13ComposeTuning';

const live=current as unknown as StageDefinition[];

test('mission-local timing overrides reject changed source patrols and match the override index',()=>{
 for(const [id,tuning] of Object.entries(COMPOSE_PATROL_TIMINGS)){
  const mission=structuredClone(live.find(s=>s.id===id)!);
  const stop=mission.patrolRoutes.find(r=>r.id===tuning.guardId)!.points[tuning.point];
  assert.equal(stop.waitDuration,tuning.after,`${id} baked timing`);
  stop.waitDuration=tuning.before;
  applyComposePatrolTiming(mission);
  assert.equal(stop.waitDuration,tuning.after,`${id} authored timing`);
  assert.throws(()=>applyComposePatrolTiming(mission),/expected .* reviewed timing/,`${id} rejects unexpected input`);
  const entry=missionOverrides(id).find(e=>e.table==='COMPOSE_PATROL_TIMINGS');
  assert.ok(entry?.detail.includes(`wait ${tuning.before} → ${tuning.after} seconds`),`${id} index`);
 }
});

test('08-05: longer glass-lab inspection exposes a blind sprint while preserving later safe departures',()=>{
 const mission=live.find(s=>s.id==='08-05')!,g=mission.guards.find(g=>g.id==='08-05-g1')!;
 const route=mission.patrolRoutes!.find(r=>r.id===g.routeId)!;
 assert.equal(route.points[0].waitDuration,5);
 assert.equal(route.points[1].waitDuration,2,'retain the other inspection rhythm');
 const exposed=exposureRun(mission,0,0,3,8);
 assert(!exposed.clear&&exposed.spottedBy===g.id,'sprint should be visually spotted, not just blocked by a guard body');
 // Final cover inspections change the patrol phase: the old 12s departure is
 // now intercepted; this adjacent timing window still clears with real AI.
 for(const delay of [9.5,10]){
  const clear=exposureRun(mission,0,0,3,delay);
  assert(clear.clear,`later departure ${delay} still allows a full heist under stronger security`);
  assert.equal(clear.spottedBy,'08-05-g4','stronger security now notices even these successful escapes');
 }
});

test('08-03: authored connector inspection preserves safe timing while closing one blind sprint departure',()=>{
 const mission=live.find(s=>s.id==='08-03')!,g=mission.guards.find(g=>g.id==='08-03-g2')!;
 const route=mission.patrolRoutes!.find(r=>r.id===g.routeId)!;
 const stop=route.points[0],own=HQ_PATROL[mission.id];
 assert.equal(stop.waitDuration,own.wait);
 // The later, explicit cover pass supersedes the original doorway look.
 const inspection=COVER_CHECKPOINTS[mission.id].find(p=>p.guard===1&&p.stop===0)!;
 assert.equal(stop.lookDirection,Math.atan2(inspection.look.y-stop.y,inspection.look.x-stop.x));
 assert.equal(g.initialFacing,stop.lookDirection);
 assert(missionOverrides(mission.id).some(e=>e.table==='HQ_PATROL'));
 for(const delay of [4,6]){
  assert(exposureRun(mission,0,0,3,delay).clear,`safe ${delay} must remain playable`);
 }
 const careless=exposureRun(mission,1,0,3,16);
 assert(!careless.clear&&careless.spottedBy,'later blind sprint now draws attention');
 const direct=exposureRun(mission,1,0,3,0);
 assert(!direct.clear&&direct.spottedBy,'stronger chapter security also sees the old instant risk departure');
});

test('Chapter 1 patrol waits are baked at the intended positions without altering frozen plans',()=>{
 for(const [id,index,role,before,after] of [['01-02',1,'objective',4,2],['01-03',0,'restricted',3,5]] as const){
  const frozen=V13_MUSEUM_FROZEN.find(m=>m.id===id)!;
  const updated=V13_MUSEUM.find(m=>m.id===id)!;
  const original=frozen.guards[index],guard=updated.guards[index],stop=original.stops[1];
  assert.equal(original.role,role);assert.equal(stop.wait,before);assert.equal(guard.stops[1].wait,after);
  assert.deepEqual(updated.guards.map((g,i)=>i===index?{...g,stops:g.stops.map((s,j)=>j===1?{...s,wait:before}:s)}:g),frozen.guards);
  const route=live.find(m=>m.id===id)!.patrolRoutes!.find(r=>r.id===`${id}-g${index+1}`)!;
  // The later cover pass moves the inspection point but must retain the wait.
  const post=COVER_CHECKPOINTS[id]?.find(p=>p.guard===index&&p.stop===1)?.post??stop;
  const points=route.points.filter(p=>p.x===post.x&&p.y===post.y);
  assert(points.length>0);assert(points.every(p=>p.waitDuration===after));
 }
});

test('Cryo Research changes only its objective patrol start, preserving the frozen source',()=>{
 const source=V13_LAB_FROZEN.find(m=>m.id==='04-04')!;
 const lab=V13_LAB.find(m=>m.id==='04-04')!;
 assert.equal(source.guards[3].role,'objective');
 assert.equal(source.guards[3].startDelay,18);
 assert.equal(lab.guards[3].role,'objective');
 assert.equal(lab.guards[3].startDelay,12);
 assert.deepEqual(lab.guards.map((guard,index)=>index===3?{...guard,startDelay:18}:guard),source.guards);
 const cryo=live.find(m=>m.id==='04-04')!,security=live.find(m=>m.id==='08-04')!;
 assert.equal(cryo.guards[3].role,'objective');assert.equal(cryo.guards[3].startDelay,12);
 assert.equal(security.guards[3].role,'objective');assert.equal(security.guards[3].startDelay,18);

});

test('Campaign: 9 chapters × 5 missions = 45, counted in one place',()=>{
 assert.equal(CHAPTER_COUNT,9);assert.deepEqual([...CHAPTER_MISSION_COUNTS],[5,5,5,5,5,5,5,5,5]);assert.equal(MISSION_COUNT,45);
 assert.equal(CHAPTERS.length,CHAPTER_COUNT);assert.equal(live.length,MISSION_COUNT);
 assert.equal(new Set(live.map(d=>d.id)).size,live.length,'duplicate mission id');
 live.forEach((d,i)=>{
  assert.equal(d.id,missionId(i),`mission ${i} is out of catalog order`);assert.equal(missionIndex(d.id),i);
  assert.equal(d.chapter,Number(d.id.slice(0,2)),d.id);assert.equal(d.mission,Number(d.id.slice(3)),d.id);
 });
});

test('Campaign: the old 10-mission chapter counts exist only in the save migration',()=>{
 const files:string[]=[],walk=(dir:string)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.tsx?$/.test(e.name)&&!/\.test\./.test(e.name))files.push(p);}};
 walk('src');
 const holders=files.filter(f=>/\b10\s*,\s*10\s*,\s*10\b/.test(fs.readFileSync(f,'utf8'))).map(f=>f.split(path.sep).join('/'));
 assert.deepEqual(holders,['src/game/progress/campaignProgress.ts']);
});

test('Campaign: `npm run campaign:bake` is the V13 bake and no historical builder writes the production file',()=>{
 const scripts=JSON.parse(fs.readFileSync('package.json','utf8')).scripts as Record<string,string>;
 assert.match(scripts['campaign:bake'],/tools\/campaign\/v13Build\.ts/);assert.match(scripts['campaign:bake'],/tools\/campaign\/buildMissionBriefs\.ts/);
 for(const [name,cmd] of Object.entries(scripts))assert.doesNotMatch(cmd,/v12[45][a-d]?Build\.ts|v[35]Bake\.ts/,`script ${name} runs a historical builder`);
 for(const f of ['v124bBuild','v124cBuild','v124dBuild','v125Build']){
  const text=fs.readFileSync(`tools/campaign/${f}.ts`,'utf8');
  assert.doesNotMatch(text,/campaignStages\.json'/,`${f} names the production campaign file`);assert.match(text,/QA_CANDIDATE/);
 }
});

test('Campaign: entry, prize and exit are apart; patrol points, cameras and route anchors stand on open floor',()=>{
 for(const def of live){
  const stage=compileStage(def),mov=stage.movementBlockers,stand=(x:number,y:number,r:number)=>clearSegment(x,y,x,y,mov,r);
  const floor=(x:number,y:number)=>def.layout[Math.floor(y)]?.[Math.floor(x)]==='.';
  const s=def.playerSpawn,o=def.objective!,e=def.exitPosition!;
  assert(Math.hypot(s.x-o.x,s.y-o.y)>=3,`${def.id} entry on top of the prize`);assert(Math.hypot(e.x-o.x,e.y-o.y)>=3,`${def.id} exit on top of the prize`);
  assert(stand(stage.playerSpawn.x,stage.playerSpawn.y,BODY.playerRadius),`${def.id} spawn inside collision`);
  for(const g of stage.guards)for(const p of g.route)assert(stand(p.x,p.y,BODY.guardRadius),`${def.id} ${g.id} patrol point ${p.x/TILE},${p.y/TILE} inside collision`);
  assert.equal(new Set(stage.guards.map(g=>g.id)).size,stage.guards.length,`${def.id} duplicate guard id`);
  const cameras=stage.cameras??[];assert.equal(new Set(cameras.map(c=>c.id)).size,cameras.length,`${def.id} duplicate camera id`);
  for(const c of cameras)assert(floor(c.x/TILE,c.y/TILE),`${def.id} ${c.id} is mounted inside a wall`);
  for(const r of [...(def.testRoutes??[]),...(def.escapeRoutes??[])])for(const p of r.points.slice(0,-1))assert(floor(p.x,p.y)&&stand(p.x*TILE,p.y*TILE,BODY.playerRadius),`${def.id} ${r.name} anchor ${p.x},${p.y} is not walkable`);
 }
});

test('Campaign: chapter sources — nine chapters in bake order, and each derived chapter branches off where v13Sources says',()=>{
 assert.deepEqual(CHAPTER_SOURCE.map(c=>c.chapter),[1,2,3,4,5,6,7,8,9]);
 for(const c of CHAPTER_SOURCE)assert.deepEqual(c.missions.map(m=>m.id),[1,2,3,4,5].map(n=>`0${c.chapter}-0${n}`),`chapter ${c.chapter}`);
 assert.deepEqual(V13_MISSIONS.map(m=>m.id),live.map(d=>d.id));
 const mirror=(map:string[])=>map.map(row=>[...row].reverse().join(''));
 for(const chapter of [5,6,7,8] as DerivedChapter[]){
  const from=DERIVED_FROM[chapter],derived=CHAPTER_SOURCE[chapter-1];
  assert.equal(derived.derivedFrom,from.chapter);assert.equal(new Set(from.order).size,5,`chapter ${chapter} base plans`);
  for(const id of from.order)assert(id.startsWith(`0${from.chapter}-`)&&from.plans.some(m=>m.id===id),`chapter ${chapter}: base ${id}`);
  derived.missions.forEach((m,i)=>assert.equal(baseMissionOf(m.id),from.order[i]));
  // Mirrored floor plan of the base it names. Chapters with patches of their own may differ by those wall cells only;
  // a Gameplay v3 rework (v13Rework.ts) may differ by exactly the cells it declares, each holding the declared value.
  derived.missions.forEach((m,i)=>{
   const W=m.map[0].length,declared=new Map((REWORK[m.id]?.cells??[]).map(([x,y,ch])=>[y*W+x,ch]));
   for(const [k,ch] of declared)assert.equal(m.map.join('')[k],ch,`${m.id} rework cell ${k%W},${Math.floor(k/W)}`);
   const base=mirror(from.plans.find(b=>b.id===from.order[i])!.map),cells=base.join('').length,changed=[...m.map.join('')].filter((ch,k)=>!declared.has(k)&&ch!==base.join('')[k]).length;
   assert.equal(m.map.join('').length,cells,m.id);
   if(from.phase7==='inherits Phase 7')assert.equal(changed,0,`${m.id} is not the mirror of ${from.order[i]}`);else assert(changed<=2,`${m.id} differs from frozen ${from.order[i]} by ${changed} cells`);
  });
 }
 assert.equal(baseMissionOf('05-03'),'03-04');assert.equal(baseMissionOf('05-04'),'03-03');assert.equal(baseMissionOf('09-01'),undefined);assert.equal(baseMissionOf('01-01'),undefined);
 // Chapter 5 / 6 take the plans with the Phase 7 layer; Chapter 7 / 8 take the frozen plans, which that layer does not touch.
 assert.equal(DERIVED_FROM[5].plans,V13_BANK);assert.equal(DERIVED_FROM[6].plans,V13_GALLERY);
 assert.equal(DERIVED_FROM[7].plans,V13_MUSEUM_FROZEN);assert.equal(DERIVED_FROM[8].plans,V13_LAB_FROZEN);
 assert.notDeepEqual(V13_MUSEUM,V13_MUSEUM_FROZEN);assert.notDeepEqual(V13_LAB,V13_LAB_FROZEN);
});

test('Campaign: the override index reads every table, names real missions and keeps the stage order',()=>{
 const ids=live.map(d=>d.id),index=missionOverrideIndex(ids);
 for(const [table,keys] of Object.entries({PHASE7:Object.keys(PHASE7),REPLACED:Object.keys(REPLACED),LANES:Object.keys(LANES),LATE:Object.keys(LATE),REWORK:Object.keys(REWORK),PINNED:Object.keys(PINNED),MOVED:Object.keys(MOVED),PATROL:Object.keys(PATROL),HQ_PATROL:Object.keys(HQ_PATROL),COVER_CHECKPOINTS:Object.keys(COVER_CHECKPOINTS),PATROL_POLISH:Object.keys(PATROL_POLISH),EXIT_CAMERA_WATCH:Object.keys(EXIT_CAMERA_WATCH)}))for(const id of keys){
  assert(ids.includes(id),`${table} names unknown mission ${id}`);assert(index[id]?.some(e=>e.table===table&&!e.inheritedFrom),`${id}: ${table} entry missing from the index`);
 }
 // The Phase 7 layer belongs to Chapter 1–4 plans, the late layer to Chapter 7–8: the stage each table runs at depends on it.
 for(const id of [...Object.keys(PHASE7),...Object.keys(REPLACED),...Object.keys(LANES)])assert(Number(id.slice(0,2))<=4,`${id}: Phase 7 layer outside Chapter 1–4`);
 for(const id of [...Object.keys(LATE),...Object.keys(PINNED)])assert(['07','08'].includes(id.slice(0,2)),`${id}: late layer outside Chapter 7–8`);
 // A moved Casino piece exists in that mission, stands where the table says, and the table names Chapter 5 only.
 for(const [id,pieces] of Object.entries(MOVED)){assert(id.startsWith('05-'),`MOVED outside Chapter 5: ${id}`);for(const [name,to] of Object.entries(pieces)){const s=V13_MISSIONS.find(m=>m.id===id)!.structures.find(s=>s.name===name);assert(s&&s.x===to.x&&s.y===to.y,`${id}: ${name} is not at ${to.x},${to.y}`);}}
 // A replaced Casino patrol names Chapter 5 only, an existing guard of that role, and leaves the guard count alone.
 for(const [id,roles] of Object.entries(PATROL)){assert(id.startsWith('05-'),`PATROL outside Chapter 5: ${id}`);const m=V13_MISSIONS.find(q=>q.id===id)!,bank=V13_BANK.find(q=>q.id===baseMissionOf(id))!;
  assert.equal(m.guards.length,bank.guards.length,`${id}: guard count`);assert.deepEqual(m.guards.map(g=>g.role),bank.guards.map(g=>g.role),`${id}: guard roles and order`);
  for(const [role,own] of Object.entries(roles)){
   const matches=m.guards.filter(q=>q.role===role);assert.equal(matches.length,1,`${id}: one ${role} guard`);
   const guard=matches[0],index=m.guards.indexOf(guard);
   const inserts=(PATROL_POLISH[id]??[]).filter(e=>e.guard===index&&'after' in e);
   const originalStops=guard.stops.filter(s=>!inserts.some(e=>'stop' in e&&s.x===e.stop.x&&s.y===e.stop.y));
   assert.equal(guard.stops.length,own.stops.length+inserts.length,`${id}: preserve all Casino stops and declared added waypoints`);
   assert.equal(originalStops.length,own.stops.length,`${id}: all original inspection stops remain`);
   own.stops.forEach((stop,i)=>{
    if(!COVER_CHECKPOINTS[id].some(p=>p.guard===index&&p.stop===i))assert.deepEqual(originalStops[i],stop);
    assert.equal(originalStops[i].wait,stop.wait,`${id}: retain inspection rhythm`);
   });
  }
 }
 for(const base of Object.keys(EXTRA_CAMERA))assert(base.startsWith('03-'),`EXTRA_CAMERA is keyed by the Bank plan, got ${base}`);
 for(const list of Object.values(index))assert.deepEqual(list.map(e=>STAGES.indexOf(e.stage)),[...list.map(e=>STAGES.indexOf(e.stage))].sort((a,b)=>a-b));
 // Edits listed as authored in a plan are really there.
 for(const a of AUTHORED_IN_PLAN){const s=V13_MISSIONS.find(m=>m.id===a.mission)!.structures.find(s=>s.name===a.structure);assert(s&&s.x===a.at[0]&&s.y===a.at[1],`${a.mission}: ${a.structure} is not at ${a.at}`);}
 // 04-05: everything that touches it, and what its twin 08-05 does and does not inherit.
 assert.deepEqual(missionOverrides('04-05').map(e=>`${e.stage}|${e.category}`),['1 plan|authored in plan','1 plan|authored in plan','2 phase7 lanes|wall cell','2 phase7 lanes|route anchor','4 phase7 cover|structure added','9 cover checkpoints|patrol replaced']);
 assert.deepEqual(missionOverrides('08-05').map(e=>`${e.stage}|${e.category}|${e.inheritedFrom??'own'}`),['1 plan|authored in plan|04-05','1 plan|authored in plan|04-05','7 late|wall cell|own','7 late|route anchor|own','7 late|structure added|own','7 late|patrol stop|own','9 cover checkpoints|patrol replaced|own']);
 // 05-03 is built on 03-04 after Phase 7, so it inherits that lane change and adds its own camera.
 assert.deepEqual(missionOverrides('05-03').map(e=>`${e.table}|${e.inheritedFrom??'own'}`),['LANES|03-04','EXTRA_CAMERA|own','COVER_CHECKPOINTS|own']);
});

test('Campaign: secure() and the reuse helpers are frozen (Chapter 6–8 guard and camera placement depends on them)',()=>{
 const pinned=JSON.parse(fs.readFileSync('docs/design/v13/PHASE8_PROTECTED_HASHES.json','utf8')) as Record<string,string>;
 assert(Object.keys(pinned).includes('tools/campaign/v13Reuse.ts'));
 for(const [file,hash] of Object.entries(pinned))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,`${file} changed: see tools/campaign/README.md before touching it`);
});

// Gameplay balance / patrol fix v1: the conservative square navigation envelope
// must clear the cashier corner too, even though the old round body did not overlap.
test('05-02: former cashier-corner contact reproduces, corrected patrol stays clear for 10 minutes',async()=>{
 const {composeV13}=await import('./v13Builder');
 const raw=JSON.parse(fs.readFileSync('docs/design/v12/phase4d/SOURCE_STAGES.json','utf8')) as StageDefinition[];
 const {createGuardState,createGuardEvents}=await import('../../src/game/guards/guardBrain');
 const {stepGuards}=await import('../../src/game/guards/guardSystem');
 const {buildNavigation}=await import('../../src/game/world/navigation');
 const plan=V13_MISSIONS.find(m=>m.id==='05-02')!,old=structuredClone(plan);
 // Recreate the pre-repair two-stop patrol before introducing the old grazing post.
 old.guards.find(g=>g.role==='objective')!.stops.splice(1,1);
 old.guards.find(g=>g.role==='objective')!.stops[0].x=2.75;
 const run=(def:StageDefinition,seconds:number)=>{
  const s=compileStage(def),nav=buildNavigation(s,BODY.guardRadius),guards=s.guards.map(g=>createGuardState(g)),events=createGuardEvents();
  let contacts=0,firstTime:number|null=null,firstCircleClearance:number|null=null,cycles=0,last=0;const reached=new Set<number>();
  for(let f=0;f<seconds*60;f++){
   const prev=guards.map(g=>({x:g.x,y:g.y}));
   stepGuards(guards,{x:-1000,y:-1000,gait:0} as never,s.visionBlockers,nav,1/60,events,f/60,true);
   guards.forEach((g,i)=>{
    if(!clearSegment(prev[i].x,prev[i].y,g.x,g.y,nav.blockers,BODY.guardRadius)){
     contacts++;if(firstTime===null){firstTime=f/60;firstCircleClearance=Infinity;
      for(let k=0;k<s.movementBlockers.length;k+=4){const b=s.movementBlockers;
       const d=Math.hypot(Math.max(b[k]-g.x,0,g.x-b[k+2]),Math.max(b[k+1]-g.y,0,g.y-b[k+3]))-BODY.guardRadius;
       firstCircleClearance=Math.min(firstCircleClearance,d);
      }
     }
    }
   });
   const g=guards.find(g=>g.id==='05-02-g4')!;reached.add(g.routeIdx);if(g.routeIdx===0&&last!==0)cycles++;last=g.routeIdx;
  }
  return {contacts,firstTime,firstCircleClearance,cycles,reached};
 };
 const before=run(composeV13(old,raw),120),after=run(live.find(d=>d.id==='05-02')!,600);
 assert.equal(before.contacts,2);assert.equal(before.firstTime,26.25);
 assert(before.firstCircleClearance!>3,'Old finding is a square-envelope graze, not round-body overlap');
 const correctedOld=structuredClone(old);correctedOld.guards.find(g=>g.role==='objective')!.stops[0].x=2.8;
 assert.equal(run(composeV13(correctedOld,raw),120).contacts,0,'The original two-stop repair remains safe before the added waypoint');
 assert.equal(after.contacts,0);assert(after.cycles>=20,'Guard must complete repeated circuits instead of stopping');
 assert.equal(after.reached.size,6,'All compiled patrol targets remain visited');
 const expected=structuredClone(old),objective=expected.guards.find(g=>g.role==='objective')!;
 objective.stops[0].x=2.8;
 const inserted=PATROL_POLISH['05-02'].find(e=>e.guard===3&&'stop' in e)!;
 if(!('stop' in inserted))throw Error('Missing 05-02 waypoint');
 objective.stops.splice(inserted.after+1,0,structuredClone(inserted.stop));
 assert.deepEqual(plan,expected,'The corrected inspection post and declared waypoint preserve other security subjects and waits');
});

test('05-02: stationary entry and objective shoulder stay safe; standing on the watched prize remains risky',async()=>{
 const {createGuardState,createGuardEvents}=await import('../../src/game/guards/guardBrain');
 const {stepGuards}=await import('../../src/game/guards/guardSystem');
 const {buildNavigation}=await import('../../src/game/world/navigation');
 const s=compileStage(live.find(d=>d.id==='05-02')!),nav=buildNavigation(s,BODY.guardRadius);
 for(const [name,p,shouldCatch] of [
  ['spawn',s.playerSpawn,false],['objective shoulder',{x:4.25*TILE,y:19.3*TILE},false],['watched prize',s.objective,true],
 ] as const){
  const guards=s.guards.map(g=>createGuardState(g)),events=createGuardEvents();
  for(let f=0;f<60*60&&!events.caught;f++)stepGuards(guards,{...p,gait:0} as never,s.visionBlockers,nav,1/60,events,f/60,true);
  assert.equal(events.caught,shouldCatch,name);
 }
});
