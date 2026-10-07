import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  aggregateControls,
  aggregateFailures,
  aggregateMissions,
  aggregateMonetization,
  aggregateOverview,
  pct,
  type AdminTab,
} from '../../game/analytics/analyticsAggregate';
import { analyticsRemoteConfigured } from '../../game/analytics/analyticsConfig';
import { fetchRemoteAnalyticsEvents } from '../../game/analytics/analyticsRemote';
import { readAnalyticsEvents } from '../../game/analytics/analyticsStorage';
import type { AnalyticsEvent } from '../../game/analytics/analyticsTypes';
import { MISSION_COLORS } from '../menu/MissionSelect';
import { MenuHeading } from '../menu/MenuScreens';
import { useMenu } from '../menu/MenuContext';

const C = MISSION_COLORS;

const TABS: AdminTab[] = ['overview', 'missions', 'failures', 'controls', 'monetization'];

const COPY = {
  ko: {
    title: '통계',
    all: '전체 유저',
    device: '이 기기만',
    overview: '요약',
    missions: '미션',
    failures: '잡힘',
    controls: '조작',
    monetization: '광고',
    clearRate: '클리어율',
    starts: '시작',
    clears: '클리어',
    caught: '잡힘',
    retries: '다시',
    avg: '평균',
    sessions: '세션',
    events: '기록',
    days7: '7일',
    days30: '30일',
    guard: '경비',
    cctv: 'CCTV',
    other: '그 외',
    topCaught: '많이 잡힌 미션',
    tiltStarts: '기울기로 시작',
    touchStarts: '터치로 시작',
    modeChanges: '조작 변경',
    toTilt: '기울기로 바꿈',
    toTouch: '터치로 바꿈',
    due: '광고 시점',
    shown: '표시',
    skipped: '건너뜀',
    showRate: '표시율',
    removeAds: '광고 제거',
    purchased: '구매',
    restored: '복원',
    restoreEmpty: '복원 없음',
    failed: '실패',
    emptyMissions: '아직 미션 기록이 없습니다',
    emptyCaught: '아직 잡힌 기록이 없습니다',
    fetchFailed: '전체 기록을 못 불러와 이 기기만 보여 줍니다',
    readFailed: '기록을 읽지 못했습니다',
    sec: '초',
  },
  en: {
    title: 'Analytics',
    all: 'All users',
    device: 'This device',
    overview: 'Summary',
    missions: 'Missions',
    failures: 'Caught',
    controls: 'Controls',
    monetization: 'Ads',
    clearRate: 'Clear rate',
    starts: 'Starts',
    clears: 'Clears',
    caught: 'Caught',
    retries: 'Retries',
    avg: 'Average',
    sessions: 'Sessions',
    events: 'Events',
    days7: '7 days',
    days30: '30 days',
    guard: 'Guard',
    cctv: 'CCTV',
    other: 'Other',
    topCaught: 'Missions by caught',
    tiltStarts: 'Started with tilt',
    touchStarts: 'Started with touch',
    modeChanges: 'Mode changes',
    toTilt: 'Switched to tilt',
    toTouch: 'Switched to touch',
    due: 'Ad moments',
    shown: 'Shown',
    skipped: 'Skipped',
    showRate: 'Show rate',
    removeAds: 'Remove ads',
    purchased: 'Purchased',
    restored: 'Restored',
    restoreEmpty: 'Nothing to restore',
    failed: 'Failed',
    emptyMissions: 'No mission events yet',
    emptyCaught: 'No caught events yet',
    fetchFailed: 'All-user fetch failed — showing this device.',
    readFailed: 'Failed to read analytics.',
    sec: 's',
  },
} as const;

type Copy = { [K in keyof (typeof COPY)['en']]: string };
type Source = 'all-users' | 'this-device';

