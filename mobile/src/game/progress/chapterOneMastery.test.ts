import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeMission, freshCampaign, normalizeCampaign } from './campaignProgress';
import { chapterOneMastery, extraDetectionsForMastery, newChapterOneBadges, normalizeChapterOneMastery } from './chapterOneMastery';

test('guard Alert before its delayed whistle disqualifies clean escape', () => {
  const evidence = extraDetectionsForMastery({ alertCount: 1, theftRevision: 0, spottedWhistleRevision: 0, cameraAlertRevision: 0 });
  assert.equal(evidence, 1);
  assert.equal(completeMission(freshCampaign(), 0, 40, 0, evidence).records['01-01'].mastery, undefined);
});

test('mandatory theft alarm alone does not disqualify clean escape', () => {
  const evidence = extraDetectionsForMastery({ alertCount: 1, theftRevision: 1, spottedWhistleRevision: 0, cameraAlertRevision: 0 });
  assert.equal(evidence, 0);
  assert.deepEqual(completeMission(freshCampaign(), 0, 40, 1, evidence).records['01-01'].mastery, { cleanEscape: true });
});

test('post-theft guard sighting is detected by spotted revision even without another alertCount increment', () => {
  assert.equal(extraDetectionsForMastery({ alertCount: 1, theftRevision: 1, spottedWhistleRevision: 1, cameraAlertRevision: 0 }), 1);
});

test('CCTV detection disqualifies clean escape without a guard whistle', () => {
  assert.equal(extraDetectionsForMastery({ alertCount: 2, theftRevision: 1, spottedWhistleRevision: 0, cameraAlertRevision: 1 }), 1);
  // Counters can overlap; this helper does not promise a distinct-episode total.
  assert.equal(extraDetectionsForMastery({ alertCount: 4, theftRevision: 1, spottedWhistleRevision: 1, cameraAlertRevision: 1 }), 3);
});

test('invalid detection counters never fabricate clean-run evidence', () => {
  const base = { alertCount: 0, theftRevision: 0, spottedWhistleRevision: 0, cameraAlertRevision: 0 };
  for (const key of Object.keys(base) as (keyof typeof base)[]) {
    for (const value of [-1, NaN, Infinity, 0.5]) assert.equal(extraDetectionsForMastery({ ...base, [key]: value }), undefined);
  }
  assert.equal(extraDetectionsForMastery({ alertCount: 0, theftRevision: 0, spottedWhistleRevision: 0 }), 0);
  assert.equal(extraDetectionsForMastery({ ...base, alertCount: undefined as unknown as number }), undefined);
  assert.equal(extraDetectionsForMastery({ ...base, cameraAlertRevision: null as unknown as number }), undefined);
});

test('Chapter 1 starts with an escape goal and unlocks first escape from a successful clear', () => {
  const before = freshCampaign();
  assert.deepEqual(chapterOneMastery('01-01', undefined), { earned: [], nextGoal: 'firstEscape' });
  const after = completeMission(before, 0, 40, 1, 1);
  assert.deepEqual(chapterOneMastery('01-01', after.records['01-01']), { earned: ['firstEscape'], nextGoal: 'cleanEscape' });
  assert.deepEqual(newChapterOneBadges('01-01', undefined, after.records['01-01']), ['firstEscape']);
  assert.equal(after.highestUnlocked, 1);
  assert.equal(after.lastMission, '01-02');
  assert.deepEqual(before.records, {});
});

test('clean escape uses explicit extra-detection evidence, excluding mandatory theft whistles', () => {
  const clean = completeMission(freshCampaign(), 0, 40, 2, 0);
  assert.deepEqual(clean.records['01-01'].mastery, { cleanEscape: true });
  assert.deepEqual(chapterOneMastery('01-01', clean.records['01-01']), { earned: ['firstEscape', 'cleanEscape'], nextGoal: 'personalBest' });
  for (const missingOrInvalid of [undefined, 1, 2, -1, NaN, Infinity, 0.5]) {
    const result = completeMission(freshCampaign(), 0, 40, 0, missingOrInvalid);
    assert.equal(result.records['01-01'].mastery, undefined, `evidence ${missingOrInvalid}`);
  }
});

test('personal-best badge needs a comparable prior clear and a strictly faster successful run', () => {
  const first = completeMission(freshCampaign(), 0, 40, 1);
  assert.equal(first.records['01-01'].mastery, undefined);
  for (const seconds of [40, 41, NaN, Infinity, 0, -1]) {
    const unchanged = completeMission(first, 0, seconds, 1);
    assert.equal(unchanged.records['01-01'].mastery, undefined);
  }
  const faster = completeMission(first, 0, 39, 1);
  assert.deepEqual(faster.records['01-01'].mastery, { personalBest: true });
  assert.deepEqual(newChapterOneBadges('01-01', first.records['01-01'], faster.records['01-01']), ['personalBest']);
  assert.equal(faster.records['01-01'].bestTime, 39);
  assert.equal(first.records['01-01'].bestTime, 40);
});

