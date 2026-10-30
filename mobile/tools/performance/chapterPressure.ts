/** Actual-runtime baseline/stronger-security replays. Never writes game data. */
import fs from 'node:fs';
import path from 'node:path';
import stages from '../../src/game/levels/stages/campaignStages.json';
import archetypes from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {CHAPTER_DIFFICULTY} from '../../src/game/levels/chapterDifficulty';
import {exposureRun} from '../campaign/cameraExposure';

const rows=[];
for(const id of ['05-03','06-03','07-03','08-03','08-05','09-03']){
 const current=(stages as StageDefinition[]).find(s=>s.id===id)!;
 const before=structuredClone(current),source=(archetypes as StageDefinition[]).find(s=>s.id===id)!;
 before.guards.forEach((g,i)=>{const base=source.guards[Math.min(i,source.guards.length-1)];g.visionRange=base.visionRange;g.visionHalfAngle=base.visionHalfAngle;});
 const camera=(archetypes as StageDefinition[]).flatMap(s=>s.chapter===current.chapter?s.cameras??[]:[])[0];
 for(const c of before.cameras??[]){c.range=camera.range;c.suspicionRate=camera.suspicionRate;}
 const variants=[before,current].map((s,i)=>{
  const runs=[];
  for(const approach of [0,1])for(const escape of [0,1])for(const delay of [0,2,4,6,8,10,12])
   runs.push({approach,escape,delay,...exposureRun(s,approach,escape,3,delay)});
  return {variant:i?'stronger':'before',runs,summary:{clears:runs.filter(r=>r.clear).length,
   spotted:runs.filter(r=>r.spottedBy||r.cameraAlertAt!==null).length}};
 });
 rows.push({id,variants});console.log(id,JSON.stringify(variants.map(v=>({variant:v.variant,...v.summary}))));
}
const vault=(stages as StageDefinition[]).find(s=>s.id==='09-03')!;
const out=process.argv[2]??'docs/reports/performance/chapter-pressure.json';
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({method:'60Hz full-heist runtime, 2 approaches x 2 escapes x 7 departure delays, all Run. Baseline restores the exact old detector archetypes while retaining current maps/patrols. No in-route decision making; not human success rates. A separate timing witness checks Vault at delay7s.',
 humanPlaytestVerified:false,profiles:CHAPTER_DIFFICULTY.map(p=>({chapter:p.chapter,...p.security})),rows,
 vaultWitness:{approach:1,escape:0,mode:3,delay:7,...exposureRun(vault,1,0,3,7)}},null,2)+'\n');
console.log(out);
