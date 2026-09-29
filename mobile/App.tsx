import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyOtaUpdateIfAvailable } from './src/ota/applyUpdate';
import { StartupScreen } from './src/ui/branding/StartupScreen';

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
