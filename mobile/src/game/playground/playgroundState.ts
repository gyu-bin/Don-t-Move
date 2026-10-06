import { createDoor, doorBlockers, stepDoors } from '../doors/doorSystem';
import { navigationWithDoors } from '../doors/doorNavigation';
import type { DoorActor, DoorRuntime } from '../doors/doorTypes';
import { ESCAPE_TIMER_SECONDS } from '../guards/guardPhase';
import {createSecurityCamera,stepSecurityCameras} from '../security/cctv';
import type {SecurityCameraState} from '../security/cctv';
import { clamp, damp, turnToward } from '../core/math';
import { advancePlayerSpritePhase, GAIT_SPEED, gaitFromSpeed, playerLocoStride, stablePlayerSpriteGait, strideCycleLength } from '../core/locomotion';
import { Gait } from '../core/types';
import { createGuardEvents, createGuardState } from '../guards/guardBrain';
import type { GuardEvents, GuardState } from '../guards/guardBrain';
import { stepGuards } from '../guards/guardSystem';
import { BODY } from '../guards/guardTuning';
import type { Navigation } from '../world/navigation';
import { clearSegment, findPath } from '../world/navigation';
import { moveWithCollision } from '../world/collision';
import type { CompiledStage } from '../world/compileStage';
import { stepTiltPlayer, stopPlayer } from '../input/tiltMovement';
import { HIGH_SECURITY_ALARM_SECONDS } from '../guards/theftAlert';
import type { TiltMovement } from '../input/tiltMovement';
import { createMissionState, stepMission } from '../mission/mission';
import type { MissionState } from '../mission/mission';
import { createGuardPlayback, stepGuardPlayback } from '../../rendering/characters/guardAnimation';
import type { GuardPlayback } from '../../rendering/characters/guardAnimation';
import type { TheftContext } from '../guards/theftAlert';
import { createPlayableBoundary, enforcePlayableStage, isPlayableBody } from '../world/museumBoundary';
import type { PlayableBoundary } from '../world/museumBoundary';

/**
 * Visual Playground simulation (UI thread, mutated in place, no React state).
 *
 * Guards run the real perception/suspicion brain (game/guards). The player is
 * either the scripted DEMO loop or MANUAL: it walks toward the last touched
 * point at the selected gait, colliding and sliding against walls/cover, so
 * every detection case can be reproduced by hand.
 */

export interface PlayerState {
  lastValidX?: number;
  lastValidY?: number;
  /** Sign of the axis direction blocked by a surface last frame (wall slide); 0/undefined when free. */
  contactX?: number;
  contactY?: number;
  spritePhase: number;
  x: number;
  y: number;
  facing: number;
  speed: number;
  vx: number;
  vy: number;
  inputReset: number;
  gait: number;
  visualGait: number;
  phase: number;
  /** Distance walked (world units) — drives sprite clips with their own stride. */
  dist: number;
  wp: number;
  pause: number;
  hasTarget: boolean;
  tx: number;
  ty: number;
  /** Tap-to-move only: intended speed, kept apart from the measured `speed` so a wall slide does not stall the walk. */
  drive?: number;
  /** Tap-to-move only: way round obstacles to the tapped point, flattened [x,y,…], and the next corner on it. */
  path?: number[];
  pathIndex?: number;
  pathTx?: number;
  pathTy?: number;
  pathAt?: number;
}

