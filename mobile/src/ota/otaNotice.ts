export const OTA_SEEN_UPDATE_KEY = 'dont-move.ota.seen-update-id';

export function shouldShowOtaToast(input: {
  dev: boolean;
  enabled: boolean;
  embedded: boolean;
  updateId: string | null;
  seenId: string | null;
}): boolean {
  if (input.dev || !input.enabled || input.embedded || !input.updateId) return false;
  return input.updateId !== input.seenId;
}

export function nextSeenUpdateId(embedded: boolean, updateId: string | null): string | null {
  if (updateId) return updateId;
  return embedded ? 'embedded' : null;
}

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
