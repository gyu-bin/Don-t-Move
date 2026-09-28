import { clamp, turnToward, wrapAngle } from '../core/math';
import { clearSegment, findPath } from '../world/navigation';
import type { Navigation } from '../world/navigation';
import type { GuardState } from './guardBrain';
import { GUARD_TUNING as T } from './guardTuning';

/** Cached path; moving targets can trigger at most one plan per cooldown. */
export function travel(g: GuardState, n: Navigation, speed: number, dt: number, t: number): boolean {
  'worklet';
  const changed = Math.hypot(g.targetX - g.pathTargetX, g.targetY - g.pathTargetY) >= T.repathDistance;
  const done = g.pathIndex >= g.path.length;
  // A pending replan is not arrival at the new destination.
  if(t<g.repathAt && (g.path.length===0 || (done && Math.hypot(g.targetX-g.pathTargetX,g.targetY-g.pathTargetY)>T.arrivalDistance))){
    g.speed=0;return false;
  }
  if (t >= g.repathAt && (g.path.length === 0 || changed || (done && Math.hypot(g.targetX - g.pathTargetX, g.targetY - g.pathTargetY) > T.arrivalDistance))) {
    g.path = findPath(n, g.x, g.y, g.targetX, g.targetY);
    g.pathIndex = 0;
    g.pathTargetX = g.targetX; g.pathTargetY = g.targetY;
    g.repathAt = t + T.repathSeconds;
    g.pathPlans++;
  }
  while (g.pathIndex < g.path.length && Math.hypot(g.path[g.pathIndex] - g.x, g.path[g.pathIndex + 1] - g.y) <= T.arrivalDistance) {
    g.pathIndex += 2;
  }
  if (g.pathIndex >= g.path.length) { g.speed = 0; return true; }
  const tx = g.path[g.pathIndex];
  const ty = g.path[g.pathIndex + 1];
  const dx = tx - g.x;
  const dy = ty - g.y;
  const distance = Math.hypot(dx, dy);
  const heading = Math.atan2(dy, dx);
  g.facing = turnToward(g.facing, heading, T.turnRateAlert, dt);
  g.baseFacing = g.facing; g.glance = 0;
  // Turn before moving, so the rendered body and actual travel agree.
  if (Math.abs(wrapAngle(heading - g.facing)) > 0.08) { g.speed = 0; return false; }
  g.facing = heading; g.baseFacing = heading;
  const velocity = g.speed + clamp(speed - g.speed, -T.decel * dt, T.accel * dt);
  const move = Math.min(distance, velocity * dt);
  const x = g.x + dx / distance * move;
  const y = g.y + dy / distance * move;
  if (!clearSegment(g.x, g.y, x, y, n.blockers, n.radius)) {
    g.speed = 0;
    g.path = [];
    return false;
  }
  g.x = x; g.y = y;
  g.speed = move / Math.max(dt, 1e-6);
  return false;
}
