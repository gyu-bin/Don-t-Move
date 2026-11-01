/**
 * Mission variants as edits to the V13 plan (the same objects the bake composes), composed in memory with composeV13
 * — so a variant here is exactly what the bake would produce. Nothing is written to the campaign.
 *   node --import tsx tools/gameplay-improvement/variants.ts <outDir> <variant,…>
 */
import fs from 'node:fs';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import {composeV13} from '../campaign/v13Builder';
import {auditV124bTopology} from '../campaign/v124bTopologyQA';
import {V13_MISSIONS} from '../campaign/v13Build';
import {baseMissionOf} from '../campaign/v13Sources';
import type {V13Mission} from '../campaign/v13Types';
import {applyVariety} from './variety';
import {evaluate,solutionSimilarity} from './evaluateMission';
import type {Evaluation} from './evaluateMission';

import {CANDIDATES} from './candidates';

export function planOf(id:string):V13Mission {
  const m=V13_MISSIONS.find(x=>x.id===id); if (!m) throw Error(`unknown mission ${id}`);
  return m;
}
export function compose(m:V13Mission):StageDefinition {
  const def=JSON.parse(JSON.stringify(composeV13(m,raw as StageDefinition[]))) as StageDefinition;
  const audit=auditV124bTopology(def); if (audit.errors.length) throw Error(`${m.id}: topology ${audit.errors.join('; ')}`);
  return def;
}
/** Baseline = the campaign as it was before v2 (saved copy if present, else the runtime file). */
const BASELINE=process.env.BASELINE_CAMPAIGN?JSON.parse(fs.readFileSync(process.env.BASELINE_CAMPAIGN,'utf8')) as StageDefinition[]:campaign as StageDefinition[];
const runtime=(id:string)=>BASELINE.find(d=>d.id===id)!;

export function evaluateVariant(name:string) {
  const isBaseline=name.endsWith(':baseline');
  const id=name.split(':')[0];
  const base=baseMissionOf(id);
  const patch=CANDIDATES[name];
  if (!isBaseline&&!patch) throw Error(`no candidate named ${name}`);
  const def=isBaseline?runtime(id):compose(applyVariety(planOf(id),patch));
  const ev=evaluate(def);
  const out:{name:string;id:string;def:StageDefinition;ev:Evaluation;vsBase?:unknown;baseEv?:Evaluation}={name,id,def,ev};
  if (base) { const bd=runtime(base), be=evaluate(bd); out.baseEv=be; out.vsBase=solutionSimilarity(be,ev,bd,def); }
  return out;
}

if (process.argv[1]?.endsWith('variants.ts')) {
  const [outDir,list]=process.argv.slice(2);
  if (!outDir||!list) throw Error('usage: variants.ts <outDir> <variant,…>');
  fs.mkdirSync(outDir,{recursive:true});
  for (const name of list.split(',')) {
    const t=Date.now(), r=evaluateVariant(name);
    fs.writeFileSync(`${outDir}/${name.replace(':','_')}.json`,JSON.stringify({name,summary:r.ev.summary,tight:r.ev.tight,vsBase:r.vsBase,baseSummary:r.baseEv?.summary,
      guards:r.def.guards,patrolRoutes:r.def.patrolRoutes,cameras:r.def.cameras,runs:r.ev.runs,plans:r.ev.plans.map(p=>({...p,windows:undefined}))},null,1)+'\n');
    fs.writeFileSync(`${outDir}/${name.replace(':','_')}.stage.json`,JSON.stringify([r.def])+'\n');
    const s=r.ev.summary as Record<string,unknown>;
    console.log(`${name}: DDI ${s.ddi} plans ${s.planVector} unseen ${(s.unseenStrategies as string[]).length} fastest ${s.fastest} wait ${s.expertMedianWait} reactive ${s.reactiveClear} contact ${s.reactiveContact} chase ${s.reactiveChaseCaught} delaySens ${s.reactiveDelaySensitivity} tightA/E ${JSON.stringify(s.approachRisk)} vsBase ${JSON.stringify(r.vsBase)} (${((Date.now()-t)/1000).toFixed(0)} s)`);
  }
}
