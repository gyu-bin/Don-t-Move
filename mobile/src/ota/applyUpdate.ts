import AsyncStorage from '@react-native-async-storage/async-storage';
import { TurboModuleRegistry } from 'react-native';

import { nextSeenUpdateId, OTA_SEEN_UPDATE_KEY, shouldShowOtaToast } from './otaNotice';

export const OTA_RELOAD_SCREEN = {
  backgroundColor: '#081824',
  fade: false,
  spinner: { enabled: false },
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
let restartedFor: string | null = null;

/**
 * Restart the whole app onto the downloaded bundle so launch runs again from the splash.
 * If the native reload does not tear the runtime down, remount the tree and play the splash anyway.
 */
export async function reloadOntoUpdate(
  Updates: UpdatesModule,
  downloadedId: string | null,
  onSplashRestart: () => void,
): Promise<void> {
  if (reloadStarted || (downloadedId != null && restartedFor === downloadedId)) return;
  reloadStarted = true;
  restartedFor = downloadedId;
  try {
    await Updates.reloadAsync({ reloadScreenOptions: OTA_RELOAD_SCREEN });
  } catch (error) {
    console.warn('[OTA] reload failed', error);
    try {
      const { reloadAppAsync } = require('expo') as typeof import('expo');
      await reloadAppAsync();
    } catch (fallback) {
      console.warn('[OTA] app reload failed', fallback);
    }
  }
  // reloadAsync resolves before the runtime actually dies. If we are still here, it did not restart.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  onSplashRestart();
}

/**
 * Download a newer bundle and restart the app onto it.
 * Retries while the native startup check is still holding the updates lock.
 * A failed attempt never cancels a later one: the screen refresh is the point.
 */
export async function downloadAndReload(Updates: UpdatesModule, onSplashRestart: () => void): Promise<void> {
  if (checkInFlight || reloadStarted) return;
  checkInFlight = true;
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (!fetched.isNew) return;
        const manifest = fetched.manifest as { id?: string } | undefined;
        await reloadOntoUpdate(Updates, manifest?.id ?? null, onSplashRestart);
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
