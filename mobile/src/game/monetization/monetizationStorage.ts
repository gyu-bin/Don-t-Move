import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AdClearState } from './adState';

const STORAGE_KEY = 'dont-move.monetization.v1';

export const DEFAULT_AD_STATE: AdClearState = {
  clearsSinceLastInterstitial: 0,
  removeAdsOwned: false,
};

export function normalizeAdState(value: unknown): AdClearState {
  if (!value || typeof value !== 'object') return { ...DEFAULT_AD_STATE };
  const row = value as Partial<AdClearState>;
  const clears = Number(row.clearsSinceLastInterstitial);
  return {
    clearsSinceLastInterstitial:
      Number.isInteger(clears) && clears >= 0 ? Math.min(clears, 99) : 0,
    removeAdsOwned: row.removeAdsOwned === true,
  };
}

export async function loadAdState(): Promise<AdClearState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? normalizeAdState(JSON.parse(raw)) : { ...DEFAULT_AD_STATE };
  } catch (error) {
    console.error('Monetization storage read failed', error);
    return { ...DEFAULT_AD_STATE };
  }
}

let saving: Promise<void> = Promise.resolve();
export function saveAdState(state: AdClearState): Promise<void> {
  const encoded = JSON.stringify(normalizeAdState(state));
  saving = saving.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, encoded));
  return saving;
}
