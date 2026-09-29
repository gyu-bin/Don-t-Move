/** Permanent non-consumable product. STORE PRODUCT SETUP REQUIRED in App Store Connect / Play Console. */
export const REMOVE_ADS_PRODUCT_ID = 'remove_ads';

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
  return !__DEV__;
}

export function adsLog(...args: unknown[]): void {
  if (__DEV__) console.info('[ADS]', ...args);
}
