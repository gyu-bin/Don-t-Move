import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {CHAPTER_MISSION_COUNTS,MISSION_COUNT,missionId,missionIndex} from '../../src/game/levels/campaignCatalog';
import {freshCampaign,completeMission,canPlayMission,normalizeCampaign} from '../../src/game/progress/campaignProgress';
import {canonical,sha256} from './v13QaLib';
import {expectedStageHash} from './v13LateReviewed';
import baseline from '../../docs/design/chapter1-expansion/EXISTING_MISSION_HASHES.json';
import {exposureRun} from './cameraExposure';
import {extraDetectionsForMastery} from '../../src/game/progress/chapterOneMastery';

test('Museum expansion adds five missions while preserving all 45 existing definitions exactly',()=>{
 assert.equal(Object.keys(baseline).length,45);
 assert.equal(campaignStages.length,55);
 for(const [id,hash] of Object.entries(baseline)){
  const stage=campaignStages.find(s=>s.id===id);assert.ok(stage,`${id} preserved`);
  assert.equal(sha256(canonical(stage)),expectedStageHash(id,hash),`${id} must not change during the extension`);
 }
 const added=campaignStages.filter(s=>s.chapter===1&&!(s.id in baseline));
 assert.deepEqual(added.map(s=>s.id),['01-06','01-07','01-08','01-09','01-10']);
 assert.equal(new Set(campaignStages.map(s=>s.number)).size,55,'legacy definition numbers stay unique');
});

test('Fresh progression covers all ten Museum missions before unlocking the Gallery',()=>{
 let save=freshCampaign();
 assert.equal(CHAPTER_MISSION_COUNTS[0],10);assert.equal(MISSION_COUNT,55);
 for(let index=0;index<10;index++){
  assert.equal(save.lastMission,missionId(index));
  assert.ok(canPlayMission(save,index,false));
  assert.equal(canPlayMission(save,missionIndex('02-01'),false),false);
  save=normalizeCampaign(JSON.parse(JSON.stringify(completeMission(save,index,40+index,1,0))));
 }
 assert.equal(save.lastMission,'02-01');
 assert.ok(canPlayMission(save,missionIndex('02-01'),false));
 assert.deepEqual(Object.keys(save.records),Array.from({length:10},(_,i)=>missionId(i)));
});

for(const [id,delay] of [['01-06',8],['01-07',10],['01-08',6],['01-09',1.5],['01-10',2]] as const){
 test(`${id}: the baked mission with final cover inspections offers a clean badge run`,()=>{
  const stage=campaignStages.find(s=>s.id===id)!;
  let evidence:number|undefined;
  const run=exposureRun(stage,0,0,2,delay,state=>{evidence=extraDetectionsForMastery(state.events);});
  assert.ok(run.clear&&!run.caught,`${id} continuous full heist`);
  assert.equal(evidence,0,`${id} clean badge is achievable with the actual baked guards/CCTV`);
 });
}
