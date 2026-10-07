import type { Purchase } from 'expo-iap';

export function purchaseGrantsRemoveAds(purchase: Purchase, productId: string | null): boolean {
  return productId !== null && purchase.productId === productId
    && purchase.purchaseState === 'purchased' && !purchaseIsRevoked(purchase);
}

export function purchaseIsRevoked(purchase: Purchase): boolean {
  return 'revocationDateIOS' in purchase && purchase.revocationDateIOS != null;
}

export function purchasesIncludeRemoveAds(purchases: readonly Purchase[], productId: string | null): boolean {
  return purchases.some((purchase) => purchaseGrantsRemoveAds(purchase, productId));
}

/** Serialize hydration, store reads and transaction completion. A slow startup
 * read cannot overwrite a newer purchase, and a failed store read never revokes
 * cached ownership. Only successful active-entitlement queries are authoritative. */
export function createEntitlementService(options: {
  productId: string | null;
  hydrate: () => Promise<void>;
  getPurchases: () => Promise<Purchase[]>;
  restore: () => Promise<void>;
  finish: (purchase: Purchase) => Promise<unknown>;
  applyOwnership: (owned: boolean) => void;
}) {
  let hydration: Promise<void> | undefined;
  let tail: Promise<unknown> = Promise.resolve();
  const hydrate = () => hydration ??= options.hydrate();
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const result = tail.catch(() => {}).then(hydrate).then(work);
    tail = result;
    return result;
  };
  return {
    hydrate,
    sync: (restore = false) => enqueue(async () => {
      if (!options.productId) return null;
      if (restore) await options.restore();
      const purchases = await options.getPurchases();
      const owned = purchasesIncludeRemoveAds(purchases, options.productId);
      options.applyOwnership(owned);
      return owned;
    }),
    complete: (purchase: Purchase) => enqueue(async () => {
      if (!purchaseGrantsRemoveAds(purchase, options.productId)) return false;
      await options.finish(purchase);
      options.applyOwnership(true);
      return true;
    }),
  };
}

export function purchaseErrorKind(error: unknown): 'cancelled' | 'alreadyOwned' | 'pendingApproval' | 'purchaseFailed' {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  // expo-iap 5.8 ErrorCode wire values; kept pure for deterministic unit tests.
  if (code === 'user-cancelled') return 'cancelled';
  if (code === 'already-owned') return 'alreadyOwned';
  if (code === 'pending' || code === 'deferred-payment') return 'pendingApproval';
  return 'purchaseFailed';
}
