import { Skia } from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint, SkPath } from '@shopify/react-native-skia';

import { fill, stroke } from '../paints';
import { fillOval, fillRRect } from '../skiaScratch';
import {
  bodyBob,
  facingToDir,
  footCycle,
  GAIT_STANCE,
  gaitLerp,
  plantedReach,
} from '../../game/core/locomotion';
import type { CharacterPalette } from './characterPalettes';

/**
 * FALLBACK ONLY — temporary procedural character used until the final sprite
 * sheets are registered in src/assets/manifest.ts. Delete this file (and
 * characterPalettes.ts) once both Player and Guard have sprite sets.
 *
 * Procedural 2D character rig for the top-down 3/4 camera.
 *
 * A character is a small skeleton (hips, knees, feet, shoulders, elbows,
 * hands, torso, head) posed every frame from one gait phase, so legs, arms,
 * torso bounce and lean always move together. Feet are planted: the phase is
 * advanced by distance travelled (see game/core/locomotion), so the character
 * never slides over the floor.
 *
 * Local space: origin = ground point between the feet, y down, ~44 units tall.
 * Views: front (facing down), back (facing up), side (right; left = mirrored).
 * Direction comes from `facingToDir`, shared with sprite sets.
 */

export interface CharacterArt {
  isGuard: boolean;
  f: Record<keyof CharacterPalette, SkPaint>;
  ol: SkPaint;
  shadow: SkPaint;
  legOl: SkPaint;
  leg: SkPaint;
  legFar: SkPaint;
  armOl: SkPaint;
  arm: SkPaint;
  armFar: SkPaint;
  detail: SkPaint;
  detailLight: SkPaint;
  hairFront: SkPath;
  hairFrontLight: SkPath;
  hairBack: SkPath;
  hairSide: SkPath;
  hairSideLight: SkPath;
  visorFront: SkPath;
  visorSide: SkPath;
}

// ---- Gait tables, indexed by continuous gait value 0=Idle 1=Sneak 2=Walk 3=Run ----
const FOOT_LIFT = [0, 2.2, 3.4, 5.6];
const BOUNCE = [0, 0.7, 1.4, 2.4];
const ARM_SWING = [0, 0.22, 0.55, 0.95]; // radians
const ARM_BASE = [0.05, 0.55, 0.05, 0.2]; // forward offset (radians)
const ELBOW = [0.15, 1.35, 0.35, 1.55];
const LEAN = [0, 0.16, 0.04, 0.22];
const CROUCH = [0, 3.4, 0, 1.4];

const HIP_Y = -15;
const THIGH = 7.8;
const SHIN = 7.8;
const UPPER_ARM = 6.4;
const FOREARM = 6.0;
const HEAD_R = 9.6;
const FORESHORTEN = 0.42; // how much "toward camera" shows as screen-y in front/back views

/** Two-bone IK. Returns bend-point coords in `out` (index 0,1). */
function ik(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  l1: number,
  l2: number,
  bend: number,
  out: number[],
): void {
  'worklet';
  let dx = bx - ax;
  let dy = by - ay;
  let d = Math.sqrt(dx * dx + dy * dy);
  const maxD = l1 + l2 - 0.01;
  if (d > maxD) {
    const k = maxD / d;
    dx *= k;
    dy *= k;
    d = maxD;
  }
  if (d < 0.001) {
    out[0] = ax;
    out[1] = ay + l1;
    return;
  }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + (dx * a) / d;
  const my = ay + (dy * a) / d;
  out[0] = mx + (-dy / d) * h * bend;
  out[1] = my + (dx / d) * h * bend;
}

declare const globalThis: { __dmIk?: number[]; __dmFoot?: number[] };
function footBuf(): number[] {
  'worklet';
  let b = globalThis.__dmFoot;
  if (b === undefined) {
    b = [0, 0];
    globalThis.__dmFoot = b;
  }
  return b;
}
function ikBuf(): number[] {
  'worklet';
  let b = globalThis.__dmIk;
  if (b === undefined) {
    b = [0, 0];
    globalThis.__dmIk = b;
  }
  return b;
}

