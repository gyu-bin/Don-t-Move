import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  fetchProducts as fetchStoreProducts,
  finishTransaction,
  getAvailablePurchases,
  restorePurchases as restoreStorePurchases,
  useIAP,
} from 'expo-iap';
import {
  recordSuccessfulClear,
  resetClearsAfterShown,
  shouldShowInterstitial,
  type AdClearState,
} from './adState';
import { adsLog, CLEARS_PER_INTERSTITIAL, removeAdsProductId } from './adsConfig';
import { interstitialController } from './ads';
import {
  MonetizationContext,
  type MonetizationApi,
  type PurchaseUiStatus,
  type PurchaseMessage,
  type ProductStatus,
  type MonetizationProduct,
} from './MonetizationContext';
import { DEFAULT_AD_STATE, loadAdState, saveAdState } from './monetizationStorage';
import { createEntitlementService, purchaseErrorKind, purchaseIsRevoked } from './purchases';
import { track } from '../analytics/track';

/** Full AdMob + StoreKit/Play Billing path — only loaded when native modules exist. */
export function MonetizationNativeProvider({ children }: { children: ReactNode }) {
  const [adState, setAdState] = useState<AdClearState>(DEFAULT_AD_STATE);
  const [ready, setReady] = useState(false);
  const [adPresenting, setAdPresenting] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseUiStatus>('idle');
  const [purchaseMessage, setPurchaseMessage] = useState<PurchaseMessage | null>(null);
  const productId = removeAdsProductId(Platform.OS);
  const [product, setProduct] = useState<MonetizationProduct | null>(null);
  const [productStatus, setProductStatus] = useState<ProductStatus>(productId ? 'loading' : 'pending');
  const operationLock = useRef(false);
  const operationToken = useRef(0);
  const purchaseToken = useRef<number | null>(null);
  const purchaseErrorWork = useRef<{ token: number; promise: Promise<void> } | null>(null);
  const productRequest = useRef(0);
  const adStateRef = useRef(adState);
  const presentingLock = useRef(false);
  useEffect(() => {
    adStateRef.current = adState;
  }, [adState]);

  const persist = useCallback((next: AdClearState) => {
    adStateRef.current = next;
    setAdState(next);
    interstitialController.setRemoveAdsOwned(next.removeAdsOwned);
    void saveAdState(next).catch(() => {});
    setPurchaseStatus((status) => status === 'purchasing' || status === 'restoring'
      ? status : next.removeAdsOwned ? 'owned' : 'idle');
  }, []);

  const applyOwnership = useCallback((owned: boolean) => {
    persist({ ...adStateRef.current, removeAdsOwned: owned });
    adsLog('store entitlement synchronized', owned);
  }, [persist]);

  // Factory only captures callbacks; all ref reads occur in queued async operations.
  // eslint-disable-next-line react-hooks/refs
  const entitlement = useMemo(() => createEntitlementService({
    productId,
    hydrate: async () => {
      persist(await loadAdState());
      setReady(true); // Optional store connectivity never blocks gameplay.
    },
    getPurchases: () => getAvailablePurchases({
      alsoPublishToEventListenerIOS: false,
      onlyIncludeActiveItemsIOS: true,
    }),
    restore: restoreStorePurchases,
    finish: (purchase) => finishTransaction({ purchase, isConsumable: false }),
    applyOwnership,
  }), [applyOwnership, persist, productId]);

  const handlePurchaseError = useCallback((error: unknown, token = purchaseToken.current ?? operationToken.current) => {
    if (token !== operationToken.current) return Promise.resolve();
    if (purchaseErrorWork.current?.token === token) return purchaseErrorWork.current.promise;
    // Native StoreKit emits an error event AND rejects requestPurchase for the
    // same failure. Both paths share this operation's single reconciliation.
    if (operationLock.current && purchaseToken.current === null) return Promise.resolve();
    const promise = Promise.resolve().then(async () => {
      const kind = purchaseErrorKind(error);
      adsLog('purchase result', kind);
      let message: PurchaseMessage = kind;
      if (kind === 'alreadyOwned') {
        try {
          const owned = await entitlement.sync();
          message = owned ? 'alreadyOwned' : 'purchaseFailed';
        } catch (syncError) {
          adsLog('already-owned reconciliation failed', syncError);
          message = 'restoreFailed';
        }
      }
      if (token !== operationToken.current) return;
      setPurchaseMessage(message);
      operationLock.current = false;
      purchaseToken.current = null;
      setPurchaseStatus(adStateRef.current.removeAdsOwned ? 'owned' : 'idle');
    });
    purchaseErrorWork.current = { token, promise };
    return promise;
  }, [entitlement]);

  const { connected, requestPurchase, reconnect } = useIAP({
    onPurchaseSuccess: (purchase) => {
      if (!productId || purchase.productId !== productId) return;
      if (purchaseIsRevoked(purchase)) {
        void entitlement.sync()
          .catch((error) => adsLog('revocation sync failed; cache retained', error))
          .finally(() => {
            operationLock.current = false;
            setPurchaseStatus(adStateRef.current.removeAdsOwned ? 'owned' : 'idle');
          });
        return;
      }
      const token = operationToken.current;
      void (async () => {
        try {
          const granted = await entitlement.complete(purchase);
          if (token === operationToken.current) {
            if (granted) track('remove_ads_purchased');
            setPurchaseMessage(granted ? 'purchased' : 'pendingApproval');
          }
        } catch (error) {
          adsLog('finishTransaction failed; entitlement not granted', error);
          if (token === operationToken.current) {
            track('remove_ads_failed', { kind: 'finishFailed' });
            setPurchaseMessage('finishFailed');
          }
        } finally {
          if (token !== operationToken.current) return;
          operationLock.current = false;
          purchaseToken.current = null;
          setPurchaseStatus(adStateRef.current.removeAdsOwned ? 'owned' : 'idle');
        }
      })();
    },
    onPurchaseError: (error) => { void handlePurchaseError(error); },
  });

  const loadProducts = useCallback(async (retryConnection: boolean) => {
    const request = ++productRequest.current;
    setProduct(null);
    if (!productId) { setProductStatus('pending'); return; }
    setProductStatus('loading');
    try {
      const connectionReady = connected || (retryConnection && await reconnect());
      if (request !== productRequest.current) return;
      if (!connectionReady) { setProductStatus('unavailable'); return; }
      const products = await fetchStoreProducts({ skus: [productId], type: 'in-app' });
      if (request !== productRequest.current) return;
      const found = products?.find((item) => item.id === productId && item.type === 'in-app') ?? null;
      setProduct(found);
      setProductStatus(found ? 'ready' : 'unavailable');
    } catch (error) {
      if (request !== productRequest.current) return;
      adsLog('fetchProducts failed', error);
      setProductStatus('unavailable');
    }
  }, [connected, productId, reconnect]);

  const refreshProducts = useCallback(() => loadProducts(true), [loadProducts]);

  useEffect(() => {
    let alive = true;
    void entitlement.hydrate().then(async () => {
      if (!alive) return;
      try {
        await interstitialController.initialize();
        if (alive && !adStateRef.current.removeAdsOwned) interstitialController.preload();
      } catch (error) { adsLog('sdk bootstrap failed', error); }
    });
    return () => { alive = false; interstitialController.dispose(); };
  }, [entitlement]);

  useEffect(() => {
    void Promise.resolve().then(() => loadProducts(false));
    if (!connected || !productId) return;
    const sync = () => {
      // Avoid a stale store query racing an open purchase sheet.
      if (operationLock.current) return;
      void entitlement.sync().catch((error) => adsLog('entitlement sync failed; cache retained', error));
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [connected, entitlement, productId, loadProducts]);

  const recordMissionClear = useCallback(() => {
    const next = recordSuccessfulClear(adStateRef.current);
    adsLog(`clear count ${next.clearsSinceLastInterstitial}/${CLEARS_PER_INTERSTITIAL}`);
    persist(next);
    if (!next.removeAdsOwned) interstitialController.preload();
  }, [persist]);

  const presentInterstitialIfNeeded = useCallback(async () => {
    if (presentingLock.current) return;
    if (!shouldShowInterstitial(adStateRef.current)) {
      adsLog('continue immediately — interstitial not due');
      return;
    }
    track('interstitial_due');
    presentingLock.current = true;
    setAdPresenting(true);
    try {
      const result = await interstitialController.showWhenDue();
      if (result === 'shown') {
        track('interstitial_shown');
        persist(resetClearsAfterShown(adStateRef.current));
      } else {
        track('interstitial_skipped', { reason: result });
      }
    } catch (error) {
      track('interstitial_skipped', { reason: 'error' });
      adsLog('interstitial failed', error);
    } finally {
      setAdPresenting(false);
      presentingLock.current = false;
    }
  }, [persist]);

  const confirmAdDismissed = useCallback(() => {
    if (presentingLock.current) interstitialController.confirmPresentationDismissed();
  }, []);

  const purchaseRemoveAds = useCallback(async () => {
    if (operationLock.current) return;
    if (adStateRef.current.removeAdsOwned) { setPurchaseMessage('alreadyOwned'); return; }
    if (!ready || !connected || !productId || !product || productStatus !== 'ready') {
      setPurchaseMessage('productUnavailable');
      return;
    }
    operationLock.current = true;
    const token = ++operationToken.current;
    purchaseToken.current = token;
    setPurchaseMessage(null);
    setPurchaseStatus('purchasing');
    try {
      await requestPurchase({
        request: Platform.OS === 'ios'
          ? { apple: { sku: productId } }
          : { google: { skus: [productId] } },
        type: 'in-app',
      });
      // Resolving requestPurchase only dispatches the request. The event callback
      // owns completion, transaction finishing and entitlement/UI changes.
    } catch (error) { await handlePurchaseError(error, token); }
  }, [connected, handlePurchaseError, product, productId, productStatus, ready, requestPurchase]);

  const restorePurchases = useCallback(async () => {
    if (operationLock.current) return;
    if (!connected || !productId) { setPurchaseMessage('productUnavailable'); return; }
    operationLock.current = true;
    ++operationToken.current;
    purchaseToken.current = null;
    setPurchaseMessage(null);
    setPurchaseStatus('restoring');
    try {
      const owned = await entitlement.sync(true);
      if (owned) track('remove_ads_restored');
      else track('remove_ads_restore_empty');
      setPurchaseMessage(owned ? 'restored' : 'restoreEmpty');
    } catch (error) {
      adsLog('restore failed; cache retained', error);
      track('remove_ads_failed', { kind: 'restoreFailed' });
      setPurchaseMessage('restoreFailed');
    } finally {
      operationLock.current = false;
      setPurchaseStatus(adStateRef.current.removeAdsOwned ? 'owned' : 'idle');
    }
  }, [connected, entitlement, productId]);

  const value = useMemo<MonetizationApi>(() => ({
    ready,
    adState,
    adPresenting,
    product,
    productStatus,
    refreshProducts,
    purchaseStatus: purchaseStatus === 'purchasing' || purchaseStatus === 'restoring'
      ? purchaseStatus : adState.removeAdsOwned ? 'owned' : 'idle',
    purchaseMessage,
    recordMissionClear,
    presentInterstitialIfNeeded,
    confirmAdDismissed,
    purchaseRemoveAds,
    restorePurchases,
    clearPurchaseMessage: () => setPurchaseMessage(null),
  }), [
    ready, adState, adPresenting, product, productStatus, refreshProducts, purchaseStatus, purchaseMessage,
    recordMissionClear, presentInterstitialIfNeeded, confirmAdDismissed, purchaseRemoveAds, restorePurchases,
  ]);

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
}
