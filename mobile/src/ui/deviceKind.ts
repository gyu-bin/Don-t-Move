import type { ControlMode } from '../game/input/controlMode';

/** What the app can read about the device it runs on. */
export interface DeviceFacts {
  os: string;
  /** `Platform.constants.systemName`. */
  systemName: unknown;
  /** Width of the app's own window, and of the whole screen, in points. */
  windowWidth: number;
  screenWidth: number;
}

/**
 * The one place that decides "this is an iPad". The top-inset correction and the first-run control mode both ask
 * here, so they can never disagree.
 *
 * This is an iPhone-only app, so on an iPad it runs as an iPhone app in a window and the usual checks say "phone":
 * measured on iPadOS 27 (iPad Air 11), `Platform.isPad` is false and `interfaceIdiom` is "phone". Two things do
 * differ there, and either one is enough:
 *  - `systemName` is "iPadOS" ("iOS" on an iPhone);
 *  - the app's window is narrower than the screen (410 of 820 pt). On an iPhone the window is the screen
 *    (measured: SE 375 = 375, Pro Max 440 = 440).
 * The width sign is iOS only: on Android a window narrower than the screen is ordinary split-screen.
 */
export function isIPad(device: DeviceFacts): boolean {
  if (device.os !== 'ios') return false;
  if (device.systemName === 'iPadOS') return true;
  const { windowWidth, screenWidth } = device;
  return Number.isFinite(windowWidth) && Number.isFinite(screenWidth) && windowWidth > 0 && screenWidth > 0
    && Math.abs(screenWidth - windowWidth) >= 1;
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
