/** Pure/worklet controller. Quaternion convention: active device -> reference. */
export interface Quaternion { x: number; y: number; z: number; w: number }
export interface AttitudeSample {
  q: Quaternion;
  timestamp: number;
  rotationRate: number;
  acceleration: number;
  receivedAt: number;
}
export interface TiltTuning { deadZone: number; maxTilt: number; sensitivity: number; smoothing: number }
export const DEFAULT_TILT: TiltTuning = { deadZone: 2, maxTilt: 16, sensitivity: 1, smoothing: 0.06 };
/** Background ends a reference session; foreground alone must never recalibrate. */
export function sensorLifecycleAction(state: string, running: boolean, started: boolean) {
  if (state === 'background') return 'stop';
  if (state !== 'active') return 'pause';
  if (running) return 'resume';
  return started ? 'wait' : 'start';
}
export interface TiltState {
  neutral: Quaternion | null;
  candidate: Quaternion | null;
  stableSince: number;
  lastTimestamp: number;
  readyAt: number;
  pitch: number; roll: number; magnitude: number;
  deadX: number; deadY: number;
  smoothX: number; smoothY: number;
  x: number; y: number;
  progress: number;
  status: 'HOLD COMFORTABLY' | 'READY' | 'PLAY' | 'SENSOR PAUSED' | 'CENTER RESET';
}
export function createTiltState(): TiltState {
  return { neutral: null, candidate: null, stableSince: 0, lastTimestamp: -1, readyAt: 0,
    pitch: 0, roll: 0, magnitude: 0, deadX: 0, deadY: 0, smoothX: 0, smoothY: 0,
    x: 0, y: 0, progress: 0, status: 'HOLD COMFORTABLY' };
}
export function multiply(a: Quaternion, b: Quaternion): Quaternion {
  'worklet';
  return { x: a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
    y: a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
    z: a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,
    w: a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z };
}
function normalized(q: Quaternion): Quaternion | null {
  'worklet';
  const n = Math.hypot(q.x, q.y, q.z, q.w);
  return Number.isFinite(n) && n > 0.5 && n < 1.5
    ? { x: q.x/n, y: q.y/n, z: q.z/n, w: q.w/n } : null;
}
export function zeroTilt(s: TiltState): void {
  'worklet';
  s.x = s.y = s.deadX = s.deadY = s.smoothX = s.smoothY = 0;
}
export function freshSample(sample: AttitudeSample | null, now: number): boolean {
  'worklet';
  return !!sample && now >= sample.receivedAt && now-sample.receivedAt <= 200 &&
    Number.isFinite(sample.timestamp) && Number.isFinite(sample.rotationRate) &&
    Number.isFinite(sample.acceleration) && normalized(sample.q) !== null;
}
export function recenterTilt(s: TiltState, sample: AttitudeSample | null, now: number): boolean {
  'worklet';
  zeroTilt(s);
  if (!sample || !freshSample(sample, now)) return false;
  s.neutral = normalized(sample.q);
  s.candidate = null;
  s.lastTimestamp = sample.timestamp;
  s.pitch = s.roll = s.magnitude = 0;
  s.status = 'CENTER RESET';
  s.readyAt = now + 450;
  return true;
}
/** Relative swing of the screen normal: twist (yaw about that normal) contributes zero.
 * No Euler subtraction, including around +/-180 degrees and lying-down poses.
 */
