/**
 * "Patient expert" planner. The thief walks the authored route split into ≤ 3-tile segments; before each segment it
 * may stand still for one of WAITS seconds. Every option is played on a cloned production state (structuredClone of
 * the deterministic 60 Hz simulation), so the planner sees the real future: it is an upper bound of what a player
 * with perfect timing knowledge achieves on that route at that gait, not a model of a human.
 *
 * Per segment the planner keeps the shortest wait that is unseen (no new spotted episode, not caught), backtracks
 * up to a budget when a later segment has no option, and falls back to "spotted but not caught" options only when no
 * unseen option exists. The fraction of unseen options per segment is the timing window used as a difficulty signal.
 */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import type {CompiledStage} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import type {Navigation} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import type {PlaygroundState} from '../../src/game/playground/playgroundState';
import {pointVisible} from '../../src/game/guards/guardVision';
import {BODY} from '../../src/game/guards/guardTuning';
import {Awareness} from '../../src/game/core/types';
import {polyline,toWorld,spotSignature,objectiveTile,exitCenterTile} from './routeGeometry';
import type {Pt} from './routeGeometry';

export const GAITS = ['sneak','walk','run','mixed'] as const;
export type GaitPolicy = typeof GAITS[number];
export const WAITS = [0,0.5,1,1.5,2,3,4,6];
const DT = 1/60, SEG_TILES = 3, SEG_TIMEOUT = 25;
export const BUDGET = 1500;
const r4 = (v:number) => +v.toFixed(4);

export type Ctx = {stage:CompiledStage; nav:Navigation; gait:GaitPolicy};
type SegOutcome = {rank:0|1|2; state:PlaygroundState; cause:string};

export function split(pts:Pt[]):Pt[] {
  const out:Pt[] = [];
  for (let i=1;i<pts.length;i++) {
    const a=pts[i-1], b=pts[i], n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/(SEG_TILES*TILE)));
    for (let k=1;k<=n;k++) out.push({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n});
  }
  return out;
}

function gaitMode(s:PlaygroundState, ctx:Ctx, to:Pt):number {
  if (ctx.gait==='sneak') return 1;
  if (ctx.gait==='walk') return 2;
  if (ctx.gait==='run') return 3;
  // mixed: run on open ground, sneak where a cone covers us or the next tile, walk near guards; run once alarmed.
  const p=s.player, blockers=s.effectiveVisionBlockers??ctx.stage.visionBlockers;
  if (s.mission.treasure||s.events.spottedEpisode||s.guards.some(g=>g.awareness===Awareness.Chase)) return 3;
  const d=Math.hypot(to.x-p.x,to.y-p.y)||1, k=Math.min(1,TILE/d), ax=p.x+(to.x-p.x)*k, ay=p.y+(to.y-p.y)*k;
  const watched=(x:number,y:number)=>s.guards.some(g=>pointVisible(g,x,y,blockers))||s.securityCameras.some(c=>pointVisible(c,x,y,blockers));
  if (watched(p.x,p.y)||watched(ax,ay)) return 1;
  return s.guards.some(g=>Math.hypot(g.x-p.x,g.y-p.y)<4*TILE)?2:3;
}

function step(s:PlaygroundState, ctx:Ctx) {
  const st=ctx.stage;
  stepPlayground(s,DT,TILE,400,800,{x:0,y:0,w:st.width,h:st.height},st.movementBlockers,st.visionBlockers,ctx.nav);
}