function limb(
  canvas: SkCanvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ol: SkPaint,
  paint: SkPaint,
): void {
  'worklet';
  canvas.drawLine(x0, y0, x1, y1, ol);
  canvas.drawLine(x1, y1, x2, y2, ol);
  canvas.drawLine(x0, y0, x1, y1, paint);
  canvas.drawLine(x1, y1, x2, y2, paint);
}

/**
 * Draws a posed character with feet at (x, y).
 * @param gait continuous 0..3 (Idle..Run), smoothed by the simulation
 * @param phase gait cycle phase in [0,1)
 * @param t global time (s) — idle breathing, search head turns
 * @param action GuardAction code; actionT is 0..1 blend of that action
 */
export function drawCharacter(
  canvas: SkCanvas,
  art: CharacterArt,
  x: number,
  y: number,
  facing: number,
  gait: number,
  phase: number,
  t: number,
  action: number,
  actionT: number,
  /** Tooling only: scales foot sweep so art guides match the sprite px/unit. */
  reachScale = 1,
): void {
  'worklet';
  const view = facingToDir(facing); // 0 down, 1 up, 2 right, 3 left
  const f = art.f;
  const cyc = phase * Math.PI * 2;
  const moving = Math.min(1, gait);

  // Foot planting (game/core/locomotion): stance foot sweeps back linearly at
  // exactly body speed, so it stays fixed in the world. Leg 0 = near/left.
  const stance = gaitLerp(GAIT_STANCE, gait);
  const reach = plantedReach(gait) * moving * reachScale;
  const liftH = gaitLerp(FOOT_LIFT, gait);
  const fc = footBuf();
  footCycle(phase, stance, fc);
  const n0 = fc[0] * moving;
  const lift0 = fc[1] * liftH * moving;
  footCycle(phase + 0.5, stance, fc);
  const n1 = fc[0] * moving;
  const lift1 = fc[1] * liftH * moving;
  const bounce = gaitLerp(BOUNCE, gait);
  const armSwing = gaitLerp(ARM_SWING, gait);
  const armBase = gaitLerp(ARM_BASE, gait);
  const elbow = gaitLerp(ELBOW, gait);
  const lean = gaitLerp(LEAN, gait);
  const crouch = gaitLerp(CROUCH, gait);

  const breath = Math.sin(t * 2.3) * 0.45 * (1 - moving);
  const bodyY = crouch + bounce * bodyBob(phase) * moving;
  const hipY = HIP_Y + bodyY;
  const chestTop = -32 + bodyY + breath * 0.5;
  const shoulderY = chestTop + 3;
  const buf = ikBuf();

  canvas.save();
  canvas.translate(x, y);

  // Contact shadow (tightens as the body rises).
  const sh = 1 - bodyY * -0.03;
  fillOval(canvas, -11 * sh, -3.6, 22 * sh, 7.2, art.shadow);

  if (view >= 2) {
    // ---------------------------------------------------------------- SIDE
    if (view === 3) canvas.scale(-1, 1);
    const hipX = -0.5;
    // Feet: i=0 near leg, i=1 far leg (half a cycle apart).
    let nfx = 0;
    let nfy = 0;
    let ffx = 0;
    let ffy = 0;
    nfx = hipX + n0 * reach;
    nfy = -1.2 - lift0;
    ffx = hipX + n1 * reach;
    ffy = -1.2 - lift1;
    // Arms swing opposite to the leg on the same side.
    const aNear = armBase - n0 * armSwing;
    const aFar = armBase - n1 * armSwing;

    // Upper body leans around the hip.
    const leanDeg = (lean * 180) / Math.PI;

    // Far arm (behind torso)
    canvas.save();
    canvas.rotate(leanDeg, hipX, hipY);
    {
      const sx = 0.2;
      const hx = sx + Math.sin(aFar) * UPPER_ARM + Math.sin(aFar + elbow) * FOREARM;
      const hy = shoulderY + Math.cos(aFar) * UPPER_ARM + Math.cos(aFar + elbow) * FOREARM;
      ik(sx, shoulderY, hx, hy, UPPER_ARM, FOREARM, 1, buf);
      limb(canvas, sx, shoulderY, buf[0], buf[1], hx, hy, art.armOl, art.armFar);
      canvas.drawCircle(hx, hy, 2.5, f.skinShade);
      canvas.drawCircle(hx, hy, 2.5, art.ol);
    }
    canvas.restore();

    // Legs: far then near.
    ik(hipX, hipY, ffx, ffy, THIGH, SHIN, -1, buf);
    limb(canvas, hipX, hipY, buf[0], buf[1], ffx, ffy, art.legOl, art.legFar);
    fillRRect(canvas, ffx - 3.2, ffy - 2.6, 8.4, 4.2, 2, f.shoe);
    fillRRect(canvas, ffx - 3.2, ffy - 2.6, 8.4, 4.2, 2, art.ol);
    ik(hipX, hipY, nfx, nfy, THIGH, SHIN, -1, buf);
    limb(canvas, hipX, hipY, buf[0], buf[1], nfx, nfy, art.legOl, art.leg);
    fillRRect(canvas, nfx - 3.2, nfy - 2.6, 8.4, 4.2, 2, f.shoe);
    fillRRect(canvas, nfx - 3.2, nfy + 0.2, 8.4, 1.4, 0.7, f.shoeLight);
    fillRRect(canvas, nfx - 3.2, nfy - 2.6, 8.4, 4.2, 2, art.ol);

    canvas.save();
    canvas.rotate(leanDeg, hipX, hipY);
    // Backpack (player) sits behind the torso.
    if (!art.isGuard) {
      fillRRect(canvas, -10.2, chestTop + 1.5, 6.4, 13, 2.6, f.gear);
      fillRRect(canvas, -10.2, chestTop + 1.5, 6.4, 4.5, 2.2, f.gearLight);
      fillRRect(canvas, -10.2, chestTop + 1.5, 6.4, 13, 2.6, art.ol);
    }
    // Torso
    const torsoH = hipY + 3 - chestTop;
    fillRRect(canvas, -5.6, chestTop, 11.2, torsoH, 4.4, f.top);
    fillRRect(canvas, -5.6, chestTop, 4, torsoH, 3, f.topShade);
    fillRRect(canvas, -5.6, chestTop, 11.2, torsoH, 4.4, art.ol);
    if (art.isGuard) {
      fillRRect(canvas, -5.4, hipY - 2.2, 10.8, 3.2, 1, f.gear);
      canvas.drawCircle(2.6, chestTop + 5.5, 1.5, f.metal);
      fillRRect(canvas, -3.2, chestTop + 0.4, 3.6, 3.2, 1, f.gear); // radio
    } else {
      canvas.drawLine(-3, chestTop + 1.5, -1.5, chestTop + 12, art.detail); // strap
      canvas.drawLine(2.5, chestTop + 3, 3.4, hipY + 1, art.detailLight); // zipper
    }

    // Head
    const hx = 1.2 + lean * 6;
    const hy = chestTop - 7.5 + (1 - moving) * breath * 0.3;
    // No independent head turn: the head always looks along `facing`
    // (search scanning rotates facing itself, so sprite = cone = detection).
    const look = 0;
    canvas.save();
    canvas.translate(hx, hy);
    canvas.drawCircle(0, 0, HEAD_R, f.skin);
    fillOval(canvas, -3 + look, -1, 10, 11, f.skin);
    canvas.drawCircle(0, 0, HEAD_R, art.ol);
    if (art.isGuard) {
      canvas.drawPath(art.hairSide, f.hair);
      canvas.drawPath(art.hairSideLight, f.hairLight);
      canvas.drawPath(art.visorSide, f.hairShade);
      canvas.drawPath(art.hairSide, art.ol);
      canvas.drawPath(art.visorSide, art.ol);
      canvas.drawCircle(4.5, -6.5, 1.5, f.metal);
      fillOval(canvas, 4 + look, 1.6, 2, 2.4, f.eye);
    } else {
      canvas.drawCircle(-1.6, 1.6, 2.2, f.skinShade); // ear
      canvas.drawPath(art.hairSide, f.hair);
      canvas.drawPath(art.hairSideLight, f.hairLight);
      canvas.drawPath(art.hairSide, art.ol);
      fillOval(canvas, 4.6 + look, 1.2, 2, 2.6, f.eye);
    }
    canvas.restore();

    // Near arm (in front). Whistle raises it to the mouth.
    {
      const sx = 0.6;
      let hxA = sx + Math.sin(aNear) * UPPER_ARM + Math.sin(aNear + elbow) * FOREARM;
      let hyA = shoulderY + Math.cos(aNear) * UPPER_ARM + Math.cos(aNear + elbow) * FOREARM;
      if (action === 1) {
        hxA += (hx + 8.5 - hxA) * actionT;
        hyA += (hy + 4.5 - hyA) * actionT;
      } else if (action === 2) {
        hxA += (sx + 9 - hxA) * actionT;
        hyA += (shoulderY + 6 - hyA) * actionT;
      }
      ik(sx, shoulderY, hxA, hyA, UPPER_ARM, FOREARM, 1, buf);
      limb(canvas, sx, shoulderY, buf[0], buf[1], hxA, hyA, art.armOl, art.arm);
      if (action === 2 && actionT > 0.5) {
        fillRRect(canvas, hxA - 1, hyA - 1.6, 6, 3.2, 1.2, f.gear); // flashlight
      }
      if (action === 1 && actionT > 0.18) canvas.drawCircle(hxA + 1.8, hyA - 0.8, 1.4, f.metal); // whistle
      canvas.drawCircle(hxA, hyA, 2.6, f.skin);
      canvas.drawCircle(hxA, hyA, 2.6, art.ol);
    }
    canvas.restore();
  } else {
    // ----------------------------------------------------- FRONT / BACK
    const front = view === 0;
    const dir = front ? 1 : -1; // "forward" projects to +y on screen for the front view
    const sway = Math.sin(cyc) * 0.7 * moving;

    // Legs — the one stepping away from the camera is drawn first.
    const fwd0 = n0 * reach;
    const fwd1 = n1 * reach;
    const f0y = -1.2 + dir * fwd0 * FORESHORTEN - lift0;
    const f1y = -1.2 + dir * fwd1 * FORESHORTEN - lift1;
    // Anatomical sides: leg 0 is the character's LEFT leg — screen-right when
    // facing the camera, screen-left from behind.
    const side0 = front ? 1 : -1;
    const leg0First = dir * fwd0 < dir * fwd1;
    for (let k = 0; k < 2; k++) {
      const isLeg0 = k === 0 ? leg0First : !leg0First;
      const side = isLeg0 ? side0 : -side0;
      const fy = isLeg0 ? f0y : f1y;
      const lx = side * 3.4 + sway * 0.3;
      const fx = side * 3.7;
      const kneeY = (hipY + fy) * 0.5;
      limb(canvas, lx, hipY, (lx + fx) * 0.5, kneeY, fx, fy, art.legOl, k === 0 ? art.legFar : art.leg);
      fillRRect(canvas, fx - 3.3, fy - 2.4, 6.6, 4.6, 2.2, f.shoe);
      if (front) fillRRect(canvas, fx - 3.3, fy + 0.6, 6.6, 1.6, 0.8, f.shoeLight);
      fillRRect(canvas, fx - 3.3, fy - 2.4, 6.6, 4.6, 2.2, art.ol);
    }

    // Arms: compute both hand targets first (needed for draw order).
    // Each arm swings opposite to the leg on its own side.
    const swing0 = armBase - n0 * armSwing;
    const swing1 = armBase - n1 * armSwing;
    const torsoTop = chestTop;
    const torsoH = hipY + 3 - chestTop;

    for (let pass = 0; pass < 2; pass++) {
      // Back view: arms behind torso (pass 0). Front view: arms in front (pass 1).
      const armsNow = front ? pass === 1 : pass === 0;
      if (armsNow) {
        for (let s = -1; s <= 1; s += 2) {
          const sw = s === side0 ? swing0 : swing1;
          const sx = s * 8.2 + sway;
          const inward = elbow * 2.2;
          const reach = UPPER_ARM + FOREARM * Math.cos(elbow * 0.6);
          let hxA = s * (8.9 - inward) + sway;
          let hyA = shoulderY + reach * Math.cos(sw) + dir * Math.sin(sw) * reach * FORESHORTEN;
          if (action === 1 && s > 0) {
            hxA += (2.2 - hxA) * actionT;
            hyA += (shoulderY - 5 - hyA) * actionT;
          } else if (action === 2 && s > 0) {
            hyA += (shoulderY + 5 - hyA) * actionT;
            hxA += (s * 5 - hxA) * actionT;
          }
          ik(sx, shoulderY, hxA, hyA, UPPER_ARM, FOREARM, s * dir * -0.4, buf);
          limb(canvas, sx, shoulderY, buf[0], buf[1], hxA, hyA, art.armOl, front ? art.arm : art.armFar);
          canvas.drawCircle(hxA, hyA, 2.6, f.skin);
          canvas.drawCircle(hxA, hyA, 2.6, art.ol);
        }
      }
      if (pass === 0) {
        // Torso
        fillRRect(canvas, -8.6 + sway, torsoTop, 17.2, torsoH, 5, f.top);
        fillRRect(canvas, -8.6 + sway, torsoTop + torsoH - 5, 17.2, 5, 3, f.topShade);
        fillRRect(canvas, -8.6 + sway, torsoTop, 17.2, torsoH, 5, art.ol);
        if (art.isGuard) {
          fillRRect(canvas, -8.4 + sway, hipY - 2.4, 16.8, 3.4, 1, f.gear);
          if (front) {
            fillRRect(canvas, -1.6 + sway, hipY - 2.4, 3.2, 3.4, 0.8, f.metal);
            canvas.drawCircle(-4 + sway, torsoTop + 6, 1.7, f.metal);
            canvas.drawLine(sway, torsoTop + 2, sway, hipY - 3, art.detail);
            fillRRect(canvas, 3 + sway, torsoTop + 0.5, 3.4, 3.4, 1, f.gear); // radio
          }
        } else if (front) {
          fillRRect(canvas, -2.6 + sway, torsoTop + 0.8, 5.2, 7, 2, f.inner);
          canvas.drawLine(-5.2 + sway, torsoTop + 1.2, -5.4 + sway, torsoTop + 12, art.detail);
          canvas.drawLine(5.2 + sway, torsoTop + 1.2, 5.4 + sway, torsoTop + 12, art.detail);
          canvas.drawLine(sway, torsoTop + 8, sway, hipY + 1, art.detailLight);
        } else {
          // Backpack
          fillRRect(canvas, -6.6 + sway, torsoTop + 1.6, 13.2, 14, 3.4, f.gear);
          fillRRect(canvas, -6.6 + sway, torsoTop + 1.6, 13.2, 5, 3, f.gearLight);
          fillRRect(canvas, -6.6 + sway, torsoTop + 1.6, 13.2, 14, 3.4, art.ol);
        }
      }
    }

    // Head
    const hx = sway * 0.6;
    const hy = chestTop - 7.2 + dir * lean * 5 + breath * 0.3;
    const look = 0; // head always along `facing` (see side view)
    canvas.save();
    canvas.translate(hx, hy);
    if (front) {
      if (!art.isGuard) {
        canvas.drawCircle(-HEAD_R + 0.4, 1.8, 2.3, f.skinShade);
        canvas.drawCircle(HEAD_R - 0.4, 1.8, 2.3, f.skinShade);
      }
      canvas.drawCircle(0, 0, HEAD_R, f.skin);
      fillOval(canvas, -7, 5, 14, 5, f.skinShade);
      canvas.drawCircle(0, 0, HEAD_R, art.ol);
      canvas.drawPath(art.hairFront, f.hair);
      canvas.drawPath(art.hairFrontLight, f.hairLight);
      if (art.isGuard) {
        canvas.drawPath(art.visorFront, f.hairShade);
        canvas.drawPath(art.visorFront, art.ol);
        canvas.drawCircle(0, -5.5, 1.8, f.metal);
      }
      canvas.drawPath(art.hairFront, art.ol);
      const ey = art.isGuard ? 4.4 : 3.2;
      fillOval(canvas, -4.2 + look, ey, 2, 2.6, f.eye);
      fillOval(canvas, 2.2 + look, ey, 2, 2.6, f.eye);
    } else {
      canvas.drawCircle(0, 0, HEAD_R, f.skinShade);
      canvas.drawPath(art.hairBack, f.hair);
      canvas.drawPath(art.hairBack, art.ol);
      if (art.isGuard) {
        fillRRect(canvas, -9.6, 1.5, 19.2, 3.4, 1.4, f.hairShade);
      }
    }
    canvas.restore();
  }

  canvas.restore();
}

