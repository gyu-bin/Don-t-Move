/**
 * QA renderer for the opening. Draws the SAME drawMuseumScene/introFrame/openingLayout used by
 * the app (via CanvasKit instead of react-native-skia) and approximates the RN text/menu overlay
 * from the same layout. Output: Reports/OpeningV2/*.png
 *   node --import tsx tools/branding/renderOpening.ts [width height insetTop insetBottom]
 */
import * as fs from 'fs';
import * as path from 'path';
import type { CanvasKit, Canvas, Image as CKImage, Paint } from 'canvaskit-wasm';
import { initSkiaNode } from '../sprites/skiaNode';
import { openingLayout, type OpeningLayout } from '../../src/ui/branding/openingLayout';
import { INTRO_MS, introFrame } from '../../src/ui/branding/introTimeline';
import { drawMuseumScene, type SceneGfx, type SceneImageKey, type RGB } from '../../src/ui/branding/museumScene';

function ckGfx(ck: CanvasKit, c: Canvas, imgs: Record<SceneImageKey, CKImage>): SceneGfx {
  const col = (rgb: RGB, a: number) => ck.Color4f(rgb[0], rgb[1], rgb[2], a);
  const paint = () => { const p = new ck.Paint(); p.setAntiAlias(true); return p; };
  const full = ck.XYWHRect(-4000, -4000, 8000, 8000);
  return {
    image(key, x, y, w, h, alpha) {
      const img = imgs[key], p = paint(); p.setAlphaf(alpha);
      c.drawImageRectOptions(img, ck.XYWHRect(0, 0, img.width(), img.height()), ck.XYWHRect(x, y, w, h), ck.FilterMode.Linear, ck.MipmapMode.Linear, p);
    },
    imageRect(key, sx, sy, sw, sh, x, y, w, h, alpha) {
      const p = paint(); p.setAlphaf(alpha);
      c.drawImageRectOptions(imgs[key], ck.XYWHRect(sx, sy, sw, sh), ck.XYWHRect(x, y, w, h), ck.FilterMode.Linear, ck.MipmapMode.Linear, p);
    },
    rect(x, y, w, h, color, alpha) { const p = paint(); p.setColor(col(color, alpha)); c.drawRect(ck.XYWHRect(x, y, w, h), p); },
    vGradient(x, y, w, h, color, stops) {
      const p = paint();
      p.setShader(ck.Shader.MakeLinearGradient([x, y], [x, y + h], stops.map(s => col(color, s[1])), stops.map(s => s[0]), ck.TileMode.Clamp));
      c.drawRect(ck.XYWHRect(x, y, w, h), p);
    },
    poly(points, fx, fy, tx, ty, color, a0, a1, blur) {
      const p = paint(), pb = new ck.PathBuilder();
      pb.moveTo(points[0], points[1]); for (let i = 2; i < points.length; i += 2) pb.lineTo(points[i], points[i + 1]); pb.close();
      const pa = pb.detachAndDelete();
      p.setShader(ck.Shader.MakeLinearGradient([fx, fy], [tx, ty], [col(color, a0), col(color, a1)], null, ck.TileMode.Clamp));
      if (blur > 0) p.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, blur, true));
      c.drawPath(pa, p);
    },
    glow(cx, cy, rx, ry, color, alpha) {
      if (alpha <= 0) return;
      c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
      const p = paint();
      p.setShader(ck.Shader.MakeRadialGradient([0, 0], rx, [col(color, alpha), col(color, 0)], null, ck.TileMode.Clamp));
      c.drawCircle(0, 0, rx, p); c.restore();
    },
    save() { c.save(); }, restore() { c.restore(); },
    translate(x, y) { c.translate(x, y); },
    rotate(deg, px, py) { c.rotate(deg, px, py); },
    scale(sx, sy, px, py) { c.translate(px, py); c.scale(sx, sy); c.translate(-px, -py); },
    beginLayer() { c.saveLayer(); },
    endEllipseMask(cx, cy, rx, ry, alpha) {
      c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
      const p = paint(); p.setBlendMode(ck.BlendMode.DstIn);
      p.setShader(ck.Shader.MakeRadialGradient([0, 0], rx, [ck.Color4f(0, 0, 0, alpha), ck.Color4f(0, 0, 0, alpha * 0.85), ck.Color4f(0, 0, 0, 0)], [0, 0.55, 1], ck.TileMode.Clamp));
      c.drawRect(full, p); c.restore(); c.restore();
    },
    endTint(color, alpha) {
      const p = paint(); p.setBlendMode(ck.BlendMode.SrcATop); p.setColor(col(color, alpha));
      c.drawRect(full, p); c.restore();
    },
    endFadeBelow(y0, y1) {
      const p = paint(); p.setBlendMode(ck.BlendMode.DstIn);
      p.setShader(ck.Shader.MakeLinearGradient([0, y0], [0, y1], [ck.Color4f(0, 0, 0, 1), ck.Color4f(0, 0, 0, 0)], null, ck.TileMode.Clamp));
      c.drawRect(full, p); c.restore();
    },
  };
}

