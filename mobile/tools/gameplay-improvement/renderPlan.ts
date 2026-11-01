/**
 * Whole-map plan view for level design: the production frame (offline CanvasKit) with overlays — guard patrols
 * (yellow, stop dots sized by wait), camera sweep fans (orange), authored safe/risk approach (cyan/magenta),
 * quick/alternate escape (green/lime), spawn / prize / exit markers. Reads the runtime campaign or a candidate JSON.
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/gameplay-improvement/renderPlan.ts <outDir> <id>... [CAMPAIGN_JSON=file]
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import {initSkiaNode} from '../sprites/skiaNode';

async function main() {
  const [outDir, ...ids] = process.argv.slice(2);
  if (!outDir || !ids.length) throw Error('usage: renderPlan.ts <outDir> <id>...');
  const K = Number(process.env.SCALE ?? 1.5), TAG = process.env.TAG ?? 'plan';
  const ck = await initSkiaNode();
  require.extensions['.png'] = module => { module.exports = 0; };
  Object.assign(globalThis, {__DEV__: false});
  const {Skia} = require('../sprites/skiaNodeShim');
  const decode = (file: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));
  const {ASSET_MANIFEST} = require('../../src/assets/manifest');
  const {buildGameAssets} = require('../../src/assets/buildSprites');
  const {decodeEnvironmentImages} = require('../../src/assets/environmentKit');
  const stages = process.env.CAMPAIGN_JSON ? JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON, 'utf8')) : require('../../src/game/levels/campaignStages').campaignStages;
  const {VALUABLES} = require('../../src/game/levels/stagePresentation');
  const {compileStage, TILE} = require('../../src/game/world/compileStage');
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
  // Overlays draw on the raw CanvasKit surface canvas, so they use CanvasKit objects directly.
  const CK = ck as unknown as {Paint:new()=>{setColor(c:Float32Array):void;setStyle(s:unknown):void;setStrokeWidth(w:number):void;setAntiAlias(b:boolean):void};
    Path:{MakeFromCmds(cmds:number[]):unknown};MOVE_VERB:number;LINE_VERB:number;CLOSE_VERB:number;PaintStyle:{Stroke:unknown;Fill:unknown};parseColorString(s:string):Float32Array;Color4f(r:number,g:number,b:number,a:number):Float32Array};
  const col = (hex: string, a: number) => { const c = CK.parseColorString(hex); return CK.Color4f(c[0], c[1], c[2], a); };
  const stroke = (hex: string, w: number, a = 1) => { const p = new CK.Paint(); p.setColor(col(hex, a)); p.setStyle(CK.PaintStyle.Stroke); p.setStrokeWidth(w); p.setAntiAlias(true); return p; };
  const solid = (hex: string, a = 1) => { const p = new CK.Paint(); p.setColor(col(hex, a)); p.setStyle(CK.PaintStyle.Fill); p.setAntiAlias(true); return p; };
  for (const id of ids) {
    const d = stages.find((s: {id: string}) => s.id === id);
    if (!d) throw Error(`unknown mission ${id}`);
    const stage = compileStage(d), state = createPlaygroundState(stage);
    state.cam = {x: -16, y: -55};
    const width = stage.width + 32, height = stage.height + 71;
    const resources = {stage: buildStageArt(stage, assets.museum), doors: createDoorArt(),
      player: createCharacterVisual(assets.player, createCharacterArt(PLAYER_PALETTE, false), true),
      guard: createCharacterVisual(assets.guard, createCharacterArt(GUARD_PALETTE, true), true),
      cone: createConeArt(), icons: createIconArt(assets.indicators), fx: createLightFx(),
      diamond: assets.museum?.[VALUABLES[d.objective?.kind ?? 'diamond'].sprite] ?? null, diamondPos: stage.objective,
      exit: Skia.XYWHRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h), debug: createDebugArt(null),
      vignette: fill('#000000', 0), screen: Skia.XYWHRect(0, 0, width, height), zoom: 1};
    for (const g of state.guards) buildVisionFan(g, doorBlockers(state.doors ?? [], stage.movementBlockers, stage.visionBlockers).visionBlockers);
    const pic = renderPlaygroundFrame(state, resources, false), surface = ck.MakeSurface(width * K, height * K)!;
    const cv = surface.getCanvas() as unknown as {scale(a:number,b:number):void;drawPicture(p:unknown):void;translate(x:number,y:number):void;drawPath(p:unknown,q:unknown):void;drawCircle(x:number,y:number,r:number,q:unknown):void}; cv.scale(K, K); cv.drawPicture(pic.ref);
    cv.translate(16, 55);
    const P = (x: number, y: number) => [x * TILE, y * TILE] as const;
    const poly = (pts: {x: number; y: number}[], paint: unknown, close = false) => {
      const cmds: number[] = []; pts.forEach((q, i) => { const [x, y] = P(q.x, q.y); cmds.push(i ? CK.LINE_VERB : CK.MOVE_VERB, x, y); }); if (close) cmds.push(CK.CLOSE_VERB); cv.drawPath(CK.Path.MakeFromCmds(cmds), paint);
    };
    const routes = (d.patrolRoutes ?? []) as {id: string; mode: string; points: {x: number; y: number; waitDuration?: number}[]}[];
    for (const g of d.guards ?? []) { const r = routes.find(q => q.id === g.routeId); if (!r) continue;
      poly(r.points, stroke('#ffd400', 3, 0.9), r.mode === 'loop' && r.points.length > 2);
      for (const q of r.points) { const [x, y] = P(q.x, q.y); cv.drawCircle(x, y, 4 + 2 * (q.waitDuration ?? 0), solid('#ffd400', 0.55)); } }
    for (const cam of d.cameras ?? []) { const [x, y] = P(cam.x, cam.y), R = cam.range * TILE, half = cam.visionAngle / 2 + cam.sweepAngle;
      const cmds: number[] = [CK.MOVE_VERB, x, y];
      for (let k = 0; k <= 24; k++) { const a = cam.centerFacing - half + 2 * half * k / 24; cmds.push(CK.LINE_VERB, x + Math.cos(a) * R, y + Math.sin(a) * R); }
      cmds.push(CK.CLOSE_VERB); const path = CK.Path.MakeFromCmds(cmds); cv.drawPath(path, solid('#ff8a00', 0.18)); cv.drawPath(path, stroke('#ff8a00', 2, 0.8)); }
    const [safe, risk] = d.testRoutes ?? [], [quick, alt] = d.escapeRoutes ?? [];
    if (safe) poly(safe.points, stroke('#00e5ff', 3, 0.9)); if (risk) poly(risk.points, stroke('#ff3df2', 3, 0.9));
    if (quick) poly(quick.points, stroke('#2bff6a', 3, 0.9)); if (alt) poly(alt.points, stroke('#c6ff3d', 2.5, 0.8));
    const mark = (q: {x: number; y: number}, hex: string) => { const [x, y] = P(q.x, q.y); cv.drawCircle(x, y, 10, solid(hex, 0.95)); };
    mark(d.playerSpawn, '#ffffff'); if (d.objective) mark(d.objective, '#3d8bff'); if (d.exit) mark({x: d.exit.x + d.exit.w / 2, y: d.exit.y + d.exit.h / 2}, '#ff3b3b');
    surface.flush();
    const image = surface.makeImageSnapshot(), file = `${outDir}/${id}-${TAG}.png`;
    fs.writeFileSync(file, image.encodeToBytes()!); image.delete(); surface.delete(); pic.dispose();
    console.log(file);
  }
}
void main();
