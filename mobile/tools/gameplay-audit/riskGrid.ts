/**
 * Detection risk by distance × view angle × gait, for one guard and one CCTV (campaign medians, no walls).
 * Instantaneous rates come from the production code (observeGuard + suspicionGain; one stepSecurityCameras frame),
 * so no state evolves between cells. Derived: time to full suspicion, cost per tile travelled, Run/Sneak ratio,
 * and the hide time needed to clear suspicion again.
 *   node --import tsx tools/gameplay-audit/riskGrid.ts <out.json>
 */
import fs from 'node:fs';
import {TILE} from '../../src/game/world/compileStage';
import {createGuardState,createGuardEvents,observeGuard,suspicionGain} from '../../src/game/guards/guardBrain';
import {createSecurityCamera,stepSecurityCameras} from '../../src/game/security/cctv';
import {GUARD_TUNING as T} from '../../src/game/guards/guardTuning';
import {GAIT_SPEED} from '../../src/game/core/locomotion';
import {G,Cm} from './controlledExposure';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage} from '../../src/game/world/compileStage';

export const DEPTHS = [0.1,0.2,0.3,0.45,0.6,0.75,0.9];
export const ANGLES = [0,0.5,0.9];
const GAITS = ['idle','sneak','walk','run'] as const;
const r4 = (v:number) => +v.toFixed(4);
const baseGuard = compileStage((campaign as StageDefinition[])[0]).guards[0];

function guardRate(depth:number, angle:number, gait:number):number {
  const g=createGuardState({...baseGuard,x:0,y:0,facing:0,visionRange:G.range,visionHalfAngle:G.half,route:[{x:0,y:0}]} as never);
  const a=angle*G.half, d=depth*G.range;
  observeGuard(g,{x:Math.cos(a)*d,y:Math.sin(a)*d,gait},[]);
  return suspicionGain(g,gait);
}
function cameraRate(depth:number, angle:number, gait:number):number {
  const cam=createSecurityCamera({id:'c',x:0,y:0,centerFacing:0,sweepAngle:0,sweepSpeed:0,pauseAtEnds:0,range:Cm.range,visionAngle:Cm.angle,suspicionRate:Cm.rate} as never);
  const a=angle*Cm.angle/2, d=depth*Cm.range;
  stepSecurityCameras([cam],{x:Math.cos(a)*d,y:Math.sin(a)*d,gait},[],createGuardEvents(),1/60,0);
  return cam.detectionGain;
}

export function grid() {
  const cells:Record<string,unknown>[]=[];
  for (const observer of ['guard','camera'] as const) for (const depth of DEPTHS) for (const angle of ANGLES) {
    const rate=GAITS.map((_,i)=>observer==='guard'?guardRate(depth,angle,i):cameraRate(depth,angle,i));
    const tilesPerSecond=GAIT_SPEED.map(v=>v/TILE);
    const perTile=rate.map((r,i)=>i===0?null:r/tilesPerSecond[i]);
    cells.push({observer,depthFrac:depth,depthTiles:r4(depth*(observer==='guard'?G.range:Cm.range)/TILE),angleFrac:angle,
      ratePerSecond:Object.fromEntries(GAITS.map((k,i)=>[k,r4(rate[i])])),
      secondsToFull:Object.fromEntries(GAITS.map((k,i)=>[k,rate[i]>0?r4(1/rate[i]):null])),
      costPerTile:Object.fromEntries(GAITS.slice(1).map((k,i)=>[k,r4(perTile[i+1] as number)])),
      runOverSneakPerTile:rate[1]>0?r4((perTile[3] as number)/(perTile[1] as number)):null,
      runOverWalkPerTile:rate[2]>0?r4((perTile[3] as number)/(perTile[2] as number)):null,
      idleOverSneakPerSecond:rate[1]>0?r4(rate[0]/rate[1]):null});
  }
  // Hiding: suspicion is kept for memorySeconds, then decays at decayPerSecond (guards and CCTV alike).
  const hideToClear=[0.25,0.5,0.75,0.99].map(s=>({from:s,seconds:r4(T.memorySeconds+s/T.decayPerSecond)}));
  return {guard:{rangeTiles:r4(G.range/TILE),halfAngleDeg:r4(G.half*180/Math.PI),closeRadiusTiles:r4(T.closeDetectionRadius/TILE)},
    camera:{rangeTiles:r4(Cm.range/TILE),angleDeg:r4(Cm.angle*180/Math.PI),rate:Cm.rate},speedsTilesPerSecond:GAIT_SPEED.map(v=>r4(v/TILE)),cells,hideToClear};
}

if (process.argv[1]?.endsWith('riskGrid.ts')) {
  const out=process.argv[2]; if (!out) throw Error('usage: riskGrid.ts <out.json>');
  const g=grid(); fs.writeFileSync(out,JSON.stringify(g,null,1)+'\n');
  for (const c of g.cells as {observer:string;depthTiles:number;angleFrac:number;secondsToFull:Record<string,number|null>;runOverSneakPerTile:number|null;runOverWalkPerTile:number|null;idleOverSneakPerSecond:number|null}[])
    console.log(c.observer.padEnd(6),String(c.depthTiles).padEnd(6),c.angleFrac,'t→1 I/S/W/R',Object.values(c.secondsToFull).map(v=>v===null?'-':v.toFixed(2)).join('/'),'R/S per tile',c.runOverSneakPerTile,'R/W',c.runOverWalkPerTile,'I/S per s',c.idleOverSneakPerSecond);
  console.log('hide to clear',JSON.stringify(g.hideToClear));
}
