import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adsViewOf,
  countClear,
  markRemoveAdsOwned,
  recordSuccessfulClear,
  resetClearsAfterShown,
  shouldShowInterstitial,
} from '../adState';

test('clear #1 no ad; #2 eligible; shown resets; #3 no ad; #4 eligible', () => {
  let state = { clearsSinceLastInterstitial: 0, removeAdsOwned: false };
  state = recordSuccessfulClear(state);
  assert.equal(state.clearsSinceLastInterstitial, 1);
  assert.equal(shouldShowInterstitial(state), false);

  state = recordSuccessfulClear(state);
  assert.equal(state.clearsSinceLastInterstitial, 2);
  assert.equal(shouldShowInterstitial(state), true);

  state = resetClearsAfterShown(state);
  assert.equal(state.clearsSinceLastInterstitial, 0);
  assert.equal(shouldShowInterstitial(state), false);

  state = recordSuccessfulClear(state);
  assert.equal(shouldShowInterstitial(state), false);
  state = recordSuccessfulClear(state);
  assert.equal(shouldShowInterstitial(state), true);
});

test('failed load keeps counter so next clear transition can retry', () => {
  let state = { clearsSinceLastInterstitial: 2, removeAdsOwned: false };
  assert.equal(shouldShowInterstitial(state), true);
  // skip without reset
  state = recordSuccessfulClear(state);
  assert.equal(state.clearsSinceLastInterstitial, 3);
  assert.equal(shouldShowInterstitial(state), true);
});

test('removeAdsOwned disables ads immediately and ignores clears', () => {
  let state = { clearsSinceLastInterstitial: 2, removeAdsOwned: false };
  state = markRemoveAdsOwned(state);
  assert.equal(state.removeAdsOwned, true);
  assert.equal(state.clearsSinceLastInterstitial, 0);
  assert.equal(shouldShowInterstitial(state), false);
  state = recordSuccessfulClear(state);
  assert.equal(state.clearsSinceLastInterstitial, 0);
  assert.equal(shouldShowInterstitial(state), false);
});

test('QA "show ads" for an owner: clears count and ads become due, and the purchase is never unsaved', () => {
  const owned = { clearsSinceLastInterstitial: 0, removeAdsOwned: true };
  // Switch off: an owner's clears are not counted and no ad is ever due (unchanged behaviour).
  let state = countClear(countClear(owned, false), false);
  assert.deepEqual(state, owned); assert.equal(shouldShowInterstitial(adsViewOf(state, false)), false);
  // Switch on: counted, due after two clears, reset after the ad was shown.
  state = countClear(owned, true);
  assert.equal(state.clearsSinceLastInterstitial, 1); assert.equal(shouldShowInterstitial(adsViewOf(state, true)), false);
  state = countClear(state, true);
  assert.equal(shouldShowInterstitial(adsViewOf(state, true)), true);
  assert.equal(shouldShowInterstitial(adsViewOf(resetClearsAfterShown(state), true)), false);
  // What is saved keeps the purchase at every step; only the view the ad code reads is masked.
  for (const saved of [countClear(owned, true), state, resetClearsAfterShown(state)]) assert.equal(saved.removeAdsOwned, true);
  assert.equal(adsViewOf(state, true).removeAdsOwned, false); assert.equal(state.removeAdsOwned, true, 'the saved state is not mutated');
  // Switch back off (or the app restarts): no ad is due again, whatever was counted meanwhile.
  assert.equal(shouldShowInterstitial(adsViewOf(state, false)), false);
  // For someone who has not bought it, the switch changes nothing.
  const free = { clearsSinceLastInterstitial: 1, removeAdsOwned: false };
  assert.deepEqual(countClear(free, true), countClear(free, false)); assert.equal(adsViewOf(free, true), free);
});
