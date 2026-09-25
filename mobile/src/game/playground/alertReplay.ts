import type { PlaygroundState } from './playgroundState';

/** Development acceptance replay on the real museum, using only normal move targets.
 * No guard state, visibility, capture or LKP overrides. Fixed 60 Hz, same as tests.
 * Approach the east guard, wait for his whistle, run around the west wall stub,
 * then wait out the search in the lower gallery.
 */
const ROUTE = [[382, 418], [185, 418], [185, 250], [110, 250], [110, 382], [260, 400], [260, 600]];

export function driveAlertReplay(s: PlaygroundState, leg: number): number {
  'worklet';
  if (leg === 0 && s.events.globalAlert) leg = 1;
  else if (leg > 0 && leg < ROUTE.length - 1 && Math.hypot(s.player.x - ROUTE[leg][0], s.player.y - ROUTE[leg][1]) < 0.6) leg++;
  s.playerMode = 3;
  s.patrol = true;
  s.player.hasTarget = true;
  s.player.tx = ROUTE[leg][0];
  s.player.ty = ROUTE[leg][1];
  return leg;
}
