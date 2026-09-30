import { playerAlertOwnsAudio, type AudioState, type GameAudioInput, type MusicEvent,
  type WhistleEvent } from './audioState';

type Event = MusicEvent | WhistleEvent;
/** Diagnostics describe a request, never claim that a native speaker produced sound. */
export function audioTransitionLog(previous: GameAudioInput | null, input: GameAudioInput,
  priorState: AudioState | null, state: AudioState, available: (event: Event) => boolean): string[] {
  const lines: string[] = [];
  const sameSession = previous?.sessionKey === input.sessionKey;
  if (!sameSession || previous.sfxEnabled !== input.sfxEnabled || previous.bgmEnabled !== input.bgmEnabled) {
    lines.push(`[AUDIO] SETTINGS SFX=${input.sfxEnabled ? 'ON' : 'OFF'} BGM=${input.bgmEnabled ? 'ON' : 'OFF'}`);
  }
  const status = (event: Event, enabled: boolean): string =>
    `${!available(event) ? 'MISSING_ASSET' : 'REQUESTED'}${!enabled ? ' MUTED' : ''}${
      !input.active || input.paused ? ' SUSPENDED' : ''}`;
  if (!sameSession || priorState?.music !== state.music || previous.bgmEnabled !== input.bgmEnabled
    || previous.active !== input.active || previous.paused !== input.paused
    || (previous.phase === 'INTRO') !== (input.phase === 'INTRO')) {
    lines.push(`[AUDIO] BGM ${state.music.slice(4).toUpperCase()} ${input.phase === 'INTRO' ? 'INTRO_SILENT' : status(state.music, input.bgmEnabled)}`);
  }
  if (sameSession && priorState) {
    if (input.theftRevision > previous.theftRevision) {
      lines.push(`[AUDIO] WHISTLE_THEFT ${playerAlertOwnsAudio(input, priorState)
        ? 'SUPPRESSED_PLAYER_ALERT' : status('whistle_theft', input.sfxEnabled)}`);
    }
    if (input.spottedRevision > previous.spottedRevision) {
      if (priorState.music === 'bgm_chase' && state.music === 'bgm_chase') lines.push('[AUDIO] chase already active');
      lines.push(`[AUDIO] WHISTLE_SPOTTED ${status('whistle_spotted', input.sfxEnabled)}`);
    }
  }
  return lines;
}
