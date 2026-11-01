/**
 * Visual Polish Pass 4: nearest vs linear character sampling through the real game draw path
 * (createCharacterVisual + drawCharacterVisual), at the iPhone 17 scale, plus numeric checks.
 *
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/visual-polish/character-hd/samplingCompare.ts <outDir>
 *
 * Writes <outDir>/board-<who>.png (rows: state × direction, columns: nearest | linear, 2× magnified detail of each)
 * and report.json:
 *   bleed   — alpha drawn outside the frame's destination rectangle (must be 0: no neighbouring-frame pixels)
 *   halo    — part-transparent pixels added around the silhouette by linear (soft edge, expected small)
 *   footDy  — difference of the lowest opaque row between nearest and linear (px at device scale; feet must not move)
 *   centroid— figure-centroid shift between the two (px at device scale; no frame-to-frame wobble)
 */
import fs from 'node:fs';
import path from 'node:path';
import {initSkiaNode} from '../../sprites/skiaNode';

const DEVICE = 1206 / (9.4 * 40); // device px per world unit, iPhone 17
const RGBA = 4, UNPREMUL = 3; // react-native-skia ColorType.RGBA_8888 / AlphaType.Unpremul

async function main() {
  const out = process.argv[2];
  if (!out) throw Error('usage: samplingCompare.ts <outDir>');
  fs.mkdirSync(out, {recursive: true});
  await initSkiaNode();
  require.extensions['.png'] = module => { module.exports = 0; }; // eslint-disable-line @typescript-eslint/no-require-imports
  /* eslint-disable @typescript-eslint/no-require-imports */
  const {Skia} = require('../../sprites/skiaNodeShim');
  const {ASSET_MANIFEST} = require('../../../src/assets/manifest');
  const {buildGameAssets} = require('../../../src/assets/buildSprites');
  const {createCharacterVisual, drawCharacterVisual} = require('../../../src/rendering/characters/characterVisual');
  const {createCharacterArt} = require('../../../src/rendering/fallback/proceduralCharacter');
  const {PLAYER_PALETTE, GUARD_PALETTE} = require('../../../src/rendering/fallback/characterPalettes');
  const {Anim} = require('../../../src/rendering/sprites/spriteTypes');
  const {GuardAction} = require('../../../src/game/core/types');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const c = 'assets/characters/', dec = (f: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(c + f)));
  const assets = buildGameAssets({...ASSET_MANIFEST, environment: {museum: null, production: []}}, {
    playerIdle: dec('player_idle.png'), playerSneak: dec('player_sneak.png'), playerWalk: dec('player_walk.png'), playerRun: dec('player_run.png'),
    guardIdle: dec('guard_idle.png'), guardWalk: dec('guard_walk.png'), guardRun: dec('guard_run.png'), guardWhistle: dec('guard_whistle.png'), guardSearch: dec('guard_search.png'),
  });
  // facing radians: down, left, right, up (facingToDir)
  const dirs: [string, number][] = [['down', Math.PI / 2], ['left', Math.PI], ['right', 0], ['up', -Math.PI / 2]];
  const states: Record<'player' | 'guard', [string, number, number, number][]> = { // label, gait, animationOverride, action
    player: [['idle', 0, Anim.Idle, 0], ['sneak', 1, Anim.Sneak, 0], ['walk', 2, Anim.Walk, 0], ['run', 3, Anim.Run, 0]],
    guard: [['idle', 0, Anim.Idle, 0], ['walk', 2, Anim.Walk, 0], ['run', 3, Anim.Run, 0], ['search', 0, Anim.Search, 0], ['whistle', 0, Anim.Whistle, GuardAction.Whistle]],
  };
  const cell = Math.ceil(70 * DEVICE), report: Record<string, unknown> = {};
  for (const who of ['player', 'guard'] as const) {
    const sprites = assets[who], art = createCharacterArt(who === 'player' ? PLAYER_PALETTE : GUARD_PALETTE, who === 'guard');
    const vis = {nearest: createCharacterVisual(sprites, art, false), linear: createCharacterVisual(sprites, art, true)};
    const rows = states[who].length * dirs.length, cols = 4; // nearest, linear, nearest 2×, linear 2×
    const board = Skia.Surface.Make(cols * cell, rows * cell)!, bc = board.getCanvas();
    bc.drawColor(Skia.Color('#29424b'));
    const stats = {bleed: 0, haloMax: 0, footDyMax: 0, centroidMax: 0, frames: 0};
    let row = 0;
    for (const [label, gait, anim, action] of states[who]) for (const [dname, facing] of dirs) {
      const shots: Record<string, Uint8Array> = {};
      for (const mode of ['nearest', 'linear'] as const) {
        // Draw on a transparent surface first (numeric checks), at a fractional position like a moving character.
        const s = Skia.Surface.Make(cell, cell)!, sc = s.getCanvas();
        sc.save(); sc.scale(DEVICE, DEVICE);
        const x = cell / DEVICE / 2 + 0.37, y = cell / DEVICE * 0.82 + 0.21;
        drawCharacterVisual(sc, vis[mode], x, y, facing, gait, 0.35, 10, 0.4, action, 0.4, true, anim, gait ? 60 : 0);
        sc.restore(); s.flush();
        const img = s.makeImageSnapshot();
        shots[mode] = img.readPixels(0, 0, {width: cell, height: cell, colorType: RGBA, alphaType: UNPREMUL}) as Uint8Array;
        const col = mode === 'nearest' ? 0 : 1;
        bc.drawImage(img, col * cell, row * cell);
        // 2× detail of the head (top third), nearest-magnified so the sampling difference is visible.
        bc.drawImageRectOptions(img, Skia.XYWHRect(cell * 0.25, cell * 0.05, cell * 0.5, cell * 0.5), Skia.XYWHRect((col + 2) * cell, row * cell, cell, cell), 0, 0, Skia.Paint());
      }
      // checks: the shadow ellipse is drawn by code under the sprite in both modes, so compare silhouettes above it
      const A = (px: Uint8Array, x: number, y: number) => px[(y * cell + x) * 4 + 3];
      const lowest = (px: Uint8Array) => { for (let y = cell - 1; y >= 0; y--) for (let x = 0; x < cell; x++) if (A(px, x, y) > 200) return y; return -1; };
      const centroid = (px: Uint8Array) => { let sx = 0, sy = 0, n = 0; for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) { const a = A(px, x, y); if (a > 128) { sx += x; sy += y; n++; } } return [sx / n, sy / n]; };
      let soft = [0, 0];
      for (const [k, mode] of [[0, 'nearest'], [1, 'linear']] as const) for (let i = 3; i < shots[mode].length; i += 4) { const a = shots[mode][i]; if (a > 8 && a < 248) soft[k]++; }
      const [cn, cl] = [centroid(shots.nearest), centroid(shots.linear)];
      stats.haloMax = Math.max(stats.haloMax, soft[1] - soft[0]);
      stats.footDyMax = Math.max(stats.footDyMax, Math.abs(lowest(shots.nearest) - lowest(shots.linear)));
      stats.centroidMax = Math.max(stats.centroidMax, Math.hypot(cn[0] - cl[0], cn[1] - cl[1]));
      stats.frames++; row++;
      void label; void dname;
    }
    // Bleed: draw every frame of every clip alone with linear at a fractional scale; nothing may land outside its
    // destination rectangle (a neighbouring frame or row would show up there).
    for (const clipsByDir of Object.values(sprites.clips) as unknown[]) for (const clip of (clipsByDir as ({frames: {image: unknown; sx: number; sy: number; sw: number; sh: number}[]} | null)[]) ?? []) {
      if (!clip) continue;
      for (const f of clip.frames) {
        const k = 1.67, W = Math.ceil(f.sw * k) + 8, s = Skia.Surface.Make(W, W)!, sc = s.getCanvas();
        sc.drawImageRectOptions(f.image, Skia.XYWHRect(f.sx, f.sy, f.sw, f.sh), Skia.XYWHRect(4.3, 4.3, f.sw * k, f.sh * k), 1, 0, Skia.Paint());
        s.flush();
        const px = s.makeImageSnapshot().readPixels(0, 0, {width: W, height: W, colorType: RGBA, alphaType: UNPREMUL}) as Uint8Array;
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
          const inside = x >= 4 && y >= 4 && x < 4.3 + f.sw * k + 1 && y < 4.3 + f.sh * k + 1;
          if (!inside && px[(y * W + x) * 4 + 3] > 0) stats.bleed++;
        }
      }
    }
    board.flush();
    fs.writeFileSync(path.join(out, `board-${who}.png`), board.makeImageSnapshot().encodeToBytes()!);
    report[who] = {...stats, centroidMax: +stats.centroidMax.toFixed(3), devicePxPerWorld: +DEVICE.toFixed(3), magnification: +(sprites.scale * DEVICE).toFixed(3)};
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
}
void main();
