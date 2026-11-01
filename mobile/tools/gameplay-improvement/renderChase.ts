/**
 * Chase evidence: replays the first escape option that works from a controlled spotting (chaseFlow.escapeOptions) and
 * renders the moments — spotted, chase, line of sight broken, search, back to patrol — plus a state log.
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/gameplay-improvement/renderChase.ts <outDir> <id> <guardId> <distance>
 */
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import type {PlaygroundState} from '../../src/game/playground/playgroundState';
import {Awareness} from '../../src/game/core/types';
import {TILE} from '../../src/game/world/compileStage';
import {escapeOptions,provokeScenarios} from './chaseFlow';
import {createFrameRenderer} from './frameRenderer';

const STATE:Record<number,string>={[Awareness.Patrol]:'Patrol',[Awareness.Suspicious]:'Suspicious',[Awareness.Alert]:'Alert',[Awareness.Search]:'Search',[Awareness.Chase]:'Chase',[Awareness.Investigate]:'Investigate',[Awareness.Return]:'Return'};

async function main() {
  const [outDir,id,guard,distArg]=process.argv.slice(2);
  const def=(campaign as StageDefinition[]).find(d=>d.id===id)!;
  const sc=provokeScenarios(def,[Number(distArg)]).find(x=>x.guard===guard);
  if (!sc) throw Error('no scenario for that guard/distance');
  let frames:{label:string;s:PlaygroundState}[]=[], log:string[]=[], kept:{frames:typeof frames;log:string[]}|null=null, seen=new Set<string>();
  const take=(label:string,s:PlaygroundState)=>{ if (seen.has(label)) return; seen.add(label); frames.push({label,s:structuredClone(s)});
    log.push(`${s.t.toFixed(2)} ${label} thief(${(s.player.x/TILE).toFixed(1)},${(s.player.y/TILE).toFixed(1)}) `+s.guards.map(g=>`${g.id.slice(-2)}:${STATE[g.awareness]??g.awareness}`).join(' ')); };
  escapeOptions(def,sc,(target,_s,ok)=>{ if (ok&&!kept) kept={frames,log:[...log,`option target (${(target.x/TILE).toFixed(1)},${(target.y/TILE).toFixed(1)}) → back to patrol, not caught`]}; frames=[]; log=[]; seen=new Set(); },
    s=>{ if (!seen.size) take('1-spotted',s);
      if (s.guards.some(g=>g.awareness===Awareness.Chase)) take('2-chase',s);
      if (seen.has('2-chase')&&!s.guards.some(g=>g.canSee)&&!s.securityCameras.some(c=>c.canSee)) take('3-los-broken',s);
      if (s.guards.some(g=>g.awareness===Awareness.Search)) take('4-search',s);
      if (seen.has('4-search')&&s.guards.every(g=>g.awareness===Awareness.Patrol||g.awareness===Awareness.Return)&&!s.events.globalAlert) take('5-patrol',s); });
  if (!kept) { console.log('no working option to render'); return; }
  fs.mkdirSync(outDir,{recursive:true});
  const r=await createFrameRenderer();
  for (const f of kept.frames) r.render(def,f.s as never,`${outDir}/${id}-${guard.slice(-2)}-d${distArg}-${f.label}.png`);
  fs.writeFileSync(`${outDir}/${id}-${guard.slice(-2)}-d${distArg}.log`,kept.log.join('\n')+'\n');
  console.log(kept.log.join('\n'));
}
void main();
