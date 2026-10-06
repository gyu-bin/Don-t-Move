/** Authoring aid: outcome of the scripted thief's runs on V13 missions, grouped by lane and by where it was caught. */
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {composeV13} from './v13Builder';
import {V13_MISSIONS} from './v13Build';
import {heistRun,HEIST_MATRIX,type TraceSample} from './v12Phase5Bot';
const ids=process.argv.slice(2);
// DENSE=1 starts the thief at every second from 0 to 14, so one lucky or unlucky patrol phase weighs less.
// DENSE_SPAN widens the start window (seconds) and PATIENCE sets how long the thief holds for a watched way ahead.
const SPAN=Number(process.env.DENSE_SPAN??15),PATIENCE=Number(process.env.PATIENCE??9);
const RUNS=process.env.DENSE?[0,1].flatMap(approach=>Array.from({length:SPAN},(_,startDelay)=>({approach,startDelay,patience:PATIENCE}))):HEIST_MATRIX;
for(const m of V13_MISSIONS.filter(m=>!ids.length||ids.includes(m.id))){
 const def=composeV13(m,raw as StageDefinition[]),zone=(x:number,y:number)=>def.topologyPlan!.rooms.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)?.id??'?';
 for(const lane of [0,1]){
  const tally=new Map<string,number>();let clears=0;const times:number[]=[];
  for(const run of RUNS.filter(r=>r.approach===lane)){
   const t:TraceSample[]=[],r=heistRun(def,run.approach,run.startDelay,run.patience,t),l=t.at(-1)!;
   if(r.clear){clears++;times.push(r.time);continue;}
   const key=r.caught?`${r.caughtBy.slice(-2)} in ${zone(l.x/40,l.y/40)} @${(l.x/40).toFixed(0)},${(l.y/40).toFixed(0)} ${r.pickupAt===null?'before':'after'} pickup t≈${Math.round(r.time/5)*5}`:'timeout';
   tally.set(key,(tally.get(key)??0)+1);
  }
  console.log(m.id,lane?'risk':'safe',`${clears}/${RUNS.length/2}`,times.length?`clear ${Math.min(...times).toFixed(0)}–${Math.max(...times).toFixed(0)}s`:'',[...tally].map(([k,v])=>`${v}× ${k}`).join(' | '));
 }
}
