import { Platform } from 'react-native';
import {
  adsLog,
  isProductionAdUnits,
  PRODUCTION_INTERSTITIAL,
} from './adsConfig';
import { hasGoogleMobileAdsNative } from './nativeGate';

type ShowResult = 'shown' | 'skipped';

type AdsSdk = typeof import('react-native-google-mobile-ads');

let sdk: AdsSdk | null | undefined;

function loadSdk(): AdsSdk | null {
  if (sdk !== undefined) return sdk;
  if (!hasGoogleMobileAdsNative()) {
    sdk = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sdk = require('react-native-google-mobile-ads') as AdsSdk;
  } catch (error) {
    adsLog('sdk require failed', error);
    sdk = null;
  }
  return sdk;
}

function interstitialUnitId(testInterstitialId: string): string {
  if (!isProductionAdUnits()) return testInterstitialId;
  return Platform.OS === 'ios' ? PRODUCTION_INTERSTITIAL.ios : PRODUCTION_INTERSTITIAL.android;
}

/**
 * Single interstitial lifecycle. Preload once; never spawn parallel instances.
 * Failures never throw to gameplay callers.
 */
class InterstitialController {
  private ad: { load(): void; show(): Promise<void>; addAdEventListener(type: string, listener: (...args: unknown[]) => void): () => void } | null = null;
  private loaded = false;
  private loading = false;
  private disabled = false;
  private unsubs: (() => void)[] = [];
  private initialized = false;
  private unavailable = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const mobileAds = loadSdk();
    if (!mobileAds) {
      this.unavailable = true;
      this.initialized = true;
      adsLog('initialized skipped — native AdMob absent');
      return;
    }
    try {
      adsLog('consent gathering');
      await mobileAds.AdsConsent.gatherConsent();
      adsLog('initialized');
      await mobileAds.MobileAds().initialize();
      this.initialized = true;
      if (!isProductionAdUnits()) adsLog('TEST INTERSTITIAL mode');
    } catch (error) {
      adsLog('initialized failed', error);
      this.initialized = true;
    }
  }

  setRemoveAdsOwned(owned: boolean): void {
    this.disabled = owned;
    if (owned) this.dispose();
  }

  preload(): void {
    if (this.unavailable || this.disabled || this.loaded || this.loading) return;
    const mobileAds = loadSdk();
    if (!mobileAds) {
      this.unavailable = true;
      return;
    }
    try {
      this.disposeListenersOnly();
      const unitId = interstitialUnitId(mobileAds.TestIds.INTERSTITIAL);
      adsLog('interstitial loading', unitId);
      const ad = mobileAds.InterstitialAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: false,
      });
      this.ad = ad;
      this.loading = true;
      this.unsubs.push(
        ad.addAdEventListener(mobileAds.AdEventType.LOADED, () => {
          this.loaded = true;
          this.loading = false;
          adsLog('interstitial loaded');
        }),
      );
      this.unsubs.push(
        ad.addAdEventListener(mobileAds.AdEventType.ERROR, (error: unknown) => {
          this.loaded = false;
          this.loading = false;
          adsLog('interstitial failed', error);
          this.dispose();
        }),
      );
      ad.load();
    } catch (error) {
      this.loading = false;
      this.loaded = false;
      adsLog('interstitial failed', error);
    }
  }

  /** Present if ready; otherwise skip immediately so navigation continues. */
  async showIfReady(): Promise<ShowResult> {
    if (this.unavailable || this.disabled) {
      if (this.disabled) adsLog('remove ads owned');
      return 'skipped';
    }
    const mobileAds = loadSdk();
    if (!mobileAds || !this.ad || !this.loaded) {
      adsLog('interstitial failed', 'not ready');
      this.preload();
      return 'skipped';
    }
    const ad = this.ad;
    adsLog('presenting interstitial');
    return await new Promise<ShowResult>((resolve) => {
      let settled = false;
      const finish = (result: ShowResult) => {
        if (settled) return;
        settled = true;
        this.loaded = false;
        this.dispose();
        if (result === 'shown') adsLog('interstitial closed');
        this.preload();
        resolve(result);
      };
      const unsubClosed = ad.addAdEventListener(mobileAds.AdEventType.CLOSED, () => finish('shown'));
      const unsubError = ad.addAdEventListener(mobileAds.AdEventType.ERROR, () => finish('skipped'));
      this.unsubs.push(unsubClosed, unsubError);
      ad.show().catch(() => finish('skipped'));
    });
  }

  private disposeListenersOnly(): void {
    for (const unsub of this.unsubs) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    }
    this.unsubs = [];
  }

  dispose(): void {
    this.disposeListenersOnly();
    this.ad = null;
    this.loaded = false;
    this.loading = false;
  }
}

export const interstitialController = new InterstitialController();
