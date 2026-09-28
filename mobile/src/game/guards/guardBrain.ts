import { clamp, damp, turnToward, wrapAngle } from '../core/math';
import { gaitFromSpeed, gaitLerp, strideCycleLength } from '../core/locomotion';
import { Awareness, GuardAction } from '../core/types';
import type { CompiledGuard } from '../world/compileStage';
import { findPath } from '../world/navigation';
import type { Navigation } from '../world/navigation';
import { travel } from './guardTravel';
import { castRay } from '../world/visibility';
import { GUARD_TUNING as T } from './guardTuning';
import { buildVisionFan, createFanBuffers, pointVisible } from './guardVision';
import type { VisionFan } from './guardVision';

/**
 * Guard perception + reaction.
 *
 * `facing` is the ONLY direction a guard has. Sprite frame, vision cone and
 * detection all read it; nothing else stores a direction.
 *  - walking:  facing = direction of velocity (plus a bounded "glance" toward
 *              the player at 25–60 % suspicion — still one value for all three)
 *  - turning:  facing rotates at a finite rate (no snaps); the fan is rebuilt
 *              from the new facing every step
 *
 * Order per step: move/turn → rebuild fan from the final pose → perceive with
 * that same fan → update suspicion/state. The renderer then draws that fan.
 */
export interface GuardState extends VisionFan {
  semanticPatrol: boolean;
  patrolProgress: number;
  patrolProgressAt: number;
  patrolBlockedUntil: number[];
  patrolRecoveries: number;
  id: string;
  speed: number;
  gait: number;
  phase: number;
  /** Distance walked (world units) — drives sprite clips with their own stride. */
  dist: number;
  // patrol
  route: { x: number; y: number; wait: number; look: number; turnDuration?: number }[];
  lookTurnRate: number;
  escapePatrol?: { pace?: number; waitDuration?: number; lookDirection?: number };
  pingpong: boolean;
  roaming: boolean;
  roamVisits: number;
  roamPrevious: number;
  localInvestigating: boolean;
  localArrived: boolean;
  localLookT: number;
  localReturning: boolean;
  routeIdx: number;
  routeDir: number;
  wait: number;
  delay: number;
  pace: number;
  /** Facing to hold while waiting at a patrol point. */
  lookTarget: number;
  /** Direction the patrol wants (travel heading, or the look direction while waiting). */
  baseFacing: number;
  /** Bounded offset toward the player while walking suspicious. facing = baseFacing + glance. */
  glance: number;
  // perception (this frame)
  canSee: boolean;
  samplesSeen: number;
  /** Body sample points tested this frame [x,y]×3 and their visibility (debug). */
  samples: number[];
  sampleSeen: boolean[];
  los: boolean;
  distToPlayer: number;
  angleToPlayer: number;
  // suspicion / memory
  suspicion: number;
  unseenT: number;
  hasLkp: boolean;
  lkpX: number;
  lkpY: number;
  // state
  awareness: number;
  stateT: number;
  alertAge: number;
  whistleT: number;
  whistled: boolean;
  searchBase: number;
  action: number;
  actionT: number;
  homeX: number;
  homeY: number;
  homeFacing: number;
  targetX: number;
  targetY: number;
  path: number[];
  pathIndex: number;
  pathTargetX: number;
  pathTargetY: number;
  repathAt: number;
  pathPlans: number;
  knownRevision: number;
  searchX: number;
  searchY: number;
  searchIndex: number;
  searchWait: number;
  returnIndex: number;
}

export interface PlayerView {
  x: number;
  y: number;
  /** Continuous gait 0..3 derived from real speed. */
  gait: number;
}

export interface GuardEvents {
  theftAlert: boolean;
  theftGuard: string;
  theftAge: number;
  theftSound: boolean;
  theftRevision: number;
  whistleCount: number;
  alertCount: number;
  globalAlert: boolean;
  globalX: number;
  globalY: number;
  globalT: number;
  globalRevision: number;
  sawPlayer: boolean;
  whistleGuard: string;
  caught: boolean;
  caughtBy: string;
}

