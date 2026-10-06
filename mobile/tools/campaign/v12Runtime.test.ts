import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {buildV12Campaign,v12MissionReport,V12_PLANS} from './v12Runtime';
import {auditV5Geometry} from './v5Geometry';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
const source=JSON.parse(fs.readFileSync('docs/design/v12/phase3/SOURCE_STAGES.json','utf8')) as StageDefinition[];
const rebuilt=buildV12Campaign(source),early=rebuilt.slice(0,15);
test('V12 rebuild is pure, deterministic and compacts only30earlymissions into15',()=>{
 const before=JSON.stringify(source);assert.equal(rebuilt.length,45);assert.equal(JSON.stringify(source),before);
 assert.deepEqual(buildV12Campaign(source),rebuilt);assert.equal(buildV12Campaign(rebuilt),rebuilt);
 for(let chapter=1;chapter<=9;chapter++)assert.deepEqual(rebuilt.filter(d=>d.chapter===chapter).map(d=>d.id),Array.from({length:5},(_,i)=>`${String(chapter).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`));
});
test('everyChapter4–9stage preserves reference and byte/dataidentity',()=>{
 const later=source.filter(s=>s.chapter!>3);assert.deepEqual(rebuilt.slice(15),later);
 later.forEach((s,i)=>{assert.equal(rebuilt[15+i],s);assert.equal(JSON.stringify(rebuilt[15+i]),JSON.stringify(s));});
});
test('KEEPEntrance/Portrait preserve authoredfloor, portals andapprovedartwork',()=>{
 for(const id of ['01-01','02-02']){const old=source.find(s=>s.id===id)!,now=rebuilt.find(s=>s.id===id)!;
 for(const key of ['layout','playerSpawn','entryPosition','objective','exitPosition','props','dressing'] as const)assert.deepEqual(now[key],old[key],`${id}:${key}`);}
});
test('15realcompiledmaps pass radius9body/radius18Tiltmargin andguard/searchnavigation',()=>{
 for(const d of early)assert.deepEqual(auditV5Geometry(d).issues,[],d.id);
});
test('safe/riskpaths are physically distinct andriskshortcut isshorter for everymission',()=>{
 for(const d of early){const r=v12MissionReport(d);assert(r.safeTiles>r.riskTiles+1,`${d.id} ${r.safeTiles}/${r.riskTiles}`);assert.notDeepEqual(d.testRoutes![0].points,d.testRoutes![1].points,d.id);}
});
test('everypickup has nearby actualopaqueLOSbreak, no safezoneimmunity assumption',()=>{
 for(const d of early){const stage=compileStage(d),b=d.safeZones!.at(-1)!,g=d.guards.find(g=>g.role==='objective')!;
 assert(Math.hypot(b.x-d.objective!.x,b.y-d.objective!.y)<=4.8,d.id);
 assert.equal(clearSegment(g.x*TILE,g.y*TILE,b.x*TILE,b.y*TILE,stage.visionBlockers),false,d.id);
 assert.equal(clearSegment(b.x*TILE,b.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,18),true,d.id);}
});
test('chapterencounterbudgetisflat, objectivehasonecustodian andexitnoguardcluster',()=>{
 for(const d of early){assert.equal(d.guards.length,d.chapter===3?3:2,d.id);assert.equal(d.guards.filter(g=>g.role==='objective').length,1,d.id);assert.equal(d.guards.filter(g=>g.role==='exit').length,0,d.id);assert((d.cameras?.length??0)<=1,d.id);
 if(d.chapter===1)for(const g of d.guards.filter(g=>g.role!=='objective'))assert(Math.hypot(g.x-d.objective!.x,g.y-d.objective!.y)>(g.visionRange??0),d.id);}
});
test('securitycopiesexistingchapterperception/patrolarchetypes, nevermission-numberstatramps',()=>{
 for(const d of early.filter(d=>V12_PLANS.some(p=>p.id===d.id))){const base=source.find(s=>s.id===`${String(d.chapter).padStart(2,'0')}-01`)!;
 d.guards.forEach((g,i)=>{const old=base.guards[Math.min(i,base.guards.length-1)];for(const key of ['pace','visionRange','visionHalfAngle'] as const)assert.equal(g[key],old[key],`${d.id}:${key}`);});
 if(d.cameras?.length){const old=source.flatMap(s=>s.chapter===d.chapter?s.cameras??[]:[])[0];for(const key of ['sweepSpeed','pauseAtEnds','suspicionRate','range','visionAngle'] as const)assert.equal(d.cameras[0][key],old[key],`${d.id}:${key}`);}}
});
test('GlassGalleryphysicalBLOCK andLOS PASS survivecounterpartopaquewalls',()=>{
 const d=rebuilt.find(d=>d.id==='02-04')!,s=compileStage(d),glass=d.props.find(p=>p.kind==='galleryGlassPanel')!;
 const x=glass.x*TILE,y=glass.y*TILE;
 assert.equal(clearSegment(x,y-30,x,y+30,s.movementBlockers,9),false);
 assert.equal(clearSegment(x,y-20,x,y+10,s.visionBlockers),true);
});
test('finaledelayedalarmsandactualBankvaultidentityarepreservedwithoutstatincrease',()=>{
 for(const id of ['02-05','03-05'])assert.equal(rebuilt.find(s=>s.id===id)!.objective!.highSecurity,true,id);
 const bank=rebuilt.find(s=>s.id==='03-05')!;assert(bank.structurePlan?.includes('PUBLIC'));assert(bank.props.some(p=>p.kind==='bankMainVault'));assert(bank.structurePlan?.includes('Cash processing'));
});

