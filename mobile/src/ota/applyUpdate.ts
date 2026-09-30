import AsyncStorage from '@react-native-async-storage/async-storage';
import { TurboModuleRegistry } from 'react-native';

import { nextSeenUpdateId, OTA_SEEN_UPDATE_KEY, shouldShowOtaToast } from './otaNotice';

export const OTA_RELOAD_SCREEN = {
  backgroundColor: '#081824',
  fade: true,
  spinner: { enabled: true, color: '#3ED5FA', size: 'large' as const },
};

function hasExpoUpdatesNative(): boolean {
  try {
    return TurboModuleRegistry.get('ExpoUpdates') != null;
  } catch {
    return false;
  }
}

export function updatesModule(): typeof import('expo-updates') | null {
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

type UpdatesModule = NonNullable<ReturnType<typeof updatesModule>>;

let reloadStarted = false;
let checkInFlight = false;

/** Restart onto the downloaded bundle. The screen stays covered until the runtime swaps. */
export async function reloadOntoUpdate(Updates: UpdatesModule): Promise<void> {
  if (reloadStarted) return;
  reloadStarted = true;
  try {
    await Updates.reloadAsync({ reloadScreenOptions: OTA_RELOAD_SCREEN });
  } catch (error) {
    reloadStarted = false;
    console.warn('[OTA] reload failed', error);
  }
}

/**
 * Download a newer bundle and restart the app onto it.
 * Retries while the native startup check is still holding the updates lock.
 * A failed attempt never cancels a later one: the screen refresh is the point.
 */
export async function downloadAndReload(Updates: UpdatesModule, onWillReload: () => void): Promise<void> {
  if (checkInFlight || reloadStarted) return;
  checkInFlight = true;
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        onWillReload();
        const fetched = await Updates.fetchUpdateAsync();
        if (!fetched.isNew) return;
        await reloadOntoUpdate(Updates);
        return;
      } catch (error) {
        console.warn('[OTA] update attempt failed', error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } finally {
    checkInFlight = false;
  }
}
