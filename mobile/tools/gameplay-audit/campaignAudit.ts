/**
 * Gameplay Quality Audit v1 — offline, read-only on the game. Drives the production 60 Hz stepPlayground with
 * scripted thieves (no teleport, no invulnerability, no forced state) over every mission, and measures the map
 * structure with a guard-only coverage pass. Candidate tunings change GUARD_TUNING.movementFactor in memory only
 * and are restored in `finally`; the campaign JSON is asserted unchanged.
 *
 *   node --import tsx tools/gameplay-audit/campaignAudit.ts <out.json> [--missions 01-01,01-02] [--candidates A,B,C,E] [--strategies core|all]
 *
 * A bot failure is evidence about the bot as much as about the map: it walks authored waypoints, decides from
 * the real vision cones of this frame and one tile ahead, and has no human foresight. Never read its success rate
 * as a human success rate.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {polyline,toWorld,spotSignature,objectiveTile,exitCenterTile} from './routeGeometry';
import type {Pt} from './routeGeometry';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import type {PlaygroundState} from '../../src/game/playground/playgroundState';
import {pointVisible} from '../../src/game/guards/guardVision';
import {GUARD_TUNING,BODY} from '../../src/game/guards/guardTuning';
import {Awareness} from '../../src/game/core/types';

export const STRATEGIES = ['sneak','walk','run','sneakRun','observe','cctvTiming','theftRun','safeFirst','shortest','adaptive'] as const;
export type Strategy = typeof STRATEGIES[number];
/** Strategies that follow both authored approach routes (0 safe, 1 risk). safeFirst uses route 0, shortest uses the nav grid. */
const ROUTED: Strategy[] = ['sneak','walk','run','sneakRun','observe','cctvTiming','theftRun','adaptive'];
const CORE: Strategy[] = ['sneak','walk','run','sneakRun','observe','adaptive'];
export const CANDIDATES: Record<string, number[]> = {
  A: [0.28,0.35,0.8,1.6],   // production
  B: [0.28,0.35,0.8,1.8],   // Run risk up
  C: [0.28,0.32,0.8,1.75],  // per-distance cost monotonic (Sneak < Walk < Run), Sneak slightly cheaper
  E: [0.28,0.35,0.8,1.7],   // minimal: Run per-distance cost just above Walk
};
const DELAYS = [0,2,4];
const CAP_S = 100, DT = 1/60;
const r5 = (v:number) => +v.toFixed(5);
const factors = GUARD_TUNING.movementFactor as unknown as number[];
const PRODUCTION = [...factors];

export interface RunResult {
  id:string; strategy:Strategy; route:number|'nav'; delay:number; candidate:string;
  clear:boolean; caught:boolean; timeout:boolean; stuck:boolean; outcome:string; caughtBy:string|null;
  seconds:number; pickupAt:number|null; exposureSeconds:number; maxGuardSuspicion:number; maxCameraSuspicion:number;
  spottedEpisodes:number; chaseEntries:number; chaseLosBreaks:number; clearAfterSpotted:boolean; clearAfterChase:boolean;
  theftAlert:boolean; lockdownSwitch:boolean; waitSeconds:number; avoidSeconds:number;
  secondsByGait:[number,number,number,number];
  /** State of the guard that made the capture (null when not caught by a guard). */
  catcherSuspicion:number|null; catcherAwareness:number|null; catcherInvestigating:boolean|null;
}

