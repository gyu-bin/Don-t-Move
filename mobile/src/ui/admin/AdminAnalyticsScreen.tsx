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
import { fetchRemoteAnalyticsEvents } from '../../game/analytics/analyticsRemote';
import { readAnalyticsEvents } from '../../game/analytics/analyticsStorage';
import { analyticsRemoteConfigured } from '../../game/analytics/analyticsConfig';
import type { AnalyticsEvent } from '../../game/analytics/analyticsTypes';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'missions', label: 'Missions' },
  { id: 'failures', label: 'Failures' },
  { id: 'controls', label: 'Controls' },
  { id: 'monetization', label: 'Ads' },
];

type Source = 'all-users' | 'this-device';

export function AdminAnalyticsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
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
          setError('All-user fetch failed — showing this device.');
          return;
        }
      }
      setEvents(await readAnalyticsEvents());
      setSource('this-device');
      setError(null);
    } catch {
      setError('Failed to read analytics.');
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
        setError(analyticsRemoteConfigured() ? 'All-user fetch failed — showing this device.' : null);
      } catch {
        if (!alive) return;
        setError('Failed to read analytics.');
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.note}>{source === 'all-users' ? 'All users (Supabase)' : 'This device only'}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.id }}
            onPress={() => setTab(item.id)}
            style={[styles.tab, tab === item.id && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === item.id && styles.tabTextOn]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void load(true); }} tintColor="#3EC5FF" />}
      >
        {loading ? <ActivityIndicator color="#3EC5FF" style={{ marginTop: 40 }} /> : null}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!loading && tab === 'overview' && (
          <View style={styles.block}>
            <Row label="Events" value={String(overview.eventCount)} />
            <Row label="Sessions" value={String(overview.sessions)} />
            <Row label="Mission starts" value={String(overview.missionStarts)} />
            <Row label="Clears" value={String(overview.missionClears)} />
            <Row label="Caught" value={String(overview.missionCaught)} />
            <Row label="Clear rate" value={pct(overview.clearRate)} />
            <Text style={styles.section}>Last 7 days</Text>
            <Row label="Sessions" value={String(overview.last7Days.sessions)} />
            <Row label="Clears" value={String(overview.last7Days.clears)} />
            <Row label="Caught" value={String(overview.last7Days.caught)} />
            <Text style={styles.section}>Last 30 days</Text>
            <Row label="Sessions" value={String(overview.last30Days.sessions)} />
            <Row label="Clears" value={String(overview.last30Days.clears)} />
            <Row label="Caught" value={String(overview.last30Days.caught)} />
          </View>
        )}
        {!loading && tab === 'missions' && (
          <View style={styles.block}>
            {missions.length === 0 ? <Text style={styles.empty}>No mission events yet.</Text> : null}
            {missions.map((row) => (
              <View key={row.missionId} style={styles.card}>
                <Text style={styles.cardTitle}>{row.missionId}</Text>
                <Row label="Starts" value={String(row.starts)} />
                <Row label="Clears" value={String(row.clears)} />
                <Row label="Caught" value={String(row.caught)} />
                <Row label="Retries" value={String(row.retries)} />
                <Row label="Clear rate" value={pct(row.clearRate)} />
                <Row
                  label="Avg clear time"
                  value={row.avgClearSeconds == null ? '—' : `${Math.round(row.avgClearSeconds)}s`}
                />
              </View>
            ))}
          </View>
        )}
        {!loading && tab === 'failures' && (
          <View style={styles.block}>
            <Row label="Guard" value={String(failures.bySource.guard)} />
            <Row label="CCTV" value={String(failures.bySource.cctv)} />
            <Row label="Other" value={String(failures.bySource.other)} />
            <Text style={styles.section}>Top missions by caught</Text>
            {failures.topMissions.length === 0 ? <Text style={styles.empty}>No caught events yet.</Text> : null}
            {failures.topMissions.map((row) => (
              <Row key={row.missionId} label={row.missionId} value={String(row.caught)} />
            ))}
          </View>
        )}
        {!loading && tab === 'controls' && (
          <View style={styles.block}>
            <Row label="Tilt mission starts" value={String(controls.tiltStarts)} />
            <Row label="Touch mission starts" value={String(controls.touchStarts)} />
            <Row label="Mode changes" value={String(controls.modeChanges)} />
            <Row label="Changed to Tilt" value={String(controls.toTilt)} />
            <Row label="Changed to Touch" value={String(controls.toTouch)} />
          </View>
        )}
        {!loading && tab === 'monetization' && (
          <View style={styles.block}>
            <Row label="Interstitial due" value={String(monetization.interstitialDue)} />
            <Row label="Interstitial shown" value={String(monetization.interstitialShown)} />
            <Row label="Interstitial skipped" value={String(monetization.interstitialSkipped)} />
            <Row label="Show rate" value={pct(monetization.showRate)} />
            <Text style={styles.section}>Remove Ads</Text>
            <Row label="Purchased" value={String(monetization.removeAdsPurchased)} />
            <Row label="Restored" value={String(monetization.removeAdsRestored)} />
            <Row label="Restore empty" value={String(monetization.removeAdsRestoreEmpty)} />
            <Row label="Failed" value={String(monetization.removeAdsFailed)} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030D15' },
  header: { height: 72, justifyContent: 'center', alignItems: 'center' },
  back: { position: 'absolute', left: 12, padding: 12, minWidth: 44, minHeight: 44 },
  backText: { color: '#D7E6EB', fontSize: 30, lineHeight: 30 },
  title: { color: '#F7F5EC', fontSize: 17, letterSpacing: 2, fontWeight: '700' },
  note: { color: '#7F95A1', fontSize: 10, letterSpacing: 1, marginTop: 4 },
  tabs: { paddingHorizontal: 12, gap: 8, paddingBottom: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#3A5260' },
  tabOn: { backgroundColor: '#12313E', borderColor: '#3EC5FF' },
  tabText: { color: '#9FB6C0', fontSize: 12, fontWeight: '600' },
  tabTextOn: { color: '#FFF4D6' },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  block: { gap: 10 },
  section: { color: '#FFF4D6', fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#24404E' },
  label: { color: '#BFD8E1', fontSize: 13, flex: 1 },
  value: { color: '#EFF5F6', fontSize: 13, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#24404E', borderRadius: 12, padding: 12, marginBottom: 10, gap: 4 },
  cardTitle: { color: '#3EC5FF', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  empty: { color: '#7F95A1', fontSize: 13, marginTop: 12 },
  error: { color: '#ff655c', marginTop: 16 },
});
