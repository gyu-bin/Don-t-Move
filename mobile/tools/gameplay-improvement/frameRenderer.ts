/**
 * Production frame renderer for offline evidence (CanvasKit): whole map, guards / cones / icons as the game draws them,
 * no HUD, banners or sound. Run with TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import {initSkiaNode} from '../sprites/skiaNode';

export async function createFrameRenderer(scale = 1.25) {
  const ck = await initSkiaNode();
  require.extensions['.png'] = module => { module.exports = 0; };
  Object.assign(globalThis, {__DEV__: false});
  const {Skia} = require('../sprites/skiaNodeShim');
  const decode = (file: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));
  const {ASSET_MANIFEST} = require('../../src/assets/manifest');
  const {buildGameAssets} = require('../../src/assets/buildSprites');
  const {decodeEnvironmentImages} = require('../../src/assets/environmentKit');
  const {VALUABLES} = require('../../src/game/levels/stagePresentation');
  const {compileStage} = require('../../src/game/world/compileStage');
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
  const c = 'assets/characters/';
  const assets = buildGameAssets(ASSET_MANIFEST, {
    ...decodeEnvironmentImages(decode), museumAtlas: decode('assets/museum/museum_atlas.png'),
    playerIdle: decode(c + 'player_idle.png'), playerSneak: decode(c + 'player_sneak.png'), playerWalk: decode(c + 'player_walk.png'), playerRun: decode(c + 'player_run.png'),
    guardIdle: decode(c + 'guard_idle.png'), guardWalk: decode(c + 'guard_walk.png'), guardRun: decode(c + 'guard_run.png'),
    guardWhistle: decode(c + 'guard_whistle.png'), guardSearch: decode(c + 'guard_search.png'),
    ...Object.fromEntries(Object.entries({labFloorA: 'a', labFloorB: 'b', labFloorC: 'c', labFloorD: 'd', labFloorInlay: 'inlay', labFloorRestrictedA: 'restricted_a', labFloorRestrictedB: 'restricted_b'})
      .map(([key, n]) => [key, decode(`assets/environment/lab/floor/lab_floor_tile_${n}.png`)])),
  });
  const cache = new Map<string, unknown>();
  const resourcesFor = (def: {id: string; objective?: {kind?: string}}) => {
    if (cache.has(def.id)) return cache.get(def.id);
    const stage = compileStage(def), width = stage.width + 32, height = stage.height + 71;
    const r = {stage: buildStageArt(stage, assets.museum), doors: createDoorArt(),
      player: createCharacterVisual(assets.player, createCharacterArt(PLAYER_PALETTE, false), true),
      guard: createCharacterVisual(assets.guard, createCharacterArt(GUARD_PALETTE, true), true),
      cone: createConeArt(), icons: createIconArt(assets.indicators), fx: createLightFx(),
      diamond: assets.museum?.[VALUABLES[def.objective?.kind ?? 'diamond'].sprite] ?? null, diamondPos: stage.objective,
      exit: Skia.XYWHRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h), debug: createDebugArt(null),
      vignette: fill('#000000', 0), screen: Skia.XYWHRect(0, 0, width, height), zoom: 1, width, height};
    cache.set(def.id, r); return r;
  };
  return {
    render(def: {id: string; objective?: {kind?: string}}, state: {cam: {x: number; y: number}}, file: string) {
      const r = resourcesFor(def) as {width: number; height: number};
      state.cam = {x: -16, y: -55};
      const pic = renderPlaygroundFrame(state, r, false), surface = ck.MakeSurface(Math.round(r.width * scale), Math.round(r.height * scale))!;
      const cv = surface.getCanvas(); cv.scale(scale, scale); cv.drawPicture(pic.ref); surface.flush();
      const image = surface.makeImageSnapshot(); fs.writeFileSync(file, image.encodeToBytes()!); image.delete(); surface.delete(); pic.dispose();
    },
  };
}