export function runMission(def:StageDefinition, strategy:Strategy, route:number|'nav', delay:number, candidate='A', trace?:(line:string)=>void, onStep?:(s:PlaygroundState)=>void):RunResult {
  const stage=compileStage(def);
  const guardNav=buildNavigation(stage,BODY.guardRadius), playerNav=buildNavigation(stage,BODY.playerRadius+1);
  const s:PlaygroundState=createPlaygroundState(stage); s.playerMode=0;
  const objective=toWorld(objectiveTile(def)), exit=toWorld(exitCenterTile(def));
  const spawn=toWorld(def.playerSpawn);
  let approach:Pt[];
  if (route==='nav') approach=polyline(playerNav,[spawn,objective]);
  else approach=polyline(playerNav,(def.testRoutes![route]??def.testRoutes![0]).points.map(toWorld));
  const escapeQuick=polyline(playerNav,def.escapeRoutes![0].points.map(toWorld));
  const escapeAlt=polyline(playerNav,(def.escapeRoutes![1]??def.escapeRoutes![0]).points.map(toWorld));
  if (route==='nav') escapeQuick.splice(0,escapeQuick.length,...polyline(playerNav,[objective,exit]));
  let path:Pt[]=approach, leg=1, phase:'approach'|'escape'='approach', switched=false;
  let wait=0, waitTotal=0, exposure=0, spotted=0, chase=0, losBreaks=0, pickup:number|null=null;
  let prevSig=0, prevChase=false, prevSeen=false, maxG=0, maxC=0, lastProgress=0, bestDist=Infinity, stuck=false;
  const gaitTime:[number,number,number,number]=[0,0,0,0];
  const prevGd=new Map<string,number>(); let avoid=0, blockT=0;
  for (let f=0; f<CAP_S*60 && !s.events.caught && !s.mission.complete; f++) {
    const p=s.player, blockers=s.effectiveVisionBlockers??stage.visionBlockers;
    // Route control: after the pickup, follow the quick escape; if its lockdown doors close, switch once to the
    // service escape from the nearest waypoint (what a player would do on seeing the doors shut).
    if (phase==='approach' && s.mission.treasure) { phase='escape'; path=escapeQuick; leg=1; bestDist=Infinity; lastProgress=s.t; }
    if (phase==='escape' && !switched && s.events.lockdownActive && route!=='nav') {
      switched=true; let k=0,bd=Infinity;
      escapeAlt.forEach((q,i)=>{const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;k=i;}});
      path=polyline(playerNav,[{x:p.x,y:p.y},...escapeAlt.slice(k)]); leg=1; bestDist=Infinity; lastProgress=s.t;
    }
    if (phase==='escape' && !switched && s.events.lockdownActive && route==='nav') {
      switched=true; path=polyline(playerNav,[{x:p.x,y:p.y},exit]); leg=1;
    }
    const target=path[Math.min(leg,path.length-1)];
    const watchedBy=(x:number,y:number,cams:boolean,guards:boolean)=>
      (guards&&s.guards.some(g=>pointVisible(g,x,y,blockers)))||(cams&&s.securityCameras.some(c=>pointVisible(c,x,y,blockers)));
    const d=Math.hypot(target.x-p.x,target.y-p.y)||1, k=Math.min(1,TILE/d);
    const ax=p.x+(target.x-p.x)*k, ay=p.y+(target.y-p.y)*k;
    const here=watchedBy(p.x,p.y,true,true), ahead=watchedBy(ax,ay,true,true);
    const aheadCam=watchedBy(ax,ay,true,false);
    const carrying=s.mission.treasure, alarmed=s.events.spottedEpisode||s.guards.some(g=>g.awareness===Awareness.Chase);
    if (s.t>=delay) {
      let mode=2, hold=false;
      switch (strategy) {
        case 'sneak': mode=1; break;
        case 'walk': mode=2; break;
        case 'run': mode=3; break;
        case 'sneakRun': mode=here||ahead?1:3; break;
        case 'observe': mode=here||carrying?3:ahead?2:1; hold=!here&&ahead&&!carrying&&wait<4; break;
        case 'cctvTiming': mode=2; hold=!here&&aheadCam&&wait<4; break;
        case 'theftRun': mode=carrying?3:1; break;
        case 'shortest': mode=2; break;
        case 'safeFirst': case 'adaptive': {
          // Risk-graded: run when nobody watches here or ahead and no guard is within 4 tiles; sneak next to watched
          // ground; walk otherwise; after being spotted or with the prize, run. safeFirst also waits like observe.
          const near=s.guards.some(g=>Math.hypot(g.x-p.x,g.y-p.y)<4*TILE);
          mode=alarmed||carrying?3:here||ahead?1:near?2:3;
          hold=strategy==='safeFirst'&&!here&&ahead&&!carrying&&!alarmed&&wait<4; break;
        }
      }
      // Contact avoidance (every strategy; a player sees the guard sprite): a guard within 2.2 tiles that is
      // closing in → back off toward the previous waypoint; one ahead of us but not closing → hold.
      let retreat=false, block=false;
      const hx=(target.x-p.x)/d, hy=(target.y-p.y)/d;
      for (const g of s.guards) {
        const gd=Math.hypot(g.x-p.x,g.y-p.y), was=prevGd.get(g.id)??gd;
        if (gd<2.2*TILE && clearSegment(g.x,g.y,p.x,p.y,stage.visionBlockers,0)) {
          if (gd<was-0.05) retreat=true; else if (((g.x-p.x)*hx+(g.y-p.y)*hy)/gd>0.3) block=true;
        }
      }
      // A guard that stays put in the way is passed after 3 s of waiting, sneaking (a player cannot wait forever).
      // A guard that stays put in the way is passed after 3 s of waiting, sneaking (a player cannot wait forever).
      blockT=block&&!retreat?blockT+DT:0; if (blockT>3) { block=false; mode=1; }
      if (retreat||block) avoid+=DT;
      if (retreat) {
        const back=path[Math.max(0,leg-1)]; const bd=Math.hypot(back.x-p.x,back.y-p.y);
        if (bd>4) { s.playerMode=alarmed?3:2; p.tx=back.x; p.ty=back.y; p.hasTarget=true; wait+=DT; waitTotal+=DT; }
        else { s.playerMode=0; p.hasTarget=false; }
        lastProgress=s.t;
      } else if (hold||block) { s.playerMode=0; p.hasTarget=false; wait+=DT; waitTotal+=DT; lastProgress=s.t; }
      else { s.playerMode=mode; p.tx=target.x; p.ty=target.y; p.hasTarget=true; if(!ahead) wait=0; }
    }
    stepPlayground(s,DT,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,guardNav);
    onStep?.(s);
    for (const g of s.guards) { maxG=Math.max(maxG,g.suspicion); prevGd.set(g.id,Math.hypot(g.x-s.player.x,g.y-s.player.y)); }
    for (const c of s.securityCameras) maxC=Math.max(maxC,c.suspicion);
    const seen=s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee), inChase=s.guards.some(g=>g.awareness===Awareness.Chase);
    if (seen) exposure+=DT;
    if (spotSignature(s)>prevSig) spotted++;
    if (inChase&&!prevChase) chase++;
    if (prevSeen&&!seen&&prevChase) losBreaks++;
    prevSig=spotSignature(s); prevChase=inChase; prevSeen=seen;
    if (carrying&&pickup===null) pickup=s.t;
    if (trace&&(f%30===0||s.events.caught)) trace(`${s.t.toFixed(1)} ${phase} leg${leg}/${path.length-1} p(${(p.x/TILE).toFixed(1)},${(p.y/TILE).toFixed(1)}) mode${s.playerMode} tgt(${(target.x/TILE).toFixed(1)},${(target.y/TILE).toFixed(1)}) `+
      s.guards.map(g=>`${g.id.slice(-2)}(${(g.x/TILE).toFixed(1)},${(g.y/TILE).toFixed(1)} a${g.awareness} s${g.suspicion.toFixed(2)} d${(Math.hypot(g.x-p.x,g.y-p.y)/TILE).toFixed(1)})`).join(' ')+
      s.securityCameras.map(c=>` cam s${c.suspicion.toFixed(2)}`).join('')+(s.events.lockdownActive?' LOCK':'')+(s.events.caught?' CAUGHT '+s.events.caughtBy:'')+` bd${bestDist.toFixed(0)} lp${lastProgress.toFixed(1)}`);
    const sp=Math.hypot(p.vx??0,p.vy??0); gaitTime[sp<1?0:sp<55?1:sp<110?2:3]+=DT;
    if (Math.hypot(p.x-target.x,p.y-target.y)<4&&leg<path.length-1) { leg++; bestDist=Infinity; lastProgress=s.t; }
    // Stuck: no approach to the current waypoint for 8 s while trying to move (bot limitation, e.g. closed door).
    const cur=path[Math.min(leg,path.length-1)], dn=Math.hypot(p.x-cur.x,p.y-cur.y);
    if (dn<bestDist-2) { bestDist=dn; lastProgress=s.t; }
    if (s.t-lastProgress>8) { stuck=true; break; }
  }
  const timeout=!s.events.caught&&!s.mission.complete&&!stuck;
  const catcher=s.events.caught?s.guards.find(g=>g.id===s.events.caughtBy):undefined;
  const outcome=s.mission.complete?(chase>0?'clear-after-chase':spotted>0?'clear-after-spotted':'clear-unseen')
    :s.events.caught?(chase>0?'caught-in-chase':spotted>0?'caught-after-spotted':'caught-contact'):stuck?'stuck':'timeout';
  return {id:def.id,strategy,route,delay,candidate,clear:s.mission.complete,caught:s.events.caught,timeout,stuck,outcome,
    caughtBy:s.events.caughtBy||null,seconds:r5(s.t),pickupAt:pickup===null?null:r5(pickup),exposureSeconds:r5(exposure),
    maxGuardSuspicion:r5(maxG),maxCameraSuspicion:r5(maxC),spottedEpisodes:spotted,chaseEntries:chase,chaseLosBreaks:losBreaks,
    clearAfterSpotted:s.mission.complete&&spotted>0,clearAfterChase:s.mission.complete&&chase>0,theftAlert:!!s.events.theftAlert,
    lockdownSwitch:switched,waitSeconds:r5(waitTotal),avoidSeconds:r5(avoid),secondsByGait:gaitTime.map(r5) as RunResult['secondsByGait'],
    catcherSuspicion:catcher?r5(catcher.suspicion):null,catcherAwareness:catcher?catcher.awareness:null,catcherInvestigating:catcher?!!catcher.localInvestigating:null};
}

