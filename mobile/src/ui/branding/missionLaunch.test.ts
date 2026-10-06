import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MISSION_COUNT,missionIndex} from '../../game/levels/campaignCatalog';
import {freshCampaign,migrateCampaign} from '../../game/progress/campaignProgress';
import {resolveInitialMissionIndex} from './missionLaunch';

const progress=()=>({
 currentStage:0,highestUnlocked:0,clearedStages:[],bestTimes:{},bestAlerts:{},
 campaign:{...freshCampaign(),highestUnlocked:missionIndex('04-01'),lastMission:'04-05'},
});

test('dev launch retains selected 04-05 after save normalization clamps to 04-01',()=>{
 const saved=progress(),before=structuredClone(saved);
 assert.equal(migrateCampaign(saved).lastMission,'04-01');
 assert.equal(resolveInitialMissionIndex(saved,missionIndex('04-05'),true),missionIndex('04-05'));
 assert.deepEqual(saved,before,'launch must not alter save or unlock missions');
});

test('release launch rejects locked selections and accepts unlocked replay selections',()=>{
 assert.equal(resolveInitialMissionIndex(progress(),missionIndex('04-05'),false),missionIndex('04-01'));
 assert.equal(resolveInitialMissionIndex(progress(),missionIndex('03-02'),false),missionIndex('03-02'));
});

test('missing and invalid launch selections fall back to normalized progress',()=>{
 for(const selected of [undefined,-1,0.5,NaN,Infinity,MISSION_COUNT]){
  assert.equal(resolveInitialMissionIndex(progress(),selected,true),missionIndex('04-01'));
 }
});
