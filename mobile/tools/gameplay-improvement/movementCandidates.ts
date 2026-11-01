/**
 * Sneak / Walk / Run balance candidates (memory only, restored in finally): controlled conditions for guards and CCTV
 * (equal distance, equal exposure time, near / far, cone centre / edge, short pass / long exposure, flight from a
 * searching guard) and, optionally, the reactive-bot campaign (45 missions × 54 runs).
 *   node --import tsx tools/gameplay-improvement/movementCandidates.ts <out.json> [--campaign] [--candidates A,B,C,D]
 */
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {TILE,compileStage} from '../../src/game/world/compileStage';
import {GUARD_TUNING as T} from '../../src/game/guards/guardTuning';
import {CAMERA_TUNING} from '../../src/game/security/cctv';
import {GAIT_SPEED} from '../../src/game/core/locomotion';
import {createGuardState,createGuardEvents,stepGuard} from '../../src/game/guards/guardBrain';
import {Awareness} from '../../src/game/core/types';
import {grid} from '../gameplay-audit/riskGrid';
import {guardPass,cameraPass,G} from '../gameplay-audit/controlledExposure';
import {runMission,STRATEGIES} from '../gameplay-audit/campaignAudit';
import type {RunResult,Strategy} from '../gameplay-audit/campaignAudit';

export interface MoveCandidate {why:string;guard:number[];camera:number[]}
export const MOVE_CANDIDATES:Record<string,MoveCandidate>={
  A:{why:'production',guard:[0.28,0.35,0.8,1.6],camera:[0.64,0.68,1,1.1]},
  B:{why:'Run detection slightly up (guards)',guard:[0.28,0.35,0.8,1.8],camera:[0.64,0.68,1,1.1]},
  C:{why:'Walk relatively more efficient: walk per-tile cost between Sneak and Run beyond the close radius',guard:[0.28,0.35,0.7,1.6],camera:[0.64,0.68,1,1.1]},
  D:{why:'Observer-specific: CCTV (near the cone centre) sees stillness and sneaking less and running more; guards unchanged',guard:[0.28,0.35,0.8,1.6],camera:[0.5,0.52,0.9,1.6]},
  CD:{why:'C + D',guard:[0.28,0.35,0.7,1.6],camera:[0.5,0.52,0.9,1.6]},
};
const gf=T.movementFactor as unknown as number[], cf=CAMERA_TUNING.movement as unknown as number[];
const PROD={guard:[...gf],camera:[...cf]};
export function withCandidate<R>(c:MoveCandidate,fn:()=>R):R {
  try { gf.splice(0,4,...c.guard); cf.splice(0,4,...c.camera); return fn(); }
  finally { gf.splice(0,4,...PROD.guard); cf.splice(0,4,...PROD.camera); }
}
const r3=(v:number)=>+v.toFixed(3);
const base=compileStage((campaign as StageDefinition[])[0]).guards[0];

/** Flight from a guard that is searching (suspicion 0.6, the production search level): seconds until he re-alerts
 *  while the thief moves straight away from 1.5 tiles off his facing axis, or null if the thief leaves his sight first. */
function flight(gait:number):number|null {
  const g=createGuardState({...base,x:0,y:0,facing:0,visionRange:G.range,visionHalfAngle:G.half,route:[{x:0,y:0}]} as never), ev=createGuardEvents();
  g.awareness=Awareness.Search; g.suspicion=T.searchSuspicion; g.hasLkp=true; g.lkpX=2*TILE; g.lkpY=0;
  let t=0, x=2*TILE; const speed=GAIT_SPEED[gait];
  while (t<6) { t+=1/60; x+=speed/60; stepGuard(g,{x,y:0.6*TILE,gait},[],1/60,ev,t,false); if (g.suspicion>=1) return r3(t); if (x>G.range+TILE) return null; }
  return null;
}

