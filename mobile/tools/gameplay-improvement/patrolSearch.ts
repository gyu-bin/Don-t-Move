/**
 * Searches re-routes of ONE existing guard (two-stop patrol, no guard added) for a mission, scoring each composed
 * variant with the expert planner + reactive bots. Hard constraints keep it fair; the score prefers solutions unlike
 * the mission it was mirrored from, at a target difficulty. Deterministic (seeded).
 *   node --import tsx tools/gameplay-improvement/patrolSearch.ts <out.json> <mission> <guardIndex> <zones e.g. tgh> <n> <targetDDI> [seed]
 */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import {compileStage} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {baseMissionOf} from '../campaign/v13Sources';
import {applyVariety} from './variety';
import type {VarietyPatch} from './variety';
import {planOf,compose} from './variants';
import {evaluate,solutionSimilarity} from './evaluateMission';
import type {Evaluation} from './evaluateMission';

export function rng(seed:number){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/2**32; }; }

/** Hard constraints and score (published in the v2 report). */
/** reactive floor = min(10 %, the mission's own baseline rate − 2 runs of 54), so a mission that was already harsh for
 *  non-observing bots is held to not getting worse rather than to an absolute rate. */
export function judge(s:Record<string,unknown>, sim:number, target:number, baselineReactive=0.1, own?:{gaits:number;routes:number;clear:number}) {
  const plans=s.plans as {route:number;clear:boolean;unseen:boolean}[];
  const authoredClear=plans.filter(p=>p.route<2&&p.clear).length;
  const [ok,total]=String(s.reactiveClear).split('/').map(Number);
  const reasons:string[]=[];
  // absolute targets, relaxed to the mission's own baseline at the same planner budget (screening never demands more than the mission had)
  const needG=Math.min(3,own?.gaits??3), needR=Math.min(2,own?.routes??2), needC=Math.min(6,own?.clear??6);
  if ((s.gaitsUnseen as string[]).length<needG) reasons.push(`fewer than ${needG} gaits clear unseen`);
  if ((s.routesUnseen as number[]).filter(r=>r<2).length<needR) reasons.push('an authored approach route lost its unseen clear');
  if (authoredClear<needC) reasons.push(`fewer than ${needC}/8 expert plans clear`);
  const floor=Math.min(0.1,baselineReactive-2/54);
  if (ok/total<floor) reasons.push(`reactive clear rate < ${(floor*100).toFixed(1)} %`);
  if (Number(s.expertMedianWait)>8) reasons.push('median expert wait > 8 s');
  const ddi=Number(s.ddi), fit=Math.max(0,1-Math.abs(ddi-target)/20);
  return {pass:!reasons.length,reasons,score:+((1-sim)+0.5*fit).toFixed(4),ddi,fit:+fit.toFixed(3)};
}

if (process.argv[1]?.endsWith('patrolSearch.ts')) {
  const [out,id,gi,zones,nArg,targetArg,seedArg]=process.argv.slice(2);
  const n=Number(nArg), target=Number(targetArg), next=rng(Number(seedArg??1)), g=Number(gi);
  const plan=planOf(id), def0=compose(plan), stage=compileStage(def0), nav=buildNavigation(stage,BODY.guardRadius);
  // screening budget: candidates are ranked with a small planner budget; finalists are re-evaluated in full (variants.ts)
  const SCREEN=Number(process.env.SCREEN_BUDGET??400);
  const base=baseMissionOf(id)!, baseDef=(campaign as StageDefinition[]).find(d=>d.id===base)!, baseEv:Evaluation=evaluate(baseDef,{budget:SCREEN});
  const own=evaluate(def0,{budget:SCREEN}), [ownOk,ownTotal]=String(own.summary.reactiveClear).split('/').map(Number);
  const ownStats={gaits:(own.summary.gaitsUnseen as string[]).length,routes:(own.summary.routesUnseen as number[]).filter(r=>r<2).length,
    clear:(own.summary.plans as {route:number;clear:boolean}[]).filter(p=>p.route<2&&p.clear).length};
  process.stderr.write(`baseline at screening budget: ${JSON.stringify(ownStats)} reactive ${own.summary.reactiveClear} ddi ${own.summary.ddi}\n`);
  // floor cells of the allowed zones, away from prize / exit / entry
  const cells:{x:number;y:number}[]=[];
  plan.map.forEach((row,y)=>[...row].forEach((ch,x)=>{ if (!zones.includes(ch)) return; const p={x:x+0.5,y:y+0.5};
    const far=(q:{x:number;y:number},d:number)=>Math.hypot(p.x-q.x,p.y-q.y)>=d;
    if (far(plan.objective,1.5)&&far(plan.exit,3)&&far(plan.entry,2.5)&&stage.grid[y*stage.cols+x]===1) cells.push(p); }));
  const routePts=[...def0.testRoutes!,...def0.escapeRoutes!].flatMap(r=>r.points);
  const results:Record<string,unknown>[]=[];
  for (let k=0;k<n;k++) {
    let a=cells[Math.floor(next()*cells.length)], b=cells[Math.floor(next()*cells.length)], tries=0;
    while ((Math.hypot(a.x-b.x,a.y-b.y)<3||Math.hypot(a.x-b.x,a.y-b.y)>7||!clearSegment(a.x*40,a.y*40,b.x*40,b.y*40,nav.blockers,BODY.guardRadius))&&tries++<200) { a=cells[Math.floor(next()*cells.length)]; b=cells[Math.floor(next()*cells.length)]; }
    // each stop watches the nearest authored route point 2–4.5 tiles away (else looks at the other stop)
    const look=(p:{x:number;y:number},other:{x:number;y:number})=>{ const c=routePts.map(q=>({q,d:Math.hypot(q.x-p.x,q.y-p.y)})).filter(o=>o.d>=2&&o.d<=4.5).sort((u,v)=>u.d-v.d)[0]; return c?{x:c.q.x,y:c.q.y}:other; };
    const wa=next()<0.5?2:3, wb=next()<0.5?2:3;
    const patch:VarietyPatch={why:`search ${k}`,guards:{[g]:{stops:[{...a,look:look(a,b),wait:wa},{...b,look:look(b,a),wait:wb}]}}};
    let row:Record<string,unknown>={k,stops:patch.guards![g].stops};
    if (process.env.DRY) { console.log(JSON.stringify(row)); continue; }
    try {
      const def=compose(applyVariety(plan,patch)), ev=evaluate(def,{budget:SCREEN}), sim=solutionSimilarity(baseEv,ev,baseDef,def);
      row={...row,...judge(ev.summary,Number(sim.similarity),target,ownOk/ownTotal,ownStats),sim,summary:{ddi:ev.summary.ddi,planVector:ev.summary.planVector,fastest:ev.summary.fastest,wait:ev.summary.expertMedianWait,reactive:ev.summary.reactiveClear,gaits:ev.summary.gaitsUnseen,routes:ev.summary.routesUnseen}};
    } catch (e) { row={...row,pass:false,reasons:[`does not compose: ${String(e).slice(0,120)}`]}; }
    results.push(row);
    process.stderr.write(`${k}: ${row.pass?'PASS':'fail'} score ${row.score??'-'} ddi ${row.ddi??'-'} sim ${(row.sim as {similarity?:number})?.similarity??'-'} ${(row.reasons as string[]).join('; ')}\n`);
  }
  results.sort((x,y)=>Number(y.pass)-Number(x.pass)||Number(y.score??0)-Number(x.score??0));
  fs.writeFileSync(out,JSON.stringify({id,guardIndex:g,zones,target,base,results},null,1)+'\n');
}
