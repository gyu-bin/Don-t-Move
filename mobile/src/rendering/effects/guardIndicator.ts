import { Awareness } from '../../game/core/types';
import type { GuardEvents, GuardState } from '../../game/guards/guardBrain';

/** The renderer consumes awareness first; a theft fact cannot hide a pursuit icon. */
export function guardIndicator(g:GuardState, ev:GuardEvents, museum:boolean):'alert'|'suspicion'|'search'|'none' {
  'worklet';
  if(g.awareness===Awareness.Alert||g.awareness===Awareness.Chase)return 'alert';
  if(!ev.globalAlert&&g.awareness===Awareness.Suspicious)return 'suspicion';
  if(g.awareness===Awareness.Investigate&&museum)return ev.theftAlert||ev.globalAlert?'alert':'search';
  if(g.awareness===Awareness.Search)return 'search';
  return 'none';
}
