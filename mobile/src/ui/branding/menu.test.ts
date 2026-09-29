import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,statSync} from 'node:fs';
import {canSelectStage,clearStage,DEFAULT_PROGRESS,normalizeProgress} from '../../game/progress/stageProgress';
import {formatTime,stageCardState} from '../menu/stageCard';
import {translations,stageKey} from '../menu/strings';

test('Existing progress, records and sound-off migrate without resetting; preferences round-trip independently',()=>{
 const old={currentStage:2,highestUnlocked:3,clearedStages:[0,1,2],bestTimes:{0:42.31},bestAlerts:{0:1},soundEnabled:false};
 const migrated=normalizeProgress(old);
 assert.deepEqual(migrated.clearedStages,old.clearedStages);
 assert.equal(migrated.bestTimes[0],42.31);assert.equal(migrated.highestUnlocked,3);
 assert.equal(migrated.hasStarted,true);assert.equal(migrated.musicEnabled,false);
 for(const language of ['ko','en'] as const)for(const soundEnabled of [true,false])for(const musicEnabled of [true,false]){
  const next={...migrated,language,soundEnabled,musicEnabled};
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(next))),next);
 }
 assert.equal(normalizeProgress({musicEnabled:'invalid'}).musicEnabled,true);
});
test('Legacy ten-stage archive retains clear/current/locked state and highest unlock for migration',()=>{
 let p={...DEFAULT_PROGRESS};
 for(let i=0;i<10;i++){
  for(let j=0;j<10;j++){
   const state=stageCardState(p,j);
   assert.equal(state.unlocked,j<=i);assert.equal(state.current,j===i);
   assert.equal(state.cleared,j<i);assert.equal(canSelectStage(p,j),state.unlocked);
  }
  p=clearStage(p,i,60-i,i);
 }
 p={...p,currentStage:0};
 assert.equal(p.highestUnlocked,9);assert.equal(p.hasStarted,true);
 assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(p))),p);
 assert.equal(canSelectStage(p,10),false);assert.equal(canSelectStage(p,-1),false);
});
test('KO/EN keys cover every stage and menu/result action',()=>{
 assert.deepEqual(Object.keys(translations.ko).sort(),Object.keys(translations.en).sort());
 for(let i=0;i<10;i++){assert(translations.en[stageKey(i)]);assert(translations.ko[stageKey(i)]);}
 assert.equal(formatTime(42.31),'00:42.31');assert.equal(formatTime(59.999),'01:00.00');
});
test('Ten distinct optimized thumbnails exist; no eager image preload in HOME',()=>{
 const hashes=new Set<string>();
 for(let i=1;i<=10;i++){
  const path=`assets/branding/stages/${String(i).padStart(2,'0')}.jpg`;
  assert(statSync(path).size<150000);hashes.add(readFileSync(path).toString('base64'));
 }
 assert.equal(hashes.size,10);
 const root=readFileSync('src/ui/branding/StartupScreen.tsx','utf8');
 assert(!root.includes('Image.prefetch'));assert(root.includes("route==='settings'"));
 assert(root.includes('missionIndex(campaign.lastMission)'));assert(root.includes('onProgressChange={updateProgress}'));
 const game=readFileSync('src/ui/VisualPlaygroundScreen.tsx','utf8');
 assert(game.match(/onPress={home}/g)!.length>=3);
 assert(game.includes('onFinished={menuHome}'), 'automatic intro completion navigates without a button SFX');
});
