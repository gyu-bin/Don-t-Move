import type { ShowResult } from './interstitialPresentation';

export type AdNavigationOutcome = 'not_due' | 'not_loaded' | 'shown' | 'skipped' | 'error';
export type AdBreadcrumb = 'interstitial_due' | 'interstitial_ready' | 'interstitial_shown' | 'interstitial_closed' | 'interstitial_skipped';

export interface AdNavigationDeps {
  /** An interstitial is owed (clear cadence reached, ads not removed). */
  due(): boolean;
  /** An ad is loaded right now. Asked once; nothing waits for this to become true. */
  ready(): boolean;
  /** Present the loaded ad. Resolves when it has closed, failed, or could not start. */
  show(): Promise<ShowResult>;
  /** Start loading for a later clear. Returns at once. */
  preload(): void;
  /** The ad was on screen and has closed: the clear cadence starts again. */
  onShown(): void;
  setPresenting(presenting: boolean): void;
  breadcrumb(name: AdBreadcrumb, props?: { reason: string }): void;
}

/**
 * Mission Complete → Next. Navigation never waits for an ad to load.
 *
 *   due and already loaded → show it, continue when it closes
 *   anything else          → continue now; the ad is loaded in the background for the next clear
 *
 * A slow or absent network, a load error and an empty fill are all "not loaded": the function returns without
 * awaiting anything and without starting a timer. The clear count is left as it is, so the ad is shown at the
 * first clear at which one is ready.
 */
export async function presentIfAlreadyLoaded(deps: AdNavigationDeps): Promise<AdNavigationOutcome> {
  if (!deps.due()) return 'not_due';
  deps.breadcrumb('interstitial_due');
  if (!deps.ready()) {
    deps.breadcrumb('interstitial_skipped', { reason: 'not_loaded' });
    try { deps.preload(); } catch { /* loading is optional; the game goes on */ }
    return 'not_loaded';
  }
  deps.breadcrumb('interstitial_ready');
  deps.setPresenting(true);
  try {
    const result = await deps.show();
    if (result === 'shown') {
      deps.onShown();
      deps.breadcrumb('interstitial_shown');
      deps.breadcrumb('interstitial_closed');
      return 'shown';
    }
    deps.breadcrumb('interstitial_skipped', { reason: 'show_failed' });
    return 'skipped';
  } catch {
    deps.breadcrumb('interstitial_skipped', { reason: 'error' });
    return 'error';
  } finally {
    deps.setPresenting(false);
  }
}
