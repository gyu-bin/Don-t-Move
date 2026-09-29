import { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

/** Lobby menu entrance after the intro (ms since reveal start). Scene and logo never move. */
export const LOBBY_REVEAL_MS = 380;
export const LOBBY_BUTTON_STAGGER_MS = 60;
export const LOBBY_BUTTON_FADE_MS = 260;
export function buttonReveal(ms: number, index: number) {
  'worklet';
  const x = Math.max(0, Math.min(1, (ms - index * LOBBY_BUTTON_STAGGER_MS) / LOBBY_BUTTON_FADE_MS));
  const e = 1 - (1 - x) * (1 - x);
  return { opacity: e, translateY: (1 - e) * 12 };
}
export const LobbyRevealContext = createContext<SharedValue<number> | null>(null);
export const useLobbyReveal = () => useContext(LobbyRevealContext);
