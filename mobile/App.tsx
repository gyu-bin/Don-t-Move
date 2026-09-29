import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StartupScreen } from './src/ui/branding/StartupScreen';

async function applyOtaUpdateIfAvailable() {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('[OTA] update check failed', error);
  }
}

/** Playable five-stage V1. Native tilt is used on iPhone; Simulator keeps touch fallback. */
export default function App() {
  useEffect(() => {
    void applyOtaUpdateIfAvailable();
  }, []);

  return (
    <SafeAreaProvider>
      <StartupScreen />
      <StatusBar style="light" hidden={false} />
    </SafeAreaProvider>
  );
}
