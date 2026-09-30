import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadProgress } from './src/game/progress/stageProgress';
import { applyOtaUpdateIfAvailable, consumeFreshOtaNotice } from './src/ota/applyUpdate';
import { OtaToast } from './src/ota/OtaToast';
import { StartupScreen } from './src/ui/branding/StartupScreen';
import { translate } from './src/ui/menu/strings';

const TOAST_MS = 2800;

/** Playable five-stage V1. Native tilt is used on iPhone; Simulator keeps touch fallback. */
export default function App() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let hide: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      const fresh = await consumeFreshOtaNotice();
      if (cancelled) return;
      if (fresh) {
        const progress = await loadProgress();
        if (cancelled) return;
        setNotice(translate(progress.language, 'updateApplied'));
        hide = setTimeout(() => setNotice(null), TOAST_MS);
      }
      await applyOtaUpdateIfAvailable();
    })();
    return () => {
      cancelled = true;
      if (hide) clearTimeout(hide);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StartupScreen />
      {notice ? <OtaToast message={notice} /> : null}
      <StatusBar style="light" hidden={false} />
    </SafeAreaProvider>
  );
}
