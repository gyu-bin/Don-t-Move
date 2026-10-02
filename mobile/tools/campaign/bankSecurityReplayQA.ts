/** Fixed bounded continuous CPU replays. Human Tilt and native performance remain unverified. */
import fs from 'node:fs';
import {runBankMission} from './bankProductionReplay';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
const before:StageDefinition[]=JSON.parse(fs.readFileSync('Reports/SecurityBankV1/before/campaignStages.json','utf8'));
const after:StageDefinition[]=JSON.parse(fs.readFileSync('src/game/levels/stages/campaignStages.json','utf8'));
const representative=['01-08','01-10','02-08','02-10'].map(id=>{
 const attempts=[];for(const route of[0,1])for(const mode of[1,2,3])for(const delay of[0,3,6,9]){const scenario={route,escape:0,mode,delay};attempts.push({scenario,before:id.startsWith('01-')?null:runBankMission(before.find(d=>d.id===id)!,scenario),after:runBankMission(after.find(d=>d.id===id)!,scenario)});}
 return{id,attempts,beforeClears:attempts.filter(r=>r.before?.clear).length,afterClears:attempts.filter(r=>r.after.clear).length,afterWitness:attempts.find(r=>r.after.clear)?.after??null};
});
const fullHeist:{id:string;witness:ReturnType<typeof runBankMission>|null;attempts:ReturnType<typeof runBankMission>[];status:string}[]=process.argv.includes('--representatives-only')?JSON.parse(fs.readFileSync('Reports/SecurityBankV1/security-replay.json','utf8')).fullHeist:['03-05','03-08','03-10'].map(id=>{
 const def=after.find(d=>d.id===id)!,attempts=[];let witness=null;
 outer:for(const objectiveHold of[0,2,4,8])for(const delay of[0,2,6,9,12,16])for(const route of[0,1,2]){
  const result=runBankMission(def,{route,escape:0,mode:1,delay,objectiveHold});attempts.push(result);
  if(result.clear&&result.pickupAt!==null&&result.theftAt!==null&&result.spottedAt!==null&&result.pickupAt<result.theftAt&&result.theftAt<=result.spottedAt&&result.losBreak&&result.search){witness=result;break outer;}
 }
 return{id,witness,attempts,status:witness?'CONTINUOUS_ORDERED_HEIST_VERIFIED':'ORDERED_CLEAR_WITNESS_NOT_FOUND'};
});
const approvedCoreScenario={route:1,escape:1,mode:2,delay:.5};
const approvedCoreReplay={scenario:approvedCoreScenario,runtimeOnly:true,after:runBankMission(after.find(d=>d.id==='01-08')!,approvedCoreScenario)};
const report={approvedCoreReplay,method:'Actual stepPlayground60Hz continuous targets, idle delay/optional objective hold, no teleport/disabled AI; fixed24 current-runtime runs per representative; historical before playback only for Gallery, Museum before is null, bounded72 fullheist cases per Bank mission.',representative,fullHeist,native:false};
fs.writeFileSync('Reports/SecurityBankV1/security-replay.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({representative:representative.map(r=>({id:r.id,before:r.beforeClears,after:r.afterClears,witness:r.afterWitness})),fullHeist:fullHeist.map(r=>({id:r.id,status:r.status,witness:r.witness}))}));
