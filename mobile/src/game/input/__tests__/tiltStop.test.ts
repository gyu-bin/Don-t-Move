/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BAND_SETTLE_SECONDS, createTiltState, DEFAULT_TILT, multiply, recenterTilt, response, stepTilt } from '../tilt';
import type { AttitudeSample, Quaternion, TiltState } from '../tilt';
import { stepTiltPlayer } from '../tiltMovement';
import { createPlaygroundState } from '../../playground/playgroundState';
import { visualPlayground } from '../../levels/stages/visualPlayground';
import { compileStage } from '../../world/compileStage';
import { gaitFromSpeed } from '../../core/locomotion';

const identity = { x: 0, y: 0, z: 0, w: 1 };
const DT = 1/60;
function roll(degrees: number): Quaternion {
  return { x: 0, y: Math.sin(degrees*Math.PI/360), z: 0, w: Math.cos(degrees*Math.PI/360) };
}
function sample(q: Quaternion, ms: number): AttitudeSample {
  return { q, timestamp: ms/1000, receivedAt: ms, rotationRate: 0, acceleration: 0 };
}
/** A calibrated controller with its own clock; `hold` keeps one angle for a time and reports each frame. */
function rig() {
  const s = createTiltState();
  let ms = 0;
  for (; ms <= 1000; ms += 1000*DT) stepTilt(s, sample(identity, ms), ms, DT, DEFAULT_TILT);
  assert(s.neutral && s.status === 'PLAY');
  const player = createPlaygroundState(compileStage(visualPlayground)).player;
  const frame = (angle: number, blockers: number[] = []) => {
    ms += 1000*DT;
    stepTilt(s, sample(roll(angle), ms), ms, DT, DEFAULT_TILT);
    stepTiltPlayer(player, { x: s.x, y: s.y, paused: false, reset: 0 }, DT, blockers);
  };
  const hold = (angle: number | ((t: number) => number), seconds: number) => {
    for (let i = 0; i < Math.round(seconds/DT); i++) frame(typeof angle === 'number' ? angle : angle(i*DT));
  };
  return { s, player, frame, hold };
}
const allZero = (s: TiltState) => s.x === 0 && s.y === 0 && s.smoothX === 0 && s.smoothY === 0 && s.deadX === 0 && s.deadY === 0;

test('Tuning: start 2.25°, stop 1.75°, max 10°, smoothing 0.07 s', () => {
  assert.deepEqual(DEFAULT_TILT, { deadZone: 1.75, moveStart: 2.25, maxTilt: 10, sensitivity: 1, smoothing: 0.07 });
  assert(DEFAULT_TILT.moveStart >= 2.2 && DEFAULT_TILT.moveStart <= 2.3);
  assert(DEFAULT_TILT.deadZone >= 1.7 && DEFAULT_TILT.deadZone <= 1.8);
});

test('At rest, a phone held anywhere below the start threshold does not move the thief at all', () => {
  for (const angle of [0, 0.5, 1, 1.7, 1.76, 2, 2.2, 2.24]) {
    const { s, player, hold } = rig();
    const x = player.x, y = player.y;
    hold(angle, 10);
    assert(allZero(s), `filter not zero at ${angle}°`);
    assert.equal(player.x, x, `drift at ${angle}°`); assert.equal(player.y, y);
    assert.equal(player.speed, 0); assert.equal(player.vx, 0); assert.equal(player.gait, 0);
  }
});

test('Hand tremor across the old dead-zone edge produces no movement', () => {
  const { s, player, hold } = rig();
  const x = player.x;
  hold((t) => 1.9 + 0.3*Math.sin(t*2*Math.PI*8), 20); // 1.6°–2.2°, 8 Hz, twenty seconds
  assert(allZero(s)); assert.equal(player.x, x);
});

test('Movement starts at the start threshold and is not dulled: 2.3° moves, 3° and 4° are the same speed as before', () => {
  const { s, player, hold } = rig();
  const x = player.x;
  hold(2.3, 1);
  assert(s.engaged && s.x > 0, 'engaged just past the start threshold');
  assert(player.x > x + 1, `moved ${player.x - x}`);
  for (const angle of [3, 4, 6.25, 10]) {
    const r = rig(); r.hold(angle, 2);
    const curve = response((angle - DEFAULT_TILT.deadZone)/(DEFAULT_TILT.maxTilt - DEFAULT_TILT.deadZone), DEFAULT_TILT)*150;
    assert(Math.abs(r.player.speed - curve) < 0.01, `${angle}°: ${r.player.speed} vs curve ${curve}`);
  }
  const three = rig(); three.hold(3, 2);
  assert(three.player.speed > 15, `3° must be a clear sneak, got ${three.player.speed}`);
});

