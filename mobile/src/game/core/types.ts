export interface Vec2 {
  x: number;
  y: number;
}

/** Axis-aligned rectangle, top-left origin, y grows downward (screen convention). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Facing is an angle in radians: 0 = right (+x), PI/2 = down (+y), PI = left, -PI/2 = up.
 * Rendering quantizes it to the available sprite views (4 today, 8 later).
 */
export type FacingAngle = number;

export const FACING = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
} as const;

/**
 * Numeric state codes. Plain numbers (not TS enums) so worklets can use them
 * without capturing enum objects across the JS/UI thread boundary.
 */

/** Character locomotion states shared by Player and Guard rigs. */
export const Gait = { Idle: 0, Sneak: 1, Walk: 2, Run: 3 } as const;
export type Gait = (typeof Gait)[keyof typeof Gait];

/** Guard-only upper-body actions layered over the gait. */
export const GuardAction = { None: 0, Whistle: 1, Search: 2 } as const;
export type GuardAction = (typeof GuardAction)[keyof typeof GuardAction];

/** Guard awareness level; drives cone tint and head icon. */
export const Awareness = { Patrol: 0, Suspicious: 1, Alert: 2, Search: 3, Chase: 4, Investigate: 5, Return: 6 } as const;
export type Awareness = (typeof Awareness)[keyof typeof Awareness];
