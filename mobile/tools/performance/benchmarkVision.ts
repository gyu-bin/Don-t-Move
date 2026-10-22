/** Node CPU-kernel A/B only: never report these timings as phone/GPU/battery measurements. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import ts from 'typescript';
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage} from '../../src/game/world/compileStage';
import type {VisionFan} from '../../src/game/guards/guardVision';

type Kernel={buildVisionFan:(g:VisionFan,blocks:number[])=>boolean|void;createFanBuffers:()=>{fan:number[];fanAng:number[]}};
const sourcePath=path.resolve('src/game/guards/guardVision.ts');
const baselineRef=process.argv[2]??'b8e4045';
const out=process.argv[3]??'docs/reports/performance/vision-benchmark.json';
const legacy=execFileSync('git',['show',`${baselineRef}:mobile/src/game/guards/guardVision.ts`],{encoding:'utf8'});
function kernel(source:string):Kernel {
 const exports={};
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const factory=vm.runInThisContext(`(function(require,exports){${js}\n})`,{filename:sourcePath});
 factory(createRequire(sourcePath),exports);
 return exports as Kernel;
}
// Same transpiler/VM/dependencies for both versions; only guardVision differs.
const before=kernel(legacy),after=kernel(fs.readFileSync(sourcePath,'utf8'));
const results=[];
for(const id of ['01-02','05-03','08-03']){
 const stage=compileStage((stages as StageDefinition[]).find(s=>s.id===id)!);
 const guard=stage.guards[0];
 const make=(k:Kernel):VisionFan=>({...guard,fanCount:0,...k.createFanBuffers()});
 for(const mode of ['stationary','moving','repeat-observation'] as const){
  const run=(k:Kernel)=>{
   const g=make(k);let rebuilt=0,hits=0;
   const start=performance.now();
   for(let i=0;i<12000;i++){
    const tick=mode==='stationary'?0:mode==='repeat-observation'?Math.floor(i/2):i;
    // Same deterministic world poses for both implementations. Repeated queries
    // model a second perception pass; this is not a full game-loop replay.
    g.facing=guard.facing+Math.sin(tick*.01)*.4;
    g.x=guard.x+Math.sin(tick*.007)*20;
    const result=k.buildVisionFan(g,stage.visionBlockers);
    if(result===false)hits++;else rebuilt++;
   }
   return {ms:performance.now()-start,rebuilt,hits};
  };
  run(before);run(after);
  const timings={before:[] as number[],after:[] as number[]};let counts={rebuilt:0,hits:0};
  for(let r=0;r<7;r++)for(const name of r%2?['after','before'] as const:['before','after'] as const){
   const result=run(name==='before'?before:after);timings[name].push(result.ms);
   if(name==='after')counts={rebuilt:result.rebuilt,hits:result.hits};
  }
  const median=(values:number[])=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const a=median(timings.before),b=median(timings.after);
  // Check exactly the arrays/visibility results the renderer/detection consume.
  const g0=make(before),g1=make(after);
  before.buildVisionFan(g0,stage.visionBlockers);after.buildVisionFan(g1,stage.visionBlockers);
  if(JSON.stringify([g0.fanCount,g0.fan,g0.fanAng])!==JSON.stringify([g1.fanCount,g1.fan,g1.fanAng]))throw Error(`${id}: geometry changed`);
  results.push({id,mode,queries:12000,blockers:stage.visionBlockers.length/4,fanPoints:g1.fanCount,
   beforeMedianMs:+a.toFixed(2),afterMedianMs:+b.toFixed(2),cpuKernelChangePercent:+((b/a-1)*100).toFixed(2),...counts});
 }
}
fs.mkdirSync(path.dirname(out),{recursive:true});
const report={baselineRef,node:process.version,platform:process.platform,arch:process.arch,
 method:'12,000 equivalent vision-kernel queries, 1 warmup + 7 interleaved A/B rounds. Identical compiler and dependencies. Stationary, continuously moving and paired same-pose query scenarios. Geometry arrays compared exactly.',
 limitation:'Desktop Node CPU-kernel microbenchmark only. Not actual gameplay timings, phone battery drain, thermal improvement, GPU time, or human difficulty.',results};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.table(results);console.log(out);
