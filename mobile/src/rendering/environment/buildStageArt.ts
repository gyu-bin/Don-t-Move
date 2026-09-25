import { BlendMode, Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint, SkPicture } from '@shopify/react-native-skia';

import { Cell, TILE, WALL_HEIGHT } from '../../game/world/compileStage';
import type { CompiledProp, CompiledStage } from '../../game/world/compileStage';
import { PROP_KIT } from '../../game/world/propKit';
import {
  drawFallbackFloor,
  drawFallbackProp,
  drawFallbackWallRow,
  VOID_COLOR,
} from '../fallback/proceduralMuseum';
import { fill, stroke } from '../paints';
import { fillOval, fillRect } from '../skiaScratch';
import type { SpriteAtlas, SpriteFrame } from '../sprites/spriteTypes';

/**
 * Bakes everything static in a stage into SkPictures once at load:
 *
 *   floor      tiles, carpet, ambient occlusion, contact shadows, exit pad
 *   layers[]   wall rows and props, each with a painter's sort key so
 *              characters can be interleaved for correct 3/4 occlusion
 *   darkness   ambient dark with soft holes at every static light
 *   glow       warm / cyan / green light pools (screen blend)
 *
 * Every visual element is taken from the environment atlas when it has a
 * frame for it, otherwise from the procedural fallback. Atlas frame names:
 *   floor, wallTop, wallFace          tiles (optional)
 *   <PropKind>                        e.g. statue, crate, lamp, pillar …
 *   exitSign, diamond                 objective pieces
 */
export interface StaticLayer {
  sortY: number;
  picture: SkPicture;
}

export interface StageArt {
  floor: SkPicture;
  layers: StaticLayer[];
  darkness: SkPicture;
  glow: SkPicture;
}

type Bounds = { x: number; y: number; w: number; h: number };

function record(bounds: Bounds, draw: (c: SkCanvas) => void): SkPicture {
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(bounds.x, bounds.y, bounds.w, bounds.h));
  draw(c);
  return rec.finishRecordingAsPicture();
}

function gradient(shader: ReturnType<typeof Skia.Shader.MakeLinearGradient>, mode?: BlendMode): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(shader);
  if (mode !== undefined) p.setBlendMode(mode);
  return p;
}

