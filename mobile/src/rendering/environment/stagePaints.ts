import {BlendMode,Skia,TileMode} from '@shopify/react-native-skia';
import type {SkPaint} from '@shopify/react-native-skia';

function gradient(shader: ReturnType<typeof Skia.Shader.MakeLinearGradient>, mode?: BlendMode): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(shader);
  if (mode !== undefined) p.setBlendMode(mode);
  return p;
}

export function linear(x0: number, y0: number, x1: number, y1: number, colors: string[]): SkPaint {
  return gradient(
    Skia.Shader.MakeLinearGradient(
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      colors.map((c) => Skia.Color(c)),
      null,
      TileMode.Clamp,
    ),
  );
}

export function radial(
  cx: number,
  cy: number,
  r: number,
  colors: string[],
  pos: number[],
  mode: BlendMode,
): SkPaint {
  return gradient(
    Skia.Shader.MakeRadialGradient(
      { x: cx, y: cy },
      r,
      colors.map((c) => Skia.Color(c)),
      pos,
      TileMode.Clamp,
    ),
    mode,
  );
}
