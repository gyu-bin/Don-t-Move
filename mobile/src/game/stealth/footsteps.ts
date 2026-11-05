import { Gait } from '../core/types';
import { GAIT_SPEED } from '../core/locomotion';

export type FootstepSurface = 'stone' | 'wood' | 'concrete' | 'metal' | 'carpet';

export interface FootstepEvent {
  kind: 'footstep';
  x: number;
  y: number;
  t: number;
  gait: number;
  surface: FootstepSurface;
  strength: number;
  range: number;
}

export interface FootstepArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BASE_RANGE = [0, 34, 68, 116];
const BASE_STRENGTH = [0, 0.34, 0.63, 1];
const TRANSMISSION: Record<FootstepSurface, number> = {
  stone: 1, wood: 1.07, concrete: 0.94, metal: 1.16, carpet: 0.64,
};

/** Runtime sprite clips plant a foot at phase 0 and 0.5. No timer runs at rest. */
export function plantedFootstep(previousPhase: number, phase: number, distance: number, dt: number): boolean {
  'worklet';
  if (distance <= 0.5 * dt || distance > GAIT_SPEED[Gait.Run] * dt + 0.01) return false;
  return (previousPhase < 0.5) !== (phase < 0.5) || phase < previousPhase;
}

export function footstepAt(x: number, y: number, t: number, gait: number, floor: FootstepSurface,
  carpets: FootstepArea[]): FootstepEvent {
  'worklet';
  let surface = floor;
  for (let i = 0; i < carpets.length; i++) {
    const c = carpets[i];
    if (x >= c.x && y >= c.y && x < c.x + c.w && y < c.y + c.h) {
      surface = 'carpet';
      break;
    }
  }
  const transmission = TRANSMISSION[surface];
  return { kind: 'footstep', x, y, t, gait, surface,
    strength: BASE_STRENGTH[gait] * transmission, range: BASE_RANGE[gait] * transmission };
}
