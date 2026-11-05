import assert from 'node:assert/strict';
import test from 'node:test';
import { Awareness, Gait, GuardAction } from '../../core/types';
import { navigationWithDoors } from '../../doors/doorNavigation';
import { createDoor, doorBlockers, stepDoor } from '../../doors/doorSystem';
import { Cell } from '../../world/compileStage';
import type { CompiledStage } from '../../world/compileStage';
import { buildNavigation, clearSegment } from '../../world/navigation';
import { createGuardState } from '../guardBrain';
import { HearingPhase, offerFootstep, stepHearingResponse } from '../guardHearing';
import type { FootfallSound } from '../guardHearing';
import { BODY } from '../guardTuning';

function navigation(movementBlockers: number[] = []) {
  const stage = {
    cols: 8, width: 320, height: 320,
    grid: new Uint8Array(64).fill(Cell.Floor), movementBlockers,
  } as CompiledStage;
  return buildNavigation(stage, BODY.guardRadius);
}

function guard(id: string, x = 80, y = 100) {
  return createGuardState({
    id, x, y, facing: 0, pace: 1, routeMode: 'loop', startDelay: 0,
    visionRange: 200, visionHalfAngle: 0.55,
    route: [{ x, y, wait: 0.25, look: 0 }, { x, y: y + 65, wait: 0, look: 0 }],
  });
}

function footfall(t: number, fields: Partial<FootfallSound> = {}): FootfallSound {
  return { kind: 'footstep', t, x: 135, y: 100, gait: Gait.Run, surface: 'stone', range: 116, strength: 1, ...fields };
}

test('a footfall has one nearest eligible listener and stable ties', () => {
  const nav = navigation();
  const far = guard('far', 55);
  const near = guard('near', 95);
  const tie = guard('tie', 95);
  assert.equal(offerFootstep([far, near, tie], footfall(0), nav, 0), near);
  assert.equal(near.hearing?.phase, HearingPhase.Look);
  assert.equal(near.hearing?.heardX, 135);
  assert.equal(far.hearing, undefined);
  assert.equal(tie.hearing, undefined);
});

test('walls and opaque cover remove a nearer listener before selection', () => {
  const wall = [112, 88, 118, 108];
  const behindWall = guard('blocked', 104);
  const aroundWall = guard('clear', 124, 146);
  assert.equal(offerFootstep([behindWall, aroundWall], footfall(0), navigation(wall), 0), aroundWall);
  assert.equal(behindWall.hearing, undefined);
  assert.equal(offerFootstep([behindWall], footfall(1), navigation(), 1, 1, wall), undefined);
});

test('a closed glass door blocks hearing even when it remains transparent', () => {
  const nav = navigation();
  const g = guard('glass');
  const door = createDoor({ id: 'glass', x: 110, y: 100, width: 40, thickness: 4, type: 'glass', orientation: 'vertical' });
  assert.equal(stepDoor(door, 1, true, []), true);
  const closed = doorBlockers([door]);
  assert.equal(closed.visionBlockers.length, 0);
  assert.equal(offerFootstep([g], footfall(0), navigationWithDoors(nav, closed.movementBlockers), 0), undefined);
  assert.equal(offerFootstep([g], footfall(1), nav, 1), g);
});

test('strength, distance, surface acoustic settings and mission sensitivity govern hearing', () => {
  const nav = navigation();
  assert.equal(offerFootstep([guard('run')], footfall(0), nav, 0)?.hearing?.investigate, true);
  const quietWalk = footfall(0, { gait: Gait.Walk, range: 68, strength: 0.63 });
  assert.equal(offerFootstep([guard('walk')], quietWalk, nav, 0), undefined);
  assert.equal(offerFootstep([guard('near-walk', 115)], quietWalk, nav, 0)?.hearing?.investigate, true);
  const sneak = footfall(0, { gait: Gait.Sneak, range: 34, strength: 0.34 });
  assert.equal(offerFootstep([guard('far-sneak')], sneak, nav, 0), undefined);
  assert.equal(offerFootstep([guard('near-sneak', 120)], sneak, nav, 0)?.hearing?.investigate, false);
  assert.equal(offerFootstep([guard('soft', 120)], { ...sneak, surface: 'carpet', range: 21, strength: 0.24 }, nav, 0), undefined);
  assert.equal(offerFootstep([guard('sensitivity', 120)], sneak, nav, 0, 0.7), undefined);
});

