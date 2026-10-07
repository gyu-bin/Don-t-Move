import { Platform } from 'react-native';
import {
  adsLog,
  INTERSTITIAL_LOAD_WAIT_MS,
  isProductionAdUnits,
  PRODUCTION_INTERSTITIAL,
} from './adsConfig';
import { hasGoogleMobileAdsNative } from './nativeGate';

import { presentLoadedAd } from './interstitialPresentation';
import type { PresentableAd, ShowResult } from './interstitialPresentation';
import { withDeadline } from '../../ui/branding/initialization';

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

type QaMode = 'unloaded' | 'showFail' | 'noClose' | undefined;
/** DEV-only controlled failures for device QA, set from the debugger:
 * globalThis.__DM_AD_QA = 'unloaded' | 'showFail' | 'noClose'. Never read in release. */
function qaMode(): QaMode {
  return typeof __DEV__ !== 'undefined' && __DEV__ ? (globalThis as { __DM_AD_QA?: QaMode }).__DM_AD_QA : undefined;
}
function qaAd<T extends PresentableAd>(ad: T): PresentableAd {
  const mode = qaMode();
  if (mode === 'showFail') {
    adsLog('QA showFail');
    return { addAdEventListener: (type, listener) => ad.addAdEventListener(type, listener), show: () => Promise.reject(new Error('QA show failure')) };
  }
  if (mode === 'noClose') {
    adsLog('QA noClose — CLOSED/ERROR withheld');
    return {
      loaded: true, show: () => ad.show(),
      addAdEventListener: (type, listener) => type === 'opened' ? ad.addAdEventListener(type, listener) : () => {},
    };
  }
  return ad;
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
  private presenting: Promise<ShowResult> | null = null;
  private cancelPresentation: (() => void) | null = null;
  private confirmDismissed: (() => void) | null = null;
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
      await withDeadline(mobileAds.MobileAds().initialize(), 8000, 'Ads initialization');
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
    if (this.unavailable || this.disabled || this.loaded || this.loading || this.presenting) return;
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
          if (this.ad !== ad || this.disabled) return;
          this.loaded = true;
          this.loading = false;
          this.retries = 0;
          adsLog('interstitial loaded');

        }),
      );
      this.unsubs.push(
        ad.addAdEventListener(mobileAds.AdEventType.ERROR, (error: unknown) => {
          if (this.ad !== ad || this.presenting) return;
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

      this.scheduleRetry();
    }
  }

  isReady(): boolean { return !this.disabled && !this.unavailable && !!this.ad && this.loaded && qaMode() !== 'unloaded'; }

  /** Recovery for a lost native CLOSED/ERROR: call only from a touch on app UI. */
  confirmPresentationDismissed(): void {
    if (!this.confirmDismissed) return;
    adsLog('dismissal confirmed by app touch');
    this.confirmDismissed();
  }

  /**
   * When an interstitial is due, wait for a load (or timeout) then show.
   * Navigation stays blocked via adPresenting until this settles.
   */
  async showWhenDue(timeoutMs = INTERSTITIAL_LOAD_WAIT_MS): Promise<ShowResult> {
    if (this.disabled) return 'skipped';
    if (this.presenting) return this.presenting;
    const ready = await this.waitUntilReady(timeoutMs);
    if (!ready) {
      adsLog('interstitial skipped — load wait timed out or unavailable');
      return 'skipped';
    }
    return this.showIfReady();
  }

  private waitUntilReady(timeoutMs: number): Promise<boolean> {
    if (this.disabled || this.unavailable || qaMode() === 'unloaded') {
      return Promise.resolve(false);
    }
    if (this.isReady()) return Promise.resolve(true);
    this.preload();
    if (this.isReady()) return Promise.resolve(true);
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve) => {
      const tick = () => {
        if (this.disabled || this.unavailable || qaMode() === 'unloaded') {
          clearInterval(timer);
          resolve(false);
          return;
        }
        if (this.isReady()) {
          clearInterval(timer);
          resolve(true);
          return;
        }
        if (Date.now() >= deadline) {
          clearInterval(timer);
          resolve(false);
          return;
        }
        if (!this.loading && !this.loaded && !this.presenting) this.preload();
      };
      const timer = setInterval(tick, 100);
      tick();
    });
  }

  /** Present only if an ad is already loaded. Prefer showWhenDue at Mission Complete. */
  showIfReady(): Promise<ShowResult> {
    if (this.disabled) return Promise.resolve('skipped');
    if (this.presenting) return this.presenting;
    const mobileAds = loadSdk();
    if (!mobileAds || !this.isReady() || !this.ad) {
      adsLog('interstitial skipped — not ready or disabled');
      return Promise.resolve('skipped');
    }
    const ad = qaAd(this.ad);
    const owned = this.ad;
    this.loaded = false;
    // Transfer ownership to presentation listeners before showing. In particular,
    // the preload ERROR listener must not remove the presentation ERROR listener.
    this.disposeListenersOnly();
    adsLog('show requested');
    const presentation = presentLoadedAd(ad, {
      opened: mobileAds.AdEventType.OPENED,
      closed: mobileAds.AdEventType.CLOSED,
      error: mobileAds.AdEventType.ERROR,
    }, result => adsLog(result === 'shown' ? 'closed' : 'show failed or start callback missing'));
    this.cancelPresentation = presentation.cancel;
    this.confirmDismissed = presentation.confirmDismissed;
    this.presenting = presentation.result.finally(() => {
      this.presenting = null; this.cancelPresentation = null; this.confirmDismissed = null;
      if (this.ad === owned) { this.dispose(); this.preload(); }
    });
    return this.presenting;
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
    this.clearRetry();
    this.disposeListenersOnly();
    this.ad = null;
    this.loaded = false;
    this.loading = false;
    const cancel = this.cancelPresentation;
    this.cancelPresentation = null;
    cancel?.();
  }
}

export const interstitialController = new InterstitialController();
