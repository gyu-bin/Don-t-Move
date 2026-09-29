import type { Purchase } from 'expo-iap';
import { REMOVE_ADS_PRODUCT_ID } from './adsConfig';

export function purchaseGrantsRemoveAds(purchase: Purchase): boolean {
  return purchase.productId === REMOVE_ADS_PRODUCT_ID;
}

export function purchasesIncludeRemoveAds(purchases: readonly Purchase[]): boolean {
  return purchases.some(purchaseGrantsRemoveAds);
}