export function relativeTilt(neutral: Quaternion, current: Quaternion) {
  'worklet';
  const q = multiply({ x: -neutral.x, y: -neutral.y, z: -neutral.z, w: neutral.w }, current);
  const nx = 2*(q.x*q.z+q.w*q.y);
  const ny = 2*(q.y*q.z-q.w*q.x);
  const nz = 1-2*(q.x*q.x+q.y*q.y);
  const radial = Math.hypot(nx, ny);
  const angle = Math.atan2(radial, nz)*180/Math.PI;
  // Screen coordinates: lower right edge -> +X, lower top edge -> -Y.
  return { roll: radial > 1e-8 ? nx/radial*angle : 0,
    pitch: radial > 1e-8 ? -ny/radial*angle : 0, magnitude: angle };
}
/** Continuous nonlinear speed curve; defaults: 5.18° Sneak, 9.64° Walk, 16° Run. */
export function response(magnitude: number, tuning: TiltTuning): number {
  'worklet';
  const a = tuning.deadZone + magnitude*(tuning.maxTilt-tuning.deadZone);
  const sneak = tuning.deadZone + (tuning.maxTilt-tuning.deadZone)*5/22;
  const walk = tuning.deadZone + (tuning.maxTilt-tuning.deadZone)*12/22;
  if (a <= sneak) return 38/150*Math.pow(Math.max(0, (a-tuning.deadZone)/(sneak-tuning.deadZone)), 1.4);
  if (a <= walk) return (38+34*Math.pow((a-sneak)/(walk-sneak), 1.2))/150;
  return Math.min(1, (72+78*Math.pow((a-walk)/(tuning.maxTilt-walk), 1.2))/150);
}
export function stepTilt(s: TiltState, sample: AttitudeSample | null, now: number, dt: number, tuning: TiltTuning): void {
  'worklet';
  if (!sample || !freshSample(sample, now)) {
    zeroTilt(s); s.candidate = null; s.progress = 0; s.status = 'SENSOR PAUSED'; return;
  }
  const q = normalized(sample.q)!;
  if (!s.neutral) {
    zeroTilt(s); s.status = 'HOLD COMFORTABLY';
    if (sample.timestamp <= s.lastTimestamp) return;
    const gap = sample.timestamp-s.lastTimestamp;
    s.lastTimestamp = sample.timestamp;
    const c = s.candidate;
    const dot = c ? Math.abs(c.x*q.x+c.y*q.y+c.z*q.z+c.w*q.w) : 0;
    const stable = sample.rotationRate < 0.12 && sample.acceleration < 0.12;
    if (!stable || !c || gap > 0.1 || dot < Math.cos(0.5*Math.PI/180)) {
      s.candidate = stable ? q : null; s.stableSince = sample.timestamp; s.progress = 0; return;
    }
    s.progress = Math.min(1, (sample.timestamp-s.stableSince)/0.5);
    if (s.progress >= 1) {
      s.neutral = q; s.candidate = null; s.readyAt = now+350; s.status = 'READY';
    }
    return;
  }
  if (now < s.readyAt && s.status === 'READY') { zeroTilt(s); return; }
  // Recenter feedback must not become a repeatable pause/escape button for Guards.
  s.status = now < s.readyAt && s.status === 'CENTER RESET' ? 'CENTER RESET' : 'PLAY';
  const tilt = relativeTilt(s.neutral, q);
  s.pitch = tilt.pitch; s.roll = tilt.roll; s.magnitude = tilt.magnitude;
  const angle = tilt.magnitude*tuning.sensitivity;
  const radial = Math.min(1, Math.max(0, (angle-tuning.deadZone)/(tuning.maxTilt-tuning.deadZone)));
  if (!radial || tilt.magnitude < 1e-8) { zeroTilt(s); return; }
  s.deadX = tilt.roll/tilt.magnitude*radial;
  s.deadY = tilt.pitch/tilt.magnitude*radial;
  const k = tuning.smoothing <= 0 ? 1 : 1-Math.exp(-dt/tuning.smoothing);
  s.smoothX += (s.deadX-s.smoothX)*k; s.smoothY += (s.deadY-s.smoothY)*k;
  const sm = Math.hypot(s.smoothX, s.smoothY);
  const speed = response(Math.min(1, sm), tuning);
  s.x = sm > 1e-8 ? s.smoothX/sm*speed : 0;
  s.y = sm > 1e-8 ? s.smoothY/sm*speed : 0;
}
