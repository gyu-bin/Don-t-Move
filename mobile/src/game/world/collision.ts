/**
 * Minimal character-vs-AABB movement with sliding. Axis-separated: the move
 * along x is resolved first, then y, so a character pushed diagonally into a
 * wall slides along it. `blockers` is the flattened [x0,y0,x1,y1,...] list.
 * Returns true when the step was a corner assist rather than a plain move or stop.
 */
export function moveWithCollision(
  pos: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
  blockers: number[],
): boolean {
  'worklet';
  const beforeX = pos.x, beforeY = pos.y;
  if (!Number.isFinite(beforeX) || !Number.isFinite(beforeY) ||
      !Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(radius) || radius < 0 ||
      !Array.isArray(blockers) || blockers.length % 4 !== 0) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[COLLISION] invalid movement input');
    return false;
  }
  // Validate before either axis changes; a malformed collider cancels this
  // movement rather than passing a nonfinite coordinate to the renderer.
  for (let i = 0; i < blockers.length; i += 4) {
    if (!Number.isFinite(blockers[i]) || !Number.isFinite(blockers[i + 1]) ||
        !Number.isFinite(blockers[i + 2]) || !Number.isFinite(blockers[i + 3]) ||
        blockers[i] > blockers[i + 2] || blockers[i + 1] > blockers[i + 3]) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[COLLISION] invalid blocker', i);
      return false;
    }
  }
  const eps = 0.01;
  // Corner assist: a body that clips a blocker's corner by a few pixels is carried
  // round it instead of being stopped by the whole face. Without it, catching a
  // corner by a hair turned the move into a crawl down the long side of the
  // structure. The step never gets longer than the intended one, and the assist
  // is dropped whenever the freed path would touch any other blocker.
  // Reach is the body radius: the centre is then still outside the blocker's own
  // edge line, which is exactly where a round body would roll off a corner.
  const reach = radius;
  const inside = (x: number, y: number): boolean => {
    for (let i = 0; i < blockers.length; i += 4) {
      if (x > blockers[i] - radius && x < blockers[i + 2] + radius &&
          y > blockers[i + 1] - radius && y < blockers[i + 3] + radius) return true;
    }
    return false;
  };
  // Only the stronger axis is assisted. Two equal axes at an exact corner would
  // trade nudges forever, and a body already sliding along the face faster than it
  // pushes into it reaches the corner by itself: that is a wall slide, not a catch.
  const allowed = (over: number, along: number, blocked: number): boolean =>
    Math.abs(over) <= reach && Math.abs(along) < Math.abs(blocked);
  let restY = dy;
  let assisted = false;
  pos.x += dx;
  for (let i = 0; i < blockers.length; i += 4) {
    const x0 = blockers[i] - radius;
    const y0 = blockers[i + 1] - radius;
    const x1 = blockers[i + 2] + radius;
    const y1 = blockers[i + 3] + radius;
    if (pos.x > x0 && pos.x < x1 && pos.y > y0 && pos.y < y1) {
      const over = pos.y - y0 < y1 - pos.y ? y0 - eps - pos.y : y1 + eps - pos.y;
      const step = Math.abs(dx);
      if (dx !== 0 && allowed(over, dy, dx)) {
        const cleared = Math.abs(over) <= step;
        const nudge = cleared ? over : Math.sign(over) * step;
        const nx = cleared ? beforeX + Math.sign(dx) * (step - Math.abs(over)) : beforeX;
        if (!inside(beforeX, beforeY + nudge) && !inside(nx, beforeY + nudge)) {
          pos.x = nx; pos.y = beforeY + nudge; assisted = true;
          // The nudge already spent part of this frame's travel on the y axis.
          if (Math.sign(nudge) === Math.sign(dy)) restY = Math.sign(dy) * Math.max(0, Math.abs(dy) - Math.abs(nudge));
          break;
        }
      }
      pos.x = dx > 0 ? x0 - eps : dx < 0 ? x1 + eps : pos.x;
    }
  }
  const fromY = pos.y;
  pos.y += restY;
  for (let i = 0; i < blockers.length; i += 4) {
    const x0 = blockers[i] - radius;
    const y0 = blockers[i + 1] - radius;
    const x1 = blockers[i + 2] + radius;
    const y1 = blockers[i + 3] + radius;
    if (pos.x > x0 && pos.x < x1 && pos.y > y0 && pos.y < y1) {
      const over = pos.x - x0 < x1 - pos.x ? x0 - eps - pos.x : x1 + eps - pos.x;
      const step = Math.abs(restY);
      if (restY !== 0 && allowed(over, dx, dy)) {
        const cleared = Math.abs(over) <= step;
        const nx = pos.x + (cleared ? over : Math.sign(over) * step);
        const ny = cleared ? fromY + Math.sign(restY) * (step - Math.abs(over)) : fromY;
        if (!inside(nx, fromY) && !inside(nx, ny)) { pos.x = nx; pos.y = ny; assisted = true; break; }
      }
      pos.y = restY > 0 ? y0 - eps : restY < 0 ? y1 + eps : pos.y;
    }
  }
  // Rounding a corner never travels farther than the frame's intended step.
  const intended = Math.hypot(dx, dy), travelled = Math.hypot(pos.x - beforeX, pos.y - beforeY);
  if (travelled > intended + eps) {
    const k = intended / travelled, cx = beforeX + (pos.x - beforeX) * k, cy = beforeY + (pos.y - beforeY) * k;
    if (!inside(cx, cy)) { pos.x = cx; pos.y = cy; }
  }
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
    pos.x = beforeX; pos.y = beforeY;
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[COLLISION] invalid resolved position');
    return false;
  }
  return assisted;
}
