import { androidMotionToAttitude, type AndroidMotionMeasurement } from './androidMotion';
import type { AttitudeSample } from './tilt';

export type AndroidTiltStatus = 'initializing' | 'ready' | 'unavailable' | 'paused';
export interface AndroidMotionSource {
  isAvailableAsync(): Promise<boolean>;
  setUpdateInterval(milliseconds: number): void;
  addListener(listener: (measurement: AndroidMotionMeasurement) => void): { remove(): void };
}
type Timer = ReturnType<typeof setTimeout>;
export interface AndroidTiltSessionOptions {
  motion: AndroidMotionSource;
  onSample(sample: AttitudeSample): void;
  onError(message: string): void;
  onStatus?(status: AndroidTiltStatus): void;
  onActive?(active: boolean): void;
  onAvailable?(available: boolean): void;
  now?: () => number;
  setTimer?: (callback: () => void, milliseconds: number) => Timer;
  clearTimer?: (timer: Timer) => void;
  startupTimeoutMs?: number;
  staleTimeoutMs?: number;
  retryIntervalMs?: number;
}

/** No controller/neutral ownership: Android's earth reference survives resubscribe. */
export function createAndroidTiltSession(options: AndroidTiltSessionOptions) {
  const now = options.now ?? Date.now;
  const schedule = options.setTimer ?? setTimeout;
  const cancel = options.clearTimer ?? clearTimeout;
  const startupTimeout = options.startupTimeoutMs ?? 3000;
  const staleTimeout = options.staleTimeoutMs ?? 1000;
  const retryInterval = options.retryIntervalMs ?? 150;
  let disposed = false;
  let foreground = false;
  let generation = 0;
  let status: AndroidTiltStatus = 'paused';
  let subscription: { remove(): void } | null = null;
  let deadline: Timer | null = null;
  let retry: Timer | null = null;
  let watchdog: Timer | null = null;
  let lastTimestamp = -1;
  let orientation: number | null = null;
  let lastReceivedAt = 0;
  let minimumClockOffset = Number.POSITIVE_INFINITY;

  function setStatus(next: AndroidTiltStatus) {
    if (status === next) return;
    status = next;
    options.onStatus?.(next);
  }
  function cleanup() {
    if (deadline !== null) cancel(deadline);
    if (retry !== null) cancel(retry);
    if (watchdog !== null) cancel(watchdog);
    deadline = retry = watchdog = null;
    const current = subscription;
    subscription = null;
    try { current?.remove(); } catch { /* A removed native emitter is already stopped. */ }
  }
  function fail(message: string) {
    generation += 1;
    cleanup();
    options.onActive?.(false);
    options.onAvailable?.(false);
    setStatus('unavailable');
    options.onError(message);
  }
  function valid(token: number) { return !disposed && foreground && token === generation; }
  function monitor(token: number) {
    if (!valid(token)) return;
    if (now() - lastReceivedAt >= staleTimeout) {
      fail('Android motion updates stopped. Retry tilt or use touch controls.');
      return;
    }
    watchdog = schedule(() => monitor(token), Math.max(1, staleTimeout - (now() - lastReceivedAt)));
  }
  async function connect(token: number) {
    try {
      const available = await options.motion.isAvailableAsync();
      if (!valid(token)) return;
      if (!available) {
        retry = schedule(() => { void connect(token); }, retryInterval);
        return;
      }
      options.motion.setUpdateInterval(16);
      const attached = options.motion.addListener((measurement) => {
        if (!valid(token)) return;
        const sample = androidMotionToAttitude(measurement, now());
        if (!sample || sample.timestamp <= lastTimestamp) return;
        // Estimate source age from the least bridge delay observed in this session.
        // Keep the clock anchor through background so cached resume events cannot
        // masquerade as fresh input. Absolute latency of the first event is unknown.
        const clockOffset = sample.receivedAt - sample.timestamp * 1000;
        minimumClockOffset = Math.min(minimumClockOffset, clockOffset);
        const estimatedReceivedAt = sample.timestamp * 1000 + minimumClockOffset;
        if (sample.receivedAt - estimatedReceivedAt > 200) return;
        sample.receivedAt = estimatedReceivedAt;
        if (orientation !== null && orientation !== measurement.orientation) {
          fail('Display orientation changed. Retry tilt to calibrate the new orientation.');
          return;
        }
        orientation = measurement.orientation!;
        lastTimestamp = sample.timestamp;
        lastReceivedAt = sample.receivedAt;
        options.onSample(sample);
        if (status !== 'ready') {
          if (deadline !== null) cancel(deadline);
          deadline = null;
          setStatus('ready');
          options.onAvailable?.(true);
          options.onActive?.(true);
          options.onError('');
          watchdog = schedule(() => monitor(token), staleTimeout);
        }
      });
      // Also handles providers that synchronously deliver a sample on subscribe.
      if (valid(token)) subscription = attached;
      else attached.remove();
    } catch {
      if (valid(token)) {
        retry = schedule(() => { void connect(token); }, retryInterval);
      }
    }
  }
  function setAppState(state: string) {
    if (disposed) return;
    const active = state === 'active';
    if (foreground === active) return;
    foreground = active;
    generation += 1;
    cleanup();
    options.onActive?.(false);
    if (!active) { setStatus('paused'); return; }
    const token = generation;
    setStatus('initializing');
    deadline = schedule(() => {
      if (valid(token)) fail('Android fused motion is unavailable. Retry tilt or use touch controls.');
    }, startupTimeout);
    void connect(token);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    generation += 1;
    cleanup();
    options.onActive?.(false);
    setStatus('paused');
  }
  return { setAppState, dispose };
}
