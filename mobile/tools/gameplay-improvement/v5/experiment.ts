/** Offline spatial experiments. No tuning hooks or production campaign writes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import campaign from '../../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import type {PlaygroundState} from '../../../src/game/playground/playgroundState';
import {stepPlayground} from '../../../src/game/playground/playgroundState';
import {Awareness} from '../../../src/game/core/types';
import {TILE} from '../../../src/game/world/compileStage';
import {clearSegment,findPath} from '../../../src/game/world/navigation';
import {BODY} from '../../../src/game/guards/guardTuning';
import {bodiesTouch} from '../../../src/game/guards/guardSystem';
import {doorBlockers} from '../../../src/game/doors/doorSystem';
import {navigationWithDoors} from '../../../src/game/doors/doorNavigation';
import {world,scenarios,provoke,flee,oracle,STRATEGY_NAME} from '../v4/chaseLab';
import type {World,Spotted,Scenario,Strategy} from '../v4/chaseLab';
import {search,split,playSegment} from '../../gameplay-audit/expertPlanner';
import {polyline,toWorld,objectiveTile,exitCenterTile} from '../../gameplay-audit/routeGeometry';
import {evaluate} from '../evaluateMission';
import {candidatesFor} from './candidates';

export type FlightStrategy=Strategy|'I'|'J'|'K';
export const STRATEGIES:FlightStrategy[]=['A','B','C','K','F','J','I','H'];
export const NAMES:Record<FlightStrategy,string>={...STRATEGY_NAME,I:'observe-search-then-move',J:'farther-hidden-room',K:'opposite-projected-patrol'};
const seen=(s:PlaygroundState)=>s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);
const round=(v:number)=>+v.toFixed(4);
export const hash=(v:unknown)=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

/** Same dynamic state in every variant; derived geometry and paths must belong to THIS map. */
export function bindState(w:World,sp:Spotted):Spotted {
  const s=structuredClone(sp.s);
  delete s.effectiveMovementBlockers; delete s.effectiveVisionBlockers; delete s.effectiveNavigation;
  if(s.doors?.length) {
    const geometry=doorBlockers(s.doors,w.stage.movementBlockers,w.stage.visionBlockers);
    s.effectiveMovementBlockers=geometry.movementBlockers;s.effectiveVisionBlockers=geometry.visionBlockers;
    s.effectiveNavigation=navigationWithDoors(w.nav,doorBlockers(s.doors).movementBlockers);
    s.doorGeometryRevision=0;
  }
  s.player.path=[];s.player.pathIndex=0;delete s.player.pathTx;delete s.player.pathTy;
  for(const g of s.guards) {g.path=[];g.pathIndex=0;g.repathAt=0;}
  return {...sp,s};
}

export function invalidStart(w:World,s:PlaygroundState):string[] {
  const b=s.effectiveMovementBlockers??w.stage.movementBlockers;
  const out:string[]=[];
  if(!clearSegment(s.player.x,s.player.y,s.player.x,s.player.y,b,BODY.playerRadius))out.push('player-overlap');
  for(const g of s.guards) if(!clearSegment(g.x,g.y,g.x,g.y,b,BODY.guardRadius))out.push(`guard-overlap:${g.id}`);
  return out;
}

function step(w:World,s:PlaygroundState) {
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:w.stage.width,h:w.stage.height},w.stage.movementBlockers,w.stage.visionBlockers,w.nav);
}

export interface TracePoint {t:number;x:number;y:number;mode:number;seen:boolean;phase:string;guards:{id:string;x:number;y:number;awareness:number}[]}
export interface FlightMetrics {
  strategy:FlightStrategy;strategyName:string;duration:number;caught:boolean;caughtAt:number|null;caughtBy:string|null;
  firstLosBreakAt:number|null;rediscovered:boolean;rediscoveryTimes:number[];firstRediscoveryDelay:number|null;
  searchStartedAt:number|null;searchEndedAt:number|null;calm:boolean;calmAt:number|null;
  survival5:boolean|null;survival10:boolean|null;survival60:boolean|null;survivalCensored:boolean;
  contactEpisodes:number;minGuardDistance:number;trace:TracePoint[];events:{t:number;type:string;guards?:string[]}[];
  reinfiltrationPossible:boolean|null;reinfiltrationStatus:string;missionClear:boolean|null;missionClearStatus:string;
  pickupAfterRecovery:boolean|null;plannerBudgetUsed:number;plannerBudgetExhausted:boolean;
  objectiveAcquired:boolean;objectiveAcquiredAt:number|null;
  initial:{x:number;y:number;sourceDistance:number;nearestGuardDistance:number;source:string};
}

