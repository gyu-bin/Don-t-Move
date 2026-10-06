import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadProgress } from './src/game/progress/stageProgress';
import { consumeFreshOtaNotice } from './src/ota/applyUpdate';
import { OtaRefresh } from './src/ota/OtaRefresh';
import { OtaToast } from './src/ota/OtaToast';
import { StartupScreen } from './src/ui/branding/StartupScreen';
import { translate } from './src/ui/menu/strings';

const TOAST_MS = 4500;

/** Playable five-stage V1. Native tilt is used on iPhone; Simulator keeps touch fallback. */
export default function App() {
  const [holdSplash, setHoldSplash] = useState(true);
  const [applying, setApplying] = useState(false);
  const [splashRun, setSplashRun] = useState(0);
  const [inGame, setInGame] = useState(false);
  const inGameRef = useRef(false);
  const applyingRef = useRef(false);
  const [applyingLabel, setApplyingLabel] = useState<string | null>(null);
  const releaseSplash = useCallback(() => setHoldSplash(false), []);
  const setGameplay = useCallback((playing: boolean) => {
    inGameRef.current = playing;
    setInGame(playing);
  }, []);
  const showApplying = useCallback(() => {
    if (inGameRef.current || applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    setSplashRun((run) => run + 1);
    void loadProgress().then((progress) => {
      setApplyingLabel(translate(progress.language, 'updateApplying'));
    }).catch(() => {
      setApplyingLabel(translate('ko', 'updateApplying'));
    });
  }, []);
  const hideApplying = useCallback(() => {
    const wasApplying = applyingRef.current;
    applyingRef.current = false;
    setApplying(false);
    if (wasApplying) setApplyingLabel(null);
  }, []);

  useEffect(() => {
    let alive = true;
    let hide: ReturnType<typeof setTimeout> | undefined;
    void consumeFreshOtaNotice().then(async (fresh) => {
      if (!alive || !fresh) return;
      const progress = await loadProgress();
      if (!alive) return;
      setApplyingLabel(translate(progress.language, 'updateApplying'));
      hide = setTimeout(() => setApplyingLabel(null), TOAST_MS);
    });
    return () => {
      alive = false;
      if (hide) clearTimeout(hide);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <StartupScreen key={splashRun} holdSplash={holdSplash} applying={applying} onGameplayChange={setGameplay} />
      </View>
      <OtaRefresh onReady={releaseSplash} onApplying={showApplying} onApplyingDone={hideApplying} inGame={inGame} />
      {applyingLabel ? <OtaToast message={applyingLabel} /> : null}
      <StatusBar style="light" hidden={false} />
    </SafeAreaProvider>
  );
}
