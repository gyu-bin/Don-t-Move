import { clearSegment } from '../world/navigation';

/** No inventory, exit unlock or mission state: development map arrival only. */
export function reachedTestGoal(player: {x:number;y:number}, goal: {x:number;y:number;radius:number}, blockers: number[], caught: boolean): boolean {
  'worklet';
  return !caught && Math.hypot(player.x-goal.x,player.y-goal.y)<=goal.radius &&
    clearSegment(player.x,player.y,goal.x,goal.y,blockers);
}
