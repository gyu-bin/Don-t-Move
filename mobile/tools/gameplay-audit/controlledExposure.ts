/**
 * Controlled detection fixtures (no map, no walls): one production guard or camera, a thief crossing its cone.
 * Uses the production stepGuard / stepSecurityCameras / suspicionGain; vision range and angle are the campaign medians.
 *   node --import tsx tools/gameplay-audit/controlledExposure.ts <out.json>
 */
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {createGuardState,createGuardEvents,stepGuard} from '../../src/game/guards/guardBrain';
import {createSecurityCamera,stepSecurityCameras} from '../../src/game/security/cctv';
import {GUARD_TUNING} from '../../src/game/guards/guardTuning';
import {GAIT_SPEED} from '../../src/game/core/locomotion';
import {CANDIDATES} from './campaignAudit';

const defs=campaign as StageDefinition[];
const compiled=defs.map(compileStage);
const median=(a:number[])=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
const guards=compiled.flatMap(s=>s.guards), cams=compiled.flatMap(s=>s.cameras??[]);
export const G={range:median(guards.map(g=>g.visionRange)),half:median(guards.map(g=>g.visionHalfAngle))};
export const Cm={range:median(cams.map(c=>c.range)),angle:median(cams.map(c=>c.visionAngle)),rate:median(cams.map(c=>c.suspicionRate??.4))};
const r4=(v:number)=>+v.toFixed(4);
const factors=GUARD_TUNING.movementFactor as unknown as number[], PRODUCTION=[...factors];
const NAMES=['idle','sneak','walk','run'];

/** Thief moves along a line perpendicular to the cone axis at `depth` (fraction of range), `offset` across it. */
export function guardPass(mode:number, depthFrac:number, tiles:number, seconds?:number) {
  const g=createGuardState({...compiled[0].guards[0],x:0,y:0,facing:0,visionRange:G.range,visionHalfAngle:G.half,route:[{x:0,y:0}]} as never);
  const ev=createGuardEvents(), depth=depthFrac*G.range, dist=tiles*TILE;
  const speed=GAIT_SPEED[mode]||0, T=seconds??dist/speed;
  let t=0, alertAt:number|null=null, peak=0;
  while (t<T-1e-9) {
    const dt=Math.min(1/60,T-t); t+=dt;
    const y=seconds||speed===0 ? 0 : -dist/2+speed*t;
    stepGuard(g,{x:depth,y,gait:mode},[],dt,ev,t,false);
    peak=Math.max(peak,g.suspicion); if (alertAt===null&&g.suspicion>=1) alertAt=t;
  }
  return {gait:NAMES[mode],seconds:r4(T),suspicion:r4(g.suspicion),peak:r4(peak),alertAt:alertAt===null?null:r4(alertAt)};
}
/** Seconds of continuous centre-line exposure until the guard reaches suspicion 1 (cap 10 s). */
export function timeToAlert(mode:number, depthFrac:number) {
  const g=createGuardState({...compiled[0].guards[0],x:0,y:0,facing:0,visionRange:G.range,visionHalfAngle:G.half,route:[{x:0,y:0}]} as never);
  const ev=createGuardEvents(); let t=0;
  while (t<10&&g.suspicion<1) { t+=1/60; stepGuard(g,{x:depthFrac*G.range,y:0,gait:mode},[],1/60,ev,t,false); }
  return g.suspicion>=1?r4(t):null;
}
export function cameraPass(mode:number, depthFrac:number, tiles:number, seconds?:number) {
  const cam=createSecurityCamera({id:'c',x:0,y:0,centerFacing:0,sweepAngle:0,sweepSpeed:0,pauseAtEnds:0,range:Cm.range,visionAngle:Cm.angle,suspicionRate:Cm.rate} as never);
  const ev=createGuardEvents(), depth=depthFrac*Cm.range, dist=tiles*TILE, speed=GAIT_SPEED[mode]||0, T=seconds??dist/speed;
  let t=0, alertAt:number|null=null;
  while (t<T-1e-9) { const dt=Math.min(1/60,T-t); t+=dt; const y=seconds?0:-dist/2+speed*t;
    stepSecurityCameras([cam],{x:depth,y,gait:mode},[],ev,dt,t); if (alertAt===null&&cam.alerted) alertAt=t; }
  return {gait:NAMES[mode],seconds:r4(T),suspicion:r4(cam.suspicion),alertAt:alertAt===null?null:r4(alertAt)};
}

function battery() {
  const depths=[0.3,0.6,0.9];
  return {
    equalDistance: depths.flatMap(d=>[1,2,4].map(tiles=>({depthFrac:d,tiles,guard:[1,2,3].map(m=>guardPass(m,d,tiles)),camera:[1,2,3].map(m=>cameraPass(m,d,tiles))}))),
    equalTime: depths.flatMap(d=>[0.5,1,2].map(s=>({depthFrac:d,seconds:s,guard:[0,1,2,3].map(m=>guardPass(m,d,0,s)),camera:[0,1,2,3].map(m=>cameraPass(m,d,0,s))}))),
    timeToAlert: depths.map(d=>({depthFrac:d,seconds:Object.fromEntries([0,1,2,3].map(m=>[NAMES[m],timeToAlert(m,d)]))})),
  };
}
function main(){
const out=process.argv[2]; if (!out) throw Error('usage: controlledExposure.ts <out.json>');
const results:Record<string,ReturnType<typeof battery>>={};
try { for (const [k,v] of Object.entries(CANDIDATES)) { factors.splice(0,factors.length,...v); results[k]=battery(); } }
finally { factors.splice(0,factors.length,...PRODUCTION); }
const again=battery();
if (JSON.stringify(again)!==JSON.stringify(results.A)) throw Error('controlled fixture not deterministic');
fs.writeFileSync(out,JSON.stringify({guardMedian:{range:G.range,rangeTiles:r4(G.range/TILE),halfAngleDeg:r4(G.half*180/Math.PI)},
  cameraMedian:{range:Cm.range,rangeTiles:r4(Cm.range/TILE),angleDeg:r4(Cm.angle*180/Math.PI),suspicionRate:Cm.rate},
  gaitSpeed:GAIT_SPEED,candidates:CANDIDATES,results},null,1)+'\n');
console.log('wrote',out,'guard',G,'camera',Cm);
}
if (process.argv[1]?.endsWith('controlledExposure.ts')) main();