export function createGuardEvents(): GuardEvents {
  return { theftAlert:false, theftGuard:'', theftAge:0, theftSound:false, theftRevision:0,
    whistleCount: 0, alertCount: 0, globalAlert: false, globalX: 0, globalY: 0, globalT: 0,
    globalRevision: 0, sawPlayer: false, whistleGuard: '', caught: false, caughtBy: '' };
}

export function createGuardState(g: CompiledGuard, phase = 0): GuardState {
  const { fan, fanAng } = createFanBuffers();
  return {
    semanticPatrol: !!g.semanticPatrol,
    patrolProgress: Infinity, patrolProgressAt: -1,
    patrolBlockedUntil: g.route.map(()=>0), patrolRecoveries: 0,
    id: g.id,
    x: g.x,
    y: g.y,
    facing: g.facing,
    visionRange: g.visionRange,
    visionHalfAngle: g.visionHalfAngle,
    fan,
    fanAng,
    fanCount: 0,
    speed: 0,
    gait: 0,
    phase,
    dist: phase * 40,
    route: g.route,
    lookTurnRate: T.turnRatePatrol,
    escapePatrol: g.escapePatrol,
    pingpong: g.routeMode !== 'loop',
    roaming: g.routeMode === 'roaming', roamVisits: 0, roamPrevious: -1,
    localInvestigating: false, localArrived: false, localLookT: 0, localReturning: false,
    routeIdx: g.route.length > 1 ? 1 : 0,
    routeDir: 1,
    wait: g.route[0]?.wait ?? 0,
    delay: g.startDelay,
    pace: g.pace,
    lookTarget: g.facing,
    baseFacing: g.facing,
    glance: 0,
    canSee: false,
    samplesSeen: 0,
    samples: [0, 0, 0, 0, 0, 0],
    sampleSeen: [false, false, false],
    los: false,
    distToPlayer: 0,
    angleToPlayer: 0,
    suspicion: 0,
    unseenT: 99,
    hasLkp: false,
    lkpX: 0,
    lkpY: 0,
    awareness: Awareness.Patrol,
    stateT: 0,
    alertAge: 0,
    whistleT: 0,
    whistled: false,
    searchBase: g.facing,
    action: GuardAction.None,
    actionT: 0,
    homeX: g.x, homeY: g.y, homeFacing: g.facing,
    targetX: g.x, targetY: g.y,
    path: [], pathIndex: 0, pathTargetX: g.x, pathTargetY: g.y, repathAt: 0, pathPlans: 0,
    knownRevision: -1, searchX: g.x, searchY: g.y, searchIndex: 0, searchWait: 0, returnIndex: -1,
  };
}

// ---------------------------------------------------------------- perception

/** Samples the player's body (centre + left/right across the line of sight). */
function perceive(g: GuardState, p: PlayerView, blockers: number[]): void {
  'worklet';
  const dx = p.x - g.x;
  const dy = p.y - g.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  g.distToPlayer = d;
  g.angleToPlayer = wrapAngle(Math.atan2(dy, dx) - g.facing);
  const nx = d > 1e-6 ? -dy / d : 0;
  const ny = d > 1e-6 ? dx / d : 0;
  const w = T.playerSampleHalfWidth;
  let seen = 0;
  for (let i = 0; i < 3; i++) {
    const k = i === 0 ? 0 : i === 1 ? w : -w;
    const sx = p.x + nx * k;
    const sy = p.y + ny * k;
    g.samples[i * 2] = sx;
    g.samples[i * 2 + 1] = sy;
    const v = pointVisible(g, sx, sy, blockers);
    g.sampleSeen[i] = v;
    if (v) seen++;
  }
  g.samplesSeen = seen;
  g.canSee = seen > 0;
  // Debug only: raw centre line of sight, ignoring the cone.
  g.los = d < 1 || castRay(g.x, g.y, dx / d, dy / d, d, blockers) >= d - 0.5;
}

/** Read-only perception pass, also used before and after coordinated movement. */
export function observeGuard(g: GuardState, p: PlayerView, blockers: number[]): void {
  'worklet';
  buildVisionFan(g, blockers);
  perceive(g, p, blockers);
}

