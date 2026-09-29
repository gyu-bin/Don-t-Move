import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Awareness, GuardAction } from '../../core/types';
import { guardIndicator } from '../../../rendering/effects/guardIndicator';
import type { StageDefinition } from '../../levels/StageDefinition';
import { compileStage } from '../../world/compileStage';
import { buildNavigation } from '../../world/navigation';
import { createGuardEvents, createGuardState } from '../guardBrain';
import type { GuardState, PlayerView } from '../guardBrain';
import { updateGuardPhase } from '../guardPhase';
import { stepGuards } from '../guardSystem';
import { BODY } from '../guardTuning';
import { buildVisionFan } from '../guardVision';
import { stepTheft } from '../theftAlert';
import type { TheftContext } from '../theftAlert';

const dt = 1 / 60;
const hidden: PlayerView = { x: -1000, y: -1000, gait: 0 };
function fixture() {
  const def: StageDefinition = {
    id: '01-10', number: 10, title: 'Priority regression', theme: 'museum', props: [], lights: [],
    layout: Array.from({ length: 18 }, (_, y) => Array.from({ length: 26 }, (_, x) =>
      x === 0 || x === 25 || y === 0 || y === 17 ? '#' : '.').join('')),
    playerSpawn: { x: 3, y: 14, facing: 0 }, objective: { kind: 'diamond', x: 8, y: 5 },
    exit: { x: 2, y: 14, w: 2, h: 2 },
    guards: [{ id: 'a', x: 5, y: 5, facing: 0, routeId: 'a' },
      { id: 'b', x: 5, y: 10, facing: 0, routeId: 'b' }],
    patrolRoutes: [{ id: 'a', mode: 'pingpong', points: [{ x: 5, y: 5 }, { x: 5, y: 6 }] },
      { id: 'b', mode: 'pingpong', points: [{ x: 5, y: 10 }, { x: 5, y: 11 }] }],
  };
  const stage = compileStage(def), nav = buildNavigation(stage, BODY.guardRadius);
  const guards = stage.guards.map(g => createGuardState(g)), ev = createGuardEvents();
  const context: TheftContext = { missionId: def.id, empty: false, x: stage.objective.x,
    y: stage.objective.y, posts: guards.map(g => g.route), roles: ['objective', 'exit'] };
  let t = 0;
  const tick = (player = hidden) => {
    t += dt;
    stepGuards(guards, player, stage.visionBlockers, nav, dt, ev, t, false, 1, context);
  };
  return { stage, nav, guards, ev, context, tick, time: () => t };
}

// Only the perception cache may be refreshed by a discovery pass. All behavior,
// memory, motion, animation, path and timers must survive a higher-priority alert.
function protectedState(g: GuardState) {
  return { awareness: g.awareness, suspicion: g.suspicion, hasLkp: g.hasLkp,
    lkpX: g.lkpX, lkpY: g.lkpY, targetX: g.targetX, targetY: g.targetY,
    speed: g.speed, x: g.x, y: g.y, facing: g.facing, gait: g.gait, phase: g.phase,
    stateT: g.stateT, alertAge: g.alertAge, searchWait: g.searchWait, searchIndex: g.searchIndex,
    whistleT: g.whistleT, whistled: g.whistled, action: g.action,
    path: [...g.path], pathIndex: g.pathIndex, repathAt: g.repathAt };
}
function seedPursuit(f: ReturnType<typeof fixture>, awareness: number) {
  Object.assign(f.ev, { globalAlert: true, spottedEpisode: true, spottedWhistleRevision: 1,
    whistleCount: 1, globalRevision: 4, globalX: 411, globalY: 255, globalT: 6,
    phase: awareness === Awareness.Search ? 'SEARCH' : 'PLAYER_SPOTTED' });
  f.guards.forEach((g, i) => Object.assign(g, { awareness, hasLkp: true, lkpX: 411, lkpY: 255,
    targetX: 411 + i, targetY: 255 + i, suspicion: .8, speed: 57,
    stateT: 3.2, alertAge: 6, searchWait: .75, searchIndex: 2, whistleT: .65,
    whistled: true, knownRevision: 4, path: [411, 255], pathIndex: 0, repathAt: 9,
    action: awareness === Awareness.Search ? GuardAction.Search : GuardAction.None }));
  f.guards.forEach(g => buildVisionFan(g, f.stage.visionBlockers));
}

