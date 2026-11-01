/**
 * One evaluation for a mission definition (runtime or an in-memory variant): expert plans on every authored or extra
 * approach route × 4 gaits, the 54 reactive-bot runs, structure/coverage, DDI parts, bottleneck positions, and the
 * solution similarity to the mission it was mirrored from. Same tools and settings as the v1 audit.
 */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {runMission,missionStructure,STRATEGIES} from '../gameplay-audit/campaignAudit';
import type {RunResult,Strategy} from '../gameplay-audit/campaignAudit';
import {planMission,GAITS,split} from '../gameplay-audit/expertPlanner';
import type {PlanResult} from '../gameplay-audit/expertPlanner';
import {difficultyIndex} from '../gameplay-audit/difficultyIndex';
import type {MissionMetrics} from '../gameplay-audit/difficultyIndex';
import {polyline,toWorld,objectiveTile,exitCenterTile} from '../gameplay-audit/routeGeometry';
import type {Pt} from '../gameplay-audit/routeGeometry';

const ROUTED:Strategy[]=['sneak','walk','run','sneakRun','observe','cctvTiming','theftRun','adaptive'];
const mean=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
const median=(a:number[])=>{if(!a.length)return NaN;const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;};
const r3=(v:number)=>Number.isFinite(v)?+v.toFixed(3):null;

export interface Evaluation {
  id:string; plans:PlanResult[]; runs:RunResult[]; tight:{route:number;gait:string;phase:string;x:number;y:number;window:number}[];
  summary:Record<string,unknown>;
}

/** Bottleneck positions (window ≤ 25 %) of the clear plans, in tile coordinates. */
function bottlenecks(def:StageDefinition, plans:PlanResult[]) {
  const stage=compileStage(def), pnav=buildNavigation(stage,BODY.playerRadius+1);
  const exitC=toWorld(exitCenterTile(def)), out:Evaluation['tight']=[];
  for (const p of plans.filter(q=>q.clear)) {
    const approach=split(polyline(pnav,def.testRoutes![p.route].points.map(toWorld))); approach.push(toWorld(objectiveTile(def)));
    const er=p.escape==='alt'?(def.escapeRoutes![1]??def.escapeRoutes![0]):def.escapeRoutes![0];
    const escape=split(polyline(pnav,[toWorld(objectiveTile(def)),...er.points.map(toWorld).slice(1)])); escape.push(exitC);
    const segs:Pt[]=[...approach,...escape];
    p.windows.forEach((w,i)=>{ if (w<=0.25&&segs[i]) out.push({route:p.route,gait:p.gait,phase:i<approach.length?'approach':'escape',x:+(segs[i].x/TILE).toFixed(1),y:+(segs[i].y/TILE).toFixed(1),window:w}); });
  }
  return out;
}

export function evaluate(def:StageDefinition, opts:{routes?:number[];reactive?:boolean;budget?:number}={}):Evaluation {
  const routes=opts.routes??def.testRoutes!.map((_,i)=>i);
  const plans=routes.flatMap(r=>GAITS.map(g=>opts.budget?planMission(def,r,g,opts.budget):planMission(def,r,g)));
  const runs:RunResult[]=[];
  if (opts.reactive!==false) for (const st of STRATEGIES) {
    const rs:(number|'nav')[]=st==='shortest'?['nav']:st==='safeFirst'?[0]:ROUTED.includes(st)?[0,1]:[0];
    for (const r of rs) for (const dl of [0,2,4]) runs.push(runMission(def,st,r,dl));
  }
  const s=missionStructure(def), tight=bottlenecks(def,plans);
  const authored=plans.filter(p=>p.route<2), clear=authored.filter(p=>p.clear);
  const m={expertScore:mean(authored.map(p=>p.clear?(p.unseen?1:0.5):0)),bottleneckWindow:clear.length?median(clear.map(p=>p.windowMin as number)):0,
    reactiveClearRate:runs.length?runs.filter(r=>r.clear).length/runs.length:NaN,dangerSections:s.coverage.safe.dangerSections+s.coverage.risk.dangerSections} as MissionMetrics;
  const ddi=difficultyIndex(m);
  const ok=runs.filter(r=>r.clear), groups=new Map<string,boolean[]>();
  for (const r of runs) { const k=r.strategy+'|'+r.route; groups.set(k,[...(groups.get(k)??[]),r.clear]); }
  const multi=[...groups.values()].filter(v=>v.length>1);
  const summary={
    ddi:ddi.total,ddiParts:ddi.parts,
    plans:plans.map(p=>({route:p.route,gait:p.gait,clear:p.clear,unseen:p.unseen,seconds:p.seconds,wait:p.waitSeconds,windowMin:p.windowMin,escape:p.escape,budgetExhausted:p.budgetExhausted})),
    planVector:authored.map(p=>p.clear?(p.unseen?2:1):0).join(''),
    unseenStrategies:[...new Set(plans.filter(p=>p.clear&&p.unseen).map(p=>`${p.gait}/r${p.route}`))],
    gaitsUnseen:GAITS.filter(g=>plans.some(p=>p.gait===g&&p.clear&&p.unseen)),
    routesUnseen:routes.filter(r=>plans.some(p=>p.route===r&&p.clear&&p.unseen)),
    fastest:(()=>{const c=plans.filter(p=>p.clear).sort((a,b)=>(a.seconds??0)-(b.seconds??0))[0];return c?`${c.gait}/r${c.route} ${c.seconds}s`:'none';})(),
    expertMedianWait:r3(median(clear.map(p=>p.waitSeconds))),expertMedianSeconds:r3(median(clear.map(p=>p.seconds as number))),
    reactiveClear:`${ok.length}/${runs.length}`,reactiveMeanSeconds:r3(mean(ok.map(r=>r.seconds))),reactiveMedianSeconds:r3(median(ok.map(r=>r.seconds))),
    reactiveMaxGuardSuspicionMean:r3(mean(runs.map(r=>r.maxGuardSuspicion))),reactiveSpottedRuns:runs.filter(r=>r.spottedEpisodes>0).length,
    reactiveContact:runs.filter(r=>r.outcome==='caught-contact').length,reactiveChaseCaught:runs.filter(r=>r.outcome==='caught-in-chase').length,
    reactiveStuck:runs.filter(r=>r.stuck).length,reactiveDelaySensitivity:r3(multi.filter(v=>new Set(v).size>1).length/multi.length),
    strategyRates:Object.fromEntries(STRATEGIES.map(st=>{const x=runs.filter(r=>r.strategy===st);return [st,r3(x.filter(r=>r.clear).length/x.length)];})),
    approachRisk:{pickupFailures:plans.filter(p=>!p.clear&&/approach/.test(p.failCause??'')).length,escapeFailures:plans.filter(p=>!p.clear&&!/approach/.test(p.failCause??'')).length,
      tightApproach:tight.filter(t=>t.phase==='approach').length,tightEscape:tight.filter(t=>t.phase==='escape').length},
    coverage:{safe:s.coverage.safe,risk:s.coverage.risk,quickEscape:s.coverage.quickEscape},
  };
  return {id:def.id,plans,runs,tight,summary};
}

