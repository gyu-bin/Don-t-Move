/** Physical door data uses WORLD PIXELS, not stage tile coordinates. */
export type DoorState = 'OPEN' | 'CLOSING' | 'CLOSED';
export type DoorType = 'solid' | 'glass';
export type DoorOrientation = 'horizontal' | 'vertical';
export type DoorStyle =
  | 'museumExhibition4c' | 'museumRestrictedCollection4c' | 'museumSecurity4c'
  | 'galleryMinimal4c' | 'galleryGlassSliding4c' | 'galleryPrivateCollection4c'
  | 'bankStaff4c' | 'bankSecurity4c' | 'bankSecurityPortal4c' | 'bankVault4c'
  | 'labSliding4c' | 'labRestrictedGlass4c' | 'labPrototypeSecurity4c'
  | 'museumExhibition' | 'museumRestrictedCollection' | 'museumSecurity'
  | 'galleryMinimal' | 'galleryGlassSliding' | 'galleryPrivateCollection'
  | 'bankStaff' | 'bankSecurity' | 'bankVault'
  | 'labSliding' | 'labRestrictedGlass'
  | 'casinoVip4d' | 'casinoSecurity4d'
  | 'casinoVip' | 'casinoStaff' | 'mansionWood' | 'mansionLibrary'
  | 'warehouseIndustrial' | 'hqSteel' | 'vaultReinforced';

export interface DoorDefinition {
  id: string;
  type: DoorType;
  style?: DoorStyle;
  /** Centre of the clear opening, in world pixels. */
  x: number;
  y: number;
  /** Opening span and closed leaf thickness, in world pixels. */
  width: number;
  thickness: number;
  orientation: DoorOrientation;
  initialState?: DoorState;
  /** Seconds of unobstructed animation needed to close. */
  closeDuration?: number;
  /** Additional clearance beyond the actor's full body radius, world pixels. */
  occupancyMargin?: number;
  /** Metadata only. The caller decides when to request closure. */
  lockdownBehavior?: 'close' | 'stayOpen';
}

export interface DoorRuntime extends DoorDefinition {
  state: DoorState;
  /** 0 = fully open, 1 = fully closed. Never advances while occupied. */
  progress: number;
  pausedForOccupancy: boolean;
  /** Increments only when physical collision/LOS geometry changes. */
  collisionRevision: number;
}

/** Player and guards use the same occupancy safety contract. */
export interface DoorActor {
  x: number;
  y: number;
  radius: number;
}

export interface DoorGeometry {
  movementBlockers: number[];
  visionBlockers: number[];
}
