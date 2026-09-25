/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { playableStages } from '../stages/tiltTestMaps';
import { compileStage, Cell, TILE, WALL_HEIGHT } from '../../world/compileStage';
import { buildNavigation, clearSegment, findPath } from '../../world/navigation';
import { BODY } from '../../guards/guardTuning';
import { createPlaygroundState, stepPlayground } from '../../playground/playgroundState';
import { Awareness } from '../../core/types';
import { buildVisionFan, createFanBuffers, pointVisible } from '../../guards/guardVision';

function traverse(
  stage: ReturnType<typeof compileStage>,
  state: ReturnType<typeof createPlaygroundState>,
  navigation: ReturnType<typeof buildNavigation>,
  targetX: number,
  targetY: number,
  stopWhenComplete = false,
) {
  const path = findPath(navigation, state.player.x, state.player.y, targetX, targetY);
  assert(path.length >= 2, 'navigation path missing');
  const bounds = { x: 0, y: -WALL_HEIGHT, w: stage.width, h: stage.height + WALL_HEIGHT };
  let index = 0;
  for (let frame = 0; frame < 60 * 240 && index < path.length && !(stopWhenComplete && state.mission.complete); frame++) {
    state.player.hasTarget = true;
    state.player.tx = path[index];
    state.player.ty = path[index + 1];
    stepPlayground(state, 1 / 60, TILE, 9.4 * TILE, 9 * TILE, bounds, stage.movementBlockers, stage.visionBlockers, navigation);
    if (Math.hypot(state.player.x - path[index], state.player.y - path[index + 1]) < 2) index += 2;
  }
  assert(index === path.length || (stopWhenComplete && state.mission.complete), 'touch locomotion did not finish the path');
}

for (const def of playableStages) {
  const stage = compileStage(def);
  const playerNav = buildNavigation(stage, BODY.playerRadius);
  const guardNav = buildNavigation(stage, BODY.guardRadius);
  const objective = stage.objective;
  const exitCenter = { x: stage.exit.x + stage.exit.w / 2, y: stage.exit.y + stage.exit.h / 2 };

  function valid(x: number, y: number, radius: number) {
    assert.equal(stage.grid[Math.floor(y / TILE) * stage.cols + Math.floor(x / TILE)], Cell.Floor, `not floor at ${x / TILE},${y / TILE}`);
    assert(clearSegment(x, y, x, y, playerNav.blockers, radius), `body blocked at ${x / TILE},${y / TILE}`);
  }

  test(`${def.number}: playable spawn / diamond / exit / guards are valid`, () => {
    assert(def.objective && def.exit);
    assert.equal(def.temporaryGoal, undefined);
    valid(stage.playerSpawn.x, stage.playerSpawn.y, BODY.playerRadius);
    valid(objective.x, objective.y, BODY.playerRadius);
    valid(exitCenter.x, exitCenter.y, BODY.playerRadius);
    for (const g of stage.guards) {
      valid(g.x, g.y, BODY.guardRadius);
      assert(Math.hypot(g.x - stage.playerSpawn.x, g.y - stage.playerSpawn.y) > BODY.guardRadius + BODY.playerRadius);
    }
    assert(stage.props.length > 0 && stage.lights.length > 0 && stage.guards.length > 0);
  });

  test(`${def.number}: spawn -> diamond -> exit paths reach exact targets`, () => {
    for (const [x0, y0, x1, y1] of [
      [stage.playerSpawn.x, stage.playerSpawn.y, objective.x, objective.y],
      [objective.x, objective.y, exitCenter.x, exitCenter.y],
    ]) {
      const path = findPath(playerNav, x0, y0, x1, y1);
      assert(path.length >= 2);
      assert.equal(path.at(-2), x1);
      assert.equal(path.at(-1), y1);
    }
  });

  test(`${def.number}: every patrol segment and spawn connector is valid`, () => {
    assert.equal(new Set(def.patrolRoutes.map((r) => r.id)).size, def.patrolRoutes.length);
    const authoredSegments = new Set<string>();
    for (const g of stage.guards) {
      assert(g.route.length >= 2);
      let x = g.x;
      let y = g.y;
      const route = g.routeMode === 'loop' ? [...g.route, g.route[0]] : [...g.route, ...g.route.slice().reverse()];
      for (let i = 0; i < route.length; i++) {
        const p = route[i];
        valid(p.x, p.y, BODY.guardRadius);
        assert(clearSegment(x, y, p.x, p.y, guardNav.blockers, BODY.guardRadius), `${g.id} patrol crosses obstacle`);
        const path = findPath(guardNav, x, y, p.x, p.y);
        assert.equal(path.at(-2), p.x);
        assert.equal(path.at(-1), p.y);
        x = p.x;
        y = p.y;
      }
      for (let i = 1; i < g.route.length; i++) {
        const a = g.route[i - 1];
        const b = g.route[i];
        const key = a.x < b.x || (a.x === b.x && a.y < b.y) ? `${a.x},${a.y}:${b.x},${b.y}` : `${b.x},${b.y}:${a.x},${a.y}`;
        assert(!authoredSegments.has(key), `duplicate patrol segment ${key}`);
        authoredSegments.add(key);
      }
    }
  });

  test(`${def.number}: sealed perimeter and authored approach routes`, () => {
    for (let y = 0; y < stage.rows; y++) for (let x = 0; x < stage.cols; x++) if (stage.grid[y * stage.cols + x] === Cell.Floor) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        assert(x + dx >= 0 && y + dy >= 0 && x + dx < stage.cols && y + dy < stage.rows);
        assert.notEqual(stage.grid[(y + dy) * stage.cols + x + dx], Cell.Void, 'unsealed void boundary');
      }
    }
    for (const route of def.testRoutes ?? []) {
      let x = stage.playerSpawn.x;
      let y = stage.playerSpawn.y;
      for (const p of route.points) {
        valid(p.x * TILE, p.y * TILE, BODY.playerRadius);
        assert(clearSegment(x, y, p.x * TILE, p.y * TILE, playerNav.blockers, BODY.playerRadius), `${route.name} crosses obstacle`);
        x = p.x * TILE;
        y = p.y * TILE;
      }
      assert.equal(x, objective.x);
      assert.equal(y, objective.y);
    }
    for (const route of def.escapeRoutes ?? []) {
      let x = objective.x;
      let y = objective.y;
      for (const p of route.points) {
        valid(p.x * TILE, p.y * TILE, BODY.playerRadius);
        assert(clearSegment(x, y, p.x * TILE, p.y * TILE, playerNav.blockers, BODY.playerRadius), `${route.name} crosses obstacle`);
        x = p.x * TILE;
        y = p.y * TILE;
      }
      assert.equal(x, exitCenter.x);
      assert.equal(y, exitCenter.y);
    }
  });

  test(`${def.number}: authored waiting zones and initial vision coverage stay playable`, () => {
    assert((def.safeZones?.length ?? 0) >= 2, 'stage needs multiple waiting pockets');
    const fans = stage.guards.map((guard) => {
      const buffers = createFanBuffers();
      const fan = { ...guard, ...buffers, fanCount: 0 };
      buildVisionFan(fan, stage.visionBlockers);
      return fan;
    });
    let initiallySafe = 0;
    for (const zone of def.safeZones ?? []) {
      valid(zone.x * TILE, zone.y * TILE, BODY.playerRadius);
      const visible = fans.filter((fan) => pointVisible(fan, zone.x * TILE, zone.y * TILE, stage.visionBlockers)).length;
      if (visible === 0) initiallySafe++;
    }
    assert(initiallySafe > 0, 'no safe place to wait outside all initial cones');

    for (const authored of def.testRoutes ?? []) {
      const coverage = authored.points.map((p) => fans.filter((fan) => pointVisible(fan, p.x * TILE, p.y * TILE, stage.visionBlockers)).length);
      assert(coverage.some((count) => count === 0), `${authored.name} has no unobserved decision point`);
      assert(Math.max(...coverage) < stage.guards.length, `${authored.name} is blocked by every guard at once`);
      if (def.number <= 2) assert(Math.max(...coverage) <= 1, `${authored.name} has overlapping early-stage cones`);
    }
  });

  test(`${def.number}: real locomotion completes diamond then exit`, () => {
    const state = createPlaygroundState(stage);
    state.guards = [];
    state.playerMode = 3;
    traverse(stage, state, playerNav, objective.x, objective.y);
    assert(state.mission.treasure && !state.mission.complete);
    traverse(stage, state, playerNav, exitCenter.x, exitCenter.y, true);
    assert(state.mission.complete);
  });
}

