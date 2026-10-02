import type { CompiledStage } from './compileStage';

/** Static half-tile grid, built once. Plain arrays can be captured by UI worklets. */
export interface Navigation {
  cols: number;
  rows: number;
  cell: number;
  radius: number;
  blockers: number[];
  walkable: boolean[];
  neighbors: number[][];
  components: number[];
}

/** Segment vs expanded AABBs, including corners: no diagonal corner cutting. */
export function clearSegment(ax: number, ay: number, bx: number, by: number, blockers: number[], radius = 0): boolean {
  'worklet';
  for (let i = 0; i < blockers.length; i += 4) {
    let lo = 0;
    let hi = 1;
    for (let axis = 0; axis < 2; axis++) {
      const a = axis === 0 ? ax : ay;
      const d = (axis === 0 ? bx : by) - a;
      const min = blockers[i + axis] - radius;
      const max = blockers[i + axis + 2] + radius;
      if (Math.abs(d) < 1e-8) {
        if (a < min || a > max) { hi = -1; break; }
      } else {
        const u = (min - a) / d;
        const v = (max - a) / d;
        lo = Math.max(lo, Math.min(u, v));
        hi = Math.min(hi, Math.max(u, v));
      }
    }
    if (lo <= hi) return false;
  }
  return true;
}

export function nodeX(n: Navigation, i: number): number {
  'worklet';
  return (i % n.cols + 0.5) * n.cell;
}
export function nodeY(n: Navigation, i: number): number {
  'worklet';
  return (Math.floor(i / n.cols) + 0.5) * n.cell;
}

export function buildNavigation(stage: CompiledStage, radius: number): Navigation {
  const cell = 20;
  const cols = Math.ceil(stage.width / cell);
  const rows = Math.ceil(stage.height / cell);
  const blockers = stage.movementBlockers.slice();
  // Void and outside the map are not traversable, even if the author omitted a wall.
  const tile = stage.width / stage.cols;
  for (let i = 0; i < stage.grid.length; i++) {
    if (stage.grid[i] !== 0) continue;
    const x = (i % stage.cols) * tile;
    const y = Math.floor(i / stage.cols) * tile;
    blockers.push(x, y, x + tile, y + tile);
  }
  blockers.push(-cell, -cell, 0, stage.height + cell, stage.width, -cell, stage.width + cell, stage.height + cell,
    0, -cell, stage.width, 0, 0, stage.height, stage.width, stage.height + cell);
  const n: Navigation = { cols, rows, cell, radius, blockers, walkable: [], neighbors: [], components: [] };
  // Bucket blockers by the grid cells their radius-expanded box touches. A node
  // or a step between adjacent nodes can only be hit by blockers registered in
  // those cells, so each query tests a handful of boxes instead of all of them.
  const buckets: number[][] = Array.from({ length: cols * rows }, () => []);
  for (let b = 0; b < blockers.length; b += 4) {
    const c0 = Math.max(0, Math.floor((blockers[b] - radius) / cell)), c1 = Math.min(cols - 1, Math.floor((blockers[b + 2] + radius) / cell));
    const r0 = Math.max(0, Math.floor((blockers[b + 1] - radius) / cell)), r1 = Math.min(rows - 1, Math.floor((blockers[b + 3] + radius) / cell));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) buckets[r * cols + c].push(b);
  }
  const clearLocal = (i: number, j: number): boolean => {
    const ax = nodeX(n, i), ay = nodeY(n, i), bx = nodeX(n, j), by = nodeY(n, j);
    // A diagonal step crosses the corner shared by four cells; a box touching
    // only that corner may be registered in either of the other two.
    const ci = i % cols, cj = j % cols, ri = (i - ci) / cols, rj = (j - cj) / cols;
    const cells = i === j ? [i] : ci !== cj && ri !== rj ? [i, j, ri * cols + cj, rj * cols + ci] : [i, j];
    for (const cellIndex of cells) for (const b of buckets[cellIndex]) {
      let lo = 0, hi = 1;
      for (let axis = 0; axis < 2; axis++) {
        const a = axis === 0 ? ax : ay, d = (axis === 0 ? bx : by) - a;
        const min = blockers[b + axis] - radius, max = blockers[b + axis + 2] + radius;
        if (Math.abs(d) < 1e-8) { if (a < min || a > max) { hi = -1; break; } }
        else { const u = (min - a) / d, v = (max - a) / d; lo = Math.max(lo, Math.min(u, v)); hi = Math.min(hi, Math.max(u, v)); }
      }
      if (lo <= hi) return false;
    }
    return true;
  };
  for (let i = 0; i < cols * rows; i++) {
    n.walkable.push(clearLocal(i, i));
    n.neighbors.push([]);
    n.components.push(-1);
  }
  for (let i = 0; i < cols * rows; i++) {
    if (!n.walkable[i]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = i % cols + dx;
      const y = Math.floor(i / cols) + dy;
      const j = y * cols + x;
      if ((dx === 0 && dy === 0) || x < 0 || y < 0 || x >= cols || y >= rows || !n.walkable[j]) continue;
      if (clearLocal(i, j)) n.neighbors[i].push(j);
    }
  }
  let component = 0;
  for (let i = 0; i < cols * rows; i++) {
    if (!n.walkable[i] || n.components[i] !== -1) continue;
    const queue = [i];
    n.components[i] = component;
    for (let q = 0; q < queue.length; q++) for (const j of n.neighbors[queue[q]]) {
      if (n.components[j] !== -1) continue;
      n.components[j] = component;
      queue.push(j);
    }
    component++;
  }
  return n;
}

