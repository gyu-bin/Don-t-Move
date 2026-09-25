import { BlendMode, PaintStyle, Skia, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import type { SkPaint } from '@shopify/react-native-skia';

/** JS-thread paint factories. Paints are created once and reused every frame. */

export function fill(color: string, alpha = 1): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  if (alpha < 1) p.setAlphaf(alpha);
  return p;
}

export function stroke(color: string, width: number, alpha = 1): SkPaint {
  const p = fill(color, alpha);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  return p;
}

export function blended(paint: SkPaint, mode: BlendMode): SkPaint {
  paint.setBlendMode(mode);
  return paint;
}

export function rgba(r: number, g: number, b: number, a: number): Float32Array {
  return Skia.Color(`rgba(${r},${g},${b},${a})`);
}
