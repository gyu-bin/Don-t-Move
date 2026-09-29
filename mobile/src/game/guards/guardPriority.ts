import { Awareness } from '../core/types';
import type { GuardEvents, GuardState } from './guardBrain';

/** Player pursuit owns behavior. Theft is a separate fact, including while the
 * player's whistle is still playing and globalAlert has not yet been published. */
export function hasPlayerAlert(guards:GuardState[], ev:GuardEvents):boolean {
  'worklet';
  return ev.globalAlert || ev.spottedEpisode || guards.some(g=>
    g.awareness===Awareness.Chase ||
    (g.awareness===Awareness.Alert && g.id!==ev.theftConfirmer));
}

