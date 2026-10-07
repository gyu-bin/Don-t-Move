/** Non-consumable SKU confirmed by the owner in App Store Connect. */
export const REMOVE_ADS_PRODUCT_IDS = {
  ios: 'com.dontmove.removeads',
  android: null, // PENDING — PLAY CONSOLE PRODUCT ID. Never reuse the iOS SKU.
} as const;

export function removeAdsProductId(platform: string): string | null {
  return platform === 'ios' ? REMOVE_ADS_PRODUCT_IDS.ios : null;
}

export const ADMOB_APP_IDS = {
  ios: 'ca-app-pub-2202662035854210~4428994235',
  android: 'ca-app-pub-2202662035854210~9781589386',
} as const;

export const PRODUCTION_INTERSTITIAL = {
  ios: 'ca-app-pub-2202662035854210/9574714983',
  android: 'ca-app-pub-2202662035854210/3822685694',
} as const;

/** Google official test interstitial unit (shared across platforms via TestIds). */
export const CLEARS_PER_INTERSTITIAL = 2;

/** How long Mission Complete may wait for an interstitial before continuing. */
export const INTERSTITIAL_LOAD_WAIT_MS = 12_000;

/** Production Ad Unit IDs only when not in a development JS bundle. */
export function isProductionAdUnits(): boolean {
  return !__DEV__ && process.env.EXPO_PUBLIC_ADS_TEST_MODE !== 'true';
}

export function adsLog(...args: unknown[]): void {
  if (__DEV__) console.info('[ADS]', ...args);
}
