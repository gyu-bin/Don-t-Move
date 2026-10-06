import assert from 'node:assert/strict';
import { test } from 'node:test';

import { coldStartGate, nextSeenUpdateId, shouldReloadPending, shouldShowOtaToast } from './otaNotice';

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

test('a downloaded update that is not running reloads immediately', () => {
  assert.equal(shouldReloadPending(true, 'old', 'new'), false);
  assert.equal(shouldReloadPending(false, 'old', null), false);
  assert.equal(shouldReloadPending(false, 'old', 'old'), false);
  assert.equal(shouldReloadPending(false, 'old', 'new'), true);
  assert.equal(shouldReloadPending(false, null, 'new'), true);
});

test('cold start stays on the splash until a downloaded bundle is running', () => {
  assert.equal(coldStartGate({
    startupRunning: true, checking: false, downloading: false, pending: true, runningId: 'old', downloadedId: 'new',
  }), 'wait');
  assert.equal(coldStartGate({
    startupRunning: false, checking: false, downloading: true, pending: false, runningId: 'old', downloadedId: null,
  }), 'wait');
  assert.equal(coldStartGate({
    startupRunning: false, checking: false, downloading: false, pending: true, runningId: 'old', downloadedId: 'new',
  }), 'reload');
  assert.equal(coldStartGate({
    startupRunning: false, checking: false, downloading: false, pending: true, runningId: 'old', downloadedId: null,
  }), 'reload');
  assert.equal(coldStartGate({
    startupRunning: false, checking: false, downloading: false, pending: false, runningId: 'new', downloadedId: 'new',
  }), 'fetch');
  assert.equal(coldStartGate({
    startupRunning: false, checking: false, downloading: false, pending: false, runningId: 'old', downloadedId: null,
  }), 'fetch');
});

test('seen id tracks the running bundle', () => {
  assert.equal(nextSeenUpdateId(true, null), 'embedded');
  assert.equal(nextSeenUpdateId(false, 'abc'), 'abc');
  assert.equal(nextSeenUpdateId(false, null), null);
});
