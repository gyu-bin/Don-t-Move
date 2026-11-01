/** Reproduce an oracle lead, then test its EXACT same targets against both maps. */
import fs from 'node:fs';
import path from 'node:path';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import type {PlaygroundState} from '../../../src/game/playground/playgroundState';
import {stepPlayground} from '../../../src/game/playground/playgroundState';
import {Awareness} from '../../../src/game/core/types';
import {TILE} from '../../../src/game/world/compileStage';
import {BODY} from '../../../src/game/guards/guardTuning';
import {clearSegment,findPath} from '../../../src/game/world/navigation';
import {world} from '../v4/chaseLab';
import type {World,Spotted,Scenario} from '../v4/chaseLab';
import {MetricCollector,bindState,invalidStart,hash,measureRun} from './experiment';
import {polyline,toWorld,objectiveTile,exitCenterTile} from '../../gameplay-audit/routeGeometry';
import {search,split,playSegment} from '../../gameplay-audit/expertPlanner';

type Point={x:number;y:number};
const visible=(s:PlaygroundState)=>s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);
const round=(n:number)=>+n.toFixed(4);
function tick(w:World,s:PlaygroundState){stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:w.stage.width,h:w.stage.height},w.stage.movementBlockers,w.stage.visionBlockers,w.nav);}

/** Verbatim v4 ordering/sampling, with the explicitly rebound geometry used by the main experiment. */
export function oracleTargets(w:World,sp:Spotted) {
  const s0=sp.s,p0=s0.player,v=s0.effectiveVisionBlockers??w.stage.visionBlockers;
  const seenFrom=(q:Point)=>s0.guards.some(g=>Math.hypot(g.x-q.x,g.y-q.y)<g.visionRange+TILE&&clearSegment(g.x,g.y,q.x,q.y,v))||
    s0.securityCameras.some(c=>Math.hypot(c.x-q.x,c.y-q.y)<c.visionRange&&clearSegment(c.x,c.y,q.x,q.y,v));
  const cells=w.cells.map(q=>({q,d:Math.hypot(q.x-p0.x,q.y-p0.y),hidden:!seenFrom(q)})).filter(c=>c.d>=2*TILE&&c.d<=10*TILE).sort((a,b)=>Number(b.hidden)-Number(a.hidden)||a.d-b.d);
  return [...cells.filter(c=>c.hidden).filter((_,i)=>i%3===0).slice(0,16),...cells.filter(c=>!c.hidden).slice(0,8)];
}

