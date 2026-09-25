/**
 * Data-only stage description. New stages are added by writing another
 * StageDefinition; no rendering or gameplay code should need to change.
 *
 * All positions are in TILE units (floats allowed). `compileStage` converts
 * them to world units (pixels at zoom 1) once at load.
 */

export type StageTheme = 'museum' | 'bank' | 'lab' | 'casino' | 'blacksite';

/**
 * Layout grid legend (one character per tile):
 *   '#'  wall
 *   '.'  floor
 *   ' '  void (outside the building, never rendered)
 * Irregular shapes (L, U, S, ring, multi-room, asymmetric) are expressed by
 * mixing walls and void; the grid does not have to be rectangular inside.
 */
export type LayoutRow = string;

export type PropKind =
  | 'statue'
  | 'statuePedestal'
  | 'displayCase'
  | 'diamondPedestal'
  | 'painting'
  | 'plant'
  | 'bench'
  | 'crate'
  | 'lamp'
  | 'cctv'
  | 'pillar'
  | 'door';

export interface PropDef {
  kind: PropKind;
  /** Base (floor contact) center, tile units. Wall-mounted props use the wall face base. */
  x: number;
  y: number;
  /** Optional per-instance scale on top of the kit default. */
  scale?: number;
  /** Horizontal mirror. */
  flip?: boolean;
}

export interface LightDef {
  x: number;
  y: number;
  /** Radius in tiles. */
  radius: number;
  kind: 'warm' | 'cool' | 'cyan' | 'green' | 'red';
  /** 0..1 */
  intensity: number;
}

export interface CarpetDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PatrolPoint {
  x: number;
  y: number;
  /** Seconds to stand still on arrival. */
  wait?: number;
  /** Facing (radians) while waiting; defaults to the arrival heading. */
  look?: number;
  waitDuration?: number;
  lookDirection?: number;
  turnDuration?: number;
}

export interface PatrolRoute {
  id: string;
  points: PatrolPoint[];
  mode: 'loop' | 'pingpong' | 'waitAndLook';
}

export interface GuardDef {
  id: string;
  x: number;
  y: number;
  facing: number;
  routeId?: string;
  /** Seconds before this guard starts patrolling — desynchronises guards. */
  startDelay?: number;
  /** Walk speed multiplier (1 = default). */
  pace?: number;
  /** Vision range in tiles, half-angle in radians. */
  visionRange?: number;
  visionHalfAngle?: number;
  /** Optional pressure after pickup; never grants knowledge of the player. */
  escapePatrol?: { pace?: number; waitDuration?: number; lookDirection?: number };
}

export interface StageDefinition {
  id: string;
  number: number;
  title: string;
  theme: StageTheme;
  layout: LayoutRow[];
  carpets?: CarpetDef[];
  props: PropDef[];
  lights: LightDef[];
  playerSpawn: { x: number; y: number; facing: number };
  objective?: { kind: 'diamond'; x: number; y: number };
  exit?: { x: number; y: number; w: number; h: number };
  /** Development acceptance target, independent of mission/diamond/exit rules. Tile units. */
  temporaryGoal?: { x: number; y: number; radius: number };
  testPurpose?: string;
  /** Authored reference paths for validation/documentation, not player autopilot. */
  testRoutes?: { name: string; points: { x: number; y: number }[] }[];
  /** Authored post-objective routes, beginning at the diamond and ending at the Exit centre. */
  escapeRoutes?: { name: string; points: { x: number; y: number }[] }[];
  /** Occluded or out-of-range waiting pockets used by gameplay validation. */
  safeZones?: { x: number; y: number; radius: number }[];
  guards: GuardDef[];
  patrolRoutes: PatrolRoute[];
  /** Global ambient darkness 0..1 (higher = darker). */
  ambientDarkness?: number;
}
