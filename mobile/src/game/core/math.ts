/**
 * Small math helpers shared by the simulation (UI thread) and setup code (JS thread).
 * Every function is a worklet so it can be called from Reanimated frame callbacks.
 */

export const TAU = Math.PI * 2;

export function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

/** Frame-rate independent exponential smoothing factor. */
export function damp(rate: number, dt: number): number {
  'worklet';
  return 1 - Math.exp(-rate * dt);
}

/** Wraps an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  'worklet';
  let r = a % TAU;
  if (r > Math.PI) r -= TAU;
  else if (r <= -Math.PI) r += TAU;
  return r;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  'worklet';
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Deterministic hash → [0,1). Used for stable per-tile variation. */
export function hash2(x: number, y: number): number {
  'worklet';
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Rotates `current` toward `target` by at most rate·dt radians (shortest way). */
export function turnToward(current: number, target: number, rate: number, dt: number): number {
  'worklet';
  const d = wrapAngle(target - current);
  const step = rate * dt;
  return Math.abs(d) <= step ? wrapAngle(target) : wrapAngle(current + Math.sign(d) * step);
}
