import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMenu } from '../menu/MenuContext';

/**
 * Minimal top HUD from the reference: stage number, stage name, pause.
 * Kept small so nothing covers the play area.
 */
export function StageHeader({
  number,
  code,
  title,
  top,
  onPause,
  onRecenter,
}: {
  number: number;
  code?: string;
  title: string;
  top: number;
  onPause?: () => void;
  onRecenter?: () => void;
}) {
  const {t}=useMenu();
  return (
    <View style={[styles.wrap, { top: top + 6 }]} pointerEvents="box-none">
      <View>
        <Text style={styles.stage}>{t(code?'missionLabel':'stage')} {code??String(number).padStart(2, '0')}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onRecenter} style={styles.recenter} hitSlop={8} accessibilityLabel={t('recenter')}>
          <Text style={styles.recenterText}>{t('recenter')}</Text>
        </Pressable>
        <Pressable onPress={onPause} style={styles.pause} hitSlop={10} accessibilityLabel={t('paused')}>
          <View style={styles.bar} />
          <View style={styles.bar} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stage: {
    color: '#f1f2f4',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6,
  },
  title: {
    color: '#a3abb8',
    fontSize: 12,
    marginTop: 1,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6,
  },
  pause: {
    width: 32,
    height: 32,
    borderRadius: 7,
    borderWidth: 1.2,
    borderColor: 'rgba(230,233,239,0.55)',
    backgroundColor: 'rgba(8,11,17,0.55)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recenter: { height: 32, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(230,233,239,0.38)', backgroundColor: 'rgba(8,11,17,0.55)' },
  recenterText: { color: '#dce2ea', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  bar: { width: 3.5, height: 12, borderRadius: 1, backgroundColor: '#e6e9ef' },
});
