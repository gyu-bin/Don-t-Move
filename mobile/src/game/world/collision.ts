/**
 * Minimal character-vs-AABB movement with sliding. Axis-separated: the move
 * along x is resolved first, then y, so a character pushed diagonally into a
 * wall slides along it. `blockers` is the flattened [x0,y0,x1,y1,...] list.
 */
export function moveWithCollision(
  pos: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
  blockers: number[],
): void {
  'worklet';
  const beforeX = pos.x, beforeY = pos.y;
  if (!Number.isFinite(beforeX) || !Number.isFinite(beforeY) ||
      !Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(radius) || radius < 0 ||
      !Array.isArray(blockers) || blockers.length % 4 !== 0) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[COLLISION] invalid movement input');
    return;
  }
  // Validate before either axis changes; a malformed collider cancels this
  // movement rather than passing a nonfinite coordinate to the renderer.
  for (let i = 0; i < blockers.length; i += 4) {
    if (!Number.isFinite(blockers[i]) || !Number.isFinite(blockers[i + 1]) ||
        !Number.isFinite(blockers[i + 2]) || !Number.isFinite(blockers[i + 3]) ||
        blockers[i] > blockers[i + 2] || blockers[i + 1] > blockers[i + 3]) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[COLLISION] invalid blocker', i);
      return;
    }
  }
  const eps = 0.01;
  pos.x += dx;
  for (let i = 0; i < blockers.length; i += 4) {
    const x0 = blockers[i] - radius;
    const y0 = blockers[i + 1] - radius;
    const x1 = blockers[i + 2] + radius;
    const y1 = blockers[i + 3] + radius;
    if (pos.x > x0 && pos.x < x1 && pos.y > y0 && pos.y < y1) {
      pos.x = dx > 0 ? x0 - eps : dx < 0 ? x1 + eps : pos.x;
    }
  }
  pos.y += dy;
  for (let i = 0; i < blockers.length; i += 4) {
    const x0 = blockers[i] - radius;
    const y0 = blockers[i + 1] - radius;
    const x1 = blockers[i + 2] + radius;
    const y1 = blockers[i + 3] + radius;
    if (pos.x > x0 && pos.x < x1 && pos.y > y0 && pos.y < y1) {
      pos.y = dy > 0 ? y0 - eps : dy < 0 ? y1 + eps : pos.y;
    }
  }
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
    pos.x = beforeX; pos.y = beforeY;
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[COLLISION] invalid resolved position');
  }
}
