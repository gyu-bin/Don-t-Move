import { clamp, turnToward, wrapAngle } from '../core/math';
import { Awareness, Gait, GuardAction } from '../core/types';
import type { FootstepEvent } from '../stealth/footsteps';
import { clearSegment } from '../world/navigation';
import type { Navigation } from '../world/navigation';
import type { GuardState } from './guardBrain';
import { travel } from './guardTravel';
import { GUARD_TUNING as T } from './guardTuning';

export type FootfallSound = Readonly<FootstepEvent>;

export const HearingPhase = { None: 0, Look: 1, Investigate: 2, Sweep: 3, Return: 4 } as const;
type HearingPhaseCode = (typeof HearingPhase)[keyof typeof HearingPhase];

/** Transient hearing memory, independent of the last visually confirmed position. */
export interface HearingState {
  phase: HearingPhaseCode;
  readonly heardX: number;
  readonly heardY: number;
  readonly startedAt: number;
  until: number;
  readyAt: number;
  readonly originX: number;
  readonly originY: number;
  readonly lookFacing: number;
  readonly investigate: boolean;
  sweepFacing: number;
}

const AUDIBLE_STRENGTH = 0.14;
const INVESTIGATE_STRENGTH = 0.32;
const MAX_EVENT_AGE = 0.2;
const WEAK_LOOK_SECONDS = 0.34;
const WEAK_LOOK_ANGLE = 22 * Math.PI / 180;
const STRONG_LOOK_SECONDS = 0.72;
const INVESTIGATE_SECONDS = 2.6;
const SWEEP_SECONDS = 0.95;
const RETURN_SECONDS = 3.2;
const PATROL_RECOVERY_SECONDS = 2.4;

/** Visual evidence and existing guard assignments always own the guard first. */
export function canRespondToSound(g: GuardState): boolean {
  'worklet';
  return g.awareness === Awareness.Patrol && g.action === GuardAction.None &&
    !g.canSee && !g.hasLkp && g.suspicion === 0 && !g.localInvestigating && !g.localReturning;
}

/** One best unobstructed listener, with stable roster-order ties. Call only during stealth. */
export function offerFootstep(
  guards: GuardState[], sound: FootfallSound, navigation: Navigation, t: number, sensitivity = 1,
  opaqueBlockers?: number[],
): GuardState | undefined {
  'worklet';
  if (!Number.isFinite(t) || !Number.isFinite(sound.t) || sound.t > t || t - sound.t > MAX_EVENT_AGE ||
    !Number.isFinite(sound.x) || !Number.isFinite(sound.y) || !Number.isFinite(sound.gait) ||
    sound.gait <= Gait.Idle || sound.gait > Gait.Run ||
    !Number.isFinite(sound.strength) || sound.strength <= 0 || !Number.isFinite(sound.range) || sound.range <= 0 ||
    !Number.isFinite(sensitivity) || sensitivity <= 0) return;

  let listener: GuardState | undefined;
  let loudest = AUDIBLE_STRENGTH;
  const rangeSquared = sound.range * sound.range;
  const strength = sound.strength * sensitivity;
  for (let i = 0; i < guards.length; i++) {
    const g = guards[i];
    // A fresh sound cannot hand the same patrol gap off to a second guard.
    if (g.hearing && (g.hearing.phase !== HearingPhase.None || t < g.hearing.readyAt)) return;
    if (!canRespondToSound(g)) continue;
    const dx = sound.x - g.x;
    const dy = sound.y - g.y;
    const distanceSquared = dx * dx + dy * dy;
    if (!Number.isFinite(distanceSquared) || distanceSquared >= rangeSquared) continue;
    const heardStrength = strength * (1 - Math.sqrt(distanceSquared) / sound.range);
    if (heardStrength <= loudest || !clearSegment(g.x, g.y, sound.x, sound.y, navigation.blockers) ||
      (opaqueBlockers && !clearSegment(g.x, g.y, sound.x, sound.y, opaqueBlockers))) continue;
    listener = g;
    loudest = heardStrength;
  }
  if (listener) {
    const investigate = sound.gait >= Gait.Walk && loudest >= INVESTIGATE_STRENGTH;
    const sourceFacing = Math.atan2(sound.y - listener.y, sound.x - listener.x);
    const angleToSource = wrapAngle(sourceFacing - listener.facing);
    listener.hearing = {
      phase: HearingPhase.Look,
      heardX: sound.x, heardY: sound.y, startedAt: t,
      until: t + (investigate ? STRONG_LOOK_SECONDS : WEAK_LOOK_SECONDS), readyAt: t,
      originX: listener.x, originY: listener.y,
      lookFacing: investigate ? sourceFacing : listener.facing + clamp(angleToSource, -WEAK_LOOK_ANGLE, WEAK_LOOK_ANGLE),
      investigate,
      sweepFacing: listener.facing,
    };
  }
  return listener;
}

