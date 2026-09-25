/**
 * Locomotion constants shared by simulation and every character renderer
 * (sprite sheets and the procedural fallback). Animation playback is driven by
 * distance travelled / stride length, so feet never slide regardless of the
 * renderer.
 *
 * Gait is a continuous value: 0 = Idle, 1 = Sneak, 2 = Walk, 3 = Run.
 */

/** World units per second at each gait. */
export const GAIT_SPEED = [0, 38, 72, 150];

/** World units covered by one full animation cycle (two steps) at each gait. */
export const GAIT_STRIDE = [8, 24, 40, 52];

/** Temporary Agent Zero sheet cycle lengths, tuned independently of movement speed. */
export const PLAYER_SPRITE_STRIDE = { sneak: 54, walk: 60, run: 80 } as const;

/** Integrate each actual displacement so changing gait never reinterprets past distance. */
export function advancePlayerSpritePhase(phase: number, distance: number, speed: number): number {
  'worklet';
  const stride = speed <= 38 ? PLAYER_SPRITE_STRIDE.sneak
    : speed <= 72 ? PLAYER_SPRITE_STRIDE.walk : PLAYER_SPRITE_STRIDE.run;
  return (phase + distance / stride) % 1;
}

/**
 * Fraction of the cycle each foot is planted. Walk/Sneak ≥ 0.5 (a foot is
 * always down); Run < 0.5 (flight phase with both feet off the ground).
 */
export const GAIT_STANCE = [0.5, 0.5, 0.5, 0.34];

export function gaitLerp(table: number[], g: number): number {
  'worklet';
  const i = g <= 0 ? 0 : g >= 3 ? 2 : Math.floor(g);
  const t = g <= 0 ? 0 : g >= 3 ? 1 : g - i;
  return table[i] + (table[i + 1] - table[i]) * t;
}

export function gaitFromSpeed(speed: number): number {
  'worklet';
  if (speed <= 0.5) return 0;
  for (let i = 1; i < GAIT_SPEED.length; i++) {
    if (speed <= GAIT_SPEED[i]) {
      const lo = GAIT_SPEED[i - 1];
      return i - 1 + (speed - lo) / (GAIT_SPEED[i] - lo);
    }
  }
  return 3;
}

export function strideCycleLength(gait: number): number {
  'worklet';
  return gaitLerp(GAIT_STRIDE, gait);
}

/**
 * Four-way facing index used by sprite sets and the fallback rig:
 * 0 = down, 1 = up, 2 = right, 3 = left.
 * The single place to extend to 8 directions later.
 */
export const Dir = { Down: 0, Up: 1, Right: 2, Left: 3 } as const;
export type Dir = (typeof Dir)[keyof typeof Dir];

export function facingToDir(facing: number): number {
  'worklet';
  const c = Math.cos(facing);
  const s = Math.sin(facing);
  if (Math.abs(c) >= Math.abs(s) * 0.9) return c >= 0 ? 2 : 3;
  return s > 0 ? 0 : 1;
}

/**
 * FOOT PLANTING — the one gait model every renderer and art guide follows.
 *
 * One foot's cycle, `p` in [0,1) with p = 0 at Contact (heel strike, foot at
 * its most forward point):
 *   stance [0, stance):  foot on the ground, moving BACKWARD linearly from
 *                        +1 to -1. Over the stance the body travels
 *                        stance × cycleLength, so the foot is still in the
 *                        world when the half-sweep `reach` equals
 *                        stance × cycleLength / 2 (see `plantedReach`).
 *   swing  [stance, 1):  foot lifted (sin arc) and eased forward to +1.
 * The other foot runs half a cycle later. Beats for 8 frames:
 *   1 Contact · 2 Down · 3 Passing · 4 Up · 5 Opposite Contact · 6 Down · 7 Passing · 8 Up
 *
 * Writes forward offset (−1..1, × reach) to out[0] and lift (0..1) to out[1].
 */
export function footCycle(p: number, stance: number, out: number[]): void {
  'worklet';
  const q = p - Math.floor(p);
  if (q < stance) {
    out[0] = 1 - (2 * q) / stance;
    out[1] = 0;
  } else {
    const v = (q - stance) / (1 - stance);
    const e = v * v * (3 - 2 * v);
    out[0] = -1 + 2 * e;
    out[1] = Math.sin(Math.PI * v);
  }
}

/** Half foot-sweep (world units) that keeps the stance foot fixed in the world. */
export function plantedReach(gait: number): number {
  'worklet';
  return (gaitLerp(GAIT_STRIDE, gait) * gaitLerp(GAIT_STANCE, gait)) / 2;
}

/**
 * Vertical body offset over the cycle (+ = down): lowest just after each
 * Contact ("Down"), highest before the next ("Up"). `p` is the cycle phase.
 */
export function bodyBob(p: number): number {
  'worklet';
  return 0.5 * Math.cos(4 * Math.PI * (p - 0.125));
}
