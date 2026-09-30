import { damp, turnToward } from '../core/math';
import { gaitFromSpeed, strideCycleLength } from '../core/locomotion';
import { Awareness, GuardAction } from '../core/types';
import { clearSegment } from '../world/navigation';
import { pursue, travel } from './guardTravel';
import type { Navigation } from '../world/navigation';
import { nearestPatrolAnchor, observeGuard, stepGuard } from './guardBrain';
import type { GuardEvents, GuardState, PlayerView } from './guardBrain';
import { BODY, GUARD_TUNING as T } from './guardTuning';
import { hasPlayerAlert } from './guardPriority';
import { stepTheft } from './theftAlert';
import { updateGuardPhase } from './guardPhase';
import type { TheftContext } from './theftAlert';

// Worklet closures capture values at declaration time. Initialize these before
// moveAlertGuard captures the contact radius for the UI runtime.
export const CONTACT_DISTANCE = BODY.playerRadius + BODY.guardRadius;
export const CAPTURE_DISTANCE = BODY.playerRadius + BODY.guardRadius + BODY.captureTolerance;

function enter(g: GuardState, state: number): void {
  'worklet';
  if (g.awareness === state) return;
  const samePursuit = (g.awareness === Awareness.Chase || g.awareness === Awareness.Investigate) &&
    (state === Awareness.Chase || state === Awareness.Investigate);
  g.awareness = state;
  if(typeof __DEV__!=='undefined'&&__DEV__&&(state===Awareness.Chase||state===Awareness.Search))
    console.log(state===Awareness.Chase?'[ALERT] CHASE':'[ALERT] SEARCH',g.id);
  g.stateT = 0;
  // Flickering visibility near a corner must not bypass the path-plan cooldown.
  if (!samePursuit) {
    g.path = [];
    g.pathIndex = 0;
    g.repathAt = 0;
  }
  g.action = state === Awareness.Search ? GuardAction.Search : GuardAction.None;
  if (state === Awareness.Chase && typeof __DEV__ !== 'undefined' && __DEV__)
    console.log('[AI] pursue start guard='+g.id);
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

function react(g: GuardState, ev: GuardEvents, theft?: TheftContext, index = 0): void {
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
    // The witness pursues the player. Unseen Museum colleagues intercept at
    // semantic posts, so an escape corridor is covered without telepathy.
    // A guard with personal sight memory must first reach the last seen position,
    // even when its assigned role would otherwise hold an exit or corridor.
    const role=theft?.roles?.[index],posts=theft?.posts[index];
    if(ev.theftRolesAssigned && !g.canSee && !g.hasLkp && role && posts?.length && role!=='objective'){
      let selected=0;
      if(role!=='exit'){
        let best=Infinity;
        for(let i=0;i<posts.length;i++){
          const d=Math.hypot(posts[i].x-ev.globalX,posts[i].y-ev.globalY);
          if(d<best){best=d;selected=i;}
        }
      }
      g.targetX=posts[selected].x;g.targetY=posts[selected].y;
    }
  }
}


function moveAlertGuard(g: GuardState, n: Navigation, dt: number, t: number, index: number, theft?: TheftContext, ev?: GuardEvents): void {
  'worklet';
  g.stateT += dt;
  g.alertAge += dt;
  if (g.awareness === Awareness.Chase || g.awareness === Awareness.Investigate) {
    // Direct Chase and LKP/support travel use separate controllers: only waypoint
    // travel has arrival; a chase runs through to body contact (see pursue()).
    if (g.awareness === Awareness.Chase) pursue(g, n, T.runSpeed, dt, t, CONTACT_DISTANCE);
    else if (travel(g, n, T.investigateSpeed, dt, t)) enter(g, Awareness.Search);
  } else if (g.awareness === Awareness.Search) {
    const searchSeconds=theft?.roles ? (ev?.lockdownActive?T.lockdownSearchSeconds:T.museumSearchSeconds) : T.searchSeconds;
    if (g.stateT >= searchSeconds) {
      enter(g, Awareness.Return);
    } else if (g.searchWait > 0) {
      g.speed = 0;
      g.searchWait -= dt;
      g.facing = turnToward(g.facing, g.searchBase + Math.sin(g.stateT * 3) * 1.2, T.turnRatePatrol, dt);
      g.baseFacing = g.facing;
    } else {
      if (g.path.length === 0) {
        const posts=theft?.roles?.[index] ? theft.posts[index] : g.semanticPatrol ? g.route : undefined;
        if(posts?.length){
          const post=posts[g.searchIndex%posts.length];
          g.targetX=post.x;g.targetY=post.y;
        }else{
          // Legacy stages retain their bounded local search spokes.
          const angle = (index * 1.7 + g.searchIndex * 2.4);
          g.targetX = g.searchX + Math.cos(angle) * T.searchRadius;
          g.targetY = g.searchY + Math.sin(angle) * T.searchRadius;
        }
      }
      if (travel(g, n, T.searchSpeed*(theft?.roles?T.theftPaceScale:1), dt, t)) {
        g.searchIndex++;
        g.searchWait = ev?.lockdownActive?T.lockdownSearchWait:T.searchPause;
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
  return Math.hypot(g.x - p.x, g.y - p.y) <= CAPTURE_DISTANCE &&
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
  updateGuardPhase(ev,guards,t,theft?.missionId);
  const wasGlobal = ev.globalAlert;
  const confirming = theft ? stepTheft(guards,p,vision,n,ev,theft,dt,t) : '';
  if (!wasGlobal && !ev.globalAlert && (!ev.theftAlert || hasPlayerAlert(guards,ev))) {
    for (let i = 0; i < guards.length; i++) if(guards[i].id!==confirming) stepGuard(guards[i], p, vision, dt, ev, t, patrol, difficulty, n);
  }
  if (ev.globalAlert) {
    for (let i = 0; i < guards.length; i++) observeGuard(guards[i], p, vision);
    // A whistle completed while its source lost sight: share only its last seen location.
    if (!wasGlobal) for (let i = 0; i < guards.length; i++) {
      if (guards[i].id === ev.whistleGuard) { ev.globalX = guards[i].lkpX; ev.globalY = guards[i].lkpY; }
    }
    shareSight(guards, p, ev, t);
    for (let i = 0; i < guards.length; i++) react(guards[i], ev, theft, i);
    if (wasGlobal) {
      for (let i = 0; i < guards.length; i++) moveAlertGuard(guards[i], n, dt, t, i, theft, ev);
    }
    for (let i = 0; i < guards.length; i++) observeGuard(guards[i], p, vision);
    shareSight(guards, p, ev, t);
    for (let i = 0; i < guards.length; i++) react(guards[i], ev, theft, i);
    let returned = !ev.sawPlayer;
    for (let i = 0; i < guards.length; i++) if (guards[i].awareness !== Awareness.Patrol) returned = false;
    if (returned) {
      ev.globalAlert = false;
      ev.spottedEpisode=false;
      for (let i = 0; i < guards.length; i++) {
        const g = guards[i];
        g.suspicion = 0; g.hasLkp = false; g.whistled = false; g.unseenT = 0;
        g.localInvestigating=false;g.localReturning=false;g.localArrived=false;
      }
    }
  }
  updateGuardPhase(ev,guards,t,theft?.missionId);
  for (let i = 0; i < guards.length; i++) {
    if (bodiesTouch(guards[i], p, n.blockers)) {
      ev.caught = true; ev.caughtBy = guards[i].id;
      return;
    }
  }
}
