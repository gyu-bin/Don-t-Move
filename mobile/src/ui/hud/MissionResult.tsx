import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RESULT_LABEL } from '../resultNavigation';
import type { ResultAction } from '../resultNavigation';
import { useMenu } from '../menu/MenuContext';
import type { MissionRecord } from '../../game/progress/campaignProgress';
import type { ChapterOneBadge } from '../../game/progress/chapterOneMastery';
import { ChapterOneMasteryPanel } from './ChapterOneMasteryPanel';
import { MissionDialog } from './MissionDialog';

/** Mission-clear screen: the record, then where to go. One main button; the rest are secondary. */
export function MissionResult({ title, name, seconds, alerts, best, nextName, primary, secondary, onAction, missionId, record, newlyEarned }: {
  title: string;
  name: string;
  seconds: number;
  alerts: number;
  best: number;
  /** Name of the mission the main button starts; absent when it does not start one. */
  nextName?: string;
  primary: ResultAction;
  secondary: ResultAction[];
  onAction: (action: ResultAction) => void;
  missionId?: string;
  record?: MissionRecord;
  newlyEarned?: ChapterOneBadge[];
}) {
  const { t } = useMenu();
  const wide = secondary.filter(action => action === 'chapters');
  const pair = secondary.filter(action => action !== 'chapters');
  return <MissionDialog>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.body}>{name}</Text>
    <Text style={styles.body}>{t('time')} {seconds.toFixed(1)}s</Text>
    <Text style={styles.body}>{t('alerts')} {alerts}</Text>
    <Text style={styles.body}>{t('best')} {best.toFixed(1)}s</Text>
    {missionId && <ChapterOneMasteryPanel missionId={missionId} record={record} newlyEarned={newlyEarned}/>}
    {!!nextName && <Text style={styles.nextName}>{nextName}</Text>}
    <Pressable accessibilityRole="button" onPress={() => onAction(primary)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
      <Text style={styles.primaryText}>{t(RESULT_LABEL[primary])}</Text>
    </Pressable>
    {wide.map(action => <Pressable key={action} accessibilityRole="button" onPress={() => onAction(action)} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>{t(RESULT_LABEL[action])}</Text>
    </Pressable>)}
    <View style={styles.pair}>{pair.map(action => <Pressable key={action} accessibilityRole="button" onPress={() => onAction(action)} style={({ pressed }) => [styles.button, styles.half, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>{t(RESULT_LABEL[action])}</Text>
    </Pressable>)}</View>
  </MissionDialog>;
}

const styles = StyleSheet.create({
  title: { color: '#83eabb', fontSize: 23, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  body: { color: '#aab2bf', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  nextName: { color: '#87C8D7', fontSize: 11, fontWeight: '600' },
  primary: { minWidth: 190, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#3ED5FA', backgroundColor: '#03131B' },
  primaryText: { color: '#54DDF7', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  button: { minWidth: 190, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 16, backgroundColor: '#04121DDD', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  half: { minWidth: 0, flex: 1 },
  pair: { flexDirection: 'row', gap: 10, width: 190 },
  buttonText: { color: '#e6e9ef', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  pressed: { backgroundColor: '#12313E' },
});
