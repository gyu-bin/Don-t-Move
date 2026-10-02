import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  recordSuccessfulClear,
  shouldShowInterstitial,
  type AdClearState,
} from './adState';
import { adsLog, CLEARS_PER_INTERSTITIAL } from './adsConfig';
import { DEFAULT_AD_STATE, loadAdState, saveAdState } from './monetizationStorage';
import { monetizationNativeReady } from './nativeGate';

export type PurchaseUiStatus = 'idle' | 'purchasing' | 'restoring' | 'owned';

/** Store-localized price shape — avoids importing expo-iap in the stub path. */
export type MonetizationProduct = {
  id: string;
  displayPrice: string;
};

export type MonetizationApi = {
  ready: boolean;
  adState: AdClearState;
  adPresenting: boolean;
  product: MonetizationProduct | null;
  purchaseStatus: PurchaseUiStatus;
  purchaseMessage: string | null;
  recordMissionClear: () => void;
  /** Call from Mission Complete → Next. Never blocks forever. */
  presentInterstitialIfNeeded: () => Promise<void>;
  /** A touch on app UI while adPresenting proves the ad is gone; recovers a lost close signal. */
  confirmAdDismissed: () => void;
  purchaseRemoveAds: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  clearPurchaseMessage: () => void;
};

export const MonetizationContext = createContext<MonetizationApi | null>(null);

const unavailablePurchase = async () => {
  adsLog('iap unavailable until Dev Build includes expo-iap');
};

/** Counter + skip-ads path used when AdMob/IAP native modules are not in the binary. */
function MonetizationStubProvider({ children }: { children: ReactNode }) {
  const [adState, setAdState] = useState<AdClearState>(DEFAULT_AD_STATE);
  const [ready, setReady] = useState(false);
  const adStateRef = useRef(adState);
  useEffect(() => {
    adStateRef.current = adState;
  }, [adState]);

  const persist = useCallback((next: AdClearState) => {
    adStateRef.current = next;
    setAdState(next);
    void saveAdState(next).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    void loadAdState().then((stored) => {
      if (!alive) return;
      persist(stored);
      setReady(true);
      adsLog('stub mode — gameplay continues without native ads/iap');
    });
    return () => {
      alive = false;
    };
  }, [persist]);

  const recordMissionClear = useCallback(() => {
    const next = recordSuccessfulClear(adStateRef.current);
    adsLog(`clear count ${next.clearsSinceLastInterstitial}/${CLEARS_PER_INTERSTITIAL}`);
    persist(next);
  }, [persist]);

  const presentInterstitialIfNeeded = useCallback(async () => {
    if (shouldShowInterstitial(adStateRef.current)) {
      adsLog('interstitial skipped — native AdMob absent');
    }
  }, []);

  const value = useMemo<MonetizationApi>(() => ({
    ready,
    adState,
    adPresenting: false,
    product: null,
    purchaseStatus: adState.removeAdsOwned ? 'owned' : 'idle',
    purchaseMessage: null,
    recordMissionClear,
    presentInterstitialIfNeeded,
    confirmAdDismissed: () => {},
    purchaseRemoveAds: unavailablePurchase,
    restorePurchases: unavailablePurchase,
    clearPurchaseMessage: () => {},
  }), [ready, adState, recordMissionClear, presentInterstitialIfNeeded]);

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
}

/** Optional native-service render failure must not blank Home. A repeated child
 * failure in the service-free tree escapes this boundary to the app diagnostics. */
class MonetizationBoundary extends Component<{children: ReactNode; fallback: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch(error: Error, info: {componentStack?: string | null}) {
    if (__DEV__) console.error('[BOOT] optional monetization subtree failed', error, info.componentStack);
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const Native = useMemo(() => {
    if (!monetizationNativeReady()) return null;
    try {
      // Lazy require so missing TurboModules never evaluate getEnforcing at import time.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('./MonetizationNative').MonetizationNativeProvider as ComponentType<{ children: ReactNode }>;
    } catch (error) {
      adsLog('native provider load failed', error);
      return null;
    }
  }, []);

  if (Native) return <MonetizationBoundary fallback={<MonetizationStubProvider>{children}</MonetizationStubProvider>}><Native>{children}</Native></MonetizationBoundary>;
  return <MonetizationStubProvider>{children}</MonetizationStubProvider>;
}

export function useMonetization(): MonetizationApi {
  const value = useContext(MonetizationContext);
  if (!value) {
    return {
      ready: false,
      adState: DEFAULT_AD_STATE,
      adPresenting: false,
      product: null,
      purchaseStatus: 'idle',
      purchaseMessage: null,
      recordMissionClear: () => {},
      presentInterstitialIfNeeded: async () => {},
      confirmAdDismissed: () => {},
      purchaseRemoveAds: async () => {},
      restorePurchases: async () => {},
      clearPurchaseMessage: () => {},
    };
  }
  return value;
}
