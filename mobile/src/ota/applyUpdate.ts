import AsyncStorage from '@react-native-async-storage/async-storage';
import { TurboModuleRegistry } from 'react-native';

import { nextSeenUpdateId, OTA_SEEN_UPDATE_KEY, shouldShowOtaToast } from './otaNotice';

function hasExpoUpdatesNative(): boolean {
  try {
    return TurboModuleRegistry.get('ExpoUpdates') != null;
  } catch {
    return false;
  }
}

function updatesModule(): typeof import('expo-updates') | null {
  if (__DEV__ || !hasExpoUpdatesNative()) return null;
  try {
    const Updates = require('expo-updates') as typeof import('expo-updates');
    return Updates.isEnabled ? Updates : null;
  } catch {
    return null;
  }
}

/** True once, on the launch that is running a newly applied OTA bundle. */
export async function consumeFreshOtaNotice(): Promise<boolean> {
  const Updates = updatesModule();
  if (!Updates) return false;
  try {
    const seenId = await AsyncStorage.getItem(OTA_SEEN_UPDATE_KEY);
    const fresh = shouldShowOtaToast({
      dev: __DEV__,
      enabled: true,
      embedded: Updates.isEmbeddedLaunch,
      updateId: Updates.updateId,
      seenId,
    });
    const next = nextSeenUpdateId(Updates.isEmbeddedLaunch, Updates.updateId);
    if (next && next !== seenId) await AsyncStorage.setItem(OTA_SEEN_UPDATE_KEY, next);
    return fresh;
  } catch (error) {
    console.warn('[OTA] notice check failed', error);
    return false;
  }
}

/** Check/fetch/reload OTA only when expo-updates native is present (prod/preview builds). */
export async function applyOtaUpdateIfAvailable(): Promise<void> {
  const Updates = updatesModule();
  if (!Updates) return;

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('[OTA] update check failed', error);
  }
}
