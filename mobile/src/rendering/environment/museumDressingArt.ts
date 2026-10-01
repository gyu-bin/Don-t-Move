import { Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint } from '@shopify/react-native-skia';
import type { DressingItem } from '../../game/levels/StageDefinition';
import { DRESSING_KIT } from '../../game/world/dressingKit';
import { TILE } from '../../game/world/compileStage';
import type { SpriteAtlas } from '../sprites/spriteTypes';
import { fill, stroke } from '../paints';

// All geometry is baked into static pictures. The common base rectangle is the
// same footprint used by compileStage; vertical lift is visual height only.
const rect = (c: SkCanvas, x: number, y: number, w: number, h: number, color: string | SkPaint) =>
  c.drawRect(Skia.XYWHRect(x, y, w, h), typeof color === 'string' ? fill(color) : color);
const line = (c: SkCanvas, x: number, y: number, xx: number, yy: number, color: string, width = 1) =>
  c.drawLine(x, y, xx, yy, stroke(color, width));
const oval = (c: SkCanvas, x: number, y: number, w: number, h: number, color: string) =>
  c.drawOval(Skia.XYWHRect(x, y, w, h), fill(color));
function shade(y: number, h: number, colors: string[]) {
  const p = Skia.Paint(); p.setAntiAlias(true);
  p.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y }, { x: 0, y: y + h }, colors.map(v => Skia.Color(v)), null, TileMode.Clamp));
  return p;
}
function plinth(c: SkCanvas, w: number, d: number, h: number, pale = false) {
  rect(c, -w / 2, -d - h, w, d, shade(-d - h, d, pale ? ['#a69e85', '#777967'] : ['#3c4244', '#242d32']));
  rect(c, -w / 2, -h, w, h, shade(-h, h, pale ? ['#777b70', '#4b5452'] : ['#28343b', '#111d26']));
  rect(c, -w / 2 + 3, -h + 3, w - 6, Math.max(1, h - 6), pale ? '#626a61' : '#19262e');
  line(c, -w / 2, -d - h, w / 2, -d - h, '#b7a374', 1.3);
  line(c, -w / 2, -h, w / 2, -h, '#a28a56', 1.2);
  line(c, -w / 2 + 1, -h, -w / 2 + 1, -1, '#83909155');
  line(c, w / 2 - 1, -h, w / 2 - 1, -1, '#09121b', 2);
  line(c, -w / 2, -1, w / 2, -1, '#726647', 1.5);
  // Thin masonry veins, beveled edges and a recessed brass inventory tag.
  line(c, -w * .38, -d - h + 3, -w * .08, -h - d * .6, pale ? '#d1cbb466' : '#91918a30', .7);
  line(c, -w * .08, -h - d * .6, w * .18, -h - d * .78, pale ? '#d1cbb444' : '#91918a20', .6);
  line(c, -w / 2 + 2, -h + 2, w / 2 - 2, -h + 2, '#c1ad7138', .7);
  rect(c, -2.8, -Math.max(3, h * .55), 5.6, 2.1, '#95845b');
  line(c, -1.5, -Math.max(3, h * .55) + 1, 1.5, -Math.max(3, h * .55) + 1, '#c9b68a', .4);
}
function frame(c: SkCanvas, atlas: SpriteAtlas | null, name: string, width: number, y: number): boolean {
  const f = atlas?.[name]; if (!f) return false;
  const s = width / f.sw;
  c.drawImageRect(f.image, Skia.XYWHRect(f.sx, f.sy, f.sw, f.sh),
    Skia.XYWHRect(-f.ax * s, y - f.ay * s, f.sw * s, f.sh * s), fill('#ffffff'));
  return true;
}

