/** Functional cover and continuous gameplay evidence, independent of art. */
import fs from 'node:fs';
import path from 'node:path';
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {createGuardState,observeGuard} from '../../src/game/guards/guardBrain';
import {ENTRANCE_HIDE_PROBES} from '../campaign/v13EntranceStealth';
import {exposureRun} from '../campaign/cameraExposure';
import {heistRun} from '../campaign/v12Phase5Bot';

const current=(stages as StageDefinition[])[0],stage=compileStage(current);
const probes=ENTRANCE_HIDE_PROBES.map(p=>{
 const g=createGuardState(stage.guards.find(g=>g.id===p.guard)!);
 g.x=p.post.x*TILE;g.y=p.post.y*TILE;g.facing=Math.atan2(p.look.y-p.post.y,p.look.x-p.post.x);
 const see=(q:{x:number;y:number},blockers:number[])=>{observeGuard(g,{x:q.x*TILE,y:q.y*TILE,gait:2},blockers);return{seen:g.canSee,bodySamples:g.samplesSeen};};
 return {...p,hiddenResult:see(p.hidden,stage.visionBlockers),exposedResult:see(p.exposed,stage.visionBlockers),withoutProps:see(p.hidden,stage.wallRects.flatMap(r=>[r.x,r.y,r.x+r.w,r.y+r.h]))};
});
const definitions=[...(process.argv[2]?[{name:'before',stage:(JSON.parse(fs.readFileSync(process.argv[2],'utf8')) as StageDefinition[])[0]}]:[]),{name:'after',stage:current}];
const rows=definitions.map(({name,stage})=>{
 const runs=[];
 for(const mode of [1,2,3])for(const approach of [0,1])for(const escape of [0,1])for(const delay of [0,2,4,6,8,10,12,14])
  runs.push({mode,approach,escape,delay,...exposureRun(stage,approach,escape,mode,delay)});
 const observers=[];for(const approach of [0,1])for(const delay of [0,2,4,6])for(const patience of [1,3,6])
  observers.push({approach,delay,patience,...heistRun(stage,approach,delay,patience)});
 const length=(points:{x:number;y:number}[])=>points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);
 return {name,routeLengths:stage.testRoutes!.map(r=>({name:r.name,tiles:+length(r.points).toFixed(2)})),
  summary:{fixedClears:runs.filter(r=>r.clear).length,fixedRuns:runs.length,observerClears:observers.filter(r=>r.clear).length,observerRuns:observers.length},runs,observers};
});
const out=process.argv[3]??'docs/reports/performance/entrance-cover.json';fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({mission:'01-01',method:'Actual three-body-sample guard perception; isolated authored posts with real blockers. Continuous fixed-route and cone-aware heist proxies at60Hz; no teleport, forced alerts or invulnerability in heist runs. Not human play times or acceptance.',humanPlaytestVerified:false,probes,rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({name:r.name,...r.summary}))));console.log(out);
