import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {CHAPTER_MISSION_COUNTS,MISSION_COUNT,missionId,missionIndex,missionName} from '../../src/game/levels/campaignCatalog';
import {freshCampaign,completeMission,canPlayMission,normalizeCampaign} from '../../src/game/progress/campaignProgress';
import {canonical,sha256} from './v13QaLib';
import baseline from '../../docs/design/chapter2-expansion/EXISTING_MISSION_HASHES.json';
import reviewedRebuilds from '../../docs/design/museum-diversity/REVIEWED_REBUILT_STAGE_HASHES.json';
import {chapterRoute} from '../../src/ui/menu/missionRoute';
import {resultActions} from '../../src/ui/resultNavigation';
import {MISSION_BRIEFS} from '../../src/game/levels/missionBriefs';

test('Gallery and original missions remain exact except the five explicitly reviewed Museum architecture replacements',()=>{
 assert.equal(Object.keys(baseline).length,50);assert.equal(campaignStages.length,55);
 for(const [id,hash] of Object.entries(baseline)){
  const stage=campaignStages.find(s=>s.id===id);assert.ok(stage,`${id} preserved`);
  const review=reviewedRebuilds[id as keyof typeof reviewedRebuilds];
  if(review){
   assert.equal(review.firstExpansionHash,hash,`${id}: recorded first-expansion baseline`);
   assert.equal(review.revision,2);
   assert.equal(sha256(canonical(stage)),review.afterHash,`${id}: only the reviewed architecture replacement is permitted`);
  }else assert.equal(sha256(canonical(stage)),hash,`${id}: existing definition changed`);
 }
 assert.deepEqual(campaignStages.filter(s=>!(s.id in baseline)).map(s=>s.id),['02-06','02-07','02-08','02-09','02-10']);
 assert.equal(new Set(campaignStages.map(s=>s.number)).size,55);
 assert.equal(MISSION_COUNT,55);assert.deepEqual(CHAPTER_MISSION_COUNTS,[10,10,5,5,5,5,5,5,5]);
});

test('Fresh save and UI offer all ten Gallery missions before Bank, with valid bilingual names and security briefs',()=>{
 let save=freshCampaign();
 for(let i=0;i<20;i++){
  const id=missionId(i);assert.equal(save.lastMission,id);
  assert(canPlayMission(save,i,false));assert(!canPlayMission(save,missionIndex('03-01'),false));
  const stage=campaignStages[i];assert.equal(stage.id,id);
  assert.equal(MISSION_BRIEFS[id].guards,stage.guards.length);
  assert(missionName(i,'en').trim().length>0);assert(missionName(i,'ko').trim().length>0);
  if(i>=10){
   const route=chapterRoute(save,1,false);assert.equal(route.total,10);assert.equal(route.current,i);
   assert.equal(route.missions.at(-1)?.id,'02-10');
  }
  save=normalizeCampaign(JSON.parse(JSON.stringify(completeMission(save,i,40+i,0,0))));
  const actions=resultActions({index:i,missionCount:MISSION_COUNT,chapterFinal:i===9||i===19,nextPlayable:canPlayMission(save,i+1,false)});
  assert.equal(actions.primary,i===9||i===19?'nextChapter':'nextStage');
 }
 assert.equal(save.lastMission,'03-01');assert.equal(save.highestUnlocked,20);
 assert.equal(Object.keys(save.records).length,20);assert(canPlayMission(save,20,false));
});

test('New Gallery arrivals allow ten seconds to read the room without automatic capture or alarm',async()=>{
 const {compileStage,TILE}=await import('../../src/game/world/compileStage');
 const {buildNavigation}=await import('../../src/game/world/navigation');
 const {BODY}=await import('../../src/game/guards/guardTuning');
 const {createPlaygroundState,stepPlayground}=await import('../../src/game/playground/playgroundState');
 const {extraDetectionsForMastery}=await import('../../src/game/progress/chapterOneMastery');
 for(const def of campaignStages.filter(s=>s.chapter===2&&s.mission!>5)){
  const stage=compileStage(def),state=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius);
  state.playerMode=0;
  for(let frame=0;frame<600;frame++)stepPlayground(state,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  assert.equal(state.events.caught,false,`${def.id}: immediate spawn capture`);
  assert.equal(extraDetectionsForMastery(state.events),0,`${def.id}: alarm before the player starts`);
  assert.equal(state.theft.empty,false,`${def.id}: objective remains intact`);
 }
});
