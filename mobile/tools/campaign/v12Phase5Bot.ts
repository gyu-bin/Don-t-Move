/**
 * Phase 5 scripted thief for full-heist comparison across Chapter 1–5.
 *
 * It plays the production simulation (stepPlayground: guards, CCTV, theft, 28s timer, lockdown doors)
 * with tap-to-move targets only. Unlike a fixed replay it watches: it holds outside vision cones until
 * the way ahead is clear, runs when seen, and after the theft path-finds to the exit on the current door
 * geometry, so a closed lockdown door sends it round the secondary route.
 *
 * It is still a simple, deterministic stand-in. Its clear rate ranks security pressure between missions;
 * it does not certify human difficulty.
 */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {pointVisible} from '../../src/game/guards/guardVision';
import {BODY} from '../../src/game/guards/guardTuning';

export interface HeistRun {
 clear:boolean;caught:boolean;caughtBy:string;timeout:boolean;time:number;
 pickupAt:number|null;theftAt:number|null;spottedAt:number|null;spottedBy:string;cameraAlertAt:number|null;
 /** Seconds from theft alert to first moment no guard or camera sees the thief. */
 firstBreakAfterTheft:number|null;
 lockdownAt:number|null;escapedBeforeLockdown:boolean;usedSecondaryEscape:boolean;
 waitSeconds:number;seenSeconds:number;seenAfterPickupSeconds:number;
}
type Point={x:number;y:number};
const px=(p:Point):Point=>({x:p.x*TILE,y:p.y*TILE});

export interface TraceSample {t:number;x:number;y:number;mode:number;tx:number;ty:number}
export function heistRun(def:StageDefinition,approach:number,startDelay:number,patience:number,trace?:TraceSample[]):HeistRun{
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 const route=(def.testRoutes![approach]??def.testRoutes![0]).points.map(px),exit={x:stage.exit.x+stage.exit.w/2,y:stage.exit.y+stage.exit.h/2};
 const quick=def.escapeRoutes![0].points.map(px);
 let leg=1,waited=0,waitSeconds=0,seenSeconds=0,seenAfterPickup=0,pickupAt:number|null=null,theftAt:number|null=null,spottedAt:number|null=null,cameraAlertAt:number|null=null,lockdownAt:number|null=null,firstBreak:number|null=null,spottedBy='';
 let escapeLeg=1,secondary=false,path:number[]=[],pathAge=99;
 const vision=()=>s.effectiveVisionBlockers??stage.visionBlockers;
 const watched=(x:number,y:number)=>s.guards.some(g=>pointVisible(g,x,y,vision()))||s.securityCameras.some(c=>pointVisible(c,x,y,vision()));
 // Optional second proxy (BOT_KEEP_DISTANCE=<tiles>): the thief also holds while a guard's body is that close to the way ahead.
 const keep=Number(process.env.BOT_KEEP_DISTANCE??0)*TILE,crowded=(x:number,y:number)=>keep>0&&s.guards.some(g=>Math.hypot(g.x-x,g.y-y)<keep&&clearSegment(g.x,g.y,x,y,vision()));
 const go=(t:Point,mode:number)=>{s.playerMode=mode;s.player.tx=t.x;s.player.ty=t.y;s.player.hasTarget=true;};
 for(let f=0;f<60*150&&!s.events.caught&&!s.mission.complete;f++){
  const p=s.player,here=watched(p.x,p.y);
  if(s.t>=startDelay){
   if(!s.mission.treasure){
    while(leg<route.length-1&&Math.hypot(p.x-route[leg].x,p.y-route[leg].y)<3)leg++;
    const t=route[leg],d=Math.hypot(t.x-p.x,t.y-p.y)||1;
    // Look one and two tiles ahead along the current leg.
    const ahead=[TILE,2*TILE].map(k=>({x:p.x+(t.x-p.x)*Math.min(1,k/d),y:p.y+(t.y-p.y)*Math.min(1,k/d)}));
    const danger=ahead.some(a=>watched(a.x,a.y)||crowded(a.x,a.y));
    if(here){go(t,3);waited=0;}                       // seen: keep moving to break line of sight
    else if(danger&&waited<patience){s.playerMode=0;p.hasTarget=false;waited+=1/60;waitSeconds+=1/60;}
    else{go(t,danger?2:1);if(!danger)waited=0;}       // clear: sneak; impatient: walk through
   }else{
    // Escape: authored quick route while its door is open, otherwise shortest path on current door geometry.
    const closed=(s.doors??[]).some(d=>(s.lockdownDoorIds??[]).includes(d.id)&&d.state!=='OPEN');
    if(!closed&&!secondary){
     while(escapeLeg<quick.length-1&&Math.hypot(p.x-quick[escapeLeg].x,p.y-quick[escapeLeg].y)<3)escapeLeg++;
     go(quick[escapeLeg],3);
    }else{
     secondary=true;pathAge+=1/60;
     if(pathAge>0.5){path=findPath(s.effectiveNavigation??nav,p.x,p.y,exit.x,exit.y);pathAge=0;}
     // Aim two nodes along the path so corners are cut no tighter than the navigation grid allows.
     const i=Math.min(path.length-2,4);
     go(path.length>=2?{x:path[i],y:path[i+1]}:exit,3);
    }
   }
  }
  // 10 Hz input trace for replaying this exact run in the Simulator.
  if(trace&&f%6===0)trace.push({t:+s.t.toFixed(2),x:+s.player.x.toFixed(1),y:+s.player.y.toFixed(1),mode:s.player.hasTarget?s.playerMode:0,tx:+s.player.tx.toFixed(1),ty:+s.player.ty.toFixed(1)});
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  const seen=s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);
  if(seen){seenSeconds+=1/60;if(s.mission.treasure)seenAfterPickup+=1/60;}
  if(s.mission.treasure&&pickupAt===null)pickupAt=s.t;
  if(s.events.theftAlert&&theftAt===null)theftAt=s.t;
  if(theftAt!==null&&firstBreak===null&&!seen)firstBreak=s.t-theftAt;
  if(s.events.globalAlert&&spottedAt===null){spottedAt=s.t;spottedBy=s.events.spottedSource??'';}
  if(cameraAlertAt===null&&(s.events.cameraAlertRevision??0)>0)cameraAlertAt=s.t;
  if(s.events.lockdownActive&&lockdownAt===null)lockdownAt=s.t;
 }
 const r=(v:number|null)=>v===null?null:+v.toFixed(2);
 return {clear:s.mission.complete,caught:s.events.caught,caughtBy:s.events.caughtBy??'',timeout:!s.mission.complete&&!s.events.caught,time:+s.t.toFixed(1),
  pickupAt:r(pickupAt),theftAt:r(theftAt),spottedAt:r(spottedAt),spottedBy,cameraAlertAt:r(cameraAlertAt),firstBreakAfterTheft:r(firstBreak),
  lockdownAt:r(lockdownAt),escapedBeforeLockdown:s.mission.complete&&lockdownAt===null,usedSecondaryEscape:secondary,
  waitSeconds:+waitSeconds.toFixed(1),seenSeconds:+seenSeconds.toFixed(1),seenAfterPickupSeconds:+seenAfterPickup.toFixed(1)};
}

