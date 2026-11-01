import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlarmHapticState, endAlarmEpisode, shouldVibrateForAlarm } from '../alarmHaptic';

test('a camera alert and a whistle in the same episode vibrate once', () => {
  const s = createAlarmHapticState();
  assert.equal(shouldVibrateForAlarm(s, false, false), true);
  assert.equal(shouldVibrateForAlarm(s, false, false), false);
});

test('no warning once caught or complete (capture already has its own Error haptic)', () => {
  assert.equal(shouldVibrateForAlarm(createAlarmHapticState(), true, false), false);
  assert.equal(shouldVibrateForAlarm(createAlarmHapticState(), false, true), false);
});

test('a new episode after the alarm calmed down vibrates again', () => {
  const s = createAlarmHapticState();
  shouldVibrateForAlarm(s, false, false);
  endAlarmEpisode(s);
  assert.equal(shouldVibrateForAlarm(s, false, false), true);
});
