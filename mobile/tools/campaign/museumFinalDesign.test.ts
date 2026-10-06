import v3FinalJSON from './fixtures/v3MuseumGalleryFinal.json';
import historicalJSON from './fixtures/v3MuseumGalleryBefore.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {applyV3MuseumGallery} from './v3MuseumGallery';
import {auditV3MuseumGallery} from './v3MuseumGalleryQA';
import {guardPhysicalContract} from './guardPhysicalContract';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {museumMission05,museumMission08,museumMission10} from './museumProduction';
import {applyMuseumFinalDesign} from './museumFinalDesign';
import {auditHideability,structureRole} from './museumHideabilityQA';

test('Historical V3 Museum authoring and measured hide witnesses remain reproducible',()=>{
 const zoneCounts=[3,3,4,4,5,5,5,5,6,6],guardCounts=[2,2,2,3,3,3,3,4,5,6];
 for(let i=0;i<10;i++){
  const def=applyV3MuseumGallery((historicalJSON as StageDefinition[]).find(s=>s.id===`01-${String(i+1).padStart(2,'0')}`)!),baked=(v3FinalJSON as StageDefinition[]).find(s=>s.id===def.id)!;
  assert.deepEqual(JSON.parse(JSON.stringify(def)),baked,`${def.id}: regenerate campaign JSON`);
  const qa=auditHideability(def);assert.equal(qa.zones.length,zoneCounts[i]);assert.equal(def.guards.length,guardCounts[i]);
  assert(qa.routes.every(r=>r.bodyClear),`${def.id}: player-radius blocked path`);
  assert(qa.guards.every(g=>[...g.anchors,...g.theftPosts].every(a=>a.bodyClear&&a.reachable)),`${def.id}: guard anchor`);
  for(const z of qa.zones)assert(z.hidePoints>0||z.exception,`${z.id}: no actual geometric hide witness`);
 }
});
test('Historical01-05 retains architecture/routes and has two independent restricted-gallery prop hides',()=>{
 const before=museumMission05(),after=(historicalJSON as StageDefinition[]).find(d=>d.id==='01-05')!,qa=auditHideability(after);
 assert.deepEqual(after.layout,before.layout);assert.deepEqual(after.testRoutes,before.testRoutes);assert.deepEqual(after.escapeRoutes,before.escapeRoutes);
 assert(qa.witnesses.filter(w=>w.zone==='01-05-C').length>=2);
 assert(qa.zones.find(z=>z.id==='01-05-E')!.escapePockets>=1);
});
test('Historical01-08 improves measured hiding and keeps four non-player semantic investigation roles',()=>{
 const before=auditHideability(museumMission08()),after=(v3FinalJSON as StageDefinition[]).find(s=>s.id==='01-08')!,qa=auditHideability(after);
 assert(qa.hidePoints>before.hidePoints);assert(qa.escapePockets>before.escapePockets);
 assert.deepEqual(after.guards.map(g=>g.theftRole),['zone','corridor','exit','objective']);
 assert(qa.zones.every(z=>z.hidePoints>0));
});
test('Historical01-10 retains authored architecture, routes, objective and guards through central gap refinements',()=>{
 const before=museumMission10(),after=(historicalJSON as StageDefinition[]).find(d=>d.id==='01-10')!;
 for(const key of ['layout','playerSpawn','objective','exit','guards','patrolRoutes','testRoutes','escapeRoutes'] as const)
  assert.deepEqual(key==='guards'?guardPhysicalContract(after.guards):after[key],key==='guards'?guardPhysicalContract(before.guards):before[key],`01-10 protected ${key}`);
 assert.equal(after.props.length,before.props.length);
});
test('guard-generation gate rejects an unreachable destination; decoration does not count as cover',()=>{
 const def=museumMission10();def.guards[0].theftPosts=[{x:-5,y:-5}];
 assert.throws(()=>applyMuseumFinalDesign(def),/unreachable semantic anchor/);
 assert.equal(structureRole('plant'),'DECORATION');assert.equal(structureRole('objectiveCase'),'DECORATION');
 assert.equal(structureRole('table'),'ROUTE DIVIDER');
});


test('authored Museum landmarks refer to real props and the rotunda accent follows its approved sculpture',()=>{
 for(let i=0;i<10;i++){
  const def=(historicalJSON as StageDefinition[]).find(d=>d.id===`01-${String(i+1).padStart(2,'0')}`)!,landmark=def.landmark;
  assert(landmark,`${def.id}: landmark missing`);
  assert(def.props.some(p=>p.kind===landmark.kind&&p.x===landmark.x&&p.y===landmark.y),`${def.id}: landmark detached from prop`);
 }
 const rotunda=(v3FinalJSON as StageDefinition[]).find(s=>s.id==='01-02')!,landmark=rotunda.landmark!;
 assert.deepEqual({x:landmark.x,y:landmark.y},{x:6.65,y:7.65});
 assert.equal(landmark.kind,'statue');
 assert(rotunda.lights.some(l=>l.x===landmark.x&&l.y===landmark.y), 'rotunda accent detached from sculpture');
});

for(const baseline of (historicalJSON as StageDefinition[]).filter(d=>d.chapter===1))test(`${baseline.id} V3 preserves Museum architecture/security while certifying18px route envelope`,()=>{
 const def=applyV3MuseumGallery(baseline);
 for(const key of ['layout','props','dressing','lights','objective','guards','patrolRoutes','cameras'] as const)assert.deepEqual(def[key],baseline[key],`${def.id}: preserved ${key}`);
 assert.deepEqual(applyV3MuseumGallery(def),def,'V3 authoring must be idempotent');
 assert.deepEqual(auditV3MuseumGallery(def).issues,[]);
 const baked=(v3FinalJSON as StageDefinition[]).find(d=>d.id===def.id)!;
 assert.deepEqual(JSON.parse(JSON.stringify(def)),baked,'historical V3 envelope must remain reproducible');
});
