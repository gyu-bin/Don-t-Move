import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * Known without starting the sensor: this device cannot be played by tilt (no Core Motion, or a simulator).
 * iOS only; Android finds out when a mission starts, and a refused motion permission is also only known then.
 */
export function tiltSensorMissing(): boolean {
  if (Platform.OS !== 'ios') return Platform.OS !== 'android';
  const native = requireOptionalNativeModule<{ isSimulator: boolean; available: boolean }>('DontMoveAttitude');
  return !native || native.isSimulator || !native.available;
}
