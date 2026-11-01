/**
 * Re-plans the stored expert failures (candidate A) with a larger search budget, to separate "the planner ran out of
 * search" from failures that persist. Deterministic; run with low parallelism (one process per slice).
 *   node --import tsx tools/gameplay-audit/budgetRecheck.ts <expert.json,…> <out.json> <budget> [slice k/n]
 */
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {planMission} from './expertPlanner';
import type {PlanResult} from './expertPlanner';

const [files,out,budgetArg,slice]=process.argv.slice(2);
const budget=Number(budgetArg);
if (!files||!out||!budget) throw Error('usage: budgetRecheck.ts <expert.json,…> <out.json> <budget> [k/n]');
const [k,n]=(slice??'0/1').split('/').map(Number);
const fails=files.split(',').flatMap(f=>(JSON.parse(fs.readFileSync(f,'utf8')).plans as (PlanResult&{candidate:string})[]))
  .filter(p=>p.candidate==='A'&&!p.clear).filter((_,i)=>i%n===k);
const rows:Record<string,unknown>[]=[]; const t0=Date.now();
for (const p of fails) {
  const def=(campaign as StageDefinition[]).find(d=>d.id===p.id)!;
  const r=planMission(def,p.route,p.gait,budget);
  // verdicts: resolved = clears with more search; persistent-exhaustive = fails without reaching the budget (every
  // ordered option explored in this model); unresolved = still out of budget.
  const verdict=r.clear?'resolved':r.budgetExhausted?'unresolved':'persistent-exhaustive';
  rows.push({id:p.id,route:p.route,gait:p.gait,budget,verdict,clear:r.clear,unseen:r.unseen,seconds:r.seconds,budgetUsed:r.budgetUsed,failCause:r.failCause,windowMin:r.windowMin});
  process.stderr.write(`${p.id} ${p.gait} r${p.route}: ${verdict} (${r.budgetUsed} sims, ${((Date.now()-t0)/1000).toFixed(0)} s)\n`);
}
fs.writeFileSync(out,JSON.stringify({budget,slice:`${k}/${n}`,rows},null,1)+'\n');
