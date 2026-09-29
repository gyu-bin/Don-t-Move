import type { CompiledStage } from './compileStage';
import { moveWithCollision } from './collision';
import { clearSegment } from './navigation';

/** Plain data captured once by the game worklet. Floor = 1; walls/void reject bodies. */
export interface PlayableBoundary {
  width: number;
  height: number;
  cols: number;
  rows: number;
  tile: number;
  grid: number[];
  blockers: number[];
  spawn: { x: number; y: number };
}

export function createPlayableBoundary(stage: CompiledStage): PlayableBoundary {
  return { width: stage.width, height: stage.height, cols: stage.cols, rows: stage.rows,
    tile: stage.width / stage.cols, grid: Array.from(stage.grid),
    blockers: stage.movementBlockers, spawn: { x: stage.playerSpawn.x, y: stage.playerSpawn.y } };
}

export function isPlayableBody(x: number, y: number, radius: number, b: PlayableBoundary): boolean {
  'worklet';
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < radius || y < radius ||
    x > b.width - radius || y > b.height - radius) return false;
  // The collision system uses a square-expanded body, so validate its whole
  // footprint rather than just its center (prevents void/corner clipping).
  const left = Math.floor((x - radius + 0.001) / b.tile);
  const right = Math.floor((x + radius - 0.001) / b.tile);
  const top = Math.floor((y - radius + 0.001) / b.tile);
  const bottom = Math.floor((y + radius - 0.001) / b.tile);
  for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) {
    if (col < 0 || row < 0 || col >= b.cols || row >= b.rows || b.grid[row * b.cols + col] !== 1) return false;
  }
  return clearSegment(x, y, x, y, b.blockers, radius);
}

/** Validate the actual proposed movement before mission/guard checks. Returns
 * true when corrected; caller must derive velocity/animation from final travel. */
export function enforcePlayableStage(
  pos: { x: number; y: number }, beforeX: number, beforeY: number,
  radius: number, b: PlayableBoundary,
): boolean {
  'worklet';
  const proposedX = pos.x, proposedY = pos.y;
  if (isPlayableBody(beforeX, beforeY, radius, b) &&
    isPlayableBody(pos.x, pos.y, radius, b) &&
    clearSegment(beforeX, beforeY, pos.x, pos.y, b.blockers, radius)) return false;

  // Corrupt/out-of-stage saved positions recover to the known valid spawn.
  if (!isPlayableBody(beforeX, beforeY, radius, b)) {
    pos.x = b.spawn.x; pos.y = b.spawn.y;
    return true;
  }
  const targetX = Number.isFinite(pos.x) ? Math.max(radius + 0.01, Math.min(b.width - radius - 0.01, pos.x)) : beforeX;
  const targetY = Number.isFinite(pos.y) ? Math.max(radius + 0.01, Math.min(b.height - radius - 0.01, pos.y)) : beforeY;
  const dx = targetX - beforeX, dy = targetY - beforeY;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, radius / 2)));
  pos.x = beforeX; pos.y = beforeY;
  for (let i = 0; i < steps; i++) {
    const x = pos.x, y = pos.y;
    moveWithCollision(pos, dx / steps, dy / steps, radius, b.blockers);
    if (!isPlayableBody(pos.x, pos.y, radius, b)) { pos.x = x; pos.y = y; }
  }
  // Last safety net is radius-aware; normal exit triggers remain inside it.
  pos.x = Math.max(radius + 0.01, Math.min(b.width - radius - 0.01, pos.x));
  pos.y = Math.max(radius + 0.01, Math.min(b.height - radius - 0.01, pos.y));
  return pos.x !== proposedX || pos.y !== proposedY;
}
