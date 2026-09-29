import type { PlaygroundState } from '../playground/playgroundState';
import { stopPlayer } from './tiltMovement';

/** Run before movement in the first frame of an input-device change. */
export function syncInputMode(state: PlaygroundState, previousTilt: boolean, currentTilt: boolean, touchSequence: number): void {
  'worklet';
  if (previousTilt === currentTilt) return;
  stopPlayer(state.player);
  state.player.tx = state.player.x;
  state.player.ty = state.player.y;
  state.touchSeq = touchSequence;
}
