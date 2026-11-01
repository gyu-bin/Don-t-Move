/**
 * Visual Polish: before/after images of whole missions, drawn by the real game renderer offline (not a device capture).
 * Run from mobile/:
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/visual-polish/renderMissions.ts <outDir> <mission>...
 *   SCALE=3 (default) renders 3 px per world unit, close to an iPhone's 3.2 (402 pt × 3 / 9.4 tiles / 40).
 * Uses the runtime campaign and the PNGs currently on disk: render once before a swap and once after, same SCALE.
 * Guards stand at their spawn; no darkness animation, HUD or touch panel.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import {initSkiaNode} from '../sprites/skiaNode';

async function main() {
  const [outDir, ...ids] = process.argv.slice(2);
  if (!outDir || !ids.length) throw Error('usage: renderMissions.ts <outDir> <mission>...');
  const K = Number(process.env.SCALE ?? 3);
  const ck = await initSkiaNode();
  require.extensions['.png'] = module => { module.exports = 0; };
  Object.assign(globalThis, {__DEV__: false});
  const {Skia} = require('../sprites/skiaNodeShim');
  // Draw-op counter: every draw* call on a recording canvas is counted, so the static stage pictures (replayed
  // every frame on the device) and the per-frame record can be budgeted and compared before/after a change.
  const ops = {n: 0};
  // FLOOR_TILES=<dir>: preview a painted Lab floor tile set (lab_floor_tile_{a,b,c,d,inlay,restricted_a,restricted_b}.png)
  // without changing game code. The recording canvas proxy swaps each lab floor cell's flat fill for the tile and
  // drops the code seams and accents for that cell; everything else records as in the game. Tool-only.
  const tileDir = process.env.FLOOR_TILES;
  const tiles = tileDir ? Object.fromEntries(['a', 'b', 'c', 'd', 'inlay', 'restricted_a', 'restricted_b'].map(n =>
    [n, Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(path.join(tileDir, `lab_floor_tile_${n}.png`))))])) : null;
  const tileCtx: {floorColor: number[] | null; seamColor: number[] | null; cell: [number, number] | null; variant: number; restricted: (x: number, y: number) => boolean} =
    {floorColor: null, seamColor: null, cell: null, variant: 0, restricted: () => false};
  const white = Skia.Paint();
  const sameColor = (paint: {getColor?: () => Float32Array}, rgb: number[] | null) => {
    if (!rgb || !paint?.getColor) return false;
    const c = paint.getColor();
    return Math.abs(c[0] * 255 - rgb[0]) < 1.5 && Math.abs(c[1] * 255 - rgb[1]) < 1.5 && Math.abs(c[2] * 255 - rgb[2]) < 1.5;
  };
  const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const makeRecorder = Skia.PictureRecorder.bind(Skia);
  Skia.PictureRecorder = () => {
    const rec = makeRecorder();
    const begin = rec.beginRecording.bind(rec);
    rec.beginRecording = (bounds: unknown) => new Proxy(begin(bounds), {
      get(target, key) {
        const value = target[key as keyof typeof target];
        if (typeof value !== 'function') return value;
        const fn = value as (...args: unknown[]) => unknown;
        const name = String(key);
        if (tiles && name === 'translate') return (tx: number, ty: number) => { tileCtx.cell = tx % 40 === 0 && ty % 40 === 0 ? [tx / 40, ty / 40] : null; return fn.apply(target, [tx, ty]); };
        if (tiles && name === 'drawRect') return (rect: {x: number; y: number; width: number; height: number}, paint: {getColor?: () => Float32Array}) => {
          const cell = tileCtx.cell;
          if (cell && rect.x === 0 && rect.y === 0 && rect.width === 40 && rect.height === 40 && sameColor(paint, tileCtx.floorColor)) {
            const [cx, cy] = cell, inlay = (cx + cy + tileCtx.variant) % 4 === 0;
            const img = inlay ? tiles.inlay : tileCtx.restricted(cx, cy) ? tiles[`restricted_${'ab'[hash(cx, cy) % 2]}`] : tiles['abcd'[hash(cx, cy) % 4]];
            ops.n++;
            return (target as {drawImageRect: (i: unknown, s: unknown, d: unknown, p: unknown) => void}).drawImageRect(img, Skia.XYWHRect(0, 0, 128, 128), Skia.XYWHRect(0, 0, 40, 40), white);
          }
          if (cell && rect.width <= 34 && rect.height <= 30 && rect.x === 3 && (rect.y === 3 || rect.y === 5)) return undefined; // code accent: in the tile
          ops.n++; return fn.apply(target, [rect, paint]);
        };
        if (tiles && name === 'drawLine') return (x0: number, y0: number, x1: number, y1: number, paint: {getColor?: () => Float32Array; getStrokeWidth?: () => number}) => {
          if (tileCtx.cell && x0 === 0 && y0 === 0 && ((x1 === 40 && y1 === 0) || (x1 === 0 && y1 === 40)) && sameColor(paint, tileCtx.seamColor)) return undefined; // code seam: in the tile
          ops.n++; return fn.apply(target, [x0, y0, x1, y1, paint]);
        };
        return name.startsWith('draw') ? (...args: unknown[]) => { ops.n++; return fn.apply(target, args); } : fn.bind(target);
      },
    });
    return rec;
  };
  const {ASSET_MANIFEST} = require('../../src/assets/manifest');
  const {buildGameAssets} = require('../../src/assets/buildSprites');
  const {decodeEnvironmentImages} = require('../../src/assets/environmentKit');
  const {campaignStages} = require('../../src/game/levels/campaignStages');
  const {VALUABLES} = require('../../src/game/levels/stagePresentation');
  const {compileStage} = require('../../src/game/world/compileStage');
  const {createPlaygroundState} = require('../../src/game/playground/playgroundState');
  const {buildVisionFan} = require('../../src/game/guards/guardVision');
  const {doorBlockers} = require('../../src/game/doors/doorSystem');
  const {buildStageArt} = require('../../src/rendering/environment/buildStageArt');
  const {createDoorArt} = require('../../src/rendering/environment/doorArt');
  const {createCharacterVisual} = require('../../src/rendering/characters/characterVisual');
  const {createCharacterArt} = require('../../src/rendering/fallback/proceduralCharacter');
  const {PLAYER_PALETTE, GUARD_PALETTE} = require('../../src/rendering/fallback/characterPalettes');
  const {createConeArt} = require('../../src/rendering/effects/visionCone');
  const {createIconArt} = require('../../src/rendering/effects/alertIcons');
  const {createLightFx} = require('../../src/rendering/effects/lightFx');
  const {createDebugArt} = require('../../src/rendering/debug/guardDebug');
  const {renderPlaygroundFrame} = require('../../src/rendering/renderFrame');
  const {fill} = require('../../src/rendering/paints');
  // ART_OVERRIDES=<dir>: a PNG there with the same base name replaces the runtime file for this render only
  // (candidate art is reviewed in place without touching assets/).
  const overrides = process.env.ART_OVERRIDES;
  const decode = (file: string) => {
    const alt = overrides ? path.join(overrides, path.basename(file)) : null;
    const chosen = alt && fs.existsSync(alt) ? alt : file;
    if (chosen !== file) console.log(`  override ${path.basename(file)} ← ${chosen}`);
    return Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(chosen)));
  };
  const c = 'assets/characters/';
  const assets = buildGameAssets(ASSET_MANIFEST, {
    ...decodeEnvironmentImages(decode), museumAtlas: decode('assets/museum/museum_atlas.png'),
    playerIdle: decode(c + 'player_idle.png'), playerSneak: decode(c + 'player_sneak.png'), playerWalk: decode(c + 'player_walk.png'), playerRun: decode(c + 'player_run.png'),
    guardIdle: decode(c + 'guard_idle.png'), guardWalk: decode(c + 'guard_walk.png'), guardRun: decode(c + 'guard_run.png'),
    guardWhistle: decode(c + 'guard_whistle.png'), guardSearch: decode(c + 'guard_search.png'),
    // The app decodes these through IMAGE_SOURCES when the manifest lists `labFloor`; NO_LAB_FLOOR=1 leaves them
    // out, which makes buildGameAssets fall back to the code-drawn Lab floor (for before/after renders).
    ...(process.env.NO_LAB_FLOOR ? {} : Object.fromEntries(Object.entries({labFloorA: 'a', labFloorB: 'b', labFloorC: 'c', labFloorD: 'd', labFloorInlay: 'inlay', labFloorRestrictedA: 'restricted_a', labFloorRestrictedB: 'restricted_b'})
      .map(([key, n]) => [key, decode(`assets/environment/lab/floor/lab_floor_tile_${n}.png`)]))),
  });
  fs.mkdirSync(outDir, {recursive: true});
  for (const id of ids) {
    const d = campaignStages.find((s: {id: string}) => s.id === id);
    if (!d) throw Error(`unknown mission ${id}`);
    const stage = compileStage(d), state = createPlaygroundState(stage);
    state.cam = {x: -16, y: -55};
    if (tiles) {
      if (d.theme !== 'lab') console.log(`  FLOOR_TILES: ${id} is not a lab map, tiles not applied`);
      const {MATERIALS} = require('../../src/game/levels/chapterArt');
      const hex = (h: string) => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
      tileCtx.floorColor = d.theme === 'lab' ? hex(MATERIALS.lab.floor) : null; tileCtx.seamColor = d.theme === 'lab' ? hex(MATERIALS.lab.seam) : null;
      tileCtx.variant = (d.mission ?? 1) - 1;
      const rooms = (d.topologyPlan?.rooms ?? []).filter((r: {role: string}) => r.role === 'restricted' || r.role === 'objective');
      tileCtx.restricted = (x, y) => rooms.some((r: {x: number; y: number; w: number; h: number}) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    }
    const width = stage.width + 32, height = stage.height + 71;
    // Cost proxy: how long the static stage art takes to record and how long one frame takes to record and
    // rasterise in CanvasKit. Compare before/after on the same machine; absolute values are not device times.
    const t0 = performance.now();
    ops.n = 0;
    const stageArt = buildStageArt(stage, assets.museum);
    const tArt = performance.now() - t0, staticOps = ops.n;
    const resources = {stage: stageArt, doors: createDoorArt(),
      // CHAR_NEAREST=1 renders characters with the old nearest sampling (before/after comparisons).
      player: createCharacterVisual(assets.player, createCharacterArt(PLAYER_PALETTE, false), !process.env.CHAR_NEAREST),
      guard: createCharacterVisual(assets.guard, createCharacterArt(GUARD_PALETTE, true), !process.env.CHAR_NEAREST),
      cone: createConeArt(), icons: createIconArt(assets.indicators), fx: createLightFx(),
      diamond: assets.museum?.[VALUABLES[d.objective?.kind ?? 'diamond'].sprite] ?? null, diamondPos: stage.objective,
      exit: Skia.XYWHRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h), debug: createDebugArt(null),
      vignette: fill('#000000', 0), screen: Skia.XYWHRect(0, 0, width, height), zoom: 1};
    for (const guard of state.guards) buildVisionFan(guard, doorBlockers(state.doors ?? [], stage.movementBlockers, stage.visionBlockers).visionBlockers);
    const t1 = performance.now();
    ops.n = 0;
    const pic = renderPlaygroundFrame(state, resources, false), surface = ck.MakeSurface(width * K, height * K)!;
    const tFrame = performance.now() - t1, frameOps = ops.n;
    surface.getCanvas().scale(K, K);
    surface.getCanvas().drawPicture(pic.ref);
    surface.flush();
    const tRaster = performance.now() - t1 - tFrame;
    const image = surface.makeImageSnapshot();
    fs.writeFileSync(`${outDir}/${id}-x${K}.png`, image.encodeToBytes()!);
    image.delete(); surface.delete(); pic.dispose();
    const cells = {floor: 0, wall: 0};
    for (const cell of stage.grid) if (cell === 1) cells.floor++; else if (cell === 2) cells.wall++;
    console.log(`${id} ${d.title} → ${outDir}/${id}-x${K}.png  [static pictures: ${staticOps} draw ops in ${tArt.toFixed(0)} ms (${stageArt.layers.length} layers); frame: ${frameOps} ops, record ${tFrame.toFixed(1)} ms, raster ${tRaster.toFixed(0)} ms @${K}x; ${cells.floor} floor / ${cells.wall} wall cells, ${stage.props.length} props, ${stage.lights.length} lights]`);
  }
}
void main();
