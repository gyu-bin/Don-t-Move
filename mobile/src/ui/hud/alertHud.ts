import type { GamePhase } from '../../game/guards/guardBrain';

/** Runtime state only; no chapter or mission identity enters this decision. */
export function alertHudVisible(phase: GamePhase, remaining: number, lockdown: boolean, finished: boolean): boolean {
  return !finished && (phase !== 'STEALTH' || remaining > 0 || lockdown);
}
