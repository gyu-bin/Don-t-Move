import fs from 'node:fs';
import {galleryEnvironmentMission} from '../campaign/galleryEnvironmentDesign';
import {runMission} from '../campaign/museumFinalPlayQA';
const results=[];
for(const mission of [1,2]){
 const def=galleryEnvironmentMission(mission);const attempts=[];let witness=null;
 for(const route of [0,1]){
  for(const mode of [3,2,1]){
   for(const delay of [0,3,6,9]){
    for(const escape of [0,1]){
     const r=runMission(def,{route,mode,delay,escape});attempts.push(r);
     if(r.spottedAt!==null&&r.losBreak&&r.search){witness=r;break;}
    }if(witness)break;
   }if(witness)break;
  }if(witness)break;
 }
 results.push({id:def.id,witness,attempts});console.log(JSON.stringify({id:def.id,witness,runs:attempts.length}));
}
fs.mkdirSync('Reports/EnvironmentKitV1',{recursive:true});fs.writeFileSync('Reports/EnvironmentKitV1/gallery-search-qa.json',JSON.stringify({method:'Natural actual60Hz input/AI, noforcedalert, no teleport; bounded fixed authoredroute scenarios. Search success is separatelyreported from mission clear/caught.',results},null,2)+'\n');
if(results.some(r=>!r.witness))process.exitCode=1;
