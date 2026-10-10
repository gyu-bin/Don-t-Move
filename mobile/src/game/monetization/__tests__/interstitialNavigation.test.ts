/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { presentIfAlreadyLoaded, type AdNavigationDeps } from '../interstitialNavigation';
import { presentLoadedAd, type PresentableAd, type ShowResult } from '../interstitialPresentation';
import { recordSuccessfulClear, resetClearsAfterShown, shouldShowInterstitial, type AdClearState } from '../adState';

/** Mission Complete as the provider wires it, with a controllable ad. */
function rig(options: { loaded?: boolean; show?: () => Promise<ShowResult>; preload?: () => void; clears?: number; owned?: boolean } = {}) {
  let state: AdClearState = { clearsSinceLastInterstitial: options.clears ?? 2, removeAdsOwned: options.owned ?? false };
  const log: string[] = [];
  let shows = 0, preloads = 0;
  const presenting: boolean[] = [];
  const deps: AdNavigationDeps = {
    due: () => shouldShowInterstitial(state),
    ready: () => options.loaded ?? false,
    show: () => { shows++; return (options.show ?? (async () => 'shown' as const))(); },
    preload: () => { preloads++; options.preload?.(); },
    onShown: () => { state = resetClearsAfterShown(state); },
    setPresenting: (value) => presenting.push(value),
    breadcrumb: (name, props) => log.push(props ? `${name}:${props.reason}` : name),
  };
  return { deps, log, presenting, shows: () => shows, preloads: () => preloads, state: () => state };
}
/** Runs `work` and reports whether it finished without a single timer being created and before the next task. */
async function immediate<T>(work: () => Promise<T>): Promise<{ value: T; timers: number; sameTask: boolean }> {
  const realTimeout = globalThis.setTimeout, realInterval = globalThis.setInterval;
  let timers = 0;
  globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => { timers++; return realTimeout(...args); }) as typeof setTimeout;
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => { timers++; return realInterval(...args); }) as typeof setInterval;
  try {
    let nextTask = false;
    const marker = new Promise<void>((resolve) => realTimeout(() => { nextTask = true; resolve(); }, 0));
    const value = await work();
    const sameTask = !nextTask;
    await marker;
    return { value, timers, sameTask };
  } finally { globalThis.setTimeout = realTimeout; globalThis.setInterval = realInterval; }
}

test('due + already loaded: the ad is shown, navigation continues when it closes, the cadence restarts', async () => {
  let close: (value: ShowResult) => void = () => {};
  const r = rig({ loaded: true, show: () => new Promise<ShowResult>((resolve) => { close = resolve; }) });
  let done = false;
  const navigation = presentIfAlreadyLoaded(r.deps).then((outcome) => { done = true; return outcome; });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(r.shows(), 1); assert.equal(done, false, 'waits for the ad that is on screen');
  assert.deepEqual(r.presenting, [true]);
  close('shown');
  assert.equal(await navigation, 'shown');
  assert.deepEqual(r.presenting, [true, false]);
  assert.deepEqual(r.log, ['interstitial_due', 'interstitial_ready', 'interstitial_shown', 'interstitial_closed']);
  assert.equal(r.state().clearsSinceLastInterstitial, 0);
});

test('due + NOT loaded: navigation continues in the same task — no wait, no timer, no show', async () => {
  const r = rig({ loaded: false });
  const { value, timers, sameTask } = await immediate(() => presentIfAlreadyLoaded(r.deps));
  assert.equal(value, 'not_loaded');
  assert.equal(timers, 0, 'no timer of any length is started for an unloaded ad');
  assert.equal(sameTask, true, 'resolved before the event loop turned');
  assert.equal(r.shows(), 0); assert.deepEqual(r.presenting, [], 'the game is never put into "ad presenting"');
  assert.deepEqual(r.log, ['interstitial_due', 'interstitial_skipped:not_loaded']);
  assert.equal(r.preloads(), 1, 'loading goes on in the background for a later clear');
  assert.equal(r.state().clearsSinceLastInterstitial, 2, 'still owed: shown at the first clear with a loaded ad');
});

test('ad load error and no network are "not loaded": immediate, even if starting a new load throws', async () => {
  for (const preload of [() => {}, () => { throw new Error('ERR_INTERNET_DISCONNECTED'); }]) {
    const r = rig({ loaded: false, preload });
    const { value, timers, sameTask } = await immediate(() => presentIfAlreadyLoaded(r.deps));
    assert.equal(value, 'not_loaded'); assert.equal(timers, 0); assert.equal(sameTask, true); assert.equal(r.shows(), 0);
  }
});

