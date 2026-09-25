import { PaintStyle } from '@shopify/react-native-skia';
import type { SkCanvas, SkFont, SkPaint, SkPath } from '@shopify/react-native-skia';

import type { GuardEvents, GuardState } from '../../game/guards/guardBrain';
import { fill, stroke } from '../paints';
import { scratch } from '../skiaScratch';

/**
 * Development overlay proving that the drawn cone IS the detection cone.
 *
 *  yellow   geometric limits: visionRange arc + ±visionHalfAngle edges
 *  cyan     the exact polygon detection tests against (same path the red cone uses)
 *  white    facing vector
 *  green/red LOS line to the player centre + the 3 body sample points
 *  orange ×  last known position (only moves while the guard really sees)
 *  text     canSee, samples, LOS, distance, angle, suspicion %, state
 */
export interface DebugArt {
  limits: SkPaint;
  actual: SkPaint;
  facing: SkPaint;
  losOk: SkPaint;
  losBlocked: SkPaint;
  sampleOk: SkPaint;
  sampleBad: SkPaint;
  lkp: SkPaint;
  global: SkPaint;
  textBg: SkPaint;
  text: SkPaint;
  font: SkFont | null;
}

export function createDebugArt(font: SkFont | null): DebugArt {
  const actual = stroke('#3fe0ff', 1.4);
  const textBg = fill('#000000', 0.62);
  textBg.setStyle(PaintStyle.Fill);
  return {
    limits: stroke('#ffd84a', 1, 0.8),
    actual,
    facing: stroke('#ffffff', 2),
    losOk: stroke('#46e38a', 1.2, 0.9),
    losBlocked: stroke('#ff4d4d', 1.2, 0.9),
    sampleOk: fill('#46e38a'),
    sampleBad: fill('#ff4d4d'),
    lkp: stroke('#ff9d2e', 2),
    global: stroke('#ff4dd8', 1.5),
    textBg,
    text: fill('#e8f1ff'),
    font,
  };
}

const STATE_NAMES = ['PATROL', 'SUSPICIOUS', 'ALERT', 'SEARCH', 'CHASE', 'INVESTIGATE', 'RETURN'];

function deg(r: number): number {
  'worklet';
  return Math.round((r * 180) / Math.PI);
}

export function drawGuardDebug(
  c: SkCanvas,
  a: DebugArt,
  g: GuardState,
  conePath: SkPath | null,
  px: number,
  py: number,
): void {
  'worklet';
  // Geometric limits.
  const r = g.visionRange;
  const e0 = g.facing - g.visionHalfAngle;
  const e1 = g.facing + g.visionHalfAngle;
  c.drawLine(g.x, g.y, g.x + Math.cos(e0) * r, g.y + Math.sin(e0) * r, a.limits);
  c.drawLine(g.x, g.y, g.x + Math.cos(e1) * r, g.y + Math.sin(e1) * r, a.limits);
  const rect = scratch().rect;
  rect.x = g.x - r;
  rect.y = g.y - r;
  rect.width = r * 2;
  rect.height = r * 2;
  c.drawArc(rect, (e0 * 180) / Math.PI, (g.visionHalfAngle * 360) / Math.PI, false, a.limits);

  // The exact polygon used for detection (identical to the red cone path).
  if (conePath !== null) {
    c.save();
    c.translate(g.x, g.y);
    c.scale(r, r);
    a.actual.setStrokeWidth(1.4 / r);
    c.drawPath(conePath, a.actual);
    c.restore();
  }

  // Facing vector.
  c.drawLine(g.x, g.y, g.x + Math.cos(g.facing) * 30, g.y + Math.sin(g.facing) * 30, a.facing);
  c.drawCircle(g.x + Math.cos(g.facing) * 30, g.y + Math.sin(g.facing) * 30, 2.5, a.text);

  // LOS + body samples.
  c.drawLine(g.x, g.y, px, py, g.los ? a.losOk : a.losBlocked);
  for (let i = 0; i < 3; i++) {
    c.drawCircle(g.samples[i * 2], g.samples[i * 2 + 1], 2.2, g.sampleSeen[i] ? a.sampleOk : a.sampleBad);
  }

  // Last known position.
  if (g.hasLkp) {
    c.drawLine(g.lkpX - 5, g.lkpY - 5, g.lkpX + 5, g.lkpY + 5, a.lkp);
    c.drawLine(g.lkpX - 5, g.lkpY + 5, g.lkpX + 5, g.lkpY - 5, a.lkp);
  }

  // Readout.
  c.drawLine(g.x, g.y, g.targetX, g.targetY, a.global);
  c.drawCircle(g.targetX, g.targetY, 4, a.global);
  const f = a.font;
  if (f !== null) {
    const x = g.x + 16;
    const y = g.y - 58;
    const tr = scratch().rect;
    tr.x = x - 3;
    tr.y = y - 9;
    tr.width = 136;
    tr.height = 62;
    c.drawRect(tr, a.textBg);
    c.drawText(`${g.canSee ? 'SEE' : '---'} ${g.samplesSeen}/3  LOS ${g.los ? 'Y' : 'N'}`, x, y, a.text, f);
    c.drawText(
      `d ${Math.round(g.distToPlayer)}/${Math.round(r)}  ∠ ${deg(g.angleToPlayer)}°/${deg(g.visionHalfAngle)}°`,
      x,
      y + 11,
      a.text,
      f,
    );
    c.drawText(`${Math.round(g.suspicion * 100)}%  ${STATE_NAMES[g.awareness] ?? '?'}`, x, y + 22, a.text, f);
    c.drawText(`face ${deg(g.facing)}  to ${Math.round(g.targetX)},${Math.round(g.targetY)}`, x, y + 33, a.text, f);
    c.drawText(`LKP ${g.hasLkp ? `${Math.round(g.lkpX)},${Math.round(g.lkpY)}` : '-'}`, x, y + 44, a.text, f);
  }
}

export function drawGlobalAlertDebug(c: SkCanvas, a: DebugArt, ev: GuardEvents): void {
  'worklet';
  if (!ev.globalAlert) return;
  c.drawCircle(ev.globalX, ev.globalY, 14, a.global);
  c.drawCircle(ev.globalX, ev.globalY, 3, a.global);
  if (a.font) c.drawText(`GLOBAL LKP ${Math.round(ev.globalX)},${Math.round(ev.globalY)}`, ev.globalX + 16, ev.globalY, a.text, a.font);
}
