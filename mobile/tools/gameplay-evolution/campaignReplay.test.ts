import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Gait } from '../../src/game/core/types';
import { TILE } from '../../src/game/world/compileStage';
import { getMissionAcoustics } from '../../src/game/audio/campaignAcoustics';
import { campaignStages } from '../../src/game/levels/campaignStages';
import { neighboringWitnesses, preservedWitnesses, replayRoute, REPRESENTATIVE_MISSIONS } from './campaignReplay';

const chapterLengths = [10, 10, 5, 5, 5, 5, 5, 5, 5];

test('campaign acoustics covers all stable mission IDs and real floor finishes', () => {
  assert.equal(campaignStages.length, 55);
  assert.deepEqual(chapterLengths.map((_, i) => campaignStages.filter(stage => stage.chapter === i + 1).length), chapterLengths);
  assert.equal(new Set(campaignStages.map(stage => stage.id)).size, 55);
  assert.equal(REPRESENTATIVE_MISSIONS.length, 10);
  const materials = campaignStages.map(stage => {
    const { hearingSensitivity, surface } = getMissionAcoustics(stage.id, stage.theme);
    assert(Number.isFinite(hearingSensitivity) && hearingSensitivity > 0 && hearingSensitivity <= 1.24, stage.id);
    return surface;
  });
  assert.deepEqual([...new Set(materials)].sort(), ['carpet', 'concrete', 'metal', 'stone', 'wood']);
  assert.deepEqual(getMissionAcoustics('unreviewed', 'warehouse'), { surface: 'concrete', hearingSensitivity: 0 });
});

test('all current campaign witnesses and recent timing windows still reach the objective and exit with production hearing', () => {
  let witnesses = 0;
  let totalReactions = 0;
  for (const stage of campaignStages) {
    for (const witness of [...preservedWitnesses(stage.id), ...neighboringWitnesses(stage.id)]) {
      witnesses++;
      const before = replayRoute(stage, witness.inputs, false);
      const after = replayRoute(stage, witness.inputs, true);
      const label = `${stage.id} ${witness.name}`;
      assert.equal(before.result, 'clear', `${label} baseline`);
      assert.equal(after.result, 'clear', `${label} hearing enabled`);
      assert.notEqual(after.treasureAt, null, label);
      assert.equal(before.reactions, 0, label);
      assert.equal(after.reactionModes.idle, 0, label);
      totalReactions += after.reactions;
    }
  }
  assert.equal(witnesses, 160);
  assert(totalReactions > 0, 'production hearing cannot silently regress to disabled');
});


test('Archive allows a one-leg Run lure on an alternate approach that also works with Walk', () => {
  const stage = campaignStages.find(({ id }) => id === '01-03')!;
  const inputs = { approach: 1, escape: 0, mode: Gait.Walk, delay: 2 };
  const quiet = replayRoute(stage, inputs, true);
  const burst = { ...inputs, approachRunLeg: 3 };
  const baseline = replayRoute(stage, burst, false);
  const lure = replayRoute(stage, burst, true);
  assert.equal(quiet.result, 'clear');
  assert.equal(quiet.investigations, 0);
  assert.equal(baseline.result, 'clear');
  assert.equal(baseline.reactions, 0);
  assert.equal(lure.result, 'clear');
  assert.equal(lure.spottedEpisodes, 0);
  assert.equal(lure.investigations, 1);
  assert.equal(lure.reactionModes.run, 1);
  assert.equal(lure.firstInvestigation?.guard, '01-03-g1');
  assert((lure.firstInvestigation?.listenerTravel ?? 0) > TILE);
  assert((lure.firstInvestigation?.playerSeparation ?? 0) > 3 * TILE);
});
