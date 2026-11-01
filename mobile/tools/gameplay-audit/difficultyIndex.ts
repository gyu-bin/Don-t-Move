/**
 * Diagnostic Difficulty Index (DDI). A published, fixed-constant formula used only to rank missions for review.
 * It is not perceived difficulty and does not replace the separate columns it is built from.
 */
export interface MissionMetrics {
  id:string; chapter:number; mission:number; title:string; theme:string;
  expertPlans:number; expertClear:number; expertUnseen:number; expertScore:number;
  bottleneckWindow:number; meanWindow:number; tightSegments:number; expertWaitSeconds:number; expertSeconds:number;
  gaitsUnseen:string[]; fastestGait:string; altEscapeNeeded:boolean;
  reactiveClearRate:number; reactiveContactShare:number; reactiveChaseShare:number; reactiveChaseEntries:number;
  reactiveClearAfterChase:number; reactiveDelaySensitivity:number;
  routeWatched:number; routeEverWatched:number; dangerSections:number; escapeWatched:number; overlapSamples:number;
  floorCells:number; guards:number; cameras:number; doors:number; blockingProps:number;
  shortestApproachTiles:number; safeRouteTiles:number; riskRouteTiles:number; quickEscapeTiles:number; altEscapeTiles:number;
}

const clamp01 = (v:number) => Math.max(0, Math.min(1, v));

/** Coverage reference: 10 danger sections across both authored approach routes saturates C. */
export const DANGER_SECTIONS_REF = 10;

export function difficultyIndex(m:MissionMetrics) {
  const P = clamp01(1 - m.expertScore);
  const W = clamp01(1 - m.bottleneckWindow);
  const N = clamp01(1 - m.reactiveClearRate);
  const C = clamp01(m.dangerSections / DANGER_SECTIONS_REF);
  const total = Math.round(100 * (0.30*P + 0.25*W + 0.25*N + 0.20*C));
  const r2 = (v:number) => +v.toFixed(2);
  return {total, parts:{P:r2(P), W:r2(W), N:r2(N), C:r2(C)}};
}

export const DDI_FORMULA = [
  '**DDI (Diagnostic Difficulty Index, 0–100)** = round(100 × (0.30·P + 0.25·W + 0.25·N + 0.20·C))',
  '',
  '- **P** expert pressure = 1 − mean over the 8 expert plans (2 authored approach routes × Sneak/Walk/Run/Mixed) of {unseen clear 1, clear after being spotted 0.5, no clear 0}.',
  '- **W** timing tightness = 1 − median, over the clear expert plans, of the bottleneck window (the smallest share of the 8 wait options 0–6 s that stay unseen at any segment). No clear plan → W = 1.',
  '- **N** naive failure = 1 − clear rate of the 54 reactive-bot runs (10 heuristic strategies × routes × start delays 0/2/4 s).',
  `- **C** coverage = min(1, danger sections on the safe + risk approach routes / ${DANGER_SECTIONS_REF}); a danger section is a run of route samples watched ≥ 25 % of a 60 s guard/CCTV cycle.`,
  '',
  'Weights are a design choice, not fitted to human data. DDI ranks missions for review only; every component is published next to it.',
].join('\n');
