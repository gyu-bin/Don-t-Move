/** Writes the built campaign to a candidate file; PROMOTE_RUNTIME=1 also replaces the runtime stages. */
import fs from 'node:fs';
import {buildCampaign} from './buildCampaign';
const out=process.argv[2]??'Reports/MapAuditCh2Ch3/candidate.json';
const stages=JSON.parse(JSON.stringify(buildCampaign()));
const before=JSON.parse(fs.readFileSync('src/game/levels/stages/campaignStages.json','utf8'));
const changed=stages.filter((s:any,i:number)=>JSON.stringify(s)!==JSON.stringify(before[i]));
for(const s of changed){
 const old=before.find((b:any)=>b.id===s.id);
 const keys=Object.keys(s).filter(k=>JSON.stringify(s[k])!==JSON.stringify(old[k]));
 console.log(s.id,'changed:',keys.join(','),'props',old.props.length,'→',s.props.length);
}
fs.writeFileSync(out,JSON.stringify(stages,null,2)+'\n');
if(process.env.PROMOTE_RUNTIME==='1')fs.writeFileSync('src/game/levels/stages/campaignStages.json',JSON.stringify(stages,null,2)+'\n');
console.log('changed stages',changed.length,'promoted',process.env.PROMOTE_RUNTIME==='1');
