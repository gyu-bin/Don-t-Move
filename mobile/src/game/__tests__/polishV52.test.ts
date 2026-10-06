import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exitGuidance } from '../../ui/hud/exitGuidance';
import { openingLayout } from '../../ui/branding/openingLayout';
import { campaignStages } from '../levels/campaignStages';
import phase4Baseline from '../../../docs/design/v12/phase4a/SOURCE_STAGES.json';
import type {StageDefinition} from '../levels/StageDefinition';
import { MUSEUM_PATROL } from '../levels/semanticPatrol';
import { compileStage } from '../world/compileStage';
import { buildNavigation, clearSegment, findPath } from '../world/navigation';
import { BODY } from '../guards/guardTuning';
import { createGuardState, createGuardEvents, stepGuard } from '../guards/guardBrain';
import { stepGuards } from '../guards/guardSystem';
import { Awareness } from '../core/types';
import { wrapAngle } from '../core/math';

const viewport={width:390,height:844,top:110,bottom:34};
test('exit guidance: locked/completed absent, acquired visible, four edges and camera movement',()=>{
  assert.equal(exitGuidance(false,{x:500,y:300},{x:0,y:0},1,viewport),null);
  for(const [x,y,angle] of [[-500,460,Math.PI],[900,460,0],[195,-500,-Math.PI/2],[195,1300,Math.PI/2]]){
    const result=exitGuidance(true,{x,y},{x:0,y:0},1,viewport)!;
    assert(result.edge);assert(Math.abs(wrapAngle(result.angle-angle))<0.01);
    assert(result.x>=32&&result.x<=358&&result.y>=132&&result.y<=788);
  }
  const exit={x:600,y:400};
  assert(exitGuidance(true,exit,{x:0,y:0},1,viewport)!.edge);
  assert.deepEqual(exitGuidance(true,exit,{x:450,y:0},1,viewport),{x:150,y:400,angle:0,edge:false});
  assert(Math.abs(exitGuidance(true,exit,{x:1000,y:0},1,viewport)!.angle)>2);
  const diagonal=exitGuidance(true,{x:900,y:-300},{x:0,y:0},2,viewport)!;
  assert(diagonal.angle<0&&diagonal.angle>-Math.PI/2);
});

test('Lobby scene and centred menu stay inside safe areas on every portrait iPhone ratio',()=>{
  for(const [width,height,top,bottom] of [[320,568,20,0],[375,667,20,0],[375,812,47,34],[390,844,47,34],[393,852,59,34],[402,874,62,34],[430,932,59,34],[440,956,62,34]]){
    const c=openingLayout(width,height,{top,bottom,left:0,right:0});
    assert(c.menu.y+c.menu.h<=height-bottom-12);
    assert(Math.abs(c.menu.x+c.menu.w/2-width/2)<1e-6);
    assert(c.logoTop>=top);
  }
});