type Fonts = { logo: ReturnType<CanvasKit['Typeface']['MakeFreeTypeFaceFromData']>; text: ReturnType<CanvasKit['Typeface']['MakeFreeTypeFaceFromData']> };
function text(ck: CanvasKit, c: Canvas, face: Fonts['logo'], s: string, x: number, y: number, size: number, color: Float32Array, center = true, spacing = 0) {
  if (!face) return;
  const font = new ck.Font(face, size); const p = new ck.Paint(); p.setColor(color); p.setAntiAlias(true);
  const glyphs = font.getGlyphIDs(s); const widths = font.getGlyphWidths(glyphs);
  const w = widths.reduce((a, b) => a + b, 0) + spacing * (s.length - 1);
  let cx = center ? x - w / 2 : x;
  for (let i = 0; i < s.length; i++) { c.drawText(s[i], cx, y, p, font); cx += widths[i] + spacing; }
}
/** Approximation of the RN logo/menu overlay (fonts differ from iOS system font). */
function overlay(ck: CanvasKit, c: Canvas, L: OpeningLayout, f: ReturnType<typeof introFrame>, fonts: Fonts, menu: number, lang: 'ko' | 'en') {
  const ivory = (a: number) => ck.Color4f(1, 244 / 255, 214 / 255, a);
  const cy = L.logoTop, s = L.logoSize;
  const block = (a: number, dy: number, fn: () => void) => { if (a <= 0) return; c.save(); c.translate(0, dy); c.rotate(-6, L.W / 2, cy + s); c.saveLayer(); fn(); const p = new ck.Paint(); p.setBlendMode(ck.BlendMode.DstIn); p.setColor(ck.Color4f(0, 0, 0, a)); c.drawRect(ck.XYWHRect(-2000, -2000, 4000, 4000), p); c.restore(); c.restore(); };
  block(f.logoTop, (1 - f.logoTop) * 10, () => text(ck, c, fonts.logo, "DON'T", L.W / 2, cy + s * 0.86, s, ivory(1)));
  block(f.logoBottom, (1 - f.logoBottom) * 10, () => text(ck, c, fonts.logo, 'MOVE', L.W / 2, cy + s * 1.74, s, ivory(1)));
  block(f.underline, 0, () => { const p = new ck.Paint(); p.setColor(ck.Color4f(62 / 255, 197 / 255, 1, 1)); c.drawRect(ck.XYWHRect(L.W / 2 - s * 0.62, cy + s * 2.02, s * 1.24, 3), p); });
  if (f.tagline > 0) { text(ck, c, fonts.text, 'A STEALTH GAME', L.W / 2, cy + s * 2.5, 9, ck.Color4f(0.68, 0.76, 0.8, f.tagline), true, 2.2); text(ck, c, fonts.text, 'IN YOUR HANDS', L.W / 2, cy + s * 2.5 + 14, 9, ck.Color4f(0.68, 0.76, 0.8, f.tagline), true, 2.2); }
  if (f.copy > 0) ['SOME THINGS', 'SHOULD STAY', 'UNTOUCHED'].forEach((l, i) => text(ck, c, fonts.text, l, L.W / 2, L.H * 0.78 + i * 20, 10, ck.Color4f(0.68, 0.76, 0.8, f.copy), true, 3.6));
  if (menu > 0) {
    const m = L.menu; const labels = lang === 'ko' ? ['계속하기', '챕터 선택', '설정'] : ['CONTINUE', 'CHAPTER SELECT', 'SETTINGS'];
    let y = m.y;
    labels.forEach((label, i) => {
      const h = i === 0 ? m.primaryH : m.secondaryH; const rr = ck.RRectXY(ck.XYWHRect(m.x, y, m.w, h), 16, 16);
      const fill = new ck.Paint(); fill.setAntiAlias(true); fill.setColor(ck.Color4f(3 / 255, 12 / 255, 20 / 255, i === 0 ? 0.8 : 0.66)); c.drawRRect(rr, fill);
      const st = new ck.Paint(); st.setAntiAlias(true); st.setStyle(ck.PaintStyle.Stroke); st.setStrokeWidth(i === 0 ? 1.6 : 1); st.setColor(i === 0 ? ck.Color4f(62 / 255, 197 / 255, 1, 1) : ck.Color4f(0.33, 0.43, 0.5, 1)); c.drawRRect(rr, st);
      text(ck, c, fonts.text, label, L.W / 2, y + (i === 0 ? 30 : 31), i === 0 ? 17 : 15, ivory(1));
      if (i === 0) { text(ck, c, fonts.text, lang === 'ko' ? '미션 01-04' : 'MISSION 01-04', L.W / 2, y + 49, 10, ck.Color4f(0.62, 0.71, 0.75, 1), true, 1.2); text(ck, c, fonts.text, '›', m.x + m.w - 22, y + 38, 26, ivory(1)); }
      y += h + m.gap;
    });
    text(ck, c, fonts.text, 'SILENCE IS A SKILL', L.W / 2, L.H - L.taglineBottom, 8.5, ck.Color4f(0.48, 0.57, 0.62, 1), true, 3);
  }
}
function splash(ck: CanvasKit, c: Canvas, W: number, H: number, fonts: Fonts) {
  const p = new ck.Paint(); p.setColor(ck.Color4f(8 / 255, 24 / 255, 36 / 255, 1)); c.drawRect(ck.XYWHRect(0, 0, W, H), p);
  const ivory = ck.Color4f(1, 244 / 255, 214 / 255, 1), s = 54, cy = H * 0.42;
  c.save(); c.rotate(-6, W / 2, cy); text(ck, c, fonts.logo, "DON'T", W / 2, cy - 4, s, ivory); text(ck, c, fonts.logo, 'MOVE', W / 2, cy + s * 0.88, s, ivory);
  const u = new ck.Paint(); u.setColor(ck.Color4f(62 / 255, 197 / 255, 1, 1)); c.drawRect(ck.XYWHRect(W / 2 - 38, cy + s * 1.25, 76, 3), u); c.restore();
  text(ck, c, fonts.text, 'A STEALTH GAME', W / 2, cy + s * 1.95, 9, ck.Color4f(0.68, 0.76, 0.8, 1), true, 2.2);
  text(ck, c, fonts.text, 'IN YOUR HANDS', W / 2, cy + s * 1.95 + 14, 9, ck.Color4f(0.68, 0.76, 0.8, 1), true, 2.2);
  text(ck, c, fonts.text, 'SILENCE IS A SKILL', W / 2, H - 48, 8.5, ck.Color4f(0.48, 0.57, 0.62, 1), true, 3);
}

