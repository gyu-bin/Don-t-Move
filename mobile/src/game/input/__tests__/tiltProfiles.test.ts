/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearProfileInput, profileTuning, TILT_PROFILES, tiltCompareEnabled } from '../tiltProfiles';
import { createTiltState, DEFAULT_TILT, multiply, recenterTilt, stepTilt } from '../tilt';
import type { Quaternion, AttitudeSample } from '../tilt';
import { stepTiltPlayer } from '../tiltMovement';
import { createPlaygroundState } from '../../playground/playgroundState';
import { compileStage } from '../../world/compileStage';
import { visualPlayground } from '../../levels/stages/visualPlayground';

const identity = { x: 0, y: 0, z: 0, w: 1 };
const near = (a: number, b: number) => assert(Math.abs(a-b) < 1e-6, `${a} != ${b}`);
function rotation(angle: number, diagonal = false): Quaternion {
  const half = angle * Math.PI / 360, k = Math.sin(half) / (diagonal ? Math.SQRT2 : 1);
  return { x: diagonal ? k : 0, y: k, z: 0, w: Math.cos(half) };
}
function sample(q: Quaternion, ms: number): AttitudeSample {
  return { q, timestamp: ms/1000, receivedAt: ms, rotationRate: 0, acceleration: 0 };
}
function calibrated() {
  const state = createTiltState();
  for (let ms=0; ms<=1000; ms+=20) stepTilt(state, sample(identity, ms), ms, .02, DEFAULT_TILT);
  assert(state.neutral); return state;
}

test('Candidate mapping needs development plus explicit flag; release retains runtime default', () => {
  assert.equal(tiltCompareEnabled(true,'1'),true);
  for (const [dev,flag] of [[false,'1'],[true,'0'],[true,undefined]] as const) assert.equal(tiltCompareEnabled(dev,flag),false);
  for (const id of ['A','B','C'] as const) assert.deepEqual(profileTuning(false,id),DEFAULT_TILT);
  assert.deepEqual(DEFAULT_TILT,TILT_PROFILES.B, 'physical review promotes B only; A/C remain DEV candidates');
});

for (const id of ['A','B','C'] as const) {
  const tuning = TILT_PROFILES[id];
  test(`${id}: quaternion pipeline reaches curve anchors and unchanged actual player speeds`, () => {
    const angles = [tuning.deadZone, tuning.deadZone+(tuning.maxTilt-tuning.deadZone)*5/22, tuning.deadZone+(tuning.maxTilt-tuning.deadZone)*12/22, tuning.maxTilt, tuning.maxTilt+5];
    for (const [index,angle] of angles.entries()) {
      const s = calibrated();
      for (let ms=1020;ms<=4000;ms+=20) stepTilt(s,sample(rotation(angle),ms),ms,.02,tuning);
      const target = [0,38,72,150,150][index]; near(Math.hypot(s.x,s.y)*150,target);
      const p = createPlaygroundState(compileStage(visualPlayground)).player;
      for (let i=0;i<60;i++) stepTiltPlayer(p,{x:s.x,y:s.y,reset:0,paused:false},1/60,[]);
      near(p.speed,target); assert.deepEqual(s.neutral,identity);
    }
  });
  test(`${id}: diagonal cap and switching preserve neutral; recenter stays explicit`, () => {
    const s=calibrated(), neutral={...s.neutral!}, method=s.calibrationMethod, readyAt=s.readyAt;
    for(let ms=1020;ms<=4000;ms+=20)stepTilt(s,sample(rotation(tuning.maxTilt,true),ms),ms,.02,tuning);
    near(Math.hypot(s.x,s.y),1);
    clearProfileInput(s); near(s.x,0);near(s.y,0);near(s.smoothX,0);near(s.deadY,0);
    assert.deepEqual(s.neutral,neutral);assert.equal(s.calibrationMethod,method);assert.equal(s.readyAt,readyAt);
    const pose=rotation(100,true);assert(recenterTilt(s,sample(pose,4100),4100));
    stepTilt(s,sample(pose,4120),4120,.02,tuning);near(s.x,0);near(s.y,0);
    stepTilt(s,sample(multiply(pose,rotation(tuning.maxTilt)),4140),4140,.02,tuning);assert(s.x>0);
    for(const key of ['x','y','z','w'] as const)near(s.neutral![key],pose[key]);
  });
}
