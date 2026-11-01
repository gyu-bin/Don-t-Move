/**
 * Renders key moments of a reactive-bot run with the production frame renderer (offline CanvasKit, whole map, no HUD,
 * banners or sound): first glance (suspicion ≥ 0.25), investigation (≥ 0.5), Alert, Chase, and the last frame.
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/gameplay-audit/renderMoments.ts <outDir> <id:strategy:route:delay>...
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import {initSkiaNode} from '../sprites/skiaNode';

async function main() {
  const [outDir, ...specs] = process.argv.slice(2);
  if (!outDir || !specs.length) throw Error('usage: renderMoments.ts <outDir> <id:strategy:route:delay>...');
  const K = Number(process.env.SCALE ?? 2);
  const ck = await initSkiaNode();
  require.extensions['.png'] = module => { module.exports = 0; };
  Object.assign(globalThis, {__DEV__: false});
  const {Skia} = require('../sprites/skiaNodeShim');
  const decode = (file: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));
  const {ASSET_MANIFEST} = require('../../src/assets/manifest');
  const {buildGameAssets} = require('../../src/assets/buildSprites');
  const {decodeEnvironmentImages} = require('../../src/assets/environmentKit');
  const {campaignStages} = require('../../src/game/levels/campaignStages');
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
  const {runMission} = require('./campaignAudit');
  const c = 'assets/characters/';
  const assets = buildGameAssets(ASSET_MANIFEST, {
    ...decodeEnvironmentImages(decode), museumAtlas: decode('assets/museum/museum_atlas.png'),
    playerIdle: decode(c + 'player_idle.png'), playerSneak: decode(c + 'player_sneak.png'), playerWalk: decode(c + 'player_walk.png'), playerRun: decode(c + 'player_run.png'),
    guardIdle: decode(c + 'guard_idle.png'), guardWalk: decode(c + 'guard_walk.png'), guardRun: decode(c + 'guard_run.png'),
    guardWhistle: decode(c + 'guard_whistle.png'), guardSearch: decode(c + 'guard_search.png'),
    ...Object.fromEntries(Object.entries({labFloorA: 'a', labFloorB: 'b', labFloorC: 'c', labFloorD: 'd', labFloorInlay: 'inlay', labFloorRestrictedA: 'restricted_a', labFloorRestrictedB: 'restricted_b'})
      .map(([key, n]) => [key, decode(`assets/environment/lab/floor/lab_floor_tile_${n}.png`)])),
  });
  fs.mkdirSync(outDir, {recursive: true});
  const log: string[] = [];
  for (const spec of specs) {
    const [id, strategy, route, delay] = spec.split(':');
    const d = campaignStages.find((s: {id: string}) => s.id === id);
    const stage = compileStage(d);
    type Snap = {label: string; s: {t: number; cam: {x: number; y: number}}};
    const snaps: Snap[] = []; const seen = new Set<string>(); let last: Snap['s'] | null = null;
    const take = (label: string, s: Snap['s']) => { if (seen.has(label)) return; seen.add(label); snaps.push({label, s: structuredClone(s)}); };
    const result = runMission(d, strategy, route === 'nav' ? 'nav' : +route, +delay, 'A', undefined, (s: {t: number; cam: {x: number; y: number}; guards: {suspicion: number; awareness: number}[]}) => {
      if (s.guards.some(g => g.suspicion >= 0.25)) take('1-glance', s);
      if (s.guards.some(g => g.suspicion >= 0.5)) take('2-investigate', s);
      if (s.guards.some(g => g.awareness === 2)) take('3-alert', s);
      if (s.guards.some(g => g.awareness === 4)) take('4-chase', s);
      last = structuredClone(s);
    });
    if (last) snaps.push({label: '5-end', s: last});
    const width = stage.width + 32, height = stage.height + 71;
    const resources = {stage: buildStageArt(stage, assets.museum), doors: createDoorArt(),
      player: createCharacterVisual(assets.player, createCharacterArt(PLAYER_PALETTE, false), true),
      guard: createCharacterVisual(assets.guard, createCharacterArt(GUARD_PALETTE, true), true),
      cone: createConeArt(), icons: createIconArt(assets.indicators), fx: createLightFx(),
      diamond: assets.museum?.[VALUABLES[d.objective?.kind ?? 'diamond'].sprite] ?? null, diamondPos: stage.objective,
      exit: Skia.XYWHRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h), debug: createDebugArt(null),
      vignette: fill('#000000', 0), screen: Skia.XYWHRect(0, 0, width, height), zoom: 1};
    for (const snap of snaps) {
      snap.s.cam = {x: -16, y: -55};
      const pic = renderPlaygroundFrame(snap.s, resources, false), surface = ck.MakeSurface(width * K, height * K)!;
      surface.getCanvas().scale(K, K); surface.getCanvas().drawPicture(pic.ref); surface.flush();
      const image = surface.makeImageSnapshot(), file = `${outDir}/${id}-${strategy}-r${route}-d${delay}-${snap.label}.png`;
      fs.writeFileSync(file, image.encodeToBytes()!); image.delete(); surface.delete(); pic.dispose();
      log.push(`${file} t=${snap.s.t.toFixed(2)}`);
    }
    log.push(`${spec}: ${result.outcome} at ${result.seconds}s caughtBy=${result.caughtBy}`);
  }
  fs.writeFileSync(`${outDir}/moments.txt`, log.join('\n') + '\n');
  console.log(log.join('\n'));
}
void main();
