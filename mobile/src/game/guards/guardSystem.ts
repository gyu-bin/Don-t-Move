import { damp, turnToward } from '../core/math';
import { gaitFromSpeed, strideCycleLength } from '../core/locomotion';
import { Awareness, GuardAction } from '../core/types';
import { clearSegment } from '../world/navigation';
import { travel } from './guardTravel';
import type { Navigation } from '../world/navigation';
import { nearestPatrolAnchor, observeGuard, stepGuard } from './guardBrain';
import type { GuardEvents, GuardState, PlayerView } from './guardBrain';
import { BODY, GUARD_TUNING as T } from './guardTuning';
import { stepTheft } from './theftAlert';
import type { TheftContext } from './theftAlert';

function enter(g: GuardState, state: number): void {
  'worklet';
  if (g.awareness === state) return;
  const samePursuit = (g.awareness === Awareness.Chase || g.awareness === Awareness.Investigate) &&
    (state === Awareness.Chase || state === Awareness.Investigate);
  g.awareness = state;
  g.stateT = 0;
  // Flickering visibility near a corner must not bypass the path-plan cooldown.
  if (!samePursuit) {
    g.path = [];
    g.pathIndex = 0;
    g.repathAt = 0;
  }
  g.action = state === Awareness.Search ? GuardAction.Search : GuardAction.None;
  if (state === Awareness.Search) {
    g.searchX = g.x; g.searchY = g.y;
    g.searchIndex = 0; g.searchWait = T.searchPause;
    g.searchBase = g.facing;
  }
  if (state === Awareness.Return) {
    g.returnIndex = -1;
    let nearest = Infinity;
    for (let i = 0; i < g.route.length; i++) {
      const d = Math.hypot(g.route[i].x - g.x, g.route[i].y - g.y);
      if (d < nearest) { nearest = d; g.returnIndex = i; }
    }
  }
}

/** Only this pass publishes shared intelligence; no hidden player position is read. */
function shareSight(guards: GuardState[], p: PlayerView, ev: GuardEvents, t: number): void {
  'worklet';
  let visible = false;
  for (let i = 0; i < guards.length; i++) {
    const g = guards[i];
    if (!g.canSee) continue;
    visible = true;
    g.hasLkp = true; g.lkpX = p.x; g.lkpY = p.y; g.unseenT = 0;
  }
  if (visible) {
    if (!ev.sawPlayer || ev.globalX !== p.x || ev.globalY !== p.y) ev.globalRevision++;
    ev.globalX = p.x; ev.globalY = p.y; ev.globalT = t;
  }
  ev.sawPlayer = visible;
}

function react(g: GuardState, ev: GuardEvents): void {
  'worklet';
  g.suspicion = 0;
  g.whistled = true;
  g.action = g.awareness === Awareness.Search ? GuardAction.Search : GuardAction.None;
  const news = g.knownRevision !== ev.globalRevision;
  g.knownRevision = ev.globalRevision;
  if (g.canSee) enter(g, Awareness.Chase);
  else if (news || g.awareness === Awareness.Chase || g.awareness === Awareness.Alert || g.awareness === Awareness.Suspicious) {
    enter(g, Awareness.Investigate);
  }
  if (g.awareness === Awareness.Chase || g.awareness === Awareness.Investigate) {
    g.targetX = ev.globalX; g.targetY = ev.globalY;
  }
}


