import { Platform } from 'react-native';
import { firstRunControlModeFor, isIPadSystem, topInsetFor } from './deviceKind';

/** Running on an iPad (as an iPhone app in a window). Decided once: the device does not change. */
export const ON_IPAD = isIPadSystem(Platform.OS, (Platform.constants as { systemName?: unknown } | undefined)?.systemName);
/** Top inset for screens with controls in the top-left corner. Identical to the safe-area inset on an iPhone. */
export const topInset = (safeTop: number): number => topInsetFor(safeTop, ON_IPAD);
export const FIRST_RUN_CONTROL_MODE = firstRunControlModeFor(ON_IPAD);