/** Deterministic tie breaks by node index. Disconnected targets resolve within the start component. */
export function findPath(n: Navigation, sx: number, sy: number, tx: number, ty: number): number[] {
  'worklet';
  if (clearSegment(sx, sy, tx, ty, n.blockers, n.radius)) return [tx, ty];
  let start = -1;
  let best = Infinity;
  for (let i = 0; i < n.walkable.length; i++) {
    if (!n.walkable[i]) continue;
    const d = (nodeX(n, i) - sx) ** 2 + (nodeY(n, i) - sy) ** 2;
    if (d < best && clearSegment(sx, sy, nodeX(n, i), nodeY(n, i), n.blockers, n.radius)) { start = i; best = d; }
  }
  if (start < 0) return [];
  let goal = start;
  best = Infinity;
  for (let i = 0; i < n.walkable.length; i++) {
    if (n.components[i] !== n.components[start]) continue;
    const d = (nodeX(n, i) - tx) ** 2 + (nodeY(n, i) - ty) ** 2;
    if (d < best) { best = d; goal = i; }
  }
  const cost = new Array(n.walkable.length).fill(Infinity);
  const parent = new Array(n.walkable.length).fill(-1);
  const closed = new Array(n.walkable.length).fill(false);
  const open = [start];
  cost[start] = 0;
  while (open.length > 0) {
    let pick = 0;
    let score = Infinity;
    for (let k = 0; k < open.length; k++) {
      const i = open[k];
      const f = cost[i] + Math.hypot(nodeX(n, i) - nodeX(n, goal), nodeY(n, i) - nodeY(n, goal));
      if (f < score || (f === score && i < open[pick])) { score = f; pick = k; }
    }
    const current = open.splice(pick, 1)[0];
    if (current === goal) break;
    closed[current] = true;
    const adjacent = n.neighbors[current];
    for (let k = 0; k < adjacent.length; k++) {
      const j = adjacent[k];
      if (closed[j]) continue;
      const next = cost[current] + Math.hypot(nodeX(n, current) - nodeX(n, j), nodeY(n, current) - nodeY(n, j));
      if (next >= cost[j]) continue;
      if (cost[j] === Infinity) open.push(j);
      cost[j] = next;
      parent[j] = current;
    }
  }
  const reverse: number[] = [];
  for (let i = goal; i !== -1; i = parent[i]) reverse.push(i);
  const raw: number[] = [];
  for (let k = reverse.length - 1; k >= 0; k--) raw.push(nodeX(n, reverse[k]), nodeY(n, reverse[k]));
  if (clearSegment(nodeX(n, goal), nodeY(n, goal), tx, ty, n.blockers, n.radius)) raw.push(tx, ty);
  // String pulling uses the same expanded geometry as all movement.
  const path: number[] = [];
  let ax = sx;
  let ay = sy;
  for (let k = 0; k < raw.length; ) {
    let end = k;
    for (let j = k + 2; j < raw.length; j += 2) {
      if (clearSegment(ax, ay, raw[j], raw[j + 1], n.blockers, n.radius)) end = j;
    }
    ax = raw[end]; ay = raw[end + 1];
    path.push(ax, ay);
    k = end + 2;
  }
  return path;
}
