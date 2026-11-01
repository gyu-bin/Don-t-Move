/**
 * v4 performance check for the travel stall fix: the real 60 Hz simulation, same missions as the performance report
 * (01-02, 05-03, 08-03), 120 simulated seconds of patrol and 60 s of alert/chase from a spotted state (strategy G).
 * Run once per variant process (CHASE_TRAVEL_FIX=0|1 with the v4 loader) and interleave processes; prints CPU ms.
 *   node --import tsx --import ./tools/gameplay-improvement/v4/candidateLoader.mjs tools/gameplay-improvement/v4/benchTravel.ts
 */
import {performance} from 'node:perf_hooks';
import campaign from '../../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import {TILE} from '../../../src/game/world/compileStage';
import {createPlaygroundState,stepPlayground} from '../../../src/game/playground/playgroundState';
import {world,scenarios,provoke,flee} from './chaseLab';

const out:Record<string,number>={};
for (const id of ['01-02','05-03','08-03']) {
  const def=(campaign as unknown as StageDefinition[]).find(d=>d.id===id)!, w=world(def);
  const patrol=()=>{ const s=createPlaygroundState(w.stage); s.playerMode=0;
    for (let f=0;f<120*60;f++) stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:w.stage.width,h:w.stage.height},w.stage.movementBlockers,w.stage.visionBlockers,w.nav); };
  const sc=scenarios(def).map(c=>({c,sp:provoke(w,c)})).find(x=>x.sp)!;
  patrol(); flee(w,sc.sp!,sc.c,'G',0); // warm-up
  let t=performance.now(); patrol(); out[`${id} patrol 120s`]=+(performance.now()-t).toFixed(1);
  t=performance.now(); flee(w,sc.sp!,sc.c,'G',0); out[`${id} alert/chase`]=+(performance.now()-t).toFixed(1);
}
console.log(JSON.stringify({fix:process.env.CHASE_TRAVEL_FIX==='1',...out}));
