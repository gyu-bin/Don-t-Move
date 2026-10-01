/** Named event boundary: gameplay supplies facts; this reducer owns sound decisions. */
export type AudioPhase = 'INTRO' | 'LOBBY' | 'STEALTH' | 'THEFT_ALERT' | 'PLAYER_SPOTTED' | 'SEARCH' | 'RETURN';
export type MusicEvent = 'bgm_lobby' | 'bgm_stealth' | 'bgm_chase';
export type WhistleEvent = 'whistle_theft' | 'whistle_spotted';
export type UiSoundEvent = 'ui_select' | 'ui_back';
export type AudioEvent = MusicEvent | WhistleEvent | UiSoundEvent | 'objective_pickup';
export interface GameAudioInput {
  objectiveRevision?: number;
  masterBgmVolume?: number;
  sfxSuspended?: boolean;
  sessionKey: string;
  phase: AudioPhase;
  theftRevision: number;
  spottedRevision: number;
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  paused: boolean;
  active: boolean;
}
export interface AudioState {
  objectiveRevision: number;
  sessionKey: string;
  theftRevision: number;
  spottedRevision: number;
  music: MusicEvent;
}
export function reduceAudio(previous: AudioState | null, input: GameAudioInput): {
  state: AudioState; pickup: boolean; whistles: WhistleEvent[]; music: MusicEvent | null;
} {
  const sameSession = previous?.sessionKey === input.sessionKey;
  const audible = input.active && !input.paused;
  const whistles: WhistleEvent[] = [];
  const pickup = sameSession && audible && input.sfxEnabled && !input.sfxSuspended
    && input.phase !== 'LOBBY' && input.phase !== 'INTRO'
    && (input.objectiveRevision ?? 0) > previous.objectiveRevision;
  // First mount and retry consume current counters, never replay historical events.
  if (sameSession && audible && input.sfxEnabled && !input.sfxSuspended && input.phase !== 'LOBBY' && input.phase !== 'INTRO') {
    if (input.theftRevision > previous.theftRevision && !playerAlertOwnsAudio(input, previous)) whistles.push('whistle_theft');
    if (input.spottedRevision > previous.spottedRevision) whistles.push('whistle_spotted');
  }
  let music: MusicEvent = sameSession ? previous.music : 'bgm_stealth';
  if (input.phase === 'LOBBY' || input.phase === 'INTRO') music = 'bgm_lobby';
  else if (input.phase === 'STEALTH') music = 'bgm_stealth';
  else if (input.phase === 'THEFT_ALERT' || input.phase === 'PLAYER_SPOTTED'
    || input.phase === 'SEARCH' || input.phase === 'RETURN') music = 'bgm_chase';
  // SEARCH and RETURN retain the last alert tension, including while muted/paused.
  const state = { objectiveRevision: input.objectiveRevision ?? 0, sessionKey: input.sessionKey, theftRevision: input.theftRevision,
    spottedRevision: input.spottedRevision, music };
  return { state, pickup, whistles, music: audible && input.bgmEnabled && input.phase !== 'INTRO' ? music : null };
}
export const MUSIC_EVENTS: readonly MusicEvent[] = ['bgm_lobby', 'bgm_stealth', 'bgm_chase'];
export type MusicMix = Record<MusicEvent, number>;
export function silenceMix(): MusicMix { return { bgm_lobby: 0, bgm_stealth: 0, bgm_chase: 0 }; }
// Stealth raised 0.52 → 0.61 (+1.4 dB) after play feedback; stays under Chase and ≥ 5 LU under both whistles.
export const TRACK_BASE_GAIN: MusicMix = { bgm_lobby: 0.50, bgm_stealth: 0.61, bgm_chase: 0.63 };
export const WHISTLE_GAIN = 0.8;
export const UI_GAIN = 0.45;
export const OBJECTIVE_PICKUP_GAIN = 0.60;
/** Fade normalized track weights; apply one master factor only at native output. */
export function fadeMix(current: MusicMix, target: MusicEvent | null, dt: number): MusicMix {
  const duration = 0.9;
  const distance = Math.max(...MUSIC_EVENTS.map(key =>
    Math.abs((key === target ? 1 : 0) - current[key] / TRACK_BASE_GAIN[key])));
  const alpha = distance < 1e-9 ? 1 : Math.min(1, Math.max(0, dt) / duration / distance);
  const next = silenceMix();
  for (const key of MUSIC_EVENTS) next[key] = current[key] + ((key === target ? TRACK_BASE_GAIN[key] : 0) - current[key]) * alpha;
  return next;
}

/** A late theft fact must not interrupt a player pursuit or retained search tension. */
export function playerAlertOwnsAudio(input: GameAudioInput, previous: AudioState): boolean {
  return input.phase === 'PLAYER_SPOTTED' || input.phase === 'SEARCH' || input.phase === 'RETURN'
    || input.spottedRevision > previous.spottedRevision;
}
