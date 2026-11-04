import assert from 'node:assert/strict';
import {test} from 'node:test';
import {completeMission,freshCampaign,normalizeCampaign} from './campaignProgress';
import type {MissionRecord} from './campaignProgress';
import {chapterOneMastery,newChapterOneBadges,recordChapterOneMastery} from './chapterOneMastery';
import {isCurrentMissionBenchmark,missionBenchmarkRevision,normalizeMissionBenchmark} from './missionRevision';
import {missionIndex} from '../levels/campaignCatalog';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DEFAULT_PROGRESS,loadProgress,saveProgress} from './stageProgress';

const revised=['01-06','01-07','01-08'];
const roundTrip=(value:unknown)=>normalizeCampaign(JSON.parse(JSON.stringify(value)));

test('only the three rebuilt Museum maps gain benchmark revision metadata',()=>{
 for(const id of revised)assert.equal(missionBenchmarkRevision(id),2);
 for(const id of ['01-01','01-05','01-09','01-10','02-06','03-01','bad','__proto__','constructor','toString']){
  const record={cleared:true,bestTime:30,alerts:0};
  assert.equal(missionBenchmarkRevision(id),undefined);
  assert.equal(normalizeMissionBenchmark(id,record),record);
 }
});

for(const id of revised)test(`${id}: existing progress and earned badges survive while previous layout metrics are archived once`,()=>{
 const old={cleared:true,bestTime:30,alerts:0,mastery:{cleanEscape:true as const,personalBest:true as const}};
 const input={...freshCampaign(),lastMission:id,highestUnlocked:54,records:{[id]:old}};
 const result=roundTrip(input),record=result.records[id];
 assert.deepEqual(record,{cleared:true,mastery:old.mastery,benchmarkRevision:2,previousBenchmark:{revision:1,bestTime:30,alerts:0}});
 assert.equal(result.highestUnlocked,54);assert.equal(result.lastMission,id);assert.equal(result.version,7);
 assert.deepEqual(chapterOneMastery(id,record).earned,['firstEscape','cleanEscape','personalBest']);
 assert.deepEqual(roundTrip(result),result);
 assert.deepEqual(input.records[id],old,'normalization does not mutate the previous save');
});

test('first clear on revised geometry establishes a benchmark without granting an unearned personal best',()=>{
 for(const id of revised){
  const before={...freshCampaign(),records:{[id]:{cleared:true,bestTime:90,alerts:0,mastery:{cleanEscape:true as const}}}};
  const first=completeMission(before,missionIndex(id),40,2,1),record=first.records[id];
  assert.equal(record.bestTime,40);assert.equal(record.alerts,2);assert.equal(record.benchmarkRevision,2);
  assert.deepEqual(record.previousBenchmark,{revision:1,bestTime:90,alerts:0});
  assert.deepEqual(record.mastery,{cleanEscape:true});
  assert.deepEqual(newChapterOneBadges(id,before.records[id],record),[]);
  assert.deepEqual(roundTrip(first),first);
  const faster=completeMission(first,missionIndex(id),39,1,0);
  assert.equal(faster.records[id].bestTime,39);
  assert.deepEqual(faster.records[id].mastery,{cleanEscape:true,personalBest:true});
  assert.deepEqual(newChapterOneBadges(id,record,faster.records[id]),['personalBest']);
  assert.deepEqual(faster.records[id].previousBenchmark,record.previousBenchmark);
 }
});

test('pure mastery comparison rejects an old or mismatched benchmark without revoking earned flags',()=>{
 const old:MissionRecord={cleared:true,bestTime:90,mastery:{cleanEscape:true}};
 assert.equal(isCurrentMissionBenchmark('01-06',old),false);
 assert.deepEqual(recordChapterOneMastery('01-06',old,40,1),{cleanEscape:true});
 assert.deepEqual(recordChapterOneMastery('01-06',{...old,benchmarkRevision:3},40,1),{cleanEscape:true});
 assert.deepEqual(recordChapterOneMastery('01-06',{...old,benchmarkRevision:2},40,1),{cleanEscape:true,personalBest:true});
});

test('malformed and future revisions never turn old times into a comparable benchmark',()=>{
 for(const marker of [undefined,null,'2',0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,3]){
  const before={...freshCampaign(),records:{'01-06':{cleared:true,bestTime:90,alerts:1,benchmarkRevision:marker}}};
  const normalized=roundTrip(before),record=normalized.records['01-06'];
  assert.equal(record.bestTime,undefined);assert.equal(record.alerts,undefined);assert.equal(record.benchmarkRevision,2);
  assert.equal(record.previousBenchmark?.bestTime,90);
  assert.equal(record.previousBenchmark?.revision,marker===3?3:1);
  assert.deepEqual(roundTrip(normalized),normalized);
  const first=completeMission(normalized,5,40,1,1);
  assert.equal(first.records['01-06'].mastery?.personalBest,undefined);
 }
});

