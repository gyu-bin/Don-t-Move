/**
 * Ray casting against the stage's vision blockers (flattened [x0,y0,x1,y1,...]
 * AABBs). Guard vision geometry built on top of this lives in
 * game/guards/guardVision.ts.
 */

/** Distance along (dx,dy) (unit vector) to the first blocker, capped at maxDist. */
export function castRay(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  maxDist: number,
  blockers: number[],
): number {
  'worklet';
  let best = maxDist;
  const invDx = dx !== 0 ? 1 / dx : 1e12;
  const invDy = dy !== 0 ? 1 / dy : 1e12;
  for (let i = 0; i < blockers.length; i += 4) {
    const x0 = blockers[i];
    const y0 = blockers[i + 1];
    const x1 = blockers[i + 2];
    const y1 = blockers[i + 3];
    // Broad phase: skip boxes entirely out of reach.
    if (x1 < ox - best || x0 > ox + best || y1 < oy - best || y0 > oy + best) continue;
    let t1 = (x0 - ox) * invDx;
    let t2 = (x1 - ox) * invDx;
    let tmin = t1 < t2 ? t1 : t2;
    let tmax = t1 < t2 ? t2 : t1;
    t1 = (y0 - oy) * invDy;
    t2 = (y1 - oy) * invDy;
    const tymin = t1 < t2 ? t1 : t2;
    const tymax = t1 < t2 ? t2 : t1;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;
    if (tmax < 0 || tmin > tmax) continue;
    const hit = tmin > 0 ? tmin : 0;
    if (hit < best) best = hit;
  }
  return best;
}