for (const state of [Awareness.Chase, Awareness.Search]) {
  test(`empty-case fact merges during ${state === Awareness.Chase ? 'CHASE' : 'SEARCH'} without touching pursuit`, () => {
    const f = fixture(); seedPursuit(f, state); f.context.empty = true;
    const before = f.guards.map(protectedState);
    const global = { x: f.ev.globalX, y: f.ev.globalY, t: f.ev.globalT, revision: f.ev.globalRevision };
    stepTheft(f.guards, hidden, f.stage.visionBlockers, f.nav, f.ev, f.context, dt, 10);
    assert(f.ev.theftAlert, 'actual visible empty case must record the theft even during a global pursuit');
    assert.equal(f.ev.theftActivatedAt, 10);
    assert.equal(f.ev.theftRevision, 1);
    assert.deepEqual(f.guards.map(protectedState), before);
    assert.deepEqual({ x: f.ev.globalX, y: f.ev.globalY, t: f.ev.globalT, revision: f.ev.globalRevision }, global);
    assert.equal(f.ev.theftWhistleRevision, 0, 'lower-priority theft whistle must not interrupt pursuit');
    assert.equal(f.ev.spottedWhistleRevision, 1); assert.equal(f.ev.whistleCount, 1);
    for (let frame = 1; frame <= 120; frame++) {
      stepTheft(f.guards, hidden, f.stage.visionBlockers, f.nav, f.ev, f.context, dt, 10 + frame * dt);
    }
    assert.equal(f.ev.theftActivatedAt, 10, 'repeat sightings cannot reset lockdown');
    assert.equal(f.ev.theftRevision, 1); assert.equal(f.ev.theftWhistleRevision, 0);
    assert.deepEqual(f.guards.map(protectedState), before);
    updateGuardPhase(f.ev, f.guards, 12, '01-10');
    assert.equal(f.ev.lockdownRemaining, 18); assert(!f.ev.lockdownActive);
    updateGuardPhase(f.ev, f.guards, 30, '01-10');
    assert(f.ev.lockdownActive); assert(!f.ev.caught);
    assert.notEqual(f.ev.phase, 'THEFT_ALERT');
  });
}

test('higher-priority alert still requires actual empty-case range, facing and LOS', () => {
  for (const mode of ['full', 'back', 'range', 'wall']) {
    const f = fixture(); seedPursuit(f, Awareness.Chase); f.context.empty = mode !== 'full';
    if (mode === 'back') f.guards.forEach(g => { g.facing = Math.PI; });
    if (mode === 'range') f.context.x = 10000;
    const vision = mode === 'wall' ? [...f.stage.visionBlockers, f.guards[0].x + 20, 0, f.guards[0].x + 40, f.stage.height] : f.stage.visionBlockers;
    f.guards.forEach(g => buildVisionFan(g, vision));
    stepTheft(f.guards, hidden, vision, f.nav, f.ev, f.context, dt, 10);
    assert(!f.ev.theftAlert, mode); assert.equal(f.ev.theftActivatedAt, -1, mode);
    assert.equal(f.ev.theftWhistleRevision, 0, mode);
  }
});

test('pending theft cannot hijack a local player whistle before global alert publication', () => {
  const f = fixture(); f.context.empty = true;
  stepTheft(f.guards, hidden, f.stage.visionBlockers, f.nav, f.ev, f.context, dt, 1);
  assert.equal(f.ev.theftGuard, 'a'); assert(!f.ev.theftAlert);
  const witness = f.guards[1];
  Object.assign(witness, { awareness: Awareness.Alert, suspicion: 1, hasLkp: true,
    lkpX: witness.x + 120, lkpY: witness.y, whistleT: .2, action: GuardAction.Whistle });
  const before = protectedState(witness);
  stepTheft(f.guards, hidden, f.stage.visionBlockers, f.nav, f.ev, f.context, dt, 1 + dt);
  assert(f.ev.theftAlert); assert.deepEqual(protectedState(witness), before);
  assert.equal(f.ev.theftWhistleRevision, 0);
  const p = { x: witness.lkpX, y: witness.lkpY, gait: 3 };
  for (let i = 0; i < 90 && !f.ev.globalAlert; i++) f.tick(p);
  assert(f.ev.globalAlert, 'the original player whistle must finish instead of being stranded by the theft fact');
  assert.equal(f.ev.spottedWhistleRevision, 1); assert.equal(f.ev.theftWhistleRevision, 0);
  assert.equal(witness.awareness, Awareness.Chase); assert.equal(f.ev.globalX, p.x);
});

