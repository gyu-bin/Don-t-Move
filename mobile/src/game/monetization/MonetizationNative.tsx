import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ErrorCode, finishTransaction, useIAP, isUserCancelledError } from 'expo-iap';
import {
  markRemoveAdsOwned,
  recordSuccessfulClear,
  resetClearsAfterShown,
  shouldShowInterstitial,
  type AdClearState,
} from './adState';
import { adsLog, CLEARS_PER_INTERSTITIAL, REMOVE_ADS_PRODUCT_ID } from './adsConfig';
import { interstitialController } from './ads';
import {
  MonetizationContext,
  type MonetizationApi,
  type PurchaseUiStatus,
} from './MonetizationContext';
import { DEFAULT_AD_STATE, loadAdState, saveAdState } from './monetizationStorage';
import { purchaseGrantsRemoveAds, purchasesIncludeRemoveAds } from './purchases';

/** Full AdMob + StoreKit/Play Billing path — only loaded when native modules exist. */
export function MonetizationNativeProvider({ children }: { children: ReactNode }) {
  const [adState, setAdState] = useState<AdClearState>(DEFAULT_AD_STATE);
  const [ready, setReady] = useState(false);
  const [adPresenting, setAdPresenting] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseUiStatus>('idle');
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
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
    if (next.removeAdsOwned) setPurchaseStatus('owned');
  }, []);

  const grantRemoveAds = useCallback(() => {
    persist(markRemoveAdsOwned(adStateRef.current));
    interstitialController.dispose();
    adsLog('remove ads owned');
  }, [persist]);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    getAvailablePurchases,
    restorePurchases: restoreIap,
    availablePurchases,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void (async () => {
        try {
          if (purchaseGrantsRemoveAds(purchase)) grantRemoveAds();
          await finishTransaction({ purchase, isConsumable: false });
        } catch (error) {
          adsLog('finishTransaction failed', error);
        } finally {
          setPurchaseStatus((status) => (status === 'purchasing' ? 'idle' : status));
        }
      })();
    },
    onPurchaseError: (error) => {
      setPurchaseStatus('idle');
      if (isUserCancelledError(error) || error.code === ErrorCode.UserCancelled) {
        setPurchaseMessage(null);
        return;
      }
      setPurchaseMessage(error.message || 'Purchase failed');
    },
  });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await loadAdState();
      if (!alive) return;
      persist(stored);
      try {
        await interstitialController.initialize();
        if (!stored.removeAdsOwned) interstitialController.preload();
      } catch (error) {
        adsLog('sdk bootstrap failed', error);
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
      interstitialController.dispose();
    };
  }, [persist]);

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: [REMOVE_ADS_PRODUCT_ID], type: 'in-app' }).catch((error) => {
      adsLog('fetchProducts failed', error);
    });
    void getAvailablePurchases().catch((error) => {
      adsLog('getAvailablePurchases failed', error);
    });
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    if (purchasesIncludeRemoveAds(availablePurchases)) grantRemoveAds();
  }, [availablePurchases, grantRemoveAds]);

  const product = products.find((item) => item.id === REMOVE_ADS_PRODUCT_ID) ?? null;

  const recordMissionClear = useCallback(() => {
    const next = recordSuccessfulClear(adStateRef.current);
    adsLog(`clear count ${next.clearsSinceLastInterstitial}/${CLEARS_PER_INTERSTITIAL}`);
    persist(next);
    if (!next.removeAdsOwned) interstitialController.preload();
  }, [persist]);

  const presentInterstitialIfNeeded = useCallback(async () => {
    if (presentingLock.current) return;
    const current = adStateRef.current;
    if (!shouldShowInterstitial(current)) return;
    presentingLock.current = true;
    setAdPresenting(true);
    try {
      const result = await interstitialController.showIfReady();
      if (result === 'shown') persist(resetClearsAfterShown(adStateRef.current));
    } catch (error) {
      adsLog('interstitial failed', error);
    } finally {
      setAdPresenting(false);
      presentingLock.current = false;
    }
  }, [persist]);

  const purchaseRemoveAds = useCallback(async () => {
    if (adStateRef.current.removeAdsOwned || purchaseStatus === 'purchasing') return;
    setPurchaseMessage(null);
    setPurchaseStatus('purchasing');
    try {
      await requestPurchase({
        request: {
          apple: { sku: REMOVE_ADS_PRODUCT_ID },
          google: { skus: [REMOVE_ADS_PRODUCT_ID] },
        },
        type: 'in-app',
      });
    } catch (error) {
      setPurchaseStatus(adStateRef.current.removeAdsOwned ? 'owned' : 'idle');
      if (error && typeof error === 'object' && 'code' in error
        && (error as { code?: string }).code === ErrorCode.UserCancelled) {
        setPurchaseMessage(null);
        return;
      }
      setPurchaseMessage(error instanceof Error ? error.message : 'Purchase failed');
    }
  }, [purchaseStatus, requestPurchase]);

  const restorePurchases = useCallback(async () => {
    if (purchaseStatus === 'restoring') return;
    setPurchaseMessage(null);
    setPurchaseStatus('restoring');
    try {
      await restoreIap();
      await getAvailablePurchases();
      if (adStateRef.current.removeAdsOwned) setPurchaseMessage(null);
      else setPurchaseMessage('No purchases to restore');
    } catch (error) {
      setPurchaseMessage(error instanceof Error ? error.message : 'Restore failed');
    } finally {
      setPurchaseStatus(adStateRef.current.removeAdsOwned ? 'owned' : 'idle');
    }
  }, [getAvailablePurchases, purchaseStatus, restoreIap]);

  const value = useMemo<MonetizationApi>(() => ({
    ready,
    adState,
    adPresenting,
    product,
    purchaseStatus: adState.removeAdsOwned ? 'owned' : purchaseStatus,
    purchaseMessage,
    recordMissionClear,
    presentInterstitialIfNeeded,
    purchaseRemoveAds,
    restorePurchases,
    clearPurchaseMessage: () => setPurchaseMessage(null),
  }), [
    ready, adState, adPresenting, product, purchaseStatus, purchaseMessage,
    recordMissionClear, presentInterstitialIfNeeded, purchaseRemoveAds, restorePurchases,
  ]);

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
}
