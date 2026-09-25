import { wrapAngle } from '../core/math';
import { castRay } from '../world/visibility';
import { GUARD_TUNING } from './guardTuning';

/**
 * Guard vision — ONE geometry for rendering and detection.
 *
 * `buildVisionFan` writes the guard's exact visibility polygon (even rays plus
 * rays grazing every blocker corner inside the cone) into the guard. The
 * renderer draws exactly this polygon; `pointVisible` answers "can the guard
 * see this point" with the same polygon AND a direct line-of-sight ray.
 * Inputs are always the guard's own `x, y, facing, visionRange,
 * visionHalfAngle` — no other direction or range exists anywhere.
 */
export interface VisionFan {
  x: number;
  y: number;
  facing: number;
  visionRange: number;
  visionHalfAngle: number;
  /** Relative angles (−half..+half), ascending. */
  fanAng: number[];
  /** Endpoints [x0,y0,x1,y1,...] matching fanAng. */
  fan: number[];
  fanCount: number;
}

export function createFanBuffers(): { fanAng: number[]; fan: number[] } {
  const n = GUARD_TUNING.maxFanPoints;
  return { fanAng: new Array(n).fill(0), fan: new Array(n * 2).fill(0) };
}

const EPS = 1e-4;

export function buildVisionFan(g: VisionFan, blockers: number[]): void {
  'worklet';
  const max = GUARD_TUNING.maxFanPoints;
  const half = g.visionHalfAngle;
  const range = g.visionRange;
  const ang = g.fanAng;
  let n = 0;

  // Even rays (always includes both edges).
  const rays = GUARD_TUNING.visionRays;
  for (let i = 0; i < rays && n < max; i++) ang[n++] = -half + (2 * half * i) / (rays - 1);

  // Rays grazing each blocker corner inside the cone, so walls/cover cut
  // the polygon exactly where they cut line of sight.
  for (let b = 0; b < blockers.length && n < max - 2; b += 4) {
    for (let k = 0; k < 4 && n < max - 2; k++) {
      const cx = blockers[b + (k === 0 || k === 3 ? 0 : 2)];
      const cy = blockers[b + (k < 2 ? 1 : 3)];
      const dx = cx - g.x;
      const dy = cy - g.y;
      if (dx * dx + dy * dy > range * range * 1.2) continue;
      const a = wrapAngle(Math.atan2(dy, dx) - g.facing);
      if (a - EPS > -half && a - EPS < half) ang[n++] = a - EPS;
      if (a + EPS > -half && a + EPS < half) ang[n++] = a + EPS;
    }
  }

  // Insertion sort (n is small) and drop near-duplicates.
  for (let i = 1; i < n; i++) {
    const v = ang[i];
    let j = i - 1;
    while (j >= 0 && ang[j] > v) {
      ang[j + 1] = ang[j];
      j--;
    }
    ang[j + 1] = v;
  }
  let m = 0;
  for (let i = 0; i < n; i++) if (m === 0 || ang[i] - ang[m - 1] > 1e-6) ang[m++] = ang[i];

  const fan = g.fan;
  for (let i = 0; i < m; i++) {
    const a = g.facing + ang[i];
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const d = castRay(g.x, g.y, dx, dy, range, blockers);
    fan[i * 2] = g.x + dx * d;
    fan[i * 2 + 1] = g.y + dy * d;
  }
  g.fanCount = m;
}

/** Is (px, py) inside the polygon that is drawn on screen? */
export function pointInFan(g: VisionFan, px: number, py: number): boolean {
  'worklet';
  const dx = px - g.x;
  const dy = py - g.y;
  const d2 = dx * dx + dy * dy;
  if (d2 > g.visionRange * g.visionRange) return false;
  if (d2 < 1e-6) return true;
  const off = wrapAngle(Math.atan2(dy, dx) - g.facing);
  const n = g.fanCount;
  const ang = g.fanAng;
  if (n < 2 || off < ang[0] || off > ang[n - 1]) return false;
  // Binary search for the wedge [i, i+1] containing `off`.
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ang[mid] <= off) lo = mid;
    else hi = mid;
  }
  const ax = g.fan[lo * 2];
  const ay = g.fan[lo * 2 + 1];
  const bx = g.fan[hi * 2];
  const by = g.fan[hi * 2 + 1];
  // Same side of edge a→b as the origin (the wedge is triangle O,a,b).
  const ex = bx - ax;
  const ey = by - ay;
  const sideP = ex * (py - ay) - ey * (px - ax);
  const sideO = ex * (g.y - ay) - ey * (g.x - ax);
  return sideP * sideO >= -1e-6;
}

/** Drawn-cone membership AND an unobstructed ray: the single "can see point" rule. */
export function pointVisible(g: VisionFan, px: number, py: number, blockers: number[]): boolean {
  'worklet';
  if (!pointInFan(g, px, py)) return false;
  const dx = px - g.x;
  const dy = py - g.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1) return true;
  return castRay(g.x, g.y, dx / d, dy / d, d, blockers) >= d - 0.5;
}