/** Event timings are observed directly; planning time can never pollute chase/survival metrics. */
export class MetricCollector {
  result:FlightMetrics;
  private t0:number;private wasSeen:boolean;private activeSearch=false;private contacts=new Set<string>();private lastTrace=-Infinity;
  constructor(s:PlaygroundState,strategy:FlightStrategy,source:string,private blockers:number[]=[] ) {
    this.t0=s.t;this.wasSeen=seen(s);
    const src=s.guards.find(g=>g.id===source)??s.securityCameras.find(c=>c.id===source);
    const nearest=Math.min(...s.guards.map(g=>Math.hypot(g.x-s.player.x,g.y-s.player.y)))/TILE;
    this.result={strategy,strategyName:NAMES[strategy],duration:0,caught:false,caughtAt:null,caughtBy:null,
      firstLosBreakAt:null,rediscovered:false,rediscoveryTimes:[],firstRediscoveryDelay:null,searchStartedAt:null,searchEndedAt:null,calm:false,calmAt:null,
      survival5:null,survival10:null,survival60:null,survivalCensored:false,contactEpisodes:0,minGuardDistance:nearest,trace:[],events:[],
      reinfiltrationPossible:null,reinfiltrationStatus:'not-attempted',missionClear:s.mission.complete?true:null,missionClearStatus:s.mission.complete?'clear-during-flight':'not-attempted',pickupAfterRecovery:null,plannerBudgetUsed:0,plannerBudgetExhausted:false,
      objectiveAcquired:s.mission.treasure,objectiveAcquiredAt:s.mission.treasure?0:null,
      initial:{x:round(s.player.x/TILE),y:round(s.player.y/TILE),sourceDistance:src?round(Math.hypot(src.x-s.player.x,src.y-s.player.y)/TILE):NaN,nearestGuardDistance:round(nearest),source}};
    this.record(s,true);
  }
  observe(s:PlaygroundState) {
    const r=this.result,t=round(s.t-this.t0),visible=seen(s);r.duration=t;
    const event=(type:string,guards?:string[])=>r.events.push({t,type,...(guards?{guards}:{})});
    if(this.wasSeen&&!visible&&r.firstLosBreakAt===null){r.firstLosBreakAt=t;event('first-los-break');}
    if(!this.wasSeen&&visible&&r.firstLosBreakAt!==null){r.rediscovered=true;r.rediscoveryTimes.push(t);r.firstRediscoveryDelay??=round(t-r.firstLosBreakAt);event('rediscovered',s.guards.filter(g=>g.canSee).map(g=>g.id));}
    this.wasSeen=visible;
    const searching=s.guards.some(g=>g.awareness===Awareness.Search);
    if(searching&&!this.activeSearch){r.searchStartedAt??=t;event('search-start');}
    if(!searching&&this.activeSearch){r.searchEndedAt=t;event('search-end');}
    this.activeSearch=searching;
    const nowContacts=new Set<string>();
    for(const g of s.guards) {
      r.minGuardDistance=Math.min(r.minGuardDistance,Math.hypot(g.x-s.player.x,g.y-s.player.y)/TILE);
      if(bodiesTouch(g,s.player,s.effectiveMovementBlockers??this.blockers)){nowContacts.add(g.id);if(!this.contacts.has(g.id)){r.contactEpisodes++;event('guard-contact',[g.id]);}}
    }
    this.contacts=nowContacts;
    if(s.events.caught&&!r.caught){r.caught=true;r.caughtAt=t;r.caughtBy=s.events.caughtBy||null;event('caught');}
    if(s.mission.treasure&&!r.objectiveAcquired){r.objectiveAcquired=true;r.objectiveAcquiredAt=t;event('objective-acquired');}
    if(s.mission.complete&&!r.missionClear){r.missionClear=true;r.missionClearStatus='clear-during-flight';event('mission-clear');}
    if(!s.events.globalAlert&&s.guards.every(g=>g.awareness===Awareness.Patrol)&&!s.events.caught&&!r.calm){r.calm=true;r.calmAt=t;event('calm');}
    this.record(s,r.events.at(-1)?.t===t);
  }
  private record(s:PlaygroundState,force=false) {
    const t=round(s.t-this.t0);if(!force&&t-this.lastTrace<0.5-1e-5)return;this.lastTrace=t;
    this.result.trace.push({t,x:round(s.player.x/TILE),y:round(s.player.y/TILE),mode:s.playerMode,seen:seen(s),phase:s.events.phase,
      guards:s.guards.map(g=>({id:g.id,x:round(g.x/TILE),y:round(g.y/TILE),awareness:g.awareness}))});
  }
  finish() {
    const r=this.result;
    const aliveAt=(t:number)=>r.caught&&r.caughtAt!==null&&r.caughtAt<=t?false:r.duration>=t-1/120?true:null;
    r.survival5=aliveAt(5);r.survival10=aliveAt(10);r.survival60=aliveAt(60);r.survivalCensored=!r.caught&&r.duration<60-1/120;
    r.minGuardDistance=round(r.minGuardDistance);return r;
  }
}

