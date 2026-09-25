import { BlendMode, Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint, SkPath } from '@shopify/react-native-skia';

import { fill, stroke } from '../paints';
import { fillRRect, scratch } from '../skiaScratch';
import { drawSpriteFrame } from '../sprites/spriteAnimation';
import type { SpriteAtlas, SpriteFrame } from '../sprites/spriteTypes';

/**
 * Head-top guard indicators from the reference sheet:
 *  - suspicion: dark disc, ring gauge, "?" — yellow → orange → red by quartile
 *  - alert: red "!" with a pop and glow
 *  - search: small pale "?"
 *
 * Glyphs come from the UI indicator atlas when registered (frame names
 * `question`, `alert`, `search`, anchored at their centre); otherwise they are
 * drawn with Skia paths. The suspicion ring gauge and glows are always Skia
 * overlays because they are driven by live values.
 */
export interface IconArt {
  disc: SkPaint;
  track: SkPaint;
  ring: SkPaint[];
  glyph: SkPaint[];
  glyphFill: SkPaint[];
  glyphOutline: SkPaint;
  dotOutline: SkPaint;
  searchGlyph: SkPaint;
  searchDot: SkPaint;
  alertFill: SkPaint;
  alertGlow: SkPaint;
  whistleLine: SkPaint;
  question: SkPath;
  sprite: { question: SpriteFrame | null; alert: SpriteFrame | null; search: SpriteFrame | null };
  spritePaint: SkPaint;
}

/** Glyph target height in world units. */
const GLYPH_H = 13;

// 0–25, 25–50, 50–75, 75–100 %
const BAND = ['#f2c744', '#f5c236', '#f39a2a', '#ea3a2e'];

export function createIconArt(atlas: SpriteAtlas | null): IconArt {
  const q = Skia.PathBuilder.Make();
  q.moveTo(-3.3, -2.8);
  q.cubicTo(-3.3, -6.8, 3.5, -6.9, 3.5, -2.7);
  q.cubicTo(3.5, 0.2, 0, 0.3, 0, 2.6);

  const glow = Skia.Paint();
  glow.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: 0, y: 0 },
      1,
      [
        Skia.Color('rgba(255,50,40,0.6)'),
        Skia.Color('rgba(255,40,30,0.18)'),
        Skia.Color('rgba(255,40,30,0)'),
      ],
      [0, 0.5, 1],
      TileMode.Clamp,
    ),
  );
  glow.setBlendMode(BlendMode.Screen);

  return {
    disc: fill('#0d1017', 0.9),
    track: stroke('#2b313c', 2.4),
    ring: BAND.map((c) => {
      const p = stroke(c, 2.6);
      return p;
    }),
    glyph: BAND.map((c) => stroke(c, 2.4)),
    glyphFill: BAND.map((c) => fill(c)),
    glyphOutline: stroke('#07080b', 4.6),
    dotOutline: fill('#07080b'),
    searchGlyph: stroke('#d6dde8', 2.2),
    searchDot: fill('#d6dde8'),
    alertFill: fill('#ff3b30'),
    alertGlow: glow,
    whistleLine: stroke('#f4f1e8', 1.6, 0.9),
    question: q.build(),
    sprite: {
      question: atlas?.question ?? null,
      alert: atlas?.alert ?? null,
      search: atlas?.search ?? null,
    },
    spritePaint: fill('#ffffff'),
  };
}

