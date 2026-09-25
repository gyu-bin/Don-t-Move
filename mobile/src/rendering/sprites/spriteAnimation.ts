import type { SkCanvas, SkPaint } from '@shopify/react-native-skia';

import { scratch } from '../skiaScratch';
import { Anim } from './spriteTypes';
import type { CharacterSpriteSet, SpriteClip, SpriteFrame } from './spriteTypes';

/**
 * Sprite animation worklets: choose the clip for a pose, pick the frame, draw it.
 * No allocation per call (rects come from the shared scratch).
 */

/** Discrete animation state for a continuous gait + guard action. */
export function animForPose(gait: number, action: number, actionT: number): number {
  'worklet';
  if (actionT > 0.18) {
    if (action === 1) return Anim.Whistle;
    if (action === 2) return Anim.Search;
  }
  if (gait < 0.5) return Anim.Idle;
  if (gait < 1.5) return Anim.Sneak;
  if (gait < 2.5) return Anim.Walk;
  return Anim.Run;
}

/**
 * Clip lookup with fallbacks so partial asset drops still render:
 *   sneak → walk → idle, run → walk → idle, whistle/search → idle.
 * Direction fallback (left ← mirrored right) is resolved at load time.
 */
export function resolveClip(set: CharacterSpriteSet, anim: number, dir: number): SpriteClip | null {
  'worklet';
  let a = anim;
  for (let guard = 0; guard < 4; guard++) {
    const c = set.clips[a][dir];
    if (c !== null) return c;
    if (a === Anim.Idle) return null;
    a = a === Anim.Sneak || a === Anim.Run ? Anim.Walk : Anim.Idle;
  }
  return null;
}

export function pickFrame(clip: SpriteClip, phase: number, t: number, dist: number, integratedPhase = false): SpriteFrame {
  'worklet';
  const n = clip.frames.length;
  if (n === 1) return clip.frames[0];
  let i: number;
  if (clip.mode === 'distance') {
    const p = !integratedPhase && clip.strideLength > 0 ? (dist / clip.strideLength) % 1 : phase;
    i = Math.floor(p * n);
  } else {
    i = Math.floor(t * clip.fps);
    if (!clip.loop && i >= n) i = n - 1;
  }
  return clip.frames[((i % n) + n) % n];
}

/** Draws a frame with its anchor at (x, y). */
export function drawSpriteFrame(
  canvas: SkCanvas,
  f: SpriteFrame,
  x: number,
  y: number,
  scale: number,
  mirror: boolean,
  paint: SkPaint,
): void {
  'worklet';
  const s = scratch();
  const src = s.rect;
  src.x = f.sx;
  src.y = f.sy;
  src.width = f.sw;
  src.height = f.sh;
  const dst = s.rrect.rect;
  dst.x = x - f.ax * scale;
  dst.y = y - f.ay * scale;
  dst.width = f.sw * scale;
  dst.height = f.sh * scale;
  if (mirror) {
    canvas.save();
    canvas.translate(x, 0);
    canvas.scale(-1, 1);
    canvas.translate(-x, 0);
    canvas.drawImageRect(f.image, src, dst, paint);
    canvas.restore();
  } else {
    canvas.drawImageRect(f.image, src, dst, paint);
  }
}
