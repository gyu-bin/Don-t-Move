import { createDoor } from '../doors/doorSystem';
import type { DoorDefinition } from '../doors/doorTypes';
import type { LightDef, PropKind, StageDefinition } from '../levels/StageDefinition';
import type { Rect } from '../core/types';
import { PROP_KIT } from './propKit';
import { DRESSING_KIT } from './dressingKit';
import { patrolPlan } from '../levels/semanticPatrol';

/** World units per tile. Characters are ~1.1 tiles tall on screen. */
export const TILE = 40;
/** Visual height of a wall's front face (world units). */
export const WALL_HEIGHT = 34;

export const Cell = { Void: 0, Floor: 1, Wall: 2 } as const;

export interface CompiledProp {
  visualAssetId?: import('../../assets/environmentKit').EnvironmentAssetId;
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
  theftSearchSectors?:import('../levels/StageDefinition').TheftSearchSector[];
  semanticPatrol?: boolean;
  theftRole?: 'objective' | 'corridor' | 'exit' | 'zone' | 'roaming';
  theftPosts?: { x: number; y: number }[];
  id: string;
  x: number;
  y: number;
  facing: number;
  route: { x: number; y: number; wait: number; look: number; turnDuration?: number }[];
  routeMode: 'loop' | 'pingpong' | 'waitAndLook' | 'roaming';
  escapePatrol?: { pace?: number; waitDuration?: number; lookDirection?: number };
  startDelay: number;
  pace: number;
  visionRange: number;
  visionHalfAngle: number;
}

export interface CompiledStage {
  def: StageDefinition;
  doors?: DoorDefinition[];
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
  cameras?:import('../security/cctv').CompiledSecurityCamera[];
  playerSpawn: { x: number; y: number; facing: number };
  objective: { x: number; y: number };
  exit: Rect;
}