test('all15actualpatrolsinspectemptycasewithoutomniscienceandprovideblindtimingwindows',async()=>{
 const {measureObjectiveInspection}=await import('./measureObjectiveInspection');
 for(const d of early){const r=measureObjectiveInspection(d);assert.notEqual(r.firstSeen,null,`${d.id}: no natural inspection`);assert(r.visibleSeconds>1,`${d.id}: no usable inspection`);assert(r.blindSeconds>5,`${d.id}: objective permanently covered`);}
});

test('all15actualemptycasestriggeroneTheftAlertwithoutgrantinghiddenPlayerLKP',async()=>{
 const {createPlaygroundState}=await import('../../src/game/playground/playgroundState');
 const {stepGuards}=await import('../../src/game/guards/guardSystem');
 const {buildNavigation}=await import('../../src/game/world/navigation');
 const {BODY}=await import('../../src/game/guards/guardTuning');
 for(const d of early){const stage=compileStage(d),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);let t=0;
 const tick=()=>{t+=1/60;stepGuards(s.guards,{x:-10000,y:-20000,gait:0},stage.visionBlockers,nav,1/60,s.events,t,true,1,s.theft);};
 for(let i=0;i<120;i++)tick();s.theft.empty=true;
 for(let i=0;i<90*60&&!s.events.theftAlert;i++)tick();
 assert(s.events.theftAlert,`${d.id}: never naturally inspects empty case`);assert.equal(s.events.theftWhistleRevision,1,d.id);assert.equal(s.events.spottedWhistleRevision,0,d.id);assert(s.guards.every(g=>!g.hasLkp),d.id);
 }
});


test('everyauthoredwaitingpocketcontainsitsentirenominaldiskplusplayerbody',()=>{
 for(const d of early){const stage=compileStage(d);for(const q of d.safeZones??[])assert.equal(clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,stage.movementBlockers,9+q.radius*TILE),true,`${d.id}: pocketdisk outsidephysicalfloor`);}
});


test('eachguardhasanauthoredsemanticcoveragesectorataphysicallyvalidpatrolanchor',()=>{
 for(const d of early){const stage=compileStage(d);for(const g of d.guards){const z=d.securityZones?.find(z=>z.guardId===g.id);assert(z,`${d.id}:${g.id}: missingsector`);assert(z.name.length>0);assert(z.radius>0);assert.equal(clearSegment(z.x*TILE,z.y*TILE,z.x*TILE,z.y*TILE,stage.movementBlockers,8),true,`${d.id}:${g.id}: sectoranchorinsidewall`);}}
});


test('all15authoredroutescontain20pxnewTiltcomfortmargin',()=>{
 for(const d of early){const stage=compileStage(d);for(const r of [...d.testRoutes??[],...d.escapeRoutes??[]])for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];assert.equal(clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,20),true,`${d.id}:${r.name}: leg${i} lacks20pxTiltmargin`);}}
});
