/** Offline candidate evaluation only. Never rewrites the baked campaign or authoring plans. */
import fs from 'node:fs';
import path from 'node:path';
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {auditDifficulty} from '../campaign/chapterDifficultyAudit';
import {heistRun,HEIST_MATRIX} from '../campaign/v12Phase5Bot';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {BODY,GUARD_TUNING} from '../../src/game/guards/guardTuning';
import {GAIT_SPEED} from '../../src/game/core/locomotion';
import {exposureRun} from '../campaign/cameraExposure';

// Optional experiment affects only this offline process, never the game or baked maps.
// Usage: npm run perf:gameplay -- /tmp/result.json 1.95
const trialRunFactor = process.argv[3] === undefined ? undefined : Number(process.argv[3]);
if (trialRunFactor !== undefined) {
 if (!Number.isFinite(trialRunFactor) || trialRunFactor <= 0) throw new Error('Run factor must be a positive number');
 (GUARD_TUNING.movementFactor as unknown as number[])[3] = trialRunFactor;
}

function candidate(source:StageDefinition):StageDefinition {
 const s=structuredClone(source);
 if(s.id==='05-03'){
  // Separate physical patrol bodies from the risk crossing (6px -> 24px).
  const g=s.guards.find(g=>g.id==='05-03-g1')!;
  const route=s.patrolRoutes.find(r=>r.id===g.routeId)!;
  for(const p of route.points)p.y=14.3;
  g.y=14.3;
  for(const p of g.theftPosts??[])if(p.y===14.75)p.y=14.3;
  for(const sector of g.theftSearchSectors??[])for(const p of sector.anchors)if(p.y===14.75)p.y=14.3;
  const exit=s.patrolRoutes.find(r=>r.id==='05-03-g3')!;
  exit.points.find(p=>p.waitDuration===6)!.waitDuration=8;
 }
 if(s.id==='08-03'){
  // First hypothesis: a clear physical inspection post plus a real doorway look.
  const g=s.guards.find(g=>g.id==='08-03-g5')!;
  const route=s.patrolRoutes.find(r=>r.id===g.routeId)!;
  route.points[0].x=1.5;g.x=1.5;
  for(const p of g.theftPosts??[])if(p.x===2&&p.y===5.6)p.x=1.5;
  for(const sector of g.theftSearchSectors??[])for(const p of sector.anchors)if(p.x===2&&p.y===5.6)p.x=1.5;
  const corridor=s.patrolRoutes.find(r=>r.id==='08-03-g2')!;
  corridor.points[0].lookDirection=Math.atan2(8.8-10.9,15.25-13.5);
  // Distinct CCTV rhythms remove a single shared blind-window shortcut.
  s.cameras!.find(c=>c.id==='08-03-cam2')!.sweepSpeed=.43;
  s.cameras!.find(c=>c.id==='08-03-cam3')!.sweepSpeed=.29;
  // Observe the upper connector that the approach actually crosses, rather than
  // spending the whole sweep facing the lower parallel lane.
  s.cameras!.find(c=>c.id==='08-03-cam3')!.centerFacing=Math.PI;
 }
 return s;
}
function evaluate(def:StageDefinition){
 const axes=auditDifficulty(def);
 const stage=compileStage(def),patrolErrors:string[]=[];
 // Navigation clearance gate; this does not certify timing or difficulty.
 for(const g of stage.guards)for(let i=0;i<g.route.length;i++){
  const a=g.route[i],b=g.route[(i+1)%g.route.length];
  if(!clearSegment(a.x,a.y,b.x,b.y,stage.movementBlockers,BODY.guardRadius))
   patrolErrors.push(`${g.id}:${i} requires navigation (not a straight clear segment)`);
 }
 const runs=HEIST_MATRIX.map(m=>({...m,...heistRun(def,m.approach,m.startDelay,m.patience)}));
 const fixedRuns:({mode:number;approach:number;escape:number;delay:number}&ReturnType<typeof exposureRun>)[]=[];
 for(const mode of [1,2,3])for(const approach of [0,1])for(const escape of [0,1])for(const delay of [0,2,4]){
  fixedRuns.push({mode,approach,escape,delay,...exposureRun(def,approach,escape,mode,delay)});
 }
 const fixedByGait=[1,2,3].map(mode=>{const subset=fixedRuns.filter(r=>r.mode===mode);
  return {mode,runs:subset.length,clears:subset.filter(r=>r.clear).length,
   spotted:subset.filter(r=>r.spottedBy).length,caught:subset.filter(r=>r.caught).length};});
 return {axes,patrolStraightSegmentNotes:patrolErrors,fixedByGait,fixedRuns,summary:{runs:runs.length,clears:runs.filter(r=>r.clear).length,
  safeClears:runs.filter(r=>r.clear&&r.approach===0).length,riskClears:runs.filter(r=>r.clear&&r.approach===1).length,
  beforePickupContact:runs.filter(r=>r.caught&&r.pickupAt===null).length,afterPickupContact:runs.filter(r=>r.caught&&r.pickupAt!==null).length,
  spotted:runs.filter(r=>r.spottedAt!==null).length,confirmedTheft:runs.filter(r=>r.theftAt!==null).length},runs};
}
const rows=[];
for(const id of ['01-02','05-03','08-03']){
 const source=(stages as StageDefinition[]).find(s=>s.id===id)!;
 console.log('Auditing',id);
 const baseline=evaluate(source),draft=candidate(source),proposal=id==='01-02'?null:evaluate(draft);
 const sameSpeed=source.guards.every((g,i)=>g.pace===draft.guards[i].pace);
 const compiled=compileStage(draft);
 const allAnchorsClear=compiled.guards.every(g=>g.route.every(p=>clearSegment(p.x,p.y,p.x,p.y,compiled.movementBlockers,BODY.guardRadius)));
 rows.push({id,status:'OFFLINE_CANDIDATE_NOT_APPLIED',baseline,proposal,
  gates:{sameGuardPace:sameSpeed,allPatrolAnchorsClear:allAnchorsClear,humanTiltVerified:false,
   increasedApproachExposure:proposal?proposal.axes.safeRouteExposure>baseline.axes.safeRouteExposure:null,
   hasScriptedClear:proposal?proposal.summary.clears>0:null},
  ...(proposal?{candidateDefinition:draft}:{}),worldTileSize:TILE});
 console.log(id,JSON.stringify({baseline:baseline.summary,proposal:proposal?.summary}));
}
const out=process.argv[2]??'docs/reports/performance/representative-gameplay.json';
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({method:'60s actual patrol/CCTV sampled2Hz plus 24 cone-aware full-heist runs and36 fixed-route/gait runs per variant (3 gaits ×2 approaches ×2 escapes ×3 delays). Keep-distance bot option is off; replays are proxies, not human success rates. Escape always runs in the fixed-gait runner, so its gait comparison applies to approach only. Existing timer/collision retained.',
 trialRunFactor:trialRunFactor??null,
 sameDistanceRisk:{assumptions:'Constant gait, equal path, same observer/distance/cone/body visibility and no saturation/decay. Algebraic exposure comparison, not a complete detection-time model.',
  speedWalk:GAIT_SPEED[2],speedRun:GAIT_SPEED[3],walkGain:GUARD_TUNING.movementFactor[2],runGain:GUARD_TUNING.movementFactor[3],
  runToWalkGainPerDistance:(GUARD_TUNING.movementFactor[3]/GAIT_SPEED[3])/(GUARD_TUNING.movementFactor[2]/GAIT_SPEED[2])},
 humanPlaytestVerified:false,productionCampaignChanged:false,rows},null,2)+'\n');
console.log(out);