export function fixedTarget(w:World,sp:Spotted,target:Point,retainStates=false) {
  const bound=bindState(w,sp),s=bound.s,t0=s.t,invalid=invalidStart(w,s);
  if(invalid.length)throw Error(invalid.join(','));
  const route=findPath(w.pnav,s.player.x,s.player.y,target.x,target.y);
  const metrics=new MetricCollector(s,'D',s.events.spottedSource,w.stage.movementBlockers);
  const states:{label:string;s:PlaygroundState}[]=[];const names=new Set<string>();
  const take=(label:string)=>{if(retainStates&&!names.has(label)){names.add(label);states.push({label,s:structuredClone(s)});}};
  take('1-spotted');let k=0,frames=0,calm:PlaygroundState|null=null;
  if(route.length>=2)while(s.t-t0<60&&!s.events.caught&&!s.mission.complete&&frames++<3601){
    while(k+2<route.length&&Math.hypot(s.player.x-route[k],s.player.y-route[k+1])<6)k+=2;
    if(Math.hypot(s.player.x-target.x,s.player.y-target.y)<6){s.playerMode=0;s.player.hasTarget=false;}
    else{s.playerMode=3;s.player.tx=route[k];s.player.ty=route[k+1];s.player.hasTarget=true;}
    tick(w,s);metrics.observe(s);
    if(s.guards.some(g=>g.awareness===Awareness.Chase))take('2-chase');
    if(metrics.result.firstLosBreakAt!==null)take('3-los-broken');
    if(metrics.result.firstLosBreakAt!==null&&!visible(s)&&s.guards.some(g=>g.awareness===Awareness.Investigate))take('4-leave-last-sighting');
    if(s.guards.some(g=>g.awareness===Awareness.Search)&&!visible(s))take('5-search');
    if(!s.events.globalAlert&&s.guards.every(g=>g.awareness===Awareness.Patrol)){calm=structuredClone(s);take('6-calm');break;}
  }
  const result=metrics.finish();result.strategyName='fixed-oracle-target-run-then-stop';
  const navigationEndpoint=route.length>=2?{x:route[route.length-2],y:route[route.length-1]}:null;
  const blockers=s.effectiveMovementBlockers??w.stage.movementBlockers;
  return {target:{x:target.x/TILE,y:target.y/TILE},requestedGoal:{x:target.x/TILE,y:target.y/TILE},
    navigationEndpoint:navigationEndpoint?{x:navigationEndpoint.x/TILE,y:navigationEndpoint.y/TILE}:null,
    actualEndTile:{x:round(s.player.x/TILE),y:round(s.player.y/TILE)},
    reachesRequestedGoal:Math.hypot(s.player.x-target.x,s.player.y-target.y)<6,
    requestedGoalClear:clearSegment(target.x,target.y,target.x,target.y,blockers,BODY.playerRadius),
    navigationEndpointClear:navigationEndpoint?clearSegment(navigationEndpoint.x,navigationEndpoint.y,navigationEndpoint.x,navigationEndpoint.y,blockers,BODY.playerRadius):null,
    endDistanceToRequestedGoal:round(Math.hypot(s.player.x-target.x,s.player.y-target.y)/TILE),
    route:route.map(v=>round(v/TILE)),frames,pathFound:route.length>=2,metrics:result,states,calm};
}

function recover(w:World,calm:PlaygroundState) {
  const ctx={stage:w.stage,nav:w.nav,gait:'mixed' as const};
  const approach=split(polyline(w.pnav,[{x:calm.player.x,y:calm.player.y},toWorld(objectiveTile(w.def))]));approach.push(toWorld(objectiveTile(w.def)));
  const first=approach.find(q=>Math.hypot(q.x-calm.player.x,q.y-calm.player.y)>TILE)??approach[0];
  const movement:{wait:number;rank:number;distance:number;globalAlert:boolean;complete:boolean}[]=[];
  let reinfiltrationState:PlaygroundState|null=null;
  for(const wait of [0,0.5,1,2,4,6]){
    const p=playSegment(calm,ctx,first,wait,false),distance=Math.hypot(p.state.player.x-calm.player.x,p.state.player.y-calm.player.y)/TILE;
    movement.push({wait,rank:p.rank,distance:round(distance),globalAlert:p.state.events.globalAlert,complete:p.state.mission.complete});
    if(p.rank===0&&!p.state.events.caught&&!p.state.events.globalAlert&&distance>1){reinfiltrationState=structuredClone(p.state);break;}
  }
  const plans=[];
  for(const [name,er]of [['quick',w.def.escapeRoutes![0]],['alt',w.def.escapeRoutes![1]??w.def.escapeRoutes![0]]]as const){
    const escape=split(polyline(w.pnav,[toWorld(objectiveTile(w.def)),...er.points.map(toWorld).slice(1)]));escape.push(toWorld(exitCenterTile(w.def)));
    const segments=[...approach,...escape],budget={n:0,limit:1500},track={furthest:-1,cause:''};
    const r=search(calm,ctx,segments,true,budget,track);
    plans.push({name,budgetUsed:budget.n,budgetLimit:1500,budgetExhausted:budget.n>1500,status:r?.end.mission.complete?'clear-observed':budget.n>1500?'unresolved-budget-exhausted':'no-plan-in-tested-route-model',
      missionClear:r?.end.mission.complete??false,objectiveAcquired:r?.end.mission.treasure??null,
      segments:segments.map(p=>({x:round(p.x/TILE),y:round(p.y/TILE)})),chosen:r?.chosen??null,track,endState:r?.end??null});
  }
  return {reinfiltrationPossible:reinfiltrationState!==null,movement,reinfiltrationState,plans};
}

