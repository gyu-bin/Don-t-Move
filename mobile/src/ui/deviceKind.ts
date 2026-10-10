import type { ControlMode } from '../game/input/controlMode';

/**
 * This is an iPhone-only app, so on an iPad it runs as an iPhone app in a window and the usual checks say "phone":
 * measured on iPadOS 27 (iPad Air 11), `Platform.isPad` is false and `interfaceIdiom` is "phone".
 * `Platform.constants.systemName` is the one value that differs: "iPadOS" there, "iOS" on an iPhone.
 */
export function isIPadSystem(os: string, systemName: unknown): boolean {
  return os === 'ios' && systemName === 'iPadOS';
}

/**
 * Lowest point, in window coordinates, that iPadOS's window controls take for themselves at the top-left of the
 * app window. Measured on iPadOS 27: the controls are drawn at y 45–65 and a tap at y 72 on a button underneath
 * never reached the app, while y 86 did. The safe-area inset does not cover them (top inset 32).
 */
export const IPAD_WINDOW_CONTROLS_BOTTOM = 72;

/** Where a screen's top content may start: the safe-area inset, and on an iPad no higher than the window controls. */
export function topInsetFor(safeTop: number, onIPad: boolean): number {
  return onIPad ? Math.max(safeTop, IPAD_WINDOW_CONTROLS_BOTTOM) : safeTop;
}

/**
 * Control mode of a player who has never chosen one. On an iPad the window stays upright while the tablet is held
 * any way round, and the tilt mapping is in device axes; touch is the safe start there. Tilt stays selectable.
 */
export function firstRunControlModeFor(onIPad: boolean): ControlMode {
  return onIPad ? 'touch' : 'tilt';
}