/** Plays wait + one segment on a clone. rank 0 = unseen, 1 = spotted but free, 2 = caught / stuck / timeout. */
export function playSegment(from:PlaygroundState, ctx:Ctx, to:Pt, wait:number, last:boolean):SegOutcome {
  const s=structuredClone(from), sig0=spotSignature(s), t0=s.t;
  s.playerMode=0; s.player.hasTarget=false;
  for (let f=0; f<Math.round(wait*60); f++) { step(s,ctx); if (s.events.caught) return {rank:2,state:s,cause:'caught-waiting'}; }
  let best=Infinity, lastProgress=s.t, frames=0;
  while (true) {
    if (s.mission.complete) break;
    if (++frames>(SEG_TIMEOUT+1)*60) return {rank:2,state:s,cause:'timeout'};
    s.playerMode=gaitMode(s,ctx,to); s.player.tx=to.x; s.player.ty=to.y; s.player.hasTarget=true;
    step(s,ctx);
    if (s.events.caught) return {rank:2,state:s,cause:'caught'};
    if (last ? s.mission.complete : Math.hypot(s.player.x-to.x,s.player.y-to.y)<4) break;
    const d=Math.hypot(s.player.x-to.x,s.player.y-to.y);
    if (d<best-1.5) { best=d; lastProgress=s.t; }
    if (s.t-lastProgress>5) return {rank:2,state:s,cause:'stuck'};
    if (s.t-t0>SEG_TIMEOUT+wait) return {rank:2,state:s,cause:'timeout'};
  }
  const spotted=spotSignature(s)>sig0;
  return {rank:spotted?1:0,state:s,cause:spotted?'spotted':'ok'};
}

export interface PlanResult {
  id:string; route:number; gait:GaitPolicy; escape:'quick'|'alt'|'none';
  clear:boolean; unseen:boolean; seconds:number|null; waitSeconds:number; segments:number; furthestSegment:number;
  failCause:string|null; windowMin:number|null; windowMean:number|null; tightSegments:number; forcedSpotted:number;
  budgetUsed:number; budgetExhausted:boolean; windows:number[]; startDelay:number; attemptCauses:string;
}

type Node = {state:PlaygroundState; i:number};

/** Depth-first over segments with ordered options; returns the chosen chain or null. */
export function search(start:PlaygroundState, ctx:Ctx, segs:Pt[], lastIsExit:boolean, budget:{n:number;limit?:number}, track:{furthest:number;cause:string}) {
  const limit=budget.limit??BUDGET;
  const chosen:{wait:number; window:number; rank:0|1}[] = [];
  const stack:Node[] = [{state:start,i:0}];
  const options:SegOutcome[][] = [];
  const cursor:number[] = [];
  while (stack.length) {
    const top=stack[stack.length-1];
    if (top.i===segs.length) return {chosen,end:top.state};
    if (options[top.i]===undefined) {
      const outs=WAITS.map(w=>{ budget.n++; return playSegment(top.state,ctx,segs[top.i],w,lastIsExit&&top.i===segs.length-1); });
      const good=outs.filter(o=>o.rank===0).length;
      // order: unseen options by wait, then spotted-but-free by wait; drop caught/stuck.
      const ordered=[...outs.map((o,k)=>({o,k})).filter(x=>x.o.rank===0),...outs.map((o,k)=>({o,k})).filter(x=>x.o.rank===1)];
      options[top.i]=ordered.map(x=>x.o); cursor[top.i]=0;
      (options[top.i] as SegOutcome[] & {meta?:unknown}).meta={good,waits:ordered.map(x=>WAITS[x.k])};
      if (!ordered.length) track.furthest=Math.max(track.furthest,top.i);
      if (top.i>track.furthest) { track.furthest=top.i; track.cause=outs.every(o=>o.rank===2)?outs[0].cause:'spotted'; }
      if (!ordered.length) track.cause=outs.map(o=>o.cause).sort()[0];
    }
    const opts=options[top.i], c=cursor[top.i];
    if (c>=opts.length || budget.n>limit) {
      // exhausted here: backtrack one level
      options[top.i]=undefined as never; stack.pop(); chosen.pop();
      if (budget.n>limit) return null;
      continue;
    }
    cursor[top.i]=c+1;
    const meta=(opts as SegOutcome[] & {meta:{good:number;waits:number[]}}).meta;
    chosen.push({wait:meta.waits[c],window:meta.good/WAITS.length,rank:opts[c].rank as 0|1});
    stack.push({state:opts[c].state,i:top.i+1});
  }
  return null;
}

