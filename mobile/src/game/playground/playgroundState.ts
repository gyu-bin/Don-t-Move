import { clamp, damp, turnToward } from '../core/math';
import { rightWalkTrialStride } from '../core/rightWalkTrial';
import { advancePlayerSpritePhase, GAIT_SPEED, gaitFromSpeed, strideCycleLength } from '../core/locomotion';
import { Gait } from '../core/types';
import { createGuardEvents, createGuardState } from '../guards/guardBrain';
import type { GuardEvents, GuardState } from '../guards/guardBrain';
import { stepGuards } from '../guards/guardSystem';
import { BODY } from '../guards/guardTuning';
import type { Navigation } from '../world/navigation';
import { moveWithCollision } from '../world/collision';
import type { CompiledStage } from '../world/compileStage';
import { stepTiltPlayer, stopPlayer } from '../input/tiltMovement';
import type { TiltMovement } from '../input/tiltMovement';
import { createMissionState, stepMission } from '../mission/mission';
import type { MissionState } from '../mission/mission';
import { createGuardPlayback, stepGuardPlayback } from '../../rendering/characters/guardAnimation';
import type { GuardPlayback } from '../../rendering/characters/guardAnimation';
import type { TheftContext } from '../guards/theftAlert';

/**
 * Visual Playground simulation (UI thread, mutated in place, no React state).
 *
 * Guards run the real perception/suspicion brain (game/guards). The player is
 * either the scripted DEMO loop or MANUAL: it walks toward the last touched
 * point at the selected gait, colliding and sliding against walls/cover, so
 * every detection case can be reproduced by hand.
 */

export interface PlayerState {
  spritePhase: number;
  x: number;
  y: number;
  facing: number;
  speed: number;
  vx: number;
  vy: number;
  inputReset: number;
  gait: number;
  phase: number;
  /** Distance walked (world units) — drives sprite clips with their own stride. */
  dist: number;
  wp: number;
  pause: number;
  hasTarget: boolean;
  tx: number;
  ty: number;
}

export interface PlaygroundState {
  theft: TheftContext;
  t: number;
  player: PlayerState;
  guards: GuardState[];
  guardPlayback: GuardPlayback[];
  events: GuardEvents;
  cam: { x: number; y: number };
  /** -1 = scripted demo; 0..3 = manual control at that gait. */
  playerMode: number;
  /** false = guards hold position (still see, turn and react). */
  patrol: boolean;
  /** Last consumed touch sequence number. */
  touchSeq: number;
  /** Development input replay only; never overrides guard behavior. */
  replayLeg: number;
  mission: MissionState;
}

export const PLAYER_RADIUS = BODY.playerRadius;

/** Player demo loop through the gallery; gait per leg of the route (tiles). */
const DEMO_PATH = [
  { x: 6.5, y: 14.2, gait: Gait.Walk, pause: 0.9 },
  { x: 6.5, y: 10.3, gait: Gait.Walk, pause: 0 },
  { x: 4.6, y: 10.3, gait: Gait.Sneak, pause: 0.6 },
  { x: 4.6, y: 6.8, gait: Gait.Sneak, pause: 0 },
  { x: 8.4, y: 6.8, gait: Gait.Run, pause: 0.8 },
  { x: 8.4, y: 10.3, gait: Gait.Walk, pause: 0 },
  { x: 6.5, y: 10.3, gait: Gait.Walk, pause: 0 },
];

export function createPlaygroundState(stage: CompiledStage,guardStrides?:number[][]): PlaygroundState {
  const sp = stage.playerSpawn;
  return {
    theft: { empty:false,x:stage.objective.x,y:stage.objective.y,
      posts:stage.guards.map(g=>g.route.map(p=>({x:p.x,y:p.y}))) },
    t: 0,
    player: {
      spritePhase: 0,
      x: sp.x,
      y: sp.y,
      facing: sp.facing,
      speed: 0,
      vx: 0,
      vy: 0,
      inputReset: 0,
      gait: 0,
      phase: 0,
      dist: 0,
      wp: 1,
      pause: 1.2,
      hasTarget: false,
      tx: sp.x,
      ty: sp.y,
    },
    guards: stage.guards.map((g, i) => createGuardState(g, (i * 0.37) % 1)),
    guardPlayback: stage.guards.map((g) => createGuardPlayback(createGuardState(g),guardStrides)),
    events: createGuardEvents(),
    cam: { x: sp.x, y: sp.y },
    playerMode: -1,
    patrol: true,
    touchSeq: 0,
    replayLeg: -1,
    mission: createMissionState(stage.def.objective ? stage.objective : undefined, stage.def.exit ? stage.exit : undefined),
  };
}

