import type { AnimName, DirName } from '../rendering/sprites/spriteTypes';
import { PLAYER_SPRITE_STRIDE } from '../game/core/locomotion';

/**
 * ASSET REGISTRY — the one file to edit when final art arrives.
 *
 * Every renderer asks the registry first and only falls back to procedural
 * drawing when an entry is `null`/missing:
 *
 *   characters.player / characters.guard   null → procedural rig fallback
 *   environment.museum.frames[name]         missing → procedural fallback per element
 *   ui.indicators.frames[name]              missing → Skia-drawn glyph
 *
 * CHARACTER DESIGN SOURCES (art/characters/SPEC.md → "Design sources"):
 *   Player look  = the current ASSETS Agent Zero (player_walk.png art)
 *   Player moves = FALLBACK rig body mechanics + locomotion.ts foot planting
 *   Guard look   = LEGACY guard (characters/legacy/guard_directions.png)
 *   Guard moves  = locomotion.ts body mechanics + foot planting
 * The procedural FALLBACK rig is a motion reference and dev fallback, never a look.
 *
 * Character sheets follow art/characters/SPEC.md: one PNG per animation
 * (assets/characters/<who>_<anim>.png), 256×256 cells, rows Down/Up/Left/Right,
 * feet anchor (128, 224). Each row maps to a direction clip via StripDef
 * (y = row × 256). A missing `left` clip is derived by mirroring `right`.
 */

/** Frame rect in source pixels. anchor is normalized (0..1) within the frame; default = bottom-centre. */
export interface FrameDef {
  x: number;
  y: number;
  w: number;
  h: number;
  anchor?: [number, number];
}

/** Horizontal strip of `count` equal frames starting at (x, y). */
export interface StripDef {
  x?: number;
  y?: number;
  frameW: number;
  frameH: number;
  count: number;
  anchor?: [number, number];
}

export interface ClipDef {
  image: ImageKey;
  frames: FrameDef[] | StripDef;
  /** Default: 'distance' for sneak/walk/run, 'time' otherwise. */
  mode?: 'distance' | 'time';
  fps?: number;
  loop?: boolean;
  /** World units per full locomotion cycle as authored (see SpriteClip.strideLength). */
  strideLength?: number;
}

export interface CharacterManifest {
  /** World units per source pixel (character ≈ 46 world units tall). */
  scale: number;
  shadow?: boolean;
  clips: Partial<Record<AnimName, Partial<Record<DirName, ClipDef>>>>;
}

export interface AtlasManifest {
  image: ImageKey;
  frames: Record<string, FrameDef>;
}

export interface AssetManifest {
  characters: { player: CharacterManifest | null; guard: CharacterManifest | null };
  environment: { museum: AtlasManifest | null };
  ui: { indicators: AtlasManifest | null };
}

/** All bitmap sources. Metro needs static `require` calls, so they live here. */
export const IMAGE_SOURCES = {
  museumAtlas: require('../../assets/museum/museum_atlas.png'),
  legacyAgent: require('../../assets/characters/legacy/agent_directions.png'),
  legacyGuard: require('../../assets/characters/legacy/guard_directions.png'),
  playerWalk: require('../../assets/characters/player_walk.png'),
} as const;
export type ImageKey = keyof typeof IMAGE_SOURCES;

// ----------------------------------------------------------------------------
// Museum environment kit — frames in museum_atlas.png (1254×1254).
// Floor / wall tiles ('floor', 'wallTop', 'wallFace') are not in the current
// atlas in a 3/4-compatible form, so the procedural fallback draws them.
// ----------------------------------------------------------------------------
const FLOOR_PROP: [number, number] = [0.5, 0.97];

const MUSEUM_ATLAS: AtlasManifest = {
  image: 'museumAtlas',
  frames: {
    statue: { x: 96, y: 352, w: 145, h: 259, anchor: FLOOR_PROP },
    statuePedestal: { x: 1027, y: 99, w: 148, h: 182, anchor: FLOOR_PROP },
    displayCase: { x: 378, y: 375, w: 202, h: 230, anchor: FLOOR_PROP },
    bench: { x: 658, y: 417, w: 255, h: 148, anchor: FLOOR_PROP },
    plant: { x: 1004, y: 363, w: 188, h: 244, anchor: FLOOR_PROP },
    crate: { x: 394, y: 685, w: 177, h: 184, anchor: FLOOR_PROP },
    painting: { x: 60, y: 693, w: 225, h: 178 },
    lamp: { x: 710, y: 706, w: 127, h: 138 },
    cctv: { x: 1034, y: 707, w: 118, h: 139 },
    diamond: { x: 90, y: 985, w: 172, h: 160 },
    exitSign: { x: 420, y: 958, w: 116, h: 52 },
  },
};

