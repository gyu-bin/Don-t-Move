/** Compare the authored 08-05 inspection timing against the pre-change stop. */
import fs from 'node:fs';
import path from 'node:path';
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {exposureRun} from '../campaign/cameraExposure';

const current=(stages as StageDefinition[]).find(s=>s.id==='08-05')!;
const before=structuredClone(current);
const guard=before.guards.find(g=>g.id==='08-05-g1')!;
before.patrolRoutes!.find(r=>r.id===guard.routeId)!.points[0].waitDuration=4;
const rows=[before,current].map((def,i)=>{
 const runs=[];
 for(const approach of [0,1])for(const escape of [0,1])for(const delay of [0,2,4,6,8,10,12])
  runs.push({approach,escape,delay,...exposureRun(def,approach,escape,3,delay)});
 return {variant:i?'applied':'before',firstStopWait:def.patrolRoutes!.find(r=>r.id===guard.routeId)!.points[0].waitDuration,
  summary:{runs:runs.length,clears:runs.filter(r=>r.clear).length,
   spotted:runs.filter(r=>r.spottedBy).length,caught:runs.filter(r=>r.caught).length},runs};
});
const out=process.argv[2]??'docs/reports/performance/hq-finale-timing.json';
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({mission:'08-05',
 method:'60Hz shared-runtime full heist. 2 approaches x 2 escapes x 7 departure delays; Run approach/escape. Only the first glass-lab wait differs (4s to 5s). No in-route decisions or human observation. This is not a human success rate.',
 humanPlaytestVerified:false,rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({variant:r.variant,...r.summary}))));
console.log(out);
