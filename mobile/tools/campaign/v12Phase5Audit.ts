/** Phase 5 supporting metrics for Chapter 1–5: patrol/CCTV coverage axes plus a fixed scripted full-heist matrix.
 *  A naive scripted thief is a proxy for relative pressure, never a claim about human difficulty.
 *  Usage: node --import tsx tools/campaign/v12Phase5Audit.ts [stages.json] [out.json] */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {auditDifficulty} from './chapterDifficultyAudit';
import {exposureRun} from './cameraExposure';
const input=process.argv[2]??'src/game/levels/stages/campaignStages.json',out=process.argv[3]??'Reports/V12Phase5/audit.json';
const stages=(JSON.parse(fs.readFileSync(input,'utf8')) as StageDefinition[]).filter(d=>d.chapter!<=5);
const rows=stages.map(def=>{
 const axes=auditDifficulty(def);let runs=0,clears=0,spotted=0,cameraAlerts=0,caught=0;const byEscape=[0,0],byRoute=[0,0];
 for(let r=0;r<Math.min(2,def.testRoutes!.length);r++)for(let e=0;e<Math.min(2,def.escapeRoutes!.length);e++)for(const mode of [1,2,3])for(const delay of [0,1,2,3,5]){
  const x=exposureRun(def,r,e,mode,delay);runs++;
  if(x.clear){clears++;byEscape[e]++;byRoute[r]++;}
  if(x.caught)caught++;if(x.spottedBy)spotted++;if(x.cameraAlertAt!==null)cameraAlerts++;
 }
 return {id:def.id,chapter:def.chapter!,floor:axes.floor,guards:axes.guards,cameras:axes.cameras,guardCoverage:axes.guardCoverage,cctvCoverage:axes.cctvCoverage,overlap:axes.overlap,
  safeRouteExposure:axes.safeRouteExposure,objectivePressure:axes.objectivePressure,escapePressure:axes.escapePressure,
  scripted:{runs,clears,clearRate:+(clears/runs).toFixed(3),caught,spotted,cameraAlerts,clearsViaQuickEscape:byEscape[0],clearsViaAlternateEscape:byEscape[1],clearsSafeApproach:byRoute[0],clearsRiskApproach:byRoute[1]}};
});
const chapters=[1,2,3,4,5].map(c=>{const m=rows.filter(r=>r.chapter===c),mean=(f:(r:typeof rows[number])=>number)=>+(m.reduce((n,r)=>n+f(r),0)/m.length).toFixed(4);
 return {chapter:c,guards:mean(r=>r.guards),cameras:mean(r=>r.cameras),guardCoverage:mean(r=>r.guardCoverage),cctvCoverage:mean(r=>r.cctvCoverage),overlap:mean(r=>r.overlap),safeRouteExposure:mean(r=>r.safeRouteExposure),objectivePressure:mean(r=>r.objectivePressure),escapePressure:mean(r=>r.escapePressure),scriptedClearRate:mean(r=>r.scripted.clearRate),
  clearRateSpread:+(Math.max(...m.map(r=>r.scripted.clearRate))-Math.min(...m.map(r=>r.scripted.clearRate))).toFixed(3)};});
fs.mkdirSync('Reports/V12Phase5',{recursive:true});fs.writeFileSync(out,JSON.stringify({method:'60s patrol/CCTV coverage axes (chapterDifficultyAudit) + 60 scripted full-heist runs per mission: 2 approaches × 2 escapes × Sneak/Walk/Run × 5 start delays, runtime core at 60Hz. Proxy only.',chapters,rows},null,2)+'\n');
for(const r of rows)console.log(r.id,'g',r.guards,'c',r.cameras,'gCov',r.guardCoverage.toFixed(3),'cctv',r.cctvCoverage.toFixed(3),'safeExp',r.safeRouteExposure.toFixed(3),'objP',r.objectivePressure.toFixed(2),'escP',r.escapePressure.toFixed(2),'clear',`${r.scripted.clears}/${r.scripted.runs}`,'quick/alt',`${r.scripted.clearsViaQuickEscape}/${r.scripted.clearsViaAlternateEscape}`,'safe/risk',`${r.scripted.clearsSafeApproach}/${r.scripted.clearsRiskApproach}`);
for(const c of chapters)console.log('CH',c.chapter,JSON.stringify(c));
