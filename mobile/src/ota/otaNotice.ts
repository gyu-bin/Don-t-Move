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
