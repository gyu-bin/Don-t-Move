/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playableStages } from '../levels/stages/tiltTestMaps';
import { compileStage, TILE } from '../world/compileStage';
import { buildNavigation, clearSegment } from '../world/navigation';
import { createPlaygroundState, stepPlayground } from '../playground/playgroundState';
import { createGuardEvents, createGuardState, stepGuard } from '../guards/guardBrain';
import { Awareness } from '../core/types';
import { BODY } from '../guards/guardTuning';
import { canSelectStage, clearStage, DEFAULT_PROGRESS, normalizeProgress } from '../progress/stageProgress';

function fixture(index = 0) {
  const stage = compileStage(playableStages[index]);
  const s = createPlaygroundState(stage);
  s.playerMode = 0;
  const nav = buildNavigation(stage, BODY.guardRadius);
  const tick = () => stepPlayground(s, 1 / 60, TILE, 376, 800,
    { x:0,y:0,w:stage.width,h:stage.height }, stage.movementBlockers, stage.visionBlockers, nav);
  return {stage,s,nav,tick};
}

for (const awareness of [Awareness.Alert, Awareness.Chase, Awareness.Search]) {
  test(`Active Exit wins during guard state ${awareness}, including contact on arrival`, () => {
    const {stage,s,tick} = fixture();
    s.mission.treasure = true;
    s.events.globalAlert = true;
    s.player.x = stage.exit.x + stage.exit.w / 2;
    s.player.y = stage.exit.y + stage.exit.h / 2;
    Object.assign(s.guards[0], {x:s.player.x,y:s.player.y,awareness});
    tick();
    assert(s.mission.complete);
    assert(!s.events.caught);
    const time = s.t;
    tick();
    assert.equal(s.t, time);
    assert.equal(s.mission.completeRevision,1);
  });
}

test('Locked Exit cannot save a player from contact; Retry resets treasure, clock and alerts', () => {
  const {stage,s,tick} = fixture();
  s.player.x = stage.exit.x + stage.exit.w / 2;
  s.player.y = stage.exit.y + stage.exit.h / 2;
  Object.assign(s.guards[0],{x:s.player.x,y:s.player.y});
  tick();
  assert(s.events.caught && !s.mission.complete);
  s.mission.treasure = true;
  tick();
  assert(!s.mission.complete, 'a previous capture is terminal');
  const retry = createPlaygroundState(stage);
  assert.equal(retry.t,0);
  assert.equal(retry.events.whistleCount,0);
  assert(!retry.mission.treasure && !retry.mission.complete && !retry.events.caught);
});

test('Pickup applies authored escape patrol once without forcing alert or teleporting guards', () => {
  const {stage,s,tick} = fixture(7);
  s.player.x = stage.objective.x; s.player.y = stage.objective.y;
  s.patrol = false;
  const positions = s.guards.map((g) => [g.x,g.y]);
  tick();
  assert(s.mission.treasure);
  assert(!s.events.globalAlert);
  assert.equal(s.events.whistleCount,0);
  assert.deepEqual(s.guards.map((g) => [g.x,g.y]),positions);
  const changed = s.guards.find((g) => g.escapePatrol)!;
  assert.equal(changed.pace,changed.escapePatrol!.pace);
  assert.equal(changed.route[0].wait,changed.escapePatrol!.waitDuration);
  tick();
  assert.equal(s.mission.treasureRevision,1);
});

test('Progress migration, stage locks, best time and chapter completion survive serialization', () => {
  const old = normalizeProgress({currentStage:4,highestUnlocked:4,heistComplete:true});
  assert(!old.heistComplete && old.highestUnlocked === 5);
  assert.deepEqual(old.clearedStages,[0,1,2,3,4]);
  let progress = {...DEFAULT_PROGRESS};
  assert(canSelectStage(progress,0) && !canSelectStage(progress,1));
  assert(canSelectStage(progress,9,true) && !canSelectStage(progress,10,true));
  for (let i=0;i<10;i++) progress=clearStage(progress,i,100-i);
  progress=clearStage(progress,0,120);
  assert.equal(progress.bestTimes[0],100);
  progress=clearStage(progress,0,80);
  assert.equal(progress.bestTimes[0],80);
  assert(progress.heistComplete && progress.clearedStages.length === 10);
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(progress))),progress);
});

for (const mode of ['loop','pingpong','waitAndLook'] as const) {
  test(`${mode}: stop, timed look, then travel with canonical facing and no turning drift`, () => {
    const compiled=compileStage({...playableStages[0],guards:[{id:'test',x:4,y:4,facing:0,routeId:'test'}],
      patrolRoutes:[{id:'test',mode,points:[
        {x:4,y:4,waitDuration:0,lookDirection:0},
        {x:6,y:4,waitDuration:1.2,lookDirection:Math.PI/2,turnDuration:0.8},
        {x:6,y:6,waitDuration:1.2,lookDirection:Math.PI,turnDuration:0.8},
      ]}]});
    const g=createGuardState(compiled.guards[0]);
    const ev=createGuardEvents();
    let stoppedLooking=false; let reachedThird=false; let reversed=false;
    for(let i=0;i<60*30;i++) {
      const x=g.x,y=g.y;
      stepGuard(g,{x:-1000,y:-1000,gait:0},[],1/60,ev,i/60,true);
      if(g.wait>0.2 && Math.abs(g.x-240)<2 && Math.abs(g.y-160)<2) {
        if(Math.abs(g.facing-Math.PI/2)<0.05) stoppedLooking=true;
        if(g.wait<1) assert(Math.hypot(g.x-x,g.y-y)<0.001);
      }
      if(Math.abs(g.y-240)<2) reachedThird=true;
      if(g.routeDir === -1) reversed=true;
      assert.equal(g.facing,g.baseFacing);
    }
    assert(stoppedLooking && reachedThird);
    assert.equal(reversed,mode!=='loop');
  });
}

test('All authored patrols stay collision-clear through repeated stops and turns', () => {
  for(const definition of playableStages) {
    const {s,nav,tick}=fixture(definition.number-1);
    s.player.x=-10000; s.player.y=-10000;
    for(let frame=0;frame<60*35;frame++) {
      tick();
      for(const g of s.guards) assert(clearSegment(g.x,g.y,g.x,g.y,nav.blockers,BODY.guardRadius), `${definition.number}/${g.id} drifted into cover`);
    }
  }
});
