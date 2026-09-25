import { Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint } from '@shopify/react-native-skia';

import { hash2 } from '../../game/core/math';
import { Cell, TILE, WALL_HEIGHT } from '../../game/world/compileStage';
import type { CompiledProp, CompiledStage } from '../../game/world/compileStage';
import { fill, stroke } from '../paints';
import { fillOval, fillRRect, fillRect } from '../skiaScratch';

/**
 * FALLBACK ONLY — procedural museum pieces used when the environment atlas
 * (src/assets/manifest.ts → environment.museum) has no frame for an element:
 * floor tiles, carpet, 3/4 wall blocks and props without sprites (pillar,
 * diamond pedestal, door, or any kind missing from the atlas).
 * Remove each function once the matching atlas frame exists.
 */

export const VOID_COLOR = '#05070b';

const PAL = {
  void: '#05070b',
  floor: ['#1c2230', '#1e2533', '#202838', '#1a202c'],
  floorGrout: '#0e1116',
  floorBevel: '#2a3242',
  crack: '#11141a',
  carpet: '#3e1116',
  carpetDark: '#2a0a0e',
  carpetTrim: '#8b6a37',
  wallTop: '#111419',
  wallTopAlt: '#13161c',
  wallRimOuter: '#5b6472',
  wallRimSide: '#4a525f',
  wallLip: '#6a7382',
  wallFaceTop: '#2c313c',
  wallFaceBottom: '#15181e',
  wallSeam: '#1d2129',
  baseboard: '#0a0c10',
};

function linear(x0: number, y0: number, x1: number, y1: number, colors: string[]): SkPaint {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      colors.map((c) => Skia.Color(c)),
      null,
      TileMode.Clamp,
    ),
  );
  return p;
}

// ------------------------------------------------------------------ floor

/** Floor tiles + carpets. */
export function drawFallbackFloor(c: SkCanvas, stage: CompiledStage): void {
  const tilePaints = PAL.floor.map((col) => fill(col));
  const grout = stroke(PAL.floorGrout, 1.4);
  const bevel = stroke(PAL.floorBevel, 1);
  const crack = stroke(PAL.crack, 0.9);
  const { cols, rows, grid } = stage;
  const at = (cc: number, rr: number) =>
    cc < 0 || rr < 0 || cc >= cols || rr >= rows ? Cell.Void : grid[rr * cols + cc];

  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      if (at(cc, r) !== Cell.Floor) continue;
      const x = cc * TILE;
      const y = r * TILE;
      const h = hash2(cc, r);
      fillRect(c, x, y, TILE, TILE, tilePaints[Math.floor(h * tilePaints.length)]);
      // Subtle large-scale tonal drift.
      if (hash2(cc * 0.37, r * 0.37) > 0.72) fillRect(c, x, y, TILE, TILE, fill('#2a3240', 0.12));
      c.drawLine(x + 1.5, y + 1.2, x + TILE - 1.5, y + 1.2, bevel);
      c.drawLine(x + 1.2, y + 1.5, x + 1.2, y + TILE - 1.5, bevel);
      fillRect(c, x, y, TILE, TILE, grout);
      if (h > 0.84) {
        const p = Skia.PathBuilder.Make();
        const sx = x + 6 + hash2(r, cc) * 20;
        const sy = y + 5 + hash2(cc + 3, r) * 10;
        p.moveTo(sx, sy);
        p.lineTo(sx + 5, sy + 7);
        p.lineTo(sx + 3, sy + 13);
        p.lineTo(sx + 9, sy + 22);
        c.drawPath(p.build(), crack);
      }
    }
  }

  // Carpets
  const carpet = fill(PAL.carpet);
  const carpetEdge = stroke(PAL.carpetDark, 3);
  const trim = stroke(PAL.carpetTrim, 1, 0.55);
  for (const cp of stage.def.carpets ?? []) {
    const x = cp.x * TILE;
    const y = cp.y * TILE;
    const w = cp.w * TILE;
    const h = cp.h * TILE;
    fillRect(c, x, y, w, h, carpet);
    fillRect(c, x + 1.5, y + 1.5, w - 3, h - 3, carpetEdge);
    fillRect(c, x + 6, y + 6, w - 12, h - 12, trim);
    // Woven pattern: faint diamonds down the centre.
    const motif = stroke('#6b2227', 1, 0.8);
    for (let yy = y + 26; yy < y + h - 20; yy += 34) {
      const p = Skia.PathBuilder.Make();
      p.moveTo(x + w / 2, yy - 8);
      p.lineTo(x + w / 2 + 8, yy);
      p.lineTo(x + w / 2, yy + 8);
      p.lineTo(x + w / 2 - 8, yy);
      p.close();
      c.drawPath(p.build(), motif);
    }
  }
}

