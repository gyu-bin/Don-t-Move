import { CLEARS_PER_INTERSTITIAL } from './adsConfig';

export interface AdClearState {
  clearsSinceLastInterstitial: number;
  removeAdsOwned: boolean;
}

export function shouldShowInterstitial(state: AdClearState): boolean {
  return !state.removeAdsOwned && state.clearsSinceLastInterstitial >= CLEARS_PER_INTERSTITIAL;
}

/** Successful Mission Complete only — never Caught / Retry / Home. */
export function recordSuccessfulClear(state: AdClearState): AdClearState {
  if (state.removeAdsOwned) return state;
  return {
    ...state,
    clearsSinceLastInterstitial: state.clearsSinceLastInterstitial + 1,
  };
}

/** Call only after an interstitial was actually presented and closed. */
export function resetClearsAfterShown(state: AdClearState): AdClearState {
  return { ...state, clearsSinceLastInterstitial: 0 };
}

export function markRemoveAdsOwned(state: AdClearState): AdClearState {
  return { ...state, removeAdsOwned: true, clearsSinceLastInterstitial: 0 };
}
