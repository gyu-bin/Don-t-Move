import {MISSION_COUNT,missionId,missionIndex} from '../levels/campaignCatalog';
export interface MissionRecord {cleared:boolean;bestTime?:number;alerts?:number;legacy?:boolean;}
export interface CampaignProgress {version:4;lastMission:string;highestUnlocked:number;records:Record<string,MissionRecord>;}
export const freshCampaign=():CampaignProgress=>({version:4,lastMission:'01-01',highestUnlocked:0,records:{}});
const clamp=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.min(MISSION_COUNT-1,Math.max(0,Math.floor(n))):0;
export function normalizeCampaign(input:unknown):CampaignProgress {
 if(!input||typeof input!=='object')return freshCampaign();
 const row=input as Partial<Omit<CampaignProgress,'version'>> & {version?:number},records:Record<string,MissionRecord>={};
 for(const [id,value] of Object.entries(row.records??{})){
  if(missionIndex(id)<0||!value||typeof value!=='object')continue;
  records[id]={cleared:value.cleared===true};
  if(typeof value.bestTime==='number'&&Number.isFinite(value.bestTime)&&value.bestTime>0)records[id].bestTime=value.bestTime;
  if(typeof value.alerts==='number'&&Number.isInteger(value.alerts)&&value.alerts>=0)records[id].alerts=value.alerts;
  if(value.legacy||((row.version===1||row.version===2)&&id.startsWith('02-'))||((row.version===1||row.version===2||row.version===3)&&id.startsWith('03-')))records[id].legacy=true;
 }
 const earned=Math.max(0,...Object.keys(records).filter(id=>records[id].cleared).map(id=>Math.min(MISSION_COUNT-1,missionIndex(id)+1)));
 // v1: five Museum missions. v2: ten Museum / five Gallery. Stable IDs survive both insertions.
 let unlocked=row.highestUnlocked;
 if(typeof unlocked==='number'&&Number.isFinite(unlocked)){
  if(row.version===1&&unlocked>=5)unlocked+=5;
  if((row.version===1||row.version===2)&&unlocked>=15)unlocked+=5;
  // v4 adds five Bank missions before stable Chapter04+ IDs, exactly once.
  if((row.version===1||row.version===2||row.version===3)&&unlocked>=25)unlocked+=5;
 }
 return {version:4,lastMission:typeof row.lastMission==='string'&&missionIndex(row.lastMission)>=0?row.lastMission:'01-01',highestUnlocked:Math.max(clamp(unlocked),earned),records};
}
/** Old ten-stage fields remain untouched on StageProgress as an archive. */
export function migrateCampaign(old:{currentStage:number;highestUnlocked:number;clearedStages:number[];bestTimes:Record<string,number>;bestAlerts:Record<string,number>;campaign?:CampaignProgress}):CampaignProgress {
 if(old.campaign)return normalizeCampaign(old.campaign);
 const mapping=['01-01','02-01','03-01','04-01','05-01','06-01','07-01','08-01','08-05','09-01'].map(missionIndex);
 const campaign=freshCampaign();
 campaign.lastMission=missionId(mapping[old.currentStage]??0);
 campaign.highestUnlocked=mapping[old.highestUnlocked]??0;
 for(const i of old.clearedStages){
  const index=mapping[i];if(index===undefined)continue;
  campaign.records[missionId(index)]={cleared:true,legacy:true,bestTime:old.bestTimes[i],alerts:old.bestAlerts[i]};
 }
 return normalizeCampaign(campaign);
}
export function canPlayMission(progress:CampaignProgress,index:number,testBuild:boolean) {
 return Number.isInteger(index)&&index>=0&&index<MISSION_COUNT&&(testBuild||index<=progress.highestUnlocked||progress.records[missionId(index)]?.cleared===true);
}
export function completeMission(progress:CampaignProgress,index:number,seconds:number,alerts:number):CampaignProgress {
 if(index<0||index>=MISSION_COUNT||!Number.isInteger(index))return progress;
 const id=missionId(index),previous=progress.records[id];
 const next=Math.min(MISSION_COUNT-1,index+1);
 const record:MissionRecord={cleared:true};
 if(Number.isFinite(seconds)&&seconds>0)record.bestTime=Math.min(previous?.legacy?Infinity:previous?.bestTime??Infinity,seconds);
 if(Number.isInteger(alerts)&&alerts>=0)record.alerts=Math.min(previous?.legacy?Infinity:previous?.alerts??Infinity,alerts);
 return {...progress,lastMission:missionId(next),highestUnlocked:Math.max(progress.highestUnlocked,next),records:{...progress.records,[id]:record}};
}
