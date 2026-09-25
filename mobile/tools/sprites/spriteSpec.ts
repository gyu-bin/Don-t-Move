import { footCycle, GAIT_STANCE, GAIT_STRIDE } from '../../src/game/core/locomotion';

/**
 * DON'T MOVE — character sprite contract (single source of truth).
 *
 * Used by the template generator, the validator and (later) the runtime
 * manifest. Every number an artist must respect lives here.
 */

/** Every frame cell, every sheet. Transparent PNG, no padding between cells. */
export const CELL = 256;

/** Row order is identical in every sheet. Columns are time (frame 01 → N). */
export const ROWS = ['down', 'up', 'left', 'right'] as const;
export type RowName = (typeof ROWS)[number];

/**
 * Feet anchor: the ground point between the feet, in cell pixels.
 * Runtime draws the frame so this pixel sits on the character's world position.
 */
export const ANCHOR = { x: 128, y: 224 } as const;

/**
 * 3/4 view: in Down/Up locomotion rows the foot stepping toward/away from the
 * camera is drawn below/above the ground point. These are the allowed ranges
 * (px) for the lowest opaque pixel relative to ANCHOR.y, per animation.
 */
export const FEET_RANGE = {
  idle: { above: 4, below: 4 },
  action: { above: 5, below: 5 },
  locomotionSide: { above: 14, below: 6 },
  locomotionFrontBack: { above: 14, below: 22 },
  runExtraLift: 8,
  /** At least one frame per locomotion row must be this close to the line. */
  mustTouch: 6,
} as const;

/** Nothing opaque closer than this to any cell edge (prevents bleeding when sampling). */
export const EDGE_MARGIN = 4;

export interface CharacterSpec {
  id: 'player' | 'guard';
  /** Target silhouette height (ground → top of head/cap) in the idle pose, px. */
  height: number;
  /** Allowed deviation of idle height between directions (px). */
  heightTolerance: number;
  /** Target body width at the shoulders, idle/down (px) — guides only. */
  shoulderWidth: number;
  /** Height in world units (runtime scale = worldHeight / height). */
  worldHeight: number;
}

export const CHARACTERS: Record<'player' | 'guard', CharacterSpec> = {
  // Agent Zero: slim, compact.
  player: { id: 'player', height: 172, heightTolerance: 10, shoulderWidth: 70, worldHeight: 46 },
  // Guard: slightly taller and noticeably broader / heavier.
  guard: { id: 'guard', height: 186, heightTolerance: 10, shoulderWidth: 84, worldHeight: 50 },
};

export type AnimKind = 'loop-locomotion' | 'loop-time' | 'action';

export interface SheetSpec {
  file: string;
  character: 'player' | 'guard';
  anim: 'idle' | 'sneak' | 'walk' | 'run' | 'whistle' | 'search';
  frames: number;
  kind: AnimKind;
  /** Playback for time-based clips (runtime default; locomotion is distance-driven). */
  fps: number;
  /** Per-frame intent shown on the guide template (and in SPEC.md). */
  beats: string[];
  /** Locomotion only: index into the game's GAIT_* tables (1 sneak, 2 walk, 3 run). */
  gait?: 1 | 2 | 3;
}

const WALK_BEATS = ['Contact (L)', 'Down', 'Passing', 'Up', 'Opposite Contact (R)', 'Down', 'Passing', 'Up'];

