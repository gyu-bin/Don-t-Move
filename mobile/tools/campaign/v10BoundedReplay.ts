/** Bounded continuous target replays; no teleport, no AI overrides. Not human playtest results. */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {exposureRun} from './cameraExposure';
const source=process.argv[2]??'src/game/levels/stages/campaignStages.json',out=process.argv[3]??'Reports/V10/replay-after.json';
const stages=JSON.parse(fs.readFileSync(source,'utf8')) as StageDefinition[];
const rows=stages.filter(d=>d.chapter!<=3).map(def=>{
 const attempts: {route: number; mode: number; delay: number; result: ReturnType<typeof exposureRun>}[]=[];
 // A fixed matrix shared by every mission. Stop once a full continuous safe/main escape exists.
 for(const route of [1,0])for(const mode of [1,2,3])for(const delay of [0,.5,1,2,3]){
  if(attempts.some(r=>r.result.clear))continue;
  if(!def.testRoutes?.[route]||!def.escapeRoutes?.[0])continue;
  const result=exposureRun(def,route,0,mode,delay);attempts.push({route,mode,delay,result});
 }
 const risk=def.testRoutes&&def.testRoutes.length>2?exposureRun(def,2,0,3,0):null;
 return{id:def.id,witness:attempts.find(r=>r.result.clear)??null,attempts:attempts.length,risk,result:attempts.some(r=>r.result.clear)?'SCRIPTED_CLEAR':'TEST_LIMITATION'};
});
fs.writeFileSync(out,JSON.stringify({method:'At most30 fixed route/mode/delay combinations per mission, stop at firstclear; runtime core60Hz continuous input. Risk one straight exposed Run. Not simulator nor Tilt certification.',source,rows},null,2)+'\n');console.log(rows.map(r=>[r.id,r.result,r.attempts,r.risk?.caught]));
