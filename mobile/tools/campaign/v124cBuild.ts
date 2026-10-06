/**
 * HISTORICAL builder (v124cBuild). Kept for reference and for the tests that read it; it never writes the production
 * campaign. The production bake is `npm run campaign:bake` (v13Build.ts). To write its output: QA_CANDIDATE=<file>.
 * The 25 out-of-scope missions are copied verbatim, never recompiled through new authoring.
 */
import fs from 'node:fs';
import raw from '../../docs/design/v12/phase4c/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {V124C_EARLY_PLANS} from './v124cEarlyPlans';
import {V124C_LAB_PLANS} from './v124cLabPlans';
import {composeV124bPlan} from './v124bBuilder';
import {auditV124bCampaign} from './v124bTopologyQA';
export function buildV124cCampaign():StageDefinition[]{const source=raw as StageDefinition[];const plans=[...V124C_EARLY_PLANS,...V124C_LAB_PLANS];if(plans.length!==20)throw Error('Exactly20 phase4c plans required');return source.map(s=>s.chapter!<=4?composeV124bPlan(plans.find(p=>p.id===s.id)!,source):structuredClone(s));}
if(process.argv[1]?.endsWith('v124cBuild.ts')){
 const defs=buildV124cCampaign(),audit=auditV124bCampaign(defs);
 fs.mkdirSync('Reports/V12Phase4C',{recursive:true});fs.writeFileSync('Reports/V12Phase4C/topology-audit.json',JSON.stringify(audit,null,2));
 if(audit.fail)throw Error(`Not baked: ${audit.fail} physical topology failures`);
 const out=process.env.QA_CANDIDATE;if(!out)throw Error('Historical builder: set QA_CANDIDATE=<file>. The production bake is `npm run campaign:bake`.');
 fs.writeFileSync(out,JSON.stringify(defs,null,2)+'\n');console.log(`Baked ${audit.pass}/45; visual and native gates separate.`);
}
