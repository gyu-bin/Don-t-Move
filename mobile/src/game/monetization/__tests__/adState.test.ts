import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
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
