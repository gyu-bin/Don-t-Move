/** Bake only physically audited, individually authored campaign definitions. */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import source from '../../docs/design/v12/phase4b/SOURCE_STAGES.json';
import {V124B_EARLY_PLANS} from './v124bEarlyPlans';
import {V124B_LATE_PLANS} from './v124bLatePlans';
import {buildV124bCampaign} from './v124bBuilder';
import {auditV124bCampaign} from './v124bTopologyQA';
const defs=buildV124bCampaign(source as StageDefinition[],[...V124B_EARLY_PLANS,...V124B_LATE_PLANS]);
const audit=auditV124bCampaign(defs);
fs.mkdirSync('Reports/V12Phase4B',{recursive:true});
fs.writeFileSync('Reports/V12Phase4B/topology-audit.json',JSON.stringify(audit,null,2));
if(audit.fail)throw Error(`Cannot bake campaign: ${audit.fail} physical topology failures`);
fs.writeFileSync('src/game/levels/stages/campaignStages.json',JSON.stringify(defs,null,2)+'\n');
console.log(`Baked ${audit.pass}/45 topology-audited missions; native playtest still pending.`);
