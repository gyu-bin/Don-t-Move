import test from 'node:test';
import assert from 'node:assert/strict';
import campaign from '../../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import {createPlaygroundState} from '../../../src/game/playground/playgroundState';
import {Awareness} from '../../../src/game/core/types';
import {world,scenarios,provoke} from '../v4/chaseLab';
import {MetricCollector,measureRun,bindState,invalidStart,hash} from './experiment';
import {candidatesFor} from './candidates';

const def=(campaign as unknown as StageDefinition[]).find(d=>d.id==='07-01')!;
const w=world(def);
function state() {
  const s=createPlaygroundState(w.stage);
  s.events.globalAlert=true;
  for(const g of s.guards){g.awareness=Awareness.Investigate;g.canSee=false;g.x=2000;g.y=2000;}
  for(const c of s.securityCameras)c.canSee=false;
  s.guards[0].canSee=true;
  return s;
}

test('early calm is not60s survival, re-infiltration, pickup, or mission clear',()=>{
  const s=state(),m=new MetricCollector(s,'A',s.guards[0].id);
  s.t+=2;s.events.globalAlert=false;for(const g of s.guards){g.awareness=Awareness.Patrol;g.canSee=false;}
  m.observe(s);const r=m.finish();
  assert.equal(r.calm,true);assert.equal(r.calmAt,2);assert.equal(r.survival60,null);assert.equal(r.survivalCensored,true);
  assert.equal(r.reinfiltrationPossible,null);assert.equal(r.missionClear,null);assert.equal(r.pickupAfterRecovery,null);
});

test('LOS break, repeated rediscovery, search intervals and capture retain separate clocks',()=>{
  const s=state(),m=new MetricCollector(s,'B',s.guards[0].id);
  s.t=0.5;s.guards[0].canSee=false;m.observe(s);
  s.t=1;s.guards[0].awareness=Awareness.Search;m.observe(s);
  s.t=1.25;s.guards[0].canSee=true;m.observe(s);
  s.t=2;s.guards[0].canSee=false;s.guards[0].awareness=Awareness.Investigate;m.observe(s);
  s.t=3;s.guards[0].canSee=true;m.observe(s);
  s.t=4;s.events.caught=true;s.events.caughtBy=s.guards[0].id;m.observe(s);
  const r=m.finish();assert.equal(r.firstLosBreakAt,0.5);assert.deepEqual(r.rediscoveryTimes,[1.25,3]);
  assert.equal(r.firstRediscoveryDelay,0.75);assert.equal(r.searchStartedAt,1);assert.equal(r.searchEndedAt,2);
  assert.equal(r.caughtAt,4);assert.equal(r.calm,false);assert.equal(r.survival5,false);assert.equal(r.survival60,false);
});

test('physical contact counts episodes rather than every overlapping frame; wall prevents contact',()=>{
  const s=state();s.guards[0].x=s.player.x;s.guards[0].y=s.player.y;
  const m=new MetricCollector(s,'C',s.guards[0].id);
  s.t=0.1;m.observe(s);s.t=0.2;m.observe(s);assert.equal(m.result.contactEpisodes,1);
  s.guards[0].x+=100;s.t=0.3;m.observe(s);s.guards[0].x-=100;s.t=0.4;m.observe(s);
  assert.equal(m.result.contactEpisodes,2);
  s.guards[0].x=s.player.x+10;
  const wall=[s.player.x+4,s.player.y-20,s.player.x+6,s.player.y+20];
  const blocked=new MetricCollector(s,'C',s.guards[0].id,wall);s.t+=0.1;blocked.observe(s);
  assert.equal(blocked.result.contactEpisodes,0);
});

test('same detected state replays deterministically and remains immutable',()=>{
  const sc=scenarios(def)[0],sp=provoke(w,sc)!;assert.ok(sp);
  const original=hash(sp.s),before=hash(campaign);
  const a=measureRun(w,sp,sc,'A'),b=measureRun(w,sp,sc,'A');
  assert.deepEqual(a,b);assert.equal(hash(sp.s),original);assert.equal(hash(campaign),before);
});

test('candidate rebinding replaces baseline door+cover caches and flags obstructed starts',()=>{
  const sc=scenarios(def)[0],sp=provoke(w,sc)!;
  const candidate=candidatesFor(def).find(c=>c.id==='court-corner')!,cw=world(candidate.def);
  const bound=bindState(cw,sp);
  assert.notDeepEqual(bound.s.effectiveMovementBlockers,sp.s.effectiveMovementBlockers);
  assert.equal(bound.s.guards.every(g=>g.path.length===0),true);
  const p=sp.s.player;const blocker=cw.stage.movementBlockers;
  bound.s.player.x=(blocker[0]+blocker[2])/2;bound.s.player.y=(blocker[1]+blocker[3])/2;
  assert.ok(invalidStart(cw,bound.s).includes('player-overlap'));
  assert.deepEqual(sp.s.player,p);
});

test('already completed real mission is terminal for inherited and spatial flight policies',()=>{
  const sc=scenarios(def)[0],sp=provoke(w,sc)!;sp.s.mission.treasure=true;sp.s.mission.complete=true;
  for(const strategy of ['A','H','I','J','K'] as const){
    const r=measureRun(w,sp,sc,strategy);
    assert.equal(r.duration,0);assert.equal(r.missionClear,true);assert.equal(r.missionClearStatus,'clear-during-flight');
    assert.equal(r.calm,false);assert.equal(r.survival60,null);
  }
});

test('direct mission clear does not require calm or re-infiltration',()=>{
  const s=state(),m=new MetricCollector(s,'H',s.guards[0].id);
  s.t=1;s.mission.treasure=true;s.mission.complete=true;m.observe(s);const r=m.finish();
  assert.equal(r.missionClear,true);assert.equal(r.calm,false);assert.equal(r.reinfiltrationPossible,null);
  assert.ok(r.events.some(e=>e.type==='mission-clear'));
});
