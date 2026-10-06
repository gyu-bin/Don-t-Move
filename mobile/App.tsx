import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadProgress } from './src/game/progress/stageProgress';
import { consumeFreshOtaNotice } from './src/ota/applyUpdate';
import { OtaRefresh } from './src/ota/OtaRefresh';
import { OtaToast } from './src/ota/OtaToast';
import { StartupScreen } from './src/ui/branding/StartupScreen';
import { translate } from './src/ui/menu/strings';

const TOAST_MS = 2800;

/** Playable five-stage V1. Native tilt is used on iPhone; Simulator keeps touch fallback. */
export default function App() {
  const [holdSplash, setHoldSplash] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const releaseSplash = useCallback(() => setHoldSplash(false), []);

  useEffect(() => {
    let alive = true;
    let hide: ReturnType<typeof setTimeout> | undefined;
    void consumeFreshOtaNotice().then(async (fresh) => {
      if (!alive || !fresh) return;
      const progress = await loadProgress();
      if (!alive) return;
      setNotice(translate(progress.language, 'updateApplied'));
      hide = setTimeout(() => setNotice(null), TOAST_MS);
    });
    return () => {
      alive = false;
      if (hide) clearTimeout(hide);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <StartupScreen holdSplash={holdSplash} />
      </View>
      <OtaRefresh onReady={releaseSplash} />
      {notice ? <OtaToast message={notice} /> : null}
      <StatusBar style="light" hidden={false} />
    </SafeAreaProvider>
  );
}
