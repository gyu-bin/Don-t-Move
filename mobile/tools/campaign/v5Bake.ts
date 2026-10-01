import fs from 'node:fs';
import {buildCampaign} from './buildCampaign';
import {assertV5Preservation,canonical,V5_REPORT} from './v5Preservation';
const stages=canonical(buildCampaign());
const scope=assertV5Preservation(stages);
// Candidate is reviewable before runtime promotion. No quality approval is inferred.
fs.writeFileSync(`${V5_REPORT}/candidate.json`,JSON.stringify(stages,null,2)+'\n');
fs.writeFileSync(`${V5_REPORT}/scope.json`,JSON.stringify(scope,null,2)+'\n');
if(process.env.PROMOTE_RUNTIME==='1'){
 const target='src/game/levels/stages/campaignStages.json';
 fs.writeFileSync(`${target}.v5.tmp`,JSON.stringify(stages,null,2)+'\n');fs.renameSync(`${target}.v5.tmp`,target);
}
console.log(JSON.stringify({scope,runtimePromoted:process.env.PROMOTE_RUNTIME==='1',visualQuality:'NOT_APPROVED_BY_BAKE'}));