/** Suspicion gain per second for the current perception (0 when not seen). */
export function suspicionGain(g: GuardState, playerGait: number, difficulty = 1): number {
  'worklet';
  if (!g.canSee) return 0;
  let movement = gaitLerp(T.movementFactor as unknown as number[], playerGait);
  if (g.distToPlayer <= T.closeDetectionRadius) movement = Math.max(movement, T.closeMovementFloor);
  const dn = clamp(g.distToPlayer / g.visionRange, 0, 1);
  const distance = T.distanceFactorNear + (T.distanceFactorFar - T.distanceFactorNear) * dn;
  const cn = clamp(Math.abs(g.angleToPlayer) / g.visionHalfAngle, 0, 1);
  const cone = 1 + (T.coneFactorEdge - 1) * cn;
  const visibleBodyRatio = g.samplesSeen / 3;
  const visibility = T.visibilityFactorFloor + (1 - T.visibilityFactorFloor) * visibleBodyRatio;
  return T.baseGain * difficulty * movement * distance * cone * visibility;
}

// ---------------------------------------------------------------- behaviour

function patrolMove(g: GuardState, dt: number, speedScale: number): void {
  'worklet';
  if (g.delay > 0) {
    g.delay -= dt;
    g.speed = 0;
    return;
  }
  let targetSpeed = 0;
  if (g.wait > 0) {
    g.wait -= dt;
    g.baseFacing = turnToward(g.baseFacing, g.lookTarget, g.lookTurnRate, dt);
  } else if (g.route.length > 1) {
    const pt = g.route[g.routeIdx];
    g.targetX = pt.x; g.targetY = pt.y;
    const dx = pt.x - g.x;
    const dy = pt.y - g.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const heading = Math.atan2(dy, dx);
    if (Math.abs(wrapAngle(heading - g.baseFacing)) > 0.01) {
      // Turn in place until aligned; only then walk, so facing == velocity.
      g.baseFacing = turnToward(g.baseFacing, heading, T.turnRatePatrol, dt);
    } else {
      g.baseFacing = heading;
      targetSpeed = T.walkSpeed * g.pace * speedScale;
    }
    // A turn is stationary: residual speed must not drift off the authored segment.
    if (targetSpeed === 0) g.speed = 0;
    const move = Math.min(dist, g.speed * dt);
    if (dist > 0.01 && move > 0) {
      g.x += dx / dist * move;
      g.y += dy / dist * move;
    }
    if (dist < 1.5) {
      g.wait = pt.wait;
      g.lookTarget = Number.isNaN(pt.look) ? g.baseFacing : pt.look;
      g.lookTurnRate = Math.abs(wrapAngle(g.lookTarget - g.baseFacing)) / Math.max(0.01, pt.turnDuration ?? 0.7);
      g.wait = Math.max(g.wait, pt.turnDuration ?? 0);
      g.speed = 0;
      targetSpeed = 0;
      if (g.pingpong) {
        if (g.routeIdx + g.routeDir >= g.route.length || g.routeIdx + g.routeDir < 0)
          g.routeDir = -g.routeDir;
        g.routeIdx += g.routeDir;
      } else {
        g.routeIdx = (g.routeIdx + 1) % g.route.length;
      }
    }
  }
  const a = targetSpeed > g.speed ? T.accel : T.decel;
  g.speed += clamp(targetSpeed - g.speed, -a * dt, a * dt);
}

function stand(g: GuardState, dt: number): void {
  'worklet';
  g.speed = Math.max(0, g.speed - T.decel * dt);
}

/** Direct control of facing (notice / alert / search); keeps patrol intent in sync. */
function faceToward(g: GuardState, target: number, rate: number, dt: number): void {
  'worklet';
  g.facing = turnToward(g.facing, target, rate, dt);
  g.baseFacing = g.facing;
  g.glance = 0;
}

function angleToLkp(g: GuardState): number {
  'worklet';
  return Math.atan2(g.lkpY - g.y, g.lkpX - g.x);
}

