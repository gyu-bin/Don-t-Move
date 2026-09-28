import {AccessibilityInfo} from 'react-native';

/** Read-only Debug evidence. Never overrides system preference or logging. */
export async function motionSnapshot() {
 const runtime=globalThis as typeof globalThis & {_REANIMATED_IS_REDUCED_MOTION?:boolean};
 return {
  nativeCurrent:await AccessibilityInfo.isReduceMotionEnabled(),
  reanimatedAtStartup:runtime._REANIMATED_IS_REDUCED_MOTION,
  capturedAt:Date.now(),
 };
}
