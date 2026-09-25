import { BlendMode, Skia, TileMode } from '@shopify/react-native-skia';
import type { SkPaint } from '@shopify/react-native-skia';

import { fill, stroke } from '../paints';

/**
 * Dynamic light paints in unit space (center 0,0, radius 1); callers
 * translate/scale the canvas so one paint serves any position and size.
 */
export interface LightFx {
  /** Cuts the darkness layer: small readability light around characters. */
  hole: SkPaint;
  diamondGlow: SkPaint;
  diamondCore: SkPaint;
  sparkle: SkPaint;
  alertWash: SkPaint;
  white: SkPaint;
  exitInactive: SkPaint;
  exitActive: SkPaint;
  exitEdge: SkPaint;
}

function unitRadial(colors: string[], pos: number[], mode: BlendMode): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: 0, y: 0 },
      1,
      colors.map((c) => Skia.Color(c)),
      pos,
      TileMode.Clamp,
    ),
  );
  p.setBlendMode(mode);
  return p;
}

export function createLightFx(): LightFx {
  const sparkle = stroke('#e9fbff', 1.2, 0.9);
  sparkle.setBlendMode(BlendMode.Screen);
  return {
    hole: unitRadial(['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0)'], [0, 0.5, 1], BlendMode.DstOut),
    diamondGlow: unitRadial(
      ['rgba(120,230,255,0.55)', 'rgba(40,180,255,0.22)', 'rgba(20,140,255,0)'],
      [0, 0.4, 1],
      BlendMode.Screen,
    ),
    diamondCore: unitRadial(['rgba(220,250,255,0.7)', 'rgba(120,220,255,0)'], [0, 1], BlendMode.Screen),
    sparkle,
    alertWash: unitRadial(['rgba(255,40,30,0.0)', 'rgba(255,30,20,0.35)'], [0.55, 1], BlendMode.SrcOver),
    white: fill('#ffffff'),
    exitInactive: fill('#263039', 0.78),
    exitActive: fill('#39e887', 0.62),
    exitEdge: stroke('#8affbd', 2, 0.95),
  };
}
