import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  aggregateControls,
  aggregateFailures,
  aggregateMissions,
  aggregateMonetization,
  aggregateOverview,
  pct,
} from '../analyticsAggregate';
import { createSecretTapDetector, SECRET_TAP_COUNT } from '../secretTap';
import { normalizeEvents } from '../analyticsStorage';
import { mapRemoteRows } from '../analyticsRemote';
import type { AnalyticsEvent } from '../analyticsTypes';

function ev(name: AnalyticsEvent['name'], props: AnalyticsEvent['props'] = {}, at = 1_700_000_000_000): AnalyticsEvent {
  return { id: `${name}-${Math.random()}`, at, name, props };
}

test('normalizeEvents drops malformed rows and keeps valid ones', () => {
  const events = normalizeEvents([
    null,
    { name: 'mission_clear', at: 10, props: { missionId: '01-01' } },
    { name: 1, at: 10 },
    { foo: true },
  ]);
  assert.equal(events.length, 1);
  assert.equal(events[0]!.name, 'mission_clear');
});

test('aggregates overview clear rate and mission rows', () => {
  const events = [
    ev('session_start'),
    ev('mission_start', { missionId: '01-01', controlMode: 'tilt' }),
    ev('mission_caught', { missionId: '01-01', catchSource: 'guard' }),
    ev('mission_retry', { missionId: '01-01' }),
    ev('mission_start', { missionId: '01-01', controlMode: 'tilt' }),
    ev('mission_clear', { missionId: '01-01', seconds: 40 }),
    ev('mission_start', { missionId: '01-02', controlMode: 'touch' }),
    ev('mission_clear', { missionId: '01-02', seconds: 60 }),
  ];
  const overview = aggregateOverview(events);
  assert.equal(overview.sessions, 1);
  assert.equal(overview.missionStarts, 3);
  assert.equal(overview.missionClears, 2);
  assert.equal(overview.clearRate, 2 / 3);
  const missions = aggregateMissions(events);
  assert.equal(missions.find((m) => m.missionId === '01-01')?.caught, 1);
  assert.equal(missions.find((m) => m.missionId === '01-01')?.avgClearSeconds, 40);
  assert.equal(pct(0.5), '50%');
});

test('failures and controls and monetization aggregates', () => {
  const events = [
    ev('mission_caught', { missionId: '02-01', catchSource: 'guard' }),
    ev('mission_caught', { missionId: '02-01', catchSource: 'cctv' }),
    ev('mission_caught', { missionId: '03-01', catchSource: 'other' }),
    ev('mission_start', { controlMode: 'tilt' }),
    ev('control_mode_change', { from: 'tilt', to: 'touch' }),
    ev('interstitial_due'),
    ev('interstitial_shown'),
    ev('interstitial_skipped', { reason: 'timeout' }),
    ev('remove_ads_purchased'),
  ];
  const failures = aggregateFailures(events);
  assert.deepEqual(failures.bySource, { guard: 1, cctv: 1, other: 1 });
  assert.equal(failures.topMissions[0]?.missionId, '02-01');
  const controls = aggregateControls(events);
  assert.equal(controls.tiltStarts, 1);
  assert.equal(controls.toTouch, 1);
  const ads = aggregateMonetization(events);
  assert.equal(ads.interstitialShown, 1);
  assert.equal(ads.showRate, 1);
  assert.equal(ads.removeAdsPurchased, 1);
});

test('mapRemoteRows converts Supabase rows into local analytics events', () => {
  const events = mapRemoteRows([
    {
      id: '11111111-1111-4111-8111-111111111111',
      created_at: '2026-10-07T00:00:00.000Z',
      install_id: '22222222-2222-4222-8222-222222222222',
      platform: 'ios',
      app_version: '1.0.0',
      name: 'mission_clear',
      props: { missionId: '01-01', seconds: 33 },
    },
  ]);
  assert.equal(events.length, 1);
  assert.equal(events[0]!.name, 'mission_clear');
  assert.equal(events[0]!.props.missionId, '01-01');
  assert.equal(events[0]!.props.platform, 'ios');
  assert.equal(events[0]!.at, Date.parse('2026-10-07T00:00:00.000Z'));
});

test('secret tap unlocks after five taps inside the window', () => {
  let unlocked = 0;
  const realNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const tap = createSecretTapDetector(() => { unlocked += 1; }, SECRET_TAP_COUNT, 2000);
    for (let i = 0; i < 4; i++) { now += 100; tap(); }
    assert.equal(unlocked, 0);
    now += 100;
    tap();
    assert.equal(unlocked, 1);
    now += 3000;
    for (let i = 0; i < 5; i++) { now += 50; tap(); }
    assert.equal(unlocked, 2);
  } finally {
    Date.now = realNow;
  }
});
