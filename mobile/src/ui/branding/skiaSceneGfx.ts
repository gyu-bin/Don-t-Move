import { BlendMode, BlurStyle, FilterMode, MipmapMode, Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';
import type { RGB, SceneGfx, SceneImageKey } from './museumScene';

/** react-native-skia implementation of SceneGfx (runs inside the UI-thread picture worklet). */
export function skiaSceneGfx(c: SkCanvas, images: Record<SceneImageKey, SkImage>): SceneGfx {
  'worklet';
  const col = (rgb: RGB, a: number) => Float32Array.of(rgb[0], rgb[1], rgb[2], a);
  const paint = () => { const p = Skia.Paint(); p.setAntiAlias(true); return p; };
  const full = Skia.XYWHRect(-4000, -4000, 8000, 8000);
  return {
    image(key, x, y, w, h, alpha) {
      const img = images[key], p = paint(); p.setAlphaf(alpha);
      c.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x, y, w, h), FilterMode.Linear, MipmapMode.Linear, p);
    },
    imageRect(key, sx, sy, sw, sh, x, y, w, h, alpha) {
      const p = paint(); p.setAlphaf(alpha);
      c.drawImageRectOptions(images[key], Skia.XYWHRect(sx, sy, sw, sh), Skia.XYWHRect(x, y, w, h), FilterMode.Linear, MipmapMode.Linear, p);
    },
    rect(x, y, w, h, color, alpha) { const p = paint(); p.setColor(col(color, alpha)); c.drawRect(Skia.XYWHRect(x, y, w, h), p); },
    vGradient(x, y, w, h, color, stops) {
      const p = paint();
      p.setShader(Skia.Shader.MakeLinearGradient({ x, y }, { x, y: y + h }, stops.map(s => col(color, s[1])), stops.map(s => s[0]), TileMode.Clamp));
      c.drawRect(Skia.XYWHRect(x, y, w, h), p);
    },
    poly(points, fx, fy, tx, ty, color, a0, a1, blur) {
      const p = paint(), builder = Skia.PathBuilder.Make();
      builder.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) builder.lineTo(points[i], points[i + 1]);
      builder.close();
      const path = builder.detach();
      p.setShader(Skia.Shader.MakeLinearGradient({ x: fx, y: fy }, { x: tx, y: ty }, [col(color, a0), col(color, a1)], null, TileMode.Clamp));
      if (blur > 0) p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true));
      c.drawPath(path, p);
    },
    glow(cx, cy, rx, ry, color, alpha) {
      if (alpha <= 0) return;
      c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
      const p = paint();
      p.setShader(Skia.Shader.MakeRadialGradient({ x: 0, y: 0 }, rx, [col(color, alpha), col(color, 0)], null, TileMode.Clamp));
      c.drawCircle(0, 0, rx, p); c.restore();
    },
    save() { c.save(); }, restore() { c.restore(); },
    translate(x, y) { c.translate(x, y); },
    rotate(deg, px, py) { c.rotate(deg, px, py); },
    scale(sx, sy, px, py) { c.translate(px, py); c.scale(sx, sy); c.translate(-px, -py); },
    beginLayer() { c.saveLayer(); },
    endEllipseMask(cx, cy, rx, ry, alpha) {
      c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
      const p = paint(); p.setBlendMode(BlendMode.DstIn);
      p.setShader(Skia.Shader.MakeRadialGradient({ x: 0, y: 0 }, rx,
        [Float32Array.of(0, 0, 0, alpha), Float32Array.of(0, 0, 0, alpha * 0.85), Float32Array.of(0, 0, 0, 0)], [0, 0.55, 1], TileMode.Clamp));
      c.drawRect(full, p); c.restore(); c.restore();
    },
    endTint(color, alpha) {
      const p = paint(); p.setBlendMode(BlendMode.SrcATop); p.setColor(col(color, alpha));
      c.drawRect(full, p); c.restore();
    },
    endFadeBelow(y0, y1) {
      const p = paint(); p.setBlendMode(BlendMode.DstIn);
      p.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: y0 }, { x: 0, y: y1 }, [Float32Array.of(0, 0, 0, 1), Float32Array.of(0, 0, 0, 0)], null, TileMode.Clamp));
      c.drawRect(full, p); c.restore();
    },
  };
}