test('Scenario A: player-first Chase survives later empty-case discovery across frames', () => {
  const f = fixture(), witness = f.guards[0];
  const p = { x: witness.x + 150, y: witness.y, gait: 3 };
  witness.suspicion = .999;
  for (let frame = 0; frame < 120 && !f.ev.globalAlert; frame++) f.tick(p);
  assert(f.ev.globalAlert); assert.equal(witness.awareness, Awareness.Chase);
  assert.equal(f.ev.spottedWhistleRevision, 1); assert(!f.ev.theftAlert);
  // A different guard sees the case while the original witness continues pursuit.
  f.context.x = f.guards[1].x + 80; f.context.y = f.guards[1].y; f.context.empty = true;
  const beforeAge = witness.alertAge;
  const backup = f.guards[1];
  assert(!backup.canSee); assert(!backup.hasLkp);
  const backupTarget = { x: backup.targetX, y: backup.targetY };
  assert.deepEqual(backupTarget, { x: p.x, y: p.y });
  for (let frame = 0; frame < 24; frame++) {
    f.tick(p);
    assert(f.ev.theftAlert); assert.equal(witness.awareness, Awareness.Chase);
    assert.equal(guardIndicator(witness, f.ev, true), 'alert', 'the actual renderer selector must keep ! on every chase frame');
    assert.equal(f.ev.phase, 'PLAYER_SPOTTED'); assert.equal(f.ev.globalX, p.x); assert.equal(f.ev.globalY, p.y);
    assert.equal(witness.targetX, p.x); assert.equal(witness.targetY, p.y);
    assert(witness.alertAge >= beforeAge); assert(!f.ev.caught);
    assert(!backup.canSee); assert(!backup.hasLkp);
    assert.equal(backup.awareness, Awareness.Investigate);
    assert.deepEqual({ x: backup.targetX, y: backup.targetY }, backupTarget,
      'late theft must not redirect an uninformed pursuer from player LKP to its exit post');
  }
  assert(witness.speed > 0); assert(f.ev.lockdownRemaining > 19 && f.ev.lockdownRemaining < 20);
  assert.equal(f.ev.theftWhistleRevision, 0); assert.equal(f.ev.spottedWhistleRevision, 1);
});

test('Scenario B: theft-first discovery still escalates with distinct whistles', () => {
  const f = fixture(); f.context.empty = true;
  for (let frame = 0; frame < 180 && !f.ev.theftAlert; frame++) f.tick();
  assert(f.ev.theftAlert); assert.equal(f.ev.theftWhistleRevision, 1); assert.equal(f.ev.phase, 'THEFT_ALERT');
  const witness = f.guards[0], p = { x: witness.x + Math.cos(witness.facing) * 100,
    y: witness.y + Math.sin(witness.facing) * 100, gait: 2 };
  f.tick(p);
  assert.equal(f.ev.phase, 'PLAYER_SPOTTED'); assert.equal(witness.awareness, Awareness.Chase);
  assert.equal(f.ev.spottedWhistleRevision, 1); assert.equal(f.ev.theftWhistleRevision, 1);
  assert.equal(f.ev.globalX, p.x); assert.equal(f.ev.globalY, p.y);
});

test('Scenario C: player lost into Search retains memory and search timing after theft discovery', () => {
  const f = fixture(), witness = f.guards[0];
  const p = { x: witness.x + 100, y: witness.y, gait: 3 };
  witness.suspicion = .999;
  for (let frame = 0; frame < 120 && !f.ev.globalAlert; frame++) f.tick(p);
  assert(f.ev.globalAlert);
  for (let frame = 0; frame < 600 && Number(witness.awareness) !== Awareness.Search; frame++) f.tick();
  assert.equal(witness.awareness, Awareness.Search); assert.equal(f.ev.phase, 'SEARCH');
  const lkp = { x: f.ev.globalX, y: f.ev.globalY, revision: f.ev.globalRevision };
  const elapsed = witness.stateT;
  f.context.x = witness.x + Math.cos(witness.facing) * 60;
  f.context.y = witness.y + Math.sin(witness.facing) * 60; f.context.empty = true;
  for (let frame = 0; frame < 24; frame++) {
    f.tick();
    assert(f.ev.theftAlert); assert.equal(f.ev.phase, 'SEARCH');
    assert.equal(witness.awareness, Awareness.Search); assert(witness.stateT >= elapsed);
    assert.equal(guardIndicator(witness, f.ev, true), 'search', 'theft facts cannot replace the current search indicator');
    assert(witness.hasLkp); assert.equal(witness.lkpX, p.x); assert.equal(witness.lkpY, p.y);
    assert.deepEqual({ x: f.ev.globalX, y: f.ev.globalY, revision: f.ev.globalRevision }, lkp);
  }
  assert.equal(f.ev.theftWhistleRevision, 0); assert.equal(f.ev.spottedWhistleRevision, 1);
  assert(f.ev.lockdownRemaining > 19); assert(!f.ev.caught);
});

