import { Skia } from '@shopify/react-native-skia';
import { tiltVisualGait } from '../game/input/tiltMovement';
import type { SkCanvas, SkPaint, SkPath, SkPicture, SkRect } from '@shopify/react-native-skia';

import { Awareness, GuardAction } from '../game/core/types';
import type { PlaygroundState } from '../game/playground/playgroundState';
import { drawCharacterVisual } from './characters/characterVisual';
import type { CharacterVisual } from './characters/characterVisual';
import { drawGlobalAlertDebug, drawGuardDebug } from './debug/guardDebug';
import type { DebugArt } from './debug/guardDebug';
import { drawAlert, drawSearch, drawSuspicion, drawWhistleLines } from './effects/alertIcons';
import type { IconArt } from './effects/alertIcons';
import type { LightFx } from './effects/lightFx';
import { buildConePath, drawConeEdge, drawConePass } from './effects/visionCone';
import type { ConeArt } from './effects/visionCone';
import type { StageArt } from './environment/buildStageArt';
import { drawSpriteFrame } from './sprites/spriteAnimation';
import type { SpriteFrame } from './sprites/spriteTypes';

const MAX_GUARDS = 8;

/** Everything the frame worklet needs; built once on the JS thread. */
export interface RenderResources {
  stage: StageArt;
  player: CharacterVisual;
  guard: CharacterVisual;
  cone: ConeArt;
  icons: IconArt;
  fx: LightFx;
  /** Objective gem sprite (atlas frame 'diamond'); null → glow only. */
  diamond: SpriteFrame | null;
  diamondPos: { x: number; y: number };
  exit: SkRect;
  debug: DebugArt;
  vignette: SkPaint;
  screen: SkRect;
  zoom: number;
  showObjective?: boolean;
  testGoal?: {x:number;y:number;radius:number};
}

interface FrameScratch {
  paths: (SkPath | null)[];
  order: number[];
  keys: number[];
}

declare const globalThis: { __dmFrame?: FrameScratch };

function frameScratch(): FrameScratch {
  'worklet';
  let f = globalThis.__dmFrame;
  if (f === undefined) {
    f = {
      paths: new Array(MAX_GUARDS).fill(null),
      order: new Array(MAX_GUARDS + 2).fill(0),
      keys: new Array(MAX_GUARDS + 2).fill(0),
    };
    globalThis.__dmFrame = f;
  }
  return f;
}

// Entity ids in the painter's sort: 0 = player, 1 = diamond, 2+i = guard i.
function drawEntity(c: SkCanvas, id: number, s: PlaygroundState, r: RenderResources): void {
  'worklet';
  if (id === 0) {
    const p = s.player;
    drawCharacterVisual(c, r.player, p.x, p.y, p.facing, tiltVisualGait(p.speed), p.spritePhase, p.dist, s.t, GuardAction.None, 0, true);
  } else if (id === 1) {
    const gem = r.diamond;
    if (gem !== null && r.showObjective !== false && !s.mission.treasure) {
      const bob = Math.sin(s.t * 2.2) * 2;
      drawSpriteFrame(c, gem, r.diamondPos.x, r.diamondPos.y - 28 + bob, 24 / gem.sw, false, r.fx.white);
    }
  } else {
    const g = s.guards[id - 2];
    drawCharacterVisual(c, r.guard, g.x, g.y, g.facing, g.gait, g.phase, g.dist, s.t, g.action, g.actionT);
  }
}

function entityY(id: number, s: PlaygroundState, r: RenderResources): number {
  'worklet';
  if (id === 0) return s.player.y;
  if (id === 1) return r.diamondPos.y + 0.25;
  return s.guards[id - 2].y;
}

/**
 * Records one frame. Order:
 *  floor → cone tint + edge → y-sorted walls/props/characters → darkness layer
 *  (light holes, incl. the cones) → light glow → head icons → vignette
 * Cones stay under characters so a guard is never painted over by his own cone.
 */
