import { advancePlayerSpritePhase, gaitFromSpeed, strideCycleLength } from '../core/locomotion';
import { turnToward } from '../core/math';
import { moveWithCollision } from '../world/collision';
import { BODY } from '../guards/guardTuning';
import type { PlayerState } from '../playground/playgroundState';

export interface TiltMovement { x: number; y: number; paused: boolean; reset: number }
export function stopPlayer(p: PlayerState): void {
  'worklet';
  p.vx = p.vy = p.speed = p.gait = 0;
  p.hasTarget = false;
}
export function movementName(speed: number): string {
  'worklet';
  return speed <= 0.5 ? 'IDLE' : speed <= 38 ? 'SNEAK' : speed <= 72 ? 'WALK' : 'RUN';
}
export function tiltVisualGait(speed: number): number {
  'worklet';
  return speed <= 0.5 ? 0 : speed <= 38 ? 1 : speed <= 72 ? 2 : 3;
}
export function stepTiltPlayer(p: PlayerState, input: TiltMovement, dt: number, blockers: number[]): void {
  'worklet';
  p.hasTarget = false;
  if (input.paused || p.inputReset !== input.reset) {
    p.inputReset = input.reset; stopPlayer(p); return;
  }
  const length = Math.max(1, Math.hypot(input.x, input.y));
  const tx = input.x/length*150, ty = input.y/length*150;
  const dx = tx-p.vx, dy = ty-p.vy;
  const change = Math.hypot(dx, dy);
  const acceleration = Math.hypot(tx, ty) < Math.hypot(p.vx, p.vy) ? 1400 : 320;
  const k = change > 0 ? Math.min(1, acceleration*dt/change) : 1;
  p.vx += dx*k; p.vy += dy*k;
  const bx = p.x, by = p.y;
  moveWithCollision(p, p.vx*dt, p.vy*dt, BODY.playerRadius, blockers);
  // Collision-resolved velocity is the only source of speed, suspicion and foot distance.
  p.vx = (p.x-bx)/dt; p.vy = (p.y-by)/dt;
  p.speed = Math.hypot(p.vx, p.vy);
  p.gait = gaitFromSpeed(p.speed);
  if (p.speed > 0.5) p.facing = turnToward(p.facing, Math.atan2(p.vy, p.vx), 10, dt);
  p.phase = (p.phase+p.speed*dt/strideCycleLength(tiltVisualGait(p.speed)))%1;
  p.dist += p.speed*dt;
  p.spritePhase = advancePlayerSpritePhase(p.spritePhase, p.speed * dt, p.speed);
}
