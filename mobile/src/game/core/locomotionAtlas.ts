/**
 * PRODUCTION LOCOMOTION ATLAS contract — shared by the offline baker
 * (tools/locomotion) and the runtime manifest, so the stride a clip is baked
 * with is exactly the stride the game plays it back with.
 *
 * Atlas layout: one PNG per state, 128×128 cells, columns = frames,
 * rows = DOWN, LEFT, RIGHT, UP. Pivot (ground point between the feet) is the
 * same cell pixel in every frame of every atlas.
 *
 * Planting: in every locomotion clip the stance foot moves backward inside the
 * sprite by exactly the distance the body travels, so with distance-driven
 * playback the foot stays fixed on the floor. A cycle (two steps) therefore
 * covers `2 · reach · depth / stance` sprite px, converted to world units by
 * the character scale.
 */
export const LOCO_CELL = 128;
export const LOCO_PIVOT = { x: 64, y: 112 } as const;
export const LOCO_ROWS = ['down', 'left', 'right', 'up'] as const;
export type LocoDir = (typeof LOCO_ROWS)[number];
export type LocoState = 'idle' | 'sneak' | 'walk' | 'run';
export type LocoWho = 'player' | 'guard';

export interface LocoGait {
  frames: number;
  /** Half foot sweep during stance, sprite px (side view). */
  reach: number;
  /** Fraction of the cycle each foot is planted (Run < 0.5 → flight). */
  stance: number;
}
export interface LocoCharacter {
  /** Standing height in sprite px (pivot → top of beanie / cap, measured by tools/locomotion/validate.ts). */
  heightPx: number;
  /** Same character height in world units (gameplay collision is separate). */
  worldHeight: number;
  /** Down/Up rows: forward travel shows as this fraction of screen-y (3/4 view). */
  depth: number;
  idle: { frames: number; fps: number };
  gaits: Partial<Record<Exclude<LocoState, 'idle'>, LocoGait>>;
}

export const LOCO_CHARACTERS: Record<LocoWho, LocoCharacter> = {
  player: {
    heightPx: 87.5, worldHeight: 46, depth: 0.8,
    idle: { frames: 6, fps: 5 },
    gaits: {
      sneak: { frames: 8, reach: 12, stance: 0.62 },
      walk: { frames: 8, reach: 15, stance: 0.5 },
      run: { frames: 8, reach: 16, stance: 0.34 },
    },
  },
  guard: {
    heightPx: 91, worldHeight: 49, depth: 0.75,
    idle: { frames: 6, fps: 4 },
    gaits: {
      walk: { frames: 8, reach: 16, stance: 0.55 },
      run: { frames: 8, reach: 17, stance: 0.34 },
    },
  },
};

/** World units per sprite px. */
export const locoScale = (who: LocoWho) => LOCO_CHARACTERS[who].worldHeight / LOCO_CHARACTERS[who].heightPx;

/** Screen px the stance foot sweeps in one row (side rows: reach; down/up: reach × depth). */
export function locoReachPx(who: LocoWho, state: Exclude<LocoState, 'idle'>, dir: LocoDir): number {
  const c = LOCO_CHARACTERS[who], g = c.gaits[state];
  if (!g) return 0;
  return dir === 'left' || dir === 'right' ? g.reach : g.reach * c.depth;
}

/** World units per full animation cycle (two steps) for a clip — the planted-foot contract. */
export function locoStride(who: LocoWho, state: Exclude<LocoState, 'idle'>, dir: LocoDir): number {
  const g = LOCO_CHARACTERS[who].gaits[state];
  if (!g) return 0;
  return (2 * locoReachPx(who, state, dir) / g.stance) * locoScale(who);
}

/** Runtime direction order (locomotion.ts `Dir`): 0 down, 1 up, 2 right, 3 left. */
const RUNTIME_DIRS: LocoDir[] = ['down', 'up', 'right', 'left'];
/** Player stride table for the UI-thread worklets: [sneak×4, walk×4, run×4] in runtime dir order. */
export const PLAYER_LOCO_STRIDE_TABLE: number[] = (['sneak', 'walk', 'run'] as const)
  .flatMap(state => RUNTIME_DIRS.map(dir => locoStride('player', state, dir)));
