import raw from '../../docs/design/v12/phase4c/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {composeV124bPlan} from './v124bBuilder';
import {auditV124bTopology} from './v124bTopologyQA';
import {V124C_LAB_PLANS} from './v124cLabPlans';
for(const p of V124C_LAB_PLANS){try{const d=composeV124bPlan(p,raw as StageDefinition[]),a=auditV124bTopology(d);console.log(p.id,JSON.stringify(a.errors),'detour',a.closedEscapeLength-a.openEscapeLength);}catch(e){console.log(p.id,String(e));}}
import fs from 'node:fs';
const defs=(raw as StageDefinition[]).map(s=>{const p=V124C_LAB_PLANS.find(p=>p.id===s.id);return p?composeV124bPlan(p,raw as StageDefinition[]):s;});fs.writeFileSync('Reports/V12Phase4C/lab-candidate.json',JSON.stringify(defs));
