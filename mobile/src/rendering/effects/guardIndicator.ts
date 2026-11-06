import { Awareness } from '../../game/core/types';
import type { GuardEvents, GuardState } from '../../game/guards/guardBrain';
import { CLOSE_WALK_CUE_SECONDS, HearingPhase } from '../../game/guards/guardHearing';

/** The renderer consumes awareness first; a theft fact cannot hide a pursuit icon. */
export function guardIndicator(g:GuardState, ev:GuardEvents, museum:boolean, t=Infinity, behaviorOnly=false):'alert'|'suspicion'|'search'|'hearing'|'none' {
  'worklet';
  if(g.awareness===Awareness.Alert||g.awareness===Awareness.Chase)return 'alert';
  if(!ev.globalAlert&&g.awareness===Awareness.Suspicious)return 'suspicion';
  if(g.awareness===Awareness.Investigate&&museum)return ev.theftAlert||ev.globalAlert?'alert':'search';
  if(g.awareness===Awareness.Search)return 'search';
  if(!behaviorOnly&&!ev.globalAlert&&!ev.theftAlert){
    if(g.hearing?.phase===HearingPhase.Look)return 'hearing';
    if(g.hearing?.phase===HearingPhase.Sweep)return 'search';
    if (g.awareness === Awareness.Patrol && !g.canSee && ev.phase === 'STEALTH' &&
      g.closeFootstepHeardAt !== undefined && t - g.closeFootstepHeardAt < CLOSE_WALK_CUE_SECONDS) return 'hearing';
  }
  return 'none';
}
