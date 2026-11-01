/**
 * DON'T MOVE — vertical SNS trailer v2 (1080×1920, 30 fps, ~26 s).
 *
 * Everything on screen is the real game: the app's own Spotlight Freeze intro (introFrame/drawMuseumScene) and gameplay
 * simulated with the production 60 Hz logic, drawn by the production renderer (renderPlaygroundFrame). On top: colour
 * grades, film grain, RGB-split glitch hits, slow motion from 60 Hz frames, kinetic type, a phone mock-up for the tilt.
 * After the 2.5 s hook every shot lasts a whole number of beats of the chase track (143.5 BPM), so every cut lands on
 * the beat. Music is the game's CC0 stealth/chase tracks (assets/audio/LICENSES.md); hits, heartbeat, riser and whooshes
 * are synthesised here with ffmpeg, so the soundtrack carries no third-party rights.
 *
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/promo/promo.ts <out.mp4>
 *   … --stills <dir> [--at 0.5,1.8,…]   (preview PNGs instead of a video)
 *   … --lang en                          (English copy; text kept clear of TikTok's caption/button area)
 */
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import type {Canvas, FontMgr, ColorFilter} from 'canvaskit-wasm';
import {initSkiaNode} from '../sprites/skiaNode';

const W = 1080, H = 1920, FPS = 30, TILE = 40, VIEW_TILES = 7.6;
const ZOOM = W / (VIEW_TILES * TILE), VIEW_W = W / ZOOM, VIEW_H = H / ZOOM;
const BEAT = 60 / 143.5, MUSIC_AT = 11.71; // chase.mp3: tempo, and the bar where its full groove starts (measured)
const HOOK = 2.5;
const IVORY = [255, 244, 214], CYAN = [62, 197, 255], RED = [255, 59, 48], NAVY = [2, 14, 27], BLACK = [0, 0, 0], GREY = [174, 195, 203];

type State = any; // PlaygroundState snapshots (production type, cloned)
type Cam = {x: number; y: number};
type Range = {from: number; to: number; step: number};
type Run = (push: (s: State) => void) => void;
interface Clip { def: any; frames: State[]; cams: Cam[] }