/** Extra spatial policies use real observed guards, current/predicted paths, and production collision. */
function spatialFlight(w:World,sp:Spotted,strategy:'I'|'J'|'K',onFrame:(s:PlaygroundState)=>void,cap=60) {
  const s=structuredClone(sp.s),t0=s.t;let target:{x:number;y:number;path:number[]}|null=null,k=0,nextPlan=0,hiddenAt:number|null=null,relocated=false;
  let frames=0;
  while(s.t-t0<cap&&!s.events.caught&&!s.mission.complete&&frames++<Math.ceil(cap*60)+1) {
    const visible=seen(s);if(!visible)hiddenAt??=s.t;
    const observing=strategy==='I'&&!visible&&!relocated&&hiddenAt!==null;
    const ready=observing&&s.t-hiddenAt!>=0.8&&s.guards.some(g=>g.awareness===Awareness.Search||g.awareness===Awareness.Return);
    if(ready){relocated=true;target=null;nextPlan=0;}
    if(s.t>=nextPlan&&(!observing||relocated||visible||!target)) {
      const blockers=s.effectiveVisionBlockers??w.stage.visionBlockers,zone=w.zoneOf(s.player);
      const projection=s.guards.map(g=>({x:g.targetX||g.x,y:g.targetY||g.y}));
      const hidden=(q:{x:number;y:number})=>!s.guards.some(g=>Math.hypot(g.x-q.x,g.y-q.y)<g.visionRange+TILE&&clearSegment(g.x,g.y,q.x,q.y,blockers))&&!s.securityCameras.some(c=>Math.hypot(c.x-q.x,c.y-q.y)<c.visionRange&&clearSegment(c.x,c.y,q.x,q.y,blockers));
      const choices=w.cells.map(q=>({q,d:Math.hypot(q.x-s.player.x,q.y-s.player.y)})).filter(c=>c.d>=1.5*TILE&&c.d<=14*TILE&&hidden(c.q))
        .filter(c=>strategy!=='J'||w.zoneOf(c.q)!==zone&&c.d>=5*TILE)
        .sort((a,b)=>{
          const score=(c:typeof a)=>strategy==='J'?Math.min(...s.guards.map(g=>Math.hypot(g.x-c.q.x,g.y-c.q.y)))-0.15*c.d:
            strategy==='K'||relocated?Math.min(...projection.map(g=>Math.hypot(g.x-c.q.x,g.y-c.q.y)))-0.25*c.d:-c.d;
          return score(b)-score(a);
        }).slice(0,40);
      for(const c of choices){const pp=findPath(w.pnav,s.player.x,s.player.y,c.q.x,c.q.y);if(pp.length<2)continue;
        if(pp.some((v,i)=>i%2===0&&Math.hypot(v-s.player.x,pp[i+1]-s.player.y)>TILE&&s.guards.some(g=>Math.hypot(g.x-v,g.y-pp[i+1])<1.5*TILE)))continue;
        target={...c.q,path:pp};k=0;break;}
      nextPlan=s.t+(visible?0.5:1);
    }
    const at=target&&Math.hypot(s.player.x-target.x,s.player.y-target.y)<6;
    if(!target||at||observing&&!ready&&s.player.speed<1){s.playerMode=0;s.player.hasTarget=false;}
    else {while(k+2<target.path.length&&Math.hypot(target.path[k]-s.player.x,target.path[k+1]-s.player.y)<6)k+=2;
      s.playerMode=3;s.player.tx=target.path[k];s.player.ty=target.path[k+1];s.player.hasTarget=true;}
    step(w,s);onFrame(s);
    if(!s.events.globalAlert&&s.guards.every(g=>g.awareness===Awareness.Patrol))break;
  }
}

