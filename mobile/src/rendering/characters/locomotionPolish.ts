import { Anim } from '../sprites/spriteTypes';

/** Sub-pixel-scale whole-body lift; the contact shadow stays on the floor. */
export function locomotionBodyLift(phase: number, animation: number, actualSpeed: number): number {
  'worklet';
  if (actualSpeed <= 0.5) return 0;
  const amplitude = animation === Anim.Sneak ? 0.25
    : animation === Anim.Run ? 0.75 : animation === Anim.Walk ? 0.55 : 0;
  if (amplitude === 0) return 0;
  return amplitude * Math.min(1, actualSpeed / 30) * (0.5 - 0.5 * Math.cos(4 * Math.PI * phase));
}
