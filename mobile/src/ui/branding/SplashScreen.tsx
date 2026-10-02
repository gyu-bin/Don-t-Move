import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from './introTimeline';
import { completionDeadline } from './initialization';

export const SPLASH_FADE_MS = 420;
/**
 * Brand-only splash (no thief/guard/diamond/buttons). Same navy as the native splash, so the
 * native → brand hand-off has no colour flash. When `leaving`, it fades over the museum intro.
 */
export function SplashScreen({ leaving = false, onGone }: { leaving?: boolean; onGone?: () => void }) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!leaving) return;
    const completion = completionDeadline(() => onGone?.(), SPLASH_FADE_MS + 500);
    const finish = completion.finish;
    opacity.set(withTiming(0, { duration: SPLASH_FADE_MS, easing: Easing.out(Easing.quad) }, done => { if (done) scheduleOnRN(finish); }));
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
  footer: {
    position: 'absolute',
    color: '#7B929D',
    fontSize: 8,
    letterSpacing: 3.2,
  },
});
