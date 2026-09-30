/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { createMissionState, stepMission } from '../mission/mission';
import { clearStage, DEFAULT_PROGRESS, normalizeProgress } from '../progress/stageProgress';
import { shouldPlayWhistle } from '../audio/whistleAudio';
import { GAIT_SPEED } from '../core/locomotion';
import { locoStride } from '../core/locomotionAtlas';

test('Treasure is required before Exit and an already-caught mission stays terminal', () => {
  const mission = createMissionState({ x: 100, y: 100 }, { x: 0, y: 0, w: 40, h: 40 });
  stepMission(mission, 20, 20, false);
  assert(!mission.complete && !mission.treasure);
  stepMission(mission, 100, 100, false);
  assert(mission.treasure && !mission.complete && mission.treasureRevision === 1);
  stepMission(mission, 20, 20, true);
  assert(!mission.complete);
  stepMission(mission, 20, 20, false);
  assert(mission.complete && mission.completeRevision === 1);
});

test('Stage clear unlocks the next Stage; retry state and stored progress stay on the current Stage', () => {
  const afterOne = clearStage(DEFAULT_PROGRESS, 0);
  assert.deepEqual([afterOne.currentStage, afterOne.highestUnlocked], [1, 1]);
  const afterFour = clearStage(afterOne, 3);
  assert.deepEqual([afterFour.currentStage, afterFour.highestUnlocked], [4, 4]);
  const afterFive = clearStage(afterFour, 4);
  assert(!afterFive.heistComplete && afterFive.currentStage === 5);
  const afterTen = clearStage(afterFive, 9);
  assert(afterTen.heistComplete && afterTen.currentStage === 9);
  assert.equal(normalizeProgress({ currentStage: 4, highestUnlocked: 2 }).currentStage, 2);
});

test('Whistle audio fires once per revision and Sound OFF mutes it', () => {
  assert(shouldPlayWhistle(0, 1, true));
  assert(!shouldPlayWhistle(1, 1, true));
  assert(!shouldPlayWhistle(0, 1, false));
});

test('Player sprite cadence is distance-based and naturally ordered', () => {
  // Cadence follows from planted feet: stride = the foot sweep the atlas actually draws.
  const stepsPerSecond = (['sneak', 'walk', 'run'] as const).map((g, i) => (GAIT_SPEED[i + 1] / locoStride('player', g, 'right')) * 2);
  assert(stepsPerSecond[0] < stepsPerSecond[1] && stepsPerSecond[1] < stepsPerSecond[2]);
  // Chibi legs (V2 design sheet): planted feet need quick steps at the unchanged gameplay speeds.
  assert(stepsPerSecond[0] >= 4 && stepsPerSecond[0] <= 5.5);
  assert(stepsPerSecond[1] >= 5 && stepsPerSecond[1] <= 6.2);
  assert(stepsPerSecond[2] >= 6.3 && stepsPerSecond[2] <= 7.5);
  // Guard patrol steps are heavier (slower) than the Player walk; chase is urgent.
  assert((52 / locoStride('guard', 'walk', 'right')) * 2 < stepsPerSecond[1]);
  assert((168 / locoStride('guard', 'run', 'right')) * 2 > 5.5);
});

test('Release gameplay uses the Production Locomotion Atlas, never the procedural look', () => {
  const source = readFileSync(new URL('../../assets/manifest.ts', import.meta.url), 'utf8');
  assert(source.includes('characters: { player: LOCOMOTION_CHARACTERS.player, guard: LOCOMOTION_CHARACTERS.guard }'));
  assert(source.includes('export const PLAYTEST_MANIFEST: AssetManifest = ASSET_MANIFEST;'));
});

test('Ordinary gameplay source exposes no test selector, telemetry, or debug controls', () => {
  const source = readFileSync(new URL('../../ui/VisualPlaygroundScreen.tsx', import.meta.url), 'utf8');
  for (const forbidden of ['TEST COMPLETE', 'Stage Selector', 'Sensor available', 'REPLAY ALERT FLOW', 'PATROL', 'CHARS']) {
    assert(!source.includes(forbidden), `${forbidden} leaked into gameplay UI`);
  }
  assert(source.includes('renderPlaygroundFrame(state.value, resources, false)'));
});
