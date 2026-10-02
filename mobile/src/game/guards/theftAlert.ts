import { hasPlayerAlert } from './guardPriority';
import { Awareness, GuardAction } from '../core/types';
import { turnToward, wrapAngle, damp } from '../core/math';
import { gaitFromSpeed, strideCycleLength } from '../core/locomotion';
import { observeGuard } from './guardBrain';
import type { GuardEvents, GuardState, PlayerView } from './guardBrain';
import { pointVisible } from './guardVision';
import { GUARD_TUNING as T } from './guardTuning';
import { travel } from './guardTravel';
import type { Navigation } from '../world/navigation';

export type TheftRole = 'objective' | 'corridor' | 'exit' | 'zone' | 'roaming';

/** Security Core has a brief reaction window; other missions retain their timing. */
export const SECURITY_CORE_REACTION_SECONDS = 0.85;

/** High-security objectives trip their own alarm this long after pickup. */
export const HIGH_SECURITY_ALARM_SECONDS = 1.5;

export interface TheftContext {
  /** Present only for high-security objectives: silent delay, then Theft Alert without any witness. */
  alarmDelay?: number;
  alarmAge?: number;
  missionId?: string;
  empty: boolean;
  x: number;
  y: number;
  /** Per-guard reachable destinations authored from their assigned zones. */
  posts: { x:number; y:number }[][];
  /** Museum authored responsibilities; absent retains legacy pursuit behavior. */
  roles?: TheftRole[];
  /** Distinct semantic sector circuits per guard. Cycles continue while theft remains active. */
  sectors?:{id:string;anchors:{x:number;y:number}[]}[][];
}

export function theftSearchPosts(c:TheftContext,index:number,fallback:{x:number;y:number}[]):{x:number;y:number}[] {
  'worklet';
  const sectors=c.sectors?.[index];
  if(sectors?.length){
    const posts:{x:number;y:number}[]=[];
    for(const sector of sectors)for(const anchor of sector.anchors)posts.push(anchor);
    if(posts.length)return posts;
  }
  return c.posts[index]?.length?c.posts[index]:fallback;
}

function recordTheft(ev:GuardEvents, source:string, t:number):void {
  'worklet';
  if(ev.theftAlert)return;
  ev.theftAlert=true;ev.theftGuard=source;ev.theftActivatedAt=t;
  ev.theftRevision++;ev.alertCount++;
  if(typeof __DEV__!=='undefined'&&__DEV__)console.log('[ALERT] THEFT_DISCOVERED',source);
}

/** Every guard takes its authored theft assignment. Targets are authored posts only, never player data. */
function dispatchTheftSearch(guards:GuardState[],c:TheftContext):void {
  'worklet';
  for(let i=0;i<guards.length;i++){
    const guard=guards[i];
    guard.awareness=Awareness.Investigate;guard.action=GuardAction.None;
    guard.suspicion=0;guard.hasLkp=false;guard.path=[];guard.repathAt=0;
    guard.searchIndex=0;guard.searchWait=0;guard.stateT=0;
    guard.localInvestigating=false;guard.localReturning=false;guard.localArrived=false;
    guard.whistled=true;guard.speed=0;
    const post=c.posts[i]?.[0] ?? guard.route[0];
    guard.targetX=post?.x ?? guard.homeX;guard.targetY=post?.y ?? guard.homeY;
  }
}