function advanceGait(p: PlayerState, dt: number): void {
  'worklet';
  p.gait += (gaitFromSpeed(p.speed) - p.gait) * damp(14, dt);
  p.phase = (p.phase + (p.speed * dt) / strideCycleLength(p.gait)) % 1;
  p.dist += p.speed * dt;
}

function stepPlayer(s: PlaygroundState, dt: number, tile: number, blockers: number[]): void {
  'worklet';
  const p = s.player;
  let tx = p.tx;
  let ty = p.ty;
  let targetSpeed = 0;
  if (s.playerMode < 0) {
    const wp = DEMO_PATH[p.wp];
    tx = wp.x * tile;
    ty = wp.y * tile;
    if (p.pause > 0) p.pause -= dt;
    else targetSpeed = GAIT_SPEED[wp.gait];
  } else if (p.hasTarget) {
    targetSpeed = GAIT_SPEED[s.playerMode];
  }

  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) {
    targetSpeed = 0;
    if (s.playerMode < 0 && p.pause <= 0) {
      p.pause = DEMO_PATH[p.wp].pause;
      p.wp = (p.wp + 1) % DEMO_PATH.length;
    } else if (s.playerMode >= 0) {
      p.hasTarget = false;
    }
  }
  // Soft acceleration, fast precise stop.
  const a = targetSpeed > p.speed ? 320 : 700;
  p.speed += clamp(targetSpeed - p.speed, -a * dt, a * dt);
  const bx = p.x, by = p.y;
  if (dist > 0.5 && p.speed > 0) {
    p.facing = turnToward(p.facing, Math.atan2(dy, dx), 10, dt);
    const move = Math.min(dist, p.speed * dt);
    moveWithCollision(p, (dx / dist) * move, (dy / dist) * move, PLAYER_RADIUS, blockers);
  }
  // Same odometer contract as Tilt: a partial wall slide must not count the
  // rejected movement, and a fully blocked body must not keep stepping.
  p.vx = (p.x-bx)/Math.max(dt,1e-6);
  p.vy = (p.y-by)/Math.max(dt,1e-6);
  p.speed = Math.hypot(p.vx,p.vy);
  advanceGait(p, dt);
  p.spritePhase = advancePlayerSpritePhase(p.spritePhase, p.speed * dt, p.speed, rightWalkTrialStride(p.speed, p.facing));
}

export function stepPlayground(
  s: PlaygroundState,
  dt: number,
  tile: number,
  viewW: number,
  viewH: number,
  bounds: { x: number; y: number; w: number; h: number },
  movementBlockers: number[],
  visionBlockers: number[],
  navigation: Navigation,
  tilt?: TiltMovement,
): void {
  'worklet';
  if (s.events.caught || s.mission.complete) return;
  if (tilt?.paused) { stopPlayer(s.player); return; }
  s.t += dt;
  if (tilt) stepTiltPlayer(s.player, tilt, dt, movementBlockers);
  else stepPlayer(s, dt, tile, movementBlockers);
  const p = s.player;
  // Crossing an active Exit completes the escape before this frame's contact pass.
  stepMission(s.mission, p.x, p.y, false);
  s.theft.empty=s.mission.enabled && s.mission.treasure;
  if (!s.mission.complete) stepGuards(s.guards, p, visionBlockers, navigation, dt, s.events, s.t, s.patrol,1,s.theft);
  for (let i=0;i<s.guards.length;i++) stepGuardPlayback(s.guardPlayback[i],s.guards[i],dt);

  // Follow camera, clamped so nothing outside the map shows.
  const k = damp(5, dt);
  s.cam.x += (p.x - viewW / 2 - s.cam.x) * k;
  s.cam.y += (p.y - viewH * 0.52 - s.cam.y) * k;
  s.cam.x =
    bounds.w <= viewW
      ? bounds.x + (bounds.w - viewW) / 2
      : clamp(s.cam.x, bounds.x, bounds.x + bounds.w - viewW);
  s.cam.y =
    bounds.h <= viewH
      ? bounds.y + (bounds.h - viewH) / 2
      : clamp(s.cam.y, bounds.y, bounds.y + bounds.h - viewH);
}
