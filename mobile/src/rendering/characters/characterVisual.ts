import type { SkCanvas, SkPaint } from '@shopify/react-native-skia';

import { facingToDir } from '../../game/core/locomotion';
import { drawCharacter as drawFallbackCharacter } from '../fallback/proceduralCharacter';
import type { CharacterArt } from '../fallback/proceduralCharacter';
import { fill } from '../paints';
import { fillOval } from '../skiaScratch';
import { animForPose, drawSpriteFrame, pickFrame, resolveClip } from '../sprites/spriteAnimation';
import { locomotionBodyLift } from './locomotionPolish';
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
  /** Bilinear sampling of the sprite frames (see CHARACTER_LINEAR_SAMPLING). */
  linear: boolean;
}

/**
 * Visual Polish Pass 4: character sheets (1.92 px/world) are magnified ~1.67× on an iPhone 17. Native
 * `drawImageRect` samples nearest, which steps outlines unevenly; bilinear sampling removes the steps without
 * changing the sheets. Frames cannot bleed: the native call clamps to the source rect (kStrict) and every cell has
 * a transparent 1-px border (tools/locomotion/validate.ts). Set to false to restore nearest sampling.
 */
export const CHARACTER_LINEAR_SAMPLING = true;

export function createCharacterVisual(
  sprites: CharacterSpriteSet | null,
  fallback: CharacterArt,
  linear = CHARACTER_LINEAR_SAMPLING,
): CharacterVisual {
  const paint = fill('#ffffff');
  paint.setAntiAlias(true);
  return { sprites, fallback, shadow: fill('#000000', 0.5), paint, linear };
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
  animationOverride = -1,
  actualSpeed = 0,
): void {
  'worklet';
  const set = v.sprites;
  if (set !== null) {
    const animation = animationOverride >= 0 ? animationOverride : animForPose(gait, action, actionT);
    const clip = resolveClip(set, animation, facingToDir(facing));
    if (clip !== null) {
      if (set.shadow) fillOval(canvas, x - 11, y - 3.6, 22, 7.2, v.shadow);
      // Production atlases bake bob/lean; the runtime lift is only for the legacy sheets.
      const lift = set.bakedMotion ? 0 : locomotionBodyLift(phase, animation, actualSpeed);
      if (lift > 0) { canvas.save(); canvas.translate(0, -lift); }
      drawSpriteFrame(canvas, pickFrame(clip, phase, t, dist, integratedPhase), x, y, set.scale, clip.mirror, v.paint, v.linear);
      if (lift > 0) canvas.restore();
      return;
    }
  }
  drawFallbackCharacter(canvas, v.fallback, x, y, facing, gait, phase, t, action, actionT);
}