test('a loaded ad that fails to present, rejects or throws lets navigation continue and clears "presenting"', async () => {
  for (const [show, outcome] of [
    [async () => 'skipped' as const, 'skipped'],
    [() => Promise.reject(new Error('show failed')), 'error'],
    [() => { throw new Error('no root view'); }, 'error'],
  ] as const) {
    const r = rig({ loaded: true, show: show as () => Promise<ShowResult> });
    assert.equal(await presentIfAlreadyLoaded(r.deps), outcome);
    assert.deepEqual(r.presenting, [true, false]);
    assert.equal(r.state().clearsSinceLastInterstitial, 2, 'not counted as shown');
  }
});

test('not due, or ads removed: nothing is asked of the ad at all', async () => {
  for (const options of [{ clears: 1, loaded: true }, { clears: 5, owned: true, loaded: true }]) {
    const r = rig(options);
    const { value, timers, sameTask } = await immediate(() => presentIfAlreadyLoaded(r.deps));
    assert.equal(value, 'not_due'); assert.equal(timers, 0); assert.equal(sameTask, true);
    assert.equal(r.shows(), 0); assert.equal(r.preloads(), 0); assert.deepEqual(r.log, []);
  }
});

test('a lost close callback does not stop the game for good: native state or a touch on the app ends it', async () => {
  const listeners = new Map<string, () => void>();
  const ad: PresentableAd & { loaded: boolean } = { loaded: true, show: async () => {},
    addAdEventListener: (type, listener) => { listeners.set(type, listener as () => void); return () => listeners.delete(type); } };
  // 1. CLOSED never arrives, but the SDK already says the ad is gone.
  const first = presentLoadedAd(ad, { opened: 'opened', closed: 'closed', error: 'error' }, () => {}, 50, 0);
  listeners.get('opened')?.();
  ad.loaded = false;
  assert.equal(await first.result, 'shown');
  // 2. Nothing from the SDK at all: a touch that reaches the app's own UI proves the ad is not covering it.
  ad.loaded = true;
  const second = presentLoadedAd(ad, { opened: 'opened', closed: 'closed', error: 'error' }, () => {}, 50, 0);
  listeners.get('opened')?.();
  second.confirmDismissed();
  assert.equal(await second.result, 'shown');
  // 3. show() was called and nothing ever happened: bounded, then the game continues.
  const third = presentLoadedAd({ ...ad, show: () => new Promise<void>(() => {}) }, { opened: 'opened', closed: 'closed', error: 'error' }, () => {}, 30);
  assert.equal(await third.result, 'skipped');
});

test('there is no code path that waits for an ad to load at Mission Complete', () => {
  const read = (file: string) => fs.readFileSync(file, 'utf8');
  const sources = ['ads.ts', 'adsConfig.ts', 'MonetizationNative.tsx', 'MonetizationContext.tsx', 'interstitialNavigation.ts']
    .map((file) => read(`src/game/monetization/${file}`)).join('\n');
  for (const gone of ['showWhenDue', 'waitUntilReady', 'INTERSTITIAL_LOAD_WAIT_MS', '12_000', '12000'])
    assert.equal(sources.includes(gone), false, `${gone} must not exist`);
  const provider = read('src/game/monetization/MonetizationNative.tsx');
  assert(provider.includes('presentIfAlreadyLoaded('), 'the provider uses the already-loaded-only step');
  assert(provider.includes('interstitialController.showIfReady()'));
  // The navigation step itself: one await, and it is the ad that is already on screen.
  const step = read('src/game/monetization/interstitialNavigation.ts');
  assert.equal((step.match(/\bawait\b/g) ?? []).length, 1);
  assert(/await deps\.show\(\)/.test(step));
  assert.equal(/setTimeout|setInterval/.test(step), false);
  // Two clears, as before; the cadence itself is not part of this hotfix.
  let state: AdClearState = { clearsSinceLastInterstitial: 0, removeAdsOwned: false };
  state = recordSuccessfulClear(state); assert.equal(shouldShowInterstitial(state), false);
  state = recordSuccessfulClear(state); assert.equal(shouldShowInterstitial(state), true);
});
