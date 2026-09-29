import { facingToDir, PLAYER_SPRITE_SCALE, playerSpriteGait } from './locomotion';

/** Unapproved fullbody-v1. Set false to restore the original artwork/playback. */
export const RIGHT_WALK_TRIAL_ENABLED = typeof __DEV__ !== 'undefined' && __DEV__;
// Diagnostic visible stance contact centres, relative to the common root.
// Two four-frame stance runs; anatomical identity remains provisional.
export const RIGHT_WALK_STANCE_SAMPLES = [[28, 3.5, -32.5, -44], [28.5, 10, -31.5, -43]];
export function fitStanceStep(samples: number[]): number {
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const mid = (samples.length - 1) / 2;
  let numerator = 0, denominator = 0;
  for (let i = 0; i < samples.length; i++) {
    numerator += (i - mid) * (samples[i] - mean);
    denominator += (i - mid) ** 2;
  }
  return -numerator / denominator;
}
/** Least-squares effective stride, not a Foot Planting approval. */
export const RIGHT_WALK_TRIAL_STRIDE = RIGHT_WALK_STANCE_SAMPLES.reduce((sum, row) => sum + fitStanceStep(row), 0) / 2 * 8 * PLAYER_SPRITE_SCALE;
export function rightWalkTrialStride(speed: number, facing: number, enabled?: boolean, visualGait?: number): number | undefined {
  'worklet';
  // Worklets capture body references; a module constant in a default parameter
  // is not captured by the current compiler and becomes a missing UI global.
  const trialEnabled = enabled ?? RIGHT_WALK_TRIAL_ENABLED;
  return trialEnabled && (visualGait ?? playerSpriteGait(speed)) === 2 && facingToDir(facing) === 2
    ? RIGHT_WALK_TRIAL_STRIDE : undefined;
}