// ---------------------------------------------------------------- art build

function playerHair(): Pick<
  CharacterArt,
  'hairFront' | 'hairFrontLight' | 'hairBack' | 'hairSide' | 'hairSideLight'
> {
  const hairFront = Skia.PathBuilder.Make();
  hairFront.moveTo(-10.4, 2.5);
  hairFront.cubicTo(-12, -8, -6, -12.4, 0.5, -12.2);
  hairFront.cubicTo(7, -12, 12.2, -7, 10.4, 2.8);
  hairFront.lineTo(8.6, 0.2);
  hairFront.lineTo(7.4, 3.2);
  hairFront.lineTo(5.2, -0.4);
  hairFront.lineTo(3.2, 2.6);
  hairFront.lineTo(0.8, -0.6);
  hairFront.lineTo(-1.8, 2.8);
  hairFront.lineTo(-3.8, -0.2);
  hairFront.lineTo(-6.2, 2.4);
  hairFront.lineTo(-7.6, -0.4);
  hairFront.close();

  const hairFrontLight = Skia.PathBuilder.Make();
  hairFrontLight.moveTo(-6.5, -7.5);
  hairFrontLight.cubicTo(-4, -10.6, 1, -11.2, 4.4, -9.6);
  hairFrontLight.cubicTo(1.2, -9.4, -2.6, -8.4, -6.5, -7.5);
  hairFrontLight.close();

  const hairBack = Skia.PathBuilder.Make();
  hairBack.moveTo(-10.6, 1);
  hairBack.cubicTo(-12, -9, -5, -12.6, 0, -12.4);
  hairBack.cubicTo(6, -12.4, 12, -8.6, 10.6, 1);
  hairBack.lineTo(9, 6.4);
  hairBack.lineTo(6.4, 5);
  hairBack.lineTo(4.4, 8.6);
  hairBack.lineTo(1.6, 6.4);
  hairBack.lineTo(-1, 9);
  hairBack.lineTo(-3.8, 6.4);
  hairBack.lineTo(-6.4, 8.2);
  hairBack.lineTo(-8, 5.2);
  hairBack.close();

  const hairSide = Skia.PathBuilder.Make();
  hairSide.moveTo(8.8, -1);
  hairSide.cubicTo(10.6, -9, 4, -12.8, -2, -12.2);
  hairSide.cubicTo(-9, -11.4, -12, -4, -9.6, 4.6);
  hairSide.lineTo(-7.6, 8.2);
  hairSide.lineTo(-5.6, 5);
  hairSide.lineTo(-3.4, 6.8);
  hairSide.lineTo(-2.4, 1.4);
  hairSide.lineTo(0.6, 0.4);
  hairSide.lineTo(2.6, -2.4);
  hairSide.lineTo(4.4, 0.8);
  hairSide.lineTo(6.2, -2.2);
  hairSide.close();

  const hairSideLight = Skia.PathBuilder.Make();
  hairSideLight.moveTo(-5.5, -8.5);
  hairSideLight.cubicTo(-2, -11.2, 3, -11, 5.5, -8.4);
  hairSideLight.cubicTo(2, -9.4, -2, -9.4, -5.5, -8.5);
  hairSideLight.close();

  return {
    hairFront: hairFront.build(),
    hairFrontLight: hairFrontLight.build(),
    hairBack: hairBack.build(),
    hairSide: hairSide.build(),
    hairSideLight: hairSideLight.build(),
  };
}