/** Returns the confirming guard id. Never reads player coordinates for theft targets. */
export function stepTheft(guards:GuardState[],p:PlayerView,vision:number[],n:Navigation,
  ev:GuardEvents,c:TheftContext,dt:number,t:number):string {
  'worklet';
  if(!c.empty)return '';
  // High-security alarm: pickup → short silent tension → Theft Alert and global
  // search. It shares no player position; only an actual sighting starts a chase.
  if(c.alarmDelay!==undefined && !ev.theftAlert){
    c.alarmAge=(c.alarmAge??0)+dt;
    if(c.alarmAge>=c.alarmDelay){
      const pursuing=hasPlayerAlert(guards,ev);
      recordTheft(ev,'alarm',t);ev.theftRolesAssigned=true;ev.theftConfirmer='';ev.theftGuard=ev.theftGuard||'alarm';
      if(!ev.theftSound){ev.theftSound=true;ev.whistleCount++;ev.theftWhistleRevision++;}
      // Guards already chasing/searching for a seen player keep that state.
      if(!pursuing)dispatchTheftSearch(guards,c);
    }
  }
  if(hasPlayerAlert(guards,ev)){
    // Preserve Chase/Search, every guard's target/path/velocity/timers and LKP.
    // A previously confirming guard already witnessed the empty case; otherwise
    // require actual case visibility now. Do not play a lower-priority whistle.
    if(!ev.theftAlert){
      let source=ev.theftGuard;
      if(!source)for(const g of guards)if(pointVisible(g,c.x,c.y,vision)&&(!source||g.id<source))source=g.id;
      if(source)recordTheft(ev,source,t);
    }
    if(ev.globalAlert)ev.theftConfirmer='';
    return ev.theftConfirmer;
  }
  for(const g of guards)observeGuard(g,p,vision);
  if(!ev.theftGuard && !ev.theftAlert){
    // Stable id order, not array order, arbitrates simultaneous witnesses.
    for(const g of guards)if(g.awareness!==Awareness.Alert && pointVisible(g,c.x,c.y,vision) &&
      (!ev.theftGuard || g.id<ev.theftGuard))ev.theftGuard=g.id;
    if(ev.theftGuard){
      ev.theftConfirmer=ev.theftGuard;
      const g=guards.find(g=>g.id===ev.theftGuard)!;
      g.awareness=Awareness.Alert;g.action=GuardAction.None;g.speed=0;g.whistleT=0;
    }
  }
  if(ev.theftGuard && !ev.theftAlert){
    const g=guards.find(g=>g.id===ev.theftGuard);
    if(!g)return '';
    g.speed=0;g.gait+=(0-g.gait)*damp(14,dt);
    const heading=Math.atan2(c.y-g.y,c.x-g.x);
    g.facing=turnToward(g.facing,heading,T.turnRateNotice,dt);g.baseFacing=g.facing;
    ev.theftAge+=dt;
    if(ev.theftAge>=0.45 && Math.abs(wrapAngle(heading-g.facing))<T.whistleFacingTolerance){
      g.action=GuardAction.Whistle;g.whistleT+=dt;
      if(!ev.theftSound && g.whistleT>=T.whistleSoundAt){ev.theftSound=true;ev.whistleCount++;ev.theftWhistleRevision++;}
      if(g.whistleT>=T.whistleDuration){
        recordTheft(ev,g.id,t);ev.theftRolesAssigned=true;ev.theftConfirmer='';
        dispatchTheftSearch(guards,c);
      }
    }
    g.actionT+=((g.action===GuardAction.Whistle?1:0)-g.actionT)*damp(12,dt);
    observeGuard(g,p,vision);
    return g.id;
  }
  if(ev.theftAlert){
    ev.theftRolesAssigned=true;
    ev.theftAge+=dt;
    for(let i=0;i<guards.length;i++){
      const g=guards[i];
      const assigned=theftSearchPosts(c,i,g.route);
      // Security Core keeps its four responsibilities even after lockdown;
      // its own-zone guard must not become a second exit interceptor.
      const expandLockdownPosts=ev.lockdownActive && c.missionId!=='01-08' && !c.sectors?.[i]?.length;
      let posts=expandLockdownPosts && c.roles?.[i]!=='exit' ? assigned.concat(g.route) : assigned;
      // One additional zone guard checks the authored exit approach after lockdown.
      // Other guards keep their own expanded routes; no player coordinate is involved.
      if(expandLockdownPosts && c.roles){
        const pressureIndex=c.roles.findIndex(role=>role==='zone'||role==='roaming');
        const exitIndex=c.roles.indexOf('exit');
        const exitPosts=exitIndex>=0?c.posts[exitIndex]:undefined;
        if(i===pressureIndex && exitPosts?.length)posts=[exitPosts[Math.min(1,exitPosts.length-1)],...posts];
      }
      // Observe before moving: an actual sighting alone promotes to global pursuit.
      if(g.canSee)continue;
      g.stateT+=dt;g.suspicion=0;g.hasLkp=false;
      const reacting=c.missionId==='01-08' && ev.theftActivatedAt>=0 &&
        t-ev.theftActivatedAt<SECURITY_CORE_REACTION_SECONDS;
      if(reacting){
        // Retain the authored assignment while colleagues process the whistle.
        // Visibility is still checked above/below: actual sight overrides this hold.
        g.speed=0;g.awareness=Awareness.Investigate;g.action=GuardAction.None;
      }else if(g.searchWait>0){
        g.searchWait-=dt;g.speed=0;g.awareness=Awareness.Search;g.action=GuardAction.Search;
        g.facing=turnToward(g.facing,g.searchBase+Math.sin(g.stateT*2)*0.8,T.turnRateNotice,dt);
        g.baseFacing=g.facing;
      }else if(posts?.length){
        const post=posts[g.searchIndex%posts.length];
        g.awareness=Awareness.Investigate;g.action=GuardAction.None;
        g.targetX=post.x;g.targetY=post.y;
        if(travel(g,n,T.walkSpeed*g.pace*(c.roles && c.missionId!=='02-10' ? (ev.lockdownActive?T.lockdownPaceScale:T.theftPaceScale) : 1.2),dt,t)){
          g.searchIndex++;g.searchWait=c.roles && c.missionId!=='02-10'?(ev.lockdownActive?T.lockdownSearchWait:T.theftSearchWait):1;g.searchBase=g.facing;g.path=[];
        }
      }else g.speed=0;
      g.gait+=(gaitFromSpeed(g.speed)-g.gait)*damp(14,dt);
      g.phase=(g.phase+g.speed*dt/strideCycleLength(g.gait))%1;g.dist+=g.speed*dt;
      observeGuard(g,p,vision);
    }
    const seen=guards.find(g=>g.canSee);
    if(seen){
      ev.globalAlert=true;ev.globalX=p.x;ev.globalY=p.y;ev.globalT=t;ev.globalRevision++;
      ev.sawPlayer=true;ev.whistleGuard='';
      if(!ev.spottedEpisode){ev.spottedEpisode=true;ev.spottedSource=seen.id;ev.spottedWhistleRevision++;ev.whistleCount++;}
    }
  }
  return '';
}
