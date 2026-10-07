import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { STICK_RADIUS } from '../../game/input/touchStick';
import type { StickState } from '../../game/input/touchStick';

const KNOB = 22;
/**
 * Touch control: the ring appears where the thumb lands, the knob follows the drag. Drawn only; the touch itself
 * is taken by the play area underneath. `note` explains a fallback from Tilt, with a way back to the sensor.
 */
export function TouchStickHud({ stick, hint, note, retryLabel, onRetry, bottom }: {
  stick: SharedValue<StickState>;
  hint: string;
  note?: string;
  retryLabel?: string;
  onRetry?: () => void;
  bottom: number;
}) {
  const ring = useAnimatedStyle(() => ({
    opacity: stick.value.on ? 1 : 0,
    transform: [{ translateX: stick.value.ox - STICK_RADIUS }, { translateY: stick.value.oy - STICK_RADIUS }],
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: stick.value.kx }, { translateY: stick.value.ky }] }));
  const idle = useAnimatedStyle(() => ({ opacity: stick.value.on ? 0 : 1 }));
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <Animated.View pointerEvents="none" style={[styles.ring, ring]}>
      <Animated.View style={[styles.knob, knob]} />
    </Animated.View>
    <Animated.View pointerEvents="box-none" style={[styles.foot, { bottom }, idle]}>
      {!!note && <Text style={styles.note}>{note}</Text>}
      {!!note && !!onRetry && <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} style={styles.retry}><Text style={styles.retryText}>{retryLabel}</Text></Pressable>}
      <Text pointerEvents="none" style={styles.hint}>{hint}</Text>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', left: 0, top: 0, width: STICK_RADIUS * 2, height: STICK_RADIUS * 2, borderRadius: STICK_RADIUS,
    borderWidth: 1.5, borderColor: 'rgba(84,221,247,0.55)', backgroundColor: 'rgba(4,18,29,0.28)', alignItems: 'center', justifyContent: 'center' },
  knob: { width: KNOB * 2, height: KNOB * 2, borderRadius: KNOB, backgroundColor: 'rgba(84,221,247,0.5)', borderWidth: 1, borderColor: 'rgba(230,245,250,0.8)' },
  foot: { position: 'absolute', alignSelf: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: 'rgba(4,18,29,0.72)', maxWidth: 320 },
  note: { color: '#EFC48D', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  hint: { color: '#9beeff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  retry: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: '#354758' },
  retryText: { color: '#e6e9ef', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
});