export interface MeasureOptions {
  budget?:number;reinfiltrate?:boolean;onFrame?:(s:PlaygroundState)=>void;onPlanEnd?:(s:PlaygroundState)=>void;
  onReinfiltration?:(s:PlaygroundState)=>void;
}
export function measureRun(w:World,sp:Spotted,sc:Scenario,strategy:FlightStrategy,opts:MeasureOptions={}):FlightMetrics {
  const bound=bindState(w,sp),invalid=invalidStart(w,bound.s);if(invalid.length)throw Error(invalid.join(','));
  const m=new MetricCollector(bound.s,strategy,sc.source,w.stage.movementBlockers);let last=bound.s;
  const frame=(s:PlaygroundState)=>{m.observe(s);last=s;opts.onFrame?.(s);};
  if(strategy==='I'||strategy==='J'||strategy==='K')spatialFlight(w,bound,strategy,frame);
  else flee(w,bound,sc,strategy,0,false,frame);
  const r=m.finish();
  if(r.missionClear){opts.onPlanEnd?.(last);r.reinfiltrationStatus='mission-cleared-during-flight';return r;}
  if(!r.calm||r.caught){r.reinfiltrationStatus='no-calm-state';r.missionClearStatus='no-calm-state';return r;}
  if(!opts.reinfiltrate)return r;
  const ctx={stage:w.stage,nav:w.nav,gait:'mixed' as const};
  const approach=split(polyline(w.pnav,[{x:last.player.x,y:last.player.y},toWorld(objectiveTile(w.def))]));approach.push(toWorld(objectiveTile(w.def)));
  const first=approach.find(q=>Math.hypot(q.x-last.player.x,q.y-last.player.y)>TILE)??approach[0];
  let moved=false;
  for(const wait of [0,0.5,1,2,4,6]){
    const p=playSegment(last,ctx,first,wait,false);
    if(p.rank===0&&!p.state.events.caught&&!p.state.events.globalAlert&&Math.hypot(p.state.player.x-last.player.x,p.state.player.y-last.player.y)>TILE){moved=true;opts.onReinfiltration?.(p.state);break;}
  }
  r.reinfiltrationPossible=moved;r.reinfiltrationStatus=moved?'unseen-movement-observed':'no-unseen-movement-in-probe';
  const escape=split(polyline(w.pnav,[toWorld(objectiveTile(w.def)),...w.def.escapeRoutes![0].points.map(toWorld).slice(1)]));escape.push(toWorld(exitCenterTile(w.def)));
  const budget={n:0,limit:opts.budget??300},track={furthest:-1,cause:''};
  const plan=search(last,ctx,[...approach,...escape],true,budget,track);
  r.plannerBudgetUsed=budget.n;r.plannerBudgetExhausted=budget.n>budget.limit;
  r.missionClear=plan?.end.mission.complete??false;r.pickupAfterRecovery=plan?plan.end.mission.treasure:null;
  r.missionClearStatus=r.missionClear?'clear-observed':r.plannerBudgetExhausted?'unresolved-budget-exhausted':'no-plan-in-tested-route-model';
  if(plan)opts.onPlanEnd?.(plan.end);
  return r;
}

