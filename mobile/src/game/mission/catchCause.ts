import { Awareness } from '../core/types';

/** Why the thief was caught, as the CAUGHT screen explains it (Gameplay Improvement v2). */
export type CatchCause = 'guardContact' | 'guardChase' | 'cameraChase';

export interface CatchSnapshot {
  events: { caughtBy: string; globalAlert: boolean; spottedSource?: string; cameraAlertRevision?: number };
  guards: { id: string; awareness: number }[];
  securityCameras?: { id: string }[];
}

/**
 * Contact with a guard who had not raised the alarm (patrolling, glancing, or walking to where he last saw the thief)
 * is `guardContact` — the capture rule (GAME_RULES §32) is the same in every state, but the player saw no "!".
 * Otherwise the alarm was up: `cameraChase` when a camera started the episode, `guardChase` when a guard did.
 */
export function catchCause(s: CatchSnapshot): CatchCause {
  const catcher = s.guards.find((g) => g.id === s.events.caughtBy);
  const alarmed = s.events.globalAlert || catcher?.awareness === Awareness.Alert || catcher?.awareness === Awareness.Chase;
  if (!alarmed) return 'guardContact';
  const cameraIds = new Set((s.securityCameras ?? []).map((c) => c.id));
  return s.events.spottedSource && cameraIds.has(s.events.spottedSource) ? 'cameraChase' : 'guardChase';
}

export const CATCH_CAUSE_KEY = { guardContact: 'catchContact', guardChase: 'catchChase', cameraChase: 'catchCamera' } as const;
