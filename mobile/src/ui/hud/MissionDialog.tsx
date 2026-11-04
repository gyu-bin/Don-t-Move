import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Result and failure content stays reachable on short screens and with larger text. */
export function MissionDialog({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View accessibilityViewIsModal style={[styles.overlay, {
    paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12,
  }]}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.card} bounces={false}>
      {children}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 100,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  scroll: { flexGrow: 0, width: '100%', maxWidth: 360, borderRadius: 16 },
  card: { alignItems: 'center', gap: 12, padding: 24, borderRadius: 16,
    backgroundColor: 'rgba(8,11,17,0.96)', borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)' },
});
