import { useCallback,useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { NativeModule, requireOptionalNativeModule } from 'expo';
import { DeviceMotion } from 'expo-sensors';
import { useAnimatedReaction,useSharedValue } from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import { createTiltState } from './tilt';
import { clearProfileInput, currentTiltProfile, profileTuning, rememberTiltProfile, tiltCompareEnabled } from './tiltProfiles';
import type { TiltProfileId } from './tiltProfiles';
import type { AttitudeSample, TiltTuning } from './tilt';
import { usesTiltInput } from './inputPolicy';
import { createAndroidTiltSession } from './androidTiltSession';
import { ANDROID_REFERENCE_FRAME } from './androidMotion';
import { createIOSTiltSession,requestMotionPermission } from './iosTiltSession';

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
// Release iPhone retains its sensor requirement; developer builds can play without Core Motion.
export const TILT_DEVICE = Platform.OS === 'android' || usesTiltInput(Platform.OS, __DEV__, native);

/** `wanted`: the player's control mode is Tilt. With Touch chosen the sensor is not started or asked for. */
export function useTiltControl(wanted = true) {
  const sample = useSharedValue<AttitudeSample | null>(null);
  const controller = useSharedValue(createTiltState());
  const compareEnabled = tiltCompareEnabled(__DEV__, process.env.EXPO_PUBLIC_DM_TILT_COMPARE);
  const [profile, setProfile] = useState<TiltProfileId>(currentTiltProfile);
  const tuning = useSharedValue<TiltTuning>(profileTuning(compareEnabled, profile));
  const active = useSharedValue(false);
  const reset = useSharedValue(0);
  const selectProfile = useCallback((next: TiltProfileId) => {
    if (!compareEnabled) return;
    tuning.set(profileTuning(true, next));
    controller.modify(state => { 'worklet'; clearProfileInput(state); return state; });
    reset.set(reset.get() + 1);
    rememberTiltProfile(next); setProfile(next);
  }, [compareEnabled, controller, reset, tuning, setProfile]);
  useEffect(() => {
    if (compareEnabled) console.info('[TILT PROFILE]', JSON.stringify({profile, ...profileTuning(true, profile)}));
  }, [compareEnabled, profile]);
  const [error, setError] = useState(Platform.OS === 'ios' && TILT_DEVICE ? !native ? 'Development build required · rebuild iOS' : !native.available ? 'Device motion unavailable' : '' : '');
  const [restart, setRestart] = useState(0);
  // DEV device QA: EXPO_PUBLIC_DM_FORCE_TOUCH=1 at Metro start plays a real iPhone by touch.
  const [sensorFailed, setSensorFailed] = useState(__DEV__ && process.env.EXPO_PUBLIC_DM_FORCE_TOUCH === '1');
  const [androidAvailable, setAndroidAvailable] = useState<boolean | null>(null);
  // The sensor cannot be used at all: no Core Motion on this device, or the player refused motion access.
  // The game is then played by touch (with a note) instead of stopping on a sensor error.
  const [denied, setDenied] = useState(false);
  const usable = usesTiltInput(Platform.OS, __DEV__, native, sensorFailed, androidAvailable !== false) &&
    !(Platform.OS === 'ios' && (!native?.available || denied));
  const enabled = wanted && usable;
  const reportCalibration=useCallback((status:string,method:string,sensorActive:boolean,startedAt:number)=>{
    if(__DEV__)console.info('[CAL] transition',JSON.stringify({status,method,sensorActive,elapsedMs:startedAt<0?0:Math.max(0,Date.now()-startedAt)}));
  },[]);
  useAnimatedReaction(()=>{
    if(!__DEV__||!enabled)return null;
    return `${controller.value.status}|${controller.value.calibrationMethod}|${active.value}`;
  },(value,previous)=>{
    if(value===null||value===previous)return;
    const current=controller.value;
    scheduleOnRN(reportCalibration,current.status,current.calibrationMethod,active.value,current.calibrationStartedAt);
  });
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let disposed = false;
    // Only initial mount / explicit Retry starts a new calibration. Foreground
    // subscriptions retain the earth-referenced quaternion and fixed neutral.
    controller.set(createTiltState()); sample.set(null); active.set(false);
    reset.set(reset.get() + 1);
    const session = createAndroidTiltSession({
      motion: DeviceMotion,
      onSample: value => { if (!disposed) sample.set(value); },
      onActive: value => {
        if (disposed) return;
        active.set(value);
        if (value) { setAndroidAvailable(true); setError(''); }
        else { sample.set(null); reset.set(reset.get() + 1); }
      },
      onAvailable: value => { if (!disposed) setAndroidAvailable(value); },
      onError: message => { if (!disposed) setError(message); },
    });
    const lifecycle = AppState.addEventListener('change', state => session.setAppState(state));
    session.setAppState(AppState.currentState);
    return () => {
      disposed = true; lifecycle.remove(); session.dispose();
      active.set(false); sample.set(null);
    };
  }, [active, controller, reset, restart, sample]);
  useEffect(() => {
    if (!__DEV__) return;
    if (Platform.OS === 'android' && androidAvailable === null) {
      console.info('[INPUT] INITIALIZING — ANDROID'); return;
    }
    console.info(enabled ? `[INPUT] TILT — ${Platform.OS.toUpperCase()}` : '[INPUT] TOUCH FALLBACK');
  }, [androidAvailable, enabled]);
  useEffect(() => {
    if (Platform.OS !== 'ios' || !enabled) return;
    if (!native?.available) return;
    let disposed = false;
    const module = native;
    // This effect runs only on initial subscription or explicit Retry. PLAY never
    // replaces neutral merely because the app enters the foreground.
    controller.set(createTiltState());sample.set(null);active.set(false);reset.set(reset.get()+1);
    const session=createIOSTiltSession({
      start:()=>module.start(),stop:()=>module.stop(),
      isCalibrating:()=>{const value=controller.get();return value.neutral===null||(value.calibrationMethod!=='manual'&&Date.now()<value.readyAt);},
      onCalibrationStart:()=>{controller.set(createTiltState());sample.set(null);reset.set(reset.get()+1);},
      onSample:value=>{if(!disposed)sample.set(value);},
      onActive:value=>{
        if(disposed)return;
        active.set(value);
        if(!value){sample.set(null);reset.set(reset.get()+1);}
      },
      onError:message=>{
        if(disposed)return;
        if(__DEV__&&message)console.warn('[SENSOR]',message);
        setError(message);
        if(message&&__DEV__&&!message.startsWith('Sensor session ended'))setSensorFailed(true);
      },
    });
    const motion=module.addListener('onAttitude',session.receive);
    const failure=module.addListener('onFailure',({message})=>session.fail(message));
    if(__DEV__)console.info('[SENSOR] listeners',module.listenerCount('onAttitude'));
    let permissionGranted=false;
    const lifecycle=AppState.addEventListener('change',state=>{
      if(permissionGranted)session.setAppState(state);
    });
    if(__DEV__)console.info('[SENSOR] permission-request');
    const permissionAttempt=requestMotionPermission(()=>DeviceMotion.requestPermissionsAsync());
    void permissionAttempt.result.then(permission=>{
      if(disposed)return;
      if(__DEV__)console.info('[SENSOR] permission-'+permission.status);
      if(permission.status==='cancelled')return;
      if(permission.status==='timeout'){
        setError('Motion permission still pending · complete system dialog, then RETRY SENSOR');
        return;
      }
      if(permission.status==='error'){session.fail(permission.message??'Motion permission request failed');return;}
      if(permission.status==='denied'){
        setError('Motion permission denied · enable in Settings');
        setDenied(true);
        if(__DEV__)setSensorFailed(true);
        return;
      }
      permissionGranted=true;session.setAppState(AppState.currentState);
    });
    return()=>{
      disposed=true;permissionAttempt.cancel();motion.remove();failure.remove();lifecycle.remove();session.dispose();
      active.set(false);sample.set(null);
    };
  }, [active, controller, enabled, reset, restart, sample]);
  return { compareEnabled, profile, selectProfile, enabled, usable, available: Platform.OS === 'android' ? androidAvailable === true : native?.available ?? false,
    canRetry: Platform.OS === 'android' || !!native?.available,
    referenceFrame: Platform.OS === 'android' ? ANDROID_REFERENCE_FRAME : native?.referenceFrame ?? 'none', sample, controller, tuning, active, reset,
    error, restart: () => {
      if (Platform.OS === 'android') { setAndroidAvailable(null); setError(''); }
      setSensorFailed(false); setDenied(false); setRestart((n) => n+1);
    } };
}