export const SHEETS: SheetSpec[] = [
  {
    file: 'player_idle.png',
    character: 'player',
    anim: 'idle',
    frames: 4,
    kind: 'loop-time',
    fps: 4,
    beats: ['neutral', 'inhale (chest up 2px)', 'hold', 'exhale'],
  },
  {
    file: 'player_sneak.png',
    character: 'player',
    anim: 'sneak',
    frames: 6,
    kind: 'loop-locomotion',
    fps: 0,
    beats: [
      'Contact (L, low)',
      'Down',
      'Passing / Up (tiptoe)',
      'Opposite Contact (R, low)',
      'Down',
      'Passing / Up (tiptoe)',
    ],
    gait: 1,
  },
  {
    file: 'player_walk.png',
    character: 'player',
    anim: 'walk',
    frames: 8,
    kind: 'loop-locomotion',
    fps: 0,
    beats: WALK_BEATS,
    gait: 2,
  },
  {
    file: 'player_run.png',
    character: 'player',
    anim: 'run',
    frames: 8,
    kind: 'loop-locomotion',
    fps: 0,
    beats: [
      'Contact (L)',
      'Down / push',
      'Passing (flight)',
      'Up (reach)',
      'Opposite Contact (R)',
      'Down / push',
      'Passing (flight)',
      'Up (reach)',
    ],
    gait: 3,
  },
  {
    file: 'guard_idle.png',
    character: 'guard',
    anim: 'idle',
    frames: 4,
    kind: 'loop-time',
    fps: 3,
    beats: ['neutral', 'inhale', 'hold', 'exhale'],
  },
  {
    file: 'guard_walk.png',
    character: 'guard',
    anim: 'walk',
    frames: 8,
    kind: 'loop-locomotion',
    fps: 0,
    beats: WALK_BEATS,
    gait: 2,
  },
  {
    file: 'guard_run.png',
    character: 'guard',
    anim: 'run',
    frames: 8,
    kind: 'loop-locomotion',
    fps: 0,
    beats: [
      'Contact (L)',
      'Down / push',
      'Passing (flight)',
      'Up (reach)',
      'Opposite Contact (R)',
      'Down / push',
      'Passing (flight)',
      'Up (reach)',
    ],
    gait: 3,
  },
  {
    file: 'guard_whistle.png',
    character: 'guard',
    anim: 'whistle',
    frames: 6,
    kind: 'action',
    fps: 10,
    beats: [
      'stop / plant feet',
      'hand rising',
      'whistle at mouth',
      'BLOW (cheeks, lean)',
      'hold',
      'hand lowering',
    ],
  },
  {
    file: 'guard_search.png',
    character: 'guard',
    anim: 'search',
    frames: 6,
    kind: 'loop-time',
    fps: 5,
    beats: [
      'alert stance',
      'head+torso turn L (≤25°)',
      'hold, peer L',
      'back to centre',
      'head+torso turn R (≤25°)',
      'hold, peer R',
    ],
  },
];

/** UI indicators: square transparent PNGs, glyph centred. */
export const ICON_CELL = 128;
export const ICONS = [
  { file: 'indicator_question.png', glyph: '?', hue: 'yellow' as const },
  { file: 'indicator_alert.png', glyph: '!', hue: 'red' as const },
];

/** Where final art is dropped (runtime assets) — relative to mobile/. */
export const FINAL_DIRS = { characters: 'assets/characters', ui: 'assets/ui' };

// ---------------------------------------------------------------- foot planting

/** Screen-y per unit of forward motion in Down/Up rows (3/4 camera). Matches the runtime rig. */
export const FRONT_BACK_FORESHORTEN = 0.42;

export interface PlantingSpec {
  /** px per world unit for this character. */
  pxPerUnit: number;
  /** One full cycle (two steps) in px — the body travels this far per loop. */
  cyclePx: number;
  /** Planted-foot travel per frame (px). Stance foot moves exactly this far BACKWARD each frame. */
  perFramePx: number;
  /** Fraction of the cycle each foot is on the ground. */
  stance: number;
  /** Half the stance sweep (px): planted foot runs from +reach (Contact) to −reach (toe-off). */
  reachPx: number;
  /** Runtime clip strideLength (world units per cycle). */
  strideWorld: number;
}

export function plantingFor(sheet: SheetSpec): PlantingSpec | null {
  if (sheet.gait === undefined) return null;
  const ch = CHARACTERS[sheet.character];
  const pxPerUnit = ch.height / ch.worldHeight;
  const strideWorld = GAIT_STRIDE[sheet.gait];
  const stance = GAIT_STANCE[sheet.gait];
  const cyclePx = strideWorld * pxPerUnit;
  return {
    pxPerUnit,
    cyclePx,
    perFramePx: cyclePx / sheet.frames,
    stance,
    reachPx: (cyclePx * stance) / 2,
    strideWorld,
  };
}

export interface PlantedFoot {
  foot: 'L' | 'R';
  /** Offset of the planted foot's ground contact from the anchor, along the walking direction (px, + = forward). */
  forwardPx: number;
}

/** Feet that are on the ground in frame `i` (0-based), with their required forward offset. */
export function plantedFeet(sheet: SheetSpec, i: number): PlantedFoot[] {
  const pl = plantingFor(sheet);
  if (!pl) return [];
  const out: PlantedFoot[] = [];
  const buf = [0, 0];
  for (const [foot, off] of [
    ['L', 0],
    ['R', 0.5],
  ] as const) {
    footCycle(i / sheet.frames + off, pl.stance, buf);
    if (buf[1] < 1e-6) out.push({ foot, forwardPx: buf[0] * pl.reachPx });
  }
  return out;
}
