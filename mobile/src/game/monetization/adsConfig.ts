/**
 * "Remove Ads", bought once and kept. Each store has its own product, with its own id as the owner entered it:
 * App Store Connect (non-consumable) and Play Console (one-time product). The two ids are different on purpose;
 * neither is derived from the other.
 */
export const REMOVE_ADS_PRODUCT_IDS = {
  ios: 'com.dontmove.removeads',
  android: 'remove_ads',
} as const;

/** The product of the store this build talks to. Platforms without a store product (web) get none. */
export function removeAdsProductId(platform: string): string | null {
  return platform === 'ios' ? REMOVE_ADS_PRODUCT_IDS.ios : platform === 'android' ? REMOVE_ADS_PRODUCT_IDS.android : null;
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

/** Production Ad Unit IDs only when not in a development JS bundle. */
export function isProductionAdUnits(): boolean {
  return !__DEV__ && process.env.EXPO_PUBLIC_ADS_TEST_MODE !== 'true';
}

export function adsLog(...args: unknown[]): void {
  if (__DEV__) console.info('[ADS]', ...args);
}