/** Deterministic near/far alternation, excluding current and previous stops. */
export function chooseRoamingPoint(g: GuardState): number {
  'worklet';
  let chosen=-1, score=g.roamVisits%2===0?Infinity:-Infinity;
  for(let i=0;i<g.route.length;i++){
    if(i===g.routeIdx || (g.route.length>2 && i===g.roamPrevious))continue;
    const distance=Math.hypot(g.route[i].x-g.x,g.route[i].y-g.y);
    if((g.roamVisits%2===0 && distance<score)||(g.roamVisits%2!==0 && distance>score)){
      chosen=i;score=distance;
    }
  }
  return chosen<0?g.routeIdx:chosen;
}

/** Verify the exact authored anchor, not A*'s nearest reachable fallback. */
function anchorPath(g:GuardState,n:Navigation,i:number):number[] {
  'worklet';
  const p=g.route[i],path=findPath(n,g.x,g.y,p.x,p.y);
  return path.length>=2 && Math.hypot(path[path.length-2]-p.x,path[path.length-1]-p.y)<1 ? path : [];
}

export function nearestPatrolAnchor(g:GuardState,n:Navigation):number {
  'worklet';
  let best=Infinity,index=g.routeIdx;
  for(let i=0;i<g.route.length;i++){
    const path=anchorPath(g,n,i);if(!path.length)continue;
    let distance=0,x=g.x,y=g.y;
    for(let k=0;k<path.length;k+=2){distance+=Math.hypot(path[k]-x,path[k+1]-y);x=path[k];y=path[k+1];}
    if(distance<best){best=distance;index=i;}
  }
  return index;
}

function nextAnchor(g:GuardState,n:Navigation,t:number):number {
  'worklet';
  let best=-1,score=-Infinity;
  for(let offset=1;offset<g.route.length;offset++){
    const i=(g.routeIdx+offset)%g.route.length;
    if(g.patrolBlockedUntil[i]>t || (g.route.length>2&&i===g.roamPrevious))continue;
    const distance=Math.hypot(g.route[i].x-g.x,g.route[i].y-g.y);
    if(distance<24 || !anchorPath(g,n,i).length)continue;
    // Fixed tours retain author order; roaming alternates short/long legs,
    // but only inside this guard's explicit assigned anchor list.
    const rank=g.roaming ? (g.roamVisits%2===0?-distance:distance) : -offset;
    if(rank>score){best=i;score=rank;}
  }
  return best;
}

function semanticPatrolMove(g:GuardState,n:Navigation,dt:number,t:number,scale:number):void {
  'worklet';
  if(g.delay>0){g.delay-=dt;g.speed=0;g.patrolProgressAt=-1;return;}
  if(g.wait>0){
    g.wait=Math.max(0,g.wait-dt);g.speed=0;
    faceToward(g,g.lookTarget,g.lookTurnRate,dt);g.patrolProgressAt=-1;return;
  }
  const pt=g.route[g.routeIdx];if(!pt){g.speed=0;return;}
  g.targetX=pt.x;g.targetY=pt.y;
  const arrived=travel(g,n,T.walkSpeed*g.pace*scale,dt,t);
  if(arrived && Math.hypot(g.x-pt.x,g.y-pt.y)<=T.arrivalDistance+1){
    g.wait=clamp(pt.wait,0.8,2.5);g.speed=0;
    g.lookTarget=Number.isNaN(pt.look)?g.facing:pt.look;
    g.lookTurnRate=Math.abs(wrapAngle(g.lookTarget-g.facing))/Math.max(0.8,pt.turnDuration??1.1);
    const next=nextAnchor(g,n,t);
    if(next>=0){g.roamPrevious=g.routeIdx;g.routeIdx=next;g.roamVisits++;}
    g.path=[];g.repathAt=0;g.patrolProgressAt=-1;return;
  }
  // Remaining path length detects orbiting too: distance travelled alone cannot.
  let remaining=0,x=g.x,y=g.y;
  for(let k=g.pathIndex;k<g.path.length;k+=2){remaining+=Math.hypot(g.path[k]-x,g.path[k+1]-y);x=g.path[k];y=g.path[k+1];}
  remaining+=Math.hypot(pt.x-x,pt.y-y);
  if(g.patrolProgressAt<0 || remaining<g.patrolProgress-10){g.patrolProgress=remaining;g.patrolProgressAt=t;}
  if(t-g.patrolProgressAt>=4){
    g.patrolBlockedUntil[g.routeIdx]=t+20;
    const next=nextAnchor(g,n,t);
    if(next>=0){g.roamPrevious=g.routeIdx;g.routeIdx=next;g.patrolRecoveries++;}
    g.path=[];g.repathAt=t;g.speed=0;g.patrolProgressAt=-1;
  }
}