test('a busy guard cannot receive a footfall and real sight cancels an accepted response', () => {
  const nav = navigation();
  for (const awareness of [Awareness.Suspicious, Awareness.Alert, Awareness.Search, Awareness.Chase, Awareness.Investigate, Awareness.Return]) {
    const g = guard('busy');
    g.awareness = awareness;
    assert.equal(offerFootstep([g], footfall(0), nav, 0), undefined);
  }
  const g = guard('confirming-theft');
  g.action = GuardAction.Whistle;
  assert.equal(offerFootstep([g], footfall(0), nav, 0), undefined);
  g.action = GuardAction.None;
  assert.equal(offerFootstep([g], footfall(1), nav, 1), g);
  g.canSee = true;
  g.hasLkp = true;
  g.lkpX = 245;
  g.lkpY = 280;
  g.suspicion = 0.5;
  assert.equal(stepHearingResponse(g, nav, 1.1, 1 / 60), false);
  assert.equal(g.hearing?.phase, HearingPhase.None);
  assert.deepEqual([g.hasLkp, g.lkpX, g.lkpY, g.suspicion], [true, 245, 280, 0.5]);
});

test('a strong response stays on the first position, sweeps, returns, and gives patrol time', () => {
  const nav = navigation();
  const g = guard('main');
  const other = guard('other', 220);
  const origin = { x: g.x, y: g.y, routeIdx: g.routeIdx, routeDir: g.routeDir, wait: g.wait };
  const source = Object.freeze(footfall(0));
  assert.equal(offerFootstep([g, other], source, nav, 0), g);
  const phases = new Set<number>();
  let maxX = g.x;
  let doneAt = -1;
  for (let frame = 1; frame <= 8 * 60; frame++) {
    const t = frame / 60;
    assert.equal(offerFootstep([other, g], footfall(t, { x: 230 }), nav, t), undefined);
    assert.equal(stepHearingResponse(g, nav, t, 1 / 60), true);
    assert.equal(g.hearing?.heardX, source.x);
    assert.equal(g.awareness, Awareness.Patrol);
    assert.equal(g.hasLkp, false);
    assert.equal(g.suspicion, 0);
    assert.ok(clearSegment(g.x, g.y, g.x, g.y, nav.blockers, BODY.guardRadius));
    maxX = Math.max(maxX, g.x);
    phases.add(g.hearing!.phase);
    if (g.hearing?.phase === HearingPhase.None) { doneAt = t; break; }
  }
  assert.ok(doneAt > 0 && doneAt < 7);
  assert.deepEqual([...phases], [HearingPhase.Look, HearingPhase.Investigate, HearingPhase.Sweep, HearingPhase.Return, HearingPhase.None]);
  assert.ok(Math.abs(maxX - source.x) <= 2);
  assert.ok(Math.hypot(g.x - origin.x, g.y - origin.y) <= 2);
  assert.deepEqual([g.routeIdx, g.routeDir, g.wait], [origin.routeIdx, origin.routeDir, origin.wait]);
  assert.equal(offerFootstep([g, other], footfall(doneAt + 1, { x: 230 }), nav, doneAt + 1), undefined);
  assert.equal(offerFootstep([g, other], source, nav, doneAt + 3), undefined);
  assert.equal(offerFootstep([g, other], footfall(doneAt + 3, { x: 230 }), nav, doneAt + 3), other);
});

test('a near sneak briefly turns at most 22 degrees and does not change the authored patrol', () => {
  const nav = navigation();
  const g = guard('main', 135, 115);
  const sound = footfall(0, { gait: Gait.Sneak, range: 34, strength: 0.34 });
  assert.equal(offerFootstep([g], sound, nav, 0), g);
  let maxTurn = 0;
  for (let frame = 1; frame <= 20; frame++) {
    stepHearingResponse(g, nav, frame / 60, 1 / 60);
    maxTurn = Math.max(maxTurn, Math.abs(g.facing));
  }
  assert.equal(g.hearing?.phase, HearingPhase.Look);
  assert.equal(stepHearingResponse(g, nav, 21 / 60, 1 / 60), true);
  assert.equal(g.hearing?.phase, HearingPhase.None);
  assert.deepEqual([g.x, g.y, g.pathPlans, g.awareness], [135, 115, 0, Awareness.Patrol]);
  assert.ok(maxTurn > 0.20 && maxTurn <= 22 * Math.PI / 180 + 1e-6);
  assert.ok(Math.abs(g.facing) < 1e-6);
});

test('old, future, stationary and invalid events cannot be replayed', () => {
  const nav = navigation();
  const g = guard('listener');
  assert.equal(offerFootstep([g], footfall(0), nav, 1), undefined);
  assert.equal(offerFootstep([g], footfall(2), nav, 1), undefined);
  assert.equal(offerFootstep([g], footfall(1, { gait: Gait.Idle }), nav, 1), undefined);
  assert.equal(offerFootstep([g], footfall(1, { x: Number.NaN }), nav, 1), undefined);
  assert.equal(offerFootstep([g], footfall(1, { range: 0 }), nav, 1), undefined);
  assert.equal(offerFootstep([g], footfall(1), nav, 1, 0), undefined);
});
