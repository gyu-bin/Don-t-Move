/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CONTROL_MODE, normalizeControlMode, resolveInput } from '../controlMode';
import { STICK_DEAD, STICK_IDLE, STICK_RADIUS, stickDown, stickMove, stickVector } from '../touchStick';
import { stepTiltPlayer } from '../tiltMovement';
import { createPlaygroundState } from '../../playground/playgroundState';
import { visualPlayground } from '../../levels/stages/visualPlayground';
import { compileStage } from '../../world/compileStage';
import { DEFAULT_PROGRESS, loadProgress, normalizeProgress, saveProgress } from '../../progress/stageProgress';
import { freshCampaign, completeMission } from '../../progress/campaignProgress';
import { OTA_APPLY_ATTEMPT_KEY, OTA_SEEN_UPDATE_KEY } from '../../../ota/startupFlow';
import { suspicionGain } from '../../guards/guardBrain';
import type { GuardState } from '../../guards/guardBrain';
import { createTiltState, DEFAULT_TILT, stepTilt } from '../tilt';

test('Tilt is the default control mode, also for a save written before the setting existed', () => {
  assert.equal(DEFAULT_CONTROL_MODE, 'tilt');
  assert.equal(DEFAULT_PROGRESS.controlMode, 'tilt');
  assert.equal(normalizeProgress({ language: 'ko', soundEnabled: false }).controlMode, 'tilt');
  for (const bad of [undefined, null, '', 'TOUCH', 'tap', 1, {}]) assert.equal(normalizeControlMode(bad), 'tilt');
  assert.equal(normalizeControlMode('touch'), 'touch');
});

test('The control mode is saved with the settings and survives a restart, without touching progress or OTA records', async () => {
  const saved = new Map<string, string>(), get = AsyncStorage.getItem, set = AsyncStorage.setItem;
  AsyncStorage.getItem = async key => saved.get(key) ?? null;
  AsyncStorage.setItem = async (key, value) => { saved.set(key, value); };
  try {
    saved.set(OTA_SEEN_UPDATE_KEY, 'seen'); saved.set(OTA_APPLY_ATTEMPT_KEY, 'attempt');
    const campaign = completeMission(freshCampaign(), 0, 31.5, 0);
    await saveProgress({ ...DEFAULT_PROGRESS, campaign, hasStarted: true, language: 'ko', controlMode: 'touch' });
    const restarted = await loadProgress(true);
    assert.equal(restarted.controlMode, 'touch');
    assert.equal(restarted.language, 'ko');
    assert.deepEqual(restarted.campaign, campaign, 'progress is the same object of the save, untouched');
    assert.equal(saved.get(OTA_SEEN_UPDATE_KEY), 'seen'); assert.equal(saved.get(OTA_APPLY_ATTEMPT_KEY), 'attempt');
    assert.deepEqual([...saved.keys()].sort(), ['dont-move.ota.apply-attempt', 'dont-move.ota.seen-update-id', 'dont-move.playable-v1.progress']);
    await saveProgress({ ...restarted, controlMode: 'tilt' });
    assert.equal((await loadProgress(true)).controlMode, 'tilt');
    assert.deepEqual((await loadProgress(true)).campaign, campaign);
  } finally { AsyncStorage.getItem = get; AsyncStorage.setItem = set; }
});

test('What steers the thief: Tilt when chosen and usable, the stick when Touch is chosen, a stated fallback otherwise', () => {
  const release = { dev: false, devStick: false };
  assert.deepEqual(resolveInput({ preferred: 'tilt', sensorUsable: true, ...release }), { kind: 'tilt', fallback: false });
  assert.deepEqual(resolveInput({ preferred: 'touch', sensorUsable: true, ...release }), { kind: 'stick', fallback: false });
  assert.deepEqual(resolveInput({ preferred: 'touch', sensorUsable: false, ...release }), { kind: 'stick', fallback: false });
  // Sensor missing or motion access refused: played by touch, and the screen says why.
  assert.deepEqual(resolveInput({ preferred: 'tilt', sensorUsable: false, ...release }), { kind: 'stick', fallback: true });
  // Tap-to-move walks the thief to a point by itself: development harness only, never in a release build.
  for (const preferred of ['tilt', 'touch'] as const) for (const sensorUsable of [true, false])
    assert.notEqual(resolveInput({ preferred, sensorUsable, ...release }).kind, 'tap');
  assert.equal(resolveInput({ preferred: 'tilt', sensorUsable: false, dev: true, devStick: false }).kind, 'tap');
  assert.equal(resolveInput({ preferred: 'tilt', sensorUsable: false, dev: true, devStick: true }).kind, 'stick');
  assert.equal(resolveInput({ preferred: 'touch', sensorUsable: false, dev: true, devStick: false }).kind, 'stick');
});

