import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { VisualPlaygroundScreen } from './src/ui/VisualPlaygroundScreen';

/** Playable five-stage V1. Native tilt is used on iPhone; Simulator keeps touch fallback. */
export default function App() {
  return (
    <SafeAreaProvider>
      <VisualPlaygroundScreen />
      <StatusBar hidden />
    </SafeAreaProvider>
  );
}