export function renderPlaygroundFrame(s: PlaygroundState, r: RenderResources, debug: boolean): SkPicture {
  'worklet';
  const fs = frameScratch();
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(r.screen);
  const guards = s.guards;
  const ng = Math.min(guards.length, MAX_GUARDS);

  c.save();
  c.scale(r.zoom, r.zoom);
  c.translate(-s.cam.x, -s.cam.y);

  c.drawPicture(r.stage.floor);

  if (s.mission.enabled) {
    c.drawRect(r.exit, s.mission.treasure ? r.fx.exitActive : r.fx.exitInactive);
    if (s.mission.treasure) c.drawRect(r.exit, r.fx.exitEdge);
  }

  // Vision cones: the exact polygon the guard's detection used this frame
  // (built in the simulation from the guard's own facing/range/angle).
  for (let i = 0; i < ng; i++) {
    const g = guards[i];
    const path = buildConePath(r.cone, g.fan, g.fanCount, g.x, g.y, g.visionRange);
    fs.paths[i] = path;
    drawConePass(c, path, r.cone.floor[g.awareness], g.x, g.y, g.visionRange);
    drawConeEdge(c, r.cone, path, g.awareness, g.x, g.y, g.visionRange);
  }

  // Painter's sort of dynamic entities (insertion sort, no allocation).
  const n = ng + 2;
  for (let i = 0; i < n; i++) {
    fs.order[i] = i;
    fs.keys[i] = entityY(i, s, r);
  }
  for (let i = 1; i < n; i++) {
    const id = fs.order[i];
    const k = fs.keys[i];
    let j = i - 1;
    while (j >= 0 && fs.keys[j] > k) {
      fs.order[j + 1] = fs.order[j];
      fs.keys[j + 1] = fs.keys[j];
      j--;
    }
    fs.order[j + 1] = id;
    fs.keys[j + 1] = k;
  }
  const layers = r.stage.layers;
  let li = 0;
  for (let i = 0; i < n; i++) {
    const y = fs.keys[i];
    while (li < layers.length && layers[li].sortY <= y) {
      c.drawPicture(layers[li].picture);
      li++;
    }
    drawEntity(c, fs.order[i], s, r);
  }
  while (li < layers.length) {
    c.drawPicture(layers[li].picture);
    li++;
  }

  // Darkness with light holes.
  c.saveLayer();
  c.drawPicture(r.stage.darkness);
  for (let i = 0; i < ng; i++) {
    const g = guards[i];
    drawConePass(c, fs.paths[i]!, r.cone.hole[g.awareness], g.x, g.y, g.visionRange);
    c.save();
    c.translate(g.x, g.y - 18);
    c.scale(36, 36);
    c.drawCircle(0, 0, 1, r.fx.hole);
    c.restore();
  }
  c.save();
  c.translate(s.player.x, s.player.y - 18);
  c.scale(46, 46);
  c.drawCircle(0, 0, 1, r.fx.hole);
  c.restore();
  c.restore();

  c.drawPicture(r.stage.glow);

  // Diamond glow + sparkles.
  if (r.showObjective !== false && !s.mission.treasure) {
  const dp = r.diamondPos;
  const pulse = 1 + Math.sin(s.t * 2.2) * 0.08;
  c.save();
  c.translate(dp.x, dp.y - 40);
  c.save();
  c.scale(46 * pulse, 40 * pulse);
  c.drawCircle(0, 0, 1, r.fx.diamondGlow);
  c.restore();
  c.save();
  c.scale(16, 14);
  c.drawCircle(0, 0, 1, r.fx.diamondCore);
  c.restore();
  for (let i = 0; i < 3; i++) {
    const a = s.t * 0.9 + i * 2.1;
    const k = (Math.sin(s.t * 3 + i * 1.7) + 1) * 0.5;
    const sx = Math.cos(a) * 16;
    const sy = Math.sin(a) * 9 - 4;
    const len = 1.5 + k * 3;
    c.drawLine(sx - len, sy, sx + len, sy, r.fx.sparkle);
    c.drawLine(sx, sy - len, sx, sy + len, r.fx.sparkle);
  }
  c.restore();

  // Head indicators.
  }
  if (r.testGoal) {
    const g = r.testGoal;
    c.drawCircle(g.x,g.y,g.radius,r.fx.sparkle);
    c.drawLine(g.x-10,g.y,g.x+10,g.y,r.fx.sparkle);
    c.drawLine(g.x,g.y-10,g.x,g.y+10,r.fx.sparkle);
  }
  for (let i = 0; i < ng; i++) {
    const g = guards[i];
    const iy = g.y - 66;
    if (!s.events.globalAlert && g.awareness === Awareness.Suspicious) drawSuspicion(c, r.icons, g.x, iy, g.suspicion, s.t);
    else if (g.awareness === Awareness.Alert || g.awareness === Awareness.Chase) drawAlert(c, r.icons, g.x, iy, g.alertAge, s.t);
    else if (g.awareness === Awareness.Search) drawSearch(c, r.icons, g.x, iy + 4, s.t);
    if (g.action === GuardAction.Whistle && g.actionT > 0.32)
      drawWhistleLines(c, r.icons, g.x + 10, g.y - 44, s.t);
  }

  if (debug) {
    for (let i = 0; i < ng; i++) drawGuardDebug(c, r.debug, guards[i], fs.paths[i], s.player.x, s.player.y);
    drawGlobalAlertDebug(c, r.debug, s.events);
  }

  c.restore();
  c.drawRect(r.screen, r.vignette);
  return rec.finishRecordingAsPicture();
}
