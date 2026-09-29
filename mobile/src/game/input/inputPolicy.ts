/** Development touch fallback must never silently replace release iPhone Tilt. */
export function usesTiltInput(platform: string, development: boolean, native: { isSimulator: boolean; available: boolean } | null, failed = false): boolean {
  if (platform !== 'ios' || native?.isSimulator) return false;
  if (development && (!native?.available || failed)) return false;
  return true;
}
