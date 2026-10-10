/** How the thief is steered. A saved preference; Tilt is the game's intended control and the default. */
export type ControlMode = 'tilt' | 'touch';
export const DEFAULT_CONTROL_MODE: ControlMode = 'tilt';
/**
 * A saved choice is kept as it is. Anything else — no save yet, a save from before the setting existed, a damaged
 * value — is `fallback`: Tilt, unless the caller knows a better start for this device (see firstRunControlModeFor).
 */
export function normalizeControlMode(value: unknown, fallback: ControlMode = DEFAULT_CONTROL_MODE): ControlMode {
  return value === 'touch' || value === 'tilt' ? value : fallback;
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