// ------------------------------------------------------------------ walls

/** One row of 3/4 wall blocks (top face + south face). Returns false if the row has no walls. */
export function drawFallbackWallRow(c: SkCanvas, stage: CompiledStage, r: number): boolean {
  const { cols, rows, grid } = stage;
  const at = (cc: number, rr: number) =>
    cc < 0 || rr < 0 || cc >= cols || rr >= rows ? Cell.Void : grid[rr * cols + cc];
  const top = fill(PAL.wallTop);
  const topAlt = fill(PAL.wallTopAlt);
  const rimOuter = stroke(PAL.wallRimOuter, 2);
  const rimSide = stroke(PAL.wallRimSide, 1.6);
  const lip = stroke(PAL.wallLip, 1.6);
  const seam = stroke(PAL.wallSeam, 1);
  const baseboard = fill(PAL.baseboard);
  const lipShadow = fill('#07080b', 0.9);
  let any = false;

  for (let cc = 0; cc < cols; cc++) {
    if (at(cc, r) !== Cell.Wall) continue;
    any = true;
    const x = cc * TILE;
    const y = r * TILE;
    const ty = y - WALL_HEIGHT;
    const northWall = at(cc, r - 1) === Cell.Wall;
    const southWall = at(cc, r + 1) === Cell.Wall;
    const westWall = at(cc - 1, r) === Cell.Wall;
    const eastWall = at(cc + 1, r) === Cell.Wall;

    // Front (south) face.
    if (!southWall) {
      const fy = y + TILE - WALL_HEIGHT;
      fillRect(
        c,
        x,
        fy,
        TILE,
        WALL_HEIGHT,
        linear(0, fy, 0, fy + WALL_HEIGHT, [PAL.wallFaceTop, PAL.wallFaceBottom]),
      );
      fillRect(c, x, fy, TILE, 3, lipShadow);
      c.drawLine(x + TILE / 2, fy + 4, x + TILE / 2, fy + WALL_HEIGHT - 6, seam);
      fillRect(c, x, y + TILE - 5, TILE, 5, baseboard);
      if (!westWall) c.drawLine(x + 0.8, fy, x + 0.8, y + TILE, rimSide);
      if (!eastWall) c.drawLine(x + TILE - 0.8, fy, x + TILE - 0.8, y + TILE, rimSide);
    }

    // Top face: the tile footprint lifted by the wall height.
    fillRect(c, x, ty, TILE, TILE, hash2(cc, r) > 0.5 ? top : topAlt);
    if (!northWall) c.drawLine(x, ty + 1, x + TILE, ty + 1, rimOuter);
    if (!westWall) c.drawLine(x + 1, ty, x + 1, ty + TILE, rimSide);
    if (!eastWall) c.drawLine(x + TILE - 1, ty, x + TILE - 1, ty + TILE, rimSide);
    if (!southWall) c.drawLine(x, ty + TILE - 0.8, x + TILE, ty + TILE - 0.8, lip);
  }
  return any;
}

// ------------------------------------------------------------------ props

