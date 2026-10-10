/// <reference types="node" />
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ANALYTICS_FLUSH_DELAY_MS, appendAnalyticsEvent, flushAnalyticsEvents, readAnalyticsEvents, replaceAnalyticsEvents } from '../analyticsStorage';
import { ANALYTICS_STORAGE_KEY, type AnalyticsEventName } from '../analyticsTypes';

test('a burst of events (mission clear + transition) is one storage write, not one per event', async () => {
  const saved = new Map<string, string>(), get = AsyncStorage.getItem, set = AsyncStorage.setItem;
  let writes = 0;
  AsyncStorage.getItem = async (key) => saved.get(key) ?? null;
  AsyncStorage.setItem = async (key, value) => { writes++; saved.set(key, value); };
  try {
    await replaceAnalyticsEvents([]); writes = 0;
    const burst: AnalyticsEventName[] = ['mission_clear', 'next_stage_pressed', 'interstitial_due', 'interstitial_skipped',
      'mission_transition_begin', 'mission_old_unmounted', 'mission_new_ready', 'mission_transition_complete', 'mission_start'];
    for (const name of burst) appendAnalyticsEvent(name, { from: '01-01', to: '01-02' });
    for (let i = 0; i < 20; i++) await Promise.resolve();
    assert.equal(writes, 0, 'recording an event does not write or encode the log');
    assert.deepEqual((await readAnalyticsEvents()).map((event) => event.name), burst, 'events are kept in order in memory');
    await flushAnalyticsEvents();
    assert.equal(writes, 1);
    assert.deepEqual((JSON.parse(saved.get(ANALYTICS_STORAGE_KEY)!) as { name: string }[]).map((event) => event.name), burst);
    assert(ANALYTICS_FLUSH_DELAY_MS >= 1000, 'the write lands after the transition, not inside it');
    // A failing store never reaches the caller.
    AsyncStorage.setItem = async () => { throw new Error('disk full'); };
    appendAnalyticsEvent('mission_start');
    for (let i = 0; i < 20; i++) await Promise.resolve();
    await assert.doesNotReject(flushAnalyticsEvents());
  } finally { AsyncStorage.getItem = get; AsyncStorage.setItem = set; }
});
