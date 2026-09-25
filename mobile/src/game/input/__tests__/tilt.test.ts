/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTiltState, DEFAULT_TILT, multiply, recenterTilt, relativeTilt, response, sensorLifecycleAction, stepTilt } from '../tilt';
import type { AttitudeSample, Quaternion } from '../tilt';
import { movementName, stepTiltPlayer, tiltVisualGait } from '../tiltMovement';
import { createPlaygroundState, stepPlayground } from '../../playground/playgroundState';
import { visualPlayground } from '../../levels/stages/visualPlayground';
import { compileStage, TILE } from '../../world/compileStage';
import { buildNavigation } from '../../world/navigation';
import { advancePlayerSpritePhase, gaitFromSpeed } from '../../core/locomotion';

const identity = { x: 0, y: 0, z: 0, w: 1 };
function rotation(x: number, y: number, z: number, degrees: number): Quaternion {
  const k = Math.sin(degrees*Math.PI/360)/Math.hypot(x,y,z);
  return { x:x*k, y:y*k, z:z*k, w:Math.cos(degrees*Math.PI/360) };
}
function sample(q = identity, t = 0): AttitudeSample {
  return { q, timestamp:t, receivedAt:t*1000, rotationRate:0, acceleration:0 };
}
function near(a: number, b: number, eps = 1e-7) { assert(Math.abs(a-b)<eps, `${a} != ${b}`); }
function calibrated(q = identity) {
  const s = createTiltState();
  for (let i=0;i<=31;i++) stepTilt(s,sample(q,i/60),i/60*1000,1/60,DEFAULT_TILT);
  assert(s.neutral); return s;
}
const stage = compileStage(visualPlayground);
const input = (x: number, y: number, reset=0, paused=false) => ({ x,y,reset,paused });

test('Foreground never silently replaces Neutral; temporary inactivity preserves the session', () => {
  assert.equal(sensorLifecycleAction('active',false,false),'start');
  assert.equal(sensorLifecycleAction('inactive',true,true),'pause');
  assert.equal(sensorLifecycleAction('active',true,true),'resume');
  assert.equal(sensorLifecycleAction('background',true,true),'stop');
  assert.equal(sensorLifecycleAction('active',false,true),'wait');
});