async function main(){
  if(process.argv.includes('--reachable-endpoint'))return reachableEndpointMain();
  const source=process.argv[2]??'docs/reports/gameplay-improvement-v5/data/combined/experiment.json';
  const out=process.argv[3]??'docs/reports/gameplay-improvement-v5/data/oracle-probe';
  const data=JSON.parse(fs.readFileSync(source,'utf8'));
  const scenario=data.scenarios.find((s:{id:string})=>s.id==='07-01:9');
  if(!scenario?.initialState)throw Error('Missing persisted07-01:9 initialState');
  if(hash(scenario.initialState)!==scenario.stateHash)throw Error('Initial state hash mismatch');
  const sc=scenario as Scenario;
  const sp:Spotted={s:scenario.initialState,t:scenario.initialState.t,spotDistance:scenario.distance,speed:0,guardsNear:0,coverNear:false,openShare:0,sourceState:'',by:scenario.source};
  const definitions=['baseline','lobby-turn'].map(id=>data.definitions.find((d:{mission:string;id:string})=>d.mission==='07-01'&&d.id===id));
  const candidate=definitions[1],cw=world(candidate.def as StageDefinition),bound=bindState(cw,sp);
  const targets=oracleTargets(cw,bound);
  const screen=targets.map((p,index)=>({index,...p,targetTiles:{x:p.q.x/TILE,y:p.q.y/TILE},run:fixedTarget(cw,sp,p.q)}));
  const successes=screen.filter(p=>p.run.metrics.calm);
  const result={generated:new Date().toISOString(),settings:{hz:60,cap:60,scenario:'07-01:9',initialStateHash:scenario.stateHash,plannerBudgetPerEscape:1500,
    sameTargetsInBothMaps:true,policy:'Run production nav path to fixed oracle goal; stand until calm/caught/60s. Oracle knows offscreen state and is an upper bound, not human evidence.'},
    definitions,scenario,screening:screen.map(({run,...p})=>({...p,run:{...run,states:undefined,calm:undefined}})),successfulTargets:successes.map(p=>p.targetTiles),pairs:[]as unknown[],straight:[]as unknown[]};
  fs.mkdirSync(out,{recursive:true});
  for(const {index,q}of successes){
    for(const def of definitions){
      const w=world(def.def as StageDefinition),run=fixedTarget(w,sp,q,true);
      const recovery=run.calm?recover(w,run.calm):null;
      result.pairs.push({targetIndex:index,candidate:def.id,stageHash:hash(def.def),...run,recovery});
      process.stderr.write(`${def.id} goal(${q.x/TILE},${q.y/TILE}) calm=${run.metrics.calm} LOS=${run.metrics.firstLosBreakAt} caught=${run.metrics.caughtAt} reinf=${recovery?.reinfiltrationPossible??null} clear=${recovery?.plans.map(p=>`${p.name}:${p.status}`).join(',')??'not-attempted'}\n`);
      fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(result)+'\n');
    }
  }
  for(const def of definitions){const w=world(def.def as StageDefinition);result.straight.push({candidate:def.id,metrics:measureRun(w,sp,sc,'A',{reinfiltrate:true,budget:1500})});}
  fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(result)+'\n');
  process.stderr.write(`Exact oracle lead: ${successes.length}/${screen.length} calm; ${result.pairs.length} same-goal paired runs.\n`);
}