/** Structure + guard-only coverage: the thief stands at the spawn, guards and cameras run for 60 s; every 0.5 tile of
 *  each authored route is tested against the real vision fans every 0.25 s. */
export function missionStructure(def:StageDefinition) {
  const stage=compileStage(def), nav=buildNavigation(stage,BODY.guardRadius), pnav=buildNavigation(stage,BODY.playerRadius+1);
  const s=createPlaygroundState(stage); s.playerMode=0;
  const len=(pts:Pt[])=>pts.slice(1).reduce((n,q,i)=>n+Math.hypot(q.x-pts[i].x,q.y-pts[i].y),0)/TILE;
  const routes={safe:def.testRoutes![0],risk:def.testRoutes![1],quickEscape:def.escapeRoutes![0],altEscape:def.escapeRoutes![1]??def.escapeRoutes![0]};
  const samples:Record<string,Pt[]>={};
  for (const [k,r] of Object.entries(routes)) {
    const pts=polyline(pnav,r.points.map(toWorld)), out:Pt[]=[];
    for (let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/(TILE/2)));for(let j=0;j<n;j++)out.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n});}
    samples[k]=out;
  }
  const shortest=polyline(pnav,[toWorld(def.playerSpawn),toWorld(objectiveTile(def))]);
  const watchCount:Record<string,number[]>={},overlap:Record<string,number[]>={};
  for (const k of Object.keys(samples)){watchCount[k]=samples[k].map(()=>0);overlap[k]=samples[k].map(()=>0);}
  let ticks=0,spawnSeen=false;
  for (let f=0;f<60*60;f++){
    stepPlayground(s,DT,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
    if (s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee)) spawnSeen=true;
    if (f%15) continue; ticks++;
    const blockers=s.effectiveVisionBlockers??stage.visionBlockers;
    for (const [k,pts] of Object.entries(samples)) pts.forEach((q,i)=>{
      const n=s.guards.filter(g=>pointVisible(g,q.x,q.y,blockers)).length+s.securityCameras.filter(c=>pointVisible(c,q.x,q.y,blockers)).length;
      if (n>0) watchCount[k][i]++; if (n>1) overlap[k][i]++;
    });
  }
  const coverage=Object.fromEntries(Object.entries(samples).map(([k,pts])=>{
    const frac=watchCount[k].map(c=>c/ticks);
    // A "danger section" is a run of consecutive samples watched ≥ 25 % of the time; "timing" sections are
    // watched sometimes (5–80 %) so a well-timed pass is possible; "pinned" ones are watched > 80 % of the time.
    let sections=0,timing=0,pinned=0,inSec=false,maxSec=0,cur=0;
    frac.forEach(v=>{ if(v>=0.25){ if(!inSec){sections++;inSec=true;cur=0;} cur++; maxSec=Math.max(maxSec,cur);} else inSec=false; });
    frac.forEach(v=>{ if(v>0.05&&v<=0.8) timing++; if(v>0.8) pinned++; });
    return [k,{tiles:r5(len(routes[k as keyof typeof routes].points.map(toWorld))),samples:pts.length,
      everWatchedPct:r5(frac.filter(v=>v>0).length/pts.length),meanWatchedPct:r5(frac.reduce((a,b)=>a+b,0)/pts.length),
      overlapSamples:overlap[k].filter(c=>c>0).length,dangerSections:sections,longestDangerTiles:r5(maxSec/2),
      timingSamples:timing,pinnedSamples:pinned}];
  }));
  let floor=0; for (const c of stage.grid) if (c===1) floor++;
  return {id:def.id,chapter:def.chapter,mission:def.mission,title:def.title,theme:def.theme,
    cols:stage.cols,rows:stage.rows,floorCells:floor,guards:(def.guards??[]).length,cameras:(def.cameras??[]).length,
    doors:(def.doors??[]).length,lockdownDoors:(def.lockdownDoors??[]).length,props:(def.props??[]).length,
    blockingProps:stage.props.length,patrolStops:(def.patrolRoutes??[]).reduce((n,r)=>n+((r as {points?:unknown[]}).points?.length??0),0),
    shortestApproachTiles:r5(len(shortest)),objectiveToExitTiles:r5(Math.hypot(objectiveTile(def).x-exitCenterTile(def).x,objectiveTile(def).y-exitCenterTile(def).y)),
    spawnSeenInIdle60s:spawnSeen,coverage};
}

