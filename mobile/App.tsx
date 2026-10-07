import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadProgress } from './src/game/progress/stageProgress';
import { consumeFreshOtaNotice } from './src/ota/applyUpdate';
import { OtaRefresh } from './src/ota/OtaRefresh';
import { OtaToast } from './src/ota/OtaToast';
import type { OtaStatus } from './src/ota/startupFlow';
import { StartupScreen } from './src/ui/branding/StartupScreen';
import { translate } from './src/ui/menu/strings';

const TOAST_MS = 4500;

/**
 * Startup order: native splash → startup screen → Home intro → Home.
 * `holdSplash` is the startup-ready signal turned round: while it is true the startup screen stays and the
 * Home intro has not started. An update found on the way keeps the startup screen up until the runtime is replaced.
 */
export default function App() {
  const [holdSplash, setHoldSplash] = useState(true);
  const [applying, setApplying] = useState(false);
  const [otaStatus, setOtaStatus] = useState<OtaStatus | null>('checking');
  const [splashRun, setSplashRun] = useState(0);
  const [inGame, setInGame] = useState(false);
  const inGameRef = useRef(false);
  const applyingRef = useRef(false);
  const [toast, setToast] = useState<string | null>(null);
  const releaseSplash = useCallback(() => setHoldSplash(false), []);
  const setGameplay = useCallback((playing: boolean) => {
    inGameRef.current = playing;
    setInGame(playing);
  }, []);

  // The reload waits until "Applying update…" has been drawn. One promise per time the startup screen is put in front.
  const shown = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  const armShown = useCallback(() => {
    let resolve = () => {};
    const promise = new Promise<void>((done) => { resolve = done; });
    shown.current = { promise, resolve };
  }, []);
  const applyingShown = useCallback(() => {
    if (!shown.current) armShown();
    return shown.current!.promise;
  }, [armShown]);
  const markApplyingShown = useCallback(() => shown.current?.resolve(), []);

  const showApplying = useCallback(() => {
    if (inGameRef.current || applyingRef.current) return;
    applyingRef.current = true;
    armShown();
    setApplying(true);
    setSplashRun((run) => run + 1);
  }, [armShown]);
  const hideApplying = useCallback(() => {
    applyingRef.current = false;
    shown.current = null;
    setApplying(false);
  }, []);

  // "Update applied" belongs to the launch that first runs a new bundle, and is shown once Home is on screen.
  const freshUpdate = useRef(false);
  const homeSeen = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showAppliedToast = useCallback(() => {
    if (!freshUpdate.current || !homeSeen.current) return;
    freshUpdate.current = false;
    void loadProgress().then((progress) => progress.language).catch(() => 'ko' as const).then((language) => {
      setToast(translate(language, 'updateApplied'));
      toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
    });
  }, []);
  const homeVisible = useCallback(() => {
    homeSeen.current = true;
    showAppliedToast();
  }, [showAppliedToast]);
  useEffect(() => {
    let alive = true;
    void consumeFreshOtaNotice().then((fresh) => {
      if (!alive || !fresh) return;
      freshUpdate.current = true;
      showAppliedToast();
    });
    return () => {
      alive = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [showAppliedToast]);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <StartupScreen key={splashRun} holdSplash={holdSplash} applying={applying} otaStatus={otaStatus}
          onApplyingShown={markApplyingShown} onHomeVisible={homeVisible} onGameplayChange={setGameplay} />
      </View>
      <OtaRefresh onReady={releaseSplash} onStatus={setOtaStatus} onApplying={showApplying} onApplyingDone={hideApplying}
        applyingShown={applyingShown} inGame={inGame} />
      {toast ? <OtaToast message={toast} /> : null}
      <StatusBar style="light" hidden={false} />
    </SafeAreaProvider>
  );
}
