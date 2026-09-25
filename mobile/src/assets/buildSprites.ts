import type { SkImage } from '@shopify/react-native-skia';

import { ANIM_COUNT, ANIM_NAMES, DIR_NAMES } from '../rendering/sprites/spriteTypes';
import type {
  CharacterSpriteSet,
  SpriteAtlas,
  SpriteClip,
  SpriteFrame,
} from '../rendering/sprites/spriteTypes';
import type {
  AssetManifest,
  AtlasManifest,
  CharacterManifest,
  ClipDef,
  FrameDef,
  ImageKey,
  StripDef,
} from './manifest';

/** Decoded, render-ready assets. `null` members mean "use the procedural fallback". */
export interface GameAssets {
  player: CharacterSpriteSet | null;
  guard: CharacterSpriteSet | null;
  museum: SpriteAtlas | null;
  indicators: SpriteAtlas | null;
}

type Images = Partial<Record<ImageKey, SkImage>>;

function frame(image: SkImage, f: FrameDef): SpriteFrame {
  const [nx, ny] = f.anchor ?? [0.5, 1];
  return { image, sx: f.x, sy: f.y, sw: f.w, sh: f.h, ax: f.w * nx, ay: f.h * ny };
}

function isStrip(f: FrameDef[] | StripDef): f is StripDef {
  return !Array.isArray(f);
}

function clip(def: ClipDef, images: Images, locomotion: boolean, mirror: boolean): SpriteClip | null {
  const image = images[def.image];
  if (!image) return null;
  let frames: SpriteFrame[];
  if (isStrip(def.frames)) {
    const s = def.frames;
    frames = [];
    for (let i = 0; i < s.count; i++) {
      frames.push(
        frame(image, {
          x: (s.x ?? 0) + i * s.frameW,
          y: s.y ?? 0,
          w: s.frameW,
          h: s.frameH,
          anchor: s.anchor,
        }),
      );
    }
  } else {
    frames = def.frames.map((f) => frame(image, f));
  }
  if (frames.length === 0) return null;
  return {
    frames,
    mode: def.mode ?? (locomotion ? 'distance' : 'time'),
    fps: def.fps ?? 8,
    loop: def.loop ?? true,
    mirror,
    strideLength: def.strideLength ?? 0,
  };
}

export function buildCharacterSet(m: CharacterManifest, images: Images): CharacterSpriteSet {
  const clips: (SpriteClip | null)[][] = [];
  for (let a = 0; a < ANIM_COUNT; a++) {
    const name = ANIM_NAMES[a];
    const locomotion = name === 'sneak' || name === 'walk' || name === 'run';
    const byDir = m.clips[name];
    const row: (SpriteClip | null)[] = DIR_NAMES.map((d) => {
      const def = byDir?.[d];
      return def ? clip(def, images, locomotion, false) : null;
    });
    // Left missing → mirror Right.
    const right = byDir?.right;
    if (row[3] === null && right) row[3] = clip(right, images, locomotion, true);
    clips.push(row);
  }
  return { clips, scale: m.scale, shadow: m.shadow ?? true };
}

export function buildAtlas(m: AtlasManifest, images: Images): SpriteAtlas | null {
  const image = images[m.image];
  if (!image) return null;
  const out: SpriteAtlas = {};
  for (const [name, f] of Object.entries(m.frames)) out[name] = frame(image, f);
  return out;
}

/** Image keys a manifest actually references (only those get loaded). */
export function referencedImages(m: AssetManifest): ImageKey[] {
  const keys = new Set<ImageKey>();
  for (const c of [m.characters.player, m.characters.guard]) {
    if (!c) continue;
    for (const byDir of Object.values(c.clips))
      for (const def of Object.values(byDir ?? {})) if (def) keys.add(def.image);
  }
  if (m.environment.museum) keys.add(m.environment.museum.image);
  if (m.ui.indicators) keys.add(m.ui.indicators.image);
  return [...keys];
}

export function buildGameAssets(m: AssetManifest, images: Images): GameAssets {
  return {
    player: m.characters.player ? buildCharacterSet(m.characters.player, images) : null,
    guard: m.characters.guard ? buildCharacterSet(m.characters.guard, images) : null,
    museum: m.environment.museum ? buildAtlas(m.environment.museum, images) : null,
    indicators: m.ui.indicators ? buildAtlas(m.ui.indicators, images) : null,
  };
}
