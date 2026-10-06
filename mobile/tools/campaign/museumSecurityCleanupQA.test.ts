import test from 'node:test';
import assert from 'node:assert/strict';
import historicalJSON from './fixtures/v3MuseumGalleryBefore.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import phase3Source from '../../docs/design/v12/phase3/SOURCE_STAGES.json';
import {assertSecurityScope,auditSecurityVisual,fixture,visualBounds} from './museumSecurityCleanupQA';
const campaignStages=phase3Source as import('../../src/game/levels/StageDefinition').StageDefinition[]; // Historical authoring contract; runtime is covered separately.
const historicalCampaign=campaignStages.map(d=>d.chapter===1?(historicalJSON as StageDefinition[]).find(h=>h.id===d.id)!:d);
test('Historical Security cleanup preserves Museum other9 / Chapter04–09, allowing the authorized Gallery expansion',()=>{
 assertSecurityScope(historicalCampaign);
 const bad=structuredClone(historicalCampaign);bad[0].props[0].x+=.1;assert.throws(()=>assertSecurityScope(bad));
 const future=structuredClone(historicalCampaign);future.find(d=>d.id==='04-01')!.props[0].x+=.1;assert.throws(()=>assertSecurityScope(future));
 const gallery=structuredClone(historicalCampaign);gallery.find(d=>d.id==='02-01')!.props[0].x+=.1;assertSecurityScope(gallery);
 const guard=structuredClone(historicalCampaign);guard.find(d=>d.id==='01-08')!.guards[0].pace=9;assert.throws(()=>assertSecurityScope(guard));
});
test('Security sprite extents use actual procedural monitor height, not collider height',()=>{const bounds=visualBounds(fixture.mission),index=fixture.mission.props.findIndex(p=>p.kind==='counter'),p=fixture.mission.props[index];assert.equal(bounds[index].height,37*(p.scale??1));assert(bounds[index].height>22*(p.collisionScale??1));});
test('Security cleanup reduces conservative rendered-bound stacking pairs',()=>{const before=auditSecurityVisual(fixture.mission),after=auditSecurityVisual(historicalCampaign.find(d=>d.id==='01-08')!);assert(after.overlaps.length<before.overlaps.length);});

// Runtime CCTV/playthrough assertions live in museumRuntimeCctvQA.test.ts; archives certify geometry only.