test('Ten distinct Chapter geometries use the authored difficulty progression', () => {
  assert.equal(playableStages.length, 10);
  assert.deepEqual(playableStages.map((stage) => stage.guards.length), [2, 2, 3, 3, 4, 4, 4, 5, 5, 6]);
  assert.equal(new Set(playableStages.map((stage) => stage.layout.join('\n'))).size, 10);
  const sizes = playableStages.map((stage) => compileStage(stage).grid.filter((cell) => cell === Cell.Floor).length);
  assert(sizes[9] > Math.max(...sizes.slice(0, 9)));
  for (const def of playableStages) for (let i = 0; i < def.guards.length; i++) for (let j = i + 1; j < def.guards.length; j++) {
    assert(Math.hypot(def.guards[i].x - def.guards[j].x, def.guards[i].y - def.guards[j].y) * TILE > BODY.guardRadius * 2);
  }
});

test('Stage 10 all six guards enter Global Alert after one whistle', () => {
  const stage = compileStage(playableStages[9]);
  const state = createPlaygroundState(stage);
  const guard = state.guards[0];
  state.player.x = guard.x + Math.cos(guard.facing) * 30;
  state.player.y = guard.y + Math.sin(guard.facing) * 30;
  state.player.gait = 3;
  state.playerMode = 0;
  guard.suspicion = 0.999;
  guard.awareness = Awareness.Suspicious;
  const nav = buildNavigation(stage, BODY.guardRadius);
  for (let i = 0; i < 360 && !state.events.globalAlert; i++) {
    stepPlayground(state, 1 / 60, TILE, 9.4 * TILE, 9 * TILE, { x: 0, y: -WALL_HEIGHT, w: stage.width, h: stage.height + WALL_HEIGHT }, stage.movementBlockers, stage.visionBlockers, nav);
  }
  assert(state.events.globalAlert);
  assert.equal(state.events.whistleCount, 1);
  assert(state.guards.every((g) => g.awareness !== Awareness.Patrol && g.awareness !== Awareness.Suspicious));
});
