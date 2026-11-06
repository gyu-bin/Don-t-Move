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

export interface SoundAttention {
  readonly x: number;
  readonly y: number;
  until: number;
  startedAt?: number;
  lookOffset?: number;
}

const AUDIBLE_STRENGTH = 0.14;
const INVESTIGATE_STRENGTH = 0.32;
const CLOSE_WALK_RANGE = 40;
export const CLOSE_WALK_CUE_SECONDS = 0.7;
const CLOSE_FOOTSTEP_REPEAT_SECONDS = 1.4;
const CLOSE_RUN_RANGE = 56;
const ATTENTION_MEMORY_SECONDS = 1.2;
const ATTENTION_LOOK_SECONDS = 0.48;
const ATTENTION_MIN_PAUSE = 0.42;
const MAX_EVENT_AGE = 0.2;
const WEAK_LOOK_SECONDS = 0.34;
const WEAK_LOOK_ANGLE = 22 * Math.PI / 180;
const STRONG_LOOK_SECONDS = 0.72;
const INVESTIGATE_SECONDS = 2.6;
const SWEEP_SECONDS = 0.95;
const RETURN_SECONDS = 3.2;
const PATROL_RECOVERY_SECONDS = 2.4;

export function behaviorOnlyHearing(missionId?: string): boolean {
  'worklet';
  return missionId === '01-01' || missionId === '01-03';
}

/** Visual evidence and existing guard assignments always own the guard first. */
export function canRespondToSound(g: GuardState): boolean {
  'worklet';
  return g.awareness === Awareness.Patrol && g.action === GuardAction.None &&
    !g.canSee && !g.hasLkp && g.suspicion === 0 && !g.localInvestigating && !g.localReturning;
}

/** One best unobstructed listener, with stable roster-order ties. Call only during stealth. */
export function offerFootstep(
  guards: GuardState[], sound: FootfallSound, navigation: Navigation, t: number, sensitivity = 1,
  opaqueBlockers?: number[], patrolPauseAttention = false,
): GuardState | undefined {
  'worklet';
  if (!Number.isFinite(t) || !Number.isFinite(sound.t) || sound.t > t || t - sound.t > MAX_EVENT_AGE ||
    !Number.isFinite(sound.x) || !Number.isFinite(sound.y) || !Number.isFinite(sound.gait) ||
    sound.gait <= Gait.Idle || sound.gait > Gait.Run ||
    !Number.isFinite(sound.strength) || sound.strength <= 0 || !Number.isFinite(sound.range) || sound.range <= 0 ||
    !Number.isFinite(sensitivity) || sensitivity <= 0) return;

  let listener: GuardState | undefined;
  let closeListener: GuardState | undefined;
  let loudest = AUDIBLE_STRENGTH;
  const closeRange = sound.gait === Gait.Walk ? Math.min(CLOSE_WALK_RANGE, sound.range * 0.58)
    : patrolPauseAttention && sound.gait === Gait.Run ? Math.min(CLOSE_RUN_RANGE, sound.range * 0.48) : 0;
  let nearest = closeRange;
  let investigationBusy = false;
  const rangeSquared = sound.range * sound.range;
  const strength = sound.strength * sensitivity;
  for (let i = 0; i < guards.length; i++) {
    const g = guards[i];
    // A second listener can acknowledge a close step while the patrol recovers.
    // Only one guard may break from patrol to respond at a time.
    if (g.hearing && (g.hearing.phase !== HearingPhase.None || t < g.hearing.readyAt)) {
      if (closeRange === 0) return;
      investigationBusy = true;
    }
    if (!canRespondToSound(g)) continue;
    const dx = sound.x - g.x;
    const dy = sound.y - g.y;
    const distanceSquared = dx * dx + dy * dy;
    if (!Number.isFinite(distanceSquared) || distanceSquared >= rangeSquared) continue;
    const distance = Math.sqrt(distanceSquared);
    const heardStrength = strength * (1 - distance / sound.range);
    const close = distance < nearest && (!g.hearing || g.hearing.phase === HearingPhase.None) &&
      (!g.soundAttention || t >= g.soundAttention.until) &&
      t - (g.closeFootstepHeardAt ?? -Infinity) >= CLOSE_FOOTSTEP_REPEAT_SECONDS;
    if ((heardStrength <= loudest && !close) || !clearSegment(g.x, g.y, sound.x, sound.y, navigation.blockers) ||
      (opaqueBlockers && !clearSegment(g.x, g.y, sound.x, sound.y, opaqueBlockers))) continue;
    if (heardStrength > loudest) {
      listener = g;
      loudest = heardStrength;
    }
    if (close) {
      nearest = distance;
      closeListener = g;
    }
  }
  if (listener && !investigationBusy) {
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
    if (listener.soundAttention) listener.soundAttention = undefined;
    return listener;
  }
  if (closeListener) {
    closeListener.closeFootstepHeardAt = t;
    if (patrolPauseAttention) closeListener.soundAttention = { x: sound.x, y: sound.y, until: t + ATTENTION_MEMORY_SECONDS };
  }
  return closeListener;
}

/** A short look inside the existing wait. The patrol heading and timing stay intact. */
export function patrolSoundLook(g: GuardState, n: Navigation, opaqueBlockers: number[], t: number): number {
  'worklet';
  const attention = g.soundAttention;
  if (!attention) return 0;
  if (t >= attention.until || !canRespondToSound(g)) {
    g.soundAttention = undefined;
    return 0;
  }
  if (g.wait <= 0 || g.speed > 0.01) {
    if (attention.startedAt !== undefined) g.soundAttention = undefined;
    return 0;
  }
  if (attention.startedAt === undefined) {
    if (g.wait < ATTENTION_MIN_PAUSE) return 0;
    if (!clearSegment(g.x, g.y, attention.x, attention.y, n.blockers) ||
        !clearSegment(g.x, g.y, attention.x, attention.y, opaqueBlockers)) {
      g.soundAttention = undefined;
      return 0;
    }
    const heading = Math.atan2(attention.y - g.y, attention.x - g.x);
    attention.lookOffset = clamp(wrapAngle(heading - g.baseFacing), -WEAK_LOOK_ANGLE, WEAK_LOOK_ANGLE);
    attention.startedAt = t;
    attention.until = t + Math.min(ATTENTION_LOOK_SECONDS, g.wait);
  }
  const progress = (t - attention.startedAt) / (attention.until - attention.startedAt);
  return (attention.lookOffset ?? 0) * Math.sin(Math.PI * progress);
}

function resetTravel(g: GuardState): void {
  'worklet';
  g.path = [];
  g.pathIndex = 0;
  g.repathAt = 0;
}

export function cancelHearing(g: GuardState, t: number, resumePatrol = false): void {
  'worklet';
  if (g.soundAttention) g.soundAttention = undefined;
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
