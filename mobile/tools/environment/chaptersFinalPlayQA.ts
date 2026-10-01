/** Bounded continuous-input completion witnesses; no teleport, AI overrides or forced alert. */
import fs from 'node:fs';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {runMission} from '../campaign/museumFinalPlayQA';
type Input={route:number;escape:number;mode:number;delay:number};
const previous:{id:string;route:number;witness:Input}[]=JSON.parse(fs.readFileSync('Reports/GalleryEnrichmentV1/continuous-play-qa.json','utf8')).routes;
const routes=[];
for(const d of campaignStages.filter(d=>d.chapter===1||d.chapter===2))for(const route of [0,1]){
 const old=previous.find(p=>p.id===d.id&&p.route===route)?.witness;
 const special:Input[]=d.id==='01-08'?[{route,escape:1,mode:1,delay:6}]:d.id==='01-10'?[{route,escape:0,mode:1,delay:3}]:[];
 const candidates=[...(old?[old]:[]),...special,...[3,2,1].flatMap(mode=>Array.from({length:41},(_,delay)=>[0,1].map(escape=>({route,escape,mode,delay}))).flat())];
 let attempts=0,witness:null|(Input&ReturnType<typeof runMission>)=null;
 for(const input of candidates){if(input.escape>=(d.escapeRoutes?.length??0))continue;attempts++;const result=runMission(d,input);if(result.clear){witness={...input,...result};break;}}
 routes.push({id:d.id,route,attempts,witness});console.log(JSON.stringify({id:d.id,route,attempts,witness}));
}
fs.writeFileSync('Reports/ChaptersFinalAuditV1/continuous-play-qa.json',JSON.stringify({method:'Actual60Hz spawn→objective→exit continuous target input. AI and Capture active, fixed input delays0..40 tested with Sneak/Walk/Run; witness existence is not human Tilt ease. No teleport or forced event. Failure remains null, never counted PASS.',routes},null,2)+'\n');
if(routes.some(r=>!r.witness))process.exitCode=1;
