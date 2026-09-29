import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StartupScreen } from './src/ui/branding/StartupScreen';

/** Playable five-stage V1. Native tilt is used on iPhone; Simulator keeps touch fallback. */
export default function App() {
  return (
    <SafeAreaProvider>
      <StartupScreen />
      <StatusBar hidden />
    </SafeAreaProvider>
  );
}
