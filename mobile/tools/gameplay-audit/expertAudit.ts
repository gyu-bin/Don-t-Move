/**
 * Runs the patient-expert planner over missions × routes × gait policies, optionally for in-memory candidate
 * movement factors (restored in `finally`; campaign JSON asserted unchanged).
 *   node --import tsx tools/gameplay-audit/expertAudit.ts <out.json> [--missions ids] [--candidates A,B,C,E]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {GUARD_TUNING} from '../../src/game/guards/guardTuning';
import {planMission,GAITS,WAITS} from './expertPlanner';
import type {PlanResult} from './expertPlanner';
import {CANDIDATES} from './campaignAudit';

const args=process.argv.slice(2), out=args[0];
if (!out) throw Error('usage: expertAudit.ts <out.json> [--missions ids] [--candidates A,B]');
const opt=(k:string)=>{const i=args.indexOf(k);return i>=0?args[i+1]:undefined;};
const ids=opt('--missions')?.split(',') ?? (campaign as StageDefinition[]).map(d=>d.id);
const cands=(opt('--candidates')??'A').split(',');
if (cands.some(c=>c!=='A')&&cands[0]!=='A') throw Error('candidate A must run first (others reuse its identical plans)');
const defs=(campaign as StageDefinition[]).filter(d=>ids.includes(d.id));
const factors=GUARD_TUNING.movementFactor as unknown as number[], PRODUCTION=[...factors];
const before=JSON.stringify(campaign), t0=Date.now();
const plans:(PlanResult&{candidate:string;reusedFrom?:string})[]=[];
try {
  for (const c of cands) {
    factors.splice(0,factors.length,...CANDIDATES[c]);
    for (const def of defs) for (const g of GAITS) for (const r of [0,1]) {
      // A gait only ever reaches the factor entries up to its own index (accelerating from rest). When those entries
      // equal candidate A's, the simulation is identical by construction: reuse A's plan instead of re-running it.
      const top=g==='sneak'?1:g==='walk'?2:3, same=c!=='A'&&CANDIDATES[c].slice(0,top+1).every((v,i)=>v===CANDIDATES.A[i]);
      const a=same?plans.find(p=>p.candidate==='A'&&p.id===def.id&&p.gait===g&&p.route===r):undefined;
      plans.push(a?{...a,candidate:c,reusedFrom:'A'}:{...planMission(def,r,g),candidate:c});
    }
    process.stderr.write(`candidate ${c}: ${plans.filter(p=>p.candidate===c&&p.clear).length}/${plans.filter(p=>p.candidate===c).length} clear (${((Date.now()-t0)/1000).toFixed(0)} s)\n`);
  }
} finally { factors.splice(0,factors.length,...PRODUCTION); }
if (JSON.stringify(campaign)!==before) throw Error('campaign changed during the audit');
fs.writeFileSync(out,JSON.stringify({generated:new Date().toISOString(),campaignSha256:crypto.createHash('sha256').update(before).digest('hex'),
  waits:WAITS,gaits:GAITS,candidates:Object.fromEntries(cands.map(c=>[c,CANDIDATES[c]])),plans})+'\n');
process.stderr.write(`wrote ${out}: ${plans.length} plans in ${((Date.now()-t0)/1000).toFixed(0)} s\n`);
