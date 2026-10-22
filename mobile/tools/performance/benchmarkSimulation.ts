/** Isolated CommonJS loaders let the same real simulation run with old/new vision only. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import ts from 'typescript';

type Counts={requests:number;rebuilds:number};
const baselineRef=process.argv[2]??'b8e4045';
const oldVision=execFileSync('git',['show',`${baselineRef}:mobile/src/game/guards/guardVision.ts`],{encoding:'utf8'});
const root=path.resolve('.');
function simulation(legacy:boolean){
 const cache=new Map<string,any>(),counts:Counts={requests:0,rebuilds:0};
 function load(file:string):any {
  if(cache.has(file))return cache.get(file);
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
  const exports:any={};cache.set(file,exports);
  const source=legacy&&file.endsWith('/guards/guardVision.ts')?oldVision:fs.readFileSync(file,'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const factory=vm.runInThisContext(`(function(require,exports,__DEV__){${js}\n})`,{filename:file});
  factory((name:string)=>{
   if(!name.startsWith('.'))return createRequire(file)(name);
   const p=path.resolve(path.dirname(file),name);
   return load(fs.existsSync(p)&&fs.statSync(p).isFile()?p:`${p}.ts`);
  },exports,false);
  if(file.endsWith('/guards/guardVision.ts')){
   const original=exports.buildVisionFan;
   exports.buildVisionFan=(...args:any[])=>{counts.requests++;const changed=original(...args);if(changed!==false)counts.rebuilds++;return changed;};
  }
  return exports;
 }
 const {compileStage}=load(path.join(root,'src/game/world/compileStage.ts'));
 const {buildNavigation}=load(path.join(root,'src/game/world/navigation.ts'));
 const {createPlaygroundState}=load(path.join(root,'src/game/playground/playgroundState.ts'));
 const {stepGuards}=load(path.join(root,'src/game/guards/guardSystem.ts'));
 const {stepSecurityCameras}=load(path.join(root,'src/game/security/cctv.ts'));
 const {BODY}=load(path.join(root,'src/game/guards/guardTuning.ts'));
 const defs=load(path.join(root,'src/game/levels/stages/campaignStages.json'));
 function run(id:string,phase:'patrol'|'theft'|'alert'){
  const stage=compileStage(defs.find((s:any)=>s.id===id));
  const nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
  const hidden={x:-10000,y:-10000,gait:0};
  if(phase==='theft')s.theft.empty=true;
  counts.requests=counts.rebuilds=0;
  const snapshots:string[]=[];
  const start=performance.now();
  for(let tick=0;tick<7200;tick++){
   const t=(tick+1)/60;
   if(phase==='alert'&&tick%1800===0){
    s.events.globalAlert=true;s.events.globalRevision++;
    s.events.globalX=stage.playerSpawn.x;s.events.globalY=stage.playerSpawn.y;
   }
   stepSecurityCameras(s.securityCameras,hidden,stage.visionBlockers,s.events,1/60,t);
   stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,t,true,1,s.theft);
   if(tick%600===0)snapshots.push(JSON.stringify({
    events:s.events,guards:s.guards.map(({fanCache,...g}:any)=>g),
    cameras:s.securityCameras.map(({fanCache,...c}:any)=>c),
   }));
  }
  return {ms:performance.now()-start,...counts,digest:crypto.createHash('sha256').update(snapshots.join('\n')).digest('hex')};
 }
 return {run};
}
const before=simulation(true),after=simulation(false),rows=[];
for(const id of ['01-02','05-03','08-03'])for(const phase of ['patrol','theft','alert'] as const){
 before.run(id,phase);after.run(id,phase);
 const times={before:[] as number[],after:[] as number[]};let a:any,b:any;
 for(let i=0;i<5;i++)for(const which of i%2?['after','before'] as const:['before','after'] as const){
  const result=(which==='before'?before:after).run(id,phase);times[which].push(result.ms);
  if(which==='before')a=result;else b=result;
 }
 if(a.digest!==b.digest)throw Error(`${id}/${phase}: simulation state changed`);
 const median=(xs:number[])=>xs.sort((a,b)=>a-b)[Math.floor(xs.length/2)];
 const old=median(times.before),current=median(times.after);
 const row={id,phase,simulationSeconds:120,beforeMs:+old.toFixed(2),afterMs:+current.toFixed(2),
  changePercent:+((current/old-1)*100).toFixed(2),requests:b.requests,rebuilds:b.rebuilds,
  skipped:b.requests-b.rebuilds,stateIdentical:true,digest:b.digest};
 rows.push(row);console.log(JSON.stringify(row));
}
const out='docs/reports/performance/simulation-benchmark.json';
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({baselineRef,node:process.version,method:'Two private module loaders, same TypeScript compiler/dependencies/simulation code and maps; only old/new guardVision differs. 120s at60Hz, one warmup and5 interleaved A/B rounds. Full guard/CCTV/events snapshots excluding cache compared every10s.',
 scope:'Security simulation CPU on desktop Node only. Excludes render/GPU, Tilt, player movement and native energy/temperature. Patrol, empty-case theft and repeated hidden-LKP alert scenarios. No battery or gameplay-difficulty claim.',rows},null,2)+'\n');
