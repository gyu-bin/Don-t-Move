import type { Rect } from '../core/types';
import type { DoorActor, DoorDefinition, DoorGeometry, DoorRuntime } from './doorTypes';

export const DEFAULT_DOOR_CLOSE_SECONDS = 0.65;
export const DEFAULT_DOOR_OCCUPANCY_MARGIN = 2;

/** Authoring errors fail at load, before nonfinite geometry reaches worklets. */
export function createDoor(def: DoorDefinition): DoorRuntime {
  if (!def.id || ![def.x, def.y, def.width, def.thickness].every(Number.isFinite) ||
      def.width <= 0 || def.thickness <= 0 ||
      (def.orientation !== 'horizontal' && def.orientation !== 'vertical') ||
      (def.type !== 'solid' && def.type !== 'glass') ||
      (def.style !== undefined && !['museumExhibition4c','museumRestrictedCollection4c','museumSecurity4c','galleryMinimal4c','galleryGlassSliding4c','galleryPrivateCollection4c','bankStaff4c','bankSecurity4c','bankSecurityPortal4c','bankVault4c','labSliding4c','labRestrictedGlass4c','labPrototypeSecurity4c','museumExhibition','museumRestrictedCollection','museumSecurity','galleryMinimal','galleryGlassSliding','galleryPrivateCollection','bankStaff','bankSecurity','bankVault','labSliding','labRestrictedGlass','casinoVip4d','casinoSecurity4d','casinoVip','casinoStaff','mansionWood','mansionLibrary','warehouseIndustrial','hqSteel','vaultReinforced'].includes(def.style)) ||
      !Number.isFinite(def.closeDuration ?? DEFAULT_DOOR_CLOSE_SECONDS) ||
      (def.closeDuration ?? DEFAULT_DOOR_CLOSE_SECONDS) <= 0 ||
      !Number.isFinite(def.occupancyMargin ?? DEFAULT_DOOR_OCCUPANCY_MARGIN) ||
      (def.occupancyMargin ?? DEFAULT_DOOR_OCCUPANCY_MARGIN) < 0 ||
      (def.initialState !== undefined && !['OPEN', 'CLOSING', 'CLOSED'].includes(def.initialState))) {
    throw new Error(`Invalid physical door: ${def.id}`);
  }
  const state = def.initialState ?? 'OPEN';
  return {
    ...def, state, progress: state === 'CLOSED' ? 1 : 0,
    pausedForOccupancy: false, collisionRevision: 0,
  };
}

/** Closed leaf AABB; width always follows the opening's orientation. */
export function doorRect(door: DoorDefinition): Rect {
  'worklet';
  const w = door.orientation === 'horizontal' ? door.width : door.thickness;
  const h = door.orientation === 'horizontal' ? door.thickness : door.width;
  return { x: door.x - w / 2, y: door.y - h / 2, w, h };
}

export function doorOccupied(door: DoorDefinition, actors: readonly DoorActor[]): boolean {
  'worklet';
  const rect = doorRect(door);
  const margin = door.occupancyMargin ?? DEFAULT_DOOR_OCCUPANCY_MARGIN;
  for (let i = 0; i < actors.length; i++) {
    const actor = actors[i];
    // An invalid actor is not evidence that an opening is safe to close.
    if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y) ||
        !Number.isFinite(actor.radius) || actor.radius < 0) return true;
    const nearX = Math.max(rect.x, Math.min(actor.x, rect.x + rect.w));
    const nearY = Math.max(rect.y, Math.min(actor.y, rect.y + rect.h));
    const dx = actor.x - nearX, dy = actor.y - nearY;
    const radius = actor.radius + margin;
    // Contact is occupied too, not just a body centre inside the leaf.
    if (dx * dx + dy * dy <= radius * radius) return true;
  }
  return false;
}

/**
 * Explicit closure requests are latched by CLOSING. Countdown policy lives in
 * the caller. The opening stays physically passable until safe full closure;
 * no actor coordinates are changed here. Returns true on geometry change.
 */
export function stepDoor(door: DoorRuntime, dt: number, closeRequested: boolean,
  actors: readonly DoorActor[]): boolean {
  'worklet';
  if (!Number.isFinite(dt) || dt <= 0 || door.state === 'CLOSED') return false;
  if (door.state === 'OPEN') {
    if (!closeRequested) return false;
    door.state = 'CLOSING';
  }
  door.pausedForOccupancy = doorOccupied(door, actors);
  if (door.pausedForOccupancy) return false;
  const next = Math.min(1, door.progress + dt / (door.closeDuration ?? DEFAULT_DOOR_CLOSE_SECONDS));
  // Check current actor bodies at the commit point, including large dt steps.
  // The caller supplies actors after movement, not an old frame's snapshot.
  if (next >= 1 && doorOccupied(door, actors)) {
    door.pausedForOccupancy = true;
    return false;
  }
  door.progress = next;
  if (next < 1) return false;
  door.state = 'CLOSED';
  door.pausedForOccupancy = false;
  door.collisionRevision++;
  return true;
}

/** Returns number of geometry changes; caller can invalidate nav once per tick. */
export function stepDoors(doors: DoorRuntime[], dt: number, closeRequestedIds: readonly string[],
  actors: readonly DoorActor[]): number {
  'worklet';
  let changed = 0;
  for (let i = 0; i < doors.length; i++) {
    if (stepDoor(doors[i], dt, closeRequestedIds.includes(doors[i].id), actors)) changed++;
  }
  return changed;
}

/** Compose fresh geometry without mutating the static stage or navigation. */
export function doorBlockers(doors: readonly DoorRuntime[], baseMovement: number[] = [],
  baseVision: number[] = []): DoorGeometry {
  'worklet';
  const movementBlockers = baseMovement.slice(), visionBlockers = baseVision.slice();
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    if (door.state !== 'CLOSED') continue;
    const rect = doorRect(door);
    movementBlockers.push(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    if (door.type === 'solid') visionBlockers.push(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  }
  return { movementBlockers, visionBlockers };
}
