import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Awareness, Gait } from '../../core/types';
import { HearingPhase } from '../../guards/guardHearing';
import { stepGuards } from '../../guards/guardSystem';
import { BODY } from '../../guards/guardTuning';
import type { StageDefinition } from '../../levels/StageDefinition';
import { createPlaygroundState, stepPlayground } from '../../playground/playgroundState';
import { guardIndicator } from '../../../rendering/effects/guardIndicator';
import { compileStage, TILE } from '../../world/compileStage';
import { buildNavigation } from '../../world/navigation';
import { footstepAt, plantedFootstep } from '../footsteps';

const DT = 1 / 60;
const fixture: StageDefinition = {
  id: '01-03', number: 3, title: 'Acoustic corridor', theme: 'museum', structurePlan: 'V13 hearing fixture',
  layout: ['################', '#..............#', '#..............#', '#..............#', '#..............#',
    '#..............#', '################'],
  props: [], lights: [], patrolRoutes: [],
  guards: [{ id: 'listener', x: 5, y: 2.5, facing: Math.PI, visionRange: 3, visionHalfAngle: 0.30 }],
  playerSpawn: { x: 6.25, y: 2.5, facing: 0 },
  objective: { kind: 'diamond', x: 13, y: 4 }, exit: { x: 14, y: 4, w: 1, h: 1 },
};

function setup(def: StageDefinition = fixture, hearingEnabled = true) {
  const stage = compileStage(def);
  const nav = buildNavigation(stage, BODY.guardRadius);
  const state = createPlaygroundState(stage, undefined, { hearingEnabled });
  state.playerMode = -2;
  const bounds = { x: 0, y: 0, w: stage.width, h: stage.height };
  const tick = (x: number, y = 0, paused = false) => stepPlayground(state, DT, TILE, 400, 600, bounds,
    stage.movementBlockers, stage.visionBlockers, nav, { x, y, paused, reset: 0 });
  return { state, stage, nav, tick };
}

test('footfalls cross the planted sprite phase only after real motion; floor material changes the signal', () => {
  assert.equal(plantedFootstep(0.48, 0.52, 0, DT), false);
  assert.equal(plantedFootstep(0.48, 0.52, 20, DT), false, 'collision recovery cannot sound like a footfall');
  assert.equal(plantedFootstep(0.32, 0.37, 1, DT), false);
  assert.equal(plantedFootstep(0.48, 0.52, 1, DT), true);
  assert.equal(plantedFootstep(0.99, 0.04, 1, DT), true);
  const area = [{ x: 10, y: 10, w: 20, h: 20 }];
  const stone = footstepAt(30, 15, 1, Gait.Run, 'stone', area);
  const carpet = footstepAt(29, 15, 1, Gait.Run, 'stone', area);
  const metal = footstepAt(31, 15, 1, Gait.Run, 'metal', area);
  assert.equal(carpet.surface, 'carpet');
  assert.equal(stone.surface, 'stone');
  assert.ok(carpet.range < stone.range && stone.range < metal.range);
  assert.ok(footstepAt(30, 15, 1, Gait.Sneak, 'stone', []).strength <
    footstepAt(30, 15, 1, Gait.Walk, 'stone', []).strength);
});

test('fixed-step input differentiates speeds and goes silent against a wall, idle, paused and on clear', () => {
  const def = { ...fixture, guards: [], carpets: [{ x: 6, y: 2, w: 4, h: 2 }] };
  const cadences = [0.2, 0.43, 1].map(input => {
    const { state, tick } = setup(def);
    let count = 0;
    for (let i = 0; i < 90; i++) {
      const before = state.footsteps?.last;
      tick(input);
      if (state.footsteps?.last !== before) count++;
    }
    assert.ok(state.footsteps?.last);
    const snapshot = state.footsteps.last;
    for (let i = 0; i < 60; i++) tick(0);
    for (let i = 0; i < 60; i++) tick(1, 0, true);
    assert.equal(state.footsteps.last, snapshot);
    for (let i = 0; i < 420; i++) tick(1);
    const againstWall = state.footsteps.last;
    for (let i = 0; i < 120; i++) tick(1);
    assert.equal(state.footsteps.last, againstWall);
    state.mission.complete = true;
    for (let i = 0; i < 60; i++) tick(-1);
    assert.equal(state.footsteps.last, againstWall);
    return { count, gait: snapshot.gait };
  });
  assert.deepEqual(cadences.map(c => c.gait), [Gait.Sneak, Gait.Walk, Gait.Run]);
  assert.ok(cadences.every(c => c.count > 0));
  assert.ok(cadences[0].count < cadences[2].count);
  assert.ok(cadences[1].count < cadences[2].count);
});

