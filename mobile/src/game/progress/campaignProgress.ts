import {MISSION_COUNT,missionId,missionIndex} from '../levels/campaignCatalog';
import {isChapterOneMission,normalizeChapterOneMastery,recordChapterOneMastery} from './chapterOneMastery';
import type {ChapterOneMasteryRecord} from './chapterOneMastery';
import {isCurrentMissionBenchmark,missionBenchmarkRevision,normalizeMissionBenchmark} from './missionRevision';
import type {PreviousMissionBenchmark} from './missionRevision';
export interface MissionRecord {cleared:boolean;bestTime?:number;alerts?:number;legacy?:boolean;mastery?:ChapterOneMasteryRecord;benchmarkRevision?:number;previousBenchmark?:PreviousMissionBenchmark;}
/** Original save survives compression, including removed IDs and non-comparable benchmarks. */
export interface LegacyCampaignArchive {sourceVersion:number;original:Record<string,unknown>;expandedV4HighestUnlocked:number;}
export interface CampaignProgress {version:7;lastMission:string;highestUnlocked:number;records:Record<string,MissionRecord>;legacyArchive?:LegacyCampaignArchive;}
export const freshCampaign=():CampaignProgress=>({version:7,lastMission:'01-01',highestUnlocked:0,records:{}});
const OLD_COUNTS=[10,10,10,5,5,5,5,5,5];
const EARLY_DESTINATIONS=[
 ['01-01','01-02','01-03','01-04','01-05','01-03','01-02','01-04','01-05','01-05'],
 ['02-01','02-02','02-01','02-03','02-02','02-04','02-03','02-05','02-05','02-05'],
 ['03-01','03-01','03-02','03-02','03-03','03-04','03-05','03-04','03-05','03-05'],
];
const clamp=(n:unknown,max=MISSION_COUNT-1)=>typeof n==='number'&&Number.isFinite(n)?Math.min(max,Math.max(0,Math.floor(n))):0;
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
function oldMissionIndex(id:string){
 const match=/^(0[1-9])-(\d{2})$/.exec(id);if(!match)return -1;
 const chapter=Number(match[1])-1,mission=Number(match[2])-1;
 return mission>=0&&mission<OLD_COUNTS[chapter]?OLD_COUNTS.slice(0,chapter).reduce((sum,count)=>sum+count,0)+mission:-1;
}
function oldMissionId(index:number){
 let chapter=0;while(chapter<OLD_COUNTS.length&&index>=OLD_COUNTS[chapter])index-=OLD_COUNTS[chapter++];
 return chapter<OLD_COUNTS.length?`${String(chapter+1).padStart(2,'0')}-${String(index+1).padStart(2,'0')}`:'';
}
export function migratedMissionId(id:string):string {
 if(oldMissionIndex(id)<0)return '';
 const chapter=Number(id.slice(0,2))-1,mission=Number(id.slice(3))-1;
 return chapter<3?EARLY_DESTINATIONS[chapter][mission]:id;
}
function recordFrom(value:unknown,allowMastery=false,id?:string):MissionRecord|null {
 if(value===null||typeof value!=='object'||Array.isArray(value))return null;
 const row=object(value),record:MissionRecord={cleared:row.cleared===true};
 if(typeof row.bestTime==='number'&&Number.isFinite(row.bestTime)&&row.bestTime>0)record.bestTime=row.bestTime;
 if(typeof row.alerts==='number'&&Number.isInteger(row.alerts)&&row.alerts>=0)record.alerts=row.alerts;
 if(row.legacy===true)record.legacy=true;
 const mastery=allowMastery&&record.cleared&&!record.legacy?normalizeChapterOneMastery(row.mastery):undefined;
 if(mastery)record.mastery=mastery;
 return id?normalizeMissionBenchmark(id,record,row):record;
}
function earnedIndex(records:Record<string,MissionRecord>){
 return Math.max(0,...Object.keys(records).filter(id=>records[id].cleared).map(id=>Math.min(MISSION_COUNT-1,missionIndex(id)+1)));
}
function normalizeCurrent(row:Record<string,unknown>):CampaignProgress {
 const records:Record<string,MissionRecord>={};
 for(const [id,value] of Object.entries(object(row.records))){
  const record=recordFrom(value,isChapterOneMission(id),id);if(missionIndex(id)>=0&&record)records[id]=record;
 }
 const highestUnlocked=Math.max(clamp(row.highestUnlocked),earnedIndex(records));
 const lastIndex=typeof row.lastMission==='string'?missionIndex(row.lastMission):-1;
 const archive=object(row.legacyArchive);
 return {version:7,lastMission:lastIndex>=0&&lastIndex<=highestUnlocked?row.lastMission as string:missionId(highestUnlocked),highestUnlocked,records,
  ...(typeof archive.sourceVersion==='number'&&archive.original&&typeof archive.original==='object'&&typeof archive.expandedV4HighestUnlocked==='number'?{legacyArchive:archive as unknown as LegacyCampaignArchive}:{})};
}
// Version 5 used nine five-mission chapters. Stable IDs survive both chapter extensions;
// ordinal unlocks must be translated exactly once, before the save is marked version 7.
function v5MissionIndex(id:string) {
 const match=/^(0[1-9])-(0[1-5])$/.exec(id);
 return match?(Number(match[1])-1)*5+Number(match[2])-1:-1;
}
function v5MissionId(index:number) {
 return `0${Math.floor(index/5)+1}-0${index%5+1}`;
}
function v5UnlockInCurrent(index:number) { return missionIndex(v5MissionId(clamp(index,44))); }
function earnedV5Index(records:Record<string,MissionRecord>) {
 const index=Math.max(0,...Object.keys(records).filter(id=>records[id].cleared)
  .map(id=>Math.min(44,v5MissionIndex(id)+1)));
 return v5UnlockInCurrent(index);
}
function normalizeV5(row:Record<string,unknown>):CampaignProgress {
 const records:Record<string,MissionRecord>={};
 for(const [id,value] of Object.entries(object(row.records))){
  if(v5MissionIndex(id)<0)continue; // New Museum/Gallery slots never existed in a v5 save.
  const record=recordFrom(value,isChapterOneMission(id),id);if(record)records[id]=record;
 }
 const highestUnlocked=Math.max(v5UnlockInCurrent(clamp(row.highestUnlocked,44)),earnedV5Index(records));
 const lastIndex=typeof row.lastMission==='string'&&v5MissionIndex(row.lastMission)>=0?missionIndex(row.lastMission):-1;
 const archive=object(row.legacyArchive);
 return {version:7,lastMission:lastIndex>=0&&lastIndex<=highestUnlocked?row.lastMission as string:missionId(highestUnlocked),highestUnlocked,records,
  ...(typeof archive.sourceVersion==='number'&&archive.original&&typeof archive.original==='object'&&typeof archive.expandedV4HighestUnlocked==='number'?{legacyArchive:archive as unknown as LegacyCampaignArchive}:{})};
}
// Version 6 expanded only Museum. Gallery's new slots must not reinterpret later
// ordinal unlocks, and forged records for those previously nonexistent slots are ignored.
const V6_COUNTS=[10,5,5,5,5,5,5,5,5];
function v6MissionIndex(id:string) {
 const match=/^(0[1-9])-(\d{2})$/.exec(id);if(!match)return -1;
 const chapter=Number(match[1])-1,mission=Number(match[2])-1;
 return mission>=0&&mission<V6_COUNTS[chapter]?V6_COUNTS.slice(0,chapter).reduce((sum,count)=>sum+count,0)+mission:-1;
}
function v6MissionId(index:number) {
 let chapter=0;while(index>=V6_COUNTS[chapter])index-=V6_COUNTS[chapter++];
 return `${String(chapter+1).padStart(2,'0')}-${String(index+1).padStart(2,'0')}`;
}
function normalizeV6(row:Record<string,unknown>):CampaignProgress {
 const records:Record<string,MissionRecord>={};
 for(const [id,value] of Object.entries(object(row.records))){
  if(v6MissionIndex(id)<0)continue;
  const record=recordFrom(value,isChapterOneMission(id),id);if(record)records[id]=record;
 }
 const earned=Math.max(0,...Object.keys(records).filter(id=>records[id].cleared).map(id=>Math.min(49,v6MissionIndex(id)+1)));
 const highestUnlocked=missionIndex(v6MissionId(Math.max(clamp(row.highestUnlocked,49),earned)));
 const lastIndex=typeof row.lastMission==='string'&&v6MissionIndex(row.lastMission)>=0?missionIndex(row.lastMission):-1;
 const archive=object(row.legacyArchive);
 return {version:7,lastMission:lastIndex>=0&&lastIndex<=highestUnlocked?row.lastMission as string:missionId(highestUnlocked),highestUnlocked,records,
  ...(typeof archive.sourceVersion==='number'&&archive.original&&typeof archive.original==='object'&&typeof archive.expandedV4HighestUnlocked==='number'?{legacyArchive:archive as unknown as LegacyCampaignArchive}:{})};
}
export function normalizeCampaign(input:unknown):CampaignProgress {
 if(!input||typeof input!=='object'||Array.isArray(input))return freshCampaign();
 const row=object(input);
 if(row.version===7)return normalizeCurrent(row);
 if(row.version===6)return normalizeV6(row);
 if(row.version===5)return normalizeV5(row);
 // A future save must never be reinterpreted as a pre-compression ordinal/ID set.
 if(typeof row.version==='number'&&Number.isInteger(row.version)&&row.version>7){
  return {...normalizeCurrent(row),legacyArchive:{sourceVersion:row.version,original:{...row},expandedV4HighestUnlocked:clamp(row.highestUnlocked)}};
 }
 const version=typeof row.version==='number'&&Number.isInteger(row.version)&&row.version>=1&&row.version<=4?row.version:4;
 // Historical insertions are resolved in the OLD 60-mission catalog before compression.
 let unlocked=typeof row.highestUnlocked==='number'&&Number.isFinite(row.highestUnlocked)?Math.max(0,Math.floor(row.highestUnlocked)):0;
 if(version===1&&unlocked>=5)unlocked+=5;
 if((version===1||version===2)&&unlocked>=15)unlocked+=5;
 if((version===1||version===2||version===3)&&unlocked>=25)unlocked+=5;
 unlocked=clamp(unlocked,59);
 const records:Record<string,MissionRecord>={};
 for(const [id,value] of Object.entries(object(row.records))){
  const destination=migratedMissionId(id),record=recordFrom(value);
  if(!destination||!record)continue;
  if(Number(id.slice(0,2))<=3){
   // Merged/rebuilt maps inherit entitlement only; old performance remains in archive.
   if(record.cleared)records[destination]={cleared:true,legacy:true};
  }else records[destination]=normalizeMissionBenchmark(destination,record);
 }
 let mappedUnlocked=0;
 for(let index=0;index<=unlocked;index++)mappedUnlocked=Math.max(mappedUnlocked,missionIndex(migratedMissionId(oldMissionId(index))));
 const highestUnlocked=Math.max(mappedUnlocked,earnedV5Index(records));
 const mappedLast=typeof row.lastMission==='string'?migratedMissionId(row.lastMission):'';
 const lastIndex=missionIndex(mappedLast);
 return {version:7,lastMission:lastIndex>=0&&lastIndex<=highestUnlocked?mappedLast:missionId(highestUnlocked),highestUnlocked,records,
  legacyArchive:{sourceVersion:version,original:{...row},expandedV4HighestUnlocked:unlocked}};
}
/** Old ten-stage fields remain untouched on StageProgress as an archive. */
export function migrateCampaign(old:{currentStage:number;highestUnlocked:number;clearedStages:number[];bestTimes:Record<string,number>;bestAlerts:Record<string,number>;campaign?:unknown}):CampaignProgress {
 if(old.campaign)return normalizeCampaign(old.campaign);
 const mapping=['01-01','02-01','03-01','04-01','05-01','06-01','07-01','08-01','08-05','09-01'];
 const records:Record<string,MissionRecord>={};
 for(const i of old.clearedStages){
  const id=mapping[i];if(!id)continue;
  records[id]={cleared:true,legacy:true,bestTime:old.bestTimes[i],alerts:old.bestAlerts[i]};
 }
 const lastMission=mapping[old.currentStage]??'01-01';
 const highestUnlocked=oldMissionIndex(mapping[old.highestUnlocked]??'01-01');
 return normalizeCampaign({version:4,lastMission,highestUnlocked,records});
}
export function canPlayMission(progress:CampaignProgress,index:number,testBuild:boolean) {
 return Number.isInteger(index)&&index>=0&&index<MISSION_COUNT&&(testBuild||index<=progress.highestUnlocked||progress.records[missionId(index)]?.cleared===true);
}
export function completeMission(progress:CampaignProgress,index:number,seconds:number,alerts:number,extraDetections?:number):CampaignProgress {
 if(index<0||index>=MISSION_COUNT||!Number.isInteger(index))return progress;
 const id=missionId(index),saved=progress.records[id],previous=saved?normalizeMissionBenchmark(id,saved):undefined;
 const next=Math.min(MISSION_COUNT-1,index+1);
 const record:MissionRecord={cleared:true};
 const revision=missionBenchmarkRevision(id);if(revision!==undefined)record.benchmarkRevision=revision;
 if(previous?.previousBenchmark)record.previousBenchmark=previous.previousBenchmark;
 const comparable=isCurrentMissionBenchmark(id,previous);
 if(Number.isFinite(seconds)&&seconds>0)record.bestTime=Math.min(comparable?previous?.bestTime??Infinity:Infinity,seconds);
 if(Number.isInteger(alerts)&&alerts>=0)record.alerts=Math.min(comparable?previous?.alerts??Infinity:Infinity,alerts);
 const mastery=recordChapterOneMastery(id,previous,seconds,extraDetections);
 if(mastery)record.mastery=mastery;
 return {...progress,lastMission:missionId(next),highestUnlocked:Math.max(progress.highestUnlocked,next),records:{...progress.records,[id]:record}};
}