test('earned badges survive slower or detected clears and are not announced twice', () => {
  const first = completeMission(freshCampaign(), 0, 40, 1, 0);
  const faster = completeMission(first, 0, 38, 1, 1);
  const later = completeMission(faster, 0, 50, 3, 4);
  assert.deepEqual(later.records['01-01'].mastery, { cleanEscape: true, personalBest: true });
  assert.deepEqual(chapterOneMastery('01-01', later.records['01-01']), { earned: ['firstEscape', 'cleanEscape', 'personalBest'], nextGoal: null });
  assert.deepEqual(newChapterOneBadges('01-01', faster.records['01-01'], later.records['01-01']), []);
  assert.equal(later.records['01-01'].bestTime, 38);
  assert.equal(later.records['01-01'].alerts, 1);
});

test('old saves retain clear entitlement but no clean or personal-best badge is fabricated', () => {
  const old = normalizeCampaign({ version: 5, highestUnlocked: 1, lastMission: '01-01', records: {
    '01-01': { cleared: true, bestTime: 30, alerts: 0 },
  } });
  assert.deepEqual(chapterOneMastery('01-01', old.records['01-01']), { earned: ['firstEscape'], nextGoal: 'cleanEscape' });
  const faster = completeMission(old, 0, 29, 0);
  assert.deepEqual(faster.records['01-01'].mastery, { personalBest: true });
});

test('legacy benchmark is replaced before a new personal-best comparison can be earned', () => {
  const legacy = normalizeCampaign({ version: 5, highestUnlocked: 1, lastMission: '01-01', records: {
    '01-01': { cleared: true, legacy: true, bestTime: 30, alerts: 0, mastery: { cleanEscape: true, personalBest: true } },
  } });
  assert.equal(legacy.records['01-01'].mastery, undefined);
  const current = completeMission(legacy, 0, 20, 1, 1);
  assert.equal(current.records['01-01'].mastery, undefined);
  assert.equal(current.records['01-01'].legacy, undefined);
  const next = completeMission(current, 0, 19, 1, 0);
  assert.deepEqual(next.records['01-01'].mastery, { cleanEscape: true, personalBest: true });
});

test('JSON normalization keeps valid Chapter 1 badges and strips malformed or out-of-scope badges', () => {
  const bad = { cleanEscape: 1, personalBest: 'true', injected: true };
  for (const value of [bad, null, [], 'bad', true, {}]) assert.equal(normalizeChapterOneMastery(value), undefined);
  const source = { version: 5, highestUnlocked: 6, lastMission: '02-01', records: {
    '01-01': { cleared: true, bestTime: 30, mastery: { cleanEscape: true, personalBest: true, injected: true } },
    '01-02': { cleared: true, mastery: bad },
    '01-03': { cleared: false, mastery: { cleanEscape: true } },
    '02-01': { cleared: true, mastery: { cleanEscape: true, personalBest: true } },
  } };
  const normalized = normalizeCampaign(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(normalized.records['01-01'].mastery, { cleanEscape: true, personalBest: true });
  for (const id of ['01-02', '01-03', '02-01']) assert.equal(normalized.records[id].mastery, undefined);
  assert.deepEqual(normalizeCampaign(JSON.parse(JSON.stringify(normalized))), normalized);
});

test('all ten Chapter 1 missions earn badges while later chapters preserve their old record shape', () => {
  for (let index = 0; index < 10; index++) {
    const id = `01-${String(index+1).padStart(2,'0')}`;
    const result = completeMission(freshCampaign(), index, 40, 1, 0);
    assert.deepEqual(chapterOneMastery(id, result.records[id]).earned, ['firstEscape', 'cleanEscape']);
  }
  const later = completeMission(freshCampaign(), 10, 40, 1, 0);
  assert.deepEqual(later.records['02-01'], { cleared: true, bestTime: 40, alerts: 1 });
  assert.deepEqual(chapterOneMastery('02-01', later.records['02-01']), { earned: [], nextGoal: null });
  assert.deepEqual(newChapterOneBadges('02-01', undefined, later.records['02-01']), []);
  for (const id of ['01-00', '01-11', '01-1', 'bad']) assert.deepEqual(chapterOneMastery(id, undefined), { earned: [], nextGoal: null });
});
