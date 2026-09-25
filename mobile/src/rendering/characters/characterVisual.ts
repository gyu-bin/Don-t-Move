import type { SkCanvas, SkPaint } from '@shopify/react-native-skia';

import { facingToDir } from '../../game/core/locomotion';
import { drawCharacter as drawFallbackCharacter } from '../fallback/proceduralCharacter';
import type { CharacterArt } from '../fallback/proceduralCharacter';
import { fill } from '../paints';
import { fillOval } from '../skiaScratch';
import { animForPose, drawSpriteFrame, pickFrame, resolveClip } from '../sprites/spriteAnimation';
import type { CharacterSpriteSet } from '../sprites/spriteTypes';

/**
 * What the renderer draws for one character type. Sprite sheets win; the
 * procedural rig is used only when no sprite set is registered or a needed
 * clip (after fallback rules) is missing.
 */
export interface CharacterVisual {
  sprites: CharacterSpriteSet | null;
  fallback: CharacterArt;
  shadow: SkPaint;
  paint: SkPaint;
}

export function createCharacterVisual(
  sprites: CharacterSpriteSet | null,
  fallback: CharacterArt,
): CharacterVisual {
  const paint = fill('#ffffff');
  paint.setAntiAlias(true);
  return { sprites, fallback, shadow: fill('#000000', 0.5), paint };
}

export function drawCharacterVisual(
  canvas: SkCanvas,
  v: CharacterVisual,
  x: number,
  y: number,
  facing: number,
  gait: number,
  phase: number,
  dist: number,
  t: number,
  action: number,
  actionT: number,
  integratedPhase = false,
): void {
  'worklet';
  const set = v.sprites;
  if (set !== null) {
    const clip = resolveClip(set, animForPose(gait, action, actionT), facingToDir(facing));
    if (clip !== null) {
      if (set.shadow) fillOval(canvas, x - 11, y - 3.6, 22, 7.2, v.shadow);
      drawSpriteFrame(canvas, pickFrame(clip, phase, t, dist, integratedPhase), x, y, set.scale, clip.mirror, v.paint);
      return;
    }
  }
  drawFallbackCharacter(canvas, v.fallback, x, y, facing, gait, phase, t, action, actionT);
}
