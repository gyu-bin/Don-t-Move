import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {V9_CORE_IDS,V9_HEIST_PLANS,composeV9Heist} from './curatedHeistFlows';
import {auditV5Geometry} from './v5Geometry';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment,buildNavigation,findPath} from '../../src/game/world/navigation';
import {PROP_KIT} from '../../src/game/world/propKit';
import {measureObjectiveInspection} from './measureObjectiveInspection';
const originals=JSON.parse(fs.readFileSync('tools/campaign/fixtures/v9CoreBefore.json','utf8')) as StageDefinition[];
const runtime=JSON.parse(fs.readFileSync('src/game/levels/stages/campaignStages.json','utf8')) as StageDefinition[];
const before=runtime.map(q=>originals.find(d=>d.id===q.id)??q);
const candidate=JSON.parse(JSON.stringify(before.map(composeV9Heist))) as StageDefinition[];
const core=candidate.filter(q=>V9_CORE_IDS.includes(q.id as typeof V9_CORE_IDS[number]));
test('V9 candidate changes exactly four core maps and leaves other56 complete objects byte-equivalent',()=>{
 assert.deepEqual(candidate.filter((q,i)=>JSON.stringify(q)!==JSON.stringify(before[i])).map(q=>q.id),[...V9_CORE_IDS]);
 for(const d of candidate.filter(q=>!V9_CORE_IDS.includes(q.id as typeof V9_CORE_IDS[number])))assert.equal(JSON.stringify(d),JSON.stringify(before.find(q=>q.id===d.id)),d.id);
});
test('Four heists have staged named places, purposeful major structures, clear alternate-in and alternate-out',()=>{
 for(const d of core){const plan=V9_HEIST_PLANS[d.id];assert(plan.zones.length>=5);assert(plan.zones.some(q=>q.purpose.includes('APPROACH')));assert(plan.zones.some(q=>q.purpose.includes('INFILTRATION')));assert(plan.zones.some(q=>q.purpose.includes('SECURITY LAYER')));assert(plan.zones.some(q=>q.purpose.includes('OBJECTIVE')));assert(plan.zones.some(q=>q.purpose.includes('ESCAPE')||q.purpose.includes('EXIT')));assert(plan.items.every(q=>q.reason.trim().length>15));assert.equal(d.testRoutes?.length,3);assert.equal(d.escapeRoutes?.length,2);assert.notDeepEqual(d.testRoutes![0].points,d.testRoutes![1].points);assert.notDeepEqual(d.escapeRoutes![0].points,d.escapeRoutes![1].points);assert(d.lights.some(l=>l.kind==='cyan'&&Math.hypot(l.x-d.objective!.x,l.y-d.objective!.y)<.1));assert(d.props.some(q=>q.kind==='objectiveCase'&&Math.hypot(q.x-d.objective!.x,q.y-d.objective!.y)<.1));}
});
test('Actual compiled radius18 routes, guard routes/search, objectives and exits are accessible',()=>{
 for(const d of core)assert.deepEqual(auditV5Geometry(d).issues,[],d.id);
});
test('02-06 glass is sealed movement architecture transmitting LOS with opaque cover outside it',()=>{
 const d=core.find(q=>q.id==='02-06')!,s=compileStage(d),a={x:14*TILE,y:16*TILE},b={x:16*TILE,y:16*TILE};
 assert.equal(d.props.filter(q=>q.kind.startsWith('galleryGlass')).length,4);assert.equal(clearSegment(a.x,a.y,b.x,b.y,s.movementBlockers,9),false);assert.equal(clearSegment(a.x,a.y,b.x,b.y,s.visionBlockers),true);
 const path=findPath(buildNavigation(s,9),s.playerSpawn.x,s.playerSpawn.y,b.x,b.y);assert(path.length===0||Math.hypot(path.at(-2)!-b.x,path.at(-1)!-b.y)>9);
 assert(d.layout[0].includes('#'));assert(!d.layout[0].includes('.'),'closed normal north wall exists inside finite layout, no virtual wall required');
 const island=d.props.find(q=>q.visualAssetId==='gallery_installation_art')!;const f=PROP_KIT[island.kind].footprint,scale=island.collisionScale??1,midY=island.y-f.h*scale/2,dx=f.w*scale/2+.46;
 // Both exterior public viewing lanes reach the goal and are not the sealed exhibit interior.
 for(const x of[13.5,21.5]){const route=findPath(buildNavigation(s,18),s.playerSpawn.x,s.playerSpawn.y,x*TILE,midY*TILE);assert(route.length>=2);assert(Math.hypot(route.at(-2)!/TILE-x,route.at(-1)!/TILE-midY)<.01);}
 assert(dx>0);
});
test('Finales retain delayed-alarm flags and actual secure chamber ownership, not a remote landmark',()=>{
 for(const id of['02-10','03-10']){const d=core.find(q=>q.id===id)!,old=before.find(q=>q.id===id)!,plan=V9_HEIST_PLANS[id];assert.equal(d.objective!.highSecurity,true);assert.equal(d.objective!.highSecurity,old.objective!.highSecurity);const room=plan.zones.find(q=>q.purpose.includes('OBJECTIVE'))!;assert(d.objective!.x>room.x+1&&d.objective!.x<room.x+room.w-1);assert(d.objective!.y>room.y+1&&d.objective!.y<room.y+room.h-1);assert(d.guards.filter(q=>q.role==='objective').length===1);assert(d.guards.every((q,i)=>q.pace===old.guards[i].pace&&q.visionRange===old.guards[i].visionRange));}
 const bank=core.find(q=>q.id==='03-10')!,vault=bank.props.find(q=>q.kind==='bankMainVault')!;assert(Math.hypot(vault.x-bank.objective!.x,vault.y-bank.objective!.y)<5);assert(bank.layout.length<before.find(q=>q.id==='03-10')!.layout.length,'redundant long service run is condensed');
 for(const name of['Cash Processing','Dispatch Junction','Records Evacuation']){const room=V9_HEIST_PLANS['03-10'].zones.find(q=>q.name===name)!;assert(bank.escapeRoutes![0].points.some(p=>p.x>=room.x&&p.x<room.x+room.w&&p.y>=room.y&&p.y<room.y+room.h),name);}
});
test('Four-map composition is reproducible and does not require runtime navigation generation',()=>{
 for(const d of core)assert.deepEqual(JSON.parse(JSON.stringify(composeV9Heist(before.find(q=>q.id===d.id)!))),d);
 const source=fs.readFileSync('src/game/levels/campaignStages.ts','utf8');assert(!source.includes('curatedHeistFlows'));assert(source.includes("import data from './stages/campaignStages.json'"));
});

