/** Phase 5 authoring aid: evaluates a small, fixed grid of level-data tunings per mission with the scripted thief
 *  and lists the ones nearest the chapter's intended pressure. Output is a proposal for review, not an auto-bake.
 *  Usage: node --import tsx tools/campaign/v125Search.ts [ids...] */
import fs from 'node:fs';
import {buildV124dCampaign} from './v124dBuild';
import {applyPhase5,type Phase5Tuning} from './v125Tuning';
import {heistMatrix} from './v12Phase5Bot';
export const CHAPTER_TARGET=[.70,.55,.40,.28,.18];
const SWEEPS=[0,1,1,2,2];
const only=process.argv.slice(2);
const campaign=JSON.parse(JSON.stringify(buildV124dCampaign()));
const out:Record<string,unknown>={};
for(const def of campaign.filter((d:any)=>d.chapter<=5&&(!only.length||only.includes(d.id)))){
 const target=CHAPTER_TARGET[def.chapter-1],n=def.guards.length,authored=def.guards.map((g:any)=>g.startDelay??0);
 const rows:{tuning:Phase5Tuning;clearRate:number;safe:number;risk:number;spotted:number;post:number}[]=[];
 // EXT=1 widens the grid for missions the standard grid cannot bring near their chapter.
 const ext=process.env.EXT==='1',removeCamera=process.env.REMOVE_CAM?[Number(process.env.REMOVE_CAM)]:undefined;
 const waits=(ext?[[1.5,1.5],[1.5,3],[1.5,5],[1.5,7],[3,1.5]]:[[1.5,1.5],[1.5,3],[1.5,5]]) as [number,number][];
 for(const objectiveWait of waits)for(const patrolWait of ext?[0.8,1.5,3,4.5,6]:[1.5,3,4.5])for(const stagger of ext?[false]:[false,true])for(const reach of ext?[undefined,[0],[1]]:[undefined,[0]])for(const sweeps of ext?[SWEEPS[def.chapter-1],Math.max(0,SWEEPS[def.chapter-1]-1)]:[SWEEPS[def.chapter-1]]){
  const tuning:Phase5Tuning={objectiveWait,patrolWait,startDelays:stagger?authored.map((_:number,i:number)=>i===n-1?authored[i]:i*3):authored,...(reach?{reach}:{}),escapeSweeps:sweeps,...(removeCamera?{removeCamera}:{}),note:'search'};
  let tuned;try{tuned=applyPhase5(def,tuning);}catch{continue;}
  const m=heistMatrix(tuned);rows.push({tuning,clearRate:m.clearRate,safe:m.safeClears,risk:m.riskClears,spotted:m.spottedRuns,post:m.caughtAfterPickup});
 }
 // Nearest to the chapter target; both routes clearable is preferred, then the smaller change.
 const cost=(r:typeof rows[number])=>Math.abs(r.clearRate-target)+(r.safe&&r.risk?0:.08)+(r.tuning.reach?.01:0)+(r.tuning.patrolWait===1.5?0:.005)+(r.tuning.objectiveWait![1]===1.5?0:.005);
 rows.sort((a,b)=>cost(a)-cost(b));
 const base=heistMatrix(def);
 out[def.id]={target,baseline:base.clearRate,range:[Math.min(...rows.map(r=>r.clearRate)),Math.max(...rows.map(r=>r.clearRate))],best:rows.slice(0,3)};
 const b=rows[0];
 console.log(def.id,'target',target,'baseline',base.clearRate,'range',Math.min(...rows.map(r=>r.clearRate)),'–',Math.max(...rows.map(r=>r.clearRate)),'→ best',b.clearRate,`safe/risk ${b.safe}/${b.risk}`,JSON.stringify({ow:b.tuning.objectiveWait,pw:b.tuning.patrolWait,sd:b.tuning.startDelays,reach:b.tuning.reach,sweeps:b.tuning.escapeSweeps}));
}
fs.mkdirSync('Reports/V12Phase5',{recursive:true});fs.writeFileSync(`Reports/V12Phase5/search${only.length?'-'+only.join('_'):''}.json`,JSON.stringify(out,null,1)+'\n');
