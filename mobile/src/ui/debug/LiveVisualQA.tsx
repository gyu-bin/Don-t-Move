import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type InspectionView = 'Entry' | 'Objective' | 'Exit' | 'Escape' | 'Overview';

/** DEV-only controls over the actual native game renderer. No actor movement. */
export function LiveVisualQA({ mission, selected, top, bottom, onView, onExit, onLockdown, lockdown }: {
  mission: string; selected: InspectionView; top: number; bottom: number;
  onView: (view: InspectionView) => void; onExit: () => void;
  onLockdown: () => void; lockdown: boolean;
}) {
  const [clean, setClean] = useState(false);
  if (!__DEV__) return null;
  return <>
    {!clean && <View style={[styles.panel, { top: top + 8 }]}>
      <Text style={styles.label}>{mission} · LIVE VISUAL QA · SIMULATION PAUSED</Text>
      <View style={styles.row}>{(['Entry', 'Objective', 'Exit', 'Escape', 'Overview'] as const).map(view =>
        <Pressable key={view} accessibilityRole="button" accessibilityState={{ selected: selected === view }} onPress={() => onView(view)} style={[styles.button, selected === view && styles.selected]}><Text style={styles.text}>{view}</Text></Pressable>)}</View>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={onLockdown} style={styles.button}><Text style={styles.text}>{lockdown ? 'QA CLOSURE PREVIEW' : 'QA LOCKDOWN PREVIEW'}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onExit} style={styles.button}><Text style={styles.text}>Exit inspection</Text></Pressable>
      </View>
      <Text style={styles.label}>Camera inspection · door preview uses cloned door state</Text>
    </View>}
    <Pressable accessibilityRole="button" accessibilityLabel={clean ? 'SHOW QA' : 'HIDE QA'} onPress={() => setClean(v => !v)} style={[styles.clean, { bottom: bottom + 4 }, clean && styles.hidden]}><Text style={[styles.label, clean && styles.hiddenText]}>{clean ? 'SHOW QA' : 'HIDE QA'}</Text></Pressable>
  </>;
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', left: 8, right: 8, padding: 8, gap: 5, backgroundColor: '#091520ED', borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 9, borderWidth: 1, borderColor: '#52606B', borderRadius: 5 },
  selected: { borderColor: '#54DDF7' },
  text: { color: '#F4F6F7', fontSize: 10, fontWeight: '700' },
  label: { color: '#ACCDD6', fontSize: 9, textAlign: 'center' },
  clean: { position: 'absolute', alignSelf: 'center', padding: 10, backgroundColor: '#091520CC', borderRadius: 6 },
  hidden: { backgroundColor: 'transparent' },
  hiddenText: { color: 'transparent' },
});
