/** Offline-only risk experiment: production simulation, no campaign writes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage} from '../../src/game/world/compileStage';
import {createGuardState,createGuardEvents,stepGuard} from '../../src/game/guards/guardBrain';
import {GUARD_TUNING} from '../../src/game/guards/guardTuning';
import {GAIT_SPEED} from '../../src/game/core/locomotion';
import {exposureRun} from '../campaign/cameraExposure';
import {heistRun,HEIST_MATRIX} from '../campaign/v12Phase5Bot';
import {auditDifficulty} from '../campaign/chapterDifficultyAudit';
const ids=['01-02','05-03','08-03'];
const original=JSON.stringify(stages), originalFactor=GUARD_TUNING.movementFactor[3];
const factors=GUARD_TUNING.movementFactor as unknown as number[];
function crossing(mode:number,length:number){
 const base=compileStage((stages as StageDefinition[]).find(s=>s.id==='01-02')!).guards[0];
 const g=createGuardState({...base,x:0,y:0,facing:0,visionRange:400,visionHalfAngle:Math.PI/3});
 const ev=createGuardEvents();let elapsed=0,travelled=0,seen=0;
 while(travelled<length-1e-9){
  const dt=Math.min(1/60,(length-travelled)/GAIT_SPEED[mode]);
  travelled+=GAIT_SPEED[mode]*dt;elapsed+=dt;
  stepGuard(g,{x:180,y:-length/2+travelled,gait:mode},[],dt,ev,elapsed,false);
  if(g.canSee)seen+=dt;
 }
 return {mode,length,distance:travelled,seconds:elapsed,visibleSeconds:seen,suspicion:g.suspicion,alert:ev.alertCount>0};
}
function evaluate(id:string){
 const def=(stages as StageDefinition[]).find(s=>s.id===id)!;
 const runs:({mode:number;approach:number;escape:number;delay:number}&ReturnType<typeof exposureRun>)[]=[];
 for(const mode of [1,2,3])for(const approach of [0,1])for(const escape of [0,1])for(const delay of [0,2,4])
  runs.push({mode,approach,escape,delay,...exposureRun(def,approach,escape,mode,delay)});
 const heists=HEIST_MATRIX.map(m=>({...m,...heistRun(def,m.approach,m.startDelay,m.patience)}));
 return {id,guards:def.guards.length,cameras:def.cameras??[],routes:def.testRoutes,escapes:def.escapeRoutes,
  patrolRoutes:def.patrolRoutes,axes:auditDifficulty(def),
  byGait:[1,2,3].map(mode=>{const rs=runs.filter(r=>r.mode===mode);return {mode,count:rs.length,
   clear:rs.filter(r=>r.clear).length,caught:rs.filter(r=>r.caught).length,
   spotted:rs.filter(r=>r.spottedBy).length,cameraAlert:rs.filter(r=>r.cameraAlertAt!==null).length};}),
  heistSummary:{count:heists.length,clear:heists.filter(r=>r.clear).length,pickup:heists.filter(r=>r.pickupAt!==null).length,
   theft:heists.filter(r=>r.theftAt!==null).length,spotted:heists.filter(r=>r.spottedAt!==null).length,
   prePickupCaught:heists.filter(r=>r.caught&&r.pickupAt===null).length,postPickupCaught:heists.filter(r=>r.caught&&r.pickupAt!==null).length},runs,heists};
}
const variants=[];
try{
 for(const factor of [originalFactor,1.8,2]){
  factors[3]=factor;
  const crossings=[24,80].map(length=>({length,runs:[1,2,3].map(mode=>crossing(mode,length))}));
  const missions=ids.map(id=>{const row=evaluate(id);console.log(JSON.stringify({factor,id,byGait:row.byGait,heist:row.heistSummary}));return row;});
  variants.push({runMovementFactor:factor,status:factor===originalFactor?'BASELINE':'PLACEHOLDER_OFFLINE_ONLY',crossings,missions});
 }
}finally{factors[3]=originalFactor;}
assert.equal(JSON.stringify(stages),original,'Campaign mutation');
assert.equal(GUARD_TUNING.movementFactor[3],originalFactor,'Candidate tuning leaked');
assert.deepEqual(crossing(3,24),variants[0].crossings[0].runs[2],'Crossing deterministic');
const replay=exposureRun((stages as StageDefinition[]).find(s=>s.id==='08-03')!,0,0,3,0);
const first=variants[0].missions[2].runs.find(r=>r.mode===3&&r.approach===0&&r.escape===0&&r.delay===0)!;
assert.equal(JSON.stringify(replay),JSON.stringify({clear:first.clear,caught:first.caught,time:first.time,spottedBy:first.spottedBy,cameraAlertAt:first.cameraAlertAt,cameras:first.cameras}),'Mission deterministic');
const out=process.argv[2]??'docs/reports/stability-2026-10-23/gameplay.json';
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({seed:'No random source in production patrol/security/playground; fixed authored phases and delays [0,2,4]. Replay asserted.',
 method:'60Hz production stepGuard crossing, no patrol but real glance/perception/suspicion. Fixed routes use stepPlayground including acceleration/AI/CCTV/theft/doors; approach gait is selected, escape always Run. 24 cone-aware heists per mission/variant. Not human win rates.',
 limitations:'Controlled crossing starts at constant speed and excludes Tilt/moving guards. Full-heist runners use developer tap targets. Candidate gain temporarily changed only inside this Node process, restored in finally.',
 campaignSha256:crypto.createHash('sha256').update(original).digest('hex'),campaignUnchanged:true,replayAssertions:2,variants},null,2)+'\n');
console.log(out);