async function main() {
  const args = process.argv.slice(2);
  const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
  const stills = opt('--stills'), at = opt('--at'), splice = opt('--splice'), redo = opt('--redo') ?? 'end', lang = opt('--lang') ?? 'ko', out = args[0];
  if (!out && !stills) throw Error('usage: promo.ts <out.mp4> | --stills <dir> [--at s,s,…]');
  const ck = await initSkiaNode();
  require.extensions['.png'] = (m: {exports: unknown}) => { m.exports = 0; };
  Object.assign(globalThis, {__DEV__: false});
  const {Skia} = require('../sprites/skiaNodeShim');
  const decode = (file: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));

  // ---------------------------------------------------------------- production modules
  const campaign = require('../../src/game/levels/stages/campaignStages.json');
  const {ASSET_MANIFEST} = require('../../src/assets/manifest');
  const {buildGameAssets} = require('../../src/assets/buildSprites');
  const {decodeEnvironmentImages} = require('../../src/assets/environmentKit');
  const {VALUABLES} = require('../../src/game/levels/stagePresentation');
  const {compileStage, WALL_HEIGHT} = require('../../src/game/world/compileStage');
  const {buildStageArt} = require('../../src/rendering/environment/buildStageArt');
  const {createDoorArt} = require('../../src/rendering/environment/doorArt');
  const {createCharacterVisual} = require('../../src/rendering/characters/characterVisual');
  const {createCharacterArt} = require('../../src/rendering/fallback/proceduralCharacter');
  const {PLAYER_PALETTE, GUARD_PALETTE} = require('../../src/rendering/fallback/characterPalettes');
  const {createConeArt} = require('../../src/rendering/effects/visionCone');
  const {createCctvArt} = require('../../src/rendering/effects/cctvArt');
  const {createIconArt} = require('../../src/rendering/effects/alertIcons');
  const {createLightFx} = require('../../src/rendering/effects/lightFx');
  const {createDebugArt} = require('../../src/rendering/debug/guardDebug');
  const {renderPlaygroundFrame} = require('../../src/rendering/renderFrame');
  const {openingLayout} = require('../../src/ui/branding/openingLayout');
  const {introFrame, GUARD_TURN_MS, FREEZE_MS} = require('../../src/ui/branding/introTimeline');
  const {drawMuseumScene} = require('../../src/ui/branding/museumScene');
  const {skiaSceneGfx} = require('../../src/ui/branding/skiaSceneGfx');
  const {runMission} = require('../gameplay-audit/campaignAudit');
  const lab = require('../gameplay-improvement/v4/chaseLab');

  const c = 'assets/characters/';
  const assets = buildGameAssets(ASSET_MANIFEST, {
    ...decodeEnvironmentImages(decode), museumAtlas: decode('assets/museum/museum_atlas.png'),
    playerIdle: decode(c + 'player_idle.png'), playerSneak: decode(c + 'player_sneak.png'), playerWalk: decode(c + 'player_walk.png'), playerRun: decode(c + 'player_run.png'),
    guardIdle: decode(c + 'guard_idle.png'), guardWalk: decode(c + 'guard_walk.png'), guardRun: decode(c + 'guard_run.png'),
    guardWhistle: decode(c + 'guard_whistle.png'), guardSearch: decode(c + 'guard_search.png'),
    ...Object.fromEntries(Object.entries({labFloorA: 'a', labFloorB: 'b', labFloorC: 'c', labFloorD: 'd', labFloorInlay: 'inlay', labFloorRestrictedA: 'restricted_a', labFloorRestrictedB: 'restricted_b'})
      .map(([key, n]) => [key, decode(`assets/environment/lab/floor/lab_floor_tile_${n}.png`)])),
  });
  const vignette = (() => { const p = Skia.Paint();
    p.setShader(Skia.Shader.MakeRadialGradient({x: W / 2, y: H * 0.48}, Math.max(W, H) * 0.72,
      [Skia.Color('rgba(0,0,0,0)'), Skia.Color('rgba(0,0,0,0.22)'), Skia.Color('rgba(0,0,0,0.8)')], [0.42, 0.68, 1], 0));
    return p; })();
  const resCache = new Map<string, any>();
  const resources = (def: any) => {
    if (resCache.has(def.id)) return resCache.get(def.id);
    const stage = compileStage(def);
    const r = {stage: buildStageArt(stage, assets.museum), doors: stage.doors?.length ? createDoorArt() : undefined,
      player: createCharacterVisual(assets.player, createCharacterArt(PLAYER_PALETTE, false)),
      guard: createCharacterVisual(assets.guard, createCharacterArt(GUARD_PALETTE, true)),
      cone: createConeArt(), cctv: createCctvArt(assets.museum?.cctv ?? null), icons: createIconArt(assets.indicators), fx: createLightFx(),
      diamond: assets.museum?.[VALUABLES[def.objective?.kind ?? 'diamond'].sprite] ?? null, diamondPos: stage.objective,
      exit: Skia.XYWHRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h),
      exitPosition: def.exitPosition ? {x: def.exitPosition.x * TILE, y: def.exitPosition.y * TILE} : undefined,
      guidanceInsets: {top: 260, bottom: 120, left: 0, right: 0}, showObjective: true,
      debug: createDebugArt(null), vignette, screen: Skia.XYWHRect(0, 0, W, H), zoom: ZOOM,
      bounds: {x: 0, y: -WALL_HEIGHT - 90, w: stage.width, h: stage.height + WALL_HEIGHT + 90}};
    resCache.set(def.id, r); return r;
  };

  // ---------------------------------------------------------------- type
  const bytes = (p: string) => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
  const fonts: FontMgr = ck.FontMgr.FromData(bytes('/System/Library/Fonts/AppleSDGothicNeo.ttc'), bytes('/System/Library/Fonts/Avenir Next Condensed.ttc'))!;
  const KO = 'Apple SD Gothic Neo', EN = 'Avenir Next Condensed';
  const col = (rgb: number[], a = 1) => ck.Color(rgb[0], rgb[1], rgb[2], a);
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const ease = (t: number, a: number, b: number) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
  const outBack = (x: number) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  type TextOpt = {x?: number; y: number; size: number; fam?: string; weight?: number; italic?: boolean; color?: number[]; alpha?: number;
    spacing?: number; align?: 'left' | 'center'; shadow?: boolean; stroke?: number; fit?: number; scale?: number};
  /** One line of text; (x, y) is the top-centre (or top-left), scaled about its own centre; `fit` caps the width. */
  function text(cv: Canvas, s: string, o: TextOpt) {
    const a = o.alpha ?? 1; if (a <= 0.003) return 0;
    const fontStyle = {weight: {value: o.weight ?? 800}, slant: o.italic ? ck.FontSlant.Italic : ck.FontSlant.Upright};
    const families = [o.fam ?? KO, KO], color = col(o.color ?? IVORY, a);
    const b = ck.ParagraphBuilder.Make(new ck.ParagraphStyle({textAlign: ck.TextAlign.Left, textStyle: {color, fontFamilies: families, fontSize: o.size,
      letterSpacing: o.spacing ?? 0, fontStyle, shadows: o.shadow === false || o.stroke ? [] : [{color: ck.Color(0, 0, 0, 0.8 * a), offset: [0, 5], blurRadius: 22}]}}), fonts);
    if (o.stroke) {
      const fg = new ck.Paint(); fg.setStyle(ck.PaintStyle.Stroke); fg.setStrokeWidth(o.stroke); fg.setColor(color); fg.setAntiAlias(true);
      const bg = new ck.Paint(); bg.setColor(ck.TRANSPARENT);
      b.pushPaintStyle(new ck.TextStyle({fontFamilies: families, fontSize: o.size, letterSpacing: o.spacing ?? 0, fontStyle}), fg, bg); b.addText(s); b.pop();
      fg.delete(); bg.delete();
    } else b.addText(s);
    const p = b.build(); p.layout(5000);
    const w = p.getMaxIntrinsicWidth() - (o.spacing ?? 0), h = p.getHeight();
    const k = Math.min((o.fit && w > o.fit ? o.fit / w : 1) * (o.scale ?? 1), o.fit ? (W - 30) / w : Infinity);
    cv.save(); cv.translate(o.align === 'left' ? (o.x ?? 0) : (o.x ?? W / 2), o.y + h / 2); cv.scale(k, k);
    cv.drawParagraph(p, o.align === 'left' ? 0 : -w / 2, -h / 2); cv.restore();
    p.delete(); b.delete(); return h * k;
  }
  /** Kinetic slam: pops in at `at` from 1.45× with an overshoot; fades out at `until`. */
  function slam(cv: Canvas, t: number, at: number, until: number, s: string, o: TextOpt) {
    if (t < at || t > until) return;
    const u = t - at, k = clamp01(u / 0.06) * (1 - ease(t, until - 0.12, until));
    text(cv, s, {...o, alpha: (o.alpha ?? 1) * k, scale: (o.scale ?? 1) * (1.45 - 0.45 * outBack(clamp01(u / 0.22)))});
  }
  // On-screen copy. English uses the condensed italic display face for the big lines and sits higher on screen
  // (TikTok covers the bottom ~20 % with its caption and the right edge with buttons).
  const isEn = lang === 'en';
  const T = isEn ? {
    hookTop: 'ONE DIAMOND.', hook1: 'FREEZE.', hook2: '', tagline: "MOVE, AND YOU'RE SEEN.", tiltLabel: 'NO BUTTONS', tilt: 'TILT  TO  MOVE.',
    chapter: (n: number) => `CHAPTER ${String(n).padStart(2, '0')}`, chapters: '9 CHAPTERS.', missions: '45 MISSIONS.',
    breathLabel: 'STAY STILL', breath: 'HOLD YOUR BREATH.', spotted: 'BUSTED.', runLabel: 'GET AWAY', run: 'RUN.', hide: 'HIDE.',
    takeLabel: 'GRAB THE LOOT', take: 'TAKE IT.', outLabel: 'GET OUT', out: 'VANISH.',
    end1: 'A STEALTH GAME IN YOUR HANDS', end2: '', play: 'PLAY IT TODAY'} : {
    hookTop: '단 하나의 보석.', hook1: '움직이지', hook2: '마.', tagline: '움직이면, 들킨다.', tiltLabel: 'TILT TO MOVE', tilt: '기울이면, 움직인다.',
    chapter: (n: number) => `CHAPTER ${String(n).padStart(2, '0')}  ·  ${MONTAGE[n - 2][2]}`, chapters: '9개의 챕터.', missions: '45개의 미션.',
    breathLabel: 'HOLD YOUR BREATH', breath: '숨 참아.', spotted: '들켰다.', runLabel: 'RUN', run: '튀어.', hide: '숨어.',
    takeLabel: 'TAKE IT', take: '훔치고,', outLabel: 'GET OUT', out: '사라져라.',
    end1: '당신의 손안에서 펼쳐지는 잠입', end2: 'A STEALTH GAME IN YOUR HANDS', play: '지금 바로 플레이'};
  /** Style of a big line: Korean heavy gothic, or the English condensed italic at a matching optical size. */
  const big = (size: number, extra: Partial<TextOpt> = {}): Omit<TextOpt, 'y'> =>
    isEn ? {size: size * 1.18, fam: EN, weight: 900, italic: true, fit: 1000, spacing: -1, ...extra} : {size, weight: 900, ...extra};
  const LOW = isEn ? 1200 : 1340, HIGH = isEn ? 520 : 560;
  const paint = (rgb: number[], a: number) => { const p = new ck.Paint(); p.setColor(col(rgb, a)); p.setAntiAlias(true); return p; };
  const fill = (cv: Canvas, rgb: number[], a: number) => { if (a <= 0.003) return; const p = paint(rgb, a); cv.drawRect(ck.XYWHRect(0, 0, W, H), p); p.delete(); };

  // ---------------------------------------------------------------- grading, grain, glitch
  function gradeMatrix(sat: number, contrast: number, tint: number[], lift = 0) {
    const L = [0.2126, 0.7152, 0.0722], m = new Array(20).fill(0);
    for (let r = 0; r < 3; r++) { for (let c2 = 0; c2 < 3; c2++) m[r * 5 + c2] = (L[c2] * (1 - sat) + (r === c2 ? sat : 0)) * contrast * tint[r]; m[r * 5 + 4] = (1 - contrast) * 0.5 * tint[r] + lift; }
    m[18] = 1; return m;
  }
  const GRADE = {
    cool: ck.ColorFilter.MakeMatrix(gradeMatrix(0.95, 1.12, [0.96, 1.0, 1.07], -0.012)),
    breath: ck.ColorFilter.MakeMatrix(gradeMatrix(0.25, 1.18, [0.9, 0.99, 1.12], -0.035)),
    alarm: ck.ColorFilter.MakeMatrix(gradeMatrix(1.0, 1.16, [1.14, 0.84, 0.84], -0.01)),
  };
  const chanFilters = [0, 1, 2].map(ch => ck.ColorFilter.MakeMatrix([ch === 0 ? 1 : 0, 0, 0, 0, 0, 0, ch === 1 ? 1 : 0, 0, 0, 0, 0, 0, ch === 2 ? 1 : 0, 0, 0, 0, 0, 0, 1, 0]));
  const grain = [1, 2, 3, 4].map(seed => {
    const gw = 540, gh = 960, px = new Uint8Array(gw * gh * 4); let r = seed * 7919;
    for (let i = 0; i < gw * gh; i++) { r = (r * 1103515245 + 12345) & 0x7fffffff; const v = 128 + ((r >> 16) % 70) - 35; px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255; }
    return ck.MakeImage({width: gw, height: gh, alphaType: ck.AlphaType.Unpremul, colorType: ck.ColorType.RGBA_8888, colorSpace: ck.ColorSpace.SRGB}, px, gw * 4)!;
  });
  const surface = ck.MakeSurface(W, H)!, cv = surface.getCanvas();
  const offSurface = ck.MakeSurface(W, H)!, off = offSurface.getCanvas();
  function glitch(amount: number, seed: number) {
    const snap = surface.makeImageSnapshot(); cv.clear(col(BLACK));
    chanFilters.forEach((f, i) => { const p = new ck.Paint(); p.setBlendMode(ck.BlendMode.Plus); p.setColorFilter(f); cv.drawImage(snap, [amount, 0, -amount][i], 0, p); p.delete(); });
    let r = seed * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < Math.round(amount / 3); i++) { const y = rnd() * H, h = 14 + rnd() * 80, dx = (rnd() - 0.5) * amount * 7;
      cv.drawImageRectOptions(snap, ck.XYWHRect(0, y, W, h), ck.XYWHRect(dx, y, W, h), ck.FilterMode.Nearest, ck.MipmapMode.None, null); }
    snap.delete();
  }
  function grainPass(f: number) {
    const p = new ck.Paint(); p.setAlphaf(0.09); p.setBlendMode(ck.BlendMode.Overlay);
    cv.drawImageRectOptions(grain[f % 4], ck.XYWHRect(0, 0, 540, 960), ck.XYWHRect(0, 0, W, H), ck.FilterMode.Nearest, ck.MipmapMode.None, p); p.delete();
  }

  // ---------------------------------------------------------------- game frames
  const byId = (id: string) => { const d = campaign.find((x: any) => x.id === id); if (!d) throw Error(`no stage ${id}`); return d; };
  function cameraTrack(def: any, frames: State[], focus = 0.5) {
    const b = resources(def).bounds; const cams: Cam[] = []; let cx = 0, cy = 0;
    frames.forEach((s, i) => {
      const tx = s.player.x - VIEW_W / 2, ty = s.player.y - VIEW_H * focus;
      if (i === 0) { cx = tx; cy = ty; } else { cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16; }
      cams.push({x: b.w <= VIEW_W ? b.x + (b.w - VIEW_W) / 2 : Math.max(b.x, Math.min(cx, b.x + b.w - VIEW_W)),
        y: b.h <= VIEW_H ? b.y + (b.h - VIEW_H) / 2 : Math.max(b.y, Math.min(cy, b.y + b.h - VIEW_H))});
    });
    return cams;
  }
  const clip = (def: any, frames: State[], focus = 0.5): Clip => ({def, frames, cams: cameraTrack(def, frames, focus)});
  const screenOf = (cl: Clip, k: number) => { const s = cl.frames[k], cm = cl.cams[k]; return {x: (s.player.x - cm.x) * ZOOM, y: (s.player.y - cm.y) * ZOOM}; };
  /** Text band for a stretch of a clip: low by default, high when the thief spends that stretch in the lower half. */
  const band = (cl: Clip, a: number, b: number, low = LOW, high = HIGH) => {
    let sum = 0, n = 0; for (let k = Math.max(0, a); k < Math.min(cl.frames.length, b); k++) { sum += screenOf(cl, k).y; n++; }
    return n && sum / n > H * 0.55 ? high : low; };
  function drawGame(cv2: Canvas, cl: Clip, k: number, grade: ColorFilter | null, punch = 0, pivot?: {x: number; y: number}) {
    k = Math.max(0, Math.min(cl.frames.length - 1, Math.round(k)));
    const s = cl.frames[k], cm = cl.cams[k]; s.cam = {x: cm.x, y: cm.y};
    cv2.save();
    if (punch) { const p = pivot ?? {x: W / 2, y: H / 2}; cv2.translate(p.x, p.y); cv2.scale(1 + punch, 1 + punch); cv2.translate(-p.x, -p.y); }
    if (grade) { const gp = new ck.Paint(); gp.setColorFilter(grade); cv2.saveLayer(gp); gp.delete(); }
    const pic = renderPlaygroundFrame(s, resources(cl.def), false); cv2.drawPicture(pic.ref); pic.dispose();
    if (grade) cv2.restore();
    cv2.restore();
  }

  // ---------------------------------------------------------------- clips from the real simulation (60 Hz frame indices)
  // A first pass of a (deterministic) run only measures; a second pass of the same run copies just the frames shown.
  const measure = <T,>(run: Run, f: (s: State) => T) => { const o: T[] = []; run(s => { o.push(f(s)); }); return o; };
  const record = (run: Run, ranges: Range[]) => {
    const o: State[] = []; let n = 0;
    run(s => { for (const r of ranges) if (n >= r.from && n < r.to && (n - r.from) % r.step === 0) { o.push(structuredClone(s)); break; } n++; });
    return o;
  };
  const seen = (s: State) => s.guards.some((g: any) => g.canSee) || (s.securityCameras ?? []).some((q: any) => q.canSee) || s.events.globalAlert;
  const guardNear = (s: State, reach: number) => { let v = 0;
    for (const g of s.guards) { const d = Math.hypot(g.x - s.player.x, g.y - s.player.y) / TILE, facing = Math.cos(Math.atan2(s.player.y - g.y, s.player.x - g.x) - g.facing);
      if (d < reach) v = Math.max(v, (reach - d) / reach * (facing > 0.2 ? 0.5 + 0.5 * facing : 0.35)); }
    return v; };
  const SCORE = {
    montage: (s: State) => seen(s) ? -99 : s.player.speed < 15 ? -0.2 : guardNear(s, 5),
    breath: (s: State) => seen(s) ? -99 : guardNear(s, 3.4) * (s.player.speed < 25 ? 1.3 : 0.8),
    tilt: (s: State) => seen(s) ? -99 : (s.player.speed > 35 ? 1 : 0) + 0.4 * guardNear(s, 5),
  };
  function bestWindow(score: number[], len: number) {
    let best = -Infinity, at2 = -1, sum = 0;
    for (let i = 0; i < score.length; i++) { sum += score[i]; if (i >= len) sum -= score[i - len]; if (i >= len - 1 && sum > best) { best = sum; at2 = i - len + 1; } }
    return {at: at2, best};
  }
  function windowClip(ids: string[], score: (s: State) => number, simLen: number, step: number, good: number, label: string): Clip {
    let pick: {run: Run; def: any; at: number; best: number} | null = null;
    outer: for (const id of ids) { const def = byId(id);
      for (const st of ['observe', 'sneak', 'adaptive', 'cctvTiming', 'walk']) for (const route of [0, 1]) for (const delay of [0, 2, 4]) {
        const run: Run = push => runMission(def, st, route, delay, 'A', undefined, push);
        const w = bestWindow(measure(run, score), simLen);
        if (w.at >= 0 && (!pick || w.best > pick.best)) pick = {run, def, ...w};
        if (pick && pick.best > simLen * good) break outer;
      } }
    if (!pick) throw Error(`no window for ${label}`);
    process.stderr.write(`${label}: ${pick.def.id} score ${(pick.best / simLen).toFixed(2)}\n`);
    return clip(pick.def, record(pick.run, [{from: pick.at, to: pick.at + simLen, step}]));
  }
  function chaseClip(id: string, source: string, dist: number, strategy: string, preFrames: number, len: number) {
    const def = byId(id), w = lab.world(def), sc = lab.scenarios(def).find((x: any) => x.source === source && x.distance === dist && x.warmup === 0);
    const {createPlaygroundState, stepPlayground} = require('../../src/game/playground/playgroundState');
    const {spotSignature} = require('../gameplay-audit/routeGeometry');
    // the walk into the guard's view (as chaseLab provokes it), then the flight from the very same spotted state
    const pre: State[] = [], s = createPlaygroundState(w.stage); s.playerMode = 2; s.player.x = sc.at.x; s.player.y = sc.at.y;
    const sig0 = spotSignature(s); let leg = 1, n = 0;
    for (let f = 0; f < 3600 && spotSignature(s) === sig0; f++) { const tgt = leg % 2 === 1 ? sc.across : sc.at; s.playerMode = 2; s.player.tx = tgt.x; s.player.ty = tgt.y; s.player.hasTarget = true;
      if (Math.hypot(s.player.x - tgt.x, s.player.y - tgt.y) < 4) leg++;
      stepPlayground(s, 1 / 60, TILE, 400, 800, {x: 0, y: 0, w: w.stage.width, h: w.stage.height}, w.stage.movementBlockers, w.stage.visionBlockers, w.nav);
      if (n++ % 2 === 0) { pre.push(structuredClone(s)); if (pre.length > preFrames) pre.shift(); } }
    const sp = lab.provoke(w, sc), after: State[] = []; let m = 0;
    lab.flee(w, sp, sc, strategy, 0, false, (q: State) => { if (m++ % 2 === 0 && after.length < len) after.push(structuredClone(q)); });
    return {...clip(def, [...pre, structuredClone(sp.s), ...after]), spot: pre.length};
  }
  function heistClip(ids: string[]) {
    for (const id of ids) { const def = byId(id);
      for (const st of ['adaptive', 'observe', 'sneak', 'run', 'theftRun']) for (const route of [0, 1]) for (const delay of [0, 2, 4]) {
        const run: Run = push => runMission(def, st, route, delay, 'A', undefined, push);
        const info = measure(run, s => ({done: s.mission.complete, alert: !!s.events.globalAlert, got: !!s.mission.treasure}));
        if (!info[info.length - 1]?.done || info.some(x => x.alert)) continue;
        const p = info.findIndex(x => x.got), exit = info.length - 1; if (p < 64) continue;
        // approach (1×) · pickup (½× slow motion) · carry (1×) · run for the exit (2×)
        const fastFrom = Math.max(p + 48, exit - 118);
        const ranges = [{from: p - 64, to: p - 16, step: 2}, {from: p - 16, to: p + 14, step: 1}, {from: p + 14, to: p + 48, step: 2}, {from: fastFrom, to: exit + 1, step: 4}];
        process.stderr.write(`heist: ${id} ${st} r${route} d${delay}, pickup ${p}, exit ${exit}\n`);
        return {...clip(def, record(run, ranges)), pick: 24 + 16, fast: 24 + 30 + 17};
      } }
    throw Error('no clean heist run');
  }

  process.stderr.write('simulating clips…\n');
  const B = (n: number) => n * BEAT, F = (sec: number) => Math.ceil(sec * FPS) + 1;
  const MONTAGE = [['02-02', 'GALLERY', '미술관', 2], ['03-03', 'BANK', '은행', 2], ['04-03', 'LAB', '연구소', 2], ['05-02', 'CASINO', '카지노', 2],
    ['06-02', 'MANSION', '저택', 1], ['07-03', 'WAREHOUSE', '창고', 1], ['08-03', 'SECURITY HQ', '보안 본부', 1], ['09-02', 'BLACK SITE', '비밀 시설', 1]] as const;
  const tilt = windowClip(['01-02', '01-03', '01-04'], SCORE.tilt, F(B(8)) * 2, 2, 0.9, 'tilt');
  const montage = MONTAGE.map(([id, , , beats]) => windowClip([id], SCORE.montage, F(B(beats)) * 2, 2, 0.45, `montage ${id}`));
  const breath = windowClip(['02-03', '01-04', '03-02', '06-03', '07-02', '01-03'], SCORE.breath, F(B(5)), 1, 0.75, 'breath');
  const chase = chaseClip('03-04', '03-04-g1', 2.5, 'G', 12, F(B(10)) + 6);
  const heist = heistClip(['09-02', '05-05', '06-05', '01-05']);

  // ---------------------------------------------------------------- intro art (the app's Spotlight Freeze intro)
  const LW = 360, LH = 640, LS = W / LW, L = openingLayout(LW, LH, {top: 0, bottom: 0, left: 0, right: 0});
  const op = 'assets/branding/opening/';
  const sceneImages = {bg: decode(op + 'bg_museum.png'), thiefPeek: decode(op + 'thief_peek.png'), thiefSneak: decode(op + 'thief_sneak.png'), thiefFreeze: decode(op + 'thief_freeze.png'),
    guardAway: decode(op + 'guard_away.png'), guardTurn: decode(op + 'guard_turn.png'), column: decode(op + 'fg_column_left.png')};
  const thiefFocus = {x: L.thief.finalX * LS, y: (L.thief.ground - L.thief.size.h * 0.42) * LS};
  function drawIntro(cv2: Canvas, ms: number, zoom: number, sat: number) {
    const rec = Skia.PictureRecorder(), sc = rec.beginRecording(Skia.XYWHRect(0, 0, LW, LH));
    drawMuseumScene(skiaSceneGfx(sc, sceneImages), L, introFrame(ms)); const pic = rec.finishRecordingAsPicture();
    const g = sat < 0.999 ? ck.ColorFilter.MakeMatrix(gradeMatrix(sat, 1 + (1 - sat) * 0.25, [0.94, 1, 1.08], -0.02 * (1 - sat))) : null;
    if (g) { const gp = new ck.Paint(); gp.setColorFilter(g); cv2.saveLayer(gp); gp.delete(); }
    cv2.save(); cv2.translate(thiefFocus.x, thiefFocus.y); cv2.scale(zoom, zoom); cv2.translate(-thiefFocus.x, -thiefFocus.y);
    cv2.scale(LS, LS); cv2.drawPicture(pic.ref); cv2.restore(); pic.dispose();
    if (g) { cv2.restore(); g.delete(); }
  }
  const endBg = ck.MakeImageFromEncoded(fs.readFileSync(op + 'bg_museum.png'))!;

  // ---------------------------------------------------------------- shared shot furniture
  function logo(cv2: Canvas, cx: number, cy: number, size: number, k: number, underline: number) {
    if (k <= 0) return;
    cv2.save(); cv2.translate(cx, cy); cv2.rotate(-6, 0, 0);
    text(cv2, "DON'T", {x: 0, y: -size * 1.02, size, fam: EN, weight: 900, italic: true, alpha: k, spacing: -2});
    text(cv2, 'MOVE', {x: 0, y: -size * 0.1, size, fam: EN, weight: 900, italic: true, alpha: k, spacing: -2});
    if (underline > 0) { const p = paint(CYAN, k); cv2.drawRRect(ck.RRectXY(ck.XYWHRect(-size * 0.85, size * 1.0, size * 1.7 * underline, size * 0.05), 6, 6), p); p.delete(); }
    cv2.restore();
  }
  function glow(cv2: Canvas, x: number, y: number, r: number, rgb: number[], a: number) {
    const p = new ck.Paint(); p.setShader(ck.Shader.MakeRadialGradient([x, y], r, [col(rgb, a), col(rgb, 0)], null, ck.TileMode.Clamp)); cv2.drawRect(ck.XYWHRect(0, 0, W, H), p); p.delete();
  }
  function flash(cv2: Canvas, t: number, len = 0.12, a = 0.85, rgb = [255, 255, 255]) { if (t < len) fill(cv2, rgb, a * (1 - t / len)); }
  const punchIn = (t: number, amt = 0.12, len = 0.3) => amt * (1 - ease(t, 0, len));

  // ---------------------------------------------------------------- timeline
  type Shot = {name: string; dur: number; draw: (cv2: Canvas, t: number, f: number) => void};
  const shots: Shot[] = [], cues: {at: number; sfx: string; gain?: number}[] = [], hits: {at: number; amp: number; dur: number}[] = [];
  let clock = 0; const add = (s: Shot) => { shots.push(s); const start = clock; clock += s.dur; return start; };
  const cue = (sfx: string, t: number, gain = 1) => cues.push({at: t, sfx, gain});

  // 1. HOOK (0–2.5 s) — the intro's own beat: mid-sneak, the guard turns. Freeze, drain the colour, "움직이지 마."
  const SNEAK = 1450, TURN = GUARD_TURN_MS + 60, HOLD = 1.05;
  const tTurn = (TURN - SNEAK) / 1000 / 1.15, tGo = tTurn + HOLD, diveMs = FREEZE_MS - TURN;
  add({name: 'hook', dur: HOOK, draw: (cv2, t) => {
    const ms = t < tTurn ? SNEAK + t * 1000 * 1.15 : t < tGo ? TURN : Math.min(FREEZE_MS, TURN + (t - tGo) / (HOOK - tGo) * diveMs);
    const z = t < tTurn ? 1 + t * 0.02 : t < tGo ? 1.02 + 0.38 * ease(t, tTurn, tTurn + 0.7) : 1.4 - 0.28 * ease(t, tGo, tGo + 0.3);
    const sat = t < tTurn ? 1 : t < tGo ? 1 - 0.8 * ease(t, tTurn, tTurn + 0.18) : 0.2 + 0.5 * ease(t, tGo, HOOK);
    drawIntro(cv2, ms, z, sat);
    if (t >= tTurn && t < tTurn + 0.1) fill(cv2, [255, 255, 255], 0.5 * (1 - (t - tTurn) / 0.1));
    text(cv2, T.hookTop, {y: 300, size: 54, weight: 700, alpha: ease(t, 0.05, 0.25) * (1 - ease(t, tTurn - 0.1, tTurn))});
    slam(cv2, t, tTurn + 0.12, HOOK, T.hook1, {y: isEn ? 1230 : 1360, ...big(168, isEn ? {size: 260} : {})});
    if (T.hook2) slam(cv2, t, tTurn + 0.5, HOOK, T.hook2, {y: 1560, ...big(168), color: [255, 236, 230]});
  }});
  cue('heartbeat', tTurn + 0.12, 1.2); cue('heartbeat', tTurn + 0.5, 1.2); cue('heartbeat', tTurn + 0.88, 1); cue('riser', HOOK - 1.25, 0.9);

  // 2. LOGO (3 beats) — impact on the downbeat where the chase groove starts
  const tLogo = add({name: 'logo', dur: B(3), draw: (cv2, t) => {
    cv2.clear(col(NAVY)); glow(cv2, W / 2, H * 0.45, 900, CYAN, 0.16 * ease(t, 0, 0.3));
    const pop = outBack(clamp01(t / 0.24)), size = 250 * (1.5 - 0.5 * pop);
    logo(cv2, W / 2, H * 0.42, size, clamp01(t / 0.05), ease(t, 0.12, 0.4));
    slam(cv2, t, B(1), 9, T.tagline, isEn ? {y: H * 0.6, size: 64, fam: EN, weight: 800, spacing: 4} : {y: H * 0.6, size: 70, weight: 800, spacing: 2});
    flash(cv2, t, 0.14, 0.95);
  }});
  cue('impact', tLogo, 1.15); cue('whistle-theft', tLogo + 0.02, 0.55); hits.push({at: tLogo, amp: 26, dur: 0.38});

  // 3. TILT (8 beats) — the game in a phone that leans the way the thief moves
  const tiltBlur = ck.ImageFilter.MakeBlur(36, 36, ck.TileMode.Clamp, null);
  const tiltAngle = tilt.frames.map((_, k) => { const a = tilt.frames[Math.max(0, k - 2)], b = tilt.frames[Math.min(tilt.frames.length - 1, k + 2)]; return {vx: (b.player.x - a.player.x) / 4 * FPS, vy: (b.player.y - a.player.y) / 4 * FPS}; });
  const tiltSmooth: {rx: number; ry: number}[] = []; { let rx = 0, ry = 0; for (const v of tiltAngle) { rx += (Math.max(-1, Math.min(1, v.vx / 150)) - rx) * 0.18; ry += (Math.max(-1, Math.min(1, v.vy / 150)) - ry) * 0.18; tiltSmooth.push({rx, ry}); } }
  const tTilt = add({name: 'tilt', dur: B(8), draw: (cv2, t, f) => {
    off.clear(col(BLACK)); drawGame(off, tilt, f, GRADE.cool); const shot = offSurface.makeImageSnapshot();
    const bp = new ck.Paint(); bp.setImageFilter(tiltBlur); bp.setAlphaf(0.55);
    cv2.clear(col(NAVY)); cv2.drawImageRectOptions(shot, ck.XYWHRect(0, 0, W, H), ck.XYWHRect(-60, -100, W + 120, H + 200), ck.FilterMode.Linear, ck.MipmapMode.None, bp); bp.delete();
    fill(cv2, NAVY, 0.45); glow(cv2, W / 2, H * 0.6, 700, CYAN, 0.12);
    const {rx, ry} = tiltSmooth[Math.min(f, tiltSmooth.length - 1)], pw = 600, ph = 1066, cx = W / 2, cy = 1130;
    const intro = 1 - ease(t, 0, 0.35);
    cv2.save(); cv2.translate(cx, cy + intro * 260); cv2.rotate(rx * 11, 0, 0); cv2.scale(1 - Math.abs(ry) * 0.02, 1 - ry * 0.035);
    const body = paint([12, 18, 24], 1), rim = new ck.Paint(); rim.setStyle(ck.PaintStyle.Stroke); rim.setStrokeWidth(5); rim.setColor(col([90, 110, 125], 1)); rim.setAntiAlias(true);
    const bodyR = ck.RRectXY(ck.XYWHRect(-pw / 2 - 26, -ph / 2 - 26, pw + 52, ph + 52), 78, 78);
    const shade = new ck.Paint(); shade.setColor(ck.Color(0, 0, 0, 0.55)); shade.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, 40, true));
    cv2.save(); cv2.translate(0, 40); cv2.drawRRect(bodyR, shade); cv2.restore(); shade.delete();
    cv2.drawRRect(bodyR, body); cv2.drawRRect(bodyR, rim); body.delete(); rim.delete();
    cv2.save(); cv2.clipRRect(ck.RRectXY(ck.XYWHRect(-pw / 2, -ph / 2, pw, ph), 54, 54), ck.ClipOp.Intersect, true);
    cv2.drawImageRectOptions(shot, ck.XYWHRect(0, 0, W, H), ck.XYWHRect(-pw / 2, -ph / 2, pw, ph), ck.FilterMode.Linear, ck.MipmapMode.None, null);
    cv2.restore(); const isl = paint(BLACK, 1); cv2.drawRRect(ck.RRectXY(ck.XYWHRect(-70, -ph / 2 + 18, 140, 36), 18, 18), isl); isl.delete();
    cv2.restore(); shot.delete();
    text(cv2, T.tiltLabel, {y: 250, size: 40, fam: EN, weight: 700, spacing: 12, color: CYAN, alpha: ease(t, 0.1, 0.3)});
    slam(cv2, t, 0.12, 9, T.tilt, {y: 312, ...big(88, isEn ? {size: 120} : {})});
    flash(cv2, t, 0.1, 0.5);
  }});
  for (let i = 0; i < 4; i++) cue('whoosh', tTilt + B(2 * i + 1) - 0.05, 0.35);

  // 4. MONTAGE (12 beats) — eight chapters, each cut on the beat with a punch-in and its name slammed over
  MONTAGE.forEach(([, en, , beats], i) => {
    const cl = montage[i], idx = i + 2, low = band(cl, 0, cl.frames.length, isEn ? 1260 : 1420, 740);
    const t0 = add({name: `montage ${en}`, dur: B(beats), draw: (cv2, t, f) => {
      drawGame(cv2, cl, f, GRADE.cool, punchIn(t, beats === 2 ? 0.14 : 0.1, beats === 2 ? 0.35 : 0.2));
      const shade = new ck.Paint(); shade.setShader(ck.Shader.MakeLinearGradient([0, 200], [0, 720], [ck.Color(0, 0, 0, 0.55), ck.Color(0, 0, 0, 0)], null, ck.TileMode.Clamp));
      cv2.drawRect(ck.XYWHRect(0, 0, W, 720), shade); shade.delete();
      text(cv2, T.chapter(idx), {y: 300, size: 36, fam: EN, weight: 700, spacing: 8, color: CYAN, alpha: clamp01(t / 0.06)});
      slam(cv2, t, 0, 9, en, {y: 350, size: 200, fam: EN, weight: 900, italic: true, fit: 980, spacing: -2});
      if (i >= 4) slam(cv2, t, 0, 9, i < 6 ? T.chapters : T.missions, {y: low, ...big(96)});
      flash(cv2, t, 0.07, 0.6);
    }});
    cue('whoosh', t0 - 0.06, beats === 2 ? 0.5 : 0.35);
  });

  // 5. BREATH (5 beats) — slow motion, colour drained: a guard passes right by
  const breathY = band(breath, 0, breath.frames.length, LOW, 520);
  const tBreath = add({name: 'breath', dur: B(5), draw: (cv2, t, f) => {
    const s = screenOf(breath, Math.min(f, breath.frames.length - 1));
    drawGame(cv2, breath, f, GRADE.breath, 0.3 + 0.25 * ease(t, 0, B(5)), s);
    fill(cv2, NAVY, 0.12);
    text(cv2, T.breathLabel, {y: breathY - 66, size: 38, fam: EN, weight: 700, spacing: 12, color: CYAN, alpha: ease(t, 0.1, 0.3)});
    slam(cv2, t, 0.1, B(5), T.breath, {y: breathY, ...big(150)});
  }});
  cue('heartbeat', tBreath + 0.08, 1.3); cue('heartbeat', tBreath + B(2) + 0.08, 1.2); cue('heartbeat', tBreath + B(4) + 0.08, 1.1); cue('riser', tBreath + B(5) - 0.9, 0.7);

  // 6. SPOTTED (2 beats) — freeze on the moment of detection; glitch, red, whistle
  const kSpot = chase.spot + 3, spotPos = screenOf(chase, kSpot), spotY = spotPos.y > H * 0.55 ? HIGH : LOW - 40;
  const tSpot = add({name: 'spotted', dur: B(2), draw: (cv2, t) => {
    const shake = (1 - clamp01(t / 0.45)) * 16;
    cv2.save(); cv2.translate(Math.sin(t * 93) * shake, Math.cos(t * 71) * shake);
    drawGame(cv2, chase, kSpot, GRADE.alarm, 0.08 + 0.12 * ease(t, 0, 0.3), spotPos); cv2.restore();
    fill(cv2, RED, 0.42 * (1 - ease(t, 0.05, 0.6)));
    text(cv2, 'SPOTTED', {y: spotY - 70, size: 44, fam: EN, weight: 800, spacing: 16, color: RED, alpha: clamp01(t / 0.05)});
    slam(cv2, t, 0, 9, T.spotted, {y: spotY, ...big(210), color: [255, 238, 232]});
  }});
  cue('impact', tSpot, 0.8); cue('whistle-spotted', tSpot + 0.01, 1.2); cue('glitch', tSpot, 0.7); hits.push({at: tSpot, amp: 30, dur: 0.5});

  // 7. CHASE (10 beats) — red until the line of sight breaks, then cold while the guard searches
  const chaseFrom = kSpot + 1, chaseLen = Math.min(chase.frames.length - chaseFrom, F(B(10)));
  let hide = -1; for (let k = chaseFrom + 12; k < chaseFrom + chaseLen - 8 && hide < 0; k++) if ([0, 2, 4, 6, 8].every(d => !chase.frames[k + d].guards.some((g: any) => g.canSee))) hide = k;
  const tHide = hide > 0 ? (hide - chaseFrom) / FPS : B(5), runY = band(chase, chaseFrom, chaseFrom + 30), hideY = band(chase, chaseFrom + Math.round(tHide * FPS), chaseFrom + chaseLen);
  const tChase = add({name: 'chase', dur: B(10), draw: (cv2, t, f) => {
    const k = chaseFrom + Math.min(f, chaseLen - 1), hidden = t >= tHide, s = screenOf(chase, k);
    const shake = hidden ? 0 : 5; cv2.save(); cv2.translate(Math.sin(t * 41) * shake, Math.cos(t * 37) * shake);
    drawGame(cv2, chase, k, hidden ? GRADE.cool : GRADE.alarm, hidden ? 0.03 : 0.07, s); cv2.restore();
    if (!hidden) fill(cv2, RED, 0.08 + 0.06 * Math.max(0, Math.sin(t / BEAT * Math.PI)));
    if (hidden && t - tHide < 0.12) fill(cv2, CYAN, 0.3 * (1 - (t - tHide) / 0.12));
    text(cv2, hidden ? 'BREAK LINE OF SIGHT' : T.runLabel, {y: (hidden ? hideY : runY) - 66, size: 38, fam: EN, weight: 700, spacing: 12, color: hidden ? CYAN : RED,
      alpha: hidden ? ease(t, tHide, tHide + 0.15) : ease(t, 0.05, 0.2)});
    slam(cv2, t, 0.05, tHide, T.run, {y: runY, ...big(170)});
    slam(cv2, t, tHide, B(10), T.hide, {y: hideY, ...big(170)});
  }});
  cue('whoosh', tChase + tHide - 0.08, 0.6);

  // 8. HEIST (8 beats) — the grab in slow motion, then a 2× dash for the exit
  const takeY = band(heist, heist.pick - 16, heist.pick + 20), outY = band(heist, heist.fast, heist.frames.length);
  const tHeist = add({name: 'heist', dur: B(8), draw: (cv2, t, f) => {
    const k = Math.min(f, heist.frames.length - 1), s = screenOf(heist, k), slow = f >= heist.pick - 16 && f < heist.pick + 14;
    drawGame(cv2, heist, k, GRADE.cool, slow ? 0.12 * ease(f, heist.pick - 16, heist.pick) : f >= heist.fast ? punchIn((f - heist.fast) / FPS, 0.1, 0.25) : 0.02, s);
    const dp = (f - heist.pick) / FPS; if (dp >= 0 && dp < 0.25) { glow(cv2, s.x, s.y, 520, CYAN, 0.5 * (1 - dp / 0.25)); fill(cv2, [255, 255, 255], 0.35 * (1 - dp / 0.25)); }
    if (f >= heist.fast && f < heist.fast + 3) fill(cv2, [255, 255, 255], 0.5);
    const tp = heist.pick / FPS, tf = heist.fast / FPS;
    text(cv2, T.takeLabel, {y: takeY - 66, size: 38, fam: EN, weight: 700, spacing: 12, color: CYAN, alpha: ease(t, tp - 0.05, tp + 0.1) * (1 - ease(t, tf - 0.15, tf))});
    slam(cv2, t, tp, tf, T.take, {y: takeY, ...big(160)});
    text(cv2, T.outLabel, {y: outY - 66, size: 38, fam: EN, weight: 700, spacing: 12, color: CYAN, alpha: ease(t, tf, tf + 0.15)});
    slam(cv2, t, tf, B(8), T.out, {y: outY, ...big(160)});
  }});
  cue('objective-pickup', tHeist + heist.pick / FPS, 1.5); cue('whoosh', tHeist + heist.fast / FPS - 0.06, 0.6);

  // 9. END CARD (9 beats)
  const tEnd = add({name: 'end', dur: B(9), draw: (cv2, t) => {
    cv2.clear(col(NAVY));
    const bw = W * 1.1 * (1 + t * 0.015), bh = bw * endBg.height() / endBg.width(), p0 = new ck.Paint(); p0.setAlphaf(0.5 * ease(t, 0, 0.5));
    cv2.drawImageRectOptions(endBg, ck.XYWHRect(0, 0, endBg.width(), endBg.height()), ck.XYWHRect((W - bw) / 2, H * 0.52 - bh * 0.54, bw, bh), ck.FilterMode.Linear, ck.MipmapMode.None, p0); p0.delete();
    fill(cv2, NAVY, 0.35); glow(cv2, W / 2, 560, 700, CYAN, 0.1);
    const pop = outBack(clamp01(t / 0.24));
    logo(cv2, W / 2, 560, 210 * (1.4 - 0.4 * pop), clamp01(t / 0.05), ease(t, 0.15, 0.45));
    text(cv2, T.end1, isEn ? {y: 880, size: 44, fam: EN, weight: 700, spacing: 6, alpha: ease(t, B(2), B(2) + 0.25)} : {y: 880, size: 50, weight: 700, alpha: ease(t, B(2), B(2) + 0.25)});
    if (T.end2) text(cv2, T.end2, {y: 950, size: 32, fam: EN, weight: 700, spacing: 8, color: GREY, alpha: ease(t, B(2) + 0.1, B(2) + 0.35)});
    text(cv2, T.play, {y: isEn ? 1130 : 1330, size: 56, weight: 800, fam: isEn ? EN : KO, spacing: isEn ? 6 : 0, alpha: ease(t, B(4), B(4) + 0.2)});
    slam(cv2, t, B(4), 99, 'NOW AVAILABLE', {y: isEn ? 1210 : 1410, size: 130, fam: EN, weight: 900, italic: true, color: CYAN, fit: 980});
    text(cv2, 'App Store  ·  Google Play', {y: isEn ? 1390 : 1590, size: 46, fam: EN, weight: 700, spacing: 6, alpha: ease(t, B(5), B(5) + 0.25)});
    flash(cv2, t, 0.14, 0.9); fill(cv2, BLACK, ease(t, B(9) - 0.55, B(9)));
  }});
  cue('impact', tEnd, 1.1); cue('impact', tEnd + B(4), 0.6); hits.push({at: tEnd, amp: 22, dur: 0.3}); hits.push({at: tEnd + B(4), amp: 12, dur: 0.2});
  const total = clock;
  process.stderr.write(`timeline ${total.toFixed(2)} s: ${shots.map(s => `${s.name} ${s.dur.toFixed(2)}`).join(' | ')}\n`);

  // ---------------------------------------------------------------- render
  const frameCount = Math.round(total * FPS);
  const starts = shots.reduce<number[]>((a, s, i) => (a.push(i ? a[i - 1] + shots[i - 1].dur : 0), a), []);
  function renderFrame(f: number) {
    const t = f / FPS; let i = shots.length - 1; while (i > 0 && t < starts[i] - 1e-9) i--;
    const local = t - starts[i]; cv.clear(col(BLACK)); cv.save(); shots[i].draw(cv, local, Math.round(local * FPS)); cv.restore();
    for (const h of hits) if (t >= h.at && t < h.at + h.dur) glitch(h.amp * (1 - (t - h.at) / h.dur), f);
    grainPass(f); surface.flush();
  }
  if (stills) {
    fs.mkdirSync(stills, {recursive: true});
    const times = at ? at.split(',').map(Number) : shots.map((s, i) => starts[i] + s.dur * 0.6);
    for (const tt of times) { const f = Math.min(frameCount - 1, Math.round(tt * FPS)); renderFrame(f);
      const img = surface.makeImageSnapshot(); fs.writeFileSync(path.join(stills, `t${tt.toFixed(2)}.png`), img.encodeToBytes()!); img.delete(); }
    process.stderr.write(`stills in ${stills}\n`); return;
  }
  if (splice) {
    // --splice <earlier.mp4> [--redo <shot>]: re-render one shot (default: the end card) into an earlier render of the
    // same timeline, keeping that render's other frames and its sound
    const si = shots.findIndex(x => x.name === redo); if (si < 0) throw Error(`no shot ${redo}`);
    const from = Math.round(starts[si] * FPS), to = si === shots.length - 1 ? frameCount : Math.round(starts[si + 1] * FPS);
    const tail = out!.replace(/\.mp4$/, '') + '.part.mp4';
    const fft = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', tail], {stdio: ['pipe', 'inherit', 'inherit']});
    for (let f = from; f < to; f++) { renderFrame(f);
      const px = cv.readPixels(0, 0, {width: W, height: H, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB})!;
      if (!fft.stdin!.write(Buffer.from(px.buffer, px.byteOffset, px.byteLength))) await new Promise(r => fft.stdin!.once('drain', r)); }
    fft.stdin!.end(); await new Promise(r => fft.on('close', r));
    const r2 = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', splice, '-i', tail, '-filter_complex',
      `[0:v]split[v0][v1];[v0]trim=end_frame=${from},setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];` +
      `[v1]trim=start_frame=${to},setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0[v]`,
      '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', out!], {stdio: 'inherit'});
    if (r2.status !== 0) throw Error('splice failed');
    fs.unlinkSync(tail); process.stderr.write(`wrote ${out} (${redo} re-rendered, frames ${from}–${to})\n`); return;
  }
  const tmpVideo = out!.replace(/\.mp4$/, '') + '.video.mp4';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmpVideo], {stdio: ['pipe', 'inherit', 'inherit']});
  for (let f = 0; f < frameCount; f++) {
    renderFrame(f);
    const px = cv.readPixels(0, 0, {width: W, height: H, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB})!;
    if (!ff.stdin!.write(Buffer.from(px.buffer, px.byteOffset, px.byteLength))) await new Promise(r => ff.stdin!.once('drain', r));
    if (f % 100 === 0) process.stderr.write(`frame ${f}/${frameCount}\n`);
  }
  ff.stdin!.end(); await new Promise(r => ff.on('close', r));

  // ---------------------------------------------------------------- sound: CC0 music + game SFX + synthesised hits
  const tmp = path.join(path.dirname(out!), '.promo-sfx'); fs.mkdirSync(tmp, {recursive: true});
  const SYNTH: Record<string, [number, string, string]> = {
    heartbeat: [0.6, '0.95*sin(2*PI*52*t)*exp(-t*20)+0.75*sin(2*PI*46*(t-0.17))*exp(-(t-0.17)*20)*gte(t,0.17)', 'lowpass=f=140,volume=2.2'],
    impact: [1.8, 'sin(2*PI*(36*t+(70/14)*(1-exp(-t*14))))*exp(-t*2.8)+0.4*(random(0)*2-1)*exp(-t*16)', 'lowpass=f=2600,volume=1.4'],
    riser: [1.3, '(random(0)*2-1)*pow(t/1.3,2.6)*0.7+0.25*sin(2*PI*(180*t+260*t*t))*pow(t/1.3,2)', 'highpass=f=500,afade=t=out:st=1.27:d=0.03'],
    whoosh: [0.32, '(random(0)*2-1)*sin(PI*t/0.32)^2', 'bandpass=f=1400:width_type=o:w=1.6,volume=1.6'],
    glitch: [0.24, '0.35*sgn(sin(2*PI*170*t))*mod(floor(t*46),2)*exp(-t*6)+0.2*(random(0)*2-1)*mod(floor(t*31),2)', 'volume=1'],
  };
  for (const [name, [d, expr, af]] of Object.entries(SYNTH)) {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `aevalsrc='${expr}':s=48000:d=${d}`, '-af', af, '-ac', '2', path.join(tmp, `${name}.wav`)]);
    if (r.status !== 0) throw Error(`synth ${name}: ${r.stderr}`);
  }
  const A = 'assets/audio/', src = (sfx: string) => SYNTH[sfx] ? path.join(tmp, `${sfx}.wav`) : `${A}sfx/${sfx}.wav`;
  const ms = (s: number) => Math.max(0, Math.round(s * 1000));
  const inputs = ['-i', tmpVideo, '-i', A + 'bgm/stealth.mp3', '-ss', String(MUSIC_AT), '-i', A + 'bgm/chase.mp3', ...cues.flatMap(q => ['-i', src(q.sfx)])];
  const bEnd = tBreath + B(5);
  const filter = [
    `[1:a]atrim=0:${HOOK + 0.05},afade=t=in:d=0.4,afade=t=out:st=${HOOK - 0.3}:d=0.3,volume=0.75,aformat=channel_layouts=stereo[m1]`,
    `[2:a]atrim=0:${(total - HOOK + 0.1).toFixed(3)},adelay=${ms(HOOK)}:all=1,` +
      `lowpass=f=420:enable='between(t,${tBreath.toFixed(3)},${bEnd.toFixed(3)})',volume=0.45:enable='between(t,${tBreath.toFixed(3)},${bEnd.toFixed(3)})',` +
      `afade=t=out:st=${(total - 1.6).toFixed(3)}:d=1.6,aformat=channel_layouts=stereo[m2]`,
    ...cues.map((q, i) => `[${3 + i}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms(q.at)}:all=1,volume=${q.gain ?? 1}[s${i}]`),
    `[m1][m2]${cues.map((_, i) => `[s${i}]`).join('')}amix=inputs=${2 + cues.length}:normalize=0,atrim=0:${total.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
  ].join(';');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out!], {stdio: 'inherit'});
  if (r.status !== 0) throw Error('audio mux failed');
  fs.unlinkSync(tmpVideo); fs.rmSync(tmp, {recursive: true, force: true});
  process.stderr.write(`wrote ${out} (${total.toFixed(1)} s)\n`);
}
void main();
