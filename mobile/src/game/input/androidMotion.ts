import { multiply, type AttitudeSample } from './tilt';

export const ANDROID_REFERENCE_FRAME = 'android-rotation-vector-earth';

/** Structural Expo DeviceMotion payload; partial native events are rejected. */
export interface AndroidMotionMeasurement {
  rotation?: { alpha: number; beta: number; gamma: number; timestamp: number } | null;
  rotationRate?: { alpha: number; beta: number; gamma: number; timestamp: number } | null;
  acceleration?: { x: number; y: number; z: number; timestamp: number } | null;
  orientation?: number;
}

/**
 * Expo 57 Android uses TYPE_ROTATION_VECTOR -> SensorManager.getOrientation:
 * alpha=-azimuth, beta=-pitch, gamma=roll (radians). Inverting that decomposition
 * yields Rz(alpha) Rx(beta) Ry(gamma), an active device -> earth rotation.
 * These Euler values transport OS fusion; they are never integrated/subtracted.
 * https://docs.expo.dev/versions/v57.0.0/sdk/devicemotion/
 */
export function androidMotionToAttitude(
  measurement: AndroidMotionMeasurement, receivedAt: number,
): AttitudeSample | null {
  const r = measurement.rotation;
  const g = measurement.rotationRate;
  const a = measurement.acceleration;
  const orientation = measurement.orientation;
  if (!r || !g || !a || ![0, 90, 180, -90].includes(orientation ?? NaN)) return null;
  const values = [r.alpha, r.beta, r.gamma, r.timestamp, g.alpha, g.beta, g.gamma,
    g.timestamp, a.x, a.y, a.z, a.timestamp, receivedAt];
  if (!values.every(Number.isFinite) || Math.min(r.timestamp, g.timestamp, a.timestamp) < 0) return null;
  // Expo caches each sensor independently: do not combine stale motion with attitude.
  if (Math.max(r.timestamp, g.timestamp, a.timestamp) - Math.min(r.timestamp, g.timestamp, a.timestamp) > 0.25) return null;
  const z = { x: 0, y: 0, z: Math.sin(r.alpha / 2), w: Math.cos(r.alpha / 2) };
  const x = { x: Math.sin(r.beta / 2), y: 0, z: 0, w: Math.cos(r.beta / 2) };
  const y = { x: 0, y: Math.sin(r.gamma / 2), z: 0, w: Math.cos(r.gamma / 2) };
  // Sensors retain natural device axes. Display rotation maps portrait axes even
  // on tablets whose natural orientation is landscape (AXIS_Y, AXIS_MINUS_X).
  const screenAngle = orientation! * Math.PI / 360;
  const q = multiply(multiply(multiply(z, x), y),
    { x: 0, y: 0, z: Math.sin(screenAngle), w: Math.cos(screenAngle) });
  const norm = Math.hypot(q.x, q.y, q.z, q.w);
  return {
    q: { x: q.x / norm, y: q.y / norm, z: q.z / norm, w: q.w / norm },
    timestamp: r.timestamp,
    rotationRate: Math.hypot(g.alpha, g.beta, g.gamma) * Math.PI / 180,
    acceleration: Math.hypot(a.x, a.y, a.z) / 9.80665,
    receivedAt,
  };
}
