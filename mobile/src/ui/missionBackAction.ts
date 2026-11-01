/** What the Android Back button (or back-swipe gesture) does on the mission screen. */
export type MissionBackAction = 'pause' | 'resume' | 'closeSettings' | 'ignore';

export interface MissionBackState {
  paused: boolean;
  settings: boolean;
  /** Mission over (caught / complete), a mission swap, or the intro replay: their own buttons decide. */
  busy: boolean;
}

/**
 * Release QA (2026-10-24): without a handler, Back finished the Android activity and dropped the player out of a
 * running mission — easy to trigger with the edge back-swipe while dragging the touch stick. Back never leaves the
 * mission now: playing → pause menu, pause menu → resume, settings → back to the pause menu.
 */
export function missionBackAction(s: MissionBackState): MissionBackAction {
  if (s.busy) return 'ignore';
  if (s.settings) return 'closeSettings';
  return s.paused ? 'resume' : 'pause';
}