function moveAlertGuard(g: GuardState, n: Navigation, dt: number, t: number, index: number): void {
  'worklet';
  g.stateT += dt;
  g.alertAge += dt;
  if (g.awareness === Awareness.Chase || g.awareness === Awareness.Investigate) {
    const arrived = travel(g, n, g.awareness === Awareness.Chase ? T.runSpeed : T.investigateSpeed, dt, t);
    if (arrived && g.awareness === Awareness.Investigate) enter(g, Awareness.Search);
  } else if (g.awareness === Awareness.Search) {
    if (g.stateT >= T.searchSeconds) {
      enter(g, Awareness.Return);
    } else if (g.searchWait > 0) {
      g.speed = 0;
      g.searchWait -= dt;
      g.facing = turnToward(g.facing, g.searchBase + Math.sin(g.stateT * 3) * 1.2, T.turnRatePatrol, dt);
      g.baseFacing = g.facing;
    } else {
      if (g.path.length === 0) {
        // Different deterministic spokes per guard, projected onto reachable floor by A*.
        const angle = (index * 1.7 + g.searchIndex * 2.4);
        g.targetX = g.searchX + Math.cos(angle) * T.searchRadius;
        g.targetY = g.searchY + Math.sin(angle) * T.searchRadius;
      }
      if (travel(g, n, T.searchSpeed, dt, t)) {
        g.searchIndex++;
        g.searchWait = T.searchPause;
        g.searchBase = g.facing;
        g.path = [];
      }
    }
  } else if (g.awareness === Awareness.Return) {
    if(g.semanticPatrol && g.stateT<=dt){g.returnIndex=nearestPatrolAnchor(g,n);g.patrolProgressAt=-1;}
    const pt = g.returnIndex >= 0 ? g.route[g.returnIndex] : null;
    g.targetX = pt?.x ?? g.homeX; g.targetY = pt?.y ?? g.homeY;
    if (travel(g, n, T.walkSpeed, dt, t)) {
      enter(g, Awareness.Patrol);
      g.speed = 0; g.delay = 0;
      g.wait = pt?.wait ?? 0;
      g.lookTarget = pt && !Number.isNaN(pt.look) ? pt.look : g.homeFacing;
      // Patrol visits this point first, then uses its existing loop/pingpong semantics.
      if (g.returnIndex >= 0) g.routeIdx = g.returnIndex;
    }
  } else {
    g.speed = 0; // Wait for the last returning colleague before normal patrol resumes.
  }
  g.gait += (gaitFromSpeed(g.speed) - g.gait) * damp(14, dt);
  g.phase = (g.phase + g.speed * dt / strideCycleLength(g.gait)) % 1;
  g.dist += g.speed * dt;
  g.actionT += ((g.action === GuardAction.None ? 0 : 1) - g.actionT) * damp(12, dt);
}

export function bodiesTouch(g: { x: number; y: number }, p: { x: number; y: number }, blockers: number[]): boolean {
  'worklet';
  return Math.hypot(g.x - p.x, g.y - p.y) <= BODY.playerRadius + BODY.guardRadius + BODY.captureTolerance &&
    clearSegment(g.x, g.y, p.x, p.y, blockers);
}

/** Group barrier: perceive all → publish → decide/move all → perceive/publish → reconcile. */
export function stepGuards(guards: GuardState[], p: PlayerView, vision: number[], n: Navigation,
  dt: number, ev: GuardEvents, t: number, patrol: boolean, difficulty = 1, theft?: TheftContext): void {
  'worklet';
  if (ev.caught) return;
  // Contact already present at the beginning of this step cannot be escaped by
  // a guard moving away before the end-of-step check.
  for (let i = 0; i < guards.length; i++) {
    if (bodiesTouch(guards[i], p, n.blockers)) {
      ev.caught = true; ev.caughtBy = guards[i].id;
      return;
    }
  }
  const wasGlobal = ev.globalAlert;
  const confirming = theft ? stepTheft(guards,p,vision,n,ev,theft,dt,t) : '';
  if (!wasGlobal && !ev.globalAlert && !ev.theftAlert) {
    for (let i = 0; i < guards.length; i++) if(guards[i].id!==confirming) stepGuard(guards[i], p, vision, dt, ev, t, patrol, difficulty, n);
  }
  if (ev.globalAlert) {
    for (let i = 0; i < guards.length; i++) observeGuard(guards[i], p, vision);
    // A whistle completed while its source lost sight: share only its last seen location.
    if (!wasGlobal) for (let i = 0; i < guards.length; i++) {
      if (guards[i].id === ev.whistleGuard) { ev.globalX = guards[i].lkpX; ev.globalY = guards[i].lkpY; }
    }
    shareSight(guards, p, ev, t);
    for (let i = 0; i < guards.length; i++) react(guards[i], ev);
    if (wasGlobal) {
      for (let i = 0; i < guards.length; i++) moveAlertGuard(guards[i], n, dt, t, i);
    }
    for (let i = 0; i < guards.length; i++) observeGuard(guards[i], p, vision);
    shareSight(guards, p, ev, t);
    for (let i = 0; i < guards.length; i++) react(guards[i], ev);
    let returned = !ev.sawPlayer;
    for (let i = 0; i < guards.length; i++) if (guards[i].awareness !== Awareness.Patrol) returned = false;
    if (returned) {
      ev.globalAlert = false;
      for (let i = 0; i < guards.length; i++) {
        const g = guards[i];
        g.suspicion = 0; g.hasLkp = false; g.whistled = false; g.unseenT = 0;
        g.localInvestigating=false;g.localReturning=false;g.localArrived=false;
      }
    }
  }
  for (let i = 0; i < guards.length; i++) {
    if (bodiesTouch(guards[i], p, n.blockers)) {
      ev.caught = true; ev.caughtBy = guards[i].id;
      return;
    }
  }
}
