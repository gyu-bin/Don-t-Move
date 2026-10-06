/**
 * HISTORICAL builder (v124dBuild). Kept for reference and for the tests that read it; it never writes the production
 * campaign. The production bake is `npm run campaign:bake` (v13Build.ts). To write its output: QA_CANDIDATE=<file>.
 * Phase4D uses live-QA authoring; Chapter6–9 copied byte-equivalent from snapshot.
 */
import fs from 'node:fs';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {V124D_TARGETED_PLANS} from './v124dTargetedPlans';
import {V124D_CASINO_PLANS} from './v124dCasinoPlans';
import {composeV124bPlan} from './v124bBuilder';
import {auditV124bCampaign} from './v124bTopologyQA';
export function buildV124dCampaign():StageDefinition[]{
 const source=raw as StageDefinition[],plans=[...V124D_TARGETED_PLANS,...V124D_CASINO_PLANS];
 if(plans.length!==25 || new Set(plans.map(p=>p.id)).size!==25)throw Error('Exactly25 distinct Phase4D plans required');
 for(const stage of source.filter(s=>s.chapter!<=5))if(!plans.some(p=>p.id===stage.id))throw Error(`Missing Phase4D plan ${stage.id}`);
 // Reuse 4C rendering contract, including explicit chapter door profiles.
 return source.map(s=>s.chapter!<=5?composeV124bPlan({...plans.find(p=>p.id===s.id)!,visualRevision:'v12-4c'},source):structuredClone(s));
}
if(process.argv[1]?.endsWith('v124dBuild.ts')){
 const defs=buildV124dCampaign(),audit=auditV124bCampaign(defs);
 fs.mkdirSync('Reports/V12Phase4D',{recursive:true});fs.writeFileSync('Reports/V12Phase4D/topology-audit.json',JSON.stringify(audit,null,2));
 if(audit.fail)throw Error(`${audit.fail} physical topology failures; not baked`);
 const out=process.env.QA_CANDIDATE;if(!out)throw Error('Historical builder: set QA_CANDIDATE=<file>. The production bake is `npm run campaign:bake`.');
 fs.writeFileSync(out,JSON.stringify(defs,null,2)+'\n');
 console.log(`Baked ${audit.pass}/45. Live visual/play gates remain separate.`);
}
