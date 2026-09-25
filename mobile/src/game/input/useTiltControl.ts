import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { NativeModule, requireOptionalNativeModule } from 'expo';
import { DeviceMotion } from 'expo-sensors';
import { useSharedValue } from 'react-native-reanimated';
import { createTiltState, DEFAULT_TILT, sensorLifecycleAction } from './tilt';
import type { AttitudeSample, TiltTuning } from './tilt';

type NativeSample = AttitudeSample;
declare class AttitudeModule extends NativeModule<{
  onAttitude: (sample: NativeSample) => void;
  onFailure: (error: { message: string }) => void;
}> {
  isSimulator: boolean;
  available: boolean;
  referenceFrame: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}
const native = Platform.OS === 'ios' ? requireOptionalNativeModule<AttitudeModule>('DontMoveAttitude') : null;
// A missing native module on iOS is NOT permission to silently enable touch on a phone.
export const TILT_DEVICE = Platform.OS === 'ios' && !native?.isSimulator;

export function useTiltControl() {
  const sample = useSharedValue<AttitudeSample | null>(null);
  const controller = useSharedValue(createTiltState());
  const tuning = useSharedValue<TiltTuning>({ ...DEFAULT_TILT });
  const active = useSharedValue(false);
  const reset = useSharedValue(0);
  const [error, setError] = useState(TILT_DEVICE ? !native ? 'Development build required · rebuild iOS' : !native.available ? 'Device motion unavailable' : '' : '');
  const [restart, setRestart] = useState(0);
  useEffect(() => {
    if (!TILT_DEVICE) return;
    if (!native?.available) return;
    let disposed = false;
    let generation = 0;
    let running = false;
    const module = native;
    const motion = module.addListener('onAttitude', (value) => {
      if (!disposed && AppState.currentState === 'active') sample.set(value);
    });
    const failure = module.addListener('onFailure', ({ message }) => {
      running = false; active.set(false); sample.set(null); setError(message); void module.stop();
    });
    const start = async () => {
      const session = ++generation;
      try {
        const permission = await DeviceMotion.requestPermissionsAsync();
        if (disposed || session !== generation) return;
        if (!permission.granted) { setError('Motion permission denied · enable in Settings'); return; }
        // Called only at first launch or explicit RETRY SENSOR. Never silently
        // recalibrate on foreground: a restarted native reference needs user consent.
        controller.set(createTiltState()); sample.set(null); reset.set(reset.get()+1);
        await module.start();
        if (disposed || session !== generation) { await module.stop(); return; }
        running = true; setError(''); active.set(AppState.currentState === 'active');
      } catch (e) { if (!disposed) { active.set(false); setError(String(e)); } }
    };
    const lifecycle = AppState.addEventListener('change', (state) => {
      const action = sensorLifecycleAction(state, running, generation > 0);
      if (action === 'stop') {
        generation++; running = false; active.set(false); sample.set(null); void module.stop();
        setError('Sensor session ended · RETRY SENSOR to recalibrate');
      } else if (action === 'pause') {
        // Permission prompts / Control Center do not replace the native reference.
        active.set(false); sample.set(null);
      } else {
        if (action === 'resume') active.set(true);
        else if (action === 'start') void start();
        // After background, wait for the explicit retry button. Neutral never shifts
        // simply because the player temporarily left the app.
      }
    });
    if (AppState.currentState === 'active') void start();
    return () => {
      disposed = true; generation++; active.set(false); sample.set(null);
      motion.remove(); failure.remove(); lifecycle.remove(); void module.stop();
    };
  }, [active, controller, reset, restart, sample]);
  return { enabled: TILT_DEVICE, available: native?.available ?? false, referenceFrame: native?.referenceFrame ?? 'none', sample, controller, tuning, active, reset,
    error, restart: () => setRestart((n) => n+1) };
}
