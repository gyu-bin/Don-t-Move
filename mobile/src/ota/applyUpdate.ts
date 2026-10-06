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

/** Keep the splash and "적용중" on screen long enough to paint before the runtime is replaced. */
const APPLY_VISIBLE_MS = 1800;

let reloadInProgress = false;
let checkInFlight: Promise<'reloading' | 'current' | 'deferred'> | null = null;
const reloadTried = new Set<string>();

export function isOtaReloadInProgress(): boolean {
  return reloadInProgress;
}

/**
 * Switch the running bundle to the one already downloaded.
 * Resolves only if this runtime is still alive afterwards, which means the switch did not happen.
 */
export async function reloadOntoUpdate(Updates: UpdatesModule, downloadedId: string | null): Promise<boolean> {
  const key = downloadedId ?? 'pending';
  if (reloadInProgress || reloadTried.has(key)) return false;
  reloadInProgress = true;
  reloadTried.add(key);
  try {
    await new Promise((resolve) => setTimeout(resolve, APPLY_VISIBLE_MS));
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.warn('[OTA] reload failed', error);
      await Updates.reloadAsync({ reloadScreenOptions: OTA_RELOAD_SCREEN });
    }
    // reloadAsync resolves just before the runtime is replaced. Still being here means it was not.
    await new Promise((resolve) => setTimeout(resolve, 1600));
    return false;
  } catch (error) {
    console.warn('[OTA] reload did not start', error);
    reloadTried.delete(key);
    return false;
  } finally {
    reloadInProgress = false;
  }
}

/**
 * Download a newer bundle and restart onto it.
 * An update that is already on disk still restarts: a zero launch wait has already
 * booted the previous bundle, and killing the app does not switch it.
 */
export function downloadAndReload(
  Updates: UpdatesModule,
  onApplying?: () => void,
  allowApply: () => boolean = () => true,
): Promise<'reloading' | 'current' | 'deferred'> {
  if (reloadInProgress) return Promise.resolve('reloading');
  if (!checkInFlight) checkInFlight = fetchAndReload(Updates, onApplying, allowApply).finally(() => { checkInFlight = null; });
  return checkInFlight;
}

async function fetchAndReload(
  Updates: UpdatesModule,
  onApplying?: () => void,
  allowApply: () => boolean = () => true,
): Promise<'reloading' | 'current' | 'deferred'> {
  let announced = false;
  const announce = () => {
    if (announced) return;
    announced = true;
    onApplying?.();
  };
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const check = await Updates.checkForUpdateAsync();
      if (check.isRollBackToEmbedded) {
        announce();
        await reloadOntoUpdate(Updates, null);
        return isOtaReloadInProgress() ? 'reloading' : 'current';
      }
      if (!check.isAvailable) return 'current';
      if (!allowApply()) return 'deferred';
      announce();
      const fetched = await Updates.fetchUpdateAsync();
      if (!allowApply()) return 'deferred';
      if (!fetched.isNew && !fetched.isRollBackToEmbedded) return 'current';
      const manifest = fetched.manifest as { id?: string } | undefined;
      await reloadOntoUpdate(Updates, manifest?.id ?? null);
      return isOtaReloadInProgress() ? 'reloading' : 'current';
    } catch (error) {
      console.warn('[OTA] update attempt failed', error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return 'current';
}
