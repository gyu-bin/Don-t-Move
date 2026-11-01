/**
 * Re-runs a fixed sample of stored reactive runs and expert plans in a fresh process and requires identical results.
 *   node --import tsx tools/gameplay-audit/verifyReplay.ts <reactive.json> <expert.json,…>
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {GUARD_TUNING} from '../../src/game/guards/guardTuning';
import {runMission,CANDIDATES} from './campaignAudit';
import type {RunResult} from './campaignAudit';
import {planMission} from './expertPlanner';
import type {PlanResult} from './expertPlanner';

const [reactivePath,expertPaths]=process.argv.slice(2);
const runs=(JSON.parse(fs.readFileSync(reactivePath,'utf8')).runs as RunResult[]);
const plans=expertPaths.split(',').flatMap(p=>JSON.parse(fs.readFileSync(p,'utf8')).plans as (PlanResult&{candidate:string;reusedFrom?:string})[]);
const def=(id:string)=>(campaign as StageDefinition[]).find(d=>d.id===id)!;
const factors=GUARD_TUNING.movementFactor as unknown as number[], prod=[...factors];
const withCandidate=<T>(c:string,fn:()=>T):T=>{try{factors.splice(0,4,...CANDIDATES[c]);return fn();}finally{factors.splice(0,4,...prod);}};
let n=0;
for (let i=0;i<runs.length;i+=97) { const r=runs[i];
  assert.deepEqual(withCandidate(r.candidate,()=>runMission(def(r.id),r.strategy,r.route,r.delay,r.candidate)),r,`reactive ${r.id} ${r.strategy}`); n++; }
const sample=plans.filter((_,i)=>i%53===0&&true).filter(p=>!p.reusedFrom).slice(0,24);
for (const p of sample) { const {candidate,...stored}=p;
  assert.deepEqual(withCandidate(candidate,()=>planMission(def(p.id),p.route,p.gait)),stored,`plan ${p.id} ${p.gait} r${p.route} ${candidate}`); n++; }
assert.deepEqual(factors,prod);
console.log(`replayed ${n} stored results (${Math.ceil(runs.length/97)} reactive, ${sample.length} expert): all identical`);
