import { StyleSheet, Text, View } from 'react-native';
import { chapterOneMastery, isChapterOneMission } from '../../game/progress/chapterOneMastery';
import type { ChapterOneBadge } from '../../game/progress/chapterOneMastery';
import type { MissionRecord } from '../../game/progress/campaignProgress';
import { useMenu } from '../menu/MenuContext';
import { chapterOneCopy } from './chapterOneCopy';

const BADGES: ChapterOneBadge[] = ['firstEscape', 'cleanEscape', 'personalBest'];

export function ChapterOneMasteryPanel({ missionId, record, newlyEarned = [] }: {
  missionId: string; record?: MissionRecord; newlyEarned?: ChapterOneBadge[];
}) {
  const { progress } = useMenu();
  const mastery = chapterOneMastery(missionId, record);
  if (!isChapterOneMission(missionId)) return null;
  const copy = chapterOneCopy(progress.language);
  return <View style={styles.panel}>
    <Text style={styles.label}>{copy.badges} · {mastery.earned.length}/3</Text>
    <View style={styles.badges}>{BADGES.map(badge => {
      const earned = mastery.earned.includes(badge);
      return <Text key={badge} style={[styles.badge, earned && styles.earned]}
        accessibilityLabel={`${copy[badge]}: ${earned ? copy.earnedState : copy.unearnedState}`}>
        {earned ? '✓ ' : '◇ '}{copy[badge]}
      </Text>;
    })}</View>
    {newlyEarned.length > 0 && <Text style={styles.newBadge}>{copy.earned} · {newlyEarned.map(badge => copy[badge]).join(' · ')}</Text>}
    <Text style={styles.goal}>{mastery.nextGoal
      ? `${copy.next}: ${copy[`${mastery.nextGoal}Goal`]}` : copy.complete}</Text>
  </View>;
}

const styles = StyleSheet.create({
  panel: { alignSelf: 'stretch', gap: 8, padding: 12, borderRadius: 10,
    backgroundColor: '#0B1C26', borderWidth: 1, borderColor: '#244752' },
  label: { color: '#9DCBD5', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { color: '#9BAEB8', fontSize: 10, paddingHorizontal: 7, paddingVertical: 5,
    borderWidth: 1, borderColor: '#40515C', borderRadius: 7 },
  earned: { color: '#AEF0CD', borderColor: '#49806B', backgroundColor: '#102C27' },
  newBadge: { color: '#AEF0CD', fontSize: 11, fontWeight: '700', lineHeight: 17 },
  goal: { color: '#D2E3EB', fontSize: 12, lineHeight: 18 },
});
