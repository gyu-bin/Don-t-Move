import type { LightDef, PropKind, StageDefinition } from '../levels/StageDefinition';
import type { Rect } from '../core/types';
import { PROP_KIT } from './propKit';

/** World units per tile. Characters are ~1.1 tiles tall on screen. */
export const TILE = 40;
/** Visual height of a wall's front face (world units). */
export const WALL_HEIGHT = 34;

export const Cell = { Void: 0, Floor: 1, Wall: 2 } as const;

export interface CompiledProp {
  kind: PropKind;
  /** Base point, world units. */
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  /** Painter's-order key (world y of the base). */
  sortY: number;
}

export interface CompiledLight {
  x: number;
  y: number;
  radius: number;
  kind: LightDef['kind'];
  intensity: number;
}

export interface CompiledGuard {
  id: string;
  x: number;
  y: number;
  facing: number;
  route: { x: number; y: number; wait: number; look: number; turnDuration?: number }[];
  routeMode: 'loop' | 'pingpong' | 'waitAndLook';
  escapePatrol?: { pace?: number; waitDuration?: number; lookDirection?: number };
  startDelay: number;
  pace: number;
  visionRange: number;
  visionHalfAngle: number;
}

export interface CompiledStage {
  def: StageDefinition;
  cols: number;
  rows: number;
  width: number;
  height: number;
  /** Row-major Cell codes. */
  grid: Uint8Array;
  wallRects: Rect[];
  props: CompiledProp[];
  lights: CompiledLight[];
  /** Flattened [x0,y0,x1,y1,...] AABBs; consumed by worklets. */
  movementBlockers: number[];
  visionBlockers: number[];
  guards: CompiledGuard[];
  playerSpawn: { x: number; y: number; facing: number };
  objective: { x: number; y: number };
  exit: Rect;
}

/** Merge horizontal wall runs, then stack identical runs vertically. */
function mergeWalls(grid: Uint8Array, cols: number, rows: number): Rect[] {
  const runs: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (grid[r * cols + c] !== Cell.Wall) {
        c++;
        continue;
      }
      const start = c;
      while (c < cols && grid[r * cols + c] === Cell.Wall) c++;
      runs.push({ x: start, y: r, w: c - start, h: 1 });
    }
  }
  const merged: Rect[] = [];
  for (const run of runs) {
    const above = merged.find((m) => m.x === run.x && m.w === run.w && m.y + m.h === run.y);
    if (above) above.h += 1;
    else merged.push({ ...run });
  }
  return merged.map((m) => ({ x: m.x * TILE, y: m.y * TILE, w: m.w * TILE, h: m.h * TILE }));
}

export function compileStage(def: StageDefinition): CompiledStage {
  const rows = def.layout.length;
  const cols = Math.max(...def.layout.map((r) => r.length));
  const grid = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const line = def.layout[r];
    for (let c = 0; c < cols; c++) {
      const ch = line[c] ?? ' ';
      grid[r * cols + c] = ch === '#' ? Cell.Wall : ch === ' ' ? Cell.Void : Cell.Floor;
    }
  }

  const wallRects = mergeWalls(grid, cols, rows);
  const movementBlockers: number[] = [];
  const visionBlockers: number[] = [];
  for (const w of wallRects) {
    movementBlockers.push(w.x, w.y, w.x + w.w, w.y + w.h);
    visionBlockers.push(w.x, w.y, w.x + w.w, w.y + w.h);
  }

  const props: CompiledProp[] = def.props.map((p) => {
    const spec = PROP_KIT[p.kind];
    const x = p.x * TILE;
    const y = p.y * TILE;
    const fw = spec.footprint.w * TILE;
    const fh = spec.footprint.h * TILE;
    if (fw > 0 && fh > 0) {
      const box = [x - fw / 2, y - fh, x + fw / 2, y];
      if (spec.blocksMovement) movementBlockers.push(...box);
      if (spec.blocksVision) visionBlockers.push(...box);
    }
    return { kind: p.kind, x, y, scale: p.scale ?? 1, flip: !!p.flip, sortY: y };
  });

  const routes = new Map(def.patrolRoutes.map((r) => [r.id, r]));
  const guards: CompiledGuard[] = def.guards.map((g) => {
    const route = g.routeId ? routes.get(g.routeId) : undefined;
    return {
      id: g.id,
      x: g.x * TILE,
      y: g.y * TILE,
      facing: g.facing,
      route: (route?.points ?? []).map((p) => ({
        x: p.x * TILE,
        y: p.y * TILE,
        wait: p.waitDuration ?? p.wait ?? (route?.mode === 'waitAndLook' ? 2 : 0),
        look: p.lookDirection ?? p.look ?? Number.NaN,
        turnDuration: p.turnDuration ?? 0.7,
      })),
      routeMode: route?.mode ?? 'loop',
      escapePatrol: g.escapePatrol,
      startDelay: g.startDelay ?? 0,
      pace: g.pace ?? 1,
      visionRange: (g.visionRange ?? 5) * TILE,
      visionHalfAngle: g.visionHalfAngle ?? (34 * Math.PI) / 180,
    };
  });

  return {
    def,
    cols,
    rows,
    width: cols * TILE,
    height: rows * TILE,
    grid,
    wallRects,
    props,
    lights: def.lights.map((l) => ({
      x: l.x * TILE,
      y: l.y * TILE,
      radius: l.radius * TILE,
      kind: l.kind,
      intensity: l.intensity,
    })),
    movementBlockers,
    visionBlockers,
    guards,
    playerSpawn: { x: def.playerSpawn.x * TILE, y: def.playerSpawn.y * TILE, facing: def.playerSpawn.facing },
    objective: { x: (def.objective?.x ?? 0) * TILE, y: (def.objective?.y ?? 0) * TILE },
    exit: { x: (def.exit?.x ?? 0) * TILE, y: (def.exit?.y ?? 0) * TILE, w: (def.exit?.w ?? 0) * TILE, h: (def.exit?.h ?? 0) * TILE },
  };
}
