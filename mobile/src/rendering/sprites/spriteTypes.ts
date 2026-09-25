import type { SkImage } from '@shopify/react-native-skia';

/**
 * Runtime sprite data (images already decoded). Built from the asset manifest
 * by `src/assets/buildSprites.ts`; consumed by worklets, so it is plain data +
 * SkImage host objects only.
 */

/** One frame: source rect in the image + anchor (the ground/feet point), in source pixels. */
export interface SpriteFrame {
  image: SkImage;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  ax: number;
  ay: number;
}

export interface SpriteClip {
  frames: SpriteFrame[];
  /**
   * 'distance' clips (sneak/walk/run) play one full cycle per stride length,
   * locked to the character's real movement. 'time' clips use `fps`.
   */
  mode: 'distance' | 'time';
  fps: number;
  loop: boolean;
  /** Draw mirrored (used when a Left clip is derived from Right). */
  mirror: boolean;
  /**
   * World units per full cycle as authored in the art. > 0 → frame comes from
   * the character's odometer (no foot sliding even if it differs from the
   * shared GAIT_STRIDE). 0 → use the shared gait phase.
   */
  strideLength: number;
}

/**
 * Character animation states. Player uses Idle/Sneak/Walk/Run; Guard uses
 * Idle/Walk/Run/Whistle/Search. Missing clips fall back (see resolveClip).
 */
export const Anim = { Idle: 0, Sneak: 1, Walk: 2, Run: 3, Whistle: 4, Search: 5 } as const;
export type Anim = (typeof Anim)[keyof typeof Anim];
export const ANIM_COUNT = 6;
export const ANIM_NAMES = ['idle', 'sneak', 'walk', 'run', 'whistle', 'search'] as const;
export type AnimName = (typeof ANIM_NAMES)[number];

export const DIR_NAMES = ['down', 'up', 'right', 'left'] as const;
export type DirName = (typeof DIR_NAMES)[number];

export interface CharacterSpriteSet {
  /** clips[anim][dir]; null = not provided (fallback rules apply). */
  clips: (SpriteClip | null)[][];
  /** World units per source pixel. */
  scale: number;
  /** Draw the soft contact shadow under the sprite. */
  shadow: boolean;
}

/** A named-frame atlas (environment kits, UI indicators). */
export type SpriteAtlas = Record<string, SpriteFrame>;
