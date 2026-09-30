import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextSeenUpdateId, shouldShowOtaToast } from './otaNotice';

test('toast only on a newly applied downloaded update', () => {
  assert.equal(shouldShowOtaToast({
    dev: false, enabled: true, embedded: false, updateId: 'new', seenId: 'embedded',
  }), true);
  assert.equal(shouldShowOtaToast({
    dev: false, enabled: true, embedded: false, updateId: 'new', seenId: 'new',
  }), false);
  assert.equal(shouldShowOtaToast({
    dev: false, enabled: true, embedded: true, updateId: null, seenId: null,
  }), false);
  assert.equal(shouldShowOtaToast({
    dev: true, enabled: true, embedded: false, updateId: 'new', seenId: null,
  }), false);
});

test('seen id tracks the running bundle', () => {
  assert.equal(nextSeenUpdateId(true, null), 'embedded');
  assert.equal(nextSeenUpdateId(false, 'abc'), 'abc');
  assert.equal(nextSeenUpdateId(false, null), null);
});
