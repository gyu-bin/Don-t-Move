/**
 * HISTORICAL builder (v125Build). Kept for reference and for the tests that read it; it never writes the production
 * campaign. The production bake is `npm run campaign:bake` (v13Build.ts). To write its output: QA_CANDIDATE=<file>.
 * Phase 5 bake: Phase 4D composition (geometry/art/doors locked) + Chapter 1–5 security tuning. Chapter 6–9 pass through untouched.
 */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {buildV124dCampaign} from './v124dBuild';
import {auditV124bCampaign} from './v124bTopologyQA';
import {applyPhase5,addPhase5Cameras,PHASE5} from './v125Tuning';
export function buildV125Campaign():StageDefinition[]{
 const base=JSON.parse(JSON.stringify(buildV124dCampaign())) as StageDefinition[];
 return base.map(def=>def.chapter!<=5&&PHASE5[def.id]?addPhase5Cameras(applyPhase5(def,PHASE5[def.id]),PHASE5[def.id],base):def);
}
if(process.argv[1]?.endsWith('v125Build.ts')){
 const defs=JSON.parse(JSON.stringify(buildV125Campaign())) as StageDefinition[],audit=auditV124bCampaign(defs);
 fs.mkdirSync('Reports/V12Phase5',{recursive:true});fs.writeFileSync('Reports/V12Phase5/topology-audit.json',JSON.stringify(audit,null,2));
 if(audit.fail)throw Error(`${audit.fail} physical topology failures; not baked`);
 const out=process.env.QA_CANDIDATE;if(!out)throw Error('Historical builder: set QA_CANDIDATE=<file>. The production bake is `npm run campaign:bake`.');
 fs.writeFileSync(out,JSON.stringify(defs,null,2)+'\n');
 console.log(`Baked ${audit.pass}/45 with Phase 5 tuning on ${Object.keys(PHASE5).length} missions. Play gates remain separate.`);
}
