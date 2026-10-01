import v3FinalJSON from './fixtures/v3MuseumGalleryFinal.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import assert from 'node:assert/strict';
import test from 'node:test';
import {buildCampaign} from './buildCampaign';
import {auditV3MuseumGallery} from './v3MuseumGalleryQA';

test('V3 traversal audit rejects a blocked semantic anchor even when raw patrolRoutes remain clear',()=>{
 const def=structuredClone((v3FinalJSON as StageDefinition[]).find(d=>d.id==='02-06')!);
 const assignment=def.patrolPlan!.assignments[0];
 const anchor=def.patrolPlan!.anchors.find(a=>a.id===assignment.anchors[1])!;
 const y=def.layout.findIndex(row=>row.includes('#'));
 anchor.x=def.layout[y].indexOf('#')+.5;anchor.y=y+.5;
 const audit=auditV3MuseumGallery(def);
 assert.equal(audit.guardNav,false);
 assert(audit.issues.some(i=>i.includes('blocked compiled patrol/search anchor')));
});

test('V3 actual compiled patrol and search targets are reachable in all thirty missions',()=>{
 for(const def of buildCampaign().slice(0,30)){
  const audit=auditV3MuseumGallery(def);
  assert.equal(audit.guardNav,true,`${def.id}: ${audit.issues.join('; ')}`);
  assert.equal(audit.radius18,true,`${def.id}: ${audit.issues.join('; ')}`);
 }
});
