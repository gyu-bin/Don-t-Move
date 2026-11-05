import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { GameAudioManager } from './GameAudioManager';
import type { GameAudioInput, PlayFootstep, UiSoundEvent } from './audioState';

type AudioBridge = { update(input: GameAudioInput): void; playUI(event: UiSoundEvent): void; playFootstep: PlayFootstep };
export const GameAudioContext = createContext<AudioBridge>({ update: () => {}, playUI: () => {}, playFootstep: () => {} });
/** One owner above menus and mission layers. Navigation never recreates native voices. */
export function useAppAudio() {
  const manager = useRef<GameAudioManager | null>(null);
  const latest = useRef<GameAudioInput | null>(null);
  const apply = useCallback(() => {
    if (latest.current) manager.current?.update({ ...latest.current,
      active: latest.current.active && AppState.currentState === 'active' });
  }, []);
  const update = useCallback((input: GameAudioInput) => { latest.current = input; apply(); }, [apply]);
  const playUI = useCallback((event: UiSoundEvent) => { apply(); manager.current?.playUI(event); }, [apply]);
  const playFootstep = useCallback<PlayFootstep>((surface, gait, sessionKey, emittedAt) => {
    if (AppState.currentState === 'active') manager.current?.playFootstep(surface, gait, sessionKey, emittedAt);
  }, []);
  useEffect(() => {
    const audio = new GameAudioManager(); manager.current = audio; apply();
    const subscription = AppState.addEventListener('change', apply);
    return () => { subscription.remove(); audio.dispose(); manager.current = null; };
  }, [apply]);
  return useMemo(() => ({ update, playUI, playFootstep }), [update, playUI, playFootstep]);
}
/** During a two-layer mission slide neither layer replaces the audible source. */
export function useGameAudio(input: GameAudioInput, ownsPlayback = true): void {
  const { update } = useContext(GameAudioContext);
  useEffect(() => { if (ownsPlayback) update(input); }, [input, ownsPlayback, update]);
}
export function useUIAudio() { return useContext(GameAudioContext).playUI; }
export function useFootstepAudio() { return useContext(GameAudioContext).playFootstep; }
