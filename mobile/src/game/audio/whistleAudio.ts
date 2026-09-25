/** Pure event gate shared by AudioManager and tests. */
export function shouldPlayWhistle(previous: number, current: number, soundEnabled: boolean): boolean {
  return soundEnabled && current > previous;
}

