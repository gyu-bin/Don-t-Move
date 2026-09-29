import type { Edge } from '../game/levels/missionContinuity';

export const MISSION_FINISH_HOLD_MS = 250;
export const MISSION_SLIDE_MS = 380;

/** Camera travels through the outgoing portal; incoming entry stays opposite. */
export function transitionVector(exit: Edge | undefined): { x:number; y:number } {
  return exit === 'left' ? {x:-1,y:0} : exit === 'top' ? {x:0,y:-1}
    : exit === 'bottom' ? {x:0,y:1} : {x:1,y:0};
}

export function missionSlide(progress:number, incoming:boolean, distance:number):number {
  'worklet';
  return (incoming ? 1-progress : -progress)*distance;
}
