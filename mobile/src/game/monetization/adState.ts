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

/**
 * QA only (admin screen): the owner of Remove Ads asks to see ads on this device for this run of the app.
 * The purchase is not touched: this is the state the ad code looks at, never the state that is saved.
 */
export function adsViewOf(state: AdClearState, qaShowAds: boolean): AdClearState {
  return qaShowAds && state.removeAdsOwned ? { ...state, removeAdsOwned: false } : state;
}

/** Count a clear. With the QA switch on an owner's clears are counted too; ownership is saved as it is. */
export function countClear(state: AdClearState, qaShowAds: boolean): AdClearState {
  const counted = recordSuccessfulClear(adsViewOf(state, qaShowAds));
  return { ...state, clearsSinceLastInterstitial: counted.clearsSinceLastInterstitial };
}

export function markRemoveAdsOwned(state: AdClearState): AdClearState {
  return { ...state, removeAdsOwned: true, clearsSinceLastInterstitial: 0 };
}
