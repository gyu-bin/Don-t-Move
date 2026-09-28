import {MISSION_COUNT,missionId,missionIndex} from '../levels/campaignCatalog';
export interface MissionRecord {cleared:boolean;bestTime?:number;alerts?:number;legacy?:boolean;}
export interface CampaignProgress {version:1;lastMission:string;highestUnlocked:number;records:Record<string,MissionRecord>;}
export const freshCampaign=():CampaignProgress=>({version:1,lastMission:'01-01',highestUnlocked:0,records:{}});
const clamp=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.min(44,Math.max(0,Math.floor(n))):0;
export function normalizeCampaign(input:unknown):CampaignProgress {
 if(!input||typeof input!=='object')return freshCampaign();
 const row=input as Partial<CampaignProgress>,records:Record<string,MissionRecord>={};
 for(const [id,value] of Object.entries(row.records??{})){
  if(missionIndex(id)<0||!value||typeof value!=='object')continue;
  records[id]={cleared:value.cleared===true};
  if(typeof value.bestTime==='number'&&Number.isFinite(value.bestTime)&&value.bestTime>0)records[id].bestTime=value.bestTime;
  if(typeof value.alerts==='number'&&Number.isInteger(value.alerts)&&value.alerts>=0)records[id].alerts=value.alerts;
  if(value.legacy)records[id].legacy=true;
 }
 const earned=Math.max(0,...Object.keys(records).filter(id=>records[id].cleared).map(id=>Math.min(44,missionIndex(id)+1)));
 return {version:1,lastMission:typeof row.lastMission==='string'&&missionIndex(row.lastMission)>=0?row.lastMission:'01-01',highestUnlocked:Math.max(clamp(row.highestUnlocked),earned),records};
}
/** Old ten-stage fields remain untouched on StageProgress as an archive. */
export function migrateCampaign(old:{currentStage:number;highestUnlocked:number;clearedStages:number[];bestTimes:Record<string,number>;bestAlerts:Record<string,number>;campaign?:CampaignProgress}):CampaignProgress {
 if(old.campaign)return normalizeCampaign(old.campaign);
 const mapping=[0,5,10,15,20,25,30,35,39,40];
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
