import test from 'node:test';
import assert from 'node:assert/strict';
import { missionBackAction } from '../missionBackAction';

test('Back while playing opens the pause menu instead of leaving the mission', () => {
  assert.equal(missionBackAction({ paused: false, settings: false, busy: false }), 'pause');
});

test('Back on the pause menu resumes; Back in pause-settings returns to the pause menu', () => {
  assert.equal(missionBackAction({ paused: true, settings: false, busy: false }), 'resume');
  assert.equal(missionBackAction({ paused: true, settings: true, busy: false }), 'closeSettings');
});

test('Back is swallowed (no exit) while the mission is over, swapping, or the intro replays', () => {
  for (const paused of [false, true]) for (const settings of [false, true])
    assert.equal(missionBackAction({ paused, settings, busy: true }), 'ignore');
});