test('Hysteresis: a moving thief keeps moving below the start threshold and stops at the stop threshold', () => {
  const { s, player, hold, frame } = rig();
  hold(4, 1);
  hold(2, 0.1); // inside the band, briefly: still moving
  assert(s.engaged && s.x > 0 && player.speed > 0);
  frame(1.74); // inside the stop threshold: this frame
  assert(allZero(s) && !s.engaged);
  assert.equal(player.speed, 0); assert.equal(player.vx, 0); assert.equal(player.vy, 0); assert.equal(player.gait, 0);
  const x = player.x;
  hold(2.2, 5); // back in the band from rest: does not restart
  assert(allZero(s)); assert.equal(player.x, x);
  hold(2.3, 0.5);
  assert(player.x > x, 'restarts at the start threshold');
});

test('Stop is complete in one frame from full speed: no smoothing tail, no residual velocity', () => {
  const { s, player, hold, frame } = rig();
  hold(12, 2);
  assert(Math.abs(player.speed - 150) < 0.01);
  frame(0);
  const x = player.x;
  assert(allZero(s));
  assert.equal(player.speed, 0); assert.equal(player.vx, 0); assert.equal(player.vy, 0);
  hold(0, 2);
  assert.equal(player.x, x, 'nothing left to coast on');
});

test('A moving thief held inside the band comes to rest instead of creeping', () => {
  const { s, player, hold } = rig();
  hold(4, 1);
  hold(2, BAND_SETTLE_SECONDS + 0.05);
  assert(allZero(s) && !s.engaged, 'settled');
  const x = player.x;
  hold(2, 30);
  assert.equal(player.x, x, 'no drift in thirty seconds at 2°');
  // Passing through the band on the way down or up does not stop a thief who is steering.
  const pass = rig(); pass.hold(4, 1); pass.hold(2.1, 0.1); pass.hold(3, 0.2);
  assert(pass.s.engaged && pass.player.speed > 10);
});

test('The neutral is not re-learned from a phone resting off-centre', () => {
  const { s, hold } = rig();
  const neutral = { ...s.neutral! };
  hold(2.1, 120);
  assert.deepEqual(s.neutral, neutral);
  hold(2.4, 0.5);
  assert(s.x > 0, 'the same 2.4° still moves afterwards');
});

test('Recenter and a lost sensor end the moving state; the next start needs the start threshold again', () => {
  const a = rig(); a.hold(5, 1);
  const pose = multiply(identity, roll(5));
  assert(recenterTilt(a.s, sample(pose, 5000), 5000));
  assert(allZero(a.s) && !a.s.engaged);
  const b = rig(); b.hold(5, 1);
  stepTilt(b.s, null, 9000, DT, DEFAULT_TILT);
  assert.equal(b.s.status, 'SENSOR PAUSED'); assert(allZero(b.s) && !b.s.engaged);
});

test('Wall slide and collision are unchanged by the stop rule', () => {
  const player = createPlaygroundState(compileStage(visualPlayground)).player;
  player.x = 0; player.y = 0;
  const wall = [20, -1000, 40, 1000];
  for (let i = 0; i < 120; i++) stepTiltPlayer(player, { x: 1, y: 0, paused: false, reset: 0 }, DT, wall);
  assert(player.x < 11, 'stopped by the wall'); assert(Math.abs(player.speed) < 1e-6);
  for (let i = 0; i < 60; i++) stepTiltPlayer(player, { x: 0.7, y: 0.7, paused: false, reset: 0 }, DT, wall);
  assert(player.y > 20 && player.x < 11, 'slides along it');
  assert(Math.abs(player.gait - gaitFromSpeed(player.speed)) < 1e-9);
  stepTiltPlayer(player, { x: 0, y: 0, paused: false, reset: 0 }, DT, wall);
  assert.equal(player.speed, 0); assert.equal(player.contactX, 0); assert.equal(player.contactY, 0);
  for (let i = 0; i < 30; i++) stepTiltPlayer(player, { x: 0, y: -1, paused: false, reset: 0 }, DT, wall);
  assert(player.vy < 0, 'moves again after the stop');
});
