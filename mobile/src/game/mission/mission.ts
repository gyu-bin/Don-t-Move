import type { Rect } from '../core/types';
import { BODY } from '../guards/guardTuning';

export interface MissionState {
  enabled: boolean;
  treasure: boolean;
  complete: boolean;
  treasureRevision: number;
  completeRevision: number;
  objectiveX: number;
  objectiveY: number;
  exitX: number;
  exitY: number;
  exitW: number;
  exitH: number;
}

export const TREASURE_RADIUS = 13;

export function createMissionState(
  objective?: { x: number; y: number },
  exit?: Rect,
): MissionState {
  return {
    enabled: !!objective && !!exit && exit.w > 0 && exit.h > 0,
    treasure: false,
    complete: false,
    treasureRevision: 0,
    completeRevision: 0,
    objectiveX: objective?.x ?? 0,
    objectiveY: objective?.y ?? 0,
    exitX: exit?.x ?? 0,
    exitY: exit?.y ?? 0,
    exitW: exit?.w ?? 0,
    exitH: exit?.h ?? 0,
  };
}

function circleTouchesRect(x: number, y: number, radius: number, m: MissionState): boolean {
  'worklet';
  const cx = Math.max(m.exitX, Math.min(x, m.exitX + m.exitW));
  const cy = Math.max(m.exitY, Math.min(y, m.exitY + m.exitH));
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
}

/** Existing CAUGHT is terminal; the simulation checks an active Exit before new contact. */
export function stepMission(m: MissionState, x: number, y: number, caught: boolean): void {
  'worklet';
  if (!m.enabled || m.complete || caught) return;
  if (!m.treasure) {
    const dx = x - m.objectiveX;
    const dy = y - m.objectiveY;
    const pickup = BODY.playerRadius + TREASURE_RADIUS;
    if (dx * dx + dy * dy <= pickup * pickup) {
      m.treasure = true;
      m.treasureRevision++;
    }
    return;
  }
  if (circleTouchesRect(x, y, BODY.playerRadius, m)) {
    m.complete = true;
    m.completeRevision++;
  }
}