/** Floor details never receive an occlusion key, so they cannot cover feet. */
export function drawDressingFloor(c: SkCanvas, item: DressingItem): void {
  const spec = DRESSING_KIT[item.kind], s = item.scale ?? 1;
  c.save(); c.translate(item.x * TILE, item.y * TILE); c.scale(s, s);
  const w = spec.footprint.w * TILE, d = spec.footprint.h * TILE;
  if (item.kind === 'gallery_floor_marker') {
    const rw = spec.drawWidth * TILE, rh = spec.drawHeight * TILE;
    c.drawRect(Skia.XYWHRect(-rw / 2, -rh, rw, rh), stroke('#aab6b040', .7));
    for (const x of [-rw / 2, rw / 2]) line(c, x, -rh, x, -rh + 5, '#70878588', 1);
  } else if (item.kind === 'floor_runner') {
    const rw = spec.drawWidth * TILE, rh = spec.drawHeight * TILE;
    c.scale(rw / 64, rh / 36);
    rect(c, -32, -36, 64, 36, '#493a36');
    rect(c, -30, -34, 60, 32, '#5c4740');
    c.drawRect(Skia.XYWHRect(-27, -31, 54, 26), stroke('#ac93615c', 1));
    c.drawOval(Skia.XYWHRect(-9, -25, 18, 14), stroke('#b19a7033', .7));
    for (const x of [-24, 24]) for (const y of [-28, -8]) {
      line(c, x - 1.5, y, x, y - 2, '#b19a7055', .7);
      line(c, x, y - 2, x + 1.5, y, '#b19a7055', .7);
    }
    for (let x = -24; x <= 24; x += 8) { line(c, x, -1, x, 1, '#a6926888'); line(c, x, -37, x, -35, '#a6926888'); }
  } else if (item.kind === 'restoration_tray') {
    const tw = spec.drawWidth * TILE, td = spec.drawHeight * TILE;
    rect(c, -tw / 2, -td, tw, td, '#605f54');
    rect(c, -tw / 2 + 1, -td + 1, tw - 2, td - 2, '#b9b098');
    rect(c, -tw / 2 + 3, -td + 3, tw * .3, td - 5, '#ddd0b4');
    for (let i = 0; i < 3; i++) line(c, 2 + i * 2, -td + 2, 1 + i * 2, -2, '#675849', .8);
  } else if (w > 0 && d > 0) {
    oval(c, -w / 2 - 4, -d + 2, w + 8, d + 6, '#00000030');
    oval(c, -w / 2, -d / 2, w, Math.max(4, d / 2 + 2), '#00000055');
  }
  c.restore();
}

