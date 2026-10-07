/** Rapid-tap unlock for the local admin analytics screen. */
export const SECRET_TAP_COUNT = 5;
export const SECRET_TAP_WINDOW_MS = 2000;

export function createSecretTapDetector(
  onUnlock: () => void,
  count = SECRET_TAP_COUNT,
  windowMs = SECRET_TAP_WINDOW_MS,
): () => void {
  const taps: number[] = [];
  return () => {
    const now = Date.now();
    taps.push(now);
    while (taps.length && now - taps[0]! > windowMs) taps.shift();
    if (taps.length >= count) {
      taps.length = 0;
      onUnlock();
    }
  };
}
