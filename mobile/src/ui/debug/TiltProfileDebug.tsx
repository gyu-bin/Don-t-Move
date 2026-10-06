import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { TiltState } from '../../game/input/tilt';
import { TILT_PROFILES } from '../../game/input/tiltProfiles';
import type { TiltProfileId } from '../../game/input/tiltProfiles';
import type { PlaygroundState } from '../../game/playground/playgroundState';
import { movementName } from '../../game/input/tiltMovement';

export function TiltProfileSelector({ profile, onSelect }: { profile: TiltProfileId; onSelect: (id: TiltProfileId) => void }) {
  if (!__DEV__) return null;
  return <View style={styles.selector}>
    <Text style={styles.text}>DEV TILT COMPARE · same 01-01 · B → A → C</Text>
    <View style={styles.row}>{(['B', 'A', 'C'] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Tilt candidate ${id}`} accessibilityState={{ selected: profile === id }} onPress={() => onSelect(id)} style={[styles.button, id === profile && styles.active]}>
      <Text style={styles.text}>{id} · {TILT_PROFILES[id].deadZone}° / {TILT_PROFILES[id].maxTilt}°</Text>
    </Pressable>)}</View>
    <Text style={styles.text}>0.07s smoothing · Neutral preserved · use RECENTER separately</Text>
  </View>;
}

type TiltSnapshot = {
  profile: TiltProfileId; mission: string; status: TiltState['status'];
  sampleWallMs: number; deadZone: number; maxTilt: number; smoothing: number; sensitivity: number;
  pitch: number; roll: number; angle: number; deadZoneOutput: number;
  smoothedInput: number; input: number; speed: number; movement: string;
};

/** Copy only scalars on the UI thread, at most once per second. No JS read of
 * the shared world, and no simulation, sensor or observer state changes. */
export function TiltProfileDebug({ profile, controller, state, bottom, enabled }: { profile: TiltProfileId; controller: SharedValue<TiltState>; state: SharedValue<PlaygroundState>; bottom: number; enabled: boolean }) {
  const [label, setLabel] = useState('Waiting for sensor sample');
  const lastSampleAt = useSharedValue(0);
  const { deadZone, maxTilt, smoothing, sensitivity } = TILT_PROFILES[profile];
  const report = useCallback((data: TiltSnapshot) => {
    console.info('[TILT SAMPLE]', JSON.stringify(data));
    setLabel(`${data.profile} · ${data.angle}° · P ${data.pitch} / R ${data.roll}\nINPUT ${data.input} · SPEED ${data.speed} · ${data.movement}`);
  }, [setLabel]);
  const frame = useFrameCallback(() => {
    if (!__DEV__ || !enabled) return;
    const now = Date.now();
    if (now - lastSampleAt.value < 1000) return;
    lastSampleAt.value = now;
    const tilt = controller.value, game = state.value;
    const round = (n: number) => Math.round(n * 100) / 100;
    const data: TiltSnapshot = { profile, mission: game.theft.missionId ?? 'unknown', status: tilt.status,
      sampleWallMs: now, deadZone, maxTilt, smoothing, sensitivity,
      pitch: round(tilt.pitch), roll: round(tilt.roll), angle: round(tilt.magnitude),
      deadZoneOutput: round(Math.hypot(tilt.deadX, tilt.deadY)),
      smoothedInput: round(Math.hypot(tilt.smoothX, tilt.smoothY)),
      input: round(Math.hypot(tilt.x, tilt.y)), speed: round(game.player.speed), movement: movementName(game.player.speed) };
    scheduleOnRN(report, data);
  }, false);
  // Installed Reanimated retains autostart only in its initial ref. Explicit
  // activation handles an initially transitioning scene becoming playable.
  useEffect(() => {
    frame.setActive(__DEV__ && enabled);
    return () => frame.setActive(false);
  }, [enabled, frame]);
  if (!__DEV__ || !enabled) return null;
  return <View pointerEvents="none" style={[styles.telemetry, { bottom }]}><Text style={styles.text}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  selector: { width: '100%', maxWidth: 420, gap: 6, padding: 8 },
  row: { flexDirection: 'row', gap: 6 },
  button: { flex: 1, borderColor: '#617581', borderWidth: 1, borderRadius: 7, paddingVertical: 10, alignItems: 'center' },
  active: { borderColor: '#00d1ff', backgroundColor: '#163b4a' },
  text: { color: '#d8edf2', fontSize: 10, textAlign: 'center' },
  telemetry: { position: 'absolute', alignSelf: 'center', padding: 6, borderRadius: 5, backgroundColor: 'rgba(0,12,20,0.8)' },
});