function drawPillar(c: SkCanvas, x: number, y: number, s: number) {
  const w = 26 * s;
  const shaftTop = y - 40 * s;
  fillRRect(c, x - w / 2 - 3, y - 8 * s, w + 6, 9 * s, 2, fill('#1c2029'));
  fillRect(
    c,
    x - w / 2,
    shaftTop,
    w,
    y - 6 * s - shaftTop,
    linear(x - w / 2, 0, x + w / 2, 0, ['#3a404c', '#2a2f39', '#1a1d24']),
  );
  for (let i = -1; i <= 1; i++)
    c.drawLine(x + i * 6 * s, shaftTop + 4, x + i * 6 * s, y - 9 * s, stroke('#15181e', 1, 0.8));
  fillOval(c, x - w / 2 - 3, shaftTop - 8 * s, w + 6, 14 * s, fill('#3b424f'));
  fillOval(c, x - w / 2 - 3, shaftTop - 8 * s, w + 6, 14 * s, stroke('#4a5260', 1.2));
  fillOval(c, x - w / 2 + 2, shaftTop - 5 * s, w - 4, 8 * s, fill('#2d333e'));
}

function drawDiamondPedestal(c: SkCanvas, x: number, y: number, s: number) {
  const w = 44 * s;
  const frontH = 16 * s;
  const topH = 18 * s;
  const fy = y - frontH;
  const ty = fy - topH;
  // Plinth
  fillRect(c, x - w / 2, fy, w, frontH, linear(0, fy, 0, y, ['#1f2532', '#12151c']));
  fillRect(c, x - w / 2, ty, w, topH, fill('#2b3240'));
  c.drawLine(x - w / 2, fy, x + w / 2, fy, stroke('#63d8ff', 1.2, 0.7));
  fillRect(c, x - w / 2, ty, w, topH, stroke('#3b4455', 1.2));
  // Glass case
  const gw = 30 * s;
  const gh = 34 * s;
  const gx = x - gw / 2;
  const gy = ty + topH * 0.55 - gh;
  fillRect(c, gx, gy, gw, gh, fill('#8fdcff', 0.07));
  fillRect(c, gx, gy - 7 * s, gw, 7 * s, fill('#bfeaff', 0.1));
  fillRect(c, gx, gy - 7 * s, gw, gh + 7 * s, stroke('#b8ecff', 1, 0.45));
  c.drawLine(gx, gy, gx + gw, gy, stroke('#b8ecff', 1, 0.35));
  c.drawLine(gx + 4, gy + 3, gx + 10, gy + gh - 6, stroke('#ffffff', 1.2, 0.18));
  // Brass corners
  const brass = fill('#b89047');
  for (const [px, py] of [
    [gx, gy - 7 * s],
    [gx + gw, gy - 7 * s],
    [gx, gy + gh],
    [gx + gw, gy + gh],
  ]) {
    c.drawCircle(px, py, 1.6, brass);
  }
}

function drawDoor(c: SkCanvas, x: number, y: number, s: number) {
  const w = 28 * s;
  const h = WALL_HEIGHT - 4;
  fillRect(c, x - w / 2 - 2, y - h - 2, w + 4, h + 2, fill('#0b0d11'));
  fillRect(c, x - w / 2, y - h, w, h, linear(0, y - h, 0, y, ['#4d3525', '#2e1f16']));
  fillRect(c, x - w / 2 + 3, y - h + 3, w / 2 - 4, h - 8, stroke('#24170f', 1));
  fillRect(c, x + 1, y - h + 3, w / 2 - 4, h - 8, stroke('#24170f', 1));
  c.drawCircle(x + w / 2 - 4, y - h / 2, 1.3, fill('#c9a04a'));
}
/** Props with no atlas frame. Unknown kinds get a neutral placeholder block. */
export function drawFallbackProp(c: SkCanvas, p: CompiledProp): void {
  switch (p.kind) {
    case 'pillar':
      drawPillar(c, p.x, p.y, p.scale);
      return;
    case 'diamondPedestal':
      drawDiamondPedestal(c, p.x, p.y, p.scale);
      return;
    case 'door':
      drawDoor(c, p.x, p.y, p.scale);
      return;
    default: {
      const w = TILE * 0.8 * p.scale;
      fillRRect(c, p.x - w / 2, p.y - w, w, w, 4, fill('#3a3f4a'));
      fillRRect(c, p.x - w / 2, p.y - w, w, w, 4, stroke('#6b7280', 1.2));
    }
  }
}
