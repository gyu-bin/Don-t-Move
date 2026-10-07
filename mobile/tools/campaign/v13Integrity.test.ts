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
import {PINNED} from './v13Late';
import {EXTRA_CAMERA,MOVED,PATROL} from './v13Casino';
import {AUTHORED_IN_PLAN,missionOverrideIndex,missionOverrides,STAGES} from './v13Overrides';

const live=current as unknown as StageDefinition[];

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
  // Mirrored floor plan of the base it names. Chapters with patches of their own may differ by those wall cells only.
  derived.missions.forEach((m,i)=>{
   const base=mirror(from.plans.find(b=>b.id===from.order[i])!.map),cells=base.join('').length,changed=[...m.map.join('')].filter((ch,k)=>ch!==base.join('')[k]).length;
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
 for(const [table,keys] of Object.entries({PHASE7:Object.keys(PHASE7),REPLACED:Object.keys(REPLACED),LANES:Object.keys(LANES),LATE:Object.keys(LATE),PINNED:Object.keys(PINNED),MOVED:Object.keys(MOVED),PATROL:Object.keys(PATROL)}))for(const id of keys){
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
  for(const [role,own] of Object.entries(roles)){const g=m.guards.filter(q=>q.role===role);assert.equal(g.length,1,`${id}: one ${role} guard`);assert.deepEqual(g[0].stops,own.stops);}}
 for(const base of Object.keys(EXTRA_CAMERA))assert(base.startsWith('03-'),`EXTRA_CAMERA is keyed by the Bank plan, got ${base}`);
 for(const list of Object.values(index))assert.deepEqual(list.map(e=>STAGES.indexOf(e.stage)),[...list.map(e=>STAGES.indexOf(e.stage))].sort((a,b)=>a-b));
 // Edits listed as authored in a plan are really there.
 for(const a of AUTHORED_IN_PLAN){const s=V13_MISSIONS.find(m=>m.id===a.mission)!.structures.find(s=>s.name===a.structure);assert(s&&s.x===a.at[0]&&s.y===a.at[1],`${a.mission}: ${a.structure} is not at ${a.at}`);}
 // 04-05: everything that touches it, and what its twin 08-05 does and does not inherit.
 assert.deepEqual(missionOverrides('04-05').map(e=>`${e.stage}|${e.category}`),['1 plan|authored in plan','1 plan|authored in plan','2 phase7 lanes|wall cell','2 phase7 lanes|route anchor','4 phase7 cover|structure added']);
 assert.deepEqual(missionOverrides('08-05').map(e=>`${e.stage}|${e.category}|${e.inheritedFrom??'own'}`),['1 plan|authored in plan|04-05','1 plan|authored in plan|04-05','7 late|wall cell|own','7 late|route anchor|own','7 late|structure added|own']);
 // 05-03 is built on 03-04 after Phase 7, so it inherits that lane change and adds its own camera.
 assert.deepEqual(missionOverrides('05-03').map(e=>`${e.table}|${e.inheritedFrom??'own'}`),['LANES|03-04','EXTRA_CAMERA|own']);
});

test('Campaign: secure() and the reuse helpers are frozen (Chapter 6–8 guard and camera placement depends on them)',()=>{
 const pinned=JSON.parse(fs.readFileSync('docs/design/v13/PHASE8_PROTECTED_HASHES.json','utf8')) as Record<string,string>;
 assert(Object.keys(pinned).includes('tools/campaign/v13Reuse.ts'));
 for(const [file,hash] of Object.entries(pinned))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,`${file} changed: see tools/campaign/README.md before touching it`);
});