test('existing recovery archive is retained and malformed archive fields are stripped',()=>{
 const existing={revision:1,bestTime:31,alerts:0};
 const result=roundTrip({...freshCampaign(),records:{'01-07':{cleared:true,bestTime:90,benchmarkRevision:3,previousBenchmark:{...existing,injected:true}}}});
 assert.deepEqual(result.records['01-07'].previousBenchmark,existing);
 assert.equal(result.records['01-07'].bestTime,undefined);
 for(const archive of [null,[],{revision:'1',bestTime:30},{revision:-1,bestTime:30},{revision:1,bestTime:0,alerts:-1}]){
  const record=roundTrip({...freshCampaign(),records:{'01-08':{cleared:true,benchmarkRevision:2,bestTime:20,previousBenchmark:archive}}}).records['01-08'];
  assert.equal(record.previousBenchmark,undefined);assert.equal(record.bestTime,20);
 }
});

test('unaffected missions retain their exact save record shapes and old comparison behavior',()=>{
 for(const id of ['01-01','01-05','01-09','01-10','02-06','09-05']){
  const old:MissionRecord={cleared:true,bestTime:90,alerts:0,...(id.startsWith('01-')?{mastery:{cleanEscape:true as const}}:{})};
  const source={...freshCampaign(),highestUnlocked:54,records:{[id]:old}};
  assert.deepEqual(roundTrip(source).records[id],old);
  const next=completeMission(source,missionIndex(id),40,1,1).records[id];
  assert.equal(next.bestTime,40);assert.equal(next.alerts,0);
  assert.equal(next.benchmarkRevision,undefined);assert.equal(next.previousBenchmark,undefined);
  if(id.startsWith('01-'))assert.equal(next.mastery?.personalBest,true);
 }
});

test('version 6 records enter revised benchmarks without redoing catalog migration or losing older archives',()=>{
 const legacyArchive={sourceVersion:4,original:{record:'preserve'},expandedV4HighestUnlocked:35};
 const source={version:6,lastMission:'01-08',highestUnlocked:15,legacyArchive,records:{'01-08':{cleared:true,bestTime:70,alerts:2,mastery:{personalBest:true}}}};
 const result=roundTrip(source);
 assert.equal(result.highestUnlocked,20);assert.deepEqual(result.legacyArchive,legacyArchive);
 assert.equal(result.records['01-08'].mastery?.personalBest,true);
 assert.deepEqual(result.records['01-08'].previousBenchmark,{revision:1,bestTime:70,alerts:2});
 assert.deepEqual(roundTrip(result),result);
});

test('new revised clears tag their own benchmark and invalid times do not fabricate comparison data',()=>{
 const first=completeMission(freshCampaign(),5,40,1,1);
 assert.deepEqual(first.records['01-06'],{cleared:true,benchmarkRevision:2,bestTime:40,alerts:1});
 assert.deepEqual(roundTrip(first),first);
 const invalid=completeMission(freshCampaign(),6,NaN,-1,1).records['01-07'];
 assert.deepEqual(invalid,{cleared:true,benchmarkRevision:2});
});

test('actual storage pipeline preserves revised-map achievements and archive across upgrade, clear and restart',async()=>{
 const saved=new Map<string,string>(),get=AsyncStorage.getItem,set=AsyncStorage.setItem;
 AsyncStorage.getItem=async key=>saved.get(key)??null;
 AsyncStorage.setItem=async(key,value)=>{saved.set(key,value);};
 try{
  const campaign={...freshCampaign(),highestUnlocked:30,lastMission:'01-06',records:{'01-06':{cleared:true,bestTime:90,alerts:0,mastery:{cleanEscape:true as const,personalBest:true as const}}}};
  await saveProgress({...DEFAULT_PROGRESS,hasStarted:true,language:'ko',soundEnabled:false,campaign});
  const first=await loadProgress(true),record=first.campaign!.records['01-06'];
  assert.equal(first.campaign!.highestUnlocked,30);assert.equal(first.campaign!.lastMission,'01-06');
  assert.equal(first.language,'ko');assert.equal(first.soundEnabled,false);
  assert.equal(record.bestTime,undefined);assert.deepEqual(record.previousBenchmark,{revision:1,bestTime:90,alerts:0});
  assert.deepEqual(chapterOneMastery('01-06',record).earned,['firstEscape','cleanEscape','personalBest']);
  const cleared=completeMission(first.campaign!,5,50,2,1);
  await saveProgress({...first,campaign:cleared});
  const restarted=await loadProgress(true);
  assert.deepEqual(restarted.campaign,cleared);
  assert.equal(restarted.campaign!.records['01-06'].bestTime,50);
  assert.deepEqual(restarted.campaign!.records['01-06'].previousBenchmark,record.previousBenchmark);
  assert.deepEqual(newChapterOneBadges('01-06',record,restarted.campaign!.records['01-06']),[]);
 }finally{AsyncStorage.getItem=get;AsyncStorage.setItem=set;}
});