test('Calibration requires 0.5 seconds of stable, distinct sensor samples, then READY', () => {
  const s = createTiltState();
  for (let i=0;i<30;i++) stepTilt(s,sample(identity,i/60),i/60*1000,1/60,DEFAULT_TILT);
  assert.equal(s.neutral,null);
  stepTilt(s,sample(identity,.5),500,1/60,DEFAULT_TILT);
  assert.deepEqual(s.neutral,identity); assert.equal(s.status,'READY');
  near(s.x,0); near(s.y,0);
  stepTilt(s,sample(identity,.9),900,1/60,DEFAULT_TILT); assert.equal(s.status,'PLAY');
});
test('Moving, shaking, sparse or duplicate samples cannot complete calibration', () => {
  for (const mode of ['moving','shaking','gap','duplicate']) {
    const s = createTiltState();
    for (let i=0;i<100;i++) {
      const a = sample(identity,mode==='gap' ? i*.2 : mode==='duplicate' ? 0 : i/60);
      if (mode==='moving') a.rotationRate=1;
      if (mode==='shaking') a.acceleration=.4;
      stepTilt(s,a,a.receivedAt,1/60,DEFAULT_TILT);
    }
    assert.equal(s.neutral,null,mode);
  }
});
test('All comfortable poses, including vertical and upside-down, give identical relative directions', () => {
  for (const base of [identity,rotation(1,0,0,90),rotation(1,0,0,180),rotation(1,1,1,123)]) {
    const s = calibrated(base);
    for (const [axis,degrees,x,y] of [[0,12,0,12],[0,-12,0,-12],[1,12,12,0],[1,-12,-12,0]]) {
      const q = multiply(base,axis===0 ? rotation(1,0,0,degrees) : rotation(0,1,0,degrees));
      const v = relativeTilt(s.neutral!,q); near(v.roll,x); near(v.pitch,y);
    }
  }
});
test('Yaw-only twist never moves; quaternion sign and angle wrap do not change input', () => {
  for (const base of [identity,rotation(1,1,0,95)]) {
    for (const yaw of [-179,-90,90,179]) {
      const q = multiply(base,rotation(0,0,1,yaw));
      near(relativeTilt(base,q).magnitude,0);
      near(relativeTilt(base,{x:-q.x,y:-q.y,z:-q.z,w:-q.w}).magnitude,0);
    }
    const tilted = multiply(base,rotation(0,1,0,15));
    const a = relativeTilt(base,tilted), b = relativeTilt(base,multiply(tilted,rotation(0,0,1,120)));
    near(a.roll,b.roll); near(a.pitch,b.pitch);
  }
});
test('Radial deadzone has an exact zero and diagonal speed is never boosted', () => {
  for (const angle of [0,1,1.9,2]) {
    const s=calibrated(); stepTilt(s,sample(rotation(1,1,0,angle),1),1000,1,DEFAULT_TILT);
    near(s.x,0);near(s.y,0);
  }
  for (const angle of [5,10,20,25,45]) {
    const a=calibrated(), b=calibrated();
    stepTilt(a,sample(rotation(0,1,0,angle),1),1000,1,{...DEFAULT_TILT,smoothing:0});
    stepTilt(b,sample(rotation(1,1,0,angle),1),1000,1,{...DEFAULT_TILT,smoothing:0});
    near(Math.hypot(a.x,a.y),Math.hypot(b.x,b.y)); assert(Math.hypot(b.x,b.y)<=1+1e-9);
  }
});
test('Response curve has Sneak/Walk/Run anchors and precision near neutral', () => {
  near(response(5/22,DEFAULT_TILT)*150,38);
  near(response(12/22,DEFAULT_TILT)*150,72);
  near(response(1,DEFAULT_TILT)*150,150);
  assert(response(.01,DEFAULT_TILT)<.01);
  assert.equal(movementName(20),'SNEAK'); assert.equal(movementName(60),'WALK'); assert.equal(movementName(120),'RUN');
  assert.equal(tiltVisualGait(1),1); assert.equal(tiltVisualGait(0),0);
});
test('Comfort tuning responds at 3 degrees, walks near 10, and reaches max at 16', () => {
  const speeds = [3, 10, 16].map((angle) => {
    const s=calibrated();
    stepTilt(s,sample(rotation(0,1,0,angle),1),1000,1,{...DEFAULT_TILT,smoothing:0});
    return Math.hypot(s.x,s.y)*150;
  });
  assert(speeds[0] > 5 && speeds[0] < 20);
  assert(speeds[1] >= 72 && speeds[1] < 85);
  near(speeds[2],150);
});
test('Player animation retains phase across gait changes and stops without advancing', () => {
  let phase=0.43;
  for(const speed of [37,39,71,73,150,72,38,0]) {
    const next=advancePlayerSpritePhase(phase,speed/60,speed);
    const delta=(next-phase+1)%1;
    assert(delta < 0.04, `phase jumped at ${speed}`);
    if(speed === 0) near(next,phase);
    phase=next;
  }
});
test('Smoothing is time-based; entering deadzone clears the filter immediately', () => {
  const a=calibrated(), b=calibrated();
  stepTilt(a,sample(rotation(0,1,0,20),1),1000,.1,DEFAULT_TILT);
  for(let i=0;i<10;i++) stepTilt(b,sample(rotation(0,1,0,20),1+i*.01),1000+i*10,.01,DEFAULT_TILT);
  near(a.smoothX,b.smoothX);
  stepTilt(a,sample(identity,1.1),1100,.01,DEFAULT_TILT);
  near(a.x,0);near(a.smoothX,0);
});
test('Neutral is immutable over five minutes of changing input (no adaptive calibration)', () => {
  const s=calibrated(rotation(1,0,0,90)); const neutral={...s.neutral!};
  for(let i=60;i<60*301;i++) {
    const q=multiply(neutral,rotation(0,1,0,Math.sin(i/90)*20));
    stepTilt(s,sample(q,i/60),i/60*1000,1/60,DEFAULT_TILT);
  }
  assert.deepEqual(s.neutral,neutral);
});
test('Recenter resets input/filter immediately and accepts a changed posture, never stale data', () => {
  const s=calibrated();
  stepTilt(s,sample(rotation(0,1,0,25),1),1000,1,DEFAULT_TILT); assert(s.x>.9);
  const q=rotation(1,1,0,120);
  assert(recenterTilt(s,sample(q,2),2000)); near(s.x,0); near(s.smoothX,0); assert.equal(s.status,'CENTER RESET');
  stepTilt(s,sample(multiply(q,rotation(0,1,0,15)),2.1),2100,.1,DEFAULT_TILT);
  assert(s.x>0); assert.equal(s.status,'CENTER RESET', 'feedback must not lock controls or pause Guards');
  stepTilt(s,sample(q,2.5),2500,1/60,DEFAULT_TILT); near(s.x,0);near(s.y,0);
  const neutral=s.neutral;
  assert(!recenterTilt(s,sample(identity,0),3000)); assert.deepEqual(s.neutral,neutral);
});
test('Missing, invalid and stale sensors stop input without moving neutral', () => {
  for(const a of [null,sample(identity,0),sample({x:NaN,y:0,z:0,w:1},1)]) {
    const s=calibrated();const neutral=s.neutral;
    stepTilt(s,a,1000,1/60,DEFAULT_TILT);
    assert.equal(s.status,'SENSOR PAUSED');near(s.x,0);assert.deepEqual(s.neutral,neutral);
  }
});
test('Acceleration, diagonal cap and fast deceleration use actual movement', () => {
  const a=createPlaygroundState(stage).player,b=createPlaygroundState(stage).player;
  for(let i=0;i<60;i++) {stepTiltPlayer(a,input(1,0),1/60,[]);stepTiltPlayer(b,input(1,1),1/60,[]);}
  near(a.speed,150);near(b.speed,150);near(a.dist,b.dist);
  for(let i=0;i<7;i++) stepTiltPlayer(a,input(0,0),1/60,[]);
  near(a.speed,0);near(a.gait,0);
});
test('Wall stops movement, foot distance and movement risk; sliding reports only actual speed', () => {
  const p=createPlaygroundState(stage).player;p.x=0;p.y=0;
  const blockers=[20,-1000,40,1000];
  for(let i=0;i<120;i++) stepTiltPlayer(p,input(1,0),1/60,blockers);
  assert(p.x<11);near(p.speed,0);near(p.gait,0);const distance=p.dist;
  stepTiltPlayer(p,input(1,0),1/60,blockers);near(p.dist,distance);
  stepTiltPlayer(p,input(1,1),1/60,blockers);assert(p.vy>0);near(p.vx,0);near(p.gait,gaitFromSpeed(p.speed));
});
test('Recenter and lifecycle pause stop player instantly even at full speed', () => {
  for(const command of [input(0,0,1),input(1,0,0,true)]) {
    const p=createPlaygroundState(stage).player;p.vx=150;p.speed=150;
    const x=p.x;stepTiltPlayer(p,command,1/60,[]);near(p.speed,0);near(p.x,x);
  }
});
test('Tilt excludes old touch/demo targets; calibration pauses guards and game clock', () => {
  const s=createPlaygroundState(stage); const nav=buildNavigation(stage,8);
  s.player.hasTarget=true;s.player.tx=s.player.x+100;s.playerMode=-1;
  const start={...s.player};
  const step=(paused:boolean) => stepPlayground(s,1/60,TILE,300,600,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav,input(0,0,0,paused));
  step(true);near(s.t,0);near(s.player.x,start.x);
  for(let i=0;i<60;i++) step(false);
  near(s.player.x,start.x);near(s.player.y,start.y);assert(!s.player.hasTarget);
});