// ----------------------------------------------------------------------------
// Legacy single-pose character sheets (2×2: down, up / left, right).
// One static frame per direction, no walk cycle — not final animation.
// The LEGACY GUARD is the locked Guard design: its guard_*.png sheets must keep
// this look. The legacy agent is not a design source.
// ----------------------------------------------------------------------------
function legacyCharacter(image: ImageKey): CharacterManifest {
  const a: [number, number] = [0.5, 0.97];
  const frame = (x: number, y: number) => ({ image, frames: [{ x, y, w: 290, h: 470, anchor: a }] });
  return {
    scale: 50 / 470,
    shadow: true,
    clips: {
      idle: { down: frame(180, 85), up: frame(785, 85), left: frame(180, 700), right: frame(785, 700) },
    },
  };
}

export const LEGACY_CHARACTERS = {
  player: legacyCharacter('legacyAgent'),
  guard: legacyCharacter('legacyGuard'),
};

// ----------------------------------------------------------------------------
// Agent Zero WALK sheet (assets/characters/player_walk.png) — temporary Stage 01
// production asset and the Player's DESIGN source (look/palette/silhouette).
// Its motion is not final (walks in place; ASSET_TODO.md W7).
// 256×256 cells, rows Down/Up/Left/Right, 8 frames, feet anchor (128, 224).
// Left row = mirrored Right row. V1 reuses the same poses for all three moving
// gaits, but each gait has a distance-based cycle length tuned on iPhone.
// This keeps movement speed unchanged while avoiding the old 4.4 steps/sec walk.
// ----------------------------------------------------------------------------
const SHEET_ANCHOR: [number, number] = [0.5, 224 / 256];
const PLAYER_SCALE = 46 / 172;
const walkRow = (row: number, strideLength: number): ClipDef => ({
  image: 'playerWalk',
  frames: { y: row * 256, frameW: 256, frameH: 256, count: 8, anchor: SHEET_ANCHOR },
  strideLength,
});
const walkHold = (row: number, frame: number): ClipDef => ({
  image: 'playerWalk',
  frames: [{ x: frame * 256, y: row * 256, w: 256, h: 256, anchor: SHEET_ANCHOR }],
});

export const PLAYER_WALK_SHEET: CharacterManifest = {
  scale: PLAYER_SCALE,
  shadow: true,
  clips: {
    sneak: { down: walkRow(0, PLAYER_SPRITE_STRIDE.sneak), up: walkRow(1, PLAYER_SPRITE_STRIDE.sneak), left: walkRow(2, PLAYER_SPRITE_STRIDE.sneak), right: walkRow(3, PLAYER_SPRITE_STRIDE.sneak) },
    walk: { down: walkRow(0, PLAYER_SPRITE_STRIDE.walk), up: walkRow(1, PLAYER_SPRITE_STRIDE.walk), left: walkRow(2, PLAYER_SPRITE_STRIDE.walk), right: walkRow(3, PLAYER_SPRITE_STRIDE.walk) },
    run: { down: walkRow(0, PLAYER_SPRITE_STRIDE.run), up: walkRow(1, PLAYER_SPRITE_STRIDE.run), left: walkRow(2, PLAYER_SPRITE_STRIDE.run), right: walkRow(3, PLAYER_SPRITE_STRIDE.run) },
    idle: { down: walkHold(0, 3), up: walkHold(1, 3), left: walkHold(2, 3), right: walkHold(3, 3) },
  },
};

/**
 * Active manifest. Player: temporary WALK sheet. Guard: locked LEGACY design.
 * The procedural rig remains a development fallback only.
 */
export const ASSET_MANIFEST: AssetManifest = {
  characters: { player: PLAYER_WALK_SHEET, guard: LEGACY_CHARACTERS.guard },
  environment: { museum: MUSEUM_ATLAS },
  ui: { indicators: null },
};

/** Development only: every character on the procedural fallback rig. */
export const FALLBACK_MANIFEST: AssetManifest = {
  ...ASSET_MANIFEST,
  characters: { player: null, guard: null },
};