async function main() {
  const [W, H, top, bottom] = (process.argv.slice(2).map(Number).filter(n => !Number.isNaN(n)).length === 4 ? process.argv.slice(2).map(Number) : [402, 874, 62, 34]);
  const ck = await initSkiaNode();
  const load = (f: string) => ck.MakeImageFromEncoded(fs.readFileSync(path.join('assets/branding/opening', f)))!;
  const imgs = { bg: load('bg_museum.png'), thiefPeek: load('thief_peek.png'), thiefSneak: load('thief_sneak.png'), thiefFreeze: load('thief_freeze.png'),
    guardAway: load('guard_away.png'), guardTurn: load('guard_turn.png'), column: load('fg_column_left.png') };
  const tryFont = (ps: string[]) => { for (const p of ps) if (fs.existsSync(p)) return ck.Typeface.MakeFreeTypeFaceFromData(fs.readFileSync(p).buffer as ArrayBuffer); return null; };
  const fonts: Fonts = {
    logo: tryFont(['/usr/share/fonts/truetype/lato/Lato-BlackItalic.ttf', '/System/Library/Fonts/Supplemental/Arial Black.ttf']),
    text: tryFont(['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/System/Library/Fonts/AppleSDGothicNeo.ttc']),
  };
  const L = openingLayout(W, H, { top, bottom, left: 0, right: 0 });
  const out = `Reports/OpeningV2/${W}x${H}`; fs.mkdirSync(out, { recursive: true });
  const scale = 2;
  const shot = (name: string, draw: (c: Canvas) => void) => {
    const surf = ck.MakeSurface(W * scale, H * scale)!; const c = surf.getCanvas(); c.scale(scale, scale); draw(c);
    const img = surf.makeImageSnapshot(); fs.writeFileSync(`${out}/${name}.png`, img.encodeToBytes()!); surf.delete();
  };
  shot('01-splash', c => splash(ck, c, W, H, fonts));
  const frames: [string, number, number][] = [['02-intro-0.25s-museum', 250, 0], ['03-intro-1.0s-diamond', 1000, 0], ['04-intro-1.6s-thief-peek', 1600, 0],
    ['05-intro-2.3s-thief-sneak', 2300, 0], ['06-intro-2.7s-guard-turn-startle', 2700, 0], ['07-intro-3.0s-dive', 3000, 0], ['08-intro-3.3s-peek-light', 3300, 0],
    ['08b-intro-3.45s-freeze', 3450, 0], ['08c-intro-4.0s-logo', 4000, 0], ['09-intro-4.5s-final', INTRO_MS, 0], ['10-lobby', INTRO_MS, 1], ['10-lobby-en', INTRO_MS, 1]];
  for (const [name, ms, menu] of frames) {
    const f = introFrame(ms);
    shot(name, c => { drawMuseumScene(ckGfx(ck, c, imgs), L, f); overlay(ck, c, L, f, fonts, menu, name.endsWith('-en') ? 'en' : 'ko'); });
  }
  console.log(JSON.stringify({ out, W, H, face: L.face, peekFace: L.peekFace, hideSpot: L.hideSpot, thief: L.thief, guardFeet: L.guardFeet, flashlight: L.flashlight, diamond: L.diamond, column: L.column, pedestalBottomY: L.pedestalBottomY, menu: L.menu }, null, 1));
}
void main();
