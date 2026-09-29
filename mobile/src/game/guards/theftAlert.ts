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

export interface TheftContext {
  missionId?: string;
  empty: boolean;
  x: number;
  y: number;
  /** Per-guard reachable destinations authored from their assigned zones. */
  posts: { x:number; y:number }[][];
  /** Museum authored responsibilities; absent retains legacy pursuit behavior. */
  roles?: TheftRole[];
}

function recordTheft(ev:GuardEvents, source:string, t:number):void {
  'worklet';
  if(ev.theftAlert)return;
  ev.theftAlert=true;ev.theftGuard=source;ev.theftActivatedAt=t;
  ev.theftRevision++;ev.alertCount++;
  if(typeof __DEV__!=='undefined'&&__DEV__)console.log('[ALERT] THEFT_DISCOVERED',source);
}

/** Returns the confirming guard id. Never reads player coordinates for theft targets. */
export function stepTheft(guards:GuardState[],p:PlayerView,vision:number[],n:Navigation,
  ev:GuardEvents,c:TheftContext,dt:number,t:number):string {
  'worklet';
  if(!c.empty)return '';
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
        for(let i=0;i<guards.length;i++){
          const guard=guards[i];
          guard.awareness=Awareness.Investigate;guard.action=GuardAction.None;
          guard.suspicion=0;guard.hasLkp=false;guard.path=[];guard.repathAt=0;
          guard.searchIndex=0;guard.searchWait=0;guard.stateT=0;
          guard.localInvestigating=false;guard.localReturning=false;guard.localArrived=false;
          guard.whistled=true;guard.speed=0;
          // Every guard receives its assignment in the whistle completion frame.
          // Targets come exclusively from authored positions, never hidden player data.
          const post=c.posts[i]?.[0] ?? guard.route[0];
          guard.targetX=post?.x ?? guard.homeX;guard.targetY=post?.y ?? guard.homeY;
        }
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
      const assigned=c.posts[i]?.length ? c.posts[i] : g.route;
      let posts=ev.lockdownActive && c.roles?.[i]!=='exit' ? assigned.concat(g.route) : assigned;
      // One additional zone guard checks the authored exit approach after lockdown.
      // Other guards keep their own expanded routes; no player coordinate is involved.
      if(ev.lockdownActive && c.roles){
        const pressureIndex=c.roles.findIndex(role=>role==='zone'||role==='roaming');
        const exitIndex=c.roles.indexOf('exit');
        const exitPosts=exitIndex>=0?c.posts[exitIndex]:undefined;
        if(i===pressureIndex && exitPosts?.length)posts=[exitPosts[Math.min(1,exitPosts.length-1)],...posts];
      }
      // Observe before moving: an actual sighting alone promotes to global pursuit.
      if(g.canSee)continue;
      g.stateT+=dt;g.suspicion=0;g.hasLkp=false;
      if(g.searchWait>0){
        g.searchWait-=dt;g.speed=0;g.awareness=Awareness.Search;g.action=GuardAction.Search;
        g.facing=turnToward(g.facing,g.searchBase+Math.sin(g.stateT*2)*0.8,T.turnRateNotice,dt);
        g.baseFacing=g.facing;
      }else if(posts?.length){
        const post=posts[g.searchIndex%posts.length];
        g.awareness=Awareness.Investigate;g.action=GuardAction.None;
        g.targetX=post.x;g.targetY=post.y;
        if(travel(g,n,T.walkSpeed*g.pace*(c.roles ? (ev.lockdownActive?T.lockdownPaceScale:T.theftPaceScale) : 1.2),dt,t)){
          g.searchIndex++;g.searchWait=c.roles?(ev.lockdownActive?T.lockdownSearchWait:T.theftSearchWait):1;g.searchBase=g.facing;g.path=[];
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
