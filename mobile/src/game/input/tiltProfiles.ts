import { DEFAULT_TILT, zeroTilt } from './tilt';
import type { TiltState, TiltTuning } from './tilt';

export type TiltProfileId = 'A' | 'B' | 'C';
export const TILT_PROFILES: Record<TiltProfileId, TiltTuning> = {
  A: { deadZone: 2, moveStart: 2.5, maxTilt: 12, smoothing: 0.07, sensitivity: 1 },
  B: { deadZone: 1.75, moveStart: 2.25, maxTilt: 10, smoothing: 0.07, sensitivity: 1 },
  C: { deadZone: 1.5, moveStart: 2, maxTilt: 9, smoothing: 0.07, sensitivity: 1 },
};
export function tiltCompareEnabled(dev: boolean, flag: string | undefined): boolean {
  return dev && flag === '1';
}
// Session only. Never writes a preference or silently promotes a candidate to release.
let sessionProfile: TiltProfileId = 'B';
export function currentTiltProfile(): TiltProfileId { return sessionProfile; }
export function rememberTiltProfile(profile: TiltProfileId): void { sessionProfile = profile; }
export function profileTuning(enabled: boolean, profile: TiltProfileId): TiltTuning {
  return { ...(enabled ? TILT_PROFILES[profile] : DEFAULT_TILT) };
}
/** A mapping change consumes old filter output, preserving the user's fixed neutral. */
export function clearProfileInput(state: TiltState): void {
  'worklet';
  zeroTilt(state);
}