function fixture(){
  // V5.2's six-zone semantic-tour contract belongs to its authored Museum,
  // preserved before Phase4A. New spatial maps have separate real patrol tests.
  const stage=compileStage((phase4Baseline as StageDefinition[])[0]),nav=buildNavigation(stage,BODY.guardRadius);
  return {stage,nav,guards:stage.guards.map(g=>createGuardState(g)),ev:createGuardEvents()};
}
const hidden={x:-1000,y:-1000,gait:0};
test('Current Museum/Gallery patrols physically visit every authored anchor for 120 seconds',()=>{
  const missions=campaignStages.filter(d=>(d.chapter??0)<=2);assert.equal(missions.length,10);
  for(const def of missions){
    const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
    const guards=stage.guards.map(g=>createGuardState(g)),ev=createGuardEvents();
    const visited=guards.map(g=>g.route.map(()=>false)),distance=guards.map(()=>0);
    for(let frame=0;frame<7200;frame++){
      const previous=guards.map(g=>({x:g.x,y:g.y}));
      stepGuards(guards,hidden,stage.visionBlockers,nav,1/60,ev,frame/60,true);
      guards.forEach((g,i)=>{
        const p=previous[i];assert(clearSegment(p.x,p.y,g.x,g.y,nav.blockers,BODY.guardRadius),`${def.id}:${g.id}: patrol crossed collision`);
        const d=Math.hypot(g.x-p.x,g.y-p.y);distance[i]+=d;
        if(d>.001)assert(Math.abs(wrapAngle(g.facing-Math.atan2(g.y-p.y,g.x-p.x)))<.001,`${def.id}:${g.id}: moving facing mismatch`);
        g.route.forEach((a,j)=>{if(Math.hypot(g.x-a.x,g.y-a.y)<=9)visited[i][j]=true;});
      });
    }
    guards.forEach((g,i)=>{
      assert(distance[i]>50,`${def.id}:${g.id}: patrol never moved`);
      assert(visited[i].every(Boolean),`${def.id}:${g.id}: missed anchors ${visited[i].map((v,j)=>v?null:j).filter(j=>j!==null)}`);
      assert(g.pathPlans<150,`${def.id}:${g.id}: excessive path planning`);
      assert.equal(g.patrolRecoveries,0,`${def.id}:${g.id}: patrol needed stall recovery`);
    });
  }
});
test('Museum anchors are exact reachable subjects in assigned zones, not arbitrary floor samples',()=>{
  const {stage,nav}=fixture();
  assert.equal(MUSEUM_PATROL.zones.length,6);
  for(const assignment of MUSEUM_PATROL.assignments){
    const guard=stage.guards.find(g=>g.id===assignment.guardId)!;
    assert(guard.semanticPatrol);
    for(const id of assignment.anchors){
      const a=MUSEUM_PATROL.anchors.find(p=>p.id===id)!;
      assert(a.subject&&assignment.zones.includes(a.zone));
      assert(clearSegment(a.x*40,a.y*40,a.x*40,a.y*40,nav.blockers,BODY.guardRadius));
    }
    for(const a of guard.route)for(const b of guard.route)assert.deepEqual(findPath(nav,a.x,a.y,b.x,b.y).slice(-2),[b.x,b.y]);
  }
});
test('120 seconds: full Museum tours, pauses, no orbit, no repeated anchor, collision/facing invariant',()=>{
  const {stage,nav,guards,ev}=fixture(),visits=guards.map(()=>[] as number[]);
  for(let frame=0;frame<7200;frame++){
    const previous=guards.map(g=>({x:g.x,y:g.y,facing:g.facing,visits:g.roamVisits}));
    stepGuards(guards,hidden,stage.visionBlockers,nav,1/60,ev,frame/60,true);
    guards.forEach((g,i)=>{
      const p=previous[i];assert(clearSegment(p.x,p.y,g.x,g.y,nav.blockers,BODY.guardRadius));
      if(Math.hypot(g.x-p.x,g.y-p.y)>0.001)assert(Math.abs(wrapAngle(g.facing-Math.atan2(g.y-p.y,g.x-p.x)))<0.001);
      assert(Math.abs(wrapAngle(g.facing-p.facing))<0.2,'No turn snap');
      if(g.roamVisits!==p.visits){visits[i].push(g.roamPrevious);assert(g.wait>=0.8&&g.wait<=2.5);}
    });
  }
  for(let i=0;i<guards.length;i++){
    assert.equal(new Set(visits[i]).size,guards[i].route.length);
    assert(visits[i].length>=8);assert.equal(guards[i].patrolRecoveries,0);
    for(let j=1;j<visits[i].length;j++)assert.notEqual(visits[i][j],visits[i][j-1]);
    assert(guards[i].pathPlans<150,'No per-frame A*');
  }
});
test('no-progress recovery changes anchor without teleport; investigation suspends anchors and returns',()=>{
  const {stage,nav,guards,ev}=fixture(),g=guards[0];g.wait=0;g.delay=0;
  // Simulate a stalled actuator while perception/navigation still execute.
  g.pace=0;const start={x:g.x,y:g.y};const target=g.routeIdx;
  for(let f=0;f<260;f++)stepGuard(g,hidden,stage.visionBlockers,1/60,ev,f/60,true,1,nav);
  assert(g.patrolRecoveries>=1);assert.notEqual(g.routeIdx,target);assert.equal(g.x,start.x);assert.equal(g.y,start.y);
  g.pace=0.8;g.suspicion=0.7;g.hasLkp=true;g.lkpX=320;g.lkpY=440;
  const visits=g.roamVisits;
  for(let f=0;f<60;f++)stepGuard(g,hidden,stage.visionBlockers,1/60,ev,5+f/60,true,1,nav);
  assert.equal(g.roamVisits,visits);assert(g.localInvestigating);
  for(let f=0;f<3600;f++)stepGuard(g,hidden,stage.visionBlockers,1/60,ev,6+f/60,true,1,nav);
  assert(!g.localInvestigating&&!g.localReturning);assert(g.roamVisits>visits);
});
test('global pursuit returns to reachable assigned patrol anchors',()=>{
  const {stage,nav,guards,ev}=fixture();ev.globalAlert=true;ev.globalRevision=1;
  for(const g of guards){g.awareness=Awareness.Return;g.stateT=0;g.knownRevision=1;g.returnIndex=0;}
  for(let f=0;f<7200&&ev.globalAlert;f++)stepGuards(guards,hidden,stage.visionBlockers,nav,1/60,ev,f/60,true);
  assert(!ev.globalAlert);assert(guards.every(g=>g.awareness===Awareness.Patrol));
});

test('controlled roaming remains inside assigned anchor set, avoids immediate reversal and repeats deterministically',()=>{
  const a=fixture(),b=fixture();for(const g of [...a.guards,...b.guards])g.roaming=true;
  const visits=a.guards.map(()=>[] as number[]);
  for(let f=0;f<7200;f++){
    const before=a.guards.map(g=>g.roamVisits);
    for(const setup of [a,b])stepGuards(setup.guards,hidden,setup.stage.visionBlockers,setup.nav,1/60,setup.ev,f/60,true);
    a.guards.forEach((g,i)=>{
      assert.equal(g.x,b.guards[i].x);assert.equal(g.y,b.guards[i].y);
      assert(g.routeIdx>=0&&g.routeIdx<g.route.length);
      if(before[i]!==g.roamVisits)visits[i].push(g.roamPrevious);
    });
  }
  for(const tour of visits){
    assert(tour.length>6);
    for(let i=1;i<tour.length;i++){
      assert.notEqual(tour[i],tour[i-1]);if(i>1)assert.notEqual(tour[i],tour[i-2]);
    }
  }
});
