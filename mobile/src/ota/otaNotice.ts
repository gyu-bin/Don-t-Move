export { OTA_SEEN_UPDATE_KEY, nextSeenUpdateId, shouldShowOtaToast } from './startupFlow';

/** A downloaded bundle that is not the one on screen must restart the app now. */
export function shouldReloadPending(
  startupRunning: boolean,
  runningId: string | null | undefined,
  downloadedId: string | null | undefined,
): boolean {
  if (startupRunning || !downloadedId) return false;
  return downloadedId !== (runningId ?? null);
}

export type ColdStartGate = 'wait' | 'reload' | 'fetch';

/**
 * Cold start stays on the splash until this says the running bundle is current.
 * A bundle already on disk still needs reloadAsync: with a zero launch wait the
 * process has already started the previous bundle and will not switch by itself.
 */
export function coldStartGate(input: {
  startupRunning: boolean;
  checking: boolean;
  downloading: boolean;
  pending: boolean;
  runningId: string | null | undefined;
  downloadedId: string | null | undefined;
}): ColdStartGate {
  if (input.startupRunning || input.checking || input.downloading) return 'wait';
  const downloaded = input.downloadedId ?? null;
  const running = input.runningId ?? null;
  if ((input.pending || downloaded != null) && downloaded !== running) return 'reload';
  return 'fetch';
}

/** True when a newer bundle is already downloading or waiting to replace this launch. */
export function shouldAnnounceApplying(input: {
  downloading: boolean;
  pending: boolean;
  decision: ColdStartGate;
}): boolean {
  return input.downloading || input.pending || input.decision === 'reload';
}
