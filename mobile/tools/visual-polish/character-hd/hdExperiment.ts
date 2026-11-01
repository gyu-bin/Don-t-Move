/**
 * Character HD experiment (read-only on production art). Compares, at the size a character is really drawn on an
 * iPhone 17, the current 128-px sheets against 2× candidates, and the current nearest-neighbour sampling against
 * linear filtering. Writes everything to an experiment folder; nothing under assets/ is touched.
 *
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/visual-polish/character-hd/hdExperiment.ts <outDir>
 *
 * Variants per sheet:
 *   A  current 128-px cell                         (production)
 *   B  256-px cell, Lanczos 2× upscale (ffmpeg)     (interpolation only, no new detail)
 *   C  B + alpha edge tightening + colour unsharp   (interpolation + edge clean-up)
 * Each is drawn with Nearest (what drawImageRect does on native today: SkSamplingOptions()) and with Linear.
 * Output: sheets B/C, a comparison board per character, foot-position residuals, and memory figures.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {initSkiaNode} from '../../sprites/skiaNode';
import {LOCO_CELL, LOCO_CHARACTERS, LOCO_PIVOT, locoScale} from '../../../src/game/core/locomotionAtlas';

const SHEETS = ['player_idle', 'player_sneak', 'player_walk', 'player_run', 'guard_idle', 'guard_walk', 'guard_run', 'guard_whistle', 'guard_search'];
const DEVICE_PX_PER_WORLD = 1206 / (9.4 * 40); // iPhone 17: 402 pt × 3 / camera width in world units

type Rgba = {w: number; h: number; px: Uint8Array};

async function main() {
  const out = process.argv[2];
  if (!out) throw Error('usage: hdExperiment.ts <outDir>');
  const ck = await initSkiaNode();
  for (const d of ['B', 'C', 'boards']) fs.mkdirSync(path.join(out, d), {recursive: true});
  const read = (file: string): Rgba => {
    const img = ck.MakeImageFromEncoded(fs.readFileSync(file))!;
    const w = img.width(), h = img.height();
    const px = img.readPixels(0, 0, {width: w, height: h, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB}) as Uint8Array;
    img.delete(); return {w, h, px};
  };
  const write = (file: string, im: Rgba) => {
    const img = ck.MakeImage({width: im.w, height: im.h, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB}, im.px, im.w * 4)!;
    fs.writeFileSync(file, img.encodeToBytes()!); img.delete();
  };

  // B: Lanczos 2× (premultiplied-safe: ffmpeg scales RGBA planar; transparent borders stay transparent).
  for (const s of SHEETS) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', `assets/characters/${s}.png`, '-vf', 'scale=iw*2:ih*2:flags=lanczos+accurate_rnd+full_chroma_int,format=rgba', path.join(out, 'B', `${s}.png`)]);

  // C: alpha edge tightening (contrast 1.6 around 0.5, keeps the silhouette, removes the soft 2-px halo the 2× adds)
  // and a 1-px colour unsharp mask on opaque pixels only.
  for (const s of SHEETS) {
    const b = read(path.join(out, 'B', `${s}.png`)), c: Rgba = {w: b.w, h: b.h, px: new Uint8Array(b.px)};
    const at = (x: number, y: number, k: number) => b.px[(Math.max(0, Math.min(b.h - 1, y)) * b.w + Math.max(0, Math.min(b.w - 1, x))) * 4 + k];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = (y * b.w + x) * 4, a = b.px[i + 3] / 255;
      c.px[i + 3] = Math.round(255 * Math.max(0, Math.min(1, (a - 0.5) * 1.6 + 0.5)));
      if (a > 0.9) for (let k = 0; k < 3; k++) {
        const blur = (at(x - 1, y, k) + at(x + 1, y, k) + at(x, y - 1, k) + at(x, y + 1, k)) / 4;
        c.px[i + k] = Math.max(0, Math.min(255, Math.round(b.px[i + k] + 0.45 * (b.px[i + k] - blur))));
      }
    }
    write(path.join(out, 'C', `${s}.png`), c);
  }

  // Foot residual: per frame, the lowest opaque row and its centre x in A×2 vs B / C (should be ≤ 1 px at 256).
  const feet: Record<string, {maxDy: number; maxDx: number}> = {};
  for (const s of SHEETS) {
    const a = read(`assets/characters/${s}.png`);
    for (const v of ['B', 'C']) {
      const im = read(path.join(out, v, `${s}.png`));
      let maxDy = 0, maxDx = 0;
      for (let r = 0; r < a.h / LOCO_CELL; r++) for (let f = 0; f < a.w / LOCO_CELL; f++) {
        const sole = (img: Rgba, cell: number) => {
          for (let y = (r + 1) * cell - 1; y >= r * cell; y--) {
            let sx = 0, n = 0;
            for (let x = f * cell; x < (f + 1) * cell; x++) if (img.px[(y * img.w + x) * 4 + 3] > 128) { sx += x - f * cell; n++; }
            if (n) return {y: y - r * cell, x: sx / n};
          }
          return null;
        };
        const s1 = sole(a, LOCO_CELL), s2 = sole(im, LOCO_CELL * 2);
        if (!s1 || !s2) continue;
        // x: centroid over the two 2× rows that correspond to the original sole row (same band, not "lowest row",
        // which a lifted foot can own at one resolution and not the other).
        let sx = 0, n = 0;
        for (const yy of [s1.y * 2, s1.y * 2 + 1]) for (let x = f * LOCO_CELL * 2; x < (f + 1) * LOCO_CELL * 2; x++)
          if (im.px[((r * LOCO_CELL * 2 + yy) * im.w + x) * 4 + 3] > 128) { sx += x - f * LOCO_CELL * 2; n++; }
        maxDy = Math.max(maxDy, Math.abs(s2.y - (s1.y * 2 + 1)));
        if (n) maxDx = Math.max(maxDx, Math.abs(sx / n - (s1.x * 2 + 0.5)));
      }
      feet[`${s}:${v}`] = {maxDy: +maxDy.toFixed(2), maxDx: +maxDx.toFixed(2)};
    }
  }

  // Boards: frames of walk (down, right) and idle, drawn at the device size on the Lab floor colour, for each
  // variant × sampling, plus a 3× magnified detail of one frame.
  const {Skia, FilterMode, MipmapMode} = require('../../sprites/skiaNodeShim'); // eslint-disable-line @typescript-eslint/no-require-imports
  for (const who of ['player', 'guard'] as const) {
    const cellOnScreen = LOCO_CELL * locoScale(who) * DEVICE_PX_PER_WORLD; // ≈ 214 px
    const variants: [string, string, number, number][] = [ // label, file dir, cell px, filter
      ['A nearest (now)', 'assets/characters', LOCO_CELL, 0], ['A linear', 'assets/characters', LOCO_CELL, 1],
      ['B nearest', path.join(out, 'B'), LOCO_CELL * 2, 0], ['B linear', path.join(out, 'B'), LOCO_CELL * 2, 1],
      ['C nearest', path.join(out, 'C'), LOCO_CELL * 2, 0], ['C linear', path.join(out, 'C'), LOCO_CELL * 2, 1],
    ];
    const frames: [string, number, number][] = [[`${who}_walk`, 0, 2], [`${who}_walk`, 2, 5], [`${who}_idle`, 0, 0]]; // sheet, row, frame
    const colW = Math.ceil(cellOnScreen), W = colW * frames.length + colW, H = colW * variants.length;
    const surface = Skia.Surface.Make(W, H)!, cv = surface.getCanvas();
    cv.drawColor(Skia.Color('#29424b'));
    const font = null; void font;
    variants.forEach(([, dir, cell, filt], vi) => {
      frames.forEach(([sheet, row, frame], fi) => {
        const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(path.join(dir, `${sheet}.png`))));
        const src = Skia.XYWHRect(frame * cell, row * cell, cell, cell), dst = Skia.XYWHRect(fi * colW, vi * colW, cellOnScreen, cellOnScreen);
        cv.drawImageRectOptions(img, src, dst, filt ? FilterMode.Linear : FilterMode.Nearest, filt ? MipmapMode.Linear : MipmapMode.None, Skia.Paint());
      });
      // detail: head of walk-down frame, magnified 3× (nearest) from the on-screen size
      const tmp = Skia.Surface.Make(colW, colW)!, tc = tmp.getCanvas();
      tc.drawColor(Skia.Color('#29424b'));
      const [, dir2, cell2, filt2] = variants[vi];
      const img2 = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(path.join(dir2, `${who}_walk.png`))));
      tc.drawImageRectOptions(img2, Skia.XYWHRect(2 * cell2, 0, cell2, cell2), Skia.XYWHRect(0, 0, cellOnScreen, cellOnScreen), filt2 ? FilterMode.Linear : FilterMode.Nearest, filt2 ? MipmapMode.Linear : MipmapMode.None, Skia.Paint());
      tmp.flush();
      const snap = tmp.makeImageSnapshot();
      cv.drawImageRectOptions(snap, Skia.XYWHRect(colW * 0.3, colW * 0.25, colW / 3, colW / 3), Skia.XYWHRect(frames.length * colW, vi * colW, colW, colW), FilterMode.Nearest, MipmapMode.None, Skia.Paint());
    });
    surface.flush();
    fs.writeFileSync(path.join(out, 'boards', `${who}-variants.png`), surface.makeImageSnapshot().encodeToBytes()!);
  }

  // Memory: decoded RGBA bytes of all 9 sheets at 1× and 2× (GPU textures are the same size, + 33 % with mipmaps).
  let px1 = 0;
  for (const s of SHEETS) { const a = read(`assets/characters/${s}.png`); px1 += a.w * a.h; }
  const fileKB = (dir: string) => Math.round(SHEETS.reduce((n, s) => n + fs.statSync(path.join(dir, `${s}.png`)).size, 0) / 1024);
  const report = {
    devicePxPerWorld: +DEVICE_PX_PER_WORLD.toFixed(3),
    sheetPxPerWorld: Object.fromEntries((['player', 'guard'] as const).map(w => [w, +(1 / locoScale(w)).toFixed(3)])),
    onScreenCellPx: Object.fromEntries((['player', 'guard'] as const).map(w => [w, +(LOCO_CELL * locoScale(w) * DEVICE_PX_PER_WORLD).toFixed(1)])),
    magnificationNow: +(locoScale('player') * DEVICE_PX_PER_WORLD).toFixed(3),
    pivot: LOCO_PIVOT, heightPx: {player: LOCO_CHARACTERS.player.heightPx, guard: LOCO_CHARACTERS.guard.heightPx},
    decodedMB: {x1: +(px1 * 4 / 1048576).toFixed(1), x2: +(px1 * 16 / 1048576).toFixed(1)},
    pngKB: {A: fileKB('assets/characters'), B: fileKB(path.join(out, 'B')), C: fileKB(path.join(out, 'C'))},
    footResidualPx: feet,
  };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
}
void main();
