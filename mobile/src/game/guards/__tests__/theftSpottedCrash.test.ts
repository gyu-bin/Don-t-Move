import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Awareness } from '../../core/types';
import { campaignStages } from '../../levels/campaignStages';
import { createPlaygroundState } from '../../playground/playgroundState';
import { compileStage } from '../../world/compileStage';
import { buildNavigation, clearSegment, nodeX, nodeY } from '../../world/navigation';
import { buildVisionFan, pointVisible } from '../guardVision';
import { BODY } from '../guardTuning';
import { stepGuards } from '../guardSystem';
import type { PlayerView } from '../guardBrain';

// Deterministic transition fixtures on shipped geometry. Pose seeding isolates
// transitions; these simulations are supplementary, not a native/device proof.
function fixture(id: string) {
  const definition = campaignStages.find(stage => stage.id === id);
  assert(definition, id);
  const stage = compileStage(definition);
  const nav = buildNavigation(stage, BODY.guardRadius);
  const state = createPlaygroundState(stage);
  const nodes = nav.walkable.flatMap((walkable, i) => walkable ? [{ x: nodeX(nav, i), y: nodeY(nav, i) }] : []);
  let frames = 0;
  function tick(player: PlayerView, patrol = false) {
    stepGuards(state.guards, player, stage.visionBlockers, nav, 1 / 60, state.events, ++frames / 60, patrol, 1, state.theft);
    for (const guard of state.guards) {
      for (const key of ['x', 'y', 'targetX', 'targetY', 'speed', 'facing', 'gait', 'dist', 'lkpX', 'lkpY'] as const)
        assert(Number.isFinite(guard[key]), `${id} frame=${frames} guard=${guard.id} ${key}=${guard[key]}`);
      assert(guard.path.every(Number.isFinite), `${id}: non-finite path`);
      assert(guard.path.length % 2 === 0, `${id}: incomplete path coordinate`);
    }
  }
  function until(predicate: () => boolean, player: PlayerView, limit: number, patrol = false) {
    for (let i = 0; i < limit && !predicate(); i++) tick(player, patrol);
    assert(predicate(), `${id}: transition absent after ${limit} simulation frames; phase=${state.events.phase}`);
  }
  // Seed the post-pickup state only; theft discovery/whistle are stepped normally.
  state.mission.treasure = true;
  state.theft.empty = true;
  function stageSighting() {
    const witness = state.guards[0];
    for (const origin of nodes) {
      if (Math.hypot(origin.x - state.theft.x, origin.y - state.theft.y) < witness.visionRange + 100) continue;
      for (const target of nodes) {
        const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
        if (distance < 100 || distance > 120) continue;
        if (!clearSegment(origin.x, origin.y, target.x, target.y, nav.blockers, BODY.guardRadius)) continue;
        if (state.guards.slice(1).some(g => Math.hypot(g.x - target.x, g.y - target.y) < 80)) continue;
        witness.x = origin.x; witness.y = origin.y;
        witness.facing = Math.atan2(target.y - origin.y, target.x - origin.x);
        witness.baseFacing = witness.facing;
        witness.path = []; witness.pathIndex = 0; witness.repathAt = 0;
        // Keep other witnesses facing away from the case until the first sight.
        for (const guard of state.guards.slice(1)) {
          guard.facing = Math.atan2(guard.y - state.theft.y, guard.x - state.theft.x);
          guard.baseFacing = guard.facing;
        }
        buildVisionFan(witness, stage.visionBlockers);
        assert(pointVisible(witness, target.x, target.y, stage.visionBlockers));
        return { ...target, gait: 3 };
      }
    }
    throw new Error(`${id}: no clear sighting fixture`);
  }
  function concealedPlayer() {
    // A real walkable point, beyond all current vision ranges. This models the
    // LOS-break instant, not a continuously simulated player escape route.
    const node = nodes.find(p => state.guards.every(g => Math.hypot(g.x - p.x, g.y - p.y) > g.visionRange + 100));
    assert(node, `${id}: no concealed fixture point`);
    return { ...node, gait: 0 };
  }
  return { state, tick, until, stageSighting, concealedPlayer };
}

for (const id of ['01-05', '01-08', '01-10']) {
  test(`${id} A: stolen objective → spotted before theft dispatch → direct chase`, () => {
    const f = fixture(id), player = f.stageSighting();
    f.until(() => f.state.events.globalAlert, player, 600);
    assert.equal(f.state.events.theftWhistleRevision, 0);
    assert.equal(f.state.events.phase, 'PLAYER_SPOTTED');
    assert.equal(f.state.guards[0].awareness, Awareness.Chase);
    const before = { x: f.state.guards[0].x, y: f.state.guards[0].y };
    f.tick(player);
    assert(Math.hypot(f.state.guards[0].x - before.x, f.state.guards[0].y - before.y) > 0);
    assert.equal(f.state.events.spottedWhistleRevision, 1);
  });
  for (const scenario of ['B', 'C', 'D']) test(`${id} ${scenario}: theft → spotted → ${scenario === 'C' ? 'LOS break/search' : scenario === 'D' ? 'capture' : 'direct chase'}`, () => {
    const f = fixture(id);
    const hidden = f.concealedPlayer();
    f.until(() => f.state.events.theftAlert, hidden, 60 * 120, true);
    assert.equal(f.state.events.theftWhistleRevision, 1);
    assert.equal(f.state.events.spottedWhistleRevision, 0);
    const player = f.stageSighting();
    f.until(() => f.state.events.globalAlert, player, 120);
    assert.equal(f.state.events.phase, 'PLAYER_SPOTTED');
    assert.equal(f.state.guards[0].awareness, Awareness.Chase);
    f.tick(player); // Execute pursue, not just the transition that schedules it.
    assert(f.state.guards[0].speed > 0);
    assert.equal(f.state.events.spottedWhistleRevision, 1);
    if (scenario === 'C') {
      const lkp = { x: f.state.events.globalX, y: f.state.events.globalY };
      const concealed = f.concealedPlayer();
      f.until(() => f.state.guards[0].awareness === Awareness.Search, concealed, 1800);
      assert(!f.state.events.caught);
      assert.equal(f.state.events.globalX, lkp.x);
      assert.equal(f.state.events.globalY, lkp.y);
    } else if (scenario === 'D') {
      f.until(() => f.state.events.caught, player, 600);
      assert(f.state.events.caughtBy);
    } else {
      for (let i = 0; i < 10; i++) f.tick(player);
      assert(!f.state.events.caught);
    }
  });
}
