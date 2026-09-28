import { Awareness, GuardAction } from '../core/types';
import { turnToward, wrapAngle, damp } from '../core/math';
import { gaitFromSpeed, strideCycleLength } from '../core/locomotion';
import { observeGuard } from './guardBrain';
import type { GuardEvents, GuardState, PlayerView } from './guardBrain';
import { pointVisible } from './guardVision';
import { GUARD_TUNING as T } from './guardTuning';
import { travel } from './guardTravel';
import type { Navigation } from '../world/navigation';

export interface TheftContext {
  empty: boolean;
  x: number;
  y: number;
  /** Per-guard reachable destinations authored from their assigned zones. */
  posts: { x:number; y:number }[][];
}

/** Returns the confirming guard id. Never reads player coordinates for theft targets. */
export function stepTheft(guards:GuardState[],p:PlayerView,vision:number[],n:Navigation,
  ev:GuardEvents,c:TheftContext,dt:number,t:number):string {
  'worklet';
  if(!c.empty || ev.globalAlert)return '';
  for(const g of guards)observeGuard(g,p,vision);
  if(!ev.theftGuard && !ev.theftAlert){
    // Stable id order, not array order, arbitrates simultaneous witnesses.
    for(const g of guards)if(g.awareness!==Awareness.Alert && pointVisible(g,c.x,c.y,vision) &&
      (!ev.theftGuard || g.id<ev.theftGuard))ev.theftGuard=g.id;
    if(ev.theftGuard){
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
      if(!ev.theftSound && g.whistleT>=T.whistleSoundAt){ev.theftSound=true;ev.whistleCount++;}
      if(g.whistleT>=T.whistleDuration){
        ev.theftAlert=true;ev.theftRevision++;ev.alertCount++;
        for(const guard of guards){
          guard.awareness=Awareness.Investigate;guard.action=GuardAction.None;
          guard.suspicion=0;guard.hasLkp=false;guard.path=[];guard.repathAt=0;
          guard.searchIndex=0;guard.searchWait=0;guard.stateT=0;
        }
      }
    }
    g.actionT+=((g.action===GuardAction.Whistle?1:0)-g.actionT)*damp(12,dt);
    observeGuard(g,p,vision);
    return g.id;
  }
  if(ev.theftAlert){
    for(let i=0;i<guards.length;i++){
      const g=guards[i],posts=c.posts[i];
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
        if(travel(g,n,T.walkSpeed*g.pace*1.2,dt,t)){
          g.searchIndex++;g.searchWait=1;g.searchBase=g.facing;g.path=[];
        }
      }else g.speed=0;
      g.gait+=(gaitFromSpeed(g.speed)-g.gait)*damp(14,dt);
      g.phase=(g.phase+g.speed*dt/strideCycleLength(g.gait))%1;g.dist+=g.speed*dt;
      observeGuard(g,p,vision);
    }
    const seen=guards.find(g=>g.canSee);
    if(seen){
      ev.globalAlert=true;ev.globalX=p.x;ev.globalY=p.y;ev.globalT=t;ev.globalRevision++;
      ev.sawPlayer=true;ev.whistleGuard=''; // No second whistle, no stale personal LKP.
    }
  }
  return '';
}
