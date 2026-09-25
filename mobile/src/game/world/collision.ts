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
}