test('The stick gives direction and speed continuously; resting on it or letting go is zero', () => {
  assert.deepEqual(stickVector(0, 0), { x: 0, y: 0, kx: 0, ky: 0 });
  const rest = stickVector(STICK_RADIUS*STICK_DEAD*0.9, 0);
  assert.equal(rest.x, 0); assert.equal(rest.y, 0);
  let previous = 0;
  for (let reach = 0.2; reach <= 1.001; reach += 0.1) {
    const v = stickVector(STICK_RADIUS*reach, 0);
    assert(v.x > previous && v.y === 0, `speed must grow with the drag at ${reach}`); previous = v.x;
  }
  assert(Math.abs(stickVector(STICK_RADIUS, 0).x - 1) < 1e-9, 'full radius is full speed');
  assert(Math.abs(stickVector(STICK_RADIUS*5, 0).x - 1) < 1e-9, 'never more than full speed');
  const diagonal = stickVector(-300, 300);
  assert(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9 && diagonal.x < 0 && diagonal.y > 0);
  assert(Math.abs(Math.hypot(diagonal.kx, diagonal.ky) - STICK_RADIUS) < 1e-9, 'the knob stays on the ring');
  for (const bad of [NaN, Infinity]) assert.deepEqual(stickVector(bad, 1), { x: 0, y: 0, kx: 0, ky: 0 });
});

test('Touch control moves the thief only while the thumb drags: no target, no walking by itself, stop on release', () => {
  const player = createPlaygroundState(compileStage(visualPlayground)).player;
  let stick = stickMove(STICK_IDLE, 400, 400);
  assert.deepEqual(stick, STICK_IDLE, 'a move without a touch-down is ignored');
  stick = stickDown(200, 600);
  assert.equal(stick.x, 0); assert.equal(stick.y, 0);
  const step = () => stepTiltPlayer(player, { x: stick.x, y: stick.y, paused: false, reset: 0 }, 1/60, []);
  const x0 = player.x, y0 = player.y;
  for (let i = 0; i < 30; i++) step();
  assert.equal(player.x, x0, 'a tap alone moves nothing'); assert.equal(player.hasTarget, false);
  stick = stickMove(stick, 200 + STICK_RADIUS, 600);
  for (let i = 0; i < 60; i++) step();
  assert(Math.abs(player.speed - 150) < 0.01 && player.x > x0 && Math.abs(player.y - y0) < 1e-9, 'full drag right runs right');
  stick = stickMove(stick, 200, 600 - STICK_RADIUS*0.5);
  for (let i = 0; i < 60; i++) step();
  assert(player.vy < 0 && player.speed > 20 && player.speed < 100, `half drag up is a slower gait, got ${player.speed}`);
  stick = STICK_IDLE;
  const x1 = player.x, y1 = player.y;
  step();
  assert.equal(player.speed, 0); assert.equal(player.vx, 0); assert.equal(player.vy, 0);
  for (let i = 0; i < 120; i++) step();
  assert.equal(player.x, x1); assert.equal(player.y, y1); assert.equal(player.hasTarget, false);
});

test('Detection does not know the control mode: the same movement is seen the same by tilt and by touch', () => {
  // Tilt: a calibrated phone held at 5°. Touch: the drag that asks for the same speed.
  const tilt = createTiltState();
  let ms = 0;
  const sample = (degrees: number) => ({ q: { x: 0, y: Math.sin(degrees*Math.PI/360), z: 0, w: Math.cos(degrees*Math.PI/360) },
    timestamp: ms/1000, receivedAt: ms, rotationRate: 0, acceleration: 0 });
  for (; ms <= 1000; ms += 1000/60) stepTilt(tilt, sample(0), ms, 1/60, DEFAULT_TILT);
  const reach = STICK_DEAD + (1 - STICK_DEAD)*(5 - DEFAULT_TILT.deadZone)/(DEFAULT_TILT.maxTilt - DEFAULT_TILT.deadZone);
  const stick = stickMove(stickDown(0, 0), STICK_RADIUS*reach, 0);
  const stage = compileStage(visualPlayground);
  const viaTilt = createPlaygroundState(stage).player, viaStick = createPlaygroundState(stage).player;
  for (let i = 0; i < 180; i++) {
    ms += 1000/60; stepTilt(tilt, sample(5), ms, 1/60, DEFAULT_TILT);
    stepTiltPlayer(viaTilt, { x: tilt.x, y: tilt.y, paused: false, reset: 0 }, 1/60, []);
    stepTiltPlayer(viaStick, { x: stick.x, y: stick.y, paused: false, reset: 0 }, 1/60, []);
  }
  assert(Math.abs(viaTilt.speed - viaStick.speed) < 1e-6 && viaTilt.speed > 38, `${viaTilt.speed} vs ${viaStick.speed}`);
  // The guard is given what it perceives and the thief's gait. There is no control mode in that.
  assert.equal(suspicionGain.length <= 3, true);
  const seen = { canSee: true, distToPlayer: 100, visionRange: 172, angleToPlayer: 0.1, visionHalfAngle: Math.PI/6, samplesSeen: 3 } as GuardState;
  assert(Math.abs(suspicionGain(seen, viaTilt.gait) - suspicionGain(seen, viaStick.gait)) < 1e-9);
  // And standing still is standing still in both: zero input, zero gait, the base rate.
  stepTiltPlayer(viaStick, { x: 0, y: 0, paused: false, reset: 0 }, 1/60, []);
  stepTilt(tilt, sample(0), ms + 20, 1/60, DEFAULT_TILT);
  stepTiltPlayer(viaTilt, { x: tilt.x, y: tilt.y, paused: false, reset: 0 }, 1/60, []);
  assert.equal(viaTilt.gait, 0); assert.equal(viaStick.gait, 0);
  assert(suspicionGain(seen, 0) > 0 && suspicionGain(seen, 0) < suspicionGain(seen, 1));
});