function guardCap(): Pick<
  CharacterArt,
  'hairFront' | 'hairFrontLight' | 'hairBack' | 'hairSide' | 'hairSideLight' | 'visorFront' | 'visorSide'
> {
  // Peaked security cap: wide flat crown + band, visor toward the facing direction.
  const hairFront = Skia.PathBuilder.Make();
  hairFront.moveTo(-10.2, 1.2);
  hairFront.lineTo(-10.8, -4);
  hairFront.cubicTo(-12.6, -10.4, -6, -13.4, 0, -13.4);
  hairFront.cubicTo(6, -13.4, 12.6, -10.4, 10.8, -4);
  hairFront.lineTo(10.2, 1.2);
  hairFront.close();

  const hairFrontLight = Skia.PathBuilder.Make();
  hairFrontLight.moveTo(-7.5, -9.6);
  hairFrontLight.cubicTo(-4, -12.2, 4, -12.2, 7.5, -9.6);
  hairFrontLight.cubicTo(3, -10.6, -3, -10.6, -7.5, -9.6);
  hairFrontLight.close();

  const visorFront = Skia.PathBuilder.Make();
  visorFront.moveTo(-9.6, 0.6);
  visorFront.cubicTo(-6, 5.4, 6, 5.4, 9.6, 0.6);
  visorFront.close();

  const hairBack = Skia.PathBuilder.Make();
  hairBack.moveTo(-10.6, 3);
  hairBack.cubicTo(-12.4, -9.6, -6, -13.4, 0, -13.4);
  hairBack.cubicTo(6, -13.4, 12.4, -9.6, 10.6, 3);
  hairBack.close();

  const hairSide = Skia.PathBuilder.Make();
  hairSide.moveTo(8.4, 0.2);
  hairSide.cubicTo(10.4, -10, 4, -13.4, -2, -13);
  hairSide.cubicTo(-9, -12.4, -12, -6, -9.8, 2);
  hairSide.lineTo(-7.4, 5.4); // short hair at the nape
  hairSide.lineTo(-4.6, 2.6);
  hairSide.close();

  const hairSideLight = Skia.PathBuilder.Make();
  hairSideLight.moveTo(-5, -10);
  hairSideLight.cubicTo(-1, -12.4, 4, -12.2, 6.4, -9.4);
  hairSideLight.cubicTo(2.4, -10.6, -1.6, -10.6, -5, -10);
  hairSideLight.close();

  const visorSide = Skia.PathBuilder.Make();
  visorSide.moveTo(6.6, -1.4);
  visorSide.lineTo(13.6, 0.4);
  visorSide.cubicTo(13.2, 2.2, 9.4, 2.4, 6.6, 1.8);
  visorSide.close();

  return {
    hairFront: hairFront.build(),
    hairFrontLight: hairFrontLight.build(),
    hairBack: hairBack.build(),
    hairSide: hairSide.build(),
    hairSideLight: hairSideLight.build(),
    visorFront: visorFront.build(),
    visorSide: visorSide.build(),
  };
}