test('a run plants a fixed lure and a quiet route passes without granting player intel', () => {
  const def = { ...fixture, playerSpawn: { x: 6.95, y: 3.5, facing: 0 },
    guards: [{ ...fixture.guards[0], x: 5.5, y: 3.5, facing: -2.5 }] };
  const loud = setup(def);
  const quiet = setup(def);
  const original = loud.state.guards[0];
  const origin = { x: original.x, y: original.y };
  let heard = false, investigated = false, swept = false, cue = '';
  for (let i = 0; i < 540; i++) {
    loud.tick(i < 16 ? -0.92 : i < 96 ? 0 : 0.20, i >= 16 && i < 96 ? 0.92 : 0);
    quiet.tick(i < 16 ? -0.22 : i < 96 ? 0 : 0.20, i >= 16 && i < 96 ? 0.22 : 0);
    if (original.hearing?.phase === HearingPhase.Look && !heard) {
      heard = true;
      cue = JSON.stringify({ hearing: original.hearing, step: loud.state.footsteps?.last });
      assert.equal(guardIndicator(original, loud.state.events, false), 'hearing');
      assert.equal(original.hearing.heardX, loud.state.footsteps?.last?.x);
    }
    if (original.hearing?.phase === HearingPhase.Investigate) investigated = true;
    if (original.hearing?.phase === HearingPhase.Sweep && !swept) {
      swept = true;
      assert.equal(guardIndicator(original, loud.state.events, false), 'search');
    }
  }
  assert.equal(heard, true);
  assert.equal(investigated, true, `${cue}, caught=${loud.state.events.caught}, visual=${original.hasLkp}, t=${loud.state.t}`);
  assert.equal(swept, true);
  assert.equal(quiet.state.guards[0].hearing, undefined);
  assert.equal(loud.state.events.globalAlert, false);
  assert.equal(loud.state.events.globalRevision, 0);
  assert.equal(loud.state.events.caught, false);
  assert.equal(original.hearing?.phase, HearingPhase.None);
  assert.ok(Math.hypot(original.x - origin.x, original.y - origin.y) < 5);
});

test('a visual witness checks one local spoke, searches and returns without following later sound', () => {
  const { state, stage, nav } = setup();
  const g = state.guards[0];
  g.semanticPatrol = true;
  g.hasLkp = true;
  g.awareness = Awareness.Chase;
  g.facing = g.baseFacing = 0;
  g.lkpX = g.x + 12;
  g.lkpY = g.y;
  const { lkpX, lkpY } = g;
  const ev = state.events;
  ev.globalAlert = true;
  ev.globalX = lkpX;
  ev.globalY = lkpY;
  const hidden = { x: 560, y: 200, gait: Gait.Run };
  let searched = false, spoke = false;
  for (let i = 1; i < 1200 && ev.globalAlert; i++) {
    const t = i * DT;
    stepGuards(state.guards, hidden, stage.visionBlockers, nav, DT, ev, t, true, 1, state.theft,
      footstepAt(hidden.x, hidden.y, t, Gait.Run, 'metal', []), 1);
    if (g.awareness === Awareness.Search) {
      searched = true;
      if (g.searchIndex === -1) {
        spoke = true;
        assert.ok(Math.hypot(g.targetX - lkpX, g.targetY - lkpY) < 70);
      }
    }
    assert.equal(g.hearing, undefined);
    assert.equal(ev.globalX, lkpX);
    assert.equal(ev.globalY, lkpY);
  }
  assert.ok(searched && spoke);
  assert.equal(ev.globalAlert, false);
  assert.equal(ev.caught, false);
  assert.equal(g.awareness, Awareness.Patrol);
});
