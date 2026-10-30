/** Continuous gameplay comparison, not a human difficulty or device performance measurement. */
import fs from 'node:fs';
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {exposureRun} from '../campaign/cameraExposure';
import {heistRun} from '../campaign/v12Phase5Bot';
import {COVER_CHECKPOINTS} from '../campaign/v13CoverCheckpoints';
import {coverWindows} from '../campaign/v13CoverWindows';
import witnesses from '../campaign/v13CoverWitnesses.json';
import {writeReport} from '../campaign/v13QaLib';
const out=process.argv[3]??'docs/reports/performance/campaign-cover.json';
const method='Identical 32 fixed-route + 8 cone-aware continuous heists per mission and version, actual 60Hz production simulation. No forced alerts/teleports/immunity. Scripted proxies, not human success rates or clear times. Additional witnesses are listed separately, not included in the comparison rates.';
type Compared={name:string;fixedClears:number;observerClears:number;runs:ReturnType<typeof exposureRun>[];observers:ReturnType<typeof heistRun>[]};
type Row={id:string;compare:Compared[]};
function summarize(rows:Row[]){
 const measured=rows.map(row=>{
  const def=(stages as StageDefinition[]).find(d=>d.id===row.id)!,w=witnesses[row.id as keyof typeof witnesses];
  const witness='patience' in w?heistRun(def,w.approach,w.delay,w.patience):exposureRun(def,w.approach,w.escape,w.mode,w.delay);
  return {id:row.id,checkpoints:COVER_CHECKPOINTS[row.id].length,windows:coverWindows(def),
   compare:row.compare.map(r=>({name:r.name,fixedClears:r.fixedClears,fixedRuns:r.runs.length,observerClears:r.observerClears,observerRuns:r.observers.length})),
   witness:{...w,clear:witness.clear,caught:witness.caught,time:witness.time}};
 });
 writeReport(out,{method,humanPlaytestVerified:false,rows:measured});
}
if(process.argv[2]==='--summarize'){
 summarize(JSON.parse(fs.readFileSync('Reports/CampaignCover/matrix.json','utf8')).rows);
}else{
const before=JSON.parse(fs.readFileSync(process.argv[2],'utf8')) as StageDefinition[];
const matrix:{approach:number;escape:number;mode:number;delay:number}[]=[];
for(const approach of [0,1])for(const escape of [0,1])for(const mode of [2,3])for(const delay of [0,4,8,12])matrix.push({approach,escape,mode,delay});
const rows=[];
for(const after of (stages as StageDefinition[]).slice(1)){
 const compare=[{name:'before',def:before.find(d=>d.id===after.id)!},{name:'after',def:after}].map(({name,def})=>{
  const runs=matrix.map(p=>({...p,...exposureRun(def,p.approach,p.escape,p.mode,p.delay)}));
  const observers=[];
  for(const approach of [0,1])for(const delay of [0,4])for(const patience of [3,6])observers.push({approach,delay,patience,...heistRun(def,approach,delay,patience)});
  return {name,fixedClears:runs.filter(r=>r.clear).length,observerClears:observers.filter(r=>r.clear).length,runs,observers};
 });
 rows.push({id:after.id,checkpoints:COVER_CHECKPOINTS[after.id],compare});
 console.log(after.id,compare.map(r=>`${r.name}: ${r.fixedClears}/${r.runs.length} fixed, ${r.observerClears}/${r.observers.length} watching`).join(' | '));
 writeReport('Reports/CampaignCover/matrix.json',{method,humanPlaytestVerified:false,rows});
}
summarize(rows);
}
