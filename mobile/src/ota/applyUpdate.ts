import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { TurboModuleRegistry } from 'react-native';

import {
  alreadyTriedUpdate, checkDownloadApply, isOfflineError, nextSeenUpdateId, OTA_APPLY_ATTEMPT_KEY, OTA_SEEN_UPDATE_KEY,
  runningBundleLabel, shouldShowOtaToast, showApplyingThenReload, type CheckOutcome,
} from './startupFlow';

export const OTA_RELOAD_SCREEN = {
  backgroundColor: '#081824',
  fade: false,
  spinner: { enabled: false },
};

/**
 * expo-updates is an Expo module, not a TurboModule: TurboModuleRegistry does not know it (it answered null in
 * every release build, which left this whole file switched off). Expo's own registry is the one to ask.
 */
function hasExpoUpdatesNative(): boolean {
  try {
    return requireOptionalNativeModule('ExpoUpdates') != null;
  } catch {
    try {
      return TurboModuleRegistry.get('ExpoUpdates') != null;
    } catch {
      return false;
    }
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

/** DEV only: the simulated update of EXPO_PUBLIC_DM_OTA_QA (see OtaQaRunner). Never called in a release build. */
function qaRunner(): typeof import('./OtaQaRunner') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./OtaQaRunner') as typeof import('./OtaQaRunner');
}

/** EAS update group of the running bundle (what `eas update` prints), when it is an update. */
function runningUpdateGroup(Updates: NonNullable<ReturnType<typeof updatesModule>>): string | null {
  const metadata = (Updates.manifest as { metadata?: { updateGroup?: unknown } } | undefined)?.metadata;
  return typeof metadata?.updateGroup === 'string' ? metadata.updateGroup : null;
}

/** Ids of the update this launch runs, for the applied toast. */
export function runningUpdateIds(): { updateGroup: string | null; updateId: string | null } {
  const Updates = updatesModule();
  if (!Updates && __DEV__ && process.env.EXPO_PUBLIC_DM_OTA_QA) {
    return { updateGroup: qaRunner().QA_UPDATE_GROUP, updateId: null };
  }
  return Updates ? { updateGroup: runningUpdateGroup(Updates), updateId: Updates.updateId } : { updateGroup: null, updateId: null };
}

/**
 * "v1.0.0 (2) · Embedded" / "v1.0.0 (2) · OTA a21a7422" — which binary and which bundle are running.
 * The build number is the binary's own (Info.plist / versionCode), not the one in the update's manifest.
 */
export function runningBundleText(): string {
  const Updates = updatesModule();
  const platform = Constants.platform;
  const build = platform?.ios?.buildNumber ?? (platform?.android?.versionCode != null ? String(platform.android.versionCode) : null);
  return runningBundleLabel({
    version: Updates?.runtimeVersion ?? Constants.expoConfig?.version,
    build,
    dev: __DEV__,
    embedded: !Updates || Updates.isEmbeddedLaunch,
    updateGroup: Updates ? runningUpdateGroup(Updates) : null,
    updateId: Updates?.updateId,
  });
}

/** True once, on the launch that is running a newly applied OTA bundle. */
export async function consumeFreshOtaNotice(): Promise<boolean> {
  const Updates = updatesModule();
  if (!Updates) {
    // DEV only: the simulated update of EXPO_PUBLIC_DM_OTA_QA (see OtaQaRunner).
    if (__DEV__ && process.env.EXPO_PUBLIC_DM_OTA_QA) {
      return qaRunner().consumeQaFreshNotice().catch(() => false);
    }
    return false;
  }
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

/** "Applying update…" is drawn first (see showApplyingThenReload); these bound that wait and how long it stays up. */
const APPLY_PAINT_DEADLINE_MS = 1500;
const APPLY_READ_MS = 400;

let reloadInProgress = false;
let checkInFlight: Promise<CheckOutcome> | null = null;
const reloadTried = new Set<string>();

export function isOtaReloadInProgress(): boolean {
  return reloadInProgress;
}

/**
 * Switch the running bundle to the one already downloaded, once the applying screen has been drawn.
 * Resolves only if this runtime is still alive afterwards, which means the switch did not happen.
 */
export async function reloadOntoUpdate(
  Updates: UpdatesModule,
  downloadedId: string | null,
  applyingShown: () => Promise<void> = () => Promise.resolve(),
): Promise<boolean> {
  const key = downloadedId ?? 'pending';
  if (reloadInProgress || reloadTried.has(key)) return false;
  reloadInProgress = true;
  reloadTried.add(key);
  try {
    // Never restart twice onto the same update: see alreadyTriedUpdate.
    const now = Date.now();
    const attempt = await readApplyAttempt();
    if (alreadyTriedUpdate({ candidateId: downloadedId, runningId: Updates.updateId, attempt, now })) {
      console.warn('[OTA] update was already tried and is not running; left to the next cold start', key);
      return false;
    }
    await AsyncStorage.setItem(OTA_APPLY_ATTEMPT_KEY, JSON.stringify({ id: downloadedId, at: now }))
      .catch((error) => console.warn('[OTA] apply attempt not recorded', error));
    await showApplyingThenReload({
      painted: applyingShown,
      paintDeadlineMs: APPLY_PAINT_DEADLINE_MS,
      readMs: APPLY_READ_MS,
      reload: async () => {
        try {
          await Updates.reloadAsync();
        } catch (error) {
          console.warn('[OTA] reload failed', error);
          await Updates.reloadAsync({ reloadScreenOptions: OTA_RELOAD_SCREEN });
        }
      },
    });
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

async function readApplyAttempt(): Promise<{ id: string | null; at: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(OTA_APPLY_ATTEMPT_KEY);
    const row = raw ? JSON.parse(raw) as { id?: unknown; at?: unknown } : null;
    if (!row || typeof row.at !== 'number') return null;
    return { id: typeof row.id === 'string' ? row.id : null, at: row.at };
  } catch {
    return null;
  }
}

export interface UpdateCheckHooks {
  /** A visible stage begins: the download, then the switch to the new bundle. */
  onStage?: (stage: 'downloading' | 'applying') => void;
  /** Asked before the download and before the reload; false during a mission. */
  allowApply?: () => boolean;
  /** Resolves when "applying" is on screen. */
  applyingShown?: () => Promise<void>;
}

/**
 * Download a newer bundle and restart onto it.
 * An update that is already on disk still restarts: a zero launch wait has already
 * booted the previous bundle, and killing the app does not switch it.
 */
export function downloadAndReload(Updates: UpdatesModule, hooks: UpdateCheckHooks = {}): Promise<CheckOutcome> {
  if (reloadInProgress) return Promise.resolve('reloading');
  if (!checkInFlight) checkInFlight = fetchAndReload(Updates, hooks).finally(() => { checkInFlight = null; });
  return checkInFlight;
}

function fetchAndReload(Updates: UpdatesModule, hooks: UpdateCheckHooks): Promise<CheckOutcome> {
  // reloadOntoUpdate clears its flag when it returns, so "the reload was started" is remembered here.
  let reloadStarted = false;
  return checkDownloadApply({
    check: async () => {
      const check = await Updates.checkForUpdateAsync();
      return { available: check.isAvailable, rollback: !!check.isRollBackToEmbedded };
    },
    fetch: async () => {
      const fetched = await Updates.fetchUpdateAsync();
      const manifest = fetched.manifest as { id?: string } | undefined;
      return { isNew: fetched.isNew, rollback: !!fetched.isRollBackToEmbedded, id: manifest?.id ?? null };
    },
    apply: async (id) => {
      reloadStarted = true;
      await reloadOntoUpdate(Updates, id, hooks.applyingShown);
      // Back here means the runtime was not replaced.
      reloadStarted = false;
    },
  }, {
    onStage: hooks.onStage,
    allowApply: hooks.allowApply,
    isReloading: () => reloadStarted || isOtaReloadInProgress(),
    onError: (error) => console.warn('[OTA] update attempt failed', error),
    isOffline: async (error) => isOfflineError(error) || !(await updateHostReachable()),
  });
}

const REACH_TIMEOUT_MS = 2500;
/**
 * A failed check does not say why (expo-updates rejects with "ERR_UPDATES_CHECK: undefined reason"), so the update
 * host is asked directly: any answer at all means there is a connection, no answer means offline.
 */
async function updateHostReachable(): Promise<boolean> {
  const url = Constants.expoConfig?.updates?.url;
  if (!url) return true;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), REACH_TIMEOUT_MS);
  try {
    await fetch(url, { method: 'HEAD', signal: abort.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
