import test from 'node:test';
import assert from 'node:assert/strict';
import {narrowGap,MIN_COMFORT_GAP,TILT_SPARE_PER_SIDE,assertCentralProtected,auditCentralCover,auditIslandBypasses,auditCentralPatrol} from './museumCentralCoverQA';
import historicalJSON from './fixtures/v3MuseumGalleryBefore.json';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {readFileSync} from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
const a={id:'a',l:0,t:0,r:40,b:40};
test('current profile gap threshold uses18 diameter plus10.5 smoothing travel per side',()=>{assert(Math.abs(TILT_SPARE_PER_SIDE-10.5)<1e-9);assert(Math.abs(MIN_COMFORT_GAP-39)<1e-9);const edge=40+MIN_COMFORT_GAP;assert(Math.abs(narrowGap(a,{id:'b',l:edge-1,t:0,r:edge+39,b:40})[0].width-38)<1e-9);assert.equal(narrowGap(a,{id:'b',l:edge,t:0,r:edge+40,b:40}).length,0);});
test('closed/overlap/corner-only boxes are not fake openings',()=>{assert.equal(narrowGap(a,{id:'b',l:40,t:0,r:80,b:40}).length,0);assert.equal(narrowGap(a,{id:'b',l:30,t:0,r:70,b:40}).length,0);assert.equal(narrowGap(a,{id:'b',l:50,t:40,r:90,b:80}).length,0);});
test('axis symmetric and thin visible slots retained',()=>{assert.equal(narrowGap(a,{id:'b',l:0,t:50,r:40,b:90})[0].axis,'y');assert.equal(narrowGap(a,{id:'b',l:43,t:0,r:83,b:40})[0].width,3);});
test('protected objective and guard tuning cannot silently change',()=>{const a=campaignStages[0],b=structuredClone(a);assertCentralProtected(a,b);b.guards[0]!.pace=(b.guards[0]!.pace??1)+1;assert.throws(()=>assertCentralProtected(a,b));});

const before:StageDefinition[]=JSON.parse(readFileSync(new URL('./fixtures/museumCentralBefore.json',import.meta.url),'utf8'));
for(const def of (historicalJSON as StageDefinition[]).filter(d=>d.chapter===1)){
 test(`${def.id} historical authored gap zero, island bypasses, protected fields and real120sec patrol`,()=>{
  assertCentralProtected(before.find(d=>d.id===def.id)!,def);
  // Archived V3 geometry was certified with150 speed × .06s =9 margin per side.
  const audit=auditCentralCover(def,undefined,36);assert.equal(audit.gaps.length,0);assert(audit.routeClearance.every(r=>r.bodyClear));
  assert(auditIslandBypasses(def,9).every(b=>b.localTwoSideWitness!==null));
  assert(auditCentralPatrol(def).every(g=>g.pass));
 });
}
// Dynamic CCTV replays now live in museumRuntimeCctvQA.test.ts and load current campaignStages.