/** level 0..1. Draw with (x, y) = point above the guard's head. */
export function drawSuspicion(
  canvas: SkCanvas,
  art: IconArt,
  x: number,
  y: number,
  level: number,
  t: number,
): void {
  'worklet';
  const band = level < 0.25 ? 0 : level < 0.5 ? 1 : level < 0.75 ? 2 : 3;
  const pulse = band === 3 ? 1 + Math.sin(t * 16) * 0.06 : 1;
  canvas.save();
  canvas.translate(x, y);
  canvas.scale(pulse, pulse);
  if (band >= 2) {
    canvas.save();
    canvas.scale(19, 19);
    canvas.drawCircle(0, 0, 1, art.alertGlow);
    canvas.restore();
  }
  canvas.drawCircle(0, 0, 10.5, art.disc);
  canvas.drawCircle(0, 0, 10.5, art.track);
  const r = scratch().rect;
  r.x = -10.5;
  r.y = -10.5;
  r.width = 21;
  r.height = 21;
  canvas.drawArc(r, -90, Math.max(4, level * 360), false, art.ring[band]);
  const qs = art.sprite.question;
  if (qs !== null) {
    drawSpriteFrame(canvas, qs, 0, 0, (GLYPH_H * 0.8) / qs.sh, false, art.spritePaint);
  } else {
    canvas.drawPath(art.question, art.glyph[band]);
    canvas.drawCircle(0, 6, 1.6, art.glyphFill[band]);
  }
  canvas.restore();
}

/** age = seconds since the alert fired (drives the pop). */
export function drawAlert(
  canvas: SkCanvas,
  art: IconArt,
  x: number,
  y: number,
  age: number,
  t: number,
): void {
  'worklet';
  // Overshoot pop: 0 → 1.4 → 1 in ~0.35 s.
  const k = age / 0.35;
  const s =
    k >= 1
      ? 1 + Math.sin(t * 9) * 0.04
      : k < 0.6
        ? Math.max(0.01, (k / 0.6) * 1.4)
        : 1.4 - ((k - 0.6) / 0.4) * 0.4;
  canvas.save();
  canvas.translate(x, y);
  canvas.save();
  canvas.scale(22 * s, 22 * s);
  canvas.drawCircle(0, 0, 1, art.alertGlow);
  canvas.restore();
  const as = art.sprite.alert;
  if (as !== null) {
    drawSpriteFrame(canvas, as, 0, 0, (GLYPH_H * 1.6 * s) / as.sh, false, art.spritePaint);
    canvas.restore();
    return;
  }
  canvas.scale(s * 1.25, s * 1.25);
  fillRRect(canvas, -2.9, -9.6, 5.8, 12.6, 2.9, art.dotOutline);
  canvas.drawCircle(0, 6.8, 3.1, art.dotOutline);
  fillRRect(canvas, -1.8, -8.5, 3.6, 10.4, 1.8, art.alertFill);
  canvas.drawCircle(0, 6.8, 2, art.alertFill);
  canvas.restore();
}

export function drawSearch(canvas: SkCanvas, art: IconArt, x: number, y: number, t: number): void {
  'worklet';
  const bob = Math.sin(t * 3) * 1.2;
  canvas.save();
  canvas.translate(x, y + bob);
  const ss = art.sprite.search;
  if (ss !== null) {
    drawSpriteFrame(canvas, ss, 0, 0, GLYPH_H / ss.sh, false, art.spritePaint);
    canvas.restore();
    return;
  }
  canvas.scale(0.9, 0.9);
  canvas.drawPath(art.question, art.glyphOutline);
  canvas.drawCircle(0, 6, 2.6, art.dotOutline);
  canvas.drawPath(art.question, art.searchGlyph);
  canvas.drawCircle(0, 6, 1.5, art.searchDot);
  canvas.restore();
}

/** Short "sound lines" beside the head while whistling. */
export function drawWhistleLines(canvas: SkCanvas, art: IconArt, x: number, y: number, t: number): void {
  'worklet';
  const k = (t * 6) % 1;
  canvas.save();
  canvas.translate(x, y);
  for (let i = 0; i < 3; i++) {
    const a = -0.6 + i * 0.6;
    const r0 = 4 + k * 3;
    const r1 = 9 + k * 3;
    canvas.drawLine(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1, art.whistleLine);
  }
  canvas.restore();
}