function main(){
  const args=process.argv.slice(2), out=args[0];
  if (!out) throw Error('usage: campaignAudit.ts <out.json> [--missions ids] [--candidates A,B,C,E] [--strategies core|all] [--structure-only]');
  const opt=(k:string)=>{const i=args.indexOf(k);return i>=0?args[i+1]:undefined;};
  const ids=opt('--missions')?.split(',') ?? (campaign as StageDefinition[]).map(d=>d.id);
  const cands=(opt('--candidates')??'A').split(',');
  const strategySet=opt('--strategies')==='core'?CORE:[...STRATEGIES];
  const defs=(campaign as StageDefinition[]).filter(d=>ids.includes(d.id));
  const before=JSON.stringify(campaign), t0=Date.now();
  const structure=defs.map(missionStructure);
  const runs:RunResult[]=[];
  if (!args.includes('--structure-only')) {
    try {
      for (const c of cands) {
        factors.splice(0,factors.length,...CANDIDATES[c]);
        for (const def of defs) for (const st of strategySet) {
          const routes:(number|'nav')[]=st==='shortest'?['nav']:st==='safeFirst'?[0]:ROUTED.includes(st)?[0,1]:[0];
          for (const r of routes) for (const dl of DELAYS) runs.push(runMission(def,st,r,dl,c));
        }
        process.stderr.write(`candidate ${c}: ${runs.filter(x=>x.candidate===c).length} runs, ${runs.filter(x=>x.candidate===c&&x.clear).length} clear (${((Date.now()-t0)/1000).toFixed(0)} s)\n`);
      }
    } finally { factors.splice(0,factors.length,...PRODUCTION); }
  }
  if (JSON.stringify(campaign)!==before) throw Error('campaign changed during the audit');
  if (JSON.stringify(factors)!==JSON.stringify(PRODUCTION)) throw Error('tuning leaked');
  fs.writeFileSync(out,JSON.stringify({generated:new Date().toISOString(),campaignSha256:crypto.createHash('sha256').update(before).digest('hex'),
    productionFactors:PRODUCTION,candidates:Object.fromEntries(cands.map(c=>[c,CANDIDATES[c]])),strategies:strategySet,delays:DELAYS,capSeconds:CAP_S,
    structure,runs},null,0)+'\n');
  process.stderr.write(`wrote ${out}: ${structure.length} missions, ${runs.length} runs in ${((Date.now()-t0)/1000).toFixed(0)} s\n`);
}
if (process.argv[1]?.endsWith('campaignAudit.ts')) main();
