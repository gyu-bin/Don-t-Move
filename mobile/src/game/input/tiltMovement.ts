import { advancePlayerSpritePhase, gaitFromSpeed, strideCycleLength, playerLocoStride, playerSpriteGait, stablePlayerSpriteGait } from '../core/locomotion';
import { turnToward } from '../core/math';
import { moveWithCollision } from '../world/collision';
import { BODY } from '../guards/guardTuning';
import type { PlayerState } from '../playground/playgroundState';

const WALL_PROBE_SPEED = 40;
export interface TiltMovement { x: number; y: number; paused: boolean; reset: number }
export function stopPlayer(p: PlayerState): void {
  'worklet';
  p.vx = p.vy = p.speed = p.gait = p.visualGait = 0;
  p.hasTarget = false;
}
export function movementName(speed: number): string {
  'worklet';
  return ['IDLE','SNEAK','WALK','RUN'][playerSpriteGait(speed)];
}
export function tiltVisualGait(speed: number): number {
  'worklet';
  return playerSpriteGait(speed);
}
export function stepTiltPlayer(p: PlayerState, input: TiltMovement, dt: number, blockers: number[]): void {
  'worklet';
  // Zero/invalid frame time used to divide collision-resolved travel by zero,
  // poisoning speed, gait and sprite frames with NaN even at a stationary wall.
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(input.x) || !Number.isFinite(input.y) ||
      !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
    stopPlayer(p);
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[COLLISION] invalid tilt frame');
    return;
  }
  p.hasTarget = false;
  if (input.paused || p.inputReset !== input.reset) {
    p.inputReset = input.reset; stopPlayer(p); return;
  }
  const length = Math.max(1, Math.hypot(input.x, input.y));
  const tx = input.x/length*150, ty = input.y/length*150;
  // Wall slide: a component still pressed into the surface that blocked it last
  // frame is not a velocity error. Leaving it in the error vector spent most of
  // the acceleration budget on the wall and starved the tangent, so the player
  // crawled along structures. The tangent now accelerates as if moving freely.
  const pushX = !!p.contactX && Math.sign(tx) === p.contactX;
  const pushY = !!p.contactY && Math.sign(ty) === p.contactY;
  // Speed-preserving slide: part of the intent lost into the wall is redirected
  // along it, never exceeding the intended speed. It fades out as the input
  // turns square to the wall, so pushing straight in still stops.
  const intent = Math.hypot(tx, ty);
  const slide = (tangent: number, normal: number): number => {
    const share = intent > 0 ? Math.abs(tangent)/intent : 0;
    const fade = Math.max(0, Math.min(1, (share-0.1)/0.25));
    return Math.sign(tangent)*Math.min(intent, Math.abs(tangent)+fade*0.6*Math.abs(normal));
  };
  const gx = pushX ? 0 : pushY ? slide(tx, ty) : tx;
  const gy = pushY ? 0 : pushX ? slide(ty, tx) : ty;
  const dx = gx-p.vx, dy = gy-p.vy;
  const change = Math.hypot(dx, dy);
  const acceleration = Math.hypot(gx, gy) < Math.hypot(p.vx, p.vy) ? 1400 : 320;
  const k = change > 0 ? Math.min(1, acceleration*dt/change) : 1;
  p.vx += dx*k; p.vy += dy*k;
  const bx = p.x, by = p.y;
  // Keep a slow probe into the wall so contact is re-detected; when the wall
  // ends the body leaves at probe speed and accelerates normally.
  const mx = pushX ? Math.sign(tx)*Math.min(Math.abs(tx), WALL_PROBE_SPEED) : p.vx;
  const my = pushY ? Math.sign(ty)*Math.min(Math.abs(ty), WALL_PROBE_SPEED) : p.vy;
  moveWithCollision(p, mx*dt, my*dt, BODY.playerRadius, blockers);
  const rx = (p.x-bx)/dt, ry = (p.y-by)/dt;
  p.contactX = Math.abs(mx) > 1 && Math.abs(rx) < Math.abs(mx)*0.5 ? Math.sign(mx) : 0;
  p.contactY = Math.abs(my) > 1 && Math.abs(ry) < Math.abs(my)*0.5 ? Math.sign(my) : 0;
  // Collision-resolved velocity is the only source of speed, suspicion and foot distance.
  p.vx = (p.x-bx)/dt; p.vy = (p.y-by)/dt;
  p.speed = Math.hypot(p.vx, p.vy);
  p.gait = gaitFromSpeed(p.speed);
  p.visualGait = stablePlayerSpriteGait(p.speed, p.visualGait);
  if (p.speed > 0.5) p.facing = turnToward(p.facing, Math.atan2(p.vy, p.vx), 10, dt);
  p.phase = (p.phase+p.speed*dt/strideCycleLength(tiltVisualGait(p.speed)))%1;
  p.dist += p.speed*dt;
  p.spritePhase = advancePlayerSpritePhase(p.spritePhase, p.speed * dt, p.speed, playerLocoStride(p.visualGait, p.facing), p.visualGait);
}