/** Start delays tried in order when a whole attempt fails: the approach is otherwise fixed once found, so an
 *  escape that fails only because of the approach timing gets another chance from a later start. */
export const START_DELAYS = [0,3];

/** `budget` = segment simulations allowed per search (approach+escape chain). Stored results use the default. */
export function planMission(def:StageDefinition, route:number, gait:GaitPolicy, budget=BUDGET):PlanResult {
  const stage=compileStage(def), nav=buildNavigation(stage,BODY.guardRadius), pnav=buildNavigation(stage,BODY.playerRadius+1);
  const ctx:Ctx={stage,nav,gait};
  const approach=split(polyline(pnav,(def.testRoutes![route]??def.testRoutes![0]).points.map(toWorld)));
  // the last approach segment must reach the prize: aim exactly at the objective
  approach.push(toWorld(objectiveTile(def)));
  let used=0, last:PlanResult|null=null; const causes:string[]=[];
  for (const startDelay of START_DELAYS) {
    const r=attempt(def,ctx,pnav,approach,route,gait,startDelay,budget);
    used+=r.budgetUsed; causes.push(`${startDelay}s:${r.failCause??'ok'}`);
    last={...r,budgetUsed:used,startDelay,attemptCauses:causes.join(' ')};
    if (r.clear) return last;
  }
  return last!;
}

function attempt(def:StageDefinition, ctx:Ctx, pnav:Navigation, approach:Pt[], route:number, gait:GaitPolicy, startDelay:number, limit:number):PlanResult {
  const s0=createPlaygroundState(ctx.stage); s0.playerMode=0;
  for (let f=0; f<startDelay*60 && !s0.events.caught; f++) step(s0,ctx);
  const base={id:def.id,route,gait,startDelay,attemptCauses:''};
  const exitC=toWorld(exitCenterTile(def));
  const causes:string[]=[]; let used=0, exhausted=false;
  // Approach + pickup + escape are one chain, so a failed escape can backtrack into the approach timing (arriving at
  // the prize unseen but next to a guard is not a solution). The pickup happens on contact at the objective point.
  for (const [name,er] of [['quick',def.escapeRoutes![0]],['alt',def.escapeRoutes![1]??def.escapeRoutes![0]]] as const) {
    const escape=split(polyline(pnav,[toWorld(objectiveTile(def)),...er.points.map(toWorld).slice(1)])); escape.push(exitC);
    const segs=[...approach,...escape], budget={n:0,limit}, track={furthest:-1,cause:''};
    const e=search(s0,ctx,segs,true,budget,track); used+=budget.n; exhausted=exhausted||budget.n>limit;
    if (!e||!e.end.mission.complete) { causes.push(`escape-${name}:${track.cause}@${track.furthest+1}/${segs.length}(approach ${approach.length})`); continue; }
    const windows=e.chosen.map(c=>r4(c.window));
    return {...base,escape:name,clear:true,unseen:e.chosen.every(c=>c.rank===0),seconds:r4(e.end.t),waitSeconds:r4(startDelay+e.chosen.reduce((n,c)=>n+c.wait,0)),
      segments:segs.length,furthestSegment:segs.length,failCause:null,windowMin:Math.min(...windows),windowMean:r4(windows.reduce((x,y)=>x+y,0)/windows.length),
      tightSegments:windows.filter(w=>w<=2/WAITS.length).length,forcedSpotted:e.chosen.filter(c=>c.rank===1).length,
      budgetUsed:used,budgetExhausted:exhausted,windows};
  }
  return {...base,escape:'none',clear:false,unseen:false,seconds:null,waitSeconds:0,segments:approach.length,furthestSegment:-1,
    failCause:causes.join(' '),windowMin:null,windowMean:null,tightSegments:0,forcedSpotted:0,budgetUsed:used,budgetExhausted:exhausted,windows:[]};
}
