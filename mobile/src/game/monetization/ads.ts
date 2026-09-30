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
  private waiters: Array<() => void> = [];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retries = 0;

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
      await Promise.race([
        mobileAds.AdsConsent.gatherConsent(),
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ]);
    } catch (error) {
      adsLog('consent skipped', error);
    }
    try {
      await mobileAds.MobileAds().initialize();
      adsLog('initialized');
      if (!isProductionAdUnits()) adsLog('TEST INTERSTITIAL mode');
    } catch (error) {
      console.warn('[ADS] initialize failed', error);
    }
    this.initialized = true;
  }

  setRemoveAdsOwned(owned: boolean): void {
    this.disabled = owned;
    if (owned) {
      this.clearRetry();
      this.dispose();
    }
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
          this.retries = 0;
          adsLog('interstitial loaded');
          this.settleWaiters();
        }),
      );
      this.unsubs.push(
        ad.addAdEventListener(mobileAds.AdEventType.ERROR, (error: unknown) => {
          this.loaded = false;
          this.loading = false;
          console.warn('[ADS] interstitial failed', error);
          this.dispose();
          this.scheduleRetry();
        }),
      );
      ad.load();
    } catch (error) {
      this.loading = false;
      this.loaded = false;
      console.warn('[ADS] interstitial failed', error);
      this.settleWaiters();
      this.scheduleRetry();
    }
  }

  /** Present a loaded interstitial. If a request is already in flight, wait briefly for it. */
  async showIfReady(): Promise<ShowResult> {
    if (this.unavailable || this.disabled) {
      if (this.disabled) adsLog('remove ads owned');
      return 'skipped';
    }
    const mobileAds = loadSdk();
    if (!mobileAds) return 'skipped';
    if (!this.loaded) {
      this.preload();
      if (this.loading) await this.waitForLoad(2500);
    }
    if (!this.ad || !this.loaded) {
      adsLog('interstitial failed', 'not ready');
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

  private waitForLoad(ms: number): Promise<void> {
    if (this.loaded || !this.loading) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, ms);
      this.waiters.push(finish);
    });
  }

  private settleWaiters(): void {
    const waiters = this.waiters;
    this.waiters = [];
    for (const finish of waiters) finish();
  }

  private scheduleRetry(): void {
    if (this.disabled || this.unavailable || this.retryTimer || this.retries >= 5) return;
    this.retries += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.preload();
    }, 5000);
  }

  private clearRetry(): void {
    if (!this.retryTimer) return;
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
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
    this.settleWaiters();
  }
}

export const interstitialController = new InterstitialController();
