import {damp} from '../core/math';
import {gaitFromSpeed, strideCycleLength} from '../core/locomotion';
import type {GuardState} from './guardBrain';

/** Advance animation from actual movement; callers own action and behavior state. */
export function advanceGuardLocomotion(g:GuardState,dt:number):void {
  'worklet';
  g.gait += (gaitFromSpeed(g.speed) - g.gait) * damp(14, dt);
  g.phase = (g.phase + (g.speed * dt) / strideCycleLength(g.gait)) % 1;
  g.dist += g.speed * dt;
}
