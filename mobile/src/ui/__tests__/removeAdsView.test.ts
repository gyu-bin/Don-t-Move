/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { removeAdsView } from '../menu/removeAdsView';
import { translate, translations } from '../menu/strings';
import type { TextKey } from '../menu/strings';
import type { MonetizationApi, PurchaseMessage } from '../../game/monetization/MonetizationContext';
import { REMOVE_ADS_PRODUCT_IDS, removeAdsProductId } from '../../game/monetization/adsConfig';

type Input = Parameters<typeof removeAdsView>[0];
const PRICE = '₩4,900';
const base: Input = { ready: true, adState: { clearsSinceLastInterstitial: 0, removeAdsOwned: false }, product: { id: REMOVE_ADS_PRODUCT_IDS.ios, displayPrice: PRICE },
  purchaseStatus: 'idle', purchaseMessage: null, productStatus: 'ready' };
const view = (patch: Partial<Input> = {}) => removeAdsView({ ...base, ...patch });
const ko = (key: TextKey | null) => (key ? translate('ko', key) : null);

test('The product is the App Store non-consumable com.dontmove.removeads; Android has no product and invents none', () => {
  assert.equal(removeAdsProductId('ios'), 'com.dontmove.removeads');
  assert.equal(removeAdsProductId('android'), null);
});

test('Available: title, what it is, the store price as given, a buy button and a restore button', () => {
  const v = view();
  assert.equal(v.state, 'available');
  assert.equal(v.price, PRICE, 'the localized price string of the store, untouched');
  assert.equal(v.priceNote, null);
  assert.equal(v.showBuy, true); assert.equal(v.buyDisabled, false); assert.equal(ko(v.buyLabel), '광고 제거 구매');
  assert.equal(v.restoreDisabled, false); assert.equal(ko(v.restoreLabel), '구매 복원');
  assert.equal(v.showRetry, false); assert.equal(v.message, null);
  assert.equal(translate('ko', 'removeAds'), '광고 제거');
  assert(translate('ko', 'removeAdsDetail').startsWith('한 번 구매하면 게임 내 광고가 영구적으로 제거됩니다.'));
  // Whatever the store sends is what is shown: other storefronts, other currencies.
  for (const price of ['$3.99', '¥600', '3,99 €']) assert.equal(view({ product: { id: 'x', displayPrice: price } }).price, price);
});

test('No price is ever written in the app: the screen and its strings hold no currency amount', () => {
  for (const file of ['src/ui/menu/RemoveAdsCard.tsx', 'src/ui/menu/removeAdsView.ts', 'src/ui/menu/MenuScreens.tsx'])
    assert.equal(/[₩$¥€]\s?\d|\d[\d,.]*\s?원/.test(fs.readFileSync(file, 'utf8')), false, file);
  for (const language of ['ko', 'en'] as const) for (const [key, text] of Object.entries(translations[language]))
    assert.equal(/[₩$¥€]\s?\d|\d[\d,.]*\s?원/.test(text), false, `${language}.${key}`);
});

test('Loading: "가격 불러오는 중..." where the price goes, and nothing can be bought yet', () => {
  for (const patch of [{ productStatus: 'loading' as const, product: null }, { ready: false }, { product: null }]) {
    const v = view(patch);
    assert.equal(v.state, 'loading'); assert.equal(v.price, null);
    assert.equal(ko(v.priceNote), '가격 불러오는 중...');
    assert.equal(v.showBuy, true); assert.equal(v.buyDisabled, true);
  }
});

test('Store unreachable: a plain sentence, a retry, no purchase; restore stays possible', () => {
  const v = view({ productStatus: 'unavailable', product: null });
  assert.equal(v.state, 'error');
  assert.equal(ko(v.priceNote), '스토어 정보를 불러오지 못했습니다.');
  assert.equal(v.buyDisabled, true); assert.equal(v.showRetry, true); assert.equal(v.restoreDisabled, false);
});

