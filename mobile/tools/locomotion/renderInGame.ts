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
  const { buildNavigation, findPath } = require('../../src/game/world/navigation');
  const { stepGuardPlayback } = require('../../src/rendering/characters/guardAnimation');
  const { Awareness } = require('../../src/game/core/types');
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
    guardIdle: decode(c + 'guard_idle.png'), guardWhistle: decode(c + 'guard_whistle.png'), guardSearch: decode(c + 'guard_search.png'), guardWalk: decode(c + 'guard_walk.png'), guardRun: decode(c + 'guard_run.png'),
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
  type Sc = { name: string; tilt: [number, number]; seconds: number; focus: 'player' | 'guard'; chase?: boolean;
    tiltAt?: (t: number) => [number, number]; setup?: (s: any) => void };
  const scenarios: Sc[] = [
    { name: 'player-sneak', tilt: [0.24, 0], seconds: 2.4, focus: 'player' },
    { name: 'player-walk', tilt: [0.46, 0], seconds: 2.4, focus: 'player' },
    { name: 'player-run', tilt: [1, 0], seconds: 2.0, focus: 'player' },
    { name: 'player-walk-down', tilt: [0, 0.46], seconds: 2.0, focus: 'player' },
    { name: 'guard-patrol', tilt: [0, 0], seconds: 4.0, focus: 'guard' },
    { name: 'guard-chase', tilt: [0, 0], seconds: 2.0, focus: 'guard', chase: true },
    { name: 'player-walk-left', tilt: [-0.46, 0], seconds: 2.4, focus: 'player', setup: s => { s.player.x += 170; } },
    { name: 'player-run-left', tilt: [-1, 0], seconds: 2.0, focus: 'player', setup: s => { s.player.x += 290; } },
    // LEFT/RIGHT -> UP -> RIGHT while running: gait phase must carry across the turn.
    { name: 'player-turn', tilt: [1, 0], seconds: 3.0, focus: 'player', tiltAt: t => t < 1 ? [0.46, 0] : t < 2 ? [0, -0.46] : [1, 0] },
    // Hold full tilt into a wall: once blocked, speed and sprite phase must stop.
    { name: 'player-wall', tilt: [0, -1], seconds: 3.0, focus: 'player' },
    { name: 'player-wall-down', tilt: [0, 1], seconds: 3.0, focus: 'player' },
    { name: 'guard-patrol-turn', tilt: [0, 0], seconds: 8.0, focus: 'guard' },
    // LOS lost: guard heads to the last known position (Investigate), then Search, all by the real AI.
    { name: 'guard-los-search', tilt: [0, 0], seconds: 9.0, focus: 'guard', setup: s => {
      const g = s.guards[0];
      const tgt = findPath(nav, g.x, g.y, stage.exit.x + stage.exit.w / 2, stage.exit.y + stage.exit.h / 2);
      const k = Math.min(tgt.length - 2, 6);
      g.hasLkp = true; g.lkpX = tgt[k]; g.lkpY = tgt[k + 1]; g.targetX = tgt[k]; g.targetY = tgt[k + 1];
      g.whistled = true;
      // the whistle already raised the global alert; the player has since left every cone
      const ev = s.events; ev.globalAlert = true; ev.globalX = tgt[k]; ev.globalY = tgt[k + 1]; ev.globalRevision++; ev.sawPlayer = false;
    } },
  ];
  const cropW = 240 * SCALE, cropH = 170 * SCALE;
  const summary: Record<string, unknown> = {};
  for (const sc of scenarios) {
    const s = createPlaygroundState(stage, guardStrideContract(ASSET_MANIFEST.characters.guard));
    const dir = path.join(outDir, sc.name); fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    const tilt = { x: sc.tilt[0], y: sc.tilt[1], paused: false, reset: s.player.inputReset ?? 0 };
    const speeds: number[] = [];
    sc.setup?.(s);
    const trace = { maxPhaseJump: 0, blockedFrames: 0, blockedPhaseAdvance: 0, facings: new Set<number>(), turns: [] as string[],
      timeline: [] as string[], lastKey: '' };
    // Scripted chase for presentation QA: the guard is put in CHASE and moved along a
    // navigation path at the real direct-chase speed (168); playback/renderer are the game's.
    const chasePath: number[] = sc.chase ? findPath(nav, s.guards[0].x, s.guards[0].y, s.player.x, s.player.y) : [];
    let runFrames = 0;
    let frame = 0;
    for (let i = 0; i < sc.seconds * 60; i++) {
      if (sc.chase) {
        const g = s.guards[0]; let step = 168 / 60;
        while (step > 0 && chasePath.length) {
          const dx = chasePath[0] - g.x, dy = chasePath[1] - g.y, d = Math.hypot(dx, dy);
          if (d < 1e-6) { chasePath.splice(0, 2); continue; }
          g.facing = Math.atan2(dy, dx);
          const m = Math.min(step, d); g.x += dx / d * m; g.y += dy / d * m; step -= m;
          if (m >= d) chasePath.splice(0, 2);
        }
        g.awareness = Awareness.Chase; g.speed = chasePath.length ? 168 : 0;
        s.t += 1 / 60;
        stepGuardPlayback(s.guardPlayback[0], g, 1 / 60);
      } else {
        if (sc.tiltAt) { const [tx, ty] = sc.tiltAt(i / 60); tilt.x = tx; tilt.y = ty; }
        const ph0 = s.player.spritePhase, dir0 = Math.round(s.player.facing / (Math.PI / 2));
        stepPlayground(s, 1 / 60, TILE, viewW, viewH, bounds, stage.movementBlockers, stage.visionBlockers, nav, tilt);
        const dPh = ((s.player.spritePhase - ph0) % 1 + 1) % 1;
        const expected = s.player.speed / 60;
        if (sc.focus === 'player') {
          const dir1 = Math.round(s.player.facing / (Math.PI / 2));
          if (dir1 !== dir0) trace.turns.push(`${(i / 60).toFixed(2)}s dir ${dir0}->${dir1} phase ${ph0.toFixed(3)}->${s.player.spritePhase.toFixed(3)}`);
          if (s.player.speed < 0.5 && (tilt.x || tilt.y)) { trace.blockedFrames++; trace.blockedPhaseAdvance += Math.min(dPh, 1 - dPh); }
          trace.maxPhaseJump = Math.max(trace.maxPhaseJump, Math.min(dPh, 1 - dPh) - (expected > 0 ? 0 : 0));
        }
      }
      const gp = s.guardPlayback[0], g0 = s.guards[0];
      if (gp && g0) {
        trace.facings.add(Math.round(((g0.facing % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (Math.PI / 2)) % 4);
        const key = `aw${g0.awareness}/anim${gp.animation}`;
        if (key !== trace.lastKey) { trace.timeline.push(`${(i / 60).toFixed(2)}s ${key} v=${gp.motionSpeed.toFixed(0)}`); trace.lastKey = key; }
      }
      speeds.push(sc.focus === 'player' ? s.player.speed : s.guardPlayback[0]?.motionSpeed ?? 0);
      if (s.guardPlayback[0]?.animation === 3) runFrames++;
      if (s.events?.caught) break;
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
      guardAnimation: s.guardPlayback[0]?.animation, playerVisualGait: s.player.visualGait, guardRunFrames: runFrames,
      guardMaxSpeed: +Math.max(...speeds).toFixed(1),
      maxPhaseStep: +trace.maxPhaseJump.toFixed(3), blockedFrames: trace.blockedFrames, blockedPhaseAdvance: +trace.blockedPhaseAdvance.toFixed(4),
      playerTurns: trace.turns, guardFacings: [...trace.facings], guardTimeline: trace.timeline.slice(0, 14) };
  }
  console.log(JSON.stringify(summary, null, 1));
}
void main();