function resetTravel(g: GuardState): void {
  'worklet';
  g.path = [];
  g.pathIndex = 0;
  g.repathAt = 0;
}

export function cancelHearing(g: GuardState, t: number, resumePatrol = false): void {
  'worklet';
  const h = g.hearing;
  if (!h || h.phase === HearingPhase.None) return;
  if (h.phase !== HearingPhase.Look) resetTravel(g);
  if (resumePatrol && !g.semanticPatrol && !g.roaming &&
    Math.hypot(g.x - h.originX, g.y - h.originY) > T.arrivalDistance) g.localReturning = true;
  h.phase = HearingPhase.None;
  h.until = t;
  h.readyAt = t + PATROL_RECOVERY_SECONDS;
}

function lookToward(g: GuardState, angle: number, dt: number): void {
  'worklet';
  g.facing = turnToward(g.facing, angle, T.turnRatePatrol, dt);
  g.baseFacing = g.facing;
  g.glance = 0;
  g.speed = 0;
}

/** Owns one frame of motion during a bounded, local response to the fixed footfall. */
export function stepHearingResponse(g: GuardState, navigation: Navigation, t: number, dt: number): boolean {
  'worklet';
  const h = g.hearing;
  if (!h || h.phase === HearingPhase.None) return false;
  if (!canRespondToSound(g)) {
    cancelHearing(g, t);
    return false;
  }
  g.patrolProgressAt = -1;
  if (h.phase === HearingPhase.Look) {
    // Return a weak glance to its starting heading within the same beat. A guard
    // already holding an authored look can then resume it without staying turned.
    const angle = h.investigate || h.until - t > WEAK_LOOK_SECONDS / 2 ? h.lookFacing : h.sweepFacing;
    lookToward(g, angle, dt);
    if (t >= h.until) {
      if (h.investigate) {
        h.phase = HearingPhase.Investigate;
        h.until = t + INVESTIGATE_SECONDS;
        resetTravel(g);
      } else cancelHearing(g, t);
    }
  } else if (h.phase === HearingPhase.Investigate) {
    g.targetX = h.heardX;
    g.targetY = h.heardY;
    if (t >= h.until || travel(g, navigation, T.walkSpeed * 0.9, dt, t)) {
      h.phase = HearingPhase.Sweep;
      h.until = t + SWEEP_SECONDS;
      h.sweepFacing = g.facing;
      g.speed = 0;
    }
  } else if (h.phase === HearingPhase.Sweep) {
    const progress = 1 - Math.max(0, h.until - t) / SWEEP_SECONDS;
    lookToward(g, h.sweepFacing + Math.sin(progress * 2 * Math.PI) * 0.58, dt);
    if (t >= h.until) {
      h.phase = HearingPhase.Return;
      h.until = t + RETURN_SECONDS;
      resetTravel(g);
    }
  } else {
    g.targetX = h.originX;
    g.targetY = h.originY;
    if (t >= h.until || travel(g, navigation, T.walkSpeed, dt, t)) {
      g.speed = 0;
      cancelHearing(g, t, true);
    }
  }
  return true;
}