test('advanced theft whistle cannot publish fake player intelligence before the real witness finishes', () => {
  for (const reverse of [false, true]) {
    const f = fixture(); f.context.empty = true;
    stepTheft(f.guards, hidden, f.stage.visionBlockers, f.nav, f.ev, f.context, dt, 1);
    const confirmer = f.guards[0], witness = f.guards[1];
    assert.equal(f.ev.theftGuard, confirmer.id); assert(!confirmer.hasLkp);
    Object.assign(confirmer, { action: GuardAction.Whistle, whistleT: .63 });
    Object.assign(witness, { awareness: Awareness.Alert, suspicion: 1, hasLkp: true,
      lkpX: 410, lkpY: 450, whistleT: .01, action: GuardAction.Whistle });
    if (reverse) { f.guards.reverse(); f.context.posts.reverse(); f.context.roles?.reverse(); }
    for (let frame = 0; frame < 8; frame++) {
      f.tick();
      assert(!f.ev.globalAlert, 'a lower-priority theft animation cannot publish player (0,0) or complete the player whistle');
      assert.equal(f.ev.phase, 'PLAYER_SPOTTED');
      assert.equal(guardIndicator(witness, f.ev, true), 'alert');
      assert.equal(f.ev.theftWhistleRevision, 0);
      assert.equal(f.ev.globalRevision, 0);
    }
    assert(f.ev.theftAlert);
    for (let frame = 0; frame < 90 && !f.ev.globalAlert; frame++) f.tick();
    assert(f.ev.globalAlert, 'the actual player witness must eventually publish its saved sighting');
    assert.equal(f.ev.whistleGuard, witness.id); assert.equal(f.ev.spottedSource, witness.id);
    assert.equal(f.ev.globalX, 410); assert.equal(f.ev.globalY, 450);
    assert.equal(f.ev.spottedWhistleRevision, 1); assert.equal(f.ev.theftWhistleRevision, 0);
    assert.equal(f.ev.whistleCount, 1); assert(!f.ev.caught);
  }
});

test('a genuine player witness that also discovers the case remains the player whistle owner', () => {
  const f = fixture(); f.guards.splice(1); f.context.posts.splice(1); f.context.roles?.splice(1);
  const witness = f.guards[0];
  Object.assign(witness, { awareness: Awareness.Alert, suspicion: 1, hasLkp: true,
    lkpX: witness.x + 120, lkpY: witness.y, whistleT: .01, action: GuardAction.Whistle });
  f.context.empty = true;
  buildVisionFan(witness, f.stage.visionBlockers);
  f.tick();
  assert(f.ev.theftAlert); assert.equal(f.ev.theftGuard, witness.id);
  assert.equal(f.ev.theftConfirmer, '', 'the case fact source is not a lower-priority whistle owner');
  assert.equal(f.ev.phase, 'PLAYER_SPOTTED');
  const afterFirstTick = witness.whistleT;
  f.tick();
  assert(witness.whistleT > afterFirstTick, 'recording the case source must not strand the real player whistle');
  for (let frame = 0; frame < 90 && !f.ev.globalAlert; frame++) f.tick();
  assert(f.ev.globalAlert); assert.equal(f.ev.whistleGuard, witness.id);
  assert.equal(f.ev.spottedSource, witness.id);
  assert.equal(f.ev.globalX, witness.lkpX); assert.equal(f.ev.globalY, witness.lkpY);
  assert.equal(f.ev.spottedWhistleRevision, 1); assert.equal(f.ev.theftWhistleRevision, 0);
  assert.equal(f.ev.whistleCount, 1);
});