/** Verify a clickable, physically clear endpoint rather than crediting the oracle's obstructed request. */
async function reachableEndpointMain(){
  const out='docs/reports/gameplay-improvement-v5/data/oracle-probe';
  const file=path.join(out,'probe.json'),original=path.join(out,'original-probe.json');
  if(!fs.existsSync(original))fs.copyFileSync(file,original);
  const previous=JSON.parse(fs.readFileSync(original,'utf8'));
  const sp:Spotted={s:previous.scenario.initialState,t:previous.scenario.initialState.t,spotDistance:previous.scenario.distance,speed:0,guardsNear:0,coverNear:false,openShare:0,sourceState:'',by:previous.scenario.source};
  const endpoints=new Map<string,Point>();
  for(const p of previous.pairs){
    const def=previous.definitions.find((d:{id:string})=>d.id===p.candidate),w=world(def.def as StageDefinition);
    const s=p.calm??p.states.at(-1)?.s??sp.s;
    const end=p.route.length>=2?{x:p.route.at(-2),y:p.route.at(-1)}:null;
    p.requestedGoal=p.target;p.navigationEndpoint=end;p.pathFound=p.route.length>=2;delete p.pathReachable;
    p.actualEndTile={x:round(s.player.x/TILE),y:round(s.player.y/TILE)};
    const goal={x:p.target.x*TILE,y:p.target.y*TILE},blockers=s.effectiveMovementBlockers??w.stage.movementBlockers;
    p.reachesRequestedGoal=Math.hypot(s.player.x-goal.x,s.player.y-goal.y)<6;
    p.endDistanceToRequestedGoal=round(Math.hypot(s.player.x-goal.x,s.player.y-goal.y)/TILE);
    p.requestedGoalClear=clearSegment(goal.x,goal.y,goal.x,goal.y,blockers,BODY.playerRadius);
    p.navigationEndpointClear=end?clearSegment(end.x*TILE,end.y*TILE,end.x*TILE,end.y*TILE,blockers,BODY.playerRadius):null;
    if(end&&p.metrics.calm&&p.navigationEndpointClear)endpoints.set(`${end.x},${end.y}`,{x:end.x*TILE,y:end.y*TILE});
  }
  for(const p of previous.screening){
    const run=p.run,endpoint=run.route.length>=2?{x:run.route.at(-2),y:run.route.at(-1)}:null;
    const actual=run.metrics.trace.at(-1);
    run.requestedGoal=run.target;run.navigationEndpoint=endpoint;run.pathFound=run.route.length>=2;delete run.pathReachable;
    run.actualEndTile=actual?{x:actual.x,y:actual.y}:null;
    run.reachesRequestedGoal=!!actual&&Math.hypot(actual.x-run.target.x,actual.y-run.target.y)*TILE<6;
  }
  previous.endpointClarification='Oracle requested goals may be obstructed. Actual navigation endpoint is deduplicated and retested in reachable-endpoint-probe.json. Different requested goals do not establish different escape strategies.';
  fs.writeFileSync(file,JSON.stringify(previous)+'\n');
  const result={generated:new Date().toISOString(),settings:{hz:60,cap:60,scenario:'07-01:9',initialStateHash:previous.scenario.stateHash,plannerBudgetPerEscape:1500,
    requestedGoalsAreExactReachableEndpoints:true,distinctReachableEndpoints:endpoints.size,source:'original-probe.json',
    policy:'Run production navigation to EXACT clear navigation endpoint then stop; same endpoint on both maps. Oracle-selection remains an upper bound, not human evidence.'},
    definitions:previous.definitions,scenario:previous.scenario,pairs:[]as unknown[],straight:previous.straight};
  for(const [key,goal]of endpoints)for(const def of previous.definitions){
    const w=world(def.def as StageDefinition),run=fixedTarget(w,sp,goal,true);
    const recovery=run.calm?recover(w,run.calm):null;
    result.pairs.push({endpointKey:key,candidate:def.id,stageHash:hash(def.def),...run,recovery});
    fs.writeFileSync(path.join(out,'reachable-endpoint-probe.json'),JSON.stringify(result)+'\n');
    process.stderr.write(`${def.id} exactendpoint(${key}) clear=${run.requestedGoalClear} reached=${run.reachesRequestedGoal} end(${run.actualEndTile.x},${run.actualEndTile.y}) LOS=${run.metrics.firstLosBreakAt} calm=${run.metrics.calmAt} caught=${run.metrics.caughtAt} reinf=${recovery?.reinfiltrationPossible??null} plans=${recovery?.plans.map(p=>p.status).join(',')??'none'}\n`);
  }
  fs.writeFileSync(path.join(out,'reachable-endpoint-probe.json'),JSON.stringify(result)+'\n');
}
if(process.argv[1]?.endsWith('/v5/oracleProbe.ts'))void main();
