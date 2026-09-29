/**
 * Offline in-game QA: the ACTUAL game simulation (stepPlayground with a tilt input,
 * real collision, real guard AI) and the ACTUAL frame renderer (renderPlaygroundFrame)
 * with the production atlases, at the iPhone 17 zoom. Not a Simulator capture.
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/locomotion/renderInGame.ts [outDir]
 * Writes PNG sequences per scenario; tools/locomotion/previews.py-style GIFs are made by gif.py.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import { initSkiaNode } from '../sprites/skiaNode';

async function main() {
  const outDir = path.resolve(process.argv[2] ?? 'Reports/Locomotion/ingame');
  const ck = await initSkiaNode();
  require.extensions['.png'] = module => { module.exports = 0; };
  Object.assign(globalThis, { __DEV__: false });
  const { Skia } = require('../sprites/skiaNodeShim');
  const { ASSET_MANIFEST } = require('../../src/assets/manifest');
  const { buildGameAssets } = require('../../src/assets/buildSprites');
  const { campaignStages } = require('../../src/game/levels/campaignStages');
  const { compileStage, TILE, WALL_HEIGHT } = require('../../src/game/world/compileStage');
  const { buildNavigation } = require('../../src/game/world/navigation');
  const { BODY } = require('../../src/game/guards/guardTuning');
  const { createPlaygroundState, stepPlayground } = require('../../src/game/playground/playgroundState');
  const { guardStrideContract } = require('../../src/rendering/characters/guardAnimation');
  const { buildStageArt } = require('../../src/rendering/environment/buildStageArt');
  const { createCharacterVisual } = require('../../src/rendering/characters/characterVisual');
  const { createCharacterArt } = require('../../src/rendering/fallback/proceduralCharacter');
  const { PLAYER_PALETTE, GUARD_PALETTE } = require('../../src/rendering/fallback/characterPalettes');
  const { createConeArt } = require('../../src/rendering/effects/visionCone');
  const { createIconArt } = require('../../src/rendering/effects/alertIcons');
  const { createLightFx } = require('../../src/rendering/effects/lightFx');
  const { createDebugArt } = require('../../src/rendering/debug/guardDebug');
  const { renderPlaygroundFrame } = require('../../src/rendering/renderFrame');
  const { fill } = require('../../src/rendering/paints');
  const decode = (file: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));
  const c = 'assets/characters/';
  const assets = buildGameAssets(ASSET_MANIFEST, {
    museumAtlas: decode('assets/museum/museum_atlas.png'),
    playerIdle: decode(c + 'player_idle.png'), playerSneak: decode(c + 'player_sneak.png'), playerWalk: decode(c + 'player_walk.png'), playerRun: decode(c + 'player_run.png'),
    guardIdle: decode(c + 'guard_idle.png'), guardWalk: decode(c + 'guard_walk.png'), guardRun: decode(c + 'guard_run.png'),
  });
  const def = campaignStages.find((d: { id: string }) => d.id === '01-01');
  const stage = compileStage(def), nav = buildNavigation(stage, BODY.guardRadius);
  const W_PT = 402, H_PT = 874, zoomPt = W_PT / (9.4 * TILE), SCALE = 2; // @2x output
  const zoom = zoomPt * SCALE, viewW = W_PT / zoomPt, viewH = H_PT / zoomPt;
  const bounds = { x: 0, y: -WALL_HEIGHT - 90, w: stage.width, h: stage.height + WALL_HEIGHT + 90 };
  const art = buildStageArt(stage, assets.museum);
  const resources = {
    stage: art,
    player: createCharacterVisual(assets.player, createCharacterArt(PLAYER_PALETTE, false)),
    guard: createCharacterVisual(assets.guard, createCharacterArt(GUARD_PALETTE, true)),
    cone: createConeArt(), icons: createIconArt(assets.indicators), fx: createLightFx(),
    diamond: assets.museum.diamond, diamondPos: stage.objective,
    exit: Skia.XYWHRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h),
    debug: createDebugArt(null), vignette: fill('#000000', 0), screen: Skia.XYWHRect(0, 0, W_PT * SCALE, H_PT * SCALE), zoom,
  };
  const scenarios: { name: string; tilt: [number, number]; seconds: number; focus: 'player' | 'guard' }[] = [
    { name: 'player-sneak', tilt: [0.24, 0], seconds: 2.4, focus: 'player' },
    { name: 'player-walk', tilt: [0.46, 0], seconds: 2.4, focus: 'player' },
    { name: 'player-run', tilt: [1, 0], seconds: 2.0, focus: 'player' },
    { name: 'player-walk-down', tilt: [0, 0.46], seconds: 2.0, focus: 'player' },
    { name: 'guard-patrol', tilt: [0, 0], seconds: 4.0, focus: 'guard' },
  ];
  const cropW = 240 * SCALE, cropH = 170 * SCALE;
  const summary: Record<string, unknown> = {};
  for (const sc of scenarios) {
    const s = createPlaygroundState(stage, guardStrideContract(ASSET_MANIFEST.characters.guard));
    const dir = path.join(outDir, sc.name); fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    const tilt = { x: sc.tilt[0], y: sc.tilt[1], paused: false, reset: s.player.inputReset ?? 0 };
    const speeds: number[] = [];
    let frame = 0;
    for (let i = 0; i < sc.seconds * 60; i++) {
      stepPlayground(s, 1 / 60, TILE, viewW, viewH, bounds, stage.movementBlockers, stage.visionBlockers, nav, tilt);
      speeds.push(sc.focus === 'player' ? s.player.speed : s.guardPlayback[0]?.motionSpeed ?? 0);
      if (i % 2) continue;
      const t = sc.focus === 'player' ? s.player : s.guards[0];
      s.cam = { x: t.x - viewW / 2, y: t.y - 20 - viewH / 2 };
      const pic = renderPlaygroundFrame(s, resources, false);
      const surf = ck.MakeSurface(cropW, cropH)!; const cv = surf.getCanvas();
      cv.clear(ck.BLACK);
      cv.translate(-(W_PT * SCALE - cropW) / 2, -(H_PT * SCALE - cropH) / 2);
      cv.drawPicture(pic.ref);
      fs.writeFileSync(path.join(dir, `${String(frame++).padStart(3, '0')}.png`), surf.makeImageSnapshot().encodeToBytes()!);
      surf.delete(); pic.dispose();
    }
    const moving = speeds.slice(30);
    summary[sc.name] = { meanSpeed: +(moving.reduce((a, b) => a + b, 0) / moving.length).toFixed(1), frames: frame,
      guardAnimation: s.guardPlayback[0]?.animation, playerVisualGait: s.player.visualGait };
  }
  console.log(JSON.stringify(summary));
}
void main();