function linear(x0: number, y0: number, x1: number, y1: number, colors: string[]): SkPaint {
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

function radial(
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

/** Draws an atlas frame at world width `width`, anchor at (x, y). */
function drawFrame(c: SkCanvas, f: SpriteFrame, x: number, y: number, width: number, flip: boolean) {
  const s = width / f.sw;
  c.save();
  if (flip) {
    c.translate(x, 0);
    c.scale(-1, 1);
    c.translate(-x, 0);
  }
  c.drawImageRect(
    f.image,
    Skia.XYWHRect(f.sx, f.sy, f.sw, f.sh),
    Skia.XYWHRect(x - f.ax * s, y - f.ay * s, f.sw * s, f.sh * s),
    fill('#ffffff'),
  );
  c.restore();
}

// ------------------------------------------------------------------ floor

function drawFloor(c: SkCanvas, stage: CompiledStage, atlas: SpriteAtlas | null): void {
  const tile = atlas?.floor;
  if (tile) {
    for (let r = 0; r < stage.rows; r++) {
      for (let cc = 0; cc < stage.cols; cc++) {
        if (stage.grid[r * stage.cols + cc] !== Cell.Floor) continue;
        c.drawImageRect(
          tile.image,
          Skia.XYWHRect(tile.sx, tile.sy, tile.sw, tile.sh),
          Skia.XYWHRect(cc * TILE, r * TILE, TILE, TILE),
          fill('#ffffff'),
        );
      }
    }
  } else {
    drawFallbackFloor(c, stage);
  }
}

/** Ambient occlusion, contact shadows and the exit pad — independent of the art source. */
function drawFloorShading(c: SkCanvas, stage: CompiledStage): void {
  const { cols, rows, grid } = stage;
  const at = (cc: number, rr: number) =>
    cc < 0 || rr < 0 || cc >= cols || rr >= rows ? Cell.Void : grid[rr * cols + cc];

  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      if (at(cc, r) !== Cell.Floor) continue;
      const x = cc * TILE;
      const y = r * TILE;
      if (at(cc, r - 1) === Cell.Wall) {
        fillRect(c, x, y, TILE, 18, linear(0, y, 0, y + 18, ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']));
      }
      if (at(cc - 1, r) === Cell.Wall) {
        fillRect(c, x, y, 12, TILE, linear(x, 0, x + 12, 0, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']));
      }
      if (at(cc + 1, r) === Cell.Wall) {
        const x1 = x + TILE;
        fillRect(c, x1 - 12, y, 12, TILE, linear(x1, 0, x1 - 12, 0, ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']));
      }
    }
  }

  const shadow = fill('#000000', 0.42);
  for (const p of stage.props) {
    const spec = PROP_KIT[p.kind];
    if (spec.shadow <= 0) continue;
    const rw = spec.shadow * TILE * p.scale;
    fillOval(c, p.x - rw, p.y - rw * 0.32, rw * 2, rw * 0.64, shadow);
  }

  if (!stage.def.exit) return;
  const ex = stage.exit;
  fillRect(c, ex.x + 2, ex.y, ex.w - 4, ex.h, fill('#111820', 0.9));
  fillRect(
    c,
    ex.x + 2,
    ex.y,
    ex.w - 4,
    ex.h,
    linear(0, ex.y, 0, ex.y + ex.h, ['rgba(140,155,175,0.04)', 'rgba(140,155,175,0.2)']),
  );
  for (let i = 1; i < 4; i++) {
    const yy = ex.y + (ex.h * i) / 4;
    c.drawLine(ex.x + 4, yy, ex.x + ex.w - 4, yy, stroke('#52606f', 1, 0.5));
  }
}

// ------------------------------------------------------------------ walls / props

function drawWallRow(c: SkCanvas, stage: CompiledStage, r: number, atlas: SpriteAtlas | null): boolean {
  const top = atlas?.wallTop;
  const face = atlas?.wallFace;
  if (!top || !face) return drawFallbackWallRow(c, stage, r);
  let any = false;
  const white = fill('#ffffff');
  for (let cc = 0; cc < stage.cols; cc++) {
    if (stage.grid[r * stage.cols + cc] !== Cell.Wall) continue;
    any = true;
    const x = cc * TILE;
    const y = r * TILE;
    const southWall = r + 1 < stage.rows && stage.grid[(r + 1) * stage.cols + cc] === Cell.Wall;
    if (!southWall) {
      c.drawImageRect(
        face.image,
        Skia.XYWHRect(face.sx, face.sy, face.sw, face.sh),
        Skia.XYWHRect(x, y + TILE - WALL_HEIGHT, TILE, WALL_HEIGHT),
        white,
      );
    }
    c.drawImageRect(
      top.image,
      Skia.XYWHRect(top.sx, top.sy, top.sw, top.sh),
      Skia.XYWHRect(x, y - WALL_HEIGHT, TILE, TILE),
      white,
    );
  }
  return any;
}

function drawProp(c: SkCanvas, p: CompiledProp, atlas: SpriteAtlas | null): void {
  const f = atlas?.[p.kind];
  if (!f) {
    drawFallbackProp(c, p);
    return;
  }
  const spec = PROP_KIT[p.kind];
  drawFrame(c, f, p.x, p.y - spec.mountHeight, spec.drawWidth * TILE * p.scale, p.flip);
}

// ------------------------------------------------------------------ lights

const LIGHT_RGB: Record<string, [number, number, number, number]> = {
  warm: [255, 170, 88, 0.5],
  cool: [150, 180, 255, 0.2],
  cyan: [70, 205, 255, 0.46],
  green: [70, 255, 150, 0.36],
  red: [255, 60, 50, 0.3],
};

export function buildStageArt(stage: CompiledStage, atlas: SpriteAtlas | null): StageArt {
  const pad = { x: -TILE * 3, y: -TILE * 3, w: stage.width + TILE * 6, h: stage.height + TILE * 6 };

  const floor = record(pad, (c) => {
    c.drawColor(Skia.Color(VOID_COLOR));
    drawFloor(c, stage, atlas);
    drawFloorShading(c, stage);
  });

  const layers: StaticLayer[] = [];
  for (let r = 0; r < stage.rows; r++) {
    let any = false;
    const pic = record(pad, (c) => {
      any = drawWallRow(c, stage, r, atlas);
    });
    if (any) layers.push({ sortY: (r + 1) * TILE, picture: pic });
  }
  for (const p of stage.props) {
    const spec = PROP_KIT[p.kind];
    layers.push({
      sortY: spec.wallMounted ? p.y + 0.5 : p.sortY,
      picture: record(pad, (c) => drawProp(c, p, atlas)),
    });
  }
  // EXIT sign on the wall top beyond the exit.
  const sign = atlas?.exitSign;
  if (sign && stage.def.exit) {
    const ex = stage.exit;
    layers.push({
      sortY: ex.y + ex.h + TILE + 0.5,
      picture: record(pad, (c) =>
        drawFrame(c, sign, ex.x + ex.w / 2, ex.y + ex.h + TILE - WALL_HEIGHT + 20, TILE * 1.6, false),
      ),
    });
  }
  layers.sort((a, b) => a.sortY - b.sortY);

  const ambient = stage.def.ambientDarkness ?? 0.6;
  const darkness = record(pad, (c) => {
    c.drawRect(Skia.XYWHRect(pad.x, pad.y, pad.w, pad.h), fill('#03050a', ambient));
    for (const l of stage.lights) {
      const a = Math.min(0.97, 0.6 + l.intensity * 0.4);
      const r = l.radius * 1.15;
      c.drawCircle(
        l.x,
        l.y,
        r,
        radial(
          l.x,
          l.y,
          r,
          [`rgba(0,0,0,${a})`, `rgba(0,0,0,${a * 0.55})`, 'rgba(0,0,0,0)'],
          [0, 0.5, 1],
          BlendMode.DstOut,
        ),
      );
    }
  });

  const glow = record(pad, (c) => {
    for (const l of stage.lights) {
      const [r, g, b, a0] = LIGHT_RGB[l.kind];
      const a = a0 * l.intensity;
      c.drawCircle(
        l.x,
        l.y,
        l.radius,
        radial(
          l.x,
          l.y,
          l.radius,
          [`rgba(${r},${g},${b},${a})`, `rgba(${r},${g},${b},${a * 0.4})`, `rgba(${r},${g},${b},0)`],
          [0, 0.45, 1],
          BlendMode.Screen,
        ),
      );
    }
  });

  return { floor, layers, darkness, glow };
}
