import {GUARD_TUNING} from './guardTuning';

/** Chapter 02 visual-contact pursuit only. Theft sweep and unseen support use their existing controllers. */
export function directChaseSpeed(missionId?:string):number {
  'worklet';
  return missionId?.startsWith('02-') ? 178 : GUARD_TUNING.runSpeed;
}