function roamingMove(g: GuardState,n: Navigation,dt:number,t:number,scale:number):void {
  'worklet';
  if(g.delay>0){g.delay-=dt;g.speed=0;return;}
  if(g.wait>0){
    g.wait-=dt;g.speed=0;
    const look=g.lookTarget+Math.sin((3-g.wait)*2.1)*0.55;
    faceToward(g,look,T.turnRateNotice,dt);return;
  }
  const pt=g.route[g.routeIdx];if(!pt){g.speed=0;return;}
  g.targetX=pt.x;g.targetY=pt.y;
  if(travel(g,n,T.walkSpeed*g.pace*scale,dt,t)){
    g.wait=1+(g.roamVisits%3);
    g.lookTarget=Number.isNaN(pt.look)?g.facing:pt.look;
    const next=chooseRoamingPoint(g);
    g.roamPrevious=g.routeIdx;g.routeIdx=next;g.roamVisits++;
    g.path=[];
  }
}

/** Personal LKP, never the hidden player's current coordinates. */
function investigateSuspicion(g:GuardState,n:Navigation,dt:number,t:number):void {
  'worklet';
  if(!g.localInvestigating){g.path=[];g.repathAt=0;g.localInvestigating=true;g.localArrived=false;g.localLookT=0;}
  g.localReturning=false;
  g.targetX=g.lkpX;g.targetY=g.lkpY;
  if(!g.localArrived){
    if(travel(g,n,g.suspicion>=0.75?T.walkSpeed*0.85:T.walkSpeed*0.5,dt,t)){
      g.localArrived=true;g.localLookT=0;g.searchBase=g.facing;
    }
  }else{
    g.speed=0;g.localLookT+=dt;
    faceToward(g,g.searchBase+Math.sin(g.localLookT*2.2)*0.7,T.turnRateNotice,dt);
  }
}

