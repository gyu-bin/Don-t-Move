import { BlendMode, Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint, SkPath, SkPathBuilder } from '@shopify/react-native-skia';

import { stroke } from '../paints';

/**
 * Red vision cone, drawn from the same ray-cast fan the gameplay check uses.
 * Shaders live in "unit cone space" (origin = guard, radius 1) so one paint per
 * awareness level serves every guard regardless of range.
 *
 * Passes per cone, all under the characters:
 *  - floor + edge: tinted fill and rim on the floor
 *  - hole:         cuts the darkness layer so the cone reads as lit and vivid
 */
export interface ConeArt {
  floor: SkPaint[];
  hole: SkPaint[];
  edge: SkPaint[];
  builder: SkPathBuilder;
}

function radial(colors: string[], pos: number[]) {
  return Skia.Shader.MakeRadialGradient(
    { x: 0, y: 0 },
    1,
    colors.map((c) => Skia.Color(c)),
    pos,
    TileMode.Clamp,
  );
}

function paintWith(colors: string[], pos: number[], mode?: BlendMode): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(radial(colors, pos));
  if (mode !== undefined) p.setBlendMode(mode);
  return p;
}

// Index = Awareness (Patrol, Suspicious, Alert, Search, Chase, Investigate, Return)
const FLOOR = [
  ['rgba(214,36,36,0.46)', 'rgba(190,24,24,0.26)', 'rgba(150,14,14,0.08)'],
  ['rgba(232,52,40,0.56)', 'rgba(210,34,28,0.32)', 'rgba(170,20,18,0.1)'],
  ['rgba(255,52,40,0.72)', 'rgba(240,34,28,0.46)', 'rgba(200,20,18,0.16)'],
  ['rgba(226,48,40,0.52)', 'rgba(200,30,26,0.3)', 'rgba(160,18,16,0.09)'],
];
const HOLE = [0.5, 0.6, 0.75, 0.55];

export function createConeArt(): ConeArt {
  const pos = [0, 0.55, 1];
  const levels = [0, 1, 2, 3, 2, 3, 0];
  return {
    floor: levels.map((i) => paintWith(FLOOR[i], pos)),
    hole: levels.map((i) => {
      const a = HOLE[i];
      return paintWith([`rgba(0,0,0,${a})`, `rgba(0,0,0,${a * 0.6})`, 'rgba(0,0,0,0.04)'], pos, BlendMode.DstOut);
    }),
    edge: levels.map((i) => {
      const a = [0.4, 0.5, 0.75, 0.45][i];
      const p = stroke('#ff4a3d', 1, a);
      return p;
    }),
    builder: Skia.PathBuilder.Make(),
  };
}

/**
 * Builds a guard's cone path in unit space. Call once per guard per frame and
 * reuse the result for every pass.
 */
export function buildConePath(
  art: ConeArt,
  fan: ArrayLike<number>,
  count: number,
  ox: number,
  oy: number,
  range: number,
): SkPath {
  'worklet';
  const b = art.builder;
  b.reset();
  b.moveTo(0, 0);
  const inv = 1 / range;
  for (let i = 0; i < count; i++) {
    b.lineTo((fan[i * 2] - ox) * inv, (fan[i * 2 + 1] - oy) * inv);
  }
  b.close();
  return b.detach();
}

export function drawConePass(
  canvas: SkCanvas,
  path: SkPath,
  paint: SkPaint,
  ox: number,
  oy: number,
  range: number,
): void {
  'worklet';
  canvas.save();
  canvas.translate(ox, oy);
  canvas.scale(range, range);
  canvas.drawPath(path, paint);
  canvas.restore();
}

export function drawConeEdge(
  canvas: SkCanvas,
  art: ConeArt,
  path: SkPath,
  level: number,
  ox: number,
  oy: number,
  range: number,
): void {
  'worklet';
  const e = art.edge[level];
  e.setStrokeWidth(1.2 / range);
  drawConePass(canvas, path, e, ox, oy, range);
}
