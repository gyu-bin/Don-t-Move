/** Identical continuous heists on the prior/current patrols; no human-play claims. */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import stages from '../../src/game/levels/stages/campaignStages.json';
import {exposureRun} from '../campaign/cameraExposure';
import {heistRun} from '../campaign/v12Phase5Bot';
import {auditDifficulty} from '../campaign/chapterDifficultyAudit';
import {auditMission} from '../campaign/v13FullAudit';
import {coverWindows} from '../campaign/v13CoverWindows';
import {writeReport} from '../campaign/v13QaLib';

const before=JSON.parse(fs.readFileSync(process.argv[2],'utf8')) as StageDefinition[];
const rows=[];
for(const id of ['05-02','06-01','09-05']){
 const comparisons=[];
 for(const [name,defs] of [['before',before],['after',stages as StageDefinition[]]] as const){
  const def=defs.find(d=>d.id===id)!,runs=[],observers=[];
  for(const approach of [0,1])for(const escape of [0,1])for(const mode of [2,3])for(const delay of [0,4,8,12]){
   let caughtBy='';
   const result=exposureRun(def,approach,escape,mode,delay,s=>{caughtBy=s.events.caughtBy;});
   runs.push({approach,escape,mode,delay,...result,caughtBy});
  }
  for(const approach of [0,1])for(const delay of [0,4])for(const patience of [3,6])observers.push({approach,delay,patience,...heistRun(def,approach,delay,patience)});
  comparisons.push({name,audit:auditMission(def),difficulty:auditDifficulty(def),windows:coverWindows(def),
   fixedClears:runs.filter(r=>r.clear).length,observerClears:observers.filter(r=>r.clear).length,runs,observers,
   ...(id==='09-05'?{extraWitness:{approach:1,escape:1,mode:1,delay:9,...exposureRun(def,1,1,1,9)}}:{})});
 }
 rows.push({id,comparisons});
 console.log(id,comparisons.map(r=>`${r.name}: ${r.fixedClears}/32 fixed, ${r.observerClears}/8 observing`).join(' | '));
}
writeReport('docs/reports/performance/patrol-polish.json',{
 method:'Baseline 26c5024 vs current definitions, identical runtime and continuous 60Hz full-heist inputs. Live guards/CCTV/theft/capture, no immunity or teleport. 32 fixed and8 observing runs per version/mission; Vault extra witness excluded from those counts. Not human clear times/success rates. Collision audits have no exempted findings.',humanPlaytestVerified:false,rows});