/** Merge horizontal wall runs, then stack identical runs vertically. */
function mergeWalls(grid: Uint8Array, cols: number, rows: number, cell: number = Cell.Wall): Rect[] {
  const runs: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (grid[r * cols + c] !== cell) {
        c++;
        continue;
      }
      const start = c;
      while (c < cols && grid[r * cols + c] === cell) c++;
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
  const doors = (def.doors ?? []).map(door => {
    const compiled = {...door,x:door.x*TILE,y:door.y*TILE,width:door.width*TILE,thickness:door.thickness*TILE,
      ...(door.occupancyMargin !== undefined ? {occupancyMargin:door.occupancyMargin*TILE} : {})};
    createDoor(compiled); // Validate before any nonfinite shape reaches UI worklets.
    return compiled;
  });
  if (new Set(doors.map(door=>door.id)).size !== doors.length) throw new Error(`${def.id}: duplicate door id`);
  for (const id of def.lockdownDoors ?? []) {
    const door=doors.find(door=>door.id===id);
    if (!door || door.lockdownBehavior === 'stayOpen') throw new Error(`${def.id}: invalid lockdown door ${id}`);
  }
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

  // Museum floors can end at an authored entrance/exit aperture. Void and
  // the outside rim need physical collision even where no visible wall exists.
  // Keep other chapters' movement/vision contracts unchanged.
  if (def.chapter === 1) {
    for (const r of mergeWalls(grid, cols, rows, Cell.Void)) {
      movementBlockers.push(r.x, r.y, r.x + r.w, r.y + r.h);
    }
    const width = cols * TILE, height = rows * TILE;
    movementBlockers.push(
      -TILE, -TILE, 0, height + TILE,
      width, -TILE, width + TILE, height + TILE,
      0, -TILE, width, 0,
      0, height, width, height + TILE,
    );
  }

  // Glass Gallery's top-row room has no authored wall cell above y=0.
  // Navigation already blocks this outside rim; match Player collision to it.
  // Outside-only: no floor, glass, LOS or interior route is changed.
  if (def.id === '02-06') movementBlockers.push(0, -TILE, cols * TILE, 0);

  const props: CompiledProp[] = def.props.map((p) => {
    const spec = PROP_KIT[p.kind];
    const x = p.x * TILE;
    const y = p.y * TILE;
    const glass=p.kind==='galleryGlassPanel'||p.kind==='galleryGlassPanelVertical';
    const bank=p.kind.startsWith('bank');
    const labCasino=p.kind.startsWith('lab')||p.kind.startsWith('casino');
    const physicalScale=p.collisionScale??(glass||bank||labCasino?(p.scale??1):1);
    if((bank||labCasino)&&(!Number.isFinite(p.scale??1)||(p.scale??1)<=0||!Number.isFinite(physicalScale)||physicalScale<=0||physicalScale!==(p.scale??1)))throw Error(`${def.id}: Bank visual/collision scale must be finite, positive and equal`);
    if(glass&&physicalScale!==(p.scale??1))throw Error(`${def.id}: glass visual/collision scale mismatch`);
    const fw = spec.footprint.w * TILE * physicalScale;
    const fh = spec.footprint.h * TILE * physicalScale;
    if (fw > 0 && fh > 0) {
      const boxes = spec.collisionParts?.map(part=>{
        if(![part.x,part.y,part.w,part.h].every(Number.isFinite)||part.w<=0||part.h<=0)throw new Error(`Invalid compound prop collider: ${p.kind}`);
        return [x+part.x*TILE*physicalScale,y+part.y*TILE*physicalScale,x+(part.x+part.w)*TILE*physicalScale,y+(part.y+part.h)*TILE*physicalScale];
      }) ?? [[x - fw / 2, y - fh, x + fw / 2, y]];
      for(const box of boxes){
        if (spec.blocksMovement) movementBlockers.push(...box);
        if (spec.blocksVision) visionBlockers.push(...box);
      }
    }
    return { kind: p.kind, ...(p.visualAssetId ? {visualAssetId:p.visualAssetId} : {}), x, y, scale: p.scale ?? 1, flip: !!p.flip, sortY: y };
  });

  for(const cluster of def.dressing??[])for(const item of cluster.items){
    const spec=DRESSING_KIT[item.kind],scale=item.scale??1;
    if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(item.x)||!Number.isFinite(item.y))throw new Error(`Invalid dressing transform: ${cluster.id}/${item.kind}`);
    if(spec.blocksMovement){
      const x=item.x*TILE,y=item.y*TILE,w=spec.footprint.w*scale*TILE,h=spec.footprint.h*scale*TILE;
      movementBlockers.push(x-w/2,y-h,x+w/2,y);
    }
  }

  const routes = new Map(def.patrolRoutes.map((r) => [r.id, r]));
  const plan = patrolPlan(def);
  const guards: CompiledGuard[] = def.guards.map((g) => {
    const route = g.routeId ? routes.get(g.routeId) : undefined;
    const assignment = plan?.assignments.find(a => a.guardId === g.id);
    const anchors = assignment?.anchors.map(id => {
      const anchor = plan?.anchors.find(a => a.id === id);
      if (!anchor || !assignment.zones.includes(anchor.zone)) throw new Error(`Invalid patrol assignment: ${g.id}/${id}`);
      return anchor;
    });
    return {
      semanticPatrol: !!assignment,
      id: g.id,
      x: g.x * TILE,
      y: g.y * TILE,
      facing: g.initialLookTarget ? Math.atan2(g.initialLookTarget.y-g.y,g.initialLookTarget.x-g.x) : g.initialFacing ?? g.facing,
      ...(def.chapter === 1 || def.id === '02-10' || g.theftPosts || g.theftSearchSectors ? {
        theftRole: g.theftRole ?? (g.role === 'room' ? 'zone' : g.role ?? 'zone'),
        theftPosts: (g.theftPosts ?? anchors ?? route?.points ?? [{x:g.x,y:g.y}]).map(p=>({x:p.x*TILE,y:p.y*TILE})),
      } : {}),
      theftSearchSectors:g.theftSearchSectors?.map(sector=>({id:sector.id,anchors:sector.anchors.map(p=>({x:p.x*TILE,y:p.y*TILE}))})),
      route: anchors ? anchors.map(p => ({x:p.x*TILE,y:p.y*TILE,wait:p.wait,look:p.look,turnDuration:1.1})) : (route?.points ?? []).map((p) => ({
        x: p.x * TILE,
        y: p.y * TILE,
        wait: p.waitDuration ?? p.wait ?? (route?.mode === 'waitAndLook' ? 2 : 0),
        look: p.lookTarget ? Math.atan2(p.lookTarget.y-p.y,p.lookTarget.x-p.x) : p.lookDirection ?? p.look ?? Number.NaN,
        turnDuration: p.turnDuration ?? 0.7,
      })),
      routeMode: assignment ? (assignment.roaming ? 'roaming' : 'loop') : route?.mode ?? 'loop',
      escapePatrol: g.escapePatrol,
      startDelay: g.startDelay ?? 0,
      pace: g.pace ?? 1,
      visionRange: (g.visionRange ?? 5) * TILE,
      visionHalfAngle: g.visionHalfAngle ?? (34 * Math.PI) / 180,
    };
  });

  return {
    def,
    ...(doors.length ? {doors} : {}),
    cols,
    rows,
    width: cols * TILE,
    height: rows * TILE,
    grid,
    wallRects,
    props,
    lights: [...def.lights,...(def.dressing??[]).flatMap(c=>c.light?[c.light]:[])].map((l) => ({
      x: l.x * TILE,
      y: l.y * TILE,
      radius: l.radius * TILE,
      kind: l.kind,
      intensity: l.intensity,
    })),
    movementBlockers,
    visionBlockers,
    guards,
    cameras:(def.cameras??[]).map(camera=>{
      if(!camera.id||![camera.x,camera.y,camera.centerFacing,camera.sweepAngle,camera.sweepSpeed,camera.pauseAtEnds,camera.range,camera.visionAngle,camera.suspicionRate??.62].every(Number.isFinite)||camera.range<=0||camera.sweepAngle<0||camera.sweepAngle>Math.PI||camera.sweepSpeed<0||camera.pauseAtEnds<0||camera.visionAngle<=0||camera.visionAngle>=Math.PI|| (camera.suspicionRate??.62)<=0)throw new Error(`Invalid security camera: ${camera.id}`);
      return {...camera,x:camera.x*TILE,y:camera.y*TILE,range:camera.range*TILE};
    }),
    playerSpawn: { x: def.playerSpawn.x * TILE, y: def.playerSpawn.y * TILE, facing: def.playerSpawn.facing },
    objective: { x: (def.objective?.x ?? 0) * TILE, y: (def.objective?.y ?? 0) * TILE },
    exit: { x: (def.exit?.x ?? 0) * TILE, y: (def.exit?.y ?? 0) * TILE, w: (def.exit?.w ?? 0) * TILE, h: (def.exit?.h ?? 0) * TILE },
  };
}