export function stepGuard(
  g: GuardState,
  p: PlayerView,
  blockers: number[],
  dt: number,
  ev: GuardEvents,
  t: number,
  patrolEnabled: boolean,
  /** DIFFICULTY_GAIN multiplier (Core Rules V1 §33–34). */
  difficulty = 1,
  navigation?: Navigation,
): void {
  'worklet';
  // The group coordinator owns all post-whistle behavior. This primitive is
  // retained for independent perception/suspicion tests and the normal phase.
  if (ev.globalAlert) {
    observeGuard(g, p, blockers);
    return;
  }
  g.stateT += dt;

  // 1. Move / turn according to the current state.
  if (g.awareness === Awareness.Alert) {
    stand(g, dt);
    g.alertAge += dt;
    if (g.hasLkp) faceToward(g, angleToLkp(g), T.turnRateAlert, dt);
    if (!g.whistled) {
      const aligned = !g.hasLkp || Math.abs(wrapAngle(angleToLkp(g) - g.facing)) < T.whistleFacingTolerance;
      if (g.action !== GuardAction.Whistle && aligned) {
        g.action = GuardAction.Whistle;
        g.whistleT = 0;
      }
      if (g.action === GuardAction.Whistle) {
        const before = g.whistleT;
        g.whistleT += dt;
        if (before < T.whistleSoundAt && g.whistleT >= T.whistleSoundAt) ev.whistleCount++;
        if (g.whistleT >= T.whistleDuration) {
          g.whistled = true;
          g.action = GuardAction.None;
          ev.globalAlert = true;
          ev.globalX = g.lkpX;
          ev.globalY = g.lkpY;
          ev.globalT = t;
          ev.globalRevision++;
          ev.whistleGuard = g.id;
        }
      }
    }
  } else if(navigation && g.hasLkp && (g.suspicion>=0.5 || g.localInvestigating)) {
    g.patrolProgressAt=-1;
    investigateSuspicion(g,navigation,dt,t);
  } else if(navigation && g.localReturning) {
    const pt=g.route[g.routeIdx];g.targetX=pt?.x??g.homeX;g.targetY=pt?.y??g.homeY;
    if(travel(g,navigation,T.walkSpeed*g.pace,dt,t)){
      g.localReturning=false;g.path=[];g.wait=1;g.lookTarget=g.facing;
    }
  } else if (g.suspicion >= T.stopThreshold && g.hasLkp) {
    stand(g, dt);
    faceToward(g, angleToLkp(g), T.turnRateNotice, dt);
  } else {
    const glancing = g.suspicion >= T.glanceThreshold && g.hasLkp;
    if (patrolEnabled && navigation && g.semanticPatrol) semanticPatrolMove(g,navigation,dt,t,glancing?T.glanceSpeedScale:1);
    else if (patrolEnabled && navigation && g.roaming) roamingMove(g,navigation,dt,t,glancing?T.glanceSpeedScale:1);
    else if (patrolEnabled) patrolMove(g, dt, glancing ? T.glanceSpeedScale : 1);
    else stand(g, dt);
    let glanceTarget = 0;
    if (glancing) {
      glanceTarget = clamp(wrapAngle(angleToLkp(g) - g.baseFacing), -T.glanceMaxAngle, T.glanceMaxAngle);
    }
    // Semantic tours turn in place. A moving guard never looks sideways while
    // its feet continue on another heading; all consumers retain one facing.
    if(g.semanticPatrol && g.speed>0)g.glance=0;
    else g.glance = turnToward(g.glance, glanceTarget, T.turnRateGlance, dt);
    g.facing = wrapAngle(g.baseFacing + g.glance);
  }

  // 2. Rebuild the fan from the final pose, 3. perceive with that same fan.
  buildVisionFan(g, blockers);
  perceive(g, p, blockers);

  // 4. Suspicion + memory. LKP only updates while actually seen.
  if (g.canSee) {
    if(g.localArrived && Math.hypot(p.x-g.lkpX,p.y-g.lkpY)>T.arrivalDistance){g.localArrived=false;g.localLookT=0;}
    g.suspicion = Math.min(1, g.suspicion + suspicionGain(g, p.gait, difficulty) * dt);
    g.unseenT = 0;
    g.hasLkp = true;
    g.lkpX = p.x;
    g.lkpY = p.y;
  } else {
    g.unseenT += dt;
    if (g.unseenT > T.memorySeconds && g.awareness !== Awareness.Alert &&
      (!g.localInvestigating || (g.localArrived && g.localLookT>=1.5))) {
      g.suspicion = Math.max(0, g.suspicion - T.decayPerSecond * dt);
    }
  }

  if(g.localInvestigating && g.suspicion<=0){
    if(g.semanticPatrol && navigation)g.routeIdx=nearestPatrolAnchor(g,navigation);
    g.localInvestigating=false;g.localReturning=true;g.localArrived=false;g.path=[];g.repathAt=0;
  }

  // 5. State transitions.
  if (g.awareness !== Awareness.Alert && g.suspicion >= 1) {
    g.awareness = Awareness.Alert;
    g.stateT = 0;
    g.alertAge = 0;
    g.whistled = false;
    g.action = GuardAction.None;
    ev.alertCount++;
  } else if (g.awareness === Awareness.Patrol || g.awareness === Awareness.Suspicious) {
    g.awareness = g.canSee || g.suspicion > 0 ? Awareness.Suspicious : Awareness.Patrol;
    if (g.awareness === Awareness.Patrol) g.hasLkp = false;
  }

  // Animation blend for actions + gait from real speed.
  const actionOn = g.action !== GuardAction.None ? 1 : 0;
  g.actionT += (actionOn - g.actionT) * damp(12, dt);
  g.gait += (gaitFromSpeed(g.speed) - g.gait) * damp(14, dt);
  g.phase = (g.phase + (g.speed * dt) / strideCycleLength(g.gait)) % 1;
  g.dist += g.speed * dt;
}