export interface PlaygroundState {
  doors?: DoorRuntime[];
  lockdownDoorIds?: string[];
  effectiveMovementBlockers?: number[];
  effectiveVisionBlockers?: number[];
  effectiveNavigation?: Navigation;
  doorGeometryRevision?: number;
  theft: TheftContext;
  securityCameras:SecurityCameraState[];
  boundary?: PlayableBoundary;
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
    ...(stage.doors?.length ? {
      doors:stage.doors.map(createDoor),lockdownDoorIds:(stage.def.lockdownDoors??[]).slice(),doorGeometryRevision:-1,
    } : {}),
    boundary: stage.def.chapter===1 ? createPlayableBoundary(stage) : undefined,
    securityCameras:(stage.cameras??[]).map(createSecurityCamera),
    theft: { empty:false,x:stage.objective.x,y:stage.objective.y,missionId:stage.def.id,
      ...(stage.def.objective?.highSecurity ? {alarmDelay:HIGH_SECURITY_ALARM_SECONDS,alarmAge:0} : {}),
      posts:stage.guards.map(g=>g.theftPosts ?? g.route.map(p=>({x:p.x,y:p.y}))),
      sectors:stage.guards.map(g=>g.theftSearchSectors??[]),
      ...(stage.def.chapter===1 || stage.def.id==='02-10' || stage.guards.some(g=>g.theftSearchSectors?.length||g.theftPosts?.length) ? {roles:stage.guards.map(g=>g.theftRole ?? 'zone')} : {}) },
    t: 0,
    player: {
      lastValidX: sp.x,
      lastValidY: sp.y,
      spritePhase: 0,
      x: sp.x,
      y: sp.y,
      facing: sp.facing,
      speed: 0,
      vx: 0,
      vy: 0,
      inputReset: 0,
      gait: 0,
      visualGait: 0,
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

function stepPlayer(s: PlaygroundState, dt: number, tile: number, blockers: number[], nav?: Navigation): void {
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
    // Tap-to-move walks round what is in the way. Steering straight at the tapped point pressed the body
    // into the first wall or table corner between them and left it there.
    // A clear line is walked directly, exactly as before; a path is only used when the body cannot get there
    // in a straight line, and only if it really ends at the tapped point.
    if (nav) {
      if (p.pathTx !== p.tx || p.pathTy !== p.ty || s.t >= (p.pathAt ?? 0) || !p.path) {
        let path: number[] = [];
        if (!clearSegment(p.x, p.y, p.tx, p.ty, blockers, PLAYER_RADIUS)) {
          path = findPath(nav, p.x, p.y, p.tx, p.ty);
          const n = path.length;
          if (n < 4 || Math.hypot(path[n - 2] - p.tx, path[n - 1] - p.ty) > 1) path = [];
        }
        p.path = path; p.pathIndex = 0; p.pathTx = p.tx; p.pathTy = p.ty; p.pathAt = s.t + 0.4;
      }
      const path = p.path;
      let k = p.pathIndex ?? 0;
      while (k < path.length - 2 && Math.hypot(path[k] - p.x, path[k + 1] - p.y) < 7) k += 2;
      p.pathIndex = k;
      if (path.length >= 2) { tx = path[k]; ty = path[k + 1]; }
    }
  }
  const lastLeg = !p.hasTarget || s.playerMode < 0 || !p.path || p.path.length < 2 || (p.pathIndex ?? 0) >= p.path.length - 2;

  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2 && lastLeg) {
    targetSpeed = 0;
    if (s.playerMode < 0 && p.pause <= 0) {
      p.pause = DEMO_PATH[p.wp].pause;
      p.wp = (p.wp + 1) % DEMO_PATH.length;
    } else if (s.playerMode >= 0) {
      p.hasTarget = false;
    }
  }
  // Soft acceleration, fast precise stop. The intended speed is kept in `drive`: `speed` is overwritten below
  // with the distance actually covered, and feeding that back in made every slide along a wall slower than the last.
  const drive0 = p.drive ?? p.speed;
  const a = targetSpeed > drive0 ? 320 : 700;
  const drive = drive0 + clamp(targetSpeed - drive0, -a * dt, a * dt);
  p.drive = drive;
  const bx = p.x, by = p.y;
  if (dist > 0.5 && drive > 0) {
    const move = lastLeg ? Math.min(dist, drive * dt) : drive * dt;
    moveWithCollision(p, (dx / dist) * move, (dy / dist) * move, PLAYER_RADIUS, blockers);
  }
  // Same odometer contract as Tilt: a partial wall slide must not count the
  // rejected movement, and a fully blocked body must not keep stepping.
  p.vx = (p.x-bx)/Math.max(dt,1e-6);
  p.vy = (p.y-by)/Math.max(dt,1e-6);
  p.speed = Math.hypot(p.vx,p.vy);
  if (p.speed > 0.5) p.facing = turnToward(p.facing, Math.atan2(p.vy, p.vx), 10, dt);
  advanceGait(p, dt);
  p.visualGait = stablePlayerSpriteGait(p.speed, p.visualGait);
  p.spritePhase = advancePlayerSpritePhase(p.spritePhase, p.speed * dt, p.speed, playerLocoStride(p.visualGait, p.facing), p.visualGait);
}