export const HEIST_MATRIX:{approach:number;startDelay:number;patience:number}[]=[];
for(const approach of [0,1])for(const startDelay of [0,1,2,3,4,6])for(const patience of [4,9])HEIST_MATRIX.push({approach,startDelay,patience});

export function heistMatrix(def:StageDefinition){
 const runs=HEIST_MATRIX.map(m=>({...m,...heistRun(def,m.approach,m.startDelay,m.patience)}));
 const clears=runs.filter(r=>r.clear),mean=(list:number[])=>list.length?+(list.reduce((a,b)=>a+b,0)/list.length).toFixed(2):null;
 return {id:def.id,chapter:def.chapter!,runs:runs.length,clears:clears.length,clearRate:+(clears.length/runs.length).toFixed(3),
  safeClears:clears.filter(r=>r.approach===0).length,riskClears:clears.filter(r=>r.approach===1).length,
  caughtBeforePickup:runs.filter(r=>r.caught&&r.pickupAt===null).length,caughtAfterPickup:runs.filter(r=>r.caught&&r.pickupAt!==null).length,timeouts:runs.filter(r=>r.timeout).length,
  spottedRuns:runs.filter(r=>r.spottedAt!==null).length,cameraAlertRuns:runs.filter(r=>r.cameraAlertAt!==null).length,
  pickups:runs.filter(r=>r.pickupAt!==null).length,lockdownRuns:runs.filter(r=>r.lockdownAt!==null).length,secondaryEscapeClears:clears.filter(r=>r.usedSecondaryEscape).length,
  meanClearTime:mean(clears.map(r=>r.time)),meanSafeClearTime:mean(clears.filter(r=>r.approach===0).map(r=>r.time)),meanRiskClearTime:mean(clears.filter(r=>r.approach===1).map(r=>r.time)),
  meanWait:mean(runs.map(r=>r.waitSeconds)),meanSeenAfterPickup:mean(runs.filter(r=>r.pickupAt!==null).map(r=>r.seenAfterPickupSeconds)),
  meanFirstBreak:mean(runs.filter(r=>r.firstBreakAfterTheft!==null).map(r=>r.firstBreakAfterTheft!)),
  caughtBy:Object.entries(runs.filter(r=>r.caught).reduce((m,r)=>{m[r.caughtBy]=(m[r.caughtBy]??0)+1;return m;},{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k.slice(-2)}×${v}`).join(' ')};
}

/** A clearing run with its input trace, chosen for replay in the Simulator: it starts at 2s or later (the
 *  Simulator opens a mission ~1.5s in) and the same plan also clears when started a second later, so about
 *  a second of input lateness does not change the outcome. Falls back to any clearing run. Null when none clears. */
export function heistWitness(def:StageDefinition,approach:number){
 const clears=(delay:number,patience:number)=>heistRun(def,approach,delay,patience).clear;
 const candidates:{startDelay:number;patience:number;robust:boolean}[]=[];
 for(const patience of [4,9])for(const startDelay of [2,3,4,5,6,1,0])if(clears(startDelay,patience))candidates.push({startDelay,patience,robust:clears(startDelay+1,patience)&&clears(startDelay+0.5,patience)});
 const pick=candidates.find(c=>c.robust&&c.startDelay>=2)??candidates.find(c=>c.startDelay>=2)??candidates[0];
 if(!pick)return null;
 const trace:TraceSample[]=[];const run=heistRun(def,approach,pick.startDelay,pick.patience,trace);
 return {id:def.id,approach,...pick,run,trace};
}
if(process.argv[1]?.endsWith('v12Phase5Bot.ts')&&process.argv[2]==='witness'){
 const stages=(JSON.parse(fs.readFileSync(process.argv[3]??'src/game/levels/stages/campaignStages.json','utf8')) as StageDefinition[]).filter(d=>d.chapter!<=5&&(process.argv.length<=4||process.argv.slice(4).includes(d.id)));
 fs.mkdirSync('Reports/V12Phase5/witness',{recursive:true});
 for(const def of stages)for(const [name,approach] of [['safe',0],['risk',1]] as const){
  const w=heistWitness(def,approach);
  if(w){fs.writeFileSync(`Reports/V12Phase5/witness/${def.id}-${name}.json`,JSON.stringify(w)+'\n');console.log(def.id,name,'witness: delay',w.startDelay,'patience',w.patience,'robust',w.robust,'time',w.run.time,'pickup',w.run.pickupAt,'theft',w.run.theftAt,'spotted',w.run.spottedAt,'lockdown',w.run.lockdownAt,'secondary',w.run.usedSecondaryEscape);}
  else console.log(def.id,name,'no scripted clear');
 }
}else if(process.argv[1]?.endsWith('v12Phase5Bot.ts')){
 const input=process.argv[2]??'src/game/levels/stages/campaignStages.json',out=process.argv[3]??'Reports/V12Phase5/heist-matrix.json',only=process.argv.slice(4);
 const stages=(JSON.parse(fs.readFileSync(input,'utf8')) as StageDefinition[]).filter(d=>d.chapter!<=5&&(!only.length||only.includes(d.id)));
 const rows=stages.map(heistMatrix);
 const chapters=[1,2,3,4,5].map(c=>{const m=rows.filter(r=>r.chapter===c);if(!m.length)return null;const rates=m.map(r=>r.clearRate);
  return {chapter:c,clearRate:+(rates.reduce((a,b)=>a+b,0)/m.length).toFixed(3),min:Math.min(...rates),max:Math.max(...rates),spottedShare:+(m.reduce((n,r)=>n+r.spottedRuns/r.runs,0)/m.length).toFixed(2),caughtAfterPickupShare:+(m.reduce((n,r)=>n+r.caughtAfterPickup/Math.max(1,r.pickups),0)/m.length).toFixed(2)};}).filter(Boolean);
 fs.mkdirSync('Reports/V12Phase5',{recursive:true});fs.writeFileSync(out,JSON.stringify({method:'24 scripted cone-aware full-heist runs per mission (2 approaches × 6 start delays × 2 patience values) on the production simulation, including theft timer and lockdown doors. Proxy for relative pressure only.',chapters,rows},null,2)+'\n');
 for(const r of rows)console.log(r.id,'clear',`${r.clears}/${r.runs}`,'safe/risk',`${r.safeClears}/${r.riskClears}`,'caught pre/post',`${r.caughtBeforePickup}/${r.caughtAfterPickup}`,'timeout',r.timeouts,'spotted',r.spottedRuns,'cam',r.cameraAlertRuns,'lockdown',r.lockdownRuns,'2ndEsc',r.secondaryEscapeClears,'t safe/risk',r.meanSafeClearTime,r.meanRiskClearTime,'seenPost',r.meanSeenAfterPickup,'by',r.caughtBy);
 for(const c of chapters)console.log('CH',JSON.stringify(c));
}
