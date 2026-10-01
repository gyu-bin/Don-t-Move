/** Platform policy; Android availability is resolved asynchronously by its provider. */
export function usesTiltInput(platform: string, development: boolean, native: { isSimulator: boolean; available: boolean } | null, failed = false, androidAvailable = false): boolean {
  if (platform === 'android') return androidAvailable && !failed;
  if (platform !== 'ios' || native?.isSimulator) return false;
  if (development && (!native?.available || failed)) return false;
  return true;
}
