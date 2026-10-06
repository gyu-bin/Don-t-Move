import { withDeadline } from './initialization';
import type { SceneImageKey } from './museumScene';

export const OPTIONAL_OPENING_KEYS = ['thiefPeek', 'thiefSneak', 'thiefFreeze', 'guardAway', 'guardTurn', 'column'] as const;
export type OpeningArt<T> = Partial<Record<SceneImageKey, T>>;

/** Background is the only readiness promise. Each optional decode publishes independently. */
export function createOpeningArtLoader<T>(decode: (key: SceneImageKey) => Promise<T>, timeoutMs = 8000,
 onOptionalError: (key: SceneImageKey, error: unknown) => void = () => {}) {
 let snapshot: OpeningArt<T> = {};
 let critical: Promise<T> | undefined;
 let optionalStarted = false;
 const listeners = new Set<(art: OpeningArt<T>) => void>();
 const load = (key: SceneImageKey) => withDeadline(Promise.resolve().then(() => decode(key)), timeoutMs, `Opening ${key}`).then(value => {
  snapshot = { ...snapshot, [key]: value };
  for (const listener of listeners) listener(snapshot);
  return value;
 });
 return {
  snapshot: () => snapshot,
  subscribe(listener: (art: OpeningArt<T>) => void) {
   listeners.add(listener); listener(snapshot);
   return () => { listeners.delete(listener); };
  },
  preload() {
   if (!critical) critical = load('bg').catch(error => { critical = undefined; throw error; });
   if (!optionalStarted) {
    optionalStarted = true;
    for (const key of OPTIONAL_OPENING_KEYS) void load(key).catch(error => onOptionalError(key, error));
   }
   return critical;
  },
 };
}