/** Geometry changes invalidate existing guard paths before movement/perception. */
function refreshDoorGeometry(s:PlaygroundState,movement:number[],vision:number[],baseNav:Navigation):void {
  'worklet';
  const geometry=doorBlockers(s.doors??[],movement,vision);
  s.effectiveMovementBlockers=geometry.movementBlockers;
  s.effectiveVisionBlockers=geometry.visionBlockers;
  s.effectiveNavigation=navigationWithDoors(baseNav,doorBlockers(s.doors??[]).movementBlockers);
  s.doorGeometryRevision=(s.doorGeometryRevision??-1)+1;
  for(let i=0;i<s.guards.length;i++) {
    const guard=s.guards[i];guard.path=[];guard.pathIndex=0;guard.repathAt=0;
  }
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
  if (!Number.isFinite(dt) || dt <= 0) {
    stopPlayer(s.player);
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[COLLISION] invalid simulation delta');
    return;
  }
  const motion = s.player;
  if (![motion.x,motion.y,motion.vx,motion.vy,motion.speed,motion.facing,motion.phase,motion.dist,motion.spritePhase,motion.gait,motion.visualGait].every(Number.isFinite)) {
    motion.x = Number.isFinite(motion.lastValidX) ? motion.lastValidX! : 0;
    motion.y = Number.isFinite(motion.lastValidY) ? motion.lastValidY! : 0;
    motion.facing = Number.isFinite(motion.facing) ? motion.facing : 0;
    motion.phase = motion.spritePhase = 0;
    motion.dist = Number.isFinite(motion.dist) ? motion.dist : 0;
    stopPlayer(motion);
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[COLLISION] restored invalid player motion');
    return;
  }
  if (tilt?.paused) { stopPlayer(s.player); return; }
  s.t += dt;
  const p = s.player;
  // First tick builds effective geometry for initially CLOSED authored doors.
  if (s.doors?.length && s.doorGeometryRevision === -1) refreshDoorGeometry(s,movementBlockers,visionBlockers,navigation);
  const effectiveMovement=s.effectiveMovementBlockers??movementBlockers;
  const bx=p.x, by=p.y, oldGait=p.gait, oldPhase=p.phase, oldDist=p.dist,
    oldSprite=p.spritePhase, oldVisual=p.visualGait, oldFacing=p.facing;
  if (tilt) stepTiltPlayer(s.player, tilt, dt, effectiveMovement);
  else stepPlayer(s, dt, tile, effectiveMovement, s.effectiveNavigation ?? navigation);
  if (s.boundary && enforcePlayableStage(p,bx,by,PLAYER_RADIUS,s.boundary)) {
    p.gait=oldGait;p.phase=oldPhase;p.dist=oldDist;p.spritePhase=oldSprite;p.visualGait=oldVisual;p.facing=oldFacing;
    if (!isPlayableBody(bx,by,PLAYER_RADIUS,s.boundary)) stopPlayer(p);
    else {
      p.vx=(p.x-bx)/Math.max(dt,1e-6);p.vy=(p.y-by)/Math.max(dt,1e-6);p.speed=Math.hypot(p.vx,p.vy);
      if(p.speed>0.5)p.facing=turnToward(p.facing,Math.atan2(p.vy,p.vx),10,dt);
      advanceGait(p,dt);
      p.visualGait=stablePlayerSpriteGait(p.speed,p.visualGait);
      p.spritePhase=advancePlayerSpritePhase(p.spritePhase,p.speed*dt,p.speed,playerLocoStride(p.visualGait,p.facing),p.visualGait);
    }
  }
  p.lastValidX = p.x; p.lastValidY = p.y;
  // Crossing an active Exit completes the escape before this frame's contact pass.
  stepMission(s.mission, p.x, p.y, false);
  s.theft.empty=s.mission.enabled && s.mission.treasure;
  if (!s.mission.complete && s.doors?.length) {
    const close=s.events.theftAlert && s.events.theftActivatedAt>=0 &&
      s.t-s.events.theftActivatedAt>=ESCAPE_TIMER_SECONDS;
    const actors:DoorActor[]=[{x:p.x,y:p.y,radius:PLAYER_RADIUS}];
    for (let i=0;i<s.guards.length;i++) actors.push({x:s.guards[i].x,y:s.guards[i].y,radius:BODY.guardRadius});
    // Current post-movement bodies are checked immediately before commit.
    const changed=stepDoors(s.doors,dt,close?(s.lockdownDoorIds??[]):[],actors);
    if (changed) refreshDoorGeometry(s,movementBlockers,visionBlockers,navigation);
  }
  const effectiveVision=s.effectiveVisionBlockers??visionBlockers;
  const effectiveNav=s.effectiveNavigation??navigation;
  if (!s.mission.complete) stepSecurityCameras(s.securityCameras,p,effectiveVision,s.events,dt,s.t);
  if (!s.mission.complete) stepGuards(s.guards, p, effectiveVision, effectiveNav, dt, s.events, s.t, s.patrol,1,s.theft);
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

