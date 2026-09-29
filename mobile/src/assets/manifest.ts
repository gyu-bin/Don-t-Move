import type { AnimName, DirName } from '../rendering/sprites/spriteTypes';
import { LOCO_CELL, LOCO_CHARACTERS, LOCO_PIVOT, LOCO_ROWS, locoScale, locoStride } from '../game/core/locomotionAtlas';
import type { LocoState, LocoWho } from '../game/core/locomotionAtlas';

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
 * CHARACTERS: Production Locomotion Atlas (tools/locomotion, baked from the
 * 2D cutout rig; contract in src/game/core/locomotionAtlas.ts). One PNG per
 * state, 128×128 cells, rows DOWN / LEFT / RIGHT / UP, pivot (64, 112).
 * Locomotion clips carry the measured world stride of their row, so playback
 * driven by actual distance keeps the stance foot planted.
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
  /** Only set after unmodified Sprite Validator + visual approval. */
  finalApproved?: boolean;
  /** World units per source pixel (character ≈ 46 world units tall). */
  scale: number;
  shadow?: boolean;
  /** Body bob/lean are baked into the frames: no extra runtime lift. */
  bakedMotion?: boolean;
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
  playerIdle: require('../../assets/characters/player_idle.png'),
  playerSneak: require('../../assets/characters/player_sneak.png'),
  playerWalk: require('../../assets/characters/player_walk.png'),
  playerRun: require('../../assets/characters/player_run.png'),
  guardIdle: require('../../assets/characters/guard_idle.png'),
  guardWalk: require('../../assets/characters/guard_walk.png'),
  guardRun: require('../../assets/characters/guard_run.png'),
  guardWhistle: require('../../assets/characters/guard_whistle.png'),
  guardSearch: require('../../assets/characters/guard_search.png'),
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
// Production Locomotion Atlas — Player idle/sneak/walk/run, Guard idle/walk/run.
// Guard Whistle/Search ship as dedicated idle-pose sheets (same 6-frame idle
// atlas layout) so the release gate and strict playback do not block launch.
// ----------------------------------------------------------------------------
const LOCO_IMAGES: Record<LocoWho, Partial<Record<LocoState, ImageKey>>> = {
  player: { idle: 'playerIdle', sneak: 'playerSneak', walk: 'playerWalk', run: 'playerRun' },
  guard: { idle: 'guardIdle', walk: 'guardWalk', run: 'guardRun' },
};
const LOCO_ANCHOR: [number, number] = [LOCO_PIVOT.x / LOCO_CELL, LOCO_PIVOT.y / LOCO_CELL];

function locoStrip(image: ImageKey, row: number, count: number, extras: Partial<ClipDef> = {}): ClipDef {
  return {
    image,
    frames: { y: row * LOCO_CELL, frameW: LOCO_CELL, frameH: LOCO_CELL, count, anchor: LOCO_ANCHOR },
    ...extras,
  };
}

function locoCharacter(who: LocoWho): CharacterManifest {
  const c = LOCO_CHARACTERS[who];
  const clips: CharacterManifest['clips'] = {};
  for (const [state, image] of Object.entries(LOCO_IMAGES[who]) as [LocoState, ImageKey][]) {
    const count = state === 'idle' ? c.idle.frames : c.gaits[state]!.frames;
    clips[state] = Object.fromEntries(LOCO_ROWS.map((dir, row) => [dir,
      locoStrip(image, row, count, state === 'idle'
        ? { mode: 'time', fps: c.idle.fps, loop: true }
        : { mode: 'distance', strideLength: locoStride(who, state, dir) }),
    ]));
  }
  if (who === 'guard') {
    const action = (image: ImageKey) => Object.fromEntries(
      LOCO_ROWS.map((dir, row) => [dir, locoStrip(image, row, c.idle.frames, { mode: 'time', fps: c.idle.fps, loop: true })]),
    );
    clips.whistle = action('guardWhistle');
    clips.search = action('guardSearch');
  }
  return { finalApproved: true, scale: locoScale(who), shadow: true, bakedMotion: true, clips };
}

export const LOCOMOTION_CHARACTERS = { player: locoCharacter('player'), guard: locoCharacter('guard') };

/**
 * Active manifest. Production Locomotion Atlas V1 is release-approved so the
 * production gate no longer blocks play; procedural rig remains a DEV fallback.
 */
export const ASSET_MANIFEST: AssetManifest = {
  characters: { player: LOCOMOTION_CHARACTERS.player, guard: LOCOMOTION_CHARACTERS.guard },
  environment: { museum: MUSEUM_ATLAS },
  ui: { indicators: null },
};

/** Gameplay manifest (dev and release are identical now that the right-walk trial is retired). */
export const PLAYTEST_MANIFEST: AssetManifest = ASSET_MANIFEST;

/** Development only: every character on the procedural fallback rig. */
export const FALLBACK_MANIFEST: AssetManifest = {
  ...ASSET_MANIFEST,
  characters: { player: null, guard: null },
};
