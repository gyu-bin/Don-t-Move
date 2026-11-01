/**
 * Composes a v3 candidate exactly as the bake would (composeV13 on the patched finished mission) and prints the plan,
 * the topology audit and the route lengths.
 *   node --import tsx tools/gameplay-improvement/v3/compose.ts <id:candidate|id:baseline>… [--out dir]
 */
import fs from 'node:fs';
import raw from '../../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import {composeV13,v13Draft} from '../../campaign/v13Builder';
import {auditV124bTopology,pathLength} from '../../campaign/v124bTopologyQA';
import {previewStage} from '../../campaign/v13Preview';
import {V13_MISSIONS} from '../../campaign/v13Build';
import {applyRework} from '../../campaign/v13Rework';
import {BEFORE_REWORK} from '../../campaign/v13Late';
import type {V13Mission} from '../../campaign/v13Types';
import {V3_CANDIDATES} from './candidates';

/** The mission before any shipped v3 rework: candidates are patches on it. */
export function planOf(id:string):V13Mission { const m=BEFORE_REWORK.get(id)??V13_MISSIONS.find(x=>x.id===id); if (!m) throw Error(`unknown mission ${id}`); return m; }
export function candidatePlan(name:string):V13Mission {
  const [id,c]=name.split(':'); if (c==='baseline') return planOf(id);
  const p=V3_CANDIDATES[name]; if (!p) throw Error(`no v3 candidate ${name}`);
  return applyRework(planOf(id),p);
}
export function composeCandidate(name:string):{def:StageDefinition;errors:string[]} {
  const def=JSON.parse(JSON.stringify(composeV13(candidatePlan(name),raw as StageDefinition[]))) as StageDefinition;
  return {def,errors:auditV124bTopology(def).errors};
}

if (process.argv[1]?.endsWith('compose.ts')) {
  const args=process.argv.slice(2), oi=args.indexOf('--out'), out=oi>=0?args.splice(oi,2)[1]:undefined;
  for (const name of args) {
    try {
      const {def,errors}=composeCandidate(name), audit=auditV124bTopology(def);
      console.log(`\n${name} ${def.title}`); console.log(previewStage(def));
      console.log(JSON.stringify({errors,approach:audit.approachZones,escape:audit.escapeZones,open:+audit.openEscapeLength.toFixed(1),closed:+audit.closedEscapeLength.toFixed(1),
        routes:def.testRoutes!.map(r=>`${r.name} ${pathLength(r.points).toFixed(1)}`),escapes:def.escapeRoutes!.map(r=>`${r.name} ${pathLength(r.points).toFixed(1)}`),firstBreak:def.topologyPlan!.firstBreak}));
      if (out) { fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(`${out}/${name.replace(':','_')}.stage.json`,JSON.stringify([def])+'\n'); }
    } catch (err) {
      const m=candidatePlan(name), draft=v13Draft(m), plan=draft.topologyPlan!;
      const marks=[...plan.edges.flatMap(e=>(e.via??[]).map(q=>({...q,ch:'x'}))),...plan.rooms.map(r=>({...(r.hub??{x:r.x+r.w/2,y:r.y+r.h/2}),ch:'+'}))];
      console.log(`\n${name} DRAFT (does not compose)`); console.log(previewStage(draft,2,marks)); console.log(String(err));
    }
  }
}