export function writeCsv(file:string,rows:Record<string,unknown>[]) {
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))],esc=(v:unknown)=>{
    const value=typeof v==='object'?JSON.stringify(v):String(v??'');
    return '"'+value.replace(/"/g,'""')+'"';
  };
  fs.writeFileSync(file,[keys.join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n')+'\n');
}

async function main() {
  if(process.env.CHASE_CANDIDATE||process.env.CHASE_TRAVEL_FIX)throw Error('Do not run v5 with AI variant environment variables');
  if(process.env.LAB_CAP&&Number(process.env.LAB_CAP)!==60)throw Error('All v5 policies require the same 60-second horizon');
  const args=process.argv.slice(2),out=args.shift()??'docs/reports/gameplay-improvement-v5/data';
  const option=(key:string,fallback:string)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
  const ids=option('--missions','07-01,06-03,08-03').split(','),strategyNames=option('--strategies',STRATEGIES.join(',')).split(',') as FlightStrategy[];
  if(strategyNames.some(s=>!NAMES[s]))throw Error('Unknown flight strategy');
  const variants=option('--variants','').split(',').filter(Boolean),limit=+option('--limit-scenarios','Infinity'),budget=+option('--budget','300');
  const report={generated:new Date().toISOString(),settings:{hz:60,cap:60,budget,strategies:strategyNames,strategyNames:NAMES,matchedStarts:true,survival:'censored at early calm; null is unobserved',campaignHash:hash(campaign)},
    scenarios:[] as unknown[],runs:[] as Record<string,unknown>[],definitions:[] as unknown[],evaluations:[] as unknown[],oracles:[] as unknown[]};
  fs.mkdirSync(out,{recursive:true});
  for(const id of ids){
    const def=(campaign as unknown as StageDefinition[]).find(d=>d.id===id);if(!def)throw Error(id);
    const baseWorld=world(def),options=candidatesFor(def).filter(c=>!variants.length||variants.includes(c.id));
    const starts=scenarios(def).slice(0,limit).map((sc,i)=>({sc,i,sp:provoke(baseWorld,sc)}));
    for(const {sc,i,sp}of starts)report.scenarios.push({id:`${id}:${i}`,...sc,spotted:!!sp,...(sp?{stateHash:hash(sp.s),initialState:sp.s}:{} )});
    for(const candidate of options){
      const w=world(candidate.def);report.definitions.push({...candidate,hash:hash(candidate.def)});
      for(const {sc,i,sp}of starts){if(!sp)continue;
        const invalid=invalidStart(w,bindState(w,sp).s);
        for(const strategy of strategyNames){
          const header={mission:id,candidate:candidate.id,scenario:`${id}:${i}`,strategy,startHash:hash(sp.s)};
          if(invalid.length){report.runs.push({...header,status:'invalid-shared-start',invalid});continue;}
          const metric=measureRun(w,sp,sc,strategy,{budget,reinfiltrate:!args.includes('--no-reinfiltrate')});
          report.runs.push({...header,status:'measured',...metric});
        }
        if(args.includes('--oracle')&&!invalid.length)report.oracles.push({mission:id,candidate:candidate.id,scenario:`${id}:${i}`,...oracle(w,bindState(w,sp))});
      }
      if(args.includes('--mission-eval')){const ev=evaluate(candidate.def,{budget});report.evaluations.push({mission:id,candidate:candidate.id,...ev});}
      fs.writeFileSync(path.join(out,'experiment.json'),JSON.stringify(report)+'\n');
      process.stderr.write(`${id} ${candidate.id}: ${report.runs.filter(r=>r.mission===id&&r.candidate===candidate.id&&r.status==='measured').length} measured\n`);
    }
  }
  const csv=report.runs.map(({trace:_trace,events:_events,...r})=>r);
  writeCsv(path.join(out,'escape-runs.csv'),csv);
  if(hash(campaign)!==report.settings.campaignHash)throw Error('Campaign changed in process');
}
if(process.argv[1]?.endsWith('/v5/experiment.ts'))void main();
