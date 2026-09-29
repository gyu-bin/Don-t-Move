import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { GameAudioManager } from './GameAudioManager';
import type { GameAudioInput, UiSoundEvent } from './audioState';

type AudioBridge = { update(input: GameAudioInput): void; playUI(event: UiSoundEvent): void };
export const GameAudioContext = createContext<AudioBridge>({ update: () => {}, playUI: () => {} });
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
  useEffect(() => {
    const audio = new GameAudioManager(); manager.current = audio; apply();
    const subscription = AppState.addEventListener('change', apply);
    return () => { subscription.remove(); audio.dispose(); manager.current = null; };
  }, [apply]);
  return useMemo(() => ({ update, playUI }), [update, playUI]);
}
/** During a two-layer mission slide neither layer replaces the audible source. */
export function useGameAudio(input: GameAudioInput, ownsPlayback = true): void {
  const { update } = useContext(GameAudioContext);
  useEffect(() => { if (ownsPlayback) update(input); }, [input, ownsPlayback, update]);
}
export function useUIAudio() { return useContext(GameAudioContext).playUI; }
