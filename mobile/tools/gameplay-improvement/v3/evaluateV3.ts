/**
 * v3 evaluation of a candidate (or the baseline): the v2 evaluation (expert planner on every route × 4 gaits, 54
 * reactive runs on the two authored routes) plus
 *   - the reactive route strategies on the extra route(s) as well,
 *   - blind-run accessibility (timing windows) on every route, see ../accessibility.ts,
 *   - solution similarity to the mission it was mirrored from (v2 formula),
 *   - route overlap with that mission: share of each route's length that runs within 1.5 tiles of any of the base
 *     mission's four authored routes after mirroring (1 = the same ground, 0 = all new ground).
 * The candidate keeps the baseline's old risk route as an extra route (index 2) when its own risk route replaced it,
 * so no line that still exists in the map goes unmeasured.
 *   node --import tsx tools/gameplay-improvement/v3/evaluateV3.ts <outDir> <id:name> [budget]
 */
import fs from 'node:fs';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import campaign from '../../../src/game/levels/stages/campaignStages.json';
import {compileStage,TILE} from '../../../src/game/world/compileStage';
import {buildNavigation} from '../../../src/game/world/navigation';
import {BODY} from '../../../src/game/guards/guardTuning';
import {runMission,STRATEGIES} from '../../gameplay-audit/campaignAudit';
import type {RunResult} from '../../gameplay-audit/campaignAudit';
import {polyline,toWorld} from '../../gameplay-audit/routeGeometry';
import type {Pt} from '../../gameplay-audit/routeGeometry';
import {baseMissionOf} from '../../campaign/v13Sources';
import {REWORK} from '../../campaign/v13Rework';
import {evaluate,solutionSimilarity,mirrorBetween} from '../evaluateMission';
import {accessibility} from '../accessibility';
import {composeCandidate} from './compose';
import {V3_EXTRA_ROUTES} from './candidates';

const ROUTED=['sneak','walk','run','sneakRun','observe','cctvTiming','theftRun','adaptive'] as const;
const runtime=(id:string)=>(campaign as StageDefinition[]).find(d=>d.id===id)!;

/** Dense polyline of a route on the player nav grid, in tiles. */
function trace(def:StageDefinition, pts:Pt[]):Pt[] {
  const nav=buildNavigation(compileStage(def),BODY.playerRadius+1), line=polyline(nav,pts.map(toWorld)).map(p=>({x:p.x/TILE,y:p.y/TILE})), out:Pt[]=[];
  for (let i=1;i<line.length;i++) { const a=line[i-1],b=line[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/0.25)); for (let k=0;k<n;k++) out.push({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n}); }
  return out;
}
export function routeOverlap(baseDef:StageDefinition, def:StageDefinition) {
  const T=mirrorBetween(baseDef,def);
  const lines=(rs:{points:Pt[]}[])=>rs.flatMap(r=>trace(baseDef,r.points)).map(T.pt);
  const all=lines([...baseDef.testRoutes!,...baseDef.escapeRoutes!]), approaches=lines(baseDef.testRoutes!);
  const share=(pts:Pt[],base:Pt[])=>+(pts.filter(p=>base.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<=1.5)).length/Math.max(1,pts.length)).toFixed(3);
  return Object.fromEntries([...def.testRoutes!,...def.escapeRoutes!].map(r=>{const t=trace(def,r.points);return[r.name,{anyBaseRoute:share(t,all),baseApproaches:share(t,approaches)}];}));
}

export function withExtraRoutes(name:string, def:StageDefinition):StageDefinition {
  const id=name.split(':')[0], base=composeCandidate(`${id}:baseline`).def, out=structuredClone(def);
  const same=(a:Pt[],b:Pt[])=>a.length===b.length&&a.every((p,i)=>Math.hypot(p.x-b[i].x,p.y-b[i].y)<1e-6);
  const old=base.testRoutes![1];
  if (!out.testRoutes!.some(r=>same(r.points,old.points))) out.testRoutes!.push({...old,name:`extra: ${old.name} (baseline risk line)`});
  for (const other of V3_EXTRA_ROUTES[name]??[]) { const r=composeCandidate(other).def.testRoutes![1]; if (!out.testRoutes!.some(q=>same(q.points,r.points))) out.testRoutes!.push({...r,name:`extra: ${other} risk line`}); }
  return out;
}

if (process.argv[1]?.endsWith('evaluateV3.ts')) {
  const [outDir,name,budget]=process.argv.slice(2), id=name.split(':')[0], t=Date.now();
  const {def:composed,errors}=composeCandidate(name);
  if (errors.length) throw Error(`${name}: topology ${errors.join('; ')}`);
  // The baseline is the mission before any shipped rework; it equals the runtime campaign only while the mission is not reworked.
  if (name.endsWith(':baseline')&&!REWORK[id]&&JSON.stringify(composed)!==JSON.stringify(runtime(id))) throw Error(`${id}: baseline compose differs from the runtime campaign`);
  const def=withExtraRoutes(name,composed);
  const ev=evaluate(def,budget?{budget:+budget}:{});
  const extra:RunResult[]=[];
  for (let r=2;r<def.testRoutes!.length;r++) for (const st of ROUTED) for (const dl of [0,2,4]) extra.push(runMission(def,st,r,dl));
  const access=accessibility(def);
  const baseId=baseMissionOf(id)!, baseDef=runtime(baseId), baseEv=evaluate(baseDef,budget?{budget:+budget}:{});
  const vsBase=solutionSimilarity(baseEv,ev,baseDef,def), overlap=routeOverlap(baseDef,def);
  const extraSummary={clear:`${extra.filter(r=>r.clear).length}/${extra.length}`,byStrategy:Object.fromEntries(ROUTED.map(s=>{const x=extra.filter(r=>r.strategy===s);return[s,`${x.filter(r=>r.clear).length}/${x.length}`];}))};
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(`${outDir}/${name.replace(':','_')}.json`,JSON.stringify({name,routes:def.testRoutes!.map(r=>r.name),escapes:def.escapeRoutes!.map(r=>r.name),summary:ev.summary,extraReactive:extraSummary,
    access,vsBase,overlap,tight:ev.tight,runs:ev.runs,extraRuns:extra,plans:ev.plans.map(p=>({...p,windows:undefined}))},null,1)+'\n');
  fs.writeFileSync(`${outDir}/${name.replace(':','_')}.stage.json`,JSON.stringify([def])+'\n');
  const s=ev.summary as Record<string,unknown>;
  console.log(`${name}: DDI ${s.ddi} plans ${s.planVector} (+extra ${(s.plans as {route:number;clear:boolean;unseen:boolean}[]).filter(p=>p.route>=2).map(p=>p.clear?(p.unseen?2:1):0).join('')}) routesUnseen ${JSON.stringify(s.routesUnseen)} gaits ${JSON.stringify(s.gaitsUnseen)} fastest ${s.fastest} wait ${s.expertMedianWait} reactive ${s.reactiveClear} extra ${extraSummary.clear} contact ${s.reactiveContact} chase ${s.reactiveChaseCaught}`);
  console.log(`  access ${Object.entries(access).map(([k,v])=>`${k} ${Math.round((v as {unseenShare:number}).unseenShare*100)}%`).join(' ')}`);
  console.log(`  vsBase ${JSON.stringify(vsBase)} overlap ${JSON.stringify(overlap)} (${((Date.now()-t)/1000).toFixed(0)} s)`);
  void STRATEGIES;
}
