/**
 * One warning vibration per alarm episode (Gameplay Improvement v2). A camera alert and a guard's "spotted" whistle in
 * the same episode vibrate once; nothing vibrates once the thief is caught (the capture has its own Error haptic) or
 * after the mission is complete. A new episode can vibrate again after the alarm has fully calmed down.
 */
export interface AlarmHapticState { episode: number; lastVibratedEpisode: number }

export function createAlarmHapticState(): AlarmHapticState { return { episode: 0, lastVibratedEpisode: -1 }; }

/** Call when the alarm calms down (the game's spotted episode has ended). */
export function endAlarmEpisode(s: AlarmHapticState): void { s.episode++; }

/** Call on a spotted whistle or a camera alert; returns whether to vibrate now. */
export function shouldVibrateForAlarm(s: AlarmHapticState, caught: boolean, completed: boolean): boolean {
  if (caught || completed || s.lastVibratedEpisode === s.episode) return false;
  s.lastVibratedEpisode = s.episode;
  return true;
}