test('Purchasing and restoring: the working button says so and both buttons are disabled', () => {
  const buying = view({ purchaseStatus: 'purchasing' });
  assert.equal(buying.state, 'purchasing'); assert.equal(ko(buying.buyLabel), '구매 처리 중...');
  assert.equal(buying.buyDisabled, true); assert.equal(buying.restoreDisabled, true);
  assert.equal(buying.price, PRICE, 'the price stays on screen');
  const restoring = view({ purchaseStatus: 'restoring' });
  assert.equal(restoring.state, 'restoring'); assert.equal(ko(restoring.restoreLabel), '구매 내역 확인 중...');
  assert.equal(restoring.buyDisabled, true); assert.equal(restoring.restoreDisabled, true);
});

test('Purchased: "구매 완료", no buy button and no price; restore remains', () => {
  for (const patch of [{ adState: { clearsSinceLastInterstitial: 0, removeAdsOwned: true } }, { purchaseStatus: 'owned' as const }]) {
    const v = view(patch);
    assert.equal(v.state, 'purchased');
    assert.equal(v.showBuy, false); assert.equal(v.buyDisabled, true); assert.equal(v.price, null); assert.equal(v.priceNote, null);
    assert.equal(v.restoreDisabled, false); assert.equal(v.showRetry, false);
  }
  // Ownership kept from the cache with the store unreachable is still "purchased", not an error.
  const offline = view({ adState: { clearsSinceLastInterstitial: 0, removeAdsOwned: true }, productStatus: 'unavailable', product: null });
  assert.equal(offline.state, 'purchased'); assert.equal(offline.showRetry, false);
  assert.equal(translate('ko', 'removeAdsOwned'), '구매 완료 ✓');
  assert.equal(translate('ko', 'removeAdsOwnedDetail'), '이 기기에서 광고가 표시되지 않습니다.');
});

test('Android without a registered product: not for sale, purchase and restore both disabled', () => {
  const v = view({ productStatus: 'pending', product: null });
  assert.equal(v.state, 'pending'); assert.equal(v.buyDisabled, true); assert.equal(v.restoreDisabled, true);
  assert.equal(v.price, null); assert.equal(ko(v.priceNote), '아직 구매할 수 없는 상품입니다.'); assert.equal(v.showRetry, false);
});

test('Every purchase / restore result has its own sentence, in Korean and English, with no code in it', () => {
  const expected: Record<PurchaseMessage, string> = {
    purchased: '광고가 제거되었습니다.',
    restored: '구매 내역을 복원했습니다.',
    restoreEmpty: '복원할 구매 내역이 없습니다.',
    restoreFailed: '구매 내역을 복원하지 못했습니다.\n잠시 후 다시 시도해 주세요.',
    cancelled: '구매가 취소되었습니다.',
    purchaseFailed: '구매를 완료하지 못했습니다.\n잠시 후 다시 시도해 주세요.',
    alreadyOwned: '이미 구매한 상품입니다.',
    productUnavailable: translate('ko', 'productUnavailable'),
    pendingApproval: translate('ko', 'pendingApproval'),
    finishFailed: translate('ko', 'finishFailed'),
  };
  for (const [message, text] of Object.entries(expected) as [PurchaseMessage, string][]) {
    const v = view({ purchaseMessage: message });
    assert.equal(ko(v.message), text, message);
    for (const language of ['ko', 'en'] as const) {
      const shown = translate(language, message);
      assert(shown.length > 0 && !/E_[A-Z]|Error|error code|undefined|null|\bat \w+\.|[a-z]+-[a-z]+ed\b/.test(shown), `${language}.${message}: ${shown}`);
    }
  }
});

test('The card keeps to the monetization API: it defines no purchase or store call of its own', () => {
  const card = fs.readFileSync('src/ui/menu/RemoveAdsCard.tsx', 'utf8') + fs.readFileSync('src/ui/menu/removeAdsView.ts', 'utf8');
  assert.equal(/expo-iap|requestPurchase|fetchProducts|getAvailablePurchases|AsyncStorage/.test(card), false);
  for (const call of ['purchaseRemoveAds', 'restorePurchases', 'refreshProducts'] satisfies (keyof MonetizationApi)[]) assert(card.includes(`monetization.${call}()`), call);
});
