/**
 * Data-only stage description. New stages are added by writing another
 * StageDefinition; no rendering or gameplay code should need to change.
 *
 * All positions are in TILE units (floats allowed). `compileStage` converts
 * them to world units (pixels at zoom 1) once at load.
 */

export type StageTheme = 'museum' | 'gallery' | 'bank' | 'lab' | 'casino' | 'mansion' | 'warehouse' | 'security' | 'blacksite' | 'vault';
export type ValuableKind = 'diamond' | 'painting' | 'vaultGem' | 'prototype' | 'jewel' | 'artifact' | 'case' | 'data' | 'classified' | 'masterDiamond';

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
  'labWall' | 'labGlassWall' | 'labSlidingDoor' | 'labGlassCorridor' | 'labSterilePartition' | 'labExperimentMachine' | 'labLargeTable' | 'labCryoUnit' | 'labEquipmentRack' | 'labSampleStorage' | 'labObservationConsole' | 'labWorkstation' | 'labCart' | 'labSampleCase' | 'labSmallMachine' | 'labStool' | 'labMonitor' | 'labWarningSign' | 'labSpecimenContainer' | 'labCable' | 'labWallScreen' | 'labFloorMarker' | 'labPrototypeMachine' | 'labCryoChamber' | 'labCentralExperiment' | 'labObservationRoom' | 'casinoWall' | 'casinoVelvetPartition' | 'casinoGoldArch' | 'casinoVipDoor' | 'casinoBarCounter' | 'casinoSlotBank' | 'casinoRouletteTable' | 'casinoBlackjackTable' | 'casinoCashierCage' | 'casinoBarIsland' | 'casinoSecurityStation' | 'casinoSlotMachine' | 'casinoChair' | 'casinoCocktailTable' | 'casinoDivider' | 'casinoChipCart' | 'casinoChandelier' | 'casinoWallArt' | 'casinoDrinkTray' | 'casinoNeonSignGeneric' | 'casinoCarpetPattern' | 'casinoChipStack' | 'casinoRouletteCenterpiece' | 'casinoHighRollerTable' | 'casinoCashierVault' | 'casinoVipRoom'
  | 'bankWall' | 'bankStaffDoor' | 'bankSecurityGate' | 'bankVaultCorridorWall'
  | 'bankTellerCounter' | 'bankSecurityCheckpoint' | 'bankDepositBoxWall' | 'bankCashProcessingTable' | 'bankVaultDoor'
  | 'bankOfficeDesk' | 'bankFilingCabinet' | 'bankCashCart' | 'bankQueueBarrier' | 'bankSmallSafe'
  | 'bankMonitor' | 'bankClock' | 'bankPaperwork' | 'bankFloorMarker' | 'bankPlant' | 'bankMainVault'
  | 'galleryGlassPanel' | 'galleryGlassPanelVertical'
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
  | 'door' | 'counter' | 'table' | 'shelf' | 'partition' | 'equipment' | 'sofa' | 'objectiveCase';

export interface PropDef {
  /** Production artwork selection only; physical kind and its role remain independent. */
  visualAssetId?: import('../../assets/environmentKit').EnvironmentAssetId;
  kind: PropKind;
  /** Base (floor contact) center, tile units. Wall-mounted props use the wall face base. */
  x: number;
  y: number;
  /** Optional per-instance scale on top of the kit default. */
  scale?: number;
  /** Explicit physical scale for authored large cover; omitted preserves legacy collision. */
  collisionScale?: number;
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

export interface DressingItem {
  /** Approved environment sprite; physical contract still comes from kind. */
  visualAssetId?: import('../../assets/environmentKit').EnvironmentAssetId;
  kind: import('../world/dressingKit').DressingKind;
  /** Floor-contact bottom-centre anchor, tile units; wall details use mountHeight. */
  x:number;y:number;scale?:number;flip?:boolean;
}
export interface DressingCluster {
  id:string;
  zoneId:string;
  /** Authored exhibit/utility purpose, not a random decoration bucket. */
  identity:string;
  items:DressingItem[];
  light?:LightDef;
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
  /** Semantic subject to face while stopped, in tile coordinates. */
  lookTarget?: { x: number; y: number };
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
  mode: 'loop' | 'pingpong' | 'waitAndLook' | 'roaming';
}

/** Fixed security device; angles are radians, positions/range are tiles. */
export interface SecurityCameraDef {
  id:string;x:number;y:number;centerFacing:number;
  /** HALF excursion from center; visionAngle below is FULL cone width. */
  sweepAngle:number;sweepSpeed:number;pauseAtEnds:number;range:number;visionAngle:number;
  suspicionRate?:number;
}
export interface TheftSearchSector {id:string;anchors:{x:number;y:number}[];}
export interface GuardDef {
  theftSearchSectors?:TheftSearchSector[];
  role?: 'objective' | 'room' | 'corridor' | 'roaming' | 'exit';
  id: string;
  x: number;
  y: number;
  facing: number;
  initialFacing?: number;
  initialLookTarget?: { x: number; y: number };
  theftRole?: 'objective' | 'corridor' | 'exit' | 'zone' | 'roaming';
  /** Authored investigation destinations; never the hidden player's position. */
  theftPosts?: { x: number; y: number }[];
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
  cameras?:SecurityCameraDef[];
  patrolPlan?: import('./semanticPatrol').PatrolPlan;
  entryEdge?: 'top'|'bottom'|'left'|'right';
  entryPosition?: {x:number;y:number};
  exitEdge?: 'top'|'bottom'|'left'|'right';
  exitPosition?: {x:number;y:number};
  landmark?: {name:string;kind:PropKind;x:number;y:number};
  chapter?:number;
  mission?:number;
  structurePlan?:string;
  securityZones?:{name:string;x:number;y:number;radius:number;guardId?:string}[];
  id: string;
  number: number;
  title: string;
  theme: StageTheme;
  layout: LayoutRow[];
  carpets?: CarpetDef[];
  props: PropDef[];
  /** Authored low exhibits and decor, separate from existing gameplay structures. */
  dressing?:DressingCluster[];
  lights: LightDef[];
  playerSpawn: { x: number; y: number; facing: number };
  /** `highSecurity`: the pickup itself trips an alarm after a short delay (no guard has to see the empty case). */
  objective?: { kind: ValuableKind; x: number; y: number; highSecurity?: boolean };
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
  objectiveZone?: { guardId: string; spotlight: boolean };
}
