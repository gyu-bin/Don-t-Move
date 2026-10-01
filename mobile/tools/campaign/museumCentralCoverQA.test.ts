import test from 'node:test';
import assert from 'node:assert/strict';
import {narrowGap,MIN_COMFORT_GAP,assertCentralProtected,auditCentralCover,auditIslandBypasses,auditCentralPatrol,probeCentralHideRoutes} from './museumCentralCoverQA';
import historicalJSON from './fixtures/v3MuseumGalleryBefore.json';
import v3FinalJSON from './fixtures/v3MuseumGalleryFinal.json';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {readFileSync} from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {runMission} from './museumFinalPlayQA';
const a={id:'a',l:0,t:0,r:40,b:40};
test('gap threshold uses actual18 diameter and9+9 smoothing travel margin',()=>{assert.equal(MIN_COMFORT_GAP,36);assert.equal(narrowGap(a,{id:'b',l:75,t:0,r:115,b:40})[0].width,35);assert.equal(narrowGap(a,{id:'b',l:76,t:0,r:116,b:40}).length,0);});
test('closed/overlap/corner-only boxes are not fake openings',()=>{assert.equal(narrowGap(a,{id:'b',l:40,t:0,r:80,b:40}).length,0);assert.equal(narrowGap(a,{id:'b',l:30,t:0,r:70,b:40}).length,0);assert.equal(narrowGap(a,{id:'b',l:50,t:40,r:90,b:80}).length,0);});
test('axis symmetric and thin visible slots retained',()=>{assert.equal(narrowGap(a,{id:'b',l:0,t:50,r:40,b:90})[0].axis,'y');assert.equal(narrowGap(a,{id:'b',l:43,t:0,r:83,b:40})[0].width,3);});
test('protected objective and guard tuning cannot silently change',()=>{const a=campaignStages[0],b=structuredClone(a);assertCentralProtected(a,b);b.guards[0]!.pace=(b.guards[0]!.pace??1)+1;assert.throws(()=>assertCentralProtected(a,b));});

const before:StageDefinition[]=JSON.parse(readFileSync(new URL('./fixtures/museumCentralBefore.json',import.meta.url),'utf8'));
for(const def of (historicalJSON as StageDefinition[]).filter(d=>d.chapter===1)){
 test(`${def.id} historical authored gap zero, island bypasses, protected fields and real120sec patrol`,()=>{
  assertCentralProtected(before.find(d=>d.id===def.id)!,def);
  const audit=auditCentralCover(def);assert.equal(audit.gaps.length,0);assert(audit.routeClearance.every(r=>r.bodyClear));
  assert(auditIslandBypasses(def).every(b=>b.localTwoSideWitness!==null));
  assert(auditCentralPatrol(def).every(g=>g.pass));
 });
}
for(const {id,...input} of [{id:'01-05',route:0,escape:0,mode:1,delay:0},{id:'01-08',route:0,escape:1,mode:1,delay:.5},{id:'01-10',route:1,escape:0,mode:1,delay:3}])test(`${id} historical prior winning continuous replay still completes`,()=>{
 const a=runMission(before.find(d=>d.id===id)!,input),b=runMission((historicalJSON as StageDefinition[]).find(d=>d.id===id)!,input);assert(a.clear,'baseline must complete');assert(b.clear,'after must complete');assert(!b.caught);
});

for(const scenario of [
 {id:'01-05',structure:11,point:{x:8.85,y:5.865},approach:{x:8.85,y:8.515},delay:1,gait:3,pocketChoice:0},
 {id:'01-08',structure:0,point:{x:7.875,y:10.525},approach:{x:11.125,y:10.525},delay:0,gait:3,pocketChoice:0},
 {id:'01-09',structure:0,point:{x:2.28,y:9.55},approach:{x:5.03,y:9.55},delay:3,gait:3,pocketChoice:0},
])test(`${scenario.id} historical V3 natural spotted→central ray occlusion→fresh Search continuous regression`,()=>{
 const result=probeCentralHideRoutes((v3FinalJSON as StageDefinition[]).find(d=>d.id===scenario.id)!,false,scenario);
 assert.equal(result.attempts.length,1);const w=result.witness;assert(w);assert(w.pass&&!w.caught&&!w.invalidPath);
 assert(w.spottedAt!==null&&w.causalLineAt!==null&&w.searchAfterCoverAt!==null);assert(w.spottedAt<=w.causalLineAt&&w.causalLineAt<=w.searchAfterCoverAt);
 assert(w.transitions.some(t=>t.from==='PLAYER_SPOTTED'&&t.to==='SEARCH'&&Math.abs(t.time-w.searchAfterCoverAt!)<.01));
});
