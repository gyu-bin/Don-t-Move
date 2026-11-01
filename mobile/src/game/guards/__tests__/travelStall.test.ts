/**
 * Gameplay v4: a guard whose body rests on its clearance boundary must not freeze in waypoint travel.
 * Reproduces the state found by the chase lab in 03-01 (guard g1 heading to the LKP after losing the thief): every
 * step from that exact position grazed a wall corner, the path was dropped and re-planned to the same path, and the
 * guard stood still for good — so the Global Alert (which ends only when every guard is back on patrol) never ended.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import campaign from '../../levels/stages/campaignStages.json';
import type { StageDefinition } from '../../levels/StageDefinition';
import { compileStage } from '../../world/compileStage';
import { buildNavigation, clearSegment } from '../../world/navigation';
import { createGuardState } from '../guardBrain';
import { travel } from '../guardTravel';
import { BODY } from '../guardTuning';

const def = (campaign as unknown as StageDefinition[]).find(d => d.id === '03-01')!;
const stage = compileStage(def), nav = buildNavigation(stage, BODY.guardRadius);

function stalled() {
  const g = createGuardState(stage.guards[0]);
  // Exact pose from the lab trace (tile 7.7995, 9.2436), heading to the last known position (11.627, 7.578).
  g.x = 7.799467631004619 * 40; g.y = 9.243577721899252 * 40;
  g.targetX = 11.62722143039259 * 40; g.targetY = 7.577816277602731 * 40;
  g.facing = Math.atan2(8.75 * 40 - g.y, 8.25 * 40 - g.x);
  return g;
}

test('a guard resting on its clearance boundary keeps travelling (no permanent freeze)', () => {
  const g = stalled(), x0 = g.x, y0 = g.y;
  let arrived = false, t = 20;
  for (let f = 0; f < 6 * 60 && !arrived; f++, t += 1 / 60) arrived = travel(g, nav, 80.6, 1 / 60, t);
  assert.ok(Math.hypot(g.x - x0, g.y - y0) > 40, `guard moved only ${(Math.hypot(g.x - x0, g.y - y0) / 40).toFixed(2)} tiles in 6 s`);
  assert.ok(arrived, 'guard reaches the last known position');
});

test('the recovery step never puts the body through a wall: every pose on the way is clear at the guard radius − 1', () => {
  const g = stalled();
  for (let f = 0, t = 20; f < 6 * 60; f++, t += 1 / 60) {
    if (travel(g, nav, 80.6, 1 / 60, t)) break;
    assert.ok(clearSegment(g.x, g.y, g.x, g.y, nav.blockers, BODY.guardRadius - 1), `frame ${f}: body inside a wall at ${(g.x / 40).toFixed(2)},${(g.y / 40).toFixed(2)}`);
  }
});
