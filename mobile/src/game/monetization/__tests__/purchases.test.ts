import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Purchase } from 'expo-iap';
import { removeAdsProductId } from '../adsConfig';
import { createEntitlementService, purchaseErrorKind, purchaseGrantsRemoveAds } from '../purchases';

const sku = 'com.dontmove.removeads';
const purchase = (productId = sku, purchaseState = 'purchased') => ({
  productId, purchaseState, id: 'transaction-1',
}) as Purchase;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function harness(cached = false) {
  const state = { owned: false, cached, items: [] as Purchase[], failQuery: false, failFinish: false, finishes: 0, restores: 0 };
  const service = createEntitlementService({
    productId: sku,
    hydrate: async () => { state.owned = state.cached; },
    getPurchases: async () => { if (state.failQuery) throw new Error('offline'); return state.items; },
    restore: async () => { state.restores++; },
    finish: async () => { state.finishes++; if (state.failFinish) throw new Error('finish failed'); },
    applyOwnership: (owned) => { state.owned = owned; state.cached = owned; },
  });
  return { state, service };
}

test('platform SKU contract: exact ASC ID, no invented Android/web product', () => {
  assert.equal(removeAdsProductId('ios'), sku);
  assert.equal(removeAdsProductId('android'), null);
  assert.equal(removeAdsProductId('web'), null);
  assert.equal(purchaseGrantsRemoveAds(purchase('remove_ads'), sku), false);
  assert.equal(purchaseGrantsRemoveAds(purchase(), null), false);
});
test('pending/unknown purchase cannot finish or grant entitlement', async () => {
  const { state, service } = harness();
  for (const phase of ['pending', 'unknown']) assert.equal(await service.complete(purchase(sku, phase)), false);
  assert.equal(state.finishes, 0);
  assert.equal(state.owned, false);
});
test('purchase grants only after non-consumable finish resolves', async () => {
  let owned = false;
  const finish = deferred<void>();
  const service = createEntitlementService({ productId: sku, hydrate: async () => {}, getPurchases: async () => [], restore: async () => {}, finish: () => finish.promise, applyOwnership: (next) => { owned = next; } });
  const pending = service.complete(purchase());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(owned, false);
  finish.resolve();
  assert.equal(await pending, true);
  assert.equal(owned, true);
});
test('finish failure never grants; next retry can succeed', async () => {
  const { state, service } = harness();
  state.failFinish = true;
  await assert.rejects(service.complete(purchase()));
  assert.equal(state.owned, false);
  state.failFinish = false;
  await service.complete(purchase());
  assert.equal(state.owned, true);
});
test('restore found/none returns authoritative result directly, independent of React updates', async () => {
  const { state, service } = harness(true);
  state.items = [purchase()];
  assert.equal(await service.sync(true), true);
  assert.equal(state.owned, true);
  state.items = [];
  assert.equal(await service.sync(true), false);
  assert.equal(state.owned, false);
  assert.equal(state.cached, false);
  assert.equal(state.restores, 2);
});
test('restart hydrates cache; failed store query preserves it; successful empty sync revokes it', async () => {
  const { state, service } = harness(true);
  state.failQuery = true;
  await service.hydrate();
  assert.equal(state.owned, true);
  await assert.rejects(service.sync());
  assert.equal(state.owned, true);
  state.failQuery = false;
  assert.equal(await service.sync(), false);
  assert.equal(state.owned, false);
});
test('late startup query cannot overwrite a subsequent completed purchase', async () => {
  const query = deferred<Purchase[]>();
  const ownership: boolean[] = [];
  const service = createEntitlementService({ productId: sku, hydrate: async () => {}, getPurchases: () => query.promise, restore: async () => {}, finish: async () => {}, applyOwnership: (next) => ownership.push(next) });
  const startup = service.sync();
  const buying = service.complete(purchase());
  query.resolve([]);
  await Promise.all([startup, buying]);
  assert.deepEqual(ownership, [false, true]);
});
test('already-owned recovery queries store and grants valid active ownership', async () => {
  assert.equal(purchaseErrorKind({ code: 'already-owned' }), 'alreadyOwned');
  const { state, service } = harness();
  state.items = [purchase()];
  await service.sync();
  assert.equal(state.owned, true);
});
test('cancel/error handling does not touch entitlement; cached and unowned states preserved', async () => {
  for (const cached of [false, true]) {
    const { state, service } = harness(cached);
    await service.hydrate();
    assert.equal(purchaseErrorKind({ code: 'user-cancelled' }), 'cancelled');
    assert.equal(purchaseErrorKind(new Error('network')), 'purchaseFailed');
    assert.equal(purchaseErrorKind({ code: 'deferred-payment' }), 'pendingApproval');
    assert.equal(state.owned, cached);
  }
});
test('unconfigured Android makes no store requests or entitlement changes', async () => {
  let calls = 0;
  const service = createEntitlementService({ productId: null, hydrate: async () => {}, getPurchases: async () => { calls++; return []; }, restore: async () => { calls++; }, finish: async () => { calls++; }, applyOwnership: () => { calls++; } });
  assert.equal(await service.sync(true), null);
  assert.equal(await service.complete(purchase()), false);
  assert.equal(calls, 0);
});

test('revoked matching StoreKit transaction never grants ownership', () => {
  assert.equal(purchaseGrantsRemoveAds({ ...purchase(), revocationDateIOS: 123456 } as Purchase, sku), false);
});