export function AdminAnalyticsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { progress } = useMenu();
  const t: Copy = progress.language === 'ko' ? COPY.ko : COPY.en;
  const [tab, setTab] = useState<AdminTab>('overview');
  const [events, setEvents] = useState<AnalyticsEvent[] | null>(null);
  const [source, setSource] = useState<Source>('this-device');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = events === null;

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      if (analyticsRemoteConfigured()) {
        try {
          const remote = await fetchRemoteAnalyticsEvents();
          setEvents(remote);
          setSource('all-users');
          setError(null);
          return;
        } catch {
          const local = await readAnalyticsEvents();
          setEvents(local);
          setSource('this-device');
          setError('fetch');
          return;
        }
      }
      setEvents(await readAnalyticsEvents());
      setSource('this-device');
      setError(null);
    } catch {
      setError('read');
      setEvents((current) => current ?? []);
      setSource('this-device');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (analyticsRemoteConfigured()) {
          try {
            const remote = await fetchRemoteAnalyticsEvents();
            if (!alive) return;
            setEvents(remote);
            setSource('all-users');
            setError(null);
            return;
          } catch {
            /* fall through to local */
          }
        }
        const local = await readAnalyticsEvents();
        if (!alive) return;
        setEvents(local);
        setSource('this-device');
        setError(analyticsRemoteConfigured() ? 'fetch' : null);
      } catch {
        if (!alive) return;
        setError('read');
        setEvents([]);
        setSource('this-device');
      }
    })();
    return () => { alive = false; };
  }, []);

  const list = events ?? [];
  const overview = aggregateOverview(list);
  const missions = aggregateMissions(list);
  const failures = aggregateFailures(list);
  const controls = aggregateControls(list);
  const monetization = aggregateMonetization(list);
  const errorText = error === 'fetch' ? t.fetchFailed : error === 'read' ? t.readFailed : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <MenuHeading title={t.title} onBack={onBack} />
      <View style={styles.tabs}>
        {TABS.map((id) => {
          const on = tab === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(id)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.tabText, on && styles.tabTextOn]}>
                {t[id]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void load(true); }} tintColor={C.cyan} />}
      >
        <Text maxFontSizeMultiplier={1.2} style={styles.source}>{source === 'all-users' ? t.all : t.device}</Text>
        {loading ? <ActivityIndicator color={C.cyan} style={styles.spinner} /> : null}
        {!!errorText && <Text maxFontSizeMultiplier={1.2} style={styles.error}>{errorText}</Text>}
        {!loading && tab === 'overview' && (
          <View style={styles.stack}>
            <RateHero
              label={t.clearRate}
              rate={pct(overview.clearRate)}
              fill={overview.clearRate}
              bits={[
                [t.starts, overview.missionStarts],
                [t.clears, overview.missionClears],
                [t.caught, overview.missionCaught],
              ]}
            />
            <View style={styles.panel}>
              <Line label={t.sessions} value={String(overview.sessions)} />
              <Line label={t.events} value={String(overview.eventCount)} />
            </View>
            <Ledger
              cols={[t.days7, t.days30]}
              rows={[
                [t.sessions, overview.last7Days.sessions, overview.last30Days.sessions],
                [t.clears, overview.last7Days.clears, overview.last30Days.clears],
                [t.caught, overview.last7Days.caught, overview.last30Days.caught],
              ]}
            />
          </View>
        )}
        {!loading && tab === 'missions' && (
          <View style={styles.stack}>
            {missions.length === 0 ? <Text style={styles.empty}>{t.emptyMissions}</Text> : null}
            {missions.map((row) => (
              <View key={row.missionId} style={[styles.panel, styles.missionPanel]}>
                <View style={styles.missionHead}>
                  <Text style={styles.missionId}>{row.missionId}</Text>
                  <Text style={styles.missionRate}>{pct(row.clearRate)}</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(row.clearRate * 100)}%` }]} /></View>
                <Text style={styles.meta}>
                  {`${row.starts} ${t.starts}   ${row.clears} ${t.clears}   ${row.caught} ${t.caught}   ${row.retries} ${t.retries}`}
                </Text>
                <Text style={styles.meta}>
                  {t.avg} {row.avgClearSeconds == null ? '—' : `${Math.round(row.avgClearSeconds)}${t.sec}`}
                </Text>
              </View>
            ))}
          </View>
        )}
        {!loading && tab === 'failures' && (
          <View style={styles.stack}>
            <View style={styles.trio}>
              <Count label={t.guard} value={failures.bySource.guard} />
              <Count label={t.cctv} value={failures.bySource.cctv} />
              <Count label={t.other} value={failures.bySource.other} />
            </View>
            <Text style={styles.group}>{t.topCaught}</Text>
            {failures.topMissions.length === 0 ? <Text style={styles.empty}>{t.emptyCaught}</Text> : (
              <View style={styles.panel}>
                {failures.topMissions.map((row) => (
                  <Line key={row.missionId} label={row.missionId} value={String(row.caught)} />
                ))}
              </View>
            )}
          </View>
        )}
        {!loading && tab === 'controls' && (
          <View style={styles.panel}>
            <Line label={t.tiltStarts} value={String(controls.tiltStarts)} />
            <Line label={t.touchStarts} value={String(controls.touchStarts)} />
            <Line label={t.modeChanges} value={String(controls.modeChanges)} />
            <Line label={t.toTilt} value={String(controls.toTilt)} />
            <Line label={t.toTouch} value={String(controls.toTouch)} last />
          </View>
        )}
        {!loading && tab === 'monetization' && (
          <View style={styles.stack}>
            <RateHero
              label={t.showRate}
              rate={pct(monetization.showRate)}
              fill={monetization.showRate}
              bits={[
                [t.due, monetization.interstitialDue],
                [t.shown, monetization.interstitialShown],
                [t.skipped, monetization.interstitialSkipped],
              ]}
            />
            <Text style={styles.group}>{t.removeAds}</Text>
            <View style={styles.panel}>
              <Line label={t.purchased} value={String(monetization.removeAdsPurchased)} />
              <Line label={t.restored} value={String(monetization.removeAdsRestored)} />
              <Line label={t.restoreEmpty} value={String(monetization.removeAdsRestoreEmpty)} />
              <Line label={t.failed} value={String(monetization.removeAdsFailed)} last />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RateHero({
  label,
  rate,
  fill,
  bits,
}: {
  label: string;
  rate: string;
  fill: number;
  bits: [string, number][];
}) {
  return (
    <View style={styles.hero}>
      <Text maxFontSizeMultiplier={1.2} style={styles.heroLabel}>{label}</Text>
      <Text maxFontSizeMultiplier={1.15} style={styles.heroValue}>{rate}</Text>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, fill)) * 100)}%` }]} /></View>
      <View style={styles.bits}>
        {bits.map(([name, value]) => (
          <View key={name} style={styles.bit}>
            <Text maxFontSizeMultiplier={1.2} style={styles.bitValue}>{value}</Text>
            <Text maxFontSizeMultiplier={1.2} style={styles.bitLabel}>{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Ledger({ cols, rows }: { cols: [string, string]; rows: [string, number, number][] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.ledgerHead}>
        <View style={styles.ledgerLabel} />
        <Text style={styles.ledgerCol}>{cols[0]}</Text>
        <Text style={styles.ledgerCol}>{cols[1]}</Text>
      </View>
      {rows.map(([label, a, b], index) => (
        <View key={label} style={[styles.ledgerRow, index === rows.length - 1 && styles.last]}>
          <Text style={styles.ledgerLabel}>{label}</Text>
          <Text style={styles.ledgerNum}>{a}</Text>
          <Text style={styles.ledgerNum}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

function Line({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.line, last && styles.last]}>
      <Text maxFontSizeMultiplier={1.2} style={styles.lineLabel}>{label}</Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.lineValue}>{value}</Text>
    </View>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.count}>
      <Text maxFontSizeMultiplier={1.2} style={styles.countValue}>{value}</Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.bitLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#526975',
    borderRadius: 5,
    overflow: 'hidden',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, paddingHorizontal: 2 },
  tabOn: { backgroundColor: '#38C9ED' },
  tabText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  tabTextOn: { color: '#03111B' },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  source: { color: C.muted, fontSize: 12, marginBottom: 18 },
  spinner: { marginTop: 28 },
  error: { color: C.ivory, backgroundColor: '#102331', padding: 12, marginBottom: 16, fontSize: 13, lineHeight: 18 },
  stack: { gap: 18 },
  hero: { gap: 8 },
  heroLabel: { color: C.sub, fontSize: 13 },
  heroValue: { color: C.ivory, fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 48 },
  track: { height: 3, backgroundColor: C.track, marginTop: 4 },
  fill: { height: 3, backgroundColor: C.cyan },
  bits: { flexDirection: 'row', marginTop: 8 },
  bit: { flex: 1, gap: 2 },
  bitValue: { color: C.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bitLabel: { color: C.muted, fontSize: 12 },
  panel: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  last: { borderBottomWidth: 0 },
  lineLabel: { color: C.sub, fontSize: 14, flex: 1 },
  lineValue: { color: C.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ledgerHead: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  ledgerLabel: { flex: 1.4, color: C.sub, fontSize: 14 },
  ledgerCol: { flex: 1, color: C.cyan, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  ledgerNum: { flex: 1, color: C.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'right' },
  missionPanel: { paddingBottom: 12 },
  missionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 12 },
  missionId: { color: C.ivory, fontSize: 16, fontWeight: '700' },
  missionRate: { color: C.cyan, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  meta: { color: C.muted, fontSize: 12, paddingBottom: 4 },
  trio: { flexDirection: 'row', gap: 8 },
  count: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingVertical: 14, paddingHorizontal: 12, gap: 4 },
  countValue: { color: C.ivory, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  group: { color: C.ivory, fontSize: 14, fontWeight: '700' },
  empty: { color: C.muted, fontSize: 14, paddingVertical: 8 },
});
