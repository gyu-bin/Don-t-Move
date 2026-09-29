import { hasPlayerAlert } from './guardPriority';
import { Awareness } from '../core/types';
import type { GuardEvents, GuardState } from './guardBrain';

/** Seconds after confirmed theft; zero means this mission has no lockdown. */
export const MUSEUM_LOCKDOWN_SECONDS: Record<string, number> = {
  '01-07': 28, '01-08': 28, '01-09': 28, '01-10': 20,
};

export function updateGuardPhase(ev:GuardEvents, guards:GuardState[], t:number, missionId?:string):void {
  'worklet';
  ev.lockdownDuration=missionId ? (MUSEUM_LOCKDOWN_SECONDS[missionId]??0) : 0;
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
}
