/**
 * Reproduction (documents current behaviour; changes nothing): with Navigation — always the case in production —
 * the V2 investigation branch (suspicion ≥ 0.5) runs before the V1 "stop and face" branch (stopThreshold 0.6), so the
 * stop/face reaction is only reachable without Navigation. GAME_RULES §16 (current table) specifies the V2 behaviour.
 * Real campaign case: the investigating guard reaches the thief and captures by contact before 100 % (no whistle).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {createGuardState,createGuardEvents,stepGuard} from '../../src/game/guards/guardBrain';
import {GUARD_TUNING as T,BODY} from '../../src/game/guards/guardTuning';
import {wrapAngle} from '../../src/game/core/math';
import {Awareness} from '../../src/game/core/types';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import {runMission} from './campaignAudit';

function fixture() {
  const layout=Array.from({length:12},(_,y)=>Array.from({length:20},(_,x)=>x===0||y===0||x===19||y===11?'#':'.').join(''));
  const def:StageDefinition={id:'prio',number:1,title:'prio',theme:'museum',layout,props:[],lights:[],
    playerSpawn:{x:9,y:5.5,facing:0},
    guards:[{id:'g',x:4,y:5.5,facing:0,routeId:'r',visionRange:5,visionHalfAngle:0.52}],
    patrolRoutes:[{id:'r',mode:'loop',points:[{x:4,y:5.5,wait:30},{x:4,y:6.5,wait:30}]}]} as StageDefinition;
  const stage=compileStage(def), nav=buildNavigation(stage,BODY.guardRadius);
  return {stage,nav,g:createGuardState(stage.guards[0]),ev:createGuardEvents()};
}
const player={x:7.5*TILE,y:5.5*TILE,gait:0};

test('with Navigation, 0.6–0.99 is spent walking to the LKP: the stop/face branch never runs', () => {
  const {stage,nav,g,ev}=fixture(); const x0=g.x; let t=0, samples=0, moving=0;
  for (let i=0;i<60*12&&g.suspicion<1;i++) {
    t+=1/60; stepGuard(g,player,stage.visionBlockers,1/60,ev,t,true,1,nav);
    if (g.suspicion>=T.stopThreshold&&g.suspicion<1) { samples++; if (g.localInvestigating&&g.speed>1) moving++; }
  }
  assert.ok(samples>0,'fixture never reached the 0.6–0.99 band');
  assert.ok(moving/samples>0.9,`guard stood still in ${samples-moving}/${samples} frames of the 0.6–0.99 band`);
  assert.ok(g.x>x0+TILE,'guard did not advance toward the thief');
});

test('without Navigation (legacy primitive), the same exposure stops the guard and turns it to the thief', () => {
  const {stage,g,ev}=fixture(); let t=0, stood=0, samples=0;
  for (let i=0;i<60*12&&g.suspicion<1;i++) {
    t+=1/60; stepGuard(g,player,stage.visionBlockers,1/60,ev,t,true,1);
    if (g.suspicion>=T.stopThreshold+0.05&&g.suspicion<1) { samples++; if (g.speed<1&&Math.abs(wrapAngle(g.facing-Math.atan2(player.y-g.y,player.x-g.x)))<0.1) stood++; }
  }
  assert.ok(samples>0&&stood/samples>0.9,`stood/faced in ${stood}/${samples} frames`);
});

test('real case 01-01 (Walk, risk route, 2s delay): caught by contact while the guard investigates, before 100 % and without a whistle', () => {
  const def=(campaign as StageDefinition[]).find(d=>d.id==='01-01')!;
  let last:{guards:{id:string;suspicion:number;awareness:number;localInvestigating:boolean}[];events:{whistleCount:number;caughtBy:string}}|null=null;
  const r=runMission(def,'walk',1,2,'A',undefined,s=>{ last=s as never; });
  assert.equal(r.outcome,'caught-contact');
  const st=last!; const g=st.guards.find(x=>x.id===st.events.caughtBy)!;
  assert.ok(g.suspicion>=0.5&&g.suspicion<1,`suspicion ${g.suspicion}`);
  assert.equal(g.awareness,Awareness.Suspicious);
  assert.ok(g.localInvestigating,'guard was not investigating');
  assert.equal(st.events.whistleCount,0);
  console.log(`  01-01 contact capture by ${g.id} at ${r.seconds}s, suspicion ${g.suspicion.toFixed(2)}, investigating, no whistle`);
});