export function conditions() {
  const crossings=[0.25,0.6,0.9].map(d=>({depthFrac:d,depthTiles:r3(d*G.range/TILE),short:{tiles:1},long:{tiles:4}}));
  const pass=(tiles:number,d:number,obs:'guard'|'camera')=>[1,2,3].map(m=>r3((obs==='guard'?guardPass(m,d,tiles):cameraPass(m,d,tiles)).suspicion));
  const time=(s:number,d:number,obs:'guard'|'camera')=>[0,1,2,3].map(m=>r3((obs==='guard'?guardPass(m,d,0,s):cameraPass(m,d,0,s)).suspicion));
  const g=grid() as unknown as {cells:{observer:string;depthTiles:number;angleFrac:number;runOverSneakPerTile:number;runOverWalkPerTile:number;secondsToFull:Record<string,number|null>}[]};
  return {
    equalDistance:crossings.map(c=>({depthTiles:c.depthTiles,guardShort:pass(1,c.depthFrac,'guard'),guardLong:pass(4,c.depthFrac,'guard'),cameraShort:pass(1,c.depthFrac,'camera'),cameraLong:pass(4,c.depthFrac,'camera')})),
    equalTime:crossings.map(c=>({depthTiles:c.depthTiles,guard1s:time(1,c.depthFrac,'guard'),camera1s:time(1,c.depthFrac,'camera')})),
    perTile:g.cells.filter(c=>[0,0.9].includes(c.angleFrac)).map(c=>({observer:c.observer,depthTiles:c.depthTiles,edge:c.angleFrac>0,runOverSneak:c.runOverSneakPerTile,runOverWalk:c.runOverWalkPerTile,secondsToFull:c.secondsToFull})),
    flightFromSearch:Object.fromEntries(['sneak','walk','run'].map((k,i)=>[k,flight(i+1)])),
  };
}

const ROUTED:Strategy[]=['sneak','walk','run','sneakRun','observe','cctvTiming','theftRun','adaptive'];
export function reactiveCampaign(ids?:string[]):RunResult[] {
  const defs=(campaign as StageDefinition[]).filter(d=>!ids||ids.includes(d.id)), runs:RunResult[]=[];
  for (const def of defs) for (const st of STRATEGIES) { const rs:(number|'nav')[]=st==='shortest'?['nav']:st==='safeFirst'?[0]:ROUTED.includes(st)?[0,1]:[0];
    for (const r of rs) for (const dl of [0,2,4]) runs.push(runMission(def,st,r,dl)); }
  return runs;
}

if (process.argv[1]?.endsWith('movementCandidates.ts')) {
  const args=process.argv.slice(2), out=args[0];
  if (!out) throw Error('usage: movementCandidates.ts <out.json> [--campaign] [--candidates A,B,C,D]');
  const i=args.indexOf('--candidates'), names=i>=0?args[i+1].split(','):Object.keys(MOVE_CANDIDATES);
  const result:Record<string,unknown>={production:PROD,candidates:MOVE_CANDIDATES,byCandidate:{}};
  const before=JSON.stringify(campaign);
  for (const n of names) { const c=MOVE_CANDIDATES[n], t0=Date.now();
    const row:Record<string,unknown>={conditions:withCandidate(c,conditions)};
    if (args.includes('--campaign')) { const runs=withCandidate(c,()=>reactiveCampaign());
      row.reactive={clear:runs.filter(r=>r.clear).length,total:runs.length,
        byStrategy:Object.fromEntries(STRATEGIES.map(s=>[s,runs.filter(r=>r.strategy===s&&r.clear).length])),
        byChapter:Object.fromEntries([1,2,3,4,5,6,7,8,9].map(ch=>[ch,runs.filter(r=>+r.id.slice(0,2)===ch&&r.clear).length])),
        byMission:Object.fromEntries([...new Set(runs.map(r=>r.id))].map(id=>[id,runs.filter(r=>r.id===id&&r.clear).length])),
        chaseClears:runs.filter(r=>r.clearAfterChase).length,chaseRuns:runs.filter(r=>r.chaseEntries>0).length,contact:runs.filter(r=>r.outcome==='caught-contact').length}; }
    (result.byCandidate as Record<string,unknown>)[n]=row;
    process.stderr.write(`${n}: ${((Date.now()-t0)/1000).toFixed(0)} s ${row.reactive?JSON.stringify((row.reactive as {clear:number}).clear):''}\n`);
  }
  if (JSON.stringify(campaign)!==before) throw Error('campaign changed');
  if (JSON.stringify([gf,cf])!==JSON.stringify([PROD.guard,PROD.camera])) throw Error('tuning leaked');
  fs.writeFileSync(out,JSON.stringify(result,null,1)+'\n');
}