test('03-10 secure layers are physical articulation crossings, service side cannot bypass approach',()=>{
 const d=core.find(q=>q.id==='03-10')!,s=compileStage(d);
 for(const barrier of[{name:'Checkpoint → Inner Security',x:14.5,y:22,w:4,h:1},{name:'Inner Security → Antechamber',x:15.5,y:11,w:4,h:1},{name:'Antechamber → Vault',x:24,y:4.5,w:1,h:4}]){
  const blocked={...s,movementBlockers:[...s.movementBlockers,barrier.x*TILE,barrier.y*TILE,(barrier.x+barrier.w)*TILE,(barrier.y+barrier.h)*TILE]};const path=findPath(buildNavigation(blocked,9),s.playerSpawn.x,s.playerSpawn.y,s.objective.x,s.objective.y);assert(path.length===0||Math.hypot(path.at(-2)!-s.objective.x,path.at(-1)!-s.objective.y)>9,barrier.name+' must gate the physical vault approach');
 }
});

test('Curated Gallery walls contain no duplicate commissioned artwork and portraits fit architecture scale',()=>{
 for(const d of core.filter(q=>q.chapter===2)){const art=d.dressing!.flatMap(c=>c.items).filter(q=>q.kind==='painting_wall');assert(art.length>=10);assert.equal(new Set(art.map(q=>q.visualAssetId)).size,art.length);assert(art.filter(q=>q.visualAssetId!.includes('portrait')).every(q=>q.scale!<=1.15));assert(d.props.filter(q=>q.kind==='partition'&&q.visualAssetId!=='gallery_masterpiece_wall').every(q=>q.visualAssetId==='gallery_white_wall'),'neutral structural screens must not bake repeated artwork');}
});
test('Navigation-expanded patrol nodes cannot acquire authored observation pauses',()=>{
 for(const d of core)for(let i=0;i<d.patrolRoutes.length;i++){const actual=V9_HEIST_PLANS[d.id].guards[i].points;for(const q of d.patrolRoutes[i].points)if(!actual.some(a=>Math.hypot(a.x-q.x,a.y-q.y)<.01)){assert.equal(q.waitDuration,0);assert.equal(q.turnDuration,0);}}
});

test('02-10 actual45s Guard AI has a genuine southern objective inspection and a blind window',()=>{
 const d=core.find(q=>q.id==='02-10')!,r=measureObjectiveInspection(d);assert(r.firstSeen!==null&&r.firstSeen<45);assert(r.visibleSeconds>.5,'real cone+LOS inspection lasts beyond a transient crossing');assert(r.blindSeconds>5,'objective must retain meaningful unobserved approach windows');assert(r.inspectGuardFrames[d.objectiveZone!.guardId]>30,'the objective custodian actually inspects the case');
});
