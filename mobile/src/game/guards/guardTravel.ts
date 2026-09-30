import { clamp, turnToward, wrapAngle } from '../core/math';
import { clearSegment, findPath } from '../world/navigation';
import type { Navigation } from '../world/navigation';
import type { GuardState } from './guardBrain';
import { GUARD_TUNING as T } from './guardTuning';

// Worklet closures capture values at module initialization: dependencies must precede callers.
/** Heading change a pursuing guard must turn in place for (a reversal), rad. */
const PURSUIT_TURN_IN_PLACE = Math.PI / 2;

/** Invalid transient inputs must not propagate NaN coordinates into the renderer. */
function prepareTravel(g: GuardState, speed: number, dt: number): boolean {
  'worklet';
  if (!Number.isFinite(g.x) || !Number.isFinite(g.y) || !Number.isFinite(speed) ||
    !Number.isFinite(dt) || dt <= 0 || speed < 0) { g.speed = 0; return false; }
  if (!Number.isFinite(g.targetX) || !Number.isFinite(g.targetY)) {
    if (g.hasLkp && Number.isFinite(g.lkpX) && Number.isFinite(g.lkpY)) {
      g.targetX = g.lkpX; g.targetY = g.lkpY; g.path = []; g.pathIndex = 0;
    } else { g.speed = 0; return false; }
  }
  if (!Number.isFinite(g.speed)) g.speed = 0;
  if (!Array.isArray(g.path) || g.path.length % 2 !== 0 || !Number.isInteger(g.pathIndex) ||
    g.pathIndex < 0 || g.pathIndex % 2 !== 0 || (g.pathIndex < g.path.length &&
      (!Number.isFinite(g.path[g.pathIndex]) || !Number.isFinite(g.path[g.pathIndex + 1])))) {
    g.path = []; g.pathIndex = 0;
  }
  return true;
}

/** One running step straight at the live target when that step alone is clear. */
function stepToward(g: GuardState, n: Navigation, speed: number, dt: number): boolean {
  'worklet';
  const dx = g.targetX - g.x, dy = g.targetY - g.y, distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return false;
  const heading = Math.atan2(dy, dx);
  if (Math.abs(wrapAngle(heading - g.facing)) > PURSUIT_TURN_IN_PLACE) return false;
  const velocity = g.speed + clamp(speed - g.speed, -T.decel * dt, T.accel * dt);
  const move = Math.min(distance, velocity * dt);
  const x = g.x + dx / distance * move, y = g.y + dy / distance * move;
  if (!clearSegment(g.x, g.y, x, y, n.blockers, n.radius)) return false;
  g.x = x; g.y = y; g.speed = velocity;
  return true;
}

/**
 * Waypoint travel (Patrol / Investigate / Search / Return): cached path, at most one plan per
 * cooldown, exact stop on the final waypoint, turn in place before a sharp new heading.
 *
 * `pursuit` is the Direct Chase fallback when the straight line to the player is blocked:
 * the target is a live body, so a stale endpoint replans at once instead of holding
 * speed 0 until the cooldown ends, corners are taken while moving, and speed is carried
 * through waypoints instead of being re-derived from the (shorter) final step.
 */
export function travel(g: GuardState, n: Navigation, speed: number, dt: number, t: number, pursuit = false): boolean {
  'worklet';
  if (!prepareTravel(g, speed, dt)) return false;
  const changed = Math.hypot(g.targetX - g.pathTargetX, g.targetY - g.pathTargetY) >= T.repathDistance;
  const done = g.pathIndex >= g.path.length;
  const stale = done && Math.hypot(g.targetX - g.pathTargetX, g.targetY - g.pathTargetY) > T.arrivalDistance;
  // A pending replan is not arrival at the new destination.
  if(t<g.repathAt && (g.path.length===0 || stale)){
    // Pursuit keeps closing on the live body while the plan cooldown runs (no A* spam,
    // no standing still at a stale endpoint); waypoint travel waits for its new plan.
    if(pursuit && stepToward(g, n, speed, dt)) return false;
    g.speed=0;return false;
  }
  if (t >= g.repathAt && (g.path.length === 0 || changed || stale)) {
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
  // A pursuing guard only stops to turn around (> 90°); smaller corners are taken running.
  if (Math.abs(wrapAngle(heading - g.facing)) > (pursuit ? PURSUIT_TURN_IN_PLACE : 0.08)) { g.speed = 0; return false; }
  if (!pursuit) { g.facing = heading; g.baseFacing = heading; }
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
  g.speed = pursuit ? velocity : move / Math.max(dt, 1e-6);
  return false;
}

/**
 * Direct Chase movement controller. The target is the player's live body, not a
 * navigation destination: there is no arrival radius, no deceleration zone and no path
 * endpoint. While the straight line to the player is clear for the guard's body the guard
 * runs straight at the player and stops only at body contact (`contactDistance`, which
 * must not exceed the capture distance, so capture always happens). Around walls it
 * falls back to path travel in pursuit mode. Always returns false (a chase never arrives).
 */
export function pursue(g: GuardState, n: Navigation, speed: number, dt: number, t: number, contactDistance: number): boolean {
  'worklet';
  if (!Number.isFinite(contactDistance) || contactDistance < 0) { g.speed = 0; return false; }
  if (!prepareTravel(g, speed, dt)) return false;
  const dx = g.targetX - g.x;
  const dy = g.targetY - g.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6 || !clearSegment(g.x, g.y, g.targetX, g.targetY, n.blockers, n.radius)) {
    travel(g, n, speed, dt, t, true);
    return false;
  }
  const heading = Math.atan2(dy, dx);
  g.facing = turnToward(g.facing, heading, T.turnRateAlert, dt);
  g.baseFacing = g.facing; g.glance = 0;
  if (Math.abs(wrapAngle(heading - g.facing)) > PURSUIT_TURN_IN_PLACE) { g.speed = 0; return false; }
  const velocity = g.speed + clamp(speed - g.speed, -T.decel * dt, T.accel * dt);
  const move = Math.min(velocity * dt, Math.max(0, distance - contactDistance));
  g.x += dx / distance * move;
  g.y += dy / distance * move;
  g.speed = velocity;
  return false;
}