export function drawDressingItem(c: SkCanvas, item: DressingItem, atlas: SpriteAtlas | null): void {
  const spec = DRESSING_KIT[item.kind], s = item.scale ?? 1;
  if (spec.floorDetail) return;
  c.save(); c.translate(item.x * TILE, item.y * TILE); c.scale(item.flip ? -s : s, s); c.translate(0, -spec.mountHeight);
  const w = spec.footprint.w * TILE, d = spec.footprint.h * TILE;
  switch (item.kind) {
    case 'display_low': case 'display_glass_small': {
      const h = 9; plinth(c, w, d, h);
      rect(c, -w / 2 + 3, -d - h + 3, w - 6, d - 6, '#1c292d');
      // Small curated antiquities: bronze bracelet and ivory fragments, never cyan gems.
      c.drawOval(Skia.XYWHRect(-w * .28, -d - h + 5, w * .23, Math.max(3, d - 10)), stroke('#b7a171', 2));
      rect(c, w * .06, -d - h + 5, w * .22, Math.max(4, d - 10), '#a69e80');
      line(c, w * .08, -d - h + 7, w * .22, -h - 5, '#d3c8a1', 1.3);
      if (item.kind === 'display_glass_small') {
        const gh = 8;
        rect(c, -w / 2, -d - h - gh, w, d + gh, '#a3c4c718');
        c.drawRect(Skia.XYWHRect(-w / 2, -d - h - gh, w, d), stroke('#91adb391', .9));
        for (const x of [-w / 2, w / 2]) line(c, x, -d - h - gh, x, -h, '#92aeb299', .8);
        line(c, -w * .33, -d - h - gh + 2, w * .04, -h - gh - 2, '#d3d9cb66', 1.3);
      }
      break;
    }
    case 'pedestal_small': case 'pedestal_medium': case 'sculpture_small': {
      const h = item.kind === 'pedestal_medium' ? 15 : 11;
      plinth(c, w, d, h, item.kind === 'pedestal_small');
      if (item.kind === 'sculpture_small') {
        if (!frame(c, atlas, 'statue', Math.min(w * .8, 18), -d / 2 - h)) {
          oval(c, -5, -d / 2 - h - 9, 10, 9, '#bfb69a');
          oval(c, -3, -d / 2 - h - 16, 6, 7, '#d0c7aa');
        }
      } else {
        oval(c, -5, -d / 2 - h - 5, 10, 6, '#b4a783');
        c.drawOval(Skia.XYWHRect(-4, -d / 2 - h - 7, 8, 5), stroke('#d8c49a', 1.2));
      }
      break;
    }
    case 'bench_museum': {
      for (const x of [-w / 2 + 3, w / 2 - 6]) rect(c, x, -d + 2, 3, d - 2, '#151b20');
      rect(c, -w / 2, -d - 5, w, d, '#73523a');
      for (let y = -d - 5; y < -5; y += 4) {
        rect(c, -w / 2 + 1, y, w - 2, 3, shade(y, 3, ['#ac8253', '#705035']));
        for (const x of [-w / 2 + 4, w / 2 - 4]) c.drawCircle(x, y + 1.5, .65, fill('#c1ad83'));
      }
      line(c, -w / 2, -5, w / 2, -5, '#c19a63'); break;
    }
    case 'rope_barrier': {
      for (const x of [-w / 2 + d / 2, w / 2 - d / 2]) {
        oval(c, x - d / 2, -d, d, d, '#a58b56');
        line(c, x, -d / 2, x, -17, '#ad945d', 2.2);
        c.drawCircle(x, -18, 2.5, fill('#cdb77b'));
      }
      const p = Skia.PathBuilder.Make(); p.moveTo(-w / 2 + d / 2, -17);
      p.cubicTo(-w / 4, -9, w / 4, -9, w / 2 - d / 2, -17);
      c.drawPath(p.build(), stroke('#744039', 2)); break;
    }
    case 'painting_wall':
      frame(c, atlas, 'painting', spec.drawWidth * TILE, 0); break;
    case 'plant_small':
      frame(c, atlas, 'plant', spec.drawWidth * TILE, 0); break;
    case 'plaque': case 'archive_label': {
      const labelW = item.kind === 'archive_label' ? 19 : 14;
      rect(c, -labelW / 2, -17, labelW, 10, '#7d725a');
      rect(c, -labelW / 2 + 1, -16, labelW - 2, 8, '#c1b99c');
      for (let row = 0; row < 3; row++) line(c, -labelW / 2 + 3, -14 + row * 2, labelW / 2 - 3 - row % 2 * 3, -14 + row * 2, '#665f51', .6);
      break;
    }
    case 'spotlight_small': {
      oval(c, -5, -5, 10, 5, '#1a2329');
      rect(c, -3, -11, 6, 7, '#5b5b50');
      oval(c, -3, -12, 6, 4, '#e1ca93');
      line(c, -2, -11, 2, -11, '#ffe5ac', 1.5); break;
    }
    case 'security_panel': {
      rect(c, -14, -25, 28, 20, '#131f28');
      rect(c, -12, -23, 24, 15, '#344650');
      for (let i = 0; i < 3; i++) { rect(c, -10 + i * 7, -21, 6, 8, '#527783'); line(c, -9 + i * 7, -16, -6 + i * 7, -19, '#9bafb2', .7); }
      for (let i = 0; i < 4; i++) c.drawCircle(-9 + i * 5, -10, .8, fill(i === 0 ? '#8ba882' : '#5e6970'));
      break;
    }
    case 'utility_cart': {
      const cart = item.kind === 'utility_cart';
      plinth(c, w, d, 7);
      rect(c, -w / 2 + 2, -d - 7 + 2, w - 4, d - 4, '#a3a18a');
      rect(c, -w * .25, -d - 4, w * .32, Math.max(3, d * .42), '#d1c7aa');
      for (let i = 0; i < 3; i++) line(c, w * .18 + i * 2, -d - 3, w * .16 + i * 2, -10, i === 0 ? '#6e4c35' : '#616c69', 1);
      if (cart) {
        for (const x of [-w / 2 + 3, w / 2 - 3]) { oval(c, x - 2, -1, 4, 4, '#0d151c'); line(c, x, -d - 7, x, -d - 12, '#85928e'); }
        line(c, -w / 2 + 3, -d - 12, w / 2 - 3, -d - 12, '#85928e', 1.5);
      }
      break;
    }
  }
  c.restore();
}