/** Mirror transform between two missions with identical walkable grids (identity if none matches). */
export function mirrorBetween(a:StageDefinition,b:StageDefinition) {
  const A=compileStage(a), B=compileStage(b); let best={fx:0,fy:0,iou:0};
  if (A.cols===B.cols&&A.rows===B.rows) for (const [fx,fy] of [[0,0],[1,0],[0,1],[1,1]]) { let n=0,u=0;
    for (let y=0;y<A.rows;y++) for (let x=0;x<A.cols;x++) { const p=A.grid[y*A.cols+x]===1, q=B.grid[(fy?A.rows-1-y:y)*A.cols+(fx?A.cols-1-x:x)]===1; if(p&&q)n++; if(p||q)u++; }
    if (u&&n/u>best.iou) best={fx,fy,iou:n/u}; }
  return {...best,pt:(p:Pt):Pt=>({x:best.fx?A.cols-p.x:p.x,y:best.fy?A.rows-p.y:p.y})};
}

/**
 * Solution similarity to the base mission (0–1, published formula):
 *   mean of { expert outcome-vector agreement (8 authored plans), 1 − mean |reactive strategy rate difference|,
 *             bottleneck overlap (share of base bottlenecks with a variant bottleneck within 1.5 tiles after mirroring, symmetric mean),
 *             same fastest plan (gait and route) 1/0,
 *             wait-profile similarity = 1 − mean over the 8 authored plans of min(1, |wait difference| / 6 s) (a failed plan counts as 6 s apart from a clear one) }.
 */
export function solutionSimilarity(base:Evaluation, variant:Evaluation, baseDef:StageDefinition, variantDef:StageDefinition) {
  const T=mirrorBetween(baseDef,variantDef);
  const va=String(base.summary.planVector), vb=String(variant.summary.planVector);
  const agree=[...va].filter((c,i)=>c===vb[i]).length/va.length;
  const ra=base.summary.strategyRates as Record<string,number>, rb=variant.summary.strategyRates as Record<string,number>;
  const stratSim=1-mean(STRATEGIES.map(s=>Math.abs((ra[s]??0)-(rb[s]??0))));
  const near=(p:{x:number;y:number},q:{x:number;y:number})=>Math.hypot(p.x-q.x,p.y-q.y)<=1.5;
  const bt=base.tight.map(t=>T.pt(t)), vt=variant.tight;
  const cover=(xs:Pt[],ys:Pt[])=>xs.length?xs.filter(x=>ys.some(y=>near(x,y))).length/xs.length:(ys.length?0:1);
  const bottleneckOverlap=(cover(bt,vt)+cover(vt,bt))/2;
  const fastest=(e:Evaluation)=>String(e.summary.fastest).split(' ')[0];
  const sameFastest=fastest(base)===fastest(variant)?1:0;
  const pa=(base.summary.plans as {route:number;gait:string;clear:boolean;wait:number}[]).filter(p=>p.route<2);
  const pb=(variant.summary.plans as {route:number;gait:string;clear:boolean;wait:number}[]).filter(p=>p.route<2);
  const waitSim=1-mean(pa.map(p=>{const q=pb.find(x=>x.route===p.route&&x.gait===p.gait);if(!q)return 1;if(p.clear!==q.clear)return 1;if(!p.clear)return 0;return Math.min(1,Math.abs(p.wait-q.wait)/6);}));
  return {similarity:r3((agree+stratSim+bottleneckOverlap+sameFastest+waitSim)/5),planAgreement:r3(agree),strategySimilarity:r3(stratSim),bottleneckOverlap:r3(bottleneckOverlap),sameFastest,waitSimilarity:r3(waitSim),transform:`${T.fx?'x':''}${T.fy?'y':''}`||'none',gridIoU:r3(T.iou)};
}
