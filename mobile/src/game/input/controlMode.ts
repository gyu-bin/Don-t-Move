/** How the thief is steered. A saved preference; Tilt is the game's intended control and the default. */
export type ControlMode = 'tilt' | 'touch';
export const DEFAULT_CONTROL_MODE: ControlMode = 'tilt';
/** Anything that is not exactly "touch" — a missing field in an older save, a damaged value — is Tilt. */
export function normalizeControlMode(value: unknown): ControlMode {
  return value === 'touch' ? 'touch' : DEFAULT_CONTROL_MODE;
}

/** tilt: the phone. stick: drag on the screen, direction and speed under the thumb. tap: developer harness only. */
export type InputKind = 'tilt' | 'stick' | 'tap';
/**
 * What actually steers the thief this frame.
 * `fallback` is true when the player asked for Tilt and the sensor cannot be used: the game is then played by
 * touch and says so, instead of leaving the player on a sensor error.
 * The tap-to-move harness is a development tool (it walks the thief to a point by itself) and never ships.
 */
export function resolveInput(input: { preferred: ControlMode; sensorUsable: boolean; dev: boolean; devStick: boolean }): { kind: InputKind; fallback: boolean } {
  if (input.preferred === 'touch') return { kind: 'stick', fallback: false };
  if (input.sensorUsable) return { kind: 'tilt', fallback: false };
  return { kind: input.dev && !input.devStick ? 'tap' : 'stick', fallback: true };
}
