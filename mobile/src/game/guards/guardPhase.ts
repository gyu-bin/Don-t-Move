import { hasPlayerAlert } from './guardPriority';
import { Awareness } from '../core/types';
import type { GuardEvents, GuardState } from './guardBrain';

/** Shared campaign rule: confirmed theft starts pressure, never a timeout loss. */
export const ESCAPE_TIMER_SECONDS = 10;

export function updateGuardPhase(ev:GuardEvents, guards:GuardState[], t:number, _missionId?:string):void {
  'worklet';
  ev.lockdownDuration=ESCAPE_TIMER_SECONDS;
  if(ev.theftAlert && ev.theftActivatedAt>=0 && ev.lockdownDuration>0){
    ev.lockdownRemaining=Math.max(0,ev.lockdownDuration-(t-ev.theftActivatedAt));
    ev.lockdownActive=ev.lockdownRemaining<=0;
  }else {ev.lockdownRemaining=0;ev.lockdownActive=false;}
  const previous=ev.phase;
  // The countdown only changes guard pressure. Capture and exit remain independent.
  if(ev.globalAlert){
    if(ev.sawPlayer)ev.phase='PLAYER_SPOTTED';
    else if(guards.some(g=>g.awareness!==Awareness.Return && g.awareness!==Awareness.Patrol))ev.phase='SEARCH';
    else ev.phase='RETURN';
  }else ev.phase=hasPlayerAlert(guards,ev)?'PLAYER_SPOTTED':ev.theftAlert?'THEFT_ALERT':'STEALTH';
  if(previous!==ev.phase&&typeof __DEV__!=='undefined'&&__DEV__)console.log('[ALERT]',ev.phase);
  if(previous!==ev.phase&&ev.phase==='PLAYER_SPOTTED'&&typeof __DEV__!=='undefined'&&__DEV__)
    console.log('[ALERT] PLAYER_SPOTTED guard='+guards.filter(g=>g.canSee).map(g=>g.id).join(','));
}
