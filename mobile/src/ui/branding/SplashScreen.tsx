import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from './introTimeline';
import { completionDeadline } from './initialization';

export const SPLASH_FADE_MS = 420;
const SPLASH_IN_MS = 680;
type Props = {
  leaving?: boolean; onGone?: () => void; animateIn?: boolean;
  /** Startup status line ("Checking for updates…"). */
  status?: string | null;
  /** Which binary and bundle are running ("v1.0.0 (2) · Embedded"). */
  label?: string | null;
};
/**
 * Brand-only splash (no thief/guard/diamond/buttons). Same navy as the native splash, so the
 * native → brand hand-off has no colour flash. When `leaving`, it fades over the museum intro.
 * It is the startup screen: the update status and the running build are written at its foot.
 * Its fades are part of the startup sequence and play even when the system asks for reduced motion
 * (a fade that jumps would cut straight from the splash to a finished Home).
 */
export function SplashScreen({ leaving = false, onGone, animateIn = false, status, label }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(animateIn ? 0 : 1);
  useEffect(() => {
    if (!animateIn || leaving) return;
    opacity.set(withTiming(1, { duration: SPLASH_IN_MS, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never }));
  }, [animateIn, leaving, opacity]);
  useEffect(() => {
    if (!leaving) return;
    const completion = completionDeadline(() => onGone?.(), SPLASH_FADE_MS + 500);
    const finish = completion.finish;
    opacity.set(withTiming(0, { duration: SPLASH_FADE_MS, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never }, done => { if (done) scheduleOnRN(finish); }));
    return () => { completion.cancel(); cancelAnimation(opacity); };
  }, [leaving, onGone, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const { width } = useWindowDimensions();
  const scale = Math.min(1.12, Math.max(0.88, width / 390));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }, fade]}>
      <View style={[styles.brand, { transform: [{ scale }] }]}>
        <Text style={styles.title}>DON&apos;T</Text>
        <Text style={styles.title}>MOVE</Text>
        <View style={styles.accent} />
        <Text style={styles.tagline}>A STEALTH GAME{ '\n' }IN YOUR HANDS</Text>
      </View>
      {!!status && <Text accessibilityLiveRegion="polite" style={[styles.status, { bottom: Math.max(insets.bottom, 12) + 58 }]}>{status}</Text>}
      {!!label && <Text style={[styles.label, { bottom: Math.max(insets.bottom, 12) + 34 }]}>{label}</Text>}
      <Text style={[styles.footer, { bottom: Math.max(insets.bottom, 12) + 14 }]}>SILENCE IS A SKILL</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.navy,
  },
  brand: {
    alignItems: 'center',
    marginTop: -16,
  },
  title: {
    color: BRAND.ivory,
    fontSize: 50,
    fontStyle: 'italic',
    fontWeight: '900',
    lineHeight: 47,
    letterSpacing: -2.4,
    transform: [{ rotate: '-6deg' }],
  },
  accent: {
    width: 70,
    height: 3,
    marginTop: 16,
    backgroundColor: BRAND.cyan,
    transform: [{ rotate: '-8deg' }],
  },
  tagline: {
    marginTop: 18,
    color: '#AEC3CB',
    fontSize: 8,
    lineHeight: 14,
    letterSpacing: 2.3,
    textAlign: 'center',
  },
  status: {
    position: 'absolute',
    left: 24,
    right: 24,
    color: '#D9E5E8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  label: {
    position: 'absolute',
    color: '#7B929D',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  footer: {
    position: 'absolute',
    color: '#7B929D',
    fontSize: 8,
    letterSpacing: 3.2,
  },
});
