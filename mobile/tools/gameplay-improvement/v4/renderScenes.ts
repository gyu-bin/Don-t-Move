/**
 * v4 Phase 10 evidence: replays one chase-lab escape (deterministic, production rules) and renders the eight moments
 * with the production frame renderer — spotted, chase, LOS broken at a corner, guards heading to the LKP, thief hidden,
 * search, return, re-infiltration (expert planner from the calm state) — plus a state log.
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/gameplay-improvement/v4/renderScenes.ts <outDir> <id> <source> <distance> <warmup> <strategy>
 */
import fs from 'node:fs';
import campaign from '../../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import type {PlaygroundState} from '../../../src/game/playground/playgroundState';
import {Awareness} from '../../../src/game/core/types';
import {TILE} from '../../../src/game/world/compileStage';
import {createFrameRenderer} from '../frameRenderer';
import {world,scenarios,provoke,flee} from './chaseLab';
import type {Strategy} from './chaseLab';

const NAME:Record<number,string>={0:'Patrol',1:'Suspicious',2:'Alert',3:'Search',4:'Chase',5:'Investigate',6:'Return'};
async function main() {
  const [outDir,id,source,dist,warm,st]=process.argv.slice(2);
  const def=(campaign as unknown as StageDefinition[]).find(d=>d.id===id)!, w=world(def);
  const sc=scenarios(def).find(s=>s.source===source&&s.distance===+dist&&s.warmup===+warm)!, sp=provoke(w,sc)!;
  const frames:{label:string;s:PlaygroundState}[]=[], log:string[]=[], seen=new Set<string>(); const t0=sp.s.t; let losAt=-1, chased=false;
  const take=(label:string,s:PlaygroundState)=>{ if (seen.has(label)) return; seen.add(label); frames.push({label,s:structuredClone(s)});
    log.push(`t+${(s.t-t0).toFixed(1)}s ${label} phase=${s.events.phase} thief(${(s.player.x/TILE).toFixed(1)},${(s.player.y/TILE).toFixed(1)}) `+s.guards.map(g=>`${g.id.slice(-2)}:${NAME[g.awareness]}`).join(' ')); };
  take('1-spotted',sp.s);
  let calm:PlaygroundState|null=null;
  let planEnd:PlaygroundState|null=null;
  const r=flee(w,sp,sc,st as Strategy,0,true,s=>{
    const seenNow=s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);
    if (s.guards.some(g=>g.awareness===Awareness.Chase)) { chased=true; take('2-chase',s); }
    if (chased&&!seenNow&&losAt<0) { losAt=s.t; take('3-los-broken',s); }
    if (losAt>0&&s.t-losAt>1&&!seenNow&&s.guards.some(g=>g.awareness===Awareness.Investigate)) take('4-to-lkp',s);
    if (losAt>0&&s.player.speed<1&&!seenNow&&seen.has('4-to-lkp')) take('5-hidden',s);
    if (s.guards.some(g=>g.awareness===Awareness.Search)&&!seenNow) take('6-search',s);
    if (s.events.phase==='RETURN') take('7-return',s);
    if (!s.events.globalAlert&&s.guards.every(g=>g.awareness===Awareness.Patrol)) calm=structuredClone(s);
  },end=>{planEnd=end;});
  log.push(JSON.stringify(r));
  void calm;
  if (planEnd) { const e=planEnd as PlaygroundState; take('8-reinfiltrated',e); log.push(`re-infiltration (expert planner from the calm state, budget 300): prize ${e.mission.treasure} complete ${e.mission.complete} at t+${(e.t-t0).toFixed(1)}s`); }
  else log.push('re-infiltration: no plan within budget 300');
  fs.mkdirSync(outDir,{recursive:true});
  const rr=await createFrameRenderer();
  for (const f of frames) rr.render(def,f.s as never,`${outDir}/${id}-${f.label}.png`);
  fs.writeFileSync(`${outDir}/${id}-scenes.log`,log.join('\n')+'\n'); console.log(log.join('\n'));
}
void main();
