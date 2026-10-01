/** Desktop JS CCTV-only profiling. No phone runtime, frame rate, or native performance claim. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage} from '../../src/game/world/compileStage';
import {createGuardEvents} from '../../src/game/guards/guardBrain';
import {createSecurityCamera,stepSecurityCameras} from '../../src/game/security/cctv';
const source=process.argv[2]??'src/game/levels/stages/campaignStages.json';
const stages:StageDefinition[]=JSON.parse(fs.readFileSync(source,'utf8'));
const def=stages.find(s=>s.id==='03-10');if(!def)throw new Error('03-10 must exist before benchmark');
const stage=compileStage(def);if(!stage.cameras?.length)throw new Error('03-10 needs authored CCTV');
const runs=[1,stage.cameras.length,8].filter((v,i,list)=>list.indexOf(v)===i).map(count=>{
 const cameras=Array.from({length:count},(_,i)=>createSecurityCamera({...stage.cameras![i%stage.cameras!.length],id:`benchmark-${i}`}));
 const ev=createGuardEvents(),p={x:stage.objective.x,y:stage.objective.y,gait:2};
 for(let f=0;f<600;f++)stepSecurityCameras(cameras,p,stage.visionBlockers,ev,1/60,f/60);
 const durations:number[]=[];let total=0;
 for(let f=0;f<3600;f++){
  const start=performance.now();stepSecurityCameras(cameras,p,stage.visionBlockers,ev,1/60,10+f/60);const ms=performance.now()-start;
  total+=ms;durations.push(ms);
 }
 durations.sort((a,b)=>a-b);
 return {cameras:count,authoredLayout:count===stage.cameras!.length,syntheticRepeatedCameraStress:count>stage.cameras!.length,frames:3600,totalMs:total,meanStepMs:total/3600,p50Ms:durations[1800],p95Ms:durations[3420],p99Ms:durations[3564],maxMs:durations.at(-1),pathfindingCalls:0};
});
const cameraSource=fs.readFileSync('src/game/security/cctv.ts','utf8');
if(/\b(findPath|buildNavigation|travel|pursue)\s*\(/.test(cameraSource))throw new Error('CCTV module unexpectedly calls navigation');
const report={method:'Node.js performance.now desktop CPU, CCTV-only actual shared Guard Vision fan/ray LOS on 03-10 blockers, 600 warmup + 3600 measured fixed dt frames; not native worklet/device/60FPS acceptance. Timing includes performance.now call overhead. Camera-only does not include renderer, guards, animation, audio or input.',source,sourceSha256:crypto.createHash('sha256').update(JSON.stringify(def)).digest('hex'),mission:def.id,node:process.version,platform:process.platform,arch:process.arch,authoredCameras:stage.cameras.length,visionBlockers:stage.visionBlockers.length/4,guardCount:stage.guards.length,nativeMeasured:false,native60FPSClaim:false,heavyPathfindingInCameraModule:false,runs};
fs.mkdirSync('Reports/SecurityBankV1',{recursive:true});fs.writeFileSync('Reports/SecurityBankV1/cctv-cpu-benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
