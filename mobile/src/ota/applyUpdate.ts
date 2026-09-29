import { TurboModuleRegistry } from 'react-native';

function hasExpoUpdatesNative(): boolean {
  try {
    return TurboModuleRegistry.get('ExpoUpdates') != null;
  } catch {
    return false;
  }
}

/** Check/fetch/reload OTA only when expo-updates native is present (prod/preview builds). */
export async function applyOtaUpdateIfAvailable(): Promise<void> {
  if (__DEV__ || !hasExpoUpdatesNative()) return;

  try {
    // Lazy require — top-level import crashes Expo Go / old Dev Clients.
    const Updates = require('expo-updates') as typeof import('expo-updates');
    if (!Updates.isEnabled) return;

    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('[OTA] update check failed', error);
  }
}