export function createCharacterArt(palette: CharacterPalette, isGuard: boolean): CharacterArt {
  const keys = Object.keys(palette) as (keyof CharacterPalette)[];
  const f = {} as Record<keyof CharacterPalette, SkPaint>;
  for (const k of keys) f[k] = fill(palette[k]);

  const shadow = fill('#000000', 0.5);
  const hair = isGuard
    ? guardCap()
    : {
        ...playerHair(),
        visorFront: Skia.PathBuilder.Make().build(),
        visorSide: Skia.PathBuilder.Make().build(),
      };

  return {
    isGuard,
    f,
    ol: stroke(palette.outline, 1.3),
    shadow,
    legOl: stroke(palette.outline, isGuard ? 8.8 : 8.2),
    leg: stroke(palette.pants, isGuard ? 6.4 : 5.8),
    legFar: stroke(palette.pantsShade, isGuard ? 6.4 : 5.8),
    armOl: stroke(palette.outline, isGuard ? 7.4 : 6.8),
    arm: stroke(palette.top, isGuard ? 5 : 4.4),
    armFar: stroke(palette.topShade, isGuard ? 5 : 4.4),
    detail: stroke(isGuard ? palette.topShade : palette.gear, 1.4),
    detailLight: stroke(palette.topLight, 1),
    ...hair,
  };
}
