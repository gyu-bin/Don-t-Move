import type { MonetizationApi } from '../../game/monetization/MonetizationContext';
import type { TextKey } from './strings';

/** What the Remove Ads card is showing. One at a time. */
export type RemoveAdsState = 'purchased' | 'purchasing' | 'restoring' | 'loading' | 'available' | 'error' | 'pending';

export interface RemoveAdsView {
  state: RemoveAdsState;
  /** The store's own localized price string. Never built or converted here. null: not known (yet). */
  price: string | null;
  /** Shown where the price goes while there is none: loading, store unreachable, not on sale on this platform. */
  priceNote: TextKey | null;
  /** The main button is drawn at all. A product that is already owned is not offered again. */
  showBuy: boolean;
  /**
   * What the main button does. When the product could not be loaded from the store it does not sit there
   * disabled: it becomes "try again" and reloads the product, so a tap always does something visible.
   */
  primaryAction: 'purchase' | 'retryStore';
  buyLabel: TextKey;
  buyDisabled: boolean;
  restoreLabel: TextKey;
  restoreDisabled: boolean;
  /** Result of the last purchase / restore, in the player's words. Never an error code. */
  message: TextKey | null;
}

type Input = Pick<MonetizationApi, 'ready' | 'adState' | 'product' | 'purchaseStatus' | 'purchaseMessage' | 'productStatus'>;

/**
 * The card's contents for the current store state. Pure: the purchase, restore and ownership logic stay in the
 * monetization provider; this only decides what is written and which buttons can be pressed.
 */
export function removeAdsView(m: Input): RemoveAdsView {
  const owned = m.adState.removeAdsOwned || m.purchaseStatus === 'owned';
  const purchasing = m.purchaseStatus === 'purchasing', restoring = m.purchaseStatus === 'restoring';
  const busy = purchasing || restoring;
  const price = m.product?.displayPrice || null;
  const priceReady = m.ready && m.productStatus === 'ready' && !!price;
  const state: RemoveAdsState = owned ? 'purchased' : purchasing ? 'purchasing' : restoring ? 'restoring'
    : m.productStatus === 'pending' ? 'pending' : m.productStatus === 'unavailable' ? 'error'
    : priceReady ? 'available' : 'loading';
  // The price stays up while a purchase or a restore runs; a note replaces it only when there is no price.
  const priceNote: TextKey | null = owned || priceReady ? null
    : m.productStatus === 'pending' ? 'storePending' : m.productStatus === 'unavailable' ? 'storeUnavailable' : 'storeLoading';
  const retry = state === 'error';
  return {
    state,
    price: owned ? null : priceReady ? price : null,
    priceNote,
    showBuy: !owned,
    primaryAction: retry ? 'retryStore' : 'purchase',
    buyLabel: retry ? 'storeTryAgain' : purchasing ? 'purchasing' : 'removeAdsBuy',
    buyDisabled: retry ? false : owned || busy || !priceReady,
    restoreLabel: restoring ? 'restoring' : 'restorePurchases',
    // Restore asks the store, so it needs one; on a platform without the product there is nothing to restore.
    restoreDisabled: busy || !m.ready || m.productStatus === 'pending',
    message: m.purchaseMessage,
  };
}
